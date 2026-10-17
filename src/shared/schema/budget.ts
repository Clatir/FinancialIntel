/**
 * The budget's settings in fi.json (shared by every computer): accounts, categories, layers, orders, the budget's
 * start and the import (rules learned from the user's decisions, D68). The defaults have fixed ids – the same in
 * every folder and on every computer – so a folder created from an older fi.json gets them on read.
 */
import { z } from 'zod'
import { clockTime, grosze, isoDate, isoDateTime, ulidSchema } from './common'
import { TX_KINDS } from './records'

/** Fixed id of a default item: a valid ULID `01KDEF<kind><number>`. */
const fixedId = (kind: 'ACC' | 'CAT' | 'REG', n: number) => `01KDEF${kind}${String(n).padStart(17, '0')}`

/**
 * A value of a known set that a newer version may extend (a new kind of account, a new system category): any string
 * is read and written back unchanged, so an older version on another computer never drops it; the code treats a value
 * it does not know as „none”.
 */
function openEnum<const T extends readonly string[]>(_values: T) {
  return z.custom<T[number] | (string & {})>((v) => typeof v === 'string' && v.length > 0 && v.length <= 60)
}

/** Drop a malformed item (no id, no name – a hand-edited fi.json) instead of failing the whole settings. */
function lenientList<T extends z.ZodType>(item: T) {
  return z.array(item.nullable().catch(null)).transform((xs) => xs.filter((x): x is NonNullable<z.output<T>> => x != null))
}

// ------------------------------------------------------------------ accounts

export const ACCOUNT_KINDS = ['bank', 'wallet', 'other'] as const
export type AccountKind = (typeof ACCOUNT_KINDS)[number]

export const accountSchema = z.looseObject({
  id: ulidSchema,
  name: z.string().trim().min(1).max(40),
  kind: openEnum(ACCOUNT_KINDS).default('bank'),
  /** The bank export the import reads for this account (E2). */
  importFormat: openEnum(['mbank'] as const).nullable().default(null),
  archived: z.boolean().default(false)
})
export type Account = z.infer<typeof accountSchema>

export const MBANK_ACCOUNT_ID = fixedId('ACC', 1)
export const XTB_WALLET_ACCOUNT_ID = fixedId('ACC', 2)

/** mBank (CSV import + quick entries) and Portfel XTB (the bank account with a card, quick entries only – D9, D68). */
export function defaultAccounts(): Account[] {
  return [
    { id: MBANK_ACCOUNT_ID, name: 'mBank', kind: 'bank', importFormat: 'mbank', archived: false },
    { id: XTB_WALLET_ACCOUNT_ID, name: 'Portfel XTB', kind: 'wallet', importFormat: null, archived: false }
  ]
}

// ------------------------------------------------------------------ categories

/** Whose envelope a main category's spending counts against (D16): today's energy, or a monthly limit. */
export const ENVELOPE_KINDS = ['daily', 'planned'] as const
export type EnvelopeKind = (typeof ENVELOPE_KINDS)[number]

export const categorySchema = z.looseObject({
  id: ulidSchema,
  name: z.string().trim().min(1).max(40),
  /** null = a main category. */
  parentId: ulidSchema.nullable().default(null),
  /** Main categories only (subcategories take their parent's); null = outside the envelopes. */
  envelope: openEnum(ENVELOPE_KINDS).nullable().default(null),
  /** A category the app relies on: 'cash' = an ATM withdrawal (spec, „Przypadki szczególne”). */
  system: openEnum(['cash'] as const).nullable().default(null),
  archived: z.boolean().default(false)
})
export type Category = z.infer<typeof categorySchema>

/** The envelope of a category as this version knows it (a value of a newer version = none). */
export function envelopeKind(c: Pick<Category, 'envelope'> | null | undefined): EnvelopeKind | null {
  const v = c?.envelope
  return v === 'daily' ? 'daily' : v === 'planned' ? 'planned' : null
}

export const CASH_CATEGORY_ID = fixedId('CAT', 10)

/** The starting categories (D25, D68): nine main ones with subcategories and the system „Gotówka”. */
const DEFAULT_CATEGORY_TREE: Array<{ n: number; name: string; envelope: EnvelopeKind; subs: string[] }> = [
  { n: 1, name: 'Jedzenie', envelope: 'daily', subs: ['zakupy spożywcze', 'na mieście', 'kawa i przekąski'] },
  { n: 2, name: 'Dom', envelope: 'planned', subs: ['czynsz i opłaty', 'media', 'wyposażenie', 'chemia'] },
  { n: 3, name: 'Auto', envelope: 'planned', subs: ['paliwo', 'serwis', 'ubezpieczenie', 'parking i opłaty', 'przejazdy'] },
  { n: 4, name: 'Zwierzęta', envelope: 'planned', subs: ['karma', 'weterynarz', 'akcesoria'] },
  { n: 5, name: 'Zdrowie', envelope: 'planned', subs: ['leki', 'lekarz', 'sport'] },
  { n: 6, name: 'Rozrywka i hobby', envelope: 'daily', subs: ['wyjścia', 'hobby', 'podróże'] },
  { n: 7, name: 'Subskrypcje i łączność', envelope: 'planned', subs: ['telefon', 'internet', 'streaming', 'aplikacje'] },
  { n: 8, name: 'Osobiste', envelope: 'daily', subs: ['ubrania', 'kosmetyki', 'fryzjer'] },
  { n: 9, name: 'Prezenty i inne', envelope: 'planned', subs: ['prezenty', 'inne'] }
]

/** Id of a default (sub)category: `n` main, `sub` 1… its subcategory (by the order above). */
export const defaultCategoryId = (n: number, sub = 0) => fixedId('CAT', n * 100 + sub)

export function defaultCategories(): Category[] {
  const out: Category[] = []
  for (const main of DEFAULT_CATEGORY_TREE) {
    const id = defaultCategoryId(main.n)
    out.push({ id, name: main.name, parentId: null, envelope: main.envelope, system: null, archived: false })
    main.subs.forEach((name, i) => out.push({ id: defaultCategoryId(main.n, i + 1), name, parentId: id, envelope: null, system: null, archived: false }))
  }
  out.push({ id: CASH_CATEGORY_ID, name: 'Gotówka', parentId: null, envelope: 'daily', system: 'cash', archived: false })
  return out
}

// ------------------------------------------------------------------ layers, orders, start

export const layersSchema = z.looseObject({
  /** Target of the shields in salaries (spec: 3). */
  shieldSalaries: z.number().int().min(1).max(24).catch(3).default(3),
  /** Target of the hull in months of average net costs (D12: 6). */
  hullMonths: z.number().int().min(1).max(36).catch(6).default(6),
  /** Average monthly net costs assumed while the history has fewer than 3 full months (start wizard, E3). */
  assumedCosts: grosze.min(0).nullable().catch(null).default(null)
})
export type LayersSettings = z.infer<typeof layersSchema>

/** The default orders (spec, „Rozkazy”); the game uses them from E7, the operations list shows the marks from E1. */
export const ordersSchema = z.looseObject({
  /** Minimum shields in salaries. */
  minShieldSalaries: z.number().min(0).max(24).catch(1).default(1),
  /** The load line: fixed costs at most this % of the salary. */
  cargoLimitPct: z.number().min(1).max(100).catch(40).default(40),
  /** Quiet hours (D40): a purchase in them needs a confirmation and a short entry. */
  quietHours: z
    .looseObject({ from: clockTime.catch('23:00').default('23:00'), to: clockTime.catch('05:00').default('05:00') })
    .catch({ from: '23:00', to: '05:00' })
    .prefault({}),
  /** From this amount the captain's log asks „plan czy impuls?” (D41). */
  impulseThreshold: grosze.min(0).catch(20000).default(20000),
  /** Top-ups of the XTB trading account only from the money free to decide (D23). */
  firewall: z.boolean().catch(true).default(true)
})
export type Orders = z.infer<typeof ordersSchema>

export const budgetStartSchema = z.looseObject({
  /** First day of the layers (the start wizard, E3); null = the earliest opening balance. */
  start: isoDate.nullable().catch(null).default(null),
  /** Split of the money at the start (wizard step 5); null = the docking order; the rest stays in the shields. */
  initial: z
    .looseObject({
      shields: grosze.min(0).default(0),
      hull: grosze.min(0).default(0),
      goals: z.record(ulidSchema, grosze.min(0)).default({})
    })
    .nullable()
    .catch(null)
    .default(null)
})
export type BudgetStart = z.infer<typeof budgetStartSchema>

// ------------------------------------------------------------------ import

/**
 * A rule of the import (E2): an operation of this counterparty becomes … Learned from the user's decisions (the
 * group categorization) or written in the settings. The bank's own categories are a weak hint only (D68).
 */
export const importRuleSchema = z.looseObject({
  id: ulidSchema,
  /**
   * 'exact': the brand key (`brandOf`, 1.2.1) or the whole name's key (`counterpartyKey`, rules learned before);
   * 'contains': a fragment of either; 'keyword': folded words in the name or the title (`normalizeKeyword`, the last
   * word may go on – „cukierni” = cukiernia). An older version ignores a mode it does not know.
   */
  match: z.string().min(1).max(200),
  mode: openEnum(['exact', 'contains', 'keyword'] as const).default('exact'),
  /** Money in or out; null = both. */
  direction: openEnum(['in', 'out'] as const).nullable().default(null),
  /** The counterparty as the bank writes it (for the list of rules). */
  label: z.string().max(200).default(''),
  kind: openEnum(TX_KINDS).default('expense'),
  categoryId: ulidSchema.nullable().default(null),
  refundable: z.boolean().default(false),
  /** A household member (D20): money from them proposes repaying the house receivable first. */
  household: z.boolean().default(false),
  counterAccountId: ulidSchema.nullable().default(null),
  /** false = written or edited by the user in the settings (never overwritten by learning). */
  learned: z.boolean().default(true),
  hits: z.number().int().min(0).default(0),
  updatedAt: isoDateTime
})
export type ImportRule = z.infer<typeof importRuleSchema>

export const importSettingsSchema = z.looseObject({
  /** The account holder's names as the bank writes them: transfers to / from them are own transfers. */
  ownNames: z.array(z.string().trim().min(1).max(120)).catch([]).default([]),
  rules: lenientList(importRuleSchema).catch([]).default([]),
  /** Last import per account (a reminder of an overdue import, E4). */
  lastImport: z.record(ulidSchema, isoDateTime).catch({}).default({}),
  /**
   * The imports (E7: the mission „Łączność z bazą”): time → account, the last 100. A record, so two computers' imports
   * merge key by key (an array would be one conflicting field).
   */
  log: z.record(isoDateTime, ulidSchema).catch({}).default({})
})
export type ImportSettings = z.infer<typeof importSettingsSchema>

// ------------------------------------------------------------------ ICT Trade Journal (E5)

/** What the folder keeps of ICTTJ (the same on every computer; the folder's path is the computer's – T12). */
export const ictjSettingsSchema = z.looseObject({
  /** The forecast scenario whose goals are the ship's ICTTJ goals (null = the one changed last in ICTTJ). */
  forecastId: z.string().max(100).nullable().catch(null).default(null),
  /** ICTTJ entries that are not to be docked (the money went elsewhere). */
  skipped: z.array(z.string().max(100)).catch([]).default([])
})
export type IctjSettings = z.infer<typeof ictjSettingsSchema>

// ------------------------------------------------------------------ the game (E7)

/** The command's start and thresholds (D73): one for the folder, changed in Dowództwo. */
export const gameSettingsSchema = z.looseObject({
  /** The first rated day: the first full day after 1.2.0 ran (set once, by the first computer); null = not yet. */
  start: isoDate.nullable().catch(null).default(null),
  /** A promotion: this many compliant days within the last `windowDays`, counted since the last change of rank. */
  promoteDays: z.number().int().min(1).max(366).catch(30).default(30),
  windowDays: z.number().int().min(1).max(366).catch(35).default(35),
  /** A planned envelope over its limit by more than this % is a serious violation. */
  seriousEnvelopePct: z.number().int().min(0).max(500).catch(20).default(20),
  /** This many serious violations in a calendar month demote. */
  demoteSerious: z.number().int().min(1).max(31).catch(3).default(3),
  /** A mission done counts as this many compliant days. */
  missionDays: z.number().int().min(0).max(30).catch(3).default(3)
})
export type GameSettings = z.infer<typeof gameSettingsSchema>

// ------------------------------------------------------------------ items added by later versions

const starterRule = (n: number, match: string, label: string, categoryId: string): ImportRule => ({
  id: fixedId('REG', n),
  match,
  mode: 'exact',
  direction: 'out',
  label,
  kind: 'expense',
  categoryId,
  refundable: false,
  household: false,
  counterAccountId: null,
  learned: true,
  hits: 0,
  updatedAt: '2026-10-17T00:00:00.000Z'
})

/**
 * Items a version adds to every folder once (D69): a new default category, a starter rule. `settings.seeded`
 * remembers what was added, so an archived category or a deleted rule never comes back.
 */
const SEEDS: ReadonlyArray<{ id: string; category?: () => Category; rule?: ImportRule }> = [
  { id: 'category:auto-przejazdy', category: () => defaultCategories().find((c) => c.id === defaultCategoryId(3, 5))! },
  // Taxi rides are going out, trains are travel (D69).
  { id: 'rule:bolt', rule: starterRule(1, 'bolt', 'Bolt', defaultCategoryId(6)) },
  { id: 'rule:koleo', rule: starterRule(2, 'koleo', 'KOLEO', defaultCategoryId(3, 5)) }
]

type Seedable = { categories: Category[]; import: ImportSettings; seeded: string[] }

/** The settings with the seeds not added yet (the same object when there is nothing to add). */
export function seedSettings<T extends Seedable>(s: T): T {
  const todo = SEEDS.filter((x) => !s.seeded.includes(x.id))
  if (!todo.length) return s
  let categories = s.categories
  let rules = s.import.rules
  for (const x of todo) {
    const c = x.category?.()
    if (c && !categories.some((y) => y.id === c.id) && categories.some((y) => y.id === c.parentId)) categories = [...categories, c]
    const r = x.rule
    if (r && !rules.some((y) => y.id === r.id || (y.match === r.match && (y.direction ?? r.direction) === r.direction))) rules = [...rules, r]
  }
  return { ...s, categories, import: { ...s.import, rules }, seeded: [...s.seeded, ...todo.map((x) => x.id)] }
}

export const budgetSettingsShape = {
  accounts: lenientList(accountSchema).catch(defaultAccounts).default(defaultAccounts),
  categories: lenientList(categorySchema).catch(defaultCategories).default(defaultCategories),
  layers: layersSchema.prefault({}),
  orders: ordersSchema.prefault({}),
  budget: budgetStartSchema.prefault({}),
  import: importSettingsSchema.prefault({}),
  ictj: ictjSettingsSchema.prefault({}),
  game: gameSettingsSchema.prefault({}),
  /** `SEEDS` already added to this folder. */
  seeded: z.array(z.string().max(60)).catch([]).default([])
}
