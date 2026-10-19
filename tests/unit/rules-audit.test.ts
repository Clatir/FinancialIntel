import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { shareOf, startShare } from '@shared/calc/share'
import { createDefaultSettings } from '@shared/defaults'
import { auditRules, withRule } from '@shared/import/audit'
import { classifyRow, findRule, ruleTargetOf } from '@shared/import/classify'
import { parseMbank, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { buildImport, planImport, type ImportChoices, type NewRow } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { defaultCategoryId, HOUSE_MEMBER_ID, importRuleSchema, MBANK_ACCOUNT_ID, type ImportRule, type Transaction } from '@shared/schema'

const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const fixture = (): MbankFile => parseMbank(decodeText(new Uint8Array(readFileSync(FIXTURE))))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K5${String(++seq).padStart(22, '0')}`
const ctx = (rules: ImportRule[] = []) => ({ rules, ownNames: ['JAN KAPITAN'], categories })
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })
const withRows = (file: MbankFile, rows: MbankRow[]): MbankFile => ({ ...file, rows })
const COFFEE = defaultCategoryId(1, 3)
const FUEL = defaultCategoryId(3, 1)
const AUTO = defaultCategoryId(3)
const GROCERIES = defaultCategoryId(1, 1)

const rule = (over: Partial<ImportRule>): ImportRule =>
  importRuleSchema.parse({ id: makeId(), match: 'orlen', mode: 'exact', direction: 'out', label: 'Orlen', kind: 'expense', categoryId: FUEL, learned: true, hits: 1, updatedAt: NOW, ...over })

/** Orlen's purchases of the fixture as the bank wrote them: one small, one large (amounts set by the test). */
function orlen(amounts: number[]): MbankFile {
  const f = fixture()
  const row = f.rows.find((r) => r.counterparty === 'Orlen')!
  return withRows(
    f,
    amounts.map((amount, i) => ({ ...row, amount, description: `${row.description} ${i}`, date: `2025-10-${String(10 + i).padStart(2, '0')}` }))
  )
}

describe('audyt reguł importu (1.5.1, F22)', () => {
  it('reguła marki do kwoty: przed zwykłą regułą marki, najciaśniejszy próg; bez kwoty – zwykła; import decyduje po kwocie', () => {
    const plain = rule({})
    const small = rule({ mode: 'amount', maxAmount: 4000, categoryId: COFFEE })
    const smaller = rule({ mode: 'amount', maxAmount: 1500, categoryId: GROCERIES })
    const { target } = ruleTargetOf({ counterparty: 'Orlen', title: '' })
    expect(findRule([plain, small], target, 'out', -3990)?.id).toBe(small.id)
    expect(findRule([plain, small], target, 'out', -4001)?.id).toBe(plain.id)
    expect(findRule([plain, small, smaller], target, 'out', -1200)?.id).toBe(smaller.id)
    expect(findRule([plain, small], target, 'out')?.id).toBe(plain.id)
    const f = orlen([-2500, -21000])
    expect(f.rows.map((r) => classifyRow(r, ctx([plain, small])).decision.categoryId)).toEqual([COFFEE, FUEL])
  })

  it('decyzja grupy z reguły do kwoty zmienia tę regułę, a nie zwykłą regułę marki', () => {
    const plain = rule({})
    const small = rule({ mode: 'amount', maxAmount: 4000, categoryId: COFFEE })
    const plan = planImport(orlen([-2500, -21000]), MBANK_ACCOUNT_ID, [], ctx([plain, small]))
    const coffee = plan.rows.find((p): p is NewRow => p.status === 'new' && p.decision.categoryId === COFFEE)!
    const choices = emptyChoices()
    choices.groups[coffee.group] = { kind: 'expense', categoryId: GROCERIES, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    choices.remember[coffee.group] = true
    const rules = buildImport(plan, choices, { now: NOW, makeId, rules: [plain, small] }).rules
    expect(rules.map((r) => [r.mode, r.categoryId, r.maxAmount ?? null])).toEqual([
      ['exact', FUEL, null],
      ['amount', GROCERIES, 4000]
    ])
  })

  it('audyt: trafienia, operacje z inną kategorią (Zastosuj do historii), innego rodzaju, reguły bez trafień, marki z kilkoma kategoriami i próg kwoty', () => {
    const file = orlen([-2500, -3000, -18000, -21000])
    const ops = buildImport(planImport(file, MBANK_ACCOUNT_ID, [], ctx()), emptyChoices(), { now: NOW, makeId, rules: [] }).create
    // The user's categories: small ones coffee, large ones fuel – one large one auto, one small one an own transfer.
    const cats = [COFFEE, COFFEE, FUEL, AUTO]
    const mine: Transaction[] = ops.map((t, i) => ({ ...t, categoryId: cats[i]! }))
    const plain = rule({})
    const idle = rule({ match: 'nikt', label: 'Nikt' })
    const audit = auditRules([plain, idle], mine, {})
    expect(audit.hits.get(plain.id)).toHaveLength(4)
    expect(audit.idle.map((r) => r.id)).toEqual([idle.id])
    // Fuel for all: three of four are otherwise – the rule applied gives them fuel.
    expect((audit.differ.get(plain.id) ?? []).map((d) => [d.before.categoryId, d.after.categoryId])).toEqual([
      [COFFEE, FUEL],
      [COFFEE, FUEL],
      [AUTO, FUEL]
    ])
    // The brand's categories: coffee up to 30 zł, fuel and auto above – three categories, no clean limit.
    expect(audit.mixed).toHaveLength(1)
    expect(audit.mixed[0]!.categories.map((c) => [c.categoryId, c.n])).toEqual([
      [COFFEE, 2],
      [FUEL, 1],
      [AUTO, 1]
    ])
    expect(audit.mixed[0]!.limit).toBeNull()
    // Two categories split by the amount: a rule up to the whole złoty above the small ones.
    const two = auditRules([plain], mine.map((t) => (t.categoryId === AUTO ? { ...t, categoryId: FUEL } : t)), {})
    expect(two.mixed[0]!.limit).toEqual({ maxAmount: 3000, categoryId: COFFEE })
    // An operation changed into another kind by hand: said, never applied.
    const moved = mine.map((t, i) => (i === 3 ? { ...t, kind: 'transfer' as const, categoryId: null } : t))
    const other = auditRules([plain], moved, {})
    expect(other.otherKind.get(plain.id)?.map((t) => t.id)).toEqual([mine[3]!.id])
    expect(other.differ.get(plain.id)).toHaveLength(2)
  })

  it('zastosowanie reguły: finansujący zdejmuje wspólny podział, wspólna reguła dzieli z kategorią', () => {
    const op = buildImport(planImport(orlen([-12000]), MBANK_ACCOUNT_ID, [], ctx()), emptyChoices(), { now: NOW, makeId, rules: [] }).create[0]!
    const share = startShare(HOUSE_MEMBER_ID)
    const shared = withRule(op, rule({ share }))
    expect(shareOf(shared)).not.toBeNull()
    expect(shared.splits.every((s) => s.categoryId === FUEL)).toBe(true)
    const financed = withRule(shared, rule({ refundable: true, memberId: HOUSE_MEMBER_ID, categoryId: AUTO }))
    expect([shareOf(financed), financed.splits, financed.refundable, financed.memberId, financed.categoryId]).toEqual([null, [], true, HOUSE_MEMBER_ID, AUTO])
  })
})
