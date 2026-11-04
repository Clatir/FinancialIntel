import { describe, expect, it, vi } from 'vitest'
import { MAX_TAGS, MAX_TAG_LENGTH, parseTags, tagsLost } from '@shared/calc/tags'
import { budgetWorkbook, type MonthRow } from '@shared/export/budget'
import { localDay, plDateTime } from '@shared/format'
import { contentHash, redoneAs, undoPlan } from '@shared/import/batch'
import { formatValue } from '@shared/merge'
import { morningTouch, MORNING_IDLE_MS } from '@shared/notify'
import { importBatchSchema, SCHEMA_VERSION, transactionSchema, type ImportBatch, type Transaction } from '@shared/schema'

// The first code review of N4 (1.15.8): its findings in the pure code, each with the scenario that failed before the fix.
vi.stubGlobal('window', { fi: {} })
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
const { deletedSearchText } = await import('../../src/renderer/lib/recordTitle')

describe('przegląd N4 1, 1 i 9: tagi – jedno dzielenie i jedno porządkowanie dla dodania i dla komunikatu', () => {
  it('„sklep, nowy” przy 19 tagach z „sklep” – jeden nowy, mieści się (dawniej: „s” zamieniane na spację, „klep” nowy)', () => {
    const list = [...Array.from({ length: MAX_TAGS - 2 }, (_, i) => `tag${i}`), 'sklep']
    expect(list).toHaveLength(19)
    expect(tagsLost(list, 'sklep, nowy')).toEqual({ cut: 0, over: 0 })
    expect(tagsLost(list, '#sklep #nowy #kolejny')).toEqual({ cut: 0, over: 1 })
  })

  it('tag z podwójnymi spacjami liczony po ich złączeniu – 38 znaków nie jest „skrócony”', () => {
    const typed = `${'a'.repeat(18)}    ${'b'.repeat(19)}`
    expect(typed.length).toBeGreaterThan(MAX_TAG_LENGTH)
    expect(parseTags(typed)[0]).toHaveLength(38)
    expect(tagsLost([], typed)).toEqual({ cut: 0, over: 0 })
    expect(tagsLost([], `${'s'.repeat(MAX_TAG_LENGTH)}s`)).toEqual({ cut: 1, over: 0 })
  })

  it('długi tag równy temu, który już jest: nic nie dodane – bez „skrócony” (2, 7)', () => {
    const long = 'x'.repeat(MAX_TAG_LENGTH)
    expect(tagsLost([long], `${long}yyyy`)).toEqual({ cut: 0, over: 0 })
    expect(tagsLost([], `${long}yyyy, ${long}zzzz`)).toEqual({ cut: 1, over: 0 })
  })

  it('komunikat liczy te same tagi, które pole doda', () => {
    for (const text of ['#wakacje #remont łazienki', 'Wakacje, remont, wakacje', 'sss, ss  s', '#a, #b', 'jeden']) {
      const added = parseTags(text)
      const free = MAX_TAGS - added.length
      const list = Array.from({ length: free }, (_, i) => `x${i}`)
      expect(tagsLost(list, text).over).toBe(0)
      expect(tagsLost([...list, 'x-extra'], text).over).toBe(added.length ? 1 : 0)
    }
  })
})

describe('przegląd N4 1, 2 i 3 oraz 2, 1, 4, 5: „Cofnij import” – zmiana użytkownika to inna treść niż zapisana przez import (T415)', () => {
  const ACC = '01KDEFACC00000000000000001'
  const X = '01K7T00000000000000000000X'
  const Y = '01K7T00000000000000000000Y'
  const T = (h: number) => `2026-10-01T${String(h).padStart(2, '0')}:00:00.000Z`
  const tx = (id: string, updatedAt: string, over: Partial<Transaction> = {}): Transaction =>
    transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id, createdAt: T(1), updatedAt, date: '2026-09-30', accountId: ACC, amount: -1000, ...over })
  // A (an import at 01:00) created X and Y, as written then.
  const A = (over: Partial<ImportBatch> = {}): ImportBatch =>
    importBatchSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01K7B0000000000000000000BA', createdAt: T(1), updatedAt: T(1), at: T(1), savedAt: T(1), accountId: ACC, fileName: 'L.csv', created: [X, Y], createdHashes: { [X]: contentHash(tx(X, T(1))), [Y]: contentHash(tx(Y, T(1))) }, ...over })
  const plan = (rows: Transaction[], batch = A()) => {
    const byId = new Map(rows.map((t) => [t.id, t]))
    return undoPlan(batch, { tx: (id) => byId.get(id), rules: [] })
  }

  it('treść, nie stempel: zapisy aplikacji (późniejszy import i jego cofnięcie, „Cofnij”, sam zapis kluczy) nic nie liczą', () => {
    // The same content written again later by anyone – no change of the user's (IM.30, IM.31, 2, 5: keys of the other format only).
    expect(plan([tx(X, T(9)), tx(Y, T(9), { bank: { key: 'k1', importedAt: T(1), source: 'lista', altKeys: ['k2'] } as Transaction['bank'] })], A({ createdHashes: { [X]: contentHash(tx(X, T(1))), [Y]: contentHash(tx(Y, T(1), { bank: { key: 'k1', importedAt: T(1), source: 'lista' } as Transaction['bank'] })) } })).changed).toBe(0)
    expect(plan([tx(X, T(9)), tx(Y, T(1))]).changed).toBe(0)
  })

  it('zmiana użytkownika ze stemplem sprzed chwili paczki (zapis w trakcie zapisu, inny zegar) – liczy się (dawniej: nie)', () => {
    // The user's change stamped before the batch's time (2, 4: saved while the undo's writes were flushed; a computer whose
    // clock is behind): the content tells it.
    expect(plan([tx(X, T(0), { note: 'moja' }), tx(Y, T(1))]).changed).toBe(1)
    expect(plan([tx(X, T(1), { categoryId: null, counterparty: 'Inny' }), tx(Y, T(1))]).changed).toBe(1)
  })

  it('import sprzed 1.15.8 (bez odcisków): stempel po zapisie to zmiana; nietknięte dostają odcisk przy cofnięciu', () => {
    const old = A({ createdHashes: {} })
    const p = plan([tx(X, T(2), { note: 'moja' }), tx(Y, T(1))], old)
    expect(p.changed).toBe(1)
    expect(p.hashes).toEqual({ [Y]: contentHash(tx(Y, T(1))) })
    // Its „Cofnij” wrote Y again (stamp 05:00): by content now – no change; X stays counted by its stamp.
    expect(plan([tx(X, T(5), { note: 'moja' }), tx(Y, T(5))], { ...old, createdHashes: p.hashes! }).changed).toBe(1)
    expect(plan([tx(X, T(1)), tx(Y, T(1))]).hashes).toBeNull()
  })

  it('odcisk: bez stempli i kluczy drugiego formatu, niezależny od kolejności pól; inna treść – inny', () => {
    const t = tx(X, T(1), { note: 'a' })
    const reordered = Object.fromEntries(Object.entries(t).reverse()) as Transaction
    expect(contentHash({ ...reordered, updatedAt: T(7), updatedBy: 'LAPTOP' })).toBe(contentHash(t))
    expect(contentHash({ ...t, note: 'b' })).not.toBe(contentHash(t))
  })

  it('„Cofnij” cofnięcia: operacja nietknięta od cofnięcia wraca jak była, zmieniona – ze zmianą użytkownika i zmianą importu (2, 1)', () => {
    const before = tx(X, T(1), { pending: false, note: '' })
    const wrote = tx(X, T(4), { pending: true, note: '' })
    expect(redoneAs(before, wrote, tx(X, T(4), { pending: true, note: '' }))).toEqual({ record: before, kept: false })
    const r = redoneAs(before, wrote, tx(X, T(5), { pending: true, note: 'po cofnięciu' }))
    expect(r.kept).toBe(true)
    expect(r.record).toMatchObject({ id: X, pending: false, note: 'po cofnięciu' })
  })
})

describe('przegląd N4 1, 6: pierwszy dotyk po ciszy nocnej tylko po przerwie (T411)', () => {
  const quiet = { from: '23:00', to: '05:00' }
  const at = (iso: string) => Date.parse(iso)
  it('praca przez koniec ciszy (04:59 → 05:00) nie przenosi na Mostek; okno zostawione na noc – tak', () => {
    // 05:00 Warsaw on 14.10 = 03:00 UTC.
    const now = { date: '2026-10-14', time: '05:00', ms: at('2026-10-14T03:00:10Z') }
    expect(morningTouch(at('2026-10-14T02:59:40Z'), now, quiet)).toBe(false)
    expect(morningTouch(now.ms - MORNING_IDLE_MS + 1, now, quiet)).toBe(false)
    expect(morningTouch(now.ms - MORNING_IDLE_MS, now, quiet)).toBe(true)
    expect(morningTouch(at('2026-10-13T21:30:00Z'), now, quiet)).toBe(true)
  })
})

describe('przegląd N4 1, 7: Excel (operacje + miesiące) bez operacji w okresie – z miesiącami', () => {
  const month: MonthRow = { month: '2026-09', salary: 300000, costs: 0, income: 0, plus: null, inProgress: false, loot: null, balance: 0, rate: null, energy: null, financed: 0 }
  it('okres bez operacji, z miesiącem: oba arkusze; bez niczego: null (komunikat, bez pliku)', () => {
    const sheets = budgetWorkbook([], [month])!
    expect(sheets.map((s) => [s.name, s.rows.length])).toEqual([
      ['Operacje', 0],
      ['Miesiące', 1]
    ])
    expect(budgetWorkbook([], [])).toBeNull()
  })
})

describe('przegląd N4 1, 8: wyszukiwanie usuniętych wpisów – daty w obu zapisach', () => {
  it('operacja z 1 października: „2026-10-01” i „01.10.2026”; dzień usunięcia: jak na ekranie i rrrr-mm-dd', () => {
    const savedAt = '2026-11-03T10:15:00.000Z'
    const hay = deletedSearchText('transactions', { date: '2026-10-01', counterparty: 'Mokka', amount: -1250 }, savedAt, 'LAPTOP')
    expect(hay).toContain('2026-10-01')
    expect(hay).toContain('01.10.2026')
    expect(hay).toContain(plDateTime(savedAt).toLowerCase())
    const d = new Date(savedAt)
    expect(localDay(savedAt)).toBe(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    expect(hay).toContain(localDay(savedAt))
    expect(localDay('nie data')).toBe('')
    expect(hay).toContain('laptop')
    expect(deletedSearchText('months', { month: '2026-10' }, savedAt, null)).toContain('2026-10')
  })
})

describe('przegląd N4 1, 10: liczby w różnicach z minusem typograficznym', () => {
  it('ujemne z „−”, przecinek, bez zaokrąglania; zero bez znaku', () => {
    expect(formatValue(-5)).toBe('−5')
    expect(formatValue(-2.25)).toBe('−2,25')
    expect(formatValue(1.5)).toBe('1,5')
    expect(formatValue(-0)).toBe('0')
    expect(formatValue(1250)).toBe('1250')
    // As written, never rounded: an exponent's form too (2, 9).
    expect(formatValue(-1e-7)).toBe('−1e-7')
    expect(formatValue(0.1 + 0.2)).toBe('0,30000000000000004')
  })
})
