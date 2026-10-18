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
 * - 'income' – a delivery: docks into the layers (shields → hull → goals); money of a household member (`memberId`, D80)
 *   repays what they owe first, the rest is their advance or income (`calc/household.ts`);
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

/** One line of a split receipt: several categories, or the own part and a household member's part. */
export const splitSchema = z.looseObject({
  id: ulidSchema,
  /** Signed like the operation's amount (money out < 0). */
  amount: grosze,
  categoryId: ulidSchema.nullable().default(null),
  /** Financed by a household member (D80, before 1.3.0 „do zwrotu” for the house – D21): not a cost of mine. */
  refundable: z.boolean().default(false),
  /**
   * Who finances the line (`settings.household.members`); null = the first member, „Dom” (D21 – one house). A part of an
   * income (D81): whose money it is (null = mine, income).
   */
  memberId: ulidSchema.nullable().catch(null).default(null),
  /** A member's part of an income (D81): what they do not owe is their advance, not income. */
  advance: z.boolean().catch(false).default(false),
  /**
   * A member's line as their gift (D83, 1.5.0): it takes their advance first, the rest the shields pay – nobody owes it,
   * and it is no cost of mine. An older version reads the line as financed (the member owes it). Absent = no.
   */
  gift: z.boolean().optional().catch(undefined),
  note: text
})
export type Split = z.infer<typeof splitSchema>

/** How a shared purchase is split among the people (D83): equally, by percents or by amounts (the rest – mine). */
export const SHARE_MODES = ['equal', 'percent', 'amounts'] as const
export type ShareMode = (typeof SHARE_MODES)[number]

/** One person of a shared purchase: me (`memberId` null) or a household member, their percent or amount, a gift. */
export const shareLineSchema = z.looseObject({
  memberId: ulidSchema.nullable().catch(null).default(null),
  /** 'percent': the percent (0–100); 'amounts': grosze (mine – the rest); 'equal': not used. */
  value: z.number().min(0).max(1e12).catch(0).default(0),
  gift: z.boolean().catch(false).default(false)
})
export type ShareLine = z.infer<typeof shareLineSchema>

/**
 * A purchase financed by several people in one move (D83, 1.5.0): the way its lines (`splits`, one per person, the
 * operation's category) were made – a new amount gives them again (`calc/share.ts`). The lines alone are what counts:
 * an older version reads them as a split receipt.
 */
export const shareSchema = z.looseObject({
  mode: z.enum(SHARE_MODES),
  lines: z.array(shareLineSchema).min(2).max(20)
})
export type Share = z.infer<typeof shareSchema>

/** The bank's row behind an operation (import from mBank, E2). */
export const bankRowSchema = z.looseObject({
  format: z.enum(['mbank']).default('mbank'),
  /** Identity of the row across imports (`shared/import/mbank.ts` `rowKey`). */
  key: z.string().min(1).max(300),
  /** The bank's description, whitespace collapsed. */
  description: z.string().max(2000).default(''),
  /** The counterparty as the bank wrote it (an operation still showing it takes the new one when the row settles). */
  counterparty: z.string().max(300).default(''),
  /** The name as versions before 1.2.3 read it, when another (the bank's additions cut): their rules' keys (1.2.3). */
  bankName: z.string().max(300).optional().catch(undefined),
  /** Type of the operation („ZAKUP PRZY UŻYCIU KARTY W KRAJU”, „PRZELEW WEWNĘTRZNY PRZYCHODZĄCY”…). */
  operation: z.string().max(200).default(''),
  /** The bank's own category: a weak hint only (often wrong). */
  category: z.string().max(200).default(''),
  /** „transakcja nierozliczona”: the bank may still change the amount or drop the row. */
  pending: z.boolean().default(false),
  importedAt: isoDateTime,
  /** The file it came from (1.4.2; before – `import/reconcile.ts` `formatsOf` tells it): a list of operations or the account history. */
  source: z.enum(['lista', 'historia']).optional().catch(undefined),
  /** The keys of the same row in the other format (1.4.2, B5): its description differs there, so its key too. */
  altKeys: z.array(z.string().min(1).max(300)).max(20).optional().catch(undefined)
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
  /**
   * Financed by a household member (D80; „do zwrotu” for the house before 1.3.0 – D21): not a cost of mine, never the
   * energy's; it takes the member's advance first, the rest the shields lend until the member pays it back.
   */
  refundable: z.boolean().default(false),
  /**
   * The household member (`settings.household.members`, D80): of an expense – who finances it (with `refundable`; null =
   * the first member, „Dom”); of an income – whose money it is (repays what they owe first).
   */
  memberId: ulidSchema.nullable().catch(null).default(null),
  /** A household member's income: what they do not owe is their advance (held in the deposit), not income. */
  advance: z.boolean().catch(false).default(false),
  /** A purchase a member finances as their gift (D83, with `refundable`): nobody owes it (`Split.gift`). Absent = no. */
  gift: z.boolean().optional().catch(undefined),
  /** Financed by several people in one move (D83): how its lines were made; absent / null = none (or a split receipt). */
  share: shareSchema.nullable().optional().catch(undefined),
  /** A household member's income: the purchases it pays back first (operations' ids), then the oldest. */
  covers: z.array(ulidSchema).max(500).catch([]).default([]),
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
  /**
   * Income before 1.3.0: the part repaying the house receivable (≤ amount; D20). An income with it and no `memberId` is
   * the first member's money that repays at most this much; 1.3.0 writes `memberId` instead (0 here).
   */
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
  /** When it was archived (1.4.2, B56): it counts until that month's end; none = archived before 1.4.2 – never counts. */
  archivedAt: isoDateTime.nullable().catch(null).default(null),
  note: text
})
export type Container = z.infer<typeof containerSchema>

// ------------------------------------------------------------------ goals

/** A goal's state before one of its changes (1.4.2, D84 C1): it held until that moment (excluded). */
export const goalPastSchema = z.looseObject({
  until: isoDateTime,
  priority: z.number().int().min(1).max(999),
  target: grosze.min(0),
  archived: z.boolean()
})
export type GoalPast = z.infer<typeof goalPastSchema>

/** The goal's money moved out (1.4.2, D84 C2): at the end of the Warsaw day of `at`, to the shields or another goal. */
export const goalTransferSchema = z.looseObject({
  at: isoDateTime,
  /** 'shields' or the id of a goal. */
  to: z.string().min(1).max(40),
  /** What the goal held then: never more moves (a later import may have taken some of it). */
  amount: grosze.min(0)
})
export type GoalTransfer = z.infer<typeof goalTransferSchema>

/** A malformed item (a hand-edited file) dropped, not the whole list. */
const lenientList = <T extends z.ZodType>(item: T) => z.array(item.nullable().catch(null)).transform((xs) => xs.filter((x): x is NonNullable<z.output<T>> => x != null))

export const goalSchema = z.looseObject({
  ...recordBase,
  name: z.string().trim().min(1).max(80),
  target: grosze.min(0),
  /** 1 = filled first (D19). */
  priority: z.number().int().min(1).max(999).default(1),
  /**
   * 'ictj' = a goal of an ICTTJ forecast (E5): its name and target follow ICTTJ (read only), its id is the ICTTJ goal's
   * own (two computers never make two of one goal); `archived` = gone from the chosen scenario.
   */
  source: z.enum(['own', 'ictj']).default('own'),
  ictj: z
    .looseObject({
      forecastId: z.string().max(100),
      goalId: z.string().max(100),
      /** The scenario's currency and the goal's amount there (× 100): a goal of a non-PLN scenario has no target in FI. */
      currency: z.string().max(3).catch('PLN').default('PLN'),
      amount: z.number().nullable().catch(null).default(null),
      /** `updatedAt` of the scenario the record follows: an older copy of it (still syncing) changes nothing. */
      version: z.string().max(40).catch('').default('')
    })
    .nullable()
    .default(null),
  deadline: isoMonth.nullable().default(null),
  archived: z.boolean().default(false),
  achievedAt: isoDateTime.nullable().default(null),
  note: text,
  /**
   * The moment the goal takes money from (1.4.2: when it was added) – money that came in before is not its; null =
   * always, a goal from before 1.4.2 as the engine counted it then.
   */
  activeFrom: isoDateTime.nullable().catch(null).default(null),
  /** Its priority, target and archiving before each change, oldest first (1.4.2): a change counts from its moment on. */
  past: lenientList(goalPastSchema)
    .transform((xs) => [...xs].sort((a, b) => Date.parse(a.until) - Date.parse(b.until)))
    .catch([])
    .default([]),
  /** Its money moved out (1.4.2): at archiving or later, to the shields or another goal. */
  transfers: lenientList(goalTransferSchema).catch([]).default([])
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

/** A rated day, frozen 24 h after its end (T9): a later change of the data never changes it. */
export const gameDaySchema = z.looseObject({
  status: z.enum(['ok', 'broken']),
  frozenAt: isoDateTime,
  violations: z
    .array(
      z.looseObject({
        order: z.string().max(60),
        serious: z.boolean().default(false),
        /** Cut, never refused: one long text never makes a month unwritable (B32). */
        note: z
          .string()
          .default('')
          .transform((s) => s.slice(0, 500)),
        /** What the violation is about: an envelope's category, an operation, a container. */
        ref: z.string().max(100).nullable().default(null),
        /** Its amount (grosze): over the allowance or the limit, below the minimum, the purchase; the screen formats it. */
        amount: grosze.nullable().default(null)
      })
    )
    .default([]),
  /** The ship's class at the day's end. */
  cls: z.string().max(20).nullable().default(null),
  /** The cargo's monthly mass at the day's end (the next day sees a container added or raised by it). */
  cargo: grosze.nullable().default(null),
  /** The day's ICT flavour (D73): 'judas' (an impulse), 'turtle' (a returned product), 'sweep' (the energy exactly 0). */
  tags: z.array(z.string().max(20)).default([])
})
export type GameDay = z.infer<typeof gameDaySchema>

/** A weekly mission (D73): chosen for the week's weak point, judged once its Sunday is frozen. */
export const gameMissionSchema = z.looseObject({
  id: ulidSchema,
  template: z.string().max(60),
  /** ISO week 'RRRR-Www'. */
  week: z.string().max(10),
  done: z.boolean().default(false),
  /** Judged (done or not); null = in progress. */
  evaluatedAt: isoDateTime.nullable().default(null),
  /** The mission's target: an envelope, a killzone slot, an amount. */
  params: z.record(z.string().max(40), z.union([z.string().max(100), z.number()])).default({})
})
export type GameMission = z.infer<typeof gameMissionSchema>

/** A month of the command (E7): rated days, missions, changes of rank and achievements – all frozen. */
export const gameMonthSchema = z.looseObject({
  ...recordBase,
  month: isoMonth,
  days: z.record(isoDate, gameDaySchema).default({}),
  missions: z.array(gameMissionSchema).default([]),
  promotions: z
    .array(z.looseObject({ id: ulidSchema, at: isoDateTime, rank: z.string().max(40), change: z.enum(['up', 'down']), day: isoDate.nullable().default(null) }))
    .default([]),
  achievements: z.array(z.looseObject({ id: z.string().max(60), at: isoDateTime, day: isoDate.nullable().default(null) })).default([])
})
export type GameMonth = z.infer<typeof gameMonthSchema>
