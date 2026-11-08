# Financial Intel – ustalenia projektu

Osobista aplikacja budżetowa na Windows (Electron). Użytkownik jest kapitanem okrętu, a jego finanse to systemy
okrętu (osłony, kadłub, energia, ładownia); analizy mówią językiem ICT. Działa offline, na kilku komputerach (nigdy
jednocześnie), dane w folderze na OneDrive. Od D92 także iPhone (Capacitor, ten sam folder na OneDrive przez Microsoft
Graph, AltStore; iD–iE wstrzymane – D98). Trading (konto maklerskie XTB) jest wyłącznie w ICTTJ. Interfejs po polsku,
terminy ICT po angielsku, komentarze w kodzie po angielsku. Siostrzana aplikacja: ICT Trade Journal (ICTTJ,
`Clatir/TradingJournal`) – ten sam autor, stos i wygląd.

## Zasada współpracy
- Przed zadaniem podaj model i thinking; **przed każdym etapem tabela prac** (D96): krok, zakres, model i thinking –
  najtańszy, który wystarczy, z górką – i szacowany czas pracy Claude'a; na końcu razem i rekomendacja.
- **Thinking i przeglądy (D103, zmienia D96 cz. 1):** domyślnie high; xhigh dla logiki (migracje, synchronizacja, folder
  danych, telefon); **max tylko** w krokach, które zmieniają silnik pieniędzy (warstwy, dokowanie, rozliczenia z
  domownikami, zwroty, plan miesiąca) albo granicę ICTTJ – implementacja i jej przegląd, nigdy cała grupa. `/code-review`
  według ryzyka, najwyżej dwie rundy (druga tylko na poprawkach) – szczegóły w skillu `etap`.
- **Bez komendy użytkownika nie zaczynaj kolejnego etapu ani grupy** (D67). W grupie etapy idą bez pauzy, jeden PR
  i jedno wydanie na grupę.
- Przed etapem komunikat „Przed etapem N”; po etapie: testy → `/code-review` → commit + push → wpis w `docs/postep.md` →
  tabela postępu → pauza. Szablon, scalanie PR (D71) i wydanie: skill `etap` – wywołaj go przed etapem i po nim.
- **`/clear` po każdym scalonym PR:** powiedz wprost, że można (wszystko wypchnięte, `docs/postep.md` mówi, co dalej).
- Po wznowieniu (limit, nowa sesja, streszczenie) najpierw przeczytaj `docs/postep.md` i kontynuuj od zapisanego miejsca.
- Gdy specyfikacja milczy: sprawę techniczną rozstrzygnij sam (T-decyzja); zachowanie widoczne dla użytkownika – zapytaj
  z propozycją.

## Dokumenty i kontekst
- `docs/specyfikacja.md` (co budujemy), `docs/plan.md` (etapy, „gotowe, gdy”), `docs/postep.md` (stan i kolejka,
  ≤ 20 KB), `docs/decyzje.md` (decyzje użytkownika D – nie zmieniaj bez pytania), `docs/decyzje-techniczne.md` (T; od
  08.11.2026 osobno – odwołania „`docs/decyzje.md` T…” w starszych plikach prowadzą tam), `docs/format-folderu.md`,
  `docs/iphone.md`, `docs/audyt/` (odbiór w toku: `maszyna.md`, `ty.md`, `punkty/`; wyrocznia), `CHANGELOG.md` (notatki
  wydań w aplikacji – czytaj tylko początek, Read z `limit`).
- **Duże dokumenty czytaj Grepem po identyfikatorze** (`D84`, `T17`, `B12`, `AP-17`, wersja), nie w całości.
- Wiedza o modułach jest w `.claude/rules/` i ładuje się sama przy pracy na plikach modułu: `silnik.md`, `import.md`,
  `dane.md` (układ folderu i konwencje rekordów), `folder-danych.md`, `ictj.md`, `telefon.md`, `ui.md` (także wygląd),
  `testy.md`, `wydanie.md` (build, CI, aktualizacje, Node).
- `docs/archiwum/` – zamknięte zapisy (nieaktualizowane – prawdą jest kod; Grepem, gdy potrzebny powód): dawny CLAUDE.md
  z mapą kodu 0.1.0–1.15.4, dawne dzienniki postępu, przegląd po 1.4.1 (`archiwum/przeglad/`, B…, W…, N…, F…) i audyt
  1.15.4 (`archiwum/audyt/`: plan, raporty, wnioski AP-…). Odwołania do `docs/przeglad/…`, `docs/audyt/raport…`,
  `wnioski.md`, `plan.md` audytu w starszych plikach i komentarzach prowadzą do archiwum (od 08.11.2026); „CLAUDE.md …”
  w dokumentach sprzed 25.10.2026 – do `docs/archiwum/claude-md-do-1.15.4.md`.
- Szerokie przeszukiwanie kodu – agent `Explore` z `model: haiku`; wynik sprawdź w kodzie.
- **Gdzie co zapisywać:** stan i wpisy etapów → `docs/postep.md` (po wydaniu do archiwum); zmiany dla użytkownika →
  `CHANGELOG.md`; decyzje → `docs/decyzje.md` / `docs/decyzje-techniczne.md` (nowe T zwięźle); nowa reguła albo pułapka
  modułu → `.claude/rules/<moduł>.md`. Do CLAUDE.md nie dopisuj map kodu ani historii wersji. Limity (CLAUDE.md, postęp,
  rejestry decyzji, pliki reguł) sprawdza CI (`scripts/check-context.mjs`).

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

## Stos i architektura
- Jak ICTTJ (wersje z jego `package.json`): Electron, React, TypeScript (strict), electron-vite, Tailwind; zod (schematy =
  źródło typów), zustand, luxon, ulid, yazl / yauzl, cmdk, @tanstack/react-virtual, lightweight-charts. **Żadnych
  natywnych modułów Node**; wszystkie biblioteki w `devDependencies`, bundlowane do `out/`.
- `src/shared` – czyste TS dla main i renderera (`schema/`, `calc/` – silnik, `import/`, `export/`, `migrations/`, `api.ts`
  – kontrakt IPC); `src/main` – jedyny właściciel folderu danych; `src/preload` – `window.fi` (contextIsolation, sandbox,
  CSP, jedna instancja); `src/renderer` – React; `src/mobile` – iPhone nad rendererem komputera bez zmian.
- **Stany warstw nigdy nie są zapisywane** – liczy je `calc/fleet.ts` z rekordów, deterministycznie. Każda reguła ma test
  na przykładzie ze specyfikacji.
- Selektory zustand zwracają prymitywy albo istniejące referencje. Usunięcia i zmiany zbiorcze mają „Cofnij”.

## Dane – żelazne zasady (układ folderu i konwencje: `.claude/rules/dane.md`)
- **Kwoty: liczby całkowite w groszach, tylko PLN** (wyjątek tylko informacyjny `foreign`, T492).
- Nowe pole albo kolekcja – addytywnie, **bez** podbijania `SCHEMA_VERSION`; zmiana nieaddytywna: podbij, krok migracji
  + test. Wpis nowszej wersji jest tylko do odczytu, nigdy nadpisywany.
- **Nigdy nie commituj danych użytkownika**; przykładowe pliki tylko zanonimizowane, w `tests/fixtures/`.

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
node scripts/check-context.mjs   # limity CLAUDE.md, postępu, rejestrów decyzji, .claude/rules/
```

## Etapy
- Zakończone: E0–E8 (E9 wypada – D74), 1.2.1–1.12.0, przegląd po 1.4.1, grupy E–V, iPhone iA–iC (1.13.0–1.15.0),
  1.15.1–1.15.4, audyt 1.15.4 (D97, D99), ciągi N1–R2 (1.15.5–1.17.0, D101) i G0–GD (1.17.1–1.18.1), 1.19.0 (D102),
  1.19.1. Lista z zakresem: archiwa (sekcje „Etapy”, „Kolejka prac”).
- Otwarte: odbiór zbiorczy 1.15.5–1.19.1 (maszyna wirtualna, sesje „Ty”) – stan w `docs/postep.md`. iPhone iD i iE
  wstrzymane (D98).
- Odrzucone (D88): F32 flota rezerwowa, F38 paragony i gwarancje, F39 ulgi PIT-37 / PIT-36, F41 wpisy z telefonu,
  F43 archiwizacja starych lat.
