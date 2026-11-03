/**
 * DM.4 (a transfer with no sure match – „zwrot do przypisania”, pointed at in Meldunki). State „rok+dm-c” = „rok+dm-b”
 * (Anna's purchases 50,00 15.09 „Piekarnia Anny”, 80,00 15.10 „Apteka Anny”, 120,00 02.11 „Drogeria Anny”) plus her
 * old settlement before „Zwrot spłaca wskazany zakup od:” (04.09.2026): purchases 40,00 zł 05.08.2026 „Sklep Anny A”
 * and 30,00 zł 10.08.2026 „Sklep Anny B”, her transfer 30,00 zł 20.08.2026 „Anna zwrot sierpień” naming nothing.
 */
import { test, type Page } from '@playwright/test'
import { DMM, addRecords, buy, pay, editorText, fill, log, members, meldunki, mostek, newOp, payer, radar, rd, runRok, snap, txs, brief, openOp } from './dm-pomoc'

const S = 'rok+dm-c'

async function status(page: Page, q: string): Promise<string> {
  await openOp(page, q)
  return (await page.getByTestId('purchase-repaid').allInnerTexts().catch(() => [])).join(' ').replace(/\s+/g, ' ') || '(brak statusu)'
}

test('DM.4', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-c'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [{ id: DMM.anna, name: 'Anna', inflow: 'advance' }])
    addRecords(d, 'transactions', [
      buy({ date: '2026-08-05', amount: 40, member: DMM.anna, counterparty: 'Sklep Anny A' }),
      buy({ date: '2026-08-10', amount: 30, member: DMM.anna, counterparty: 'Sklep Anny B' }),
      pay({ date: '2026-08-20', amount: 30, member: DMM.anna, counterparty: 'Anna zwrot sierpień', kind: 'repay', advance: false }),
      buy({ date: '2026-09-15', amount: 50, member: DMM.anna, counterparty: 'Piekarnia Anny' }),
      buy({ date: '2026-10-15', amount: 80, member: DMM.anna, counterparty: 'Apteka Anny' }),
      buy({ date: '2026-11-02', amount: 120, member: DMM.anna, counterparty: 'Drogeria Anny' })
    ])
  })
  try {
    const old0 = [await status(page, 'Sklep Anny A'), await status(page, 'Sklep Anny B')]
    log(run, 'DM.4 dawne przed', old0)
    const m0 = await mostek(page)
    const r0 = await radar(page)
    log(run, 'DM.4 przed', m0.domownicy, '|', r0.domownicy, '|', m0.oslony)
    await rd(page, 'DM.4', S, { etap: 'przed', mostekDomownicy: m0.domownicy, radarDomownicy: r0.domownicy, oslony: m0.oslony, dawneA: old0[0]!, dawneB: old0[1]! }, dataDir)

    await newOp(page, 'Wpływ')
    await fill(page, { amount: '100', counterparty: 'Anna przelew 100' })
    await payer(page, DMM.anna)
    await page.waitForTimeout(700)
    log(run, 'DM.4 edytor', await editorText(page))
    await snap(page, 'DM.4-edytor')
    const m1 = await mostek(page)
    const r1 = await radar(page)
    const unassigned = await page.getByTestId('radar-member-unassigned').allInnerTexts().catch(() => [])
    await snap(page, 'DM.4-radar')
    const statuses1 = [await status(page, 'Piekarnia Anny'), await status(page, 'Apteka Anny'), await status(page, 'Drogeria Anny')]
    const inbox1 = await meldunki(page, 'repayments')
    await snap(page, 'DM.4-meldunki')
    log(run, 'DM.4 po wpłacie', m1.domownicy, '|', r1.domownicy, '|', unassigned, '|', m1.oslony, '|', statuses1, '|', inbox1)
    await rd(page, 'DM.4', S, { etap: 'po wpłacie 100 zł (przed wskazaniem)', mostekDomownicy: m1.domownicy, radarDomownicy: r1.domownicy, radarDoPrzypisania: unassigned.join(' '), oslony: m1.oslony, statusy: statuses1.join(' || '), meldunki: inbox1.join(' || ') }, dataDir)

    // Meldunki → „Zwroty do przypisania” → the transfer → 50 + 120 (a part)
    await page.locator('[data-testid="inbox-item"][data-kind="repayments"]').first().getByTestId('inbox-open').click()
    await page.getByTestId('operation-editor').waitFor()
    await page.waitForTimeout(700)
    log(run, 'DM.4 edytor z Meldunków', await editorText(page))
    const anna = page.locator('[data-testid="repayment-member"][data-member="Anna"]')
    for (const name of ['Piekarnia Anny', 'Drogeria Anny']) {
      await anna.locator('label', { hasText: name }).getByTestId('operation-cover').check()
      await page.waitForTimeout(600)
    }
    log(run, 'DM.4 po wskazaniu', await editorText(page))
    await snap(page, 'DM.4-wskazanie')
    log(run, 'DM.4 plik', (await txs(dataDir)).filter((t) => t.counterparty === 'Anna przelew 100').map(brief))
    const m2 = await mostek(page)
    const r2 = await radar(page)
    const statuses2 = [await status(page, 'Piekarnia Anny'), await status(page, 'Apteka Anny'), await status(page, 'Drogeria Anny')]
    const old2 = [await status(page, 'Sklep Anny A'), await status(page, 'Sklep Anny B')]
    const inbox2 = await meldunki(page, 'repayments')
    log(run, 'DM.4 po', m2.domownicy, '|', r2.domownicy, '|', m2.oslony, '|', statuses2, '|', old2, '|', inbox2)
    await rd(page, 'DM.4', S, { etap: 'po wskazaniu 50 + 120 w Meldunkach', mostekDomownicy: m2.domownicy, radarDomownicy: r2.domownicy, oslony: m2.oslony, statusy: statuses2.join(' || '), dawneA: old2[0]!, dawneB: old2[1]!, meldunki: inbox2.join(' || ') }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
