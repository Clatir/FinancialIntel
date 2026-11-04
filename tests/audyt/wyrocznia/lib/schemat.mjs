// Kopia schematów danych dla wyroczni (AP-32, raport audytu sek. 6 „Metoda”): nazwy pól, wartości domyślne i znaczenie
// braku / null – przepisane z src/shared/schema/{records,budget,settings,common}.ts @ 281e4f4 (tylko pola, które
// wyrocznia czyta). Wyrocznia czyta format danych stąd, nie z `src/` (odczyt `src/shared/schema` ładował regułę
// `.claude/rules/silnik.md` – ślepota). Zgodność kopii ze schematami aplikacji sprawdza regresja
// (`tests/audyt/wyrocznia/regresja.test.ts`, „kopia schematów”): każde pole niżej po parsowaniu aplikacji = po
// `normalizuj` wyroczni. Nowe pole czytane przez wyrocznię – dopisz tutaj, z domyślną wartością schematu.
//
// Znaczenie (komentarze schematów, skrót):
// - Kwoty: grosze, liczby całkowite (T3); daty warszawskie RRRR-MM-DD; chwile ISO 8601 UTC.
// - Operacja `amount` ze znakiem (wypływ < 0). `time` null = nieznana (import z mBanku). `memberId` wydatku – kto
//   finansuje (z `refundable`; null = pierwszy domownik „Dom”); wpływu – czyje pieniądze. `advance` – reszta wpłaty
//   domownika jako zaliczka. `inflowKind` brak / 'repay' – spłata najpierw; 'income' – niezależny przychód;
//   'advance' – zaliczka na przyszłość. `covers` – zakupy, które wpłata spłaca; `coversOpening` – też dług salda na start
//   rozliczeń (`coversOpeningMembers` – tylko tych osób). `bothSides` – cały przelew w jednej operacji (druga strona na
//   `counterAccountId`, w dniu `counterDate` albo `date`); brak = tylko ta strona.
// - Linia `splits`: ze znakiem jak operacja; `memberId` null – w wydatku pierwszy domownik, we wpływie mój przychód;
//   `loanId` (D100, T355) – część wpływu spłacająca pożyczkę udzieloną (bez domownika); `gift` – prezent domownika;
//   `containerId` / `goalId` – linia z kontenera / z pieniędzy celu.
// - Kontener: `from` / `until` – miesiące w ładowni (null = bez granicy); `archivedAt` brak przy `archived` = sprzed
//   1.4.2 – nigdy się nie liczy; `amountAt` – dzień zmiany masy (gra); `past` – wcześniejsze kwoty, każda do swojego
//   miesiąca włącznie, `amount` od miesiąca po ostatniej; `schedule` – miesiące płatności (przy `cycleMonths` > 1).
// - Cel: `activeFrom` null = zawsze; `past` (posortowane po `until`) – stan sprzed zmiany, ważny do `until` (bez niej),
//   `deadline` brak = termin się nie zmienił; `transfers` {at, to: 'shields' | id celu, amount}; `rates` {from, until null =
//   otwarte}; `ictj.amount` null przy `currency` PLN – cel ICTTJ bez kwoty (N46).
// - Plan miesiąca: miesiąc bez planu bierze ostatni wcześniejszy; `loot` {decidedAt, shields, nextMonth, goals,
//   envelopes}; `envelopeCovers` {from, to, amount, at}.
// - Dokowanie: `pool` 'current' | 'surplus' | 'goals' | 'tax' | null; `split` null = kolejność dokowania, inaczej
//   {shields, hull, goals, taxHold}; `entryDate` brak = dzień operacji.
// - Pożyczka: `direction` 'given' | 'taken'; `schedule` [{id, date, amount}]; `closedAt` null = otwarta.
// - Saldo: 'opening' – na początek dnia, 'confirmation' – na koniec dnia.
// - Ustawienia domowników: `since` brak = jeszcze nie wybrana (liczone od startu), null = od startu budżetu;
//   `openingIds` brak = salda na start obejmują wszystkie operacje domowników sprzed `since`, lista – tylko te
//   (pozostałe liczone zaraz po saldach na start, T159); `assignFrom` brak = jak przed 1.12.0 (najstarsze zakupy),
//   null = od startu tylko wskazane; `members[].opening` {owed, deposit, since}.
//   **Brak pola ≠ null** – normalizacja nie zamienia jednego na drugie.

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined
/** Uzupełnia brakujące (undefined) pola wartościami domyślnymi schematu – null zostaje null. */
function fill(rec, defaults) {
  if (rec == null || typeof rec !== 'object') return rec
  const out = { ...rec }
  for (const [k, v] of Object.entries(defaults)) if (!own(out, k)) out[k] = typeof v === 'function' ? v() : v
  return out
}

export const SPLIT_DEFAULTS = { categoryId: null, refundable: false, memberId: null, advance: false }
export const TRANSACTION_DEFAULTS = {
  time: null,
  kind: 'expense',
  categoryId: null,
  refundable: false,
  memberId: null,
  advance: false,
  covers: () => [],
  splits: () => [],
  counterparty: '',
  title: '',
  impulse: null,
  logNote: '',
  repaid: 0,
  counterAccountId: null,
  containerId: null,
  goalId: null,
  loanId: null,
  bank: null
}
export const CONTAINER_DEFAULTS = { type: 'fixed', cycleMonths: 1, dueDay: 1, accountId: null, categoryId: null, counterparty: '', from: null, until: null, loanId: null, archived: false, archivedAt: null, past: () => [], schedule: () => [], variable: false }
export const GOAL_DEFAULTS = { priority: 1, source: 'own', ictj: null, deadline: null, archived: false, achievedAt: null, activeFrom: null, past: () => [], transfers: () => [], rates: () => [] }
export const GOAL_ICTJ_DEFAULTS = { currency: 'PLN', amount: null, version: '' }
export const GOAL_RATE_DEFAULTS = { until: null }
export const MONTH_DEFAULTS = { envelopes: () => ({}), loot: null, envelopeCovers: () => [] }
export const LOOT_DEFAULTS = { shields: 0, nextMonth: 0, goals: () => ({}), envelopes: () => ({}) }
export const DOCKING_DEFAULTS = { ictjEntryId: null, pool: null, split: null }
export const DOCKING_SPLIT_DEFAULTS = { shields: 0, hull: 0, goals: () => ({}), taxHold: 0 }
export const LOAN_DEFAULTS = { counterparty: '', accountId: null, schedule: () => [], closedAt: null }
export const BALANCE_DEFAULTS = { correctionId: null }
export const SCHEDULED_DEFAULTS = { amount: null, yearly: false, categoryId: null, accountId: null, counterparty: '', done: () => ({}), notMatched: () => [] }

export const LAYERS_DEFAULTS = { shieldSalaries: 3, hullMonths: 6, assumedCosts: null }
export const ORDERS_DEFAULTS = { minShieldSalaries: 1, cargoLimitPct: 40, impulseThreshold: 20000, firewall: true }
export const QUIET_DEFAULTS = { from: '23:00', to: '05:00' }
export const BUDGET_DEFAULTS = { start: null, initial: null }
export const INITIAL_DEFAULTS = { shields: 0, hull: 0, goals: () => ({}) }
export const IMPORT_DEFAULTS = { coveredTo: () => ({}), lastImport: () => ({}), log: () => ({}) }
export const MEMBER_DEFAULTS = { bankNames: () => [], inflow: 'ask', archived: false, via: null }
export const OPENING_DEFAULTS = { owed: 0, deposit: 0 }
export const ICTJ_SETTINGS_DEFAULTS = { forecastId: null, skipped: () => [] }
export const GAME_DEFAULTS = { start: null, promoteDays: 30, windowDays: 35, seriousEnvelopePct: 20, demoteSerious: 3, missionDays: 3, noSpend: () => ({}) }
export const CATEGORY_DEFAULTS = { parentId: null, envelope: null, system: null, archived: false }
export const ACCOUNT_DEFAULTS = { importFormat: null, archived: false }
/** Pierwszy domownik („Dom”, D21) – domyślna lista domowników schematu. */
export const HOUSE_MEMBER_ID = '01KDEFMEM00000000000000001'
const defaultMembers = () => [{ id: HOUSE_MEMBER_ID, name: 'Dom', bankNames: [], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } }]

export function normalizeTransaction(t) {
  const x = fill(t, TRANSACTION_DEFAULTS)
  x.splits = (x.splits ?? []).map((s) => fill(s, SPLIT_DEFAULTS))
  return x
}
export function normalizeContainer(c) {
  return fill(c, CONTAINER_DEFAULTS)
}
export function normalizeGoal(g) {
  const x = fill(g, GOAL_DEFAULTS)
  if (x.ictj) x.ictj = fill(x.ictj, GOAL_ICTJ_DEFAULTS)
  x.past = [...(x.past ?? [])].sort((a, b) => Date.parse(a.until) - Date.parse(b.until))
  x.rates = (x.rates ?? []).map((r) => fill(r, GOAL_RATE_DEFAULTS))
  return x
}
export function normalizeMonth(p) {
  const x = fill(p, MONTH_DEFAULTS)
  if (x.loot) x.loot = fill(x.loot, LOOT_DEFAULTS)
  return x
}
export function normalizeDocking(d) {
  const x = fill(d, DOCKING_DEFAULTS)
  if (x.split) x.split = fill(x.split, DOCKING_SPLIT_DEFAULTS)
  return x
}
export const normalizeLoan = (l) => fill(l, LOAN_DEFAULTS)
export const normalizeBalance = (b) => fill(b, BALANCE_DEFAULTS)
export const normalizeScheduled = (s) => fill(s, SCHEDULED_DEFAULTS)

/** Ustawienia (fi.json `settings`) – tylko części czytane przez wyrocznię; reszta bez zmian. */
export function normalizeSettings(s0) {
  const s = { ...(s0 ?? {}) }
  s.accounts = (s.accounts ?? []).map((a) => fill(a, ACCOUNT_DEFAULTS))
  s.categories = (s.categories ?? []).map((c) => fill(c, CATEGORY_DEFAULTS))
  s.layers = fill(s.layers ?? {}, LAYERS_DEFAULTS)
  s.orders = fill(s.orders ?? {}, ORDERS_DEFAULTS)
  s.orders.quietHours = fill(s.orders.quietHours ?? {}, QUIET_DEFAULTS)
  s.budget = fill(s.budget ?? {}, BUDGET_DEFAULTS)
  if (s.budget.initial) s.budget.initial = fill(s.budget.initial, INITIAL_DEFAULTS)
  s.import = fill(s.import ?? {}, IMPORT_DEFAULTS)
  const hh = { ...(s.household ?? {}) }
  // brak pola ≠ null: `since`, `openingIds`, `assignFrom` zostają, jak są (undefined albo wartość)
  hh.members = (own(hh, 'members') ? hh.members : defaultMembers()).map((m) => {
    const x = fill(m, MEMBER_DEFAULTS)
    x.opening = fill(x.opening ?? {}, OPENING_DEFAULTS)
    return x
  })
  s.household = hh
  s.ictj = fill(s.ictj ?? {}, ICTJ_SETTINGS_DEFAULTS)
  s.game = fill(s.game ?? {}, GAME_DEFAULTS)
  return s
}

/** Pola porównywane z parsowaniem aplikacji w teście kopii (rodzaj → lista pól). */
export const CHECKED_FIELDS = {
  transaction: [...Object.keys(TRANSACTION_DEFAULTS), 'inflowKind', 'gift', 'coversOpening', 'coversOpeningMembers', 'bothSides', 'counterDate', 'awaitReturn'],
  split: [...Object.keys(SPLIT_DEFAULTS), 'amount', 'inflowKind', 'gift', 'containerId', 'goalId', 'loanId'],
  container: [...Object.keys(CONTAINER_DEFAULTS), 'amount', 'dueMonth', 'amountAt'],
  goal: [...Object.keys(GOAL_DEFAULTS), 'target'],
  month: [...Object.keys(MONTH_DEFAULTS), 'salary'],
  docking: [...Object.keys(DOCKING_DEFAULTS), 'transactionId', 'entryDate'],
  loan: [...Object.keys(LOAN_DEFAULTS), 'direction', 'amount', 'date'],
  balance: ['date', 'accountId', 'kind', 'amount'],
  scheduled: [...Object.keys(SCHEDULED_DEFAULTS), 'date']
}
