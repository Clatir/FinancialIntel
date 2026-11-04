import { describe, expect, it } from 'vitest'
import { householdBefore, type FleetInput } from '@shared/calc/fleet'
import { balanceOf, settleHousehold } from '@shared/calc/household'
import { categoryIndex } from '@shared/calc/operations'
import { keptCovers, linkRepayments, matchCovers, moreSureCovers } from '@shared/calc/repayments'
import { createDefaultSettings } from '@shared/defaults'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, importGroups, owedWithFile, planImport, rowShares, type Choice, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { balanceSchema, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type Transaction } from '@shared/schema'

const AT = '2026-10-01T00:00:00.000Z'
const NOW = '2026-11-04T18:00:00.000Z'
const zl = (v: number) => Math.round(v * 100)
let seq = 0
const makeId = () => `01KN1S${String(++seq).padStart(20, '0')}`
const settings = createDefaultSettings(AT).settings
const HEALTH = defaultCategoryId(5, 0)
const TATA = '01KN1STATA0000000000000001'
const BABCIA = '01KN1SBABC0000000000000002'
const member = (id: string, name: string, over: Partial<HouseholdMember> = {}): HouseholdMember => ({ id, name, bankNames: [], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
const members = [...settings.household.members, member(TATA, 'Tata', { bankNames: ['PIOTR TESTOWY'] }), member(BABCIA, 'Babcia', { via: TATA })]
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
/** „Leki dla Babci”: a purchase she finances, to pay back (IM.25). */
const leki = tx('2026-10-20', -zl(100), { categoryId: HEALTH, refundable: true, memberId: BABCIA, counterparty: 'Apteka' })

const IN = 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY'
const row = (date: string, amount: number, counterparty: string, title: string, operation = IN): MbankRow => ({
  line: 1,
  date,
  description: `${counterparty}, ${title}  ${operation}`,
  operation,
  counterparty,
  title,
  accountNo: '',
  category: '',
  amount: zl(amount),
  pending: false,
  balanceAfter: null
})
const fileOf = (rows: MbankRow[]): MbankFile => ({ format: 'lista', client: 'JAN KAPITAN', account: null, period: null, rows, skipped: [] })
const ctx = { rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), members }
const choicesOf = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
/** Tata's two transfers of IM.25: 200 zł on 29.10, 300 zł („od Taty i Babci”) on 01.11. */
const TATA_ROWS = [row('2026-11-01', 300, 'PIOTR TESTOWY', 'OD TATY I BABCI'), row('2026-10-29', 200, 'PIOTR TESTOWY', 'ZWROT ZA KURS XTB')]
const plan = (rows = TATA_ROWS): ImportPlan => planImport(fileOf(rows), MBANK_ACCOUNT_ID, [leki], ctx)
const tataGroup = (p: ImportPlan) => importGroups(p).find((g) => g.label === 'PIOTR TESTOWY')!
/** „w tym za Babcia” at the group's decision of Tata's money. */
const withBabcia = (p: ImportPlan, amount: number, over: Partial<Choice> = {}): ImportChoices => {
  const g = tataGroup(p)
  return choicesOf({ groups: { [g.group]: { ...g.proposed, shares: [{ memberId: BABCIA, amount: zl(amount), advance: true }], ...over } } })
}
const owes = (babcia: number, tata = 0) => new Map([[BABCIA, zl(babcia)], [TATA, zl(tata)]])
const partsByDate = (p: ImportPlan, created: readonly Transaction[]) =>
  [...created].sort((a, b) => a.date.localeCompare(b.date)).map((t) => [t.date, t.amount, t.splits.map((s) => [s.memberId, s.amount])])

describe('AP-7 (AF-27): „w tym za X” grupy rozkładany po kolei, nigdy ponad należność', () => {
  it('IM.25: „w tym za Babcia 100” w grupie dwóch wpłat Taty – Babcia raz 100 zł (spłaca leki), Tacie 400 zł', () => {
    const p = plan()
    const { create } = buildImport(p, withBabcia(p, 100), { now: NOW, makeId, rules: [], owed: owes(100) })
    expect(partsByDate(p, create)).toEqual([
      ['2026-10-29', zl(200), [[BABCIA, zl(100)]]],
      ['2026-11-01', zl(300), []]
    ])
    // The balances: Babcia owes nothing and holds nothing; Tata's 400 zł is his advance (his setting).
    const ledger = settleHousehold([leki, ...create])
    expect(balanceOf(ledger, BABCIA)).toMatchObject({ owed: 0, deposit: 0 })
    expect(balanceOf(ledger, TATA)).toMatchObject({ owed: 0, deposit: zl(400) })
  })

  it('po kolei od najstarszej wpłaty, każda najwyżej swoją kwotą; razem najwyżej wpisane i to, co osoba ma oddać', () => {
    const p = plan()
    const spread = (amount: number, babcia: number | null) => {
      const s = rowShares(p, withBabcia(p, amount), babcia == null ? undefined : owes(babcia))
      return [...p.rows].sort((a, b) => a.row.date.localeCompare(b.row.date)).map((r) => (s.parts.get(r.key) ?? []).map((x) => x.amount))
    }
    // More than she owes: only what she owes.
    expect(spread(150, 100)).toEqual([[zl(100)], []])
    // More than the first transfer: the rest from the next one.
    expect(spread(250, 300)).toEqual([[zl(200)], [zl(50)]])
    // She owes nothing: no part at all.
    expect(spread(100, 0)).toEqual([[], []])
    // No debts known (a caller without the ledger): the amount typed, spread the same way.
    expect(spread(250, null)).toEqual([[zl(200)], [zl(50)]])
    // The spread says where each line went (the note at the group's „w tym za”).
    const s = rowShares(p, withBabcia(p, 150), owes(100))
    expect(s.spread.get(`g:${tataGroup(p).group}`)).toEqual([{ line: 0, memberId: BABCIA, typed: zl(150), given: [{ key: expect.any(String), date: '2026-10-29', amount: zl(100) }] }])
    expect(s.rows.get(`g:${tataGroup(p).group}`)).toMatchObject({ sum: zl(500) })
  })

  it('własna część wiersza (wpisana) – jak wpisana; grupa daje tylko to, czego wiersze nie dały', () => {
    const p = plan()
    const later = p.rows.find((r) => r.row.date === '2026-11-01')!
    const choices = withBabcia(p, 100)
    choices.rows[later.key] = { ...choices.groups[tataGroup(p).group]!, shares: [{ memberId: BABCIA, amount: zl(60), advance: true }] }
    const { create } = buildImport(p, choices, { now: NOW, makeId, rules: [], owed: owes(100) })
    expect(partsByDate(p, create)).toEqual([
      ['2026-10-29', zl(200), [[BABCIA, zl(40)]]],
      ['2026-11-01', zl(300), [[BABCIA, zl(60)]]]
    ])
  })

  it('temat z „w tym za” rozkłada tak samo; wiersz pominięty nie bierze części', () => {
    const p = plan()
    const g = tataGroup(p)
    const first = p.rows.find((r) => r.row.date === '2026-10-29')!
    const choices = choicesOf({ themes: { [g.theme]: { ...g.proposed, shares: [{ memberId: BABCIA, amount: zl(100), advance: true }] } }, skip: { [first.key]: true } })
    const { create } = buildImport(p, choices, { now: NOW, makeId, rules: [], owed: owes(100) })
    expect(partsByDate(p, create)).toEqual([['2026-11-01', zl(300), [[BABCIA, zl(100)]]]])
  })

  it('pieniądze tematu = wiersze grup bez własnej decyzji (start „w tym za” tematu); grupa ze swoją decyzją – jej', () => {
    // Tata's money under two names of his in the bank: two groups, one theme.
    const p = plan([...TATA_ROWS, row('2026-10-30', 50, 'TESTOWY PIOTR', 'NA ZAKUPY')])
    const gs = importGroups(p).filter((g) => g.direction === 'in')
    expect(gs).toHaveLength(2)
    expect(new Set(gs.map((g) => g.theme)).size).toBe(1)
    const [big, small] = [...gs].sort((a, b) => b.sum - a.sum)
    const theme = `t:${big!.theme}`
    const own = `g:${small!.group}`
    const none = rowShares(p, choicesOf())
    expect([none.rows.get(theme)?.sum, none.rows.get(own)?.sum]).toEqual([zl(550), zl(50)])
    const decided = rowShares(p, choicesOf({ groups: { [small!.group]: small!.proposed } }))
    expect([decided.rows.get(theme)?.sum, decided.rows.get(own)?.sum]).toEqual([zl(500), zl(50)])
  })

  it('należność z zakupami tego pliku: zakup „finansuje Babcia” w pliku podnosi to, co ma oddać; jej zaliczka go pokrywa najpierw', () => {
    const apteka = row('2026-10-27', -80, 'APTEKA ZDROWIE', '', 'ZAKUP PRZY UŻYCIU KARTY W KRAJU')
    const p = plan([...TATA_ROWS, apteka])
    const bought = importGroups(p).find((g) => g.direction === 'out')!
    const choices = withBabcia(p, 200)
    choices.groups[bought.group] = { ...bought.proposed, kind: 'expense', categoryId: HEALTH, refundable: true, memberId: BABCIA }
    const ledgerNow = settleHousehold([leki])
    const owed = owedWithFile(p, choices, (id) => balanceOf(ledgerNow, id), members.map((m) => m.id))
    expect(owed.get(BABCIA)).toBe(zl(180))
    expect(owed.get(TATA)).toBe(0)
    // Her advance pays the file's purchase first.
    const withDeposit = owedWithFile(p, choices, (id) => (id === BABCIA ? { owed: 0, deposit: zl(50) } : { owed: 0, deposit: 0 }), [BABCIA])
    expect(withDeposit.get(BABCIA)).toBe(zl(30))
    const { create } = buildImport(p, choices, { now: NOW, makeId, rules: [], owed })
    expect(create.filter((t) => t.amount > 0).flatMap((t) => t.splits.map((s) => s.amount))).toEqual([zl(180)])
  })
})

describe('AP-7 (D91 b, DM sp. 1–2): pewne dopasowanie także przy podziale na osoby i przy wpłacie ponad cały dług', () => {
  const item = (txId: string, date: string, amount: number) => ({ txId, date, amount: zl(amount) })

  it('wpłata co najmniej równa całemu długowi wiąże wszystkie otwarte zakupy (DM sp. 2)', () => {
    expect(matchCovers([item('A', '2026-10-02', 100)], zl(300), '2026-10-10')).toEqual({ sure: ['A'], options: [] })
    expect(matchCovers([item('A', '2026-10-02', 100), item('B', '2026-10-05', 50)], zl(250), '2026-10-10')).toEqual({ sure: ['A', 'B'], options: [] })
    // Less than all: as before (none sure).
    expect(matchCovers([item('A', '2026-10-02', 100), item('B', '2026-10-05', 50)], zl(120), '2026-10-10').sure).toBeNull()
    // Two of the same amount and more than both together: both are paid.
    expect(matchCovers([item('A', '2026-10-02', 80), item('D', '2026-10-07', 80)], zl(200), '2026-10-10').sure).toEqual(['A', 'D'])
    // More than 500 open purchases: never.
    const many = Array.from({ length: 501 }, (_, i) => ({ txId: `T${i}`, date: '2026-10-01', amount: 1 }))
    expect(matchCovers(many, 1000, '2026-10-10').sure).toBeNull()
  })

  const input = (transactions: Transaction[]): Pick<FleetInput, 'settings' | 'balances' | 'transactions'> => ({
    settings: { ...settings, budget: { start: '2026-10-01', initial: { shields: zl(10000), hull: 0, goals: {} } }, household: { members, assignFrom: null } },
    balances: [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(10000) })],
    transactions
  })
  const rossmann = tx('2026-10-21', -zl(40), { categoryId: HEALTH, refundable: true, memberId: TATA, counterparty: 'Rossmann' })
  const split = (amount: number, over: Partial<Transaction> = {}) =>
    tx('2026-10-25', zl(300), { kind: 'income', memberId: TATA, counterparty: 'PIOTR TESTOWY', splits: [{ id: makeId(), amount: zl(amount), categoryId: null, refundable: false, memberId: BABCIA, advance: true, note: '' }], ...over })

  it('import: wpłata Taty z częścią Babci – każda osoba ze swoim pewnym zakupem (linkRepayments)', () => {
    const t = split(100)
    const links = linkRepayments(input([leki, rossmann, t]), new Set([t.id]), '2026-11-04')
    expect([...links.get(t.id)!.covers].sort()).toEqual([leki.id, rossmann.id].sort())
  })

  it('edytor: dopisana część Babci wiąże jej pewny zakup, gdy Tata ma już swój wskazany (moreSureCovers); bez części – zdjęty', () => {
    const t = split(100, { covers: [rossmann.id] })
    const all = input([leki, rossmann, t])
    const before = householdBefore(all, t, '2026-11-04')
    const ledger = settleHousehold([leki, rossmann, t], { assignFrom: null })
    const byId = new Map([leki, rossmann].map((x) => [x.id, x]))
    expect(moreSureCovers(t, before, ledger, (id) => byId.get(id))).toEqual({ covers: [rossmann.id, leki.id], coversOpening: undefined })
    // Named already for both: nothing to add; a part of 0 zł – nothing sure.
    expect(moreSureCovers({ ...t, covers: [rossmann.id, leki.id] }, before, ledger, (id) => byId.get(id))).toBeNull()
    expect(moreSureCovers(split(0, { covers: [rossmann.id] }), before, ledger, (id) => byId.get(id))).toBeNull()
    // Babcia's part taken off: her purchase is no longer named by Tata's money.
    const without = { ...t, covers: [rossmann.id, leki.id], splits: [] }
    expect(keptCovers(without, before, ledger)).toEqual({ covers: [rossmann.id], coversOpening: undefined })
    expect(keptCovers({ ...t, covers: [rossmann.id, leki.id] }, before, ledger)).toBeNull()
  })
})

describe('AP-7: część zaliczki albo przychodu osoby – nie spłata, bez limitu długu', () => {
  it('linia „zaliczka” grupy idzie jak wpisana; spłaty tej osoby z innych linii nie zabiera', () => {
    const p = plan()
    const g = tataGroup(p)
    const choices = choicesOf({
      groups: {
        [g.group]: {
          ...g.proposed,
          shares: [
            { memberId: BABCIA, amount: zl(150), advance: true, inflowKind: 'advance' },
            { memberId: BABCIA, amount: zl(100), advance: true }
          ]
        }
      }
    })
    const s = rowShares(p, choices, owes(100))
    const first = p.rows.find((r) => r.row.date === '2026-10-29')!
    const second = p.rows.find((r) => r.row.date === '2026-11-01')!
    // The advance part (150) takes the first transfer's 150, its repayment (100) the 50 left and 50 of the next one.
    expect(s.parts.get(first.key)?.map((x) => [x.inflowKind ?? 'repay', x.amount])).toEqual([
      ['advance', zl(150)],
      ['repay', zl(50)]
    ])
    expect(s.parts.get(second.key)?.map((x) => [x.inflowKind ?? 'repay', x.amount])).toEqual([['repay', zl(50)]])
    expect(s.total.get(BABCIA)).toBe(zl(100))
  })
})
