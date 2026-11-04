/**
 * N3 (1.15.7): AP-13 – today's energy never more than the month's energy left, with its reason beside („pensja
 * częściowa”).
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const HOME = '01KDEFCAT00000000000000200'
const FUN = '01KDEFCAT00000000000000600'
const GIFTS = '01KDEFCAT00000000000000900'

test('AP-13: pensja częściowa – energia dziś 0,00 zł z dopiskiem na Mostku i w Planie miesiąca', async () => {
  const { month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n3-energy-')), 'FinancialIntel')
  // PM.3 w2: 4 000 zł at the start, all of it spent last month – this month's salary of 4 000 zł finds the shields and
  // the hull empty; the daily envelopes (2 000 zł) would still give a share for today.
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(4000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500), [FUN]: zl(500), [HOME]: zl(500), [GIFTS]: zl(1000) } }],
      transactions: [
        { date: `${prev}-05`, accountId: ACC, amount: -zl(1500), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: `${prev}-10`, accountId: ACC, amount: -zl(500), categoryId: FUN, counterparty: 'Kino' },
        { date: `${prev}-15`, accountId: ACC, amount: -zl(1000), categoryId: GIFTS, counterparty: 'Jubiler' },
        { date: `${prev}-20`, accountId: ACC, amount: -zl(1000), categoryId: HOME, counterparty: 'IKEA' }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.locator('[data-testid="briefing-item"][data-kind="alarm"]').filter({ hasText: 'Pensja częściowa: brakuje 4 000,00 zł' })).toHaveCount(1)
    // Before: „Energia dziś 71,42 zł” (the daily pool's share) beside „Energia miesiąca 0,00 zł”.
    await expect(page.getByTestId('bridge-energy')).toHaveText('0,00 zł')
    const cap = page.getByTestId('bridge-energy-cap')
    await expect(cap).toHaveText('pensja częściowa – energia miesiąca 0,00 zł')
    await expect(cap).toHaveAttribute('data-why', 'partial')
    await expect(page.getByTestId('state-energy')).toContainText('0,00 zł')
    await page.getByTestId('bridge-energy-why').click()
    const lines = page.getByTestId('bridge-energy-lines')
    await expect(lines).toContainText('Energia miesiąca (pensja do wydania) – pensja częściowa')
    await expect(lines.locator('[data-testid="why-line"]').last()).toHaveText(/Energia dziś\s*0,00 zł/)
    await expect(page.getByTestId('bridge-bias')).toContainText('Bearish')

    await page.getByTestId('nav-month').click()
    await expect(page.getByTestId('month-energy-today')).toHaveText('0,00 zł')
    await expect(page.getByTestId('month-energy-cap')).toHaveText('pensja częściowa – energia miesiąca 0,00 zł')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
