import { describe, expect, it } from 'vitest'
import { asPayout, deliveries, type DeliveriesInput } from '@shared/calc/dock'
import { categoryUses, type CategoryUseInput } from '@shared/calc/categoryUse'
import { unlinkedBy, withKind } from '@shared/calc/kinds'
import { dockingIdOf, undockingOf, walletOperationId } from '@shared/calc/undock'
import type { IctjEntry } from '@shared/ictj'
import {
  containerSchema,
  dockingSchema,
  gameMonthSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  scheduledSchema,
  SCHEMA_VERSION,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID,
  type Docking,
  type ImportRule,
  type Transaction
} from '@shared/schema'

const AT = '2026-01-01T00:00:00.000Z'
const DOCKED_AT = '2026-10-21T08:00:00.000Z'
let seq = 0
const nextId = () => `01K9000000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const tx = (over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, kind: 'trading', amount: 50_000, counterparty: 'XTB S.A.', ...over })
const entry = (over: Partial<IctjEntry> = {}): IctjEntry => ({ id: nextId(), kind: 'withdrawal', date: '2026-10-14', amount: 50_000, pool: 'current', note: '', updatedAt: null, ...over })
const docking = (t: Transaction, e: IctjEntry | null, over: Partial<Docking> = {}): Docking =>
  dockingSchema.parse({ ...base(), ...(e ? { id: dockingIdOf(e.id) } : {}), createdAt: DOCKED_AT, date: t.date, transactionId: t.id, ictjEntryId: e?.id ?? null, pool: e?.pool ?? null, ...over })
/** The operation `dockDelivery` makes on Portfel XTB for a payout without a pair in the bank. */
const walletOp = (e: IctjEntry, over: Partial<Transaction> = {}) =>
  tx({ id: walletOperationId(e.id), createdAt: DOCKED_AT, accountId: XTB_WALLET_ACCOUNT_ID, date: e.date, amount: e.amount, counterparty: 'XTB', title: 'Wypłata z ICTTJ (pula Bieżące)', ...over })
const input = (over: Partial<DeliveriesInput>): DeliveriesInput => ({ entries: [], transactions: [], dockings: [], start: '2026-10-01', today: '2026-10-28', skipped: [], ictjOn: true, entriesComplete: true, coveredTo: '2026-10-27', ...over })
const only = (o: DeliveriesInput) => {
  const list = deliveries(o)
  expect(list).toHaveLength(1)
  return list[0]!
}
/** The folder after „Wycofaj dokowanie”: its dockings and operations gone. */
const without = (o: DeliveriesInput, plan: NonNullable<ReturnType<typeof undockingOf>>): DeliveriesInput => ({
  ...o,
  dockings: o.dockings.filter((d) => !plan.dockings.some((x) => x.id === d.id)),
  transactions: o.transactions.filter((t) => !plan.transactions.some((x) => x.id === t.id))
})

describe('AP-9: „Wycofaj dokowanie” – co zabiera (AF-7, N-PC-2, T360)', () => {
  it('wypłata zadokowana na Portfelu XTB: dokowanie i operacja Portfela – dostawa znowu do zadokowania na Portfelu', () => {
    const e = entry()
    const op = walletOp(e)
    const o = input({ entries: [e], transactions: [op], dockings: [docking(op, e)] })
    const d = only(o)
    expect(d.state).toBe('docked')
    const plan = undockingOf(d)!
    expect(plan.dockings.map((x) => x.id)).toEqual([dockingIdOf(e.id)])
    expect(plan.transactions.map((t) => t.id)).toEqual([op.id])
    expect(only(without(o, plan))).toMatchObject({ state: 'pending', wallet: true, transaction: null, docking: null })
  })

  it('wypłata z parą w mBanku: tylko dokowanie – operacja banku zostaje i czeka na ponowne dokowanie', () => {
    const e = entry()
    const bank = tx({ bank: { format: 'mbank', key: 'k1', importedAt: AT } as Transaction['bank'] })
    const o = input({ entries: [e], transactions: [bank], dockings: [docking(bank, e)] })
    const plan = undockingOf(only(o))!
    expect(plan.transactions).toEqual([])
    expect(only(without(o, plan))).toMatchObject({ state: 'pending', transaction: { id: bank.id }, docking: null })
  })

  it('wpływ wpisany ręcznie na Portfelu XTB (B69) i operacja XTB z edytora zostają – to nie operacje dokowania', () => {
    const e = entry()
    const typed = asPayout(tx({ accountId: XTB_WALLET_ACCOUNT_ID, kind: 'income', counterparty: '', createdAt: '2026-10-14T18:00:00.000Z' }))
    const o = input({ entries: [e], transactions: [typed], dockings: [docking(typed, e)] })
    const plan = undockingOf(only(o))!
    expect(plan.transactions).toEqual([])
    expect(only(without(o, plan))).toMatchObject({ state: 'pending', transaction: { id: typed.id } })
    const own = tx({ accountId: XTB_WALLET_ACCOUNT_ID, createdAt: '2026-10-14T18:00:00.000Z' })
    expect(undockingOf(only(input({ entries: [e], transactions: [own], dockings: [docking(own, e)] })))!.transactions).toEqual([])
  })

  it('operacja Portfela sprzed B17 (losowe id) – rozpoznana po chwili zapisu razem z dokowaniem', () => {
    const e = entry()
    const old = walletOp(e, { id: nextId() })
    const plan = undockingOf(only(input({ entries: [e], transactions: [old], dockings: [docking(old, e)] })))!
    expect(plan.transactions.map((t) => t.id)).toEqual([old.id])
  })

  it('podwójne dokowanie (dwa komputery – B17): oba dokowania i operacja Portfela; wpływ z XTB bez wpisu – samo dokowanie', () => {
    const e = entry()
    const bank = tx({ bank: { format: 'mbank', key: 'k2', importedAt: AT } as Transaction['bank'] })
    const op = walletOp(e)
    const extra = docking(op, e, { id: nextId() })
    const o = input({ entries: [e], transactions: [bank, op], dockings: [docking(bank, e), extra] })
    const d = deliveries(o).find((x) => x.key === `ictj:${e.id}`)!
    expect(d.extra).toHaveLength(1)
    const plan = undockingOf(d)!
    expect(plan.dockings.map((x) => x.id).sort()).toEqual([dockingIdOf(e.id), extra.id].sort())
    expect(plan.transactions.map((t) => t.id)).toEqual([op.id])
    // An XTB inflow without an entry, docked with a split: the operation stays – a delivery to dock again.
    const inflow = tx({ bank: { format: 'mbank', key: 'k3', importedAt: AT } as Transaction['bank'] })
    const o2 = input({ transactions: [inflow], dockings: [docking(inflow, null, { split: { shields: 40_000, hull: 10_000, goals: {}, taxHold: 0 } })] })
    const plan2 = undockingOf(only(o2))!
    expect(plan2.transactions).toEqual([])
    expect(only(without(o2, plan2))).toMatchObject({ key: `tx:${inflow.id}`, state: 'pending', docking: null })
  })

  it('dostawa niezadokowana: nic do wycofania', () => {
    const e = entry()
    expect(undockingOf(only(input({ entries: [e], transactions: [tx()] })))).toBeNull()
  })
})

describe('AP-9: kategoria w użyciu (AF-37, N-PC-7)', () => {
  const CAT = '01K9CAT0000000000000000001'
  const SUB = '01K9CAT0000000000000000002'
  const none: CategoryUseInput = { transactions: [], months: [], containers: [], scheduled: [], game: [], rules: [], views: [] }
  const ids = new Set([CAT, SUB])
  const plan = (over: Record<string, unknown>) => monthPlanSchema.parse({ ...base(), month: '2026-10', salary: 0, ...over })

  it('nic jej nie używa: można usunąć', () => {
    expect(categoryUses(ids, { ...none, transactions: [tx({ kind: 'expense', categoryId: null })] })).toEqual([])
  })

  it('operacje, części paragonu, plany (koperta, łupy, pokrycie), reguły, kontenery, boje, widoki, oceny dni – każde odwołanie liczone', () => {
    const uses = categoryUses(ids, {
      transactions: [
        tx({ kind: 'expense', amount: -100, categoryId: SUB }),
        tx({ kind: 'expense', amount: -100, categoryId: CAT }),
        tx({ kind: 'expense', amount: -300, splits: [{ id: nextId(), amount: -300, categoryId: SUB, refundable: false, memberId: null, advance: false, note: '' }] })
      ],
      months: [
        plan({ envelopes: { [CAT]: 0 } }),
        plan({ month: '2026-09', loot: { decidedAt: AT, shields: 0, nextMonth: 0, goals: {}, envelopes: { [CAT]: 500 } } }),
        plan({ month: '2026-08', envelopeCovers: [{ id: nextId(), from: '01K9CAT0000000000000000009', to: SUB, amount: 100, at: AT }] }),
        plan({ month: '2026-07', envelopes: { '01K9CAT0000000000000000009': 100 } })
      ],
      rules: [{ categoryId: SUB } as ImportRule, { categoryId: null } as ImportRule],
      containers: [containerSchema.parse({ ...base(), name: 'Prąd', amount: 10_000, dueMonth: '2026-10', amountAt: AT, categoryId: CAT })],
      scheduled: [scheduledSchema.parse({ ...base(), name: 'Wesele', date: '2026-12-01', categoryId: SUB })],
      views: [
        { id: 'v1', name: 'Jedzenie', filter: { categories: [CAT] }, withPeriod: false },
        { id: 'v2', name: 'Inne', filter: { categories: [''] }, withPeriod: false }
      ],
      game: [gameMonthSchema.parse({ ...base(), month: '2026-09', days: { '2026-09-03': { status: 'broken', frozenAt: AT, violations: [{ order: 'envelope', ref: CAT }] } } })]
    })
    expect(uses).toEqual([
      { kind: 'operations', count: 2 },
      { kind: 'parts', count: 1 },
      { kind: 'plans', count: 3 },
      { kind: 'rules', count: 1 },
      { kind: 'containers', count: 1 },
      { kind: 'scheduled', count: 1 },
      { kind: 'views', count: 1 },
      { kind: 'game', count: 1 }
    ])
  })
})

describe('N-PC-4: zmiana rodzaju nie zostawia ukrytego powiązania z celem ani z Ładownią (T362)', () => {
  const CONTAINER = '01K9C0N0000000000000000001'
  const GOAL = '01K9G0A0000000000000000001'

  it('wydatek z kontenera zmieniony na przelew: kontener odpięty (Ładownia brała przelew za opłatę), zmiana kategorii go zostawia', () => {
    const paid = tx({ kind: 'expense', amount: -10_000, containerId: CONTAINER, categoryId: null })
    const moved = withKind(paid, 'transfer')
    expect(moved.containerId).toBeNull()
    expect(unlinkedBy(paid, moved)).toEqual({ goals: [], containers: [CONTAINER] })
    // The same kind keeps it; so does a new category (the link is not the category's).
    expect(withKind(paid, 'expense').containerId).toBe(CONTAINER)
    expect(unlinkedBy(paid, { ...paid, categoryId: '01K9CAT0000000000000000001' })).toEqual({ goals: [], containers: [] })
  })

  it('wydatek z celu i paragon z częściami z celu i z kontenera: zmiana rodzaju mówi, co odpięła', () => {
    const fromGoal = tx({ kind: 'expense', amount: -5_000, goalId: GOAL })
    expect(unlinkedBy(fromGoal, withKind(fromGoal, 'loan'))).toEqual({ goals: [GOAL], containers: [] })
    const receipt = tx({
      kind: 'expense',
      amount: -9_000,
      splits: [
        { id: nextId(), amount: -4_000, categoryId: null, refundable: false, memberId: null, advance: false, note: '', goalId: GOAL },
        { id: nextId(), amount: -5_000, categoryId: null, refundable: false, memberId: null, advance: false, note: '', containerId: CONTAINER }
      ]
    })
    expect(unlinkedBy(receipt, withKind(receipt, 'transfer'))).toEqual({ goals: [GOAL], containers: [CONTAINER] })
    expect(unlinkedBy(receipt, withKind(receipt, 'expense'))).toEqual({ goals: [], containers: [] })
  })
})
