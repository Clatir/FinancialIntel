// adapted from ICTTJ tests/fs/helpers.ts @ 84a8339
import { mkdtempSync, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import yauzl from 'yauzl'
import { DataStore } from '../../src/main/datastore/store'
import { createDefaultSettings } from '@shared/defaults'
import { newId } from '@shared/ids'
import {
  gameMonthSchema,
  goalSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  transactionSchema,
  type GameMonth,
  type Goal,
  type MonthPlan,
  type Transaction
} from '@shared/schema'

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

const base = () => ({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: CREATED, updatedAt: CREATED })

/**
 * A valid operation ('dated' layout: `transactions/RRRR/RRRR-MM-DD_<id>.json`), the schema's defaults filled in. An
 * invalid override (a test of the validation) is kept as it is.
 */
export function sampleTransaction(over: Partial<Transaction> = {}): Transaction {
  const raw = { ...base(), date: '2026-03-16', accountId: MBANK_ACCOUNT_ID, amount: -4599, note: '', ...over }
  return transactionSchema.safeParse(raw).data ?? (raw as Transaction)
}

/** A valid month plan ('month' layout: `months/RRRR-MM.json`). */
export function sampleMonth(month = '2026-03', over: Partial<MonthPlan> = {}): MonthPlan {
  const raw = { ...base(), month, salary: 0, note: '', ...over }
  return monthPlanSchema.safeParse(raw).data ?? (raw as MonthPlan)
}

/** A valid goal ('id' layout: `goals/<id>.json`). */
export function sampleGoal(over: Partial<Goal> = {}): Goal {
  return goalSchema.parse({ ...base(), name: 'Wakacje', target: 500000, ...over })
}

/** A valid month of the command ('month' layout: `game/RRRR-MM.json`); `days` = date → status. */
export function sampleGame(month = '2026-03', days: Record<string, 'ok' | 'broken'> = {}, over: Partial<GameMonth> = {}): GameMonth {
  const rated = Object.fromEntries(Object.entries(days).map(([d, status]) => [d, { status, frozenAt: CREATED, violations: [] }]))
  return gameMonthSchema.parse({ ...base(), month, days: rated, ...over })
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
