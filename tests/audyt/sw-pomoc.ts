/**
 * Helpers of the audit's area SW (the quick entry, docs/audyt/punkty/1-start-mostek-wpis.md): the persona „rok” copied
 * for a run, the quick window opened as the E2E tests do (`window.fi.quickOpen()`), what it and the Mostek say read as
 * text. Observation only – the verdicts are written by hand into docs/audyt/raport/SW.md.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type ElectronApplication, type Page } from '@playwright/test'
import { records } from '../e2e/files'
import { note, shot, start, text, useState, type Run, type StartOptions } from './lab'

export const ACC = { mbank: '01KDEFACC00000000000000001', xtb: '01KDEFACC00000000000000002', cash: '01KDEFACC00000000000000003' }
export const CAT = {
  food: '01KDEFCAT00000000000000100',
  groceries: '01KDEFCAT00000000000000101',
  coffee: '01KDEFCAT00000000000000103',
  home: '01KDEFCAT00000000000000200',
  chem: '01KDEFCAT00000000000000204',
  auto: '01KDEFCAT00000000000000300',
  fuel: '01KDEFCAT00000000000000301',
  pets: '01KDEFCAT00000000000000400',
  petFood: '01KDEFCAT00000000000000401',
  health: '01KDEFCAT00000000000000500',
  meds: '01KDEFCAT00000000000000501',
  subs: '01KDEFCAT00000000000000700',
  streaming: '01KDEFCAT00000000000000703',
  personal: '01KDEFCAT00000000000000800',
  clothes: '01KDEFCAT00000000000000801',
  gifts: '01KDEFCAT00000000000000900',
  gift: '01KDEFCAT00000000000000901'
}
export const MEM = { anna: '01KDEFMEM00000000000000001', kasia: '01KAZ200000000000000000002', marek: '01KAZ200000000000000000003' }

const out: string[] = []
/** A line of the run's observation log (printed and kept in C:\FI-audyt\przebiegi\<run>\przebieg.log). */
export function log(run: string, ...parts: unknown[]): void {
  const line = parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')
  out.push(line)
  console.log(line)
  note(run, line)
}

/** fi.json of a run's copy changed before the start (a special state – described in the report). */
export function editFi(dataDir: string, change: (fi: { settings: Record<string, any> }) => void): void {
  const f = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(f, 'utf8'))
  change(fi)
  writeFileSync(f, `${JSON.stringify(fi, null, 2)}\n`)
}

/** The persona „rok” for a run; `prepare` changes the copy before the start. */
export async function openRok(run: string, prepare?: (dataDir: string) => void, opts: StartOptions = {}): Promise<Run> {
  const { dataDir, ictjDir } = useState('rok', run)
  prepare?.(dataDir)
  return startOn(run, dataDir, ictjDir, opts)
}

export async function startOn(run: string, dataDir: string, ictjDir: string | undefined, opts: StartOptions = {}): Promise<Run> {
  const r = await start(run, { dataDir, ictjDir, ...opts })
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.page.waitForTimeout(2500)
  return r
}

/** The quick window's page (one window: created once, shown again). */
export function quickPage(app: ElectronApplication): Page | undefined {
  return app.windows().find((w) => w.url().includes('quick=1'))
}

export async function quickVisible(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes('quick=1') && w.isVisible()))
}

export async function quickWindows(app: ElectronApplication): Promise<number> {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('quick=1')).length)
}

/** Open the quick window as the tests do and wait for its data (the amount field). */
export async function openQuick(app: ElectronApplication, page: Page, how: 'api' | 'button' | 'palette' = 'api'): Promise<Page> {
  if (how === 'api') await page.evaluate('window.fi.quickOpen()')
  else if (how === 'button') await page.getByTestId('bridge-quick').click()
  else {
    await page.keyboard.press('Control+K')
    await page.getByTestId('palette-input').fill('Szybki wpis')
    await page.waitForTimeout(300)
    await page.keyboard.press('Enter')
  }
  let q: Page | undefined
  await expect.poll(() => (q = quickPage(app)), { timeout: 20_000 }).toBeTruthy()
  await expect.poll(() => quickVisible(app), { timeout: 20_000 }).toBe(true)
  await expect(q!.getByTestId('quick-amount')).toBeVisible({ timeout: 20_000 })
  await q!.waitForTimeout(400)
  return q!
}

/** Wait until the quick window hides (after Enter / Esc). */
export async function waitHidden(app: ElectronApplication, ms = 5000): Promise<boolean> {
  const until = Date.now() + ms
  while (Date.now() < until) {
    if (!(await quickVisible(app))) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

export const qtext = (q: Page) => text(q, '[data-testid="quick-entry"]')

/** What the window says, in one line per part. */
export async function qread(q: Page): Promise<Record<string, string | null>> {
  const t = async (id: string) => ((await q.getByTestId(id).count()) ? (await q.getByTestId(id).first().innerText()).replace(/\s+/g, ' ').trim() : null)
  const v = async (id: string) => ((await q.getByTestId(id).count()) ? await q.getByTestId(id).first().inputValue() : null)
  const sel = async (id: string) =>
    (await q.getByTestId(id).count()) ? await q.getByTestId(id).first().evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent ?? '') : null
  return {
    header: await q.locator('[data-testid="quick-entry"] > div').first().innerText().then((x) => x.replace(/\s+/g, ' ').trim()),
    kind: await q.locator('[role="radiogroup"][aria-label="Rodzaj"] [aria-checked="true"]').innerText().catch(() => null),
    amount: await v('quick-amount'),
    counterparty: await v('quick-counterparty'),
    category: await sel('quick-category'),
    officer: await t('quick-officer'),
    account: await sel('quick-account'),
    date: await v('quick-date'),
    time: await v('quick-time'),
    preview: await t('quick-preview'),
    log: await t('quick-log'),
    message: await t('quick-message'),
    footer: await q.locator('[data-testid="quick-entry"] > div').last().innerText().then((x) => x.replace(/\s+/g, ' ').trim()),
    focus: await q.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset?.testid ?? document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? null)
  }
}

/** An amount typed as a user does: a click, the text, then out of the field (Tab). */
export async function typeAmount(q: Page, value: string, leave: 'Tab' | null = 'Tab'): Promise<void> {
  const f = q.getByTestId('quick-amount')
  await f.click()
  await f.fill(value)
  if (leave) await f.press(leave)
  await q.waitForTimeout(150)
}

export async function typeIn(q: Page, testId: string, value: string, leave: 'Tab' | null = 'Tab'): Promise<void> {
  const f = q.getByTestId(testId)
  await f.click()
  await f.fill(value)
  if (leave) await f.press(leave)
  await q.waitForTimeout(150)
}

export async function kind(q: Page, label: 'Wydatek' | 'Wpływ' | 'Za domownika'): Promise<void> {
  await q.locator('[role="radiogroup"][aria-label="Rodzaj"]').getByRole('radio', { name: label }).click()
  await q.waitForTimeout(150)
}

export async function category(q: Page, id: string | '', testId = 'quick-category'): Promise<void> {
  await q.getByTestId(testId).first().selectOption(id)
  await q.waitForTimeout(150)
}

/** The Mostek's numbers as text (Ctrl+1 first). */
export async function bridge(page: Page): Promise<Record<string, string>> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(800)
  const t = async (id: string) => ((await page.getByTestId(id).count()) ? (await page.getByTestId(id).first().innerText()).replace(/\s+/g, ' ').trim() : '')
  return {
    energy: await t('bridge-energy'),
    energyLines: await t('bridge-energy-lines'),
    state: await t('bridge-state'),
    envelopes: await t('bridge-envelopes'),
    receivables: await t('bridge-receivables'),
    recent: (await page.getByTestId('bridge-recent-row').allInnerTexts()).slice(0, 4).map((x) => x.replace(/\s+/g, ' ')).join(' | ')
  }
}

/** Every operation of the folder by id. */
export async function ops(dataDir: string): Promise<Map<string, Record<string, unknown>>> {
  return new Map((await records(dataDir, 'transactions')).map((t) => [t.id as string, t]))
}

/** The operations added since `before`. */
export async function added(dataDir: string, before: Map<string, Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
  return [...(await ops(dataDir)).values()].filter((t) => !before.has(t.id as string))
}

export async function snap(page: Page, id: string): Promise<string> {
  return shot(page, id)
}

/** A short form of an operation for the log. */
export function brief(t: Record<string, unknown>): Record<string, unknown> {
  const keys = ['date', 'time', 'kind', 'amount', 'accountId', 'categoryId', 'counterparty', 'refundable', 'memberId', 'advance', 'gift', 'share', 'splits', 'tags', 'impulse', 'logNote', 'note', 'updatedBy', 'inflowKind', 'covers']
  const o: Record<string, unknown> = {}
  for (const k of keys) if (t[k] !== undefined && !(Array.isArray(t[k]) && !(t[k] as unknown[]).length)) o[k] = t[k]
  return o
}

/** Members of the points' examples (special state: added to fi.json with their balances at the settlements' start). */
export const SWM = {
  tata: '01KSWMEM000000000000000001',
  mama: '01KSWMEM000000000000000002',
  ania: '01KSWMEM000000000000000003',
  lukasz: '01KSWMEM000000000000000004',
  babcia: '01KSWMEM000000000000000005'
}

export function addMembers(dataDir: string): void {
  editFi(dataDir, (fi) => {
    const m = (id: string, name: string, inflow: string, owed: number, deposit: number, via: string | null = null) => ({ id, name, bankNames: [], inflow, archived: false, via, opening: { owed, deposit } })
    fi.settings.household.members.push(
      m(SWM.tata, 'Tata', 'ask', 18000, 0),
      m(SWM.mama, 'Mama', 'ask', 9000, 0, SWM.tata),
      m(SWM.ania, 'Ania', 'income', 0, 0),
      m(SWM.lukasz, 'Łukasz', 'advance', 0, 5000),
      m(SWM.babcia, 'Babcia', 'ask', 0, 0)
    )
  })
}

/** Ustawienia → Domownicy: each member's „reszta wpłaty” choice and balance. */
export async function memberSettings(page: Page): Promise<string> {
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('settings-tab-household').click()
  await page.waitForTimeout(800)
  const rows = page.getByTestId('member-row')
  const outv: string[] = []
  for (let i = 0; i < (await rows.count()); i++) {
    const r = rows.nth(i)
    const name = await r.getAttribute('data-name')
    const inflow = await r.locator('[role="radiogroup"][aria-label="Reszta wpłaty domownika"] [aria-checked="true"]').innerText().catch(() => '?')
    const bal = (await r.getByTestId('member-balance').count()) ? await r.getByTestId('member-balance').innerText() : '—'
    outv.push(`${name}: ${inflow}, ${bal}`)
  }
  await page.keyboard.press('Control+1')
  return outv.join(' | ')
}

/** Radar (Ctrl+7): the lines about the household members. */
export async function radarMembers(page: Page, names: string[]): Promise<string> {
  await page.keyboard.press('Control+7')
  await page.waitForTimeout(1500)
  const t = await text(page, 'main')
  const lines = t.split('\n').map((x) => x.trim())
  const outv: string[] = []
  lines.forEach((l, i) => {
    if (names.some((n) => l === n || l.startsWith(`${n} `) || l.startsWith(`${n}:`))) outv.push(lines.slice(i, i + 4).join(' / '))
  })
  await page.keyboard.press('Control+1')
  return outv.join(' || ')
}

/** Save with Enter from a field and wait for the window to hide; returns the footer's message seen first. */
export async function enterSave(app: ElectronApplication, q: Page, fromTestId = 'quick-amount', key = 'Enter'): Promise<string> {
  const read = async () => ((await q.getByTestId('quick-message').count()) ? await q.getByTestId('quick-message').innerText().catch(() => '') : '')
  const old = await read()
  await q.getByTestId(fromTestId).first().press(key)
  let msg = ''
  const until = Date.now() + 4000
  while (Date.now() < until) {
    const m = await read()
    // A new answer (or the same text again after the message was cleared by the sending).
    if (m && m !== old) {
      msg = m
      break
    }
    if (!(await quickVisible(app))) {
      msg = '(okno zamknięte)'
      break
    }
    await q.waitForTimeout(25)
  }
  if (!msg) msg = (await read()) || '(brak komunikatu)'
  if (key === 'Enter' && msg.startsWith('Zapisano')) await waitHidden(app)
  await q.waitForTimeout(300)
  return msg
}

/** The window opened with a clean form: a draft kept from an earlier Esc (SW.30) cleared by „Wyczyść”. */
export async function openFresh(app: ElectronApplication, page: Page): Promise<Page> {
  const q = await openQuick(app, page)
  if (await q.getByTestId('quick-clear').count()) {
    await q.getByTestId('quick-clear').click()
    await q.waitForTimeout(300)
  }
  return q
}
