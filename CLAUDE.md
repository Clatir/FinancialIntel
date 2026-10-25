# Financial Intel – ustalenia projektu

Osobista aplikacja budżetowa na Windows (Electron). Użytkownik jest kapitanem okrętu, a jego finanse to systemy
okrętu (osłony, kadłub, energia, ładownia); analizy mówią językiem ICT. Działa offline, na kilku komputerach (nigdy
jednocześnie), dane w folderze na OneDrive. Od D92 także iPhone (Capacitor, ten sam folder na OneDrive przez Microsoft Graph,
instalacja przez AltStore; plan grup iA–iE w `docs/plan.md`). Trading (konto maklerskie XTB) jest wyłącznie w ICTTJ. Interfejs po polsku, terminy ICT po angielsku. Siostrzana aplikacja:
ICT Trade Journal (ICTTJ, repozytorium `Clatir/TradingJournal`) – ten sam autor, ten sam stos, ten sam wygląd.

## Zasada współpracy
- Przed wykonaniem każdego zadania podaj użytkownikowi, jaki model i jaki poziom thinking będzie najodpowiedniejszy,
  dopiero potem wykonuj. **Przed każdym etapem tabela prac (D96, zmienia D90)**: krok, co obejmuje, model i thinking –
  najtańszy, który wystarczy, z górką (o stopień wyżej) – oraz szacowany czas pracy Claude'a; na końcu razem i rekomendacja.
- **Thinking domyślnie xhigh; max tylko** dla kroków silnika pieniędzy (warstwy, dokowanie, rozliczenia z domownikami,
  zwroty, plan miesiąca) i granicy ICTTJ (D96).
- **Bez komendy użytkownika nie zaczynaj kolejnego etapu ani grupy** (D67). W grupie etapy idą bez pauzy, jeden PR
  i jedno wydanie na grupę.
- **Przed każdym etapem** komunikat „Przed etapem N”; **po każdym etapie**: testy → `/code-review` high → commit + push →
  wpis w `docs/postep.md` → zaktualizowana tabela postępu → pauza (użytkownik zmienia model / thinking). Szablon
  komunikatu, scalanie PR (D71) i wydanie: skill `etap` – wywołaj go przed etapem i po nim.
- Po wznowieniu pracy (limit, nowa sesja, streszczenie rozmowy) najpierw przeczytaj `docs/postep.md` i kontynuuj od
  zapisanego miejsca.
- Gdy specyfikacja milczy: sprawę techniczną rozstrzygnij sam i dopisz jako T-decyzję; zachowanie widoczne dla
  użytkownika – zapytaj z propozycją (najlepiej w „Przed etapem N”).

## Dokumenty i kontekst
- `docs/specyfikacja.md` (co budujemy), `docs/plan.md` (etapy i kryteria „gotowe, gdy”), `docs/postep.md` (stan
  bieżący i kolejka), `docs/decyzje.md` (decyzje użytkownika D1… i techniczne T1… – nie zmieniaj decyzji użytkownika
  bez pytania), `docs/przeglad/` (przegląd po 1.4.1: błędy B…, wydajność W…, niespójności N…, funkcje F…),
  `docs/iphone.md`, `CHANGELOG.md` (notatki wydań pokazywane w aplikacji).
- **Duże dokumenty czytaj Grepem po identyfikatorze** (`D84`, `T17`, `B12`, `N-PC-3`, wersja), nie w całości:
  `docs/decyzje.md`, `docs/przeglad/*`, `docs/archiwum/*`.
- Wiedza o modułach jest w `.claude/rules/` i ładuje się sama przy pracy na plikach modułu: `silnik.md`, `import.md`,
  `folder-danych.md`, `ictj.md`, `telefon.md`, `ui.md`, `testy.md`, `wydanie.md`.
- `docs/archiwum/` – zamknięte zapisy: dawny CLAUDE.md z mapą kodu wersji 0.1.0–1.15.4 i dawny dziennik postępu.
  Nieaktualizowane – prawdą jest kod; zaglądaj tam Grepem, gdy potrzebny powód albo historia zmiany. Odwołania do sekcji
  „CLAUDE.md …” w dokumentach sprzed 25.10.2026 prowadzą do `docs/archiwum/claude-md-do-1.15.4.md`.
- Szerokie przeszukiwanie kodu (wiele plików, „gdzie jest X”) – agent `Explore` z `model: haiku`; wynik sprawdź w kodzie.
- **Gdzie co zapisywać:** stan i wpisy etapów → `docs/postep.md`; zmiany dla użytkownika → `CHANGELOG.md`; decyzje →
  `docs/decyzje.md`; nowa reguła albo pułapka modułu → `.claude/rules/<moduł>.md`. Do CLAUDE.md nie dopisuj map kodu
  ani historii wersji. Limity (CLAUDE.md ≤ 200 linii / 20 KB, `docs/postep.md` ≤ 400 / 60 KB, plik reguł ≤ 200 / 20 KB) sprawdza CI
  (`scripts/check-context.mjs`).

## ICTTJ – wzorce i granica
- ICTTJ jest źródłem wzorców. Gdy potrzebny moduł, dołącz do sesji repozytorium `Clatir/TradingJournal` **tylko do
  odczytu** i przenieś kod: kopiuj + dostosuj, na początku pliku komentarz
  `// adapted from ICTTJ <ścieżka> @ <krótki hash commita>`. Lista modułów: `docs/specyfikacja.md`, sekcja „Technika”.
- Praca lokalna (Antigravity, od 24.10.2026): kopia ICTTJ tylko do odczytu w `C:\Users\Szymon\Documents\ICTTJ_ref`
  (gałąź domyślna `claude/ict-trade-journal-app-9fp4r4`, wypychanie wyłączone – `push` URL `DISABLED`); przed
  przeniesieniem kodu `git pull`, w kopii nic nie zmieniaj.
- Nigdy nie zapisuj w repozytorium ICTTJ ani w folderze danych ICTTJ.
- **Konto tradingowe (maklerskie) XTB nie jest częścią FI** – saldo, wyniki, pule i rezerwa należą wyłącznie do ICTTJ.
  Portfel XTB (konto bankowe z kartą) jest kontem budżetu FI. Kosztów tradingu ani bilansu tradingu w FI nie ma.
- Odczyt folderu danych ICTTJ, pule i dopasowanie dokowania: `.claude/rules/ictj.md`.

## Stack
- Jak ICTTJ – wersje bierz z jego `package.json`: Electron, React, TypeScript (strict), Vite (`electron-vite`),
  Tailwind; zod (schematy = źródło typów), zustand, luxon, ulid, yazl / yauzl, cmdk, @tanstack/react-virtual,
  lightweight-charts.
- **Żadnych natywnych modułów Node.** Wszystkie biblioteki w `devDependencies`, bundlowane do `out/`.
- Testy: Vitest (`tests/unit` – czyste obliczenia, `tests/fs` – folder danych, `tests/mobile` – telefon, projekt
  `mobile` z modułami Node telefonu), Playwright `_electron` (`tests/e2e`, na Linuksie pod `xvfb-run`), telefon –
  Playwright w przeglądarce rozmiaru iPhone'a (`tests/e2e-mobile`, `playwright.mobile.config.ts`).
- Build: electron-builder → `Financial-Intel-Setup.exe` (NSIS) i `Financial-Intel-portable.exe`;
  `appId` `app.financialintel.desktop`, `productName` „Financial Intel”.
- iPhone (D92, od 1.13.0): Capacitor 8 (`ios/`, `capacitor.config.json`, `app.financialintel.ios`), web app telefonu
  `vite.mobile.config.mts` → `out/mobile`; `.ipa` bez podpisu (AltStore), źródło AltStore `altstore.json` w wydaniu.
- CI (`.github/workflows/ci.yml`, wzór ICTTJ): Linux przy każdym wypchnięciu (testy, build, E2E pod Xvfb, E2E telefonu w
  Chromium); Windows (build, smoke, test aktualizacji) i macOS (`ios`: E2E telefonu w WebKit, `.ipa`, symulator) tylko dla
  PR, gałęzi domyślnej i ręcznie; wydanie GitHub Releases dla nowej wersji z `SHA256SUMS.txt` (job Windows), potem
  `ios-release` dołącza `.ipa` i `altstore.json`.
- Aktualizacje: wzór ICTTJ (GitHub Releases, SHA-256, portable i instalator); repozytorium publiczne (D61), token
  GitHub per komputer w `safeStorage` tylko na wypadek prywatnego.
- Node do budowania ≥ 22.12, przypięty w `.node-version` (jak ICTTJ, z `scripts/check-node.mjs`).

## Architektura
- `src/shared` – czyste TS używane przez main i renderer: `schema/` (zod), `calc/` (silnik budżetu i obliczenia –
  mapa w `.claude/rules/silnik.md`), `import/` (mBank), `export/` (CSV, Excel, PDF), `migrations/`, `paths.ts`,
  `records.ts`, `merge.ts`, `machine.ts` (ustawienia komputera), `notify.ts`, `ictj.ts`, `glossary.ts`, `format.ts`
  (kwoty), `api.ts` (kontrakt IPC).
- `src/main` – jedyny właściciel folderu danych (`datastore/` z ICTTJ), `threadpool.ts` (pula wątków plików), `quick.ts` (szybki wpis i globalny skrót),
  powiadomienia w `index.ts`, `tray.ts`, `update/`, `config.ts` (ustawienia komputera w userData), `log.ts`; od E5
  `ictj/` (odczyt ICTTJ).
- `src/preload` – `window.fi` (contextBridge); okno z contextIsolation, sandbox, CSP; jedna instancja aplikacji.
- `src/renderer` – React; `store/` (zustand, autozapis jak ICTTJ), `features/<ekran>/`, `components/` (z ICTTJ).
- `src/mobile` – iPhone (od 1.13.0): `window.fi` w oknie aplikacji (`host/`), lustro folderu (`vfs/`, `node/`),
  synchronizacja z OneDrive (`sync/`), ekrany telefonu (`app/`) nad rendererem komputera bez zmian.
- **Stany warstw nigdy nie są zapisywane** – liczy je `calc/fleet.ts` z rekordów, deterministycznie (wzór:
  `calc/payouts.ts` w ICTTJ). Każda reguła ma test na przykładzie ze specyfikacji.

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
scheduled/ULID.json                      boja: zaplanowany wydatek, wpływ albo termin (1.8.0)
imports/ULID.json                        paczka importu z mBanku (do „Cofnij import”, 1.5.1)
backups/  .history/  .presence/          kopie ZIP, poprzednie wersje, obecność komputerów
```
- JSON z wcięciem 2 spacje i końcowym `\n`; identyfikatory ULID; czasy UTC ISO 8601; ścieżki względne z `/`.
- Każdy rekord: `schemaVersion`, `id`, `createdAt`, `updatedAt`, `updatedBy` (nazwa komputera). Nieznane pola
  zachowywane (`z.looseObject`).
- **Kwoty: liczby całkowite w groszach, tylko PLN.** Podział kwot (np. odkładka roczna na 12 miesięcy) w groszach
  z resztą w ostatniej części.
- Data operacji = data warszawska; godzina opcjonalna (import z mBanku nie ma godzin).
- Zapis atomowy, historia `.history/`, konflikty chmury i scalanie trójstronne – jak ICTTJ. Bez szyfrowania.
- Nowe pole albo kolekcja – addytywnie, **bez** podbijania `SCHEMA_VERSION` (od 0.1.0 wszystkie zmiany tak szły; podbicie
  zrobiłoby nowe wpisy tylko do odczytu na komputerze ze starszą wersją). Zmiana nieaddytywna: podbij `SCHEMA_VERSION`,
  krok migracji + test.
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
- Zmiany schematów addytywne: nowe pola opcjonalne, wartości enumów nowszej wersji zachowane (`openEnum`); wpis
  nowszej wersji jest tylko do odczytu (`NewerFileError`), nigdy nadpisywany.
- Rekordy pochodne mają stałe id (`fixedId`, `derivedId`) – dwa komputery nie tworzą duplikatów.
- Usunięcia i zmiany zbiorcze mają „Cofnij”; zapisy w tle (gra, cele ICTTJ, salda na start) tylko na komputerze
  „w użyciu” i nie w trakcie zapisu wszystkiego (`writesInBackground`).

## Komendy
```
npm ci
npm run dev          # tryb deweloperski
npm test             # unit + fs
npx vitest run tests/unit/<plik>.test.ts --reporter=dot   # w trakcie zmiany – tylko powiązany plik
npm run typecheck
npm run build        # out/
npx playwright test  # E2E (po npm run build); Linux: xvfb-run -a npx playwright test
npm run dist:win     # release/*.exe
build-windows.cmd    # Windows bez wymagań co do Node (wzór ICTTJ)
npm run dev:mobile   # telefon w przeglądarce – wygląd; OneDrive i logowanie tylko udawane (jak E2E, window.__FI_PHONE_TEST__)
npm run build:mobile # out/mobile (web app telefonu), potem npx cap sync ios
npm run test:e2e:mobile  # E2E telefonu (build z --mode e2e + Playwright)
node scripts/check-context.mjs   # limity CLAUDE.md, docs/postep.md, .claude/rules/
```

## Etapy
- Zakończone: E0–E8 (E9 wypada – D74), wersje 1.2.1–1.12.0, przegląd po 1.4.1, grupy E–V, iPhone iA–iC
  (1.13.0–1.15.0), 1.15.1–1.15.4. Lista z zakresem: archiwum, sekcja „Etapy”.
- Otwarte: iPhone iD (1.16.0) i iE (1.17.0) – zakres w `docs/plan.md`, stan i pytania w `docs/postep.md`.
- Odrzucone (D88): F32 flota rezerwowa, F38 paragony i gwarancje, F39 ulgi PIT-37 / PIT-36, F41 wpisy z telefonu,
  F43 archiwizacja starych lat.
