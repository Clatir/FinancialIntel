/**
 * DM.11 – a purchase paid jointly (D83) and a gift (D85), in Operacje. State „rok+dm-i” (two fresh runs on it): the
 * persona's Anna renamed „A. Testowa”; „Anna” (reszta: zaliczka, no balance); „Tata” (reszta: zaliczka) with his advance
 * 20,00 zł – his transfer of 28.10.2026 (mBank).
 */
import { test, type Page } from '@playwright/test'
import { CAT, DMM, addRecords, pay, editorText, fill, financer, log, members, mostek, newOp, openOp, radar, rd, runRok, snap, txs, brief, typeIn, plan } from './dm-pomoc'

const S = 'rok+dm-i'

function prepare(d: string): void {
  members(d, [
    { id: DMM.anna, name: 'Anna', inflow: 'advance' },
    { id: DMM.tata, name: 'Tata', inflow: 'advance' }
  ])
  addRecords(d, 'transactions', [pay({ date: '2026-10-28', amount: 20, member: DMM.tata, counterparty: 'Tata zaliczka 20', kind: 'repay', advance: true })])
}

const parts = async (page: Page) => (await page.getByTestId('operation-share-part').allInnerTexts()).join(' / ')
const shareText = async (page: Page) => (await page.getByTestId('operation-share').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')

test('DM.11 wspólnie', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-i1'
  const { page, app, dataDir } = await runRok(run, prepare)
  try {
    const m0 = await mostek(page)
    log(run, 'DM.11 przed', m0.energiaDzis, '|', m0.domownicy, '|', m0.depozyt, '|', m0.oslony)
    await rd(page, 'DM.11', S, { etap: 'przed (wspólnie)', energiaDzis: m0.energiaDzis, domownicy: m0.domownicy, depozyt: m0.depozyt, oslony: m0.oslony }, dataDir)
    await newOp(page, 'Wydatek')
    await fill(page, { amount: '100', counterparty: 'Sklep wspólny', categoryId: CAT.food })
    await page.getByTestId('operation-share-start').click()
    await page.waitForTimeout(400)
    const share = page.getByTestId('operation-share')
    log(run, 'DM.11 start', await shareText(page))
    await share.getByTestId('operation-share-person').nth(1).selectOption(DMM.anna)
    await page.waitForTimeout(300)
    await share.getByTestId('operation-share-add').click()
    await page.waitForTimeout(300)
    await share.getByTestId('operation-share-person').nth(2).selectOption(DMM.tata)
    await page.waitForTimeout(600)
    const equal = await parts(page)
    log(run, 'DM.11 równo 100', equal, '|', await shareText(page), '| financed', await page.getByTestId('operation-financed').innerText().catch(() => '(brak)'))
    log(run, 'DM.11 plik równo', (await txs(dataDir)).filter((t) => t.counterparty === 'Sklep wspólny').map(brief))
    await snap(page, 'DM.11-rowno')
    const mEq = await mostek(page)
    log(run, 'DM.11 mostek po równo 100', mEq.energiaDzis, '|', mEq.domownicy, '|', mEq.depozyt, '|', mEq.oslony)
    await rd(page, 'DM.11', S, { etap: 'wspólnie 100 zł równo: ja, Anna, Tata', czesci: equal, energiaDzis: mEq.energiaDzis, domownicy: mEq.domownicy, depozyt: mEq.depozyt, oslony: mEq.oslony }, dataDir)

    // percents 50 / 30 / 10
    await openOp(page, 'Sklep wspólny')
    const share2 = page.getByTestId('operation-share')
    await share2.getByRole('radio', { name: 'procenty' }).click()
    await page.waitForTimeout(400)
    for (const [i, v] of [[0, '50'], [1, '30'], [2, '10']] as const) await typeIn(page, share2.getByTestId('operation-share-percent').nth(i), v)
    await page.waitForTimeout(800)
    const pct = await shareText(page)
    log(run, 'DM.11 procenty 50/30/10', pct, '| części', await parts(page))
    log(run, 'DM.11 plik procenty', (await txs(dataDir)).filter((t) => t.counterparty === 'Sklep wspólny').map(brief))
    await snap(page, 'DM.11-procenty')
    // 50 / 30 / 20, then the amount 90
    await typeIn(page, share2.getByTestId('operation-share-percent').nth(2), '20')
    await page.waitForTimeout(500)
    log(run, 'DM.11 procenty 50/30/20', await parts(page))
    await typeIn(page, 'operation-amount', '90')
    await page.waitForTimeout(800)
    const pct90 = await parts(page)
    log(run, 'DM.11 kwota 90 (procenty)', pct90, '|', await shareText(page))
    await snap(page, 'DM.11-90')
    // amounts
    await share2.getByRole('radio', { name: 'kwoty' }).click()
    await page.waitForTimeout(500)
    log(run, 'DM.11 kwoty', await shareText(page), '| części', await parts(page))
    const amts = share2.getByTestId('operation-share-amount')
    log(run, 'DM.11 pola kwot', await amts.count())
    await snap(page, 'DM.11-kwoty')
    // back to equal at 90 zł – the state read
    await share2.getByRole('radio', { name: 'równo' }).click()
    await page.waitForTimeout(800)
    const eq90 = await parts(page)
    log(run, 'DM.11 równo 90', eq90, '| financed', await page.getByTestId('operation-financed').innerText().catch(() => '(brak)'), '| edytor', await editorText(page))
    log(run, 'DM.11 plik końcowy', (await txs(dataDir)).filter((t) => t.counterparty === 'Sklep wspólny').map(brief))
    const m1 = await mostek(page)
    const r1 = await radar(page)
    const p1 = await plan(page)
    log(run, 'DM.11 po', m1.energiaDzis, '|', m1.domownicy, '|', m1.depozyt, '|', m1.oslony, '|', r1.domownicy, '|', p1.koperty.slice(0, 200))
    await rd(page, 'DM.11', S, { etap: 'wspólnie 90 zł równo (po procentach, kwotach)', czesci: eq90, czesciProcenty90: pct90, energiaDzis: m1.energiaDzis, domownicy: m1.domownicy, depozyt: m1.depozyt, oslony: m1.oslony, radar: r1.domownicy, koperty: p1.koperty.slice(0, 300) }, dataDir)
    void app
  } finally {
    await app.close()
  }
})

test('DM.11 prezent', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-i2'
  const { page, app, dataDir } = await runRok(run, prepare)
  try {
    const m0 = await mostek(page)
    log(run, 'DM.11 prezent przed', m0.energiaDzis, '|', m0.domownicy, '|', m0.depozyt, '|', m0.oslony, '|', m0.domRazem)
    await rd(page, 'DM.11', S, { etap: 'przed (prezent)', energiaDzis: m0.energiaDzis, domownicy: m0.domownicy, depozyt: m0.depozyt, oslony: m0.oslony, domRazem: m0.domRazem }, dataDir)
    await newOp(page, 'Wydatek')
    await fill(page, { amount: '60', counterparty: 'Kwiaciarnia prezent', categoryId: CAT.gift })
    await financer(page, `gift:${DMM.tata}`)
    await page.waitForTimeout(800)
    log(run, 'DM.11 prezent financed', await page.getByTestId('operation-financed').innerText().catch(() => '(brak)'), '| edytor', await editorText(page))
    await snap(page, 'DM.11-prezent')
    log(run, 'DM.11 prezent plik', (await txs(dataDir)).filter((t) => t.counterparty === 'Kwiaciarnia prezent').map(brief))
    const m1 = await mostek(page)
    const r1 = await radar(page)
    log(run, 'DM.11 prezent po', m1.energiaDzis, '|', m1.domownicy, '|', m1.depozyt, '|', m1.oslony, '|', m1.domRazem, '|', r1.domownicy)
    await rd(page, 'DM.11', S, { etap: 'po prezencie 60 zł od Taty', energiaDzis: m1.energiaDzis, domownicy: m1.domownicy, depozyt: m1.depozyt, oslony: m1.oslony, domRazem: m1.domRazem, radar: r1.domownicy }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
