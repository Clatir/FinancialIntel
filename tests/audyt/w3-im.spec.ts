// W3 (AU-11, weryfikacja sceptyczna): odtworzenie IM.10, IM.40, IM.48 (w3-im-a), IM.25 (w3-im-b), IM.55 (w3-im-h)
// na świeżych kopiach „rok” (IM.10/40/48/25 – stan przygotowany `prepareImportState`). Narzędzie obserwacji – werdykty
// w docs/audyt/raport/WERYFIKACJA-3.md.
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { start, useState } from './lab'
import { MBANK, Obs, PLIKI, catText, counters, expandAll, group, openFile, prepareImportState, readFi, readable, short, statuses, step, txs } from './im-pomoc'

async function openDone(page: Page): Promise<void> {
  const done = page.getByTestId('import-section-done')
  if ((await done.count()) && !(await done.locator('[data-testid="import-theme"]').count())) await done.locator('button').first().click()
  await expandAll(page, true)
}

async function radar(page: Page): Promise<string> {
  await page.keyboard.press('Control+7')
  await page.waitForTimeout(2500)
  return readable(page, 'main')
}

test('w3-im-a: IM.10 decyzja dla zaznaczonych z wpływem, IM.40 L1 po L2, IM.48 usunięcie reguły i słowa', async () => {
  const o = new Obs('w3-im-a')
  const { dataDir, ictjDir } = useState('rok', 'w3-im-a')
  o.log('stan', prepareImportState(dataDir))
  const run = await start('w3-im-a', { dataDir, ictjDir })
  const { app, page } = run
  const search = page.getByTestId('import-search')
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    const r0 = await radar(page)
    o.log('Radar przed – Pożyczka dla Tomka', r0.split('\n').filter((l) => /Tomk|TOMASZ/i.test(l)).join('\n'))

    // ---------------- IM.10
    await step(o, page, 'IM.10', async () => {
      await openFile(app, page, join(PLIKI, 'L1.csv'))
      await search.fill('kolega')
      await page.waitForTimeout(400)
      await expandAll(page, true)
      o.log('IM.10 TOMASZ KOLEGA przed', await catText(page))
      // only the inflow ticked first: which bulk options does the bar offer?
      await page.getByTestId('import-select-visible').click()
      await page.waitForTimeout(300)
      o.log('IM.10 tylko wpływ – pasek', await readable(page, '[data-testid="import-bulk"]'))
      o.log('IM.10 tylko wpływ – opcje', await page.getByTestId('import-bulk-kind').evaluate((s: HTMLSelectElement) => [...s.options].map((x) => x.text)))
      await page.getByTestId('import-bulk-clear').click()
      await search.fill('orlen')
      await page.waitForTimeout(400)
      await page.getByTestId('import-select-visible').click()
      await search.fill('kolega')
      await page.waitForTimeout(400)
      await page.getByTestId('import-select-visible').click()
      o.log('IM.10 zaznaczone', await page.getByTestId('import-bulk-count').innerText())
      o.log('IM.10 opcje (wydatki + wpływ)', await page.getByTestId('import-bulk-kind').evaluate((s: HTMLSelectElement) => [...s.options].map((x) => x.text)))
      await page.getByTestId('import-bulk-kind').selectOption({ index: 0 })
      await page.getByTestId('import-bulk-category').selectOption({ label: 'Auto · paliwo' })
      o.log('IM.10 pasek przed Ustaw', await readable(page, '[data-testid="import-bulk"]'))
      await page.getByTestId('import-bulk-apply').click()
      await page.waitForTimeout(700)
      o.log('IM.10 toast', await statuses(page))
      await expandAll(page, true)
      o.log('IM.10 TOMASZ KOLEGA po Ustaw', await catText(page))
      await o.shot(page, 'W3.IM10-po-ustaw')
      await page.getByTestId('import-bulk-clear').click().catch(() => undefined)
      await search.fill('')
      await page.waitForTimeout(300)
      o.log('L1 liczniki', await counters(page))
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1000)
      o.log('L1 wynik', await readable(page, '[data-testid="import-done"]'))
      o.log('IM.10 operacja TOMASZ KOLEGA w folderze', (await txs(dataDir)).filter((t) => /TOMASZ KOLEGA/.test(String(t.counterparty)) && String(t.date) >= '2026-10-27').map((t) => `${short(t)} loan=${t.loanId ?? '-'}`))
      o.log('IM.10 reguły TOMASZ / ORLEN w fi.json po imporcie', readFi(dataDir).settings.import.rules.filter((r: { match: string }) => /tomasz|kolega|orlen/i.test(r.match)))
      const r1 = await radar(page)
      o.log('Radar po L1 – Pożyczka dla Tomka', r1.split('\n').filter((l) => /Tomk|TOMASZ/i.test(l)).join('\n'))
    })

    // ---------------- IM.40: L2, then L1 a third time
    await step(o, page, 'IM.40', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'L2.csv'))
      o.log('L2 liczniki', await counters(page))
      o.log('L2 podsumowanie', await readable(page, '[data-testid="import-summary"]').catch(() => '(brak)'))
      const v = page.getByTestId('import-vanished')
      if (await v.count()) await v.locator('input').first().check()
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1000)
      o.log('L2 wynik', await readable(page, '[data-testid="import-done"]'))
      const pend = (all: Array<Record<string, unknown>>) => all.filter((t) => t.accountId === MBANK && /ZABKA Z1234|ORLEN STACJA 4123|APTEKA GEMINI|KIOSK RUCH 12/i.test(String(t.counterparty)) && String(t.date) >= '2026-10-30').map((t) => `${short(t)} key=${(t.bank as Record<string, unknown> | undefined)?.key ?? '-'}`)
      const n2 = (await txs(dataDir)).length
      o.log('IM.40 po L2 – Żabka / Orlen / Apteka / Kiosk w folderze', pend(await txs(dataDir)))
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'L1.csv'))
      await expandAll(page, true)
      o.log('IM.40 L1 trzeci raz – liczniki', await counters(page))
      o.log('IM.40 L1 trzeci raz – podsumowanie', await readable(page, '[data-testid="import-summary"]').catch(() => '(brak)'))
      o.log('IM.40 L1 trzeci raz – dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
      o.log('IM.40 L1 trzeci raz – kategoryzacja', await catText(page))
      await o.shot(page, 'W3.IM40-trzeci-raz')
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1000)
      o.log('IM.40 L1 trzeci raz – wynik', await readable(page, '[data-testid="import-done"]'))
      const all = await txs(dataDir)
      o.log('IM.40 po trzecim L1 – operacji przed / po', [n2, all.length])
      o.log('IM.40 po trzecim L1 – Żabka / Orlen / Apteka / Kiosk', pend(all))
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(2000)
      o.log('IM.40 Meldunki – duplikaty', (await readable(page, 'main')).split('\n').filter((l) => /duplikat|dwa obciążenia|Dwa obciążenia|podwójn/i.test(l)).join('\n'))
      await o.shot(page, 'W3.IM40-meldunki')
    })

    // ---------------- IM.48
    await step(o, page, 'IM.48', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1500)
      const rules = page.getByTestId('import-rule')
      const before = await rules.count()
      const bolt = rules.filter({ hasText: /bolt/i }).first()
      const label = (await bolt.innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
      o.log('IM.48 reguła przed', label)
      const s0 = await statuses(page)
      await bolt.getByTestId('import-rule-delete').click()
      await page.waitForTimeout(1000)
      const body = await readable(page, 'body')
      o.log('IM.48 po „usuń” reguły', { okna: await page.getByRole('dialog').allInnerTexts(), alertdialog: await page.getByRole('alertdialog').count(), komunikaty: (await statuses(page)).filter((x) => !s0.includes(x)), reguł: [before, await rules.count()], cofnij: (body.match(/‹Cofnij[^›]*›/g) ?? []).length })
      await o.shot(page, 'W3.IM48-regula')
      o.log('IM.48 reguła Bolt w fi.json', readFi(dataDir).settings.import.rules.filter((r: { label?: string; match: string }) => /bolt/i.test(`${r.label} ${r.match}`)).length)
      await page.getByTestId('keyword-input').fill('szewc')
      await page.getByTestId('keyword-category').selectOption({ label: 'Osobiste · ubrania' })
      await page.getByTestId('keyword-add').click()
      await page.waitForTimeout(800)
      const kw = page.getByTestId('keyword-rule')
      const k0 = await kw.count()
      const s1 = await statuses(page)
      await kw.filter({ hasText: /szewc/ }).first().getByTestId('keyword-rule-delete').click()
      await page.waitForTimeout(1000)
      const body2 = await readable(page, 'body')
      o.log('IM.48 po „usuń” słowa', { okna: await page.getByRole('dialog').allInnerTexts(), komunikaty: (await statuses(page)).filter((x) => !s1.includes(x)), słów: [k0, await kw.count()], cofnij: (body2.match(/‹Cofnij[^›]*›/g) ?? []).length })
      await o.shot(page, 'W3.IM48-slowo')
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})

test('w3-im-b: IM.25 „+ w tym za Babcia” przy wpłacie Taty', async () => {
  const o = new Obs('w3-im-b')
  const { dataDir, ictjDir } = useState('rok', 'w3-im-b')
  o.log('stan', prepareImportState(dataDir))
  const run = await start('w3-im-b', { dataDir, ictjDir })
  const { app, page } = run
  const search = page.getByTestId('import-search')
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    const before = await radar(page)
    o.log('Radar przed – domownicy', before.split('\n').filter((l) => /Tata|Babcia|Mama/.test(l)).join('\n'))
    await openFile(app, page, join(PLIKI, 'L1.csv'))
    await step(o, page, 'IM.25', async () => {
      await search.fill('piotr testowy')
      await page.waitForTimeout(400)
      await openDone(page)
      const tata = group(page, 'PIOTR TESTOWY')
      o.log('IM.25 grupa Taty przed', await readable(page, '[data-testid="import-groups"]'))
      await tata.getByRole('radio', { name: 'zaliczka' }).click()
      await page.waitForTimeout(400)
      await openDone(page)
      const row = tata.getByTestId('import-row').filter({ hasText: 'OD TATY' }).first()
      const rowBefore = await readable(page, '[data-testid="import-groups"]')
      o.log('IM.25 wiersz „OD TATY I BABCI” – przyciski', await row.locator('button').allInnerTexts())
      await row.getByTestId('import-row-also-for-via').click()
      await page.waitForTimeout(800)
      const rowAfter = await readable(page, '[data-testid="import-groups"]')
      o.log('IM.25 po kliknięciu „+ w tym za” w wierszu – zmiana panelu?', rowBefore === rowAfter ? '(bez zmian)' : rowAfter)
      o.log('IM.25 pole kwoty w wierszu', await row.getByTestId('import-row-also-for-amount').count())
      await o.shot(page, 'W3.IM25-wiersz')
      await tata.getByTestId('import-group-also-for-via').first().click()
      await page.waitForTimeout(800)
      const amt = tata.getByTestId('import-group-also-for-amount').first()
      o.log('IM.25 grupa – po „+ w tym za” (pole kwoty)', { pole: await amt.count(), wartość: (await amt.count()) ? await amt.inputValue() : '-' })
      if (await amt.count()) {
        await amt.click()
        await amt.fill('100')
        await amt.press('Tab')
        await page.waitForTimeout(500)
      }
      await openDone(page)
      o.log('IM.25 grupa – w tym za Babcia 100', await readable(page, '[data-testid="import-groups"]'))
      await o.shot(page, 'W3.IM25-grupa')
      await search.fill('')
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1000)
      o.log('L1 wynik', await readable(page, '[data-testid="import-done"]'))
      o.log('IM.25 wpłaty Taty w folderze', (await txs(dataDir)).filter((t) => /PIOTR TESTOWY/.test(String(t.counterparty)) && String(t.date) >= '2026-10-27').map((t) => `${short(t)} shares=${JSON.stringify(t.shares ?? t.splits ?? null)} inflowKind=${t.inflowKind ?? '-'} covers=${JSON.stringify(t.covers ?? null)}`))
      const after = await radar(page)
      o.log('Radar po L1 – domownicy', after.split('\n').filter((l) => /Tata|Babcia|Mama|depozyt|zaliczk|do oddania/i.test(l)).join('\n'))
      await o.shot(page, 'W3.IM25-radar')
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})

test('w3-im-h: IM.55 plik 30 tys. wierszy – zamrożenie okna przy wczytaniu', async () => {
  test.setTimeout(20 * 60_000)
  const o = new Obs('w3-im-h')
  const { dataDir, ictjDir } = useState('rok', 'w3-im-h')
  const run = await start('w3-im-h', { dataDir, ictjDir })
  const { app, page } = run
  const watch = () =>
    page.evaluate(() => {
      const w = window as unknown as { __gap: number; __gaps: number[]; __last: number; __on: boolean }
      w.__gap = 0
      w.__gaps = []
      w.__last = performance.now()
      w.__on = true
      const tick = () => {
        const t = performance.now()
        const d = t - w.__last
        if (d > 500) w.__gaps.push(Math.round(d))
        w.__gap = Math.max(w.__gap, d)
        w.__last = t
        if (w.__on) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  const stop = () => page.evaluate(() => { const w = window as unknown as { __gap: number; __gaps: number[]; __on: boolean }; w.__on = false; return { max: Math.round(w.__gap), ponad500ms: w.__gaps } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'IM.55', async () => {
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1000)
      for (const k of [1, 2]) {
        await watch()
        const t0 = Date.now()
        await openFile(app, page, join(PLIKI, 'P30k.csv'))
        o.log(`IM.55 próba ${k}: przerwy odświeżania okna przy wczytaniu`, await stop())
        o.log(`IM.55 próba ${k}: czas do podglądu (ms, z 0,8 s czekania)`, Date.now() - t0)
        o.log(`IM.55 próba ${k}: liczniki`, await counters(page))
        await o.shot(page, `W3.IM55-podglad-${k}`)
        await page.getByTestId('import-close').click()
        await page.waitForTimeout(1500)
      }
      await openFile(app, page, join(PLIKI, 'P2k.csv'))
      o.log('IM.55 P2k liczniki', await counters(page))
      await watch()
      const t1 = Date.now()
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 300_000 })
      o.log('IM.55 zapis P2k – przerwy odświeżania', await stop())
      o.log('IM.55 zapis P2k (ms)', Date.now() - t1)
      o.log('IM.55 wynik', await readable(page, '[data-testid="import-done"]'))
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})
