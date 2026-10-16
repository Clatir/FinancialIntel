// adapted from ICTTJ src/main/datastore/backup.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { DateTime } from 'luxon'
import type { BackupInfo } from '@shared/api'
import { COLLECTIONS, SETTINGS_FILE, isIgnoredPath } from '@shared/paths'
import { zipFolder } from './zip'

/** Daily backups kept (decision D31). */
export const DAILY_KEEP = 30
export const MANUAL_KEEP = 5

/**
 * The data: fi.json and the JSON records of the collections – never other files that happen to be in the folder (a
 * backups folder or exported ZIPs chosen inside it would otherwise go into every backup).
 */
export function isDataFile(rel: string): boolean {
  if (isIgnoredPath(rel)) return false
  if (rel === SETTINGS_FILE) return true
  return rel.endsWith('.json') && COLLECTIONS.some((c) => rel.startsWith(`${c}/`))
}

async function list(dir: string): Promise<Array<{ name: string; path: string; mtimeMs: number; bytes: number }>> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const out = []
  for (const name of names.filter((n) => n.endsWith('.zip') && !n.startsWith('.'))) {
    try {
      const st = await fs.stat(join(dir, name))
      out.push({ name, path: join(dir, name), mtimeMs: st.mtimeMs, bytes: st.size })
    } catch {
      /* removed meanwhile */
    }
  }
  return out.sort((a, b) => (a.name < b.name ? 1 : -1))
}

async function rotate(dir: string, keep: number): Promise<void> {
  for (const old of (await list(dir)).slice(keep)) await fs.rm(old.path, { force: true })
}

/**
 * Startup backup: a daily ZIP of the data (`isDataFile`), the last 30 kept.
 * Returns the new file, or null when today's backup exists already.
 */
export async function runBackups(root: string, backupsDir: string, now = new Date()): Promise<string | null> {
  const today = DateTime.fromJSDate(now).toISODate() as string
  const dailyDir = join(backupsDir, 'daily')
  const name = `${today}.zip`
  if ((await list(dailyDir)).some((f) => f.name === name)) return null
  const file = join(dailyDir, name)
  await zipFolder(root, file, isDataFile)
  await rotate(dailyDir, DAILY_KEEP)
  return file
}

/** Full backup on demand (backups/manual, last 5 kept). */
export async function manualBackup(root: string, backupsDir: string, now = new Date()): Promise<string> {
  const dir = join(backupsDir, 'manual')
  const file = join(dir, `${DateTime.fromJSDate(now).toFormat('yyyy-LL-dd_HHmmss')}.zip`)
  await zipFolder(root, file, isDataFile)
  await rotate(dir, MANUAL_KEEP)
  return file
}

export async function listBackups(backupsDir: string): Promise<BackupInfo[]> {
  const out: BackupInfo[] = []
  for (const kind of ['daily', 'manual', 'pre-migration'] as const) {
    for (const f of await list(join(backupsDir, kind))) out.push({ ...f, kind })
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs)
}
