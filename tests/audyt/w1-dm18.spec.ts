/**
 * W1 – DM.18 (K): the surplus of a given loan's repayment (interest) goes to the shields like the repayment and is not
 * income (T70: „nadwyżka (odsetki) dokuje jako przychód”). Two runs, window only for the actions:
 *  A – plain „rok”: the persona's „Pożyczka dla Tomka” (given 2 000, 1 000 still owed) → „spłata otrzymana” 1 050,00;
 *      then, as a control, an ordinary inflow 50,00 zł (Wpływ) – how income shows in the same screens;
 *  B – „rok” + a given loan from before the budget's start (10 000 zł, no outflow, file written before the start) →
 *      „spłata otrzymana” 10 500,00: after the 10 000 the shields are over their target, so docking the 500 of interest
 *      (D13: osłony → kadłub → cele) would put it into the hull / goals – the layers show where it went.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState } from './lab'
import { fill, line, mostek, newOp, przychody, radar, raport, typeIn } from './dm-pomoc'
import { logger, recs } from './w1-pomoc'

const row = (page: Page, name: string) => page.locator(`[data-testid="loan-row"][data-name="${name}"]`)

async function readAll(page: Page) {
  const m = await mostek(page)
  const r = await radar(page)
  const inc = await przychody(page)
  const nov = await raport(page, '2026-11')
  return { oslony: m.oslony, kadlub: m.kadlub, stan: m.stan.slice(0, 600), pozyczki: r.pozyczki.slice(0, 500), naleznosci: r.naleznosci, przychodyPanel: inc.slice(0, 500), bilans: line(nov, 'Bilans paliwa'), przychod: line(nov, 'Przych') }
}

async function repay(page: Page, name: string, amount: string) {
  await page.keyboard.press('Control+7')
  await page.waitForTimeout(800)
  await row(page, name).getByTestId('loan-pay-open').click()
  await page.waitForTimeout(300)
  const suggested = await row(page, name).getByTestId('loan-pay-amount').inputValue()
  await typeIn(page, row(page, name).getByTestId('loan-pay-amount'), amount, 'Tab')
  await row(page, name).getByTestId('loan-pay').click()
  await page.waitForTimeout(2000)
  return { suggested, toasts: await page.getByRole('status').allInnerTexts() }
}

test('W1 DM.18 A – Tomek 1 050 (rok) i kontrola: wpływ 50 zł', async () => {
  test.setTimeout(15 * 60_000)
  const RUN = 'w1-dm18a'
  const log = logger(RUN)
  const { dataDir, ictjDir } = useState('rok', RUN)
  const { app, page } = await start(RUN, { dataDir, ictjDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    log('0 przed', await readAll(page))
    log('spłata 1 050 – Tomek', await repay(page, 'Pożyczka dla Tomka', '1050'))
    log('1 po spłacie 1 050', await readAll(page))
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    await shot(page, 'W1-DM.18-radar-tomek')
    log('plik – operacje Tomka', recs(dataDir, 'transactions').filter((t) => /TOMASZ|Tomka/i.test(`${t.counterparty} ${t.note}`) || t.loanId === '01KAZ500000000000000000001').map((t) => `${t.date} ${t.kind} ${t.amount} loan=${t.loanId} inflow=${t.inflowKind ?? '-'}`))
    // control – an ordinary inflow of 50 zł (mBank)
    await newOp(page, 'Wpływ')
    await fill(page, { amount: '50', counterparty: 'W1 kontrola – wpływ 50' })
    await page.waitForTimeout(500)
    log('edytor wpływu 50', (await page.getByTestId('operation-editor').innerText()).replace(/\s+/g, ' ').slice(0, 600))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1500)
    log('2 po zwykłym wpływie 50', await readAll(page))
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(600)
    await shot(page, 'W1-DM.18-debriefing')
  } finally {
    await app.close()
  }
})

test('W1 DM.18 B – pożyczka sprzed startu 10 000, spłata 10 500', async () => {
  test.setTimeout(15 * 60_000)
  const RUN = 'w1-dm18b'
  const log = logger(RUN)
  const { dataDir, ictjDir } = useState('rok', RUN)
  const at = '2026-11-03T08:00:00.000Z'
  const loan = {
    schemaVersion: 1,
    id: '01KW1M00000000000000000001',
    createdAt: at,
    updatedAt: at,
    updatedBy: 'LAPTOP-KAPITANA',
    name: 'Pożyczka dla brata',
    direction: 'given',
    counterparty: 'BRAT TESTOWY',
    amount: 1000000,
    date: '2025-06-01',
    accountId: '01KDEFACC00000000000000001',
    schedule: [{ id: '01KW1M10000000000000000001', date: '2026-12-01', amount: 1050000 }],
    closedAt: null,
    note: ''
  }
  writeFileSync(join(dataDir, 'loans', `${loan.id}.json`), `${JSON.stringify(loan, null, 2)}\n`)
  const { app, page } = await start(RUN, { dataDir, ictjDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    log('0 przed', await readAll(page))
    log('spłata 10 500 – brat', await repay(page, 'Pożyczka dla brata', '10500'))
    log('1 po spłacie 10 500', await readAll(page))
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    await shot(page, 'W1-DM.18-brat-mostek')
  } finally {
    await app.close()
  }
})
