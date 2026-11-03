/**
 * Helpers of the audit's area DM (Domownicy i pożyczki, docs/audyt/punkty/3-pieniadze.md, AU-10): a run on a copy of the
 * persona „rok” changed before the start (members and records of the points), the screens read as text, the snapshot of
 * the data folder taken at every reading of numbers (the oracle of AU-9 counts on it). Observation only – the verdicts
 * are written by hand into docs/audyt/raport/DM.md.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { expect, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { SCHEMA_VERSION } from '../../src/shared/schema/common'
import { records } from '../e2e/files'
import { LAB, note, reading, shot, start, text, useState, type Run, type StartOptions } from './lab'

export const ACC = { mbank: '01KDEFACC00000000000000001', xtb: '01KDEFACC00000000000000002', cash: '01KDEFACC00000000000000003' }
export const CAT = {
  food: '01KDEFCAT00000000000000100',
  groceries: '01KDEFCAT00000000000000101',
  home: '01KDEFCAT00000000000000200',
  personal: '01KDEFCAT00000000000000800',
  clothes: '01KDEFCAT00000000000000801',
  gifts: '01KDEFCAT00000000000000900',
  gift: '01KDEFCAT00000000000000901'
}
/** Members of the persona „rok”. */
export const ROK = { anna: '01KDEFMEM00000000000000001', kasia: '01KAZ200000000000000000002', marek: '01KAZ200000000000000000003' }
/** Members of the points (added to fi.json of a run's copy): „Anna” is a clean one – the persona's Anna (with her advance) renamed. */
export const DMM = {
  anna: '01KDMMEM000000000000000001',
  tata: '01KDMMEM000000000000000002',
  babcia: '01KDMMEM000000000000000003'
}

const out: string[] = []
/** A line of the run's observation log (printed and kept in C:\FI-audyt\przebiegi\<run>\przebieg.log). */
export function log(run: string, ...parts: unknown[]): void {
  const line = parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')
  out.push(line)
  console.log(line)
  note(run, line)
}

// ------------------------------------------------------------------ the state

export function editSettings(dataDir: string, change: (s: Record<string, any>) => void): void {
  const f = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(f, 'utf8'))
  change(fi.settings)
  writeFileSync(f, `${JSON.stringify(fi, null, 2)}\n`)
}

export interface MemberSpec {
  id: string
  name: string
  inflow?: 'ask' | 'advance' | 'income'
  via?: string | null
  owed?: number
  deposit?: number
  openingSince?: string | null
  bankNames?: string[]
}

/** The persona's Anna renamed „A. Testowa” (her advance and history kept); the points' members added. */
export function members(dataDir: string, list: MemberSpec[], renameAnna = true): void {
  editSettings(dataDir, (s) => {
    const h = s.household
    if (renameAnna) {
      const a = h.members.find((m: { id: string }) => m.id === ROK.anna)
      if (a) a.name = 'A. Testowa'
    }
    for (const m of list) {
      const opening: Record<string, unknown> = { owed: m.owed ?? 0, deposit: m.deposit ?? 0 }
      if (m.openingSince !== undefined) opening.since = m.openingSince
      h.members.push({ id: m.id, name: m.name, bankNames: m.bankNames ?? [], inflow: m.inflow ?? 'ask', archived: false, via: m.via ?? null, opening })
    }
  })
}

let seq = 0
/** A valid ULID of a record added by the area (fixed prefix, a counter). */
export const dmId = (): string => `01KDMX${String(++seq).padStart(20, '0')}`
export const fixedId = (n: number): string => `01KDMF${String(n).padStart(20, '0')}`

/** Records added to a copied folder before the start, through the app's schemas. */
export function addRecords(dataDir: string, collection: Collection, list: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const at = '2026-11-03T08:00:00.000Z'
  return list.map((raw) => {
    const record = SCHEMAS[collection].parse({ schemaVersion: SCHEMA_VERSION, id: dmId(), createdAt: at, updatedAt: at, updatedBy: 'LAPTOP-KAPITANA', ...raw }) as unknown as Record<string, unknown>
    const file = join(dataDir, recordRelPath(collection, record))
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, serializeRecord(collection, record as never))
    return record
  })
}

/** A purchase a member finances (mBank, Jedzenie · zakupy spożywcze unless said). */
export const buy = (o: { id?: string; date: string; amount: number; member: string; counterparty?: string; categoryId?: string; gift?: boolean; accountId?: string }) => ({
  ...(o.id ? { id: o.id } : {}),
  date: o.date,
  accountId: o.accountId ?? ACC.mbank,
  kind: 'expense',
  amount: -Math.round(o.amount * 100),
  categoryId: o.categoryId ?? CAT.groceries,
  counterparty: o.counterparty ?? 'Sklep',
  refundable: true,
  memberId: o.member,
  ...(o.gift ? { gift: true } : {})
})

/** A member's money in (mBank). `kind` – the editor's „Cel wpłaty”; `advance` – „reszta: zaliczka”. */
export const pay = (o: { id?: string; date: string; amount: number; member: string; counterparty?: string; kind?: 'repay' | 'income' | 'advance'; advance?: boolean; covers?: string[]; accountId?: string }) => ({
  ...(o.id ? { id: o.id } : {}),
  date: o.date,
  accountId: o.accountId ?? ACC.mbank,
  kind: 'income',
  amount: Math.round(o.amount * 100),
  counterparty: o.counterparty ?? 'Przelew',
  memberId: o.member,
  inflowKind: o.kind ?? 'repay',
  advance: o.advance ?? o.kind === 'advance',
  covers: o.covers ?? []
})

/** The ICTTJ folder of the run now going (its copy of the state's): taken into every snapshot. */
let currentIctj: string | undefined

/** A run of the area on a fresh copy of „rok”, changed by `prepare` before the start. */
export async function runRok(name: string, prepare?: (dataDir: string) => void, opts: StartOptions = {}): Promise<Run & { dataDir: string; ictjDir?: string }> {
  const { dataDir, ictjDir } = useState('rok', name)
  currentIctj = ictjDir
  prepare?.(dataDir)
  const r = await start(name, { dataDir, ictjDir, ...opts })
  r.page.setDefaultTimeout(15_000)
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.page.waitForTimeout(2000)
  return { ...r, dataDir, ictjDir }
}

/** The same run started again (user data kept). */
export async function restart(name: string, dataDir: string, ictjDir?: string, opts: StartOptions = {}): Promise<Run & { dataDir: string; ictjDir?: string }> {
  const r = await start(name, { dataDir, ictjDir, fresh: false, ...opts })
  r.page.setDefaultTimeout(15_000)
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.page.waitForTimeout(2000)
  return { ...r, dataDir, ictjDir }
}

// ------------------------------------------------------------------ snapshots and readings

const skip = (root: string) => (src: string) => {
  const rel = relative(root, src)
  if (!rel) return true
  const top = rel.split(sep)[0]
  return top !== 'backups' && top !== '.history'
}

/** The data folder (and ICTTJ's) copied as it is now: C:\FI-audyt\migawki\dm\<point>-<n>\dane (…\ictj). */
export function snapshot(point: string, dataDir: string, ictjDir?: string): string {
  const base = join(LAB, 'migawki', 'dm')
  mkdirSync(base, { recursive: true })
  const stem = point.replace(/[^\w.-]+/g, '_')
  let n = 1
  while (existsSync(join(base, `${stem}-${n}`))) n++
  const dir = join(base, `${stem}-${n}`)
  cpSync(dataDir, join(dir, 'dane'), { recursive: true, filter: skip(dataDir) })
  if (ictjDir && existsSync(ictjDir)) cpSync(ictjDir, join(dir, 'ictj'), { recursive: true })
  return dir
}

let readings = 0
let snaps = 0
export const counts = () => ({ readings, snaps })

/** A reading of numbers (C:\FI-audyt\odczyty\dm.jsonl) with the snapshot of the folder taken first. */
export async function rd(page: Page, point: string, state: string, values: Record<string, string | number | null>, dataDir: string, ictjDir?: string): Promise<string> {
  // The autosave and the background writes reach the disk first.
  await page.waitForTimeout(1500)
  const dir = snapshot(point, dataDir, ictjDir ?? currentIctj)
  snaps++
  readings++
  reading('dm', point, state, { ...values, _migawka: dir })
  return dir
}

// ------------------------------------------------------------------ screens

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
async function opt(loc: Locator): Promise<string> {
  return (await loc.count()) ? clean(await loc.first().innerText()) : '(brak)'
}

/** The Mostek's numbers: energy today, the layers, the household, the range. */
export async function mostek(page: Page): Promise<Record<string, string>> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(900)
  const state = await opt(page.getByTestId('bridge-state'))
  return {
    energiaDzis: await opt(page.getByTestId('bridge-energy')),
    oslony: await opt(page.getByTestId('state-shields')),
    energia: await opt(page.getByTestId('state-energy')),
    kadlub: await opt(page.getByTestId('state-hull')),
    depozyt: await opt(page.getByTestId('state-deposit')),
    dlug: await opt(page.getByTestId('state-debt')),
    zasieg: await opt(page.getByTestId('state-range')),
    masa: await opt(page.getByTestId('state-cargo')),
    sumaKont: /Suma kont budżetu: ([^\n]+)/.exec(state)?.[1]?.trim() ?? '?',
    stan: state,
    domownicy: (await page.getByTestId('bridge-member').allInnerTexts()).map(clean).join(' | '),
    domRazem: await opt(page.getByTestId('bridge-house')),
    rozliczenia: await opt(page.getByTestId('bridge-receivables'))
  }
}

/** The Mostek's briefing (odprawa) items. */
export async function odprawa(page: Page): Promise<string[]> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(700)
  return (await page.locator('[data-testid="briefing-items"] button').allInnerTexts()).map(clean)
}

/** Radar (Ctrl+7): Należności, Pożyczki, the timeline. */
export async function radar(page: Page): Promise<Record<string, string>> {
  await page.keyboard.press('Control+7')
  await page.getByTestId('page-radar').waitFor()
  await page.waitForTimeout(1000)
  const memberRows = page.getByTestId('radar-member')
  const rows: string[] = []
  for (let i = 0; i < (await memberRows.count()); i++) {
    const r = memberRows.nth(i)
    const accent = await r.locator('span.text-accent').count()
    rows.push(`${clean(await r.innerText())}${accent ? ' [akcent]' : ''}`)
  }
  return {
    domownicy: rows.join(' | '),
    domRazem: await opt(page.getByTestId('radar-house')),
    naleznosci: await opt(page.getByTestId('radar-receivables')),
    dlug: await opt(page.getByTestId('radar-debt')),
    pozyczki: (await page.getByTestId('loan-row').allInnerTexts()).map(clean).join(' | '),
    naRadarze: await opt(page.getByTestId('radar-items'))
  }
}

/** Ustawienia → Domownicy: each member's choice and balance, the settlements' start, the assignment's day. */
export async function ustawieniaDomownicy(page: Page): Promise<Record<string, string>> {
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('settings-tab-household').click()
  await page.waitForTimeout(800)
  const rows = page.getByTestId('member-row')
  const outv: string[] = []
  for (let i = 0; i < (await rows.count()); i++) {
    const r = rows.nth(i)
    const name = await r.getAttribute('data-name')
    const inflow = await r.locator('[role="radiogroup"][aria-label="Reszta wpłaty domownika"] [aria-checked="true"]').innerText().catch(() => '?')
    const bal = await opt(r.getByTestId('member-balance'))
    const un = await opt(r.getByTestId('member-unassigned'))
    const opening = (await r.getByTestId('member-opening').count()) ? await r.getByTestId('member-opening').inputValue() : ''
    const via = (await r.getByTestId('member-via').count()) ? await r.getByTestId('member-via').evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent ?? '') : ''
    outv.push(`${name}: reszta=${inflow}; saldo=${bal}; doPrzypisania=${un}; start=${opening}; przez=${via}`)
  }
  return {
    osoby: outv.join(' | '),
    od: await opt(page.getByTestId('household-since-row')),
    przypisanie: await opt(page.getByTestId('household-assign-row'))
  }
}

/** The panel „Przychody” of the Mostek (averages of full months). */
export async function przychody(page: Page): Promise<string> {
  await page.keyboard.press('Control+4')
  await page.getByTestId('page-month').waitFor()
  await page.waitForTimeout(800)
  return opt(page.getByTestId('income-panel'))
}

/** Raporty (Ctrl+0) → Debriefing of a month: its lines (net costs, financed, the fuel balance). */
export async function raport(page: Page, month: string): Promise<string> {
  await page.keyboard.press('Control+0')
  await page.waitForTimeout(500)
  await page.locator('[role="radiogroup"][aria-label="Raport"]').getByRole('radio', { name: 'Debriefing' }).click()
  await page.getByTestId('reports-debrief').waitFor({ timeout: 30_000 })
  await page.getByTestId('reports-debrief-month').selectOption(month)
  await page.waitForTimeout(900)
  return opt(page.getByTestId('reports-debrief'))
}

/** A line of the report's text: „Koszty netto 1 234,56 zł”. */
export function line(report: string, label: string): string {
  const i = report.indexOf(label)
  if (i < 0) return '(brak)'
  return report.slice(i, i + label.length + 60).split(/(?<=zł)/)[0]!.trim()
}

/** Plan miesiąca (Ctrl+4): the envelope of a category (its row and the month's debriefing). */
export async function plan(page: Page, envelope = 'Jedzenie'): Promise<Record<string, string>> {
  await page.keyboard.press('Control+4')
  await page.getByTestId('page-month').waitFor()
  await page.waitForTimeout(900)
  const env = page.locator(`[data-testid="month-envelope"][data-name="${envelope}"]`)
  const envText = (await env.count()) ? clean(await env.first().innerText()) : '(brak)'
  const envInput = (await env.locator('[data-testid="month-envelope-input"]').count()) ? await env.locator('[data-testid="month-envelope-input"]').first().inputValue() : ''
  return {
    koperta: `${envText} ${envInput}`.trim(),
    koperty: (await opt(page.getByTestId('month-envelopes'))).slice(0, 1500),
    debriefing: (await opt(page.getByTestId('month-debrief'))).slice(0, 1500),
    sfinansowane: await opt(page.getByTestId('debrief-financed'))
  }
}

/** Dowództwo (Ctrl+8): today's assessment so far. */
export async function dzisGra(page: Page): Promise<string> {
  await page.keyboard.press('Control+8')
  await page.waitForTimeout(900)
  return opt(page.getByTestId('command-today'))
}

/** Meldunki (Ctrl+Shift+M): one kind's items. */
export async function meldunki(page: Page, kind?: string): Promise<string[]> {
  await page.keyboard.press('Control+Shift+M')
  await page.getByTestId('page-inbox').waitFor({ timeout: 30_000 })
  await page.waitForTimeout(700)
  const sel = kind ? `[data-testid="inbox-item"][data-kind="${kind}"]` : '[data-testid="inbox-item"]'
  return (await page.locator(sel).allInnerTexts()).map(clean)
}

// ------------------------------------------------------------------ the operation's editor

export async function goOps(page: Page): Promise<void> {
  await page.keyboard.press('Control+2')
  await expect(page.getByTestId('page-operations')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(600)
}

/** A new operation (Ctrl+N on Operacje) of a kind. */
export async function newOp(page: Page, kind: 'Wydatek' | 'Wpływ' = 'Wydatek'): Promise<void> {
  await goOps(page)
  await page.keyboard.press('Control+n')
  await page.getByTestId('operation-editor').waitFor()
  await page.waitForTimeout(300)
  if (kind !== 'Wydatek') await page.getByTestId('operation-editor').locator('[role="radiogroup"][aria-label="Rodzaj operacji"]').getByRole('radio', { name: kind }).click()
  await page.waitForTimeout(200)
}

/** A field typed as a user does: click, the text, Enter (or Tab). */
export async function typeIn(page: Page, target: string | Locator, value: string, key: 'Enter' | 'Tab' = 'Enter'): Promise<void> {
  const field = typeof target === 'string' ? page.getByTestId(target) : target
  await field.click()
  await field.fill(value)
  await field.press(key)
  await page.waitForTimeout(250)
}

/** The editor's fields: amount, date (DD.MM.RRRR), counterparty, category, account. */
export async function fill(page: Page, f: { amount?: string; date?: string; counterparty?: string; categoryId?: string; accountId?: string }): Promise<void> {
  if (f.amount != null) await typeIn(page, 'operation-amount', f.amount)
  if (f.date) await typeIn(page, 'operation-date', f.date)
  if (f.counterparty != null) await typeIn(page, 'operation-counterparty', f.counterparty)
  if (f.categoryId) {
    await page.getByTestId('operation-category').selectOption(f.categoryId)
    await page.waitForTimeout(250)
  }
  if (f.accountId) {
    await page.getByTestId('operation-account').selectOption(f.accountId)
    await page.waitForTimeout(250)
  }
}

/** „Finansuje”: `pay:<id>`, `gift:<id>` or '' (mine). */
export async function financer(page: Page, value: string): Promise<void> {
  await page.getByTestId('operation-financer').selectOption(value)
  await page.waitForTimeout(400)
}

/** „Od domownika”. */
export async function payer(page: Page, memberId: string): Promise<void> {
  await page.getByTestId('operation-payer').selectOption(memberId)
  await page.waitForTimeout(400)
}

export const editorText = async (page: Page): Promise<string> => clean(await text(page, '[data-testid="operation-editor"]'))

/** An operation opened from the list: the whole history searched for `q`, the first row with `has` clicked. */
export async function openOp(page: Page, q: string, has?: string | RegExp): Promise<void> {
  await goOps(page)
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
  await page.getByTestId('operation-editor').waitFor()
  await page.waitForTimeout(500)
}

/** The rows of Operacje now shown (searched for `q`). */
export async function rowsOf(page: Page, q: string): Promise<string[]> {
  await goOps(page)
  const label = await page.getByTestId('operations-period').innerText().catch(() => '')
  if (label !== 'cała historia') {
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.waitForTimeout(500)
  }
  await page.getByTestId('operations-search').fill(q)
  await page.waitForTimeout(600)
  return (await page.getByTestId('operation-row').allInnerTexts()).map(clean)
}

/** The toasts on screen now. */
export const toasts = async (page: Page): Promise<string[]> => (await page.getByRole('status').allInnerTexts()).map(clean)

/** The toasts seen within `ms` after an action (polled – a short toast is caught). */
export async function toastsAfter(page: Page, action: () => Promise<unknown>, ms = 2500): Promise<string[]> {
  const seen = new Set<string>()
  const before = new Set(await toasts(page))
  await action()
  const until = Date.now() + ms
  while (Date.now() < until) {
    for (const t of await toasts(page)) if (!before.has(t)) seen.add(t)
    await page.waitForTimeout(80)
  }
  return [...seen]
}

export async function snap(page: Page, id: string): Promise<string> {
  const f = await shot(page, id)
  console.log(`[zrzut] ${f}`)
  return f
}

/** The quick entry window (as the E2E tests open it). */
export async function quick(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let q: Page | undefined
  await expect.poll(() => (q = app.windows().find((w) => w.url().includes('quick=1'))), { timeout: 20_000 }).toBeTruthy()
  await expect(q!.getByTestId('quick-amount')).toBeVisible({ timeout: 20_000 })
  await q!.waitForTimeout(400)
  if (await q!.getByTestId('quick-clear').count()) {
    await q!.getByTestId('quick-clear').click()
    await q!.waitForTimeout(300)
  }
  return q!
}

export async function quickVisible(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes('quick=1') && w.isVisible()))
}

/** Every record of a collection in the folder. */
export const recs = (dataDir: string, c: Collection) => records(dataDir, c)
export const txs = (dataDir: string) => records(dataDir, 'transactions')

/** The folder's transactions whose counterparty is `name`. */
export async function txOf(dataDir: string, name: string): Promise<Array<Record<string, unknown>>> {
  return (await txs(dataDir)).filter((t) => t.counterparty === name)
}

export function brief(t: Record<string, unknown>): Record<string, unknown> {
  const keys = ['id', 'date', 'kind', 'amount', 'accountId', 'counterparty', 'refundable', 'memberId', 'advance', 'inflowKind', 'gift', 'share', 'splits', 'covers', 'coversOpening', 'coversOpeningMembers', 'loanId', 'containerId']
  const o: Record<string, unknown> = {}
  for (const k of keys) if (t[k] !== undefined && !(Array.isArray(t[k]) && !(t[k] as unknown[]).length)) o[k] = t[k]
  return o
}

/** Removes a run's own snapshot folder for a point (a repeated script starts its snapshots anew). */
export function clearSnapshots(prefix: string): void {
  const base = join(LAB, 'migawki', 'dm')
  if (!existsSync(base)) return
  for (const d of readdirSync(base)) if (d.startsWith(prefix)) rmSync(join(base, d), { recursive: true, force: true })
}

export { note, text }
