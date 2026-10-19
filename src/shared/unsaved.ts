import type { FlushResult } from './api'

/** Nothing left unsaved (a renderer silent while closing is taken so). */
export const SAVED: FlushResult = { saved: true, waiting: 0, newer: 0, error: null }

/**
 * The question before closing with unsaved changes, by their real reason (B108): a decision about another computer's
 * change (no write saves those records before it), a failed write, or a record a newer version of the app wrote (B67).
 */
export function unsavedQuestion(r: FlushResult): { title: string; message: string; detail: string } {
  if (r.waiting > 0)
    return {
      title: 'Zmiany z drugiego komputera',
      message: `Zdecyduj o zmianach z drugiego komputera (${r.waiting}).`,
      detail:
        'Te wpisy zmieniono tutaj i na drugim komputerze – zmiany z tego komputera zapiszą się dopiero po decyzji w oknie „Zmiany z drugiego komputera”. „Anuluj” zostawia aplikację otwartą z tym oknem; „Zamknij mimo to” zostawia na dysku wersję z drugiego komputera, a zmiany stąd przepadają.'
    }
  // A write that may still work (the folder back, the file let go) first; a newer record's change never will.
  if (r.newer > 0 && !r.error)
    return {
      title: 'Niezapisane zmiany',
      message: 'Nie udało się zapisać ostatnich zmian.',
      detail:
        'Zmienione wpisy zapisała już nowsza wersja aplikacji (na drugim komputerze) – ta wersja ich nie nadpisze. Zaktualizuj aplikację (Ustawienia → Aktualizacje) i wpisz zmianę jeszcze raz; „Zamknij mimo to” zostawia wersję nowszej aplikacji, a zmiany stąd przepadają.'
    }
  return {
    title: 'Niezapisane zmiany',
    message: 'Nie udało się zapisać ostatnich zmian.',
    detail: `${r.error ? `Powód: ${r.error.replace(/[.\s]+$/, '')}. ` : ''}Folder danych może być niedostępny albo plik jest zablokowany (OneDrive, antywirus). Wybierz „Anuluj”, żeby aplikacja spróbowała ponownie, albo zamknij i utrać te zmiany.`
  }
}
