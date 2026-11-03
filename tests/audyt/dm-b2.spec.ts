/**
 * DM.6 again, the transfers dated today (after every purchase of Anna): state „rok+dm-b2” = „rok+dm-b” with DM.3 done
 * (Anna's transfer 80,00 zł 30.10.2026 „Anna przelew 80” naming „Apteka Anny”) – Anna owes 170,00 zł (50 + 120).
 */
import { test, type Page } from '@playwright/test'
import { DMM, addRecords, buy, pay, editorText, fill, log, members, mostek, newOp, payer, przychody, radar, raport, rd, runRok, snap, line, txs, brief, fixedId } from './dm-pomoc'

const S = 'rok+dm-b2'

async function readAll(page: Page) {
  const m = await mostek(page)
  const r = await radar(page)
  const inc = await przychody(page)
  const nov = await raport(page, '2026-11')
  await page.keyboard.press('Control+1')
  await page.waitForTimeout(500)
  let delivery = '(brak)'
  if (await page.getByTestId('state-delivery-why').count()) {
    const label = await page.getByTestId('state-delivery-why').innerText()
    await page.getByTestId('state-delivery-why').click()
    await page.waitForTimeout(300)
    delivery = `${label}: ${(await page.getByTestId('state-delivery-lines').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')}`
    await page.getByTestId('state-delivery-why').click()
  }
  return { m, r, inc, nov, delivery }
}

async function memberIncome(page: Page, amount: string, name: string) {
  await newOp(page, 'Wpływ')
  await fill(page, { amount, counterparty: name })
  await payer(page, DMM.anna)
  await page.waitForTimeout(600)
}

test('DM.6 – wpłaty z dziś', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-b2'
  const APTEKA = fixedId(201)
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [{ id: DMM.anna, name: 'Anna', inflow: 'advance' }])
    addRecords(d, 'transactions', [
      buy({ date: '2026-09-15', amount: 50, member: DMM.anna, counterparty: 'Piekarnia Anny' }),
      buy({ id: APTEKA, date: '2026-10-15', amount: 80, member: DMM.anna, counterparty: 'Apteka Anny' }),
      buy({ date: '2026-11-02', amount: 120, member: DMM.anna, counterparty: 'Drogeria Anny' }),
      pay({ date: '2026-10-30', amount: 80, member: DMM.anna, counterparty: 'Anna przelew 80', kind: 'repay', advance: true, covers: [APTEKA] })
    ])
  })
  try {
    const a0 = await readAll(page)
    log(run, 'DM.6b przed', a0.m.domownicy, '|', a0.m.depozyt, '|', a0.m.oslony, '|', a0.m.kadlub, '|', line(a0.nov, 'Bilans paliwa'), '|', a0.delivery)
    await rd(page, 'DM.6', S, { etap: 'przed (wpłaty z dziś)', mostekDomownicy: a0.m.domownicy, radarDomownicy: a0.r.domownicy, depozyt: a0.m.depozyt, oslony: a0.m.oslony, kadlub: a0.m.kadlub, bilansPaliwaM0: line(a0.nov, 'Bilans paliwa'), przychody: a0.inc }, dataDir)

    await memberIncome(page, '200', 'Anna przelew 200')
    await page.locator('[role="radiogroup"][aria-label="Cel wpłaty domownika"]').getByRole('radio', { name: 'niezależny przychód' }).click()
    await page.waitForTimeout(700)
    log(run, 'DM.6b 200 edytor', await editorText(page))
    await snap(page, 'DM.6-dzis-niezalezny')
    const a1 = await readAll(page)
    log(run, 'DM.6b po 200', a1.m.domownicy, '|', a1.m.depozyt, '|', a1.m.oslony, '|', a1.m.kadlub, '|', line(a1.nov, 'Bilans paliwa'), '|', a1.delivery)
    await rd(page, 'DM.6', S, { etap: 'po 200 zł „niezależny przychód” (dziś)', mostekDomownicy: a1.m.domownicy, radarDomownicy: a1.r.domownicy, depozyt: a1.m.depozyt, oslony: a1.m.oslony, kadlub: a1.m.kadlub, bilansPaliwaM0: line(a1.nov, 'Bilans paliwa'), dostawa: a1.delivery }, dataDir)

    await memberIncome(page, '100', 'Anna przelew 100')
    await page.locator('[role="radiogroup"][aria-label="Cel wpłaty domownika"]').getByRole('radio', { name: 'depozyt na przyszłość' }).click()
    await page.waitForTimeout(700)
    log(run, 'DM.6b 100 edytor', await editorText(page))
    await snap(page, 'DM.6-dzis-depozyt')
    const a2 = await readAll(page)
    log(run, 'DM.6b po 100', a2.m.domownicy, '|', a2.m.depozyt, '|', a2.m.oslony, '|', line(a2.nov, 'Bilans paliwa'))
    await rd(page, 'DM.6', S, { etap: 'po 100 zł „depozyt na przyszłość” (dziś)', mostekDomownicy: a2.m.domownicy, radarDomownicy: a2.r.domownicy, depozyt: a2.m.depozyt, oslony: a2.m.oslony, bilansPaliwaM0: line(a2.nov, 'Bilans paliwa') }, dataDir)

    await memberIncome(page, '50', 'Anna przelew 50')
    log(run, 'DM.6b 50 edytor', await editorText(page))
    await snap(page, 'DM.6-dzis-splata')
    const a3 = await readAll(page)
    log(run, 'DM.6b po 50', a3.m.domownicy, '|', a3.r.domownicy, '|', a3.m.depozyt, '|', a3.m.oslony, '|', line(a3.nov, 'Bilans paliwa'))
    await rd(page, 'DM.6', S, { etap: 'po 50 zł „spłata zakupów” (dziś)', mostekDomownicy: a3.m.domownicy, radarDomownicy: a3.r.domownicy, depozyt: a3.m.depozyt, oslony: a3.m.oslony, bilansPaliwaM0: line(a3.nov, 'Bilans paliwa') }, dataDir)
    log(run, 'DM.6b pliki', (await txs(dataDir)).filter((t) => t.memberId === DMM.anna && t.kind === 'income').map(brief))
    void app
  } finally {
    await app.close()
  }
})
