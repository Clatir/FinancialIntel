// Helpers of the audit's Mapa gwiezdna (MG) and Radar (RA) areas (AU-10, block C): dumps of screen texts to the run's
// folder, a snapshot of the run's folders before every reading of numbers (the oracle of AU-9 counts on it at the moment
// of the reading), readers of both screens, special states on copies of „rok” (records through the app's own schemas,
// as tests/e2e/seed.ts writes them – without touching fi.json). Observation only – no assertions about the app.
import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import { dirname, join, relative } from 'node:path'
import type { ElectronApplication, Locator, Page } from '@playwright/test'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { SCHEMA_VERSION } from '../../src/shared/schema/common'
import { LAB, SHOTS, reading } from './lab'

// ------------------------------------------------------------------ dumps, steps

export function out(run: string): (name: string, content: unknown) => void {
  const dir = join(LAB, 'przebiegi', run, 'out')
  fs.mkdirSync(dir, { recursive: true })
  return (name, content) => {
    const s = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    fs.writeFileSync(join(dir, `${name.replace(/[^\w.-]+/g, '_')}.txt`), `${s}\n`)
    fs.appendFileSync(join(dir, '_log.txt'), `== ${name} (${new Date().toISOString()})\n${s}\n`)
  }
}

/** Runs a step; a failure is written down and the run goes on. */
export function stepper(dump: (n: string, c: unknown) => void) {
  return async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
    }
  }
}

export async function textOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak elementu)'
  return (await l.first().innerText()).trim()
}

const TOKENS: Record<string, string> = {
  'rgb(246, 70, 93)': 'down/czerwony',
  'rgb(232, 163, 61)': 'akcent',
  'rgb(46, 189, 133)': 'up/zielony',
  'rgb(232, 237, 242)': 'fg-strong',
  'rgb(195, 203, 212)': 'fg',
  'rgb(122, 131, 142)': 'muted'
}
export const tokenName = (c: string): string => TOKENS[c] ?? ''

export async function colorOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak)'
  const c = await l.first().evaluate((e) => getComputedStyle(e).color)
  return `${c} ${tokenName(c)}`
}

/** Go to a screen with Ctrl+<key> and wait for it. */
export async function go(page: Page, key: string, testId: string): Promise<void> {
  await page.keyboard.press(`Control+${key}`)
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(800)
}

/** Settings → a tab. */
export async function settingsTab(page: Page, tab: string): Promise<void> {
  await page.getByTestId('nav-settings').click()
  await page.getByTestId(`settings-tab-${tab}`).click()
  await page.waitForTimeout(600)
}

/** A shot of one element (scrolled into view): C:\FI-audyt\zrzuty\<id>.png. */
export async function shotEl(l: Locator, id: string): Promise<string> {
  fs.mkdirSync(SHOTS, { recursive: true })
  const file = join(SHOTS, `${id.replace(/[^\w.-]+/g, '_')}.png`)
  await l.first().scrollIntoViewIfNeeded().catch(() => undefined)
  await l.first().screenshot({ path: file })
  return file
}

/** The toasts shown now (role=status). */
export async function toasts(page: Page): Promise<string[]> {
  return (await page.getByRole('status').allInnerTexts().catch(() => [] as string[])).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** Which page is shown now and the dialogs open. */
export async function where(page: Page): Promise<string> {
  return page.evaluate(() => {
    const p = Array.from(document.querySelectorAll('[data-testid^="page-"]')).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getAttribute('data-testid'))
    const dlg = Array.from(document.querySelectorAll('[role="dialog"]')).map((e) => (e as HTMLElement).innerText.slice(0, 400).replace(/\s+/g, ' '))
    return JSON.stringify({ pages: p, dialogs: dlg })
  })
}

// ------------------------------------------------------------------ snapshots and readings (block C)

export interface Dirs {
  dataDir: string
  ictjDir?: string
}

/** A copy of a folder without its backups and history (the oracle needs the records, not the copies). */
function copyFolder(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true })
  fs.cpSync(src, dst, {
    recursive: true,
    filter: (s) => {
      const rel = relative(src, s).replace(/\\/g, '/')
      if (!rel) return true
      const top = rel.split('/')[0]
      return top !== 'backups' && top !== '.history' && !/\.tmp(-\w+)?$/i.test(rel)
    }
  })
}

/**
 * A snapshot of the run's data folder (and its ICTTJ folder) for a reading: C:\FI-audyt\migawki\<group>\<point>-<n>\dane
 * (\ictj) – the next free n. Returns the snapshot's folder.
 */
export function snapshot(group: 'mg' | 'ra', point: string, dirs: Dirs): string {
  const base = join(LAB, 'migawki', group)
  fs.mkdirSync(base, { recursive: true })
  let n = 1
  while (fs.existsSync(join(base, `${point}-${n}`))) n++
  const dest = join(base, `${point}-${n}`)
  copyFolder(dirs.dataDir, join(dest, 'dane'))
  if (dirs.ictjDir && fs.existsSync(dirs.ictjDir)) copyFolder(dirs.ictjDir, join(dest, 'ictj'))
  return dest
}

/**
 * A reading of numbers (block C): the app's writes settle, the folders are copied, then the screen is read (`read`) and
 * the reading written with `_migawka`. The values returned by `read` are flattened to strings.
 */
export async function readNow(
  page: Page,
  group: 'mg' | 'ra',
  point: string,
  state: string,
  dirs: Dirs,
  read: () => Promise<Record<string, unknown>>,
  settleMs = 2500
): Promise<{ migawka: string; values: Record<string, string | number | null> }> {
  await page.waitForTimeout(settleMs)
  const migawka = snapshot(group, point, dirs)
  const raw = await read()
  const values: Record<string, string | number | null> = {}
  for (const [k, v] of Object.entries(raw)) values[k] = v == null ? null : typeof v === 'string' || typeof v === 'number' ? v : JSON.stringify(v)
  values._migawka = migawka
  reading(group, point, state, values)
  return { migawka, values }
}

// ------------------------------------------------------------------ readers of the screens

export interface GoalRowRead {
  name: string | null
  pos: string | null
  amount: string | null
  target: string | null
  targetTitle: string | null
  eta: string | null
  etaLate: string | null
  etaTitle: string | null
  etaColor: string | null
  need: string | null
  needTitle: string | null
  needColor: string | null
  rate: string | null
  dol: string | null
  dolPool: string | null
  titles: string[]
  text: string
}

/** Mapa gwiezdna read whole: the header, every goal's row, the archived ones, the pace and the ICTTJ panel. */
export async function readStarmap(page: Page): Promise<{ header: string; goals: GoalRowRead[]; archived: string[]; pace: string; forecast: string; newGoal: string }> {
  return page.evaluate(() => {
    const txt = (e: Element | null | undefined) => (e ? (e as HTMLElement).innerText.trim().replace(/\s+/g, ' ') : null)
    const root = document.querySelector('[data-testid="page-starmap"]')
    const header = txt(root?.firstElementChild) ?? '(brak)'
    const goals = Array.from(document.querySelectorAll('[data-testid="starmap-goal"]')).map((g) => {
      const q = (id: string) => g.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
      const target = q('starmap-target') as HTMLInputElement | null
      const eta = q('starmap-eta')
      const need = q('starmap-need')
      const needSpan = need?.querySelector('span') as HTMLElement | null | undefined
      const sw = g.querySelector('[data-testid="starmap-rate"] [role="switch"]')
      return {
        name: g.getAttribute('data-name'),
        pos: txt(g.querySelector('span.num')),
        amount: txt(q('starmap-amount')),
        target: target ? target.value : txt(q('starmap-no-target')),
        targetTitle: q('starmap-no-target')?.getAttribute('title') ?? null,
        eta: eta ? eta.innerText.trim() : null,
        etaLate: eta?.getAttribute('data-late') ?? null,
        etaTitle: eta?.getAttribute('title') ?? null,
        etaColor: eta ? getComputedStyle(eta).color : null,
        need: txt(need),
        needTitle: needSpan?.getAttribute('title') ?? null,
        needColor: needSpan ? getComputedStyle(needSpan).color : null,
        rate: sw ? sw.getAttribute('aria-checked') : null,
        dol: q('starmap-dol') ? `${txt(q('starmap-dol'))} => ${q('starmap-dol')!.getAttribute('title')}` : null,
        dolPool: q('starmap-dol-pool') ? `${txt(q('starmap-dol-pool'))} => ${q('starmap-dol-pool')!.getAttribute('title')}` : null,
        titles: Array.from(g.querySelectorAll('[title]')).map((e) => `${((e as HTMLElement).innerText || '').trim().slice(0, 60)} => ${e.getAttribute('title')}`),
        text: txt(g) ?? ''
      }
    })
    const archived = Array.from(document.querySelectorAll('[data-testid="starmap-archived-row"]')).map((e) => txt(e) ?? '')
    const pace = txt(document.querySelector('[data-testid="starmap-pace"]')) ?? '(brak)'
    const panels = Array.from(document.querySelectorAll('section')).map((s) => txt(s) ?? '')
    const forecast = panels.find((p) => /^prognoza ictj/i.test(p)) ?? '(brak panelu)'
    const newGoal = txt(document.querySelector('[data-testid="starmap-new"]')) ?? '(brak)'
    return { header, goals, archived, pace, forecast, newGoal }
  })
}

/** Short form of a goal's row for a reading: „amount / target · eta · need”. */
export const goalLine = (g: GoalRowRead): string =>
  `${g.pos ?? '?'}. ${g.amount} / ${g.target} · ${g.eta || '-'}${g.need ? ` · ${g.need}` : ''}${g.needTitle ? ` [${g.needTitle}]` : ''}${g.dol ? ' · DOL' : ''}${g.dolPool ? ' · DOL·pula' : ''}${g.rate ? ` · rata=${g.rate}` : ''}`

export interface RadarItemRead {
  month: string | null
  kind: string | null
  overdue: string | null
  day: string
  kindLabel: string
  name: string
  note: string
  noteColor: string
  amount: string
  amountColor: string
  shields: string
  shieldsColor: string
  shieldsTitle: string | null
}

/** Radar read whole: the header, every item of „Na radarze”, the panels (buoys, accounts, loans, receivables, returns, PIT-38). */
export async function readRadar(page: Page): Promise<{ header: string; items: RadarItemRead[]; panels: Record<string, string>; accounts: string[]; buoys: string[] }> {
  return page.evaluate(() => {
    const txt = (e: Element | null | undefined) => (e ? (e as HTMLElement).innerText.trim().replace(/\s+/g, ' ') : '')
    const col = (e: Element | null | undefined) => (e ? getComputedStyle(e).color : '')
    const root = document.querySelector('[data-testid="page-radar"]')
    const header = txt(root?.firstElementChild)
    let month: string | null = null
    const items: RadarItemRead[] = []
    const list = document.querySelector('[data-testid="radar-items"]')
    if (list) {
      const walker = list.querySelectorAll('span.label, [data-testid="radar-item"]')
      walker.forEach((e) => {
        if (e.matches('span.label')) {
          month = txt(e)
          return
        }
        const c = Array.from(e.children) as HTMLElement[]
        items.push({
          month,
          kind: e.getAttribute('data-kind'),
          overdue: e.getAttribute('data-overdue'),
          day: txt(c[0]),
          kindLabel: txt(c[1]),
          name: txt(c[2]),
          note: txt(c[3]),
          noteColor: col(c[3]),
          amount: txt(c[4]),
          amountColor: col(c[4]),
          shields: txt(c[5]),
          shieldsColor: col(c[5]),
          shieldsTitle: c[5]?.getAttribute('title') ?? null
        })
      })
    }
    const panels: Record<string, string> = {}
    for (const id of ['radar-items', 'radar-buoys', 'radar-new-buoy', 'radar-accounts', 'radar-loans', 'radar-new-loan', 'radar-receivables', 'radar-returns', 'radar-pit38']) {
      const e = document.querySelector(`[data-testid="${id}"]`)
      panels[id] = e ? txt(e) : '(brak panelu)'
    }
    const accounts = Array.from(document.querySelectorAll('[data-testid="radar-account"]')).map((e) => txt(e))
    const buoys = Array.from(document.querySelectorAll('[data-testid="buoy-day"]')).map((e) => `[${e.getAttribute('data-state')}] ${txt(e)}`)
    return { header, items, panels, accounts, buoys }
  })
}

export const itemLine = (i: RadarItemRead): string => `${i.day} ${i.kindLabel} | ${i.name} | ${i.note} | ${i.amount} | osłony ${i.shields}${i.overdue ? ' | overdue' : ''}`

/** The docking window read whole: source, the split's proposal (shields, hull, every goal), its note. */
export async function readDock(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const dlg = document.querySelector('[data-testid="docking-dialog"]') as HTMLElement | null
    if (!dlg) return { okno: '(brak okna dokowania)' }
    const txt = (e: Element | null | undefined) => (e ? (e as HTMLElement).innerText.trim().replace(/\s+/g, ' ') : null)
    const goals = Array.from(dlg.querySelectorAll('[data-testid="docking-goal"]')).map((i) => `${i.getAttribute('aria-label')}: ${(i as HTMLInputElement).value}`)
    return {
      okno: txt(dlg),
      zrodlo: txt(dlg.querySelector('[data-testid="docking-source"]')),
      konto: txt(dlg.querySelector('[data-testid="docking-account"]')),
      oslony: txt(dlg.querySelector('[data-testid="docking-shields"]')),
      kadlub: (dlg.querySelector('[data-testid="docking-hull"]') as HTMLInputElement | null)?.value ?? null,
      cele: goals.join(' | '),
      podatek: (dlg.querySelector('[data-testid="docking-tax"]') as HTMLInputElement | null)?.value ?? null
    }
  })
}

/** Opens the docking window of a row of the bridge's „Dokowanie” panel (by a text of the row). */
export async function openDockRow(page: Page, hasText: string): Promise<boolean> {
  const row = page.locator('[data-testid="docking-row"]').filter({ hasText }).first()
  if (!(await row.count())) return false
  await row.click()
  await page.getByTestId('docking-dialog').waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(800)
  return true
}

/** The bridge's layers: the text of „Stan okrętu” and the energy of today. */
export async function readLayers(page: Page): Promise<Record<string, string>> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1200)
  const p = await bridgePanels(page)
  return { stan: p['bridge:Stan okrętu'] ?? '(brak)', energia: await textOf(page.getByTestId('bridge-energy')), podpis: await textOf(page.getByTestId('bridge-energy-why')), rozliczenia: p['bridge:Rozliczenia z domownikami'] ?? '(brak)' }
}

/** One value of „Stan okrętu” by its label (the amount after the label, „X / Y” kept whole). */
export function layerOf(stan: string, label: string): string {
  const i = stan.indexOf(label)
  if (i < 0) return '(brak)'
  const m = stan.slice(i + label.length).match(/(−?[\d  ]+,\d{2} zł)(\s*\/\s*[\d  ]+,\d{2} zł)?/)
  return m ? `${m[1]}${m[2] ?? ''}`.replace(/\s+/g, ' ').trim() : '(brak)'
}

/** An ICTTJ payout written into the run's copy of the ICTTJ folder (the amount in zł, as ICTTJ keeps it). */
export function writeIctjPayout(ictjDir: string, p: { id: string; kind: 'withdrawal' | 'return'; date: string; amount: number; pool: string; note?: string }): string {
  const file = join(ictjDir, 'payouts', p.date.slice(0, 4), `${p.date}_${p.id}.json`)
  fs.mkdirSync(dirname(file), { recursive: true })
  const at = `${p.date}T19:00:00.000Z`
  fs.writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, id: p.id, createdAt: at, updatedAt: at, kind: p.kind, date: p.date, amount: p.amount, pool: p.pool, note: p.note ?? '', categoryId: null, goal: null }, null, 2)}\n`)
  return file
}

/** The briefing of the bridge (Odprawa): kind and text of every item. */
export async function briefing(page: Page): Promise<Array<{ kind: string | null; text: string }>> {
  const items = page.locator('[data-testid="briefing-item"]')
  const n = await items.count()
  const res = []
  for (let i = 0; i < n; i++) res.push({ kind: await items.nth(i).getAttribute('data-kind'), text: (await items.nth(i).innerText()).replace(/\s+/g, ' ').trim() })
  return res
}

/** The bridge's panels as text (data-panel="bridge:…"). */
export async function bridgePanels(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const res: Record<string, string> = {}
    document.querySelectorAll('section[data-panel^="bridge:"]').forEach((s) => {
      res[s.getAttribute('data-panel')!] = (s as HTMLElement).innerText.trim().replace(/\s+/g, ' ')
    })
    return res
  })
}

// ------------------------------------------------------------------ special states (copies of „rok” changed before the start)

export const ACC = { mbank: '01KDEFACC00000000000000001', xtb: '01KDEFACC00000000000000002', cash: '01KDEFACC00000000000000003' }
export const CAT = {
  food: '01KDEFCAT00000000000000100',
  home: '01KDEFCAT00000000000000200',
  rent: '01KDEFCAT00000000000000201',
  auto: '01KDEFCAT00000000000000300',
  service: '01KDEFCAT00000000000000302',
  fun: '01KDEFCAT00000000000000600',
  gifts: '01KDEFCAT00000000000000900',
  giftsSub: '01KDEFCAT00000000000000901',
  other: '01KDEFCAT00000000000000902'
}
export const GOAL = {
  laptop: '01KAZ300000000000000000001',
  trip: '01KAZ300000000000000000002',
  bike: '01KAZ300000000000000000003',
  flat: '01KAZ720000000000000000001',
  desk: '01KAZ720000000000000000002'
}
export const FORECAST = { main: '01KAZ710000000000000000001', careful: '01KAZ710000000000000000002' }

/** A record id of the MG area (a valid ULID: Crockford base32). */
export const mgId = (n: number): string => `01KMXAMGR${String(n).padStart(17, '0')}`
/** A record id of the RA area. */
export const raId = (n: number): string => `01KMXARAD${String(n).padStart(17, '0')}`

const AT = '2026-11-03T08:00:00.000Z'

export function editJson(file: string, fn: (j: Record<string, any>) => Record<string, any> | void): void {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'))
  const r = fn(j) ?? j
  fs.writeFileSync(file, `${JSON.stringify(r, null, 2)}\n`)
}

export function readJson(file: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

/**
 * Records written into an existing data folder through the app's schemas, paths and serializer (as tests/e2e/seed.ts
 * `seedFolder` writes them, without its new fi.json). Returns the files written.
 */
export function seedRecords(dataDir: string, records: Partial<Record<Collection, Array<Record<string, unknown>>>>): string[] {
  const files: string[] = []
  for (const [collection, list] of Object.entries(records) as Array<[Collection, Array<Record<string, unknown>>]>) {
    for (const raw of list) {
      const record = SCHEMAS[collection].parse({ schemaVersion: SCHEMA_VERSION, createdAt: AT, updatedAt: AT, updatedBy: 'AUDYT', ...raw }) as unknown as Record<string, unknown>
      const file = join(dataDir, recordRelPath(collection, record as never))
      fs.mkdirSync(dirname(file), { recursive: true })
      fs.writeFileSync(file, serializeRecord(collection, record as never))
      files.push(file)
    }
  }
  return files
}

/** A record of a collection by id (its file found by name). */
export function findRecordFile(dataDir: string, collection: string, id: string): string | null {
  const root = join(dataDir, collection)
  if (!fs.existsSync(root)) return null
  const walk = (d: string): string | null => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) {
        const r = walk(p)
        if (r) return r
      } else if (e.name.endsWith(`${id}.json`)) return p
    }
    return null
  }
  return walk(root)
}

/** All records of a collection (parsed JSON). */
export function recordsOf(dataDir: string, collection: string): Array<Record<string, any>> {
  const root = join(dataDir, collection)
  const res: Array<Record<string, any>> = []
  if (!fs.existsSync(root)) return res
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.json')) {
        try {
          res.push(JSON.parse(fs.readFileSync(p, 'utf8')))
        } catch {
          /* a file being written */
        }
      }
    }
  }
  walk(root)
  return res
}

/** A checksum of every file of a folder (relative path → sha256), for „nothing was written”. */
export function folderSums(dir: string): Record<string, string> {
  const res: Record<string, string> = {}
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else res[relative(dir, p).replace(/\\/g, '/')] = createHash('sha256').update(fs.readFileSync(p)).digest('hex')
    }
  }
  if (fs.existsSync(dir)) walk(dir)
  return res
}

export function diffSums(a: Record<string, string>, b: Record<string, string>): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].filter((k) => a[k] !== b[k]).map((k) => `${k}: ${a[k]?.slice(0, 12) ?? '(brak)'} → ${b[k]?.slice(0, 12) ?? '(brak)'}`)
}

/**
 * The ICTTJ folder's sums kept in the run's folder (before) and compared after the run: the differences, [] = untouched.
 * `rebase()` after the audit's own change of the fixture (MG.2: a goal's amount in ICTTJ) – the app's writes are what is
 * looked for, never the audit's.
 */
export function ictjGuard(run: string, ictjDir: string | undefined): { change: (why: string, fn: () => void) => void; check: () => string[] } {
  const sums = () => (ictjDir ? folderSums(ictjDir) : {})
  let base = sums()
  const found: string[] = []
  const dir = join(LAB, 'przebiegi', run)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(join(dir, 'ictj-sumy-przed.json'), JSON.stringify(base, null, 2))
  return {
    // The audit's own change of the fixture: what changed before it is kept, the change itself is not the app's.
    change: (why, fn) => {
      found.push(...diffSums(base, sums()))
      fn()
      base = sums()
      fs.appendFileSync(join(dir, 'ictj-zmiany-audytu.log'), `${new Date().toISOString()} ${why}\n`)
    },
    check: () => {
      const after = sums()
      fs.writeFileSync(join(dir, 'ictj-sumy-po.json'), JSON.stringify(after, null, 2))
      return [...found, ...diffSums(base, after)]
    }
  }
}

/** Text of the app's main log (the run's user data). */
export function mainLog(run: string): string {
  try {
    return fs.readFileSync(join(LAB, 'przebiegi', run, 'userdata', 'logs', 'main.log'), 'utf8')
  } catch {
    return '(brak main.log)'
  }
}

export type { ElectronApplication }
