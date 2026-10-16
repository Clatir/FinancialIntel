// adapted from ICTTJ src/shared/records.ts @ 84a8339
import { z } from 'zod'
import { migrateRaw, SchemaTooNewError } from './migrations'
import type { Collection, FileKind } from './paths'
import { settingsFileSchema, type SettingsFile } from './schema/settings'
import {
  balanceSchema,
  containerSchema,
  dockingSchema,
  gameMonthSchema,
  goalSchema,
  loanSchema,
  monthPlanSchema,
  transactionSchema,
  type Balance,
  type Container,
  type Docking,
  type GameMonth,
  type Goal,
  type Loan,
  type MonthPlan,
  type Transaction
} from './schema/records'

export interface RecordTypes {
  fi: SettingsFile
  transactions: Transaction
  containers: Container
  goals: Goal
  months: MonthPlan
  dockings: Docking
  loans: Loan
  balances: Balance
  game: GameMonth
}

export type AnyRecord = RecordTypes[Collection]

export const SCHEMAS: { [K in FileKind]: z.ZodType<RecordTypes[K]> } = {
  fi: settingsFileSchema as z.ZodType<SettingsFile>,
  transactions: transactionSchema as z.ZodType<Transaction>,
  containers: containerSchema as z.ZodType<Container>,
  goals: goalSchema as z.ZodType<Goal>,
  months: monthPlanSchema as z.ZodType<MonthPlan>,
  dockings: dockingSchema as z.ZodType<Docking>,
  loans: loanSchema as z.ZodType<Loan>,
  balances: balanceSchema as z.ZodType<Balance>,
  game: gameMonthSchema as z.ZodType<GameMonth>
}

export type ParseOutcome<K extends FileKind> =
  | { ok: true; value: RecordTypes[K]; migrated: boolean; fromVersion: number }
  | { ok: false; error: string; tooNewVersion?: number }

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((i) => `${i.path.length ? i.path.join('.') : '(plik)'}: ${i.message}`)
    .join('; ')
}

/**
 * Parse JSON text of a record file: JSON → migrations → schema validation. Never throws. `idHint` = the id the file's
 * name carries (`idFromPath`), used when the file has none.
 */
export function parseRecordText<K extends FileKind>(kind: K, text: string, idHint?: string | null): ParseOutcome<K> {
  let raw: unknown
  try {
    raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
  } catch (e) {
    return { ok: false, error: `Uszkodzony JSON: ${(e as Error).message}` }
  }
  return parseRecordObject(kind, raw, idHint)
}

export function parseRecordObject<K extends FileKind>(kind: K, raw: unknown, idHint?: string | null): ParseOutcome<K> {
  let migrated
  try {
    const withId =
      idHint && raw && typeof raw === 'object' && !Array.isArray(raw) && typeof (raw as { id?: unknown }).id !== 'string' ? { ...(raw as object), id: idHint } : raw
    migrated = migrateRaw(kind, withId)
  } catch (e) {
    if (e instanceof SchemaTooNewError) return { ok: false, error: e.message, tooNewVersion: e.fileVersion }
    return { ok: false, error: (e as Error).message }
  }
  const parsed = SCHEMAS[kind].safeParse(migrated.data)
  if (!parsed.success) return { ok: false, error: `Niepoprawna struktura: ${formatZodError(parsed.error)}` }
  return { ok: true, value: parsed.data, migrated: migrated.migrated, fromVersion: migrated.fromVersion }
}

/** Serialize a record as indented JSON with a trailing newline. */
export function serializeRecord(_kind: FileKind, record: AnyRecord | SettingsFile): string {
  return `${JSON.stringify(record, null, 2)}\n`
}
