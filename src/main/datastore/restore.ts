// adapted from ICTTJ src/main/datastore/transfer.ts @ 84a8339
/**
 * A backup's ZIP taken back (F3, D86): read in memory for the preview and the chosen records, or unpacked whole into a
 * new folder – safely (no absolute paths, no "..", no links), only the data's files (`isDataFile`).
 */
import { randomBytes } from 'node:crypto'
import { createWriteStream, promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { DateTime } from 'luxon'
import yauzl from 'yauzl'
import { COLLECTIONS, SETTINGS_FILE, classifyCanonical, sanitizeRelPath, type Collection } from '@shared/paths'
import { parseRecordText, type AnyRecord } from '@shared/records'
import type { SettingsFile } from '@shared/schema'
import { pathExists, withRetry } from './atomic'
import { isDataFile } from './backup'

/** Each accepted file of a ZIP, one after another (`take` reads its stream); the number taken. */
function eachEntry(zipPath: string, accept: (rel: string) => boolean, take: (rel: string, stream: Readable) => Promise<void>): Promise<number> {
  return new Promise<number>((resolve, rejectRaw) => {
    let zipFile: yauzl.ZipFile | null = null
    let done = false
    const reject = (e: unknown) => {
      if (done) return
      done = true
      try {
        // yauzl auto-closes on its own errors; closing twice throws.
        if (zipFile?.isOpen) zipFile.close()
      } catch {
        /* already closed */
      }
      const msg = String((e as Error)?.message)
      rejectRaw(/invalid relative path|absolute path/i.test(msg) ? new Error('ZIP zawiera niedozwolone ścieżki (np. ../) – odrzucony.') : new Error(`Uszkodzony plik ZIP: ${msg}`))
    }
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error('Nie można otworzyć ZIP'))
      zipFile = zip
      let count = 0
      zip.on('error', reject)
      zip.on('end', () => {
        if (done) return
        done = true
        resolve(count)
      })
      zip.on('entry', (entry: yauzl.Entry) => {
        const rel = sanitizeRelPath(entry.fileName)
        if (!rel || entry.fileName.endsWith('/') || !accept(rel)) {
          zip.readEntry()
          return
        }
        zip.openReadStream(entry, (e, stream) => {
          if (e || !stream) return reject(e ?? new Error('Błąd odczytu ZIP'))
          // Damaged data (a bad deflate stream, a size mismatch) is reported on the entry's stream.
          stream.on('error', reject)
          take(rel, stream)
            .then(() => {
              if (done) return
              count++
              zip.readEntry()
            })
            .catch(reject)
        })
      })
      zip.readEntry()
    })
  })
}

/** Unpack a backup's data files into `destDir`; the number of files written. */
export function extractZip(zipPath: string, destDir: string): Promise<number> {
  return eachEntry(zipPath, isDataFile, async (rel, stream) => {
    const target = join(destDir, ...rel.split('/'))
    await fs.mkdir(dirname(target), { recursive: true })
    await pipeline(stream, createWriteStream(target))
  })
}

/** A backup's data, each file validated (and migrated) as the folder's files are; copies of conflicts left out. */
export interface BackupData {
  fi: SettingsFile | null
  records: Record<Collection, AnyRecord[]>
  invalid: Array<{ relPath: string; error: string }>
  /** A file of a newer version of the app. */
  tooNew: boolean
}

export async function readBackupZip(zipPath: string): Promise<BackupData> {
  const out: BackupData = { fi: null, records: Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Record<Collection, AnyRecord[]>, invalid: [], tooNew: false }
  await eachEntry(zipPath, isDataFile, async (rel, stream) => {
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const kind = classifyCanonical(rel)
    if (!kind) return
    const parsed = parseRecordText(kind, Buffer.concat(chunks).toString('utf8'))
    if (!parsed.ok) {
      if (parsed.tooNewVersion != null) out.tooNew = true
      out.invalid.push({ relPath: rel, error: parsed.error })
      return
    }
    if (kind === 'fi') out.fi = parsed.value as SettingsFile
    else out.records[kind].push(parsed.value as AnyRecord)
  })
  return out
}

/**
 * The whole backup unpacked into a new folder beside the data folder (F3): „<folder> – kopia z RRRR-MM-DD GG.MM”, a
 * number added when the name is taken; unpacked under a temporary name first, so no half folder ever shows. The
 * current folder is never written.
 */
export async function unpackBackup(zipPath: string, dataDir: string, mtimeMs: number): Promise<string> {
  const parent = dirname(dataDir)
  const stamp = DateTime.fromMillis(mtimeMs, { zone: 'Europe/Warsaw' }).toFormat('yyyy-LL-dd HH.mm')
  const base = join(parent, `${basename(dataDir) || 'FinancialIntel'} – kopia z ${stamp}`)
  let target = base
  for (let n = 2; await pathExists(target); n++) target = `${base} (${n})`
  const tmp = join(parent, `.${basename(target)}.tmp-${randomBytes(3).toString('hex')}`)
  try {
    await extractZip(zipPath, tmp)
    if (!(await pathExists(join(tmp, SETTINGS_FILE)))) throw new Error('W kopii nie ma ustawień (fi.json) – to nie jest kopia folderu Financial Intel.')
    await withRetry(() => fs.rename(tmp, target))
    return target
  } catch (e) {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
    throw e
  }
}
