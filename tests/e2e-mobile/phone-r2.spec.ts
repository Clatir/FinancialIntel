// AP-48 (1.17.0, R2 – T493): „kwota w walucie” on the phone – the quick entry's sheet (the computers' window) writes it
// with the operation to OneDrive, the card of Operacje says it beside the złoty.
import { expect, test, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { startPhoneServer, seedDrive, zl, type PhoneServer } from './server'

const FOLDER = 'FinancialIntel'
const CLIENT = '0a1b2c3d-1111-2222-3333-444455556666'
const ACC = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'

let srv: PhoneServer

test.beforeEach(async ({ page }) => {
  srv = await startPhoneServer()
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  seedDrive(srv.drive, FOLDER, {
    // No quiet hours: the suite may run at night (the quick entry would ask for a note and a confirmation).
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, orders: { ...s.orders, quietHours: { from: '00:00', to: '00:00' } } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      transactions: [{ date: start, accountId: ACC, amount: -zl(42.5), categoryId: GROCERIES, counterparty: 'Biedronka', foreign: { amount: 1000, currency: 'CZK' } }]
    }
  })
  await page.addInitScript((cfg) => {
    window.__FI_PHONE_TEST__ = cfg
  }, { graphBase: `${srv.url}/v1.0`, authority: `${srv.url}/v1.0`, version: '1.13.0-test' })
  page.on('pageerror', (e) => console.error('pageerror', e))
})

test.afterEach(async () => {
  await srv.close()
})

async function connect(page: Page): Promise<void> {
  await page.goto(`${srv.url}/index.html`)
  await page.getByTestId('phone-client-id').fill(CLIENT)
  await page.getByTestId('phone-signin').click()
  await expect(page.getByTestId('phone-folder')).toHaveValue(FOLDER)
  await page.getByTestId('phone-folder-connect').click()
  await expect(page.getByTestId('page-bridge')).toBeVisible()
}

const driveTransactions = (): Array<Record<string, unknown>> =>
  srv.drive
    .files(FOLDER)
    .filter((f) => f.startsWith('transactions/'))
    .map((f) => JSON.parse(srv.drive.read(`${FOLDER}/${f}`)!) as Record<string, unknown>)

test('kwota w walucie: szybki wpis na telefonie z ostatnią walutą, na OneDrive z operacją, dopisek na karcie Operacji', async ({ page }) => {
  await connect(page)
  await page.getByTestId('phone-nav-quick').click()
  const sheet = page.getByTestId('phone-quick-sheet')
  await expect(sheet).toHaveAttribute('data-open', '1')
  await sheet.getByTestId('quick-amount').fill('20')
  await sheet.getByTestId('quick-foreign-open').click()
  // The last currency used (the computer's operation in CZK).
  await expect(sheet.getByTestId('quick-foreign-currency')).toHaveValue('CZK')
  await sheet.getByTestId('quick-foreign-amount').fill('110')
  await sheet.getByTestId('quick-foreign-amount').press('Tab')
  await expect(sheet.getByTestId('quick-foreign-rate')).toHaveText('kurs 0,1818 zł za 1 CZK')
  await sheet.getByTestId('quick-counterparty').fill('Hospoda')
  await sheet.getByTestId('quick-save').click()
  await expect(sheet).not.toHaveAttribute('data-open', '1')
  await expect.poll(() => driveTransactions().find((t) => t.counterparty === 'Hospoda')?.foreign, { timeout: 20_000 }).toEqual({ amount: 11000, currency: 'CZK' })
  expect(driveTransactions().find((t) => t.counterparty === 'Hospoda')?.amount).toBe(-zl(20))

  await page.getByTestId('phone-nav-operations').click()
  await expect(page.locator('[data-testid="operation-row"]', { hasText: 'Hospoda' }).getByTestId('operation-row-foreign')).toHaveText('· 110,00 CZK')
})
