/**
 * A data folder written before the app starts (a budget in a known state): fi.json and records through the app's own
 * schemas, paths and serializer.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createDefaultSettings } from '../../src/shared/defaults'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { SCHEMA_VERSION } from '../../src/shared/schema/common'
import type { Settings } from '../../src/shared/schema/settings'

const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
/** A valid ULID for seeded records (fixed prefix, a counter). */
export const seedId = (): string => `01KSEED00000000000000${String(++seq).padStart(5, '0')}`

export const zl = (v: number): number => Math.round(v * 100)

export function seedFolder(dir: string, data: { settings?: (s: Settings) => Settings; records?: Partial<Record<Collection, Array<Record<string, unknown>>>> }): void {
  mkdirSync(dir, { recursive: true })
  const fi = createDefaultSettings(AT)
  const settings = data.settings ? data.settings(fi.settings) : fi.settings
  writeFileSync(join(dir, 'fi.json'), serializeRecord('fi', { ...fi, settings }))
  for (const [collection, list] of Object.entries(data.records ?? {}) as Array<[Collection, Array<Record<string, unknown>>]>) {
    for (const raw of list) {
      const record = SCHEMAS[collection].parse({ schemaVersion: SCHEMA_VERSION, id: seedId(), createdAt: AT, updatedAt: AT, ...raw }) as unknown as Record<string, unknown>
      const file = join(dir, recordRelPath(collection, record))
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, serializeRecord(collection, record as never))
    }
  }
}
