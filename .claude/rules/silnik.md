---
paths:
  - "src/shared/calc/**"
  - "src/shared/schema/**"
  - "src/shared/operationsView.ts"
  - "src/renderer/store/fleet.ts"
  - "src/renderer/store/game.ts"
  - "src/renderer/features/sensors/**"
  - "tests/unit/fleet.test.ts"
  - "tests/unit/fleet-n*.test.ts"
  - "tests/unit/household.test.ts"
  - "tests/unit/household-n2-*.test.ts"
  - "tests/unit/repayments.test.ts"
  - "tests/unit/share.test.ts"
  - "tests/unit/plan*.test.ts"
  - "tests/unit/goals.test.ts"
  - "tests/unit/loans.test.ts"
  - "tests/unit/loans-n2-*.test.ts"
  - "tests/unit/numbers-agree.test.ts"
---

# Silnik budżetu i obliczenia (`src/shared/calc`)

## Niezmienniki
- Stany warstw nigdy nie są zapisywane – `computeFleet` (`calc/fleet.ts`) liczy je z rekordów deterministycznie.
  Suma warstw = suma sald kont każdego dnia (`layersSum(state) === state.total`) – pilnuje `tests/unit/fleet.test.ts`.
- Kwoty w groszach (liczby całkowite, PLN); podział z resztą w ostatniej części (`splitEvenly`).
- Daty warszawskie (`calc/dates.ts`); dni robocze z polskimi świętami (`isWorkingDay`) tylko w `addWorkingDays`.
- Każda reguła ma test na przykładzie ze specyfikacji; każda poprawka – test, który bez niej pada.
- Nowe zachowanie wchodzi od dnia przejścia zapisanego w danych (`settings.household.since`, `settings.household.assignFrom`,
  `goal.activeFrom`) – historia sprzed przejścia liczy się jak dawniej. **Brak pola ≠ null:** `household.since` /
  `household.assignFrom` – brak = zachowanie sprzed wersji albo jednorazowe uzupełnienie (`useHouseholdSinceSeed`),
  null = od startu budżetu / zawsze; `openingIds` – brak = wszystkie operacje. Schemat: `nullable().optional()` – nie
  zamieniaj jednego na drugie.
- Przelew dwustronny (1.7.0): każda strona liczy się na swoim koncie i w swoim dniu – salda i obliczenia kont przez
  `amountOn`, `dateOn`, `touchesAccount` (`calc/operations.ts`), nigdy przez `t.amount` / `t.accountId` wprost.
- Wspólny zakup (1.5.0): `share` to tylko opis, prawdą są linie `splits` (jedna na osobę; starsza wersja czyta je jak
  paragon) – dlatego `withBankAmount` przebudowuje tylko wspólne zakupy.
- Nowe pole kwoty w groszach dopisz do `AMOUNT_FIELDS` (`shared/merge.ts`) – inaczej historia, konflikty i zmiany z
  drugiego komputera pokażą surowe grosze i zignorują ukrycie kwot.
- Rekordy pochodne ze stałym id (`fixedId`, `derivedId`, `monthPlanId`, `gameMonthId`).
- Gra: dni zamrożone przez `advanceGame` nie zmieniają się po późniejszej edycji operacji; miesiące nowszej wersji
  pomijane. Zapisy w tle tylko „w użyciu” (`writesInBackground`).
- Gra (1.15.7): porcja zamrażania (`DAYS_PER_PASS`) zawsze w osobnym zadaniu (`schedulePortion`, T380) – zapis w ciele
  efektu przy zaległości > 100 dni to #185. Dni bez danych z banku (`importWait`) czekają na pytanie najwyżej 7 dni
  (`waitImport`, T381), misja tygodnia z nimi; nowe wstrzymanie – opcja `advanceGame`, nigdy przeliczanie zamrożonych.
  Zmiana klasy z nowych danych (`GameDay.clsBefore`, T382) nie jest świętowana. Potwierdzenie salda w misji – po chwili
  potwierdzenia (`confirmedAt`, bez niej `createdAt`), nigdy po `updatedAt` ani dacie salda (T383).
- Kurs i symulator (1.15.7, T385–T387): osłony w kursie nigdy poniżej zera – czego brak, to `short`, pensja bez
  pieniędzy `partial`; „teraz” symulatora = stan silnika (`rangeNow` z `courseInputOf`), boje i spłaty reszty miesiąca
  tylko w `rangeRest`; warstwa pełna teraz – data tego miesiąca. Resztka miesiąca płaci plan z energii miesiąca
  (`CourseInput.energy`, `restNeeds` – pula dzienna, koperty planowe, opłaty ze stanu AP-10), ponad nią z osłon (T390);
  kadłub pełny w kursie od 99 % (`hullCountsFull`), raty celów kursu przy 100 % (T391).
- Osłony + kadłub na koniec miesiąca (`cushion.ts`, T388–T389) to sumy `moves` logu silnika: **każdy ruch osłon
  i kadłuba w silniku ma wpis w logu** (`record`; także dopełnienie kadłuba `hull`, T373) – inaczej trend przechodzi na
  przebieg silnika na każdy miesiąc (wolno).
- Schematy (zod) są źródłem typów; zmiany addytywne (`openEnum`, `lenientRecord`, `z.looseObject`).
- Pewne dopasowanie zwrotu (D91 b, T329): każda osoba wpłaty osobno (`repaymentSharesByMember`) – import i szybki wpis
  `linkRepayments`, edytor przy zmianie części `moreSureCovers` / `keptCovers`; wpłata ≥ cały dług osoby wiąże wszystkie.
- Przeniesienie środków celu (T340, od 1.15.6 – nie „na koniec dnia” T129): w chwili `at` wśród zdarzeń dnia, przed
  pierwszym, które przyszło do FI później (`cameIn` – dokowanie, inaczej operacja; łupy – `decidedAt`, `Ev.at`); czego
  cel wtedy nie ma – na koniec dnia (`short`). Kolejności operacji w dniu to nie zmienia; wydatek z celu i dostawa po
  przeniesieniu widzą cel jak ekran.
- Para do zadokowania (T341, od 1.15.6): silnik nie czyta ICTTJ – pary niezadokowane dostaje jako
  `FleetInput.pendingPairs` (`pendingPairsOf` z `deliveries`; w oknie `store/fleet.ts` `pendingPairsFor` z listy panelu
  Dokowanie – jedna pamięć `store/deliveries.ts`, gra przez `gameInputOf`) i liczy je jak dokowanie z pulą wpisu
  (`dockByPool`, tylko rodzaje `countsByPool`); rekord dokowania decyduje nad parą – dokowanie pary liczonej według puli
  liczy się od chwili jej operacji (`countedFrom` z `dockingOf` – ten sam `countsByPool`, T363), bez pola od swojego
  utworzenia (T128). Nowe wejście silnika z ICTTJ dopisz do klucza (`keyOf`,
  `useEngineParts`, `engineParts` w `game.ts`).
- Rata zbiornika (T29) tylko przez `tankWant` – silnik, kreator (`startTanks`) i plan liczą jedną regułą; cykl zapłacony
  (także płatnością sprzed startu – `paidBeforeStart`, T345) nie ma rat, zbiornik zbiera na następny. Cykle zapłacone
  tylko z reguły Ładowni (`paidDuesOf`, T393 – na przełomie płatności sprzed niego), nigdy własną regułą; która płatność
  płaci opłatę – tylko `paymentsIndex` (Ładownia, silnik, kreator `startPaidDays`; T393 po scaleniu z N2: wydatek, także
  z celu i do zwrotu, inny rodzaj nigdy), nigdy własny filtr. **Pułapka:** płatność z celu / do zwrotu zamyka cykl, ale
  nie bierze ze zbiornika – pieniądze rusza przebieg (`runTx`: cel, księga domowników), cykl – `paymentsIndex`. Miesiąc
  przed silnikiem – `monthAhead` od jego stanu teraz (T346), nigdy rata nominalna; bez pensji pobrane 0, wymagana obok.
  Podpowiedź raty w Ładowni – `tankRate` (T377: `want` silnika, cykl zapłacony bez raty), nigdy `sinkingInstallment` od
  pustego zbiornika.
- Energia dziś (AP-13, od 1.15.7): ekrany, podglądy i Daily Bias czytają `daily.energy` – `daily.left`, nie więcej niż
  energia miesiąca (`cappedEnergy`, powód `daily.cap` – T371); `left` zostaje miarą przekroczenia dnia (alarm, gra).
  Zwrot ponad dzisiejsze zakupy swojej kategorii głównej (`returned`) nie wchodzi do dziś, od jutra jest w puli (T370).
  Podgląd szybkiego wpisu – `energyAfter` (z `month`, `returned`), „Pokryj z koperty…” – `energyAfterLimit`.
- Kadłub pełny dla firewalla i „wolnego do decyzji” od 99 % celu (`hullCountsFull`, T372) – dokowanie dalej do 100 %,
  raty celów (T272) przy 100 %. „Dopełnij kadłub z osłon” (T373): wpis `hullTopUps` planu miesiąca, silnik w jego chwili
  (kolejka przeniesień T340), nigdy więcej niż nadwyżka osłon i brak kadłuba.
- Jeden stan opłaty (T375, T376, T393, T394, od 1.15.7): płatności do terminów tylko przez `feeDuesOf` / `feeDues` /
  `dueWindow` (`calc/cargoStatus.ts` – stan, Radar, odprawa, straż ładowni, silnik, kreator); terminy budżetu od dnia
  startu; „Zapłacone (dziś)” (`payToday`) – płatność dziś policzona tą regułą; niezapłacony termin wcześniejszego
  miesiąca zostaje (`CargoStatus.carried`) do zapłaty – konsument mapujący stan po kontenerze filtruje `!carried`.
  Terminy naprzód na dniu z historii (`cargoDays` → `payDays`, `nextDueOf`), nigdy wprost z `dueDay`; `dueAt` – dzień
  ustawiony ręcznie.
- Wpłata domownika (AP-4, T350): `incomeShares` (czyje pieniądze) → `planOf` / `inflowPlanOf` (spłata długu / tylko
  wskazane / bez spłaty; wskazane należą do części „spłata” tej osoby, gdy ją ma) → `repay` (które zakupy). Jawny
  niezależny przychód i zaliczka na przyszłość omijają dług (D99 S4), ale wskazane zakupy spłacają (naprawa liczona przy
  odczycie); omijające dług – `ledger.skipped` → meldunek o tym, co nadal jest do oddania przez nie (`SkippedDebt.open`),
  „Spłać” spłaca tylko to (`repayingAdvancesOf`, T352). Nowy sposób wpłaty dopisz jako część albo plan tutaj, nie obok.
  **Pułapka:** przy osobie dług i zaliczka naraz (`balanceText`, AF-16) – inaczej depozyt ≠ suma przy osobach.
  **Pułapka:** zmiana dawnej wpłaty liczy się od jej dnia – nie może zabrać długu późniejszej spłacie ani zaliczki
  późniejszemu zakupowi (przegląd 2 N2: dług 50 → 150 zł).
- Spłata pożyczki częścią wpłaty (D100, T355–T356): linia wpływu `Split.loanId` bez domownika – część `incomeShares`
  z `loanId`, poza księgą domowników. Spłaty pożyczki czytaj tylko przez `loanParts` / `forEachLoanOperation` /
  `loanIdsOf` (stan, silnik `repayLoanParts`, wartość netto, statystyki, filtr), nigdy samo `t.loanId`; ile spłaty idzie
  na dług (reszta – odsetki, przychód T70) – tylko `loanBacksOf` (silnik i statystyki, po kolei całej historii, także
  w saldzie otwarcia konta). **Pułapka:** linia ma `memberId: null` – kod, który bierze takie części za „mój przychód”
  (tagi), musi pominąć `loanId`.

## Wydajność
- Pamięć po rekordzie albo liście w `WeakMap` (`sortedOps`, `partsOf`, `costsByMonth`, `payeeKey`); wyniki tylko do odczytu.
- W oknie silnik liczony raz (`store/fleet.ts` `useFleet`) z kluczem z czytanych części (`KEY_SETTINGS`,
  `KEY_COLLECTIONS`, `useEngineParts`) – nowe pole czytane przez silnik dopisz do klucza, inaczej ekran nie odświeży się.
  To samo czujniki: przeliczają się tylko przy zmianie pól z `SENSOR_FIELDS` (`features/sensors/inputs.ts`).
- Zmiany wydajności mierz na syntetycznym folderze 30 tys. i 150 tys. operacji (metoda: archiwum postępu, „1.4.3”).

## Mapa `calc/`
`fleet.ts` (warstwy, dokowanie, pensja, koperty, przydział, odkładki, zasięg, klasa), `plan.ts` / `start.ts` (plan
miesiąca, debriefing, łupy, kreator), `briefing.ts` (odprawa, Daily Bias), `dock.ts` (dostawy z ICTTJ), `goals.ts`
(cele, ETA, tempo), `loans.ts` (pożyczki), `household.ts` (rozliczenia z domownikami), `repayments.ts` (zwroty
przypisane do zakupów), `share.ts` (wspólne finansowanie), `income.ts` (przychody), `history.ts` (zakres historii do
średnich), `balances.ts` (salda otwarcia, potwierdzenia), `operations.ts` (części operacji, koszt, przelewy dwustronne),
`transfers.ts`, `kinds.ts`, `radar.ts` (radar 90 dni), `scheduled.ts` (boje), `ahead.ts` (salda kont naprzód),
`course.ts` (kurs i manewry), `cushion.ts` (osłony + kadłub i zasięg na koniec miesięcy), `yearPlan.ts` (plan
roczny), `cargoStatus.ts` / `cargoWatch.ts` (opłaty, ceny, ciche kontenery), `anomalies.ts`, `returns.ts` (zwroty
w drodze), `tags.ts` (tagi i wyprawy), `drill.ts`, `fuel.ts` (bilans paliwa), `netWorth.ts`, `inflation.ts`, `why.ts`
(„skąd ta liczba?”), `game.ts` (oceny dni, stopnie, misje), `intel.ts` (analizy ICT), `inbox.ts` (meldunki), `quick.ts`
(szablony szybkiego wpisu), `effect.ts` (skutek zmiany zbiorczej).

Szczegóły funkcji i powody zmian: `docs/archiwum/claude-md-do-1.15.4.md` (Grep po nazwie funkcji) i `docs/decyzje.md`
(T-decyzje).
