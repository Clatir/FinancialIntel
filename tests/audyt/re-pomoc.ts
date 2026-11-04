/**
 * Helpers of the audit's area RE (Raporty i eksport): a run on a copy of the persona „rok” (optionally with records of
 * the area added), the Raporty screens, the exported files (CSV parsed by hand, XLSX unpacked). An observation tool –
 * it prints what the screen and the files say; the verdicts are written by hand in docs/audyt/raport/RE.md.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, type ElectronApplication, type Page } from '@playwright/test'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { SCHEMA_VERSION } from '../../src/shared/schema/common'
import { answerDialogs, shot, start, text, useState, type Run } from './lab'

export const EXPORT = 'C:\\FI-audyt\\eksport'
export const MBANK = '01KDEFACC00000000000000001'
export const WALLET = '01KDEFACC00000000000000002'
export const MAREK = '01KAZ200000000000000000003'
export const cat = (n: string): string => `01KDEFCAT${n.padStart(17, '0')}`

mkdirSync(EXPORT, { recursive: true })

export function say(label: string, value: unknown): void {
  const s = typeof value === 'string' ? value : JSON.stringify(value, null, 1)
  console.log(`\n### ${label}\n${s}`)
}

/** A step of a point: its failure is printed (a result of the point), the run goes on. */
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

/** A run on a fresh copy of „rok” (changed by `prepare` before the start). */
export async function run(name: string, prepare?: (dataDir: string) => void, opts: { idle?: boolean } = {}): Promise<Run> {
  const { dataDir, ictjDir } = useState('rok', name)
  prepare?.(dataDir)
  const r = await start(name, { dataDir, ictjDir, idle: opts.idle })
  r.page.setDefaultTimeout(15_000)
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.page.waitForTimeout(1500)
  return r
}

export async function goReports(page: Page, tab?: 'Odprawa' | 'Raport wachty' | 'Debriefing' | 'Przegląd roczny' | 'Eksport'): Promise<void> {
  await page.keyboard.press('Control+0')
  await expect(page.getByTestId('page-reports')).toBeVisible({ timeout: 60_000 })
  if (tab) await page.getByRole('radio', { name: tab }).click()
  await page.waitForTimeout(700)
}

export async function go(page: Page, key: string, testId: string): Promise<void> {
  await page.keyboard.press(`Control+${key}`)
  await expect(page.getByTestId(testId)).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(800)
}

export const toasts = (page: Page): Promise<string[]> => page.getByRole('status').allInnerTexts()

/** Save dialog answered with the file, the file removed first (so a stale file is never read). */
export async function saveTo(app: ElectronApplication, file: string): Promise<void> {
  rmSync(file, { force: true })
  await answerDialogs(app, { savePath: file })
}

/** The name the app proposed in the last save dialog (we wrap the answer to remember `defaultPath`). */
export async function spyDialog(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ dialog }) => {
    const g = globalThis as unknown as { __saveOpts?: unknown[]; __spy?: boolean }
    if (g.__spy) return
    g.__spy = true
    g.__saveOpts = []
    const orig = dialog.showSaveDialog as unknown as (...a: unknown[]) => Promise<unknown>
    ;(dialog as unknown as { showSaveDialog: unknown }).showSaveDialog = async (...a: unknown[]) => {
      g.__saveOpts!.push(a[a.length - 1])
      return orig(...a)
    }
  })
}
export async function proposed(app: ElectronApplication): Promise<unknown[]> {
  return app.evaluate(() => (globalThis as unknown as { __saveOpts?: unknown[] }).__saveOpts ?? [])
}
/** Answer the next save dialog while keeping the spy: set the answer, then re-wrap. */
export async function answerSave(app: ElectronApplication, file: string): Promise<void> {
  rmSync(file, { force: true })
  await app.evaluate(({ dialog }, f) => {
    const g = globalThis as unknown as { __saveOpts?: unknown[] }
    g.__saveOpts = g.__saveOpts ?? []
    ;(dialog as unknown as { showSaveDialog: unknown }).showSaveDialog = async (...a: unknown[]) => {
      g.__saveOpts!.push(a[a.length - 1])
      return { canceled: false, filePath: f }
    }
  }, file)
}
export async function answerCancel(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ dialog }) => {
    const g = globalThis as unknown as { __saveOpts?: unknown[] }
    g.__saveOpts = g.__saveOpts ?? []
    ;(dialog as unknown as { showSaveDialog: unknown }).showSaveDialog = async (...a: unknown[]) => {
      g.__saveOpts!.push(a[a.length - 1])
      return { canceled: true, filePath: '' }
    }
  })
}

// ------------------------------------------------------------------ files

export function waitFile(file: string, ms = 20_000): Promise<boolean> {
  const t0 = Date.now()
  return new Promise((resolve) => {
    const tick = () => {
      if (existsSync(file)) return resolve(true)
      if (Date.now() - t0 > ms) return resolve(false)
      setTimeout(tick, 250)
    }
    tick()
  })
}

/** A CSV as the app writes it: `;`, quoted fields with doubled quotes and line breaks inside. */
export function parseCsv(raw: string): string[][] {
  const s = raw.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cur += '"'
          i++
        } else q = false
      } else cur += c
    } else if (c === '"') q = true
    else if (c === ';') {
      row.push(cur)
      cur = ''
    } else if (c === '\r' && s[i + 1] === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
      i++
    } else cur += c
  }
  if (cur || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

/** Grosze of a cell „-1234,56” (NaN when not a plain Polish decimal). */
export function grosze(cell: string): number {
  if (!/^-?\d+,\d{2}$/.test(cell)) return NaN
  return Math.round(Number(cell.replace(',', '.')) * 100)
}

export interface CsvInfo {
  bom: boolean
  crlf: boolean
  endsWithCrlf: boolean
  lf: number
  header: string[]
  rows: string[][]
  raw: string
}
export function readCsv(file: string): CsvInfo {
  const buf = readFileSync(file)
  const raw = buf.toString('utf8')
  const rows = parseCsv(raw)
  return {
    bom: buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf,
    crlf: raw.includes('\r\n'),
    endsWithCrlf: raw.endsWith('\r\n'),
    lf: (raw.replace(/\r\n/g, '').match(/\n/g) ?? []).length,
    header: rows[0] ?? [],
    rows: rows.slice(1),
    raw
  }
}

/** XLSX unpacked (Expand-Archive on a .zip copy) into C:\FI-audyt\eksport\<dir>; returns the folder. */
export function unzip(file: string, dir: string): string {
  const target = join(EXPORT, dir)
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  const copy = join(EXPORT, `${dir}.zip`)
  copyFileSync(file, copy)
  execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${copy}' -DestinationPath '${target}' -Force`], { stdio: 'ignore' })
  rmSync(copy, { force: true })
  return target
}
export function tree(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tree(join(dir, e.name), base) : [join(dir, e.name).slice(base.length + 1)]))
}
export const rd = (...p: string[]): string => readFileSync(join(...p), 'utf8')

// ------------------------------------------------------------------ records added to the copy

let seq = 0
const fixed = (n: number): string => `01KQRE0${String(n).padStart(19, '0')}`
const newId = (): string => `01KQRE1${String(++seq).padStart(19, '0')}`

export function addRecords(dataDir: string, collection: Collection, list: Array<Record<string, unknown>>): void {
  const at = '2026-11-03T08:00:00.000Z'
  for (const raw of list) {
    const record = SCHEMAS[collection].parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: at, updatedAt: at, updatedBy: 'LAPTOP-KAPITANA', ...raw }) as unknown as Record<string, unknown>
    const file = join(dataDir, recordRelPath(collection, record))
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, serializeRecord(collection, record as never))
  }
}

export const LONG_NOTE = Array.from({ length: 50 }, (_, i) => `Linia ${String(i + 1).padStart(2, '0')}: zażółć gęślą jaźń, średnik; cudzysłów "x" i dłuższy tekst opisu zakupu numer ${i + 1}.`).join(' ').slice(0, 5000)

/**
 * „rok+re”: the persona „rok” with the operations the points RE need and „rok” has not: cells that look like formulas,
 * a note with `;` `"` and a line break, Polish letters, a receipt with described lines, a transfer in one operation,
 * a transfer outside the budget, a return of goods, an own purchase financed by a member, a future date. Dated on
 * Portfel XTB (no confirmed balance) or after mBank's confirmed 26.10.
 */
export function special(dataDir: string): void {
  const tx = (o: Record<string, unknown>) => ({ accountId: WALLET, kind: 'expense', ...o })
  addRecords(dataDir, 'transactions', [
    tx({ id: fixed(1), date: '2026-10-10', time: '09:15', counterparty: '=SUMA(A1)', title: '=1+1', amount: -1234, categoryId: cat('0101'), note: 'a;b "cytat"\nnowa linia; koniec' }),
    tx({ id: fixed(2), date: '2026-10-10', counterparty: '+48 600 100 200', amount: -500, categoryId: cat('0101') }),
    tx({ id: fixed(3), date: '2026-10-10', counterparty: '-rabat', amount: -700, categoryId: cat('0101') }),
    tx({ id: fixed(4), date: '2026-10-10', counterparty: '@firma', amount: -900, categoryId: cat('0101') }),
    tx({ id: fixed(5), date: '2026-10-10', counterparty: 'Zażółć gęślą jaźń', title: 'ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż', amount: -1500, categoryId: cat('0101'), tags: ['Wakacje', 'zażółć'] }),
    tx({ id: fixed(6), date: '2026-10-10', counterparty: '-123', amount: -100, categoryId: cat('0101') }),
    tx({ id: fixed(7), date: '2026-10-10', counterparty: 'Tab\tw środku', title: '\tna początku', amount: -100, categoryId: cat('0101') }),
    tx({ id: fixed(8), date: '2026-10-14', counterparty: 'Carrefour', amount: -13000, note: 'zakupy', splits: [{ id: newId(), amount: -10000, categoryId: cat('0101'), note: 'zakupy na tydzień' }, { id: newId(), amount: -3000, categoryId: cat('0203'), note: 'kabel; HDMI "złoty"' }] }),
    tx({ id: fixed(9), date: '2026-10-18', counterparty: 'Zakup dla Marka', amount: -7000, categoryId: cat('0601'), refundable: true, memberId: MAREK }),
    tx({ id: fixed(10), accountId: MBANK, date: '2026-10-28', kind: 'transfer', counterparty: 'Przelew na Portfel', amount: -30000, counterAccountId: WALLET, bothSides: true }),
    tx({ id: fixed(11), date: '2026-10-16', kind: 'transfer', counterparty: 'Przelew na lokatę', amount: -20000, counterAccountId: null }),
    tx({ id: fixed(12), date: '2026-10-20', counterparty: 'Zwrot butów', amount: 2500, categoryId: cat('0801') }),
    tx({ id: fixed(13), date: '2026-10-21', counterparty: 'Obiad w pracy', amount: -2300, categoryId: cat('0102'), impulse: 'impulse', logNote: 'głód' }),
    tx({ id: fixed(14), date: '2026-10-22', counterparty: 'Zaplanowany zakup', amount: -4500, categoryId: cat('0801'), impulse: 'plan' }),
    tx({ id: fixed(15), date: '2026-12-15', counterparty: 'Przyszły wydatek', amount: -1000, categoryId: cat('0101') })
  ])
}

/** Big amount (1 234 567,89 zł income) and a 5000-character note – on two days of their own. */
export function huge(dataDir: string): void {
  special(dataDir)
  const tx = (o: Record<string, unknown>) => ({ accountId: WALLET, kind: 'expense', ...o })
  addRecords(dataDir, 'transactions', [
    tx({ id: fixed(20), date: '2026-10-12', kind: 'income', counterparty: 'Duży wpływ', amount: 123456789 }),
    tx({ id: fixed(21), date: '2026-10-12', counterparty: 'Duży wydatek', amount: -123456789, categoryId: cat('0801') }),
    tx({ id: fixed(22), date: '2026-10-13', counterparty: 'Długa notatka', amount: -100, categoryId: cat('0101'), note: LONG_NOTE })
  ])
}

/** A category with a name of the 40 characters the schema allows (longer ones make the whole list of categories fall back) (the PDF's table must wrap it) – „Zwierzęta” renamed in fi.json. */
export const LONG_NAME = 'Zwierzęta domowe: karma, weterynarz, ŻŻŻ'
export function longCategory(dataDir: string): void {
  const f = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(f, 'utf8'))
  const c = fi.settings.categories.find((x: { name: string }) => x.name === 'Zwierzęta')
  if (!c) throw new Error('brak kategorii Zwierzęta')
  c.name = LONG_NAME
  writeFileSync(f, `${JSON.stringify(fi, null, 2)}
`)
}

export { text, existsSync }
