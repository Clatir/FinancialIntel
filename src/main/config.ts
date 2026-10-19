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
  ictj: { dir: null, exe: null }
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
  constructor(private readonly userDataDir: string) {}

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
      ictj: loadIctj(raw.ictj)
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
    const write = this.writing.then(async () => {
      await fs.mkdir(this.userDataDir, { recursive: true })
      await writeFileAtomic(this.file, `${JSON.stringify(this.config, null, 2)}\n`)
    })
    this.writing = write.catch(() => undefined)
    await write
    return this.config
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

