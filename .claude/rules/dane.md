---
paths:
  - "src/shared/schema/**"
  - "src/shared/records.ts"
  - "src/shared/paths.ts"
  - "src/shared/ids.ts"
  - "src/shared/merge.ts"
  - "src/shared/migrations/**"
  - "src/main/datastore/**"
  - "src/mobile/vfs/**"
  - "src/mobile/sync/**"
  - "src/renderer/store/data.ts"
  - "tests/fs/**"
  - "tests/fixtures/**"
  - "docs/format-folderu.md"
---

# Folder danych – układ i konwencje rekordów

Przeniesione z CLAUDE.md 08.11.2026 (T527). Folder wybiera użytkownik, domyślnie `OneDrive\FinancialIntel`; opis formatu
dla ludzi – `docs/format-folderu.md`.

```
fi.json                                  ustawienia, kategorie, konta, warstwy, rozkazy, domownicy, reguły importu, schemaVersion
transactions/RRRR/RRRR-MM-DD_ULID.json   operacja (data warszawska)
containers/ULID.json                     kontener ładowni albo opłata okresowa
goals/ULID.json                          cel własny albo stan celu z prognozy ICTTJ
months/RRRR-MM.json                      plan miesiąca: pensja, koperty, podział łupów
dockings/RRRR/RRRR-MM-DD_ULID.json       dokowanie: źródło (wpis ICTTJ albo wiersz CSV), konto, podział
loans/ULID.json                          pożyczka w jedną albo drugą stronę, z harmonogramem
balances/RRRR/RRRR-MM-DD_ULID.json       saldo otwarcia albo potwierdzenie salda konta
game/RRRR-MM.json                        oceny dni, naruszenia, misje, awanse (zamrożone)
scheduled/ULID.json                      boja: zaplanowany wydatek, wpływ albo termin (1.8.0)
imports/ULID.json                        paczka importu z mBanku (do „Cofnij import”, 1.5.1)
backups/  .history/  .presence/          kopie ZIP, poprzednie wersje, obecność komputerów
```

- JSON z wcięciem 2 spacje i końcowym `\n`; identyfikatory ULID; czasy UTC ISO 8601; ścieżki względne z `/`.
- Każdy rekord: `schemaVersion`, `id`, `createdAt`, `updatedAt`, `updatedBy` (nazwa komputera). Nieznane pola
  zachowywane (`z.looseObject`).
- **Kwoty: liczby całkowite w groszach, tylko PLN.** Podział kwot (np. odkładka roczna na 12 miesięcy) w groszach
  z resztą w ostatniej części. Wyjątek tylko informacyjny: `foreign` przy operacji (kwota w walucie, T492) – silnik,
  warstwy i sumy go nie czytają.
- Data operacji = data warszawska; godzina opcjonalna (import z mBanku nie ma godzin).
- Zapis atomowy, historia `.history/`, konflikty chmury i scalanie trójstronne – jak ICTTJ (`folder-danych.md`). Bez
  szyfrowania.
- Nowe pole albo kolekcja – addytywnie, **bez** podbijania `SCHEMA_VERSION` (od 0.1.0 wszystkie zmiany tak szły; podbicie
  zrobiłoby nowe wpisy tylko do odczytu na komputerze ze starszą wersją). Zmiana nieaddytywna: podbij `SCHEMA_VERSION`,
  krok migracji + test. Wartości enumów nowszej wersji zachowane (`openEnum`); wpis nowszej wersji jest tylko do odczytu
  (`NewerFileError`), nigdy nadpisywany.
- Rekordy pochodne mają stałe id (`fixedId`, `derivedId`) – dwa komputery nie tworzą duplikatów.
- Zapisy w tle (gra, cele ICTTJ, salda na start) tylko na komputerze „w użyciu” i nie w trakcie zapisu wszystkiego
  (`writesInBackground`).
- Nigdy nie commituj danych użytkownika. Przykładowe pliki (CSV z mBanku, folder ICTTJ) tylko zanonimizowane,
  w `tests/fixtures/`.
