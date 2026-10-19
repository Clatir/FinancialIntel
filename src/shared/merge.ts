// adapted from ICTTJ src/shared/merge.ts @ 84a8339
/**
 * Field-level differences and three-way merges of records (JSON values).
 * - Objects are compared key by key; arrays of objects with a string `id` (split lines, categories,
 *   accounts…) item by item; any other array, and scalars, as one value.
 * - merge3(base, mine, theirs): a field changed on one side only takes that side; changed on both sides to different
 *   values it is a conflict (`choose` decides, by default "mine"). Bookkeeping fields (updatedAt, updatedBy,
 *   schemaVersion, computed) never conflict: the newer / theirs wins.
 */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type Path = Array<string>

export interface FieldChange {
  path: Path
  before: unknown
  after: unknown
}

export interface MergeConflict {
  path: Path
  base: unknown
  mine: unknown
  theirs: unknown
}

export type Side = 'mine' | 'theirs'

/** Never shown nor in conflict: written by the app on every save. */
export const BOOKKEEPING: ReadonlySet<string> = new Set(['updatedAt', 'updatedBy', 'schemaVersion', 'computed'])

const isObject = (v: unknown): v is Record<string, unknown> => v != null && typeof v === 'object' && !Array.isArray(v)
const isIdArray = (v: unknown): v is Array<{ id: string }> =>
  Array.isArray(v) && v.every((x) => isObject(x) && typeof x.id === 'string')

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b || a == null || b == null) return a === b || (a == null && b == null)
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => deepEqual(x, b[i]))
  }
  if (isObject(a) && isObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) if (!deepEqual(a[k], b[k])) return false
    return true
  }
  return false
}

/** The same content, the save stamps aside (`BOOKKEEPING` at the top level). */
export function sameContentAs(a: unknown, b: unknown): boolean {
  if (!isObject(a) || !isObject(b)) return deepEqual(a, b)
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!BOOKKEEPING.has(k) && !deepEqual(a[k], b[k])) return false
  return true
}

export const pathKey = (p: Path) => p.join('\u0001')

/** Leaf-level changes from `a` to `b` (bookkeeping fields at the top level are left out). */
export function diffRecords(a: unknown, b: unknown, path: Path = []): FieldChange[] {
  if (deepEqual(a, b)) return []
  if (isObject(a) && isObject(b)) {
    const out: FieldChange[] = []
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (path.length === 0 && BOOKKEEPING.has(k)) continue
      out.push(...diffRecords(a[k], b[k], [...path, k]))
    }
    return out
  }
  if (isIdArray(a) && isIdArray(b) && (a.length || b.length)) {
    const out: FieldChange[] = []
    const ids = [...new Set([...a.map((x) => x.id), ...b.map((x) => x.id)])]
    const ma = byIds(a)
    const mb = byIds(b)
    for (const id of ids) {
      const x = ma.get(id)
      const y = mb.get(id)
      // The same item (an array of thousands – the import's rules – changed in one place): nothing to look into (W36).
      if (x && y) {
        if (x !== y) out.push(...diffRecords(x, y, [...path, `#${id}`]))
      } else out.push({ path: [...path, `#${id}`], before: x, after: y })
    }
    return out
  }
  return [{ path, before: a, after: b }]
}

/** An array's items by id – the first of an id, as `find` would (W36: one map, not a pass over the array per id). */
function byIds<T extends { id: string }>(arr: readonly T[]): Map<string, T> {
  const out = new Map<string, T>()
  for (const x of arr) if (!out.has(x.id)) out.set(x.id, x)
  return out
}

interface MergeResult<T> {
  merged: T
  conflicts: MergeConflict[]
}

/**
 * Three-way merge. `base` = the version both sides started from (undefined when unknown: then every difference
 * between mine and theirs is a conflict).
 */
export function merge3<T>(base: unknown, mine: T, theirs: T, choose: (conflict: MergeConflict) => Side = () => 'mine'): MergeResult<T> {
  const conflicts: MergeConflict[] = []
  const merged = mergeAt(base, mine, theirs, [], conflicts, choose) as T
  return { merged, conflicts }
}

const ABSENT = undefined
/** A key the known base did not have (B47): unlike an unknown base, a side that adds it alone is no conflict. */
const MISSING = Symbol('missing')

function mergeAt(rawBase: unknown, mine: unknown, theirs: unknown, path: Path, conflicts: MergeConflict[], choose: (c: MergeConflict) => Side): unknown {
  if (deepEqual(mine, theirs)) return mine
  const known = rawBase !== ABSENT
  const base = rawBase === MISSING ? undefined : rawBase
  if (known && deepEqual(base, mine)) return theirs
  if (known && deepEqual(base, theirs)) return mine
  if (isObject(mine) && isObject(theirs)) {
    const b = isObject(base) ? base : undefined
    const out: Record<string, unknown> = {}
    const keys = [...new Set([...Object.keys(theirs), ...Object.keys(mine)])]
    for (const k of keys) {
      if (path.length === 0 && BOOKKEEPING.has(k)) {
        out[k] = theirs[k] ?? mine[k]
        continue
      }
      const v = mergeAt(b ? (k in b ? b[k] : MISSING) : ABSENT, mine[k], theirs[k], [...path, k], conflicts, choose)
      if (v !== undefined) out[k] = v
    }
    return out
  }
  if (isIdArray(mine) && isIdArray(theirs)) {
    const b = isIdArray(base) ? base : !known ? undefined : []
    const mm = byIds(mine)
    const tm = byIds(theirs)
    const bm = b ? byIds(b) : undefined
    // Order: theirs, then items only I added (in my order).
    const ids = [...theirs.map((x) => x.id), ...mine.map((x) => x.id).filter((id) => !tm.has(id))]
    const out: unknown[] = []
    for (const id of ids) {
      const m = mm.get(id)
      const t = tm.get(id)
      const bi = bm?.get(id)
      const p = [...path, `#${id}`]
      if (m && t) {
        out.push(mergeAt(bi, m, t, p, conflicts, choose))
      } else if (m && !t) {
        // Theirs removed it (it was in base) or I added it.
        if (!bi && b !== undefined) out.push(m)
        else if (bi && deepEqual(bi, m)) continue
        else if (pick({ path: p, base: bi, mine: m, theirs: undefined }, conflicts, choose) === 'mine') out.push(m)
      } else if (t && !m) {
        if (!bi && b !== undefined) out.push(t)
        else if (bi && deepEqual(bi, t)) continue
        else if (pick({ path: p, base: bi, mine: undefined, theirs: t }, conflicts, choose) === 'theirs') out.push(t)
      }
    }
    // Removals on both sides, or of an item only in base: nothing to add.
    return out
  }
  return pick({ path, base: known ? base : undefined, mine, theirs }, conflicts, choose) === 'mine' ? mine : theirs
}

function pick(c: MergeConflict, conflicts: MergeConflict[], choose: (c: MergeConflict) => Side): Side {
  conflicts.push(c)
  return choose(c)
}

/** The value at a path of `merge3` / `diffRecords` (a `#id` part = the array item of that id); undefined = none. */
export function valueAt(root: unknown, path: Path): unknown {
  let v: unknown = root
  for (const part of path) {
    if (part.startsWith('#') && isIdArray(v)) v = v.find((x) => x.id === part.slice(1))
    else if (isObject(v)) v = v[part]
    else return undefined
    if (v === undefined) return undefined
  }
  return v
}

/** Choices keyed by the conflict path (from a dialog) as a `choose` function; unknown paths take `fallback`. */
export function chooser(choices: ReadonlyMap<string, Side> | Record<string, Side>, fallback: Side = 'mine'): (c: MergeConflict) => Side {
  const get = (k: string) => (choices instanceof Map ? choices.get(k) : (choices as Record<string, Side>)[k])
  return (c) => get(pathKey(c.path)) ?? fallback
}

// ------------------------------------------------------------------ labels for the UI

const LABELS: Record<string, string> = {
  date: 'Data',
  month: 'Miesiąc',
  name: 'Nazwa',
  amount: 'Kwota',
  note: 'Notatka',
  kind: 'Rodzaj',
  time: 'Godzina',
  accountId: 'Konto',
  categoryId: 'Kategoria',
  refundable: 'Finansuje domownik',
  memberId: 'Domownik',
  advance: 'Reszta jako zaliczka',
  covers: 'Pokrywa wydatki',
  splits: 'Podział',
  'splits.amount': 'Podział – kwota',
  'splits.categoryId': 'Podział – kategoria',
  'splits.refundable': 'Podział – finansuje domownik',
  'splits.memberId': 'Podział – domownik',
  'splits.advance': 'Podział – reszta jako zaliczka',
  counterparty: 'Kontrahent',
  title: 'Tytuł',
  impulse: 'Plan czy impuls',
  logNote: 'Dziennik kapitański',
  repaid: 'Zwrot należności (przed 1.3.0)',
  counterAccountId: 'Konto docelowe',
  bothSides: 'Przelew dla obu kont',
  counterBank: 'Dane z banku drugiego konta',
  'counterBank.pending': 'Druga strona nierozliczona',
  'counterBank.description': 'Opis z banku drugiego konta',
  counterDate: 'Dzień drugiej strony',
  containerId: 'Kontener',
  goalId: 'Cel',
  loanId: 'Pożyczka',
  bank: 'Dane z banku',
  'bank.pending': 'Transakcja nierozliczona',
  'bank.description': 'Opis z banku',
  salary: 'Pensja',
  envelopes: 'Koperty',
  loot: 'Podział łupów',
  target: 'Kwota celu',
  priority: 'Priorytet',
  cycleMonths: 'Cykl (miesiące)',
  dueMonth: 'Miesiąc płatności',
  dueDay: 'Dzień płatności',
  archived: 'Archiwum',
  settings: 'Ustawienia',
  'settings.shipName': 'Nazwa okrętu',
  'settings.sync': 'Synchronizacja',
  'settings.sync.remoteChanges': 'Zmiany z drugiego komputera',
  'settings.layoutPresets': 'Zapisane układy',
  'settings.accounts': 'Konta',
  'settings.categories': 'Kategorie',
  'settings.categories.name': 'Kategorie – nazwa',
  'settings.categories.envelope': 'Kategorie – koperta',
  'settings.categories.archived': 'Kategorie – archiwum',
  'settings.layers': 'Warstwy',
  'settings.orders': 'Rozkazy',
  'settings.budget': 'Start budżetu',
  'settings.import': 'Import',
  'settings.import.rules': 'Reguły importu',
  'settings.import.ownNames': 'Własne nazwy w banku',
  'settings.household': 'Domownicy',
  'settings.household.since': 'Rozliczenia z domownikami od',
  'settings.household.members': 'Domownicy',
  'settings.household.members.name': 'Domownicy – imię',
  'settings.household.members.bankNames': 'Domownicy – nazwy w banku',
  'settings.household.members.inflow': 'Domownicy – reszta wpłaty',
  'settings.household.members.via': 'Domownicy – przekazuje przez',
  'settings.household.members.opening': 'Domownicy – saldo na start',
  'settings.household.members.archived': 'Domownicy – archiwum',
  // Every record's own fields (N92): the history and the window of changes speak Polish everywhere.
  share: 'Wspólnie',
  'share.mode': 'Wspólnie – sposób podziału',
  'share.lines': 'Wspólnie – osoby',
  gift: 'Prezent',
  'splits.gift': 'Podział – prezent',
  'splits.note': 'Podział – notatka',
  'bank.counterparty': 'Dane z banku – kontrahent',
  'bank.operation': 'Dane z banku – rodzaj operacji',
  'bank.category': 'Dane z banku – kategoria mBanku',
  'bank.key': 'Dane z banku – klucz wiersza',
  'bank.importedAt': 'Dane z banku – zaimportowano',
  'bank.bankName': 'Dane z banku – nazwa',
  type: 'Typ',
  from: 'Od',
  until: 'Do',
  to: 'Do',
  direction: 'Kierunek',
  schedule: 'Harmonogram',
  'schedule.date': 'Harmonogram – data',
  'schedule.amount': 'Harmonogram – kwota',
  closedAt: 'Zamknięta',
  pool: 'Pula ICTTJ',
  split: 'Podział dostawy',
  'split.shields': 'Podział dostawy – osłony',
  'split.hull': 'Podział dostawy – kadłub',
  'split.taxHold': 'Podział dostawy – rezerwa na PIT-38',
  'split.goals': 'Podział dostawy – cele',
  transactionId: 'Operacja',
  correctionId: 'Korekta',
  deadline: 'Termin',
  source: 'Źródło',
  'source.ictjEntryId': 'Źródło – wpis ICTTJ',
  entryDate: 'Data wpisu ICTTJ',
  ictjEntryId: 'Wpis ICTTJ',
  activeFrom: 'Od chwili',
  achievedAt: 'Osiągnięty',
  archivedAt: 'Zarchiwizowany',
  amountAt: 'Masa od dnia',
  past: 'Wcześniejsze stany',
  transfers: 'Przeniesienia',
  'transfers.amount': 'Przeniesienia – kwota',
  'transfers.to': 'Przeniesienia – do celu',
  decidedAt: 'Decyzja',
  'loot.shields': 'Podział łupów – osłony',
  'loot.nextMonth': 'Podział łupów – następny miesiąc',
  'loot.goals': 'Podział łupów – cele',
  ictj: 'Cel z ICTTJ',
  'settings.layers.shieldSalaries': 'Warstwy – osłony (pensje)',
  'settings.layers.hullMonths': 'Warstwy – kadłub (miesiące)',
  'settings.layers.assumedCosts': 'Warstwy – przyjęte koszty',
  'settings.orders.minShieldSalaries': 'Rozkazy – minimum osłon',
  'settings.orders.cargoLimitPct': 'Rozkazy – limit ładowni',
  'settings.orders.quietHours': 'Rozkazy – cisza nocna',
  'settings.orders.impulseThreshold': 'Rozkazy – próg dziennika',
  'settings.orders.firewall': 'Rozkazy – firewall',
  'settings.budget.start': 'Start budżetu – dzień',
  'settings.budget.initial': 'Start budżetu – podział',
  'settings.game': 'Gra',
  'settings.game.start': 'Gra – start',
  'settings.game.promoteDays': 'Gra – dni do awansu',
  'settings.game.windowDays': 'Gra – okno dni',
  'settings.game.seriousEnvelopePct': 'Gra – próg poważnego przekroczenia',
  'settings.game.demoteSerious': 'Gra – poważne naruszenia do degradacji',
  'settings.game.missionDays': 'Gra – dni misji',
  'settings.game.noSpend': 'Gra – dni bez wydatków',
  'settings.ictj': 'ICTTJ',
  'settings.ictj.forecastId': 'ICTTJ – scenariusz prognozy',
  'settings.ictj.skipped': 'ICTTJ – pominięte wpisy',
  'settings.import.aliases': 'Połączone nazwy',
  'settings.import.notSimilar': 'Nazwy „to nie to samo”',
  'settings.import.notDuplicates': 'Pary „to nie duplikat”',
  'settings.import.lastImport': 'Ostatni import',
  'settings.import.coveredTo': 'Zasięg plików z banku',
  'settings.import.accountNumbers': 'Numery rachunków',
  'settings.import.log': 'Dziennik importów',
  'settings.seeded': 'Ustawienia startowe'
}

/** A path's part that is an id (ULID, `#id` of a list item): named by `names` when it is known (N92). */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/

/**
 * Polish label of a changed field: known fields by name, items of lists by their position in the path; an id in the
 * path (an envelope's category, a goal of the loot) by its name from `names`.
 */
export function fieldLabel(path: Path, names?: ReadonlyMap<string, string>): string {
  const base = fieldLabelOf(path)
  const id = [...path].reverse().map((p) => (p.startsWith('#') ? p.slice(1) : p)).find((p) => ULID.test(p))
  const name = id ? names?.get(id) : undefined
  return name && !base.includes(name) ? `${base.replace(/ – [0-9A-HJKMNP-TV-Z]{26}$/, '')} – ${name}` : base
}

function fieldLabelOf(path: Path): string {
  const named = path.filter((p) => !p.startsWith('#'))
  const key = named.join('.')
  if (LABELS[key]) return LABELS[key]
  for (let i = named.length - 1; i > 0; i--) {
    const prefix = LABELS[named.slice(0, i).join('.')]
    if (prefix) return `${prefix} – ${named.slice(i).join('.')}`
  }
  return key || '(cały wpis)'
}

/**
 * The fields holding an amount in grosze (B7): the history, the window of changes from the other computer and the
 * conflicts show them in złoty – hidden with the amounts (Ctrl+$) – never as raw grosze. A `*` is any key (an envelope's
 * category, a goal's id).
 */
const AMOUNT_FIELDS = [
  'amount',
  'splits.amount',
  'salary',
  'target',
  'maxAmount',
  'envelopes.*',
  'loot.shields',
  'loot.nextMonth',
  'loot.goals.*',
  'split.shields',
  'split.hull',
  'split.taxHold',
  'split.goals.*',
  'schedule.amount',
  'transfers.amount',
  'past.target',
  'settings.layers.assumedCosts',
  'settings.orders.impulseThreshold',
  'settings.budget.initial.shields',
  'settings.budget.initial.hull',
  'settings.budget.initial.goals.*',
  'settings.household.members.opening.owed',
  'settings.household.members.opening.deposit',
  'settings.import.rules.maxAmount'
].map((f) => f.split('.'))

/** Is the field at `path` an amount in grosze (B7)? Items of lists (`#id`, `[n]`) do not count as keys. */
export function isAmountPath(path: Path): boolean {
  const named = path.filter((p) => !p.startsWith('#') && !/^\[\d+\]$/.test(p))
  return AMOUNT_FIELDS.some((f) => f.length === named.length && f.every((k, i) => k === '*' || k === named[i]))
}

/** The same for a flat key („splits[0].amount”, „settings.budget.initial.hull”) – the conflicts' list. */
export const isAmountKey = (key: string): boolean => isAmountPath(key.replace(/\[\d+\]/g, '').split('.').filter(Boolean))

/** Short text of a value for the diff lists. */
export function formatValue(v: unknown, max = 80): string {
  if (v === undefined) return '—'
  if (v === null || v === '') return 'puste'
  if (typeof v === 'string') return v.length > max ? `${v.slice(0, max - 1)}…` : v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.length === 0 ? 'puste' : `${v.length} ${v.length === 1 ? 'pozycja' : v.length < 5 ? 'pozycje' : 'pozycji'}`
  const s = JSON.stringify(v)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
