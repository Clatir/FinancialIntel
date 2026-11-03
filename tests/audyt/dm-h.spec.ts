/**
 * DM.10 – a transfer split by hand among members. State „rok+dm-h”: the persona's Anna renamed „A. Testowa”; „Anna”
 * (reszta: zaliczka) owes 150,00 zł – „Sklep Anny 150” 20.10.2026; „Tata” (reszta: przychód) owes 120,00 zł – „Sklep
 * Taty 120” 21.10.2026 (mBank). The transfer typed dated 29.10.2026.
 */
import { test } from '@playwright/test'
import { DMM, addRecords, buy, editorText, fill, log, members, mostek, newOp, payer, radar, rd, runRok, snap, txs, brief, rowsOf, typeIn } from './dm-pomoc'

const S = 'rok+dm-h'

test('DM.10', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-h'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [
      { id: DMM.anna, name: 'Anna', inflow: 'advance' },
      { id: DMM.tata, name: 'Tata', inflow: 'income' }
    ])
    addRecords(d, 'transactions', [
      buy({ date: '2026-10-20', amount: 150, member: DMM.anna, counterparty: 'Sklep Anny 150' }),
      buy({ date: '2026-10-21', amount: 120, member: DMM.tata, counterparty: 'Sklep Taty 120' })
    ])
  })
  try {
    const m0 = await mostek(page)
    const r0 = await radar(page)
    log(run, 'DM.10 przed', m0.domownicy, '|', m0.depozyt, '|', m0.oslony, '|', r0.domownicy)
    await rd(page, 'DM.10', S, { etap: 'przed', domownicy: m0.domownicy, depozyt: m0.depozyt, oslony: m0.oslony, radar: r0.domownicy }, dataDir)

    await newOp(page, 'Wpływ')
    await fill(page, { amount: '300', date: '29.10.2026', counterparty: 'Anna przelew 300' })
    await payer(page, DMM.anna)
    await page.getByTestId('operation-income-split').click()
    await page.waitForTimeout(500)
    log(run, 'DM.10 część domyślnie', await page.getByTestId('income-split').innerText().then((x) => x.replace(/\s+/g, ' ')))
    await page.getByTestId('income-split-member').first().selectOption(DMM.tata)
    await page.waitForTimeout(400)
    await typeIn(page, page.getByTestId('income-split-amount').first(), '120')
    await page.waitForTimeout(800)
    log(run, 'DM.10 edytor po podziale', await editorText(page))
    await snap(page, 'DM.10-podzial')
    log(run, 'DM.10 plik', (await txs(dataDir)).filter((t) => t.counterparty === 'Anna przelew 300').map(brief))
    log(run, 'DM.10 lista', await rowsOf(page, 'Anna przelew 300'))
    await snap(page, 'DM.10-lista')
    const m1 = await mostek(page)
    const r1 = await radar(page)
    log(run, 'DM.10 po', m1.domownicy, '|', m1.depozyt, '|', m1.oslony, '|', r1.domownicy)
    await rd(page, 'DM.10', S, { etap: 'po wpłacie 300 zł od Anny z częścią 120 zł Taty', domownicy: m1.domownicy, depozyt: m1.depozyt, oslony: m1.oslony, radar: r1.domownicy }, dataDir)

    // parts over the transfer's amount: 50 zł from Anna, Tata's part 80 zł
    await newOp(page, 'Wpływ')
    await fill(page, { amount: '50', date: '30.10.2026', counterparty: 'Anna przelew 50' })
    await payer(page, DMM.anna)
    await page.getByTestId('operation-income-split').click()
    await page.waitForTimeout(500)
    await page.getByTestId('income-split-member').first().selectOption(DMM.tata)
    await typeIn(page, page.getByTestId('income-split-amount').first(), '80')
    await page.waitForTimeout(800)
    log(run, 'DM.10 ponad kwotę edytor', await editorText(page))
    await snap(page, 'DM.10-ponad')
    log(run, 'DM.10 ponad plik', (await txs(dataDir)).filter((t) => t.counterparty === 'Anna przelew 50').map(brief))
    const m2 = await mostek(page)
    const r2 = await radar(page)
    log(run, 'DM.10 po ponad', m2.domownicy, '|', m2.depozyt, '|', m2.oslony, '|', r2.domownicy)
    await rd(page, 'DM.10', S, { etap: 'po wpłacie 50 zł z częścią Taty 80 zł (ponad kwotę)', domownicy: m2.domownicy, depozyt: m2.depozyt, oslony: m2.oslony, radar: r2.domownicy }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
