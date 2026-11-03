/**
 * DM.3 (a transfer pays the purchase it surely matches) and DM.6 (an independent transfer: „niezależny przychód”,
 * „depozyt na przyszłość”, „spłata zakupów”). State „rok+dm-b”: the persona's Anna renamed „A. Testowa”; a clean „Anna”
 * (reszta: zaliczka) with three purchases she finances – 50,00 zł 15.09.2026 „Piekarnia Anny”, 80,00 zł 15.10.2026
 * „Apteka Anny”, 120,00 zł 02.11.2026 „Drogeria Anny” (mBank, Jedzenie · zakupy spożywcze); „Zwrot spłaca wskazany zakup
 * od:” 04.09.2026 (the persona's) – before them. The transfers are typed dated 30.10.2026 (a closed month: the panel
 * „Przychody” and the October report can show them as income).
 */
import { test, type Page } from '@playwright/test'
import { DMM, addRecords, buy, editorText, fill, log, members, mostek, newOp, payer, przychody, radar, raport, rd, runRok, snap, line, txs, brief, rowsOf, goOps } from './dm-pomoc'

const S = 'rok+dm-b'

async function readAll(page: Page) {
  const m = await mostek(page)
  const r = await radar(page)
  const inc = await przychody(page)
  const oct = await raport(page, '2026-10')
  return { m, r, inc, oct }
}

async function memberIncome(page: Page, amount: string, name: string) {
  await newOp(page, 'Wpływ')
  await fill(page, { amount, date: '30.10.2026', counterparty: name })
  await payer(page, DMM.anna)
  await page.waitForTimeout(600)
}

test('DM.3 i DM.6', async () => {
  test.setTimeout(25 * 60_000)
  const run = 'dm-b'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [{ id: DMM.anna, name: 'Anna', inflow: 'advance' }])
    addRecords(d, 'transactions', [
      buy({ date: '2026-09-15', amount: 50, member: DMM.anna, counterparty: 'Piekarnia Anny' }),
      buy({ date: '2026-10-15', amount: 80, member: DMM.anna, counterparty: 'Apteka Anny' }),
      buy({ date: '2026-11-02', amount: 120, member: DMM.anna, counterparty: 'Drogeria Anny' })
    ])
  })
  try {
    // ---------------- DM.3
    const a0 = await readAll(page)
    log(run, 'DM.3 przed', a0.m.domownicy, '|', a0.r.domownicy, '|', a0.m.oslony, '|', a0.inc, '|', line(a0.oct, 'Bilans paliwa'))
    await rd(page, 'DM.3', S, { etap: 'przed', mostekDomownicy: a0.m.domownicy, radarDomownicy: a0.r.domownicy, oslony: a0.m.oslony, przychody: a0.inc, bilansPaliwaM1: line(a0.oct, 'Bilans paliwa'), kosztyNettoM1: line(a0.oct, 'Koszty netto') }, dataDir)
    await memberIncome(page, '80', 'Anna przelew 80')
    log(run, 'DM.3 edytor po wyborze Anny', await editorText(page))
    const offers = await page.getByTestId('repayment-offer').allInnerTexts()
    log(run, 'DM.3 oferty', offers, '| wynik', await page.getByTestId('repayment-result').allInnerTexts())
    const pasuje = page.getByTestId('repayment-offer').filter({ hasText: 'Pasuje' })
    if (await pasuje.count()) {
      await pasuje.first().click()
      await page.waitForTimeout(600)
      log(run, 'DM.3 kliknięte Pasuje', await editorText(page))
    }
    await snap(page, 'DM.3-edytor')
    log(run, 'DM.3 plik', (await txs(dataDir)).filter((t) => t.counterparty === 'Anna przelew 80').map(brief))
    const rows = await rowsOf(page, 'Anny')
    log(run, 'DM.3 lista', rows)
    await page.getByTestId('operations-marks').click()
    await page.getByTestId('operations-marks-repaid').check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    log(run, 'DM.3 filtr oddane', (await page.getByTestId('operation-row').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')))
    await page.getByTestId('operations-marks').click()
    await page.getByTestId('operations-marks-repaid').uncheck()
    await page.getByTestId('operations-marks-owed').check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    log(run, 'DM.3 filtr do oddania', (await page.getByTestId('operation-row').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')))
    await snap(page, 'DM.3-lista')
    await page.getByTestId('operations-marks').click()
    await page.getByTestId('operations-marks-owed').uncheck()
    await page.keyboard.press('Escape')
    const a1 = await readAll(page)
    log(run, 'DM.3 po', a1.m.domownicy, '|', a1.r.domownicy, '|', a1.m.oslony, '|', a1.inc, '|', line(a1.oct, 'Bilans paliwa'))
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(700)
    await snap(page, 'DM.3-radar')
    await rd(page, 'DM.3', S, { etap: 'po wpłacie 80 zł (30.10)', mostekDomownicy: a1.m.domownicy, radarDomownicy: a1.r.domownicy, oslony: a1.m.oslony, przychody: a1.inc, bilansPaliwaM1: line(a1.oct, 'Bilans paliwa'), kosztyNettoM1: line(a1.oct, 'Koszty netto') }, dataDir)

    // ---------------- DM.6 (Anna ma oddać 170)
    await memberIncome(page, '200', 'Anna przelew 200')
    await page.locator('[role="radiogroup"][aria-label="Cel wpłaty domownika"]').getByRole('radio', { name: 'niezależny przychód' }).click()
    await page.waitForTimeout(700)
    log(run, 'DM.6 200 edytor', await editorText(page))
    await snap(page, 'DM.6-niezalezny')
    const b1 = await readAll(page)
    log(run, 'DM.6 po 200', b1.m.domownicy, '|', b1.m.depozyt, '|', b1.m.oslony, '|', b1.inc, '|', line(b1.oct, 'Bilans paliwa'))
    await rd(page, 'DM.6', S, { etap: 'po 200 zł „niezależny przychód” (30.10)', mostekDomownicy: b1.m.domownicy, radarDomownicy: b1.r.domownicy, depozyt: b1.m.depozyt, oslony: b1.m.oslony, kadlub: b1.m.kadlub, przychody: b1.inc, bilansPaliwaM1: line(b1.oct, 'Bilans paliwa') }, dataDir)

    await memberIncome(page, '100', 'Anna przelew 100')
    await page.locator('[role="radiogroup"][aria-label="Cel wpłaty domownika"]').getByRole('radio', { name: 'depozyt na przyszłość' }).click()
    await page.waitForTimeout(700)
    log(run, 'DM.6 100 edytor', await editorText(page))
    await snap(page, 'DM.6-depozyt')
    const b2 = await readAll(page)
    log(run, 'DM.6 po 100', b2.m.domownicy, '|', b2.m.depozyt, '|', b2.m.oslony, '|', b2.inc, '|', line(b2.oct, 'Bilans paliwa'))
    await rd(page, 'DM.6', S, { etap: 'po 100 zł „depozyt na przyszłość” (30.10)', mostekDomownicy: b2.m.domownicy, radarDomownicy: b2.r.domownicy, depozyt: b2.m.depozyt, oslony: b2.m.oslony, przychody: b2.inc, bilansPaliwaM1: line(b2.oct, 'Bilans paliwa') }, dataDir)

    await memberIncome(page, '50', 'Anna przelew 50')
    log(run, 'DM.6 50 edytor (spłata zakupów – domyślnie)', await editorText(page))
    await snap(page, 'DM.6-splata')
    const b3 = await readAll(page)
    log(run, 'DM.6 po 50', b3.m.domownicy, '|', b3.r.domownicy, '|', b3.m.depozyt, '|', b3.m.oslony, '|', b3.inc, '|', line(b3.oct, 'Bilans paliwa'))
    await rd(page, 'DM.6', S, { etap: 'po 50 zł „spłata zakupów” (30.10)', mostekDomownicy: b3.m.domownicy, radarDomownicy: b3.r.domownicy, depozyt: b3.m.depozyt, oslony: b3.m.oslony, przychody: b3.inc, bilansPaliwaM1: line(b3.oct, 'Bilans paliwa') }, dataDir)
    log(run, 'DM.6 pliki', (await txs(dataDir)).filter((t) => t.memberId === DMM.anna).map(brief))

    // the same choices in the parts of a transfer (a draft at the end: 10 zł, a part of Anna's)
    await newOp(page, 'Wpływ')
    await fill(page, { amount: '10', counterparty: 'Szkic części' })
    await page.getByTestId('operation-income-split').click()
    await page.waitForTimeout(400)
    await page.getByTestId('income-split-member').first().selectOption(DMM.anna)
    await page.waitForTimeout(400)
    log(run, 'DM.6 część – opcje', await page.locator('[role="radiogroup"][aria-label="Cel części domownika"]').first().innerText().catch(() => '(brak)'))
    await snap(page, 'DM.6-czesc')
    await goOps(page)
    void app
  } finally {
    await app.close()
  }
})
