# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary: do 1.15.4 –
`docs/archiwum/postep-do-1.15.md`, audyt 1.15.4 i grupy po nim – `docs/archiwum/postep-od-1.15.4.md` (Grep po wersji,
grupie albo identyfikatorze). Po wydaniu wpisy grupy przenoś do archiwum – tutaj zostaje stan (≤ 20 KB, sprawdza CI – D103).
Odwołania „`docs/postep.md` „…”” w starszych dokumentach i komentarzach (sekcje do 1.15.1 i audyt) prowadzą do archiwum.

**Stan (15.11.2026):** **1.20.0 wydane** (15.11.2026, PR #68 – zmiany grupowe na liście Operacji: zaznaczanie
Ctrl / Shift, menu pod prawym przyciskiem, nowe zmiany zbiorcze; wykonawcy z `.claude/agents/` i jedno CI na grupę – D104,
D105, T531–T534). Wpis grupy z „Uwagami na później” – archiwum `postep-od-1.15.4.md` (Grep „Grupa 1.20.0”).
**W toku (od 21.11.2026): grupa 1.21.0 „Ergonomia”** (D106, przegląd `docs/przeglad-ux.md`) – jednym ciągiem na komendę
użytkownika, gałąź `claude/gallant-wright-g8snx6`, jedno wydanie na końcu. Sekcja grupy niżej; po wznowieniu – od
pierwszego kroku bez ✅.

## Grupa 1.21.0 – ergonomia (D106, T535–T546)

Sesja główna Opus 5.5 · high; wykonawcy z `.claude/agents/` w drzewach (`isolation: worktree`, łącze `node_modules`
do głównego repozytorium – `ln -s`). Wykonawca nie commituje – sesja główna przegląda diff, commituje w drzewie i scala
do gałęzi grupy. Słownik pojęć bez zmian (D106 pkt 1) – żaden krok nie zmienia nazw. Identyfikatory UX-… z opisem,
`plik:linia` i propozycją – `docs/przeglad-ux.md`.

| # | Krok | Wykonawca · przegląd | Model · thinking | Czas | Stan |
| --- | --- | --- | --- | --- | --- |
| Z0 | D106, kontrakt, tabela | sesja główna | Opus 5.5 · high | 20 min | ✅ 21.11 |
| Z1 | Reguła tytułu przez zmiany zbiorcze, „Zapamiętaj” z „Cofnij” (UX-1, 2, 24) | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 30–45 min | ✅ 21.11 |
| Z2 | „Cofnij” i podsumowania: koperty ze średnich, łupy, pomiń wpis, kreator „albo – albo” (UX-6, 7, 8, 9) | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 30–45 min | ✅ 21.11 |
| Z3 | Powłoka okna (UX-3, 10, 11, 12, 18, 20, 21, 22, 43, 53, 63, 78 paleta, 83) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min | ✅ 21.11 |
| Z4 | Lista Operacji (UX-14, 15, 16, 71, 73, 77) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min | ✅ 21.11 |
| Z5 | Wywiad w zakładkach (UX-13, 17, 40, 41, 42, 55 Wywiad, 74 Wywiad, 80) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min | ✅ 21.11 |
| Z6 | Mostek i Meldunki (UX-4, 5, 30, 31, 32, 33, 34, 66, 74 koperty, 76) | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 45–75 min | |
| Z7 | Edytor: kategoria z szukaniem, kontrahent z historii, etykiety finansowania, „Podziel…” (UX-36, 37, 70, 72) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 45–60 min | |
| Z8 | Import i eksport (UX-23, 38, 39, 62, 85) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 30–45 min | |
| Z9 | Ustawienia, Synchronizacja, pierwszy start (UX-19, 44, 45, 46, 47, 67, 68, 78 ustawienia) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 45–60 min | |
| Z10 | Radar, Mapa, Ładownia (UX-35, 69 bez słownika – tylko nagłówki, 74 Radar, 75, 81) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min | ✅ 21.11 |
| Z11 | Plan miesiąca, Dowództwo, Dokowanie, kreator (UX-48, 49, 51, 52, 54, 55 Dowództwo) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min | |
| Z12 | Szybki start kreatora (UX-79) | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 45–75 min | |
| Z13 | Ekran rozliczeń z domownikami (UX-82) | `wykonawca-opus` · xhigh (bez zmian w `calc/`; gdyby trzeba – stop i max) | Opus 5.5 · xhigh | 60–90 min | |
| Z14 | Pełne testy + E2E, `/code-review` (xhigh: Z1, Z2, Z6, Z12, Z13; high: reszta), `ui.md`, CHANGELOG `## 1.21.0`, wersja, PR, CI, scalenie, wydanie | sesja główna | Opus 5.5 · high | 60–90 min + CI | |

Razem ok. 9–13 h (z górką). Fale: Z1–Z5 równolegle; Z6–Z10 po scaleniu fali 1; Z11–Z13 po fali 2 (Z11 i Z12 – kreator,
Z12 po Z11). Numery T: Z1 T535 … Z13 T547 (kolejno), Z14 – T548.

### Kontrakt (wspólne)
- Każdy krok: test, który bez zmiany pada (unit, gdzie się da; E2E dla przepływów klawiatury i ekranów), `npm run
  typecheck`, powiązane pliki testów. Istniejące E2E, które zmiana psuje (teksty, `data-testid`), poprawić w tym kroku.
- Nowe `data-testid` z prefiksem ekranu; nowe teksty przez `plnText` / `plDate` / `countLabel`; „Cofnij” przez `toast`
  z akcją (`UNDO_MIN_MS`) i `undoKept`; zmiany pól pieniędzy wielu operacji tylko przez `bulkPlan` / `applyBulk` /
  `bulkPreview` (`operations/bulkModel.ts`, `bulkPreview.ts`).
- Zapamiętywane wybory widoku (zakładka Wywiadu, Ustawień) – jak dotąd zapamiętywane wybory w `store/machine.ts`
  (`prefs`) albo `localStorage` z `try/catch` – według istniejącego wzorca w pobliżu.

### Kontrakt kroków
- **Z1:** `applyTitleRule` (`operations/titleRules.ts:97`) – zapis reguły jak dotąd; zmiana historii: `updateHistory`
  domyślnie `false` (`TitleRuleAction.tsx:79`); po zaznaczeniu – nowy wariant `BulkChange` („reguła tytułu”: rodzaj,
  znak, kategoria, finansujący) w `bulkModel.ts`, podgląd `bulkPreview` i `applyBulk` (pytanie o potwierdzone saldo,
  „Cofnij” = `undoKept`); cofnięcie reguły razem z cofnięciem zmian. Błąd `res.error` przy polu w oknie. Słowo
  początkowe – najdłuższy wyraz tytułu (≥ 3 litery), nie cały tytuł. UX-24: `rememberCategory` (`import/rules.ts:69`)
  i „Dodaj” w `KeywordRules` – toast z „Cofnij” (przywraca `rules` sprzed).
- **Z2:** `applyProposals` (`month/MonthPage.tsx:178`) – „Cofnij” przywraca koperty sprzed (wzór `copyOnward`,
  `month/actions.ts:179`); `decideLoot` (`month/actions.ts:106`) – przed zatwierdzeniem jedna linia podsumowania
  (ile do celów, na następny miesiąc, do osłon – z liczb, które ekran już ma), po – „Cofnij” (przywraca rekord miesiąca
  sprzed, `undoKept`); `skipEntry` (`dock/actions.ts:184`) – toast „Cofnij” (`skipEntry(id, false)`), przycisk w stopce
  `DockingDialog` po lewej, z dala od „Anuluj”; kreator domownicy (`wizard/WizardPage.tsx:626,639`) – gdy jedno pole
  > 0, drugie wyłączone z dymkiem „albo ma oddać, albo zaliczka”.
- **Z3:** UX-3 Enter na `BUTTON` / `SELECT` / `A` nie zapisuje (`QuickApp.tsx:577`); UX-10 `toast` – domyślny czas
  wg rodzaju (błąd 8 s, reszta 4 s + 40 ms na znak powyżej 60, maks. 12 s), pauza pod myszą, klik w tekst zamyka; UX-11
  Ctrl+K / Ctrl+cyfra / Ctrl+Shift+Y / M / Ctrl+, nie działają przy otwartym `[role="dialog"]` (jak Ctrl+N,
  `App.tsx:99`); UX-12 `navigate` pomija identyczną trasę, „dalej” (stos `forward`), Alt+← / Alt+→, przycisk myszy 4;
  UX-18 baner „tylko do odczytu” z akcją „Aktualizacje”, gdy powód to nowsza wersja; UX-20 `ErrorBoundary` –
  `plainError`, „Spróbuj ponownie”, „Folder logów”, bez pętli na Mostku; UX-21 `Celebration` w `useFocusTrap`, klawisze
  tylko z fokusem w oknie; UX-22 `ConfirmButton` rozbraja się na blur i po 10 s; UX-43 (D106 pkt 10) dolne pozycje menu
  bez podpisu skrótu (skrót w `title`); UX-53 / UX-63 jeden `shortcutLabel` (format „Ctrl+Shift+4”), F1: grupa „Panele”
  (zwiń – dwuklik tytułu, ukryj, przywróć w „Układ”, odłącz – Mostek) i „Szybki wpis” (Enter, Ctrl+Enter, Esc, Alt+P / I),
  Ctrl+$ opisany jako „Ctrl+Shift+4 ($)”; UX-78 paleta – sekcja „Ostatnio” (5, `localStorage`), akcje „Zakończ
  aplikację”, „Wyczyść filtry Operacji”; UX-83 ścieżka folderu w `PageBar` klikalna (Eksplorator).
- **Z4:** UX-14 pusty wynik z przyciskami „Poprzedni miesiąc”, „Cała historia”, „Wyczyść filtry”; UX-15 po nadaniu
  kategorii w filtrze „bez kategorii” wybór przechodzi na następny wiersz, toast „zostało N”; UX-16 natywne pola dat
  w pasku okresu (`OperationsPage.tsx:85,94`) i termin nowego celu (`StarMapPage.tsx:581`) → `DateField` / `MonthField`;
  UX-71 wiersz z fokusem (wędrujący `tabIndex`), Enter → fokus w edytorze (Kwota), Delete → usunięcie z „Cofnij” (to samo
  działanie co menu), Shift+F10 / klawisz menu → menu PPM, checkboxy wierszy `tabIndex=-1`; UX-73 Ctrl+Enter w edytorze
  = zatwierdź pola i nowy szkic (`newOperation`); UX-77 (D106 pkt 8) bez wybranej operacji edytor schowany, lista na
  całą szerokość; przycisk układu zostaje.
- **Z5:** (D106 pkt 6) zakładki Wywiadu: Struktura (krzywa majątku, bilans paliwa, osłony i kadłub) / Wydatki (FVG,
  porównanie, wydatki w czasie, namierzone cele, Killzones) / Prognozy (zasięg, kurs, wieloletnia, symulator) /
  Dziennik; pamięć zakładki; przełącznik 3 / 6 / 12 mies. tylko na zakładkach, które go czytają, z podpisem;
  UX-13 nazwa kursu w nagłówkach; UX-17 symulator na `useDraft`, termin `MonthField`; UX-42 legendy (krzywa majątku,
  drawdown, Killzones – wzór `Forecast.tsx:416`); UX-55 daty wpisów dziennika z rokiem; UX-74 wiersze Bilansu paliwa,
  Porównania i komórki Killzone → Operacje z filtrem (wzór `Drill.tsx:27-38`); UX-80 `useMemo` dla `debriefing` /
  `rangeForecast` (`IntelPage.tsx:108-110`).
- **Z6:** (D106 pkt 4, 5, 2) Odprawa (`calc/briefing.ts`) i Radar – terminy jednego kontenera jedną linią („Czynsz:
  4 terminy bez płatności (sie–lis)”), z `feeDuesOf` / `CargoStatus.carried` – bez własnej reguły terminów (silnik.md);
  Meldunki (`calc/inbox.ts`) – meldunek „Zaległe opłaty” po kontenerze z akcjami „Pokaż w Ładowni” i „Zapłacone poza
  budżetem” (istniejące działanie Ładowni); Odprawa – licznik „N meldunków ›”; UX-32 pasek miesiąca nad Odprawą
  („wydano X z Y · dzień N z M · dziś A / przydział B”, klik → Operacje z filtrem miesiąca); UX-33 wiersz Stanu
  „Energia miesiąca”; UX-34 `EnvelopeBars` – etykieta tylko ponad tempem („+X zł ponad tempo”, dymek z Premium), klik
  w kopertę → Operacje z filtrem kategoria + miesiąc (`showFilter`, `BridgePage.tsx:391`); UX-66 krzywa majątku Mostka
  z dopiskiem bazy; UX-76 puste panele chowane same; UX-4 klasy paska wieczornego (`border-line bg-hover`, także
  `TitleRuleAction.tsx:204`); UX-5 pasek wieczorny także nad Odprawą.
- **Z7:** (D106 pkt 9) `CategorySelect` (`operations/pickers.tsx:60`) → pole z szukaniem po fragmencie (bez polskich
  znaków), sekcja „Ostatnie” (5 ostatnio użytych z operacji) i strzałki / Enter; ten sam komponent w edytorze, szybkim
  wpisie (`QuickApp.tsx:1111`) i pasku / menu zbiorczym; kontrahent – podpowiedzi z historii (najczęstsze pasujące,
  strzałki, wybór podstawia kategorię, gdy pusta); `MemberPickers.tsx:66-82` etykiety „kupione dla: X (odda)”, „prezent
  dla: X” (także pasek zbiorczy i menu – `OperationsPage.tsx:420`, `operationsMenuModel.ts:142`); jeden „Podziel…”
  (`OperationEditor.tsx:360,435`) z wyborem „na kategorie” / „na osoby” – te same działania co dziś.
- **Z8:** UX-39 przyklejony pasek na dole importu: „Importuj (N) · bez decyzji: X”; przed importem „X wejdzie bez
  kategorii · Pokaż”; po imporcie link „Skategoryzuj pozostałe” (filtr „bez kategorii” w Operacjach); UX-38 linia
  wstępu „temat / marka”, „jak temat” → „cofnij do decyzji tematu” (to nie zmiana słownika), etykieta „połącz” przy
  checkboxie dopasowań; UX-62 ta sama linia wyjaśnienia przy „zapamiętaj” w Imporcie i pasku zbiorczym (domyślne
  wartości bez zmian); UX-23 „Zamknij plik i scal”; UX-85 toast eksportu z „Pokaż w folderze”, opis, że ZIP to całość.
- **Z9:** (D106 pkt 7) nawigacja Ustawień w grupach, panele przeniesione jak w D106 (bez zmiany ich działania), pamięć
  zakładki (Ctrl+, otwiera ostatnią); powiadomienia w grupach, „włącz / wyłącz wszystkie”, „włączone N z M”, godziny
  ciszy z linkiem; UX-46 Synchronizacja – konflikty i problemy na górze, link „Tryb: …” do ustawienia; UX-47
  `defaultDataDir` (`main/index.ts:206`) zwraca też `exists` (jest `fi.json`) – przycisk „Otwórz dane z OneDrive
  (znalezione)”, bez – jak dziś; UX-19 brakujące pozycje indeksu `SETTINGS_ITEMS` (`CommandPalette.tsx:38`); UX-67
  numery wersji w tekstach UI → opis, test `ui-no-codes` łapie „1.2.3” w tekście; UX-68 zdanie „Zmiany zapisują się
  od razu” w nagłówku Ustawień.
- **Z10:** UX-35 nagłówki kolumn listy Radaru i Ładowni (bez zmiany nazw), kwota „/mies.” w Ładowni bez łamania na
  3 linie; UX-74 wiersz osi Radaru → kontener / pożyczka / boja (`navigate` + `focus`, wzór `useFocusRecord`); UX-75
  „Nowa pożyczka”, „Nowa boja”, „Nowy cel” za przyciskiem „+ …” (szkic formularza zostaje w `useDraft`); UX-81
  propozycje Ładowni z ptaszkami i „Dodaj zaznaczone (N)” z „Cofnij” (te same pola co „Do ładowni”).
- **Z11:** UX-48 Plan miesiąca – pasek „Na początek miesiąca” (debriefing → łupy → pensja i koperty → dokowanie, ze
  stanem każdego kroku, do 7. dnia), baner „Ten miesiąc korzysta z planu {miesiąc}”; UX-49 kreator – znak „!” przy
  kroku z brakami (`finishBlockers`), „Zaznacz stałe płatności”, pola godzin ciszy, stan pusty kont; UX-51 Dowództwo –
  pasek „Dziś: … · seria N · misja …” na górze; UX-52 Dokowanie – jedna linia skutku („osłony X → Y, kadłub A → B”,
  z podglądu silnika `DockingDialog.tsx:75-80`), ostrzeżenia zwinięte; UX-54 jedno zdanie skutku zamrożenia; UX-55
  daty z rokiem w Dowództwie, „tydzień 47”.
- **Z12:** (D106 pkt 11) w nowym pustym folderze (`!budget.start`) kreator otwiera się sam raz; na pierwszym kroku
  wybór „Szybki start” – salda kont, pensja, koperty codzienne; reszta z wartości domyślnych kreatora; zapis tą samą
  ścieżką co „Uruchom budżet” (`writeStart`, T446 – najpierw `fi.json` z `budget.start`, potem salda, plan) – bez
  własnej.
- **Z13:** (D106 pkt 11) ekran (albo panel w Radarze → Należności, decyzja wykonawcy z uzasadnieniem) „Rozliczenia”:
  per domownik saldo (ma oddać / zaliczka – `balanceText`), lista otwartych zakupów, akcje „Oddał(a) gotówką…”
  (nowa operacja wpływu domownika – edytor ze szkicem, nie własny zapis), „Przypisz zwrot”, „Pokaż w Operacjach”;
  liczby wyłącznie z istniejących funkcji `calc/household.ts` / `repayments.ts` – bez zmian w `calc/`.

## Otwarte
- **Odbiór zbiorczy 1.15.5–1.19.1:** maszyna wirtualna przez Cowork (48 punktów, `docs/audyt/maszyna.md`, wynik →
  `docs/audyt/raport/maszyna.md`) i sesje „Ty” (`docs/audyt/ty.md`); opisy punktów w `docs/audyt/punkty/`. Warianty
  „do potwierdzenia” z ciągów zaakceptowane 05.11.2026 – tabela w archiwum (Grep „Do potwierdzenia”).
- **Rzeczy otwarte z grup** (archiwum, punkty „Otwarte” N1–R2): podpowiedź oprocentowania, pomiar Workera w maszynie
  (IM.55), niestabilny `ap20.spec.ts:53`.
- **Porządek lokalny** (Sonnet 5.5 · medium, ok. 0,25 h): drzewa `C:\CC-Projekty\FI-wt\*` (gałęzie scalone, bez zmian) do
  usunięcia – najpierw łącza `node_modules` / `.tools` (`[System.IO.Directory]::Delete(<łącze>, $false)`), potem
  `git worktree remove`; scalone gałęzie `claude/1.15.*`–`1.17.*`; `git pull` w `C:\CC-Projekty\FinancialIntel`.
- **Testy tylko lokalnie czerwone (15.11, CI zielone):** `tests/fs/bank-files.test.ts` (2) w głównym folderze repo
  (w świeżym drzewie 4/4 – przyczyna nieznana) i `ictj.spec.ts:172` (ICTTJ zainstalowany na tym komputerze).
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
