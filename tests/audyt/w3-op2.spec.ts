// W3 (AU-11): OP.25 – czy odpowiedź „impuls” przy zakupie w całości finansowanym przez domownika trafia do Wywiadu
// („Dziennik kapitański”: plan / impuls / bez oznaczenia). Narzędzie obserwacji.
import { test, type Page } from '@playwright/test'
import { shot } from './lab'
import { addRecords, ANNA, cat, goOps, run, say, WALLET } from './op-pomoc'

async function journal(page: Page): Promise<string[]> {
  await page.keyboard.press('Control+9')
  await page.getByTestId('page-intel').waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1500)
  return (await page.getByTestId('intel-log-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).slice(-3)
}

test('W3 OP.25 – zakup Anny 250 zł „impuls” a Wywiad → Dziennik kapitański', async () => {
  const r = await run('w3-op-dziennik', (d) =>
    addRecords(d, 'transactions', [
      { date: '2026-11-02', time: '14:00', accountId: WALLET, kind: 'expense', counterparty: 'Impuls Anny W3', amount: -25000, categoryId: cat('0101'), refundable: true, memberId: ANNA, impulse: 'impulse' }
    ])
  )
  const { page, app, errors } = r
  try {
    say('1. Dziennik – zakup Anny 250 zł oznaczony „impuls”', await journal(page))
    await shot(page, 'W3.OP25-wywiad-impuls')
    await goOps(page)
    await page.getByTestId('operation-row').filter({ hasText: 'Impuls Anny W3' }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'wyczyść' }).click()
    await page.waitForTimeout(600)
    await page.keyboard.press('Escape')
    say('2. Dziennik – ten sam zakup Anny bez oznaczenia', await journal(page))
    await goOps(page)
    await page.getByTestId('operation-row').filter({ hasText: 'Impuls Anny W3' }).first().click()
    await page.waitForTimeout(400)
    await page.getByTestId('operation-financer').selectOption({ index: 0 })
    await page.waitForTimeout(600)
    await page.keyboard.press('Escape')
    say('3. Dziennik – ten sam zakup jako mój, bez oznaczenia', await journal(page))
    say('errors', errors)
  } finally {
    await app.close()
  }
})
