import { describe, expect, it } from 'vitest'
import { shareOf, withShare } from '@shared/calc/share'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'
import { bulkApplies, changedBy, opState, tagUndone, type BulkChange } from '../../src/renderer/features/operations/bulkModel'

// D105 (2): the bulk changes of the ticked operations – the field each one sets, the operations it fits (as the editor
// lets them be changed), the same object for one it leaves as it is; the menu's ✓ / „—” and its groups.

const FOOD = defaultCategoryId(1)
const FUN = defaultCategoryId(6)
const AT = '2026-10-01T10:00:00.000Z'
let seq = 0
const nextId = () => `01K7T00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -1000, categoryId: FOOD, ...over })
/** A split receipt: lines of their own categories (no share behind them). */
const receipt = (over: Partial<Transaction> = {}): Transaction =>
  tx({ categoryId: null, splits: [{ id: nextId(), amount: -600, categoryId: FOOD }, { id: nextId(), amount: -400, categoryId: FUN }] as Transaction['splits'], ...over })
/** A shared purchase (D83): its lines follow the share. */
const shared = (over: Partial<Transaction> = {}): Transaction =>
  withShare(tx({ amount: -10000, ...over }), { mode: 'equal', lines: [{ memberId: null, value: 0, gift: false }, { memberId: HOUSE_MEMBER_ID, value: 0, gift: false }] })
const C1 = nextId()
const C2 = nextId()
const G1 = nextId()
const L1 = nextId()

describe('data z kalendarza (day)', () => {
  it('dzień operacji = wybrany; dzień drugiej strony przelewu przesunięty o tyle samo dni', () => {
    const a = tx()
    expect(changedBy(a, { kind: 'day', date: '2026-10-03' })).toEqual({ ...a, date: '2026-10-03' })
    const t = tx({ kind: 'transfer', counterAccountId: XTB_WALLET_ACCOUNT_ID, bothSides: true, counterDate: '2026-10-16' })
    // Back over a year's end: −287 days for both sides.
    expect(changedBy(t, { kind: 'day', date: '2025-12-31' })).toEqual({ ...t, date: '2025-12-31', counterDate: '2026-01-02' })
  })

  it('ten sam dzień – ten sam obiekt', () => {
    const a = tx()
    expect(changedBy(a, { kind: 'day', date: a.date })).toBe(a)
  })
})

describe('tagi', () => {
  it('dokłada tag po kluczu (inna pisownia to ten sam tag – bez zmiany)', () => {
    const a = tx({ tags: ['Wakacje Chorwacja'] })
    expect(changedBy(a, { kind: 'tag', tag: '#remont', on: true })).toEqual({ ...a, tags: ['Wakacje Chorwacja', 'remont'] })
    expect(changedBy(a, { kind: 'tag', tag: '#wakacje-chorwacja', on: true })).toBe(a)
    expect(changedBy(tx(), { kind: 'tag', tag: '  Remont ', on: true })?.tags).toEqual(['Remont'])
  })

  it('tylko tagi operacji – linie paragonu zostają ze swoimi', () => {
    const r = receipt()
    r.splits[0]!.tags = ['Remont']
    const next = changedBy(r, { kind: 'tag', tag: 'remont', on: true })!
    expect(next.tags).toEqual(['remont'])
    expect(next.splits).toBe(r.splits)
    // A line's tag is not the operation's: the menu shows „—”, never ✓.
    expect(opState([r], { kind: 'tag', tag: 'remont', on: true })).toBe('off')
    expect(changedBy({ ...r, tags: ['Remont'] }, { kind: 'tagsClear' })?.splits[0]!.tags).toEqual(['Remont'])
  })

  it('zdejmuje tag po kluczu; ostatni – bez pola tagów; bez tego tagu – ten sam obiekt', () => {
    const a = tx({ tags: ['Wakacje', 'Remont'] })
    expect(changedBy(a, { kind: 'tag', tag: 'wakacje', on: false })).toEqual({ ...a, tags: ['Remont'] })
    const last = changedBy(tx({ tags: ['Remont'] }), { kind: 'tag', tag: '#REMONT', on: false })!
    expect('tags' in last).toBe(false)
    expect(changedBy(a, { kind: 'tag', tag: 'inny', on: false })).toBe(a)
  })

  it('rodzaje jak edytor: wydatek i wpływ zawsze, inne tylko z tagami; pełna lista (20) i pusty tag – nie pasuje', () => {
    const plainTransfer = tx({ kind: 'transfer' })
    expect(changedBy(plainTransfer, { kind: 'tag', tag: 'x', on: true })).toBeNull()
    expect(changedBy(tx({ kind: 'correction' }), { kind: 'tag', tag: 'x', on: true })).toBeNull()
    expect(changedBy(tx({ kind: 'transfer', tags: ['A'] }), { kind: 'tag', tag: 'x', on: true })?.tags).toEqual(['A', 'x'])
    expect(changedBy(tx({ kind: 'income', amount: 5000 }), { kind: 'tag', tag: 'x', on: true })?.tags).toEqual(['x'])
    const full = tx({ tags: Array.from({ length: 20 }, (_, i) => `t${i}`) })
    expect(changedBy(full, { kind: 'tag', tag: 'nowy', on: true })).toBeNull()
    expect(changedBy(tx(), { kind: 'tag', tag: ' # ', on: true })).toBeNull()
  })

  it('wyczyść tagi: bez pola tagów; bez tagów – ten sam obiekt (każdy rodzaj)', () => {
    const a = tx({ tags: ['A', 'B'] })
    const next = changedBy(a, { kind: 'tagsClear' })!
    expect('tags' in next).toBe(false)
    expect({ ...next, tags: a.tags }).toEqual(a)
    const t = tx({ kind: 'transfer' })
    expect(changedBy(t, { kind: 'tagsClear' })).toBe(t)
  })
})

describe('plan / impuls', () => {
  it('tylko wydatki (jak gra) – także paragon z podziałem i wspólny zakup, na całej operacji', () => {
    const a = tx()
    expect(changedBy(a, { kind: 'impulse', to: 'impulse' })).toEqual({ ...a, impulse: 'impulse' })
    const r = receipt()
    expect(changedBy(r, { kind: 'impulse', to: 'plan' })).toEqual({ ...r, impulse: 'plan' })
    expect(changedBy(shared(), { kind: 'impulse', to: 'plan' })?.impulse).toBe('plan')
    expect(changedBy(tx({ kind: 'income', amount: 5000 }), { kind: 'impulse', to: 'plan' })).toBeNull()
    expect(changedBy(tx({ kind: 'transfer' }), { kind: 'impulse', to: null })).toBeNull()
  })

  it('wyczyść – null; ten sam – ten sam obiekt', () => {
    const a = tx({ impulse: 'plan' })
    expect(changedBy(a, { kind: 'impulse', to: null })).toEqual({ ...a, impulse: null })
    expect(changedBy(a, { kind: 'impulse', to: 'plan' })).toBe(a)
    const none = tx()
    expect(changedBy(none, { kind: 'impulse', to: null })).toBe(none)
  })
})

describe('wyjaśniona korekta', () => {
  it('tylko korekty: włączona – true, wyłączona – bez pola (jak edytor)', () => {
    const c = tx({ kind: 'correction', amount: -300, categoryId: null })
    const on = changedBy(c, { kind: 'explained', on: true })!
    expect(on).toEqual({ ...c, explained: true })
    expect(changedBy(on, { kind: 'explained', on: true })).toBe(on)
    const off = changedBy(on, { kind: 'explained', on: false })!
    expect('explained' in off).toBe(false)
    expect(changedBy(c, { kind: 'explained', on: false })).toBe(c)
    expect(changedBy(tx(), { kind: 'explained', on: true })).toBeNull()
  })
})

describe('ładownia i cel (wykluczają się)', () => {
  it('ładownia: wydatek wychodzący bez podziału paragonu; czyści cel', () => {
    const a = tx({ goalId: G1 })
    expect(changedBy(a, { kind: 'container', containerId: C1 })).toEqual({ ...a, containerId: C1, goalId: null })
    const b = tx({ containerId: C1 })
    expect(changedBy(b, { kind: 'container', containerId: C1 })).toBe(b)
    expect(changedBy(b, { kind: 'container', containerId: C2 })).toEqual({ ...b, containerId: C2 })
    // „— nie z ładowni —” takes the container only (the editor's choice): a goal stays.
    expect(changedBy({ ...b, goalId: null }, { kind: 'container', containerId: null })).toEqual({ ...b, containerId: null, goalId: null })
    // A zero amount of an expense: out, as the editor shows it.
    expect(changedBy(tx({ amount: 0 }), { kind: 'container', containerId: C1 })?.containerId).toBe(C1)
  })

  it('ładownia nie pasuje: zwrot towaru, wpływ, przelew, pożyczka, podział paragonu', () => {
    const c: BulkChange = { kind: 'container', containerId: C1 }
    expect(changedBy(tx({ amount: 500 }), c)).toBeNull()
    expect(changedBy(tx({ kind: 'income', amount: 500 }), c)).toBeNull()
    expect(changedBy(tx({ kind: 'transfer' }), c)).toBeNull()
    expect(changedBy(tx({ kind: 'loan' }), c)).toBeNull()
    expect(changedBy(receipt(), c)).toBeNull()
    expect(changedBy(receipt({ containerId: C1 }), { kind: 'container', containerId: null })).toBeNull()
  })

  it('wspólny zakup przyjmuje ładownię i cel – jego linie bez zmian', () => {
    const s = shared()
    expect(shareOf(s)).not.toBeNull()
    const withCargo = changedBy(s, { kind: 'container', containerId: C1 })!
    expect(withCargo).toEqual({ ...s, containerId: C1, goalId: null })
    expect(withCargo.splits).toBe(s.splits)
    expect(changedBy(s, { kind: 'goal', goalId: G1 })).toEqual({ ...s, goalId: G1, containerId: null })
  })

  it('cel: wydatek w obie strony (zwrot towaru wraca do celu) bez podziału paragonu; czyści ładownię', () => {
    const a = tx({ containerId: C1 })
    expect(changedBy(a, { kind: 'goal', goalId: G1 })).toEqual({ ...a, goalId: G1, containerId: null })
    const back = tx({ amount: 700 })
    expect(changedBy(back, { kind: 'goal', goalId: G1 })).toEqual({ ...back, goalId: G1, containerId: null })
    const g = tx({ goalId: G1 })
    expect(changedBy(g, { kind: 'goal', goalId: G1 })).toBe(g)
    expect(changedBy(g, { kind: 'goal', goalId: null })).toEqual({ ...g, goalId: null })
    expect(changedBy({ ...a, goalId: null }, { kind: 'goal', goalId: null })).toEqual({ ...a, goalId: null })
    expect(changedBy(tx({ kind: 'income', amount: 500 }), { kind: 'goal', goalId: G1 })).toBeNull()
    expect(changedBy(receipt(), { kind: 'goal', goalId: G1 })).toBeNull()
  })
})

describe('pożyczka', () => {
  it('tylko operacje rodzaju „pożyczka”; ta sama – ten sam obiekt; bez pożyczki – null', () => {
    const l = tx({ kind: 'loan', amount: 50000, categoryId: null })
    expect(changedBy(l, { kind: 'loan', loanId: L1 })).toEqual({ ...l, loanId: L1 })
    const with1 = { ...l, loanId: L1 }
    expect(changedBy(with1, { kind: 'loan', loanId: L1 })).toBe(with1)
    expect(changedBy(with1, { kind: 'loan', loanId: null })).toEqual({ ...l, loanId: null })
    expect(changedBy(tx(), { kind: 'loan', loanId: L1 })).toBeNull()
  })

  it('spłata częścią wpływu (linia z pożyczką) i podział paragonu – nie pasują, linie bez zmian', () => {
    const inflow = tx({ kind: 'income', amount: 30000, categoryId: null, splits: [{ id: nextId(), amount: 30000, categoryId: null, loanId: L1 }] as Transaction['splits'] })
    expect(changedBy(inflow, { kind: 'loan', loanId: null })).toBeNull()
    expect(changedBy(receipt({ kind: 'loan', amount: -1000 }), { kind: 'loan', loanId: L1 })).toBeNull()
  })
})

describe('stan w menu (opState) i ile pasuje (bulkApplies)', () => {
  it('tag: u wszystkich – ✓, u części – „—”, u żadnej – nic; operacje, do których nie pasuje, się nie liczą', () => {
    const a = tx({ tags: ['Remont'] })
    const b = tx({ tags: ['remont'] })
    const c = tx()
    const transfer = tx({ kind: 'transfer' })
    const on: BulkChange = { kind: 'tag', tag: 'Remont', on: true }
    expect(opState([a, b, transfer], on)).toBe('on')
    expect(opState([a, b, c, transfer], on)).toBe('mixed')
    expect(opState([c, transfer], on)).toBe('off')
    // The menu's toggle: on everywhere – take it off, otherwise add it.
    expect({ kind: 'tag', tag: 'Remont', on: opState([a, b, c], on) !== 'on' }).toEqual(on)
    expect(bulkApplies([a, b, c, transfer], on)).toBe(3)
  })

  it('wyjaśniona: tylko korekty; żadna nie pasuje – nic i 0', () => {
    const c1 = tx({ kind: 'correction', amount: -300, explained: true })
    const c2 = tx({ kind: 'correction', amount: 200 })
    const e = tx()
    const on: BulkChange = { kind: 'explained', on: true }
    expect(opState([c1, e], on)).toBe('on')
    expect(opState([c1, c2, e], on)).toBe('mixed')
    expect(bulkApplies([c1, c2, e], on)).toBe(2)
    expect(opState([e], on)).toBe('off')
    expect(bulkApplies([e], on)).toBe(0)
    expect(opState([], on)).toBe('off')
  })

  it('ładownia: grupa liczy wszystkie pasujące, także już bez ładowni; zaznaczony kontener – ✓ / „—”', () => {
    const a = tx({ containerId: C1 })
    const b = tx()
    const ops = [a, b, tx({ amount: 500 }), receipt(), tx({ kind: 'income', amount: 100 })]
    expect(bulkApplies(ops, { kind: 'container', containerId: null })).toBe(2)
    expect(opState(ops, { kind: 'container', containerId: C1 })).toBe('mixed')
    expect(opState([a], { kind: 'container', containerId: C1 })).toBe('on')
    expect(opState(ops, { kind: 'container', containerId: C2 })).toBe('off')
  })

  it('rodzaj: zadokowana nie pasuje do innego rodzaju (jak pasek)', () => {
    const docked = tx({ kind: 'trading', amount: 30000, categoryId: null })
    const change: BulkChange = { kind: 'kind', to: 'expense' }
    expect(bulkApplies([docked], change, new Set([docked.id]))).toBe(0)
    expect(bulkApplies([docked], change)).toBe(1)
    expect(opState([docked], { kind: 'kind', to: 'trading' }, new Set([docked.id]))).toBe('on')
  })
})

describe('„Cofnij” jednego tagu (tagUndone)', () => {
  it('zdjęty tag wraca tylko na operację, która przyjmuje tagi – przelew bez tagów nie dostaje go z powrotem', () => {
    const before = tx({ tags: ['X'] })
    const off: Extract<BulkChange, { kind: 'tag' }> = { kind: 'tag', tag: 'X', on: false }
    const after = changedBy(before, off)!
    expect(tagUndone(after, before, off)?.tags).toEqual(['X'])
    // The bar made it a transfer since: no tags field there (the editor's) – never one put back on it.
    expect(tagUndone({ ...after, kind: 'transfer' }, before, off)).toBeNull()
    expect(tagUndone({ ...after, kind: 'transfer', tags: ['A'] }, before, off)?.tags).toEqual(['X', 'A'])
  })

  it('przelew, któremu zdjęto jedyny tag – ten sam rodzaj, tag tam był: wraca', () => {
    const before = tx({ kind: 'transfer', tags: ['X'] })
    const off: Extract<BulkChange, { kind: 'tag' }> = { kind: 'tag', tag: 'X', on: false }
    const after = changedBy(before, off)!
    expect(after.tags).toBeUndefined()
    expect(tagUndone(after, before, off)?.tags).toEqual(['X'])
  })
})

describe('dawne zmiany paska bez zmian', () => {
  it('konto, przesunięcie, usunięcie', () => {
    const a = tx()
    expect(changedBy(a, { kind: 'account', accountId: MBANK_ACCOUNT_ID })).toBe(a)
    expect(changedBy(a, { kind: 'account', accountId: XTB_WALLET_ACCOUNT_ID })).toEqual({ ...a, accountId: XTB_WALLET_ACCOUNT_ID })
    expect(changedBy(tx({ kind: 'transfer', counterAccountId: XTB_WALLET_ACCOUNT_ID }), { kind: 'account', accountId: XTB_WALLET_ACCOUNT_ID })).toBeNull()
    expect(changedBy(a, { kind: 'shift', days: 0 })).toBe(a)
    expect(changedBy(a, { kind: 'shift', days: 3 })).toEqual({ ...a, date: '2026-10-17' })
    const gone = changedBy(a, { kind: 'delete' })
    expect(gone).toEqual(a)
    expect(gone).not.toBe(a)
  })
})
