# Audyt 1.15.4 – raport PM (Plan miesiąca), blok C, AU-10

- Data: 2026-11-03, przebiegi 15:38–16:00 (czas warszawski), zegar systemu bez zmian (dziś = D = 03.11.2026, M0 =
  listopad 2026, M-1 = październik, M+1 = grudzień).
- Wersja: Financial Intel 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4\app`), laboratorium `tests/audyt/lab.ts`
  (aplikacja jako przenośna, powiadomienia i dźwięki tylko zapisywane).
- Stan danych: persona „rok” (kotwica 2026-11-03, start budżetu 2025-09-01, wygenerowana 03.11.2026 ok. 15:17) i stany
  zbudowane na jej kopii albo od zera (sekcja „Stany zbudowane”). Stanów `brzegi` i `spec-dok` laboratorium nie ma – punkty
  z nimi mają stany zbudowane; persona nie ma pożyczki „Pożyczka od Marka” ani niezarchiwizowanego celu „Rower” (Rower jest
  zarchiwizowany) – zastępstwa opisane przy punktach.
- Skrypty: `tests/audyt/pm-1-rok.spec.ts`, `pm-2-koperty.spec.ts`, `pm-3-przydzial.spec.ts`, `pm-4-brzegi.spec.ts`,
  `pm-5-start.spec.ts`, `pm-6-plany.spec.ts`, `pm-7-uzupelnienia.spec.ts`; pomoc `tests/audyt/pm-pomoc.ts` (migawka folderu
  przy każdym odczycie, czytanie paneli Planu miesiąca, budowa stanów). Teksty ekranów: `C:\FI-audyt\przebiegi\pm-*\out\`,
  zrzuty `C:\FI-audyt\zrzuty\PM.*.png`.
- Odczyty liczb: `C:\FI-audyt\odczyty\pm.jsonl` – 64 wiersze, każdy z migawką `_migawka`
  (`C:\FI-audyt\migawki\pm\<punkt>-<n>\dane` i `\ictj`, bez `backups` i `.history`) – 64 migawki.
- Folder ICTTJ: po przebiegach z ICTTJ (`pm-1`, `pm-2`, `pm-3`, `pm-6`, `pm-7`) kopia identyczna ze stanem
  `stany\ictj-rok` (`diff -rq`) – nic nie zapisano.

**Podsumowanie (30 punktów):** ZGODNE 21 · NIEZGODNE 0 (K 0 · W 0 · S 0 · N 0) · UWAGA 2 (PM.22, PM.24) · LICZBY → AU-9 3
(PM.1, PM.5, PM.18) · NIE DO SPRAWDZENIA 1 (PM.20 – zegar, → maszyna) · poza laboratorium (maszyna) 3 (PM.14, PM.19, PM.30 –
z częścią sprawdzoną na danych z przeszłości).

## Stany zbudowane

| Przebieg | Stan (co zmieniono przed startem; id rekordów audytu `01KMXAPM…`) | Punkty |
| --- | --- | --- |
| `pm-1` | `rok` + plan października 2026: koperta Zdrowie 300 zł (było 150 zł) | PM.1, 4, 5, 10, 11, 12, 14, 18–22, 24, 27, 28 |
| `pm-2` | `rok` + plan listopada: Dom 700 zł, Prezenty i inne 0 zł; operacje mBanku: 01.11 paliwo 800 zł (ORLEN PM, 10:00), wyposażenie 300 zł (IKEA PM), zakupy spożywcze 50 zł (BIEDRONKA PM); 02.11 leki 165 zł (APTEKA PM), prezenty 60 zł (KWIACIARNIA PM), aplikacje 29,99 zł (APP STORE PM, bez kontenera), na mieście 234,48 zł (RESTAURACJA PM = przydział 02.11 84,48 zł + 150 zł). Auto +150 zł (23 %), Zdrowie +15 zł (10 %), Dom zapas 400 zł | PM.13, 16, 17, (30) |
| `pm-3` | `rok` + 01.11 zakupy spożywcze 40 zł; 02.11: bez kategorii 25 zł (SKLEP NIEZNANY PM), Netflix 43 zł (kontener Netflix), wydatek z celu „Wakacje 2027” 50 zł (podróże), zakup za Annę 60 zł (do zwrotu, zakupy spożywcze), wpływ 500 zł (URZAD SKARBOWY PM); stara pożyczka udzielona „Pożyczka dla Jacka (stara)” 1 500 zł z 15.03.2024 (rata 15.06.2024) z operacją; „Pożyczka od Marka” wzięta 3 000 zł 10.10.2026 (operacja; 10 rat po 300 zł od 15.11.2026) z kontenerem „Rata: Pożyczka od Marka” (300 zł, dzień 15, 2026-11…2027-08); „Pożyczka od Jacka” wzięta 1 000 zł 05.10.2026 (operacja; raty 500 zł 05.12.2026 i 05.01.2027) bez kontenera | PM.5, 6, 12, 29 |
| `pm-4a…d` | foldery od zera (`seedFolder`): start budżetu i gry 2026-10-01, plan października 4 000 zł (Jedzenie 1 500 i Rozrywka 500 – codzienne, Dom 500 i Prezenty 1 000 – planowe), listopad bez własnego planu; wydatki października 4 000 zł (05.10 1 500, 10.10 500, 15.10 1 000, 20.10 1 000 – łupy 0). Saldo otwarcia mBanku 01.10 / kadłub na start: **4a** 9 500 / 3 000 (przed 1.11 osłony 2 500, kadłub 3 000); **4b** 7 000 / 500 (2 500 i 500); **4c** 4 000 / 0 (0 i 0); **4d** 12 100 / 500 + cel „Rower PM” 2 000 zł (cel 5 000), 12.10 zaliczka Anny 500 zł, 25.10 dodatkowe 600 zł (październik 600 zł ponad energię), 02.11 wydatek 5 800 zł (Prezenty) | PM.2, 3, 15 |
| `pm-5` | folder od zera: kontener roczny „Ubezpieczenie mieszkania” 600 zł (termin 2026-11, dzień 2, od 2025-12); operacje mBanku: 14.10 zakupy 120, 20.10 paliwo 200, 25.10 wpływ 7 000, 28.10 kino 60, 01.11 zakupy 200 i ubrania 300, 02.11 zwrot ubrań +100 (wydatek dodatni) i płatność kontenera 600, 03.11 zakupy 45; kreator 03.11 z interfejsu: saldo mBanku 10 000 (pozostałe 0), pensja 4 000, średnie koszty 3 000, koperty Jedzenie 1 200 i Osobiste 300 | PM.6, 25 |
| `pm-6` | `rok` bez własnych planów 2026-09 (M-2) i 2026-11 (M0); plan sierpnia z decyzją łupów 03.09.2026 (zapas koperty Zdrowie 50 zł, osłony 160,68 zł); 12.09 wydatek bez kategorii 35,50 zł; 18.09 aplikacje 29,99 zł (bez kontenera); 28.10 płatność „OC samochodu” 1 240 zł (kontener roczny, termin 25.11) | PM.9, 10, 23, 24 |
| `pm-7` | `rok` bez zmian; `pm-2b` – folder `pm-2` po przebiegu (z pokryciami); `pm-4a2`, `pm-4b2` – foldery `pm-4a`, `pm-4b` z zamrażaniem dni od razu | PM.2, 3, 7, 17, 26, 28 |

## Punkty

### PM.1 – LICZBY → AU-9
- Stan: rok (pm-1), 15:39. Zrzuty: PM.1-pensja.png, PM.1-mostek.png
- Zrobione: Plan miesiąca → listopad → „Pensja”; Mostek → „Stan okrętu”.
- Widać: „Wypłacono: 6 500,00 zł”, bez dopisku o kadłubie, bez alarmu pensji; „Cel osłon: 19 500,00 zł (pensje × 3)”;
  Mostek „Osłony · bufor na pensje 13 000,00 zł / 19 500,00 zł”, „Energia · pensja miesiąca do wydania 6 204,63 zł”.
- Oczekiwane: wypłacono = pensja planu z osłon – jest; cel osłon 3 × 6 500 = 19 500 – jest; energia = pensja − raty
  odkładek (283,37 zł w „Podziale pensji”) − wydatki z energii (12 zł) = 6 204,63 – zgodna ze wzorem; liczby do wyroczni.

### PM.2 – ZGODNE
- Stan: brzegi pm-4a (osłony 2 500, kadłub 3 000 przed wypłatą 1.11, pensja 4 000), 15:53. Zrzuty: PM.2-pm-4a-pensja.png,
  PM.2-pm-4a-odprawa.png, PM.2-pm-4a-stan.png, PM.2-dowodztwo.png
- Zrobione: Plan miesiąca → listopad → „Pensja”; Mostek; Dowództwo (w pm-4a2 po zamrożeniu dni).
- Widać: „Wypłacono: 4 000,00 zł (z osłon – bufora na pensje 2 500,00 zł, z kadłuba – funduszu awaryjnego 1 500,00 zł)”,
  „Za mało w osłonach: 1 500,00 zł z kadłuba (żółty alarm).” (kolor akcentu); odprawa: „Pensja z kadłuba (funduszu
  awaryjnego): 1 500,00 zł – za mało w osłonach (buforze na pensje).” (żółta kropka); „Kadłub · fundusz awaryjny 1 500,00 zł”,
  „Osłony 0,00 zł”. Dowództwo po zamrożeniu dni (pm-4a2, 15:59): pasek „01.11.2026 – zgodny”, w dzienniku żadnego
  naruszenia z 1.11 (naruszenia tylko z października stanu: 05.10, 10.10, 20.10).
- Oczekiwane: podział 2 500 / 1 500, żółty alarm z prawdziwą nazwą, kadłub −1 500, dzień 1. bez naruszenia (T16).

### PM.3 – ZGODNE
- Stan: brzegi pm-4b (osłony 2 500, kadłub 500) i pm-4c (0 i 0), 15:53–15:54. Zrzuty: PM.3-pm-4b-pensja.png,
  PM.3-pm-4c-pensja.png, PM.3-pm-4b-odprawa.png, PM.3-dowodztwo.png
- Widać: w1 „Wypłacono: 3 000,00 zł (z osłon – bufora na pensje 2 500,00 zł, z kadłuba – funduszu awaryjnego 500,00 zł)”,
  „Pensja częściowa: brakuje 1 000,00 zł (czerwony alarm).” (czerwony), odprawa „Pensja częściowa: brakuje 1 000,00 zł –
  osłony (bufor na pensje) i kadłub (fundusz awaryjny) puste.” (czerwona kropka), osłony 0,00 zł, kadłub 0,00 zł;
  w2 „Wypłacono: 0,00 zł”, „Pensja częściowa: brakuje 4 000,00 zł (czerwony alarm).”, osłony i kadłub 0,00 zł. Dowództwo po zamrożeniu dni (w1, pm-4b2):
  „01.11.2026 – zgodny”, bez naruszenia z 1.11 (w2 – dzień 1.11 jeszcze nie zamrożony, w dzienniku bez naruszenia).
- Oczekiwane: jak widać; brakuje = pensja − (osłony + kadłub) = 1 000 i 4 000; bez wyjścia poniżej zera.
- Uwaga do ekranu: przy wypłacie 0,00 zł „Dzienny przydział” dalej pokazuje „Energia dziś 71,42 zł z 71,42 zł” przy
  „Energia miesiąca (pensja do wydania) 0,00 zł” – patrz Spostrzeżenia 1.

### PM.4 – ZGODNE
- Stan: rok (pm-1), 15:39–15:40. Zrzuty: PM.4-15000.png, PM.4-odprawa.png
- Zrobione: persona ma pensję 6 500 zł poniżej średniej 6 mies. „Razem” 9 666,67 zł – ostrzeżenia nie ma; pensja M0
  podniesiona do 15 000 zł (pole „Pensja”, Tab), potem równa średniej 9 666,67, potem 9 666,68, na końcu z powrotem 6 500.
- Widać: przy 15 000 „Pensja wyższa niż średni przychód z 6 mies. o 5 333,33 zł – osłony będą się kurczyć.”, w odprawie
  „Pensja wyższa niż średni przychód (do 6 ostatnich mies.) o 5 333,33 zł – osłony (bufor na pensje) będą się kurczyć.”;
  przy 9 666,67 brak ostrzeżenia; przy 9 666,68 „… o 0,01 zł …”; przy 6 500 brak.
- Oczekiwane: X = 15 000 − 9 666,67 = 5 333,33 (ta sama liczba w odprawie), przy pensji ≤ średniej brak. Średnia bez
  bieżącego miesiąca – wpływ 500 zł z 02.11 (pm-3) nie zmienił „Razem 6 mies.” (PM.5).

### PM.5 – LICZBY → AU-9
- Stan: rok (pm-1) 15:39; rok + listopad (pm-3) 15:51. Zrzuty: PM.5-przychody.png, PM.5-mostek.png
- Widać (Plan i Mostek identycznie): „Praca i inne 7 500,00 · 7 500,00 · 7 500,00 · 7 500,00”, „Trading (XTB) 2 000,00 ·
  2 166,67 · 1 958,33 · 2 250,00”, „Razem 9 500,00 · 9 666,67 · 9 458,33 · 9 750,00”; linii „Pełnych miesięcy historii”
  brak (14 pełnych miesięcy).
- Oczekiwane (zachowanie – zgodne): Mostek = Plan; bieżący miesiąc poza średnimi (wpływ 500 zł z 02.11 w pm-3 – liczby bez
  zmian); praca 7 500 bez zaliczek i spłat Anny i Marka oraz bez spłaty pożyczki Tomka (07.2026); trading z oknem netto
  (marzec −1 000 obniża okno 12 mies., mediana z miesięcy obciętych do 0), bez puli Podatek (luty 6 800 zł wpływów, w tym
  1 800 z puli Podatek – okno 12 mies. 23 500 / 12 = 1 958,33). Premii w personie nie ma (praca stała) – „premia podnosi
  średnie, nie medianę” nie do sprawdzenia na tym stanie. Liczby do wyroczni.

### PM.6 – ZGODNE
- Stan: start (pm-5, kreator 03.11, historia od 14.10) 15:55; rok + stara pożyczka z 15.03.2024 (pm-3) 15:51.
  Zrzuty: PM.6-start-M0.png, PM.6-start-M1.png
- Widać: start – Plan i Mostek „Średnie będą po pierwszym pełnym miesiącu historii.”; w „Pensji” M0 i M+1 brak propozycji;
  „Koperty ze średnich” (M0 i M+1) – toast „Za mało historii: koperty ze średnich po pierwszym pełnym miesiącu z danymi.”,
  koperty bez zmian (nie zera). Rok ze starą pożyczką: 12 liczb „Przychodów” identyczne jak bez niej (pm-1), „Koperty ze
  średnich z 3 mies. (sierpień 2026, wrzesień 2026, październik 2026).” i te same kwoty; propozycja pensji M+1 ukryta jak
  w pm-1 (równa planowi 6 500 zł – PM.7), Radar: „Pożyczka dla Jacka (stara) … następna 15.06.2024: 1 500,00 zł”.
- Oczekiwane: jak widać – stara pożyczka nie dokłada pustych miesięcy.

### PM.7 – ZGODNE
- Stan: rok (pm-1) 15:44 i rok (pm-7) 15:57. Zrzut: PM.7-propozycja.png
- Zrobione: grudzień (M+1, „korzysta z planu: listopad 2026”) – w rok propozycji nie widać, bo plan (6 500) równa się
  propozycji; pensja grudnia zmieniona na 7 000 → „przyjmij” → listopad i styczeń 2027.
- Widać: „Średnie koszty z 6 mies.: 6 417,54 zł · przyjmij 6 500,00 zł”; po „przyjmij” grudzień 6 500,00 („plan tego
  miesiąca”), listopad 6 500,00 bez zmian, styczeń 2027 „korzysta z planu: grudzień 2026”.
- Oczekiwane: N = 6 (maj–październik, bez listopada); X = średnia kosztów netto tych miesięcy z Planu kampanii (6 420,02 +
  6 370,87 + 6 709,18 + 6 043,49 + 7 548,47 + 5 413,19) / 6 = 6 417,54 – koszty września i października zgodne z moim
  rachunkiem z migawki (bez zakupów domowników, ze zwrotem 149,99); Y = 6 500 (w górę do 100 zł); M0 bez zmian.

### PM.8 – ZGODNE
- Stan: rok (pm-1), 15:44. Zrzut: PM.8-propozycja.png
- Zrobione: M+1 (grudzień) → „Koperty ze średnich” → Jedzenie poprawione na 1 234 → listopad → grudzień.
- Widać: toast „Koperty ze średnich z 3 mies. (sierpień 2026, wrzesień 2026, październik 2026).”; koperty grudnia: Dom
  120, Auto 950, Zwierzęta 280, Zdrowie 70, Prezenty i inne 350, Jedzenie 1 320, Rozrywka i hobby 310, Osobiste 610,
  Gotówka 130, Subskrypcje i łączność puste; po poprawce Jedzenie 1 234,00 zostaje; listopad bez zmian.
- Oczekiwane: średnie wydatki kategorii z 3 pełnych miesięcy do 10 zł, bez kontenerów i zakupów domowników – policzone
  z danych: Dom (0 + 0 + 369,89) / 3 = 123,30 → 120 (bez Czynszu 1 450 zł), Auto 2 846,88 / 3 = 948,96 → 950, Jedzenie
  (962,17 + 1 837,45 + 1 146,70) / 3 = 1 315,44 → 1 320 (bez udziałów Anny), Zdrowie 68,97 → 70 (bez CityFit),
  Subskrypcje – same kontenery, bez propozycji. Wszystkie wielokrotnościami 10 zł.

### PM.9 – ZGODNE
- Stan: pm-6 (rok bez własnych planów września i listopada), 15:56. Zrzuty: PM.9-debriefing-wrzesien.png, PM.9-kampania.png,
  PM.9-historia.png
- Zrobione: wrzesień (M-2) → koperta Jedzenie 1 750 → sierpień, październik, listopad, grudzień; Plan kampanii; historia.
- Widać: przed – wrzesień „korzysta z planu: sierpień 2026 – zmiana utworzy własny” (pensja i koperty sierpnia), listopad
  „korzysta z planu: październik 2026 …”; po – wrzesień „plan tego miesiąca”, pensja 6 500, Jedzenie 1 750, pozostałe
  koperty jak w sierpniu; październik, listopad, grudzień bez zmian (Jedzenie 1 600); debriefing września „Jedzenie
  1 837,45 zł z 1 750,00 zł −87,45 zł”, „Pula codzienna … 2 868,24 zł z 2 650,00 zł −218,24 zł”; kampania – wrzesień jasny,
  listopad i grudzień przygaszone; historia planu września „Brak zapisanych wcześniejszych wersji tego wpisu.” (pierwsza
  wersja); energia dziś 77,28 zł przed i po.
- Oczekiwane: jak widać.

### PM.10 – ZGODNE
- Stan: rok (pm-1) 15:39 i po decyzji łupów 15:40; pm-6 (Netflix 43 → 49 zł) 15:57. Zrzuty: PM.10-podzial-przed.png,
  PM.10.png, PM.10-ladownia.png, PM.10-netflix.png
- Widać: „Ładownia – stałe koszty › 1 755,99 zł” (Czynsz 1 450 + CityFit 129 + Internet 60 + Telefon 50 + Netflix 43 +
  Spotify 23,99; „Rata – rodzice” skończona w 10.2026 – poza), „Odkładki – opłaty okresowe 283,37 zł” rozwinięte: „OC
  samochodu · termin listopad 2026 · 1 240,00 zł · 103,37 zł”, „Podatek od nieruchomości · termin listopad 2026 · 150,00 zł ·
  75,00 zł”, „Prąd · termin listopad 2026 · 210,00 zł · 105,00 zł”; „Koperty planowe 1 500,00 zł”, „Koperty codzienne
  2 500,00 zł”, „+ łupy z października 2026 (decyzja „na następny miesiąc”) 100,00 zł”, „Podstawowy przydział: 86,66 zł
  dziennie”, „Rozdzielone 6 039,36 zł”, „Niezaplanowane – zostaje w energii (łupy) 460,64 zł”. Po „Zaktualizuj od listopada
  2026” (Netflix 49 zł): ładownia M0 „1 761,99 zł”, debriefing października bez zmian.
- Oczekiwane: wiersze sumują się do „Rozdzielone” (1 755,99 + 283,37 + 1 500 + 2 500); niezaplanowane 6 500 − 6 039,36;
  podstawowy przydział (2 500 + 100) / 30 = 86,66; nowa cena w M0. Nie sprawdzone: czerwone „Plan przekracza pensję o” (żaden
  stan nie przekroczył pensji); wiersza „Kurs przechwycenia” brak – rata celu „Nowy laptop” (od 09.2026) nie jest brana,
  bo osłony 13 000 < 19 500 (Spostrzeżenia 2).

### PM.11 – ZGODNE
- Stan: pm-1 po PM.22 (łupy na następny miesiąc 200 zł, zapas Zdrowie +200), 15:45–15:46. Zrzut: PM.11-codzienna.png
- Widać: przed „Podstawowy przydział: 90,00 zł”, „Energia dziś 84,42 zł z 96,42 zł”; Zdrowie → „codzienna”: Zdrowie
  w „Koperty codzienne” (2 650,00 zł; z zapasem +200), „Podstawowy przydział: 101,66 zł”, limit dzienny „3 050,00 zł”,
  „Energia dziś 96,92 zł z 108,92 zł” (Mostek to samo); po „planowa” – 90,00 / 84,42 / 96,42 jak przed; zmiana od razu.
- Oczekiwane: przydział rośnie o kopertę Zdrowia / 30 (z zapasem 350 / 30 = 11,66), energia wg PM.12
  (3 050 / 28 = 108,92), po przywróceniu jak przed.

### PM.12 – ZGODNE
- Stan: pm-3 (01.11 40 zł; 02.11 bez kategorii 25, Netflix 43, cel 50, za Annę 60; dziś Mokka 12), 15:50. Zrzuty:
  PM.12-przydzial.png, PM.12-mostek.png
- Widać: „Energia dziś 74,96 zł z 86,96 zł”, „Wydane dziś (koperty codzienne) 12,00 zł”, „Podstawowy przydział 83,33 zł”,
  „Koperty codzienne: wydane / limit 77,00 zł / 2 500,00 zł”, „Dni do końca miesiąca (z dziś) 28”; Mostek „74,96 zł”,
  „przydział 86,96 zł · podstawowy 83,33 zł”, rozbicie „Wydane z nich do wczoraj −65,00 zł … Przydział na dziś 86,96 zł”.
- Oczekiwane: X = (2 500 − 65) / 28 = 86,964… → 86,96 (w dół), energia 86,96 − 12 = 74,96; X > 83,33; bez kategorii
  (25) liczy się, Netflix, cel i zakup za Annę nie (77 = 40 + 25 + 12). Mostek = Plan. Rok bez zmian (pm-1): 89,28 / 77,28.

### PM.13 – ZGODNE
- Stan: brzegi-koperty (pm-2), 15:48–15:50. Zrzuty: PM.13-przydzial.png, PM.13-szybki.png, PM.13-po.png, PM.13-odprawa-po.png
- Widać: start „Energia dziś 67,12 zł z 79,12 zł”, rozbicie „Przekroczone wcześniej – mniej na każdy dzień −4,21 zł”;
  szybki wpis Jedzenie 100 zł – podgląd „Energia dziś: 66,59 zł → −33,41 zł” (po pokryciu z PM.17); po zapisie Mostek
  i Plan „−33,41 zł” na czerwono, odprawa „Przydział dnia przekroczony o 33,41 zł.”.
- Oczekiwane: przydział (2 500 − 284,48) / 28 = 79,12 < 84,48 przy wydatku równym przydziałowi (150 / 28 = 5,36);
  energia ujemna, czerwona, alarm z X; podgląd = energia po zapisie.

### PM.14 – poza laboratorium (maszyna)
- Część na danych z przeszłości (pm-1, 15:44; zrzut PM.14-luty.png): „Podstawowy przydział” w „Podziale pensji” – luty
  2026 „85,71 zł” (2 400 / 28), grudzień 2025 „77,41 zł” (2 400 / 31), kwiecień 2026 „80,00 zł” (2 400 / 30), październik
  2026 „80,64 zł” (2 500 / 31) – dzieli przez liczbę dni miesiąca: zgodne. Pierwszy i ostatni dzień – maszyna.

### PM.15 – ZGODNE
- Stan: brzegi pm-4d, 15:54. Zrzuty: PM.15-pm-4d-odprawa.png, PM.15-pm-4d-stan.png, PM.15-pm-4d-debriefing.png
- Widać: odprawa (czerwone) „Energia wyczerpana: 1 800,00 zł ponad energię miesiąca (pensja po ratach odkładek) poszło
  z osłon (bufora na pensje).”, „Deficyt: osłony (bufor na pensje) poniżej zera o 300,00 zł.”; „Osłony −300,00 zł”,
  „Kadłub 0,00 zł”, „Układy gwiezdne · cele 2 000,00 zł”, „Depozyt domowników 500,00 zł”, „Suma kont budżetu: 2 200,00 zł”;
  debriefing października „Energia wyczerpana: 600,00 zł ponad energię miesiąca 4 000,00 zł poszło z osłon.”.
- Oczekiwane: 5 800 − 4 000 = 1 800 ponad energię; osłony 1 000 → 0, kadłub 500 → 0, deficyt 300; cele i depozyt nietknięte;
  −300 + 0 + 2 000 + 500 = 2 200 = suma kont. (Energia dziś 71,42 zł mimo wszystko – Spostrzeżenia 1.)

### PM.16 – ZGODNE
- Stan: brzegi-koperty (pm-2), 15:48–15:49. Zrzuty: PM.16-odprawa.png, PM.16-koperty.png, PM.16-szybki.png
- Widać: odprawa „Koperta Auto ponad limit o 150,00 zł.” (czerwona kropka), „Koperta Zdrowie ponad limit o 15,00 zł.”
  i „Koperta Prezenty i inne ponad limit o 60,00 zł.” (żółte); Koperty: „Prezenty i inne … 60,00 / 0,00 zł”, „Bez koperty ·
  Subskrypcje i łączność 29,99 zł · 29,99 zł” (bez paska); szybki wpis Auto 50 zł – podgląd „Koperta Auto: 0,00 zł → −50,00
  zł”, energia dziś 66,59 zł przed i po.
- Oczekiwane: jak widać (próg 20 % – Auto 23 % czerwony, Zdrowie 10 % i limit 0 zł bez „poważnego”).

### PM.17 – ZGODNE
- Stan: brzegi-koperty (pm-2), 15:48–15:49; raport wachty – pm-2b. Zrzuty: PM.17-okno.png, PM.17-ponad-zapas.png,
  PM.17-odprawa-po.png, PM.17-wachta-biezacy.png
- Widać: okno „Pokryj przekroczenie: Auto · Ponad limit: 150,00 zł”, domyślnie „Jedzenie – zapas 1 303,52 zł”, kwota
  150,00; po wyborze „Dom – zapas 400,00 zł” kwota „150,00”, „najwyżej 400,00 zł”; po „Pokryj” toast „Koperta Auto pokryta
  z Dom: 150,00 zł limitu.”, Auto „800,00 / 800,00 zł”, Dom „300,00 / 550,00 zł” (w podziale „Dom 700,00 (−150,00)”, „Auto
  650,00 (+150,00)”); „Cofnij” – 650 i 700 z powrotem; drugi raz bez „Cofnij” – alarm Auto znika z odprawy; Zdrowie z Dom
  300 zł przy zapasie 250 – „Pokryj” nieaktywny; Zdrowie z Rozrywki 15 zł – „Podstawowy przydział” 83,33 → 82,83,
  „Energia dziś” 67,12 → 66,59 (Mostek to samo). Dziennik Dowództwa (pm-2b): „03.11 Pokrycie przekroczenia: Auto z koperty Dom – 150,00 zł
  limitu”, „03.11 Pokrycie przekroczenia: Zdrowie z koperty Rozrywka i hobby – 15,00 zł limitu” (cofnięte pokrycie – nie ma
  go); raport wachty bieżącego tygodnia pokazuje koszty i kategorie, pokryć nie.
- Oczekiwane: jak widać. Nie sprawdzone: „Żadna koperta nie ma zapasu w tym miesiącu.” (stan ma zapasy).

### PM.18 – LICZBY → AU-9
- Stan: rok (pm-1), 15:40. Zrzuty: PM.18-przed.png, PM.18-ponad.png, PM.18-po.png, PM.18-podzial-M0.png, PM.18-mapa.png
- Zrobione: październik → „Podział łupów”; „na następny miesiąc” 803,48 + cel 50 (suma ponad X); potem 100 i „cel: Wakacje
  2027” 50 (Rower jest w personie zarchiwizowany – cel niepełny: Wakacje 2027) → „Zatwierdź podział łupów”.
- Widać: „Do podziału: 803,48 zł – decyzja do 7 listopada, potem trafią do osłon.”; cele w formularzu: Nowy laptop, Wakacje
  2027, Wkład własny – mieszkanie, Nowe stanowisko tradingowe (bez Rowera); suma ponad X – przycisk nieaktywny; „do osłon
  (reszta) 653,48 zł”; po zatwierdzeniu „Decyzja z 03.11.2026: osłony 653,48 zł, następny miesiąc 100,00 zł, cele 50,00 zł.”;
  w listopadzie „+ łupy z października 2026 (decyzja „na następny miesiąc”) 100,00 zł”, „Podstawowy przydział: 86,66 zł”
  (było 83,33); Mostek osłony 13 000,00 → 13 653,48, cele 8 138,96 → 8 188,96.
- Oczekiwane (zachowanie – zgodne): reszta X − 150; przydział +100 / 30 = +3,33; cel +50; zarchiwizowany cel nieproponowany.
  X do wyroczni. Data „7 listopada” zamiast wzoru „07.MM” – ta sama treść.

### PM.19 – poza laboratorium (maszyna)
- Część w stanie rok (pm-1, 15:43; zrzut PM.19-sierpien.png): miesiące bez decyzji – „Łupy 210,68 zł bez decyzji do 7
  września – trafiły do osłon.” (sierpień 2026), „Łupy 190,60 zł … do 7 maja …” (kwiecień), „Łupy 419,95 zł … do 7 marca …”
  (luty), „Łupy 745,84 zł … do 7 listopada …” (październik 2025); miesiące bez łupów „Energia wydana do końca – bez łupów.”.
  Tekst zgodny; kwoty i ich obecność w osłonach – AU-9. Przejście 7. → 8. dnia – maszyna.

### PM.20 – NIE DO SPRAWDZENIA (zegar) → maszyna
- Stan: rok (pm-1), 15:41 – D = 3.11, przed terminem 7.11 (warunek punktu „D po 7. dniu” niemożliwy bez zegara).
- Część sprawdzona przed terminem: „Zmień podział łupów” → 200 i cel Wakacje 80 → „Decyzja z 03.11.2026: osłony 523,48 zł,
  następny miesiąc 200,00 zł, cele 80,00 zł.”; osłony 13 653,48 → 13 523,48, cele 8 188,96 → 8 218,96, „+ łupy” 100 → 200,
  energia miesiąca 6 304,63 → 6 404,63; suma warstw 13 523,48 + 6 404,63 + 39 066,30 + 8 218,96 + 1 600 + 4 797,20 =
  73 610,57 = „Suma kont budżetu”; drugi raz 300 → „Anuluj” – bez zmian; wrzesień (M-2, bez łupów) i starsze bez
  przycisku. „Decyzja zapisana po 07.MM.” – maszyna. Zrzuty: PM.20-edycja.png, PM.20-po.png

### PM.21 – ZGODNE
- Stan: rok (pm-1) po decyzji łupów (200 / 80 / zapas 200), 15:42. Zrzuty: PM.21-operacja.png, PM.21-po-wydatku.png,
  PM.21-po-usunieciu.png
- Zrobione: Operacje → nowa operacja 80 zł, 15.10.2026, zakupy spożywcze → Plan → październik; potem kosz w edytorze.
- Widać: „Decyzja z 03.11.2026: osłony 243,48 zł, następny miesiąc 200,00 zł, cele 80,00 zł, zapas kopert 200,00 zł.
  Łupy zmieniły się po decyzji (było 803,48 zł, jest 723,48 zł) – podział przeliczony: cele, następny miesiąc, reszta do
  osłon.”; po usunięciu (toast „Usunięto: AUDYT PM21 SKLEP −80,00 zł (15.10.2026).”) – „osłony 323,48 zł …” bez dopisku.
- Oczekiwane: jak widać.

### PM.22 – UWAGA
- Stan: rok (pm-1; październik Zdrowie 300 zł, wydane 78,07 zł – zapas 221,93 zamiast 200 z punktu), 15:41–15:42.
  Zrzuty: PM.22-formularz.png, PM.22-podzial.png, PM.22-koperty.png, PM.22-raporty-M0.png
- Zrobione: „Zmień podział łupów” → „zapas: Zdrowie” 250 → 200 → „Zatwierdź”; listopad; Raporty → Debriefing → listopad.
- Widać: pole po 250 „221,93” („do 221,93 zł”), po 200 „do osłon (reszta) 323,48 zł” (803,48 − 200 − 80 − 200); decyzja
  „… zapas kopert 200,00 zł.”; listopad „Zdrowie 150,00 (+200,00)”, Koperty „Zdrowie … 0,00 / 350,00 zł”, „Podstawowy
  przydział 90,00 zł” i „Energia dziś … z 96,42 zł” jak przed zapasem; energia miesiąca +200. Raporty, Debriefing –
  listopad 2026: „Zdrowie 350,00 zł 0,00 zł +350,00 zł” – bez „(w tym +200,00 zł zapasu i pokryć)”.
- Oczekiwane: wszystko poza dopiskiem jak w punkcie. Debriefing M0 w Planie się nie pokazuje (Plan na M0 pokazuje
  październik), a w Raportach brak dopisku „(w tym +200,00 zł zapasu i pokryć)” – tylko tekst (limit 350 poprawny).
- Kroki: jak „Zrobione”, potem Raporty (Ctrl+0) → „Debriefing” → listopad 2026 → tabela „FVG kopert”.

### PM.23 – ZGODNE
- Stan: pm-6 (wrzesień 2026 jako miesiąc z dodatkami – zastępuje M-1: październik persony nie ma opłaty ze zbiornika, zakupów
  domowników ani zapasu z łupów), 15:56. Zrzut: PM.23-wrzesien.png
- Widać: „Energia miesiąca · pensja 6 500,00 zł − odkładki 245,83 zł + łupy 50,00 zł · 6 304,17 zł”, „Wydane z energii (i
  ponad nią z osłon) 7 253,96 zł”, „Koszty netto miesiąca … 7 613,96 zł”, „Ładownia i odkładki 2 600,12 zł”, „Sfinansowane
  przez domowników (Marek, Anna, Kasia) – nie Twoje koszty 681,27 zł”, „Bez kategorii · liczy się do puli codziennej 35,50
  zł”, „Pula codzienna … 2 868,24 zł z 2 500,00 zł −368,24 zł”, „Zdrowie 77,36 zł z 200,00 zł (w tym +50,00 zł zapasu
  i pokryć) +122,64 zł” (zielone), „Jedzenie 1 837,45 zł z 1 600,00 zł −237,45 zł” (czerwone), „Bez koperty · Subskrypcje
  i łączność 29,99 zł” (bez paska), „Bilans paliwa: +1 886,04 zł (przychód 9 500,00 zł − koszty 7 613,96 zł)”.
- Oczekiwane: luka = limit − wydane; pula = codzienne (1 837,45 + 439,45 + 555,84) + bez kategorii 35,50; koszty netto
  policzone z migawki niezależnie: wydatki własne z kontenerami i zwrotem 149,99 = 7 613,96, zakupy domowników 681,27 osobno;
  bilans = 9 500 − 7 613,96. Październik persony (pm-1) – ten sam układ wierszy.

### PM.24 – UWAGA
- Stan: rok (pm-1) 15:42–15:43; pm-6 (OC 1 240 zł zapłacone 28.10 ze zbiornika) 15:56. Zrzuty: PM.24-M-1.png,
  PM.24-M-2.png, PM.24-raporty-M0.png, PM.24-pazdziernik-OC.png
- Widać: październik „Miesiąc zamknięty na plus · Wydatki z energii 5 413,19 zł nie przekroczyły energii miesiąca
  6 216,67 zł.” (klasy animacji `animate-event-in`, `animate-sweep`; klucz „fi.month.plus.2026-10” w pamięci okna – dźwięk raz;
  dźwięki w laboratorium wyłączone); z OC: „Wydatki z energii 5 516,56 zł nie przekroczyły energii miesiąca 6 216,67 zł.”
  przy „Koszty netto miesiąca 6 653,19 zł” > pensja 6 500 – nadal „na plus”; wrzesień „Energia wyczerpana: 934,30 zł ponad
  energię miesiąca 6 254,17 zł poszło z osłon.” bez fanfary; Raporty – listopad „Miesiąc zamknięty na plus · miesiąc trwa”,
  „Łupy … miesiąc trwa”. Plan miesiąca na listopadzie pokazuje „Debriefing – październik 2026” – tekstu „Miesiąc trwa –
  wynik po jego końcu.” nie ma nigdzie w Planie.
- Oczekiwane: M0 – „Miesiąc trwa – wynik po jego końcu.” (Plan) i „miesiąc trwa” (Raporty). Reszta zgodna (T178).
- Kroki: Plan miesiąca (Ctrl+4) na bieżącym miesiącu – prawa kolumna to debriefing poprzedniego miesiąca.

### PM.25 – ZGODNE
- Stan: start (pm-5), 15:55. Zrzuty: PM.25-kreator-pensja.png, PM.25-pensja.png, PM.25-plan.png
- Widać: kreator, krok „Pensja i warstwy” – „W tym miesiącu wydano już 400,00 zł: pierwsza pensja na resztę miesiąca to
  3 600,00 zł (pełna od 1. następnego miesiąca).” (to samo po powrocie z kroku 4); Plan „Wypłacono: 3 600,00 zł – pierwszy
  miesiąc budżetu: bez tego, co wydano przed startem”; „Dzienny przydział” „Energia dziś −5,72 zł z 39,28 zł”, „Podstawowy
  przydział 50,00 zł”, „Koperty codzienne: wydane / limit 445,00 zł / 1 500,00 zł”, „Dni do końca miesiąca (z dziś) 28”.
- Oczekiwane: 4 000 − (200 + 300 − 100) = 3 600 – bez płatności kontenera okresowego 600 zł i bez zakupu z dnia startu;
  zapowiedź = wypłata; przydział z całego miesiąca ((1 500 − 400) / 28 = 39,28; 1 500 / 30 = 50,00).

### PM.26 – ZGODNE
- Stan: rok (pm-7), 15:58. Zrzut: PM.26-po.png
- Zrobione: Ustawienia → Kategorie → „archiwizuj” przy „Zwierzęta” → Plan miesiąca listopad, grudzień, październik → toast
  „Cofnij” → listopad, grudzień, Ustawienia.
- Widać: toast „Zarchiwizowano „Zwierzęta” – jej koperta zniknęła z planu tego miesiąca i kolejnych.” z „Cofnij”; listopad
  „Rozdzielone 6 039,36” → „5 839,36”, „Koperty planowe 1 500,00” → „1 300,00”, wiersza Zwierzęta brak, „Podstawowy
  przydział: 83,33 zł” bez zmian; grudzień „Rozdzielone 5 801,82”, bez Zwierząt; październik – koperta Zwierzęta 200,00
  i debriefing „Zwierzęta 176,16 zł z 200,00 zł” bez zmian; po „Cofnij” listopad 6 039,36 / 1 500,00 / Zwierzęta 200,00,
  grudzień 6 001,82 z Zwierzętami, kategoria znowu z przyciskiem „archiwizuj”.
- Oczekiwane: jak widać (koperta planowa – energia dnia i przydział bez zmian).

### PM.27 – ZGODNE
- Stan: rok (pm-1), 15:44. Zrzuty: PM.27-grudzien.png, PM.27-radar.png
- Zrobione: grudzień → „Koperty ze średnich” (PM.8) → Jedzenie 1 234, Dom 444, Auto 777, pensja 7 100 → „bieżący”; Radar.
- Widać: grudzień „plan tego miesiąca”, pensja 7 100,00, koperty z propozycji z poprawkami; listopad bez zmian (6 500,00,
  Jedzenie 1 600, Dom 300, Auto 650); Radar „01.12 · pensja · Pensja od siebie · z osłon do energii miesiąca · 7 100,00 zł”;
  na grudniu brak paneli „Koperty”, „Dzienny przydział”, „Przychody”; prawa kolumna – „Debriefing – październik 2026”.
- Oczekiwane: jak widać (debriefing na grudniu to październik z nazwą miesiąca – Spostrzeżenia 4).

### PM.28 – ZGODNE
- Stan: rok (pm-1) 15:45; rok (pm-7) 15:58. Zrzuty: PM.28-2026.png, PM.28-kopia.png
- Widać (2026, Jedzenie): limity 1 500 (I–VII), 1 600 (VIII–X), pola edycji tylko w listopadzie i grudniu; fakt pod limitem
  – październik „1 146,70”, wrzesień „1 837,45” (= debriefing), przekroczenia (np. wrzesień, styczeń „1 755,68”) w kolorze
  akcentu rgb(232, 163, 61), nie czerwone; podpowiedź „październik 2026 · rok wcześniej: 1 413,99 zł”; suma roczna „18 134,00
  zł / 14 936,83 zł”. W pm-7 (marzec i czerwiec 2027 z własnym planem przez Dom 310 / 320): Jedzenie styczeń
  2027 → 1 700, „»” → toast „Jedzenie: 1 700,00 zł od stycznia 2027 do końca roku.” z „Cofnij”, cały 2027 rok 1 700 (marzec
  i czerwiec też), 2026 bez zmian; „Cofnij” – marzec i czerwiec z powrotem 1 600 (styczeń 1 700 – osobna edycja). W pm-1
  „»” bez dalszych własnych planów nic nie zmienił i nie dał toastu (dalsze miesiące i tak biorą plan stycznia).
- Oczekiwane: fakt jak w debriefingu, akcent, „»” tylko na dalsze miesiące roku, „Cofnij”, minione nieedytowalne, suma roczna.

### PM.29 – ZGODNE
- Stan: pm-3 (pożyczki Marka z kontenerem i Jacka bez), 15:51–15:52. Zrzuty: PM.29-radar-przed.png, PM.29-do-ladowni.png,
  PM.29-zaplac.png, PM.29-radar-po.png
- Widać: „Ładownia – stałe koszty › 2 055,99 zł” (z „Rata: Pożyczka od Marka 300,00 zł”), masa ładunku „stałe koszty
  2 314,32 zł/mies.”; „do Ładowni” tylko przy „Pożyczka od Jacka” → toast „Utworzono kontener „Rata: Pożyczka od Jacka”
  w Ładowni – raty zejdą z pensji.”; „zapłać ratę” → „Źródło spłaty”: „z pensji (Ładownia) ; z osłon (nadpłata)”, kwota 300,00:
  z pensji – dług 4 500 → 4 200, energia miesiąca 6 096,63 → 5 796,63, osłony 13 500 bez zmian, energia dziś 74,96 bez
  zmian; nadpłata z osłon – osłony 13 500 → 13 200, dług 4 200 → 3 900, energia miesiąca i dziś bez zmian.
- Oczekiwane: jak widać.

### PM.30 – poza laboratorium (maszyna)
- Przy okazji (pm-2) laboratorium zapisało próby powiadomień: „Koperta Auto przekroczona – Wydane 800,00 zł z 650,00 zł –
  ponad próg poważnego naruszenia.”, „Koperta Zdrowie przekroczona – Wydane 165,00 zł z 150,00 zł.”, „Koperta Prezenty
  i inne przekroczona – Wydane 60,00 zł z 0,00 zł.”, po pokryciach „Koperta Auto ponad 80% – Zostało 0,00 zł z 800,00 zł.”
  i „Koperta Zdrowie ponad 80% – Zostało 0,00 zł z 165,00 zł.”; po wydatku ponad energię dziś (−33,41 zł) w ciągu ok. 15 s
  żadnej próby. Ocena – maszyna.

## Znaleziska

Brak NIEZGODNE. UWAGA (tekst): PM.22 – w Raportach debriefing M0 bez „(w tym +200,00 zł zapasu i pokryć)”; PM.24 – „Miesiąc
trwa – wynik po jego końcu.” nie występuje w Planie miesiąca (na M0 prawa kolumna pokazuje debriefing M-1).

## Spostrzeżenia

1. „Energia dziś” nie patrzy na pensję wypłaconą: przy pensji częściowej 0,00 zł (PM.3 w2) i przy deficycie osłon −300 zł
   (PM.15) Plan i Mostek pokazują „Energia dziś 71,42 zł z 71,42 zł” obok „Energia miesiąca (pensja do wydania) 0,00 zł” –
   zgodne ze wzorem T30 (koperty codzienne), ale zaprasza do wydania pieniędzy, których w miesiącu nie ma (kandydat S).
2. „Kurs przechwycenia – raty celów z terminem” znika w bieżącym miesiącu, gdy osłony nie są pełne 1. dnia (rok: „Nowy laptop”
   z ratą od 09.2026, osłony 13 000 / 19 500) – bez słowa dlaczego; podpis „gdy osłony i kadłub pełne 1. dnia” jest tylko
   dla miesięcy w przód.
3. „+ łupy z października …” stoi w bloku „Koperty codzienne” podziału pensji, ale nie wchodzi do „Rozdzielone” (słusznie –
   to nie pensja); bez podpisu łatwo uznać, że wiersze się nie sumują.
4. Plan miesiąca na M0 i M+1 pokazuje w prawej kolumnie „Debriefing – październik 2026” (z „Miesiąc zamknięty na plus”
   i „ZAMKNIĘTY”) – przy przeglądaniu grudnia łatwo pomylić miesiąc.
5. Propozycja pensji („Średnie koszty z N mies.: X · przyjmij Y”) znika, gdy plan już jej równa się – średnich kosztów nie da
   się wtedy w ogóle zobaczyć w „Pensji” (PM.7).
6. „Pokryj z koperty…” proponuje domyślnie kopertę z największym zapasem – w pm-2 codzienną „Jedzenie – zapas 1 303,52 zł”
   (reszta puli na cały miesiąc); pokrycie z niej obniża energię dziś, a okno o tym nie mówi.
7. Po pokryciu przekroczonej koperty przychodzi powiadomienie „Koperta Auto ponad 80% – Zostało 0,00 zł z 800,00 zł.” po
   wcześniejszym „Koperta Auto przekroczona” – kolejność stanów wstecz (materiał dla maszyny, PM.30).
8. pm-5: opłata okresowa zapłacona 02.11 przed startem (600 zł, kontener „Ubezpieczenie mieszkania”) – w listopadzie odkładki
   600 zł (nadrabianie zbiornika do terminu 11.2026), „Energia miesiąca” 2 955 = 3 600 − 600 − 45, zbiornik 600 zł na opłatę
   już zapłaconą (do oceny w LA / AU-9; migawka PM.25-1).
9. pm-3: po wpływach pożyczek wziętych z października (05.10 1 000 zł, 10.10 3 000 zł) „Układy gwiezdne · cele” 12 088,96 zł
   wobec 8 138,96 zł w rok (+3 950 = 4 000 − 50 wydatku z celu), osłony 13 500 (rok 13 000 + wpływ 500 z 02.11), kadłub bez
   zmian. Zgodne ze specyfikacją, jeśli pożyczki wypełniły osłony (T31), a późniejsza dostawa z XTB (19–20.10) popłynęła dalej
   do celów – wtedy pieniądze pożyczki „wypychają” dostawę do celów; do potwierdzenia wyrocznią w DM / AU-9 (migawki PM.29-1
   i PM.1-1).
10. Plan kampanii – podpowiedź „rok wcześniej: 0,00 zł” dla miesięcy sprzed historii (styczeń–sierpień 2025) – lepiej „—”.
11. Zmiana Zdrowia na codzienną (PM.11) przenosi też zapas z łupów (+200) do puli dziennej (limit 3 050) – brzeg bez wymagania.
12. Pokrycia kopert (F28) są w dzienniku Dowództwa („03.11 Pokrycie przekroczenia: …”), ale nie w Raporty → „Raport wachty”
    (bieżący tydzień – tylko koszty i kategorie); raport wachty otwiera się na poprzednim pełnym tygodniu (26.10–01.11).

## Problemy narzędzi
- `lab.ts` – bez błędów. Własne skrypty: w pm-1 PM.26 czekał 30 s na pole usuniętej koperty (toast „Cofnij” zniknął po 8 s),
  a „»” w Planie kampanii był bez skutku (kolejne miesiące 2027 bez własnych planów – brak toastu); oba powtórzone w pm-7.
