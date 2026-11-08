# Raport audytu – RA (Radar)

- Data: 03.11.2026, 15:31–16:25 (zegar prawdziwy, Warszawa, wtorek; okno Radaru 03.11.2026–01.02.2027); wersja 1.15.4
  z GitHub Releases (laboratorium `C:\FI-audyt`); grupa AU-10, blok C.
- Stan danych: persona `rok` (kotwica 2026-11-03) i stany zbudowane – tabela niżej. Stanu `brzegi` laboratorium nie ma –
  RA.10 na folderach od zera (`seedFolder`) z liczbami z punktu.
- Przebiegi: `mg-0` (rozpoznanie Radaru na `rok`), `ra-1`, `ra-2a`–`ra-2c`, `ra-3` (`C:\FI-audyt\przebiegi\…`, teksty
  ekranów w `out\`), skrypty `tests/audyt/ra-*.spec.ts` (pomoc wspólna `mg-pomoc.ts`), odczyty
  `C:\FI-audyt\odczyty\ra.jsonl` (26 odczytów, 26 migawek) – każdy z migawką folderu danych (i ICTTJ) z chwili odczytu:
  `C:\FI-audyt\migawki\ra\<punkt>-<n>` (pole `_migawka`), zrzuty `C:\FI-audyt\zrzuty\RA*.png`.
- Folder ICTTJ (`mg-0`, `ra-1`): sumy SHA-256 przed i po – aplikacja nic w nim nie zmieniła (`ictj-zmiany-aplikacji.txt`
  = `[]`; dopisana przez audyt wypłata z puli Podatek – przed startem, poza porównaniem); w `ra-3` kopia porównana po
  przebiegu ze `stany\ictj-rok` – 0 różnic.

**Podsumowanie (14 punktów):** ZGODNE 11 (RA.1, RA.2, RA.3, RA.5, RA.6, RA.7, RA.8, RA.11, RA.12, RA.13, RA.14)
· NIEZGODNE 1 (S: RA.4) · UWAGA 1 (RA.10) · LICZBY → AU-9 0 · NIE DO SPRAWDZENIA 0 · poza laboratorium 1 (RA.9 –
maszyna; część z danych z przeszłości sprawdzona). Liczby Radaru (kwoty pozycji, osłony po zdarzeniu, salda kont, braki,
należności) policzone wprost ze zbudowanego stanu i z dzisiejszych warstw Mostka – ocenione tu.

## Stany zbudowane

| Przebieg | Stan | Punkty |
| --- | --- | --- |
| `mg-0` | `rok` bez zmian (odczyt bazowy Radaru) | RA.1, RA.8, RA.9 (część z przeszłości) |
| `ra-1` | `rok` + rekordy przez schematy aplikacji (`seedRecords` w `mg-pomoc.ts`, jak `seedFolder`; id `01KMXARAD…`): **RA.2** plan `months/2026-12.json` z pensją 7 000 zł (koperty jak w XI), 2027-01 bez planu; **RA.3** kontener „Wywóz śmieci” (opłata okresowa co 2 mies., 180 zł, dzień 20., `dueMonth` 2026-05, mBank) z płatnościami 20.05, 20.07, 21.09 i przed terminem 02.11.2026; **RA.4** usunięta płatność „Telefon Play” z 20.10.2026 (`2026-10-20_01M6GWBBW5BZ42BMXRA184V53S.json`); **RA.5** „Pożyczka dla Oli” (udzielona 30.09, 1 000 zł, raty 30.10 i 30.11 po 500 zł; 31.10 spłata 200 zł – brakuje 300 zł, 4 dni po terminie), „Pożyczka dla Igi” (udzielona 02.10, 600 zł, rata 02.11 – 1 dzień po terminie), „Pożyczka od Marka” (wzięta 01.10, 1 200 zł, raty 01.11, 01.12, 01.01 po 400 zł – 2 dni po terminie; kontener „Rata – Marek” jak w personie), operacje pożyczek; **RA.7** boje (mBank, przypomnienia 14 i 3): „Serwis auta” −600 zł 01.11 (D−2) + operacja z banku −600 zł 02.11 „AUTO SERWIS KOWALSKI”, „Przegląd komina” −250 zł 24.10, „Składka PZW” −100 zł 29.09, „Prezent dla mamy” −200 zł 13.11, „Opłata za przedszkole” −400 zł 05.11; **RA.8** wypłata ICTTJ z puli Podatek 1 200 zł 29.10 (kopia ICTTJ) z parą mBank +1 200 zł i dokowaniem `pool: tax`; **RA.12** domownicy „Tata” (zaliczka – wpłata 500 zł 15.10, `inflowKind: advance`) i „Babcia” (saldo na start 250 zł do oddania, przekazuje przez Tatę), wpłata Marka 100 zł 02.11 (`inflowKind: repay`, bez wskazanych zakupów); **RA.13** kontener „Kurs angielskiego” 300 zł/mies., dzień 12, od 2026-06 do 2026-11, płatności 12.06–12.10; **RA.14** wydatki z „Czekam na zwrot pieniędzy”: ZALANDO 250 zł (25.10, zwrot do 08.11 – za 5 dni), DECATHLON 120 zł (10.10, zwrot do 31.10 – 3 dni po terminie) | RA.1–RA.8, RA.11–RA.14 |
| `ra-2a` | od zera: start 01.10.2026; salda otwarcia 01.10: mBank 1 500 zł, Portfel XTB 3 000 zł, Gotówka 1 000 zł; pensja 3 000 zł; boja „Czynsz” −2 000 zł z mBanku 10.11.2026 (za 7 dni) | RA.10 |
| `ra-2b` | jak `ra-2a`, Portfel XTB 200 zł | RA.10, RA.11 |
| `ra-2c` | jak `ra-2a`, mBank −100 zł | RA.10 |
| `ra-3` | `rok` + boje (mBank): „Przegląd komina” −275 zł 24.10 (D−10), „Opłata klubowa” −90 zł 05.10 (D−29), „Mandat” −80 zł 03.10 (D−31), „Składka PZW” −100 zł 29.09 (D−35), „Premia roczna” +20 000 zł 10.11, „Urodziny Leona” −300 zł 29.02.2024 co roku | RA.6, RA.7, RA.11, RA.12 |

## Punkty

### RA.1 – ZGODNE
- Stan: `rok` (`mg-0`, 15:31) i `ra-1` (16:08).
- Zrobione: Radar – nagłówek, panel „Na radarze” (miesiące, dzień, rodzaj, nazwa, notatka, kwota, osłony po zdarzeniu,
  kolory).
- Widać: „90 dni – do 01.02.2027” (D+90); rodzaje: „pensja” 01.12, 01.01, 01.02 („Pensja od siebie · z osłon do energii
  miesiąca”), „asteroida”, „opłata”, „rata”, „spłata”, „boja”, „koniec”, „zwrot”; „termin” PIT-38 nie ma (30.04 poza oknem;
  panel „Na radarze od 1 lutego”). Wpływy „+” na zielono `rgb(46, 189, 133)`, wypływy „−” w kolorze tekstu; pozycje po
  dniach rosnąco; nic po 01.02.2027. Przed dziś tylko zaległe (spłaty 04.09, 05.10, 30.10, raty 28.10, 01.11, spłata 02.11,
  zwrot DECATHLON) i „01.11 CityFit −129,00 zł” (opłata bieżącego miesiąca bez płatności – bank zaimportowany do 26.10;
  bez oznaczenia).
- Oczekiwane: okno D … D+90 ze wszystkimi rodzajami – spełnione (zaległe przed D – zgodnie z RA.5).
- Odczyty: RA.1-1 (rok), RA.1-2 (ra-1). Zrzuty: RA-0-radar.png, RA.1.png.

### RA.2 – ZGODNE
- Stan: `ra-1` (plan XII z pensją 7 000 zł, I bez planu), 16:08–16:10.
- Zrobione: Radar – pozycje „pensja”; Plan miesiąca XII i I.
- Widać: „01.12 pensja Pensja od siebie 7 000,00 zł, osłony 7 300,00 zł”, „01.01 … 7 000,00 zł, osłony 1 750,00 zł”, „01.02 …
  7 000,00 zł, osłony 0,00 zł”; Plan XII „plan tego miesiąca”, Plan I „korzysta z planu: grudzień 2026 – zmiana utworzy
  własny”.
- Oczekiwane: pensja z planu w mocy (XII własny, I odziedziczony), osłony maleją o pensję, gdy brakuje – kadłub (D14):
  14 300 − 7 000 = 7 300; 8 750 − 7 000 = 1 750; 1 750 − 7 000 → 0 (reszta z kadłuba) – zgodne.
- Odczyty: RA.2-1 (Radar), RA.2-2 (Plan M0–M+2).

### RA.3 – ZGODNE
- Stan: `ra-1` („Wywóz śmieci” zapłacony 02.11 przed terminem 20.11), 16:08–16:10.
- Zrobione: Radar – pozycje „asteroida”; Ładownia → „Odkładki”; Mostek – odprawa.
- Widać: „15.11 Podatek od nieruchomości – w zbiorniku 150,00 zł”, „20.11 Prąd – w zbiorniku 210,00 zł” (20.01 bez notatki),
  „25.11 OC samochodu – w zbiorniku 1 240,00 zł”, „20.01 Wywóz śmieci – w zbiorniku 0,00 zł −180,00 zł” (20.11 nie ma);
  Ładownia: „OC samochodu … 1 240,00 zł / 1 240,00 zł”, „Podatek od nieruchomości … 150,00 zł / 150,00 zł”, „Prąd … 210,00 zł /
  210,00 zł”, „Wywóz śmieci termin styczeń 2027 (za 2 mies.) 0,00 zł / 180,00 zł Opłata za listopad 2026 zapłacona – zbiornik
  zbiera na następny termin.”, w kontenerach „Wywóz śmieci … zapłacone 20.11”; odprawa „Asteroida: Podatek od nieruchomości
  za 12 dni – 150,00 zł, w zbiorniku 150,00 zł.” (Prąd za 17 dni – nie).
- Oczekiwane: stan zbiornika na Radarze = Ładownia, zapłacona przed terminem – następny termin, odprawa ≤ 14 dni – spełnione.
  „Osobno ≤ 3 dni” – w oknie żadnej asteroidy w 3 dniach (nie sprawdzone).
- Odczyty: RA.3-1 (Radar, odprawa), RA.3-2 (Ładownia). Zrzut: RA.3-ladownia.png.

### RA.4 – NIEZGODNE (S)
- Stan: `ra-1` – płatność „Telefon Play” z 20.10.2026 usunięta (wrześniowa 21.09 jest); bank mBank zaimportowany do 26.10
  (`coveredTo`), 16:08.
- Zrobione: Radar – pozycje „opłata” w kolejnych miesiącach; Ładownia; odprawa.
- Widać: każdy kontener miesięczny w każdym miesiącu okna (CityFit 01.xx, Netflix 05.xx, Spotify 08.xx, Czynsz 10.xx,
  Internet 15.xx, Telefon Play 20.xx, Kurs angielskiego 12.11), opłaty okresowe XI raz („15.11 Podatek…”, „20.11 Prąd”,
  „25.11 OC…” – bez drugiej pozycji „opłata”). **Niezapłacona opłata „Telefon Play” z 20.10 nie jest nigdzie oznaczona:**
  Radar zaczyna Telefon od „20.11 opłata Telefon Play −50,00 zł” (bez notatki), Ładownia „Telefon Play abonament co miesiąc
  termin 20.11 50,00 zł”, odprawa bez pozycji o Telefonie.
- Oczekiwane: zaległy kontener oznaczony „po terminie” (punkt; D86 F1 – „po terminie” 3 dni po dniu płatności). Opłata
  zaległa od 23.10 (plik banku obejmuje te dni) znika z każdego ekranu z początkiem listopada – stan liczony tylko dla
  terminu bieżącego miesiąca (T208). Zaległa opłata w samym listopadzie (najwcześniej 04.11 dla dnia 1.) – zegar → maszyna.
- Kroki do powtórzenia: `rok` → usunąć operację „Telefon Play” z 20.10.2026 (`2026-10-20_01M6GWBBW5BZ42BMXRA184V53S.json`) →
  Radar, Ładownia, Mostek – brak „po terminie”.
- Odczyty: RA.4-1, RA.3-2 (Ładownia). Zrzuty: RA.1.png, RA.3-ladownia.png.

### RA.5 – ZGODNE
- Stan: `ra-1` (Ola 4 dni, Iga 1 dzień, Marek 2 dni po terminie; boja-wpływ, zwroty w drodze), 16:08.
- Zrobione: Radar – oś, „Pożyczki” (znaczki); Mostek – odprawa.
- Widać: „30.10 spłata Spłata: Pożyczka dla Oli – spóźniona spłata +300,00 zł” (akcent), „01.11 rata Rata: Pożyczka od Marka –
  po terminie 2 dni −400,00 zł”, „02.11 spłata Spłata: Pożyczka dla Igi – po terminie 1 dzień +600,00 zł”, „28.10 rata …
  rodziców – zaległa rata”, Tomek „spóźniona spłata” 04.09 i 05.10 po +500,00; „18.12 boja Zwrot PIT-37 +1 450,00 zł”,
  „08.11 zwrot Zwrot: ZALANDO – w drodze +250,00 zł”. Pożyczki: „Pożyczka dla Oli UDZIELONA SPÓŹNIONA SPŁATA 800,00 zł …
  następna 30.10.2026: 300,00 zł”, Iga i Marek bez znaczka. Odprawa: „Pożyczka „Pożyczka dla Oli”: spłata 300,00 zł spóźniona
  od 30.10 – przypomnij (ALEKSANDRA TESTOWA).”, Tomek, rodzice – bez pozycji o Idze i Marku.
- Oczekiwane: „po terminie N dni” do 2. dnia, od 3. dnia „spóźniona spłata” / „zaległa rata” i odprawa, kwota zaległej =
  brakująca część raty (500 − 200 = 300) – spełnione.
- Odczyt: RA.5-1.

### RA.6 – ZGODNE
- Stan: `ra-1` (16:11) i `ra-3` (16:16).
- Zrobione: „Nowa boja”: bez nazwy; „Bez kwoty” jako wydatek bez kwoty; „Wydatek” „Wesele Kasi” 1 500 zł 23.11, mBank,
  „Prezenty i inne”, „Przypomnij” „14, 3”; „Wpływ” „Premia” 2 000 zł 13.12; „Termin bez kwoty” „Wymiana dowodu” 02.01.2027;
  „Urodziny Leona” 300 zł 29.02.2024 „co roku”.
- Widać: „Nazwij boję (np. „Wesele Kasi”).”, „Podaj kwotę albo wybierz „Termin bez kwoty”.”; „Boja „Wesele Kasi” na radarze.”
  (z „Cofnij”), tak samo Premia, Wymiana dowodu, Urodziny Leona; na osi „23.11 boja Wesele Kasi −1 500,00 zł osłony 11 700,00”,
  „13.12 boja Premia +2 000,00 zł”, „02.01 boja Wymiana dowodu termin —” (bez osłon po zdarzeniu); w „Pozostałe boje”
  „28.02.2027 Urodziny Leona −300,00 zł” (29.02 w roku nieprzestępnym → 28.02, co roku wraca); odprawa „Boja: Opłata za
  przedszkole za 2 dni – 400,00 zł (wydatek).”, „Boja: Prezent dla mamy za 10 dni – 200,00 zł (wydatek).” (Wesele Kasi
  za 20 dni – jeszcze nie).
- Oczekiwane: jak w punkcie (T273) – spełnione.
- Odczyty: RA.6-1 (ra-1), RA.6-2 (ra-3). Zrzut: RA.6.png.

### RA.7 – ZGODNE
- Stan: `ra-1` („Serwis auta” 600 zł 01.11 + operacja z banku 600 zł 02.11), `ra-3` (boje D−10, D−29, D−31, D−35).
- Zrobione: „Zrobione ostatnio” → „operacja ›”, „to nie ta”; „Prezent dla mamy” → „Wykonaj teraz” → Operacje → „Cofnij”;
  „Przegląd komina” (D−10) → „odhacz”; boje sprzed 29, 31 i 35 dni.
- Widać: „01.11 Serwis auta operacja dopasowana operacja › to nie ta”; „operacja ›” otwiera tę operację w Operacjach;
  po „to nie ta” „[late] 01.11 Serwis auta po terminie 2 dni −600,00 zł”, `notMatched` = ta operacja, saldo mBank naprzód
  „min. 61 270,07 zł” → „min. 60 670,07 zł” (zamknięta boja nie liczyła się drugi raz). „Wykonaj teraz”: operacja
  03.11.2026 −200,00 zł „Prezenty i inne · prezenty”, mBank, „KWIACIARNIA ROZA”, tytuł „Prezent dla mamy”, otwarta
  w Operacjach, toast „Operacja z boi „Prezent dla mamy” zapisana.”; „Cofnij” – operacji brak, boja znowu otwarta. „Przegląd
  komina po terminie 10 dni −275,00 zł” (i w odprawie „Boja po terminie: … – bez operacji w banku: wykonaj albo odhacz.”) →
  „odhacz” → „Zrobione ostatnio (1) 24.10 Przegląd komina odhaczone”, bez operacji. D−29 „po terminie 29 dni”; D−31 i D−35 –
  znikają z osi i otwartych (w „Pozostałe boje”).
- Oczekiwane: jak w punkcie (T273, T282) – spełnione. Spostrzeżenie: w `ra-1` boja „Przegląd komina” 250 zł (KOMINIARZ)
  zamknęła się sama zakupem ZALANDO 250 zł z następnego dnia (ta sama kwota, inna nazwa – reguła ±3 dni), „to nie ta”
  działa.
- Odczyty: RA.7-1, RA.7-2 (ra-1), RA.7-3, RA.7-4 (ra-3). Zrzuty: RA.7-wykonaj.png, RA.7-boje-po-terminie.png.

### RA.8 – ZGODNE
- Stan: `ra-1` (wypłata z puli Podatek 1 200 zł 29.10, zadokowana) i `rok` (`mg-0`; wypłata z puli Podatek 1 800 zł
  z 15.02.2026, PIT-38 zapłacony 27.04.2026).
- Zrobione: Radar – panel „PIT-38”, oś; Mostek – odprawa.
- Widać: „Na radarze od 1 lutego (termin 30 kwietnia).”, „Kwotę liczy ICTTJ (rezerwa podatkowa); FI przypomina tylko
  o terminie.”, „Wypłacone na podatek (poza budżetem): 1 200,00 zł” (Mostek „Podatek · poza budżetem (PIT-38) 1 200,00 zł”);
  na osi i w odprawie nic o PIT-38, żadnej kwoty podatku do zapłaty. W `rok` linii „Wypłacone na podatek” nie ma (rezerwa
  zużyta przelewem „PIT-38 ZA 2025” 27.04).
- Oczekiwane: teksty z punktu, bez kwoty do zapłaty, termin 30 kwietnia – spełnione.
- Odczyt: RA.8-1.

### RA.9 – poza laboratorium (maszyna)
- Z danych z przeszłości (03.11, przed 1.02): pozycji „termin” PIT-38 na osi nie ma, panel „Na radarze od 1 lutego (termin
  30 kwietnia).” – zgodnie; 1.02, 16.04, 27.04, 1.05 i powiadomienia – maszyna.

### RA.10 – UWAGA
- Stan: `ra-2a`, `ra-2b`, `ra-2c` (od zera, liczby z punktu), 16:11–16:13.
- Zrobione: Radar → „Salda kont za 90 dni” → „Zaplanuj przelew własny” → toast → Operacje → „Cofnij”; Mostek – odprawa;
  warianty.
- Widać: V1 „mBank 1 500,00 zł min. −500,00 zł (10.11) Zabraknie 500,00 zł na płatność 10.11 (Czynsz) – przelej z konta
  Portfel XTB Zaplanuj przelew własny”, odprawa „Na koncie mBank zabraknie 500,00 zł na płatność 10.11 (Czynsz) – przelej
  z konta Portfel XTB.”; po kliknięciu toast „Przelew 500,00 zł z konta Portfel XTB na konto mBank zapisany – zmień dzień,
  gdy zrobisz go później.”, jedna operacja `transfer` 03.11 −500 zł Portfel XTB → mBank otwarta w Operacjach („Przelew
  własny”), potem „mBank 2 000,00 zł min. 0,00 zł (10.11)”, ostrzeżenia i pozycji odprawy brak, warstwy bez zmian (osłony
  0,00 / 9 000,00, energia 2 500,00, „Suma kont budżetu: 5 500,00 zł” przed i po); „Cofnij” – przelewu nie ma, ostrzeżenie
  wraca. V2 (Portfel 200 zł, Gotówka 1 000 zł): „Zabraknie 500,00 zł na płatność 10.11 (Czynsz)” – bez źródła i bez
  przycisku (gotówka słusznie nie jest źródłem), **bez tekstu „Żadne inne konto nie ma tyle do tego dnia – przelew trzeba
  zaplanować ręcznie.”**. V3 (mBank −100): „mBank −100,00 zł min. −2 100,00 zł (10.11)” bez „Zabraknie” i bez pozycji
  w odprawie.
- Oczekiwane: komunikaty, przelew w górę do pełnych złotych (500,00 → 500), obie strony, ostrzeżenie znika, warstwy bez zmian –
  spełnione. **Uwaga (tekst):** V2 – komunikat z punktu nie pojawia się nigdzie (jest tylko w akcji przycisku, którego przy
  braku źródła nie ma).
- Odczyty: RA.10-1 … RA.10-4. Zrzuty: RA.10-ra-2a.png, RA.10-przelew.png, RA.10-ra-2b.png, RA.10-ra-2c.png.

### RA.11 – ZGODNE
- Stan: `ra-1` (osłony dziś 13 300 zł; pensje, boje, spłaty, opłaty), `ra-3` (wpływ 20 000 zł przy osłonach 13 000 / 19 500),
  `ra-2b` (osłony ujemne).
- Zrobione: Radar – kolumna osłon po zdarzeniu (dymek „Osłony po tym zdarzeniu (bez wpływów, których dnia nie znamy)”).
- Widać (`ra-1`): 13 300 → spłata Tomka +500 → 13 800 → +500 → 14 300 → spłata Oli +300 → 14 600 → Iga +600 → 15 200 → boja
  −400 → 14 800 → boja −200 → 14 600 → boja −800 → 13 800 → spłata Oli +500 → 14 300 → pensja 7 000 → 7 300 → boja-wpływ
  +1 450 → 8 750 → pensja → 1 750 → pensja → 0,00; raty, opłaty, asteroidy, zwroty i „koniec” bez wartości osłon. `ra-3`:
  „10.11 boja Premia roczna +20 000,00 zł osłony 19 500,00 zł” (tylko do celu osłon – reszta dalej kolejnością D13).
  `ra-2b`: „10.11 boja Czynsz −2 000,00 zł −2 000,00 zł” – wartość ujemna w akcencie.
- Oczekiwane: start od dzisiejszych osłon, pensja z osłon (kadłub, gdy brakuje), boja-wydatek z osłon, boja-wpływ kolejnością
  D13, spłata do osłon, opłaty bez wpływu, ujemne w akcencie – spełnione (policzone wprost).
- Odczyty: RA.11-1 (ra-1), RA.11-2 (ra-3); RA.10-3 (ra-2b).

### RA.12 – ZGODNE
- Stan: `ra-1` (Babcia, Tata, wpłata Marka 100 zł bez przypisania), `ra-3` (kliknięcia), 16:09 i 16:17.
- Zrobione: Radar → „Należności” (rozwinięcie „N zakup(y) do oddania”, klik zakupu), „wydatki domowników ›”; Mostek →
  „Rozliczenia z domownikami”.
- Widać: „Babcia ma oddać 250,00 zł saldo na start rozliczeń z 01.09.2025 (428 dni) · przekazuje przez: Tata”, „Anna
  zaliczka (depozyt) 4 377,20 zł”, „Kasia zaliczka (depozyt) 360,00 zł”, „Marek ma oddać 260,00 zł najstarszy zakup
  z 20.08.2026 (75 dni) zwrot do przypisania: 100,00 zł – wskaż zakupy w Meldunkach”, „Tata zaliczka (depozyt) 500,00 zł”,
  „Domownicy mają oddać razem 510,00 zł” (250 + 260), „Pożyczki udzielone 2 400,00 zł” (Tomek 1 000 + Ola 800 + Iga 600),
  „Dług (pożyczki wzięte) 1 700,00 zł” (rodzice 500 + Marek 1 200); Mostek: te same kwoty osób, „510,00 zł”, „2 400,00 zł”,
  „Dług · pożyczki wzięte 1 700,00 zł”. Klik „20.08.2026 EVENTIM 360,00 zł” – Operacje z tą operacją; saldo na start Babci –
  przycisk wyłączony (bez operacji); „wydatki domowników ›” – Operacje z filtrem „Oznaczenia: domownik”.
- Oczekiwane: jak w punkcie – spełnione. Czy Marek naprawdę ma oddać EVENTIM (wpłata 14.09 z `covers` = EVENTIM, `inflowKind:
  advance`) – AU-9 / DM.
- Odczyt: RA.12-1. Zrzut: RA.12-wydatki-domownikow.png.

### RA.13 – ZGODNE
- Stan: `ra-1` („Kurs angielskiego” do 2026-11, ostatnia płatność 12.11), 16:09.
- Zrobione: Radar – pozycja „koniec”; Mostek – odprawa; Plan miesiąca XI–I (ładownia).
- Widać: „12.11 koniec Kurs angielskiego – ostatnia płatność – potem ładownia lżejsza o 300,00 zł/mies.” (oraz „01.01 koniec
  Rata – Marek … lżejsza o 400,00 zł/mies.”); odprawa „Koniec kontenera: Kurs angielskiego – ostatnia płatność 12.11, potem
  ładownia lżejsza o 300,00 zł/mies.”; Plan: XI „Ładownia – stałe koszty 2 455,99 zł”, XII i I „2 155,99 zł” (−300,00).
- Oczekiwane: X = miesięczna część kontenera (300), ładownia po końcu mniejsza o X – spełnione.
- Odczyty: RA.13-1 (Radar), RA.13-2 (Plan).

### RA.14 – ZGODNE
- Stan: `ra-1` (ZALANDO do 08.11, DECATHLON po terminie 3 dni, ALLEGRO persony do 21.11), 16:09–16:10.
- Zrobione: Radar → „Zwroty w drodze” („pokaż”, „zamknij” DECATHLON), oś.
- Widać: „DECATHLON po terminie 3 dni 120,00 zł”, „ALLEGRO do 21.11.2026 320,00 zł”, „ZALANDO do 08.11.2026 250,00 zł”; oś
  „08.11 zwrot Zwrot: ZALANDO w drodze +250,00 zł”, „03.11 zwrot Zwrot: DECATHLON nie dotarł – po terminie 3 dni +120,00 zł”
  (akcent) – bez wartości osłon; „pokaż” otwiera zakup w Operacjach; „zamknij” – „Zwrot zamknięty – nie jest już
  oczekiwany.” (z „Cofnij”), DECATHLON znika z panelu i osi (`closedAt` zapisany); salda kont naprzód zwrotów nie liczą.
- Oczekiwane: jak w punkcie (T289) – spełnione.
- Odczyty: RA.14-1, RA.14-2.

## Znaleziska

- RA.4 (S) – zaległa opłata kontenera miesięcznego z poprzedniego miesiąca (Telefon Play 20.10, bank zaimportowany) z początkiem
  nowego miesiąca znika z Radaru, Ładowni i odprawy – nigdzie „po terminie”.

## Spostrzeżenia

- Boja może zamknąć się sama operacją o tej samej kwocie i zupełnie innej nazwie (ZALANDO zamknęło „Przegląd komina”); odprawa
  i oś nic o tym nie mówią – widać to tylko w zwiniętym „Zrobione ostatnio”.
- Na osi stoi „01.11 CityFit” (2 dni przed dziś, bez płatności, bank zaimportowany do 26.10) bez notatki – ani „czeka na
  import”, ani „po terminie”.
- RA.10 V2: przy braku źródła przelewu kapitan widzi tylko „Zabraknie …” – bez podpowiedzi, co zrobić (komunikat z punktu jest
  w kodzie przycisku, którego wtedy nie ma).
- „Pozostałe boje” pokazują boje sprzed ponad 30 dni z ich dawną datą (03.10.2026 Mandat, 29.09.2026 Składka PZW) bez opisu
  stanu („po terminie, zniknęła z radaru”) – można się pomylić, że to przyszłe.
- Stan RA.10 od zera bez podziału na start daje alarmy „Pensja częściowa…” i „Osłony … poniżej minimum” – nie dotyczą punktu
  (dane zbudowane, nie błąd).
