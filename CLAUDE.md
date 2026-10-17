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
  [+ E2], B: E3 + E4, C: E5 + E6, D: E7 + E8, E: E9) – w grupie bez pauzy między etapami, jeden PR i wydanie na grupę;
  tabela w `docs/postep.md`.
- **Scalanie (D71):** PR grupy scalam sam, gdy CI (Linux i Windows) jest zielone, nie ma konfliktu ani otwartych uwag
  i nic nie czeka na decyzję użytkownika. Po scaleniu sprawdź, czy CI na `main` wydało wersję (wydanie publikuje job
  Windows; czerwone E2E na `main` = brak wydania – tak przepadło 0.3.0).
- Po wznowieniu pracy (limit, nowa sesja, streszczenie rozmowy) najpierw przeczytaj `docs/postep.md` i kontynuuj od
  zapisanego miejsca.
- Dokumenty: `docs/specyfikacja.md` (co budujemy), `docs/decyzje.md` (decyzje użytkownika D1… i techniczne T1… – nie
  zmieniaj decyzji użytkownika bez pytania), `docs/plan.md` (etapy i kryteria „gotowe, gdy”), `docs/postep.md`.
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
  `calc/briefing.ts` (odprawa, Daily Bias), `notify.ts` (powiadomienia), `machine.ts` (ustawienia komputera),
  `format.ts` (kwoty), później `calc/game.ts` (oceny dni, stopnie, misje) i `calc/intel.ts` (analizy ICT),
  `import/mbank.ts`, `migrations/`, `paths.ts`, `records.ts`, `api.ts` (kontrakt IPC).
- `src/main` – jedyny właściciel folderu danych (`datastore/` z ICTTJ), `quick.ts` (szybki wpis i globalny skrót),
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
  podtytuł, etap, klawisz Ctrl+1…0, `mvp`), pasek nad stroną `app/PageBar.tsx` (folder, zmiany z drugiego komputera,
  zapis, „Układ”, paleta), ekrany-zaślepki `features/screens/PlaceholderPage.tsx` (panele planowane w specyfikacji),
  pierwsze uruchomienie `features/setup/FolderSetup.tsx` (`api.defaultDataDir`: `%OneDrive%\FinancialIntel`, D62),
  Ustawienia `features/settings/SettingsPage.tsx` (Okręt, Folder i kopie, Zasobnik i start, Aktualizacje).
- Proces główny `main/index.ts`: IPC `fi:*`, preload `window.fi` (`shared/api.ts` `FiApi`), zasobnik domyślnie przy
  zamknięciu (D64, `config.tray`), `--hidden` przy starcie z Windows, kopia dzienna przy otwarciu folderu
  (`backup.ts`: 30 dziennych, 5 ręcznych, przed migracją – T20).
- Testy: `tests/unit/*`, `tests/fs/*` (folder danych, historia, kopie, watcher, aktualizacje), `tests/e2e/smoke.spec.ts`,
  `tests/update/*` (tylko Windows CI). Zmienne testowe: `FI_USER_DATA`, `FI_DATA_DIR`, `FI_MACHINE_NAME`,
  `FI_DEFAULT_DATA_DIR` (propozycja folderu), `FI_UPDATE_URL`, `FI_UPDATE_CHECK_DELAY_MS`, `FI_UPDATE_TOKEN`,
  `FI_E2E_EXECUTABLE`; Windows CI: `FI_UPDATE_FROM` / `FI_UPDATE_TO` / `FI_UPDATE_TO_VERSION`. Hak E2E
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

## Dane (folder wybierany przez użytkownika, domyślnie `OneDrive\FinancialIntel`)
```
fi.json                                  ustawienia, kategorie, konta, warstwy, rozkazy, reguły importu, schemaVersion
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
- [ ] E5 ICTTJ i dokowanie
- [ ] E6 Radar i należności
- [ ] E7 Dowództwo (gra)
- [ ] E8 Wywiad i raporty
- [ ] E9 Pierwszy oficer (opcjonalnie)
