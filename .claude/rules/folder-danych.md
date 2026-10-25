---
paths:
  - "src/main/**"
  - "src/preload/**"
  - "src/shared/paths.ts"
  - "src/shared/merge.ts"
  - "src/shared/records.ts"
  - "src/shared/migrations/**"
  - "src/shared/conflicts.ts"
  - "src/shared/remoteChanges.ts"
  - "src/shared/unsaved.ts"
  - "src/shared/ids.ts"
  - "src/renderer/store/data.ts"
  - "src/renderer/store/remote.ts"
  - "src/renderer/store/presence.ts"
  - "tests/fs/**"
  - "tests/unit/data-store.test.ts"
  - "tests/unit/merge.test.ts"
---

# Folder danych, proces główny, dwa komputery

- Proces główny jest jedynym właścicielem folderu (`main/datastore/` – `DataStore` po kolekcjach, wzór ICTTJ); okno
  zapisuje przez IPC paczkami (`saveRecords` / `deleteRecords`), zapis po nieudanym nigdy nie utyka (`settled`).
- Zapis atomowy, historia `.history/`, konflikt chmury → kopia `-KOMPUTER.json` i scalanie trójstronne (`merge.ts`,
  `resolveConflict`, `mergeConflict`).
- Wpis albo plik nowszej wersji → tylko do odczytu (`NewerFileError`, `SettingsFileError` 'too-new'); nigdy nie nadpisuj.
- Usuwanie: plik z wersją w historii usuwany od razu, bez niej – do Kosza; `removeRecord` odmawia przy drugiej kopii id.
- Kopie ZIP: dzienne (14) i tygodniowe (8), przed importem (10), przed migracją; pełna kontrola folderu przed kopią
  dzienną i ręczną (`checkedData`); nieczytelny rekord przerywa kopię.
- Dwa komputery (nigdy jednocześnie): obecność `.presence/` (`presence.ts`; heartbeat co minutę w użyciu, co 5 min
  w zasobniku); zapisy w tle tylko „w użyciu” (`writesInBackground`); zmiany z drugiego komputera rozstrzygane paczką.
- Zamykanie: `flushSaves` w rundach, zapisy w tle wstrzymane (`holding`); pytanie o niezapisane podaje przyczynę
  (`unsavedQuestion`), main loguje ją przed pytaniem.
- Ustawienia komputera w `userData/config.json` (`config.ts`, nie w folderze danych); jedna droga zmian – `changePrefs`
  w main, rozsyłana do wszystkich okien.
- Odświeżanie: `RefreshQueue` (jedno naraz, zaległe łączone), watcher + `pollMs`; nieczytelny plik → `readError` i
  ponowny odczyt.
- OneDrive „tylko online”: `threadpool.ts` importowany pierwszy w `index.ts` (`UV_THREADPOOL_SIZE` 32),
  `READ_CONCURRENCY` 24; postęp otwarcia z „Przerwij” (`ReadTracker`).
- Widoki magazynu przyrostowe (`FileMap`) – testy porównują je z pełną przebudową (`FI_VERIFY_VIEWS`).
- Folder ICTTJ nigdy nie jest folderem danych ani folderem kopii FI (`insideIctj` w `main/index.ts` – rozpoznaje po
  `journal.json`).
- Nowa kolekcja: układ w `paths.ts` (`COLLECTIONS` / `LAYOUTS`), `records.ts`, wpis w migracjach, etykiety w
  Synchronizacji, historii i odzyskaniu z kopii.
- Pola addytywne bez podbijania `SCHEMA_VERSION`; zmiana nieaddytywna: `SCHEMA_VERSION` + krok w `migrations/` + test.

Szczegóły i powody zmian: `docs/archiwum/claude-md-do-1.15.4.md` (Grep po nazwie funkcji) i `docs/decyzje.md`.
