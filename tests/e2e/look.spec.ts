import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

/** A budget running since last month: an opening balance and spending every few days (a wealth curve of weeks). */
function budget(): string {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-look-')), 'FinancialIntel')
  const transactions = []
  for (let d = start; d < today; d = addDays(d, 4)) transactions.push({ date: d, accountId: MBANK, amount: -zl(40), categoryId: FOOD, counterparty: 'Sklep' })
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(9000) }],
      months: [{ month: start.slice(0, 7), salary: zl(3000), envelopes: { [FOOD]: zl(600) } }],
      transactions
    }
  })
  return dataDir
}

/** This computer's config.json before the start (its preferences). */
function machine(prefs: Record<string, unknown>): string {
  const userData = join(mkdtempSync(join(tmpdir(), 'fi-look-user-')), 'userData')
  mkdirSync(userData, { recursive: true })
  writeFileSync(join(userData, 'config.json'), `${JSON.stringify({ prefs }, null, 2)}\n`)
  return userData
}

/** The window's side (evaluated in the page – the tests are typed without the DOM). */
type Win = {
  fi: { quickOpen(): Promise<void>; revealAmounts(minutes: number | null): Promise<unknown> }
  document: { documentElement: { dataset: Record<string, string | undefined> } }
  getComputedStyle(e: unknown): { fontSize: string }
}

const zoomOf = (app: ElectronApplication) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => Math.round(w.webContents.getZoomFactor() * 100)))
const prefsOf = async (userData: string) => JSON.parse(await readFile(join(userData, 'config.json'), 'utf8')).prefs ?? {}
/** How many times the idleness hid the amounts (the main log). */
const idleHides = async (userData: string) => ((await readFile(join(userData, 'logs', 'main.log'), 'utf8').catch(() => '')).match(/kwoty ukryte: \d+ min bez ruchu/g) ?? []).length

test('rozmiar interfejsu i wyższy kontrast (1.6.6, F30): Ctrl+Plus / Ctrl+Minus / Ctrl+Shift+0 we wszystkich oknach, suwak, kontrast', async () => {
  const { app, page, userData, errors } = await launch({ dataDir: budget() })
  const quickSize = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.isVisible() && w.isAlwaysOnTop()).map((w) => [Math.round(w.webContents.getZoomFactor() * 100), ...w.getSize()]))
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // The quick entry made at 100 % first – a later size changes the window already there.
    await page.evaluate(() => (globalThis as unknown as Win).fi.quickOpen())
    await expect.poll(quickSize).toEqual([[100, 440, 600]])
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.isAlwaysOnTop())?.hide())
    await page.bringToFront()
    await page.keyboard.press('Control+Equal')
    await expect.poll(() => zoomOf(app)).toContain(110)
    await expect.poll(async () => (await prefsOf(userData)).zoom).toBe(1.1)
    await page.keyboard.press('Control+Minus')
    await page.keyboard.press('Control+Minus')
    await page.keyboard.press('Control+Minus')
    // Never under 90 %.
    await expect.poll(async () => (await prefsOf(userData)).zoom).toBe(0.9)
    // Ctrl+Shift+0: 100 % – not Raporty (Ctrl+0).
    await page.keyboard.press('Control+Shift+Digit0')
    await expect.poll(async () => (await prefsOf(userData)).zoom).toBe(1)
    await expect(page.getByTestId('page-bridge')).toBeVisible()

    // The quick entry grows with the size of this computer.
    for (let i = 0; i < 5; i++) await page.keyboard.press('Control+Equal')
    await expect.poll(async () => (await prefsOf(userData)).zoom).toBe(1.5)
    await page.evaluate(() => (globalThis as unknown as Win).fi.quickOpen())
    // As big as the screen lets it (the work area – the Windows CI screen is 720 px high).
    const area = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().workAreaSize)
    const fitted = (zoom: number, w: number, h: number) => [[zoom, Math.min(w, area.width), Math.min(h, area.height)]]
    await expect.poll(quickSize).toEqual(fitted(150, 660, 900))
    // Ctrl+Minus in the quick entry itself: the open window gets smaller with its content.
    const quick = app.windows().find((w) => w.url().includes('quick=1'))!
    await quick.keyboard.press('Control+Minus')
    await expect.poll(quickSize).toEqual(fitted(140, 616, 840))
    await expect.poll(async () => (await prefsOf(userData)).zoom).toBe(1.4)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.isAlwaysOnTop())?.hide())

    // Ustawienia → Wygląd i prywatność: 100 % and the higher contrast.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-view').click()
    await expect(page.getByTestId('settings-zoom-value')).toHaveText('140%')
    await page.getByTestId('settings-zoom-reset').click()
    await expect.poll(async () => (await prefsOf(userData)).zoom).toBe(1)
    await expect.poll(() => zoomOf(app)).toEqual([100, 100])
    const small = page.locator('.text-\\[11\\.5px\\]').first()
    expect(await small.evaluate((e) => (globalThis as unknown as Win).getComputedStyle(e).fontSize)).toBe('11.5px')
    await page.getByTestId('settings-contrast').click()
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as Win).document.documentElement.dataset.contrast ?? null)).toBe('high')
    // The computed size follows the attribute, but Chromium may give it for some elements a frame later (CI: 11.5 px
    // right after, 12 px about 20 ms on – nothing of the app changed meanwhile): polled, as the other assertions.
    await expect.poll(() => small.evaluate((e) => (globalThis as unknown as Win).getComputedStyle(e).fontSize)).toBe('12px')
    await expect.poll(async () => (await prefsOf(userData)).highContrast).toBe(true)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('kwoty ukryte po bezczynności (1.6.6, F40): „Pokaż na 5 min”, „do końca sesji”, Ctrl+$ wraca do ukrywania', async () => {
  const userData = machine({ hideIdleMin: 1 })
  // The system idle for 2 minutes, looked at often.
  const { app, page, errors } = await launch({ dataDir: budget(), userData, env: { FI_SYSTEM_IDLE: '120', FI_IDLE_CHECK_MS: '200' } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    await expect(page.getByTestId('state-shields')).toContainText('•••')
    await expect.poll(async () => (await prefsOf(userData)).hideAmounts).toBe(true)

    // Shown for a while: the idleness does not hide them meanwhile.
    await page.getByTestId('reveal-5').click()
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)
    await page.waitForTimeout(1200)
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)
    await expect(page.getByTestId('state-shields')).not.toContainText('•••')
    // Hidden by hand, shown for a while (here 0.6 s): the end of the while hides them – not the idleness.
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    await page.evaluate(() => (globalThis as unknown as Win).fi.revealAmounts(0.01))
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    expect(await idleHides(userData)).toBe(1)

    // For the session: no hiding by the idleness.
    await page.getByTestId('reveal-session').click()
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)
    await page.waitForTimeout(1200)
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)

    // The locked screen hides them – also after „do końca sesji” – and the idleness from then on (its second time).
    await app.evaluate(({ powerMonitor }) => powerMonitor.emit('lock-screen'))
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    expect(await idleHides(userData)).toBe(1)
    await page.keyboard.press('Control+Shift+Digit4')
    await expect.poll(() => idleHides(userData)).toBe(2)
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()

    // Hidden by hand after „do końca sesji” and shown again: the idleness hides them from then on.
    await page.getByTestId('reveal-session').click()
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    await page.keyboard.press('Control+Shift+Digit4')
    await expect.poll(() => idleHides(userData)).toBe(3)
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('start z ukrytymi kwotami (1.6.6, F40); krzywa majątku na Mostku z przejściem do Wywiadu (N58)', async () => {
  // 20 minutes – a time not on the list of the settings (a hand-edited file).
  const userData = machine({ hideOnStart: true, hideIdleMin: 20 })
  const { app, page, errors } = await launch({ dataDir: budget(), userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    await expect(page.getByTestId('state-shields')).toContainText('•••')
    await page.getByTestId('reveal-session').click()
    await expect(page.getByTestId('state-shields')).not.toContainText('•••')
    // Shown: no „Pokaż ukryte kwoty…” in the palette, and a showing for a while hides nothing later.
    await page.keyboard.press('Control+K')
    await page.getByTestId('palette-input').fill('Pokaż ukryte kwoty')
    await expect(page.getByRole('option', { name: /Pokaż ukryte kwoty/ })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.evaluate(() => (globalThis as unknown as Win).fi.revealAmounts(0.01))
    await page.waitForTimeout(1200)
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)
    // The time from the file shown as it is.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-view').click()
    await expect(page.getByTestId('settings-hide-idle')).toHaveValue('20')
    await page.keyboard.press('Control+1')

    await expect.poll(async () => Number(await page.getByTestId('bridge-wealth-chart').getAttribute('data-points'))).toBeGreaterThan(2)
    await expect(page.getByTestId('bridge-wealth')).toContainText('Na kontach budżetu')
    await page.getByTestId('bridge-wealth-open').click()
    await expect(page.getByTestId('page-intel')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('config.json nieczytelny przy starcie (1.6.6, F40): „Startuj z ukrytymi kwotami” działa, gdy plik da się odczytać', async () => {
  // Held by an antivirus at the start with Windows: here a folder in its place – not a file the app can read.
  const userData = join(mkdtempSync(join(tmpdir(), 'fi-look-user-')), 'userData')
  mkdirSync(join(userData, 'config.json'), { recursive: true })
  const { app, page, errors } = await launch({ dataDir: budget(), userData, env: { FI_CONFIG_RETRY_MS: '300' } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)
    rmSync(join(userData, 'config.json'), { recursive: true })
    writeFileSync(join(userData, 'config.json'), `${JSON.stringify({ prefs: { hideOnStart: true } }, null, 2)}\n`)
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    await expect.poll(async () => (await prefsOf(userData)).hideAmounts).toBe(true)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
