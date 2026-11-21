// Z6b (1.21.0, D106 pkt 5 – UX-30 on the Radar, T548): a container's overdue dues in one row of „Na radarze” – the dues
// of the briefing's line (`lateFees` over the fees' state), never a rule of their own; the items themselves (the calendar,
// the accounts ahead) unchanged.
import { describe, expect, it } from 'vitest'
import { lateFees, lateFeeSpan, lateFeeText, type LateFee } from '@shared/calc/briefing'
import { cargoStatuses, type CargoInput, type CargoStatus } from '@shared/calc/cargoStatus'
import { radar } from '@shared/calc/radar'
import { containerSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Container, type Transaction } from '@shared/schema'
import { radarRows } from '../../src/renderer/features/radar/rows'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K6Z6B000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const container = (over: Partial<Container> = {}): Container => containerSchema.parse({ ...base(), name: 'Czynsz', amount: zl(2000), dueMonth: '2026-01', dueDay: 10, ...over })
const pay = (c: Container, date: string, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(), date, accountId: XTB_WALLET_ACCOUNT_ID, amount: -c.amount, containerId: c.id, ...over })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`
const START = '2026-08-01'
const TODAY = '2026-11-21'
const input = (over: Partial<CargoInput>): CargoInput => ({ containers: [], transactions: [], today: TODAY, coveredTo: {}, start: START, ...over })

/** The rent unpaid since the budget's start in August (the spec's example: „Czynsz: 4 terminy bez płatności (sie–lis)”). */
const rent = container({ name: 'Czynsz' })
/** Netflix on the 12th: October's due alone unpaid. */
const netflix = container({ name: 'Netflix', amount: zl(60), dueDay: 12 })
/** The phone on the 20th: November's due 1 day ago – still waiting (3 days of grace). */
const phone = container({ name: 'Telefon', amount: zl(50), dueDay: 20 })
/** The insurance every 3 months on the 5th (an asteroid): August's and this month's unpaid – both overdue. */
const insurance = container({ name: 'Ubezpieczenie', amount: zl(300), cycleMonths: 3, dueMonth: '2026-08', dueDay: 5 })
const transactions = [
  pay(netflix, '2026-08-12'),
  pay(netflix, '2026-09-12'),
  pay(netflix, '2026-11-12'),
  pay(phone, '2026-08-20'),
  pay(phone, '2026-09-20'),
  pay(phone, '2026-10-20')
]
const containers = [rent, netflix, phone, insurance]
const cargo = cargoStatuses(input({ containers, transactions }))
const items = radar({ today: TODAY, plans: [], containers, tanks: [], loans: [], money, cargo })
const late = (rows: ReturnType<typeof radarRows>) => rows.filter((r) => r.late).map((r) => [r.item.name, r.item.date, r.item.amount, r.late!.dues.length])

describe('Radar: zaległe terminy po kontenerze (UX-30, D106 pkt 5)', () => {
  it('kilka zaległych terminów kontenera – jeden wiersz w miejscu najstarszego, tekst i suma jak w odprawie', () => {
    const rows = radarRows(items, cargo, TODAY)
    // The briefing's line of the rent: four dues, 8 000 zł – the Radar's row says the same, without its sum (the amount's column).
    const rentLate = lateFees(cargo).find((f) => f.containerId === rent.id)!
    expect(lateFeeText(rentLate, money, TODAY)).toBe('Czynsz: 4 terminy bez płatności (sie–lis), razem 8000.00 zł.')
    expect(late(rows)).toEqual([
      ['Ubezpieczenie: 2 terminy bez płatności (sie–lis)', '2026-08-05', zl(600), 2],
      ['Czynsz: 4 terminy bez płatności (sie–lis)', '2026-08-10', zl(8000), 4]
    ])
    const grouped = rows.find((r) => r.late?.containerId === rent.id)!
    expect(grouped.span).toBe('4 terminy bez płatności (sie–lis)')
    const row = grouped.item
    expect(row).toMatchObject({ kind: 'fixed', ref: rent.id, overdue: true, direction: 'out' })
    // The rows of the rent's overdue dues are gone into it; its dues ahead stay, each on its day.
    const rentRows = rows.filter((r) => r.item.ref === rent.id).map((r) => [r.item.date, !!r.item.overdue])
    expect(rentRows).toEqual([
      ['2026-08-10', true],
      ['2026-12-10', false],
      ['2027-01-10', false],
      ['2027-02-10', false]
    ])
    // Each row stands where its container's oldest due stood: the list stays in its order (the months' headers).
    expect(rows.slice(0, 2).map((r) => r.item.key)).toEqual([`late:${insurance.id}`, `late:${rent.id}`])
    expect(rows.map((r) => r.item.date)).toEqual([...rows.map((r) => r.item.date)].sort())
  })

  it('jeden zaległy termin, termin w okresie łaski i inne pozycje – bez zmian', () => {
    const rows = radarRows(items, cargo, TODAY)
    const by = (ref: string) => rows.filter((r) => r.item.ref === ref).map((r) => r.item)
    // Netflix: October's due alone – its own row, as before (its name, its days past it).
    const october = by(netflix.id).find((i) => i.date === '2026-10-12')!
    expect(october).toBe(items.find((i) => i.key === october.key))
    expect(october).toMatchObject({ name: 'Netflix', overdue: true, note: 'po terminie 40 dni' })
    // The phone's due 1 day ago – waiting, not overdue: never grouped.
    const november = by(phone.id).find((i) => i.date === '2026-11-20')!
    expect(november).toBe(items.find((i) => i.key === november.key))
    expect(november.overdue).toBeUndefined()
    // Every item but the grouped containers' overdue dues is a row of its own, the same object, in the same order.
    const gone = items.filter((i) => i.ref === rent.id && i.overdue && i.date !== '2026-08-10')
    expect(gone.map((i) => i.date)).toEqual(['2026-09-10', '2026-10-10', '2026-11-10'])
    const grouped = new Set([rent.id, insurance.id])
    expect(rows.filter((r) => !r.late).map((r) => r.item)).toEqual(items.filter((i) => !(grouped.has(i.ref ?? '') && i.overdue)))
  })

  it('asteroida: zaległe terminy opłaty okresowej też jednym wierszem (rodzaj „asteroid”)', () => {
    // August's due carried, this month's (the 5th) overdue too.
    expect(cargo.filter((s) => s.containerId === insurance.id && s.state === 'overdue').map((s) => s.due)).toEqual(['2026-08-05', '2026-11-05'])
    const rows = radarRows(items, cargo, TODAY)
    const row = rows.find((r) => r.late && r.item.ref === insurance.id)!
    expect(row.item).toMatchObject({ kind: 'asteroid', date: '2026-08-05', name: 'Ubezpieczenie: 2 terminy bez płatności (sie–lis)', amount: zl(600) })
    expect(rows.filter((r) => r.item.ref === insurance.id && r.item.overdue)).toHaveLength(1)
  })

  it('pozycje Radaru nie są zmieniane (kalendarz i salda kont czytają je dalej)', () => {
    const before = structuredClone(items)
    radarRows(items, cargo, TODAY)
    expect(items).toEqual(before)
  })

  it('bez zaległych terminów (albo stan opłat pusty) – wiersz na pozycję', () => {
    expect(radarRows(items, [], TODAY).map((r) => r.item)).toEqual(items)
    expect(radarRows([], cargo, TODAY)).toEqual([])
    // A due the state no longer says overdue (paid outside the budget, a payment today) – back to its own row.
    const paid: CargoStatus[] = cargo.map((s) => (s.containerId === rent.id && s.due !== '2026-08-10' ? { ...s, state: 'paid' } : s))
    expect(late(radarRows(items, paid, TODAY)).map(([name]) => name)).toEqual(['Ubezpieczenie: 2 terminy bez płatności (sie–lis)'])
  })

  it('lateFeeSpan: część linii odprawy bez nazwy i sumy – z rokiem, gdy terminy w dwóch latach albo nie w tym roku', () => {
    const rentLate = lateFees(cargo).find((f) => f.containerId === rent.id)!
    expect(lateFeeSpan(rentLate, TODAY)).toBe('4 terminy bez płatności (sie–lis)')
    const due = (d: string): CargoStatus => ({ ...rentLate.dues[0]!, due: d })
    const five: LateFee = { ...rentLate, dues: ['2025-11-10', '2025-12-10', '2026-01-10', '2026-02-10', '2026-03-10'].map(due) }
    expect(lateFeeSpan(five, '2026-03-20')).toBe('5 terminów bez płatności (lis 2025–mar 2026)')
    expect(lateFeeSpan({ ...rentLate, dues: [due('2026-10-10')] }, TODAY)).toBe('1 termin bez płatności (paź)')
  })
})
