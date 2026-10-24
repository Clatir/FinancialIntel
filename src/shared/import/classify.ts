/**
 * What an imported row is for the budget (spec: „Import z mBanku”, steps 3–4): the rules learned from the user's
 * decisions first, then what the app recognizes by itself (XTB, own transfers, ATM, product returns, bank fees), then
 * a chain of the dictionary and a keyword of the name or the title (1.2.1, D75); the bank's category is only a hint,
 * never applied by itself (D68).
 */
import { fold } from '../fold'
import { cleanBankName, counterpartyKey } from './names'
import { resolveBrand, type BrandAliases } from './aliases'
import { brandById, brandOf, keywordIn, keywordMatcher, keywordMatches, tokens, withoutProcessor, words, type BrandMatch, type CategoryPlace } from './brands'
import type { Category, HouseholdMember, ImportRule } from '../schema/budget'
import type { Container, Loan, Share } from '../schema/records'
import { CASH_CATEGORY_ID, defaultCategoryId, HOUSE_MEMBER_ID, inflowOf } from '../schema/budget'
import { TX_KINDS, type TxKind } from '../schema/records'
import type { CategoryIndex } from '../calc/operations'
import { memberOf } from '../calc/household'
import type { MbankRow } from './mbank'

export { counterpartyKey }

export type Direction = 'in' | 'out'
export const directionOf = (row: Pick<MbankRow, 'amount'>): Direction => (row.amount < 0 ? 'out' : 'in')

/** What a decision remembered as a rule says (`upsertRule`). */
export type LearnedRule = Pick<ImportRule, 'match' | 'direction' | 'label' | 'kind' | 'categoryId' | 'refundable' | 'household' | 'memberId' | 'gift' | 'share' | 'counterAccountId'>

/**
 * A decision remembered as a rule (the import's „zapamiętaj”, „Zapamiętaj” in Operacje): the exact rule of that key and
 * direction changes (its id, `learned` and hits carried on), else a new one comes.
 */
export function upsertRule(rules: readonly ImportRule[], r: LearnedRule, opts: { now: string; makeId: () => string; hits: number }): ImportRule[] {
  return upsertRules(rules, [{ rule: r, hits: opts.hits }], opts)
}

/**
 * Decisions remembered at once, each as `upsertRule` would one after another – in one copy of the list, the exact rules
 * found by their key (W35: an import teaching hundreds of brands among thousands of rules).
 */
export function upsertRules(rules: readonly ImportRule[], items: ReadonlyArray<{ rule: LearnedRule; hits: number }>, opts: { now: string; makeId: () => string }): ImportRule[] {
  const out = [...rules]
  // The first exact rule of each key and direction, as a search from the start finds it.
  const at = new Map<string, number>()
  out.forEach((x, i) => {
    const k = `${x.direction}|${x.match}`
    if (x.mode === 'exact' && !at.has(k)) at.set(k, i)
  })
  for (const { rule: r, hits } of items) {
    const k = `${r.direction}|${r.match}`
    const i = at.get(k)
    const prev = i == null ? undefined : out[i]
    const rule: ImportRule = {
      ...prev,
      ...r,
      // The decision is the new one whole: one remembered without a gift or a share has none (a rule's old split never stays).
      gift: r.gift || undefined,
      share: r.share ?? undefined,
      id: prev?.id ?? opts.makeId(),
      mode: 'exact',
      learned: prev?.learned ?? true,
      hits: (prev?.hits ?? 0) + hits,
      updatedAt: opts.now
    }
    if (i == null) {
      at.set(k, out.length)
      out.push(rule)
    } else out[i] = rule
  }
  return out
}

/**
 * What a rule is looked up by: the brand key (with the user's merges – 1.2.2), the brand key as the name gives it, the
 * key of the whole name (rules before 1.2.1), the words of name and title.
 */
export interface RuleTarget {
  brand: string
  raw: string
  /** The keys of the name as the bank wrote it (with a date of the transaction…): rules learned before 1.2.3. */
  legacy?: readonly string[]
  key: string
  name: readonly string[]
  title: readonly string[]
}

/**
 * The rule for a row: an exact rule of the brand key, then of the brand the name was merged from (1.2.2), then of the
 * whole name's key (learned before 1.2.1), then the longest „contains” fragment, then the longest keyword of the user
 * (in the name or the title); a rule of the other direction does not count.
 */
export function findRule(rules: readonly ImportRule[], t: RuleTarget, direction: Direction, amount?: number): ImportRule | null {
  const usable = ruleIndexOf(rules, direction)
  const keys = new Set([t.brand, t.raw, ...(t.legacy ?? []), t.key].filter(Boolean))
  // A rule of the brand up to an amount (F22): the tightest one the amount fits, before the brand's plain rule.
  if (amount != null) {
    let best: ImportRule | null = null
    for (const r of usable.amount) if (keys.has(r.match) && Math.abs(amount) <= r.maxAmount! && (!best || r.maxAmount! < best.maxAmount!)) best = r
    if (best) return best
  }
  for (const k of keys) {
    const hits = usable.exact.get(k)
    if (hits) return hits.find((r) => r.direction === direction) ?? hits[0]!
  }
  let best: ImportRule | null = null
  for (const r of usable.contains) if ((t.key.includes(r.match) || t.brand.includes(r.match) || t.raw.includes(r.match)) && (!best || r.match.length > best.match.length)) best = r
  if (best) return best
  for (const k of usable.keyword) {
    const matches = (k.matches ??= keywordMatcher(k.rule.match))
    if ((matches(t.name) || matches(t.title)) && (!best || k.rule.match.length > best.match.length)) best = k.rule
  }
  return best
}

/**
 * The rules of one direction by how they are looked up, in their order (W20: one pass over the rules per list). A
 * keyword's pattern made at its first use – only when no exact or „contains” rule decides.
 */
interface RuleIndex {
  exact: Map<string, ImportRule[]>
  amount: ImportRule[]
  contains: ImportRule[]
  keyword: Array<{ rule: ImportRule; matches?: (ws: readonly string[]) => boolean }>
}

const ruleIndexes = new WeakMap<readonly ImportRule[], Partial<Record<Direction, RuleIndex>>>()

/** One direction at a time: a list made for one question (`keywordProposals`) builds only what it asks. */
function ruleIndexOf(rules: readonly ImportRule[], direction: Direction): RuleIndex {
  let byDirection = ruleIndexes.get(rules)
  if (!byDirection) ruleIndexes.set(rules, (byDirection = {}))
  let out = byDirection[direction]
  if (out) return out
  out = { exact: new Map(), amount: [], contains: [], keyword: [] }
  for (const r of rules) {
    if (!(r.direction == null || r.direction === direction) || !(TX_KINDS as readonly string[]).includes(r.kind)) continue
    if (r.mode === 'exact') {
      if (!r.match) continue
      const list = out.exact.get(r.match)
      if (list) list.push(r)
      else out.exact.set(r.match, [r])
    } else if (r.mode === 'amount') {
      if (r.maxAmount) out.amount.push(r)
    } else if (r.mode === 'contains') {
      if (r.match) out.contains.push(r)
    } else if (r.mode === 'keyword' && r.match) out.keyword.push({ rule: r })
  }
  byDirection[direction] = out
  return out
}

/** An ATM withdrawal (by the type of operation). */
const ATM = /WYPŁATA (W|Z) BANKOMA|WYPLATA (W|Z) BANKOMA|WYPŁATA GOTÓWKI|WYPLATA GOTOWKI|BLIK WYPŁATA|BLIK WYPLATA/

/**
 * What the rule of an operation is looked up and remembered by: an imported row, or an operation in Operacje. A person
 * paid or paying by phone (BLIK P2P) and an ATM in a shop („BANKOMAT ŻABKA”) are no chain of the dictionary; the
 * other side of a transfer is one only by the start of its name, with no city cut (often a person). A name the user
 * merged into another (1.2.2) is that one – a chain's, when merged into a chain.
 */
/** A bank's fee, interest or tax (no shop, no person – `opKindOf` 'fee'). */
export const isFeeOperation = (operation: string): boolean => /^(PROWIZJA|OPŁATA|OPLATA|ODSETKI|PODATEK)/.test(operation)

export function ruleTargetOf(o: { counterparty: string; title: string; operation?: string; bankName?: string }, aliases: BrandAliases = NO_ALIASES): { target: RuleTarget; brand: BrandMatch } {
  // Once per name, title and type of operation with these merged names (W20): a history repeats them thousands of
  // times. Read only – shared by the rows.
  let memo = targetMemo.get(aliases)
  if (!memo) targetMemo.set(aliases, (memo = new Map()))
  const id = `${o.counterparty}\u0000${o.title}\u0000${o.operation ?? ''}\u0000${o.bankName ?? '\u0001'}`
  let found = memo.get(id)
  if (!found) {
    if (memo.size >= TARGET_MEMO_MAX) memo.clear()
    memo.set(id, (found = targetOf(o, aliases)))
  }
  return found
}

const NO_ALIASES: BrandAliases = {}
const TARGET_MEMO_MAX = 50_000
const targetMemo = new WeakMap<BrandAliases, Map<string, { target: RuleTarget; brand: BrandMatch }>>()

function targetOf(o: { counterparty: string; title: string; operation?: string; bankName?: string }, aliases: BrandAliases): { target: RuleTarget; brand: BrandMatch } {
  const op = o.operation ?? ''
  const name = o.counterparty || op
  const opts = { dictionary: !/^BLIK P2P/.test(op) && !ATM.test(op), transfer: /^(PRZELEW|ZLECENIE|POLECENIE|WPŁATA|WPLATA|UZNANIE|PRZEKAZ|OBCIĄŻENIE|OBCIAZENIE)/.test(op) }
  const found = brandOf(name, opts)
  const key = resolveBrand(aliases, found.key)
  const brand = key === found.key ? found : { key, brand: brandById(key), words: found.words }
  // The name as versions before 1.2.3 read it – an import's row says it ('' = the type of operation named it), an
  // operation saved before still has it: their rules' keys (a chain's is the chain's either way).
  const shop = !opts.transfer && opts.dictionary
  // A bank's fee without a name tells of another operation in its title („PROWIZJA ZA ZAKUP” – the shop of the
  // purchase): no keyword of the title decides it (1.2.3).
  const fee = !o.counterparty && isFeeOperation(op)
  const before = o.bankName !== undefined ? o.bankName || op : name
  const legacy =
    before !== name || cleanBankName(before, { town: shop }) !== before
      ? [...(found.brand && before === name ? [] : [brandOf(before, { ...opts, raw: true }).key]), counterpartyKey(before, true)]
      : undefined
  return {
    brand,
    target: { brand: key, raw: found.key, ...(legacy ? { legacy } : {}), key: counterpartyKey(name), name: words(cleanBankName(o.counterparty, { town: shop })), title: fee ? [] : words(o.title) }
  }
}

/** The rule for one key (exact, then „contains”) – `findRule` without the brand and the words. */
export const matchRule = (rules: readonly ImportRule[], key: string, direction: Direction): ImportRule | null => findRule(rules, { brand: key, raw: key, key, name: [], title: [] }, direction)

/** The bank's category → the starting category closest to it: a hint shown to the user, not applied by itself (D68). */
const MBANK_HINTS: Record<string, [number, number]> = {
  'zywnosc i chemia domowa': [1, 1],
  'jedzenie poza domem': [1, 2],
  alkohol: [1, 0],
  'wyjscia i wydarzenia': [6, 1],
  'podroze i wyjazdy': [6, 3],
  'rozrywka - inne': [6, 0],
  'zajecia dodatkowe': [6, 2],
  'sport i hobby': [6, 2],
  'multimedia, ksiazki i prasa': [6, 2],
  przejazdy: [3, 5],
  paliwo: [3, 1],
  'serwis i czesci': [3, 2],
  'ubezpieczenie auta': [3, 3],
  'parking i oplaty': [3, 4],
  'auto i transport - inne': [3, 0],
  zwierzeta: [4, 0],
  'zdrowie i uroda': [5, 0],
  'czynsz i wynajem': [2, 1],
  prad: [2, 2],
  gaz: [2, 2],
  ogrzewanie: [2, 2],
  'woda i kanalizacja': [2, 2],
  'remont i ogrod': [2, 3],
  'akcesoria i wyposazenie': [2, 3],
  elektronika: [2, 3],
  'tv, internet, telefon': [7, 0],
  'odziez i obuwie': [8, 1],
  'osobiste - inne': [8, 0],
  'prezenty i wsparcie': [9, 1],
  edukacja: [9, 2],
  'oplaty i odsetki': [9, 2]
}

/** The category the bank's category hints at – only an existing, not archived one (the user may have changed them). */
export function hintFor(bankCategory: string, categories: CategoryIndex): string | null {
  let memo = hintMemo.get(categories)
  if (!memo) hintMemo.set(categories, (memo = new Map()))
  if (memo.has(bankCategory)) return memo.get(bankCategory)!
  const hint = hintOf(bankCategory, categories)
  memo.set(bankCategory, hint)
  return hint
}

/** The bank's categories are few (W20): each one's hint once per category tree. */
const hintMemo = new WeakMap<CategoryIndex, Map<string, string | null>>()

function hintOf(bankCategory: string, categories: CategoryIndex): string | null {
  const key = fold(bankCategory.trim())
  if (key === 'wyplata gotowki') return usable(CASH_CATEGORY_ID, categories)
  const at = Object.hasOwn(MBANK_HINTS, key) ? MBANK_HINTS[key] : undefined
  return at ? usable(defaultCategoryId(at[0], at[1]), categories) : null
}

function usable(id: string, categories: CategoryIndex): string | null {
  const c: Category | undefined = categories.byId.get(id)
  return c && !c.archived ? id : null
}

/** A place of the starting tree → the category, while it exists and is not archived. */
const placed = (at: CategoryPlace, categories: CategoryIndex) => usable(defaultCategoryId(at[0], at[1]), categories)

export type DecisionSource = 'rule' | 'builtin' | 'brand' | 'keyword' | 'none'

export interface ImportDecision {
  kind: TxKind
  categoryId: string | null
  /** Financed by a household member (D80): not a cost of mine. */
  refundable: boolean
  /** Money from a household member: it repays what they owe first (D20, D80). */
  household: boolean
  /** The household member who finances (`refundable`) or whose money it is (`household`); null = the first one. */
  memberId: string | null
  /** A household member's money: what they do not owe is their advance (else income – D80 b). */
  advance: boolean
  /** A purchase the member gives (D83, with `refundable`): nobody owes it. */
  gift: boolean
  /** A purchase financed by several people (D83): the row's amount split so. */
  share: Share | null
  counterAccountId: string | null
  /** The loan of the Radar an operation of kind 'loan' belongs to (B34): its repayment, its money. */
  loanId: string | null
  /** A payment of a container of the cargo (its counterparty): the cargo's, not an envelope's spending. */
  containerId: string | null
  /**
   * Where the decision came from: a rule of the user, the app's own recognition (XTB, own transfer, ATM…), a chain of
   * the dictionary, a keyword of the name or the title, or nothing yet (the user decides).
   */
  source: DecisionSource
  ruleId: string | null
  /**
   * The decision comes from a keyword of the transfer's title, not of the name („KOLACJA” to a friend): it is about
   * that payment – no rule for the counterparty is learned from it, it would hide the next titles.
   */
  byTitle: boolean
  /** Why, in a few words, for the preview. */
  reason: string
}

export interface ClassifyContext {
  rules: readonly ImportRule[]
  /** The account holder's names: the file's `#Klient` and the ones in the settings. */
  ownNames: readonly string[]
  categories: CategoryIndex
  /** The cargo's containers: a payment to one of their counterparties belongs to it. */
  containers?: ReadonlyArray<Pick<Container, 'id' | 'name' | 'counterparty' | 'categoryId' | 'archived'>>
  /** Names the user merged (1.2.2): grouped and ruled as one. */
  aliases?: BrandAliases
  /** The household (D80): their transfers are their money, by their names in the bank. */
  members?: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name' | 'bankNames' | 'inflow' | 'archived'>>
  /** The loans of the Radar (B34): money back from the person a loan was given to is its repayment. */
  loans?: ReadonlyArray<Pick<Loan, 'id' | 'name' | 'direction' | 'counterparty' | 'date' | 'closedAt'>>
  /** The bank's account numbers of the budget's accounts (`settings.import.accountNumbers`, F4). */
  accountNumbers?: Readonly<Record<string, string>>
  /** Operations a newer version wrote – read only here (B95): the plan never joins a row with them nor settles them. */
  locked?: ReadonlySet<string>
}

/**
 * Kinds decided operation by operation (N14, T98): a loan, the tax, XTB – never learned as a rule; a rule of them from
 * before 1.5.1 is only proposed (the user checks it each time).
 */
export const PER_OPERATION_KINDS: readonly string[] = ['loan', 'tax', 'trading']

/** All words of a person's name in the bank's counterparty – a name of one word only when it is the whole counterparty. */
function nameIn(name: string, counterparty: string): boolean {
  const parts = fold(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
  if (!parts.length) return false
  const who = fold(counterparty).split(/[^a-z0-9]+/).filter(Boolean)
  return parts.length === 1 ? who.length === 1 && who[0] === parts[0] : parts.every((w) => who.includes(w))
}

/** The open loan given to the person a transfer comes from (B34): the oldest when there are more. */
export function loanOf(counterparty: string, loans: ClassifyContext['loans']): NonNullable<ClassifyContext['loans']>[number] | null {
  const open = (loans ?? []).filter((l) => l.direction === 'given' && !l.closedAt && nameIn(l.counterparty || l.name, counterparty))
  return open.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0] ?? null
}

const XTB = /\bxtb\b|x-trade brokers/i
/** A payment operator alone as the counterparty (its shop in the title). */
const PROCESSOR_ONLY = /^(payu|paypro|paypal|przelewy24|p24|dotpay|tpay|blue ?media|sumup|stripe)\b/i

/**
 * XTB (T37, B106): by the counterparty – a processor's prefix aside („PAYU*XTB”); by the description only without a
 * counterparty of its own (none, or a payment operator). An own transfer „na portfel XTB” or a member's „zwrot za kurs
 * XTB” names another side – and is decided before it anyway.
 */
function isXtb(row: MbankRow): boolean {
  const who = withoutProcessor(row.counterparty)
  return who && !PROCESSOR_ONLY.test(who) ? XTB.test(who) : XTB.test(row.description)
}

/** All words of one of the holder's names in the counterparty („JAN KAPITAN” in „KAPITAN JAN”). */
export function isOwnName(counterparty: string, ownNames: readonly string[]): boolean {
  const who = fold(counterparty).split(/[^a-z0-9]+/).filter(Boolean)
  return ownNames.some((name) => {
    const parts = fold(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
    return parts.length >= 2 && parts.every((w) => who.includes(w))
  })
}

export { memberOf } from '../calc/household'

/** Does the bank say an own transfer (its kind, or a transfer to / from one of the holder's names)? */
export const isOwnTransferRow = (row: Pick<MbankRow, 'operation' | 'counterparty'>, ownNames: readonly string[]): boolean =>
  /^PRZELEW WŁASNY|^PRZELEW WLASNY/.test(row.operation) || (/^(PRZELEW|BLIK P2P|ZLECENIE)/.test(row.operation) && isOwnName(row.counterparty, ownNames))

const decision = (kind: TxKind, reason: string, over: Partial<ImportDecision> = {}): ImportDecision => ({
  kind,
  categoryId: null,
  refundable: false,
  household: false,
  memberId: null,
  advance: false,
  gift: false,
  share: null,
  counterAccountId: null,
  loanId: null,
  containerId: null,
  source: 'builtin',
  ruleId: null,
  byTitle: false,
  reason,
  ...over
})

export interface Classified {
  decision: ImportDecision
  /** The bank's category as one of ours: a hint only (D68). */
  hint: string | null
  /** The key of the whole name (`counterpartyKey`). */
  key: string
  /** The brand: the group of the import and the key a decision is remembered by (1.2.1). */
  brand: BrandMatch
  /** What its rule is looked up by (the keyword a decision proposes is tried on it – 1.2.2). */
  target: RuleTarget
  direction: Direction
}

/** The decision for one row and the bank's category as a hint. */
export function classifyRow(row: MbankRow, ctx: ClassifyContext): Classified {
  const out = decideRow(row, ctx)
  if (out.decision.kind !== 'expense' || out.direction !== 'out') return out
  // A payment of a container of the cargo (the same payee – the counterparty, else the title – as `plan.ts` names it):
  // paid from the cargo (a periodic fee from its tank).
  const payee = counterpartyKey(row.counterparty || row.title)
  const c = payee && ctx.containers?.length ? payeesOf(ctx.containers).get(payee) : undefined
  if (!c) return out
  const d = out.decision
  const known = d.source === 'rule' || d.source === 'builtin'
  return {
    ...out,
    decision: {
      ...d,
      containerId: c.id,
      categoryId: known ? d.categoryId ?? usable(c.categoryId ?? '', ctx.categories) : usable(c.categoryId ?? '', ctx.categories) ?? d.categoryId,
      source: known ? d.source : 'builtin',
      reason: known ? d.reason : `opłata z ładowni: ${c.name}`
    }
  }
}

type PayeeContainer = NonNullable<ClassifyContext['containers']>[number]
const payees = new WeakMap<NonNullable<ClassifyContext['containers']>, Map<string, PayeeContainer>>()

/** The containers not archived by their payee's key – the first of a key (W20: once per list, not per row). */
function payeesOf(containers: NonNullable<ClassifyContext['containers']>): Map<string, PayeeContainer> {
  let map = payees.get(containers)
  if (!map) {
    map = new Map()
    for (const x of containers) {
      if (x.archived) continue
      const k = counterpartyKey(x.counterparty)
      if (!map.has(k)) map.set(k, x)
    }
    payees.set(containers, map)
  }
  return map
}

function decideRow(row: MbankRow, ctx: ClassifyContext): Classified {
  const { brand, target } = ruleTargetOf(row, ctx.aliases)
  const key = target.key
  const direction = directionOf(row)
  const hint = hintFor(row.category, ctx.categories)
  const op = row.operation
  const out = (d: ImportDecision): Classified => ({ key, brand, target, direction, hint, decision: d })
  // A household member's money (D80): by their names in the bank.
  const transferIn = direction === 'in' && /^(PRZELEW|BLIK P2P|WPŁATA|WPLATA|UZNANIE|ZLECENIE)/.test(op)
  const member = transferIn ? memberOf(row.counterparty, ctx.members) : null
  // Money back from the person a loan of the Radar was given to (B34): its repayment.
  const loan = transferIn ? loanOf(row.counterparty, ctx.loans) : null
  const rule = findRule(ctx.rules, target, direction, row.amount)
  // A rule of plain income naming no member (learned before the person became a member, or before 1.3.0) gives way to
  // the member: their money repays what they owe first.
  if (rule && !(member && rule.kind === 'income' && !rule.memberId)) {
    const kind = rule.kind as TxKind
    const byTitle = rule.mode === 'keyword' && !keywordMatches(target.name, rule.match)
    // A loan, the tax, XTB from a rule of before 1.5.1 (N14): proposed only – the user checks it for each operation.
    if (PER_OPERATION_KINDS.includes(kind))
      return out(
        decision(kind, 'Twoja reguła – pożyczkę, podatek i XTB sprawdź przy każdej operacji', {
          ruleId: rule.id,
          byTitle,
          loanId: kind === 'loan' ? (loan?.id ?? null) : null
        })
      )
    // A member's purchase (D80) – its product return is theirs too (B40); a shared purchase (D83) is split the same way.
    const refundable = kind === 'expense' && rule.refundable
    const household = kind === 'income' && rule.household
    const memberId = refundable || household ? rule.memberId : null
    // A rule's category archived since (N86): the rule's decision without it – for the user to choose a new one (their
    // choice remembered changes the rule).
    const categoryId = kind === 'expense' && rule.categoryId ? usable(rule.categoryId, ctx.categories) : null
    const archived = kind === 'expense' && !!rule.categoryId && !categoryId
    return out(
      decision(kind, archived ? 'kategoria reguły zarchiwizowana – wybierz nową' : rule.mode === 'keyword' ? `Twoje słowo „${rule.label || rule.match}”${byTitle ? ' w tytule' : ''}` : 'reguła', {
        source: archived ? 'none' : 'rule',
        ruleId: rule.id,
        byTitle,
        categoryId,
        refundable,
        household,
        memberId,
        gift: refundable && !!rule.gift,
        share: kind === 'expense' && !refundable ? (rule.share ?? null) : null,
        // What the member's money beyond their debt is, as the member's setting says (D80 b; „ask” = income, D20).
        advance: household && inflowOf(ctx.members?.find((m) => m.id === (memberId ?? HOUSE_MEMBER_ID))) === 'advance',
        counterAccountId: kind === 'transfer' ? rule.counterAccountId : null
      })
    )
  }
  if (loan) return out(decision('loan', `zwrot pożyczki: ${loan.name}`, { loanId: loan.id }))
  // An own transfer and a member's money before XTB (B106): their title may name it („na portfel XTB”).
  if (isOwnTransferRow(row, ctx.ownNames)) {
    const descDigits = row.description.replace(/\D/g, '')
    const counterAccountId =
      ctx.accountNumbers && descDigits.length >= 10
        ? (Object.entries(ctx.accountNumbers).find(([, n]) => n && n.length >= 10 && descDigits.includes(n))?.[0] ?? null)
        : null
    return out(decision('transfer', 'przelew własny', counterAccountId ? { counterAccountId } : {}))
  }
  // A member's money: asked once what the rest beyond their debt is (D80 b).
  if (member) {
    const inflow = inflowOf(member)
    return out(
      decision('income', inflow === 'ask' ? `od domownika: ${member.name} – reszta ponad należność: zaliczka czy przychód?` : `od domownika: ${member.name}`, {
        household: true,
        memberId: member.id,
        advance: inflow === 'advance',
        source: inflow === 'ask' ? 'none' : 'builtin'
      })
    )
  }
  if (isXtb(row)) return out(decision('trading', direction === 'out' ? 'dopłata do konta tradingowego XTB' : 'wypłata z konta tradingowego XTB'))
  if (ATM.test(op))
    return out(decision('expense', 'wypłata z bankomatu → Gotówka', { categoryId: usable(CASH_CATEGORY_ID, ctx.categories) }))
  if (/^(POS )?ZWROT/.test(op) && direction === 'in') {
    // A product return: a negative expense of the purchase's category (spec) – the purchases' rule says which, else the
    // chain's category.
    const bought = findRule(ctx.rules, target, 'out', row.amount)
    if (bought) {
      // Of a purchase a member finances – their money (B40); of a shared one – split as the purchase (D83).
      const expense = bought.kind === 'expense'
      const refundable = expense && bought.refundable
      // The purchase's category archived since (N86): the return waits for the user's category too.
      const categoryId = expense && bought.categoryId ? usable(bought.categoryId, ctx.categories) : null
      const archived = expense && !!bought.categoryId && !categoryId
      return out(
        decision('expense', archived ? 'zwrot towaru – kategoria reguły zarchiwizowana, wybierz nową' : 'zwrot towaru', {
          categoryId,
          refundable,
          memberId: refundable ? bought.memberId : null,
          gift: refundable && !!bought.gift,
          share: expense && !refundable ? (bought.share ?? null) : null,
          source: archived ? 'none' : 'rule',
          ruleId: bought.id
        })
      )
    }
    const chain = brand.brand?.category ? placed(brand.brand.category, ctx.categories) : null
    if (chain) return out(decision('expense', `zwrot towaru – sieć ${brand.brand!.label}`, { categoryId: chain, source: 'brand' }))
    return out(decision('expense', 'zwrot towaru'))
  }
  if (/^(PROWIZJA|OPŁATA|OPLATA|ODSETKI|PODATEK OD ODSETEK)/.test(op) && direction === 'out') return out(decision('expense', 'opłata banku', { source: 'none' }))
  if (direction === 'in') return out(decision('income', /^(PRZELEW|BLIK P2P|WPŁATA|WPLATA|UZNANIE)/.test(op) ? 'wpływ – przychód, zwrot od domownika albo przelew własny?' : 'wpływ', { source: 'none' }))
  // Money out: a chain of the dictionary, then a keyword of the name or the title.
  const chain = brand.brand?.category ? placed(brand.brand.category, ctx.categories) : null
  if (chain) return out(decision('expense', `sieć ${brand.brand!.label}`, { categoryId: chain, source: 'brand' }))
  const inName = keywordIn(target.name)
  const kw = inName ?? keywordIn(target.title)
  const byWord = kw ? placed(kw.keyword.category, ctx.categories) : null
  if (kw && byWord) {
    const found = tokens(inName ? row.counterparty : row.title)
      .slice(kw.at, kw.at + kw.length)
      .map((t) => t.text)
      .join(' ')
    return out(decision('expense', `słowo „${found}”${inName ? '' : ' w tytule'}`, { categoryId: byWord, source: 'keyword', byTitle: !inName }))
  }
  return out(decision('expense', /^(PRZELEW|BLIK P2P|ZLECENIE|POLECENIE)/.test(op) ? 'przelew wychodzący – wydatek, za domownika albo przelew własny?' : 'zakup', { source: 'none' }))
}
