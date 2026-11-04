import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, dayOfMonth, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'

test('opłaty stałe w miesiącu (1.6.0, F1): stan w Ładowni, „Kontener niezaładowany” w odprawie, „Zapłacone”, opłata na Radarze', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  // 3 days after the due it is overdue – from the 4th of a month; before it only waiting.
  const day = dayOfMonth(today)
  const late = day >= 4
  const dueDay = late ? day - 3 : day + 1
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-fees-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -3), salary: zl(4000), envelopes: {} }],
      // Added this month (AP-10): the months before it have no dues of its – this month's state only.
      containers: [{ name: 'Czynsz', amount: zl(2000), cycleMonths: 1, dueMonth: start.slice(0, 7), dueDay, counterparty: 'SPÓŁDZIELNIA', createdAt: new Date().toISOString() }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const alert = page.locator('[data-testid="briefing-item"][data-kind="cargo"]')
    if (late) await expect(alert).toContainText('Kontener niezaładowany: Czynsz 2 000,00 zł')
    else await expect(alert).toHaveCount(0)

    await page.keyboard.press('Control+5')
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    const row = page.locator('[data-testid="cargo-row"][data-name="Czynsz"]')
    await expect(row.getByTestId('cargo-state')).toHaveAttribute('data-state', late ? 'overdue' : 'waiting')
    await row.click()
    await expect(page.getByTestId('container-month')).toContainText(late ? 'Po terminie' : 'Termin')
    await page.getByTestId('container-paid').click()
    await expect(row.getByTestId('cargo-state')).toHaveAttribute('data-state', 'paid')
    await expect(page.getByTestId('container-paid')).toHaveCount(0)
    await expect.poll(async () => (await records(dir, 'transactions')).map((t) => [t.amount, t.date, t.counterparty])).toEqual([[-zl(2000), today, 'SPÓŁDZIELNIA']])

    // Paid: the alert is gone; the radar has the fee in the months ahead.
    await page.keyboard.press('Control+1')
    await expect(alert).toHaveCount(0)
    await page.keyboard.press('Control+7')
    await expect(page.locator('[data-testid="radar-item"][data-kind="fixed"]').first()).toContainText('Czynsz')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Kreator startu (przegląd N2, T347): rata pożyczki w Ładowni liczy się kwotą tego miesiąca, nie ostatniej raty', async () => {
  const { month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-fees-wizard-')), 'FinancialIntel')
  // A loan's installments: 500 zł a month, the last (in 3 months) 3 000 zł – the months before it in the amount history.
  seedFolder(dataDir, {
    records: {
      containers: [{ name: 'Rata: Auto', type: 'installment', amount: zl(3000), past: [{ until: addMonths(month, 2), amount: zl(500) }], cycleMonths: 1, dueMonth: month, dueDay: 28, from: month, until: addMonths(month, 3) }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await page.getByTestId('banner-wizard-start').click()
    await expect(page.getByTestId('page-wizard')).toBeVisible()
    await page.getByTestId('wizard-next').click()
    await page.getByTestId('wizard-next').click()
    await page.getByTestId('wizard-salary').click()
    await page.getByTestId('wizard-salary').fill('4000')
    await page.getByTestId('wizard-salary').press('Enter')
    await page.getByTestId('wizard-next').click()
    // 4 000 zł − 500 zł this month (before: − 3 000 zł, the last installment).
    await expect(page.getByTestId('wizard-unallocated')).toContainText('3 500,00')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
