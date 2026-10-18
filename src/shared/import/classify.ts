/**
 * What an imported row is for the budget (spec: „Import z mBanku”, steps 3–4): the rules learned from the user's
 * decisions first, then what the app recognizes by itself (XTB, own transfers, ATM, product returns, bank fees), then
 * a chain of the dictionary and a keyword of the name or the title (1.2.1, D75); the bank's category is only a hint,
 * never applied by itself (D68).
 */
import { fold } from '../fold'
import { cleanBankName, counterpartyKey } from './names'
import { resolveBrand, type BrandAliases } from './aliases'
import { brandById, brandOf, keywordIn, keywordMatches, tokens, words, type BrandMatch, type CategoryPlace } from './brands'
import type { Category, HouseholdMember, ImportRule } from '../schema/budget'
import type { Container } from '../schema/records'
import { CASH_CATEGORY_ID, defaultCategoryId, HOUSE_MEMBER_ID, inflowOf } from '../schema/budget'
import { TX_KINDS, type TxKind } from '../schema/records'
import type { CategoryIndex } from '../calc/operations'
import type { MbankRow } from './mbank'

export { counterpartyKey }

export type Direction = 'in' | 'out'
export const directionOf = (row: Pick<MbankRow, 'amount'>): Direction => (row.amount < 0 ? 'out' : 'in')

/**
 * A decision remembered as a rule (the import's „zapamiętaj”, „Zapamiętaj” in Operacje): the exact rule of that key and
 * direction changes (its id, `learned` and hits carried on), else a new one comes.
 */
export function upsertRule(
  rules: readonly ImportRule[],
  r: Pick<ImportRule, 'match' | 'direction' | 'label' | 'kind' | 'categoryId' | 'refundable' | 'household' | 'memberId' | 'counterAccountId'>,
  opts: { now: string; makeId: () => string; hits: number }
): ImportRule[] {
  const out = [...rules]
  const at = out.findIndex((x) => x.mode === 'exact' && x.match === r.match && x.direction === r.direction)
  const prev = at >= 0 ? out[at] : undefined
  const rule: ImportRule = {
    ...prev,
    ...r,
    id: prev?.id ?? opts.makeId(),
    mode: 'exact',
    learned: prev?.learned ?? true,
    hits: (prev?.hits ?? 0) + opts.hits,
    updatedAt: opts.now
  }
  if (at >= 0) out[at] = rule
  else out.push(rule)
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
export function findRule(rules: readonly ImportRule[], t: RuleTarget, direction: Direction): ImportRule | null {
  const usable = rules.filter((r) => (r.direction == null || r.direction === direction) && (TX_KINDS as readonly string[]).includes(r.kind))
  const exact = (key: string) => {
    const hits = key ? usable.filter((r) => r.mode === 'exact' && r.match === key) : []
    return hits.find((r) => r.direction === direction) ?? hits[0] ?? null
  }
  const keys = new Set([t.brand, t.raw, ...(t.legacy ?? []), t.key].filter(Boolean))
  for (const k of keys) {
    const byKey = exact(k)
    if (byKey) return byKey
  }
  let best: ImportRule | null = null
  for (const r of usable)
    if (r.mode === 'contains' && r.match && (t.key.includes(r.match) || t.brand.includes(r.match) || t.raw.includes(r.match)) && (!best || r.match.length > best.match.length)) best = r
  if (best) return best
  for (const r of usable)
    if (r.mode === 'keyword' && r.match && (keywordMatches(t.name, r.match) || keywordMatches(t.title, r.match)) && (!best || r.match.length > best.match.length)) best = r
  return best
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

export function ruleTargetOf(o: { counterparty: string; title: string; operation?: string; bankName?: string }, aliases: BrandAliases = {}): { target: RuleTarget; brand: BrandMatch } {
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
  const key = fold(bankCategory.trim())
  if (key === 'wyplata gotowki') return usable(CASH_CATEGORY_ID, categories)
  const at = MBANK_HINTS[key]
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
  counterAccountId: string | null
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
}

const isXtb = (row: MbankRow) => /\bxtb\b|x-trade brokers/i.test(`${row.counterparty} ${row.description}`)

/** All words of one of the holder's names in the counterparty („JAN KAPITAN” in „KAPITAN JAN”). */
export function isOwnName(counterparty: string, ownNames: readonly string[]): boolean {
  const who = fold(counterparty).split(/[^a-z0-9]+/).filter(Boolean)
  return ownNames.some((name) => {
    const parts = fold(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
    return parts.length >= 2 && parts.every((w) => who.includes(w))
  })
}

/**
 * The household member a counterparty is (D80 a): all words of one of their bank names in it, in any order – a name of
 * one word only when it is the whole counterparty („MAMA”). Archived members too: their money is still theirs.
 */
export function memberOf<M extends Pick<HouseholdMember, 'bankNames'>>(counterparty: string, members: readonly M[] | undefined): M | null {
  const who = fold(counterparty).split(/[^a-z0-9]+/).filter(Boolean)
  if (!who.length) return null
  for (const m of members ?? [])
    for (const name of m.bankNames) {
      const parts = fold(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
      if (!parts.length) continue
      if (parts.length === 1 ? who.length === 1 && who[0] === parts[0] : parts.every((w) => who.includes(w))) return m
    }
  return null
}

const decision = (kind: TxKind, reason: string, over: Partial<ImportDecision> = {}): ImportDecision => ({
  kind,
  categoryId: null,
  refundable: false,
  household: false,
  memberId: null,
  advance: false,
  counterAccountId: null,
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
  const c = payee ? ctx.containers?.find((x) => !x.archived && counterpartyKey(x.counterparty) === payee) : undefined
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

function decideRow(row: MbankRow, ctx: ClassifyContext): Classified {
  const { brand, target } = ruleTargetOf(row, ctx.aliases)
  const key = target.key
  const nameTokens = tokens(row.counterparty)
  const titleTokens = tokens(row.title)
  const direction = directionOf(row)
  const hint = hintFor(row.category, ctx.categories)
  const op = row.operation
  const out = (d: ImportDecision): Classified => ({ key, brand, target, direction, hint, decision: d })
  // A household member's money (D80): by their names in the bank.
  const member = direction === 'in' && /^(PRZELEW|BLIK P2P|WPŁATA|WPLATA|UZNANIE|ZLECENIE)/.test(op) ? memberOf(row.counterparty, ctx.members) : null
  const rule = findRule(ctx.rules, target, direction)
  // A rule of plain income naming no member (learned before the person became a member, or before 1.3.0) gives way to
  // the member: their money repays what they owe first.
  if (rule && !(member && rule.kind === 'income' && !rule.memberId)) {
    const kind = rule.kind as TxKind
    const byTitle = rule.mode === 'keyword' && !keywordMatches(target.name, rule.match)
    const refundable = kind === 'expense' && direction === 'out' && rule.refundable
    const household = kind === 'income' && rule.household
    const memberId = refundable || household ? rule.memberId : null
    return out(
      decision(kind, rule.mode === 'keyword' ? `Twoje słowo „${rule.label || rule.match}”${byTitle ? ' w tytule' : ''}` : 'reguła', {
        source: 'rule',
        ruleId: rule.id,
        byTitle,
        categoryId: kind === 'expense' ? rule.categoryId : null,
        refundable,
        household,
        memberId,
        // What the member's money beyond their debt is, as the member's setting says (D80 b; „ask” = income, D20).
        advance: household && inflowOf(ctx.members?.find((m) => m.id === (memberId ?? HOUSE_MEMBER_ID))) === 'advance',
        counterAccountId: kind === 'transfer' ? rule.counterAccountId : null
      })
    )
  }
  if (isXtb(row)) return out(decision('trading', direction === 'out' ? 'dopłata do konta tradingowego XTB' : 'wypłata z konta tradingowego XTB'))
  if (/^PRZELEW WŁASNY|^PRZELEW WLASNY/.test(op) || (/^(PRZELEW|BLIK P2P|ZLECENIE)/.test(op) && isOwnName(row.counterparty, ctx.ownNames)))
    return out(decision('transfer', 'przelew własny'))
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
  if (ATM.test(op))
    return out(decision('expense', 'wypłata z bankomatu → Gotówka', { categoryId: usable(CASH_CATEGORY_ID, ctx.categories) }))
  if (/^(POS )?ZWROT/.test(op) && direction === 'in') {
    // A product return: a negative expense of the purchase's category (spec) – the purchases' rule says which, else the
    // chain's category.
    const bought = findRule(ctx.rules, target, 'out')
    if (bought) return out(decision('expense', 'zwrot towaru', { categoryId: bought.kind === 'expense' ? bought.categoryId : null, source: 'rule', ruleId: bought.id }))
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
    const found = (inName ? nameTokens : titleTokens)
      .slice(kw.at, kw.at + kw.length)
      .map((t) => t.text)
      .join(' ')
    return out(decision('expense', `słowo „${found}”${inName ? '' : ' w tytule'}`, { categoryId: byWord, source: 'keyword', byTitle: !inName }))
  }
  return out(decision('expense', /^(PRZELEW|BLIK P2P|ZLECENIE|POLECENIE)/.test(op) ? 'przelew wychodzący – wydatek, za domownika albo przelew własny?' : 'zakup', { source: 'none' }))
}
