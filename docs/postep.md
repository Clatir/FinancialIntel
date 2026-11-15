# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary: do 1.15.4 –
`docs/archiwum/postep-do-1.15.md`, audyt 1.15.4 i grupy po nim – `docs/archiwum/postep-od-1.15.4.md` (Grep po wersji,
grupie albo identyfikatorze). Po wydaniu wpisy grupy przenoś do archiwum – tutaj zostaje stan (≤ 20 KB, sprawdza CI – D103).
Odwołania „`docs/postep.md` „…”” w starszych dokumentach i komentarzach (sekcje do 1.15.1 i audyt) prowadzą do archiwum.

**Stan (15.11.2026):** **1.19.1 wydane** (07.11.2026, PR #66; wcześniejsze grupy – archiwum `postep-od-1.15.4.md`).
Grupa **1.20.0 – zmiany grupowe** w toku (komenda 15.11.2026, jeden ciąg A0–B4 bez pauz – D104).
Po wznowieniu: tabela i kontrakt niżej.

## Grupa 1.20.0 – wykonawcy i zmiany grupowe (od 15.11.2026)

Gałąź grupy `claude/1.20.0-zmiany-grupowe` (od `91a7a0b`). Wzór: ICTTJ `claude/paczka-1.26.0` (ciąg Z) i
`Clatir/RegulatedDay`. Decyzje: D104 (wykonawcy, grupa = ciąg, jedno CI), D105 (zmiany grupowe), T531 (CI tylko na PR
i `main`). Sesja główna Opus 5.5 · high; wykonawcy w tej sesji przez `general-purpose` z modelem i thinking z pliku
wykonawcy (agenci widoczni od nowej sesji). PR dopiero w B4 – jedna runda CI.

| # | Krok | Wykonawca · przegląd | Model · thinking | Czas | Stan |
| --- | --- | --- | --- | --- | --- |
| A0 | `.claude/agents/wykonawca-*`, skill `etap`, CLAUDE.md, D104, D105, T531, `ci.yml` | sesja główna · medium | Opus 5.5 · high | 20–30 min | ✅ 15.11 (`9130c45` + poprawki przeglądu; ok. 35 min) |
| B0 | Kontrakt B1–B3 (niżej) | sesja główna | Opus 5.5 · high | 15–20 min | ✅ 15.11 |
| B1 | Zaznaczanie (Ctrl / Shift / Shift+strzałki / Ctrl+A / Esc) na `ticked` | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 15–25 min | ✅ 15.11 (≈ 5 min wykonawcy; `a44e3e5`; 29 testów) |
| B2 | Nowe zmiany zbiorcze (dzień, tagi, plan / impuls, wyjaśniona, ładownia, cel, pożyczka), `opState`, skutek ładowni i pożyczek | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 30–45 min | ✅ 15.11 (≈ 14 min wykonawcy; scalenie `364ada1`; 3 pliki testów) |
| B3 | Menu PPM, kalendarz, wspólny podgląd, E2E | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 25–35 min | ✅ 15.11 (≈ 15 min wykonawcy + 3 rundy poprawek; E2E `operations-bulk-menu.spec.ts`) |
| B4 | Pełne testy + E2E, `/code-review` xhigh całości, `ui.md`, CHANGELOG `## 1.20.0`, wersja, PR, CI, scalenie, wydanie | sesja główna | Opus 5.5 · high | 30–45 min + CI | 🔄 15.11 (przegląd xhigh + 2 rundy high, poprawki B2 / B3; testy; `.exe` lokalnie zbudowane; PR i CI) |

### Decyzje w trakcie grupy
- Użytkownik (15.11): jedna grupa A+B; kroki „max” – `wykonawca-opus` z effort max w wywołaniu; menu obok pasków;
  pola i zachowanie – D105; CI tylko na PR i `main` (T531, zamiast `[skip ci]`).
- Techniczne (T532, do wpisania w B4): Ctrl+klik i Shift+klik nie przesuwają kursora (edytor bez zmian); kotwica =
  ostatni wiersz klikany (także zwykłym klikiem) albo zaznaczony polem; Shift+strzałki przesuwają kursor i dokładają
  jego wiersz (powrót nie zdejmuje – zdejmuje Ctrl+klik albo Esc); „wspólnie…” finansującego tylko w pasku (edytor
  udziałów nie mieści się w menu); menu tylko na komputerze (na telefonie bez prawego przycisku – pasek zostaje).
- Techniczne (T533, do wpisania w B4): nowe zmiany zbiorcze najpierw sprawdzają, czy pasują, potem czy coś zmieniają
  (`bulkApplies` / `opState` liczą tylko pasujące); „bez ładowni” pomija zwrot towaru z kontenerem (edytor nie pokazuje
  tam ładowni); skutek w podglądzie – zbiorniki ładowni (`Effect.cargo`) i „zostało” pożyczek (`Effect.loans`).

### Uwagi na później (przegląd A0, medium)
- `ci.yml`: `concurrency` z `cancel-in-progress: true` przerywa też run na `main` – dwa scalenia tuż po sobie mogą
  pominąć publikację wersji (było i przed T531; scalaj, gdy run na `main` skończył publikację).
- `ci.yml`: warunek `github.event_name != 'push' || …` jobów Windows / iPhone jest po T531 zawsze prawdziwy (nieszkodliwy);
  `branches: [main]` obok `default_branch` w warunkach – przy zmianie gałęzi domyślnej poprawić oba.
- Kontrakt podaje ścieżkę Node wprost (`.tools
ode-v24.21.0-win-x64`) – przy zmianie `.node-version` poprawić.
- Bez CI do PR grupy: po scaleniu B1 + B2 lokalnie pełny `typecheck` i `npm test`; w razie wątpliwości ręczny
  `gh workflow run ci.yml --ref claude/1.20.0-zmiany-grupowe`.

### Przeglądy i testy (B4)
- `/code-review` xhigh całości (15 uwag) – poprawione: menu wisiało po przełączniku ukrywającym wiersze, „Cofnij” tagu
  po jednym tagu, brak „nie” w powodach, limit nowego tagu, Enter w widżetach, id tagów, Shift na polu zaznaczenia,
  jedno przejście `bulkProbe`, minus „−”, zbiornik ładowni po jednej stronie, `keepTicked`. Runda 2 (high, 10): pole
  zaznaczenia z Shift / Ctrl (React #9023), przycinanie przy pustej liście, klatka ze starym `ticked`, „Cofnij” tagu na
  innym rodzaju / wpisie nowszej wersji (także ścieżka ogólna), „o 0 dni”. Runda 3 (high, 6): regresja `tagUndone`
  (jedyny tag przelewu), przycinanie raz i tylko zmienionych, Esc na widocznych.
- Testy lokalne: `typecheck`, unit 2061 (padają tylko 2 w `tests/fs/bank-files.test.ts` – w głównym folderze repo; w świeżym
  drzewie na `main` i na gałęzi grupy przechodzą 4/4), E2E 146 / 147 (`ictj.spec.ts:172` – ICTTJ zainstalowany na tym
  komputerze, „Nie znaleziono ICT Trade Journal” się nie pokazuje). Ściągawka F1: sekcja „Lista operacji”.
- Uwagi na później (przeglądy B4): tagi linii paragonu nie liczą się w menu (tylko tagi operacji – kontrakt); najechanie
  na wyłączoną pozycję menu psuje kolejność strzałek; pola dni bez `NumberField` (ciche przycięcie ±366, jak wcześniej
  w pasku); `tanksEffect` zakłada, że brak zbiornika = 0 zł; pole zaznaczenia czyta modyfikatory z `nativeEvent` (zależne
  od Reacta); trzy filtry „zaznaczone widoczne” (`tickedIn`, `tickedEntries`, `BulkBar`) do scalenia; powtórzona logika
  znacznika w `operationsMenuModel.ts`.

### Kontrakt B0
Wspólne dla wykonawców: baza `git fetch origin && git merge --ff-only origin/claude/1.20.0-zmiany-grupowe` (hash HEAD
w poleceniu), `node_modules` – łącze (`New-Item -ItemType Junction`), bez `npm ci`; Node `.tools\node-v24.21.0-win-x64`;
nowe testy store'u i czyste moduły renderera testowane w node – `include` / `exclude` w `tsconfig.web.json` (TS6307);
nazwy plików różne nie tylko wielkością liter (TS1261). Kody decyzji tylko w komentarzach (`ui-no-codes.test.ts`).

**B1 – zaznaczanie** (`features/operations/rangeSelect.ts` – czyste funkcje; `state.ts`; `OperationsPage.tsx`):
- `useOperationsUi`: nowe `tickAnchor: string | null`, czyszczone wszędzie tam, gdzie dziś `ticked: {}` (`state.ts`
  `setFilter` :93, `showFilter` :108, `showStoredFilter` :122, `resetFilter` :131, `followCurrentMonth` :143,
  `clearTicked` :155). `ticked` zostaje jedynym zbiorem (D76) – bez drugiego stanu zaznaczenia.
- `rangeSelect.ts`: `clickTick(state, order, id, { shift, ctrl })` → `{ ticked, anchor }`: Ctrl – przełącz `id`;
  Shift (i Ctrl+Shift) – dołóż zakres kotwica…`id` w `order`; brak kotwicy w `order` – jak Ctrl. `extendTick(state,
  order, cursorId, dir)` → `{ ticked, anchor, cursor }` (Shift+strzałki: kotwica = kursor, gdy brak; dokłada wiersz
  startowy i nowy kursor). `tickAll(order)`. Bez zmian – zwraca ten sam obiekt `ticked`. `order` = widoczne wiersze
  bez szkiców w bieżącym sortowaniu (jak `TickAll` :298).
- `OperationsPage.tsx`: `Row` `onClick` (:208) – z Ctrl / Shift `clickTick` (bez `selectOperation`, `preventDefault`
  przy Shift – bez zaznaczania tekstu), bez modyfikatorów – `selectOperation` jak dziś + kotwica = `id`; pole
  zaznaczenia (:220) ustawia kotwicę. Klawisze (:471–495): Ctrl+A (poza polem tekstowym) – zaznacz widoczne; Esc
  (poza polem, bez otwartego okna) – `clearTicked`; Shift+↑/↓ – `extendTick` + `selectOperation` + `scrollToIndex`;
  strzałki bez Shift jak dziś. Wiersz zaznaczony: `data-ticked="1"` i lekkie tło (gdy nie kursor).
- Testy: `tests/unit/operations-selection.test.ts` (wszystkie przejścia, ukryte filtrem poza zakresem, szkice poza
  `order`, ta sama referencja bez zmian) + przypadki klawiszy w istniejącym E2E (`tests/e2e/operations.spec.ts`) albo
  nowy w B3.

**B2 – logika** (`state.ts` sekcja F11 :525–698; czysta część do `features/operations/bulkModel.ts`):
- `BulkChange` (:528) dostaje: `{ kind: 'day'; date }` (data operacji = `date`, `counterDate` przesunięte o tę samą
  liczbę dni, jak `shift` :567); `{ kind: 'tag'; tag; on }` (tag po `tagKey`, `withTags` z `shared/calc/tags.ts`;
  tylko tagi operacji, nie linii); `{ kind: 'tagsClear' }`; `{ kind: 'impulse'; to: 'plan' | 'impulse' | null }` (tylko
  wydatki – jak `game.ts:316`); `{ kind: 'explained'; on }` (tylko `kind === 'correction'`); `{ kind: 'container';
  containerId: string | null }` (czyści `goalId`) i `{ kind: 'goal'; goalId: string | null }` (czyści `containerId`) –
  warunki rodzaju i kierunku dokładnie jak edytor (`OperationEditor.tsx` :400–466); `{ kind: 'loan'; loanId: string |
  null }` (tylko `kind === 'loan'`, jak :514; linie spłat we wpływach – D100 – bez zmian).
- Podział paragonu (`splits.length && !shareOf(t)`) przy `container`, `goal`, `loan` – `null` (pominięte, liczone);
  wspólny zakup przyjmuje zmianę. Tagi, impuls, „wyjaśniona” – na całej operacji także przy podziale.
- `changedBy` (:547) do `bulkModel.ts` (czysta, testowana w node); niezmienione – ta sama referencja, niepasujące – `null`.
  `opState(records, change): 'on' | 'mixed' | 'off'` (✓ / „—” w menu; tylko zapisywalne, bez szkiców) i
  `bulkApplies(records, change): number`. Przełącznik tagu: menu woła `{ kind: 'tag', on: opState(...) !== 'on' }`.
- `bulkPlan` / `bulkEffect` / `applyBulk` (:574, :606, :646) bez nowych reguł – „Cofnij” na poziomie pól już jest
  (`setFields` :638). `BULK_LABEL` (:643) i `ACTION_LABEL` (`BulkChange.tsx:21`) – etykiety nowych; lista w pasku
  `BulkChangeBar` zostaje czterema dawnymi (jawna tablica, nie `Object.keys`).
- Skutek w podglądzie: `Effect` (`shared/calc/effect.ts:20`) dostaje `cargo` (zbiorniki ładowni – `FleetState.tanks`,
  `fleet.ts:711`) i `loans` (`FleetState.loans` :731), gdy zmienia się ich kwota; `noEffect` je uwzględnia.
- Testy: `tests/unit/bulk-model.test.ts` (każda zmiana, pominięte, podział, wspólny zakup, `opState` mieszane, ta sama
  referencja), w `tests/unit/operations-state.test.ts` (wzór :236–290) – zapis, „Cofnij” każdej nowej zmiany, `readOnly`,
  „Cofnij” po zmianie innego pola w międzyczasie; `effect` – ładownia i pożyczka.

**B3 – menu** (`features/operations/OperationsMenu.tsx` + `operationsMenuModel.ts`; `BulkChange.tsx`; `OperationsPage.tsx`):
- `Row` `onContextMenu`: `preventDefault`; wiersz spoza `ticked` – zaznacz tylko jego (kotwica = on); szkic – bez menu.
  Menu przy kursorze myszy (portal, w granicach okna, podmenu po lewej, gdy brak miejsca), nagłówek „Zmień N operacji”.
- Pozycje (zarchiwizowane ukryte): Kategoria ▸ (`categorizeTicked(ids, id, 'none', label)`), Finansujący ▸ (ja,
  domownicy, prezent – `financeTicked`), Konto ▸, Rodzaj ▸ (przelew ▸ konto drugiej strony), Data ▸ (kalendarz miesiąca
  – dzień → `day`; „Przesuń o N dni” → `shift`), Tagi ▸ (znane tagi – `useKnownTags` – z ✓ / „—”, pole „nowy tag”
  Enter, „Wyczyść tagi”), Plan / impuls ▸, Wyjaśniona korekta (przełącznik), Ładownia ▸, Cel ▸, Pożyczka ▸,
  separator, „Usuń zaznaczone”.
- Z podglądem skutku (wspólny `BulkPreview` z `BulkChange.tsx:97` – stan podglądu przeniesiony do małego sklepu, jeden
  podgląd na ekranie dla paska i menu): konto, rodzaj, data, ładownia, cel, pożyczka, usuń. Od razu przez
  `applyBulk(bulkPlan(...))` z toastem „Cofnij”: tagi, plan / impuls, wyjaśniona.
- Przełączniki (tagi, wyjaśniona) nie zamykają menu, pojedynczy wybór zamyka. Grupa bez pasujących
  (`bulkApplies === 0`) – wyłączona z powodem w `title`. Folder tylko do odczytu – pozycje wyłączone.
- Klawiatura: ↑ / ↓, Enter, → / ← (podmenu), Esc zamyka tylko menu (capture + `stopImmediatePropagation` – nie czyści
  zaznaczenia, nie zamyka okna). `data-testid`: `operations-menu`, `operations-menu-<grupa>`,
  `operations-menu-<grupa>-<wartość>`.
- E2E: `tests/e2e/operations-bulk-menu.spec.ts` (wzór `bulk-preview.spec.ts`): Ctrl / Shift, PPM, zmiana tagu i ładowni,
  podgląd, „Cofnij”, zapis na dysku, okno 1100 × 680 (menu i podmenu w oknie).

## Otwarte
- **Odbiór zbiorczy 1.15.5–1.19.1:** maszyna wirtualna przez Cowork (48 punktów, `docs/audyt/maszyna.md`, wynik →
  `docs/audyt/raport/maszyna.md`) i sesje „Ty” (`docs/audyt/ty.md`); opisy punktów w `docs/audyt/punkty/`. Warianty
  „do potwierdzenia” z ciągów zaakceptowane 05.11.2026 – tabela w archiwum (Grep „Do potwierdzenia”).
- **Rzeczy otwarte z grup** (archiwum, punkty „Otwarte” N1–R2): podpowiedź oprocentowania, pomiar Workera w maszynie
  (IM.55), niestabilny `ap20.spec.ts:53`.
- **Porządek lokalny** (Sonnet 5.5 · medium, ok. 0,25 h): drzewa `C:\CC-Projekty\FI-wt\*` (gałęzie scalone, bez zmian) do
  usunięcia – najpierw łącza `node_modules` / `.tools` (`[System.IO.Directory]::Delete(<łącze>, $false)`), potem
  `git worktree remove`; scalone gałęzie `claude/1.15.*`–`1.17.*`; `git pull` w `C:\CC-Projekty\FinancialIntel`.
- **Node lokalnie:** systemowy 20.12 jest za stary (`check-node.mjs`) – na początek `PATH` folder
  `.tools\node-v24.21.0-win-x64`.
- **iPhone iD / iE** – wstrzymane (D98), tylko na osobną decyzję; dawny komunikat „Przed grupą iD” (21.10) w archiwum.
- Odrzucone (D88): F32, F38, F39, F41, F43.

## Oszczędzanie tokenów (D103, 08.11.2026) – bez wersji, bez CHANGELOG
- Po audycie zużycia tokenów: zasady przeglądów, thinking i kontekstu (D103, zmienia D96 cz. 1) – w CLAUDE.md i skillu
  `etap`. Technicznie (T525–T530): rejestr T w `docs/decyzje-techniczne.md`, CLAUDE.md 13,3 → ok. 7 KB (wiedza do
  `.claude/rules/`, nowy `dane.md`), ten plik 49 → poniżej 20 KB, zamknięte przeglądy do `docs/archiwum/`, długie linie
  złamane, ciche reportery testów lokalnie, blokady czytania wyników buildów i testów.

**Lekcje z ciągu:** równolegle najwyżej 4–5 podagentów (więcej – zbyt wolne E2E i niestabilności); jeden przegląd xhigh
całości + jeden high na poprawkach, dalej tylko przy poważnych uwagach; numery T przydzielaj podagentom z góry.

## Zasady prowadzenia (prośba użytkownika 16.10.2026 – D67)
- Po każdym kroku (etapie albo grupie) zaktualizowana tabela: model i thinking z górką, szacowany czas pracy Claude'a.
- Bez komendy użytkownika nie zaczynam kolejnego etapu ani grupy. Wyjątek: ciąg N1–R2 – komenda z 04.11.2026 obejmuje
  wszystkie grupy, bez pauz między nimi (D101).
- Etapy, które mogą iść jednym ciągiem, są zgrupowane: w grupie bez pauzy między etapami (każdy etap i tak kończy się
  testami, `/code-review` high, commitem i wpisem tutaj), jeden PR i jedno wydanie na grupę, potem pauza.
- Wpis etapu: zakres, decyzje (D… / T…), testy, czas faktyczny, rzeczy otwarte – zwięźle; mapa kodu nie jest
  potrzebna (kod przeszukuje się Grepem).

## Kolejka prac

Czas = praca Claude Code w sesji, bez testowania przez użytkownika i bez czekania na CI. Ukończone grupy z czasami:
archiwa dziennika (sekcje „Kolejka prac”). Planowane grupy:

| Grupa | Etapy | Model | Thinking | Czas Claude'a | Wydanie | Co potrzebne przed startem | Stan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **iD** | iPhone: Ładownia i gwiazdy – dokowanie z ICTTJ, Ładownia, Mapa gwiezdna (IP15–IP17) | Opus 5.5 | **max** (z IP15; bez niego xhigh) | 1,25–1,75 h z IP15, 0,5–0,75 h bez (z górką 2 h; plan był 4–4,5 h – grupy iA–iC trwały 0,15–0,3 planu) | później | odpowiedź: czy folder danych ICTTJ jest na OneDrive (bez tego IP15 odpada); limit tygodniowy po iC; komenda | ⏸ wstrzymane (D98) |
| **iE** | iPhone: Dowództwo – Dowództwo, Wywiad, kreator, Ustawienia, zapisy w tle (IP18, IP19, IP21, IP22, IP24) | Opus 5.5 | **xhigh** (D96; max tylko w krokach silnika pieniędzy albo granicy ICTTJ) | 5,5–7,5 h (z górką 8 h) | później | decyzje: IP21 (kreator – propozycja: bez), IP24 (zapisy w tle z telefonu) | ⏸ wstrzymane (D98) |
