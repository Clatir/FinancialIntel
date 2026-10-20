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
    // The new files of mBank (F14): a folder of this test, never the machine's Pobrane.
    FI_DOWNLOADS_DIR: join(base, 'Pobrane'),
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
  guardClose(app, userData)
  return { app, page, dataDir, userData, errors }
}

/** How long a test's `app.close()` may take (a normal close takes a second or two; the writes drain at most 30 s). */
const CLOSE_LIMIT_MS = 40_000

/**
 * `app.close()` that never hangs the run: a close held by the app – the main process blocked by its question about
 * unsaved changes – ends the app and fails with the end of main.log, instead of the test's timeout and minutes of the
 * worker's teardown with no word of the reason (Windows CI, 1.10.0).
 */
function guardClose(app: ElectronApplication, userData: string): void {
  const close = app.close.bind(app)
  app.close = async () => {
    let timer: NodeJS.Timeout | undefined
    const closing = close()
    const done = await Promise.race([
      closing.then(() => true),
      new Promise<false>((r) => {
        timer = setTimeout(() => r(false), CLOSE_LIMIT_MS)
      })
    ]).finally(() => clearTimeout(timer))
    if (done) return
    closing.catch(() => undefined)
    const log = await readFile(join(userData, 'logs', 'main.log'), 'utf8').catch(() => '(brak main.log)')
    // SIGKILL: Electron answers SIGTERM by quitting – which the blocked main process never gets to.
    app.process().kill('SIGKILL')
    throw new Error(`Aplikacja nie zamknęła się w ${CLOSE_LIMIT_MS / 1000} s\n--- main.log (koniec) ---\n${log.split(/\r?\n/).slice(-40).join('\n')}`)
  }
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
 * Hundreds of files written or deleted at once (an import, its undo): a slow Windows runner of CI takes over the default
 * 10 s for them (1.6.5 on main, 1.6.6 – every test there 1.5–2.5× slower), so these waits are longer.
 */
export const MASS = { timeout: 30_000 }

/**
 * An import's summary – shown once all its records are on the disk: as long as a mass step may take (MASS), for every
 * import of a test (T301: the runner's disk at times over 2× slower for a minute – 10 s were not enough in PR #35 and #36);
 * a failure brings what the window said (its messages) and the end of main.log.
 */
export async function importDone(page: Page, userData: string): Promise<void> {
  await withMainLog(userData, async () => {
    try {
      await expect(page.getByTestId('import-done')).toBeVisible(MASS)
    } catch (e) {
      const said = await page.getByRole('status').allTextContents().catch(() => [] as string[])
      if (e instanceof Error) e.message += `\n--- komunikaty okna ---\n${said.join('\n') || '(brak)'}`
      throw e
    }
  })
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
