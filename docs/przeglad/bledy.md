# Przegląd 1.4.1 – Błędy: szczegóły

Lista do odhaczania i podsumowanie: [README.md](README.md). Każde znalezisko sprawdzone w kodzie; błędy przez dwóch niezależnych weryfikatorów (prześledzenie kodu i sonda – test na kodzie aplikacji), pozostałe przez jednego.

## B1. Ładownia: pola edytora kontenera (okres od / do, cykl „inny…”, nazwa) zapisują się przy każdym znaku – miesiąca nie da się wpisać, a Backspace kasuje termin końca

Priorytet: wysoki · obszar: całość, Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/cargo/CargoPage.tsx:157`, `src/renderer/features/cargo/CargoPage.tsx:162`, `src/renderer/features/cargo/CargoPage.tsx:175-185`, `src/renderer/features/cargo/CargoPage.tsx:209`, `src/renderer/features/cargo/CargoPage.tsx:211`, `src/renderer/features/cargo/CargoPage.tsx:285`, `src/renderer/features/cargo/actions.ts:80`, `src/renderer/features/radar/actions.ts:80-81` …

**Co się dzieje.** Kontener raty z pożyczki ma until = '2027-03' (addLoan). Użytkownik chce zmienić koniec na '2027-06': stawia kursor w polu „do” i naciska Backspace. Tekst '2027-0' nie przechodzi regexu, więc onChange ustawia until: null. ContainerEditor od razu woła patchContainer i zmiana idzie na dysk. Pole jest kontrolowane (value = c.until ?? ''), więc robi się puste. Każdy kolejny znak ('2', '20'…) znów daje null i React przywraca pustą wartość. Pełnego miesiąca nie da się wpisać z klawiatury, działa tylko wklejenie. Skutek: rata zostaje w ładowni bez końca, liczą ją masa ładunku, odkładki i Radar, a stary termin przepada. Tak samo działa formularz „Nowy kontener” (setDraft) i pole „od”.
Cykl „inny…” (pole pokazuje 4): żeby dojść do 18 albo 24, użytkownik wpisuje „1” albo „2”. To od razu zapisuje cycleMonths = 1 / 2, `custom` przestaje być prawdą, pole znika, a select pokazuje „co miesiąc” / „co 2 miesiące”. W edytorze istniejącego kontenera każdy pośredni cykl trafia na dysk i silnik na chwilę przelicza odkładki.
Nazwa kontenera to TextField zapisywany przy każdym znaku. Po skasowaniu nazwy i pauzie dłuższej niż 400 ms proces główny odrzuca rekord („Niepoprawne dane: name: …”, schemat wymaga min(1)). Autozapis ponawia zapis co 2 s → 60 s z błędem na pasku zapisu, a zamknięcie okna pyta o niezapisane zmiany. Nazwy kont, kategorii, domowników i celów to NameInput (szkic do wyjścia z pola, pusta nazwa odrzucana z komunikatem – T34).

**Poprawka.** Pola okresu: szkic w lokalnym stanie (jak DateField / AmountField, T34), zapis po wyjściu z pola albo po Enter. Niepełna wartość zostaje w szkicu, a przy wyjściu z pola pokazuje komunikat i wraca do zapisanej wartości. Tylko świadomie pusty tekst = null („bez końca”). Można też użyć input type="month", jak termin celu. Cykl „inny…”: NumberField z commitOnBlur i lokalny stan trybu „inny” (nie wyliczany z wartości). Nazwa kontenera: NameInput z komunikatem dla pustej nazwy, jak nazwy kont i celów.

To samo zgłoszone też jako: „Ładownia: pola edytora kontenera zapisują się przy każdym znaku bez szkicu (wbrew T34) – okresu od/do nie da się wpisać, Backspace zapisuje „bez końca”, własny cykl skacze, pusta nazwa blokuje zapis”.

## B2. Cele: archiwizacja, zmiana priorytetu, zmiana kwoty i nowy cel przeliczają wstecz całą historię dokowań – pieniądze przeskakują między celami i osłonami

Priorytet: wysoki · obszar: domownicy i ICTTJ, silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:469`, `src/shared/calc/fleet.ts:486`, `src/shared/calc/fleet.ts:497`, `src/shared/calc/fleet.ts:380`, `src/shared/calc/goals.ts:70`, `src/shared/ictj.ts:143`, `src/renderer/features/starmap/actions.ts:33`, `src/renderer/features/starmap/actions.ts:40` …

**Co się dzieje.** Cele: Wakacje 5 000 / 5 000 zł (priorytet 1) i Auto 1 000 / 5 000 zł (priorytet 2); pieniądze trafiły do nich kolejnością dokowania. (a) Użytkownik archiwizuje „Wakacje”. Toast i Mapa gwiezdna piszą „jego środki zostają w nim”, ale silnik liczy całą historię od nowa bez tego celu: Wakacje 0 zł, Auto 5 000 zł, osłony +1 000 zł. (b) Zamiana priorytetów daje Auto 5 000 zł i Wakacje 1 000 zł, czyli przeszłe wpłaty zmieniają cel. (c) Obniżenie kwoty Wakacji do 1 000 zł przesuwa wstecz 4 000 zł do Auto. (d) Cel dodany dziś od razu „ma” pieniądze z wolnego do decyzji sprzed miesięcy. (e) Domyślny wybór scenariusza w Ustawienia → ICTTJ to „zmieniony ostatnio w ICTTJ”. Wystarczy edytować w ICTTJ inny scenariusz (np. kopię do eksperymentów), a synchronizacja archiwizuje wszystkie cele ICTTJ. Silnik zabiera im wtedy wstecz całą pulę Cele i wszystkie dokowania, a pieniądze idą do nowych celów albo do osłon. Powrót do scenariusza je przywraca, a przy różnicy w synchronizacji dwóch komputerów stan potrafi przeskakiwać tam i z powrotem. Kwoty warstw zmieniają się bez żadnej operacji, a ETA i „wolne do decyzji” razem z nimi. Zgodnie z T66 archiwizacja, priorytet i kwota celu powinny działać od chwili zmiany, a przeszłe wpłaty zostać w celach.

**Poprawka.** Dodać do celu `archivedAt` (ustawiane w archiveGoal i w syncIctjGoals). W silniku zarchiwizowany cel uczestniczy w dokowaniach z datą < archivedAt, a od tej daty już nie. Nowy cel uczestniczy w dokowaniach od dnia `createdAt`. Zmiany priorytetu i kwoty najprościej zamrozić punktem kontrolnym: przy zmianie listy zapisać kwoty celów na ten dzień (np. w settings albo w rekordzie celu jako `amountAt {date, amount}`) i od tego dnia liczyć dalej. W Ustawienia → ICTTJ przy pierwszym podłączeniu zapisać konkretny `forecastId` zamiast „zmieniony ostatnio”, a zmianę scenariusza potwierdzać ostrzeżeniem, że cele zostaną zarchiwizowane.

To samo zgłoszone też jako: „Zarchiwizowany cel traci wstecz wszystkie środki z dokowań, a nowy cel zabiera pieniądze z dawnych dostaw”; „Domyślny scenariusz („zmieniony ostatnio w ICTTJ”) przełącza i archiwizuje cele okrętu przy kopii lub edycji innego scenariusza, przy chwilowo nieczytelnym pliku albo na dwóch komputerach”.

## B3. Zmiana daty rozliczeń po saldzie na start z 1.4.0 (także „od startu budżetu”) liczy salda domowników drugi raz

Priorytet: wysoki · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/features/household/actions.ts:84`, `src/renderer/features/household/actions.ts:98`, `src/renderer/features/settings/HouseholdTab.tsx:73`, `src/renderer/features/settings/HouseholdTab.tsx:74`, `src/shared/calc/household.ts:190`, `src/shared/calc/household.ts:203`, `src/shared/calc/fleet.ts:209`, `src/shared/calc/fleet.ts:770` …

**Co się dzieje.** Folder z 1.3.0: budżet od 01.10, Mama ma zaliczkę 500 zł (05.10) i zakup 120 zł (03.10). Przy pierwszym otwarciu 1.4.0 `useHouseholdSinceSeed` ustawia since = dziś i zapisuje saldo do wczoraj jako `opening` (zaliczka 380 zł). Potem użytkownik klika w Ustawienia → Domownicy „od startu budżetu” (`setHouseholdSince(null)`; według T115 ma to działać „jak 1.3.0”) albo cofa datę na 02.10. `setHouseholdSince` zmienia tylko datę, `opening` zostaje. Rejestr (`opened`, `begin()`) przykłada to saldo na start w nowym dniu rozliczeń, a potem jeszcze raz liczy te same operacje. Zdarzenie `household` w silniku ustawia depozyt na sumę zaliczek z `opening` i bierze ją z osłon. Depozyt Mamy wychodzi 760 zł zamiast 380 zł, osłony są o 380 zł niższe, należności liczą się podwójnie. Odwrotnie przy przesunięciu daty na później (DateField, kilka dni po seedzie): saldo z dnia seeda trafia na późniejszą datę, a skutki operacji domowników z dni pomiędzy giną.

**Poprawka.** Przy każdej zmianie daty (także na null) przeliczać saldo na start rejestrem na dzień przed nową datą, przy obecnych ustawieniach: householdOf(input, today, nowaData − 1) ze starym since i opening. Ten wynik zapisać jako nowe `opening`. Przy null (start budżetu) daje to zera albo saldo sprzed budżetu, czyli dokładnie 1.3.0. Działa w obie strony i nie gubi operacji z dni pomiędzy. Ręcznie wpisane salda pokazać w potwierdzeniu („saldo na start zostanie przeliczone z X na Y”). Inna droga: zapisać przy opening `asOf` i stosować je tylko wtedy, gdy zgadza się z `since`, a przy niezgodności ostrzegać w Ustawieniach → Domownicy.

## B4. Dwóch domowników „pytaj” trafia do jednego tematu – decyzja tematu przypisuje pieniądze drugiej osoby pierwszej (i uczy złej reguły)

Priorytet: wysoki · obszar: import (ekran), import (logika)

Gdzie: `src/shared/import/reconcile.ts:101`, `src/shared/import/reconcile.ts:365`, `src/shared/import/reconcile.ts:378`, `src/shared/import/reconcile.ts:561`, `src/shared/import/reconcile.ts:622`, `src/renderer/features/import/ImportPage.tsx:317`, `src/renderer/features/import/ImportPage.tsx:507`, `src/shared/import/reconcile.ts:100-103` …

**Co się dzieje.** W Ustawieniach są dwie osoby z inflow 'ask' (domyślne dla nowych, np. dodanych przez „+ domownik”): Anna (ANNA NOWAK) i Piotr (PIOTR NOWAK). Plik ma przelewy przychodzące od obojga. Wiersze dostają decyzję source 'none', household true, różne memberId – ale proposalSig dla source 'none' to tylko `?income`, więc obie grupy mają temat `in|=?income`. Temat bierze propozycję z pierwszej grupy i nazywa się „Od domownika: Anna” (2 marki). Użytkownik wybiera dla tematu „Od domownika: Anna – reszta jako zaliczka/przychód” → buildImport bierze decyzję tematu także dla grupy Piotra: wpłaty Piotra zapisują się z memberId Anny (zły rejestr rozliczeń), a przy „zapamiętaj” (domyślnie włączone) powstaje reguła piotrnowak → memberId Anny, która przy kolejnych importach wygrywa z rozpoznaniem Piotra po nazwie. T110 zakłada „własny temat” domownika.

**Poprawka.** W proposalSig dla source 'none' uwzględnić osobę: `if (d.source === 'none') return d.household ? `?${d.kind}:d:${d.memberId ?? '-'}` : `?${d.kind}``. Wtedy każdy domownik „pytaj” ma swój temat (zgodnie z T110), a themeLabel nazywa go poprawnie. Test: dwóch domowników „pytaj” w jednym pliku = dwa tematy, a decyzja jednego nie zmienia memberId drugiego.

To samo zgłoszone też jako: „Temat „od domownika – zapytaj” łączy wpłaty różnych domowników: decyzja tematu przypisuje pieniądze i reguły pierwszej osobie”.

## B5. Ta sama operacja z „Historii rachunku” i z „Listy operacji” wchodzi dwa razy, a panel duplikatów jej nie widzi

Priorytet: wysoki · obszar: import (logika)

Gdzie: `src/shared/import/mbank.ts:228`, `src/shared/import/mbank.ts:254`, `src/shared/import/mbank.ts:263`, `src/shared/import/reconcile.ts:116`, `src/shared/import/reconcile.ts:147`, `src/shared/import/duplicates.ts:88`, `src/shared/import/duplicates.ts:113`, `src/renderer/features/import/ImportPage.tsx:107`

**Co się dzieje.** Użytkownik wczytuje raz długą „Historię rachunku” (ekran importu wprost ją proponuje: „albo historia rachunku CSV”, a T104 pokazuje, że użytkownik ma oba formaty), potem co 2–3 dni „Listę operacji” za okres, który na nią zachodzi. Klucz wiersza (`rowIdentity`) to data|opis|kwota, a opis w historii składa się inaczej: `[operation, who, title]` („PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY FIRMA TESTOWA SP. Z O.O. WYNAGRODZENIE”). W liście to pola opisu banku („FIRMA TESTOWA SP. Z O.O., WYNAGRODZENIE PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY 1210…”). Dlatego w drugim pliku żaden wiersz nie jest „znany”. Łączenie z wpisem ręcznym go nie złapie, bo `joinable` wymaga `!t.bank`. Ścieżka „nierozliczona → rozliczona” też nie, bo działa tylko dla nierozliczonych (a nierozliczone z listy nigdy nie znikną przy imporcie historii – T40 działa tylko dla listy). Każda wspólna operacja (pensja, czynsz, zakupy) powstaje drugi raz: podwójny przychód i podwójne koszty. `findDuplicates` szuka tylko tego samego `bank.key` albo par wpis ręczny–bank, więc nic nie zgłasza. Ten sam mechanizm zadziała, gdy mBank zmieni treść opisów w eksporcie. Powinno być: wiersz rozpoznany jako już wczytany albo przynajmniej pokazany jako możliwy duplikat.

**Poprawka.** W planImport po kroku kluczy dodać krok „ten sam wiersz innego formatu”: operacja z bank tego samego konta, nieużyta, o tej samej kwocie, z datą ±3 dni (data operacji z karty bywa w formatach inna), z podobnym kontrahentem (similarCounterparty(t.bank.counterparty, row.counterparty)) i opisem drugiego formatu. Format zapisać addytywnie w bank (np. bank.source 'lista' | 'historia'), a dla starszych wpisów rozpoznawać go po tym, czy description zaczyna się rodzajem operacji. Taki wiersz to 'known' (bez nowej operacji; opcjonalnie dopisany drugi klucz) albo 'merge' z ask do potwierdzenia. W findDuplicates dodać rodzaj 'bank-format' (dwie operacje z banku, różne klucze i formaty, ta sama kwota, ±3 dni, podobna nazwa). Do czasu poprawki ekran powinien ostrzegać, gdy format pliku różni się od formatu poprzedniego importu na to konto.

## B6. Ładownia po zapłacie opłaty okresowej pokazuje fałszywe „Za plan o … – kolejne raty będą większe” i termin „w tym miesiącu”

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/cargo/CargoPage.tsx:342-361`, `src/shared/calc/fleet.ts:923`, `src/shared/calc/fleet.ts:937`, `src/shared/calc/fleet.ts:97-102`, `src/renderer/features/cargo/CargoPage.tsx:343-347`, `src/renderer/features/cargo/CargoPage.tsx:361`, `src/shared/calc/fleet.ts:101-106`, `src/shared/calc/fleet.ts:589-597`

**Co się dzieje.** OC kosztuje 1 240 zł raz w roku, termin 05.10. Na początku października zbiornik ma 1 240 zł. 5.10 opłata z kontenerem schodzi ze zbiornika i zbiornik spada do 0. Do końca października panel Odkładki pokazuje „termin październik 2026 (w tym miesiącu)”, pasek 0 / 1 240 zł i ostrzeżenie „Za plan o 1 136,63 zł – kolejne raty będą większe”. W rzeczywistości opłata jest zapłacona, a silnik nie podnosi kolejnych rat. Radar i odprawa pokazują w tym czasie następną płatność 05.10.2027. Powtarza się co roku dla każdej opłaty okresowej.

**Poprawka.** Gdy w bieżącym cyklu była już płatność z tego zbiornika (zdarzenie z moves.tanks[c.id] < 0 w miesiącu terminu albo wcześniej w tym cyklu), traktować cykl jako zamknięty. Wtedy expected = 0, „Za plan” ukryte, a termin z nextPaymentOf(c, today) jako następny cykl. FleetState.tanks może podawać flagę paidThisCycle i termin z nextPaymentOf, a CargoPage na tej podstawie nie liczy short. Samo podmienienie dueMonth na nextPaymentOf nie wystarczy, bo expected nadal liczy się z index = n−1.

To samo zgłoszone też jako: „Ładownia → Odkładki: „Za plan o …” po zapłacie opłaty w miesiącu terminu straszy brakiem 1 136,63 zł, a w zwykłych miesiącach przeoczy brak mniejszy niż rata”.

## B7. Historia zmian, „Zmiany z drugiego komputera” i Synchronizacja pokazują kwoty w groszach jako surowe liczby (100× za duże) i bez maskowania Ctrl+$

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, folder danych i synchronizacja

Gdzie: `src/shared/merge.ts:236-244`, `src/renderer/features/history/HistoryDialog.tsx:42-46`, `src/renderer/features/history/HistoryDialog.tsx:62-68`, `src/renderer/features/sync/RemoteChangesDialog.tsx:155-174`, `src/renderer/features/sync/SyncPage.tsx:33-42`, `src/renderer/features/sync/SyncPage.tsx:111-117`, `src/renderer/features/sync/SyncPage.tsx:185`, `src/renderer/lib/recordTitle.ts:12` …

**Co się dzieje.** Na drugim komputerze kwota operacji zmieniła się z 12,50 zł na 15,00 zł, a tutaj są niezapisane edycje. Okno „Zmiany z drugiego komputera” pokazuje pole „Kwota” z wyborem „-1250” / „-1500”. Historia zmian pokazuje „Pensja 400000 → 450000” i „Kwota celu 1000000”, a konflikt w Synchronizacji: amount -1250 | -1500. Wszędzie indziej aplikacja pisze „−12,50 zł”, „4 500,00 zł”. Użytkownik wybiera wersję, czytając kwoty 100 razy za duże (−4599 wygląda jak 4 599 zł).
Przy ukrytych kwotach (Ctrl+$, T55) te wartości są widoczne bez maski. Tytuły wpisów na stronie Synchronizacja i w nagłówku Historii („Operacja 2026-10-01: Biedronka −1234,56 zł”, bez spacji tysięcy) też. Wzór z ICTTJ działał na kwotach dziesiętnych, a w FI kwoty są w groszach.

**Poprawka.** Obok LABELS w merge.ts dodać zbiór ścieżek pól kwot w groszach: amount, splits.amount, salary, target, envelopes.*, loot.*, opening.*, schedule.*.amount, split.*, initial.* itd. Renderer (displayValue w HistoryDialog i RemoteChangesDialog) dla tych ścieżek ma używać plnText + ' zł', czyli z maską Ctrl+$. Do tego potrzebna jest ścieżka, więc displayValue musi dostać c.path. SyncPage.flatten też ma formatować pola kwot przez plnText, a recordTitle ma używać signedPln / plnText zamiast toFixed.

To samo zgłoszone też jako: „Historia zmian, okno zmian z drugiego komputera i Synchronizacja pokazują kwoty mimo Ctrl+$, i to w surowych groszach”; „Historia, „Zmiany z drugiego komputera” i Konflikty pokazują kwoty w surowych groszach (×100)”; „Historia zmian operacji pokazuje kwoty w groszach i nie ukrywa ich przy Ctrl+$”; „Ukrycie kwot (Ctrl+$) nie maskuje kwot w Historii, oknie zmian, Konfliktach i tytułach wpisów”.

## B8. Kreator startu: „Obecne środki” i podział na start pomijają konta, które mają już saldo otwarcia, a pole zostało puste

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/wizard/WizardPage.tsx:68-71`, `src/renderer/features/wizard/WizardPage.tsx:90`, `src/renderer/features/wizard/WizardPage.tsx:226-246`, `src/shared/calc/fleet.ts:738-751`, `src/renderer/features/wizard/WizardPage.tsx:41`, `src/renderer/features/wizard/WizardPage.tsx:70-72`, `src/renderer/features/wizard/WizardPage.tsx:229`, `src/renderer/features/wizard/WizardPage.tsx:243` …

**Co się dzieje.** Saldo mBanku (8 000 zł) jest już potwierdzone w Ustawienia → Konta, więc konto ma saldo otwarcia. W kroku 1 kreator podpowiada „Ma już saldo otwarcia – puste pole zostawia saldo z operacji”. Użytkownik zostawia mBank pusty i wpisuje Portfel XTB 500 zł. Krok 5 pokazuje „Obecne środki: 500 zł” i Osłony 500 zł, a kadłub jest obcięty do 500 zł (Math.min(…, total)). Po „Uruchom budżet” silnik liczy na start 8 500 zł (startTotal z sald otwarcia wszystkich kont). Ekran pokazał zły podział, a propozycja kadłuba wyszła z zaniżonej sumy.

**Poprawka.** Dla konta z saldem otwarcia i pustym polem brać kwotę, którą przyjmie silnik: saldo otwarcia + operacje przed dziś, jak balanceAt w fleet.ts:393 z beforeDate = today. W shared można to zrobić np. jako balanceAt(id, dzień przed dziś, txs, balances) z calc/balances.ts. Tej wartości użyć w total (i ewentualnie pokazać ją jako placeholder pola), tak żeby total, startSplit, obcięcie kadłuba i podgląd osłon zgadzały się z tym, co policzy silnik.

To samo zgłoszone też jako: „Kreator startu: „Obecne środki” i kadłub na start pomijają konta, które mają już saldo otwarcia”.

## B9. Nieudane usunięcie operacji (plik zablokowany) jest ciche – wpis znika z ekranu, ale zostaje na dysku i wraca po restarcie

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator, folder danych i synchronizacja

Gdzie: `src/renderer/store/data.ts:559-574`, `src/renderer/features/history/actions.ts:23-36`, `src/renderer/features/operations/state.ts:191-194`, `src/renderer/features/operations/OperationEditor.tsx:115`, `src/main/index.ts:248-255`, `src/renderer/store/data.ts:559`, `src/renderer/store/data.ts:565`, `src/renderer/store/data.ts:573` …

**Co się dzieje.** OneDrive albo antywirus trzyma plik operacji (EBUSY/EPERM). Użytkownik klika „Usuń na pewno”. deleteRecord najpierw usuwa wpis z pamięci, potem await api.deleteRecord odrzuca, bo shell.trashItem i fs.rm się nie udają. Odrzucenie idzie przez deleteWithUndo do `void deleteOperation(…)` i nikt go nie obsługuje: nie ma toastu z błędem ani „Cofnij”, a wpis nie wraca do listy. Plik zostaje na dysku i w indeksie procesu głównego, więc watcher nie zgłasza zmiany. Ekrany i silnik (salda, energia) liczą bez tej operacji aż do restartu, a po nim operacja wraca. W .history zostaje przy tym wersja „delete”, więc Synchronizacja → „Usunięte wpisy” pokazuje ją jako usuniętą.

**Poprawka.** W renderer deleteRecord zapamiętać poprzedni wpis i przy błędzie api.deleteRecord przywrócić go w pamięci, a wyjątek rzucić dalej. W deleteWithUndo (i deleteManyWithUndo – już przerywa, ale bez komunikatu) łapać błąd i pokazać toast, np. „Nie udało się usunąć – plik zajęty, spróbuj ponownie”. W main: fs.rm z maxRetries / retryDelay na EBUSY/EPERM, jak przy zapisie atomowym, a migawkę 'delete' w historii robić po udanym trash albo usuwać ją przy błędzie.

To samo zgłoszone też jako: „Nieudane usunięcie: wpis znika z okna na stałe (do restartu), zostaje na dysku, bez komunikatu; deleteRecord w rendererze nie respektuje „tylko do odczytu””; „Usunięcie operacji lub kontenera: nieobsłużone odrzucenie – przy błędzie rekord znika z ekranu, a zostaje na dysku”.

## B10. Debriefing i raport pokazują zapisane kwoty decyzji o łupach, a silnik dzieli łupy, które są teraz – po późnym imporcie liczby się rozjeżdżają

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/renderer/features/month/MonthPage.tsx:327-330`, `src/renderer/features/reports/ReportsPage.tsx:240`, `src/renderer/features/reports/ReportsPage.tsx:251`, `src/renderer/features/reports/ReportsPage.tsx:274-284`, `src/shared/calc/plan.ts:336-347`, `src/shared/calc/fleet.ts:814-842`, `src/renderer/features/month/actions.ts:55-58`, `src/renderer/features/month/MonthPage.tsx:326-330` …

**Co się dzieje.** 2.10 debriefing pokazuje łupy września 2 000 zł. Użytkownik zatwierdza: 1 500 zł na następny miesiąc, reszta (500 zł) do osłon. 5.10 importuje z mBanku wyciąg z ostatnimi dniami września, w tym zakup z 29.09 za 1 800 zł. Silnik liczy wtedy na koniec września tylko 200 zł łupów i stosuje decyzję do nich: 200 zł do energii października, 0 zł do osłon, dzienny przydział października rośnie o 200 zł, nie o 1 500 zł. Plan miesiąca dalej pisze „Decyzja z 02.10.2026: osłony 500,00 zł, następny miesiąc 1 500,00 zł”. Raporty → Debriefing (i PDF) w jednym dokumencie pokazują „Łupy (energia na koniec miesiąca) 200,00 zł” i „Podział łupów: Na następny miesiąc 1 500,00 zł, Do osłon 500,00 zł”. To samo dzieje się w drugą stronę: późny zwrot towaru zwiększa łupy, a nadwyżka trafia do osłon, czego ekran nie pokazuje. Import zwykle przychodzi po kilku dniach, więc przy decyzji w pierwszych dniach miesiąca to częsta ścieżka.

**Poprawka.** Pokazywać podział wykonany przez silnik: zdarzenie kind 'loot' z fleet.log z datą w miesiącu po `month` (moves.energy, moves.shields, suma celów). W Planie miesiąca i w Raportach/PDF brać te kwoty zamiast plan.loot. Gdy zdarzenie.amount ≠ suma zapisanej decyzji, dopisać „łupy zmieniły się po decyzji (było X, jest Y) – podział przeliczony: cele → następny miesiąc → osłony”.

To samo zgłoszone też jako: „Decyzja o łupach na ekranie nie zgadza się z tym, co zrobił silnik (późny import, decyzja po terminie)”; „Decyzja o łupach: Plan miesiąca pokazuje zapisane kwoty, a silnik stosuje inne, gdy łupy się zmienią (późny import); data z UTC”.

## B11. Zmiana planu minionego miesiąca zmienia też bieżący i kolejne miesiące, które z niego „korzystały” – wbrew T46

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/month/actions.ts:24-38`, `src/shared/calc/plan.ts:270-274`, `src/renderer/features/month/MonthPage.tsx:67`, `src/renderer/features/month/MonthPage.tsx:82-84`, `src/renderer/features/month/MonthPage.tsx:132`, `src/renderer/features/month/MonthPage.tsx:215`, `docs/decyzje.md:366-368`, `src/renderer/features/month/actions.ts:24` …

**Co się dzieje.** Plany: sierpień ma własny plan (pensja 4 000 zł, Jedzenie 3 000 zł), a wrzesień i październik z niego korzystają. 18.10 użytkownik cofa Plan miesiąca strzałką na wrzesień, żeby „poprawić” pensję na 3 000 zł i kopertę na 2 000 zł (albo klika „Koperty ze średnich”). editPlan tworzy własny plan września. Październik nie ma własnego planu, więc od razu korzysta z września: pensja października 3 000 zł zamiast 4 000 zł, energia dziś 214,28 → 142,85 zł, koperta Jedzenie 3 000 → 2 000 zł. Silnik przelicza też wstecz wypłatę z 1.09 i łupy września. Jedyny ślad na ekranie to etykieta „korzysta z planu: wrzesień 2026”. T46: pierwsza zmiana tworzy własny plan miesiąca „i nie zmienia innych miesięcy”, a komentarz w editPlan obiecuje to samo.

**Poprawka.** W editPlan, gdy month < bieżący miesiąc (warsawNow().month), przed zmianą: jeśli addMonths(month, 1) nie ma własnego planu, utrwalić go jako kopię planu dotychczas obowiązującego (planFor(plans, month+1): pensja i koperty, bez łupów). Dotyczy to obu gałęzi, nowego planu i updateRecord istniejącego. Kolejne miesiące zostają wtedy bez zmian, zgodnie z T46. Alternatywa: blokada pensji i kopert minionych miesięcy (debriefing tylko do odczytu poza łupami) albo pytanie „Zmiana obejmie też: <miesiące> – zastosować?”.

To samo zgłoszone też jako: „Plan miesiąca: zmiana miesiąca bez własnego planu zmienia też późniejsze miesiące, łącznie z bieżącym (wbrew T46)”.

## B12. Data wpisana jako „dd.mm” bierze rok z bieżącej wartości pola – na początku stycznia grudniowy zakup trafia w przyszły grudzień, a silnik go pomija bez ostrzeżenia

Priorytet: średni · obszar: całość

Gdzie: `src/renderer/components/fields.tsx:118`, `src/renderer/lib/format.ts:130-148`, `src/renderer/features/operations/OperationEditor.tsx:184`, `src/renderer/features/quick/QuickApp.tsx:330`, `src/shared/calc/fleet.ts:384`, `src/renderer/features/settings/AccountsTab.tsx:116`

**Co się dzieje.** 3 stycznia 2027 użytkownik dopisuje w edytorze operacji albo w szybkim wpisie zakup z 28 grudnia za 500 zł i wpisuje datę „28.12”. Nowy wpis ma datę dziś (2027-01-03), więc DateField bierze rok 2027 i zapisuje 2027-12-28. Operacja znika z widoku „ten miesiąc”, a silnik ją pomija (data > dziś): saldo konta, energia, osłony i krzywa majątku są bez tych 500 zł. Niedzielne potwierdzenie salda z banku tworzy więc korektę „rozbieżność w ładowni” −500 zł. 28.12.2027 operacja nagle wchodzi do sald i ten sam wydatek liczy się drugi raz, rok później, bez żadnej informacji. Nigdzie nie ma ostrzeżenia o dacie w przyszłości – Ustawienia → Konta mają takie tylko dla salda otwarcia.

**Poprawka.** DateField jest wspólny (Ładownia, Radar – raty i terminy w przyszłości, Raporty, Konta, Domownicy), więc zmiana dla wszystkich pól byłaby zła. Proponuję prop, np. `past`, tylko dla daty operacji (OperationEditor, QuickApp): gdy „dd.mm” bez roku daje datę późniejszą niż dziś (z małym zapasem, np. 7 dni), brać rok wcześniejszy. Dodatkowo przy dacie operacji w przyszłości pokazywać w edytorze i w szybkim wpisie ostrzeżenie „w przyszłości – nie liczy się do sald do …”, a na liście znaczek.

## B13. Podział łupów proponuje zarchiwizowane cele, a silnik wpłaca do nich pieniądze

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/renderer/features/month/MonthPage.tsx:340-345`, `src/shared/calc/fleet.ts:507`, `src/shared/calc/fleet.ts:825-829`, `src/renderer/features/month/MonthPage.tsx:340`, `src/shared/calc/fleet.ts:826`, `src/shared/calc/fleet.ts:933`, `src/renderer/features/dock/DockingDialog.tsx:63`, `src/renderer/features/starmap/StarMapPage.tsx:40` …

**Co się dzieje.** Cel „Rower” jest zarchiwizowany. W debriefingu (1.–7. dzień miesiąca) lista „cel: …” w podziale łupów pochodzi z fleet.goals, więc zawiera też „Rower”. Użytkownik wpisuje mu 300 zł i zatwierdza. Silnik (knownGoal sprawdza też zarchiwizowane) dopisuje 300 zł do zarchiwizowanego celu. To łamie zasadę „nowe dostawy już do niego nie trafiają”, a pieniądze lądują w celu, którego nie ma na liście aktywnych.

**Poprawka.** W MonthPage pokazywać tylko aktywne cele, np. fleet.goals filtrowane po rekordach goals z !archived albo dodać archived do FleetState.goals. W silniku przy decyzji łupów (fleet.ts:827) i przy initial.goals (fleet.ts:745) używać celu tylko, gdy nie jest zarchiwizowany, a jego część kierować do osłon.

To samo zgłoszone też jako: „Zarchiwizowane cele: podział łupów je proponuje i silnik je zasila, a sumy „w celach” różnią się między Mapą gwiezdną i Mostkiem”; „Archiwalne (i nieaktualne) cele dostępne jako cel podziału łupów”.

## B14. Rozliczenia „od dziś” (seed 1.4.0) gubią operacje domowników datowane przed dniem rozliczeń i dodane później (opóźniony import mBanku)

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/features/household/actions.ts:104`, `src/shared/calc/household.ts:221`, `src/shared/calc/fleet.ts:770`, `src/shared/calc/fleet.ts:638`

**Co się dzieje.** Skutek D81 / T115 (rozliczenia od dnia pierwszego otwarcia). Seed 18.10 liczy salda z danych w folderze, a ostatni import mBanku kończył się np. 14.10. Import 20.10 przynosi zakup „finansuje: Mama” z 16.10 za 300 zł. Silnik nadal wykonuje `settle` z `byTx` tej operacji: osłony −300 zł, w dzienniku `house +300`. Rejestr w dniu rozliczeń wraca jednak do zapisanych `opening`, w których tego zakupu nie ma. Mama nie ma więc nic do oddania, 300 zł znika z osłon na stałe, a dziennik i stan należności się nie zgadzają. Zaliczka domownika z takiej operacji przechodzi do osłon, bo zdarzenie `household` ustawia depozyt na `opening`. Bank daje dane z kilkudniowym opóźnieniem, więc to zwykła sytuacja.

**Poprawka.** Seed: data rozliczeń = dzień po najpóźniejszej dacie operacji z importu (okres ostatniego pliku mBanku), nie dziś. Dodatkowo operacje domowników datowane przed `since`, a utworzone (createdAt) po ustawieniu daty, powinny korygować saldo na start: rejestr może je stosować po begin() albo program pyta przy imporcie. W Ustawieniach → Domownicy ostrzeżenie „N operacji domowników sprzed daty rozliczeń dodanych później”.

## B15. Usunięta operacja zadokowanej dostawy zostawia osierocone dokowanie: wpis ICTTJ na zawsze „zadokowany”, pieniądze bez puli

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/dock.ts:85`, `src/shared/calc/dock.ts:101`, `src/renderer/features/dock/actions.ts:59`, `src/renderer/features/operations/state.ts:191`

**Co się dzieje.** Wypłata ICTTJ z pulą Podatek (800 zł) została zadokowana na Portfelu XTB, bo w banku nie było pary. Później import przynosi prawdziwy wpływ z XTB do mBanku, więc użytkownik usuwa operację z Portfela XTB. `deleteOperation` nie rusza rekordu `dockings/*`. `deliveries` dalej znajduje dokowanie wpisu (`dockingByEntry`) i pokazuje dostawę jako „zadokowana” z `transaction: null`. Okno odmawia ponownego dokowania („Operacji tego dokowania nie ma w folderze (może jeszcze się synchronizuje)”). Prawdziwy wpływ widać jako „Wpływ z XTB bez wpisu w ICTTJ”, a silnik dokuje go zwykłą kolejnością: 800 zł rezerwy PIT-38 ląduje w osłonach, a `taxHold` = 0. Z interfejsu nie da się tego naprawić. Podobnie gdy wpis zadokowany na Portfelu XTB zostanie usunięty w ICTTJ: operacja z Portfela zostaje i nie ma jej na żadnej liście dokowania.

**Poprawka.** Przy usuwaniu operacji usuwać też jej dokowania, w tym samym „Cofnij” (deleteWithUndo z onUndo przywracającym dokowanie). W deliveries dokowanie, którego operacji nie ma, traktować jak brak dokowania, ale tylko przy folderze wczytanym w całości. Wtedy wpis może sparować się z prawdziwym wpływem albo znów zaproponować Portfel. W oknie dostawy zadokowanej bez operacji dać przycisk „Odłącz dokowanie”.

## B16. Zmiana puli wpisu w ICTTJ po dokowaniu nie jest wykrywana – silnik liczy starą pulę

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/dock.ts:103`, `src/renderer/features/dock/actions.ts:48`, `src/shared/calc/fleet.ts:657`

**Co się dzieje.** Wypłata ICTTJ zadokowana z pulą „Bieżące”. Potem użytkownik poprawia w ICTTJ pulę wpisu na „Podatek” (ICTTJ pozwala edytować wpis). Dokowanie trzyma pulę z chwili dokowania (`pool: d.entry?.pool`), a `deliveries` oznacza rozbieżność (`mismatch`) tylko przy innej kwocie. Dostawa wygląda na poprawnie zadokowaną, a pieniądze rezerwy podatkowej zostają w osłonach jako „wolne do decyzji” i liczą się w przychodzie z tradingu. Działa to w obie strony (Cele → Bieżące itd.).

**Poprawka.** W deliveries ustawiać `mismatch` (albo osobną flagę `poolChanged`) także przy `docked.pool !== e.pool`, z plakietką „pula zmieniona w ICTTJ” w panelu Dokowanie i w odprawie. Ponowne zapisanie w oknie już przepisuje pulę (dockingOf), wystarczy kierować tam użytkownika. Nie brać puli z wpisu wprost w silniku: silnik nie zna wpisów ICTTJ, a podział musi być taki sam na komputerze bez folderu ICTTJ.

## B17. Dwa dokowania jednego wpisu na Portfelu XTB (dwa komputery przed synchronizacją) dublują pieniądze, a drugiej operacji nie widać w dokowaniu

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/features/dock/actions.ts:64`, `src/shared/calc/dock.ts:85`, `src/shared/calc/dock.ts:88`, `src/shared/calc/fleet.ts:190`

**Co się dzieje.** Wpis ICTTJ nie ma pary w banku. Komputer A dokuje go na Portfelu XTB (nowa operacja W1 i dokowanie). Zanim OneDrive przyniesie pliki A, komputer B robi to samo (W2 i drugie dokowanie z tym samym `ictjEntryId`). T64 obsługuje tylko dwa dokowania jednej operacji (`dockingsByTx`), a tu są dwie różne operacje. Silnik liczy obie, więc budżet i saldo Portfela XTB rosną o 800 zł za dużo. `deliveries` przypina wpis do pierwszego dokowania, a W2 nie trafia do `free`, bo jej dokowanie ma `ictjEntryId`. Duplikatu nie ma na żadnej liście dostaw, widać go tylko w Operacjach.

**Poprawka.** Deterministyczne id operacji Portfela i jej dokowania wyliczone z id wpisu ICTTJ (np. ULID z hasha `wallet:<id wpisu>`, jak cele ICTTJ w T66). Data wpisu jest ta sama, więc oba komputery zapiszą ten sam plik transactions/…, a magazyn zrobi z tego konflikt albo duplikat id zamiast cichego podwojenia. Dodatkowo deliveries powinno wykrywać kilka dokowań jednego wpisu (różne transactionId) i pokazywać rozbieżność z propozycją usunięcia nadmiarowej operacji razem z jej dokowaniem.

## B18. Propozycja „Portfel XTB?” liczona od chwili importu (dowolnego konta mBank), a nie od zakresu pliku z banku

Priorytet: średni · obszar: domownicy i ICTTJ, import (ekran)

Gdzie: `src/shared/calc/dock.ts:130`, `src/renderer/features/dock/state.ts:42`, `src/renderer/features/import/state.ts:473`, `src/renderer/features/import/state.ts:458`, `src/renderer/features/dock/state.ts:45`, `src/shared/calc/dock.ts:116`, `src/shared/calc/briefing.ts:175`

**Co się dzieje.** `importedOn` to data warszawska znacznika `lastImport`, czyli chwila importu (`now`), a nie koniec okresu pliku. Jeśli 25.10 użytkownik zaimportuje starszy wyciąg kończący się 10.10, wypłata z 16.10 (okno do 21.10) dostaje stan „pending” z `wallet: true`. Okno pisze „W mBanku nie ma tej kwoty od XTB po 3 dniach roboczych – najpewniej Portfel XTB”. Po potwierdzeniu i późniejszym imporcie właściwego wpływu ta sama kwota liczy się dwa razy: operacja na Portfelu plus wpływ z XTB, który silnik dokuje sam. Komentarz w dock.ts:128 zakłada, że eksport sięga za okno, ale kod tego nie sprawdza. Wariant: `importedOnOf` bierze najpóźniejszy import ze wszystkich kont mBank, więc import innego konta (np. oszczędnościowego), na które XTB nie płaci, też „odblokowuje” propozycję Portfela.

**Poprawka.** Przy imporcie zapisywać addytywnie koniec okresu pliku: `settings.import.coveredTo[konto] = file.period?.to ?? najpóźniejsza data wiersza`. W deliveries zamiast `importedOn` podawać pokrycie konta, na które przychodzą wypłaty z XTB: konta z operacjami `trading`, inaczej MBANK_ACCOUNT_ID. Jeśli takich kont jest kilka, brać najmniejsze pokrycie, a nie najpóźniejszy import ze wszystkich kont. Warunek: `coveredTo > until`.

To samo zgłoszone też jako: „„Ostatni import” to czas kliknięcia, nie zasięg pliku – import starego pliku przestawia wypłatę z ICTTJ na Portfel XTB (ryzyko podwójnego wpływu, T63)”.

## B19. Granica startu budżetu dla dostaw liczona po dacie wpisu ICTTJ, a nie po dacie pieniędzy w banku

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/dock.ts:86`, `src/shared/calc/dock.ts:110`, `src/shared/calc/dock.ts:120`, `src/shared/calc/dock.ts:130`, `src/shared/calc/dock.ts:138`, `docs/decyzje.md:141`

**Co się dzieje.** (a) Start budżetu 01.10 (albo 15.10), wpływ z XTB 1 200 zł w mBanku 30.09 (jest już w saldzie otwarcia), wpis w ICTTJ z datą 01.10. Wpis liczy się jako po starcie, a jego para jest odrzucana (`!counted(t.date)`). Po 3 dniach roboczych i imporcie wpis dostaje „Portfel XTB?”, a „Zadokuj na Portfelu XTB” tworzy operację 1 200 zł, która zawyża salda o pieniądze już policzone. (b) Odwrotnie: wpis z puli Podatek 29.09, wpływ 02.10. Wpis jest „sprzed startu”, a wpływ dostaje „bez wpisu w ICTTJ – dopisz wypłatę” i dokuje jak zwykła dostawa, więc pula Podatek przepada. D72 mówi, że pomija się wypłaty sprzed startu, bo są w saldach otwarcia, a o tym decyduje data pieniędzy.

**Poprawka.** W deliveries szukać pary bez warunku `counted(t.date)`, a o stanie decydować po dacie pieniędzy. (1) Para przed startem → wpis 'before-start' i para zużyta, więc nie trafia do `free`. (2) Wpis przed startem z parą po starcie → 'pending' z parą, żeby pula wpisu działała na pieniądze, które przyszły po starcie. (3) Propozycja Portfela XTB tylko wtedy, gdy wpis i całe jego okno (`from`) leżą po starcie. Inaczej stan 'before-start' z dopiskiem, bez komunikatu „dopisz w ICTTJ”.

## B20. Para wypłaty ICTTJ jeszcze niezadokowana: silnik ignoruje pulę (Podatek w osłonach, zwrot z puli Podatek = czerwony firewall), na komputerze bez ICTTJ zawsze

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/fleet.ts:657`, `src/shared/calc/fleet.ts:670`, `src/shared/calc/fleet.ts:681`, `src/shared/calc/dock.ts:124`, `src/renderer/store/fleet.ts:41`, `src/shared/calc/game.ts:236`

**Co się dzieje.** Pula działa w silniku tylko przez rekord `dockings/*`. `computeFleet` nie zna wpisów ICTTJ, a `deliveries` (które wie, że operacja jest parą wpisu z pulą) liczy się tylko w rendererze. Import przynosi wpływ 800 zł z XTB, dla którego w ICTTJ jest wpis z pulą Podatek, i wpływ 300 zł, dla którego wpis to zwrot z puli Podatek. Dopóki użytkownik nie potwierdzi dokowania w oknie, silnik dokuje 800 zł zwykłą kolejnością: osłony +800, „wolne do decyzji”, zasięg i klasa w górę, `taxHold` = 0. Zwrot puli Podatek do kapitału (T65: bez firewalla) daje czerwony alarm `firewall`. Jeśli dzień z tym alarmem zamrozi się przed potwierdzeniem (24 h po końcu dnia), gra zapisze poważne naruszenie i klasę na stałe. Na drugim komputerze bez wskazanego folderu ICTTJ para nigdy nie jest znana, dopóki pierwszy komputer jej nie zadokuje. D55: „Pula decyduje o miejscu”.

**Poprawka.** Najtaniej: w useGameAdvance (store/game.ts) nie zamrażać dnia, na który przypada operacja `trading` z dostawą w stanie 'pending' z parą (deliveriesNow). Zamrożenie poczeka do potwierdzenia. Ewentualnie pełniej, jak w znalezisku: `FleetInput.pairedPools: Map<txId, pool>` z deliveries budowane w store/fleet.ts, żeby para bez rekordu liczyła się według puli wpisu. Po zmianie trzeba pilnować, żeby okno dokowania (withDocking) dawało tę samą propozycję.

## B21. Wpis ICTTJ usunięty i wpisany od nowa: operacja banku zostaje zablokowana przez dokowanie nieistniejącego wpisu, a nowy wpis dostaje „Portfel XTB?”

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/dock.ts:85`, `src/shared/calc/dock.ts:88`, `src/shared/calc/dock.ts:99`, `src/shared/calc/dock.ts:130`, `src/shared/calc/fleet.ts:663`

**Co się dzieje.** Wypłata 800 zł z pulą Podatek zadokowana z wpływem w mBanku. Użytkownik usuwa ten wpis w ICTTJ (pomyłka w puli albo rodzaju) i dodaje nowy, z pulą Bieżące, ta sama kwota i data. Dokowanie wskazuje nieistniejący już wpis, ale operacja dalej ma dokowanie z `ictjEntryId`, więc nie trafia do `free` i nowy wpis nie może się z nią sparować. Po 3 dniach roboczych i imporcie nowy wpis dostaje „Portfel XTB?”. Potwierdzenie tworzy drugą operację na 800 zł, więc pieniądze liczą się dwa razy. Silnik przez cały czas stosuje pulę usuniętego wpisu (`taxHold` 800 zł), a operacji banku nie ma na żadnej liście dokowania.

**Poprawka.** W deliveries, gdy ICTTJ jest czytany ze statusem 'ok' i bez ostrzeżeń o nieczytelnych plikach (żeby chwilowy brak pliku w OneDrive nie rozpinał dokowań): dokowanie z `ictjEntryId` spoza bieżących wpisów traktować jak dokowanie bez wpisu. Operacja wraca do `free`, paruje z nowym wpisem (stan 'pending', istniejące dokowanie podmieniane przez dockingOf), a bez pary pokazuje się jako 'tx:' z dopiskiem „wpis usunięty w ICTTJ”. Przy okazji ustawiać `mismatch` także wtedy, gdy `docking.pool !== entry.pool` (pula zmieniona w ICTTJ po dokowaniu), z propozycją ponownego zapisu.

## B22. Kwota w banku inna niż w ICTTJ albo przelew po świętach: wpis dostaje „Portfel XTB?”, a wpływ „bez wpisu” – po potwierdzeniu pieniądze liczą się dwa razy

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/dock.ts:114`, `src/shared/calc/dock.ts:120`, `src/shared/calc/dock.ts:130`, `src/shared/calc/dock.ts:136`, `src/renderer/features/dock/DockingDialog.tsx:158`, `docs/decyzje.md:443`

**Co się dzieje.** Skutek T63 (ta sama kwota co do grosza, 3 dni robocze bez świąt). Użytkownik wpisuje w ICTTJ wypłatę 1 000 zł, a bank księguje 999,50 zł (przewalutowanie konta USD, prowizja, literówka w ICTTJ). Wariant: wypłata w piątek przed Wielkanocą przychodzi po 3 dniach roboczych, które nie liczą świąt. W jednym imporcie są wtedy obie strony bez pary: wpis dostaje „Portfel XTB?” („najpewniej Portfel XTB”), a wpływ z XTB dostaje „bez wpisu w ICTTJ – dopisz wypłatę”. Wpływ silnik dokuje sam. Kliknięcie „Zadokuj na Portfelu XTB” dokłada drugą operację 1 000 zł, a pula wpisu (np. Podatek) idzie na pieniądze, których nie ma. Okno nie mówi, że w oknie wpisu jest wpływ z XTB o prawie tej samej kwocie.

**Poprawka.** W deliveries, gdy wpis jest bez pary, a wśród wolnych operacji `trading` tego samego kierunku jest kandydat w oknie rozszerzonym o kilka dni kalendarzowych, z kwotą różną o niewiele (np. do 1% albo 5 zł), nie proponować Portfela XTB. Zamiast tego dać stan „możliwa para – kwota różni się o X”. W oknie dokowania przycisk „Połącz” zapisze dokowanie tej operacji z `ictjEntryId` wpisu i flagą mismatch, a podział liczy się od kwoty z banku (silnik i tak bierze `amt`). Wpływ z takim kandydatem nie powinien pokazywać „Dopisz tę wypłatę w ICTTJ”. Opcjonalnie dodać do addWorkingDays polskie dni wolne (24–26.12, 1.01, 6.01, Poniedziałek Wielkanocny…).

## B23. Propozycje pensji i „Koperty ze średnich” dla przyszłego miesiąca liczą niepełny bieżący miesiąc (i miesiące bez danych) jako pełne (wbrew T47)

Priorytet: średni · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/shared/calc/plan.ts:33`, `src/shared/calc/plan.ts:35`, `src/renderer/features/month/MonthPage.tsx:115-119`, `src/renderer/features/month/MonthPage.tsx:124`, `src/renderer/features/month/MonthPage.tsx:179`

**Co się dzieje.** Spec: „Plan następnego miesiąca: kreator proponuje koperty ze średnich”. T47: propozycje z pełnych miesięcy historii, bez bieżącego. 18.10.2026 użytkownik przechodzi w Planie miesiąca na listopad. SalaryPanel wywołuje proposeSalary(transactions, '2026-11'), a fullMonthsBefore bierze maj–październik. Październik ma dopiero 18 dni kosztów, więc średnia spada: przy kosztach 3000 zł/mies. propozycja to 2700 zł zamiast 3000 zł („przyjmij 2 700 zł”). „Koperty ze średnich” (podpowiedź: „z 3 pełnych miesięcy”) dla listopada biorą sierpień–październik. Przy Jedzeniu 900 zł/mies. i 100 zł w październiku propozycja to 630 zł zamiast 900 zł. Dla grudnia w oknie jest nawet listopad bez żadnych danych: pensja spada do 2200 zł. Gdy żadna propozycja nie jest > 0, applyProposals po cichu nic nie robi.

**Poprawka.** Przekazać do proposeSalary / proposeEnvelopes (albo fullMonthsBefore) bieżący miesiąc i liczyć last = min(month − 1, bieżący − 1). Podpis „z N mies.” pokazywać z faktycznego okna. Gdy applyProposals nie ma żadnej koperty > 0, pokazać toast zamiast cichego return.

## B24. Esc w polach kwoty, daty i godziny nie anuluje szkicu – wpisana wartość i tak się zapisuje

Priorytet: średni · obszar: Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/components/fields.tsx:82-89`, `src/renderer/components/fields.tsx:90-96`, `src/renderer/components/fields.tsx:130-138`, `src/renderer/components/fields.tsx:172-180`, `src/renderer/components/fields.tsx:82`, `src/renderer/components/fields.tsx:92`, `src/renderer/components/fields.tsx:138`, `src/renderer/components/fields.tsx:180` …

**Co się dzieje.** W edytorze operacji (albo przy kopercie, pensji, części paragonu) użytkownik wpisuje błędną kwotę, np. „4599” zamiast „45,99”, i naciska Esc, żeby się wycofać. AmountField robi setDraft(null) i e.currentTarget.blur(). Blur odpala onBlur synchronicznie, jeszcze przed ponownym renderem. React wywołuje go z propsami poprzedniego renderu (zagnieżdżone zdarzenie w batchedUpdates, getListener czyta props z ostatniego commitu), więc `draft` to wciąż wpisany tekst. Kwota 4599 zł zostaje zapisana (onChange → updateRecord). Do tego stopPropagation blokuje zamknięcie okna dialogowego. W DateField i TimeField Esc nie ma żadnej obsługi: szkic zostaje i zapisze się przy wyjściu z pola. W praktyce w żadnym z trzech pól Esc nie cofa wpisu.

**Poprawka.** Ref `cancelled` ustawiany w obsłudze Esc i sprawdzany na początku onBlur (if (cancelled.current) { cancelled.current = false; setDraft(null); return }). Zamiennie draft trzymany w refie zamiast w domknięciu. Tę samą obsługę Esc dodać do DateField i TimeField (i NameInput w ui.tsx).

To samo zgłoszone też jako: „Esc w polu kwoty i w polu nazwy zapisuje wpisaną wartość zamiast ją cofnąć (DateField i TimeField Esc w ogóle nie obsługują)”.

## B25. Średnie i propozycje liczą od najstarszej operacji dowolnego rodzaju – jedna stara pożyczka z Radaru dokłada puste miesiące i zaniża pensję, koperty i cel kadłuba

Priorytet: średni · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/shared/calc/plan.ts:25-30`, `src/shared/calc/plan.ts:33-38`, `src/shared/calc/fleet.ts:411-413`, `src/shared/calc/fleet.ts:367-373`, `src/renderer/features/radar/actions.ts:47-60`, `src/renderer/features/month/MonthPage.tsx:124`, `src/renderer/features/wizard/WizardPage.tsx:45-50`

**Co się dzieje.** Użytkownik ma z mBanku 3 pełne miesiące historii (lipiec–wrzesień, 3 000 zł kosztów miesięcznie). W Radarze dopisuje pożyczkę udzieloną bratu w marcu 2024 z operacją („withOperation”), która dostaje datę pożyczki. firstFullMonth bierze teraz najstarszą operację dowolnego rodzaju, więc „pełne miesiące” zaczynają się od kwietnia 2024. Miesiące bez żadnych danych liczą się jako koszt 0. Propozycja pensji spada z 3 000 zł do 1 500 zł (6 miesięcy, z czego 3 puste). Koperty ze średnich i cel kadłuba w kreatorze spadają tak samo, a kreator podaje „pełne miesiące od 2024-04”. Silnik (T27) liczy średnie koszty z tego samego okna, więc cel kadłuba i zasięg na Mostku też się psują. Licznik pełnych miesięcy rośnie do ≥ 3, więc „koszty przyjęte” z kreatora przestają działać. Tak samo działa jeden ręczny wpis z datą sprzed importu.

**Poprawka.** Jedna wspólna funkcja pokrycia historii dla plan.ts i fleet.ts (T27/T47). Początek = najstarsza operacja z banku (bank != null) albo, gdy takich nie ma, najstarszy wydatek lub przychód. Pomijać kind 'loan' i 'correction' oraz operacje sprzed pierwszego miesiąca z kosztami. Opcjonalnie miesiące bez żadnej operacji pomijać w średniej zamiast liczyć je jako 0.

## B26. Pola liczb całkowitych (NumberField z decimals=0) przyjmują ułamki: harmonogram pożyczki gubi część kwoty, cel osłon i kadłuba wraca po cichu do 3 / 6

Priorytet: średni · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/radar/RadarPage.tsx:307`, `src/renderer/components/ui.tsx:77`, `src/renderer/components/ui.tsx:97`, `src/renderer/features/radar/actions.ts:44`, `src/shared/calc/loans.ts:86`, `src/shared/calc/operations.ts:48`, `src/renderer/features/settings/MachineTabs.tsx:25`, `src/renderer/features/settings/MachineTabs.tsx:28` …

**Co się dzieje.** (1) Radar → Nowa pożyczka: kwota 600 zł, w polu „Raty” wpisane 2,5. NumberField z decimals=0 przyjmuje 2,5, bo isValid sprawdza tylko zakres 1–120. Po wyjściu z pola widać „3” (2.5.toFixed(0)). Zapisany harmonogram ma 2 raty po 240 zł, razem 480 zł zamiast 600 zł. Pożyczka udzielona: po spłacie 480 zł zostaje „otwarte 120 zł” bez żadnej raty na radarze i bez przypomnienia o zaległości. Pożyczka wzięta: total = suma harmonogramu, więc dług jest zaniżony o 120 zł, a zasięg zawyżony. Toast podaje „2 raty”, a pole pokazuje 3. (2) Ustawienia → Warstwy i rozkazy: „Osłony – cel” = 4,5 (pole przyjmuje, bo „Minimalne osłony” obok przyjmują połówki). Po wyjściu z pola widać „5”, ale zapis fi.json przechodzi przez schemat `.int().catch(3)`, więc w pliku i w oknie (set({fi: saved})) ląduje 3, a nie 4 ani 5. Cel osłon spada o 1,5 pensji i nadwyżka zaczyna płynąć do kadłuba i celów wcześniej. „Kadłub – cel” 7,5 zamienia się na 6. Użytkownik nie dostaje żadnego komunikatu.

**Poprawka.** W NumberField: przy decimals === 0 traktować liczbę niecałkowitą jak niepoprawną (czerwona ramka, bez onChange, onReject z komunikatem) albo zaokrąglać przed onChange. W RadarPage i LayersTab dopisać `Number.isInteger(v)` do isValid. W monthlySchedule użyć `Math.max(1, Math.floor(count))`, a w splitEvenly `n = Math.floor(n)` jako zabezpieczenie.

## B27. Odłączone panele Mostka zamierają po wyjściu z Mostka: dane się nie odświeżają, a kliknięcia nic nie robią

Priorytet: średni · obszar: Mostek, Radar, Mapa, Ustawienia, proces główny i okna

Gdzie: `src/renderer/store/detach.ts:58`, `src/renderer/store/detach.ts:66`, `src/renderer/store/detach.ts:75`, `src/renderer/components/Panel.tsx:74`, `src/renderer/features/bridge/BridgePage.tsx:122`, `src/renderer/app/App.tsx:284`, `tests/e2e/bridge.spec.ts:120`, `src/renderer/store/detach.ts:65` …

**Co się dzieje.** Drugi monitor (D45, T60): „Odprawa” i „Stan okrętu” odłączone, a w głównym oknie użytkownik przechodzi do Operacji i dopisuje wydatki albo robi import. Okno odłączone dalej pokazuje stare „Energię dziś”, osłony i alarmy, bo dane wysyła tylko zamontowany panel Mostka. Kliknięcie pozycji odprawy w odłączonym oknie (np. „Asteroida…”) przenosi główne okno do Ładowni. Od tej chwili każde następne kliknięcie w odłączonym oknie nic nie robi, bo handler zdarzeń został usunięty przy odmontowaniu Mostka. Po północy okno pokazuje odprawę z poprzedniego dnia, dopóki ktoś nie wróci na Mostek. Odłączony panel na drugim monitorze ma sens właśnie wtedy, gdy główne okno pracuje na innym ekranie.

**Poprawka.** Wysyłać dane i obsługiwać zdarzenia odłączonych paneli Mostka niezależnie od bieżącego ekranu. Przykład: komponent `BridgeDetachHost` w App (obok TrayStatus), który przy otwartych kluczach 'bridge:*' z useDetach liczy bridgeFleet i useBriefingItems, woła api.detachSend i rejestruje handler onBridgeEvent. Panel na Mostku nie wysyła wtedy sam. Dodać E2E: odłącz Odprawę, przejdź do Operacji, dodaj wydatek, sprawdź nową energię w oknie, potem dwa kliknięcia po kolei.

To samo zgłoszone też jako: „Odłączony panel Mostka przestaje się odświeżać po przejściu na inny ekran”.

## B28. Przypomnienie o potwierdzeniu sald bierze najnowsze potwierdzenie dowolnego konta – Portfel XTB może nie być potwierdzany nigdy

Priorytet: średni · obszar: Mostek, Radar, Mapa, Ustawienia, silnik budżetu

Gdzie: `src/renderer/features/bridge/BridgePage.tsx:307`, `src/shared/calc/briefing.ts:181`, `src/renderer/store/notifier.ts:77`, `src/shared/notify.ts:83`, `src/shared/calc/briefing.ts:182`, `src/shared/notify.ts:84`, `docs/specyfikacja.md:179`

**Co się dzieje.** Specyfikacja: potwierdzanie sald raz w tygodniu – saldo mBanku i Portfela XTB, a różnica daje alarm „rozbieżność w ładowni” (T57: salda ponad 7 dni). Użytkownik co tydzień potwierdza mBank, a Portfela XTB (albo konta dodanego później) nie. Odprawa i niedzielne powiadomienie biorą jako „ostatnie potwierdzenie” najnowszą datę z wszystkich kont, więc nigdy nie przypominają o Portfelu. Rozbieżność na portfelu (zapomniana płatność kartą) nie wychodzi, a warstwy liczą się od złego salda. Potwierdzenie konta zarchiwizowanego też „odhacza” przypomnienie.

**Poprawka.** Przekazywać do briefing i dueNotices listę aktywnych kont budżetu z `lastConfirmation(a.id, balances)` (src/shared/calc/balances.ts, już używane w AccountsTab.tsx:54). Przypominać osobno o każdym koncie niepotwierdzonym od ponad 7 dni (np. „Portfel XTB: saldo niepotwierdzone od 12 dni”), z kluczem pozycji / powiadomienia per konto, i pomijać konta zarchiwizowane.

To samo zgłoszone też jako: „Przypomnienie o saldach znika po potwierdzeniu dowolnego jednego konta; odprawa i powiadomienie mają różne progi”.

## B29. Skrót szybkiego wpisu Ctrl+Alt+litera polskiego znaku (A, C, E, L, N, O, S, X, Z) przejmuje AltGr w całym systemie – nie da się pisać „ś”, „ą”, „ę”…

Priorytet: średni · obszar: Mostek, Radar, Mapa, Ustawienia, proces główny i okna

Gdzie: `src/renderer/components/ShortcutField.tsx:6`, `src/renderer/components/ShortcutField.tsx:15`, `src/renderer/features/settings/MachineTabs.tsx:125`, `src/renderer/features/wizard/WizardPage.tsx:277`, `src/main/quick.ts:132`, `src/main/quick.ts:125`

**Co się dzieje.** Użytkownik zmienia skrót (specyfikacja to przewiduje, gdy Ctrl+Alt+B koliduje z platformą tradingową) i naciska Ctrl+Alt+S („szybki”) albo wręcz AltGr+S. Na polskim układzie Windows AltGr to Ctrl+Alt, więc globalShortcut.register('Control+Alt+S') przechwytuje AltGr+S we wszystkich programach: zamiast „ś” w przeglądarce, Wordzie czy komunikatorze otwiera się szybki wpis. Ustawienia pokazują „działa”, nic nie ostrzega. To samo dla A/C/E/L/N/O/X/Z (ą ć ę ł ń ó ź ż) i U (€).

**Poprawka.** W acceleratorOf (albo w machinePrefsFrom / setMachinePrefs) odrzucać kombinację Control+Alt+{A,C,E,L,N,O,S,U,X,Z} bez Shift i bez Super. Pokazywać wtedy komunikat „koliduje z polskimi znakami (AltGr) – dodaj Shift” i proponować Ctrl+Alt+Shift+litera albo Ctrl+Shift+litera. Gdy pole odbiera naciśnięcie z e.getModifierState('AltGraph'), mówić o tym wprost.

To samo zgłoszone też jako: „Skrót szybkiego wpisu przyjmuje Ctrl+C, Ctrl+V, Ctrl+Z, skróty samej aplikacji i AltGr + litera – globalny skrót zabiera je wszystkim programom”.

## B30. Pieniędzy zarchiwizowanego celu nie da się odzyskać – po zmianie scenariusza ICTTJ zostają zamrożone poza zasięgiem i poza innymi celami (T66)

Priorytet: średni · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/starmap/StarMapPage.tsx:96`, `src/renderer/features/starmap/StarMapPage.tsx:104`, `src/renderer/features/starmap/StarMapPage.tsx:111`, `src/shared/calc/goals.ts:70`, `src/shared/calc/fleet.ts:140`, `src/shared/calc/fleet.ts:469`, `docs/decyzje.md:458`

**Co się dzieje.** Cel ICTTJ „Mieszkanie” zebrał z puli Cele 20 000 zł. Użytkownik wybiera inny scenariusz w Ustawienia → ICTTJ albo usuwa lub wyłącza ten cel w ICTTJ. Zgodnie z T66 cel zostaje zarchiwizowany „z zachowaniem środków”. Na Mapie gwiezdnej w „Zarchiwizowanych” nie ma dla niego żadnej akcji (przywrócić można tylko cel własny), a nowe dostawy już do niego nie trafiają. Zasięg liczy tylko osłony i kadłub, więc 20 000 zł znika z zasięgu i z klasy okrętu i nie zasila ani innych celów, ani „wolnego do decyzji”. Jedyne wyjście to wydatek opłacony z tego celu, czyli koszt, którego nie było. Tak samo z celem własnym zarchiwizowanym z rezygnacji: przywrócenie i zmiana kwoty nie uwalniają środków. To decyzja T66 / D72 („zachowuje środki”) prowadzi tu do realnego problemu.

**Poprawka.** (a) W OperationEditor (i ewentualnie w szybkim wpisie) dodać przy wydatku pole „Opłacone z celu” (goalId), bo silnik już to obsługuje (T24). Bez tego żaden cel nie może wydać swoich pieniędzy. (b) Przy celu zarchiwizowanym dodać „Zwolnij środki”: do osłon („wolne do decyzji”) albo do wskazanego aktywnego celu. Zapisać to jako rekord przesunięcia, który silnik stosuje w dniu decyzji, z „Cofnij”. (c) Dopisać to jako uzupełnienie T66 / T24 i poprawić podpowiedź na Mapie gwiezdnej, która dziś obiecuje niewykonalną ścieżkę.

## B31. Przełączanie folderu z Ustawień bez blokady i postępu: zapisy w trakcie trafiają do nowego folderu albo przepadają, brak „Przerwij”, drugie kliknięcie wypiera otwarcie

Priorytet: średni · obszar: Mostek, Radar, Mapa, Ustawienia, folder danych i synchronizacja, proces główny i okna

Gdzie: `src/renderer/features/settings/SettingsPage.tsx:175`, `src/renderer/features/settings/SettingsPage.tsx:195`, `src/renderer/features/settings/SettingsPage.tsx:326`, `src/renderer/features/setup/FolderSetup.tsx:50`, `src/main/index.ts:257`, `src/main/index.ts:391`, `src/main/index.ts:444`, `src/main/index.ts:502` …

**Co się dzieje.** Ustawienia → „Otwórz inny folder…” albo „Ostatnio używane foldery → Otwórz” na dużym folderze OneDrive „tylko online” (przypadek z D82): odczyt trwa sekundy do minut. switchTo robi flushSaves tylko na początku, nie ma stanu busy, nie pokazuje OpenProgressPanel ani „Przerwij” (na ekranie wyboru folderu i przy starcie ten sam odczyt ma pełny postęp). Użytkownik dalej pracuje na danych folderu A (szybki wpis, zmiana ustawienia) albo klika drugi raz – nowe otwarcie wypiera poprzednie („open superseded”) i dostaje toast „Przerwano wczytywanie folderu – nic w nim nie zostało zmienione”, choć niczego nie przerywał. (1) Zapis wysłany, gdy closeStore ustawił store=null i czeka na clearPresence, kończy się błędem „Nie wybrano folderu danych.” → ponowienie za 2 s, ale applySnapshot czyści dirty/timers/failed → zmiana przepada bez komunikatu. (2) Zapis wysłany po `store = opened`, a przed applySnapshot w oknie, trafia do folderu B: operacja z budżetu A ląduje w B (i pokazuje się w B przez fi:change), a zapis fi.json nadpisuje ustawienia B ustawieniami A (poprzednia wersja tylko w .history). Powinno: w trakcie przełączania okno w trybie tylko do odczytu z postępem, a zapis zawsze do folderu, z którego pochodzi rekord.

**Poprawka.** W Ustawieniach: stan „przełączanie” (globalny w store/data, np. phase 'switching') blokujący edycję i autozapis nowych zmian, okno z useOpenProgress + OpenProgressPanel i „Przerwij” (api.cancelOpen), przyciski folderu wyłączone. Po wyniku drugi flushSaves przed applySnapshot, a gdy się nie uda, nie przełączać, tylko zapytać. W main: saveRecord/saveSettings/deleteRecord z identyfikatorem folderu (root albo numer generacji z snapshotu) i odrzucanie zapisu niepasującego do bieżącego magazynu. closeStore nie powinien zostawiać store=null widocznego dla IPC: podmieniać magazyn atomowo, a sprzątać stary po podmianie. Dopisać do T126.

To samo zgłoszone też jako: „Zmiana folderu z Ustawień: edycje z czasu wczytywania mogą przepaść albo trafić do nowego folderu”; „Zmiana folderu z Ustawień: edycje z ostatnich sekund otwierania przepadają, a zapis w locie może trafić do nowego folderu”.

## B32. Notatka naruszenia „cargo” bez limitu długości – miesiąc gry nie przechodzi schematu i nie zapisuje się

Priorytet: średni · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:220`, `src/shared/calc/game.ts:222`, `src/shared/schema/records.ts:289`, `src/main/datastore/store.ts:817`, `src/main/datastore/store.ts:823`, `src/renderer/store/game.ts:50`, `src/renderer/store/game.ts:54`, `src/renderer/store/data.ts:430`

**Co się dzieje.** Ładunek jest już ponad linią zanurzenia, a użytkownik dodaje tego samego dnia w Ładowni kilka kontenerów o długich nazwach. Wystarczy 7 nazw po 80 znaków albo kilkanaście nazw z mBanku, np. „PGE OBRÓT SPÓŁKA AKCYJNA ODDZIAŁ…”. rateDay skleja wszystkie nazwy w `note` (game.ts:222), a schemat dnia gry dopuszcza najwyżej 500 znaków (records.ts:289). Po zamrożeniu tego dnia saveRecord odrzuca cały rekord `game/RRRR-MM.json` błędem „Niepoprawne dane: days.…note” (store.ts:817–823). Renderer ponawia zapis bez końca (data.ts:430–435), więc stale widać błąd zapisu, a zamknięcie okna pyta o niezapisane zmiany. Do końca miesiąca w pamięci zostają wszystkie kolejne zamrożone dni, misje, awanse i osiągnięcia, ale żadne z nich nie trafia na dysk. Po restarcie dni z dysku są nieaktualne, więc advanceGame zamraża je jeszcze raz z bieżących danych (wbrew T9) i ten sam błąd pojawia się znowu. Powinno być tak: notatka jest przycięta, a rekord zawsze zapisywalny.

**Poprawka.** W rateDay ograniczyć notatkę: 2–3 pierwsze nazwy i „i N innych”, całość przycięta `.slice(0, 500)`; to samo zabezpieczenie warto dodać dla `quiet` (counterparty ≤ 300 – dziś się mieści). W schemacie dnia gry zamiast twardego `.max(500)` dać przycinanie (`z.string().transform(s => s.slice(0, 500))` albo `.catch`). Wtedy jeden za długi tekst nie unieważnia całego miesiąca i rekord jest zawsze zapisywalny.

## B33. Zamrażanie dni od razu po otwarciu folderu – przed synchronizacją OneDrive oceny zapadają na nieaktualnych danych

Priorytet: średni · obszar: gra, Wywiad, raporty

Gdzie: `src/renderer/store/game.ts:37`, `src/renderer/store/game.ts:43`, `src/renderer/store/game.ts:50`, `src/shared/calc/game.ts:530`, `src/shared/calc/game.ts:532`, `src/renderer/app/App.tsx:257`

**Co się dzieje.** W sobotę o 23:30 na laptopie powstaje zakup w ciszy nocnej (naruszenie poważne). Laptop od razu zasypia, zanim OneDrive wyśle plik. W poniedziałek rano komputer stacjonarny startuje z Windows (`--hidden`), a FI otwiera folder, zanim OneDrive pobierze zmiany. Gdy tylko phase === 'ready', useGameAdvance wywołuje advanceGame. Ten zamraża sobotę (dziś − 2) bez zakupu z laptopa, jako zgodną, i zapisuje ją na stałe – późniejsza korekta już jej nie zmieni (T9). Gdy laptop zamroził te dni wcześniej, a jego plik `game/RRRR-MM.json` jeszcze nie dotarł, stacjonarny zamraża je drugi raz innymi wynikami (inne `frozenAt`, status, naruszenia). Wtedy OneDrive tworzy kopię konfliktu albo scalanie pyta użytkownika o pola dni gry. Margines 24 h z T9 nie chroni w tym przypadku, bo zamrożenie wypada akurat w chwili, gdy dane drugiego komputera są najmniej aktualne. Dotyczy też awansów i degradacji liczonych z tych dni. Decyzje T76 / D73 („dwa komputery piszą to samo”, „dane znane w chwili zamrożenia”) zakładają, że oba komputery mają te same dane, a zaraz po starcie to założenie nie jest spełnione.

**Poprawka.** Pierwsze zamrożenie po otwarciu folderu odłożyć, np. o 2–5 minut (precedens ICTTJ: zapisy w tle 20–25 s po otwarciu), i do chwili, aż watcher przez ok. 60 s nie zgłasza zmian z zewnątrz. Nie zamrażać przy nierozstrzygniętych konfliktach w kolekcji game. Zapisać jako T-decyzję uzupełniającą T76. Na laptopa, który nie wysłał pliku, to nie pomoże – wtedy działa T75.

## B34. „Zwrot pożyczki” / „Pożyczka udzielona” z importu bez powiązania z pożyczką z Radaru – pożyczka zostaje otwarta i zaległa, a zapamiętana reguła powtarza błąd

Priorytet: średni · obszar: import (ekran)

Gdzie: `src/renderer/features/import/options.ts:17`, `src/renderer/features/import/options.ts:25`, `src/renderer/features/import/options.ts:92`, `src/renderer/features/import/ImportPage.tsx:328`, `src/shared/import/reconcile.ts:429`, `src/shared/import/reconcile.ts:566`, `src/shared/import/reconcile.ts:611`, `src/shared/calc/fleet.ts:697` …

**Co się dzieje.** Użytkownik pożyczył Pawłowi 2000 zł przez Radar (pożyczka udzielona z harmonogramem, operacja wypływu z loanId). Paweł oddaje 500 zł przelewem. W imporcie grupa „PAWEŁ NOWAK” (Wpływy przelewem) – użytkownik wybiera „Zwrot pożyczki” (albo „Pożyczka” w pasku zbiorczym). Choice nie ma pola pożyczki, DecisionFields nie pokazuje wyboru pożyczki (edytor operacji go ma), więc buildImport tworzy operację kind 'loan' z loanId null. Silnik liczy ją pod kluczem '-': nie zmniejsza należności tej pożyczki, a cała kwota dokuje jak zwykła dostawa; loanState nie widzi spłaty – Radar dalej pokazuje 2000 zł należności, a rata 500 zł jest zaległa (odprawa, powiadomienia). „zapamiętaj” (domyślnie przy własnej decyzji) uczy reguły pawelnowak → 'loan', więc każda kolejna spłata wchodzi tak samo. T70: powiązanie z pożyczką ma tylko operacja „Pożyczka” z jej id. Analogicznie „Pożyczka udzielona” zdecydowana w imporcie nie trafia do żadnej pożyczki Radaru.

**Poprawka.** Przy opcji „Zwrot pożyczki” / „Pożyczka” w imporcie pokazać wybór otwartej pożyczki z Radaru. Domyślnie wybrać tę, której counterparty pasuje do nazwy z banku (similarCounterparty). loanId zapisywać w Choice (np. opcja `loan:<id>`) i w operacji. Bez wybranej pożyczki pokazać ostrzeżenie przy grupie, jeśli istnieje otwarta pożyczka tej osoby. Reguły rodzaju 'loan' nie uczyć bez loanId albo zapisywać ją z loanId.

## B35. Operacja z banku przeniesiona na inne konto wraca przy kolejnym imporcie jako druga – panel duplikatów jej nie widzi

Priorytet: średni · obszar: import (ekran), import (logika)

Gdzie: `src/shared/import/reconcile.ts:115`, `src/shared/import/reconcile.ts:116`, `src/shared/import/mbank.ts:269`, `src/renderer/features/operations/OperationEditor.tsx:197`, `src/shared/import/duplicates.ts:98`, `src/shared/import/duplicates.ts:121`, `src/renderer/features/import/state.ts:123`, `src/shared/import/reconcile.ts:115-116` …

**Co się dzieje.** Plik z mBanku trafił na złe konto (np. Portfel XTB – konto pliku zostaje z poprzedniej sesji, patrz osobne znalezisko) i użytkownik poprawia konto operacji w edytorze, albo przenosi pojedynczą operację z banku na inne konto budżetu. bank.key zawiera id konta z chwili importu. Kolejny plik na mBank (okresy się nakładają): planImport bierze tylko operacje tego konta (`mine`), przeniesiona ma klucz liczony z innym kontem, więc nie jest „znana”; nie jest też wpisem ręcznym (ma `bank`), więc się nie łączy – wiersz wchodzi drugi raz. findDuplicates grupuje „ten sam wiersz” po `accountId|bank.key` (klucze różne), a wpisy ręczne po `joinable` (bez `bank`) – podwójna operacja zostaje na stałe i podwaja wydatek.

**Poprawka.** Najprościej w edytorze: przy zmianie konta operacji z `bank` przeliczyć bank.key dla nowego konta (rowIdentity z bank.description/date/amount i fingerprint z nowym accountId) albo ostrzec. Do tego w findDuplicates porównywać tożsamość wiersza bez konta (data, opis, kwota) między kontami jako możliwy duplikat. Ewentualnie w planImport rozpoznawać ten sam wiersz na innym koncie i pokazywać go jako „już zaimportowany na konto X”.

To samo zgłoszone też jako: „Operacja z banku przeniesiona na inne konto wraca z następnym importem, a panel duplikatów tego nie widzi”.

## B36. Niepołączony możliwy duplikat (domyślnie przy `ask`) importuje się bez rozpoznania – przelew własny jako wydatek, wypłata XTB jako zwykły wpływ

Priorytet: średni · obszar: import (ekran), import (logika)

Gdzie: `src/shared/import/reconcile.ts:188`, `src/shared/import/reconcile.ts:556`, `src/shared/import/reconcile.ts:559`, `src/shared/import/reconcile.ts:466`, `src/renderer/features/import/ImportPage.tsx:233`, `src/shared/import/reconcile.ts:184`, `src/shared/import/reconcile.ts:554-561`, `src/shared/import/reconcile.ts:585` …

**Co się dzieje.** W budżecie jest ręczny wpływ 500 zł „Ania zwrot za bilety” (09.10) i ręczny wydatek −1000 zł „Telewizor” (12.10). Plik ma wypłatę z XTB +500 zł (10.10) i PRZELEW WŁASNY −1000 zł (11.10). Oba wiersze stają się 'merge' z loose 'name' i ask=true, więc domyślnie NIE są łączone. Takie wiersze nie są klasyfikowane (classifyRow tylko dla wierszy bez planu) ani pokazywane w Kategoryzacji, a buildImport tworzy je z `base` = goły expense/income bez kategorii. Wynik: XTB jako 'income' (nie 'trading' – nie zadokuje się z wpisem ICTTJ, liczy się jako przychód), przelew własny jako 'expense' (koszt, energia/koperty), Biedronka bez kategorii mimo sieci/reguły. To samo, gdy użytkownik odznaczy zwykłe dopasowanie.

**Poprawka.** Klasyfikować także wiersze 'merge' (classifyRow dla wszystkich wierszy albo przynajmniej dla 'merge'; zachować decision i containerId w RowPlan merge). Przy niepołączeniu używać choiceOf(decision) i containerId. Lepiej jeszcze traktować niepołączone dopasowania jak 'new' w grupach, żeby dało się je zdecydować w Kategoryzacji (wymaga, żeby importGroups widziały je zależnie od noMerge).

To samo zgłoszone też jako: „Niepołączony możliwy duplikat (domyślnie przy „ask”) wchodzi bez rozpoznania i poza grupami: przelew własny i XTB jako zwykły wydatek / wpływ, reguły i kontener pominięte, choć podgląd obiecuje pokazaną decyzję”.

## B37. „Ustaw” dla zaznaczonych bez wybranej kategorii nadpisuje propozycje sieci i uczy reguł „wydatek bez kategorii” – kolejne importy pokazują te marki jako gotowe

Priorytet: średni · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:562`, `src/renderer/features/import/ImportPage.tsx:571`, `src/renderer/features/import/state.ts:362`, `src/renderer/features/import/state.ts:373`, `src/shared/import/reconcile.ts:604`, `src/shared/import/reconcile.ts:619`, `src/renderer/features/import/state.ts:412`

**Co się dzieje.** Użytkownik klika „Zaznacz wszystkie”, zostawia domyślną opcję „Wydatek / zwrot towaru – kategoria” z pustą kategorią i klika „Ustaw”. chooseSelected daje każdej grupie decyzję expense/null z remember=true – także grupom z propozycją sieci (Biedronka → zakupy spożywcze). Import zapisuje je bez kategorii, a buildImport uczy reguł exact z categoryId null (źródło 'brand'/'none' nie jest pomijane). Przy następnym imporcie te marki mają źródło 'rule', temat jest 'done' („Gotowe”, zwinięte), a reguła zasłania też sieć i słowa kluczowe – marki na zawsze wchodzą bez kategorii. W Operacjach decyzja zbiorcza wymaga kategorii (T91), saveKeywordRule odrzuca wydatek bez kategorii – tu brak takiej blokady.

**Poprawka.** W BulkBar wyłączyć „Ustaw” (albo pokazać komunikat „Wybierz kategorię”), gdy hasCategory(option) && !categoryId. W buildImport nie uczyć reguły dla expense z categoryId null (także przy decyzji grupy lub tematu bez kategorii) – taka decyzja nie niesie wiedzy o marce.

## B38. Plan na ekranie nie jest liczony od nowa po zmianie nazwisk właściciela, kontenerów, kategorii ani operacji – import liczy go od nowa i decyzje o zmienionych kluczach przepadają po cichu

Priorytet: średni · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:791`, `src/renderer/features/import/state.ts:40`, `src/renderer/features/import/state.ts:124`, `src/renderer/features/import/state.ts:170`, `src/renderer/features/import/state.ts:172`, `src/renderer/features/import/state.ts:455`, `src/renderer/features/import/state.ts:459`, `src/shared/import/reconcile.ts:103` …

**Co się dzieje.** Plik otwarty, decyzje podjęte, bez importu. Potem: (a) w Ustawieniach → Import z banku użytkownik dopisuje „JAN KOWALSKI” do swoich nazwisk (wcześniej zdecydował grupę przelewów do niego jako wydatek); (b) w Ładowni dodaje kontener z odbiorcą z pliku; (c) archiwizuje kategorię, z której szła propozycja słowa (temat „na mieście” zdecydowany jako „kawa i przekąski”). replanIfChanged reaguje tylko na reguły, połączenia i domowników, więc ekran i Podgląd pokazują stary plan i stare decyzje. runImport liczy plan od nowa (T42): propozycja grupy (przelew własny, containerId, kategoria w proposalSig) i klucze grupy i tematu się zmieniają, decyzja zapisana pod starym kluczem nie trafia do grupy – operacja wchodzi jako przelew własny, opłata kontenera albo wydatek bez kategorii, bez reguły i bez ostrzeżenia. Przy zmianie reguł T90 obiecuje przeniesienie decyzji – tu tej logiki nie ma. (d) deletedKeys to migawka z chwili wczytania pliku: operacja z banku usunięta w trakcie sesji w Operacjach albo na drugim komputerze (synchronizacja w tle) przy imporcie wraca jako nowa, choć ekran pokazywał ją jako „już zaimportowaną”.

**Poprawka.** W runImport zamiast gołego planNow wywołać logikę replanImport (przeniesienie decyzji po operacjach) i budować import z przeniesionych choices. Jeśli plan różni się od wyświetlanego, zatrzymać import z prośbą o sprawdzenie. W runImport (i przy przeliczeniu planu) odświeżać deletedKeys przez await deletedBankKeys(). planInputs i efekt replanIfChanged rozszerzyć o ownNames, kategorie, kontenery i rekordy transakcji (referencje z useData), żeby podgląd liczył się od nowa po każdej zmianie danych wejściowych.

## B39. Po przeliczeniu planu (słowo kluczowe, połączenie nazw, „+ domownik”) temat traci swoją decyzję, a jej późniejsza zmiana nie obejmuje żadnej grupy

Priorytet: średni · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:192`, `src/renderer/features/import/state.ts:243`, `src/renderer/features/import/ImportPage.tsx:474`, `src/renderer/features/import/ImportPage.tsx:483`, `src/renderer/features/import/ImportPage.tsx:507`, `src/renderer/features/import/state.ts:411`

**Co się dzieje.** Temat „Zakupy bez rozpoznania” (3 sklepy) zdecydowany jako kategoria A. Użytkownik dodaje słowo kluczowe (panel „Słowa kluczowe”, propozycja reguły albo „zapamiętaj jako słowo kluczowe”) → replanImport zamienia decyzję tematu na własne decyzje grup i czyści choices.themes. Nagłówek tematu pokazuje teraz propozycję („Wydatek”, bez kategorii) z plakietką „do decyzji”, temat jest w zwiniętej sekcji „Gotowe” (ten sam objaw co w znalezisku o temacie z markami zdecydowanymi osobno). Gdy użytkownik zmieni kategorię tematu na B, chooseTheme zapisuje decyzję tematu, ale każda grupa ma już własną (A), więc B nie trafia do żadnej operacji – a podpowiedź na ekranie mówi „Decyzja tematu obejmuje wszystkie jego marki”.

**Poprawka.** W replanImport zachować `choices.themes[t]` (i `rememberThemes`, `accepted.themes`), gdy temat istnieje dalej i nie dołączyła do niego żadna grupa spoza jego grup sprzed przeliczenia (porównanie po kluczach wierszy). Na grupy przenosić decyzję tylko w temacie, do którego doszły nowe grupy, oraz w grupach, które zmieniły temat. Alternatywnie oznaczyć przeniesione decyzje (`fromTheme: Record<grupa, temat>`), żeby chooseTheme je nadpisywał, a ThemeRow pokazywał wspólną decyzję grup zamiast „do decyzji”.

## B40. Zwrot towaru z zakupu, który finansuje domownik, trafia do mnie: import nigdy nie tworzy zwrotu „finansuje: X”

Priorytet: średni · obszar: import (logika)

Gdzie: `src/shared/import/classify.ts:340-347`, `src/shared/import/reconcile.ts:562-564`, `src/shared/import/reconcile.ts:620`, `src/renderer/features/import/options.ts:22`, `src/shared/calc/household.ts:244-249`

**Co się dzieje.** Reguła „ROSSMANN → finansuje: Anna · Kosmetyki” (Anna kupuje moją kartą). Anna oddaje w sklepie towar za 50 zł; w pliku jest „ROSSMANN 123 ZWROT TOWARU +50 zł”. decideRow bierze z reguły zakupów tylko `categoryId`, a buildImport ustawia `refundable` wyłącznie dla wydatku ze znakiem minus. Zwrot zapisuje się jako mój ujemny wydatek (+50 zł do energii i koperty Kosmetyki), a Anna dalej ma oddać pełną kwotę zakupu. Rejestr rozliczeń obsługuje taki zwrot („A product return of a purchase they financed: their money”, household.ts:244), ale import nie umie go utworzyć, a lista opcji dla wpływu nie ma „Zwrot – finansuje: X”; regule kierunku 'in' nie da się też nadać osoby.

**Poprawka.** W decideRow (gałąź ZWROT) przenosić z reguły zakupów refundable i memberId: `{ categoryId, refundable: bought.kind === 'expense' && bought.refundable, memberId: bought.refundable ? bought.memberId : null }`. W buildImport pozwolić na refundable dla wydatku także przy dodatniej kwocie (`c.kind === 'expense' && c.refundable`) z memberId. W options.ts dodać dla wpływu „Zwrot dla: X” (refundable:<id>, fits dla 'in'), jak w edytorze. Regułę wystarczy dalej czytać z kierunku 'out', bez uczenia osobnej reguły 'in'.

## B41. Wpłata domownika traci rozpoznanie przez regułę bez osoby: słowo kluczowe z tytułu albo reguła połączonej nazwy

Priorytet: średni · obszar: import (logika)

Gdzie: `src/shared/import/classify.ts:298-302`, `src/shared/import/classify.ts:327-336`, `src/shared/import/reconcile.ts:222-250`, `src/shared/import/reconcile.ts:236`, `src/shared/import/reconcile.ts:248`

**Co się dzieje.** (1) Użytkownik ma słowo kluczowe „oszczędności” → przelew własny (słowa przelewu własnego mają oba kierunki). Domownik Anna (zaliczka) przelewa 500 zł z tytułem „NA OSZCZĘDNOŚCI”. Reguła słowa z tytułu wygrywa z rozpoznaniem domownika, bo wyjątek w classify.ts:302 dotyczy tylko reguły zwykłego przychodu. Wpłata staje się przelewem własnym do osłon, a zaliczka Anny nie rośnie. Tak samo działa słowo zwrotu („wydatek” obu kierunków z decyzji zbiorczej w Operacjach – T91). (2) Użytkownik połączył nazwy „NOWAK A” i „ANNA NOWAK”. Dla „NOWAK A” istnieje stara reguła zwykłego przychodu (sprzed dodania Anny jako domownika). `shareMerged` przekazuje tę decyzję wierszom marki ze źródłem 'none', także wpłacie „ANNA NOWAK”, którą decideRow rozpoznał jako pieniądze domownika („pytaj”). Wpłata Anny staje się zwykłym przychodem („jak „NOWAK A” (połączone nazwy)”) i nie spłaca jej należności. decideRow celowo każe takiej regule ustąpić domownikowi (komentarz w linii 300), a shareMerged to odwraca.

**Poprawka.** W shareMerged nie nadpisywać odbiorców z decision.household (osoba z „pytaj” – zostaje pytanie o domownika). Ewentualnie przekazywać im tylko decyzje dawcy z tą samą osobą (donor.decision.memberId === c.decision.memberId). Zmianę dla słów kluczowych z tytułu (byTitle) przy rozpoznanym domowniku zaproponować użytkownikowi jako doprecyzowanie T110, nie wprowadzać bez decyzji.

## B42. Jednorazowy błąd odczytu pliku zostaje „uszkodzonym plikiem” aż do restartu, a zapis w to miejsce odsuwa poprawny plik

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:314`, `src/main/datastore/store.ts:315`, `src/main/datastore/store.ts:318`, `src/main/datastore/store.ts:320`, `src/main/datastore/store.ts:760`, `src/main/datastore/store.ts:830`, `src/main/datastore/store.ts:933`, `src/main/datastore/atomic.ts:6`

**Co się dzieje.** Plik operacji (albo planu miesiąca, albo fi.json) jest w OneDrive „tylko online”. Aplikacja startuje z Windows przed OneDrive albo bez sieci, albo plik zmieniony na drugim komputerze przychodzi w chwili zerwania sieci. readFile kończy się błędem spoza RETRYABLE (EIO / UNKNOWN z Cloud Files) → loadFile zapisuje problemState 'corrupt' z hash '' i mtime/size pliku. Przy każdym następnym odczycie (watcher, sondowanie co 30 s, „Przeskanuj teraz”) warunek z linii 315 (ten sam mtime i rozmiar) zwraca zapamiętany problem – pliku nikt już nie czyta. Operacja znika z budżetu (złe salda, warstwy, koperty) do restartu aplikacji, choć plik jest poprawny i już dostępny. Gorzej: gdy okno nie widzi planu miesiąca, edycja tworzy nowy plan i saveRecord trafia na „problem” → setAsideProblem przemianowuje POPRAWNY plan na „-uszkodzona-”; dla fi.json każdy autozapis ustawień odsuwa poprawne (nowsze, z drugiego komputera) fi.json jako „uszkodzone” i zapisuje stare ustawienia. Powinno: błąd odczytu nie może być zapamiętany jak treść pliku – następne skanowanie ma czytać plik ponownie.

**Poprawka.** W FileState oznaczyć błąd odczytu (np. `readError: true`). W loadFile nie używać ponownie stanu z błędem odczytu i zawsze czytać jeszcze raz. Gdy plik był wcześniej rekordem, przy błędzie odczytu zostawić poprzedni rekord w widoku z ostrzeżeniem w problemach, zamiast go wycofywać – operacja nie znika z budżetu. setAsideProblem/saveRecord/saveSettings: dla stanu z readError najpierw ponowić odczyt. Gdy się uda – zwykła ścieżka (preserveExternalChange). Gdy nie – odmówić zapisu z komunikatem („plik niedostępny – OneDrive”), zamiast przemianowywać plik na „-uszkodzona-”.

## B43. Zamknięcie aplikacji czeka na zapis tylko 4 s – przy 150 tys. zapisy i rescan trwają dłużej, okno zamyka się jak po udanym zapisie

Priorytet: średni · obszar: folder danych i synchronizacja, proces główny i okna

Gdzie: `src/main/index.ts:900`, `src/main/index.ts:904`, `src/main/index.ts:986`, `src/main/datastore/store.ts:131`, `src/renderer/store/data.ts:598`, `src/main/index.ts:872`, `src/main/datastore/store.ts:844`, `src/renderer/features/operations/state.ts:92`

**Co się dzieje.** Przy 150 tys. operacji użytkownik poprawia kilka operacji i zamyka aplikację (Zakończ z zasobnika, wyłączenie Windows, „Uruchom ponownie” po aktualizacji). flushSaves wysyła zapisy, ale w mutexie DataStore stoi przed nimi odświeżenie watchera (0,6 s) albo pełny rescan z 30-sekundowego cyklu lub z focusu okna (~5–6 s). Po 4 s `setTimeout(() => finish(true), 4000)` uznaje zapis za udany, okno się zamyka, window-all-closed → closeStore → app.quit() nie czeka na kolejkę mutexu – zapisy w kolejce przepadają bez ostrzeżenia. Przy 30 tys. na wolnym dysku/OneDrive (rescan 1–3 s) też możliwe.

**Poprawka.** Renderer wysyła co ~1 s „wciąż zapisuję” (`fi:flushProgress`), a main przedłuża czas, dopóki są postępy (limit np. 60 s z okienkiem „Zapisywanie…”). Po przekroczeniu limitu `finish(false)` zamiast `true`. W `window-all-closed` przed app.quit() poczekać na opróżnienie mutexu (`store.idle()` = `mutex.run(async () => {})` z limitem). Pełny refresh przy zamykaniu nie startuje (flaga `closing` w watcherze i handlerze focus).

To samo zgłoszone też jako: „Zamknięcie aplikacji: po 4 s bez odpowiedzi uznaje zmiany za zapisane i kończy proces przed kolejką zapisów w procesie głównym”.

## B44. „Zachowaj tę wersję” / „Zachowaj nowsze” nie odkłada odrzuconej wersji do historii: oryginał nadpisany w miejscu bez śladu, kopia tylko do Kosza tego komputera (albo usunięta bez Kosza)

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:952`, `src/main/datastore/store.ts:957`, `src/main/datastore/store.ts:964`, `src/main/datastore/store.ts:974`, `src/main/datastore/store.ts:976`, `src/main/datastore/store.ts:977`, `src/main/datastore/store.ts:742`, `src/main/index.ts:247` …

**Co się dzieje.** OneDrive zrobił kopię konfliktu fi-LAPTOP.json (albo transactions/…_ID-LAPTOP.json, albo months/2026-03-LAPTOP.json z innym id planu). (a) „Zachowaj tę wersję” przy kopii albo „Zachowaj nowsze: wszystkie” (kopia ma późniejsze updatedAt): resolveConflict zapisuje kopię writeState-em pod ścieżką oryginału bez history.snapshot, a pętla czyszcząca pomija ścieżkę zachowaną – wersja oryginału przepada bez śladu, mimo komunikatu „odrzucona wersja jest w Koszu”; dla planu miesiąca z innym id ginie cały rekord (nikt go nie odkłada). (b) „Zachowaj” przy oryginale: kopia idzie tylko do Kosza tego komputera; trash() po nieudanym shell.trashItem (pendrive, dysk sieciowy – przypadki wprost wymienione w kodzie) robi fs.rm – wersja przepada na zawsze, a toast twierdzi co innego; na drugim komputerze odrzuconej wersji w ogóle nie ma. Każde inne nadpisanie (edycja, przywrócenie, duplikat id przy zapisie – keepDuplicate 'discarded', odrzucenie w oknie zmian) zachowuje poprzednią wersję w .history/, które synchronizuje się na wszystkie komputery. Odzyskać można tylko z kopii dziennej ZIP (do doby wstecz).

**Poprawka.** W resolveConflict przed writeState przy keep='copy' odłożyć oryginał (`history.snapshot(kind, canonical.record, 'discarded')`, także dla fi.json). Gdy oryginał ma inne id (plan miesiąca), odłożyć go pod jego id. Przy keep='canonical' także odłożyć kopię do historii przed trash, bo historia synchronizuje się na wszystkie komputery, a Kosz nie. trash() zwraca, czy plik poszedł do Kosza, a toast mówi „odrzucona wersja jest w historii wpisu”.

## B45. Rozstrzygnięcie konfliktu nie sprawdza stron: „Zachowaj” przy brakującym / uszkodzonym oryginale kasuje jedyną czytelną wersję, kopia nadpisuje uszkodzony albo nowszy plik, a kopia w nowszym formacie staje się zapisywalna

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/features/sync/SyncPage.tsx:81`, `src/main/datastore/store.ts:952`, `src/main/datastore/store.ts:957`, `src/main/datastore/store.ts:964`, `src/main/datastore/store.ts:974`, `src/main/datastore/store.ts:331`, `src/shared/conflicts.ts:47`, `src/renderer/features/sync/SyncPage.tsx:350`

**Co się dzieje.** (a) OneDrive zostawia tylko kopię `transactions/2026/2026-03-16_<ID>-PC.json` bez oryginału, albo oryginał jest uszkodzony (pół-zsynchronizowany). Operacja znika z list i pojawia się konflikt. Strona „Oryginał” ma czerwone „Brak pliku oryginalnego”, ale jej „Zachowaj tę wersję” jest aktywne – kliknięcie wyrzuca do Kosza jedyną czytelną wersję i operacja znika (historia ma 0 wpisów). „Zachowaj nowsze” dla tego samego konfliktu odmawia („Nieczytelna wersja – wybierz ręcznie”). (b) Przy uszkodzonym oryginale „Kopia” zapisuje rekord prosto na jego ścieżkę (writeState), bez odsunięcia jako `-uszkodzona-` jak w saveRecord – wbrew tekstowi strony „Uszkodzone pliki … nigdy nie są nadpisywane”. (c) Oryginał months/2026-04.json zapisała nowsza wersja aplikacji (schemaVersion 2, pole newField – tylko do odczytu), obok starsza kopia 2026-04-PC.json z późniejszym updatedAt: „Zachowaj nowsze” / „Zachowaj tę wersję” przy kopii nadpisuje plik nowszego formatu wersją v1 (newField przepada) – wbrew zasadzie „plik w nowszym formacie nigdy nie jest nadpisywany”. Odwrotnie: kopia w nowszym formacie pasująca do schematu ma record, nie trafia do `skipped`, po zachowaniu zapisuje się ze swoim schemaVersion, a w pamięci jest zwykłym, edytowalnym rekordem.

**Poprawka.** Wyłączyć „Zachowaj tę wersję” przy stronie bez rekordu także dla 'canonical' albo zmienić etykietę na „Usuń kopię (oryginału nie ma)” z potwierdzeniem. Przy keep='copy' na oryginale w stanie problemu najpierw setAsideProblem (jak saveRecord). Odmowa przy readOnly / too-new może zostać jako zabezpieczenie na przyszłość.

## B46. Dwa plany tego samego miesiąca z dwóch komputerów (losowe id): okno ma oba naraz, zastąpiony plan jest „usunięty na innym komputerze”, a „Zachowaj” nie zapisze się nigdy

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/features/month/actions.ts:30`, `src/renderer/features/month/actions.ts:37`, `src/main/datastore/store.ts:826`, `src/main/datastore/store.ts:828`, `src/renderer/store/data.ts:224`, `src/renderer/store/data.ts:314`, `src/shared/calc/plan.ts:272`, `src/shared/calc/game.ts:126`

**Co się dzieje.** Plan miesiąca dostaje losowe id (newId), w przeciwieństwie do miesięcy gry (stałe `gameMonthId`). Laptop offline 1 listopada ustawia pensję – powstaje plan X dla 2026-11; komputer stacjonarny przed synchronizacją też – plan Y (ta sama ścieżka months/2026-11.json). OneDrive: X dostaje nazwę kanoniczną, plik Y staje się kopią 2026-11-PC.json. Na komputerze z niezapisaną edycją Y: main widzi usunięcie Y i nowy rekord X → okno ma w pamięci DWA plany listopada, a Y czeka jako „usunięty na innym komputerze” (to nieprawda – zastąpił go inny plan). planFor i editPlan biorą pierwszy znaleziony plan miesiąca – czyli Y: budżet liczy pensję i koperty z planu, którego nie ma na dysku, a każda dalsza edycja trafia do Y. Wybór „Zachowaj (przywróć plik)” → saveRecord(Y) → „Plik months/2026-11.json należy do innego wpisu” → ponawianie co 2–60 s w nieskończoność, zamknięcie okna pyta o niezapisane zmiany. Wybór „Usuń też tutaj” zostawia tylko kopię konfliktu, której „Zachowaj” nadpisuje X bez historii (znalezisko o resolveConflict).

**Poprawka.** Stałe id planu (np. `fixedId('MON', 'RRRRMM')`, jak gameMonthId) dla nowych planów – kolizja staje się wtedy zwykłą zmianą tego samego rekordu (merge3 / pytanie). Dla istniejących danych: w applyChange para „usunięcie + nowy rekord tej samej ścieżki 'month'” = zastąpienie, czyli pytanie „który plan zachować”, a nie „usunięty na innym komputerze”. W saveRecord dla układu 'month' z innym id zapisać wersję jako kopię konfliktu zamiast wiecznego błędu.

## B47. Scalanie trójstronne: klucz dodany po jednej stronie (np. nowa koperta) to „konflikt”, a domyślny wybór „moja” go usuwa

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/shared/merge.ts:92`, `src/shared/merge.ts:96`, `src/shared/merge.ts:107`, `src/shared/merge.ts:139`, `src/shared/remoteChanges.ts:281`, `src/renderer/features/sync/RemoteChangesDialog.tsx:151`, `src/shared/merge.ts:148`

**Co się dzieje.** Plan listopada ma koperty {A: 100 zł}. Na laptopie użytkownik dodaje kopertę C (300 zł); na tym komputerze ma niezapisaną zmianę limitu A na 150 zł. Przychodzi wersja z laptopa: merge3 dla klucza C wywołuje mergeAt(undefined, undefined, 30000) – brak klucza w ZNANEJ bazie jest traktowany jak „baza nieznana” (ABSENT), więc powstaje konflikt zamiast prostego przyjęcia dodania. W trybie „scalaj” zamiast cichego scalenia pojawia się okno, a „Scal” z domyślnym wyborem pola („Moja wersja” = brak) i „Zastosuj” zapisuje plan BEZ koperty C. To samo dla innych obiektów-słowników (np. settings.import.aliases, pola opcjonalne jak bank.bankName). Dla tablic z id ten sam przypadek scala się poprawnie, więc reguły są niespójne.

**Poprawka.** W mergeAt dla dwóch obiektów przy znanej bazie (isObject(base)) przekazywać do rekurencji osobny znacznik „klucza brak w znanej bazie” (np. `const MISSING = Symbol()`; `k in b ? b[k] : MISSING`) i traktować MISSING w warunkach bazy jak undefined: `deepEqual(MISSING→undefined, mine)` → bierz theirs, `deepEqual(…, theirs)` → bierz mine. Konflikt tylko wtedy, gdy obie strony dodały różne wartości. Test: koperta dodana na drugim komputerze + zmieniony limit innej koperty tutaj → scalone bez okna. Ta sama poprawka w ICTTJ jest poza zakresem (tylko do odczytu).

## B48. Zmiana z drugiego komputera w trakcie zapisu: wybór „Weź z …” / „Usuń też tutaj” nie trafia na dysk

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/store/data.ts:209`, `src/renderer/store/data.ts:222`, `src/renderer/store/data.ts:309`, `src/renderer/store/data.ts:318`, `src/renderer/store/data.ts:406`, `src/renderer/store/data.ts:410`, `src/main/datastore/store.ts:835`, `src/main/datastore/store.ts:136`

**Co się dzieje.** Użytkownik edytuje notatkę operacji; autozapis wysłał saveRecord, ale w main mutex trzyma akurat refresh (np. sondowanie co 30 s na dużym folderze), który wczytał wersję tej operacji z laptopa i wysłał ją do okna. Okno: rekord jest jeszcze 'dirty' → konflikt pola → pozycja czeka w oknie „Zmiany z drugiego komputera”. Następnie main wykonuje zapis: existing = wersja z laptopa (już wczytana), więc preserveExternalChange nie robi kopii i „moja” nadpisuje wersję z laptopa (ta zostaje tylko w historii). runSave kończy się, rekord przestaje być dirty. Użytkownik wybiera „Weź z laptopa”: resolveRemote tylko podmienia rekord w pamięci (forget + setEntry), niczego nie zapisuje – okno pokazuje wersję z laptopa, na dysku zostaje „moja”; po restarcie wraca „moja”. Wariant z usunięciem: usunięcie na laptopie + zapis w locie odtwarza plik; „Usuń też tutaj” usuwa tylko z pamięci, operacja wraca po restarcie (podwójne liczenie, jeśli ktoś ją dopisał ponownie).

**Poprawka.** Zaznaczać w PendingRemote (np. pole `savedAfter`), że po jego przyjściu zakończył się własny zapis tego rekordu – ustawiać to w runSave po udanym saveRecord / saveSettings, gdy pendingFor(key) istnieje. W resolveRemote dla 'theirs' z savedAfter: przy aktualizacji setEntry(theirs) + scheduleSave(c, id, 0) (dla fi: set + scheduleSave('fi','fi',0)); przy usunięciu api.deleteRecord(c, id). To samo w ścieżce acceptNewer (idzie przez resolveRemote).

## B49. Zapis rekordu usuniętego właśnie na drugim komputerze po cichu go przywraca – bez kopii, bez pytania

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:780`, `src/main/datastore/store.ts:784`, `src/main/datastore/store.ts:788`, `src/main/datastore/store.ts:835`, `src/main/datastore/store.ts:838`

**Co się dzieje.** Na laptopie użytkownik usuwa operację (np. duplikat). OneDrive usuwa plik na tym komputerze, a zanim watcher to zgłosi (debounce 300 ms + odświeżenie; na Windows zdarzenie katalogu wymusza pełny rescan 1–6 s), tutaj odpala się autozapis tej samej operacji (np. zmieniona kategoria). preserveExternalChange: `fs.stat` rzuca ENOENT → `catch { return }` → plik jest zapisany od nowa. Zdarzenie watchera potem nie widzi zmiany (null), okno nigdy nie dostaje usunięcia ani pytania. OneDrive odsyła plik na laptop – usunięta operacja wraca na obu komputerach i znów liczy się w saldach. Gdyby watcher zdążył, okno zapytałoby („usunięty na innym komputerze” przy lokalnych edycjach) – zmieniony plik z zewnątrz dostaje kopię „-zewnetrzna-”, usunięty – nic.

**Poprawka.** W preserveExternalChange przy ENOENT nie wracać po cichu. Najpierw findMoved(collection, {id}) – rekord przeniesiony obsługuje istniejąca gałąź. Gdy nie znaleziono: this.files.delete(existing.relPath), removedOutside.add(key) i rzucić osobny błąd (np. RemovedOutsideError), bez zapisu. Handler IPC saveRecord przy tym błędzie wysyła `send(await store.refresh([existing.relPath], 'external'))` (diff zgłosi usunięcie, bo prevKeys je ma) i odrzuca zapis. W oknie rekord jest 'dirty', więc usunięcie trafia do okna jako pytanie („Zachowaj (przywróć plik)” → scheduleSave), a ponowienia runSave czekają na decyzję dzięki `pendingFor(key)`.

## B50. Folder z ponad ok. 125 tys. plików w jednej kolekcji w ogóle się nie otwiera – „Maximum call stack size exceeded”

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:271`, `src/main/datastore/store.ts:451`

**Co się dzieje.** Zmierzone na syntetycznym folderze ze 150 tys. operacji (10 lat): `listDataFiles` dokłada pliki kolekcji przez `rels.push(...lista)`, a rozwinięcie tablicy w argumenty funkcji przepełnia stos przy ok. 125–130 tys. elementów (Node 22 i Electron 44 tak samo). Otwarcie kończy się po 2 s ekranem wyboru folderu z komunikatem „Maximum call stack size exceeded<ścieżka>” (po angielsku, sklejony ze ścieżką), a w logu „step list, 0/0 files”. Przy zwykłym tempie ok. 3 tys. operacji rocznie to granica ok. 40 lat, ale przy 2–3 importach dziennie i podziałach – wcześniej. Ten sam wzorzec ma `Math.min(...pending.map(…))` przy migracji (store.ts:451): pierwsza zmiana SCHEMA_VERSION w folderze z ponad 125 tys. plików do migracji wywróci otwarcie. Kopia aplikacji z poprawioną jedną linią otworzyła ten folder w 28 s.

**Poprawka.** Zamiast `push(...tablica)` pętla `for (const f of lista) rels.push(f)` (albo `concat`), zamiast `Math.min(...xs)` – `reduce`. Komunikat błędu otwarcia po polsku, oddzielony od ścieżki; licznik plików w logu brany z trackera także przy błędzie listowania. Test w tests/fs z 130 tys. pustych nazw (bez plików na dysku – sama funkcja łącząca listy).

## B51. Szybki wpis: podwójne kliknięcie „Zapisz” (albo dwa razy Enter) dodaje tę samą operację dwa razy; zapisany szkic zostaje w oknie do następnego otwarcia

Priorytet: średni · obszar: proces główny i okna

Gdzie: `src/renderer/features/quick/QuickApp.tsx:85`, `src/renderer/features/quick/QuickApp.tsx:178`, `src/renderer/features/quick/QuickApp.tsx:204`, `src/renderer/features/quick/QuickApp.tsx:409`, `src/renderer/store/quickHost.ts:150`, `src/renderer/store/quickHost.ts:155`

**Co się dzieje.** Użytkownik wpisuje wydatek 45,99 zł i klika dwa razy „Zapisz” (albo wciska Enter dwa razy). Pierwsze kliknięcie: save() → busy=true → quickAdd. Główne okno dodaje operację i od razu odpowiada (kilka–kilkanaście ms), onQuickResult ustawia busy=false i dopiero po 450 ms zamyka okno. Szkic d nie jest czyszczony. Drugie kliknięcie (100–250 ms później) trafia we włączony przycisk z tym samym szkicem → druga quickAdd → quickTransaction nadaje nowe id → druga, identyczna operacja. Energia dnia i koperta pomniejszone podwójnie, bez ostrzeżenia. Ta sama przyczyna: po zamknięciu szkic zostaje w oknie, więc przy następnym Ctrl+Alt+B, zanim przyjdą świeże dane (55 ms przy 30 tys., do ≈1 s przy 150 tys. – patrz quickData), okno pokazuje poprzednią kwotę i „Zapisano.”, a Enter w tej chwili wysyła poprzedni szkic jeszcze raz. Powinno: po udanym zapisie szkic zablokowany i wyczyszczony do następnego otwarcia.

**Poprawka.** W onQuickResult przy r.ok nie zdejmować blokady: stan `done` (przycisk i Enter nieaktywne) aż do następnego onQuickData, a od razu po sukcesie setD(blank(data)), setLines([]), setShares({}). Do tego id operacji nadawać w oknie szybkiego wpisu (pole w QuickDraft), a w initQuickHost odrzucać szkic, którego id jest już w records.transactions (odpowiedź ok bez drugiego addRecord). Przy show() można też od razu wyczyścić okno, np. zdarzeniem „otwarcie” przed wysłaniem danych.

## B52. Wersja portable: AUMID = ścieżka tymczasowa zmieniająca się co wersję – wpisy autostartu się mnożą, wyłączenie nie działa, okno wyskakuje przy logowaniu, ustawienia powiadomień Windows się zerują

Priorytet: średni · obszar: proces główny i okna

Gdzie: `src/main/index.ts:43`, `src/main/tray.ts:106`, `src/main/index.ts:962`, `src/main/index.ts:946`, `electron-builder.cjs:31`

**Co się dzieje.** Portable z włączonym „Uruchamiaj z systemem”. AUMID wersji portable = process.execPath, czyli %TEMP%\<ksuid>\Financial Intel.exe, a ksuid electron-builder losuje przy każdym buildzie. setLoginItemSettings bez `name` nazywa wartość w HKCU\…\Run właśnie AUMID-em. Po aktualizacji start (applyLoginItem przy każdym uruchomieniu) dopisuje drugi wpis pod nową nazwą; stary zostaje. Efekty: (1) przy logowaniu aplikacja startuje dwa razy, druga instancja wywołuje second-instance → showMainWindow() – okno pokazuje się zamiast zostać w zasobniku (D46); (2) wyłączenie autostartu w Ustawieniach usuwa tylko wpis bieżącej wersji – aplikacja dalej startuje z Windows; z każdą aktualizacją wpisów przybywa; (3) ustawienia powiadomień Windows (wł./wył., priorytet, banery) są przypisane do AUMID, więc po każdej aktualizacji portable wracają do domyślnych i lista aplikacji w powiadomieniach rośnie.

**Poprawka.** Najpierw: stałe `name` w setLoginItemSettings (np. 'Financial Intel' dla instalatora i 'Financial Intel (portable)' dla portable) i jednorazowe sprzątanie przy starcie, czyli usunięcie z HKCU\…\Run wartości, których nazwa zaczyna się od %TEMP% i kończy na 'Financial Intel.exe' (przez setLoginItemSettings({openAtLogin:false, name: stara}) albo reg). W 'second-instance' sprawdzać argv i przy --hidden nie pokazywać okna. Stały AUMID dla portable (portable.unpackDirName albo własny identyfikator) dopiero po sprawdzeniu na Windows, że powiadomienia (toast) dalej się pokazują bez skrótu w Menu Start.

## B53. Ekran wyboru folderu dobiera przyciski po tekście komunikatu: „Utwórz w OneDrive (zalecane)” zakłada nowe dane w niedostępnym zapamiętanym folderze, „Utwórz dane tutaj” kręci się w kółko, brak przycisku podfolderu

Priorytet: średni · obszar: proces główny i okna

Gdzie: `src/renderer/features/setup/FolderSetup.tsx:35`, `src/renderer/features/setup/FolderSetup.tsx:57`, `src/renderer/features/setup/FolderSetup.tsx:63`, `src/renderer/features/setup/FolderSetup.tsx:72`, `src/main/index.ts:342`, `src/main/index.ts:354`, `src/main/index.ts:357`, `src/main/index.ts:364` …

**Co się dzieje.** (1) Zapamiętany folder %OneDrive%\FinancialIntel jest chwilowo nieobecny (OneDrive po ponownym połączeniu jeszcze go nie pobrał, dysk odłączony). Komunikat „Zapamiętany folder danych jest niedostępny…”, kod celowo ukrywa „Utwórz dane tutaj” („never gets new data: it would split the budget”), ale wyróżniony przycisk propozycji (ta sama ścieżka) dalej woła openDataDir(proposal.dir, true) → kind 'missing' + createIfEmpty → DataStore.initialize tworzy pusty fi.json w tym samym miejscu. Gdy OneDrive dociągnie prawdziwe dane, w folderze są dwa fi.json (kopia konfliktu) i mieszanka nowego (kreator startu) ze starym budżetem. 'missing' to przy tym także każdy błąd stat, nie tylko brak folderu. (2) Propozycja albo „Nowe dane gdzie indziej” trafia na istniejący folder FinancialIntel z innymi plikami → „…zawiera inne pliki – wybierz pusty folder.”; słowo „pusty” spełnia /pusty/, więc pojawia się akcentowany „Utwórz dane tutaj” → ten sam komunikat w kółko. (3) „Otwórz istniejące” na folderze bez fi.json → „Można utworzyć w nim podfolder „FinancialIntel”.” – ale przycisku nie ma. (4) Zapamiętany folder, który przy starcie jest pusty (OneDrive jeszcze nie zsynchronizował), dostaje „Utwórz dane tutaj” – wbrew komentarzowi o rozdzielaniu budżetu.

**Poprawka.** Zwracać z openFolder kod przyczyny w OpenFolderResult (np. `kind: 'missing' | 'empty' | 'other' | 'partial' | 'unavailable'`, `remembered: boolean`, `canCreate`, `suggestSubfolder`) i dobierać przyciski po nim, nie po tekście. Gdy zapamiętany folder jest niedostępny albo pusty, schować lub wyłączyć propozycję o tej samej ścieżce (porównanie ścieżek bez wielkości liter) i zostawić tylko „Spróbuj ponownie” i „Wskaż inny folder”. Dla 'other' dodać „Utwórz podfolder FinancialIntel”, a w pętli (2) nie pokazywać „Utwórz dane tutaj”. W main: inspect zwraca 'missing' tylko przy ENOENT (inne błędy oznaczają 'unavailable'), a openFolder z createIfEmpty odmawia utworzenia danych w ścieżce równej config.dataDir albo z recentDirs, gdy jest ona pusta lub nieobecna (chyba że użytkownik potwierdzi to wprost).

## B54. Okno zapamiętane na odłączonym monitorze otwiera się poza ekranem

Priorytet: średni · obszar: proces główny i okna

Gdzie: `src/main/index.ts:811`, `src/main/index.ts:859`, `src/main/config.ts:72`

**Co się dzieje.** Laptop z monitorem zewnętrznym: okno (niezmaksymalizowane) zamknięte na monitorze zewnętrznym → config.window = {x: 2200, y: 100, …}. Następny start bez monitora: BrowserWindow dostaje x/y spoza wszystkich ekranów i pokazuje się poza widokiem (widać tylko przycisk na pasku zadań). Pozycje nie są sprawdzane z screen.getAllDisplays().

**Poprawka.** Przed new BrowserWindow: `const b = saved && {x: saved.x, y: saved.y, width: saved.width, height: saved.height}`; jeśli żaden screen.getAllDisplays() nie ma workArea przecinającego się z b (np. co najmniej 100×50 px paska tytułu), pominąć x i y, żeby okno się wyśrodkowało, i ograniczyć width i height do workArea głównego ekranu. To samo zastosować dla okien odłączonych, jeśli zapamiętują położenie.

## B55. Opłata okresowa zapłacona przed terminem (miesiąc wcześniej albo przed dniem płatności): silnik zbiera ją z energii drugi raz, a odprawa, radar i Odkładki dalej ostrzegają

Priorytet: średni · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:108`, `src/shared/calc/fleet.ts:591`, `src/shared/calc/fleet.ts:621`, `src/shared/calc/fleet.ts:167`, `src/shared/calc/briefing.ts:162`, `src/shared/calc/briefing.ts:172`, `src/shared/calc/radar.ts:69`, `src/renderer/features/cargo/CargoPage.tsx:345` …

**Co się dzieje.** (a) OC 1 200 zł co 12 miesięcy, termin 2027-03 (dzień 1), budżet od 2026-04-01, pensja 4 000 zł. 1 marca 2027 wypada w poniedziałek, więc bank pobiera opłatę w piątek 26.02. W lutym płatność opróżnia zbiornik (1 100 zł ze zbiornika, 100 zł z energii, alarm sinking-short). 1 marca `sinkingInstallment` widzi miesiąc terminu przy pustym zbiorniku i dokłada cały brak: rata 1 200 zł, choć opłata jest już zapłacona. Energia marca to 2 800 zł zamiast 4 000 zł, przychodzą czerwone alarmy „energia wyczerpana”, a łupy są mniejsze. W kolejnym roku raty wynoszą 0, bo zbiornik jest „pełny”. 27.02 odprawa pokazuje żółte „Asteroida: OC za 2 dni – 1 200 zł, w zbiorniku 0 zł” i idzie powiadomienie. (b) OC z terminem 25.10 i pełnym zbiornikiem zapłacone 15.10. 16.10 odprawa nadal pisze „Asteroida: OC za 9 dni … w zbiorniku 0,00 zł”, od 22.10 na żółto i z powiadomieniem. Radar pokazuje „w zbiorniku 0”. Ładownia → Odkładki pisze „Za plan o 1 100,00 zł – kolejne raty będą większe”, choć silnik w listopadzie zaczyna cykl od zera. Dodatkowo „Za plan o” porównuje plan sprzed raty bieżącego miesiąca ze stanem po racie: przy kontenerze dodanym późno pokazuje 328,58 zł zamiast faktycznych 428,58 zł. Płatność w bieżącym cyklu (także do miesiąca przed terminem) powinna zamykać cykl: bez raty doganiającej i bez asteroidy do następnego terminu.

**Poprawka.** Bieżący cykl zamykać płatnością kontenera z oknem [dueMonth−1, dueMonth]. W silniku zapamiętać `paidCycle` kontenera, a w `sinkingInstallment` przyjmować expected = 0 (rata 0) do końca zapłaconego cyklu. `nextPaymentOf` w odprawie i radarze powinien dostawać datę ostatniej płatności (z log/txs containerId) i pomijać termin, który ją już ma. Panel Odkładki: liczyć brak jak silnik (plan łącznie z ratą bieżącego miesiąca), a po płatności w cyklu nie pokazywać braku. Test: płatność 26.02 przy terminie 01.03 i płatność 15.10 przy terminie 25.10.

## B56. Życie kontenera nie ma dat: nowy kontener okresowy zbiera raty wstecz z minionych miesięcy, archiwizacja przelicza całą historię, a resztka zbiornika po `until` zostaje na zawsze

Priorytet: średni · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:177`, `src/shared/calc/fleet.ts:591`, `src/shared/calc/fleet.ts:935`, `src/renderer/features/cargo/actions.ts:15`, `src/renderer/features/cargo/actions.ts:40`, `docs/decyzje.md:305`

**Co się dzieje.** (a) Budżet od 2026-04. W październiku użytkownik dodaje kontener OC 1 200 zł rocznie z terminem 2027-03. emptyDraft i draftFromPayment zostawiają `from = null`, więc silnik uznaje kontener za aktywny od startu budżetu i pobiera raty z energii kwietnia–września. Łupy minionych miesięcy maleją, decyzja z 3.10 o 60 zł łupów wrześniowych na cel przestaje działać (łupy 0, cel nie dostaje nic), a w minionych miesiącach pojawiają się czerwone alarmy „energia wyczerpana” i „pensja z kadłuba”. Debriefingi minionych miesięcy zmieniają kwoty po fakcie. T29 przewiduje dla opłaty dodanej późno raty doganiające od teraz – z `from` = 2026-10 zbiornik ma 200 zł zamiast 700 zł zebranych wstecz. (b) Archiwizacja („zrzut”) kontenera okresowego działa tak samo wstecz: `activeIn` sprawdza `!c.archived` dla każdego miesiąca, więc minione płatności idą z energii swoich miesięcy z alarmami sinking-short. (c) Opłata 1 200 zł z `until` 2026-12 zapłacona w kwocie 1 100 zł zostawia w zbiorniku 100 zł. Kontener nie jest już aktywny, więc nic tej resztki nie zdejmuje: wisi w „Odkładkach” na zawsze z mylącym terminem 2027-12, 2028-12… i zaniża osłony, „wolne do decyzji” i zasięg.

**Poprawka.** W `emptyDraft`/`draftFromPayment` ustawiać `from` = bieżący miesiąc, gdy budżet już działa. Kreator startu może zostawić null albo miesiąc startu. Archiwizację zapisywać z datą (`archivedAt`, albo `until` = bieżący miesiąc przy włączeniu przełącznika), a w `activeIn` i w gałęzi płatności periodic liczyć ją od tego miesiąca. Po ostatnim miesiącu życia kontenera (until/archiwizacja) przenieść resztkę zbiornika do osłon zdarzeniem w logu.

## B57. Operacja „Pożyczka” bez rekordu pożyczki traktowana jak pożyczka udzielona: pożyczone pieniądze dokują jak przychód, ich zwrot tworzy fikcyjną należność

Priorytet: średni · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:695`, `src/shared/calc/fleet.ts:710`, `src/shared/calc/fleet.ts:718`, `src/shared/calc/fleet.ts:867`, `src/renderer/features/operations/OperationEditor.tsx:284`, `src/renderer/features/import/options.ts:25`

**Co się dzieje.** (a) Użytkownik pożycza 2 000 zł od znajomego i wpisuje operację „Pożyczka / otrzymuję”. Edytor domyślnie ustawia „— bez pożyczki z radaru —”, więc loanId = null. Silnik wchodzi w gałąź pożyczki udzielonej z `owed = 0`, więc całe 2 000 zł dokują jak dostawa: przy pełnych osłonach i kadłubie trafiają do celu „Wakacje”. T31 mówi, że pożyczka wzięta zmienia tylko osłony. Spłata tych 2 000 zł (−2 000) liczy się jako udzielenie pożyczki: receivables.loans['-'] = 2 000 zł, czyli należność, której nie ma, a cel zostaje z pożyczonymi pieniędzmi. (b) Pożyczka udzielona z Radaru (1 000 zł, rekord i operacja z loanId), a zwrot przychodzi importem z mBanku jako „Zwrot pożyczki” bez loanId. Należność z rekordu się nie zmniejsza (dalej 1 000 zł, odprawa i powiadomienie „spłata spóźniona”), a 1 000 zł dokuje jak przychód.

**Poprawka.** Dodatnią operację „Pożyczka” bez rekordu traktować neutralnie: tylko osłony, bez dokowania, z ostrzeżeniem „przypisz pożyczkę z Radaru”. Ujemną bez rekordu też nie liczyć jako należność '-', dopóki nie wiadomo, czy to udzielenie, czy spłata wziętej, albo pytać o kierunek. Przy spłacie bez loanId i jednej otwartej pożyczce udzielonej powiązać ją (albo podpowiedzieć). W imporcie dodać wybór pożyczki z Radaru dla opcji „Pożyczka udzielona” / „Zwrot pożyczki”.

## B58. Płatności powiązane z usuniętym kontenerem znikają z kopert i dziennego przydziału, choć silnik dalej pobiera je z energii

Priorytet: średni · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:608`, `src/shared/calc/fleet.ts:878`, `src/shared/calc/plan.ts:297`, `src/shared/calc/plan.ts:75`, `src/renderer/features/cargo/actions.ts:82`

**Co się dzieje.** Użytkownik dodaje kontener dla odbiorcy, np. sklepu z codziennymi zakupami (choćby przez pomyłkę z propozycji stałych opłat). `linkPayments` ustawia containerId na wszystkich płatnościach tego odbiorcy od 1. dnia miesiąca startu. Potem usuwa kontener („Usuń kontener”), a płatności zostają z containerId nieistniejącego kontenera. Silnik go nie znajduje, więc traktuje je jak zwykłe wydatki z energii. Koperty i przydział (fleet.ts:878 `|| t.containerId`) pomijają je jednak w całości: koperta „Jedzenie” pokazuje 0 wydane, a energia dziś jest zawyżona. Debriefing liczy je jako ładownię, propozycje kopert też je pomijają (paysContainer), a gra ocenia dni po zawyżonym przydziale.

**Poprawka.** Przy usuwaniu kontenera zdejmować `containerId` z jego płatności jednym `replaceRecords` („Cofnij” przywraca kontener i powiązania). Do tego wspólna funkcja „opłata ładowni” = `containerId` istniejącego kontenera, używana w silniku, kopertach, debriefingu, propozycjach, grze i `unlinkedPayments`.

## B59. Zapisany podział dokowania (split) stosowany w kwotach bezwzględnych także po zmianie kwoty operacji – osłony spadają o różnicę

Priorytet: średni · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:508`, `src/shared/calc/fleet.ts:653`, `src/shared/calc/fleet.ts:661`, `src/renderer/features/dock/actions.ts:42`

**Co się dzieje.** Wypłata z ICTTJ 5 000 zł zadokowana na Portfelu XTB z podziałem zmienionym w oknie: kadłub 3 000, cel 2 000. Potem kwota operacji zostaje poprawiona na 4 000 zł (błędny wpis w ICTTJ, oznaczenie „mismatch”, albo wiersz banku rozliczył się na inną kwotę). `applySplit(4000, split)` nadal daje kadłubowi +3 000 i celowi +2 000, a brakujące 1 000 zł odejmuje od osłon. Dostawa 4 000 zł daje warstwom 5 000 zł, a osłony dopłacają 1 000 zł spoza dostawy. Ten sam mechanizm działa przy wpływie z podziałem i częścią domownika (fleet.ts:653 – split przykładany do reszty po częściach osób). Nic tego nie sygnalizuje, bo suma warstw się zgadza.

**Poprawka.** W `applySplit` ograniczać części do dostępnej kwoty: kolejno kadłub, cele, rezerwa, każda min(rest, część), reszta (≥ 0) do osłon. Albo przy |v| ≠ suma splitu skalować proporcjonalnie. W Dostawach oznaczać dokowanie, którego split nie zgadza się z kwotą operacji („podział do poprawienia”), a okno przy ponownym otwarciu liczyć od kwoty operacji.

## B60. Konto z saldem otwarcia na 1. dzień miesiąca (dodane po starcie): pensja płacona przed jego pieniędzmi – pensja częściowa i za mało energii na cały miesiąc

Priorytet: średni · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:757`, `src/shared/calc/fleet.ts:760`, `src/shared/calc/fleet.ts:788`, `src/renderer/features/settings/AccountsTab.tsx:107`, `docs/decyzje.md:291`

**Co się dzieje.** Budżet od 15.09, w mBanku 4 500 zł, pensja 4 000 zł. 5.10 użytkownik dodaje w Ustawienia → Konta Portfel XTB z saldem otwarcia 20 000 zł na 01.10 („saldo na początek miesiąca”). Saldo otwarcia jest na początek swojego dnia (T25), ale zdarzenie konta ma slot 1, a pensja 1. dnia slot 0. Pensja płaci się więc z osłon, w których jest 500 zł: czerwony alarm „Pensja częściowa: brakuje 3 500,00 zł – osłony i kadłub puste”, energia października 500 zł. Dopiero potem 20 000 zł wpływa do osłon. Przez cały miesiąc każdy zakup daje „energia wyczerpana”, choć pieniądze są na koncie, a pensja nie jest dopłacana. Powinno: konto otwarte na początek dnia wpływa do osłon przed pensją tego dnia.

**Poprawka.** Zdarzenie otwarcia konta dawać przed zdarzeniem miesiąca, np. `at(o.date, 0, '0a')`: „0a” sortuje się po starcie „0” i przed miesiącem „1”. Podobnie można potraktować dzień rozliczeń domowników, jeśli ma dotyczyć początku dnia. Test: konto otwarte 1. dnia miesiąca, pensja z osłon bez alarmu.

## B61. Ctrl+$ nie maskuje notatek Radaru („w zbiorniku …”) ani otwartego okna szybkiego wpisu

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, proces główny i okna

Gdzie: `src/renderer/features/radar/RadarPage.tsx:40-44`, `src/shared/calc/radar.ts:72`, `src/renderer/features/quick/QuickApp.tsx:90`, `src/renderer/features/quick/QuickApp.tsx:103-104`, `src/renderer/features/bridge/BridgePage.tsx:314`, `src/renderer/app/App.tsx:249`, `src/renderer/features/radar/RadarPage.tsx:40`, `src/renderer/features/bridge/BridgePage.tsx:299` …

**Co się dzieje.** Radar jest otwarty, notatka asteroidy brzmi „w zbiorniku 1 033,30 zł”. Ktoś podchodzi, użytkownik naciska Ctrl+$. Kolumna kwot zamienia się w „••• zł”, ale notatka dalej pokazuje prawdziwą kwotę – do następnej minuty, bo lista `items` jest w useMemo z zależnościami [fleet, plans, containers], a fleet to ten sam obiekt do końca minuty. W drugą stronę: po odkryciu kwot notatka zostaje „•••”. W otwartym oknie szybkiego wpisu Ctrl+$ zmienia tylko flagę modułu (onMachinePrefs → setAmountsHidden) bez ponownego renderu, a `money` korzysta z data.hideAmounts zapamiętanego przy otwarciu. Energia i podgląd zostają odkryte do zamknięcia okna (T55).

**Poprawka.** RadarPage: dodać do zależności useMemo const hidden = useMachine((s) => s.prefs.hideAmounts), jak w useBriefingItems. QuickApp: w onMachinePrefs dodatkowo setData((d) => d && { ...d, hideAmounts: p.hideAmounts }) (albo osobny stan hide), żeby money i podgląd przeliczyły się od razu.

To samo zgłoszone też jako: „Radar: kwota „w zbiorniku” w notatce asteroidy nie maskuje się po Ctrl+$ (do minuty)”; „Ukrycie kwot (Ctrl+$) w otwartym szybkim wpisie zmienia się tylko częściowo; inne zapisy maski”; „Ukrycie kwot zostawia znak „+/−” i kolor przy części kwot (FVG, przychód wobec pensji)”.

## B62. Data decyzji o łupach w debriefingu pokazana w UTC, a nie w czasie warszawskim

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/month/MonthPage.tsx:328`, `src/renderer/features/month/actions.ts:57`, `src/shared/calc/fleet.ts:816-818`

**Co się dzieje.** Decyzja o łupach za październik zapada 1.11 o 00:30 czasu warszawskiego (decidedAt = '2026-10-31T23:30:00.000Z'). Panel pokazuje „Decyzja z 31.10.2026”, czyli dzień, w którym decyzji nie dało się jeszcze podjąć. Silnik liczy ją poprawnie po dacie warszawskiej (warsawStamp).

**Poprawka.** MonthPage.tsx:328: plDate(warsawNow(decision.decidedAt).date) albo plDate(warsawStamp(decision.decidedAt).slice(0, 10)), czyli ta sama data co w silniku.

To samo zgłoszone też jako: „Debriefing: data decyzji o łupach w UTC, nie w czasie warszawskim”.

## B63. Panel kontenera: podpowiedź „Najbliższa” płatność pokazuje datę z przeszłości

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/cargo/CargoPage.tsx:35-38`, `src/renderer/features/cargo/CargoPage.tsx:158`, `src/renderer/features/cargo/CargoPage.tsx:188`, `src/renderer/features/cargo/actions.ts:25-37`, `src/renderer/features/cargo/actions.ts:32`

**Co się dzieje.** Propozycja z historii „OC co rok” (ostatnia płatność 05.11.2025) → „Do ładowni”. draftFromPayment ustawia dueMonth = '2025-11', a podpowiedź pola Płatność pokazuje „Najbliższa: 05.11.2025”. To samo dzieje się dla każdego kontenera sprzed roku: nextPayment(c, c.dueMonth) zawsze zwraca datę z dueMonth zamiast liczyć od dziś. Radar i odprawa podają w tym czasie 05.11.2026.

**Poprawka.** CargoPage.tsx:158: const next = nextPaymentOf(c, warsawNow().date) (z @shared/calc/fleet) i usunięcie lokalnej nextPayment. Radar i odprawa używają tej samej funkcji.

To samo zgłoszone też jako: „Ładownia: podpowiedź „Najbliższa płatność” pokazuje datę z przeszłości (miesiąc kotwicy zamiast następnego terminu)”.

## B64. Ctrl+N („nowa operacja”) jest opisany jako skrót ogólny (ściągawka, paleta, podpowiedź na Mostku), a działa tylko na ekranie Operacje

Priorytet: niski · obszar: całość, Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/app/ShortcutsHelp.tsx:13`, `src/renderer/app/App.tsx:74-118`, `src/renderer/features/operations/OperationsPage.tsx:351-355`, `src/renderer/features/bridge/BridgePage.tsx:155`, `src/renderer/features/palette/CommandPalette.tsx:39`, `src/renderer/app/App.tsx:74`, `src/renderer/features/operations/OperationsPage.tsx:351`

**Co się dzieje.** Na Mostku przycisk ma podpowiedź „Nowa operacja (Ctrl+N)”. Ściągawka (? / F1) wymienia Ctrl N w grupie „Ogólne”, a paleta pokazuje przy akcji „Ctrl N”. Naciśnięcie Ctrl+N na Mostku, w Planie miesiąca, na Radarze czy w Raportach nic nie robi. Skrót działa tylko na otwartym ekranie Operacje.

**Poprawka.** Dodać w useGlobalHotkeys gałąź k === 'n' && !e.shiftKey: pominąć, gdy otwarta jest paleta albo dialog (document.querySelector('[role="dialog"]'), jak w OperationsPage), potem preventDefault i newOperation(), które samo przechodzi do Operacji. Usunąć duplikat z OperationsPage.tsx:351-355, żeby nie tworzyć dwóch szkiców.

To samo zgłoszone też jako: „Ctrl+N podawany jako skrót ogólny, ale działa tylko na ekranie Operacje”.

## B65. Raport wachty w ostatni dzień miesiąca planuje koperty „na 1 dni”, choć jutro koperty startują od nowa

Priorytet: niski · obszar: całość, gra, Wywiad, raporty

Gdzie: `src/shared/calc/intel.ts:284-291`, `src/renderer/features/reports/ReportsPage.tsx:118`, `src/renderer/features/reports/ReportsPage.tsx:182`, `src/shared/calc/intel.ts:280-291`, `src/shared/calc/intel.ts:285`, `src/shared/calc/intel.ts:289`, `src/renderer/features/reports/ReportsPage.tsx:179-184`

**Co się dzieje.** Niedziela 31 sierpnia, 18:00 – raport wachty. daysBetween(today, lastDay) = 0, Math.max(1, 0) = 1, więc days = 1. „Koperty na następny tydzień” pokazują „Jedzenie: 240 zł na 1 dni (zostało 240 zł)”. Jutro jest 1 września i koperty sierpnia już nie obowiązują, więc plan na tydzień powinien być pusty albo z kopert września.

**Poprawka.** const daysLeft = daysBetween(today, lastDayOf(monthOf(today))); if (daysLeft <= 0) return []. Panel z next.length > 0 i tak się wtedy nie pokaże. Ewentualnie pokazać koperty planu następnego miesiąca (planFor). Dzielnik zostaje daysLeft > 0.

To samo zgłoszone też jako: „„Koperty na następne dni” w ostatnim dniu miesiąca: cała reszta „na 1 dni”, choć nazajutrz koperty startują od nowa”.

## B66. „Cofnij” zbiorczej kategorii albo finansującego przywraca całe stare rekordy i nadpisuje późniejsze zmiany

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/state.ts:92-115`, `src/renderer/features/operations/state.ts:131-142`, `src/renderer/features/operations/state.ts:90`, `src/renderer/features/operations/state.ts:106`, `src/renderer/features/operations/state.ts:141`

**Co się dzieje.** Użytkownik ustawia kategorię 20 zaznaczonym operacjom. W ciągu 7 s poprawia w edytorze kwotę jednej z nich (albo z drugiego komputera dochodzi zmiana notatki) i klika „Cofnij” w toaście. replaceRecords('transactions', before) wstawia pełne kopie sprzed zmiany kategorii, więc poprawiona kwota i notatka wracają do starych wartości bez pytania. Przywrócenie reguł importu (rulesBefore) w ten sam sposób kasuje reguły dodane w międzyczasie.

**Poprawka.** W undo dla każdego t z before: aktualny = useData.getState().records.transactions[t.id]?.record; jeśli jest, replaceRecords z { ...aktualny, categoryId: t.categoryId } (w financeTicked: { ...aktualny, refundable: t.refundable, memberId: t.memberId }), i tylko gdy pole nadal ma wartość ustawioną akcją. Reguły: usunąć tylko te dodane lub zmienione przez akcję (po kluczu) zamiast podmieniać całą listę.

To samo zgłoszone też jako: „„Cofnij” po masowej zmianie kategorii lub finansującego przywraca całe stare rekordy i nadpisuje późniejsze edycje”.

## B67. Pojedyncze pliki z nowszej wersji (np. w trakcie synchronizacji OneDrive): edytory poza Operacjami po cichu gubią zmiany, usunięcie znika z ekranu, a plik gry, którego ta wersja nie odczyta, daje stały „błąd zapisu”

Priorytet: niski – do potwierdzenia (jeden z dwóch weryfikatorów nie odtworzył) · obszar: całość

Gdzie: `src/renderer/store/data.ts:489`, `src/renderer/store/data.ts:531`, `src/renderer/store/data.ts:559-573`, `src/renderer/features/operations/OperationEditor.tsx:85`, `src/renderer/features/cargo/CargoPage.tsx:271`, `src/renderer/features/cargo/CargoPage.tsx:284`, `src/renderer/features/starmap/StarMapPage.tsx:210`, `src/renderer/features/month/actions.ts:24-38` …

**Co się dzieje.** Komputer A z nowszą wersją zapisał kontener, cel, plan miesiąca albo pożyczkę w nowszym formacie, a fi.json jeszcze nie dotarł przez OneDrive, więc folder na komputerze B nie jest tylko do odczytu, a te wpisy mają entry.readOnly. Edytor operacji poprawnie je blokuje. Edytor kontenera, Mapa gwiezdna, Plan miesiąca i Radar przyjmują zmiany: updateRecord po cichu nic nie robi, pole wraca do starej wartości, nie ma komunikatu. „Usuń kontener” / „usuń” pożyczki zdejmuje wpis z pamięci, a main rzuca ReadOnlyError, którego nikt nie łapie, więc wpis znika z ekranu do restartu. „Ustaw kategorię” liczy w toaście („5 operacji”) także te, które replaceRecords pominął. Gdy plik game/RRRR-MM.json jest w formacie, którego ta wersja nie odczyta (problem 'too-new', nie ma go w records), useGameAdvance co minutę uznaje miesiąc za brakujący: addRecords, potem updateRecord, saveRecord → setAsideProblem rzuca. Pasek zapisu stale pokazuje „błąd zapisu – ponów”, zamknięcie okna pyta o niezapisane zmiany, a Dowództwo pokazuje dni zamrożone tutaj zamiast tych z pliku. Tak samo editPlan dla miesiąca, którego plik jest 'too-new'.

**Poprawka.** Bez zmian co do kierunku. Dodatkowo:
- deleteRecord w rendererze ma sprawdzić entry.readOnly przed usunięciem z pamięci, a przy błędzie api.deleteRecord przywrócić wpis i pokazać toast. deleteWithUndo i deleteLoan mają łapać błąd.
- Edytory (kontener, cel, plan, pożyczka) wyłączają pola przy entry.readOnly, jak OperationEditor.
- W runSave ReadOnlyError nie powinien wracać do ponawiania: wpis zostaje w pamięci z komunikatem „zapisała nowsza wersja”, bez pętli prób.
- Gra i editPlan nie tworzą rekordu na ścieżce zajętej przez problem 'too-new'. Do tego wystarczy, żeby main przekazywał listę takich ścieżek, albo żeby gra zapisywała przez saveGenerated, które już pomija 'too-new' (store.ts:867-870).

## B68. Pole kwoty przyjmuje po cichu więcej niż 2 miejsca po przecinku – „1.200” to 1,20 zł

Priorytet: niski · obszar: całość, Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/lib/format.ts:101-107`, `src/renderer/components/fields.tsx:52-58`

**Co się dzieje.** Użytkownik wpisuje pensję, kopertę, ratę albo wydatek z kropką jako separatorem tysięcy, tak jak na metkach czy w części wyciągów: „1.200”. AmountField zapisuje 1,20 zł bez komunikatu, czyli 1000× mniej. Na ekranie widać potem „1,20”, ale przy szybkim wpisie (okno zamyka się po zapisie) albo w kopercie łatwo to przeoczyć. „1.299,00” jest odrzucane z komunikatem, a „1.200” nie.

**Poprawka.** Odrzucać więcej niż 2 cyfry po separatorze dziesiętnym z komunikatem „Nieprawidłowa kwota – zostaje poprzednia”. Najprostsze: regex `^[-+]?(\d+([.]\d{0,2})?|[.]\d{1,2})$` po zamianie przecinka. Nie zgadywać separatora tysięcy: kropka z 3 cyframi jest niejednoznaczna, więc lepiej ją odrzucić niż czytać jako 1200.

To samo zgłoszone też jako: „Pole kwoty przyjmuje więcej niż 2 miejsca po przecinku i po cichu zaokrągla – „1.234” to 1,23 zł”.

## B69. Wpływ na Portfel XTB wpisany szybkim wpisem (rodzaj „wpływ”) nie jest parą wypłaty ICTTJ – „Portfel XTB?” tworzy drugą operację, pula przepada

Priorytet: niski – do potwierdzenia (jeden z dwóch weryfikatorów nie odtworzył) · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/dock.ts:88`, `src/renderer/store/quickHost.ts:127`, `src/renderer/features/quick/QuickApp.tsx:238`

**Co się dzieje.** Według specyfikacji Portfel XTB ma dane „tylko z szybkiego wpisu”. Użytkownik wypłaca 800 zł z konta tradingowego na Portfel XTB, wpisuje to w ICTTJ (pula Podatek), a potem odruchowo także w szybkim wpisie FI: „Wpływ”, konto Portfel XTB, od XTB. Szybki wpis zna tylko wydatek, wpływ i zakup za domownika, więc zapisuje rodzaj 'income'. `deliveries` paruje wpisy wyłącznie z operacjami 'trading', więc wpis po 3 dniach roboczych dostaje „Portfel XTB?”. „Zadokuj na Portfelu XTB” tworzy drugą operację: saldo Portfela 1 600 zł zamiast 800 zł, a pula Podatek działa tylko na operację-duplikat (pierwsze 800 zł zadokowało do osłon). Nic tego nie wykrywa.

**Poprawka.** W `deliveries` brać jako kandydatów na parę także wolne wpływy `income` na koncie XTB_WALLET_ACCOUNT_ID z tą samą kwotą w oknie. Przy „Zadokuj” zmieniać im rodzaj na 'trading' zamiast tworzyć nową operację. W oknie wariantu Portfela pokazywać „Na Portfelu jest już wpływ X zł z dnia … – połącz”. Opcjonalnie w szybkim wpisie na koncie Portfel XTB z kontrahentem XTB podpowiadać czekające wpisy ICTTJ.

## B70. Pula Podatek z podziałem zmienionym w oknie: silnik dokuje część do budżetu, a przychody liczą całość jako podatek

Priorytet: niski · obszar: domownicy i ICTTJ, silnik budżetu

Gdzie: `src/shared/calc/income.ts:44`, `src/shared/calc/fleet.ts:661`, `src/renderer/features/dock/DockingDialog.tsx:185`

**Co się dzieje.** Wypłata 1 000 zł z puli Podatek. W oknie dokowania (pole „Podatek” jest widoczne przy puli tax) użytkownik zmniejsza podatek do 400 zł albo 600 zł, a reszta trafia do osłon. Silnik bierze najpierw `split` (fleet.ts:661): rezerwa = wpisana kwota, osłony + reszta. `taxOfDockings` przy `pool === 'tax'` uznaje za podatek całe 1 000 zł, więc przychód z tradingu = 0 (panel „Przychody”, średnia silnika, raporty), choć część weszła do budżetu.

**Poprawka.** W taxOfDockings (src/shared/calc/income.ts:44) zachować kolejność silnika: `const v = d.split ? d.split.taxHold : d.pool === 'tax' ? Math.abs(t.amount) : 0`. Zwroty (kwota < 0) nie dostają `split` (dockDelivery przekazuje null dla 'out'), więc ich obsługa się nie zmienia. Do tego test: pula tax ze `split.taxHold` < kwoty → trading = kwota − split.taxHold.

To samo zgłoszone też jako: „Dostawa z pulą Podatek i zmienionym podziałem: statystyki przychodów traktują całą kwotę jako podatek, silnik tylko część”.

## B71. Ten sam id wpisu ICTTJ w dwóch plikach (wpis przeniesiony zmianą daty, OneDrive w trakcie) daje dwie dostawy o tym samym kluczu

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/main/ictj/reader.ts:47`, `src/main/ictj/reader.ts:69`, `src/shared/calc/dock.ts:99`, `src/renderer/features/dock/DockPanel.tsx:42`

**Co się dzieje.** Na innym komputerze zmieniono w ICTTJ datę wypłaty. ICTTJ przenosi plik (jego `findMoved` istnieje właśnie dlatego, że OneDrive przynosi takie zmiany w różnej kolejności), więc przez chwilę w folderze leżą stary i nowy plik z tym samym `id`. Reader nie odrzuca duplikatów id. Jedna kopia paruje się z wpływem, druga dostaje stan „pending” z `wallet: true`. Notatka „Portfel XTB?” może skłonić do zadokowania drugiej kopii, co tworzy operację na Portfelu XTB i dubluje kwotę. W DockPanel są do tego dwa wiersze z tym samym `key` (ostrzeżenie Reacta, mylące wiersze).

**Poprawka.** W `readIctjFolder` po zebraniu wpisów zostawiać jeden na `id`, tą samą regułą co `buildViews` w ICTTJ: nowszy `updatedAt` (null traktować jak ''), przy remisie plik o mniejszej ścieżce względnej. Do `warnings` dopisać „Wpis ICTTJ w dwóch plikach (konflikt do rozstrzygnięcia w ICTTJ → Synchronizacja) – FI bierze nowszy: payouts/…”. Rozstrzygnięcie po dacie w nazwie pliku nic nie da, bo w kanonicznej kopii data w nazwie zawsze zgadza się z datą w rekordzie.

## B72. Szybka zmiana folderu ICTTJ: odpowiedź starszego odczytu nadpisuje w oknie migawkę bieżącego folderu

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/main/ictj/source.ts:67`, `src/main/index.ts:682`, `src/renderer/store/ictj.ts:28`

**Co się dzieje.** Użytkownik wybiera folder A (wolny, OneDrive pobiera pliki), a zaraz potem folder B. `refresh()` dla A kończy się po B i nic nie publikuje (`if (this.dir !== dir) return snap`), ale zwraca migawkę A jako wynik IPC `ictjSetDir(A)`, a renderer robi `useIctj.setState({ snap })`. Okno pokazuje wtedy wypłaty i scenariusze z A, a proces główny czyta B. `useIctjGoalSync` synchronizuje cele według A. Następna publikacja przyjdzie dopiero przy zmianie w B, bo sygnatura B się nie zmieniła.

**Poprawka.** Najprościej w rendererze: w `setIctjDir` licznik żądań (`const my = ++seq; const snap = await api.ictjSetDir(dir); if (my !== seq) return true;`), czyli stan i toast tylko z ostatniego żądania. Uzupełniająco w `refresh()`: dla folderu, który przestał być wybrany, zwracać `this.snap` zamiast migawki tego folderu. Gdy odczyt nowego folderu jeszcze trwa, okno i tak dostanie jego migawkę zdarzeniem `fi:ictj`.

## B73. Odczyt ICTTJ połyka błędy listowania folderów: status „czytany” bez wpisów i bez ostrzeżenia

Priorytet: niski – do potwierdzenia (jeden z dwóch weryfikatorów nie odtworzył) · obszar: domownicy i ICTTJ

Gdzie: `src/main/ictj/reader.ts:28`, `src/main/ictj/reader.ts:41`, `src/main/ictj/reader.ts:55`, `src/main/ictj/reader.ts:70`

**Co się dzieje.** `names()` zamienia każdy błąd `readdir` (nie tylko ENOENT, także EPERM / EBUSY / EACCES, np. OneDrive w trakcie synchronizacji katalogu, brak uprawnień) na pustą listę. Folder `payouts/` albo jeden rok, którego nie da się przeczytać, daje więc status 'ok' bez tych wpisów i bez ostrzeżenia. Dostawy znikają, wpływy z XTB pokazują się jako „bez wpisu w ICTTJ – dopisz wypłatę”, a w Ustawieniach → ICTTJ widać „czytany, Wypłaty: 0”. Ścieżka `status: 'error'` praktycznie nie występuje.

**Poprawka.** W `names()` zwracać pustą listę tylko przy ENOENT, tak jak `walkFiles` w src/main/datastore/fsutil.ts:22. Inny błąd listowania `payouts/` albo `payouts/RRRR` powinien dawać `status: 'error'` z komunikatem „nie udało się odczytać payouts/RRRR: <kod>”. Wtedy `useDeliveries` ma `ictjOn` = false i nie oznacza wpływów jako „bez wpisu”, a DockPanel pokazuje stan folderu. Ewentualnie w `IctjSource` zostawiać poprzednią dobrą migawkę z ostrzeżeniem, żeby jednorazowy błąd nie przełączał stanu. Błąd przy `forecasts/` wystarczy dopisać do ostrzeżeń.

## B74. Notatka i dziennik kapitański operacji bez limitu długości – po wklejeniu długiego tekstu operacja przestaje się zapisywać

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/OperationEditor.tsx:315-321`, `src/renderer/features/operations/OperationEditor.tsx:326`, `src/shared/schema/records.ts:108`, `src/shared/schema/records.ts:112`, `src/renderer/components/ui.tsx:164`, `src/main/datastore/store.ts:823`

**Co się dzieje.** Notatka operacji to TextArea bez maxLength, a schemat ma max 5000 znaków (dziennik kapitański: 2000). Po wklejeniu dłuższego tekstu (np. treści paragonu z e-maila) zapis w main kończy się „Niepoprawne dane: note…”, a renderer ponawia go co 2…60 s. Do czasu skrócenia notatki żadna zmiana tej operacji (kwota, kategoria) nie trafia na dysk. Przy zamknięciu okna pojawia się pytanie o niezapisane zmiany.

**Poprawka.** Dodać `maxLength?: number` do propsów TextArea (src/renderer/components/ui.tsx) i ustawić maxLength={5000} na notatce oraz {2000} na dzienniku kapitańskim w OperationEditor (to samo w innych TextArea zapisujących pola z limitem w schemacie, np. w szybkim wpisie). Ewentualnie przycinać tekst przy wklejeniu i pokazać komunikat.

## B75. Kreator: zaznaczenie albo odznaczenie kontenera z historii kasuje ręcznie wpisane koperty

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/wizard/WizardPage.tsx:171`, `src/renderer/features/wizard/WizardPage.tsx:175`, `src/renderer/features/wizard/WizardPage.tsx:73`

**Co się dzieje.** Krok 4 kreatora: użytkownik wpisuje koperty (np. Jedzenie 900 zł, Rozrywka 200 zł), a potem zaznacza albo odznacza propozycję ładowni (czynsz). onChange robi patchWizard({ cargo, envelopes: null }), więc wszystkie wpisane koperty po cichu wracają do propozycji ze średnich. Bez ostrzeżenia trafiają potem do planu pierwszego miesiąca. Reguła aplikacji: zmiany nie giną bez pytania.

**Poprawka.** Trzymać w stanie kreatora zbiór kopert zmienionych ręcznie (np. `editedEnvelopes`). Przy zmianie ładowni przeliczać tylko pozostałe: `envelopes = {...propozycje, ...wpisane ręcznie}`. Ewentualnie przy zmianie ładowni zostawiać `w.envelopes`, gdy coś wpisano, i pokazać toast „Propozycje kopert zmieniły się – Przelicz”.

## B76. Podział paragonu: reszta bez znaku – „do ostatniej części” przy nadmiarze odwraca znak części, „nierozdzielone” także przy nadmiarze, a niedobór trafia do ukrytej kategorii

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/OperationEditor.tsx:374`, `src/renderer/features/operations/OperationEditor.tsx:380`, `src/renderer/features/operations/OperationEditor.tsx:405-416`, `src/shared/calc/operations.ts:28-29`, `src/shared/operationsView.ts:88`

**Co się dzieje.** (1) Zakup −100 zł podzielony na −120 zł (kategoria A) i −10 zł (kategoria B), czyli rozdzielono za dużo. Edytor pisze „nierozdzielone: 20,00 zł”, choć części przekraczają kwotę (Plan miesiąca w podobnej sytuacji pisze „przekracza … o”). „do ostatniej części” dodaje rest = +20, więc część B ma +10 zł (zwrot towaru w zakupie). Pole pokazuje |+10| = „10,00”, a komunikat „części sumują się do kwoty”, choć widoczne części dają 130 zł. Kategoria A dostaje koszt 120 zł, a B koszt −10 zł, więc koperty i debriefing liczą złe kwoty. (2) Paragon −100 zł z częścią −60 zł: edytor pokazuje „nierozdzielone”. Silnik i debriefing liczą resztę 40 zł w dawnej kategorii operacji (categoryId zostaje po „Podziel paragon” i w trybie podziału jest niewidoczne). Filtr Kategoria tej reszty nie widzi, bo patrzy tylko na części. Sonda: debriefing Jedzenie 40 zł, filtr „Jedzenie” – false.

**Poprawka.** (1) Rozróżnić „nierozdzielone: X zł” (rest ma znak kwoty) i „części przekraczają kwotę o X zł” (rest ma znak przeciwny). (2) „do ostatniej części” pokazywać tylko wtedy, gdy wynik ma znak kwoty (Math.sign(last + rest) !== -sign), w innym razie komunikat. (3) Niedobór: pokazać, gdzie trafia („reszta: Jedzenie”), albo przy „Podziel paragon” wyzerować `categoryId`, `refundable` i `memberId` rodzica, żeby reszta była „bez kategorii” i liczyła się do energii dnia. Filtr kategorii liczyć z partsOf(t).

## B77. Nowa operacja przy filtrze okresu „od–do” znika z listy po pierwszej zmianie

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/state.ts:183`, `src/renderer/features/operations/state.ts:185`, `src/renderer/features/operations/OperationsPage.tsx:333`

**Co się dzieje.** Lista ma okres „od 2026-01-01 do 2026-03-31”. Ctrl+N tworzy szkic z dzisiejszą datą, widoczny tylko dlatego, że jest szkicem (`drafts[t.id] ||`). newOperation przestawia okres tylko dla rodzaju 'month'. Po wpisaniu kwoty szkic staje się zwykłym rekordem, przestaje pasować do zakresu i znika z listy (edytor dalej go pokazuje). Komentarz obiecuje: „A new entry is always visible: its month, without filters that could hide it”.

**Poprawka.** W newOperation zamienić warunek na `if (!inPeriod(record.date, f.period)) setFilter({ period: { kind: 'month', month: record.date.slice(0, 7) } })` (inPeriod z @shared/operationsView). Obsłuży to i 'month', i 'range'.

## B78. „Podziel paragon” zostawia rodzicowi flagę „finansuje domownik” – znak „domownik” i filtr „do zwrotu” kłamią

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/OperationEditor.tsx:224`, `src/shared/operationsView.ts:28`, `src/renderer/features/operations/state.ts:197`

**Co się dzieje.** Wydatek 100 zł finansowany przez Dom (refundable). Użytkownik klika „Podziel paragon” i ustawia obie części na „ja”. Pieniądze liczą się dobrze (partsOf bierze części). Rodzic ma jednak dalej refundable: true i memberId, a SplitEditor tego nie pokazuje i nie pozwala zdjąć. marksOf zwraca 'refundable', więc lista pokazuje odznakę „domownik”, a filtr „domownik” i openRefundables (Mostek / Radar, „do zwrotu”) pokazują zakup, którego nikt nie finansuje.

**Poprawka.** W „Podziel paragon” przenieść refundable / memberId do pierwszej części i ustawić na rodzicu `refundable: false, memberId: null`. Dodatkowo w marksOf przy `t.splits.length` brać tylko części: `(t.splits.length ? t.splits.some(s => s.refundable) : t.refundable)`. Dla starszych zapisów to samo w partsOf: reszta bez refundable.

## B79. Podział paragonu ukrywa pole „Ładownia” – płatność kontenera po podziale dalej idzie w całości do ładowni, części nie trafiają do kopert, a odpiąć się nie da

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/OperationEditor.tsx:216-257`, `src/renderer/features/operations/OperationEditor.tsx:248`, `src/shared/calc/plan.ts:297-299`, `src/shared/calc/fleet.ts:878`

**Co się dzieje.** Rachunek „ORANGE” zaimportowany i połączony z kontenerem „Telefon” (T49 – import łączy płatności odbiorcy) obejmuje abonament i zakup akcesoriów. Użytkownik klika „Podziel paragon” i daje części 60 zł „Subskrypcje” i 140 zł „Osobiste”. W trybie podziału edytor nie pokazuje pola „Ładownia” (CargoSelect jest tylko w gałęzi bez części), a „Podziel paragon” nie zdejmuje containerId. Silnik pomija całą operację w kopertach i energii dnia (`t.containerId` → continue), a debriefing liczy całe 200 zł jako „Ładownia i odkładki”. Kategorie części nie mają znaczenia, a użytkownik nie widzi dlaczego i nie może odpiąć kontenera bez cofnięcia podziału.

**Poprawka.** Renderować CargoSelect także w trybie podziału, nad SplitEditor, z dopiskiem „cała operacja liczy się do ładowni – kategorie części nie mają znaczenia”. Ewentualnie przy „Podziel paragon” na operacji z containerId pytać o odpięcie kontenera.

## B80. Wybór kategorii pokazuje „— bez kategorii —” dla podkategorii zarchiwizowanej kategorii głównej

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/pickers.tsx:38`, `src/renderer/features/operations/pickers.tsx:48`, `src/renderer/features/operations/pickers.tsx:58`

**Co się dzieje.** Po zarchiwizowaniu kategorii głównej „Auto” dawne operacje z kategorią „Auto · paliwo” wyglądają w edytorze na nieskategoryzowane. CategorySelect pomija całą optgroup zarchiwizowanej kategorii głównej, także gdy bieżącą wartością jest jej podkategoria. Opcja zastępcza pojawia się tylko dla nieznanego id, więc <select> bez pasującej opcji pokazuje pierwszą: „— bez kategorii —”. Lista pokazuje przy tym poprawną etykietę. Użytkownik „poprawia” kategorię, której nie trzeba poprawiać. To samo dotyczy części paragonu i masowej zmiany w Operacjach.

**Poprawka.** W CategorySelect pokazywać kategorię główną, gdy ona albo jej podkategoria jest bieżącą wartością: `const shownMain = (m) => !m.archived || m.id === value || cats.mainOf(value)?.id === m.id`, a podkategorie dalej filtrować `shown`.

## B81. Domyślny miesiąc listy Operacji nie zmienia się po zmianie miesiąca, gdy aplikacja działa w zasobniku

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/state.ts:46-50`

**Co się dzieje.** Aplikacja domyślnie zamyka się do zasobnika i startuje z Windows (D64), więc okno żyje tygodniami. Filtr Operacji z „bieżącym miesiącem” powstaje raz, przy pierwszym imporcie modułu (emptyFilter(warsawNow().month)). 1.11 użytkownik otwiera Operacje, żeby dopisać zakup, i widzi „październik 2026” z październikowymi operacjami, choć komentarz mówi, że okres zaczyna się od „this month”. Zmieni to dopiero „Bieżący miesiąc”, strzałka albo Ctrl+N (przestawia na miesiąc nowego wpisu).

**Poprawka.** W OperationsPage (albo w useMinute) przy zmianie miesiąca warszawskiego: jeśli filter.period to {kind:'month', month: poprzedni bieżący miesiąc}, ustawić nowy bieżący. Wybór innego miesiąca przez użytkownika zostaje bez zmian. Wystarczy porównać z miesiącem zapamiętanym w momencie poprzedniego sprawdzenia, bez nowej flagi w stanie.

## B82. Filtr kategorii z zarchiwizowaną albo usuniętą kategorią: w podsumowaniu ULID zamiast nazwy, a w menu nie ma pola do odznaczenia

Priorytet: niski · obszar: Operacje, Plan, Ładownia, kreator

Gdzie: `src/renderer/features/operations/OperationsPage.tsx:100`, `src/renderer/features/operations/OperationsPage.tsx:402`, `src/renderer/features/operations/state.ts:23`

**Co się dzieje.** Użytkownik filtruje Operacje po „Rozrywka i hobby” (filtr zapisany na komputerze), a potem archiwizuje tę kategorię w Ustawieniach. Menu „Kategoria” pomija kategorie zarchiwizowane, więc przycisk pokazuje „Kategoria: 01KDEFCAT00000000000000600”. Lista dalej pokazuje tylko operacje tej kategorii, a w menu nie ma pola, które dałoby się odznaczyć – zostaje tylko „wszystkie” albo „wyczyść filtry”. Tak samo po usunięciu kategorii albo z filtrem przeniesionym z innego folderu (readStored nie sprawdza id).

**Poprawka.** W opcjach dokładać kategorie z filter.categories, których nie ma na liście aktywnych, z etykietą `${cats.label(id)} (archiwum)` albo „nieznana kategoria”, żeby dało się je odznaczyć. Przy wczytaniu (albo w selektorze) usuwać id nieobecne w settings.categories.

## B83. „Saldo w banku teraz” liczy się jako saldo na koniec dzisiejszego dnia – wydatek z rana dopisany wieczorem daje błędną korektę

Priorytet: niski – do potwierdzenia (jeden z dwóch weryfikatorów nie odtworzył) · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/settings/AccountsTab.tsx:125`, `src/renderer/features/settings/AccountsTab.tsx:133`, `src/renderer/features/balances/actions.ts:28`, `src/renderer/features/balances/actions.ts:54`, `src/shared/calc/balances.ts:63`, `docs/decyzje.md:292`

**Co się dzieje.** Niedziela 10:00, przypomnienie o saldach. Rano zapłacono kartą 80 zł i bank już to odjął, ale zakup użytkownik dopisuje wieczorem (rytuał „Dzień kończy się dopisaniem wydatków”). Wpisuje saldo z banku i klika „Potwierdź saldo”. Aplikacja porównuje je z operacjami do końca dzisiejszego dnia (T25), a tego wydatku jeszcze nie ma, więc tworzy korektę −80 zł „do wyjaśnienia”. Wieczorem dochodzi wydatek −80 zł z tą samą datą i saldo konta w aplikacji jest o 80 zł niższe niż w banku (korekta i wydatek naraz), energia i osłony też. Nic nie łączy korekty z późniejszym wpisem. Wyjdzie to dopiero przy następnym potwierdzeniu, jako kolejna korekta +80. Działa to też w drugą stronę: zakup dopisany rano, którego bank jeszcze nie zaksięgował. Decyzja T25 („potwierdzenie = na koniec dnia”) razem z polem „teraz” i datą zawsze dzisiejszą daje błędne korekty na zwykłej ścieżce.

**Poprawka.** (1) Niedzielne przypomnienie o saldach pokazywać po wieczornym dopisaniu (np. od 21:00, razem z „Raportem wachty dnia”) albo w poniedziałek rano dla salda z końca niedzieli. (2) Przy potwierdzeniu przed wieczornym dopisaniem pytać „Dzisiejsze wydatki dopisane?” albo dać wybór dnia salda. (3) Przy dodaniu operacji (ręcznie lub z importu) na koncie, które ma nierozliczoną korektę z tego samego lub wcześniejszego dnia, podpowiadać zmniejszenie albo usunięcie korekty o tę kwotę („To ta rozbieżność?”).

## B84. Rozkazy przyjmują minimalne osłony większe niż cel osłon – stały alarm, Bearish i poważne naruszenia w grze

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/settings/MachineTabs.tsx:25`, `src/renderer/features/settings/MachineTabs.tsx:38`, `src/shared/calc/fleet.ts:868`, `src/shared/calc/game.ts:224`, `src/shared/calc/briefing.ts:25`, `src/renderer/components/meters.tsx:32`

**Co się dzieje.** Ustawienia → Warstwy i rozkazy: „Osłony – cel” = 2 pensje, „Minimalne osłony” = 3. Oba pola przyjmą taką parę bez ostrzeżenia. Dokowanie napełnia osłony tylko do celu (2 pensje), potem kadłub i cele, więc osłony praktycznie nigdy nie dochodzą do minimum. Skutek: stały żółty alarm „osłony poniżej minimum” w odprawie i Daily Bias zawsze Bearish (T57). Każdy dzień, w którym jakaś decyzja wzięła coś z osłon (pożyczka, przelew, zakup ponad energię), ocena dnia liczy jako poważne naruszenie (T75, D73), a trzy w miesiącu to degradacja. Pasek osłon nie pokazuje znacznika minimum (znacznik ≥ 1 jest pomijany), więc użytkownik nie widzi przyczyny.

**Poprawka.** W LayersTab i kreatorze odrzucać minimum > cel osłon (i cel < minimum) z komunikatem. Ostrzegać, gdy minimum > cel − 1, bo osłony spadają wtedy poniżej minimum po każdej pensji. Ewentualnie w silniku minShields = min(minimum, cel) × pensja. Test na parę cel 2 / minimum 3.

## B85. Pożyczka wzięta: „Do spłaty razem” mniejsze niż kwota przechodzi bez sprawdzenia i zaniża dług

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/radar/RadarPage.tsx:266`, `src/renderer/features/radar/RadarPage.tsx:270`, `src/renderer/features/radar/actions.ts:44`

**Co się dzieje.** Biorę pożyczkę 3 000 zł i w „Do spłaty razem” wpisuję przez pomyłkę wysokość raty, 300 zł. Zapis przechodzi bez ostrzeżenia, harmonogram ma 300 zł, a dług w zasięgu (D72) wynosi 300 zł zamiast ok. 3 000 zł. Zasięg i klasa okrętu są zawyżone, a kontener rat w Ładowni ma zaniżone raty.

**Poprawka.** Przy pożyczce wziętej odrzucać total > 0 && total < amount z komunikatem „Do spłaty razem nie może być mniej niż kwota pożyczki (puste = kwota)”. Ewentualnie dodać edycję harmonogramu pożyczki bez operacji rat.

## B86. Esc w polu nazwy w Ustawieniach przenosi z Ustawień na poprzedni ekran

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/components/ui.tsx:425`, `src/renderer/app/App.tsx:58`

**Co się dzieje.** Ustawienia → Konta: zmieniasz nazwę konta i wciskasz Esc, żeby zrezygnować. NameInput robi blur bez stopPropagation, więc zdarzenie dochodzi do nasłuchu „wstecz” na window, kiedy pole już nie ma fokusu. Aplikacja wraca na poprzedni ekran (np. Mostek), a wpisana nazwa i tak się zapisuje (osobne znalezisko o Esc). Dotyczy nazwy okrętu, kont, kategorii, podkategorii i domowników. AmountField przy Esc woła stopPropagation, więc tam tego nie ma.

**Poprawka.** W NameInput przy Esc: e.preventDefault(); e.stopPropagation() i anulowanie szkicu przed blur (np. flaga ref ‚cancelled’ sprawdzana w apply albo blur po zastosowaniu stanu). Tak samo jak AmountField.

## B87. Mapa gwiezdna: cel osiągnięty po terminie świeci się na czerwono „będzie po terminie”, a nieosiągnięty po terminie bez tempa nie ma żadnego oznaczenia

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/starmap/StarMapPage.tsx:188`, `src/renderer/features/starmap/StarMapPage.tsx:245`, `src/shared/calc/goals.ts:120`

**Co się dzieje.** Cel „Wakacje” z terminem 2026-07 zebrał całą kwotę w czerwcu. W październiku wiersz pokazuje „osiągnięty”, ale na czerwono, z podpowiedzią „Przy obecnym tempie cel będzie po terminie”, bo goalEtas daje celowi pełnemu bieżący miesiąc (2026-10 > 2026-07). Odwrotnie: cel z terminem 2026-05, niezebrany i bez tempa (pierwszy miesiąc budżetu albo brak dostaw) ma ETA null, więc nic nie sygnalizuje, że termin już minął.

**Poprawka.** `const reached = amount >= g.target; const overdue = !reached && !!g.deadline && (eta ? eta > g.deadline : g.deadline < bieżący miesiąc)`. Dla celu osiągniętego bez czerwieni (najwyżej neutralny dopisek). Oznaczenie „po terminie” w akcencie zamiast text-down (T74).

## B88. Kliknięcie powiadomienia wieczornego albo „Raport wachty dnia” w zasobniku kasuje zapisany filtr Operacji

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia, proces główny i okna

Gdzie: `src/renderer/store/notifier.ts:51`, `src/renderer/store/notifier.ts:52`, `src/renderer/features/operations/state.ts:33`, `src/renderer/features/operations/state.ts:52`, `src/renderer/features/bridge/BridgePage.tsx:191`, `src/renderer/features/operations/state.ts:186`

**Co się dzieje.** Użytkownik ma w Operacjach zapisany filtr (np. tylko konto mBank i kategoria Jedzenie – pamiętany w localStorage). O 21:00 klika powiadomienie „Raport wachty dnia” (albo pozycję menu ikony): openTag ustawia filtr na dziś z pustymi kontami, rodzajami, kategoriami i oznaczeniami, a setFilter go zapisuje – własny filtr znika na stałe, nie tylko na ten widok.

**Poprawka.** Dodać do operations/state.ts funkcję widoku tymczasowego (np. `showFilter(patch)`, która ustawia filter w stanie bez store(), ewentualnie zapamiętuje poprzedni filtr do przywrócenia przyciskiem „Poprzedni filtr”). Użyć jej w notifier.ts:52 i BridgePage.tsx:191. Zwykłe zmiany filtra w Operacjach nadal zapisują przez setFilter.

To samo zgłoszone też jako: „Kliknięcie operacji na Mostku kasuje zapamiętane filtry ekranu Operacje”.

## B89. Podniesiony kontener: naruszenie trafia na dzień przed zmianą, a zmiana 2. dnia miesiąca nie jest zapisana wcale

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:214`, `src/shared/calc/game.ts:217`, `src/shared/calc/game.ts:221`, `src/shared/calc/game.ts:534`

**Co się dzieje.** Aplikacja działa codziennie, więc dzień d−1 zamraża się tuż po północy d+1. Masę dnia rateDay liczy z bieżących kwot kontenerów, bo kontener nie ma historii kwot. Jeśli kontener podniesiono ponad linię 3.11 w południe, dzień 2.11 (zamrażany 4.11) widzi już nową kwotę i dostaje naruszenie „cargo”. Naruszenie trafia więc na dzień, w którym nic się nie stało, i przerywa jego serię. Dzień 3.11 widzi tę samą masę co 2.11, więc zostaje zgodny. Gdy zmiana przypada 2. dnia miesiąca, pierwszym dniem zamrożonym po niej jest 1. dzień miesiąca. Wtedy porównanie z poprzednim dniem jest wyłączone (inny miesiąc), a kontener nie jest „dodany dziś”. Dzień 2. porównuje masę z 1. – ta sama – i naruszenie z D73 („kontener … zmieniony ponad linię zanurzenia”) nie zapisuje się nigdzie. Zmiana 1. dnia trafia z kolei na ostatni dzień poprzedniego miesiąca.

**Poprawka.** Przy zamrażaniu dnia d: jeśli masa wzrosła względem `prev.cargo`, a wszystkie kontenery zmienione od tamtej pory mają `dateOf(updatedAt) > d`, nie zgłaszać naruszenia w d i zapisać w d `cargo = prev.cargo`. Wtedy dzień zmiany (`updatedAt`) zobaczy wzrost i dostanie naruszenie. Na początku miesiąca, przy braku porównania, uznać za wzrost kontener z `dateOf(updatedAt) === d` przy ładunku ponad linią. Zapisać jako nową T-decyzję rozszerzającą T75.

## B90. Starsza wersja na drugim komputerze ocenia misję nieznanego szablonu jako niewykonaną i źle czyta nieznany stopień

Priorytet: niski – do potwierdzenia (jeden z dwóch weryfikatorów nie odtworzył) · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:419`, `src/shared/calc/game.ts:420`, `src/shared/calc/game.ts:540`, `src/shared/calc/game.ts:541`, `src/shared/calc/game.ts:543`, `src/shared/calc/game.ts:152`, `src/shared/calc/game.ts:154`, `src/renderer/features/command/CommandPage.tsx:94-100`

**Co się dzieje.** Dwa komputery, jeden zaktualizowany wcześniej. Nowsza wersja wybiera misję szablonu, którego starsza nie zna; template to otwarty string, SCHEMA_VERSION się nie zmienia. Starsza zamraża niedzielę pierwsza: missionStatus zwraca w gałęzi default `{ ok: false }`, a advanceGame zapisuje `done: false, evaluatedAt` na stałe. Kod pomija dla takiego szablonu tylko zdarzenie (MISSIONS.includes), ale samą misję i tak ocenia. Misja, którą użytkownik mógł wykonać, przepada razem z premią 3 dni do awansu. Analogicznie, gdy ostatnia zmiana stopnia ma stopień nieznany starszej wersji, rankOf zwraca `{ rank: 'cadet', since: null }`. Starsza wersja liczy wtedy postęp od startu gry i może zapisać „awans” na Chorążego z późniejszym dniem, który staje się ostatnią zmianą – w praktyce degradacja na obu komputerach.

**Poprawka.** W advanceGame misji z szablonem spoza MISSIONS nie oceniać (zostawić evaluatedAt null – oceni ją wersja, która ją zna). W rankStep, gdy ostatnia zmiana stopnia ma nieznany stopień, zwracać null (bez awansu i degradacji), a w rankOf / gameView pokazywać nazwę z rekordu.

## B91. Wybór misji tygodnia zależy od dnia uruchomienia: w poniedziałek „Pełna energia” nie widzi niedzieli

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:325-329`, `src/shared/calc/game.ts:530`, `src/shared/calc/game.ts:557-565`, `src/renderer/store/game.ts:50`, `docs/decyzje.md:510-514`

**Co się dzieje.** Misja jest wybierana przy pierwszym uruchomieniu w tygodniu (T78: z danych 4 tygodni przed poniedziałkiem), a słaby punkt „Pełna energia” liczy przekroczenia przydziału tylko z dni już zamrożonych. W poniedziałek zamrożone są dni do soboty (dziś − 2), więc niedziela nie liczy się; we wtorek – liczy się. Przykład: przekroczenia przydziału 14.10 i w niedzielę 25.10. Uruchomienie w poniedziałek 26.10 → misja „Łączność z bazą”, ta sama sytuacja z pierwszym uruchomieniem we wtorek 27.10 → „Pełna energia”. Na jednym komputerze (start z Windows w poniedziałek) niedzielne przekroczenia systematycznie nie wpływają na wybór. Na dwóch komputerach misja o tym samym id (missionId z tygodnia) może dostać różne szablony i parametry – konflikt przy synchronizacji, choć T76/D73 zakładają, że „dwa komputery piszą to samo”.

**Poprawka.** W chooseMission dla dni okna jeszcze niezamrożonych (w poniedziałek tylko niedziela) liczyć przekroczenie tak jak rateDay: `computeFleet` na koniec dnia, `daily.left < 0`. To jeden dodatkowy przebieg silnika raz w tygodniu. Dopisać doprecyzowanie do T78. Alternatywa z „misją od wtorku” zmienia zachowanie widoczne dla użytkownika, więc wymagałaby jego decyzji.

## B92. Eksport „Miesiące”: miesiące sprzed startu budżetu mają „Łupy 0,00” zamiast pustej komórki

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/plan.ts:318`, `src/shared/calc/plan.ts:319`, `src/shared/calc/plan.ts:330`, `src/shared/export/budget.ts:136`, `src/shared/export/budget.ts:146`, `src/renderer/features/reports/ReportsPage.tsx:433`

**Co się dzieje.** Budżet działa od 2026-10-01, a historia z mBanku sięga do sierpnia. W Raportach → Eksport domyślny okres zaczyna się 1 stycznia, więc CSV i Excel „Miesiące” obejmują też miesiące, w których silnik nie działał. debriefing liczy `ended = today >= 1. dzień następnego miesiąca` (true), a zdarzenia 'month-end' dla tych miesięcy nie ma. Wychodzi `loot: Math.max(0, 0) = 0` i plik pokazuje łupy 0,00 zł, jakby miesiąc się zamknął z zerową energią. Powinno być pusto (null), tak jak dla pensji.

**Poprawka.** W debriefing ustawić loot = null, gdy silnik nie przeszedł przez koniec miesiąca. Warunek: przekazano log i nie ma w nim zdarzenia 'start' z datą < firstDayOf(addMonths(month, 1)). Gdy log nie jest podany (wywołania z src/shared/calc/game.ts:311 i 481), zachowanie zostaje jak dziś: gra nie używa loot, ale lepiej jej nie ruszać. Inna droga: przekazać do monthRows fleet.start i zerować loot dla month < monthOf(start). Brak 'month-end' nadal znaczy 0 dla miesięcy, przez które silnik przeszedł z energią 0 lub ujemną.

## B93. W trakcie importu ekran dalej przyjmuje zmiany: decyzje zmienione podczas kopii przepadają, upuszczony plik jest zamykany, „Zamknij plik” nie przerywa importu

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:447`, `src/renderer/features/import/state.ts:454`, `src/renderer/features/import/state.ts:459`, `src/renderer/features/import/state.ts:487`, `src/renderer/features/import/ImportPage.tsx:76`, `src/renderer/features/import/ImportPage.tsx:80`, `src/renderer/features/import/ImportPage.tsx:96`, `src/renderer/features/import/ImportPage.tsx:101`

**Co się dzieje.** Duży folder: api.importBackup() pakuje cały folder kilka–kilkanaście sekund. Przycisk pokazuje „Importuję…”, a „Wybierz plik” jest wyłączony, ale selecty grup / tematów, upuszczanie pliku i „Zamknij plik” działają. Decyzje zmienione w tym czasie nie wchodzą (runImport używa `st.choices` z początku), a na końcu setState czyści choices – zmiany przepadają bez śladu. Upuszczony w tym czasie inny plik zostaje wczytany, po czym końcowy setState (file: null, plan: null, choices: puste) go zamyka; „Zamknij plik” nie przerywa importu, który i tak się wykona.

**Poprawka.** Na czas `busy`:
- wyłączyć DecisionFields, zaznaczanie, „pomiń”, KeywordRules, Podobne nazwy i „Zamknij plik”;
- w onDrop ignorować plik z komunikatem „Trwa import – poczekaj”.
Alternatywnie po kopii czytać `useImport.getState().choices`, a na końcu nie czyścić sesji, jeśli w międzyczasie wczytano inny plik (porównanie `file`).

## B94. Upuszczenie pliku omija limit 20 MB i odczyt w procesie głównym (T42), a błąd odczytu nie jest obsłużony

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:79`, `src/renderer/features/import/ImportPage.tsx:80`, `src/main/index.ts:608`, `src/main/index.ts:619`

**Co się dzieje.** T42: „Plik CSV do 20 MB, czytany w procesie głównym”. Wybór przez okno idzie przez fi:pickImportFile z limitem i filtrem rozszerzeń. Upuszczenie czyta plik w całości w rendererze (`f.arrayBuffer()`), bez sprawdzenia rozmiaru – plik kilkuset MB albo wielogigabajtowy zostaje zdekodowany w oknie (zawieszenie / awaria okna przy decodeText). Upuszczenie folderu albo pliku znikniętego z OneDrive daje odrzucenie `arrayBuffer()` bez `.catch` – nieobsłużone odrzucenie obietnicy i brak komunikatu dla użytkownika. (Upuszczenie w trakcie importu – osobne znalezisko o `busy`.)

**Poprawka.** Przenieść IMPORT_MAX_BYTES do shared. W onDrop: `if (f.size > IMPORT_MAX_BYTES) return useImport.setState({ fileName: f.name, file: null, plan: null, error: 'Plik ma … MB – to nie wygląda na wyciąg z banku …' })`, a do łańcucha dodać `.catch((e) => useImport.setState({ fileName: f.name, file: null, plan: null, error: `Nie udało się odczytać pliku: ${errorMessage(e)}` }))`. Upuszczenie podczas `busy` blokować (zob. znalezisko 22).

## B95. Błąd w połowie zapisu importu zostawia otwarty plik z nieaktualnym podglądem; ponowny import nie uczy już reguł, a operacje z nowszej wersji są po cichu pomijane

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:460`, `src/renderer/features/import/state.ts:462`, `src/renderer/features/import/state.ts:465`, `src/renderer/features/import/state.ts:486`, `src/renderer/store/data.ts:531`, `src/renderer/store/data.ts:566`, `src/renderer/store/data.ts:570`, `src/main/datastore/store.ts:887` …

**Co się dzieje.** (1) Zaznaczona do usunięcia zniknięta nierozliczona nie usuwa się w main (plik zapisany przez nowszą wersję – ReadOnlyError, albo Kosz / OneDrive odmawia). deleteRecord najpierw usuwa ją z pamięci, potem rzuca – runImport przerywa po addRecords / replaceRecords: operacje się zapisują, ale reguły, ownNames, lastImport i log nie; panel dalej pokazuje stary plan z „Importuj (N)”. Drugie kliknięcie: utworzone wiersze są już „znane”, grupy z decyzjami znikają, więc reguły z „zapamiętaj” już nie powstaną, a „Import zakończony” mówi „Nowe: 0”. Operacja znika tylko z pamięci do ponownego skanu. To samo przy błędzie drugiego flushSaves (486): plik zostaje otwarty z nieaktualnym podglądem. (2) replaceRecords po cichu pomija rekordy readOnly (zapisane przez nowszą wersję, np. gdy OneDrive przyniósł je przed fi.json): połączenie z takim wpisem ręcznym liczy się w podglądzie i w toaście jako „połączone”, a nic się nie zmienia; w panelu duplikatów zachowana readOnly nie bierze danych banku, a kopia z bankiem i tak jest usuwana.

**Poprawka.** W runImport najpierw zapisać ustawienia (reguły, ownNames, lastImport, log), a usunięcia zrobić na końcu w try/catch na każdy wpis: błąd zbiera się do komunikatu „nie usunięto N”, sesja zamyka się z wynikiem (`done`). deleteRecord przy odmowie main przywraca wpis w pamięci. planImport pomija wpisy readOnly przy łączeniu (merge / loose / settle) albo oznacza je „tylko do odczytu – nie łączę”, żeby wiersz banku powstał jako nowy, a liczniki w podglądzie się zgadzały.

## B96. Usunięta nierozliczona operacja wraca, gdy bank rozliczy ją inną kwotą lub datą (T39)

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/shared/import/reconcile.ts:126`, `src/shared/import/reconcile.ts:195`, `src/shared/import/mbank.ts:253`, `src/renderer/features/import/state.ts:108`

**Co się dzieje.** Z „listy operacji” zaimportowano nierozliczoną płatność kartą za granicą −45,99 zł; użytkownik ją usuwa (np. dopisał ją wcześniej ręcznie albo nie chce jej w budżecie). Za 2 dni bank rozlicza ją jako −46,12 zł z inną datą: klucz wiersza (data, opis, kwota) jest inny, deletedKeys go nie zna, a dopasowanie „rozliczonej” (settle) szuka tylko wśród istniejących nierozliczonych – wiersz wchodzi jako nowy. T39: operacja usunięta przez użytkownika nie wraca z kolejnym importem.

**Poprawka.** deletedBankKeys zwraca obok klucza dane usuniętych nierozliczonych (bank.pending, accountId, date, amount, bank.counterparty / description). W planImport, po dopasowaniu 'settle' do istniejących, wiersz nie-nierozliczony bez dopasowania przyrównać do usuniętych nierozliczonych tego konta tymi samymi kryteriami co settle (znak, ±3 dni, ±max(5 zł, 10%), similarCounterparty), każdą usuniętą najwyżej raz → status 'deleted'. Brać tylko usunięte z `bank.pending`, żeby nie tłumić kolejnych podobnych zakupów u tego samego kontrahenta. Fałszywe dopasowanie da się cofnąć – takie wiersze trafiają do „Usunięte przez Ciebie wcześniej” z „importuj mimo to”.

## B97. Po przyjęciu podpowiedzi mBanku własna zmiana decyzji nie jest domyślnie zapamiętywana, a plakietka mówi „Twoja decyzja”

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:262`, `src/renderer/features/import/state.ts:263`, `src/renderer/features/import/state.ts:283`, `src/renderer/features/import/state.ts:284`, `src/renderer/features/import/state.ts:311`, `src/renderer/features/import/state.ts:312`, `src/renderer/features/import/state.ts:438`, `src/renderer/features/import/ImportPage.tsx:387` …

**Co się dzieje.** Użytkownik klika podpowiedź mBanku przy grupie („→ Jedzenie?”, acceptGroupHint: remember = false, accepted = true) albo „Przyjmij podpowiedzi mBanku” (rememberThemes = false), a potem sam zmienia kategorię na właściwą („Kawa”). chooseGroup / chooseTheme bierze `remember ?? c.remember[group] ?? true` = false, więc ta własna decyzja nie tworzy reguły; przy zwykłej własnej decyzji „zapamiętaj” jest domyślnie zaznaczone (T38), a kolejny import pyta znowu. Do tego przyjęta podpowiedź od razu ma plakietkę „Twoja decyzja”, choć według T90/T91 to przyjęta propozycja, która ustępuje nowej propozycji przy przeliczeniu planu.

**Poprawka.** W chooseGroup przed patchem odczytać `wasHint = useImport.getState().accepted.groups[group]` i ustawić `remember: remember ?? (wasHint ? true : c.remember[group] ?? true)`. Analogicznie w chooseTheme przy accepted = false z `accepted.themes[theme]`. Dla przyjętej podpowiedzi pokazywać plakietkę „podpowiedź mBanku” (GroupRow: `own && accepted.groups[g.group]`; ThemeRow: `decided && accepted.themes[t.theme] && t.basis.kind === 'hint'`) zamiast „Twoja decyzja”.

## B98. Pozycja „(jak grupa)” w kategorii operacji ustawia operacji brak kategorii zamiast kategorii grupy

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:452`, `src/renderer/features/import/ImportPage.tsx:455`, `src/renderer/features/import/ImportPage.tsx:456`

**Co się dzieje.** Grupa ma kategorię X; operacja nie ma własnej decyzji, więc select pokazuje X, a pusta pozycja ma etykietę „(jak grupa)”. Wybranie jej daje categoryId null ≠ X → chooseRow zapisuje operacji własną decyzję „bez kategorii” (etykieta zmienia się na „— bez kategorii —”) i operacja wchodzi bez kategorii, choć użytkownik wybrał „jak grupa”.

**Poprawka.** Prawdziwa etykieta zamiast zmiany zachowania: `emptyLabel={mine || choice.categoryId ? '— bez kategorii —' : '(jak grupa)'}` w ImportPage.tsx:455. Powrót do grupy działa już teraz: wybór kategorii grupy daje chooseRow(null). Ewentualnie osobna pozycja „(jak grupa)” tylko przy `mine`.

## B99. Rozliczenie nierozliczonej i łączenie „bliskiej kwoty” zmieniają kwotę, a podział paragonu zostaje: różnica idzie na „moje” bez kategorii

Priorytet: niski · obszar: import (ekran), import (logika)

Gdzie: `src/shared/import/reconcile.ts:531`, `src/shared/import/reconcile.ts:544`, `src/shared/import/duplicates.ts:157`, `src/shared/calc/operations.ts:28`, `src/shared/import/reconcile.ts:547`

**Co się dzieje.** Nierozliczony zakup za granicą −100 zł podzielony pół na pół: część własna −50 i część domownika (refundable) −50. Bank rozlicza go po kursie na −105 zł. `buildImport` (ścieżka settle) ustawia `amount: −10500` i nie rusza `splits` (suma −10000). `partsOf` dokłada resztę −5 zł jako część bez kategorii, niefinansowaną. Domownik oddaje więc 50 zamiast 52,50, a 5 zł to mój koszt bez kategorii. To samo przy łączeniu wpisu ręcznego z podziałem i „bliską kwotą” (do max(1 zł, 3%), łączone domyślnie przy podobnej nazwie) oraz w `mergeDuplicate` ('manual').

**Poprawka.** Gdy operacja z podziałem dostaje przy rozliczeniu lub łączeniu inną kwotę (settle, merge, mergeDuplicate 'manual'), przeskalować części proporcjonalnie w groszach z resztą w ostatniej (największej) części, wzorem splitEvenly. Przy przeliczeniu waluty zachowa to udział domownika. Ewentualnie oznaczyć operację w podglądzie importu i na liście jako „podział do sprawdzenia”.

To samo zgłoszone też jako: „Zmiana kwoty przy rozliczeniu / łączeniu z wpisem ręcznym nie poprawia podziału paragonu”.

## B100. Scalenie duplikatów zostawia `covers` wpłat domowników wskazujące na usuniętą kopię

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/DuplicatesPanel.tsx:69`, `src/renderer/features/import/DuplicatesPanel.tsx:76`, `src/renderer/features/import/DuplicatesPanel.tsx:89`, `src/shared/schema/records.ts:101`

**Co się dzieje.** Zakup „finansuje Tata” jest dwa razy (wpis ręczny + kopia z banku); we wpłacie Taty w polu „Pokrywa” (covers) wybrano kopię z banku. „Scal zaznaczone” przepina tylko dokowania na zachowaną operację i usuwa kopię – covers wpłaty dalej wskazuje usunięte id, więc rejestr rozliczeń przestaje traktować wpłatę jako spłatę tego zakupu (spłaca najstarsze).

**Poprawka.** W merge() dla każdej operacji, której `covers` zawiera id z g.remove, podmienić je na g.keep (bez duplikatów). Oryginały tych operacji dodać do `originals`, żeby „Cofnij” je przywracał.

## B101. Sesja importu przeżywa zmianę folderu – nieaktualne `deletedKeys` z poprzedniego folderu pomijają wiersze

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:57`, `src/renderer/features/import/state.ts:124`, `src/renderer/features/import/state.ts:180`, `src/renderer/store/data.ts:145`

**Co się dzieje.** Plik wczytany przy folderze A, użytkownik przełącza folder na B (np. folder odtworzony z kopii). useImport nie jest czyszczony (applySnapshot go nie dotyka); na stronie Import replanImport liczy plan z danymi B, ale z deletedKeys z historii A (klucze wierszy zawierają stałe id konta mBank, więc pasują) – wiersze usunięte kiedyś w A są w B oznaczone „usunięte przez Ciebie wcześniej (pominięte)” i nie wchodzą; panel „Import zakończony” z A też zostaje.

**Poprawka.** W applySnapshot (albo w openResult przy zmianie folderu) wywołać closeImport(). Najlepiej przez zdarzenie lub subskrypcję zmiany `status.dir` w module importu, żeby store danych nie zależał od features. Alternatywnie w replanImport / runImport pobierać deletedBankKeys() od nowa, gdy zmienił się folder.

## B102. „Podobna nazwa” liczy słowa ogólne („polska”, „sklep”, „spółka”) i krótkie klucze: możliwy duplikat z inną kwotą łączy się sam, a panel duplikatów go zaznacza

Priorytet: niski · obszar: import (logika)

Gdzie: `src/shared/import/reconcile.ts:46-54`, `src/shared/import/reconcile.ts:154`, `src/shared/import/reconcile.ts:184-185`, `src/shared/import/duplicates.ts:126`, `src/shared/import/brands.ts:546`, `src/shared/import/brands.ts:563`, `docs/decyzje.md:328`, `docs/decyzje.md:584`

**Co się dzieje.** Wpis ręczny „Poczta Polska” −15,00 zł z 10.10 z kategorią usług. W pliku jest „ORLEN POLSKA” −15,40 zł z 12.10, a wiersza poczty jeszcze nie ma (przyjdzie w następnym pliku). `similarCounterparty` uznaje nazwy za podobne, bo mają wspólne słowo z co najmniej 4 liter – „polska”. Kwota mieści się w max(1 zł, 3%), więc plan daje 'merge' z `loose: 'amount'` i `ask: false` („pewny”, bo podobna nazwa – T92) i łączy bez pytania. Wpis „Poczta Polska” dostaje kwotę −15,40, datę i wiersz banku ORLEN, a zachowuje kategorię poczty; prawdziwy wiersz poczty wejdzie w kolejnym imporcie jako nowa operacja bez kategorii. To samo robi każde słowo, które `brands.ts` sam uznaje za ogólne (GENERIC: sklep, polska, spolka, akcyjna, centrum, przelew, zakup, karty…), oraz krótki klucz zawarty w dłuższym („bar” w „barbershop”). Przy tej samej kwocie (T36) takie słowo też wystarcza do ścisłego łączenia. Panel duplikatów stosuje tę samą regułę i taką parę bez konfliktu zaznacza domyślnie do scalenia (kopia z banku jest usuwana). Problem powoduje sama definicja podobnej nazwy z T36 („wspólne słowo z co najmniej 4 liter”), którą T92 uznaje za „pewne” także przy innej kwocie.

**Poprawka.** W similarCounterparty liczyć tylko słowa, które wyróżniają: pomijać isGenericWord, isKindWord i isCityWord (brands.ts / similar.ts), a zawieranie kluczy liczyć od np. 5 znaków. Dla możliwego duplikatu z inną kwotą ustawiać ask: true, gdy podobieństwo opiera się tylko na jednym wspólnym słowie (bez zawierania klucza). Dopisać doprecyzowanie do T36 / T92.

## B103. Podwójna spacja w tytule przelewu (lista operacji) zamienia część tytułu w kontrahenta

Priorytet: niski – do potwierdzenia (jeden z dwóch weryfikatorów nie odtworzył) · obszar: import (logika)

Gdzie: `src/shared/import/mbank.ts:118`, `src/shared/import/mbank.ts:144`, `src/shared/import/classify.ts:298`, `src/shared/import/classify.ts:324`

**Co się dzieje.** Pola opisu mBanku dzieli każdy ciąg co najmniej dwóch spacji (`split(/\s{2,}|\t/)`). Tytuł wpisany przez nadawcę z podwójną spacją, np. „TOMASZ NOWAK, ZA  OBIAD” albo BLIK P2P „ANNA X ., KINO  I POPCORN”, daje część druga = „OBIAD” / „I POPCORN”. Gałąź TRANSFER_LIKE uznaje drugą część za nazwę strony, więc kontrahentem zostaje „OBIAD”, a tytułem „ZA”. Skutki: domownik nie jest rozpoznany (`memberOf` po „OBIAD”), przelew od siebie nie jest przelewem własnym (`isOwnName`), grupa i reguła powstają na kluczu 'obiad' i potem łapią przelewy innych osób, a słowa kluczowe nazwy decydują zamiast osoby.

**Poprawka.** W gałęzi TRANSFER_LIKE uznawać drugą część za nazwę tylko w dwóch znanych przypadkach:
- pierwsza część nie ma „, ” (mTransfer: „Doładowanie telefonu | BLUE MEDIA”);
- nazwa przed przecinkiem zawiera drugą część albo zaczyna się jej pierwszym słowem (XTB: „XTB SPÓŁKA AKCYJNA PROSTA 67…, Withdrawal | XTB SPÓŁKA AKCYJNA”).

W pozostałych przypadkach doklejać drugą część (i kolejne, które nie są adresem ani numerem konta) do tytułu. Testy: wiersze z pliku testowego (XTB, adres „UL.TESTOWA”, BLIK P2P z „.”) bez zmian oraz tytuł z podwójną spacją.

## B104. Klucz marki „constructor” trafia w Object.prototype: resolveBrand zwraca undefined (wyjątek przy regule „zawiera”, decyzja grupy nigdy nie zostaje zapamiętana)

Priorytet: niski · obszar: import (logika)

Gdzie: `src/shared/import/aliases.ts:16`, `src/shared/import/classify.ts:82`, `src/shared/import/classify.ts:106`, `src/shared/import/reconcile.ts:602`, `src/shared/schema/budget.ts:196`

**Co się dzieje.** Kontrahent „CONSTRUCTOR POLSKA” (prawdziwa firma; `brandOf` obcina „polska”, więc klucz to 'constructor'). `resolveBrand` sprawdza `aliases[k]`, a zwykły obiekt `{}` ma odziedziczone `constructor` (funkcję). Pętla bierze więc `k = Object.to` = undefined i zwraca undefined. W `ruleTargetOf` `target.brand` = undefined. Gdy w ustawieniach jest jakakolwiek reguła 'contains', `findRule` wykonuje `t.brand.includes(...)` i rzuca TypeError, więc `planImport` pada i pliku nie da się zaimportować. Bez takiej reguły grupa ma klucz 'undefined|out|…', a `buildImport` pomija jej naukę (`!g.brand`), więc decyzja z „zapamiętaj” nigdy nie staje się regułą.

**Poprawka.** W `resolveBrand` sprawdzać `Object.hasOwn(aliases, k)` zamiast `aliases[k]`; to jedna linia i naprawia też `withMerged`, które z niej korzysta. Opcjonalnie `lenientRecord` może budować wynik przez `Object.create(null)`. Odczyty `dismissed[pairKey]` / `notSimilar` są bezpieczne, bo klucz zawiera „|”.

## B105. „PŁATNOŚĆ …” i „SPRZEDAŻ …” nie są rozpoznawane jako rodzaj operacji (\b po polskiej literze)

Priorytet: niski · obszar: import (logika)

Gdzie: `src/shared/import/mbank.ts:88`, `src/shared/import/mbank.ts:134`, `src/shared/import/reconcile.ts:184`, `src/shared/import/reconcile.ts:258`

**Co się dzieje.** `OPERATION_START` kończy się `\b` bez flagi `u`. Po „PŁATNOŚĆ” (kończy się na „Ć”) i „SPRZEDAŻ” (na „Ż”) granica słowa w ASCII nie występuje, więc `isOperation` zwraca false. Wiersz listy „SKLEP X  PŁATNOŚĆ WEB - KOD MOBILNY” dostaje `operation: ''`, a rodzaj operacji ląduje w tytule. Skutki: `opKindOf` = 'other' zamiast 'card' (inny temat), łączenie możliwego duplikatu „zakup kartą do dnia różnicy” (linia 184, która wprost wymienia PŁATNOŚĆ) nie działa, a słowa rodzaju operacji są traktowane jak tytuł przy słowach kluczowych. Przy „SPRZEDAŻ WALUTY” to samo.

**Poprawka.** W OPERATION_START zamienić końcowe `\b` na `(?=$|[^\p{L}\p{N}])` z flagą `u`. Zmiana nie dotyka kluczy wierszy (rowIdentity bierze description, które się nie zmienia) ani nazwy kontrahenta. Przejrzeć też inne wyrażenia z `\b` po słowach kończących się polską literą.

## B106. „XTB” gdziekolwiek w opisie (także w tytule) robi z przelewu własnego i wpłaty domownika operację tradingową

Priorytet: niski – do potwierdzenia (jeden z dwóch weryfikatorów nie odtworzył) · obszar: import (logika)

Gdzie: `src/shared/import/classify.ts:223`, `src/shared/import/classify.ts:323-327`

**Co się dzieje.** `isXtb` szuka słowa „xtb” w całym opisie wiersza (kontrahent, tytuł, rodzaj operacji) i jest sprawdzane przed przelewem własnym i przed domownikiem. Przelew własny „PRZELEW WŁASNY JAN KAPITAN, NA PORTFEL XTB” −500 zł staje się dopłatą do konta tradingowego: alarm firewall, przychód z tradingu netto pomniejszony, a w ICTTJ nie ma pasującego wpisu. Wpłata domownika z tytułem „ZWROT ZA KURS XTB” staje się wypłatą z XTB (dokuje jak wypłata tradingowa, przypomnienie o brakującym wpisie w ICTTJ) zamiast pieniędzmi osoby, więc jej należność się nie zmniejsza.

**Poprawka.** Przelew własny („PRZELEW WŁASNY” albo nazwisko właściciela) i domownika (memberOf) sprawdzać przed XTB. XTB rozpoznawać po kontrahencie (XTB / X-TRADE BROKERS), a po tytule tylko wtedy, gdy kontrahent jest pusty albo jest operatorem płatności (withoutProcessor / PROCESSOR z brands.ts). Dopisać to jako doprecyzowanie T37.

## B107. saveSettings i przywrócenie fi.json z historii połykają zmiany: kopia „-zewnetrzna-” / odsunięty uszkodzony fi.json nie docierają do okna, a restore nadpisuje uszkodzony fi.json bez odsunięcia

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:934`, `src/main/datastore/store.ts:938`, `src/main/datastore/store.ts:800`, `src/main/datastore/store.ts:933`, `src/main/datastore/store.ts:640`, `src/main/datastore/store.ts:1037`, `src/main/datastore/store.ts:1039`, `src/main/datastore/store.ts:1041` …

**Co się dzieje.** Na dysk przychodzi fi.json z drugiego komputera (inne reguły importu, domownicy), a zanim watcher go zgłosi (debounce 300 ms, albo dłużej gdy zdarzenie zginie i ratuje dopiero sondowanie co 30 s) okno zapisuje ustawienia. preserveExternalChange słusznie zapisuje wersję z dysku jako fi-zewnetrzna-….json i wczytuje ją do this.files, ale saveSettings kończy się `this.commit(this.buildViews())` bez wysłania ChangeSet (IPC saveSettings nic nie wysyła). Gdy watcher potem zgłasza oba pliki, diff porównuje z już zatwierdzonym stanem → null; „Przeskanuj teraz” też null. Konflikt nie pojawia się na stronie Synchronizacja ani w pasku – ustawienia z drugiego komputera zostały po cichu zastąpione, a użytkownik o tym nie wie do restartu. To samo przy saveSettings nad uszkodzonym fi.json: okno dalej pokazuje stary problem „fi.json uszkodzony” (a „Do Kosza” przy nim kończy się błędem), nowej kopii „-uszkodzona-” nie widać. Dopisane: „Historia” ustawień (SyncPage → „Ustawienia (fi.json) też mają historię”) przy uszkodzonym fi.json – historyRestore('fi') zapisuje wprost na uszkodzony plik bez setAsideProblem (saveSettings i historyRestore dla rekordów go odsuwają) i też tylko commit – okno do restartu pokazuje problem „fi.json uszkodzony”, którego już nie ma.

**Poprawka.** saveSettings i historyRestore('fi') zwracają `this.diff(this.buildViews(), true)`, a main wysyła je przez send() (origin 'local', więc renderer nie pyta o własne fi). historyRestore('fi') przy fi.json w stanie problemu najpierw setAsideProblem.

## B108. Oczekująca decyzja o zmianie z drugiego komputera blokuje każde „zapisz wszystko”, a komunikaty mówią o zablokowanym pliku i ponowieniu, którego nie ma

Priorytet: niski · obszar: folder danych i synchronizacja, proces główny i okna

Gdzie: `src/renderer/store/data.ts:385`, `src/renderer/store/data.ts:598`, `src/main/index.ts:881`, `src/main/index.ts:883`, `src/renderer/features/import/state.ts:486`, `src/renderer/store/update.ts:62`, `src/renderer/features/settings/SettingsPage.tsx:176`, `src/renderer/features/history/actions.ts:11` …

**Co się dzieje.** Notatka operacji zmieniona tutaj (niezapisana) i na laptopie → okno „Zmiany z drugiego komputera”, użytkownik daje „Później”. Potem: Zakończ z zasobnika / zamknięcie przy wyłączeniu Windows → okno main „Nie udało się zapisać ostatnich zmian. Folder danych może być niedostępny albo plik jest zablokowany (OneDrive, antywirus). Wybierz „Anuluj”, żeby aplikacja spróbowała ponownie” – nieprawdziwa przyczyna, a „Anuluj” nic nie da: runSave dla rekordu z oczekującą decyzją wraca od razu, bez błędu i bez ponowienia, okno decyzji się nie otwiera; „Zamknij mimo to” traci edycję. Tak samo „Uruchom ponownie” po aktualizacji („aktualizacja wstrzymana. Spróbuj ponownie za chwilę”), koniec importu („Część operacji nie zapisała się jeszcze – aplikacja ponawia zapis automatycznie” – nie ponawia), przywracanie / „Cofnij”, kopia i eksport w Ustawieniach, zmiana folderu, „Zapisz” w palecie. Tylko Ctrl+S i strona Synchronizacja mówią o czekającej decyzji.

**Poprawka.** flushSaves zwraca `{ saved, waiting }` (liczba kluczy brudnych z oczekującą decyzją). Przy `waiting > 0` wywołujący otwierają RemoteChangesDialog z tekstem „Czekają zmiany z drugiego komputera (n) – zdecyduj, zanim …”. `fi:flushed` przekazuje przyczynę, a main pokazuje osobny tekst („Zdecyduj o zmianach z drugiego komputera” zamiast „plik zablokowany”) i po „Anuluj” pokazuje okno decyzji.

To samo zgłoszone też jako: „Mylące okno „Niezapisane zmiany”, gdy zapis czeka na decyzję o zmianie z innego komputera”.

## B109. Nieczytelny fi.json przy otwarciu (start z Windows przed OneDrive) kończy się ekranem wyboru bez „Spróbuj ponownie” i bez ponowienia; uszkodzony fi.json nie ma ścieżki naprawy

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:319`, `src/main/datastore/store.ts:413`, `src/main/datastore/store.ts:417`, `src/renderer/features/setup/FolderSetup.tsx:35`, `src/main/index.ts:430`

**Co się dzieje.** FI startuje z Windows ukryty w zasobniku (D64), zanim działa OneDrive; fi.json jest „tylko online” (nowy komputer – T123, albo Storage Sense zwolnił miejsce). inspect widzi folder i fi.json ('data'), ale odczyt kończy się błędem → open rzuca „Nie można wczytać fi.json: Nie można odczytać pliku: UNKNOWN: unknown error, read”. Ekran wyboru folderu pokazuje ten tekst, ale przycisk „Spróbuj ponownie” jest tylko dla komunikatów z „niedostępny|pobiera” – tu go nie ma, a nic nie ponawia samo, gdy OneDrive wstanie. Użytkownik musi ręcznie wskazać ten sam folder w oknie wyboru (przypadek „folder niedostępny” ma za to przyjazny tekst i przycisk). Uszkodzony fi.json (np. ręczna edycja, pół-zsynchronizowany) blokuje cały budżet: folder się nie otwiera, choć .history/fi/ i kopie dzienne mają poprawne wersje – aplikacja nie proponuje ich użyć.

**Poprawka.** W openFolder rozpoznawać błąd odczytu fi.json (problemKind 'corrupt' z „Nie można odczytać pliku”) i zwracać komunikat ze słowem „niedostępny” (np. „Plik fi.json jest niedostępny – OneDrive pewnie jeszcze się nie uruchomił. Spróbuj ponownie.”), żeby pojawił się „Spróbuj ponownie”. Opcjonalnie ponawiać openDataDir(dir, false) co 30–60 s, gdy ekran wyboru pokazuje taki komunikat. Przy uszkodzonym fi.json (Uszkodzony JSON / invalid) zaproponować przycisk „Przywróć fi.json z historii” – najnowsza wersja z .history/fi/<id>/, a uszkodzony plik odsunięty jako „-uszkodzona-<czas>”.

## B110. Pełne skanowanie po własnej akcji (Do Kosza, rozstrzygnięcie konfliktu) oznacza cudze zmiany jako „local” – omijają scalanie i tryb „pytaj”

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:987`, `src/main/datastore/store.ts:998`, `src/main/datastore/store.ts:663`, `src/renderer/store/data.ts:205`, `src/renderer/store/data.ts:227`

**Co się dzieje.** Na dysk przyszła zmiana operacji z laptopa, watcher jej jeszcze nie zgłosił. Użytkownik na stronie Synchronizacja klika „Do Kosza” przy pliku z problemem (bez flushSaves). trashFile robi pełny refresh z origin 'local', który wczytuje też cudzą zmianę. W oknie gałąź `!external`: dla rekordu bez niezapisanych edycji wersja jest przyjmowana bez pytania także w trybie „pytaj”; dla rekordu z niezapisaną edycją jest pomijana, a następny autozapis (existing = wersja z laptopa) nadpisuje ją bez kopii „-zewnetrzna-” i bez okna scalania – zmiana z laptopa zostaje tylko w historii.

**Poprawka.** W trashFile i resolveConflict nie robić pełnego skanu z origin 'local': po zmianach w this.files wystarczy w tym samym mutexie `return this.diff(this.buildViews(), settingsWritten, 'local')` – writeState i files.delete już uaktualniły stan. Inne zmiany na dysku zgłosi watcher / sondowanie jako 'external'. Jeśli pełny skan ma zostać, wysyłać go osobno z origin 'external'.

## B111. Usunięcie wpisu z duplikatem id: starsza kopia od razu wraca jako ten wpis

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:885`, `src/main/datastore/store.ts:889`, `src/main/datastore/store.ts:541`, `src/renderer/store/data.ts:206`

**Co się dzieje.** Data operacji zmieniona tu na 16.03, a na laptopie (stara ścieżka 10.03) zmieniona notatka – po synchronizacji są dwa pliki z tym samym id (konflikt „duplikat identyfikatora”). Użytkownik usuwa operację w edytorze: deleteRecord przenosi do Kosza tylko plik najnowszy, buildViews robi rekordem drugi plik, diff wysyła go jako upsert 'local', okno (rekord już nie-dirty) dodaje go z powrotem. Użytkownik widzi toast „Usunięto”, a operacja wraca w starszej wersji (z inną datą).

**Poprawka.** W DataStore.deleteRecord zebrać wszystkie stany 'record' danej kolekcji o tym id (nie tylko currentState): dla każdego history.snapshot(..., 'delete') i trash, potem diff – rekord znika, a obie wersje zostają w historii. Inne wyjście: odmówić z komunikatem „Ta operacja ma drugą kopię (duplikat) – rozstrzygnij ją najpierw na stronie Synchronizacja”.

## B112. Błąd zapisu historii jest połykany bez śladu, a próg 10 min ustawiany przed zapisem blokuje też następną próbę; usunięcie przechodzi bez wersji w historii

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/history.ts:190`, `src/main/datastore/history.ts:201`, `src/main/datastore/history.ts:205`, `src/main/datastore/store.ts:836`, `src/main/datastore/store.ts:888`, `src/main/datastore/store.ts:745`

**Co się dzieje.** Folder .history jest chwilowo nie do zapisu (blokada OneDrive, uprawnienia, pełny dysk). Edycja operacji: snapshot rzuca, łapie wyjątek i zwraca false – nikt nie loguje (żaden wywołujący nie podaje onError), a `lastSnapshot` ustawiony przed zapisem blokuje snapshot kolejnych edycji tego wpisu przez 10 min, choć żadna wersja nie powstała. Usunięcie: snapshot 'delete' zawodzi po cichu, plik idzie do Kosza – „Cofnij” mówi „Tej wersji nie ma już w historii”, „Usunięte wpisy” go nie pokazuje, a T39 przestaje działać: usunięta operacja z banku wraca przy następnym imporcie. Okna obiecują „Poprzednia wersja jest w historii”.

**Poprawka.** W history.ts ustawiać `lastSnapshot` dopiero po udanym `writeFileAtomic`. W DataStore przekazywać onError do `log('warn', 'history snapshot failed', e)`. W `deleteRecord` przy nieudanym snapshocie 'delete' przerwać usunięcie i rzucić błąd po polsku („Nie udało się odłożyć wersji do historii – wpis nie został usunięty”), bo bez tej wersji nie działa ani „Cofnij”, ani T39.

## B113. Obserwator niedostępnego folderu restartuje się co 5 s bez końca i co 5 s pisze błąd ze stosem do main.log

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/watch.ts:127`, `src/main/datastore/watch.ts:136`, `src/main/index.ts:406`, `src/main/log.ts:13`

**Co się dzieje.** Folder danych na pendrive / dysku sieciowym (przypadki wprost przewidziane w kodzie) zostaje odłączony albo użytkownik przeniesie folder / odłączy OneDrive, a aplikacja żyje tygodniami w zasobniku (D64). `watch()` rzuca przy każdym starcie, failed() planuje restart za 5 s, za każdym razem woła onError (log 'warn' ze stosem, synchroniczny appendFileSync w procesie głównym, także na stderr) i pełne odświeżenie. ~17 tys. wpisów na dobę; main.log jest obracany tylko przy starcie aplikacji (1 MB), więc rośnie bez granic, a właściwe wpisy diagnostyczne (T124) toną w powtórzeniach.

**Poprawka.** W FolderWatcher wydłużać przerwę restartu (5 s → 10 s → … → 5 min, wyzerować po udanym `attachNative`). Logować pierwszy błąd i potem najwyżej raz na godzinę (np. licznik powtórzeń w jednym wpisie). W log.ts sprawdzać rozmiar pliku co N wpisów albo co godzinę i obracać go także w trakcie pracy.

## B114. config.json: każdy błąd odczytu (nie tylko brak pliku) daje ustawienia domyślne, a pierwszy zapis nadpisuje prawdziwe – znika autostart, folder danych, folder ICTTJ, token, skrót

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/config.ts:70`, `src/main/config.ts:82`, `src/main/config.ts:92`, `src/main/index.ts:958`, `src/main/index.ts:962`, `src/main/tray.ts:106`, `src/main/index.ts:860`

**Co się dzieje.** Przy starcie z Windows antywirus albo narzędzie kopii trzyma chwilowo %APPDATA%\Financial Intel\config.json (EBUSY/EPERM) albo plik jest uszkodzony po zaniku zasilania. load() łapie każdy wyjątek i przyjmuje DEFAULTS. Zaraz potem whenReady wywołuje applyLoginItem z launchAtLogin=false – wpis autostartu w rejestrze zostaje usunięty; okno pokazuje ekran pierwszego uruchomienia („Kapitanie, gdzie trzymamy dziennik pokładowy?”), bo dataDir=null; skrót wraca do Ctrl+Alt+B. Pierwszy zapis w tej sesji (np. położenie okna przy schowaniu do zasobnika) zapisuje domyślne wartości na dysk: na stałe znikają folder danych, ostatnie foldery, folder i program ICTTJ, token aktualizacji, ustawienia powiadomień i dźwięków, folder kopii – bez kopii starego pliku. Powinno: przy błędzie innym niż ENOENT ponowić odczyt, a gdy się nie uda – nie nadpisywać pliku i nie ruszać autostartu.

**Poprawka.** Rozróżnić ENOENT (pierwsze uruchomienie, DEFAULTS) od innych błędów: odczyt przez withRetry (jak przy zapisach), uszkodzony JSON odłożyć jako config.uszkodzony-<czas>.json i dopiero wtedy przyjąć wartości domyślne. Gdy odczyt nie powiódł się z innego powodu, ustawić flagę `loadFailed`, która blokuje update() (zapis na dysk) i applyLoginItem do udanego ponownego odczytu, a w oknie pokazać komunikat z „Spróbuj ponownie”.

## B115. Własny folder kopii (backupDirOverride) jest wspólny dla wszystkich folderów danych komputera – kopia dzienna drugiego folderu się nie robi, a „kopia z dziś” bywa innym budżetem

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:379`, `src/main/index.ts:631`, `src/main/datastore/backup.ts:52`, `src/main/datastore/backup.ts:56`, `src/main/datastore/backup.ts:44`, `src/renderer/features/settings/SettingsPage.tsx:299`, `src/renderer/features/settings/SettingsPage.tsx:316`

**Co się dzieje.** Użytkownik ustawił „Zmień folder kopii…” na D:\Kopie (ustawienie komputera) i ma dwa foldery danych – budżet i folder testowy z „Nowe dane w innym folderze…” albo rozpakowaną kopię. Rano otwiera najpierw folder testowy: powstaje D:\Kopie\daily\2026-10-18.zip z danymi testowymi. Potem przełącza na prawdziwy budżet: runBackups widzi plik z dzisiejszą nazwą i pomija kopię – budżet nie ma kopii z tego dnia. Rotacja (30 dziennych / 10 przed importem / 5 ręcznych) liczy pliki obu folderów razem, więc importy w folderze testowym wypychają kopie budżetu. Przy przywracaniu według instrukcji w Ustawieniach („rozpakuj ZIP do pustego folderu”) można odtworzyć nie ten budżet. Powinno: kopie każdego folderu osobno.

**Poprawka.** Gdy jest backupDirOverride, kopie trzymać w podkatalogu danego folderu danych, np. join(override, `${safe(shipName)}-${sha1(root).slice(0,8)}`), ustawianym w DataStore.backupsDir. Wtedy kopia dzienna, rotacja i listBackups liczą się dla każdego folderu osobno. W Ustawieniach pokazywać, z którego folderu jest kopia.

## B116. Heartbeat i odświeżenie przy fokusie wysyłają do okna zmiany starego folderu po przełączeniu

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:268`, `src/main/index.ts:904`, `src/main/index.ts:244`, `src/main/index.ts:401`

**Co się dzieje.** heartbeat zapamiętuje `const s = store`, potem czeka na writePresence/readOtherMachines (OneDrive – może trwać). Jeśli w tym czasie openFolder przełączy folder, `send(await s.refresh([]))` wysyła ChangeSet zamkniętego magazynu: okno przyjmuje status (dataDir, readOnly, otherMachines), problemy i konflikty starego folderu jako bieżące (np. baner tylko do odczytu blokuje edycję nowego folderu albo odwrotnie), a writePresence zostawia w starym folderze świeżą obecność po clearPresence. Tak samo `win.on('focus')` → pełny refresh starego magazynu, gdy okno dostaje fokus po zamknięciu okna wyboru folderu: jeśli w starym folderze coś się zmieniło, jego rekordy trafiają do pamięci nowego folderu (origin 'external' → take) i po edycji zapisałyby się do nowego.

**Poprawka.** W heartbeat po każdym await sprawdzać `if (s !== store) return` (także przed writePresence, żeby nie zostawić obecności po clearPresence). W focus: `const s = store; s?.refresh().then((c) => s === store && send(c))`. Najprościej przyjmować w send magazyn źródłowy i porzucać zmiany magazynu, który nie jest bieżący.

## B117. openFolder zwraca błąd już po przełączeniu magazynu (zapis config.json)

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:391`, `src/main/index.ts:418`, `src/main/index.ts:425`

**Co się dzieje.** Przełączenie na folder B: closeStore, store = B, watcher i heartbeat już działają, potem `await config.rememberDir(target)`. Jeśli zapis config.json się nie uda (pełny dysk userData, plik zablokowany ponad retry), wyjątek trafia do catch → okno dostaje {ok:false, reason:'error'} i zostaje z danymi folderu A, a main pracuje już na B. Każdy kolejny zapis rekordu/ustawień z okna trafia do B (mieszanie budżetów), a dataDir w config.json wskazuje dalej A.

**Poprawka.** rememberDir wykonać w try/catch tylko z logiem (folder jest już otwarty i działa; najwyżej przy następnym starcie otworzy się poprzedni), albo przenieść go przed closeStore. Po przełączeniu magazynu zawsze zwracać ok:true.

## B118. Szybki wpis: po podziale paragonu i zmianie rodzaju na „Wpływ” zapis blokuje niewidoczny podział

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/renderer/features/quick/QuickApp.tsx:182`, `src/renderer/features/quick/QuickApp.tsx:239`, `src/renderer/features/quick/QuickApp.tsx:292`

**Co się dzieje.** Wydatek 100 zł → „+” (podział na [100, 0]) → zmiana na „Wpływ” i kwota 150 zł. Linie podziału są ukryte dla wpływu, ale save() nadal sprawdza ich sumę: „Części paragonu nie sumują się do kwoty.” – w oknie nie ma czego poprawić; trzeba wrócić na „Wydatek” i kliknąć „bez podziału”.

**Poprawka.** W onChange Segmented przy kind === 'income' wywołać setLines([]), albo w save sprawdzać sumę tylko dla d.kind !== 'income' i wysyłać splits: d.kind !== 'income' && lines.length > 1 ? lines : [].

## B119. Start ukryty z systemem gubi maksymalizację okna

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:835`, `src/main/index.ts:869`

**Co się dzieje.** Okno było zmaksymalizowane, aplikacja startuje z Windows w zasobniku (--hidden): pendingMaximize=true, maximize() odłożone do pierwszego pokazania. Jeśli użytkownik zakończy aplikację z zasobnika bez otwierania okna (albo przyjdzie aktualizacja), zamknięcie zapisuje `maximized: win.isMaximized()` = false i następny start otwiera okno niezmaksymalizowane.

**Poprawka.** W obu zapisach (index.ts:860 i :871) zapisywać `maximized: win.isMaximized() || pendingMaximize`. pendingMaximize jest zerowane przy pierwszym pokazaniu, więc po pokazaniu liczy się rzeczywisty stan okna.

## B120. Sprawdzanie folderu ICTTJ w rodzicach wywala otwieranie, gdy rodzica nie można wylistować

Priorytet: niski – do potwierdzenia (jeden z dwóch weryfikatorów nie odtworzył) · obszar: proces główny i okna

Gdzie: `src/main/index.ts:439`, `src/main/datastore/store.ts:187`

**Co się dzieje.** Folder danych na udziale sieciowym/NAS albo w ścieżce, w której użytkownik ma prawo przejścia przez katalog nadrzędny, ale nie jego listowania (np. \\nas\home\ania\FinancialIntel, gdzie \\nas\home nie jest listowalny). insideIctj woła DataStore.inspect dla każdego rodzica; inspect po sprawdzeniu fi.json/journal.json robi fs.readdir bez try → EACCES/EPERM → openFolder kończy się błędem „EPERM: operation not permitted, scandir …” i poprawnego folderu nie da się otworzyć.

**Poprawka.** W insideIctj sprawdzać tylko `await pathExists(join(d, 'journal.json'))` i każdy błąd dostępu traktować jako „nie ICTTJ”. Dodatkowo w DataStore.inspect objąć fs.readdir blokiem try: przy błędzie zwracać 'other' albo przekazywać czytelny komunikat po polsku.

## B121. Folder kopii zapasowych można ustawić w folderze danych ICTTJ

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:623`, `src/main/index.ts:337`, `src/main/index.ts:673`

**Co się dzieje.** Ustawienia → Folder i kopie → „Zmień folder kopii…” → użytkownik wskazuje folder ICT Trade Journal (obok na OneDrive). FI zaczyna zapisywać tam daily/, manual/, pre-import/ z ZIP-ami (i usuwać nadmiarowe pliki przy rotacji) – wbrew zasadzie, że FI nigdy nie zapisuje w folderze danych ICTTJ (openFolder i ictjSetDir tego pilnują, setBackupDir nie).

**Poprawka.** (1) W setBackupDir odrzucać folder, który jest folderem ICTTJ albo leży w nim (`DataStore.inspect(dir) === 'ictj' || insideIctj(dir)`), z komunikatem jak w openFolder. (2) Ważniejsze, bo obejmuje też wspólny folder kopii obu programów: rotate()/list() w FI powinny dotykać tylko plików z nazwami FI (daily: /^\d{4}-\d{2}-\d{2}\.zip$/, manual/pre-import: /^\d{4}-\d{2}-\d{2}_\d{6}\.zip$/) albo trzymać kopie w podfolderze z nazwą aplikacji (np. <folder>/FinancialIntel/daily) – wtedy obce pliki ZIP nigdy nie są usuwane.

## B122. Pobrana aktualizacja przepada do restartu, gdy ręczne „Sprawdź” znajdzie nowszą wersję, a jej pobieranie się nie uda

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/update/updater.ts:225`, `src/main/update/updater.ts:229`, `src/main/update/updater.ts:231`, `src/main/update/updater.ts:312`, `src/main/update/updater.ts:359`, `src/main/update/updater.ts:117`

**Co się dzieje.** Wersja 1.2.0 pobrana (faza ready, baner „Uruchom ponownie teraz”). Na GitHubie wychodzi 1.3.0, użytkownik klika w Ustawieniach „Sprawdź teraz” (albo zapisuje token – tokenChanged → check(true)). check widzi pending 1.2.0 ≠ 1.3.0 → faza 'available' i pobieranie w tle; połączenie się zrywa → faza 'error'. Plik 1.2.0 i wpis pending zostają, ale applyOnQuit wymaga fazy 'ready', więc zamknięcie aplikacji niczego nie instaluje, baner gotowej aktualizacji znika, a Ustawienia pokazują błąd. Dopiero po ponownym uruchomieniu init uzna 1.2.0 za gotową. Powinno: nieudane pobranie nowszej wersji wraca do gotowej poprzedniej.

**Poprawka.** Nie opuszczać fazy 'ready', dopóki nowsza wersja nie zostanie pobrana. W check(): przy previous === 'ready' i nowszym wydaniu zostawić phase 'ready' (release = pending) i tylko zapamiętać this.latest, a pobieranie w tle niech zmienia fazę na 'ready' dopiero po sukcesie (savePending). W catch doDownload: jeśli this.deps.pending() wskazuje istniejący plik wersji nowszej od bieżącej o zgodnej sumie, wrócić do phase 'ready' z release z pending, a błąd pokazać jako uwagę. Alternatywnie applyOnQuit opierać na ważnym pending (wersja > bieżąca, plik istnieje, SHA-256), a nie na fazie.

## B123. Nieudana kopia dzienna (np. folder kopii na odłączonym dysku) zostawia tylko wpis w logu – użytkownik nie wie, że kopie nie powstają

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:413`, `src/main/index.ts:415`, `src/renderer/features/settings/SettingsPage.tsx:277`, `src/renderer/features/settings/SettingsPage.tsx:299`

**Co się dzieje.** Folder kopii ustawiony na dysk USB albo udział sieciowy (Ustawienia podpowiadają „np. dysk lokalny zamiast OneDrive”). Dysk jest odłączony przez tygodnie: każda kopia dzienna kończy się błędem, który trafia tylko do main.log („backup failed”). Ustawienia → Kopie pokazują starą listę bez ostrzeżenia, tekst nadal mówi „Przy każdym starcie raz dziennie ZIP”. Kopia przed importem przy tym samym błędzie zatrzyma import (to widać), ale kopie dzienne (D31) po cichu nie istnieją.

**Poprawka.** Zapamiętać w main wynik ostatniej kopii dziennej (czas, błąd) i podawać go w FolderStatus (np. `backup: {lastOkAt, error}`). W Ustawieniach → Kopie pokazać ostrzeżenie „Ostatnia kopia dzienna: N dni temu – folder X niedostępny”, a po kilku dniach bez kopii baner albo powiadomienie.

## B124. Awaria renderera okna szybkiego wpisu (lub panelu odłączonego) nie jest obsługiwana – skrót pokazuje martwe okno aż do restartu

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:1009`, `src/main/index.ts:1013`, `src/main/quick.ts:63`, `src/main/quick.ts:64`, `src/main/detach.ts:72`

**Co się dzieje.** Renderer okna szybkiego wpisu pada (awaria GPU, brak pamięci). Proces główny tylko loguje „okno przestało działać (inne)”. QuickEntry.ensure() sprawdza wyłącznie isDestroyed(), więc kolejne Ctrl+Alt+B pokazuje to samo martwe, bezramkowe okno nad wszystkimi – bez przycisku zamknięcia (frame: false), Esc nie działa; zostaje Alt+F4 albo restart aplikacji. Panel odłączony podobnie zostaje pusty do ręcznego zamknięcia.

**Poprawka.** W QuickEntry.ensure(): `win.webContents.on('render-process-gone', (_e, d) => { if (d.reason === 'clean-exit') return; this.d.log('warn', …); if (this.win === win) this.win = null; win.destroy() })` – następny show() utworzy nowe okno. W detach.ts analogicznie: przy awarii zamknąć okno (win.destroy()), a 'closed' wyśle fi:detachClosed.

## B125. Otwarty szybki wpis nie odświeża danych (kategorie, konta, energia, tylko do odczytu), a zapis nie sprawdza, czy konto i kategoria nadal istnieją

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/renderer/features/quick/QuickApp.tsx:72`, `src/main/quick.ts:104`, `src/main/quick.ts:107`, `src/renderer/store/quickHost.ts:105`, `src/renderer/store/quickHost.ts:155`

**Co się dzieje.** Okno szybkiego wpisu nie chowa się po utracie fokusu i zostaje nad wszystkimi. Gdy w tym czasie w głównym oknie zarchiwizujesz kategorię lub konto, przełączysz folder albo folder stanie się tylko do odczytu (nowsza wersja na drugim komputerze), okno dalej pokazuje stare listy, energię i podgląd. Zapis przechodzi z kategorią zarchiwizowaną albo z kontem spoza listy kont bieżącego folderu (po przełączeniu – kontem innego budżetu).

**Poprawka.** (1) Główne okno wysyła odświeżenie bez resetu szkicu: w initQuickHost subskrypcja useData (phase, fi.settings, status.readOnly, records.transactions) i useMachine. Po zmianie, z throttlingiem ~500 ms (quickData sortuje wszystkie wydatki – przy 150 tys. operacji nie wolno tego liczyć przy każdej zmianie rekordu), wywołanie np. api.quickUpdate(quickData()). Proces główny przekazuje je kanałem 'fi:quickUpdate' tylko wtedy, gdy quick.isOpen. W QuickApp: gdy poprzednie data było null, pełny reset jak dziś; w przeciwnym razie tylko setData(next), a jeśli d.accountId nie ma w next.accounts – ustawić next.accountId, a kategorię albo część paragonu spoza next.categories wyczyścić z komunikatem „Lista kont / kategorii się zmieniła – sprawdź wybór”. (2) W onQuickAdd (quickHost.ts) odrzucać accountId spoza fi.settings.accounts i categoryId (także w splits) spoza fi.settings.categories komunikatem „Lista kont się zmieniła – wybierz konto ponownie.”. Zarchiwizowane można przepuszczać, bo są nieszkodliwe.

## B126. Pensja miesiąca startu (T45): zwroty sprzed startu ją zwiększają, a kreator zapowiada inną kwotę niż wypłaca silnik

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:575`, `src/shared/calc/fleet.ts:579`, `src/renderer/features/wizard/WizardPage.tsx:53`, `src/renderer/features/wizard/state.ts:122`

**Co się dzieje.** (a) Budżet startuje 18.10, pensja w planie 4 000 zł. 3.10 (przed startem) był zwrot towaru +800 zł i żadnych innych kosztów. `startMonthSpent` = −800, więc `due = Math.max(0, salary - startMonthSpent)` = 4 800 zł. Z osłon do energii idzie więcej niż pensja z planu, choć T45 mówi o pomniejszeniu, a zwrot jest już w saldzie otwarcia (liczony podwójnie). (b) Start 15.10, pensja 4 000 zł; 5.10 zapłacono OC 1 200 zł, 6.10 zakupy za 300 zł. Kreator pisze „pierwsza pensja na resztę miesiąca to 2 500 zł”. Kreator dodaje kontener OC i łączy z nim płatność, a silnik zgodnie z T45 (bez opłat okresowych) wypłaca 3 700 zł. Plan miesiąca pokazuje potem „Wypłacono: 3 700 zł”.

**Poprawka.** Wydzielić regułę T45 do wspólnej funkcji (np. `startMonthSpent(transactions, start, containers)` w calc/start.ts albo fleet.ts) i użyć jej w silniku i w kreatorze, z kontenerami istniejącymi plus wybranymi w kroku ładowni (`w.cargo`, cykl > 1, dopasowanie po kontrahencie jak w linkPayments). Notatkę pokazywać też w kroku ładowni albo podsumowaniu, gdzie wybór jest znany. Ograniczanie wyniku do [0, pensja] nie jest potrzebne: ujemne koszty netto są zgodne z T45.

## B127. Kreator: saldo otwarcia z salda „teraz” odejmuje też operacje z przyszłą datą – saldo konta trwale zawyżone

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/shared/calc/start.ts:285`, `src/renderer/features/wizard/state.ts:114`

**Co się dzieje.** Przed kreatorem użytkownik wpisał zaplanowaną płatność −2 000 zł z datą za tydzień (DateField nie ma limitu daty). W kreatorze podaje saldo w banku teraz: 10 000 zł. `openingFromNow` odejmuje wszystkie operacje z datą ≥ dziś, także przyszłe, więc saldo otwarcia = 12 000 zł. Dziś silnik pokazuje 12 000 zł zamiast 10 000, a po dniu płatności 10 000 zł, gdy w banku jest 8 000 zł. Błąd 2 000 zł zostaje do korekty przy potwierdzeniu salda.

**Poprawka.** W openingFromNow odejmować tylko `t.date === today`. W kreatorze (krok 0) ostrzegać, gdy na koncie są operacje z datą po dziś.

## B128. ETA celów liczone z „tempa”, które obejmuje przydział środków na starcie budżetu

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/shared/calc/goals.ts:95`, `src/shared/calc/goals.ts:103`, `src/shared/calc/fleet.ts:744`, `src/shared/calc/fleet.ts:750`

**Co się dzieje.** Budżet bez kreatora (start = najwcześniejsze saldo otwarcia 1.03, `initial` = null): 60 000 zł na starcie dokuje kolejnością i 42 000 zł trafia do celu „Mieszkanie” (100 000 zł). goalInflow liczy zdarzenie 'start' jako wpłatę do celów w marcu, bo start jest 1. dnia i marzec jest pełnym miesiącem. Średnie tempo wynosi 21 000 zł / mies., a ETA wychodzi „2026-08”, choć rzeczywiste wpłaty do celów to 0 zł miesięcznie. To samo stanie się po dodaniu celów do kroku 5 kreatora (`budget.initial.goals`) przy starcie 1. dnia miesiąca. Komentarz funkcji mówi o „dostawach i łupach”.

**Poprawka.** W goalInflow pomijać zdarzenia `kind` 'start', 'account' i 'household' (przydział środków na starcie i dołączenie konta to nie tempo), czyli liczyć tylko dostawy (income / trading / loan) i łupy.

## B129. Dwa komputery: potwierdzenie salda przed synchronizacją OneDrive dodaje drugą, identyczną korektę

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/renderer/features/balances/actions.ts:28`, `src/renderer/features/balances/actions.ts:44`, `src/shared/calc/balances.ts:54`, `src/shared/calc/balances.ts:63`

**Co się dzieje.** Niedziela, laptop: potwierdzenie salda mBanku 5 230 zł przy wyliczonym 5 180 zł daje korektę +50 zł. Laptop zostaje uśpiony, zanim OneDrive wyśle pliki. W poniedziałek komputer stacjonarny nadal pokazuje „Potwierdź salda” (nie widzi potwierdzenia), więc użytkownik potwierdza to samo saldo jeszcze raz. Komputer nie widzi korekty z laptopa i dodaje drugą korektę +50 zł z nowym id. Po synchronizacji są dwie korekty: saldo konta i osłony są o 50 zł wyższe niż w banku, a odprawa pokazuje dwie „Rozbieżności w ładowni”. Dopiero kolejne potwierdzenie dodaje trzecią korektę −50 zł. CLAUDE.md zakłada pracę na kilku komputerach na zmianę, więc opóźnienie OneDrive jest zwykłą sytuacją.

**Poprawka.** Korekta z potwierdzenia z deterministycznym id (konto + dzień), żeby to samo potwierdzenie tego samego dnia scaliło się jako jeden rekord. Dodatkowo w panelu duplikatów albo w odprawie pokazywać „możliwą podwójną korektę”: dwie korekty jednego konta o tej samej kwocie w odstępie kilku dni, z potwierdzeniami z różnych komputerów (`updatedBy`), z których późniejsza powstała bez wcześniejszej w danych. Propozycja usunięcia z „Cofnij”.
