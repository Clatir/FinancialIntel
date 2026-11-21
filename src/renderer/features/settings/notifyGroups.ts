import type { NotifyPrefs } from '@shared/machine'

/** The switches of the notifications (UX-45): the `NotifyPrefs` keys that hold on / off (not the hours). */
export type NotifyKey = Exclude<keyof NotifyPrefs, 'briefingTime' | 'eveningTime'>

export interface NotifyGroup {
  id: string
  label: string
  rows: ReadonlyArray<[NotifyKey, string]>
}

/** The notifications by what they are about; each row keeps its text. */
export const NOTIFY_GROUPS: readonly NotifyGroup[] = [
  {
    id: 'day',
    label: 'Dzień i miesiąc',
    rows: [
      ['briefing', 'Odprawa poranna – przed innymi powiadomieniami'],
      ['evening', 'Wieczorne dopisanie wydatków'],
      ['low', 'Energia dziś poniżej 20% albo koperta powyżej 80%'],
      ['overrun', 'Przekroczenie przydziału albo koperty'],
      ['debriefing', 'Debriefing – 1. dnia miesiąca'],
      ['watch', 'Raport wachty – w niedzielę od 18:00'],
      ['yearReview', 'Przegląd roczny – w styczniu, za rok zamknięty']
    ]
  },
  {
    id: 'payments',
    label: 'Płatności i terminy',
    rows: [
      ['asteroid', 'Asteroida (opłata okresowa) – 14 i 3 dni przed terminem'],
      ['cargo', 'Kontener niezaładowany – opłata stała 3 dni po terminie bez płatności'],
      ['plans', 'Boje i terminy (dni przed, ustawione w boi), boja po terminie, koniec kontenera – 14 dni przed'],
      ['accounts', 'Za mało na koncie przed płatnością (salda kont za 90 dni)'],
      ['loans', 'Rata pożyczki 3 dni po terminie (własna albo spłata od dłużnika)'],
      ['pit38', 'PIT-38 – 14 i 3 dni przed 30 kwietnia']
    ]
  },
  {
    id: 'data',
    label: 'Dane i rozliczenia',
    rows: [
      ['importOverdue', 'Zaległy import z mBanku – po 3 dniach'],
      ['balances', 'Potwierdzenie sald – w niedzielę'],
      ['house', 'Domownik nie oddał za zakupy – po 30 dniach od najstarszego'],
      ['returns', 'Zwrot pieniędzy, który nie dotarł w terminie'],
      ['ictj', 'Nowa wypłata w ICTTJ do zadokowania']
    ]
  },
  {
    id: 'sensors',
    label: 'Czujniki',
    rows: [
      ['cargoWatch', 'Ładownia: kontener w nowej cenie, kontener bez płatności, nowa opłata w historii'],
      ['anomalies', 'Nieznany sygnał: nietypowa kwota, nowy kontrahent, możliwe podwójne obciążenie']
    ]
  }
]

export const NOTIFY_KEYS: readonly NotifyKey[] = NOTIFY_GROUPS.flatMap((g) => g.rows.map(([k]) => k))

/** How many of `keys` are on, and how many there are. */
export function notifyCount(n: NotifyPrefs, keys: readonly NotifyKey[] = NOTIFY_KEYS): { on: number; all: number } {
  return { on: keys.filter((k) => n[k]).length, all: keys.length }
}

/** The switches of `keys` as they were in `before`; what was changed since in the others (and the hours) stays as it is in `current`. */
export function notifyRestore(current: NotifyPrefs, before: NotifyPrefs, keys: readonly NotifyKey[]): NotifyPrefs {
  const next = { ...current }
  for (const k of keys) next[k] = before[k]
  return next
}

/** The switches of `keys` all set to `on`; the rest (the hours) as they were. */
export function notifySetAll(n: NotifyPrefs, keys: readonly NotifyKey[], on: boolean): NotifyPrefs {
  const next = { ...n }
  for (const k of keys) next[k] = on
  return next
}
