import { describe, expect, it } from 'vitest'
import { repaidMarks, settleHousehold } from '@shared/calc/household'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { auditRules } from '@shared/import/audit'
import { classifyRow, type ClassifyContext } from '@shared/import/classify'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, importGroups, planImport, rowShares, type Choice, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { defaultCategoryId, importRuleSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type ImportRule, type Transaction } from '@shared/schema'

// The code review of N1 (1.15.5): its findings in the import, each with the scenario that failed before the fix.

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const FUEL = defaultCategoryId(3, 1)
const FUN = defaultCategoryId(6, 1)
const GROCERIES = defaultCategoryId(1, 1)
let seq = 0
const makeId = () => `01KN1R${String(++seq).padStart(20, '0')}`
const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
const NOW = '2026-11-04T18:00:00.000Z'

const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'
/** An incoming transfer as the list of operations (`lista`) or the account history (`historia`) writes it. */
const transfer = (date: string, amount: number, counterparty: string, title: string, format: MbankFile['format'] = 'lista'): MbankRow => ({
  line: 1,
  date,
  description: format === 'lista' ? `${counterparty}, ${title}  ${IN}` : `${IN} ${counterparty} ${title}`,
  operation: IN,
  counterparty,
  title,
  accountNo: '',
  category: '',
  amount: zl(amount),
  pending: false,
  balanceAfter: null
})
const fileOf = (rows: MbankRow[], format: MbankFile['format'] = 'lista', period: MbankFile['period'] = null): MbankFile => ({ format, client: 'JAN KAPITAN', account: null, period, rows, skipped: [] })
const choicesOf = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
const rule = (over: Partial<ImportRule>): ImportRule =>
  importRuleSchema.parse({ id: makeId(), match: 'tomaszkolega', mode: 'exact', direction: 'in', label: 'TOMASZ KOLEGA', kind: 'expense', categoryId: FUEL, learned: true, hits: 1, updatedAt: NOW, ...over })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })

const LOAN = '01KN1RPZYCZKA0000000000001'
/** A loan of the Radar to Tomasz, given on 1.10 and still open. */
const loan = { id: LOAN, name: 'Pożyczka dla Tomka', direction: 'given' as const, counterparty: 'Tomasz Kolega', date: '2026-10-01', closedAt: null }
const TOMASZ = '01KN1RTOMASZ00000000000002'
const ctx = (rules: ImportRule[] = [], over: Partial<ClassifyContext> = {}): ClassifyContext => ({
  rules,
  ownNames: ['JAN KAPITAN'],
  categories: categoryIndex(settings.categories),
  loans: [loan],
  members: settings.household.members,
  ...over
})
const tomasz = (date: string, amount = 500, title = 'CZYNSZ') => transfer(date, amount, 'TOMASZ KOLEGA', title)

describe('przegląd N1, 1: pożyczka przed regułą innego rodzaju dopiero od dnia jej udzielenia (jak audyt – loanOn)', () => {
  const rent = rule({ kind: 'income', categoryId: null })

  it('przelew pożyczkobiorcy sprzed pożyczki – reguła (jak przed 1.15.5); od dnia pożyczki – zwrot pożyczki', () => {
    // An older file: Tomasz's rent of June–September, before the loan of October was given.
    expect(classifyRow(tomasz('2026-09-15'), ctx([rent])).decision).toMatchObject({ kind: 'income', source: 'rule', ruleId: rent.id })
    expect(classifyRow(tomasz('2026-10-01'), ctx([rent])).decision).toMatchObject({ kind: 'loan', loanId: LOAN, source: 'builtin' })
    expect(classifyRow(tomasz('2026-10-15'), ctx([rent])).decision).toMatchObject({ kind: 'loan', loanId: LOAN, source: 'builtin' })
    // The import does the same, and the rules' audit finds nothing to fix in it.
    const plan = planImport(fileOf([tomasz('2026-06-15'), tomasz('2026-09-15')]), MBANK_ACCOUNT_ID, [], ctx([rent]))
    const created = buildImport(plan, choicesOf(), { now: NOW, makeId, rules: [rent] }).create
    expect(created.map((t) => t.kind)).toEqual(['income', 'income'])
    expect(auditRules([rent], created, {}, [loan]).borrower.size).toBe(0)
  })

  it('pożyczkobiorca domownikiem: reguła ustępuje jego pieniądzom, ale nie pożyczce sprzed jej dnia', () => {
    const member = { id: TOMASZ, name: 'Tomasz', bankNames: ['TOMASZ KOLEGA'], inflow: 'income' as const, archived: false }
    const withMember = (rules: ImportRule[]) => ctx(rules, { members: [...settings.household.members, member] })
    // A rule of a product return on his name (AF-26): before the loan – his money, never the loan's repayment.
    expect(classifyRow(tomasz('2026-09-15'), withMember([rule({})])).decision).toMatchObject({ kind: 'income', household: true, memberId: TOMASZ })
    expect(classifyRow(tomasz('2026-10-15'), withMember([rule({})])).decision).toMatchObject({ kind: 'loan', loanId: LOAN })
  })

  it('bez reguły – jak dotąd (B34): pożyczka otwarta, z dowolnego dnia', () => {
    expect(classifyRow(tomasz('2026-09-15'), ctx()).decision).toMatchObject({ kind: 'loan', loanId: LOAN })
  })
})

describe('przegląd N1, 11: audyt reguł nie zgłasza słowa z tytułu – zostaje regułą (ruleGivesWay)', () => {
  it('„ZA PIZZĘ” od pożyczkobiorcy przy otwartej pożyczce – nie „do poprawy”; reguła na nazwisko – tak', () => {
    const pizza = rule({ mode: 'keyword', match: 'pizz', label: 'pizza', categoryId: FUN })
    const imported = buildImport(planImport(fileOf([tomasz('2026-10-20', 40, 'ZA PIZZE')]), MBANK_ACCOUNT_ID, [], ctx([pizza])), choicesOf(), { now: NOW, makeId, rules: [pizza] }).create
    // The import keeps the keyword's decision (T325) …
    expect(imported).toMatchObject([{ kind: 'expense', categoryId: FUN }])
    // … and so does the audit: nothing to fix.
    const audit = auditRules([pizza], imported, {}, [loan])
    expect(audit.hits.get(pizza.id)).toHaveLength(1)
    expect(audit.borrower.size).toBe(0)
    // A keyword of the name is about the person: to fix.
    const byName = rule({ mode: 'keyword', match: 'kolega', categoryId: FUN })
    expect(auditRules([byName], imported, {}, [loan]).borrower.get(byName.id)?.map(({ t }) => t.id)).toEqual([imported[0]!.id])
  })
})

describe('przegląd N1, 2: usunięcie kopii z innego konta (AF-9) nie gubi zakupów, które kopia spłaca (covers)', () => {
  const MAMA = '01KN1RMAMA0000000000000003'
  const mama = { id: MAMA, name: 'Mama', bankNames: ['ANNA MAMA'], inflow: 'income' as const, archived: false }
  const family = (over: Partial<ClassifyContext> = {}) => ctx([], { loans: [], members: [...settings.household.members, mama], ...over })
  const PERIOD = { from: '2026-10-19', to: '2026-10-26' }
  const fromMama = (format: MbankFile['format']) => fileOf([transfer('2026-10-22', 100, 'ANNA MAMA', 'ZA ZAKUPY', format)], format, PERIOD)
  const lidl = tx('2026-10-10', -zl(60), { categoryId: GROCERIES, refundable: true, memberId: MAMA, counterparty: 'Lidl' })
  const rossmann = tx('2026-10-12', -zl(40), { categoryId: GROCERIES, refundable: true, memberId: MAMA, counterparty: 'Rossmann' })

  function run(plan: ImportPlan, existing: readonly Transaction[], now: string, choices: ImportChoices = choicesOf()) {
    const result = buildImport(plan, choices, { now, makeId, rules: [] })
    const byId = new Map(existing.map((t) => [t.id, t]))
    for (const t of result.update) byId.set(t.id, t)
    for (const id of result.remove) byId.delete(id)
    for (const t of result.create) byId.set(t.id, t)
    return { result, after: [...byId.values()] }
  }
  /**
   * Mama's 100 zł: the list imported onto the wallet by mistake first (its copy there pays back Lidl and Rossmann, as
   * the import linked them), then the account history onto mBank (the same transfer here, nothing left to name).
   */
  function twoCopies(copy: Partial<Transaction>, here: Partial<Transaction> = {}) {
    const wrong = run(planImport(fromMama('lista'), XTB_WALLET_ACCOUNT_ID, [lidl, rossmann], family()), [lidl, rossmann], '2026-10-27T10:00:00.000Z').after
    const withCopy = wrong.map((t) => (t.accountId === XTB_WALLET_ACCOUNT_ID ? { ...t, ...copy } : t))
    const both = run(planImport(fromMama('historia'), MBANK_ACCOUNT_ID, withCopy, family()), withCopy, '2026-10-28T10:00:00.000Z').after
    const existing = both.map((t) => (t.accountId === MBANK_ACCOUNT_ID && t.kind === 'income' ? { ...t, ...here } : t))
    const mamaHere = existing.find((t) => t.accountId === MBANK_ACCOUNT_ID && t.kind === 'income')!
    const mamaThere = existing.find((t) => t.accountId === XTB_WALLET_ACCOUNT_ID)!
    expect([mamaHere, mamaThere].map((t) => [t.kind, t.memberId])).toEqual([
      ['income', MAMA],
      ['income', MAMA]
    ])
    return { existing, mamaHere, mamaThere, plan: planImport(fromMama('lista'), MBANK_ACCOUNT_ID, existing, family()) }
  }
  const copyOf = (plan: ImportPlan) => {
    const p = plan.rows[0]!
    return p.status === 'known' ? p.copy : undefined
  }

  it('kopia spłaca zakupy, operacja tutaj nic nie wskazuje: kopia usunięta, jej zakupy przechodzą na operację tutaj', () => {
    const { existing, mamaHere, mamaThere, plan } = twoCopies({ covers: [lidl.id, rossmann.id], coversOpening: true })
    expect(copyOf(plan)).toMatchObject({ remove: true, conflict: false, blocked: null })
    const { result, after } = run(plan, existing, NOW)
    expect(result.remove).toEqual([mamaThere.id])
    const kept = after.find((t) => t.id === mamaHere.id)!
    expect([[...kept.covers].sort(), kept.coversOpening]).toEqual([[lidl.id, rossmann.id].sort(), true])
    // The purchases stay paid back (D91: from `assignFrom` only the named ones are).
    const marks = repaidMarks(settleHousehold(after, { assignFrom: '2026-01-01' }).purchases)
    expect([marks.get(lidl.id), marks.get(rossmann.id)]).toEqual(['repaid', 'repaid'])
  })

  it('kopia spłaca inne zakupy niż operacja tutaj: nie zaznaczona (powód w podglądzie); usunięta przez użytkownika – operacja tutaj ze swoimi', () => {
    const { existing, mamaHere, plan } = twoCopies({ covers: [rossmann.id] }, { covers: [lidl.id] })
    expect(copyOf(plan)).toMatchObject({ remove: false, conflict: false, otherCovers: true, blocked: null })
    expect(run(plan, existing, NOW).result.remove).toEqual([])
    const ticked = run(plan, existing, NOW, choicesOf({ removeCopies: { [plan.rows[0]!.key]: true } }))
    expect(ticked.after.find((t) => t.id === mamaHere.id)!.covers).toEqual([lidl.id])
    // The same purchases named by both: nothing lost – removed as before.
    expect(copyOf(twoCopies({ covers: [lidl.id] }, { covers: [lidl.id] }).plan)).toMatchObject({ remove: true, otherCovers: false })
  })
})

describe('przegląd N1, 5: „w tym za X” grupy i tematu liczy też własne wpłaty X w pliku – nigdy ponad dług', () => {
  const TATA = '01KN1RTATA0000000000000004'
  const MAMA = '01KN1RMAMA0000000000000005'
  const WUJEK = '01KN1RWUJEK000000000000006'
  const person = (id: string, name: string, bankNames: string[]) => ({ id, name, bankNames, inflow: 'advance' as const, archived: false })
  const family = ctx([], { loans: [], members: [...settings.household.members, person(TATA, 'Tata', ['PIOTR TESTOWY']), person(MAMA, 'Mama', ['ANNA TESTOWA']), person(WUJEK, 'Wujek', ['ADAM WUJEK'])] })
  const planOf = (rows: MbankRow[]) => planImport(fileOf(rows), MBANK_ACCOUNT_ID, [], family)
  const groupOf = (plan: ImportPlan, name: string) => importGroups(plan).find((g) => g.label === name)!
  /** The group of `name`'s transfers decided as their money „w tym za” `forWhom`. */
  const alsoFor = (plan: ImportPlan, name: string, forWhom: string, amount: number): Record<string, Choice> => {
    const g = groupOf(plan, name)
    return { [g.group]: { ...g.proposed, shares: [{ memberId: forWhom, amount: zl(amount), advance: true }] } }
  }
  const partsOf = (plan: ImportPlan, s: ReturnType<typeof rowShares>, name: string) =>
    plan.rows.filter((p) => p.row.counterparty === name).map((p) => (s.parts.get(p.key) ?? []).map((x) => [x.memberId, x.amount]))

  it('Tata ma oddać 100 zł i sam wpłaca 100 zł: „w tym za Tata 100” w grupie Mamy nic mu nie daje – przed jego wpłatą i po niej', () => {
    for (const tataOn of ['2026-10-20', '2026-10-28']) {
      const plan = planOf([transfer(tataOn, 100, 'PIOTR TESTOWY', 'ZWROT'), transfer('2026-10-25', 150, 'ANNA TESTOWA', 'OD MAMY I TATY')])
      const choices = choicesOf({ groups: alsoFor(plan, 'ANNA TESTOWA', TATA, 100) })
      const s = rowShares(plan, choices, new Map([[TATA, zl(100)]]))
      expect(partsOf(plan, s, 'ANNA TESTOWA')).toEqual([[]])
      // All of Tata's repayments in the file: his own 100 zł – what the screen's „ma oddać” takes off.
      expect(s.total.get(TATA)).toBe(zl(100))
      const created = buildImport(plan, choices, { now: NOW, makeId, rules: [], owed: new Map([[TATA, zl(100)]]) }).create
      expect(created.find((t) => t.counterparty === 'ANNA TESTOWA')!.splits).toEqual([])
    }
  })

  it('własna wpłata X tylko częściowo spłaca: „w tym za X” daje resztę długu; wpłata X jako przychód (nie spłata) – nie liczy się', () => {
    const plan = planOf([transfer('2026-10-20', 30, 'PIOTR TESTOWY', 'ZWROT'), transfer('2026-10-25', 150, 'ANNA TESTOWA', 'OD MAMY I TATY')])
    const groups = alsoFor(plan, 'ANNA TESTOWA', TATA, 100)
    expect(partsOf(plan, rowShares(plan, choicesOf({ groups }), new Map([[TATA, zl(100)]])), 'ANNA TESTOWA')).toEqual([[[TATA, zl(70)]]])
    const tata = groupOf(plan, 'PIOTR TESTOWY')
    const asIncome = { ...groups, [tata.group]: { ...tata.proposed, inflowKind: 'income' as const, advance: false } }
    expect(partsOf(plan, rowShares(plan, choicesOf({ groups: asIncome }), new Map([[TATA, zl(100)]])), 'ANNA TESTOWA')).toEqual([[[TATA, zl(100)]]])
  })

  it('wpłata X, której grupa daje część innym: liczy się to, co jej zostaje – po kolei', () => {
    // Tata's 100 zł carries Mama's 100 (all of it); the uncle's later transfer pays Tata's debt.
    const plan = planOf([transfer('2026-10-20', 100, 'PIOTR TESTOWY', 'ZA MAME'), transfer('2026-10-25', 300, 'ADAM WUJEK', 'ZA TATE')])
    const choices = choicesOf({ groups: { ...alsoFor(plan, 'PIOTR TESTOWY', MAMA, 100), ...alsoFor(plan, 'ADAM WUJEK', TATA, 100) } })
    const s = rowShares(plan, choices, new Map([[TATA, zl(100)], [MAMA, zl(100)]]))
    expect([partsOf(plan, s, 'PIOTR TESTOWY'), partsOf(plan, s, 'ADAM WUJEK')]).toEqual([[[[MAMA, zl(100)]]], [[[TATA, zl(100)]]]])
    // Each pays for the other and both pay themselves: their own money first, no parts.
    const crossed = planOf([transfer('2026-10-20', 100, 'PIOTR TESTOWY', 'ZA MAME'), transfer('2026-10-25', 150, 'ANNA TESTOWA', 'ZA TATE')])
    const both = choicesOf({ groups: { ...alsoFor(crossed, 'PIOTR TESTOWY', MAMA, 100), ...alsoFor(crossed, 'ANNA TESTOWA', TATA, 100) } })
    const c = rowShares(crossed, both, new Map([[TATA, zl(100)], [MAMA, zl(100)]]))
    expect([partsOf(crossed, c, 'PIOTR TESTOWY'), partsOf(crossed, c, 'ANNA TESTOWA')]).toEqual([[[]], [[]]])
    expect([c.total.get(TATA), c.total.get(MAMA)]).toEqual([zl(100), zl(150)])
  })
})
