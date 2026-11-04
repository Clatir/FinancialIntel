/**
 * DM.5 – the docking of the rest as income, seen today (the shields not full): state „rok+dm-d2” – the persona's Anna
 * renamed „A. Testowa”; „Tata” (reszta: przychód, owes nothing). His transfer 120,00 zł typed today in Operacje.
 */
import { test } from '@playwright/test'
import { DMM, editorText, fill, log, members, mostek, newOp, payer, raport, rd, runRok, line } from './dm-pomoc'

const S = 'rok+dm-d2'

test('DM.5 – przychód dokuje (dziś)', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'dm-d2'
  const { page, app, dataDir } = await runRok(run, (d) => members(d, [{ id: DMM.tata, name: 'Tata', inflow: 'income' }]))
  try {
    const m0 = await mostek(page)
    const n0 = await raport(page, '2026-11')
    log(run, 'DM.5b przed', m0.stan, '|', line(n0, 'Bilans paliwa'))
    await rd(page, 'DM.5', S, { etap: 'przed (wpłata z dziś, ustawienie „przychód”)', stan: m0.stan, bilansPaliwaM0: line(n0, 'Bilans paliwa') }, dataDir)
    await newOp(page, 'Wpływ')
    await fill(page, { amount: '120', counterparty: 'Tata przelew 120 dziś' })
    await payer(page, DMM.tata)
    await page.waitForTimeout(800)
    log(run, 'DM.5b edytor', await editorText(page))
    const m1 = await mostek(page)
    const n1 = await raport(page, '2026-11')
    log(run, 'DM.5b po', m1.stan, '|', line(n1, 'Bilans paliwa'))
    await rd(page, 'DM.5', S, { etap: 'po wpłacie 120 zł z dziś (reszta „przychód”)', stan: m1.stan, bilansPaliwaM0: line(n1, 'Bilans paliwa') }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
