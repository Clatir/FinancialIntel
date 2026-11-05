import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { importDone, launch, MASS } from './app'
import { bankCsv } from './bank-csv'
import { json, records } from './files'
import { seedFolder } from './seed'

/** The file dialog of the main process answers with `path` (a dialog cannot be clicked in a test). */
async function answerFileDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

async function pick(app: ElectronApplication, page: Page, path: string): Promise<void> {
  await answerFileDialog(app, path)
  await page.getByTestId('import-pick').click()
}

const startedBudget = (dataDir: string) => seedFolder(dataDir, { settings: (s) => ({ ...s, budget: { ...s.budget, start: `${addMonths(warsawNow().month, -2)}-01` } }) })

test('AP-43: CSV innego banku – kreator kolumn, nowe konto, import jak z mBanku; następny plik banku bez kreatora, nic podwójnie', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fi-csv-'))
  const { date: today } = warsawNow()
  const file = join(dir, 'historia_bank_b.csv')
  writeFileSync(
    file,
    bankCsv([
      { date: addDays(today, -6), name: 'PIEKARNIA TESTOWA', title: 'Płatność kartą', amount: -12.5 },
      { date: addDays(today, -5), name: 'KIOSK RUCH', title: 'Płatność kartą', amount: -7.2 },
      { date: addDays(today, -4), name: 'FIRMA TESTOWA SP. Z O.O.', title: 'Wynagrodzenie', amount: 1500 },
      { date: addDays(today, -2), name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 },
      { date: addDays(today, -2), name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 }
    ])
  )
  const dataDir = join(dir, 'FinancialIntel')
  startedBudget(dataDir)
  const { app, page, userData, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await pick(app, page, file)
    // Not mBank's: the wizard with its proposal – the columns by the header's names, a new account.
    const wizard = page.getByTestId('import-csv')
    await expect(wizard).toBeVisible()
    await expect(page.getByTestId('import-file')).toHaveCount(0)
    await expect(page.getByTestId('import-csv-col-date')).toHaveValue('0')
    await expect(page.getByTestId('import-csv-col-credit')).toHaveValue('6')
    await expect(page.getByTestId('import-csv-col-debit')).toHaveValue('7')
    await expect(page.getByTestId('import-csv-account')).toHaveValue('')
    await expect(page.getByTestId('import-csv-preview-row')).toHaveCount(5)
    await expect(page.getByTestId('import-csv-preview-row').first()).toContainText('ZABKA Z1234')
    // A column taken away: said beside the button, nothing saved.
    await page.getByTestId('import-csv-col-date').selectOption('')
    await expect(page.getByTestId('import-csv-missing')).toHaveText('Wskaż kolumnę z datą operacji.')
    await expect(page.getByTestId('import-csv-save')).toBeDisabled()
    await page.getByTestId('import-csv-col-date').selectOption('0')
    await page.getByTestId('import-csv-new-name').fill('Bank B')
    await page.getByTestId('import-csv-save').click()

    const opened = page.getByTestId('import-file')
    await expect(opened).toBeVisible(MASS)
    await expect(opened).toHaveAttribute('data-format', 'csv')
    await expect(opened).toContainText('CSV innego banku · 5 operacji')
    await expect(page.getByTestId('import-account')).toHaveValue(/.+/)
    await expect(page.getByTestId('import-count-new')).toHaveText('5')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)

    const fi = await json(join(dataDir, 'fi.json'))
    const bankB = (fi.settings.accounts as Array<Record<string, unknown>>).find((a) => a.name === 'Bank B')!
    expect(bankB).toMatchObject({ kind: 'bank', importFormat: 'csv', csvMapping: { separator: ';', skipRows: 4, header: true, dateFormat: 'DD.MM.RRRR', columns: { date: 0, credit: 6, debit: 7 } } })
    await expect.poll(async () => (await records(dataDir, 'transactions')).length).toBe(5)
    const ops = await records(dataDir, 'transactions')
    expect(ops.every((t) => t.accountId === bankB.id && String((t.bank as { key: string }).key).startsWith('csv:'))).toBe(true)
    expect(ops.filter((t) => t.amount === -3195)).toHaveLength(2)

    // The bank's next file (the same days and one more): read by the account's mapping – no wizard, nothing twice.
    const next = join(dir, 'historia_bank_b (1).csv')
    writeFileSync(
      next,
      bankCsv([
        { date: addDays(today, -6), name: 'PIEKARNIA TESTOWA', title: 'Płatność kartą', amount: -12.5 },
        { date: addDays(today, -5), name: 'KIOSK RUCH', title: 'Płatność kartą', amount: -7.2 },
        { date: addDays(today, -4), name: 'FIRMA TESTOWA SP. Z O.O.', title: 'Wynagrodzenie', amount: 1500 },
        { date: addDays(today, -2), name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 },
        { date: addDays(today, -2), name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 },
        { date: addDays(today, -1), name: 'APTEKA POD LIPA', title: 'Płatność kartą', amount: -20 }
      ])
    )
    await pick(app, page, next)
    await expect(page.getByTestId('import-file')).toBeVisible(MASS)
    await expect(wizard).toHaveCount(0)
    await expect(page.getByTestId('import-account')).toHaveValue(String(bankB.id))
    await expect(page.getByTestId('import-count-new')).toHaveText('1')
    await expect(page.getByTestId('import-count-known')).toHaveText('5')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect.poll(async () => (await records(dataDir, 'transactions')).length).toBe(6)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
