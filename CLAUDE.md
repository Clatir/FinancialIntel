# Financial Intel – ustalenia projektu

Osobista aplikacja budżetowa na Windows (Electron). Użytkownik jest kapitanem okrętu, a jego finanse to systemy
okrętu (osłony, kadłub, energia, ładownia); analizy mówią językiem ICT. Działa offline, na kilku komputerach (nigdy
jednocześnie), dane w folderze na OneDrive. Trading (konto maklerskie XTB) jest wyłącznie w ICTTJ. Interfejs po polsku, terminy ICT po angielsku. Siostrzana aplikacja:
ICT Trade Journal (ICTTJ, repozytorium `Clatir/TradingJournal`) – ten sam autor, ten sam stos, ten sam wygląd.

## Zasada współpracy
- Przed wykonaniem każdego zadania podaj użytkownikowi, jaki model i jaki poziom thinking będzie najodpowiedniejszy,
  dopiero potem wykonuj.
- **Przed każdym etapem komunikat „Przed etapem N”**: (1) co trzeba wiedzieć – zakres etapu, stan poprzednich, rzeczy
  otwarte; (2) co użytkownik musi powiedzieć – pytania z propozycją, odbiór poprzedniego etapu; (3) co trzeba dodać /
  przygotować – pliki, klucze, ustawienia, testy po stronie użytkownika; (4) model, thinking, szacunek czasu.
  Zapisz go też w `docs/postep.md`.
- **Po każdym etapie**: testy → `/code-review` high → commit + push → wpis w `docs/postep.md` → zaktualizowana tabela
  postępu (etap / grupa, model i thinking **z górką**, szacowany czas pracy Claude'a, stan) → pauza (użytkownik zmienia
  model / thinking).
- **Bez komendy użytkownika nie zaczynaj kolejnego etapu ani grupy** (D67). Grupy etapów idących jednym ciągiem (A: E1
  [+ E2], B: E3 + E4, C: E5 + E6, D: E7 + E8; E9 wypada – D74, bez asystenta AI) – w grupie bez pauzy między etapami,
  jeden PR i wydanie na grupę; tabela w `docs/postep.md`.
- **Scalanie (D71):** PR grupy scalam sam, gdy CI (Linux i Windows) jest zielone, nie ma konfliktu ani otwartych uwag
  i nic nie czeka na decyzję użytkownika. Po scaleniu sprawdź, czy CI na `main` wydało wersję (wydanie publikuje job
  Windows; czerwone E2E na `main` = brak wydania – tak przepadło 0.3.0).
- Po wznowieniu pracy (limit, nowa sesja, streszczenie rozmowy) najpierw przeczytaj `docs/postep.md` i kontynuuj od
  zapisanego miejsca.
- Dokumenty: `docs/specyfikacja.md` (co budujemy), `docs/decyzje.md` (decyzje użytkownika D1… i techniczne T1… – nie
  zmieniaj decyzji użytkownika bez pytania), `docs/plan.md` (etapy i kryteria „gotowe, gdy”), `docs/postep.md`, `docs/przeglad/` (przegląd po 1.4.1: błędy B…,
  wydajność W…, niespójności N…, brakujące funkcje F… – lista do odhaczania i propozycja kolejności etapów).
- Gdy specyfikacja milczy: sprawę techniczną rozstrzygnij sam i dopisz jako T-decyzję; zachowanie widoczne dla
  użytkownika – zapytaj z propozycją (najlepiej w „Przed etapem N”).

## ICTTJ – wzorce i granica
- ICTTJ jest źródłem wzorców. Gdy potrzebny moduł, dołącz do sesji repozytorium `Clatir/TradingJournal` **tylko do
  odczytu** i przenieś kod: kopiuj + dostosuj, na początku pliku komentarz
  `// adapted from ICTTJ <ścieżka> @ <krótki hash commita>`. Lista modułów: `docs/specyfikacja.md`, sekcja „Technika”.
- Nigdy nie zapisuj w repozytorium ICTTJ ani w folderze danych ICTTJ.
- **Konto tradingowe (maklerskie) XTB nie jest częścią FI** – saldo, wyniki, pule i rezerwa należą wyłącznie do ICTTJ.
  Portfel XTB (konto bankowe z kartą) jest kontem budżetu FI. Kosztów tradingu ani bilansu tradingu w FI nie ma.
- Odczyt folderu danych ICTTJ (od etapu E5, `src/main/ictj/`, z obserwacją zmian): tylko `payouts/**` (wpisy
  `withdrawal` z pulą i `return`; `expense` pomijane) i `forecasts/*.json` (cele scenariuszy). Schematy tolerancyjne
  (`z.looseObject`, tylko używane pola), nowszy `schemaVersion` ICTTJ = ostrzeżenie, nie błąd. Każdy wpis ICTTJ dokuje
  najwyżej raz (`dockings/*` z `source.ictjEntryId`).
- Pula wpisu ICTTJ: `current` / `surplus` → zwykłe dokowanie, `goals` → prosto do celów, `tax` → przepływ poza
  budżetem (PIT-38), nie koszt. PIT-38 na radarze tylko jako termin, bez kwoty.
- Dopasowanie: wypłata z ICTTJ bez pary w CSV z mBanku przez 3 dni robocze (D72) → Portfel XTB (potwierdzenie przy
  dokowaniu);
  wpływ z XTB w mBanku bez wpisu w ICTTJ → dokuje normalnie + przypomnienie o wpisie w ICTTJ.
- Przycisk „Otwórz ICTTJ” w menu bocznym FI; w ICTTJ nic się nie zmienia.

## Stack
- Jak ICTTJ – wersje bierz z jego `package.json`: Electron, React, TypeScript (strict), Vite (`electron-vite`),
  Tailwind; zod (schematy = źródło typów), zustand, luxon, ulid, yazl / yauzl, cmdk, @tanstack/react-virtual,
  lightweight-charts.
- **Żadnych natywnych modułów Node.** Wszystkie biblioteki w `devDependencies`, bundlowane do `out/`.
- Testy: Vitest (`tests/unit` – czyste obliczenia, `tests/fs` – folder danych), Playwright `_electron` (`tests/e2e`,
  na Linuksie pod `xvfb-run`).
- Build: electron-builder → `Financial-Intel-Setup.exe` (NSIS) i `Financial-Intel-portable.exe`;
  `appId` `app.financialintel.desktop`, `productName` „Financial Intel”.
- CI (`.github/workflows/ci.yml`, wzór ICTTJ): Linux przy każdym wypchnięciu (testy, build, E2E pod Xvfb); Windows (build, smoke, test
  aktualizacji) tylko dla PR, gałęzi domyślnej i ręcznie; wydanie GitHub Releases dla nowej wersji z `SHA256SUMS.txt`.
- Aktualizacje: wzór ICTTJ (GitHub Releases, SHA-256, portable i instalator); repozytorium publiczne (D61), token
  GitHub per komputer w `safeStorage` tylko na wypadek prywatnego.
- Node do budowania ≥ 22.12, przypięty w `.node-version` (jak ICTTJ, z `scripts/check-node.mjs`).

## Architektura
- `src/shared` – czyste TS używane przez main i renderer: `schema/` (zod), `calc/fleet.ts` (warstwy, dokowanie,
  pensja, koperty, przydział, odkładki, zasięg, klasa), `calc/plan.ts` / `start.ts` (plan miesiąca, kreator),
  `calc/briefing.ts` (odprawa, Daily Bias), `calc/dock.ts` (dostawy z ICTTJ), `calc/goals.ts` (cele, ETA), `calc/loans.ts`
  (pożyczki), `calc/household.ts` (rozliczenia z domownikami), `calc/income.ts` (przychody), `calc/radar.ts` (radar 90 dni), `ictj.ts` (pliki ICTTJ), `notify.ts` (powiadomienia), `machine.ts` (ustawienia komputera),
  `format.ts` (kwoty), `calc/game.ts` (oceny dni, stopnie, misje), `calc/intel.ts` (analizy ICT), `export/` (CSV, Excel, PDF),
  `import/mbank.ts`, `migrations/`, `paths.ts`, `records.ts`, `api.ts` (kontrakt IPC).
- `src/main` – jedyny właściciel folderu danych (`datastore/` z ICTTJ), `threadpool.ts` (pula wątków plików), `quick.ts` (szybki wpis i globalny skrót),
  powiadomienia w `index.ts`, `tray.ts`, `update/`, `config.ts` (ustawienia komputera w userData), `log.ts`; od E5
  `ictj/` (odczyt ICTTJ).
- `src/preload` – `window.fi` (contextBridge); okno z contextIsolation, sandbox, CSP; jedna instancja aplikacji.
- `src/renderer` – React; `store/` (zustand, autozapis jak ICTTJ), `features/<ekran>/`, `components/` (z ICTTJ).
- **Stany warstw nigdy nie są zapisywane** – liczy je `calc/fleet.ts` z rekordów, deterministycznie (wzór:
  `calc/payouts.ts` w ICTTJ). Każda reguła ma test na przykładzie ze specyfikacji.

## Kod (E0 – fundament, 0.1.0)
- Przeniesione z ICTTJ @ 84a8339 (T17): `main/datastore/*` (`DataStore` ogólny po kolekcjach, historia, kopie, watcher,
  obecność), `main/update/*`, `main/tray.ts`, `main/detach.ts`, `main/config.ts`, `main/log.ts`, `shared/merge.ts`,
  `conflicts.ts`, `remoteChanges.ts`, `panels.ts`, `update.ts`; renderer: `store/data.ts` (wzór `store/journal.ts`:
  autozapis, szkice, scalanie trójstronne, `updateRecord` / `addRecord` / `deleteRecord` / `updateSettings`, stan `fi` +
  `records[kolekcja]`), `store/{remote,update,panels,columns,layout,detach,ui}.ts`, `components/*` (Panel, layout,
  ui, Modal, Popover, Toasts, icons), `features/{history,sync,layout,palette,settings/UpdatesTab,detach}`.
- Układ folderu: `shared/paths.ts` `COLLECTIONS` / `LAYOUTS` ('dated' / 'id' / 'month', T18); schematy E0 tymczasowe
  (`schema/records.ts`, T19); `fi.json` = rodzaj `fi` (`schema/settings.ts`: `shipName`, `sync.remoteChanges`,
  `layoutPresets`); `shared/defaults.ts` `createDefaultSettings`.
- Okno: menu boczne `app/App.tsx` (`SideMenu`, ekrany z `features/screens/pages.tsx` `PAGES` – strona, etykieta,
  podtytuł, klawisz Ctrl+1…0), pasek nad stroną `app/PageBar.tsx` (folder, ukryte kwoty, zmiany z drugiego komputera,
  zapis, „Układ”, paleta; ekrany-zaślepki usunięte w 1.6.6 – N34), pierwsze uruchomienie `features/setup/FolderSetup.tsx` (`api.defaultDataDir`: `%OneDrive%\FinancialIntel`, D62),
  Ustawienia `features/settings/SettingsPage.tsx` (Okręt, Folder i kopie, Zasobnik i start, Aktualizacje).
- Proces główny `main/index.ts`: IPC `fi:*`, preload `window.fi` (`shared/api.ts` `FiApi`), zasobnik domyślnie przy
  zamknięciu (D64, `config.tray`), `--hidden` przy starcie z Windows, kopia dzienna przy otwarciu folderu
  (`backup.ts`: 30 dziennych, 5 ręcznych, przed migracją – T20).
- Testy: `tests/unit/*`, `tests/fs/*` (folder danych, historia, kopie, watcher, aktualizacje), `tests/e2e/smoke.spec.ts`,
  `tests/update/*` (tylko Windows CI). Zmienne testowe: `FI_USER_DATA`, `FI_DATA_DIR`, `FI_MACHINE_NAME`,
  `FI_DEFAULT_DATA_DIR` (propozycja folderu), `FI_UPDATE_URL`, `FI_UPDATE_CHECK_DELAY_MS`, `FI_UPDATE_TOKEN`,
  `FI_E2E_EXECUTABLE`, od E5 `FI_ICTJ_DIR` / `FI_ICTJ_APPDATA` / `FI_ICTJ_LAUNCH`, od 1.6.6 `FI_SYSTEM_IDLE` (stała
  bezczynność systemu w s), `FI_IDLE_CHECK_MS`, `FI_CONFIG_RETRY_MS`, od 1.7.0 `FI_CONFIG_WRITE_DELAY_MS` (wolny zapis
  config.json – T271); Windows CI: `FI_UPDATE_FROM` /
  `FI_UPDATE_TO` / `FI_UPDATE_TO_VERSION`. Hak E2E
  `window.__FI_SAVE_DELAY__` (opóźnienie autozapisu).
- Ikona: `node scripts/make-icon.mjs` (`CHROMIUM_PATH=…` jeśli trzeba) → `resources/icon.png`.

## Kod (E1 – model i silnik, grupa A → 0.3.0)
- Schematy: `shared/schema/records.ts` (operacja `transactionSchema` – `TX_KINDS`, `splitSchema` podział paragonu,
  `bankRowSchema` wiersz z banku; kontener, cel, plan miesiąca z `lootSchema`, dokowanie z `ICTJ_POOLS`, pożyczka,
  saldo 'opening' / 'confirmation', miesiąc gry), `shared/schema/budget.ts` (stałe id `fixedId` – `MBANK_ACCOUNT_ID`,
  `XTB_WALLET_ACCOUNT_ID`, `CASH_CATEGORY_ID`, `defaultCategoryId`; `openEnum` – wartości nowszej wersji zachowane,
  T33; konta `defaultAccounts`, kategorie `defaultCategories` wg D68 + `envelopeKind`, `layersSchema`, `ordersSchema`,
  `budgetStartSchema`, `importRuleSchema` / `importSettingsSchema` → `settingsSchema`).
- Obliczenia: `shared/calc/dates.ts` (daty warszawskie), `operations.ts` (`partsOf`, `splitEvenly` – grosze z resztą
  w ostatniej części, `categoryIndex`, `costOf` / `incomeOf`, `isNight`, `asksImpulse`), `fleet.ts` (`computeFleet` →
  `FleetState`: warstwy, koperty, zdarzenia, alarmy; `dockAmount`, `paySalary`, `sinkingSchedule` /
  `sinkingInstallment`, `dailyAllowance`, `rangeMonths`, `shipClass`, `cargoMass`, `layersSum` – T24–T32),
  `balances.ts` (`openingOf`, `balanceAt` na koniec dnia, `lastConfirmation`, `planConfirmation`).
  `shared/operationsView.ts` (oznaczenia, filtr, wyszukiwanie bez polskich znaków `fold` i po kwocie, sumy).
- Renderer: `store/fleet.ts` (`useFleet` – silnik liczony raz, `useMinute`), `components/fields.tsx` (`plnText`,
  `signedPln`, `AmountField` / `DateField` / `TimeField` – zapis po wyjściu z pola), `features/operations/`
  (`OperationsPage`, `OperationEditor`, `pickers`, `state` – filtr w localStorage `fi.operations.filter`,
  `newOperation`, `deleteOperation` z „Cofnij”), `features/balances/actions.ts` (`setOpening`, `confirmBalance` →
  korekta), Ustawienia `AccountsTab` / `CategoriesTab`; `store/ui.ts` `commitActiveField` (T34), `store/data.ts`
  `addRecords` / `replaceRecords`.
- Testy: `tests/unit/fleet.test.ts` (przykłady ze specyfikacji, niezmiennik suma warstw = salda kont),
  `balances.test.ts`, `operations-view.test.ts`, `settings-defaults.test.ts`; E2E `tests/e2e/operations.spec.ts`.

## Kod (E2 – import z mBanku, grupa A → 0.3.0)
- `shared/import/text.ts` (`decodeText`: BOM UTF-8 / UTF-16, UTF-8, Windows-1250; `parseCsv`), `mbank.ts`
  (`parseMbank` – „Lista operacji” / „Historia rachunku”, `#Klient`, okres, pominięte wiersze nie-PLN;
  `splitDescription` – kontrahent, rodzaj operacji, tytuł, nierozliczona; `rowKeys` – T35), `classify.ts`
  (`counterpartyKey`, `upsertRule`, `matchRule`, `hintFor` – kategoria mBanku jako podpowiedź, `isOwnName`,
  `classifyRow` – T37), `reconcile.ts` (`planImport` → known / settle / merge / new / deleted + zniknięte;
  `buildImport` → nowe, zmienione, usunięte, reguły, liczniki – T36, T39–T41), `shared/fold.ts`.
- Main: `datastore/backup.ts` `importBackup` (`backups/pre-import`, 10), IPC `fi:importBackup`, `fi:pickImportFile`
  (CSV do 20 MB).
- Renderer `features/import/`: `ImportPage.tsx` (plik, konto, podsumowanie, dopasowania, grupy z wyjątkami
  wierszy, wynik, saldo z banku), `state.ts` (sesja importu, decyzje, `acceptHints`, `runImport`: tylko do odczytu →
  zapis zmian → kopia → plan od nowa → `buildImport` → zapis → reguły i nazwiska), `rules.ts` (`ruleFor`,
  `rememberCategory` – „Zapamiętaj” w edytorze operacji, `deleteRule`, `setOwnNames`); Ustawienia → Import z banku
  `features/settings/ImportTab.tsx`.
- Testy: `tests/unit/mbank.test.ts`, `import.test.ts`, `tests/fs/backup.test.ts`, E2E `tests/e2e/import.spec.ts`;
  plik `tests/fixtures/mbank/lista_operacji.csv` (zanonimizowany – T44; nowy plik testowy tylko tak).

## Kod (E3 – start i plan miesiąca, grupa B → 1.0.0)
- `shared/calc/plan.ts`:
  - historia: `firstFullMonth`, `fullMonthsBefore`, `costsByMonth`; odbiorca `payeeKey` (kontrahent, bez niego tytuł);
  - propozycje (D70, T47–T48): `proposeSalary` (6 mies., w górę do 100 zł), `proposeEnvelopes` (3 mies., do 10 zł,
    bez płatności kontenerów), `recurringPayments` (stałe opłaty z historii);
  - plan i debriefing: `planFor` (ostatni wcześniejszy plan – T46), `salarySplit` (ładownia, odkładki `sinkingOf`,
    koperty, niezaplanowane), `debriefing` (plan i fakt, łupy, „na plus”), `lootDecision` / `lootDeadline` (7. dzień –
    T52);
  - ładownia: `monthlyShare`, `simulateCargo` (masa i zasięg przed / po – T50), `unlinkedPayments`.
- `shared/calc/start.ts` (kreator – T51): `openingFromNow` (saldo otwarcia z salda teraz), `startTargets`, `startSplit`
  (`dockAmount`); `fleet.ts` – pensja pierwszego miesiąca bez wydanego przed startem (T45).
- Kontener ma odbiorcę `container.counterparty` (T49): `classifyRow` ustawia `containerId`, dodanie kontenera łączy
  płatności. Reguły i kategoria startowe D69 – `settings.seeded` + `seedSettings` w `settingsSchema` (raz na folder).
- Renderer:
  - `features/wizard/` – `state.ts` (`WIZARD_STEPS`, `startWizard` – nie przy działającym budżecie, `finishWizard`),
    `WizardPage.tsx`; baner kreatora w `app/Banners.tsx`;
  - `features/month/` – `actions.ts` (`editPlan` = własny plan miesiąca, `setSalary`, `setEnvelope(s)`, `decideLoot`),
    `MonthPage.tsx` (pensja, podział, przydział, koperty, debriefing z łupami, „na plus” raz – `fi.month.plus.<mies.>`),
    `EnvelopeBars.tsx` (także Mostek);
  - `features/cargo/` – `actions.ts` (`addContainer` + `linkPayments`, `patchContainer`, `deleteContainer`),
    `CargoPage.tsx` (kontenery, linia zanurzenia, zbiorniki, symulacja, propozycje);
  - `OperationEditor` – pole „Ładownia” (`operation-container`); `components/meters.tsx`, `store/records.ts`
    (`useRecordList`), `lib/format.ts` (`monthLabel`, `dayLabel`, `plDate`).
- Testy: `tests/unit/plan.test.ts`, E2E `tests/e2e/month.spec.ts`; `tests/e2e/seed.ts` – folder z rekordami dla E2E
  (kod współdzielony importowany względnie).

## Kod (E4 – Mostek i szybki wpis, grupa B → 1.0.0)
- Shared:
  - `machine.ts` – ustawienia komputera (`config.json` → `prefs`: `quickShortcut`, `hideAmounts`, `notify`,
    `sounds`), `machinePrefsFrom`, `patchMachinePrefs`, `shortcutLabel` (T53);
  - `calc/briefing.ts` – `dailyBias` / `BIAS_LABEL`, `briefing` (pozycje odprawy z kluczami; `money` – formatter, także
    z ukryciem kwot), `alarmText`, `nextPaymentOf` (T57);
  - `notify.ts` – `dueNotices` (T56); `format.ts` – `formatPln` (jeden format kwot); `fleet.ts` `activeIn`.
- Main:
  - `quick.ts` – `QuickEntry`: okno `?quick=1` tworzone ukryte 3 s po starcie, `globalShortcut`; IPC `fi:quickOpen`,
    `quickData`, `quickResult`, `quickAdd`, `quickRefresh`, `quickClose`, `quickShortcutState` (T54);
  - `index.ts` – `setMachinePrefs` + `broadcastPrefs` (`fi:machinePrefs` do wszystkich okien), `notify` (Notification,
    kliknięcie → `fi:notificationClick`), `setTrayStatus`;
  - `tray.ts` – `setStatus` (druga linia dymku), menu: Szybki wpis, Otwórz, Raport wachty dnia (T59).
- Renderer:
  - `features/bridge/BridgePage.tsx` – Mostek; `BridgeFleet` / `bridgeFleet`, `BridgeDetached` (panele w osobnym oknie,
    zdarzenie `open` prowadzi główne okno – T60);
  - `features/quick/QuickApp.tsx` – okno szybkiego wpisu (`main.tsx`: `?quick`); `store/quickHost.ts` – strona głównego
    okna (`quickData`, `quickTransaction`, zapis);
  - `store/notifier.ts` – `check` co minutę, przy pokazaniu okna i przy pierwszym ruchu w oknie; `openTag`; klucze
    wysłanych w localStorage `fi.notify.sent`;
  - `store/machine.ts` – `useMachine`, `loadMachinePrefs`, `setMachinePrefs`, `toggleHideAmounts`;
  - `components/fields.tsx` – `setAmountsHidden` / `amountsHidden` / `AMOUNT_MASK`: `plnText` i `signedPln` maskują,
    flagę ustawia `App` (i `DetachedApp`) przy każdym renderze – nic nie jest memoizowane (T55);
  - `lib/sounds.ts` – `playSound` (WebAudio, T58); `components/ShortcutField.tsx`; `features/settings/MachineTabs.tsx`
    (`LayersTab`, `NotifyTab` – T61); `App.tsx` – Ctrl+$, `TrayStatus`; paleta – kreator, szybki wpis, ukrycie kwot.
- Testy: `tests/unit/notify.test.ts`, `briefing.test.ts`, E2E `tests/e2e/bridge.spec.ts` (okno szybkiego wpisu po
  URL `quick=1`, otwierane `page.evaluate('window.fi.quickOpen()')`).

## Kod (E5 – ICTTJ i dokowanie, grupa C → 1.1.0)
- Shared:
  - `ictj.ts` – typy i parsery plików ICTTJ (`parseIctjPayout` → grosze, wydatki pominięte; `parseIctjForecast` → cele
    z miesiącem; `chosenForecast`, `ICTJ_POOL_LABEL`, `EMPTY_ICTJ`);
  - `calc/dock.ts` – `deliveries` (wpis ↔ operacja `trading`: kwota, −3 dni … +3 dni robocze; Portfel XTB po oknie
    i imporcie; wpływ bez wpisu; stany pending / waiting / docked / skipped / before-start – T63), `withDocking` /
    `previewDocking` (podział silnikiem), `addWorkingDays`;
  - `calc/goals.ts` – `syncIctjGoals` (cele scenariusza jako rekordy z id ICTTJ – T66), `byPriority`, `renumber`,
    `goalInflow`, `goalEtas` (T67); `calc/fleet.ts` – `dockingsByTx`, pula Cele najpierw cele ICTTJ, zwrot z puli
    Podatek z rezerwy (T65);
  - `schema/budget.ts` – `settings.ictj {forecastId, skipped}`; `schema/records.ts` – `goal.ictj {forecastId, goalId,
    currency, amount, version}`; `machine.ts` – `notify.ictj`.
- Main `ictj/`: `reader.ts` (`readIctjFolder`), `source.ts` (`IctjSource`: obserwacja, odczyt co 30 s, `fi:ictj`),
  `locate.ts` (`suggestIctjDir`, `findIctjExe`); IPC `fi:ictjState`, `ictjSuggest`, `ictjPickDir`, `ictjSetDir`,
  `ictjOpen`, `ictjProgram`, `ictjPickExe`; `config.json` → `ictj {dir, exe}` (T62).
- Renderer:
  - `store/ictj.ts` (`useIctj`, `initIctj`, `setIctjDir`, `openIctj`); `store/fleet.ts` `fleetInputNow`;
  - `features/dock/` – `state.ts` (`useDeliveries`, `deliveriesNow`, `openDocking`, `openDockingTag`), `actions.ts`
    (`dockDelivery`, `walletOperation`, `dockingOf`, `skipEntry`), `DockingDialog.tsx` (okno dokowania z animacją),
    `DockPanel.tsx` (Mostek → „Dokowanie”);
  - `features/starmap/` – `StarMapPage.tsx` (Mapa gwiezdna), `actions.ts` (`addGoal`, `patchGoal`, `archiveGoal`,
    `moveGoal`), `sync.ts` (`useIctjGoalSync` w `App`);
  - `features/settings/IctjTab.tsx` (Ustawienia → ICTTJ); menu boczne „Otwórz ICTTJ”.
- Testy: `tests/unit/dock.test.ts`, `tests/fs/ictj.test.ts`, E2E `tests/e2e/ictj.spec.ts` (`FI_ICTJ_APPDATA`,
  `FI_ICTJ_LAUNCH=dry`, `FI_ICTJ_DIR` – T69); E2E czytają folder przez `tests/e2e/files.ts` (pomija pliki znikające
  w trakcie odczytu i pliki tymczasowe).

## Kod (E6 – Radar i należności, grupa C → 1.1.0)
- Shared: `calc/loans.ts` (`loanState` / `loanStates` – raty pokrywane po kolei, zaległa po 3 dniach z `last`; `debtOf`,
  `monthlySchedule`, `OVERDUE_DAYS`, `HOUSE_DAYS` – T70), `calc/radar.ts` (`radar` – 90 dni, `pit38Deadline` – T73);
  `calc/fleet.ts` – `FleetState.loans`, `debt`, `receivables.houseSince`, `rangeMonths(…, debt)`, `nextPaymentOf` (przeniesione
  z briefing.ts), spłata pożyczki udzielonej do wysokości długu (T71); `calc/briefing.ts` – pozycje `loan`, `pit38`, `house`;
  `notify.ts` – tag `radar`; `machine.ts` – `notify.loans`, `notify.pit38`; `calc/plan.ts` `simulateCargo(…debt)`.
- Renderer: `features/radar/` – `RadarPage.tsx` (oś 90 dni, pożyczki z formularzem i spłatami, należności, PIT-38),
  `actions.ts` (`addLoan` – z operacją i kontenerem rat, `recordPayment`, `closeLoan`, `deleteLoan`); `OperationEditor` –
  wybór pożyczki przy rodzaju „Pożyczka”, `withKind` zdejmuje `loanId`; `operations/state.ts` `openRefundables`; Mostek –
  linia „Dług” w stanie okrętu, cele odprawy `loan` / `pit38` → Radar, `house` → zakupy „do zwrotu”.
- Testy: `tests/unit/loans.test.ts`, E2E `tests/e2e/radar.spec.ts`.

## Kod (E7 – Dowództwo, grupa D → 1.2.0)
- Shared: `calc/game.ts` – `rateDay` (stan na koniec dnia, naruszenia zwykłe / poważne, smaczki – T75), `advanceGame`
  (zamrażanie, misje, stopnie, osiągnięcia – T76–T79; stałe id `gameMonthId` / `missionId` / `rankChangeId`),
  `chooseMission` / `missionStatus` / `missionText`, `promotionProgress`, `rankOf`, `gameView` (pasek dni, seria,
  rekord, dziennik wachty); `schema/records.ts` – `gameDaySchema` (+ `cls`, `cargo`, `tags`), `gameMissionSchema`;
  `schema/budget.ts` – `settings.game` (start i progi), `settings.import.log`; `calc/dates.ts` – `warsawEndOf`,
  `isoWeekOf`, `mondayOf`, `mondayOfWeek`; `calc/fleet.ts` – `EnvelopeState.today`, `CLASS_FROM`; `calc/briefing.ts` –
  pozycja `mission`, `silverBullet`.
- Renderer: `store/game.ts` (`useGameAdvance` – start i zamrażanie w tle, `useGame`, `useGameCelebrations` /
  `celebrationsOf` – T80), `features/command/` – `CommandPage.tsx` (Dowództwo, Ctrl+8: stopień, klasa, seria, misja,
  osiągnięcia, rozkazy i progi, dziennik wachty; `Insignia`), `Celebration.tsx` (ekran awansu, toasty); Mostek – misja
  i Silver Bullet w odprawie; `EnvelopeBars` `elapsed` (Equilibrium) i `Meter` `tick`; Mapa gwiezdna – znaczek DOL.
- Testy: `tests/unit/game.test.ts`, E2E `tests/e2e/command.spec.ts`.

## Kod (E8 – Wywiad i raporty, grupa D → 1.2.0)
- Shared: `calc/intel.ts` – `balancesAt` (sumy narastające), `wealthCurve`, `structureOf` (BOS / CHoCH – T81),
  `killzoneGrid`, `spendingByMonth`, `rangeForecast`, `logAccuracy` (T82), `weekNumbers`, `nextWeekEnvelopes`,
  `yearNumbers`, `yearWealth`, `goalsReachedIn`, `defaultWatchMonday` / `WATCH_TIME` (T83); `export/budget.ts` –
  `toCsv` / `plnCell`, `operationRows` / `operationsCsv` / `operationsSheet`, `monthRows` / `monthsCsv` / `monthsSheet`,
  `reportHtml` (T84); `export/xlsx.ts` (z ICTTJ); `notify.ts` – tag `reports`, `notify.watch`.
- Main: `export/pdf.ts`, `export/xlsx.ts` (z ICTTJ); IPC `fi:saveTextFile`, `fi:saveXlsx`, `fi:savePdf`.
- Renderer: `features/intel/` – `IntelPage.tsx` (Wywiad, Ctrl+9), `charts.tsx` (`WealthChart` – lightweight-charts
  z markerami i drawdownem, `KillzoneMap` – SVG); `features/reports/` – `ReportsPage.tsx` (Raporty, Ctrl+0: odprawa,
  raport wachty, debriefing i przegląd roczny z PDF, eksport), `state.ts` (`useReportsUi`, `openWatchReport`);
  `features/bridge/BridgePage.tsx` – `useBriefingItems` (wspólne z Raportami).
- Testy: `tests/unit/intel.test.ts`, `export.test.ts`, E2E `tests/e2e/intel.spec.ts` (okno zapisu podstawione przez
  `app.evaluate`).

## Kod (1.2.1 – grupowanie importu z mBanku, D75 / D76)
- Shared `import/`:
  - `names.ts` – `counterpartyKey` (klucz całej nazwy, re-eksport z `classify.ts`), `withoutLegalForms`;
  - `brands.ts` – `tokens` / `words` (złożone słowa, „?” banku = dowolna litera), `brandOf` (klucz marki: domena,
    operator płatności, miasta `CITIES`, kody sklepów; `dictionary` / `transfer`), `BRANDS` (słownik sieci, stałe id),
    `KEYWORDS` + `keywordIn`, `keywordMatches` / `normalizeKeyword` (słowa użytkownika) – T85, T86;
  - `classify.ts` – `ruleTargetOf` (marka, cała nazwa, słowa nazwy i tytułu; wspólne z Operacjami), `findRule`
    (marka → cała nazwa → „zawiera” → słowo użytkownika), źródła `brand` / `keyword`, `byTitle` – T87;
  - `reconcile.ts` – `groupKey` / `proposalSig` (marka | kierunek | propozycja), `importGroups`, `importThemes`
    (`ThemeBasis`: propozycja / podpowiedź mBanku / rodzaj operacji), `searchGroups`, `ImportChoices.themes` /
    `rememberThemes` / `skip`, nauka reguł po marce w `buildImport` – T88–T90.
- Schemat: `importRuleSchema.mode` + `keyword` (addytywnie).
- Renderer `features/import/`: `state.ts` (`chooseTheme`, `themeStatus`, `acceptSure`, `acceptHints` / `hintable`,
  `replanImport` / `replanIfRulesChanged` – `rulesUsed`, wyszukiwanie `query`, zaznaczenie `selected`,
  `chooseSelected`, `skipSelected` / `setSkip`), `options.ts` (opcje decyzji, `BULK_OPTIONS`, `fits`),
  `KeywordRules.tsx` (słowa użytkownika – też w Ustawienia → Import), `ImportPage.tsx` (`ThemesPanel` z sekcjami,
  `ThemeRow`, `GroupRow`, `BulkBar` – słowo z wyszukiwania), `rules.ts` (`ruleFor` / `rememberCategory` po marce,
  `saveKeywordRule`, `rememberBrands`, `keywordOfSearch`).
- Operacje (T91): `features/operations/state.ts` `ticked` / `tickOperations` / `categorizeTicked` (z „Cofnij”),
  `OperationsPage.tsx` kolumna zaznaczenia, `TickAll`, `BulkBar` (`operations-bulk-*`), `DuplicatesLink`.
- Duplikaty (D77, T92–T94, wzór ICTTJ 1.19.1): `reconcile.ts` `joinable`, `looseMatch`, `closeAmount`, `merge.loose` /
  `ask`, `joins`; `shared/import/duplicates.ts` (`findDuplicates`, `mergeDuplicate`, `duplicateKey` / `rowKey`);
  `settings.import.notDuplicates`; renderer `features/import/DuplicatesPanel.tsx` (`useDuplicates`, scalanie,
  `deleteManyWithUndo(…, onUndo)`); testy `tests/unit/duplicates.test.ts`, E2E `tests/e2e/duplicates.spec.ts`.
- Testy: `tests/unit/import-brands.test.ts`, `import.test.ts`, E2E `tests/e2e/import.spec.ts`.

## Kod (1.2.2 – podobne nazwy i propozycja reguły, D78)
- Shared `import/`:
  - `aliases.ts` – połączone nazwy (`settings.import.aliases`: klucz marki → `{to, label, toLabel, at}`), `resolveBrand`
    (pętla z dwóch komputerów → pierwszy klucz pętli), `withMerged` (łańcuchy o jednym kroku), `pairKey` – T95;
  - `similar.ts` – `similarity` ('words' / 'cut' / 'typo' – nie u osób / 'first'), `similarPairs` (nazwy pliku spoza
    słownika i marki reguł exact spoza pliku, koszyki po słowach i początku / końcu klucza, `notSimilar`), `mergeTarget`,
    `editDistance` – T96;
  - `learn.ts` – `keywordProposals` (słowa z nazwy / tytułu przelewu bez ogólnych, miast, miejscowości z pliku, osób i
    właściciela; liczba operacji innych grup bez decyzji użytkownika, którym słowo zmieni decyzję – `findRule`; bez słów
    łapiących inne słowa) – T98;
  - `brands.ts` – `BrandMatch.words`, `brandById`, `isGenericWord`, `isKeywordWord`, `isCityWord`, `sameWord`;
    `classify.ts` – `RuleTarget.raw`, `ruleTargetOf(…, aliases)`, `ClassifyContext.aliases`, `Classified.target`;
    `reconcile.ts` – `PlannedRow.words` / `target`, `ImportGroup.chain`, `shareMerged` (połączone nazwy dzielą
    rozpoznanie).
- Schemat: `settings.import.aliases`, `settings.import.notSimilar` (addytywnie, `lenientRecord`).
- Renderer `features/import/`: `Learning.tsx` (`SimilarPanel` – „Podobne nazwy”, `namesToMerge` /
  `mergeSelectedNames` – „Połącz nazwy” w `BulkBar`, `RuleProposal` – pod grupą `lastDecided`), `state.ts`
  (`useImportGroups`, `planInputs` – plan od nowa po zmianie reguł albo połączeń, `decideGroup`, `closeProposal`,
  `ownNamesWith`), `rules.ts` (`mergeNames` / `unmergeName` z „Cofnij”, `dismissSimilar`, `clearDismissedSimilar`,
  `ruleDecisionText`, `saveKeywordRule` z całą decyzją; reguły Operacji przez połączenia); Ustawienia → Import z banku –
  „Połączone nazwy” (`MergedNames`).
- Testy: `tests/unit/import-similar.test.ts`, E2E `tests/e2e/learning.spec.ts`.

## Kod (1.2.3 – poprawka podobnych nazw, D79)
- `shared/import/names.ts` `cleanBankName(name, {town})` – bez „DATA TRANSAKCJI: …”, dat, godzin, numeru karty, „Ref”;
  `town` = miasto po ostatnim „/” (bank: sklep w 19 znakach + „/Miasto”), tylko w nazwie sklepu z dopiskiem daty;
  `counterpartyKey(name, raw)`, `brandOf(…, {raw})` – klucze sprzed 1.2.3; `mbank.ts` – kontrahent bez dopisków, sklep
  z tytułu historii (`PURCHASE`, też `POS ZWROT`), `MbankRow.bankName` / `BankRow.bankName` (nazwa jak czytały ją
  wcześniejsze wersje, '' = rodzaj operacji); `classify.ts` `RuleTarget.legacy`, `isFeeOperation` (prowizja bez nazwy:
  tytuł nie decyduje – T104); `brands.ts` `withoutProcessor`.
- `similar.ts` – słowo z nazw ponad `MAX_BRANDS_OF_WORD` (4) marek nie wyróżnia, `isKindWord` (rodzaje miejsc), bez
  „Połącz wszystkie”, bez grup nazwanych rodzajem operacji; `learn.ts` – słowa ponad połowy marek pomijane, `ENDINGS`
  (polskie końcówki); `rules.ts` `inactiveAlias` / `removeInactive` / `unmergeAll`, `saveKeywordRule` odrzuca słowa
  ogólne.
- Testy: `tests/unit/import-similar.test.ts` („dopiski banku”), `mbank.test.ts`, E2E `learning.spec.ts` na
  `tests/fixtures/mbank/historia_rachunku.csv` (syntetyczna historia rachunku).

## Kod (1.3.0 – rozliczenia z domownikami, D80)
- Shared:
  - `schema/budget.ts` – `settings.household.members` (`householdMemberSchema`: `name`, `bankNames`, `inflow` ask /
    advance / income – `inflowOf`, `archived`), `HOUSE_MEMBER_ID` = `fixedId('MEM', 1)` („Dom”, `defaultMembers`),
    `importRuleSchema.memberId`; `schema/records.ts` – operacja `memberId` (kto finansuje / czyje pieniądze), `advance`,
    `covers`, część paragonu `memberId`; `repaid` tylko zapisy sprzed 1.3.0 (T108);
  - `calc/household.ts` – `settleHousehold` (rejestr: `byTx` przepływy `fromDeposit` / `lent` / `repaid` / `advance` /
    `income`, salda `MemberBalance` z kolejką `open`; `from` = start budżetu, `openings` = salda otwarcia kont; memo po
    tablicy), `payerOf`, `settlesHousehold`, `balanceOf`, `memberName`, `financedBy` (T105, T106);
  - `calc/fleet.ts` – warstwa `deposit` w `layersSum`, `FleetState.household` (rejestr silnika – ekrany, raporty),
    `receivables.members`, `householdOf` (rejestr bez floty – misje), `budgetStartOf`; `calc/balances.ts` `openingsOf` /
    `openingOf` – jedna reguła salda otwarcia (T106, T107); `calc/operations.ts` `financerOf`, `financedOf`,
    `incomeOf(t, rejestr)`;
  - `import/classify.ts` – `memberOf` (nazwy w banku), domownik przed regułą zwykłego wpływu bez osoby;
    `import/reconcile.ts` – `Choice.memberId` / `advance`, temat z propozycji dla domownika „pytaj” (`byProposal`) (T110);
  - `calc/briefing.ts` / `notify.ts` / `machine.ts` – przypomnienie i powiadomienie na osobę (`notify.house`, T111);
    `calc/game.ts` – misja „house” z `householdOf`; `calc/intel.ts` / `export/budget.ts` – przychód z rejestru, kolumna
    „Finansuje” (T113).
- Renderer:
  - `features/household/` – `actions.ts` (`useMembers`, `addMember`, `addMemberFromBank`, `patchMember`,
    `rememberInflows` – D80 b), `MemberPickers.tsx` (`FinancerSelect`, `FinancedNote`, `MemberIncome` z „Pokrywa”);
  - `features/settings/HouseholdTab.tsx` (Ustawienia → Domownicy); `store/fleet.ts` `useHousehold` = `fleet.household`;
  - import – `options.ts` (opcje `refundable:<id>`, `household:<id>:income|advance`), „+ domownik” (`NewMember`);
    szybki wpis – „Za domownika”, `quick-financer`, `quick-payer`; Operacje – `financeTicked` („Ustaw finansującego”);
    Mostek / Radar / Plan miesiąca / Raporty – salda, depozyt, „Sfinansowane przez domowników” (T112).
- Testy: `tests/unit/household.test.ts`, domownicy w `tests/unit/import.test.ts`, E2E `tests/e2e/household.spec.ts`.

## Kod (1.4.0 – domownicy bez bankowości i przychody, D81)
- Shared:
  - `schema/budget.ts` – `settings.household.since` (brak = 1.4.0 ustawia dziś raz, null = od startu budżetu), osoba
    `via` (przekazuje przez) i `opening` {owed, deposit} (`memberOpeningSchema`); `schema/records.ts` – część `advance`
    (części wpływu = pieniądze osób);
  - `calc/household.ts` – `LedgerOptions` (`from` = dzień rozliczeń z saldami `members[].opening`, `reset` = start
    budżetu), `incomeShares` (części wpływu, reszta nadawcy), `heldOf`, `OPENING_TX` / `isOpeningItem`, `memberOf`
    (przeniesione z importu), `isMemberMoney`; `calc/fleet.ts` – `settleFromOf`, zdarzenie `household` (depozyt = zaliczki
    na start), `FleetState.incomeStats` / `incomeContext` / `settleFrom`, `income` = razem z 6 mies. (T115–T117);
  - `calc/income.ts` – `IncomeContext`, `incomeParts` (praca / trading), `incomeOfPeriod` (trading netto ≥ 0),
    `incomeByMonth`, `incomeStats` (okna 3 / 6 / 12, mediany), `taxOfDockings`, `plainIncomeContext`; `intel.ts` /
    `export/budget.ts` – przychód z kontekstu, CSV „od: osoby” (T119, T120); `briefing.ts` – „przekazuje przez”, saldo na
    start; `merge.ts` – etykiety pól.
- Renderer: `features/household/actions.ts` (`setHouseholdSince`, `useHouseholdSinceSeed` w `App` – salda do wczoraj
  jako saldo na start), `MemberPickers.tsx` `MemberIncome` (części wpłaty `income-split-*`, `operation-also-for`,
  `useLedgerBefore`), `settings/HouseholdTab.tsx` (`SinceRow`, `OpeningField`, `member-via`), `month/IncomePanel.tsx`
  (Plan miesiąca, Mostek `bridge-income`), szybki wpis `quick-share` (`QuickDraft.shares`), lista operacji „od: osoby”,
  Radar „przekazuje przez”.
- Testy: `tests/unit/income.test.ts`, D81 w `tests/unit/household.test.ts`, E2E D81 w `tests/e2e/household.spec.ts`
  (testy E2E z należnościami sprzed dziś ustawiają `household.since`).

## Kod (1.4.1 – wczytywanie folderu, D82)
- Main: `threadpool.ts` (importowany pierwszy w `index.ts`: `UV_THREADPOOL_SIZE` 32 – pliki OneDrive tylko online
  blokowały 4 wątki, T123), `datastore/progress.ts` (`ReadTracker` – etap, „x z N”, plik czekający najdłużej, wolne
  odczyty, najwolniejsze; `describeProgress`, `untilAborted`), `DataStore.open({signal, slowMs, readDelayMs, onCommit})`
  + `progress()` / `loadStats`, `READ_CONCURRENCY` 24 (otwarcie i pełne odświeżenie), `walkFiles` / `mapLimit` z
  przerwaniem; `openFolder`: `OpenProgress` do okna co 250 ms (`fi:openProgress`), log co 10 s i „open start / aborted /
  failed / superseded”, `cancelOpen` (do końca odczytu – od migracji `onCommit` już nie), `openGeneration`, obecność
  innych komputerów najwyżej 2 s; `watchHangs` (`unresponsive` → log z etapem okna, po 10 s okienko), `fi:step` (etapy
  obliczeń okna, ≥ 500 ms do logu). Typy `OpenProgress` / `OpenStep` / `SLOW_FILE_MS` / `OPEN_ABORTED_MESSAGE` w
  `shared/api.ts` (T124–T126).
- Renderer: `features/setup/OpenProgress.tsx` (`useOpenProgress`, `OpenProgressPanel` – `open-progress`, `open-cancel`,
  `open-logs`, `open-progress-cloud`), ekran wyboru folderu (`setup-logs`) i start (`BootScreen` w `App.tsx`),
  `lib/timing.ts` `timed` (silnik budżetu, gra, saldo na start).
- Testy: `tests/fs/open-progress.test.ts`, E2E `tests/e2e/open.spec.ts`; zmienne testowe `FI_OPEN_DELAY_MS` (opóźnienie
  każdego odczytu) i `FI_OPEN_SLOW_MS` (próg wolnego odczytu).

## Kod (1.4.2 – pieniądze i dane się zgadzają, grupa E, D84)
- Cele od chwili zmiany (C1–C3, B2, B13, B30, N1, T128–T131): `goal.activeFrom` / `past` (`goalPastSchema`, stan sprzed
  każdej zmiany kolejności, kwoty, archiwizacji) / `transfers` (`goalTransferSchema`); `calc/goals.ts` `goalAt`,
  `goalTakes`, `goalDecided` (cele sprzed 1.4.2 bez historii – jak wcześniej), `changeGoal`, `transferGoal`, `renumber(…,
  now)`; silnik: dostawa do celów z chwili wpływu `cameIn` (utworzenie dokowania albo operacji, nie wcześniej niż początek
  jej dnia), łupy z `decidedAt`, przeniesienia (slot 4) `min(kwota, stan)`, `FleetState.goals[].takes`; renderer:
  `starmap/actions.ts` `addGoal` / `patchGoal` / `archiveGoal(g, archived, to)` / `moveGoalMoney`, `GoalMoneyDialog`
  (`starmap-archived-move`), wydatek z celu `GoalSelect` w `OperationEditor` (`operation-goal`; cel albo kontener),
  scenariusz ICTTJ zapamiętany, zmiana z potwierdzeniem (`ictj-forecast-confirm`).
- Domownicy i import (B3–B5, T132–T134): `rebaseOpenings` (`fleet.ts`) w `setHouseholdSince` z „Cofnij”; `proposalSig`
  z osobą; `bank.source` / `bank.altKeys`, `formatsOf` (format starszych importów), `coverageOf` (dni pliku), krok
  „drugi format” w `planImport` (`known` + `other`), `ImportPlan.format`; duplikaty `bank-format` (w zakresach obu importów).
- Ładownia i plan (B1, B6, B10, B11, B46, B55, B56, T135–T139): `container.archivedAt`, `activeIn` / `lifeOver`,
  `paidCycleOf(c, m, closed)`, `nextUnpaidOf`, `tanks[].paidDue`, zdarzenie `tank` (resztka zbiornika do osłon),
  `cargo/actions.ts` `fromNow` / `archiveContainer`, `MonthField` (`fields.tsx`); `monthPlanId` (stałe id planu),
  `editPlan` zamraża następny miesiąc, `lootApplied` (zdarzenie `loot` z `ref`), `LootDecided` (`loot-decided`, `loot-changed`).
- Folder danych (B9, B42–B50, T140–T143): `FileState.readError` + `DataStore.unreadable` / `reread`, `RemovedOutsideError`
  i `ConflictCopyError` (z `change` dla okna), `history.snapshot` → plik + `drop`, `resolveConflict` (`keepAside`, plan
  miesiąca pod id zachowanego, strony sprawdzane), kopia planu `-KOMPUTER.json`, `Mutex.idle` / `DataStore.idle`,
  zamykanie (`QUIT_DRAIN_MS`, `FLUSH_SILENT_MS`, `FLUSH_LIMIT_MS`, `fi:flushing`, `windowClosing`), `openErrorMessage`,
  `trash` przez `withRetry`; `merge.ts` `MISSING`, `PendingRemote.savedAfter`.
- Szybki wpis i pola (B51, B24, T144): `QuickDraft.id` (host odrzuca znane id), okno zablokowane do następnego otwarcia,
  Esc w fazie przechwytywania, zegar zamknięcia kasowany przy otwarciu; `cancelled` w `AmountField` / `DateField` /
  `TimeField` / `MonthField` / `NameInput`. Gra (B32): `namesNote`, notatka naruszenia ≤ 500.
- Testy: `tests/unit/goals.test.ts`, `tests/fs/datastore-robust.test.ts`, E2E `tests/e2e/goals.spec.ts`; poszerzone
  `fleet`, `import`, `household`, `merge`, `game`, E2E `month`, `household`, `ictj`, `bridge`, `operations`.

## Kod (1.4.3 – szybkość przy dużym folderze, grupa F, D84)
- Okno (W2–W6, W9–W16, T146–T149): `store/fleet.ts` – silnik po dniu warszawskim (`useToday`) i kluczu części, które
  czyta (`KEY_SETTINGS`, `KEY_COLLECTIONS`, `useEngineParts`); `store/data.ts` `listOf` (jedna lista na mapę, WeakMap),
  `stampInPlace` (odpowiedź zapisu i echo tylko ze zmienionymi polami zapisu – bez nowej mapy), `shareSettings` /
  `adoptSaved`; `store/game.ts` `gameParts`, `useGameView` (bez oceny dziś), `DAYS_PER_PASS` 2 + `advanceGame(…, {maxDays,
  locked})` (`more`; miesiące innej wersji pomijane); `App.tsx` `Background`; `ui.tsx` `useTextDraft` (`commit`: zapis po
  wyjściu z pola, Enter / Ctrl+Enter, Esc cofa, komunikat, gdy tekst zmienił się w międzyczasie); `DuplicatesPanel`
  `useDuplicateCount(1500)`; `findDuplicates` najpierw kwota, potem nazwa (`looseMatch`), `around` (dni ±3 raz na datę),
  `counterpartyKey` i słowa nazwy w pamięci (do 50 tys.); `plan.ts` `payeeKey` (WeakMap), `household.ts` `memberCache`,
  `operationsView.ts` teksty wyszukiwania raz na rekord i `parsedQuery`, `quickHost.ts` `officerOf`, `dock.ts` mapa tylko
  operacji tradingu i zadokowanych.
- Magazyn (W1, W8, W26, T150): `FileMap` (indeksy: `ids` `kind:id` → ścieżki, `problemPaths`, `copyPaths`, `dirs`,
  `migratedPaths`, `dirty` / `metaDirty`), `updateViews` / `fullViews` / `computeViews`, `uncommitted` (różnica tylko
  zmienionych), `FI_VERIFY_VIEWS` (testy porównują z pełną przebudową); `saveRecords` / `deleteRecords` (IPC paczką, usunięcie z
  zewnątrz w osobnej zmianie), w oknie `saveBatch` / `runSaveMany` / `applySaved` / `saveFailed`, `settled` (zapis po
  nieudanym nigdy nie utyka), `deleteRecords` (niedokonane wracają z niezapisanymi zmianami); `FileState.text` tylko
  do migracji.
- Folder (W21–W24, T151–T153): `RefreshQueue` (`watch.ts`: jedno odświeżenie naraz, zaległe łączone), pełna kontrola
  `refresh()` = `statAll` przed kolejką zapisów + `rescanAll(listing)`, `rescanPaths` / `changedInDir` (zdarzenie katalogu:
  wpisy porównane; `dir/` z `FolderWatcher` przy `rename` = całość pod nim), `FOCUS_REFRESH_MS` 60 s, `pollMs` 5 min
  (natywny) / 30 s; `resolveConflicts` (IPC, grupy `skipped`) i `resolveConflict` / `trashFile` bez przeskanowania;
  `loadFile` – nowy plik jednym otwarciem (`readWithStat`), pliki `.tmp-` z pierwszego przejścia.
- Kopie (W7, F2, N19, C4, T154): `zip.ts` `ZipWriter` (jeden przebieg, ZIP64 od 65 535 wpisów), `writeZipFile(out,
  ZipSource[])`, `diskSource`, `zipFolder(root, out, include, skip)` (przed migracją); `DataStore.zipData` (rekord z pamięci,
  gdy SHA-1 tekstu = pliku, inaczej z dysku; nieczytelny – kopia przerwana); `backup.ts` `DataSource`, `runBackups` (14
  dziennych, `weekly/RRRR-Wnn.zip` 8, pierwsze tygodniowe z dziennych), `index.ts` `dailyBackup` (otwarcie, co godzinę,
  `powerMonitor` 'resume'), `checkedData` (pełna kontrola przed kopią dzienną i ręczną); Ustawienia `BackupAge`
  (`backup-age`, ostrzeżenie po 3 dniach).
- Testy: `tests/fs/folder-speed.test.ts`, poszerzone `backup`, `datastore-robust`, `watch`, `tests/unit/data-store.test.ts`,
  `game.test.ts`, E2E `sync.spec.ts` (pole w trakcie pisania); pomiar na 30 tys. / 150 tys. – `docs/postep.md` „1.4.3”.

## Kod (1.5.0 – domownicy, ICTTJ i dokowanie, grupa G, D83 / D84)
- Wspólne finansowanie (D83, F0, T156–T158): `shared/calc/share.ts` – `share` operacji (`shareSchema`: `mode` równo /
  procenty / kwoty, `lines` {`memberId` – null = ja, `value`, `gift`}) to opis, prawdą są linie `splits` (jedna na osobę,
  kategoria operacji; starsza wersja czyta je jak paragon): `shareAmounts`, `shareSplits` (id linii po pozycji),
  `shareOf` (linie wciąż z podziału), `withShare`, `withAmount` (edytor), `withBankAmount` (import: tylko wspólny zakup
  od nowa), `shareComplete`, `percentSum`, `equalPercents`, `restIndex`, `changeMode`, `startShare`; prezent `gift`
  (operacja z jednym finansującym albo linia) – `Part.gift`, `MemberFlow.gift` (zaliczka, potem osłony; zwrot do osłon),
  `operations.ts` `ownSpent` (moja część), `household.ts` `financersText`; reguła importu i decyzja (`importRuleSchema.gift`
  / `.share`, `ImportDecision`, `Choice`, `proposalSig`, `upsertRule` – cała decyzja); konto `cash` (`CASH_ACCOUNT_ID`,
  seed `account:gotowka`, kreator bez wymaganego salda gotówki). Renderer: `features/household/ShareEditor.tsx`
  (`ShareEditor` – testid `<prefiks>-line/-person/-percent/-amount/-part/-gift/-remove/-add/-sum/-clear`, `shareNames`),
  `MemberPickers.tsx` `FinancerSelect` (`pay:` / `gift:`), edytor (`operation-share-start`, `operation-share`), szybki wpis
  (`quick-joint-start`, `quick-joint`, `quick-gift`; `QuickDraft.gift` / `.share`), Operacje (`operations-bulk-financer`
  „wspólnie…”, `operations-bulk-share`, `financeTicked`, `categorizeTicked` także wspólnych), import (`options.ts` `gift:` /
  `share`, `import-bulk-share`, `<decyzja>-share`; procenty ≠ 100 % odrzucone w `runImport`), `rules.ts` `financingOf`.
- Domownicy i gra (B14, B40, B41, N5, T159–T161): `settings.household.openingIds` (operacje, które salda na start
  obejmują – `fleet.ts` `openingIdsOf`, ustawiane z datą rozliczeń i raz w folderze sprzed 1.5.0), `LedgerOptions.covered`,
  `HouseholdLedger.late` / `lateDeposit` (spoza listy – zaraz po saldach na start), `rebaseOpenings` bez nich,
  `seedSince` (dzień po ostatniej operacji z banku), `household-since-late`; import – reguła „finansuje” w obie strony,
  zwrot kartą z reguły zakupu, `shareMerged` nie oddaje decyzji pieniądzom domownika; `game.ts` – naruszenia, tag i misje
  z `ownSpent`, osłony bez pożyczonych domownikom i prezentów.
- ICTTJ i dokowanie (B15–B22, F42, T162–T164): `dock.ts` `deliveries` – `orphans` (operacji nie ma), `entryGone` (wpis
  usunięty – `entriesComplete` + `unreadEntries` z `IctjSnapshot.unread` / `complete`, czytnik `main/ictj/reader.ts`),
  `poolChanged`, `extra` (operacja z banku przed Portfelem XTB), `near` / `nearAmount` / `NEAR_EXTRA_DAYS` (po dokładnych
  parach), `coveredTo` (`settings.import.coveredTo` – okres pliku z banku, `dock/state.ts` `coveredToOf`), start po dacie
  pieniędzy, `pendingPairDays` → `advanceGame` `hold` (`store/game.ts`, 7 dni); `ids.ts` `derivedId` (operacja Portfela i
  dokowanie z id wpisu), `dock/actions.ts` `removeExtraDockings`, `deleteOperation` z dokowaniami (`restoreDeleted`),
  znaczki w `DockPanel` i dopiski w `DockingDialog` (`docking-entry-gone`, `-near`, `-pool-changed`, `-extra`);
  `dates.ts` `easterOf`, `isPolishHoliday`, `isWorkingDay` (tylko w `addWorkingDays`).
- Testy: `tests/unit/share.test.ts`, poszerzone `dock`, `import`, `game`, `household`, `fleet`, `settings-defaults`,
  `tests/fs/ictj.test.ts`; E2E `tests/e2e/shared.spec.ts`.

## Kod (1.5.1 – import z mBanku, grupa H, D84)
- Import (B34–B39, N12–N16, T166–T167): `mbank.ts` `keyOnAccount` / `keyOccurrence` (klucz wiersza zależy od konta),
  `MbankRow.booked` (data księgowania, gdy inna), `accountNumberOf` / `accountNumberText`, `otherBankAccount` (dwa
  rachunki banku – `ClassifyContext.accountNumbers`, `findDuplicates(…, accountNumbers)`); `classify.ts` `PER_OPERATION_KINDS` (pożyczka, PIT-38, XTB – nigdy
  regułą), `loanOf` + `decision.loanId` (zwrot pożyczki z Radaru), `findRule(…, amount)`; `reconcile.ts` – status
  `elsewhere` (operacja na innym koncie, `ImportChoices.moveHere`, `movesHere`), `known.moved`, `merge.planned` (wpis ręczny
  „Nie łącz” z rozpoznaniem), `learnable`, `Choice.loanId`, `ruleDecisionOf`, liczniki `moved`; `duplicates.ts` – także
  między kontami; renderer `features/import/state.ts` (`planInputsNow` / `replanIfChanged`, `planSignature` przed zapisem,
  tematy po przeliczeniu, `snapshot` / `restore` – „Cofnij” przy zamknięciu i innym pliku, `errorName`, zapis bez zmian),
  `options.ts` (`loan:<id>`, `LoanPick`), `DecisionFields.tsx` (wydzielone z `ImportPage.tsx`, `exclude`), `rules.ts`
  (`bankNameOf`, `choiceOfRule`, `editRule`, `addAmountRule`, `applyRuleToHistory`).
- „Cofnij import” (F4, T168): kolekcja `imports/` (`importBatchSchema`, `ImportBatchSettings`; `paths.ts` układ 'id',
  `records.ts`, migracje, etykiety Synchronizacji i historii), `shared/import/batch.ts` (`importBatch`, `rulesChanged`,
  `latestImport`, `batchesToDrop` – 10, `undoPlan` – merge3 zmienionych, `rulesUndone`, `settingsUndone`,
  `settingsRedone`); `settings.import.accountNumbers`; powody usunięcia `undo` (na liście usuniętych, `deletedBankKeys`
  je pomija) i `drop` (bez historii, tylko `imports/`) – `DataStore.deleteRecords(…, reason)`, IPC
  `deleteRecords(collection, ids, reason)`, `deleteRecords(…, {reason})` w `store/data.ts`, `history.deleted` z `_undo_`;
  renderer `features/import/batches.ts` (`useImportBatches`, `useLatestImport`, `undoPreview`, `undoImport(id, force)` –
  `notArrived` i „Cofnij mimo to”, odmowa dysku zostawia import; „Cofnij” = `redoImport`), `RecentImports.tsx` (`UndoImportButton` – `import-undo`, `import-undo-dialog`,
  `import-undo-plan`, `import-undo-confirm`; „Ostatnie importy” – `recent-import`, `recent-import-undo`,
  `recent-import-undone`), `runImport` `writeBatch`, `ImportDone.batchId`, `AccountWarning` (`import-account-warning`),
  `import-already`, `import-undone`.
- Saldo z pliku (F5, T169): `shared/import/statement.ts` (`bookingOrder`, `statementOf`, `statementCheck`), `runImport`
  `confirmFromStatement` (potwierdzenie w paczce – `confirmations`), `ImportDone.statement` / `confirmed`,
  `features/import/BankTelemetry.tsx` („Telemetria z banku” – `bank-telemetry`, `-match`, `-diff`, `-before`, `-missing`,
  `-extra`, `-amounts`, `-gaps`, `-confirm`), `operations/state.ts` `openOperation`.
- Oficer (F8, T170): `shared/import/officer.ts` (`officerData`, `officerHint`, `officerTarget` z WeakMap,
  `OFFICER_SOURCE_LABEL`), `store/officer.ts` (`officerNow`), `QuickData.lastByBrand` / `rules` / `aliases`, szybki wpis
  `quick-officer`, edytor `operation-officer`.
- Audyt reguł (F22, T171): tryb reguły `amount` + `maxAmount` (`importRuleSchema`), `shared/import/audit.ts` (`withRule`,
  `startAudit` / `feedAudit` / `finishAudit`, `auditRules`, `MixedBrand.limit`), `features/import/RulesAudit.tsx`
  (`useRuleAudit` porcjami, `RulesPanel` – `import-rules-search`, `import-rules-show-*`, `import-rule` z `data-match`,
  `import-rule-hits`, `-differ`, `-differ-row`, `-apply`, `-edit`, `-editor`, `-direction`, `-limit`, `-save`;
  `MixedBrandsPanel` – `import-mixed`, `import-mixed-limit`), Ustawienia → Import z banku (`ImportTab`).
- Testy: `tests/unit/import-batch.test.ts`, `import-statement.test.ts`, `officer.test.ts`, `rules-audit.test.ts`,
  grupa H w `import.test.ts`, `tests/fs/history.test.ts` (powód `undo`), E2E `tests/e2e/import-tools.spec.ts`.

## Kod (1.5.2 – liczby się zgadzają, grupa I, D85 / D86)
- Historia średnich (B23, B25, T173): `shared/calc/history.ts` – `historyStart` (najstarsza operacja z banku; bez niej
  najwcześniejsze z sald otwarcia i wydatków / wpływów ręcznych), `firstFullOf`, `coveredMonths` (pełne miesiące do
  bieżącego − 1, bez miesięcy bez operacji), `monthsBefore`; silnik `FleetState.historyMonths` (średnie kosztów,
  `incomeStats(byMonth, covered)`), plan `fullMonthsBefore(…, covered)`, `proposeSalary` / `proposeEnvelopes` /
  `recurringPayments(…, covered)` – kreator, Plan miesiąca i Ładownia podają `fleet.historyMonths`.
- Silnik (`calc/fleet.ts`): pożyczka bez rekordu – tylko osłony, `borrowedNoRecord` / `loanOpen` po kontrahencie (B57,
  T174); `isCargoPayment(t, containerIds)` (`calc/operations.ts`) – płatność usuniętego kontenera to wydatek (B58, T175);
  `fitSplit(amount, {hull, goals, taxHold})` – zapisany podział dokowania dopasowany do kwoty (B59, T176); saldo otwarcia
  przed pensją (klucz `0 0a`, B60); `shields.free` tylko przy pełnym kadłubie, `shields.over` (N21, T181);
  `energyAfter(daily, date, amount)` (podgląd szybkiego wpisu, N3).
- Plan (`calc/plan.ts`): `lootExtraOf(log, month)`, `salarySplit(…, lootExtra)` (`dailyBase` z łupami – N11);
  `debriefing(…, {alarms, containers})` → `energy` {salary, sinking, loot, budget, used, exhausted, result}, `daily`
  {limit, extra, spent, gap}, `plus` z wyniku energii po końcu miesiąca (N6, T178); `unlinkedPayments(…, containerIds)`.
  `calc/start.ts` `startSplit(total, targets, goals)` (N7). `calc/briefing.ts` `confirmationsOf(accounts, balances)` –
  przypomnienie per konto, bez gotówki (B28, T185); `notify.ts` wymienia konta. `calc/game.ts` – `isConfirmedNight`
  (godzina w ciszy nocnej + wpis w dzienniku – N10, T187), `envelopesSpent` (jedna pętla), misje i hattrick z
  kontenerami i logiem. `calc/income.ts` – miesiąc z tradingiem ≥ 0 (N4). `merge.ts` `AMOUNT_FIELDS`, `isAmountPath`,
  `isAmountKey` (B7, T182).
- Renderer: Plan miesiąca – `split-loot-extra`, `month-envelope-archived`, `debrief-energy`, `debrief-daily`,
  `month-plus` / `month-minus`; `month/actions.ts` `dropEnvelope` / `restoreEnvelope` (N8 – archiwizacja w
  `settings/CategoriesTab.tsx` z „Cofnij”, T179); `cargo/actions.ts` `deleteContainer` (odłącza płatności, „Cofnij” łączy),
  `paymentsToLink(…, containerIds)`; dokowanie – `docking-split-fitted`, osłony od kwoty operacji (`dockingOf`); Mostek
  `state-shields-over`; edytor operacji – `operation-loan-hint`, `operation-loan-likely`, `operation-future`,
  `operation-night-confirm`, `operation-night-clear`; szybki wpis – `quick-preview-outside`, `quick-future`
  (`QuickData.daily`); kreator – 7 kroków (krok „ICTTJ i cele”: `wizard-ictj`, `wizard-ictj-suggested`,
  `wizard-ictj-pick`, `wizard-goal*`; podział `wizard-split-goal`, `wizard-split-goal-input`, `wizard-total`,
  `wizard-split-over`), `finishWizard({salary, hull, goals, envelopes})`; pola – `DateField notAfter`
  (`parseDateInput(text, rok, notAfter, near)` – dzień najbliższy dacie pola, najwyżej tydzień po dziś – B12, T184),
  `NumberField` całkowite (B26); historia, zmiany z drugiego komputera i Synchronizacja – kwoty przez `plnText`.
- Folder danych (T189): plik usuwanego wpisu z wersją w historii usuwany od razu (`DataStoreOptions.remove`), do Kosza
  tylko bez wersji w historii – „Cofnij import” setek operacji na Windows w sekundach.
- Testy: `tests/unit/numbers-agree.test.ts`, poszerzone `income`, `plan`, `game`; E2E `tests/e2e/numbers.spec.ts` (cisza
  nocna, archiwizacja kategorii, usunięty kontener, dokowanie innej kwoty), `month.spec.ts` (kreator z celami).

## Kod (1.5.3 – system, folder i dwa komputery, grupa J, D86)
- System (B29, B52–B54, T190–T193): `shared/machine.ts` `ALTGR_CHARS` / `altGrConflict` (Ctrl+Alt+litera polskiego znaku,
  także z Shift – nie do ustawienia; `machinePrefsFrom` zamienia na domyślny, `config.ts` `replacedShortcut`, `quick.ts`
  `replaced`, okno `noticeReplacedShortcut`, `ShortcutField` `shortcutProblem`); `main/tray.ts` `loginItemName` (stała
  nazwa wpisu Run, stare wpisy tego exe usuwane), `second-instance` z `--hidden` bez okna; `shared/bounds.ts`
  `windowBounds`; ekran wyboru folderu po przyczynie (`OpenFolderResult.problem` / `remembered` / `subfolder`,
  `openDataDir(dir, create, force)`, `inspect` 'unavailable', `rememberedDir`; przyciski `retry-folder`, `create-here`,
  `create-subfolder`, `start-over` / `start-over-confirm`), w Ustawieniach akcje w komunikacie („Utwórz tu nowe dane”,
  „Utwórz podfolder FinancialIntel”).
- Folder (B31, N2, N17, N18, T194–T197): `store/data.ts` – `canWrite` / `READ_ONLY_MESSAGE` / `SWITCHING_MESSAGE`, zapisy
  zwracają boolean, `useFolderLocked` (tylko do odczytu albo `switching`), `switchFolder` (zapis zmian → `switching` →
  otwarcie → `applySnapshot`), Ustawienia → Folder: postęp z „Przerwij” (`OpenProgressPanel`), `recent-folder-open`;
  main – `snapshot.generation` / `folderShown` / `writableStore` / `sendFrom` / `unshown`; `DataStore.mergeConflict(id,
  merged, asOf)` (obie strony do historii 'merge', odmowa przy innych czasach plików), Synchronizacja `ConflictMerge`
  (`conflict-merge-open`, `conflict-merge`, `-field`, `-canonical` / `-copy`, `-save`; każde różniące się pole wyborem,
  podpowiedź z `mergeBase` + `valueAt`); `HistoryButton` (`variant` button / icon / link) przy planie, celu, pożyczce,
  saldzie otwarcia, dokowaniu, w oknie zmian; `Modal` przez portal ze stosem (Esc – wierzchnie okno); edytor operacji –
  historia poza wyłączanym fieldsetem; `AmountField disabled`.
- Dwa komputery (N20, F21, B33, B27, T198–T200): `main/datastore/presence.ts` (`IN_USE_MS`, `PRESENCE_WINDOW_MS` 11 min,
  `MachinePresence` z `activeAt` / `inUse`), main `noteActivity` / `inUseNow` / `tellInUse` (`fi:inUse`), heartbeat co
  minutę w użyciu, co 5 min w zasobniku; okno `store/presence.ts` (`usePresence`, `initPresence`,
  `installActivityReport` w każdym oknie – `main.tsx`); zapisy w tle (`useGameAdvance`, `useIctjGoalSync`,
  `useHouseholdSinceSeed`) tylko w użyciu; `store/notifier.ts` – powiadomienia komputera w użyciu; baner `banner-other`
  tylko dla komputerów w użyciu, Synchronizacja `sync-machine` (`data-in-use`), `sync-last-remote` (`lastRemote` w
  magazynie okna), Ustawienia `settings-other-machines`; `useFreezeSettled` (`openedAt`, `externalAt`, `AppInfo.freeze` –
  zmienne testowe `FI_FREEZE_AFTER_OPEN_MS`, `FI_FREEZE_QUIET_MS`, w `launch()` 0); `store/detach.ts` `hosted` /
  `useHostedDetach`, Mostek `BridgeDetachHost` w `App`.
- Testy: `tests/unit/system.test.ts`, `merge.test.ts` (`valueAt`), `tests/fs/datastore-robust.test.ts` (scalanie), E2E
  `tests/e2e/system.spec.ts`, `folder.spec.ts`, `presence.spec.ts` (`launch({hidden})` – start w zasobniku),
  `bridge.spec.ts` (okno odłączone poza Mostkiem), `numbers.spec.ts` (historia dokowania, Esc).

## Kod (1.5.4 – szybkość, reszta, grupa K, D86)
- Silnik (W27, T202): `calc/fleet.ts` – `sortedOps` (operacje sortowane raz na listę, WeakMap, komparator `opOrder`),
  zdarzenia kalendarza sortowane osobno i wplatane dwoma wskaźnikami (`evFirst`), salda kont i ruchy sprzed startu jednym
  przejściem; `calc/loans.ts` `flowsByLoan` (przepływy wszystkich pożyczek naraz); `calc/operations.ts` `partsOf` z pamięci
  (WeakMap po rekordzie), `ownLines`; `calc/history.ts` `coveredMonths` bez powtórzeń.
- Import (W18, W20, T203): `import/reconcile.ts` `budgetedOf` (indeksy konta raz na listę operacji), `manualNear` (wpisy
  ręczne ±3 dni); `import/classify.ts` `ruleIndexOf(rules, kierunek)` (reguły po trybie, wzorzec słowa przy pierwszym
  użyciu), pamięć `ruleTargetOf` / `hintFor` / `payeesOf`; `import/brands.ts` pamięć `brandOf` (do 50 tys.), `keywordIn`,
  `keywordMatcher`; `features/import/state.ts` – plan od nowa tylko przy zmianie treści (`BY_CONTENT` + `deepEqual`),
  listy z `listOf`. Ekran (W17, T204): `ImportPage.tsx` – `memo` tematu (`BIG_THEME` 30 – zwinięty na start), marki i
  wiersza (`ImportRowLine`), selektory po kluczu, listy po 100 (`ShowMore` w `components/ui.tsx` – `import-groups-more`,
  `import-rows-more`, `import-merge-more`, `import-deleted-more`), `skippedIn`; `operations/pickers.tsx` `categoryOptions`
  z pamięci.
- Lista usuniętych (W19, T205): `DataStore.historyDeleted` – id pod blokadą, historia poza nią; `RecordHistory.deleted` –
  16 odczytów naraz (`mapLimit`), `deletedRead` (ostatnia wersja po nazwie pliku).
- Zmiany z drugiego komputera (W25, T206): `store/data.ts` `resolveRemoteMany` / `RemoteDecision` (`resolveRemote` i
  `acceptNewer` przez nią, zapis paczką `saveBatch`), `applyChange` – czekające po kluczu, `runSaveMany` zapomina wpis,
  którego nie ma w pamięci; `RemoteChangesDialog.tsx` – 50 kart (`remote-more`, `remote-hidden`), `ItemCard` w `memo`.
- Testy: `fleet.test.ts` / `loans.test.ts` (W27), `import.test.ts` (grupa K), `import-replan.test.ts`, `tests/fs/history.test.ts`
  (W19), `data-store.test.ts` (W25), E2E `tests/e2e/speed.spec.ts` (duży import, wiele zmian z drugiego komputera).

## Kod (1.6.0 – funkcje, grupa L, D86)
- Opłaty stałe (F1, T208): `shared/calc/cargoStatus.ts` (`cargoStatuses` – stan zapłacone / czeka / po terminie, `day` /
  `dayFrom` z historii płatności, `due`, `from` – okno płatności, `importPending`; `dueIn`, `EARLY_DAYS`), `briefing.ts`
  pozycja `cargo`, `notify.ts` tag `cargo` (`machine.ts` `notify.cargo`), `radar.ts` rodzaj `fixed` i opłata okresowa tego
  miesiąca w dniu z historii; renderer `features/cargo/status.ts` (`useCargoStatuses`, `cargoStatusesNow`), Ładownia
  `cargo-state`, `container-month`, `container-paid` / `container-paid-from` (`payContainer`).
- Szybki wpis seriami (F7, T209): `shared/calc/quick.ts` (`quickTemplates`, `QUICK_TEMPLATES`), `QuickData.last` /
  `templates`, `QuickTemplate`, `QuickResult.data`; `lib/format.ts` `parseAmountInput` (działania), `parseDateInput`
  (`DAY_WORDS`, „-N”); `QuickApp.tsx` – Ctrl+Enter (`quick-series`), `quick-repeat`, `quick-template`, `quick-yesterday`,
  szkic po Esc (`KEEP_DRAFT_MS`, `quick-restored`, `quick-clear`).
- Wieczorny raport (F13, T210): `settings.game.noSpend`, `notify.ts` `eveningState` / `eveningText` / `EVENING_FROM`,
  `features/evening/` (`state.ts` – `confirmNoSpend`, `snoozeEvening`, `eveningSnooze`, `eveningNow`; `EveningReport.tsx` w
  Operacjach – `evening-report`, `evening-quick`, `evening-nospend`, `evening-snooze`), zasobnik `TrayDeps.evening`,
  `notifier.ts` `openTag('evening:…')`, znacznik gry `nospend`; `shared/format.ts` `plural` (renderer go re-eksportuje).
- Meldunki (F6, T211): `shared/calc/inbox.ts` (`inboxItems`, `INBOX_KINDS`, `INBOX_TITLE`, `uncategorizedOf`,
  `INBOX_BALANCE_DAYS`), `operationsView.ts` `isUncategorized`, `briefing.ts` `deliveryItem` (eksport); renderer
  `features/inbox/` (`state.ts` – `useInbox(duplikaty, money)`, `useInboxCount`, `openInboxItem`; `InboxPage.tsx` –
  `page-inbox`, `inbox-count`, `inbox-item` z `data-kind`, `inbox-open`), menu `nav-inbox` z `data-badge`, Ctrl+Shift+M,
  paleta; `DuplicatesPanel.tsx` `useDuplicatesKnown` / `useKnownDuplicateCount`.
- Odzyskanie z kopii (F3, T212): `main/datastore/restore.ts` (adapted from ICTTJ transfer.ts – `extractZip`,
  `readBackupZip`, `unpackBackup`), `DataStore.compareBackup` / `restoreVersions` / `putVersion` / `putSettings`
  (`historyRestore` przez nie), IPC `backupPreview`, `backupRecover`, `putVersions`, `backupToFolder`
  (`BackupPreview`, `BackupDiffItem` w `shared/api.ts`); renderer `features/settings/RecoverDialog.tsx` (`recover-dialog`,
  `recover-summary`, `recover-added`, `recover-item` z `data-change`, `recover-pick`, `recover-diff`, `recover-changes`,
  `recover-all`, `recover-settings`, `recover-selected`, `recover-folder`), `recover.ts` (`recoverFromBackup` z „Cofnij”),
  przycisk `backup-recover` przy kopii.
- Testy: `tests/unit/cargo-status.test.ts`, `inbox.test.ts`, poszerzone `notify`, `format`, `game`, `operations-view`;
  `tests/fs/restore.test.ts`; E2E `tests/e2e/fees.spec.ts`, `series.spec.ts`, `inbox.spec.ts`, `recover.spec.ts`.

## Kod (1.6.1 – liczby, plan, raporty, Mostek, grupa M, D87)
- Plan i debriefing (T215, T222): `calc/plan.ts` – `costsByMonth` (WeakMap, wynik tylko do odczytu), `transactionsOfMonth`
  (indeks po miesiącach), `logIndex` / `logOfMonth` (dziennik silnika po miesiącach, końce miesięcy, start);
  `Debriefing.ended`, `outside` (kategorie bez koperty), koperty tylko z planu (0 zł też), pula dzienna jak energia,
  `plus` null przed końcem miesiąca, `loot` tylko gdy silnik przeszedł koniec miesiąca; `export/budget.ts`
  `MonthRow.inProgress` („w toku”), nagłówek „Przychody (zł)”.
- Silnik i reguły (T216, T219, T220): `calc/fleet.ts` `envelopeOverrun` (alarm, gra, powiadomienia – próg
  `settings.game.seriousEnvelopePct`, `SERIOUS_ENVELOPE_PCT`), `startMonthSpentOf` (silnik i kreator), `minShields` =
  min(minimum, cel); `notify.ts` – koperta codzienna łagodnie, limit 0 powiadamia; `briefing.ts` – Daily Bias po kopertach
  planowych, klucz alarmu z `txId` dla korekty i firewalla; `radar.ts` – „po terminie N dni”, „zaległa rata” od 3 dni;
  `intel.ts` `nextWeekEnvelopes` – ostatni dzień miesiąca pusty; `goals.ts` `NOT_PACE`; `start.ts` `openingFromNow` – tylko
  operacje z dziś; `format.ts` `rangeText` / `rangeGapText` (T218); `operationsView.ts` `newestOperations`.
- Renderer: `store/fleet.ts` – klucz silnika z `settings.game.seriousEnvelopePct` (nie całe `game`); `store/game.ts` – gra
  startuje po kreatorze; `app/Banners.tsx` (`fromOpening` – saldo otwarcia do dziś); `notifier.ts` → `seriousPct`; Mostek – `openAlarm` (klucz `alarm:<rodzaj>:<ref>[:<txId>]:<miesiąc>`), `usePolishVoice` /
  `briefing-no-voice`, `recent` z `newestOperations`; Plan miesiąca – `shownBrief`, `OutsideRow` (`month-outside`),
  `Gap` (`debrief-envelope`); Raporty – `reports-briefing-bias`, „Bez koperty”, „Trafność”, przegląd roczny „Pieniądze na
  kontach”; Wywiad „Na kontach”; Ładownia `installmentText`, `nextPaymentOf`; Mapa gwiezdna `starmap-total` + część
  zarchiwizowana, `goalInflow` w memo; Radar / szybki wpis – Ctrl+$ od razu; Ustawienia i kreator – minimum osłon ≤ cel
  (`orders-min-shields`); Radar – pożyczka z „Do spłaty razem” < kwoty odrzucona.
- Testy: `tests/unit/plan-reports.test.ts`, `export.test.ts` (miesiąc w toku).

## Kod (1.6.2 – gra, ICTTJ, domownicy, cele, kreator, grupa N, D87)
- ICTTJ i dokowanie (T224, T225): `calc/dock.ts` – `asPayout` (wpływ wpisany na Portfelu XTB → wypłata), `Delivery.walletTyped`,
  pominięte wpisy parowane po pozostałych (trzymają swoją operację z banku), `preStartTaxOf` (pula Podatek sprzed startu →
  `FleetInput.preStartTax`, mapa liczona w `store/fleet.ts` `preStartTaxFor` – w kluczu silnika treść mapy); `income.ts`
  `taxOfDockings` – część `split.taxHold`; `dock/actions.ts` – `dockDelivery` zmienia rodzaj bieżącego rekordu, `dockingOf`
  zapisuje `entryDate`; okno i odprawa – teksty wg kierunku, „wraca z rezerwy na PIT-38”, firewall wyłączony
  (`DockingDialog`); `main/ictj/reader.ts` – `ListingError` (tylko ENOENT = pusto), `oneEntryPerId` (ostrzeżenie o dwóch
  plikach), `source.ts` – `LAST_READ_FAILED` (dobra migawka zostaje), odczyt folderu niewybranego oddaje stan wybranego;
  `store/ictj.ts` – odpowiedź tylko ostatniego `setIctjDir`.
- Cele (T226): `calc/goals.ts` `goalPace` {pool, rest, total}, `goalEtas(…, pace)` (pula Cele najpierw do celów ICTTJ),
  `goalLate`; silnik – cel ICTTJ bez kwoty (`allIn` = jego miesiąc) bierze resztę puli Cele w miesiącu `docking.entryDate`
  (schemat addytywny); Mapa gwiezdna – `starmap-dol-pool`, `starmap-no-target`, `data-late`, kwota 0 odrzucona.
- Gra (T227): `container.amountAt` (`cargo/actions.ts` `MASS_FIELDS`), ocena ładunku z masą nieznaną (`cargo` null),
  `rankOf` → `newer` (`GameView.rankNewer`, `rankStep` bez kroku), misja spoza `MISSIONS` nieoceniana, `dailyOver` (dni
  niezamrożone z silnika, pamięć `overMemo` po danych silnika), `MissionStatus.pending`, `CLASS_PEAK_DAYS` / `peak`,
  `GameView.serious.from`; Dowództwo – `OrdersFields` (`settings/MachineTabs.tsx`, `command-orders-fields`), opis rozkazu
  dziennego; `store/game.ts` `celebrationsOf` – klasa tylko z `peak`.
- Domownicy, salda, kreator, raporty (T228, T229): `memberOpeningSchema.since`, `household.ts` (pozycja salda na start z
  datą `since`), `rebaseOpenings` → `since`, `household/actions.ts` – jednorazowe uzupełnienie daty; `MemberIncome` z
  rejestru przed wpłatą; `household-since-before-start`; `balances/actions.ts` – id korekty i potwierdzenia z
  `derivedId`; `balances.ts` `doubleCorrections`, `inbox.ts` rodzaj `corrections`, `inbox/state.ts` `dismissCorrection`
  (`inbox-dismiss`); kreator – `envelopes` = zmiany ręczne; Raporty – `WatchChoice` / `watchMondayOf`
  (`reports-watch-current`).
- Testy: `tests/unit/ictj-game-goals.test.ts`, poszerzone `game`, `household`, `inbox`, `share`, `tests/fs/ictj.test.ts`
  (B71–B73), E2E `inbox.spec.ts` (podwójna korekta), `household.spec.ts`.

## Kod (1.6.3 – import, grupa O, D87)
- Opis i rozpoznanie (T231, T232): `mbank.ts` – `OPERATION_START` z końcem słowa Unicode, `sameName` / `isCompany` (nazwa w
  drugiej części opisu przelewu); `aliases.ts` / `classify.ts` – `Object.hasOwn`; `classify.ts` – `isXtb` po kontrahencie
  (`PROCESSOR_ONLY`), kolejność przelew własny → domownik → XTB, kategoria reguły przez `usable` (zarchiwizowana → źródło
  'none'), `ClassifyContext.locked` (operacje tylko do odczytu), `upsertRules` / `LearnedRule` (nauka jedną kopią listy).
- Łączenie i duplikaty (T233, T234): `reconcile.ts` – `counterpartySimilarity` ('key' / 'words' / 'word' / 'empty',
  `brandOf`, `telling`), `LooseMatch.strong`, `looseSure`, `settleScore`, `DeletedPending` {…, `deletedAt`} i pary od
  najbliższej (wiersz w budżecie po usunięciu zabiera swoją), `importGroups(plan, restored)`, `ImportChoices.implicit`
  (pytanie „zaliczka czy przychód?” po „+ domownik”), liczniki `settled`; `share.ts` `withBankAmount` / `scaledSplits`;
  `duplicates.ts` – nazwa banku z opisu, `DuplicateGroup.ask`, `mergeDuplicate` przez `withBankAmount`; `merge.ts` `byIds`;
  `text.ts` `IMPORT_MAX_BYTES`; `learn.ts` – reguła wiersza raz, `keywordMatcher`; `similar.ts` – `ruleBrand`, `exactRules`.
- Ekran (T235–T237): `features/import/state.ts` – `dropImportFile`, blokada w trakcie zapisu (`busy`, `fieldset disabled`),
  `deletedBankRows` (bez zniknięć z paczek importu), `lockedOf`, `decideNewMember` / `implicit` (przenoszone przez
  `replanImport`), `chooseThemeOverGroups`, `inflowVotes`, sesja zamykana przy zmianie folderu; `ImportPage.tsx` – plakietki
  podpowiedzi, `import-row-own` / `import-row-reset`, `import-theme-mixed`, `keywordKindOf`, `import-bulk-keyword-caught`,
  `DuplicatesNote` (`import-duplicates-note`); `DuplicatesPanel.tsx` – nazwy rodzajów, daty, `undismiss`, `covers`;
  `rules.ts` – `ruleDecisionText`, `directionText`, `clearNotDuplicates` (`duplicates-undismiss` w Ustawieniach);
  `RulesAudit.tsx` – lista reguł po 100 (`import-rules-more`); `RemoteChangesDialog.tsx` – `NewerBadge` z pamięcią na wersję
  i zapis.
- Testy: `tests/unit/import-fixes.test.ts` (mutacje: każda poprawka i znalezisko przeglądu), poszerzone `share`, E2E
  `import.spec.ts` (odpowiedź „zaliczka czy przychód?” po „+ domownik”).

## Kod (1.6.4 – operacje, edytor, szybki wpis, grupa P, D87)
- „Bez kategorii” i filtr (T238): `operationsView.ts` – `isUncategorized` po częściach (`partsOf`, część 0 zł paragonu
  pomijana), `uncategorizedAmount` (meldunki), `MARK_GROUP` (oznaczenia w grupie „lub”, między grupami „i”), filtr
  kategorii po częściach, znak `refundable` z części; `OperationsPage.tsx` – kategorie zarchiwizowane / nieznane w filtrze
  (`CheckMenu note`), `operations-stored-filter` („mój filtr”); `calc/operations.ts` `asksImpulse` – próg 0 nie pyta.
- Lista (T239, T240): `features/operations/state.ts` – `shown` (widok z innego ekranu: `showFilter` tylko gdy chowa część
  zapisanego filtra, `setFilter` / `resetFilter` w widoku bez zapisu, `showStoredFilter`), `STORED_KEYS`,
  `followCurrentMonth` (co minutę z `OperationsPage`), `newOperation` (miesiąc operacji, filtry zdjęte w widoku), „Cofnij”
  zbiorczych zmian – `financers` (bez kwot), `undoRules` (treścią, `deepEqual`), `undoneNote`; Ctrl+N w `App.tsx` (każdy
  ekran, nie nad paletą ani oknem); wywołania `showFilter`: Mostek, `notifier.ts`, meldunki, `DuplicatesPanel`.
- Edytor (T241): `OperationEditor.tsx` – `TextArea maxLength` (dziennik 2000, notatka 5000), „Podziel paragon” przenosi
  kategorię i finansowanie na pierwszą część, `CargoSelect` przy podziale (`operation-split-cargo`), `SplitEditor` –
  `split-rest`, `split-rest-last`, `split-over`; `pickers.tsx` – zarchiwizowana kategoria główna bieżącej podkategorii;
  `lib/format.ts` `parseAmountInput` – najwyżej 2 miejsca po przecinku.
- Saldo dziś (T242): `features/balances/ConfirmToday.tsx` (`useConfirmToday(konto, nazwa, onDone)`, `ConfirmTodayAsk` –
  `confirm-ask`, `-yes`, `-later`), `confirmBalance(…, planned)`; Ustawienia → Konta i `ImportPage` `BalanceCheckRow`.
- Szybki wpis (T243): `main/quick.ts` `fi:quickUpdate` (tylko przy otwartym oknie), `fi:quickVisible`; `api.ts` / preload
  `quickUpdate` / `onQuickUpdate` / `onQuickVisible`; `store/quickHost.ts` – wysyłka co ≤ 500 ms przy widocznym oknie,
  odmowa konta / kategorii / domownika spoza folderu, `QuickDraft.advanceChosen`; `QuickApp.tsx` – `onQuickUpdate`
  (wybór spoza list czyszczony z komunikatem), wpływ bez części paragonu.
- Formularze i drobne (T244): `store/drafts.ts` (`useDraft(klucz, pusty)` – szkic w pamięci okna, pusty formularz liczony
  przy każdym rysowaniu bez wpisu; `clearDraft`; zmiana folderu czyści) – Radar `radar:newLoan`, Ładownia
  `cargo:container`, Mapa gwiezdna `starmap:newGoal`, Plan miesiąca `month:loot:<mies.>`; `ShortcutsHelp.tsx` – skrót z
  ustawień komputera i `quickShortcutState`; `notify.ts` `eveningAt` (wieczór w ciszy nocnej – minuta przed nią,
  `EveningReport`, `notify-evening-quiet` w Ustawieniach).
- Testy: `tests/unit/operations-fixes.test.ts`, `operations-state.test.ts` (sklepy okna z atrapą `window.fi` – w
  `tsconfig.web.json`), E2E `tests/e2e/operations-fixes.spec.ts` (Ctrl+N z Mostka, szkic pożyczki, szybki wpis: podział →
  wpływ, domownik zarchiwizowany i spoza folderu), `operations.spec.ts` (pytanie przy różnicy salda, saldo zostaje w polu),
  `series.spec.ts` (cisza nocna bez północy).

## Kod (1.6.5 – folder, system, dwa komputery, grupa Q, D87)
- Wpisy nowszej wersji (T246): `main/datastore/store.ts` `NewerFileError` (podklasa `ReadOnlyError`, `NEWER_FILE_MESSAGE`;
  wpis / plik nowszej wersji przy zapisie i usunięciu), `SaveResult.newer`; okno `lib/api.ts` `isNewerFileError`,
  `store/data.ts` – `newer` (bez pętli prób, komunikat raz – `refusedForGood`), `NEWER_RECORD_MESSAGE`, `updateRecord` z
  komunikatem, `deleteRecord` odmawia, `deleteOrSay` (usunięcia bez czekania), `useEntryNewer`, `tooNewMonths` /
  `monthTooNew` (gra – `lockedKey` w `store/game.ts`, `editPlan`); `components/NewerNote.tsx` (`entry-newer`) w edytorach
  kontenera, celu, pożyczki, planu miesiąca i operacji; zmiany zbiorcze – `newerNote`.
- Przyczyna niezapisanych (T247): `shared/api.ts` `FlushResult`, `shared/unsaved.ts` (`unsavedQuestion`, `SAVED` – pytanie
  main przy zamykaniu), `store/data.ts` `unsavedReport`, `flushForClose` (`onFlushRequest`), `saveFirst(co)` (kopia,
  eksport, import, cofnięcie, odzyskanie, aktualizacja, zmiana folderu – `switchFolder` → `{unsaved}`, konflikty),
  `unsavedNote` (po imporcie, cofnięciu importu, kreatorze), `saveNow` (Ctrl+S w `App.tsx`, paleta).
- fi.json (T248): `writeSettings` → `{fi, change}`, `historyRestore('fi')` / `putSettings` odsuwają uszkodzony;
  `SettingsFileError` (`unreadable` / `broken` / `too-new`), `DataStore.repairSettings`, IPC `repairSettings`, wyniki
  `settings-unreadable` / `settings-broken` (`FolderProblem`); `FolderSetup.tsx` – ponowienie co 30 s, `repair-settings`.
- Folder i kopie (T249): `backupFolderName` (podfolder własnego folderu kopii), `backup.ts` `BACKUP_NAMES` (rotacja i lista
  tylko nazw FI), `removeRecord` – odmowa przy drugiej kopii id i bez wersji w historii (`RecordHistory` z `failed` →
  log), `zipData(…, {history})` (eksport), `inspect` – `unavailable` bez listowania; `watch.ts` – ponowienia 5 s → 5 min,
  `onError(e, repeated)` raz na godzinę (nowa awaria po minucie spokoju – od razu), `nextRestartMs`; main
  `backupFailure` / `backupFailingSince` / `noticeStaleBackups` (powiadomienie `backups`), `listBackups` → `failure`
  (`backup-failure` w Ustawieniach), `insideIctj` po `journal.json`, `setBackupDir` bez ICTTJ; `log.ts` – rotacja co 200 linii.
- config.json (T250): `config.ts` – odczyt z `withRetry`, `loadFailed` (zapisy wstrzymane), `held` + `leafChanges` /
  `withValueAt` (zmiany z tej chwili pole po polu po odczycie), `setAside`; main `retryConfig` (co 15 s, `fi:configReady` →
  `onConfigReady` w oknie), `TrayPrefs.autostartAsked`.
- System i okna (T251): `updater.ts` `staged` (pobrana wcześniej zostaje przy nieudanym pobraniu nowszej); `quick.ts` /
  `detach.ts` – `render-process-gone`; main – heartbeat po przełączeniu folderu, `pendingMaximize` w zapisie okna,
  `trayStatus`, `readyNoticed` (powiadomienie `update`), migawka z pamięci po przeładowaniu (W37); okno `store/tray.ts`
  (`useTray`, `installWhen`, `asksAutostart` – baner `banner-autostart-yes` / `-no`), kreator bez skrótu i zasobnika.
- Synchronizacja (T252): `shared/merge.ts` `fieldLabel(ścieżka, nazwy)` + etykiety; `HistoryDialog` `dictNames`;
  `RemoteChangesDialog` „z drugiego komputera”; `SyncPage.tsx` – karta konfliktu przez `diffRecords` + `ChangeList`
  (`conflict-changes`, `conflict-same`), `ProblemAction` (`problem-reread`, `problem-too-new`, `problem-trash` z
  potwierdzeniem), prawdziwy folder kopii; `resolveOne` – zachowana kopia ze znacznikiem tego komputera.
- Testy: `tests/fs/folder-q.test.ts`, poszerzone `backup`, `config`, `datastore`, `updater`, `watch`,
  `tests/unit/data-store.test.ts` (przyczyny, `saveFirst`, `saveNow`, wpisy nowszej wersji, zasobnik), `merge.test.ts`,
  `system.test.ts`; E2E `tests/e2e/folder-q.spec.ts` (kontener nowszej wersji, Synchronizacja, naprawa fi.json, nieudana kopia).

## Kod (1.6.6 – teksty, wygląd, wygoda, grupa R, D87)
- Wygląd i prywatność komputera (F30, F40, T259, T260): `shared/machine.ts` – `prefs.zoom` (`ZOOM_MIN` / `ZOOM_MAX`,
  `clampZoom`, `zoomStep`, `zoomFromKey` / `KeyInput`), `highContrast`, `hideIdleMin` (`HIDE_IDLE_CHOICES`, 0 = nigdy),
  `hideOnStart`; main `index.ts` – `changePrefs` (jedna droga zmian: IPC `setMachinePrefs`, bezczynność), `applyZoom` /
  `prepareWindow` (`setZoomFactor` wszystkich okien, po każdym wczytaniu), `watchIdleAmounts` (`powerMonitor`, blokada
  ekranu), `revealAmounts` (IPC: minuty albo do końca sesji – `revealTimer` / `revealedForSession`, `clearReveal`),
  `hideOnStart` (start albo późny odczyt config.json); `quick.ts` – `fit` / `rescale` (okno szybkiego wpisu z rozmiarem, w
  granicach ekranu); okno `store/machine.ts` – `installZoomKeys` (Ctrl+Plus / Ctrl+Minus / Ctrl+Shift+0 w każdym oknie,
  faza przechwytywania), `installLook` (`data-contrast`), `revealAmounts`, `pending` (odpowiedź starszej zmiany nie cofa
  nowszej), `main.tsx` – ustawienia komputera raz w każdym oknie; `styles/index.css` – kontrast poza warstwami; Ustawienia →
  „Wygląd i prywatność” (`MachineTabs.tsx` `ViewTab`, `ZoomSlider` – `settings-zoom`, `-zoom-value`, `-zoom-reset`,
  `settings-contrast`, `settings-hide-amounts`, `settings-hide-idle`, `settings-hide-start`), `PageBar` `HiddenAmounts`
  (`amounts-hidden`, `reveal-5`, `reveal-session`), paleta (pokazanie tylko przy ukrytych kwotach), ściągawka skrótów.
- Mostek i Radar (N35, N58, N60, T256–T258): `features/intel/wealth.ts` (`wealthOf` / `useWealth` – krzywa i struktura raz
  na stan danych dla Mostka i Wywiadu), Mostek `BridgeWealth` / `BridgeWealthChart` (`bridge-wealth`, `bridge-wealth-chart`,
  `bridge-wealth-open`; 26 tygodni, liczone tylko przy widocznym panelu), `WealthChart testId`; Bearish w akcencie;
  `radar/actions.ts` `closeLoan` z „Cofnij” (raty zdjęte z czasem `closedAt`, „otwórz” tylko dla nich – `loan-close`,
  `loan-reopen`).
- Teksty (N31, N33, N53, N57, N61, N72, T254): `game.ts` `RANK_GENITIVE`, `MISSION_TITLE.house`, metafory w
  `VIOLATION_LABEL` / `ACHIEVEMENT_INFO`; `briefing.ts` `alarmText` z prawdziwymi nazwami; `ReportsPage.tsx` `CARGO_LABEL`,
  `signed` (FVG ze znakiem), `reports-watch-day`; `plDate` w Ustawieniach → Konta, `balances/actions.ts`, Operacjach, PDF;
  eksport ZIP z `warsawNow`; `countLabel` / `plural` w importie, kreatorze, ładowni, Radarze, Mostku, Dowództwie,
  powiadomieniach; `panels.ts` `PAGE_LABELS` (kreator, meldunki), `PageBar` bez „Układ” na kreatorze.
- Martwy kod (N34, T255): bez `PlaceholderPage`, `PageDef.stage` / `ready`, rodzaju okna 'placeholder', `copyText`,
  `isPortable`, `importRecords`, formaterów z ICTTJ (`fmtNum`, `fmtPln`, `tone` …); `GameChange.events` – świadomie.
- Testy: `tests/unit/texts-look.test.ts`, `machine-store.test.ts`, `loan-close.test.ts`, `wealth-memo.test.ts` (trzy ostatnie
  ze sklepami okna – w `tsconfig.web.json`), E2E `tests/e2e/look.spec.ts` (rozmiar we wszystkich oknach, kontrast,
  ukrywanie kwot, późny config.json, krzywa na Mostku), `radar.spec.ts` („zamknij” z „Cofnij”), `intel.spec.ts` (FVG ze
  znakiem, zł w raporcie wachty).

## Kod (1.7.0 – operacje, funkcje, grupa S, D87)
- Przelew w jednej operacji (F10, T262–T264): operacja `bothSides` / `counterBank` / `counterDate` (addytywne);
  `calc/operations.ts` `isTwoSided`, `accountAmounts`, `amountOn`, `dateOn`, `touchesAccount` (salda, `balanceAt`,
  `balancesAt`, `openingFromNow`, telemetria – każda strona na swoim koncie i w swoim dniu); silnik `fleet.ts` – `inRun` /
  `otherInRun` (strona poza biegiem silnika: druga strona rusza osłony w swoim dniu, zdarzenie w slocie 3), `runTx(t, on)`;
  `calc/kinds.ts` `withKind` (nowy przelew – obie strony), `DEFAULT_SIGN`; `calc/transfers.ts` `transferIssues` (pair /
  double / lone, `TRANSFER_DAYS`, `joinedDay`, `settled`), `joinTransfer`, `withBothSides`; import `reconcile.ts` – `sideOf`
  / `legacySideOf`, `realOf`, `isSideView`, `withOtherSide`, `Budgeted.waiting`, `RowPlan.merge.side`,
  `ImportCounts.sides`, `buildImport(…, {accounts})`; `classify.ts` `isOwnTransferRow`; `inbox.ts` rodzaj `transfers`;
  renderer `operations/transfers.ts` (`transferIssuesOf` – od dnia po potwierdzeniu, `transferEdits`, `joinTransfers` –
  para bez usuniętej drugiej strony cofnięta, `addOtherSide`, `dismissTransfer`), `inbox/TransferPairs.tsx` (`inbox-pairs`,
  `inbox-pair` z `data-unnamed`, `inbox-pair-tick`, `-dismiss`, `inbox-pairs-join`, `-all`, `-none`), edytor
  `TransferSides` (`operation-transfer-both`, `-legacy`, `-join`, `-add`), opcje importu `transfer:<konto>`.
- Zmiana zaznaczonych (F11, T265): `operations/state.ts` `bulkPlan` / `changedBy` / `bulkEffect` (`fleetNow` + silnik ze
  zmianą, `calc/effect.ts` `effectOf` / `noEffect`) / `applyBulk` (jedno „Cofnij”, `setFields`), `BulkChange.tsx`
  (`operations-bulk-change`, `-account`, `-kind`, `-counter`, `-days`, `-preview`, `-dialog`, `-effect`, `-confirm`,
  `-confirmed`); `history/actions.ts` `deleteManyWithUndo` zwraca usunięte id (błąd – komunikat).
- Potwierdzony okres (F12, T266): `balances.ts` `OperationEdit`, `confirmedChanges`, `confirmedPeriodOf`; edytor –
  `guarded`, `fresh`, `operation-confirmed`, okno `operation-guard` (`-cancel`, `-confirm`).
- Lista (F18, T267): `operationsView.ts` – `OperationsFilter` (`amountMin` / `amountMax`, `members`, `brands`, `containers`,
  `goals`, `loans`, `transferAccounts`, `sort`), `LIST_KEYS`, `noNarrowing` / `narrows`, `filterOf`, `viewFilter`,
  `showsView`, `membersIn`, `brandTargetOf` / `brandKeyOf`, `sortOperations`, `OPERATION_SORTS`; `settings.operationViews`
  (`operationViewSchema`); `export/budget.ts` `operationRowsOf(…, view)`; renderer `operations/ListTools.tsx`
  (`MoreFilters` – `operations-more*`, `SortHeader` – `operations-sort-*`, `ViewsBar` / `SaveView` – `operations-view*`,
  `ExportVisible` – `operations-export-csv` / `-xlsx`), `state.ts` `STORED_KEYS`, `applyView`, `saveView`, `deleteView`,
  `showBrand` (`operation-same-brand`), `openOperation` / `newOperation` z `noNarrowing`.
- Paleta (F19, T268): `shared/search.ts` `searchRecords` / `SEARCH_LIMITS`; `store/ui.ts` `focusRecord` / `FocusKind`;
  `components/focus.ts` `useFocusRecord` (`data-focus`, `.focus-mark`); `CommandPalette.tsx` `SETTINGS_ITEMS`, grupy
  `palette-operation` / `-container` / `-goal` / `-loan` / `-member` / `-setting`.
- Dziennik zmian (F33, T269): `shared/changeLog.ts` `changeLog`, `changeLogMachines`, `CHANGELOG_KINDS`;
  `sync/ChangeLog.tsx` (`sync-changelog`, `changelog-period-*`, `-machine`, `-kind`, `-row`, `-changes`, `-diff`,
  `-take-back`, `-open`, `-no-version`).
- Ukrycie kwot w chwili zmiany (T271): `main/index.ts` `changePrefs` kończy pokazanie przed zapisem config.json;
  `ConfigStore(dir, writeDelayMs)`.
- Testy: `tests/unit/transfers.test.ts`, `operations-list.test.ts`, `search.test.ts`, `change-log.test.ts`, poszerzone
  `operations-state`, `inbox`, `duplicates`; E2E `tests/e2e/operations-s.spec.ts`, `look.spec.ts` (wolny zapis).

## Dane (folder wybierany przez użytkownika, domyślnie `OneDrive\FinancialIntel`)
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
backups/  .history/  .presence/          kopie ZIP, poprzednie wersje, obecność komputerów
```
- JSON z wcięciem 2 spacje i końcowym `\n`; identyfikatory ULID; czasy UTC ISO 8601; ścieżki względne z `/`.
- Każdy rekord: `schemaVersion`, `id`, `createdAt`, `updatedAt`, `updatedBy` (nazwa komputera). Nieznane pola
  zachowywane (`z.looseObject`).
- **Kwoty: liczby całkowite w groszach, tylko PLN.** Podział kwot (np. odkładka roczna na 12 miesięcy) w groszach
  z resztą w ostatniej części.
- Data operacji = data warszawska; godzina opcjonalna (import z mBanku nie ma godzin).
- Zapis atomowy, historia `.history/`, konflikty chmury i scalanie trójstronne – jak ICTTJ. Bez szyfrowania.
- Zmiana formatu: podbij `SCHEMA_VERSION`, krok migracji + test.
- Nigdy nie commituj danych użytkownika. Przykładowe pliki (CSV z mBanku, folder ICTTJ) tylko zanonimizowane,
  w `tests/fixtures/`.

## Konwencje
- UI po polsku, terminy ICT po angielsku, komentarze w kodzie po angielsku.
- Wygląd = ICTTJ: tokeny z jego `src/renderer/styles/index.css` (tło `#0b0d10`, panel `#111418`, podniesione
  `#161b21`, linia `#1e232a`, tekst `#c3cbd4` / `#e8edf2`, przygaszony `#7a838e`, akcent `#e8a33d`, plus `#2ebd85`,
  minus `#f6465d`); liczby `.num` (JetBrains Mono, cyfry tabelaryczne); jeden akcent; zieleń / czerwień tylko dla kwot
  na plus / minus; bez gradientów i cieni; panele z nagłówkiem, linie 1 px; animacje 120–160 ms (zdarzenia: dokowanie,
  awans, „miesiąc na plus” – dłużej, ale bez efekciarstwa).
- Nawigacja: menu boczne (decyzja D44, inaczej niż pasek u góry w ICTTJ); reszta komponentów jak ICTTJ.
- Metafora zawsze z prawdziwą nazwą i kwotą obok („Osłony · bufor 8 640 zł”).
- Selektory zustand zwracają prymitywy albo istniejące referencje.
- Nowy wpis jest szkicem do pierwszej edycji; opuszczenie ekranu nigdy nie gubi zmian.

## Komendy
```
npm ci
npm run dev          # tryb deweloperski
npm test             # unit + fs
npm run typecheck
npm run build        # out/
npx playwright test  # E2E (po npm run build); Linux: xvfb-run -a npx playwright test
npm run dist:win     # release/*.exe
build-windows.cmd    # Windows bez wymagań co do Node (wzór ICTTJ)
```

## Etapy (szczegóły i kryteria: `docs/plan.md`)
- [x] E0 Fundament → 0.1.0
- [x] E1 Model danych i silnik budżetu → 0.3.0 (grupa A)
- [x] E2 Import z mBanku → 0.3.0 (grupa A)
- [x] E3 Kreator startu i plan miesiąca → 1.0.0 (grupa B)
- [x] E4 Mostek i szybki wpis → wydanie 1.0.0 (grupa B)
- [x] E5 ICTTJ i dokowanie → 1.1.0 (grupa C)
- [x] E6 Radar i należności → 1.1.0 (grupa C)
- [x] E7 Dowództwo (gra) → 1.2.0 (grupa D)
- [x] E8 Wywiad i raporty → 1.2.0 (grupa D)
- ~~E9 Pierwszy oficer~~ – wypada (D74: bez asystenta AI)
- [x] 1.2.1 Grupowanie importu z mBanku, decyzje zbiorcze, duplikaty (D75–D77)
- [x] 1.2.2 Podobne nazwy i propozycja reguły z liczbą operacji (D78)
- [x] 1.2.3 Poprawka podobnych nazw: dopiski banku w nazwach, wspólne słowa (D79)
- [x] 1.3.0 Rozliczenia z domownikami: saldo każdej osoby w obie strony, depozyt, import, Mostek, Radar, raporty (D80)
- [x] 1.4.0 Domownicy bez bankowości (pośrednik, podział wpłaty), rozliczenia od dnia z saldem na start, panel przychodów (D81)
- [x] 1.4.1 Wczytywanie folderu krok po kroku: postęp, „Przerwij”, log diagnostyczny, większa pula wątków (D82)
- [x] 1.4.2 Pieniądze i dane się zgadzają (grupa E, D84): cele od chwili zmiany, pieniądze archiwizowanego celu, opłaty
  okresowe i życie kontenera, łupy, dwa formaty pliku z banku, folder danych i dwa komputery, szybki wpis, Esc w polach
- [x] 1.4.3 Szybkość przy dużym folderze (grupa F, D84): zapis paczkami i przyrostowe widoki, okno bez przeliczeń przy
  pisaniu, obserwator bez pełnych skanów, kopie ZIP w jednym przejściu, kopia dzienna w zasobniku, 14 + 8 kopii
- [x] 1.5.0 Domownicy, ICTTJ i dokowanie (grupa G, D83 / D84): wspólne finansowanie (równo / procenty / kwoty), prezent,
  konto „Gotówka”, operacje spoza sald na start, zwroty domowników z importu, gra bez naruszeń za cudze zakupy, dokowanie
  odporne na usunięcia, zmiany puli, dwa komputery, zasięg pliku, inne kwoty i święta
- [x] 1.5.1 Import z mBanku (grupa H, D84): „Cofnij import”, saldo z pliku banku (telemetria), oficer zna marki, audyt
  reguł (próg kwoty, „Zastosuj do historii”), pożyczka z Radaru, operacje z pliku złego konta, sesja importu z „Cofnij”
- [x] 1.5.2 Liczby się zgadzają (grupa I, D85 / D86): średnie od historii z banku, miesiąc na plus z energii, łupy w
  dziennym przydziale, koperta zarchiwizowanej kategorii, usunięty kontener, pożyczka bez Radaru, podział dokowania po
  zmianie kwoty, kreator z celami i ICTTJ, daty bez roku, cisza nocna potwierdzona, potwierdzenia sald per konto
- [x] 1.5.3 System, folder i dwa komputery (grupa J, D86): komputer „w użyciu” (baner, zapisy w tle i powiadomienia),
  pierwsze zamrożenie po otwarciu czeka, zmiana folderu z postępem i blokadą zapisów, tylko do odczytu bez fałszywych
  sukcesów, „Scal…” kopii konfliktu, historia każdego wpisu, odłączone panele Mostka, skrót AltGr, autostart, okno na
  ekranie, ekran wyboru folderu po przyczynie
- [x] 1.5.4 Szybkość – reszta (grupa K, D86): ekran importu bez rysowania wszystkiego, plan importu bez przeglądania
  wszystkiego (także kreator), lista usuniętych bez blokady zapisów, zmiany z drugiego komputera naraz, silnik floty bez
  sortowania całej historii
- [x] 1.6.0 Funkcje (grupa L, D86): opłaty stałe w miesiącu (stan, alarm, Radar), szybki wpis seriami, wieczorny raport
  wachty z „Dziś bez wydatków”, meldunki do rozpatrzenia z licznikiem w menu, odzyskanie z kopii (wybrane wpisy albo cały
  folder do nowego)
- [x] 1.6.1 Liczby, plan, raporty, Mostek (grupa M, D87): debriefing z kopertami tylko z planu i „na plus” po końcu
  miesiąca, jedna reguła przekroczenia koperty, „Przychody” i „Pieniądze na kontach”, zasięg bez fałszywej klasy, alarmy
  odprawy do przyczyny, minimum osłon ≤ cel, gra po kreatorze, szybszy plan i raporty
- [x] 1.6.2 Gra, ICTTJ, domownicy, cele, kreator (grupa N, D87): wpływ na Portfelu XTB jako para wypłaty, pula Podatek
  z podziałem i sprzed startu, pominięty wpis z parą, odczyt ICTTJ odporny na błędy, ETA z pulą Cele, cel ICTTJ bez kwoty,
  „po terminie”, masa ładunku w dniu zmiany, misje widzą dni niezamrożone, klasa ponad szczyt 30 dni, rozkazy w
  Dowództwie, saldo na start z datą, podwójna korekta, kreator bez utraty kopert, raport wachty bieżącego tygodnia
- [x] 1.6.3 Import (grupa O, D87): rodzaje operacji z polskimi literami, tytuły z podwójną spacją, XTB po kontrahencie,
  reguły z kategorią zarchiwizowaną, podobne nazwy bez słów ogólnych (ta sama marka – podobna), usunięte nierozliczone nie
  wracają, paragon przeskalowany z kwotą banku, „+ domownik” z pytaniem, ekran czeka na zapis, panel duplikatów jak import,
  szybsze propozycje, podobne nazwy i reguły
- [x] 1.6.4 Operacje, edytor, szybki wpis (grupa P, D87): Ctrl+N z każdego ekranu, nowa operacja zawsze widoczna, widok
  z innego ekranu nie zmienia zapisanego filtra, „bez kategorii” jedno znaczenie, „Cofnij” zbiorczych zmian tylko swoich
  pól, pytanie przy różnicy salda dziś, szybki wpis ze świeżymi listami, szkice formularzy po zmianie ekranu, limity
  notatek, kwoty do grosza, wieczór w ciszy nocnej
- [x] 1.6.5 Folder, system, dwa komputery (grupa Q, D87): prawdziwa przyczyna niezapisanych zmian (decyzja z drugiego
  komputera, wpis nowszej wersji, błąd zapisu), wpisy nowszej wersji tylko do obejrzenia, naprawa fi.json z historii,
  config.json bez nadpisywania domyślnymi, kopie w podfolderze na folder danych, ostrzeżenie o nieudanych kopiach,
  Synchronizacja z nazwami pól, eksport z historią, aktualizacja pobrana wcześniej nie przepada
- [x] 1.6.6 Teksty, wygląd, wygoda (grupa R, D87): rozmiar interfejsu 90–150 % i wyższy kontrast, kwoty ukryte po
  bezczynności, blokadzie ekranu i przy starcie („Pokaż na 5 min” / „do końca sesji”), krzywa majątku na Mostku, „zamknij”
  pożyczkę z „Cofnij”, metafory z prawdziwą nazwą, daty i odmiana jak w całej aplikacji, jedna nazwa ładowni, bez martwego
  kodu
- [x] 1.7.0 Operacje – funkcje (grupa S, D87): przelew między kontami budżetu jedną operacją (import łączy drugą stronę,
  pary sprzed 1.7.0 w Meldunkach), zmiana zaznaczonych z podglądem skutku i „Cofnij”, ostrzeżenie w potwierdzonym
  okresie, filtry zaawansowane, kolejność, zapisane widoki i eksport widocznej listy, paleta szuka wpisów, dziennik zmian
  folderu
- [x] Przegląd po 1.4.1 (`docs/przeglad/`): 129 błędów, 38 problemów wydajności, 104 niespójności, 43 funkcje + F0
