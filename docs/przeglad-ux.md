# Przegląd użyteczności – aplikacja na komputer (20.11.2026, po 1.20.0)

Zakres: wszystkie ekrany komputera (`src/renderer`, `src/main` tam, gdzie dotyczy okna); telefon pominięty. Metoda: pięć
przeglądów kodu po obszarach (powłoka okna, Operacje + Import, planowanie, Mostek + Wywiad + Raporty, Ustawienia +
Synchronizacja + słownictwo) i zrzuty wszystkich ekranów z budżetem testowym (3 miesiące operacji, plan, 3 kontenery, cel)
w oknie 1440×900. Najważniejsze tezy sprawdzone w kodzie przez sesję główną (oznaczone ✔). Identyfikatory `UX-…` są tylko
dla tego dokumentu.

Waga: **W** – wysoka (błąd, utrata pracy, zmiana danych bez kontroli, codzienna strata czasu), **Ś** – średnia, **N** –
niska. Wysiłek: S (do 1 h), M (1–3 h), L (więcej).

## 1. Niedziałające albo działające inaczej, niż wyglądają

| ID | Waga | Co | Gdzie | Propozycja | Wysiłek |
| --- | --- | --- | --- | --- | --- |
| UX-1 ✔ | W | „Ustaw regułę dla tytułu” zmienia historię (rodzaj, znak kwoty, kategorię, podziały) przez `replaceRecords` – z pominięciem pytania przy potwierdzonych saldach i wspólnego podglądu zmian zbiorczych; „Cofnij” przywraca wszystkie wpisy na ślepo (także zmienione później); historia domyślnie zaznaczona; słowo = cały tytuł | `operations/titleRules.ts:97-168`, `TitleRuleAction.tsx:58,79,113` | przez `bulkPlan` / `applyBulk` + `bulkPreview` (jak menu PPM), „Cofnij” z `undoKept`, przy N > 10 podgląd przed zapisem, słowo – najdłuższy wyraz tytułu | M |
| UX-2 ✔ | W | Ten sam „Ustaw regułę”: błąd (słowo < 2 litery, folder tylko do odczytu, odmowa reguły) nie jest nigdzie pokazany – okno „nie reaguje” | `TitleRuleAction.tsx:113-114` | komunikat przy polu (`res.error`) | S |
| UX-3 ✔ | W | Szybki wpis: Enter na przycisku („Wyczyść”, „Podziel”) albo na liście wyboru zapisuje operację zamiast działać na przycisku | `quick/QuickApp.tsx:577-589` | nie przechwytywać Enter, gdy cel to `BUTTON` / `SELECT` | S |
| UX-4 ✔ | Ś | Pasek wieczorny: klasy `border-border`, `bg-bg-elevated` nie istnieją w tokenach – zamknięty pasek bez tła i ramki; to samo `border-border` w oknie reguły | `evening/EveningReport.tsx:37`, `operations/TitleRuleAction.tsx:204` | `border-line bg-hover` | S |
| UX-5 ✔ | Ś | Pasek wieczorny („Dopisz / Dziś bez wydatków”) jest tylko na Operacjach – po 21:00 aplikacja otwiera się na Mostku i go nie widać | `operations/OperationsPage.tsx:578`, `store/ui.ts:32` | ten sam pasek nad Odprawą | S |
| UX-6 ✔ | Ś | Kreator, domownicy: wpisanie „ma oddać” zeruje „zaliczkę” i odwrotnie – bez słowa | `wizard/WizardPage.tsx:626,639` | drugie pole wyłączone z podpowiedzią „albo – albo” (albo jedno pole ze znakiem) | S |
| UX-7 ✔ | Ś | „Koperty ze średnich” nadpisuje ręczne limity bez pytania i bez „Cofnij” | `month/MonthPage.tsx:178-188` | toast „Cofnij” (wzór `copyOnward`) | S |
| UX-8 | Ś | Zatwierdzenie podziału łupów bez podsumowania i bez „Cofnij” | `month/actions.ts:106-109`, `MonthPage.tsx:574-579` | podsumowanie „X → cele, Y → następny miesiąc, reszta → osłony” + „Cofnij” | S–M |
| UX-9 ✔ | Ś | „Pomiń wpis” w dokowaniu zamyka okno od razu, bez „Cofnij” (odwrócenie tylko w zwiniętym „przywróć”) | `dock/DockingDialog.tsx:122-138`, `dock/actions.ts:184-189` | toast „Cofnij”, przycisk dalej od „Anuluj” | S |
| UX-10 ✔ | Ś | Toasty: domyślnie 3,2 s, bez zamknięcia kliknięciem, bez zatrzymania pod myszą – długie komunikaty błędów nie do przeczytania; ok. 25 różnych czasów w kodzie | `store/ui.ts:72`, `components/Toasts.tsx` | czas wg rodzaju i długości (błąd ≥ 8 s), pauza pod myszą, klik zamyka | S |
| UX-11 | Ś | Ctrl+K i Ctrl+1…0 działają nad otwartym oknem dialogowym (Ctrl+N ma osłonę) – zmiana ekranu zamyka okno z jego stanem; paleta może wejść pod okno | `app/App.tsx:80-125`, `CommandPalette.tsx:199`, `Modal.tsx:48` | ta sama osłona co Ctrl+N | S |
| UX-12 ✔ | Ś | „Wstecz”: `navigate` odkłada tę samą trasę (Ctrl+2 dwa razy = dwa wpisy, „wstecz” stoi w miejscu); brak „dalej”, brak Alt+← | `store/ui.ts:56-59` | bez duplikatów, Alt+← / Alt+→, przycisk myszy 4 | S |
| UX-13 ✔ | Ś | Kurs na 12 miesięcy: trzy kolumny z tym samym nagłówkiem „osłony · kadłub” | `intel/Course.tsx:106-114` | nazwa kursu w nagłówku | S |
| UX-14 | Ś | Pusty wynik filtrów („Brak operacji dla wybranych filtrów.”) bez wyjścia; w pustym bieżącym miesiącu nawet bez „wyczyść filtry” | `operations/OperationsPage.tsx:713`, `ListTools.tsx:43-45` | „Poprzedni miesiąc”, „Cała historia”, „Wyczyść filtry” | S |
| UX-15 | Ś | Po nadaniu kategorii w widoku „bez kategorii” (z Meldunków) wiersz znika, edytor zostaje na nim, nie ma „następnego” | `inbox/state.ts:161-163`, `OperationsPage.tsx` | przejście do następnego + „zostało N” | S |
| UX-16 ✔ | Ś | Pole terminu nowego celu to natywne `input type=month` („--------- ----”), a cel na liście pokazuje „2027-06” (ISO); to samo natywne pola dat w pasku okresu Operacji i wolny tekst „RRRR-MM” w Symulatorze | `starmap/StarMapPage.tsx:581`, `OperationsPage.tsx:85,94`, `intel/Course.tsx:270-278` | `MonthField` / `DateField` (zapis po wyjściu, Esc) | S |
| UX-17 | Ś | Symulator manewrów trzyma pola w `useState` – zmiana ekranu gubi wpisane wartości (pułapka AP-8) | `intel/Course.tsx:214` | `useDraft` | S |
| UX-18 | N | Baner „tylko do odczytu” odsyła do Ustawień → Aktualizacje, ale nie ma przycisku | `app/Banners.tsx:~108` | akcja „Aktualizacje” / „Spróbuj ponownie” | S |
| UX-19 | N | „Przeskanuj teraz” na Synchronizacji bez obsługi błędu | `sync/SyncPage.tsx:498` | wspólny `rescanWithToast` | S |
| UX-20 | N | ErrorBoundary: surowy `error.message`, „Wróć na mostek” zapętla się, gdy błąd jest na Mostku | `app/ErrorBoundary.tsx:30` | `plainError`, „Spróbuj ponownie”, „Folder logów” | S |
| UX-21 | N | Świętowanie awansu łapie Enter / Esc globalnie, bez pułapki fokusu – połyka Enter z formularza | `command/Celebration.tsx:52-58` | `Modal` / `useFocusTrap` | S |
| UX-22 | N | `ConfirmButton` zostaje „uzbrojony” po zmianie fokusu | `components/ConfirmButton.tsx:30` | rozbroić na blur / po 10 s | S |
| UX-23 | N | Duplikaty da się scalić tylko bez otwartego pliku importu – link „Możliwe duplikaty” z Operacji prowadzi wtedy donikąd | `import/DuplicatesPanel.tsx:84-92` | „Zamknij plik i scal” | S |
| UX-24 | N | „Zapamiętaj” (kategoria dla kontrahenta) bez „Cofnij”, a dla wpisu ręcznego w ogóle niedostępne | `import/rules.ts:69-80`, `OperationEditor.tsx:371-374` | toast „Cofnij”, wariant „kontrahent → kategoria” | S |

## 2. Nieintuicyjne

| ID | Waga | Co | Gdzie | Propozycja | Wysiłek |
| --- | --- | --- | --- | --- | --- |
| UX-30 ✔ | W | Odprawa na Mostku: każdy niezapłacony termin osobno („Kontener niezaładowany: Czynsz … termin 10.08 minął”, „…10.09…”, „…10.10…”) – przy jednym kontenerze bez dopasowanej płatności odprawa to ściana powtórzeń; to samo w Radarze | zrzut `bridge`, `radar`; `calc/briefing.ts` | grupowanie po kontenerze: „Czynsz: 4 terminy bez płatności (sie–lis) · Pokaż · Zapłacone poza budżetem” | M |
| UX-31 ✔ | Ś | Rzeczy „do zrobienia” w czterech miejscach: Odprawa (zaległe opłaty), Meldunki (bez kategorii, salda), pasek wieczorny (tylko Operacje), Radar – Meldunki nie mają zaległych opłat, Odprawa nie ma meldunków | zrzuty `bridge`, `inbox` | Meldunki jako jedna lista decyzji, Odprawa – skrót z licznikiem „N meldunków ›” | M |
| UX-32 | Ś | Mostek nie mówi „jak idzie ten miesiąc”: brak „wydano X z Y (dzień N z M)” i „dziś wydane / przydział” | `bridge/BridgePage.tsx:487-511,705-801` | pasek miesiąca nad Odprawą, klik → Operacje z filtrem | M |
| UX-33 ✔ | Ś | Dwie „Energie” obok siebie: „Energia dziś 96,54 zł” i „Energia · pensja miesiąca do wydania 6 202 zł” | `BridgePage.tsx:488,725` | „Energia miesiąca”, w wierszu też „dziś” | S |
| UX-34 ✔ | Ś | „Premium / Discount” przy każdej kopercie (Mostek, Plan) – obcy żargon, znaczenie tylko w dymku; „FVG kopert”, „Kurs przechwycenia”, „DOL” przy celu bez objaśnienia | `month/EnvelopeBars.tsx:34-41`, `MonthPage.tsx:290,676`, `starmap/StarMapPage.tsx:414` | etykieta tylko przy przekroczeniu tempa („+120 zł ponad tempo”); terminy ICT z prawdziwą nazwą obok | S |
| UX-35 | Ś | Metafory bez prawdziwej nazwy: „asteroida”, „boja” w Radarze; kolumny bez nagłówków (Radar „osłony po zdarzeniu”, Ładownia dwie kwoty i „(150,00 zł)” łamane w 3 linie) | `radar/labels.ts:4`, `RadarPage.tsx:315-323`, `cargo/CargoPage.tsx:188,201` | „opłata okresowa”, „zaplanowany”, nagłówki kolumn | S |
| UX-36 | Ś | „Kto finansuje”: „finansuje: Ola” / „prezent od: Ola” opisują zakup, który zapłacił kapitan, a Ola odda (albo nie) – brzmi odwrotnie | `household/MemberPickers.tsx:66-82` | „kupione dla: Ola (odda)”, „prezent dla: Ola” | S |
| UX-37 | Ś | Dwa przyciski podziału w edytorze: „Podziel paragon” i „Wspólnie” – różne skutki, podobne znaczenie | `operations/OperationEditor.tsx:360,435` | jeden „Podziel…” z wyborem „na kategorie / na osoby” | S |
| UX-38 | Ś | Import: „temat”, „marka”, „grupa”, „kategoryzacja” bez wyjaśnienia; „jak temat” = cofnij decyzję marki; checkbox w „Dopasowania” bez etykiety znaczy „połącz” | `import/ImportPage.tsx:408-410,774-935` | jedna linia wstępu, „cofnij do decyzji tematu”, etykieta „połącz” | S |
| UX-39 | Ś | Import ~100 wierszy: „Importuj (N)” w lewej kolumnie znika z ekranu przy pracy w prawej; brak licznika „bez decyzji: X” i ostrzeżenia „X wejdzie bez kategorii” | `ImportPage.tsx:340-362,1360-1385` | przyklejony pasek na dole importu z licznikami; po imporcie „Skategoryzuj pozostałe” | S–M |
| UX-40 | Ś | Wywiad: przełącznik 3 / 6 / 12 mies. w nagłówku działa tylko na 4 z ok. 14 paneli, reszta ma własne okresy i listy miesięcy | `intel/IntelPage.tsx:87-95,123` | podpis zakresu albo przełącznik w panelach | S |
| UX-41 | Ś | Wywiad: trzy nakładające się prognozy (zasięgu, kurs 12 mies., wieloletnia) + Zasięg na Mostku – każda z innymi założeniami | `IntelPage.tsx:226-259` | jedna sekcja „Prognozy” z zakładkami i zdaniem o różnicach | M |
| UX-42 | Ś | Wykresy bez legendy (krzywa majątku: ciągła / przerywana, drawdown, Killzones bez skali) | `intel/charts.tsx:55-138` | legenda jak w `Forecast.tsx:416-428` | S |
| UX-43 ✔ | Ś | Menu boczne: „Meldu…”, „Synchroni…”, „do rozp…” ucięte, bo miejsce zajmuje podpis skrótu (okno 1440 px) | `app/App.tsx:159-165` | skrót tylko w dymku dla dolnych pozycji albo węższy podpis | S |
| UX-44 | Ś | Ustawienia: 12 zakładek w płaskiej liście bez podziału „budżet (wspólne)” / „ten komputer”; tryb „Scalaj / Zawsze pytaj” w zakładce „Okręt”; skrót szybkiego wpisu w „Powiadomienia i dźwięki”; cisza nocna w „Warstwy i rozkazy” | `settings/SettingsPage.tsx:31-44,137-168`, `MachineTabs.tsx` | grupy w nawigacji, tryb scalania do „Folder i kopie” + link z Synchronizacji, skrót do „Zasobnik i start” | M |
| UX-45 | Ś | 20 przełączników powiadomień w jednej liście, bez grup i „włącz / wyłącz wszystkie” | `MachineTabs.tsx:~330-352` | grupy + przełącznik główny + „włączone N z 20” | S |
| UX-46 | Ś | Synchronizacja: konflikty (wymagają decyzji) pod trzema panelami informacyjnymi; „Oryginał / Kopia”, „duplikat identyfikatora” – żargon | `sync/SyncPage.tsx:265-284,538-561` | konflikty na górę, „Wersja z komputera X” | S |
| UX-47 | Ś | Pierwsze uruchomienie na drugim komputerze: główny przycisk zawsze „Utwórz w OneDrive” (otworzy istniejące, ale tego nie mówi; gdy OneDrive nie zdążył pobrać – tworzy nowy budżet obok) | `setup/FolderSetup.tsx:126-141`, `main/index.ts:206-212` | `defaultDataDir` sprawdza `fi.json`: „Otwórz dane z OneDrive (znalezione)”; bez niego – pytanie „pierwszy komputer?” | S |
| UX-48 | Ś | Plan miesiąca: kolejność dnia wypłaty (debriefing → łupy → pensja i koperty → dokowanie) nigdzie nie podana; debriefing na dole prawej kolumny za Sankeyem; plan dziedziczony z poprzedniego miesiąca niewidoczny | `month/MonthPage.tsx:137,160-171` | pasek „Na początek miesiąca” z krokami; baner „korzysta z planu {miesiąc}” | M |
| UX-49 | N | Kreator: ptaszek kroku = pozycja, nie poprawność; propozycje kontenerów domyślnie odznaczone; cisza nocna wygląda na pole, a nie da się jej zmienić; brak stanu pustego kont | `wizard/WizardPage.tsx:163,264,440-444,471` | walidacja kroku z „!”, „Zaznacz stałe płatności”, pola `TimeField` | S |
| UX-50 | N | „Raport wachty” to dwie różne rzeczy: pasek wieczorny (dzień) i zakładka Raportów (tydzień) | `evening/EveningReport.tsx:61`, `reports/ReportsPage.tsx:157` | pasek: „Wieczorne dopisanie” | S |
| UX-51 | N | Dowództwo: „dziś zgodny / naruszenie” schowane w panelu Seria, na górze tabela 6 klas i ściana tekstu rozkazów | `command/CommandPage.tsx:105-110,299-317,413-416` | pasek „Dziś: … · seria N · misja …” | S |
| UX-52 | N | Dokowanie: do pięciu akapitów ostrzeżeń przed podziałem, brak skutku „osłony X → Y” | `dock/DockingDialog.tsx:181-241` | jedno podsumowanie skutku, ostrzeżenia zwinięte | M |
| UX-53 | N | Zwijanie, ukrywanie, zmiana rozmiaru i odłączanie paneli – tylko przez dymki; odłączanie działa na 3 panelach Mostka, F1 o tym milczy | `components/Panel.tsx:187-260`, `store/detach.ts:9`, `ShortcutsHelp.tsx` | wiersze w F1, chevron przy tytule | S |
| UX-54 | N | Okno „Dni bez danych z banku” nie mówi, co zrobi zamrożenie | `command/FreezeQuestion.tsx:114-146` | jedno zdanie skutku | S |
| UX-55 | N | Daty bez roku i „W47” w dziennikach i misjach | `CommandPage.tsx:41,147,390`, `IntelPage.tsx:309` | `plDate`, „tydzień 47” | S |

## 3. Niespójności

| ID | Waga | Co | Propozycja |
| --- | --- | --- | --- |
| UX-60 | Ś | **Słownik** – ta sama rzecz pod kilkoma nazwami: odkładka / zbiornik / „Zbiorniki – odkładki”; kontener / stały koszt / opłata okresowa / asteroida; operacja / wpis (sync i historia mówią „wpis” o każdym rekordzie) / „Typ transakcji”; Wpływ / przychód; meldunek / powiadomienie / „Cofnij w powiadomieniu” (= toast); „Raport wachty” ×2; „prezent od” / „X – prezent”; „Okręt” jako zakładka ustawień ogólnych | jeden słownik pojęć (do decyzji – sekcja 6), zmiana tekstów, wpis w `ui.md` |
| UX-61 | Ś | Rozstrzyganie konfliktów: „Zachowaj tę wersję”, „Zaakceptuj nowsze”, „Przyjmij zmiany”, „Zachowaj moją”, „Weź z X”, „Zastosuj”; strony raz „oryginał / kopia”, raz „moja / z drugiego komputera” (`SyncPage.tsx`, `RemoteChangesDialog.tsx`) | jedna para „Ta wersja (ten komputer)” / „Wersja z X”, czasownik „Zachowaj” |
| UX-62 | Ś | Zapis reguł kategorii: w Imporcie „zapamiętaj” domyślnie włączone, w zmianie zbiorczej Operacji wyłączone, w edytorze osobny przycisk; cztery wejścia do reguł o różnych nazwach (`import/state.ts:699,852,930`, `OperationsPage.tsx:382`, `TitleRuleAction`, `KeywordRules`) | ta sama domyślna wartość i jeden tekst „Reguła = …”; w edytorze jedno „Zapamiętaj jako regułę…” z wyborem zakresu |
| UX-63 | Ś | Skróty zapisywane na 4 sposoby („Ctrl Shift Y”, „Ctrl+K”, „(? / F1)”, „Ctrl $” zamiast Ctrl+Shift+4 na polskiej klawiaturze); F1 bez skrótów szybkiego wpisu (Alt+P / Alt+I, Ctrl+Enter, Esc) | jeden `shortcutLabel`, grupa „Szybki wpis” w F1 |
| UX-64 | N | Przyciski zamykania bez reguły: „Anuluj”, „Zamknij”, „Później”, „Gotowe”, „×”, „Przerwij”; „odpuść” w Meldunkach na 5 sposobów („to nie powtórzenie”, „to w porządku”, „zostaw”, „zostaw tak”, „to nie duplikat”) | reguła w `ui.md`: Anuluj – formularz, Zamknij – okno informacyjne, Później – sprawa wraca; jedno „Zostaw – w porządku” |
| UX-65 | N | Archiwizacja vs usunięcie w Kategoriach: „×” = archiwizuj, kosz = usuń; przy kontach i domownikach przełącznik „archiwum” (`CategoriesTab.tsx:90-138`) | tekstowe „Archiwizuj” / „Usuń” wszędzie |
| UX-66 | N | Krzywa majątku na Mostku zawsze „na kontach”, w Wywiadzie wybór bazy – ta sama nazwa panelu, inne kwoty (`BridgePage.tsx:281-299`) | dopisek „(na kontach)” albo ta sama baza |
| UX-67 | N | Numery wersji w tekstach dla użytkownika („1.2.2”, „przed 1.3.0” – `ImportTab.tsx:36,73`, `HouseholdTab.tsx:50`); `ui-no-codes` ich nie łapie | opis zamiast numeru + rozszerzenie testu |
| UX-68 | N | Ustawienia: większość zmian zapisuje się od razu, część po wyjściu z pola, po puszczeniu suwaka albo przyciskiem – bez wskaźnika „zapisano” w samych Ustawieniach | zdanie „zmiany zapisują się od razu” + wskaźnik |
| UX-69 | N | Okresy: „/m”, „/mies.”, „miesięcznie”, „co miesiąc” (`CargoPage.tsx:201`, `StarMapPage.tsx:523`) | „zł/mies.” wszędzie |

## 4. Ergonomia – mniej kliknięć na co dzień

| ID | Waga | Co | Propozycja | Wysiłek |
| --- | --- | --- | --- | --- |
| UX-70 | W | Kategoria to natywny `<select>` z całym drzewem („Główna · Pod”) – w edytorze, szybkim wpisie i pasku zbiorczym; brak szukania po fragmencie i „ostatnich” (`operations/pickers.tsx:60-97`, `QuickApp.tsx:1111`) | combobox z filtrem po fragmencie, sekcja „ostatnie / najczęstsze”, podpowiedź oficera wybierana Enterem | M |
| UX-71 | W | Lista Operacji bez przepływu z klawiatury: wiersz nie przyjmuje fokusu, Enter nie przenosi do edytora, Tab chodzi po checkboxach wierszy, brak Delete i menu z klawiatury (Shift+F10) (`OperationsPage.tsx:209-215`) | Enter → edytor (Kwota / Kategoria), Delete z „Cofnij”, checkboxy `tabIndex=-1`, Shift+F10 = menu PPM | M |
| UX-72 | Ś | Kontrahent bez podpowiedzi z historii – literówki tworzą nowe „marki” | podpowiedzi jak `TagsField`; wybór podstawia ostatnią kategorię | M |
| UX-73 | Ś | Brak „Zapisz i dodaj kolejną” w edytorze (szybki wpis ma Ctrl+Enter) | Ctrl+Enter w edytorze = zatwierdź i nowy szkic | S |
| UX-74 | W | Brak przejścia z liczby do operacji: koperty (Mostek, Plan, FVG), wiersze Radaru, Bilans paliwa, Porównanie, Killzones – „skąd te 340 zł w Jedzeniu?” wymaga ręcznego filtrowania (`month/EnvelopeBars.tsx`, `RadarPage.tsx:303-352`, `intel/Fuel.tsx`, `Drill.tsx`) | klik → Operacje z filtrem kategoria + okres (`showFilter`, `Drill`), wiersz Radaru → kontener / pożyczka / boja | M |
| UX-75 | Ś | Formularze tworzenia stale rozwinięte i zajmują pół ekranu: „Nowa pożyczka”, „Nowa boja” (Radar), „Nowy cel” (Mapa) | przycisk „+ Pożyczka / + Boja / + Cel” otwierający formularz | S |
| UX-76 | Ś | Puste panele zajmują miejsce: „Rozliczenia z domownikami” przy 0 zł i bez domowników, „Dokowanie” bez ICTTJ, wiersz „Trading (XTB) 0,00” w Przychodach, „Odsłuch: brak polskiego głosu systemu” w nagłówku Odprawy | ukrywać same z siebie, gdy nie ma danych (z linkiem do ustawienia) | S |
| UX-77 | Ś | Edytor operacji: puste prawe pół ekranu („Wybierz operację…”), gdy nic nie wybrano; kolumna Kategoria ucięta („Jedzenie · kawa …”), gdy Notatka i Tagi puste | edytor chowany bez wyboru (albo podsumowanie miesiąca w tym miejscu); szerokości kolumn z danych | S–M |
| UX-78 | Ś | Paleta komend: bez „ostatnio używanych”, bez akcji „Zakończ aplikację”, „Wyczyść filtry”, „Pokaż panel…”; indeks ustawień niepełny (tryb scalania, progi gry, pliki w Pobranych, „Ustaw na tym komputerze”); Ustawienia bez wyszukiwania i bez zapamiętania ostatniej zakładki (Ctrl+, zawsze „Okręt”) | sekcja „Ostatnio”, brakujące akcje i ustawienia, pamięć zakładki | S |
| UX-79 | Ś | Pierwszy start: po utworzeniu folderu pusty Mostek z banerem, kreator 7 kroków bez ścieżki skróconej | kreator otwiera się sam raz; „Szybki start” (salda, pensja, koperty codzienne) | M–L |
| UX-80 | N | Wywiad – jeden zwój ok. 14 paneli; `debriefing()` i `rangeForecast()` liczone przy każdym renderze (co minutę) | zakładki (Struktura / Wydatki / Prognozy / Dziennik), `useMemo` | M |
| UX-81 | N | Ładownia: „Z historii – propozycje” po jednej, przez pełny formularz | ptaszki + „Dodaj zaznaczone (N)” z „Cofnij” | M |
| UX-82 | N | Domownicy bez jednego miejsca rozliczeń („Ola ma oddać X – oto zakupy – rozlicz”) – rozproszone po edytorze, Radarze i Mostku | ekran / panel rozliczeń per osoba z akcjami | L |
| UX-83 | N | Ścieżka folderu zajmuje górny pasek, nie jest klikalna | klik → Eksplorator albo nazwa okrętu + czas zapisu | S |
| UX-84 | N | Zmiana nazwy i scalanie tagów – brak (literówka w tagu = ręczna poprawa każdej operacji) | „Zmień nazwę tagu” w filtrze tagów | M |
| UX-85 | N | Eksport: brak „Pokaż w folderze” po zapisie, ZIP ignoruje okres bez słowa, brak eksportu raportu wachty | akcja w toaście, opis, eksport | S |

## 5. Plan prac

Cztery grupy według D104 (jedna gałąź, jeden PR, jedno wydanie i jedno CI na grupę; bez komendy nie zaczynam – D67).
Czasy oparte na grupie 1.20.0 (kroki wykonawców trwały tam 5–15 min, plus rundy poprawek, przeglądy i wydanie).

### Grupa P – poprawki (1.20.1) – rzeczy, które nie działają albo działają po cichu

| # | Krok | Wykonawca · przegląd | Model · thinking | Czas |
| --- | --- | --- | --- | --- |
| P0 | Kontrakt P1–P4 w `docs/postep.md` | sesja główna | Opus 5.5 · high | 15 min |
| P1 | UX-1, UX-2: reguła tytułu przez `bulkPlan` / `applyBulk` / `bulkPreview`, `undoKept`, błąd w oknie, propozycja słowa | `wykonawca-opus` · xhigh | Opus 5.5 · xhigh | 30–45 min |
| P2 | UX-6, UX-7, UX-8, UX-9, UX-24: „Cofnij” i podsumowania (koperty ze średnich, łupy, pomiń wpis, zapamiętaj), kreator „albo – albo” | `wykonawca-opus` · xhigh (łupy i plan miesiąca) | Opus 5.5 · xhigh | 30–40 min |
| P3 | UX-3, UX-4, UX-5, UX-10, UX-11, UX-12, UX-21, UX-22: Enter w szybkim wpisie, klasy paska, pasek na Mostku, toasty, osłona skrótów, „wstecz” bez duplikatów, świętowanie, `ConfirmButton` | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 30–40 min |
| P4 | UX-13, UX-14, UX-15, UX-16, UX-17, UX-18, UX-19, UX-20, UX-23: nagłówki kursu, puste filtry, „następny bez kategorii”, `MonthField` / `DateField`, szkic symulatora, banery, rescan, ErrorBoundary, duplikaty | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 35–50 min |
| P5 | Testy pełne + E2E, `/code-review` (xhigh na P1–P2, high na reszcie), CHANGELOG, PR, CI, wydanie | sesja główna | Opus 5.5 · high | 40–50 min + CI |
| | **Razem** | | | **ok. 3–4 h** |

### Grupa S – słownik i spójność (1.21.0) – po decyzjach z sekcji 6

| # | Krok | Wykonawca · przegląd | Model · thinking | Czas |
| --- | --- | --- | --- | --- |
| S0 | Słownik pojęć (decyzja D), reguła przycisków i słownika w `ui.md`, kontrakt | sesja główna | Opus 5.5 · high | 20 min |
| S1 | UX-60, UX-61, UX-64, UX-65, UX-67, UX-69, UX-50, UX-36: teksty wg słownika (bez zmian logiki), rozszerzenie `ui-no-codes` o numery wersji | `wykonawca-haiku` · high (teksty), przegląd sesja główna | Haiku 5.5 · high | 25–35 min |
| S2 | UX-33, UX-34, UX-35, UX-38, UX-42, UX-55, UX-66: metafora z prawdziwą nazwą, Premium tylko przy przekroczeniu, nagłówki kolumn, legendy wykresów, daty z rokiem | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 35–45 min |
| S3 | UX-43, UX-53, UX-63, UX-54: menu boczne bez ucinania, `shortcutLabel`, F1 (panele, szybki wpis), słowo w pytaniu o zamrożenie | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 25–35 min |
| S4 | Testy, `/code-review` high, CHANGELOG, PR, CI, wydanie | sesja główna | Opus 5.5 · high | 35–45 min + CI |
| | **Razem** | | | **ok. 2,5–3 h** |

### Grupa C – szybciej na co dzień (1.22.0)

| # | Krok | Wykonawca · przegląd | Model · thinking | Czas |
| --- | --- | --- | --- | --- |
| C0 | Kontrakt C1–C5 | sesja główna | Opus 5.5 · high | 20 min |
| C1 | UX-70: wspólny wybór kategorii z szukaniem i „ostatnimi” (edytor, szybki wpis, pasek i menu zbiorcze) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min |
| C2 | UX-71, UX-73, UX-72: klawiatura w liście Operacji, Ctrl+Enter = zapisz i nowa, podpowiedzi kontrahenta | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–60 min |
| C3 | UX-74: przejście z liczby do operacji (koperty, Radar, Bilans paliwa, Porównanie, Killzones) | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 30–45 min |
| C4 | UX-39, UX-62: pasek importu z licznikami, „Skategoryzuj pozostałe”, jednolite „zapamiętaj” | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 30–40 min |
| C5 | UX-78, UX-83, UX-85: paleta (ostatnie, brakujące akcje i ustawienia), pamięć zakładki ustawień, ścieżka folderu, eksport | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 25–35 min |
| C6 | Testy + E2E, `/code-review` high, CHANGELOG, PR, CI, wydanie | sesja główna | Opus 5.5 · high | 40–50 min + CI |
| | **Razem** | | | **ok. 4–5 h** |

### Grupa U – porządek ekranów (1.23.0)

| # | Krok | Wykonawca · przegląd | Model · thinking | Czas |
| --- | --- | --- | --- | --- |
| U0 | Kontrakt U1–U5 (z makietami tekstowymi do akceptacji) | sesja główna | Opus 5.5 · high | 25 min |
| U1 | UX-30, UX-31, UX-32, UX-76: Mostek – odprawa grupowana po kontenerze, meldunki jako jedna lista decyzji, pasek miesiąca, puste panele ukryte | `wykonawca-opus` · xhigh (`calc/briefing.ts`, `calc/inbox.ts` – reguła terminów z `feeDuesOf`) | Opus 5.5 · xhigh | 45–60 min |
| U2 | UX-48, UX-75, UX-77: Plan miesiąca – kroki dnia wypłaty i dziedziczenie planu; formularze tworzenia za przyciskiem; edytor operacji bez pustej połowy | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 40–50 min |
| U3 | UX-40, UX-41, UX-80: Wywiad w zakładkach, sekcja prognoz, `useMemo` | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 35–50 min |
| U4 | UX-44, UX-45, UX-46, UX-68, UX-47: Ustawienia w grupach, powiadomienia, Synchronizacja (konflikty na górę), pierwszy start na drugim komputerze | `wykonawca-sonnet` · high; UX-47 (`main`, folder danych) – `wykonawca-opus` · xhigh | Sonnet 5.5 · high / Opus 5.5 · xhigh | 45–60 min |
| U5 | UX-49, UX-51, UX-52: kreator (walidacja kroków, propozycje), Dowództwo „dziś”, skutek dokowania | `wykonawca-sonnet` · high | Sonnet 5.5 · high | 30–45 min |
| U6 | Testy + E2E, `/code-review` (xhigh na U1 i UX-47, high na reszcie), CHANGELOG, PR, CI, wydanie | sesja główna | Opus 5.5 · high | 45–60 min + CI |
| | **Razem** | | | **ok. 4,5–6 h** |

### Na później – osobne decyzje (większe)
UX-79 „Szybki start” kreatora (M–L), UX-82 ekran rozliczeń z domownikami (L), UX-81 zbiorcze propozycje Ładowni (M),
UX-84 zmiana nazwy tagów (M), odłączanie kolejnych paneli na drugi monitor (M).

**Razem P + S + C + U: ok. 14–18 h pracy Claude'a** (z górką; dotychczasowe grupy kończyły się w 0,15–0,7 planu).
Rekomendacja: P najpierw (błędy i zmiany danych bez kontroli, mało decyzji), potem S (tanie, porządkuje słowa przed
przebudową ekranów), dalej C (największy zysk w codziennym użyciu), na końcu U (najwięcej decyzji o wyglądzie).

## 6. Pytania do decyzji (zachowanie widoczne dla użytkownika) – z propozycją

1. **Słownik:** w tekstach „odkładka” (zbiornik tylko w dymku), „kontener” = pozycja Ładowni, „opłata okresowa”
   zamiast „asteroida”, „operacja” dla pieniędzy, „wpis” tylko w „szybki wpis”, „komunikat” zamiast „powiadomienie” dla
   toastów, „Wieczorne dopisanie” zamiast „Raport wachty dnia”, zakładka „Okręt” → „Ogólne”. Propozycja: tak.
2. **Premium / Discount przy kopertach:** pokazywać tylko przekroczenie tempa („+120 zł ponad tempo”). Propozycja: tak.
3. **Reguła tytułu:** historia domyślnie odznaczona, przy więcej niż 10 operacjach podgląd przed zapisem. Propozycja: tak.
4. **Puste panele na Mostku** (domownicy, dokowanie bez ICTTJ, trading 0) ukrywane same, z linkiem do ustawienia.
   Propozycja: tak.
5. **Meldunki jako jedyna lista „do zrobienia”** (także zaległe opłaty), Odprawa – skrót z licznikiem. Propozycja: tak.
6. **Wywiad w zakładkach** (Struktura / Wydatki / Prognozy / Dziennik). Propozycja: tak.
7. **Ustawienia w grupach** (Budżet – wspólne / Ten komputer / Dane i system), tryb scalania przy Synchronizacji.
   Propozycja: tak.
8. **Kolejność grup:** P → S → C → U. Propozycja: tak.
