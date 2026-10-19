// adapted from ICTTJ tests/e2e/app.ts @ 84a8339
import { mkdtempSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test'

export interface Launched {
  app: ElectronApplication
  page: Page
  dataDir: string
  userData: string
  /** Uncaught renderer errors and console.error messages. */
  errors: string[]
}

/**
 * Launch the built app (out/) or a packaged executable (FI_E2E_EXECUTABLE, used on Windows CI) with an isolated
 * user-data folder and a preselected data folder (`usePreset: false` = the first-run screen).
 */
export async function launch(
  opts: { dataDir?: string; userData?: string; machine?: string; usePreset?: boolean; env?: Record<string, string>; args?: string[]; hidden?: boolean } = {}
): Promise<Launched> {
  const base = mkdtempSync(join(tmpdir(), 'fi-e2e-'))
  const dataDir = opts.dataDir ?? join(base, 'FinancialIntel')
  const userData = opts.userData ?? join(base, 'userData')
  const env = {
    ...process.env,
    FI_USER_DATA: userData,
    FI_DATA_DIR: dataDir,
    FI_MACHINE_NAME: opts.machine ?? 'E2E-PC',
    // The proposal of the first-run screen: a folder of this test, never the machine's OneDrive.
    FI_DEFAULT_DATA_DIR: join(base, 'OneDrive', 'FinancialIntel'),
    // No test talks to the real api.github.com; the update test passes a local server.
    FI_UPDATE_URL: 'http://127.0.0.1:9',
    FI_UPDATE_CHECK_DELAY_MS: '3600000',
    // The game's first freeze waits after the opening (B33): not in tests that do not test it.
    FI_FREEZE_AFTER_OPEN_MS: '0',
    FI_FREEZE_QUIET_MS: '0',
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    ...opts.env
  } as Record<string, string>
  delete env.ELECTRON_RENDERER_URL
  if (opts.usePreset === false) delete env.FI_DATA_DIR
  const executable = process.env.FI_E2E_EXECUTABLE
  const app = executable
    ? await electron.launch({ executablePath: executable, env, args: [...(process.platform === 'win32' ? [] : ['--no-sandbox']), ...(opts.args ?? [])] })
    : await electron.launch({ args: [resolve('.'), '--no-sandbox', ...(opts.args ?? [])], env })
  const page = await app.firstWindow()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  await page.waitForLoadState('domcontentloaded')
  // The window is created hidden and shown on 'ready-to-show': a screenshot or a click before that fails on a cold
  // start (the first test of a run), so every test starts with the window on screen – but one started in the tray.
  if (!opts.hidden)
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.isVisible())), { timeout: 30_000 }).toBe(true)
  // Stable screenshots: no transitions.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  return { app, page, dataDir, userData, errors }
}

/**
 * Runs an assertion; when it fails, the end of the app's main log (userData/logs/main.log) is added to the error, so a
 * failure on CI shows what the main process saw.
 */
export async function withMainLog<T>(userData: string, run: () => Promise<T>, lines = 40): Promise<T> {
  try {
    return await run()
  } catch (e) {
    const log = await readFile(join(userData, 'logs', 'main.log'), 'utf8').catch(() => '(brak main.log)')
    const tail = log.split(/\r?\n/).slice(-lines).join('\n')
    if (e instanceof Error) e.message += `\n--- main.log (koniec) ---\n${tail}`
    throw e
  }
}

/**
 * Clicks a button that closes its own window and waits for the window to close. The window can go while the click is
 * still in flight ("Target page … has been closed" on a slow machine), so the closing is the check, not the click.
 */
export async function clickClosing(win: Page, testId: string): Promise<void> {
  await Promise.all([
    win.waitForEvent('close'),
    win.getByTestId(testId).click().catch((e: unknown) => {
      if (!win.isClosed()) throw e
    })
  ])
}
