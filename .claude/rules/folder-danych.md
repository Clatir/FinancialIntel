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
- **Zapis nigdy nie zakłada folderu danych** (AP-1, T314): każdy zapis pod korzeniem idzie przez
  `writeFileAtomic(…, within)` / `writeZipFile(…, within)` / `mkdirWithin` (nowy zapis do folderu – też obecność, historia,
  ZIP w `backups/`); `within` obowiązkowy, `null` tylko poza folderem danych; zwykłe `fs.mkdir(…, { recursive: true })` pod
  korzeniem to błąd (folder-widmo). Nowa metoda zapisu `DataStore` – przez `writing()` (sprawdza `fi.json`, błąd
  zniknięcia → `FolderUnavailableError` i `onStatus`).
- Niedostępność: `stale()` co `FI_FOLDER_CHECK_MS` w spoczynku, próba zapisu przy otwarciu (`writeBlocked`, T316); brak
  korzenia nie jest „usunięty na innym komputerze”; powrót liczy tylko odświeżenie, które folder przeczytało (nieudane
  zostawia go niedostępnym – T334); obserwator od nowa po każdym odświeżeniu (`folderSeen` w `finally`).
- **Pułapka (przegląd AP-1):** na Windows i OneDrive EPERM bywa chwilowy (antywirus, synchronizacja) – sprawdzenie
  „tylko do odczytu” ponawia każdy krok krótko tylko przy otwarciu i powrocie (w spoczynku i w kolejce raz, bez czekania
  – folder naprawdę tylko do odczytu sprawdzany co 5 s, T335) i ocenia tylko krok zapisu, nigdy sprzątanie; nie zakłada
  własnych plików – zakładanie sprawdza zapis obecności tego komputera (`DataStoreOptions.presence`, T316), ale blokuje
  tylko odmowa założenia nowego pliku – krok naszego zapisu (`atomicStep`: 'dir' / 'create'), nigdy pole `syscall`
  błędu; jeden plik, którego nie da się zastąpić, nigdy nie blokuje folderu (własny plik obecności tylko do odczytu zapis
  naprawia sam – T337). Każdy zapis i usunięcie obecności w main – przez `PresenceKeeper` (`write` / `clear` / `beat`, po
  kolei w folderze; usunięcie sprawdza trzymanie w swojej kolejce), nigdy `writePresence` / `clearPresence` wprost; op
  kolejki nie woła kolejki (czekałby na siebie). Błąd heartbeatu nie jest połykany – w logu na początku i końcu serii.
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
