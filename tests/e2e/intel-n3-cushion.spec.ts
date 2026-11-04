/**
 * N3 (1.15.7), AP-31 – kryterium 2: „osłony + kadłub i zasięg” at each month's end with the change m/m in Wywiad, the
 * debriefings (Raporty, Plan miesiąca) and the year's review.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, monthRange, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

test('N3 AP-31: osłony + kadłub i zasięg na koniec 12 miesięcy – Wywiad, debriefing (Raporty, Plan miesiąca), przegląd roczny', async () => {
  const { month } = warsawNow()
  const first = addMonths(month, -12)
  const ended = monthRange(first, addMonths(month, -1))
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n3-cushion-')), 'FinancialIntel')
  // 10 000 zł, 2 000 of it in the hull; the salary 3 000 zł; 4 000 zł in on the 10th and 2 500 zł of costs on the 15th:
  // the shields stay at 9 000 (3 salaries), the 1 500 zł left each month go to the hull (then over the full hull, to the shields).
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${first}-01`, initial: { shields: 0, hull: zl(2000), goals: {} } } }),
    records: {
      balances: [{ date: `${first}-01`, accountId: MBANK, kind: 'opening', amount: zl(10000) }],
      months: [{ month: first, salary: zl(3000), envelopes: {} }],
      transactions: ended.flatMap((m) => [
        { date: `${m}-10`, accountId: MBANK, kind: 'income', amount: zl(4000), counterparty: 'Pracodawca', categoryId: null },
        { date: `${m}-15`, accountId: MBANK, kind: 'expense', amount: -zl(2500), counterparty: 'Sklep', categoryId: FOOD }
      ])
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+9')
    const panel = page.getByTestId('intel-cushion')
    const rows = panel.getByTestId('intel-cushion-row')
    // The 12 months that ended, newest first – the running one left out.
    await expect(rows).toHaveCount(12)
    await expect(rows.first()).toHaveAttribute('data-month', addMonths(month, -1))
    await expect(rows.last()).toHaveAttribute('data-month', first)
    const row = (m: string) => panel.locator(`[data-testid="intel-cushion-row"][data-month="${m}"]`)
    // The first month: 9 000 + 2 000 zł, nothing before it in the budget, no full month of costs yet.
    await expect(row(first).getByTestId('intel-cushion-amount')).toHaveText('11 000,00')
    await expect(row(first).getByTestId('intel-cushion-delta')).toHaveText('—')
    await expect(row(first).getByTestId('intel-cushion-range')).toHaveText('—')
    await expect(row(addMonths(first, 1)).getByTestId('intel-cushion-amount')).toHaveText('12 500,00')
    await expect(row(addMonths(first, 1)).getByTestId('intel-cushion-delta')).toHaveText('↑ +1 500,00')
    await expect(row(addMonths(first, 1)).getByTestId('intel-cushion-delta')).toHaveAttribute('data-dir', 'up')
    await expect(row(addMonths(first, 1)).getByTestId('intel-cushion-range')).toHaveText('5,0 mies.')
    await expect(row(addMonths(first, 2)).getByTestId('intel-cushion-range')).toHaveText('5,6 mies.')
    await expect(row(addMonths(first, 2)).getByTestId('intel-cushion-range-delta')).toHaveText('↑ +0,6 mies.')
    // The last month: 11 000 + 11 × 1 500 zł; 27 500 / 2 500 = 11,0 months.
    await expect(rows.first().getByTestId('intel-cushion-amount')).toHaveText('27 500,00')
    await expect(rows.first().getByTestId('intel-cushion-range')).toHaveText('11,0 mies.')
    await expect(panel.getByTestId('intel-cushion-grow')).toHaveText('Osłony + kadłub rosną w 11 z 11 mies.')
    await panel.screenshot({ path: join('test-results', 'screens', 'n3-cushion.png') })

    // The debriefing of the last month (Raporty): its 12 months.
    await page.keyboard.press('Control+0')
    await page.getByRole('radio', { name: 'Debriefing' }).click()
    await page.getByTestId('reports-debrief-month').selectOption(addMonths(month, -1))
    const section = page.locator('[data-testid="report-section"]', { hasText: 'Osłony i kadłub – 12 miesięcy' })
    await expect(section.locator('tbody tr')).toHaveCount(12)
    await expect(section.locator('tbody tr').first()).toContainText('27 500,00 zł')
    await expect(section.locator('tbody tr').first()).toContainText('↑ +1 500,00 zł')

    // The year's review: the months of the year that ended.
    await page.getByRole('radio', { name: 'Przegląd roczny' }).click()
    const year = month.slice(5, 7) === '01' ? String(Number(month.slice(0, 4)) - 1) : month.slice(0, 4)
    const inYear = ended.filter((m) => m.startsWith(year))
    const yearSection = page.locator('[data-testid="report-section"]', { hasText: 'Osłony i kadłub na koniec miesięcy' })
    await expect(yearSection.locator('tbody tr')).toHaveCount(inYear.length)

    // Plan miesiąca: the debriefing of the month that ended – its end against the month before.
    await page.keyboard.press('Control+4')
    await expect(page.getByTestId('debrief-cushion')).toHaveText('Osłony + kadłub na koniec miesiąca: 27 500,00 zł (↑ +1 500,00 zł m/m) · zasięg 11,0 mies. (↑ +0,6 mies.)')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
