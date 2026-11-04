import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, monthOf, warsawNow } from '../../src/shared/calc/dates'
import { MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { launch } from './app'
import { seedFolder, zl } from './seed'

// AP-36 (C16, RE sp. 4): the month in progress counted up to today – an operation dated later is shown apart as
// „Zaplanowane”, never in the costs (the debriefing, the year's review).
const FOOD = '01KDEFCAT00000000000000100'
/** The line's label as a pattern (its brackets literal). */
const PLANNED = String.raw`Zaplanowane \(operacje z datą po dziś – poza kosztami\)`

test('AP-36: debriefing miesiąca w toku i przegląd roczny – koszty do dziś, operacja z datą po dziś jako „Zaplanowane”', async () => {
  const { date: today, month } = warsawNow()
  const tomorrow = addDays(today, 1)
  const start = `${addMonths(month, -2)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-planned-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { ...s.household, since: start, assignFrom: start } }),
    records: {
      balances: [{ date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) }],
      transactions: [
        { date: today, accountId: MBANK_ACCOUNT_ID, amount: -zl(60), categoryId: FOOD, counterparty: 'Sklep' },
        { date: tomorrow, accountId: MBANK_ACCOUNT_ID, amount: -zl(40), categoryId: FOOD, counterparty: 'Rachunek z góry' }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+0')
    await expect(page.getByTestId('page-reports')).toBeVisible()

    await page.getByRole('radio', { name: 'Debriefing' }).click()
    await page.getByTestId('reports-debrief-month').selectOption(month)
    const result = page.locator('[data-testid="report-section"]', { hasText: 'Wynik wobec planu' })
    await expect(result).toContainText(/Koszty netto\s*60,00 zł/)
    // Tomorrow in this month (not on its last day): apart from the costs.
    if (monthOf(tomorrow) === month) await expect(result).toContainText(new RegExp(`${PLANNED}\\s*40,00 zł`))
    else await expect(result).not.toContainText('Zaplanowane')

    await page.getByRole('radio', { name: 'Przegląd roczny' }).click()
    await page.getByRole('combobox', { name: 'Rok przeglądu' }).selectOption(today.slice(0, 4))
    const year = page.locator('[data-testid="report-section"]', { hasText: 'Rok w liczbach' })
    await expect(year).toContainText(/Koszty netto\s*60,00 zł/)
    if (tomorrow.slice(0, 4) === today.slice(0, 4)) {
      await expect(year).toContainText(new RegExp(`${PLANNED}\\s*40,00 zł`))
      await expect(page.locator('[data-testid="report-section"]', { hasText: 'Miesiące' }).locator('th', { hasText: 'Zaplanowane' })).toHaveCount(1)
    }
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
