// adapted from ICTTJ src/main/datastore/presence.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { PRESENCE_DIR } from '@shared/paths'
import { writeFileAtomic } from './atomic'

/** A machine counts as running if it refreshed its heartbeat within this window (in the tray every 5 min – N20). */
export const PRESENCE_WINDOW_MS = 11 * 60 * 1000
/** In use (D86): a move in one of the machine's windows within the last 10 minutes. */
export const IN_USE_MS = 10 * 60 * 1000

/** Another computer with the folder open: in use, or only running (in the tray). */
export interface MachinePresence {
  machine: string
  lastSeen: string
  /** Its last move in a window; undefined = a version before 1.5.3 (counted as in use, as it then was). */
  activeAt?: string | null
  inUse: boolean
}

export function safeMachineName(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'KOMPUTER'
}

export async function writePresence(root: string, machine: string, appVersion: string, activeAt: string | null = null): Promise<void> {
  const file = join(root, PRESENCE_DIR, `${safeMachineName(machine)}.json`)
  await writeFileAtomic(file, `${JSON.stringify({ machine, lastSeen: new Date().toISOString(), appVersion, activeAt }, null, 2)}\n`)
}

export async function clearPresence(root: string, machine: string): Promise<void> {
  await fs.rm(join(root, PRESENCE_DIR, `${safeMachineName(machine)}.json`), { force: true })
}

export async function readOtherMachines(root: string, machine: string, now = Date.now()): Promise<MachinePresence[]> {
  const dir = join(root, PRESENCE_DIR)
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const self = `${safeMachineName(machine)}.json`
  const out: MachinePresence[] = []
  for (const name of names) {
    if (!name.endsWith('.json') || name === self || name.includes('.tmp-')) continue
    try {
      const data = JSON.parse(await fs.readFile(join(dir, name), 'utf8')) as { machine?: string; lastSeen?: string; activeAt?: string | null }
      if (!data.lastSeen) continue
      const age = now - Date.parse(data.lastSeen)
      if (!(age >= 0 && age < PRESENCE_WINDOW_MS)) continue
      // A version before 1.5.3 writes no `activeAt` and its heartbeat every minute: in use while it beats (as before).
      const old = !('activeAt' in data)
      const inUse = old ? age < 3 * 60 * 1000 : !!data.activeAt && now - Date.parse(data.activeAt) < IN_USE_MS
      out.push({ machine: data.machine ?? name.replace(/\.json$/, ''), lastSeen: data.lastSeen, ...(old ? {} : { activeAt: data.activeAt ?? null }), inUse })
    } catch {
      /* partially synced file */
    }
  }
  return out
}
