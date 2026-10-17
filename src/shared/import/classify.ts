/**
 * What an imported row is for the budget (spec: „Import z mBanku”, steps 3–4): the rules learned from the user's
 * decisions first, then what the app recognizes by itself (XTB, own transfers, ATM, product returns, bank fees);
 * the bank's category is only a hint, never applied by itself (D68).
 */
import { fold } from '../fold'
import type { Category, ImportRule } from '../schema/budget'
import type { Container } from '../schema/records'
import { CASH_CATEGORY_ID, defaultCategoryId } from '../schema/budget'
import { TX_KINDS, type TxKind } from '../schema/records'
import type { CategoryIndex } from '../calc/operations'
import type { MbankRow } from './mbank'

/** Legal forms dropped from a counterparty's key („AUTOMATSPEC Sp. z o.o.” = „AUTOMATSPEC”). */
const LEGAL = [
  /\bsp(ó|o)?(ł|l)ka\s+z\s+o(granicz\w*)?\.?(\s*o(dpowiedzialno\w*)?\.?)?/g,
  /\bsp(ó|o)?(ł|l)ka\s+akcyjna\b/g,
  /\bsp(ó|o)?(ł|l)ka\s+(jawna|komandytowa|cywilna)\b/g,
  /\bsp\.?\s*z\s*o\.?\s*o\.?/g,
  /\bsp\.?\s*z\s*o\b/g,
  /\bsp\.?\s*(j|k|c)\b\.?/g,
  /\b(s\.?a|ltd|gmbh|inc|llc|co|kg|ag|bv|oy|ab|sas|sarl|plc|limited)\b\.?/g
]

/**
 * The key a counterparty is grouped and remembered by: lower case without marks, without legal forms, numbers of
 * shops and terminals, phone numbers and punctuation – „DINO TESTOWO 4”, „AUTOMAT SPEC” and „AUTOMATSPEC Sp. z o.o.”
 * become „dinotestowo” and „automatspec”.
 */
export function counterpartyKey(name: string): string {
  let s = fold(name)
  for (const re of LEGAL) s = s.replace(re, ' ')
  return s
    .split(/\s+/)
    .filter((tok) => !/^[\d\-+()./*]+$/.test(tok))
    .map((tok) => tok.replace(/\d{3,}$/, ''))
    .join('')
    .replace(/[^a-z0-9]/g, '')
}

export type Direction = 'in' | 'out'
export const directionOf = (row: Pick<MbankRow, 'amount'>): Direction => (row.amount < 0 ? 'out' : 'in')

/**
 * A decision remembered as a rule (the import's „zapamiętaj”, „Zapamiętaj” in Operacje): the exact rule of that key and
 * direction changes (its id, `learned` and hits carried on), else a new one comes.
 */
export function upsertRule(
  rules: readonly ImportRule[],
  r: Pick<ImportRule, 'match' | 'direction' | 'label' | 'kind' | 'categoryId' | 'refundable' | 'household' | 'counterAccountId'>,
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

/** The rule for a counterparty: exact keys first, then the longest „contains” fragment; a rule of the other direction does not count. */
export function matchRule(rules: readonly ImportRule[], key: string, direction: Direction): ImportRule | null {
  const usable = rules.filter((r) => (r.direction == null || r.direction === direction) && (TX_KINDS as readonly string[]).includes(r.kind))
  const exact = usable.filter((r) => r.mode === 'exact' && r.match === key)
  if (exact.length) return exact.find((r) => r.direction === direction) ?? exact[0]!
  let best: ImportRule | null = null
  for (const r of usable) if (r.mode === 'contains' && r.match && key.includes(r.match) && (!best || r.match.length > best.match.length)) best = r
  return best
}

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

export interface ImportDecision {
  kind: TxKind
  categoryId: string | null
  refundable: boolean
  /** Money from a household member: it repays the house receivable first (D20). */
  household: boolean
  counterAccountId: string | null
  /** A payment of a container of the cargo (its counterparty): the cargo's, not an envelope's spending. */
  containerId: string | null
  /** Where the decision came from: a rule, the app's own recognition, or nothing yet (the user decides). */
  source: 'rule' | 'builtin' | 'none'
  ruleId: string | null
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
}

const isXtb = (row: MbankRow) => /\bxtb\b|x-trade brokers/i.test(`${row.counterparty} ${row.description}`)

/** All words of one of the holder's names in the counterparty („JAN KAPITAN” in „KAPITAN JAN”). */
export function isOwnName(counterparty: string, ownNames: readonly string[]): boolean {
  const who = fold(counterparty).split(/[^a-z0-9]+/).filter(Boolean)
  return ownNames.some((name) => {
    const words = fold(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 2)
    return words.length >= 2 && words.every((w) => who.includes(w))
  })
}

const decision = (kind: TxKind, reason: string, over: Partial<ImportDecision> = {}): ImportDecision => ({
  kind,
  categoryId: null,
  refundable: false,
  household: false,
  counterAccountId: null,
  containerId: null,
  source: 'builtin',
  ruleId: null,
  reason,
  ...over
})

/** The decision for one row and the bank's category as a hint. */
export function classifyRow(row: MbankRow, ctx: ClassifyContext): { decision: ImportDecision; hint: string | null; key: string; direction: Direction } {
  const out = decideRow(row, ctx)
  if (out.decision.kind !== 'expense' || out.direction !== 'out') return out
  // A payment of a container of the cargo (the same payee – the counterparty, else the title – as `plan.ts` names it):
  // paid from the cargo (a periodic fee from its tank).
  const payee = counterpartyKey(row.counterparty || row.title)
  const c = payee ? ctx.containers?.find((x) => !x.archived && counterpartyKey(x.counterparty) === payee) : undefined
  if (!c) return out
  const d = out.decision
  const known = d.source !== 'none'
  return {
    ...out,
    decision: {
      ...d,
      containerId: c.id,
      categoryId: d.categoryId ?? usable(c.categoryId ?? '', ctx.categories),
      source: known ? d.source : 'builtin',
      reason: known ? d.reason : `opłata z ładowni: ${c.name}`
    }
  }
}

function decideRow(row: MbankRow, ctx: ClassifyContext): { decision: ImportDecision; hint: string | null; key: string; direction: Direction } {
  const key = counterpartyKey(row.counterparty || row.operation)
  const direction = directionOf(row)
  const hint = hintFor(row.category, ctx.categories)
  const op = row.operation
  const rule = matchRule(ctx.rules, key, direction)
  if (rule) {
    const kind = rule.kind as TxKind
    return {
      key,
      direction,
      hint,
      decision: decision(kind, 'reguła', {
        source: 'rule',
        ruleId: rule.id,
        categoryId: kind === 'expense' ? rule.categoryId : null,
        refundable: kind === 'expense' && direction === 'out' && rule.refundable,
        household: kind === 'income' && rule.household,
        counterAccountId: kind === 'transfer' ? rule.counterAccountId : null
      })
    }
  }
  const out = (d: ImportDecision) => ({ key, direction, hint, decision: d })
  if (isXtb(row)) return out(decision('trading', direction === 'out' ? 'dopłata do konta tradingowego XTB' : 'wypłata z konta tradingowego XTB'))
  if (/^PRZELEW WŁASNY|^PRZELEW WLASNY/.test(op) || (/^(PRZELEW|BLIK P2P|ZLECENIE)/.test(op) && isOwnName(row.counterparty, ctx.ownNames)))
    return out(decision('transfer', 'przelew własny'))
  if (/WYPŁATA (W|Z) BANKOMA|WYPLATA (W|Z) BANKOMA|WYPŁATA GOTÓWKI|WYPLATA GOTOWKI|BLIK WYPŁATA|BLIK WYPLATA/.test(op))
    return out(decision('expense', 'wypłata z bankomatu → Gotówka', { categoryId: usable(CASH_CATEGORY_ID, ctx.categories) }))
  if (/^ZWROT/.test(op) && direction === 'in') {
    // A product return: a negative expense of the purchase's category (spec) – the purchases' rule says which.
    const bought = matchRule(ctx.rules, key, 'out')
    return out(decision('expense', 'zwrot towaru', { categoryId: bought?.kind === 'expense' ? bought.categoryId : null, source: bought ? 'rule' : 'builtin', ruleId: bought?.id ?? null }))
  }
  if (/^(PROWIZJA|OPŁATA|OPLATA|ODSETKI|PODATEK OD ODSETEK)/.test(op) && direction === 'out') return out(decision('expense', 'opłata banku', { source: 'none' }))
  if (direction === 'in') return out(decision('income', /^(PRZELEW|BLIK P2P|WPŁATA|WPLATA|UZNANIE)/.test(op) ? 'wpływ – przychód, zwrot od domownika albo przelew własny?' : 'wpływ', { source: 'none' }))
  return out(decision('expense', /^(PRZELEW|BLIK P2P|ZLECENIE|POLECENIE)/.test(op) ? 'przelew wychodzący – wydatek, do zwrotu albo przelew własny?' : 'zakup', { source: 'none' }))
}
