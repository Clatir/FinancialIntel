// adapted from ICTTJ tests/fs/helpers.ts @ 84a8339
import { mkdtempSync, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import yauzl from 'yauzl'
import { DataStore } from '../../src/main/datastore/store'
import { createDefaultSettings } from '@shared/defaults'
import { newId } from '@shared/ids'
import { SCHEMA_VERSION, type Goal, type MonthPlan, type Transaction } from '@shared/schema'

export const CREATED = '2026-01-01T00:00:00.000Z'

export function tempDir(prefix = 'fi-'): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

export async function freshStore(root = join(tempDir(), 'dane'), machineName = 'TEST-PC'): Promise<DataStore> {
  await DataStore.initialize(root, createDefaultSettings(CREATED))
  const store = new DataStore(root, { machineName })
  await store.open()
  return store
}

/** A valid operation ('dated' layout: `transactions/RRRR/RRRR-MM-DD_<id>.json`). E0 schemas keep unknown fields. */
export function sampleTransaction(over: Partial<Transaction> = {}): Transaction {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    createdAt: CREATED,
    updatedAt: CREATED,
    date: '2026-03-16',
    amount: -4599,
    note: '',
    ...over
  }
}

/** A valid month plan ('month' layout: `months/RRRR-MM.json`). */
export function sampleMonth(month = '2026-03', over: Partial<MonthPlan> = {}): MonthPlan {
  return { schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: CREATED, updatedAt: CREATED, month, note: '', ...over }
}

/** A valid goal ('id' layout: `goals/<id>.json`). */
export function sampleGoal(over: Partial<Goal> = {}): Goal {
  return { schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: CREATED, updatedAt: CREATED, name: 'Wakacje', target: 500000, ...over }
}

export async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await fs.readFile(path, 'utf8')) as Record<string, unknown>
}

export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

/** Entries of a ZIP file: relative path → content (text). */
export async function readZip(file: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) =>
    yauzl.open(file, { lazyEntries: true }, (err, z) => (err || !z ? reject(err ?? new Error('ZIP')) : resolve(z)))
  )
  await new Promise<void>((resolve, reject) => {
    zip.on('error', reject)
    zip.on('end', () => resolve())
    zip.on('entry', (entry: yauzl.Entry) => {
      if (entry.fileName.endsWith('/')) {
        zip.readEntry()
        return
      }
      zip.openReadStream(entry, (err, stream) => {
        if (err || !stream) {
          reject(err ?? new Error('ZIP'))
          return
        }
        const chunks: Buffer[] = []
        stream.on('data', (c: Buffer) => chunks.push(c))
        stream.on('error', reject)
        stream.on('end', () => {
          out.set(entry.fileName, Buffer.concat(chunks).toString('utf8'))
          zip.readEntry()
        })
      })
    })
    zip.readEntry()
  })
  zip.close()
  return out
}
