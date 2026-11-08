# Raport – DM: domownicy i pożyczki

- Data: 03.11.2026 (prawdziwa data = kotwica persony), przebiegi 15:37–16:18 (AU-10, blok C, thinking max – D96).
- Wersja: Financial Intel 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4`), laboratorium `tests/audyt/lab.ts`.
- Stan danych: persona `rok` wygenerowana 03.11.2026 ok. 15:17 (kotwica 2026-11-03, start budżetu 01.09.2025, konta
  mBank / Portfel XTB / Gotówka; domownicy Anna – zaliczka 4 377,20 zł, Kasia – przez Annę, zaliczka 360,00 zł, Marek –
  ma oddać 360,00 zł; „Rozliczenia od: startu budżetu”, „Zwrot spłaca wskazany zakup od” 04.09.2026; pożyczki „Pożyczka
  dla Tomka” i „Pożyczka od rodziców”). Punkty mówią o osobach, których persona nie ma albo ma z innym saldem, więc każdy
  przebieg dostaje kopię `rok` zmienioną przed startem (`members()` i `addRecords()` w `tests/audyt/dm-pomoc.ts`):
  - Anna persony (z jej zaliczką i historią) przemianowana na **„A. Testowa”**, a punktowa **„Anna”** to nowa, czysta
    osoba (bez zaliczki i długu) – inaczej każdy jej zakup szedłby z zaliczki 4 377,20 zł i nic nie byłoby „do oddania”;
  - **„Tata”** i **„Babcia”** dopisane do `fi.json` (Babcia zwykle „Pieniądze przekazuje przez: Tata”);
  - zakupy i wpłaty osób, pożyczki – rekordy przez schematy aplikacji, konto mBank, kategoria „Jedzenie · zakupy
    spożywcze”; dokładny stan – przy każdym punkcie („Stan”) i w nagłówku skryptu (`tests/audyt/dm-*.spec.ts`).
- Odczyty liczb: `C:\FI-audyt\odczyty\dm.jsonl`, przy każdym migawka folderu danych przebiegu i jego folderu ICTTJ:
  `C:\FI-audyt\migawki\dm\<punkt>-<n>\dane` i `…\ictj` (pole `_migawka`). Folder ICTTJ przebiegów po przebiegach bajt w
  bajt taki jak `stany\ictj-rok` (suma kontrolna – aplikacja nic w nim nie zapisała).
- Liczby: żaden punkt DM nie odsyła do wyroczni – oczekiwane kwoty wynikają wprost z punktu i zbudowanego stanu, więc
  werdykty liczb są tu ZGODNE / NIEZGODNE (bez „LICZBY → AU-9”); odczyty i migawki idą i tak do przekroju AU-9.
- Zrzuty: `C:\FI-audyt\zrzuty\DM.*.png`; dzienniki: `C:\FI-audyt\przebiegi\dm-*\przebieg.log`, wyjście skryptów
  `C:\FI-audyt\przebiegi\dm-*.out.txt`.

**Podsumowanie (DM.1–DM.19):** ZGODNE 15 · NIEZGODNE 2 (K 1 – DM.18, S 1 – DM.11; przy DM.18 także N) · UWAGA 1
(DM.10) · LICZBY → AU-9 0 · NIE DO SPRAWDZENIA 0 · poza laboratorium 1 (DM.16 – Maszyna; część z danych z przeszłości
sprawdzona: zgodna). Przebiegi `dm-0` … `dm-n3` (24), 72 odczyty liczb i 72 migawki.

---

### DM.1 – ZGODNE
- Stan: rok + „A. Testowa” (Anna persony), czysta „Anna” (zaliczka 0, dług 0), Tata z zaliczką 500 zł (do DM.2);
  przebieg dm-a, 15:42–15:43.
- Zrobione: Operacje → Ctrl+N → wydatek 120,00 zł „Sklep DM1”, Jedzenie, mBank, „finansuje: Anna”; szybki wpis „Za
  domownika” 60,00 zł, Jedzenie, Anna → Enter; szybki wpis „Za domownika” 35,00 zł z „— wybierz domownika —” → Enter.
- Widać: edytor „Anna: pożyczone z osłon 120,00 zł (ma oddać)”; szybki wpis „Finansuje Anna: 60,00 zł – nie zjada
  energii; pożyczają osłony 60,00 zł, ma oddać.”; bez osoby „Wybierz domownika, który finansuje zakup.” i 0 nowych
  plików. Mostek: „ENERGIA DZIŚ 77,28 zł” przed i po; Osłony 13 000,00 → 12 820,00 zł (−180,00); „Anna ma oddać · od
  03.11 (0 dni) 180,00 zł”; Radar „Anna ma oddać 180,00 zł najstarszy zakup z 03.11.2026 (0 dni) 2 zakupy do oddania”.
  Raporty → Debriefing → listopad 2026: „Koszty netto 12,00 zł” przed i po, „Sfinansowane przez domowników 180,00 zł
  (Anna)”, koperta Jedzenie „1 600,00 zł 12,00 zł +1 588,00 zł” przed i po; Dowództwo „Dziś na razie: zgodny” przed i po.
- Oczekiwane: energia i koperta bez zmian, osłony −180, „ma oddać 180,00 zł” na Mostku i Radarze, poza kosztami netto,
  bez naruszenia, szybki wpis bez osoby nie zapisuje (punkt). Debriefing Planu miesiąca pokazuje zamknięty miesiąc
  (październik) – listopadowe „Sfinansowane przez domowników” sprawdzone w Raportach. Podgląd bez osoby pokazuje pierwszą
  osobę z listy („Finansuje A. Testowa: 35,00 zł – nie zjada energii; z zaliczki 35,00 zł.”) – znane SW.12 (UWAGA).
- Zrzut: DM.1-edytor.png, DM.1-szybki.png, DM.1-bez-osoby.png, DM.1-mostek.png, DM.1-radar.png.

### DM.2 – ZGODNE
- Stan: jak DM.1 (po nim); Tata (reszta: zaliczka) z wpłatą 500,00 zł 28.10.2026 „Tata przelew zaliczka” (spłata,
  reszta jako zaliczka) – „Tata zaliczka – czeka na wydatki 500,00 zł”; przebieg dm-a, 15:43.
- Zrobione: wydatek 200,00 zł „finansuje: Tata”, potem wydatek 700,00 zł „finansuje: Tata”.
- Widać: 200 – „Tata: z zaliczki 200,00 zł”, Depozyt domowników 5 297,20 → 5 097,20 zł, Osłony 12 820,00 bez zmian,
  „Tata zaliczka … 300,00 zł”; 700 – „Tata: z zaliczki 300,00 zł · pożyczone z osłon 400,00 zł (ma oddać)”, Depozyt
  4 797,20 zł (Tata 0), Osłony 12 420,00 (−400,00), „Tata ma oddać · od 03.11 (0 dni) 400,00 zł” (Mostek i Radar).
  Suma warstw po 700: 12 420,00 + 6 204,63 + 39 066,30 + 8 138,96 + 1 600,00 + 4 797,20 + 803,48 = 73 030,57 zł =
  „Suma kont budżetu: 73 030,57 zł”.
- Oczekiwane: 500 → 300 bez osłon; 300 z zaliczki, 400 z osłon, depozyt 0, „ma oddać 400,00 zł”; suma warstw = salda
  kont (punkt).
- Zrzut: DM.2-200.png, DM.2-700.png, DM.2-mostek.png.

### DM.3 – ZGODNE
- Stan: rok + „A. Testowa”, czysta „Anna” (reszta: zaliczka) z zakupami: 50,00 zł 15.09.2026 „Piekarnia Anny” (M-2),
  80,00 zł 15.10.2026 „Apteka Anny” (M-1), 120,00 zł 02.11.2026 „Drogeria Anny” (M0); „Zwrot spłaca wskazany zakup od”
  04.09.2026 (persony) – przed nimi; przebieg dm-b, 15:45.
- Zrobione: Operacje → wpływ 80,00 zł z datą 30.10.2026 (zamknięty miesiąc – żeby panel „Przychody” mógł pokazać
  przychód), „Anna przelew 80”, „Od domownika: Anna”; lista Operacji, filtr Oznaczenia; Radar; Przychody; Raporty.
- Widać: od razu po wyborze Anny „spłaca 80,00 zł · Anna teraz: ma oddać 170,00 zł · Za co oddaje Anna: … spłaca: 15.10
  Apteka Anny 80,00 zł” (pewne dopasowanie zaznaczone samo, więc przycisku „Pasuje: …” już nie ma); lista
  „Apteka Anny … DOMOWNIK · ODDANE”, „Piekarnia Anny” i „Drogeria Anny” „DOMOWNIK · DO ODDANIA”; filtr „oddane” – tylko
  Apteka, „do oddania” – Drogeria i Piekarnia; „Anna ma oddać 250,00 → 170,00 zł”; Osłony 12 880,00 → 12 960,00
  (+80,00); „Przychody” bez zmian (Praca i inne 7 500,00 zł w 3/6/12 mies.), październik „Bilans paliwa +6 086,81 zł”
  przed i po.
- Oczekiwane: wiąże się sama z zakupem 80 zł, reszta „do oddania”, 170 zł, osłony +80, przychód bez zmian (punkt).
- Zrzut: DM.3-edytor.png, DM.3-lista.png, DM.3-radar.png.

### DM.4 – ZGODNE
- Stan: jak DM.3 bez wpłaty 80 zł (zakupy 50 / 80 / 120 otwarte) plus dawne rozliczenie sprzed „Zwrot spłaca wskazany
  zakup od” (04.09.2026): zakupy Anny 40,00 zł 05.08.2026 „Sklep Anny A” i 30,00 zł 10.08.2026 „Sklep Anny B”, wpłata
  30,00 zł 20.08.2026 „Anna zwrot sierpień” bez wskazania; przebieg dm-c, 15:51–15:52.
- Zrobione: wpływ 100,00 zł (dziś) „Anna przelew 100”, Anna; Radar; Meldunki → „Zwroty do przypisania” → „Przypisz” →
  w edytorze wpłaty zaznaczone „15.09 Piekarnia Anny” i „02.11 Drogeria Anny”.
- Widać: dawne rozliczone od najstarszego – w „Za co oddaje Anna” „05.08 Sklep Anny A 10,00 zł”, „10.08 Sklep Anny B
  30,00 zł” (30 zł z 20.08 spłaciło 30 z 40 zł najstarszego, nie pasujący zakup 30 zł), tak samo przed i po. Po wpłacie:
  „spłaca 100,00 zł · Anna teraz: ma oddać 190,00 zł … do przypisania 100,00 zł”, zakupy dalej „do oddania” 50 / 80 / 120;
  Radar „Anna ma oddać 190,00 zł … zwrot do przypisania: 100,00 zł – wskaż zakupy w Meldunkach”; Meldunki „Anna: zwrot
  100,00 zł z 03.11 – wskaż, które zakupy spłaca (do oddania: 5 zakupów). Przypisz”; Osłony 12 880,00 → 12 980,00. Po
  wskazaniu: „spłaca: 15.09 Piekarnia Anny 50,00 zł, 02.11 Drogeria Anny 50,00 zł”; Piekarnia „Anna: oddane 50,00 zł ↳
  03.11 Anna przelew 100 · 50,00 zł”, Drogeria „Anna: oddane 50,00 z 120,00 zł · do oddania 70,00 zł”, Apteka „do
  oddania 80,00 zł”; Osłony 12 980,00 (bez drugiej zmiany), Anna 190,00 zł, pozycja w Meldunkach znika.
- Oczekiwane: przed wskazaniem 100 mniej bez „oddane”, po wskazaniu statusy zgodne z kwotami, osłony +100 raz, dawne
  zwroty bez zmian (punkt).
- Zrzut: DM.4-edytor.png, DM.4-radar.png, DM.4-meldunki.png, DM.4-wskazanie.png.

### DM.5 – ZGODNE
- Stan: rok + „A. Testowa”; Tata (reszta: pytaj) ma oddać 100,00 zł – „Sklep Taty” 20.10.2026; Babcia (pytaj, bez
  długu) do szybkiego wpisu; przebieg dm-d, 15:53–15:55; dokowanie z dziś – przebieg dm-d2, 15:56 (Tata „przychód”, bez
  długu, wpłata 120,00 zł z dziś).
- Zrobione: wpływ 300,00 zł 28.10.2026 od Taty → „Reszta ponad to, co ma oddać: zaliczka”; Ustawienia → Domownicy;
  wpływ 150,00 zł 29.10 (bez wyboru); Ustawienia → Tata „przychód”; wpływ 120,00 zł 30.10; wpływ 60,00 zł 31.10 z
  „zaliczka”; szybki wpis: Wpływ 40,00 zł od Babci bez wyboru → Enter.
- Widać: przy osobie „pytaj” edytor pokazuje „Reszta ponad to, co ma oddać: [przychód] zaliczka” z zaznaczonym
  „przychód” i „spłaca 100,00 zł · przychód 200,00 zł”; po „zaliczka” – „spłaca 100,00 zł · zaliczka 200,00 zł · Tata
  teraz: zaliczka 200,00 zł”, Depozyt domowników 4 797,20 → 4 997,20 zł, Osłony 12 900,00 → 13 000,00, Ustawienia „Tata:
  zaliczka”. Druga wpłata – zaznaczone „zaliczka”, „zaliczka 150,00 zł”, Depozyt 5 147,20. Trzecia przy „przychód” –
  „przychód 120,00 zł”, „Praca i inne” 7 500,00 → 7 540,00 / 7 520,00 / 7 510,00 zł (3/6/12 mies.), październik „Bilans
  paliwa” +6 086,81 → +6 206,81 zł; w dm-d2 (wpłata z dziś) Osłony 13 000,00 → 13 120,00 zł i listopad „Bilans paliwa”
  −12,00 → +108,00 zł (dokuje do osłon i jest przychodem). Czwarta – „zaliczka 60,00 zł”, Ustawienia dalej „przychód”.
  Szybki wpis: „Od: Babcia – 40,00 zł jako przychód (dokuje).”, po zapisie Babcia dalej „pytaj”. Zaliczki nie ruszają
  „Przychodów” (7 500,00 po wpłatach 300 i 150).
- Oczekiwane: 100 spłaca, 200 do depozytu, Tata „zaliczka”, druga bez pytania, „przychód” dokuje i jest przychodem,
  pojedyncza wpłata inna niż ustawienie, szybki wpis nie zmienia ustawienia (punkt).
- Spostrzeżenia (nie werdykt): „pytaj” nie wygląda jak pytanie – „przychód” jest już zaznaczony i wpłata zapisana
  („zapisano 15:53:10”), zanim kapitan wybierze; 100 zł z wpłaty 300 zł zostaje „do przypisania 100,00 zł” (Meldunek), choć
  Tata ma jeden zakup na 100 zł („Tata teraz: rozliczony”, zakup dalej „do oddania”).
- Zrzut: DM.5-pytanie.png, DM.5-zaliczka.png, DM.5-druga.png, DM.5-przychod.png, DM.5-szybki.png, DM.5-ustawienia.png.

### DM.6 – ZGODNE
- Stan: jak DM.3 po wpłacie 80 zł (Anna ma oddać 170,00 zł: 50 z 15.09 i 120 z 02.11); przebieg dm-b2, 15:49–15:50
  (wpłaty z dziś); wcześniej przebieg dm-b, 15:45–15:46 (te same wpłaty z datą 30.10.2026).
- Zrobione: wpływ 200,00 zł od Anny → „Cel wpłaty: niezależny przychód”; wpływ 100,00 zł → „depozyt na przyszłość”;
  wpływ 50,00 zł („spłata zakupów” – domyślnie); w podziale wpłaty („podziel na osoby”) część Anny.
- Widać (dm-b2): 200 – „Niezależny przychód do budżetu od Anna – nie spłaca zakupów, dług domownika pozostaje bez
  zmian.”, „przychód 200,00 zł · Anna teraz: ma oddać 170,00 zł”; Anna 170,00 bez zmian, Osłony 12 960,00 → 13 160,00
  (dostawa), listopad „Bilans paliwa” −12,00 → +188,00 zł. 100 – „Zaliczka na przyszłe zakupy od Anna – zasila depozyt,
  nie spłaca dotychczasowych zakupów.”, Depozyt domowników 4 797,20 → 4 897,20 zł, Anna 170,00. 50 – „spłaca: 15.09
  Piekarnia Anny 50,00 zł”, Anna 120,00, Osłony +50,00. Część wpłaty ma „Cel części domownika: spłata / przychód /
  zaliczka”; w imporcie przełącznik „spłata / niezależny przychód / zaliczka” – IM.23.
- Oczekiwane: „niezależny przychód” – dług bez zmian, przychód i dostawa; „depozyt na przyszłość” – depozyt +100, dług
  bez zmian; „spłata zakupów” jak DM.3; te same wybory w częściach i imporcie (punkt).
- Spostrzeżenie: z datą 30.10 (dm-b) „depozyt na przyszłość” 100 zł od razu sfinansował późniejszy zakup z 02.11 (D91 f:
  zaliczka idzie sama na najbliższy zakup) – Mostek „Anna ma oddać 70,00 zł”, Depozyt bez zmian, Osłony +100, a edytor tej
  wpłaty mówi „zaliczka 100,00 zł … nie spłaca dotychczasowych zakupów”; zgodne z D91 f, ale z ekranu nie widać, dokąd
  poszła zaliczka. „Niezależny przychód” z 30.10 dokował poza osłony (osłony były wtedy pełne). Wpłata domownika, która
  dokuje, nie zmienia linku „ostatnia dostawa (20.10.2026) – dokąd poszła?” na Mostku.
- Zrzut: DM.6-dzis-niezalezny.png, DM.6-dzis-depozyt.png, DM.6-dzis-splata.png, DM.6-czesc.png (dm-b: DM.6-niezalezny.png,
  DM.6-depozyt.png, DM.6-splata.png).

### DM.7 – ZGODNE
- Stan: rok + „A. Testowa”; Tata (reszta: zaliczka): wpłata 300,00 zł 31.10.2026 „Tata przelew 300” (spłata, reszta
  jako zaliczka), zakupy 50,00 zł 01.11.2026 „Sklep Taty 50” i 280,00 zł 03.11.2026 „Sklep Taty 280”; przebieg dm-e,
  15:54–15:55.
- Zrobione: edytor zakupu 280 → „Przypisz zwrot…” → „31.10 Tata przelew 300 300,00 zł”; edytor wpłaty 300; Mostek,
  Radar.
- Widać: przed – zaliczka poszła sama na najbliższe zakupy: „Sklep Taty 50” „Tata: z zaliczki – nie ma czego oddawać”,
  „Sklep Taty 280” „Tata: do oddania 30,00 zł”, Tata ma oddać 30,00, Osłony 12 970,00. Po przypisaniu: „Tata: oddane
  280,00 zł ↳ 31.10 Tata przelew 300 · 280,00 zł”; „Sklep Taty 50” „Tata: do oddania 30,00 zł” (wolne 20 zł zaliczki +
  30 zł z osłon); Tata ma oddać 30,00 („od 01.11”), Depozyt 4 797,20 i Osłony 12 970,00 bez zmian; edytor wpłaty „Za co
  oddaje Tata: 01.11 Sklep Taty 50 50,00 zł · 03.11 Sklep Taty 280 280,00 zł · spłaca: 03.11 Sklep Taty 280 280,00 zł”.
- Oczekiwane: 280 „oddane” tą wpłatą, rezerwa nie dla zakupu 50, osłony nie pożyczają na 280, reszta 20 zł zaliczką
  (punkt; zużyta przez zakup 50 – punkt to dopuszcza: „pożycza z osłon albo z wolnej zaliczki”).
- Zrzut: DM.7-przypisz.png, DM.7-oddane.png, DM.7-wplata.png.

### DM.8 – ZGODNE
- Stan: rok + „A. Testowa”; czysta „Anna” (reszta: przychód): wpłaty 100,00 zł 20.09.2026 „Anna przelew wrzesień” (M-2)
  i 30,00 zł 05.10.2026 „Anna przelew październik” (spłata, nic do oddania – reszta przychodem), zakup 80,00 zł
  15.10.2026 „Apteka Anny” (M-1); przebieg dm-f, 15:56.
- Zrobione: edytor „Apteka Anny” → „Przypisz zwrot…” → „20.09 Anna przelew wrzesień”; Raporty → Debriefing wrzesień
  i październik przed i po.
- Widać: lista „05.10 Anna przelew październik 30,00 zł”, „20.09 Anna przelew wrzesień 100,00 zł z przychodu 2026-09 –
  zmieni przychód zamkniętego miesiąca” (od najnowszej daty); po wyborze „Anna: oddane 80,00 zł ↳ 20.09 Anna przelew
  wrzesień · 80,00 zł”, Anna znika z Rozliczeń. Wrzesień „Koszty netto 7 548,47 zł” przed i po („Bilans paliwa”
  +2 051,53 → +1 971,53 – przychód września −80, jak zapowiada dopisek); październik „Koszty netto 5 413,19 zł” przed i po.
- Oczekiwane: wpłata z zamkniętego miesiąca na liście, w kolejności dat, rozlicza zakup; koszty M-2 i M-1 bez zmian
  (punkt).
- Spostrzeżenie: wpłata z 05.10 (też zamknięty miesiąc – październik) nie ma dopisku „zmieni przychód zamkniętego
  miesiąca”, choć jej przypisanie też zmieniłoby przychód października.
- Zrzut: DM.8-lista.png, DM.8-oddane.png.

### DM.9 – ZGODNE
- Stan: rok + „A. Testowa”; Tata (reszta: zaliczka) ma oddać 100,00 zł – „Sklep Taty” 21.10.2026; Babcia (pytaj,
  „Pieniądze przekazuje przez: Tata”) ma oddać 150,00 zł – „Apteka Babci” 25.09.2026 – i kupuje jeszcze po wpłacie
  50,00 zł „Kwiaciarnia Babci” 01.11.2026 (dług dziś 200, przed wpłatą z 28.10 – 150); przebiegi dm-g1 (z kliknięciem)
  i dm-g2 (bez kliknięcia, szybki wpis), 15:56–15:58.
- Zrobione: wpływ 250,00 zł 28.10.2026 od Taty → „+ także za Babcia” (dm-g1); ten sam wpływ bez kliknięcia (dm-g2),
  potem szybki wpis: Wpływ 150,00 zł od Taty, „W tym za Babcia” 150,00 → Enter; Radar, odprawa.
- Widać: przycisk „+ także za Babcia (ma oddać 150,00 zł)” (dług sprzed wpłaty, nie dzisiejsze 200). Z kliknięciem:
  część „150,00 Babcia”, „Reszta 100,00 zł – Tata.”, „Babcia: spłaca 150,00 zł · Tata: spłaca 100,00 zł · Tata teraz:
  rozliczony”; Mostek – Tata bez długu, Babcia 50,00 zł (tylko zakup z 01.11). Bez kliknięcia: „spłaca 100,00 zł ·
  zaliczka 150,00 zł · Tata teraz: zaliczka 150,00 zł”, Babcia dalej 200,00, Depozyt 4 797,20 → 4 947,20. Szybki wpis:
  „W tym za Babcia ma oddać 200,00 zł”, podgląd „Od: Tata. W tym za: Babcia – wyrównuje 150,00 zł (ma oddać 200,00 zł).”,
  zakup z 25.09 oddany (Babcia 50,00 od 01.11). Radar „Babcia ma oddać … najstarszy zakup z 25.09.2026 (39 dni) ·
  przekazuje przez: Tata”, odprawa „Babcia: do oddania 200,00 zł – najstarszy zakup z 25.09 (39 dni) – przekazuje przez:
  Tata.”.
- Oczekiwane: z kliknięciem 150 Babcia, 100 Tata; bez kliknięcia całość Taty (100 spłata, 150 według ustawienia) – nic
  samo; kwota przy „+ także za” sprzed wpłaty; „przekazuje przez: Tata” na Radarze i w przypomnieniu (punkt).
- Spostrzeżenie: po podziale części nie wiążą się same z pasującymi zakupami (edytor pokazuje „Pasuje: 25.09 Apteka
  Babci” i „Pasuje: 21.10 Sklep Taty”, ale zostaje „do przypisania 150,00 zł” i „100,00 zł”) – Radar „zwrot do
  przypisania … – wskaż zakupy w Meldunkach” przy obu osobach; przy jednej osobie (DM.3) i w szybkim wpisie pewne
  dopasowanie zaznacza się samo (D91 b).
- Zrzut: DM.9-przycisk.png, DM.9-po-kliknieciu.png, DM.9-radar.png, DM.9-bez-klikniecia.png, DM.9-szybki.png.

### DM.10 – UWAGA
- Stan: rok + „A. Testowa”; Anna (reszta: zaliczka) ma oddać 150,00 zł – „Sklep Anny 150” 20.10.2026; Tata (reszta:
  przychód) ma oddać 120,00 zł – „Sklep Taty 120” 21.10.2026; przebieg dm-h, 15:58.
- Zrobione: wpływ 300,00 zł 29.10.2026 „Anna przelew 300” od Anny → „podziel na osoby” → część Tata 120,00; lista
  Operacji; drugi wpływ 50,00 zł 30.10 od Anny z częścią Taty 80,00 (ponad kwotę).
- Widać: „Reszta 180,00 zł – Anna.”, „Tata: spłaca 120,00 zł · Anna: spłaca 150,00 zł · zaliczka 30,00 zł · Tata teraz:
  rozliczony · Anna teraz: zaliczka 30,00 zł”; Mostek „Anna zaliczka – czeka na wydatki 30,00 zł”, Tata bez długu,
  Depozyt 4 797,20 → 4 827,20. Lista Operacji: „29.10 czw 15:58 Anna przelew 300 mBank **od: Tata, Anna** +300,00”. Ponad
  kwotę: „Części przekraczają kwotę o 30,00 zł.” i rozliczenie „Tata: przychód 50,00 zł” (część ucięta do 50, suma = kwota
  wpłaty; Tata bez długu, więc według ustawienia – przychód).
- Oczekiwane: część Taty spłaca Tatę, reszta 180 Anny, każda część: spłata, potem zaliczka albo przychód; części ponad
  kwotę ucięte z komunikatem – spełnione; lista „od: Anna, Tata” – na liście najpierw część (Tata), potem nadawca (Anna).
- Uwaga (tekst): kolejność „od: Tata, Anna” odwraca nadawcę przelewu i osobę z części. Reguła importu z podziałem i
  podgląd w imporcie – AU-4: IM.25 (NIEZGODNE S – „+ w tym za …” przy pojedynczej wpłacie nie działa), nie dubluję.
  Części po podziale nie wiążą się same z pasującymi zakupami – jak w DM.9 (spostrzeżenie).
- Zrzut: DM.10-podzial.png, DM.10-lista.png, DM.10-ponad.png.

### DM.11 – NIEZGODNE (S)
- Stan: rok + „A. Testowa”; Anna (reszta: zaliczka, bez salda); Tata (reszta: zaliczka) z zaliczką 20,00 zł – wpłata
  28.10.2026 „Tata zaliczka 20”; przebiegi dm-i1 (wspólnie) i dm-i2 (prezent), 15:58–16:00.
- Zrobione: Operacje → wydatek 100,00 zł „Sklep wspólny”, Jedzenie → „Wspólnie” → ja, Anna, Tata „równo”; „procenty”
  50 / 30 / 10; 50 / 30 / 20; kwota 90; „kwoty”; „równo” przy 90; w drugim przebiegu wydatek 60,00 zł „Kwiaciarnia
  prezent” → „prezent od: Tata”.
- Widać: równo 100 – „33,33 zł / 33,33 zł / 33,34 zł”, „Anna: pożyczone z osłon 33,33 zł (ma oddać)”, „Tata: z zaliczki
  20,00 zł · pożyczone z osłon 13,34 zł (ma oddać)”, energia dziś 77,28 → 43,95 zł (−33,33 – moja część). Procenty 50 /
  30 / 10: „razem 90 % – ostatnia osoba bierze resztę do 100 %”, części „50,00 zł / 30,00 zł / 20,00 zł” (przy polu „10 %”
  kwota 20,00 zł) i **zapisane** („zapisano 15:59:22”, w pliku `share.mode: percent`, linie 50 / 30 / 10, części −50 / −30
  / −20; Operacje „Koszty 50,00 zł”). 50 / 30 / 20 → 50 / 30 / 20; kwota 90 → „45,00 zł / 27,00 zł / 18,00 zł”; „kwoty” –
  „ja reszta 45,00 zł”, 27,00, 18,00; równo 90 → 30 / 30 / 30, energia 47,28 (77,28 − 30), koperta Jedzenie „42,00 / 1 600,00
  zł” (12 + 30), Anna ma oddać 30,00, Tata 10,00 (20 z zaliczki), Osłony 13 000,00 → 12 960,00. Prezent: „Tata: z zaliczki
  20,00 zł · prezent – z osłon 40,00 zł (nikt nic nie jest winien)”, energia 77,28 bez zmian, Depozyt −20, Osłony −40,
  „Domownicy mają oddać razem 360,00 zł” bez zmian.
- Oczekiwane: „procenty ≠ 100 % – ostrzeżenie, zapis niemożliwy” (punkt) – edytor Operacji ostrzega, ale zapisuje podział
  (ostatnia osoba dostaje resztę do 100 %); szybki wpis odmawia („Procenty osób muszą dać razem 100 %.” – SW.14), zmiana
  zbiorcza blokuje przycisk, import odmawia (IM.25). Reszta punktu zgodna (podział z resztą w ostatniej części, moja część
  to energia i koszt, nowa kwota przelicza części, prezent bez długu i bez energii).
- Kroki: Operacje → Ctrl+N → 100 zł → kategoria → „Wspólnie” → osoby: ja, Anna, Tata → „procenty” → 50, 30, 10 (Enter
  w każdym polu) → plik operacji ma podział 50 / 30 / 20 bez żadnej odmowy.
- Zrzut: DM.11-rowno.png, DM.11-procenty.png, DM.11-90.png, DM.11-kwoty.png, DM.11-prezent.png.

### DM.12 – ZGODNE
- Stan: rok + „A. Testowa”; Babcia (pytaj) z zakupami sprzed 01.09.2026: 120,00 zł 10.08.2026 „Apteka Babci” i 180,00 zł
  20.08.2026 „Sklep Babci” (ma oddać 300,00); Tata (przychód, bez długu) z wpłatami 200,00 zł 25.08, 100,00 zł 15.09,
  150,00 zł 29.10.2026; w oknie Ustawienia → Domownicy „od dziś”, potem „Rozliczenia od” 01.09.2026 (= stan punktu);
  przebiegi dm-j (16:00–16:03) i dm-j2 (16:13, czysta próba „Cofnij” – jeden toast na ekranie).
- Zrobione: „Rozliczenia od” 01.10.2026 (później) → „Cofnij”; 01.12.2026 (przyszłość); 01.08.2025 (przed startem);
  „od startu budżetu”; „Na start rozliczeń” przy osobach; panel „Przychody”.
- Widać: od 01.09 – toast „Saldo na start rozliczeń przeliczone – A. Testowa: zaliczka 3 608,33 zł (było zaliczka
  4 377,20 zł), Kasia: zaliczka 480,00 zł (było zaliczka 360,00 zł), Marek: ma oddać 360,00 zł (było ma oddać 300,00 zł).
  Cofnij”; Babcia „Na start rozliczeń: ma oddać 300,00”, Radar „Babcia ma oddać 300,00 zł saldo na start rozliczeń z
  10.08.2026 (85 dni)”; salda osób jak przed (A. Testowa 4 377,20, Kasia 360,00, Babcia 300,00); „Praca i inne” 7 650,00
  (od startu) → 7 583,33 zł (bez 200 zł z 25.08). 01.10 – „Saldo na start rozliczeń przeliczone – A. Testowa: zaliczka
  3 947,06 zł (było zaliczka 3 608,33 zł), Kasia: zaliczka 360,00 zł (było zaliczka 480,00 zł), Marek: ma oddać 300,00 zł
  (było ma oddać 360,00 zł). Cofnij”, „Praca i inne” 7 550,00 (bez 100 zł z 15.09); „Cofnij” (dm-j2) – „Rozliczenia od”
  znów 01.09.2026, Marek 360,00, Depozyt 4 797,20, Przychody 7 583,33. 01.12.2026 – „Rozliczenia nie mogą zaczynać się w
  przyszłości.”, data bez zmian. 01.08.2025 – „Data sprzed startu budżetu – rozliczenia liczą się od startu (01.09.2025).”,
  salda jak od startu, Przychody 7 650,00. „od startu budżetu” – „Rozliczenia od: startu budżetu (01.09.2025)”, salda bez
  zmian (toastu nie ma – nic się nie przeliczyło).
- Oczekiwane: toast z „Cofnij”, salda nie liczone drugi raz, komunikat przyszłej daty, dopisek daty sprzed startu,
  przelewy sprzed daty nie są przychodem, „Cofnij” przywraca saldo i datę (punkt).
- Spostrzeżenie (powiązane z P.3 / IM.23): Marek persony jednocześnie „ma oddać 360,00 zł” i ma 60 zł zaliczki (ukrytej –
  Mostek pokazuje tylko dług). Saldo na start jest jednostronne, więc przy dacie 01.10 i „od dziś” dług i zaliczka się
  znoszą: Marek „ma oddać 300,00 zł”, Depozyt domowników 4 797,20 → 4 737,20 zł – to, co widać przy osobie, zależy od
  dnia rozliczeń (nie jest to liczenie dwa razy).
- Zrzut: DM.12-od-0109.png, DM.12-pozniej.png, DM.12-cofnij-toast.png, DM.12-po-cofnij.png, DM.12-przyszlosc.png,
  DM.12-przed-startem.png, DM.12-od-startu.png.

### DM.13 – ZGODNE
- Stan: rok + „A. Testowa”; Babcia (pytaj, „Pieniądze przekazuje przez: Tata”) z saldem na start „ma oddać 300,00 zł”
  (bez operacji; rozliczenia od startu budżetu); Tata (reszta: zaliczka) bez długu; przebieg dm-k, 16:03.
- Zrobione: wpływ 300,00 zł (dziś) „Tata przelew 300” od Taty → „+ także za Babcia (ma oddać 300,00 zł)” → część Babci
  300,00 → „Za co oddaje Babcia” → „saldo na start rozliczeń (01.09)”; Mostek, Radar.
- Widać: przed – Radar „Babcia ma oddać 300,00 zł saldo na start rozliczeń z 01.09.2025 (428 dni) · przekazuje przez:
  Tata”. W edytorze „Reszta 0,00 zł – Tata.”, „Babcia: spłaca 300,00 zł · Babcia teraz: rozliczony”, „Za co oddaje Babcia:
  saldo na start rozliczeń (01.09) 300,00 zł · Pasuje: saldo na start rozliczeń (01.09) · do przypisania 300,00 zł”, po
  zaznaczeniu „spłaca: saldo na start rozliczeń (01.09) 300,00 zł” (w pliku `coversOpening: true`). Po: Babci nie ma w
  Rozliczeniach ani na Radarze (0), Tata bez salda, Osłony 13 000,00 → 13 300,00, Depozyt bez zmian.
- Oczekiwane: dług otwarcia Babci 0, „saldo na start rozliczeń” znika, Tata bez zmian (punkt).
- Zrzut: DM.13-edytor.png, DM.13-radar.png.

### DM.14 – ZGODNE
- Stan: rok + „A. Testowa”; Anna (reszta: zaliczka): „SKLEP TESTOWY” 120,00 zł 20.10.2026 nieoddany, „SKLEP TESTOWY”
  60,00 zł 10.10.2026 oddany wpłatą 60,00 zł 12.10.2026 „Anna przelew 60” (wskazuje go); przebieg dm-l, 16:04; zakup
  oddany bez innych otwartych – przebieg dm-l2, 16:12 (tylko zakup 60 zł oddany).
- Zrobione: Operacje → wydatek → „zwrot towaru” 40,00 zł, „SKLEP TESTOWY”, Jedzenie · zakupy spożywcze, „Zwrot dla:
  finansuje: Anna” → „Zwrot do zakupu Anna” → 20.10; drugi zwrot 20,00 zł do zakupu oddanego.
- Widać: dopisek „Zwrot towaru: ujemny wydatek tej samej kategorii.”, podpowiedź „Pasuje: 20.10 SKLEP TESTOWY” (ten sam
  kontrahent), po wskazaniu „spłaca: 20.10 SKLEP TESTOWY 40,00 zł”; Anna ma oddać 120,00 → 80,00 zł, Osłony +40,00,
  energia 77,28 bez zmian, listopad „Koszty netto 12,00 zł” przed i po. Zwrot do zakupu oddanego, gdy nic innego nie jest
  otwarte (dm-l2): „Anna: do zaliczki 20,00 zł”, „Zwrot do zakupu Anna: Anna nie ma zakupów do oddania.”, Mostek „Anna
  zaliczka – czeka na wydatki 20,00 zł”, Depozyt 4 797,20 → 4 817,20, koszty i energia bez zmian.
- Oczekiwane: zwrot to pieniądze Anny (80 zł), moje koszty bez zmian, podpowiedź kontrahenta, przy zakupie oddanym
  reszta jako zaliczka (punkt).
- Spostrzeżenie: lista „Zwrot do zakupu” pokazuje tylko otwarte zakupy – zwrotu nie da się wskazać do zakupu już
  oddanego; gdy osoba ma inny otwarty zakup (dm-l), zwrot 20 zł z zakupu oddanego staje się „zwrotem do przypisania”
  i zmniejsza dług (80 → 60, Radar „zwrot do przypisania: 20,00 zł”), a nie zaliczką.
- Zrzut: DM.14-podpowiedz.png, DM.14-zwrot.png, DM.14-zwrot-oddanego.png, DM.14-zwrot-oddanego-sam.png.

### DM.15 – ZGODNE
- Stan: rok + „A. Testowa”; Anna (zaliczka) – zakupy 70,00 zł 29.09.2026 (35 dni) i 40,00 zł 01.10.2026 (33 dni); Tata
  – zakup 90,00 zł 14.10.2026 (20 dni); Babcia (przekazuje przez: Tata) – saldo na start 300,00 zł; przebieg dm-m,
  16:05–16:06. Saldo Babci z datą sprzed 40 dni – przebieg dm-m2 (16:13): zakup Babci 300,00 zł 24.09.2026, w oknie „od
  dziś” → „Rozliczenia od” 01.10.2026 (Babcia „Na start rozliczeń: ma oddać 300,00” z datą zakupu).
- Zrobione: Mostek → odprawa; Radar → „Należności”; wpłata Anny 70,00 zł (pewne dopasowanie – najstarszy zakup); nowy
  zakup Anny 25,00 zł dziś.
- Widać: odprawa (dm-m2) „Babcia: do oddania 300,00 zł – saldo na start rozliczeń z 24.09 (40 dni) – przekazuje przez:
  Tata.”, „Anna: do oddania 110,00 zł – saldo na start rozliczeń z 29.09 (35 dni).”, bez Taty; Radar „Babcia ma oddać
  300,00 zł saldo na start rozliczeń z 24.09.2026 (40 dni) · przekazuje przez: Tata” w akcencie, „Tata ma oddać 90,00 zł
  najstarszy zakup z 14.10.2026 (20 dni)” bez akcentu. W dm-m: odprawa „Anna: do oddania 110,00 zł – najstarszy zakup z
  29.09 (35 dni).”; po spłacie najstarszego „Anna: do oddania 40,00 zł – najstarszy zakup z 01.10 (33 dni).” (Radar
  „najstarszy zakup z 01.10.2026 (33 dni)” w akcencie); po nowym zakupie „Anna: do oddania 65,00 zł – najstarszy zakup z
  01.10 (33 dni).” – licznik się nie odnawia; Tata (20 dni) nigdy w odprawie.
- Oczekiwane: pozycje odprawy dla Anny i Babci („saldo na start rozliczeń”, „przekazuje przez: Tata”), nie dla Taty; dni
  w akcencie powyżej 30; po spłacie od następnego otwartego; nowy zakup nie odnawia (punkt). W dm-m saldo Babci wpisane
  w `fi.json` z datą 24.09.2026 przy rozliczeniach od startu budżetu (01.09.2025) – aplikacja liczy je od 01.09.2025
  („428 dni”); data zakupu późniejsza niż początek rozliczeń jest sprzeczna (błąd mojego stanu), dlatego dm-m2 buduje
  saldo na start przez okno.
- Zrzut: DM.15-odprawa.png, DM.15-radar.png, DM.15-radar-po.png, DM.15-babcia-40-dni.png.

### DM.16 – poza laboratorium (Maszyna); część z danych z przeszłości – ZGODNE
- Zakres w laboratorium (przebieg dm-m, 16:05–16:08, stan jak DM.15): zapis powiadomień Windows (`recorded(app).toasts`),
  Ustawienia → Powiadomienia i dźwięki → „Domownik nie oddał za zakupy – po 30 dniach od najstarszego”, dwa restarty.
  Poza zakresem (maszyna): kliknięcie powiadomienia, zegar przesunięty na 31. dzień i kolejne dni.
- Widać: po starcie trzy „Rozliczenie z domownikiem”: „Babcia: do oddania 300,00 zł – saldo na start rozliczeń z 01.09
  (428 dni) – przekazuje przez: Tata.”, „Marek: do oddania 360,00 zł – najstarszy zakup z 20.08 (75 dni).”, „Anna: do
  oddania 110,00 zł – najstarszy zakup z 29.09 (35 dni).” – po jednym na osobę, kwoty jak na Radarze, Tata (20 dni) bez
  powiadomienia; po spłacie najstarszego zakupu Anny jedno nowe „Anna: do oddania 40,00 zł – najstarszy zakup z 01.10
  (33 dni).” (nowy najstarszy zakup), nowy zakup Anny nic nie dodaje. Wyłączone + restart z nowym przypadkiem (zakup Taty
  20.09, 44 dni) – brak powiadomień; po włączeniu tylko „Tata: do oddania 135,00 zł – najstarszy zakup z 20.09 (44 dni).”;
  kolejny restart – nic się nie powtarza.
- Zrzut: DM.16-wylaczone.png.

### DM.17 – ZGODNE
- Stan: rok + pożyczki z DM.18 / DM.19 (nagłówek `tests/audyt/dm-n.spec.ts`); przebieg dm-n, 16:08.
- Zrobione: Radar → „Nowa pożyczka”: „Pożyczam komuś”, Nazwa „Pożyczka dla Kuby”, „Komu pożyczasz” JAKUB TESTOWY, Kwota
  1 000, data dziś, mBank, Raty 3, pierwsza 31.12.2026 → „Zapisz pożyczkę”; Mostek, Radar, Operacje, Raporty.
- Widać: pola „Do spłaty razem” przy „Pożyczam komuś” nie ma (tylko przy „Biorę pożyczkę”); toast „Pożyczka „Pożyczka
  dla Kuby” zapisana – 3 raty na radarze.”; raty w pliku 31.12.2026 333,33 / 31.01.2027 333,33 / 28.02.2027 333,34
  (luty – ostatni dzień); Radar „31.12 spłata Spłata: Pożyczka dla Kuby JAKUB TESTOWY +333,33 zł”, „31.01 … +333,33 zł”
  (28.02 poza 90 dniami), wiersz „Pożyczka dla Kuby UDZIELONA 1 000,00 zł … następna 31.12.2026: 333,33 zł”; Osłony
  13 200,00 → 12 200,00 (−1 000); „Pożyczki udzielone” 2 800,00 → 3 800,00 zł; Operacje „03.11 wt JAKUB TESTOWY mBank
  Pożyczka −1 000,00”; listopad „Koszty netto 12,00 zł” i „Bilans paliwa −12,00 zł” przed i po; Przychody bez zmian.
- Oczekiwane: toast, raty 333,33 / 333,33 / 333,34, rata w ostatnim dniu krótszego miesiąca, −1 000 z osłon, należność
  +1 000, nie koszt, nie przychód (punkt).
- Zrzut: DM.17-formularz.png, DM.17-radar.png.

### DM.18 – NIEZGODNE (K)
- Stan: rok + (mBank) „Pożyczka dla Oli” udzielona 1 000,00 zł 30.09.2026 (wypływ −1 000,00), raty 350,00 zł 30.10,
  30.11, 30.12.2026 (razem 1 050,00 – 50,00 odsetek; formularz Radaru nie ma „Do spłaty razem” dla „Pożyczam komuś”, więc
  pożyczka zapisana w pliku), pierwsza rata 4 dni po terminie; „Pożyczka dla Igi” 500,00 zł, rata 02.11 (1 dzień po
  terminie); „Pożyczka dla Zosi” 300,00 zł, rata 31.10 (3 dni); operacja „Pożyczka” +200,00 zł 02.11 „Zwrot od kolegi”
  bez pożyczki z Radaru; przebieg dm-n, 16:08–16:10.
- Zrobione: Radar → „Pożyczka dla Oli” → „spłata otrzymana” → „Zapisz” trzy razy (kwota podpowiadana: 350,00); znaczki
  i oś Radaru; Raporty → Debriefing listopad; edytor „Zwrot od kolegi” przy 5 otwartych pożyczkach udzielonych i przy
  jednej (po zamknięciu Zosi, Tomka i Kuby, Ola spłacona).
- Widać: przed – Ola „SPÓŹNIONA SPŁATA”, oś „30.10 spłata Spłata: Pożyczka dla Oli spóźniona spłata +350,00 zł”, Zosia
  (3 dni) „spóźniona spłata”, Iga bez znaczka, oś „02.11 spłata Spłata: Pożyczka dla Igi po terminie 1 dzień +500,00 zł”.
  Wiersz Oli „oddane 0,00 zł z 1 000,00 zł”. Spłaty: „Spłata 350,00 zł zapisana.” ×3; Osłony 12 200,00 → 12 550,00 →
  12 900,00 → **13 250,00** (trzecia spłata +350,00, choć długu zostało 300,00); „Pożyczki udzielone” 3 800,00 → 3 450,00
  → 3 100,00 → 2 800,00; listopad „Bilans paliwa (przychód − koszty netto) −12,00 zł” przed i po każdej spłacie – **50 zł
  odsetek nie jest przychodem**; wiersz Oli na końcu „UDZIELONA 0,00 zł … oddane 1 050,00 zł z 1 000,00 zł”. Edytor
  „Zwrot od kolegi”: „Bez pożyczki z Radaru liczy się tylko w osłonach (nie jako przychód ani należność).”; „zwrot
  pożyczki „Pożyczka dla Igi”? przypisz” pojawia się dopiero, gdy otwarta jest jedna pożyczka udzielona – w stanie punktu
  (kilka otwartych) podpowiedzi nie ma.
- Oczekiwane: „spłaty wracają do osłon do wysokości długu, nadwyżka 50 zł (odsetki) jest przychodem” (punkt; T70
  „nadwyżka (odsetki) dokuje jako przychód”) – nadwyżka trafia do osłon jak spłata, przychód i bilans paliwa miesiąca
  bez 50 zł (warstwy się zgadzają, liczby przychodu – nie). Do tego „edytor … podpowiada „zwrot pożyczki …? przypisz”” –
  tylko przy jednej otwartej pożyczce (osobno: N). Reszta zgodna: „po terminie 1 dzień”, „spóźniona spłata” od 3. dnia,
  należność maleje o spłatę, wpływ bez pożyczki tylko w osłonach.
- Potwierdzone drugim przebiegiem tylko przez okno (dm-n3, 16:17, sam `rok`): Radar → „Nowa pożyczka” „Pożyczam komuś”
  „Pożyczka dla Oli” 1 000 zł (1 rata) → „spłata otrzymana” 1 050,00 zł → „Spłata 1 050,00 zł zapisana.”; Osłony
  12 000,00 → 13 050,00 zł (+1 050), „Pożyczki udzielone” 2 000,00 → 1 000,00 zł, listopad „Bilans paliwa −12,00 zł”
  przed i po, wiersz „oddane 1 050,00 zł z 1 000,00 zł”.
- Kroki: Radar → „Nowa pożyczka” → „Pożyczam komuś”, 1 000 zł → „Zapisz pożyczkę” → „spłata otrzymana” → kwota 1 050 →
  „Zapisz” → Raporty → Debriefing → bieżący miesiąc: „Bilans paliwa (przychód − koszty netto)” bez zmian; Mostek: osłony
  +1 050.
- Zrzut: DM.18-radar.png, DM.18-edytor-bez-pozyczki.png, DM.18-edytor-jedna.png, DM.18-nadplata-raport.png.

### DM.19 – ZGODNE
- Stan: jak DM.18 (przebieg dm-n, 16:10–16:11 – po DM.17 i DM.18), w tym zaległe raty pożyczek wziętych: „Kredyt X”
  1 200,00 zł, rata 600,00 zł 31.10.2026 (3 dni po terminie), „Kredyt Y” 600,00 zł, rata 300,00 zł 01.11.2026 (2 dni);
  „zamknij” → „Cofnij” i „usuń” – przebieg dm-n2 (16:14, sam `rok`, pożyczka zrobiona tak samo w oknie).
- Zrobione: Radar → „Nowa pożyczka”: „Biorę pożyczkę”, „Pożyczka od Ewy”, Pożyczkodawca EWA TESTOWA, Kwota 3 000, „Do
  spłaty razem” 2 900 → „Zapisz pożyczkę”; potem 3 150, Raty 6 (pierwsza – podpowiedź 03.12.2026), „Raty jako kontener w
  Ładowni …” (włączone) → „Zapisz pożyczkę”; Mostek („skąd” zasięgu), Ładownia, Raporty; „zamknij” → „Cofnij”; „usuń”.
- Widać: 2 900 – „„Do spłaty razem” nie może być mniej niż kwota pożyczki (puste = kwota).”, nic nie zapisane. 3 150 –
  „Pożyczka „Pożyczka od Ewy” zapisana – 6 rat na radarze.”, raty 6 × 525,00 zł (03.12.2026–03.05.2027); Osłony
  13 250,00 → 16 250,00 zł (+3 000), Kadłub 39 066,30 bez zmian, listopad „Bilans paliwa −12,00 zł” i „Przychody” bez
  zmian; „Dług · pożyczki wzięte – odjęte od zasięgu” 2 300,00 → 5 450,00 zł (+3 150; Radar „Dług (pożyczki wzięte)
  5 450,00 zł”); „skąd”: „Osłony 16 250,00 zł · Kadłub 39 066,30 zł · Dług do spłaty −5 450,00 zł · Paliwo (bez dopływu
  wypłat) 49 866,30 zł · Koszty miesiąca (średnia z 12 mies.) 6 530,87 zł · Zasięg 7,6 mies.” (49 866,30 / 6 530,87 =
  7,64); Ładownia „Rata: Pożyczka od Ewy rata co miesiąc 525,00 zł 525,00 zł/m” (od 2026-12 do 2027-05), masa ładunku
  „31,0% … 2 014,32 zł” przed i po (kontener od grudnia); na osi Radaru jedna „Rata: Pożyczka od Ewy EWA TESTOWA −525,00
  zł” w miesiącu (nie dwa razy). „zamknij” – „Pożyczka „Pożyczka od Ewy” zamknięta – dług znika z Radaru i zasięgu.” +
  „Cofnij”, dług 2 300,00, zasięg 8,1, kontenera nie ma w Ładowni; „Cofnij” (dm-n2) – dług 3 650,00, kontener wraca,
  w pliku `closedAt: null`, kontener `archived: false`. „usuń” – „Ta pożyczka ma operacje – zamknij ją zamiast usuwać.”,
  pożyczka zostaje. Zaległe raty: „Kredyt X WZIĘTA ZALEGŁA RATA” (3 dni), „Kredyt Y” bez znaczka, oś „01.11 rata Rata:
  Kredyt Y po terminie 2 dni”.
- Oczekiwane: osłony +3 000 nie przychód, dług +3 150 na Mostku i Radarze, zasięg odejmuje dług, kontener 525 zł od
  pierwszej do ostatniej raty, komunikat 2 900, zamknięcie zdejmuje kontener i „Cofnij” oddaje, usunięcie odmawia,
  „zaległa rata” po 3 dniach (punkt).
- Zrzut: DM.19-2900.png, DM.19-ladownia.png, DM.19-mostek.png, DM.19-zamknij.png, DM.19-usun.png.

---

## Znaleziska

- **DM.18 (K)** – spłata pożyczki udzielonej ponad jej kwotę (raty 3 × 350 zł przy pożyczce 1 000 zł; także sama
  nadpłata 1 050 zł zapisana w oknie): nadwyżka 50 zł (odsetki) trafia do osłon jak spłata i nie jest przychodem
  (listopad „Bilans paliwa −12,00 zł” przed i po; osłony +350 przy ostatniej racie, choć długu było 300) – wbrew
  punktowi i T70; wiersz „oddane 1 050,00 zł z 1 000,00 zł”.
- **DM.18 (N)** – podpowiedź „zwrot pożyczki „…”? przypisz” w edytorze wpływu „Pożyczka” bez pożyczki pojawia się tylko
  przy jednej otwartej pożyczce udzielonej; w stanie punktu (kilka otwartych) jej nie ma.
- **DM.11 (S)** – edytor Operacji przy „Wspólnie → procenty” 50 / 30 / 10 ostrzega („razem 90 % – ostatnia osoba bierze
  resztę do 100 %”), ale zapisuje podział (ostatnia osoba 20 % przy polu „10 %”); punkt: „zapis niemożliwy”; szybki wpis,
  zmiana zbiorcza i import odmawiają.

## Spostrzeżenia

- **Części wpłaty nie wiążą się same z pewnymi zakupami** (DM.9, DM.10): po „+ także za …” albo „podziel na osoby” edytor
  pokazuje „Pasuje: …” przy każdej osobie, ale zostawia „do przypisania” – Radar i odprawa każą „wskaż zakupy w
  Meldunkach”; przy jednej osobie (DM.3) i w szybkim wpisie „W tym za” (DM.9) pewne dopasowanie wiąże się samo (D91 b
  „wiąże samo”). Do decyzji w AU-11, czy to zamierzone.
- **Wpłata większa niż cały dług nie jest „pewnym dopasowaniem”** (DM.5, DM.9 bez kliknięcia): Tata z jednym zakupem
  100 zł i wpłatą 300 / 250 zł – „Tata teraz: rozliczony”, ale zakup dalej „do oddania”, „do przypisania 100,00 zł” i
  Meldunek do ręcznego przypisania.
- **„pytaj” bez pytania** (DM.5): przy osobie „pytaj” edytor od razu zaznacza „przychód” i zapisuje wpłatę; nic nie
  wyróżnia, że to pytanie, a wybór zostanie zapamiętany tylko po kliknięciu.
- **Zaliczka z wpłaty od razu na późniejszy zakup** (DM.6, wpłata 30.10, zakup 02.11): „depozyt na przyszłość” 100 zł nie
  pojawia się w Depozycie domowników – sfinansował zakup z 02.11 (D91 f), Mostek „Anna ma oddać 70,00 zł”; edytor wpłaty
  mówi „zaliczka 100,00 zł … nie spłaca dotychczasowych zakupów” – nie widać, dokąd poszła.
- **Saldo na start znosi dług i zaliczkę** (DM.12, P.3 / IM.23): Marek persony ma jednocześnie dług 360 zł i 60 zł
  zaliczki; przy rozliczeniach od 01.10 albo „od dziś” widać „ma oddać 300,00 zł” i Depozyt −60, przy 01.09 i od startu –
  360,00. Mostek i Radar przy długu nie pokazują zaliczki tej samej osoby.
- **Zwrot towaru do zakupu oddanego** (DM.14): lista „Zwrot do zakupu” ma tylko otwarte zakupy; gdy osoba ma inny otwarty
  zakup, zwrot z zakupu oddanego zmniejsza jej dług jako „zwrot do przypisania” zamiast iść do zaliczki. Etykieta pola
  przy zwrocie: „Zwrot dla” z opcjami „finansuje: Anna”.
- **Dopisek o zamkniętym miesiącu** (DM.8): przy „Przypisz zwrot…” wpłata z 20.09 ma „z przychodu 2026-09 – zmieni
  przychód zamkniętego miesiąca”, wpłata z 05.10 (październik – też zamknięty) – nie; lista od najnowszej daty.
- **Pożyczka udzielona z odsetkami** (DM.17, DM.18): formularz „Pożyczam komuś” nie ma „Do spłaty razem” – odsetek nie da
  się zapisać przy udzielonej (punkt DM.18 tego wymaga; stan zbudowany w pliku), zostaje nadpłata „spłatą otrzymaną”.
- **„ostatnia dostawa – dokąd poszła?”** (DM.5, DM.6): wpłata domownika, która dokuje (przychód, osłony +200 / +120), nie
  zmienia linku „ostatnia dostawa (20.10.2026)” na Mostku.
- **Lista „od:” przy podziale wpłaty** (DM.10): „od: Tata, Anna” – nadawca (Anna) na końcu.
- **Powiadomienia** (DM.16): „Rozliczenie z domownikiem” raz na osobę i najstarszy zakup; nowy najstarszy (po spłacie)
  daje nowe powiadomienie. Maszyna: kliknięcie, kolejne dni (czy nie wraca codziennie ani po 60 dniach) – poza laboratorium.
- **Narzędzie**: `lab.ts` bez błędów. W moich skryptach dwie próby „Cofnij” trafiły w toast, który już zniknął albo nie
  był ostatni (dm-j, dm-n) – powtórzone czysto w dm-j2 i dm-n2; `innerText` nie zawiera wartości pól dat – data
  „Rozliczenia od” czytana z pola (`inputValue`). Persona `rok` nie ma Taty i Babci, a jej Anna ma 4 377,20 zł zaliczki –
  stany punktów budowane na kopii (opis wyżej).
