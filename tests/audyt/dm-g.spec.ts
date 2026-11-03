/**
 * DM.9 – a member without a bank account through another member: „+ także za X”. State „rok+dm-g” (two fresh runs on
 * it): the persona's Anna renamed „A. Testowa”; „Tata” (reszta: zaliczka) owes 100,00 zł – „Sklep Taty” 21.10.2026;
 * „Babcia” (reszta: pytaj, „Pieniądze przekazuje przez: Tata”) owes 150,00 zł – „Apteka Babci” 25.09.2026 – and buys
 * once more after the transfer: 50,00 zł „Kwiaciarnia Babci” 01.11.2026 (her debt today 200,00 zł, before the
 * transfer of 28.10.2026 – 150,00 zł). mBank.
 */
import { test, type Page } from '@playwright/test'
import { DMM, addRecords, buy, editorText, fill, log, members, mostek, newOp, odprawa, payer, radar, rd, runRok, snap, txs, brief, quick } from './dm-pomoc'

const S = 'rok+dm-g'

function prepare(d: string): void {
  members(d, [
    { id: DMM.tata, name: 'Tata', inflow: 'advance' },
    { id: DMM.babcia, name: 'Babcia', inflow: 'ask', via: DMM.tata }
  ])
  addRecords(d, 'transactions', [
    buy({ date: '2026-09-25', amount: 150, member: DMM.babcia, counterparty: 'Apteka Babci' }),
    buy({ date: '2026-10-21', amount: 100, member: DMM.tata, counterparty: 'Sklep Taty' }),
    buy({ date: '2026-11-01', amount: 50, member: DMM.babcia, counterparty: 'Kwiaciarnia Babci' })
  ])
}

async function readAll(page: Page) {
  const m = await mostek(page)
  const r = await radar(page)
  const o = (await odprawa(page)).filter((x) => /Babcia|Tata/.test(x))
  return { m, r, o }
}

test('DM.9 z kliknięciem „+ także za”', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-g1'
  const { page, app, dataDir } = await runRok(run, prepare)
  try {
    const a0 = await readAll(page)
    log(run, 'DM.9 przed', a0.m.domownicy, '|', a0.m.depozyt, '|', a0.r.domownicy, '|', a0.o)
    await rd(page, 'DM.9', S, { etap: 'przed (przebieg z kliknięciem)', domownicy: a0.m.domownicy, depozyt: a0.m.depozyt, oslony: a0.m.oslony, radar: a0.r.domownicy, odprawa: a0.o.join(' || ') }, dataDir)
    await newOp(page, 'Wpływ')
    await fill(page, { amount: '250', date: '28.10.2026', counterparty: 'Tata przelew 250' })
    await payer(page, DMM.tata)
    await page.waitForTimeout(600)
    const also = await page.getByTestId('operation-also-for').allInnerTexts()
    log(run, 'DM.9 przycisk', also, '| edytor', await editorText(page))
    await snap(page, 'DM.9-przycisk')
    await page.getByTestId('operation-also-for').first().click()
    await page.waitForTimeout(800)
    log(run, 'DM.9 po kliknięciu', await editorText(page))
    await snap(page, 'DM.9-po-kliknieciu')
    log(run, 'DM.9 plik', (await txs(dataDir)).filter((t) => t.counterparty === 'Tata przelew 250').map(brief))
    const a1 = await readAll(page)
    log(run, 'DM.9 po', a1.m.domownicy, '|', a1.m.depozyt, '|', a1.r.domownicy, '|', a1.o)
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(700)
    await snap(page, 'DM.9-radar')
    await rd(page, 'DM.9', S, { etap: 'po wpłacie 250 zł z „+ także za Babcia”', domownicy: a1.m.domownicy, depozyt: a1.m.depozyt, oslony: a1.m.oslony, radar: a1.r.domownicy, odprawa: a1.o.join(' || '), przycisk: also.join(' ') }, dataDir)
    void app
  } finally {
    await app.close()
  }
})

test('DM.9 bez kliknięcia i „W tym za” w szybkim wpisie', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'dm-g2'
  const { page, app, dataDir } = await runRok(run, prepare)
  try {
    await newOp(page, 'Wpływ')
    await fill(page, { amount: '250', date: '28.10.2026', counterparty: 'Tata przelew 250' })
    await payer(page, DMM.tata)
    await page.waitForTimeout(800)
    log(run, 'DM.9b edytor bez kliknięcia', await editorText(page))
    await snap(page, 'DM.9-bez-klikniecia')
    log(run, 'DM.9b plik', (await txs(dataDir)).filter((t) => t.counterparty === 'Tata przelew 250').map(brief))
    const a1 = await readAll(page)
    log(run, 'DM.9b po', a1.m.domownicy, '|', a1.m.depozyt, '|', a1.r.domownicy, '|', a1.o)
    await rd(page, 'DM.9', S, { etap: 'po wpłacie 250 zł bez kliknięcia (drugi przebieg)', domownicy: a1.m.domownicy, depozyt: a1.m.depozyt, oslony: a1.m.oslony, radar: a1.r.domownicy, odprawa: a1.o.join(' || ') }, dataDir)

    const q = await quick(app, page)
    await q.locator('[role="radiogroup"][aria-label="Rodzaj"]').getByRole('radio', { name: 'Wpływ' }).click()
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('150')
    await q.getByTestId('quick-amount').press('Tab')
    await q.getByTestId('quick-payer').selectOption(DMM.tata)
    await q.waitForTimeout(400)
    log(run, 'DM.9b szybki wiersz', (await q.locator('[data-testid="quick-entry"]').innerText()).replace(/\s+/g, ' ').slice(0, 700), '| pole', await q.getByTestId('quick-share').inputValue().catch(() => '(brak)'))
    await q.getByTestId('quick-share').click()
    await q.getByTestId('quick-share').fill('150')
    await q.getByTestId('quick-share').press('Tab')
    await q.waitForTimeout(400)
    log(run, 'DM.9b szybki podgląd', await q.getByTestId('quick-preview').innerText().catch(() => '(brak)'))
    await snap(q, 'DM.9-szybki')
    await q.getByTestId('quick-share').press('Enter')
    await page.waitForTimeout(1500)
    log(run, 'DM.9b pliki', (await txs(dataDir)).filter((t) => t.memberId === DMM.tata).map(brief))
    const a2 = await readAll(page)
    log(run, 'DM.9b po szybkim', a2.m.domownicy, '|', a2.m.depozyt, '|', a2.r.domownicy, '|', a2.o)
    await rd(page, 'DM.9', S, { etap: 'po szybkim wpisie 150 zł od Taty „W tym za Babcia” 150', domownicy: a2.m.domownicy, depozyt: a2.m.depozyt, oslony: a2.m.oslony, radar: a2.r.domownicy, odprawa: a2.o.join(' || ') }, dataDir)
  } finally {
    await app.close()
  }
})
