# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary: do 1.15.4 –
`docs/archiwum/postep-do-1.15.md`, audyt 1.15.4 i grupy po nim – `docs/archiwum/postep-od-1.15.4.md` (Grep po wersji,
grupie albo identyfikatorze). Po wydaniu wpisy grupy przenoś do archiwum – tutaj zostaje stan (≤ 20 KB, sprawdza CI – D103).
Odwołania „`docs/postep.md` „…”” w starszych dokumentach i komentarzach (sekcje do 1.15.1 i audyt) prowadzą do archiwum.

**Stan (21.11.2026):** **1.21.0 wydane** (PR #70). W toku **grupa 1.21.1 „Uwagi na później”** (komenda użytkownika
21.11: P1 + U0–U8 jednym ciągiem) – gałąź `claude/1.21.1-uwagi`, sekcja niżej. Wpis grupy 1.21.0 – archiwum
`postep-od-1.15.4.md` (Grep „Grupa 1.21.0”).

## Grupa 1.21.1 – uwagi na później (T550–T557, 21.11.2026)

Sesja główna Opus 5.5 · high; wykonawcy z `.claude/agents/` w drzewach (`isolation: worktree`, pułapki – skill `etap`).
Źródło: „Uwagi na później” wpisu 1.21.0 w archiwum. Przyjęte propozycje (21.11, komenda „całość jednym ciągiem”):
filtra godzin Killzones w Operacjach **nie** ma (nowa funkcja); `MonthField` pokazuje miesiąc słownie („listopad
2026”), wpisywanie jak dotąd; podpowiedź oprocentowania – poza grupą.

| # | Krok | Wykonawca · przegląd | Model · thinking | Czas | Stan |
| --- | --- | --- | --- | --- | --- |
| P1 | Porządek lokalny: drzewa `FI-wt` (już puste – zostają `_logi*`, `_notatki`), scalone gałęzie lokalne, `git pull` | sesja główna | Opus 5.5 · high | 5 min | ✅ 21.11 |
| U0 | Kontrakt, tabela, numery T | sesja główna | Opus 5.5 · high | 15 min | ✅ 21.11 |
| U1 | „Cofnij” i `applyBulk` | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 40–60 min | ✅ 21.11 (19 min) |
| U2 | Radar: „osłony po” wiersza zbiorczego zaległych | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 20–30 min | ✅ 21.11 (16 min) |
| U3 | Słowa w toastach i imporcie, toast `settleDue` | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 20–30 min | ✅ 21.11 (10 min) |
| U4 | Nawigacja i menu | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min | ✅ 21.11 (15 min) |
| U5 | Edytor i pola | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 45–60 min | ✅ 21.11 (19 min) |
| U6 | Wydajność Mostku i Rozliczeń | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 15–20 min | ✅ 21.11 (9 min) |
| U7 | Stabilność testów, skrypty `tests/audyt/*` | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 30–45 min | ✅ 21.11 (25 min) |
| U8 | Pełne testy + E2E, `/code-review` (xhigh: U1, U2; high: reszta), CHANGELOG `## 1.21.1`, wersja, PR, CI, wydanie | sesja główna | Opus 5.5 · high | 45–60 min + CI | |

**Stan 21.11:** fala 1 (U1–U4, U6) scalona; w toku U5, U7. Do pytania użytkownika w U8: puste „osłony po” wierszy opłat w Radarze; „Finansuje:” w `TitleRuleAction.tsx:293`; nowy tekst U1 „Otwarta operacja zmieniła się od tego czasu – zostaje, jak jest.”. T555: licznik Meldunków liczony raz (`useInboxCountHost`, telefon `PhoneInboxWatcher`), publikowany w `store/inboxCount`; wiersze zakupów Rozliczeń w `memo` z prymitywów.

Fale: U1, U2, U3, U4, U6 równolegle; U5, U7 po scaleniu fali 1; U8 na końcu. Numery T: U1 T550 … U7 T556, U8 T557.

### Kontrakt (wspólne)
- Jak w 1.21.0 (archiwum, „Kontrakt (wspólne)”): test, który bez zmiany pada (unit, gdzie się da; E2E dla klawiatury
  i ekranów); `npm run typecheck`; powiązane pliki testów; zepsute istniejące E2E poprawić w tym kroku. Teksty przez
  `plnText` / `plDate` / `countLabel`; „Cofnij” przez `toast` z akcją (`UNDO_MIN_MS`, `store/ui.ts:89`) i `undoKept`;
  zmiany pól pieniędzy wielu operacji tylko przez `bulkPlan` / `applyBulk` (`operations/state.ts:595`, `:745`).
- Nowy test store'u albo czysty moduł renderera testowany w node – dopisz do `include` / `exclude` w `tsconfig.web.json`.
- Słownik pojęć bez zmian (D106 pkt 1). Bez zmian w `src/shared/calc/` poza prezentacją wskazaną w kroku.
- Wykonawca nie commituje; raport: pliki, testy (wynik), proponowane zdanie T, uwagi na później.

### Kontrakt kroków
- **U1 (T550):** (a) „Cofnij” samej reguły tytułu (`operations/TitleRuleAction.tsx`, `import/rules.ts:413`, `:487` –
  toasty 6000 ms) cofa też łatkę szkicu edytora i trwa co najmniej `UNDO_MIN_MS` (akcja w `toast` – nie stała ms);
  (b) „Cofnij” „Koperty ze średnich” (`month/actions.ts:76`, `MonthPage.tsx:211`) w minionym miesiącu usuwa też plan
  następnego miesiąca utworzony tym samym `editPlan`, a wynik `deleteOrSay` sprawdza (porażka = toast błędu, nie cisza);
  (c) `applyBulk` (`operations/state.ts:745`): operacja, która od podglądu stała się wpisem nowszej wersji aplikacji,
  liczona jako `newer` (jak `SaveResult.newer`, `main/datastore/store.ts:162`), nie „zmienione od podglądu”. Testy unit.
- **U2 (T551):** wiersz zbiorczy zaległych opłat kontenera w Radarze (`radar/rows.ts`, `RadarPage.tsx:332–378`, Z6b)
  – „osłony po” wierszy między wierszem zbiorczym a późniejszymi terminami tej grupy odejmuje te terminy (bieżąca suma
  jak dla wierszy pojedynczych). Tylko `rows.ts` / prezentacja; test unit `rows` + `radar.spec`.
- **U3 (T552):** toasty i opcje mówią nowymi słowami etykiet Z7 (`OperationEditor.tsx:473` – „Finansuje” / „Czyj
  zakup”, menu `operationsMenuModel.ts:144–145` – „kupione dla: X (odda)” / „prezent dla: X”): `operationsMenuModel.ts`
  `command.label`, `OperationsPage.tsx:558`, `import/options.ts:92–93`, `import/KeywordRules.tsx:26`, `QuickApp.tsx:515`
  – „Kupione dla: X” / „Prezent dla: X” (komunikat zgodny z pozycją menu, którą użytkownik kliknął). Toast `settleDue`
  (`cargo/actions.ts:227`) – mówi, ile terminów rozliczono i do którego dnia (`countLabel`, `plDate`), nie tylko
  o ostatnim. Testy: unit tekstów + poprawione E2E.
- **U4 (T553):** (a) wstecz / dalej w Ustawieniach: `sameRoute` (`store/ui.ts:60`) traktuje Ustawienia z inną
  zapamiętaną zakładką (`settingsNav.ts`, `fi.settings.tab`) jako inną trasę – Alt+← wraca do poprzedniej zakładki;
  (b) Tab w menu „Podziel…” (`operations/SplitMenu.tsx`) przechodzi między pozycjami / zamyka menu jak inne menu
  (wzorzec `AnchoredList.tsx`); (c) `Popover.tsx:73` zamyka się na klik w `listbox` / `menu` innego elementu strony –
  ignoruje tylko swoje (`contains` w swoim drzewie albo w liście, którą sam otworzył); (d) szkic manewru w Wywiadzie
  (`intel/Course.tsx` / `ForecastsTab.tsx`) po zmianie miesiąca – czyszczony albo przenoszony według istniejącego
  wzorca szkiców (rozstrzygnij T, opisz w raporcie); (e) „Skategoryzuj pozostałe (N)” (`ImportPage.tsx:1308`) liczy
  wszystkie widoczne nieskategoryzowane, nie tylko z bieżącego importu – albo etykieta mówi „z tego importu” (wybierz
  zgodnie z tym, na czym akcja działa – etykieta = zakres akcji). Testy unit + E2E.
- **U5 (T554):** (a) szukanie kategorii w menu PPM Operacji (`operationsMenuModel.ts`) i „Podziel…” w szybkim wpisie
  (`quick/QuickApp.tsx`) – `CategoryField` / `SplitMenu` jak w edytorze (Z7); (b) `DateField` (`components/fields.tsx:122`)
  z `allowEmpty`, lokalny `RangeDay` (`OperationsPage.tsx:101`) zastąpiony nim; (c) `MonthField` (`fields.tsx:178`)
  pokazuje miesiąc słownie („listopad 2026”, `monthLabel`), wpisywanie RRRR-MM / 03.2027 / 3/2027 bez zmian;
  (d) ptaszki propozycji Ładowni (`CargoPage.tsx:111`) – szkic przez nawigację jak inne szkice (`store/drafts` albo
  wzorzec w pobliżu). Testy unit + E2E.
- **U6 (T555):** `useInboxCount` (`inbox/state.ts:148`) liczony raz na Mostek (`App.tsx:199`, `BridgePage.tsx:216`,
  `:375`) – jedno obliczenie (memo w store albo przekazanie wartości); wiersze `SettlementsPanel` w `memo`. Test unit
  (licznik obliczeń) – bez zmiany wyników.
- **U7 (T556):** `tests/e2e/ap20.spec.ts:53` – stabilne czekanie na okno szybkiego wpisu (bez `waitForTimeout`);
  `tests/fs/bank-files.test.ts` – przyczyna czerwieni tylko w głównym folderze repo (2 testy; w świeżym drzewie 4/4) –
  ustal i popraw albo opisz; skrypty `tests/audyt/*` (poza CI) – odwołania do starych miejsc (formularze Radaru,
  zakładki Wywiadu, Ustawienia, `selectOption` kategorii, `radar-member-open`) przepisane na obecne (typecheck
  i `--list` bez uruchamiania maszyny).

## Otwarte
- **Odbiór zbiorczy 1.15.5–1.19.1:** maszyna wirtualna przez Cowork (48 punktów, `docs/audyt/maszyna.md`, wynik →
  `docs/audyt/raport/maszyna.md`) i sesje „Ty” (`docs/audyt/ty.md`); opisy punktów w `docs/audyt/punkty/`. Warianty
  „do potwierdzenia” z ciągów zaakceptowane 05.11.2026 – tabela w archiwum (Grep „Do potwierdzenia”).
- **Rzeczy otwarte z grup** (archiwum, punkty „Otwarte” N1–R2): podpowiedź oprocentowania, pomiar Workera w maszynie
  (IM.55), niestabilny `ap20.spec.ts:53`.
- **Testy tylko lokalnie czerwone (15.11, CI zielone):** `tests/fs/bank-files.test.ts` (2) w głównym folderze repo
  (w świeżym drzewie 4/4 – przyczyna nieznana) i `ictj.spec.ts:172` (ICTTJ zainstalowany na tym komputerze).
- **Node lokalnie:** systemowy 20.12 jest za stary (`check-node.mjs`) – na początek `PATH` folder
  `.tools\node-v24.21.0-win-x64` (łącze do `RegulatedDay\.tools`; Bash w piaskownicy przez łącze nie czyta – wtedy
  `/c/CC-Projekty/RegulatedDay/.tools/node-v24.21.0-win-x64`).
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
