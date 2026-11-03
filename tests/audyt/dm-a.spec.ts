/**
 * DM.1 (a purchase a member finances does not eat the energy) and DM.2 (from the member's advance first, the rest lent
 * by the shields). State „rok+dm-a”: the persona's Anna renamed „A. Testowa” (her advance kept), a clean „Anna” (no
 * advance, no debt), „Tata” (reszta: zaliczka) with his advance 500,00 zł – his transfer of 28.10.2026 (mBank).
 */
import { test } from '@playwright/test'
import { CAT, DMM, ACC, addRecords, editorText, fill, financer, log, members, mostek, newOp, pay, plan, quick, quickVisible, radar, raport, rd, runRok, snap, dzisGra, line, txs, brief } from './dm-pomoc'

const S = 'rok+dm-a'

test('DM.1 i DM.2', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-a'
  const { app, page, dataDir } = await runRok(run, (d) => {
    members(d, [
      { id: DMM.anna, name: 'Anna', inflow: 'advance' },
      { id: DMM.tata, name: 'Tata', inflow: 'advance' }
    ])
    addRecords(d, 'transactions', [pay({ date: '2026-10-28', amount: 500, member: DMM.tata, counterparty: 'Tata przelew zaliczka', kind: 'repay', advance: true })])
  })
  try {
    // ---------------- DM.1
    const m0 = await mostek(page)
    const r0 = await radar(page)
    const p0 = await plan(page)
    const rep0 = await raport(page, '2026-11')
    const g0 = await dzisGra(page)
    log(run, 'DM.1 przed', m0, r0.domownicy, p0.koperta, line(rep0, 'Koszty netto'), line(rep0, 'Sfinansowane przez domowników'), g0)
    await rd(page, 'DM.1', S, { etap: 'przed', energiaDzis: m0.energiaDzis, oslony: m0.oslony, koperta: p0.koperta, mostekDomownicy: m0.domownicy, radarDomownicy: r0.domownicy, kosztyNettoM0: line(rep0, 'Koszty netto'), sfinansowane: line(rep0, 'Sfinansowane przez domowników'), gra: g0 }, dataDir)

    await newOp(page, 'Wydatek')
    await fill(page, { amount: '120', counterparty: 'Sklep DM1', categoryId: CAT.food, accountId: ACC.mbank })
    await financer(page, `pay:${DMM.anna}`)
    await page.waitForTimeout(800)
    const ed1 = await editorText(page)
    log(run, 'DM.1 edytor', ed1)
    log(run, 'DM.1 operation-financed', await page.getByTestId('operation-financed').innerText().catch(() => '(brak)'))
    await snap(page, 'DM.1-edytor')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // the quick entry „Za domownika” → Anna, 60 zł
    let q = await quick(app, page)
    await q.locator('[role="radiogroup"][aria-label="Rodzaj"]').getByRole('radio', { name: 'Za domownika' }).click()
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('60')
    await q.getByTestId('quick-amount').press('Tab')
    await q.getByTestId('quick-category').selectOption(CAT.food)
    await q.getByTestId('quick-financer').selectOption(DMM.anna)
    await q.waitForTimeout(400)
    log(run, 'DM.1 szybki podgląd', await q.getByTestId('quick-preview').innerText().catch(() => '(brak)'))
    await snap(q, 'DM.1-szybki')
    await q.getByTestId('quick-financer').press('Enter')
    await page.waitForTimeout(1500)
    log(run, 'DM.1 szybki po Enter widoczny', await quickVisible(app))

    // without a person: refused, nothing saved
    const before = (await txs(dataDir)).length
    q = await quick(app, page)
    await q.locator('[role="radiogroup"][aria-label="Rodzaj"]').getByRole('radio', { name: 'Za domownika' }).click()
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('35')
    await q.getByTestId('quick-amount').press('Tab')
    await q.getByTestId('quick-category').selectOption(CAT.food)
    await q.getByTestId('quick-financer').selectOption('')
    await q.waitForTimeout(300)
    await q.getByTestId('quick-financer').press('Enter')
    await q.waitForTimeout(800)
    const msg = await q.getByTestId('quick-message').innerText().catch(() => '(brak)')
    log(run, 'DM.1 bez osoby komunikat', msg, '| podgląd', await q.getByTestId('quick-preview').innerText().catch(() => '(brak)'))
    await snap(q, 'DM.1-bez-osoby')
    await q.keyboard.press('Escape')
    await page.waitForTimeout(800)
    log(run, 'DM.1 bez osoby – nowe pliki', (await txs(dataDir)).length - before)

    const m1 = await mostek(page)
    const r1 = await radar(page)
    const p1 = await plan(page)
    const rep1 = await raport(page, '2026-11')
    const g1 = await dzisGra(page)
    log(run, 'DM.1 po', m1, r1.domownicy, p1.koperta, line(rep1, 'Koszty netto'), line(rep1, 'Sfinansowane przez domowników'), g1)
    log(run, 'DM.1 raport M0', rep1.slice(0, 900))
    log(run, 'DM.1 pliki', (await txs(dataDir)).filter((t) => t.memberId === DMM.anna).map(brief))
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(600)
    await snap(page, 'DM.1-mostek')
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    await snap(page, 'DM.1-radar')
    await rd(page, 'DM.1', S, { etap: 'po (120 Operacje + 60 szybki wpis, Anna)', energiaDzis: m1.energiaDzis, oslony: m1.oslony, koperta: p1.koperta, mostekDomownicy: m1.domownicy, radarDomownicy: r1.domownicy, kosztyNettoM0: line(rep1, 'Koszty netto'), sfinansowane: line(rep1, 'Sfinansowane przez domowników'), gra: g1 }, dataDir)

    // ---------------- DM.2
    const m2 = await mostek(page)
    log(run, 'DM.2 przed', m2.depozyt, m2.oslony, m2.domownicy, m2.sumaKont)
    await rd(page, 'DM.2', S, { etap: 'przed', depozyt: m2.depozyt, oslony: m2.oslony, domownicy: m2.domownicy, sumaKont: m2.sumaKont, stan: m2.stan }, dataDir)
    await newOp(page, 'Wydatek')
    await fill(page, { amount: '200', counterparty: 'Sklep DM2 a', categoryId: CAT.food })
    await financer(page, `pay:${DMM.tata}`)
    await page.waitForTimeout(800)
    log(run, 'DM.2 200 financed', await page.getByTestId('operation-financed').innerText().catch(() => '(brak)'))
    await snap(page, 'DM.2-200')
    await page.keyboard.press('Escape')
    const m3 = await mostek(page)
    const r3 = await radar(page)
    log(run, 'DM.2 po 200', m3.depozyt, m3.oslony, m3.domownicy, m3.sumaKont, '| radar', r3.domownicy)
    await rd(page, 'DM.2', S, { etap: 'po 200 zł (Tata)', depozyt: m3.depozyt, oslony: m3.oslony, domownicy: m3.domownicy, radar: r3.domownicy, sumaKont: m3.sumaKont, stan: m3.stan }, dataDir)

    await newOp(page, 'Wydatek')
    await fill(page, { amount: '700', counterparty: 'Sklep DM2 b', categoryId: CAT.food })
    await financer(page, `pay:${DMM.tata}`)
    await page.waitForTimeout(800)
    log(run, 'DM.2 700 financed', await page.getByTestId('operation-financed').innerText().catch(() => '(brak)'))
    await snap(page, 'DM.2-700')
    await page.keyboard.press('Escape')
    const m4 = await mostek(page)
    const r4 = await radar(page)
    log(run, 'DM.2 po 700', m4.depozyt, m4.oslony, m4.domownicy, m4.sumaKont, '| radar', r4.domownicy)
    log(run, 'DM.2 stan', m4.stan)
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(600)
    await snap(page, 'DM.2-mostek')
    await rd(page, 'DM.2', S, { etap: 'po 700 zł (Tata)', depozyt: m4.depozyt, oslony: m4.oslony, domownicy: m4.domownicy, radar: r4.domownicy, sumaKont: m4.sumaKont, stan: m4.stan }, dataDir)
  } finally {
    await app.close()
  }
})
