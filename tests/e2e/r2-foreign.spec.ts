import { mkdtempSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { warsawNow } from '../../src/shared/calc/dates'
import { defaultCategoryId, MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

/**
 * AP-48 (1.17.0, R2 – T492, T493): „kwota w walucie” – information beside the złoty: typed in the editor (folded „+ kwota
 * w walucie”, the rate shown, a code refused at the field), on the list, found by its code, in the CSV, typed in the
 * quick entry with the last currency; the budget's złoty unchanged.
 */
test('AP-48: kwota w walucie – edytor, lista, wyszukiwanie, eksport CSV, szybki wpis', async () => {
  const { date: today } = warsawNow()
  const out = mkdtempSync(join(tmpdir(), 'fi-foreign-out-'))
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-foreign-')), 'FinancialIntel')
  seedFolder(dataDir, {
    // No quiet hours: the suite may run at night (the quick entry would ask for a note and a confirmation).
    settings: (s) => ({ ...s, orders: { ...s.orders, quietHours: { from: '00:00', to: '00:00' } } }),
    records: {
      transactions: [
        { date: today, accountId: MBANK_ACCOUNT_ID, amount: -zl(193.5), categoryId: defaultCategoryId(1, 2), counterparty: 'Trattoria' },
        { date: today, accountId: MBANK_ACCOUNT_ID, amount: -zl(12), categoryId: defaultCategoryId(1, 1), counterparty: 'Kiosk' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('operation-row')).toHaveCount(2)
    await page.locator('[data-testid="operation-row"]', { hasText: 'Trattoria' }).click()
    // Folded until asked for; opened – the last currency used (none yet – EUR).
    await page.getByTestId('operation-foreign-open').click()
    await expect(page.getByTestId('operation-foreign-currency')).toHaveValue('EUR')
    await page.getByTestId('operation-foreign-amount').click()
    await page.getByTestId('operation-foreign-amount').fill('45')
    await page.getByTestId('operation-foreign-amount').press('Tab')
    await expect(page.getByTestId('operation-foreign-rate')).toHaveText('kurs 4,3000 zł za 1 EUR')
    const trattoria = async () => (await records(dir, 'transactions')).find((t) => t.counterparty === 'Trattoria')
    await expect.poll(async () => [(await trattoria())?.foreign, (await trattoria())?.amount]).toEqual([{ amount: 4500, currency: 'EUR' }, -zl(193.5)])
    // Another code in small letters – in capitals; PLN refused at the field, the code stays.
    await page.getByTestId('operation-foreign-currency').fill('gbp')
    await page.getByTestId('operation-foreign-currency').press('Enter')
    await expect.poll(async () => (await trattoria())?.foreign).toEqual({ amount: 4500, currency: 'GBP' })
    await page.getByTestId('operation-foreign-currency').fill('PLN')
    await page.getByTestId('operation-foreign-currency').press('Enter')
    await expect(page.getByText('Kwota w złotych to kwota operacji – wpisz inną walutę.')).toBeVisible()
    await expect(page.getByTestId('operation-foreign-currency')).toHaveValue('GBP')
    expect((await trattoria())?.foreign).toEqual({ amount: 4500, currency: 'GBP' })

    // On the list beside the złoty; the search by the currency's code.
    await expect(page.locator('[data-testid="operation-row"]', { hasText: 'Trattoria' }).getByTestId('operation-row-foreign')).toHaveText('45,00 GBP')
    await page.getByTestId('operations-search').fill('gbp')
    await expect(page.getByTestId('operation-row')).toHaveText([/Trattoria/])
    await page.getByTestId('operations-search').fill('')
    await expect(page.getByTestId('operation-row')).toHaveCount(2)

    // The CSV of Operacje: its own columns at the end.
    const csv = join(out, 'operacje.csv')
    await app.evaluate(({ dialog }, p) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: p })
    }, csv)
    await page.keyboard.press('Control+0')
    await page.getByRole('radio', { name: 'Eksport' }).click()
    await page.getByTestId('export-operations-csv').click()
    await expect.poll(async () => (await readFile(csv, 'utf8').catch(() => '')).split('\r\n').find((l) => l.includes('Trattoria'))?.split(';').slice(-2)).toEqual(['-45,00', 'GBP'])

    // The quick entry: „+ kwota w walucie” with the last currency, saved with the operation.
    const quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').fill('20')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-foreign-open').click()
    await expect(quick.getByTestId('quick-foreign-currency')).toHaveValue('GBP')
    await quick.getByTestId('quick-foreign-amount').click()
    await quick.getByTestId('quick-foreign-amount').fill('4,60')
    await quick.getByTestId('quick-foreign-amount').press('Tab')
    await expect(quick.getByTestId('quick-foreign-rate')).toHaveText('kurs 4,3478 zł za 1 GBP')
    await quick.getByTestId('quick-counterparty').fill('Pub')
    await quick.getByTestId('quick-counterparty').press('Enter')
    await expect.poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'Pub').map((t) => [t.amount, t.foreign])).toEqual([[-zl(20), { amount: 460, currency: 'GBP' }]])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
