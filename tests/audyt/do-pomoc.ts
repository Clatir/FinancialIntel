// Helpers of the audit's area DO (docking from ICTTJ and the ICTTJ boundary, D96/D97): SHA-256 manifests of a run's
// ICTTJ folder before start() and after the close (DO.23 – every run), snapshots of the data and ICTTJ folders at every
// reading of numbers (for the oracle), payout files of the run's ICTTJ copy (the audit's own changes, each between two
// manifests) and readers of the bridge, the docking window and the star map. Observation only – no assertions.
import { createHash } from 'node:crypto'
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import type { Locator, Page } from '@playwright/test'
import { LAB, reading } from './lab'

export const MIG = join(LAB, 'migawki', 'do')
export const RUNS = join(LAB, 'przebiegi')

// ---------------------------------------------------------------- the boundary (DO.23)

export interface Entry {
  rel: string
  dir: boolean
  size: number
  mtimeMs: number
  sha: string
}

/** Every file and folder under `dir` (hidden ones too): size, modification time, SHA-256. */
export function manifest(dir: string): Map<string, Entry> {
  const out = new Map<string, Entry>()
  if (!existsSync(dir)) return out
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name)
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      const rel = relative(dir, p).replace(/\\/g, '/')
      if (st.isDirectory()) {
        out.set(rel, { rel, dir: true, size: 0, mtimeMs: 0, sha: '' })
        walk(p)
      } else {
        let sha: string
        try {
          sha = createHash('sha256').update(readFileSync(p)).digest('hex')
        } catch (e) {
          sha = `(nieczytelny: ${(e as Error).message.split('\n')[0]})`
        }
        out.set(rel, { rel, dir: false, size: st.size, mtimeMs: st.mtimeMs, sha })
      }
    }
  }
  walk(dir)
  return out
}

export function manifestText(m: Map<string, Entry>): string {
  return `${[...m.values()]
    .map((e) => (e.dir ? `(folder)\t\t\t${e.rel}/` : `${e.sha}\t${e.size}\t${new Date(e.mtimeMs).toISOString()}\t${e.rel}`))
    .join('\n')}\n`
}

/** One SHA-256 of a whole manifest (paths, sizes, times, contents) – the „sum” of a folder in the report. */
export function digest(m: Map<string, Entry>): string {
  return createHash('sha256').update(manifestText(m)).digest('hex').slice(0, 16)
}

/** Contents only (paths and SHA-256 of files) – comparable between two copies of one folder. */
export function contentDigest(m: Map<string, Entry>): string {
  return createHash('sha256')
    .update(
      [...m.values()]
        .filter((e) => !e.dir)
        .map((e) => `${e.sha} ${e.rel}`)
        .join('\n')
    )
    .digest('hex')
    .slice(0, 16)
}

export interface Diff {
  added: string[]
  removed: string[]
  changed: string[]
}

export function compare(a: Map<string, Entry>, b: Map<string, Entry>): Diff {
  const added = [...b.keys()].filter((k) => !a.has(k)).sort()
  const removed = [...a.keys()].filter((k) => !b.has(k)).sort()
  const changed: string[] = []
  for (const [k, x] of a) {
    const y = b.get(k)
    if (!y || x.dir || y.dir) continue
    const what = [x.sha !== y.sha && 'treść', x.size !== y.size && 'rozmiar', x.mtimeMs !== y.mtimeMs && 'czas modyfikacji'].filter(Boolean)
    if (what.length) changed.push(`${k} (${what.join(', ')})`)
  }
  return { added, removed, changed }
}

export const clean = (d: Diff): boolean => !d.added.length && !d.removed.length && !d.changed.length
export const describe = (d: Diff): string =>
  clean(d) ? 'bez zmian' : [d.added.length && `dodane: ${d.added.join(', ')}`, d.removed.length && `usunięte: ${d.removed.join(', ')}`, d.changed.length && `zmienione: ${d.changed.join(', ')}`].filter(Boolean).join('; ')

/**
 * The ICTTJ folder of one run (DO.23): its manifest before start(), every change the audit itself makes (between two
 * manifests – a difference found before it is FI's), the manifest after the close. Recorded in the run's folder
 * (`granica-*.sha256`) and in C:\FI-audyt\migawki\do\_granica.jsonl.
 */
export class Boundary {
  private expected: Map<string, Entry>
  private readonly first: Map<string, Entry>
  private n = 0
  readonly violations: string[] = []
  readonly mine: string[] = []

  constructor(
    readonly run: string,
    readonly dir: string
  ) {
    this.first = manifest(dir)
    this.expected = this.first
    this.save('przed', this.first)
    this.log(`przed start(): ${[...this.first.values()].filter((e) => !e.dir).length} plików, suma ${digest(this.first)} (treść ${contentDigest(this.first)})`)
  }

  private save(label: string, m: Map<string, Entry>): void {
    const dir = join(RUNS, this.run)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `granica-${String(this.n++).padStart(2, '0')}-${label.replace(/[^\w.-]+/g, '_').slice(0, 40)}.sha256`), manifestText(m))
  }

  log(line: string): void {
    mkdirSync(join(RUNS, this.run), { recursive: true })
    appendFileSync(join(RUNS, this.run, 'granica.log'), `${new Date().toISOString()} ${line}\n`)
  }

  /** The folder now against what it should be (after the audit's last own change): any difference is FI's. */
  check(label: string): Diff {
    const now = manifest(this.dir)
    const d = compare(this.expected, now)
    this.log(`${label}: ${describe(d)}`)
    if (!clean(d)) {
      this.violations.push(`${label}: ${describe(d)}`)
      this.save(`RÓŻNICA-${label}`, now)
    }
    return d
  }

  /** The audit's own change of the ICTTJ copy (a payout added, a pool changed …): checked before, recorded after. */
  change(label: string, fn: () => void): void {
    this.check(`przed moją zmianą „${label}”`)
    fn()
    const after = manifest(this.dir)
    this.log(`moja zmiana „${label}”: ${describe(compare(this.expected, after))}`)
    this.mine.push(`${label}: ${describe(compare(this.expected, after))}`)
    this.expected = after
    this.save(`moja-${label}`, after)
  }

  /** After the app's close: the last check, the run's line in _granica.jsonl. */
  end(note = ''): { ok: boolean; before: string; after: string } {
    const d = this.check('po zamknięciu aplikacji')
    const now = manifest(this.dir)
    this.save('po', now)
    const res = { ok: clean(d) && !this.violations.length, before: digest(this.first), after: digest(now), expectedAfter: digest(this.expected) }
    mkdirSync(MIG, { recursive: true })
    appendFileSync(
      join(MIG, '_granica.jsonl'),
      `${JSON.stringify({ run: this.run, dir: this.dir, at: new Date().toISOString(), files: [...now.values()].filter((e) => !e.dir).length, ...res, mine: this.mine, violations: this.violations, note })}\n`
    )
    return res
  }
}

/** The ICTTJ appdata folder of a run (lab: `ictj-appdata`, ICTTJ's own config.json) – it must stay as the lab wrote it. */
export function appdataState(runDir: string): string {
  const m = manifest(join(runDir, 'ictj-appdata'))
  return [...m.values()].map((e) => (e.dir ? `${e.rel}/` : `${e.rel} ${e.size} ${e.sha.slice(0, 12)} ${readFileSync(join(runDir, 'ictj-appdata', e.rel), 'utf8').replace(/\s+/g, ' ')}`)).join(' | ')
}

// ---------------------------------------------------------------- snapshots and readings

/** A copy of the run's data folder (without backups and .history) and its ICTTJ folder: C:\FI-audyt\migawki\do\<point>-<n>. */
export function snapshot(point: string, dataDir: string, ictjDir?: string | null): string {
  mkdirSync(MIG, { recursive: true })
  let n = 1
  while (existsSync(join(MIG, `${point}-${n}`))) n++
  const dst = join(MIG, `${point}-${n}`)
  const skip = (root: string) => (src: string) => {
    const r = relative(root, src).replace(/\\/g, '/')
    if (r === 'backups' || r.startsWith('backups/') || r === '.history' || r.startsWith('.history/')) return false
    return !/\.tmp|~$/.test(r)
  }
  for (let i = 0; i < 3; i++) {
    try {
      rmSync(dst, { recursive: true, force: true })
      cpSync(dataDir, join(dst, 'dane'), { recursive: true, filter: skip(dataDir) })
      if (ictjDir && existsSync(ictjDir)) cpSync(ictjDir, join(dst, 'ictj'), { recursive: true })
      break
    } catch (e) {
      if (i === 2) throw e
    }
  }
  return dst
}

/** A reading of numbers (oracle, AU-9): the snapshot first, then the screen, then the line in odczyty\do.jsonl. */
export async function readAt(
  point: string,
  state: string,
  folders: { dataDir: string; ictjDir?: string | null },
  read: () => Promise<Record<string, string | number | null>>
): Promise<Record<string, string | number | null>> {
  const m = snapshot(point, folders.dataDir, folders.ictjDir)
  const values = await read()
  reading('do', point, state, { ...values, _migawka: m })
  return values
}

// ---------------------------------------------------------------- the run's ICTTJ copy (the audit's own changes)

export interface Payout {
  id: string
  kind: string
  date: string
  /** zł, as ICTTJ keeps it. */
  amount: number
  pool: string
  note?: string
  schemaVersion?: number
  updatedAt?: string
  extra?: Record<string, unknown>
}

export const payoutRel = (p: Pick<Payout, 'id' | 'date'>): string => `payouts/${p.date.slice(0, 4)}/${p.date}_${p.id}.json`

export function payoutRecord(p: Payout): Record<string, unknown> {
  return {
    schemaVersion: p.schemaVersion ?? 1,
    id: p.id,
    createdAt: `${p.date}T19:00:00.000Z`,
    updatedAt: p.updatedAt ?? `${p.date}T19:00:00.000Z`,
    kind: p.kind,
    date: p.date,
    amount: p.amount,
    pool: p.pool,
    note: p.note ?? '',
    categoryId: null,
    goal: null,
    ...p.extra
  }
}

export function writePayout(ictjDir: string, p: Payout, rel = payoutRel(p)): string {
  const file = join(ictjDir, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(payoutRecord(p), null, 2)}\n`)
  return file
}

export function putFile(root: string, rel: string, content: string | Record<string, unknown>): string {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`)
  return file
}

/** A run's own ICTTJ folder from nothing (journal.json, forecasts, payouts), modelled on stany\ictj-rok. */
export function makeIctj(dir: string, o: { payouts: Payout[]; forecasts?: Array<Record<string, unknown>> }): void {
  rmSync(dir, { recursive: true, force: true })
  putFile(dir, 'journal.json', { schemaVersion: 1, settings: {} })
  for (const f of o.forecasts ?? []) putFile(dir, `forecasts/${f.id as string}.json`, f)
  for (const p of o.payouts) writePayout(dir, p)
}

// ---------------------------------------------------------------- logs

export class Log {
  readonly dir: string
  constructor(readonly run: string) {
    this.dir = join(RUNS, run)
    mkdirSync(this.dir, { recursive: true })
  }
  line(s: string): void {
    appendFileSync(join(this.dir, 'do.log'), `${s}\n`)
  }
  obj(label: string, o: unknown): void {
    this.line(`== ${label}\n${typeof o === 'string' ? o : JSON.stringify(o, null, 2)}`)
  }
  async step(name: string, fn: () => Promise<void>): Promise<void> {
    this.line(`---- ${name} (${new Date().toISOString()})`)
    try {
      await fn()
    } catch (e) {
      this.line(`BŁĄD w kroku „${name}”: ${(e as Error).message.split('\n').slice(0, 6).join(' / ')}`)
    }
  }
}

// ---------------------------------------------------------------- screens

export async function go(page: Page, key: string, testId: string): Promise<void> {
  await page.keyboard.press(`Control+${key}`)
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(700)
}

export async function settingsTab(page: Page, tab: string): Promise<void> {
  await page.keyboard.press('Control+,')
  await page.getByTestId(`settings-tab-${tab}`).click()
  await page.waitForTimeout(700)
}

const flat = (s: string) => s.replace(/\s+/g, ' ').trim()

export async function textOr(l: Locator, none = '(brak)'): Promise<string> {
  return (await l.count()) ? flat(await l.first().innerText()) : none
}

export async function toasts(page: Page): Promise<string> {
  return (await page.getByRole('status').allInnerTexts().catch(() => [] as string[])).map(flat).join(' || ')
}

/** Stan okrętu on the bridge: shields, hull, energy, range, class, goals, tax, the free money and the sum of accounts. */
export async function shipState(page: Page): Promise<Record<string, string>> {
  const panel = page.getByTestId('bridge-state')
  const t = (await panel.count()) ? await panel.first().innerText() : ''
  const lines = t.split('\n').map((x) => x.trim()).filter(Boolean)
  const after = (label: string) => {
    const i = lines.findIndex((x) => x === label || x.startsWith(label))
    return i >= 0 ? (lines[i + 1] ?? '') : '(brak)'
  }
  const find = (re: RegExp) => lines.find((x) => re.test(x)) ?? '(brak)'
  return {
    oslony: await textOr(page.getByTestId('state-shields').locator('span.num').first()),
    oslonyWiersz: await textOr(page.getByTestId('state-shields')),
    kadlub: await textOr(page.getByTestId('state-hull').locator('span.num').first()),
    energia: await textOr(page.getByTestId('state-energy').locator('span.num').first()),
    zasieg: await textOr(page.getByTestId('state-range')),
    klasa: after('Klasa'),
    srednieKoszty: find(/^średnie koszty/),
    cele: find(/^Układy gwiezdne/) === '(brak)' ? '(brak)' : lines[lines.findIndex((x) => /^Układy gwiezdne/.test(x)) + 2] ?? '',
    podatek: lines.findIndex((x) => x === 'Podatek') >= 0 ? (lines[lines.findIndex((x) => x === 'Podatek') + 2] ?? '') : '(brak)',
    wolne: find(/wolne do decyzji/),
    ponadCel: find(/ponad cel osłon/),
    suma: find(/^Suma kont budżetu/),
    calosc: flat(t)
  }
}

export async function shipClass(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('[data-testid="bridge-state"] .label')).find((e) => e.textContent?.trim() === 'Klasa')
    return el?.nextElementSibling?.textContent?.trim() ?? '(brak)'
  })
}

/** The docking panel of the bridge: its title, rows (state, text), the rest (skipped, before the start), warnings. */
export async function dockPanel(page: Page): Promise<{ title: string; rows: string[]; rest: string[]; text: string }> {
  const panel = page.getByTestId('bridge-docking')
  if (!(await panel.count())) return { title: '(brak panelu)', rows: [], rest: [], text: '' }
  const text = await panel.first().innerText()
  const rows = await page.locator('[data-testid="docking-row"]').evaluateAll((els) => els.map((e) => `[${e.getAttribute('data-state')}] ${(e.textContent ?? '').replace(/\s+/g, ' ').trim()}`))
  const rest = await page.locator('[data-testid="docking-rest"]').evaluateAll((els) => els.map((e) => `[${e.getAttribute('data-state')}] ${(e.textContent ?? '').replace(/\s+/g, ' ').trim()}`))
  return { title: flat(text.split('\n')[0] ?? ''), rows, rest, text: flat(text) }
}

/** The briefing's items about docking (and all, flat). */
export async function briefing(page: Page): Promise<string[]> {
  return page.locator('[data-testid="briefing-item"]').evaluateAll((els) => els.map((e) => `[${e.getAttribute('data-kind')}] ${(e.textContent ?? '').replace(/\s+/g, ' ').trim()}`))
}

export async function openRow(page: Page, hasText: string | RegExp, state?: string): Promise<Locator> {
  const sel = state ? `[data-testid="docking-row"][data-state="${state}"]` : '[data-testid="docking-row"]'
  await page.locator(sel).filter({ hasText }).first().click()
  const dlg = page.getByTestId('docking-dialog')
  await dlg.waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(500)
  return dlg
}

/** The docking window read whole: source, account, notes, the split (shields, hull, goals, tax), buttons, firewall. */
export async function dialogState(page: Page): Promise<Record<string, unknown>> {
  const dlg = page.getByTestId('docking-dialog')
  if (!(await dlg.count())) return { okno: '(brak okna)' }
  const goals = await dlg.locator('[data-testid="docking-goal"]').evaluateAll((els) =>
    els.map((e) => {
      const row = e.closest('div.flex')
      const name = row?.querySelector('span')?.textContent ?? ''
      return `${name}=${(e as HTMLInputElement).value}`
    })
  )
  const fw = dlg.getByTestId('docking-firewall')
  const firewallColor = (await fw.count()) ? await fw.evaluate((e) => getComputedStyle(e).color) : null
  return {
    zrodlo: await textOr(dlg.getByTestId('docking-source')),
    konto: await textOr(dlg.getByTestId('docking-account')),
    oslony: await textOr(dlg.getByTestId('docking-shields')),
    kadlub: (await dlg.getByTestId('docking-hull').count()) ? await dlg.getByTestId('docking-hull').inputValue() : '(brak)',
    cele: goals.join('; '),
    podatek: (await dlg.getByTestId('docking-tax').count()) ? await dlg.getByTestId('docking-tax').inputValue() : '(brak pola)',
    firewall: (await fw.count()) ? `${flat(await fw.innerText())} [kolor ${firewallColor}]` : '(brak)',
    przyciski: (await dlg.locator('button').allInnerTexts()).map(flat).filter(Boolean).join(' | '),
    zadokujAktywny: (await dlg.getByTestId('docking-confirm').count()) ? await dlg.getByTestId('docking-confirm').isEnabled() : null,
    calosc: flat(await dlg.innerText())
  }
}

/** Mapa gwiezdna: each goal's name, amount, target, badges. */
export async function starmap(page: Page): Promise<string[]> {
  await go(page, '6', 'page-starmap')
  return page.locator('[data-testid="starmap-goal"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-name')}: ${(e.textContent ?? '').replace(/\s+/g, ' ').trim()}`))
}

/** Fill an amount field: a click first, then the value (as the e2e tests). */
export async function fillAmount(l: Locator, v: string): Promise<void> {
  await l.click()
  await l.press('Control+a')
  await l.pressSequentially(v)
  await l.press('Tab')
}

/** Records of a collection in a data folder (JSON), e.g. the dockings or the operations of Portfel XTB. */
export function records(dataDir: string, collection: string): Array<Record<string, any>> {
  const root = join(dataDir, collection)
  if (!existsSync(root)) return []
  const out: Array<Record<string, any>> = []
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.json$/.test(n) && !/-[A-Z0-9-]+\.json$/.test(n.replace(/^\d{4}-\d{2}-\d{2}_/, ''))) {
        try {
          out.push(JSON.parse(readFileSync(p, 'utf8')))
        } catch {
          /* a file being written */
        }
      }
    }
  }
  walk(root)
  return out
}

export function mainLog(userData: string): string {
  try {
    return readFileSync(join(userData, 'logs', 'main.log'), 'utf8')
  } catch {
    return '(brak main.log)'
  }
}

// ---------------------------------------------------------------- the run's FI data (the audit's own state building)

export const ACC = { mbank: '01KDEFACC00000000000000001', xtb: '01KDEFACC00000000000000002', cash: '01KDEFACC00000000000000003' }
const AT = '2026-11-03T08:00:00.000Z'

/** A record id of the area DO (a valid ULID: Crockford base32, prefix 01KMXD0). */
export const doId = (n: number): string => `01KMXD0${String(n).padStart(19, '0')}`

export function editJson(file: string, fn: (j: Record<string, any>) => Record<string, any> | void): void {
  const j = JSON.parse(readFileSync(file, 'utf8'))
  const r = fn(j) ?? j
  writeFileSync(file, `${JSON.stringify(r, null, 2)}\n`)
}

/** An operation in the data folder, the full shape of the persona's records (a bank row when `bank` is given). */
export function writeTx(dataDir: string, o: Record<string, any> & { id: string; date: string; amount: number }): string {
  const rec = {
    schemaVersion: 1,
    createdAt: AT,
    updatedAt: AT,
    updatedBy: 'AUDYT',
    time: null,
    accountId: ACC.mbank,
    kind: 'expense',
    categoryId: null,
    refundable: false,
    memberId: null,
    advance: false,
    covers: [],
    splits: [],
    counterparty: '',
    title: '',
    note: '',
    impulse: null,
    logNote: '',
    repaid: 0,
    counterAccountId: null,
    containerId: null,
    goalId: null,
    loanId: null,
    ...o
  }
  const dir = join(dataDir, 'transactions', o.date.slice(0, 4))
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${o.date}_${o.id}.json`)
  writeFileSync(file, `${JSON.stringify(rec, null, 2)}\n`)
  return file
}

/** An inflow (or with a negative amount an outflow) of XTB on mBank, as the import writes it. */
export function bankXtb(dataDir: string, id: string, date: string, grosze: number): string {
  const out = grosze < 0
  return writeTx(dataDir, {
    id,
    date,
    amount: grosze,
    kind: 'trading',
    counterparty: 'XTB S.A.',
    title: out ? 'ZASILENIE RACHUNKU 4421987' : 'WYPLATA SRODKOW 4421987',
    bank: {
      format: 'mbank',
      key: `mbank:audyt-do:${id}`,
      description: `${out ? 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY' : 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'} XTB S.A. ${out ? 'ZASILENIE RACHUNKU' : 'WYPLATA SRODKOW'} 4421987`,
      counterparty: 'XTB S.A.',
      operation: out ? 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY' : 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY',
      category: '',
      pending: false,
      importedAt: AT,
      source: 'historia'
    }
  })
}

export function writeRecord(dataDir: string, rel: string, rec: Record<string, any>): string {
  const file = join(dataDir, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, createdAt: AT, updatedAt: AT, updatedBy: 'AUDYT', ...rec }, null, 2)}\n`)
  return file
}

/** The files of a collection whose JSON matches (path, record). */
export function findRecords(dataDir: string, collection: string, fn: (r: Record<string, any>) => boolean): Array<{ file: string; rec: Record<string, any> }> {
  const root = join(dataDir, collection)
  const out: Array<{ file: string; rec: Record<string, any> }> = []
  if (!existsSync(root)) return out
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (n.endsWith('.json')) {
        try {
          const rec = JSON.parse(readFileSync(p, 'utf8'))
          if (fn(rec)) out.push({ file: p, rec })
        } catch {
          /* being written */
        }
      }
    }
  }
  walk(root)
  return out
}

/** The bridge read for a reading: ship state, class, docking panel, briefing (flat values). */
export async function bridgeValues(page: Page): Promise<Record<string, string>> {
  await go(page, '1', 'page-bridge')
  await page.waitForTimeout(800)
  const s = await shipState(page)
  const dock = await dockPanel(page)
  return {
    oslony: s.oslony,
    kadlub: s.kadlub,
    energia: s.energia,
    zasieg: s.zasieg,
    klasa: await shipClass(page),
    cele: s.cele,
    wolne: s.wolne,
    ponadCel: s.ponadCel,
    sumaKont: s.suma,
    stanOkretu: s.calosc,
    dokowanie: `${dock.title} :: ${dock.rows.join(' || ')}${dock.rest.length ? ` :: reszta: ${dock.rest.join(' || ')}` : ''}`
  }
}

/** Ustawienia → Konta: „saldo teraz” of every account (name → text). */
export async function accountBalances(page: Page): Promise<string> {
  await settingsTab(page, 'accounts')
  const rows = await page.locator('[data-testid="account-row"]').evaluateAll((els) =>
    els.map((e) => `${e.getAttribute('data-name')}: ${(e.querySelector('[data-testid="account-balance"]')?.textContent ?? '?').replace(/\s+/g, ' ')}`)
  )
  await page.keyboard.press('Control+1')
  await page.waitForTimeout(500)
  return rows.join('; ')
}

/** How many times a text is on the window now (e.g. „Wycofaj dokowanie”). */
export async function countText(page: Page, re: RegExp): Promise<number> {
  return page.getByText(re).count()
}

/**
 * A docking row by its date and its signed amount (e.g. '02.11.2026', '+1 500,00') – the text normalised (no-break
 * spaces), so „500,00” never takes the row of „1 500,00”. Opens its window.
 */
export async function openDelivery(page: Page, date: string, signedAmount: string, state?: string): Promise<Locator> {
  const rows = page.locator('[data-testid="docking-row"]')
  const texts = await rows.evaluateAll((els) => els.map((e) => `${e.getAttribute('data-state')}|${(e.textContent ?? '').replace(/[\s\u00a0\u202f]+/g, ' ')}`))
  // The date is a pattern (dots literal, a class like 2[01] allowed); the amount literal, with „−” of the app.
  const amount = signedAmount.replace(/^-/, '−').replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`)
  const re = new RegExp(`^${state ?? '[a-z-]+'}[|]${date.replace(/\./g, '[.]')}.*${amount} zł$`)
  const i = texts.findIndex((t) => re.test(t.replace(/[\s\u00a0\u202f]+/g, ' ')))
  if (i < 0) throw new Error(`brak wiersza ${date} ${signedAmount} (${state ?? 'dowolny'}): ${texts.join(' || ')}`)
  await rows.nth(i).click()
  const dlg = page.getByTestId('docking-dialog')
  await dlg.waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(500)
  return dlg
}
