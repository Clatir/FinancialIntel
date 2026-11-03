/**
 * DM.14 – a product return of a member's purchase (D91 e). State „rok+dm-l”: the persona's Anna renamed „A. Testowa”;
 * „Anna” (reszta: zaliczka): „SKLEP TESTOWY” 120,00 zł 20.10.2026 not paid back; „SKLEP TESTOWY” 60,00 zł 10.10.2026
 * paid back by her transfer 60,00 zł 12.10.2026 „Anna przelew 60” naming it (mBank, Jedzenie · zakupy spożywcze).
 */
import { test, type Page } from '@playwright/test'
import { CAT, DMM, addRecords, buy, pay, editorText, fill, financer, log, members, mostek, newOp, radar, raport, rd, runRok, snap, txs, brief, line, fixedId, openOp } from './dm-pomoc'

const S = 'rok+dm-l'

async function returnOf(page: Page, amount: string): Promise<void> {
  await newOp(page, 'Wydatek')
  await page.getByTestId('operation-editor').locator('[role="radiogroup"][aria-label="Kierunek"]').getByRole('radio', { name: 'zwrot towaru' }).click()
  await page.waitForTimeout(300)
  await fill(page, { amount, counterparty: 'SKLEP TESTOWY', categoryId: CAT.groceries })
  await financer(page, `pay:${DMM.anna}`)
  await page.waitForTimeout(700)
}

test('DM.14', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-l'
  const P120 = fixedId(301)
  const P60 = fixedId(302)
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [{ id: DMM.anna, name: 'Anna', inflow: 'advance' }])
    addRecords(d, 'transactions', [
      buy({ id: P60, date: '2026-10-10', amount: 60, member: DMM.anna, counterparty: 'SKLEP TESTOWY' }),
      pay({ date: '2026-10-12', amount: 60, member: DMM.anna, counterparty: 'Anna przelew 60', kind: 'repay', advance: true, covers: [P60] }),
      buy({ id: P120, date: '2026-10-20', amount: 120, member: DMM.anna, counterparty: 'SKLEP TESTOWY' })
    ])
  })
  try {
    const m0 = await mostek(page)
    const nov0 = await raport(page, '2026-11')
    log(run, 'DM.14 przed', m0.energiaDzis, '|', m0.domownicy, '|', m0.depozyt, '|', m0.oslony, '|', line(nov0, 'Koszty netto'))
    await rd(page, 'DM.14', S, { etap: 'przed', energiaDzis: m0.energiaDzis, domownicy: m0.domownicy, depozyt: m0.depozyt, oslony: m0.oslony, kosztyNettoM0: line(nov0, 'Koszty netto') }, dataDir)

    await returnOf(page, '40')
    log(run, 'DM.14 edytor zwrotu 40', await editorText(page))
    const offers = page.getByTestId('repayment-offer')
    log(run, 'DM.14 podpowiedzi', await offers.allInnerTexts())
    await snap(page, 'DM.14-podpowiedz')
    const anna = page.locator('[data-testid="repayment-member"][data-member="Anna"]')
    const checked = await anna.getByTestId('operation-cover').evaluateAll((xs) => xs.map((x) => (x as HTMLInputElement).checked))
    if (!checked.some(Boolean)) {
      // point at the purchase of 120 zł (20.10)
      await anna.locator('label', { hasText: '20.10' }).getByTestId('operation-cover').check()
      await page.waitForTimeout(700)
    }
    log(run, 'DM.14 po wskazaniu', await editorText(page))
    await snap(page, 'DM.14-zwrot')
    const m1 = await mostek(page)
    const r1 = await radar(page)
    const nov1 = await raport(page, '2026-11')
    log(run, 'DM.14 po 40', m1.energiaDzis, '|', m1.domownicy, '|', m1.depozyt, '|', m1.oslony, '|', line(nov1, 'Koszty netto'), '|', r1.domownicy)
    await rd(page, 'DM.14', S, { etap: 'po zwrocie towaru 40 zł do zakupu 120 zł', energiaDzis: m1.energiaDzis, domownicy: m1.domownicy, radar: r1.domownicy, depozyt: m1.depozyt, oslony: m1.oslony, kosztyNettoM0: line(nov1, 'Koszty netto') }, dataDir)

    // a return of the purchase already paid back (60 zł of 10.10): 20 zł
    await returnOf(page, '20')
    log(run, 'DM.14 edytor zwrotu 20', await editorText(page))
    const anna2 = page.locator('[data-testid="repayment-member"][data-member="Anna"]')
    const boxes = anna2.getByTestId('operation-cover')
    log(run, 'DM.14 zwrot 20 – zaznaczone', await boxes.evaluateAll((xs) => xs.map((x) => `${(x.closest('label') as HTMLElement | null)?.innerText ?? ''}=${(x as HTMLInputElement).checked}`)))
    for (let i = 0; i < (await boxes.count()); i++) {
      const lab = (await boxes.nth(i).locator('xpath=ancestor::label').innerText()).replace(/\s+/g, ' ')
      const want = lab.includes('10.10')
      if ((await boxes.nth(i).isChecked()) !== want) {
        await boxes.nth(i).setChecked(want)
        await page.waitForTimeout(600)
      }
    }
    log(run, 'DM.14 zwrot 20 po wskazaniu 10.10', await editorText(page))
    await snap(page, 'DM.14-zwrot-oddanego')
    log(run, 'DM.14 pliki', (await txs(dataDir)).filter((t) => t.memberId === DMM.anna).map(brief))
    await openOp(page, 'SKLEP TESTOWY', '−60,00')
    log(run, 'DM.14 zakup 60 status', await page.getByTestId('purchase-repaid').innerText().catch(() => '(brak)'))
    const m2 = await mostek(page)
    const r2 = await radar(page)
    const nov2 = await raport(page, '2026-11')
    log(run, 'DM.14 po 20', m2.energiaDzis, '|', m2.domownicy, '|', m2.depozyt, '|', m2.oslony, '|', line(nov2, 'Koszty netto'), '|', r2.domownicy)
    await rd(page, 'DM.14', S, { etap: 'po zwrocie towaru 20 zł do zakupu oddanego (60 zł)', energiaDzis: m2.energiaDzis, domownicy: m2.domownicy, radar: r2.domownicy, depozyt: m2.depozyt, oslony: m2.oslony, kosztyNettoM0: line(nov2, 'Koszty netto') }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
