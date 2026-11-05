import { withMerged, type BrandAliases, type BrandName } from '@shared/import/aliases'
import { isGenericWord, normalizeKeyword } from '@shared/import/brands'
import { findRule, ruleTargetOf, upsertRule, upsertRules, type LearnedRule } from '@shared/import/classify'
import { isDuplicatePairKey } from '@shared/import/duplicates'
import { cleanBankName, counterpartyKey } from '@shared/import/names'
import { compileRule } from '@shared/import/conditions'
import { newId } from '@shared/ids'
import {
  HOUSE_MEMBER_ID,
  importRuleSchema,
  inflowOf,
  MAX_RULE_CONDITIONS,
  TX_KIND_LABEL,
  type BrandAlias,
  type HouseholdMember,
  type ImportRule,
  type RuleCondition,
  type Share,
  type Transaction,
  type TxKind
} from '@shared/schema'
import { ruleDecisionOf, type Choice } from '@shared/import/reconcile'
import { sameContentAs } from '@shared/merge'
import { memberName } from '@shared/calc/household'
import { shareOf } from '@shared/calc/share'
import { membersNow } from '../household/actions'
import { shareNames } from '../household/ShareEditor'
import { READ_ONLY_MESSAGE, SWITCHING_MESSAGE, canWrite, replaceRecords, updateSettings, useData } from '../../store/data'
import { toast, undoKept } from '../../store/ui'
import { countLabel } from '../../lib/format'
import { plnText } from '../../components/fields'
import { advanceRuleKey } from '@shared/import/audit'
import { MEMBER_MONEY_TEXT } from './options'

const NO_ALIASES: BrandAliases = {}
/** The names the user merged (1.2.2): an operation's brand is looked up and remembered through them. */
const aliasesNow = (): BrandAliases => useData.getState().fi?.settings.import.aliases ?? NO_ALIASES
/**
 * What a rule of an operation is learned and looked up by: the bank's name of it, as the import reads its rows (N15 – a
 * name the user changed is not the bank's: a rule of it would never be found); an operation typed by hand – its own.
 */
const targetOf = (t: Transaction) =>
  ruleTargetOf({ counterparty: t.bank ? t.bank.counterparty : t.counterparty, title: t.title, operation: t.bank?.operation, bankName: t.bank?.bankName }, aliasesNow())

/** The name a rule of an operation is learned by (`targetOf`): the bank's, else the operation's own. */
export const bankNameOf = (t: Pick<Transaction, 'bank' | 'counterparty'>): string => (t.bank ? t.bank.counterparty || t.bank.operation || t.counterparty : t.counterparty)

/** The rule an operation from the bank would get now (its brand, its name, its words, its direction). */
export function ruleFor(t: Transaction): ImportRule | null {
  const rules = useData.getState().fi?.settings.import.rules ?? []
  const { target } = targetOf(t)
  return target.key ? findRule(rules, target, t.amount < 0 ? 'out' : 'in', t.amount) : null
}

/**
 * Who finances an expense, as its rule remembers it (D80, D83): a member (both directions – a product return of their
 * purchase is their money, B40), their gift, several people – or me.
 */
function financingOf(t: Transaction): Pick<ImportRule, 'refundable' | 'memberId' | 'gift' | 'share'> {
  const share = shareOf(t)
  if (share) return { refundable: false, memberId: null, share }
  return t.refundable ? { refundable: true, memberId: t.memberId, gift: t.gift || undefined } : { refundable: false, memberId: null }
}

/** Remember the category of an operation for its brand (a decision in Operacje teaches the import too). */
export function rememberCategory(t: Transaction, label: string): void {
  if (!canWrite()) return
  const { brand } = targetOf(t)
  if (!brand.key || t.kind !== 'expense') return
  const direction = t.amount < 0 ? 'out' : 'in'
  const rule = { match: brand.key, direction, label: brand.brand?.label ?? bankNameOf(t), kind: 'expense', categoryId: t.categoryId, ...financingOf(t), household: false, counterAccountId: null } as const
  updateSettings((f) => ({
    ...f,
    settings: { ...f.settings, import: { ...f.settings.import, rules: upsertRule(f.settings.import.rules, rule, { now: new Date().toISOString(), makeId: newId, hits: 1 }) } }
  }))
  toast(`Zapamiętano: „${bankNameOf(t)}” → ${label}. Kolejne importy skategoryzują go same.`, 'success', 4500)
}

/**
 * The category of operations remembered for their brands at once (D76: a bulk decision in Operacje teaches the
 * import too); returns how many rules. Money in = a product return of that brand.
 */
export function rememberBrands(ops: readonly Transaction[], categoryId: string): number {
  const rules = new Map<string, LearnedRule & { hits: number }>()
  for (const t of ops) {
    const { brand } = targetOf(t)
    if (!brand.key || t.kind !== 'expense') continue
    const direction = t.amount < 0 ? 'out' : 'in'
    const key = `${brand.key}|${direction}`
    const prev = rules.get(key)
    if (prev) prev.hits++
    else {
      rules.set(key, { match: brand.key, direction, label: brand.brand?.label ?? bankNameOf(t), kind: 'expense', categoryId, ...financingOf(t), household: false, counterAccountId: null, hits: 1 })
    }
  }
  if (!rules.size) return 0
  const now = new Date().toISOString()
  const items = [...rules.values()].map(({ hits, ...rule }) => ({ rule, hits }))
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: upsertRules(f.settings.import.rules, items, { now, makeId: newId }) } } }))
  return rules.size
}

/** A search usable as a keyword: at least 3 letters, not an amount. */
export const keywordOfSearch = (query: string): string | null => {
  const q = query.trim()
  return /^[-−+]?\d[\d\s.,]*$/.test(q) || normalizeKeyword(q).replace(/[^a-z?]/g, '').length < 3 ? null : q
}

/** What a rule decides, in a few words (the user's keywords, a brand of a rule among similar names). */
/**
 * One text for a rule's decision everywhere (N80: the settings' rules, the keywords, a proposal of a word): who pays, the
 * category – marked when archived since (N86: such a rule asks for a new one) –, whose money, the own transfer's account.
 */
export function ruleDecisionText(
  r: Pick<ImportRule, 'kind' | 'categoryId' | 'refundable' | 'household' | 'memberId' | 'gift' | 'share' | 'counterAccountId'> & Partial<Pick<ImportRule, 'loanId' | 'loanAmount'>>,
  catLabel: (id: string | null) => string,
  members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>> = membersNow()
): string {
  const settings = useData.getState().fi?.settings
  // The loan it repays (D100, T358): whole, or a part of each income – a closed one said (the rule gives way then).
  const loan = r.loanId ? useData.getState().records.loans[r.loanId]?.record : undefined
  const loanName = r.loanId ? `${loan?.name ?? 'pożyczka spoza Radaru'}${loan?.closedAt ? ' (zamknięta)' : ''}` : ''
  if (r.kind === 'loan' && r.loanId) return `zwrot pożyczki: ${loanName}`
  if (r.kind === 'income' && r.loanId && r.loanAmount) return `${ruleDecisionText({ ...r, loanId: undefined, loanAmount: undefined }, catLabel, members)} · w tym spłata pożyczki: ${loanName} ${plnText(r.loanAmount)} zł`
  if (r.kind === 'expense') {
    const archived = !!r.categoryId && !!settings?.categories.find((c) => c.id === r.categoryId)?.archived
    return `${r.refundable ? `${r.gift ? 'prezent od' : 'finansuje'}: ${memberName(r.memberId, members)} · ` : r.share ? `wspólnie: ${shareNames(r.share, members)} · ` : ''}${catLabel(r.categoryId) || 'bez kategorii'}${archived ? ' (zarchiwizowana)' : ''}`
  }
  if (r.kind === 'income') {
    if (!r.household) return 'wpływ (przychód)'
    // The import's names (AP-4); a rule of „spłata” – the rest beyond the debt as the person's setting says (D80 b).
    const kind = (r as ImportRule).inflowKind
    const kindText = kind === 'income' ? ` – ${MEMBER_MONEY_TEXT['all-income']}` : kind === 'advance' ? ` – ${MEMBER_MONEY_TEXT['all-advance']}` : ''
    return `od domownika: ${memberName(r.memberId, members)}${kindText}`
  }
  if (r.kind === 'transfer') {
    const account = r.counterAccountId ? settings?.accounts.find((a) => a.id === r.counterAccountId)?.name : null
    return account ? `przelew własny · ${account}` : 'przelew własny'
  }
  return TX_KIND_LABEL[r.kind as TxKind] ?? r.kind
}

/** One text for a rule's direction everywhere (N80). */
export const directionText = (d: string | null | undefined): string => (d === 'in' ? 'wpływy' : d === 'out' ? 'wydatki' : 'oba kierunki')

export function deleteRule(id: string): void {
  setRules((rules) => rules.filter((r) => r.id !== id))
}

/**
 * A rule deleted by hand (the rules' lists – AP-22, AF-29): with „Cofnij”, which puts it back where it was (not twice,
 * when it came back some other way meanwhile).
 */
export function removeRule(id: string): void {
  if (!canWrite()) return
  const rules = useData.getState().fi?.settings.import.rules ?? []
  const at = rules.findIndex((r) => r.id === id)
  const rule = rules[at]
  if (!rule) return
  deleteRule(id)
  toast(`Reguła „${rule.label || rule.match}” usunięta.`, 'info', 8000, {
    label: 'Cofnij',
    run: () =>
      setRules((now) => {
        if (now.some((r) => r.id === id)) return now
        const next = [...now]
        next.splice(Math.min(at, next.length), 0, rule)
        return next
      })
  })
}

function setRules(next: (rules: ImportRule[]) => ImportRule[]): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: next(f.settings.import.rules) } } }))
}

/**
 * A rule's decision as the import's (the rule's editor – F22). A member's money of „spłata”: the rest the person's
 * setting gives at each import (D80 b, AP-4 – the rule keeps none), as `classifyRow` reads it.
 */
export const choiceOfRule = (r: ImportRule, members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'inflow'>> = membersNow()): Choice => ({
  kind: r.kind as TxKind,
  categoryId: r.categoryId,
  refundable: r.refundable,
  household: r.household,
  memberId: r.memberId,
  advance: r.inflowKind === 'advance' || (r.household && r.inflowKind !== 'income' && inflowOf(members.find((m) => m.id === (r.memberId ?? HOUSE_MEMBER_ID))) === 'advance'),
  inflowKind: r.inflowKind ?? 'repay',
  gift: r.gift,
  share: r.share ?? null,
  counterAccountId: r.counterAccountId,
  // The loan it repays (D100, T358): whole (kind 'loan'), or its part of each income.
  loanId: r.kind === 'loan' ? (r.loanId ?? null) : null,
  ...(r.kind === 'income' && r.loanId && r.loanAmount ? { shares: [{ memberId: '', amount: r.loanAmount, advance: false, loanId: r.loanId }] } : {})
})

/**
 * A rule changed in the settings (F22): its direction, decision and – a rule up to an amount – its limit; the user's
 * own from now on (`learned` false), with „Cofnij”.
 */
export function editRule(id: string, patch: { direction: 'in' | 'out' | null; choice: Choice; maxAmount?: number | null; tags?: readonly string[]; manual?: boolean }): void {
  if (!canWrite()) return
  const rule = useData.getState().fi?.settings.import.rules.find((r) => r.id === id)
  if (!rule) return
  const next: ImportRule = {
    ...rule,
    direction: patch.direction,
    ...ruleDecisionOf(patch.choice),
    ...(rule.mode === 'amount' && patch.maxAmount ? { maxAmount: patch.maxAmount } : {}),
    // Its tags (F17 – „Netia → #ulga-internet”): the operations it makes carry them; none – the field goes.
    ...(patch.tags ? { tags: patch.tags.length ? [...patch.tags] : undefined } : {}),
    // Also for the entries typed by hand (AP-45, T470); off – the field goes (as before 1.16.0).
    ...(patch.manual !== undefined ? { manual: patch.manual || undefined } : {}),
    learned: false,
    updatedAt: new Date().toISOString()
  }
  setRules((rules) => rules.map((r) => (r.id === id ? next : r)))
  toast(`Reguła „${rule.label || rule.match}” zmieniona.`, 'success', 6000, { label: 'Cofnij', run: () => ruleBack(rule, next) })
}

/** „Cofnij” of a rule's change (AP-22): the rule as it was – only while still as the change left it (review 3 of N4). */
function ruleBack(was: ImportRule, set: ImportRule): void {
  const now = useData.getState().fi?.settings.import.rules.find((r) => r.id === was.id)
  if (!now) return toast(`Reguły „${was.label || was.match}” już nie ma – nic do cofnięcia.`, 'info', 5000)
  if (!sameContentAs(now, set)) return toast(`Reguła „${was.label || was.match}” zmieniła się od tego czasu – zostaje, jak jest.`, 'info', 6000)
  setRules((rules) => rules.map((r) => (r.id === was.id ? was : r)))
}

/**
 * A rule of an advance for the future to review (AP-4): „spłata” from now on – their money repays the debt first, the
 * rest as the person's setting says (D80 b); with „Cofnij” (`editRule`).
 */
export function repayingRule(rule: ImportRule): void {
  const direction = rule.direction === 'in' ? 'in' : rule.direction === 'out' ? 'out' : null
  editRule(rule.id, { direction, choice: { ...choiceOfRule(rule), inflowKind: 'repay' }, maxAmount: rule.maxAmount, tags: rule.tags })
}

// ------------------------------------------------------------------ rules of conditions (1.16.0, AP-45)

/** A rule of conditions as its editor holds it (Ustawienia → Import z banku → „Nowa reguła z warunkami”, T467). */
export interface ConditionsDraft {
  /** The rule's name in the list; empty – made of its first condition. */
  label: string
  /** Wydatki / wpływy / oba kierunki – always with the conditions (the rule's `direction`). */
  direction: 'in' | 'out' | null
  conditions: RuleCondition[]
  combine: 'all' | 'any'
  choice: Choice
  /** Also for the entries typed by hand (T470). */
  manual: boolean
  tags: string[]
}

/** A new condition of a field, empty. */
export const blankCondition = (field: RuleCondition['field']): RuleCondition => (field === 'amount' ? { field, min: null, max: null } : { field, value: '' })

/** What a condition cannot be saved for (said at it – AP-15), null = it can. */
export function conditionRefusal(c: RuleCondition, accounts: ReadonlyArray<{ id: string }> = useData.getState().fi?.settings.accounts ?? []): string | null {
  switch (c.field) {
    case 'counterparty':
      return counterpartyKey(c.value ?? '') ? null : 'Wpisz fragment nazwy kontrahenta – litery albo cyfry.'
    case 'title':
      return normalizeKeyword(c.value ?? '').replace(/[^a-z0-9?]/g, '') ? null : 'Wpisz słowo z tytułu.'
    case 'amount':
      return c.min == null && c.max == null ? 'Podaj kwotę „od”, „do” albo obie.' : null
    case 'account':
      return c.value && accounts.some((a) => a.id === c.value) ? null : 'Wybierz konto.'
    default:
      return 'Warunek nowszej wersji aplikacji – usuń go albo zaktualizuj aplikację.'
  }
}

/** The draft's first refusal (the editor's „Zapisz” says it), null = it can be saved. */
export function conditionsRefusal(d: ConditionsDraft): string | null {
  if (!d.conditions.length) return 'Dodaj co najmniej jeden warunek.'
  if (d.conditions.length > MAX_RULE_CONDITIONS) return `Najwyżej ${MAX_RULE_CONDITIONS} warunków.`
  for (const c of d.conditions) {
    const why = conditionRefusal(c)
    if (why) return why
  }
  if (d.choice.kind === 'expense' && !d.choice.categoryId && !d.choice.refundable && !d.choice.share) return 'Wybierz kategorię.'
  return null
}

/** The rule's name: the user's, else its first condition with a text (a counterparty, a title). */
function labelOf(d: ConditionsDraft): string {
  const own = d.label.trim().replace(/\s+/g, ' ')
  if (own) return own.slice(0, 200)
  const text = d.conditions.find((c) => (c.field === 'counterparty' || c.field === 'title') && c.value?.trim())?.value?.trim()
  return (text ?? 'Reguła z warunkami').slice(0, 200)
}

/**
 * A rule of conditions saved (T467): a new one at the end of the list, a changed one in its place – the user's own
 * (`learned` false), with „Cofnij” (a new one is removed, a changed one back – only while still as saved, T418). The
 * mode 'conditions' keeps it from a version before 1.16.0 (`importRuleSchema.conditions`). Returns a refusal, or null.
 */
export function saveConditionsRule(id: string | null, d: ConditionsDraft): string | null {
  const why = conditionsRefusal(d)
  if (why) return why
  if (!canWrite()) return useData.getState().switching ? SWITCHING_MESSAGE : READ_ONLY_MESSAGE
  const rules = useData.getState().fi?.settings.import.rules ?? []
  const was = id ? rules.find((r) => r.id === id) : undefined
  if (id && !was) return 'Tej reguły już nie ma – usunięto ją w międzyczasie.'
  const label = labelOf(d)
  const rule = importRuleSchema.parse({
    ...(was ?? {}),
    ...ruleDecisionOf({ ...d.choice, shares: undefined }),
    id: was?.id ?? newId(),
    match: label,
    mode: 'conditions',
    maxAmount: undefined,
    counterparty: undefined,
    conditions: d.conditions.map((c) => (c.field === 'amount' ? { field: c.field, min: c.min ?? null, max: c.max ?? null } : { field: c.field, value: (c.value ?? '').trim() })),
    combine: d.combine,
    direction: d.direction,
    label,
    manual: d.manual || undefined,
    tags: d.tags.length ? [...d.tags] : undefined,
    learned: false,
    hits: was?.hits ?? 0,
    updatedAt: new Date().toISOString()
  })
  // A rule this version could not apply is never written (the refusals above say why first).
  if (!compileRule(rule)) return 'Tej reguły nie da się zastosować – sprawdź warunki.'
  if (was) {
    setRules((list) => list.map((r) => (r.id === rule.id ? rule : r)))
    toast(`Reguła „${label}” zmieniona.`, 'success', 6000, { label: 'Cofnij', run: () => ruleBack(was, rule) })
  } else {
    setRules((list) => [...list, rule])
    toast(`Nowa reguła: „${label}”.`, 'success', 6000, {
      label: 'Cofnij',
      run: () => {
        // Deleted only while as it was added (an edit since stays – T418).
        const now = useData.getState().fi?.settings.import.rules.find((r) => r.id === rule.id)
        if (!now) return
        if (!sameContentAs(now, rule)) return toast(`Reguła „${label}” zmieniła się od dodania – zostaje, jak jest.`, 'info', 6000)
        deleteRule(rule.id)
      }
    })
  }
  return null
}

/** A rule's „także dla wpisów ręcznych” switched (the keywords' list, T470) – a switch, undone by the same switch. */
export function setRuleManual(id: string, on: boolean): void {
  if (!canWrite()) return
  setRules((rules) => rules.map((r) => (r.id === id ? { ...r, manual: on || undefined, learned: false, updatedAt: new Date().toISOString() } : r)))
}

/** A rule's conditions in words, for its list („kontrahent zawiera „orlen” i kwota do 40,00 zł”). */
export function conditionsText(
  r: Pick<ImportRule, 'conditions' | 'combine'>,
  accountName: (id: string) => string = (id) => useData.getState().fi?.settings.accounts.find((a) => a.id === id)?.name ?? 'konto spoza listy'
): string {
  const one = (c: RuleCondition): string => {
    if (c.field === 'counterparty') return `kontrahent zawiera „${c.value ?? ''}”`
    if (c.field === 'title') return `tytuł zawiera „${c.value ?? ''}”`
    if (c.field === 'account') return `konto ${c.value ? accountName(c.value) : '—'}`
    if (c.field === 'amount')
      return c.min != null && c.max != null ? `kwota ${plnText(c.min)}–${plnText(c.max)} zł` : c.min != null ? `kwota od ${plnText(c.min)} zł` : `kwota do ${plnText(c.max ?? 0)} zł`
    return 'warunek nowszej wersji'
  }
  return (r.conditions ?? []).map(one).join(r.combine === 'any' ? ' lub ' : ' i ')
}

/** A rule of an advance for the future kept so (AP-4): never to review again – with „Cofnij”. */
export function keepAdvanceRule(rule: Pick<ImportRule, 'id' | 'label' | 'match'>): void {
  if (!canWrite()) return
  const key = advanceRuleKey(rule.id)
  const at = new Date().toISOString()
  // „Cofnij” takes back only its own mark (one set again since – here or on the other computer – stays).
  const set = (on: boolean) =>
    updateSettings((f) => {
      const notDuplicates = { ...f.settings.import.notDuplicates }
      if (on) notDuplicates[key] = at
      else if (notDuplicates[key] === at) delete notDuplicates[key]
      return { ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates } } }
    })
  if (set(true)) toast(`Reguła „${rule.label || rule.match}” zostaje zaliczką na przyszłość.`, 'info', 6000, { label: 'Cofnij', run: () => set(false) })
}

/**
 * A rule of a brand up to an amount (F22): its expenses up to `maxAmount` get `categoryId`, the rest – the brand's plain
 * rule („Orlen do 40 zł → kawa”). With „Cofnij”.
 */
export function addAmountRule(input: { brand: string; label: string; maxAmount: number; categoryId: string }): void {
  if (!canWrite()) return
  const rule = importRuleSchema.parse({
    id: newId(),
    match: input.brand,
    mode: 'amount',
    maxAmount: input.maxAmount,
    direction: 'out',
    label: input.label,
    kind: 'expense',
    categoryId: input.categoryId,
    learned: false,
    hits: 0,
    updatedAt: new Date().toISOString()
  })
  setRules((rules) => [...rules, rule])
  toast(`Nowa reguła: ${input.label} do ${(input.maxAmount / 100).toLocaleString('pl-PL')} zł.`, 'success', 6000, {
    label: 'Cofnij',
    run: () => {
      // Deleted only while as it was added (an edit since stays – review 3 of N4).
      const now = useData.getState().fi?.settings.import.rules.find((r) => r.id === rule.id)
      if (!now) return
      if (!sameContentAs(now, rule)) return toast(`Reguła „${input.label}” zmieniła się od dodania – zostaje, jak jest.`, 'info', 6000)
      deleteRule(rule.id)
    }
  })
}

/**
 * „Zastosuj do historii” (F22): a rule's category and financing for the operations it catches decided otherwise – those
 * not changed since they were counted; „Cofnij” takes back those still as it left them.
 */
export function applyRuleToHistory(items: ReadonlyArray<{ before: Transaction; after: Transaction }>, label: string): void {
  if (!canWrite()) return
  const s = useData.getState()
  // By content: a save stamps a record in place (a new object, the same operation).
  const now = items.filter(({ before }) => sameContentAs(s.records.transactions[before.id]?.record, before))
  if (!now.length) {
    toast('Te operacje zmieniły się od sprawdzenia – lista liczy się od nowa.', 'info', 5000)
    return
  }
  replaceRecords(
    'transactions',
    now.map((x) => x.after)
  )
  const undo = () => {
    const current = useData.getState().records.transactions
    const back = now.filter((x) => sameContentAs(current[x.after.id]?.record, x.after))
    replaceRecords(
      'transactions',
      back.map((x) => x.before)
    )
    undoKept(back.length, now.length - back.length)
  }
  toast(`Reguła „${label}” zastosowana do historii: ${countLabel(now.length, 'operacja', 'operacje', 'operacji')}.`, 'success', 8000, { label: 'Cofnij', run: undo })
}

/**
 * A keyword of the user (D75): these words in the name or the title of an operation → the decision. The same keyword
 * and direction again changes it. Returns an error to show, or null.
 */
export function saveKeywordRule(input: {
  keyword: string
  direction: 'in' | 'out' | null
  kind: TxKind
  categoryId: string | null
  /** An optional counterparty constraint (e.g. transfer from person X with title Y). */
  counterparty?: string | null
  /** A decision of the import taken as a keyword (1.2.2): a member's purchase or money (D80), their gift, several people (D83), an account. */
  refundable?: boolean
  household?: boolean
  memberId?: string | null
  gift?: boolean
  share?: Share | null
  counterAccountId?: string | null
  inflowKind?: 'repay' | 'income' | 'advance'
}): string | null {
  // Said by the caller as an error, like the others (N2): never „zapamiętano” in a read-only folder, nor while another
  // folder opens (B31).
  const locked = (): string => (useData.getState().switching ? SWITCHING_MESSAGE : READ_ONLY_MESSAGE)
  if (useData.getState().status?.readOnly || useData.getState().switching) return locked()
  const match = normalizeKeyword(input.keyword)
  if (match.replace(/[^a-z?]/g, '').length < 3) return 'Słowo kluczowe musi mieć co najmniej 3 litery.'
  if (match.split(' ').every(isGenericWord)) return `„${input.keyword.trim()}” jest za ogólne – bank pisze je przy wielu operacjach. Wybierz słowo, które mówi, co to było.`
  if (input.kind === 'expense' && !input.categoryId) return 'Wybierz kategorię.'
  const now = new Date().toISOString()
  const cpConstraint = input.counterparty?.trim() || undefined
  const saved = updateSettings((f) => {
    const rules = f.settings.import.rules
    const at = rules.findIndex(
      (r) =>
        r.mode === 'keyword' &&
        r.match === match &&
        r.direction === input.direction &&
        (r.counterparty || undefined) === cpConstraint
    )
    const rule: ImportRule = {
      ...(at >= 0 ? rules[at] : {}),
      id: at >= 0 ? rules[at]!.id : newId(),
      match,
      mode: 'keyword',
      direction: input.direction,
      counterparty: cpConstraint,
      label: cpConstraint ? `${cpConstraint} · ${input.keyword.trim()}` : input.keyword.trim().replace(/\s+/g, ' '),
      kind: input.kind,
      categoryId: input.kind === 'expense' ? input.categoryId : null,
      refundable: input.kind === 'expense' && !!input.refundable,
      household: input.kind === 'income' && !!input.household,
      memberId: (input.kind === 'expense' && input.refundable) || (input.kind === 'income' && input.household) ? (input.memberId ?? null) : null,
      gift: input.kind === 'expense' && input.refundable && input.gift ? true : undefined,
      share: input.kind === 'expense' && !input.refundable && input.share ? input.share : undefined,
      counterAccountId: input.kind === 'transfer' ? (input.counterAccountId ?? null) : null,
      inflowKind: input.kind === 'income' && input.household ? input.inflowKind : undefined,
      learned: false,
      hits: at >= 0 ? rules[at]!.hits : 0,
      updatedAt: now
    }
    const next = [...rules]
    if (at >= 0) next[at] = rule
    else next.push(rule)
    return { ...f, settings: { ...f.settings, import: { ...f.settings.import, rules: next } } }
  })
  return saved ? null : locked()
}

// ------------------------------------------------------------------ names merged by the user (1.2.2, D78)

/**
 * Change the merged names; returns an undo of just these keys (whatever else changed meanwhile stays), null = nothing
 * changed (merged already – here or on another computer).
 */
function changeAliases(fn: (a: BrandAliases) => Record<string, BrandAlias>): (() => void) | null {
  // A read-only folder: nothing merged, no „Połączono” with „Cofnij” (N2).
  if (!canWrite()) return null
  const before = aliasesNow()
  const after = fn(before)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => before[k] !== after[k])
  if (!keys.length) return null
  // `only` – the keys still as `only` has them (its „Cofnij”: a name merged or parted again since stays – review 3 of N4).
  const write = (from: BrandAliases, only?: BrandAliases): number => {
    let kept = 0
    updateSettings((f) => {
      const next: Record<string, BrandAlias> = { ...f.settings.import.aliases }
      for (const k of keys) {
        if (only && !sameContentAs(next[k], only[k])) {
          kept++
          continue
        }
        if (from[k]) next[k] = from[k]!
        else delete next[k]
      }
      return { ...f, settings: { ...f.settings, import: { ...f.settings.import, aliases: next } } }
    })
    return kept
  }
  write(after)
  return () => {
    const kept = write(before, after)
    undoKept(keys.length - kept, kept, 'nazwy')
  }
}

/**
 * Names that are one counterparty (D78): each `from` is grouped and ruled as `into` from now on – an open file is
 * planned again, the next imports too; Operacje remember by it. Returns an undo, null = merged already.
 */
export function mergeNames(merges: ReadonlyArray<{ into: BrandName; from: readonly BrandName[] }>): (() => void) | null {
  const now = new Date().toISOString()
  return changeAliases((a) => merges.reduce<Record<string, BrandAlias>>((acc, m) => withMerged(acc, m.into, m.from, now), { ...a }))
}

/** A merged name back on its own (Ustawienia → Import z banku – AP-22, AF-60: with „Cofnij”). */
export const unmergeName = (key: string): void => {
  const label = aliasesNow()[key]?.label || key
  const undo = changeAliases((a) => {
    const next = { ...a }
    delete next[key]
    return next
  })
  if (undo) toast(`Rozłączono „${label}” – wraca do własnej grupy.`, 'success', 8000, { label: 'Cofnij', run: undo })
}

/** Every merged name back on its own; returns an undo. */
export const unmergeAll = (): (() => void) | null => changeAliases(() => ({}))

/**
 * A merge made in 1.2.2 on names with the bank's additions („… DATA TRANSAKCJI: …”): no name is read so any more, so it
 * merges nothing – shown as inactive, removed in one click (`removeInactive`).
 */
export const inactiveAlias = (a: BrandAlias): boolean => [a.label, a.toLabel].some((l) => !!l && cleanBankName(l, { town: true }) !== l.trim())

export const removeInactive = (): (() => void) | null =>
  changeAliases((a) => Object.fromEntries(Object.entries(a).filter(([, x]) => !inactiveAlias(x))))

/** „To nie to samo”: the pair is not offered again. */
export function dismissSimilar(key: string): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notSimilar: { ...f.settings.import.notSimilar, [key]: new Date().toISOString() } } } }))
}

/** The pairs said to be two offered again. */
export function clearDismissedSimilar(): void {
  const before = useData.getState().fi?.settings.import.notSimilar ?? {}
  if (!updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notSimilar: {} } } }))) return
  if (Object.keys(before).length)
    toast('Pary „to nie to samo” będą znowu proponowane.', 'info', 7000, {
      label: 'Cofnij',
      run: () => updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notSimilar: { ...before, ...f.settings.import.notSimilar } } } }))
    })
}

/**
 * „to nie duplikat” forgotten (N74): the duplicates panel shows those pairs again – with „Cofnij”. The other reports'
 * „zostaw” in the same map stay (`isDuplicatePairKey`) – also the advances for the future kept so (AP-4).
 */
export function clearNotDuplicates(): void {
  const before = useData.getState().fi?.settings.import.notDuplicates ?? {}
  const kept = Object.fromEntries(Object.entries(before).filter(([k]) => !isDuplicatePairKey(k)))
  if (!updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates: kept } } }))) return
  toast('Pary „to nie duplikat” będą znowu pokazywane.', 'info', 7000, {
    label: 'Cofnij',
    run: () => updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates: { ...f.settings.import.notDuplicates, ...before } } } }))
  })
}

export function setOwnNames(names: string[]): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, ownNames: names } } }))
}
