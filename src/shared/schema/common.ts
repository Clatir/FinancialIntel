// adapted from ICTTJ src/shared/schema/common.ts @ 84a8339
import { z } from 'zod'

/** Current on-disk format version. Bump together with a migration in src/shared/migrations. */
export const SCHEMA_VERSION = 1

export const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Nieprawidłowy identyfikator (ULID)')

/** ISO 8601 timestamp. Accepts offsets on read; the app always writes UTC ("Z"). */
export const isoDateTime = z.iso.datetime({ offset: true })

/** Calendar date YYYY-MM-DD (a Warsaw date for operations). */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Oczekiwano daty RRRR-MM-DD')

/** Calendar month YYYY-MM. */
export const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Oczekiwano miesiąca RRRR-MM')

/** Wall clock time HH:MM (24h). */
export const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Oczekiwano godziny GG:MM')

/** An amount in grosze (PLN × 100): always an integer (decision T3). */
export const grosze = z.number().int('Kwota w groszach musi być liczbą całkowitą')

export const text = z.string().default('')

export const recordBase = {
  schemaVersion: z.number().int(),
  id: ulidSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  /** Computer that wrote this version (null = edited outside the app). */
  updatedBy: z.string().max(200).nullable().optional()
}
