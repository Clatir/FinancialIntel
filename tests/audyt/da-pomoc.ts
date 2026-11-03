/**
 * Audit area DA (dane i dwa komputery): helpers of the area's runs – a log of what the screen said, checksums of folders,
 * the files of a folder changed from outside (cloud copies, newer versions, broken files), ZIPs read and made, a file held
 * open by another process, and the lab's catch of the app's moves to the Windows Recycle Bin (never the user's Bin).
 * Observation only: the runs read the screen and the files; the verdicts are written by hand in docs/audyt/raport/DA.md.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, createWriteStream, existsSync, mkdirSync, openSync, closeSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { expect, type Page } from '@playwright/test'
import yauzl from 'yauzl'
import yazl from 'yazl'
import { LAB, killTree, shot, start, useState, type Run, type StartOptions } from './lab'

export const MBANK = '01KDEFACC00000000000000001'
export const WALLET = '01KDEFACC00000000000000002'
export const CASH = '01KDEFACC00000000000000003'
export const cat = (n: string): string => `01KDEFCAT${n.padStart(17, '0')}`
/** The freezing of game days as in the released app (the e2e launcher sets both to 0). */
export const PROD_FREEZE = { FI_FREEZE_AFTER_OPEN_MS: String(3 * 60_000), FI_FREEZE_QUIET_MS: String(60_000) }

/** The run's own log: C:\FI-audyt\przebiegi\<run>\da.log. */
export class Log {
  readonly file: string
  constructor(readonly run: string, append = false) {
    const dir = join(LAB, 'przebiegi', run)
    mkdirSync(dir, { recursive: true })
    this.file = join(dir, 'da.log')
    if (append) appendFileSync(this.file, `\n# ${run} (dalej) ${new Date().toISOString()}\n`)
    else writeFileSync(this.file, `# ${run} ${new Date().toISOString()}\n`)
  }
  line(s: string): void {
    appendFileSync(this.file, `${s}\n`)
  }
  head(s: string): void {
    this.line(`\n===== ${s} ===== ${new Date().toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw' })}`)
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
  /** A part of a run; a failure is logged and the run goes on (a step that fails is a result, not the end). */
  async step(name: string, fn: () => Promise<void>): Promise<boolean> {
    this.head(name)
    try {
      await fn()
      return true
    } catch (e) {
      this.line(`!!! KROK NIEUDANY: ${(e as Error).message.split('\n').slice(0, 8).join(' | ')}`)
      return false
    }
  }
}

/** Toasts on the window now (role=status). */
export async function toasts(page: Page): Promise<string> {
  return (await page.getByRole('status').allInnerTexts().catch(() => [] as string[])).map((t) => t.replace(/\s+/g, ' ')).join(' || ')
}

/** Banners on the window now. */
export async function banners(page: Page): Promise<string> {
  return (await page.locator('[data-testid^="banner-"]').allInnerTexts().catch(() => [] as string[])).map((t) => t.replace(/\s+/g, ' ')).join(' || ')
}

/**
 * sha256 of every file of a folder (relative paths with „/”). By default without `.presence/` and `backups/` (the audit's
 * „suma kontrolna”); `all` – every file.
 */
export function checksums(dir: string, all = false): Map<string, string> {
  const out = new Map<string, string>()
  if (!existsSync(dir)) return out
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      const rel = relative(dir, p).replace(/\\/g, '/')
      if (st.isDirectory()) {
        if (!all && (rel === '.presence' || rel === 'backups')) continue
        walk(p)
      } else {
        try {
          out.set(rel, createHash('sha256').update(readFileSync(p)).digest('hex'))
        } catch (e) {
          out.set(rel, `(nieczytelny: ${(e as Error).message.split('\n')[0]})`)
        }
      }
    }
  }
  walk(dir)
  return out
}

export function diff(a: Map<string, string>, b: Map<string, string>): { added: string[]; removed: string[]; changed: string[] } {
  const added = [...b.keys()].filter((k) => !a.has(k)).sort()
  const removed = [...a.keys()].filter((k) => !b.has(k)).sort()
  const changed = [...a.keys()].filter((k) => b.has(k) && a.get(k) !== b.get(k)).sort()
  return { added, removed, changed }
}

export function logDiff(log: Log, label: string, d: ReturnType<typeof diff>, max = 40): void {
  log.line(`${label}: dodane ${d.added.length}, usunięte ${d.removed.length}, zmienione ${d.changed.length}`)
  for (const k of d.added.slice(0, max)) log.line(`  + ${k}`)
  if (d.added.length > max) log.line(`  + … (${d.added.length - max} więcej)`)
  for (const k of d.removed.slice(0, max)) log.line(`  - ${k}`)
  if (d.removed.length > max) log.line(`  - … (${d.removed.length - max} więcej)`)
  for (const k of d.changed.slice(0, max)) log.line(`  ~ ${k}`)
  if (d.changed.length > max) log.line(`  ~ … (${d.changed.length - max} więcej)`)
}

/** Files of a folder whose names look temporary (`.tmp`, `~`, a leading dot outside .history / .presence). */
export function tempFiles(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    if (!existsSync(d)) return
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      const rel = relative(dir, p).replace(/\\/g, '/')
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      if (st.isDirectory()) {
        if (rel === '.history' || rel === '.presence') continue
        walk(p)
      } else if (/\.tmp|~$|^\./.test(name)) out.push(rel)
    }
  }
  walk(dir)
  return out
}

export function readJson(path: string): Record<string, any> | null {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>) : null
}

/** A JSON file written as the app writes it (2 spaces, a final newline). */
export function writeJson(path: string, obj: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`)
}

/** Every JSON record file of a collection: its path and content (no history, no backups, no conflict copies by default). */
export function recordFiles(dataDir: string, collection: string, withCopies = false): Array<{ path: string; rel: string; rec: Record<string, any> }> {
  const root = join(dataDir, collection)
  const out: Array<{ path: string; rel: string; rec: Record<string, any> }> = []
  const walk = (d: string) => {
    if (!existsSync(d)) return
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('.json') && !name.startsWith('.') && (withCopies || /^((\d{4}-\d{2}-\d{2}_)?[0-9A-Z]{26}|\d{4}-\d{2})\.json$/.test(name))) {
        try {
          out.push({ path: p, rel: relative(dataDir, p).replace(/\\/g, '/'), rec: JSON.parse(readFileSync(p, 'utf8')) })
        } catch {
          /* broken file */
        }
      }
    }
  }
  walk(root)
  return out
}

/** The operation of a folder that matches (its file and record). */
export function findOp(dataDir: string, pred: (r: Record<string, any>) => boolean): { path: string; rel: string; rec: Record<string, any> } {
  const hit = recordFiles(dataDir, 'transactions').find((f) => pred(f.rec))
  if (!hit) throw new Error('brak operacji spełniającej warunek')
  return hit
}

/** The format of every JSON file of the folder: 2-space indent and a final newline (no .history / .presence / backups). */
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
        let ok = false
        try {
          ok = t.endsWith('}\n') && !t.endsWith('\n\n') && t === `${JSON.stringify(JSON.parse(t), null, 2)}\n`
        } catch {
          ok = false
        }
        if (!ok) bad.push(relative(dir, p))
      }
    }
  }
  walk(dir)
  return { files, bad }
}

// ---------------------------------------------------------------------------------------------- the lab's catches

/**
 * The app's moves to the Windows Recycle Bin (`electron.shell.trashItem`, called by property at call time in the bundle)
 * replaced by a move into the run's own folder `kosz\` and a record – the user's Recycle Bin is never touched. Questions
 * of the main process (`dialog.showMessageBox(Sync)`) are recorded too; `answer` = the button chosen (default: none set –
 * the real dialog).
 */
export async function trap(run: Run, log?: Log): Promise<void> {
  const bin = join(run.dir, 'kosz')
  mkdirSync(bin, { recursive: true })
  await run.app.evaluate(({ shell }, binDir) => {
    const g = globalThis as unknown as { __da?: { trashed: string[]; dialogs: unknown[]; answer: number | null } }
    if (!g.__da) g.__da = { trashed: [], dialogs: [], answer: null }
    const rec = g.__da
    const get = (m: string) => ((process as unknown as { getBuiltinModule?: (n: string) => unknown }).getBuiltinModule?.(m) ?? process.mainModule!.require(m)) as never
    const fs = get('node:fs') as typeof import('node:fs')
    const path = get('node:path') as typeof import('node:path')
    const trashItem = async (p: string) => {
      rec.trashed.push(p)
      const target = path.join(binDir, `${Date.now()}_${path.basename(p)}`)
      fs.renameSync(p, target)
    }
    ;(trashItem as unknown as { __lab: boolean }).__lab = true
    shell.trashItem = trashItem
  }, bin)
  const ok = await run.app.evaluate(({ shell }) => !!(shell.trashItem as unknown as { __lab?: boolean }).__lab)
  if (!ok) {
    killTree(run.app)
    throw new Error('Pułapka Kosza nie zadziałała – przebieg przerwany (nic nie trafiło do Kosza).')
  }
  log?.line(`pułapka Kosza: shell.trashItem → ${bin}`)
}

/** The next questions of the main process answered with the button `answer` (and recorded with their texts). */
export async function answerQuestions(run: Run, answer: number): Promise<void> {
  await run.app.evaluate(({ dialog }, ans) => {
    const g = globalThis as unknown as { __da?: { trashed: string[]; dialogs: unknown[]; answer: number | null } }
    if (!g.__da) g.__da = { trashed: [], dialogs: [], answer: null }
    const rec = g.__da
    rec.answer = ans
    const sync = (...args: unknown[]) => {
      const opts = (args.length > 1 ? args[1] : args[0]) as Record<string, unknown>
      rec.dialogs.push({ at: new Date().toISOString(), kind: 'sync', title: opts?.title, message: opts?.message, detail: opts?.detail, buttons: opts?.buttons, answer: rec.answer })
      return rec.answer ?? 0
    }
    dialog.showMessageBoxSync = sync as typeof dialog.showMessageBoxSync
    dialog.showMessageBox = (async (...args: unknown[]) => ({ response: sync(...args), checkboxChecked: false })) as unknown as typeof dialog.showMessageBox
  }, answer)
}

export async function trapped(run: Run): Promise<{ trashed: string[]; dialogs: unknown[] }> {
  return run.app.evaluate(() => {
    const g = globalThis as unknown as { __da?: { trashed: string[]; dialogs: unknown[] } }
    return { trashed: g.__da?.trashed ?? [], dialogs: g.__da?.dialogs ?? [] }
  })
}

/** A run on a fresh copy of „rok” (changed before the start by `prepare`), with the Recycle Bin caught. */
export async function openRok(name: string, opts: StartOptions & { prepare?: (dataDir: string) => void; log?: Log } = {}): Promise<{ run: Run; dataDir: string; ictjDir?: string }> {
  const { dataDir, ictjDir } = useState('rok', name)
  opts.prepare?.(dataDir)
  const run = await start(name, { dataDir, ictjDir, ...opts, env: { ...PROD_FREEZE, ...opts.env } })
  await trap(run, opts.log)
  run.page.setDefaultTimeout(15_000)
  await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await run.page.waitForTimeout(1500)
  return { run, dataDir, ictjDir }
}

/** The same folder started again (user data kept unless `fresh`). */
export async function reopen(name: string, dataDir: string, opts: StartOptions & { log?: Log; waitBridge?: boolean } = {}): Promise<Run> {
  const run = await start(name, { dataDir, fresh: false, ...opts, env: { ...PROD_FREEZE, ...opts.env } })
  await trap(run, opts.log)
  run.page.setDefaultTimeout(15_000)
  if (opts.waitBridge !== false) {
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await run.page.waitForTimeout(1500)
  }
  return run
}

/** The watcher's rescan without waiting for it. */
export async function rescan(page: Page): Promise<void> {
  await page.evaluate(() => (globalThis as unknown as { fi: { rescan(): Promise<void> } }).fi.rescan()).catch(() => undefined)
  await page.waitForTimeout(800)
}

export async function goSync(page: Page): Promise<void> {
  await page.getByTestId('nav-sync').click()
  await page.waitForTimeout(600)
}

export async function goFolderTab(page: Page): Promise<void> {
  await page.keyboard.press('Control+,')
  await page.getByTestId('settings-tab-folder').click()
  await page.waitForTimeout(800)
}

/** Ids of the persona's operations used by the area (unique records – a counterparty may repeat). */
export const OP = {
  cinema: '01M6GDM914YEJ2RP70WV1T1NF8', // CINEMA CITY 14.10.2026, −65,01, mBank
  zoo: '01M6GDM914YEJ2RP70WV1T1NF7', // ZOOPLUS 13.10.2026, −176,16
  fryzjer: '01M6GDM914YEJ2RP70WV1T1NFJ', // FRYZJER STYL 19.10.2026, −87,91
  drogeria: '01M6GDM914YEJ2RP70WV1T1NFT', // DROGERIA NATURA 23.10.2026, −28,15
  rossmann: '01KAZ600000000000000000200', // Rossmann 16.10.2026, −59,43
  bolt: '01M6GDM914YEJ2RP70WV1T1NFC', // BOLT.EU 15.10.2026, −20,31
  netia: '01M6GDM914YEJ2RP70WV1T1NFD', // NETIA SA 15.10.2026, −60,00
  kebab: '01M6GDM914YEJ2RP70WV1T1NF3', // KEBAB ROMA 13.10.2026
  bar: '01M6GDM914YEJ2RP70WV1T1NF4', // BAR POD LIPA 13.10.2026
  allegro: '01KAZ600000000000000000201', // Allegro 20.10.2026
  apteka: '01KAZ600000000000000000203', // Apteka 30.10.2026, −17,94
  mokka: '01KAZ600000000000000000072', // Mokka 03.11.2026, −12,00, Portfel XTB
  grycan: '01KAZ600000000000000000069' // Lody Grycan 30.10.2026, −28,60, Portfel XTB
} as const

export const byId = (dataDir: string, id: string) => findOp(dataDir, (r) => r.id === id)

/** The operation editor closed (Esc until it is gone). */
export async function closeEditor(page: Page): Promise<void> {
  for (let i = 0; i < 3 && (await page.getByTestId('operation-editor').count()); i++) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
}

/**
 * An operation opened in the editor: the Operations screen, the whole history, the search for `query`, the row of the
 * record `id` (or the first row of the results).
 */
export async function openOp(page: Page, query: string, id?: string): Promise<void> {
  await closeEditor(page)
  await page.keyboard.press('Control+2')
  await expect(page.getByTestId('page-operations')).toBeVisible({ timeout: 30_000 })
  await closeEditor(page)
  const label = await page.getByTestId('operations-period').innerText().catch(() => '')
  if (label !== 'cała historia') {
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.waitForTimeout(500)
  }
  await page.getByTestId('operations-search').fill(query)
  await page.waitForTimeout(700)
  const row = id ? page.locator(`[data-testid="operation-row"][data-key="${id}"]`) : page.locator('[data-testid="operation-row"]', { hasText: query }).first()
  await row.click()
  await expect(page.getByTestId('operation-editor')).toBeVisible()
  await page.waitForTimeout(300)
}

/**
 * An amount field: a click, the text; `leave` – Enter (the field saves on Enter / leaving it). The editor's question
 * „Zmienić operację?” (a bank operation's amount) answered „Zmień mimo to”; returns its text ('' – none).
 */
export async function typeAmount(page: Page, testId: string, value: string, leave = true): Promise<string> {
  const f = page.getByTestId(testId)
  await f.click()
  await f.fill(value)
  if (!leave) return ''
  await f.press('Enter')
  await page.waitForTimeout(500)
  const guard = page.getByTestId('operation-guard')
  if (await guard.count()) {
    const t = (await guard.innerText()).replace(/\s+/g, ' ')
    await page.getByTestId('operation-guard-confirm').click()
    await page.waitForTimeout(500)
    return t
  }
  return ''
}

// ---------------------------------------------------------------------------------------------- ZIPs

/** Entries of a ZIP with the sha256 of each (null – the ZIP could not be read). */
export function zipEntries(path: string): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true, strictFileNames: false, validateEntrySizes: true }, (err, zip) => {
      if (err || !zip) return reject(err)
      const out = new Map<string, string>()
      zip.on('entry', (e: yauzl.Entry) => {
        if (/\/$/.test(e.fileName)) return zip.readEntry()
        zip.openReadStream(e, (er, s) => {
          if (er || !s) return reject(er)
          const h = createHash('sha256')
          s.on('data', (c: Buffer) => h.update(c))
          s.on('end', () => {
            out.set(e.fileName, h.digest('hex'))
            zip.readEntry()
          })
          s.on('error', reject)
        })
      })
      zip.on('end', () => resolve(out))
      zip.on('error', reject)
      zip.readEntry()
    })
  })
}

/** A ZIP made of named buffers; `rename` – names patched in the bytes afterwards (same length, e.g. a „../” entry). */
export async function makeZip(path: string, entries: Array<{ name: string; data: Buffer | string }>, rename: Array<[string, string]> = []): Promise<void> {
  mkdirSync(dirname(path), { recursive: true })
  const z = new yazl.ZipFile()
  for (const e of entries) z.addBuffer(Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data), e.name, { mtime: new Date('2026-10-01T10:00:00Z') })
  z.end()
  await new Promise<void>((res, rej) => {
    const out = createWriteStream(path)
    z.outputStream.pipe(out).on('close', () => res()).on('error', rej)
  })
  if (rename.length) {
    let buf = readFileSync(path)
    for (const [from, to] of rename) {
      if (from.length !== to.length) throw new Error('rename: different lengths')
      const a = Buffer.from(from)
      const b = Buffer.from(to)
      let i = buf.indexOf(a)
      while (i >= 0) {
        b.copy(buf, i)
        i = buf.indexOf(a, i + 1)
      }
    }
    writeFileSync(path, buf)
    buf = Buffer.alloc(0)
  }
}

/** Every data file of a folder as ZIP entries (no .history / .presence / backups). */
export function folderEntries(dir: string): Array<{ name: string; data: Buffer }> {
  const out: Array<{ name: string; data: Buffer }> = []
  for (const [rel] of checksums(dir)) if (!rel.startsWith('.history/')) out.push({ name: rel, data: readFileSync(join(dir, rel)) })
  return out
}

// ---------------------------------------------------------------------------------------------- a file held open

/**
 * A file opened for reading with no sharing by another process (PowerShell) – as an antivirus or OneDrive may hold it.
 * Returns the release (the process killed); waits until the file is really held.
 */
export async function holdFile(path: string): Promise<() => void> {
  const ps: ChildProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$f=[IO.File]::Open('${path.replace(/'/g, "''")}','Open','Read','None'); Start-Sleep -Seconds 900; $f.Close()`], { stdio: 'ignore', windowsHide: true })
  const held = () => {
    try {
      closeSync(openSync(path, 'r'))
      return false
    } catch {
      return true
    }
  }
  for (let i = 0; i < 60 && !held(); i++) await new Promise((r) => setTimeout(r, 250))
  if (!held()) throw new Error(`holdFile: plik nie został zablokowany: ${path}`)
  return () => {
    try {
      if (ps.pid) spawn('taskkill', ['/PID', String(ps.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    } catch {
      /* gone */
    }
  }
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** The end of the run's main.log (lines matching `filter` when given). */
export function mainLog(run: Run, filter?: RegExp, last = 60): string {
  const f = join(run.userData, 'logs', 'main.log')
  if (!existsSync(f)) return '(brak main.log)'
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  return (filter ? lines.filter((l) => filter.test(l)) : lines).slice(-last).join('\n')
}

/** The next file dialogs answered with `paths` (open) / `savePath` (save) and their titles recorded (`trapped().picks`). */
export async function pick(run: Run, a: { paths?: string[]; savePath?: string; cancel?: boolean }): Promise<void> {
  await run.app.evaluate(({ dialog }, ans) => {
    const g = globalThis as unknown as { __da?: { trashed: string[]; dialogs: unknown[]; answer: number | null; picks?: string[] } }
    if (!g.__da) g.__da = { trashed: [], dialogs: [], answer: null }
    const rec = g.__da
    rec.picks ??= []
    const title = (args: unknown[]) => ((args.length > 1 ? args[1] : args[0]) as { title?: string })?.title ?? ''
    dialog.showOpenDialog = (async (...args: unknown[]) => {
      rec.picks!.push(`open: ${title(args)}`)
      return ans.cancel ? { canceled: true, filePaths: [] } : { canceled: false, filePaths: ans.paths ?? [] }
    }) as unknown as typeof dialog.showOpenDialog
    dialog.showSaveDialog = (async (...args: unknown[]) => {
      rec.picks!.push(`save: ${title(args)}`)
      return ans.cancel ? { canceled: true, filePath: '' } : { canceled: false, filePath: ans.savePath ?? '' }
    }) as unknown as typeof dialog.showSaveDialog
  }, a)
}

export async function picks(run: Run): Promise<string[]> {
  return run.app.evaluate(() => (globalThis as unknown as { __da?: { picks?: string[] } }).__da?.picks ?? [])
}
