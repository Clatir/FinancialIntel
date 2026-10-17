/**
 * Records of the collections (docs/specyfikacja.md, „Dane i synchronizacja”). Amounts are integer grosze (T3), dates
 * are Warsaw dates. Unknown fields are kept (`z.looseObject`), so an older version never drops what a newer one wrote.
 * The states of the layers are never stored: `shared/calc/fleet.ts` computes them from these records (T4).
 */
import { z } from 'zod'
import { clockTime, grosze, isoDate, isoDateTime, isoMonth, recordBase, text, ulidSchema } from './common'

// ------------------------------------------------------------------ operations

/**
 * What an operation is for the budget:
 * - 'expense' – a cost from the energy (a positive amount = a product return, a negative expense of its category);
 * - 'income' – a delivery: docks into the layers (shields → hull → goals); `repaid` = the part that repays the house
 *   receivable (a household member, D20);
 * - 'transfer' – an own transfer (between the budget's accounts, or to / from an own account outside the budget): no
 *   cost, no income;
 * - 'trading' – the XTB trading account (D54): money out = a top-up (the firewall, D23), money in = a withdrawal (a
 *   delivery; its ICTTJ pool decides where it docks, E5);
 * - 'tax' – PIT-38 paid from the money held for the tax (the ICTTJ pool „Podatek”), never a cost;
 * - 'loan' – a private loan (given, returned, taken – E6);
 * - 'correction' – the difference found when confirming a balance, to be explained.
 */
export const TX_KINDS = ['expense', 'income', 'transfer', 'trading', 'tax', 'loan', 'correction'] as const
export type TxKind = (typeof TX_KINDS)[number]

export const TX_KIND_LABEL: Record<TxKind, string> = {
  expense: 'Wydatek',
  income: 'Wpływ',
  transfer: 'Przelew własny',
  trading: 'XTB (konto tradingowe)',
  tax: 'Podatek PIT-38',
  loan: 'Pożyczka',
  correction: 'Korekta salda'
}

/** One line of a split receipt: several categories, or the own part and the house part („do zwrotu”). */
export const splitSchema = z.looseObject({
  id: ulidSchema,
  /** Signed like the operation's amount (money out < 0). */
  amount: grosze,
  categoryId: ulidSchema.nullable().default(null),
  /** Bought for the house: a receivable, not a cost (D21). */
  refundable: z.boolean().default(false),
  note: text
})
export type Split = z.infer<typeof splitSchema>

/** The bank's row behind an operation (import from mBank, E2). */
export const bankRowSchema = z.looseObject({
  format: z.enum(['mbank']).default('mbank'),
  /** Identity of the row across imports (`shared/import/mbank.ts` `rowKey`). */
  key: z.string().min(1).max(300),
  /** The bank's description, whitespace collapsed. */
  description: z.string().max(2000).default(''),
  /** The counterparty as the bank wrote it (an operation still showing it takes the new one when the row settles). */
  counterparty: z.string().max(300).default(''),
  /** Type of the operation („ZAKUP PRZY UŻYCIU KARTY W KRAJU”, „PRZELEW WEWNĘTRZNY PRZYCHODZĄCY”…). */
  operation: z.string().max(200).default(''),
  /** The bank's own category: a weak hint only (often wrong). */
  category: z.string().max(200).default(''),
  /** „transakcja nierozliczona”: the bank may still change the amount or drop the row. */
  pending: z.boolean().default(false),
  importedAt: isoDateTime
})
export type BankRow = z.infer<typeof bankRowSchema>

export const transactionSchema = z.looseObject({
  ...recordBase,
  /** Warsaw date of the operation (the file lives under it). */
  date: isoDate,
  /** Warsaw wall time; null = unknown (an import from mBank has no hours). */
  time: clockTime.nullable().default(null),
  accountId: ulidSchema,
  kind: z.enum(TX_KINDS).default('expense'),
  /** Grosze, signed: money out of the account < 0, money in > 0. */
  amount: grosze,
  categoryId: ulidSchema.nullable().default(null),
  /** Bought for the house („do zwrotu”): the money is lent from the shields, the house owes it back. */
  refundable: z.boolean().default(false),
  /** A split receipt (its lines replace `categoryId` / `refundable`); the lines sum to `amount`. */
  splits: z.array(splitSchema).default([]),
  /** Payee or payer as shown (shop, person). */
  counterparty: z.string().max(300).default(''),
  /** Title of a transfer. */
  title: z.string().max(1000).default(''),
  note: z.string().max(5000).default(''),
  /** The captain's log (D41): a planned purchase or an impulse. */
  impulse: z.enum(['plan', 'impulse']).nullable().default(null),
  /** The captain's log entry (an impulse, a purchase in the quiet hours). */
  logNote: z.string().max(2000).default(''),
  /** Income: the part repaying the house receivable (≤ amount); the rest docks as income. */
  repaid: grosze.min(0).default(0),
  /** Own transfer: the budget's other account (null = an account outside the budget). */
  counterAccountId: ulidSchema.nullable().default(null),
  /** Payment of a container (fixed cost or periodic fee – a periodic one is paid from its tank). */
  containerId: ulidSchema.nullable().default(null),
  /** Paid from a goal's money. */
  goalId: ulidSchema.nullable().default(null),
  loanId: ulidSchema.nullable().default(null),
  bank: bankRowSchema.nullable().default(null)
})
export type Transaction = z.infer<typeof transactionSchema>

// ------------------------------------------------------------------ cargo hold

export const CONTAINER_TYPES = ['fixed', 'subscription', 'installment'] as const
export type ContainerType = (typeof CONTAINER_TYPES)[number]

/** A container of the cargo hold: a fixed cost, a subscription, an installment; every N months = a periodic fee (an asteroid with its tank). */
export const containerSchema = z.looseObject({
  ...recordBase,
  name: z.string().trim().min(1).max(80),
  type: z.enum(CONTAINER_TYPES).default('fixed'),
  /** One payment. */
  amount: grosze.min(0),
  /** 1 = every month, 12 = every year; more than 1 = a periodic fee filled monthly from the energy. */
  cycleMonths: z.number().int().min(1).max(60).default(1),
  /** A month with a payment: the cycle counts from it. */
  dueMonth: isoMonth,
  dueDay: z.number().int().min(1).max(31).default(1),
  accountId: ulidSchema.nullable().default(null),
  categoryId: ulidSchema.nullable().default(null),
  /** The payee as the bank writes it: its payments belong to the container (the import links them) – cargo, not an envelope. */
  counterparty: z.string().max(300).default(''),
  /** Months in the hold (null = open). */
  from: isoMonth.nullable().default(null),
  until: isoMonth.nullable().default(null),
  loanId: ulidSchema.nullable().default(null),
  archived: z.boolean().default(false),
  note: text
})
export type Container = z.infer<typeof containerSchema>

// ------------------------------------------------------------------ goals

export const goalSchema = z.looseObject({
  ...recordBase,
  name: z.string().trim().min(1).max(80),
  target: grosze.min(0),
  /** 1 = filled first (D19). */
  priority: z.number().int().min(1).max(999).default(1),
  /** 'ictj' = a goal of an ICTTJ forecast (read only there, E5). */
  source: z.enum(['own', 'ictj']).default('own'),
  ictj: z.looseObject({ forecastId: z.string().max(100), goalId: z.string().max(100) }).nullable().default(null),
  deadline: isoMonth.nullable().default(null),
  archived: z.boolean().default(false),
  achievedAt: isoDateTime.nullable().default(null),
  note: text
})
export type Goal = z.infer<typeof goalSchema>

// ------------------------------------------------------------------ month plan

/** The loot split (D18): what was left of the month's energy, decided from the 1st of the next month. */
export const lootSchema = z.looseObject({
  decidedAt: isoDateTime,
  shields: grosze.min(0).default(0),
  /** Added to the next month's daily envelopes. */
  nextMonth: grosze.min(0).default(0),
  goals: z.record(ulidSchema, grosze.min(0)).default({})
})
export type Loot = z.infer<typeof lootSchema>

export const monthPlanSchema = z.looseObject({
  ...recordBase,
  month: isoMonth,
  /** Paid from the shields on the 1st (D11). A month without a plan takes the last earlier plan. */
  salary: grosze.min(0),
  /** Monthly limit per main category; daily or planned by the category's setting (D16). */
  envelopes: z.record(ulidSchema, grosze.min(0)).default({}),
  loot: lootSchema.nullable().default(null),
  note: text
})
export type MonthPlan = z.infer<typeof monthPlanSchema>

// ------------------------------------------------------------------ docking

/** Pools of the ICTTJ payouts (its `payouts/` records, E5). */
export const ICTJ_POOLS = ['current', 'surplus', 'goals', 'tax'] as const
export type IctjPool = (typeof ICTJ_POOLS)[number]

/** How a delivery docks: an ICTTJ payout (its pool) and / or a split chosen by the user; without a record the docking order. */
export const dockingSchema = z.looseObject({
  ...recordBase,
  date: isoDate,
  /** The incoming operation (mBank or Portfel XTB). */
  transactionId: ulidSchema,
  /** The ICTTJ entry docked (each at most once, T15). */
  ictjEntryId: z.string().max(100).nullable().default(null),
  pool: z.enum(ICTJ_POOLS).nullable().default(null),
  /** A split chosen in the docking window; the rest of the amount goes to the shields. */
  split: z
    .looseObject({
      shields: grosze.min(0).default(0),
      hull: grosze.min(0).default(0),
      goals: z.record(ulidSchema, grosze.min(0)).default({}),
      taxHold: grosze.min(0).default(0)
    })
    .nullable()
    .default(null),
  note: text
})
export type Docking = z.infer<typeof dockingSchema>

// ------------------------------------------------------------------ loans

export const loanSchema = z.looseObject({
  ...recordBase,
  name: z.string().trim().min(1).max(80),
  /** 'given' = a receivable (D22), 'taken' = own debt (its installments are containers). */
  direction: z.enum(['given', 'taken']),
  counterparty: z.string().max(200).default(''),
  amount: grosze.min(0),
  date: isoDate,
  accountId: ulidSchema.nullable().default(null),
  schedule: z.array(z.looseObject({ id: ulidSchema, date: isoDate, amount: grosze.min(0) })).default([]),
  closedAt: isoDateTime.nullable().default(null),
  note: text
})
export type Loan = z.infer<typeof loanSchema>

// ------------------------------------------------------------------ balances

/**
 * A balance of an account: 'opening' = at the START of `date` (operations from that day on are added), 'confirmation'
 * = read from the bank at the END of `date`; a difference makes a correction to explain (`correctionId`).
 */
export const balanceSchema = z.looseObject({
  ...recordBase,
  date: isoDate,
  accountId: ulidSchema,
  kind: z.enum(['opening', 'confirmation']),
  amount: grosze,
  correctionId: ulidSchema.nullable().default(null),
  note: text
})
export type Balance = z.infer<typeof balanceSchema>

// ------------------------------------------------------------------ game (E7)

/** A month of the command: rated days (frozen 24 h after their end, T9), missions, promotions. Refined in E7. */
export const gameMonthSchema = z.looseObject({
  ...recordBase,
  month: isoMonth,
  days: z
    .record(
      isoDate,
      z.looseObject({
        status: z.enum(['ok', 'broken']),
        frozenAt: isoDateTime,
        violations: z.array(z.looseObject({ order: z.string().max(60), serious: z.boolean().default(false), note: z.string().max(500).default('') })).default([])
      })
    )
    .default({}),
  missions: z.array(z.looseObject({ id: ulidSchema, template: z.string().max(60), week: z.string().max(10), done: z.boolean().default(false) })).default([]),
  promotions: z.array(z.looseObject({ id: ulidSchema, at: isoDateTime, rank: z.string().max(40), change: z.enum(['up', 'down']) })).default([]),
  achievements: z.array(z.looseObject({ id: z.string().max(60), at: isoDateTime })).default([])
})
export type GameMonth = z.infer<typeof gameMonthSchema>
