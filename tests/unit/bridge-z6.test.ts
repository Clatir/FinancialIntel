// Z6 (1.21.0, D106 pkt 2, 4, 5 – UX-30, 31, 32, 34): a container's overdue dues in one line of the briefing and one report
// of Meldunki (the state's dues – `cargoStatuses`, never a rule of their own), the month's bar over the briefing, the
// envelope's label only over its pace.
import { describe, expect, it } from 'vitest'
import { arrangeBriefing, briefing, lateFees, lateFeeText, type LateFee } from '@shared/calc/briefing'
import { cargoStatuses, type CargoInput, type CargoStatus } from '@shared/calc/cargoStatus'
import { computeFleet, type DailyState } from '@shared/calc/fleet'
import { inboxItems, INBOX_KINDS, INBOX_TITLE, type InboxInput } from '@shared/calc/inbox'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { balanceSchema, containerSchema, defaultCategoryId, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Container, type Settings, type Transaction } from '@shared/schema'
import { monthBarOf } from '../../src/renderer/features/bridge/monthBar'
import { overPace } from '../../src/renderer/features/month/envelopePace'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K6Z60000000000000000${String(++seq).padStart(4, '0')}`
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
/** Netflix on the 12th, paid in August – September and today's month; October's due still unpaid. */
const netflix = container({ name: 'Netflix', amount: zl(60), dueDay: 12 })
/** The phone on the 20th: November's due 1 day ago – still waiting (3 days of grace), the ones before paid. */
const phone = container({ name: 'Telefon', amount: zl(50), dueDay: 20 })
const transactions = [
  pay(netflix, '2026-08-12'),
  pay(netflix, '2026-09-12'),
  pay(netflix, '2026-11-12'),
  pay(phone, '2026-08-20'),
  pay(phone, '2026-09-20'),
  pay(phone, '2026-10-20'),
  // Groceries (a daily envelope) yesterday and today.
  transactionSchema.parse({ ...base(), date: '2026-11-20', accountId: MBANK_ACCOUNT_ID, amount: -zl(120), categoryId: defaultCategoryId(1, 1) }),
  transactionSchema.parse({ ...base(), date: TODAY, accountId: MBANK_ACCOUNT_ID, amount: -zl(35), categoryId: defaultCategoryId(1, 1) })
]
const containers = [rent, netflix, phone]
const cargo = cargoStatuses(input({ containers, transactions }))

const s0 = createDefaultSettings(AT).settings
const settings: Settings = { ...s0, budget: { ...s0.budget, start: START } }
const fleet = computeFleet({
  settings,
  balances: [balanceSchema.parse({ ...base(), date: START, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })],
  months: [monthPlanSchema.parse({ ...base(), month: '2026-08', salary: zl(6000), envelopes: { [defaultCategoryId(1)]: zl(1500) } })],
  transactions,
  containers,
  now: `${TODAY}T12:00:00+01:00`
})

describe('zaległe opłaty po kontenerze (UX-30, UX-31, D106 pkt 5)', () => {
  it('lateFees: terminy „po terminie” ze stanu Ładowni, po kontenerze, od najstarszego – czekający i zaplanowany poza nimi', () => {
    // The state's own rule: each of the rent's four dues overdue, Netflix's October, the phone's November waiting.
    expect(cargo.filter((s) => s.state === 'overdue').map((s) => [s.name, s.due])).toEqual([
      ['Czynsz', '2026-08-10'],
      ['Czynsz', '2026-09-10'],
      ['Czynsz', '2026-10-10'],
      ['Netflix', '2026-10-12'],
      ['Czynsz', '2026-11-10']
    ])
    const late = lateFees(cargo)
    expect(late.map((f) => [f.name, f.dues.map((s) => s.due), f.amount])).toEqual([
      ['Czynsz', ['2026-08-10', '2026-09-10', '2026-10-10', '2026-11-10'], zl(8000)],
      ['Netflix', ['2026-10-12'], zl(60)]
    ])
    // A payment written ahead closes its due on its day (T398): no overdue fee of it – as the briefing had it.
    const ahead = cargoStatuses(input({ containers: [netflix], transactions: [...transactions, pay(netflix, '2026-11-25')] }))
    expect(ahead.find((s) => s.due === '2026-10-12')?.planned).toBeTruthy()
    expect(lateFees(ahead)).toEqual([])
  })

  it('lateFeeText: jeden termin – jak dotąd; kilka – „N terminy bez płatności (sie–lis)”, z rokiem, gdy nie ten rok', () => {
    const [many, one] = lateFees(cargo) as [LateFee, LateFee]
    expect(lateFeeText(many, money, TODAY)).toBe('Czynsz: 4 terminy bez płatności (sie–lis), razem 8000.00 zł.')
    expect(lateFeeText(one, money, TODAY)).toBe('Netflix 60.00 zł – termin 12.10 minął, brak płatności.')
    const due = (d: string): CargoStatus => ({ ...one.dues[0]!, due: d })
    const five: LateFee = { ...one, dues: ['2025-11-12', '2025-12-12', '2026-01-12', '2026-02-12', '2026-03-12'].map(due), amount: zl(300) }
    expect(lateFeeText(five, money, '2026-03-20')).toBe('Netflix: 5 terminów bez płatności (lis 2025–mar 2026), razem 300.00 zł.')
    const lastYear: LateFee = { ...one, dues: ['2025-10-12', '2025-11-12'].map(due), amount: zl(120) }
    expect(lateFeeText(lastYear, money, '2026-01-05')).toBe('Netflix: 2 terminy bez płatności (paź 2025–lis 2025), razem 120.00 zł.')
  })

  it('odprawa: linia na termin dla powiadomień (te same klucze), na Mostku jedna linia na kontener', () => {
    const items = briefing({ fleet, containers, imports: [], lastConfirmation: TODAY, label: () => '', cargo, money })
    const alerts = items.filter((i) => i.kind === 'cargo')
    // Each due its own key and text, as before – the notifications send each once.
    expect(alerts.map((i) => i.key)).toEqual([
      `cargo:${rent.id}:2026-08-10`,
      `cargo:${rent.id}:2026-09-10`,
      `cargo:${rent.id}:2026-10-10`,
      `cargo:${netflix.id}:2026-10-12`,
      `cargo:${rent.id}:2026-11-10`
    ])
    expect(alerts[0]!.text).toBe('Kontener niezaładowany: Czynsz 2000.00 zł – termin 10.08 minął, brak płatności.')
    expect(alerts.map((i) => i.fee?.containerId)).toEqual([rent.id, rent.id, rent.id, netflix.id, rent.id])
    const notices = dueNotices({ fleet, containers, imports: [], lastConfirmation: TODAY, label: () => '', prefs: DEFAULT_MACHINE_PREFS.notify, quietHours: { from: '23:00', to: '06:00' }, time: '12:00', opened: false, money, cargo }).filter((n) => n.tag === 'cargo')
    expect(notices.map((n) => n.key)).toEqual(alerts.map((i) => i.key))
    // The bridge: one line per container, at its oldest due's place; one due – its own line.
    const view = arrangeBriefing(items, TODAY)
    const rows = [...view.shown, ...view.rest].filter((r) => r.kind === 'cargo')
    expect(rows.map((r) => [r.key, r.text])).toEqual([
      [`cargo:${rent.id}:2026-08-10`, 'Kontener niezaładowany – Czynsz: 4 terminy bez płatności (sie–lis), razem 8000.00 zł.'],
      [`cargo:${netflix.id}:2026-10-12`, 'Kontener niezaładowany: Netflix 60.00 zł – termin 12.10 minął, brak płatności.']
    ])
    expect(rows.map((r) => r.tier)).toEqual(['alarm', 'alarm'])
  })

  const inbox = (over: Partial<InboxInput> = {}): InboxInput => ({
    today: TODAY,
    started: true,
    deliveries: [],
    conflicts: 0,
    problems: 0,
    uncategorized: { count: 0, amount: 0, from: START },
    duplicates: 0,
    members: [],
    memberName: () => '',
    confirmations: [],
    loot: { month: null, amount: 0 },
    money,
    ...over
  })

  it('Meldunki: „Zaległe opłaty” – meldunek na kontener, „Pokaż w Ładowni”; „Zapłacone poza budżetem” – ostatni zaległy termin wcześniejszego miesiąca', () => {
    expect(INBOX_TITLE.fees).toBe('Zaległe opłaty')
    // A deadline gone by: right after the loot, before the data's health.
    expect(INBOX_KINDS.indexOf('fees')).toBe(INBOX_KINDS.indexOf('loot') + 1)
    const items = inboxItems(inbox({ fees: cargo })).filter((i) => i.kind === 'fees')
    expect(items.map((i) => [i.key, i.ref, i.text, i.action, i.due])).toEqual([
      [`fees:${rent.id}`, rent.id, 'Czynsz: 4 terminy bez płatności (sie–lis), razem 8000.00 zł.', 'Pokaż w Ładowni', '2026-10-10'],
      [`fees:${netflix.id}`, netflix.id, 'Netflix 60.00 zł – termin 12.10 minął, brak płatności.', 'Pokaż w Ładowni', '2026-10-12']
    ])
    // Only this month's due overdue: paid in the budget („Zapłacone poza budżetem” settles earlier months' only – T375).
    const now = cargoStatuses(input({ containers: [rent], transactions: [pay(rent, '2026-08-10'), pay(rent, '2026-09-10'), pay(rent, '2026-10-10')] }))
    expect(inboxItems(inbox({ fees: now })).map((i) => [i.kind, i.text, i.due])).toEqual([['fees', 'Czynsz 2000.00 zł – termin 10.11 minął, brak płatności.', undefined]])
    // Before the budget's start: the data folder's reports only.
    expect(inboxItems(inbox({ started: false, fees: cargo }))).toEqual([])
  })
})

describe('pasek miesiąca nad odprawą (UX-32)', () => {
  const daily = (over: Partial<DailyState> = {}): DailyState => ({
    base: zl(100),
    allowance: zl(120),
    left: zl(80),
    daysLeft: 10,
    limit: zl(3000),
    spentBefore: zl(1800),
    spentToday: zl(40),
    returned: 0,
    returnedBy: {},
    energy: zl(80),
    cap: null,
    days: [],
    ...over
  })

  it('koperty codzienne: wydano (do wczoraj + dziś) z limitu, dzień N z M, dziś / przydział', () => {
    expect(monthBarOf({ started: true, today: TODAY, month: '2026-11', daily: daily() })).toEqual({ spent: zl(1840), limit: zl(3000), day: 21, days: 30, today: zl(40), allowance: zl(120) })
    expect(monthBarOf({ started: true, today: '2026-02-03', month: '2026-02', daily: daily() })).toMatchObject({ day: 3, days: 28 })
  })

  it('bez planu tego miesiąca albo przed startem – bez paska', () => {
    expect(monthBarOf({ started: true, today: TODAY, month: '2026-11', daily: null })).toBeNull()
    expect(monthBarOf({ started: false, today: TODAY, month: '2026-11', daily: daily() })).toBeNull()
  })

  it('ten sam silnik co Mostek: wydane z kopert codziennych i przydział z `daily`', () => {
    const d = fleet.daily!
    expect([d.spentBefore, d.spentToday]).toEqual([zl(120), zl(35)])
    expect(monthBarOf(fleet)).toEqual({ spent: d.spentBefore + d.spentToday, limit: d.limit, day: 21, days: 30, today: d.spentToday, allowance: d.allowance })
  })
})

describe('koperta ponad tempem (UX-34, D106 pkt 2)', () => {
  it('etykieta tylko ponad tempem: wydane ponad część limitu za miniony czas miesiąca', () => {
    // 340 zł of 600 zł on the 15th of 30 days: the pace is 300 zł – 40 zł over it.
    expect(overPace({ limit: zl(600), spent: zl(340) }, 0.5)).toBe(zl(40))
    expect(overPace({ limit: zl(600), spent: zl(300) }, 0.5)).toBeNull()
    expect(overPace({ limit: zl(600), spent: zl(100) }, 0.5)).toBeNull()
    // A third of 100 zł is 33,33 zł in whole grosze: 33,34 zł spent – 1 grosz over it.
    expect(overPace({ limit: zl(100), spent: zl(33.34) }, 1 / 3)).toBe(1)
    // No limit, or a month other than this one (no pace) – no label.
    expect(overPace({ limit: 0, spent: zl(10) }, 0.5)).toBeNull()
    expect(overPace({ limit: zl(600), spent: zl(340) }, undefined)).toBeNull()
  })
})
