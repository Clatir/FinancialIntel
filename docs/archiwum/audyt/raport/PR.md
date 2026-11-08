# Raport PR – Przekrój liczb (AU-9, blok C)

- Data: 03.11.2026, 15:30–16:20 (czas warszawski, zegar systemu bez zmian).
- Wersja: 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4\app\Financial Intel.exe`), laboratorium `C:\FI-audyt`.
- Stan danych: persona „rok” wygenerowana od nowa 03.11.2026 ok. 15:17 (kotwica 2026-11-03, start budżetu 2025-09-01;
  konta mBank / Portfel XTB / Gotówka; domownicy Anna, Kasia przez Annę, Marek; pożyczki dla Tomka i od rodziców;
  cele Nowy laptop, Wakacje 2027, Rower zarchiwizowany, 2 cele ICTTJ; 10 kontenerów; wypłaty ICTTJ), stan `start`
  (po kreatorze) i stany zbudowane w tym obszarze (niżej: „Zbudowane stany”).
- Skrypty: `tests/audyt/pr-1-rok.spec.ts`, `pr-2-energia.spec.ts`, `pr-3-ciag.spec.ts`, `pr-4-stany.spec.ts`,
  `pr-5-grosze.spec.ts`, `pr-6-zero.spec.ts`, `pr-7-specdok0.spec.ts`, `pr-8-raty.spec.ts`, `pr-9-cofnij.spec.ts`; pomoc
  `tests/audyt/pr-pomoc.ts`. Przebiegi
  `C:\FI-audyt\przebiegi\pr-…` (zrzuty tekstów w `out\`), zrzuty ekranu `C:\FI-audyt\zrzuty\PR*.png`, eksporty
  `C:\FI-audyt\eksport\pr-…`.
- Odczyty: `C:\FI-audyt\odczyty\pr.jsonl`; przed każdym odczytem migawka folderu danych przebiegu (i jego folderu ICTTJ)
  `C:\FI-audyt\migawki\pr\<punkt>-<n>\dane` (`\ictj`), bez `backups` i `.history` – ścieżka w polu `_migawka` odczytu.

**Podsumowanie (11 punktów):** ZGODNE 6 (PR.1, PR.2, PR.4, PR.5, PR.7, PR.8 – wszystkie z liczbami → AU-9) ·
NIEZGODNE 3 (K 0 · W 0 · S 3: PR.3, PR.9, PR.10; w PR.10 dodatkowo N) · UWAGA 0 · NIE DO SPRAWDZENIA 0 (w PR.11 chwile
23:00 i 8. dnia – zegar) · poza laboratorium 2 (PR.6, PR.11 – w PR.11 przełom 31.10 → 1.11 z historii sprawdzony, zgodny).
Odczytów 102 (`pr.jsonl`), migawek 68 (każdy odczyt wskazuje migawkę; odczyty PR.1–PR.4 jednego stanu szczególnego dzielą
jedną, odczyt PR.7 to ten sam odczyt ekranów co PR.1 rok – migawka PR.1-1). Znaleziska K: brak.

## Zbudowane stany

| Przebieg | Stan | Co zbudowane (przed startem albo przez interfejs) |
| --- | --- | --- |
| pr-1, pr-2, pr-5, pr-6 | rok | kopia `stany\rok` (pr-2: w `fi.json` dopisana kategoria główna „Bez koperty PR”, `envelope: null`, id `01KDEFCAT00000000000000950`) |
| pr-3, pr-3b | rok + ciąg zmian | kopia `rok`; w kopii ICTTJ dopisana wypłata `01KAZ7PR000000000000000001`: 02.11.2026, 1 000 zł, pula `tax`; plik `rok-nowe-historia.csv` skopiowany do przebiegu; zmiany przez interfejs (PR.1) |
| pr-4a | start | kopia `stany\start` (start budżetu 03.11.2026) |
| pr-4b | spec-dok + dostawa | `seedFolder`: start budżetu 01.11.2026, `initial` osłony 12 640 zł / kadłub 15 000 zł, koszty przyjęte 3 650 zł, plan 11.2026 pensja 4 000 zł bez kopert, saldo otwarcia mBank 27 640 zł (01.11); operacja `trading` +5 000 zł mBank 02.11.2026 „XTB S.A.” (bez wpisu ICTTJ) – po pensji 1.11: osłony 8 640 / 12 000, kadłub 15 000 / 21 900 |
| pr-7 | spec-dok przed dostawą | jak pr-4b, bez wpływu 5 000 zł |
| pr-4c1 | brzegi | pensja 5 000, `initial` osłony 8 000 (po pensji 3 000), kadłub 0, koszty przyjęte brak, brak historii |
| pr-4c2 | brzegi | jak c1 + `orders.minShieldSalaries: 4` przy `shieldSalaries: 3` (wpisane w pliku) |
| pr-4c3 | brzegi | pensja 5 000, osłony 25 000 (po pensji 20 000 / 15 000), kadłub 0, cel kadłuba nieznany |
| pr-4c4 | brzegi | jak c3 + koszty przyjęte 2 000 (cel kadłuba 12 000), kadłub 1 000 |
| pr-4c5 | brzegi | jak c4, kadłub 12 000 (pełny) |
| pr-4d1 | zasięg 11,96 | pensja 1 000, osłony 4 000 (po pensji 3 000), kadłub 8 960, koszty przyjęte 1 000 → 11 960 / 1 000 |
| pr-4d2 | zasięg 6,00 | jak d1, kadłub 3 000 → 6 000 / 1 000 |
| pr-8 | rok + raty | przez interfejs: pożyczka udzielona 1 000 zł / 3, wzięte 100 zł / 3 z kontenerem i bez, pierwsze raty 10.11.2026 |
| pr-9 | rok + PR.10 | przez interfejs: wydatek 1 000 000 zł → usunięcie → „Cofnij”, wypłata z XTB 999 999,99 zł na Portfelu XTB zadokowana, koperta Zwierzęta 0 zł + 10 zł, pensja grudnia 0 |

Wszystkie foldery z `seedFolder` mają jedno saldo otwarcia (mBank, 01.11.2026 = osłony + kadłub z `initial`), bez gry,
bez ICTTJ. Odczyty z przebiegu `pr-3` (pierwszy przejazd ciągu) dla kroków 2–5 i PR.4 mają w `state` dopisek „KROK NIE
WYKONANY” – skrypt nie trafił w wiersze dokowania (filtr kwoty bez twardej spacji) i podzielił łupy ponad kwotę, która
została po imporcie; migawki tych odczytów to stan po imporcie. Cały ciąg powtórzony poprawnie w `pr-3b`.

## Punkty

### PR.1 – ZGODNE (liczby → AU-9)
- Stan: rok (pr-1 15:33, pr-3b 15:47–15:50), start (pr-4a 15:51), spec-dok przed i po dostawie (pr-7, pr-4b), brzegi
  (pr-4c1–c5), zasięg 11,96 / 6,00 (pr-4d1, d2), PR.10 przed / po (pr-6). Odczyty PR.1 w `pr.jsonl` (migawki PR.1-1…).
- Zrobione: w każdym stanie Mostek → „Stan okrętu” (każda warstwa, „Suma kont budżetu”), Operacje → salda kont (pasek sum),
  Ustawienia → Konta („saldo teraz”); suma warstw liczona z ekranu. W `pr-3b` ciąg 11 zmian przez interfejs i odczyt po
  każdej: (1) import `rok-nowe-historia.csv` (27.10–02.11, „Nowe: 8 · połączone z wpisami: 2”), (2) dokowanie 3 200 zł
  (wpis ICTTJ 31.10, para mBank 01.11, propozycja), (3) dokowanie 1 500 zł (pula Cele, „Zadokuj na Portfelu XTB”),
  (4) dokowanie 1 000 zł (pula Podatek, podział ręczny: podatek 600, kadłub 100, Wakacje 2027 250, osłony 50),
  (5) podział łupów października (20 zł na następny miesiąc, 30 zł do Wakacje 2027, 9 zł do osłon), (6) przeniesienie
  500 zł z celu „Nowy laptop” do osłon, (7) przelew własny 200 zł mBank → Gotówka, (8) pożyczka udzielona 1 000 zł /
  3 raty, (9) szybki wpis „Za domownika” 80 zł – Marek, (10) wpłata 50 zł od Anny jako zaliczka na Gotówkę,
  (11) archiwizacja „Wakacje 2027” ze środkami w celu.
- Widać (rok): „Osłony 13 000,00 zł / 19 500,00 zł”, „Energia 6 204,63 zł”, „Kadłub 39 066,30 zł / 39 185,22 zł”,
  „Układy gwiezdne 8 138,96 zł”, „Zbiorniki 1 600,00 zł”, „Depozyt domowników 4 797,20 zł”, „Łupy · do podziału 803,48 zł”,
  „Dług 500,00 zł”, „Suma kont budżetu: 73 610,57 zł”; Operacje „mBank 69 747,04 zł · Portfel XTB 3 918,89 zł · Gotówka
  −55,36 zł”, Ustawienia → Konta te same. Suma warstw z łupami = 73 610,57 (bez łupów 72 807,09 – łupy są osobną warstwą
  i bez nich suma się nie zgadza); dług i należności nie wchodzą.
- Widać (ciąg, suma warstw = „Suma kont budżetu” = Operacje = Ustawienia po każdym kroku): 73 610,57 → (1) 75 937,09 →
  (2) 75 937,09 → (3) 77 437,09 → (4) 78 437,09 (nowa linia „Podatek · poza budżetem (PIT-38) 600,00 zł”) →
  (5) 78 437,09 (łupy znikają: osłony +9, energia +20, cele +30) → (6) 78 437,09 (osłony +500, cele −500) → (7) 78 437,09
  (mBank 71 873,56, Gotówka 144,64) → (8) 77 437,09 (osłony −1 000) → (9) 77 357,09 (osłony −20, depozyt −60 –
  „z zaliczki 60,00 zł; pożyczają osłony 20,00 zł”) → (10) 77 407,09 (depozyt +50) → (11) 77 407,09 („Układy gwiezdne
  9 418,96 zł” = Mapa „w celach 9 418,96 zł (w tym zarchiwizowane 2 418,96 zł)”). Różnica w każdym kroku: 0,00 zł.
- Widać (pozostałe stany): start 74 703,56 (osłony 13 400 + energia 6 700 + kadłub 39 880,50 + cele 14 723,06);
  spec-dok przed 27 640,00, po dostawie 32 640,00; brzegi 8 000 / 8 000 / 25 000 / 26 000 / 37 000; zasięg 12 960 i 7 000;
  PR.10 – patrz PR.10. Wszędzie suma warstw = suma kont = salda kont co do grosza.
- Oczekiwane: suma warstw (z łupami jako osobną warstwą) = „Suma kont budżetu” = salda kont w każdym stanie i po każdej
  zmianie (punkt) – spełnione; czy same warstwy są dobre – wyrocznia.
- Zrzuty: PR.1-rok-mostek.png, PR.4-dostawa-podatek.png, PR.1-archiwum-celu.png, PR.1-przelew.png, PR-pr-4*.png.

### PR.2 – ZGODNE (liczby → AU-9)
- Stan: rok (pr-1, pr-2), brzegi pr-4c1–c5, start pr-4a, spec-dok pr-4b / pr-7.
- Widać (rok): „Cel osłon: 3 × pensja 19 500,00 zł”, „Cel kadłuba: 6 × koszty miesiąca 39 185,22 zł”, „Koszty miesiąca
  (średnia z 12 mies.) 6 530,87 zł”; bez „wolne do decyzji” i bez „ponad cel osłon” (osłony 13 000 < 19 500). Okno średniej
  sprawdzone z ekranu: koszty netto z debriefingów 11.2025–10.2026 (7 962,41; 6 808,88; 6 436,06; 5 840,35; 6 772,32;
  6 045,23; 6 420,02; 6 370,87; 6 709,18; 6 043,49; 7 548,47; 5 413,19) = 78 370,47 / 12 = 6 530,87 – 12 pełnych miesięcy
  przed bieżącym, bez listopada (142,00 zł po wpisach pr-2) i bez 09–10.2025.
- Widać (brzegi): c1 – „Osłony (bufor na pensje) poniżej minimum o 2 000,00 zł.” (3 000 przy minimum 1 × 5 000), „Kadłub
  0,00 zł” bez celu, „Cel kadłuba: 6 × koszty miesiąca —”, „średnie koszty —”; c2 (minimum 4 pensje > cel 3 pensje
  w pliku) – „poniżej minimum o 12 000,00 zł” = min(4, 3) × 5 000 − 3 000; c3 – „ponad cel osłon: 5 000,00 zł – cel
  kadłuba jeszcze nieznany (za krótka historia kosztów), nie do dopłaty XTB”; c4 – „ponad cel osłon: 5 000,00 zł –
  kadłub niepełny, nie do dopłaty XTB” (kadłub 1 000 / 12 000); c5 – „wolne do decyzji: 5 000,00 zł” (kadłub 12 000 /
  12 000). Koszty przyjęte przy < 3 pełnych miesiącach: „Koszty miesiąca (założone w Ustawieniach) 3 650,00 zł” →
  „Cel kadłuba: 6 × koszty miesiąca 21 900,00 zł” (spec-dok), 2 000 → 12 000 (c4, c5).
- Oczekiwane: cel osłon = pensja × 3, minimum = min(minimum, cel) × pensja, cel kadłuba = 6 × średnie z 12 pełnych
  miesięcy (przy < 3 – przyjęte), „wolne do decyzji” tylko przy pełnym kadłubie, inaczej „ponad cel osłon …” z powodem
  (punkt, T181, T219) – spełnione.
- Zrzuty: PR.2-rok-cele.png, PR-pr-4c1.png … PR-pr-4c5.png.

### PR.3 – NIEZGODNE (S)
- Stan: rok (pr-1 15:34, pr-5 15:58), start (pr-4a), spec-dok przed / po (pr-7, pr-4b), zasięg 11,96 (pr-4d1),
  6,00 (pr-4d2), brzegi bez kosztów (pr-4c1–c3).
- Zrobione: zasięg i klasa odczytane na Mostku (stan okrętu, plakietka, rozbicie), w Dowództwie (klasa okrętu), Raportach
  (Przegląd roczny „Zasięg teraz”), Wywiadzie („paliwa starczy na …”, symulator manewrów „Zasięg i klasa”) i w Ładowni
  (symulacja nowego kontenera „Zasięg po dodaniu: X → Y”).
- Widać (zgodne): 11,96 → „11,9 mies.” i „Krążownik” na wszystkich ekranach, „Do klasy Flagowiec brakuje 0,1 mies.
  zasięgu.”; 6,00 → „6,0 mies.” „Niszczyciel” wszędzie; start „8,0 mies.” wszędzie; spec-dok po dostawie „7,8 mies.”
  wszędzie; bez kosztów (c1–c3) – „ZASIĘG —”, „KLASA —”, „Zasięg teraz —”, „Zasięg i klasa — —”, bez plakietki klasy;
  rozbicie rok „Osłony 13 000,00 · Kadłub 39 066,30 · Dług do spłaty −500,00 · Paliwo 51 566,30 · Koszty miesiąca
  (średnia z 12 mies.) 6 530,87 · Zasięg 7,8 mies.” (51 566,30 / 6 530,87 = 7,896 – obcięte do 7,8).
- Widać (niezgodne, rok): Mostek „ZASIĘG 7,8 mies.”, Dowództwo „zasięg 7,8 mies.”, Raporty „Zasięg teraz 7,8 mies.
  (Niszczyciel)”, Wywiad „Bez żadnej wypłaty paliwa starczy na 7,8 mies. (czerwiec 2027).”, Ładownia „Zasięg po
  dodaniu: 7,8 mies. → 7,7 mies.”, ale Wywiad → Symulator manewrów: „teraz po manewrze | Zasięg i klasa 7,9 mies. ·
  Niszczyciel 7,9 mies. · Niszczyciel” (przed manewrem, bez żadnej zmiany). 7,9 to zasięg bez odjęcia długu 500 zł
  ((13 000 + 39 066,30) / 6 530,87 = 7,97); w stanach bez długu (start, spec-dok, 11,96, 6,00) symulator zgadza się z Mostkiem.
- Oczekiwane: „ta sama liczba na wszystkich ekranach”; zasięg = max(0, osłony + kadłub − dług) / koszty (punkt, T71, T218).
- Kroki: persona rok → Ctrl+9 (Wywiad) → panel „Symulator manewrów”, wiersz „Zasięg i klasa”; porównać z Ctrl+1 „ZASIĘG”.
- Waga S: liczba różni się o 0,1 mies. i klasa ta sama, ale przy większym długu symulator pokaże wyższą klasę niż okręt ma.
  To samo co WY.20 (blok B) – potwierdzone na nowej personie.
- Zrzuty: PR.3-rok-wywiad-kurs.png, PR.3-rok-zasieg.png, PR.3-rok-dowodztwo.png, PR-pr-4d1.png, PR-pr-4d2.png.

### PR.4 – ZGODNE (liczby → AU-9)
- Stan: rok (pr-1), rok + dostawa z pulą Podatek i celem (pr-3b 15:48), rok + wydatki (pr-2), start, spec-dok, brzegi, 11,96, 6,00.
- Widać – energia (rok): „Koperty codzienne w tym miesiącu (plan i łupy) 2 500,00 · Wydane z nich do wczoraj 0,00 · Zostało
  na 28 dni (z dzisiejszym) 2 500,00 · Podstawowy przydział (limit / 30 dni) 83,33 · Zaoszczędzone wcześniej – na każdy
  dzień 5,95 · Przydział na dziś 89,28 · Wydane dziś −12,00 · Energia dziś 77,28” = Mostek „77,28 zł”; po wydatku
  wczorajszym (pr-2): „… Wydane z nich do wczoraj −30,00 · Zostało na 28 dni 2 470,00 · … 4,88 · Przydział na dziś 88,21 ·
  Wydane dziś −37,00 · Energia dziś 51,21”.
- Widać – dostawa z pulą Podatek i celem: „ostatnia dostawa (02.11.2026) – dokąd poszła?” → „Dostawa 1 000,00 zł ·
  Rezerwa na PIT-38 600,00 zł · Osłony 50,00 zł · Kadłub 100,00 zł · Cel: Wakacje 2027 250,00 zł” (600 + 50 + 100 + 250 =
  1 000); rok 20.10: „Dostawa 3 000,00 · Cel: Nowy laptop 861,04 · Cel: Wakacje 2027 2 138,96”; spec-dok „Dostawa 5 000,00 ·
  Osłony 3 360,00 · Kadłub 1 640,00”.
- Widać – zasięg i cele: linie składają się do wyniku we wszystkich stanach (np. start „13 400,00 + 39 880,50 = 53 280,50
  / 6 646,75 = 8,0 mies.”, „Cel kadłuba: 6 × koszty miesiąca 39 880,50” = 6 × 6 646,75).
- Widać – dymki i „?”: metafory z prawdziwą nazwą obok każdej („Osłony · bufor na pensje”, „Układy gwiezdne · cele”,
  „Zbiorniki · odkładki na opłaty okresowe”, „Podatek · poza budżetem (PIT-38)”, „Depozyt domowników · ich zaliczki – nie do
  wydania na siebie”, „Łupy · do podziału”, „Dług · pożyczki wzięte – odjęte od zasięgu”); dymki ze słowniczka mają Osłony,
  Energia, Kadłub, Zasięg, Dostawa i plakietka klasy; „?” w nagłówkach Dokowanie i Koperty (patrz Spostrzeżenia).
- Oczekiwane: linie każdego rozbicia sumują się do ostatniej linii = liczba na Mostku; dostawa: PIT-38 + osłony + kadłub +
  cele = kwota (punkt, T295) – spełnione.
- Zrzuty: PR.4-rok-energia.png, PR.4-rok-dostawa.png, PR.4-dostawa-podatek.png, PR.3-rok-zasieg.png, PR.2-rok-cele.png.

### PR.5 – ZGODNE (liczby → AU-9)
- Stan: rok + kategoria główna „Bez koperty PR” bez koperty (pr-2, 15:44–15:46).
- Zrobione: energia dziś na Mostku, w Planie miesiąca („Energia dziś … z …”) i w nagłówku szybkiego wpisu; szybki wpis:
  kwota pusta i „0”, potem zapisane po kolei: 25 zł Jedzenie dziś, 30 zł Jedzenie „wczoraj”, 40 zł Jedzenie z datą
  10.11.2026, 15 zł „Bez koperty PR”, 20 zł Dom (koperta planowa); po każdym zapisie odczyt trzech ekranów.
- Widać: przed – Mostek „77,28 zł”, Plan „77,28 zł z 89,28 zł”, szybki wpis „· energia dziś 77,28 zł”; kwota pusta i 0 –
  bez podglądu (nagłówek nadal 77,28); 25 zł – podgląd „Energia dziś: 77,28 zł → 52,28 zł”, po zapisie 52,28 na trzech
  ekranach; wczoraj 30 zł – „Energia dziś: 52,28 zł → 51,21 zł (wydatek z 02.11 – rozłożony na pozostałe dni)”, po
  zapisie 51,21 / „z 88,21 zł” wszędzie; data 10.11.2026 – „w przyszłości – do salda od 10.11”, „Data w przyszłości –
  energia dziś bez zmian.”, po zapisie 51,21 i energia miesiąca bez zmian (6 149,63); bez koperty – „Poza kopertami
  15,00 zł – energia dziś bez zmian (zmniejsza energię miesiąca: 6 149,63 zł → 6 134,63 zł).”, po zapisie dziś 51,21,
  miesiąc 6 134,63 na Mostku i w Planie; Dom – „Koperta Dom: 300,00 zł → 280,00 zł”, po zapisie „Dom 20,00 / 300,00 zł”,
  energia dziś 51,21, miesiąca 6 114,63.
- Oczekiwane: jedna liczba na trzech ekranach, podgląd = wynik, wczorajszy rozkłada się, przyszłość i bez koperty – bez
  zmian (punkt, T186) – spełnione.
- Zrzuty: PR.5-podglad-25.png, PR.5-po-25.png, PR.5-podglad-wczoraj.png, PR.5-podglad-przyszlosc.png,
  PR.5-podglad-bez-koperty.png.

### PR.6 – poza laboratorium (maszyna)
- Dymek ikony w zasobniku – sprawdza maszyna (`docs/audyt/maszyna.md`). W laboratorium liczby, z których dymek ma
  powstać, są na Mostku i w szybkim wpisie (PR.5).

### PR.7 – ZGODNE (liczby → AU-9)
- Stan: rok (pr-1, 15:33; ten sam odczyt PR.1, migawka PR.1-1).
- Widać (pary): osłony – Mostek „13 000,00 zł”, Radar: pierwsza pozycja z osłonami po zdarzeniu „04.09 spłata · Spłata:
  Pożyczka dla Tomka · spóźniona spłata · +500,00 zł · 13 500,00 zł” (13 000 + 500), boja 21.11 „−800,00 zł · 13 200,00 zł”,
  pensja 01.12 „6 500,00 zł · 6 700,00 zł”; cele – „Układy gwiezdne 8 138,96 zł” = Mapa „w celach 8 138,96 zł” (Rower
  zarchiwizowany 0,00 zł); masa ładunku – Mostek „31,0% · stałe koszty 2 014,32 zł/mies. · linia 40%” = Ładownia „Masa
  ładunku 31,0% pensji · linia 40% · 2 014,32 zł miesięcznie”; dług i należności – Mostek „Dług 500,00 zł”, „Domownicy mają
  oddać razem 360,00 zł”, „Pożyczki udzielone 1 000,00 zł” = Radar „Dług (pożyczki wzięte) 500,00 zł”, „Domownicy mają
  oddać razem 360,00 zł”, „Pożyczki udzielone 1 000,00 zł”; przychody – Mostek i Plan „Razem 9 500,00 · 9 666,67 ·
  9 458,33 · 9 750,00 zł” (praca 7 500,00 ×4, trading 2 000,00 · 2 166,67 · 1 958,33 · 2 250,00); energia miesiąca –
  Mostek „6 204,63 zł” = Plan „Energia miesiąca (pensja do wydania) 6 204,63 zł”; zbiorniki – Mostek „1 600,00 zł” =
  Ładownia → Odkładki 1 240,00 + 150,00 + 210,00. Po zmianach (pr-3b) pary cele i dług dalej równe.
- Oczekiwane: każda para identyczna co do grosza; masa ładunku z nazwą i kwotą (punkt) – spełnione.
- Zrzuty: PR.1-rok-mostek.png.

### PR.8 – ZGODNE (liczby → AU-9)
- Stan: rok (pr-1 15:34; pr-2 15:46 – eksport od 01.08.2025 po wpisach PR.5).
- Zrobione: Raporty → Debriefing 10.2026 (M-1), 11.2026 (M0), 09.2025; Plan miesiąca → Debriefing; PDF debriefingu
  10.2026 jawnie i przy ukrytych kwotach; Ctrl+$ → Raporty → Eksport → „Miesiące – CSV” i „Excel (operacje + miesiące)”;
  eksport „Miesiące” od 01.08.2025.
- Widać (M-1): Plan, Raporty i PDF – „Pensja od siebie 6 500,00”, „Koszty netto 5 413,19”, „Ładownia (kontenery i opłaty
  okresowe) 1 738,00”, „Sfinansowane przez domowników 169,86 zł (Anna)”, „Energia miesiąca 6 216,67”, „Wydane z energii
  5 413,19”, „Bilans paliwa +6 086,81”, „Stopa oszczędności 52,9% (mediana 6 mies.: 28,4%)”, „na plus – tak”, „Łupy
  803,48”; CSV przy ukrytych kwotach „2026-10;6500,00;5413,19;11500,00;tak;803,48;6086,81;52,9”, Excel „6500 | 5413.19 |
  11500 | tak | 803.48 | 6086.81 | 52.9” – prawdziwe kwoty (ekran: „••• zł”). M0: Raporty „Miesiąc zamknięty na plus –
  miesiąc trwa”, „Łupy – miesiąc trwa”; CSV i Excel „2026-11;6500,00;12,00;0,00;w toku;;-12,00;”. Przed startem: „2025-08;;
  0,00;0,00;;;0,00;” – łupy (i pensja) puste. PDF przy ukrytych kwotach – prawdziwe kwoty jak jawny.
- Oczekiwane: liczby eksportu i raportu = ekran, M0 „w toku”, miesiące przed startem bez łupów, eksport z prawdziwymi kwotami
  mimo ukrycia (punkt, T178, T215, T294) – spełnione. Pliki „Miesiące” nie mają kolumn „Energia” ani „Sfinansowane przez
  domowników” (te dwie liczby są tylko na ekranie i w PDF – patrz Spostrzeżenia).
- Pliki: `C:\FI-audyt\eksport\pr-1-miesiace-ukryte.csv`, `pr-1-ukryte.xlsx`, `pr-1-debriefing-2026-10.pdf`,
  `pr-1-debriefing-2026-10-ukryte.pdf`, `pr-2-miesiace-od-2025-08.csv`. Zrzuty: PR.8-raporty-2026-10.png, PR.8-ukryte-raporty.png.

### PR.9 – NIEZGODNE (S)
- Stan: rok (pr-5 15:58–15:59, pr-8 16:05).
- Zrobione: nowy kontener „Ubezpieczenie domu PR” stały, co rok, 1 240 zł, płatność 15.09.2027; w polu kwoty nowego
  kontenera, szybkiego wpisu i edytora operacji wpisane „12,345”, „1.200” (kontener także „1 200,5”), szybki wpis zapisany
  z kategorią; liczba rat pożyczki „2,5” i „2.5”; pożyczki: udzielona 1 000 zł / 3 raty, wzięta 100 zł / 3 raty
  z kontenerem w Ładowni, wzięta 100 zł / 3 raty bez kontenera (pr-8: pierwsza rata 10.11.2026, wszystkie raty w 90 dniach
  Radaru).
- Widać (zgodne): kontener roczny – „Opłata okresowa: co miesiąc z energii idzie rata do zbiornika (103,33 zł, ostatnia
  103,37 zł; w tym cyklu z wyrównaniem do terminu: 112,72 zł/mies. – odkładka).”, wiersz „1 240,00 zł · 103,33 zł/m(112,72 zł)”,
  Odkładki „termin wrzesień 2027 (za 10 mies.) 112,72 zł / 1 240,00 zł · Za planem o 93,94 zł – kolejne raty będą większe
  (rata wyrównawcza 112,72 zł/mies. zamiast nominalnej 103,33 zł/mies.)” (11 × 103,33 + 103,37 = 1 240,00; 2 × 103,33 −
  112,72 = 93,94); kontener i edytor operacji – „12,345” i „1.200” odrzucone: pole „0,00” i komunikat „Nieprawidłowa
  kwota – zostaje poprzednia.”, „1 200,5” → „1 200,50”; szybki wpis – „12,345” i „1.200” zostawiają pole puste (odrzucone,
  bez komunikatu), „Zapisz” nie zapisał żadnej operacji (Operacje: „Brak operacji dla wybranych filtrów.”) – nigdzie cicha
  zmiana na 12,35 ani na 1,20; liczba rat „2,5” / „2.5” – pole wraca do „1” (tylko całkowite); Radar (pr-8): „10.11 Spłata
  Pożyczka R1 +333,33 zł · 10.12 +333,33 zł · 10.01 +333,34 zł”, „Rata Kredyt R2 −33,33 · −33,33 · −33,34 zł”, „Rata
  Kredyt R3 −33,33 · −33,33 · −33,34 zł” – reszta w ostatniej racie; żadnej kwoty z ułamkiem grosza.
- Widać (niezgodne): kontener raty pożyczki wziętej 100 zł / 3 – Ładownia „Rata: Kredyt R2 · rata · co miesiąc · 33,33 zł ·
  33,33 zł/m” na 3 miesiące (11.2026–01.2027) bez ostatniej części 33,34 (inaczej niż „OC samochodu 103,33 zł/m(103,37 zł)”),
  Plan miesiąca bierze 33,33 („Ładownia – stałe koszty 1 789,32 zł” = 1 755,99 + 33,33); Radar dla tej samej pożyczki w
  styczniu „−33,34 zł”. Kontener sumuje się do 99,99 zł przy pożyczce 100,00 zł (zapisany kontener pr-8: `amount 3333`,
  `from 2026-11`, `until 2027-01`; harmonogram pożyczki 3333 / 3333 / 3334; to samo w pr-5 dla 12.2026–02.2027).
- Oczekiwane: suma części = całość, reszta zawsze w ostatniej części (33,34; 333,34) (punkt, T3).
- Kroki: Radar → Nowa pożyczka → „Biorę pożyczkę”, kwota 100, raty 3 (kontener w Ładowni włączony) → Zapisz → Ładownia,
  wiersz „Rata: Kredyt …” (33,33 zł/m bez ostatniej części) i Radar (ostatnia rata −33,34 zł).
- Waga S: różnica 0,01 zł w planie ostatniego miesiąca raty (Ładownia, Plan miesiąca, masa ładunku) i dwie różne kwoty
  tej samej raty na dwóch ekranach; salda i warstwy liczą prawdziwe operacje (PR.1 zgodne).
- Odsyłacze: LA.3 (rata ostatnia 103,37 i podpowiedź raty wyrównawczej), LA.4 (harmonogram w miesiącach) – `raport/LA.md`;
  MG.6, DM.11, DM.17 – w chwili pisania raportów MG / DM jeszcze bez tych punktów.
- Zrzuty: PR.9-kontener-1240.png, PR.9-kontener-12345.png, PR.9-kontener-1.200.png, PR.9-szybki-12345.png,
  PR.9-szybki-1.200.png, PR.9-edytor-1.200.png, PR.9-raty-ulamek.png, PR.9-raty-radar.png, PR.9-raty-ladownia.png.

### PR.10 – NIEZGODNE (S)
- Stan: rok (pr-6 16:00–16:02, pr-9 16:05–16:07). W `pr-6` odczyt „po „Cofnij”” to w rzeczywistości stan po usunięciu
  (toast wygasł przed kliknięciem), a „wpływ z XTB … zadokowany” to operacja rodzaju „Wpływ” bez okna dokowania – oba
  odczyty oznaczone w `pr.jsonl`; „Cofnij” i dokowanie wypłaty z XTB sprawdzone w `pr-9`.
- Zrobione: Plan miesiąca → grudzień 2026 → pensja 0; koperta Zwierzęta (listopad) 0 zł i szybki wpis 10 zł „Zwierzęta ·
  karma”; Mapa → Nowy cel z kwotą 0; Radar → Nowa pożyczka z kwotą 0; Ładownia → Nowy kontener z kwotą 0; Operacje → wydatek
  1 000 000,00 zł bez kategorii (mBank) → usunięcie → „Cofnij”; wpływ 999 999,99 zł (pr-6: rodzaj „Wpływ”, kontrahent
  XTB S.A.; pr-9: rodzaj XTB „wypłata z XTB” na Portfelu XTB i dokowanie). Warstwy i salda przed, po i po „Cofnij”.
- Widać (zgodne): cel 0 – „Podaj kwotę celu.”, cel nie powstał; pożyczka 0 – „Podaj kwotę pożyczki.”; koperta 0 –
  podgląd „Koperta Zwierzęta: 0,00 zł → −10,00 zł”, odprawa „Koperta Zwierzęta ponad limit o 10,00 zł.” (znacznik
  pomarańczowy, nie czerwony), koperta „10,00 / 0,00 zł”, powiadomienie (zapis) „Koperta Zwierzęta przekroczona – Wydane
  10,00 zł z 0,00 zł.”; wydatek 1 000 000,00 zł – „Energia dziś −999 922,72 zł”, „Osłony −941 739,07 zł / 19 500,00 zł”,
  „Kadłub 0,00 zł”, „ZASIĘG 0,0 mies.”, „KLASA Zwiadowca”, „Suma kont budżetu: −926 399,43 zł” = Operacje = Ustawienia (suma
  warstw −926 399,43), toast „Usunięto: Duży zakup PR −1 000 000,00 zł (03.11.2026). Cofnij”, po usunięciu warstwy wracają
  (73 600,57 = stan przed − 10 zł karmy); pr-9: usunięcie i od razu „Cofnij” – „Przywrócono: Duży zakup PR9 −1 000 000,00 zł
  (03.11.2026). Poprzednia wersja jest w historii.”, warstwy znów −926 389,43 (jak po dodaniu, co do grosza); wpływ
  999 999,99 zł jako „Wpływ” (pr-6) – „Osłony 964 020,03 zł / 19 500,00 zł · wolne do decyzji: 944 520,03 zł”, „Kadłub
  39 185,22 / 39 185,22”, „Układy gwiezdne 57 000,00 zł”, „ZASIĘG 153,5 mies.”, „Suma kont budżetu: 1 073 600,56 zł” = salda;
  wypłata z XTB 999 999,99 zł na Portfelu XTB (pr-9) – okno „Wpływ z XTB · 03.11.2026 +999 999,99 zł · Bez wpisu w ICTTJ –
  dokuje zwykłą kolejnością.”, propozycja „Osłony 961 229,07 zł”, po dokowaniu „Osłony 19 500,00 / 19 500,00”, „Kadłub
  38 770,92 / 39 185,22”, „Suma kont budżetu: 73 610,56 zł” = salda (961 229,07 + 38 770,92 = 999 999,99); koperta 0 w
  debriefingu M0 – „Zwierzęta 0,00 zł 10,00 zł −10,00 zł” (limit 0, nie „bez koperty”), Dowództwo „Poważne naruszenia
  w tym miesiącu 0 / 3”; kwoty 7-cyfrowe mieszczą się w kolumnach (zrzuty).
- Widać (niezgodne): pensja 0 w grudniu – pole „0,00”, plan: „Średnie koszty z 6 mies.: 6 417,54 zł · przyjmij 6 500,00 zł”,
  „Koperty planowe 1 500,00 zł”, „Koperty codzienne 2 500,00 zł”, „Podstawowy przydział: 80,64 zł dziennie”, „Rozdzielone
  6 001,82 zł”, „Plan przekracza pensję o 6 001,82 zł” – przydział dzienny zostaje przy pensji 0; kontener 0 – przycisk
  „Dodaj do ładowni” nieaktywny, bez komunikatu i bez dymka (cel 0 i pożyczka 0 mają komunikat).
- Oczekiwane: pensja 0 – brak przydziału z komunikatem; cel 0, pożyczka 0, kontener 0 – odrzucone z komunikatem; duże
  kwoty bez przepełnienia, suma warstw poprawna, „Cofnij” przywraca liczby (punkt).
- Kroki: Ctrl+4 → „›” (grudzień 2026) → Pensja 0 → Tab; Ctrl+5 → „Dodaj” → nazwa, kwota 0.
- Waga: S (pensja 0 – przydział, którego nie będzie z czego wypłacić, myli), N (kontener 0 bez komunikatu).
- Zrzuty: PR.10-pensja-0.png, PR.10-pensja-0-grudzien.png, PR.10-koperta-0.png, PR.10-cel-0.png, PR.10-pozyczka-0.png,
  PR.10-kontener-0.png, PR.10-1-milion.png, PR.10-2-usuniety.png, PR.10-4-dostawa.png, PR.10-9-2-cofnij.png,
  PR.10-xtb-okno.png, PR.10-9-3-xtb.png, PR.10-koperta-0-raporty.png.

### PR.11 – poza laboratorium (maszyna); w laboratorium sprawdzony przełom 31.10 → 1.11 z historii persony – ZGODNE
- Zegar maszyny (23:00 ostatniego dnia → 1. dzień → 8. dzień) – maszyna.
- Zakres sprawdzony w laboratorium (rok, 03.11): pensja wypłacona 1.11 – Plan „Wypłacono: 6 500,00 zł”; energia
  listopada = pensja − raty odkładek: Raporty M0 „Energia miesiąca (pensja po odkładkach, z łupami) 6 216,63 zł” = 6 500 −
  283,37 (Plan „Odkładki – opłaty okresowe 283,37 zł”; rat celów z pensji w listopadzie brak); „Łupy · do podziału
  803,48 zł” = niewydana energia października (6 216,67 − 5 413,19); debriefing października „Miesiąc zamknięty na plus”;
  miesiąc bez decyzji po terminie – Raporty 09.2025 „Podział łupów: Na następny miesiąc 0,00 · Do celów 0,00 · Do osłon
  488,86 zł” (całe łupy w osłonach); suma warstw = salda (PR.1). Chwile 23:00 i 8. dnia (łupy przechodzą do osłon w tej
  chwili) – NIE DO SPRAWDZENIA (zegar) → maszyna.

## Znaleziska
- **PR.3 (S)** – persona rok (dług 500 zł): Wywiad → Symulator manewrów „Zasięg i klasa 7,9 mies.”, a Mostek, Dowództwo,
  Raporty, Ładownia i Wywiad („paliwa starczy na …”) „7,8 mies.”; symulator nie odejmuje długu (= WY.20).
- **PR.9 (S)** – kontener raty pożyczki wziętej 100 zł / 3: Ładownia i Plan miesiąca „33,33 zł/m” przez 3 miesiące
  (99,99 zł), Radar ostatnia rata „−33,34 zł” – reszta nie trafia do ostatniej części kontenera.
- **PR.10 (S)** – pensja 0 w M+1: plan grudnia dalej pokazuje „Podstawowy przydział: 80,64 zł dziennie” (jedyny komunikat
  „Plan przekracza pensję o 6 001,82 zł”), zamiast braku przydziału.
- **PR.10 (N)** – kontener z kwotą 0: „Dodaj do ładowni” nieaktywny bez komunikatu (cel 0 i pożyczka 0 – „Podaj kwotę …”).

Bez znalezisk K: suma warstw = „Suma kont budżetu” = salda kont (Operacje, Ustawienia) co do grosza we wszystkich
odczytach (36 stanów PR.1 i 12 stanów PR.10), także przy −926 389,43 zł i 1 073 600,56 zł.

## Spostrzeżenia
- **Depozyt domowników niewidoczny przy osobie** (= MO.20): „Depozyt domowników 4 797,20 zł”, a panel „Rozliczenia” i
  Radar → Należności pokazują zaliczki 4 377,20 (Anna) + 360,00 (Kasia) = 4 737,20; 60 zł zaliczki Marka nie widać, bo
  wiersz Marka pokazuje tylko „ma oddać 360,00 zł”. Potwierdzone podglądem szybkiego wpisu przy zakupie za Marka:
  „Finansuje Marek: 80,00 zł – nie zjada energii; z zaliczki 60,00 zł; pożyczają osłony 20,00 zł, ma oddać.”
- **Dostawa liczona w warstwach przed dokowaniem:** po imporcie tygodnia „Stan okrętu” ma „ostatnia dostawa (01.11.2026)
  – Dostawa 3 200,00 zł · Osłony 3 200,00 zł”, a panel Dokowanie wciąż „31.10.2026 Wypłata z ICTTJ · Bieżące do zadokowania
  +3 200,00 zł”; „Zadokuj” z propozycją niczego już nie zmienia (osłony 16 200,00 przed i po). Suma się zgadza, ale
  rozbicie „dokąd poszła?” opisuje dostawę, której kapitan jeszcze nie zatwierdził.
- **Przykład w specyfikacji a T218:** spec („Pieniądze…”, przykład silnika) – „Zasięg przy kosztach 3 650 zł / mies.:
  6,5 → 7,8 mies.”; aplikacja w spec-dok – „6,4 mies.” → „7,8 mies.” (23 640 / 3 650 = 6,48 obcięte do 0,1 – zgodnie
  z T218 i PR.3). Do poprawy tekst przykładu w specyfikacji.
- **Dymki metafor (T295):** dymek ze słowniczka mają Osłony, Energia, Kadłub, Zasięg, „ostatnia dostawa” i plakietka klasy;
  bez dymka: Układy gwiezdne, Zbiorniki, Podatek, Depozyt domowników, Łupy, Dług, Klasa i Masa ładunku w „Stanie okrętu”.
- **Eksport „Miesiące”** (CSV, Excel) nie ma kolumn „Energia miesiąca” ani „Sfinansowane przez domowników” – PR.8 każe je
  porównać; są tylko na ekranie i w PDF. Stopa oszczędności w CSV raz z jednym miejscem po przecinku („52,9”), raz bez
  („55” dla 10.2025), w przeglądzie rocznym „33%” – T294 mówi o jednym miejscu po przecinku.
- **Ciche odrzucenie kwoty w szybkim wpisie** (wzorzec SW.22–24): „12,345” i „1.200” czyszczą pole bez słowa, a edytor
  operacji i nowy kontener mówią „Nieprawidłowa kwota – zostaje poprzednia.”; liczba rat „2,5” wraca do „1” bez komunikatu.
- **Rata wyrównawcza odkładki** nowego kontenera 1 240 zł (płatność 15.09.2027): „112,72 zł/mies.” × 11 = 1 239,92 –
  ostatniej raty wyrównawczej (z resztą 0,08 zł) nie widać nigdzie (powiązane z LA.3).
- **Wywiad, symulator:** „Osłony pełne 12.2026 12.2026” przy osłonach już ponad celem (20 000 / 15 000) i „Kadłub pełny
  12.2026” przy kadłubie 8 960 / 6 000, a przy warstwie dokładnie pełnej „— —” (pr-4c3, pr-4d1) – dla obszaru WY.
- **Do wyroczni:** wydatek 1 000 000 zł bez kategorii opróżnia najpierw energię, potem kadłub do 0,00, a dopiero resztę
  bierze z osłon (−941 729,07 zł); T28 mówi tylko o osłonach – kolejność rozstrzygnie wyrocznia / AU-10.
- **Laboratorium:** w zrzutach pasek „Uruchamiać Financial Intel z Windows na tym komputerze?” (lab zeruje autostart przed
  startem) – bez wpływu na liczby. `lab.ts` bez błędów; błędy własnych skryptów PR (filtr kwot bez twardej spacji, podział
  łupów ponad kwotę po imporcie, „Cofnij” po wygaśnięciu toastu) poprawione powtórnymi przebiegami (pr-3b, pr-9).

## Porównanie z wyrocznią (AU-9b)

Wyrocznia „2026-11-03 u2”, 102 odczyty PR na swoich migawkach. Pełne werdykty, pozycje C-n i odpowiedzi wyroczni:
`raport/LICZBY-C.md`.

- **PR.1** – SPRZECZNOŚĆ WYMAGAŃ (S4: aplikacja = B). Warstwy, suma kont i salda zgodne z wyrocznią w 37 odczytach.
  Wyjątek – krok 11 ciągu (archiwizacja celu z częścią podziału dokowania, 250 zł): C24, prawdopodobnie błąd wyroczni, do AU-11.
- **PR.2** – SPRZECZNOŚĆ WYMAGAŃ (luka C16): cele warstw, średnia i 14 miesięcy kosztów zgodne; listopad 142,00 = koszty
  z wydatkiem z przyszłą datą.
- **PR.3** – NIEZGODNE potwierdzone:
  - symulator manewrów 7,9 wobec 7,8 (C19, S);
  - stopa „33%” w przeglądzie rocznym (C25 = R-18, N);
  - pozostałe ekrany zgodne.
- **PR.4** – SPRZECZNOŚĆ WYMAGAŃ (S6 – T295; S4 – B): wszystkie rozbicia zgodne, także dostawa z pulą Podatek (po C1).
- **PR.5** – SPRZECZNOŚĆ WYMAGAŃ (S6 – T295): energia dziś i energia miesiąca na trzech ekranach = wyrocznia.
- **PR.6** – poza laboratorium (maszyna), bez odczytów do porównania.
- **PR.7** – SPRZECZNOŚĆ WYMAGAŃ (S4 – B; R-9 – masa ładunku zaokrąglona): pary równe między ekranami i z wyrocznią.
- **PR.8** – NIEZGODNE (N): stopa 2025-10 „55” zamiast „55,0” (C25 = R-18). Reszta debriefingów, Raportów i eksportu zgodna
  (S2 – T178, S3 – A); listopad – luka C16.
- **PR.9** – liczby zgodne z wyrocznią: kontener 1 240 zł (rata 112,72), raty pożyczek na Radarze, masa 2 117,65. NIEZGODNE (S)
  wykonawcy bez zmian – kontener raty zapisany bez reszty; wyrocznia liczy z zapisanego kontenera.
- **PR.10** – liczby zgodne z wyrocznią: wydatek 1 000 000 zł (energia i kadłub 0, deficyt w osłonach −941 739,07),
  999 999,99 zł, „Cofnij”. Pensja 0: przydział 80,64 tak samo w wyroczni, odkładki 245,83 wobec 0,00 – C20, luka
  w wymaganiach.
