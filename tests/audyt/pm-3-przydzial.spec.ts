// PM, przebieg 3 – kopia persony „rok” z dodatkami (opis w PM.md):
// listopad: 01.11 Jedzenie 40 zł; 02.11 wydatek bez kategorii 25 zł, płatność kontenera Netflix 43 zł, wydatek z celu
// „Wakacje 2027” 50 zł (podróże), zakup za Annę 60 zł (Jedzenie, do zwrotu), wpływ 500 zł; stara pożyczka udzielona
// z 15.03.2024 (1 500 zł, z operacją); pożyczki wzięte: „Pożyczka od Marka” (3 000 zł z 10.10.2026, 10 rat po 300 zł od
// 15.11.2026, z kontenerem „Rata: Pożyczka od Marka”) i „Pożyczka od Jacka” (1 000 zł z 05.10.2026, 2 raty po 500 zł od
// 05.12.2026, bez kontenera). Punkty PM.12, PM.6 (wariant rok), PM.5 (bieżący miesiąc poza średnimi), PM.29.
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { ACC, ANNA, CAT, type Ctx, GOAL, NETFLIX, go, goMonth, out, pmId, read, readBridgeAll, readDaily, readIncome, readSalary, readSplit, shotEl, stepper, textOf, toasts, writeRecord, writeTx } from './pm-pomoc'

const RUN = 'pm-3'

test('PM przebieg 3 – dzienny przydział, stara pożyczka, spłata pożyczki', async () => {
  test.setTimeout(20 * 60_000)
  const st = useState('rok', RUN)
  const d = st.dataDir
  writeTx(d, { id: pmId(301), date: '2026-11-01', time: '12:00', amount: -4000, categoryId: CAT.groceries, counterparty: 'BIEDRONKA PM' })
  writeTx(d, { id: pmId(302), date: '2026-11-02', time: '09:00', amount: -2500, categoryId: null, counterparty: 'SKLEP NIEZNANY PM' })
  writeTx(d, { id: pmId(303), date: '2026-11-02', time: null, amount: -4300, categoryId: '01KDEFCAT00000000000000703', counterparty: 'NETFLIX.COM', containerId: NETFLIX })
  writeTx(d, { id: pmId(304), date: '2026-11-02', time: '13:00', amount: -5000, categoryId: CAT.travel, counterparty: 'BIURO PODROZY PM', goalId: GOAL.wakacje })
  writeTx(d, { id: pmId(305), date: '2026-11-02', time: '14:00', amount: -6000, categoryId: CAT.groceries, counterparty: 'LIDL PM ANNA', refundable: true, memberId: ANNA })
  writeTx(d, { id: pmId(306), date: '2026-11-02', time: null, amount: 50000, kind: 'income', counterparty: 'URZAD SKARBOWY PM', title: 'ZWROT NADPLATY' })
  // Stara pożyczka z Radaru sprzed historii banku (z operacją, jak domyślnie zapisuje Radar).
  writeRecord(d, `loans/${pmId(310)}.json`, { id: pmId(310), name: 'Pożyczka dla Jacka (stara)', direction: 'given', counterparty: 'JACEK STARY', amount: 150000, date: '2024-03-15', accountId: ACC.mbank, schedule: [{ id: pmId(311), date: '2024-06-15', amount: 150000 }], closedAt: null, note: '' })
  writeTx(d, { id: pmId(312), date: '2024-03-15', amount: -150000, kind: 'loan', counterparty: 'JACEK STARY', title: 'Pożyczka: Pożyczka dla Jacka (stara)', loanId: pmId(310) })
  // PM.29: pożyczka wzięta z kontenerem i bez.
  const marek = pmId(320)
  const sched = Array.from({ length: 10 }, (_, i) => {
    const m = new Date(Date.UTC(2026, 10 + i, 15))
    return { id: pmId(330 + i), date: m.toISOString().slice(0, 10), amount: 30000 }
  })
  writeRecord(d, `loans/${marek}.json`, { id: marek, name: 'Pożyczka od Marka', direction: 'taken', counterparty: 'MAREK KOWALSKI', amount: 300000, date: '2026-10-10', accountId: ACC.mbank, schedule: sched, closedAt: null, note: '' })
  writeTx(d, { id: pmId(321), date: '2026-10-10', amount: 300000, kind: 'loan', counterparty: 'MAREK KOWALSKI', title: 'Pożyczka otrzymana: Pożyczka od Marka', loanId: marek })
  writeRecord(d, `containers/${pmId(322)}.json`, { id: pmId(322), name: 'Rata: Pożyczka od Marka', type: 'installment', amount: 30000, cycleMonths: 1, dueMonth: '2026-11', dueDay: 15, accountId: ACC.mbank, categoryId: null, counterparty: 'MAREK KOWALSKI', from: '2026-11', until: '2027-08', loanId: marek, archived: false, archivedAt: null, past: [], schedule: [], variable: false, priceIgnored: null, aliveAt: null, note: '' })
  const jacek = pmId(340)
  writeRecord(d, `loans/${jacek}.json`, { id: jacek, name: 'Pożyczka od Jacka', direction: 'taken', counterparty: 'JACEK NOWAK', amount: 100000, date: '2026-10-05', accountId: ACC.mbank, schedule: [{ id: pmId(341), date: '2026-12-05', amount: 50000 }, { id: pmId(342), date: '2027-01-05', amount: 50000 }], closedAt: null, note: '' })
  writeTx(d, { id: pmId(343), date: '2026-10-05', amount: 100000, kind: 'loan', counterparty: 'JACEK NOWAK', title: 'Pożyczka otrzymana: Pożyczka od Jacka', loanId: jacek })

  const ctx: Ctx = { dataDir: d, ictjDir: st.ictjDir, state: 'rok + listopad (40 zł, bez kategorii 25, Netflix 43, cel 50, za Annę 60, wpływ 500) + stara pożyczka 2024 + pożyczki Marka i Jacka (pm-3)' }
  const { app, page, errors } = await start(RUN, { dataDir: d, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  const rd = (point: string, v: Record<string, string | number | null>) => read(page, ctx, point, v)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(6000)

    await step('PM.12', async () => {
      const b = await readBridgeAll(page)
      dump('mostek-0', b)
      await shotEl(page.locator('section[data-panel="bridge:Stan okrętu"]').first(), 'PM.12-mostek')
      await go(page, '4', 'page-month')
      const dl = await readDaily(page)
      const sp = await readSplit(page)
      await shotEl(page.getByTestId('month-daily'), 'PM.12-przydzial')
      dump('plan-0', { dl, sp })
      await rd('PM.12', { etap: 'listopad z wydatkami 01–02.11', ...dl, mostekEnergia: b.energia, mostekPodpis: b.podpis, rozbicie: b.rozbicie ?? '', podzial: sp.panel })
    })
    await step('PM.6-rok', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const inc = await readIncome(page)
      await goMonth(page, '2026-12')
      const s = await readSalary(page)
      await page.getByTestId('month-envelopes-propose').click()
      await page.waitForTimeout(800)
      const t = await toasts(page)
      await page.waitForTimeout(1000)
      const sp = await readSplit(page)
      await go(page, '7', 'page-radar')
      const radar = await textOf(page.getByTestId('page-radar'))
      dump('PM.6-radar', radar)
      const inc12: Record<string, string> = {}
      for (const k of Object.keys(inc)) if (/^(work|trading|total)-/.test(k)) inc12[k] = inc[k]!
      await rd('PM.6', { wariant: 'rok + stara pożyczka (2024) + listopad', ...inc12, panelPrzychody: inc.panel, propozycjaPensjiM1: s.panel, toastKoperty: t.join(' || '), kopertyM1: sp.koperty, radarPozyczki: radar.split('\n').filter((l) => /Jacka|JACEK/i.test(l)).join(' | ') })
      await rd('PM.5', { wariant: 'z wpływem 500 zł 02.11 (bieżący miesiąc)', ...inc12 })
    })

    // ---- PM.29: spłata pożyczki ----
    const loanState = async (label: string) => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const sp = await readSplit(page)
      const dl = await readDaily(page)
      const b = await readBridgeAll(page)
      await go(page, '5', 'page-cargo')
      const cargo = await textOf(page.getByTestId('page-cargo'))
      await go(page, '7', 'page-radar')
      const loans = await page.getByTestId('loan-row').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
      const r = { ladowniaPodzial: sp.ladownia, energiaMiesiaca: (dl.panel.match(/Energia miesiąca[^|]*\|?[^|]*/) ?? [''])[0], energiaDzis: b.energia, stan: b.stan, pozyczki: loans.join(' ; '), ladownia: cargo.split('\n').slice(0, 30).join(' | ') }
      dump(`PM.29-${label}`, r)
      return r
    }
    await step('PM.29', async () => {
      const s0 = await loanState('przed')
      await shot(page, 'PM.29-radar-przed')
      await rd('PM.29', { etap: 'przed', ...s0 })
      // „do Ładowni” przy pożyczce bez kontenera.
      const jacekRow = page.locator('[data-testid="loan-row"][data-name="Pożyczka od Jacka"]')
      const marekRow = page.locator('[data-testid="loan-row"][data-name="Pożyczka od Marka"]')
      const buttons = { jacekDoLadowni: await jacekRow.getByTestId('loan-create-container').count(), marekDoLadowni: await marekRow.getByTestId('loan-create-container').count() }
      await jacekRow.getByTestId('loan-create-container').click()
      await page.waitForTimeout(800)
      const t1 = await toasts(page)
      await shot(page, 'PM.29-do-ladowni')
      const s1 = await loanState('po-do-ladowni')
      await rd('PM.29', { etap: '„do Ładowni” przy pożyczce Jacka', przyciski: JSON.stringify(buttons), toast: t1.join(' || '), ...s1 })
      // Rata z pensji (Ładownia).
      await go(page, '7', 'page-radar')
      await marekRow.getByTestId('loan-pay-open').click()
      await page.waitForTimeout(400)
      const src = await marekRow.getByTestId('loan-pay-source').locator('option').allInnerTexts().catch(() => [])
      const amt = await marekRow.getByTestId('loan-pay-amount').inputValue().catch(() => '')
      await marekRow.getByTestId('loan-pay-source').selectOption('cargo')
      await shotEl(marekRow, 'PM.29-zaplac')
      await marekRow.getByTestId('loan-pay').click()
      await page.waitForTimeout(1500)
      const t2 = await toasts(page)
      const s2 = await loanState('po-racie-z-pensji')
      await rd('PM.29', { etap: 'rata z pensji (Ładownia)', zrodla: src.join(' ; '), kwota: amt, toast: t2.join(' || '), ...s2 })
      // Nadpłata z osłon.
      await go(page, '7', 'page-radar')
      await marekRow.getByTestId('loan-pay-open').click()
      await page.waitForTimeout(400)
      const amt3 = await marekRow.getByTestId('loan-pay-amount').inputValue().catch(() => '')
      await marekRow.getByTestId('loan-pay-source').selectOption('shields')
      await marekRow.getByTestId('loan-pay').click()
      await page.waitForTimeout(1500)
      const t3 = await toasts(page)
      const s3 = await loanState('po-nadplacie-z-oslon')
      await shot(page, 'PM.29-radar-po')
      await rd('PM.29', { etap: 'nadpłata z osłon', kwota: amt3, toast: t3.join(' || '), ...s3 })
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
