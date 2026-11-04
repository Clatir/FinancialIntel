/**
 * DM.5 – the rest of a member's transfer: income or advance, asked once. State „rok+dm-d”: the persona's Anna renamed
 * „A. Testowa”; „Tata” (reszta: pytaj) owes 100,00 zł – „Sklep Taty” 20.10.2026 (mBank); „Babcia” (reszta: pytaj, no
 * debt) for the quick entry. Transfers typed dated 28.10, 29.10, 30.10, 31.10.2026 (in this order – the engine's order).
 */
import { test, type Page } from '@playwright/test'
import { DMM, addRecords, buy, editorText, fill, log, members, mostek, newOp, payer, przychody, radar, raport, rd, runRok, snap, txs, brief, ustawieniaDomownicy, quick, line } from './dm-pomoc'

const S = 'rok+dm-d'

async function readAll(page: Page) {
  const m = await mostek(page)
  const inc = await przychody(page)
  const oct = await raport(page, '2026-10')
  const u = await ustawieniaDomownicy(page)
  return { m, inc, oct, u }
}

async function tata(page: Page, amount: string, date: string, name: string) {
  await newOp(page, 'Wpływ')
  await fill(page, { amount, date, counterparty: name })
  await payer(page, DMM.tata)
  await page.waitForTimeout(600)
}

const rest = (page: Page) => page.locator('[data-testid="operation-member-income"] [role="radiogroup"][aria-label="Reszta wpłaty domownika"]')

test('DM.5', async () => {
  test.setTimeout(25 * 60_000)
  const run = 'dm-d'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [
      { id: DMM.tata, name: 'Tata', inflow: 'ask' },
      { id: DMM.babcia, name: 'Babcia', inflow: 'ask' }
    ])
    addRecords(d, 'transactions', [buy({ date: '2026-10-20', amount: 100, member: DMM.tata, counterparty: 'Sklep Taty' })])
  })
  try {
    const a0 = await readAll(page)
    log(run, 'DM.5 przed', a0.m.domownicy, '|', a0.m.depozyt, '|', a0.m.oslony, '|', a0.inc, '|', line(a0.oct, 'Bilans paliwa'), '|', a0.u.osoby)
    await rd(page, 'DM.5', S, { etap: 'przed', domownicy: a0.m.domownicy, depozyt: a0.m.depozyt, oslony: a0.m.oslony, przychody: a0.inc, bilansPaliwaM1: line(a0.oct, 'Bilans paliwa'), ustawienia: a0.u.osoby }, dataDir)

    // 1) 300 zł – the choice „zaliczka”
    await tata(page, '300', '28.10.2026', 'Tata przelew 300')
    log(run, 'DM.5 1 edytor przed wyborem', await editorText(page), '| zaznaczone', await rest(page).locator('[aria-checked="true"]').innerText().catch(() => '?'))
    await snap(page, 'DM.5-pytanie')
    await rest(page).getByRole('radio', { name: 'zaliczka' }).click()
    await page.waitForTimeout(700)
    log(run, 'DM.5 1 edytor po wyborze', await editorText(page))
    await snap(page, 'DM.5-zaliczka')
    const a1 = await readAll(page)
    log(run, 'DM.5 po 1', a1.m.domownicy, '|', a1.m.depozyt, '|', a1.m.oslony, '|', a1.inc, '|', line(a1.oct, 'Bilans paliwa'), '|', a1.u.osoby)
    await rd(page, 'DM.5', S, { etap: 'po 1. wpłacie 300 zł (28.10) – wybór „zaliczka”', domownicy: a1.m.domownicy, depozyt: a1.m.depozyt, oslony: a1.m.oslony, przychody: a1.inc, bilansPaliwaM1: line(a1.oct, 'Bilans paliwa'), ustawienia: a1.u.osoby }, dataDir)

    // 2) 150 zł, no debt – does it ask?
    await tata(page, '150', '29.10.2026', 'Tata przelew 150')
    log(run, 'DM.5 2 edytor', await editorText(page), '| zaznaczone', await rest(page).locator('[aria-checked="true"]').innerText().catch(() => '?'))
    await snap(page, 'DM.5-druga')
    const a2 = await readAll(page)
    log(run, 'DM.5 po 2', a2.m.domownicy, '|', a2.m.depozyt, '|', a2.m.oslony, '|', a2.inc, '|', a2.u.osoby)
    await rd(page, 'DM.5', S, { etap: 'po 2. wpłacie 150 zł (29.10) bez wyboru', domownicy: a2.m.domownicy, depozyt: a2.m.depozyt, oslony: a2.m.oslony, przychody: a2.inc, bilansPaliwaM1: line(a2.oct, 'Bilans paliwa'), ustawienia: a2.u.osoby }, dataDir)

    // 3) Ustawienia → Tata „przychód”; 120 zł
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-household').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="member-row"][data-name="Tata"] [role="radiogroup"][aria-label="Reszta wpłaty domownika"]').getByRole('radio', { name: 'przychód' }).click()
    await page.waitForTimeout(800)
    await tata(page, '120', '30.10.2026', 'Tata przelew 120')
    log(run, 'DM.5 3 edytor', await editorText(page), '| zaznaczone', await rest(page).locator('[aria-checked="true"]').innerText().catch(() => '?'))
    await snap(page, 'DM.5-przychod')
    const a3 = await readAll(page)
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(600)
    let delivery = '(brak)'
    if (await page.getByTestId('state-delivery-why').count()) {
      const label = await page.getByTestId('state-delivery-why').innerText()
      await page.getByTestId('state-delivery-why').click()
      await page.waitForTimeout(400)
      delivery = `${label}: ${(await page.getByTestId('state-delivery-lines').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')}`
    }
    log(run, 'DM.5 po 3', a3.m.domownicy, '|', a3.m.depozyt, '|', a3.m.oslony, '|', a3.m.kadlub, '|', a3.inc, '|', line(a3.oct, 'Bilans paliwa'), '|', a3.u.osoby, '|', delivery)
    await rd(page, 'DM.5', S, { etap: 'po 3. wpłacie 120 zł (30.10) przy ustawieniu „przychód”', domownicy: a3.m.domownicy, depozyt: a3.m.depozyt, oslony: a3.m.oslony, kadlub: a3.m.kadlub, przychody: a3.inc, bilansPaliwaM1: line(a3.oct, 'Bilans paliwa'), ustawienia: a3.u.osoby, dostawa: delivery }, dataDir)

    // 4) a single transfer other than the setting: 60 zł as „zaliczka”
    await tata(page, '60', '31.10.2026', 'Tata przelew 60')
    await rest(page).getByRole('radio', { name: 'zaliczka' }).click()
    await page.waitForTimeout(700)
    log(run, 'DM.5 4 edytor', await editorText(page))
    const a4 = await readAll(page)
    log(run, 'DM.5 po 4', a4.m.domownicy, '|', a4.m.depozyt, '|', a4.u.osoby)
    await rd(page, 'DM.5', S, { etap: 'po 4. wpłacie 60 zł (31.10) „zaliczka” przy ustawieniu „przychód”', domownicy: a4.m.domownicy, depozyt: a4.m.depozyt, oslony: a4.m.oslony, przychody: a4.inc, bilansPaliwaM1: line(a4.oct, 'Bilans paliwa'), ustawienia: a4.u.osoby }, dataDir)

    // 5) the quick entry: money from Babcia („pytaj”) with no choice
    const q = await quick(app, page)
    await q.locator('[role="radiogroup"][aria-label="Rodzaj"]').getByRole('radio', { name: 'Wpływ' }).click()
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('40')
    await q.getByTestId('quick-amount').press('Tab')
    await q.getByTestId('quick-payer').selectOption(DMM.babcia)
    await q.waitForTimeout(400)
    log(run, 'DM.5 szybki', (await q.locator('[data-testid="quick-entry"]').innerText()).replace(/\s+/g, ' ').slice(0, 900))
    await snap(q, 'DM.5-szybki')
    await q.getByTestId('quick-payer').press('Enter')
    await page.waitForTimeout(1500)
    const u5 = await ustawieniaDomownicy(page)
    log(run, 'DM.5 po szybkim', u5.osoby)
    log(run, 'DM.5 pliki', (await txs(dataDir)).filter((t) => t.memberId === DMM.tata || t.memberId === DMM.babcia).map(brief))
    await snap(page, 'DM.5-ustawienia')
    void radar
  } finally {
    await app.close()
  }
})
