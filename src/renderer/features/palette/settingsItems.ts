import type { SettingsItem } from '@shared/search'

/**
 * The settings found by what they set (F19: „cisza nocna” → Warstwy i rozkazy). Every panel of Ustawienia that holds a
 * setting has a line here (UX-19), on the tab where the panel is.
 */
export const SETTINGS_ITEMS: readonly SettingsItem[] = [
  { id: 'ship-name', label: 'Nazwa okrętu', tab: 'general' },
  { id: 'opening', label: 'Saldo otwarcia konta', tab: 'accounts', words: 'konta saldo potwierdzenie salda korekta' },
  { id: 'accounts', label: 'Konta budżetu', tab: 'accounts', words: 'konto dodaj archiwum' },
  { id: 'categories', label: 'Kategorie i koperty', tab: 'categories', words: 'podkategoria koperta archiwizacja' },
  { id: 'shields', label: 'Osłony – cel (pensje)', tab: 'layers', words: 'bufor warstwy' },
  { id: 'hull', label: 'Kadłub – cel (miesiące)', tab: 'layers', words: 'fundusz awaryjny warstwy' },
  { id: 'min-shields', label: 'Minimalne osłony', tab: 'layers', words: 'rozkazy' },
  { id: 'cargo-line', label: 'Linia zanurzenia (% pensji)', tab: 'layers', words: 'ładownia rozkazy' },
  { id: 'quiet', label: 'Cisza nocna', tab: 'layers', words: 'noc rozkazy zakupy w nocy powiadomienia' },
  { id: 'impulse', label: 'Dziennik kapitański od kwoty (plan / impuls)', tab: 'layers', words: 'próg dziennika impuls' },
  { id: 'firewall', label: 'Firewall dopłat do XTB', tab: 'layers', words: 'rozkazy xtb' },
  { id: 'game', label: 'Progi gry (awans, degradacja, misja)', tab: 'layers', words: 'dowództwo dni zgodnych koperta poważnie okno awansu' },
  { id: 'members', label: 'Domownicy i rozliczenia', tab: 'household', words: 'data rozliczeń saldo na start depozyt' },
  { id: 'import-rules', label: 'Reguły importu z banku', tab: 'import', words: 'słowa kluczowe połączone nazwy nazwiska duplikaty mbank' },
  { id: 'bank-files', label: 'Pliki z mBanku w Pobranych', tab: 'import', words: 'pobrane download szukaj nowych plików csv' },
  { id: 'ictj', label: 'Folder ICTTJ i scenariusz prognozy', tab: 'ictj', words: 'ict trade journal cele' },
  { id: 'notifications', label: 'Powiadomienia', tab: 'notify', words: 'wieczorny raport przypomnienie włącz wyłącz wszystkie' },
  { id: 'sounds', label: 'Dźwięki i głośność', tab: 'notify' },
  { id: 'zoom', label: 'Rozmiar interfejsu', tab: 'view', words: 'skala powiększenie zoom' },
  { id: 'contrast', label: 'Wyższy kontrast', tab: 'view', words: 'wygląd' },
  { id: 'hide', label: 'Ukrywanie kwot', tab: 'view', words: 'prywatność bezczynność blokada ekranu' },
  { id: 'shortcut', label: 'Skrót szybkiego wpisu', tab: 'system', words: 'globalny skrót klawisz' },
  { id: 'tray', label: 'Zasobnik i autostart', tab: 'system', words: 'start z windows zamykanie' },
  { id: 'folder', label: 'Folder danych', tab: 'folder', words: 'onedrive zmiana folderu' },
  { id: 'merge-mode', label: 'Praca na kilku komputerach: scalaj zmiany / zawsze pytaj', tab: 'folder', words: 'tryb scalania scalaj zawsze pytaj synchronizacja zmiany z drugiego komputera onedrive konflikt' },
  { id: 'machine-setup', label: 'Ustaw na tym komputerze', tab: 'folder', words: 'nowy komputer pierwszy start ustawienia komputera' },
  { id: 'backups', label: 'Kopie zapasowe i odzyskanie z kopii', tab: 'folder', words: 'backup kopia zip' },
  { id: 'updates', label: 'Aktualizacje i token GitHub', tab: 'updates', words: 'wersja' }
]
