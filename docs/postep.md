# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary: do 1.15.4 –
`docs/archiwum/postep-do-1.15.md`, audyt 1.15.4 i grupy po nim – `docs/archiwum/postep-od-1.15.4.md` (Grep po wersji,
grupie albo identyfikatorze). Po wydaniu wpisy grupy przenoś do archiwum – tutaj zostaje stan (≤ 20 KB, sprawdza CI – D103).
Odwołania „`docs/postep.md` „…”” w starszych dokumentach i komentarzach (sekcje do 1.15.1 i audyt) prowadzą do archiwum.

**Stan (15.11.2026):** **1.20.0 wydane** (15.11.2026, PR #68 – zmiany grupowe na liście Operacji: zaznaczanie
Ctrl / Shift, menu pod prawym przyciskiem, nowe zmiany zbiorcze; wykonawcy z `.claude/agents/` i jedno CI na grupę – D104,
D105, T531–T534). Wpis grupy z „Uwagami na później” – archiwum `postep-od-1.15.4.md` (Grep „Grupa 1.20.0”).
**W toku (od 21.11.2026): grupa 1.21.0 „Ergonomia”** (D106, przegląd `docs/przeglad-ux.md`) – jednym ciągiem na komendę
użytkownika, gałąź `claude/gallant-wright-g8snx6`, jedno wydanie na końcu. **Przeniesione 21.11 z sesji w chmurze do
lokalnej:** scalone Z0–Z11 i Z13 (bez Radaru z Z6); zostały Z6b, Z12, Z14 – sekcja grupy niżej („Kontrakt kroków”,
„Do Z14”). Drzewa wykonawców z chmury przepadły (nic niescalonego poza przerwanymi Z6b i Z12, które idą od nowa).

## Grupa 1.21.0 – ergonomia (D106, T535–T546)

Sesja główna Opus 5.5 · high; wykonawcy z `.claude/agents/` w drzewach (`isolation: worktree`; łącze `node_modules`
do głównego repozytorium – w Windows junction przez PowerShell, skill `etap` „Pułapki”). Wykonawca nie commituje – sesja główna przegląda diff, commituje w drzewie i scala
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
| Z6 | Mostek i Meldunki (UX-4, 5, 30, 31, 32, 33, 34, 66, 74 koperty, 76) | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 45–75 min | ✅ 21.11 (bez Radaru) |
| Z6b | Zaległe opłaty po kontenerze w Radarze (reszta UX-30) | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 15–25 min | |
| Z7 | Edytor: kategoria z szukaniem, kontrahent z historii, etykiety finansowania, „Podziel…” (UX-36, 37, 70, 72) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 45–60 min | ✅ 21.11 |
| Z8 | Import i eksport (UX-23, 38, 39, 62, 85) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 30–45 min | ✅ 21.11 |
| Z9 | Ustawienia, Synchronizacja, pierwszy start (UX-19, 44, 45, 46, 47, 67, 68, 78 ustawienia) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 45–60 min | ✅ 21.11 |
| Z10 | Radar, Mapa, Ładownia (UX-35, 69 bez słownika – tylko nagłówki, 74 Radar, 75, 81) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min | ✅ 21.11 |
| Z11 | Plan miesiąca, Dowództwo, Dokowanie, kreator (UX-48, 49, 51, 52, 54, 55 Dowództwo) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min | ✅ 21.11 |
| Z12 | Szybki start kreatora (UX-79) | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 45–75 min | |
| Z13 | Ekran rozliczeń z domownikami (UX-82) | `wykonawca-opus` · xhigh (bez zmian w `calc/`; gdyby trzeba – stop i max) | Opus 5.5 · xhigh | 60–90 min | ✅ 21.11 |
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
Kontrakty kroków zrobionych (Z1–Z11, Z13) – w historii: `git show d588d3f:docs/postep.md`. Raporty wykonawców
streszczone w commitach kroków (`git log --oneline d588d3f..`).
- **Z6b (otwarte):** grupowanie zaległych terminów jednego kontenera w Radarze (lista „Na radarze”) tą samą regułą co
  Odprawa – `lateFees` / `lateFeeText` (`src/shared/calc/briefing.ts`, dodane w Z6); bez nowej reguły terminów;
  `features/radar/RadarPage.tsx` (i ewentualnie `calc/radar.ts` – tylko prezentacja); kalendarz Radaru bez zmian; test
  unit + `radar.spec`, `radar-calendar.spec`. `wykonawca-opus` · xhigh. Przerwana w chmurze próba – nic nie zostało.
- **Z12 (otwarte, od nowa – przerwane w chmurze):** (D106 pkt 11) w nowym pustym folderze (`!budget.start`) kreator otwiera się sam raz; na pierwszym kroku
  wybór „Szybki start” – salda kont, pensja, koperty codzienne; reszta z wartości domyślnych kreatora; zapis tą samą
  ścieżką co „Uruchom budżet” (`writeStart`, T446 – najpierw `fi.json` z `budget.start`, potem salda, plan) – bez
  własnej.
  E2E: pusty folder → kreator sam → „Szybki start” → Mostek; drugie uruchomienie bez kreatora; poprawić E2E, które
  zakładają Mostek zaraz po utworzeniu folderu.

### Do Z14 (zebrane z raportów wykonawców)
- **E2E padające po scaleniu** (przerwany przebieg 100/161, 21.11): `import.spec.ts:23` – dwa toasty „Cofnij” naraz
  (Z1 dodał „Cofnij” do „Zapamiętaj”) → zawęzić lokator do toastu po tekście; `notes.spec.ts:17` – `toEqual` (podział
  paragonu za „Podziel…” z Z7 albo schowany edytor z Z4). Reszty (61 plików) nie uruchomiono; E2E telefonu
  (`npm run test:e2e:mobile`) – Z1, Z7, Z10, Z13 zmieniły ekrany używane na telefonie (`phone-ib`, `phone-ic`).
- `tests/unit/ui-no-codes.test.ts` – lista `VERSION_PENDING` (numery wersji w tekstach UI poza plikami Z9: `ImportPage`,
  `RulesAudit`, `InboxPage`, `TransferPairs`, `OperationEditor`, `calc/inbox.ts`, `merge.ts:221`) – przepisać teksty
  i wyczyścić listę.
- `.claude/rules/ui.md`: skróty (Alt+← / →, Ctrl+Shift+4, `components/shortcuts.ts` jedyne źródło formatu), toasty
  (`toastMs`, pauza pod myszą, `ms` = minimum), grupy Ustawień (`settingsNav.ts`, pamięć `fi.settings.tab`), zakładki
  Wywiadu (`intel/tabs.ts`, `fi.intel.tab`), wpływ domownika z ekranu = szkic `newOperation` (Z13), `CategoryField` /
  `CounterpartyField` (Z7). T535–T547 do `docs/decyzje-techniczne.md` (zwięźle, z propozycji w commitach kroków).
- Do potwierdzenia przez użytkownika (przyjęte jako T): panel Rozliczeń na Mostku i w Radarze znika, gdy nie ma sald ani
  osób poza „Dom”; pasek miesiąca na Mostku liczy „wydano X z Y” z kopert codziennych; krok „Pensja i koperty” przy planie
  odziedziczonym = zrobione.
- Uwagi na później: toasty „Finansuje X” / „Prezent od: X” (stare słowa w komunikatach, nowe w etykietach – Z7); szukanie
  kategorii w menu PPM i „Podziel…” w szybkim wpisie; `DateField` bez `allowEmpty` (lokalny `RangeDay` w Operacjach);
  `MonthField` pokazuje „RRRR-MM”; Killzones bez filtra godziny w Operacjach; ptaszki propozycji Ładowni nie są szkicem;
  toast `settleDue` mówi o ostatnim terminie; skrypty `tests/audyt/*` (poza CI) odwołują się do starych miejsc
  (formularze Radaru, zakładki Wywiadu, Ustawienia, `selectOption` kategorii, `radar-member-open`).

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
