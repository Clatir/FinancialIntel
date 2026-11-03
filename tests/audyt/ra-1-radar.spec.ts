// RA, przebieg 1 – Radar na kopii „rok” z dobudowanymi zdarzeniami (raport RA.md, „Stan danych”): odczyty RA.1–RA.5, RA.8,
// RA.11–RA.14, odprawa, Ładownia, Plan miesiąca M+1 / M+2; potem działania: RA.7 (boje: „operacja ›”, „to nie ta”,
// „Wykonaj teraz” + „Cofnij”, „odhacz”), RA.14 („pokaż”, „zamknij”), RA.12 (zakup → operacja, „wydatki domowników ›”),
// RA.6 (nowe boje). Narzędzie obserwacji – oceny w docs/audyt/raport/RA.md.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import {
  ACC,
  CAT,
  briefing,
  editJson,
  go,
  ictjGuard,
  itemLine,
  out,
  raId,
  readJson,
  readLayers,
  readNow,
  readRadar,
  recordsOf,
  seedRecords,
  stepper,
  toasts,
  where,
  writeIctjPayout
} from './mg-pomoc'

const RUN = 'ra-1'
const STATE = 'rok + zdarzenia RA (pożyczki Oli/Igi/od Marka, boje, Wywóz śmieci, Kurs angielskiego, zwroty, Tata/Babcia, plan XII 7 000, Telefon X bez płatności, pula Podatek 1 200)'
const MAREK = '01KAZ200000000000000000003'
const OSOBISTE = '01KDEFCAT00000000000000800'
const UBRANIA = '01KDEFCAT00000000000000801'
const ID = {
  plan12: raId(1),
  trash: raId(2),
  english: raId(3),
  rateMarek: raId(4),
  ola: raId(10),
  iga: raId(11),
  marek: raId(12),
  tata: raId(60),
  babcia: raId(61),
  taxEntry: raId(70),
  taxTx: raId(71)
}

/** The RA state: the persona „rok” with the events the points of the Radar need (described in raport/RA.md). */
function buildRa(dataDir: string, ictjDir: string): void {
  const nov = readJson(join(dataDir, 'months', '2026-11.json'))
  const bank = (key: string, who: string, op: string) => ({ format: 'mbank', key: `mbank:audyt-${key}:0`, description: `${op} ${who}`, counterparty: who, operation: op, category: '', pending: false, importedAt: '2026-11-03T08:00:00.000Z', source: 'historia' })
  seedRecords(dataDir, {
    // RA.2: an own plan of M+1 with another salary; M+2 without a plan.
    months: [{ id: ID.plan12, month: '2026-12', salary: 700000, envelopes: nov.envelopes }],
    containers: [
      // RA.3: a periodic fee paid early (02.11, before its term 20.11) – the next term 20.01.2027.
      { id: ID.trash, name: 'Wywóz śmieci', type: 'fixed', amount: 18000, cycleMonths: 2, dueMonth: '2026-05', dueDay: 20, accountId: ACC.mbank, categoryId: CAT.rent, counterparty: 'MPO TESTOWO', from: '2026-05' },
      // RA.13: a container ending with M0 (until 2026-11), its last payment 12.11 – within 14 days.
      { id: ID.english, name: 'Kurs angielskiego', type: 'subscription', amount: 30000, cycleMonths: 1, dueMonth: '2026-06', dueDay: 12, accountId: ACC.mbank, categoryId: OSOBISTE, counterparty: 'SZKOLA JEZYKOWA LINGUA', from: '2026-06', until: '2026-11' },
      // RA.5: the installments of the loan taken from Marek.
      { id: ID.rateMarek, name: 'Rata – Marek', type: 'installment', amount: 40000, cycleMonths: 1, dueMonth: '2026-11', dueDay: 1, accountId: ACC.mbank, categoryId: null, counterparty: 'MAREK POZYCZKOWY', from: '2026-11', until: '2027-01', loanId: ID.marek }
    ],
    loans: [
      // RA.5: Ola 4 days late (30.10; 200 of 500 zł paid 31.10), Iga 1 day late (02.11), Marek (taken) 2 days late (01.11).
      { id: ID.ola, name: 'Pożyczka dla Oli', direction: 'given', counterparty: 'ALEKSANDRA TESTOWA', amount: 100000, date: '2026-09-30', accountId: ACC.mbank, schedule: [{ id: raId(101), date: '2026-10-30', amount: 50000 }, { id: raId(102), date: '2026-11-30', amount: 50000 }] },
      { id: ID.iga, name: 'Pożyczka dla Igi', direction: 'given', counterparty: 'IGA TESTOWA', amount: 60000, date: '2026-10-02', accountId: ACC.mbank, schedule: [{ id: raId(111), date: '2026-11-02', amount: 60000 }] },
      { id: ID.marek, name: 'Pożyczka od Marka', direction: 'taken', counterparty: 'MAREK POZYCZKOWY', amount: 120000, date: '2026-10-01', accountId: ACC.mbank, schedule: [{ id: raId(121), date: '2026-11-01', amount: 40000 }, { id: raId(122), date: '2026-12-01', amount: 40000 }, { id: raId(123), date: '2027-01-01', amount: 40000 }] }
    ],
    scheduled: [
      // RA.7: „Serwis auta” 600 zł D−2 with the bank's operation of D−1; a buoy of D−10 without an operation; one of D−35.
      { id: raId(30), name: 'Serwis auta', date: '2026-11-01', amount: -60000, yearly: false, categoryId: CAT.service, accountId: ACC.mbank, counterparty: 'AUTO SERWIS KOWALSKI', remind: [14, 3] },
      { id: raId(31), name: 'Przegląd komina', date: '2026-10-24', amount: -25000, yearly: false, categoryId: CAT.rent, accountId: ACC.mbank, counterparty: 'KOMINIARZ', remind: [14, 3] },
      { id: raId(32), name: 'Składka PZW', date: '2026-09-29', amount: -10000, yearly: false, categoryId: CAT.other, accountId: ACC.mbank, counterparty: 'PZW', remind: [14, 3] },
      // „Wykonaj teraz” and the reminders 14 and 3 days before (RA.6).
      { id: raId(33), name: 'Prezent dla mamy', date: '2026-11-13', amount: -20000, yearly: false, categoryId: CAT.giftsSub, accountId: ACC.mbank, counterparty: 'KWIACIARNIA ROZA', remind: [14, 3] },
      { id: raId(34), name: 'Opłata za przedszkole', date: '2026-11-05', amount: -40000, yearly: false, categoryId: CAT.other, accountId: ACC.mbank, counterparty: 'PRZEDSZKOLE NR 1', remind: [14, 3] }
    ],
    transactions: [
      // The loans' money.
      { id: raId(20), date: '2026-09-30', accountId: ACC.mbank, kind: 'loan', amount: -100000, loanId: ID.ola, counterparty: 'ALEKSANDRA TESTOWA', title: 'POZYCZKA' },
      { id: raId(21), date: '2026-10-31', accountId: ACC.mbank, kind: 'loan', amount: 20000, loanId: ID.ola, counterparty: 'ALEKSANDRA TESTOWA', title: 'CZESC RATY' },
      { id: raId(22), date: '2026-10-02', accountId: ACC.mbank, kind: 'loan', amount: -60000, loanId: ID.iga, counterparty: 'IGA TESTOWA', title: 'POZYCZKA' },
      { id: raId(23), date: '2026-10-01', accountId: ACC.mbank, kind: 'loan', amount: 120000, loanId: ID.marek, counterparty: 'MAREK POZYCZKOWY', title: 'POZYCZKA' },
      // „Wywóz śmieci”: 20.05, 20.07, 21.09 and early 02.11.
      ...['2026-05-20', '2026-07-20', '2026-09-21', '2026-11-02'].map((date, i) => ({ id: raId(80 + i), date, accountId: ACC.mbank, kind: 'expense', amount: -18000, categoryId: CAT.rent, containerId: ID.trash, counterparty: 'MPO TESTOWO', title: 'WYWOZ ODPADOW' })),
      // „Kurs angielskiego”: 12.06 … 12.10.
      ...['2026-06-12', '2026-07-13', '2026-08-12', '2026-09-14', '2026-10-12'].map((date, i) => ({ id: raId(85 + i), date, accountId: ACC.mbank, kind: 'expense', amount: -30000, categoryId: OSOBISTE, containerId: ID.english, counterparty: 'SZKOLA JEZYKOWA LINGUA', title: 'KURS' })),
      // RA.7: the bank's operation of „Serwis auta” (D−1).
      { id: raId(40), date: '2026-11-02', accountId: ACC.mbank, kind: 'expense', amount: -60000, categoryId: CAT.service, counterparty: 'AUTO SERWIS KOWALSKI', title: 'NAPRAWA', bank: bank('ra40', 'AUTO SERWIS KOWALSKI', 'ZAKUP PRZY UŻYCIU KARTY') },
      // RA.14: returns on the way – one due in 5 days, one 3 days late.
      { id: raId(50), date: '2026-10-25', accountId: ACC.mbank, kind: 'expense', amount: -25000, categoryId: UBRANIA, counterparty: 'ZALANDO', awaitReturn: { amount: 25000, until: '2026-11-08', closedAt: null } },
      { id: raId(51), date: '2026-10-10', accountId: ACC.mbank, kind: 'expense', amount: -12000, categoryId: UBRANIA, counterparty: 'DECATHLON', awaitReturn: { amount: 12000, until: '2026-10-31', closedAt: null } },
      // RA.12: Tata's advance, Marek's repayment not assigned to a purchase.
      { id: raId(62), date: '2026-10-15', accountId: ACC.mbank, kind: 'income', amount: 50000, memberId: ID.tata, advance: true, inflowKind: 'advance', counterparty: 'ADAM KAPITAN', title: 'NA ZAKUPY' },
      { id: raId(63), date: '2026-11-02', accountId: ACC.mbank, kind: 'income', amount: 10000, memberId: MAREK, advance: true, inflowKind: 'repay', counterparty: 'MAREK TESTOWY', title: 'ZWROT CZESCIOWY' },
      // RA.8: a payout of the pool „Podatek” (its mBank pair, docked below).
      { id: ID.taxTx, date: '2026-10-29', accountId: ACC.mbank, kind: 'trading', amount: 120000, counterparty: 'XTB S.A.', title: 'WYPLATA SRODKOW' }
    ],
    dockings: [{ id: raId(72), date: '2026-10-29', transactionId: ID.taxTx, ictjEntryId: ID.taxEntry, entryDate: '2026-10-29', pool: 'tax', split: null }]
  })
  writeIctjPayout(ictjDir, { id: ID.taxEntry, kind: 'withdrawal', date: '2026-10-29', amount: 1200, pool: 'tax' })
  // RA.4: „Telefon Play” of October unpaid (its payment of 20.10 removed).
  rmSync(join(dataDir, 'transactions', '2026', '2026-10-20_01M6GWBBW5BZ42BMXRA184V53S.json'), { force: true })
  // RA.12: Tata (advance) and Babcia (an opening balance owed, through Tata).
  editJson(join(dataDir, 'fi.json'), (f) => {
    f.settings.household.members.push(
      { id: ID.tata, name: 'Tata', bankNames: ['ADAM KAPITAN'], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 } },
      { id: ID.babcia, name: 'Babcia', bankNames: [], inflow: 'advance', archived: false, via: ID.tata, opening: { owed: 25000, deposit: 0 } }
    )
    return f
  })
}

test('RA przebieg 1 – Radar na stanie rok + zdarzenia', async () => {
  const st = useState('rok', RUN)
  buildRa(st.dataDir, st.ictjDir!)
  const dirs = { dataDir: st.dataDir, ictjDir: st.ictjDir }
  const guard = ictjGuard(RUN, st.ictjDir)
  const dump = out(RUN)
  const step = stepper(dump)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const radar = async () => {
    await go(page, '7', 'page-radar')
    await page.waitForTimeout(1000)
    return readRadar(page)
  }
  const items = (r: Awaited<ReturnType<typeof readRadar>>, kinds?: string[]) =>
    Object.fromEntries(r.items.filter((i) => !kinds || kinds.includes(i.kind ?? '')).map((i, n) => [`${String(n).padStart(2, '0')}:${i.kind}`, `${itemLine(i)} | kolor-kwoty ${i.amountColor} | kolor-notki ${i.noteColor} | kolor-osłon ${i.shieldsColor}`]))
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(6000)

    // ---------------- reads
    let layers: Record<string, string> = {}
    let brief: Array<{ kind: string | null; text: string }> = []
    await step('mostek', async () => {
      layers = await readLayers(page)
      brief = await briefing(page)
      dump('mostek', { layers, odprawa: brief })
      await shot(page, 'RA-mostek')
    })
    await step('radar-odczyty', async () => {
      const r = await radar()
      dump('radar', r)
      dump('radar-tekst', await text(page, '[data-testid="page-radar"]'))
      await shot(page, 'RA.1')
      const odprawa = brief.map((b) => `[${b.kind}] ${b.text}`).join(' || ')
      await readNow(page, 'ra', 'RA.1', STATE, dirs, async () => ({ naglowek: r.header, ...items(r) }))
      await readNow(page, 'ra', 'RA.2', STATE, dirs, async () => ({ ...items(r, ['salary']), stan: layers.stan }))
      await readNow(page, 'ra', 'RA.3', STATE, dirs, async () => ({ ...items(r, ['asteroid']), odprawa }))
      await readNow(page, 'ra', 'RA.4', STATE, dirs, async () => items(r, ['fixed', 'asteroid']))
      await readNow(page, 'ra', 'RA.5', STATE, dirs, async () => ({ ...items(r, ['repayment', 'installment', 'plan', 'return']), pozyczki: r.panels['radar-loans'], odprawa }))
      await readNow(page, 'ra', 'RA.8', STATE, dirs, async () => ({ pit38: r.panels['radar-pit38'], terminy: JSON.stringify(r.items.filter((i) => i.kind === 'pit38').map(itemLine)), odprawa }))
      await readNow(page, 'ra', 'RA.11', STATE, dirs, async () => ({ ...items(r), stan: layers.stan }))
      await readNow(page, 'ra', 'RA.12', STATE, dirs, async () => ({ naleznosci: r.panels['radar-receivables'], pozyczki: r.panels['radar-loans'], mostekRozliczenia: layers.rozliczenia, mostekStan: layers.stan }))
      await readNow(page, 'ra', 'RA.13', STATE, dirs, async () => ({ ...items(r, ['end']), odprawa }))
      await readNow(page, 'ra', 'RA.14', STATE, dirs, async () => ({ ...items(r, ['return']), zwroty: r.panels['radar-returns'], saldaKont: r.accounts.join(' || ') }))
      await readNow(page, 'ra', 'RA.7', `${STATE} – przed działaniami na bojach`, dirs, async () => ({ boje: r.buoys.join(' || '), panelBoi: r.panels['radar-buoys'], saldaKont: r.accounts.join(' || ') }))
    })
    await step('ladownia', async () => {
      await go(page, '5', 'page-cargo')
      await page.waitForTimeout(1000)
      const t = (await text(page, '[data-testid="page-cargo"]')).replace(/\s+/g, ' ')
      dump('ladownia', t)
      await shot(page, 'RA.3-ladownia')
      await readNow(page, 'ra', 'RA.3', `${STATE} – Ładownia`, dirs, async () => ({ ladownia: t }))
    })
    await step('plan', async () => {
      await go(page, '4', 'page-month')
      const res: Record<string, string> = {}
      for (const k of ['M0', 'M+1', 'M+2']) {
        if (k !== 'M0') await page.getByTestId('month-next').click()
        await page.waitForTimeout(900)
        res[k] = (await page.getByTestId('page-month').innerText()).replace(/\s+/g, ' ').slice(0, 1400)
      }
      dump('plan', res)
      await readNow(page, 'ra', 'RA.2', `${STATE} – Plan miesiąca M0, M+1, M+2`, dirs, async () => res)
      await readNow(page, 'ra', 'RA.13', `${STATE} – Plan miesiąca M0, M+1, M+2 (ładownia)`, dirs, async () => res)
    })

    // ---------------- RA.12: clicks
    await step('RA.12-klik', async () => {
      await go(page, '7', 'page-radar')
      const open = page.locator('[data-testid="radar-member-open"]').first()
      await open.locator('summary').click()
      await page.waitForTimeout(400)
      const list = (await open.innerText()).replace(/\s+/g, ' ')
      await page.locator('[data-testid="radar-member-purchase"]').first().click()
      await page.waitForTimeout(1500)
      const w1 = await where(page)
      const ed = await text(page, '[data-testid="operation-editor"]').catch(() => '(brak edytora)')
      await go(page, '7', 'page-radar')
      await page.getByRole('button', { name: 'wydatki domowników ›' }).click()
      await page.waitForTimeout(1500)
      const w2 = await where(page)
      const filters = (await text(page, '[data-testid="page-operations"]').catch(() => '')).slice(0, 600)
      dump('RA.12-klik', { lista: list, poKliknieciuZakupu: w1, edytor: ed.slice(0, 400), poWydatkiDomownikow: w2, operacje: filters })
    })

    // ---------------- RA.14: „pokaż”, „zamknij”
    await step('RA.14', async () => {
      await go(page, '7', 'page-radar')
      const row = page.locator('[data-testid="radar-return"]').filter({ hasText: 'DECATHLON' })
      await row.getByTestId('radar-return-open').click()
      await page.waitForTimeout(1500)
      const w = await where(page)
      const ed = await text(page, '[data-testid="operation-editor"]').catch(() => '(brak edytora)')
      await page.keyboard.press('Escape')
      await go(page, '7', 'page-radar')
      const before = await readRadar(page)
      await page.locator('[data-testid="radar-return"]').filter({ hasText: 'DECATHLON' }).getByTestId('radar-return-close').click()
      await page.waitForTimeout(1500)
      const t = await toasts(page)
      const after = await readRadar(page)
      dump('RA.14-dzialania', { pokaz: w, edytor: ed.slice(0, 500), toasty: t, zwrotyPrzed: before.panels['radar-returns'], zwrotyPo: after.panels['radar-returns'], osPrzed: before.items.filter((i) => i.kind === 'return').map(itemLine), osPo: after.items.filter((i) => i.kind === 'return').map(itemLine), plik: recordsOf(st.dataDir, 'transactions').find((x) => x.id === raId(51))?.awaitReturn })
      await readNow(page, 'ra', 'RA.14', `${STATE} – po „zamknij” zwrotu DECATHLON`, dirs, async () => ({ zwroty: after.panels['radar-returns'], os: JSON.stringify(after.items.filter((i) => i.kind === 'return').map(itemLine)), stan: (await readLayers(page)).stan }))
    })

    // ---------------- RA.7: buoys
    await step('RA.7-operacja', async () => {
      await go(page, '7', 'page-radar')
      const done = page.getByTestId('buoys-done')
      if (await done.count()) await done.locator('summary').click()
      await page.waitForTimeout(300)
      const doneText = (await done.innerText().catch(() => '(brak „Zrobione ostatnio”)')).replace(/\s+/g, ' ')
      const row = page.locator('[data-testid="buoy-done"][data-name="Serwis auta"]')
      await row.getByRole('button', { name: 'operacja ›' }).click().catch(() => undefined)
      await page.waitForTimeout(1500)
      const w = await where(page)
      const ed = await text(page, '[data-testid="operation-editor"]').catch(() => '(brak edytora)')
      dump('RA.7-1-operacja', { zrobione: doneText, poKliknieciu: w, edytor: ed.slice(0, 400) })
      await page.keyboard.press('Escape')
    })
    await step('RA.7-to-nie-ta', async () => {
      await go(page, '7', 'page-radar')
      const before = await readRadar(page)
      const done = page.getByTestId('buoys-done')
      if (await done.count()) await done.locator('summary').click()
      await page.locator('[data-testid="buoy-done"][data-name="Serwis auta"]').getByTestId('buoy-not-this').click()
      await page.waitForTimeout(2000)
      const after = await readRadar(page)
      dump('RA.7-2-to-nie-ta', { bojePrzed: before.buoys, bojePo: after.buoys, saldaPrzed: before.accounts, saldaPo: after.accounts, plik: recordsOf(st.dataDir, 'scheduled').find((s) => s.id === raId(30)) })
      await readNow(page, 'ra', 'RA.7', `${STATE} – po „to nie ta” (Serwis auta)`, dirs, async () => ({ boje: after.buoys.join(' || '), saldaKont: after.accounts.join(' || '), os: JSON.stringify(after.items.filter((i) => i.kind === 'plan').map(itemLine)) }))
    })
    await step('RA.7-wykonaj', async () => {
      await go(page, '7', 'page-radar')
      const day = page.locator('[data-testid="buoy-day"][data-name="Prezent dla mamy"]')
      await day.getByTestId('buoy-execute').click()
      await page.waitForTimeout(2000)
      const w = await where(page)
      const ed = (await text(page, '[data-testid="operation-editor"]').catch(() => '(brak edytora)')).replace(/\s+/g, ' ')
      const t = await toasts(page)
      const made = recordsOf(st.dataDir, 'transactions').filter((x) => x.counterparty === 'KWIACIARNIA ROZA')
      await shot(page, 'RA.7-wykonaj')
      const sched = recordsOf(st.dataDir, 'scheduled').find((s) => s.id === raId(33))
      // „Cofnij” of the toast.
      await page.getByRole('status').filter({ hasText: /Prezent dla mamy|boj/i }).getByTestId('toast-action').first().click().catch(() => undefined)
      await page.waitForTimeout(2000)
      const madeAfter = recordsOf(st.dataDir, 'transactions').filter((x) => x.counterparty === 'KWIACIARNIA ROZA')
      const schedAfter = recordsOf(st.dataDir, 'scheduled').find((s) => s.id === raId(33))
      dump('RA.7-3-wykonaj', { okno: w, edytor: ed.slice(0, 700), toasty: t, operacja: made, bojaDone: sched?.done, poCofnij: { operacje: madeAfter.length, bojaDone: schedAfter?.done } })
      await go(page, '7', 'page-radar')
      const r = await readRadar(page)
      dump('RA.7-3b-boje-po-cofnij', r.buoys)
    })
    await step('RA.7-odhacz', async () => {
      await go(page, '7', 'page-radar')
      const before = await readRadar(page)
      await page.locator('[data-testid="buoy-day"][data-name="Przegląd komina"]').getByTestId('buoy-tick').click()
      await page.waitForTimeout(2000)
      const after = await readRadar(page)
      const later = await page.getByTestId('buoys-later').innerText().catch(() => '(brak „Pozostałe boje”)')
      dump('RA.7-4-odhacz', { bojePrzed: before.buoys, bojePo: after.buoys, pozostale: later.replace(/\s+/g, ' '), plik: recordsOf(st.dataDir, 'scheduled').find((s) => s.id === raId(31))?.done, pzw: recordsOf(st.dataDir, 'scheduled').find((s) => s.id === raId(32)) })
      await readNow(page, 'ra', 'RA.7', `${STATE} – po „odhacz” (Przegląd komina)`, dirs, async () => ({ boje: after.buoys.join(' || '), saldaKont: after.accounts.join(' || '), pozostale: later.replace(/\s+/g, ' ') }))
      await shot(page, 'RA.7-boje')
    })

    // ---------------- RA.6: new buoys
    await step('RA.6', async () => {
      await go(page, '7', 'page-radar')
      const panel = page.getByTestId('radar-new-buoy')
      const res: Record<string, unknown> = {}
      const kind = async (label: string) => panel.getByRole('radio', { name: label }).or(panel.getByRole('button', { name: label })).first().click()
      const fill = async (o: { kind: string; name: string; date: string; amount?: string; account?: string; category?: string; remind?: string; yearly?: boolean }) => {
        await kind(o.kind)
        await panel.getByTestId('buoy-name').fill(o.name)
        const d = panel.getByTestId('buoy-date')
        await d.click()
        await d.fill(o.date)
        await d.press('Tab')
        if (o.amount != null) {
          const a = panel.getByTestId('buoy-amount')
          await a.click()
          await a.fill(o.amount)
          await a.press('Tab')
        }
        if (o.account) await panel.getByTestId('buoy-account').selectOption({ label: o.account })
        if (o.category) await panel.getByLabel('Kategoria boi').selectOption({ label: o.category })
        if (o.remind != null) {
          await panel.getByTestId('buoy-remind').fill(o.remind)
          await panel.getByTestId('buoy-remind').press('Tab')
        }
        if (o.yearly) await panel.getByTestId('buoy-yearly').getByRole('switch').click()
        await page.waitForTimeout(300)
      }
      // Errors first: no name; an expense without an amount.
      await kind('Wydatek')
      await panel.getByTestId('buoy-name').fill('')
      await panel.getByTestId('buoy-save').click()
      await page.waitForTimeout(400)
      res.bezNazwy = await toasts(page)
      await panel.getByTestId('buoy-name').fill('Bez kwoty')
      await panel.getByTestId('buoy-save').click()
      await page.waitForTimeout(400)
      res.bezKwoty = await toasts(page)
      await fill({ kind: 'Wydatek', name: 'Wesele Kasi', date: '2026-11-23', amount: '1500', account: 'mBank', category: 'Prezenty i inne', remind: '14, 3' })
      await panel.getByTestId('buoy-save').click()
      await page.waitForTimeout(800)
      res.wesele = await toasts(page)
      await fill({ kind: 'Wpływ', name: 'Premia', date: '2026-12-13', amount: '2000', account: 'mBank' })
      await panel.getByTestId('buoy-save').click()
      await page.waitForTimeout(800)
      res.premia = await toasts(page)
      await fill({ kind: 'Termin bez kwoty', name: 'Wymiana dowodu', date: '2027-01-02' })
      await panel.getByTestId('buoy-save').click()
      await page.waitForTimeout(800)
      res.dowod = await toasts(page)
      await fill({ kind: 'Wydatek', name: 'Urodziny Leona', date: '2024-02-29', amount: '300', account: 'mBank', yearly: true })
      await panel.getByTestId('buoy-save').click()
      await page.waitForTimeout(1500)
      res.urodziny = await toasts(page)
      res.pliki = recordsOf(st.dataDir, 'scheduled').filter((s) => ['Wesele Kasi', 'Premia', 'Wymiana dowodu', 'Urodziny Leona', 'Bez kwoty'].includes(s.name)).map((s) => `${s.name} ${s.date} ${s.amount} yearly=${s.yearly} remind=${JSON.stringify(s.remind)} acc=${s.accountId} cat=${s.categoryId}`)
      const r = await readRadar(page)
      const later = await page.getByTestId('buoys-later').innerText().catch(() => '(brak)')
      res.pozostale = later.replace(/\s+/g, ' ')
      dump('RA.6', { ...res, boje: r.buoys })
      await shot(page, 'RA.6')
      await readNow(page, 'ra', 'RA.6', `${STATE} + boje RA.6 (Wesele Kasi, Premia, Wymiana dowodu, Urodziny Leona co roku 29.02)`, dirs, async () => ({ ...items(r, ['plan']), boje: r.buoys.join(' || '), pozostale: later.replace(/\s+/g, ' ') }))
      const b = await briefing(page.context().pages()[0]!).catch(() => [])
      await go(page, '1', 'page-bridge')
      const bb = await briefing(page)
      dump('RA.6-odprawa', { odprawa: bb, b })
    })

    dump('bledy-okna', errors)
  } finally {
    await app.close().catch(() => undefined)
    dump('ictj-zmiany-aplikacji', guard.check())
  }
})
