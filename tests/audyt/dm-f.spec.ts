/**
 * DM.8 – „Przypisz zwrot…” from a transfer of a closed month (N-PC-9). State „rok+dm-f”: the persona's Anna renamed
 * „A. Testowa”; a clean „Anna” (reszta: przychód): her transfers 100,00 zł 20.09.2026 „Anna przelew wrzesień” and
 * 30,00 zł 05.10.2026 „Anna przelew październik” (spłata, nothing owed then – the rest is income), her purchase
 * 80,00 zł 15.10.2026 „Apteka Anny” (mBank).
 */
import { test } from '@playwright/test'
import { DMM, addRecords, buy, pay, log, members, mostek, radar, raport, rd, runRok, snap, txs, brief, openOp, line } from './dm-pomoc'

const S = 'rok+dm-f'

test('DM.8', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-f'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [{ id: DMM.anna, name: 'Anna', inflow: 'income' }])
    addRecords(d, 'transactions', [
      pay({ date: '2026-09-20', amount: 100, member: DMM.anna, counterparty: 'Anna przelew wrzesień', kind: 'repay', advance: false }),
      pay({ date: '2026-10-05', amount: 30, member: DMM.anna, counterparty: 'Anna przelew październik', kind: 'repay', advance: false }),
      buy({ date: '2026-10-15', amount: 80, member: DMM.anna, counterparty: 'Apteka Anny' })
    ])
  })
  try {
    const sep0 = await raport(page, '2026-09')
    const oct0 = await raport(page, '2026-10')
    const m0 = await mostek(page)
    const r0 = await radar(page)
    log(run, 'DM.8 przed', m0.domownicy, '|', r0.domownicy, '|', line(sep0, 'Koszty netto'), line(sep0, 'Bilans paliwa'), '|', line(oct0, 'Koszty netto'), line(oct0, 'Bilans paliwa'), line(oct0, 'Sfinansowane'))
    await rd(page, 'DM.8', S, { etap: 'przed', domownicy: m0.domownicy, radar: r0.domownicy, kosztyM2: line(sep0, 'Koszty netto'), paliwoM2: line(sep0, 'Bilans paliwa'), kosztyM1: line(oct0, 'Koszty netto'), paliwoM1: line(oct0, 'Bilans paliwa'), sfinansowaneM1: line(oct0, 'Sfinansowane przez domowników') }, dataDir)

    await openOp(page, 'Apteka Anny')
    const st0 = await page.getByTestId('purchase-repaid').innerText().catch(() => '(brak)')
    await page.getByTestId('purchase-assign').click()
    await page.waitForTimeout(500)
    const opts = (await page.getByTestId('purchase-assign-option').allInnerTexts()).map((x) => x.replace(/\s+/g, ' '))
    log(run, 'DM.8 status przed', st0, '| opcje (kolejność)', opts)
    await snap(page, 'DM.8-lista')
    await page.getByTestId('purchase-assign-option').filter({ hasText: 'wrzesień' }).first().click()
    await page.waitForTimeout(800)
    const st1 = await page.getByTestId('purchase-repaid').innerText().catch(() => '(brak)')
    log(run, 'DM.8 status po', st1.replace(/\s+/g, ' '))
    await snap(page, 'DM.8-oddane')
    log(run, 'DM.8 pliki', (await txs(dataDir)).filter((t) => t.memberId === DMM.anna).map(brief))
    const sep1 = await raport(page, '2026-09')
    const oct1 = await raport(page, '2026-10')
    const m1 = await mostek(page)
    const r1 = await radar(page)
    log(run, 'DM.8 po', m1.domownicy, '|', r1.domownicy, '|', line(sep1, 'Koszty netto'), line(sep1, 'Bilans paliwa'), '|', line(oct1, 'Koszty netto'), line(oct1, 'Bilans paliwa'), line(oct1, 'Sfinansowane'))
    await rd(page, 'DM.8', S, { etap: 'po przypisaniu wpłaty z 20.09', status: st1.replace(/\s+/g, ' '), domownicy: m1.domownicy, radar: r1.domownicy, kosztyM2: line(sep1, 'Koszty netto'), paliwoM2: line(sep1, 'Bilans paliwa'), kosztyM1: line(oct1, 'Koszty netto'), paliwoM1: line(oct1, 'Bilans paliwa'), sfinansowaneM1: line(oct1, 'Sfinansowane przez domowników') }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
