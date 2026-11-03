/**
 * DM.13 – the opening debt in a transfer of several members (N-PC-12). State „rok+dm-k”: the persona's Anna renamed
 * „A. Testowa”; „Babcia” (reszta: pytaj, przekazuje przez: Tata) with her opening balance „ma oddać 300,00 zł” (no
 * operation; settlements from the budget's start); „Tata” (reszta: zaliczka) owes nothing.
 */
import { test } from '@playwright/test'
import { DMM, editorText, fill, log, members, mostek, newOp, payer, radar, rd, runRok, snap, txs, brief, typeIn } from './dm-pomoc'

const S = 'rok+dm-k'

test('DM.13', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-k'
  const { page, app, dataDir } = await runRok(run, (d) =>
    members(d, [
      { id: DMM.tata, name: 'Tata', inflow: 'advance' },
      { id: DMM.babcia, name: 'Babcia', inflow: 'ask', via: DMM.tata, owed: 30000 }
    ])
  )
  try {
    const m0 = await mostek(page)
    const r0 = await radar(page)
    log(run, 'DM.13 przed', m0.domownicy, '|', m0.depozyt, '|', m0.oslony, '|', r0.domownicy)
    await rd(page, 'DM.13', S, { etap: 'przed', domownicy: m0.domownicy, depozyt: m0.depozyt, oslony: m0.oslony, radar: r0.domownicy }, dataDir)

    await newOp(page, 'Wpływ')
    await fill(page, { amount: '300', counterparty: 'Tata przelew 300' })
    await payer(page, DMM.tata)
    await page.waitForTimeout(600)
    const also = await page.getByTestId('operation-also-for').allInnerTexts()
    log(run, 'DM.13 przycisk', also)
    // the part of Babcia 300 zł: „+ także za Babcia” (or „podziel na osoby”)
    if (also.length) await page.getByTestId('operation-also-for').first().click()
    else {
      await page.getByTestId('operation-income-split').click()
      await page.getByTestId('income-split-member').first().selectOption(DMM.babcia)
    }
    await page.waitForTimeout(500)
    const amt = await page.getByTestId('income-split-amount').first().inputValue()
    if (amt !== '300,00') await typeIn(page, page.getByTestId('income-split-amount').first(), '300')
    await page.waitForTimeout(700)
    log(run, 'DM.13 po części', await editorText(page))
    const babcia = page.locator('[data-testid="repayment-member"][data-member="Babcia"]')
    log(run, 'DM.13 Za co oddaje Babcia', await babcia.innerText().catch(() => '(brak)'))
    const opening = babcia.locator('label', { hasText: 'saldo na start rozliczeń' }).getByTestId('operation-cover')
    if ((await opening.count()) && !(await opening.isChecked())) {
      await opening.check()
      await page.waitForTimeout(700)
    }
    log(run, 'DM.13 po wskazaniu', await editorText(page))
    await snap(page, 'DM.13-edytor')
    log(run, 'DM.13 plik', (await txs(dataDir)).filter((t) => t.counterparty === 'Tata przelew 300').map(brief))
    const m1 = await mostek(page)
    const r1 = await radar(page)
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(600)
    await snap(page, 'DM.13-radar')
    log(run, 'DM.13 po', m1.domownicy, '|', m1.depozyt, '|', m1.oslony, '|', r1.domownicy)
    await rd(page, 'DM.13', S, { etap: 'po wpłacie 300 zł od Taty z częścią Babci 300 zł → saldo na start', domownicy: m1.domownicy, depozyt: m1.depozyt, oslony: m1.oslony, radar: r1.domownicy }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
