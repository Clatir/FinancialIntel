import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const PAYOUT = '01KSEEDTX0000000000000000A'
const TRIP = '01KSEEDGA0000000000000000A'
const BIKE = '01KSEEDGA0000000000000000B'

test('Cele (1.4.2): wydatek z pieniędzy celu, archiwizacja z pytaniem o środki i „Cofnij”, przeniesienie do innego celu', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-goals-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      goals: [
        { id: TRIP, name: 'Wakacje', target: zl(3000), priority: 1, source: 'own', activeFrom: `${start}T00:00:00.000Z` },
        { id: BIKE, name: 'Rower', target: zl(1000), priority: 2, source: 'own', activeFrom: `${start}T00:00:00.000Z` }
      ],
      // A withdrawal from ICTTJ's pool „Cele”: straight to the goals.
      transactions: [{ id: PAYOUT, date: addDays(start, 2), accountId: MBANK, kind: 'trading', amount: zl(2500), counterparty: 'XTB S.A.' }],
      dockings: [{ date: addDays(start, 2), transactionId: PAYOUT, pool: 'goals' }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  const goal = (name: string) => page.locator(`[data-testid="starmap-goal"][data-name="${name}"]`)
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+6')
    await expect(goal('Wakacje').getByTestId('starmap-amount')).toHaveText('2 500,00 zł')

    // An expense paid from the goal's money (N1): it comes out of the goal, not the energy.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    const amount = page.getByTestId('operation-amount')
    await amount.click()
    await amount.fill('400')
    await amount.press('Enter')
    await page.getByTestId('operation-counterparty').fill('Biuro podróży')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-goal').selectOption({ label: 'Wakacje (2 500,00 zł)' })
    await expect(page.getByTestId('operation-goal-note')).toContainText('schodzi z celu')
    await expect.poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'Biuro podróży').map((t) => [t.amount, t.goalId])).toEqual([[-zl(400), TRIP]])
    await page.keyboard.press('Control+6')
    await expect(goal('Wakacje').getByTestId('starmap-amount')).toHaveText('2 100,00 zł')

    // Archived with its money back to the shields (C2) – and „Cofnij” brings it back as it was.
    await goal('Wakacje').getByTestId('starmap-archive').click()
    await expect(page.getByTestId('starmap-money')).toContainText('2 100,00 zł')
    await page.getByTestId('starmap-money-ok').click()
    await expect(page.getByTestId('starmap-archived-row')).toContainText('0,00 zł')
    const trip = async () => (await records(dir, 'goals')).find((g) => g.id === TRIP)!
    const moved = (g: Record<string, unknown>) => (g.transfers as Array<{ at: string; to: string; amount: number }>).map((t) => [t.at.slice(0, 10) <= today, t.to, t.amount])
    await expect.poll(async () => [(await trip()).archived, moved(await trip()), ((await trip()).past as unknown[]).length]).toEqual([true, [[true, 'shields', zl(2100)]], 1])
    await page.getByRole('status').filter({ hasText: 'wracają do osłon' }).getByTestId('toast-action').click()
    await expect(goal('Wakacje').getByTestId('starmap-amount')).toHaveText('2 100,00 zł')
    await expect.poll(async () => [(await trip()).archived, moved(await trip())]).toEqual([false, []])

    // Archived with its money kept, moved later to another goal (B30).
    await goal('Wakacje').getByTestId('starmap-archive').click()
    await page.getByTestId('starmap-money-stay').check()
    await page.getByTestId('starmap-money-ok').click()
    await expect(page.getByTestId('starmap-archived-row')).toContainText('2 100,00 zł')
    await page.getByTestId('starmap-archived-move').click()
    await page.getByTestId('starmap-money-goal').check()
    await page.getByTestId('starmap-money-ok').click()
    await expect(goal('Rower').getByTestId('starmap-amount')).toHaveText('2 100,00 zł')
    await expect(page.getByTestId('starmap-archived-row')).toContainText('0,00 zł')
    await expect(page.getByTestId('starmap-archived-move')).toHaveCount(0)
    await expect.poll(async () => [(await trip()).archived, moved(await trip())]).toEqual([true, [[true, BIKE, zl(2100)]]])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
