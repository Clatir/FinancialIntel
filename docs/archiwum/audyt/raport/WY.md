# Raport audytu – WY (Wywiad)

- Data: 03.11.2026, 11:50–12:50 (zegar prawdziwy, Warszawa, wtorek); wersja 1.15.4 z GitHub Releases (laboratorium
  `C:\FI-audyt`).
- Stan danych: persona `rok` (kotwica 2026-11-03) z folderem ICTTJ persony; stan `start` (KR); stany szczególne na kopiach
  `rok` i foldery z `seedFolder` (tabela niżej). Stanu `brzegi` i `start-0` laboratorium nie ma – zastąpione.
- Przebiegi: `wy-0` … `wy-5` (`C:\FI-audyt\przebiegi\wy-*`, teksty ekranów w `out\`), skrypty `tests/audyt/wy-*.spec.ts`
  i `wy-pomoc.ts`, odczyty liczb `C:\FI-audyt\odczyty\wy.jsonl`, zrzuty `C:\FI-audyt\zrzuty\WY*.png`.
- Dane wykresów (krzywa majątku) czytane z danych, które dostaje wykres (drzewo React okna), i sprawdzone z dymkiem krzyża
  (03.05.2026 – „53 330,98 zł” na osi = punkt danych); znaczniki BOS / CHoCH sprawdzone niezależną implementacją reguły
  z punktu WY.5 (`C:\FI-audyt\przebiegi\wy-analiza\struktura.js`).

**Podsumowanie (28 punktów):** ZGODNE 14 (z nich 7 z liczbami → AU-9) · LICZBY → AU-9 7 · UWAGA 3 · NIEZGODNE 3 (S 2, N 1)
· NIE DO SPRAWDZENIA 0 · poza laboratorium 1 (WY.28 – Ty; zrzuty przygotowane). Odczyty: `wy.jsonl` (WY.1–6, 9–18, 20, 22,
24).

## Stany szczególne

| Przebieg | Zmiana przed startem | Punkty |
| --- | --- | --- |
| `wy-1` | `rok` + zapisany widok Operacji „Audyt – mBank” (`settings.operationViews`) | WY.3–15, 17, 18, 22, 24, 25, 27, 28 |
| `wy-2` | `rok`; zapisy z interfejsu: manewry, „Zastosuj pensję” 9 000 zł od 12.2026, CPI 4,9, cel wyprawy, próg dziennika 0 zł, szybki wpis / edytor 500 zł | WY.6, 16, 20, 21, 23, 24, 25 |
| `wy-3` | `rok` + 15.10 wydatek 50 zł na samej kategorii Jedzenie, 30.10 pt 19:30 zwrot +50 zł (Osobiste), sierpień bez kopert, bez dzisiejszej Mokki | WY.9, 10, 12, 14, 20 |
| `wy-4-*` | `rok`: dzisiejsza Mokka 12 zł usunięta / 50,00 / 5,95 / 47,61 / 47,62; minimum osłon 3 pensje; 01.11 Auto 700 zł; plan listopada Osobiste 50 zł + Jedzenie 1 900 zł i 01.11 Osobiste 100 zł | WY.1, 2 |
| `wy-5-*` | `seedFolder`: bez startu budżetu; budżet od dziś (25 000 zł, pensja 4 000); od 27.10 (2 operacje); „brzegi” od 01.08 (osłony 6 000, kadłub 0, wpływ 3 000 i koszty 4 800 miesięcznie); stan `start` | WY.15, 19, 22, 26 |

## Punkty

### WY.1 – ZGODNE (liczby → AU-9)
- Stan: kopie `rok` (`wy-4-*`, 12:17–12:21; Bearish powtórzony 12:38), `rok` bez zmian (`wy-0`, 11:52). Zrzuty:
  WY.1-bullish.png, WY.1-bearish-energia.png, WY.1-bearish-oslony.png
- Widać (Mostek / Raporty → Odprawa / odsłuch): bez dzisiejszego zakupu „ENERGIA DZIŚ 89,28 zł”, „przydział 89,28 zł ·
  podstawowy 83,33 zł”, „▲ Bullish” (jasny) / „Bullish” / „Daily Bias: Bullish”; `rok` 77,28 zł – „◆ Neutral”
  (przygaszony) / „Neutral” / „Daily Bias: Neutral”; energia 39,28 zł – „▼ Bearish” w kolorze akcentu (rgb 232,163,61)
  / „Bearish” / „Daily Bias: Bearish”; minimum osłon 3 pensje przy energii 89,28 zł – „▼ Bearish” (akcent), w odsłuchu
  „Osłony (bufor na pensje) poniżej minimum o 6 500,00 złotych”. Podstawowy 83,33 = 2 500 zł kopert codziennych ÷ 30 dni.
  Bearish nigdzie na czerwono; w Raportach wartość Daily Bias zwykłym kolorem tekstu (rgb 195,203,212) dla każdego wyniku –
  na Mostku akcent (spostrzeżenie).

### WY.2 – ZGODNE
- Stan: kopie `rok` (`wy-4-*`, 12:19–12:23 i 12:38). Zrzuty: WY.1-rowna-podstawowemu.png, WY.1-polowa-w-gore.png,
  WY.1-polowa-w-dol.png, WY.1-planowa-ponad.png, WY.1-codzienna-ponad.png
- Widać: energia 83,33 zł (= podstawowy) – „▲ Bullish”; 41,67 zł (połowa 41,665 zaokrąglona w górę) – „◆ Neutral”;
  41,66 zł – „▼ Bearish”; koperta planowa Auto 700,00 / 650,00 przy energii 89,28 zł – „◆ Neutral” (nie Bullish; w odsłuchu
  „Koperta Auto ponad limit o 50,00 złotych”); koperta codzienna Osobiste 100,00 / 50,00 przy energii 85,71 zł – „▲ Bullish”
  (bez wpływu). Ten sam wynik w Raportach i w odsłuchu.
- Odnotowane (wątpliwość z punktu): osłony pod minimum dają Bearish także przy pełnej energii – osłony mają pierwszeństwo.
  „Dokładnie połowa” nie istnieje w groszach (83,33 / 2 = 41,665): granica wypada między 41,66 a 41,67.

### WY.3 – LICZBY → AU-9
- Stan: rok (`wy-0` 11:52, `wy-1` 12:00). Zrzuty: WY-0-intel-wealth.png, WY.3-dymek-1…3.png
- Widać: „NA KONTACH 73 610,57 zł” = Mostek „Na kontach budżetu 73 610,57 zł” i „Suma kont budżetu: 73 610,57 zł” =
  Ustawienia → Konta (mBank 69 747,04 + Portfel XTB 3 918,89 + Gotówka −55,36); „SZCZYT 73 727,79 zł”; 62 punkty – każda
  niedziela od 07.09.2025 do 01.11.2026, ostatni dziś 03.11.2026; krzyż na wykresie pokazuje wartość punktu (03.05.2026 –
  „53 330,98 zł”). Dopisek „Na kontach – suma sald kont budżetu na koniec każdego tygodnia, z pieniędzmi pożyczonymi
  i depozytem domowników.” Odczyt niedziel: 07.12.2025 33 903,26 · 15.03.2026 53 842,92 · 12.07.2026 61 338,54 ·
  01.11.2026 73 622,57. „Historia sprzed salda otwarcia” – nie do sprawdzenia (budżet i historia persony od 01.09.2025).

### WY.4 – LICZBY → AU-9 (czytelność – Ty)
- Stan: rok (`wy-0`, `wy-2`). Zrzut: WY-0-intel-wealth.png
- Widać: „NAJWIĘKSZY DRAWDOWN −6 100,62 zł” (dołek 07.12.2025 po szczycie 16.11.2025 40 003,88); słupki drawdownu = wartość
  tygodnia − najwyższy punkt do tej daty (sprawdzone na 62 punktach obu linii), nigdy dodatnie, zero w każdym nowym
  szczycie (np. 18.10 i 25.10.2026).

### WY.5 – LICZBY → AU-9
- Stan: rok (`wy-0`, `wy-2`). Zrzut: WY-0-intel-wealth.png
- Widać: „STRUKTURA bullish – wyższe szczyty”; „18.10.2026 BOS w górę – poziom 69 921,62 zł”, „13.09.2026 … 67 368,97 zł”,
  „16.08.2026 … 63 733,83 zł”, „26.07.2026 … 61 338,54 zł”, „12.07.2026 … 58 347,54 zł”; na wykresie 18 znaczników,
  CHoCH (akcent) 07.12.2025 w dół, 14.12.2025 w górę, 03.05.2026 w dół, 17.05.2026 w górę. Niezależnie zapisana reguła
  z punktu (swing potwierdzony tydzień później, BOS z trendem, CHoCH przeciw, pierwszy bez trendu – BOS) daje te same 18
  znaczników na obu liniach (na kontach i netto).

### WY.6 – ZGODNE (liczby → AU-9)
- Stan: rok (`wy-1` z restartem, `wy-2`). Zrzut: WY.6-netto.png
- Widać: po „siła floty netto” – „SZCZYT 69 790,59 zł”, „NAJWIĘKSZY DRAWDOWN −5 560,59 zł”, znaczniki z poziomami linii netto
  („18.10.2026 BOS w górę – poziom 65 365,52 zł”), „na kontach” przerywana; „SIŁA FLOTY NETTO 69 673,37 zł”. Tydzień
  pożyczki od rodziców (6 000 zł, 01.10.2025): na kontach 23 569,32 → 28 730,85, netto 23 063,97 → 22 225,50 – pożyczka
  podnosi tylko „na kontach”; na linii netto bez CHoCH w górę. Mostek bez zmian („Na kontach budżetu 73 610,57 zł”). Po
  restarcie dalej „siła floty netto”.

### WY.7 – ZGODNE
- Stan: rok (`wy-0`). Zrzut: WY.7-mostek.png
- Widać: Mostek „ostatnie 26 tygodni” – 27 punktów od 10.05.2026 do dziś, wartości i drawdown jak ostatnie 27 punktów
  Wywiadu; 7 znaczników Mostka = znaczniki Wywiadu z tego okresu (ze struktury całej historii, z CHoCH 17.05.2026).
  „Wywiad →” otwiera Wywiad.

### WY.8 – ZGODNE
- Stan: rok (`wy-1`). Widać: domyślnie „6 mies.”; „3 mies.” – Wydatki w czasie „wrz paź lis”, Dziennik 3 wiersze, Namierzone
  cele z 3 miesięcy (BIEDRONKA 1 292,43 / 19), Killzones „Zakupy z godziną: 32, bez godziny: 96”; „12 mies.” – kolumny
  gru–lis, 12 wierszy dziennika, Killzones 158 / 577. Krzywa, Bilans paliwa, FVG, Porównanie, Prognoza, Kurs, Inflacja –
  bez zmian. Bieżący miesiąc zawsze ostatni.

### WY.9 – LICZBY → AU-9 (czytelność mapy – Ty)
- Stan: rok (`wy-0`, `wy-1`), `wy-3` (zwrot z godziną), `start` (`wy-5`). Zrzut: WY.9.png
- Widać: 6 mies. – „Zakupy z godziną: 64, bez godziny: 257.”, obwiedzione pole „pt 19:00–20:00 · 2 zak. · 459,44 zł”
  (Weterynarz 230,98 + IKEA 228,46); 3 mies. – to samo; 12 mies. – „pt 19:00–20:00 · 3 zak. · 639,82 zł”. Pól z godziną
  00 nie ma – import tylko w liczniku. Wspólny zakup z Anną (06.09, 58,75 zł) w polu „nd 07:00–08:00 · 1 zak. · 29,37 zł”
  – tylko moja część. Zwrot z godziną (pt 19:30, +50 zł) – pole bez zmian, poza licznikiem. Inne pola: „sob 15:00–16:00 ·
  2 zak. · 249,96 zł”, „pon 21:00–22:00 · 2 zak. · 248,42 zł”, „sob 23:00–24:00 · 1 zak. · 239,05 zł”. Stan `start`
  (same importy): „Brak zakupów z godziną w tym okresie – godzinę mają wpisy z szybkiego wpisu i Operacji (import
  z mBanku jej nie ma).”
- Spostrzeżenie: Mostek i Dowództwo w tej samej chwili: misja „Twoja killzone wydatków – wtorek 20:00–21:00”, a Wywiad
  obwodzi jako „Twoją killzone” piątek 19:00–20:00 – dwa różne „Twoja killzone” bez słowa o różnym okresie.

### WY.10 – ZGODNE (liczby → AU-9)
- Stan: rok (`wy-1`), `wy-3` (sierpień bez kopert). Zrzuty: WY.10.png, WY.10-bez-kopert.png
- Widać: „FVG KOPERT – PAŹDZIERNIK 2026” (domyślnie poprzedni miesiąc); lista grudzień 2025 – listopad 2026 (12; budżet od
  września 2025); październik: „Jedzenie 1 146,70 / 1 600,00 +453,30 zł”, „Dom 369,89 / 300,00 −69,89 zł”, „Prezenty
  i inne 721,67 / 200,00 −521,67 zł” …, plus zielony, minus czerwony; te same kwoty w Plan miesiąca → debriefing („369,89 zł
  z 300,00 zł −69,89 zł”) i Raporty → Debriefing („Dom 300,00 zł 369,89 zł −69,89 zł”); wrzesień 2026 i listopad też
  zgodne z debriefingami. Sierpień bez kopert – „Bez kopert w tym miesiącu.”; objaśnienie „Fair Value Gap: luka między
  planem a faktem – …”.

### WY.11 – ZGODNE (liczby → AU-9)
- Stan: rok (`wy-1`). Zrzut: WY.11.png
- Widać: „Order Block · ładownia” (dymek „Kontenery ładowni – stała strefa kosztów (Order Block)”) paź 1 738,00 · wrz
  2 600,12; „Razem” paź 5 413,19 · wrz 7 548,47 · sie 6 043,49 · lip 6 709,18 · cze 6 370,87 = „Koszty netto” debriefingów
  i Bilansu paliwa; kategorie + Order Block = Razem (paź 3 675,19 + 1 738,00); Czynsz (kontener w kategorii Dom) tylko
  w Order Block – Dom paź 369,89 = FVG Dom. Porównanie z eksportem „Miesiące” – obszar RE.

### WY.12 – ZGODNE
- Stan: rok + zapisany widok (`wy-1`), `wy-3`. Zrzuty: WY.12-podkategorie.png, WY.12-jedzenie-paz.png,
  WY.12-order-block-paz.png, WY.12-bez-podkategorii.png
- Widać: Jedzenie ▾ – „zakupy spożywcze 782,06”, „na mieście 227,16”, „kawa i przekąski 137,48” (paź, razem 1 146,70);
  z wydatkiem na samej kategorii (`wy-3`) – wiersz „bez podkategorii … 50,00” bez przycisku, razem 1 196,70. Klik
  „1 146,70” → Operacje „październik 2026 · Rodzaj: Wydatek · Kategoria: Jedzenie”, „Koszty 1 146,70 zł” (25 operacji);
  „na mieście 227,16” → „Koszty 227,16 zł”; Order Block „1 738,00” → 5 płatności kontenerów, „Koszty 1 738,00 zł”. Zapisany
  widok „Audyt – mBank” zostaje po każdym drążeniu.
- Spostrzeżenie: na liście obok „Koszty 1 146,70 zł” jest „Wydatki −1 316,56 zł” (z częściami Anny) – z komórką zgadza się
  tylko jedna z dwóch sum.

### WY.13 – UWAGA (tekst; liczby → AU-9)
- Stan: rok (`wy-1`, 6 mies.), 12:01. Zrzuty: WY.13.png, WY.13-operacje.png
- Widać: „BIEDRONKA 1234 · Jedzenie (37,7%) 2 766,66 40 69,17 -19,3%” (z ręcznymi „Biedronka”), „ORLEN STACJA 4123 · Auto
  (62,6%) 2 561,25 12 213,44 +2,7%”, „ALLEGRO · Prezenty i inne (91,9%) 1 705,88 8 213,24 +128,6%”; średnio = razem ÷
  kontakty; udział Biedronki = 2 766,66 ÷ 7 346,62 (wszystkie zakupy Jedzenia w okresie); opłat ładowni brak; dymek
  „Rozpoznanie celu – BIEDRONKA 1234, 40 kontaktów, 2 766,66 zł. Ostatnio 25.10.2026. Pokaż w Operacjach.”; klik → Operacje
  „cała historia”, filtr marki, 122 operacje (także ręczne „Biedronka”).
- Uwaga: (1) „BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI: 2026-08-29 · Gotówka (100%) 1 000,00 5” – nazwa marki to surowy
  tytuł mBanku z datą jednej z pięciu wypłat; (2) „KAWIARNIA MOKKA · Jedzenie (3,7%) 272,42 19” i osobno „Mokka · Jedzenie
  (0,2%) 12,00 1” (dzisiejszy szybki wpis) – ta sama kawiarnia w dwóch wierszach (nazwa ręczna nie jest początkiem nazwy
  z banku; przypadek „KFC” / „KFC 1234 WARSZAWA” działa – Biedronka, Bar pod Lipą).

### WY.14 – UWAGA (tekst; liczby → AU-9)
- Stan: rok (`wy-1`), `wy-3` (listopad bez wydatków). Zrzuty: WY.14.png, WY.14-bez-wydatkow.png
- Widać: domyślnie „PORÓWNANIE – PAŹDZIERNIK 2026”; wrzesień 2025 (pierwszy miesiąc) – średnie „—”; październik 2025 –
  „śr. 3 mies.” = „śr. 12 mies.” = wrzesień 2025 (1 232,60); listopad 2025 – średnia z dwóch miesięcy (Jedzenie 1 323,30)
  – miesiące spoza historii nie liczą się jako 0. „▲” w akcencie: Zdrowie 78,07 wobec 68,48 (+14 %) i rok temu 67,91
  (+15 %), Rozrywka 289,15 wobec 261,13 (+10,7 %); bez znaku: Rozrywka wobec 277,77 (+4,1 %), Dom 365,94 wobec 350,40
  (+4,4 %). Odczyt: Zdrowie „78,07 68,48▲ 91,87 67,91▲”, Rozrywka „289,15 277,77 334,41 261,13▲”.
- Uwaga: miesiąc bez wydatków (listopad bez Mokki, `wy-3`) – tabela 10 kategorii z „0,00” i średnimi zamiast „Bez wydatków
  w tym miesiącu.”; komunikat pojawia się tylko w folderze bez historii.
- Spostrzeżenie: przy „rok temu 0,00” (Prezenty 721,67, Dom 369,89) bez „▲” – wzrost od zera nie jest zaznaczany.

### WY.15 – UWAGA (tekst; liczby → AU-9)
- Stan: rok (`wy-1`, `wy-2`); `wy-5` (bez pełnego miesiąca). Zrzut: WY.15.png
- Widać: „Bez żadnej wypłaty paliwa starczy na 7,8 mies. (czerwiec 2027).” = Mostek „ZASIĘG 7,8 mies.” = Dowództwo „zasięg
  7,8 mies.”; paliwo w listopadzie 51 566,30 (osłony 13 000 + kadłub 39 066,30 − dług 500), co miesiąc −6 530,87 (średnie
  koszty); druga kreska (dymki) „Z bojami: 50 766,30 zł” (−800 wesele), „45 685,43 zł” (+1 450 zwrot PIT-37) … „6 500,21 zł”
  (cze), „0,00 zł” (lip) – pierwsza kreska bez zmian. Bez średnich kosztów: „Brak średnich kosztów – prognoza po pierwszym
  pełnym miesiącu.”
- Uwaga: „Z bojami (zaplanowane wydatki i wpływy): do lipca 2027” obok „(czerwiec 2027)” sugeruje, że boje wydłużają zasięg
  o miesiąc, a obie linie kończą się w czerwcu (z bojami na początku czerwca 6 500,21 zł przy kosztach 6 530,87 zł) – dwa
  zdania liczą miesiąc inaczej. Przy „Brak średnich kosztów” pod zdaniem zostaje pasek „lis 26 0,00” (folder bez startu).

### WY.16 – ZGODNE (liczby → AU-9)
- Stan: rok (`wy-1`, `ry-6`), `wy-2` (próg 0 zł). Zrzuty: WY-0-intel-log.png, WY.16-prog-0-szybki-wpis.png,
  WY.16-prog-0-edytor.png
- Widać: „październik 2026 2 · 522,46 3 · 744,82 1 40%”, „lipiec 2026 7 · 1 601,44 1 · 210,00 5 88%”, „kwiecień 2026
  0 · 0,00 2 · 427,84 2 0%”, „listopad 2026 0 · 0,00 0 · 0,00 0 —”; trafność = plan ÷ (plan + impuls) (7/8 → 88 %);
  „Impulsy łącznie: 14 na 3 073,32 zł.” (6 mies.); październik w Raportach → Debriefing „Plan 2 · 522,46 zł”, „Impuls
  3 · 744,82 zł”, „Bez oznaczenia (od progu) 1”, „Trafność (plan wśród oznaczonych) 40%”. Próg 0 (Dowództwo → „Dziennik
  kapitański od kwoty”, w pliku `impulseThreshold: 0`): szybki wpis 500 zł i edytor 500 zł – bez pytania „Plan czy impuls?”.

### WY.17 – LICZBY → AU-9
- Stan: rok (`wy-1`); `wy-5-brzegi`. Zrzut: WY.17.png
- Widać: 12 miesięcy listopad 2025 – październik 2026 (listopad 2026 pominięty); „październik 2026 11 500,00 5 413,19
  +6 086,81 52,9% 27,8%” = debriefing („+6 086,81 zł”, „52,9% (mediana 6 mies.: 28,4%)”); „listopad 2025 7 500,00 7 962,41
  −462,41 -6,2% -6,2%”; luty 2026 12 500,00 (wypłata 1 800 zł z puli Podatek 15.02 nie liczona); marzec 2026 7 500,00
  (dopłata 1 000 zł do XTB – przychód nie spada pod pracę); „28,4%”, „MEDIANA 12 MIES. 28,4%”, „BEZ TRADINGU · 6 MIES.
  14,8%”, „TREND (3 MIES.) spada”. Bilans zielony / czerwony; przy ukrytych kwotach „•••” przygaszony (WY.27). Miesiąca bez
  przychodu nie było – „—” nie sprawdzone.
- Spostrzeżenie: procenty z łącznikiem („-6,2%”, „-60%”), kwoty ze znakiem minus („−462,41”); stopa bez miejsca po
  przecinku, gdy wychodzi okrągła („-60%”, w debriefingu „55%”).

### WY.18 – LICZBY → AU-9
- Stan: rok (`wy-1`, `wy-2`). Zrzut: WY.18.png
- Widać: „bez wypłat z XTB 7 500,00 zł/mies.”, „mediana 9 750,00”, „średnia 9 458,33” = panel Przychody na Mostku („Praca
  i inne … mediana 7 500,00”, „Razem … 12 mies. 9 458,33 · mediana 9 750,00”); „Osłony pełne 05.2027 01.2027 01.2027”,
  „Kadłub pełny 05.2027 01.2027 01.2027”, „Cel: Nowy laptop 11.2026”, „Cel: Wakacje 2027 11.2027 03.2027 03.2027”, „Cel:
  Wkład własny – mieszkanie poza kursem”, „Cel: Nowe stanowisko tradingowe poza kursem” (akcent; termin 12.2026), „Poniżej
  minimum osłon nie”, „Pensja z kadłuba nie”; „gru 26 15 619,13 · 39 066,30 | 17 869,13 · 39 066,30 | 17 577,46 ·
  39 066,30”. Folder bez zmian przy pracy w Wywiadzie (WY.21).

### WY.19 – NIEZGODNE (S)
- Stan: `wy-5-brzegi` (osłony 6 000 → dziś 300 zł, kadłub 0, wpływ 3 000 / koszty 4 800 zł miesięcznie, pensja 4 000),
  `wy-5-od-dzis` (budżet od dziś, bez historii), `wy-5-bez-startu`; 12:30–12:40. Zrzuty: WY.26-brzegi-intel-course.png,
  WY.26-od-dzis-intel-course.png
- Zrobione: Ctrl+9 → „Kurs na 12 miesięcy” w każdym stanie.
- Widać (brzegi): „Poniżej minimum osłon 12.2026, 01.2027, … 11.2027” (dobrze), „Pensja z kadłuba nie”, a w tabeli „gru 26
  −1 800,00 · 0,00”, „sty 27 −3 600,00 · 0,00” … „lis 27 −21 600,00 · 0,00” – osłony poniżej zera, pełna pensja co miesiąc
  z pustych osłon i pustego kadłuba. Ta sama chwila na Mostku: „Pensja częściowa: brakuje 3 400,00 zł – osłony (bufor na
  pensje) i kadłub (fundusz awaryjny) puste.” Od dziś (bez historii): „Pensja z kadłuba 04.2027, 05.2027”, potem
  „maj 27 −3 000,00 · 0,00” … „lis 27 −27 000,00 · 0,00”. Bez startu: „Kurs policzy się po starcie budżetu.” Nigdzie NaN,
  Infinity ani pustych kolumn.
- Oczekiwane: przy pustym kadłubie „Pensja z kadłuba” albo pensja częściowa (punkt; F27, T276) – nie ujemne osłony. Skutek:
  kurs pokazuje pieniądze, których nie ma, zamiast miesiąca, od którego pensja nie będzie pełna (silnik na Mostku to wie).
- Powtórzone na dwóch niezależnych stanach (brzegi, od dziś).

### WY.20 – NIEZGODNE (S)
- Stan: rok (`wy-1` 12:02, `wy-2` 12:14, `wy-3` 12:17). Zrzuty: WY.20-a.png, WY.20-b.png, WY.20-d.png,
  WY.20-koszty-300-w-polu.png, WY.20-koszty-300-po-wyjsciu.png, WY.20-maneuver-costs-250.png, WY.20-xtb-13-po-wyjsciu.png,
  WY.20-d-2027-13.png
- Działa: (a) zakup 10 000 zł z osłon w 12.2026 – „Osłony pełne 01.2027 → 04.2027”, „Kadłub pełny → 04.2027”, „Cel: Wakacje
  2027 → 06.2027”, „Poniżej minimum osłon nie → 12.2026, 01.2027, 02.2027” (pogorszenie w akcencie); (b) 6 mies. bez XTB –
  osłony / kadłub 05.2027, Wakacje 07.2027; (c) koszty +20 % – „7,9 → 6,6 mies.”, kadłub 06.2027; (d) cel 5 000 zł, termin
  2027-06, „rata z pensji” – „Cel: Audyt cel poza kursem → 06.2027” (jasny – lepiej); (e) kontener 300 zł co 1 mies. –
  „7,5 mies.”, kadłub 02.2027; „wyczyść manewr” wraca do stanu wyjściowego; „300” wklejone w całości – pole czerwone, po
  wyjściu puste, tabela bez zmian.
- Nie działa:
  1. „Zasięg i klasa – teraz: 7,9 mies. · Niszczyciel”, a Mostek, Dowództwo i „Prognoza zasięgu” na tym samym ekranie –
     „7,8 mies.” (`wy-1`, `wy-2`). „Teraz” symulatora to zasięg po operacjach tego miesiąca z kursu – różnicy nic nie objaśnia.
  2. Wartość spoza zakresu wpisywana z klawiatury zostawia swój początek: „300” w „Koszty wyższe o” – w trakcie pisania pole
     czerwone, a tabela już liczy +30 % („6,0 mies.”, „Kadłub pełny —”); po wyjściu z pola „30”. Tak samo „13” miesięcy bez
     XTB → „1”, „250” % → „25”, „24” → „2” (`wy-2`, `wy-3`). Wpisana wartość nie jest odrzucona, tylko po cichu zamieniona.
  3. Termin „2027-13” – pole bez oznaczenia błędu, cel „poza kursem” bez słowa dlaczego.
- Oczekiwane: „teraz” = stan obecny (zasięg jak na Mostku); wartości spoza zakresu odrzucone (punkt).

### WY.21 – ZGODNE
- Stan: rok (`wy-2`), 12:14. Zrzuty: WY.21-toast.png, WY.21-plan-grudzien.png
- Widać: suma kontrolna 1 169 plików przed manewrami (a)–(e) z wartościami spoza zakresu i po nich – bez różnic; „Zastosuj
  pensję od 12.2026” → toast „Pensja 9 000,00 zł od 12.2026 w planie miesiąca.”; zmieniony tylko nowy plik
  `months/2026-12.json` (`salary: 900000`), listopad bajt w bajt bez zmian.

### WY.22 – LICZBY → AU-9
- Stan: rok (`wy-0`, `wy-1`), `start` (`wy-5`). Zrzut: WY.22.png
- Widać: „TWOJA INFLACJA +2,7%”, „Porównane miesiące: 2 (każdy z tym samym miesiącem rok wcześniej).” (wrzesień
  i październik – jedyne z 12 ostatnich pełnych z rokiem wcześniej w historii), „Jedzenie 2 646,59 → 2 984,15 +12,8%”
  (= wrz + paź 2025 i 2026), „LIDL SP Z O O średnio 84,32 → 138,45 +64,2%”, „ZABKA Z1234 średnio 17,49 → 24,42 +39,6%”,
  „Czynsz kwota 1 450,00 → 1 450,00 0%”, „CEL KADŁUBA (6 × KOSZTY) 39 185,22 zł” (wartości „rok temu” brak – rok wcześniej
  były 2 miesiące historii). Bez roku historii: „Porównanie rok do roku potrzebuje roku historii z banku – te same miesiące
  rok wcześniej.” Stan `start` ma pełną historię z importu – „+3,3%”.

### WY.23 – ZGODNE
- Stan: rok (`wy-2`), 12:15. Zrzut: WY.23-4_9.png
- Widać: domyślnie „październik 2026”; „4,9” → `settings.intel.cpi: {"2026-10": 4.9}`, „GUS (CPI) – PAŹDZIERNIK 2026 +4,9%”;
  „-60” i „250” – toast „Wpisz zmianę cen w procentach, np. 4,9 albo -0,5.”, plik bez zmian; puste – wpis zdjęty („nie
  wpisano”); po restarcie „4,9”. Żądań sieciowych (http/https) w obu sesjach – zero. Drugi komputer – wpis jest w folderze
  (`fi.json`).

### WY.24 – ZGODNE (liczby → AU-9)
- Stan: rok (`wy-1`, `wy-2`). Zrzuty: WY.24.png, WY.24-cel.png, WY.24-operacje.png
- Widać: „#Mazury 2026 16.06.2026 – 19.07.2026 · 5 operacji 1 350,00 zł”; „Rozrywka i hobby 720,00 zł / Jedzenie 390,00 zł /
  Auto 240,00 zł”, „czerwiec 2026: 600,00 zł / lipiec 2026: 750,00 zł”; BOOKING.COM 1 200 zł „wspólnie: ja, Anna” liczony
  jako 600 zł; „Pokaż w Operacjach” – 5 operacji, „Koszty 1 350,00 zł”. Po wyborze celu: „Ekspedycja „Wakacje 2027”: wydano
  1 350,00 zł z 8 000,00 zł celu” i „Rozlicz z celu (5)”. Zwrotu zaliczki w tagu persona nie ma.

### WY.25 – NIEZGODNE (N)
- Stan: rok (`wy-0`, `wy-1`, `wy-2`), 11:52–12:15. Zrzuty: WY.25-F1.png, WY-0-wywiad.png
- Objaśnione: BOS, CHoCH, drawdown (tekst pod krzywą), FVG („Fair Value Gap: luka między planem a faktem – …”), Killzone
  („Najjaśniejsze pole (z obwódką) to Twoja killzone wydatków.”), Order Block (dymek), Premium / Discount / Equilibrium (dymek
  koperty na Mostku), DOL (dymek „Draw on Liquidity – tu popłynie następna dostawa do celów”), Turtle Soup (Radar); Judas
  Swing – tylko „Judas Swing – zakup oznaczony jako impuls” w dzienniku wachty.
- Nie przechodzi: dymek Daily Bias na Mostku „Daily Bias (spec, Wywiad)” – odsyła do specyfikacji i nic nie objaśnia; Daily
  Bias nie ma objaśnienia nigdzie (Raporty – bez dymka, słowniczek – brak). Odsyłacze do decyzji w dymkach i tekstach:
  „Przychód (D81): praca i trading netto …” (Raporty → Raport wachty), „Wpływy bez przelewów własnych, spłat i zaliczek
  domowników (D81)” (Mostek → Przychody), w Dowództwie „… krótkiego wpisu (D40).”, „„Plan czy impuls?” od tej kwoty (D41) …”,
  „Firewall: … (D23)”.
- Słowniczek F1 („Słowniczek okrętu”) ma tylko metaforę okrętu – żadnego terminu ICT. Silver Bullet (blok tylko 16:00–17:00)
  i Liquidity sweep (ukryte osiągnięcie) – nie widać o tej porze i w tym stanie.
- Oczekiwane: każdy termin z jednym zdaniem po polsku, bez odsyłaczy do specyfikacji i decyzji (punkt).

### WY.26 – ZGODNE
- Stan: `wy-5-bez-startu`, `wy-5-od-dzis`, `wy-5-od-27-10`, `start`; 12:27–12:40. Zrzuty: WY.26-*.png
- Widać: bez startu – „Za mało danych – krzywa pojawi się po dwóch tygodniach historii.”, „Bilans pojawi się po pierwszym
  pełnym miesiącu historii.”, „Brak zakupów w tym okresie.”, „Brak zakupów z godziną w tym okresie – …”, „Bez kopert w tym
  miesiącu.”, „Bez wydatków w tym miesiącu.”, „Brak średnich kosztów – prognoza po pierwszym pełnym miesiącu.”, „Kurs
  policzy się po starcie budżetu.”, „Symulator ruszy po starcie budżetu.”, „Brak tagów – …”, „Porównanie rok do roku
  potrzebuje roku historii z banku – …”; od dziś (1 punkt) – komunikat krzywej; od 27.10 (2 punkty: 01.11 24 957,50, dziś
  24 897,50) – wykres się rysuje, „bez struktury”, drawdown −60,00 zł (prawdziwy zakup 60 zł 02.11); `start` – 62 punkty,
  panele z liczbami. Nigdzie „NaN”, „Infinity”, „undefined”, błędów okna brak.

### WY.27 – ZGODNE
- Stan: rok (`wy-1`), 12:05. Zrzuty: WY.27-wywiad.png, WY.27-krzywa-dymek.png, WY.27-intel-*.png
- Widać: w tekście Wywiadu żadnej kwoty (172 × „•••”), „Impulsy łącznie: 14 na ••• zł.”, „poziom ••• zł”; oś cen wykresu
  ukryta, krzyż tylko z datą („12 kwi '26”); dymki Killzones „pt 19:00–20:00 · 2 zak. · •••”; Bilans paliwa „•••” przygaszony
  (bez zieleni i czerwieni); procenty i daty zostają; Ctrl+$ ponownie – kwoty wracają.
- Spostrzeżenie: FVG kopert przy ukrytych kwotach dalej „+••• zł” na zielono i „••• zł” na czerwono – znak i kolor zdradzają
  zapas albo przekroczenie, choć w Bilansie paliwa ten przypadek rozwiązano bez koloru.

### WY.28 – poza laboratorium (Ty)
- Zrzuty do oceny: WY.28-intel-wealth.png, WY.28-intel-killzones-panel.png, WY.28-intel-range.png, WY.28-intel-course.png,
  WY-0-wywiad.png (cały ekran).

## Znaleziska

- WY.19 – NIEZGODNE (S): Kurs na 12 miesięcy przy pustym kadłubie prowadzi osłony poniżej zera („lis 27 −21 600,00 · 0,00”)
  zamiast pensji częściowej, choć Mostek w tej samej chwili mówi „Pensja częściowa: brakuje 3 400,00 zł”.
- WY.20 – NIEZGODNE (S): symulator – „teraz 7,9 mies.” wobec „7,8 mies.” na Mostku i w Prognozie; wartość spoza zakresu
  pisana z klawiatury zamienia się po cichu na swój początek („300” % → 30 %, „13” mies. → 1).
- WY.25 – NIEZGODNE (N): dymek „Daily Bias (spec, Wywiad)” i odsyłacze „(D81)”, „(D40)”, „(D41)”, „(D23)” w dymkach i tekstach;
  Daily Bias bez objaśnienia, słowniczek F1 bez terminów ICT.
- UWAGI: WY.13 (nazwa „BANKOMAT … DATA TRANSAKCJI: 2026-08-29”, „Mokka” i „KAWIARNIA MOKKA” osobno), WY.14 (miesiąc bez
  wydatków – tabela zer zamiast komunikatu), WY.15 („do lipca 2027” z bojami obok „(czerwiec 2027)” bez boi przy tym samym
  wyczerpaniu).

## Spostrzeżenia

1. **Dwie „Twoje killzone” naraz:** misja na Mostku i w Dowództwie „wtorek 20:00–21:00”, Wywiad obwodzi „pt 19:00–20:00” –
   bez słowa, że to inne okresy analizy.
2. **Słowniczek bez ICT:** F1 objaśnia 19 słów okrętu, żadnego z kilkunastu terminów ICT używanych na ekranach (Daily Bias,
   BOS, CHoCH, FVG, Killzone, Order Block, Silver Bullet, Judas Swing, Turtle Soup, Liquidity sweep, Premium / Discount, DOL).
   Najprościej: druga część słowniczka „Terminy ICT” z jednym zdaniem „co to znaczy dla moich pieniędzy”.
3. **Symulator:** „wyczyść manewr” nie czyści terminu, nazwy celu ani „rata z pensji” (zostają „2027-13” i włączony
   przełącznik); brak komunikatu przy złym terminie; brak podpowiedzi, dlaczego „teraz” różni się od Mostka.
4. **Dwie sumy w Operacjach po drążeniu:** „Wydatki −1 316,56 zł” i „Koszty 1 146,70 zł” – komórka Wywiadu odpowiada drugiej;
   warto wyróżnić tę, do której prowadzi drążenie.
5. **FVG przy ukrytych kwotach** zachowuje kolor i znak (Bilans paliwa – nie); **Porównanie** nie zaznacza wzrostu od zera
   (rok temu 0,00); **Prognoza zasięgu** dla folderu bez startu rysuje pasek „0,00” pod komunikatem „Brak średnich kosztów”.
6. **Typografia liczb:** procenty z łącznikiem („-6,2%”), kwoty ze znakiem minus („−462,41”); stopa raz z miejscem po
   przecinku („52,9%”), raz bez („55%”, „-60%”, w przeglądzie rocznym „33%”).
7. **Nazwy marek z importu:** bankomat jako „BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI: 2026-08-29”; szybki wpis
   „Mokka” nie łączy się z „KAWIARNIA MOKKA” – podpowiedź „połącz z marką …” przy pierwszym wpisie ręcznym skróciłaby ręczne
   aliasy.

## Problemy laboratorium

- Brak stanów `brzegi` i `start-0` – zastąpione kopiami `rok` i folderami z `seedFolder` (tabela „Stany szczególne”).
- Kilka przebiegów naraz (4–5 aplikacji) – zamknięcie aplikacji przekraczało 40 s, choć dziennik aplikacji kończył się
  „koniec pracy” (`wy-4` pierwszy przebieg przerwany po 6 wariantach; reszta powtórzona pojedynczo). Nie traktuję tego jako
  błędu aplikacji.
- Odczyt danych wykresu przez drzewo React: węzeł DOM trzyma czasem nieaktualną kopię (pierwszy odczyt linii netto w `wy-1`
  pokazał dane poprzedniego renderu) – poprawione w `wy-pomoc.ts` (szukanie od bieżącego korzenia), dane netto z `wy-2`.
- Zdjęcie dni z zamrożonych (RY.13, `ry-3a`) wywołało świętowanie klasy okrętu – zamrożony 01.11 w personie miał klasę
  „scout” (persona zamrażała dzień przy niepełnych danych); po ponownym zamrożeniu „destroyer”.
