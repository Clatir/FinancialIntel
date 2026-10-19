// adapted from ICTTJ src/main/datastore/backup.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { DateTime } from 'luxon'
import type { BackupInfo } from '@shared/api'
import { COLLECTIONS, SETTINGS_FILE, isIgnoredPath } from '@shared/paths'
import { tempPathFor, withRetry } from './atomic'
import type { ZipResult } from './zip'

/** Daily backups kept, and one a week for 8 weeks back (D31, D84 C4 – 30 daily before 1.4.3). */
export const DAILY_KEEP = 14
export const WEEKLY_KEEP = 8
export const MANUAL_KEEP = 5
/** Backups before an import from the bank (spec, „Kopie zapasowe”; T20). */
export const IMPORT_KEEP = 10

/** What writes the ZIP of the data: the open folder's store (records from memory – W7). */
export interface DataSource {
  zipData(outFile: string): Promise<ZipResult>
}

/**
 * The data: fi.json and the JSON records of the collections – never other files that happen to be in the folder (a
 * backups folder or exported ZIPs chosen inside it would otherwise go into every backup).
 */
export function isDataFile(rel: string): boolean {
  if (isIgnoredPath(rel)) return false
  if (rel === SETTINGS_FILE) return true
  return rel.endsWith('.json') && COLLECTIONS.some((c) => rel.startsWith(`${c}/`))
}

/**
 * The names of this app's backups, by kind (B121): a folder of backups shared with another program (ICT Trade
 * Journal's has the same subfolders) never has its files listed, taken back or removed by the rotation.
 */
const BACKUP_NAMES: Record<BackupInfo['kind'], RegExp> = {
  daily: /^\d{4}-\d{2}-\d{2}\.zip$/,
  weekly: /^\d{4}-W\d{2}\.zip$/,
  manual: /^\d{4}-\d{2}-\d{2}_\d{6}\.zip$/,
  'pre-import': /^\d{4}-\d{2}-\d{2}_\d{6}\.zip$/,
  'pre-migration': /^\d{8}T\d{6}Z_v\d+-v\d+\.zip$/
}

async function list(dir: string, kind: BackupInfo['kind']): Promise<Array<{ name: string; path: string; mtimeMs: number; bytes: number }>> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const out = []
  for (const name of names.filter((n) => BACKUP_NAMES[kind].test(n))) {
    try {
      const st = await fs.stat(join(dir, name))
      out.push({ name, path: join(dir, name), mtimeMs: st.mtimeMs, bytes: st.size })
    } catch {
      /* removed meanwhile */
    }
  }
  return out.sort((a, b) => (a.name < b.name ? 1 : -1))
}

async function rotate(dir: string, kind: BackupInfo['kind'], keep: number): Promise<void> {
  for (const old of (await list(dir, kind)).slice(keep)) await fs.rm(old.path, { force: true })
}

/** A copy of a backup under another name, atomically. */
async function copyBackup(from: string, to: string): Promise<void> {
  const tmp = tempPathFor(to)
  try {
    await fs.copyFile(from, tmp)
    await withRetry(() => fs.rename(tmp, to))
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => undefined)
    throw e
  }
}

const weekOf = (day: DateTime): string => `${day.toFormat("kkkk-'W'WW")}.zip`

/**
 * The daily backup (D31): a ZIP of the data (`isDataFile`) once a day – at the start and, while the app lives in the
 * tray, in the background (F2) –, the last 14 kept; and once an ISO week its copy in `weekly/`, the last 8 (D84 C4).
 * The first time the weekly copies come from the daily ones already there (the newest of each week), so the switch from
 * 30 daily ones loses no week. Returns the new daily file, or null when today's exists already.
 */
export async function runBackups(source: DataSource, backupsDir: string, now = new Date()): Promise<string | null> {
  const day = DateTime.fromJSDate(now)
  const dailyDir = join(backupsDir, 'daily')
  const weeklyDir = join(backupsDir, 'weekly')
  const name = `${day.toISODate()}.zip`
  const file = join(dailyDir, name)
  const dailies = await list(dailyDir, 'daily')
  let made: string | null = null
  if (!dailies.some((f) => f.name === name)) {
    await source.zipData(file)
    made = file
  }
  const weeklies = await list(weeklyDir, 'weekly')
  if (!weeklies.length) {
    // Before the first weekly copy: the daily ones kept so far stand for their weeks.
    await fs.mkdir(weeklyDir, { recursive: true })
    const seeded = new Set<string>()
    for (const f of dailies) {
      const d = DateTime.fromISO(f.name.replace(/\.zip$/, ''))
      if (!d.isValid || seeded.has(weekOf(d)) || weekOf(d) === weekOf(day)) continue
      seeded.add(weekOf(d))
      if (seeded.size > WEEKLY_KEEP) break
      await copyBackup(f.path, join(weeklyDir, weekOf(d)))
    }
  }
  if (!weeklies.some((f) => f.name === weekOf(day))) {
    await fs.mkdir(weeklyDir, { recursive: true })
    await copyBackup(file, join(weeklyDir, weekOf(day)))
  }
  await rotate(dailyDir, 'daily', DAILY_KEEP)
  await rotate(weeklyDir, 'weekly', WEEKLY_KEEP)
  return made
}

/** A ZIP of the data named by its time in `backups/<kind>`, the newest `keep` kept. */
async function datedBackup(source: DataSource, backupsDir: string, kind: 'manual' | 'pre-import', keep: number, now: Date): Promise<string> {
  const dir = join(backupsDir, kind)
  const file = join(dir, `${DateTime.fromJSDate(now).toFormat('yyyy-LL-dd_HHmmss')}.zip`)
  await source.zipData(file)
  await rotate(dir, kind, keep)
  return file
}

/** Full backup on demand (backups/manual, last 5 kept). */
export function manualBackup(source: DataSource, backupsDir: string, now = new Date()): Promise<string> {
  return datedBackup(source, backupsDir, 'manual', MANUAL_KEEP, now)
}

/** The data before an import (backups/pre-import, the last 10 kept): the import can always be undone by hand. */
export function importBackup(source: DataSource, backupsDir: string, now = new Date()): Promise<string> {
  return datedBackup(source, backupsDir, 'pre-import', IMPORT_KEEP, now)
}

export async function listBackups(backupsDir: string): Promise<BackupInfo[]> {
  const out: BackupInfo[] = []
  for (const kind of ['daily', 'weekly', 'manual', 'pre-import', 'pre-migration'] as const) {
    for (const f of await list(join(backupsDir, kind), kind)) out.push({ ...f, kind })
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs)
}
