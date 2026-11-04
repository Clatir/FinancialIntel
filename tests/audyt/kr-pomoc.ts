/**
 * Audit area KR (kreator startu): helpers of the area's runs – a log of what the screen said, a new budget made through
 * the first-run screen, the wizard's fields, an import of a bank file from the wizard, checksums of folders.
 * Observation only: the runs read the screen and the files; the verdicts are written by hand in docs/audyt/raport/KR.md.
 */
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { expect, type Locator, type Page } from '@playwright/test'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { importDone } from '../e2e/app'
import { LAB, answerDialogs, recorded, shot, start, type Run, type StartOptions } from './lab'

export const FILES = join(LAB, 'pliki')
export const KR_FILES = join(LAB, 'pliki', 'kr')

/** The run's own log: C:\FI-audyt\przebiegi\<run>\kr.log (read afterwards to judge the points). */
export class Log {
  readonly file: string
  constructor(readonly run: string) {
    const dir = join(LAB, 'przebiegi', run)
    mkdirSync(dir, { recursive: true })
    this.file = join(dir, 'kr.log')
    writeFileSync(this.file, `# ${run} ${new Date().toISOString()}\n`)
  }
  line(s: string): void {
    appendFileSync(this.file, `${s}\n`)
  }
  head(s: string): void {
    this.line(`\n===== ${s} =====`)
  }
  async screen(page: Page, label: string, selector = 'body'): Promise<string> {
    let t: string
    try {
      t = await page.locator(selector).first().innerText({ timeout: 10_000 })
    } catch (e) {
      t = `(brak ${selector}: ${(e as Error).message.split('\n')[0]})`
    }
    this.line(`--- ${label} [${selector}] ---\n${t.replace(/\n{2,}/g, '\n')}`)
    return t
  }
  async shot(page: Page, id: string): Promise<void> {
    try {
      this.line(`zrzut: ${await shot(page, id)}`)
    } catch (e) {
      this.line(`zrzut ${id} – błąd: ${(e as Error).message.split('\n')[0]}`)
    }
  }
  /** Runs a part of a run; a failure is logged and the run goes on (a step that fails is a result, not the end). */
  async step(name: string, fn: () => Promise<void>): Promise<boolean> {
    this.head(name)
    try {
      await fn()
      return true
    } catch (e) {
      this.line(`!!! KROK NIEUDANY: ${(e as Error).message.split('\n').slice(0, 6).join(' | ')}`)
      return false
    }
  }
}

/** Toasts on the window now (role=status). */
export async function toasts(page: Page): Promise<string[]> {
  return page.getByRole('status').allInnerTexts().catch(() => [])
}

/** The first-run screen, then the proposal „Utwórz w OneDrive (zalecane)”: a new budget in the run's lab OneDrive. */
export async function newBudget(name: string, log: Log, opts: StartOptions = {}): Promise<{ run: Run; dataDir: string }> {
  const run = await start(name, { usePreset: false, ...opts })
  const dataDir = join(run.dir, 'OneDrive', 'FinancialIntel')
  await expect(run.page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
  await expect(run.page.getByTestId('setup-default')).toBeVisible({ timeout: 15_000 })
  await log.screen(run.page, 'ekran wyboru folderu', '[data-testid="folder-setup"]')
  await run.page.getByTestId('setup-default').click()
  await expect(run.page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
  await run.page.waitForTimeout(1500)
  return { run, dataDir }
}

/** An amount field: a click, the text, Enter (the field saves on Enter / leaving it). */
export async function amount(loc: Locator, value: string): Promise<void> {
  await loc.click()
  await loc.fill(value)
  await loc.press('Enter')
}

export async function openWizard(page: Page): Promise<void> {
  await page.getByTestId('banner-wizard-start').click()
  await expect(page.getByTestId('page-wizard')).toBeVisible({ timeout: 15_000 })
}

export async function toStep(page: Page, i: number): Promise<void> {
  await page.getByTestId(`wizard-step-${i}`).click()
  await page.waitForTimeout(250)
}

export const WIZ = '[data-testid="page-wizard"]'

/** Balance fields of step 1 by the account's name (aria-label „Saldo <name>”). */
export const balanceField = (page: Page, account: string): Locator => page.getByLabel(`Saldo ${account}`, { exact: true })

/** A decision of a group of the import: a token searched, the money's direction, an option (value or label), a category. */
export interface Decision {
  token: string
  dir: 'in' | 'out'
  option?: string
  optionLabel?: string
  categoryId?: string | null
}

/** Group decisions (as tests/audyt/persona.spec.ts – every group of the token and direction). */
export async function decide(page: Page, d: Decision, log: Log): Promise<void> {
  const search = page.getByTestId('import-search')
  await search.fill(d.token)
  await page.waitForTimeout(300)
  const groups = page.locator(`[data-testid="import-group"][data-group*="|${d.dir}|"]`)
  const n0 = await groups.count()
  if (!n0) log.line(`decyzja ${d.token}/${d.dir}: brak grup`)
  const skip = new Set<string>()
  let done = 0
  for (let round = 0; round < 40; round++) {
    const n = await groups.count()
    let target: { i: number; key: string; field: 'kind' | 'category' } | null = null
    for (let i = 0; i < n && !target; i++) {
      const g = groups.nth(i)
      const key = (await g.getAttribute('data-group'))?.split('|').slice(0, 2).join('|') ?? String(i)
      if (skip.has(key)) continue
      const kind = g.getByTestId('import-group-kind')
      if (await kind.count()) {
        const value = await kind.inputValue()
        const wanted = d.option ?? (d.optionLabel ? await kind.locator('option', { hasText: d.optionLabel }).first().getAttribute('value').catch(() => null) : null)
        if (wanted && value !== wanted) target = { i, key, field: 'kind' }
        else if (d.categoryId !== undefined && d.categoryId !== null) {
          const category = g.getByTestId('import-group-category')
          if ((await category.count()) && (await category.inputValue()) !== d.categoryId) target = { i, key, field: 'category' }
        }
      }
    }
    if (!target) break
    const g = groups.nth(target.i)
    try {
      if (target.field === 'kind') {
        if (d.option) await g.getByTestId('import-group-kind').selectOption(d.option, { timeout: 3000 })
        else await g.getByTestId('import-group-kind').selectOption({ label: d.optionLabel! }, { timeout: 3000 })
      } else await g.getByTestId('import-group-category').selectOption(d.categoryId!, { timeout: 3000 })
      done++
    } catch (e) {
      skip.add(target.key)
      log.line(`decyzja ${d.token}/${d.dir} [${target.key}] ${target.field} – ${(e as Error).message.split('\n')[0]}`)
    }
    await page.waitForTimeout(150)
  }
  log.line(`decyzja ${d.token}/${d.dir} → ${d.option ?? d.optionLabel ?? ''} ${d.categoryId ?? ''}: grup ${n0}, zmian ${done}`)
  await search.fill('')
}

/**
 * The import of a bank file from the wizard's step 2: „Importuj plik z mBanku”, the file, „Przyjmij pewne”, the group
 * decisions, the import, „Wróć do kreatora”.
 */
export async function importFromWizard(run: Run, log: Log, file: string, decisions: readonly Decision[], shotId?: string): Promise<void> {
  const { page, app } = run
  await page.getByTestId('wizard-import').click()
  await expect(page.getByTestId('page-import')).toBeVisible({ timeout: 15_000 })
  await answerDialogs(app, { paths: [file] })
  await page.getByTestId('import-pick').click()
  await expect(page.getByTestId('import-file')).toBeVisible({ timeout: 60_000 })
  await log.screen(page, 'plik importu', '[data-testid="import-file"]')
  const sure = page.getByTestId('import-accept-sure')
  if ((await sure.count()) && (await sure.isEnabled())) {
    log.line(`Przyjmij pewne: ${await sure.innerText()}`)
    await sure.click()
    await page.waitForTimeout(500)
  } else log.line('Przyjmij pewne: brak / nieaktywne')
  for (const d of decisions) await decide(page, d, log)
  for (const k of ['new', 'merge', 'known', 'excluded']) {
    const c = page.getByTestId(`import-count-${k}`)
    if (await c.count()) log.line(`import ${k}: ${await c.innerText()}`)
  }
  if (shotId) await log.shot(page, shotId)
  await page.getByTestId('import-run').click()
  await importDone(page, run.userData)
  await log.screen(page, 'wynik importu', '[data-testid="import-done"]')
}

/** sha256 of every file of a folder (relative paths with „/”). */
export function checksums(dir: string): Map<string, string> {
  const out = new Map<string, string>()
  if (!existsSync(dir)) return out
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      const st = statSync(p)
      if (st.isDirectory()) walk(p)
      else out.set(relative(dir, p).replace(/\\/g, '/'), createHash('sha256').update(readFileSync(p)).digest('hex'))
    }
  }
  walk(dir)
  return out
}

/** What changed between two checksums: added, removed, changed paths. */
export function diff(a: Map<string, string>, b: Map<string, string>): { added: string[]; removed: string[]; changed: string[] } {
  const added = [...b.keys()].filter((k) => !a.has(k)).sort()
  const removed = [...a.keys()].filter((k) => !b.has(k)).sort()
  const changed = [...a.keys()].filter((k) => b.has(k) && a.get(k) !== b.get(k)).sort()
  return { added, removed, changed }
}

export function logDiff(log: Log, label: string, d: ReturnType<typeof diff>): void {
  log.line(`${label}: dodane ${d.added.length}, usunięte ${d.removed.length}, zmienione ${d.changed.length}`)
  for (const k of d.added.slice(0, 40)) log.line(`  + ${k}`)
  if (d.added.length > 40) log.line(`  + … (${d.added.length - 40} więcej)`)
  for (const k of d.removed.slice(0, 40)) log.line(`  - ${k}`)
  for (const k of d.changed.slice(0, 40)) log.line(`  ~ ${k}`)
}

/** A record written into a data folder as the app writes it (schemas, path, serializer) – for special states. */
export function writeRecord(dir: string, collection: Collection, raw: Record<string, unknown>): string {
  const rec = SCHEMAS[collection].parse(raw) as unknown as Record<string, unknown>
  const rel = recordRelPath(collection, rec as never)
  const file = join(dir, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, serializeRecord(collection, rec as never))
  return rel
}

/**
 * After a wizard with „Uruchamiaj z Windows” on, the run's config.json says launchAtLogin: true – a later start of the
 * same user data would write a real Run entry before the lab's guard. Switched off in the run's config at the end.
 */
export function disarmAutostart(userData: string): void {
  const file = join(userData, 'config.json')
  if (!existsSync(file)) return
  const c = JSON.parse(readFileSync(file, 'utf8')) as { tray?: Record<string, unknown> }
  if (c.tray?.launchAtLogin) {
    c.tray.launchAtLogin = false
    writeFileSync(file, JSON.stringify(c, null, 2))
  }
}

/** A JSON file of a folder (null when missing). */
export function readJson(dir: string, rel: string): Record<string, unknown> | null {
  const p = join(dir, rel)
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>) : null
}

/** Every record of a collection of a folder (JSON files, no history / backups). */
export function recordsOf(dir: string, collection: string): Array<Record<string, unknown>> {
  const root = join(dir, collection)
  const out: Array<Record<string, unknown>> = []
  if (!existsSync(root)) return out
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('.json') && !name.includes('.tmp')) out.push(JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>)
    }
  }
  walk(root)
  return out
}

/** The format of every JSON file of the folder: 2-space indent and a final newline. */
export function formatCheck(dir: string): { files: number; bad: string[] } {
  const bad: string[] = []
  let files = 0
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) {
        if (!name.startsWith('.') && name !== 'backups') walk(p)
      } else if (name.endsWith('.json')) {
        files++
        const t = readFileSync(p, 'utf8')
        const ok = t.endsWith('}\n') && !t.endsWith('\n\n') && t === `${JSON.stringify(JSON.parse(t), null, 2)}\n`
        if (!ok) bad.push(relative(dir, p))
      }
    }
  }
  walk(dir)
  return { files, bad }
}

export async function logRecorded(run: Run, log: Log): Promise<void> {
  const r = await recorded(run.app).catch(() => null)
  log.line(`zapis laboratorium: ${JSON.stringify(r)}`)
}

/** Decisions of the import for runs that only need costs right: income, XTB, PIT-38, loans (the rest: „Przyjmij pewne”). */
export const SIMPLE: Decision[] = [
  { token: 'firma testowa', dir: 'in', option: 'income' },
  { token: 'anna testowa', dir: 'in', option: 'income' },
  { token: 'marek testowy', dir: 'in', option: 'income' },
  { token: 'xtb', dir: 'in', option: 'trading' },
  { token: 'xtb', dir: 'out', option: 'trading' },
  { token: 'urząd skarbowy', dir: 'out', option: 'tax' },
  { token: 'tomasz kolega', dir: 'out', option: 'loan' },
  { token: 'tomasz kolega', dir: 'in', option: 'loan' },
  { token: 'robert', dir: 'in', option: 'loan' }
]
