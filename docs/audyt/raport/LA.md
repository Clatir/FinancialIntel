# Audyt 1.15.4 – raport LA (Ładownia), blok C, AU-10

- Data: 2026-11-03, przebiegi 15:38–15:54 (czas warszawski), zegar systemu bez zmian (dziś = D = 03.11.2026).
- Wersja: Financial Intel 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4\app`), laboratorium `tests/audyt/lab.ts`.
- Stan danych: persona „rok” (kotwica 2026-11-03, start budżetu 2025-09-01, wygenerowana 03.11.2026 ok. 15:17) i stany
  zbudowane na jej kopii (sekcja „Stany zbudowane”) – kontenery z punktów (TESTNET, „Wywóz śmieci”, „Rata leasingu”,
  „Siłownia” …) persona ma inne albo nie ma ich wcale.
- Skrypty: `tests/audyt/la-a-testnet.spec.ts`, `la-b-okresowe.spec.ts` (przebiegi B i B2), `la-b3-niedobor.spec.ts`,
  `la-b4-dowody.spec.ts`, `la-c1-statusy.spec.ts`, `la-c1b-zaplacone.spec.ts`, `la-c2-straznik.spec.ts`; pomoc i budowa
  stanów `tests/audyt/la-pomoc.ts`. Zrzuty w ekranie 1424×861: `C:\FI-audyt\zrzuty\LA.*.png`, zrzuty tekstów:
  `C:\FI-audyt\przebiegi\la-*\out\`.
- Odczyty liczb: 37 (`C:\FI-audyt\odczyty\la.jsonl`), każdy z migawką folderu danych i ICTTJ
  (`C:\FI-audyt\migawki\la\<punkt>-<n>\dane|ictj`, bez `backups` i `.history`) – 37 migawek.

**Podsumowanie (19 punktów):** ZGODNE 12 · NIEZGODNE 4 (K 0 · W 0 · S 3 · N 1) · LICZBY → AU-9 1 · NIE DO SPRAWDZENIA 1
(LA.12 częściowo – zegar; sprawdzona część ZGODNA) · poza laboratorium 1 (LA.19, maszyna). Liczby z odczytów, których
punkt nie wylicza wprost (Woda w LA.10, resztka zbiornika w LA.11, plan miesięcy w LA.8), idą też do AU-9.

## Stany zbudowane

Wszystkie na kopii `useState('rok', przebieg)`, przed startem, funkcją `build()` z `la-pomoc.ts`. Operacje na koncie
mBank; „import” = rekord z polem `bank` jak z importu 27.10 (`importedAt` 2026-10-27T14:17:29.698Z, wiersze najpóźniej
z 26.10 – w zasięgu pliku), „wpisana” = bez `bank`. Płatności kontenerów z odbiorcą połączone (`containerId`), jak robi
import.

- **A – „rok + TESTNET”** (przebieg `la-a`):
  - 14 operacji z importu −79,00 zł, 15. dnia 2025-09…2026-10, kontrahent „TESTNET SP Z O O”, tytuł „FAKTURA RRRR-MM”,
    kategoria Subskrypcje i łączność · internet, bez kontenera;
  - wpisane: 2025-08-28 −79,00 zł (internet, przed startem budżetu), 2026-10-20 i 2026-11-02 −30,00 zł (Rozrywka i hobby ·
    hobby – koperta codzienna, tytuł „DOLADOWANIE”), 2026-11-02 −79,00 zł (internet);
  - plany 2026-10 i 2026-11: koperta „Subskrypcje i łączność” 150,00 zł (persona jej nie ma).
- **B – „rok + opłaty okresowe”** (`la-b`, `la-b4`):
  - „Wywóz śmieci”: stały, 240,00 zł, co 3 mies., data płatności 20.11.2025 (terminy lis/lut/maj/sie), od 2025-09, Dom ·
    czynsz i opłaty, odbiorca „MPO TESTOWO SP Z O O”; płatności z importu po 240,00 zł: 2025-11-20, 2026-02-20, 2026-05-20,
    2026-08-20 i **2026-10-22** (miesiąc przed terminem 20.11.2026, poprzedni cykl zapłacony);
  - „Woda”: stały, 180,00 zł, co 3 mies., data 15.11.2025, od 2025-09, Dom · media, „AQUANET SA”; płatności 2025-11-14,
    2026-02-16, 2026-05-15 i **2026-10-14** (w sierpniu brak – październikowa to zaległa zapłata cyklu sierpniowego);
  - „OC motocykla”: stały, 600,00 zł, co rok, data 12.10.2025, od 2025-09, Auto · ubezpieczenie, „WARTA SA”; płatności
    2025-10-13 i **2026-10-12** (M-1, w terminie).
- **B2** (`la-b2`): jak B, ale „OC motocykla” zarchiwizowane (`archivedAt` 2026-09-15T10:00:00Z) i bez płatności 2026-10-12.
- **B3** (`la-b3`): jak B + wpisana płatność 2026-11-02 −1 300,00 zł „PZU SA”, Auto · ubezpieczenie, połączona z „OC
  samochodu” persony (zbiornik 1 240,00 zł).
- **C1 – „rok + statusy”** (`la-c1`, `la-c1b`): „Rata leasingu” stały 300,00 zł co miesiąc, dzień 31 (data 31.12.2026), od
  2026-11 (utworzony 01.11.2026), Auto, „LEASING TESTOWY SA”, bez płatności; wpisana płatność 2026-11-02 −1 450,00 zł
  „WSPÓLNOTA MIESZKANIOWA TESTOWA 1” połączona z „Czynsz”; „Telefon Play” – dzień płatności kontenera 25 (było 20;
  historia płaci 20–22).
- **C2 – „rok + strażnik i propozycje”** (`la-c2`): 14 płatności TESTNET jak w A (bez wpisanych) oraz
  - „Siłownia” abonament 120,00 zł, dzień 3, „CALYPSO FITNESS”, Zdrowie · sport; płatności kartą 2025-09-03…2026-08-03 (12),
    brak 03.09 i 03.10.2026;
  - „Audioteka” 19,90 zł, dzień 10; płatności 2025-09-10…2026-09-10 (13), brak 10.10.2026;
  - „Disney+” 23,00 zł, dzień 12; płatności 23,00 zł 2025-09…2026-08, 24,00 zł 2026-09-12 i 2026-10-12;
  - „HBO Max” 29,99 zł, dzień 18; płatności 29,99 zł 2025-09…2026-09, 39,99 zł 2026-10-18 (jedna w nowej cenie);
  - „Prąd” persony: cykl co miesiąc, kwota 200,00 zł (było 210,00 zł co 2 mies.), „Kwota zmienna”; dopisane płatności
    TAURON: 2025-10-20 168,40; 2025-12-22 241,50; 2026-02-20 255,30; 2026-04-20 160,20; 2026-06-22 158,90; 2026-08-20
    231,40; 2026-10-20 231,40 (z personą 12 płatności 11.2025–10.2026, 150–260 zł; 75. percentyl 231,40 → 232 zł);
  - bez kontenera: „AQUA-SERWIS FILTRY” 89,00 zł co 2 mies. (2026-02-09, 04-09, 06-09, 08-10, 10-09), „STREFA PARKOWANIA
    TESTOWO” 150,00 zł co kwartał (2025-10-14, 2026-01-14, 04-14, 07-14, 10-14), „GABINET STOMATOLOGICZNY” 200,00 zł co pół
    roku (2025-10-21, 2026-04-21, 10-21), „KASPERSKY LAB” 149,00 zł co rok (2025-10-03, 2026-10-03), „SZKOLA JEZYKOWA
    LINGUA” 600,00 zł sty/kwi/paź (2025-10-06, 2026-01-07, 04-06, 10-06), „SALON MEBLOWY AGATA” 2 400,00 zł jednorazowo
    (2026-04-11), „PGNIG OBROT DETALICZNY” co miesiąc 61,90–149,20 zł (12 płatności 11.2025–10.2026, 75. percentyl 121,40 →
    122 zł).

## Punkty

### LA.1 – ZGODNE
- Stan: A, przebieg la-a, 2026-11-03 15:38–15:39; odczyty LA.1-1 (przed), LA.1-2 (po).
- Zrobione: Ładownia → „Kontener” → Nazwa „Internet”, „abonament”, 79, co miesiąc, Płatność 15.11.2026, mBank,
  „Subskrypcje i łączność”, odbiorca „TESTNET” → Ctrl+1 → Ctrl+5 → „Dodaj do ładowni”; Plan miesiąca M0 i M-1; Operacje.
- Widać: szkic po powrocie z Mostka z tymi samymi polami (Internet / abonament / 79,00 / 15.11.2026 / mBank / Subskrypcje i
  łączność / TESTNET), symulacja „Masa ładunku: 31,0% → 32,2% pensji (2 014,32 zł → 2 093,32 zł miesięcznie)”; toast
  „Połączono z kontenerem: 17 płatności od 01.09.2025.” (płatność z 28.08.2025 niepołączona); wiersz „Internet … abonament co
  miesiąc zapłacone 02.11 79,00 zł 79,00 zł/m”; masa 31,0% → 32,2%; Podział pensji „Ładownia – stałe koszty” 1 755,99 →
  1 834,99 zł (+79,00); koperta Subskrypcje i łączność M0 „79,00 / 150,00 zł” → „0,00 / 150,00 zł”, M-1 79,00 → 0,00;
  Rozrywka i hobby M0 30,00 → 0,00; w Operacjach pole „Ładownia: Internet”.
- Oczekiwane: jak punkt – spełnione (+79 zł = 79/6 500 = 1,2 pkt proc.).
- Zrzut: LA.1-szkic.png, LA.1-po.png, LA.1-plan-M-1.png, LA.1-operacje.png.
- Uwaga z przebiegu: zaraz po dodaniu kontener ma „cięższy” – „Internet: 79,00 zł → 109,00 zł co miesiąc (+38%, +360,00 zł
  rocznie)”, bo połączyły się też płatności 30 zł tego odbiorcy z kategorii codziennej (spostrzeżenie 1).

### LA.2 – ZGODNE
- Stan: A po LA.1/LA.14 (masa 32,2%, linia 40%, dług 500,00 zł z „Pożyczki od rodziców”), la-a 15:40; odczyty LA.2-1, LA.2-2.
- Zrobione: „Kontener” „Rata kredytu” 700 zł → „Dodaj mimo przekroczenia…” → „Tak, dodaj ponad linię”; Mostek; drugi nowy
  kontener 500 zł → „Anuluj”.
- Widać: „Ponad linię zanurzenia: 43,0% pensji, limit 40%.”, „Masa ładunku: 32,2% → 43,0% pensji (2 093,32 zł → 2 793,32 zł
  miesięcznie) | Zasięg po dodaniu: 7,8 mies. → 7,1 mies.”; po pierwszym kliknięciu kontenerów nadal 11, po „Tak, dodaj ponad
  linię” 12; Mostek „MASA ŁADUNKU 43,0%” w kolorze rgb(246, 70, 93) (minus), odprawa „Masa ładunku (stałe koszty 2 793,32
  zł/mies.) ponad linią zanurzenia.”; Ładownia 43,0% = Mostek 43,0%; „Anuluj” – 12 kontenerów, formularz zamknięty.
- Oczekiwane: masa (2 093,32 + 700) / 6 500 = 42,97% → 43,0% ✓; zasięg = (osłony 13 000,00 + kadłub 39 540,30 − dług 500,00) /
  (koszty 6 612,37 + część) – 52 040,30 / 7 312,37 = 7,12 → „7,1” ✓; w LA.1 to samo z częścią 79 zł: 52 040,30 / 6 691,37 =
  7,78 → „7,7” (bez długu byłoby 7,85 → „7,8”) – dług i część są w symulacji ✓. Zasięg wyświetlany w dół do 0,1.
- Zrzut: LA.2-ostrzezenie.png, LA.2-drugie-potwierdzenie.png, LA.2-mostek.png.

### LA.3 – NIEZGODNE (S)
- Stan: B (persona „OC samochodu” 1 240 zł co rok, termin 25.11.2026 = M0), la-b 15:42, la-b4 15:53; odczyt LA.3-1.
- Zrobione: Ładownia → „Odkładki”, wiersz i edytor „OC samochodu”; Plan miesiąca 09.2025–03.2027 („Odkładki” rozwinięte).
- Widać (liczby dobre): raty cyklu 12.2025–10.2026 po 103,33 zł (11 rat), 11.2026 (M0, miesiąc terminu) 103,37 zł – suma
  1 240,00 zł; zbiornik „1 240,00 zł / 1 240,00 zł”; wiersz „103,33 zł/m(103,37 zł)”; pierwszy (krótki) cykl 09–11.2025:
  413,32 + 413,32 + 413,36 = 1 240,00 zł; nigdzie 103,34.
- Widać (niezgodność): edytor kontenera, podpowiedź pola Cykl: „Opłata okresowa: co miesiąc z energii idzie rata do
  zbiornika (103,33 zł, ostatnia 103,37 zł; w tym cyklu z wyrównaniem do terminu: 1 240,00 zł/mies. – odkładka).” – przy
  pełnym zbiorniku i racie M0 103,37 zł w Planie miesiąca. Ten sam błąd w innych edytorach stanu B: „Podatek od
  nieruchomości” „…: 150,00 zł/mies.” (Plan M0: 75,00), „Wywóz śmieci” „…: 240,00 zł/mies.” (cykl zapłacony, Plan M0: 0,00).
  Drugi przypadek, w wierszu listy: „OC motocykla” (B, nowy cykl po płatności z 12.10) „50,00 zł/m(45,84 zł)”, dymek „Rata
  nominalna: 50,00 zł/mies. · rata wyrównawcza w tym cyklu (do terminu): 45,84 zł/mies.” – Plan M0 bierze 50,00 zł, a
  zbiornik 50,00 / 600,00 przy 11 mies. do terminu potrzebuje dalej 50,00 zł/mies. Dymek „OC samochodu” nazywa ostatnią ratę
  103,37 „ratą wyrównawczą”.
- Oczekiwane: „Ładownia i Plan miesiąca pokazują inną ratę tego miesiąca” = nie przechodzi; w Ładowni rata z harmonogramu
  („ostatnia 103,37”) – ta część jest, ale obok podpowiedź z ratą 1 240,00 zł/mies.
- Kroki: stan B (albo sama persona „rok”) → Ctrl+5 → kliknij „OC samochodu” → podpowiedź pod polem „Cykl”.
- Zrzut: LA.3-edytor.png, LA.4-podatek-edytor.png, LA.10-wywoz-edytor.png, LA.3-ladownia.png (wiersz „(103,37 zł)”).

### LA.4 – ZGODNE
- Stan: B + dodany „Przegląd auta”, la-b 15:42–15:43; odczyt LA.4-1.
- Widać: „Wywóz śmieci … co kwartał … 80,00 zł/m”, w planie 80,00 zł co miesiąc cyklu; „Podatek od nieruchomości … w
  miesiącach: mar, maj, wrz, lis … 50,00 zł/m(75,00 zł)”, w planie: wrz→lis 10.2026 i 11.2026 po 75,00 zł, lis→mar 12.2025–
  03.2026 i 12.2026–03.2027 po 37,50 zł, mar→maj 04–05.2026 po 75,00 zł, maj→wrz 06–09.2026 po 37,50 zł; masa ładunku
  liczy 50,00 zł (stałe koszty persony 2 014,32 zł zawierają 50,00). „Przegląd auta” 350 zł, „inny…” 13: „(26,92 zł, ostatnia
  26,96 zł; …)”, cykl zapisany 13 („co 13 mies.”, następny termin grudzień 2027, rata 12.2026 26,92 zł); 61 i 0 – w szkicu i w
  edytorze zapisanego kontenera toast „Błąd Cykl to od 1 do 60 miesięcy – zostaje poprzedni.”, w pliku cykl 13;
  harmonogram z 1 i z 12 zaznaczonymi – „Zaznacz od 2 do 11 miesięcy – inaczej liczy się jak opłata co rok.”.
- Oczekiwane: jak punkt – spełnione (wrz→lis 2 × 75, lis→mar 4 × 37,50, waga 150 × 4 / 12 = 50; 13 mies. 12 × 26,92 + 26,96 =
  350,00).
- Uwagi: data płatności nowego kontenera domyślnie = dziś, więc „Przegląd auta” bez zmiany daty wziął w M0 całe 350,00 zł
  (spostrzeżenie 4); podpowiedź edytora Podatku z ratą 150,00 zł/mies. – znalezisko LA.3; dymek wiersza nazywa zwykłą ratę
  harmonogramu 75,00 „ratą wyrównawczą”.
- Zrzut: LA.4-cykl13.png, LA.4-cykl61.png, LA.4-harmonogram-1.png, LA.4-harmonogram-12.png, LA.4-podatek-edytor.png.

### LA.5 – ZGODNE
- Stan: C1 („Rata leasingu” 300 zł, dzień 31, bez płatności), la-c1 15:46; odczyt LA.5-1.
- Widać: „W tym miesiącu: Termin: 30.11 – 300,00 zł. | dzień płatności kontenera: 31.”, pole Płatność „Co miesiąc, 31. dnia”;
  Radar (90 dni do 01.02.2027): „30.11 opłata Rata leasingu −300,00 zł”, „31.12 …”, „31.01 …” – po jednej w miesiącu; luty
  poza oknem.
- Oczekiwane: 30.11 w listopadzie, 31. w miesiącach 31-dniowych, po jednej na miesiąc – spełnione.
- Zrzut: LA.5-ladownia.png, LA.5-radar.png.

### LA.6 – ZGODNE
- Stan: C2 („Prąd” 200 zł zmienny, 12 płatności 153,06–255,30 zł), la-c2 15:48; odczyt LA.6-1.
- Widać: wiersz „Prąd cięższy … co miesiąc … 200,00 zł”; edytor „KONTENER CIĘŻSZY NIŻ W MANIFEŚCIE | Prąd: 200,00 zł →
  232,00 zł co miesiąc (+16%, +384,00 zł rocznie) | Rok płatności (12): 75. percentyl 232,00 zł. | Masa ładunku: 35,4% →
  35,9% … | Zasięg po zmianie: 5,7 mies. → 5,7 mies.”; propozycja z historii „PGNIG OBROT DETALICZNY co miesiąc · zmienna
  122,00 zł”.
- Oczekiwane: 75. percentyl 231,40 → 232 zł; różnica 32 zł > max(10% = 23,20 zł, 2 zł) → propozycja z symulacją ✓; PGNIG:
  75. percentyl 121,40 → 122 zł (ostatnia płatność 112,60, średnia 98,56 – nie te) ✓.
- Zrzut: LA.6-prad.png.

### LA.7 – ZGODNE
- Stan: C2, la-c2 15:48; odczyt LA.7-1.
- Widać: propozycje „SZKOLA JEZYKOWA LINGUA w miesiącach: sty, kwi, paź 600,00 zł”, „PGNIG … co miesiąc · zmienna 122,00
  zł”, „TESTNET SP Z O O co miesiąc 79,00 zł”, „STREFA PARKOWANIA TESTOWO co kwartał 150,00 zł”, „AQUA-SERWIS FILTRY co 2
  miesiące 89,00 zł”, „GABINET STOMATOLOGICZNY nowa co pół roku 200,00 zł”, „KASPERSKY LAB nowa co rok 149,00 zł” (oraz
  „Orlen w miesiącach: sty, kwi, gru 180,38 zł” z persony – spostrzeżenie 3); bez SALON MEBLOWY (jednorazowa) i bez płatności
  w kontenerach. „Do ładowni” (KASPERSKY) – formularz: KASPERSKY LAB / 149,00 / co rok / 03.10.2026 / odbiorca KASPERSKY LAB /
  Subskrypcje i łączność · aplikacje, „(12,41 zł, ostatnia 12,49 zł – odkładka)”; kontenerów nadal 14 (bez potwierdzenia nic
  nie dodane). „Nie proponuj” (STREFA) – toast „„STREFA PARKOWANIA TESTOWO” nie będzie proponowany do ładowni.” + „Cofnij”,
  „Ukryte propozycje: 1 – proponuj znowu” → propozycja wraca, licznik znika.
- Oczekiwane: jak punkt – spełnione.
- Zrzut: LA.7-ladownia.png, LA.7-formularz.png, LA.7-ukryte.png.

### LA.8 – NIEZGODNE (S)
- Stan: B + dodany w UI „Ubezpieczenie domu” 900 zł co rok, data płatności 10.02.2027 (dodany 03.11.2026 = 4 miesiące z
  miesiącem terminu), la-b 15:43 i la-b4 15:53; odczyty LA.8-1, LA.8-2.
- Widać (zgodnie): szkic „(75,00 zł; w tym cyklu z wyrównaniem do terminu: 225,00 zł/mies. – odkładka)”, wiersz „75,00
  zł/m(225,00 zł)”, dymek „Rata nominalna: 75,00 zł/mies. · rata wyrównawcza w tym cyklu (do terminu): 225,00 zł/mies.”;
  Plan M0 „Ubezpieczenie domu | termin luty 2027 · 900,00 zł | 225,00 zł”; zbiornik „225,00 zł / 900,00 zł” (bez rat
  wstecz, `from` 2026-11); po terminie (03.2027) 75,00 zł.
- Widać (niezgodność): Plan miesiąca grudnia, stycznia i lutego: „Ubezpieczenie domu | termin luty 2027 · 900,00 zł |
  75,00 zł” – w tych samych miesiącach cyklu Ładownia mówi „Za planem o 450,00 zł – kolejne raty będą większe (rata
  wyrównawcza 225,00 zł/mies. zamiast nominalnej 75,00 zł/mies.).” Plan kolejnych miesięcy liczy 225 + 3 × 75 = 450 zł na
  termin 900 zł.
- Oczekiwane: „Ładownia i Plan miesiąca pokazują różne raty” = nie przechodzi; rata wyrównawcza 225,00 zł/mies. do terminu.
  Czy silnik 1.12 weźmie 225 zł, czy 75 zł (wtedy pewny brak 450 zł w dniu płatności) – maszyna (zegar).
- Kroki: stan B (albo „rok”) → Ctrl+5 → „Kontener” → „Ubezpieczenie domu”, 900, co rok, Płatność 10.02.2027 → „Dodaj do
  ładowni” → Ctrl+4 → „›” (grudzień) → „Odkładki – opłaty okresowe ▸”.
- Zrzut: LA.8-formularz.png, LA.8-ladownia.png, LA.8-odkladki.png, LA.8-plan-M0.png, LA.8-plan-M_1.png (grudzień 2026: „Ubezpieczenie domu … 75,00 zł”).

### LA.9 – ZGODNE
- Stan: B (OC motocykla zapłacone 12.10 w całości; Wywóz śmieci zapłacony 22.10 przy zbiorniku 160 zł), B3 (OC samochodu
  1 300 zł przy zbiorniku 1 240 zł), la-b 15:42, la-b3 15:51; odczyty LA.9-1, LA.9-2.
- Widać: OC motocykla – raty 50,00 zł 11.2025–10.2026 (12 × 50 = 600), płatność 600,00 zł ze zbiornika: wydane z energii
  października 5 493,19 zł = 5 413,19 (persona bez dodatków: przebieg A po usunięciu kontenera 5 522,19 − 109,00 TESTNET)
  + 80,00 brak Wywozu – OC motocykla i Woda (zbiorniki pełne) nie zmniejszają energii; w M0 „OC motocykla | termin październik 2027 (za 11 mies.) | 50,00 zł / 600,00 zł”. Brak (B3): odprawa „Za mało w
  zbiorniku (odkładce) OC samochodu: 60,00 zł z energii (pensji miesiąca).”, energia miesiąca 5 974,63 → 5 914,63 zł (−60),
  osłony 13 000,00 bez zmian, energia dziś 77,28 bez zmian; Odkładki „OC samochodu | termin listopad 2027 (za 12 mies.) |
  0,00 zł / 1 240,00 zł | Opłata za listopad 2026 zapłacona – zbiornik zbiera na następny termin.”
- Oczekiwane: pełna płatność ze zbiornika bez energii ✓; brak z energii, nie z osłon, żółty alarm ✓; płatność nie w kopercie ✓.
- Uwaga: alarm „Za mało w zbiorniku” widać tylko w odprawie miesiąca, w którym wystąpił – debriefing października (brak
  80 zł Wywozu) go nie pokazuje (spostrzeżenie 5).
- Zrzut: LA.9-mostek-brak.png, LA.9-odkladki-brak.png, LA.9-plan-M_1.png.

### LA.10 – NIEZGODNE (S)
- Stan: B, la-b 15:42, la-b4 15:53; odczyt LA.10-1.
- Widać (zgodnie): Wywóz śmieci (zapłacony 22.10 przed terminem 20.11) – Plan M0 „Wywóz śmieci | termin listopad 2026 ·
  240,00 zł | 0,00 zł”, M+1 80,00 zł (termin luty 2027); Odkładki „termin luty 2027 (za 3 mies.) | 0,00 zł / 240,00 zł |
  Opłata za listopad 2026 zapłacona – zbiornik zbiera na następny termin.”, bez „Za planem”; brak asteroidy i pozycji na
  Radarze 20.11. Woda (zaległa zapłata 14.10 za sierpień) – cykl listopadowy otwarty: „Asteroida: Woda za 12 dni – 180,00 zł,
  w zbiorniku 180,00 zł.”, Radar „14.11 asteroida Woda w zbiorniku 180,00 zł −180,00 zł”.
- Widać (niezgodność): odprawa, Meldunki i Ładownia (znaczek „cięższy”) o zapłaconej opłacie: „Kontener cięższy niż w
  manifeście – Wywóz śmieci: 240,00 zł → 480,00 zł co kwartał (+100%, +960,00 zł rocznie). Zaktualizować?”, w edytorze
  „Płatności: 20.08 240,00 zł · 22.10 240,00 zł.” – płatność przed terminem zsumowana z poprzednim cyklem jako „nowa cena”;
  „Zaktualizuj” jednym kliknięciem podwoiłby kontener. Wiersz pokazuje „zapłacone 20.11” (data terminu, nie zapłaty 22.10),
  a „W tym miesiącu” – „Zapłacone:” bez żadnej płatności.
- Oczekiwane: „odprawa ostrzega o zapłaconej opłacie” = nie przechodzi; reszta (bez rat w miesiącu terminu, bez „Za planem”,
  następny termin, zaległa zapłata nie zamyka bieżącego cyklu) spełniona.
- Liczby → AU-9: raty Wody 09.2026 0,00, 10.2026 0,00, 11.2026 180,00 zł (wiersz „60,00 zł/m(180,00 zł)”) – po zaległej
  płatności zbiornik nie zbierał we wrześniu i październiku, całe 180 zł w listopadzie (spostrzeżenie 6).
- Kroki: stan B → Ctrl+1 (odprawa) / Ctrl+Shift+M / Ctrl+5 → „Wywóz śmieci”.
- Zrzut: LA.10-odprawa-wywoz.png, LA.10-wywoz-edytor.png, LA.10-wywoz-w-tym-miesiacu.png, LA.10-mostek.png, LA.10-radar.png.

### LA.11 – LICZBY → AU-9
- Stan: B + LA.4/LA.8 (la-b 15:43), B2 (la-b2 15:44); odczyty LA.11-1…4.
- Widać: „Symulacja zrzutu” OC motocykla „Masa ładunku: 35,5% → 34,7% pensji (2 306,24 zł → 2 256,24 zł miesięcznie) | Zasięg
  po zrzucie: 7,7 mies. → 7,8 mies.” (52 295,26 / 6 690,87 = 7,82 ✓); po „Zarchiwizowany” `archivedAt` 2026-11-03, masa M0 i
  zbiornik 50,00 / 600,00 bez zmian, Plan M0 z ratą 50,00 zł, M+1 bez OC motocykla, M-1 bez zmian; odznaczenie przywraca
  M+1. B2 (zarchiwizowane 15.09): wrzesień z ratą 50,00, październik i dalej bez; zbiornika OC motocykla nie ma (resztka nie
  została). B2 wobec B: suma kont +600,00 (brak płatności 12.10), zbiorniki −50,00, energia +50,00, łupy +50,00, osłony
  13 000,00 w obu, kadłub +321,04 (40 116,30 / 39 795,26), cele +228,96 (4 728,96 / 4 500,00); suma warstw = suma kont w obu.
- Oczekiwane: resztka (550,00 zł = 11 × 50 do końca września) wraca do osłon – osłony są w obu stanach na tym samym
  poziomie, a 550 zł widać w kadłubie i celach (prawdopodobnie późniejsza dostawa 20.10 rozładowała osłony ponad cel). Czy
  to zgodne z kolejnością rozładunku – AU-9 (wyrocznia na migawkach LA.11-1 i LA.11-4). Zachowanie (symulacja, koniec życia
  z końcem miesiąca, minione miesiące bez zmian, resztka nie znika i nie zostaje w zbiorniku) – zgodne.
- Zrzut: LA.11-symulacja.png, LA.11-zarchiwizowany.png, LA.11-B2-mostek.png.

### LA.12 – NIE DO SPRAWDZENIA (zegar, częściowo) → maszyna; sprawdzona część ZGODNA
- Stan: C1, la-c1 15:46; odczyt LA.12-1.
- Widać: „Czynsz … zapłacone 02.11” („Zapłacone: 1 450,00 zł (02.11)”), „Internet Netia … termin 15.11” („dzień płatności z
  historii: 15.”), „Telefon Play … termin 20.11” przy dniu kontenera 25 („dzień płatności z historii: 20.” – środkowy z
  ostatnich płatności), „Rata leasingu … termin 30.11” („dzień płatności kontenera: 31.”); CityFit – termin 01.11 minął 2 dni
  temu, plik z banku do 26.10 – „termin 01.11” (nie „po terminie”); odprawa bez „Kontener niezaładowany” i bez Czynszu; Radar
  bez zaległych.
- Nie do sprawdzenia: „po terminie · DD.MM”, „czeka na import · DD.MM” i odprawa „Kontener niezaładowany: Telefon …” wymagają
  terminu ≥ 3 dni temu w bieżącym miesiącu – 03.11 najwcześniejszy termin to 01.11 (2 dni) → maszyna (zegar ≥ 4.11 i ≥ 23.11
  dla Telefonu).
- Zrzut: LA.12-ladownia.png, LA.12-cityfit.png, LA.12-mostek.png.

### LA.13 – ZGODNE
- Stan: C1, la-c1 15:47 i la-c1b 15:51; odczyty LA.13-1…4.
- Widać: „Zapłacone (60,00 zł, dziś)” → toast „Zapisano płatność: Internet Netia 60,00 zł (dziś).” + „Cofnij”; operacja
  2026-11-03 −60,00 zł, mBank, Subskrypcje i łączność · internet, „Ładownia: Internet Netia”; stan „zapłacone 03.11”; energia
  dziś 77,28 → 77,28 zł, koperty bez zmian, energia miesiąca 4 754,63 → 4 694,63 zł (płatność ładowni z pensji miesiąca);
  „Cofnij” (z Operacji, po 3,9 s) – operacji nie ma. „Rata leasingu” (termin 30.11, za 27 dni): zamiast przycisku „„Zapłacone”
  od 16.11 – płatność wcześniejsza należy do poprzedniego terminu.”
- Oczekiwane: jak punkt (kwota 60 zł zamiast 79 – Internet persony) – spełnione.
- Zrzut: LA.13-zaplacone.png, LA.13-operacje.png, LA.13-plan-po-zaplacone.png, LA.13-leasing.png.

### LA.14 – ZGODNE
- Stan: A po LA.18 (płatności TESTNET bez kontenera, w M0 i M-1 wpisane 30 zł z kategorią codzienną), la-a 15:39; odczyty
  LA.14-1, LA.14-2.
- Zrobione: nowy kontener „Internet TESTNET” bez odbiorcy, potem odbiorca „TESTNET” w edytorze → „Połącz płatności”.
- Widać: „Połącz płatności „TESTNET” z tym kontenerem (17)” (14 z importu + 3 wpisane od 01.09.2025; 28.08.2025 nie) → toast
  „Połączono z kontenerem: 17 płatności od 01.09.2025.”; koperty M0 Rozrywka i hobby 30,00 → 0,00, Subskrypcje 79,00 → 0,00;
  stan „zapłacone 02.11”; energia dziś 76,21 → 77,28 zł; tylko płatności TESTNET połączone.
- Oczekiwane: N = 17 ✓; energia dziś rośnie o udział 30 zł w puli dziennej: (2 500,00 − 30,00) / 28 = 88,21 → 2 500,00 / 28 =
  89,28 (w dół do grosza), minus wydane dziś 12,00 – 76,21 → 77,28 ✓.
- Zrzut: LA.14-przycisk.png, LA.14-po.png, LA.14-plan.png.

### LA.15 – ZGODNE
- Stan: C2, la-c2 15:48–15:49; odczyty LA.15-1…4.
- Widać: odprawa, Meldunki („Cięższy niż w manifeście – Netflix: … Zaktualizuj w Ładowni”) i Ładownia (znaczek „cięższy”):
  „Netflix: 43,00 zł → 49,00 zł co miesiąc (+14%, +72,00 zł rocznie)”, w edytorze „Płatności: 05.09 49,00 zł · 05.10 49,00
  zł.” i symulacja; „Zaktualizuj od listopada 2026” → toast „Netflix: 49,00 zł od listopada 2026 – wcześniejsze miesiące
  liczą się kwotą 43,00 zł.”, „Historia kwot: do 10.2026: 43,00 zł · od 11.2026: 49,00 zł”; „Cofnij” – kwota 43,00, historia
  pusta, propozycja wraca; „To nie zmiana ceny” – toast „Netflix: kwota 49,00 zł nie będzie proponowana.”, propozycji nie ma
  w Ładowni, odprawie i Meldunkach. Plan (kwota 49 od listopada wpisana potem w edytorze – ten sam zapis historii): Ładownia
  M0 2 154,88 zł (z 49), M-1 2 648,88 zł (z 43). Disney+ 23 → 24 zł i HBO Max (jedna płatność 39,99) – bez propozycji.
- Oczekiwane: +6/43 = 14%, 6 × 12 = 72 zł ✓; M0 49, M-1 43 ✓; próg max(5%, 2 zł) i jedna płatność ✓.
- Zrzut: LA.15-mostek.png, LA.15-meldunki.png, LA.15-netflix.png, LA.15-zaktualizowany.png.

### LA.16 – ZGODNE
- Stan: C2 po LA.15 (Netflix 49 od 11.2026, historia „do 10.2026: 43,00 zł”), la-c2 15:49; odczyty LA.16-1, LA.16-2.
- Widać: „Jedna kwota we wszystkich miesiącach” → toast „Netflix: 49,00 zł we wszystkich miesiącach.” + „Cofnij”; Historia
  kwot tylko z „Ostatnie płatności…”; Ładownia M-1 2 648,88 → 2 654,88 zł (+6), M0 2 154,88 bez zmian.
- Oczekiwane: jak punkt – spełnione.
- Zrzut: LA.16-historia.png, LA.16-po.png.

### LA.17 – NIEZGODNE (N)
- Stan: C2 („Siłownia” bez płatności 03.09 i 03.10; „Audioteka” bez 10.10), la-c2 15:49; odczyty LA.17-1…3.
- Widać: „Siłownia: brak płatności od 03.08 (2 terminy bez płatności) – subskrypcja anulowana?”, „Terminy bez płatności:
  03.09, 03.10.”, symulacja „Masa ładunku: 35,5% → 33,7% pensji (2 308,21 zł → 2 188,21 zł miesięcznie)”; Audioteka (jeden
  brak) – bez sygnału; „Zrzuć z ładowni” → kontener zarchiwizowany (znika z listy), **bez toastu i bez „Cofnij”**; masa M0
  35,5% (liczy się do końca miesiąca). Po ręcznym przywróceniu (zarchiwizowane → przełącznik) „Nadal płacę” → toast „Siłownia
  zostaje w ładowni.” + „Cofnij”, sygnał znika z Ładowni, odprawy i Meldunków (Spotify zostaje).
- Oczekiwane: krok „Cofnij” po „Zrzuć z ładowni” – przycisku nie ma (zmiana masy ładunku bez cofnięcia, powrót tylko przez
  „zarchiwizowane” i przełącznik). Sygnał po 2 terminach, symulacja, „Nadal płacę” – zgodne.
- Kroki: stan C2 → Ctrl+5 → „Siłownia” → „Zrzuć z ładowni”.
- Zrzut: LA.17-silownia.png, LA.17-po-zrzucie.png, LA.17-nadal-place.png.

### LA.18 – ZGODNE
- Stan: A po LA.1 („Internet” z 17 płatnościami, w tym M0), la-a 15:39; odczyty LA.18-1…3.
- Widać: toast „Usunięto kontener „Internet” – jego płatności (17) liczą się teraz jak zwykłe wydatki.” + „Cofnij”; po
  usunięciu koperty M0 Subskrypcje 0,00 → 79,00, Rozrywka 0,00 → 30,00, energia dziś 77,28 → 76,21, debriefing października
  „Ładownia i odkładki” 1 847,00 → 1 738,00, pula codzienna 1 766,52 → 1 796,52 zł; „Cofnij” – kontener i 17 płatności
  połączone, koperty 0,00, energia 77,28; nowy kontener tego odbiorcy przejmuje je („Połącz płatności … (17)”, LA.14).
- Oczekiwane: jak punkt – spełnione.
- Zrzut: LA.18-po-usunieciu.png, LA.18-po-cofnij.png.

### LA.19 – poza laboratorium (maszyna)
- Laboratorium zapisało tylko powiadomienia przy starcie (C1, C2): „Asteroida na kursie – Podatek od nieruchomości za 12 dni
  – 150,00 zł, w zbiorniku 150,00 zł.” (raz), „Kontener cięższy niż w manifeście” (Netflix, Prąd – po razie), „Kontener bez
  płatności” (Spotify, Siłownia – po razie); kwoty jak w Ładowni. 14 i 3 dni przed terminem, „Kontener niezaładowany”,
  wyłączenie w Ustawieniach i opłata zapłacona przed terminem (Wywóz – tu fałszywa „nowa cena”, LA.10) – maszyna.

## Znaleziska

- LA.3 (S): podpowiedź edytora opłaty okresowej liczy „ratę z wyrównaniem do terminu” jak przy pustym zbiorniku – „OC
  samochodu” „1 240,00 zł/mies.” przy pełnym zbiorniku i racie 103,37 w Planie; wiersz „OC motocykla” „(45,84 zł)” przy racie 50,00.
- LA.8 (S): Plan miesiąca dla kolejnych miesięcy cyklu z ratą wyrównawczą pokazuje ratę nominalną (75,00 zamiast 225,00 zł);
  rata silnika od 1.12 – maszyna.
- LA.10 (S): opłata zapłacona miesiąc przed terminem daje fałszywą „nową cenę” (Wywóz śmieci 240 → 480 zł, +100%) w odprawie,
  Meldunkach i Ładowni; stan pokazuje „zapłacone 20.11” i pustą listę „Zapłacone:”.
- LA.17 (N): „Zrzuć z ładowni” archiwizuje bez „Cofnij”.

## Spostrzeżenia

1. Dodanie kontenera łączy wszystkie płatności odbiorcy od startu budżetu, także z innej kategorii (30 zł „hobby” TESTNET) –
   od razu fałszywe „Internet: 79,00 zł → 109,00 zł (+38%)” (suma płatności terminu, T284). Brak podglądu, które płatności
   się połączą.
2. Dymki wiersza nazywają „ratą wyrównawczą” także zwykłą ostatnią ratę (OC 103,37) i ratę harmonogramu (Podatek 75,00).
3. Rozpoznanie harmonogramu proponuje przypadkowe zakupy: trzy wpisane tankowania „Orlen” (12.01, 17.04, 20.12, 180–195 zł)
   → „Orlen w miesiącach: sty, kwi, gru 180,38 zł”.
4. Nowy kontener ma datę płatności = dziś: opłata okresowa dodana bez zmiany daty bierze całą kwotę z energii bieżącego
   miesiąca („Przegląd auta” 350,00 zł w M0) – łatwo przeoczyć.
5. Alarm „Za mało w zbiorniku (odkładce) …” jest tylko w odprawie miesiąca; debriefing zamkniętego miesiąca (październik,
   80 zł Wywozu z energii) go nie wymienia.
6. Po zaległej zapłacie poprzedniego cyklu (Woda) zbiornik nie zbierał we wrześniu i październiku (0,00 zł), a w listopadzie
   wziął 180,00 zł naraz – „rata wyrównawcza 180,00 zł/mies.” w pierwszym miesiącu widocznym dla użytkownika (AU-9).
7. „Zrzuć z ładowni” zostawia masę bieżącego miesiąca bez zmian (35,5%), choć symulacja tuż wyżej mówi 33,7% – zgodne z T136,
   ale bez słowa wyjaśnienia na ekranie.
8. Pole „Płatność” kontenera miesięcznego pokazuje pierwszą datę sprzed roku (Czynsz „10.09.2025”), dopiero podpis mówi „Co
   miesiąc, 10. dnia”.
9. Narzędzie: mój pomocnik `openContainer` (la-pomoc.ts) w pierwszym przebiegu B zamykał już otwarty edytor (tytuł panelu
   w `innerText` wielkimi literami) – poprawione, brakujące dowody (podpowiedzi, plan LA.8) powtórzone w przebiegu B4. Błędów
   `lab.ts` nie było; `errors` okna puste we wszystkich przebiegach.
