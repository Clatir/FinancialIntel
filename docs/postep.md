# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary: do 1.15.4 –
`docs/archiwum/postep-do-1.15.md`, audyt 1.15.4 i grupy po nim – `docs/archiwum/postep-od-1.15.4.md` (Grep po wersji,
grupie albo identyfikatorze). Po wydaniu wpisy grupy przenoś do archiwum – tutaj zostaje stan (≤ 400 linii, sprawdza CI).
Odwołania „`docs/postep.md` „…”” w starszych dokumentach i komentarzach (sekcje do 1.15.1 i audyt) prowadzą do archiwum.

**Stan:** **1.19.1 gotowe do wydania** – Sankey („Skąd i dokąd”): kroki 1, 2 i 3 zakończone (07.11.2026).
**1.19.0 wydane** (07.11.2026). Ciąg N1–R2 (D101, 1.15.5–1.17.0, PR #50–#56) oraz ciąg G0–GD (1.17.1–1.18.1, PR #58–#60) zakończone jednym ciągiem bez przerw.
**Gotowe do odbioru zbiorczego:**
- Wersje 1.17.1 (GA – silnik i dane), 1.18.0 (GB – reguły, schemat, import), 1.18.1 (GC – interfejs, telefon, eksport) scalone do `main`.
- Pakiet odbioru GD przygotowany: tabela „Do potwierdzenia” uzupełniona o decyzje GA, GB i GC; lista „Tylko Ty” (`docs/audyt/ty.md`) i instrukcja maszyny wirtualnej (`docs/audyt/maszyna.md`) zaktualizowane.
Otwarte poza ciągiem: odbiór w maszynie wirtualnej przez Cowork (48 punktów) oraz sesje Ty (`docs/audyt/ty.md`); iPhone (iD, iE) wstrzymany (D98). Odrzucone (D88): F32, F38, F39, F41, F43.

## Do zrobienia – Sankey („Skąd i dokąd”): kontekst miesiąca i składniki przychodów (07.11.2026)

**Kontekst dochodzenia (07.11.2026):**
Wykres Sankeya w `Plan miesiąca` (`MonthPage.tsx`) oraz w `Raporty → Debriefing` (`ReportsPage.tsx`) korzysta z tej samej funkcji `monthFlows` (`src/shared/calc/sankey.ts`) i `fuelSummary` (`src/shared/calc/fuel.ts` → `incomeParts` w `src/shared/calc/income.ts`). Pozorna różnica wartości „Przychody z pracy” wynikała z tego, że:
1. `Plan miesiąca` domyślnie otwiera miesiąc **bieżący** (`current = today.slice(0, 7)`),
2. `Raporty → Debriefing` domyślnie otwiera miesiąc **poprzedni** (`months[1] ?? months[0]`),
3. Nagłówek wykresu (`Skąd i dokąd`) nie wyświetla nazwy aktywnego miesiąca, przez co po przewinięciu strony nie widać, którego okresu dotyczą kwoty.

| Krok | Co obejmuje | Pliki | Model i thinking | Szacunek | Stan |
| --- | --- | --- | --- | --- | --- |
| 1 | **Nagłówek wykresu z nazwą miesiąca (UX):** przekazanie `month` (lub sformatowanej etykiety `monthLabel(month)`) do `MonthSankey` / nagłówka panelu, aby wyraźnie pokazywał analizowany miesiąc (np. `Skąd i dokąd – Październik 2026` / `Skąd i dokąd – Listopad 2026`) zarówno w Planie miesiąca, jak i w Debriefingu | `src/renderer/features/reports/MonthSankey.tsx`, `src/renderer/features/month/MonthPage.tsx`, `src/renderer/features/reports/ReportsPage.tsx`, `tests/e2e/r2-sankey.spec.ts` | Gemini 3.8 Flash · Medium (lub Gemini 4 Argon · Medium) | 0,15 h | ✅ (07.11, ok. 0,1 h) |
| 2 | **Tooltip ze składnikami „Przychodów z pracy”:** rozbudowa węzła `work` (`Przychody z pracy`) w `monthFlows` o pole `detail` zawierające listę transakcji tworzących przychód z pracy danego miesiąca (z ich kwotą `incomeParts(t, ctx).work` i tytułem/kontrahentem), analogicznie do węzłów `Pozostałe` i `Zwroty ponad zakupy` + test jednostkowy | `src/shared/calc/sankey.ts`, `src/renderer/features/reports/MonthSankey.tsx`, `tests/unit/sankey-ap46.test.ts` | Gemini 4 Argon · Medium (lub Claude Sonnet 5.5 · Medium) | 0,25 h | ✅ (07.11, ok. 0,1 h) |
| 3 | **Spójność / synchronizacja wybranego miesiąca (opcjonalnie):** czytelne oznaczenie przy selektorze Debriefingu, gdy wyświetla miesiąc poprzedni vs bieżący, lub opcjonalne współdzielenie wybranego miesiąca w obrębie sesji (z zachowaniem kompatybilności testów E2E oczekujących `months[1]` na starcie Debriefingu) | `src/renderer/features/reports/ReportsPage.tsx`, `src/renderer/features/reports/state.ts`, `tests/e2e/r2-sankey.spec.ts` | Gemini 4 Argon · Medium / High | 0,25 h | ✅ (07.11, ok. 0,1 h) |
| **Razem** | Rekomendacja na jedno konwo (kroki 1–3 ciągiem): **Gemini 4 Argon · Medium** | | | **ok. 0,5–0,65 h** | ✅ (07.11, ok. 0,3 h) |

**Krok 1 – wynik.** Nagłówek wykresu Sankeya z nazwą miesiąca (`MonthSankey.tsx`, `MonthPage.tsx`, `ReportsPage.tsx`, testy `gc-ui-fixes.test.ts` i `r2-sankey.spec.ts`):
- `MonthSankey` przyjmuje opcjonalny prop `month?: string` i wyświetla w nagłówku wykresu `Skąd i dokąd – ${monthLabel(month)}` (lub `Skąd i dokąd`, jeśli brak miesiąca) z atrybutem `data-testid="reports-sankey-title"`.
- `MonthPage` przekazuje aktywny `month` do `MonthSankey` oraz w tytule panelu `Przepływ miesiąca – ${monthLabel(month)} (Sankey)`.
- `ReportsPage` (Debriefing) przekazuje aktywny `month` z selektora do `MonthSankey`.
- Testy: test jednostkowy w `tests/unit/gc-ui-fixes.test.ts` oraz asercje E2E w `tests/e2e/r2-sankey.spec.ts` dla Debriefingu i Planu miesiąca; typecheck i testy jednostkowe zielone.

**Krok 2 – wynik.** Tooltip ze składnikami „Przychodów z pracy” (`src/shared/calc/sankey.ts`, `src/renderer/features/reports/MonthSankey.tsx`, `tests/unit/sankey-ap46.test.ts`):
- `outsideMoney` zbiera w `workDetail` operacje tworzące przychód z pracy danego miesiąca (`incomeParts(t, ctx).work > 0` – zarówno wpływy `income`, jak i odsetki ponad spłacony dług pożyczki udzielonej `loan`, T70) w formacie `${kontrahent / tytuł} · ${formatPln(work)} zł`, a `monthFlows` przypisuje `detail: o.workDetail` do węzła `work` (`Przychody z pracy`).
- `MonthSankey` maskuje kwoty w `tip.detail` (`AMOUNT_MASK`) przy ukrytych kwotach (`Ctrl+$`).
- Testy: test jednostkowy w `tests/unit/sankey-ap46.test.ts` (wpływ z kontrahentem, kontrahentem i tytułem, samym tytułem, nadwyżka wpłaty domownika oraz odsetki spłaty pożyczki) i asercje E2E w `tests/e2e/r2-sankey.spec.ts`.

**Krok 3 – wynik.** Czytelne oznaczenie wybranego miesiąca i pamięć sesji w Debriefingu (`src/renderer/features/reports/state.ts`, `src/renderer/features/reports/ReportsPage.tsx`, `tests/unit/gc-ui-fixes.test.ts`, `tests/e2e/r2-sankey.spec.ts`):
- `useReportsUi` przechowuje wybór miesiąca Debriefingu w obrębie sesji (`debrief: DebriefChoice | null`, `setDebriefMonth`, `debriefMonthOf`) z zachowaniem domyślnego `months[1] ?? months[0]` na starcie oraz wygaszaniem wyboru po zmianie bieżącego miesiąca.
- Obok selektora `reports-debrief-month` wyświetlana jest czytelna adnotacja `data-testid="reports-debrief-month-note"` (`ostatni zamknięty miesiąc` / `miesiąc bieżący (w toku – do dziś)` / `miesiąc zamknięty`) oraz szybkie przyciski przełączania `bieżący` (`reports-debrief-current`) i `ostatni zamknięty` (`reports-debrief-last-closed`).
- Testy: test jednostkowy w `tests/unit/gc-ui-fixes.test.ts` oraz asercje E2E w `tests/e2e/r2-sankey.spec.ts`.

## Grupa 1.19.0 – nadwyżka przelewu za kilku domowników (D102) – stan (06.11.2026)

Gałąź `claude/1.19.0-nadwyzka`. Kolejność kroków na prośbę użytkownika – kroki z Opus max na końcu: blok I (0 → 2 → 4),
blok II (1 → 3), blok III (6). Model zmieniany tylko między blokami, z `/clear`.

| Blok | Krok | Co obejmuje | Model i thinking (z górką) | Szacunek | Stan |
| --- | --- | --- | --- | --- | --- |
| I | 0 | Gałąź, testy kontraktu i luk | Opus 5.5 · high (min. medium) | 0,25–0,5 h | ✅ (06.11, ok. 0,5 h) |
| I | 2 | Edytor: panel „Nadwyżka” (osoba, kwota, „jako”: przychód / zaliczka / spłata pożyczki), domyślnie nadawca według jego ustawienia („pytaj” pyta), „po równo” i „proporcjonalnie do długów”; wspólna funkcja podziału `features/household/surplus.ts` | Opus 5.5 · xhigh (min. high) | 0,5–0,75 h | ✅ (06.11, ok. 0,5 h) |
| I | 4 | Szybki wpis: „W tym za” z celem i nadwyżką, ta sama funkcja | Opus 5.5 · high (min. medium) | 0,25–0,5 h | ✅ (06.11, ok. 0,5 h) |
| II | 1 | Silnik: funkcja podziału do `calc/household.ts`, testy z przykładami, edytor i szybki wpis na niej | Opus 5.5 · max (min. xhigh) | 0,5–1 h | ✅ (07.11, ok. 0,25 h) |
| II | 3 | Import: cel przy „w tym za”, nadwyżka w wierszu / grupie / temacie, „pytaj” części pyta; reguły pamiętają, kogo spłacają i jak dzielić górkę (bez stałych kwot, „najpierw dług” zawsze) | Opus 5.5 · max (min. xhigh) | 1,5–2 h | ✅ (07.11, ok. 0,5 h) |
| III | 6 | E2E, `/code-review`, CHANGELOG, D102 / T519+, rules, PR, CI, wydanie 1.19.0 | Sonnet 5.5 + Opus 5.5 · xhigh | 0,5–0,75 h | ✅ (07.11, ok. 0,5 h) |

**Decyzje użytkownika (06.11.2026, do zapisania jako D102 w kroku 6):** górka domyślnie nadawcy, według jego ustawienia
(„pytaj” naprawdę pyta), z przyciskami „po równo” i „proporcjonalnie do długów”; „spłata innej pożyczki” = tylko pożyczka
udzielona z Radaru (D100), bez długów między domownikami; reguły importu pamiętają podział (kogo spłaca, jak dzielić
górkę – bez stałych kwot poza częścią pożyczki, „najpierw dług” zawsze); poprawiane wszystkie trzy miejsca (import,
edytor, szybki wpis).

**Krok 0 – wynik.** Format zapisu bez zmian: górka to linie `splits` (część osoby = dług + jej część nadwyżki z `advance`
albo osobna linia z `inflowKind`; pożyczka – linia `loanId`). Testy:
- `tests/unit/surplus-baseline.test.ts` (5, przechodzą) – kontrakt: księga i silnik liczą taki zapis dobrze (dwie linie
  osoby w dowolnej kolejności, linia pożyczki, depozyt = suma przy osobach, warstwy = salda).
- `tests/unit/surplus-gaps-store.test.ts` – 3 opisują dziś: import zapisuje nadwyżkę części osoby „pytaj” jako przychód
  bez pytania (**potwierdzony błąd**); linia grupy ucięta do długu (AF-27, zgodnie z zamysłem – górka idzie do nadawcy);
  jawna druga linia „zaliczka” działa. 2 `it.fails` – cel kroku 3 (temat „do zrobienia” przy „pytaj” części) i kroku 4
  (szybki wpis zapisuje `inflowKind` części); w swoim kroku `it.fails` → `it`.
- `tests/e2e/surplus.spec.ts` – cel kroku 2 (panel „Nadwyżka” w edytorze).
- Szybki wpis: „pytaj” pilnowane tylko u nadawcy (`restToChoose`), część „w tym za” bierze `advance` z ustawienia osoby
  (pytaj → przychód bez pytania) – do kroku 4.

**Krok 2 – wynik.** Panel „Nadwyżka” w edytorze operacji (`SurplusPanel.tsx`) podpięty w `MemberPickers.tsx`:
- Czysta funkcja podziału i widoku `src/renderer/features/household/surplus.ts`: `surplusView`, `evenShares`, `debtShares`,
  `fitShares`, `writeSurplus`, `loanPart`.
- Przeliczanie: najpierw pełne spłaty długów (D102), górka dzielona ręcznie, „po równo” lub „proporcjonalnie do długów”.
  Grosze reszty zostają u nadawcy (T3). Nadwyżka osoby może spłacić otwartą pożyczkę z Radaru (D100).
- Zapis do `splits`: linia spłaty długu (`advance: false`) + linia nadwyżki z jawnym `inflowKind` (`income` / `advance`)
  albo pozostawiona na linii spłaty dla domownika z ustawieniem „pytaj” (do momentu wyboru traktowana jako przychód).
- Testy: `tests/unit/surplus-split.test.ts` (19 testów jednostkowych podziału i zapisu – przechodzą), `tests/e2e/surplus.spec.ts`
  (przejście z `test.fail` do `test` – zielone E2E z zapisem i weryfikacją w plikach JSON).

**Krok 4 – wynik.** Szybki wpis („W tym za” – `QuickApp.tsx` i `quickHost.ts`):
- Obsługa celu nadwyżki (`inflowKind`: `income` / `advance`) dla domowników w „W tym za” z blokadą zapisu i komunikatem, gdy domownik ma ustawienie „pytaj” (`m.inflow === 'ask'`) a cel nie został wybrany.
- Przyciski „po równo” i „proporcjonalnie do długów” korzystające ze wspólnych czystych funkcji `features/household/surplus.ts` (`evenShares`, `debtShares`, `surplusView`).
- Podgląd wpisu (`preview`) ostrzega przed niezdefiniowanym celem nadwyżki (`przychód czy zaliczka? Wybierz wyżej.`) i wskazuje wybrany cel.
- `quickTransaction` zachowuje pole `inflowKind` na liniach `splits`, a `quickAdd` wywołuje `rememberInflows` dla domowników z jawnym wyborem (`advanceChosen: true`).
- Testy: `tests/unit/surplus-gaps-store.test.ts` (przekształcenie `it.fails` w przechodzący `it`, testy dla przychodu, fi.json i sumy części > kwoty), nowy test E2E w `tests/e2e/surplus.spec.ts` (weryfikacja blokady, wyboru zaliczki, podziału „po równo” i zapisu w plikach JSON).

**Krok 1 – wynik.** Przeniesienie czystych funkcji podziału nadwyżki do silnika (`src/shared/calc/household.ts` i `src/shared/calc/quick.ts`), usunięcie tymczasowego `src/renderer/features/household/surplus.ts`:
- W `calc/household.ts`: `surplusView`, `sharesOf`, `evenShares`, `debtShares`, `shareMax`, `fitShares`, `writeSurplus`, `loanPart`, `memberPartLines`:
  - T519: domownik bez długu (`owed === 0`) zachowuje `id` i notatkę swojej linii przy przekształceniu w linię nadwyżki oraz przy powrocie do 0 zł.
  - T520: przekazanie nadwyżki osoby na spłatę pożyczki (`loanPart`) przepisuje wyłącznie linie tej osoby, bez cichego podnoszenia zaniżonych części innych osób do ich długu.
  - Zachowanie domyślnego celu `zaliczka` (`defaultAs === 'advance'`) w `surplusView` przy zerowej nadwyżce na linii spłaty (`beyond === 0`).
- W `calc/quick.ts`: `quickShareAs`, `quickSurplusInput`, `quickPartLines` (T521: zachowanie domyślnego ustawienia `zaliczka` domownika w podziale „po równo” / „proporcjonalnie” bez oznaczania go jako ręcznie wybranego `advanceChosen` oraz uwzględnienie wpisanej kwoty spłaty pożyczki w wolnej nadwyżce).
- Edytor (`SurplusPanel.tsx`) i szybki wpis (`QuickApp.tsx`) przepięte na funkcje z `calc/household.ts` i `calc/quick.ts`.
- Testy: `tests/unit/surplus-split.test.ts` (25 testów jednostkowych – przechodzą), pełny zestaw jednostkowy i E2E (`tests/e2e/surplus.spec.ts`) zielone.

**Krok 3 – wynik.** Import CSV (`DecisionFields.tsx`, `state.ts`, `rules.ts`, `options.ts`, `classify.ts`, `reconcile.ts`, `budget.ts`):
- Cel przy „w tym za” (`spłata` / `przychód` / `zaliczka`) i podział nadwyżki (`nadawcy` / `po równo` / `proporcjonalnie do długów`) w wierszu, grupie i temacie importu z użyciem `memberPartLines`, `evenShares` i `debtShares` z `calc/household.ts`.
- T522: nadwyżka części dla domownika z ustawieniem „pytaj” (`inflow === 'ask'`) zatrzymuje temat jako „do zrobienia” (`themeStatus === 'todo'`) i wyświetla szybkie przyciski wyboru (`przychód` / `zaliczka`); wybór zapisuje odpowiedź domownika w `fi.json` przy `runImport()` (`inflowVotes`, `rememberInflows`).
- T523–T524: reguły importu (`ImportRule`) pamiętają listę spłacanych osób (`alsoFor`) oraz sposób podziału nadwyżki (`surplusSplit`: `'even' | 'debts'`) bez stałych kwot PLN („najpierw dług” zawsze – `each: true`), edytowalne także w Ustawienia → Import (`RuleShares`, `ConditionsEditor`, `RulesAudit`) i udokumentowane w `docs/format-folderu.md`.
- T525: rozkład nadwyżki w `rowShares` (`reconcile.ts`) uwzględnia zakupy z tego samego pliku CSV (`owedWithFile`), najpierw spłacając długi nadawcy i osób z `alsoFor`, a dopiero wolną górkę dzieląc po równo lub proporcjonalnie do długów.
- Testy: `tests/unit/surplus-gaps-store.test.ts` (12 testów, w tym `it.fails` kroku 3 przekształcony w przechodzący `it` oraz T522–T525), `tests/e2e/surplus.spec.ts` (3 testy E2E: edytor, szybki wpis, import z nauką reguły – przechodzą), pełny zestaw Vitest (208 plików, 1937 testów) zielony.

**Krok 6 – wynik.** Przegląd `/code-review` całości diffu `main...HEAD`, dokumentacja i wydanie `1.19.0`:
- Poprawki po przeglądzie (T526):
  - `src/renderer/features/import/DecisionFields.tsx` i `src/shared/import/reconcile.ts` przepięte bezpośrednio na `surplusView`, `evenShares`, `debtShares` i `memberPartLines` z `src/shared/calc/household.ts` (usunięcie powielonych wzorów zaokrągleń).
  - Na linii reguły z `each: true` i `surplusSplit` (`'even' | 'debts'`) w `IncomeSharesEditor` pokazywane są przyciski `pytaj: [przychód] [zaliczka]`, gdy wyliczona nadwyżka z reguły > 0; kliknięcie zachowuje `each: true` (`advanceChosen: true`, `ask: undefined`), w `rowShares` tworzy część nadwyżki z `inflowKind: 'income' | 'advance'`, odblokowuje temat (`'done'`) i dopisuje głos w `inflowVotes` (test T526 w `tests/unit/surplus-gaps-store.test.ts`).
  - W `hasUnansweredAskSurplus` (`state.ts`) spłata bez `advanceChosen` porównywana z `owedLeftOfRow` dla danego wiersza zamiast globalnej sumy `view.total > view.owed` (brak fałszywego `'todo'` między niezależnymi tematami).
- Dokumentacja i wersja: `package.json` (`1.19.0`), `CHANGELOG.md` (`## 1.19.0`), `docs/decyzje.md` (`D102`, `T519`–`T526`), `.claude/rules/silnik.md` i `.claude/rules/import.md`.



## Ciąg G0–GD – stan (05.11.2026)

| Grupa | Wersja | Gałąź | Stan | PR | Zakres |
| --- | --- | --- | --- | --- | --- |
| G0 Porządek i triaż | – | – | ✅ wykonane | – | Triaż punktów audytu (SW.26, IM sp. 6–8, IN sp. 1, OP.10, OP.20, OP.42, ME sp. 4, PM sp. 2, AF-54, WY.14); usunięcie 60 lokalnych i 21 zdalnych gałęzi; czyszczenie worktree |
| GA Silnik i dane | 1.17.1 | `claude/1.17.1-silnik-dane` | ✅ wydane | #58 | Terminy naprzód, cena w Ładowni, boja roczna i cele w prognozie, ukryty containerId, wyrocznia T363/T341; pliki tylko do odczytu z przyciskiem odblokowania, bezpieczne Cofnij, duplikaty między kontami, zachowanie „w tym za” (T495–T503) |
| GB Reguły, schemat, import | 1.18.0 | `claude/1.18.0-reguly` | ✅ wydane | #59 | Zachowanie pól reguł `keptField` bez utraty danych, audyt reguły z zamkniętą/usuniętą pożyczką, impliedLoanRate z harmonogramu, rozpoznawanie PIT-38, regex z wiersza z `\d+`, ręczna kolejność reguł warunkowych (T504–T511) |
| GC Interfejs i drobne | 1.18.1 | `claude/1.18.1-interfejs` | ✅ wydane | #60 | Sankey w Planie miesiąca, telefon: nazwa pożyczki i własna godzina odprawy, eksport części pożyczek, edytor operacji bez depozytu na przyszłość, poprawki kontrastu i tagów (T512–T518) |
| GD Pakiet odbioru | – | – | ✅ gotowy | – | Aktualizacja tabeli „Do potwierdzenia”, `docs/postep.md`, `docs/audyt/ty.md`, `docs/audyt/maszyna.md` |

## Ciąg N1–R2 (D101) – stan

Koordynator: sesja główna (Opus 5.5 · xhigh) – „Przed grupą”, zlecenia, `/code-review`, PR, CI, scalenie (D71), wydanie,
wpisy. Wykonawcy: podagenci z modelem i thinking według D96 (tabela prac każdej grupy). Każda grupa: kod z testami, które
bez poprawki padają → pełne testy → `/code-review` (N1, N2 – xhigh, reszta – high) → poprawki → CHANGELOG i wersja → PR →
CI (Linux, Windows) → scalenie → wydanie → wpis tutaj → następna grupa bez pauzy. Po grupach silnika (N2, N3) wyrocznia
(AP-32) na migawkach audytu jako regresja.

| Grupa | Wersja | Gałąź | Stan | PR | Czas faktyczny |
| --- | --- | --- | --- | --- | --- |
| 0 – przygotowanie | – | `claude/audyt-1.15.4` | ✅ D101, porządek tego pliku, PR audytu scalony (bez wydania); poprawka E2E telefonu w nocy | #49 | 0,5 h |
| N1 Dane i import | 1.15.5 | `claude/1.15.5-dane-import` | ✅ wydane 04.11 07:33 (wpis w archiwum `postep-od-1.15.4.md`) | #50 | ok. 5,5 h (01:53–07:33) |
| N2 Silnik pieniędzy | 1.15.6 | `claude/1.15.6-silnik` | ✅ wydane 04.11 13:06 (wpis w archiwum `postep-od-1.15.4.md`) | #51 | ok. 8 h zegara (05:05–13:06) |
| N3 Opłaty, energia, gra | 1.15.7 | `claude/1.15.7-oplaty` | ✅ wydane 04.11 18:02 (wpis w archiwum `postep-od-1.15.4.md`) | #52 | ok. 10,5 h zegara (07:15–18:02, z przerwą 14:00–14:20) |
| N4 Zasady interfejsu | 1.15.8 | `claude/1.15.8-interfejs` | ✅ wydane 04.11 21:40 (wpis w archiwum `postep-od-1.15.4.md`) | #53 | ok. 9 h zegara (12:09–21:40, z przerwą) |
| N5 Ścieżki i ergonomia | 1.15.9 | `claude/1.15.9-sciezki` | ✅ wydane 05.11 02:28 (wpis w archiwum `postep-od-1.15.4.md`) | #54 | ok. 13 h zegara (12:45–02:28, z przerwą) |
| R1 Rozwojowe 1 | 1.16.0 | `claude/1.16.0-rozwojowe` | ✅ wydane 05.11 06:05 (wpis w archiwum `postep-od-1.15.4.md`) | #55 | ok. 4,5 h zegara (01:50–06:30, równolegle z N5) |
| R2 Rozwojowe 2 | 1.17.0 | `claude/1.17.0-rozwojowe` | ✅ scalone 05.11 13:31, wydanie z CI na `main` (wpis w archiwum `postep-od-1.15.4.md`) | #56 | ok. 4 h + 2,5 h zegara (02:40–06:45, 10:50–13:31) |

## Stan ciągu (wznowione 04.11.2026 ok. 14:20 po przerwie na prośbę użytkownika)

Notatki koordynatora poza repozytorium: `C:\CC-Projekty\FI-wt\_notatki\` (`notatki-n1.md` … `notatki-n5.md` – raporty
podagentów, linie CHANGELOG, „do potwierdzenia”, otwarte; `n*-review*.md` – uwagi przeglądów). Drzewa robocze z
`node_modules` / `.tools` jako junction do tego repozytorium – **przed `git worktree remove` usuń same łącza**
(`[System.IO.Directory]::Delete(<łącze>, $false)`; `.claude/rules/testy.md`). Po przerwie: `git worktree list`, ten plik,
notatki, dalej od pierwszej grupy niewydanej.

- **N1–N5, R1, R2** – ✅ wszystkie scalone i wydane (PR #50–#56); wpisy grup w archiwum `postep-od-1.15.4.md`.
- **Drzewa robocze po ciągu** (`git worktree list`): `FI-wt\n4a`, `n5`, `n5b`, `n5d`, `n5e`, `n5f` – gałęzie scalone,
  bez niezapisanych zmian; do usunięcia (najpierw łącza `node_modules` / `.tools`). Lokalny `main` w
  `C:\CC-Projekty\FinancialIntel` – `git pull` przed nową pracą.
- **Node lokalnie:** systemowy 20.12 jest za stary (`check-node.mjs` blokuje `npm test` / `build`) – w sesji dopisz na
  początek `PATH` folder `.tools\node-v24.21.0-win-x64` (typecheck działa i na 20).

**Lekcje z ciągu:** równolegle najwyżej 4–5 podagentów (więcej – zbyt wolne E2E i niestabilności); jeden przegląd xhigh
całości + jeden high na poprawkach, dalej tylko przy poważnych uwagach; numery T przydzielaj podagentom z góry.

### Do Twojej decyzji
- **Rekordy z atrybutem „tylko do odczytu”** – ✅ **Zatwierdzone przez użytkownika 05.11.2026:** wdrożono wariant rekomendowany (wykrywanie przy otwarciu folderu z czytelnym komunikatem i przyciskiem „Zdejmij blokadę” w Synchronizacji / Ustawieniach, T500).

### Do potwierdzenia (zasada wątpliwości, D101 pkt 4)
Zachowanie widoczne dla Ciebie, którego nie rozstrzygały D99 i D100 – ✅ **Wszystkie warianty rekomendowane zaakceptowane przez użytkownika 05.11.2026 („Zgadzam się na wszystko”).** Poniższa tabela stanowi trwały zapis przyjętych ustaleń:

| Grupa | Sprawa | Wybrany wariant | Gdzie |
| --- | --- | --- | --- |
| GC | Sankey Planu miesiąca | wizualizacja przepływu pensji i wpływów na koszty stałe, kontenery i rezerwy; podział części pożyczek w eksporcie; telefon z nazwą pożyczki i czasem odprawy | T512–T518 |
| GB | Ochrona pól reguł i audyt | zachowanie nieznanych pól reguł bez kasowania (`keptField`); audyt reguły oznacza zamknięte/usunięte pożyczki; `impliedLoanRate` z harmonogramu; PIT-38 rozpoznawany po tytule/kontrahencie | T504–T511 |
| GA | Rekordy tylko do odczytu i Cofnij | przycisk „Zdejmij blokadę” w Synchronizacji / Ustawieniach; Cofnij odmawia nadpisania zmienionego wpisu; duplikaty między kontami bez względu na format; zbiorcza decyzja domownika zachowuje shares | T495–T503 |
| R2 | Plan spłaty pożyczek | plan nie chce więcej niż raty harmonogramu + nadpłata; przechodzi tylko rata pożyczki spłaconej wcześniej; lawina bez oprocentowania liczy jak 0 %, kula – najmniejsza „do spłaty” z Radaru; plan od bieżącego miesiąca, miesiąc = 1/12 roku; nadpłata zapisywana jak dotąd w wierszu pożyczki; plan bez końca – „—” zamiast sumy odsetek | T480–T484 |
| R2 | Prognoza wieloletnia | „pensja × wzrost” = wpływy z pracy × wzrost, pensja planu rośnie z inflacją kosztów; domyślne: ostrożny 0 % / 5 %, bazowy 4 % / 3 %, optymistyczny 7 % / 2,5 %, dostawy i jednorazowe 0, od roku 2; jednorazowe – w ostatnim miesiącu roku z osłon × inflacja; siła floty netto odejmuje braki, bez rezerwy PIT-38; domyślnie 5 lat, panel pod kursem | T485–T489 |
| R2 | Kurs i prognoza – pożyczki | przyjęte średnie koszty (historia < 3 mies.) traktowane jak średnia z ratą pożyczki z kontenerem (kurs odejmuje ratę i płaci ją w jej miesiącach); spłata pożyczki udzielonej wraca do osłon bez dokowania (jak silnik, T70) | T486–T488 |
| R2 | Sankey miesiąca | dwa widoki przełącznikiem (domyślnie „Przychód i koszty”); przepływy spoza przychodu i kosztów od źródła prosto do celu, pod własnym nagłówkiem; procent od wszystkich przepływów, „Pozostałe” tylko dla kategorii; miesiąc w toku „Ponad koszty (do dziś)”; długa nazwa ucięta, kwota zawsze cała | T490, T491 |
| R2 | Kwota w walucie | nowa kwota startuje z waluty ostatniej takiej operacji (bez niej EUR); „Zapisz i następny” zostawia walutę rozwiniętą; w eksporcie znak jak kwota w złotych; wyszukiwanie po kodzie i kwocie | T492–T494 |
| R1 | Import CSV innego banku | domyślna nazwa konta „Drugi bank”; kreator proponuje nowe konto, zastąpienie kolumn – potwierdzenie; kolumny zapisane przy „Zapisz”; konto mBanku z mapowaniem zostaje „mBank”; przypomnienia o imporcie i szukanie w Pobranych tylko dla mBanku; „Opis z banku” operacji CSV = cały wiersz pliku; goły „BLIK” na wpływie = przelew od osoby; wpłata we wpłatomacie – przychód do decyzji; panel „Plik z banku” | T460–T462 |
| R1 | Import w Web Workerze | bez pomiaru w maszynie wirtualnej (lokalnie 20 000 wierszy: okno bez odpowiedzi ok. 560 → 200 ms, całość dłużej o ok. 0,3–0,8 s) – pomiar w maszynie (IM.55) do zrobienia | T463–T465 |
| R1 | Reguły z warunkami | „wszystkie” z ≥ 2 warunkami przed regułami marek, jeden warunek i „którykolwiek” po słowach; kierunek tylko w „Dla”; „Tytuł zawiera” – całe słowa, „kontrahent zawiera” – fragment; „Zapamiętaj” zmienia regułę z warunkami, która zdecydowała; wpisy ręczne – tylko wydatki (kategoria, kto płaci); reguła nieczytelna (z nowszej wersji) – tylko „usuń”; starsza wersja reguły z warunkami nie stosuje | T467–T471 |
| R1 | Kalendarz Radaru | domyślnie lista; widok i miesiąc w szkicu okna; dni przyszłych miesięcy bez energii, dni naprzód bieżącego – jedna prognoza „≈”; wydane ponad przydział kolorem akcentu; dni minione z planu w obecnym stanie | T472–T474 |
| R1 | Opis formatu folderu | link do GitHuba (offline się nie otworzy), w Ustawieniach → Folder i kopie zamiast F1 | T475, T476 |
| N5 | Start budżetu (KR.29) | najpierw `fi.json` ze startem, potem salda, plan i kontenery; odmowa – nic w folderze, ponowne kliknięcie od nowa; niedokończony start – baner „Start budżetu niedokończony – Dokończ” (tylko brakujące rekordy, bez „Pomiń”; do tego czasu gra, cele ICTTJ i rozliczenia czekają; per komputer); wolny folder > 15 s – toast i czekanie; osłony poniżej minimum kolorem akcentu | T445, T446 |
| N5 | Autostart i ustawienia komputera | start nigdy nie usuwa wpisu autostartu (wpis z wersji sprzed poprawki albo drugiej kopii przy „wyłączone” zostaje, dopóki nie przełączysz w tej kopii); przełącznik pokazuje prawdziwy wpis z notką; przy zajętym `config.json` przełącznik zostaje w nowym położeniu z komunikatem „działa, zapis ponawia się”; folder ICTTJ, program, token, folder kopii i aktualizacje – „zmiana nie została zapamiętana” | T433, T434 |
| N5 | Konflikty – decyzje | „Zaakceptuj nowsze” według kart; przy nowszej kopii i świeżych zmianach oryginału grupa zostaje dla Ciebie z komunikatem; zachowanie oryginału przy oryginale zmienionym z zewnątrz zatrzymuje go w nowej postaci | T431 |
| N5 | Eksport „Miesiące” | przychody i koszty miesiąca w toku do dziś; kolumny „Zaplanowane koszty” i „Zaplanowane przychody – data po dziś” (w zakończonych 0,00) | T421 |
| N5 | Konto Gotówka | dawne wypłaty z bankomatu (wydatek „Gotówka”) bez konwersji – saldo Gotówki wyrównasz jednym potwierdzeniem salda; reguła „wydatek Gotówka” ustępuje przelewowi, gdy jest konto Gotówka; tag zachowuje pierwszą pisownię jako nazwę; pasek sum Operacji liczy też wiersze z przyszłą datą | T420–T423 |
| N5 | Eksport | „Części” ma wiersz dla każdej operacji (jedna tabela przestawna); daty w Excelu jako rrrr-mm-dd jak w CSV; okres eksportu zapamiętany na tym komputerze; części ponad sumę z resztą 0 zł; odrzucony podział nie jest „niezapisany” przy zamknięciu; „Części – CSV” w pustym okresie – komunikat zamiast pliku | T425–T428 |
| N5 | Nowy komputer i konflikty | lista „Ustaw na tym komputerze” tylko po pierwszym otwarciu wystartowanego budżetu na komputerze bez folderu, do „Gotowe” albo ×; „Zachowaj tę wersję” też odmawia przy zmianie pliku; 15 najnowszych sekcji CHANGELOG w oknie „Co nowego”; słowa „wersja niezachowana”, „pożyczona komuś” | T430–T434 |
| N5 | Konto nowego wpisu | najpierw konto ostatniego wpisu ręcznego w folderze (bez operacji zakładanych przez aplikację), potem wybór tego komputera, potem pierwsze konto | T441 |
| N5 | Dokowanie | wpis z pierwszych dni bez historii banku przed startem nigdy sam nie staje się „Portfel XTB?”; potwierdzenie dopłaty zapisuje rekord dokowania bez wpisu ICTTJ, meldunek 30 dni, naruszenie w grze zostaje, telefon bez meldunku; „dostawa” to tylko wypłata z XTB; para na Portfelu XTB (B69) tylko w „Do zadokowania”, po „Zadokuj” – ostatnią dostawą | T435–T438 |
| N5 | Domownicy | zakup z pieniędzy celu nadal pyta „plan czy impuls?”; edytor Operacji z „pytaj” zapisuje od razu – do wyboru reszta jako przychód; w dzienniku zakup samego domownika nie liczy się wcale | T439 |
| N5 | Szybki wpis i Operacje | Alt+P / Alt+I zamiast „plan / impuls” pod kwotą; edytor wydatku: Data, Konto, Tytuł pod Kategorią; pamiętane tylko „cała historia” i „od – do”; Ctrl+N zostawia wyszukiwanie, inne filtry zdejmuje; czytelna wielkość liter tylko w podpowiedziach i Namierzonych celach; aliasy tylko ręcznie; Wywiad – 12 najnowszych wpisów dziennika | T440–T444 |
| N5 | Kreator | propozycje kopert maleją proporcjonalnie do 10 zł (propozycja pensji D70 bez zmian); podpowiedź kopert codziennych – tylko tekst; opłata sezonowa (ogrzewanie X–IV) nie jest proponowana jako harmonogram; rachunek zmienny tylko co 2 mies.; przed kreatorem w Meldunkach tylko sprawy folderu | T445–T447 |
| N5 | Debriefing i przegląd roczny | przypomnienie roczne osobnym przełącznikiem, domyślnie włączone; tydzień w toku nie do otwarcia przed niedzielą 18:00; debriefing miesiąca w toku bez stopy oszczędności; „Zaplanowane” w przeglądzie rocznym tylko przy miesiącu z historią | T448, T449 |
| N4 | Odmowy i „Cofnij” | zamiana „od” / „do” z komunikatem zamiast odmowy; 0 zł zapisywane z ostrzeżeniem; „Cofnij” najmniej 8 s, licznik długości od 80 %; usunięcie tokenu i przeniesienie do Kosza pytają; przełącznik scenariusza ICTTJ zostaje z banerem | T400–T402 |
| N4 | Odprawa z hierarchią | „sprawy dnia” i najwyżej 8 linii; inne powiadomienia czekają na odprawę do 09:00 (albo jej godziny, najpóźniej 12:00); 3 i więcej naraz = jedno, klik otwiera Mostek; progi gry przeniesione do Ustawień; z ustawioną godziną wcześniejsze otwarcie nie wysyła odprawy, wybór opcji ustawia 07:00 | T405–T409 |
| N4 | Poranny dotyk | okno zostawione na noc przechodzi na Mostek przy pierwszym dotyku po co najmniej 30 min bez dotyku | T411 |
| N4 | Teksty | zoom do siatki 10 %; inflacja i drill bez wymuszonego jednego miejsca po przecinku; cisza nocna „od = do” przyjmowana z komunikatem (wyłączona) | T403, T404 |
| N4 | Szybki wpis – słowa pól | informacja o przyjętej, ale zmienionej wartości dopisana do „Zapisano” (okno czeka 4 s), tylko z tego samego działania | T413, T417 |
| N4 | Nazwy w banku | nazwa, którą import przypisałby innemu domownikowi (także zawierająca jego nazwę – „JAN KOWALSKI SENIOR” przy „JAN KOWALSKI”), nie wraca po „Cofnij” i nie da się jej dopisać (komunikat); „+ domownik” nie pojawia się dla takiej nazwy; najwyżej 20 nazw | T414, T416 |
| N4 | „Cofnij import” i eksport | operacja przywrócona przez cofnięcie i zmieniona przez Ciebie zostaje po „Cofnij”; ponowienie cofniętego importu po późniejszym imporcie odmawiane w całości (nie część wierszy); pusty Excel – „Brak operacji i miesięcy w okresie.” | T412, T415 |
| N4 | Meldunek „Zaliczki przy długu” | „Spłać” / „zostaw” na nieaktualnym meldunku – komunikat „nic do zmiany” | T400 |
| N3 | Opłata zapłacona z celu albo zakupem do zwrotu | zapłacona w Ładowni i silniku – cykl zamknięty, zbiornik nietknięty (zebrane zostaje na następny termin), zwrot domownika to spłata długu; dawny przelew z ukrytym kontenerem nie płaci nigdzie | T393 |
| N3 | Zaległe opłaty | liczone od startu budżetu albo miesiąca dodania kontenera – po aktualizacji stare luki w historii pojawią się od razu („Zapłacone poza budżetem” je czyści); opłata ustawiona jako miesięczna, a płacona co 2 miesiące, pokaże pominięte miesiące; płatność przed dniem następnego terminu idzie najpierw na zaległy | T375, T376 |
| N3 | Boje i pole „Płatność” | boja zamyka się tylko operacją z jej nazwą; pole „Płatność” pokazuje następny termin; silnik trzyma w zbiorniku pieniądze na niezapłacony cykl (tylko notka) | T376, T378 |
| N3 | Energia dziś przy pensji częściowej | dopiski „pensja częściowa”, „bez pensji w tym miesiącu”, „nie więcej niż zostało w miesiącu”; zwrot wcześniejszego zakupu nic nie daje dziś, zwrot tego samego dnia znosi zakup tej samej kategorii głównej (nie sklepu) | T370, T371 |
| N3 | Kadłub od 99 % | „Dopełnij kadłub z osłon” widoczny zawsze, gdy kadłubowi brakuje, a osłony mają nadwyżkę (także w 1 %), bez automatycznego dopełniania; raty celów i dokowanie nadal wymagają 100 % kadłuba; „Pokryj z koperty” domyślnie z koperty z największą rezerwą; linia „firewall wyłączony” na Mostku stale, póki rozkaz wyłączony | T372–T374 |
| N3 | Zamrażanie dni po przerwie | pytanie, gdy import spóźniony > 3 dni (inaczej 7); „Zamroź bez danych” wstrzymuje pytanie do następnego importu, na tym komputerze; konto nigdy nieimportowane niczego nie wstrzymuje; dni czekają najwyżej 7 dni od pierwszego pytania; misja tygodnia czeka razem z dniami luki | T380, T381 |
| N3 | Misje | nazwa „Zaciemnienie” (inaczej „Nocna wachta”); „Dziś bez wydatków” przy wydatku z dziś zapisuje i ostrzega, nie odmawia; „Inwentaryzacja” liczona po chwili zapisu potwierdzenia (ponowne potwierdzenie tego samego salda też się liczy) | T383 |
| N3 | Kurs i symulator | brak nie przechodzi na następny miesiąc: osłony kończą na 0, kurs pokazuje „Brakuje na koszty” jako sumę 12 mies.; „Zasięg po resztce miesiąca” tylko, gdy różni się od „teraz”, i zakłada, że spóźnione spłaty pożyczek wrócą w tym miesiącu; wszystko pełne – „teraz” (także cele) | T385–T387 |
| N3 | Trend poduszki | koniec miesiąca tylko dla zakończonych miesięcy; w Wywiadzie pod „Bilans paliwa”, linia „rosną w N z M mies.”; przy ukrytych kwotach zmiana w zł bez znaku i strzałki, zmiana zasięgu widoczna | T388 |
| N3 | Opłata zapłacona wydatkiem z datą po dziś | płaci termin dopiero w dniu płatności; do tego czasu Ładownia „zaplanowane dd.mm” bez „Zapłacone (dziś)”, odprawa bez alertu (także po 3 dniach łaski), Radar bez tego terminu | T398 |
| N3 | Termin zapłacony wpisem naprzód | znika z Radaru i z „Płatność” w Ładowni (kolejne miesiące też); „Zapłacone (dziś)” nie ma, gdy dzisiejsza płatność zamknęłaby termin tylko przez przesunięcie | T398 |
| N3 | Potwierdzenia salda w „Inwentaryzacji” | dzień potwierdzenia = późniejszy z chwili potwierdzenia i dnia salda; zapisane przed 1.15.7 – po dniu salda, jak w 1.15.6 (import z tygodnia aktualizacji z saldem z niedzieli nie zalicza tygodnia) | T383 |
| N1 | Zmiany w trakcie niedostępności folderu | folder tylko do odczytu jak dotąd: nowe zmiany odrzucane z komunikatem, czekają tylko przyjęte wcześniej (inaczej: przyjmować w pamięci) | T315 |
| N1 | Szybki wpis tuż przed wykryciem braku folderu | „Wpis przyjęty, ale jeszcze niezapisany…”, okno zostaje 4 s | T317 |
| N1 | Pytanie „Zmienić operację?” poza edytorem | z nazwą operacji (pojawia się też na innym ekranie) | T319 |
| N1 | Odpowiedzi kreatora w toku | na tym komputerze, osobno dla folderu; baner „Kreator startu jest w toku (krok N z 7)” | T319 |
| N1 | Ten sam numer rachunku na innym koncie | wiersz pokazany, domyślnie nie przenoszony | T321 |
| N1 | „Usuń duplikat” w imporcie naprawczym | zaznaczone, gdy kopia przyszła z importu bez innej decyzji; zadokowana, spłacana przez domownika, spłacająca inne zakupy albo tylko do odczytu – nigdy (z powodem) | T321 |
| N1 | Kilka kont z numerem pliku | wygrywa konto z importem mBanku | T322 |
| N1 | Rozpoznanie a reguła | słowo z tytułu i reguła przelewu własnego mają pierwszeństwo; domownik będący pożyczkobiorcą – wygrywa pożyczka; pożyczka wygrywa z regułą tylko od dnia jej udzielenia | T325 |
| N1 | „w tym za X” | część wiersza może przekroczyć dług, część grupy / tematu – nigdy (licząc zakupy i własne wpłaty X z pliku); wpłata ≥ cały dług spłaca wszystkie zakupy | T327–T329 |
| N1 | Temat z jednakową decyzją kilku marek z „w tym za” | wiersz tematu bez edytora części: „w tym za – ustawione w markach”; zmiana w temacie trafia do każdej marki, kwoty marek bez zmian | T336 |
| N2 | Ostrzeżenie przy przenoszeniu do celu | także gdy przeniesienie przekracza brakującą kwotę (nie tylko przy pełnym celu), z „tylko brakujące”; nigdy nie blokuje | T340 |
| N2 | Para do zadokowania | liczona według puli także dla bliskich kwot (B22) i wpływów wpisanych na Portfelu XTB (B69); komputer bez odczytu ICTTJ i telefon liczą zwykłą kolejnością do dokowania | T341 |
| N2 | Opłata zapłacona przed startem | w miesiącu startu odkłada 0 zł, następny cykl od kolejnego miesiąca; każda połączona płatność sprzed startu zamyka swój cykl | T345 |
| N2 | Pensja 0 zł | alarm tylko w Planie (bez Mostka i odprawy); prognoza zakłada pełną pensję co miesiąc | T346 |
| N2 | „Wycofaj dokowanie” i kategorie | bez okna potwierdzenia, tylko „Cofnij” 8 s; usunięcie kategorii głównej zabiera nieużywane podkategorie; koperta 0 zł liczy się jako „w użyciu” | T360, T361 |
| N2 | Wpłata domownika | reguła nie zapisuje reszty – reszta zawsze z ustawienia osoby (istniejące reguły spłaty dla osób z ustawieniem „zaliczka” wysyłają resztę do depozytu); niezależny przychód wskazujący zakup też go spłaca; zmiana opcji tej samej osoby zachowuje linie „w tym za” i pożyczki | T350, T351 |
| N2 | Meldunek „Zaliczki przy długu” | pyta tylko o dług nadal do oddania przez zaliczkę, także o zaliczki wybrane świadomie; „zostaw” raz na wpłatę | T352 |
| N2 | Spłata pożyczki dowolną wpłatą | „kto zapłacił” tylko, gdy płacił ktoś inny (wtedy wszyscy płacący); „zapamiętaj” domyślnie wyłączone; cała spłata z szybkiego wpisu zapisana jako wpływ z częścią pożyczki; część z reguły – na każdą wpłatę, suma dla kilku wpłat nie trafia do reguły | T355–T359, T368 |
| N1 | Audyt reguł | tylko wskazuje operacje do poprawy, bez naprawy jednym kliknięciem; stare błędne operacje sprzed 1.15.5 – ręcznie | T326 |

## Po ciągu N1–R2 – co dalej (do wyboru przez użytkownika)

Ciąg D101 kończy się na R2; dalszej grupy nie ma w planie. Propozycje (żadna nie jest zaczęta):
1. **Porządek po ciągu** (Sonnet 5.5 · medium, ok. 0,25 h): usunięcie drzew `FI-wt\*` i scalonych gałęzi lokalnych i
   zdalnych `claude/1.15.*`–`1.17.*`, `git pull` w głównym repozytorium.
2. **Odbiór 1.15.5–1.17.0 przez użytkownika:** tabela „Do potwierdzenia” wyżej (warianty wybrane bez Ciebie) i „Do Twojej
   decyzji” (rekordy tylko do odczytu) – odpowiedzi trafią do jednej grupy poprawek.
3. **Rzeczy otwarte z grup** (archiwum, punkty „Otwarte” N1–R2) – np. Sankey w Planie miesiąca, podpowiedź oprocentowania,
   pomiar Workera w maszynie (IM.55), niestabilny `ap20.spec.ts:53`; raport maszyny wirtualnej i `docs/audyt/ty.md`.
4. **iPhone iD / iE** – wstrzymane (D98), tylko na osobną decyzję.

## Zasady prowadzenia (prośba użytkownika 16.10.2026 – D67)
- Po każdym kroku (etapie albo grupie) zaktualizowana tabela: model i thinking z górką, szacowany czas pracy Claude'a.
- Bez komendy użytkownika nie zaczynam kolejnego etapu ani grupy. Wyjątek: ciąg N1–R2 – komenda z 04.11.2026 obejmuje
  wszystkie grupy, bez pauz między nimi (D101).
- Etapy, które mogą iść jednym ciągiem, są zgrupowane: w grupie bez pauzy między etapami (każdy etap i tak kończy się
  testami, `/code-review` high, commitem i wpisem tutaj), jeden PR i jedno wydanie na grupę, potem pauza.
- Wpis etapu: zakres, decyzje (D… / T…), testy, czas faktyczny, rzeczy otwarte – zwięźle; mapa kodu nie jest
  potrzebna (kod przeszukuje się Grepem).

## Kolejka prac

Czas = praca Claude Code w sesji (czytanie, pisanie, testy, poprawki), bez testowania przez użytkownika i bez czekania
na CI. Model i thinking z górką. Ukończone grupy E0 … 1.15.1 i iA–iC z czasami: archiwum dziennika, sekcja „Kolejka
prac” (razem ok. 63 h; ciąg M–V zmierzone ok. 17 h przy planie ok. 24–25 h).

| Grupa | Etapy | Model | Thinking | Czas Claude'a | Wydanie | Co potrzebne przed startem | Stan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **N1** | Dane i import po audycie: folder danych przed zapisem, tożsamość wiersza banku, szkic przy „Zmień mimo to”, pożyczka przed regułą, „+ w tym za” (AP-1, 2, 6, 7, 8; AF-1 K, AF-2 K, AF-3 W, AF-9 W, AF-26 W, AF-27 W) | Opus 5.5 | xhigh (max w AP-6, AP-7) | 2,5–4 h (z górką 4,5 h) | 1.15.5 | D101 | ⏳ |
| **N2** | Silnik pieniędzy po audycie: przeniesienie środków celu w chwili zapisu (zamiast T129), „reszta jako zaliczka” + naprawa danych, płatność sprzed startu, „Wycofaj dokowanie”, usuwanie kategorii, plan = silnik, dostawa według puli, wyrocznia jako regresja (AP-3, 4, 5, 9, 11, 12, 32); nowa funkcja: wpłata od dowolnej osoby spłaca pożyczkę (D100) | Opus 5.5 | **max** | 3–4,5 h (z górką 5,5 h) | 1.15.6 | – (S4, T163 – D99) | ⏳ |
| **N3** | Opłaty, energia, gra: jeden stan opłaty, energia dziś w granicach miesiąca, zamrażanie po przerwie, kadłub, Kurs = Mostek, trend poduszki (AP-10, 13, 14, 17, 18, 30, 31) | Opus 5.5 | xhigh (max w AP-13, AP-17) | 2,5–3,5 h (z górką 4 h) | 1.15.7 | – (D99) | ⏳ |
| **N4** | Zasady interfejsu: komunikat przy każdym odrzuceniu, „Cofnij” wszędzie, teksty, odprawa z hierarchią (AP-15, 16, 22, 23) | Sonnet 5.5 | high (Opus high przy logice) | 2–3 h (z górką 3,5 h) | 1.15.8 | – | ⏳ |
| **N5** | Ścieżki i ergonomia: kreator, domownicy, szybki wpis, debriefing, dokowanie, konflikty, nowy komputer, eksport, Operacje (AP-19–21, 24–29, 33, 34, 36–38) | Opus 5.5 | high (xhigh przy silniku) | 3–4,5 h (z górką 5 h) | 1.15.9 | – (D99, D100) | ⏳ |
| **R1** | Rozwojowe 1: import w Web Workerze (AP-35, po pomiarze w maszynie), kalendarz miesiąca na Radarze (AP-42), dowolny CSV – drugi bank (AP-43), reguły I / LUB i dla wpisów ręcznych (AP-45), opis formatu folderu (AP-47) | Opus 5.5 | xhigh (high przy UI) | 3–4,5 h (z górką 5 h) | 1.16.0 | D101 | ⏳ |
| **R2** | Rozwojowe 2: plan spłaty pożyczek (AP-41, bez karty kredytowej – D101), prognoza wieloletnia bez IKE / IKZE / PPK (AP-44), Sankey miesiąca (AP-46), kwota w walucie (AP-48) | Opus 5.5 | **max** (plan spłaty – silnik) / xhigh | 3–5 h (z górką 6 h) | 1.17.0 | – (D101) | ✅ PR #56 |
| **iD** | iPhone: Ładownia i gwiazdy – dokowanie z ICTTJ, Ładownia, Mapa gwiezdna (IP15–IP17) | Opus 5.5 | **max** (z IP15; bez niego xhigh) | 1,25–1,75 h z IP15, 0,5–0,75 h bez (z górką 2 h; plan był 4–4,5 h – grupy iA–iC trwały 0,15–0,3 planu) | później | odpowiedź: czy folder danych ICTTJ jest na OneDrive (bez tego IP15 odpada); limit tygodniowy po iC; komenda | ⏸ wstrzymane (D98) |
| **iE** | iPhone: Dowództwo – Dowództwo, Wywiad, kreator, Ustawienia, zapisy w tle (IP18, IP19, IP21, IP22, IP24) | Opus 5.5 | **xhigh** (D96; max tylko w krokach silnika pieniędzy albo granicy ICTTJ) | 5,5–7,5 h (z górką 8 h) | później | decyzje: IP21 (kreator – propozycja: bez), IP24 (zapisy w tle z telefonu) | ⏸ wstrzymane (D98) |
| | **iPhone iA–iE (D92)** | | | **24–31,5 h (z górką 34 h)** | | | |


## Przed grupą iD – iPhone: Ładownia i gwiazdy (21.10.2026)

1. **Co trzeba wiedzieć** – grupy iA–iC wydane (1.13.0–1.15.0, PR #42–#44); po iC przerwa (D93). Grupa iD (1.16.0):
   - IP15 Dokowanie z ICTTJ – tylko gdy folder danych ICTTJ jest na OneDrive. Telefon czyta z niego wyłącznie
     `payouts/**` i `forecasts/*.json` (Graph, to samo logowanie – `Files.ReadWrite` obejmuje cały OneDrive, w Entra
     nic nie dochodzi) i nigdy nic do niego nie wysyła: osobna kopia tylko do pobierania, bez obecności telefonu i bez
     kopii konfliktu w folderze ICTTJ. Na telefonie: wybór folderu ICTTJ w ustawieniach telefonu, panel „Dokowanie” na
     Mostku, okno dokowania z podziałem, wypłata bez pary w mBanku po 3 dniach roboczych → Portfel XTB (D72), meldunek
     „Dokowanie”, scenariusz ICTTJ na Mapie gwiezdnej. Bez IP15 dokowanie zostaje na komputerze – liczby na telefonie i
     tak są te same (dokowania leżą w folderze FI).
   - IP16 Ładownia – ekran komputera na telefonie: kontenery (dodanie, zmiana, archiwizacja, historia kwot), linia
     zanurzenia, zbiorniki, symulacja, propozycje opłat, nowe ceny i ciche kontenery, harmonogram miesięcy; meldunek
     „Ładownia” rozpatrywany na telefonie.
   - IP17 Mapa gwiezdna – cele (dodanie, kwota, termin i rata, archiwizacja z przeniesieniem pieniędzy); kolejność celów
     przyciskami ↑ ↓ – na komputerze przeciąganiem, które na iPhonie nie działa pewnie.
   - Zapisy w tle z telefonu (zamrażanie dni gry, cele ICTTJ z prognozy) – nie w iD (IP24, grupa iE). Format folderu
     bez zmian.
2. **Co użytkownik musi powiedzieć**:
   - IP15: czy folder danych ICTTJ jest na OneDrive, a jeśli tak – gdzie (np. `OneDrive\ICT Trade Journal`).
     Propozycja: tak → IP15 jak wyżej (telefon podpowie folder z `journal.json` w głównym folderze OneDrive); nie → iD
     bez IP15.
   - Procent limitu tygodniowego teraz (po iA–iC) – kolumna „Rzeczywiste”.
   - Przed iE (można już teraz): IP21 kreator startu – propozycja: bez niego (budżet startuje na komputerze: kreator
     dzieli środki i proponuje pensję z historii z banku, a import z mBanku jest tylko na komputerze; telefon przed
     startem budżetu mówi, że kreator jest na komputerze). IP24 zapisy w tle z telefonu – propozycja: tak (telefon w
     użyciu zamraża dni gry i – z IP15 – uzupełnia cele ICTTJ, jak komputer w użyciu, z tą samą kontrolą konfliktu);
     bez tego dni zamraża komputer przy otwarciu, a do tego czasu ocena dnia może się zmienić po późniejszej edycji
     operacji.
   - Uwagi z telefonu do iA–iC (jeśli są) – poprawki wejdą do iD.
3. **Co przygotować** – nic nowego (uprawnienie OneDrive obejmuje folder ICTTJ, nowych wtyczek nie ma).
4. **Model, thinking, czas** – tabela prac (D90); grupy iA–iC trwały 0,15–0,3 planu:

| Krok | Co obejmuje | Model i thinking (z górką) | Czas Claude'a |
| --- | --- | --- | --- |
| iD-1 | Folder ICTTJ na telefonie: kopia tylko do pobierania (`payouts/`, `forecasts/`), wybór folderu, odświeżanie razem z synchronizacją, stan ICTTJ w oknie (IP15) | Opus 5.5 · max (minimum xhigh – granica „nigdy nie zapisuj w folderze ICTTJ”) | 0,5–0,75 h |
| iD-2 | Dokowanie na telefonie: panel na Mostku, okno dokowania, Portfel XTB, meldunek (IP15) | Opus 5.5 · xhigh (minimum high) | 0,25 h |
| iD-3 | Ładownia na telefonie, meldunek ładowni (IP16) | Opus 5.5 · xhigh (minimum high) | 0,25 h |
| iD-4 | Mapa gwiezdna na telefonie, kolejność przyciskami (IP17) | Opus 5.5 · high (minimum medium) | 0,1–0,25 h |
| iD-5 | E2E telefonu, przegląd zrzutów, `/code-review` high, CI (Linux, Windows, macOS), wydanie 1.16.0 | Opus 5.5 · xhigh | 0,25 h |
| Razem | rekomendacja: Opus 5.5 · max z IP15, xhigh bez niego | | z IP15 1,25–1,75 h (z górką 2 h), bez 0,5–0,75 h (z górką 1 h); plan był 4–4,5 h |

Limit tygodniowy (D93): iD ok. 2,5 % (bez IP15 ok. 1 %), z górką 3,5 % – przeliczę po procencie po iC.
