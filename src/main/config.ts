// adapted from ICTTJ src/main/config.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { MachineConfig } from '@shared/api'
import { DEFAULT_UPDATE_PREFS, type PendingUpdate } from '@shared/update'
import { DEFAULT_MACHINE_PREFS, altGrConflict, machinePrefsFrom } from '@shared/machine'
import { withRetry, writeFileAtomic } from './datastore/atomic'

/** Per-machine settings (never synced): stored in %APPDATA%/Financial Intel/config.json. */
const DEFAULTS: MachineConfig = {
  dataDir: null,
  recentDirs: [],
  backupDirOverride: null,
  window: null,
  updates: { prefs: { ...DEFAULT_UPDATE_PREFS }, pending: null, lastRunVersion: null, token: null, tokenEncrypted: false },
  // Closing hides to the tray (decision D64: notifications work in the background); start with Windows off until the
  // start wizard (E3) asks.
  tray: { closeToTray: true, launchAtLogin: false, notified: false },
  prefs: DEFAULT_MACHINE_PREFS,
  ictj: { dir: null, exe: null },
  importDir: null
}

/** What the renderer may see: everything but the GitHub token (encrypted, or plain text without safeStorage). */
export function publicConfig(c: MachineConfig): MachineConfig {
  return { ...c, updates: { ...c.updates, token: null } }
}

function loadTray(raw: unknown): MachineConfig['tray'] {
  const t = (raw && typeof raw === 'object' ? raw : {}) as Partial<MachineConfig['tray']>
  return {
    closeToTray: typeof t.closeToTray === 'boolean' ? t.closeToTray : DEFAULTS.tray.closeToTray,
    launchAtLogin: typeof t.launchAtLogin === 'boolean' ? t.launchAtLogin : false,
    notified: typeof t.notified === 'boolean' ? t.notified : false,
    autostartAsked: t.autostartAsked === true
  }
}

/** The folders of backups used before (AP-28, T434): a few, newest first, each with its data folder. */
export const BACKUP_DIRS_KEPT = 8
export type BackupDirBefore = { dataDir: string; dir: string }
function loadBackupDirsBefore(raw: unknown): BackupDirBefore[] {
  if (!Array.isArray(raw)) return []
  const ok = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length < 1000
  return raw.filter((x) => x && typeof x === 'object' && ok((x as { dataDir?: unknown }).dataDir) && ok((x as { dir?: unknown }).dir)).slice(0, BACKUP_DIRS_KEPT) as BackupDirBefore[]
}

/**
 * The folders of backups used before after the data folder `dataDir` moved its backups from `before` to `after` (AP-28,
 * DA.14): `before` first (its backups stay on the list), `after` never among them (it is the current one again).
 */
export function backupDirsAfter(list: readonly BackupDirBefore[], dataDir: string, before: string, after: string, same: (a: string, b: string) => boolean): BackupDirBefore[] {
  const kept = list.filter((e) => !(same(e.dataDir, dataDir) && (same(e.dir, before) || same(e.dir, after))))
  return (same(before, after) ? kept : [{ dataDir, dir: before }, ...kept]).slice(0, BACKUP_DIRS_KEPT)
}

/** The folders of backups `dataDir` used before, except the current one (AP-28). */
export function earlierBackupDirsOf(list: readonly BackupDirBefore[], dataDir: string, current: string, same: (a: string, b: string) => boolean): string[] {
  const out: string[] = []
  for (const e of list) if (same(e.dataDir, dataDir) && !same(e.dir, current) && !out.some((d) => same(d, e.dir))) out.push(e.dir)
  return out
}

function loadIctj(raw: unknown): MachineConfig['ictj'] {
  const t = (raw && typeof raw === 'object' ? raw : {}) as Partial<MachineConfig['ictj']>
  const path = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length < 1000 ? v : null)
  return { dir: path(t.dir), exe: path(t.exe) }
}

function loadUpdates(raw: unknown): MachineConfig['updates'] {
  const u = (raw && typeof raw === 'object' ? raw : {}) as Partial<MachineConfig['updates']>
  const prefs = (u.prefs && typeof u.prefs === 'object' ? u.prefs : {}) as Partial<MachineConfig['updates']['prefs']>
  const p = u.pending as Partial<PendingUpdate> | null | undefined
  const pendingOk = !!p && typeof p.version === 'string' && typeof p.file === 'string' && typeof p.sha256 === 'string' && (p.mode === 'portable' || p.mode === 'installer')
  return {
    prefs: {
      autoCheck: typeof prefs.autoCheck === 'boolean' ? prefs.autoCheck : DEFAULT_UPDATE_PREFS.autoCheck,
      autoDownload: typeof prefs.autoDownload === 'boolean' ? prefs.autoDownload : DEFAULT_UPDATE_PREFS.autoDownload
    },
    pending: pendingOk ? ({ notes: '', ...p } as PendingUpdate) : null,
    lastRunVersion: typeof u.lastRunVersion === 'string' ? u.lastRunVersion : null,
    token: typeof u.token === 'string' && u.token ? u.token : null,
    tokenEncrypted: u.tokenEncrypted === true
  }
}

export class ConfigStore {
  private config: MachineConfig = { ...DEFAULTS }
  /** The quick entry's shortcut config.json had, replaced by the default: it took a Polish letter (B29); null = none. */
  replacedShortcut: string | null = null
  /**
   * config.json there but not readable now (B114: held by an antivirus or a backup tool at the start with Windows): the
   * defaults are used in memory, nothing is written over the file and the autostart is left alone – until it is read.
   */
  loadFailed: string | null = null
  /** A broken config.json moved aside at the load (its new name); the defaults are used. */
  setAside: string | null = null
  /**
   * The changes made while config.json could not be read (B114), field by field: put onto the file's settings once it is
   * read – a choice made meanwhile (an update downloaded, the tray, a folder) is kept, never the defaults beside it.
   */
  private held: Array<[string[], unknown]> = []
  /** Writes are queued and always write the latest state, so an older snapshot never lands last. */
  private writing: Promise<void> = Promise.resolve()
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * `writeDelayMs` – a slow disk in test runs (`FI_CONFIG_WRITE_DELAY_MS`): each write waits this long first;
   * `writeRetryMs` – a failed write is tried again this often (US.33).
   */
  constructor(
    private readonly userDataDir: string,
    private readonly writeDelayMs = 0,
    private readonly writeRetryMs = 5000
  ) {}

  get file(): string {
    return join(this.userDataDir, 'config.json')
  }

  async load(): Promise<MachineConfig> {
    let text: string
    try {
      text = await withRetry(() => fs.readFile(this.file, 'utf8'), 10)
    } catch (e) {
      // No file: the first start on this computer. Any other error: the file is there – never replaced by defaults.
      this.loadFailed = (e as NodeJS.ErrnoException).code === 'ENOENT' ? null : e instanceof Error ? e.message : String(e)
      this.config = { ...DEFAULTS }
      return this.config
    }
    this.loadFailed = null
    let raw: Partial<MachineConfig>
    try {
      raw = JSON.parse(text) as Partial<MachineConfig>
      if (!raw || typeof raw !== 'object') throw new Error('not an object')
    } catch {
      // Broken (a power cut while it was written): kept aside for a look, the defaults from here on.
      const aside = `config.uszkodzony-${new Date().toISOString().replace(/[-:.]/g, '')}.json`
      await fs.rename(this.file, join(this.userDataDir, aside)).catch(() => undefined)
      this.setAside = aside
      this.config = { ...DEFAULTS }
      return this.config
    }
    const shortcut = (raw.prefs as { quickShortcut?: unknown } | undefined)?.quickShortcut
    this.replacedShortcut = typeof shortcut === 'string' && altGrConflict(shortcut) ? shortcut : null
    this.config = {
      ...DEFAULTS,
      ...raw,
      recentDirs: Array.isArray(raw.recentDirs) ? raw.recentDirs.filter((d) => typeof d === 'string').slice(0, 8) : [],
      updates: loadUpdates(raw.updates),
      tray: loadTray(raw.tray),
      prefs: machinePrefsFrom(raw.prefs),
      ictj: loadIctj(raw.ictj),
      importDir: typeof raw.importDir === 'string' && raw.importDir.length > 0 && raw.importDir.length < 1000 ? raw.importDir : null,
      backupDirsBefore: loadBackupDirsBefore(raw.backupDirsBefore)
    }
    if (this.held.length) {
      const held = this.held
      this.held = []
      let next = this.config
      for (const [path, value] of held) next = withValueAt(next, path, value) as MachineConfig
      await this.update(next)
    }
    return this.config
  }

  get(): MachineConfig {
    return this.config
  }

  async update(patch: Partial<MachineConfig>): Promise<MachineConfig> {
    const before = this.config
    this.config = { ...this.config, ...patch }
    // Not read yet (B114): the change lives in memory – the file on the disk keeps this computer's settings – and waits,
    // field by field, for the file to be read.
    if (this.loadFailed) {
      this.held.push(...leafChanges(before, this.config))
      return this.config
    }
    try {
      await this.queueWrite()
    } catch (e) {
      // config.json held for a while (an antivirus, a backup tool – US.33): the settings work, and are written later.
      this.retryLater()
      throw e
    }
    return this.config
  }

  /** The latest settings written, after the writes queued before. */
  private queueWrite(): Promise<void> {
    const write = this.writing.then(async () => {
      if (this.writeDelayMs) await new Promise((r) => setTimeout(r, this.writeDelayMs))
      await fs.mkdir(this.userDataDir, { recursive: true })
      // This computer's settings (userData): no data folder's file.
      await writeFileAtomic(this.file, `${JSON.stringify(this.config, null, 2)}\n`, null)
      if (this.retryTimer) clearTimeout(this.retryTimer)
      this.retryTimer = null
    })
    this.writing = write.catch(() => undefined)
    return write
  }

  /**
   * A write that failed is tried again (AP-28, US.33): before, a change made while config.json was held was lost at the
   * next start unless another change wrote the file. Every `writeRetryMs` until a write goes (always the latest state).
   */
  private retryLater(): void {
    if (this.retryTimer) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.queueWrite().catch(() => this.retryLater())
    }, this.writeRetryMs)
    this.retryTimer.unref?.()
  }

  /** Change only the update section (prefs, pending update, last run version). */
  updateUpdates(patch: Partial<MachineConfig['updates']>): Promise<MachineConfig> {
    return this.update({ updates: { ...this.config.updates, ...patch } })
  }

  async rememberDir(dir: string): Promise<void> {
    const recentDirs = [dir, ...this.config.recentDirs.filter((d) => d !== dir)].slice(0, 8)
    await this.update({ dataDir: dir, recentDirs })
  }
}

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** The fields `after` changed against `before`, each with its new value (a list or a value as a whole). */
function leafChanges(before: unknown, after: unknown, path: string[] = [], out: Array<[string[], unknown]> = []): Array<[string[], unknown]> {
  if (isPlain(before) && isPlain(after)) {
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) leafChanges(before[k], after[k], [...path, k], out)
  } else if (JSON.stringify(before) !== JSON.stringify(after)) out.push([path, after])
  return out
}

/** `obj` with `value` at `path` (objects made on the way, the rest kept). */
function withValueAt(obj: unknown, path: readonly string[], value: unknown): unknown {
  if (!path.length) return value
  const base = isPlain(obj) ? obj : {}
  const [k, ...rest] = path
  return { ...base, [k!]: withValueAt(base[k!], rest, value) }
}

