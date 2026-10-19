// adapted from ICTTJ src/shared/migrations/index.ts @ 84a8339
/**
 * On-disk format migrations.
 *
 * Every record file carries `schemaVersion`; `fi.json` carries the folder-level version.
 * A file without `schemaVersion` is treated as version 0 (a hand-written file most likely looks like that).
 *
 * To change the format: bump SCHEMA_VERSION, add a step `N -> N+1` for every kind, add a fixture test.
 */
import { newId } from '../ids'
import { SCHEMA_VERSION } from '../schema/common'
import type { FileKind } from '../paths'

type Raw = Record<string, unknown>
type Step = (raw: Raw) => Raw

export class SchemaTooNewError extends Error {
  constructor(
    public readonly fileVersion: number,
    public readonly appVersion: number = SCHEMA_VERSION
  ) {
    super(`Plik ma format v${fileVersion}, ta wersja aplikacji obsługuje v${appVersion}. Zaktualizuj aplikację.`)
    this.name = 'SchemaTooNewError'
  }
}

export function readSchemaVersion(raw: unknown): number {
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw) {
    const v = (raw as Raw).schemaVersion
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v
  }
  return 0
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)

function withIdAndTimestamps(raw: Raw): Raw {
  const now = new Date().toISOString()
  return {
    ...raw,
    id: str(raw.id) ?? newId(),
    createdAt: str(raw.createdAt) ?? now,
    updatedAt: str(raw.updatedAt) ?? now
  }
}

const STEPS: Record<FileKind, Record<number, Step>> = {
  fi: { 0: withIdAndTimestamps },
  transactions: { 0: withIdAndTimestamps },
  containers: { 0: withIdAndTimestamps },
  goals: { 0: withIdAndTimestamps },
  months: { 0: withIdAndTimestamps },
  dockings: { 0: withIdAndTimestamps },
  loans: { 0: withIdAndTimestamps },
  balances: { 0: withIdAndTimestamps },
  game: { 0: withIdAndTimestamps },
  imports: { 0: withIdAndTimestamps },
  scheduled: { 0: withIdAndTimestamps }
}

export interface MigrationResult {
  data: Raw
  fromVersion: number
  migrated: boolean
}

/** Upgrade a parsed JSON object to the current version. Throws SchemaTooNewError for newer files. */
export function migrateRaw(kind: FileKind, input: unknown): MigrationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Plik nie zawiera obiektu JSON')
  const fromVersion = readSchemaVersion(input)
  if (fromVersion > SCHEMA_VERSION) throw new SchemaTooNewError(fromVersion)
  let data: Raw = { ...(input as Raw) }
  let v = fromVersion
  while (v < SCHEMA_VERSION) {
    const step = STEPS[kind][v]
    if (!step) throw new Error(`Brak migracji ${kind} v${v} → v${v + 1}`)
    data = step(data)
    v += 1
    data.schemaVersion = v
  }
  return { data, fromVersion, migrated: fromVersion !== SCHEMA_VERSION }
}
