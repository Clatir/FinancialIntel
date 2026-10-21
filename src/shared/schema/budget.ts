/**
 * The budget's settings in fi.json (shared by every computer): accounts, categories, layers, orders, the budget's
 * start and the import (rules learned from the user's decisions, D68). The defaults have fixed ids – the same in
 * every folder and on every computer – so a folder created from an older fi.json gets them on read.
 */
import { z } from 'zod'
import { clockTime, grosze, isoDate, isoDateTime, tagListSchema, ulidSchema } from './common'
import { shareSchema, TX_KINDS } from './records'

/** Fixed id of a default item: a valid ULID `01KDEF<kind><number>`. */
const fixedId = (kind: 'ACC' | 'CAT' | 'REG' | 'MEM', n: number) => `01KDEF${kind}${String(n).padStart(17, '0')}`

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

export const ACCOUNT_KINDS = ['bank', 'wallet', 'cash', 'other'] as const
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
/** The cash in the wallet (D83, 1.5.0): money given back in cash comes onto it, cash expenses are typed from it. */
export const CASH_ACCOUNT_ID = fixedId('ACC', 3)

const cashAccount = (): Account => ({ id: CASH_ACCOUNT_ID, name: 'Gotówka', kind: 'cash', importFormat: null, archived: false })

/**
 * mBank (CSV import + quick entries), Portfel XTB (the bank account with a card, quick entries only – D9, D68) and the
 * cash (D83: what household members give back in cash, the expenses paid with it).
 */
export function defaultAccounts(): Account[] {
  return [
    { id: MBANK_ACCOUNT_ID, name: 'mBank', kind: 'bank', importFormat: 'mbank', archived: false },
    { id: XTB_WALLET_ACCOUNT_ID, name: 'Portfel XTB', kind: 'wallet', importFormat: null, archived: false },
    cashAccount()
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
  /**
   * 'amount' (1.5.1, F22): the brand key as 'exact', for an operation up to `maxAmount` – before the brand's 'exact' one
   * („Orlen do 40 zł → kawa”, the rest „paliwo”); an older version ignores it and takes the brand's plain rule.
   */
  mode: openEnum(['exact', 'contains', 'keyword', 'amount'] as const).default('exact'),
  /** The 'amount' rule's limit: the operation's amount up to it (grosze, without the sign). */
  maxAmount: z.number().int().positive().nullable().optional().catch(undefined),
  /** Money in or out; null = both. */
  direction: openEnum(['in', 'out'] as const).nullable().default(null),
  /** The counterparty as the bank writes it (for the list of rules). */
  label: z.string().max(200).default(''),
  kind: openEnum(TX_KINDS).default('expense'),
  categoryId: ulidSchema.nullable().default(null),
  refundable: z.boolean().default(false),
  /** A household member (D20): money from them proposes repaying the house receivable first. */
  household: z.boolean().default(false),
  /** The household member (D80): who finances an expense („refundable”), whose money an income is („household”); null = the first. */
  memberId: ulidSchema.nullable().catch(null).default(null),
  /** A purchase the member gives (D83, with `refundable`): nobody owes it. Absent = no. */
  gift: z.boolean().optional().catch(undefined),
  /** A purchase financed by several people (D83): each row's amount split so (`calc/share.ts`). Absent / null = none. */
  share: shareSchema.nullable().optional().catch(undefined),
  counterAccountId: ulidSchema.nullable().default(null),
  /** Tags the rule gives (1.10.0, F17 – „Netia → #ulga-internet”); absent = none. An older version ignores them. */
  tags: tagListSchema.optional().catch(undefined),
  /** false = written or edited by the user in the settings (never overwritten by learning). */
  learned: z.boolean().default(true),
  hits: z.number().int().min(0).default(0),
  updatedAt: isoDateTime
})
export type ImportRule = z.infer<typeof importRuleSchema>

/** Names the user said are one counterparty (1.2.2, D78): this brand key is grouped and ruled as `to`. */
export const brandAliasSchema = z.looseObject({
  to: z.string().min(1).max(200),
  /** The merged name and the one it was merged into, as the bank wrote them (for the list in the settings). */
  label: z.string().max(200).catch('').default(''),
  toLabel: z.string().max(200).catch('').default(''),
  at: z.string().max(40).catch('').default('')
})
export type BrandAlias = z.infer<typeof brandAliasSchema>

/** A record of the settings one bad entry of which (a hand-edited fi.json) drops itself, not the others. */
const lenientRecord = <T extends z.ZodType>(value: T) =>
  z
    .record(z.string(), z.unknown())
    .catch({})
    .default({})
    .transform((r) => {
      const out: Record<string, z.infer<T>> = {}
      for (const [k, v] of Object.entries(r)) {
        const parsed = k.length > 0 && k.length <= 300 ? value.safeParse(v) : null
        if (parsed?.success) out[k] = parsed.data
      }
      return out
    })

export const importSettingsSchema = z.looseObject({
  /** The account holder's names as the bank writes them: transfers to / from them are own transfers. */
  ownNames: z.array(z.string().trim().min(1).max(120)).catch([]).default([]),
  rules: lenientList(importRuleSchema).catch([]).default([]),
  /** Last import per account (a reminder of an overdue import, E4). */
  lastImport: z.record(ulidSchema, isoDateTime).catch({}).default({}),
  /**
   * The last day the files imported to each account cover (1.5.0, B18): the latest period's end – the money of the days
   * up to it is in the budget (the docking's „Portfel XTB?” waits for it, not for the moment of the import).
   */
  coveredTo: z.record(ulidSchema, isoDate).catch({}).default({}),
  /**
   * The imports (E7: the mission „Łączność z bazą”): time → account, the last 100. A record, so two computers' imports
   * merge key by key (an array would be one conflicting field).
   */
  log: z.record(isoDateTime, ulidSchema).catch({}).default({}),
  /**
   * The bank's account number of each account's files (1.5.1, F4): a file of another account is said before it is
   * imported. The last imported one (a new account at the bank says it once).
   */
  accountNumbers: lenientRecord(z.string().max(80)),
  /**
   * Groups of operations the user said are no duplicates (`duplicateKey` / `rowKey` → when, 1.2.1): not offered again.
   * One bad entry (a hand-edited fi.json) drops itself, not the others.
   */
  notDuplicates: z
    .record(z.string(), z.unknown())
    .catch({})
    .default({})
    .transform((r) => Object.fromEntries(Object.entries(r).filter((e): e is [string, string] => e[0].length <= 300 && typeof e[1] === 'string'))),
  /**
   * Names merged by the user (1.2.2, D78): a brand key → the key it is one with („MOKKA CAFE” = „KAWIARNIA MOKKA”) –
   * one group in the import, one rule. A record, so two computers' merges join key by key.
   */
  aliases: lenientRecord(brandAliasSchema).transform((r) => Object.fromEntries(Object.entries(r).filter(([k, a]) => a.to !== k))),
  /** Pairs of names the user said are not one (`pairKey` → when, 1.2.2): not offered again. */
  notSimilar: lenientRecord(z.string().max(40))
})
export type ImportSettings = z.infer<typeof importSettingsSchema>

// ------------------------------------------------------------------ the household (D80, 1.3.0)

/** What a member's money beyond what they owe is: asked once, then remembered (D80 b). */
export const MEMBER_INFLOWS = ['ask', 'advance', 'income'] as const
export type MemberInflow = (typeof MEMBER_INFLOWS)[number]

/** A member's balance when the settlements start (D81): what they owed then and what they had paid ahead (grosze). */
export const memberOpeningSchema = z.looseObject({
  owed: z.number().int().min(0).catch(0).default(0),
  deposit: z.number().int().min(0).catch(0).default(0),
  /**
   * The day of the oldest purchase the owed part comes from (N41): the reminder after 30 days and the lists count from
   * it. null = not known (typed by hand); absent = set before 1.6.2 (stamped once from the ledger as 1.3.0 counted it).
   */
  since: isoDate.nullable().optional().catch(undefined)
})
export type MemberOpening = z.infer<typeof memberOpeningSchema>

export const householdMemberSchema = z.looseObject({
  id: ulidSchema,
  name: z.string().trim().min(1).max(40),
  /** The member's names as the bank writes them: the import knows their transfers by them. */
  bankNames: z.array(z.string().trim().min(1).max(120)).max(20).catch([]).default([]),
  inflow: openEnum(MEMBER_INFLOWS).catch('ask').default('ask'),
  archived: z.boolean().default(false),
  /**
   * Another member their money usually comes through (D81: no bank of their own) – a hint at that member's transfers
   * („+ także za …”), never applied by itself.
   */
  via: ulidSchema.nullable().catch(null).default(null),
  /** Their balance at the settlements' start (`HouseholdSettings.since`). */
  opening: memberOpeningSchema.catch({ owed: 0, deposit: 0 }).prefault({})
})
export type HouseholdMember = z.infer<typeof householdMemberSchema>

/**
 * The first member: the house of D21 („do zwrotu”, one receivable). Operations marked before 1.3.0 – and any without a
 * member – are theirs; renamed to the person who pays, they need no other change.
 */
export const HOUSE_MEMBER_ID = fixedId('MEM', 1)

export function defaultMembers(): HouseholdMember[] {
  return [{ id: HOUSE_MEMBER_ID, name: 'Dom', bankNames: [], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } }]
}

/** A member's inflow as this version knows it (a value of a newer version = ask). */
export function inflowOf(m: Pick<HouseholdMember, 'inflow'> | null | undefined): MemberInflow {
  const v = m?.inflow
  return v === 'advance' ? 'advance' : v === 'income' ? 'income' : 'ask'
}

export const householdSettingsSchema = z.looseObject({
  members: lenientList(householdMemberSchema).catch(defaultMembers).default(defaultMembers),
  /**
   * The settlements' start (D81): the members' balances count from it (their `opening` then); their money before it is
   * not income (the statistics). Absent = not chosen yet (1.4.0 sets the day it first opens the folder); null = from the
   * budget's start (as 1.3.0).
   */
  since: isoDate.nullable().optional().catch(undefined),
  /**
   * The operations the members' balances at `since` take in (1.5.0, B14): the household's operations dated from the
   * budget's start to the day before `since` when the balances were set (the seed, a new date; a folder of before 1.5.0
   * – its first start of 1.5.0). One dated before `since` and not among them – added later (a late import of the bank,
   * another computer), its date or its members changed since – counts right after them. Absent = all of them (1.4.x).
   */
  openingIds: z.array(z.string()).optional().catch(undefined),
  /**
   * From this day a member's money pays back only the purchases it names (1.12.0, D91 – `calc/household.ts`): what it
   * repays beyond them waits to be assigned; before it, the oldest purchases too (as before 1.12.0). Absent = not set
   * yet (1.12.0 sets the day it first opens the folder); null = from the start.
   */
  assignFrom: isoDate.nullable().optional().catch(undefined)
})
export type HouseholdSettings = z.infer<typeof householdSettingsSchema>

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
  missionDays: z.number().int().min(0).max(30).catch(3).default(3),
  /** Days confirmed without expenses in the evening report (F13): day → when; the watch log marks them. */
  noSpend: z.record(isoDate, isoDateTime).catch({}).default({})
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
  memberId: null,
  counterAccountId: null,
  learned: true,
  hits: 0,
  updatedAt: '2026-10-17T00:00:00.000Z'
})

/**
 * Items a version adds to every folder once (D69): a new default category, a starter rule. `settings.seeded`
 * remembers what was added, so an archived category or a deleted rule never comes back.
 */
const SEEDS: ReadonlyArray<{ id: string; category?: () => Category; rule?: ImportRule; account?: () => Account }> = [
  { id: 'category:auto-przejazdy', category: () => defaultCategories().find((c) => c.id === defaultCategoryId(3, 5))! },
  // Taxi rides are going out, trains are travel (D69).
  { id: 'rule:bolt', rule: starterRule(1, 'bolt', 'Bolt', defaultCategoryId(6)) },
  { id: 'rule:koleo', rule: starterRule(2, 'koleo', 'KOLEO', defaultCategoryId(3, 5)) },
  // The cash account (D83, 1.5.0) – a name the folder has already (an account typed by hand) keeps it out.
  { id: 'account:gotowka', account: cashAccount }
]

type Seedable = { accounts: Account[]; categories: Category[]; import: ImportSettings; seeded: string[] }

/** The settings with the seeds not added yet (the same object when there is nothing to add). */
export function seedSettings<T extends Seedable>(s: T): T {
  const todo = SEEDS.filter((x) => !s.seeded.includes(x.id))
  if (!todo.length) return s
  let accounts = s.accounts
  let categories = s.categories
  let rules = s.import.rules
  for (const x of todo) {
    const a = x.account?.()
    if (a && !accounts.some((y) => y.id === a.id || y.name.toLowerCase() === a.name.toLowerCase())) accounts = [...accounts, a]
    const c = x.category?.()
    if (c && !categories.some((y) => y.id === c.id) && categories.some((y) => y.id === c.parentId)) categories = [...categories, c]
    const r = x.rule
    if (r && !rules.some((y) => y.id === r.id || (y.match === r.match && (y.direction ?? r.direction) === r.direction))) rules = [...rules, r]
  }
  return { ...s, accounts, categories, import: { ...s.import, rules }, seeded: [...s.seeded, ...todo.map((x) => x.id)] }
}

// ------------------------------------------------------------------ the cargo hold and the sensors (1.9.0)

export const cargoSettingsSchema = z.looseObject({
  /** The payees (`counterpartyKey`) whose recurring payments are not proposed for the hold (F23 – „Nie proponuj”). */
  ignored: z.array(z.string().max(300)).catch([]).default([])
})

export const anomalySettingsSchema = z.looseObject({
  /** The anomalies said „w porządku” to (F31): their keys – never reported again. */
  ok: z.array(z.string().max(200)).catch([]).default([])
})

// ------------------------------------------------------------------ the intelligence (1.10.0)

export const intelSettingsSchema = z.looseObject({
  /** A tag's goal of the star map (F17 – „Ekspedycja: wydano 4 320 z 5 000 zł celu”): the tag's key → the goal's id. */
  tagGoals: lenientRecord(ulidSchema),
  /**
   * The CPI of GUS typed by hand, month by month (F36, D87 – no network): the year-on-year change in % as published
   * („4,9”) – „Twoja inflacja” against it.
   */
  cpi: lenientRecord(z.number().min(-50).max(200)).transform((r) => Object.fromEntries(Object.entries(r).filter(([k]) => /^\d{4}-(0[1-9]|1[0-2])$/.test(k))))
})

// ------------------------------------------------------------------ saved views of Operacje (1.7.0, F18)

export const operationViewSchema = z.looseObject({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  /** The list's filter as Operacje keeps it – `shared/operationsView.ts` `filterOf` reads it (a newer version's fields kept). */
  filter: z.record(z.string(), z.unknown()).catch({}),
  /** The view's period comes with it; without it the list keeps the period it shows. */
  withPeriod: z.boolean().catch(false).default(false)
})
export type OperationView = z.infer<typeof operationViewSchema>

export const budgetSettingsShape = {
  accounts: lenientList(accountSchema).catch(defaultAccounts).default(defaultAccounts),
  categories: lenientList(categorySchema).catch(defaultCategories).default(defaultCategories),
  layers: layersSchema.prefault({}),
  orders: ordersSchema.prefault({}),
  budget: budgetStartSchema.prefault({}),
  import: importSettingsSchema.prefault({}),
  household: householdSettingsSchema.prefault({}),
  ictj: ictjSettingsSchema.prefault({}),
  game: gameSettingsSchema.prefault({}),
  /** `SEEDS` already added to this folder. */
  seeded: z.array(z.string().max(60)).catch([]).default([]),
  /** Saved views of Operacje (F18): chips over the list, shared by the computers. */
  operationViews: lenientList(operationViewSchema).catch([]).default([]),
  cargo: cargoSettingsSchema.prefault({}),
  anomalies: anomalySettingsSchema.prefault({}),
  intel: intelSettingsSchema.prefault({})
}
