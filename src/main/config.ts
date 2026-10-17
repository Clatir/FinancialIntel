// adapted from ICTTJ src/main/config.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { MachineConfig } from '@shared/api'
import { DEFAULT_UPDATE_PREFS, type PendingUpdate } from '@shared/update'
import { DEFAULT_MACHINE_PREFS, machinePrefsFrom } from '@shared/machine'
import { writeFileAtomic } from './datastore/atomic'

/** Per-machine settings (never synced): stored in %APPDATA%/Financial Intel/config.json. */
const DEFAULTS: MachineConfig = {
  dataDir: null,
  recentDirs: [],
  backupDirOverride: null,
  window: null,
  updates: { prefs: { ...DEFAULT_UPDATE_PREFS }, pending: null, lastRunVersion: null, token: null, tokenEncrypted: false },
  // Closing hides to the tray (decision E0-4: notifications work in the background); start with Windows off until the
  // start wizard (E3) asks.
  tray: { closeToTray: true, launchAtLogin: false, notified: false },
  prefs: DEFAULT_MACHINE_PREFS
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
    notified: typeof t.notified === 'boolean' ? t.notified : false
  }
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
  /** Writes are queued and always write the latest state, so an older snapshot never lands last. */
  private writing: Promise<void> = Promise.resolve()
  constructor(private readonly userDataDir: string) {}

  get file(): string {
    return join(this.userDataDir, 'config.json')
  }

  async load(): Promise<MachineConfig> {
    try {
      const raw = JSON.parse(await fs.readFile(this.file, 'utf8')) as Partial<MachineConfig>
      this.config = {
        ...DEFAULTS,
        ...raw,
        recentDirs: Array.isArray(raw.recentDirs) ? raw.recentDirs.filter((d) => typeof d === 'string').slice(0, 8) : [],
        updates: loadUpdates(raw.updates),
        tray: loadTray(raw.tray),
        prefs: machinePrefsFrom(raw.prefs)
      }
    } catch {
      this.config = { ...DEFAULTS }
    }
    return this.config
  }

  get(): MachineConfig {
    return this.config
  }

  async update(patch: Partial<MachineConfig>): Promise<MachineConfig> {
    this.config = { ...this.config, ...patch }
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
