/**
 * 1.19.0, step 2 (D102): the „Nadwyżka” panel's split (`features/household/surplus.ts`) – the surplus of one transfer
 * repaying several household members: said, split „po równo” / „proporcjonalnie do długów” (debts first, always), given
 * „as” income / advance / a loan's repayment, a member „pytaj” asked. Each written record read back by the ledger
 * (`settleHousehold`) – the contract of step 0 (`surplus-baseline.test.ts`).
 */
import { describe, expect, it } from 'vitest'
import { balanceOf, settleHousehold } from '@shared/calc/household'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Split, type Transaction } from '@shared/schema'
import { debtShares, evenShares, loanPart, shareMax, sharesOf, surplusView, writeSurplus, type SurplusAs, type SurplusInput } from '../../src/renderer/features/household/surplus'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01KN9SP${String(++seq).padStart(19, '0')}`
const MAMA = `01KMEM${'0'.repeat(19)}4`
const TATA = `01KMEM${'0'.repeat(19)}5`
const BABCIA = `01KMEM${'0'.repeat(19)}6`
const LOAN = `01KMPK${'0'.repeat(19)}1`
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount, ...over })
const bought = (amount: number, memberId: string) => tx('2026-10-05', -zl(amount), { categoryId: defaultCategoryId(1, 1), refundable: true, memberId, counterparty: 'Sklep' })
const line = (memberId: string | null, amount: number, over: Partial<Split> = {}): Split => ({ id: nextId(), amount: zl(amount), categoryId: null, refundable: false, memberId, advance: false, note: '', ...over })

/** Mama owes 100 zł, Tata 150 zł; Tata sends 400 zł, „+ także za Mama” (her debt) – the editor's start. Mama „pytaj”. */
function setup(over: { amount?: number; owed?: Record<string, number>; splits?: Split[]; asks?: string[]; payerAdvance?: boolean } = {}): SurplusInput {
  const owed = over.owed ?? { [MAMA]: zl(100), [TATA]: zl(150) }
  const asks = over.asks ?? [MAMA]
  return {
    amount: over.amount ?? zl(400),
    payerId: TATA,
    payerAdvance: over.payerAdvance ?? false,
    splits: over.splits ?? [line(MAMA, 100)],
    owed: (id) => owed[id] ?? 0,
    defaultAs: (id): SurplusAs | null => (asks.includes(id) ? null : 'income')
  }
}
const flat = (splits: readonly Split[]) => splits.map((s) => [s.memberId, s.amount, s.inflowKind ?? 'repay', s.advance, s.loanId ?? null])
/** The ledger's reading of the record written (Tata's money with the lines), both purchases before it. */
function ledgerOf(input: SurplusInput, splits: Split[]) {
  const t = tx('2026-10-10', input.amount, { kind: 'income', memberId: TATA, inflowKind: 'repay', advance: input.payerAdvance, counterparty: 'PIOTR', splits })
  return settleHousehold([bought(100, MAMA), bought(150, TATA), t])
}

describe('D102 krok 2: widok nadwyżki', () => {
  it('przelew 400 zł Taty za siebie i Mamę: spłaca Tata 150, Mama 100, nadwyżka 150 – cała u Taty (reszta)', () => {
    const v = surplusView(setup())!
    expect(v.people.map((p) => [p.memberId, p.payer, p.repaid, p.amount, p.as])).toEqual([
      [TATA, true, zl(150), zl(150), 'income'],
      [MAMA, false, zl(100), 0, null]
    ])
    expect([v.surplus, v.free, v.loans, v.payerRest]).toEqual([zl(150), zl(150), 0, zl(150)])
  })

  it('bez części innej osoby – nic do podziału (panel się nie pokazuje)', () => {
    expect(surplusView(setup({ splits: [] }))).toBeNull()
    expect(surplusView(setup({ splits: [line(null, 50)] }))).toBeNull()
  })

  it('kwota nie pokrywa długów: free < 0 – nie ma czego dzielić', () => {
    expect(surplusView(setup({ amount: zl(200) }))!.free).toBe(-zl(50))
  })

  it('część Mamy ponad dług (wpisana ręcznie) to jej nadwyżka; „pytaj” – niewybrana', () => {
    const v = surplusView(setup({ splits: [line(MAMA, 175)] }))!
    expect(v.people.find((p) => p.memberId === MAMA)).toMatchObject({ repaid: zl(100), amount: zl(75), as: null })
    expect(v.people.find((p) => p.payer)).toMatchObject({ amount: zl(75) })
  })

  it('nadawca „pytaj” bez wyboru reszty – niewybrany; z `advance` – zaliczka', () => {
    expect(surplusView(setup({ asks: [MAMA, TATA] }))!.people[0]!.as).toBeNull()
    expect(surplusView(setup({ asks: [MAMA, TATA], payerAdvance: true }))!.people[0]!.as).toBe('advance')
  })
})

describe('D102 krok 2: po równo / proporcjonalnie do długów – najpierw całe długi', () => {
  it('po równo: 150 zł na dwie osoby – 75 Mamie (zaliczka), 75 Tacie; księga: Mama bez długu z depozytem 75', () => {
    const input = setup()
    expect(evenShares(surplusView(input)!).get(MAMA)?.amount).toBe(zl(75))
    const splits = writeSurplus(input, new Map([[MAMA, { amount: zl(75), as: 'advance' }]]))
    expect(flat(splits)).toEqual([
      [MAMA, zl(100), 'repay', false, null],
      [MAMA, zl(75), 'advance', true, null]
    ])
    const ledger = ledgerOf(input, splits)
    expect(balanceOf(ledger, MAMA)).toMatchObject({ owed: 0, deposit: zl(75) })
    expect(balanceOf(ledger, TATA)).toMatchObject({ owed: 0, deposit: 0 })
  })

  it('po równo z groszami: 1,00 zł na trzy osoby – po 33 gr, 34 gr reszty nadawcy (T3)', () => {
    const input = setup({ amount: zl(251), splits: [line(MAMA, 100), line(BABCIA, 0)] })
    const v = surplusView(input)!
    expect(v.free).toBe(100)
    const shares = evenShares(v)
    expect([shares.get(MAMA)?.amount, shares.get(BABCIA)?.amount]).toEqual([33, 33])
    const after = surplusView({ ...input, splits: writeSurplus(input, shares) })!
    expect(after.people.find((p) => p.payer)?.amount).toBe(34)
  })

  it('proporcjonalnie do długów: 150 zł w proporcji 100 : 150 – Mamie 60, Tacie 90', () => {
    const input = setup({ asks: [] })
    const shares = debtShares(surplusView(input)!)!
    expect(shares.get(MAMA)).toEqual({ amount: zl(60), as: 'income' })
    const v = surplusView({ ...input, splits: writeSurplus(input, shares) })!
    expect(v.people.map((p) => [p.memberId, p.amount, p.as])).toEqual([
      [TATA, zl(90), 'income'],
      [MAMA, zl(60), 'income']
    ])
  })

  it('proporcjonalnie – nikt nic nie był winien: brak (przycisk wyłączony)', () => {
    expect(debtShares(surplusView(setup({ owed: {} }))!)).toBeNull()
  })

  it('część Mamy zaniżona (50 z jej 100 długu): po równo – najpierw jej cały dług, oboje rozliczeni', () => {
    const input = setup({ splits: [line(MAMA, 50)] })
    const splits = writeSurplus(input, evenShares(surplusView(input)!))
    expect(flat(splits)[0]).toEqual([MAMA, zl(100) + zl(75), 'repay', false, null])
    const ledger = ledgerOf(input, splits)
    expect([balanceOf(ledger, MAMA).owed, balanceOf(ledger, TATA).owed]).toEqual([0, 0])
  })
})

describe('D102 krok 2: „jako” – przychód, zaliczka, pytaj, pożyczka', () => {
  it('Mama „pytaj” bez odpowiedzi: nadwyżka na linii spłaty (liczona jako przychód), bez inflowKind', () => {
    const input = setup()
    const splits = writeSurplus(input, new Map([[MAMA, { amount: zl(75), as: null }]]))
    expect(flat(splits)).toEqual([[MAMA, zl(175), 'repay', false, null]])
    expect(splits[0]).not.toHaveProperty('inflowKind')
    expect(surplusView({ ...input, splits })!.people.find((p) => p.memberId === MAMA)).toMatchObject({ amount: zl(75), as: null })
  })

  it('zmiana „jako” zostawia kwotę; id obu linii zostają (historia, zwroty)', () => {
    const repay = line(MAMA, 100)
    const extra = line(MAMA, 75, { inflowKind: 'advance', advance: true })
    const input = setup({ splits: [repay, extra] })
    const v = surplusView(input)!
    expect(v.people.find((p) => p.memberId === MAMA)).toMatchObject({ amount: zl(75), as: 'advance' })
    const shares = sharesOf(v)
    shares.set(MAMA, { amount: zl(75), as: 'income' })
    const splits = writeSurplus(input, shares)
    expect(splits.map((s) => s.id)).toEqual([repay.id, extra.id])
    expect(flat(splits)).toEqual([
      [MAMA, zl(100), 'repay', false, null],
      [MAMA, zl(75), 'income', false, null]
    ])
  })

  it('nadwyżka 0 – zostaje jedna linia spłaty (osoba w podziale)', () => {
    const input = setup({ splits: [line(MAMA, 100), line(MAMA, 75, { inflowKind: 'advance', advance: true })] })
    expect(flat(writeSurplus(input, new Map([[MAMA, { amount: 0, as: 'advance' }]])))).toEqual([[MAMA, zl(100), 'repay', false, null]])
  })

  it('najwyżej to, co zostaje po długach i częściach innych osób', () => {
    const v = surplusView(setup({ splits: [line(MAMA, 100), line(BABCIA, 0)] }))!
    const shares = sharesOf(v)
    shares.set(BABCIA, { amount: zl(40), as: 'income' })
    expect(shareMax(v, shares, MAMA)).toBe(zl(110))
  })

  it('linie mojego przychodu i pożyczki zostają na miejscach i liczą się poza wolną nadwyżką', () => {
    const mine = line(null, 20)
    const loan = line(null, 30, { loanId: LOAN })
    const input = setup({ splits: [mine, line(MAMA, 100), loan] })
    const v = surplusView(input)!
    expect([v.loans, v.free]).toEqual([zl(30), zl(100)])
    const splits = writeSurplus(input, new Map([[MAMA, { amount: zl(40), as: 'advance' }]]))
    expect(splits[0]).toEqual(mine)
    expect(splits[splits.length - 1]).toEqual(loan)
  })

  it('nadwyżka Mamy na spłatę pożyczki: najwyżej tyle, ile zostało z pożyczki; reszta zostaje u niej', () => {
    const input = setup({ splits: [line(MAMA, 100), line(MAMA, 75, { inflowKind: 'advance', advance: true })] })
    const { splits, moved } = loanPart(input, surplusView(input)!, MAMA, { id: LOAN, open: zl(50) })
    expect(moved).toBe(zl(50))
    expect(flat(splits)).toEqual([
      [MAMA, zl(100), 'repay', false, null],
      [MAMA, zl(25), 'advance', true, null],
      [null, zl(50), 'repay', false, LOAN]
    ])
  })

  it('nadwyżka Taty (reszta) na spłatę pożyczki – z reszty kwoty, jego dług spłacony najpierw', () => {
    const input = setup()
    const { splits, moved } = loanPart(input, surplusView(input)!, TATA, { id: LOAN, open: zl(500) })
    expect(moved).toBe(zl(150))
    const v = surplusView({ ...input, splits })!
    expect(v.people.find((p) => p.payer)).toMatchObject({ repaid: zl(150), amount: 0 })
    expect(v.loans).toBe(zl(150))
    expect(balanceOf(ledgerOf(input, splits), TATA).owed).toBe(0)
  })

  it('kwota nie pokrywa długów: zmiana „jako” nie podnosi części Mamy do jej długu (nic z reszty Taty po cichu)', () => {
    // 200 zł: Mama's line 50 (of her 100), her surplus 20 as advance; Tata owes 150 – not all covered.
    const input = setup({ amount: zl(200), splits: [line(MAMA, 50), line(MAMA, 20, { inflowKind: 'advance', advance: true })] })
    expect(surplusView(input)!.free).toBeLessThan(0)
    const splits = writeSurplus(input, new Map([[MAMA, { amount: zl(20), as: 'income' }]]))
    expect(flat(splits)).toEqual([
      [MAMA, zl(50), 'repay', false, null],
      [MAMA, zl(20), 'income', false, null]
    ])
  })

  it('bez nadwyżki – nic na pożyczkę, linie bez zmian', () => {
    const input = setup({ amount: zl(250) })
    const r = loanPart(input, surplusView(input)!, TATA, { id: LOAN, open: zl(500) })
    expect(r.moved).toBe(0)
    expect(r.splits).toEqual(input.splits)
  })
})
