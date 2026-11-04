/**
 * DM.12 – the settlements from a chosen day and the opening balance. State „rok+dm-j”: the persona's Anna renamed
 * „A. Testowa”; „Babcia” (reszta: pytaj) bought before 01.09.2026 – 120,00 zł 10.08.2026 „Apteka Babci” and 180,00 zł
 * 20.08.2026 „Sklep Babci” (she owes 300,00 zł); „Tata” (reszta: przychód, owes nothing) sent 200,00 zł 25.08.2026,
 * 100,00 zł 15.09.2026, 150,00 zł 29.10.2026 (mBank). „Rozliczenia od” is set in the window: „od dziś”, then
 * 01.09.2026 (= the 1st day of M-2, the point's state), then the point's steps.
 */
import { test, type Page } from '@playwright/test'
import { DMM, addRecords, buy, pay, log, members, mostek, przychody, radar, rd, runRok, snap, toastsAfter, ustawieniaDomownicy, typeIn } from './dm-pomoc'

const S = 'rok+dm-j'

async function household(page: Page): Promise<void> {
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('settings-tab-household').click()
  await page.waitForTimeout(600)
}

async function readAll(page: Page) {
  const u = await ustawieniaDomownicy(page)
  const m = await mostek(page)
  const r = await radar(page)
  const inc = await przychody(page)
  return { u, m, r, inc }
}

test('DM.12', async () => {
  test.setTimeout(25 * 60_000)
  const run = 'dm-j'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [
      { id: DMM.babcia, name: 'Babcia', inflow: 'ask' },
      { id: DMM.tata, name: 'Tata', inflow: 'income' }
    ])
    addRecords(d, 'transactions', [
      buy({ date: '2026-08-10', amount: 120, member: DMM.babcia, counterparty: 'Apteka Babci' }),
      buy({ date: '2026-08-20', amount: 180, member: DMM.babcia, counterparty: 'Sklep Babci' }),
      pay({ date: '2026-08-25', amount: 200, member: DMM.tata, counterparty: 'Tata przelew sierpień', kind: 'repay', advance: false }),
      pay({ date: '2026-09-15', amount: 100, member: DMM.tata, counterparty: 'Tata przelew wrzesień', kind: 'repay', advance: false }),
      pay({ date: '2026-10-29', amount: 150, member: DMM.tata, counterparty: 'Tata przelew październik', kind: 'repay', advance: false })
    ])
  })
  try {
    const a0 = await readAll(page)
    log(run, 'DM.12 start budżetu', a0.u, '|', a0.m.domownicy, '|', a0.r.domownicy, '|', a0.inc)
    await rd(page, 'DM.12', S, { etap: 'rozliczenia od startu budżetu (stan wyjściowy)', od: a0.u.od, osoby: a0.u.osoby, mostek: a0.m.domownicy, radar: a0.r.domownicy, przychody: a0.inc }, dataDir)

    // „od dziś”, then 01.09.2026
    await household(page)
    log(run, 'DM.12 od dziś toast', await toastsAfter(page, () => page.getByTestId('household-since-today').click()))
    await page.waitForTimeout(800)
    log(run, 'DM.12 01.09 toast', await toastsAfter(page, () => typeIn(page, 'household-since', '01.09.2026'), 3000))
    await snap(page, 'DM.12-od-0109')
    const a1 = await readAll(page)
    log(run, 'DM.12 od 01.09', a1.u, '|', a1.m.domownicy, '|', a1.r.domownicy, '|', a1.inc)
    await rd(page, 'DM.12', S, { etap: 'rozliczenia od 01.09.2026 (stan punktu)', od: a1.u.od, osoby: a1.u.osoby, mostek: a1.m.domownicy, radar: a1.r.domownicy, przychody: a1.inc }, dataDir)

    // a later day: 01.10.2026 – the message with „Cofnij”
    await household(page)
    const t2 = await toastsAfter(page, () => typeIn(page, 'household-since', '01.10.2026'), 1500)
    const undo = page.getByRole('status').getByRole('button', { name: 'Cofnij' })
    const undoShown = await undo.count()
    await snap(page, 'DM.12-pozniej')
    log(run, 'DM.12 01.10 toast', t2, '| Cofnij', undoShown)
    const a2 = await readAll(page)
    log(run, 'DM.12 od 01.10', a2.u, '|', a2.m.domownicy, '|', a2.r.domownicy, '|', a2.inc)
    await rd(page, 'DM.12', S, { etap: 'po zmianie na 01.10.2026', komunikat: t2.join(' || '), od: a2.u.od, osoby: a2.u.osoby, mostek: a2.m.domownicy, radar: a2.r.domownicy, przychody: a2.inc }, dataDir)

    // „Cofnij” – back to 01.09 (the toast lasts 8 s: set the date again and press it at once)
    await household(page)
    await typeIn(page, 'household-since', '01.09.2026')
    await page.waitForTimeout(600)
    const t3 = await toastsAfter(page, () => typeIn(page, 'household-since', '01.10.2026'), 600)
    let undone = 'brak przycisku'
    if (await page.getByRole('status').getByRole('button', { name: 'Cofnij' }).count()) {
      await page.getByRole('status').getByRole('button', { name: 'Cofnij' }).first().click()
      undone = 'kliknięte'
    }
    await page.waitForTimeout(1000)
    const a3 = await readAll(page)
    log(run, 'DM.12 Cofnij', t3, undone, '|', a3.u, '|', a3.m.domownicy, '|', a3.r.domownicy, '|', a3.inc)
    await rd(page, 'DM.12', S, { etap: 'po „Cofnij” (zmiana 01.09 → 01.10 cofnięta)', cofnij: undone, od: a3.u.od, osoby: a3.u.osoby, mostek: a3.m.domownicy, radar: a3.r.domownicy, przychody: a3.inc }, dataDir)

    // a day in the future
    await household(page)
    const t4 = await toastsAfter(page, () => typeIn(page, 'household-since', '01.12.2026'), 2500)
    const u4 = await ustawieniaDomownicy(page)
    log(run, 'DM.12 przyszłość', t4, '|', u4.od)
    await household(page)
    await snap(page, 'DM.12-przyszlosc')

    // a day before the budget's start
    await household(page)
    const t5 = await toastsAfter(page, () => typeIn(page, 'household-since', '01.08.2025'), 2500)
    await page.waitForTimeout(500)
    const before = await page.getByTestId('household-since-before-start').innerText().catch(() => '(brak)')
    await snap(page, 'DM.12-przed-startem')
    const a5 = await readAll(page)
    log(run, 'DM.12 przed startem', t5, '|', before, '|', a5.u.od, '|', a5.m.domownicy, '|', a5.inc)
    await rd(page, 'DM.12', S, { etap: 'data 01.08.2025 (przed startem budżetu)', komunikat: t5.join(' || '), dopisek: before, od: a5.u.od, osoby: a5.u.osoby, mostek: a5.m.domownicy, przychody: a5.inc }, dataDir)

    // „od startu budżetu”
    await household(page)
    const t6 = await toastsAfter(page, () => page.getByTestId('household-since-budget').click(), 2500)
    const a6 = await readAll(page)
    log(run, 'DM.12 od startu budżetu', t6, '|', a6.u, '|', a6.m.domownicy, '|', a6.inc)
    await rd(page, 'DM.12', S, { etap: '„od startu budżetu”', komunikat: t6.join(' || '), od: a6.u.od, osoby: a6.u.osoby, mostek: a6.m.domownicy, radar: a6.r.domownicy, przychody: a6.inc }, dataDir)
    await household(page)
    await snap(page, 'DM.12-od-startu')
    void app
  } finally {
    await app.close()
  }
})
