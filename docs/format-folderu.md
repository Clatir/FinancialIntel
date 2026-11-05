<!-- Plik generowany: npm run docs:format (scripts/format-folderu.ts ze schematów src/shared/schema). Nie edytuj ręcznie. -->

# Format folderu danych Financial Intel

Opis dla własnych narzędzi: skryptów, arkuszy, kopii w innym programie. Folder danych to zwykłe pliki JSON – można je
czytać bez aplikacji. Przykładowy skrypt odczytu: [`docs/przyklady/odczyt.mjs`](przyklady/odczyt.mjs) (Node.js, bez
dodatkowych bibliotek – suma wydatków miesiąca po kategoriach).

## Najważniejsze zasady

- **Tylko odczyt.** Nie zapisuj do folderu z zewnątrz, gdy aplikacja działa na którymkolwiek komputerze – aplikacja
  pilnuje zapisów, historii i scalania zmian dwóch komputerów; obcy zapis może zostać nadpisany albo wzięty za konflikt
  OneDrive. Jeśli już coś zmieniasz ręcznie: zamknij aplikację na wszystkich komputerach, poczekaj na synchronizację
  OneDrive, zrób kopię (Ustawienia → Folder i kopie) i dopiero wtedy edytuj.
- **Stanów warstw nie ma w plikach.** Osłony, kadłub, energia, zbiorniki, zasięg i klasa okrętu są liczone przez
  aplikację z rekordów za każdym razem – w folderze są tylko operacje, plany, kontenery, cele i pozostałe zapisy.
- **Kwoty w groszach**, liczby całkowite, tylko PLN: `-1250` to −12,50 zł. W operacji znak mówi o kierunku: pieniądze
  wychodzące z konta < 0, wchodzące > 0.
- **Daty** operacji, sald, dokowań i boi to daty warszawskie `RRRR-MM-DD` (bez godziny); miesiące `RRRR-MM`; chwile
  zapisu (`createdAt`, `updatedAt` i inne pola „…At”) – ISO 8601 w UTC, np. `2026-11-05T09:30:00.000Z`. Godzina
  operacji (`time`, `GG:MM`) jest opcjonalna – import z mBanku jej nie ma.
- **Identyfikatory** to ULID (26 znaków, np. `01KDEFACC00000000000000001`); nazwa pliku zawiera identyfikator rekordu.
  Domyślne konta, kategorie i domownik mają stałe identyfikatory `01KDEF…` – takie same w każdym folderze.
- **JSON** z wcięciem 2 spacje i znakiem nowej linii na końcu; ścieżki w polach względne, z `/`.
- **Wersja formatu** w każdym pliku: `schemaVersion` (teraz 1). Plik z wyższą wersją zapisała nowsza aplikacja –
  starsza czyta go tylko do odczytu. Nowe pola dochodzą bez zmiany wersji, więc narzędzie powinno **pomijać pola, których
  nie zna** (aplikacja zachowuje je przy zapisie) i nie zakładać, że opcjonalne pole jest zawsze obecne.

## Układ folderu

```
fi.json                                  ustawienia: konta, kategorie, warstwy, rozkazy, domownicy, reguły importu
transactions/RRRR/RRRR-MM-DD_ULID.json   operacja (data warszawska w nazwie)
containers/ULID.json                     kontener Ładowni albo opłata okresowa
goals/ULID.json                          cel (własny albo z prognozy ICTTJ)
months/RRRR-MM.json                      plan miesiąca: pensja, koperty, podział łupów
dockings/RRRR/RRRR-MM-DD_ULID.json       dokowanie wpływu
loans/ULID.json                          pożyczka (udzielona albo wzięta) z harmonogramem
balances/RRRR/RRRR-MM-DD_ULID.json       saldo otwarcia albo potwierdzenie salda konta
game/RRRR-MM.json                        Dowództwo: oceny dni, misje, awanse (zamrożone)
scheduled/ULID.json                      boja: zaplanowany wydatek, wpływ albo termin
imports/ULID.json                        paczka importu z banku (do „Cofnij import”)
backups/                                 kopie ZIP (dzienne, tygodniowe, przed importem)
.history/                                poprzednie wersje rekordów
.presence/                               obecność komputerów (który komputer ma aplikację otwartą)
```

Rekordem jest tylko plik o dokładnie takiej nazwie. Pliki tymczasowe (`.tmp-` w nazwie), foldery zaczynające się od
kropki i `backups/` nie są rekordami – narzędzie powinno je pomijać.

## Historia (`.history/`)

Przed nadpisaniem albo usunięciem rekordu aplikacja odkłada jego poprzednią wersję do
`.history/<rodzaj>/<id>/<czas>_<powód>_<losowe>.json` (`rodzaj` to nazwa folderu rekordu albo `fi`). Plik historii
ma pola `savedAt`, `savedBy` (komputer), `reason` (np. `edit`, `delete`) i `record` – całą wersję rekordu.
Zostaje najwyżej 40 wersji jednego rekordu. Historia nie jest stanem – bieżące dane są tylko w plikach rekordów.

## Konflikty OneDrive

Gdy dwa komputery zmienią ten sam plik, OneDrive zostawia obok kopię z dopiskiem w nazwie (np.
`fi-KOMPUTER.json`, `2026-11-05_01K…-KOMPUTER.json`). Taka kopia **nie jest rekordem** – nazwa nie pasuje do układu
wyżej. Aplikacja wykrywa ją i scala zmiany (pole po polu) albo pyta, co zostawić. Narzędzie czytające powinno brać tylko
pliki o kanonicznej nazwie, inaczej policzy rekord dwa razy.

## Pola rekordów

Tabele niżej są wygenerowane ze schematów aplikacji. Ścieżka `a.b` to pole obiektu `a`, `a[]` – element listy,
`a{}` – wartość mapy (klucze mapy opisuje typ). „Wymagane” – pole jest w każdym pliku; „domyślnie …” – brak pola
aplikacja czyta jako tę wartość (zapisuje je przy następnej zmianie); „opcjonalne” – pole może nie istnieć i brak ma
własne znaczenie (opisane obok).

### Pola każdego rekordu

Każdy plik rekordu (także `fi.json`) ma na początku te pola:

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `schemaVersion` | liczba całkowita | wymagane | Wersja formatu pliku. |
| `id` | ULID | wymagane | Identyfikator rekordu (ULID); ten sam co w nazwie pliku. |
| `createdAt` | chwila ISO 8601 (UTC) | wymagane | Kiedy rekord powstał. |
| `updatedAt` | chwila ISO 8601 (UTC) | wymagane | Kiedy rekord zmieniono ostatnio. |
| `updatedBy` | tekst | opcjonalne, może być `null` | Nazwa komputera, który zapisał tę wersję; `null` – zmiana spoza aplikacji. |

### Ustawienia folderu – `fi.json`

Jeden plik w korzeniu folderu. Wszystkie ustawienia budżetu wspólne dla komputerów są w obiekcie `settings` (ustawienia jednego komputera – okno, zasobnik, folder kopii – są poza folderem danych, w profilu użytkownika Windows).

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `settings` | obiekt | domyślnie pusty obiekt | Ustawienia budżetu wspólne dla wszystkich komputerów. |
| `settings.shipName` | tekst | domyślnie `"Flagowiec"` | Nazwa okrętu (Mostek, menu boczne). |
| `settings.sync` | obiekt | domyślnie pusty obiekt | Praca na kilku komputerach. |
| `settings.sync.remoteChanges` | jedna z: `merge`, `ask` | domyślnie `"merge"` | Rekord zmieniony tu i na drugim komputerze: `merge` – scal pole po polu, `ask` – zawsze pytaj. |
| `settings.layoutPresets` | lista: obiekt | domyślnie pusta lista | Zapisane układy ekranów (Układ → zapisz). |
| `settings.layoutPresets[].id` | ULID | wymagane | Identyfikator układu. |
| `settings.layoutPresets[].name` | tekst | wymagane | Nazwa układu. |
| `settings.layoutPresets[].page` | tekst | wymagane | Ekran, którego dotyczy. |
| `settings.layoutPresets[].panels` | mapa: tekst → obiekt | domyślnie pusty obiekt | Panele ekranu po nazwie. |
| `settings.layoutPresets[].panels{}.collapsed` | tak / nie (`true` / `false`) | opcjonalne | Panel zwinięty. |
| `settings.layoutPresets[].panels{}.height` | liczba | opcjonalne | Wysokość panelu w pikselach. |
| `settings.layoutPresets[].panels{}.hidden` | tak / nie (`true` / `false`) | opcjonalne | Panel ukryty. |
| `settings.layoutPresets[].columns` | mapa: tekst → lista: liczba | domyślnie pusty obiekt | Szerokości kolumn ekranu. |
| `settings.accounts` | lista: obiekt | domyślnie zestaw startowy | Konta budżetu (domyślnie mBank, Portfel XTB, Gotówka). |
| `settings.accounts[].id` | ULID | wymagane | Identyfikator konta – `accountId` w operacjach i saldach. |
| `settings.accounts[].name` | tekst | wymagane | Nazwa konta. |
| `settings.accounts[].kind` | tekst z listy (nowsza wersja może dodać wartość) | domyślnie `"bank"` | Rodzaj: `bank`, `wallet` (portfel z kartą), `cash` (gotówka), `other`. |
| `settings.accounts[].importFormat` | tekst z listy (nowsza wersja może dodać wartość) | domyślnie `null`, może być `null` | Format pliku z banku, który import czyta dla konta (`mbank`); `null` – bez importu. |
| `settings.accounts[].archived` | tak / nie (`true` / `false`) | domyślnie `false` | Konto zarchiwizowane (nie przyjmuje nowych operacji). |
| `settings.categories` | lista: obiekt | domyślnie zestaw startowy | Kategorie: główne i podkategorie. |
| `settings.categories[].id` | ULID | wymagane | Identyfikator kategorii – `categoryId` w operacjach. |
| `settings.categories[].name` | tekst | wymagane | Nazwa kategorii. |
| `settings.categories[].parentId` | ULID | domyślnie `null`, może być `null` | Kategoria główna podkategorii; `null` – to kategoria główna. |
| `settings.categories[].envelope` | tekst z listy (nowsza wersja może dodać wartość) | domyślnie `null`, może być `null` | Koperta kategorii głównej: `daily` (pula dzienna – energia dnia), `planned` (limit miesięczny); `null` – poza kopertami. Podkategoria bierze kopertę swojej głównej. |
| `settings.categories[].system` | tekst z listy (nowsza wersja może dodać wartość) | domyślnie `null`, może być `null` | Kategoria, na której aplikacja się opiera: `cash` – wypłata z bankomatu. |
| `settings.categories[].archived` | tak / nie (`true` / `false`) | domyślnie `false` | Kategoria zarchiwizowana. |
| `settings.layers` | obiekt | domyślnie pusty obiekt | Cele warstw. |
| `settings.layers.shieldSalaries` | liczba całkowita | domyślnie `3` | Cel osłon w pensjach. |
| `settings.layers.hullMonths` | liczba całkowita | domyślnie `6` | Cel kadłuba w miesiącach średnich kosztów. |
| `settings.layers.assumedCosts` | grosze (liczba całkowita) | domyślnie `null`, może być `null` | Założone miesięczne koszty, dopóki historia ma mniej niż 3 pełne miesiące. |
| `settings.orders` | obiekt | domyślnie pusty obiekt | Rozkazy. |
| `settings.orders.minShieldSalaries` | liczba | domyślnie `1` | Minimalne osłony w pensjach. |
| `settings.orders.cargoLimitPct` | liczba | domyślnie `40` | Linia zanurzenia: stałe koszty najwyżej tyle procent pensji. |
| `settings.orders.quietHours` | obiekt | domyślnie pusty obiekt | Cisza nocna – zakup w niej wymaga potwierdzenia i krótkiego wpisu. |
| `settings.orders.quietHours.from` | godzina GG:MM | domyślnie `"23:00"` | Początek ciszy nocnej. |
| `settings.orders.quietHours.to` | godzina GG:MM | domyślnie `"05:00"` | Koniec ciszy nocnej. |
| `settings.orders.impulseThreshold` | grosze (liczba całkowita) | domyślnie `20000` | Od tej kwoty dziennik kapitański pyta „plan czy impuls?”. |
| `settings.orders.firewall` | tak / nie (`true` / `false`) | domyślnie `true` | Dopłaty do konta tradingowego XTB tylko z pieniędzy wolnych do decyzji. |
| `settings.budget` | obiekt | domyślnie pusty obiekt | Start budżetu. |
| `settings.budget.start` | data RRRR-MM-DD | domyślnie `null`, może być `null` | Pierwszy dzień warstw; `null` – najwcześniejsze saldo otwarcia. |
| `settings.budget.initial` | obiekt | domyślnie `null`, może być `null` | Podział pieniędzy na starcie (kreator); `null` – kolejność dokowania. |
| `settings.budget.initial.shields` | grosze (liczba całkowita) | domyślnie `0` | Osłony na starcie. |
| `settings.budget.initial.hull` | grosze (liczba całkowita) | domyślnie `0` | Kadłub na starcie. |
| `settings.budget.initial.goals` | mapa: ULID → grosze (liczba całkowita) | domyślnie pusty obiekt | Cele na starcie: identyfikator celu → kwota. |
| `settings.budget.initial.tanks` | mapa: ULID → grosze (liczba całkowita) | opcjonalne | Zbiorniki opłat okresowych na starcie: identyfikator kontenera → kwota. |
| `settings.import` | obiekt | domyślnie pusty obiekt | Import z banku. |
| `settings.import.ownNames` | lista: tekst | domyślnie pusta lista | Moje nazwy, jak pisze je bank – przelewy do i od nich to przelewy własne. |
| `settings.import.rules` | lista: obiekt | domyślnie pusta lista | Reguły importu: operacja tego kontrahenta staje się… |
| `settings.import.rules[].id` | ULID | wymagane | Identyfikator reguły. |
| `settings.import.rules[].match` | tekst | wymagane | Czego szuka: klucz marki albo nazwy, jej fragment albo słowa (zależnie od `mode`). |
| `settings.import.rules[].mode` | tekst z listy (nowsza wersja może dodać wartość) | domyślnie `"exact"` | Dopasowanie: `exact` (marka), `contains` (fragment), `keyword` (słowa w nazwie albo tytule), `amount` (marka do kwoty `maxAmount`). |
| `settings.import.rules[].maxAmount` | liczba całkowita | opcjonalne, może być `null` | Reguły `amount`: operacja do tej kwoty (grosze, bez znaku). |
| `settings.import.rules[].direction` | tekst z listy (nowsza wersja może dodać wartość) | domyślnie `null`, może być `null` | Kierunek: `in` (wpływ), `out` (wydatek); `null` – oba. |
| `settings.import.rules[].counterparty` | tekst | opcjonalne | Reguły słów: dodatkowo ten kontrahent. |
| `settings.import.rules[].label` | tekst | domyślnie `""` | Kontrahent, jak pisze go bank (na liście reguł). |
| `settings.import.rules[].kind` | tekst z listy (nowsza wersja może dodać wartość) | domyślnie `"expense"` | Rodzaj operacji, który reguła daje (jak `kind` operacji). |
| `settings.import.rules[].categoryId` | ULID | domyślnie `null`, może być `null` | Kategoria, którą reguła daje. |
| `settings.import.rules[].refundable` | tak / nie (`true` / `false`) | domyślnie `false` | Wydatek finansowany przez domownika. |
| `settings.import.rules[].household` | tak / nie (`true` / `false`) | domyślnie `false` | Wpływ od domownika (najpierw spłaca jego zakupy). |
| `settings.import.rules[].memberId` | ULID | domyślnie `null`, może być `null` | Domownik; `null` – pierwszy („Dom”). |
| `settings.import.rules[].inflowKind` | jedna z: `repay`, `income`, `advance` | opcjonalne | Wpływ domownika: `repay` (spłata), `income` (niezależny przychód), `advance` (zaliczka). |
| `settings.import.rules[].gift` | tak / nie (`true` / `false`) | opcjonalne | Zakup, który domownik daje w prezencie (nikt go nie oddaje). |
| `settings.import.rules[].share` | obiekt – zob. „Wspólny zakup” | opcjonalne, może być `null` | Zakup finansowany przez kilka osób – zob. „Wspólny zakup”. |
| `settings.import.rules[].counterAccountId` | ULID | domyślnie `null`, może być `null` | Przelewu własnego: drugie konto budżetu. |
| `settings.import.rules[].loanId` | ULID | opcjonalne, może być `null` | Pożyczka udzielona, którą wpływ spłaca. |
| `settings.import.rules[].loanAmount` | liczba całkowita | opcjonalne, może być `null` | Część każdego wpływu spłacająca `loanId` (grosze); brak – cały wpływ. |
| `settings.import.rules[].tags` | lista: tekst | opcjonalne | Tagi, które reguła daje. |
| `settings.import.rules[].learned` | tak / nie (`true` / `false`) | domyślnie `true` | `true` – reguła nauczona z decyzji; `false` – wpisana ręcznie (nauka jej nie zmienia). |
| `settings.import.rules[].hits` | liczba całkowita | domyślnie `0` | Ile razy reguła zadziałała. |
| `settings.import.rules[].updatedAt` | chwila ISO 8601 (UTC) | wymagane | Kiedy regułę zmieniono. |
| `settings.import.lastImport` | mapa: ULID → chwila ISO 8601 (UTC) | domyślnie pusty obiekt | Ostatni import konta: identyfikator konta → chwila. |
| `settings.import.coveredTo` | mapa: ULID → data RRRR-MM-DD | domyślnie pusty obiekt | Ostatni dzień, który pokrywają zaimportowane pliki konta. |
| `settings.import.log` | mapa: chwila ISO 8601 (UTC) → ULID | domyślnie pusty obiekt | Importy (ostatnie 100): chwila → konto. |
| `settings.import.accountNumbers` | mapa: tekst → dowolna wartość | domyślnie pusty obiekt | Numer rachunku w banku z plików konta: identyfikator konta → numer (tekst). |
| `settings.import.notDuplicates` | mapa: tekst → dowolna wartość | domyślnie pusty obiekt | Grupy operacji, o których powiedziano „to nie duplikaty”: klucz → chwila (tekst). |
| `settings.import.aliases` | mapa: tekst → dowolna wartość | domyślnie pusty obiekt | Nazwy połączone w jedną: klucz marki → obiekt z polami `to` (klucz, z którym jest jednym), `label`, `toLabel`, `at`. |
| `settings.import.notSimilar` | mapa: tekst → dowolna wartość | domyślnie pusty obiekt | Pary nazw, o których powiedziano „to nie to samo”: klucz pary → chwila (tekst). |
| `settings.household` | obiekt | domyślnie pusty obiekt | Domownicy i rozliczenia z nimi. |
| `settings.household.members` | lista: obiekt | domyślnie zestaw startowy | Domownicy (domyślnie „Dom”). |
| `settings.household.members[].id` | ULID | wymagane | Identyfikator domownika – `memberId` w operacjach. |
| `settings.household.members[].name` | tekst | wymagane | Imię albo nazwa. |
| `settings.household.members[].bankNames` | lista: tekst | domyślnie pusta lista | Jak bank pisze nazwę domownika – import rozpoznaje jego przelewy. |
| `settings.household.members[].inflow` | tekst z listy (nowsza wersja może dodać wartość) | domyślnie `"ask"` | Jego pieniądze ponad dług: `ask` (pytaj), `advance` (zaliczka), `income` (przychód). |
| `settings.household.members[].archived` | tak / nie (`true` / `false`) | domyślnie `false` | Domownik zarchiwizowany. |
| `settings.household.members[].via` | ULID | domyślnie `null`, może być `null` | Domownik, przez którego zwykle przychodzą jego pieniądze (tylko podpowiedź). |
| `settings.household.members[].opening` | obiekt | domyślnie pusty obiekt | Jego saldo na start rozliczeń. |
| `settings.household.members[].opening.owed` | liczba całkowita | domyślnie `0` | Ile był winien na start (grosze). |
| `settings.household.members[].opening.deposit` | liczba całkowita | domyślnie `0` | Ile miał zaliczki na start (grosze). |
| `settings.household.members[].opening.since` | data RRRR-MM-DD | opcjonalne, może być `null` | Dzień najstarszego zakupu, z którego jest dług na start; `null` – nieznany. |
| `settings.household.since` | data RRRR-MM-DD | opcjonalne, może być `null` | Start rozliczeń z domownikami; `null` – od startu budżetu. |
| `settings.household.openingIds` | lista: tekst | opcjonalne | Operacje domowników sprzed startu rozliczeń, które weszły do sald na start; brak – wszystkie. |
| `settings.household.assignFrom` | data RRRR-MM-DD | opcjonalne, może być `null` | Od tego dnia pieniądze domownika spłacają tylko wskazane zakupy; `null` – zawsze. |
| `settings.ictj` | obiekt | domyślnie pusty obiekt | ICT Trade Journal (sama ścieżka do jego folderu jest ustawieniem komputera). |
| `settings.ictj.forecastId` | tekst | domyślnie `null`, może być `null` | Scenariusz prognozy ICTTJ, którego cele są celami okrętu; `null` – ostatnio zmieniony. |
| `settings.ictj.skipped` | lista: tekst | domyślnie pusta lista | Wpisy ICTTJ, których nie dokować. |
| `settings.game` | obiekt | domyślnie pusty obiekt | Dowództwo: start i progi. |
| `settings.game.start` | data RRRR-MM-DD | domyślnie `null`, może być `null` | Pierwszy oceniany dzień; `null` – jeszcze nie. |
| `settings.game.promoteDays` | liczba całkowita | domyślnie `30` | Awans: tyle dni zgodnych… |
| `settings.game.windowDays` | liczba całkowita | domyślnie `35` | …w ostatnich tylu dniach. |
| `settings.game.seriousEnvelopePct` | liczba całkowita | domyślnie `20` | Koperta ponad limit o więcej niż tyle procent to poważne naruszenie. |
| `settings.game.demoteSerious` | liczba całkowita | domyślnie `3` | Tyle poważnych naruszeń w miesiącu degraduje. |
| `settings.game.missionDays` | liczba całkowita | domyślnie `3` | Wykonana misja liczy się za tyle dni zgodnych. |
| `settings.game.noSpend` | mapa: data RRRR-MM-DD → chwila ISO 8601 (UTC) | domyślnie pusty obiekt | Dni potwierdzone w raporcie wieczornym jako bez wydatków: dzień → chwila. |
| `settings.seeded` | lista: tekst | domyślnie pusta lista | Pozycje startowe dodane już do folderu (żeby usunięta nie wróciła). |
| `settings.operationViews` | lista: obiekt | domyślnie pusta lista | Zapisane widoki Operacji. |
| `settings.operationViews[].id` | tekst | wymagane | Identyfikator widoku. |
| `settings.operationViews[].name` | tekst | wymagane | Nazwa widoku. |
| `settings.operationViews[].filter` | mapa: tekst → dowolna wartość | wymagane | Filtr listy Operacji (jak go zapisuje aplikacja). |
| `settings.operationViews[].withPeriod` | tak / nie (`true` / `false`) | domyślnie `false` | Widok ustawia też okres listy. |
| `settings.cargo` | obiekt | domyślnie pusty obiekt | Ładownia. |
| `settings.cargo.ignored` | lista: tekst | domyślnie pusta lista | Odbiorcy, których płatności nie są proponowane do Ładowni („Nie proponuj”). |
| `settings.anomalies` | obiekt | domyślnie pusty obiekt | Czujniki. |
| `settings.anomalies.ok` | lista: tekst | domyślnie pusta lista | Anomalie, o których powiedziano „w porządku”. |
| `settings.intel` | obiekt | domyślnie pusty obiekt | Wywiad. |
| `settings.intel.tagGoals` | mapa: tekst → dowolna wartość | domyślnie pusty obiekt | Cel tagu na Mapie gwiezdnej: klucz tagu → identyfikator celu. |
| `settings.intel.cpi` | mapa: tekst → dowolna wartość | domyślnie pusty obiekt | Inflacja CPI z GUS wpisana ręcznie: miesiąc RRRR-MM → zmiana rok do roku w procentach (liczba). |
| `settings.intel.forecast` | obiekt | opcjonalne | Założenia prognozy wieloletniej (Wywiad) – brak scenariusza: jego założenia domyślne. Prognoza nie czyta wyników tradingu z ICTTJ. |
| `settings.intel.forecast.cautious` | obiekt | opcjonalne | Scenariusz ostrożny: wszystkie cztery założenia albo żadne (wtedy domyślne). |
| `settings.intel.forecast.cautious.wages` | liczba | wymagane | Wzrost wpływów z pracy w procentach rocznie (od drugiego roku prognozy). |
| `settings.intel.forecast.cautious.inflation` | liczba | wymagane | Inflacja kosztów i pensji planu w procentach rocznie (od drugiego roku prognozy). |
| `settings.intel.forecast.cautious.deliveries` | grosze (liczba całkowita) | wymagane | Dostawy z ICTTJ do budżetu rocznie – założenie kapitana (0 = bez dostaw). |
| `settings.intel.forecast.cautious.oneOff` | grosze (liczba całkowita) | wymagane | Wydatki jednorazowe rocznie w cenach dzisiejszych (w ostatnim miesiącu każdego roku prognozy). |
| `settings.intel.forecast.base` | obiekt | opcjonalne | Scenariusz bazowy: wszystkie cztery założenia albo żadne (wtedy domyślne). |
| `settings.intel.forecast.base.wages` | liczba | wymagane | Wzrost wpływów z pracy w procentach rocznie (od drugiego roku prognozy). |
| `settings.intel.forecast.base.inflation` | liczba | wymagane | Inflacja kosztów i pensji planu w procentach rocznie (od drugiego roku prognozy). |
| `settings.intel.forecast.base.deliveries` | grosze (liczba całkowita) | wymagane | Dostawy z ICTTJ do budżetu rocznie – założenie kapitana (0 = bez dostaw). |
| `settings.intel.forecast.base.oneOff` | grosze (liczba całkowita) | wymagane | Wydatki jednorazowe rocznie w cenach dzisiejszych (w ostatnim miesiącu każdego roku prognozy). |
| `settings.intel.forecast.optimistic` | obiekt | opcjonalne | Scenariusz optymistyczny: wszystkie cztery założenia albo żadne (wtedy domyślne). |
| `settings.intel.forecast.optimistic.wages` | liczba | wymagane | Wzrost wpływów z pracy w procentach rocznie (od drugiego roku prognozy). |
| `settings.intel.forecast.optimistic.inflation` | liczba | wymagane | Inflacja kosztów i pensji planu w procentach rocznie (od drugiego roku prognozy). |
| `settings.intel.forecast.optimistic.deliveries` | grosze (liczba całkowita) | wymagane | Dostawy z ICTTJ do budżetu rocznie – założenie kapitana (0 = bez dostaw). |
| `settings.intel.forecast.optimistic.oneOff` | grosze (liczba całkowita) | wymagane | Wydatki jednorazowe rocznie w cenach dzisiejszych (w ostatnim miesiącu każdego roku prognozy). |

### Operacje – `transactions/RRRR/RRRR-MM-DD_ULID.json`

Jedna operacja w pliku; folder roku i data w nazwie to data warszawska operacji. `amount` ze znakiem: wydatek < 0, wpływ > 0. Paragon dzielony (`splits`) ma linie z własnymi kategoriami – wtedy liczą się linie, nie `categoryId` operacji; linie sumują się do `amount`.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `date` | data RRRR-MM-DD | wymagane | Data warszawska operacji. |
| `time` | godzina GG:MM | domyślnie `null`, może być `null` | Godzina; `null` – nieznana (import z mBanku nie ma godzin). |
| `accountId` | ULID | wymagane | Konto (`settings.accounts`). |
| `kind` | jedna z: `expense`, `income`, `transfer`, `trading`, `tax`, `loan`, `correction` | domyślnie `"expense"` | Rodzaj: `expense` wydatek (dodatnia kwota – zwrot towaru), `income` wpływ, `transfer` przelew własny, `trading` konto tradingowe XTB, `tax` PIT-38, `loan` pożyczka, `correction` korekta salda. |
| `amount` | grosze (liczba całkowita) | wymagane | Kwota ze znakiem: pieniądze z konta < 0, na konto > 0. |
| `categoryId` | ULID | domyślnie `null`, może być `null` | Kategoria (`settings.categories`); `null` – bez kategorii. |
| `refundable` | tak / nie (`true` / `false`) | domyślnie `false` | Wydatek finansowany przez domownika – nie mój koszt. |
| `memberId` | ULID | domyślnie `null`, może być `null` | Domownik: wydatku – kto finansuje (`null` – „Dom”), wpływu – czyje to pieniądze. |
| `advance` | tak / nie (`true` / `false`) | domyślnie `false` | Wpływ domownika: co ponad dług, to jego zaliczka. |
| `inflowKind` | jedna z: `repay`, `income`, `advance` | opcjonalne | Wpływ domownika: `repay` (spłata zakupów), `income` (niezależny przychód), `advance` (zaliczka). |
| `gift` | tak / nie (`true` / `false`) | opcjonalne | Zakup, który domownik daje w prezencie. |
| `share` | obiekt – zob. „Wspólny zakup” | opcjonalne, może być `null` | Zakup finansowany przez kilka osób – zob. „Wspólny zakup”. |
| `covers` | lista: ULID | domyślnie pusta lista | Wpływ domownika: zakupy (identyfikatory operacji), które spłaca. |
| `coversOpening` | tak / nie (`true` / `false`) | opcjonalne | Spłaca też dług domownika na start rozliczeń. |
| `coversOpeningMembers` | lista: ULID | opcjonalne | Wpływ kilku domowników: czyje długi na start spłaca; brak – wszystkich. |
| `splits` | lista: obiekt | domyślnie pusta lista | Paragon dzielony: linie z własnymi kategoriami albo moja część i część domownika. |
| `splits[].id` | ULID | wymagane | Identyfikator linii. |
| `splits[].amount` | grosze (liczba całkowita) | wymagane | Kwota linii ze znakiem jak `amount`. |
| `splits[].categoryId` | ULID | domyślnie `null`, może być `null` | Kategoria linii. |
| `splits[].refundable` | tak / nie (`true` / `false`) | domyślnie `false` | Linia finansowana przez domownika. |
| `splits[].memberId` | ULID | domyślnie `null`, może być `null` | Domownik linii; linii wpływu – czyje pieniądze (`null` – moje). |
| `splits[].advance` | tak / nie (`true` / `false`) | domyślnie `false` | Część wpływu domownika: co ponad dług, to zaliczka. |
| `splits[].inflowKind` | jedna z: `repay`, `income`, `advance` | opcjonalne | Jak `inflowKind` operacji, dla linii. |
| `splits[].gift` | tak / nie (`true` / `false`) | opcjonalne | Linia domownika jako jego prezent. |
| `splits[].containerId` | ULID | opcjonalne, może być `null` | Linia płaci kontener Ładowni. |
| `splits[].goalId` | ULID | opcjonalne, może być `null` | Linia płacona z pieniędzy celu. |
| `splits[].loanId` | ULID | opcjonalne, może być `null` | Część wpływu spłacająca pożyczkę udzieloną. |
| `splits[].note` | tekst | domyślnie `""` | Notatka linii. |
| `splits[].tags` | lista: tekst | opcjonalne | Tagi linii (obok tagów operacji). |
| `counterparty` | tekst | domyślnie `""` | Kontrahent (sklep, osoba). |
| `title` | tekst | domyślnie `""` | Tytuł przelewu. |
| `note` | tekst | domyślnie `""` | Notatka. |
| `impulse` | jedna z: `plan`, `impulse` | domyślnie `null`, może być `null` | Dziennik kapitański: `plan` albo `impulse`. |
| `logNote` | tekst | domyślnie `""` | Wpis dziennika kapitańskiego. |
| `repaid` | grosze (liczba całkowita) | domyślnie `0` | Wpływ sprzed wersji 1.3.0: część spłacająca należność domu. |
| `counterAccountId` | ULID | domyślnie `null`, może być `null` | Przelew własny: drugie konto budżetu; `null` – konto spoza budżetu. |
| `bothSides` | tak / nie (`true` / `false`) | opcjonalne | Cały przelew własny w tej jednej operacji (`amount` na `accountId`, przeciwna na `counterAccountId`). |
| `counterBank` | obiekt – zob. „Wiersz z banku” | opcjonalne, może być `null` | Wiersz banku drugiej strony przelewu własnego – zob. „Wiersz z banku”. |
| `counterDate` | data RRRR-MM-DD | opcjonalne, może być `null` | Dzień drugiej strony, gdy bank zaksięgował ją innego dnia; brak – `date`. |
| `containerId` | ULID | domyślnie `null`, może być `null` | Płatność kontenera Ładowni. |
| `goalId` | ULID | domyślnie `null`, może być `null` | Płacone z pieniędzy celu. |
| `loanId` | ULID | domyślnie `null`, może być `null` | Operacja pożyczki (`loans/`). |
| `bank` | obiekt – zob. „Wiersz z banku” | domyślnie `null`, może być `null` | Wiersz z banku, z którego powstała – zob. „Wiersz z banku”; `null` – wpisana ręcznie. |
| `awaitReturn` | obiekt | opcjonalne, może być `null` | Czekam na zwrot pieniędzy za ten zakup. |
| `awaitReturn.amount` | grosze (liczba całkowita) | wymagane | Kwota oczekiwanego zwrotu (dodatnia). |
| `awaitReturn.until` | data RRRR-MM-DD | wymagane | Do kiedy zwrot powinien wrócić. |
| `awaitReturn.closedAt` | chwila ISO 8601 (UTC) | domyślnie `null`, może być `null` | Zamknięty ręcznie; `null` – otwarty. |
| `tags` | lista: tekst | opcjonalne | Tagi (wyprawa, projekt). |
| `explained` | tak / nie (`true` / `false`) | opcjonalne | Korekta salda wyjaśniona przez użytkownika. |

### Kontenery Ładowni – `containers/ULID.json`

Stały koszt, abonament albo rata (`cycleMonths` = 1) albo opłata okresowa – asteroida ze zbiornikiem (`cycleMonths` > 1). Stan zbiornika liczy aplikacja, nie ma go w pliku.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `name` | tekst | wymagane | Nazwa. |
| `type` | jedna z: `fixed`, `subscription`, `installment` | domyślnie `"fixed"` | Rodzaj: `fixed` (stały koszt), `subscription` (abonament), `installment` (rata). |
| `amount` | grosze (liczba całkowita) | wymagane | Kwota jednej płatności. |
| `cycleMonths` | liczba całkowita | domyślnie `1` | Co ile miesięcy płatność: 1 – co miesiąc, 12 – co rok. |
| `dueMonth` | miesiąc RRRR-MM | wymagane | Miesiąc z płatnością – od niego liczy się cykl. |
| `dueDay` | liczba całkowita | domyślnie `1` | Dzień płatności w miesiącu. |
| `accountId` | ULID | domyślnie `null`, może być `null` | Konto płatności. |
| `categoryId` | ULID | domyślnie `null`, może być `null` | Kategoria. |
| `counterparty` | tekst | domyślnie `""` | Odbiorca, jak pisze go bank – import łączy jego płatności z kontenerem. |
| `from` | miesiąc RRRR-MM | domyślnie `null`, może być `null` | Od którego miesiąca w Ładowni; `null` – od zawsze. |
| `until` | miesiąc RRRR-MM | domyślnie `null`, może być `null` | Do którego miesiąca; `null` – bez końca. |
| `loanId` | ULID | domyślnie `null`, może być `null` | Rata pożyczki wziętej. |
| `archived` | tak / nie (`true` / `false`) | domyślnie `false` | Zarchiwizowany. |
| `archivedAt` | chwila ISO 8601 (UTC) | domyślnie `null`, może być `null` | Kiedy zarchiwizowany (liczy się do końca tego miesiąca). |
| `amountAt` | chwila ISO 8601 (UTC) | opcjonalne | Kiedy ostatnio zmieniła się jego miesięczna masa. |
| `dueAt` | chwila ISO 8601 (UTC) | opcjonalne | Kiedy dzień płatności ustawiono ręcznie. |
| `past` | lista: obiekt | domyślnie pusta lista | Wcześniejsze kwoty. |
| `past[].until` | miesiąc RRRR-MM | wymagane | Do którego miesiąca (włącznie) obowiązywała. |
| `past[].amount` | grosze (liczba całkowita) | wymagane | Kwota. |
| `schedule` | lista: liczba całkowita | domyślnie pusta lista | Miesiące płatności opłaty bez jednego cyklu (1–12); pusta – cykl. |
| `variable` | tak / nie (`true` / `false`) | domyślnie `false` | Rachunek o zmiennej kwocie (prąd, woda). |
| `priceIgnored` | grosze (liczba całkowita) | domyślnie `null`, może być `null` | Nowa cena, na którą powiedziano „nie”. |
| `aliveAt` | data RRRR-MM-DD | domyślnie `null`, może być `null` | „Nadal płacę” – brak płatności przed tym dniem nie znaczy rezygnacji. |
| `note` | tekst | domyślnie `""` | Notatka. |

### Cele – `goals/ULID.json`

Cel własny albo cel z prognozy ICT Trade Journal (`source` = `ictj`, nazwa i kwota idą za ICTTJ). Ile pieniędzy cel ma, liczy aplikacja.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `name` | tekst | wymagane | Nazwa. |
| `target` | grosze (liczba całkowita) | wymagane | Kwota docelowa. |
| `priority` | liczba całkowita | domyślnie `1` | Kolejność napełniania: 1 – pierwszy. |
| `source` | jedna z: `own`, `ictj` | domyślnie `"own"` | `own` – cel własny, `ictj` – cel z prognozy ICTTJ. |
| `ictj` | obiekt | domyślnie `null`, może być `null` | Cel z ICTTJ: skąd jest. |
| `ictj.forecastId` | tekst | wymagane | Scenariusz prognozy w ICTTJ. |
| `ictj.goalId` | tekst | wymagane | Cel w ICTTJ. |
| `ictj.currency` | tekst | domyślnie `"PLN"` | Waluta scenariusza. |
| `ictj.amount` | liczba | domyślnie `null`, może być `null` | Kwota celu w ICTTJ (× 100). |
| `ictj.version` | tekst | domyślnie `""` | Wersja scenariusza, za którą idzie rekord. |
| `deadline` | miesiąc RRRR-MM | domyślnie `null`, może być `null` | Termin. |
| `archived` | tak / nie (`true` / `false`) | domyślnie `false` | Zarchiwizowany. |
| `achievedAt` | chwila ISO 8601 (UTC) | domyślnie `null`, może być `null` | Kiedy osiągnięty. |
| `note` | tekst | domyślnie `""` | Notatka. |
| `activeFrom` | chwila ISO 8601 (UTC) | domyślnie `null`, może być `null` | Od tej chwili cel bierze pieniądze; `null` – zawsze. |
| `past` | lista: obiekt | domyślnie pusta lista | Priorytet, kwota i archiwizacja przed każdą zmianą (od najstarszej). |
| `past[].until` | chwila ISO 8601 (UTC) | wymagane | Do tej chwili (bez niej). |
| `past[].priority` | liczba całkowita | wymagane | Priorytet wtedy. |
| `past[].target` | grosze (liczba całkowita) | wymagane | Kwota docelowa wtedy. |
| `past[].archived` | tak / nie (`true` / `false`) | wymagane | Zarchiwizowany wtedy. |
| `past[].deadline` | miesiąc RRRR-MM | opcjonalne, może być `null` | Termin wtedy; brak – się nie zmienił. |
| `transfers` | lista: obiekt | domyślnie pusta lista | Pieniądze celu przeniesione. |
| `transfers[].at` | chwila ISO 8601 (UTC) | wymagane | Kiedy. |
| `transfers[].to` | tekst | wymagane | `shields` (osłony) albo identyfikator celu. |
| `transfers[].amount` | grosze (liczba całkowita) | wymagane | Ile. |
| `rates` | lista: obiekt | domyślnie pusta lista | Okresy rat celu z pensji. |
| `rates[].from` | miesiąc RRRR-MM | wymagane | Od miesiąca. |
| `rates[].until` | miesiąc RRRR-MM | domyślnie `null`, może być `null` | Do miesiąca; `null` – bez końca. |

### Plany miesięcy – `months/RRRR-MM.json`

Plan jednego miesiąca (nazwa pliku = miesiąc). Miesiąc bez własnego planu bierze ostatni wcześniejszy.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `month` | miesiąc RRRR-MM | wymagane | Miesiąc planu. |
| `salary` | grosze (liczba całkowita) | wymagane | Pensja od siebie – z osłon do energii miesiąca 1. dnia. |
| `envelopes` | mapa: ULID → grosze (liczba całkowita) | domyślnie pusty obiekt | Limity kopert: identyfikator kategorii głównej → kwota na miesiąc. |
| `loot` | obiekt | domyślnie `null`, może być `null` | Podział łupów – co zostało z energii miesiąca; `null` – jeszcze nie. |
| `loot.decidedAt` | chwila ISO 8601 (UTC) | wymagane | Kiedy zdecydowano. |
| `loot.shields` | grosze (liczba całkowita) | domyślnie `0` | Do osłon. |
| `loot.nextMonth` | grosze (liczba całkowita) | domyślnie `0` | Do kopert dziennych następnego miesiąca. |
| `loot.goals` | mapa: ULID → grosze (liczba całkowita) | domyślnie pusty obiekt | Do celów: identyfikator celu → kwota. |
| `loot.envelopes` | mapa: ULID → grosze (liczba całkowita) | domyślnie pusty obiekt | Zostaje w kopertach planowych na następny miesiąc: kategoria → kwota. |
| `envelopeCovers` | lista: obiekt | domyślnie pusta lista | Przekroczenia pokryte z innych kopert. |
| `envelopeCovers[].id` | ULID | wymagane | Identyfikator pokrycia. |
| `envelopeCovers[].from` | ULID | wymagane | Z koperty (kategoria). |
| `envelopeCovers[].to` | ULID | wymagane | Do koperty (kategoria). |
| `envelopeCovers[].amount` | grosze (liczba całkowita) | wymagane | Ile limitu przeniesiono. |
| `envelopeCovers[].at` | chwila ISO 8601 (UTC) | wymagane | Kiedy. |
| `hullTopUps` | lista: obiekt | opcjonalne | „Dopełnij kadłub z osłon” w tym miesiącu. |
| `hullTopUps[].id` | ULID | wymagane | Identyfikator. |
| `hullTopUps[].amount` | grosze (liczba całkowita) | wymagane | Najwyżej tyle. |
| `hullTopUps[].at` | chwila ISO 8601 (UTC) | wymagane | Kiedy. |
| `note` | tekst | domyślnie `""` | Notatka. |

### Dokowania – `dockings/RRRR/RRRR-MM-DD_ULID.json`

Jak wpływ wszedł do warstw: wypłata z ICTTJ (jej pula) albo podział wybrany ręcznie. Wpływ bez dokowania dzieli się według kolejności dokowania (osłony → kadłub → cele).

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `date` | data RRRR-MM-DD | wymagane | Data wpływu. |
| `transactionId` | ULID | wymagane | Operacja wpływu. |
| `ictjEntryId` | tekst | domyślnie `null`, może być `null` | Wpis ICTTJ, który zadokowano. |
| `entryDate` | data RRRR-MM-DD | opcjonalne, może być `null` | Dzień wpisu ICTTJ; brak – dzień operacji. |
| `countedFrom` | chwila ISO 8601 (UTC) | opcjonalne, może być `null` | Od tej chwili jego pieniądze liczą się w celach; brak – od utworzenia. |
| `pool` | jedna z: `current`, `surplus`, `goals`, `tax` | domyślnie `null`, może być `null` | Pula wypłaty ICTTJ: `current`, `surplus`, `goals`, `tax`. |
| `split` | obiekt | domyślnie `null`, może być `null` | Podział wybrany ręcznie; reszta kwoty do osłon. `null` – według puli albo kolejności dokowania. |
| `split.shields` | grosze (liczba całkowita) | domyślnie `0` | Do osłon. |
| `split.hull` | grosze (liczba całkowita) | domyślnie `0` | Do kadłuba. |
| `split.goals` | mapa: ULID → grosze (liczba całkowita) | domyślnie pusty obiekt | Do celów: identyfikator celu → kwota. |
| `split.taxHold` | grosze (liczba całkowita) | domyślnie `0` | Na podatek (poza budżetem do zapłaty PIT-38). |
| `note` | tekst | domyślnie `""` | Notatka. |

### Pożyczki – `loans/ULID.json`

Pożyczka udzielona (należność) albo wzięta (dług) z harmonogramem; spłaty to operacje z `loanId`.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `name` | tekst | wymagane | Nazwa. |
| `direction` | jedna z: `given`, `taken` | wymagane | `given` – udzielona (należność), `taken` – wzięta (dług). |
| `counterparty` | tekst | domyślnie `""` | Druga strona. |
| `amount` | grosze (liczba całkowita) | wymagane | Kwota pożyczki. |
| `date` | data RRRR-MM-DD | wymagane | Data pożyczki. |
| `accountId` | ULID | domyślnie `null`, może być `null` | Konto. |
| `schedule` | lista: obiekt | domyślnie pusta lista | Harmonogram rat albo spłat. |
| `schedule[].id` | ULID | wymagane | Identyfikator raty. |
| `schedule[].date` | data RRRR-MM-DD | wymagane | Termin. |
| `schedule[].amount` | grosze (liczba całkowita) | wymagane | Kwota. |
| `closedAt` | chwila ISO 8601 (UTC) | domyślnie `null`, może być `null` | Kiedy zamknięta; `null` – otwarta. |
| `note` | tekst | domyślnie `""` | Notatka. |

### Salda kont – `balances/RRRR/RRRR-MM-DD_ULID.json`

Saldo otwarcia (na początek dnia – operacje od tego dnia się dodają) albo potwierdzenie salda z banku (na koniec dnia).

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `date` | data RRRR-MM-DD | wymagane | Dzień salda. |
| `accountId` | ULID | wymagane | Konto. |
| `kind` | jedna z: `opening`, `confirmation` | wymagane | `opening` – saldo otwarcia (na początek dnia), `confirmation` – potwierdzenie z banku (na koniec dnia). |
| `amount` | grosze (liczba całkowita) | wymagane | Saldo. |
| `correctionId` | ULID | domyślnie `null`, może być `null` | Operacja korekty z różnicy przy potwierdzeniu. |
| `confirmedAt` | chwila ISO 8601 (UTC) | opcjonalne | Ostatnia chwila potwierdzenia. |
| `note` | tekst | domyślnie `""` | Notatka. |

### Dowództwo – `game/RRRR-MM.json`

Miesiąc gry: ocenione dni, misje tygodnia, zmiany stopnia i osiągnięcia. Dni są zamrożone dobę po końcu – późniejsza zmiana operacji ich nie zmienia.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `month` | miesiąc RRRR-MM | wymagane | Miesiąc. |
| `days` | mapa: data RRRR-MM-DD → obiekt | domyślnie pusty obiekt | Ocenione dni: data → ocena. |
| `days{}.status` | jedna z: `ok`, `broken` | wymagane | `ok` – dzień zgodny, `broken` – z naruszeniem. |
| `days{}.frozenAt` | chwila ISO 8601 (UTC) | wymagane | Kiedy zamrożony. |
| `days{}.violations` | lista: obiekt | domyślnie pusta lista | Naruszenia dnia. |
| `days{}.violations[].order` | tekst | wymagane | Którego rozkazu (np. `daily` – przydział dnia, `envelope`, `cargo`, `shields`, `firewall`, `quiet`). |
| `days{}.violations[].serious` | tak / nie (`true` / `false`) | domyślnie `false` | Poważne. |
| `days{}.violations[].note` | tekst | domyślnie `""` | Opis. |
| `days{}.violations[].ref` | tekst | domyślnie `null`, może być `null` | Czego dotyczy (kategoria, operacja, kontener). |
| `days{}.violations[].amount` | grosze (liczba całkowita) | domyślnie `null`, może być `null` | Kwota naruszenia. |
| `days{}.cls` | tekst | domyślnie `null`, może być `null` | Klasa okrętu na koniec dnia. |
| `days{}.clsBefore` | tekst | opcjonalne | Klasa dnia poprzedniego, jak widziały ją dane tego dnia (gdy inna niż zamrożona). |
| `days{}.cargo` | grosze (liczba całkowita) | domyślnie `null`, może być `null` | Miesięczna masa Ładowni na koniec dnia. |
| `days{}.tags` | lista: tekst | domyślnie pusta lista | Smak dnia: `judas` (impuls), `turtle` (zwrot towaru), `sweep` (energia dokładnie 0), `nospend`. |
| `missions` | lista: obiekt | domyślnie pusta lista | Misje tygodnia. |
| `missions[].id` | ULID | wymagane | Identyfikator. |
| `missions[].template` | tekst | wymagane | Rodzaj misji. |
| `missions[].week` | tekst | wymagane | Tydzień ISO `RRRR-Www`. |
| `missions[].done` | tak / nie (`true` / `false`) | domyślnie `false` | Wykonana. |
| `missions[].evaluatedAt` | chwila ISO 8601 (UTC) | domyślnie `null`, może być `null` | Kiedy oceniona; `null` – w toku. |
| `missions[].params` | mapa: tekst → tekst albo liczba | domyślnie pusty obiekt | Cel misji (koperta, pora, kwota). |
| `promotions` | lista: obiekt | domyślnie pusta lista | Zmiany stopnia. |
| `promotions[].id` | ULID | wymagane | Identyfikator. |
| `promotions[].at` | chwila ISO 8601 (UTC) | wymagane | Kiedy. |
| `promotions[].rank` | tekst | wymagane | Nowy stopień. |
| `promotions[].change` | jedna z: `up`, `down` | wymagane | `up` – awans, `down` – degradacja. |
| `promotions[].day` | data RRRR-MM-DD | domyślnie `null`, może być `null` | Dzień, za który. |
| `achievements` | lista: obiekt | domyślnie pusta lista | Osiągnięcia. |
| `achievements[].id` | tekst | wymagane | Które. |
| `achievements[].at` | chwila ISO 8601 (UTC) | wymagane | Kiedy. |
| `achievements[].day` | data RRRR-MM-DD | domyślnie `null`, może być `null` | Dzień, za który. |

### Paczki importu – `imports/ULID.json`

Jeden import pliku z banku – co utworzył, zmienił i usunął – żeby „Cofnij import” cofnął go w całości. Zostaje ostatnich dziesięć.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `at` | chwila ISO 8601 (UTC) | wymagane | Kiedy import ruszył. |
| `savedAt` | chwila ISO 8601 (UTC) | wymagane | Kiedy jego rekordy zapisano. |
| `accountId` | ULID | wymagane | Konto. |
| `fileName` | tekst | domyślnie `""` | Nazwa pliku z banku. |
| `period` | obiekt | domyślnie `null`, może być `null` | Okres pliku. |
| `period.from` | data RRRR-MM-DD | wymagane | Od dnia. |
| `period.to` | data RRRR-MM-DD | wymagane | Do dnia. |
| `counts` | mapa: tekst → liczba | domyślnie pusty obiekt | Liczby: ile czego (nowe, scalone, pominięte…). |
| `created` | lista: ULID | domyślnie pusta lista | Operacje, które utworzył. |
| `updated` | lista: obiekt | domyślnie pusta lista | Operacje, które zmienił: przed i po. |
| `updated[].before` | operacja (jak w `transactions/`) | wymagane | Wersja przed importem. |
| `updated[].after` | operacja (jak w `transactions/`) | wymagane | Wersja po imporcie. |
| `removed` | lista: operacja (jak w `transactions/`) | domyślnie pusta lista | Operacje, które usunął (nierozliczone, które bank wycofał). |
| `rules` | lista: obiekt | domyślnie pusta lista | Reguły, których się nauczył albo które zmienił. |
| `rules[].id` | tekst | wymagane | Identyfikator reguły. |
| `rules[].before` | obiekt | wymagane, może być `null` | Reguła przed; `null` – nowa. |
| `rules[].after` | obiekt | wymagane, może być `null` | Reguła po. |
| `before` | obiekt – zob. „Ustawienia importu przed i po” | domyślnie pusty obiekt | Ustawienia konta przed importem. |
| `after` | obiekt – zob. „Ustawienia importu przed i po” | domyślnie pusty obiekt | Ustawienia konta po imporcie. |
| `ownName` | tekst | domyślnie `null`, może być `null` | Moja nazwa (`#Klient`), którą dodał do `settings.import.ownNames`. |
| `confirmations` | lista: ULID | domyślnie pusta lista | Potwierdzenia salda z pliku. |
| `undoneAt` | chwila ISO 8601 (UTC) | domyślnie `null`, może być `null` | Kiedy cofnięty; `null` – obowiązuje. |
| `createdHashes` | mapa: tekst → tekst | domyślnie pusty obiekt | Odcisk treści każdej utworzonej operacji – inna treść teraz to zmiana użytkownika. |

### Boje nawigacyjne – `scheduled/ULID.json`

Zaplanowany wydatek albo wpływ albo termin bez kwoty – raz albo co roku. To nie są pieniądze na kontach: boja tylko przypomina, operację zapisuje się osobno.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `name` | tekst | wymagane | Nazwa. |
| `date` | data RRRR-MM-DD | wymagane | Dzień (corocznej – jej pierwszego roku). |
| `amount` | grosze (liczba całkowita) | domyślnie `null`, może być `null` | Kwota ze znakiem: wydatek < 0, wpływ > 0; `null` – sam termin. |
| `yearly` | tak / nie (`true` / `false`) | domyślnie `false` | Co roku tego dnia. |
| `categoryId` | ULID | domyślnie `null`, może być `null` | Kategoria. |
| `accountId` | ULID | domyślnie `null`, może być `null` | Konto. |
| `counterparty` | tekst | domyślnie `""` | Kontrahent, jak pisze go bank. |
| `remind` | lista: liczba całkowita | domyślnie `[14,3]` | Ile dni przed przypomnieć. |
| `done` | mapa: data RRRR-MM-DD → tekst | domyślnie pusty obiekt | Dni wykonane: dzień → operacja (`""` – odhaczone ręcznie). |
| `notMatched` | lista: ULID | domyślnie pusta lista | Operacje, o których powiedziano „to nie ta boja”. |
| `note` | tekst | domyślnie `""` | Notatka. |

### Części wspólne

#### Wiersz z banku (`bank`, `counterBank`)

Wiersz pliku z banku, z którego powstała operacja (import z mBanku).

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `format` | jedna z: `mbank` | domyślnie `"mbank"` | Format pliku banku. |
| `key` | tekst | wymagane | Tożsamość wiersza między importami. |
| `description` | tekst | domyślnie `""` | Opis banku. |
| `counterparty` | tekst | domyślnie `""` | Kontrahent, jak napisał go bank. |
| `bankName` | tekst | opcjonalne | Nazwa, jak czytały ją wersje przed 1.2.3 (gdy inna). |
| `operation` | tekst | domyślnie `""` | Rodzaj operacji w banku („ZAKUP PRZY UŻYCIU KARTY…”). |
| `category` | tekst | domyślnie `""` | Kategoria banku (tylko słaba podpowiedź). |
| `pending` | tak / nie (`true` / `false`) | domyślnie `false` | Transakcja nierozliczona – bank może zmienić kwotę albo ją wycofać. |
| `importedAt` | chwila ISO 8601 (UTC) | wymagane | Kiedy zaimportowano. |
| `source` | jedna z: `lista`, `historia` | opcjonalne | Z jakiego pliku: `lista` (lista operacji) albo `historia` (historia rachunku). |
| `altKeys` | lista: tekst | opcjonalne | Klucze tego samego wiersza w drugim formacie pliku. |

#### Wspólny zakup (`share`)

Jak powstały linie zakupu finansowanego przez kilka osób – prawdą są linie `splits` operacji, ten obiekt tylko je opisuje.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `mode` | jedna z: `equal`, `percent`, `amounts` | wymagane | Podział: `equal` – po równo, `percent` – procentami, `amounts` – kwotami (reszta moja). |
| `lines` | lista: obiekt | wymagane | Osoby zakupu. |
| `lines[].memberId` | ULID | domyślnie `null`, może być `null` | Domownik; `null` – ja. |
| `lines[].value` | liczba | domyślnie `0` | Procent albo kwota (grosze), zależnie od `mode`. |
| `lines[].gift` | tak / nie (`true` / `false`) | domyślnie `false` | Część tej osoby jako jej prezent. |

#### Ustawienia importu przed i po (`before`, `after` w `imports/`)

Co import zmienił w ustawieniach konta – stan przed nim i po nim.

| Pole | Typ | Obecność | Co znaczy |
| --- | --- | --- | --- |
| `lastImport` | chwila ISO 8601 (UTC) | domyślnie `null`, może być `null` | Ostatni import konta. |
| `coveredTo` | data RRRR-MM-DD | domyślnie `null`, może być `null` | Ostatni dzień pokryty plikami. |
| `accountNumber` | tekst | domyślnie `null`, może być `null` | Numer rachunku w banku. |
| `inflows` | mapa: ULID → tekst | domyślnie pusty obiekt | Zapamiętane decyzje o wpływach domowników: domownik → wybór. |
