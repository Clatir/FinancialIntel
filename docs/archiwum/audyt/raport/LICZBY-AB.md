# Raport audytu – LICZBY-AB (liczby z ekranów bloków A–B wobec wyroczni)

- Data: 03.11.2026; wersja 1.15.4 z GitHub Releases (laboratorium `C:\FI-audyt`).
- Stany: odczyty bloków A–B zrobiono na stanie persony sprzed odnowienia – **`rok-ab`** (`C:\FI-audyt\stany\rok-ab`
  + `ictj-rok-ab`); jego pieniądze są identyczne z nowym **`rok`** (odnowiony 15:16), różnią się dni gry (w `rok-ab`
  zamrożone przed importem historii banku). Liczby pieniędzy porównane z wyrocznią na `rok-ab` w chwili odczytu, stany
  pochodne – na folderze przebiegu albo jego kopii odtworzonej na chwilę odczytu. Gra – od nowa na stanie `rok`
  (przebieg `pz-gra`, 16:16–16:17, skrypt `tests/audyt/pz-gra.spec.ts`, migawki `C:\FI-audyt\migawki\pz\`).
- Wyrocznia: `tests/audyt/wyrocznia/wyrocznia.mjs` w wersji **„2026-11-03 u2”** – po uzgodnieniu rozbieżności A–B
  (u1: `C:\FI-audyt\wyrocznia\rozbieznosci-ab.md` → `odpowiedzi-ab.md`) i bloku C (u2: `odpowiedzi-c.md`); poprawki:
  `docs/audyt/wyrocznia.md`, „Poprawki po uzgodnieniu”. Wszystkie porównania przeliczone na u1, potem na u2 (122 wejścia
  wyroczni – foldery, kopie, chwile odczytów; `C:\FI-audyt\wyrocznia\pz\u1\`, `pz\u2\`, różnice `pz\u2-roznice.json`)
  razem z pomocniczymi ocenami dni i masy. u2 w odczytach A–B nie zmienia żadnej porównanej liczby ani werdyktu: zmienia
  podział dawnego dokowania z 21.10.2025 (4 000 zł do kadłuba, obecne warstwy te same), kolejność pozycji Radaru (osłony po
  zdarzeniach te same), warstwy, cel kadłuba i zasięg miesięcy 10.2025–01.2026 (mniej niż 3 pełne miesiące – T27; w
  odczytach A–B niepokazywane), dzień następnej płatności opłaty zapłaconej przed terminem (miesiąc ten sam), masę ładunku
  w ułamku (napisy 30,9 % / 31,0 % i kwoty bez zmian) i konta bez salda (0,00 zamiast braku – jak aplikacja).
- Materiał: odczyty `C:\FI-audyt\odczyty\{kr,mo,sw,op,im,sa,dw,wy,ry,re,us,da}.jsonl` (370) i `pz.jsonl` (4); porównania
  odczyt po odczycie: `C:\FI-audyt\wyrocznia\pz\wynik-{kr,mosw,opim,dw,wyre,ry}.md`, stan pracy `pz\etap1.md`, tabela
  dni gry `pz\gra-dni-u2.md` (= `gra-dni-u1.md`). Raporty obszarów A–B bez zmian – werdykty liczb są tutaj.

## Podsumowanie

**67 punktów „LICZBY → AU-9”** (README raportu: KR 4, MO 9, SW 14, OP 13, ME 3, DW 5, WY 7, RY 1, RE 6, US 4 – z nich
US.5 i US.12 „→ AU-10”, DA 1): **ZGODNE 24 · NIEZGODNE 3 (K 0 / S 0 / N 3) · SPRZECZNOŚĆ WYMAGAŃ 36 · NIEPORÓWNYWALNE 4**.

- Żadna kwota pieniędzy nie jest zła (K brak): salda kont, warstwy, cele, zbiorniki, depozyt, koszty netto, przychody,
  przydział i energia, koperty, łupy, rozliczenia, pożyczki, dokowania, Radar, debriefingi, przeglądy roczne – zgodne
  z wyrocznią (u2) albo z jednym z jej wariantów.
- NIEZGODNE wśród 67 – tylko format stopy oszczędności („32%”, „55” zamiast jednego miejsca po przecinku – R-18, N):
  RY.23, RE.7, RE.10.
- Poza 67 punktami liczby są niezgodne w 7 punktach: KR.12 (S), MO.11 (S), MO.15 (S), WY.20 (S), RY.20 (N), RY.21 (N),
  RY.24 (N).
- Sprzeczności wymagań – aplikacja wybiera stale: S1 obcięcie zasięgu (poza symulatorem), S3 łupy z energii, S4 wariant
  B (1.15.3 – decyzja użytkownika), S6 / S7 T295, S8 / S9 wariant B gry, S10 każda opłata okresowa.
- Gra na nowym stanie: aplikacja = wyrocznia (wariant B) w ocenie każdego z 59 dni, w kwotach naruszeń, stopniu, serii,
  rekordzie, klasie, misji i osiągnięciach.
- Odczyty (374): ZGODNY 157 · ROZBIEŻNY 12 · SPRZECZNOŚĆ 142 · NIEPORÓWNYWALNY 26 · BRAK w wyroczni 37.

| plik | odczyty | ZGODNY | ROZBIEŻNY | SPRZECZNOŚĆ | NIEPORÓWNYWALNY | BRAK |
| --- | --- | --- | --- | --- | --- | --- |
| kr | 96 | 59 | 2 | 21 | 0 | 14 |
| mo | 37 | 6 | 2 | 28 | 0 | 1 |
| sw | 20 | 1 | 0 | 17 | 0 | 2 |
| op (OP + ME) | 34 | 25 | 0 | 6 | 0 | 3 |
| im | 28 | 17 | 0 | 3 | 0 | 8 |
| sa | 3 | 3 | 0 | 0 | 0 | 0 |
| dw | 56 | 19 | 0 | 13 | 24 | 0 |
| wy | 35 | 18 | 2 | 9 | 0 | 6 |
| ry | 27 | 2 | 4 | 21 | 0 | 0 |
| re | 12 | 4 | 2 | 5 | 0 | 1 |
| us | 18 | 2 | 0 | 12 | 2 | 2 |
| da | 4 | 0 | 0 | 4 | 0 | 0 |
| pz (gra, nowy stan) | 4 | 1 | 0 | 3 | 0 | 0 |
| **razem** | **374** | **157** | **12** | **142** | **26** | **37** |

Klasa odczytu: ROZBIEŻNY – co najmniej jedna liczba różna od wyroczni (u2) i od jej wariantów; SPRZECZNOŚĆ – wszystkie
równe, co najmniej jedna zależy od S… albo luki z wariantami w JSON; NIEPORÓWNYWALNY – gra stanu `rok-ab` sprzed
odnowienia, stany z grą dopisaną ręcznie, US.12 „od dziś” (zapis aplikacji z tej chwili nie zachował się); BRAK –
wielkość, której wyrocznia nie liczy (także odczyty puste).

**Rozbieżności z etapu 1 i odpowiedzi wyroczni.** POPRAWIONE (błąd wyroczni): R-1, R-2, R-3 (analogia – **do potwierdzenia
przez użytkownika**), R-5, R-6, R-10, R-12, R-14. POTWIERDZONE (błąd aplikacji): R-4, R-15, R-18. LUKA (warianty dopisane do
JSON, aplikacja = jeden z nich): R-7, R-8, R-9, R-11 (S4 – decyzja użytkownika), R-13, R-16, R-17, R-19. Po przeliczeniu na
u1 – jedna nowa: **R-20** (Mostek – termin asteroidy z dnia kontenera; strona aplikacji, wynika z odpowiedzi do R-10). Po
przeliczeniu na u2 – bez nowych pozycji i bez zmian werdyktów.

## Punkty LICZBY → AU-9 – werdykty liczb

| Punkt | Werdykt liczb | Uzasadnienie | Odczyty |
| --- | --- | --- | --- |
| KR.15 | ZGODNE | „6 697,46 zł → 6 700,00 zł”, „3 393,78 → 3 400,00” = średnia 6 mies. i propozycja pensji | kr:2, 35, 72 |
| KR.17 | ZGODNE | cele osłon / kadłuba 20 100 / 39 880,50 (6 × 6 646,75), przy 4 / 9 – 26 800 / 59 820,75 | kr:3–5 |
| KR.21 | SPRZECZNOŚĆ WYMAGAŃ – propozycje kopert do najbliższych 10 zł (T47, D70: kierunek niejasny) | plan kreatora i miesiąca startu zgodne; po u1 przydział 54,45 i wydane 45,40 (R-2), koperty planowe Auto 210 / Zdrowie 129 (R-3 – analogia, do potwierdzenia przez użytkownika) = aplikacja | kr:8, 11, 41–43, 48, 50, 78–80, 85, 87 |
| KR.25 | ZGODNE | „do planu (1 136,63 zł)”, „(360,00 zł)”, odkładki 1 400 → 1 280, WARTA 400 / 480 | kr:45–47, 82–84 |
| MO.2 | SPRZECZNOŚĆ WYMAGAŃ – S6 (T295) | energia 77,28 = 89,28 − 12,00; przydział i podstawowy zgodne | mo:1 |
| MO.3 | SPRZECZNOŚĆ WYMAGAŃ – S6 | −53,43, 78,57 i rozbicie w stanie brzegów zgodne; daty pożyczek w tej odprawie – luka R-7 / R-8 | mo:14 |
| MO.5 | SPRZECZNOŚĆ WYMAGAŃ – S6 | rozbicie przydziału zgodne, też po łupach 300 „na następny” (93,33 / 100,00 / 88,00) | mo:3, 23 |
| MO.6 | SPRZECZNOŚĆ WYMAGAŃ – S1 (obcięcie T218) | 51 566,30 / 6 530,87 = 7,896 → „7,8”; cele zgodne | mo:6 |
| MO.14 | SPRZECZNOŚĆ WYMAGAŃ – S4 (wariant B) | Tata 150 / 40 dni / zwrot 50, Mama 150 / 35 dni zgodne; Marek = B | mo:25 |
| MO.21 | SPRZECZNOŚĆ WYMAGAŃ – S4 (B), Z1 | warstwy sumują się do sald (rok, mo-c1, mo-g); cele i depozyt = B; łupy osobno | mo:29, 32, 36 |
| MO.23 | SPRZECZNOŚĆ WYMAGAŃ – S1 | 7,8, Niszczyciel, 6 530,87 | mo:33 |
| MO.26 | SPRZECZNOŚĆ WYMAGAŃ – S4 (B) | Marek 360 od 20.08 (75 dni), razem 360 (A: 300 od 24.09, 40 dni) | mo:9 |
| MO.27 | ZGODNE | 12 kwot przychodów i +3 166,67 | mo:10 |
| SW.1 | SPRZECZNOŚĆ WYMAGAŃ – S6 | 77,28 = Mostek | sw:1 |
| SW.4 | SPRZECZNOŚĆ WYMAGAŃ – S6 | 77,28 → 53,88 | sw:2 |
| SW.5 | SPRZECZNOŚĆ WYMAGAŃ – S6 | 53,88 → 3,88; −446,12 | sw:3 |
| SW.6 | SPRZECZNOŚĆ WYMAGAŃ – S6 | koperta Auto −50,00, energia miesiąca, poza kopertami 6 104,63 / 795,37 | sw:4, 20 |
| SW.7 | SPRZECZNOŚĆ WYMAGAŃ – S6 | 3,88 → −1,12 (140 / 28) | sw:5 |
| SW.8 | SPRZECZNOŚĆ WYMAGAŃ – S6, S4 (B) | osłony 13 000 → 14 000 (R9); po u1 z saldami na start domowników: cele 8 088,96, depozyt 4 847,20 = B | sw:7 |
| SW.9 | SPRZECZNOŚĆ WYMAGAŃ – S4 (Marek B; nowa wpłata najpierw spłaca – A), luka R-9 | po u1 wszystko zgodne: Tata 180 → zaliczka 120, Mama 90, Łukasz 50, osłony 14 050 → 14 230 → 14 530, depozyt 4 897,20 → 5 017,20, zasięg 8,0 → 8,1; masa „31,0%” – wariant zaokrąglony | sw:8 |
| SW.11 | SPRZECZNOŚĆ WYMAGAŃ – S4 (nowa wpłata = A) | po u1: Tata 180 + Mama 90 spłacone, 130 przychodu, osłony 13 000 → 13 400, razem 630 → 360 | sw:9 |
| SW.13 | SPRZECZNOŚĆ WYMAGAŃ – S6 | prezent 200 z osłon (13 330 → 13 130), energia bez zmian | sw:11 |
| SW.14 | SPRZECZNOŚĆ WYMAGAŃ – S6 | 43,95; części 33,33 / 33,33 / 33,35 (R1); Ania 33,33, Łukasz 103,35, razem 496,68 | sw:12 |
| SW.15 | SPRZECZNOŚĆ WYMAGAŃ – S6 | −72,72; Dom 262,55; Jedzenie 162,00 | sw:14–16 |
| SW.16 | SPRZECZNOŚĆ WYMAGAŃ – S6 | −36,05; Jedzenie 125,33; Ania 73,33, razem 536,68 | sw:13 |
| SW.21 | ZGODNE | salda teraz trzech kont przed i po | sw:6 |
| SW.27 | SPRZECZNOŚĆ WYMAGAŃ – S6 | −19,45 / −19,75 / −20,82 / −21,00 | sw:19 |
| OP.2 | ZGODNE | koszty IX / X / XI i całej historii, salda kont; Wpływy / Wydatki paska – brak w wyroczni | op:1–10 |
| OP.7 | NIEPORÓWNYWALNE – wyrocznia nie liczy meldunku „bez kategorii” | kontrola danych zgodna: 5 wydatków = 162,79 zł | op:16 |
| OP.15 | SPRZECZNOŚĆ WYMAGAŃ – S6, S3 | Portfel bez operacji jutra 3 918,89; energia 77,28 (T295), łupy 803,48 (A) | op:11 |
| OP.16 | ZGODNE | koszty XI i koperta Jedzenie 12,00 → −18,00 (zwrot towaru – Z4) | op:12, 19 |
| OP.20 | ZGODNE | mBank 69 747,04 | op:13 |
| OP.21 | ZGODNE | Portfel 2 107,10 / 2 327,10 / 2 107,10 | op:20 |
| OP.22 | ZGODNE | debriefing października na Planie: pula 1 766,52 / 2 500, FVG kopert | op:14 |
| OP.24 | ZGODNE | koszty VIII 6 043,49 przed i po „prezent od Marka” | op:15 |
| OP.29 | SPRZECZNOŚĆ WYMAGAŃ – S4 (B) | Marek 360 od 20.08 → 466,06 od 20.08 (A: od 24.09, 40 dni) | op:21, 25 |
| OP.31 | SPRZECZNOŚĆ WYMAGAŃ – S3, S6 | podgląd 66 913,10 i „o −2 833,94 zł”; łupy 969,54 (A) | op:23, 24 |
| OP.32 | SPRZECZNOŚĆ WYMAGAŃ – S6, S3 | podglądy +26,88 i +110,18 (faktycznie zaznaczone operacje z IX); Mostek bez zmian | op:28, 29 |
| OP.34 | SPRZECZNOŚĆ WYMAGAŃ – S6, S3 | salda przed / po 500 / po 600; energia bez zmian | op:18 |
| OP.35 | ZGODNE | salda przed, po połączeniu, po dopisaniu | op:26 |
| ME.4 | NIEPORÓWNYWALNE – jak OP.7 | 162,79 zgodne z danymi | op:17 |
| ME.6 | ZGODNE | salda bez zmian po połączeniu | op:27 |
| ME.7 | ZGODNE | Portfel 5 168,89 → 4 768,89 → 5 018,89 | op:30 |
| DW.9 | SPRZECZNOŚĆ WYMAGAŃ – S8, luka R-13 (aplikacja = wariant B) | na stanie przeliczonym i nowym kwoty przydziału = wyrocznia; 30.09 „219,54” = B (ujemny przydział jak 0; T227 dałby 332,74); `rok-ab` NP | dw:39, 46; pz:4 |
| DW.17 | ZGODNE (nowy stan) | seria 7 / rekord 7, pasek 30.09–01.11 = wyrocznia; `rok-ab` (seria 50) NP | dw:4, 47; pz:2, 3 |
| DW.24 | SPRZECZNOŚĆ WYMAGAŃ – S1, luka R-9 | klasa i zasięg w 4 stanach = obcięcie T218 (2,96 → „2,9” Korweta), „brakuje” w górę (T218); masa „31,0%” – wariant zaokrąglony | dw:1, 6, 35, 36, 37; pz:2 |
| DW.26 | ZGODNE (nowy stan) | „Koperta pod kontrolą”, Prezenty 37,33 zł (Z12-A); `rok-ab` Killzone NP | dw:51; pz:1, 2 |
| DW.30 | SPRZECZNOŚĆ WYMAGAŃ – S10 | 7 osiągnięć z datami = wyrocznia; Asteroida 15.09 – wariant „każda opłata okresowa”; ukrytych 6 = 13 (D73) − 7 | dw:7, 49; pz:2 |
| WY.3 | ZGODNE | salda, suma 73 610,57, 62 punkty krzywej | wy:1, 2 |
| WY.4 | ZGODNE (pochodna) | szczyt, drawdown −6 100,62, dołek 07.12.2025 – z punktów krzywej wyroczni | wy:3 |
| WY.5 | NIEPORÓWNYWALNE – BOS / CHoCH poza wyrocznią | poziomy znaczników = wartości punktów krzywej | wy:4 |
| WY.9 | NIEPORÓWNYWALNE – Killzones poza wyrocznią | – | wy:6–8 |
| WY.17 | SPRZECZNOŚĆ WYMAGAŃ – luka R-16 (mediana ze stóp zaokrąglonych) | 12 wierszy bilansu, mediany 28,4 % zgodne; „bez tradingu 14,8%” = wariant ze zaokrąglonych (dokładne 14,7) | wy:20 |
| WY.18 | ZGODNE | przychody kursu 7 500 / 9 750 / 9 458,33; kurs – poza wyrocznią | wy:21 |
| WY.22 | ZGODNE | cel kadłuba i koszty kategorii rok do roku; inflacja – poza wyrocznią | wy:22 |
| RY.23 | NIEZGODNE (N) | kwoty przeglądu 2025 zgodne; stopa „32%” zamiast „32,0%” (R-18); „31.12 roku wcześniej” = saldo otwarcia (luka R-19); zasięg S1 | ry:8 |
| RE.2 | SPRZECZNOŚĆ WYMAGAŃ – S6 | energia 77,28 na Mostku i w Raportach | re:1 |
| RE.5 | ZGODNE | „Koszty 89 349,97” = suma kosztów netto | re:2, 9 |
| RE.7 | NIEZGODNE (N) | 15 miesięcy CSV co do grosza (S2: czerwiec 2026 „nie” – T178; S3 – A); stopa 2025-10 „55” (R-18) | re:8 |
| RE.10 | NIEZGODNE (N) | debriefingi IX / X i przegląd 2025 w PDF zgodne (S3, S1); „stopa oszczędności 32%” (R-18); „31.12 roku wcześniej” – luka R-19 | re:10–12 |
| RE.12 | SPRZECZNOŚĆ WYMAGAŃ – S6 | kopia z ZIP = oryginał, energia 77,28 | re:3, 4 |
| RE.14 | ZGODNE | przychody 3 / 6 / 12 / mediana; 9 458,33 (okno netto) i 9 541,67 (średnia wierszy) – obie wyrocznia (R15) | re:5–7 |
| US.4 | ZGODNE | 17 610,29 i −889,71 (saldo otwarcia od 24.10, R3) | us:1, 2 |
| US.5 (→ AU-10) | ZGODNE (z raportu US.5 – odczytu w jsonl brak) | Rozrywka planowa 77,28 → 61,21; wszystkie planowe 0,00 = wyrocznia | – |
| US.7 | SPRZECZNOŚĆ WYMAGAŃ – S4 (B), S1 | cele osłon / kadłuba, osłony, kadłub (B 36 205,26), zasięg 8,4 | us:3–5, 15–18 |
| US.12 (→ AU-10) | SPRZECZNOŚĆ WYMAGAŃ – S4 (B); „od dziś” NIEPORÓWNYWALNE | od startu / 01.01.2025 / 01.09.2025: Marek 360 = B; „Anna ma oddać 150”: zaliczka 4 227,20 = u1; „od dziś” (Marek 300) – zapis sald na start w `fi.json` z tej chwili nie zachował się (AU-10) | us:6–14 |
| DA.33 | SPRZECZNOŚĆ WYMAGAŃ – S4 (B), S6, S1, S3 | 12 liczb × 4 odczyty = wyrocznia; DOM-PC = LAPTOP co do grosza | da:1–4 |

**Inne punkty bloków A–B z liczbami** (poza 67; liczby porównane tak samo):
- NIEZGODNE: KR.12 (S – R-4), MO.11 (S – R-20), MO.15 (S – R-20), WY.20 (S – R-15), RY.20 (N – R-18; luka R-17), RY.21
  (N – R-18; luka R-16), RY.24 (N – R-18; luka R-19) – opisy niżej.
- ZGODNE: KR.7, KR.8 (krok 6 dzieli 71 046,78 = środki na początek dnia startu – T51, u1; napis „Obecne środki” przy tej
  kwocie wobec „Suma kont budżetu: 70 988,88 zł” po starcie – tekst), KR.9, 10, 11 (po u1), 13, 14, 16 (po u1), 18, 19, 23,
  24, 28 (po u1); MO.13, 25, 30; OP.38, 39 (koszty),
  40; IM.14, 16, 21 (po u1), 26, 29, 30, 33, 34, 39 (stan odtworzony pośrednio), 41, 49, 51; SA.1, 3, 7; DW.1, 8 (po u1),
  10, 11, 12, 14, 16, 32; WY.6, 10, 11, 12, 14; RY.8.
- SPRZECZNOŚĆ WYMAGAŃ: KR.6 (S1), KR.20 (kopert do 10 zł); MO.7 (S4), MO.8 (S6 / S7), MO.9 (luka R-7 / R-8, S4), MO.20
  (S4, luka R-9), MO.22 (S4), MO.24 (luka R-9), MO.34 (S6 / S7); SW.12 (S6); IM.23 (S4 – P.3); DW.3, 6 (S6), DW.13 (S5),
  DW.15 (S6 / S7); WY.1 (S6 / S7), WY.2 (S6), WY.15 (S1), WY.16 (luka R-17); RY.1 (luka R-7 / R-8, S4, S6 / S7), RY.19
  (S3, S2).
- NIEPORÓWNYWALNE: SW.26, SW.32 (Wyprawy, liczba zapisów), IM.2, IM.22, IM.40 (liczniki importu), ME.8 (sygnały),
  WY.13 (marki), WY.24 (Wyprawy), DW.18, 19, 22, 28, 37 (gra ręczna albo `rok-ab`).

## NIEZGODNE – punkty LICZBY

### RY.23 – NIEZGODNE (N)
- Stan: rok (`ry-1`), 2026-11-03 12:04; wyrocznia `rok-ab` + przegląd z wartości miesięcznych (`p4.przegladRoczny` u1).
- Zrobione: Raporty → przegląd roczny 2025.
- Widać: „Bilans paliwa roku (przychody − koszty netto) | +11 984,55 zł · stopa oszczędności 32%”; „Pieniądze na kontach na
  początku (31.12 roku wcześniej) | 20 800,00 zł”; „styczeń 2025 0,00 zł 0,00 zł” … „sierpień 2025 0,00 zł 0,00 zł”.
- Oczekiwane: stopa 11 984,55 / 37 500 = 31,96 % → „32,0%” (T294 – jedno miejsce po przecinku). Wszystkie kwoty przeglądu
  (koszty 25 515,45, przychody 37 500, sfinansowane 618,28, na końcu 40 686,27, siła floty 33 784,55, kategorie) = wyrocznia.
- Odpowiedź wyroczni: R-18 POTWIERDZONE (format po stronie aplikacji, waga minimalna); R-19 LUKA – 20 800,00 wynika z T81
  (saldo z salda otwarcia wstecz), miesiące I–VIII „0,00 zł” zamiast „brak historii” – sprawa tekstu (już RY.24, S).
- Zrzut: RY.23-2025.png, RY.23-2025-dol.png.

### RE.7 – NIEZGODNE (N)
- Stan: rok (`re-6`, eksport miesięcy od 01.08.2025, plik `re-6-months.csv`), 2026-11-03 12:46.
- Zrobione: Raporty → eksport miesięcy do CSV.
- Widać: „2025-10;6500,00;5175,34;11500,00;tak;745,84;6324,66;55” (inne wiersze z jednym miejscem: „20,5”, „52,9”).
- Oczekiwane: stopa 6 324,66 / 11 500 = 54,997 % → „55,0” (T294); reszta 15 miesięcy (pensja, koszty, przychody, na plus –
  T178, łupy – wariant A, bilans) = wyrocznia.
- Odpowiedź wyroczni: R-18 POTWIERDZONE (także CSV „55”; waga minimalna).
- Zrzut: brak (plik CSV w folderze przebiegu `re-6`).

### RE.10 – NIEZGODNE (N)
- Stan: rok + re (`re-1`), PDF przeglądu 2025 (tekst z pdf.js), 2026-11-03 12:46.
- Zrobione: Raporty → PDF debriefingów IX i X 2026 oraz przeglądu 2025.
- Widać: „Bilans paliwa roku (przychody − koszty netto) | +11 984,55 zł · stopa oszczędności 32%”; „Pieniądze na kontach na
  początku (31.12 roku wcześniej) | 20 800,00 zł”.
- Oczekiwane: „32,0%” (T294); debriefingi IX / X (S3 – A) i pozostałe kwoty przeglądu = wyrocznia.
- Odpowiedź wyroczni: R-18 POTWIERDZONE; R-19 LUKA (prezentacja, kwota zgodna z T81).
- Zrzut: RE.10-przeglad-2025-1.png, RE.10-przeglad-2025-2.png.

## NIEZGODNE – inne punkty z liczbami

### KR.12 – NIEZGODNE (S)
- Stan: pusty folder + operacja ręczna mBank +5 dni −300 + kr-dzis.csv (przebieg `kr-salda`, powtórzenie `kr-salda-2`),
  2026-11-03 11:20 i 11:34.
- Zrobione: należność Ani 240, zaliczka Łukasza 300; krok 6; „Uruchom budżet”; Stan okrętu.
- Widać: krok 6 „Obecne środki: 9 682,17 zł”, „Osłony · bufor na pensje 9 682,17 zł”; po starcie osłony 2 740,07 zł,
  energia 6 642,10 zł, depozyt 300,00 zł, suma kont 9 682,17 zł.
- Oczekiwane: podział z początku dnia startu 9 740,07 zł (T51, T25 – dzisiejsze operacje 57,90 schodzą potem z energii);
  osłony po starcie 2 740,07 zł (depozyt 300 z osłon – T116; po u1 = aplikacja).
- Odpowiedź wyroczni: R-4 POTWIERDZONE – `warstwy.srodkiNaPoczatekDniaStartu` 9 740,07 (suma kont teraz 9 682,17); w
  kr-otwarcie (KR.8) krok 6 dzieli początek dnia 71 046,78 – dobrze, w kr-salda saldo teraz: ta sama funkcja z dwiema
  podstawami. R-1 POPRAWIONE (salda domowników na start – aplikacja ma rację).
- Zrzut: KR.12-krok6.png, KR.12-mostek.png.

### MO.11 – NIEZGODNE (S)
- Stan: `mo-c3` (dni płatności kontenerów zmienione w plikach – OC na 6), 2026-11-03 11:25.
- Zrobione: asteroidy na Mostku, Ładownia, Radar.
- Widać: „Asteroida: OC samochodu za 3 dni – 1 240,00 zł, w zbiorniku 1 240,00 zł.”, „Asteroida: Prąd za 14 dni –
  210,00 zł, w zbiorniku 210,00 zł.”; Ładownia i Radar tej samej aplikacji – OC 25.11, Prąd 20.11, Podatek 15.11.
- Oczekiwane (u1): dzień płatności z historii (T208, T221) – OC 2026-11-25 (22 dni), Prąd 2026-11-20 (17 dni), Podatek od
  nieruchomości 2026-11-15 (12 dni) – na Mostku asteroida Podatku, nie OC i Prądu.
- Odpowiedź wyroczni: R-10 POPRAWIONE (wyrocznia przeszła na T208) – „Mostek aplikacji z 06.11 (MO.11) jest niespójny z jej
  Radarem i Ładownią – strona aplikacji”; nowa pozycja R-20.
- Zrzut: MO.11-mostek-po-zmianie.png, MO.11-ladownia-po-zmianie.png.

### MO.15 – NIEZGODNE (S)
- Stan: `mo-c3`, 2026-11-03 11:25.
- Zrobione: odprawa z nietypowymi pozycjami (boja 06.11, zwrot po terminie, sygnały ładowni).
- Widać: „Asteroida: OC samochodu za 3 dni – 1 240,00 zł …”, „Asteroida: Prąd za 14 dni – 210,00 zł …” (jak MO.11);
  „Na koncie mBank zabraknie 5 413,96 zł na płatność 06.11 (Wesele Oli – prezent).”
- Oczekiwane (u1): brak na mBanku 5 413,96 zł 06.11 – zgodne (R-10: T208 i T274); asteroidy jak w MO.11 (R-20).
- Odpowiedź wyroczni: R-10 POPRAWIONE (kwota aplikacji 5 413,96 dobra); daty pożyczek w tej odprawie – luka R-7 / R-8.
- Zrzut: MO.15-odprawa.png.

### WY.20 – NIEZGODNE (S)
- Stan: rok (`wy-1` 12:01, `wy-2` 12:14).
- Zrobione: symulator manewrów – (a) zakup 10 000 zł z osłon w 12.2026, (b) 6 miesięcy bez wypłat z XTB, kurs „mediana”.
- Widać: „Zasięg i klasa | 7,9 mies. · Niszczyciel” (kolumna „teraz”); w tej samej chwili Prognoza zasięgu „starczy na
  7,8 mies.”, Mostek i Dowództwo „7,8 mies.”.
- Oczekiwane: 7,8 mies. – zasięg 7,8958 obcięty (T218: „Mostek, Ładownia, Raporty, Dowództwo i Wywiad tą samą funkcją”).
- Odpowiedź wyroczni: R-15 POTWIERDZONE – „teraz” symulatora liczy z całym długiem (T282), ta sama wartość 7,8958; napis
  7,9 to zaokrąglenie wbrew T218.
- Zrzut: WY.20-a.png, WY.20-b.png.

### RY.20 – NIEZGODNE (N)
- Stan: rok (`ry-1`), Raporty → debriefing 10.2025, 2026-11-03 12:04.
- Widać: „Stopa oszczędności | 55% (mediana 6 mies.: 25,7%)”.
- Oczekiwane: „55,0%” (T294; `p4.bilansPaliwa` 2025-10). Reszta debriefingów 09.2025, 10.2025, 09.2026, 11.2026 = wyrocznia.
- Odpowiedź wyroczni: R-18 POTWIERDZONE. Dziennik 09.2026 „Plan | 3 · 1 060,98 zł” (pełna kwota z częścią Marka 300) –
  R-17 LUKA (kwota własna 760,98 / pełna 1 060,98 – oba warianty w JSON).
- Zrzut: RY.20-raporty-2025-09.png (inny miesiąc; 10.2025 – odczyt ry.jsonl:6).

### RY.21 – NIEZGODNE (N)
- Stan: rok (`ry-1`), Plan miesiąca dla 09.2025–11.2026, 2026-11-03 12:05.
- Widać: plan 10.2025 „stopa oszczędności 55% (mediana 6 mies.: 25,7%)”; 08.2026 „mediana 6 mies.: 39,3%”, 05.2026 i
  04.2026 „mediana 6 mies.: 26,2%”.
- Oczekiwane: „55,0%” (T294); debriefingi 15 miesięcy (ok. 34 liczby każdy) = wyrocznia; mediany – wariant ze stóp
  zaokrąglonych (dokładne 39,4 i 26,1).
- Odpowiedź wyroczni: R-18 POTWIERDZONE; R-16 LUKA (`p4.bilansPaliwaMediany` – oba warianty).
- Zrzut: RY.21-plan-*.png.

### RY.24 – NIEZGODNE (N)
- Stan: rok (`ry-1`), przegląd roczny 2026, 2026-11-03 12:04.
- Widać: „+31 388,82 zł · stopa oszczędności 33%”.
- Oczekiwane: 31 388,82 / 95 000 = 33,04 % → „33,0%” (T294); kwoty przeglądu (koszty 63 611,18, przychody 95 000 – okno
  netto R15, sfinansowane 4 184,52, początek 40 686,27, koniec 73 610,57 / 69 673,37) = wyrocznia.
- Odpowiedź wyroczni: R-18 POTWIERDZONE.
- Zrzut: RY.23-2026.png.

## Gra na nowym stanie

Przebieg `pz-gra` (stan `rok` odnowiony 15:16, dni 04.09–01.11 zamrożone po imporcie historii), 2026-11-03 16:16–16:17;
odczyty `pz.jsonl` (Mostek, Dowództwo, pasek 35 dni, dziennik wachty – 40 wpisów), migawki `C:\FI-audyt\migawki\pz\`.
Wyrocznia (u1 i u2) na migawce = wyrocznia na `rok-ab` (poza Radarem). Ocena dni 04.09–29.09 (poza paskiem) – z dziennika: dzień
bez wpisu naruszenia = zgodny (sprawdzone na 33 dniach paska: każdy dzień „naruszenie” ma wpis i odwrotnie).

- **Ocena dni:** aplikacja = wariant B (S8 / S9 – tylko dzień przekroczenia koperty; ujemny przydział jak 0) w każdym z
  59 dni i w kwotach wszystkich naruszeń; wariant A różni się 19.09 (Auto 670,29), 22.09 (Zwierzęta 353,32), 25.09 (Auto
  684,93) i kwotą 30.09 (332,74). Dni zgodne 36 (A 33): wrzesień 13 / 27, październik 22 / 31, 01.11 zgodny.
- **Naruszenia (aplikacja = B):** 04.09 przydział 22,17 + koperta Zwierzęta 203,45 (poważne); 08.09 100,50; 10.09 Auto 51,24;
  11.09 7,31; 12.09 208,21 + Auto 290,29 (poważne) + cisza nocna Shell 239,05 (poważne); 13.09 94,52; 18.09 23,97; 20.09
  34,01; 23.09 136,31; 24.09 145,86; 26.09 43,05; 27.09 167,21; 29.09 118,80; 30.09 219,54; 03.10 139,46; 09.10 Dom 41,74;
  13.10 68,31; 17.10 110,98; 19.10 83,18; 21.10 8,20; 22.10 Prezenty 521,67 (poważne); 23.10 Dom 69,89 (poważne); 25.10 47,18.
- **Stopień:** „Kadet od startu gry (04.09.2026) Do stopnia chorążego 24 / 30 dni zgodne 24 (od 28.09 do 01.11)”, „Poważne
  naruszenia w tym miesiącu 0 / 3” = wyrocznia (Z12-A – bez misji minionych tygodni; okno 28.09, 24 dni).
- **Seria / rekord:** 7 / 7 (26.10–01.11); **klasa:** Niszczyciel każdego dnia (`game/` – destroyer), zasięg 7,8 (S1),
  „brakuje 1,2” (T218 w górę).
- **Misja W45:** „Koperta pod kontrolą – Prezenty i inne najwyżej 37,33 zł” = Z12-A, 200 × 7/30 × 80 %; „kurs utrzymany
  (0,00 zł)”.
- **Osiągnięcia:** Pełne osłony i Pancerny kadłub 10.09, Asteroida rozbita 15.09 (S10), Pierwsze dokowanie 19.09, Cisza w
  eterze 12.10, Cel osiągnięty 20.10, Seria 7 01.11 = wyrocznia; „Ukrytych: 6” = 13 (katalog D73) − 7.
- **Smaczki:** Judas Swing 10.09, 12.09, 23.09, 02.10, 22.10; Turtle Soup 12.09 = wyrocznia.
- **Mostek nowego stanu:** energia 77,28 / przydział 89,28 / podstawowy 83,33 (S6), „◆ Neutral” (S7), meldunki = wyrocznia
  (łupy 803,48 – S3-A, Marek 360 – S4-B, daty pożyczek – luka R-7 / R-8, Spotify „od 08.07 (3 terminy)”).
- **Gra `rok-ab` z bloku A** (Chorąży od 06.10, seria 50, Killzone, „08.09 … 54,11 zł”) – NIEPORÓWNYWALNA: dni zamrożone
  przed importem historii. `rok-przeliczona` (`dw-1`, gra zamrożona od nowa z importem) = nowy stan co do znaku.
- Stany z grą skonstruowaną (`rok-awans`, `rok-degradacja`, `rok-przerwa`) – NIEPORÓWNYWALNE; dni zamrożone od nowa mają w
  nich kwoty = wyrocznia, degradacja przy 3. poważnym w miesiącu (R25) spójna.
- Bieżący dzień („Dziś na razie”) w 10 stanach pochodnych (DW.3, 6, 10–13, 15, 16, 32) = ocena dnia regułami wyroczni
  (`rateDay`) – w tym progi 120 % / 10 %, koperta z limitem 0 – tylko zwykłe, minimum osłon przez decyzje dnia, firewall,
  cisza nocna bez „plan” i kontenerów (S5 – N-PC-19), „Liquidity sweep” przy energii 0,00. DW.8: „ocenione do 30.10.2026”
  przy parze ICTTJ czekającej na dokowanie = T163 (R-14 – poprawka wyroczni).

## Spójność między ekranami

- Zgodne: energia dziś 77,28 na Mostku, w szybkim wpisie, Planie, Raportach i odłączonej Odprawie (po zapisie 37,00 – 40,28
  wszędzie); salda kont Operacje = Ustawienia = Import; debriefing 10.2026 w Raportach = Planie miesiąca = przeglądzie 2026
  (09.2025, 10.2025, 09.2026 – Raporty = Plan); koszty kategorii w Wywiadzie = debriefingi = przeglądy = CSV; Mostek = kopia
  z ZIP; DOM-PC = LAPTOP; pasek gry = dziennik wachty; rozbicia (przydział, warstwy = suma kont, koszty = ładownia + koperty
  + pula, rozliczenia „razem”) sumują się.
- Niespójne: zasięg 7,8 na Mostku, w Dowództwie, Prognozie, Ustawieniach i Raportach, a 7,9 w symulatorze (WY.20, R-15);
  termin asteroidy na Mostku z dnia kontenera, w Radarze i Ładowni z historii (MO.11 / MO.15, R-20); krok 6 kreatora raz
  dzieli środki z początku dnia startu (kr-otwarcie, KR.8 – zgodnie z T51), raz saldo teraz (kr-salda, KR.12 – R-4), a jego
  „Obecne środki” różnią się od „Suma kont budżetu” po starcie bez objaśnienia; depozyt domowników 4 797,20 na Stanie okrętu, a widoczne zaliczki
  osób 4 737,20 – zaliczka Marka 60 zł nigdzie nie pokazana (MO.20, R-11); debriefing 09.2026 – Marek 300 w „sfinansowane
  przez domowników”, a w dzienniku „Plan 1 060,98” z jego częścią (RY.20, R-17); stopa oszczędności raz z miejscem po
  przecinku („52,9 %”), raz bez („55%”, „32%”, „33%”, CSV „55”) – R-18.
- Dwie różne wielkości, obie zgodne z wyrocznią: przychody 12 mies. 9 458,33 (okno netto) i 9 541,67 (średnia wierszy
  bilansu) – R15, bez objaśnienia w panelu (RE.14); ostatnia dostawa 20.10 (dzień operacji w banku) i 19.10 (dzień wpisu
  ICTTJ) – MO.7; suma pliku eksportu i pasek Operacji różnią się o przelewy własne 100,00 (OP.39 – wyrocznia nie definiuje
  Wpływów / Wydatków paska).

## Sprzeczności wymagań – co wybrała aplikacja

| Id | Aplikacja | Przykłady |
| --- | --- | --- |
| S1 zasięg | obcięcie T218 (7,8; 2,9 Korweta; 10,4; 8,4) – poza symulatorem (7,9) | MO.6, MO.23, DW.24, KR.6, US.7, WY.15; WY.20 |
| S2 „na plus” | T178 (wynik energii ≥ 0) – rozróżnia tylko 06.2026 („nie”, spec dałaby „tak”: 6 370,87 ≤ 6 500) | RY.21, RE.7 |
| S3 łupy | A – niewydana energia (803,48; 969,54; 59,00 po późnym imporcie) | MO.9, OP.31, RY.19, RE.10 |
| S4 wpłata domownika | B (1.15.3 `inflowKind`, członek z `inflow: advance`): Marek 360 od 20.08 (75 dni), zaliczka 60, depozyt 4 797,20, Wakacje 2 138,96; wpłata 14.09 z `covers` = EVENTIM nie spłaca wskazanego zakupu; nowe wpłaty z szybkiego wpisu – A (najpierw spłata). Różnica dat 20.08 / 24.09 – ta sama przyczyna. **Decyzja użytkownika** (R-11) | MO.9, 14, 20, 21, 26, OP.29, IM.23, US.7, US.12, DA.33, SW.9, SW.11 |
| S5 zakup nocny „plan” | N-PC-19 – bez naruszenia | DW.13 |
| S6 energia dziś | T295 – przydział − wydane dziś | MO.2, 3, 5, SW.*, OP.15, RE.2, RE.12, DW.3, 6, 15, WY.1, 2 |
| S7 Daily Bias | T295; Bearish pierwszy (osłony < minimum) | MO.8, MO.34, DW.15, WY.1 |
| S8 / S9 gra | B – koperta tylko w dniu przekroczenia; ujemny przydział jak 0 (także kwota 30.09 – R-13) | DW.9, DW.17, PZ |
| S10 Asteroida rozbita | każda opłata okresowa – 15.09.2026 | DW.30, PZ |
| Z1, Z3, Z4, Z6, Z8, Z9 | założenia główne wyroczni (łupy osobno, średnia do grosza, zwrot do energii, raty pożyczki w kosztach, import 27.10, przydział w dół) | MO.21, OP.16, WY.15 |
| Z11 | wpis ICTTJ sprzed startu bez pary – „sprzed startu” (D72 – wyrocznia przyjęła, R-6) | KR.28 |
| Z12 | A – misje tylko od pierwszego tygodnia działania aplikacji | DW.18, DW.26, PZ |
| Propozycje kopert (T47, D70) | do najbliższych 10 zł | KR.20, KR.21 |
| Luki z wariantami (u1) | R-7 / R-8 data „od” = termin raty; R-9 masa ładunku zaokrąglona (31,0 %); R-16 mediana ze stóp zaokrąglonych; R-17 dziennik – pełna kwota operacji; R-19 przegląd – zera przed historią | MO.9, RY.1, MO.20, MO.24, DW.24, WY.17, RY.21, WY.16, RY.20, RY.23 |
| R-3 (analogia wyroczni) | koperty planowe w miesiącu startu liczą wydatki od 1. dnia miesiąca – **do potwierdzenia przez użytkownika** | KR.21 |

## Brak w wyroczni

Wyrocznia nie liczy: BOS / CHoCH i drawdown (drawdown sprawdzony z jej punktów krzywej), Killzones, Wyprawy, marki,
osobistej inflacji, kursu 12 miesięcy i manewrów poza „teraz”, prognozy „z bojami” (sprawdzona pochodnie), anomalii i
sygnałów nietypowych operacji (ME.8), sygnału ceny kontenera niemiesięcznego (Prąd 210 → 419), zwrotu po terminie poza
Radarem (ALLEGRO), Wpływów / Wydatków paska Operacji i liczby operacji, liczników importu, meldunku „bez kategorii”, liczby
pozycji odprawy i plików ZIP, katalogu osiągnięć (zna 11 z 13 – bez Seria 100 i Snajper), progu misji bieżącego tygodnia
(37,33 – sprawdzony modelem Z12), oceny „Dziś na razie” (sprawdzona `rateDay`), pokryć kopert `envelopeCovers` (T279) i
chwili dodania kontenera w miesiącu (DW.14 – dzień naruszenia „ładunek” nieporównywalny), daty rozliczeń „od dziś” bez
zapisu aplikacji (US.12), kwoty „(26,67 zł)” przy WARTA w Ładowni (KR.19 – bez etykiety, do wyjaśnienia).
Pytanie do AU-11 (aplikacja = wyrocznia): KR.16 – pierwsza pensja odkłada pełne OC PZU 1 240 zł na termin opłacony 02.11,
przed startem budżetu (energia miesiąca 1 735,60; oczekiwanie raportu KR.16 – 3 015,60).
