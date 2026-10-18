import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const AUTO = '01KDEFCAT00000000000000300'
const HOUSE = '01KDEFMEM00000000000000001'


const operations = (dataDir: string) => records(dataDir, 'transactions')

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

test('Mostek, szybki wpis (oficer, cisza nocna, domownik), ukrycie kwot, ustawienia komputera', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const due = addDays(today, 5)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-bridge-')), 'FinancialIntel')
  seedFolder(dataDir, {
    // The settlements with the household from the budget's start (D81): the purchase for the house counts.
    settings: (s) => ({ ...s, shipName: 'Sokół', budget: { ...s.budget, start }, household: { ...s.household, since: start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: { [FOOD]: zl(1500), [AUTO]: zl(300) } }],
      containers: [{ name: 'OC auta', amount: zl(1240), cycleMonths: 12, dueMonth: due.slice(0, 7), dueDay: Number(due.slice(8, 10)), categoryId: AUTO }],
      transactions: [
        { date: start, accountId: ACC, amount: -zl(42.5), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: start, accountId: ACC, amount: -zl(120), categoryId: GROCERIES, counterparty: 'Lidl', refundable: true }
      ]
    }
  })
  const { app, page, dataDir: dir, userData, errors } = await launch({ dataDir })
  try {
    // The bridge: the briefing (the asteroid in 5 days), the ship, the envelopes, the house, the latest operations.
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('ship-name')).toContainText('Sokół')
    await expect(page.getByTestId('bridge-energy')).toContainText('zł')
    await expect(page.locator('[data-testid="briefing-item"][data-kind="asteroid"]')).toContainText('OC auta za 5 dni')
    await expect(page.getByTestId('state-shields')).toBeVisible()
    await expect(page.getByTestId('bridge-house')).toHaveText('120,00 zł')
    await expect(page.getByTestId('bridge-recent-row')).toHaveCount(2)
    await page.screenshot({ path: join('test-results', 'screens', '08-mostek.png') })

    // The quick entry: the officer's category, Enter saves, the window hides.
    let quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').fill('12,50')
    await quick.getByTestId('quick-counterparty').fill('Biedronka')
    await expect(quick.getByTestId('quick-category')).toHaveValue(GROCERIES)
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await expect(quick.getByTestId('quick-preview-energy')).toContainText('→')
    await quick.screenshot({ path: join('test-results', 'screens', '09-szybki-wpis.png') })
    // A second Enter right after the first (B51): saved once.
    await quick.getByTestId('quick-note').press('Enter')
    await quick.keyboard.press('Enter')
    await expect.poll(async () => (await operations(dir)).filter((t) => t.amount === -1250).map((t) => [t.date, t.time, t.categoryId, t.counterparty])).toEqual([[today, '12:00', GROCERIES, 'Biedronka']])
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length)).toBe(1)

    // The same draft sent twice before an answer came (B51): the main window saves it once.
    quick = await quickWindow(app, page)
    const twice = { id: '01KQ0000000000000000000B51', kind: 'expense', amount: 3333, categoryId: null, accountId: ACC, date: today, time: null, counterparty: 'Dwa razy', note: '', impulse: null, logNote: '', household: false, memberId: null, advance: false, splits: [] }
    await quick.evaluate(async (draft) => {
      const fi = (globalThis as unknown as { fi: { quickAdd(d: unknown): Promise<void> } }).fi
      await Promise.all([fi.quickAdd(draft), fi.quickAdd(draft)])
    }, twice)
    await expect.poll(async () => (await operations(dir)).filter((t) => t.amount === -3333).map((t) => t.id)).toEqual([twice.id])
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length)).toBe(1)

    // The quiet hours: a confirmation and a short note first.
    quick = await quickWindow(app, page)
    await expect(quick.getByTestId('quick-amount')).toHaveValue('')
    await quick.getByTestId('quick-amount').fill('80')
    await quick.getByTestId('quick-time').fill('23:40')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-save').click()
    await expect(quick.getByTestId('quick-message')).toContainText('Cisza nocna')
    await quick.getByTestId('quick-log-note').fill('apteka nocna')
    await quick.getByTestId('quick-night-ok').check()
    await quick.getByTestId('quick-save').click()
    await expect.poll(async () => (await operations(dir)).filter((t) => t.amount === -8000).map((t) => [t.time, t.logNote])).toEqual([['23:40', 'apteka nocna']])

    // A household member's money repays what they owe first (D80): the first member („Dom”) owes for Lidl.
    quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Wpływ' }).click()
    await quick.getByTestId('quick-amount').fill('200')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-payer').selectOption({ label: 'Dom' })
    await expect(quick.getByTestId('quick-preview-member')).toContainText('wyrównuje 120,00 zł')
    await quick.getByTestId('quick-save').click()
    await expect.poll(async () => (await operations(dir)).filter((t) => t.kind === 'income').map((t) => [t.amount, t.memberId, t.repaid])).toEqual([[20000, HOUSE, 0]])
    await expect(page.getByTestId('bridge-house')).toHaveText('0,00 zł')

    // Esc closes without saving.
    quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').fill('999')
    await quick.keyboard.press('Escape')
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length)).toBe(1)
    expect((await operations(dir)).some((t) => t.amount === -99900)).toBe(false)

    // Ctrl+$: the amounts hidden on this computer (config.json), shown again.
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(page.getByTestId('bridge-house')).toHaveText('••• zł')
    await expect.poll(async () => (await json(join(userData, 'config.json'))).prefs?.hideAmounts).toBe(true)
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(page.getByTestId('bridge-house')).toHaveText('0,00 zł')

    // „Stan okrętu” in its own window (a second monitor, D45): the hidden amounts there too, a click leads the main window.
    const state = page.locator('section:not([hidden])[data-panel="bridge:Stan okrętu"]')
    const [win] = await Promise.all([app.waitForEvent('window'), state.getByTestId('panel-detach').click()])
    await win.waitForLoadState('domcontentloaded')
    await expect(win.getByTestId('detached-title')).toHaveText('Stan okrętu')
    await expect(win.getByTestId('state-shields')).toContainText('zł')
    await expect(win.getByTestId('state-shields')).not.toContainText('•••')
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(win.getByTestId('state-shields')).toContainText('••• zł')
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(win.getByTestId('state-shields')).not.toContainText('•••')
    await win.getByText('Masa ładunku').click()
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    await Promise.all([win.waitForEvent('close'), win.getByTestId('detached-attach').click().catch(() => undefined)])

    // Settings: the notifications of this computer, the orders of the folder.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-notify').click()
    await page.getByTestId('notify-evening').click()
    await expect.poll(async () => (await json(join(userData, 'config.json'))).prefs?.notify?.evening).toBe(false)
    await page.getByTestId('settings-tab-layers').click()
    await page.getByTestId('orders-cargo').fill('50')
    await page.getByTestId('orders-cargo').press('Enter')
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.orders.cargoLimitPct).toBe(50)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
