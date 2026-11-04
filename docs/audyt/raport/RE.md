# Raport audytu – RE (raporty i eksport)

- Data: 03.11.2026 (wtorek), 12:10–13:45 (zegar prawdziwy, Warszawa); wersja 1.15.4 z GitHub Releases (laboratorium
  `C:\FI-audyt`, uruchomienie jako portable – patrz `wykonanie.md`).
- Stan danych: persona `rok` (kotwica 2026-11-03; 982 operacje, 14 pełnych miesięcy) bez zmian oraz **`rok+re`** –
  `rok` z 15 operacjami dopisanymi przed startem (patrz „Stany szczególne”). Każdy przebieg na świeżej kopii
  (`useState('rok', 're-…')`), stan w `C:\FI-audyt\stany` nietknięty.
- Przebiegi: `re-0`, `re-0-start`, `re-1`, `re-12`, `re-12-orig`, `re-12-kopia`, `re-3`, `re-4`, `re-5`, `re-6`, `re-7`,
  `re-8`, `re-9`, `re-10` (`C:\FI-audyt\przebiegi\re-*`); skrypty `tests/audyt/re-*.spec.ts` (pomocnik `re-pomoc.ts`);
  odczyty `C:\FI-audyt\odczyty\re.jsonl`; zrzuty `C:\FI-audyt\zrzuty\RE.*.png`; pliki eksportu
  `C:\FI-audyt\eksport\re-*` (CSV, XLSX rozpakowane do `re-xlsx*`, PDF z tekstem `re-*.pdf.txt`, ZIP). Narzędzia do
  analizy plików (CSV, XLSX, PDF przez pdf.js) – `C:\FI-audyt\narzedzia-re\` (poza repozytorium).

## Podsumowanie
15 punktów RE, z czego do wykonania w laboratorium 14 (RE.9 – tylko Ty; RE.6 i RE.10 – część „Ty” w `docs/audyt/ty.md`).
- **ZGODNE: 11** – RE.1, 2, 3, 4, 6 (bajty), 7, 8, 10 (treść i nazwy), 11, 12, 13.
- **NIEZGODNE: 3** – RE.5 (S), RE.14 (N), RE.15 (S). Każde potwierdzone na drugim, świeżym przebiegu.
- UWAGA: 2 (w spostrzeżeniach: daty w Excelu jako tekst; „Miesiące – CSV” dla zakresu dni). DO OCENY: 0 (zrzuty
  wyglądu PDF i panelu dla Ciebie – `ty.md`). NIE DO SPRAWDZENIA: część RE.1 (powiadomienie wygeneruje się dopiero w niedzielę
  po 18:00 – Maszyna), „Nie udało się zapisać” przy eksporcie (patrz RE.3). Poza laboratorium: **RE.9** (Ty).
- LICZBY → AU-9: RE.2, 5, 7, 10, 12, 14 (odczyty w `re.jsonl`).

## Stany szczególne
`rok+re` (`special()` w `re-pomoc.ts`, dopisane przez schematy aplikacji, na Portfelu XTB albo po 26.10 na mBanku, więc
potwierdzone saldo zostaje prawdziwe):
- 10.10: kontrahent „=SUMA(A1)” z tytułem „=1+1” i notatką `a;b "cytat"` + nowa linia + `; koniec` (godzina 09:15);
  „+48 600 100 200”, „-rabat”, „@firma”, „-123”, „Zażółć gęślą jaźń” z tytułem „ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż” i tagami
  `#Wakacje #zażółć`, „Tab<TAB>w środku” z tytułem zaczynającym się tabulatorem;
- 14.10 Carrefour 130 zł: dwie części z opisami („zakupy na tydzień” – Jedzenie 100 zł; „kabel; HDMI "złoty"” – Dom 30 zł);
- 18.10 zakup 70 zł finansowany przez Marka; 28.10 przelew mBank → Portfel XTB 300 zł w jednej operacji; 16.10 przelew
  poza budżet 200 zł; 20.10 zwrot butów +25 zł (wydatek dodatni); 21.10 „impuls” z wpisem, 22.10 „plan”;
- 15.12.2026 wydatek 10 zł (data w przyszłości).

`rok+re+duże` (tylko RE.15): do tego 12.10 wpływ i wydatek po 1 234 567,89 zł oraz 13.10 notatka 4540 znaków (50 linii
ze średnikami i cudzysłowami; punkt mówi o 5000 – notatka jest o 460 znaków krótsza), kategoria „Zwierzęta” przemianowana
na 40-znakowe „Zwierzęta domowe: karma, weterynarz, ŻŻŻ” (40 znaków to limit nazwy w aplikacji).

## Punkty

### RE.1 – ZGODNE
- Stan: rok (`re-0`, 12:11).
- Zrobione: Ctrl+0; przełączenie każdej zakładki; Ctrl+K „raport” + Enter; z Mostka wysłane do okna zdarzenie kliknięcia
  powiadomienia (`fi:notificationClick`, znacznik `reports`) – powiadomienie raportu wachty w laboratorium nie istnieje we
  wtorek, tylko niedziela po 18:00, więc samo wygenerowanie powiadomienia – Maszyna.
- Widać: zakładki „Odprawa”, „Raport wachty”, „Debriefing”, „Przegląd roczny”, „Eksport”; Ctrl+0 otwiera Raporty na
  „Raport wachty” („RAPORT WACHTY – 26.10.2026 – 01.11.2026”); paleta: „Raporty – odprawy i eksport  Ctrl 0” prowadzi do
  Raportów (na ostatnio oglądanej zakładce); kliknięcie powiadomienia otwiera „Raport wachty”. Żadna zakładka nie jest
  pusta (każda 386–1922 znaków).
- Zrzuty: RE.1-ctrl0.png, RE.1-paleta.png.

### RE.2 – ZGODNE (liczby → AU-9)
- Stan: rok (`re-0`), `start` (`re-0-start`), `start` z potwierdzonymi saldami (`re-7`).
- Widać (rok): Mostek i Raporty – ta sama energia („77,28 zł”), „Daily Bias Neutral” (Mostek z kropką „◆ Neutral”),
  te same 15 pozycji w tej samej kolejności (porównanie tekstów 1:1: równe); `start`: „93,92 zł”, „Bullish”, dwa
  „potwierdź saldo z bankiem” w obu miejscach; po potwierdzeniu sald obie odprawy: „Bez alarmów – kurs stabilny.”.
- Zrzuty: RE.2-raporty-odprawa.png, RE.2-bez-alarmow.png. Odczyty: `re.jsonl` (RE.2).

### RE.3 – ZGODNE
- Stan: rok (`re-0` 12:11, `re-1`, `re-9`).
- Widać: pola Od „01.01.2026” – Do „03.11.2026”; propozycje nazw „financial-intel_operacje_2026-01-01_2026-11-03.csv”,
  „…_miesiace_…csv”, „…_budzet_….xlsx”, „Financial-Intel-2026-11-03.zip”; toast „Zapisano: C:\FI-audyt\eksport\re-3-operacje.csv”
  (to samo dla każdego przycisku); anulowanie okna zapisu na każdym z czterech przycisków i na obu PDF – brak pliku,
  toastu i błędu; objaśnienie „Pliki zawsze z prawdziwymi kwotami – ukrycie kwot (Ctrl+$) dotyczy tylko ekranu. CSV dla polskiego
  Excela (średnik, przecinek dziesiętny). …”. Zakres wpisany „01.10.2026–31.10.2026” → nazwa z tym okresem.
- Nie do sprawdzenia: komunikat „Nie udało się zapisać” – zapis do nieistniejącego folderu aplikacja wykonuje, tworząc
  folder („Zapisano: …\nie-ma-takiego-folderu\x.csv”), a niedozwolonej ścieżki nie próbowałem poza laboratorium.
- Zrzut: RE.3-panel.png (panel jest wąskim paskiem u góry, reszta ekranu pusta – DO OCENY w `ty.md`).

### RE.4 – ZGODNE
- Stan: rok+re (`re-1`, plik `re-1-ops.csv`; powtórzone `re-5` – ten sam rozmiar 83 635 B).
- Widać: bajty `EF BB BF` (UTF-8 z BOM); średnik; CRLF, plik kończy się CRLF, jedyny samotny LF jest w polu w cudzysłowie;
  nagłówek „Data;Godzina;Konto;Rodzaj;Kwota (zł);Kategoria;Kontrahent;Tytuł;Finansuje;Dziennik;Notatka;Tagi”; 996 wierszy po
  12 kolumn; wszystkie kwoty `-?\d+,\d\d` (np. „-12,34”, „25,00” zwrot, „1234567,89”, bez spacji tysięcy, bez kropki);
  daty `RRRR-MM-DD` (wszystkie, rosnąco); godzina pusta albo „HH:MM” (204 wiersze mają godzinę, reszta – import – pusta); „Zażółć gęślą
  jaźń”, „ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż” poprawne.

### RE.5 – NIEZGODNE (S) (liczby → AU-9)
- Stan: rok+re (`re-1`, 12:15) i drugi, świeży przebieg `re-10` (12:39).
- Zrobione: eksport „Operacje – CSV” od 01.08.2025 do 03.11.2026; porównanie z Operacjami za ten sam okres (Od/Do
  w menu okresu).
- Widać (zgodne): Operacje „996 / 997” (997 w całej historii – operacja z 15.12 poza okresem), CSV 996 wierszy;
  „Wpływy +151 714,99 zł” = suma dodatnich kwot CSV 151 714,99; „Wydatki −99 197,76 zł” vs ujemne CSV −99 697,76 – różnica
  500,00 zł to dwa przelewy własne (200 + 300), które pasek pomija (to samo co OP.39 – nie zgłaszam drugi raz). Przelew
  mBank → Portfel XTB w jednej operacji ma **jeden** wiersz „mBank → Portfel XTB / Przelew własny / -300,00” (nie podwójnie);
  „Finansuje: Marek”, „od: Anna” przy wpłacie domownika, „Dziennik: plan/impuls”, tagi „#Wakacje #zażółć”, zwrot „25,00”,
  operacja z 15.12 pominięta.
- Widać (niezgodne): paragon dzielony w pliku to **jedna** pozycja: „2026-10-14;;Portfel XTB;Wydatek;-130,00;Jedzenie ·
  zakupy spożywcze + Dom · wyposażenie;Carrefour;;;;zakupy · Jedzenie · zakupy spożywcze: zakupy na tydzień · Dom ·
  wyposażenie: kabel; HDMI "złoty";”. Opisy części są (w Notatce), ale **kwot części (100,00 i 30,00) w pliku nie ma** – nie da
  się zsumować Dom i Jedzenie z paragonu w Excelu, a „Kategoria” to sklejka.
- Oczekiwane: „części paragonu – wiersze części z opisami, sumujące się do operacji” (punkt, „Oczekiwany efekt”). Uwaga:
  OP.39 uznało ten sam wiersz Carrefoura za zgodny – rozstrzygnięcie w AU-11, czy plik ma mieć wiersze części.
- Zrzuty: RE.5-operacje-okres.png. Odczyty: `re.jsonl` (RE.5, dwa).

### RE.6 – ZGODNE (bajty); Excel – poza laboratorium (Ty)
- Stan: rok+re (`re-1`).
- Widać: `'=SUMA(A1)` i tytuł `'=1+1`, `'+48 600 100 200`, `'-rabat`, `'@firma`, tytuł zaczynający się tabulatorem – z apostrofem;
  „-123” (liczba, nie formuła) bez apostrofu; notatka `"a;b ""cytat""` + CRLF-bezpieczna nowa linia: pole w cudzysłowie
  z podwojonym cudzysłowem i `\n` w środku, wiersz ma nadal 12 kolumn; „Zażółć gęślą jaźń” poprawne. W XLSX te same
  teksty są zwykłymi tekstami (inline) bez apostrofu, więc nie są formułami.
- Do Ciebie: czy w Excelu przy CSV widać apostrof przed tekstem i czy nic się nie policzyło (`ty.md`, 11).

### RE.7 – ZGODNE (liczby → AU-9)
- Stan: rok (`re-6`, Od 01.08.2025; plik `re-6-months.csv`) i rok+re (`re-1-months.csv`).
- Widać: nagłówek „Miesiąc;Pensja (zł);Koszty netto (zł);Przychody (zł);Na plus;Łupy (zł);Bilans (zł);Stopa oszczędności (%)”;
  16 wierszy (2025-08 … 2026-11); 2025-08 (przed startem): „2025-08;;0,00;0,00;;;0,00;” – pensja, łupy i stopa puste,
  łupy nie „0,00”; 2026-11: „6500,00;12,00;0,00;w toku;;-12,00;” (bieżący „w toku”); „nie” z „Łupy 0,00” w miesiącach na minusie.
  Porównanie z debriefingiem w Raportach dla wszystkich 15 miesięcy (koszty, pensja, bilans, stopa, na plus, łupy): bez
  różnic (np. 2026-09: „7548,47 / 1951,53 / 20,5 / nie / 0,00”, 2026-10: „5413,19 / 6086,81 / 52,9 / tak / 803,48”).
- Odczyt: `re.jsonl` (RE.7 – wszystkie wiersze).

### RE.8 – ZGODNE
- Stan: rok+re (`re-1`, `re-1-xlsx.xlsx`, rozpakowany do `re-xlsx`).
- Widać: ZIP z `xl/workbook.xml`, `styles.xml`, `worksheets/sheet1.xml` i `sheet2.xml`, bez błędu struktury; arkusze „Operacje”
  (997 wierszy z nagłówkiem, zamrożony pierwszy) i „Miesiące” (17); kolumna „Kwota (zł)” – 996 komórek typu liczba
  (`<v>-90.07</v>`), 1 nagłówek; w „Miesiące” pensja, koszty, przychody, łupy, bilans i stopa (`25.7`) jako liczby; porównanie
  komórka po komórce z CSV tego samego okresu: 11 964 komórek w „Operacje” – jedyne różnice to 6 komórek z apostrofem
  w CSV (formuły – w XLSX tekst bez apostrofu), „Miesiące” 136 komórek – 0 różnic. Polskie znaki poprawne.
- Uwaga: daty (`2025-09-01`) i godziny w XLSX są tekstami (inline), nie datami Excela – patrz Spostrzeżenia.

### RE.9 – poza laboratorium (Ty)
- Otwarcie w Excelu: `docs/audyt/ty.md`, pozycja 12 (pliki `re-1-xlsx.xlsx`, `re-1-ops.csv`, `re-1-months.csv`).

### RE.10 – ZGODNE (liczby → AU-9); wygląd wydruku – Ty
- Stan: rok (`re-6`) i rok+re (`re-1`, `re-5`, `re-8`); tekst PDF wyciągnięty przez pdf.js (brak `pdftotext`).
- Widać: nazwy proponowane „debriefing_2026-10.pdf” (domyślny miesiąc to zamknięty październik), „przeglad_2026.pdf”,
  „przeglad_2025.pdf”; metadane: „Debriefing – październik 2026”, producent Skia/PDF; 1 strona A4 (debriefing), 2 strony (przegląd);
  tytuł, podtytuł „Financial Intel · 03.11.2026”, sekcje „Wynik wobec planu”, „FVG kopert (plan − fakt)”, „Dowództwo”,
  „Dziennik kapitański” (+ „Podział łupów”, gdy jest); FVG „+279,96 zł”, „−99,89 zł”; polskie litery w tekście i na
  zrzucie poprawne; tabele nie ucięte, wiersze nie rozdzielone granicą strony (tytuły sekcji w całości); żadnego
  `/JavaScript`, `/URI`, `/Launch`, `/EmbeddedFile` w strumieniu pliku. Porównanie liczb PDF z ekranem: debriefing 2026-10,
  2026-09, 2025-09 oraz przegląd 2026 i 2025 – ten sam zbiór liczb (poza datą i rokiem w nagłówku).
- Zrzuty stron: RE.10-debriefing-2026-10-1.png, RE.10-debriefing-2026-09-1.png, RE.10-debriefing-2025-09-1.png,
  RE.10-przeglad-2026-1.png, RE.10-przeglad-2026-2.png, RE.10-przeglad-2025-1.png, RE.10-przeglad-2025-2.png.
- Odczyty: `re.jsonl` (RE.10 – „Wynik wobec planu” 2026-09 i 2026-10, „Rok w liczbach” 2025).

### RE.11 – ZGODNE
- Stan: rok+re (`re-5`), Od 01.08.2025 w obu seriach.
- Zrobione: te same trzy eksporty (CSV operacji, CSV miesięcy, Excel) i oba PDF – raz przy jawnych kwotach, raz po
  Ctrl+Shift+4 (ekran „•••”).
- Widać: pliki identyczne – CSV bajt w bajt (`SHA-256` te same), arkusze XLSX identyczne, tekst obu PDF identyczny, żadnych „•••”
  w pliku; ekran po ukryciu: „Pensja od siebie ••• zł …”; panel Eksport ma to samo objaśnienie.
- Zrzuty: RE.11-ukryte-debriefing.png, RE.11-eksport-ukryte.png.

### RE.12 – ZGODNE (liczby → AU-9)
- Stan: rok (`re-12`, 12:22) i `re-12-orig`/`re-12-kopia` (otwarcie kopii).
- Widać: oba przyciski (Raporty i Ustawienia → „Folder i kopie” → „Eksport: ZIP całego folderu…”) proponują „Financial-Intel-2026-11-03.zip”,
  dają ten sam zestaw 1165 wpisów (tylko ścieżki z `/`, bez `..`, bez `backups/` i `.presence/`); czas: 304 ms – 2 s,
  rozmiar 810 887 B. Zawartość (na `re-1`: 1180 wpisów) = `fi.json` + 997 transakcji (2025: 273, 2026: 724) + 15
  miesięcy + 10 kontenerów + 5 celów + 9 dokowań + 2 pożyczki + 4 salda + 3 gry + 3 zaplanowane + 1 import + `.history`
  (129 transakcji + `fi`) – liczby plików równe folderowi źródłowemu. Rozpakowanie do pustego folderu
  i otwarcie w laboratorium: Mostek „ENERGIA DZIŚ 77,28 zł / przydział 89,28 zł · podstawowy 83,33 zł”, cała odprawa i pasek
  Operacji (mBank 69 747,04 zł, Portfel XTB 3 918,89 zł, Gotówka −55,36 zł) identyczne z oryginałem.
- Odczyty: `re.jsonl` (RE.12 – liczba plików wg kolekcji, energia, pasek kopii).
- Zrzut: RE.12-ustawienia.png.

### RE.13 – ZGODNE
- Stan: rok+re (`re-3`, 12:29).
- Zrobione: Operacje → cała historia; kategoria „Jedzenie”; „Więcej filtrów” → kwota od 50; sortowanie po kwocie;
  ukryte Notatka i Tagi (pasek „Kolumny: 2 ukryte”); „CSV” i „Excel”.
- Widać: pasek „Operacje 164 / 997”; propozycja nazwy „operacje_2026-11-03.csv” / „.xlsx”; toast „Zapisano 164 operacje:
  C:\FI-audyt\eksport\re-13.csv”; plik: 164 wiersze w kolejności listy („−218,23 Lidl”, „−217,04”, „−215,72”, …,
  „−50,59 Pizzeria Napoli” – jak ekran), wszystkie „Jedzenie”, wszystkie |kwota| ≥ 50 zł, 12 kolumn z BOM; notatki i tagi
  (3 wiersze) są w pliku mimo ukrytych kolumn.
- Zrzut: RE.13-lista.png.

### RE.14 – NIEZGODNE (N) (liczby → AU-9)
- Stan: rok (`re-6`, 12:35; pliki `re-6-*`, ekrany `re-6-ekrany.json`) i rok+re (`re-10`, 12:39).
- Zrobione: wrzesień i październik 2026 – koszty netto i przychody ze wszystkich wskazanych miejsc.
- Widać (zgodne co do grosza): **koszty netto wrz 7 548,47 zł, paź 5 413,19 zł** – „Miesiące – CSV”, debriefing w Raportach
  (ekran i PDF), Plan miesiąca (debriefing „Koszty netto miesiąca”), „Razem” w Wywiad → „Wydatki w czasie” (7 548,47 /
  5 413,19 / 12,00), Bilans paliwa (koszty), suma kosztów z dni wszystkich raportów wachty (wrz 754 847 gr, paź 541 319 gr,
  także sierpień 6 043,49 zł); **przychody wrz 9 500,00, paź 11 500,00** – CSV, Bilans paliwa (wiersze „październik 2026
  11 500,00 5 413,19 +6 086,81 52,9%”), debriefing Planu miesiąca („przychód 11 500,00 zł − koszty 5 413,19 zł”); panel
  „Przychody” (Mostek i Plan miesiąca) – 3 mies. 9 500,00 i 6 mies. 9 666,67 = średnie z tych wierszy.
- Widać (niezgodne): „Przychody” → „12 mies.” – **„Razem 9 458,33 zł”** (Trading 1 958,33), a średnia z 12 wierszy Bilansu
  paliwa (lis 2025 – paź 2026, suma 114 500,00 zł) to **9 541,67 zł**; różnica 83,34 zł = 1 000 zł dopłaty do XTB z 05.03.2026
  / 12 (miesiące liczą trading osobno, okno 12 mies. nettuje dopłaty w całości). Wyjaśnienie jest tylko w notce Przeglądu
  rocznego („przychody roku nettują dopłaty z całego roku”), nie w panelu „Przychody”. Prawdopodobnie zamierzone (T119,
  N66) – do rozstrzygnięcia w AU-11.
- Oczekiwane: „ta sama kwota co do grosza w każdym miejscu” (punkt) – jakakolwiek różnica do opisania.
- Zrzuty: RE.14-wywiad.png, RE.14-przychody-mostek.png. Odczyty: `re.jsonl` (RE.14, trzy wpisy).

### RE.15 – NIEZGODNE (S)
- Stan: rok+re+duże (`re-4`, 12:29, i powtórzony przebieg `re-4`); `re-10` (12:39) dla odwróconych dat.
- Zrobione: okres bez operacji (2024, 2030, pojedynczy dzień bez wydatków), „Do” przed „Od”, 12.10 (kwota
  1 234 567,89 zł), 13.10 (notatka 4540 znaków); CSV operacji, CSV miesięcy, Excel; PDF debriefingu października.
- Widać (zgodne): pusty okres – CSV operacji tylko z nagłówkiem (102 B), Excel 3,3–3,5 KB z nagłówkami; duża kwota w CSV
  „1234567,89” (bez notacji wykładniczej, bez spacji), w Excelu liczba `1234567.89`; długa notatka cała w CSV (kończy
  „…numer 50.”, cudzysłowy podwojone) i w XLSX (jedna komórka); PDF z kwotami „1 240 205,42 zł”, „−1 234 568,56 zł” bez
  ucięć, 40-znakowa nazwa kategorii w jednym wierszu; żaden eksport nie kończy się błędem okna ani uszkodzonym plikiem.
- Widać (niezgodne): „Od” 31.10.2026, „Do” 01.10.2026 – plik „financial-intel_operacje_2026-10-31_2026-10-01.csv”
  zapisany z samym nagłówkiem, toast „Zapisano: C:\FI-audyt\eksport\re-15-odwrocone-ops.csv”; bez komunikatu i bez
  zamiany dat (Excel i „Miesiące – CSV” podobnie: CSV miesięcy dla Od 15.10 / Do 15.09 – tylko nagłówek). Ten sam efekt
  przy okresie bez operacji (toast „Zapisano”, bez słowa, że plik jest pusty).
- Oczekiwane: „odwrócone daty – komunikat albo zamiana, bez błędu” (punkt).
- Zrzut: RE.15-po-eksportach.png, RE.15-debriefing.png (PDF), RE.15-debriefing-ekran.png.

## Znaleziska
- **RE.5 – NIEZGODNE (S):** paragon dzielony w „Operacje – CSV” / Excel to jedna pozycja bez kwot części (130,00 zł:
  „Jedzenie … + Dom …”, części 100,00 i 30,00 zł tylko opisane w Notatce); nie da się zsumować kategorii z paragonu
  (`re-1-ops.csv`, `re-10-ops.csv`).
- **RE.14 – NIEZGODNE (N):** panel „Przychody” → „12 mies.” 9 458,33 zł ≠ średnia z 12 wierszy Bilansu paliwa 9 541,67 zł
  (dopłata XTB 1 000 zł z marca 2026 nettowana w oknie, nie w miesiącu; wyjaśnienia nie ma w panelu).
- **RE.15 – NIEZGODNE (S):** „Do” wcześniejsze niż „Od” daje po cichu pusty plik z nazwą „…_2026-10-31_2026-10-01”
  i toastem „Zapisano” – bez komunikatu i bez zamiany (`re-15-odwrocone-*`, `re-10-odwrocone.csv`).

## Spostrzeżenia
1. **Okres eksportu nie jest pamiętany** – po przejściu na inną zakładkę Raportów (albo ekran) pola Od / Do wracają do
   „01.01.2026 – dziś”; żeby wyeksportować dłuższy okres po obejrzeniu debriefingu, trzeba wpisać go od nowa.
2. **„Miesiące – CSV” dla zakresu dni oddaje całe miesiące** – Od=Do=03.08.2026 daje cały sierpień (6 043,49 zł) pod nazwą
   „financial-intel_miesiace_2026-08-03_2026-08-03.csv”; nazwa obiecuje dzień, plik – miesiąc.
   Odwrócony zakres obejmujący dwa miesiące (Od 15.10, Do 15.09) daje CSV miesięcy bez wierszy (UWAGA, tylko opis).
3. **XLSX: daty i godziny jako tekst** (`2025-09-01` w komórce tekstowej) – w CSV Excel PL rozpozna datę ISO, w XLSX
   filtr dat i tabela przestawna jej nie zobaczą (UWAGA; sortowanie ISO jako tekst działa). Kwoty i stopa – liczby.
4. **Przegląd roczny liczy operację z przyszłą datą** – „grudzień 2026 – 10,00 zł” w tabeli miesięcy i w „Koszty netto”
   roku (63 844,52 zł), a Operacje (okres do dziś), eksport i debriefing jej nie pokazują; specyfikacja milczy.
5. **Eksport pustego wyniku** – 0 wierszy nie jest sygnalizowane (toast „Zapisano”); warto „Brak operacji w okresie” albo
   „Zapisano 0 operacji” (jak przy eksporcie widocznej listy: „Zapisano 164 operacje”).
6. **Odporność na zbyt długą nazwę kategorii** – ręcznie zmieniony `fi.json` z nazwą kategorii > 40 znaków (limit schematu)
   kasuje ją po cichu z listy; jej koperta znika z debriefingu i wydatki trafiają do „Bez koperty” (u mnie błąd
   przygotowania, nie użytkownika – interfejs nie pozwala wpisać więcej niż 40 znaków).
7. Panel „Eksport” zajmuje wąski pasek na górze ekranu (RE.3-panel.png) – DO OCENY (`ty.md`).

## Problemy laboratorium
- Brak `pdftotext` – tekst i obrazy PDF przez pdf.js zainstalowane w `C:\FI-audyt\narzedzia-re` (`npm install`, poza repo).
- `answerDialogs` (lab.ts) zastępuje `showSaveDialog` na stałe (nie „następne okno”) i nie zapisuje proponowanej nazwy;
  w `re-pomoc.ts` własne `answerSave` / `answerCancel` wołają to samo, ale zapamiętują `defaultPath` (nazwę proponowaną).
- Równolegle działały przebiegi innych obszarów – pojedynczy przebieg trwa 2–6 min; konflikty nazw nie wystąpiły.
- Nie próbowałem zapisu do chronionych ścieżek; „Nie udało się zapisać” pozostaje niesprawdzone.
