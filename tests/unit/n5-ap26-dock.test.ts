/**
 * N5 (1.15.9), AP-26 – dokowanie: stany i teksty (AF-47, DO sp. 3, 5, 6, 7, 12, 13, MO.7, PR sp. 2; T435–T438): a payout
 * of the budget's first days waits for the import, a waiting delivery past its window asks for a newer file, the toasts
 * say what was done for the bank's amount, the firewall's word only against the order, a top-up found only in the bank
 * to confirm, docked deliveries listed with ICTTJ off, „ostatnia dostawa” after the docking, one day of a delivery.
 */
import { describe, expect, it } from 'vitest'
import { deliveryDay, deliveries, dockedText, pendingPairsOf, waitingText, type DeliveriesInput, type Delivery } from '@shared/calc/dock'
import { againstFirewall, deliveryItem } from '@shared/calc/briefing'
import { computeFleet, layersSum, type FleetEvent, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { rateDay, type GameInput } from '@shared/calc/game'
import { inboxItems, inboxStarted, topUpsToConfirm, type InboxInput } from '@shared/calc/inbox'
import { deliveryWhy } from '@shared/calc/why'
import { createDefaultSettings } from '@shared/defaults'
import type { IctjEntry } from '@shared/ictj'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { balanceSchema, dockingSchema, MBANK_ACCOUNT_ID, monthPlanSchema, SCHEMA_VERSION, transactionSchema, type Docking, type Settings, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K5900000000000000000${String(++seq).padStart(4, '0')}`
const base = (createdAt = AT) => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt, updatedAt: createdAt })
const money = (g: number) => `${(g / 100).toFixed(2).replace('.', ',')} zł`

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ ...base(`${date}T09:00:00.000Z`), date, accountId: MBANK_ACCOUNT_ID, kind: 'trading', amount, counterparty: 'XTB S.A.', ...over })
const entry = (date: string, amount: number, over: Partial<IctjEntry> = {}): IctjEntry => ({ id: nextId(), kind: 'withdrawal', date, amount, pool: 'current', note: '', updatedAt: null, ...over })
const docking = (t: Transaction, over: Partial<Docking> = {}): Docking => dockingSchema.parse({ ...base(), date: t.date, transactionId: t.id, ...over })
const list = (over: Partial<DeliveriesInput>) => deliveries({ entries: [], transactions: [], dockings: [], start: '2026-10-01', today: '2026-10-20', skipped: [], ictjOn: true, coveredTo: null, ...over })

/**
 * The spec's ship (the docking example): October 2026 from the 1st with 27 640 zł – the hull 15 000 / 21 900 zł
 * (6 × 3 650 zł), the shields 8 640 / 12 000 zł after the salary of 4 000 zł: a top-up of XTB breaks the firewall.
 */
function ship(extra: Partial<FleetInput> = {}, opening = zl(27640), hull = zl(15000)): FleetState {
  const s0 = createDefaultSettings(AT).settings
  const settings: Settings = { ...s0, budget: { ...s0.budget, start: '2026-10-01', initial: { shields: 0, hull, goals: {} } }, layers: { ...s0.layers, assumedCosts: zl(3650) } }
  const s = computeFleet({
    settings,
    balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: opening })],
    months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: {} })],
    transactions: [],
    now: '2026-10-20T12:00:00+02:00',
    ...extra
  })
  expect(layersSum(s)).toBe(s.total)
  return s
}

describe('AF-47 (T435): wpis z pierwszych 3 dni budżetu czeka na import, nie „sprzed startu”', () => {
  const start = '2026-11-01'

  it('DO sp. 2: start 01.11, wpis 03.11 bez wpływu – „czeka na import” (na liście do zadokowania), nie w „sprzed startu”', () => {
    const e = entry('2026-11-03', zl(5000))
    const [d] = list({ start, entries: [e], today: '2026-11-03' })
    expect([d!.state, d!.wallet]).toEqual(['waiting', false])
    // Before 1.15.9: „sprzed startu” – the window (from 31.10) began before the start.
    expect(deliveryItem(d!, '2026-11-03', money)?.text).toBe('Wypłata z ICTTJ 5000,00 zł (03.11) czeka na import z mBanku.')
  })

  it('po oknie, plik banku dalej: Portfel XTB, gdy historia banku sięga pierwszego dnia okna; bez niej – czeka (okno i tak pozwala)', () => {
    const e = entry('2026-11-02', zl(5000))
    const late = { start, entries: [e], today: '2026-11-12', coveredTo: '2026-11-10' }
    expect(list({ ...late, bankFrom: '2026-10-01' })[0]).toMatchObject({ state: 'pending', wallet: true })
    const unseen = list({ ...late, bankFrom: '2026-11-01' })[0]!
    expect(unseen).toMatchObject({ state: 'waiting', wallet: false, unseen: true })
    expect(list(late)[0]).toMatchObject({ state: 'waiting', wallet: false, unseen: true })
    expect(deliveryItem(unseen, '2026-11-12', money)?.text).toBe('Wypłata z ICTTJ 5000,00 zł (02.11) bez pary w mBanku – zadokuj na Portfelu XTB albo pomiń wpis, jeśli pieniądze wpłynęły przed startem budżetu.')
    // Within the window: no such word yet.
    const within = list({ ...late, today: '2026-11-04' })[0]!
    expect([within.state, within.unseen]).toEqual(['waiting', undefined])
  })

  it('wpis sprzed startu dalej „sprzed startu”; para sprzed startu – w saldach otwarcia (B19 bez zmian)', () => {
    expect(list({ start, entries: [entry('2026-10-31', zl(300))], today: '2026-11-12', coveredTo: '2026-11-10', bankFrom: '2026-10-01' })[0]).toMatchObject({ state: 'before-start' })
    const pair = tx('2026-10-31', zl(700))
    expect(list({ start, entries: [entry('2026-11-02', zl(700))], transactions: [pair], today: '2026-11-12', bankFrom: '2026-10-01' })[0]).toMatchObject({ state: 'before-start', transaction: pair })
  })
})

describe('DO sp. 3 (T436): „czeka na import do …” tylko z datą w przyszłości', () => {
  it('okno minęło, a plik banku kończy się w nim – „zaimportuj nowszy” z dniem końca pliku', () => {
    const e = entry('2026-10-27', zl(800))
    const [d] = list({ entries: [e], today: '2026-11-03', coveredTo: '2026-10-29' })
    expect([d!.state, d!.fileTo]).toEqual(['waiting', '2026-10-29'])
    expect(waitingText(d!, '2026-10-30')).toBe('ostatni plik z mBanku kończy się 29.10.2026 – zaimportuj nowszy')
    expect(deliveryItem(d!, '2026-11-03', money)?.text).toBe('Wypłata z ICTTJ 800,00 zł (27.10) czeka na nowszy plik z mBanku (ostatni kończy się 29.10).')
    // Within the window: the day ahead, as before.
    const [w] = list({ entries: [e], today: '2026-10-28', coveredTo: '2026-10-27' })
    expect(w!.fileTo).toBeUndefined()
    expect(waitingText(w!, '2026-10-30')).toBe('FI czeka na import do 30.10.2026')
  })
})

describe('DO sp. 5: toast dokowania mówi, co zrobiono, z kwotą z banku', () => {
  it('„Zapisz podział” zadokowanej – „Zmieniono podział”; inna kwota w banku – zadokowana kwota banku', () => {
    const t = tx('2026-10-16', zl(3000))
    const e = entry('2026-10-16', zl(3000))
    const [docked] = list({ entries: [e], transactions: [t], dockings: [docking(t, { ictjEntryId: e.id, pool: 'current' })] })
    expect(dockedText(docked!, t, false, money)).toBe('Zmieniono podział dostawy 3000,00 zł.')
    const near = tx('2026-10-19', zl(998.5))
    const n = entry('2026-10-16', zl(1000))
    const [d] = list({ entries: [n], transactions: [near], today: '2026-10-28' })
    expect(d).toMatchObject({ state: 'pending', near: true })
    expect(dockedText(d!, near, false, money)).toBe('Zadokowano 998,50 zł.')
    expect(dockedText({ state: 'pending', amount: zl(500) }, null, true, money)).toBe('Zadokowano 500,00 zł na Portfelu XTB.')
  })
})

describe('DO sp. 6 (T438): słowo „firewall” tylko przy naruszeniu', () => {
  const ret = entry('2026-10-15', zl(300), { kind: 'return' })
  const back = tx('2026-10-15', -zl(300))
  const pairs = () => list({ entries: [ret], transactions: [back] })

  it('zwrot do masy przy niepełnych osłonach – silnik liczy parę wbrew rozkazowi: odprawa, Meldunki i powiadomienie mówią to wprost', () => {
    const ds = pairs()
    const s = ship({ transactions: [back], pendingPairs: pendingPairsOf(ds) })
    expect(s.alarms.filter((a) => a.kind === 'firewall').map((a) => a.txId)).toEqual([back.id])
    expect(againstFirewall(s.alarms, ds[0]!)).toBe(true)
    expect(deliveryItem(ds[0]!, s.today, money, true)?.text).toBe('Zwrot do masy z ICTTJ 300,00 zł (15.10) do potwierdzenia – dopłata wbrew rozkazowi firewall (osłony albo kadłub niepełne).')
    const inbox = inboxItems(inboxInput({ deliveries: ds, alarms: s.alarms, today: s.today }))
    expect(inbox.filter((i) => i.kind === 'dock').map((i) => i.text)).toEqual(['Zwrot do masy z ICTTJ 300,00 zł (15.10) do potwierdzenia – dopłata wbrew rozkazowi firewall (osłony albo kadłub niepełne).'])
    const notice = dueNotices(notifyInput(s, ds)).find((n) => n.key === `ictj:${ret.id}`)
    expect(notice?.body).toBe('300,00 zł – dopłata wbrew rozkazowi firewall; potwierdź w Financial Intel.')
  })

  it('zwrot zgodny z rozkazem (osłony i kadłub pełne) – bez słowa „firewall” (przed 1.15.9: „do potwierdzenia – firewall”)', () => {
    const ds = pairs()
    // 44 000 zł: the hull full (21 900 zł), the shields 18 100 zł after the salary – above their 12 000 zł.
    const s = ship({ transactions: [back], pendingPairs: pendingPairsOf(ds) }, zl(44000), zl(21900))
    expect([s.hull.amount, s.shields.amount >= (s.shields.target ?? Infinity)]).toEqual([zl(21900), true])
    expect(s.alarms.filter((a) => a.kind === 'firewall')).toEqual([])
    expect(againstFirewall(s.alarms, ds[0]!)).toBe(false)
    const text = deliveryItem(ds[0]!, s.today, money, againstFirewall(s.alarms, ds[0]!))?.text
    expect(text).toBe('Zwrot do masy z ICTTJ 300,00 zł (15.10) do potwierdzenia.')
    expect(inboxItems(inboxInput({ deliveries: ds, alarms: s.alarms, today: s.today })).map((i) => i.text).join(' ')).not.toContain('firewall')
    expect(dueNotices(notifyInput(s, ds)).find((n) => n.key === `ictj:${ret.id}`)?.body).toBe('300,00 zł – potwierdź w Financial Intel.')
  })
})

describe('DO sp. 12 (T438): dopłata wykryta tylko z mBanku – meldunek do potwierdzenia', () => {
  const topUp = tx('2026-10-15', -zl(200))

  it('alarm firewalla bez wpisu ICTTJ – meldunek „Potwierdź”; po potwierdzeniu (rekord dokowania) znika, alarm i naruszenie zostają', () => {
    const s = ship({ transactions: [topUp] })
    expect(s.alarms.filter((a) => a.kind === 'firewall').map((a) => [a.txId, a.amount])).toEqual([[topUp.id, zl(200)]])
    const ds = list({ transactions: [topUp] })
    expect(ds).toEqual([])
    const due = topUpsToConfirm(s.alarms, ds, () => false, s.today)
    expect(due).toEqual([{ txId: topUp.id, date: '2026-10-15', amount: zl(200) }])
    const items = inboxItems(inboxInput({ topUps: due, today: s.today }))
    expect(items.map((i) => [i.kind, i.ref, i.action])).toEqual([['firewall', topUp.id, 'Potwierdź']])
    // Before the wizard's start (N5 integration – AP-25, ME sp. 3): the budget's reports wait, the firewall's too.
    expect(inboxItems(inboxInput({ topUps: due, today: s.today, started: inboxStarted(true, null) }))).toEqual([])
    // Confirmed: a docking of the operation without an entry – the money, the alarm and the game's violation as they were.
    const confirm = docking(topUp)
    const after = ship({ transactions: [topUp], dockings: [confirm] })
    expect([after.shields.amount, after.alarms.filter((a) => a.kind === 'firewall').length]).toEqual([s.shields.amount, 1])
    expect(topUpsToConfirm(after.alarms, list({ transactions: [topUp], dockings: [confirm] }), (id) => id === topUp.id, after.today)).toEqual([])
    const game = (dockings: Docking[]): GameInput => {
      const s0 = gameSettings()
      return {
        settings: { ...s0, game: { ...s0.game, start: '2026-10-05' } },
        balances: [balanceSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(27640) })],
        months: [monthPlanSchema.parse({ ...base(), month: '2026-10', salary: zl(4000), envelopes: {} })],
        containers: [],
        game: [],
        transactions: [topUp],
        dockings
      }
    }
    const serious = (g: GameInput) => rateDay(g, '2026-10-15').violations.filter((v) => v.order === 'firewall').map((v) => [v.serious, v.amount])
    expect(serious(game([confirm]))).toEqual([[true, zl(200)]])
    expect(serious(game([]))).toEqual([[true, zl(200)]])
  })

  it('dopłata z wpisem ICTTJ (potwierdzenie w oknie dokowania) i starsza niż 30 dni – bez meldunku', () => {
    const ret = entry('2026-10-15', zl(200), { kind: 'return' })
    const s = ship({ transactions: [topUp] })
    expect(topUpsToConfirm(s.alarms, list({ entries: [ret], transactions: [topUp] }), () => false, s.today)).toEqual([])
    expect(topUpsToConfirm(s.alarms, [], () => false, '2026-11-15')).toEqual([])
    expect(topUpsToConfirm(s.alarms, [], () => false, '2026-11-14')).toHaveLength(1)
  })
})

describe('DO sp. 13 (T437): zadokowane dostawy widać także przy wyłączonym ICTTJ', () => {
  it('ICTTJ wyłączony: zadokowany wpis z puli Cele zostaje na liście – z pulą i dniem z dokowania', () => {
    const e = entry('2026-10-12', zl(1500), { pool: 'goals' })
    const t = tx('2026-10-13', zl(1500))
    const d = docking(t, { ictjEntryId: e.id, pool: 'goals', entryDate: '2026-10-12' })
    const on = list({ entries: [e], transactions: [t], dockings: [d] })
    const off = list({ entries: [], transactions: [t], dockings: [d], ictjOn: false })
    expect(off.map((x) => [x.key, x.state, x.entry?.pool, x.entry?.date, x.direction, x.amount, x.fromDocking])).toEqual([[`ictj:${e.id}`, 'docked', 'goals', '2026-10-12', 'in', zl(1500), true]])
    expect(on.map((x) => [x.key, x.state, x.fromDocking])).toEqual([[`ictj:${e.id}`, 'docked', undefined]])
    // Nothing to dock of it and no pair counted again: the engine reads the docking, not the list.
    expect(pendingPairsOf(off).size).toBe(0)
  })
})

describe('MO.7 (T437): jedna data dostawy – dzień pieniędzy w banku', () => {
  it('wpis 19.10, wpływ 20.10: panel, odprawa i „ostatnia dostawa” mówią 20.10', () => {
    const e = entry('2026-10-19', zl(3000), { pool: 'surplus' })
    const t = tx('2026-10-20', zl(3000))
    const [d] = list({ entries: [e], transactions: [t], today: '2026-10-21' })
    expect([d!.date, deliveryDay(d!)]).toEqual(['2026-10-19', '2026-10-20'])
    // A return written in ICTTJ a day before the bank's outflow: the briefing says the bank's day (before: the entry's).
    const ret = entry('2026-10-14', zl(250), { kind: 'return' })
    const out = tx('2026-10-15', -zl(250))
    const [r] = list({ entries: [ret], transactions: [out] })
    expect(deliveryItem(r!, '2026-10-20', money)?.text).toBe('Zwrot do masy z ICTTJ 250,00 zł (15.10) do potwierdzenia.')
    const wallet = list({ entries: [entry('2026-10-05', zl(100))], today: '2026-10-20', coveredTo: '2026-10-19' })[0]!
    expect(deliveryDay(wallet)).toBe('2026-10-05')
    expect(deliveryItem(wallet, '2026-10-20', money)?.text).toContain('(05.10, pula Bieżące)')
  })
})

describe('PR sp. 2 (T437): „ostatnia dostawa” dopiero po dokowaniu', () => {
  it('para do zadokowania i wpływ XTB bez dokowania – nie; zadokowana – tak', () => {
    const log = [
      { date: '2026-10-05', kind: 'trading', amount: zl(1000), txId: 'A', moves: { shields: zl(1000) } },
      { date: '2026-10-12', kind: 'trading', amount: zl(1500), txId: 'B', pending: true, moves: { goals: { G: zl(1500) } } },
      { date: '2026-10-14', kind: 'trading', amount: zl(700), txId: 'C', moves: { shields: zl(700) } }
    ] as FleetEvent[]
    const docked = (id: string) => id === 'A'
    expect(deliveryWhy(log, (id) => id, docked)).toEqual({ date: '2026-10-05', lines: [{ label: 'Dostawa', amount: zl(1000) }, { label: 'Osłony', amount: zl(1000) }] })
    // Without the dockings given (older callers): the pending pair still never counts.
    expect(deliveryWhy(log, (id) => id)?.date).toBe('2026-10-14')
    expect(deliveryWhy(log.slice(1, 2), (id) => id)).toBeNull()
  })
})

function gameSettings(): Settings {
  const s0 = createDefaultSettings(AT).settings
  return { ...s0, budget: { ...s0.budget, start: '2026-10-01', initial: { shields: 0, hull: zl(15000), goals: {} } }, layers: { ...s0.layers, assumedCosts: zl(3650) } }
}

function inboxInput(over: Partial<InboxInput>): InboxInput {
  return {
    today: '2026-10-20',
    started: true,
    deliveries: [],
    conflicts: 0,
    problems: 0,
    uncategorized: { count: 0, amount: 0, from: null },
    duplicates: 0,
    members: [],
    memberName: () => 'X',
    confirmations: [],
    loot: { month: null, amount: 0 },
    money,
    ...over
  }
}

function notifyInput(fleet: FleetState, ds: Delivery[]): Parameters<typeof dueNotices>[0] {
  return {
    fleet,
    containers: [],
    imports: [],
    lastConfirmation: fleet.today,
    label: () => '',
    prefs: DEFAULT_MACHINE_PREFS.notify,
    quietHours: { from: '23:00', to: '05:00' },
    time: '12:00',
    opened: false,
    money,
    deliveries: ds,
    briefingShown: true
  }
}
