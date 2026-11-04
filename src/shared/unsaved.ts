import { FOLDER_UNAVAILABLE_MESSAGE, type FlushResult } from './api'

/** Nothing left unsaved (a renderer silent while closing is taken so). */
export const SAVED: FlushResult = { saved: true, waiting: 0, newer: 0, error: null }

/**
 * The question before closing with unsaved changes, by their real reason (B108): an edit waiting for „Zmień mimo to”
 * (AP-8), a decision about another computer's change (no write saves those records before it), a failed write – the
 * data folder gone among them (AP-1) –, or a record a newer version of the app wrote (B67).
 */
export function unsavedQuestion(r: FlushResult): { title: string; message: string; detail: string } {
  // An edit typed and waiting for „Zmień mimo to” (AP-8, AF-3): its question is open in the window.
  if ((r.asks ?? 0) > 0)
    return {
      title: 'Niezapisana zmiana operacji',
      message: 'Zmiana operacji czeka na Twoją decyzję.',
      detail:
        'Wpisana zmiana zmienia potwierdzone saldo konta albo kwotę z banku i czeka w oknie „Zmienić operację?” na „Zmień mimo to”. „Anuluj” zostawia aplikację otwartą z tym pytaniem; „Zamknij mimo to” zostawia na dysku operację sprzed zmiany, a wpisana zmiana przepada.'
    }
  if (r.waiting > 0)
    return {
      title: 'Zmiany z drugiego komputera',
      message: `Zdecyduj o zmianach z drugiego komputera (${r.waiting}).`,
      detail:
        'Te wpisy zmieniono tutaj i na drugim komputerze – zmiany z tego komputera zapiszą się dopiero po decyzji w oknie „Zmiany z drugiego komputera”. „Anuluj” zostawia aplikację otwartą z tym oknem; „Zamknij mimo to” zostawia na dysku wersję z drugiego komputera, a zmiany stąd przepadają.'
    }
  // The data folder gone (AP-1, AF-42): never „another computer” – the changes wait for the folder.
  if (r.error?.startsWith(FOLDER_UNAVAILABLE_MESSAGE))
    return {
      title: 'Niezapisane zmiany',
      message: 'Folder danych jest niedostępny – ostatnie zmiany nie są jeszcze zapisane.',
      detail:
        'Folder danych zniknął w trakcie pracy (przeniesiony, odłączony dysk albo OneDrive). „Anuluj” zostawia aplikację otwartą – zmiany zapiszą się same, gdy folder wróci; „Zamknij mimo to” je gubi.'
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
