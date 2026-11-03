/**
 * Helpers of the audit's areas US / IN (Ustawienia, interfejs): a run on a copy of a persona's state, the tabs of the
 * settings, the files of the run. An observation tool – it prints what the screen says; the verdicts are written by hand.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type Locator, type Page } from '@playwright/test'
import { LAB, note, recorded, shot, start, text, useState, type Run } from './lab'

export { note, recorded, text }

export interface RunOpts {
  state?: string
  prepare?: (dataDir: string, userData: string) => void
  prefs?: Record<string, unknown>
  env?: Record<string, string>
  machine?: string
  idle?: boolean
  /** Write config.json (machine prefs) before the start. */
  config?: (c: Record<string, any>) => void
}

export const userDataOf = (name: string): string => join(LAB, 'przebiegi', name, 'userdata')
export const dataDirOf = (name: string): string => join(LAB, 'przebiegi', name, 'dane')
export const configOf = (name: string): Record<string, any> => JSON.parse(readFileSync(join(userDataOf(name), 'config.json'), 'utf8'))
export const fiOf = (name: string): Record<string, any> => JSON.parse(readFileSync(join(dataDirOf(name), 'fi.json'), 'utf8'))

async function ready(r: Run): Promise<Run> {
  r.page.setDefaultTimeout(15_000)
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.page.waitForTimeout(1200)
  return r
}

/** A run on a fresh copy of a state (default „rok”). */
export async function run(name: string, o: RunOpts = {}): Promise<Run> {
  const { dataDir, ictjDir } = useState(o.state ?? 'rok', name)
  if (o.prepare || o.config) {
    // The user data folder is made by start(); prepare sees dataDir only unless the config is given afterwards.
    o.prepare?.(dataDir, userDataOf(name))
  }
  const r = await start(name, { dataDir, ictjDir, prefs: o.prefs, env: o.env, machine: o.machine, idle: o.idle })
  return ready(r)
}

/** The same run started again (fresh: false): user data kept. `edit` may change config.json before. */
export async function restart(name: string, o: { prefs?: Record<string, unknown>; env?: Record<string, string>; machine?: string; edit?: (c: Record<string, any>) => void; ictjDir?: string } = {}): Promise<Run> {
  if (o.edit) {
    const f = join(userDataOf(name), 'config.json')
    const c = JSON.parse(readFileSync(f, 'utf8'))
    o.edit(c)
    writeFileSync(f, JSON.stringify(c, null, 2))
  }
  const r = await start(name, { dataDir: dataDirOf(name), ictjDir: o.ictjDir, fresh: false, prefs: o.prefs, env: o.env, machine: o.machine })
  return ready(r)
}

/** A run on a folder prepared by the caller (an empty `dane` made of the state, then `edit`). */
export function editFi(dataDir: string, change: (fi: Record<string, any>) => void): void {
  const f = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(f, 'utf8'))
  change(fi)
  writeFileSync(f, `${JSON.stringify(fi, null, 2)}\n`)
}

export function say(label: string, value: unknown): void {
  const s = typeof value === 'string' ? value : JSON.stringify(value, null, 1)
  console.log(`\n### ${label}\n${s}`)
}

export async function step(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
  } catch (e) {
    console.log(`\n### KROK NIEUDANY: ${label}\n${(e as Error).message.split('\n').slice(0, 6).join('\n')}`)
  }
}

export async function snap(page: Page, id: string): Promise<void> {
  console.log(`[zrzut] ${await shot(page, id)}`)
}

export async function goSettings(page: Page, tab?: string): Promise<void> {
  if (!(await page.getByTestId('settings-tab-general').count())) await page.keyboard.press('Control+,')
  await page.getByTestId(`settings-tab-${tab ?? 'general'}`).waitFor()
  if (tab) await page.getByTestId(`settings-tab-${tab}`).click()
  await page.waitForTimeout(500)
}

/** Text of the settings' content (right pane) without the tab list. */
export async function pane(page: Page): Promise<string> {
  return text(page, 'main')
}

export const toasts = (page: Page): Promise<string[]> => page.getByRole('status').allInnerTexts().catch(() => [])

/** Click, fill and a key into a field (amount fields need the click first). */
export async function typeIn(page: Page, target: string | Locator, value: string, key: 'Enter' | 'Tab' | 'Escape' | null = 'Enter'): Promise<void> {
  const f = typeof target === 'string' ? page.getByTestId(target) : target
  await f.click()
  await f.fill(value)
  if (key) await f.press(key)
  await page.waitForTimeout(350)
}

/** A text of an element that may be absent. */
export async function opt(loc: Locator): Promise<string> {
  if (!(await loc.count())) return '(brak)'
  return loc.first().innerText()
}

export const exists = (p: string): boolean => existsSync(p)
export { expect }

/** The audio of every window of the app muted (the lab must not play sounds on the user's speakers). */
export async function mute(app: import('@playwright/test').ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.setAudioMuted(true)
  })
}

/** The quick entry's window (opened with window.fi.quickOpen()). */
export async function quickWin(app: import('@playwright/test').ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  await mute(app)
  return found!
}

/** Typed like a user (key by key, so maxLength applies): the field cleared first. */
export async function typed(page: Page, target: string | Locator, value: string, key: 'Enter' | 'Tab' | 'Escape' | null = 'Enter'): Promise<void> {
  const f = typeof target === 'string' ? page.getByTestId(target) : target
  await f.click()
  await f.press('Control+a')
  await f.press('Delete')
  if (value) await f.pressSequentially(value)
  if (key) await f.press(key)
  await page.waitForTimeout(400)
}

export const PL = 'Żółw Gęślą Jaźń'
