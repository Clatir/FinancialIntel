/**
 * DM.7 – an earlier transfer finances a later purchase (D94). State „rok+dm-e”: the persona's Anna renamed
 * „A. Testowa”; „Tata” (reszta: zaliczka): his transfer 300,00 zł 31.10.2026 „Tata przelew 300” (spłata, reszta jako
 * zaliczka), his purchases 50,00 zł 01.11.2026 „Sklep Taty 50” and 280,00 zł 03.11.2026 „Sklep Taty 280” (mBank).
 */
import { test, type Page } from '@playwright/test'
import { DMM, addRecords, buy, pay, editorText, log, members, mostek, radar, rd, runRok, snap, txs, brief, openOp } from './dm-pomoc'

const S = 'rok+dm-e'

async function purchase(page: Page, q: string): Promise<string> {
  await openOp(page, q)
  return (await page.getByTestId('purchase-repaid').allInnerTexts().catch(() => [])).join(' ').replace(/\s+/g, ' ') || '(brak statusu)'
}

test('DM.7', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-e'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [{ id: DMM.tata, name: 'Tata', inflow: 'advance' }])
    addRecords(d, 'transactions', [
      pay({ date: '2026-10-31', amount: 300, member: DMM.tata, counterparty: 'Tata przelew 300', kind: 'repay', advance: true }),
      buy({ date: '2026-11-01', amount: 50, member: DMM.tata, counterparty: 'Sklep Taty 50' }),
      buy({ date: '2026-11-03', amount: 280, member: DMM.tata, counterparty: 'Sklep Taty 280' })
    ])
  })
  try {
    const m0 = await mostek(page)
    const r0 = await radar(page)
    const s0 = [await purchase(page, 'Sklep Taty 50'), await purchase(page, 'Sklep Taty 280')]
    log(run, 'DM.7 przed', m0.domownicy, '|', m0.depozyt, '|', m0.oslony, '|', r0.domownicy, '|', s0)
    await rd(page, 'DM.7', S, { etap: 'przed', domownicy: m0.domownicy, depozyt: m0.depozyt, oslony: m0.oslony, radar: r0.domownicy, status50: s0[0]!, status280: s0[1]! }, dataDir)

    await openOp(page, 'Sklep Taty 280')
    log(run, 'DM.7 edytor 280', await editorText(page))
    await page.getByTestId('purchase-assign').click()
    await page.waitForTimeout(500)
    const opts = (await page.getByTestId('purchase-assign-option').allInnerTexts()).map((x) => x.replace(/\s+/g, ' '))
    log(run, 'DM.7 opcje', opts)
    await snap(page, 'DM.7-przypisz')
    await page.getByTestId('purchase-assign-option').filter({ hasText: 'Tata przelew 300' }).first().click()
    await page.waitForTimeout(800)
    log(run, 'DM.7 po przypisaniu', await page.getByTestId('purchase-repaid').innerText().catch(() => '(brak)'))
    await snap(page, 'DM.7-oddane')
    await openOp(page, 'Tata przelew 300')
    log(run, 'DM.7 edytor wpłaty', await editorText(page))
    await snap(page, 'DM.7-wplata')
    log(run, 'DM.7 plik', (await txs(dataDir)).filter((t) => t.memberId === DMM.tata).map(brief))
    const m1 = await mostek(page)
    const r1 = await radar(page)
    const s1 = [await purchase(page, 'Sklep Taty 50'), await purchase(page, 'Sklep Taty 280')]
    log(run, 'DM.7 po', m1.domownicy, '|', m1.depozyt, '|', m1.oslony, '|', r1.domownicy, '|', s1)
    await rd(page, 'DM.7', S, { etap: 'po „Przypisz zwrot…” 300 → 280', domownicy: m1.domownicy, depozyt: m1.depozyt, oslony: m1.oslony, radar: r1.domownicy, status50: s1[0]!, status280: s1[1]! }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
