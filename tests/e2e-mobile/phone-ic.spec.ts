// The phone's log and course (iC, IP11–IP14): Operacje – ticking and the change of the ticked, a saved view, the export
// given to iOS's sharing; Meldunki – pairs of transfers joined, duplicates merged; Plan miesiąca and Radar edited, sent
// to OneDrive.
import { expect, test, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { startPhoneServer, seedDrive, zl, type PhoneServer } from './server'

const FOLDER = 'FinancialIntel'
const CLIENT = '0a1b2c3d-1111-2222-3333-444455556666'
const MBANK = '01KDEFACC00000000000000001'
const WALLET = '01KDEFACC00000000000000002'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'

let srv: PhoneServer
let today: string
let month: string
let start: string
/** The month after this one in the same year (in December the year's plan has nothing later to copy onto). */
const sameYear = () => addMonths(month, 1).slice(0, 4) === month.slice(0, 4)

test.beforeEach(async ({ page }) => {
  srv = await startPhoneServer()
  ;({ date: today, month } = warsawNow())
  start = `${addMonths(month, -1)}-01`
  seedDrive(srv.drive, FOLDER, {
    settings: (s) => ({ ...s, shipName: 'Sokół', budget: { ...s.budget, start } }),
    records: {
      balances: [
        { date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) },
        { date: start, accountId: WALLET, kind: 'opening', amount: 0 }
      ],
      months: [
        { month: addMonths(month, -1), salary: zl(3000), envelopes: { [FOOD]: zl(800) } },
        // A later month of the year with its own plan: „»” in the year's plan copies onto it.
        ...(sameYear() ? [{ month: addMonths(month, 1), salary: zl(3000), envelopes: { [FOOD]: zl(800) } }] : [])
      ],
      transactions: [
        // A transfer of before 1.7.0: its two sides as two operations (a pair to join).
        { date: addDays(start, 2), accountId: MBANK, kind: 'transfer', amount: -zl(200), counterparty: 'Przelew na portfel', counterAccountId: WALLET },
        { date: addDays(start, 3), accountId: WALLET, kind: 'transfer', amount: zl(200), counterparty: 'Wpływ z mBanku' },
        // The same purchase typed by hand and come from the bank: a duplicate.
        { date: addDays(start, 5), accountId: MBANK, amount: -zl(63.55), counterparty: 'Lidl', categoryId: GROCERIES },
        { date: addDays(start, 5), accountId: MBANK, amount: -zl(63.55), counterparty: 'LIDL', bank: { key: 'k1', counterparty: 'LIDL', operation: 'ZAKUP PRZY UŻYCIU KARTY', importedAt: `${today}T10:00:00.000Z` } },
        { date: today, accountId: MBANK, amount: -zl(12), counterparty: 'Kawiarnia Alfa' },
        { date: today, accountId: MBANK, amount: -zl(18), counterparty: 'Kawiarnia Beta' }
      ]
    }
  })
  await page.addInitScript((cfg) => {
    window.__FI_PHONE_TEST__ = cfg
  }, { graphBase: `${srv.url}/v1.0`, authority: `${srv.url}/v1.0`, version: '1.15.0-test' })
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

test('Operacje: zaznaczone dostają kategorię, widok zapisany, eksport CSV do udostępniania', async ({ page }) => {
  await connect(page)
  await page.getByTestId('phone-nav-operations').click()
  await expect(page.getByTestId('operation-row')).toHaveCount(2)
  // Ticking: a tap ticks, the computer's bar of changes under the list.
  await page.getByTestId('phone-operations-pick').click()
  await page.getByTestId('phone-operations-pick-all').click()
  await expect(page.locator('[data-testid="operation-row"][data-ticked="1"]')).toHaveCount(2)
  const bulk = page.getByTestId('phone-bulk')
  await expect(bulk.getByTestId('operations-bulk-count')).toContainText('Zaznaczone: 2')
  await bulk.getByTestId('operations-bulk-category').selectOption(FOOD)
  await bulk.getByTestId('operations-bulk-apply').click()
  await expect.poll(() => driveRecords('transactions').filter((t) => String(t.counterparty).startsWith('Kawiarnia')).map((t) => t.categoryId), { timeout: 20_000 }).toEqual([FOOD, FOOD])
  await page.getByTestId('phone-operations-pick').click()

  // A saved view (the filters sheet): kept in the folder, on every computer.
  await page.getByTestId('operations-search').fill('kawiarnia')
  await page.getByTestId('phone-operations-filters').click()
  await page.getByTestId('operations-view-save').click()
  // The form under the button kept on the screen (the button sits on the right of the narrow sheet).
  const box = (await page.getByTestId('operations-view-name').boundingBox())!
  const width = page.viewportSize()!.width
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(width)
  await page.getByTestId('operations-view-name').fill('Kawiarnie')
  await page.getByTestId('operations-view-confirm').click()
  await expect(page.getByTestId('operations-view')).toHaveCount(1)
  await expect.poll(() => (JSON.parse(srv.drive.read(`${FOLDER}/fi.json`)!) as { settings: { operationViews: Array<{ name: string }> } }).settings.operationViews.map((v) => v.name), { timeout: 20_000 }).toEqual(['Kawiarnie'])
  await page.getByTestId('phone-filters-done').click()

  // The visible list to CSV: given to iOS's sharing (the test's browser keeps it).
  await page.getByTestId('operations-export-csv').click()
  await expect.poll(() => page.evaluate(() => (window.__FI_SHARED__ ?? []).map((f) => f.name))).toEqual([`operacje_${today}.csv`])
  const csv = await page.evaluate(() => window.__FI_SHARED__![0]!.text!)
  expect(csv).toContain('Kawiarnia Alfa')
  expect(csv).toContain('Kawiarnia Beta')
  await page.getByTestId('operations-export-xlsx').click()
  await expect.poll(() => page.evaluate(() => (window.__FI_SHARED__ ?? []).map((f) => [f.name, f.mime]))).toEqual([
    [`operacje_${today}.csv`, 'text/csv'],
    [`operacje_${today}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  ])
})

test('Meldunki: pary przelewów połączone, duplikat scalony', async ({ page }) => {
  await connect(page)
  await page.getByTestId('phone-nav-inbox').click()
  // The pair of the old transfer: listed, joined into one operation with both sides.
  const pair = page.locator('[data-testid="inbox-item"][data-kind="transfers"]')
  await pair.getByTestId('inbox-open').click()
  const dialog = page.getByTestId('inbox-pairs')
  await expect(dialog.getByTestId('inbox-pair')).toHaveCount(1)
  await dialog.getByTestId('inbox-pairs-join').click()
  await expect
    .poll(() => driveRecords('transactions').filter((t) => t.kind === 'transfer').map((t) => [t.accountId, t.amount, t.bothSides, t.counterAccountId]), { timeout: 20_000 })
    .toEqual([[MBANK, -zl(200), true, WALLET]])

  // The duplicate (counted a moment after the folder opened): its panel – merged, one Lidl left.
  const dup = page.locator('[data-testid="inbox-item"][data-kind="duplicates"]')
  await expect(dup).toBeVisible({ timeout: 20_000 })
  await dup.getByTestId('inbox-open').click()
  await expect(page.getByTestId('page-duplicates')).toBeVisible()
  await expect(page.getByTestId('duplicate-group')).toHaveCount(1)
  await page.getByTestId('duplicates-merge').click()
  await expect.poll(() => driveRecords('transactions').filter((t) => String(t.counterparty).toLowerCase() === 'lidl').length, { timeout: 20_000 }).toBe(1)
})

test('Plan miesiąca i Radar – zmiany z telefonu idą na OneDrive', async ({ page }) => {
  await connect(page)
  await page.getByTestId('phone-nav-more').click()
  await page.getByTestId('phone-more-month').click()
  await expect(page.getByTestId('page-month')).toBeVisible()
  const salary = page.getByTestId('month-salary')
  await expect(salary).toBeEnabled()
  await salary.click()
  await salary.fill('3200')
  await salary.press('Enter')
  await expect.poll(() => driveRecords('months').find((m) => m.month === month)?.salary, { timeout: 20_000 }).toBe(zl(3200))

  // The year's plan: a value typed in this month's cell and „»” tapped at once – on the iPhone the tap keeps the field's
  // focus (no blur saves it): the typed value is the one copied.
  if (sameYear()) {
    await page.getByTestId('month-year-toggle').click()
    const cell = page.locator(`[data-testid="year-row"][data-id="salary"] [data-testid="year-cell"][data-month="${month}"]`)
    await cell.getByTestId('year-cell-input').click()
    await cell.getByTestId('year-cell-input').fill('3300')
    await cell.getByTestId('year-cell-copy').dispatchEvent('click')
    await expect
      .poll(() => [month, addMonths(month, 1)].map((m) => driveRecords('months').find((p) => p.month === m)?.salary), { timeout: 20_000 })
      .toEqual([zl(3300), zl(3300)])
    await page.getByTestId('month-year-toggle').click()
  }

  await page.getByTestId('phone-nav-more').click()
  await page.getByTestId('phone-more-radar').click()
  await expect(page.getByTestId('page-radar')).toBeVisible()
  const buoy = page.getByTestId('radar-new-buoy')
  await buoy.getByTestId('buoy-name').fill('Przegląd auta')
  await buoy.getByTestId('buoy-date').fill(addDays(today, 10).split('-').reverse().join('.'))
  await buoy.getByTestId('buoy-date').press('Enter')
  await buoy.getByTestId('buoy-amount').click()
  await buoy.getByTestId('buoy-amount').fill('250')
  await buoy.getByTestId('buoy-amount').press('Enter')
  await buoy.getByTestId('buoy-save').click()
  await expect.poll(() => driveRecords('scheduled').map((b) => [b.name, b.amount]), { timeout: 20_000 }).toEqual([['Przegląd auta', -zl(250)]])
})
