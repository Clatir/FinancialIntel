// R1 (1.16.0), AP-42: the month's calendar on Radar – the day's energy as Mostek has it, the radar's items on their day,
// a day clicked (its items, its operations in Operacje), the months of the radar's window, the hidden amounts (Ctrl+$).
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { calendarMonths } from '../../src/shared/calc/calendar'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const HOME = '01KDEFCAT00000000000000200'

test('Radar – kalendarz miesiąca: energia dnia jak na Mostku, opłata w swoim dniu, klik dnia, operacje dnia, miesiące okna, ukryte kwoty', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const due = addDays(today, 3)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-calendar-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      // The last month's loot already split (to the shields): no report of it on days 1–7.
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: { [FOOD]: zl(1500), [HOME]: zl(300) }, loot: { decidedAt: new Date().toISOString() } }],
      containers: [{ name: 'Abonament siłowni', amount: zl(60), cycleMonths: 1, dueMonth: due.slice(0, 7), dueDay: Number(due.slice(8, 10)), categoryId: HOME, from: due.slice(0, 7) }],
      transactions: [{ date: today, accountId: MBANK, amount: -zl(18), categoryId: GROCERIES, counterparty: 'Kiosk Ruch' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    // Mostek: today's energy and allowance – the calendar's today says the same.
    await expect(page.getByTestId('bridge-energy')).toBeVisible()
    const energy = ((await page.getByTestId('bridge-energy').textContent()) ?? '').trim()
    const allowance = /przydział ([\d\s ,]+) zł/.exec((await page.getByTestId('bridge-energy-why').textContent()) ?? '')![1]!.trim()

    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    await page.getByRole('radio', { name: 'kalendarz' }).click()
    const calendar = page.getByTestId('radar-calendar')
    await expect(calendar).toHaveAttribute('data-month', month)
    const cell = (date: string) => page.locator(`[data-testid="radar-calendar-cell"][data-date="${date}"]`)
    await expect(cell(today)).toHaveAttribute('data-state', 'today')
    await expect(cell(today).getByTestId('radar-calendar-energy')).toHaveText(allowance)
    await expect(cell(today).getByTestId('radar-calendar-spent')).toHaveText('18,00')
    // Today chosen at first: its energy as Mostek's.
    const day = page.getByTestId('radar-calendar-day')
    await expect(day).toHaveAttribute('data-date', today)
    await expect(page.getByTestId('radar-calendar-day-energy')).toContainText(`Energia dziś: ${energy}`)
    await expect(page.getByTestId('radar-calendar-day-energy')).toContainText(`przydział ${allowance} zł − wydane 18,00 zł`)
    await page.screenshot({ path: join('test-results', 'screens', '12a-radar-calendar.png') })

    // The fee on its day (the radar's item): the month it is in, its amount in the cell, the day clicked – its item.
    const months = calendarMonths(today)
    if (due.slice(0, 7) !== month) await page.getByTestId('radar-calendar-next').click()
    await expect(calendar).toHaveAttribute('data-month', due.slice(0, 7))
    await expect(cell(due).getByTestId('radar-calendar-out')).toHaveText('−60,00')
    await cell(due).click()
    await expect(day).toHaveAttribute('data-date', due)
    await expect(day.locator('[data-testid="radar-calendar-item"][data-kind="fixed"]')).toContainText('Abonament siłowni')
    await expect(day.locator('[data-testid="radar-calendar-item"][data-kind="fixed"]')).toContainText('−60,00 zł')

    // Ctrl+$: the amounts hidden in the grid and in the day too.
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(cell(due).getByTestId('radar-calendar-out')).toHaveText('−•••')
    await expect(day.locator('[data-testid="radar-calendar-item"][data-kind="fixed"]')).toContainText('−••• zł')
    await expect(day.locator('[data-testid="radar-calendar-item"][data-kind="fixed"]')).not.toContainText('60,00')
    await expect(page.locator('[data-testid="radar-calendar-cell"][data-state="ahead"] [data-testid="radar-calendar-energy"]').first()).toHaveText('≈•••')
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(cell(due).getByTestId('radar-calendar-out')).toHaveText('−60,00')

    // The months of the window: from this one to the one the 90 days end in – no further either way.
    while ((await calendar.getAttribute('data-month')) !== months[0]) await page.getByTestId('radar-calendar-prev').click()
    await expect(page.getByTestId('radar-calendar-prev')).toBeDisabled()
    for (const m of months.slice(1)) {
      await page.getByTestId('radar-calendar-next').click()
      await expect(calendar).toHaveAttribute('data-month', m)
    }
    await expect(page.getByTestId('radar-calendar-next')).toBeDisabled()
    await page.screenshot({ path: join('test-results', 'screens', '12b-radar-calendar-months.png') })
    while ((await calendar.getAttribute('data-month')) !== month) await page.getByTestId('radar-calendar-prev').click()

    // Today's operations in Operacje; back on Radar the calendar with the day chosen.
    await cell(today).click()
    await page.getByTestId('radar-calendar-operations').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await expect(page.getByTestId('operation-row')).toContainText('Kiosk Ruch')
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('radar-calendar-day')).toHaveAttribute('data-date', today)

    // The list again.
    await page.getByRole('radio', { name: 'lista' }).click()
    await expect(page.getByTestId('radar-calendar')).toHaveCount(0)
    await expect(page.locator('[data-testid="radar-item"][data-kind="fixed"]').first()).toContainText('Abonament siłowni')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
