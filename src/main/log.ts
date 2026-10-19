// adapted from ICTTJ src/main/log.ts @ 84a8339
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

let file: string | null = null
/** Lines written since the size was checked last: the log is rotated while the app runs too (B113 – weeks in the tray). */
let sinceCheck = 0
const MAX_BYTES = 1024 * 1024
const CHECK_EVERY = 200

function rotateIfBig(): void {
  if (!file) return
  try {
    if (statSync(file).size > MAX_BYTES) renameSync(file, join(dirname(file), 'main.old.log'))
  } catch {
    /* no log yet */
  }
}

/** Minimal append-only log in the per-machine user data folder (logs/main.log, rotated at 1 MB). */
export function initLog(userDataDir: string): void {
  const dir = join(userDataDir, 'logs')
  mkdirSync(dir, { recursive: true })
  file = join(dir, 'main.log')
  rotateIfBig()
}

function describe(detail: unknown): string {
  if (detail instanceof Error) return detail.stack ?? detail.message
  try {
    return JSON.stringify(detail)
  } catch {
    return String(detail)
  }
}

export function log(level: 'info' | 'warn' | 'error', message: string, detail?: unknown): void {
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}${detail ? ` ${describe(detail)}` : ''}\n`
  if (level !== 'info') process.stderr.write(line)
  if (!file) return
  if (++sinceCheck >= CHECK_EVERY) {
    sinceCheck = 0
    rotateIfBig()
  }
  try {
    appendFileSync(file, line)
  } catch {
    /* logging must never break the app */
  }
}
