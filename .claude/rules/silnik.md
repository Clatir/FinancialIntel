---
paths:
  - "src/shared/calc/**"
  - "src/shared/schema/**"
  - "src/shared/operationsView.ts"
  - "src/renderer/store/fleet.ts"
  - "src/renderer/store/game.ts"
  - "src/renderer/features/sensors/**"
  - "tests/unit/fleet.test.ts"
  - "tests/unit/household.test.ts"
  - "tests/unit/repayments.test.ts"
  - "tests/unit/share.test.ts"
  - "tests/unit/plan*.test.ts"
  - "tests/unit/goals.test.ts"
  - "tests/unit/loans.test.ts"
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
- Schematy (zod) są źródłem typów; zmiany addytywne (`openEnum`, `lenientRecord`, `z.looseObject`).

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
`course.ts` (kurs i manewry), `yearPlan.ts` (plan roczny), `cargoStatus.ts` / `cargoWatch.ts` (opłaty, ceny, ciche
kontenery), `anomalies.ts`, `returns.ts` (zwroty w drodze), `tags.ts` (tagi i wyprawy), `drill.ts`, `fuel.ts` (bilans
paliwa), `netWorth.ts`, `inflation.ts`, `why.ts` („skąd ta liczba?”), `game.ts` (oceny dni, stopnie, misje),
`intel.ts` (analizy ICT), `inbox.ts` (meldunki), `quick.ts` (szablony szybkiego wpisu), `effect.ts` (skutek zmiany
zbiorczej).

Szczegóły funkcji i powody zmian: `docs/archiwum/claude-md-do-1.15.4.md` (Grep po nazwie funkcji) i `docs/decyzje.md`
(T-decyzje).
