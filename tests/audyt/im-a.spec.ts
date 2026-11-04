// Area IM – run im-a: the Import screen without a file and the preview of L1 on „rok” (nothing imported):
// IM.1, IM.2, IM.4 (preview), IM.5, IM.6, IM.7, IM.10, IM.11, IM.12, IM.13, IM.24, IM.43.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { answerDialogs, reading, start, useState } from './lab'
import { Obs, PLIKI, catText, counters, dropBytes, expandAll, group, openFile, readFi, readable, statuses, step, theme, writeBig, writeFiles } from './im-pomoc'

function snapshot(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      const s = statSync(p)
      if (s.isDirectory()) walk(p)
      else out.push(`${p.slice(dir.length)}|${s.size}|${s.mtimeMs}`)
    }
  }
  walk(dir)
  return out.sort()
}

test('im-a: Import bez pliku i podgląd L1', async () => {
  const files = writeFiles()
  const big = writeBig()
  const o = new Obs('im-a')
  const { dataDir, ictjDir } = useState('rok', 'im-a')
  const run = await start('im-a', { dataDir, ictjDir })
  const { app, page } = run
  const search = page.getByTestId('import-search')
  const toastNow = async (label: string) => o.log(label, await statuses(page))
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.keyboard.press('Control+3')
    await expect(page.getByTestId('page-import')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(2000)

    // ---------------- IM.1, IM.2
    await step(o, page, 'IM.1', async () => {
      o.log('IM.1 ekran', await readable(page, '[data-testid="page-import"]'))
      await o.shot(page, 'IM.1')
    })
    const before = snapshot(dataDir)
    await step(o, page, 'IM.2', async () => {
      await openFile(app, page, files['L1.csv']!)
      o.log('IM.2 plik', await readable(page, '[data-testid="import-file"]'))
      o.log('IM.2 podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.2 liczniki', await counters(page))
      reading('im', 'IM.2', 'rok + L1 (podgląd)', await counters(page))
      await o.shot(page, 'IM.2')
      await page.waitForTimeout(3000)
      const after = snapshot(dataDir)
      o.log('IM.2 folder bez zmian przed Importuj', { same: JSON.stringify(before) === JSON.stringify(after), diff: after.filter((x) => !before.includes(x)).slice(0, 20) })
    })

    // ---------------- IM.7 themes, groups, sections
    let l1Cat = ''
    await step(o, page, 'IM.7', async () => {
      o.log('IM.7 podsumowanie', await readable(page, '[data-testid="import-themes-summary"]'))
      for (const st of ['todo', 'check', 'done']) o.log(`IM.7 sekcja ${st} widoczna`, await page.getByTestId(`import-section-${st}`).count())
      o.log('IM.7 tematy (status)', await page.locator('[data-testid="import-theme"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-status')} | ${e.getAttribute('data-label')}`)))
      await page.getByTestId('import-section-done').locator('button').first().click().catch(() => undefined)
      await expandAll(page)
      l1Cat = await catText(page)
      o.log('IM.7 kategoryzacja (rozwinięta)', l1Cat)
      o.log('IM.7 grupy', await page.locator('[data-testid="import-group"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-label')} | ${e.getAttribute('data-group')}`)))
      for (const q of ['biedronka', 'allegro', 'mokka', 'orlen']) {
        await search.fill(q)
        await page.waitForTimeout(500)
        o.log(`IM.7 szukaj ${q}`, await page.locator('[data-testid="import-group"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-label')} :: ${(e as HTMLElement).innerText.split('\n')[0]}`)))
      }
      await search.fill('')
      await o.shot(page, 'IM.7')
    })

    // ---------------- IM.4 encodings (preview only)
    await step(o, page, 'IM.4', async () => {
      const base = { counters: await counters(page), file: await readable(page, '[data-testid="import-file"]') }
      const names = await page.locator('[data-testid="import-group"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-label')).sort())
      o.log('IM.4 L1 (cp1250)', { ...base, names: names.join(' | ') })
      for (const f of ['L1-utf8.csv', 'L1-utf8-bez-bom.csv', 'L1-utf16.csv']) {
        await page.getByTestId('import-close').click()
        await page.waitForTimeout(500)
        await openFile(app, page, files[f]!)
        await expandAll(page)
        const n2 = await page.locator('[data-testid="import-group"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-label')).sort())
        const c2 = await counters(page)
        const cat2 = await catText(page)
        o.log(`IM.4 ${f}`, { counters: c2, file: await readable(page, '[data-testid="import-file"]'), sameNames: JSON.stringify(n2) === JSON.stringify(names), sameCounters: JSON.stringify(c2) === JSON.stringify(base.counters), sameCategorization: cat2 === l1Cat, odd: n2.filter((x) => x && /[�ÄĹ]/.test(x)) })
        await o.shot(page, `IM.4-${f}`)
      }
      await page.getByTestId('import-close').click()
      await openFile(app, page, files['L1.csv']!)
    })

    // ---------------- IM.5 files FI cannot read (decision kept)
    await step(o, page, 'IM.5', async () => {
      // a decision in one theme: „Zakupy bez rozpoznania” → Prezenty i inne · inne
      const t = theme(page, 'Zakupy bez rozpoznania')
      await t.getByTestId('import-theme-category').selectOption({ label: 'Prezenty i inne · inne' })
      o.log('IM.5 decyzja przed', await readable(page, '[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]'))
      for (const f of ['X.csv', 'Z.csv', 'U.csv', 'E.csv']) {
        await answerDialogs(app, { paths: [join(PLIKI, f)] })
        await page.getByTestId('import-pick').click()
        await page.waitForTimeout(2500)
        o.log(`IM.5 ${f} panel pliku`, await readable(page, '[data-testid="import-file-panel"]'))
        o.log(`IM.5 ${f} komunikaty`, await statuses(page))
        o.log(`IM.5 ${f} nadal L1?`, await page.getByTestId('import-file').innerText().catch(() => '(brak import-file)'))
        await o.shot(page, `IM.5-${f}`)
      }
      // G by the dialog
      const t0 = Date.now()
      await answerDialogs(app, { paths: [big] })
      await page.getByTestId('import-pick').click()
      await page.waitForTimeout(3000)
      o.log('IM.5 G.csv panel', await readable(page, '[data-testid="import-file-panel"]'))
      o.log('IM.5 G.csv czas do komunikatu (ms, z 3 s czekania)', Date.now() - t0)
      await o.shot(page, 'IM.5-G')
      o.log('IM.5 decyzja po błędnych plikach', await readable(page, '[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]'))
      // W: a row in EUR and a broken date
      await answerDialogs(app, { paths: [join(PLIKI, 'W.csv')] })
      await page.getByTestId('import-pick').click()
      await page.waitForTimeout(2500)
      o.log('IM.5 W.csv plik', await readable(page, '[data-testid="import-file-panel"]'))
      o.log('IM.5 W.csv podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.5 W.csv komunikaty', await statuses(page))
      await o.shot(page, 'IM.5-W')
    })

    // ---------------- IM.6 drop
    await step(o, page, 'IM.6', async () => {
      await page.getByTestId('import-close').click().catch(() => undefined)
      await page.waitForTimeout(500)
      await dropBytes(page, 'L1.csv', readFileSync(files['L1.csv']!))
      await page.getByTestId('import-file').waitFor({ timeout: 30_000 })
      await page.waitForTimeout(800)
      o.log('IM.6 upuszczony L1 plik', await readable(page, '[data-testid="import-file"]'))
      o.log('IM.6 upuszczony L1 liczniki', await counters(page))
      await o.shot(page, 'IM.6-L1')
      await dropBytes(page, 'G.csv', { size: 21 * 1024 * 1024 })
      await page.waitForTimeout(2500)
      o.log('IM.6 upuszczony G panel', await readable(page, '[data-testid="import-file-panel"]'))
      o.log('IM.6 upuszczony G komunikaty', await statuses(page))
      await o.shot(page, 'IM.6-G')
    })

    // ---------------- IM.43 the session of an import (decisions kept across screens and accounts)
    await step(o, page, 'IM.43', async () => {
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, files['L1.csv']!)
      const t = theme(page, 'Zakupy bez rozpoznania')
      await t.getByTestId('import-theme-category').selectOption({ label: 'Prezenty i inne · inne' })
      await search.fill('zegarmistrz')
      await page.waitForTimeout(400)
      await group(page, 'ZEGARMISTRZ ROMAN').getByTestId('import-group-category').selectOption({ label: 'Osobiste · ubrania' })
      await search.fill('')
      const d0 = await catText(page)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(1500)
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1500)
      const d1 = await catText(page)
      o.log('IM.43 po Operacjach: plik', await page.getByTestId('import-file').innerText().catch(() => '(brak pliku)'))
      o.log('IM.43 po Operacjach: decyzje te same', d0 === d1)
      await page.getByTestId('import-account').selectOption({ label: 'Portfel XTB' })
      await page.waitForTimeout(1500)
      o.log('IM.43 konto Portfel – podgląd', await readable(page, '[data-testid="import-summary"]'))
      await page.getByTestId('import-account').selectOption({ label: 'mBank' })
      await page.waitForTimeout(1500)
      const d2 = await catText(page)
      o.log('IM.43 po zmianie konta i z powrotem: decyzje te same', d0 === d2)
      if (d0 !== d2) o.log('IM.43 różnica (po)', d2.slice(0, 4000))
      await page.getByTestId('import-close').click()
      await page.waitForTimeout(600)
      o.log('IM.43 Zamknij plik – komunikaty', await statuses(page))
      await o.shot(page, 'IM.43-zamknij')
      const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
      o.log('IM.43 Cofnij widoczne', await undo.count())
      if (await undo.count()) {
        await undo.first().click()
        await page.waitForTimeout(1200)
        const d3 = await catText(page)
        o.log('IM.43 po Cofnij: plik', await page.getByTestId('import-file').innerText().catch(() => '(brak pliku)'))
        o.log('IM.43 po Cofnij: decyzje te same', d0 === d3)
      }
      await answerDialogs(app, { paths: [files['L2.csv']!] })
      await page.getByTestId('import-pick').click()
      await page.waitForTimeout(2000)
      o.log('IM.43 otwarty L2 – komunikaty', await statuses(page))
      await o.shot(page, 'IM.43-L2')
      const undo2 = page.getByRole('button', { name: 'Cofnij', exact: true })
      if (await undo2.count()) {
        await undo2.first().click()
        await page.waitForTimeout(1200)
        o.log('IM.43 po Cofnij L2: plik', await page.getByTestId('import-file').innerText().catch(() => '(brak pliku)'))
        o.log('IM.43 po Cofnij L2: decyzje te same', d0 === (await catText(page)))
      }
    })

    // ---------------- IM.10 search, selection, bulk decisions
    await step(o, page, 'IM.10', async () => {
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, files['L1.csv']!)
      for (const q of ['orlen', '45,60', 'kawa i przekąski', 'qqqzzz']) {
        await search.fill(q)
        await page.waitForTimeout(600)
        o.log(`IM.10 szukaj „${q}”`, { count: await page.getByTestId('import-search-count').innerText().catch(() => '(brak licznika)'), sure: await page.getByTestId('import-accept-sure').innerText().catch(() => '-'), hints: await page.getByTestId('import-accept-hints').innerText().catch(() => '-'), empty: (await readable(page, '[data-testid="import-right"]')).slice(0, 600) })
      }
      await search.fill('orlen')
      await page.waitForTimeout(500)
      await page.getByTestId('import-select-visible').click()
      o.log('IM.10 zaznaczone', await page.getByTestId('import-bulk-count').innerText())
      await page.getByTestId('import-bulk-kind').selectOption('expense')
      const apply = page.getByTestId('import-bulk-apply')
      o.log('IM.10 Ustaw bez kategorii', { disabled: await apply.isDisabled(), title: await apply.getAttribute('title') })
      const beforeOrlen = await catText(page)
      await apply.click({ force: true }).catch(() => undefined)
      await page.waitForTimeout(400)
      o.log('IM.10 po kliknięciu nieaktywnego Ustaw – propozycje bez zmian', beforeOrlen === (await catText(page)))
      // an inflow ticked too: „tomasz” (incoming loan repaid)
      await search.fill('kolega')
      await page.waitForTimeout(500)
      await page.getByTestId('import-select-visible').click()
      await search.fill('orlen')
      await page.waitForTimeout(400)
      o.log('IM.10 zaznaczone (z wpływem)', await page.getByTestId('import-bulk-count').innerText())
      await page.getByTestId('import-bulk-category').selectOption({ label: 'Auto · paliwo' })
      await apply.click()
      await page.waitForTimeout(500)
      o.log('IM.10 Ustaw – toast', await statuses(page))
      await search.fill('kolega')
      await page.waitForTimeout(400)
      o.log('IM.10 wpływ TOMASZ KOLEGA po Ustaw', await readable(page, '[data-testid="import-right"]'))
      await page.getByTestId('import-bulk-skip').click()
      await page.waitForTimeout(500)
      o.log('IM.10 Nie importuj – toast', await statuses(page))
      o.log('IM.10 liczniki po Nie importuj', await counters(page))
      await page.getByTestId('import-bulk-unskip').click()
      await page.waitForTimeout(400)
      o.log('IM.10 liczniki po Importuj jednak', await counters(page))
      await page.getByTestId('import-bulk-clear').click()
      o.log('IM.10 po Odznacz – pasek', await page.getByTestId('import-bulk').count())
      // „Przyjmij pewne” in a search
      await search.fill('biedronka')
      await page.waitForTimeout(500)
      const sureBtn = page.getByTestId('import-accept-sure')
      o.log('IM.10 Przyjmij pewne w wyszukiwaniu', await sureBtn.innerText().catch(() => '(brak)'))
      const statusesBefore = await page.locator('[data-testid="import-theme"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-label')}=${e.getAttribute('data-status')}`))
      if (await sureBtn.count()) await sureBtn.click()
      await search.fill('')
      await page.waitForTimeout(500)
      const statusesAfter = await page.locator('[data-testid="import-theme"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-label')}=${e.getAttribute('data-status')}`))
      o.log('IM.10 tematy zmienione przez Przyjmij pewne (wyszukiwanie „biedronka”)', statusesAfter.filter((s) => !statusesBefore.includes(s)))
      o.log('IM.10 Przyjmij pewne po wyczyszczeniu', await sureBtn.innerText().catch(() => '(brak)'))
      await o.shot(page, 'IM.10')
    })

    // ---------------- IM.11 keywords
    await step(o, page, 'IM.11', async () => {
      await search.fill('cukiernia')
      await page.waitForTimeout(500)
      o.log('IM.11 znalezione', await page.getByTestId('import-search-count').innerText().catch(() => '-'))
      await page.getByTestId('import-select-visible').click()
      await page.getByTestId('import-bulk-kind').selectOption('expense')
      await page.getByTestId('import-bulk-category').selectOption({ label: 'Jedzenie · kawa i przekąski' })
      o.log('IM.11 pasek', await readable(page, '[data-testid="import-bulk"]'))
      await page.getByTestId('import-bulk-keyword').check()
      await page.getByTestId('import-bulk-apply').click()
      await page.waitForTimeout(1200)
      o.log('IM.11 toast', await statuses(page))
      await page.getByTestId('import-bulk-clear').click().catch(() => undefined)
      o.log('IM.11 po słowie – grupy z cukiernią', await readable(page, '[data-testid="import-right"]'))
      await search.fill('')
      const kw = page.getByTestId('keyword-input')
      for (const w of ['data', 'sklep']) {
        await kw.fill(w)
        await page.getByTestId('keyword-add').click()
        await page.waitForTimeout(600)
        o.log(`IM.11 słowo „${w}”`, { panel: await readable(page, '[data-testid="keyword-rules"]').catch(() => '-'), statuses: await statuses(page) })
      }
      await kw.fill('weterynarz')
      await page.getByTestId('keyword-category').selectOption({ label: 'Zwierzęta · weterynarz' })
      await page.getByTestId('keyword-add').click()
      await page.waitForTimeout(1500)
      o.log('IM.11 weterynarz – panel słów', await readable(page, '[data-testid="keyword-rules"]').catch(() => '-'))
      await search.fill('weterynarz')
      await page.waitForTimeout(500)
      o.log('IM.11 weterynarz – grupa', await readable(page, '[data-testid="import-right"]'))
      await search.fill('')
      const fi = readFi(dataDir)
      o.log('IM.11 słowa w fi.json', fi.settings.import.rules.filter((r: { mode: string }) => r.mode === 'keyword').map((r: Record<string, unknown>) => `${r.match} ${r.direction} ${r.kind} ${r.categoryId}`))
      const del = page.getByTestId('keyword-rule-delete')
      o.log('IM.11 słów na liście', await page.getByTestId('keyword-rule').count())
      await del.first().click()
      await page.waitForTimeout(800)
      o.log('IM.11 usunięcie słowa – komunikaty', await statuses(page))
      o.log('IM.11 słów po usunięciu', await page.getByTestId('keyword-rule').count())
      const builtIn = page.getByText(/Wbudowane słowa/)
      await builtIn.click()
      await page.waitForTimeout(500)
      o.log('IM.11 wbudowane', (await readable(page, '[data-testid="keyword-rules"]').catch(() => '-')).slice(0, 2500))
      await o.shot(page, 'IM.11')
    })

    // ---------------- IM.12 a word for a rule
    await step(o, page, 'IM.12', async () => {
      await search.fill('kurs')
      await page.waitForTimeout(500)
      await group(page, 'KURS JEZYKOWY ABC').getByTestId('import-group-category').selectOption({ label: 'Rozrywka i hobby · hobby' })
      await page.waitForTimeout(600)
      o.log('IM.12 propozycja', await page.getByTestId('import-proposal').innerText().catch(() => '(brak propozycji)'))
      await o.shot(page, 'IM.12-propozycja')
      const word = page.getByTestId('import-proposal-word')
      if (await word.count()) {
        await word.first().click()
        await page.waitForTimeout(800)
        o.log('IM.12 toast', await statuses(page))
      }
      o.log('IM.12 po kliknięciu – grupy kurs', await readable(page, '[data-testid="import-right"]'))
      const fi = readFi(dataDir)
      o.log('IM.12 reguła w fi.json', fi.settings.import.rules.filter((r: { match: string }) => /kurs/.test(r.match)))
      for (const [q, label] of [
        ['automat', 'AUTOMATSPEC'],
        ['zegarmistrz', 'ZEGARMISTRZ ROMAN']
      ] as const) {
        await search.fill(q)
        await page.waitForTimeout(400)
        await group(page, label).getByTestId('import-group-category').selectOption({ label: 'Prezenty i inne · inne' })
        await page.waitForTimeout(600)
        o.log(`IM.12 propozycja ${label}`, await page.getByTestId('import-proposal').innerText().catch(() => '(brak propozycji)'))
        const close = page.getByTestId('import-proposal-close')
        if (await close.count()) {
          o.log(`IM.12 ${label} przycisk zamknięcia`, await close.innerText())
          await close.click()
          await page.waitForTimeout(400)
          o.log(`IM.12 ${label} po „nie, dziękuję”`, await page.getByTestId('import-proposal').count())
        }
      }
      await search.fill('')
    })

    // ---------------- IM.13 similar names
    await step(o, page, 'IM.13', async () => {
      o.log('IM.13 Podobne nazwy', await readable(page, '[data-testid="similar-names"]').catch(() => '(brak panelu)'))
      await o.shot(page, 'IM.13-panel')
      const pairs = page.getByTestId('similar-pair')
      o.log('IM.13 par', await pairs.count())
      if (await pairs.count()) {
        await pairs.first().getByTestId('similar-merge').click()
        await page.waitForTimeout(1000)
        o.log('IM.13 Połącz – toast', await statuses(page))
        await search.fill('mokka')
        await page.waitForTimeout(400)
        o.log('IM.13 po Połącz – grupy mokka', await page.locator('[data-testid="import-group"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.split('\n')[0])))
        await search.fill('')
        const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
        if (await undo.count()) {
          await undo.first().click()
          await page.waitForTimeout(1000)
          o.log('IM.13 po Cofnij – panel', await readable(page, '[data-testid="similar-names"]').catch(() => '(brak panelu)'))
        }
      }
      // two groups ticked: BAR MLECZNY + BAR POD LIPA? (bar) / PIZERIA NAPOLI (typo) ; two chains: LIDL + KAUFLAND
      await search.fill('pizeria')
      await page.waitForTimeout(400)
      await page.getByTestId('import-select-visible').click()
      await search.fill('zegarmistrz')
      await page.waitForTimeout(400)
      await page.getByTestId('import-select-visible').click()
      await search.fill('')
      o.log('IM.13 dwie grupy zaznaczone – pasek', await readable(page, '[data-testid="import-bulk"]'))
      await page.getByTestId('import-bulk-clear').click()
      await search.fill('lidl')
      await page.waitForTimeout(400)
      await page.getByTestId('import-select-visible').click()
      await search.fill('kaufland')
      await page.waitForTimeout(400)
      await page.getByTestId('import-select-visible').click()
      await search.fill('')
      o.log('IM.13 dwie sieci zaznaczone – pasek', await readable(page, '[data-testid="import-bulk"]'))
      await page.getByTestId('import-bulk-clear').click()
    })

    // ---------------- IM.24 „+ domownik”
    await step(o, page, 'IM.24', async () => {
      await search.fill('nowak')
      await page.waitForTimeout(500)
      o.log('IM.24 grupy JAN NOWAK', await readable(page, '[data-testid="import-right"]'))
      await search.fill('rossmann')
      await page.waitForTimeout(500)
      o.log('IM.24 zwrot kartą', await readable(page, '[data-testid="import-right"]'))
      await search.fill('nowak')
      await page.waitForTimeout(400)
      const nm = page.locator('[data-testid="import-group"][data-group*="|in|"]').getByTestId('import-group-new-member')
      o.log('IM.24 + domownik przy wpływie', { count: await nm.count(), title: await nm.first().getAttribute('title').catch(() => null) })
      const membersBefore = readFi(dataDir).settings.household.members.length
      await nm.first().click()
      await page.waitForTimeout(1500)
      o.log('IM.24 po kliknięciu', await readable(page, '[data-testid="import-right"]'))
      o.log('IM.24 toast', await statuses(page))
      await o.shot(page, 'IM.24')
      const fi = readFi(dataDir)
      o.log('IM.24 domownicy w fi.json', { before: membersBefore, after: fi.settings.household.members.map((m: Record<string, unknown>) => `${m.name} ${JSON.stringify(m.bankNames)} inflow=${m.inflow}`) })
      await search.fill('')
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})
