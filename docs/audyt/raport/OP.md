# Raport – OP: Operacje

- Data: 03.11.2026 (zegar laboratorium = kotwica persony), przebiegi 11:08–12:10.
- Wersja: Financial Intel 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4`), laboratorium `tests/audyt/lab.ts`
  (wersja „przenośna”, okna poza ekranem).
- Skrypty: `tests/audyt/op-*.spec.ts`, pomocnik `tests/audyt/op-pomoc.ts`; wyjście przebiegów `C:\FI-audyt\przebiegi\op-logi\`,
  zrzuty `C:\FI-audyt\zrzuty\OP.*.png`, odczyty liczb `C:\FI-audyt\odczyty\op.jsonl`, pliki eksportu `C:\FI-audyt\eksport\op-*`,
  pliki z banku `C:\FI-audyt\pliki\op\`.
- Podsumowanie (43 punkty): **ZGODNE 20 · NIEZGODNE 8 · UWAGA 1 · LICZBY → AU-9 13 · poza laboratorium 1** (OP.43)
  – NIEZGODNE: OP.8 S, OP.25 S, OP.26 S, OP.33 S, OP.40 S, OP.3 N, OP.11 N, OP.39 N. Każde NIEZGODNE powtórzone na świeżym
  przebiegu.

## Stany danych

Każdy przebieg pracuje na świeżej kopii (`useState('rok', 'op-…')`), stan w `C:\FI-audyt\stany` nietknięty.

- **rok** – persona bez zmian (kotwica 2026-11-03; 982 operacje; mBank potwierdzony 26.10.2026 69 796,78 zł; Portfel XTB
  i Gotówka bez potwierdzeń; próg dziennika 200 zł; cisza 23:00–05:00).
- **rok+op** (`enrich` w `op-pomoc.ts`, +54 operacje, 1 kategoria): nazwy z „Ł/Ż/Ś”, operacja bez nazwy, notatka
  wielowierszowa, paragon z opisami części („zakupy na tydzień · kabel HDMI”, Jedzenie + Dom), tagi `#Wakacje`
  i `wakacje `, 12,50 zł w obie strony, 50,00 zł w obie strony; bez kategorii: 3 wydatki od startu + „Dino”, 1 sprzed startu
  (20.08.2025), paragon 100 zł z częścią 40 zł bez kategorii, paragon z częścią 0 zł, wpływ, przelew poza budżet, zakup
  Marka i wydatek z celu „Nowy laptop” bez kategorii; „DINO TESTOWO 4” z banku; nierozliczona „ALLEGRO PAY”; zakup nocą
  z wpisem; sygnały (Żabka 95 zł, nowy kontrahent 450 zł, dwa obciążenia BOLT.EU); 3 wiersze banku zapisane dwa razy;
  przelew w jednej operacji mBank → Portfel XTB 28.10; zakupy Kasi/Marka z wpłatami; paragon „Decathlon” z tagami
  i notatką; „PIEKARNIA TESTOWA” 45,00 zł z banku po potwierdzeniu; 6× „obiad” od PIOTR TESTOWY i 1× od EWA TESTOWA;
  oczekiwane zwroty ZALANDO (do 08.11) i MODIVO (termin minął 12 dni temu); kategoria bez koperty „Darowizny”; tag
  „Mazury 2026” połączony z celem „Wakacje 2027”. Operacje z mBanku dodane tylko po 26.10 – potwierdzone saldo zostaje
  prawdziwe.
- **rok+przelewy** (`transfers`): pary sprzed 1.7.0 (mBank → Portfel 27/28.10; para bez wskazanego konta 30.10; Gotówka →
  Portfel 12.10), strona zapisana dwa razy (31.10), strona bez pary po potwierdzeniu Portfela (01.11) i przed nim (Gotówka
  10.10), przelew w jednej operacji Portfel → mBank 15.10 (oba okresy potwierdzone); potwierdzenie Portfela XTB 20.10
  (saldo z folderu), potwierdzenie mBanku 26.10 podniesione o 100 zł z 15.10.
- **brzegi** (OP.40): „rok” + 4 operacje 02.11 (1 234 567,89 zł, +9 999 999,99 zł, kontrahent 300 znaków, 0,00 zł).
- **start** (OP.1): nowy folder (`seedFolder`), budżet od 03.11.2026, saldo otwarcia mBank i Portfel XTB, Gotówka bez salda.
- Folder tylko do odczytu (OP.18, OP.42): `fi.json` z `schemaVersion: 2` – aplikacja sama przechodzi w tryb tylko do
  odczytu („Folder danych ma format v2…”); wpis nowszej wersji – operacja z `schemaVersion: 2`.

## Punkty

### OP.1 – ZGODNE
- Stan: start (`me-start`) i rok (`op-lista`).
- Widać (start): „Brak operacji.” / „Ctrl N dodaje operację; historię z mBanku wczytasz na ekranie Import.”, w szczegółach
  „Wybierz operację z listy albo dodaj nową (Ctrl+N).”. Rok, „qqqzzz”: „Brak operacji dla wybranych filtrów.”, „wyczyść
  filtry” widoczne, „Operacje 0 / 982”.
- Zrzuty: OP.1-pusta-lista.png, OP.1-filtr-bez-wynikow.png

### OP.2 – LICZBY → AU-9
- Stan: rok, przebiegi `op-lista` (11:11 i 11:13).
- Zachowanie zgodne: domyślnie „listopad 2026”, najnowsze na górze, w dniu najpierw wpisy z godziną („20.10 wt 20:00
  Allegro” przed wpisami bez godziny); wydatki bez koloru z „−”, wpływy zielone z „+”, zwrot towaru ZARA 12.09 „+149,99”
  zielony; dymki: „Wpływy na konta – razem z oddanymi przez domowników, zwrotami i pożyczkami; to nie przychód (Raporty,
  panel Przychody)”, „Wydatki minus zwroty towaru (bez przelewów własnych, XTB i wydatków finansowanych przez
  domowników)”; konto bez salda otwarcia: „Gotówka 0,00 zł *” z dymkiem „Bez salda otwarcia – suma operacji” (stan
  start). Sumy zgadzają się z plikami co do grosza (październik: Wydatki −5 583,05 zł = suma ujemnych, Koszty 5 413,19 zł
  = części moje; cała historia: −98 879,42 / 89 126,63). Salda kont w Operacjach = Ustawienia → Konta (mBank 69 747,04 zł,
  Portfel XTB 3 918,89 zł, Gotówka −55,36 zł); Mostek pokazuje sumę 73 610,57 zł = suma trzech. Operacja z datą jutra
  nie zmienia salda (OP.15).
- Odczyty: listopad, październik, wrzesień, cała historia, salda – `op.jsonl`.
- Do AU-9: Gotówka ma saldo ujemne (−55,36 zł, na czerwono) – wypłaty z bankomatu są wydatkiem w kategorii „Gotówka” na
  mBanku, a zakupy za gotówkę wydatkami na koncie Gotówka; konto gotówki tylko maleje.
- Zrzuty: OP.2-pazdziernik.png, OP.2-cala-historia.png

### OP.3 – NIEZGODNE (N)
- Stan: rok, przebiegi `op-lista` 11:13 i `op-okres-2` 11:14 (powtórzone).
- Zrobione: menu okresu → „od” 31.12.2025, „do” 01.01.2026; potem „od” 28.02.2026, „do” 01.03.2026; potem tylko „od”
  26.10.2026.
- Widać: etykieta zakresu „2025-12-31 – 2026-01-01”, „2026-02-28 – 2026-03-01”, „2026-10-26 – …” (format ISO); reszta
  aplikacji pisze daty „dd.mm.rrrr” (np. dymek salda „na początek 01.09.2025”). Także zakres ustawiany przez inne ekrany
  ma tę etykietę („2025-09-01 – …” po „Pokaż w Operacjach”).
- Oczekiwane: etykieta z datami w formacie aplikacji (dd.mm.rrrr) – punkt, „Nie przechodzi” 2.
- Reszta zgodna: miesiąc grudzień 2025 – 67 operacji = 67 plików, od 31.12 do 01.12; styczeń 79 = 79 (01.01 na dole,
  w „od–do” 31.12–01.01 – 7 operacji = 7 plików, granice włącznie); „›” za bieżącym miesiącem – „grudzień 2026”, „Brak
  operacji dla wybranych filtrów.”; „Bieżący miesiąc” wraca do listopada 2026.
- Zrzuty: OP.3-etykieta-zakresu.png, OP.3-zakres.png, OP.3-po-biezacym.png

### OP.4 – ZGODNE
- Stan: rok+op, `op-filtry`.
- Widać: „/” – fokus w wyszukiwarce; „zabka” i „ŻABKA” – po 79 (Żabka i ZABKA Z1234); „lodz” – Pierogarnia Łódź Kaliska;
  „pizzeria tomkiem” – 1 (kontrahent + notatka); „12,50” – „BLIK od Tomka +12,50” i „Kiosk Ruch −12,50”; „kabel hdmi” –
  Carrefour (opis części); „#wakacje” – 2 (oba zapisy tagu); „/” wpisany w notatce zostaje w notatce („a/b”).
- Zrzut: OP.4-kwota.png

### OP.5 – ZGODNE
- Stan: rok+op, `op-filtry-2`.
- Widać: Konto Portfel XTB 94 → + Wydatek 85 → + Przelew własny 87 („lub” w menu, „i” między filtrami); Kategoria „Dom”
  51 z Carrefour (paragon Jedzenie + Dom), „Dom · wyposażenie” 8 z Carrefour, „Jedzenie” 459 z Carrefour; po archiwizacji
  „chemia” przy ustawionym filtrze: „Kategoria: Dom · chemia (archiwum)”, w menu „Dom · chemia (archiwum)” zaznaczone,
  odznaczenie wraca do „wszystkie”.
- Zrzut: OP.5-archiwum.png

### OP.6 – ZGODNE
- Stan: rok+op, `op-filtry`; „częściowo oddane” w stanie rok+op z wpłatą 5 zł Marka (`op-czesciowo-2`).
- Widać: menu „domownik, do oddania, częściowo oddane, oddane, impuls, plan, noc, podział, bez kategorii, z banku,
  nierozliczona, wpisana ręcznie, nietypowa, czeka na zwrot” i notka „Z banku / nierozliczona / wpisana ręcznie oraz
  plan / impuls – dowolne z zaznaczonych; między grupami – wszystkie naraz.”; każde oznaczenie pokazuje operacje ze
  znaczkiem tej samej nazwy (np. „nierozliczona” 1 – ALLEGRO PAY „NIEROZLICZONA”, „noc” 7, „czeka na zwrot” 3); „z banku”
  927 + „nierozliczona” → 928 („lub”); „plan” + „noc” → 0, „plan” + „impuls” + „noc” → 6 („i” między grupami).
  „częściowo oddane” – 1: „Zakup dla Marka … DOMOWNIK · CZĘŚCIOWO ODDANE” (oddane 5 z 10 zł).
- Zrzuty: OP.6-grupy.png, OP.24-czesciowo-2.png

### OP.7 – LICZBY → AU-9
- Stan: rok+op, `op-filtry`.
- Widać: filtr „bez kategorii” (cała historia) – 6: Dino, Sklep bez kategorii A/B/C, Market Paragon (część 40 zł), Sklep
  sprzed startu (20.08.2025); nie ma: Market Zero (część 0 zł), wpływu, przelewu, „Zakup dla Marka” (kolumna:
  „domownik”), „Sklep komputerowy” (kolumna: „z celu”), płatności kontenera ROBERT TESTOWY (kolumna: „ładownia”).
  Meldunek: „5 wydatków bez kategorii od 01.09.2025 – razem 162,79 zł.” – te same operacje bez sprzed startu (lista
  z „Pokaż w Operacjach” – 5, ME.4); kwota 30 + 45,50 + 19,99 + 40 + 27,30 = 162,79 zł.
- Odczyt: `op.jsonl` (OP.7).
- Zrzut: OP.7-bez-kategorii.png

### OP.8 – NIEZGODNE (S)
- Stan: rok+op, przebiegi `op-filtry` 11:31 i `op-kwota-od-do` 11:47 (powtórzone).
- Zrobione: „Więcej filtrów” → „Kwota (bez znaku)” od 100, potem do 20 zł.
- Widać: pole „od” puste, „do 20,00”, „Więcej filtrów: 1”, „Operacje 180 / 1036” – kwoty od 5,00 do 20,00 zł; bez
  komunikatu.
- Oczekiwane: „do” mniejsze niż „od” = bez górnej granicy (lista od 100 zł) – punkt, „Oczekiwany efekt”. Aplikacja
  po cichu kasuje „od” i pokazuje coś odwrotnego niż wpisano.
- Reszta zgodna: 50–50 – 17 operacji (wydatki i wpływ 50,00 zł, część paragonu 50,00), „Więcej filtrów: 1”; Marek – jego
  zakupy (także część MEDIA EXPERT) i wpłaty; „orlen” – jedna pozycja „Orlen (36)” łączy ORLEN STACJA 4123, 7781 i
  „Orlen”; Ładownia, Cel, Pożyczka, Tag – właściwe operacje; Konto przelewu Portfel XTB – przelew w jednej operacji
  („mBank → Portfel XTB”), „konto spoza budżetu” – „Przelew na lokatę”; trzy sekcje → „Więcej filtrów: 3”; „wyczyść te
  filtry” zdejmuje tylko kwotę (Konto: Portfel XTB zostaje).
- Zrzuty: OP.8-od-do-menu.png, OP.8-od-do.png, OP.8-wyczysc.png

### OP.9 – ZGODNE
- Stan: rok+op, listopad 2026.
- Widać: „Kontrahent ▾” w akcencie – ALLEGRO PAY, BLIK…, Lidl, Lody nocne, Łazienki Kiosk, Mokka, …, Sklep…, Ślusarz
  Śmiały, ZABKA Z1234, Zakład Szewski, Żabka, na końcu operacja bez nazwy („Wydatek”); „Kwota” – 450, 220, 130, 95, 89,99,
  80, 45, +35, +35, 34… (bez znaku, wydatki i wpływy razem); „Data” – najnowsze; po ukryciu kolumny „Kontrahent” lista
  wraca do kolejności po dacie.
- Zrzut: OP.9-kontrahent.png

### OP.10 – ZGODNE
- Stan: rok+op, `op-widoki` (+ ponowne uruchomienie, drugi komputer `AUDYT-2` na tym samym folderze) i `op-widoki-3`.
- Widać: toast „Widok „Jedzenie > 50 zł” zapisany – na każdym komputerze.”, chip w akcencie (`data-active`), także po
  zmianie miesiąca; widok bez okresu zostawia miesiąc listy („październik 2026”), widok z okresem z sierpnia przełącza
  na „październik 2026”; zapis tej samej nazwy zastępuje widok (jeden chip, w fi.json nowy filtr); „×” – toast „Widok
  „Październik” usunięty.” z „Cofnij”, „Cofnij” przywraca chip; widoki są po ponownym uruchomieniu i na drugim komputerze;
  widok na drugim komputerze nie zmienia jego kolumn.
- Spostrzeżenie: przycisk „+ Zapisz widok” pojawia się dopiero przy ustawionym filtrze (pasek „Widoki” znika bez filtrów).
- Zrzuty: OP.10-widok-z-okresem.png, OP.10-drugi-komputer.png

### OP.11 – NIEZGODNE (N)
- Stan: rok+op, `op-widoki` 11:43 i `op-widoki-3` 12:04 (powtórzone).
- Zrobione: własny filtr Konto mBank (+ Rodzaj Wydatek), ponowne uruchomienie, Meldunki → „Pokaż w Operacjach” przy
  „bez kategorii”, zmiana konta w tym widoku, „mój filtr”; to samo z Mostka („Marek: do oddania…”).
- Widać: po „mój filtr” – „Konto: mBank”, „Rodzaj: Wydatek”, ale okres zostaje z widoku innego ekranu: „2025-09-01 – …”
  (z Meldunków) albo „cała historia” (z Mostka) – „Operacje 931 / 1036” zamiast listopada sprzed przejścia.
- Oczekiwane: „mój filtr” wraca do zapamiętanego – punkt, „Oczekiwany efekt” (okres widoku zostaje, trzeba osobno
  kliknąć „Bieżący miesiąc”).
- Reszta zgodna: konto i rodzaj zostają po ponownym uruchomieniu (okres wraca do bieżącego miesiąca – także gdy przed
  zamknięciem była „cała historia”); widok z Meldunków ma link „mój filtr”, zmiana w nim nie nadpisuje zapamiętanego
  filtra.
- Zrzuty: OP.11-moj-filtr.png, OP.11-z-mostka.png

### OP.12 – ZGODNE
- Stan: rok+op, `op-widoki` (+ ponowne uruchomienie, drugi komputer `AUDYT-2`).
- Widać: menu „Data … Kwota” z polami Data i Kwota wyszarzonymi (zaznaczone, nieaktywne) i notką „Na tym komputerze. Data
  i kwota zawsze widoczne; eksport CSV / Excel ma wszystkie kolumny.”; po ukryciu Godziny, Tagów, Konta – „Kolumny:
  3 ukryte”, zostaje po ponownym uruchomieniu; drugi komputer – wszystkie kolumny („Kolumny”); „przywróć domyślne” – pełny
  nagłówek. Notatka: „obiad z Tomkiem”, dymek z trzema liniami; Carrefour bez notatki – „zakupy na tydzień · kabel HDMI”.
  Nowa operacja przy ukrytym kontrahencie: „03.11 wt nowa operacja bez kategorii 0,00” (napis w kolumnie Notatka).
- Zrzuty: OP.12-kolumny.png, OP.12-nowa-bez-kontrahenta.png

### OP.13 – ZGODNE
- Stan: rok, `op-nowa`.
- Widać: Ctrl+N na Mostku – Operacje, „Nowa operacja”, fokus w kwocie, wiersz „03.11 wt 11:16 nowa operacja mBank bez
  kategorii 0,00”. Przy filtrze Konto: Portfel XTB i okresie 01.10–15.10 „Nowa” przełącza listę na „listopad 2026”, filtry
  zdjęte tylko w widoku (link „mój filtr”); po kwocie 23,40, nazwie i zmianie konta na mBank wiersz „Kiosk Szkic mBank …
  −23,40” zostaje widoczny. Pusty szkic po Mostku znika (żadnego pliku 0 zł); szkic z kwotą 7,77 (pole nieopuszczone)
  po Radarze zapisany (−7,77 zł).
- Zrzuty: OP.13-ctrlN-z-mostka.png, OP.13-nowa-przy-filtrze.png

### OP.14 – ZGODNE
- Stan: rok, `op-pola` (Lody Grycan 18.10, Portfel XTB).
- Widać: „1.200” i „12,345” – toast „Nieprawidłowa kwota – zostaje poprzednia.”, kwota 25,03 bez zmian; „1 234,56” –
  przyjęte; „12,50+8,30” – 20,80; 99 + Esc – zostaje 20,80; kontrahent + Esc – stara nazwa, + Enter – zapisana; notatka
  i od razu Ctrl+1 – zapisana; wklejona notatka 6000 znaków – w polu i w pliku 5000; dziennik 3000 – 2000; zapis potem
  działa; stopka „zapisano 3.11.2026, 11:17 · AUDYT”.
- Zrzuty: OP.14-kwoty.png, OP.14-dlugie-teksty.png

### OP.15 – LICZBY → AU-9
- Stan: rok, `op-daty` (nowy wydatek 10 zł na Portfelu XTB).
- Widać: „03.10” → 03.10.2026; „06.11” (D0+3) → 06.11.2026; „10.11” (D0+7) → 10.11.2026; „11.11” (D0+8) → 11.11.2025;
  „03.02” → 03.02.2026. Data jutra: znaczek „W PRZYSZŁOŚCI”, dymek „Operacja z przyszłą datą nie liczy się do sald,
  energii i warstw do tego dnia”; saldo Portfela 3 918,89 zł przed i po, „ENERGIA DZIŚ 77,28 zł” przed i po.
- Odczyt: `op.jsonl` (OP.15).
- Zrzut: OP.15-jutro.png

### OP.16 – LICZBY → AU-9
- Stan: rok, `op-rodzaj` i `op-rodzaj-2`.
- Widać: wydatek „zakup / zwrot towaru”; Wpływ – bez przełącznika (kwota +40); Przelew własny „wychodzący / przychodzący”;
  XTB „dopłata do XTB / wypłata z XTB”; Podatek „zapłata / zwrot”; Pożyczka „pożyczam / spłacam / otrzymuję”; Korekta
  „minus / plus”; kwota 40,00 przy każdej zmianie, znak według zaznaczonego kierunku. Pożyczka bez pożyczki z Radaru:
  „Bez pożyczki z Radaru liczy się tylko w osłonach (nie jako przychód ani należność).” Zwrot towaru 30 zł: podpowiedź
  „Zwrot towaru: ujemny wydatek tej samej kategorii.”, wiersz „+30,00” zielony, Koszty 12,00 → −18,00 zł, koperta
  Jedzenie „12,00 / 1 600,00 zł” → „−18,00 / 1 600,00 zł”.
- Odczyt: `op.jsonl` (OP.16).
- Zrzuty: OP.16-zwrot-towaru.png, OP.16-pozyczka.png

### OP.17 – ZGODNE
- Stan: rok+op, `op-oficer`.
- Widać: „Dino” bez kategorii – „oficer: Jedzenie · zakupy spożywcze” (dymek „Oficer: ostatnio u tej marki”); po
  zarchiwizowaniu „zakupy spożywcze” oficera nie ma (nie proponuje archiwum); klik – kategoria ustawiona. „Darowizny” (bez
  koperty): „Kategoria bez koperty – nie zmniejsza energii dziś ani żadnej koperty, ale pomniejsza ogólną energię miesiąca
  (a gdy jej zabraknie – osłony).” Operacja z banku przemianowana na „Dino Market”: „Zapamiętaj: „DINO TESTOWO 4” (Dino
  Market) → Jedzenie · kawa i przekąski”, toast „Zapamiętano: „DINO TESTOWO 4” → Jedzenie · kawa i przekąski. Kolejne
  importy skategoryzują go same.”, reguła `dino` (z nazwy banku) w Ustawienia → Import z banku.
- Zrzuty: OP.17-oficer.png, OP.17-zapamietaj.png

### OP.18 – ZGODNE
- Stan: rok, `op-historia` (AUDYT) → `op-historia-pc2` (AUDYT-2) → `op-historia-ro` (folder tylko do odczytu).
- Widać: „Historia zmian – Operacja 2026-10-18: Lody Grycan −27,03 zł”, wersje z czasem i komputerem („3.11.2026, 11:53 ·
  AUDYT · PRZED EDYCJĄ”, „18.10.2026, 10:30 · LAPTOP-KAPITANA”), różnice „Pole / Ta wersja / Obecnie”: „Kwota −25,03 zł
  / −27,03 zł”, „Kategoria kawa i przekąski / na mieście”, „Notatka puste / notatka z drugiego komputera”; „Przywróć tę
  wersję” przywraca kwotę, kategorię i notatkę, bieżąca wersja w historii jako „PRZED PRZYWRÓCENIEM”. W folderze tylko do
  odczytu przycisk „Historia” aktywny, okno się otwiera.
- Zrzuty: OP.18-historia.png, OP.18-roznice.png, OP.18-tylko-do-odczytu.png

### OP.19 – ZGODNE
- Stan: rok+op, `op-kwota-banku` (PIEKARNIA TESTOWA 29.10, z banku, poza okresem potwierdzonym).
- Widać: 45 → 54: okno „Zmienić operację?” – „Kwota pochodzi z banku (−45,00 zł) – po zmianie operacja nie zgodzi się
  z wyciągiem.” i „Zamrożone dni gry zostają bez zmian.”; „Anuluj” – 45,00 w polu i w pliku; „Zmień mimo to” – 54,00;
  kategoria i notatka bez pytania.
- Zrzut: OP.19-ostrzezenie.png

### OP.20 – LICZBY → AU-9
- Stan: rok (`op-potwierdzony`) i rok+przelewy (`op-przelew-potw`); potwierdzenie mBanku 26.10 (8 dni przed D0, nie 10).
- Widać: znaczek „OKRES POTWIERDZONY”, dymek „Saldo konta mBank potwierdzone 26.10.2026 – zmiana kwoty, daty albo konta
  zmieni potwierdzone saldo”; kategoria bez pytania; kwota 26,88 → 16,88: „To zmieni potwierdzone saldo konta mBank
  z 26.10.2026 o +10,00 zł i stan osłon.” (+ zdanie o kwocie z banku – operacja z banku); data → 27.10 i konto → Portfel:
  „… o +26,88 zł …”; wpis ręczny 28.10 → 20.10: „… o −31,80 zł …”, „Zmień mimo to” zapisuje; nowa operacja z datą 20.10
  nie pyta. Przelew w jednej operacji 100 → 110 zł: dwa zdania – Portfel XTB „o −10,00 zł” i mBank „o +10,00 zł”.
- Odczyt: `op.jsonl` (OP.20). Spostrzeżenie: nowa operacja nie pyta też przy drugiej zmianie kwoty w tym samym otwarciu.
- Zrzuty: OP.20-kwota.png, OP.20-data-wstecz.png, OP.20-przelew-oba-konta.png

### OP.21 – LICZBY → AU-9
- Stan: rok+op, `op-usun` (+ ponowne uruchomienie).
- Widać: pierwszy klik kosza – plik zostaje, przycisk „Usuń na pewno”; po nim toast „Usunięto: Decathlon −220,00 zł
  (01.11.2026).” z „Cofnij”; saldo Portfela 2 327,10 → po „Cofnij” 2 107,10 zł; przywrócona operacja ma te same części
  (opisy, tag części), tagi i notatkę. Druga usunięta („Kiosk Ruch”) w Synchronizacja → Usunięte wpisy („Operacja
  2026-11-01: Kiosk Ruch −12,50 zł · usunięty 3.11.2026, 11:36 · AUDYT · Przywróć”), po ponownym uruchomieniu nie wraca.
- Odczyt: `op.jsonl` (OP.21).
- Zrzuty: OP.21-potwierdzenie.png, OP.21-usuniete-wpisy.png

### OP.22 – LICZBY → AU-9
- Stan: rok, `op-paragon` (wydatek 100 zł Jedzenie, finansuje Anna).
- Widać: po „Podziel paragon” część 1 „100,00 | Jedzenie | Anna”, część 2 „0,00 | bez kategorii | ja”, operacja bez
  finansującego; 60 + 30: „nierozdzielone: 10,00 zł – bez kategorii”, „do ostatniej części” → 60 + 40 „części sumują się
  do kwoty”; 70 + 40: „części przekraczają kwotę o 10,00 zł”, „odejmij od ostatniej części” → 70 + 30 (znak bez zmian);
  „+ część” i usunięcie działają; zostawiona reszta 10 zł – część bez kategorii nieopisana (filtr „bez kategorii” liczy
  takie części, OP.7).
- Odczyt: `op.jsonl` (OP.22).
- Zrzuty: OP.22-reszta.png, OP.22-nadmiar.png

### OP.23 – ZGODNE
- Stan: rok+op, `op-czesci` i `op-czesci-2` (Carrefour).
- Widać: opis części 501 znaków → 500 w polu i pliku; tag „#remont” tylko w części 3; „Ładownia: Czynsz” w części 2,
  „Cel: Nowy laptop” w części 3 (w pliku `containerId` / `goalId` części); po usunięciu przedostatniej z dwóch części –
  opis ostatniej („kabel HDMI”) w notatce operacji, jej tag („elektronika”) w tagach operacji, kategoria ostatniej części
  na operacji. Płatność kontenera „Rata – rodzice” po podziale: „Cała operacja liczy się do ładowni – kategorie części
  nie mają znaczenia.”, pole „Ładownia” widoczne z „Rata – rodzice”.
- Zrzuty: OP.23-czesci.png, OP.23-po-usunieciu.png, OP.23-kontener-podzial.png

### OP.24 – LICZBY → AU-9
- Stan: rok (`op-domownik`), rok+op z wpłatą 5 zł Marka (`op-czesciowo-2`).
- Widać: „EVENTIM … DOMOWNIK · DO ODDANIA”, paragony z Anną „DOMOWNIK · ODDANE”, DOUGLAS (prezent) „DOMOWNIK” bez
  stanu, BOOKING „wspólnie: ja, Anna … DOMOWNIK · ODDANE”; zakup Marka 70 zł po wpłacie 5 zł (z 10 zł pożyczonych z osłon):
  „DOMOWNIK · CZĘŚCIOWO ODDANE”, w edytorze „Marek: oddane 5,00 z 10,00 zł · do oddania 5,00 zł”. „Finansuje”: „— ja (mój wydatek) —”,
  „finansuje: Anna/Kasia/Marek”, „prezent od: Anna/Kasia/Marek”, przycisk „Wspólnie”. EVENTIM → prezent od Marka: Koszty
  sierpnia 6 043,49 zł bez zmian (zakup domownika nie jest kosztem); → „Wspólnie” (ja + Marek, prezent): 6 223,49 zł
  (+180,00 – moja połowa).
- Odczyt: `op.jsonl` (OP.24).
- Zrzut: OP.24-wspolnie.png

### OP.25 – NIEZGODNE (S)
- Stan: rok, `op-impuls` 11:24; to samo w `op-domownik` 11:24 (EVENTIM) i w stanie rok+op (`op-filtry`, „Prezent
  urodzinowy”) – trzy przebiegi.
- Zrobione: nowy wydatek 250 zł (Portfel XTB, Jedzenie), „Finansuje: Anna”.
- Widać: wiersz „Impuls domownika … DOMOWNIK · ODDANE ? −250,00”, w edytorze „od 200,00 zł: plan czy impuls?”; także
  „EVENTIM … DOMOWNIK · DO ODDANIA ? −360,00”.
- Oczekiwane: zakup domownika nie pyta o impuls (D80 f) – punkt, „Nie przechodzi” 3.
- Reszta zgodna: 199,99 bez „?”, 200,00 i 200,01 z „?” (dymek „Od progu dziennika kapitańskiego: plan czy impuls?”);
  „impuls” – żółty znaczek „IMPULS”, „wyczyść” – znów „?”, „plan” – „PLAN”; próg 0 – „?” znika, nowy 500 zł nie pyta;
  filtr „Oznaczenia” ma „plan” i „impuls”.
- Zrzuty: OP.25-impuls.png, OP.25-prog-0.png

### OP.26 – NIEZGODNE (S)
- Stan: rok, `op-noc` 11:25 i `op-noc-2` 11:50.
- Zrobione: nowy wydatek 60 zł, „Finansuje: Anna”, godzina 23:30, wpis „kupione dla Anny”.
- Widać: bez wpisu – ta sama notka co przy moim zakupie („…potwierdź krótkim wpisem wyżej (D40)…”); z wpisem –
  „Potwierdzony zakup w ciszy nocnej – liczy się jako naruszenie w grze.” i „uzasadniony (plan – bez kary)”.
- Oczekiwane: zakup domownika nie jest naruszeniem – punkt, „Oczekiwany efekt”.
- UWAGA (zrozumiałość, osobno): notka odsyła do kodu decyzji – „…potwierdź krótkim wpisem wyżej (D40). Dopisujesz zakup
  z dnia? usuń godzinę” (punkt, „Nie przechodzi” 3).
- Reszta zgodna: „noc” dla 23:00 i 04:59, nie dla 22:59 i 05:00; „usuń godzinę” czyści godzinę; z wpisem – „Potwierdzony
  zakup…”; „uzasadniony” → „Wydatek w ciszy nocnej uzasadniony (plan) – wpis w dzienniku wyjaśnia zakup bez naruszenia
  w grze.”; nowa operacja z godziną 23:15 – notka od razu.
- Zrzuty: OP.26-domownik-noc.png, OP.26-2300-bez-wpisu.png, OP.26-0459-wpis.png

### OP.27 – UWAGA
- Stan: rok+op, `op-tagi` i `op-tagi-2`.
- Widać: „wakacje ” dopisane do operacji z „Wakacje” – jeden tag, zostaje „Wakacje”; filtr „Tag” ma jedną pozycję
  „#Wakacje” i łapie oba zapisy (2), wyszukiwanie „#wakacje” – 2; „wyprawa #Mazury 2026 → rozlicz z celu: Wakacje 2027”
  ustawia „Z pieniędzy celu: Wakacje 2027”. Przy 20 tagach pole tagów znika bez słowa (żadnego komunikatu ani toastu);
  tag 41 znaków po cichu ucięty do 40 („AAAA…” 40 znaków), zapis operacji działa.
- Oczekiwane: „najwyżej 20 tagów po 40 znaków z czytelnym komunikatem” – brak komunikatu (tekst); warunki „Nie
  przechodzi” niespełnione.
- Zrzuty: OP.27-20-tagow.png, OP.27-filtr-tag.png, OP.27-wyprawa.png

### OP.28 – ZGODNE
- Stan: rok + 3 wydatki „Mokka Rynek” bez kategorii i wpływ „Mokka zwrot” (`op-zaznaczone-kat`).
- Widać: „Zaznaczone: 5 operacji · −43,00 zł”, „Ustaw” nieaktywne bez kategorii; toast „Jedzenie · kawa i przekąski:
  3 operacje, pominięte (nie wydatek albo podział): 1 · słowo kluczowe „mokka”.” z „Cofnij”; w fi.json reguła
  `keyword:mokka`; „Cofnij” – kategorie puste, reguły nie ma; zmiana wyszukiwania czyści zaznaczenie (0); „zapamiętaj dla
  ich marek” – toast „… · reguły importu: 1.”, reguła `mokkarynek`.
- Zrzut: OP.28-ustaw.png

### OP.29 – LICZBY → AU-9
- Stan: rok, `op-zaznaczone-fin` (DROGERIA NATURA 23.10, FRYZJER STYL 19.10, P4 20.10 – razem 166,06 zł).
- Zachowanie zgodne: toasty „Finansuje Marek: 3 operacje.”, „Prezent od: Marek: 3 operacje.”, „Wspólnie: ja, Anna:
  3 operacje.”, „Finansuje Anna: 3 operacje.”, „Mój wydatek: 3 operacje.”, każdy z „Cofnij” (przywraca); wspólnie 50 + 40 –
  „razem 90 % – ostatnia osoba bierze resztę do 100 %”, przycisk nieaktywny; 50 + 50 – aktywny, części po połowie.
- Liczby: Mostek „Marek: do oddania 360,00 zł” → 466,06 zł (+106,06 = 166,06 − 60,00 zaliczki Marka z 14.09); energia dziś
  77,28 zł bez zmian (zakupy z października) – do sprawdzenia z wyrocznią.
- Zrzut: OP.29-90-procent.png

### OP.30 – ZGODNE
- Stan: rok, `op-zaznaczone-cofnij`.
- Widać: 4 zaznaczone → „Prezenty i inne · inne”; w ciągu ~1 s kategoria FRYZJER STYL ręcznie i notatka NETIA SA;
  „Cofnij” → „Cofnięto 3 z 4 – jedna zmieniła się w międzyczasie i zostaje bez zmian.”; NETIA SA – kategoria
  przywrócona, notatka „notatka w międzyczasie” została; FRYZJER STYL – ręczna kategoria została.
- Zrzut: OP.30-cofnij.png

### OP.31 – LICZBY → AU-9
- Stan: rok, `op-zaznaczone-usun` i `op-zaznaczone-usun-2` (3 wydatki z października + zadokowane „XTB S.A.” +3 000 zł
  20.10).
- Zachowanie zgodne: podgląd „4 operacje. / Saldo: mBank 69 747,04 zł → 66 913,10 zł / Zmieni potwierdzone saldo konta
  mBank z 26.10.2026 o −2 833,94 zł. / Usunięte zostają w historii – „Cofnij” po usunięciu albo Synchronizacja → Usunięte
  wpisy.”; toast „Usunięto 4 operacje.” z „Cofnij”; „Cofnij” przywraca operacje i dokowanie (9 → 8 → 9). Suma kont na
  Mostku po usunięciu 70 776,63 zł = 73 610,57 − 2 833,94 (zgodna z podglądem salda).
- Liczby: po usunięciu na Mostku zmieniają się też Łupy (803,48 → 969,54 zł), Układy gwiezdne (8 138,96 → 5 138,96 zł)
  i pojawia się meldunek dokowania „Wypłata z ICTTJ 3 000,00 zł (19.10, pula Nadwyżki w masie) bez pary w mBanku” –
  podgląd o tym nie mówi (Spostrzeżenia). Energia dziś i osłony bez zmian, więc ich linii w podglądzie nie ma.
- Odczyt: `op.jsonl` (OP.31). Zrzut: OP.31-podglad.png

### OP.32 – LICZBY → AU-9
- Stan: rok, `op-zaznaczone-konto` i `op-zaznaczone-rodzaj`.
- Zachowanie zgodne: 3 wydatki mBank (ZABKA 26.10 w okresie potwierdzonym, Bar pod Lipą 28.10, Apteka 30.10) → Portfel
  XTB: podgląd „Saldo: mBank 69 747,04 zł → 69 823,66 zł / Saldo: Portfel XTB 3 918,89 zł → 3 842,27 zł / Zmieni
  potwierdzone saldo konta mBank z 26.10.2026 o +26,88 zł.”, toast „Przeniesiono na konto „Portfel XTB”: 3 operacje.”,
  „Cofnij” przywraca konta. 2 wydatki → „Przelew własny – Portfel XTB”: jedna operacja (`bothSides`), wiersze „mBank →
  Portfel XTB Przelew własny”, osłony bez zmian (13 000,00 / 19 500,00 zł), Portfel +49,74 zł, Łupy +49,74 zł. Zadokowana
  + wydatek → „Wydatek”: „Żadna z zaznaczonych operacji się nie zmieni · pominięte 1 (zmiana do nich nie pasuje:
  zadokowane, przelew na własne konto).”
- Liczby: podglądy i Mostek w `op.jsonl` (OP.32). Uwaga do odczytów: wpis OP.32 z 10:43:54 (podgląd Portfela 3 918,89 →
  4 029,07 zł) pochodzi z przebiegu, w którym skrypt zostawił zaznaczoną dodatkową operację – nie porównywać; właściwy
  podgląd: 3 918,89 → 3 968,63 zł (przebieg `op-zaznaczone-rodzaj`).
- Zrzuty: OP.32-podglad-konto.png, OP.32-po-zmianie-rodzaju.png

### OP.33 – NIEZGODNE (S)
- Stan: rok + przelew Portfel XTB → Gotówka 30.10 w jednej operacji z drugą stroną 31.10; przebiegi `op-zaznaczone-data`
  11:46 i `op-zaznaczone-data-2` 11:52.
- Zrobione: zaznaczone Lody Grycan 30.10, Apteka 30.10 i przelew → „Przesuń datę” o 2 → „Podgląd…”.
- Widać: „3 operacje. / Energia dziś 77,28 zł → 76,26 zł / Koperta: Jedzenie 1 588,00 zł → 1 559,40 zł / Koperta:
  Zdrowie 150,00 zł → 132,06 zł” – tylko skutek w listopadzie; o październiku (z którego operacje wychodzą: koperty
  i Łupy z poprzedniego miesiąca) ani słowa.
- Oczekiwane: koperty obu miesięcy w podglądzie – punkt, „Nie przechodzi” 2.
- Reszta zgodna: dymek „Dni: na plus – później, na minus – wcześniej”; daty 01.11, przelew 01.11 / druga strona 02.11;
  toast „Przesunięto datę o +2 dni: 3 operacje.”, „Cofnij” przywraca 30.10 / 31.10.
- Zrzut: OP.33-podglad.png

### OP.34 – LICZBY → AU-9
- Stan: rok, `op-przelew`.
- Zachowanie zgodne: „Jedna operacja dla obu kont: −500,00 zł na mBank, +500,00 zł na Portfel XTB.”; mBank 69 747,04 →
  69 247,04, Portfel 3 918,89 → 4 418,89 zł; energia 77,28 zł bez zmian; na liście Portfela „mBank → Portfel XTB
  Przelew własny +500,00”; 600 zł – obie strony; usunięcie – oba salda wracają, toast z „Cofnij”, „Cofnij” – oba konta.
- Odczyt: `op.jsonl` (OP.34). Zrzut: OP.34-przelew.png

### OP.35 – LICZBY → AU-9
- Stan: rok+przelewy, `op-przelew-stary`.
- Zachowanie zgodne: „Zapisany przed 1.7.0 jako jedna strona – liczy się tylko na koncie mBank.” i „Połącz z drugą
  stroną (28.10, Portfel XTB)”; po połączeniu toast „Przelew połączony w jedną operację dla obu kont.” z „Cofnij”, jedna
  operacja (druga strona 28.10), salda bez zmian (mBank 68 697,04, Portfel 5 168,89 zł). Bez pary: „Dopisz drugą stronę na
  Portfel XTB” → „Przelew jest teraz jedną operacją dla obu kont – drugie konto dostało jego kwotę.”, Portfel +250,00 zł,
  „Cofnij” przywraca. Strona przed potwierdzeniem Portfela: „Zmienić operację?” – „To zmieni potwierdzone saldo konta
  Portfel XTB z 20.10.2026 o +180,00 zł i stan osłon.”
- Odczyt: `op.jsonl` (OP.35). Zrzuty: OP.35-para.png, OP.35-dopisz.png, OP.35-potwierdzony.png

### OP.36 – ZGODNE
- Stan: rok, `op-zwrot-w-drodze` (nowy wydatek 249 zł z 29.10).
- Widać: „Czekam na zwrot pieniędzy (oddany towar, reklamacja, anulowana rezerwacja)” → kwota 249,00, termin 12.11.2026
  (14 dni od zakupu), „W drodze – do 12.11 (jeszcze 9 dni).”, wiersz „CZEKA NA ZWROT”; kwota 100; „Zamknij…” – toast „Zwrot
  zamknięty – nie jest już oczekiwany.” z „Cofnij” (przywraca); „Nie czekam na zwrot” – znaczek znika; przy 0 zł przycisk
  nieaktywny z dymkiem „Najpierw kwota zakupu”; zmiana rodzaju na „Wpływ” usuwa oczekiwanie.
- Zrzut: OP.36-czekam.png

### OP.37 – ZGODNE
- Stan: rok+op, `op-zwrot-import`; plik `C:\FI-audyt\pliki\op\op-L1-zwroty.csv` (lista operacji, 02.11: ZALANDO +230,00,
  EOBUWIE +249,00).
- Widać: import „Nowe: 2”; ZALANDO (A): „Dotarł: 230,00 zł 02.11 (ZALANDO).”; EOBUWIE niczego nie zamknął; ręczny wpływ
  MODIVO 85 zł (−15%) nie zamyka B: „Po terminie 12 dni – zwrot nie dotarł.”; odprawa i Meldunki: „MODIVO: 100,00 zł zwrotu
  nie dotarło od 12 dni (termin 22.10, zakup 08.10).” z „Pokaż zakup”; Radar „ZWROTY W DRODZE (2)” – MODIVO „po terminie
  12 dni 100,00 zł”, ALLEGRO „do 21.11.2026 320,00 zł”.
- Zrzuty: OP.37-zalando.png, OP.37-radar.png

### OP.38 – ZGODNE
- Stan: rok+op, `op-regula-tytulu` (6× „obiad” od PIOTR TESTOWY po 35 zł 27.10–01.11, 1× od EWA TESTOWA); plik
  `C:\FI-audyt\pliki\op\op-H-obiad.csv` (historia rachunku, 03.11, „obiad” od PIOTR TESTOWY 35 zł).
- Zachowanie zgodne: w operacji z 31.10 „⚡ Ustaw regułę dla tytułu „obiad”… w historii: 5”; „Tylko dla operacji od/do:
  PIOTR TESTOWY” zaznaczone; podgląd „Zaktualizuj w historii 5 operacji o tym tytule” z 5 operacjami PIOTR (EWA poza
  listą); „Zapisz i zaktualizuj (5)” → toast „Reguła dla tytułu „obiad” zapamiętana. Zaktualizowano 6 operacji
  w historii.” (5 + otwarta) z „Cofnij”; operacje PIOTR – zwrot w „Jedzenie · na mieście”, EWA bez zmian; „Cofnij”
  przywraca operacje i usuwa regułę; kolejny import – nowy „obiad” od razu w „Jedzenie · na mieście” (na ekranie Import
  słowo „PIOTR TESTOWY · obiad – wpływy →”).
- Koperta Jedzenie (listopad) „347,00 / 1 600,00 zł” → „312,00 / 1 600,00 zł” (zwrot 35 zł z 01.11 zmniejsza kopertę; odczyt w `op.jsonl`).
- Nie sprawdzono: „Cofnij” po zmianie operacji w międzyczasie (wariant T240).
- Zrzut: OP.38-panel.png

### OP.39 – NIEZGODNE (N)
- Stan: rok+op, filtr Konto: Portfel XTB, cała historia, sortowanie po kwocie, ukryte Tagi i Notatka; przebiegi
  `op-eksport` 11:39 i `op-eksport-2` 11:49.
- Widać: pasek „Operacje 94 / 1036 · Wpływy +4 802,50 zł · Wydatki −5 355,40 zł” (różnica −552,90 zł); suma kwot w CSV
  i w Excelu −452,90 zł (+5 102,50 / −5 555,40). Różnica 100 zł to przelewy własne widoczne na liście i w pliku
  („mBank → Portfel XTB;Przelew własny;300,00”, „Portfel XTB;Przelew własny;-200,00”), których pasek nie liczy ani do
  Wpływów, ani do Wydatków.
- Oczekiwane: suma kwot w pliku = „Wpływy” − „Wydatki” z paska – punkt, „Oczekiwany efekt” i odczyt liczb (do
  rozstrzygnięcia w AU-11, czy pasek ma liczyć przelewy własne).
- Reszta zgodna: proponowana nazwa `operacje_2026-11-03.csv` / `.xlsx`; toast „Zapisano 94 operacje: C:\FI-audyt\eksport\…”;
  94 operacje w kolejności listy (2 500, 2 000, 450, 300, 249…); CSV z BOM, średnik, przecinek dziesiętny, CRLF; kolumny
  „Data;Godzina;Konto;Rodzaj;Kwota (zł);Kategoria;Kontrahent;Tytuł;Finansuje;Dziennik;Notatka;Tagi” mimo ukrytych;
  Carrefour: „Jedzenie · zakupy spożywcze + Dom · wyposażenie” i notatka z opisami części; Excel – kwoty jako liczby,
  polskie znaki („SALON ROWEROWY KOŁO”, „Przelew własny”).
- Odczyt: `op.jsonl` (OP.39, dwa).
- Uwaga dodatkowa: kolumna „Data” w pliku to `2026-06-19` (ISO) – dla Excela dobre, na ekranie aplikacja pisze dd.mm.rrrr.

### OP.40 – NIEZGODNE (S)
- Stan: brzegi (`op-brzegi` 11:57); potwierdzenie na „rok” + sam wydatek 0,00 zł bez kategorii (`op-zero-2` 12:03).
- Zrobione: Meldunki (Ctrl+Shift+M) przy wydatku 0,00 zł bez kategorii.
- Widać: „1 wydatek bez kategorii od 01.09.2025 – razem 0,00 zł.” z „Pokaż w Operacjach” (lista: „Zero złotych … bez
  kategorii 0,00”).
- Oczekiwane: 0 zł nie jest „bez kategorii” w Meldunkach – punkt, „Nie przechodzi” 2 (część paragonu 0 zł aplikacja
  pomija – OP.7, cała operacja 0 zł już nie).
- Reszta zgodna: wiersze „−1 234 567,89”, „+9 999 999,99” bez ucięć (komórki nie obcięte), pasek „Wpływy +9 999 999,99 zł ·
  Wydatki −1 234 592,23 zł · Koszty 1 234 592,23 zł” (grosze się zgadzają); nazwa 300 znaków ucięta w wierszu, pełna
  w dymku (300 znaków), wiersz nie szerszy niż lista; kwota 0 jako „0,00” (bez „−0,00”); nowa operacja 0 zł zapisana bez
  ostrzeżenia; pole kontrahenta przyjmuje 300 znaków (301. nie wchodzi); CSV: „-1234567,89”, „9999999,99”, polskie znaki
  poprawne.
- Odczyt: `op.jsonl` (OP.40). Zrzuty: OP.40-lista.png, OP.40-zero-meldunek.png

### OP.41 – ZGODNE
- Stan: rok, `op-klawiatura`.
- Widać: Ctrl+2, „/” – fokus w wyszukiwarce, „orlen” – 2 (październik), Esc – aplikacja otwarta, wyszukiwanie zostaje
  („orlen”); po kliknięciu wiersza ↓ / ↑ zmieniają otwartą operację (Bar pod Lipą → ZABKA Z1234 → KAWIARNIA MOKKA → ZABKA),
  30× ↓ przewija listę; Tab od kwoty: data, godzina, konto, kontrahent, „wszystkie”, tytuł, kategoria (7 naciśnięć);
  Ctrl+N – „Nowa operacja”, fokus w kwocie. Poprawka kategorii operacji z wczoraj: Ctrl+2 → klik wiersza → wybór
  kategorii (zapis sam, OP.17/OP.19) – 3 kroki.
- Zrzut: OP.41-strzalki.png

### OP.42 – ZGODNE
- Stan: rok z operacją „Lody Grycan” 30.10 w `schemaVersion: 2` (`op-nowszy`); rok z `fi.json` w `schemaVersion: 2`
  (`op-tylko-odczyt`).
- Widać: wpis nowszej wersji – „Ten wpis zapisała nowsza wersja aplikacji (na drugim komputerze) – ta wersja go nie zmieni.
  Zaktualizuj aplikację (Ustawienia → Aktualizacje).”, pola nieedytowalne; zaznaczony z innym → „Usuń” → podgląd „1 operacja ·
  zapisane przez nowszą wersję aplikacji: 1 (bez zmian).”, toast „Usunięto 1 operację, bez zmian (zapisane przez nowszą
  wersję aplikacji): 1.”, plik bez zmian. Folder tylko do odczytu: baner „Folder danych ma format v2, a ta wersja aplikacji
  obsługuje v1. Zaktualizuj aplikację - do tego czasu dane są tylko do odczytu.”; pola edytora wyłączone, kosza brak,
  „Historia” jest; zaznaczanie i suma działają („Zaznaczone: 2 operacje · −46,54 zł”), zmiany zbiorcze wyłączone; „Nowa”
  i Ctrl+N – toast „Błąd Folder jest tylko do odczytu – zmiany nie są zapisywane.” (żadnego sukcesu).
- Zrzuty: OP.42-nowszy.png, OP.42-tylko-odczyt.png

### OP.43 – poza laboratorium (Kto: Maszyna)

## Znaleziska
- OP.25 (S) – zakup finansowany przez domownika pyta „plan czy impuls?” („?” w wierszu, „od 200,00 zł: plan czy impuls?”).
- OP.26 (S) – zakup domownika w ciszy nocnej z wpisem: „Potwierdzony zakup w ciszy nocnej – liczy się jako naruszenie
  w grze.” (bez wpisu – prośba o potwierdzenie jak przy moim zakupie).
- OP.33 (S) – podgląd „Przesuń datę” przez granicę miesiąca pokazuje skutek tylko w bieżącym miesiącu (bez kopert i łupów
  października).
- OP.8 (S) – „Kwota (bez znaku)” od 100 do 20 zł: aplikacja po cichu kasuje „od” i pokazuje kwoty do 20 zł.
- OP.40 (S) – wydatek 0,00 zł bez kategorii daje meldunek „1 wydatek bez kategorii … – razem 0,00 zł.”
- OP.3 (N) – etykieta zakresu dat w formacie ISO („2025-12-31 – 2026-01-01”, „2025-09-01 – …”).
- OP.11 (N) – „mój filtr” po widoku z Meldunków / Mostka przywraca konto i rodzaj, ale zostawia okres tamtego widoku.
- OP.39 (N) – suma kwot eksportu ≠ „Wpływy” − „Wydatki” paska, gdy na liście są przelewy własne (pasek je pomija).
- UWAGA OP.27 – limit 20 tagów i 40 znaków bez komunikatu (pole tagów znika, tag ucięty po cichu).
- UWAGA OP.26 – notka ciszy nocnej odsyła do kodu decyzji „(D40)”.

## Spostrzeżenia
- **„Plan czy impuls?” pyta też o rzeczy z definicji zaplanowane** – poza zakupami domowników (OP.25) „?” stoi przy każdej
  płatności czynszu („WSPÓLNOTA MIESZKANIOWA TESTOWA 1 … Dom · czynsz i opłaty ? −1 450,00”), racie z ładowni („ROBERT
  TESTOWY … ładownia ? −500,00”) i wypłacie z bankomatu („BANKOMAT … Gotówka ? −200,00”). Szum w dzienniku i w filtrze;
  propozycja: pytać tylko o moje wydatki spoza ładowni i spoza kategorii „Gotówka”.
- **Podglądy zmian zbiorczych pokazują część skutku** – usunięcie zadokowanej operacji (OP.31): podgląd mówi tylko o saldzie
  mBanku, a po usunięciu zmieniają się Łupy (+166,06 zł), „Układy gwiezdne” (−3 000,00 zł) i pojawia się meldunek „Wypłata
  z ICTTJ 3 000,00 zł … bez pary w mBanku”; przesunięcie dat przez granicę miesiąca (OP.33) – bez poprzedniego miesiąca.
  Propozycja: w podglądzie zawsze łupy, cele i „wpis ICTTJ straci parę”.
- **Pasek sum a przelewy własne** – „Wpływy” i „Wydatki” pomijają przelewy własne, a lista (np. z filtrem konta) i eksport je
  pokazują (OP.39); dymek „Wpływy” tego nie mówi. Przy filtrze konta suma widocznych wierszy ≠ pasek.
- **Ciche limity długości** – notatka (5000), dziennik (2000), opis części (500), tag (40), kontrahent (300): wklejony dłuższy
  tekst jest ucinany bez słowa; przy 20 tagach pole po prostu znika (OP.14, OP.23, OP.27, OP.40).
- **Daty ISO w kilku miejscach** – etykieta zakresu (OP.3), tytuł okna „Historia zmian – Operacja 2026-10-18: …” (OP.18),
  Synchronizacja „Operacja 2026-11-01: Kiosk Ruch …” (OP.21), kolumna „Data” w CSV (OP.39); reszta aplikacji – dd.mm.rrrr.
- **Nawigacja do zakupów domownika** – „Pokaż zakupy” (Meldunki) i linia „Marek: do oddania …” na Mostku otwierają
  „Oznaczenia: domownik” z całej historii (68–71 operacji wszystkich domowników, także oddanych), zamiast zakupów tej
  osoby do oddania (ME.3, OP.11).
- **Konto Gotówka ujemne** w personie (−55,36 zł na czerwono, OP.2): wypłata z bankomatu jest wydatkiem w kategorii
  „Gotówka” na mBanku, zakupy za gotówkę – wydatkami na koncie Gotówka; konto tylko maleje. Do AU-9 / wniosków (model
  gotówki: przelew mBank → Gotówka zamiast wydatku?).
- **Ergonomia edytora** – od kwoty do kategorii 7 × Tab (data, godzina, konto, kontrahent, „wszystkie”, tytuł); po zmianie
  kwoty nowej operacji w okresie potwierdzonym nie ma pytania także przy drugiej zmianie w tym samym otwarciu (OP.20);
  w folderze tylko do odczytu „Nowa” jest aktywna, błąd dopiero po kliknięciu (OP.42); „+ Zapisz widok” widać tylko przy
  ustawionym filtrze (OP.10).
- **Okres listy nie jest pamiętany** – po ponownym uruchomieniu zawsze bieżący miesiąc, także gdy była „cała historia”
  (filtr konta i rodzaju zostaje) – OP.11.
- **Nazwy z banku z dopiskami** – w Operacjach „BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI: 2026-01-01” jako
  kontrahent (do obszaru IM.3).
- **Problemy laboratorium** – brak (poza błędami własnych skryptów, poprawionymi i powtórzonymi: filtr wierszy po
  `textContent` bez spacji, zaznaczenie zostające po „Cofnij”). Persona nie ma przelewów własnych, pustego folderu
  „start”, kategorii bez koperty ani zakupów częściowo oddanych – dodane w stanach opisanych wyżej.
