// RA, przebieg 3 – uzupełnienie RA.7 / RA.6 / RA.11 / RA.12 na kopii „rok” (w `ra-1` boja z D−10 zamknęła się zakupem
// ZALANDO tej samej kwoty, a pierwszy zakup Należności – saldo na start – nie ma operacji). Stan: `rok` + boje (mBank):
// „Przegląd komina” −275 zł 24.10.2026 (D−10), „Opłata klubowa” −90 zł 05.10 (D−29), „Mandat” −80 zł 03.10 (D−31),
// „Składka PZW” −100 zł 29.09 (D−35), „Premia roczna” +20 000 zł 10.11 (wpływ przy prawie pełnych osłonach), „Urodziny
// Leona” −300 zł 29.02.2024 co roku. Narzędzie obserwacji – oceny w docs/audyt/raport/RA.md.
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import { ACC, CAT, briefing, go, itemLine, out, raId, readLayers, readNow, readRadar, recordsOf, seedRecords, stepper, where } from './mg-pomoc'

const RUN = 'ra-3'
const STATE = 'rok + boje: Przegląd komina −275 (24.10), Opłata klubowa −90 (05.10), Mandat −80 (03.10), Składka PZW −100 (29.09), Premia roczna +20 000 (10.11), Urodziny Leona −300 (29.02.2024, co roku)'

test('RA przebieg 3 – boje po terminie, 30 dni, odhacz, wpływ przy pełnych osłonach, zakup z Należności', async () => {
  const st = useState('rok', RUN)
  const b = (n: number, name: string, date: string, amount: number, yearly = false) => ({ id: raId(n), name, date, amount, yearly, categoryId: amount < 0 ? CAT.other : null, accountId: ACC.mbank, counterparty: name.toUpperCase(), remind: [14, 3] })
  seedRecords(st.dataDir, {
    scheduled: [
      b(301, 'Przegląd komina', '2026-10-24', -27500),
      b(302, 'Opłata klubowa', '2026-10-05', -9000),
      b(303, 'Mandat', '2026-10-03', -8000),
      b(304, 'Składka PZW', '2026-09-29', -10000),
      b(305, 'Premia roczna', '2026-11-10', 2000000),
      b(306, 'Urodziny Leona', '2024-02-29', -30000, true)
    ]
  })
  const dirs = { dataDir: st.dataDir, ictjDir: st.ictjDir }
  const dump = out(RUN)
  const step = stepper(dump)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const openAll = async () => {
    for (const id of ['buoys-done', 'buoys-later']) {
      const d = page.getByTestId(id)
      if ((await d.count()) && !(await d.evaluate((e) => (e as HTMLDetailsElement).open))) await d.locator('summary').click()
    }
    await page.waitForTimeout(300)
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(5000)
    await step('odczyt', async () => {
      const l = await readLayers(page)
      const br = await briefing(page)
      await go(page, '7', 'page-radar')
      await openAll()
      const r = await readRadar(page)
      const done = (await page.getByTestId('buoys-done').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
      const later = (await page.getByTestId('buoys-later').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
      dump('odczyt', { stan: l.stan, odprawa: br, boje: r.buoys, zrobione: done, pozostale: later, os: r.items.map(itemLine) })
      await shot(page, 'RA.7-boje-po-terminie')
      await readNow(page, 'ra', 'RA.7', STATE, dirs, async () => ({ boje: r.buoys.join(' || '), zrobione: done, pozostale: later, os: JSON.stringify(r.items.filter((i) => i.kind === 'plan').map(itemLine)), odprawa: br.filter((x) => x.kind === 'plan').map((x) => x.text).join(' || '), saldaKont: r.accounts.join(' || ') }))
      await readNow(page, 'ra', 'RA.11', `${STATE} – osłony po zdarzeniu (wpływ 20 000 zł przy osłonach 13 000 / 19 500)`, dirs, async () => ({ stan: l.stan, ...Object.fromEntries(r.items.map((i, n) => [`${String(n).padStart(2, '0')}:${i.kind}`, `${itemLine(i)} | kolor-osłon ${i.shieldsColor}`])) }))
      await readNow(page, 'ra', 'RA.6', `${STATE} – boja co roku z 29.02`, dirs, async () => ({ pozostale: later }))
    })
    await step('odhacz', async () => {
      await go(page, '7', 'page-radar')
      await page.locator('[data-testid="buoy-day"][data-name="Przegląd komina"]').getByTestId('buoy-tick').click()
      await page.waitForTimeout(1500)
      await openAll()
      const r = await readRadar(page)
      const done = (await page.getByTestId('buoys-done').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
      dump('odhacz', { boje: r.buoys, zrobione: done, plik: recordsOf(st.dataDir, 'scheduled').find((s) => s.id === raId(301))?.done, operacje: recordsOf(st.dataDir, 'transactions').filter((t) => t.counterparty === 'PRZEGLĄD KOMINA').length })
      await readNow(page, 'ra', 'RA.7', `${STATE} – po „odhacz” (Przegląd komina)`, dirs, async () => ({ boje: r.buoys.join(' || '), zrobione: done, saldaKont: r.accounts.join(' || ') }))
    })
    await step('RA.12-zakup', async () => {
      await go(page, '7', 'page-radar')
      const opens = page.locator('[data-testid="radar-member-open"]')
      for (let i = 0; i < (await opens.count()); i++) await opens.nth(i).locator('summary').click()
      await page.waitForTimeout(300)
      const btn = page.locator('[data-testid="radar-member-purchase"]:not([disabled])').first()
      const label = (await btn.innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
      await btn.click()
      await page.waitForTimeout(1500)
      const w = await where(page)
      const ed = (await text(page, '[data-testid="operation-editor"]').catch(() => '(brak edytora)')).replace(/\s+/g, ' ')
      await page.keyboard.press('Escape')
      await go(page, '7', 'page-radar')
      await page.getByRole('button', { name: 'wydatki domowników ›' }).click()
      await page.waitForTimeout(1500)
      const w2 = await where(page)
      const ops = (await text(page, '[data-testid="page-operations"]').catch(() => '')).replace(/\s+/g, ' ').slice(0, 700)
      await shot(page, 'RA.12-wydatki-domownikow')
      dump('RA.12', { zakup: label, poKliknieciu: w, edytor: ed.slice(0, 500), poWydatkiDomownikow: w2, operacje: ops })
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
