/**
 * What FI reads from the ICT Trade Journal's data folder (D60, D72): the payouts (withdrawals with their pool, returns to
 * the trading capital) and the goals of the forecast scenarios – nothing else, and never writing there. The schemas
 * know only the fields FI uses, so a newer ICTTJ keeps being read (a warning, not an error – T14).
 */
import { z } from 'zod'
import { addMonths } from './calc/dates'
import { ICTJ_POOLS, type IctjPool } from './schema/records'

/** The ICTTJ format this FI knows (ICTTJ 1.20.0, `SCHEMA_VERSION` 1). */
export const ICTJ_KNOWN_SCHEMA = 1

/** A payout of ICTTJ as FI uses it: amounts in grosze; expenses are left out (FI is the place of expenses). */
export interface IctjEntry {
  id: string
  /** 'withdrawal' = money from the trading account to the bank, 'return' = from the bank back to the trading capital. */
  kind: 'withdrawal' | 'return'
  /** Warsaw date. */
  date: string
  amount: number
  pool: IctjPool
  note: string
  updatedAt: string | null
}

/** A goal of a forecast scenario: its amount in the scenario's currency (× 100), its month from the scenario's start. */
export interface IctjGoal {
  id: string
  name: string
  /** RRRR-MM; null = the goal has no month yet. */
  month: string | null
  /** null = the goal takes everything set aside in its month (no price). */
  amount: number | null
  enabled: boolean
}

export interface IctjForecast {
  id: string
  name: string
  currency: string
  goals: IctjGoal[]
  updatedAt: string | null
}

/** 'off' = no folder chosen on this computer; 'missing' = the folder is gone (OneDrive not started, a drive away). */
export type IctjStatus = 'off' | 'ok' | 'missing' | 'not-ictj' | 'error'

/** The ICTTJ folder as read by the main process (sent to the windows on every change). */
export interface IctjSnapshot {
  dir: string | null
  status: IctjStatus
  message: string | null
  entries: IctjEntry[]
  forecasts: IctjForecast[]
  /** Read with a reservation: a newer format, files that could not be read. */
  warnings: string[]
  /** Payout files not read (ids from their names – a file still syncing, a broken one): none of them is deleted (B21). */
  unread?: string[]
  /** Every folder of the payouts listed (else no entry can be told deleted – B21). Absent = yes. */
  complete?: boolean
  readAt: string | null
}

export const EMPTY_ICTJ: IctjSnapshot = { dir: null, status: 'off', message: null, entries: [], forecasts: [], warnings: [], readAt: null }

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/

/** Canonical files of ICTTJ (`src/shared/paths.ts` there): copies of sync tools do not match and stay ICTTJ's business. */
export const ICTJ_PAYOUT_FILE = /^(\d{4}-\d{2}-\d{2})_([0-9A-HJKMNP-TV-Z]{26})\.json$/
export const ICTJ_FORECAST_FILE = /^([0-9A-HJKMNP-TV-Z]{26})\.json$/

const version = z.number().int().nonnegative().catch(0).default(0)
const optText = z.string().catch('').default('')
const optStamp = z.string().max(40).nullable().catch(null).default(null)

const payoutSchema = z.looseObject({
  schemaVersion: version,
  id: z.string().regex(ULID),
  kind: z.string().max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive().max(1e12),
  pool: z.string().max(40),
  note: optText,
  updatedAt: optStamp
})

export interface ParsedPayout {
  /** null = not a payout FI uses (an expense) or unreadable. */
  entry: IctjEntry | null
  schemaVersion: number
  /** What FI could not take as it is (a newer kind or pool, a broken file). */
  problem: string | null
}

/** One file of `payouts/`: a withdrawal or a return in grosze; an expense is skipped quietly. */
export function parseIctjPayout(raw: unknown): ParsedPayout {
  const r = payoutSchema.safeParse(raw)
  if (!r.success) return { entry: null, schemaVersion: 0, problem: 'nieczytelny wpis' }
  const p = r.data
  if (p.kind === 'expense') return { entry: null, schemaVersion: p.schemaVersion, problem: null }
  if (p.kind !== 'withdrawal' && p.kind !== 'return') return { entry: null, schemaVersion: p.schemaVersion, problem: `nieznany rodzaj wpisu „${p.kind}”` }
  const known = (ICTJ_POOLS as readonly string[]).includes(p.pool)
  return {
    entry: { id: p.id, kind: p.kind, date: p.date, amount: Math.round(p.amount * 100), pool: known ? (p.pool as IctjPool) : 'current', note: p.note, updatedAt: p.updatedAt },
    schemaVersion: p.schemaVersion,
    // A pool of a newer ICTTJ: docks the usual way (shields first).
    problem: known ? null : `nieznana pula „${p.pool}” – dokuje zwykłą kolejnością`
  }
}

const goalSchema = z.looseObject({
  id: z.string().regex(ULID),
  name: optText,
  month: z.number().int().min(1).max(1200).nullable().catch(null).default(null),
  amount: z.number().positive().max(1e12).nullable().catch(null).default(null),
  enabled: z.boolean().catch(true).default(true)
})

const forecastSchema = z.looseObject({
  schemaVersion: version,
  id: z.string().regex(ULID),
  name: z.string().max(200).catch('Scenariusz').default('Scenariusz'),
  currency: z.string().regex(/^[A-Z]{3}$/).catch('PLN').default('PLN'),
  firstMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  goals: z.array(goalSchema.nullable().catch(null)).catch([]).default([]),
  updatedAt: optStamp
})

/** One scenario of `forecasts/`: its goals with their months (null when the scenario cannot be read). */
export function parseIctjForecast(raw: unknown): { forecast: IctjForecast | null; schemaVersion: number } {
  const r = forecastSchema.safeParse(raw)
  if (!r.success) return { forecast: null, schemaVersion: 0 }
  const f = r.data
  const goals = f.goals
    .filter((g): g is NonNullable<typeof g> => g != null)
    .map((g) => ({
      id: g.id,
      name: g.name.trim() || 'Cel',
      month: g.month == null ? null : addMonths(f.firstMonth, g.month - 1),
      amount: g.amount == null ? null : Math.round(g.amount * 100),
      enabled: g.enabled
    }))
  return { forecast: { id: f.id, name: f.name, currency: f.currency, goals, updatedAt: f.updatedAt }, schemaVersion: f.schemaVersion }
}

/** The scenario whose goals FI shows: the one chosen in the settings, else the one changed last in ICTTJ. */
export function chosenForecast(forecasts: readonly IctjForecast[], chosenId: string | null): IctjForecast | null {
  if (chosenId) return forecasts.find((f) => f.id === chosenId) ?? null
  return [...forecasts].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || a.id.localeCompare(b.id))[0] ?? null
}

/** Pools as ICTTJ names them. */
export const ICTJ_POOL_LABEL: Record<IctjPool, string> = { goals: 'Cele', current: 'Bieżące', surplus: 'Nadwyżki w masie', tax: 'Podatek' }
