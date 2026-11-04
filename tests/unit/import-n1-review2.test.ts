import { describe, expect, it } from 'vitest'
import { repaidMarks, settleHousehold } from '@shared/calc/household'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { auditRules } from '@shared/import/audit'
import { classifyRow, type ClassifyContext } from '@shared/import/classify'
import { dropsCovers, takeUserData } from '@shared/import/copies'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, planImport, type ImportChoices, type ImportPlan, type RowCopy } from '@shared/import/reconcile'
import { defaultCategoryId, importRuleSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type ImportRule, type Transaction } from '@shared/schema'

// The second code review of N1 (1.15.5): its findings in the import's logic, each with the scenario that failed before.

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const GROCERIES = defaultCategoryId(1, 1)
let seq = 0
const makeId = () => `01KN2R${String(++seq).padStart(20, '0')}`
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
  importRuleSchema.parse({ id: makeId(), match: 'tomaszkolega', mode: 'exact', direction: 'in', label: 'TOMASZ KOLEGA', kind: 'income', categoryId: null, learned: true, hits: 1, updatedAt: NOW, ...over })
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })

const LOAN = '01KN2RPZYCZKA0000000000001'
/** A loan of the Radar to Tomasz, given on 1.10 and still open. */
const loan = { id: LOAN, name: 'Pożyczka dla Tomka', direction: 'given' as const, counterparty: 'Tomasz Kolega', date: '2026-10-01', closedAt: null as string | null }
const ctx = (rules: ImportRule[] = [], over: Partial<ClassifyContext> = {}): ClassifyContext => ({
  rules,
  ownNames: ['JAN KAPITAN'],
  categories: categoryIndex(settings.categories),
  loans: [loan],
  members: settings.household.members,
  ...over
})
const tomasz = (date: string, amount = 500, title = 'CZYNSZ') => transfer(date, amount, 'TOMASZ KOLEGA', title)

describe('przegląd N1 2, 6: pożyczka istnieje od dnia jej udzielenia – przelew sprzed niej nigdy nie jest jej zwrotem', () => {
  it('bez reguły: przelew sprzed dnia pożyczki – zwykły wpływ; od dnia pożyczki – zwrot (B34)', () => {
    // An older file: Tomasz's transfer of August, before the loan of October was given.
    expect(classifyRow(tomasz('2026-08-15'), ctx()).decision).toMatchObject({ kind: 'income', loanId: null })
    expect(classifyRow(tomasz('2026-10-01'), ctx()).decision).toMatchObject({ kind: 'loan', loanId: LOAN, source: 'builtin' })
    // The import does the same: no repayment of a loan with money sent before it existed.
    const plan = planImport(fileOf([tomasz('2026-08-15'), tomasz('2026-10-20')]), MBANK_ACCOUNT_ID, [], ctx())
    const created = buildImport(plan, choicesOf(), { now: NOW, makeId, rules: [] }).create
    expect(created.map((t) => [t.date, t.kind, t.loanId])).toEqual([
      ['2026-08-15', 'income', null],
      ['2026-10-20', 'loan', LOAN]
    ])
  })

  it('dawna reguła pożyczki (N14): przelew sprzed dnia pożyczki – propozycja bez pożyczki z Radaru; od jej dnia – z nią', () => {
    const old = rule({ kind: 'loan' })
    expect(classifyRow(tomasz('2026-08-15'), ctx([old])).decision).toMatchObject({ kind: 'loan', ruleId: old.id, loanId: null })
    expect(classifyRow(tomasz('2026-10-15'), ctx([old])).decision).toMatchObject({ kind: 'loan', ruleId: old.id, loanId: LOAN })
  })

  it('dwie otwarte pożyczki: przelew między ich dniami – zwrot starszej, przed obiema – żadnej', () => {
    const older = { ...loan, id: '01KN2RPZYCZKA0000000000002', date: '2026-06-01' }
    expect(classifyRow(tomasz('2026-08-15'), ctx([], { loans: [loan, older] })).decision).toMatchObject({ kind: 'loan', loanId: older.id })
    expect(classifyRow(tomasz('2026-05-15'), ctx([], { loans: [loan, older] })).decision).toMatchObject({ kind: 'income', loanId: null })
  })
})

describe('przegląd N1 2, 7: audyt reguł i import – ta sama pożyczka (otwarta teraz, udzielona do dnia przelewu)', () => {
  const rent = rule({})
  /** Open from June to August, closed in September. */
  const closed = { ...loan, date: '2026-06-01', closedAt: '2026-09-01T10:00:00.000Z' }

  it('pożyczka zamknięta od tamtej pory: import zostawia regułę – audyt nic nie zgłasza', () => {
    // Tomasz's July transfer, the loan open then: the import now keeps the rule (a closed loan takes no money back) …
    expect(classifyRow(tomasz('2026-07-15'), ctx([rent], { loans: [closed] })).decision).toMatchObject({ kind: 'income', source: 'rule', ruleId: rent.id })
    const created = buildImport(planImport(fileOf([tomasz('2026-07-15')]), MBANK_ACCOUNT_ID, [], ctx([rent], { loans: [closed] })), choicesOf(), { now: NOW, makeId, rules: [rent] }).create
    expect(created.map((t) => t.kind)).toEqual(['income'])
    // … so the audit has nothing the rule gives way to now (before: „do poprawy” for good).
    expect(auditRules([rent], created, {}, [closed]).borrower.size).toBe(0)
  })

  it('pożyczka otwarta teraz: operacja zapisana regułą od dnia pożyczki – „do poprawy”; sprzed jej dnia – nie', () => {
    const open = { ...closed, closedAt: null }
    const asIncome = (date: string) => buildImport(planImport(fileOf([tomasz(date)]), MBANK_ACCOUNT_ID, [], ctx([rent], { loans: [] })), choicesOf(), { now: NOW, makeId, rules: [rent] }).create
    const [july] = asIncome('2026-07-15')
    const [may] = asIncome('2026-05-15')
    expect(auditRules([rent], [july!, may!], {}, [open]).borrower.get(rent.id)?.map(({ t }) => t.id)).toEqual([july!.id])
    // The import agrees: July's row is the loan's repayment now, May's the rule's.
    expect(classifyRow(tomasz('2026-07-15'), ctx([rent], { loans: [open] })).decision).toMatchObject({ kind: 'loan', loanId: open.id })
    expect(classifyRow(tomasz('2026-05-15'), ctx([rent], { loans: [open] })).decision).toMatchObject({ kind: 'income', ruleId: rent.id })
  })
})

describe('przegląd N1 2, 8: kopia z inną decyzją nie gubi po cichu zakupów, które spłaca', () => {
  const MAMA = '01KN2RMAMA0000000000000003'
  const TATA = '01KN2RTATA0000000000000004'
  const mama = { id: MAMA, name: 'Mama', bankNames: ['ANNA MAMA'], inflow: 'income' as const, archived: false }
  const tata = { id: TATA, name: 'Tata', bankNames: ['PIOTR TATA'], inflow: 'income' as const, archived: false }
  const family = (over: Partial<ClassifyContext> = {}) => ctx([], { loans: [], members: [...settings.household.members, mama, tata], ...over })
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
   * Mama's 100 zł: the list imported onto the wallet by mistake first (its copy there pays back Lidl and Rossmann),
   * then the account history onto mBank – the same transfer here, decided as `here` says.
   */
  function twoCopies(here: Partial<Transaction>) {
    const wrong = run(planImport(fromMama('lista'), XTB_WALLET_ACCOUNT_ID, [lidl, rossmann], family()), [lidl, rossmann], '2026-10-27T10:00:00.000Z').after
    const withCopy = wrong.map((t) => (t.accountId === XTB_WALLET_ACCOUNT_ID ? { ...t, covers: [lidl.id, rossmann.id] } : t))
    const both = run(planImport(fromMama('historia'), MBANK_ACCOUNT_ID, withCopy, family()), withCopy, '2026-10-28T10:00:00.000Z').after
    const existing = both.map((t) => (t.accountId === MBANK_ACCOUNT_ID && t.kind === 'income' ? { ...t, ...here } : t))
    const mamaHere = existing.find((t) => t.accountId === MBANK_ACCOUNT_ID && t.kind === 'income')!
    const mamaThere = existing.find((t) => t.accountId === XTB_WALLET_ACCOUNT_ID)!
    expect([mamaThere.kind, mamaThere.memberId, mamaThere.covers.length]).toEqual(['income', MAMA, 2])
    const plan = planImport(fromMama('lista'), MBANK_ACCOUNT_ID, existing, family())
    const p = plan.rows[0]!
    const copy = p.status === 'known' ? p.copy : undefined
    return { existing, mamaHere, mamaThere, plan, copy, tick: choicesOf({ removeCopies: { [p.key]: true } }) }
  }
  const marks = (after: readonly Transaction[]) => {
    const m = repaidMarks(settleHousehold(after, { assignFrom: '2026-01-01' }).purchases)
    return [m.get(lidl.id) ?? null, m.get(rossmann.id) ?? null]
  }

  it('operacja tutaj – zwykły wpływ (inna decyzja, nic nie spłaca): kopia nie zaznaczona z powodem „zakupy znów do oddania”', () => {
    const { copy } = twoCopies({ memberId: null })
    expect(copy).toMatchObject<Partial<RowCopy>>({ remove: false, conflict: true, otherCovers: false, dropsCovers: true, blocked: null })
  })

  it('operacja tutaj – pieniądze Mamy z częścią za Tatę (inna decyzja, te same pieniądze Mamy): usunięta kopia oddaje jej zakupy', () => {
    const split = { id: makeId(), amount: zl(20), categoryId: null, refundable: false, memberId: TATA, advance: false, note: '' }
    const { existing, mamaHere, mamaThere, plan, copy, tick } = twoCopies({ splits: [split] })
    expect(copy).toMatchObject<Partial<RowCopy>>({ remove: false, conflict: true, dropsCovers: false })
    const { result, after } = run(plan, existing, NOW, tick)
    expect(result.remove).toEqual([mamaThere.id])
    const kept = after.find((t) => t.id === mamaHere.id)!
    expect([[...kept.covers].sort(), kept.splits.map((s) => s.memberId)]).toEqual([[lidl.id, rossmann.id].sort(), [TATA]])
    // Mama's 80 zł of it pays her purchases as named: Lidl whole, Rossmann in part (before: both open again).
    expect(marks(after)).toEqual(['repaid', 'partlyRepaid'])
  })

  it('ta sama decyzja, ale operacja tutaj to jej przychód (nie spłata): nie zaznaczona – zakupy kopii nie byłyby spłacone', () => {
    const { existing, plan, copy } = twoCopies({ inflowKind: 'income' })
    expect(copy).toMatchObject<Partial<RowCopy>>({ conflict: false, otherCovers: false, dropsCovers: true, remove: false })
    // Before: removed by default – the purchases named by the copy only, open again.
    expect(run(plan, existing, NOW).result.remove).toEqual([])
  })

  it('dropsCovers / takeUserData: kopia bez pieniędzy domownika nic nie gubi; ta sama decyzja – zakupy przechodzą', () => {
    const copy = tx('2026-10-22', zl(100), { kind: 'income', memberId: MAMA, covers: [lidl.id] })
    const same = tx('2026-10-22', zl(100), { kind: 'income', memberId: MAMA })
    expect([dropsCovers(same, copy), takeUserData(same, [copy], NOW).covers]).toEqual([false, [lidl.id]])
    // A copy whose money repays nobody (plain income – a mark left from before): nothing is lost with it.
    const plain = { ...copy, memberId: null }
    expect(dropsCovers({ ...same, memberId: null, kind: 'transfer' }, plain)).toBe(false)
    // The kept one names its own: the copy's lost (`otherCovers` says so too).
    expect(dropsCovers({ ...same, covers: [rossmann.id] }, copy)).toBe(true)
  })
})
