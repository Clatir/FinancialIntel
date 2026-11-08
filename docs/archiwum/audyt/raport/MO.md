# Raport audytu – MO (Mostek)

- Data: 03.11.2026, 11:05–12:35 (zegar prawdziwy, Warszawa); wersja 1.15.4 z GitHub Releases (laboratorium `C:\FI-audyt`).
- Stan danych: persona `rok` (kotwica 2026-11-03) z folderem ICTTJ persony; stany szczególne zrobione na kopiach `rok`
  (opis niżej) – stanów `start` i `brzegi` laboratorium nie ma.
- Przebiegi: `mo-a` … `mo-h` (`C:\FI-audyt\przebiegi\mo-*`, teksty ekranów w `out\`), skrypty `tests/audyt/mo-*.spec.ts`,
  odczyty liczb `C:\FI-audyt\odczyty\mo.jsonl` (37 wierszy), zrzuty `C:\FI-audyt\zrzuty\MO*.png`.
- Folder ICTTJ: po każdym przebiegu z ICTTJ (`mo-a`, `b`, `b2`, `c1`, `c1b`, `c2`, `c3`, `d`, `f2`, `h`) kopia identyczna
  ze stanem (`diff -r`) – nic nie zapisano.

**Podsumowanie (34 punkty):** ZGODNE 13 · LICZBY → AU-9 9 · UWAGA 3 · NIEZGODNE 4 (W 1, S 2, N 1) · poza laboratorium 5
(MO.4, MO.16, MO.18, MO.19 – Maszyna; MO.17 – Ty).

## Stany szczególne (co dodano do kopii `rok`)

| Przebieg | Zmiana przed startem | Punkty |
| --- | --- | --- |
| `mo-c1` | rozkazy: linia zanurzenia 25 %, minimum osłon 3 pensje; 01.11 i 02.11 po 150 zł Jedzenie; 02.11 ORLEN 747,50 (Auto +15 %), Apteka 202,50 (Zdrowie +35 %), dwie dopłaty do XTB 200 i 300 zł (`trading`); dziś Lidl 120 zł | MO.3, 8, 9, 10, 24 |
| `mo-c1b` | 01.11 JUBILER 4 000 zł, 02.11 APART 3 000 zł (Prezenty); w trakcie – korekta salda Gotówki z Ustawień („Tak – zapisz korektę”) | MO.9, 10 |
| `mo-c2` | bez dzisiejszego zakupu Mokka 12 zł; koperta Subskrypcje 0 zł; dziś: zwrot towaru ZARA +49,99, ROSSMANN −80 (finansuje Anna), wpłata Anny +100 (zaliczka), przelew własny −500 (mBank → Gotówka); w trakcie – szybkie wpisy Orlen 100 zł, Apteka 160 zł | MO.8, 25, 31 |
| `mo-c3` | OC – dzień płatności 6 (za 3 dni), Prąd co kwartał 17.11 (14 dni), Podatek od nieruchomości 18.11 (15 dni), nowy kontener „Przegląd techniczny” 10.11 opłacony 02.11; potwierdzenia: mBank 01.11, Portfel XTB 24.10; ostatni import 31.10; boja „Wesele Oli” 06.11 na 75 000 zł; zwrot ALLEGRO z terminem 01.11; domownicy Tata (zakup 24.09, zwrot 50 zł bez wskazania), Mama (przez Tatę, 29.09), Ania (14.10) | MO.10–15 |
| `mo-f1/f2/f3` | cel osłon 1 pensja, kadłub 12 / 5 / 3 miesiące (`mo-f1` bez folderu ICTTJ) | MO.22, 28 |
| `mo-g`, `mo-g2` | nowy folder (`seedFolder`): budżet od 27.10 / 29.10, saldo otwarcia 25 000 zł, pensja 4 000 / 2 000 zł | MO.21, 22, 23, 30 |
| `mo-e` | pusty folder danych (bez kreatora) | MO.1 |
| `mo-b`, `mo-b2`, `mo-h` | `rok` bez zmian (+ `rok-nowe-historia.csv` w pobranych); zapisy z interfejsu w trakcie | MO.5, 12, 17, 31, 32, 34, 11 |

## Punkty

### MO.1 – ZGODNE
- Stan: pusty folder (`mo-e`), 11:27. Zrzut: MO.1.png
- Widać: Odprawa „Budżet jeszcze nie wystartował.” + „Kreator startu” (otwiera „Konta i salda”); bez energii, Daily Bias,
  Stanu okrętu i Dokowania; „Bez kopert w planie tego miesiąca.”, „Brak operacji – szybki wpis albo import z mBanku.”,
  „Średnie będą po pierwszym pełnym miesiącu historii.”, „Za mało danych – krzywa pojawi się po dwóch tygodniach historii.”

### MO.2 – LICZBY → AU-9
- Stan: rok (`mo-a`, 11:07). Widać: „ODPRAWA – 3 LISTOPADA”, „ENERGIA DZIŚ 77,28 zł”, „przydział 89,28 zł · podstawowy
  83,33 zł”, kolor jasny (fg-strong). Zakup finansowany przez Annę (ROSSMANN −80), przelew własny i wpłata domownika nie
  zmieniły energii (`mo-c2`: energia = przydział + zwrot towaru 49,99). Wydatek z celu – nie sprawdzono (brak w stanie).

### MO.3 – LICZBY → AU-9
- Stan: `mo-c1` (przekroczenia 01.11 i 02.11, dziś 132 zł). Zrzut: MO.3.png, MO.9.png
- Widać: „−53,43 zł” na czerwono; „Przydział dnia przekroczony o 53,43 zł.” (żółta); „▼ Bearish” w kolorze akcentu;
  rozbicie: „Przekroczone wcześniej – mniej na każdy dzień −4,76 zł”, „Przydział na dziś 78,57 zł”, „Wydane dziś −132,00 zł”.
  Czerwień tylko na kwocie i w alarmach czerwonych.

### MO.4 – poza laboratorium (Maszyna)

### MO.5 – LICZBY → AU-9
- Stan: rok (`mo-a`) i rok + łupy października 300 zł „na następny miesiąc” (`mo-b2`, decyzja w Planie miesiąca). Zrzut: MO.5.png, MO.5-lupy.png
- Widać (rok): „Koperty codzienne w tym miesiącu (plan i łupy) 2 500,00 zł / Wydane z nich do wczoraj 0,00 / Zostało na 28
  dni (z dzisiejszym) 2 500,00 / Podstawowy przydział (limit / 30 dni) 83,33 / Zaoszczędzone wcześniej – na każdy dzień
  5,95 / Przydział na dziś 89,28 / Wydane dziś −12,00 / Energia dziś 77,28”; po łupach: 2 800,00 … 100,00 … „Energia dziś
  88,00 zł”. Linie się sumują, N = 28, „zwiń” chowa rozbicie.

### MO.6 – LICZBY → AU-9
- Stan: rok (`mo-a`; pożyczka wzięta, dług 500 zł). Zrzut: MO.6.png
- Widać: „Osłony 13 000,00 / Kadłub 39 066,30 / Dług do spłaty −500,00 / Paliwo (bez dopływu wypłat) 51 566,30 / Koszty
  miesiąca (średnia z 12 mies.) 6 530,87 / Zasięg 7,8 mies.” = kafelek „7,8 mies.” z podpisem „(osłony − dług + kadłub) /
  koszty” (51 566,30 / 6 530,87 = 7,896 – obcięte, nie zaokrąglone); cele: „3 × pensja 19 500,00”, „6 × koszty miesiąca
  39 185,22” = cele w liniach warstw. Po kliknięciu drugiego rozbicia pierwsze się zamyka.

### MO.7 – UWAGA (tekst; liczby → AU-9)
- Stan: rok (`mo-a`). Zrzut: MO.7.png, MO.28.png
- Widać: „ostatnia dostawa (20.10.2026) – dokąd poszła?” → „Dostawa 3 000,00 / Cel: Nowy laptop 861,04 / Cel: Wakacje 2027
  2 138,96” (suma się zgadza). W panelu „Dokowanie” ta sama dostawa to „19.10.2026 · Wypłata z ICTTJ · Nadwyżki w masie”.
- Uwaga: dwie różne daty jednej dostawy na jednym ekranie (data operacji w banku 20.10 vs data wpisu ICTTJ 19.10) bez
  wyjaśnienia. Linii „Rezerwa na PIT-38” nie dało się sprawdzić – ostatnia dostawa persony nie ma części na PIT-38.

### MO.8 – ZGODNE (liczby → AU-9)
- Stan: rok (`mo-a`), `mo-c2`, `mo-c1`. Zrzut: MO.8-bullish.png, MO.8-neutral.png, MO.8-raporty-brzegi.png
- Widać: rok – „◆ Neutral” przygaszony (energia 77,28 < 83,33); `mo-c2` – „▲ Bullish” jasny (139,27 ≥ 83,33), po Orlen
  100 zł (Auto w limicie) dalej Bullish, po Apteka 160 zł (Zdrowie 160/150) „◆ Neutral”; `mo-c1` – „▼ Bearish” w kolorze
  akcentu (osłony poniżej minimum i energia < połowy). Raporty → Odprawa: ten sam bias w każdym stanie. Koperty codziennej
  ponad swój podział przy energii ≥ podstawowego nie da się zrobić 3. dnia miesiąca – nie sprawdzono.

### MO.9 – ZGODNE (liczby → AU-9)
- Stan: `mo-c1`, `mo-c1b`. Zrzut: MO.9.png, MO.9-energia-korekta.png
- Widać: na górze czerwone z czerwoną kropką i tekstem: „Firewall: dopłata do XTB 200,00 zł wbrew rozkazowi.”, osobno
  „… 300,00 zł …”, „Koperta Zdrowie ponad limit o 52,50 zł.”; żółte (kropka akcentu): „Koperta Auto ponad limit o 97,50 zł.”,
  „Przydział dnia przekroczony o 53,43 zł.”, „Osłony (bufor na pensje) poniżej minimum o 7 000,00 zł.”, „Masa ładunku (stałe
  koszty 2 014,32 zł/mies.) ponad linią zanurzenia.”; `mo-c1b`: „Energia wyczerpana: 795,37 zł ponad energię miesiąca (pensja
  po ratach odkładek) poszło z osłon (bufora na pensje).” (czerwona, jedna linia), po korekcie „Rozbieżność salda: korekta
  55,36 zł do wyjaśnienia.” „Bez alarmów – kurs stabilny.” – nie wystąpiło (persona zawsze ma pozycje informacyjne).

### MO.10 – ZGODNE
- Stan: rok, `mo-c1`, `mo-c1b`, `mo-c3`. Zrzuty: MO.10-*.png, MO.10-alarm-*.png, MO.10-c3-*.png
- Widać: asteroida, masa ładunku → Ładownia; nowa cena i kontener bez płatności → Ładownia z wyróżnionym kontenerem
  i jego sprawą (Netflix, Spotify); firewall → Operacje z otwartą tą operacją (300 zł); korekta → Operacje z otwartą „Korekta salda”; koperta,
  przydział, osłony, energia wyczerpana, łupy → Plan miesiąca; zaległy import → Import (nowy plik – wczytany, MO.12);
  salda → Ustawienia → Konta; dostawa → okno dokowania tej dostawy; pożyczka, boja, saldo konta naprzód → Radar; domownik →
  Operacje „cała historia · Oznaczenia: domownik”; misja → Dowództwo; zwrot po terminie → ta operacja. Nieznany sygnał,
  ICTTJ, PIT-38 – nie klikano (brak w stanach lub pominięte).

### MO.11 – NIEZGODNE (S)
- Stan: `mo-c3` (dni płatności zmienione w plikach) i powtórzenie `mo-h` (rok; Ładownia → OC samochodu → „Płatność”
  06.11.2025 zamiast 25.11, z interfejsu), 11:20 i 11:30.
- Zrobione: przeczytano asteroidy na Mostku, listę i szczegóły kontenera w Ładowni, Radar.
- Widać: Mostek „Asteroida: OC samochodu za 3 dni – 1 240,00 zł, w zbiorniku 1 240,00 zł.”; ten sam kontener w Ładowni
  „termin 25.11”, w szczegółach „Termin: 25.11 – 1 240,00 zł. dzień płatności z historii: 25.” (a w polu „Najbliższa:
  06.11.2026”), na Radarze „25.11 asteroida OC samochodu”. W `mo-c3` odwrotnie: Podatek od nieruchomości na Radarze i w
  Ładowni 15.11 (za 12 dni), na Mostku brak asteroidy (bo dzień kontenera 18 → 15 dni).
- Oczekiwane: asteroida w oknie 14 dni tej samej opłaty, którą pokazują Ładownia i Radar („kwota i stan zbiornika jak w
  Ładowni”). Kwoty i zbiorniki są zgodne; rozjeżdża się termin – odprawa liczy z dnia kontenera, Ładownia i Radar z dnia
  płatności z historii. Skutek: ostrzeżenie za wcześnie albo wcale.
- W zakresie samego punktu poprawnie: OC za 3 dni żółta, Prąd (co kwartał) za 14 dni informacyjna, termin za 15 dni bez
  pozycji, opłata zapłacona przed terminem (Przegląd techniczny) bez pozycji.
- Zrzut: MO.11-ladownia-po-zmianie.png, MO.11-mostek-po-zmianie.png, MO.15-odprawa.png

### MO.12 – ZGODNE
- Stan: rok (import 7 dni temu), `mo-c3` (3 dni), `mo-b2` (plik w pobranych). Zrzut: MO.12-import.png
- Widać: „mBank: ostatni import 7 dni temu – zaimportuj nowy plik (w mBanku: Historia → lista operacji → „Eksportuj”
  CSV).”; przy 3 dniach brak pozycji; „Nowy meldunek z mBanku (27.10–02.11): rok-nowe-historia.csv w folderze Pobrane –
  importuj.” → Import z wczytanym plikiem („historia rachunku · 10 operacji”, podgląd „Importuj (10)”). Próg dokładnie 5 dni
  nie sprawdzony.

### MO.13 – ZGODNE
- Stan: `mo-c3` (mBank potwierdzony 01.11, Portfel XTB 24.10, Gotówka nigdy); rok (mBank 8 dni).
- Widać: tylko „Portfel XTB: saldo potwierdzone 10 dni temu – sprawdź z bankiem.”; w `rok` osobno „mBank: saldo
  potwierdzone 8 dni temu …” i „Portfel XTB: potwierdź saldo z bankiem (raz w tygodniu).”; nigdy o Gotówce; klik → Ustawienia → Konta.

### MO.14 – LICZBY → AU-9
- Stan: `mo-c3`. Zrzut: MO.14-panel.png, MO.15-odprawa.png
- Widać: „Tata: do oddania 150,00 zł – najstarszy zakup z 24.09 (40 dni); zwrot 50,00 zł czeka na przypisanie do
  zakupów.”, „Mama: do oddania 150,00 zł – najstarszy zakup z 29.09 (35 dni) – przekazuje przez: Tata.”, osobno „Marek …
  (75 dni)”; Ania (20 dni) bez pozycji; kwoty jak w panelu rozliczeń; klik → wydatki domowników w Operacjach.

### MO.15 – ZGODNE (liczby → AU-9)
- Stan: `mo-c3`, `mo-c1` (nietypowe zakupy). Zrzut: MO.15-odprawa.png
- Widać: „Misja tygodnia – Killzone: …”, „Boja: Wesele Oli – prezent za 3 dni – 75 000,00 zł (wydatek).”, „Na koncie mBank
  zabraknie 5 413,96 zł na płatność 06.11 (Wesele Oli – prezent).” (Radar: „Zabraknie 5 413,96 zł na płatność 06.11”),
  „Nieznany sygnał na radarze – ORLEN 747,50 zł (02.11) – zwykle do 255,46 zł.”, „ALLEGRO: 320,00 zł zwrotu nie dotarło od
  2 dni (termin 01.11, zakup 22.10).”, „Kontener cięższy niż w manifeście – …”, „Kontener bez płatności – Spotify …”. Po
  „To nie zmiana ceny” (Prąd) pozycja zniknęła i nie wróciła.

### MO.16 – poza laboratorium (Maszyna)

### MO.17 – poza laboratorium (Ty)
- Przy okazji w laboratorium: przycisk „Odsłuchaj” jest (system ma głosy pl-PL Adam i Paulina); syntezator podstawiony,
  więc bez dźwięku. Tekst: „Odprawa, 3 listopada. Energia na dziś: 40 złotych 28 groszy. Daily Bias: Bearish. Asteroida: …
  – 150,00 złotych, w zbiorniku 150,00 złotych. …”, głos „Microsoft Adam”, `pl-PL`. Po Ctrl+$ „kwota ukryta” w pozycjach,
  ale zdanie o energii znika zupełnie (patrz Spostrzeżenia).

### MO.18 – poza laboratorium (Maszyna)

### MO.19 – poza laboratorium (Maszyna)

### MO.20 – NIEZGODNE (S)
- Stan: rok (`mo-a`; powtórzone w `mo-c1`, `mo-c1b`, `mo-c3`, `mo-f1–f3` – zawsze to samo).
- Zrobione: przeczytano Stan okrętu, panel „Rozliczenia z domownikami”, Radar → Należności, Ustawienia → Domownicy, Mapę
  gwiezdną, Ładownię.
- Widać: „Depozyt domowników · ich zaliczki – nie do wydania na siebie 4 797,20 zł”; zaliczki na każdym ekranie źródłowym:
  „Anna zaliczka 4 377,20 zł”, „Kasia zaliczka 360,00 zł”, „Marek ma oddać 360,00 zł” – razem 4 737,20 zł. Brakujące
  60,00 zł to zaliczka Marka (wpłata 360 zł jako zaliczka − jego część Media Expert 300 zł), której nie pokazuje żaden ekran:
  panel, Radar i Ustawienia pokazują przy Marku tylko „ma oddać 360,00 zł”.
- Oczekiwane: „Kwoty jak na ekranach źródłowych” – depozyt = suma zaliczek, które użytkownik widzi przy osobach.
- Związek: stan powstaje przez P.3 (wpłata jako zaliczka nie spłaca długu). Jeśli P.3 zostanie uznane za zamierzone
  (1.15.3), osoba może mieć naraz dług i zaliczkę – wtedy wiersz osoby musi pokazać oba.
- Reszta punktu zgodna: metafory z prawdziwą nazwą i kwotą, pasek osłon ze znacznikiem minimum, „Układy gwiezdne 8 138,96” =
  „w celach 8 138,96” (Rower zarchiwizowany ma 0,00 zł), „Zbiorniki 1 600,00” = odkładki w Ładowni (1 240 + 150 + 210),
  linie bez pieniędzy ukryte, dymki = słowniczek. Linii „Podatek · poza budżetem (PIT-38)” nie dało się sprawdzić (persona
  nie ma rezerwy).
- Zrzut: MO.20.png, MO-a-mostek.png, MO-a-radar.png

### MO.21 – LICZBY → AU-9
- Stan: rok, `mo-c1` (brzegi), `mo-g` (krótka historia).
- Widać: rok 13 000 + 6 204,63 + 39 066,30 + 8 138,96 + 1 600 + 4 797,20 + łupy 803,48 = „Suma kont budżetu: 73 610,57 zł” =
  mBank 69 747,04 + Portfel XTB 3 918,89 + Gotówka −55,36 (Ustawienia → Konta, Operacje); dług poza sumą. `mo-c1`
  71 740,57 = salda kont; `mo-g` 24 897,50 = saldo mBanku. Łupy są osobną warstwą w sumie (rozstrzyga wyrocznia).

### MO.22 – ZGODNE (a, c); wariant b – NIE DO SPRAWDZENIA
- Stan: `mo-f2`, `mo-f3` (osłony ponad cel, kadłub niepełny), `mo-g2` (krótka historia). Zrzut: MO.22-mo-f2.png, MO.22-c.png
- Widać: (a) „ponad cel osłon: 7 150,01 zł – kadłub niepełny, nie do dopłaty XTB” (kadłub 32 555,25 / 32 654,35); (c)
  „ponad cel osłon: 14 000,00 zł – cel kadłuba jeszcze nieznany (za krótka historia kosztów), nie do dopłaty XTB”; „wolne do
  decyzji” nie pojawia się w żadnym z tych stanów (dobrze).
- (b) nie do zrobienia na kopiach `rok`: po zmianie celów warstwy przeliczają się od startu i kadłub zawsze kończy kilkadziesiąt
  złotych pod celem (5 mies.: −99,10 zł, 3 mies.: −59,46 zł), więc „wolne do decyzji” nie wystąpiło (patrz Spostrzeżenia).

### MO.23 – LICZBY → AU-9
- Stan: rok, `mo-g`. Widać: kafelek „7,8 mies.” (7,896 obcięte), „Niszczyciel”, „średnie koszty 6 530,87 zł”, plakietka
  „NISZCZYCIEL” z dymkiem „Klasa według zasięgu: 7,8 mies.”, Dowództwo „Niszczyciel · zasięg 7,8 mies.”; dług odjęty. Bez
  kosztów (`mo-g`): „Zasięg —”, „Klasa —”, „średnie koszty —”. Warianty „zasięg < 1” i „11,96” – nie zrobiono (zasięg
  przeliczany z całej historii, nie do ustawienia na kopii bez dużej przebudowy).

### MO.24 – ZGODNE (liczby → AU-9)
- Stan: rok, `mo-c1` (linia 25 %). Zrzut: MO.24-brzegi.png, MO.24-ladownia-brzegi.png
- Widać: „31,0%” i „stałe koszty 2 014,32 zł/mies. · linia 40%” (2 014,32 / 6 500 = 30,99 %); ponad linią „31,0%” na
  czerwono i „linia 25%”; klik w kafelek → Ładownia „Masa ładunku 31,0% pensji · linia 40% · 2 014,32 zł miesięcznie”.

### MO.25 – ZGODNE (liczby → AU-9)
- Stan: rok, `mo-c1`, `mo-c2`. Zrzut: MO.25.png, MO.25-brzegi.png, MO.25-c2.png
- Widać: wszystkie 9 kopert planu (z kopertą 0 zł: „Subskrypcje i łączność planowa 0,00 / 0,00 zł”, bez Premium / Discount),
  „codzienna” / „planowa”, „Premium” przy wydanych ponad część miesiąca (Auto 100 / 650), „Discount” poniżej; przekroczona
  „747,50 / 650,00 zł” na czerwono; znacznik 80 %; te same kwoty w Planie miesiąca.

### MO.26 – LICZBY → AU-9
- Stan: rok, `mo-c3`, `mo-h`. Zrzut: MO.14-panel.png
- Widać: wiersze tylko osób z saldem („Marek ma oddać · od 20.08 (75 dni) 360,00 zł”, „Anna zaliczka – czeka na wydatki
  4 377,20 zł”), „Domownicy mają oddać razem 360,00 zł” (w `mo-c3` 750,00 = 360 + 150 + 150 + 90), „Pożyczki udzielone
  1 000,00 zł”, notka o kolejności wpłaty; „wydatki domowników ›” → Operacje „cała historia · Oznaczenia: domownik”; kwoty
  jak na Radarze i w Ustawieniach. Ukryta zaliczka Marka – patrz MO.20.

### MO.27 – LICZBY → AU-9
- Stan: rok. Widać: kolumny „3 mies. / 6 mies. / 12 mies. / mediana”, „Praca i inne 7 500,00” we wszystkich, „Trading (XTB)
  2 000,00 / 2 166,67 / 1 958,33 / 2 250,00”, „Razem 9 500,00 / 9 666,67 / 9 458,33 / 9 750,00”, „Pensja 6 500,00 zł · średni
  przychód (6 mies.) 9 666,67 zł → +3 166,67 zł / mies.”; identycznie w Planie miesiąca. Czy mediana „Razem” to mediana sum,
  czy suma median (7 500 + 2 250) – do wyroczni.

### MO.28 – ZGODNE
- Stan: rok, `mo-f1` (bez folderu ICTTJ), `mo-g`. Zrzut: MO.28.png, MO.28-okno-otwartej.png, MO.28-bez-ictj.png
- Widać: „DOKOWANIE (4)” = 2 „do zadokowania” + 2 „czeka na import”; wiersze z datą, pulą („Bieżące”, „Cele”, „Nadwyżki w
  masie”), kwotą, stanem i znaczkiem „bez wpisu w ICTTJ”; zadokowane osobno („zadokowana”); klik → okno tej dostawy; bez
  folderu „Wypłaty z ICTTJ: wybierz folder ICT Trade Journal w Ustawieniach ›” → Ustawienia → ICTTJ; bez dostaw „Brak dostaw
  z konta tradingowego do zadokowania.” Folder ICTTJ bez zmian. „Pominięte i sprzed startu” – w stanie nie ma takich dostaw.

### MO.29 – NIEZGODNE (W)
- Stan: rok + ICTTJ (`mo-a`, powtórzone na świeżym `mo-d`), 11:07 i 11:24.
- Zrobione: przeczytano panel „Dokowanie” na Mostku; otwarto zadokowaną dostawę bankową (19.10, mBank) i ręczną na
  Portfelu XTB (18.09); szukano „Wycofaj” na stronie i w oknach.
- Widać: w panelu tylko wiersze dostaw; okno zadokowanej dostawy ma przyciski „Historia”, „Anuluj”, „Zapisz podział” – na
  Mostku i w obu oknach 0 wystąpień „Wycofaj”.
- Oczekiwane (CHANGELOG 1.15.2, N-PC-2): „przycisk »Wycofaj dokowanie« na Mostku przywraca operację do stanu oczekującego”.
  Funkcji opisanej w notatkach wydania nie ma – pomyłkowego dokowania nie da się wycofać (tylko zmienić podział).
- Zrzut: MO.29-okno-bank-1910.png, MO.29-okno-reczna-1809.png

### MO.30 – NIEZGODNE (N)
- Stan: `mo-g` (budżet od 27.10, 7 dni) i powtórzenie `mo-g2` (od 29.10, 5 dni).
- Widać: zamiast „Za mało danych – krzywa pojawi się po dwóch tygodniach historii.” wykres z dwoma punktami i „Na kontach
  budżetu 24 897,50 zł · ostatnie 26 tygodni, koniec każdego tygodnia” (`mo-g2`: 24 940,00 zł).
- Oczekiwane: przy historii krótszej niż dwa tygodnie komunikat „Za mało danych …”; krzywa pojawia się już po pierwszej
  niedzieli, a podpis „ostatnie 26 tygodni” mówi o pół roku.
- W `rok` zgodnie: X = „Suma kont budżetu” 73 610,57 zł, 26 tygodni (od początku maja), CHoCH i BOS w tych samych tygodniach
  co w Wywiadzie (18.10, 13.09, 16.08, 26.07, 12.07 + wcześniejsze), „Wywiad →” otwiera Wywiad.
- Zrzut: MO-mo-g.png, MO.30.png

### MO.31 – UWAGA
- Stan: rok, `mo-c2`, `mo-b`, `mo-b2`. Zrzut: MO.31-dzis.png, MO.31-po-kliknieciu.png, MO.31-z-menu.png
- Widać: 10 operacji, „DD.MM”, kontrahent, „finansuje: Anna”, „od: Anna”, kategoria; wpływ „+100,00” i zwrot towaru „+49,99”
  na zielono, wydatek bez koloru z „−”, przelew własny przygaszony; klik w „30.10 Lody Grycan” → Operacje „październik 2026”
  z otwartą operacją; zapamiętany filtr (Konto: mBank) nie nadpisany – „mój filtr” go przywraca.
- Uwaga: w obrębie dnia kolejność według chwili wpisania, nie godziny: „03.11 Żabka” (07:00, wpisana później) stoi nad
  „03.11 Biedronka” (12:00) i „Mokka” (08:10); w Operacjach odwrotnie. Wymaganie milczy, co znaczy „najnowsza”.

### MO.32 – ZGODNE
- Stan: rok (`mo-b`). Zrzut: MO.32-Odprawa.png, MO.32-Stan_okrętu.png, MO.32-Koperty.png, MO.32-Odprawa-po-zapisie.png
- Widać: trzy okna z tą samą treścią co panele (w głównym oknie „Otwarte w osobnym oknie.”); główne okno na Operacjach,
  szybki wpis 37 zł → okna same pokazują „40,28 zł”, „Energia 6 167,63 zł”, „Jedzenie 49,00 / 1 600,00 zł”; klik w asteroidę
  i misję w osobnym oknie → główne okno na Ładowni / Dowództwie.

### MO.33 – UWAGA
- Stan: rok. Zrzut: MO.33.png
- Widać: F1 → „Słowniczek okrętu” z 19 terminami (Osłony … Bilans paliwa) i znaczeniami; dymki Osłony, Energia, Kadłub,
  Zasięg, Dostawa i „?” przy Kopertach i Dokowaniu dosłownie jak w słowniczku; Premium / Discount / Equilibrium wyjaśnia dymek.
- Uwaga: bez wyjaśnienia na Mostku i w słowniczku: „Daily Bias” (dymek „Daily Bias (spec, Wywiad)” – tekst roboczy),
  „Bullish / Neutral / Bearish”, „Killzone” (misja), „BOS / CHoCH” (krzywa – wyjaśnia dopiero Wywiad), „Zwrot do masy”,
  „Nadwyżki w masie”, „Bieżące”; linie „Układy gwiezdne”, „Zbiorniki”, „Depozyt domowników”, „Łupy”, „Dług” bez dymku.

### MO.34 – ZGODNE (liczby → AU-9)
- Stan: rok (`mo-b`), 11:20:04 i 11:20:15.
- Widać: przed zapisem „77,28 zł” w odłączonej Odprawie, nagłówku szybkiego wpisu („· energia dziś 77,28 zł”), Planie
  miesiąca i Raportach → Odprawa (Mostek 77,28 w `mo-a`); po zapisie 37,00 Biedronka (Jedzenie) wszędzie „40,28 zł”, okno
  Odprawy odświeżone bez ponownego otwierania.

## Znaleziska
- **MO.29 – NIEZGODNE (W):** brak „Wycofaj dokowanie” na Mostku i w oknie zadokowanej dostawy, choć zapowiada go CHANGELOG
  1.15.2 (N-PC-2) – dokowania nie da się wycofać.
- **MO.11 – NIEZGODNE (S):** asteroida na Mostku liczy termin z dnia kontenera, a Ładownia i Radar z dnia płatności z historii
  – po zmianie dnia płatności ta sama opłata ma dwa terminy (OC „za 3 dni” na Mostku, 25.11 w Ładowni i na Radarze), ostrzeżenie
  przychodzi za wcześnie albo wcale.
- **MO.20 – NIEZGODNE (S):** „Depozyt domowników 4 797,20 zł” ≠ suma zaliczek przy osobach (4 737,20 zł) – 60 zł zaliczki Marka
  niewidoczne na każdym ekranie, bo przy osobie z długiem pokazany jest tylko dług (stan z P.3).
- **MO.30 – NIEZGODNE (N):** krzywa majątku po tygodniu historii (dwa punkty) zamiast „Za mało danych – … po dwóch tygodniach”.

## Spostrzeżenia
1. **Odprawa bez hierarchii:** w `rok` 15 pozycji, w `mo-c1` 24; żółte „Łupy” stoją pod informacyjnymi, sprawy sprzed
   miesięcy („Zwrot do masy … (05.03) do potwierdzenia” – 8 miesięcy) wiszą tak samo jak dzisiejsze; brak grupowania,
   zwijania i „pokaż wszystko”. Odsłuch czyta wszystkie pozycje (w `rok` ok. 1 500 znaków tekstu – szacunkowo
   półtorej minuty mowy).
2. **Dublowanie sygnałów:** „Koperta Zdrowie ponad limit o 52,50 zł” i „Nieznany sygnał na radarze – Zdrowie: 202,50 zł …
   2,9× średniej” to ta sama sprawa w dwóch pozycjach; podobnie ORLEN (koperta Auto + nieznany sygnał).
3. **„Wolne do decyzji” prawie nieosiągalne:** cel kadłuba idzie za średnimi kosztami, a kadłub kończy kilkadziesiąt złotych
   pod celem – w `mo-f3` 20 172,11 zł ponad cel osłon jest „nie do dopłaty XTB”, bo kadłubowi brakuje 59,46 zł. Brak
   podpowiedzi albo akcji „dopełnij kadłub z nadwyżki osłon”.
4. **Zmiana celów warstw bez podglądu skutku:** cel osłon 1 pensja + kadłub 12 mies. przelicza historię i daje „Osłony 0,00 zł /
   6 500,00 zł” (`mo-f1`) – ustawienie wywraca stan okrętu bez ostrzeżenia, co się stanie.
5. **Energia dziś przy wyczerpanej energii miesiąca:** w `mo-c1b` „Energia · pensja miesiąca do wydania 0,00 zł”, 795 zł poszło
   z osłon, a Mostek dalej pokazuje „Energia dziś 77,28 zł” i „◆ Neutral” – duża liczba sugeruje, że można wydawać.
6. **Zwrot towaru podnosi energię dziś:** zwrot ZARA +49,99 (zakup sprzed tygodni) daje „Wydane dziś 49,99 zł” na plus
   i „−49,99 / 350,00 zł” w kopercie – energia dnia rośnie o zwrot dawnego zakupu.
7. **Odsłuch:** energia czytana „40 złotych 28 groszy”, ale kwoty pozycji „150,00 złotych”, „803,48 złotych” (z przecinkiem);
   po ukryciu kwot zdanie o energii znika zamiast „Energia na dziś: kwota ukryta”; „+kwota ukryta rocznie”; czytane też
   „→”, „(27.10–02.11)”, „CSV”, nazwy plików – do oceny słuchem (MO.17).
8. **Dwie daty jednej dostawy** (MO.7: 19.10 w panelu, 20.10 w „ostatnia dostawa”) i dymek „Daily Bias (spec, Wywiad)”
   z tekstem roboczym.
9. **Odłączona Odprawa** zabiera energię dziś z głównego okna (panel „Otwarte w osobnym oknie.”) – Mostek bez jednej liczby
   dnia, gdy osobne okno jest za innym programem.
10. **Kolejność „Ostatnich operacji”** według chwili wpisania (MO.31) – wieczorne dopisywanie dnia daje odwróconą kolejność
    godzin.

## Problemy laboratorium
- Brak stanów `start` i `brzegi` (plan, „Załoga testowa”) – zastąpione kopiami `rok` ze zmianami (tabela na górze); punkty
  MO.3, 8, 9, 11, 13–15, 22, 25 oceniane na tych stanach, część wariantów (MO.22 b, MO.23 „< 1” i „11,96”) nie do zrobienia.
- Persona nie ma rezerwy puli Podatek ani ostatniej dostawy z częścią PIT-38 (MO.7, MO.20 – linia „Podatek”) – do dodania
  w personie dla AU-9.
- Persona ma stan z P.3 (Marek: dług i zaliczka naraz) – wpływa na MO.20 / MO.26.
- Syntezator mowy podstawiony w oknie (`speechSynthesis.speak`), żeby komputer nie mówił – tekst odsłuchu zapisany, dźwięku nie ma.
- Własny błąd skryptu (heredoc w bash zjadł `\\`): jeden przebieg `mo-b2` utworzył pusty `FinancialIntel\FI-audyt\przebiegi\mo-b2\pobrane`
  w repozytorium – usunięty, nic w nim nie było; przebieg powtórzony poprawnie.
- `rok.log` (AU-2) pokazuje pozycje „Nowy meldunek … w folderze pliki”, bo przy generowaniu pobrane wskazywały na `pliki`;
  `start()` daje pusty folder pobranych – odprawa w przebiegach różni się od logu persony o te dwie pozycje (to nie błąd).
- Raporty otwierają się na „Raport wachty”, nie „Odprawa” – skrypt musi kliknąć zakładkę (pierwszy odczyt biasu w Raportach
  w `mo-a` pusty, powtórzony w `mo-c1`, `mo-c2`, `mo-b`).
