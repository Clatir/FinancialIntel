# Przegląd 1.4.1 – Niespójności: szczegóły

Lista do odhaczania i podsumowanie: [README.md](README.md). Każde znalezisko sprawdzone w kodzie; błędy przez dwóch niezależnych weryfikatorów (prześledzenie kodu i sonda – test na kodzie aplikacji), pozostałe przez jednego.

## N1. Wydatku nie da się opłacić z pieniędzy celu: `goalId` obsługuje tylko silnik, nie ma go w żadnym ekranie

Priorytet: wysoki · obszar: domownicy i ICTTJ, Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/shared/schema/records.ts:122`, `src/shared/calc/fleet.ts:610`, `src/shared/calc/fleet.ts:614`, `src/shared/calc/operations.ts:100`, `src/renderer/features/operations/OperationEditor.tsx:248`, `src/renderer/features/starmap/StarMapPage.tsx:111`, `docs/decyzje.md:289`, `src/renderer/features/starmap/actions.ts:29` …

**Co się dzieje.** Cel własny „Wakacje” ma uzbierane 5 000 zł. Użytkownik płaci 5 000 zł za wyjazd. Edytor operacji (ma tylko pole „Ładownia”), szybki wpis ani import nie pozwalają oznaczyć wydatku jako opłaconego z celu, więc silnik bierze go z energii i osłon. Skutki: czerwony alarm „Energia wyczerpana”, przekroczony przydział dnia albo koperta, a w grze naruszenie zamrażane po 24 h. Wydatek liczy się też do kosztów netto, więc rośnie cel kadłuba. Cel trzyma 5 000 zł na zawsze, bo nie ma akcji „przenieś środki celu do osłon”, także dla celu zarchiwizowanego. Według T24 i tekstu Mapy gwiezdnej („wydatek z tego celu je zużywa”) wydatek powinien zejść z celu.

**Poprawka.** W edytorze operacji dodać pole „Z celu” dla wydatku (lista celów aktywnych i zarchiwizowanych, które mają środki; patch `goalId`, a przy zmianie rodzaju `withKind` zdejmuje goalId). Opcjonalnie to samo w szybkim wpisie i w decyzji grupy importu. Na Mapie gwiezdnej dodać akcję „Zwolnij środki do osłon” dla celu (najprościej rekord przeniesienia albo zdarzenie w silniku), bo T31 zabrania silnikowi ruszać cele samemu.

To samo zgłoszone też jako: „Wydatku z celu nie da się wprowadzić, choć silnik i teksty Mapy gwiezdnej go zakładają”; „Wydatek „z pieniędzy celu” (T24, goalId) jest w silniku, ale nie da się go ustawić w żadnym ekranie”.

## N2. Tryb tylko do odczytu: część ekranów pokazuje sukces, choć nic się nie zapisało

Priorytet: średni · obszar: całość, domownicy i ICTTJ, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, import (ekran), folder danych i synchronizacja

Gdzie: `src/renderer/features/settings/AccountsTab.tsx:126`, `src/renderer/features/balances/actions.ts:39`, `src/renderer/features/balances/actions.ts:59`, `src/renderer/store/data.ts:508`, `src/renderer/features/operations/state.ts:91`, `src/renderer/features/operations/state.ts:109`, `src/renderer/features/settings/ImportTab.tsx:37`, `src/renderer/features/month/MonthPage.tsx:132` …

**Co się dzieje.** Folder jest otwarty tylko do odczytu (nowszy format z drugiego komputera, dysk niedostępny).
- Ustawienia → Konta → „Potwierdź saldo”: toast „mBank: saldo zgodne z operacjami” albo „rozbieżność w ładowni … – dodano korektę do wyjaśnienia (Operacje)”, a korekty ani potwierdzenia nie ma, bo addRecord po cichu wraca.
- Operacje → „Ustaw” kategorię dla zaznaczonych: toast „Jedzenie: 5 operacji” z „Cofnij”, a nic się nie zmienia.
- Ustawienia → Import: „Rozłączono 3 nazwy” z „Cofnij”.
- Plan miesiąca: pole pensji i kopert przyjmuje wpis, a po wyjściu z pola bez komunikatu wraca stara wartość.
Tymczasem edytor operacji i „Warstwy i rozkazy” są wyłączone (fieldset disabled), import mówi „Folder tylko do odczytu”, a szybki wpis – „Folder jest tylko do odczytu.”.

**Poprawka.** addRecord, addRecords, replaceRecords i updateSettings mają zwracać boolean (false przy folderze tylko do odczytu). confirmBalance, setOpening, categorizeTicked, financeTicked i changeAliases pokazują toast sukcesu i „Cofnij” tylko po true, a w przeciwnym razie jeden wspólny komunikat „Folder jest tylko do odczytu”. W AccountsTab, CategoriesTab, ImportTab i w BulkBar Operacji czytać status.readOnly i wyłączać pola (fieldset disabled, jak w OperationEditor). W MonthPage usunąć strażnik `!readOnly &&` przy onChange, bo editPlan sam pokaże komunikat, albo ustawić readOnly na AmountField.

To samo zgłoszone też jako: „W folderze tylko do odczytu Ustawienia → Import, słowa kluczowe, połączone nazwy i potwierdzenie salda pokazują sukces, choć nic się nie zapisuje”; „Tryb tylko do odczytu: akcje zbiorcze w Operacjach i potwierdzenie salda zgłaszają sukces, choć nic się nie zapisało”; „Tryb tylko do odczytu: Konta, Kategorie i Okręt można edytować, a potwierdzenie salda melduje sukces, choć nic nie zapisuje”; „Folder tylko do odczytu: część pól Domowników, Mapy gwiezdnej i Dokowania przyjmuje zmiany, które bez słowa przepadają”; „Tryb tylko do odczytu na stronie Synchronizacja: przyciski konfliktów i „Do Kosza” aktywne, „Przywróć” wyłączone”.

## N3. Szybki wpis: podgląd „Energia dziś → …” liczy inaczej niż silnik (kategoria bez koperty, data inna niż dziś)

Priorytet: średni · obszar: całość, proces główny i okna, silnik budżetu

Gdzie: `src/renderer/features/quick/QuickApp.tsx:142-144`, `src/renderer/features/quick/QuickApp.tsx:150`, `src/renderer/features/quick/QuickApp.tsx:330`, `src/renderer/store/quickHost.ts:39`, `src/shared/calc/fleet.ts:883-895`, `src/shared/calc/fleet.ts:130`, `src/renderer/features/quick/QuickApp.tsx:142`, `src/renderer/features/quick/QuickApp.tsx:147` …

**Co się dzieje.** Specyfikacja: „Podgląd energii po operacji, zanim zapiszesz”. Podgląd ma więc pokazywać to samo, co po zapisie Mostek.
(1) Kategoria główna ma w Ustawienia → Kategorie kopertę „brak” (envelope null). Wydatek 100 zł w tej kategorii: podgląd pokazuje „Energia dziś: 110,71 zł → 10,71 zł”, a przy niskiej energii wynik na czerwono poniżej zera. Po zapisie Mostek, zasobnik i odprawa dalej pokazują 110,71 zł. Silnik liczy do energii dnia tylko kategorie codzienne i wydatki bez kategorii, a ten wydatek zdejmuje tylko energię miesiąca.
(2) Wieczorem albo rano użytkownik dopisuje wczorajszy zakup 140 zł (pole Data w szybkim wpisie). Podgląd odejmuje całe 140 zł od dzisiejszej energii. Silnik rozkłada wydatek sprzed dziś na pozostałe dni, więc przy 14 dniach energia dziś spada o 10 zł.

**Poprawka.** Najpewniej liczyć podgląd silnikiem: quickHost na żądanie okna (np. przez quickData z dopisaną operacją szkicu) przelicza computeFleet z tą operacją i odsyła daily.left oraz envelopes[].left po operacji. Minimum w QuickApp: (1) `c.envelope === 'daily' || !c` → energia dnia; `c.envelope === null` → osobny wiersz „poza kopertami – nie zmienia energii dnia”; (2) gdy d.date < dziś i ten sam miesiąc → spadek ≈ kwota / pozostałe dni („przydział od dziś mniejszy o …”); gdy inny miesiąc → bez podglądu energii dnia.

To samo zgłoszone też jako: „Podgląd „Energia dziś X → Y” w szybkim wpisie liczy inaczej niż silnik (data spoza dziś, kategoria „bez koperty”)”; „Szybki wpis: wydatek w kategorii „poza kopertami” zmniejsza energię dziś w podglądzie, a w silniku nie”.

## N4. Panel „Przychody”: mediana „Razem” liczona z miesięcy z ujemnym tradingiem – niezgodna z resztą panelu i z raportami

Priorytet: średni · obszar: całość

Gdzie: `src/shared/calc/income.ts:129`, `src/shared/calc/income.ts:145`, `src/shared/calc/income.ts:79`, `src/shared/calc/intel.ts:310`, `src/shared/export/budget.ts:136`, `src/renderer/features/month/IncomePanel.tsx:27`

**Co się dzieje.** 6 pełnych miesięcy: praca 5 000 zł co miesiąc, a w trzech z nich dopłata do XTB 6 000 zł. Panel „Przychody” (Mostek, Plan miesiąca) w kolumnie „mediana” pokazuje: Praca i inne 5 000 zł, Trading 0 zł, Razem 2 000 zł. „Razem” jest mniejsze niż „Praca” w tej samej kolumnie. Przegląd roczny i eksport „Miesiące” CSV / Excel pokazują dla każdego z tych miesięcy 5 000 zł (trading netto miesiąca nigdy poniżej zera – T119), a okno 6 mies. 5 000 zł. Ta sama historia daje medianę 2 000 zł, choć w raportach żaden miesiąc nie ma mniej niż 5 000 zł.

**Poprawka.** W incomeStats miesiąc liczyć jak incomeOfPeriod: `total: v.work + Math.max(0, v.trading)`. Można też w polu months trzymać trading już obcięty, bo mediana tradingu się nie zmieni (funkcja monotoniczna i tak obcina). Dodać test do tests/unit/income.test.ts.

## N5. Zakup sfinansowany przez domownika nadal daje poważne naruszenie (cisza nocna, osłony poniżej minimum) – wbrew D80 f / T107

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator, gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:237`, `src/shared/calc/game.ts:187`, `src/shared/calc/game.ts:224-235`, `src/shared/calc/game.ts:305`, `src/shared/calc/game.ts:382`, `src/shared/calc/game.ts:330`, `tests/unit/game.test.ts:93-95`, `docs/decyzje.md:228` …

**Co się dzieje.** Użytkownik o 23:30 kupuje w Żabce za 30 zł dla domownika („finansuje: Dom”, `refundable: true`). Energia i koperty słusznie tego nie widzą (daily.left bez zmian, należność 30 zł), ale `rateDay` dopisuje poważne naruszenie „Zakup w ciszy nocnej” na całą kwotę paragonu. Tak samo zakup za domownika na 3 500 zł, który zgodnie z D80 d „pożyczają osłony”, spycha osłony poniżej minimum → poważne „Osłony poniżej minimum” (wydatek jest w DECISIONS). Dzień zamraża się na zawsze: przerwana seria, licznik degradacji, a 3 takie zdarzenia w miesiącu degradują stopień. Do tego misja „Cisza w eterze” jest wybierana i oblewana, a „Zero impulsów” oblewana przez cudze zakupy. D80 f i T107 mówią wprost: „wydatek sfinansowany przez domownika nie jest naruszeniem w grze”.

**Poprawka.** W rateDay liczyć ciszę nocną z części własnej: `const own = -sum(partsOf(t).filter((p) => !p.refundable).map((p) => p.amount)); if (isNight(t, orders) && own > 0) add('quiet', own, t.id, t.counterparty)`. Celowo nie przez costOf, który zeruje też zakupy z pieniędzy celu (goalId). Tak samo w chooseMission.quiet i missionStatus 'quiet'. W `moved` dla osłon nie liczyć pożyczki dla domownika: dodać z powrotem przepływy `lent` / `fromDeposit` z f.household.byTx dla operacji dnia albo pominąć wpisy 'expense' operacji bez części własnej. Test game.test.ts:94 przepisać na decyzję, która naprawdę rusza osłony (np. udzielona pożyczka albo dopłata 'trading') i dodać test D80 f (cisza nocna i osłony przy zakupie finansowanym).

To samo zgłoszone też jako: „Zakup finansowany przez domownika w ciszy nocnej jest poważnym naruszeniem w grze – wbrew D80 f / T107”; „Cisza nocna i pytanie dziennika także przy zakupach finansowanych przez domownika (gra liczy je jako poważne naruszenie)”.

## N6. „Miesiąc zamknięty na plus” (T52) przeczy silnikowi: fanfara przy alarmie „energia wyczerpana”, a miesiąc opłaty ze zbiornika nigdy nie jest na plus

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/shared/calc/plan.ts:290`, `src/shared/calc/plan.ts:326`, `src/shared/calc/fleet.ts:535`, `src/shared/calc/fleet.ts:573`, `src/shared/calc/briefing.ts:52`, `src/renderer/features/month/MonthPage.tsx:289`, `src/shared/calc/game.ts:482`, `src/renderer/features/month/MonthPage.tsx:296` …

**Co się dzieje.** (a) Pensja 5 000 zł, rata odkładki OC 100 zł, wydatki 4 950 zł. Odprawa pokazuje czerwony alarm „Energia wyczerpana: 50,00 zł ponad pensję poszło z osłon”, a debriefing jednocześnie gra fanfarę z dźwiękiem: „Miesiąc zamknięty na plus – koszty netto 4 950 zł nie przekroczyły pensji 5 000 zł”. (b) W grudniu OC 1 200 zł zapłacono ze zbiornika uzbieranego przez rok z pensji. Zostało 400 zł łupów, a debriefing mówi „Koszty netto 3 700 – ponad pensję o 700 zł”, co przerywa osiągnięcie Hat-trick. Silnik traktuje opłatę okresową jako koszt zbiornika, „nigdy pensji” (fleet.ts:573, T45), a debriefing liczy ją w całości jako koszt miesiąca. Sprzeczne komunikaty wynikają z reguły T52 (koszty netto ≤ pensja), więc poprawka wymaga zmiany decyzji.

**Poprawka.** Bez zmiany decyzji: tekst alarmu „Energia wyczerpana: X ponad energię miesiąca (pensja po ratach odkładek) poszło z osłon”. Do decyzji użytkownika (zmiana T52 / spec. 218): „na plus” = miesiąc bez 'energy-exhausted' i łupy ≥ 0, albo koszty netto bez płatności pokrytych ze zbiorników plus raty odkładek tego miesiąca z logu silnika ≤ pensja. Hattrick i debriefing wtedy z tej samej reguły.

To samo zgłoszone też jako: „„Miesiąc zamknięty na plus” liczy opłatę okresową zapłaconą ze zbiornika jak wydatek z pensji”; „Debriefing: opłata okresowa zapłacona ze zbiornika liczy się w całości do kosztów miesiąca – miesiąc płatności OC wychodzi „ponad pensję”, choć pieniądze były odłożone”.

## N7. Kreator startu: nieaktualne teksty o „wersji 1.1”, brak kroku folderu ICTTJ i celów w podziale środków (spec, kroki 5–6)

Priorytet: średni · obszar: całość, domownicy i ICTTJ, Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/renderer/features/wizard/WizardPage.tsx:230`, `src/renderer/features/wizard/WizardPage.tsx:280`, `src/renderer/features/wizard/state.ts:119`, `docs/specyfikacja.md:397`, `docs/specyfikacja.md:398`, `src/shared/calc/start.ts:30`, `src/shared/calc/fleet.ts:744`, `src/renderer/features/wizard/state.ts:18` …

**Co się dzieje.** Aplikacja ma wersję 1.4.1, a Mapa gwiezdna i ICTTJ działają od 1.1.0. Kreator nadal pisze „Cele dojdą z Mapą gwiezdną (wersja 1.1)” i „Folder ICT Trade Journal (wypłaty i cele) podłączysz w wersji 1.1”. Spec: krok 5 to podział obecnych środków na osłony, kadłub i cele, a krok 6 to folder ICTTJ (opcjonalnie). W kreatorze cele w podziale są zawsze puste (`goals: {}`), a folderu ICTTJ nie da się wskazać. Nowy użytkownik z celami w ICTTJ ma wszystkie środki w osłonach i kadłubie i czyta, że ta funkcja dopiero będzie.

**Poprawka.** W kroku „Podział środków” pokazać listę niezarchiwizowanych celów (rekordy goals – własne i z ICTTJ, w kolejności priorytetów) z kwotami na start. Zapisać je w `budget.initial.goals`: reszta do osłon, walidacja: kadłub + cele ≤ środki. W kroku „Okręt i rozkazy” dodać opcjonalny wybór folderu ICTTJ (ictjSuggest + setIctjDir, jak w IctjTab), żeby cele ICTTJ były rekordami jeszcze przed krokiem 5. Usunąć oba napisy o „wersji 1.1” i komentarz w src/shared/calc/start.ts:34.

To samo zgłoszone też jako: „Kreator startu nie ma podziału na cele ani folderu ICTTJ i nadal mówi „w wersji 1.1””; „Kreator startu: nieaktualne komunikaty „w wersji 1.1” i brak celów oraz folderu ICTTJ ze specyfikacji”; „Kreator startu nadal pisze, że cele i ICTTJ przyjdą „w wersji 1.1”, a kroków z celami i folderem ICTTJ ze specyfikacji nie ma”.

## N8. Koperta zarchiwizowanej kategorii znika z formularza planu, ale dalej liczy się do sum, energii dnia i kolejnych miesięcy

Priorytet: średni · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/month/MonthPage.tsx:172`, `src/renderer/features/month/MonthPage.tsx:203`, `src/shared/calc/plan.ts:226`, `src/shared/calc/fleet.ts:897-898`, `src/shared/calc/operations.ts:58`

**Co się dzieje.** Kategoria „Osobiste” ma kopertę codzienną 310 zł i użytkownik archiwizuje ją w Ustawieniach. W „Podziale pensji” wiersza Osobiste już nie ma, więc nie da się wyczyścić pola. Nagłówek „Koperty codzienne” pokazuje jednak 1 210 zł zamiast 900 zł, a „Rozdzielone” i „Niezaplanowane (łupy)” dalej ją liczą. Silnik dolicza 310 zł do energii dnia i dziennego przydziału, a w panelu „Koperty” pasek Osobiste dalej jest. Kopia planu na kolejne miesiące (T46) przenosi kopertę dalej. Jedyne wyjście: przywrócić kategorię, wyczyścić kopertę i znów zarchiwizować.

**Poprawka.** W SplitPanel pokazywać także zarchiwizowane kategorie, które mają kopertę w planie miesiąca, z dopiskiem „zarchiwizowana” i możliwością wyczyszczenia. Dodatkowo przy archiwizacji kategorii (patchCategory archived: true) zdejmować jej kopertę z planu bieżącego i późniejszych miesięcy z „Cofnij”. Ewentualnie pomijać zarchiwizowane w salarySplit i silniku, ale wtedy musi to być spójne z debriefingiem minionych miesięcy (np. pomijać od miesiąca archiwizacji).

## N9. Kreator pokazuje inne odkładki i inną pierwszą pensję niż potem silnik i Plan miesiąca

Priorytet: średni · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/wizard/WizardPage.tsx:75`, `src/renderer/features/wizard/WizardPage.tsx:77`, `src/renderer/features/wizard/WizardPage.tsx:216`, `src/renderer/features/wizard/WizardPage.tsx:53`, `src/renderer/features/wizard/WizardPage.tsx:139`, `src/shared/calc/fleet.ts:108`, `src/shared/calc/fleet.ts:573`, `src/renderer/features/month/MonthPage.tsx:54`

**Co się dzieje.** W kreatorze (krok 4) użytkownik zaznacza z propozycji OC 1 240 zł płacone co rok (ostatnio w 2025-11, więc kolejne za miesiąc). Kreator liczy odkładkę pierwszego miesiąca jako `sinkingSchedule(...)[0]`, czyli 103,33 zł, i z tą kwotą pokazuje „Niezaplanowane (łupy)”. Silnik w miesiącu startu (T29) dorzuca brak zbiornika: rata = 619,98 zł. Tę kwotę pokaże potem Plan miesiąca bieżącego miesiąca (sinkingOf z logu). Kwota „niezaplanowane” z kreatora różni się więc o ok. 517 zł i może się zmienić w „Plan przekracza pensję”. Podobnie notka „pierwsza pensja na resztę miesiąca to X” (krok 3) odejmuje wszystkie koszty miesiąca, a silnik (T45) pomija płatności opłat okresowych podpiętych do kontenerów.

**Poprawka.** W kreatorze liczyć odkładki pierwszego miesiąca jak silnik: `sinkingInstallment(c, month, 0)` dla istniejących kontenerów z cyklem > 1 i dla `draftFromPayment(p)` wybranych propozycji. Najlepiej pokazać obie kwoty: „w tym miesiącu X (zbiornik nadrabia), potem Y”. W spentThisMonth pomijać płatności opłat okresowych: z containerId kontenera z cyklem > 1 oraz te, które finishWizard podepnie (payeeKey równe kluczowi wybranej propozycji z cyklem > 1).

## N10. Edytor operacji: zakup w ciszy nocnej bez potwierdzenia (D40), a godzina domyślnie „teraz” – gra liczy to jako poważne naruszenie

Priorytet: średni · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/state.ts:179`, `src/renderer/features/operations/OperationEditor.tsx:186`, `src/renderer/features/operations/OperationEditor.tsx:295`, `src/renderer/features/quick/QuickApp.tsx:184`, `src/shared/calc/game.ts:237`, `src/shared/calc/game.ts:42`

**Co się dzieje.** D40 i spec (l. 143): zakup z godziną w ciszy nocnej wymaga potwierdzenia i krótkiego wpisu, a poważne naruszenie to „potwierdzony zakup w ciszy nocnej”. Szybki wpis tego wymaga: nie zapisze bez potwierdzenia i notatki. W Operacjach Ctrl+N tworzy wydatek z bieżącą godziną (warsawNow().time) i zapisuje go bez żadnego pytania – jest tylko mały znaczek „noc”. Użytkownik, który o 23:20 dopisuje w Operacjach zakupy z całego dnia („wieczorne dopisanie”), dostaje każdy jako nocny zakup. game.ts dla każdego isNight dopisuje poważne naruszenie 'quiet', bez potwierdzenia.

**Poprawka.** W OperationEditor przy godzinie w ciszy nocnej wymagać potwierdzenia (przełącznik „tak, kupiłem w nocy” + krótki wpis w logNote). Bez potwierdzenia nie traktować wpisu jako nocnego, np. zapisać time = null albo poprosić o godzinę. Nowy wpis z Operacji (zwłaszcza z przypomnienia wieczornego) zakładać bez godziny. Dla spójności z D40 rateDay powinien liczyć 'quiet' tylko dla potwierdzonych nocnych zakupów (wymaga doprecyzowania T75 z użytkownikiem).

## N11. Dzienny przydział: silnik dolicza łupy „na następny miesiąc” i wydatki bez kategorii, a „Podział pensji” i debriefing nie

Priorytet: średni · obszar: Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:835`, `src/shared/calc/fleet.ts:897`, `src/shared/calc/fleet.ts:891`, `src/shared/calc/plan.ts:236`, `src/shared/calc/plan.ts:305`, `src/shared/calc/plan.ts:314`, `src/renderer/features/month/MonthPage.tsx:221`, `src/renderer/features/month/MonthPage.tsx:254` …

**Co się dzieje.** Plan: Jedzenie (koperta codzienna) 3 100 zł, październik ma 31 dni, a decyzja łupów dała 310 zł na następny miesiąc (T28: „powiększa koperty codzienne”). Na stronie Plan miesiąca panel „Dzienny przydział” pokazuje podstawowy przydział 110 zł i limit 3 410 zł. Panel „Podział pensji” na tej samej stronie pokazuje „Podstawowy przydział: 100 zł dziennie”. Po miesiącu z wydatkiem 3 300 zł silnik nie zgłosił przekroczenia, a debriefing (FVG) pokazuje Jedzenie „3 300 z 3 100 zł, −200 zł” na czerwono. Podobnie z wydatkami bez kategorii: w trakcie miesiąca zjadają energię dziś (T30), a w debriefingu są osobno („Bez kategorii”), więc FVG kopert codziennych wygląda dobrze, choć przydział był przekroczony.

**Poprawka.** Przekazać do salarySplit i debriefing dodatek z łupów (zdarzenie 'loot' z moves.energy w danym miesiącu albo `plan.loot.nextMonth` poprzedniego miesiąca) i pokazać go jako osobną pozycję „+ łupy z poprzedniego miesiąca” w kopertach codziennych. Podstawowy przydział = (koperty codzienne + dodatek) / dni. W debriefingu dodać wiersz sumy puli codziennej (koperty + dodatek wobec wydatków codziennych razem z bez kategorii), żeby FVG puli zgadzało się z silnikiem.

To samo zgłoszone też jako: „Dwa różne „Podstawowy przydział” na jednym ekranie Planu miesiąca po łupach „na następny miesiąc””.

## N12. Nowy plik, błędny plik albo „Zamknij plik” kasują wszystkie decyzje otwartej sesji bez pytania; sesja nie przeżywa też przeładowania okna

Priorytet: średni · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:120`, `src/renderer/features/import/state.ts:126`, `src/renderer/features/import/state.ts:142`, `src/renderer/features/import/state.ts:250`, `src/renderer/features/import/ImportPage.tsx:76`, `src/renderer/features/import/ImportPage.tsx:96`, `src/renderer/features/import/ImportPage.tsx:101`, `src/main/index.ts:1015`

**Co się dzieje.** Pierwszy import roku: kilkaset grup, użytkownik zdecydował połowę tematów, jeszcze bez importu. Pobiera drugi plik i upuszcza go na panel albo klika „Wybierz plik CSV…”, albo przez pomyłkę upuszcza PDF wyciągu. loadImportFile zawsze ustawia puste choices, a przy błędzie file: null, plan: null – poprzedni plik i wszystkie jego decyzje znikają bez pytania i bez „Cofnij”. To samo robi „Zamknij plik” jednym kliknięciem. Decyzje są tylko w pamięci okna: przeładowanie po awarii (render-process-gone → reload) albo zamknięcie aplikacji też je gubi. Konwencja projektu: „opuszczenie ekranu nigdy nie gubi zmian”, usuwanie z „Cofnij”.

**Poprawka.** Gdy otwarty plik ma decyzje (choices niepuste albo `accepted` / `skip`): przed „Zamknij plik” i przed wczytaniem innego pliku pytanie albo toast „Cofnij” przywracający poprzednią sesję (zachować poprzedni stan useImport w zmiennej). Błędny plik pokazać jako komunikat obok otwartego, bez zerowania `file` / `plan`. Opcjonalnie szkic decyzji w localStorage (klucz: konto + okres + odcisk pliku) odtwarzany po przeładowaniu.

## N13. Import pliku bez nowych operacji nie da się zapisać – „ostatni import” stoi, alarm „Zaległy import” zostaje, a Portfel XTB czeka

Priorytet: średni · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:156`, `src/renderer/features/import/ImportPage.tsx:200`, `src/renderer/features/import/state.ts:465`, `src/shared/calc/briefing.ts:175`, `src/shared/calc/dock.ts:130`, `src/shared/calc/game.ts:406`

**Co się dzieje.** Ktoś przez kilka dni nie płacił kartą (np. był na urlopie). Wypłata z ICTTJ poszła do Portfela XTB. Użytkownik pobiera z mBanku świeży CSV, w którym są tylko znane już wiersze. Przycisk pokazuje „Nic nowego w tym pliku” i jest wyłączony, więc runImport się nie wykona. W efekcie settings.import.lastImport i log się nie zmieniają. Odprawa i powiadomienie dalej mówią „ostatni import N dni temu – zaimportuj nowy plik”. Dostawa ICTTJ zostaje 'waiting' (warunek importedOn > until), więc nie trafi do Portfela XTB. Ten import nie liczy się też do misji „Łączność z bazą”. lastImport ma znaczyć „czas ostatniego importu” (T42) – a import faktycznie się odbył, tylko nic nie zmienił. Druga strona tej samej przyczyny: znalezisko o „ostatnim imporcie” jako czasie kliknięcia, nie zasięgu pliku.

**Poprawka.** Gdy plik jest poprawny, ale nic nie zmienia, zamiast wyłączonego przycisku pokazać „Zapisz import (bez zmian)”. Taki import zapisuje lastImport[konto] i wpis w log, bez kopii zapasowej i bez rekordów. Ewentualnie zapisywać sam fakt wczytania, gdy okres pliku (file.period.to) sięga wczoraj albo dziś.

## N14. Decyzja grupy „Pożyczka” / „Podatek PIT-38” zostaje regułą: kolejne przelewy do tej osoby albo urzędu są pożyczką / podatkiem bez pytania

Priorytet: średni · obszar: import (logika)

Gdzie: `src/shared/import/reconcile.ts:597-626`, `src/shared/import/learn.ts:135-137`, `src/shared/import/classify.ts:302-321`, `src/shared/calc/fleet.ts:695-716`, `docs/decyzje.md:477`, `docs/decyzje.md:566`, `docs/decyzje.md:632`

**Co się dzieje.** Użytkownik pożycza koledze 1000 zł przelewem i w imporcie wybiera dla grupy „JAN NOWAK” „Pożyczka udzielona” („zapamiętaj” jest przy własnej decyzji domyślnie zaznaczone). buildImport uczy regułę dokładną 'jannowak' → kind 'loan'. Miesiąc później przelew 120 zł do tego samego kolegi „ZA BILETY KONCERT” dostaje z reguły rodzaj 'loan' ze źródłem 'rule' – temat jest „gotowy”, nikt o niego nie pyta. Operacja nie ma `loanId`, więc nie dotyczy żadnej pożyczki z Radaru (T70: „powiązanie z pożyczką ma tylko operacja rodzaju „Pożyczka” z jej id”), a silnik liczy ją jako nową należność bez rekordu (klucz '-'): pieniądze wychodzą z osłon zamiast z energii, wydatek nie trafia do kopert, Radar pokazuje należność, której nikt nie odda. Tak samo „Podatek PIT-38” dla przelewu do urzędu skarbowego: kolejna wpłata innego podatku bierze z rezerwy podatku. T98 i komentarz w learn.ts mówią wprost, że „pożyczka, XTB i podatek są decyzją dla każdej operacji” – dla słów kluczowych tak jest, ale nauka reguł dokładnych (T89) tego wyjątku nie ma.

**Poprawka.** W `buildImport` pomijać naukę reguł dla `c.kind` 'loan' i 'tax' (ta sama lista co `KEYWORD_KINDS` plus 'trading', które i tak rozpoznaje mechanizm wbudowany), a w UI nie pokazywać lub nie zaznaczać „zapamiętaj” przy takiej decyzji. Istniejące reguły loan i tax traktować jako propozycję (źródło inne niż 'rule', temat „do sprawdzenia”). Osobno warto rozważyć wybór pożyczki z Radaru przy decyzji „Pożyczka” w imporcie, bo dziś każda pożyczka z importu jest bez `loanId`.

## N15. „Zapamiętaj” i decyzja zbiorcza w Operacjach uczą regułę z nazwy poprawionej przez użytkownika, a import szuka jej po nazwie z banku

Priorytet: średni · obszar: import (logika)

Gdzie: `src/renderer/features/import/rules.ts:15`, `src/renderer/features/import/rules.ts:25-36`, `src/renderer/features/import/rules.ts:42-55`, `src/renderer/features/operations/OperationEditor.tsx:206`, `src/renderer/features/operations/OperationEditor.tsx:237-245`, `src/shared/import/reconcile.ts:135-136`, `src/shared/import/reconcile.ts:529-531`, `src/shared/import/similar.ts:149-151`

**Co się dzieje.** Operacja z importu „SKLEP U ELI”. Użytkownik zmienia jej kontrahenta w edytorze na „Warzywniak pani Eli”, wybiera kategorię i klika „Zapamiętaj: „Warzywniak pani Eli” → Spożywcze”. Toast obiecuje: „Kolejne importy skategoryzują go same”. Reguła powstaje jednak na kluczu `warzywniakpanieli` (targetOf bierze t.counterparty), a kolejny wiersz z banku ma markę `sklepueli`, więc zostaje „do decyzji”. Przycisk znika, bo ruleFor(t) liczy tę samą nazwę. Gdzie indziej import pilnuje, że nazwę mógł zmienić użytkownik: rozliczanie nierozliczonych porównuje `tx.bank.counterparty` („the user may have renamed it”), a settle zachowuje zmienioną nazwę. similar.ts zakłada przy tym, że etykieta reguły to nazwa z banku – tu jest nazwą użytkownika. Tak samo uczy się decyzja zbiorcza „zapamiętaj dla marek” (rememberBrands).

**Poprawka.** W rules.ts liczyć cel reguły tak samo jak `classifyRow`, czyli z danych banku: `const targetOf = (t) => ruleTargetOf({ counterparty: t.bank ? t.bank.counterparty : t.counterparty, title: t.title, operation: t.bank?.operation, bankName: t.bank?.bankName }, aliasesNow())`. `bank.counterparty` = '' daje rodzaj operacji, tak samo jak w imporcie. Etykieta: `brand.brand?.label ?? (t.bank?.counterparty || t.counterparty)`. `ruleFor` korzysta z tego samego `targetOf`, więc przycisk zostaje spójny. W tekście przycisku i komunikacie warto pokazać nazwę z banku (np. „„MOKKA SP Z O O” (Kawiarnia Mokka) → …”), żeby użytkownik wiedział, czego reguła się nauczy.

## N16. Propozycja reguły na słowo pokazuje inną decyzję niż ta, którą zapisuje

Priorytet: średni · obszar: import (logika)

Gdzie: `src/renderer/features/import/Learning.tsx:133`, `src/renderer/features/import/Learning.tsx:141`, `src/renderer/features/import/Learning.tsx:145`, `src/renderer/features/import/rules.ts:73-77`

**Co się dzieje.** Użytkownik decyduje grupę jako „Finansuje: Anna · Jedzenie” albo „Od domownika: Anna”. Pod grupą pojawia się „Reguła na słowo – Jedzenie” (albo „– Wpływ”), a toast po kliknięciu mówi „Słowo „x” → Wpływ”. saveKeywordRule zapisuje jednak refundable / household z osobą, a w Ustawieniach ta sama reguła wyświetla się przez ruleDecisionText jako „finansuje: Anna · Jedzenie” / „od domownika: Anna”. Jedna reguła ma więc dwa różne opisy, a przy propozycji nie widać, że słowo przypisze pieniądze lub zakupy osobie.

**Poprawka.** W RuleProposal (i w toaście) opisywać decyzję jak w Ustawieniach: ruleDecisionText({ kind: choice.kind, categoryId: choice.categoryId, refundable: choice.refundable, household: choice.household, memberId: choice.memberId, … } as ImportRule, cats.label, members), np. „Reguła na słowo – finansuje: Anna · Jedzenie”. Rozważyć też, by dla refundable / household nie proponować słów (pieniądze osoby to raczej decyzja na kontrahenta, nie na słowo).

## N17. Kopie konfliktu chmury nie mają „Scal” – jedna strona przepada w całości, choć okno zmian z drugiego komputera umie scalać tę samą sytuację

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/features/sync/SyncPage.tsx:63`, `src/renderer/features/sync/SyncPage.tsx:81`, `src/main/datastore/store.ts:945`, `src/shared/merge.ts:86`, `src/renderer/features/sync/RemoteChangesDialog.tsx:143`, `docs/specyfikacja.md:365`

**Co się dzieje.** Laptop offline: import dodaje 20 reguł i słów kluczowych do fi.json; w tym czasie na komputerze stacjonarnym użytkownik dodaje domownika. Po połączeniu OneDrive zostawia fi-LAPTOP.json. Strona Synchronizacja oferuje tylko „Zachowaj tę wersję” dla jednej strony – reguły z laptopa albo nowy domownik znikają w całości (do Kosza). To samo dla operacji zmienionej na obu (notatka tam, kategoria tu). Gdy ta sama sytuacja zdarzy się przy otwartym folderze (zmiana przychodzi z watchera), okno „Zmiany z drugiego komputera” scala pole po polu (merge3, listy po id) i pyta tylko o pola zmienione po obu stronach. Specyfikacja: „Działają te same mechanizmy: … scalanie zmian z drugiego komputera i rozwiązywanie konfliktów”. fi.json – plik zapisywany najczęściej (reguły, log importu, domownicy) – jest najbardziej narażony.

**Poprawka.** Najpierw (pilne): w resolveConflict przed nadpisaniem oryginału odłożyć jego wersję do historii, np. `await this.history.snapshot(kind, canonicalState.record, 'discarded')` (dla fi: 'fi'), albo przenieść plik oryginału do Kosza przed zapisem. Przy „Zachowaj oryginał” też odłożyć kopię do historii, a nie tylko do Kosza. Potem dodać „Scal” w ConflictCard: merge3(baza, oryginał, kopia). Baza to najnowsza wersja z .history/ o updatedAt nie późniejszym niż obie strony. Bez bazy (undefined) każda różnica jest konfliktem do wyboru pole po polu, tą samą tabelą co w RemoteChangesDialog. Wynik zapisać przez saveRecord / saveSettings (stempel, historia), a plik kopii usunąć.

## N18. Historia zapisywana dla wszystkich wpisów, ale do obejrzenia tylko dla operacji, kontenerów i ustawień, mimo tekstów „jest w historii wpisu”

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/features/operations/OperationEditor.tsx:114`, `src/renderer/features/cargo/CargoPage.tsx:270`, `src/renderer/features/sync/SyncPage.tsx:305`, `src/renderer/features/sync/RemoteChangesDialog.tsx:222`, `src/renderer/features/settings/SettingsPage.tsx:133`, `src/main/datastore/store.ts:836`

**Co się dzieje.** Plan miesiąca (pensja, koperty, łupy), cel na Mapie gwiezdnej, pożyczka, saldo albo dokowanie zmienia się na drugim komputerze. Użytkownik wybiera w oknie „Weź z …” albo „Zachowaj moją”. Okno zapewnia: „Wybrana do odrzucenia wersja nie ginie – jest w historii wpisu”, a Ustawienia → Praca na kilku komputerach: „Odrzucona wersja zostaje w historii wpisu”. Main rzeczywiście odkłada wersje do .history/ dla każdej kolekcji (test fs „cel i plan miesiąca też mają historię”). Przycisk „Historia” istnieje jednak tylko w edytorze operacji, kontenera i dla fi.json. Dla planu miesiąca, celu, pożyczki, salda i dokowania nie ma w interfejsie drogi do tej wersji. Zostaje tylko „Usunięte wpisy”, które pokazuje wyłącznie usunięte.

**Poprawka.** Dodać HistoryButton w Planie miesiąca (kind 'months', id planu bieżącego / wybranego miesiąca), na Mapie gwiezdnej przy celu, w Radarze przy pożyczce oraz przy saldach i dokowaniach (np. w ich oknach / wierszach). Dodatkowo w RemoteChangesDialog przy każdym ItemCard dać link „Historia” (HistoryDialog dla item.collection / item.id), niezależnie od ekranu. Ewentualnie złagodzić tekst do „jest w folderze .history”, dopóki przyciski nie powstaną.

## N19. Kopia dzienna (D31 „codziennie”) robi się tylko przy otwarciu folderu, a aplikacja z założenia żyje tygodniami w zasobniku (D64)

Priorytet: średni · obszar: folder danych i synchronizacja, proces główny i okna

Gdzie: `src/main/index.ts:411`, `src/main/datastore/backup.ts:52`, `src/renderer/features/settings/SettingsPage.tsx:277`, `docs/decyzje.md:48`, `docs/specyfikacja.md:360`

**Co się dzieje.** D31 i specyfikacja mówią „Kopie zapasowe – codziennie (30 ostatnich)”. FI startuje z Windows ukryty w zasobniku, a X chowa okno do zasobnika (D64), więc aplikacja na laptopie usypianym zamiast wyłączanego działa bez restartu dniami albo tygodniami. runBackups wywołuje się wyłącznie w openFolder: nie ma timera ani reakcji na wybudzenie. Przez cały ten czas nie powstaje żadna kopia dzienna, choć użytkownik importuje i edytuje dane. Tekst w Ustawieniach („Przy każdym starcie raz dziennie”) opisuje kod, ale nie obietnicę D31.

**Poprawka.** W main dodać sprawdzanie kopii dziennej w tle: np. w heartbeat albo osobnym timerze co godzinę oraz po powerMonitor.on('resume') wołać runBackups(store.root, store.backupsDir) (jest idempotentne – zwraca null, gdy dzisiejsza kopia istnieje), tylko gdy folder nie jest tylko do odczytu i nie trwa otwieranie. Poprawić T20 w docs/decyzje.md i tekst w Ustawieniach na „raz dziennie (przy starcie i w tle, gdy aplikacja działa)”.

To samo zgłoszone też jako: „Kopia „codzienna” (D31) robi się tylko przy otwarciu folderu – aplikacja w zasobniku tygodniami nie robi kopii”.

## N20. Baner „Ten folder jest też otwarty na: …” stale widoczny, bo aplikacja zgodnie z D46/D64 działa w tle na każdym komputerze (heartbeat w OneDrive co minutę całą dobę)

Priorytet: średni · obszar: proces główny i okna

Gdzie: `src/renderer/app/Banners.tsx:84`, `src/main/index.ts:268`, `src/main/index.ts:410`, `src/main/datastore/presence.ts:8`

**Co się dzieje.** Dwa komputery (D2, „nigdy jednocześnie”), na obu kreator włączył start z Windows, X chowa do zasobnika. Komputer stacjonarny stoi włączony z FI w zasobniku, użytkownik pracuje na laptopie. Proces główny stacjonarnego pisze heartbeat co 60 s także przy ukrytym oknie, więc laptop cały czas pokazuje baner „Zamknij tam aplikację, żeby uniknąć konfliktów” – a „zamknięcie” X niczego nie zmienia (tylko „Zakończ” z zasobnika, co wyłącza powiadomienia, o które chodzi w D64). Ukryta kopia dalej zapisuje w tle (zamrażanie gry, synchronizacja celów ICTTJ), więc ostrzeżenie dotyczy realnego stanu, który aplikacja sama domyślnie wymusza. Przy okazji: plik w `.presence/` zmienia się co minutę całą dobę, więc OneDrive synchronizuje go bez przerwy także w nocy.

**Poprawka.** W pliku obecności zapisywać stan „aktywny” (okno widoczne / ruch w ostatnich minutach) albo „w zasobniku”. Baner z prośbą o zamknięcie tylko dla aktywnych, dla kopii w zasobniku łagodniejsza informacja z możliwością ukrycia. W zasobniku heartbeat rzadziej (5–10 min). Ukryta kopia, która widzi aktywny inny komputer, wstrzymuje zapisy w tle (wzór ICTTJ releaseOpen). Tekst banera: „Zakończ” z menu ikony zamiast „zamknij”.

## N21. Mostek pokazuje „wolne do decyzji” przy niepełnym kadłubie, a dopłata do XTB z tej kwoty łamie firewall

Priorytet: średni · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:931`, `src/shared/calc/fleet.ts:680`, `src/renderer/features/bridge/BridgePage.tsx:381`, `docs/specyfikacja.md:127`

**Co się dzieje.** Kadłub ma 5 000 / 21 900 zł (obniżony w kreatorze albo jeszcze niepełny). Łupy bez decyzji idą 8. dnia do osłon (D18), więc osłony mają 19 000 / 12 000 zł. Mostek pokazuje „wolne do decyzji: 7 000 zł”. Według specyfikacji dopłata do XTB jest dozwolona tylko z „wolnego do decyzji”. Użytkownik dopłaca 7 000 zł zgodnie z rozkazem i dostaje czerwony alarm firewall oraz poważne naruszenie w grze, bo silnik wymaga też pełnego kadłuba (T31). Według kolejności dokowania (D13) „wolne” to dopiero reszta po kadłubie i celach.

**Poprawka.** `free` liczyć jako max(0, osłony − cel) tylko przy hull ≥ cel kadłuba (zgodnie z D23 i firewall), inaczej 0. Albo na Mostku zmienić podpis przy niepełnym kadłubie na „ponad cel osłon (kadłub niepełny – nie do dopłaty XTB)”. Poprawić tekst kreatora (WizardPage.tsx:230). Celów nie dodawać do warunku firewall (D23).

## N22. Mostek („Układy gwiezdne · cele”) i Mapa gwiezdna („w celach”) pokazują różną sumę pieniędzy w celach, gdy zarchiwizowany cel ma środki

Priorytet: niski · obszar: całość, domownicy i ICTTJ, Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/bridge/BridgePage.tsx:375`, `src/renderer/features/bridge/BridgePage.tsx:387`, `src/renderer/features/starmap/StarMapPage.tsx:40`, `src/renderer/features/starmap/StarMapPage.tsx:49`, `src/shared/calc/fleet.ts:933`

**Co się dzieje.** Cel „Rower” ma 800 zł i zostaje zarchiwizowany – ręcznie albo dlatego, że cel ICTTJ wypadł ze scenariusza (T66: archiwizacja zachowuje środki, „środki zarchiwizowanego celu zostają w nim”). Mostek → Stan okrętu pokazuje „Układy gwiezdne · cele 800,00 zł”, a nagłówek Mapy gwiezdnej „w celach 0,00 zł”. Te 800 zł widać tam tylko w panelu „Zarchiwizowane”. Z aktywnym celem A (500 zł) i zarchiwizowanym B (700 zł): Mostek 1 200 zł, Mapa 500 zł. Ta sama warstwa okrętu ma na dwóch ekranach dwie wartości.

**Poprawka.** Na Mapie gwiezdnej w nagłówku „w celach X” liczyć wszystkie środki warstwy (jak Mostek) i dopisać „w tym zarchiwizowane Y”, gdy Y > 0. Alternatywa: Mostek pokazuje „cele X (w tym zarchiwizowane Y)”.

To samo zgłoszone też jako: „Suma celów: Mapa gwiezdna pomija zarchiwizowane cele, a Mostek je liczy”; „Środki w celach: Mostek liczy cele zarchiwizowane, Mapa gwiezdna już nie”.

## N23. „Budżet jeszcze nie wystartował” (baner, kreator) przy budżecie, który silnik już prowadzi od salda otwarcia (T25)

Priorytet: niski · obszar: całość

Gdzie: `src/renderer/app/Banners.tsx:98-104`, `src/renderer/features/wizard/state.ts:66`, `src/shared/calc/fleet.ts:200-203`, `src/renderer/store/game.ts:44-48`, `src/renderer/features/balances/actions.ts:37-40`

**Co się dzieje.** Nowy użytkownik importuje historię i w Ustawienia → Konta klika „Ustaw z salda w banku”. Powstaje saldo otwarcia na dzień pierwszej operacji (np. rok wstecz). Silnik (budgetStartOf) uznaje budżet za działający od tamtej daty: Mostek pokazuje „Stan okrętu”, a useGameAdvance ustawia start gry. Baner dalej mówi „Budżet jeszcze nie wystartował” (sprawdza tylko settings.budget.start), a kreator pozwala uruchomić budżet ponownie i przesuwa start na dziś. Gra ma wtedy start i zamrożone dni sprzed kreatora, ocenione bez planu i bez pensji. T51 („działający budżet nie uruchamia kreatora drugi raz”) jest obchodzony.

**Poprawka.** Grę startować dopiero po kreatorze: w useGameAdvance warunek `fi.settings.budget.start && fleetNow()?.started`. W banerze przy fleet.started bez settings.budget.start inny tekst, np. „Budżet liczy się od salda otwarcia – kreator ustawi pensję, warstwy i koperty”. Decyzję dopisać jako T-decyzję obok T25 i T51.

## N24. „Wpływy” w Operacjach i w Raportach / eksporcie to różne wielkości pod tą samą nazwą, a ta sama średnia raz jest „wpływami”, raz „przychodem”

Priorytet: niski · obszar: całość, gra, Wywiad, raporty

Gdzie: `src/shared/operationsView.ts:117-138`, `src/renderer/features/operations/OperationsPage.tsx:435`, `src/shared/export/budget.ts:136`, `src/shared/export/budget.ts:140`, `src/renderer/features/reports/ReportsPage.tsx:134`, `src/renderer/features/reports/ReportsPage.tsx:376`, `src/renderer/features/reports/ReportsPage.tsx:382`, `src/shared/calc/income.ts:51-81` …

**Co się dzieje.** Tydzień: wypłata 6 000 zł, Mama oddaje 500 zł za zakupy, zwrot towaru 50 zł. Operacje (filtr na ten tydzień) pokazują „Wpływy +6 550 zł”, czyli wszystkie pieniądze na plus. Raport wachty pokazuje „Wpływy 6 000 zł”, czyli przychód wg D81 bez spłat domowników i zwrotów. Przegląd roczny i kolumna CSV / Excel „Wpływy (zł)” też pokazują przychód. Tak samo w skali miesiąca: pensja 6 000 zł, zwrot od Mamy 400 zł, pożyczka 2 000 zł i wypłata z XTB z puli Podatek 1 000 zł dają w Operacjach 9 400 zł, a w Raportach → Miesiące 6 000 zł. Z kolei alarm i Plan miesiąca mówią „Pensja wyższa niż średnie wpływy z 6 mies.”, a panel tuż obok podaje tę samą liczbę jako „średni przychód (6 mies.)” (FleetState.income = windows[6].total). Ta sama etykieta daje dwie kwoty bez wyjaśnienia, czym się różnią.

**Poprawka.** Przychód wg D81 nazywać wszędzie „Przychody”: raport wachty, przegląd roczny (linia i kolumna tabeli), nagłówek CSV / Excel 'Wpływy (zł)' → 'Przychody (zł)', tekst alarmu salary-above-income → „średni przychód z 6 mies.”. W Operacjach zostawić sumę brutto z podpowiedzią (title), np. „Wpływy na konta (z oddanymi przez domowników, zwrotami i pożyczkami) – to nie przychód”. Zmiana tekstu ze specyfikacji (:123) wymaga jednego zdania w decyzjach.

To samo zgłoszone też jako: „Ta sama liczba nazywa się „Wpływy” w raportach i eksporcie, a „Przychody” w panelu D81”.

## N25. Debriefing: wiersze nie składają się na „Koszty netto”, a w Raportach i PDF brakuje „Bez kategorii”

Priorytet: niski · obszar: całość

Gdzie: `src/shared/calc/plan.ts:303`, `src/shared/calc/plan.ts:312`, `src/renderer/features/month/MonthPage.tsx:311`, `src/renderer/features/reports/ReportsPage.tsx:241`, `src/renderer/features/reports/ReportsPage.tsx:256`

**Co się dzieje.** Październik: Koszty netto 4 700 zł = ładownia 1 200 + koperty 3 000 + 500 bez kategorii. Plan miesiąca pokazuje wiersz „Bez kategorii 500 zł”, a debriefing w Raportach i jego PDF – nie (suma wierszy 4 200 ≠ 4 700). Wydatki w kategorii głównej ustawionej na „bez koperty” nie trafiają nigdzie: ani do kopert, ani do „Bez kategorii”. Znikają z rozbicia na obu ekranach, choć są w „Koszty netto”, a Wywiad → Wydatki w czasie je pokazuje.

**Poprawka.** Dodać do Debriefing pole `outside` (wydatki kategorii głównych bez koperty) i pokazywać je w Planie miesiąca, w Raportach i w PDF obok „Bez kategorii”. Wiersz „Bez kategorii” dodać też do sekcji „Wynik wobec planu” w ReportsPage, tak żeby ładownia + Σ wydane w kopertach + bez koperty + bez kategorii = koszty netto.

## N26. Raporty: debriefing i odprawa bez elementów ze specyfikacji (seria, trafność dziennika, plan następnego miesiąca, Daily Bias)

Priorytet: niski · obszar: całość, gra, Wywiad, raporty

Gdzie: `src/renderer/features/reports/ReportsPage.tsx:241`, `src/renderer/features/reports/ReportsPage.tsx:268`, `src/renderer/features/reports/ReportsPage.tsx:80`, `src/renderer/features/intel/IntelPage.tsx:216`, `docs/specyfikacja.md:325`, `docs/specyfikacja.md:323`, `src/renderer/features/reports/ReportsPage.tsx:80-99`, `src/renderer/features/bridge/BridgePage.tsx:245-292` …

**Co się dzieje.** Specyfikacja: debriefing = „wynik wobec planu (FVG), seria, naruszenia, trafność dziennika, podział łupów, „miesiąc na plus”, plan następnego miesiąca”. Debriefing w Raportach (i PDF) nie ma serii ani planu następnego miesiąca. „Dziennik kapitański” pokazuje tylko liczby plan / impuls – trafność w % jest tylko w Wywiadzie. Zakładka „Odprawa” w Raportach nie ma Daily Bias, choć specyfikacja wymienia go jako pierwszy element odprawy (Mostek go pokazuje).

**Poprawka.** W ReportsPage → BriefingReport dodać wiersz Daily Bias (dailyBias(fleet), BIAS_LABEL), jak na Mostku. W sekcji „Dziennik kapitański” debriefingu dodać trafność (plan ÷ oznaczone, jak w IntelPage). Seria i plan następnego miesiąca nie są wymagane (D73, T83); jeśli mają zostać poza raportem, dopisać to wprost w T83.

To samo zgłoszone też jako: „Odprawa w Raportach różni się od odprawy na Mostku: bez Daily Bias, bez „Odsłuchaj”, bez Silver Bullet”.

## N27. Odsłuch odprawy: ujemna energia czytana jako 0 zł, brak zachowania z T7

Priorytet: niski · obszar: całość, Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/bridge/BridgePage.tsx:222`, `src/renderer/features/bridge/BridgePage.tsx:258`, `src/renderer/features/bridge/BridgePage.tsx:95`, `src/renderer/features/bridge/BridgePage.tsx:289`, `docs/decyzje.md:258`, `src/renderer/features/bridge/BridgePage.tsx:231`, `docs/specyfikacja.md:323`

**Co się dzieje.** Dzień jest przekroczony o 50 zł. Mostek pokazuje na czerwono „−50,00 zł” i Daily Bias Bearish, a „Odsłuchaj” mówi „Energia na dziś: 0 złotych.” i obcina grosze. Bez polskiego głosu w systemie przycisk zostaje i czyta polski tekst domyślnym (np. angielskim) głosem. T7 mówi: „brak polskiego głosu → przycisk ukryty + podpowiedź o pakiecie mowy”. Komunikat „Brak głosu systemu do odsłuchu” pojawia się tylko wtedy, gdy nie ma speechSynthesis wcale.

**Poprawka.** Dla d.left < 0 czytać „Energia na dziś przekroczona o X złotych”. Stan „jest polski głos” wyliczać z getVoices() i aktualizować przy zdarzeniu speechSynthesis 'voiceschanged'. Bez głosu pl-* ukryć „Odsłuchaj” i pokazać podpowiedź o pakiecie mowy Windows (T7).

To samo zgłoszone też jako: „Odsłuch odprawy niezgodny z T7: przycisk zawsze widoczny, bez podpowiedzi o pakiecie mowy, bez trybu automatycznego”.

## N28. Kliknięcie alarmu w odprawie zawsze prowadzi do Planu miesiąca

Priorytet: niski · obszar: całość, Mostek, Radar, Mapa, Ustawienia, silnik budżetu

Gdzie: `src/renderer/features/bridge/BridgePage.tsx:73`, `src/renderer/features/bridge/BridgePage.tsx:85`, `src/renderer/features/bridge/BridgePage.tsx:406`, `src/shared/calc/briefing.ts:158`, `src/renderer/features/balances/actions.ts:60`, `src/shared/calc/briefing.ts:190`, `src/renderer/features/starmap/StarMapPage.tsx:245`, `src/renderer/store/notifier.ts:54`

**Co się dzieje.** Odprawa: „Masa ładunku ponad linią zanurzenia.” – kliknięcie otwiera Plan miesiąca, choć kafelek „Masa ładunku” na tym samym Mostku prowadzi do Ładowni. „Rozbieżność w ładowni: korekta … do wyjaśnienia” – też Plan miesiąca, choć toast potwierdzenia salda mówi „dodano korektę do wyjaśnienia (Operacje)”. „Firewall: dopłata do XTB…” i „Za mało w zbiorniku …” – również Plan miesiąca.

**Poprawka.** W openTarget dla t === 'alarm' odczytać rodzaj z key (`key.split(':')[1]`): cargo-over i sinking-short → Ładownia, correction → Operacje z wybraną korektą (txId jest w kluczu), firewall → Operacje, envelope-over i daily-over → Plan miesiąca; reszta (pensja, osłony, deficyt) → Plan miesiąca albo Mostek.

To samo zgłoszone też jako: „Kliknięcie alarmu w odprawie zawsze prowadzi do Planu miesiąca, także przy korekcie salda i masie ładunku”; „Kolor i nawigacja: ETA po terminie na czerwono, a kliknięcie każdego alarmu odprawy prowadzi do Planu miesiąca”.

## N29. Dowództwo opisuje rozkaz „Dzienny przydział energii” wzorem podstawowego przydziału, a egzekwuje coś innego

Priorytet: niski · obszar: całość

Gdzie: `src/renderer/features/command/CommandPage.tsx:368`, `src/shared/calc/fleet.ts:130`, `src/shared/calc/game.ts:205`

**Co się dzieje.** Rozkazy i progi: „Dzienny przydział energii – koperty codzienne ÷ dni miesiąca”. Naruszenie liczy się jednak wtedy, gdy energia dziś spadnie poniżej zera, a energia dziś to pozostała suma kopert ÷ pozostałe dni (z dziś), po przeniesieniach i przekroczeniach. Po oszczędnym tygodniu można bez naruszenia wydać więcej niż „koperty ÷ dni miesiąca”, a po przekroczeniu – mniej. Opis rozkazu wprowadza w błąd.

**Poprawka.** Zmienić opis rozkazu na „wydatki dnia ≤ energia dziś (pozostałe koperty codzienne ÷ dni do końca miesiąca)”, ewentualnie z dopiskiem „podstawowy: koperty codzienne ÷ dni miesiąca”.

## N30. Specyfikacja odprawy i powiadomień: brak godziny odprawy, automatycznego odsłuchu i godzin powiadomień; Silver Bullet nie skraca odprawy

Priorytet: niski · obszar: całość, proces główny i okna

Gdzie: `docs/specyfikacja.md:323`, `docs/specyfikacja.md:334`, `docs/specyfikacja.md:277`, `src/shared/machine.ts:18`, `src/shared/notify.ts:46`, `src/renderer/features/bridge/BridgePage.tsx:269`, `src/renderer/features/bridge/BridgePage.tsx:278`, `src/renderer/features/settings/MachineTabs.tsx:89` …

**Co się dzieje.** Specyfikacja: odprawa „przy pierwszym uruchomieniu … albo o ustalonej godzinie”, odsłuch „przyciskiem albo automatycznie”, „Każde powiadomienie ma własny przełącznik i godzinę”, a Mostek ma „później radar, wywiad i krzywą majątku”. W kodzie godzinę ma tylko wieczorne dopisanie: odprawy nie da się ustawić na godzinę, automatycznego odsłuchu nie ma, Mostek nie ma radaru ani krzywej. T80: „Silver Bullet = odprawa skrócona do 3 zdań”, a w kodzie blok Silver Bullet jest dokładany nad pełną listą pozycji. Odprawa między 10:00 a 11:00 NY jest więc dłuższa, nie krótsza.

**Poprawka.** Najtaniej: dopisać do docs/specyfikacja.md i T56 / T80 stan kodu. Odprawa przy pierwszym otwarciu po ciszy nocnej (D70), odsłuch przyciskiem (D49), godzina tylko przy wieczornym dopisaniu, radar i krzywa majątku na osobnych ekranach. Ewentualnie w oknie Silver Bullet zwinąć listę pozycji (pokazać tylko 3 zdania i „pokaż wszystko”) i czytać głosem tylko te 3 zdania – wtedy T80 będzie spełnione dosłownie.

To samo zgłoszone też jako: „Specyfikacja: „każde powiadomienie ma własny przełącznik i godzinę”, odprawa „albo o ustalonej godzinie” – godzinę ma tylko wieczorne dopisanie”.

## N31. Mostek: „Masa ładunku” bez prawdziwej nazwy i kwoty (reguła D34)

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, gra, Wywiad, raporty, silnik budżetu

Gdzie: `src/renderer/features/bridge/BridgePage.tsx:406`, `src/renderer/features/bridge/BridgePage.tsx:408`, `src/renderer/features/cargo/CargoPage.tsx:323`, `src/renderer/features/wizard/WizardPage.tsx:143`, `src/renderer/features/wizard/WizardPage.tsx:147`, `src/renderer/features/wizard/WizardPage.tsx:234`, `src/renderer/features/wizard/WizardPage.tsx:242`, `src/renderer/features/month/MonthPage.tsx:163` …

**Co się dzieje.** Stan okrętu na Mostku pokazuje „Masa ładunku 37,5% · linia 40%” – bez „stałe koszty” i bez kwoty miesięcznie. Ładownia pokazuje tę samą wielkość jako „37,5% pensji · linia 40% · 1 500,00 zł miesięcznie”. CLAUDE.md i D34: metafora zawsze z prawdziwą nazwą i kwotą obok. Pozostałe linie Mostka (Osłony · bufor na pensje, Kadłub · fundusz awaryjny…) tę regułę spełniają.

**Poprawka.** BridgePage.tsx:409 – podpis zmienić na `stałe koszty {zl(fleet.cargo.monthly)}/mies. · linia {fleet.cargo.limitPct}%` (zl maskuje przy Ctrl+$).

To samo zgłoszone też jako: „Kreator i Plan miesiąca: metafory bez prawdziwej nazwy (D34)”; „Metafory bez prawdziwej nazwy i kwoty w Dowództwie i Wywiadzie; ułamek z kropką”; „Teksty alarmów: metafora bez prawdziwej nazwy i kwoty, nieścisłe „z 6 mies.””; „Drobne teksty: niejednoznaczne „Kto pożycza”, metafora „Masa ładunku” bez prawdziwej nazwy”.

## N32. Próg dziennika kapitańskiego 0 zł: szybki wpis nigdy nie pyta, reszta aplikacji pyta o każdy wydatek

Priorytet: niski · obszar: całość, proces główny i okna, silnik budżetu

Gdzie: `src/renderer/features/quick/QuickApp.tsx:102`, `src/shared/calc/operations.ts:112`, `src/renderer/features/settings/MachineTabs.tsx:51`, `src/shared/calc/intel.ts:233`, `src/shared/calc/operations.ts:113`, `src/shared/operationsView.ts:39`, `src/shared/schema/budget.ts:131`

**Co się dzieje.** Użytkownik wpisuje w Warstwy i rozkazy „Dziennik kapitański od kwoty: 0”. Szybki wpis traktuje 0 jako „wyłączony” i nie pyta „Plan czy impuls?”. Operacje pokazują przy każdym wydatku znaczek „?”, Wywiad liczy wszystkie wydatki jako „bez oznaczenia”, a Dowództwo pisze „od 0,00 zł”.

**Poprawka.** W asksImpulse dodać `orders.impulseThreshold > 0 &&` (jedno znaczenie: 0 = wyłączone; QuickApp może wtedy wołać asksImpulse). Przy polu w Ustawieniach i kreatorze dopisać „0 albo puste = wyłączony”, a w Dowództwie pokazać „wyłączony” zamiast „od 0,00 zł”.

To samo zgłoszone też jako: „Próg dziennika kapitańskiego 0 zł: edytor pyta przy każdym wydatku, szybki wpis nigdy”; „Próg dziennika kapitańskiego 0 zł: szybki wpis nie pyta wcale, lista i edytor pytają przy każdym wydatku”.

## N33. Niespójne formaty kwot, dat i tekstów między ekranami

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, gra, Wywiad, raporty, proces główny i okna

Gdzie: `src/renderer/features/quick/QuickApp.tsx:104`, `src/renderer/app/App.tsx:240`, `src/renderer/features/reports/ReportsPage.tsx:256`, `src/renderer/features/month/MonthPage.tsx:317`, `src/renderer/features/intel/IntelPage.tsx:165`, `src/renderer/features/reports/ReportsPage.tsx:146`, `src/renderer/features/settings/AccountsTab.tsx:143`, `src/renderer/features/balances/actions.ts:39` …

**Co się dzieje.** - Ukryta kwota w szybkim wpisie to „•••”, w oknie głównym i zasobniku „••• zł”.
- FVG kopert: Plan miesiąca i Wywiad pokazują „+120,00 zł” na zielono, Raporty i PDF „120,00 zł” bez znaku.
- Raport wachty: kwoty dni bez „zł”.
- Daty: Ustawienia → Konta „ostatnio potwierdzone 2026-10-18”, toast „saldo otwarcia ustawione na początek 2026-10-01” i podpowiedź salda w Operacjach mają format ISO, wszędzie indziej „18.10.2026”.
- Dowództwo: „Do stopnia Chorąży/Porucznik” zamiast dopełniacza („chorążego”, „porucznika”).

**Poprawka.** Maska w szybkim wpisie jako `${AMOUNT_MASK} zł`. FVG w raportach przez wspólny helper ze znakiem (np. `signedPln`). Daty w UI i toastach przez plDate (z lib/format.ts). Dla stopni osobna mapa RANK_GENITIVE (kadeta, chorążego, porucznika, komandora, kapitana, admirała) albo zapis „Do stopnia: Chorąży”.

To samo zgłoszone też jako: „Daty w formacie ISO i natywne pola daty obok formatu 18.10.2026”; „Konta: „ostatnio potwierdzone” w formacie 2026-10-18 zamiast 18.10.2026”; „Różne formaty tych samych kwot i dat: FVG z „+” i kolorem w Wywiadzie, bez znaku w Raportach/PDF; data ISO w podtytule PDF”; „Nazwa eksportu ZIP z datą UTC, reszta aplikacji (i kopie dzienne) z datą lokalną/warszawską”.

## N34. Martwy kod: nieużywane formatery z ICTTJ, ekran-zaślepka i flaga „ready”

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, gra, Wywiad, raporty, import (logika), folder danych i synchronizacja, proces główny i okna, silnik budżetu

Gdzie: `src/renderer/lib/format.ts:4`, `src/renderer/lib/format.ts:41`, `src/renderer/lib/format.ts:62`, `src/renderer/lib/format.ts:85`, `src/renderer/features/screens/PlaceholderPage.tsx:27`, `src/renderer/app/App.tsx:232`, `src/renderer/app/App.tsx:188`, `src/shared/calc/plan.ts:188` …

**Co się dzieje.** lib/format.ts eksportuje fmtNum, fmtPercent, fmtAmount (kropka dziesiętna, „1 223.50 PLN”), fmtPct, fmtPctShort, toneClass i fmtPln (format „8 640 zł” bez groszy). Żadnego z nich nikt nie używa, a fmtPln sugeruje drugi format kwot, sprzeczny z formatPln („8 640,00”). PlaceholderPage i gałąź `pageDef(route.page)` w App są nieosiągalne, bo każda strona z PAGES ma swój komponent. Napis `ready` / `dim` „w przygotowaniu” nigdy się nie pokaże. plan.ts ma własną kopię activeIn z fleet.ts, OperationsPage – własny monthLabel, fields.tsx – własny plDate.

**Poprawka.** Usunąć nieużywane eksporty z lib/format.ts (zwłaszcza fmtPln z formatem bez groszy, sprzecznym z formatPln). Usunąć PlaceholderPage, gałąź w Page() i pole ready / dim (albo opisać je komentarzem jako świadomy wzór). activeIn w plan.ts importować z fleet.ts, a monthLabel i plDate z lib/format.ts.

To samo zgłoszone też jako: „Martwy kod: ekran-zaślepka, pola stage/ready, przygaszanie menu i rodzaj okna 'placeholder', do tego pozostałości ICTTJ”; „Martwy kod po etapach: PlaceholderPage i rodzaj okna 'placeholder', IPC copyText, AppInfo.isPortable, QuickEntry.isOpen”; „Martwe eksporty w lib/format.ts i zdublowane formatery”; „Martwy kod: `GameChange.events` liczone w advanceGame, ale nigdzie nieczytane (święta idą z dziennika wachty)”; „Martwy kod sugerujący niedokończone funkcje: importRecords, saveGenerated, powody historii „import” / „merge””; „Martwy kod i pola, które sugerują niedokończone funkcje”; „Nieaktualne komentarze i odwołania do nieistniejących decyzji (E0-2, E0-4, „stage E3”, „not used yet”, „EODHD key”)”; „Dokumentacja opisuje usunięte „Połącz wszystkie” i nieistniejące `mergePairs`”.

## N35. „Cofnij” niespójnie przy archiwizacji i zamykaniu

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, import (ekran)

Gdzie: `src/renderer/features/radar/actions.ts:143`, `src/renderer/features/radar/RadarPage.tsx:214`, `src/renderer/features/cargo/CargoPage.tsx:287`, `src/renderer/features/starmap/actions.ts:36`, `src/renderer/features/radar/RadarPage.tsx:217`, `src/renderer/features/starmap/actions.ts:35`, `src/renderer/features/settings/ImportTab.tsx:73`, `src/renderer/features/settings/ImportTab.tsx:129` …

**Co się dzieje.** Archiwizacja celu na Mapie gwiezdnej daje toast z „Cofnij”. „zamknij” pożyczki na Radarze działa od razu, bez potwierdzenia i bez „Cofnij”: znika należność albo dług, a kontener rat zostaje zarchiwizowany. Powrót jest tylko przez rozwinięcie „Zamknięte” → „otwórz”. Zrzut kontenera (przełącznik „Zarchiwizowany”) też nie ma „Cofnij”.

**Poprawka.** closeLoan z toastem „Cofnij” jak archiveGoal. Zapamiętać wcześniejsze `archived` kontenerów pożyczki i przy cofnięciu przywrócić dokładnie je (nie odarchiwizowywać wszystkich). Przełącznik kontenera może zostać bez zmian.

To samo zgłoszone też jako: „Pożyczki: „zamknij” bez komunikatu i „Cofnij”, „usuń” bez potwierdzenia – inaczej niż cele i operacje”; „„Cofnij” niekonsekwentnie w Ustawieniach → Import: pojedyncze „rozłącz” i „usuń” bez cofnięcia i bez komunikatu”; „Łączenie płatności z kontenerem bez „Cofnij”; dźwięk „wpis” tylko w szybkim wpisie”.

## N36. Formularze „Nowa pożyczka”, „Nowy kontener”, „Nowy cel” i podział łupów giną po przejściu na inny ekran

Priorytet: niski · obszar: całość

Gdzie: `src/renderer/features/radar/RadarPage.tsx:263`, `src/renderer/features/cargo/CargoPage.tsx:51`, `src/renderer/features/starmap/StarMapPage.tsx:295-297`, `src/renderer/features/month/MonthPage.tsx:281-282`, `src/renderer/app/App.tsx:265`

**Co się dzieje.** Radar → „Nowa pożyczka”: użytkownik wpisuje nazwę, kwotę 12 000 zł, 24 raty i datę pierwszej raty, po czym przechodzi Ctrl+5 do Ładowni, żeby sprawdzić masę ładunku. Gdy wrócisz, formularz jest pusty. Tak samo „Nowy kontener” (w tym propozycja z historii po „Do ładowni”), „Nowy cel” na Mapie gwiezdnej i wpisany podział łupów w debriefingu. Konwencja z CLAUDE.md: „Nowy wpis jest szkicem do pierwszej edycji; opuszczenie ekranu nigdy nie gubi zmian”. Operacje (szkic w store) i kreator (wizard/state.ts) tak działają.

**Poprawka.** Szkice tych formularzy trzymać w małym store zustand poza komponentem strony (np. `store/drafts.ts`, klucz per formularz: 'radar:newLoan', 'cargo:container', 'starmap:newGoal', 'month:loot:<RRRR-MM>'), jak robi to wizard/state.ts. Szkic czyścić po „Dodaj” / zapisie albo „Anuluj”. Szkic podziału łupów kluczować miesiącem i zerować, gdy decyzja dla tego miesiąca już istnieje (np. przyszła z drugiego komputera).

## N37. Ściągawka skrótów pokazuje stały „Ctrl Alt B”, choć skrót szybkiego wpisu można zmienić albo może się nie zarejestrować

Priorytet: niski · obszar: całość, Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/app/ShortcutsHelp.tsx:14`, `src/renderer/features/bridge/BridgePage.tsx:158-160`, `src/shared/machine.ts:67`, `src/renderer/features/bridge/BridgePage.tsx:159`, `src/renderer/features/settings/MachineTabs.tsx:125`, `src/renderer/app/App.tsx:203`

**Co się dzieje.** Użytkownik zmienił w Ustawienia → Powiadomienia i dźwięki skrót szybkiego wpisu na Ctrl+Shift+Spacja, albo Ctrl+Alt+B zajmuje inny program i globalShortcut się nie zarejestrował. Mostek pokazuje na przycisku aktualny skrót (shortcutLabel), a ściągawka (? / F1) dalej podaje „Ctrl Alt B”, który nic nie robi.

**Poprawka.** W ShortcutsHelp pierwszą kolumnę wiersza brać z `useMachine((s) => s.prefs.quickShortcut)` przez `shortcutLabel` (spacje zamiast „+”, jak reszta ściągawki), a przy '' pisać „brak skrótu”. Przy otwarciu ściągawki opcjonalnie wywołać `api.quickShortcutState()` i przy `registered === false` dopisać „zajęty przez inny program – Ustawienia → Powiadomienia i dźwięki”. To samo ostrzeżenie warto dodać w podpowiedzi przycisku `bridge-quick` na Mostku.

To samo zgłoszone też jako: „Ściąga skrótów podaje na sztywno Ctrl+Alt+B, choć skrót szybkiego wpisu można zmienić”.

## N38. Panel „Przychody” liczy wypłaty z puli Podatek sprzed startu budżetu (i niezadokowane) jako przychód z tradingu

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/income.ts:39`, `src/shared/calc/income.ts:62`, `src/shared/calc/fleet.ts:411`, `src/shared/calc/fleet.ts:421`, `docs/decyzje.md:232`, `docs/decyzje.md:771`

**Co się dzieje.** Budżet od 01.10. W sierpniu przyszła z XTB wypłata 9 000 zł z puli Podatek (wpis w ICTTJ ma pulę `tax`). Statystyki biorą całą historię (`firstFull` ze wszystkich operacji), ale pulę Podatek rozpoznają tylko po dokowaniu (`taxOfDockings`), a wpisów sprzed startu zadokować się nie da. Sierpień ma więc 9 000 zł przychodu z tradingu, a średnia z 6 miesięcy wynosi 4 500 zł/mies. To zawyża panel „Przychody” i może ukryć ostrzeżenie „pensja wyższa niż średnie wpływy”. D81 mówi wprost: trading „bez wypłat z puli Podatek”.

**Poprawka.** W computeFleet dołożyć do incomeContext.tax wpisy ICTTJ z pulą `tax` sparowane z operacją także przed startem (dopasowanie kwoty i okna jak w deliveries, bez dokowania). Wymaga przekazania wpisów ICTTJ do wejścia silnika albo osobnej mapy txId → pula liczonej w rendererze. Prościej: w panelu „Przychody” liczyć trading dopiero od startu budżetu, a dla historii pokazać dopisek, że wypłat sprzed startu nie da się rozdzielić na pule.

## N39. Szybki wpis zapamiętuje „przychód” domownika, którego nikt nie zapytał (edytor robi to tylko po jawnym wyborze)

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/store/quickHost.ts:159`, `src/renderer/features/quick/QuickApp.tsx:341`, `src/renderer/features/household/MemberPickers.tsx:126`, `src/renderer/features/household/MemberPickers.tsx:155`, `docs/decyzje.md:709`

**Co się dzieje.** Tata ma w Ustawieniach „pytaj”. W szybkim wpisie użytkownik wybiera „Od domownika: Tata”, a przełącznik od razu stoi na „przychód” (advance = inflow === 'advance', czyli false). Użytkownik niczego nie zmienia i zapisuje, a `rememberInflows([t])` wpisuje Tacie `inflow: 'income'`. Od tej pory import nie pyta i jego nadwyżki proponuje jako przychód. W edytorze operacji sam wybór osoby niczego nie zapamiętuje, `rememberInflows` wywołuje dopiero zmiana przełącznika (MemberPickers.tsx:155). T109 mówi o „pierwszej jawnej decyzji”.

**Poprawka.** W QuickDraft dodać flagę `advanceChosen` ustawianą tylko w onChange Segmented. W quickHost wołać rememberInflows tylko przy fladze albo gdy osoba nie ma 'ask'. Ewentualnie dla osoby z 'ask' pokazać przełącznik bez wyboru i wymagać go przed zapisem.

## N40. „Pokrywa” w edytorze wpłaty pokazuje zakupy otwarte dziś, a „+ także za” – stan sprzed wpłaty

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/features/household/MemberPickers.tsx:109`, `src/renderer/features/household/MemberPickers.tsx:115`, `src/renderer/features/household/MemberPickers.tsx:123`, `src/renderer/features/household/MemberPickers.tsx:164`, `docs/decyzje.md:734`

**Co się dzieje.** Mama: zakup A 02.10 za 100 zł, zakup B 06.10 za 50 zł, wpłata 09.10 na 100 zł, która spłaca A jako najstarszy. W edytorze tej wpłaty „Pokrywa” pokazuje tylko B, bo w dzisiejszym rejestrze A nie jest już otwarty, choć to właśnie A ta wpłata spłaca. Gdy późniejsza wpłata spłaciła B, lista dla 09.10 jest pusta. T112 mówi o „otwartych zakupach osoby do daty wpłaty”. W tym samym panelu „+ także za” czyta rejestr sprzed wpłaty (`useLedgerBefore`, T118), więc jedna sekcja liczy z dwóch różnych stanów.

**Poprawka.** Liczyć choices z `before` (rejestr bez tej wpłaty, stan tuż przed nią): `before ? balanceOf(before, id).open.filter(o => o.date <= t.date && !isOpeningItem(o.txId))` dla shareMembers, plus t.covers. Wtedy cała sekcja (Pokrywa i „+ także za”) czyta ten sam stan.

## N41. Seed 1.4.0 przenosi należność jako „saldo na start” z datą dnia rozliczeń – przypomnienie po 30 dniach znika na miesiąc, data najstarszego zakupu ginie

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/household.ts:207`, `src/renderer/features/household/actions.ts:113`, `src/shared/calc/briefing.ts:216`, `src/shared/calc/briefing.ts:221`

**Co się dzieje.** W 1.3.0 Mama ma do oddania 150 zł za zakup z 03.06, a odprawa i powiadomienie (D80 e) przypominają o tym od lipca. Pierwsze otwarcie 1.4.0 (18.10) zapisuje `opening.owed` 150 zł. Rejestr wstawia je jako otwartą pozycję `opening:<osoba>` z datą `from` = 18.10. `since` osoby to teraz 18.10, więc przypomnienie (> 30 dni) znika do 17.11. Potem mówi „saldo na start rozliczeń z 18.10 (31 dni)”, choć dług ma ponad 4 miesiące. Radar i Mostek też pokazują „od 18.10”. Klucz powiadomienia `house:<osoba>:<since>` się zmienia.

**Poprawka.** Dodać addytywnie `opening.since` (data najstarszej otwartej pozycji). Seed bierze ją z `balanceOf(before, id).since`, a `begin()` używa `m.opening.since ?? from` jako daty pozycji `opening:`. Ręczne saldo na start bez daty zostaje przy dniu rozliczeń. Folderom już po seedzie (1.4.0 działa od 18.10) jednorazowo uzupełnić `opening.since`: przeliczyć rejestr 1.3.0 do `since − 1` i wziąć datę jego najstarszej pozycji, jeśli `owed` zgadza się z `opening.owed`.

## N42. ETA i znaczek DOL zakładają kolejność listy, a wypłata z puli Cele wypełnia najpierw cele ICTTJ

Priorytet: niski · obszar: domownicy i ICTTJ, Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/shared/calc/goals.ts:117`, `src/renderer/features/starmap/StarMapPage.tsx:34`, `src/renderer/features/starmap/StarMapPage.tsx:37`, `src/shared/calc/fleet.ts:497`, `src/renderer/features/starmap/StarMapPage.tsx:90`

**Co się dzieje.** Lista: 1. „Rower” (własny, 2 000 zł), 2. „Wakacje” (ICTTJ, 5 000 zł). Do celów trafiają w praktyce prawie tylko wypłaty z puli Cele, bo zwykła dostawa dociera do celów dopiero po pełnych osłonach i kadłubie. Te wypłaty idą najpierw do celów ICTTJ (fillGoals, D72 / T65). `goalEtas` wypełnia jednak cele w kolejności listy, więc ETA „Roweru” wychodzi za 1 miesiąc, a w rzeczywistości rower nie dostaje nic, dopóki „Wakacje” nie są pełne. DOL („tu popłynie następna dostawa do celów”) wskazuje „Rower”, a następna wypłata z puli Cele pójdzie do „Wakacji”.

**Poprawka.** Policzyć tempo osobno: wpłaty puli Cele (zdarzenia `trading` z dokowaniem `pool: 'goals'`, z `dockingsByTx`) i resztę. W symulacji ETA co miesiąc rozdzielać najpierw część z puli Cele w kolejności ICTTJ → własne, potem resztę w kolejności listy. W podpowiedzi DOL dopisać, że wypłata z puli Cele trafi najpierw do pierwszego niepełnego celu ICTTJ (albo pokazać drugi znacznik).

To samo zgłoszone też jako: „DOL i ETA na Mapie gwiezdnej zakładają kolejność listy, a dostawy z puli Cele idą najpierw do celów ICTTJ (T65)”.

## N43. Zwrot do masy: teksty o wpływie i o firewallu nie pasują do wypływu i do puli Podatek

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/features/dock/DockingDialog.tsx:156`, `src/renderer/features/dock/DockingDialog.tsx:158`, `src/shared/calc/briefing.ts:121`, `src/shared/notify.ts:100`, `src/renderer/features/dock/DockPanel.tsx:71`, `src/renderer/features/dock/actions.ts:34`, `docs/decyzje.md:454`

**Co się dzieje.** Zwrot do masy bez pary w mBanku (wypływ do XTB) dostaje w oknie dokowania tekst „Wpływ z XTB w mBanku jeszcze nie przyszedł…” albo „W mBanku nie ma tej kwoty od XTB…”, czyli opis odwrotnego kierunku. Zwrot z puli Podatek nie ma firewalla (T65, okno pisze „wraca z rezerwy na PIT-38”), a odprawa i powiadomienie i tak mówią „do potwierdzenia – firewall” / „potwierdź w Financial Intel (firewall)”. Nazwy też się rozjeżdżają: „Wypłata ICTTJ” (panel), „Wypłata z ICTTJ” (okno), „Wypłata z konta tradingowego” i „Zwrot do konta tradingowego” (tytuł operacji Portfela) obok „Zwrot do masy”.

**Poprawka.** Teksty sekcji „Konto” uzależnić od `d.direction`, dla 'out' np. „Wypływu do XTB w mBanku jeszcze nie ma – FI czeka na import do …” / „W mBanku nie ma tego wypływu do XTB po 3 dniach roboczych – najpewniej z Portfela XTB”. W briefing.ts:121 i notify.ts:100 przy `e.pool === 'tax'` pisać „wraca z rezerwy na PIT-38”, bez „firewall”. Nazwy ujednolicić („Wypłata z ICTTJ” / „Zwrot do masy” – także w tytule operacji Portfela).

## N44. Okno dokowania przy wyłączonym rozkazie firewall twierdzi, że osłony i kadłub są pełne

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/features/dock/DockingDialog.tsx:83`, `src/renderer/features/dock/DockingDialog.tsx:199`, `src/shared/calc/fleet.ts:681`

**Co się dzieje.** Rozkaz „Firewall” jest wyłączony, a osłony stoją poniżej celu. Gdy pieniądze wracają do masy, silnik nie zgłasza alarmu, bo fleet.ts:681 wymaga `settings.orders.firewall`. Okno uznaje brak alarmu za zgodność i pisze „Dopłata z „wolnego do decyzji” przy pełnych osłonach i kadłubie – zgodnie z rozkazem.”, co jest nieprawdą.

**Poprawka.** Odczytać `orders.firewall` w oknie (useData). Przy wyłączonym rozkazie pisać: „Rozkaz firewall wyłączony – dopłata bez sprawdzania osłon i kadłuba”. Opcjonalnie liczyć warunek pełnych osłon i kadłuba osobno i dopisać, czy jest spełniony.

## N45. Pominięty wpis ICTTJ z parą w banku: wpływ wraca jako „bez wpisu w ICTTJ – dopisz wypłatę”

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/dock.ts:106`, `src/shared/calc/dock.ts:136`, `src/shared/calc/dock.ts:150`, `src/renderer/features/dock/DockingDialog.tsx:103`

**Co się dzieje.** „Pomiń wpis” jest w oknie dostępny także dla wpisu, który ma już parę w mBanku (`e && d.state !== 'docked'`). Po pominięciu wpis odpada przed szukaniem pary, a jego operacja zostaje w `free` i pojawia się jako „Wpływ z XTB … do zadokowania – dopisz wypłatę w ICTTJ” (`missingEntry: true`), choć wpis w ICTTJ istnieje. Odprawa przez 30 dni przypomina o dopisaniu wpisu, który użytkownik właśnie pominął.

**Poprawka.** W `deliveries` parować także pominięte wpisy. Operacji sparowanej z pominiętym wpisem nie pokazywać jako „bez wpisu” (`missingEntry: false`, dopisek „wpis ICTTJ pominięty – przywróć”, by zadokować z pulą). Przy „Pomiń wpis” dla wpisu z parą w banku zapytać, czy wpływ też nie należy do budżetu.

## N46. Cel ICTTJ w PLN bez kwoty („bierze wszystko odłożone w miesiącu”) nigdy nie dostaje pieniędzy z puli Cele

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/goals.ts:37`, `src/shared/ictj.ts:136`, `src/shared/calc/fleet.ts:501`, `src/renderer/features/starmap/StarMapPage.tsx:240`

**Co się dzieje.** W ICTTJ cel scenariusza w PLN może nie mieć ceny (`amount: null` = „cel bierze wszystko odłożone w swoim miesiącu”). FI zapisuje go z `target: 0`. `fillGoals` i `dockAmount` biorą `g.target − g.amount` = 0, więc wypłata z puli Cele przeznaczona w ICTTJ na ten cel trafia do celów własnych albo do osłon jako „wolne do decyzji”, a na Mapie gwiezdnej cel stoi z „bez kwoty”, bez paska i ETA. T66 opisuje tylko scenariusze w innej walucie.

**Poprawka.** Zachowanie widoczne dla użytkownika, więc najpierw pytanie z propozycją: (a) cel ICTTJ bez kwoty przyjmuje w swoim miesiącu (deadline) całą wypłatę z puli Cele, bez górnej granicy (wtedy fillGoals bez min z target dla `ictj.amount == null && currency === 'PLN'` w miesiącu celu), albo (b) zostaje tak jak jest, a Mapa gwiezdna mówi przy nim „bez kwoty w ICTTJ – wypłaty z puli Cele idą do następnych celów”. Wybrany wariant dopisać do T66.

## N47. Data rozliczeń wcześniejsza niż start budżetu jest pokazywana, choć silnik liczy od startu

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/features/settings/HouseholdTab.tsx:71`, `src/renderer/features/household/actions.ts:84`, `src/shared/calc/fleet.ts:209`

**Co się dzieje.** Seed 1.4.0 ustawił datę rozliczeń na dzień otwarcia folderu jeszcze przed kreatorem, a kreator wystartował budżet później. Albo użytkownik wpisuje datę sprzed startu budżetu. Ustawienia pokazują „Rozliczenia od: 01.09.2026”, a `settleFromOf` liczy od startu budżetu (np. 15.10) i nigdzie tego nie widać. Przelewy domowników między 01.09 a 15.10 liczą się w statystykach inaczej, niż mówi ekran.

**Poprawka.** W SinceRow pokazywać efektywną datę `useFleet()?.settleFrom` i przy `since < start` dopisać „(przed startem budżetu – liczone od DD.MM)”. Albo setHouseholdSince ma odrzucać datę sprzed startu budżetu z komunikatem, a kreator przy „Uruchom budżet” podnosić `since` < start do dnia startu.

## N48. Nowy cel wymaga kwoty > 0, a edycja pozwala ustawić 0 – cel bez słowa staje się „bez kwoty”

Priorytet: niski · obszar: domownicy i ICTTJ, Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/starmap/StarMapPage.tsx:242`, `src/renderer/features/starmap/StarMapPage.tsx:300`, `src/shared/calc/fleet.ts:67`

**Co się dzieje.** Przy „Dodaj cel” kwota 0 zostaje odrzucona („Podaj kwotę celu.”). Na liście celów można jednak wpisać 0 w polu kwoty: cel znika z kolejki dokowania (dockAmount bierze `g.target − g.amount` = 0), traci ETA i pasek, pokazuje „bez kwoty”, a „DOL” przeskakuje na następny cel, bez żadnej informacji.

**Poprawka.** Odrzucić target <= 0 również w edycji: w GridRow onChange `v != null && v > 0 ? patchGoal(...) : toast('Podaj kwotę celu.', 'error')`, ten sam komunikat co przy dodawaniu. Pole wraca wtedy do poprzedniej wartości. Jeśli „0 = wstrzymaj cel” ma zostać, to zamiast tego podpowiedź „cel bez kwoty nie dostaje dostaw – użyj archiwizacji”.

To samo zgłoszone też jako: „Mapa gwiezdna: kwota istniejącego celu przyjmuje 0, choć nowy cel bez kwoty jest odrzucany”.

## N49. Nieaktualny opis: przepływy domowników sprzed startu „dla statystyk” nigdy się już nie liczą

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/household.ts:5`, `src/shared/calc/income.ts:56`, `src/shared/calc/fleet.ts:209`, `docs/decyzje.md:693`

**Co się dzieje.** T106 i nagłówek household.ts:5–7 mówią, że przepływy sprzed startu budżetu zostają dla statystyk, czyli część wpłaty domownika liczy się jako przychód. Od 1.4.0 `settleFromOf` zwraca start budżetu także przy since = null, więc `incomeParts` (income.ts:56) uznaje całe pieniądze domownika sprzed startu za nieprzychód. Przepływy „przychód” sprzed startu nie są nigdzie używane. Kto czyta dokumentację, oczekuje innych liczb w panelu „Przychody”.

**Poprawka.** Poprawić komentarz w household.ts:5–7, np. „…the balances start at zero then; the flows before are kept for the editor's preview only – income statistics skip a member's money before the settlements' start (T119)”. W T106 dopisać „(od 1.4.0 przychód sprzed daty rozliczeń – patrz T119)”.

## N50. Filtr „Kategoria → bez kategorii” łapie wpływy, przelewy, XTB i zakupy domowników – inaczej niż oznaczenie „bez kategorii”

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/shared/operationsView.ts:87`, `src/shared/operationsView.ts:32`, `src/renderer/features/operations/OperationsPage.tsx:402`, `src/renderer/features/operations/OperationsPage.tsx:407`, `src/renderer/features/operations/OperationsPage.tsx:189`, `src/shared/operationsView.ts:89`

**Co się dzieje.** Użytkownik chce dokategoryzować wydatki: w Operacjach wybiera Kategoria → „bez kategorii”. Dostaje też wszystkie wpływy, przelewy własne, operacje XTB, pożyczki, korekty i zakupy finansowane przez domowników (wszystkie mają categoryId = null). Ten sam napis „bez kategorii” w menu Oznaczenia pokazuje tylko własne wydatki bez kategorii (marksOf wyklucza inne rodzaje i domowników). Kolumna Kategoria na liście też pisze „bez kategorii” tylko przy takich wydatkach. W drugą stronę: paragon podzielony z częścią bez kategorii nie ma oznaczenia „bez kategorii”, bo marksOf wymaga braku podziału. Debriefing pokazuje „Bez kategorii 40 zł”, a Oznaczenia → bez kategorii tej operacji nie znajdą. Gdy użytkownik zaznaczy wszystko (TickAll) i da „Ustaw”, toast liczy resztę jako „pominięte”. Powinno być tak, że „bez kategorii” znaczy wszędzie to samo.

**Poprawka.** Najprościej zmienić etykietę opcji filtra kategorii na „brak kategorii (wszystkie rodzaje)” albo „bez kategorii – wszystko”. Pełniej: jedna definicja „do skategoryzowania” (własny wydatek albo jego część bez kategorii, bez refundable) dla obu menu: matchesFilter dla '' bierze tylko takie wydatki i części (partsOf), a marksOf oznacza też podział z częścią bez kategorii.

To samo zgłoszone też jako: „Dwa filtry „bez kategorii” w Operacjach znaczą co innego”.

## N51. Filtr „Oznaczenia” działa jako I (AND), pozostałe menu jako LUB – ten sam wygląd, inne znaczenie

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/shared/operationsView.ts:92`, `src/shared/operationsView.ts:85`, `src/renderer/features/operations/OperationsPage.tsx:398`, `src/renderer/features/operations/OperationsPage.tsx:407`

**Co się dzieje.** Zaznaczenie w Koncie „mBank” + „Portfel XTB” albo w Rodzaju „Wydatek” + „Wpływ” pokazuje jedne LUB drugie. W Oznaczeniach „z banku” + „nierozliczona” (albo „plan” + „impuls”, „z banku” + „wpisana ręcznie”) daje pustą listę, bo oznaczenia muszą wystąpić wszystkie naraz, a te się wykluczają. Podsumowanie menu („2 z 9”) nie mówi o różnicy.

**Poprawka.** Najprościej: w oznaczeniach LUB wewnątrz grup wykluczających się (pochodzenie: z banku / nierozliczona / wpisana ręcznie; dziennik: plan / impuls) i I między grupami. Alternatywnie zostawić I, ale opisać to w menu („wszystkie zaznaczone naraz”) i wyszarzać oznaczenia wykluczone przez już zaznaczone.

## N52. Zaokrąglenie odkładki: Ładownia pokazuje Math.round, harmonogram i Plan – trunc z resztą w ostatniej racie

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/cargo/CargoPage.tsx:102`, `src/renderer/features/cargo/CargoPage.tsx:173`, `src/renderer/features/cargo/CargoPage.tsx:329`, `src/shared/calc/plan.ts:355`, `src/shared/calc/fleet.ts:92`

**Co się dzieje.** Opłata 200 zł co kwartał: lista kontenerów i podpowiedź cyklu („rata do zbiornika 66,67 zł – odkładka”) używają monthlyShare (Math.round). Silnik i Plan miesiąca używają harmonogramu T3 / T29: 66,66 + 66,66 + 66,68. Notka linii zanurzenia mówi „OC 1 240 zł rocznie = 103 zł miesięcznie”, a ekran obok pokazuje 103,33 zł (spec: 11 × 103,33 + 103,37).

**Poprawka.** W podpowiedzi cyklu pokazywać ratę z sinkingSchedule: „rata do zbiornika 66,66 zł (ostatnia 66,68 zł)”, gdy ostatnia się różni. Notkę linii zanurzenia zmienić na „OC 1 240 zł rocznie ≈ 103,33 zł miesięcznie”. Kolumnę „/m” i masę ładunku zostawić jako średnią, ale podpisać „średnio”. W WizardPage.tsx:75 liczyć obie części tą samą metodą.

## N53. Błędy językowe w tekstach ekranów

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator, gra, Wywiad, raporty, import (ekran), silnik budżetu

Gdzie: `src/renderer/features/month/MonthPage.tsx:149`, `src/renderer/features/wizard/WizardPage.tsx:114`, `src/renderer/features/cargo/actions.ts:76`, `src/renderer/features/cargo/CargoPage.tsx:361`, `src/renderer/features/command/Celebration.tsx:42`, `src/renderer/features/command/CommandPage.tsx:330`, `src/renderer/features/command/CommandPage.tsx:103`, `src/renderer/features/reports/ReportsPage.tsx:174` …

**Co się dzieje.** (1) Plan miesiąca: „pierwszy miesiąc budżetu: bez tego, co wydał przed startem” – trzecia osoba, choć reszta aplikacji zwraca się do użytkownika („wpisz”, „Twoje koszty”), a kreator pisze „wydano już”. (2) Kreator: „W budżecie: {n} operacji” bez odmiany („1 operacji”, „2 operacji”). (3) Łączenie płatności: „Połączono z kontenerem: 1 płatności” – bez odmiany. (4) Zbiorniki: „Za plan o 200 zł – kolejne raty będą większe.” – zdanie niegramatyczne (raczej „Poniżej planu o …”).

**Poprawka.** (1) „bez tego, co wydano przed startem”. (2) countLabel(n, 'operacja', 'operacje', 'operacji'). (3) countLabel(n, 'płatność', 'płatności', 'płatności'). (4) „Za planem o {zl(short)} – kolejne raty będą większe.” albo „Zbiornik poniżej planu o {zl(short)} – kolejne raty będą większe.”

To samo zgłoszone też jako: „Teksty UI: odmiana i interpunkcja („3 nowych wpisów”, „+1 dni”, „. – wykonana.”)”; „Błędy odmiany w tekstach importu („3 operacji”, „1 nowych”)”; „Błąd językowy „(1 dni)” w rozliczeniach z domownikami”.

## N54. Panel „Koperty” bieżącego miesiąca pomija kategorie bez koperty, a dla minionych miesięcy je pokazuje

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/month/MonthPage.tsx:266`, `src/shared/calc/fleet.ts:902`, `src/shared/calc/plan.ts:312`

**Co się dzieje.** Ten sam panel „Koperty” bierze wiersze z dwóch źródeł. Bieżący miesiąc idzie z silnika: tylko kategorie z limitem, a wydatków w kategorii bez koperty nie widać nigdzie poza „wydane” dnia. Miniony miesiąc idzie z debriefingu: także kategorie z wydatkami bez limitu, jako „X / 0,00 zł” na czerwono. Po przełączeniu miesiąca strzałką lista kopert zmienia skład, choć dane się nie zmieniły.

**Poprawka.** Jedna reguła. Panel „Koperty” pokazuje tylko kategorie z limitem: dla minionego miesiąca filtrować `brief.envelopes.filter(e => plan.envelopes[e.categoryId] != null)`. Wydatki bez koperty pokazywać w obu przypadkach osobną linią „Bez koperty: X zł” (w debriefingu jako FVG z dopiskiem „bez koperty”), zamiast paska z limitem 0.

## N55. Historia operacji niedostępna w trybie tylko do odczytu i dla wpisu z nowszej wersji – przycisk leży w fieldset disabled

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/OperationEditor.tsx:107`, `src/renderer/features/operations/OperationEditor.tsx:114`, `src/renderer/features/cargo/CargoPage.tsx:270`

**Co się dzieje.** Folder jest tylko do odczytu (nowszy format na drugim komputerze) albo operację zapisała nowsza wersja. Użytkownik chce sprawdzić w „Historii”, kto i kiedy zmienił kwotę, ale przycisk jest wyszarzony. Edytor ustawia `<fieldset disabled={readOnly}>`, a HistoryButton jest w jego środku – przeglądanie wersji nic nie zapisuje, a i tak jest zablokowane. W Ładowni przycisk Historia leży poza fieldset i działa, więc ekrany zachowują się inaczej.

**Poprawka.** Przenieść nagłówek edytora (tytuł, znaczek, HistoryButton, DeleteButton) przed <fieldset disabled> albo dać fieldset tylko polom edycji. Przywracanie w trybie tylko do odczytu blokuje już HistoryDialog (folder) i main (plik w nowszym formacie).

## N56. Zasięg zaokrąglony do 0,1 miesiąca pokazuje próg klasy, której okręt nie ma

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia, gra, Wywiad, raporty, silnik budżetu

Gdzie: `src/renderer/features/bridge/BridgePage.tsx:35`, `src/renderer/features/bridge/BridgePage.tsx:150`, `src/renderer/features/bridge/BridgePage.tsx:397`, `src/shared/calc/fleet.ts:157`, `src/renderer/features/command/CommandPage.tsx:223`, `src/renderer/features/command/CommandPage.tsx:221-223`, `src/renderer/features/command/CommandPage.tsx:40-44`, `src/renderer/features/intel/IntelPage.tsx:178` …

**Co się dzieje.** Przy zasięgu 11,96 mies. Mostek pokazuje „Zasięg 12,0 mies.” i klasę „Krążownik”, a w podpowiedzi „Klasa według zasięgu: 12,0 mies.”. Według specyfikacji 12 mies. to Flagowiec. Dowództwo pisze wtedy „Do klasy Flagowiec brakuje 0,0 mies. zasięgu”. To samo przy 2,96 („3,0 mies.” z Korwetą) i 5,97 („6,0 mies.” z Fregatą). Klasa liczy się z niezaokrąglonej liczby, a napis zaokrągla w górę.

**Poprawka.** Zasięg pokazywać obcięty w dół: `Math.floor(r * 10) / 10` przed formatowaniem, we wszystkich miejscach (BridgePage, CargoPage, ReportsPage, CommandPage – najlepiej jedna funkcja `fmtRange` w lib/format.ts). „Brakuje” zaokrąglać w górę i pokazywać co najmniej 0,1: `Math.max(0.1, Math.ceil((CLASS_FROM[next] - range) * 10) / 10)`.

To samo zgłoszone też jako: „Zasięg zaokrąglany w górę ponad granicę klasy: „Korweta · zasięg 3,0 mies.” i „Do klasy Fregata brakuje 0,0 mies.””; „Zasięg zaokrąglony do „12,0 mies.”, a klasa nadal Krążownik”.

## N57. Nieaktualne teksty w UI: „w późniejszych etapach” zasobnik pokaże energię, ICTTJ „w wersji 1.1”

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia, proces główny i okna

Gdzie: `src/renderer/features/settings/SettingsPage.tsx:366`, `src/renderer/features/wizard/WizardPage.tsx:280`, `src/renderer/features/settings/SettingsPage.tsx:365`, `src/renderer/app/App.tsx:237`, `docs/decyzje.md:426`

**Co się dzieje.** Wersja 1.4.1: Ustawienia → Zasobnik i start mówi „w późniejszych etapach ikona pokaże w dymku „energię dziś”, a jej menu – szybki wpis”, choć działa to od 1.0.0 (E4, T59). Kreator startu (krok „Ten komputer”) mówi „Folder ICT Trade Journal (wypłaty i cele) podłączysz w wersji 1.1.” – integracja jest od 1.1.0, a specyfikacja (Kreator startu, krok 6) przewiduje w tym kroku wybór folderu ICTTJ, którego kreator nie oferuje.

**Poprawka.** SettingsPage.tsx:366: „Start z Windows włączysz też w kreatorze startu. Ikona pokazuje w dymku „energię dziś”, a jej menu – szybki wpis.” WizardPage.tsx:280: zamiast notatki dodać opcjonalne pole folderu ICTTJ: api.ictjSuggest jako propozycja, a przy „Uruchom budżet” setIctjDir (jak w IctjTab). Minimum to tekst „Folder ICT Trade Journal podłączysz w Ustawieniach → ICTTJ.” z linkiem.

To samo zgłoszone też jako: „Ustawienia → Zasobnik zapowiada „w późniejszych etapach” funkcje, które działają od 1.0.0”.

## N58. Specyfikacja zapowiada na Mostku radar, wywiad i krzywą majątku – po E6 i E8 ich tam nie ma

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `docs/specyfikacja.md:277`, `src/renderer/features/bridge/BridgePage.tsx:163`

**Co się dzieje.** Tabela „Ekrany” w specyfikacji: Mostek – „…ostatnie operacje; później radar, wywiad i krzywa majątku”. Radar (E6) i Wywiad z krzywą majątku (E8) są gotowe, ale Mostek ma tylko Odprawę, Stan okrętu, Dokowanie, Koperty, Rozliczenia, Przychody i Ostatnie operacje. Nie ma decyzji, która by to zmieniała, więc zapowiedziana funkcja nie trafiła na ekran.

**Poprawka.** To zachowanie widoczne dla użytkownika, więc zgodnie z CLAUDE.md zapytać go z propozycją, a nie dodawać na własną rękę. Propozycja: mała „Krzywa majątku” (WealthChart z features/intel, ostatnie 26 tygodni, kliknięcie → Wywiad) na Mostku. Albo decyzja D…, że radar i wywiad są na Mostku tylko przez odprawę i Daily Bias, a krzywa zostaje w Wywiadzie. Wtedy poprawić wiersz w specyfikacji.

## N59. „Zaległa” na Radarze od 1. dnia po terminie, a w pożyczce i odprawie dopiero po 3 dniach

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia, silnik budżetu

Gdzie: `src/shared/calc/radar.ts:89`, `src/renderer/features/radar/RadarPage.tsx:164`, `src/renderer/features/radar/RadarPage.tsx:186`, `src/shared/calc/loans.ts:16`, `src/shared/calc/radar.ts:81`, `src/shared/calc/radar.ts:91`, `src/shared/calc/loans.ts:70`

**Co się dzieje.** Rata wzięta, termin wczoraj. Oś Radaru pisze przy racie „zaległa”, a wiersz pożyczki obok nie ma żadnej plakietki. Od 3. dnia oś zmienia napis na „po terminie”, a wiersz pożyczki i odprawa dopiero wtedy mówią „zaległa rata”. D72 i T70 definiują zaległą jako niezapłaconą 3 dni po terminie, więc to samo słowo znaczy w dwóch miejscach co innego.

**Poprawka.** W radar.ts dla 0 < dni < OVERDUE_DAYS pisać „czeka na spłatę” / „po terminie (N dni)”. Od OVERDUE_DAYS pisać „zaległa rata” / „spóźniona spłata”, jak w LoanRow i odprawie. W RadarPage.tsx:164 pokazywać i.note zamiast stałego „po terminie”, z akcentem przy overdue.

To samo zgłoszone też jako: „Radar: rata „zaległa” / „spóźniona” od 1. dnia, a próg zaległości (D72) to 3 dni”.

## N60. Czerwień i zieleń poza kwotami: ETA po terminie, Bearish, plakietka „zaszyfrowany”

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/starmap/StarMapPage.tsx:245`, `src/renderer/features/bridge/BridgePage.tsx:263`, `src/renderer/features/settings/UpdatesTab.tsx:34`

**Co się dzieje.** Zasada (CLAUDE.md, D68): zieleń i czerwień tylko dla kwot na plus i minus, czerwień dla przekroczeń i alarmów. T74 rozstrzyga wprost: zaległość w akcencie. Tymczasem na Mapie gwiezdnej ETA po terminie celu jest czerwona (text-down), choć to zaległość, a nie kwota czy alarm. Daily Bias „Bearish” na Mostku jest czerwony (Bullish ma akcent). Plakietka „zaszyfrowany” przy tokenie jest zielona (tone 'up').

**Poprawka.** ETA po terminie i Bearish pokazywać w text-accent, jak zaległości na Radarze (T74) i żółte alarmy. Plakietkę „zaszyfrowany” można zostawić jako wzór ICTTJ albo dać jej ton domyślny. Jeśli zmieniać, to tak samo w obu aplikacjach.

## N61. Menu „Układ” na ekranie kreatora pokazuje identyfikator „wizard” zamiast nazwy

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/layout/LayoutMenu.tsx:51`, `src/shared/panels.ts:220`

**Co się dzieje.** Podczas kreatora startu pasek nad stroną ma przycisk „Układ” z podpowiedzią „Układ strony „wizard”: …”, a po otwarciu widać „Panele – wizard” i „Na tej stronie nie ma paneli do ukrycia.”. Angielski identyfikator trafia do tekstu interfejsu.

**Poprawka.** Dopisać `wizard: 'Kreator startu'` do PAGE_LABELS w src/shared/panels.ts. Lepiej dodatkowo ukryć LayoutMenu, gdy strona nie ma paneli (panelsOnPage puste, brak ukrytych i zapisanych układów), albo nie renderować go dla 'wizard'.

## N62. „Zapisz teraz” w palecie pomija pytanie o zmiany z drugiego komputera, które obsługuje Ctrl+S

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/palette/CommandPalette.tsx:52`, `src/renderer/app/App.tsx:100`

**Co się dzieje.** Czekają decyzje o zmianach z drugiego komputera. Ctrl+S otwiera okno decyzji z komunikatem „Czekają zmiany z drugiego komputera – te wpisy zapiszą się po Twojej decyzji.”. Ta sama komenda z palety (opisana jako „Ctrl S”) woła samo flushSaves i pokazuje „Zapisano.” albo mylące „Nie udało się zapisać – aplikacja ponowi zapis.”.

**Poprawka.** Wydzielić `saveNow()` (np. w src/renderer/store/data.ts albo features/sync) z logiką Ctrl+S: przy oczekujących setRemoteDialog(true) i toast informacyjny, inaczej flushSaves z komunikatem z `save.error`. Wołać ją z App.tsx i z palety.

## N63. Krzywa majątku i przegląd roczny liczą pożyczkę zaciągniętą i depozyt domowników jako majątek – fałszywy BOS/CHoCH w górę

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/intel.ts:27-88`, `src/shared/calc/intel.ts:330-334`, `src/renderer/features/intel/IntelPage.tsx:41`, `src/renderer/features/intel/IntelPage.tsx:74-86`, `src/renderer/features/reports/ReportsPage.tsx:377-378`, `src/shared/calc/intel.ts:198-199`, `src/shared/calc/fleet.ts:140-143`, `src/shared/calc/fleet.ts:324` …

**Co się dzieje.** Użytkownik bierze pożyczkę 20 000 zł (konto rośnie). Wywiad pokazuje „Majątek” +20 000 zł, wykres dostaje CHoCH w górę, a „Struktura” zmienia się na „bullish – wyższe szczyty”. Na tym samym ekranie „Prognoza zasięgu” (i klasa okrętu) odejmuje dług (D72). Tak samo zaliczka domownika (D80 c: „pieniądze domowników na moim koncie, nie do wydania na siebie”, FleetState: „never the ship's money”) podnosi „Majątek”, a jej wydanie na zakupy domownika robi drawdown. Przegląd roczny („Majątek na początku / na końcu”) ma tę samą wadę. T81 (suma sald kont) powstał przed D80 i nie uwzględnia ani długu, ani depozytu.

**Poprawka.** Opcja minimalna: zmienić etykiety na „Pieniądze na kontach” (Wywiad i przegląd roczny) i dopisać w opisie, że obejmują pożyczone i depozyt domowników. Opcja pełna (zmiana T81, dopisać nową decyzję T): majątek = salda kont − depozyt domowników − pozostały dług z pożyczek zaciągniętych w danym dniu, liczone z tych samych reguł co silnik (np. migawki z fleet.log: suma ruchów bez warstwy deposit i z debt). Wtedy krzywa i przegląd roczny są spójne z zasięgiem i klasą (D72, T71).

## N64. Klasa okrętu bez histerezy: każdy powrót ponad tę samą granicę to nowy ekran „Nowa klasa” z fanfarą (D73)

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:636-643`, `src/renderer/store/game.ts:124`, `src/renderer/features/command/Celebration.tsx:17-19`, `src/renderer/features/command/Celebration.tsx:64-66`, `src/shared/calc/fleet.ts:140-143`, `src/shared/calc/fleet.ts:160-164`, `docs/decyzje.md:171`

**Co się dzieje.** Zasięg krąży wokół granicy klasy, np. 2,95–3,05 mies.: łupy przechodzące do osłon albo dokowanie podnoszą go ponad 3 mies., wydatek ponad energię pobrany z osłon obniża. Każdy zamrożony dzień z klasą wyższą niż dzień wcześniej daje wpis „class up” w dzienniku wachty i osobne święto (klucz `class:<data>`), czyli pełnoekranowy „Nowa klasa: Fregata – Zasięg okrętu wzrósł” z fanfarą za każdym razem, gdy zasięg znów przekroczy 3 mies., także kilka razy w miesiącu. Spadki idą tylko do dziennika, więc użytkownik widzi wielokrotnie „awans” do tej samej klasy. D73 („wyższa z animacją i dźwiękiem, niższa w dzienniku”) nie przewiduje progu ani histerezy – to sama decyzja daje ten efekt.

**Poprawka.** W celebrationsOf (albo w gameView jako osobna flaga) świętować klasę tylko wtedy, gdy jest wyższa od najwyższej klasy z ostatnich np. 30 zamrożonych dni (albo od najwyższej w historii). Powrót do klasy już mianej zapisywać tylko w dzienniku wachty jako „powrót do klasy”. Zapisać jako T-decyzję doprecyzowującą D73 / T80; zmiana tylko w renderze/święcie, zamrożone dni bez zmian.

## N65. Miesiąc w toku raportowany jako „Miesiąc zamknięty na plus: tak” (Raporty → Debriefing, CSV i Excel miesięcy)

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/plan.ts:319-330`, `src/shared/export/budget.ts:123-124`, `src/shared/export/budget.ts:136`, `src/shared/export/budget.ts:146`, `src/shared/export/budget.ts:162`, `src/renderer/features/reports/ReportsPage.tsx:250-251`, `src/renderer/features/reports/ReportsPage.tsx:433`, `tests/unit/export.test.ts:405-408`

**Co się dzieje.** 3 października użytkownik eksportuje „Miesiące – CSV” (domyślny okres od 1 stycznia do dziś obejmuje bieżący miesiąc) albo wybiera bieżący miesiąc w Debriefingu Raportów. Po 10 zł wydatków dostaje „Na plus: tak” / „Miesiąc zamknięty na plus: tak”, a w tym samym wierszu „Łupy”: puste / „miesiąc trwa”. Spec (specyfikacja.md:218) mówi o miesiącu, który się zamknął; osiągnięcie Hat-trick słusznie liczy tylko miesiące zakończone.

**Poprawka.** W debriefing zwracać `plus: null`, dopóki `!ended` (albo osobne pole `final`/`inProgress`). W DebriefReport pisać „miesiąc trwa” zamiast tak/nie, w CSV/Excel w kolumnie „Na plus” pisać „w toku”. MonthPage pokazuje tylko miesiące zakończone, więc się nie zmieni. Poprawić test export.test.ts:49 (dla miesiąca w toku plus = null).

## N66. Przegląd roczny: suma „Wpływów” z tabeli miesięcy różni się od „Wpływów” roku na tym samym ekranie i w PDF

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/intel.ts:303-316`, `src/shared/calc/intel.ts:310`, `src/shared/calc/intel.ts:315`, `src/shared/calc/income.ts:79`, `src/renderer/features/reports/ReportsPage.tsx:376`, `src/renderer/features/reports/ReportsPage.tsx:382`

**Co się dzieje.** W styczniu wypłata z XTB 5 000 zł (trading +), w marcu dopłata do XTB 3 000 zł (trading −). „Rok w liczbach → Wpływy” nettuje trading z całego roku (2 000 zł + praca), a tabela „Miesiące” liczy każdy miesiąc osobno z obcięciem tradingu do zera (styczeń +5 000, marzec 0). Suma kolumny „Wpływy” jest o 3 000 zł wyższa niż wiersz „Wpływy” tuż nad nią, w PDF tak samo, bez żadnego wyjaśnienia – reguła jest opisana tylko w komentarzu w kodzie. Użytkownik, który zsumuje miesiące, uzna przegląd za błędny.

**Poprawka.** Najtaniej dopisek pod tabelą „Miesiące” i w PDF: „trading netto w każdym miesiącu osobno (dopłaty nie schodzą poniżej zera); wiersz Wpływy roku nettuje dopłaty z całego roku – T119”. Druga możliwość: w tabeli miesięcy pokazywać trading bez obcinania (incomeByMonth, także ujemny), żeby suma zgadzała się z rokiem. Wtedy trzeba zaktualizować T119.

## N67. Próg poważnego przekroczenia koperty w dwóch miejscach: alarm silnika na sztywno 20%, gra wg ustawienia z Dowództwa

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/fleet.ts:907`, `src/shared/calc/game.ts:210-212`, `src/renderer/features/command/CommandPage.tsx:387-392`

**Co się dzieje.** Użytkownik w Dowództwie ustawia „Koperta poważnie ponad: 50% limitu”. Przekroczenie koperty Auto o 30% daje w odprawie i powiadomieniu czerwony alarm, a gra ocenia je jako zwykłe naruszenie. Przy progu 10% jest odwrotnie: poważne naruszenie (liczone do degradacji) przy żółtym alarmie.

**Poprawka.** Wspólna funkcja w fleet.ts, np. `seriousEnvelopeLimit(limit, pct) = Math.floor(limit * (100 + pct) / 100)`, użyta w alarmie (pct z `settings.game.seriousEnvelopePct`, silnik i tak dostaje całe settings) i w rateDay. Czerwony alarm = to samo, co poważne naruszenie gry.

## N68. Status misji „Pełna energia” w trakcie tygodnia nie widzi dwóch ostatnich dni – „kurs utrzymany” obok „Dziś na razie: naruszenie”

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:385-390`, `src/renderer/features/command/CommandPage.tsx:74`, `src/renderer/features/command/CommandPage.tsx:97-101`, `src/renderer/features/command/CommandPage.tsx:263-270`, `src/renderer/features/reports/ReportsPage.tsx:115`, `src/renderer/features/reports/ReportsPage.tsx:174`

**Co się dzieje.** W środę użytkownik przekracza przydział dnia. Panel „Seria” pokazuje „Dziś na razie: naruszenie – Przydział dnia przekroczony o …”, a panel „Misja tygodnia” (Pełna energia) w tym samym ekranie – „Na razie: kurs utrzymany”; Raporty → raport wachty pisze „– na razie na kursie”. Pozostałe misje (cisza nocna, impulsy, koperta, killzone) liczą dzisiejsze operacje na żywo, tylko ta czyta wyłącznie dni zamrożone (do dziś − 2).

**Poprawka.** W missionStatus dla 'energy': w dniach poza mapą dni zamrożonych (d > ostatni zamrożony, d <= to) brać rateDay(input, d, dzień poprzedni) i sprawdzać v.order === 'daily'. Wystarczy samo f.daily.left < 0 z computeFleet na koniec dnia (warsawEndOf(d)) – to najwyżej 2 dodatkowe przeliczenia silnika. Przy rozliczeniu w niedzielę wszystkie dni są zamrożone, więc wynik się nie zmienia.

## N69. Status misji „Dzień bez wydatków” liczy dzisiejszy, niezakończony dzień jako wolny od wydatków

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:414-417`, `src/renderer/features/command/CommandPage.tsx:74`, `src/renderer/features/command/CommandPage.tsx:97-101`, `src/renderer/features/reports/ReportsPage.tsx:115`, `src/renderer/features/reports/ReportsPage.tsx:174`

**Co się dzieje.** Misja „Dzień bez wydatków” (co najmniej 2 dni bez wydatku). W poniedziałek o 8:00, przed pierwszym zakupem, panel pokazuje już „Na razie: 1 z 2”. We wtorek rano po wolnym poniedziałku – „Na razie: 2 z 2” w kolorze akcentu, a raport wachty „– na razie na kursie”, choć wtorkowe zakupy (wpisane wieczorem albo z importu z mBanku za 2–3 dni) zwykle ten dzień odbiorą i misja wraca do „1 z 2”. Dzień bieżący liczy się jako wolny, zanim się skończy; rozliczenie po zamrożeniu niedzieli jest poprawne.

**Poprawka.** W trakcie tygodnia (upTo < niedziela) liczyć dni wolne tylko do wczoraj (d < upTo), a dzisiejszy pokazać osobno, np. „dziś na razie bez wydatków” albo „+1, jeśli dziś bez wydatków”. ok:true tylko wtedy, gdy próg osiągnęły dni zakończone. Przy rozliczeniu (upTo = niedziela, dzień zamrożony) wszystkie dni są zakończone, więc wynik się nie zmienia.

## N70. „Poważne naruszenia w tym miesiącu” w Dowództwie liczone od ostatniej zmiany stopnia, w debriefingu – za cały miesiąc

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:589`, `src/shared/calc/game.ts:652-660`, `src/renderer/features/command/CommandPage.tsx:200-205`, `src/renderer/features/reports/ReportsPage.tsx:222`, `src/renderer/features/reports/ReportsPage.tsx:262`

**Co się dzieje.** 3 i 10 października – dwa poważne naruszenia, 15-go awans. Dowództwo pokazuje „Poważne naruszenia w tym miesiącu 0 / 3”, a debriefing października – „Poważne naruszenia: 2”. Licznik od zmiany stopnia wynika z T77, ale etykieta w UI tego nie mówi.

**Poprawka.** Zmienić podpis w RankPanel, gdy rankSince wypada w bieżącym miesiącu: „Poważne naruszenia od {dm(rankSince+1)} (do degradacji)”. W pozostałych przypadkach zostawić „w tym miesiącu (do degradacji)”. Debriefing zostaje bez zmian – suma za cały miesiąc.

## N71. Raport wachty: wybrany tydzień zostaje w pamięci na tygodnie – „Raporty” z menu otwierają stary tydzień

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/renderer/features/reports/state.ts:12-15`, `src/renderer/features/reports/ReportsPage.tsx:107`, `src/renderer/features/reports/ReportsPage.tsx:126-130`

**Co się dzieje.** W czwartek użytkownik cofa raport wachty o 3 tygodnie („‹ tydzień wcześniej”). FI działa tygodniami w zasobniku (D64), więc stan modułu żyje. W kolejną niedzielę po 18:00 otwiera Raporty z menu bocznego (nie z powiadomienia) i widzi tydzień sprzed miesiąca zamiast bieżącego: `watchMonday` zostaje w zustandzie poza stroną, a tydzień domyślny liczy się tylko przy null. Resetuje go wyłącznie kliknięcie powiadomienia (openWatchReport); przycisku „bieżący tydzień” nie ma.

**Poprawka.** Pamiętać wybór razem z tygodniem domyślnym z chwili wyboru, np. { monday, base: defaultWatchMonday(today, time) }. Gdy bieżący domyślny tydzień ≠ base, ignorować wybór i wracać do domyślnego. Dodatkowo przycisk „bieżący” (jak „bieżący” w Planie miesiąca), gdy monday ≠ domyślny.

## N72. Jedna wielkość pod trzema nazwami: „Ładownia” / „Ładownia i odkładki” / „Order Block · ładownia”; misja „Rozliczenie z domem” po D80

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/renderer/features/reports/ReportsPage.tsx:156`, `src/renderer/features/reports/ReportsPage.tsx:247`, `src/renderer/features/reports/ReportsPage.tsx:383`, `src/renderer/features/intel/IntelPage.tsx:118`, `src/shared/calc/game.ts:59`, `docs/decyzje.md:728`

**Co się dzieje.** Wydatki powiązane z kontenerami (`containerId`, ta sama suma `costOf`) to w raporcie wachty i przeglądzie rocznym „Ładownia”, w debriefingu „Ładownia i odkładki”, a w Wywiadzie „Order Block · ładownia”. Misja nazywa się „Rozliczenie z domem”, choć od D80 rozlicza wszystkich domowników (tekst: „zmniejsz to, co domownicy mają oddać”; T111 nazywa ją „Rozlicz się z domownikami”), a „Dom” to dziś tylko pierwsza osoba z listy.

**Poprawka.** MISSION_TITLE.house = 'Rozliczenie z domownikami' (zgodnie z T111; klucz 'house' bez zmian, więc zapisane misje się nie psują). Etykieta ładowni ujednolicona, np. „Ładownia (kontenery i opłaty okresowe)” w raportach; w Wywiadzie „Order Block · ładownia” może zostać jako warstwa ICT.

## N73. Rozkazów nie da się zmienić w Dowództwie (spec), są tylko do odczytu z odnośnikiem do Ustawień

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/renderer/features/command/CommandPage.tsx:366-376`, `docs/specyfikacja.md:226`

**Co się dzieje.** Spec: „Rozkazy (domyślne, do zmiany w Dowództwie)”. W Dowództwie da się zmienić tylko progi gry, a rozkazy (minimalne osłony, linia zanurzenia, cisza nocna, firewall, próg dziennika) są tekstem z odnośnikiem „zmień rozkazy ›” do Ustawienia → Warstwy i rozkazy. Rozbieżność nie jest zapisana jako decyzja.

**Poprawka.** Najprościej dopisać decyzję T: rozkazy edytuje się w Ustawieniach → Warstwy i rozkazy, a Dowództwo pokazuje je z odnośnikiem; poprawić specyfikację (L226) i postep.md:341. Druga możliwość: te same NumberField / TimeField / Toggle z MachineTabs.tsx (setOrders, commitOnBlur) w panelu „Rozkazy i progi”.

## N74. „to nie duplikat” jest nieodwracalne, a „To nie to samo” w podobnych nazwach ma powrót w Ustawieniach

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/DuplicatesPanel.tsx:98`, `src/renderer/features/import/DuplicatesPanel.tsx:150`, `src/renderer/features/settings/ImportTab.tsx:79`, `src/renderer/features/import/rules.ts:190`

**Co się dzieje.** Użytkownik w panelu „Duplikaty operacji” przez pomyłkę klika „to nie duplikat” przy prawdziwym duplikacie: wpisie ręcznym i jego kopii z banku. Para znika na zawsze. Nie ma toastu z „Cofnij” ani żadnego miejsca w Ustawieniach, gdzie można ją przywrócić. Duplikat zostaje w budżecie i podwaja wydatek. Analogiczne „To nie to samo” z „Podobnych nazw” ma w Ustawieniach → Import z banku licznik i przycisk „pokazuj znowu” (T96). D77 każe rozwiązywać duplikaty „jak w ICTTJ” – z „Cofnij”.

**Poprawka.** Po „to nie duplikat” toast z „Cofnij” (usuwa ten klucz z notDuplicates). W Ustawienia → Import z banku, obok „Pary oznaczone „To nie to samo””, dodać „Pary oznaczone „to nie duplikat”: N · pokazuj znowu”, czyszczące settings.import.notDuplicates.

## N75. Odnośnik „Możliwe duplikaty: N” z Operacji prowadzi do Importu, który przy otwartym pliku nie pokazuje panelu duplikatów

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/operations/OperationsPage.tsx:215`, `src/renderer/features/import/ImportPage.tsx:823`, `src/renderer/features/import/ImportPage.tsx:229`

**Co się dzieje.** Użytkownik wczytuje CSV i zaczyna kategoryzować, ale nie importuje. Sesja importu żyje przy zmianie ekranu. W Operacjach widzi „Możliwe duplikaty: 3” i klika. Trafia na ekran Import z otwartym plikiem, na którym panelu „Duplikaty operacji” nie ma. Tekst w „Dopasowaniach” też odsyła do „Duplikatów operacji”. Żeby je zobaczyć, musi kliknąć „Zamknij plik”, a to bez pytania kasuje wszystkie decyzje sesji. T94 umieszcza panel „bez otwartego pliku”, ale odnośnik tego nie uwzględnia.

**Poprawka.** Przy otwartym pliku pokazać w Imporcie zwinięty panel albo choćby wiersz „Duplikaty operacji: N – scalisz je po imporcie albo po zamknięciu pliku”. Ewentualnie DuplicatesLink przy aktywnej sesji (useImport.getState().plan) zmienia podpowiedź. „Zamknij plik” przy podjętych decyzjach powinien pytać o potwierdzenie.

## N76. Słowo kluczowe z paska zbiorczego importu zapisuje się tylko dla wydatków i nie obsługuje „Finansuje: X”, inaczej niż w Operacjach i w propozycji słowa

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:541`, `src/renderer/features/import/ImportPage.tsx:561`, `src/renderer/features/import/options.ts:54`, `src/renderer/features/operations/state.ts:99`, `src/renderer/features/import/KeywordRules.tsx:26`, `src/renderer/features/import/Learning.tsx:135`

**Co się dzieje.** Użytkownik szuka w imporcie „rossmann”, zaznacza znalezione (zakupy i dwa wpływy-zwroty), wybiera „Wydatek / zwrot towaru – kategoria” i zaznacza „zapamiętaj „rossmann” jako słowo kluczowe”. Decyzja trafia do obu kierunków (fits('expense', 'in') = true), ale reguła słowa powstaje z direction 'out'. Przy kolejnym imporcie zwroty-przelewy z tym słowem nie są rozpoznane. W Operacjach ta sama akcja zapisuje słowo dla obu kierunków, gdy wśród zaznaczonych są zwroty (T91; poprawka z przeglądu 1.2.1 „słowo z Operacji w obu kierunkach” objęła tylko Operacje). Do tego przy opcjach „Finansuje: X” i „Od domownika: X” pole „zapamiętaj jako słowo kluczowe” w ogóle znika. Tymczasem KeywordRules oferuje „Finansuje: X – kategoria”, a propozycja słowa (T98) zapisuje także decyzje domownika. Komentarz KEYWORD_KIND twierdzi, że odpowiada KeywordRules.

**Poprawka.** W BulkBar liczyć kierunek z zaznaczonych grup i wierszy, do których decyzja pasuje (null, gdy wśród nich jest 'in' przy opcji 'expense'), jak categorizeTicked. Dodać opcje 'refundable:<id>' (kind expense, refundable, memberId) i 'household:<id>:income|advance' (kind income, household, memberId) przekazywane do saveKeywordRule, tak jak w RuleProposal. Poprawić komentarz KEYWORD_KIND.

## N77. Podgląd liczy „nierozliczone → rozliczone” inaczej niż wynik importu i toast

Priorytet: niski · obszar: import (ekran), import (logika)

Gdzie: `src/renderer/features/import/ImportPage.tsx:155`, `src/renderer/features/import/ImportPage.tsx:171`, `src/shared/import/reconcile.ts:522`, `src/renderer/features/import/ImportPage.tsx:766`, `src/renderer/features/import/state.ts:498`, `src/renderer/features/import/ImportPage.tsx:169-172`, `src/shared/import/reconcile.ts:522-528`

**Co się dzieje.** Nierozliczona operacja z poprzedniego importu wraca w pliku rozliczona, z tym samym kluczem (status 'known', settled). Podgląd pokazuje „nierozliczone → rozliczone: 1”, „już zaimportowane: 0” i przycisk „Importuj (1)”. Po imporcie panel „Import zakończony” pokazuje „rozliczone: 0”, a toast „0 rozliczonych”, choć operacja została zaktualizowana. Ta sama liczba jest liczona w dwóch miejscach różnie.

**Poprawka.** W buildImport dla p.status === 'known' && p.settled liczyć counts.settled++ zamiast counts.known++ (Summary już tak to pokazuje), albo osobny licznik dodawany do „rozliczone” w DonePanel i toaście.

To samo zgłoszone też jako: „„Rozliczone” w podglądzie liczone inaczej niż w wyniku importu”.

## N78. Temat w sekcji „Gotowe” z plakietką „do decyzji” i pustą decyzją, gdy marki zdecydowano osobno

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:410`, `src/renderer/features/import/ImportPage.tsx:508`, `src/renderer/features/import/ImportPage.tsx:482`

**Co się dzieje.** Temat „Przelewy wychodzące” ma dwie grupy bez propozycji (ANNA NOWAK i PIOTR ZIELINSKI). Użytkownik decyduje każdą grupę osobno (albo robi to replanImport po dodaniu słowa kluczowego). themeStatus zwraca 'done', więc temat przechodzi do zwiniętej sekcji „Gotowe”. Mimo to jego plakietka nadal brzmi „do decyzji” (THEME_SOURCE[t.source], gdzie source = 'none'), a pola decyzji tematu pokazują pusty „Wydatek” bez kategorii, choć grupy mają swoje decyzje.

**Poprawka.** W ThemeRow, gdy temat nie ma własnej decyzji, a wszystkie grupy mają decyzje: jeśli są identyczne (sameChoice), pokazać tę decyzję z plakietką „Twoje decyzje”, w przeciwnym razie „różne – patrz marki” zamiast propozycji lub pustego „Wydatek”. Opcjonalnie replanImport może zachować decyzję tematu, gdy klucz tematu i jego zbiór grup się nie zmieniły.

## N79. „zapamiętaj” przy temacie ze słowa w tytule – reguła i tak nie powstanie, choć grupa pisze „bez reguły”

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:509`, `src/renderer/features/import/ImportPage.tsx:412`, `src/renderer/features/import/ImportPage.tsx:424`, `src/shared/import/reconcile.ts:602`

**Co się dzieje.** Przelewy z tytułem „za obiad” tworzą temat z propozycją ze słowa w tytule (byTitle; sygnatura z „:t”, więc osobny temat). Użytkownik zmienia kategorię tematu na „Prezenty”. Przy temacie pojawia się zaznaczone „zapamiętaj” z podpowiedzią „Kolejne importy rozpoznają marki tego tematu same”, ale buildImport pomija grupy byTitle i reguła nie powstaje. Przy następnym imporcie znów pojawi się „Jedzenie”. Na poziomie grupy ta sama sytuacja ukrywa „zapamiętaj” i mówi „z tytułu przelewu – bez reguły”. „Przyjmij pewne” (tooltip „zapamiętane dla kolejnych importów”) też obejmuje takie tematy.

**Poprawka.** W ThemeRow ukryć „zapamiętaj”, gdy t.groups.every(g => g.byTitle), i pokazać dopisek „z tytułu przelewu – bez reguły” jak przy grupie. W acceptSure pomijać takie tematy albo uzupełnić tooltip o wyjątek.

## N80. Ta sama decyzja reguły opisana na trzy sposoby (Reguły importu, Słowa kluczowe, propozycja słowa)

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/settings/ImportTab.tsx:103`, `src/renderer/features/settings/ImportTab.tsx:126`, `src/renderer/features/import/rules.ts:73`, `src/renderer/features/import/KeywordRules.tsx:62`, `src/renderer/features/import/Learning.tsx:133`

**Co się dzieje.** Na jednej karcie Ustawienia → Import z banku dwa sąsiednie panele opisują te same decyzje inaczej:
- „Reguły importu”: „Wydatek · Jedzenie”, „Wpływ”, „Przelew własny · mBank”, kierunek „oba”;
- „Słowa kluczowe”: „Jedzenie”, „wpływ (przychód)”, „przelew własny” (bez konta), kierunek „oba kierunki”.
Propozycja słowa pod grupą („Reguła na słowo – …”) i jej toast pokazują dla „Finansuje: Tata · Zdrowie” samo „Zdrowie”, a dla „Od domownika: Tata” – „Wpływ”. Zapisana reguła jest potem na liście jako „finansuje: Tata · Zdrowie” i „od domownika: Tata”. Użytkownik może sądzić, że słowo zapisze zwykły wpływ.

**Poprawka.** Jedna funkcja opisu (ruleDecisionText rozszerzona o nazwę konta przelewu) w ImportTab, KeywordRules i RuleProposal. W RuleProposal opis z choice przez tę samą funkcję (z osobą i zaliczką). Jeden tekst dla kierunku null („oba kierunki”).

## N81. Panel duplikatów pokazuje angielskie kody rodzaju („income”, „transfer”), inny format daty i opis wyboru niezgodny z T93

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/DuplicatesPanel.tsx:104`, `src/renderer/features/import/DuplicatesPanel.tsx:117`, `src/renderer/features/import/DuplicatesPanel.tsx:137`, `src/shared/import/duplicates.ts:101`

**Co się dzieje.** Para duplikatów wpływu albo przelewu własnego wyświetla się jako „15.10.26 · ANNA · z banku · mBank · income” zamiast „Wpływ” lub „Przelew własny” (TX_KIND_LABEL). Daty są w formacie dd.mm.rr, a reszta ekranu Import używa dd.mm.rrrr. Opis panelu mówi o tym samym wierszu z dwóch komputerów: „zostaje nowsza wersja”. Kod (T93) zostawia najpierw zadokowaną, potem tę z większą liczbą danych użytkownika, a nowszą dopiero na końcu – więc często zostaje starsza.

**Poprawka.** `t.kind === 'expense' ? … : TX_KIND_LABEL[t.kind] ?? t.kind`, data przez fullDay. Opis: „zostaje zadokowana, potem ta z Twoimi danymi (kategoria, notatka, godzina), potem nowsza”.

## N82. Wyszukiwarka i słowo kluczowe z wyszukiwania działają według innych zasad (kategoria propozycji, podciąg, powód)

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/shared/import/reconcile.ts:411`, `src/renderer/features/import/ImportPage.tsx:588`, `src/renderer/features/import/rules.ts:67`

**Co się dzieje.** Użytkownik ustawia temat „Zakupy bez rozpoznania” na „Kawa i przekąski” i szuka „kawa”. Te grupy nie zostaną znalezione, bo wyszukiwarka sprawdza kategorię propozycji (g.proposed), a nie decyzję widoczną na ekranie. Odwrotnie: wyszukanie „kawa” znajduje wszystkie grupy z propozycją kategorii „Kawa…” (także Costa czy Starbucks bez słowa „kawa” w nazwie) oraz podciągi w środku słów i w powodach („przelew wychodzący – … przelew własny?”). Pasek zbiorczy proponuje potem „zapamiętaj „kawa” jako słowo kluczowe” z podpowiedzią „Kolejne importy rozpoznają operacje z tym słowem w nazwie albo tytule same”. Reguła słowa łapie jednak tylko słowa zaczynające się od „kawa” w nazwie lub tytule, czyli inny zbiór niż ten zaznaczony.

**Poprawka.** W searchGroups przekazywać efektywną kategorię decyzji (wiersz → grupa → temat → propozycja), np. funkcją labelOfGroup(g) z ekranu, zamiast g.proposed. Rozważyć usunięcie g.reason z tekstu wyszukiwania. Przy „zapamiętaj jako słowo kluczowe” opcjonalnie pokazać, ile zaznaczonych operacji słowo faktycznie obejmie.

## N83. „Przyjmij pewne (N)” i „Przyjmij podpowiedzi mBanku (N)” działają na wszystkich tematach także podczas wyszukiwania

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:637`, `src/renderer/features/import/ImportPage.tsx:654`, `src/renderer/features/import/ImportPage.tsx:683`

**Co się dzieje.** Użytkownik wpisuje w wyszukiwarkę „biedronka”: lista pokazuje jeden temat, a „Zaznacz znalezione” obejmuje tylko znalezione. Gdy kliknie „Przyjmij pewne (19)”, przyjmie i zapamięta jako reguły 19 tematów, w tym 18 niewidocznych. Licznik w przycisku nie zmienia się przy wyszukiwaniu, więc nic nie sugeruje, że akcja wykracza poza widok.

**Poprawka.** Podczas wyszukiwania liczyć sure i hints z `visible` i opisać przyciski „… (znalezione: N)”, albo wyłączać je (z podpowiedzią „wyczyść wyszukiwanie”), dopóki wyszukiwanie jest aktywne.

## N84. Odpowiedź „zaliczka / przychód” dla domownika liczona z liczby wpisów decyzji, a nie operacji – razem z pominiętymi

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:484`, `src/renderer/features/household/actions.ts:65`

**Co się dzieje.** Domownik „Tata” ma „pytaj”. W pliku jest 8 jego przelewów w jednej grupie. Użytkownik ustawia grupę na „reszta jako zaliczka” (1 głos), a jeden przelew osobno, przez zaznaczenie i pasek zbiorczy, na „reszta jako przychód” (1 głos). Remis rozstrzyga się na 'income', więc osoba dostaje na stałe „przychód”, choć 7 z 8 wpłat zdecydowano jako zaliczkę. T109 mówi „przy kilku w jednym imporcie – częstsza”. Liczba głosów zależy też od przypadku: decyzja tematu to 1 głos, ale po przeliczeniu planu staje się N głosami grup. Głosują też decyzje grup i wierszy pominiętych („Nie importuj”), dla których nic nie powstaje.

**Poprawka.** Głosy liczyć na operacje: dla każdego wiersza planu, który powstaje (status new albo przywrócony usunięty, bez choices.skip), wziąć jawną decyzję w kolejności choices.rows → choices.groups[grupa] → choices.themes[temat]. Wiersze, które biorą tylko propozycję, pomijać – inaczej dla osoby z „pytaj” liczyłaby się domyślna propozycja „przychód”, a nie jawna decyzja (T109). Każdą jawną decyzję household przekazać do rememberInflows jako jeden głos. Samo result.create nie wystarczy, bo nie odróżnia decyzji jawnej od propozycji.

## N85. „+ domownik” zapisuje osobie na stałe „reszta jako przychód”, choć nikt o to nie zapytał (D80 b)

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:363`, `src/renderer/features/import/ImportPage.tsx:364`, `src/renderer/features/import/state.ts:484`, `src/renderer/features/import/state.ts:485`, `src/renderer/features/household/actions.ts:41`, `src/renderer/features/household/actions.ts:65`, `src/renderer/features/household/actions.ts:80`

**Co się dzieje.** Wpłata od osoby spoza listy → „+ domownik”: osoba dostaje inflow 'ask', a grupa od razu własną decyzję {household, advance: false} („reszta jako przychód”). Przy imporcie rememberInflows traktuje tę decyzję jak odpowiedź i ustawia osobie inflow 'income' na stałe – pytanie z D80 b („pytanie raz, potem zapamiętane dla osoby”) nigdy nie pada; kolejne wpłaty tej osoby ponad należność dokują jako mój przychód, nawet gdy to zaliczki (depozyt).

**Poprawka.** Decyzję z „+ domownik” oznaczyć jako niejawną, np. zbiór `implicit[group]`. Taka decyzja nie głosuje w rememberInflows, a temat zostaje 'todo' z pytaniem „zaliczka czy przychód?”, dopóki użytkownik nie wybierze opcji w polu decyzji. Alternatywa: po „+ domownik” nie ustawiać decyzji grupy, tylko przeliczyć plan – classify i tak da propozycję household dla nowej osoby (source 'none', temat do decyzji).

## N86. Reguła do zarchiwizowanej (usuniętej) kategorii dalej ją nadaje nowym operacjom, a temat jest „Gotowe”

Priorytet: niski · obszar: import (ekran), import (logika)

Gdzie: `src/shared/import/classify.ts:313`, `src/shared/import/classify.ts:171`, `src/shared/import/classify.ts:177`, `src/renderer/features/import/state.ts:413`, `src/renderer/features/settings/ImportTab.tsx:105`, `src/renderer/features/settings/CategoriesTab.tsx:48`, `src/shared/import/classify.ts:344`, `src/shared/import/classify.ts:171-177` …

**Co się dzieje.** Reguła „sklepalfa → Osobiste · Kosmetyki”. Użytkownik archiwizuje „Kosmetyki” (w Ustawieniach: „Usunięcie to archiwizacja”). Kolejny import: decideRow bierze rule.categoryId bez sprawdzenia archiwum (wbudowane słowa, sieci i podpowiedzi mBanku przechodzą przez usable / placed i zarchiwizowanych nie dają – T37), grupa ma źródło 'rule', temat jest „Gotowe” (zwinięty), więc nowe operacje po cichu lądują w usuniętej kategorii, której nie ma w wyborach. Ustawienia → Reguły importu pokazują ją bez oznaczenia.

**Poprawka.** W decideRow kategorię z reguły wydatku przepuszczać przez usable(). Gdy jest zarchiwizowana: source 'none', powód „kategoria reguły zarchiwizowana – wybierz nową”, temat 'todo'. Nowa decyzja użytkownika nadpisze regułę przez upsertRule. W Ustawienia → Reguły importu oznaczać takie reguły (np. „(zarchiwizowana)”). Opcjonalnie przy archiwizacji kategorii pokazać liczbę reguł, które na nią wskazują.

To samo zgłoszone też jako: „Reguła z kategorią zarchiwizowaną dalej nadaje ją nowym operacjom (sieć, słowo kluczowe i podpowiedź mBanku – nie)”.

## N87. Własna decyzja pojedynczej operacji inna niż wydatek jest niewidoczna na liście i nie da się jej cofnąć

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:439`, `src/renderer/features/import/ImportPage.tsx:451`, `src/renderer/features/import/ImportPage.tsx:459`, `src/renderer/features/import/state.ts:377`

**Co się dzieje.** W grupie zakupów użytkownik zaznacza jedną operację i paskiem zbiorczym ustawia „Przelew własny” (albo „Wpływ”, „XTB”). Na liście operacji grupy w kolumnie decyzji jest pusta komórka – CategorySelect pokazuje się tylko dla wydatku – więc nie widać, że operacja ma inną decyzję niż grupa, i nie ma „jak grupa”, żeby ją zdjąć (tylko kolejna decyzja zbiorcza). Podgląd też tego nie pokazuje.

**Poprawka.** Dla `mine` innego rodzaju niż wydatek pokazywać w komórce plakietkę z etykietą opcji (optionsFor / optionOf, np. „Przelew własny”, „Od domownika: X – zaliczka”) z ramką akcentu i przyciskiem „jak grupa” = chooseRow(p.key, null). Dla wydatku z własną decyzją, gdy grupa ma inny rodzaj, dodać ten sam przycisk. W nagłówku grupy można dopisać „N z własną decyzją”.

## N88. Panel duplikatów domyślnie scala możliwe duplikaty, przy których import pyta i ich nie łączy

Priorytet: niski · obszar: import (logika)

Gdzie: `src/shared/import/reconcile.ts:166-186`, `src/shared/import/duplicates.ts:306-329`, `src/renderer/features/import/DuplicatesPanel.tsx:52-57`, `src/renderer/features/import/ImportPage.tsx:229-231`

**Co się dzieje.** Wpis ręczny „Fryzjer” −45 zł z 10.10 (bez kategorii). W imporcie jest wiersz ROSSMANN −45 zł z 13.10, zakup kartą 3 dni później. Import oznacza go jako możliwy duplikat 'name' z ask=true i domyślnie nie łączy (T92: „jak w ICTTJ możliwy duplikat nie jest brany sam”). Użytkownik zostawia odznaczone albo celowo odznacza, bo to dwie różne operacje. Po imporcie panel „Duplikaty operacji” znajduje tę samą parę tym samym looseMatch, ale jako grupę bez konfliktu (wpis ręczny nie ma decyzji). Grupa jest więc zaznaczona domyślnie i „Scal zaznaczone” usuwa operację z banku. Wybór „nie łącz” z importu (noMerge, tylko w sesji) nie trafia do notDuplicates. Dwa ekrany z tej samej reguły (D77, T92 „jedna reguła dla importu i panelu”) mają odwrotne domyślne zachowanie.

**Poprawka.** Dodać do `DuplicateGroup` flagę `ask` liczoną tą samą regułą co w imporcie (`!(similar || (days <= 1 && zakup kartą))`) i nie zaznaczać takich grup domyślnie (jak konflikt). Odznaczenie „łącz” w imporcie zapisywać po zapisie jako `settings.import.notDuplicates[duplicateKey([tx.id, nowe id])]`.

## N89. Ta sama reguła looseMatch dostaje inną nazwę banku w imporcie i w panelu – operacja banku bez nazwy jest w panelu „podobna” do wszystkiego

Priorytet: niski · obszar: import (logika)

Gdzie: `src/shared/import/reconcile.ts:175`, `src/shared/import/reconcile.ts:46-50`, `src/shared/import/duplicates.ts:310`, `src/shared/import/duplicates.ts:341`

**Co się dzieje.** Wpis ręczny „Kawa na stacji” −5,10 zł z 10.10. W imporcie z 11.10 jest prowizja banku −5,00 zł, bez kontrahenta: operation 'PROWIZJA ZA PRZELEW NATYCHMIASTOWY'. Import porównuje nazwę z opisem (`row.counterparty || row.description`): nazwy nie są podobne, kwota nie jest ta sama, więc wiersz wchodzi jako nowy. Panel duplikatów porównuje z `copy.bank.counterparty || copy.counterparty` = ''. similarCounterparty('', …) zwraca true, a różnica 10 gr ≤ max(1 zł, 3%), więc powstaje grupa „inna kwota” bez konfliktu, zaznaczona domyślnie. Scalenie zostawia „Kawa na stacji” z kwotą −5,00 i wierszem prowizji, a prowizję usuwa. Tak samo działa każda wypłata z bankomatu czy opłata bez nazwy wobec dowolnego wpisu ręcznego o zbliżonej kwocie w ±3 dniach.

**Poprawka.** W `findDuplicates` użyć `name: copy.bank!.counterparty || copy.bank!.description`, tak jak import (`BankRow.description` jest zapisany). Najlepiej wydzielić wspólną funkcję `bankNameOf(row | bank)` dla obu wywołań `looseMatch`.

## N90. Przywrócony wiersz usuniętej operacji („importuj mimo to”) wchodzi z gołą propozycją – nie ma go w grupach ani tematach

Priorytet: niski · obszar: import (logika)

Gdzie: `src/shared/import/reconcile.ts:327`, `src/shared/import/reconcile.ts:554-561`, `src/renderer/features/import/ImportPage.tsx:218`, `src/renderer/features/import/ImportPage.tsx:275`

**Co się dzieje.** Użytkownik usunął zaimportowane operacje (np. żeby zaimportować plik jeszcze raz z innymi decyzjami) i przy kolejnym imporcie zaznacza „importuj mimo to” przy wierszach 'deleted'. importGroups bierze tylko wiersze 'new', więc przywrócone wiersze nie mają na ekranie grupy ani tematu. buildImport daje im decyzję grupy tylko wtedy, gdy w pliku jest też nowy wiersz z tym samym kluczem grupy; inaczej wchodzą z propozycją (bez rozpoznania – wydatek bez kategorii albo wpływ), bez możliwości wyboru decyzji i bez nauki reguł.

**Poprawka.** Przy wierszach „Usunięte przez Ciebie wcześniej” pokazać propozycję i pozwolić wybrać decyzję (np. `choices.rows[p.key]` z tymi samymi opcjami co w wierszu grupy). Alternatywa: zaznaczone do przywrócenia wiersze dołączać do `importGroups` z flagą `restored`, żeby trafiły do grup i tematów.

## N91. Zachowana kopia konfliktu jest zapisywana z czasem tego komputera, ale z nazwą komputera kopii (updatedBy)

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:963`, `src/main/datastore/store.ts:971`

**Co się dzieje.** Na komputerze PC użytkownik wybiera „Zachowaj tę wersję” przy kopii transactions/…-LAPTOP.json. resolveConflict podmienia tylko updatedAt, updatedBy zostaje 'LAPTOP' (i schemaVersion kopii). Historia pokazuje „Wersja zapisana … na komputerze LAPTOP”, okno zmian na laptopie mówi „z komputera LAPTOP” o zmianie zrobionej na PC, a pierwsza edycja na PC zawsze odkłada wersję jako „z innego komputera”. Każdy inny zapis main stempluje updatedBy = ten komputer (CLAUDE.md: „updatedBy = nazwa komputera, ustawiane przez main przy zapisie”).

**Poprawka.** Zapis zachowanej wersji przeprowadzić wspólną ścieżką z saveRecord / saveSettings: `SCHEMAS[kind].parse({...kopia, schemaVersion: SCHEMA_VERSION, updatedAt: now, updatedBy: machineName})`, z wcześniejszym history.snapshot nadpisywanego oryginału (powód 'discarded'). Opcjonalnie w historii odłożyć też kopię z jej oryginalnym updatedBy, żeby nie zgubić informacji, skąd pochodziła treść.

## N92. Etykiety pól w Historii i oknie zmian: angielskie klucze i surowe ULID-y zamiast nazw

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/shared/merge.ts:155`, `src/shared/merge.ts:224`, `src/renderer/features/history/HistoryDialog.tsx:31`, `src/renderer/features/history/HistoryDialog.tsx:35`

**Co się dzieje.** Polski interfejs pokazuje w Historii i w oknie zmian z drugiego komputera etykiety takie jak „type”, „from”, „until” (kontener), „direction”, „schedule.amount”, „closedAt” (pożyczka), „pool”, „split.hull”, „transactionId” (dokowanie), „correctionId”, „deadline”, „source”, „Podział łupów – shields”, „Dane z banku – counterparty”, „Warstwy – shieldSalaries”, „Rozkazy – firewall”, „Ustawienia – ictj.forecastId”, „Ustawienia – game.promoteDays”. Klucze map po id pokazują surowy ULID kategorii: „Koperty – 01J9ZZZ…” i „Podział łupów – goals.01J9…”. Wartości memberId, containerId, goalId i loanId też są surowymi ULID-ami. dictNames zbiera tylko tablice najwyższego poziomu `fi.settings`, więc domownicy (`settings.household.members`, od 1.3.0) i rekordy (kontenery, cele, pożyczki) nie dostają nazw, a konta i kategorie dostają. Użytkownik nie wie, która koperta czy który domownik się zmienił.

**Poprawka.** Uzupełnić LABELS o pola wszystkich schematów z records.ts i budget.ts (type, from, until, direction, closedAt, pool, split.*, transactionId, source, correctionId, deadline, settings.ictj.*, settings.game.*, settings.layers.*, settings.orders.*, loot.*, bank.counterparty…). Wartości enumów (fixed / subscription / installment itp.) tłumaczyć istniejącymi słownikami etykiet. W fieldLabel przyjmować mapę nazw i zamieniać segment ścieżki będący ULID-em (także po '#') na nazwę. W dictNames dodać settings.household.members oraz nazwy kontenerów, celów i pożyczek z bieżących rekordów store'u.

## N93. Obecność: komputer z zegarem przestawionym do przodu nigdy nie jest „aktywny” – znika ostrzeżenie o folderze otwartym na dwóch komputerach

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/presence.ts:39`, `src/renderer/app/Banners.tsx:83`

**Co się dzieje.** Zegar laptopa spieszy się o 20 s (po hibernacji bez synchronizacji czasu, słaba bateria CMOS). Jego plik .presence ma lastSeen „z przyszłości”, readOtherMachines odrzuca go (`age >= 0`), więc komputer stacjonarny nigdy nie pokazuje paska „Ten folder jest też otwarty na: LAPTOP … Zamknij tam aplikację” – jedynej ochrony przed pracą na dwóch komputerach naraz (specyfikacja: „nigdy naraz”). Opóźniony zegar działa odwrotnie (okno 3 min krótsze lub dłuższe).

**Poprawka.** W readOtherMachines przyjąć także ujemny wiek w granicach okna: `if (age > -PRESENCE_WINDOW_MS && age < PRESENCE_WINDOW_MS)`. Pliki z jeszcze dalszej przyszłości nadal pomijać. Wariant z mtime odpada: OneDrive przenosi czas modyfikacji z komputera źródłowego, więc to ten sam zegar.

## N94. Strona Synchronizacja porównuje wersje inaczej niż okna Historii i Zmian (surowe klucze, indeksy, updatedBy jako różnica)

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/features/sync/SyncPage.tsx:34`, `src/renderer/features/sync/SyncPage.tsx:49`, `src/renderer/features/sync/SyncPage.tsx:129`, `src/main/datastore/store.ts:112`, `src/shared/merge.ts:29`

**Co się dzieje.** Dwa komputery zapisały tę samą treść i OneDrive zrobił kopię `-PC`. Kopie różnią się tylko `updatedBy` (PC-A / PC-B). Karta konfliktu pokazuje wtedy tabelę z jednym wierszem „updatedBy” zamiast obiecanego „Treść identyczna (różni się tylko czas zapisu) – można bezpiecznie zachować oryginał”, bo pomija wyłącznie `updatedAt`. „Tę samą treść” aplikacja definiuje w trzech miejscach na trzy sposoby: STAMP_FIELDS w store, BOOKKEEPING w merge i filtr w SyncPage. Karta używa też własnego `flatten` z kluczami w stylu `splits[0].amount` i `settings.categories[3].name`. Pola idą po indeksie (zmiana kolejności listy = sztuczne różnice), wartości są surowe (ULID kategorii, grosze), a Historia i okno zmian używają fieldLabel, diffRecords po id i nazw.

**Poprawka.** W ConflictCard: `const changes = diffRecords(c.canonical.record, c.copy.record)` i `<ChangeList changes={changes} beforeLabel="Oryginał" afterLabel="Kopia" />` (BOOKKEEPING pomija updatedAt, updatedBy, schemaVersion i computed). Komunikat „Treść identyczna” pokazywać, gdy `changes.length === 0`. Lokalne flatten usunąć.

## N95. „Do Kosza” bez potwierdzenia przy każdym pliku z problemem – także w nowszym formacie i chwilowo nieczytelnym

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/features/sync/SyncPage.tsx:338`, `src/main/datastore/store.ts:990`, `src/main/datastore/store.ts:994`

**Co się dzieje.** Na liście „Pliki z problemami” jest wpis „nowszy format” (plik zapisany przez nowszą wersję FI na drugim komputerze, zanim dotarło jej fi.json) albo „uszkodzony” z błędem odczytu (plik OneDrive tylko online – znalezisko o jednorazowym błędzie odczytu). Jedno kliknięcie „Do Kosza” (bez „Usuń na pewno”, jak w DeleteButton) przenosi plik do Kosza tego komputera, a OneDrive usuwa go na drugim – nowsza wersja aplikacji traci swój rekord, a w drugim przypadku znika poprawna operacja. Tekst strony mówi o „uszkodzonych plikach” do naprawy, nie o danych nowszej wersji.

**Poprawka.** Dla błędu odczytu osobny rodzaj problemu (np. 'unreadable' – „nie można odczytać”) z przyciskiem „Wczytaj ponownie” (rescan bez pamięci podręcznej tego pliku) zamiast samego „Do Kosza”. Dla 'too-new' bez przycisku kosza, z podpowiedzią o aktualizacji. Dla pozostałych dwustopniowe potwierdzenie jak DeleteButton („Do Kosza na pewno”).

## N96. „Eksport: ZIP całego folderu” i przywracanie z niego tracą historię; strona Synchronizacja odsyła do backups/ mimo innego folderu kopii

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/index.ts:571`, `src/main/datastore/backup.ts:19`, `src/renderer/features/settings/SettingsPage.tsx:314`, `src/renderer/features/settings/SettingsPage.tsx:316`, `src/renderer/features/sync/SyncPage.tsx:350`

**Co się dzieje.** Przycisk nazywa się „Eksport: ZIP całego folderu…”, a obok jest instrukcja przywracania: rozpakuj do pustego folderu i otwórz. ZIP powstaje filtrem isDataFile (tylko fi.json i rekordy), bez .history/. Po takim przywróceniu znikają wszystkie wcześniejsze wersje wpisów i lista „Usunięte wpisy” jest pusta (a z nią T39: usunięte operacje wracają z importem), choć specyfikacja mówi o „pełnej kopii danych w ZIP”. Strona Synchronizacja radzi przy tym „przywrócić z kopii w folderze backups/”, a folder kopii może być na tym komputerze ustawiony gdzie indziej („Zmień folder kopii…”). Wtedy w backups/ nic nie ma.

**Poprawka.** Opcja minimalna: zmienić etykietę na „Eksport: ZIP danych (bez historii zmian)…” i dopisać przy instrukcji przywracania, że usunięte operacje mogą wrócić z importem (T39). Lepiej: w exportZip, i ewentualnie w kopii ręcznej, dołączać .history/ (filtr isDataFile || rel.startsWith('.history/')), a T20 dla kopii dziennych zostawić. W SyncPage pokazywać rzeczywisty folder z api.listBackups().dir zamiast stałego „backups/”.

## N97. Ta sama akcja nazywa się „Zachowaj nowsze” (Konflikty) i „Zaakceptuj nowsze” (Zmiany z drugiego komputera); „Weź z inny komputer”

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/features/sync/SyncPage.tsx:259`, `src/renderer/features/sync/RemoteChangesDialog.tsx:253`, `src/renderer/features/sync/RemoteChangesDialog.tsx:29`, `src/renderer/features/sync/RemoteChangesDialog.tsx:135`

**Co się dzieje.** Akcja zbiorcza „weź wersję zmienioną później” ma dwie nazwy: na stronie Synchronizacja „Zachowaj nowsze: zaznaczone / wszystkie”, w oknie zmian „Zaakceptuj nowsze: …”. Dokumenty (decyzje.md:201, 591) i komentarze w data.ts / remoteChanges.ts mówią „Zaakceptuj nowsze / nowszą”. Gdy przychodząca wersja nie ma `updatedBy` (plik pisany ręcznie albo przez starszy format), machineOf zwraca „inny komputer” wstawiane w zdania z dopełniaczem: „Weź z inny komputer”, „z komputera inny komputer”, „Zmiany z inny komputer: 3”.

**Poprawka.** Ujednolicić nazwę na „Zaakceptuj nowsze” (jak w docs) na stronie Synchronizacja: przyciski i opis. machineOf przy braku updatedBy niech zwraca null, a teksty mają wtedy osobne warianty: „z innego komputera”, „Weź z drugiego komputera”, „Zmiany z innego komputera: N”.

## N98. „Zainstaluje się po zamknięciu aplikacji” – przy domyślnym zamykaniu do zasobnika aktualizacja nigdy nie instaluje się sama

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/renderer/app/Banners.tsx:43`, `src/renderer/features/settings/UpdatesTab.tsx:73`, `src/renderer/features/settings/UpdatesTab.tsx:150`, `src/renderer/features/settings/UpdatesTab.tsx:228`, `src/main/config.ts:18`, `src/main/index.ts:858`, `src/main/index.ts:910`, `src/main/update/updater.ts:357`

**Co się dzieje.** Domyślna konfiguracja (D64: zamykanie do zasobnika, kreator włącza start z Windows). Aktualizacja pobiera się w tle, baner i Ustawienia mówią „zainstaluje się (sama) po zamknięciu aplikacji”. Użytkownik klika X – okno tylko się chowa (applyOnQuit nie rusza). Wieczorem wyłącza komputer – query-session-end/session-end wołają postponeInstall(), więc applyOnQuit zwraca false („installed at the next close”). Rano aplikacja startuje ukryta w zasobniku i cykl się powtarza. Aktualizacja instaluje się tylko po „Uruchom ponownie teraz” albo „Zakończ” z menu ikony – czego teksty nie mówią. Okno schowane w zasobniku nie dostaje też powiadomienia, że wersja czeka.

**Poprawka.** Teksty zależne od closeToTray, np. „zainstaluje się po „Zakończ” w menu ikony albo po „Uruchom ponownie teraz””. Opcjonalnie: przy starcie z systemem (startHidden) z gotową aktualizacją zainstalować ją przed pokazaniem czegokolwiek (aplikacja i tak jest ukryta) albo raz pokazać powiadomienie systemowe „Wersja X czeka – uruchom ponownie”, gdy okno jest w zasobniku.

## N99. Dymek zasobnika bez „Energia dziś” po włączeniu zamykania do zasobnika w trakcie pracy

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:663`, `src/main/index.ts:546`, `src/main/index.ts:964`, `src/renderer/app/App.tsx:240`, `src/main/tray.ts:62`

**Co się dzieje.** Komputer z wyłączonym „Zamykaj do zasobnika” (ikony nie ma, `tray` = null). Okno wysyła status „Energia dziś: …” – setTrayStatus robi `tray?.setStatus(...)`, więc tekst przepada. Użytkownik włącza przełącznik – powstaje nowy AppTray ze statusem null i dymek pokazuje samo „Financial Intel”, dopóki energia się nie zmieni (efekt w TrayStatus zależy tylko od tekstu). Specyfikacja: „Ikona w zasobniku: energia dziś w dymku”.

**Poprawka.** W index.ts trzymać `let trayStatus: string | null = null`. W handlerze setTrayStatus zapisywać go zawsze i wołać tray?.setStatus(trayStatus). W appTray() po utworzeniu wywołać tray.setStatus(trayStatus), albo przekazać status do konstruktora AppTray.

## N100. Kreator startu nadpisuje ustawienia tego komputera: skrót wraca do Ctrl+Alt+B, „zamykaj do zasobnika” wymuszone; drugi komputer nigdy nie dostaje autostartu

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/renderer/features/wizard/state.ts:57`, `src/renderer/features/wizard/state.ts:125`, `src/renderer/features/wizard/state.ts:127`, `src/main/config.ts:16`, `docs/decyzje.md:101`

**Co się dzieje.** (1) Użytkownik zmienił skrót w Ustawieniach (koliduje z platformą tradingową), potem uruchamia kreator: pole skrótu pokazuje domyślne Ctrl+Alt+B (nie bieżący skrót) i po zakończeniu go przywraca; tak samo `closeToTray: true` nadpisuje świadome wyłączenie. (2) D64: start z Windows „włącza go kreator startu” – kreator działa raz na folder, więc na drugim komputerze (folder z działającym budżetem, bez kreatora) autostart zostaje wyłączony i nic go nie proponuje, a specyfikacja opiera powiadomienia w tle na tym, że „FI startuje z Windows ukryty w zasobniku”.

**Poprawka.** W startWizard ustawić shortcut z useMachine.getState().prefs.quickShortcut i autostart z api.trayPrefs() (launchAtLogin albo true, gdy nigdy nie ustawiano). W finishWizard nie wysyłać closeToTray, chyba że kreator ma na to przełącznik. Dla drugiego komputera (D64): przy pierwszym otwarciu folderu z działającym budżetem na komputerze z launchAtLogin=false i bez zapamiętanego wyboru pokazać raz baner „Uruchamiać z Windows?” (wybór zapisany w config.json → tray). Wymaga potwierdzenia użytkownika, bo zmienia D64.

## N101. Kategoria bez koperty w tym miesiącu: w trakcie „bez limitu”, w debriefingu czerwone „ponad plan”

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/shared/calc/plan.ts:312`, `src/shared/calc/plan.ts:314`, `src/shared/calc/fleet.ts:903`, `src/renderer/features/month/EnvelopeBars.tsx:40`

**Co się dzieje.** W planie nie ma koperty dla „Prezenty i inne” (puste pole = brak koperty, T46). Wydatek 300 zł w trakcie miesiąca nie tworzy koperty ani alarmu, a szybki wpis pisze „bez limitu w tym miesiącu”. Po miesiącu debriefing i panel Koperty dla minionego miesiąca pokazują „300 z 0 zł” i FVG −300 zł na czerwono, jak przekroczenie.

**Poprawka.** W `debriefing` dla `limit == null` ustawiać `limit: null` i `gap: null` (typ `Debriefing.envelopes`) albo przenieść takie kategorie do osobnej listy „bez koperty”. W DebriefPanel i EnvelopeBars pokazywać je neutralnie (sam wydatek, bez czerwieni i bez paska limitu).

## N102. Przekroczenie koperty ma różne reguły w silniku, odprawie, powiadomieniach, grze i Daily Bias (próg 20%, koperty codzienne, limit 0)

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:907`, `src/shared/calc/game.ts:210`, `src/shared/notify.ts:64`, `src/shared/notify.ts:65`, `src/shared/notify.ts:67`, `src/shared/calc/briefing.ts:27`, `src/shared/schema/budget.ts:320`

**Co się dzieje.** (a) W Dowództwie próg poważnego naruszenia ustawiono na 50%. Koperta Auto 100 zł, wydane 130 zł: odprawa pokazuje czerwony alarm (stałe 20% w silniku), a gra liczy zwykłe naruszenie. Przy progu 10% jest odwrotnie: żółty alarm przy poważnym naruszeniu. (b) Jedzenie (koperta codzienna) 1 500 zł, wydane 1 600 zł, Rozrywka niewykorzystana, więc pula dzienna (D16) jest w normie. Przychodzi powiadomienie „Koperta Jedzenie przekroczona” z dźwiękiem alarmu i czerwonym paskiem. Odprawa nie ma alarmu, gra nie liczy naruszenia, a Daily Bias nie może być Bullish, bo `every(e.spent <= e.limit)` obejmuje też koperty codzienne. (c) Koperta planowa z limitem 0 zł („nic na prezenty w tym miesiącu”) i zakup za 50 zł: silnik daje czerwony alarm (50 > 0 × 1,2), gra zwykłe naruszenie (próg tylko przy limit > 0), a powiadomienia nie ma wcale (`if (e.limit <= 0) continue`).

**Poprawka.** Jedna funkcja `envelopeOverrun(e, settings.game)` → {over, serious, level} dla silnika (kolor wg seriousEnvelopePct), gry i powiadomień. Limit 0 traktować wszędzie tak samo, czyli przekroczenie powiadamia, a „ponad 80%” pominąć. Dla kopert codziennych trzeba wybrać jedno: albo powiadomienie łagodne (bez dźwięku alarmu, „ponad podział koperty”) i pominięte w Daily Bias, albo alarm w silniku. To decyzja użytkownika, bo D16 i T56 nic o tym nie mówią.

## N103. Odprawa pokazuje tylko pierwszą dopłatę do XTB wbrew firewallowi w miesiącu

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/shared/calc/briefing.ts:152`, `src/shared/calc/briefing.ts:155`

**Co się dzieje.** W miesiącu były dwie dopłaty wbrew rozkazowi: 500 zł i 1 000 zł. Odprawa ma jedną linię „Firewall: dopłata do XTB 500,00 zł wbrew rozkazowi”, choć gra liczy dwa poważne naruszenia. Energia wyczerpana i braki zbiorników są sumowane, a firewall nie (klucz bez `ref` i `txId`).

**Poprawka.** briefing.ts:152: dopisywać txId do klucza także dla 'firewall' (`a.kind === 'correction' || a.kind === 'firewall'`), czyli każda dopłata w osobnej linii. Można też je sumować z liczbą dopłat: „Firewall: 2 dopłaty do XTB, razem 1 500,00 zł wbrew rozkazowi”.

## N104. Wieczorne przypomnienie ustawione w godzinach ciszy nocnej nigdy nie przychodzi

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/shared/notify.ts:40`, `src/shared/notify.ts:55`, `src/renderer/features/settings/MachineTabs.tsx:150`

**Co się dzieje.** Cisza nocna 23:00–5:00 (domyślnie). Użytkownik ustawia „Raport wachty dnia” na 23:30. W ciszy dueNotices zwraca pustą listę, a po 5:00 jest już następny dzień i warunek `time >= '23:30'` jest fałszywy aż do 23:30, czyli znowu w ciszy. Przypomnienie nie przychodzi nigdy, a ustawienia o tym nie mówią.

**Poprawka.** Przy polu godziny pokazać ostrzeżenie, gdy inClockWindow(eveningTime, quietHours.from, quietHours.to). Druga możliwość: w dueNotices liczyć efektywną godzinę wieczorną jako min(eveningTime, początek ciszy − 1 min), jeśli ta pierwsza wypada w ciszy.
