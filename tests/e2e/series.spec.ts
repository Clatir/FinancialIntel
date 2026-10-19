import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder } from './seed'

const GROCERIES = '01KDEFCAT00000000000000101'

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

const visible = (app: ElectronApplication) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length)

test('szybki wpis seriami (1.6.0, F7): Ctrl+Enter – zapisz i następny, działanie w kwocie, szablon, „wczoraj”, „Powtórz ostatni”, szkic po Esc', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    let quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').fill('12,50+8,30')
    await quick.getByTestId('quick-counterparty').fill('Kawiarnia Mokka')
    await quick.getByTestId('quick-category').selectOption(GROCERIES)
    await quick.getByTestId('quick-counterparty').press('Control+Enter')
    // Saved, and the window stays for the next one: a fresh form, the series counted, the pair as a template.
    await expect(quick.getByTestId('quick-series')).toContainText('Dopisano: 1')
    await expect(quick.getByTestId('quick-amount')).toHaveValue('')
    await expect.poll(async () => (await records(dataDir, 'transactions')).map((t) => [t.amount, t.counterparty, t.categoryId])).toEqual([[-2080, 'Kawiarnia Mokka', GROCERIES]])
    expect(await visible(app)).toBe(2)
    await quick.getByTestId('quick-template').filter({ hasText: 'Kawiarnia Mokka' }).click()
    await expect(quick.getByTestId('quick-counterparty')).toHaveValue('Kawiarnia Mokka')
    await expect(quick.getByTestId('quick-category')).toHaveValue(GROCERIES)
    await quick.getByTestId('quick-amount').fill('3*4')
    await quick.getByTestId('quick-yesterday').click()
    await quick.getByTestId('quick-amount').press('Enter')
    // Enter saves and closes (D70).
    await expect.poll(() => visible(app)).toBe(1)
    const yesterday = addDays(warsawNow().date, -1)
    await expect
      .poll(async () => (await records(dataDir, 'transactions')).filter((t) => t.amount === -1200).map((t) => [t.date, t.time]))
      .toEqual([[yesterday, null]])

    // „Powtórz ostatni”: the last one typed, today.
    quick = await quickWindow(app, page)
    await quick.getByTestId('quick-repeat').click()
    await expect(quick.getByTestId('quick-amount')).toHaveValue('12,00')
    await expect(quick.getByTestId('quick-counterparty')).toHaveValue('Kawiarnia Mokka')
    await expect(quick.getByTestId('quick-date')).toHaveValue(warsawNow().date.split('-').reverse().join('.'))
    // Esc: the draft waits for the next opening (30 min); „Wyczyść” starts afresh.
    await quick.keyboard.press('Escape')
    await expect.poll(() => visible(app)).toBe(1)
    quick = await quickWindow(app, page)
    await expect(quick.getByTestId('quick-restored')).toBeVisible()
    await expect(quick.getByTestId('quick-amount')).toHaveValue('12,00')
    await quick.getByTestId('quick-clear').click()
    await expect(quick.getByTestId('quick-amount')).toHaveValue('')
    await expect(quick.getByTestId('quick-restored')).toHaveCount(0)
    expect((await records(dataDir, 'transactions')).length).toBe(2)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('wieczorny raport wachty (1.6.0, F13): w Operacjach od godziny przypomnienia, „Dziś bez wydatków” z „Cofnij”, z menu zasobnika, „Przypomnij za 30 min”', async () => {
  // The quiet hours of one minute before midnight: the evening's hour from midnight is not moved before them (N104).
  const folder = join(mkdtempSync(join(tmpdir(), 'fi-evening-')), 'FinancialIntel')
  seedFolder(folder, { settings: (s) => ({ ...s, orders: { ...s.orders, quietHours: { from: '23:59', to: '00:00' } } }) })
  const { app, page, dataDir, errors } = await launch({ dataDir: folder })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // The evening's hour from midnight on this computer: the report is due now.
    await page.evaluate(() => (globalThis as unknown as { fi: { setMachinePrefs(p: unknown): Promise<unknown> } }).fi.setMachinePrefs({ notify: { eveningTime: '00:00' } }))
    await page.keyboard.press('Control+2')
    const report = page.getByTestId('evening-report')
    await expect(report).toContainText('Dziś nic jeszcze nie dopisano')
    await page.getByTestId('evening-nospend').click()
    await expect(report).toHaveCount(0)
    const today = warsawNow().date
    await expect.poll(async () => Object.keys((await json(join(dataDir, 'fi.json'))).settings.game.noSpend)).toEqual([today])
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click()
    await expect(report).toBeVisible()
    await expect.poll(async () => Object.keys((await json(join(dataDir, 'fi.json'))).settings.game.noSpend)).toEqual([])
    // The tray's „Dziś bez wydatków” (the window does it, whatever screen it shows).
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('quick='))!.webContents.send('fi:notificationClick', 'evening:nospend'))
    await expect(report).toHaveCount(0)
    await expect.poll(async () => Object.keys((await json(join(dataDir, 'fi.json'))).settings.game.noSpend)).toEqual([today])
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click()
    await expect(report).toBeVisible()
    // Put off: gone for 30 minutes on this computer.
    await page.getByTestId('evening-snooze').click()
    await expect(report).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
