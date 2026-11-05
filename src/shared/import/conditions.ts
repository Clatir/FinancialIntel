/**
 * Rules of conditions (1.16.0, AP-45, T467): a rule written in the settings with several conditions – the name contains,
 * the title has the words, the amount from–to, the account – joined by „wszystkie (I)” or „którykolwiek (LUB)”; the
 * direction is the rule's `direction` as ever, always with them („wpływy LUB …” would catch every inflow). A rule of one match of before (a brand, a fragment, a word, a brand up to an amount) is one condition and is
 * read as ever (`findRule`); a rule of conditions is the mode 'conditions' – a version before 1.16.0 applies none of it.
 *
 * Where they stand among the others (`findRule`): „wszystkie” of two and more conditions before every rule of one match
 * (it is narrower – as a brand up to an amount before the brand), the more conditions the earlier; one condition or
 * „którykolwiek” after them (it is as broad as one match, or broader); within each – the order of the list.
 */
import { fold } from '../fold'
import { keywordMatcher, normalizeKeyword, words } from './brands'
import { cleanBankName, counterpartyKey } from './names'
import { combineOf, conditionsOf, MAX_RULE_CONDITIONS, readableRuleFields, type ImportRule, type RuleCondition } from '../schema/budget'

/** What a rule's condition is tried on – a row of the bank, an operation, an entry typed by hand. */
export interface RuleSubject {
  /** The keys of the name (`RuleTarget`: the brand, the brand as the name gives it, the whole name's key). */
  brand: string
  raw: string
  key: string
  /** The title's folded words (`RuleTarget.title`). */
  title: readonly string[]
}

export interface RuleFacts {
  direction: 'in' | 'out'
  /** The amount (grosze, with or without the sign); absent = unknown – a condition of the amount does not hold. */
  amount?: number | null
  /** The operation's account; absent = unknown – a condition of the account does not hold. */
  accountId?: string | null
}

type Test = (s: RuleSubject, f: RuleFacts) => boolean

/** A rule of conditions made ready once per list of rules (`findRule` keeps it with the list). */
export interface CompiledRule {
  rule: ImportRule
  all: boolean
  tests: readonly Test[]
  /** The conditions of the title: a rule decided by them is about that payment (`byTitle` – as a keyword of the title). */
  titleTests: readonly Test[]
}

function parseRegexValue(value: string | undefined): RegExp | null {
  if (!value) return null
  const m = /^\/(.+)\/([gimsuy]*)$/.exec(value.trim())
  if (!m?.[1]) return null
  try {
    const flags = m[2]?.includes('i') ? m[2] : `${m[2] ?? ''}i`
    return new RegExp(m[1], flags)
  } catch {
    return null
  }
}

/**
 * Build a regex pattern `/.../i` from a row's title or counterparty (T508): folded words with numbers generalized to
 * `\d+` so a monthly invoice/transfer („Faktura 11/2026 Netia” → `/faktura\s+\d+\s+\d+\s+netia/i`) matches every month.
 */
export function regexFromRow(text: string): string {
  const tokens = fold(cleanBankName(text, { town: false }))
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  if (!tokens.length) return ''
  const parts = tokens.map((t) => (/^\d+$/.test(t) ? '\\d+' : t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  return `/${parts.join('\\s+')}/i`
}

/** Initial conditions prefilled when opening `ConditionsEditor` from an import row (T508). */
export function conditionsFromRow(
  row: { counterparty?: string; title?: string; amount?: number; accountId?: string | null },
  opts: { regex?: boolean } = {}
): RuleCondition[] {
  const out: RuleCondition[] = []
  const cp = (row.counterparty ?? '').trim()
  const title = (row.title ?? '').trim()
  if (cp) {
    const val = opts.regex ? regexFromRow(cp) : cleanBankName(cp, { town: false }).trim() || cp
    if (val) out.push({ field: 'counterparty', value: val.slice(0, 200) })
  }
  if (title) {
    const val = opts.regex ? regexFromRow(title) : words(title).slice(0, 4).join(' ')
    if (val) out.push({ field: 'title', value: val.slice(0, 200) })
  }
  if (!out.length && row.amount != null && row.amount !== 0) {
    const a = Math.abs(row.amount)
    out.push({ field: 'amount', min: a, max: a })
  }
  return out.length ? out : [{ field: 'counterparty', value: '' }]
}

/** The test of one condition, null = a condition this version cannot read (a newer one's, a broken one). */
function testOf(c: RuleCondition): { test: Test; title: boolean } | null {
  switch (c.field) {
    case 'counterparty': {
      const rx = parseRegexValue(c.value)
      if (rx) return { test: (s) => rx.test(s.key) || rx.test(s.brand) || rx.test(s.raw), title: false }
      // As a rule „contains”: letters and digits of the name, without the marks and the legal forms.
      const k = counterpartyKey(c.value ?? '')
      return k ? { test: (s) => s.key.includes(k) || s.brand.includes(k) || s.raw.includes(k), title: false } : null
    }
    case 'title': {
      const rx = parseRegexValue(c.value)
      if (rx) return { test: (s) => rx.test(s.title.join(' ')), title: true }
      // As a keyword: whole folded words, the last one may go on („czynsz” = „czynszu”).
      const w = normalizeKeyword(c.value ?? '')
      if (!w.replace(/[^a-z0-9?]/g, '')) return null
      const matches = keywordMatcher(w)
      return { test: (s) => matches(s.title), title: true }
    }
    case 'amount': {
      const min = c.min ?? null
      const max = c.max ?? null
      if ((min == null && max == null) || (min != null && max != null && min > max)) return null
      return { test: (_s, f) => f.amount != null && Math.abs(f.amount) >= (min ?? 0) && (max == null || Math.abs(f.amount) <= max), title: false }
    }
    case 'account':
      return c.value ? { test: (_s, f) => !!f.accountId && f.accountId === c.value, title: false } : null
    default:
      return null
  }
}

/**
 * A rule of conditions ready to try, null = none to apply: another mode, no conditions, too many, a way of joining or a
 * condition this version does not know (a newer version's rule – never applied by half).
 */
export function compileRule(rule: ImportRule): CompiledRule | null {
  if (rule.mode !== 'conditions') return null
  // Only what this version reads (przegląd R1 9): conditions or a way of joining it cannot read are kept in the file – the
  // rule is not applied.
  const list = conditionsOf(rule) ?? []
  if (!list.length || list.length > MAX_RULE_CONDITIONS) return null
  const combine = combineOf(rule)
  if (!combine) return null
  const tests: Test[] = []
  const titleTests: Test[] = []
  for (const c of list) {
    const t = testOf(c)
    if (!t) return null
    tests.push(t.test)
    if (t.title) titleTests.push(t.test)
  }
  return { rule, all: combine === 'all', tests, titleTests }
}

/** Does the rule hold for a subject? */
export const holds = (c: CompiledRule, s: RuleSubject, f: RuleFacts): boolean => (c.all ? c.tests.every((t) => t(s, f)) : c.tests.some((t) => t(s, f)))

/** Before every rule of one match (`findRule`): „wszystkie” of two and more conditions. */
export const goesFirst = (c: CompiledRule): boolean => c.all && c.tests.length >= 2

/** Was the rule's decision about the payment's title (a condition of the title that holds)? */
export const byTitleOf = (c: CompiledRule, s: RuleSubject, f: RuleFacts): boolean => c.titleTests.some((t) => t(s, f))

const compiled = new WeakMap<ImportRule, CompiledRule | null>()
/** `compileRule` once per rule (a rule is never changed in place – a change is a new object). */
export function compiledOf(rule: ImportRule): CompiledRule | null {
  let c = compiled.get(rule)
  if (c === undefined) compiled.set(rule, (c = compileRule(rule)))
  return c
}

/**
 * A rule with anything this version cannot read (przegląd R1 2.3, T504): its conditions or a condition of a newer
 * version, its way of joining, its mode, its kind, its direction, or any decision/match field written by a newer
 * version (`readableRuleFields`). Kept in the file as it is, never applied – and never written by this version (the
 * editor, a change of its decision, „Zmień na spłatę”, „też ręczne” refuse): only deleted.
 */
export const unreadableRule = (rule: ImportRule): boolean =>
  (rule.mode === 'conditions' && !compiledOf(rule)) || !readableRuleFields(rule)
