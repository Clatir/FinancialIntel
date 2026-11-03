/**
 * DM.14 – a product return of a purchase already paid back, no other purchase of the member open: state „rok+dm-l2” –
 * the persona's Anna renamed „A. Testowa”; „Anna” (reszta: zaliczka): „SKLEP TESTOWY” 60,00 zł 10.10.2026 paid back by
 * her transfer 60,00 zł 12.10.2026 „Anna przelew 60” naming it (mBank). A return of 20,00 zł today.
 */
import { test } from '@playwright/test'
import { CAT, DMM, addRecords, buy, pay, editorText, fill, financer, log, members, mostek, newOp, radar, raport, rd, runRok, snap, txs, brief, line, fixedId } from './dm-pomoc'

const S = 'rok+dm-l2'

test('DM.14 – zwrot do zakupu oddanego', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'dm-l2'
  const P60 = fixedId(311)
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [{ id: DMM.anna, name: 'Anna', inflow: 'advance' }])
    addRecords(d, 'transactions', [
      buy({ id: P60, date: '2026-10-10', amount: 60, member: DMM.anna, counterparty: 'SKLEP TESTOWY' }),
      pay({ date: '2026-10-12', amount: 60, member: DMM.anna, counterparty: 'Anna przelew 60', kind: 'repay', advance: true, covers: [P60] })
    ])
  })
  try {
    const m0 = await mostek(page)
    const n0 = await raport(page, '2026-11')
    log(run, 'DM.14b przed', m0.energiaDzis, '|', m0.domownicy, '|', m0.depozyt, '|', m0.oslony, '|', line(n0, 'Koszty netto'))
    await rd(page, 'DM.14', S, { etap: 'przed (zakup 60 zł oddany, nic otwartego)', energiaDzis: m0.energiaDzis, domownicy: m0.domownicy, depozyt: m0.depozyt, oslony: m0.oslony, kosztyNettoM0: line(n0, 'Koszty netto') }, dataDir)
    await newOp(page, 'Wydatek')
    await page.getByTestId('operation-editor').locator('[role="radiogroup"][aria-label="Kierunek"]').getByRole('radio', { name: 'zwrot towaru' }).click()
    await page.waitForTimeout(300)
    await fill(page, { amount: '20', counterparty: 'SKLEP TESTOWY', categoryId: CAT.groceries })
    await financer(page, `pay:${DMM.anna}`)
    await page.waitForTimeout(800)
    const ed = await editorText(page)
    log(run, 'DM.14b edytor', ed.slice(ed.indexOf('Zwrot dla')))
    await snap(page, 'DM.14-zwrot-oddanego-sam')
    log(run, 'DM.14b pliki', (await txs(dataDir)).filter((t) => t.memberId === DMM.anna).map(brief))
    const m1 = await mostek(page)
    const r1 = await radar(page)
    const n1 = await raport(page, '2026-11')
    log(run, 'DM.14b po', m1.energiaDzis, '|', m1.domownicy, '|', m1.depozyt, '|', m1.oslony, '|', line(n1, 'Koszty netto'), '|', r1.domownicy)
    await rd(page, 'DM.14', S, { etap: 'po zwrocie 20 zł do zakupu oddanego (nic otwartego)', energiaDzis: m1.energiaDzis, domownicy: m1.domownicy, radar: r1.domownicy, depozyt: m1.depozyt, oslony: m1.oslony, kosztyNettoM0: line(n1, 'Koszty netto') }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
