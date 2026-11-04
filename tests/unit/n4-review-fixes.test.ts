import { describe, expect, it, vi } from 'vitest'
import { MAX_TAGS, MAX_TAG_LENGTH, parseTags, tagsLost } from '@shared/calc/tags'
import { budgetWorkbook, type MonthRow } from '@shared/export/budget'
import { plDateTime } from '@shared/format'
import { appWrites, editedOf, undoPlan, userWork, withIds } from '@shared/import/batch'
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

describe('przegląd N4 1, 2 i 3: „Cofnij import” – zmiany użytkownika po zapisach importów i cofnięć (T410)', () => {
  const ACC = '01KDEFACC00000000000000001'
  const X = '01K7T00000000000000000000X'
  const Y = '01K7T00000000000000000000Y'
  const T = (h: number) => `2026-10-01T${String(h).padStart(2, '0')}:00:00.000Z`
  const tx = (id: string, updatedAt: string, over: Partial<Transaction> = {}): Transaction =>
    transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id, createdAt: T(1), updatedAt, date: '2026-09-30', accountId: ACC, amount: -1000, ...over })
  const batch = (id: string, at: string, over: Partial<ImportBatch> = {}): ImportBatch =>
    importBatchSchema.parse({ schemaVersion: SCHEMA_VERSION, id, createdAt: at, updatedAt: at, at, savedAt: at, accountId: ACC, fileName: 'L.csv', ...over })
  const A = (over: Partial<ImportBatch> = {}) => batch('01K7B0000000000000000000BA', T(1), { created: [X, Y], ...over })
  // B (a later import) settled X: its change of X before and after.
  const B = (over: Partial<ImportBatch> = {}) => batch('01K7B0000000000000000000BB', T(3), { updated: [{ before: tx(X, T(1)), after: tx(X, T(1), { pending: false }) }], ...over })
  const plan = (rows: Transaction[], batches: ImportBatch[]) => {
    const byId = new Map(rows.map((t) => [t.id, t]))
    return undoPlan(batches[0]!, { tx: (id) => byId.get(id), rules: [], batches })
  }

  it('B zmienił X, B cofnięty, potem użytkownik zmienił X – ostrzega (dawniej: X na zawsze „dotknięty” przez B, bez ostrzeżenia)', () => {
    const b = B({ undoneAt: T(5) })
    expect(plan([tx(X, T(6)), tx(Y, T(1))], [A(), b]).changed).toBe(1)
    // Only the writes of B and its undo: nothing of the user's (IM.31).
    expect(plan([tx(X, T(5)), tx(Y, T(1))], [A(), b]).changed).toBe(0)
    expect(plan([tx(X, T(3)), tx(Y, T(1))], [A(), B()]).changed).toBe(0)
  })

  it('zmiana użytkownika przed późniejszym importem: zapis B ją niesie – B zapamiętuje ją przy zapisie, okno cofania A ostrzega', () => {
    const before = tx(X, T(2), { note: 'moja' })
    // At B's import (its batch written): X as B found it was the user's work since A wrote it.
    const edited = editedOf([before], appWrites([A()]))
    expect(edited).toEqual([X])
    const b = B({ undoneAt: T(5), edited, updated: [{ before, after: { ...before, pending: false } }] })
    expect(plan([tx(X, T(5), { note: 'moja' }), tx(Y, T(1))], [A(), b]).changed).toBe(1)
    // Without B's word (an import written before 1.15.8): its write hides the change.
    expect(plan([tx(X, T(5), { note: 'moja' }), tx(Y, T(1))], [A(), { ...b, edited: [] }]).changed).toBe(0)
  })

  it('cofnij → „Cofnij” → cofnij: zmiany sprzed pierwszego cofnięcia ostrzegają dalej (dawniej: nowe savedAt je ukrywało)', () => {
    // A undone at 04:00: X changed by the user (03:00), Y not.
    const first = plan([tx(X, T(3)), tx(Y, T(1))], [A()])
    expect(first).toMatchObject({ changed: 1, edited: [X] })
    // Its „Cofnij” at 05:00 wrote both back (stamped 05:00) and set savedAt then; the undo's word kept.
    const redone = A({ savedAt: T(5), edited: withIds([], first.edited) })
    expect(plan([tx(X, T(5)), tx(Y, T(5))], [redone]).changed).toBe(1)
    // A change after the „Cofnij” counts too; the app's own writes never.
    expect(plan([tx(X, T(5)), tx(Y, T(6))], [redone]).changed).toBe(2)
    expect(plan([tx(X, T(5)), tx(Y, T(5))], [A({ savedAt: T(5) })]).changed).toBe(0)
  })

  it('cofnięcie B zapamiętuje operacje A zapisane z powrotem ze zmianą użytkownika – nawet gdy zapis jej nie zmienił', () => {
    // The user changed X after B (04:00); B's undo keeps that change – its write (or none) never hides it.
    const p = plan([tx(X, T(4), { pending: false, note: 'moja' })], [B(), A()])
    expect(p.edited).toEqual([X])
    // An operation no import created (typed by hand) is not kept: no import's undo deletes it.
    const own = B({ updated: [{ before: tx(Y, T(1)), after: tx(Y, T(1), { pending: false }) }] })
    expect(plan([tx(Y, T(4), { pending: false })], [own]).edited).toEqual([])
  })

  it('pomocnicze: ostatni zapis aplikacji, zmiana użytkownika i zbiór bez powtórzeń', () => {
    const w = appWrites([A(), B({ undoneAt: T(5) })])
    expect(w.at.get(X)).toBe(T(5))
    expect(w.at.get(Y)).toBe(T(1))
    expect(userWork(tx(Y, T(1)), w)).toBe(false)
    expect(userWork(tx(Y, T(2)), w)).toBe(true)
    expect(withIds([X], [X, Y, Y])).toEqual([X, Y])
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
  const month: MonthRow = { month: '2026-09', salary: 300000, costs: 0, income: 0, plus: null, inProgress: false, loot: null, balance: 0, rate: null }
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
    expect(hay).toContain(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
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
  })
})
