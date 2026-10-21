// The phone's watch (iB, IP3–IP7): Operacje – the list with the search and the month, an operation edited and sent to
// OneDrive; Meldunki – without a category to Operacje, a balance confirmed in its report, the counter in the menu;
// Plan miesiąca and Radar – previews, read only.
import { expect, test, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { startPhoneServer, seedDrive, zl, type PhoneServer } from './server'

const FOLDER = 'FinancialIntel'
const CLIENT = '0a1b2c3d-1111-2222-3333-444455556666'
const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const AUTO = '01KDEFCAT00000000000000300'

let srv: PhoneServer
let today: string
let month: string

test.beforeEach(async ({ page }) => {
  srv = await startPhoneServer()
  ;({ date: today, month } = warsawNow())
  const start = `${addMonths(month, -1)}-01`
  const due = addDays(today, 3)
  seedDrive(srv.drive, FOLDER, {
    settings: (s) => ({ ...s, shipName: 'Sokół', budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: { [FOOD]: zl(1500), [AUTO]: zl(300) } }],
      containers: [{ name: 'OC auta', amount: zl(1240), cycleMonths: 12, dueMonth: due.slice(0, 7), dueDay: Number(due.slice(8, 10)), categoryId: AUTO }],
      transactions: [
        { date: start, accountId: ACC, amount: -zl(42.5), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: today, accountId: ACC, amount: -zl(18), counterparty: 'Kiosk Ruch', note: 'gazeta' },
        { date: today, accountId: ACC, amount: zl(4000), kind: 'income', counterparty: 'Pracodawca SA', title: 'Wynagrodzenie' }
      ]
    }
  })
  await page.addInitScript((cfg) => {
    window.__FI_PHONE_TEST__ = cfg
  }, { graphBase: `${srv.url}/v1.0`, authority: `${srv.url}/v1.0`, version: '1.14.0-test' })
  page.on('pageerror', (e) => console.error('pageerror', e))
})

test.afterEach(async () => {
  await srv.close()
})

async function connect(page: Page): Promise<void> {
  await page.goto(`${srv.url}/index.html`)
  await page.getByTestId('phone-client-id').fill(CLIENT)
  await page.getByTestId('phone-signin').click()
  await page.getByTestId('phone-folder-connect').click()
  await expect(page.getByTestId('page-bridge')).toBeVisible()
}

function driveRecords(dir: string): Array<Record<string, unknown>> {
  return srv.drive
    .files(FOLDER)
    .filter((f) => f.startsWith(`${dir}/`))
    .map((f) => JSON.parse(srv.drive.read(`${FOLDER}/${f}`)!) as Record<string, unknown>)
}

test('Operacje: miesiąc, wyszukiwanie, edycja kategorii i kwoty idzie na OneDrive', async ({ page }) => {
  await connect(page)
  await page.getByTestId('phone-nav-operations').click()
  const rows = page.getByTestId('operation-row')
  // This month: the kiosk and the salary; the month before – the grocery.
  await expect(rows).toHaveCount(2)
  await page.getByTestId('operations-prev-month').click()
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Biedronka')
  await page.getByTestId('operations-next-month').click()
  await page.getByTestId('operations-search').fill('kiosk')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('bez kategorii')
  await rows.first().click()
  // The computers' editor over the screen.
  const editor = page.getByTestId('phone-operation')
  await expect(editor.getByTestId('operation-editor')).toBeVisible()
  await editor.getByTestId('operation-category').selectOption(GROCERIES)
  await editor.getByTestId('operation-amount').fill('19,50')
  await editor.getByTestId('operation-amount').press('Tab')
  await page.getByTestId('phone-operation-back').click()
  await expect(rows.first()).toContainText('19,50')
  await expect(rows.first()).not.toContainText('bez kategorii')
  await expect.poll(() => driveRecords('transactions').find((t) => t.counterparty === 'Kiosk Ruch')?.amount, { timeout: 20_000 }).toBe(-1950)
  const sent = driveRecords('transactions').find((t) => t.counterparty === 'Kiosk Ruch')!
  expect(sent.categoryId).toBe(GROCERIES)
  expect(sent.updatedBy).toBe('iPhone')

  // „+ Nowa”: a new operation in the editor; back without a change – dropped, nothing written.
  await page.getByTestId('operations-search').fill('')
  await page.getByTestId('operation-new').click()
  await expect(page.getByTestId('phone-operation')).toContainText('nowa operacja')
  await page.getByTestId('phone-operation-back').click()
  await expect(rows).toHaveCount(2)

  // A field typed in and the tab changed at once: the change is kept. On the iPhone a tap on a button does not take the
  // focus (WebKit) – no blur saves the field; the click without a focus change is that tap.
  await rows.filter({ hasText: 'Pracodawca' }).click()
  await page.getByTestId('phone-operation').getByTestId('operation-note').fill('premia')
  await page.getByTestId('phone-nav-more').dispatchEvent('click')
  await expect.poll(() => driveRecords('transactions').find((t) => t.counterparty === 'Pracodawca SA')?.note, { timeout: 20_000 }).toBe('premia')
  // „Operacje” from the menu: the list, not the operation left open.
  await page.getByTestId('phone-nav-operations').click()
  await expect(page.getByTestId('page-operations')).toBeVisible()
  await expect(rows).toHaveCount(2)
})

test('Meldunki: bez kategorii do Operacji, saldo potwierdzone w meldunku, licznik w menu', async ({ page }) => {
  await connect(page)
  const nav = page.getByTestId('phone-nav-inbox')
  // Without a category (the kiosk) and the balance unconfirmed since the opening (more than 30 days).
  await expect(nav).toHaveAttribute('data-badge', '2')
  await nav.click()
  await expect(page.getByTestId('inbox-item')).toHaveCount(2)
  await page.locator('[data-testid="inbox-item"][data-kind="uncategorized"]').getByTestId('inbox-open').click()
  await expect(page.getByTestId('page-operations')).toBeVisible()
  await expect(page.getByTestId('operation-row')).toHaveCount(1)
  await expect(page.getByTestId('operation-row')).toContainText('Kiosk Ruch')

  // The bank's balance: a difference asks first; the balance of the operations confirms at once.
  await nav.click()
  const balance = page.locator('[data-testid="inbox-item"][data-kind="balances"]')
  await balance.getByTestId('inbox-balance-amount').fill('23 900')
  await balance.getByTestId('inbox-balance-confirm').click()
  await expect(balance.getByTestId('confirm-ask')).toBeVisible()
  await balance.getByTestId('inbox-balance-amount').fill('23 939,50')
  await expect(balance.getByTestId('confirm-ask')).toHaveCount(0)
  await balance.getByTestId('inbox-balance-confirm').click()
  await expect(page.locator('[data-testid="inbox-item"][data-kind="balances"]')).toHaveCount(0)
  await expect(nav).toHaveAttribute('data-badge', '1')
  await expect.poll(() => driveRecords('balances').filter((b) => b.kind === 'confirmation').map((b) => b.amount), { timeout: 20_000 }).toEqual([zl(23939.5)])
  // The Sunday's „Potwierdzenie sald” notice: Meldunki (on a computer – Ustawienia → Konta).
  await page.getByTestId('phone-nav-bridge').click()
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fi:notice-tap', { detail: 'balances' })))
  await expect(page.getByTestId('page-inbox')).toBeVisible()
})

test('Plan miesiąca i Radar – podgląd tylko do odczytu', async ({ page }) => {
  await connect(page)
  await page.getByTestId('phone-nav-more').click()
  await page.getByTestId('phone-more-month').click()
  await expect(page.getByTestId('page-month')).toBeVisible()
  await expect(page.getByTestId('phone-preview-note')).toContainText('na komputerze')
  // The salary seen, not changed; the months can be looked through.
  await expect(page.getByTestId('month-salary')).toBeDisabled()
  await expect(page.getByTestId('month-salary')).toHaveValue(/^4\s000,00$/)
  const shown = (await page.getByTestId('month-label').textContent()) ?? ''
  await page.getByTestId('month-prev').click()
  await expect(page.getByTestId('month-label')).not.toHaveText(shown)

  await page.getByTestId('phone-nav-more').click()
  await page.getByTestId('phone-more-radar').click()
  await expect(page.getByTestId('page-radar')).toBeVisible()
  // The container's payment in 3 days on the radar; no forms of a new loan or buoy.
  await expect(page.getByTestId('radar-items')).toContainText('1 240,00')
  await expect(page.getByTestId('radar-new-buoy')).toHaveCount(0)
  await expect(page.getByTestId('radar-new-loan')).toHaveCount(0)
})
