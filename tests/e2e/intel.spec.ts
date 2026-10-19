import { mkdtempSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const AUTO = '01KDEFCAT00000000000000300'

/** The next save dialog answers with this path. */
const saveTo = (app: ElectronApplication, path: string) =>
  app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p })
  }, path)

test('Wywiad i Raporty: krzywa majątku, Killzones, FVG, zasięg, dziennik; raport wachty, debriefing do PDF, eksport CSV i Excel', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  const last = addMonths(month, -1)
  const out = mkdtempSync(join(tmpdir(), 'fi-intel-out-'))
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-intel-')), 'FinancialIntel')
  // Spending every few days over three months, on Friday evenings with a time; a planned envelope over last month.
  const transactions = []
  for (let d = start; d < today; d = addDays(d, 3)) transactions.push({ date: d, accountId: MBANK, amount: -zl(60), categoryId: FOOD, time: '19:10', counterparty: 'Sklep' })
  transactions.push({ date: `${last}-10`, accountId: MBANK, amount: -zl(700), categoryId: AUTO, counterparty: 'Serwis', impulse: 'impulse' })
  transactions.push({ date: `${last}-15`, accountId: MBANK, amount: zl(2500), kind: 'income', counterparty: 'Wpływ' })
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(2500) } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -3), salary: zl(3000), envelopes: { [FOOD]: zl(1200), [AUTO]: zl(400) } }],
      containers: [{ name: 'Czynsz', amount: zl(900), dueMonth: start.slice(0, 7), dueDay: 10 }],
      transactions
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+9')
    await expect(page.getByTestId('page-intel')).toBeVisible()
    await expect.poll(async () => Number(await page.getByTestId('intel-wealth-chart').getAttribute('data-points'))).toBeGreaterThan(10)
    await expect(page.getByTestId('killzone-cell').first()).toBeVisible()
    await expect(page.getByTestId('intel-order-block')).toContainText('Order Block')
    await page.getByTestId('intel-fvg-month').selectOption(last)
    await expect(page.locator('[data-testid="intel-fvg-row"]', { hasText: 'Auto' })).toContainText('−300,00 zł')
    await expect(page.getByTestId('intel-range-text')).toContainText('Bez żadnej wypłaty')
    await expect(page.getByTestId('intel-log-row').first()).toBeVisible()

    await page.keyboard.press('Control+0')
    await expect(page.getByTestId('page-reports')).toBeVisible()
    await expect(page.getByTestId('reports-watch-costs')).not.toBeEmpty()
    // The days of the watch report in złoty as everywhere (1.6.6, N33).
    await expect(page.getByTestId('reports-watch-day').first()).toContainText('zł')
    await page.getByRole('radio', { name: 'Debriefing' }).click()
    await page.getByTestId('reports-debrief-month').selectOption(last)
    await expect(page.getByTestId('reports-debrief')).toContainText('FVG kopert')
    // The gap on the plus with its sign, as in Plan miesiąca and Wywiad (1.6.6, N33).
    await expect(page.locator('[data-testid="report-section"]', { hasText: 'FVG kopert' })).toContainText(/\+\d/)
    const pdf = join(out, 'debriefing.pdf')
    await saveTo(app, pdf)
    await page.getByTestId('reports-debrief-pdf').click()
    await expect.poll(async () => (await readFile(pdf).catch(() => Buffer.alloc(0))).subarray(0, 4).toString()).toBe('%PDF')

    await page.getByRole('radio', { name: 'Eksport' }).click()
    const csv = join(out, 'operacje.csv')
    await saveTo(app, csv)
    await page.getByTestId('export-operations-csv').click()
    await expect.poll(async () => (await readFile(csv, 'utf8').catch(() => '')).split('\r\n')[0]).toBe('﻿Data;Godzina;Konto;Rodzaj;Kwota (zł);Kategoria;Kontrahent;Tytuł;Finansuje;Dziennik;Notatka')
    const xlsx = join(out, 'budzet.xlsx')
    await saveTo(app, xlsx)
    await page.getByTestId('export-xlsx').click()
    await expect.poll(async () => (await readFile(xlsx).catch(() => Buffer.alloc(0))).subarray(0, 2).toString()).toBe('PK')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
