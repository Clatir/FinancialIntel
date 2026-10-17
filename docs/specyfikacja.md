# Financial Intel – specyfikacja

Stan: 16.10.2026, po wywiadzie i rundach pomocniczych z użytkownikiem. Decyzje źródłowe: `docs/decyzje.md`.
Wersja do czytania i komentowania: dokument „Financial Intel — specyfikacja” w Claude. Po starcie prac źródłem prawdy
jest repozytorium (ten plik + `decyzje.md`).

## Podsumowanie

Financial Intel to osobista aplikacja budżetowa na Windows, w której użytkownik jest kapitanem okrętu, a jego finanse
systemami okrętu. Każdy wpływ trafia najpierw do osłon (bufora). Osłony co miesiąc wypłacają stałą pensję, a pensja
dzieli się na koperty i dzienny przydział energii.

**Cztery problemy do rozwiązania**
- Nie wiadomo, ile można dziś wydać.
- Nieregularne wypłaty z tradingu utrudniają planowanie.
- Pieniądze z tradingu mieszają się z prywatnymi.
- Wydatki nie są śledzone.

**Kryteria sukcesu po 3 miesiącach**
- Codziennie jedna liczba: ile mogę dziś wydać.
- Osłony i kadłub (poduszka) rosną z miesiąca na miesiąc.
- Żadna opłata okresowa ani PIT-38 nie zaskakuje budżetu.
- Aplikację otwiera się z przyjemnością, bez przymusu.

**Założenia stałe**
- Nazwa: Financial Intel. Okręt nazywa użytkownik, domyślnie „Flagowiec”.
- Windows 11 na kilku komputerach (nigdy naraz), synchronizacja przez OneDrive, bez wersji na iPhone'a.
- Interfejs po polsku, terminy ICT po angielsku.
- Wygląd jak w ICT Trade Journal: te same kolory, fonty, panele i paleta poleceń. Kosmos żyje w nazwach, a język ICT
  w analizach.
- Budżet prywatny. Trading, w tym konto tradingowe XTB, zostaje wyłącznie w ICTTJ. Słowo „firma” nie występuje.
- Wszystkie kwoty w PLN.

## Granica z ICT Trade Journal

ICTTJ zostaje źródłem prawdy dla tradingu, a FI dla wszystkiego, co dzieje się po wypłacie. FI czyta folder ICTTJ
wyłącznie do odczytu, a w samym ICTTJ nic się nie zmienia.

| Obszar | ICTTJ | Financial Intel |
| --- | --- | --- |
| Konto tradingowe XTB: wyniki, saldo, pule, rezerwa podatkowa | prowadzi w całości | nie pokazuje |
| PIT-38 | liczy kwotę z rezerwy | przypomina o terminie 30 kwietnia, bez kwoty |
| Wypłata z konta tradingowego (na mBank albo do Portfela XTB) | wpisujesz ją w ICTTJ | czyta wpis i proponuje dokowanie |
| Zwrot do masy (dopłata z budżetu do konta tradingowego) | wpisujesz go w ICTTJ | sprawdza rozkaz „firewall” |
| Wydatki | już ich w ICTTJ nie wpisujesz | jedyne miejsce wydatków |
| Cele prognozy | definiujesz w ICTTJ | pokazuje jako układy gwiezdne (tylko odczyt) |

Rozróżnienie kont XTB: **konto tradingowe (maklerskie)** należy wyłącznie do ICTTJ, a **Portfel XTB (konto bankowe
z kartą)** jest kontem budżetu FI.

**Co FI czyta z folderu ICTTJ**
- `payouts/**`: wpisy wypłat (z pulą) i zwrotów do masy. Wpisy wydatków są pomijane.
- `forecasts/*.json`: cele scenariuszy prognozy.

**Zasady odczytu**
- Ścieżka do folderu ICTTJ to ustawienie danego komputera.
- FI obserwuje zmiany plików ICTTJ i od razu powiadamia o nowej wypłacie do zadokowania.
- Nieznane pola są pomijane, a nowszy format ICTTJ daje ostrzeżenie zamiast błędu.
- Każdy wpis ICTTJ dokuje najwyżej raz, bo FI zapamiętuje jego id.
- „Kieszeń” pul i realizacja celów w ICTTJ przestaną się zgadzać. To świadoma decyzja: ICTTJ zostaje bez zmian.
- Przycisk „Otwórz ICTTJ” w FI uruchamia dziennik; w ICTTJ nic się nie zmienia.

## Pieniądze: konta, warstwy i przepływy

Każda złotówka na kontach budżetu należy do dokładnie jednej warstwy okrętu, a suma warstw zawsze równa się saldom
kont. Warstwy są wirtualne: w banku pieniądze leżą razem.

```text
Dostawa (XTB lub domownik) → 1 Osłony (do 3 pensji) → 2 Kadłub (do 6 mies. kosztów) → 3 Cele (wg priorytetów) → Wolne (do decyzji)
                             (nadwyżka płynie dalej, gdy warstwa jest pełna)
Pula Cele (ICTTJ) → prosto do Celów
Osłony → Pensja 1. dnia (stała kwota) → Energia miesiąca → Ładownia | Odkładki | Koperty planowe | Koperty codzienne
Koperty codzienne → Energia dziś (jedna liczba na dziś)
```

**Konta budżetu**

| Konto | Skąd dane | Uwagi |
| --- | --- | --- |
| mBank (ROR) | import CSV co 2–3 dni + szybki wpis | główne konto |
| Portfel XTB z kartą | tylko szybki wpis | brak eksportu; zasilany z konta tradingowego |
| Gotówka | bez osobnego portfela | wypłata z bankomatu = wydatek „Gotówka” |

Konto tradingowe XTB nie jest częścią FI; prowadzi je wyłącznie ICTTJ.

**Warstwy**

| Warstwa | Czym jest | Cel | Skąd się zasila |
| --- | --- | --- | --- |
| Energia | budżet bieżącego miesiąca | równa pensji | pensja 1. dnia miesiąca |
| Osłony | bufor na pensje | 3 pensje (do zmiany) | każda dostawa jako pierwsza |
| Kadłub | fundusz awaryjny | 6 × średnie miesięczne koszty netto z 12 miesięcy | nadwyżka ponad pełne osłony |
| Cele (układy gwiezdne) | oszczędności na cele z priorytetami | kwota celu | nadwyżka ponad pełny kadłub, wypłata z puli Cele w ICTTJ |
| Odkładki | zbiorniki na opłaty okresowe (asteroidy) | kwota opłaty w terminie | co miesiąc z energii |
| Należności | zakupy „do zwrotu” i pożyczki udzielone | zero | pożyczają z osłon, zwrot wraca do osłon |

Koszty netto to wydatki minus zwroty towarów. Nie liczą się do nich przelewy własne, dopłaty do XTB, zakupy
„do zwrotu” ani PIT-38 z rezerwy.

**Dokowanie: kolejność rozładunku każdego wpływu**
1. Osłony do celu (3 pensje).
2. Kadłub do celu (6 miesięcy kosztów).
3. Cele według priorytetów, każdy do swojej kwoty.
4. Reszta zostaje w osłonach ponad cel jako „wolne do decyzji”.

Wyjątki:
- Wypłata z puli Cele w ICTTJ idzie prosto do celów.
- Wypłata z puli Podatek w ICTTJ jest przepływem poza budżetem. Czeka na przelew do urzędu skarbowego i nie liczy się
  do kosztów.
- Wypłata z ICTTJ bez pary w CSV z mBanku przez 3 dni trafia do Portfela XTB; użytkownik potwierdza to przy dokowaniu.
- Wpływ z XTB w mBanku bez wpisu w ICTTJ dokuje normalnie, a FI przypomina o wpisie w ICTTJ.
- Podział zawsze można zmienić w oknie dokowania.

Przykład (test silnika): osłony 8 640 / 12 000 zł, kadłub 15 000 / 21 900 zł, dostawa 5 000 zł → osłony +3 360
(pełne), kadłub +1 640 (16 640 / 21 900), cele 0. Zasięg przy kosztach 3 650 zł / mies.: 6,5 → 7,8 mies.

**Pensja od siebie**
- Stała kwota przelewana z osłon do energii 1. dnia miesiąca.
- Kwotę proponuje kreator na podstawie historii wydatków, a użytkownik ją zatwierdza.
- Za mało w osłonach: reszta z kadłuba i żółty alarm. To nie jest naruszenie rozkazu.
- Za mało także w kadłubie: pensja częściowa i czerwony alarm.
- Ostrzeżenie, gdy pensja przewyższa średnie wpływy z 6 miesięcy, bo osłony będą się kurczyć.

**Zasięg i firewall**
- Zasięg = (osłony + kadłub) / średnie miesięczne koszty netto, w miesiącach.
- Dopłata do XTB jest dozwolona tylko z „wolnego do decyzji”, gdy osłony i kadłub są pełne. Inaczej czerwony alarm,
  potwierdzenie i poważne naruszenie.

## Codzienny rytm

Dzień kończy się dopisaniem wydatków, a import z mBanku co 2–3 dni tylko je uzupełnia i łączy duplikaty. Dzięki temu
„energia dziś” jest aktualna mimo braku aplikacji na telefon.

**Szybki wpis (globalny skrót, domyślnie Ctrl+Alt+B)**
- Rodzaj: wydatek, wpływ albo zakup „do zwrotu”.
- Pola: kwota, kategoria (oficer), konto (mBank albo Portfel XTB), godzina zakupu (domyślnie teraz, do poprawienia),
  notatka.
- Podgląd energii po operacji, zanim zapiszesz.
- Podział paragonu na kilka kategorii albo na część swoją i domową.
- Od progu (domyślnie 200 zł, w ustawieniach) pytanie dziennika kapitańskiego: „plan czy impuls?”.
- Cisza nocna (domyślnie 23:00–5:00): zakup z godziną w tym oknie wymaga potwierdzenia i krótkiego wpisu.
- Skrót można zmienić, gdy koliduje z platformą tradingową.

**Wieczorne dopisanie** – przypomnienie o ustalonej godzinie (domyślnie 21:00): „Raport wachty dnia: dopisz dzisiejsze
wydatki”.

**Import z mBanku (co 2–3 dni)**
1. Wybór pliku CSV z historii rachunku.
2. Łączenie wierszy z wpisami ręcznymi po kwocie, dacie ±3 dni i kontrahencie. Połączony wpis zachowuje kategorię
   i godzinę użytkownika, a bierze dokładne dane banku.
3. Nowe wiersze dostają kategorię z reguł, które uczą się z decyzji użytkownika. Historię kategoryzuje się grupami
   po kontrahencie.
4. Rozpoznawanie przelewów własnych, przelewów z i do XTB oraz wpłat od domowników.
5. Przed zapisem powstaje kopia zapasowa.

CSV z mBanku nie ma godzin, więc import nie wpływa na ciszę nocną ani na mapę godzin.

**Wpłaty od domowników** – przy każdej wpłacie wybór: zwrot (zamyka należność „do zwrotu”) albo przychód (dokuje
w osłonach). Gdy są otwarte należności, FI proponuje zwrot, a nadwyżkę jako przychód. Należność jest jedna dla całego
domu, bez podziału na osoby.

**Potwierdzanie sald (raz w tygodniu)** – saldo mBanku i Portfela XTB. Różnica daje alarm „rozbieżność w ładowni”
i wpis korekty do wyjaśnienia.

## Plan miesiąca i dzienny przydział

Pensja 1. dnia dzieli się kolejno na ładownię, odkładki i koperty, a koperty codzienne dają dzienny przydział energii.
Miesiąc budżetu to miesiąc kalendarzowy.

**Podział pensji**
1. Ładownia: stałe koszty jako kontenery (stałe, abonamenty, raty).
2. Odkładki: co miesiąc część każdej opłaty okresowej, np. OC 1 240 zł rocznie = 11 × 103,33 zł + 103,37 zł.
3. Koperty planowe (np. Auto, Zdrowie, Zwierzęta, Dom): własny limit miesięczny, nie ruszają energii dnia.
4. Koperty codzienne (np. Jedzenie, Rozrywka i hobby, Osobiste): ich suma tworzy dzienny przydział.

Które kategorie są codzienne, a które planowe, wybiera się w ustawieniach.

**Dzienny przydział (energia dziś)**
- Energia dziś = pozostała suma kopert codziennych / pozostałe dni miesiąca razem z dzisiejszym.
- Niewydana energia przechodzi na kolejne dni.
- Przekroczenie daje alarm, mniejszy przydział na kolejne dni i przerwaną serię.

**Ładownia i linia zanurzenia**
- Masa ładunku = stałe koszty jako % pensji. Limit (linia zanurzenia) domyślnie 40%.
- Nowy kontener ponad limit: ostrzeżenie i symulacja zasięgu przed zapisem.
- Kontener ma kwotę, cykl (co miesiąc, co N miesięcy, co rok), dzień płatności, konto i kategorię.

**Kategorie startowe (z podkategoriami, do edycji)**

Jedzenie · Dom · Auto · Zwierzęta · Zdrowie · Rozrywka i hobby · Subskrypcje i łączność · Osobiste · Prezenty i inne.
Kosztów tradingu nie zakładamy.

**Przypadki szczególne**
- Zwrot towaru to ujemny wydatek w tej samej kategorii.
- Pożyczka udzielona to należność, a jej spłata nie jest przychodem. Własna rata to kontener w ładowni.
- Wypłata z bankomatu to wydatek „Gotówka”.

**Debriefing i podział łupów (od 1. dnia miesiąca)**
- Niewydane pieniądze z kopert dzieli się: do osłon, na cel albo na następny miesiąc. Bez decyzji w 7 dni trafiają do
  osłon.
- Miesiąc, w którym koszty netto nie przekroczyły pensji, kończy ekran „Miesiąc zamknięty na plus”.
- Plan następnego miesiąca: kreator proponuje koperty ze średnich, użytkownik poprawia.

## Gra: Dowództwo

Stopień mierzy dyscyplinę, a klasa okrętu siłę finansową. Gra startuje od zera w dniu instalacji, a importowana
historia służy tylko statystykom.

**Rozkazy (domyślne, do zmiany w Dowództwie)**
- Dzienny przydział energii.
- Minimalne osłony: 1 pensja.
- Limit masy ładunku: 40% pensji.
- Cisza nocna: 23:00–5:00.
- Firewall dopłat do XTB.

**Ocena dnia** – dzień zamyka się 24 h po swoim końcu (czas na wieczorne dopisanie), potem jest zamrożony. Późniejsza
korekta danych zmienia budżet, ale nie odbiera awansu. Dzień zgodny to dzień bez złamanego rozkazu.

**Stopnie:** Kadet → Chorąży → Porucznik → Komandor → Kapitan → Admirał.
- Awans: 30 dni zgodnych w ostatnich 35.
- Degradacja: 3 poważne naruszenia w miesiącu kalendarzowym.
- Poważne naruszenia: koperta przekroczona o ponad 20%, osłony poniżej minimum z decyzji użytkownika (nie przez
  wypłatę pensji), dopłata do XTB wbrew rozkazowi, potwierdzony zakup w ciszy nocnej.
- Zwykłe przekroczenie dnia przerywa serię, ale nie liczy się do degradacji.

**Klasy okrętu (według zasięgu, mogą spaść)**

| Klasa | Zasięg |
| --- | --- |
| Zwiadowca | poniżej 1 mies. |
| Korweta | 1–3 mies. |
| Fregata | 3–6 mies. |
| Niszczyciel | 6–9 mies. |
| Krążownik | 9–12 mies. |
| Flagowiec | 12 mies. i więcej |

**Seria, misje i osiągnięcia**
- Seria to kolejne dni zgodne. Rekord serii widać w Dowództwie.
- Misje tygodniowe z puli szablonów dobieranych do słabych punktów, np. killzone wydatków. Wykonana misja skraca
  drogę do awansu o 3 dni.
- Ukryte osiągnięcia, np. „Cisza w eterze” (30 dni bez nocnych zakupów), „Pełne osłony”, „Asteroida rozbita” (opłata
  roczna w całości z odkładki).
- Ekran awansu i „Miesiąc zamknięty na plus” z krótką animacją i dźwiękiem.

**Smaczki ICT (propozycja do akceptacji w etapie E7)**
- Judas Swing: zakup oznaczony jako impuls.
- Turtle Soup: zwrot towaru.
- Liquidity sweep: dzień zakończony z energią równą dokładnie 0 zł.
- Order Blocks: kontenery ładowni na wykresie miesiąca.
- Silver Bullet: krótka odprawa w oknie 10:00–11:00 czasu NY.

## Ekrany

Nawigacja to menu boczne (decyzja D44). Pozostałe komponenty są takie jak w ICTTJ: panele z nagłówkiem, paleta
poleceń i skróty klawiszowe. Panele można zwijać, powiększać, ukrywać i odłączać na drugi monitor, a układy
się zapisują.

| Ekran | Co zawiera | Etap |
| --- | --- | --- |
| Mostek | odprawa, stan okrętu (osłony, energia dziś, kadłub, zasięg, masa ładunku, klasa), koperty, do zwrotu, ostatnie operacje; później radar, wywiad i krzywa majątku | E4 |
| Operacje | lista z filtrami i wyszukiwaniem, edycja z historią zmian, podział paragonu, oznaczenia (do zwrotu, plan lub impuls, noc) | E1 |
| Import | kreator CSV z mBanku: podgląd, dopasowania, kategoryzacja grupowa, potwierdzenie | E2 |
| Plan miesiąca | pensja, podział na ładownię, odkładki i koperty, dzienny przydział, debriefing | E3 |
| Ładownia | kontenery, odkładki, linia zanurzenia, symulacja dodania i zrzutu | E3 |
| Mapa gwiezdna | cele z prognozy ICTTJ i własne, priorytety, ETA | E5 |
| Radar | 90 dni: pensje, asteroidy, spodziewane wpłaty, przypomnienie o PIT-38 | E6 |
| Dowództwo | rozkazy, stopień, klasa, seria, misje, osiągnięcia, dziennik wachty | E7 |
| Wywiad | wykresy i analizy w języku ICT | E8 |
| Raporty | odprawa, raport wachty, debriefing, przegląd roczny, eksport | E8 |
| Ustawienia | folder, konta, kategorie, warstwy, rozkazy, powiadomienia, dźwięki, skróty, ICTTJ, import, kopie, aktualizacje | E0–E5 |

**Okna i zasobnik**
- Szybki wpis: małe okno nad wszystkimi, wywoływane skrótem.
- Dokowanie: okno podziału dostawy z dopasowanym kontem (E5).
- Ikona w zasobniku: energia dziś w dymku, ukryta w trybie ukrycia kwot. Menu: szybki wpis, otwórz, raport wachty
  dnia, zakończ.
- Start z Windows ukryty w zasobniku.
- Przycisk „Otwórz ICTTJ” w menu bocznym (E5).

Makiety (płótno „Flagowiec – makiety” w Claude, strona „Windows – kierunki wizualne”, rząd D – styl ICTTJ; w aplikacji
menu boczne zamiast paska u góry).

## Wywiad i raporty

Kosmos jest światem aplikacji, a język ICT nazywa analizy: tak jak na wykresie czyta się strukturę rynku, tu czyta się
strukturę własnych pieniędzy.

**Analizy warstwy wywiadu**

| Analiza | Co pokazuje |
| --- | --- |
| Daily Bias | na odprawie: Bullish, gdy energia dziś jest co najmniej równa podstawowemu przydziałowi, a koperty idą zgodnie z planem; Bearish, gdy energia spadła poniżej połowy podstawowego przydziału albo osłony są poniżej minimum; w pozostałych przypadkach Neutral |
| Krzywa majątku | majątek budżetu tydzień po tygodniu z drawdownem i oznaczeniami BOS i CHoCH (zmiana trendu) |
| Killzones | mapa wydatków: dzień tygodnia × godzina, tylko z wpisów z godziną |
| FVG | luka między planem a faktem w każdej kopercie, na debriefingu |
| Wydatki w czasie | kategorie miesiąc po miesiącu |
| Prognoza zasięgu | kiedy skończy się paliwo bez żadnej wypłaty |
| Dziennik kapitański | trafność „plan czy impuls”: ile było impulsów i na jakie kwoty |

Podstawowy przydział to suma kopert codziennych podzielona przez liczbę dni miesiąca.

**Rytuały**

| Rytuał | Kiedy | Treść |
| --- | --- | --- |
| Odprawa poranna | przy pierwszym uruchomieniu komputera danego dnia albo o ustalonej godzinie | Daily Bias, przydział dnia, alerty (asteroidy, rozbieżności, zaległy import), misja; odsłuch polskim głosem Windows przyciskiem albo automatycznie |
| Raport wachty | w niedzielę | tydzień w liczbach, killzone, plan kopert na tydzień, misja |
| Debriefing | od 1. dnia miesiąca | wynik wobec planu (FVG), seria, naruszenia, trafność dziennika, podział łupów, „miesiąc na plus”, plan następnego miesiąca |
| Przegląd roczny | w styczniu | rok w liczbach, majątek, zasięg, cele, przypomnienie o PIT-38 |

**Eksport:** CSV i Excel (operacje, miesiące), PDF (debriefing, przegląd roczny), pełna kopia danych w ZIP.

Bez asystenta AI (D74 – etap „Pierwszy oficer” wypadł).

## Powiadomienia, dźwięki i prywatność

Każde powiadomienie ma własny przełącznik i godzinę w jednej sekcji ustawień, osobno dla każdego komputera. Działają
w tle, bo FI startuje z Windows ukryty w zasobniku.

| Powiadomienie | Domyślnie |
| --- | --- |
| Odprawa poranna | przy pierwszym uruchomieniu dnia |
| Wieczorne dopisanie wydatków | 21:00 |
| Energia dziś poniżej 20% albo koperta powyżej 80% | włączone |
| Przekroczenie przydziału albo koperty | włączone |
| Asteroida (opłata okresowa) | 14 i 3 dni przed terminem |
| Zaległy import z mBanku | po 3 dniach |
| Potwierdzenie sald | w niedzielę |
| Raport wachty i debriefing | w niedzielę i 1. dnia miesiąca |
| Nowa wypłata w ICTTJ do zadokowania | włączone |

**Dźwięki** – osobno dla każdego zdarzenia (wpis, dokowanie, alarm, awans), z głośnością. Syntezowane w aplikacji
(WebAudio, jak alerty skanera w ICTTJ), bez plików i licencji.

**Animacje** – tylko przy zdarzeniach: dokowanie, awans, „Miesiąc zamknięty na plus”. Reszta interfejsu porusza się
jak w ICTTJ (120–160 ms).

**Prywatność**
- Bez blokady i bez szyfrowania: pliki są czytelne, jak w ICTTJ.
- Tryb ukrycia kwot włączany jednym skrótem maskuje kwoty w oknie i w dymku zasobnika.
- Sieć służy tylko aktualizacjom (GitHub). Bez telemetrii i bez asystenta AI (D74).

**Kopie zapasowe** – codziennie (30 ostatnich), przed każdym importem i przed migracją formatu, do tego kopie ręczne.

## Dane i synchronizacja

Dane leżą w osobnym folderze na OneDrive, np. `OneDrive\FinancialIntel`, w tym samym formacie co ICTTJ: jeden plik
JSON na rekord. Działają te same mechanizmy: zapis atomowy, historia zmian, scalanie zmian z drugiego komputera
i rozwiązywanie konfliktów.

```text
fi.json                                  ustawienia, kategorie, konta, warstwy, rozkazy, reguły importu, schemaVersion
transactions/RRRR/RRRR-MM-DD_ULID.json   operacja (data warszawska)
containers/ULID.json                     kontener ładowni albo opłata okresowa
goals/ULID.json                          cel własny albo stan celu z prognozy ICTTJ
months/RRRR-MM.json                      plan miesiąca: pensja, koperty, podział łupów
dockings/RRRR/RRRR-MM-DD_ULID.json       dokowanie: źródło (wpis ICTTJ albo wiersz CSV), konto, podział
loans/ULID.json                          pożyczka w jedną albo drugą stronę, z harmonogramem
balances/RRRR/RRRR-MM-DD_ULID.json       saldo otwarcia albo potwierdzenie salda konta
game/RRRR-MM.json                        oceny dni, naruszenia, misje, awanse (zamrożone)
backups/  .history/  .presence/          kopie, poprzednie wersje, obecność komputerów
```

**Zasady**
- Kwoty to liczby całkowite w groszach, tylko PLN.
- Czasy zapisane w UTC, wyświetlane w Warszawie. Operacja z importu ma datę bez godziny.
- Każdy rekord ma `schemaVersion`, `id` (ULID), `createdAt`, `updatedAt` i `updatedBy` (komputer). Nieznane pola są
  zachowywane.
- Stany warstw nie są zapisywane. Liczy je czysta funkcja z rekordów (wzór: księga wypłat w ICTTJ), więc każdy
  komputer widzi to samo.
- Ustawienia komputera (ścieżka ICTTJ, skrót, autostart, powiadomienia, dźwięki, układ okien, token aktualizacji, tryb
  ukrycia kwot) leżą w `config.json` w danych aplikacji, nie na OneDrive.
- FI nigdy nie zapisuje w folderze ICTTJ.

**Kreator startu**
1. Wybór folderu danych.
2. Konta i salda otwarcia (mBank, Portfel XTB).
3. Import całej dostępnej historii z mBanku i kategoryzacja grupowa.
4. Średnie koszty i na ich podstawie propozycja pensji, celu osłon (3 pensje) i kadłuba (6 miesięcy).
5. Podział obecnych środków na osłony, kadłub i cele.
6. Folder ICTTJ (opcjonalnie), rozkazy domyślne, nazwa okrętu, skrót, autostart.

## Technika

FI powstaje na tym samym stosie i wzorcach co ICTTJ, więc większość fundamentu przenosimy z jego repozytorium, zamiast
pisać od nowa. Decyzje techniczne podejmuje Claude, a użytkownik zatwierdza funkcje i wygląd.

**Stos** (wersje jak w `package.json` ICTTJ)
- Electron, React, TypeScript (strict), Vite (`electron-vite`), Tailwind.
- zod (schematy), zustand (stan), luxon (czas), ulid, yazl i yauzl (ZIP), cmdk (paleta), @tanstack/react-virtual,
  lightweight-charts.
- Bez natywnych modułów Node; biblioteki bundlowane do `out/`.
- Testy: Vitest (obliczenia i pliki) oraz Playwright `_electron` (E2E). Każda reguła pieniędzy i gry ma test na
  przykładzie z tej specyfikacji.
- Build: electron-builder, instalator NSIS i wersja przenośna (`Financial-Intel-Setup.exe`,
  `Financial-Intel-portable.exe`).
- CI: GitHub Actions. Linux przy każdym wypchnięciu, Windows tylko dla PR, gałęzi głównej i ręcznie.
- Aktualizacje: GitHub Releases z publicznego repozytorium (D61), bez tokena, sprawdzanie sumy SHA-256.

**Moduły do przeniesienia z ICTTJ** (kopiowane i dostosowane, ścieżki względem `src/`)

| Obszar | Pliki w ICTTJ |
| --- | --- |
| Folder danych | `main/datastore/*` (zapis, historia, kopie, watcher, obecność), `shared/merge.ts`, `shared/conflicts.ts`, `shared/remoteChanges.ts`, `shared/records.ts`, `shared/paths.ts` |
| Aktualizacje | `main/update/*`, `shared/update.ts`, `renderer/features/settings/UpdatesTab.tsx` |
| Okno i system | `main/tray.ts` (autostart ukryty), `main/detach.ts`, `main/log.ts`, `renderer/app/ErrorBoundary.tsx`, `renderer/app/Banners.tsx` |
| Interfejs | `renderer/styles/index.css` (tokeny), `renderer/components/ui.tsx`, `Panel.tsx`, `layout.tsx`, `MultiFilter.tsx`, `shared/panels.ts`, `renderer/features/layout/LayoutMenu.tsx`, `renderer/features/palette/CommandPalette.tsx`, `renderer/features/history/*` |
| Import i eksport | `shared/import/tables.ts` (CSV, Windows-1250), `shared/export/xlsx.ts`, `main/export/pdf.ts` |
| Build | `electron-builder.cjs`, `.github/workflows/ci.yml`, `build-windows.cmd`, `scripts/check-node.mjs` |

**Nowe części**
- `shared/calc/fleet.ts`: silnik warstw (dokowanie, pensja, koperty, przydział, odkładki, zasięg, klasa) jako czysta
  funkcja z rekordów.
- `shared/import/mbank.ts`: parser CSV z mBanku, ustalony na przykładowym pliku.
- `main/ictj/*`: odczyt folderu ICTTJ, tylko do odczytu, z obserwacją zmian.
- `shared/calc/game.ts` i `shared/calc/intel.ts`: gra oraz analizy ICT.
- Globalny skrót (Electron `globalShortcut`), powiadomienia (Electron `Notification`), odsłuch odprawy (Web Speech API
  z polskim głosem Windows), dźwięki (WebAudio).

**Repozytorium:** publiczne `Clatir/FinancialIntel` (D61), identyfikator aplikacji `app.financialintel.desktop`.

## Plan etapów

Szczegóły, kryteria „gotowe, gdy” i szablon komunikatu: `docs/plan.md`. Wersja 1.0 (rdzeń + klimat) = E0–E4, około
18–22 h pracy Claude'a; każdy etap kończy się działającym .exe.

## Kwestie otwarte

| Kwestia | Kiedy | Propozycja |
| --- | --- | --- |
| Format CSV z mBanku | przed E2 | przykładowy plik, zanonimizowany |
| Lista misji, osiągnięć i smaczków ICT | E7 i E8 | propozycja do akceptacji |
| Progi gry (minimalne osłony, 20% koperty, 30 z 35 dni) | po pierwszym miesiącu używania | kalibracja na danych użytkownika |
