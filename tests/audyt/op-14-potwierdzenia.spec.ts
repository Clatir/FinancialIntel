/** Potwierdzenie NIEZGODNE OP.40 na świeżym przebiegu: wydatek 0,00 zł bez kategorii a meldunek „bez kategorii”. */
import { test } from '@playwright/test'
import { addRecords, goInbox, goOps, opt, rows, run, say, snap, WALLET } from './op-pomoc'

test('OP.40 potwierdzenie – 0 zł w meldunku „bez kategorii”', async () => {
  const r = await run('op-zero-2', (d) => addRecords(d, 'transactions', [{ date: '2026-11-02', accountId: WALLET, counterparty: 'Zero złotych', amount: 0 }]))
  const { page, app, errors } = r
  try {
    await goInbox(page)
    say('OP.40 meldunek', await opt(page.getByTestId('inbox-item').filter({ hasText: /bez kategorii/ })))
    await snap(page, 'OP.40-zero-meldunek')
    await page.getByTestId('inbox-item').filter({ hasText: /bez kategorii/ }).getByTestId('inbox-open').click().catch(() => undefined)
    await page.waitForTimeout(600)
    say('OP.40 lista z meldunku', (await rows(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')))
    void goOps
    say('errors', errors)
  } finally {
    await app.close()
  }
})
