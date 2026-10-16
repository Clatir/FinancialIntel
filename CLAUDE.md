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
- Dopasowanie: wypłata z ICTTJ bez pary w CSV z mBanku przez 3 dni → Portfel XTB (potwierdzenie przy dokowaniu);
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
  pensja, koperty, przydział, odkładki, zasięg, klasa), `calc/game.ts` (oceny dni, stopnie, misje),
  `calc/intel.ts` (analizy ICT), `import/mbank.ts`, `migrations/`, `paths.ts`, `records.ts`, `api.ts` (kontrakt IPC).
- `src/main` – jedyny właściciel folderu danych (`datastore/` z ICTTJ), `ictj/` (odczyt ICTTJ), `tray.ts`,
  `shortcut.ts` (globalny skrót), `notify.ts`, `update/`, `config.ts` (ustawienia komputera w userData), `log.ts`.
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
- [ ] E1 Model danych i silnik budżetu
- [ ] E2 Import z mBanku
- [ ] E3 Kreator startu i plan miesiąca
- [ ] E4 Mostek i szybki wpis → wydanie 1.0.0
- [ ] E5 ICTTJ i dokowanie
- [ ] E6 Radar i należności
- [ ] E7 Dowództwo (gra)
- [ ] E8 Wywiad i raporty
- [ ] E9 Pierwszy oficer (opcjonalnie)
