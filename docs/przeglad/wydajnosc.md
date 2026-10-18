# Przegląd 1.4.1 – Wydajność i duże dane: szczegóły

Lista do odhaczania i podsumowanie: [README.md](README.md). Każde znalezisko sprawdzone w kodzie; błędy przez dwóch niezależnych weryfikatorów (prześledzenie kodu i sonda – test na kodzie aplikacji), pozostałe przez jednego.

## W1. Zapis importu: każda operacja osobnym saveRecord – w main O(N) na zapis, w oknie kopia mapy, silnik i pełny render po każdym

Priorytet: wysoki · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, import (ekran), folder danych i synchronizacja

Gdzie: `src/renderer/features/import/state.ts:460`, `src/renderer/features/import/state.ts:461`, `src/renderer/features/import/state.ts:486`, `src/renderer/features/import/state.ts:487`, `src/renderer/store/data.ts:517`, `src/renderer/store/data.ts:406`, `src/renderer/store/data.ts:408`, `src/main/datastore/store.ts:807` …

**Co się dzieje.** runImport robi addRecords + replaceRecords, a te dają scheduleSave(…, 0) dla KAŻDEGO rekordu, więc idzie K osobnych IPC saveRecord. W main każdy zapis (pod mutexem, kolejno) kończy się buildViews() + diff() + commit() po WSZYSTKICH plikach folderu, czyli O(N). W rendererze każda odpowiedź w runSave kopiuje całą mapę transakcji ({...mapOf}) i podmienia `records`. App subskrybuje `records` (useGameAdvance) i nic nie jest memoizowane, więc renderuje się całe drzewo: TrayStatus → useFleet → computeFleet, useGameAdvance → advanceGame, a ekran importu wciąż ma plan (czyszczony dopiero po flushSaves), więc renderuje się cała lista grup. Każde zakończenie zapisu to osobne zadanie IPC, więc React niczego nie łączy. Złożoność: O(K·N) w main + O(K·(N + render)) w oknie. Szacunki: zwykły import z 3 dni – przy 30 tys. ≈25–30 nowych + rozliczone ≈ 30 × ~0,25 s ≈ 8 s; przy 150 tys. ≈120 × ~0,9–1,5 s ≈ 2–3 min. Pierwszy import roku w kreatorze (pusty budżet, ale 576 grup na ekranie): 3000 zapisów × render listy 0,3–0,6 s ≈ 15–30 min; przy 15 000 wierszy i 1975 grupach ≈ 1,2 s × 15 000, czyli praktycznie zawieszenie.

**Poprawka.** 1) W DataStore nowe wsadowe `saveRecords(collection, records)`: jeden mutex, dla każdego rekordu walidacja, updatedAt/updatedBy, snapshot historii 'edit', zapis pliku, a na końcu JEDEN buildViews/diff (jak importRecords, który jednak zachowuje updatedAt). Podobnie `deleteRecords` dla result.remove. 2) W rendererze addRecords / replaceRecords przez to IPC i jeden set() z wszystkimi wpisami z odpowiedzi. 3) W runImport schować listę grup przed zapisem (osobny stan „Zapisuję…” albo plan = null z zachowaną kopią do wyniku), żeby zapisy nie renderowały ekranu z planem. 4) W applyChange nie kopiować mapy, gdy zmiana niczego w niej nie zmienia.

To samo zgłoszone też jako: „Operacja zbiorcza = osobne przeliczenie całej aplikacji dla każdego zapisanego rekordu (import, „Ustaw kategorię”, scalanie duplikatów, Cofnij)”; „Każdy zapisany rekord tworzy nową mapę kolekcji i przelicza całą aplikację, więc decyzja zbiorcza w Operacjach zamraża okno na minuty”; „Każdy zapisany rekord wraca do magazynu osobno i liczy cały silnik jeszcze raz – zmiana kolejności celów, pożyczka czy spłata to kilka pełnych przeliczeń”; „Import zapisuje każdy wiersz osobnym IPC – K × (pełna przebudowa widoków w main + kopia mapy i przeliczenie silnika w rendererze)”.

## W2. Pola tekstowe edytora operacji i kontenera zapisują rekord przy każdym znaku (wbrew T34) – każdy znak przelicza silnik, grę i ekran

Priorytet: wysoki · obszar: całość, domownicy i ICTTJ, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, silnik budżetu

Gdzie: `src/renderer/components/ui.tsx:158`, `src/renderer/components/ui.tsx:197`, `src/renderer/features/operations/OperationEditor.tsx:206`, `src/renderer/features/operations/OperationEditor.tsx:210`, `src/renderer/features/operations/OperationEditor.tsx:316`, `src/renderer/features/operations/OperationEditor.tsx:326`, `src/renderer/features/cargo/CargoPage.tsx:162`, `src/renderer/features/cargo/CargoPage.tsx:204` …

**Co się dzieje.** 30 tys. operacji, edytor operacji: użytkownik wpisuje 30-znakową notatkę. TextField i TextArea wołają onChange przy każdym znaku, a patch od razu robi updateRecord. Na każdy znak przypada: kopia mapy transactions (15 ms), render całego drzewa (App subskrybuje records w useGameAdvance), computeFleet (140–230 ms), advanceGame, kilka przebiegów Object.values (po 15 ms), memo listy (27 ms w widoku miesiąca) i findDuplicates (0,4 s). Razem ok. 0,7–0,9 s na znak, czyli ok. 25 s na notatkę, z widocznym opóźnieniem tekstu. Każdy zakończony zapis powtarza ten łańcuch. Przy 150 tys. to ponad 9 s na znak. W Ładowni (nazwa, odbiorca w banku, notatka kontenera → patchContainer przy każdym znaku) wychodzi ok. 0,4 s / ponad 3 s na znak, z recurringPayments włącznie. T34 mówi, że nazwy zapisują się po wyjściu z pola. Nazwa kontenera i kontrahent tego nie robią – takie zachowanie jest tylko w AmountField, DateField i TimeField.

**Poprawka.** W edytorach rekordów (operacja, część paragonu, podział wpłaty, kontener) zrobić z TextField i TextArea szkic jak w AmountField: stan lokalny, zapis po wyjściu z pola, Enter dla input i Ctrl+Enter dla textarea. commitActiveField (T34) już zapisuje aktywne pole przy zmianie ekranu, wyborze innego wpisu i flushSaves, więc nic nie ginie. Jeśli zapis ma być w trakcie pisania: debounce 400 ms w komponencie pola, nie w magazynie. Niezależnie warto naprawić #1 (jedna aktualizacja na odpowiedź zapisu).

To samo zgłoszone też jako: „Pola tekstowe edytorów zapisują rekord przy każdym znaku – każdy znak kopiuje mapę i przelicza wszystko”; „Każda litera w polu tekstowym edytora operacji przelicza cały silnik budżetu (a po autozapisie drugi raz)”; „Mapa gwiezdna: termin celu (`<input type="month">`) zapisuje rekord przy każdym zdarzeniu input – pełne przeliczenie przy każdym klawiszu i chwilowe „po terminie””; „Mapa gwiezdna: termin celu zapisuje się przy każdej zmianie pola miesiąca, co uruchamia pełny silnik i grę”.

## W3. Każda edycja i każde usunięcie przelicza aplikację dwa razy (echo zapisu z dysku)

Priorytet: wysoki · obszar: całość

Gdzie: `src/renderer/store/data.ts:405`, `src/renderer/store/data.ts:415`, `src/renderer/store/data.ts:401`, `src/renderer/store/data.ts:228`, `src/main/index.ts:507`

**Co się dzieje.** Zmiana jednej kwoty (wyjście z pola) → updateRecord: zmiana `records` i pełne przeliczenie. Około 400 ms później odpowiedź zapisu w runSave podmienia wpis na wersję z nowym updatedAt / updatedBy / relPath → nowa mapa (kopia całości) i drugie pełne przeliczenie z tym samym wynikiem. To samo dla fi.json (set({ fi: saved })). Przy usunięciu: deleteRecord usuwa wpis z mapy, a echo z main (origin local) w applyChange woła `delete mapFor(collection)[id]`. mapFor kopiuje całą mapę, choć wpisu już nie ma → drugie przeliczenie. Każda interakcja kosztuje więc 2×.

**Poprawka.** 1) W runSave przy zgodnej wersji nie podmieniać rekordu w reaktywnej mapie, gdy różni się tylko updatedAt / updatedBy / relPath. Te pola trzymać w osobnej, niereaktywnej mapie (albo w `bases`) i odczytywać przy następnym zapisie lub scalaniu. 2) `drafts` kopiować tylko, gdy zawiera target.id. 3) W applyChange przy origin 'local' i removal sprawdzić `id in mapOf(s, c)` przed mapFor; przy upsert kopiować mapę tylko przy innej treści. 4) Odpowiedzi zapisów z jednej operacji zbiorczej zbierać i stosować jednym set (np. w mikrozadaniu lub co klatkę), a nie K razy. 5) Dla fi: po zapisie zachować bieżący obiekt, jeśli treść się nie zmieniła (porównanie bez pól księgowych).

## W4. Operacje: „Możliwe duplikaty” liczone od nowa przy każdej zmianie operacji – każdy znak w edytorze uruchamia findDuplicates na całej historii

Priorytet: wysoki · obszar: całość, Operacje, Plan, Ładownia, kreator, import (ekran), import (logika)

Gdzie: `src/renderer/features/operations/OperationsPage.tsx:211-212`, `src/renderer/features/operations/OperationsPage.tsx:443`, `src/renderer/features/import/DuplicatesPanel.tsx:23-36`, `src/renderer/features/operations/OperationsPage.tsx:211`, `src/renderer/features/import/DuplicatesPanel.tsx:23`, `src/renderer/features/import/DuplicatesPanel.tsx:36`, `src/renderer/features/operations/OperationsPage.tsx:212`, `src/shared/import/duplicates.ts:123` …

**Co się dzieje.** Ekran Operacje, 30 tys. operacji, użytkownik pisze notatkę albo poprawia kontrahenta wybranej operacji. Każdy znak to updateRecord, czyli nowa mapa records.transactions. DuplicatesLink jest zawsze zamontowany w pasku sum, a memo useDuplicates zależy od [records, drafts, dismissed, dockings]. Dlatego przy każdym znaku liczą się od nowa Object.entries + Object.values + findDuplicates po wszystkich operacjach: ok. 0,4 s (30 tys.) / 7,7 s (150 tys.). Po ok. 400 ms dochodzi to samo jeszcze raz, bo zakończony zapis tworzy nową mapę. To samo dzieje się po Ctrl+N (nowy szkic zmienia drafts), po porzuceniu szkicu przy wyborze innej operacji (discardDraft) i przy każdym zapisie partii. Duplikatów nie zmienia ani notatka, ani pusty szkic z kwotą 0, a i tak liczą się w całości. Oczekiwane: licznik duplikatów nie blokuje pisania.

**Poprawka.** Usunąć `drafts` z zależności, bo szkic z kwotą 0 i bez bank nie wpływa na wynik findDuplicates (wystarczy przekazać wszystkie rekordy). Na ekranie Operacje licznik liczyć leniwie (requestIdleCallback / opóźnienie 1–2 s po ostatniej zmianie), pokazując poprzedni wynik. Docelowo przyrostowo: kubełki konto|bank.key i konto|data utrzymywane między zmianami, a przeliczane tylko kubełki zmienionych rekordów. Memo oprzeć na sygnaturze pól używanych przez findDuplicates zamiast na tożsamości mapy.

To samo zgłoszone też jako: „Lista Operacji liczy duplikaty od nowa przy każdej zmianie jakiejkolwiek operacji (DuplicatesLink)”; „findDuplicates przelicza cały folder przy każdej edycji operacji (link „Możliwe duplikaty” na ekranie Operacje), a podobieństwo nazw liczy przed sprawdzeniem kwoty”; „Duplikaty: findDuplicates liczone od nowa przy każdej zmianie mapy operacji; scalanie usuwa kopie pojedynczo z dwoma przeliczeniami na kopię”.

## W5. Każda zmiana `records` (znak w polu, potwierdzenie zapisu, lokalne usunięcie) kopiuje mapę całej kolekcji i przelicza cały silnik budżetu i grę

Priorytet: wysoki · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, folder danych i synchronizacja

Gdzie: `src/renderer/store/data.ts:486`, `src/renderer/store/data.ts:501`, `src/renderer/components/ui.tsx:158`, `src/renderer/features/operations/OperationEditor.tsx:206`, `src/renderer/store/fleet.ts:68`, `src/renderer/app/App.tsx:237`, `src/renderer/store/game.ts:37`, `src/renderer/store/data.ts:407` …

**Co się dzieje.** Użytkownik wpisuje w edytorze operacji kontrahenta albo tytuł (TextField woła onChange przy każdym znaku → patch → updateRecord). Każdy znak: (1) `{ ...mapOf(s, collection), [id]: … }` kopiuje mapę całej kolekcji, (2) powstaje nowy obiekt `records`, więc zawsze zamontowany `TrayStatus` przez useFleet liczy computeFleet od nowa, a efekt useGameAdvance w App woła advanceGame(gameInputOf(...)) (Object.values wszystkich kolekcji). Przy 30 tys. to ok. 18 ms kopii + 140–230 ms silnika (+ gra) na znak – wpisanie „Biedronka” to ~2 s opóźnień; przy 150 tys. 170 ms kopii + 85 ms Object.values + 630–780 ms silnika ≈ 1 s na znak. Do tego 400 ms później zapis wraca z main z nowym updatedAt/updatedBy, a runSave znowu kopiuje mapę i ustawia nowy `records` – drugi pełny przelicznik, choć treść się nie zmieniła; przy usunięciu deleteRecord kopiuje mapę, a ChangeSet 'local' z main w applyChange woła `mapFor` (trzecia kopia) i `delete` na id, którego już nie ma → drugi przelicznik. Podczas ciągłego pisania autozapis co ≤ 2 s dokłada ~1 s zamrożenia renderera co 2 s przy 150 tys.

**Poprawka.** 1) TextField / TextArea w edytorach rekordów: wartość w stanie lokalnym, zapis do magazynu po wyjściu z pola albo po ~300–500 ms bez pisania (jak AmountField; commitActiveField już istnieje dla flush). 2) useGameAdvance przenieść z App do osobnego komponentu zwracającego null, żeby zmiana `records` nie renderowała całego drzewa; silnik i grę liczyć z useDeferredValue / w bezczynności. 3) Memo silnika kluczować referencjami kolekcji, których używa (records.transactions, containers…), a nie całym `records`. 4) runSave: gdy main zwrócił tę samą treść i ścieżkę (sameContent bez znaczników), nie podmieniać wpisu w `records`. applyChange: kopiować mapę tylko, gdy id w niej jest albo wpis się różni (usunięcie już usuniętego = brak zmiany).

To samo zgłoszone też jako: „Każdy ekran osobno zamienia mapę 30–150 tys. rekordów na tablicę, a każda zmiana kopiuje całą mapę (ok. 100 / 700 ms na edycję przed jakimkolwiek obliczeniem)”; „Każda zmiana rekordu kopiuje całą mapę kolekcji i kilka razy buduje tablicę wszystkich operacji”; „Każda zmiana rekordu buduje od nowa wiele kopii tych samych tablic z map (Object.values) – osobno w każdym hooku”.

## W6. Ładownia: recurringPayments jest kwadratowe (kopiuje tablicę grupy przy każdej operacji), liczy się od nowa przy każdym znaku w kontenerze, a „Połącz płatności” skanuje wszystkie operacje przy każdym renderze

Priorytet: wysoki · obszar: Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/shared/calc/plan.ts:158`, `src/shared/calc/plan.ts:72`, `src/shared/calc/plan.ts:393-397`, `src/renderer/features/cargo/CargoPage.tsx:55`, `src/renderer/features/cargo/CargoPage.tsx:300-303`, `src/renderer/features/cargo/actions.ts:59-64`, `src/renderer/features/wizard/WizardPage.tsx:51`, `src/shared/calc/plan.ts:156` …

**Co się dzieje.** Ładownia przy 10 latach historii. Każdy kontrahent (np. sieć sklepów) ma tysiące płatności. W pętli recurringPayments każda operacja kopiuje całą dotychczasową tablicę swojej grupy, więc koszt grupy rośnie z kwadratem jej rozmiaru. Memo propozycji zależy od tablicy containers, więc każdy znak w nazwie, odbiorcy albo notatce kontenera (patchContainer) liczy wszystko od nowa: 113 ms (30 tys.) / 1,76 s (150 tys.). Dopóki kontener ma odbiorcę, przy każdym renderze działa też LinkPayments: useRecordList('transactions') (wynik nieużywany), paymentsToLink (drugi przebieg Object.values) i unlinkedPayments z counterpartyKey dla każdego wydatku: 42 / 201 ms. Na znak wychodzi ok. 0,2 s / 2,3 s, bez silnika. Ten sam kwadratowy koszt płaci kreator startu przy wejściu (WizardPage:51) i każdy zapis z „Połącz płatności” (nowa mapa transactions).

**Poprawka.** plan.ts:158 – `const l = groups.get(key); if (l) l.push(t); else groups.set(key, [t])`. payeeKey cache'ować per obiekt rekordu (WeakMap<Transaction, string>), wspólnie dla recurringPayments, unlinkedPayments i proposeEnvelopes. Memo propozycji oprzeć na sygnaturze kluczy odbiorców niezarchiwizowanych kontenerów (np. posortowane counterpartyKey złączone w string) zamiast na tablicy containers. LinkPayments: useMemo na [mapa transactions, counterpartyKey(c.counterparty), from], bez pustego useRecordList.

To samo zgłoszone też jako: „Ładownia: każda litera w edytorze kontenera liczy od nowa propozycje z historii (kwadratowe grupowanie) i płatności do połączenia”.

## W7. Kopia ZIP przed każdym importem (i dzienna, ręczna, eksport) trwa 22 s przy 30 tys. i ≈2 min przy 150 tys., przechodzi przez całe .history

Priorytet: wysoki · obszar: import (ekran), import (logika), folder danych i synchronizacja, proces główny i okna

Gdzie: `src/main/datastore/zip.ts:58-66`, `src/main/datastore/zip.ts:36-46`, `src/main/datastore/backup.ts:52-80`, `src/main/index.ts:411-417`, `src/main/index.ts:604-607`, `src/renderer/features/import/state.ts:453-455`, `src/renderer/features/import/state.ts:454`, `src/main/datastore/backup.ts:78` …

**Co się dzieje.** Użytkownik klika „Importuj”. `runImport` czeka na `api.importBackup()`, czyli pełny ZIP folderu, zanim cokolwiek zapisze. `zipFolder` robi `walkFiles(root, root)` BEZ pomijania, więc przechodzi całe `.history/` (katalog na każdy edytowany rekord, do 40 wersji) i dopiero potem filtruje `isDataFile`. Następnie po kolei robi `stat` każdego pliku i pakuje pliki pojedynczo (yazl, deflate ≈0,55–0,7 ms na plik). Zmierzono (Linux): przy 30 tys. 21,5–21,8 s, z czego sam spacer z 30 tys. katalogów historii 3,3 s (bez nich 0,2 s); przy 10 tys. 5,5 s czasu i 5,4 s CPU. Przy 150 tys. ≈110 s+ oczekiwania przed importem, na Windows z Defenderem więcej. Ta sama kopia biegnie w tle przy pierwszym otwarciu dnia (`runBackups` w `openFolder`) i zabiera CPU razem z pierwszym liczeniem ekranów. Miejsce: ZIP 15,9 MB przy 30 tys., ≈80 MB przy 150 tys.; 30 dziennych + 10 przed importem + 5 ręcznych w folderze OneDrive to ≈0,7 GB / ≈3,6 GB do synchronizacji. Założenie T20 („folder FI jest mały”) przestaje być prawdziwe; sama decyzja D31 nie jest problemem, problemem jest pełny ZIP jako sposób jej realizacji.

**Poprawka.** W zipFolder przekazać skip (isIgnoredPath) do walkFiles, a stat robić przez mapLimit. Lepiej: kopię budować z tekstów, które DataStore już ma w pamięci (FileState.text, mtimeMs), przez zip.addBuffer, bez otwierania 30 tys. plików – w sondzie ≈4,6× szybciej z deflate i ≈40× bez kompresji. Kopię przed importem zrobić przyrostową: fi.json plus rekordy, które import nadpisze lub usunie (albo oprzeć się na .history z powodem 'import'), zamiast pełnego ZIP-a przed każdym importem. Kopię dzienną liczyć w utilityProcess albo wątku roboczym. Opisać zmianę jako uzupełnienie T20, w tym limit miejsca (np. pełna kopia raz w tygodniu, a codziennie tylko zmienione pliki).

To samo zgłoszone też jako: „Kopia przed każdym importem = pełny ZIP folderu, łącznie z przejściem przez całe .history/”; „Kopia przed każdym importem to pełny ZIP wszystkich rekordów, a przy okazji listowany jest cały .history/ (założenie T20 „folder FI jest mały” nie trzyma się przy 30 tys. plików)”; „Kopia ZIP (codzienna i przed każdym importem) trwa 21 s przy 30 tys. i ~2 min przy 150 tys.; przegląda .history i zajmuje ~1 GB / ~5 GB w OneDrive”.

## W8. Każdy zapis i usunięcie rekordu kosztuje w procesie głównym O(wszystkich plików), więc import tysięcy wierszy trwa minuty

Priorytet: wysoki · obszar: folder danych i synchronizacja, proces główny i okna

Gdzie: `src/main/datastore/store.ts:807-846`, `src/main/datastore/store.ts:520-579`, `src/main/datastore/store.ts:614-644`, `src/main/datastore/store.ts:748-754`, `src/main/datastore/store.ts:882-893`, `src/main/datastore/store.ts:928-941`, `src/main/index.ts:502-509`, `src/renderer/store/data.ts:228` …

**Co się dzieje.** Folder ma 30 tys. operacji. Użytkownik importuje CSV z 2000 wierszami. `addRecords` i `replaceRecords` wysyłają naraz 2000 wywołań `saveRecord` (każde osobnym IPC), a proces główny wykonuje je po kolei pod mutexem. Każde wywołanie dwa razy filtruje całą mapę `files` (`currentState`), buduje od zera `buildViews()` (grupy, sortowanie, mapy wszystkich rekordów) i robi `diff()` + `commit()`, czyli składa klucz-napis dla każdego rekordu. Sondą zmierzono `saveRecord` nowej operacji: 101 ms przy 30 tys. i 667 ms przy 150 tys. Same `buildViews` + `diff` to 87 / 578 ms, `currentState` 1,5 / 10 ms. Sam proces główny potrzebuje więc ≈3,5 min na import 2000 wierszy przy 30 tys. i ≈22 min przy 150 tys. Usuwanie (`result.remove`, sprzątanie duplikatów przez `deleteManyWithUndo`, „Cofnij” przez `historyRestore`) idzie po jednym rekordzie, a na Windows każdy plik trafia jeszcze do kosza przez `shell.trashItem`. Pojedyncza edycja pola kosztuje dwa razy tyle co zapis, bo po nim przychodzi echo watchera: `refresh([ścieżka])` robi ponownie `buildViews` + `diff` (98–113 ms przy 30 tys.). W rendererze każda odpowiedź `runSave` kopiuje całą mapę kolekcji `{ ...mapOf(s, c) }` (24 ms przy 30 tys., 151 ms przy 150 tys.) i tworzy nowe `records`, co unieważnia memo `useFleet`/`useGame`. Przy usuwaniu `applyChange` (origin 'local') kopiuje mapę drugi raz, nawet gdy id już w niej nie ma. Powinno: zapis jednego rekordu kosztuje O(1) albo O(zmienionych), a import to jedna paczka.

**Poprawka.** W DataStore utrzymywać indeks `kind:id → FileState[]` aktualizowany w jednym miejscu (metody setFile / deleteFile zamiast bezpośrednich files.set / delete). Zastępuje on currentState, a widoki (records, prevKeys, conflicts) aktualizuje się przyrostowo: diff tylko po dotkniętych id, metaKey tylko przy zmianie problemów lub konfliktów. W refresh(paths) pomijać buildViews + diff, gdy żaden loadFile nie zwrócił nowego stanu (prev === wynik). Dodać IPC saveRecords(collection, records[]) i deleteRecords(collection, ids[]) z jednym ChangeSetem i jedną kolejką historii na paczkę, i użyć ich w runImport, categorizeTicked, deleteManyWithUndo i jego „Cofnij”. W rendererze składać odpowiedzi zapisów w jeden set (mikrotask lub requestAnimationFrame), a w applyChange nie kopiować mapy, gdy usuwanego id w niej nie ma.

To samo zgłoszone też jako: „DataStore: każdy zapis, usunięcie i zapis ustawień przebudowuje widoki całego folderu (O(N) na operację, synchronicznie w procesie głównym)”.

## W9. Silnik budżetu (i dane gry) liczone od nowa co minutę, choć wynik zależy tylko od daty – na każdym ekranie i w zasobniku

Priorytet: średni · obszar: całość, Operacje, Plan, Ładownia, kreator, Mostek, Radar, Mapa, Ustawienia, proces główny i okna, silnik budżetu

Gdzie: `src/renderer/store/fleet.ts:31`, `src/renderer/store/fleet.ts:55`, `src/renderer/store/fleet.ts:72`, `src/renderer/store/fleet.ts:78`, `src/renderer/app/App.tsx:237`, `src/renderer/app/App.tsx:257`, `src/renderer/app/App.tsx:293`, `src/renderer/store/game.ts:41` …

**Co się dzieje.** Folder z 30 tys. (150 tys.) operacji, aplikacja otwarta na Mostku albo schowana w zasobniku. `useMinute()` zwraca czas zaokrąglony do minuty, a jest to część klucza memo `fleetOf` (fi, records, now). Co minutę zmienia się więc klucz i liczy się od nowa `inputOf` (Object.values wszystkich kolekcji) i `computeFleet`. Silnik bierze z `now` tylko datę warszawską (`warsawNow(input.now)`, fleet.ts:376), więc 1439 z 1440 przeliczeń na dobę daje ten sam wynik. `TrayStatus` (App.tsx:237) trzyma `useFleet` zamontowane na każdym ekranie, także przy oknie w zasobniku. `useGameAdvance` (App.tsx:257) też co minutę buduje `gameInputOf` (8 × Object.values) i woła `advanceGame`. Nowy obiekt FleetState co minutę przelicza wszystkich jego konsumentów: Mostek (sortowanie wszystkich operacji, odprawa, specs), a przy otwartym oknie dokowania `withDocking` – drugi pełny `computeFleet`, bo `fleet` jest w zależnościach (DockingDialog.tsx:70). Do tego są dwa zegary: `useClockStore` może się spóźniać nawet o 59 s, a `fleetNow()` (powiadomienia przy ruchu myszy, szybki wpis) bierze `Date.now()`. Przy jednopozycyjnym memo zmiana rekordu w tym oknie czasu daje jeszcze jedno pełne przeliczenie. Skutek: co minutę UI zacina się na ok. 0,2–0,3 s (30 tys.) albo ok. 1,0–1,2 s (150 tys.) – także w trakcie pisania w polu. Proces okna zużywa w tle ok. 5 min (30 tys.) albo ok. 20 min (150 tys.) CPU na dobę. Powinno się liczyć raz na dobę i przy zmianie danych.

**Poprawka.** W `useFleet` subskrybować selektor daty: `useClockStore((s) => warsawNow(new Date(s.now)).date)`. Klucz memo `fleetOf` = ta data, nie minuta, a `fleetNow` niech liczy klucz tak samo – wtedy znika rozjazd dwóch zegarów. `useGameAdvance` uzależnić od daty, nie od minuty. Na Mostku owinąć `recent` w `useMemo([transactions])`. To, co naprawdę potrzebuje minuty (okno Silver Bullet w odprawie, odliczania), niech czyta `useMinute` samo, poza silnikiem.

To samo zgłoszone też jako: „Silnik budżetu i zależne ekrany przeliczane co minutę, choć wynik zależy tylko od daty – także w zasobniku”; „Zegar minutowy unieważnia memo silnika i gry, choć wynik zależy tylko od daty – w zasobniku liczy się to całą dobę”; „Silnik liczony od nowa co minutę, choć jego wynik zależy tylko od daty warszawskiej (także w zasobniku)”; „fleetNow i useFleet liczą minutę inaczej, a pamięć silnika ma jeden slot – silnik przelicza się ponownie dla tych samych danych”.

## W10. Pamięć silnika i hooków unieważniana przez każdą zmianę dowolnej kolekcji albo dowolnego ustawienia

Priorytet: średni · obszar: całość, Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/store/fleet.ts:55`, `src/renderer/store/game.ts:55`, `src/renderer/features/dock/state.ts:56`, `src/renderer/features/intel/IntelPage.tsx:41`, `src/renderer/features/import/rules.ts:186`, `src/renderer/features/import/DuplicatesPanel.tsx:99`, `src/renderer/store/layout.ts:65`, `src/renderer/features/command/CommandPage.tsx:350` …

**Co się dzieje.** Przykłady zmian, które przeliczają silnik:
- na ekranie Import kliknięcie „to nie podobne” albo „to nie duplikat”, połączenie nazw lub reguła słowa;
- zapis układu strony (Układ);
- zmiana progów gry na Dowództwie;
- zapis miesięcy gry przez useGameAdvance.
Silnik czyta tylko settings.accounts / budget / categories / household / layers / orders i swoje kolekcje, ale memo porównuje cały obiekt `fi` i cały `records`. Każda taka zmiana przelicza computeFleet (na Dowództwie i w Raportach też rateDay, na Wywiadzie wealthCurve i inne przez zależność od całego `settings`). Przelicza dwa razy, bo zapis fi wraca jako nowy obiekt (data.ts:401).

**Poprawka.** Klucz memo silnika z referencji tylko czytanych kolekcji (transactions, containers, goals, months, dockings, loans, balances) i fragmentów ustawień (accounts, budget, categories, household, layers, orders). Wejście silnika budować z tych referencji, selektorami zustand zwracającymi istniejące referencje. Analogicznie gra (+ game, settings.game) i dostawy (transactions, dockings, ictj.skipped, lastImport). Po zapisie fi zachowywać poprzednie pod-obiekty, jeśli treść się nie zmieniła (patrz 35), żeby referencje fragmentów były stabilne. Na Wywiadzie zawęzić zależności memo do settings.accounts / categories / orders.

To samo zgłoszone też jako: „Memo silnika po całym `fi` i całym `records`: nazwa okrętu, układ paneli czy zamrożony dzień gry też przeliczają cały silnik”.

## W11. Raporty (wachta, debriefing, przegląd roczny) liczą co minutę ocenę dzisiejszego dnia, której nie pokazują

Priorytet: średni · obszar: całość, gra, Wywiad, raporty

Gdzie: `src/renderer/features/reports/ReportsPage.tsx:103`, `src/renderer/features/reports/ReportsPage.tsx:206`, `src/renderer/features/reports/ReportsPage.tsx:360`, `src/renderer/store/game.ts:72`, `src/renderer/store/game.ts:61`, `src/renderer/features/reports/state.ts:12`

**Co się dzieje.** Otwarte Raporty → Raport wachty / Debriefing / Przegląd roczny przy 150 tys. operacji. useGame() co minutę i przy każdej zmianie rekordów woła rateDay(input, today), czyli drugi pełny computeFleet z now = koniec dnia (poza pamięcią silnika). Te zakładki używają tylko `game.view` i `game.input`. Zakładka zacina się co minutę bez potrzeby.

**Poprawka.** Rozdzielić useGame: useGameView() (gameView + input.game, memo po records.game, settings.game i dacie – nie minucie) dla Raportów oraz useGameToday() z rateDay tylko dla Dowództwa. Ocenę dnia trzymać w pamięci po (data warszawska, referencje czytanych kolekcji i fragmentów ustawień). W WatchReport missionStatus w useMemo; w useDebrief zależność od game.input.game zamiast od całego obiektu `game`.

To samo zgłoszone też jako: „Raporty (także domyślna zakładka „Raport wachty”) liczą co minutę dzisiejszą ocenę gry, której nie używają”.

## W12. Przychody: memberOf po nazwie w banku liczone od nowa dla każdego wpływu sprzed daty rozliczeń przy każdym przeliczeniu silnika

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/income.ts:56`, `src/shared/calc/household.ts:126`, `src/shared/calc/household.ts:139`, `src/shared/calc/fleet.ts:421`, `src/renderer/features/household/actions.ts:98`, `src/shared/export/budget.ts:136`

**Co się dzieje.** Folder po aktualizacji do 1.4.0: useHouseholdSinceSeed ustawia settings.household.since na dzień pierwszego otwarcia (T115), więc cała wcześniejsza historia jest „przed datą rozliczeń”. Przy każdym computeFleet (każda zmiana rekordu albo ustawień i co minutę) incomeByMonth woła incomeParts → isMemberMoney → memberOf dla każdego wpływu sprzed tej daty bez memberId i bez części domowników, czyli prawie dla wszystkich (pensja, BLIK, zwroty). memberOf za każdym razem robi fold() i split regexem nazwy kontrahenta, a potem fold i split każdej nazwy w banku każdego domownika. Nic nie jest zapamiętywane. Koszt rośnie jak liczba wpływów × liczba nazw domowników i wraca co minutę, choć wynik się nie zmienia, dopóki nie zmieni się kontrahent albo lista domowników. Ten sam koszt płaci eksport miesięcy (monthRows → incomeOfPeriod z fleet.incomeContext) i raport roku.

**Poprawka.** W computeFleet zbudować raz na przeliczenie `Map<counterparty, boolean>` (albo w IncomeContext funkcję `isMember(counterparty)` z pamięcią) i użyć jej w incomeParts zamiast memberOf dla każdej operacji. Dodatkowo w memberOf składać nazwy domowników raz: WeakMap<members, parts[][]>. Przy braku domowników (members pusty) od razu zwracać null przed fold kontrahenta. Zachowanie T119 bez zmian.

## W13. Dostawy (deliveries) budują Map wszystkich operacji przy każdej zmianie dowolnej operacji, na każdym ekranie

Priorytet: średni · obszar: domownicy i ICTTJ

Gdzie: `src/shared/calc/dock.ts:81`, `src/shared/calc/dock.ts:88`, `src/renderer/features/dock/state.ts:22`, `src/renderer/app/App.tsx:291`

**Co się dzieje.** DockingDialog jest zamontowany na stałe w App (App.tsx:291) i bez warunku woła useDeliveries, więc listOf przelicza dostawy po każdej zmianie records.transactions: edycji operacji, imporcie, zapisie z drugiego komputera, także na ekranach Operacje, Import czy Ustawienia, gdzie dostaw nie widać. deliveries() zaczyna od zbudowania Map ze wszystkich operacji i przejścia filtrem po wszystkich, choć używa tylko operacji rodzaju 'trading' i tych, do których są dokowania. Przy 150 tys. operacji i kilku tysiącach dokowań to ok. 0,1 s dodatkowej pracy przy każdej edycji, z czego ok. 90% da się uniknąć. Koszt rośnie liniowo z liczbą operacji.

**Poprawka.** (1) Nie wyciągać listy operacji drugi raz. Jedna zapamiętana lista na referencję records.transactions (np. moduł store/records z WeakMap: map → T[]), używana przez inputOf w store/fleet.ts i przez listOf, a obok niej zapamiętana lista samych operacji trading. (2) deliveries() przyjmuje operacje trading oraz funkcję/mapę pobierającą operację po id (dla zadokowanych wpisów, których operacja może nie być trading albo może zniknąć). txById i `free` buduje wtedy z kilku tysięcy pozycji, a nie ze 150 tys. (3) Opcjonalnie w DockingDialog wołać useDeliveries dopiero przy key != null (mały komponent wewnętrzny), żeby ekrany bez dostaw nie płaciły nawet tego. Sam punkt (2) bez (1) usuwa tylko ok. 50 ms.

## W14. Wyszukiwanie na liście operacji składa i normalizuje (NFD) tekst każdej operacji przy każdym znaku zapytania

Priorytet: średni · obszar: Operacje, Plan, Ładownia, kreator, silnik budżetu

Gdzie: `src/shared/operationsView.ts:77`, `src/shared/operationsView.ts:96`, `src/shared/operationsView.ts:100`, `src/renderer/features/operations/OperationsPage.tsx:329`, `src/shared/operationsView.ts:77-81`, `src/shared/operationsView.ts:96-103`, `src/renderer/features/operations/OperationsPage.tsx:329-334`

**Co się dzieje.** Wpisywanie zapytania przy okresie „wszystkie” (30 / 150 tys. operacji). matchesFilter dla każdej operacji woła searchTextOf, który przy każdym znaku od nowa łączy kontrahenta, tytuł, notatkę, dziennik, opis z banku (do 2000 znaków), etykiety kategorii i nazwę konta (accounts.find dla każdego wiersza) i przepuszcza całość przez fold (normalize NFD + regex). fold(q).split i queryAmount(q) też liczą się dla każdego wiersza zamiast raz. Sam fold to 41–57 ms (30 tys.) i 263–351 ms (150 tys.). Z tekstem zapamiętanym na rekord kolejne znaki kosztują 15–16 ms (30 tys.) i 65–76 ms (150 tys.) zamiast 70–125 / 420–536 ms.

**Poprawka.** Zapamiętać złożony i znormalizowany tekst w `WeakMap<Transaction, string>` (edycja tworzy nowy obiekt rekordu, więc wpis sam się unieważnia; mapę czyścić przy zmianie kategorii lub kont – np. kluczować mapę obiektem `ctx`). Zapytanie przygotować raz poza pętlą (słowa po `fold`, kwota) i przekazać do `matchesFilter`. Nazwy kont z Map budowanej raz.

To samo zgłoszone też jako: „Wyszukiwanie na liście operacji buduje tekst każdej operacji od nowa przy każdym znaku i każdej zmianie rekordu”.

## W15. Każde otwarcie szybkiego wpisu sortuje wszystkie wydatki (localeCompare) i może przeliczyć cały silnik

Priorytet: średni · obszar: Mostek, Radar, Mapa, Ustawienia, proces główny i okna

Gdzie: `src/renderer/store/quickHost.ts:30-75`, `src/main/quick.ts:111-122`, `src/renderer/store/quickHost.ts:43`, `src/renderer/store/quickHost.ts:48`, `src/renderer/store/quickHost.ts:52`, `src/renderer/features/bridge/BridgePage.tsx:158`, `src/main/quick.ts:103`

**Co się dzieje.** Globalny skrót pokazuje okno od razu, ale dane (energia, koperty, podpowiedzi oficera) liczy główne okno w `quickData()`. Funkcja filtruje i sortuje WSZYSTKIE wydatki z kontrahentem przez `localeCompare` po dacie i `createdAt`, choć potrzebuje tylko 2000 ostatnich: 55 ms przy 30 tys., 216 ms przy 150 tys. Jeśli rekordy zmieniły się od ostatniego przeliczenia, `fleetNow()` liczy jeszcze `computeFleet` (140–780 ms). Przy 150 tys. okno przez ≈1 s pokazuje stare albo puste dane (a stary szkic – patrz znalezisko o podwójnym zapisie).

**Poprawka.** Zapamiętywać część „oficer” (lastCategory, counterparties) i listę kategorii według referencji `records.transactions` / `fi.settings`, liczyć ją leniwie albo w bezczynności po zmianie rekordów. 2000 najnowszych wybierać bez pełnego sortowania (np. kubełki po dacie). W fleetNow() przy jednej minucie różnicy zwracać memo (dla podglądu energii wystarczy) zamiast liczyć computeFleet od nowa. W QuickApp nie kasować szkicu, który użytkownik zaczął wpisywać przed nadejściem danych (reset tylko przy pustym szkicu albo przy nowym otwarciu przed pierwszym klawiszem).

To samo zgłoszone też jako: „Szybki wpis: przy każdym otwarciu okno główne filtruje i sortuje wszystkie wydatki, a używa tylko 2000 najnowszych”.

## W16. Zaległe dni gry: każdy dzień to osobny pełny computeFleet od startu budżetu, liczony synchronicznie w rendererze i bez górnej granicy

Priorytet: średni · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/calc/game.ts:532`, `src/shared/calc/game.ts:534`, `src/shared/calc/game.ts:197`, `src/shared/calc/game.ts:337`, `src/shared/calc/game.ts:481`, `src/renderer/store/game.ts:50`

**Co się dzieje.** Komputer nie był włączany przez 30 dni (urlop) albo pliki game/*.json z drugiego komputera jeszcze się nie zsynchronizowały. Po otwarciu folderu useGameAdvance woła advanceGame w useEffect, a pętla od pierwszego niezamrożonego dnia do dziś−2 woła rateDay → computeFleet({ now: koniec dnia }) dla każdego dnia osobno, za każdym razem od startu budżetu po wszystkich operacjach. Koszt to O(N × D): przy 30 dniach około 5 s (30 tys.) i około 30 s (150 tys.) zamrożonego okna zaraz po starcie, bez postępu i bez możliwości przerwania. Gdy brakuje plików gry z kilku miesięcy, wychodzą minuty. Pętla nie ma limitu dni. Dodatkowo w poniedziałek chooseMission może policzyć jeszcze jeden pełny computeFleet (misja „house”), a 1. dnia miesiąca newAchievements liczy debriefing 4 razy (brief(prev) dwa razy). Powinno to być liczone przyrostowo albo przynajmniej w tle, porcjami.

**Poprawka.** Najprostsza bezpieczna poprawka: dać advanceGame parametr maxDays (np. 2–3) i przerywać pętlę po tylu ocenionych dniach. Misję tygodnia wybierać dopiero, gdy nie ma już zaległości, bo chooseMission czyta dni zamrożone (np. 'energy'). Efekt w useGameAdvance zapisuje miesiące po każdej porcji. Zmiana records sama uruchamia następną porcję po malowaniu (useEffect), więc okno dostaje klatki między porcjami, a przerwanie niczego nie gubi. Kolejność dni się nie zmienia, więc wynik zostaje deterministyczny. Docelowo: jeden przebieg silnika z migawkami stanu na koniec każdego zaległego dnia albo advanceGame w Workerze.

## W17. Ekran importu bez wirtualizacji i memo: każda decyzja, zaznaczenie i znak w wyszukiwarce renderuje wszystkie grupy

Priorytet: średni · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:480`, `src/renderer/features/import/ImportPage.tsx:481`, `src/renderer/features/import/ImportPage.tsx:376`, `src/renderer/features/import/ImportPage.tsx:377`, `src/renderer/features/import/ImportPage.tsx:379`, `src/renderer/features/import/ImportPage.tsx:624`, `src/renderer/features/import/ImportPage.tsx:625`, `src/renderer/features/import/ImportPage.tsx:631` …

**Co się dzieje.** Pierwszy import roku (kreator) albo plik po dłuższej przerwie ma setki–tysiące marek. Tematy „Do decyzji” są otwarte na start (480), więc montuje się prawie każda grupa. Każdy GroupRow to select decyzji + CategorySelect (~43 opcje z optgroupami). Re-render całej listy wywołuje: (1) ThemesPanel subskrybuje `choices` i `query` (623–625), a dzieci nie są memo, więc tak jest przy każdej decyzji, „zapamiętaj”, „pomiń” i każdym znaku w wyszukiwarce; useDeferredValue (631) nie pomaga, bo pilny render i tak przechodzi wszystkie ThemeRow/GroupRow. (2) GroupRow subskrybuje całe obiekty s.choices.rows, s.choices.skip, s.selected.rows (376–379), a selectImport zawsze tworzy nowy obiekt rows (state.ts:340), więc każde kliknięcie checkboxa renderuje każdy GroupRow. (3) FilePanel / Summary / MatchesPanel używają useImport() bez selektora (73, 143, 213), a MatchesPanel wyświetla wszystkie dopasowania bez limitu. (4) Każda zmiana `records` renderuje całą aplikację (App bez memo). Wyszukiwanie rozwija wszystkie tematy (481), a częściowo trafione grupy pokazują wiersze, każdy z własnym CategorySelect (438–457).

**Poprawka.** React.memo dla ThemeRow / GroupRow z wąskimi selektorami zwracającymi prymitywy (np. czy grupa ma wiersze z własną decyzją, liczba pominiętych w grupie, czy dany wiersz jest zaznaczony – w komponencie wiersza). W selectImport / patchChoices zachować referencje niezmienionych map. Wirtualizacja listy grup (@tanstack/react-virtual jest już w zależnościach). Tematy z więcej niż ok. 30 grupami zwinięte na start. CategorySelect: opcje jako zmemoizowany element (useMemo od kategorii) albo select montowany dopiero po kliknięciu. Selektory w FilePanel / Summary / MatchesPanel i limit „pokaż wszystkie” w MatchesPanel oraz w wierszach wyników wyszukiwania.

## W18. Pełny ponowny plan importu po każdym zapisie fi.json – także gdy reguły się nie zmieniły

Priorytet: średni · obszar: import (ekran)

Gdzie: `src/renderer/features/import/ImportPage.tsx:786`, `src/renderer/features/import/ImportPage.tsx:791`, `src/renderer/features/import/state.ts:170`, `src/renderer/features/import/state.ts:172`, `src/renderer/features/import/state.ts:179`, `src/renderer/store/data.ts:401`, `src/shared/import/reconcile.ts:147`, `src/shared/import/reconcile.ts:170` …

**Co się dzieje.** Efekt w ImportPage porównuje REFERENCJE rules / aliases / members z planInputs. Po każdym zapisie ustawień runSave robi set({ fi: saved }) obiektem z IPC, więc wszystkie referencje są nowe i rusza replanImport (pełny planImport), nawet gdy zmieniło się tylko notSimilar („To nie to samo”), notDuplicates („to nie duplikat”), ownNames albo game.start w tle. Słowo kluczowe (BulkBar, RuleProposal, KeywordRules) i „Połącz” dają DWA plany: zmiana w pamięci i drugi ~0,4 s później po zapisie. Plan od nowa powtarza też fazę dopasowania (known / settle / merge / loose – każdy nowy wiersz × wszystkie wpisy ręczne konta z 10 lat, reconcile.ts:147–186, bez okna dat), która w ogóle nie zależy od reguł ani nazw, oraz klasyfikację wszystkich nowych wierszy. Do tego dochodzi pełny render listy (patrz osobne znalezisko o ekranie importu). Przy 150 tys. każde kliknięcie na ekranie importu to 2–7 s zawieszenia, z opóźnieniem ~0,4 s.

**Poprawka.** Plan od nowa tylko przy zmianie treści: w runSave dla 'fi' zachować dotychczasowe referencje rules / aliases / household.members, gdy zapisana treść jest równa (porównanie strukturalne albo licznik wersji tych pól), albo porównywać w replanIfChanged zserializowane wartości. Rozdzielić planImport na dopasowanie (known / settle / merge / loose, zapamiętane per plik + konto + operacje) i klasyfikację, powtarzaną przy zmianie reguł / nazw. Wpisy ręczne indeksować po dacie (Map data → wpisy) i sprawdzać tylko ±3 dni.

## W19. historyDeleted przy każdym wczytaniu pliku importu i na stronie Synchronizacja: przebudowa widoków na każdą kolekcję + sekwencyjny odczyt ostatniej wersji każdego usuniętego

Priorytet: średni · obszar: import (ekran), import (logika), folder danych i synchronizacja, proces główny i okna

Gdzie: `src/main/datastore/store.ts:1013`, `src/main/datastore/history.ts:131`, `src/renderer/features/import/state.ts:107`, `src/renderer/features/import/state.ts:124`, `src/renderer/features/sync/SyncPage.tsx:154`, `src/renderer/features/import/state.ts:105`, `src/main/datastore/store.ts:1011`, `src/main/datastore/history.ts:122` …

**Co się dzieje.** Każde wybranie pliku CSV (loadImportFile → deletedBankKeys) woła historyDeleted('transactions'): buildViews całego folderu w mutexie, readdir `.history/transactions` (katalog na każdy kiedykolwiek edytowany wpis) i po kolei readdir + readFile ostatniej wersji każdego usuniętego wpisu. Po latach sprzątania duplikatów i usuniętych wierszy banku (np. 2000) to ~0,7–1 s lokalnie; na drugim komputerze pliki .history są w OneDrive tylko w chmurze, więc każdy odczyt ściąga plik – wczytanie CSV może trwać minuty. „Usunięte wpisy → Pokaż” robi to dla 8 kolekcji, każda z osobnym buildViews.

**Poprawka.** Zbiór istniejących id brać z indeksu bez buildViews (np. Set id z this.files albo utrzymywana mapa). Odczyty ostatnich wersji usuniętych robić równolegle (mapLimit 8–16). Najlepiej trzymać mały indeks usuniętych (bank.key → id), dopisywany w deleteRecord, żeby nie czytać plików historii przy każdym CSV. W imporcie pamiętać wynik deletedBankKeys w sesji i odświeżać go tylko po usunięciu operacji. Zachować ostatnią wersję usuniętych (T39).

To samo zgłoszone też jako: „Każde wczytanie pliku CSV: historyDeleted przegląda całe .history/transactions pod mutexem magazynu”; „Wczytanie pliku importu czyta po kolei wszystkie usunięte operacje z .history (pełne rekordy przez IPC, pod blokadą magazynu) – rośnie bez końca”; „historyDeleted blokuje mutex magazynu: buduje widoki i sekwencyjnie czyta historię usuniętych (przy każdym pliku importu i ekranie Synchronizacji)”.

## W20. Import całej historii (kreator): koszt jednego wiersza 70–145 µs (brandOf liniowo po słowniku, findRule filtruje wszystkie reguły), a pełny plan liczy się od nowa po każdym słowie kluczowym czy połączeniu nazw

Priorytet: średni · obszar: import (logika)

Gdzie: `src/shared/import/brands.ts:62`, `src/shared/import/brands.ts:639`, `src/shared/import/brands.ts:658`, `src/shared/import/brands.ts:578`, `src/shared/import/classify.ts:69`, `src/shared/import/classify.ts:101`, `src/shared/import/classify.ts:271`, `src/shared/import/reconcile.ts:188` …

**Co się dzieje.** Spec, krok 3 kreatora: „Import całej dostępnej historii z mBanku”. Plik z 10 lat to ok. 30 tys. wierszy (z 3 lat ok. 8 tys.). Dla każdego nowego wiersza `classifyRow` woła:
- `ruleTargetOf`, czyli 1–2 × `brandOf`; każde `brandOf` przechodzi ok. 360 wzorców sieci przez `find` z domknięciem `every` na każdej pozycji, dla przelewów jeszcze `{ ...p, start: true }` na każdy wzorzec, oraz `withoutCities` (≈130 miast × każde słowo);
- 2 × `keywordIn` (≈250 wzorców);
- `findRule`, które przy każdym wywołaniu robi `rules.filter` po wszystkich regułach i potem do 4 × `usable.filter` (po jednym na klucz), pętlę „contains” i pętlę słów kluczowych;
- dla wydatku `containers.find` z `counterpartyKey(x.counterparty)` liczonym od nowa dla każdego kontenera.
Plan dla 30 tys. wierszy blokuje okno na 2–2,7 s, wcześniej `parseMbank` zajmuje 0,8 s. Każde przyjęcie proponowanego słowa kluczowego, „Połącz nazwy”, dodanie domownika czy usunięcie reguły uruchamia `replanImport`, a ten wywołuje pełne `planImport` – znowu 2–2,7 s. Ten sam koszt `ruleTargetOf` dotyczy zbiorczego „Zapamiętaj dla marek” w Operacjach (`rememberBrands`, jedno wywołanie na zaznaczoną operację).

**Poprawka.** Zgodnie z propozycją, w kolejności zysku:
1. Pamięć `classifyRow` / `ruleTargetOf` w obrębie jednego planu po (counterparty, title, operation, bankName, kierunek) – w historii te same nazwy powtarzają się setki razy, więc samo to skraca plan wielokrotnie.
2. Indeks wzorców sieci, słów kluczowych i miast po pierwszym słowie (`Map<słowo, wzorce>`; wzorce z „?” sprawdzane listą).
3. `findRule` z indeksem budowanym raz na tablicę reguł (WeakMap): `Map<match, reguły>` plus osobne listy contains i keyword.
4. Klucze kontenerów liczone raz na kontekst.

Przeliczanie przy `replanImport` tylko dotkniętych grup jest najtrudniejsze; przy punktach 1–3 może być zbędne.

## W21. Pełne przeskanowanie folderu co 30 s i przy każdym fokusie okna, bez łączenia zaległych żądań

Priorytet: średni · obszar: folder danych i synchronizacja, proces główny i okna

Gdzie: `src/main/datastore/watch.ts:52`, `src/main/index.ts:399-407`, `src/main/index.ts:904-906`, `src/main/datastore/store.ts:653-668`, `src/main/index.ts:904`, `src/main/index.ts:404`, `src/main/datastore/store.ts:662`, `src/main/datastore/store.ts:664`

**Co się dzieje.** Aplikacja siedzi w zasobniku całą dobę (closeToTray domyślnie, autostart). `FolderWatcher` co 30 s woła `onChange(null)`, a każde `win.on('focus')` (Alt+Tab, zamknięcie okna zapisu, powrót po szybkim wpisie) woła `store.refresh()` bez ścieżek. Oba robią pełny skan: listing, `stat` 30 tys. plików, `buildViews` + `diff` – 1,1–1,2 s czasu i ≈1,27 s CPU przy 30 tys. (Linux). To ≈1 h CPU na dobę w tle; przy 150 tys. ≈6 s na skan, ≈5 h CPU na dobę i co piąta sekunda pod mutexem. Wywołania się nie łączą: każdy fokus i tik dokłada kolejny pełny skan do kolejki mutexu. Gdy skan na wolnym dysku trwa > 30 s, kolejka rośnie bez końca. Zapisy (autosave, szybki wpis) czekają za skanem. Powinno: natywny watcher działa, więc pełna kontrola rzadko i najwyżej jedna oczekująca.

**Poprawka.** W index.ts opakować odświeżanie w koalescencję: najwyżej jedno pełne odświeżenie w toku i jedna flaga „jeszcze raz” (jak IctjSource.refresh z `again`); ścieżki z watchera zbierać do zbioru dokładanego do następnego przebiegu. Pełną kontrolę w trybie 'native' (Windows) robić co 5–10 min, fokus okna najwyżej raz na ≥60 s. W DataStore.refresh liczyć buildViews/diff tylko, gdy któryś FileState się zmienił (loadFile zwrócił inny obiekt niż prev albo plik zniknął/przybył) – inaczej zwracać null bez budowania widoków.

To samo zgłoszone też jako: „Pełny rescan folderu co 30 s i przy każdym focusie okna (bez łączenia zleceń) – stat 150 tys. plików i przebudowa widoków, zapisy czekają”.

## W22. Na Windows każdy zapis prawdopodobnie wywołuje pełne przeskanowanie folderu (zdarzenie katalogu z rekurencyjnego fs.watch)

Priorytet: średni · obszar: folder danych i synchronizacja, proces główny i okna

Gdzie: `src/main/datastore/watch.ts:66-73`, `src/main/datastore/store.ts:662-668`, `src/main/index.ts:399-407`, `src/main/datastore/watch.ts:72`, `src/main/datastore/store.ts:662`

**Co się dzieje.** Na Windows (tryb 'native', `fs.watch(root, {recursive: true})` = ReadDirectoryChangesW z obserwacją poddrzew i filtrem LAST_WRITE) zapis atomowy `transactions/2026/…json` przez temp + rename zmienia czas modyfikacji katalogu `transactions\2026`. Watcher dostaje wtedy także zdarzenie z nazwą katalogu (`transactions/2026`, a dla układów 'id'/'month' `containers`, `months`, `game`). `record()` go nie odrzuca, bo `isIgnoredPath` pomija tylko kropki, `backups` i `.tmp-`. W `refresh` warunek `paths.some((p) => !p.toLowerCase().endsWith('.json'))` daje `needsFull` i każdy własny zapis kończy się PEŁNYM przeskanowaniem: listing wszystkich katalogów, `stat` każdego pliku, `buildViews` + `diff`. Zmierzono (Linux) 1,1–1,2 s przy 30 tys. plików; przy 150 tys. ≈6 s (na NTFS z OneDrive i Defenderem zwykle więcej), cały czas pod mutexem, więc następny zapis czeka. Podczas importu pełne skany przeplatają się z zapisami (debounce 300 ms). To samo przy każdej synchronizacji OneDrive. Testy watchera działają na Linuksie w trybie 'per-directory', gdzie to nie występuje. Powinno: zdarzenie katalogu kolekcji odświeża co najwyżej ten jeden katalog.

**Poprawka.** W refresh(paths) ścieżkę bez .json, która jest katalogiem znanej kolekcji albo jej podkatalogiem (kindOfDir), obsłużyć jako odświeżenie tego jednego katalogu: readdir, porównanie zbioru nazw z wpisami files o tym prefiksie, loadFile tylko dla nowych lub zmienionych i usunięcie zniknionych. Pełny skan zostawić dla filename == null i ścieżek nieznanych. Przy okazji zmniejszyć koszt okresowego skanu co 30 s i skanu przy focusie, np. stat katalogów i readdir tylko tam, gdzie zmienił się mtime katalogu, oraz pomijanie buildViews + diff, gdy nic się nie zmieniło. Dodać test refresh z podaną ścieżką katalogu (liczba wywołań loadFile).

To samo zgłoszone też jako: „Na Windows zdarzenie zmiany katalogu po każdym zapisie najpewniej wymusza pełny rescan (needsFull)”.

## W23. Rozstrzyganie konfliktów i „Do Kosza” robią pełny rescan na każdą pozycję; lista konfliktów bez wirtualizacji i w każdym ChangeSet

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:950`, `src/main/datastore/store.ts:987`, `src/main/datastore/store.ts:998`, `src/renderer/features/sync/SyncPage.tsx:225`, `src/renderer/features/sync/SyncPage.tsx:311`, `src/main/datastore/store.ts:629`

**Co się dzieje.** OneDrive po kłopotach z synchronizacją tworzy kopie „-KOMPUTER” setek plików. „Zachowaj nowsze: wszystkie” wywołuje resolveConflict po kolei, a każde: buildViews całego folderu (żeby znaleźć jeden konflikt) + `refresh(undefined, 'local')` = pełny rescan ze stat wszystkich plików. 500 konfliktów przy 30 tys. ≈ 500 × 1,1 s ≈ 9 min, przy 150 tys. ≈ 45–50 min (mutex blokuje w tym czasie zapisy). Tak samo „Do Kosza” na liście problemów. Do tego każdy zwykły zapis wysyła w ChangeSet całą listę konfliktów z pełnymi rekordami obu stron, a SyncPage renderuje wszystkie karty (flatten obu rekordów na każdy render, przy każdym zaznaczeniu checkboxa).

**Poprawka.** W resolveConflict i trashFile zwracać wynik z wnętrza mutexu: `return this.diff(this.buildViews(), settingsWritten, 'local')` – this.files jest już aktualne, więc pełny rescan jest zbędny. Konflikt szukać przez `this.files.get(conflictId)` (id konfliktu = ścieżka kopii lub duplikatu) zamiast przez buildViews całego folderu. Dodać zbiorcze IPC `resolveConflicts(list)` z jednym diff na końcu dla „Zachowaj nowsze: wszystkie” i „Do Kosza” wielu plików.

## W24. Otwarcie folderu: zbędny stat przed każdym odczytem, wolny fs.promises.readFile i drugi pełny listing (cleanupTempFiles)

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/main/datastore/store.ts:309`, `src/main/datastore/store.ts:318`, `src/main/datastore/store.ts:233`, `src/main/datastore/store.ts:503`

**Co się dzieje.** Przy otwarciu `this.files` jest puste (nowy DataStore), więc porównanie z `prev` nic nie daje, a loadFile i tak robi osobny `fs.stat` przed `fs.promises.readFile` (który sam robi open/fstat/read/close). Po odczycie cleanupTempFiles listuje wszystkie kolekcje drugi raz tylko po to, by znaleźć pliki `.tmp-`. Przy 30 tys. to ok. 1 s z 4 s fazy odczytu (+0,2 s listingu), przy 150 tys. ~5 s z 17 s odczytu (na OneDrive/NTFS więcej, bo każda operacja to osobne zadanie w puli wątków).

**Poprawka.** W loadFile przy braku `prev`: `fs.open` → `fh.stat()` (isFile, mtimeMs, size) → `fh.read` znanego rozmiaru → `close` z withRetry. Osobny stat przed odczytem zostaje tylko w rescanie (gdy jest prev do porównania). Pliki `.tmp-` zbierać w pierwszym listingu (listDataFiles: osobny callback dla ścieżek pomijanych przez isIgnoredPath z `.tmp-`), a cleanupTempFiles usuwa tylko z tej listy.

## W25. Tryb „pytaj” przy dużej paczce zmian z drugiego komputera: okno renderuje wszystkie karty, „Zastosuj” kopiuje mapę na każdą pozycję

Priorytet: średni · obszar: folder danych i synchronizacja

Gdzie: `src/renderer/features/sync/RemoteChangesDialog.tsx:39`, `src/renderer/features/sync/RemoteChangesDialog.tsx:207`, `src/renderer/features/sync/RemoteChangesDialog.tsx:259`, `src/renderer/store/data.ts:280`, `src/renderer/store/data.ts:302`

**Co się dzieje.** Ustawienie sync.remoteChanges = 'ask', aplikacja w zasobniku (D64), drugi komputer importuje 1000 operacji i OneDrive je dosyła: każda zmiana trafia do pending (decideRemote → ask). Okno renderuje 1000 ItemCard bez wirtualizacji (dwa diffRecords + merge3 na kartę, NewerBadge liczy newerOf przy każdym renderze). „Zastosuj” woła resolveRemote po kolei: każde filtruje pending (O(P)), kopiuje mapę kolekcji (18 ms / 170 ms) i planuje osobny zapis → 1000 × kopia ≈ 18 s / ~3 min plus 1000 pojedynczych zapisów (jak w znalezisku o imporcie).

**Poprawka.** Zbiorcze rozstrzygnięcie resolveRemoteMany(items: {key, choice, fields}[]): jedno useRemote.setState (odfiltrowanie wszystkich kluczy przez Set), jedno set() z jedną kopią mapy na kolekcję, w której zmienia się wszystkie wpisy, potem scheduleSave tylko dla 'mine' / 'merge' i historyKeep dla odrzuconych lokalnych edycji. Z niej korzystają „Zastosuj” i acceptNewer. W oknie: React.memo dla ItemCard ze stabilnymi callbackami (setChoices / setFields przez klucz), lista stronicowana albo wirtualna (np. pierwsze 50 kart i „pokaż więcej”, działania zbiorcze obejmują wszystkie), useMemo dla newerOf zależne od item i mine.

## W26. Proces główny trzyma pełny tekst każdego pliku (FileState.text) – połowa pamięci magazynu

Priorytet: średni · obszar: proces główny i okna

Gdzie: `src/main/datastore/store.ts:47`, `src/main/datastore/store.ts:364-373`, `src/main/datastore/store.ts:479-500`, `src/main/datastore/store.ts:465-472`

**Co się dzieje.** Po otwarciu folderu każdy `FileState` ma `text` (cały JSON pliku) obok sparsowanego `record`, przez cały czas działania. Tekst jest potrzebny tylko w `backupOriginals` dla plików z migracją, a `rewrite` serializuje z `record`. Polskie znaki wymuszają w V8 napisy dwubajtowe. Zmierzono: pamięć magazynu 81 MB przy 30 tys. (tekst 40 MB), 412 MB przy 150 tys. (tekst 202 MB). W chwili otwarcia dochodzi migawka i jej kopia do IPC, więc proces główny przy 150 tys. przekracza 500 MB; przy ponownym otwarciu stary i nowy magazyn są w pamięci naraz.

**Poprawka.** W parseState ustawiać `text: outcome.migrated ? text : null` (tylko pliki do migracji potrzebują oryginału dla backupOriginals), w writeState `text: null`; po migrateIfNeeded/rewrite stan i tak jest nadpisywany przez writeState. Ewentualnie w backupOriginals czytać oryginał z dysku i całkiem usunąć pole.

## W27. computeFleet odtwarza całą historię od startu przy każdym wywołaniu – stałe koszty O(n log n) z dużą alokacją, a pożyczki i konta po osobnym przebiegu każde

Priorytet: średni · obszar: silnik budżetu

Gdzie: `src/shared/calc/fleet.ts:846`, `src/shared/calc/fleet.ts:850`, `src/shared/calc/fleet.ts:393`, `src/shared/calc/fleet.ts:738`, `src/shared/calc/fleet.ts:411`, `src/shared/calc/fleet.ts:543`, `src/shared/calc/fleet.ts:862`, `src/shared/calc/loans.ts:132` …

**Co się dzieje.** Każde wywołanie silnika (zmiana rekordu, minuta, podgląd dokowania withDocking, ocena dnia w grze) przechodzi całą historię od startu budżetu, nawet gdy zmieniła się jedna dzisiejsza operacja. Wewnątrz dla każdej operacji powstaje obiekt zdarzenia z domknięciem i ~70-znakowym kluczem, a potem sortowane są wszystkie klucze (846–851), choć operacje mają już porządek ledgerOrder. Saldo liczone jest przez filter+map całej listy osobno dla każdego konta, dwa razy (393–400 i 738). `dataDates` sortuje wszystkie daty tylko po to, by wziąć najmniejszą (411). loanStates (862) przechodzi wszystkie operacje osobno dla każdej pożyczki, także zamkniętych – a te nigdy nie znikają. Przy 150 tys. operacji: budowa zdarzeń 53–266 ms, sort 46–72 ms, salda 2 kont 40–50 ms, sort dat 21–26 ms, pożyczki 5 → 18–37 ms i 20 → 88–110 ms; całość 0,6–0,8 s. Przy 30 tys. całość 0,1–0,2 s. Koszt mnoży się przez liczbę wyzwalaczy z innych znalezisk (znak w edytorze, minuta, dokowanie, dni gry).

**Poprawka.** Krótko: posortować operacje raz komparatorem (data, slot, czas, createdAt, id) bez kluczy tekstowych i scalać z kilkuset zdarzeniami kalendarza dwoma wskaźnikami; salda wszystkich kont i przepływy wszystkich pożyczek liczyć jednym przebiegiem (Map); minimum dat liniowo. Dalej: memo silnika po rzutowaniu pól, od których silnik zależy (zmiana notatki, tytułu czy dziennika go nie uruchamia), albo zapis pól tekstowych edytora po wyjściu z pola. Docelowo punkt kontrolny stanu warstw na początek bieżącego miesiąca, z którego korzystają także `withDocking` i `rateDay`.

## W28. Okno dokowania liczy cały silnik drugi raz: przy otwarciu, co minutę i po każdej zmianie rekordu

Priorytet: niski · obszar: domownicy i ICTTJ

Gdzie: `src/renderer/features/dock/DockingDialog.tsx:59`, `src/renderer/features/dock/DockingDialog.tsx:66`, `src/renderer/features/dock/DockingDialog.tsx:70`, `src/shared/calc/dock.ts:158`

**Co się dzieje.** Użytkownik otwiera okno dokowania wypłaty (Mostek → Dokowanie albo powiadomienie) i zostawia je otwarte, ustalając podział. Podgląd `preview` to pełny computeFleet z withDocking na nowo zbudowanych tablicach, więc memo rejestru domowników też nie trafia. Zależności useMemo obejmują `fleet`, a useFleet daje nowy obiekt co minutę (useMinute), oraz `records`, czyli każdą zmianę dowolnego rekordu (zamrażanie dni gry, synchronizacja celów ICTTJ, zapis z drugiego komputera). Dopóki okno jest otwarte, każda minuta i każda zmiana kosztują dwa pełne przeliczenia silnika zamiast jednego, a samo otwarcie dokłada jedno. Propozycja zależy tylko od rekordów i dostawy, nie od minuty. Dla wypłaty bez pary w banku `tx` (walletOperation) dostaje nowe id przy każdej zmianie `d`. T64 („okno liczy propozycję samym silnikiem”) to świadoma decyzja, ale nie wymaga liczenia od nowa co minutę.

**Poprawka.** Usunąć `fleet` z zależności useMemo podglądu i zostawić [d, tx, records.transactions, records.dockings, records.goals, records.months, fi]. Przy przeliczaniu co minutę podgląd się nie zmienia, bo propozycja zależy od rekordów, a nie od minuty. Opcjonalnie trzymać `tx` dla Portfela XTB w useState inicjalizowanym raz na d.key, żeby id nie zmieniało się przy zmianie listy.

## W29. Mostek, „Ostatnie operacje”: przy każdym renderze kopia i sortowanie wszystkich operacji, żeby pokazać 10

Priorytet: niski · obszar: Mostek, Radar, Mapa, Ustawienia

Gdzie: `src/renderer/features/bridge/BridgePage.tsx:115`, `src/renderer/features/bridge/BridgePage.tsx:132`

**Co się dzieje.** Mostek przy 30 tys. (150 tys.) operacji. `recent` liczy się w ciele komponentu bez memo: `[...transactions].sort(...).slice(0, 10)`, czyli O(n log n). BridgePage renderuje się co minutę (nowy `fleet`), przy każdej zmianie rekordów i fi oraz przy zmianie dostaw ICTTJ, misji, kategorii, domowników i skrótu. Za każdym razem kosztuje to ok. 33 ms (30 tys.) albo ok. 150–165 ms (150 tys.). Przy zmianie transakcji dochodzi `useRecordList('transactions')` (Object.values) ok. 11 / 85–130 ms. Do pokazania 10 wierszy wystarczy jedno przejście O(n) (ok. 1–2 / 6–12 ms).

**Poprawka.** `useMemo` po `transactions`, a w nim 10 najnowszych wybranych jednym przejściem. Komparator na zwykłym porównaniu napisów (`<` / `>`) zamiast `localeCompare`: daty ISO i znaczniki czasu porządkują się po kodach znaków, a w lokalizacji pl `localeCompare` jest ok. 4× wolniejsze. Minutowe renderowanie przestaje wtedy sortować.

## W30. Eksport „Miesiące – CSV” i Excel: monthRows to O(miesiące × (operacje + log silnika)), całe liczenie w kliknięciu

Priorytet: niski · obszar: gra, Wywiad, raporty

Gdzie: `src/shared/export/budget.ts:134`, `src/shared/export/budget.ts:136`, `src/shared/calc/plan.ts:289`, `src/shared/calc/plan.ts:317`, `src/shared/calc/plan.ts:318`, `src/renderer/features/reports/ReportsPage.tsx:432`, `src/renderer/features/reports/ReportsPage.tsx:453`

**Co się dzieje.** Użytkownik ustawia okres eksportu od początku historii (np. 2016-10-01 do dziś, 121 miesięcy) i klika „Miesiące – CSV” albo „Excel (operacje + miesiące)”. Dla każdego miesiąca monthRows woła debriefing, który filtruje wszystkie operacje (plan.ts:289) oraz przegląda cały log silnika (filter + find, plan.ts:317-318), a potem jeszcze raz filtruje wszystkie operacje dla wpływów (budget.ts:136). Renderer stoi 0,36 s przy 30 tys. i 3,9 s przy 150 tys. Nawet domyślny okres (bieżący rok, ok. 10–12 miesięcy) to ok. 0,38 s przy 150 tys. Excel liczy dodatkowo operationRows (0,3 s), a CSV operacji kosztuje 0,3 + 0,7 s przy 150 tys.

**Poprawka.** W monthRows raz pogrupować operacje po miesiącu oraz wpisy dziennika 'salary' i 'month-end' po miesiącu, a debriefingowi podawać gotowe listy miesiąca (np. opcjonalne `monthTxs` / `monthLog`) – O(N + L + M). Wpływy liczyć z tej samej grupy. W ExportPanel przed liczeniem pokazać „Przygotowuję…” (setTimeout 0).

## W31. findRule skanuje liniowo wszystkie reguły dla każdego wiersza, a wzorzec słowa kluczowego jest kompilowany przy każdym porównaniu

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/shared/import/classify.ts:69`, `src/shared/import/classify.ts:70`, `src/shared/import/classify.ts:72`, `src/shared/import/classify.ts:81`, `src/shared/import/classify.ts:85`, `src/shared/import/brands.ts:48`, `src/shared/import/brands.ts:69`, `src/shared/import/learn.ts:165` …

**Co się dzieje.** Na każdy wiersz findRule robi: rules.filter po wszystkich, dla do 4 kluczy filter po wszystkich „usable”, pętlę „contains” i pętlę słów kluczowych, w której keywordMatches woła pattern() → words() → tokens() (split regexem + fold z normalize NFD) dla każdej reguły × wiersza × (nazwa, tytuł). Reguł przybywa bez końca: jedna na markę × kierunek z każdej decyzji (buildImport → upsertRule) i z „Zapamiętaj” w Operacjach, nic ich nie przycina. Koszt mnoży się przez każdy ponowny plan (patrz znalezisko o planie po zapisie fi.json) i powtarza w runImport. keywordProposals kopiuje [...rules, proposal] dla każdego słowa-kandydata i woła findRule na każdym trafionym wierszu – a RuleProposal liczy je od nowa przy każdej zmianie `choices` (useMemo zależy od całego obiektu decyzji), czyli przy każdej decyzji gdziekolwiek na liście, dopóki propozycja jest otwarta.

**Poprawka.** Indeks reguł w WeakMap<rules, index>: Map<match, reguły[]> dla exact (z kierunkiem), osobne listy contains i keyword z raz skompilowanym Pattern. findRule = kilka odczytów mapy + pętla contains / keyword. W keywordProposals sprawdzać propozycję obok indeksu zamiast kopiować tablicę reguł. Uzależnić useMemo RuleProposal od decyzji grup tego samego kierunku, a nie od całego choices.

## W32. Decyzja zbiorcza („Ustaw” dla zaznaczonych): osobny setState na każdą grupę – O(G²) kopii i powiadomienie wszystkich subskrypcji

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/state.ts:362`, `src/renderer/features/import/state.ts:373`, `src/renderer/features/import/state.ts:381`, `src/renderer/features/import/state.ts:263`, `src/renderer/features/import/state.ts:255`, `src/renderer/features/import/state.ts:426`, `src/renderer/features/import/state.ts:438`

**Co się dzieje.** „Zaznacz wszystkie” → „Ustaw” na pierwszym imporcie roku. chooseSelected woła w pętli chooseGroup → patchChoices. Każde wywołanie kopiuje choices.groups i choices.remember (O(G)), a zustand synchronicznie uruchamia selektory wszystkich subskrypcji (7 na GroupRow, 3 na ThemeRow). Daje to O(G²) jeszcze przed renderem Reacta, który sam trwa 0,3–1,3 s (patrz znalezisko o ekranie importu). To samo w pętli chooseRow dla zaznaczonych wierszy oraz (mniej) w acceptSure / acceptHints – po jednym chooseTheme na temat.

**Poprawka.** W chooseSelected zbudować nowe groups / remember / rows (oraz accepted.groups bez zaakceptowanych) w jednej pętli na lokalnych kopiach i wywołać jeden useImport.setState. To samo dla skipSelected (już zbiorczy) i ewentualnie acceptSure / acceptHints (jeden setState na wszystkie tematy).

## W33. Podobne nazwy: similarPairs filtruje wszystkie reguły dla każdej marki i liczy się od nowa przy każdym „To nie to samo”

Priorytet: niski · obszar: import (ekran)

Gdzie: `src/renderer/features/import/Learning.tsx:54`, `src/shared/import/similar.ts:369`, `src/shared/import/similar.ts:371`, `src/renderer/features/import/rules.ts:185`

**Co się dzieje.** SimilarPanel liczy similarPairs przy każdej zmianie groups / rules / aliases / dismissed. Każde „To nie to samo” zmienia notSimilar, więc całość liczy się od nowa, a po zapisie fi.json dochodzi jeszcze pełny plan importu (patrz znalezisko o planie po zapisie fi.json). W środku dla każdej marki pliku jest `rules.filter(r => r.mode === 'exact' && r.match === e.brand)`, czyli O(marki × reguły), plus ruleEntries po wszystkich regułach. Przejście 60 par przy 150 tys. to 60 × (0,43 s + plan + render).

**Poprawka.** 1) W Learning.tsx rozdzielić liczenie: `const all = useMemo(() => similarPairs(groups, { rules, aliases, limit: Infinity }), [groups, rules, aliases])`, a potem `useMemo(() => all.filter((p) => !dismissed[p.key]).slice(0, 60), [all, dismissed])`. Wtedy „To nie to samo” tylko odfiltrowuje gotowy wynik (poniżej 1 ms). 2) W similar.ts reguły exact zindeksować raz w Map match → ImportRule[] zamiast filtrować dla każdej marki (linia 187). 3) Wynik brandOf dla reguły zapamiętać w WeakMap<ImportRule, BrandMatch> (ruleEntries, linia 162), bo to on dominuje, gdy reguł z wcześniejszych importów są tysiące.

## W34. keywordProposals: każde słowo-kandydat przegląda wszystkie wiersze pliku i parsuje wzorzec przy każdym wywołaniu; liczone od nowa przy każdej zmianie `choices`

Priorytet: niski · obszar: import (logika)

Gdzie: `src/shared/import/learn.ts:148`, `src/shared/import/learn.ts:169`, `src/shared/import/learn.ts:35`, `src/shared/import/brands.ts:69`, `src/renderer/features/import/Learning.tsx:130`

**Co się dzieje.** Duży plik (historia z kreatora, 8–30 tys. wierszy). Po decyzji dla grupy `RuleProposal` liczy `keywordProposals`, a memo zależy od całego `choices` (Learning.tsx:130). Każde kliknięcie na ekranie importu (decyzja innej grupy, „zapamiętaj”, pominięcie wiersza) przelicza więc propozycję dla ostatnio zdecydowanej grupy. Dla każdego słowa-kandydata pętla przechodzi wszystkie wiersze innych grup (`others`) i woła 2 × `keywordMatches`. Każde wywołanie od nowa buduje wzorzec: `pattern()` → `words()` → `tokens()` z regexem i `fold` z normalize. Pierwsze wywołanie po każdym planie liczy jeszcze `notWhat` po wszystkich wierszach (words × 3 na wiersz, cache w WeakMap po tablicy grup, więc ginie przy każdym replanie).

**Poprawka.** Skompilować wzorzec słowa raz na kandydata (eksport `compileKeyword` i matcher na gotowym wzorcu). Zamiast `[...ctx.rules, proposal]` sprawdzać, czy `findRule(ctx.rules, …)` daje regułę dokładną albo dłuższe słowo, które wygrywa z kandydatem (bez kopii). Indeks słowo → wiersze dla `others` liczyć raz na plan (WeakMap po grupach, jak `notWhat`). Memo w `RuleProposal` może zostać na `choices`: koszt po tych zmianach jest mały.

## W35. Reguły importu w fi.json rosną z każdą marką i nigdy nie są przycinane (≈0,4 KB na regułę), a wszystkie odczyty przeglądają je liniowo

Priorytet: niski · obszar: import (logika)

Gdzie: `src/shared/schema/budget.ts:215`, `src/shared/import/reconcile.ts:610`, `src/shared/import/classify.ts:28`, `src/shared/import/similar.ts:187`

**Co się dzieje.** Każda grupa zapamiętana w imporcie (domyślnie „zapamiętaj” jest włączone, także przez „Przyjmij pewne”) dopisuje regułę exact na markę × kierunek. Reguł marek, które nie pojawiły się od lat, nic nie usuwa: `hits` i `updatedAt` są zapisywane, ale nieużywane. Po imporcie 10-letniej historii jest ok. 1,2 tys. reguł (≈450 KB w fi.json), po latach kilka tysięcy (≈1–1,5 MB). Każdy zapis ustawień (dowolna zmiana w Ustawieniach, „to nie to samo”, połączenie nazw) przepisuje cały plik na OneDrive, a `.history` trzyma do 40 jego wersji. Liniowo po wszystkich regułach chodzą: `findRule` przy każdym wierszu, `similarPairs` (`opts.rules.filter` dla każdej marki pliku i `brandOf` dla każdej reguły spoza pliku), `candidates` w learn.ts (`rules.some` dla każdego słowa) i `upsertRule` (kopia tablicy dla każdej uczonej marki).

**Poprawka.** Indeks reguł w pamięci, liczony raz na tablicę (WeakMap<readonly ImportRule[], {exact: Map<match, ImportRule[]>, contains: ImportRule[], keyword: ImportRule[]}>), użyty w `findRule`. Dzięki temu dopasowanie exact to O(1), a liniowo przegląda się tylko nieliczne reguły contains / keyword. W `similarPairs` przypisanie `e.rules` też brać z tej mapy zamiast z `rules.filter` dla każdej marki. Wynik bez zmian, więc nie trzeba decyzji użytkownika. Automatycznego wygaszania starych reguł nie robić bez pytania: to zmiana zachowania widoczna dla użytkownika – zapytać z propozycją, ewentualnie dodać ręczne „Usuń nieużywane od N lat” po `updatedAt`. Przenoszenia reguł do osobnej kolekcji nie zalecam: zmienia format, a zysk jest mały. Listę w Ustawienia → Import przy tysiącach reguł warto zwirtualizować (@tanstack/react-virtual, jak w innych listach).

## W36. Scalanie i różnice na tablicach z id są O(R²) – przy tysiącach reguł importu każda zmiana fi.json kosztuje setki ms

Priorytet: niski · obszar: folder danych i synchronizacja

Gdzie: `src/shared/merge.ts:63`, `src/shared/merge.ts:67`, `src/shared/merge.ts:114`, `src/shared/remoteChanges.ts:94`, `src/renderer/store/data.ts:71`, `src/renderer/store/data.ts:589`, `src/renderer/features/sync/RemoteChangesDialog.tsx:39`

**Co się dzieje.** Po latach nauki z importów `settings.import.rules` ma kilka tysięcy reguł. Każde updateSettings zmieniające reguły („Zapamiętaj” w edytorze, decyzje i słowa kluczowe w imporcie, licznik hits po imporcie) woła stampEdits → changedPaths → diffRecords na tablicy reguł, który dla każdego id robi `a.find` i `b.find`. Zmiana fi.json z drugiego komputera → decideRemote (diffRecords + merge3, też z `find` na każde id); w trybie „pytaj” NewerBadge woła newerOf → merge3 przy każdym renderze okna.

**Poprawka.** W diffRecords i mergeAt budować raz `new Map(arr.map((x) => [x.id, x]))` dla każdej strony (O(R)). W diffRecords przed rekurencją pomijać pary o tej samej referencji (x === y). NewerBadge – useMemo na newerOf(item).

## W37. Po przeładowaniu okna (np. po awarii renderera) folder jest czytany od nowa z dysku zamiast z pamięci

Priorytet: niski · obszar: proces główny i okna

Gdzie: `src/main/index.ts:482-487`, `src/main/index.ts:1009-1016`, `src/main/datastore/store.ts:1066-1069`, `src/renderer/store/data.ts:616-623`

**Co się dzieje.** Renderer przy 150 tys. ma ≈1,2 GB sterty. Gdy padnie (`render-process-gone`), proces główny go przeładowuje, a `boot()` woła `loadCurrent`, który zawsze robi `openFolder(dir)`: nowy `DataStore` i ponowny odczyt i parsowanie wszystkich plików (6,2 s przy 30 tys., 17 s+ przy 150 tys.). Stary magazyn z identycznymi danymi zostaje w pamięci do końca otwarcia (≈0,8 GB przy 150 tys.), choć watcher trzyma go aktualnym. Metoda `store.snapshot()` (komentarz: „used after reconnecting the renderer”) istnieje, ale nikt jej nie wywołuje; kosztuje 46 ms przy 30 tys. i 470 ms przy 150 tys.

**Poprawka.** W handlerze 'loadCurrent': jeśli `store` jest otwarty i `store.root` jest zapamiętanym folderem (albo FI_DATA_DIR), a żadne otwarcie nie trwa, zwrócić `{ ok: true, snapshot: { ...(await store.snapshot()), status: store.status() } }` (status zawiera otherMachines); openFolder tylko przy pierwszym starcie albo zmianie folderu.

## W38. Plan miesiąca: każde przejście miesiąca (i każda minuta) liczy pensję i debriefing po całej historii, debriefing dwa razy

Priorytet: niski · obszar: silnik budżetu

Gdzie: `src/renderer/features/month/MonthPage.tsx:54`, `src/renderer/features/month/MonthPage.tsx:57`, `src/renderer/features/month/MonthPage.tsx:101`, `src/renderer/features/month/MonthPage.tsx:124`, `src/shared/calc/plan.ts:25`, `src/shared/calc/plan.ts:58`, `src/shared/calc/plan.ts:289`, `src/shared/calc/plan.ts:317`

**Co się dzieje.** Klikanie strzałek miesiąca w Planie miesiąca przy 150 tys. operacji. proposeSalary (memo na [transactions, month]) przy każdym miesiącu przechodzi całą historię dwa razy (firstFullMonth + costsByMonth z partsOf), choć potrzebuje 6 miesięcy. Debriefing (filter wszystkich operacji po miesiącu + filter/find całego logu) liczy się dwa razy: raz w useMemo, raz bez memo w JSX przy każdym renderze (MonthPage.tsx:101). Memo zależy od `fleet`, więc i tak przelicza się co minutę. 150 tys.: ≈ 90–100 ms na kliknięcie, 30 tys.: ≈ 15–35 ms. Ten sam wzorzec ma goalInflow po całym logu bez memo na Mapie gwiezdnej (14–18 ms na render przy 150 tys.).

**Poprawka.** (1) W MonthPage.tsx:101 zamiast drugiego wywołania podać `brief={month < current ? brief : null}`. Gdy month < current, `briefMonth === month`, więc `brief` to dokładnie ten sam wynik. (2) `costsByMonth` i `firstFullMonth` cache'ować w WeakMap po tablicy operacji: `useRecordList` zwraca stabilną tablicę, dopóki kolekcja się nie zmieni. Wtedy `proposeSalary` dla dowolnego miesiąca kosztuje <1 ms. To samo przyda się w `proposeEnvelopes`. Po obu zmianach kliknięcie przy 150 tys. wynosi ~20–25 ms. Indeks operacji po miesiącu jest opcjonalny. `goalInflow` w useMemo([fleet]) to kosmetyka.
