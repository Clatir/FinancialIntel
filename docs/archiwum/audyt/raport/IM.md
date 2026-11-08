# Raport – IM: import z mBanku

- Data: 03.11.2026 (zegar laboratorium = kotwica persony), przebiegi 11:12–12:05.
- Wersja: Financial Intel 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4`), laboratorium `tests/audyt/lab.ts`.
- Stan danych: persona `rok` (kotwica 2026-11-03; historia z `rok-historia.csv` do 26.10, ostatni import 7 dni temu),
  w części przebiegów rozszerzona (`prepareImportState` w `tests/audyt/im-pomoc.ts`): konto „mBank oszczędności”
  (…5555), domownicy Mama (HALINA TESTOWA, „reszta jako zaliczka”), Tata (PIOTR TESTOWY, „pytaj”), Babcia (przez Tatę)
  z zakupami do oddania (Mama 50 + 70 zł, Babcia 100 zł), kategoria zarchiwizowana z regułą MULTIKINO, słowo „kebab”,
  wpisy ręczne A–H i P pod wiersze L1. Inne stany szczególne – przy punktach.
- Pliki z banku (syntetyczne, generator `writeFiles()` w `tests/audyt/im-pomoc.ts`, `C:\FI-audyt\pliki\im\`):
  `L1` = lista 19.10–01.11 (90 wierszy: 17 z historii persony, nowe dni persony, 61 własnych), `L1-utf8`,
  `L1-utf8-bez-bom`, `L1-utf16`, `L2` = lista 26.10–03.11 (rozliczone nierozliczone +6 %, +8 %, zniknięta, nowe dni),
  `H1` = historia 27.10–02.11 z łańcuchem sald od salda końcowego persony, `H2`/`H3` (rozbieżna / z luką), `HL`,
  `L0p` (dwie nierozliczone), `L0-znane`, `R` (…9876), `K5555`, `K2`, `X`, `Z`, `U`, `E`, `G` (21 MB), `W`, `S`
  (podobne nazwy), `HY` (daty brzegowe), `P30k` (30 000 wierszy, 2942 marki), `P2k` (2000 nowych).
- Skrypty: `tests/audyt/im-*.spec.ts`; dzienniki przebiegów `C:\FI-audyt\przebiegi\<przebieg>\obs.txt`; zrzuty
  `C:\FI-audyt\zrzuty\IM.*.png`; odczyty liczb `C:\FI-audyt\odczyty\im.jsonl`.

**Podsumowanie (punkty IM.1–IM.56):** ZGODNE 34 · NIEZGODNE 14 (K 1, W 2, S 5, N 6) · UWAGA 4 · NIE DO SPRAWDZENIA 1 ·
poza laboratorium 3 (IM.37, IM.53 – Maszyna; IM.56 – Ty). Liczby z ekranów zapisane w `im.jsonl` (wyrocznia AU-9) przy
punktach z odczytem. Każde NIEZGODNE potwierdzone w dwóch świeżych przebiegach (IM.45 – w przebiegu i w kodzie).

---

### IM.1 – UWAGA
- Stan: rok, przebieg im-a.
- Widać: „Import · CSV z mBanku”, „ostatni import – mBank: 27.10.2026, 11:00”, panel „Plik z mBanku” z „Wybierz plik
  CSV…”, „albo upuść go tutaj” i „mBank → Historia → lista operacji → „Eksportuj” CSV (albo historia rachunku CSV). …
  Przed zapisem powstaje kopia zapasowa.”; „Potwierdzenie sald”; „Kategoryzacja” z „Wybierz plik CSV z mBanku –
  operacje pojawią się tu w tematach (kategoriach) i grupach marek.” Czas lokalny (nie UTC).
- Uwaga (format): przy dniu < 10 ta sama data ma inną postać niż reszta dat aplikacji: „ostatni import – mBank:
  3.11.2026, 11:23” (im-b), „cofnięty 3.11.2026, 11:34”, w jednym wierszu okna cofania: „Import z 3.11.2026, 11:43 ·
  L1.csv · 19.10.2026 – 01.11.2026”, a obok „ostatnio potwierdzone 03.11.2026”. Znaczniki czasu mają d.mm.rrrr, daty
  dd.mm.rrrr. Zrzut: IM.29-wynik.png, IM.31-ostatnie-importy.png.

### IM.2 – ZGODNE
- Stan: rok (im-a), rok przygotowany (im-b, im-b2).
- Widać: „L1.csv · lista operacji · 90 operacji · 19.10.2026 – 01.11.2026”, „Właściciel rachunku: JAN KAPITAN –
  przelewy z tym nazwiskiem to przelewy własne.”, konto mBank; liczniki 71 + 2 + 0 + 17 = 90, „Importuj (73)”; folder
  danych bez zmian do kliknięcia (porównanie plików: brak różnic). Odczyt: `im.jsonl` IM.2.

### IM.3 – ZGODNE
- Stan: rok + L0p, przebieg im-c1. H1 z „KAWIARNIA MOKKA /Testowo”, „/TESTOWO”, „/testowo” i różnymi „DATA
  TRANSAKCJI”, „POS ZWROT TOWARU” Rossmanna, przelew JAN NOWAK z tytułem.
- Widać: jedna grupa „KAWIARNIA MOKKA · 3 operacje · 28.10–01.11”; zwrot „Rossmann … zwrot towaru – sieć Rossmann”
  z kategorią „Osobiste · kosmetyki” (po imporcie wydatek +20,00 w kategorii zakupów); przelew – „Od kogo [JAN
  NOWAK]”, „Tytuł [ZWROT ZA BILETY DO KINA]”, „Z banku (mBank) PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY JAN NOWAK ZWROT ZA
  BILETY DO KINA”. Zrzut: IM.3-H1.png, IM.3-kawiarnia.png.

### IM.4 – ZGODNE
- Stan: rok (im-a), rok przygotowany (im-b).
- Widać: L1 w Windows-1250, UTF-8 z BOM, UTF-8 bez BOM i UTF-16 – identyczne liczniki i identyczna (tekstowo)
  kategoryzacja; nazwy „ŚLUSARZ ŁĘCKI”, „Księgarnia Żaczek”, „CUKIERNIA POD RÓŻĄ” poprawne, bez „�”, „Ä…”, „Ĺ‚”. Po
  imporcie L1 plik L1-utf8: „Wszystkie operacje z tego pliku są już w budżecie…”, „już zaimportowane (bez zmian) 90”.

### IM.5 – ZGODNE
- Stan: rok, im-a. Decyzja w temacie „Zakupy bez rozpoznania” przed błędnymi plikami.
- Widać: X, Z, U i E – „<plik>: To nie jest plik CSV z mBanku: brak nagłówka „#Data operacji … #Kwota”. Pobierz
  w mBanku listę operacji albo historię rachunku jako CSV. – otwarty plik „L1.csv” zostaje bez zmian.”; G (21 MB) –
  komunikat „Plik ma 21 MB – to nie wygląda na wyciąg z banku (limit 20 MB).” bez wczytywania i bez zawieszenia;
  decyzja tematu po wszystkich błędach ta sama; W – „Pominięte wiersze: linia 15 (kwota w EUR – FI prowadzi tylko
  PLN); linia 16 (nieczytelna data „31.13.2026”)”, reszta (2 operacje) wczytana.
- Spostrzeżenie: komunikat o G idzie tylko do dymka, a panel dalej pokazuje stary błąd „E.csv: To nie jest plik…”.

### IM.6 – UWAGA
- Stan: rok, im-a (upuszczenie przez zdarzenie `drop` z plikiem utworzonym w oknie), im-a2.
- Widać: upuszczony L1 – ten sam podgląd (71/2/0/17); upuszczony G nie wczytuje się; w trakcie zapisu importu
  upuszczenie L2 – „Trwa import – poczekaj, aż się skończy.”.
- Uwaga (spójność – dokładnie przypadek z punktu): upuszczenie: „„G.csv” ma 21 MB – to nie wygląda na plik z mBanku
  (najwyżej 20 MB).”, wybór z okna: „Plik ma 21 MB – to nie wygląda na wyciąg z banku (limit 20 MB).”
- Zrzut: IM.5-G.png, IM.6-G.png.

### IM.7 – ZGODNE
- Stan: rok, im-a (L1); im-h (P30k).
- Widać: „Nowe operacje: 56 grup w 31 tematach – do decyzji 7, do sprawdzenia 22, gotowe 2. Decyzja tematu obejmuje
  wszystkie jego marki…” (7 + 22 + 2 = 31); sekcje „Do decyzji · 7”, „Rozpoznane – sprawdź · 22”, „Gotowe · 2”
  (zwinięte); „Biedronka · 2 operacje · 2 nazwy” (TESTOWO i WARSZAWA), „Allegro · 3 operacje · 3 nazwy” (PAYPRO SA
  *ALLEGRO, ALLEGRO.PL, ALLEGRO), „SumUp *KAWIARNIA MOKKA” w grupie KAWIARNIA MOKKA, „Orlen · 2 operacje · 2 nazwy”;
  plakietki „reguła”, „sieć”, „słowo kluczowe”, „rozpoznane”, „do decyzji”. P30k: tematy z 742–1468 markami zwinięte,
  „pokaż kolejne (100 z 642)”. Zrzut: IM.7.png, IM.55-podglad.png.

### IM.8 – NIEZGODNE (N)
- Stan: rok przygotowany, przebieg im-a3 (potwierdzone w im-b2: ta sama lista opcji wiersza).
- Zrobione: temat „Zakupy bez rozpoznania” → „Prezenty i inne · inne”; marka ZEGARMISTRZ ROMAN → „Osobiste · ubrania”;
  operacja AUTOMATSPEC → „Dom · chemia”; KIOSK – zaznaczenie i „Przelew własny – konto spoza budżetu”; SKLEP OLA –
  „Dom · media”, potem pierwsza opcja listy; ZEGARMISTRZ – „pomiń”; słowo „zegarek” (plan od nowa).
- Widać (zgodne): marki bez własnej decyzji „jak temat”; „Przelewy wychodzące” z markami zdecydowanymi różnie –
  „różne – patrz marki”; operacja innego rodzaju w ramce „przelew własny ‹jak grupa›”; „pomiń” → „importuj”,
  „pominięte: 1”; po przeliczeniu planu decyzje bez zmian.
- Widać (niezgodne): gdy grupa ma kategorię, lista kategorii wiersza nie ma „(jak grupa)” – pierwsza opcja to
  „— bez kategorii —” (opcje: „(pusta)=— bez kategorii —”, „Jedzenie”…); jej wybór zostawia operację bez kategorii
  (SKLEP OLA zaimportowana z `categoryId: null`, grupa miała „Prezenty i inne · inne”). Powrót do decyzji grupy tylko
  przez ręczny wybór tej samej kategorii. „(jak grupa)” jest tylko przy grupie bez kategorii.
- Oczekiwane: „przy trzeciej wybierz „(jak grupa)”” → „„(jak grupa)” daje kategorię grupy”.
- Zrzut: IM.8-decyzje.png.

### IM.9 – ZGODNE
- Stan: rok przygotowany, im-b i im-b2; L2 w im-b2.
- Widać: „kategoria mBanku „Edukacja” → ‹Prezenty i inne · inne?›” – tylko po kliknięciu; „Przyjmij podpowiedzi mBanku
  (3)” – grupy z plakietką „podpowiedź mBanku”, bez reguł (brak `kursjezykowy`, `slusarz` w regułach); PIZERIA NAPOLI
  zmieniona po przyjęciu → „Twoja decyzja” z zaznaczonym „zapamiętaj” (reguła `pizerianapoli`); XTB z kategorią mBanku
  „Ubezpieczenia” – „XTB – dopłata do konta tradingowego” (rozpoznanie, nie podpowiedź); w L2 ŚLUSARZ ŁĘCKI i KURS
  JEZYKOWY ABC znowu z „podpowiedź mBanku → …?”, marki z własną decyzją (CUKIERNIA SŁODKA, WETERYNARZ) w „Gotowe”
  z „reguła”.
- Spostrzeżenie: temat podpowiedzi łączy kategorie banku („mBank: Edukacja, Opłaty i odsetki”), więc „Przyjmij
  podpowiedzi mBanku” dał opłacie za kartę i prowizji kategorię „Prezenty i inne · inne” (IM.19).

### IM.10 – NIEZGODNE (S)
- Stan: rok, przebiegi im-a i im-a2 (powtórzone).
- Zrobione: wyszukanie „orlen” → „Zaznacz znalezione”, wyszukanie „kolega” → „Zaznacz znalezione” (wpływ TOMASZ
  KOLEGA +500,00 – zwrot pożyczki); „Decyzja dla zaznaczonych”: „Wydatek / zwrot towaru – kategoria”, „Auto · paliwo”,
  „Ustaw”.
- Widać: „Zaznaczone: 2 grupy, 3 operacje”, toast „Ustawiono dla 2.” (bez „… nie pasuje do kierunku pieniędzy”); grupa
  TOMASZ KOLEGA zmieniona z „Zwrot pożyczki – Pożyczka dla Tomka (Radar)” na „[Zwrot towaru (ujemny wydatek)] [Auto ·
  paliwo] Twoja decyzja [x] zapamiętaj”.
- Oczekiwane: „Ustawiono dla N; K nie pasuje do kierunku pieniędzy (wpływ / wydatek) – bez zmian.”; nie przechodzi,
  gdy „wpływ dostaje kategorię wydatku”. (Etykieta opcji „Wydatek / zwrot towaru” sugeruje, że to zamierzone – do
  rozstrzygnięcia w AU-11; skutek: spłata pożyczki staje się zwrotem paliwa, zmniejsza koszty.)
- Reszta zgodna: „znaleziono: 1 grupa”, „znaleziono: 0 grup + 1 operacja” (kwota), „znaleziono: 6 grup” (nazwa
  kategorii), „Nic nie pasuje do „…”.”; „Ustaw” nieaktywne bez kategorii z dymkiem „Wybierz kategorię”, propozycje sieci
  bez zmian; „Nie importuję: 3 operacje.”, „Importuj jednak” przywraca liczniki; „Przyjmij pewne (znalezione: 1)”
  przyjmuje tylko temat Biedronki (20 → 19 do sprawdzenia).
- Zrzut: IM.10-wplyw-po-Ustaw.png, IM.10.png.

### IM.11 – ZGODNE
- Stan: rok, im-a.
- Widać: „zapamiętaj „cukiernia” jako słowo kluczowe (obejmie 4 z 4 zaznaczonych)”, toast „Ustawiono dla 4. Słowo
  kluczowe „cukiernia” zapamiętane.” – 4 grupy z decyzją, także przelew MARIA KOWALSKA z tytułem „CUKIERNIA – TORT…”;
  „data” i „sklep” odrzucone: „„data” jest za ogólne – bank pisze je przy wielu operacjach. Wybierz słowo, które mówi,
  co to było.”; „weterynarz” → WETERYNARZ ZDROWY PIES w „Gotowe” z „reguła”; „Wbudowane słowa (30) i sieci ze słownika
  (241)” rozwija listę. Działanie w kolejnych importach – widoczne w L2 dla słów z „Przyjmij pewne” (im-b2).

### IM.12 – ZGODNE
- Stan: rok, im-a.
- Widać: „Reguła na słowo – Rozrywka i hobby · hobby: „kurs” · jeszcze 1 operacja”, „nie, dziękuję”; po kliknięciu
  „Słowo „kurs” → Rozrywka i hobby · hobby: jeszcze 1 operacja w tym pliku i kolejne importy.”, KURSY ONLINE XYZ
  z „reguła”; zapisana reguła = pokazana (`kurs`, keyword, hobby). Dla AUTOMATSPEC i ZEGARMISTRZ ROMAN brak propozycji
  („auto”, „roma” nie proponowane).

### IM.13 – NIEZGODNE (N)
- Stan: rok, im-a, im-a2, im-e2 (rozłączenie – dwa przebiegi).
- Zgodne: pary z powodem – „te same słowa” (KAWIARNIA MOKKA ⟷ MOKKA KAWIARNIA), „ucięta nazwa” (ZEGARMISTRZ ROMAN ⟷
  … KOWAL, PRACOWNIA SZEWSKA ⟷ … TESTOWO), „literówka” (PIZERIA ⟷ PIZZERIA NAPOLI); bez „Połącz wszystkie”; BAR POD
  LIPA / BAR MLECZNY i Lidl / Kaufland bez pary; „Połącz” – „Połączono „MOKKA KAWIARNIA” z „KAWIARNIA MOKKA” – kolejne
  importy też je połączą.” z „Cofnij”; para po „To nie to samo” nie wraca po ponownym otwarciu; dwie sieci – bez
  „Połącz nazwy”; Ustawienia: „MOKKA KAWIARNIA = KAWIARNIA MOKKA ‹rozłącz›”, „Pary oznaczone „To nie to samo”: 1”.
- Niezgodne: „rozłącz” w Ustawieniach rozłącza od razu, bez dymka i bez „Cofnij” (oba przebiegi: brak nowych
  komunikatów, lista pusta). Oczekiwane: „w Ustawieniach rozłączenia z „Cofnij””. „Rozłącz wszystkie” i „Usuń nieaktywne
  (N)” nie pokazały się (jedno połączenie, brak połączeń z 1.2.2 w stanie). Zrzut: IM.13-rozlacz.png.
- Spostrzeżenie: „Połącz nazwy (N)” pojawia się przy dowolnych zaznaczonych grupach – także Orlen + TOMASZ KOLEGA
  (wydatek i wpływ) i 4 różnych cukierniach.

### IM.14 – ZGODNE
- Stan: rok przygotowany (wpisy A–D), im-b i im-b2.
- Widać: „Wpisy ręczne z banku (9)”: A „Biedronka 27.10.2026 18:40 … ⟷ bank 27.10.2026: BIEDRONKA 1234 TESTOWO”, B
  „Rossmann 29.10.2026 10:15 … ⟷ bank 01.11.2026: ROSSMANN 112” (3 dni), D „(bez kontrahenta) 31.10.2026 16:20 … ⟷
  bank 31.10.2026: DINO TESTOWO 4” – zaznaczone; C (Hebe, 4 dni) – nie ma na liście. Po imporcie: A – 18:40, notatka
  „notatka A – zakupy na weekend”, dane banku; B – data 01.11 (banku), 10:15, notatka; D – nazwa z banku; C – dwie
  operacje (Hebe 28.10 ręczna i HEBE 15 z banku). Saldo mBanku 69 128,00 → 67 823,42 zł, operacji 993 → 1060 (odczyt).

### IM.15 – ZGODNE
- Stan: rok przygotowany (E–H, P), im-b, im-b2.
- Widać: F „Piekarnia Groszek … możliwy duplikat – wpis −15,50 zł” zaznaczona (połączona, kwota banku −15,80); H „KFC
  … ⟷ … KFC 1234 WARSZAWA” zaznaczona; E „Fryzjer … ⟷ STUDIO URODY ANETA możliwy duplikat – inna nazwa · zaznacz, jeśli
  to ta sama operacja osobno – wejdzie jako: bez kategorii” – niezaznaczona; G (Sklep / SKLEP OLA) – brak pary; wpis
  przy przelewie własnym „Przelew na lokatę ⟷ JAN KAPITAN … osobno – wejdzie jako: przelew własny” – po imporcie
  przelew własny. Panel „Duplikaty operacji”: E „możliwy duplikat – zaznacz, jeśli to ta sama operacja”, niezaznaczona.
  Zrzut: IM.15.png, IM.15-duplikaty.png.

### IM.16 – ZGODNE
- Stan: rok przygotowany po L1; ZABKA nierozliczona przemianowana na „Żabka osiedlowa”, ORLEN −200,00 podzielony
  120,00 moje / 80,00 Anna (edytor Operacji); im-b2. Potwierdzone też w im-a3 („rozliczone: 3”).
- Widać: „Nierozliczone, które bank rozliczył inaczej (2)”: „ZABKA Z1234 31.10.2026 → 02.11.2026 −23,50 → −24,91”,
  „ORLEN STACJA 4123 31.10.2026 → 02.11.2026 −200,00 → −212,00”; podgląd „nierozliczone → rozliczone 2” = toast
  „…rozliczone: 2.” = wynik „rozliczone: 2”. Po imporcie te same operacje: „Żabka osiedlowa” −24,91 02.11, ORLEN
  −212,00 z częściami −127,20 (moja) i −84,80 (Anna), bez nowych operacji. Depozyt Anny 4 297,20 → 4 292,40 zł (odczyt).
- Spostrzeżenie: ta sama sekcja „…bank rozliczył inaczej” pokazuje też rozliczenie bez zmiany („−23,50 → −23,50”, im-c1).

### IM.17 – ZGODNE
- Stan: jak IM.16 (KIOSK RUCH 12 nierozliczona 30.10, w L2 jej nie ma), im-b2 i im-a3.
- Widać: „Nierozliczone, których bank już nie pokazuje (1)” z „Zwykle anulowana autoryzacja karty – ale lista z filtrem
  też ich nie pokaże. Zaznacz te do usunięcia (wracają z „Usunięte wpisy” w Synchronizacji).”, niezaznaczona; po
  zaznaczeniu „usunięte: 1”. H1 (historia) nie proponuje usuwania (im-c1). Panel „Usunięte wpisy” w Synchronizacji
  jest zwinięty („Pokaż”) – treści z powodem nie odczytałem.

### IM.18 – ZGODNE
- Stan: rok przygotowany, im-b2.
- Widać: JAN KAPITAN (wychodzące 3, przychodzące 1) – „rozpoznane · przelew własny”; JAN NOWAK (to samo imię) –
  „przelew wychodzący – wydatek, za domownika albo przelew własny?”; po imporcie przelewy własne poza „Przychodami”
  (przyrost „Praca i inne” = tylko MBANK KANTOR i JAN NOWAK); „Twoje nazwiska w banku” – JAN KAPITAN. Drugie nazwisko
  – nie sprawdzone (czas).
- Spostrzeżenie: przy przychodzącym przelewie własnym (JAN KAPITAN) jest „+ domownik” (IM.24).

### IM.19 – NIEZGODNE (N)
- Stan: rok, im-a, im-b2; plik F bez kategorii mBanku w im-e2.
- Zgodne: EURONET „WYPŁATA W BANKOMACIE” i PLANET CASH „BLIK WYPŁATA GOTÓWKI” – „wypłata z bankomatu → Gotówka”;
  PROWIZJA ZA ZAKUP (tytuł „KEBAB ROMA”) bez decyzji ze słowa „kebab”; zwrot ROSSMANN „Zwrot towaru (ujemny wydatek)”
  w „Osobiste · kosmetyki” (+25,00); ZALANDO „PŁATNOŚĆ WEB - KOD MOBILNY” i MBANK KANTOR „SPRZEDAŻ WALUTY” – rodzaj
  operacji poza nazwą; PIOTR SĄSIAD z tytułem „ZA  OBIAD I KAWĘ” (nazwa bez tytułu); mTransfer – kontrahent „PAYU
  SPÓŁKA AKCYJNA”. Bez kategorii mBanku opłaty idą do tematu „Opłaty banku · 2 marki” (im-e2).
- Niezgodne: gdy plik ma kategorię mBanku przy opłacie („Opłaty i odsetki” – jak w prawdziwym eksporcie), opłata za kartę
  i prowizja trafiają do tematu podpowiedzi „mBank: Edukacja, Opłaty i odsetki · 4 marki” razem z kursami językowymi,
  nie do „Opłaty banku”; „Przyjmij podpowiedzi mBanku” daje im „Prezenty i inne · inne”.
- Oczekiwane: „opłaty i prowizje – wydatek bez kategorii w temacie „Opłaty banku””. Zrzut: IM.7.png, IM.9.png.

### IM.20 – ZGODNE
- Stan: rok przygotowany z folderem ICTTJ, im-b, im-b2.
- Widać: „XTB SPÓŁKA AKCYJNA, … Withdrawal” – „XTB – wypłata z konta tradingowego”, po imporcie na Mostku „Wypłata
  z ICTTJ 1 500,00 zł (pula Cele) do zadokowania.” (wcześniej „czeka na import”); przelew do XTB i BLIK xtb.com – „XTB –
  dopłata do konta tradingowego”; „NA PORTFEL XTB” – przelew własny; „ZWROT ZA KURS XTB” od Taty – wpłata domownika;
  przy grupach XTB brak „zapamiętaj”; reguł XTB brak; brak kategorii „Trading”.

### IM.21 – ZGODNE
- Stan: rok przygotowany, im-b (i im-d1 dla oszczędności).
- Widać: wiersz „NA PORTFEL XTB” → „→ Portfel XTB”, „NA OSZCZĘDNOŚCI” → „→ mBank oszczędności”, „PRZELEW ŚRODKÓW” –
  „— konto spoza budżetu —”; dymek „Wybierz drugie konto w budżecie, aby przelew od razu był dwustronny i nie ruszał
  osłon”. Po imporcie: po jednej operacji `transfer` z `counterAccountId` i `bothSides`; Portfel XTB 3 698,89 →
  4 198,89, oszczędności 0,00 → 1 000,00; przelew poza budżet – tylko strona mBanku. Suma kont zmienia się tylko
  o pozostałe operacje pliku (odczyt w `im.jsonl`).

### IM.22 – ZGODNE
- Stan: rok przygotowany + L1 z przelewem 1 000,00 → mBank oszczędności (30.10), im-d1.
- Widać: K2 na „mBank oszczędności”: „druga strona przelewu między kontami 1”, „Druga strona przelewu między kontami
  (1)”, „mBank → mBank oszczędności 30.10.2026 ⟷ bank 31.10.2026: JAN KAPITAN” zaznaczona; odznaczona – „osobno –
  wejdzie jako: przelew własny ← mBank (przelew policzony dwa razy)”, liczniki 2 nowe; wynik „drugie strony przelewów:
  1”, toast „Zaimportowano: 1 nowa operacja; …, drugie strony przelewów: 1.”; nadal jedna operacja z `counterBank`
  i `counterDate: 2026-10-31` (strona oszczędności w dniu banku). Etykiety „druga strona z banku (31.10)” w edytorze nie
  odczytałem (otworzyła się inna operacja).

### IM.23 – NIEZGODNE (W)
- Stan: rok przygotowany (Mama ma oddać 120,00 zł: 50 + 70; ustawienie Mamy „reszta jako zaliczka”), przebiegi im-a3
  (Mama: wybrane „zaliczka”) i im-b2 (Mama: domyślne „spłata”) – potwierdza kandydata **P.3**.
- Zrobione (im-a3): grupa HALINA TESTOWA (70,00 + 300,00) – lista „[Od domownika: Mama – reszta jako zaliczka]”,
  przełącznik „spłata / niezależny przychód / zaliczka” → „zaliczka”; import.
- Widać: Radar → Należności: „Mama ma oddać 120,00 zł · najstarszy zakup z 20.10.2026 · 2 zakupy do oddania”, Meldunki
  „Mama: do oddania 120,00 zł – najstarszy zakup z 20.10 (14 dni).”; wpłaty mają `inflowKind: advance` – całe 370,00
  w depozycie, żaden zakup nie spłacony.
- Oczekiwane: „wpłata 70 zł spłaca zakup 70 zł (pewne dopasowanie), 300 zł najpierw wyrównuje resztę do oddania
  (50 zł), reszta według ustawienia osoby”; nie przechodzi, gdy „spłata nie zmniejsza „ma oddać””. Etykieta wybranej
  opcji to „reszta jako zaliczka”.
- Dla porównania (im-b2, bez klikania „zaliczka” – domyślne „spłata”): „Mama zaliczka (depozyt) 250,00 zł”, „bez
  długu” – zgodnie z oczekiwaniem (z dopiskiem „zwrot do przypisania: 50,00 zł – wskaż zakupy w Meldunkach” przy
  jednym zakupie do wskazania).
- Zgodne: każda osoba ma własny temat („Od domownika: Mama – zaliczka”, „Od domownika: Tata”); Tata „Do decyzji”
  z „od domownika: Tata – zaliczka czy przychód?”, w `fi.json` „ask” do importu, po imporcie „advance”; decyzja Taty
  nie trafia do Mamy (B4); wpłaty domowników poza „Przychodami” (im-b2: przyrost tylko o niedomowe wpływy).
- Uwaga (spójność nazw): w jednej grupie ten sam wybór ma dwie nazwy – lista „reszta jako zaliczka / reszta jako
  przychód”, przełącznik „spłata / niezależny przychód / zaliczka”; Radar „zaliczka (depozyt)”, Mostek „zaliczka –
  czeka na wydatki”. Lista mówi „reszta jako przychód”, gdy przełącznik stoi na „spłata”.
- Zrzut: IM.23-mama-zaliczka.png. Odczyty: `im.jsonl` IM.23 (dwa warianty).

### IM.24 – NIEZGODNE (N)
- Stan: rok, im-a (potwierdzone w im-b, im-b2, im-c1).
- Zgodne: „+ domownik” przy JAN NOWAK (przychodzący) z dymkiem „Dopisz nadawcę do domowników (Ustawienia → Domownicy):
  jego wpłaty najpierw wyrównają to, co ma oddać”; brak przy JAN NOWAK wychodzącym i przy zwrocie kartą (Rossmann); po
  kliknięciu toast „Dopisano domownika „Jan” (Ustawienia → Domownicy – tam zmienisz imię).”, w `fi.json` „Jan
  ["JAN NOWAK"] inflow=ask” (nic na stałe przed odpowiedzią), temat „Od domownika: Jan” w „Do decyzji” z „zaliczka czy
  przychód?”.
- Niezgodne: „+ domownik” jest też przy grupach, które nie są przelewem od osoby spoza listy: „JAN KAPITAN · 1
  operacja · 31.10 … przelew własny ‹+ domownik›” (właściciel rachunku), „XTB S.A. · … wypłata z konta tradingowego
  XTB ‹+ domownik›” (firma), „TOMASZ KOLEGA … zwrot pożyczki ‹+ domownik›”. Jedno kliknięcie przy własnym przelewie
  dopisałoby właściciela jako domownika i zrobiło z przelewów własnych jego pieniądze.
- Oczekiwane: „„+ domownik” tylko przy przychodzącym przelewie od osoby spoza listy”. Zrzut: IM.24.png, IM.10-wplyw-po-Ustaw.png.

### IM.25 – NIEZGODNE (S)
- Stan: rok przygotowany (Babcia ma oddać 100,00, przez Tatę), im-b2 i im-a3.
- Zgodne: „Wspólnie – kilka osób płaci” → „procenty” 60 + 30: „razem 90 % – ostatnia osoba bierze resztę do 100 %”,
  „Importuj” – „Wspólny zakup: procenty osób muszą dać razem 100 % – popraw podział i importuj jeszcze raz.”, nic nie
  zapisane; 60 + 40 z „zapamiętaj” – Castorama −300 z częściami −180 / −120, reguła z `share`; w L2 Castorama −150 sama
  „Wspólnie: ja, Anna” (−90 / −60).
- Niezgodne: „+ w tym za Babcia” przy pojedynczej wpłacie (wiersz 01.11 „OD TATY I BABCI +300,00”) nie robi nic – po
  kliknięciu wiersz bez zmian, brak pola kwoty (dwa przebiegi). Działa tylko przy grupie i wtedy dotyczy każdej wpłaty
  grupy: obie wpłaty Taty (200 i 300) dostały „w tym za Babcia 100,00” – Babcia „zaliczka (depozyt) 100,00 zł” (jej
  100 zł spłacone + 100 zł nadwyżki), Tata 300,00 zamiast 400,00.
- Oczekiwane: „przy wpłacie Taty „w tym za…” → Babcia 100 zł … część Babci spłaca jej zakupy, reszta zostaje Tacie”.
- Zrzut: IM.25-wiersz-w-tym-za.png, IM.25-tata.png, IM.25-60-30.png, IM.25-90-proba.png.

### IM.26 – ZGODNE
- Stan: rok przygotowany (Pożyczka dla Tomka – TOMASZ KOLEGA, do oddania 1 000,00), im-b, im-b2.
- Widać: „Zwrot pożyczki: Pożyczka dla Tomka” w „Rozpoznane – sprawdź”, w decyzjach „Zwrot pożyczki – Pożyczka dla
  Tomka (Radar)”; URZĄD SKARBOWY → „Podatek PIT-38” (przy nim brak „zapamiętaj”); po imporcie Radar „oddane 1 500,00 zł
  z 2 000,00 zł” (pozostało 1 000 → 500), poza przychodami; w L2 TOMASZ KOLEGA znowu „Rozpoznane – sprawdź”, URZĄD
  SKARBOWY znowu „Do decyzji”; reguł pożyczki i PIT-38 brak.

### IM.27 – ZGODNE
- Stan: rok przygotowany (reguła MULTIKINO → „kino (stare)”, zarchiwizowana), im-b, im-b2.
- Widać: Ustawienia „MULTIKINO wydatki Rozrywka i hobby · kino (stare) (zarchiwizowana)”; w L1 Multikino „do decyzji ·
  kategoria reguły zarchiwizowana – wybierz nową”; temat „Przelewy wychodzące” z „zapamiętaj” (domyślnie zaznaczone),
  „Przyjmij pewne (22)”; wynik „nowe reguły: 27”; reguły w Ustawieniach z „N op.”; w L2 CUKIERNIA SŁODKA, WETERYNARZ,
  Biedronka, Kaufland w „Gotowe” z „reguła”/„Twoje reguły”; wydatek bez decyzji (STUDIO URODY ANETA, PAYU w im-b) bez
  reguły.

### IM.28 – NIEZGODNE (N)
- Stan: rok (im-c2, im-e52-4), rok przygotowany (im-b, im-b2).
- Zgodne: „kopia przed importem: C:\…\backups\pre-import\2026-11-03_112340.zip” – ZIP ma 993 operacje = folder przed
  importem, żadnej z importu; po 11 importach dziennych zostaje 10 najnowszych kopii; w folderze ICTTJ brak ZIP;
  „Zapisz import (bez zmian)” dla pliku tego samego formatu (L1 po L1, H2 po historii) – bez kopii.
- Niezgodne: „Zapisz import (bez zmian)” dla pliku drugiego formatu robi kopię i import do cofnięcia: L0-znane (lista
  dni z historii) – „Nowe: 0 … kopia przed importem: C:\…\im-e52-4\…\2026-11-03_114039.zip ‹Cofnij import›”; HL
  (historia dni z listy) – „Nowe: 0 … kopia przed importem: …\im-c2\…\2026-11-03_114407.zip”. Kopie „bez zmian”
  wypychają z dziesiątki prawdziwe kopie sprzed importów.
- Oczekiwane: „„Zapisz import (bez zmian)” nie robi kopii”. Zrzut: IM.41-HL.png.

### IM.29 – ZGODNE
- Stan: rok przygotowany, im-b (i im-b2, im-a3).
- Widać: podgląd 67 / 7 / 0 → toast „Zaimportowano: 67 nowych operacji; połączone z wpisami: 7, rozliczone: 0.”, panel
  „Nowe: 67 · połączone z wpisami: 7 · rozliczone: 0 · usunięte: 0 · nowe reguły: 6” (+ dopiski: „drugie strony
  przelewów”, „pominięte (usunięte wcześniej)”, „nie importowane (Twój wybór)” w innych przebiegach); operacji +67;
  Meldunki „Bez kategorii” 1 → 4 („4 wydatki bez kategorii … 569,00 zł”); nagłówek „ostatni import – mBank: 3.11.2026,
  11:23” (format – IM.1); odprawa bez „ostatni import 7 dni temu”. Saldo z pliku – lista go nie ma.

### IM.30 – UWAGA
- Stan: rok, im-c2.
- Zgodne: okno „Import z 3.11.2026, 11:43 · L1.csv · 19.10.2026 – 01.11.2026 / usunie operacje, które utworzył: 71 –
  w tym zmienione później przez Ciebie: 1 (te zmiany też znikną) / cofnie zmiany we wpisach, które połączył z bankiem
  albo rozliczył: 19 (Twoje późniejsze zmiany zostają) / Kolejny import tego pliku wczyta te operacje od nowa.”; toast
  „Import cofnięty: usunięte operacje: 71, wpisy sprzed importu: 19.” z „Cofnij” → „Import znowu w budżecie.”; saldo
  69 747,04 → 68 287,86 → 69 747,04 → 68 287,86; ponowne L1 po cofnięciu – 71 nowych (nie „usunięte przez Ciebie”).
- Uwaga (liczba): po „Cofnij” cofnięcia drugie okno mówi „w tym zmienione później przez Ciebie: 71 (te zmiany też
  znikną)” – zmieniona była jedna. Powód „usunięty przy cofnięciu importu” – panel „Usunięte wpisy” zwinięty, nie
  odczytany. Zrzut: IM.30-okno.png, IM.30-toast.png.

### IM.31 – UWAGA
- Stan: rok + L0p (dwie nierozliczone), im-c1.
- Zgodne: „Ostatnie importy”, przy starszym „—” z dymkiem „Importy cofa się od ostatniego”; po cofnięciu L2 i H1:
  Bar pod Lipą znowu ręczny (bez danych banku) z dopisaną notatką „notatka po imporcie H1”, nierozliczone ZABKA i ORLEN
  wracają (`pending`), nowa reguła `jannowak` usunięta, zmieniona `kawiarniamokka` zostaje („reguły zmienione albo
  usunięte po imporcie zostają, jak są: 1”), potwierdzenie salda z pliku usunięte („ostatnio potwierdzone 26.10.2026”),
  przy pozycjach „cofnięty 3.11.2026, 11:34”.
- Uwaga (liczba): okno cofania H1 – „usunie operacje, które utworzył: 14 – w tym zmienione później przez Ciebie: 10”;
  użytkownik nie zmieniał żadnej z nich (dotknął ich import L2, już cofnięty). Zrzut: IM.31-okno-H1.png.

### IM.32 – ZGODNE
- Stan: dwa komputery na kopiach folderu (B zaimportował L1; na A dotarł rekord importu i 35 z 71 operacji), im-g32.
- Widać: „36 operacji tego importu nie ma na tym komputerze i nigdy tu nie były – pewnie jeszcze się synchronizują
  (OneDrive): cofnij import za chwilę. Usunięte poza aplikacją już nie dotrą – wtedy „Cofnij mimo to”.” z „Cofnij mimo
  to”; bez potwierdzenia nic nie znikło (1017 → 1017); po „mimo to” „Import cofnięty: usunięte operacje: 35.” Operacji
  dochodzących później nie symulowałem. Zrzut: IM.32-ostrzezenie.png.

### IM.33 – ZGODNE
- Stan: rok + L0p, im-c1.
- Widać: „mBank: saldo w banku na koniec 02.11.2026 – 71 848,36 zł, w FI – 71 848,36 zł.” i „Kadłub zgodny z odczytem
  banku. Saldo potwierdzone.”; potwierdzenie z datą 2026-11-02 (ostatni dzień pliku), bez korekty; Ustawienia „ostatnio
  potwierdzone 02.11.2026 (71 848,36 zł)”; odprawa bez „mBank: saldo potwierdzone 8 dni temu”; po imporcie listy (L1, im-c2) panelu „Telemetria
  z banku” nie ma. Misja „Inwentaryzacja” – w tym tygodniu nie wylosowana (misja „Killzone”), nie do sprawdzenia.

### IM.34 – ZGODNE
- Stan: rok; w FI DROGERIA NATURA 23.10 −28,15 → −29,15, wpis ręczny Kwiaciarnia −40,00 (22.10), usunięta ZABKA 25.10
  −31,95; konto „mBank firmowe” z saldem otwarcia 03.11; im-c3.
- Widać: „Różnica −9,05 zł (FI − bank) – od 22.10.2026.”, „W banku, a nie w FI (pominięte, usunięte, na innym
  koncie)(1)” ZABKA −31,95, „W FI, a nie w banku (…)(1)” Kwiaciarnia −40,00, „Inna kwota w FI niż w banku(1)” „DROGERIA
  NATURA FI −29,15 · bank −28,15” (suma = −9,05, pierwszy dzień = najwcześniejsza przyczyna); klik → Operacje; korekt
  0 → 0; „Potwierdź z korektą +9,05 zł”, „Korekta to ostatnia opcja – najpierw sprawdź operacje wyżej.”; H3 – „Luki
  w saldach pliku (lista przefiltrowana albo niepełna)(1) 22.10.2026 – 23.10.2026 −320,00”; późne saldo otwarcia –
  „Saldo otwarcia konta jest z 03.11.2026 – później niż koniec pliku; potwierdzenie z pliku nie ma czego porównać.”
  Zrzut: IM.34-H2.png, IM.34-H3.png, IM.34-pozne-saldo.png.

### IM.35 – ZGODNE
- Stan: rok, im-e, im-e2 (udawane Pobrane przebiegu).
- Widać: po 2 s „Nowe pliki z mBanku · lista_operacji_L2.csv 26.10–03.11 · 88 operacji · Pobrane ‹Importuj›”; odprawa
  „Nowy meldunek z mBanku (26.10–03.11): lista_operacji_L2.csv w folderze Pobrane – importuj.”; jedno powiadomienie
  „Nowy meldunek z mBanku” po ~65 s, bez powtórki po 150 s; Z, X, plik z datą −15 dni i już zaimportowany
  rok-historia.csv – niezgłoszone; „Importuj” → ten sam podgląd, „Przyjmij pewne”, „Importuj (87)” = 3 kliknięcia; po
  imporcie plik znika z listy i z odprawy; po wyłączeniu „Szukaj nowych plików…” (`bankFiles: false`) nowy plik nie
  pojawia się, brak powiadomień. Zrzut: IM.35-lista.png.

### IM.36 – NIE DO SPRAWDZENIA
- Widać notkę „Plik „lista_operacji_L2.csv” zawiera numer konta i operacje – po imporcie nie jest potrzebny.”
  i „Przenieś plik do Kosza” (zrzut IM.36-notka.png). Przycisk przenosi od razu, bez potwierdzenia – nie kliknąłem
  (Kosz Windows użytkownika); przeniesienie i wariant „pliku już nie ma” – do sprawdzenia w maszynie.

### IM.37 – poza laboratorium (Maszyna)

### IM.38 – ZGODNE
- Stan: rok przygotowany (mBank …0001, mBank oszczędności …5555), im-d1.
- Widać: „Plik jest z rachunku …9876, a na konto „mBank oszczędności” trafiały dotąd pliki z rachunku …5555 – sprawdź
  wybrane konto. Nowy rachunek w banku? Import go zapamięta.”; „Pliki z tego rachunku (…0001) trafiały dotąd na konto
  „mBank” – sprawdź, czy wybrane konto się zgadza.”; zgodne konto – bez ostrzeżenia; import R możliwy, numer zapamiętany
  (…9876); tylko cztery cyfry.
- Spostrzeżenie: „Konto w budżecie” zostaje z poprzedniego pliku (po K2 na oszczędnościach kolejny plik otwiera się na
  oszczędnościach, nawet gdy jego numer jest znany dla mBanku) – ostrzeżenie ratuje, ale konto można by wybrać po numerze.

### IM.39 – NIEZGODNE (W)
- Stan: rok; L1 zaimportowany najpierw na Portfel XTB (mimo ostrzeżenia „Pliki z tego rachunku (…0001) trafiały dotąd
  na konto „mBank”…”), na Portfelu ŚLUSARZ → „Dom · wyposażenie” + notatka; potem L1 na mBank (konto wybrane ręcznie –
  po poprzednim pliku lista „Konto w budżecie” stała na „Portfel XTB”); przebieg im-d2, powtórzony.
- Zgodne: „Już w budżecie na innym koncie (90)” z notką „Te operacje z banku są na innym koncie – plik tego konta trafił
  tam wcześniej albo operację przeniesiono. Nie wejdą drugi raz; zaznaczone przeniosę na to konto (z kategorią
  i notatkami).”, pozycje zaznaczone „· teraz na: Portfel XTB”; po odznaczeniu CITYFIT „przeniesione z innego konta 89”;
  wynik „przeniesione z innego konta: 89”; ŚLUSARZ na mBanku z kategorią i notatką; CITYFIT zostaje na Portfelu.
- Niezgodne: pierwszy (zły) import wpisał na Portfel jako nowe także 17 wierszy 19–26.10, które były już na mBanku
  (z historii rachunku); przeniesienie zrobiło z nich drugie egzemplarze na mBanku – w obu przebiegach 17 par
  data|kwota podwójnych (np. „2026-10-25|-3195”, „2026-10-20|300000”), saldo mBanku 69 747,04 → 69 658,67 zł; Meldunki
  „19 możliwych duplikatów – ta sama operacja dwa razy.”
- Oczekiwane: „po imporcie przeniesione na mBank z kategorią i notatkami, bez duplikatów”; nie przechodzi, gdy
  „operacje wchodzą drugi raz na mBank”. (Ta sama przyczyna co IM.42: wiersz z listy nie jest rozpoznany jako operacja
  z historii rachunku na innym koncie.)
- Dodatkowo: po złym imporcie numer …0001 zapamiętany dla Portfela XTB – kolejny plik mBanku ostrzega „…trafiały dotąd
  na konto „Portfel XTB””.
- Zrzut: IM.39-portfel.png, IM.39-mbank.png. Odczyt: `im.jsonl` IM.39.

### IM.40 – NIEZGODNE (S)
- Stan: rok przygotowany, im-b, im-b2, im-a3.
- Zgodne: L1 drugi raz – „Wszystkie operacje z tego pliku są już w budżecie – ten plik (albo okres) był już
  zaimportowany.”, „Zapisz import (bez zmian)” z dymkiem „W pliku nie ma nic nowego – zapis zapamięta czas importu…”;
  zapis aktualizuje `lastImport`, bez kopii i bez operacji; dwa identyczne wiersze ZABKA Z5555 −12,34 = dwie operacje
  (Meldunki: „Dwa obciążenia z banku: ZABKA Z5555 12,34 zł – możliwe podwójne pobranie”).
- Niezgodne: L1 po L2 (lista starsza niż rozliczenie) proponuje nierozliczone, które L2 już rozliczył, jako nowe:
  „nowe operacje 3 … Importuj (3)” – „ZABKA Z1234 … nierozliczona −23,50”, „ORLEN STACJA 4123 … nierozliczona
  −200,00”, „APTEKA GEMINI … nierozliczona −50,00”, a w folderze są już rozliczone −24,91, −212,00 i −54,00 (im-a3; w
  im-b2 „nowe operacje 2”). „Importuj” zrobiłby duplikaty.
- Oczekiwane: „wczytaj L1 trzeci raz … nie przechodzi, gdy ponowny import tworzy duplikaty”. Zrzut: IM.40-trzeci-raz.png.

### IM.41 – ZGODNE
- Stan: rok + L1, im-c2.
- Widać: HL – „już zaimportowane (bez zmian) 15 · w tym z listy operacji 15”, żadnej operacji drugi raz, saldo mBanku
  68 287,86 → 68 287,86, operacji 1053 → 1053. (Telemetria HL pokazała różnicę – syntetyczne saldo HL nie obejmuje
  pozostałych wierszy L1; problem pliku, nie aplikacji.) Kopia przy „bez zmian” – IM.28.

### IM.42 – NIEZGODNE (K)
- Stan: rok przygotowany; w Operacjach usunięta operacja banku z okresu L1 – „25.10 ZABKA Z1234 mBank −31,95”
  (zaimportowana z historii rachunku); przebiegi im-b i im-b2.
- Widać: podgląd L1 bez sekcji „Usunięte przez Ciebie wcześniej” i bez licznika „usunięte przez Ciebie wcześniej”:
  „nowe operacje 67 · połączone 7 · już zaimportowane 16” (bez usunięcia było 17 znanych); po imporcie w folderze
  znowu „2026-10-25 mBank expense −3195 „ZABKA Z1234” (z listy)”. Usunięta operacja wróciła bez słowa i liczy się
  w saldzie.
- Ten sam przypadek w jednym formacie działa: usunięty KAUFLAND z importu listy – L1 znowu: „usunięte przez Ciebie
  wcześniej (pominięte) 1”; usunięta nierozliczona APTEKA GEMINI rozliczona w L2 +8 % – „Usunięte przez Ciebie wcześniej
  (2)”, niezaznaczona, po zaznaczeniu weszła jako nowa; wynik „pominięte (usunięte wcześniej): 1”.
- Oczekiwane: „usunięte – „usunięte przez Ciebie wcześniej (pominięte): 1”… nie przechodzi, gdy usunięta operacja
  wraca bez zaznaczenia”. Waga K: zła kwota bez ostrzeżenia (operacja usunięta np. jako duplikat znowu w saldzie);
  wystarczy kolejny import listy po imporcie historii rachunku – zwykła droga użytkownika.
- Zrzut: IM.b-L1-podglad.png, IM.29-wynik.png.

### IM.43 – ZGODNE
- Stan: rok, im-a2 (porównanie wszystkich decyzji tematów i grup przed / po).
- Widać: po Operacjach i powrocie – plik i decyzje bez różnic; po „Konto w budżecie” Portfel XTB → mBank – bez różnic;
  „Zamknięto „L1.csv” bez importu.” z „Cofnij” – decyzje wracają; „Otwarto „L2.csv” – decyzje pliku „L1.csv” nie zostały
  zaimportowane.” z „Cofnij” – L1 i decyzje wracają.

### IM.44 – ZGODNE
- Stan: rok, im-g44.
- Widać: przy otwartym L1 dopisany w Ustawieniach domownik „Janek” (JAN NOWAK) i słowo „zegarmistrz” – po powrocie plik
  otwarty, listy decyzji już z „Janek”, decyzja tematu zostaje; folder tylko do odczytu (`fi.json` nowszej wersji) –
  przycisk „Folder tylko do odczytu”, nic nie zapisane. Zrzut: IM.44-tylko-do-odczytu.png.
- Nie sprawdzone rzetelnie: komunikat „Operacje albo reguły zmieniły się w trakcie…” – zmiana z „drugiego komputera”
  (kategoria znanej operacji 25.10) nie zmieniała planu i import przeszedł; klik decyzji w trakcie zapisu – nie trafiłem
  w okno zapisu.

### IM.45 – NIEZGODNE (N)
- Stan: rok + 140 reguł (136 bez trafień, dawne reguły pożyczki, PIT-38 i XTB, „netia”), im-f1. Druga obserwacja – kod
  (`RulesAudit.tsx`: licznik liczy `audit.idle` bez tych rodzajów, lista filtruje `!audit.hits.has(r.id)`).
- Zgodne: „Bolt … 45 op.” = 45 operacji Bolta z banku; „wszystkie”, „niespójne (5)”, „bez trafień (136)”, lista po 100
  z „pokaż kolejne (50 z 50)”; „zmień” Netii – kategoria, „Tagi operacji” #ulga-internet, „Zapisz” – toast „Reguła
  „NETIA SA” zmieniona.” z „Cofnij” (cofa), notka „Zmieniona reguła działa przy kolejnych importach; operacje z historii
  zmienia „Zastosuj do historii”.”; historia Netii bez zmian.
- Niezgodne: lista „bez trafień” ma 139 reguł („pokaż kolejne (39 z 39)” po 100), w tym „POŻYCZKA STARA … Pożyczka 0
  op.”, a licznik przycisku mówi 136. Oczekiwane: „„bez trafień” bez pożyczek, PIT-38 i XTB”.
- Netia z L2 przyszła jako opłata kontenera („Ładownia · Internet Netia”) – tag reguły nie dotyczy (decyzja nie z reguły).
  Zrzut: IM.45-reguly.png.

### IM.46 – ZGODNE
- Stan: rok; 5 operacji Bolta z banku w „przejazdy” (jedna z podziałem paragonu), im-f1.
- Widać: „4 inaczej”, „Operacje tej marki z inną kategorią albo innym finansującym niż reguła:” z „Auto · przejazdy →
  Rozrywka i hobby · wyjścia” (paragon pominięty); po zmianie jednej w Operacjach lista policzona od nowa (pokazuje nową
  kategorię); „Zastosuj do historii (4)” – toast „Reguła „Bolt” zastosowana do historii: 4 operacje.” z „Cofnij”;
  „Cofnij” przywraca 4 operacje, paragon nietknięty. Komunikatu „Te operacje zmieniły się od sprawdzenia…” nie
  zobaczyłem (zmiana poza ekranem, lista przeliczona po powrocie). Koperty – nie odczytane.

### IM.47 – ZGODNE
- Stan: rok; 12 operacji Orlenu z banku zmienionych na 8,50–39,90 zł „kawa i przekąski”, im-f1.
- Widać: „Orlen · Auto · paliwo 24× (163,33–270,14 zł) · Jedzenie · kawa i przekąski 12× (8,50–39,90 zł)”, „‹Reguła:
  do 40,00 zł → Jedzenie · kawa i przekąski›”; toast „Nowa reguła: Orlen do 40 zł.” z „Cofnij” (cofa); reguła „Orlen do
  40,00 zł … 12 op.”; L2: 35,00 i 40,00 – kawa (granica włącznie), 150,00 i 212,00 – paliwo. Pola progu nie dało się
  wyczyścić (wraca 40,00) – „Zapisz” bez progu nie do sprawdzenia.

### IM.48 – NIEZGODNE (S)
- Stan: rok, im-a, im-a2, im-e2.
- Widać: „usuń” przy regule (DROGERIA NATURA, Bolt) i przy słowie kluczowym („cukiernia”, „szewc”) usuwa od razu – bez
  okna i bez dymka z „Cofnij” (reguł 10 → 9, słów 1 → 0; brak nowych komunikatów); po usunięciu reguły DROGERIA NATURA
  wraca do słowa wbudowanego „drogeria”.
- Oczekiwane: „usunięcie z „Cofnij” w toaście … albo z potwierdzeniem”; nie przechodzi, gdy „jedno kliknięcie usuwa
  regułę nauczoną przez miesiące bez potwierdzenia i bez „Cofnij”” (reguła Bolt – 45 operacji). Zrzut: IM.48-regula.png,
  IM.48-slowo.png, IM.48-regula-2.png.

### IM.49 – ZGODNE
- Stan: rok + kopie wpisane ręcznie: Biedronka (ta sama kategoria, notatka, godzina), Lidl (inna kategoria), „Allegro
  zakupy” −250,00 (bank −246,22), EVENTIM pokryty wpłatą Marka, XTB +3 000,00 (bank zadokowany), Żabka (wpis nowszej
  wersji); im-f2.
- Widać: plakietki „wpis ręczny + bank”, „inna decyzja w kopii” (Lidl, EVENTIM) – niezaznaczone, „zapisana przez nowszą
  wersję aplikacji – tylko do odczytu” – zablokowana, „inna kwota” (Allegro) – zaznaczona; daty dd.mm.rrrr, „XTB (konto
  tradingowe)”; „Scal zaznaczone (3)” → „Scalono duplikaty: usunięto 3 kopie.” z „Cofnij”; zostały wpisy z danymi banku,
  notatką „notatka do zachowania” i 18:00; dokowanie wypłaty przepięte na zachowaną operację; saldo 71 873,64 → 69 179,50
  → (Cofnij) 71 873,64. Przypadek „możliwy duplikat – jedno wspólne słowo” – moja para Allegro wyszła jako „inna
  kwota” (zaznaczona); czystej pary „jedno wspólne słowo” nie zbudowałem. Zrzut: IM.49-panel.png.

### IM.50 – ZGODNE
- Stan: jak IM.49, im-f2 (z restartem).
- Widać: „Para oznaczona „to nie duplikat” – nie będzie pokazywana.” z „Cofnij” (para wraca); po restarcie para nie
  wraca; Meldunki „5 możliwych duplikatów”; Ustawienia „Pary oznaczone „to nie duplikat”: 1 ‹pokazuj znowu›” → „Pary „to
  nie duplikat” będą znowu pokazywane.” z „Cofnij”. Drugi komputer – nie sprawdzony.

### IM.51 – ZGODNE
- Stan: dwa komputery na kopiach folderu (A i B importują L1; na A notatka przy Kaufland i dokowanie wypłaty XTB
  3 200,00; synchronizacja B → A), im-g51.
- Widać: Meldunki „71 możliwych duplikatów – ta sama operacja dwa razy.”; grupy „ten sam wiersz banku” (zaznaczone);
  po scaleniu zostaje Kaufland z „notatka z komputera A” i zadokowana wypłata (dokowanie wskazuje istniejącą
  operację), wierszy banku podwójnych 0; saldo mBanku 66 828,68 → 68 287,86 (= po jednym imporcie). Zrzut: IM.51-panel.png.

### IM.52 – ZGODNE
- Stan: rok z ostatnim importem 4 dni / 3 dni przed 03.11, im-e52-4, im-e52-3.
- Widać: 4 dni – „mBank: ostatni import 4 dni temu – zaimportuj nowy plik (w mBanku: Historia → lista operacji →
  „Eksportuj” CSV).”; 3 dni – brak; po „Zapisz import (bez zmian)” – pozycja znika; Portfel XTB bez przypomnienia o
  imporcie. Zrzut: IM.52-4-dni.png, IM.52-3-dni.png.

### IM.53 – poza laboratorium (Maszyna)

### IM.54 – ZGODNE
- Stan: rok, HY (31.12.2025 zaksięgowana 02.01.2026, 01.12, 01.01, 31.01, 29.03 i 25.10 – dni zmiany czasu), im-c3.
- Widać: „31.12 śr SKLEP SYLWESTROWY … −150,00” – data operacji, nie księgowania; w edytorze „[31.12.2025]” i puste pole
  godziny; operacje 29.03 i 25.10 z właściwą datą; Wywiad → Killzones: „Zakupy z godziną: 65, bez godziny: 272” – import
  nie dostaje godziny. (HY trafił na konto wybrane z poprzedniego pliku – „mBank firmowe”; koperty grudnia i stycznia
  nie odczytane.) Zrzut: IM.54-sylwester.png.

### IM.55 – NIEZGODNE (S)
- Stan: rok; P30k (lista 30 000 wierszy, 2942 marki, 01.09.2025–30.10.2026), P2k (2000 nowych); przebieg im-h trzy razy
  (pierwszy z nazwami, które sklejały się w jedną markę – odrzucony jako problem pliku).
- Widać: podgląd P30k po 18,7–21,0 s; w trakcie wczytywania okno nie odświeżało się przez 17,6 s (najdłuższa przerwa
  `requestAnimationFrame`); „Nowe operacje: 2942 grupy w 3 tematach…”, tematy z 732–1468 markami zwinięte, „pokaż kolejne
  (100 z 642)”; znak w wyszukiwarce do licznika 1,0–1,2 s, wyszukanie marki 0,43 s, decyzja tematu 0,23–1,36 s; zapis 2000
  operacji 30,8–43,3 s przy oknie odpowiadającym (najdłuższa przerwa 0,52–0,55 s); Operacje „Cała historia” 0,28–0,35 s;
  bez okienka „okno nie odpowiada”.
- Oczekiwane: „podgląd w kilka sekund, ekran odpowiada (decyzja, znak w wyszukiwarce poniżej sekundy) … zapis 2000
  operacji kilka sekund”; nie przechodzi, gdy „okno zamiera na kilkanaście sekund”.
- Zastrzeżenie: komputer laboratorium był obciążony równoległymi przebiegami innych obszarów – czasy do powtórzenia
  w maszynie; zamrożenie okna przy wczytaniu jest jednak bezwzględne (17,6 s bez klatki).
- Zrzut: IM.55-podglad.png, IM.55-operacje.png.

### IM.56 – poza laboratorium (Ty)

---

## Znaleziska
- IM.42 (K) – usunięta operacja z banku wraca bez słowa przy imporcie pliku drugiego formatu (historia → lista).
- IM.39 (W) – poprawienie importu na złe konto przenosi też kopie operacji, które już były na mBanku – 17 duplikatów.
- IM.23 (W) – wpłata domownika z „zaliczka” nie spłaca tego, co ma oddać, choć opcja nazywa się „reszta jako zaliczka” (P.3 potwierdzone).
- IM.10 (S) – „Decyzja dla zaznaczonych” z kategorią zmienia zaznaczony wpływ (spłatę pożyczki) w zwrot towaru z tą kategorią, bez komunikatu o kierunku.
- IM.25 (S) – „+ w tym za …” przy pojedynczej wpłacie nie działa; przy grupie dotyczy każdej wpłaty.
- IM.40 (S) – starsza lista po rozliczeniu proponuje rozliczone nierozliczone jako nowe (duplikaty po „Importuj”).
- IM.48 (S) – usunięcie reguły i słowa kluczowego bez potwierdzenia i bez „Cofnij”.
- IM.55 (S) – wczytanie pliku 30 tys. wierszy (2942 marki) zamraża okno na 17,6 s; podgląd ~20 s.
- IM.8 (N) – brak „(jak grupa)” w wierszu, gdy grupa ma kategorię; pierwsza opcja „— bez kategorii —”.
- IM.13 (N) – „rozłącz” połączonych nazw bez „Cofnij”.
- IM.19 (N) – opłaty z kategorią mBanku lądują w temacie podpowiedzi (z kursami), nie w „Opłaty banku”.
- IM.24 (N) – „+ domownik” przy przelewie własnym, wypłacie XTB i zwrocie pożyczki.
- IM.28 (N) – „Zapisz import (bez zmian)” dla pliku drugiego formatu robi kopię przed importem.
- IM.45 (N) – „bez trafień” pokazuje reguły pożyczki / PIT-38 / XTB; licznik ≠ lista (136 / 139).

## Spostrzeżenia
- Daty: znaczniki czasu „3.11.2026, 11:23” obok dat „03.11.2026” (nagłówek importu, „Ostatnie importy”, okno cofania,
  „zapisano …”). Jeden format dd.mm.rrrr.
- Konto importu „klei się” do poprzedniego pliku – kolejny plik otwiera się na ostatnio wybranym koncie, nawet gdy jego
  numer jest zapamiętany dla innego konta; wybór konta po numerze rachunku usunąłby całą klasę pomyłek (IM.38, IM.39).
- Liczby w oknie „Cofnij import” („w tym zmienione później przez Ciebie”) liczą zmiany zrobione przez inne importy
  i „Cofnij” – straszą utratą zmian, których nie było (IM.30, IM.31).
- Dwie nazwy jednego wyboru celu wpłaty w jednej grupie (lista „reszta jako zaliczka/przychód” + przełącznik „spłata /
  niezależny przychód / zaliczka”) – źródło P.3; do tego „zwrot do przypisania 50,00 zł – wskaż zakupy” przy jednym
  zakupie do wskazania (mogłoby przypisać samo).
- Temat podpowiedzi mBanku łączy różne kategorie banku („Edukacja, Opłaty i odsetki”) – „Przyjmij podpowiedzi” daje
  jedną kategorię rzeczom różnym.
- „Połącz nazwy (N)” proponowane dla dowolnych zaznaczonych grup (wpływ + wydatek, cztery różne cukiernie).
- Komunikat odrzuconego pliku G tylko w dymku; w panelu zostaje poprzedni błąd innego pliku.
- „Nierozliczone, które bank rozliczył inaczej” pokazuje też rozliczenia bez zmiany („−23,50 → −23,50”).
- Wyszukiwarka importu nie szuka po rodzaju operacji („bankomat” – „Nic nie pasuje”, choć jest „WYPŁATA W BANKOMACIE”).
- „Przenieś plik do Kosza” działa jednym kliknięciem, bez potwierdzenia (zgodnie z opisem, ale nieodwracalne z poziomu
  aplikacji).
- Import 2000 operacji – 31–43 s przy oknie, które odpowiada (najdłuższa przerwa odświeżania 0,55 s); laboratorium
  obciążone równoległymi przebiegami innych obszarów – do pomiaru w maszynie.
- Rozpoznanie „ta sama operacja z listy i z historii” działa przy imporcie (IM.41, „w tym z historii rachunku”), ale nie
  przy „usuniętych przez Ciebie” (IM.42) ani przy „na innym koncie” (IM.39) – jedna wspólna ścieżka dopasowania
  między formatami zamknęłaby oba znaleziska.

## Problemy laboratorium
- `useState` + `start()` działają; brak stanu `dwa-komputery` – dwa komputery symulowane kopiami folderu i kopiowaniem
  plików B → A (opisane przy punktach).
- Pierwsze podejście do IM.39 i jedna z prób IM.54 / IM.38 trafiły na konto „przyklejone” z poprzedniego pliku (moje
  skrypty zakładały mBank) – IM.39 powtórzony z jawnym wyborem konta; przy IM.38 / IM.54 opisane, co faktycznie wybrano.
- Pierwszy wariant SA.8 (podwójne korekty) miał obie korekty z jednego komputera – powtórzony (sa-8b).
- Syntetyczne nazwy „SKLEP DUZY 0042” sklejały się w jedną markę (numery sklepów są obcinane) – P30k wygenerowany
  ponownie z nazwami literowymi.
