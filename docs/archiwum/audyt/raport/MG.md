# Raport audytu – MG (Mapa gwiezdna)

- Data: 03.11.2026, 15:30–16:10 (zegar prawdziwy, Warszawa, wtorek); wersja 1.15.4 z GitHub Releases (laboratorium
  `C:\FI-audyt`); grupa AU-10, blok C.
- Stan danych: persona `rok` (kotwica 2026-11-03, wygenerowana 03.11.2026 15:17) z kopią folderu ICTTJ persony; stan
  `start`; stany zbudowane na kopiach `rok` i od zera (`seedFolder`) – tabela niżej. Stanów `brzegi` i `spec-dok`
  laboratorium nie ma.
- Przebiegi: `mg-0`, `mg-1`, `mg-2`, `mg-3a`–`mg-3c`, `mg-4`, `mg-5`, `mg-6` (`C:\FI-audyt\przebiegi\mg-*`, teksty ekranów
  w `out\`), skrypty `tests/audyt/mg-*.spec.ts` i `mg-pomoc.ts`, odczyty `C:\FI-audyt\odczyty\mg.jsonl` (55 odczytów, 55 migawek) –
  każdy z migawką folderu danych (i ICTTJ, jeśli przebieg go ma) z chwili odczytu: `C:\FI-audyt\migawki\mg\<punkt>-<n>`
  (pole `_migawka`; numer przy punkcie niżej), zrzuty `C:\FI-audyt\zrzuty\MG*.png`.
- Folder ICTTJ: w każdym przebiegu z ICTTJ sumy SHA-256 wszystkich plików kopii przed startem i po zamknięciu
  (`przebiegi\mg-*\ictj-sumy-*.json`) – aplikacja nie zmieniła żadnego pliku (`out\ictj-zmiany-aplikacji.txt` = `[]`
  w `mg-0`, `mg-1`, `mg-2`, `mg-5`, `mg-6`; w `mg-3a` i `mg-3c` kopia porównana po przebiegu z folderem stanu
  `stany\ictj-start` / `stany\ictj-rok` – 0 różnic); własne zmiany audytu (dopisana wypłata, zmiana scenariusza w MG.2)
  zapisane w `ictj-zmiany-audytu.log` i wyłączone z porównania.

**Podsumowanie (12 punktów):** ZGODNE 6 (MG.1, MG.2, MG.6, MG.7, MG.9, MG.11) · NIEZGODNE 3 (K 2: MG.8, MG.10; S 1: MG.12)
· UWAGA 2 (MG.3, MG.4) · LICZBY → AU-9 1 (MG.5) · NIE DO SPRAWDZENIA 0 · poza laboratorium 0. Liczby, które da się
policzyć wprost z punktu i zbudowanego stanu (podział puli Cele, raty kursu przechwycenia, raty z pensji, przeniesienia),
ocenione tu; tempo i ETA → AU-9.

**Znalezisko krytyczne:** przeniesienie środków celu działa w silniku „na koniec dnia” (T129), a ekran pokazuje je od razu –
dostawa i wydatek z celu tego samego dnia liczą się ze stanem celu sprzed przeniesienia: cel dostaje dostawę ponad swoją
kwotę (Rower 4 081,08 / 2 500 zł), następny cel nic; wydatek „z celu Rower (700,00 zł)” bierze z celu 0 zł albo 400 zł
zamiast 700 zł, resztę z osłon (MG.8, MG.10).

## Stany zbudowane

| Przebieg | Stan (zmiana przed startem albo przez interfejs) | Punkty |
| --- | --- | --- |
| `mg-0` | `rok` bez zmian | MG.5, MG.12 (odczyt bazowy) |
| `mg-1` | `rok`; plik `goals/01KAZ300000000000000000003.json` („Rower”): `archived=false`, `achievedAt=null`, `transfers=[]` (w silniku Rower persony nie miał pieniędzy – był zarchiwizowany bez historii, więc 0 zł); w kopii ICTTJ wypłata `01KMXAMGR00000000000000901` (Bieżące, 10 000 zł, 02.11.2026), w FI operacja `01KMXAMGR00000000000000001` mBank `trading` +10 000 zł 02.11.2026 „XTB S.A.” (para do zadokowania) | MG.1, MG.10, MG.11 |
| `mg-2` | `rok`; w kopii ICTTJ scenariusz `01KMXAMGRF0000000000000001` „Plan testowy” (PLN, `firstMonth` 2025-09): Laptop 5 000 (mies. 20 = 04.2027), Rezerwa bez kwoty (mies. 15 = 11.2026), Rezerwa grudniowa bez kwoty (mies. 16 = 12.2026), Stary cel 1 000 (mies. 18, `enabled: false`); scenariusz `…F0000000000000002` „Plan EUR” (EUR): Wyjazd do Rzymu 2 000 (mies. 20); wypłaty z 02.11.2026: pula Cele 6 000 zł (`01KMXAMGR00000000000000911`), Bieżące 8 000 zł (`…912`); w FI operacje mBank `trading`: +6 000 zł (02.11), +8 000 zł (02.11), +1 500 zł (27.10 – para wypłaty persony z puli Cele z 25.10, `01KAZ700000000000000000012`) | MG.2, MG.3, MG.4, MG.5, MG.12 |
| `mg-3a` | stan `start` (budżet od 03.11.2026) + cel własny „Rower” 2 000 zł przez interfejs | MG.5 |
| `mg-3b` | od zera (`seedFolder`): start budżetu 01.09.2026, mBank 26 000 zł na 01.09; pensja 4 000 zł od 09.2026 (bez kopert); koszty założone 2 000 zł; na start kadłub 12 000 zł i cele „Wakacje 2027” 1 200 zł (cel 6 000 zł, termin 2027-07) i „Remont balkonu” 800 zł (800 zł, termin 2026-08); „Kurs nurkowania” 0 zł (1 500 zł, termin 2026-10), „Rower” 0 zł (2 000 zł, bez terminu); cele aktywne od 01.08.2026; żadnych wpłat do celów we IX i X | MG.5, MG.6 |
| `mg-3c` | `rok`; przez interfejs: „Wakacje 2027” kwota 6 000 zł, termin 2027-07, 938,96 zł do osłon (stan 1 200 zł); „Nowy laptop” termin 2026-09; nowy „Kurs nurkowania” 1 500 zł z terminem 2026-10 | MG.6 |
| `mg-4` | od zera: start 01.09.2026, mBank 6 000 zł; osłony = 1 pensja, kadłub = 6 × koszty założone 500 zł; pensja 3 000 zł od 09.2026, bez kopert; na start kadłub 3 000 zł (osłony – reszta 3 000 zł); „Wakacje 2027” 6 000 zł, termin 2027-07, „rata z pensji” od 2026-08 (M-3), aktywny od 01.08.2026; 15.09 wydatek 2 454,55 zł (Jedzenie), 10.10 przychód 6 000 zł, 15.10 wydatek 3 000 zł – osłony i kadłub pełne 1.09 i 1.11, osłony puste 1.10 | MG.7 |
| `mg-5`, `mg-6` | `rok`; przez interfejs na początku: „Rower” → „przywróć”, „przenieś środki” 2 500 zł z „Nowy laptop” do „Rower”, nowy cel „Telewizor” 2 400 zł (0 zł); w trakcie (MG.9) w kopii ICTTJ wypłata Bieżące 9 000 zł z 03.11 (`01KMXAMGR00000000000000951`) i w FI jej para mBank +9 000 zł 03.11 (zapisane do folderu przy otwartej aplikacji). `mg-6` = `mg-5` z „Cofnij” klikanym w czasie toastu (w `mg-5` toast znikał przed kliknięciem – błąd skryptu) i z Rowerem przesuniętym na górę listy przed dostawą | MG.8, MG.9, MG.10, MG.12 |

## Punkty

### MG.1 – ZGODNE
- Stan: `mg-1`, 15:42–15:44; restart aplikacji w przebiegu.
- Zrobione: „Dodaj cel” bez nazwy; z nazwą „Telewizor” bez kwoty; „Telewizor” 2 400 zł, termin 2027-03; w „Wakacje 2027”
  kwota 0 (pole kwoty, Tab); ▲ przy „Wkład własny – mieszkanie”, ▼ przy „Nowy laptop”, przeciągnięcie „Telewizor” na
  „Wakacje 2027”; zamknięcie i ponowne uruchomienie.
- Widać: „Podaj nazwę celu.”; „Podaj kwotę celu.”; „Nowy cel „Telewizor” na końcu listy.” – Telewizor 6. (`priority` 6);
  kwota 0: „Podaj kwotę celu – cel bez kwoty nie dostaje dostaw (zarchiwizuj go, jeśli już niepotrzebny).”, pole wraca do
  „8 000,00”, w pliku `target` 800000. Kolejność po zmianach: Telewizor, Wakacje 2027, Nowy laptop, Wkład własny, Rower,
  Nowe stanowisko – kwoty bez zmian (Wakacje 5 520,04 zł, Nowy laptop 6 000,00 zł, reszta 0,00 zł) przed, po zmianie
  i po restarcie (ta sama kolejność).
- Oczekiwane: komunikaty z punktu, kwota 0 odrzucona z komunikatem, kolejność trwała, stany bez zmian (D84 C1).
- Odczyty: MG.1-1 (przed), MG.1-2 (po ▲ ▼ i przeciągnięciu), MG.1-3 (po restarcie). Zrzuty: MG.1-dodany.png,
  MG.1-kwota-0.png, MG.1-kolejnosc.png, MG.1-po-restarcie.png.

### MG.2 – ZGODNE
- Stan: `mg-2`, scenariusz „Plan testowy” wybrany w MG.4, 15:52–15:53.
- Zrobione: lista i panel „Prognoza ICTTJ”; w wierszu „Laptop” szukane pola nazwy i kwoty, „archiwizuj”; potem w kopii
  ICTTJ (plik scenariusza, nowy `updatedAt`) Laptop 5 000 → 5 500 i usunięta „Rezerwa” – bez restartu.
- Widać: cele ICTTJ na wspólnej liście ze znaczkiem „ICTTJ” (dymek „Cel scenariusza „Plan testowy” w ICTTJ (tylko do
  odczytu)”); w wierszu Laptopa 0 pól edycji i bez „archiwizuj”; panel „Plan testowy · 3 cele; nazwy i kwoty zmieniasz
  w ICTTJ.” (wyłączony „Stary cel” nie liczy się, nie ma go na liście ani w oknie dokowania). Po 2 s: „Laptop 5 000,00 zł
  / 5 500,00 zł · ETA grudzień 2026 · kurs przechwycenia: 100,00 zł/mies.”; „Rezerwa poza wybranym scenariuszem ICTTJ
  1 000,00 zł przenieś środki” w „Zarchiwizowane” – środki zostały (nagłówek „w celach 17 020,04 zł (w tym
  zarchiwizowane 1 000,00 zł)”).
- Oczekiwane: tylko do odczytu, nowa kwota bez restartu, cel usunięty – zarchiwizowany ze środkami (punkt, T66).
- Odczyty: MG.2-1, MG.2-2. Zrzuty: MG.2-przed.png, MG.2-po.png.

### MG.3 – UWAGA
- Stan: `mg-2` (Plan testowy), 15:52–15:53; potem „Plan EUR” (15:53).
- Zrobione: Mapa przy celach bez kwoty; okno dokowania wypłaty z puli Cele 6 000 zł z 02.11.2026 → „Zadokuj”; Ustawienia →
  ICTTJ → „Plan EUR” → „Zmień scenariusz” → Mapa.
- Widać: „0,00 zł / bez kwoty – pula Cele w listopad 2026” (dymek „Cel bez kwoty w ICTTJ: bierze wszystkie wypłaty z puli
  Cele w swoim miesiącu”), „… w grudzień 2026”; okno: „Do celu Laptop: 5 000,00 | Do celu Rezerwa: 1 000,00 | Do celu
  Rezerwa grudniowa: 0,00”, osłony 0,00 zł, cele własne 0,00 – po dokowaniu Laptop 5 000,00 „osiągnięty”, Rezerwa 1 000,00 zł,
  Rezerwa grudniowa 0,00 zł. EUR: w Ustawieniach „Scenariusz „Plan EUR” jest w EUR: FI liczy tylko w PLN, więc jego cele są
  na Mapie gwiezdnej bez kwoty. Wybierz scenariusz w PLN albo dodaj własne cele.”; na Mapie „Plan EUR · 1 cel; nazwy
  i kwoty zmieniasz w ICTTJ. Scenariusz w EUR – cele bez kwoty w PLN.” i „0,00 zł / 2 000,00 EUR – bez kwoty w PLN”.
- Oczekiwane: podział z punktu, liczony wprost (6 000 − Laptop 5 000 = 1 000 dla Rezerwy z 11.2026, 0 dla celu bez kwoty
  z 12.2026) – zgodny co do grosza; teksty EUR zgodne. **Uwaga (tekst):** „w listopad 2026”, „w grudzień 2026” – mianownik
  po „w” (poprawnie „w listopadzie 2026”; T281 – miesiąc w przypadku zależnym od przyimka).
- Odczyty: MG.3-1 (okno), MG.3-2 (po dokowaniu), MG.3-3 (EUR). Zrzuty: MG.3-dokowanie-600000.png, MG.3-po-6000.png,
  MG.3-eur-ustawienia.png, MG.3-eur-mapa.png.

### MG.4 – UWAGA
- Stan: `mg-2`; cel pierwszego scenariusza z pieniędzmi – „Wkład własny – mieszkanie” 1 500,00 zł (zadokowana wypłata
  z puli Cele, MG.12), 15:51–15:52.
- Zrobione: Ustawienia → ICTTJ → „Scenariusz” → „Plan testowy” → „Anuluj”; jeszcze raz → „Zmień scenariusz”; Mapa →
  „Zarchiwizowane (3)” → „przenieś środki” Wkładu własnego → do celu „Wakacje 2027”.
- Widać: „Cele scenariusza „Plan główny” zostaną zarchiwizowane: ich środki zostają w nich (przeniesiesz je na Mapie
  gwiezdnej), a nowe pieniądze trafią do celów scenariusza „Plan testowy”.” – „Zmień scenariusz” / „Anuluj”. Po „Anuluj”
  `fi.json` dalej `forecastId` Plan główny, wybór wraca, odczyt MG.4-2 = MG.4-1. Po „Zmień scenariusz”: „Wkład własny –
  mieszkanie poza wybranym scenariuszem ICTTJ 1 500,00 zł przenieś środki”, „Nowe stanowisko tradingowe … 0,00 zł”, na
  liście Laptop, Rezerwa, Rezerwa grudniowa; nagłówek „w celach 15 500,00 zł (w tym zarchiwizowane 1 500,00 zł)”.
  „przenieś środki”: „Środki celu „Wkład własny – mieszkanie” przechodzą do celu „Wakacje 2027”.” (z „Cofnij”), Wkład
  0,00 zł, suma w celach 15 500,00 zł bez zmian.
- Oczekiwane: nic przed potwierdzeniem, cele poprzedniego scenariusza zarchiwizowane z pieniędzmi – spełnione.
  **Uwaga (tekst):** punkt i T130 – potwierdzenie „z listą celów do archiwizacji”; pole podaje tylko nazwę scenariusza,
  bez celów i ich kwot.
- Odczyty: MG.4-1 … MG.4-4. Zrzuty: MG.4-potwierdzenie.png, MG.4-po-zmianie.png.

### MG.5 – LICZBY → AU-9
- Stan: `rok` (`mg-0`, 15:31), `mg-1` (kolejność), `mg-2` (wpłata bieżącego miesiąca), `mg-3a` (`start`), `mg-3b` (od zera,
  2 000 zł w celach od startu).
- Zrobione: panel „Tempo” i ETA w każdym stanie; zmiana kolejności (MG.1); dokowanie wypłaty z 02.11 (pula Cele 6 000 zł)
  – tempo przed i po.
- Widać: `rok` – „1 356,49 zł / mies. Średnio do celów w ostatnich pełnych miesiącach budżetu (do 6). ETA zakłada to samo
  tempo.”; „osiągnięty” (Nowy laptop), „ETA wrzesień 2027” (Wakacje), „ETA wrzesień 2029 – po terminie” (Wkład własny),
  „ETA grudzień 2029 – po terminie” (Nowe stanowisko) – zgodne z tempem w dwóch częściach (pula Cele (2 500 + 2 000) / 6 =
  750 zł najpierw do celów ICTTJ, reszta 606,49 zł po liście). Kolejność liczy się: Telewizor na końcu „ETA styczeń 2030 – po
  terminie”, na górze „ETA marzec 2027”, Wakacje z „kwiecień 2027” na „sierpień 2027”. Bieżący miesiąc nie wchodzi:
  przed i po dokowaniu 6 000 zł z 02.11 – „1 606,49 zł / mies.” (wzrost z 1 356,49 zł to para z 27.10 wypłaty z 25.10 –
  wpłata października). Środki na start nie wchodzą (`mg-3b`): „TEMPO 0,00 zł / mies.” przy 2 000 zł w celach od startu
  (z nimi byłoby 1 000 zł / mies.), ETA „ETA —”. `start`: „TEMPO —”, „Za mało historii: ETA pojawi się po pierwszym pełnym
  miesiącu budżetu.”, przy każdym celu „ETA —”.
- Oczekiwane: zachowanie z punktu – spełnione; kwoty tempa i ETA → wyrocznia. Tempo na ekranie to jedna liczba – części
  (pula Cele, reszta) nie są pokazane, odczyt „obie części” niemożliwy (spostrzeżenie).
- Odczyty: MG.5-1 (rok), MG.5-2 (tempo przed / po), MG.5-3 (start), MG.5-4 (od zera). Zrzuty: MG-0-mapa.png,
  MG.5-za-malo-historii.png, MG.6-bez-tempa.png.

### MG.6 – ZGODNE
- Stan: `mg-3b` (od zera, tempo 0), `mg-3c` (rok, tempo 1 356,49 zł), 16:06–16:10; cele z terminem także z `mg-1`, `mg-2`,
  `mg-3a`, `mg-6`.
- Zrobione: Mapa – napis kursu, dymek, kolor, ETA przy każdym celu.
- Widać: Wakacje 2027 (1 200 / 6 000, termin 2027-07): „kurs przechwycenia: 600,00 zł/mies. do 07.2027 · tempo 1 356,49
  zł/mies.” (szary – rata niższa niż tempo), dymek „4 800,00 zł do lipca 2027 – 8 pensji od grudnia 2026”; przy tempie
  0 ta sama rata w akcencie. Raty = brak / liczba pensji, w groszach w dół: 4 800 / 8 = 600,00; 2 400 / 4 = 600,00
  (Telewizor); 5 000 / 5 = 1 000,00 (Laptop ICTTJ); 2 500 / 6 = 416,66 (Nowy laptop po przeniesieniu); 40 000 / 15 =
  2 666,66; 25 276,94 / 15 = 1 685,12 (`start`) – wszystkie zgodne. Akcent przy racie wyższej niż tempo (Wkład własny
  2 666,66 > 1 356,49). „Kurs nurkowania” (termin 2026-10, 0 / 1 500): bez tempa „po terminie” w akcencie
  `rgb(232, 163, 61)`, dymek „Termin minął, a cel nie jest pełny”, pod nim „termin minął – brakuje 1 500,00 zł”; z tempem
  „ETA grudzień 2029 – po terminie” w akcencie. Osiągnięte po terminie („Remont balkonu” 800 / 800, termin 2026-08; „Nowy
  laptop” z terminem 2026-09) – „osiągnięty”, bez „po terminie”. Bez terminu („Rower”) – bez kursu.
- Oczekiwane: jak w punkcie (T272, T226) – spełnione. Reszta w ostatniej racie na Mapie niewidoczna (pokazana jest rata
  X); raty miesiąc po miesiącu – MG.7.
- Odczyty: MG.6-1 (od zera), MG.6-2 (rok). Zrzuty: MG.6-bez-tempa.png, MG.6-rok.png.

### MG.7 – ZGODNE
- Stan: `mg-4` (od zera, osłony i kadłub pełne 1.09 i 1.11, osłony puste 1.10), 16:06–16:08.
- Zrobione: Mapa (przełącznik „rata z pensji”), Plan miesiąca 09.2026, 10.2026, 11.2026 i 12.2026; wyłączenie przełącznika;
  Plan 11.2026 i 12.2026 jeszcze raz.
- Widać: IX – „Kurs przechwycenia – raty celów z terminem 545,45 zł · Wakacje 2027 do lipca 2027 545,45 zł”, debriefing
  „Energia miesiąca pensja 3 000,00 zł − raty celów 545,45 zł 2 454,55 zł”; X – bez wiersza rat, „Za mało w osłonach:
  3 000,00 zł z kadłuba (żółty alarm).”, debriefing „pensja 3 000,00 zł”; XI – „Kurs przechwycenia – raty celów z terminem
  606,06 zł”, „Energia miesiąca (pensja do wydania) 2 393,94 zł”, Mostek „Osłony 0,00 zł / 3 000,00 zł, Kadłub 3 000,00 /
  3 000,00” (rata z energii, nie z osłon); XII – „Kurs przechwycenia – raty celów z terminem gdy osłony i kadłub pełne
  1. dnia 606,06 zł”. Cel „1 151,51 zł / 6 000,00” (545,45 + 606,06). Po wyłączeniu: XI dalej 606,06 zł (pobrana), XII bez
  wiersza rat, cel 1 151,51 zł.
- Oczekiwane (policzone wprost): IX 6 000 / 11 = 545,45; X 0 (osłony niepełne – D13); XI 5 454,55 / 9 = 606,06; XII 4 848,49 / 8 =
  606,06; cel 1 151,51 zł; wyłączenie od następnego miesiąca, raty zostają – wszystko zgodne co do grosza.
- Odczyty: MG.7-1 (Mapa, Mostek), MG.7-2 (Plan IX–XII), MG.7-3 (po wyłączeniu). Zrzuty: MG.7-mapa.png, MG.7-plan-M-2.png,
  MG.7-plan-M-1.png, MG.7-plan-M0.png, MG.7-plan-M_1.png (XII), MG.7-po-wylaczeniu.png.

### MG.8 – NIEZGODNE (K)
- Stan: `mg-6` (rok; przez interfejs Rower przywrócony i 2 500 zł z „Nowy laptop”, Telewizor 2 400 / 0 zł), 16:00–16:02;
  wcześniej to samo w `mg-5` (15:54–15:58).
- Zrobione: „Rower” → „przenieś środki” → 3 000 i „całość”; 500 „do osłon (bufor)” → „Przenieś” → „Cofnij”; 500 do osłon;
  300 do „Telewizor”; potem (MG.9) Rower ▲ na górę listy i dostawa z ICTTJ Bieżące 9 000 zł z 03.11.
- Widać: okno „W celu jest 2 500,00 zł. Dokąd i ile przenieść?”; przy 3 000 przycisk „Przenieś” wyłączony, bez komunikatu
  (Enter i klik nie dają „Podaj kwotę od 0,01 zł do 2 500,00 zł.”); „całość (2 500,00 zł)” wpisuje „2 500,00”. 500 do osłon:
  „Środki celu „Rower” wracają do osłon.” – Rower 2 000,00, osłony 13 000 → 13 500; „Cofnij” – Rower 2 500,00, osłony
  13 000,00. Po 500 i 300: Rower 1 700,00, Telewizor 300,00, osłony 13 500,00 / 19 500,00, cele 7 638,96 (osłony + cele
  21 138,96 przed i po, suma kont 73 610,57 bez zmian) – widoczne od razu. **Dostawa tego samego dnia liczy cel sprzed
  przeniesień:** Mapa „1. 1 700,00 zł / 2 500,00 · ETA styczeń 2027 · DOL”, okno 9 000 zł: „Osłony 6 500,00 zł, Kadłub
  118,92, Rower 2 381,08, Nowy laptop 0,00” (Rowerowi brakuje 800 zł); po „Zadokuj” „Rower 4 081,08 zł” przy celu
  2 500 zł, „Nowy laptop” 3 500 / 6 000 – nic. W `mg-5` (Rower na 3. miejscu): Mapa „Nowy laptop 3 500,00 / 6 000,00 ·
  DOL” po przeniesieniu z niego 2 500 zł, okno 9 000 zł: „Nowy laptop: 0,00 | Wakacje 2027: 2 381,08”.
- Oczekiwane: Rower −500 / osłony +500, Rower −300 / Telewizor +300 – spełnione; 3 000 – komunikat „Podaj kwotę od 0,01 zł do
  2 500,00 zł.” – brak (tylko wyłączony przycisk); „Rower dalej aktywny i bierze dostawy” – bierze w złej kwocie: silnik
  przenosi „na koniec dnia” (T129, wątpliwość z punktu), więc dostawa z tego dnia widzi cel jak przed przeniesieniami
  (pusty, gdy pieniądze przyszły przeniesieniem; pełny, gdy wyszły). Skutek trwały: cel ponad swoją kwotę, następny cel
  bez dostawy, znaczek DOL wskazuje inny cel niż dostawa (MG.12).
- Kroki do powtórzenia: `rok` → Mapa → Rower „przywróć” → „przenieś środki” 2 500 zł z „Nowy laptop” do „Rower” → z Rowera
  500 do osłon i 300 do innego celu → ▲ Rower na górę → tego samego dnia zadokować wypłatę Bieżące 9 000 zł (para
  w mBanku) → okno: Rower 2 381,08; po dokowaniu Rower 4 081,08 / 2 500.
- Odczyty: MG.8-5 … MG.8-7 (mg-6), MG.8-2 … MG.8-4 (mg-5), MG.12-6 (przed dostawą), MG.9-8 (okno), MG.9-9 (po dostawie).
  Zrzuty: MG.8-przed.png, MG.8-3000.png, MG.8-po.png, MG.9-dostawa.png.

### MG.9 – ZGODNE
- Stan: `mg-6`, Telewizor 300 zł (z MG.8), 16:01–16:02.
- Zrobione: „archiwizuj” → „do osłon (bufor)” → „Cofnij”; „do celu” Rower → „Cofnij”; „zostaw w celu”; Mostek; dostawa
  9 000 zł i „Podział łupów” przy zarchiwizowanym Telewizorze; „Zarchiwizowane (1)” → „przenieś środki” do Rowera →
  „przywróć”.
- Widać: „Archiwizacja celu „Telewizor” – W celu jest 300,00 zł. Od dziś nie trafią do niego nowe pieniądze. Co z tymi,
  które są?”; toasty „Cel „Telewizor” zarchiwizowany – jego środki wracają do osłon, nowe już nie trafiają.”, „… – jego
  środki przechodzą do celu „Rower”, nowe już nie trafiają.”, „… – jego środki zostają w nim, nowe już nie trafiają.”
  (każdy z „Cofnij”, który przywraca Telewizor 300,00 i Rower 1 700,00); po „zostaw” „Telewizor 300,00 zł przenieś środki
  przywróć”, nagłówek „w celach 7 638,96 zł (w tym zarchiwizowane 300,00 zł)” = Mostek „Układy gwiezdne · cele 7 638,96
  zł”. Zarchiwizowanego nie ma w oknie dokowania ani w „Podział łupów” („cel: Nowy laptop / Wakacje 2027 / Rower / Wkład
  własny / Nowe stanowisko”). „przenieś środki” → „Środki celu „Telewizor” przechodzą do celu „Rower”.”, Telewizor 0,00,
  Rower +300; „przywróć” – Telewizor wraca na listę.
- Oczekiwane: jak w punkcie – spełnione.
- Odczyty: MG.9-5 … MG.9-11 (mg-6; MG.9-1 … MG.9-4 – mg-1 i mg-5). Zrzuty: MG.9-okno.png, MG.9-zarchiwizowany.png,
  MG.9-dostawa.png.

### MG.10 – NIEZGODNE (K)
- Stan: trzy przebiegi – `mg-1` (Rower 2 500 zł z dostawy, potem 1 800 zł do osłon = 700 zł), `mg-5` i `mg-6` (pieniądze
  Rowera przyszły tego dnia przeniesieniem z „Nowy laptop”, potem przeniesienia do osłon do 700 zł); 15:49, 15:59, 16:03.
- Zrobione: Operacje → Ctrl+N → 900 zł, „Sklep rowerowy”, kategoria „Rozrywka i hobby”, „Z celu: Rower (700,00 zł)” → Esc;
  Mapa, Mostek (warstwy, „skąd cele osłon i kadłuba?”, Koperty), Plan miesiąca.
- Widać: notka „Wydatek schodzi z celu – bez energii i koperty; czego w celu brakuje, bierze osłony.”, w pliku `goalId` =
  Rower. `mg-1`: Rower 700 → 0,00, osłony 21 300 → 21 100 (−200) – zgodnie. **`mg-5`: Rower 700,00 → 700,00, osłony
  21 300,00 → 20 400,00 (−900), cele 8 720,04 bez zmian; `mg-6`: Rower 700,00 → 300,00 (−400), osłony 23 681,08 →
  23 181,08 (−500).** W każdym: energia dziś 77,28 zł bez zmian, koperta „Rozrywka i hobby 0,00 / 450,00 zł” bez zmian,
  „Koszty miesiąca 6 530,87 zł” i „Cel kadłuba: 6 × koszty miesiąca 39 185,22 zł” bez zmian; wiersz listy „03.11 wt 16:03
  Sklep rowerowy mBank Rozrywka i hobby ? −900,00”.
- Oczekiwane: cel płaci 700, osłony 200 (T131, T24). Gdy pieniądze celu przyszły przeniesieniem tego samego dnia (T129 – „na
  koniec dnia”), wydatek bierze z celu mniej, niż pokazują Mapa i lista w edytorze („Rower (700,00 zł)”), resztę z osłon;
  w `mg-5` cel nie zapłacił nic. Zła kwota w warstwach, trwała (ten dzień silnik liczy zawsze tak samo). Poza tym (tekst):
  lista pokazuje kategorię, nie „z celu” (punkt: „na liście „z celu”, nie „bez kategorii”” – „bez kategorii” nie ma).
- Kroki do powtórzenia: `rok` → Mapa → „przenieś środki” 2 500 zł z „Nowy laptop” do przywróconego „Rower” → z Rowera do osłon
  tyle, żeby zostało 700 zł → Operacje → wydatek 900 zł „Z celu: Rower (700,00 zł)” → Rower 700,00, osłony −900.
- Odczyty: MG.10-1, MG.10-2 (mg-1), MG.10-3, MG.10-4 (mg-5), MG.10-5, MG.10-6 (mg-6). Zrzut: MG.10-edytor.png.

### MG.11 – ZGODNE
- Stan: `mg-1` (Rower 0 zł, Telewizor zarchiwizowany 0 zł, Nowy laptop 6 000 zł, Wakacje 5 520,04 zł z wliczoną
  niezadokowaną wypłatą 10 000 zł), 15:47–15:48.
- Zrobione: stany celów; kwota Wakacji 8 000 → 9 000, Rower przeciągnięty na górę, nowy „Konsola” 1 500 zł, „Nowy laptop”
  zarchiwizowany „zostaw w celu”; stany; zadokowana wypłata Bieżące 10 000 zł.
- Widać: przed – Wakacje 5 520,04, Nowy laptop 6 000,00, reszta 0,00; po zmianach te same kwoty (Nowy laptop 6 000,00
  w „Zarchiwizowane”, nagłówek „(w tym zarchiwizowane 6 000,00 zł)”); okno dokowania: osłony 6 500,00, kadłub 118,92,
  „Do celu Rower: 2 500,00 | Do celu Wakacje 2027: 881,08”; po dokowaniu Rower 2 500 „osiągnięty”, Wakacje 3 020,04
  (cel 9 000), suma w celach 11 520,04 zł bez zmian.
- Oczekiwane: stany bez zmian po samej zmianie, nowa dostawa według nowej kolejności i kwot – spełnione (Rower pierwszy,
  zarchiwizowany pominięty). Spostrzeżenie: Wakacje przy dokowaniu spadły z 5 520,04 do 3 020,04 zł – niezadokowana
  wypłata była wliczona zwykłą kolejnością z chwili zapisu operacji (T163), zadokowana poszła według kolejności z chwili
  dokowania (T128).
- Odczyty: MG.11-1 … MG.11-4. Zrzuty: MG.11-po-zmianach.png, MG.11-dokowanie.png, MG.11-po-dostawie.png.

### MG.12 – NIEZGODNE (S)
- Stan: `rok` (`mg-0`), `mg-2` (kilka wypłat czekających na dokowanie), `mg-5` / `mg-6` (przeniesienia środków tego dnia).
- Zrobione: znaczki i dymki na Mapie; okna dokowania kolejnych dostaw.
- Widać: `rok` – „DOL” przy „Wakacje 2027” (dymek „Draw on Liquidity – tu popłynie następna dostawa do celów”), „DOL ·
  pula Cele” przy „Wkład własny – mieszkanie” (dymek „Następna wypłata z puli Cele w ICTTJ trafi najpierw tutaj – do
  pierwszego niepełnego celu z prognozy ICTTJ”); wypłata z puli Cele 1 500 zł – do Wkładu własnego, nadwyżka 10 000 zł
  (`mg-1`) – do celu z DOL: zgodnie. **Niezgodnie:** (1) `mg-2`: Mapa „Wakacje 2027 8 000,00 zł / 8 000,00 · osiągnięty”,
  DOL przy „Wkład własny”, a okno Bieżące 8 000 zł: „Do celu Wakacje 2027: 4 361,04 | Do celu Wkład własny – mieszkanie:
  3 020,04” – najpierw cel pokazany jako osiągnięty (Mapa wlicza niezadokowane wpływy zwykłą kolejnością, T163; okno liczy
  inaczej); (2) `mg-5`: „Nowy laptop 3 500,00 zł / 6 000,00 · DOL”, okno 9 000 zł „Nowy laptop: 0,00 | Wakacje 2027:
  2 381,08”; (3) `mg-6`: DOL przy Rowerze dostaje 2 381,08 zamiast brakujących 800 (MG.8).
- Oczekiwane: znaczek przy celu, który dostaje następną dostawę – w (1) i (2) wskazuje inny cel.
- Kroki do powtórzenia: (2) – MG.8 bez przesuwania Rowera: po „przenieś środki” z pierwszego celu dostawa tego dnia omija go
  mimo DOL; (1) – trzy wypłaty z ICTTJ z parami w mBanku czekające na dokowanie, okno pierwszej z puli Bieżące.
- Odczyty: MG.12-1 (rok), MG.12-2 … MG.12-5 (mg-2), MG.12-6 (mg-6), MG.9-3 (mg-5, okno 9 000). Zrzuty: MG.12-start.png,
  MG.12-dokowanie-800000.png, MG.12-dokowanie-150000.png, MG.9-dostawa.png.

## Znaleziska

- MG.8 (K) – przeniesienie środków celu silnik wykonuje „na koniec dnia”, ekran od razu: dostawa tego samego dnia
  napełnia cel ponad kwotę (Rower 4 081,08 / 2 500 zł), następny cel nic nie dostaje; brak komunikatu „Podaj kwotę od
  0,01 zł do 2 500,00 zł.” (tylko wyłączony przycisk).
- MG.10 (K) – wydatek „z celu” po przeniesieniu środków do celu tego samego dnia bierze z celu 0 zł (`mg-5`) albo 400 zł
  (`mg-6`) zamiast 700 zł, resztę z osłon – Mapa i edytor pokazują 700 zł w celu.
- MG.12 (S) – „DOL” wskazuje cel, który nie dostaje następnej dostawy: po przeniesieniu środków tego dnia i przy kilku
  wypłatach czekających na dokowanie (Mapa liczy je zwykłą kolejnością, okno dokowania inaczej).

## Spostrzeżenia

- Mapa i Mostek wliczają wpływ z XTB czekający na dokowanie zwykłą kolejnością (T163), bez oznaczenia, że to kwota
  tymczasowa: w `mg-2` „Wakacje 2027 9 500,00 zł / 8 000,00 · osiągnięty” po zadokowaniu innej wypłaty spadły do
  5 020,04 zł; w `mg-1` cel spadł o 2 500 zł przy dokowaniu własnej dostawy (MG.11). Dla kapitana pieniądze „przeskakują”
  między celami przy każdym dokowaniu.
- Panel „Tempo” pokazuje tylko sumę – części (pula Cele i reszta), od których zależą ETA celów ICTTJ i własnych, nie są
  widoczne; ETA celów ICTTJ trudno zrozumieć bez nich.
- Przy kwocie przeniesienia ponad stan celu przycisk „Przenieś” jest wyłączony bez słowa dlaczego (komunikat z
  `confirm` nigdy się nie pokazuje); to samo przy 0.
- Mapa pozwala przenieść środki do celu już pełnego (MG.4: Wakacje 2027 „9 500,00 zł / 8 000,00”) – bez ostrzeżenia.
- „Rower” persony (zarchiwizowany z `achievedAt` i przeniesieniem 2 500 zł do osłon, bez historii `past`) w silniku nigdy
  nie miał pieniędzy – przeniesienie z 09.04.2026 jest puste (dane persony, AU-2; dla wyroczni).
- Wpłata Marka 14.09 (`inflowKind: advance`, `covers` = zakup EVENTIM) – Radar i Mostek dalej pokazują EVENTIM z 20.08 jako
  niespłacony („najstarszy zakup z 20.08 (75 dni)”) – do sprawdzenia w DM / AU-9.
- Strona miesiąca 12.2026 (bieżący „korzysta z planu …”) pokazuje „DEBRIEFING – PAŹDZIERNIK 2026” – debriefing ostatniego
  zamkniętego miesiąca także na stronach przyszłych miesięcy (PM).
- Narzędzie: `readStarmap` w pierwszych przebiegach nie znajdował panelu „Prognoza ICTTJ” (nagłówki panelu w `innerText` są
  wielkimi literami) – teksty panelu wzięte ze zrzutów MG.2-przed.png i MG.3-eur-mapa.png; poprawione w `mg-pomoc.ts`.
