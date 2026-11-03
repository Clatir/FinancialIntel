// Helpers of the audit's Dowództwo area (DW): dumps of screen texts to the run's folder, the command screen read panel by
// panel, toasts of the window, the quick entry window. Observation only – no assertions about the app.
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ElectronApplication, Locator, Page } from '@playwright/test'
import { LAB } from './lab'

export function out(run: string): (name: string, content: unknown) => void {
  const dir = join(LAB, 'przebiegi', run, 'out')
  mkdirSync(dir, { recursive: true })
  return (name, content) => {
    const s = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    writeFileSync(join(dir, `${name.replace(/[^\w.-]+/g, '_')}.txt`), `${s}\n`)
    appendFileSync(join(dir, '_log.txt'), `== ${name} @ ${new Date().toISOString()}\n${s}\n`)
  }
}

/** Text of a locator or a note that it is not there. */
export async function textOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak elementu)'
  return (await l.first().innerText()).trim()
}

/** Go to a screen with Ctrl+<key> and wait for it. */
export async function go(page: Page, key: string, testId: string): Promise<void> {
  await page.keyboard.press(`Control+${key}`)
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(600)
}

/** The command screen, panel by panel (texts, the strip's day titles, the log's entries). */
export async function command(page: Page): Promise<Record<string, unknown>> {
  const p = page.getByTestId('page-command')
  const head = await textOf(p.locator('h1').locator('..'))
  const strip = await page
    .getByTestId('command-strip')
    .locator('span')
    .evaluateAll((els) => els.map((e) => `${e.getAttribute('title')} [${e.getAttribute('data-state')}]`))
  const log = await page
    .getByTestId('command-log-entry')
    .evaluateAll((els) => els.map((e) => `${e.getAttribute('data-kind')}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
  const past = await page.getByTestId('command-mission-past').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
  const ach = await page.getByTestId('command-achievement').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-id')}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
  return {
    head,
    rank: await textOf(page.getByTestId('command-rank')),
    klasa: await textOf(page.getByTestId('command-class')),
    seria: await textOf(page.getByTestId('command-streak')),
    streak: await textOf(page.getByTestId('command-streak-days')),
    today: await textOf(page.getByTestId('command-today')),
    misja: await textOf(page.getByTestId('command-mission')),
    misjaStatus: await textOf(page.getByTestId('command-mission-status')),
    poprzednie: past,
    osiagniecia: ach,
    ukryte: await textOf(page.getByTestId('command-hidden')),
    rozkazy: await textOf(page.getByTestId('command-orders')),
    strip,
    log
  }
}

/** The window's toasts now (role=status in the bottom right). */
export async function toasts(page: Page): Promise<string[]> {
  return page.locator('[role="status"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
}

/** The quick entry window (opened with window.fi.quickOpen()). */
export async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  for (let i = 0; i < 150 && !found; i++) {
    found = app.windows().find((w) => w.url().includes('quick=1'))
    if (!found) await page.waitForTimeout(100)
  }
  if (!found) throw new Error('brak okna szybkiego wpisu')
  await found.getByTestId('quick-amount').waitFor({ state: 'visible', timeout: 15_000 })
  return found
}

/** All game months of a data folder: day → status / violations / tags; promotions, achievements, missions. */
export function gameFiles(dataDir: string): Record<string, unknown> {
  const dir = join(dataDir, 'game')
  if (!existsSync(dir)) return {}
  const res: Record<string, unknown> = {}
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const g = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
      days: Record<string, { status: string; cls: string; violations: Array<{ order: string; serious: boolean; amount: number | null; note: string }>; tags: string[]; frozenAt: string }>
      promotions: unknown[]
      achievements: unknown[]
      missions: unknown[]
    }
    res[f] = {
      days: Object.entries(g.days).map(([d, v]) => `${d} ${v.status} ${v.cls} ${v.violations.map((x) => `${x.order}${x.serious ? '!' : ''}:${x.amount}:${x.note}`).join(',')} ${v.tags.join(',')} @${v.frozenAt}`),
      promotions: g.promotions,
      achievements: g.achievements,
      missions: g.missions
    }
  }
  return res
}

/** The last frozen day of the folder (or null). */
export function lastFrozen(dataDir: string): string | null {
  const dir = join(dataDir, 'game')
  if (!existsSync(dir)) return null
  let last: string | null = null
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const g = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { days: Record<string, unknown> }
    for (const d of Object.keys(g.days)) if (!last || d > last) last = d
  }
  return last
}

// ------------------------------------------------------------------ records and settings of a copied folder

import { dirname } from 'node:path'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { SCHEMA_VERSION } from '../../src/shared/schema/common'

export const MBANK = '01KDEFACC00000000000000001'
export const WALLET = '01KDEFACC00000000000000002'
export const CASH = '01KDEFACC00000000000000003'
export const ANNA = '01KDEFMEM00000000000000001'
export const MAREK = '01KAZ200000000000000000003'
export const cat = (n: number | string): string => `01KDEFCAT${String(n).padStart(17, '0')}`

let seq = 0
/** A valid ULID of a record added by the area (fixed prefix, a counter). */
export const dwId = (): string => `01KDWA${String(++seq).padStart(20, '0')}`

/** Records added to a copied folder before the start, through the app's schemas. */
export function addRecords(dataDir: string, collection: Collection, list: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return list.map((raw) => {
    const at = (raw.createdAt as string | undefined) ?? '2026-11-03T08:00:00.000Z'
    const record = SCHEMAS[collection].parse({ schemaVersion: SCHEMA_VERSION, id: dwId(), createdAt: at, updatedAt: at, updatedBy: 'LAPTOP-KAPITANA', ...raw }) as unknown as Record<string, unknown>
    const file = join(dataDir, recordRelPath(collection, record))
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, serializeRecord(collection, record as never))
    return record
  })
}

/** fi.json changed before the start. */
export function editSettings(dataDir: string, change: (s: Record<string, any>) => void): void {
  const f = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(f, 'utf8'))
  change(fi.settings)
  writeFileSync(f, `${JSON.stringify(fi, null, 2)}\n`)
}

/** A JSON file of the folder changed before the start (a game month, a month plan). */
export function editJson(file: string, change: (j: Record<string, any>) => void): void {
  const j = JSON.parse(readFileSync(file, 'utf8'))
  change(j)
  writeFileSync(file, `${JSON.stringify(j, null, 2)}\n`)
}

/** Game days after `from` (inclusive) dropped from the folder's game months – they are frozen again by the app. */
export function dropGameDays(dataDir: string, from: string): string[] {
  const dir = join(dataDir, 'game')
  const dropped: string[] = []
  if (!existsSync(dir)) return dropped
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    editJson(join(dir, f), (g) => {
      for (const d of Object.keys(g.days)) if (d >= from) {
        delete g.days[d]
        dropped.push(d)
      }
      g.promotions = (g.promotions ?? []).filter((p: { day: string }) => p.day < from)
      g.achievements = (g.achievements ?? []).filter((a: { day: string }) => a.day < from)
    })
  }
  return dropped.sort()
}

// ------------------------------------------------------------------ screens

export async function goOps(page: Page): Promise<void> {
  await page.keyboard.press('Control+2')
  await page.getByTestId('page-operations').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForTimeout(800)
}

/** An operation opened from Operacje: the whole history searched for `q`, the first row with `has` clicked. */
export async function openOp(page: Page, q: string, has?: string | RegExp): Promise<void> {
  const label = await page.getByTestId('operations-period').innerText().catch(() => '')
  if (label !== 'cała historia') {
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.waitForTimeout(500)
  }
  await page.getByTestId('operations-search').fill(q)
  await page.waitForTimeout(600)
  const rows = page.getByTestId('operation-row')
  const row = has ? rows.filter({ hasText: has }).first() : rows.first()
  await row.click()
  await page.waitForTimeout(500)
}

/** The open operation deleted (trash, confirm) – the toast's text returned. */
export async function deleteOpen(page: Page): Promise<string[]> {
  await page.getByTestId('operation-delete').click()
  await page.getByTestId('operation-delete-confirm').click()
  await page.waitForTimeout(800)
  return toasts(page)
}

/** „Cofnij” of the last toast with the text. */
export async function undo(page: Page, has: string | RegExp = 'Usunięto'): Promise<void> {
  await page.getByRole('status').filter({ hasText: has }).last().getByRole('button', { name: 'Cofnij' }).click()
  await page.waitForTimeout(800)
}

/** Energy today and its line on the bridge. */
export async function energy(page: Page): Promise<{ energia: string; podpis: string; bias: string }> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(800)
  return {
    energia: await textOf(page.getByTestId('bridge-energy')),
    podpis: await textOf(page.getByTestId('bridge-energy-why').locator('..')),
    bias: await textOf(page.getByTestId('bridge-bias'))
  }
}

/** The briefing's items with kind, text and the colour of their dot. */
export async function briefing(page: Page): Promise<string[]> {
  const items = page.locator('[data-testid="briefing-item"]')
  const n = await items.count()
  const res: string[] = []
  for (let i = 0; i < n; i++) {
    const it = items.nth(i)
    const dot = await it.locator('span').first().evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => '?')
    const color = await it.locator('span').nth(1).evaluate((e) => getComputedStyle(e).color).catch(() => '?')
    res.push(`[${await it.getAttribute('data-kind')}|kropka ${dot}|tekst ${color}] ${(await it.innerText()).replace(/\s+/g, ' ')}`)
  }
  return res
}

// ------------------------------------------------------------------ the area's variants of „rok”

import { rmSync, statSync, unlinkSync } from 'node:fs'

const STAMP = /"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)"/g

/** Every timestamp of the folder's JSON files (not game/, backups/) within [from, to] moved back by `days`. */
export function shiftStamps(dir: string, from: number, to: number, days: number): number {
  let changed = 0
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) {
        if (name !== 'backups' && name !== 'game' && !name.startsWith('.')) walk(p)
      } else if (name.endsWith('.json')) {
        const t = readFileSync(p, 'utf8')
        const next = t.replace(STAMP, (all, stamp: string) => {
          const ms = Date.parse(stamp)
          return ms >= from && ms <= to ? `"${new Date(ms - days * 86_400_000).toISOString()}"` : all
        })
        if (next !== t) {
          writeFileSync(p, next)
          changed++
        }
      }
    }
  }
  walk(dir)
  return changed
}

/** Records of a dated collection (transactions, balances, dockings) with their date after `after` removed. */
export function dropDatedAfter(dataDir: string, collection: string, after: string): number {
  const root = join(dataDir, collection)
  if (!existsSync(root)) return 0
  let n = 0
  for (const y of readdirSync(root)) {
    const yd = join(root, y)
    if (!statSync(yd).isDirectory()) continue
    for (const f of readdirSync(yd)) if (f.slice(0, 10) > after) {
      unlinkSync(join(yd, f))
      n++
    }
  }
  return n
}

/**
 * „rok-przerwa” (punkty, warianty stanów): the last frozen day D−16, the last import and the last typed entry before it –
 * the captain away since then. Game days after D−16 dropped (with the month of D and its mission), operations, balance
 * confirmations and dockings after D−16 removed, the import's timestamps moved back before D−16.
 */
export function makeBreak(dataDir: string, lastFrozenDay: string): Record<string, unknown> {
  const dropped = dropGameDays(dataDir, addDay(lastFrozenDay, 1))
  // The month of today: no launch since the break – its file (and this week's mission) goes.
  for (const f of readdirSync(join(dataDir, 'game'))) {
    const g = JSON.parse(readFileSync(join(dataDir, 'game', f), 'utf8')) as { days: Record<string, unknown>; month: string }
    if (!Object.keys(g.days).length) rmSync(join(dataDir, 'game', f))
    else editJson(join(dataDir, 'game', f), (j) => {
      j.missions = (j.missions ?? []).filter((m: { week: string }) => m.week < '2026-W43')
    })
  }
  const tx = dropDatedAfter(dataDir, 'transactions', lastFrozenDay)
  const bal = dropDatedAfter(dataDir, 'balances', lastFrozenDay)
  const dock = dropDatedAfter(dataDir, 'dockings', lastFrozenDay)
  // The import (made „7 days ago” in the persona) and the decisions after it: 10 days earlier still.
  const from = Date.parse(`${addDay(lastFrozenDay, 1)}T00:00:00Z`)
  const stamps = shiftStamps(dataDir, from, Date.now(), 10)
  return { dropped: dropped.length, tx, bal, dock, stamps }
}

export function addDay(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** A quick entry saved with Enter: an expense (or „Za domownika”) with the given fields. */
export async function quickExpense(
  app: ElectronApplication,
  page: Page,
  o: { amount: string; name: string; category?: string; time?: string | null; date?: string; member?: string; impulse?: 'plan' | 'impuls'; log?: string; nightOk?: boolean }
): Promise<string> {
  const q = await quickWindow(app, page)
  if (o.member) {
    await q.getByRole('radio', { name: 'Za domownika' }).click().catch(async () => q.getByText('Za domownika', { exact: true }).first().click())
    await q.waitForTimeout(200)
    await q.getByTestId('quick-financer').selectOption(o.member)
  }
  await q.getByTestId('quick-amount').click()
  await q.getByTestId('quick-amount').fill(o.amount)
  await q.getByTestId('quick-counterparty').fill(o.name)
  if (o.category) await q.getByTestId('quick-category').selectOption(o.category)
  if (o.date) {
    await q.getByTestId('quick-date').click()
    await q.getByTestId('quick-date').fill(o.date)
    await q.getByTestId('quick-date').press('Tab')
  }
  if (o.time !== undefined) {
    await q.getByTestId('quick-time').fill(o.time ?? '')
    await q.getByTestId('quick-time').press('Tab')
  }
  await q.waitForTimeout(300)
  if (o.impulse) await q.getByTestId('quick-log').getByRole('radio', { name: o.impulse }).click().catch(async () => q.getByTestId('quick-log').getByText(o.impulse!, { exact: true }).click())
  if (o.log) await q.getByTestId('quick-log-note').fill(o.log)
  if (o.nightOk) await q.getByTestId('quick-night-ok').check()
  const form = await textOf(q.getByTestId('quick-entry'))
  await q.getByTestId('quick-amount').press('Enter')
  await page.waitForTimeout(1200)
  const msg = q.isClosed() ? '' : await textOf(q.getByTestId('quick-message'))
  if (!q.isClosed()) await q.keyboard.press('Escape').catch(() => {})
  return `${msg} || ${form.replace(/\s+/g, ' ').slice(0, 300)}`
}

/** The amount of an operation (found in Operacje) changed in its editor. */
export async function setAmount(page: Page, q: string, value: string): Promise<string> {
  await goOps(page)
  await openOp(page, q)
  const a = page.getByTestId('operation-amount')
  await a.click()
  await a.fill(value)
  await a.press('Tab')
  await page.waitForTimeout(500)
  if (await page.getByTestId('operation-guard-confirm').count()) await page.getByTestId('operation-guard-confirm').click()
  await page.waitForTimeout(800)
  return a.inputValue()
}

/** „Dziś na razie” of Dowództwo in one line. */
export async function todayLine(page: Page): Promise<string> {
  await go(page, '8', 'page-command')
  return (await textOf(page.getByTestId('command-today'))).replace(/\s*\n\s*/g, ' | ')
}
