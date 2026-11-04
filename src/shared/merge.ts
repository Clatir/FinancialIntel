// adapted from ICTTJ src/shared/merge.ts @ 84a8339
import { warsawStamp } from './calc/dates'
import { formatPln } from './format'
import { ICTJ_POOL_LABEL } from './ictj'
import { TX_KIND_LABEL } from './schema/records'
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
  covers: 'Spłaca zakupy',
  coversOpening: 'Spłaca saldo na start rozliczeń',
  splits: 'Podział',
  'splits.amount': 'Podział – kwota',
  'splits.categoryId': 'Podział – kategoria',
  'splits.refundable': 'Podział – finansuje domownik',
  'splits.memberId': 'Podział – domownik',
  'splits.advance': 'Podział – reszta jako zaliczka',
  'splits.loanId': 'Podział – spłata pożyczki',
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
  explained: 'Korekta wyjaśniona',
  deadline: 'Termin',
  source: 'Źródło',
  'source.ictjEntryId': 'Źródło – wpis ICTTJ',
  entryDate: 'Data wpisu ICTTJ',
  countedFrom: 'Liczone od chwili',
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
  'loot.envelopes': 'Podział łupów – zapas kopert na następny miesiąc',
  envelopeCovers: 'Pokrycia przekroczeń kopert',
  'envelopeCovers.amount': 'Pokrycia przekroczeń – kwota',
  'envelopeCovers.from': 'Pokrycia przekroczeń – z koperty',
  'envelopeCovers.to': 'Pokrycia przekroczeń – na kopertę',
  rates: 'Rata z pensji',
  'rates.from': 'Rata z pensji – od',
  'rates.until': 'Rata z pensji – do',
  'past.deadline': 'Wcześniejsze stany – termin',
  yearly: 'Co roku',
  remind: 'Przypomnienie (dni przed)',
  done: 'Wykonane',
  notMatched: 'Operacje „to nie to”',
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
  'settings.seeded': 'Ustawienia startowe',
  // AP-27 (T430): every field of every record by a Polish name – the audit found „tags”, the id and raw keys after a
  // known prefix („Reguły importu – maxAmount”). A key of its own here names it under any prefix (`fieldLabelOf`).
  id: 'Identyfikator wpisu',
  createdAt: 'Utworzono',
  since: 'Od dnia',
  updatedAt: 'Zapisano',
  updatedBy: 'Zapisał komputer',
  schemaVersion: 'Wersja formatu',
  tags: 'Tagi',
  format: 'Format pliku',
  key: 'Klucz wiersza',
  bankName: 'Nazwa w banku',
  category: 'Kategoria mBanku',
  importedAt: 'Zaimportowano',
  altKeys: 'Inne klucze wiersza',
  description: 'Opis z banku',
  pending: 'Nierozliczona',
  operation: 'Rodzaj operacji',
  forecastId: 'Scenariusz prognozy',
  currency: 'Waluta',
  version: 'Wersja',
  parentId: 'Kategoria nadrzędna',
  system: 'Kategoria systemowa',
  envelope: 'Koperta',
  importFormat: 'Format importu',
  page: 'Ekran',
  panels: 'Panele',
  collapsed: 'Zwinięty',
  height: 'Wysokość',
  hidden: 'Ukryty',
  columns: 'Kolumny',
  shields: 'Osłony',
  hull: 'Kadłub',
  goals: 'Cele',
  tanks: 'Zbiorniki ładowni',
  match: 'Dopasowanie',
  mode: 'Sposób',
  maxAmount: 'Kwota najwyżej',
  label: 'Nazwa',
  household: 'Domownik',
  loanAmount: 'Część pożyczki',
  learned: 'Nauczona z decyzji',
  hits: 'Użycia',
  inflow: 'Reszta wpłaty',
  opening: 'Saldo na start',
  owed: 'Do oddania',
  deposit: 'Zaliczka',
  via: 'Przekazuje przez',
  bankNames: 'Nazwy w banku',
  members: 'Osoby',
  lines: 'Osoby',
  value: 'Udział',
  filter: 'Filtr',
  withPeriod: 'Z okresem',
  ignored: 'Pominięte',
  ok: 'Uznane za w porządku',
  tagGoals: 'Cele tagów',
  cpi: 'Inflacja GUS (CPI)',
  days: 'Dni',
  cls: 'Klasa dnia',
  cargo: 'Ładownia',
  missions: 'Misje',
  template: 'Rodzaj misji',
  week: 'Tydzień',
  evaluatedAt: 'Oceniona',
  params: 'Parametry',
  promotions: 'Awanse',
  at: 'Chwila',
  rank: 'Stopień',
  change: 'Zmiana',
  day: 'Dzień',
  achievements: 'Osiągnięcia',
  savedAt: 'Zapisano operacje',
  fileName: 'Plik z banku',
  period: 'Okres',
  counts: 'Liczby wierszy',
  created: 'Dodane operacje',
  updated: 'Zmienione operacje',
  removed: 'Usunięte operacje',
  rules: 'Reguły importu',
  before: 'Przed importem',
  after: 'Po imporcie',
  lastImport: 'Ostatni import',
  coveredTo: 'Zasięg plików z banku',
  accountNumber: 'Numer rachunku',
  inflows: 'Wpływy',
  ownName: 'Własna nazwa',
  confirmations: 'Potwierdzenia sald',
  undoneAt: 'Cofnięty',
  'settings.orders.quietHours.from': 'Rozkazy – cisza nocna od',
  'settings.orders.quietHours.to': 'Rozkazy – cisza nocna do',
  'settings.household.openingIds': 'Domownicy – operacje w saldzie na start',
  'settings.household.assignFrom': 'Domownicy – zwroty wskazują zakupy od',
  'settings.operationViews': 'Zapisane widoki Operacji',
  'settings.cargo': 'Ładownia',
  'settings.cargo.ignored': 'Ładownia – nie proponuj',
  'settings.anomalies': 'Anomalie',
  'settings.anomalies.ok': 'Anomalie – w porządku',
  'settings.intel': 'Wywiad',
  'settings.import.rules.updatedAt': 'Reguły importu – zmieniona',
  'loot.decidedAt': 'Podział łupów – zdecydowano',
  'bank.format': 'Dane z banku – format pliku',
  'bank.source': 'Dane z banku – źródło',
  'bank.altKeys': 'Dane z banku – inne klucze wiersza',
  'counterBank.counterparty': 'Dane z banku drugiego konta – kontrahent',
  'counterBank.operation': 'Dane z banku drugiego konta – rodzaj operacji',
  'counterBank.key': 'Dane z banku drugiego konta – klucz wiersza',
  awaitReturn: 'Czeka na zwrot',
  'awaitReturn.amount': 'Czeka na zwrot – kwota',
  'awaitReturn.until': 'Czeka na zwrot – do',
  'awaitReturn.closedAt': 'Czeka na zwrot – zamknięty',
  inflowKind: 'Rodzaj wpływu',
  coversOpeningMembers: 'Spłaca saldo na start – domownicy',
  priceIgnored: 'Nowa cena pominięta',
  variable: 'Kwota zmienna',
  status: 'Stan',
  frozenAt: 'Zamrożony',
  aliveAt: 'Ostatnia płatność',
  violations: 'Naruszenia',
  'splits.tags': 'Podział – tagi',
  'share.lines.memberId': 'Wspólnie – domownik',
  'share.lines.value': 'Wspólnie – udział',
  'share.lines.gift': 'Wspólnie – prezent'
}

/** A path's part that is an id (ULID, `#id` of a list item): named by `names` when it is known (N92). */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/

/**
 * Polish label of a changed field: known fields by name, items of lists by their position in the path; an id in the
 * path (an envelope's category, a goal of the loot) by its name from `names`.
 */
export function fieldLabel(path: Path, names?: ReadonlyMap<string, string>): string {
  let base = fieldLabelOf(path)
  if (!names) return base
  // An id as a key of the path (an envelope's category, a goal of the loot): its name in its place.
  base = base.replace(/(^| – )([0-9A-HJKMNP-TV-Z]{26})(?= – |$)/g, (whole, sep: string, id: string) => (names.get(id) ? `${sep}${names.get(id)}` : whole))
  // A list item's id (the account of „Konta – nazwa”): its name at the end.
  const item = [...path].reverse().flatMap((p) => (p.startsWith('#') && ULID.test(p.slice(1)) ? [p.slice(1)] : []))[0]
  const name = item ? names.get(item) : undefined
  return name && !base.includes(name) ? `${base} – ${name}` : base
}

/** „Kwota” → „kwota” after a prefix; an abbreviation („ICTTJ – …”, „PIT-38”) stays as it is. */
const lowerFirst = (s: string): string => (/^\p{Lu}{2}/u.test(s) ? s : `${s.charAt(0).toLowerCase()}${s.slice(1)}`)

function fieldLabelOf(path: Path): string {
  const named = path.filter((p) => !p.startsWith('#'))
  const key = named.join('.')
  if (LABELS[key]) return LABELS[key]
  for (let i = named.length - 1; i > 0; i--) {
    const prefix = LABELS[named.slice(0, i).join('.')]
    if (prefix) return [prefix, ...partsAfter(named.slice(i))].join(' – ')
  }
  return key || '(cały wpis)'
}

/**
 * The parts of a path after a known prefix (AP-27): each by its own name (the longest known key first), a day or a
 * month of a map („days.2026-11-03”) as the app writes dates; an id or a newer version's key as it is.
 */
function partsAfter(rest: readonly string[]): string[] {
  const out: string[] = []
  let i = 0
  while (i < rest.length) {
    let j = rest.length
    while (j > i && !LABELS[rest.slice(i, j).join('.')]) j--
    if (j > i) {
      out.push(lowerFirst(LABELS[rest.slice(i, j).join('.')]!))
      i = j
      continue
    }
    const part = rest[i]!
    out.push(ISO_DATE.test(part) || ISO_MONTH.test(part) ? (dateValueText(part) ?? part) : part)
    i++
  }
  return out
}

/** Values of the enums by their Polish words (AP-27): the full key first, then the field's own key. */
const lowerAll = (r: Readonly<Record<string, string>>): Record<string, string> => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, lowerFirst(v)]))
const VALUE_LABELS: Record<string, Record<string, string>> = {
  kind: { ...lowerAll(TX_KIND_LABEL), opening: 'saldo otwarcia', confirmation: 'potwierdzenie salda' },
  'settings.accounts.kind': { bank: 'bank', wallet: 'portfel', cash: 'gotówka', other: 'inne' },
  type: { fixed: 'stały', subscription: 'abonament', installment: 'rata' },
  mode: { equal: 'po równo', percent: 'procenty', amounts: 'kwoty' },
  'settings.import.rules.mode': { exact: 'nazwa kontrahenta', contains: 'nazwa zawiera', keyword: 'słowo w opisie', amount: 'kwota' },
  inflowKind: { repay: 'spłata', income: 'przychód', advance: 'zaliczka' },
  inflow: { ask: 'pytaj', advance: 'zaliczka', income: 'przychód' },
  impulse: { plan: 'plan', impulse: 'impuls' },
  direction: { in: 'wpływ', out: 'wydatek', given: 'pożyczona komuś', taken: 'pożyczona od kogoś' },
  envelope: { daily: 'codzienna', planned: 'planowana' },
  pool: lowerAll(ICTJ_POOL_LABEL)
}

function valueLabel(path: Path | undefined, v: string): string | undefined {
  const named = (path ?? []).filter((p) => !p.startsWith('#'))
  if (!named.length) return undefined
  return VALUE_LABELS[named.join('.')]?.[v] ?? VALUE_LABELS[named[named.length - 1]!]?.[v]
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
  // AP-27: the amounts a conflict or the history showed in raw grosze.
  'awaitReturn.amount',
  'envelopeCovers.amount',
  'removed.amount',
  'removed.splits.amount',
  'past.target',
  'settings.layers.assumedCosts',
  'settings.orders.impulseThreshold',
  'settings.budget.initial.shields',
  'settings.budget.initial.hull',
  'settings.budget.initial.goals.*',
  'settings.budget.initial.tanks.*',
  'settings.household.members.opening.owed',
  'settings.household.members.opening.deposit',
  'settings.import.rules.maxAmount',
  'settings.import.rules.loanAmount'
].map((f) => f.split('.'))

/** Is the field at `path` an amount in grosze (B7)? Items of lists (`#id`, `[n]`) do not count as keys. */
export function isAmountPath(path: Path): boolean {
  const named = path.filter((p) => !p.startsWith('#') && !/^\[\d+\]$/.test(p))
  return AMOUNT_FIELDS.some((f) => f.length === named.length && f.every((k, i) => k === '*' || k === named[i]))
}

/** The same for a flat key („splits[0].amount”, „settings.budget.initial.hull”) – the conflicts' list. */
export const isAmountKey = (key: string): boolean => isAmountPath(key.replace(/\[\d+\]/g, '').split('.').filter(Boolean))

/** How a value is written in the diff lists: amounts (hidden with Ctrl+$ in the window) and names of ids. */
export interface ValueText {
  /** Where the value is (a field's label inside an object, an amount by its path). */
  path?: Path
  /** An amount in grosze as the window writes it (masked with the amounts); default `formatPln` + „ zł”. */
  amount?: (grosze: number) => string
  names?: ReadonlyMap<string, string>
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_MONTH = /^\d{4}-\d{2}$/
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
const plDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

/** A date, a month or a moment of a record as the app writes them (AP-27, AP-23): „14.10.2026”, „03.11.2026, 12:24”. */
export function dateValueText(v: string): string | null {
  if (ISO_DATE.test(v)) return plDay(v)
  if (ISO_MONTH.test(v)) return `${v.slice(5, 7)}.${v.slice(0, 4)}`
  if (ISO_TIME.test(v)) {
    const stamp = warsawStamp(v)
    return stamp === v ? null : `${plDay(stamp.slice(0, 10))}, ${stamp.slice(11)}`
  }
  return null
}

/**
 * Short text of a value for the diff lists (AP-27): Polish words for yes / no, a decimal comma, dates as dd.mm.rrrr, a
 * list of words as the words, an object as its fields by their Polish names – never JSON.
 */
export function formatValue(v: unknown, max = 80, opts: ValueText = {}): string {
  const cut = (s: string) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)
  if (v === undefined) return '—'
  if (v === null || v === '') return 'puste'
  if (typeof v === 'number' && opts.path && isAmountPath(opts.path)) return opts.amount ? opts.amount(v) : `${formatPln(v)} zł`
  if (typeof v === 'string') return opts.names?.get(v) ?? valueLabel(opts.path, v) ?? dateValueText(v) ?? cut(v)
  if (typeof v === 'number') return String(v).replace('.', ',')
  if (typeof v === 'boolean') return v ? 'tak' : 'nie'
  if (Array.isArray(v)) {
    if (v.length === 0) return 'puste'
    // Words, days, numbers (tags, the days of a reminder): the values themselves, each as the field writes it.
    if (v.every((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean')) return cut(v.map((x) => formatValue(x, max, opts)).join(', '))
    return `${v.length} ${v.length === 1 ? 'pozycja' : v.length < 5 ? 'pozycje' : 'pozycji'}`
  }
  if (isObject(v)) {
    const path = opts.path ?? []
    const prefix = fieldLabelOf(path)
    const parts = Object.entries(v)
      .filter(([k, x]) => k !== 'id' && x !== undefined)
      .map(([k, x]) => {
        const full = fieldLabelOf([...path, k])
        const label = path.length && full.startsWith(`${prefix} – `) ? full.slice(prefix.length + 3) : full
        return `${label.charAt(0).toLowerCase()}${label.slice(1)}: ${formatValue(x, 40, { ...opts, path: [...path, k] })}`
      })
    return parts.length ? cut(parts.join(', ')) : 'puste'
  }
  return cut(String(v))
}

/**
 * The differences as a person reads them (AP-27): an object on one side only (bank data added, a split line removed)
 * by its own fields, each with its Polish name, and never the record's id (two plans of one month have two – the card
 * says which record it is).
 */
export function readableChanges(changes: readonly FieldChange[]): FieldChange[] {
  const out: FieldChange[] = []
  const add = (path: Path, before: unknown, after: unknown) => {
    const a = isObject(before)
    const b = isObject(after)
    const obj = (a ? before : after) as Record<string, unknown>
    if (a === b || Object.keys(obj).length === 0) {
      out.push({ path, before, after })
      return
    }
    for (const k of Object.keys(obj)) {
      if (k === 'id' || (path.length === 0 && BOOKKEEPING.has(k))) continue
      add([...path, k], a ? obj[k] : undefined, a ? undefined : obj[k])
    }
  }
  for (const c of changes) if (!(c.path.length === 1 && c.path[0] === 'id')) add(c.path, c.before, c.after)
  return out
}
