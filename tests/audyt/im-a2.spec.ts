// Area IM – run im-a2 (rok, fresh copy): IM.43 (decisions across screens and accounts, exactly), IM.10 again (an inflow
// in a bulk decision), IM.13 (similar names: S.csv, settings), IM.48 (deleting a rule and a keyword), IM.6 (a drop while
// an import is written).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { importDone } from '../e2e/app'
import { answerDialogs, start, useState } from './lab'
import { Obs, PLIKI, dropBytes, expandAll, openFile, readFi, readable, statuses, step, theme } from './im-pomoc'

/** Every theme and group of the categorization with its decision (the closed sections opened first). */
async function decisions(page: Page): Promise<string[]> {
  for (const st of ['todo', 'check', 'done']) {
    const sec = page.getByTestId(`import-section-${st}`)
    if (!(await sec.count())) continue
    const btn = sec.locator('button').first()
    const label = await btn.innerText()
    // a closed section shows no themes
    if (!(await sec.locator('[data-testid="import-theme"]').count())) {
      await btn.click()
      await page.waitForTimeout(200)
      o2.log(`otwarto sekcję ${st}`, label)
    }
  }
  await expandAll(page)
  return page.locator('[data-testid="import-theme"], [data-testid="import-group"]').evaluateAll((els) =>
    els.map((e) => {
      const kind = e.getAttribute('data-testid') === 'import-theme' ? 'T' : '  G'
      const sel = [...e.querySelectorAll(':scope > div select, :scope > div > div > select')].slice(0, 3).map((s) => (s as HTMLSelectElement).options[(s as HTMLSelectElement).selectedIndex]?.text)
      const badge = [...e.querySelectorAll(':scope > div:nth-child(2) span')].map((s) => (s as HTMLElement).innerText).filter(Boolean).slice(0, 2)
      const head = ((e.querySelector(':scope > div') as HTMLElement)?.innerText ?? '').replace(/\s+/g, ' ')
      return `${kind} ${e.getAttribute('data-label')} ${e.getAttribute('data-status') ?? ''} | ${head} | ${sel.join(' / ')} | ${badge.join(' / ')}`
    })
  )
}
let o2: Obs

const diff = (a: string[], b: string[]) => ({ removed: a.filter((x) => !b.includes(x)), added: b.filter((x) => !a.includes(x)) })

test('im-a2: sesja importu, decyzja dla zaznaczonych, podobne nazwy, usuwanie reguł, upuszczenie w trakcie zapisu', async () => {
  const files = Object.fromEntries(['L1.csv', 'L2.csv'].map((f) => [f, join(PLIKI, f)]))
  const o = (o2 = new Obs('im-a2'))
  const { dataDir, ictjDir } = useState('rok', 'im-a2')
  const run = await start('im-a2', { dataDir, ictjDir })
  const { app, page, userData } = run
  const search = page.getByTestId('import-search')
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })

    // ---------------- IM.43
    await step(o, page, 'IM.43', async () => {
      await openFile(app, page, files['L1.csv']!)
      await theme(page, 'Zakupy bez rozpoznania').getByTestId('import-theme-category').selectOption({ label: 'Prezenty i inne · inne' })
      await page.waitForTimeout(300)
      await expandAll(page)
      await page.locator('[data-testid="import-group"][data-label="PAYU SPÓŁKA AKCYJNA"]').getByTestId('import-group-category').selectOption({ label: 'Prezenty i inne · prezenty' })
      await page.waitForTimeout(300)
      const s0 = await decisions(page)
      o.log('IM.43 decyzje (stan 0)', s0)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(1500)
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1500)
      const s1 = await decisions(page)
      o.log('IM.43 po Operacjach i z powrotem – różnice', diff(s0, s1))
      await page.getByTestId('import-account').selectOption({ label: 'Portfel XTB' })
      await page.waitForTimeout(1500)
      const sP = await decisions(page)
      o.log('IM.43 na Portfelu XTB – różnice', diff(s0, sP))
      await page.getByTestId('import-account').selectOption({ label: 'mBank' })
      await page.waitForTimeout(1500)
      const s2 = await decisions(page)
      o.log('IM.43 po Portfel → mBank – różnice', diff(s0, s2))
      await o.shot(page, 'IM.43-po-zmianie-konta')
      await page.getByTestId('import-close').click()
      await page.waitForTimeout(500)
      o.log('IM.43 Zamknij – toast', await statuses(page))
      await page.getByRole('button', { name: 'Cofnij', exact: true }).first().click()
      await page.waitForTimeout(1200)
      const s3 = await decisions(page)
      o.log('IM.43 po Cofnij zamknięcia – różnice wobec stanu przed zamknięciem', diff(s2, s3))
      await answerDialogs(app, { paths: [files['L2.csv']!] })
      await page.getByTestId('import-pick').click()
      await page.waitForTimeout(1500)
      o.log('IM.43 L2 – toast', await statuses(page))
      await page.getByRole('button', { name: 'Cofnij', exact: true }).first().click()
      await page.waitForTimeout(1200)
      o.log('IM.43 po Cofnij L2 – plik', await page.getByTestId('import-file').innerText().catch(() => '-'))
      const s4 = await decisions(page)
      o.log('IM.43 po Cofnij L2 – różnice', diff(s2, s4))
    })

    // ---------------- IM.10 again: an inflow ticked with expenses, „Wydatek / zwrot towaru – kategoria”
    await step(o, page, 'IM.10b', async () => {
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, files['L1.csv']!)
      await search.fill('orlen')
      await page.waitForTimeout(400)
      await page.getByTestId('import-select-visible').click()
      await search.fill('kolega')
      await page.waitForTimeout(400)
      await page.getByTestId('import-select-visible').click()
      o.log('IM.10b opcje decyzji dla zaznaczonych', await page.getByTestId('import-bulk-kind').evaluate((s: HTMLSelectElement) => [...s.options].map((x) => x.text)))
      o.log('IM.10b grupa TOMASZ KOLEGA przed', await readable(page, '[data-testid="import-groups"]'))
      await page.getByTestId('import-bulk-kind').selectOption({ index: 0 })
      await page.getByTestId('import-bulk-category').selectOption({ label: 'Auto · paliwo' })
      o.log('IM.10b pasek', await readable(page, '[data-testid="import-bulk"]'))
      await page.getByTestId('import-bulk-apply').click()
      await page.waitForTimeout(600)
      o.log('IM.10b toast', await statuses(page))
      o.log('IM.10b grupa TOMASZ KOLEGA po', await readable(page, '[data-testid="import-groups"]'))
      await o.shot(page, 'IM.10-wplyw-po-Ustaw')
      await page.getByTestId('import-bulk-clear').click()
      // a plain expense option: „Wydatek – kategoria”? try every expense-like option
      await search.fill('')
    })

    // ---------------- IM.13 similar names (S.csv)
    await step(o, page, 'IM.13', async () => {
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'S.csv'))
      o.log('IM.13 panel', await readable(page, '[data-testid="similar-names"]').catch(() => '(brak panelu)'))
      await o.shot(page, 'IM.13-S')
      const pairs = page.getByTestId('similar-pair')
      const n = await pairs.count()
      o.log('IM.13 par', n)
      if (n >= 2) {
        const second = await pairs.nth(1).innerText()
        await pairs.nth(1).getByTestId('similar-dismiss').click()
        await page.waitForTimeout(800)
        o.log('IM.13 „To nie to samo” – toast', await statuses(page))
        o.log('IM.13 panel po „To nie to samo”', await readable(page, '[data-testid="similar-names"]').catch(() => '(brak panelu)'))
        o.log('IM.13 odrzucona para', second.replace(/\s+/g, ' '))
        await pairs.first().getByTestId('similar-merge').click()
        await page.waitForTimeout(800)
        o.log('IM.13 „Połącz” – toast', await statuses(page))
      }
      // reopen the file: the dismissed pair must not come back
      await page.getByTestId('import-close').click()
      await openFile(app, page, join(PLIKI, 'S.csv'))
      o.log('IM.13 panel po ponownym otwarciu', await readable(page, '[data-testid="similar-names"]').catch(() => '(brak panelu)'))
      const fi = readFi(dataDir)
      o.log('IM.13 fi.json aliases / notSimilar', { aliases: fi.settings.import.aliases, notSimilar: fi.settings.import.notSimilar })
      await page.getByTestId('import-close').click()
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1500)
      o.log('IM.13 Ustawienia – Połączone nazwy', await readable(page, '[data-testid="aliases"]').catch(() => '(brak)'))
      const un = page.getByTestId('alias-unmerge')
      if (await un.count()) {
        await un.first().click()
        await page.waitForTimeout(800)
        o.log('IM.13 rozłącz – toast', await statuses(page))
        o.log('IM.13 po rozłącz', await readable(page, '[data-testid="aliases"]').catch(() => '(brak)'))
        const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
        if (await undo.count()) {
          await undo.first().click()
          await page.waitForTimeout(800)
          o.log('IM.13 po Cofnij rozłączenia', await readable(page, '[data-testid="aliases"]').catch(() => '(brak)'))
        }
      }
      o.log('IM.13 Ustawienia – przyciski', { removeInactive: await page.getByTestId('aliases-remove-inactive').count(), unmergeAll: await page.getByTestId('aliases-unmerge-all').count(), similarUndismiss: await page.getByTestId('similar-undismiss').count() })
      o.log('IM.13 Ustawienia – podobne „to nie to samo”', await page.getByTestId('similar-undismiss').locator('xpath=..').innerText().catch(() => '(brak)'))
      await o.shot(page, 'IM.13-ustawienia')
    })

    // ---------------- IM.48 deleting a rule and a keyword
    await step(o, page, 'IM.48', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1500)
      const rules = page.getByTestId('import-rule')
      const before = await rules.count()
      const natura = rules.filter({ hasText: /natura/i }).first()
      o.log('IM.48 reguła przed', await natura.innerText().catch(() => '(brak)'))
      await natura.getByTestId('import-rule-delete').click()
      await page.waitForTimeout(800)
      o.log('IM.48 po „usuń” – okno / komunikaty', { dialogs: await page.getByRole('dialog').allInnerTexts(), statuses: await statuses(page), rules: [before, await rules.count()] })
      await o.shot(page, 'IM.48-regula')
      o.log('IM.48 reguła w fi.json', readFi(dataDir).settings.import.rules.some((r: { match: string }) => r.match === 'drogerianatura'))
      await openFile(app, page, files['L1.csv']!)
      await search.fill('natura')
      await page.waitForTimeout(500)
      await expandAll(page)
      o.log('IM.48 L1 – DROGERIA NATURA po usunięciu reguły', await readable(page, '[data-testid="import-groups"]'))
      await search.fill('')
      // a keyword
      await page.getByTestId('keyword-input').fill('szewc')
      await page.getByTestId('keyword-category').selectOption({ label: 'Osobiste · ubrania' })
      await page.getByTestId('keyword-add').click()
      await page.waitForTimeout(800)
      const kw = page.getByTestId('keyword-rule')
      const k0 = await kw.count()
      await kw.first().getByTestId('keyword-rule-delete').click()
      await page.waitForTimeout(800)
      o.log('IM.48 słowo – po „usuń”', { dialogs: await page.getByRole('dialog').allInnerTexts(), statuses: await statuses(page), keywords: [k0, await kw.count()] })
      await o.shot(page, 'IM.48-slowo')
    })

    // ---------------- IM.6 a file dropped while the import is written
    await step(o, page, 'IM.6', async () => {
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, files['L1.csv']!)
      const l1 = readFileSync(files['L1.csv']!)
      await page.getByTestId('import-run').click()
      await dropBytes(page, 'L2.csv', readFileSync(files['L2.csv']!))
      const said: string[] = []
      for (let i = 0; i < 10; i++) {
        said.push(...(await statuses(page)))
        await page.waitForTimeout(150)
      }
      o.log('IM.6 upuszczenie w trakcie zapisu – komunikaty', [...new Set(said)])
      o.log('IM.6 przycisk w trakcie', await page.getByTestId('import-run').innerText().catch(() => '-'))
      await importDone(page, userData)
      o.log('IM.6 wynik', await readable(page, '[data-testid="import-done"]'))
      void l1
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})
