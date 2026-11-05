import { describe, expect, it } from 'vitest'
import type { ConflictEntry, ConflictSide } from '@shared/api'
import { changedSince, conflictSubject } from '@shared/conflicts'
import { dateValueText, diffRecords, fieldLabel, formatValue, readableChanges } from '@shared/merge'
import { formatPln, plDateTime } from '@shared/format'
import { SCHEMAS } from '@shared/records'

const ACC = '01KDEFACC00000000000000001'
const CAT = '01KDEFCAT00000000000000001'
const names = new Map([
  [ACC, 'mBank'],
  [CAT, 'Jedzenie']
])
const amount = (g: number) => `${formatPln(g)} zł`
const side = (record: unknown, relPath = 'transactions/2026/2026-10-14_01M6GDM914YEJ2RP70WV1T1NF8.json'): ConflictSide => ({ relPath, record, error: null, updatedAt: null, mtimeMs: 1 }) as ConflictSide
const conflict = (kind: ConflictEntry['kind'], canonical: unknown, copy: unknown = canonical): Pick<ConflictEntry, 'kind' | 'canonical' | 'copy'> => ({ kind, canonical: side(canonical), copy: side(copy) })

describe('karta konfliktu (AP-27, DA sp. 3): kontrahent, data i kwota zamiast nazwy pliku', () => {
  it('operacja – kontrahent, data dd.mm.rrrr, kwota i konto; bez ULID', () => {
    const tx = { id: '01M6GDM914YEJ2RP70WV1T1NF8', date: '2026-10-14', amount: -2550, counterparty: 'BOLT.EU', accountId: ACC, categoryId: CAT }
    const text = conflictSubject(conflict('transactions', tx), { amount, names })
    expect(text).toBe('BOLT.EU · 14.10.2026 · −25,50 zł · mBank')
    expect(text).not.toMatch(/[0-9A-HJKMNP-TV-Z]{26}/)
    // Without a counterparty: the title, else the category.
    expect(conflictSubject(conflict('transactions', { ...tx, counterparty: '', title: 'Przelew za prąd' }), { amount, names })).toBe('Przelew za prąd · 14.10.2026 · −25,50 zł · mBank')
    expect(conflictSubject(conflict('transactions', { ...tx, counterparty: '' }), { amount, names })).toBe('Jedzenie · 14.10.2026 · −25,50 zł · mBank')
  })

  it('oryginał nieczytelny – z kopii; obie nieczytelne – pusto', () => {
    const c = { kind: 'transactions' as const, canonical: side(null), copy: side({ date: '2026-10-14', amount: -100, counterparty: 'Mokka', accountId: ACC }) }
    expect(conflictSubject(c, { amount })).toBe('Mokka · 14.10.2026 · −1,00 zł')
    expect(conflictSubject({ ...c, copy: side(null) }, { amount })).toBe('')
  })

  it('plan miesiąca, kontener, cel, pożyczka, saldo, boja, ustawienia', () => {
    expect(conflictSubject(conflict('months', { month: '2026-11' }), { amount })).toBe('listopad 2026')
    expect(conflictSubject(conflict('containers', { name: 'Netflix', amount: 6000 }), { amount })).toBe('Netflix · 60,00 zł')
    expect(conflictSubject(conflict('goals', { name: 'Wakacje', target: 500000 }), { amount })).toBe(`Wakacje · ${amount(500000)}`)
    expect(conflictSubject(conflict('loans', { name: 'Dla Ani', counterparty: 'Ania', amount: 100000 }), { amount })).toBe(`Dla Ani · Ania · ${amount(100000)}`)
    expect(conflictSubject(conflict('balances', { kind: 'opening', accountId: ACC, date: '2026-10-01', amount: 500000 }), { amount, names })).toBe(`saldo otwarcia · mBank · 01.10.2026 · ${amount(500000)}`)
    expect(conflictSubject(conflict('scheduled', { name: 'OC auta', date: '2026-12-01', amount: null }), { amount })).toBe('OC auta · 01.12.2026')
    expect(conflictSubject(conflict('fi', { settings: { shipName: 'Jastrząb' } }), { amount })).toBe('ustawienia budżetu · okręt Jastrząb')
  })
})

describe('różnice nazwami pól po polsku, bez JSON (AP-27, DA.22, DA.23, DA.28, DA.30)', () => {
  it('tagi – nazwa pola i słowa zamiast „tags” / „1 pozycja”', () => {
    const [change] = diffRecords({ tags: [] }, { tags: ['laptop'] })
    expect(fieldLabel(change!.path)).toBe('Tagi')
    expect(formatValue(change!.after)).toBe('laptop')
  })

  it('dane z banku dodane po jednej stronie – pola po polsku, nigdy {"format":…}', () => {
    const bank = { format: 'mbank', key: 'k1', description: 'BOLT.EU Tallinn', pending: false }
    const rows = readableChanges(diffRecords({ amount: -100 }, { amount: -100, bank }))
    expect(rows.map((r) => fieldLabel(r.path))).toEqual(['Dane z banku – format pliku', 'Dane z banku – klucz wiersza', 'Opis z banku', 'Transakcja nierozliczona'])
    expect(rows.map((r) => [formatValue(r.before), formatValue(r.after)])).toEqual([
      ['—', 'mbank'],
      ['—', 'k1'],
      ['—', 'BOLT.EU Tallinn'],
      ['—', 'nie']
    ])
    // An object as one value (a choice of „Scal…”) – its fields by name, never JSON.
    const whole = formatValue(bank, 200, { path: ['bank'] })
    expect(whole).not.toMatch(/[{}"]/)
    expect(whole).toContain('format pliku: mbank')
  })

  it('identyfikator wpisu nie jest różnicą (dwa plany jednego miesiąca)', () => {
    const rows = readableChanges(diffRecords({ id: '01KAAAAAAAAAAAAAAAAAAAAAAA', month: '2026-11', salary: 1 }, { id: '01KBBBBBBBBBBBBBBBBBBBBBBB', month: '2026-11', salary: 2 }))
    expect(rows.map((r) => r.path)).toEqual([['salary']])
  })

  it('czas zapisu i daty po polsku – jak wszędzie w aplikacji (plDateTime, AP-23)', () => {
    expect(formatValue('2026-11-03T11:24:23.355Z')).toBe(plDateTime('2026-11-03T11:24:23.355Z'))
    expect(formatValue('2026-11-03T11:24:23.355Z')).toMatch(/^03\.11\.2026, \d{2}:\d{2}$/)
    expect(formatValue('2026-10-14')).toBe('14.10.2026')
    expect(dateValueText('2026-11')).toBe('11.2026')
    // A text that only looks like a date stays as it is.
    expect(formatValue('2026-10-14 zakupy')).toBe('2026-10-14 zakupy')
  })

  it('kwota wewnątrz obiektu przez formater okna (maskowanie Ctrl+$)', () => {
    expect(formatValue({ amount: -1200, categoryId: CAT }, 80, { path: ['splits', '#s1'], names, amount: () => '••• zł' })).toBe('kwota: ••• zł, kategoria: Jedzenie')
  })
})

// ---------------------------------------------------------------- every field of every record (T430)

type Def = { type: string; [k: string]: unknown }
const defOf = (s: unknown): Def => (s as { _zod: { def: Def } })._zod.def
const WRAPPERS = new Set(['optional', 'nullable', 'default', 'catch', 'readonly', 'nonoptional', 'prefault'])
const unwrap = (s: unknown): unknown => {
  let x = s
  for (let d = defOf(x); WRAPPERS.has(d.type) || d.type === 'pipe'; d = defOf(x)) x = d.type === 'pipe' ? d.in : d.innerType
  return x
}
/** The paths `diffRecords` can give for a schema: objects key by key, lists of items with an id by the item, maps by a key. */
function pathsOf(schema: unknown, path: string[], out: string[][], depth = 0): void {
  if (depth > 12) return
  const d = defOf(unwrap(schema))
  if (d.type === 'lazy') return pathsOf((d.getter as () => unknown)(), path, out, depth + 1)
  if (d.type === 'union') return (d.options as unknown[]).forEach((o) => pathsOf(o, path, out, depth + 1))
  if (d.type === 'object')
    for (const [k, v] of Object.entries(d.shape as Record<string, unknown>)) {
      out.push([...path, k])
      pathsOf(v, [...path, k], out, depth + 1)
    }
  if (d.type === 'array') {
    const item = defOf(unwrap(d.element))
    if (item.type === 'object' && (item.shape as Record<string, unknown>).id) pathsOf(unwrap(d.element), [...path, `#${ID}`], out, depth + 1)
  }
  if (d.type === 'record') pathsOf(d.valueType, [...path, ID], out, depth + 1)
}
const ID = '01KDEFAAAAAAAAAAAAAAAAAAAA'
// Polish words and the app's ICT terms that are also keys.
const WORDS = new Set(['start', 'firewall', 'format', 'import'])

describe('każde pole każdego wpisu ma polską nazwę (AP-27, T430)', () => {
  it('żadna ścieżka schematu nie zostawia surowego klucza w nazwie pola', () => {
    const raw: string[] = []
    for (const [kind, schema] of Object.entries(SCHEMAS)) {
      const paths: string[][] = []
      pathsOf(schema, [], paths)
      for (const p of paths) {
        const label = fieldLabel(p, new Map([[ID, 'Pozycja']]))
        const keys = p.filter((x) => !x.startsWith('#') && x !== ID && x.length > 2 && !WORDS.has(x))
        const left = keys.filter((k) => new RegExp(String.raw`(^|[^\p{L}])${k}($|[^\p{L}])`, 'u').test(label))
        if (left.length || label === '(cały wpis)') raw.push(`${kind}: ${p.join('.')} → ${label}`)
      }
    }
    expect(raw).toEqual([])
  })

  it('złożone nazwy: reguła importu, saldo na start domownika, dzień gry, cel z ICTTJ', () => {
    expect(fieldLabel(['settings', 'import', 'rules', '#r1', 'maxAmount'])).toBe('Reguły importu – kwota najwyżej')
    expect(fieldLabel(['settings', 'household', 'members', '#m1', 'opening', 'owed'])).toBe('Domownicy – saldo na start – do oddania')
    expect(fieldLabel(['days', '2026-11-03', 'status'])).toBe('Dni – 03.11.2026 – stan')
    expect(fieldLabel(['ictj', 'amount'])).toBe('Cel z ICTTJ – kwota')
    expect(fieldLabel(['amountAt'])).toBe('Masa od dnia')
    // A newer version's key: as it is (nothing to name it by) – never a crash.
    expect(fieldLabel(['settings', 'futureThing'])).toBe('Ustawienia – futureThing')
  })

  it('wartości wyliczeń po polsku: rodzaj operacji, saldo, sposób podziału, kierunek pożyczki', () => {
    expect(formatValue('expense', 80, { path: ['kind'] })).toBe('wydatek')
    expect(formatValue('transfer', 80, { path: ['kind'] })).toBe('przelew własny')
    expect(formatValue('confirmation', 80, { path: ['kind'] })).toBe('potwierdzenie salda')
    expect(formatValue('wallet', 80, { path: ['settings', 'accounts', '#a', 'kind'] })).toBe('portfel')
    expect(formatValue('percent', 80, { path: ['share', 'mode'] })).toBe('procenty')
    expect(formatValue('given', 80, { path: ['direction'] })).toBe('pożyczona komuś')
    expect(formatValue('tax', 80, { path: ['pool'] })).toBe('podatek')
    // Not an enum's field: the text as it is.
    expect(formatValue('expense', 80, { path: ['note'] })).toBe('expense')
    // A list of values: the values (days of a reminder), not „2 pozycje”.
    expect(formatValue([14, 3], 80, { path: ['remind'] })).toBe('14, 3')
  })

  it('obiekt jako jedna wartość (wybór w „Scal…”) – zagnieżdżone pola i daty po polsku, bez JSON', () => {
    const text = formatValue({ amount: -5000, until: '2026-12-01', closedAt: null }, 200, { path: ['awaitReturn'] })
    expect(text).toBe('kwota: −50,00 zł, do: 01.12.2026, zamknięty: puste')
    expect(text).not.toMatch(/[{}"[\]]/)
  })
})

describe('karta konfliktu – znak kwoty (AP-27)', () => {
  it('operacja i boja ze znakiem (wpływ „+”), kontener i cel bez', () => {
    const t = { amount, signed: (g: number) => `${g > 0 ? '+' : ''}${formatPln(g)} zł`, names }
    expect(conflictSubject(conflict('transactions', { date: '2026-10-10', amount: 400000, counterparty: 'Pracodawca', accountId: ACC }), t)).toBe(`Pracodawca · 10.10.2026 · +${formatPln(400000)} zł · mBank`)
    expect(conflictSubject(conflict('scheduled', { name: 'Zwrot PIT', date: '2026-05-01', amount: 30000 }), t)).toBe('Zwrot PIT · 01.05.2026 · +300,00 zł')
    expect(conflictSubject(conflict('containers', { name: 'Netflix', amount: 6000 }), t)).toBe('Netflix · 60,00 zł')
  })
})

describe('„Scal…” a zmiana w trakcie – po treści (AP-27, T431)', () => {
  const at = (record: unknown, mtimeMs: number) => ({ relPath: 'x.json', record, error: null, updatedAt: null, mtimeMs }) as ConflictSide
  const op = { id: '01M6GDM914YEJ2RP70WV1T1NF8', amount: -1500, note: 'z laptopa', updatedAt: '2026-11-04T10:00:00.000Z', updatedBy: 'LAPTOP' }
  const shown = { canonical: at({ ...op, amount: -1200, note: '' }, 1), copy: at(op, 2) }

  it('kopia z inną treścią – zmieniona; ten sam plik albo tylko nowy czas zapisu – nie', () => {
    expect(changedSince(shown, { ...shown, copy: at({ ...op, amount: -1600 }, 3) })).toBe('copy')
    expect(changedSince(shown, shown)).toBeNull()
    // This computer's save before the merge stamped the original anew: the same content – no change.
    expect(changedSince(shown, { ...shown, canonical: at({ ...op, amount: -1200, note: '', updatedAt: '2026-11-04T11:00:00.000Z', updatedBy: 'DOM' }, 5) })).toBeNull()
    expect(changedSince(shown, { canonical: at({ ...op, amount: -1300, note: '' }, 5), copy: at({ ...op, note: 'inna' }, 6) })).toBe('both')
    // Unreadable now: a change.
    expect(changedSince(shown, { ...shown, canonical: at(null, 7) })).toBe('canonical')
  })
})
