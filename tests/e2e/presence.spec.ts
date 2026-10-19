import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

/** A budget whose game has days to freeze (it started 10 days ago). */
function gameFolder(prefix: string): string {
  const { date: today, month } = warsawNow()
  const budget = `${addMonths(month, -3)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), prefix)), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: budget }, game: { ...s.game, start: addDays(today, -10) } }),
    records: {
      balances: [{ date: budget, accountId: MBANK, kind: 'opening', amount: zl(40000) }],
      months: [{ month: addMonths(month, -3), salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }]
    }
  })
  return dataDir
}

const frozenDays = async (dir: string) => (await records(dir, 'game')).reduce((n, g) => n + Object.keys(g.days as object).length, 0)

test('dwa komputery (1.5.3, N20, F21): baner tylko dla komputera w użyciu, w Synchronizacji – w użyciu / w zasobniku', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-presence-')), 'FinancialIntel')
  seedFolder(dataDir, {})
  const now = Date.now()
  const presence = (name: string, data: Record<string, unknown>) => {
    mkdirSync(join(dataDir, '.presence'), { recursive: true })
    writeFileSync(join(dataDir, '.presence', `${name}.json`), `${JSON.stringify({ machine: name, lastSeen: new Date(now).toISOString(), appVersion: '1.5.3', ...data }, null, 2)}\n`)
  }
  // The laptop used a minute ago; the desktop in the tray (its last move 20 minutes ago).
  presence('LAPTOP', { activeAt: new Date(now - 60_000).toISOString() })
  presence('DESKTOP', { activeAt: new Date(now - 20 * 60_000).toISOString() })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('banner-other')).toContainText('w użyciu na: LAPTOP')
    await expect(page.getByTestId('banner-other')).not.toContainText('DESKTOP')
    // This computer says it is in use.
    await expect.poll(async () => typeof (await json(join(dataDir, '.presence', 'E2E-PC.json')).catch(() => ({}))).activeAt).toBe('string')

    await page.getByTestId('nav-sync').click()
    await expect(page.locator('[data-testid="sync-machine"][data-in-use="yes"]')).toContainText('LAPTOP – w użyciu')
    await expect(page.locator('[data-testid="sync-machine"][data-in-use="no"]')).toContainText('DESKTOP – w zasobniku')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('komputer w zasobniku nie zamraża dni gry (1.5.3, D86): uruchomiony z systemem nic nie pisze, po pokazaniu okna – tak', async () => {
  const dataDir = gameFolder('fi-presence-tray-')
  const { app, page, errors } = await launch({ dataDir, args: ['--hidden'], hidden: true })
  try {
    // Started with the system into the tray: the folder is open (its presence written), not in use.
    await expect.poll(async () => (await json(join(dataDir, '.presence', 'E2E-PC.json')).catch(() => ({ activeAt: 'no file yet' }))).activeAt, { timeout: 20_000 }).toBeNull()
    await page.waitForTimeout(3000)
    expect(await frozenDays(dataDir)).toBe(0)
    // The window brought up from the tray: in use – the days due are frozen.
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows().find((x) => !x.webContents.getURL().includes('quick=1'))!
      w.show()
      w.focus()
    })
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect.poll(() => frozenDays(dataDir), { timeout: 20_000 }).toBeGreaterThan(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('pierwsze zamrożenie dni po otwarciu folderu czeka (1.5.3, B33): OneDrive najpierw przynosi zmiany drugiego komputera', async () => {
  const dataDir = gameFolder('fi-presence-delay-')
  const { app, page, errors } = await launch({ dataDir, env: { FI_FREEZE_AFTER_OPEN_MS: '5000' } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.waitForTimeout(2000)
    expect(await frozenDays(dataDir)).toBe(0)
    await expect.poll(() => frozenDays(dataDir), { timeout: 20_000 }).toBeGreaterThan(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
