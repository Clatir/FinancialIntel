# Audyt 1.15.4 – punkty, część 2: Operacje, meldunki, import z mBanku, salda

Zakres: funkcje komputera (Windows, Electron) widoczne w Operacjach, Meldunkach do rozpatrzenia, imporcie z mBanku
i potwierdzaniu sald – od listy i edytora operacji po cofnięcie importu i telemetrię z banku; telefon poza zakresem.

**Legenda pól**
- **Nagłówek:** identyfikator, nazwa, w nawiasie źródło wymagania: spec = `docs/specyfikacja.md`; D… / T… =
  `docs/decyzje.md` (D – decyzja użytkownika, ważniejsza; T – techniczna); F… = `docs/przeglad/funkcje.md`; B… / N… =
  naprawiony błąd / niespójność z przeglądu 1.4.1 (punkt regresji); N-PC-… = audyt 1.15.2 (D95); wersja = sekcja
  `CHANGELOG.md`; „konwencja” = `CLAUDE.md`, sekcja „Konwencje”; „brak wymagania” = oczekiwanie z rozsądku, do wniosków.
- **Kto:** Claude – laboratorium (wydanie z GitHuba sterowane Playwrightem, syntetyczny folder, okna wyboru pliku,
  udawane Pobrane, zapis powiadomień, pliki folderu i eksportu, drugi komputer po kolei); Maszyna – Cowork w maszynie
  wirtualnej (zegar tylko do przodu, prawdziwe powiadomienia Windows); Ty – prawdziwy plik z mBanku, ocena.
- **Ryzyko:** wysokie – pieniądze, dane, główna ścieżka dnia; średnie; niskie.
- **Stan danych:** `pusty`, `start`, `rok`, `brzegi`, `dwa-komputery` (plan, „Załoga testowa”); D0 = dzień wygenerowania
  danych, historia ułożona względem niego. Pliki CSV w formacie mBanku (jak `tests/fixtures/mbank/`):
  - `L1` – „Lista operacji” z 14 dni do D0, Windows-1250 (plik dnia); `L1-utf8` (UTF-8 z BOM), `L1-utf8-bez-bom`,
    `L1-utf16` – ta sama treść w innym kodowaniu;
  - `L2` – kolejna lista, okres zachodzi na połowę `L1`: rozliczone nierozliczone, zniknięta nierozliczona, nowe dni;
  - `H1` – „Historia rachunku” z łańcuchem sald zgodnym z FI; `H2` – historia rozbieżna z FI; `H3` – historia z luką w
    łańcuchu sald; `HL` – historia tego samego okresu co `L1` (ta sama operacja w dwóch formatach);
  - `R` – plik z innego numeru rachunku; `K2` – plik drugiego konta mBank z drugą stroną przelewu;
  - `X` – CSV innego banku; `Z` – zwykły CSV (nie z banku); `U` – uszkodzony; `E` – pusty (0 B); `G` – ponad 20 MB; `W`
    – lista z wierszem w EUR i wierszem z nieczytelną datą;
  - `P` – pełna historia 14 miesięcy (ok. 3000 wierszy); `P30k` – 30 tys. wierszy (szybkość ekranu).
- **Odczyt liczb:** liczby zapisywane z datą i godziną do `C:\FI-audyt\odczyty\` – werdykt „liczby → AU-9”.

### OP – Operacje

#### OP.1 Pusta lista i filtr bez wyników (0.3.0, konwencja „puste stany”)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `start` bez importu historii; `rok`
- **Jak sprawdzić:** Ctrl+2 w `start` bez operacji. W `rok` wpisz w „Szukaj: kontrahent, notatka, kwota…” tekst
  „qqqzzz”.
- **Oczekiwany efekt:** bez operacji – „Brak operacji.” i „Ctrl N dodaje operację; historię z mBanku wczytasz na ekranie
  Import.”, w panelu szczegółów „Wybierz operację z listy albo dodaj nową (Ctrl+N).”; przy filtrze bez wyników – „Brak
  operacji dla wybranych filtrów.”, widoczne „wyczyść filtry”, w pasku sum „Operacje 0 / N”.
- **Nie przechodzi, gdy:**
  - pusty ekran bez tekstu albo błąd okna;
  - przy filtrze bez wyników tekst jak przy pustym folderze albo brak drogi do wyczyszczenia filtrów.

#### OP.2 Lista miesiąca, pasek sum i salda kont (spec „Ekrany”, D68, 0.3.0, N24)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** Ctrl+2. Odczytaj nagłówek listy, kolejność wierszy dnia z godziną i bez godziny, kolory kwot i
  pasek sum („Operacje”, „Wpływy”, „Wydatki”, „Koszty”, salda kont); najedź na „Wpływy” i „Koszty”. Porównaj saldo kont
  z Ustawienia → Konta i Mostkiem. Powtórz dla poprzedniego miesiąca i „Cała historia”.
- **Oczekiwany efekt:** domyślnie bieżący miesiąc, najnowsze na górze; w dniu najpierw wpisy z godziną, potem bez
  godziny (import); wpływy zielone z „+”, wydatki bez koloru z „−”, zwrot towaru zielony; „Koszty” = wydatki minus
  zwroty, bez przelewów własnych, XTB i zakupów domowników (dymek to mówi); „Wpływy” z dymkiem „…to nie przychód…”;
  saldo konta = saldo otwarcia + operacje do dziś (operacja z datą w przyszłości nie liczy się); konto bez salda
  otwarcia z „*”.
- **Nie przechodzi, gdy:**
  - suma „Wydatki” albo „Koszty” różni się od sumy wierszy listy liczonej ręcznie;
  - czerwień na zwykłym wydatku albo wpływ bez „+”;
  - saldo konta inne niż w Ustawieniach i na Mostku albo zmienione przez operację z przyszłą datą.
- **Odczyt liczb:** „Operacje”, „Wpływy”, „Wydatki”, „Koszty” i saldo każdego konta – bieżący i poprzedni miesiąc, cała
  historia.

#### OP.3 Okres listy (0.3.0, 1.6.4, B77, B81, 1.6.6 „Daty jak w całej aplikacji”)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z operacjami 1. i ostatniego dnia kilku miesięcy (także
  31.12 i 01.01, 29.02 albo 28.02)
- **Jak sprawdzić:** „‹” i „›” przy miesiącu; menu okresu: „Bieżący miesiąc”, „Cała historia”, „od” / „do”. Ustaw
  miesiąc z operacjami 1. i ostatniego dnia; zakres od 1. do ostatniego dnia; zakres tylko „od”.
- **Oczekiwany efekt:** miesiąc obejmuje operacje od 1. do ostatniego dnia włącznie (data warszawska), żadna nie wpada
  do sąsiedniego; zakres „od–do” z granicami włącznie; etykieta okresu z datami w formacie aplikacji (dd.mm.rrrr);
  „Bieżący miesiąc” wraca do miesiąca D0.
- **Nie przechodzi, gdy:**
  - operacja z ostatniego dnia miesiąca na liście następnego (przesunięcie UTC) albo zgubiona na granicy roku;
  - etykieta zakresu w innym formacie daty niż reszta aplikacji (np. „2026-10-01 – 2026-10-31”);
  - „›” za bieżący miesiąc pokazuje błąd zamiast pustej listy.

#### OP.4 Wyszukiwanie (0.3.0, 1.10.0, 1.11.0, T267)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z „Żabka”, „Łódź” w nazwie, notatką, opisem części
  paragonu, tagiem `#Wakacje`, kwotą 12,50 zł
- **Jak sprawdzić:** poza polem tekstowym naciśnij „/”; wpisz kolejno: „zabka”, „ŻABKA”, „lodz”, dwa słowa z różnych pól
  (kontrahent + notatka), „12,50”, słowo z opisu części paragonu, „#wakacje”; po każdym wpisie odczytaj liczbę wierszy.
- **Oczekiwany efekt:** „/” daje fokus wyszukiwarce; wyszukiwanie bez polskich znaków i bez wielkości liter; kilka słów
  = wszystkie naraz; kwota znajduje operacje tej kwoty (wydatek i wpływ); opis części i tag są przeszukiwane; licznik
  „Operacje n / N” zgodny z wierszami.
- **Nie przechodzi, gdy:**
  - „zabka” nie znajduje „Żabka” albo „12,50” nie znajduje operacji 12,50 zł;
  - opis części paragonu albo tag nie są przeszukiwane;
  - „/” w trakcie pisania w polu edytora przeskakuje do wyszukiwarki.

#### OP.5 Filtry Konto, Rodzaj, Kategoria (0.3.0, F18, T238, B82)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z podziałem paragonu na dwie kategorie i operacją w
  kategorii zarchiwizowanej po ustawieniu filtra
- **Jak sprawdzić:** „Konto” – Portfel XTB; „Rodzaj” – Wydatek i Przelew własny; „Kategoria” – kategoria główna, potem
  sama podkategoria; operacja z paragonem „Jedzenie + Dom” przy filtrze „Dom”. Ustaw filtr kategorii, zarchiwizuj ją w
  Ustawieniach, wróć.
- **Oczekiwany efekt:** wybory w jednym menu łączą się „lub”, filtry między sobą „i”; kategoria główna obejmuje swoje
  podkategorie, podkategoria tylko siebie; paragon widać przy kategorii każdej części; zarchiwizowana kategoria w menu z
  dopiskiem „(archiwum)” i da się ją odznaczyć.
- **Nie przechodzi, gdy:**
  - filtr kategorii głównej gubi podkategorie albo paragon widać tylko przy pierwszej części;
  - po archiwizacji w podsumowaniu filtra identyfikator zamiast nazwy albo brak pola do odznaczenia (B82).

#### OP.6 Filtr „Oznaczenia” (0.3.0, 1.6.4, N51, T238, 1.12.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z operacjami: z banku, nierozliczona, wpisana ręcznie,
  plan, impuls, noc, podział, domownik (do oddania / częściowo oddane / oddane), nietypowa, czeka na zwrot
- **Jak sprawdzić:** w „Oznaczenia” zaznacz po kolei każde oznaczenie i odczytaj liczbę; potem „z banku” +
  „nierozliczona” (jedna grupa), „plan” + „noc” (różne grupy). Przeczytaj notkę pod menu.
- **Oczekiwany efekt:** każde oznaczenie pokazuje dokładnie swoje operacje, z tą samą nazwą co znaczek w wierszu; w
  grupie (z banku / nierozliczona / wpisana ręcznie; plan / impuls) – „lub”, między grupami – „i”; notka „Z banku /
  nierozliczona / wpisana ręcznie oraz plan / impuls – dowolne z zaznaczonych; między grupami – wszystkie naraz.”
- **Nie przechodzi, gdy:**
  - „z banku” + „nierozliczona” daje pustą listę (łączenie „i” w grupie);
  - znaczek w wierszu i pozycja filtra nazywają się inaczej albo filtr gubi część oznaczonych.

#### OP.7 „Bez kategorii” – jedno znaczenie (1.6.0, 1.6.4, N50, T238)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z: wydatkiem bez kategorii, paragonem z jedną częścią
  bez kategorii, częścią 0 zł bez kategorii, wpływem i przelewem bez kategorii, zakupem domownika bez kategorii,
  płatnością kontenera i wydatkiem z celu bez kategorii
- **Jak sprawdzić:** Oznaczenia → „bez kategorii”; porównaj liczbę i operacje ze znaczkiem „bez kategorii” w wierszach i
  z meldunkiem „Bez kategorii” (Ctrl+Shift+M). Płatność kontenera i wydatek z celu – co pisze kolumna kategorii.
- **Oczekiwany efekt:** „bez kategorii” = mój wydatek albo jego część bez kategorii; nie: wpływ, przelew, zakup
  domownika, płatność kontenera („ładownia”), wydatek z celu („z celu”), część 0 zł; ta sama liczba w filtrze, wierszach
  i Meldunkach.
- **Nie przechodzi, gdy:**
  - filtr łapie wpływy, przelewy, XTB albo zakupy domowników;
  - liczba w filtrze ≠ liczba w meldunku;
  - płatność kontenera albo wydatek z celu oznaczone jako „bez kategorii”.
- **Odczyt liczb:** liczba operacji „bez kategorii” i kwota z meldunku.

#### OP.8 „Więcej filtrów” (1.7.0, F18, T267)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** „Więcej filtrów”: „Kwota (bez znaku)” od 50 do 50 zł, potem od 100 do 20 zł; „Domownik – finansuje
  albo od niego”; „Kontrahent” – wpisz „orlen” w „szukaj kontrahenta…”, zaznacz; „Ładownia”, „Cel”, „Pożyczka”, „Tag
  (wyprawa, projekt)”; „Konto przelewu” – Portfel XTB i „konto spoza budżetu”. Odczytaj „Więcej filtrów: N”, użyj
  „wyczyść te filtry”.
- **Oczekiwany efekt:** kwota bez znaku z granicami włącznie (50–50 = dokładnie 50,00 zł wydatki i wpływy); „do”
  mniejsze niż „od” = bez górnej granicy; domownik łapie zakupy, które finansuje (także części) i jego wpłaty;
  kontrahent łapie wszystkie zapisy sieci (Orlen w różnych miastach); konto przelewu przy przelewie w jednej operacji –
  oba konta; licznik = liczba aktywnych sekcji; „wyczyść te filtry” zdejmuje tylko filtry z tego menu.
- **Nie przechodzi, gdy:**
  - kwota 50,00 zł nie łapie się przy granicy 50 albo wydatek −50 zł pominięty przez znak;
  - kontrahent dzieli jedną sieć na osobne pozycje bez wspólnego wyboru;
  - licznik „Więcej filtrów: N” nie zgadza się z zaznaczonymi sekcjami.

#### OP.9 Sortowanie listy (1.7.0, F18, T267, 1.11.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` z nazwami na „Ł”, „Ż”, „Ś” i operacją bez nazwy
- **Jak sprawdzić:** kliknij nagłówki „Kwota”, „Kontrahent”, „Data”; przy sortowaniu po kontrahencie ukryj kolumnę
  „Kontrahent” w „Kolumny”.
- **Oczekiwany efekt:** „Kwota” – kwoty bez znaku od największej (wydatki i wpływy razem); „Kontrahent” – A–Z po polsku
  („Ł” po „L”, „Ż” na końcu), bez nazwy na końcu; „Data” – najnowsze; aktywny nagłówek w akcencie z „▾”; ukrycie kolumny
  kontrahenta wraca do kolejności po dacie.
- **Nie przechodzi, gdy:**
  - „Łódź” między „A” a „B” albo „Żabka” przed „Z”;
  - po ukryciu kolumny lista dalej ułożona po niewidocznym kontrahencie.

#### OP.10 Zapisane widoki listy (1.7.0, F18, T267, D89 d)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `dwa-komputery`
- **Jak sprawdzić:** ustaw filtry (Kategoria + kwota od 50 zł), „+ Zapisz widok”, nazwa „Jedzenie > 50 zł”, bez „z
  okresem listy”; drugi widok z okresem; zmień miesiąc i kliknij oba chipy; zapisz widok o tej samej nazwie; usuń widok
  „×”; uruchom drugi komputer na tym folderze.
- **Oczekiwany efekt:** toast „Widok „…” zapisany – na każdym komputerze.”; chip w akcencie, gdy lista pokazuje widok;
  widok bez okresu zostawia miesiąc listy, z okresem – ustawia swój; ta sama nazwa zastępuje; usunięcie z toastem i
  „Cofnij”; drugi komputer ma te same widoki; widok nie pamięta kolumn.
- **Nie przechodzi, gdy:**
  - widok znika po ponownym uruchomieniu albo nie dociera na drugi komputer;
  - dwa chipy o tej samej nazwie;
  - usunięcie widoku bez „Cofnij”.

#### OP.11 Filtr tego komputera i widok z innego ekranu (1.6.4, B88, T239)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** ustaw własny filtr (konto mBank, rodzaj Wydatek), uruchom aplikację ponownie. Potem otwórz Operacje
  z Meldunków („Pokaż w Operacjach” przy „Bez kategorii”) i z Mostka; zmień coś w tym widoku; kliknij „mój filtr”.
- **Oczekiwany efekt:** własny filtr zostaje po ponownym uruchomieniu; lista otwarta z innego ekranu pokazuje „mój
  filtr” i nie nadpisuje zapamiętanego – zmiany w niej zostają widoku; „mój filtr” wraca do zapamiętanego.
- **Nie przechodzi, gdy:**
  - przejście z Meldunków albo Mostka kasuje zapamiętany filtr;
  - po ponownym uruchomieniu filtr wraca do domyślnego.

#### OP.12 Kolumny i notatka na liście (1.11.0, D89)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` z notatką wielowierszową i paragonem z opisami części
  bez notatki; `dwa-komputery`
- **Jak sprawdzić:** „Kolumny” – ukryj „Godzina”, „Tagi”, „Konto”; uruchom ponownie; drugi komputer; „przywróć
  domyślne”. Najedź na komórkę „Notatka” operacji z notatką wielowierszową.
- **Oczekiwany efekt:** „Kolumny: 3 ukryte”; „Data” i „Kwota” zawsze widoczne (wyszarzone); wybór zostaje na tym
  komputerze, drugi ma swój; „przywróć domyślne” pokazuje wszystkie; „Notatka” – pierwsza linia, cała w dymku, a bez
  notatki – opisy części („zakupy na tydzień · kabel HDMI”); nowa operacja przy ukrytym kontrahencie ma „nowa operacja”
  w następnej kolumnie.
- **Nie przechodzi, gdy:**
  - wybór kolumn przechodzi na drugi komputer albo znika po restarcie;
  - da się ukryć datę albo kwotę.

#### OP.13 Nowa operacja – szkic i widoczność (spec „Konwencje”, 1.6.4, B64, B77, T239)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** na Mostku Ctrl+N; potem w Operacjach przy filtrze „Konto: Portfel XTB” i okresie „od–do” bez D0
  kliknij „Nowa”, wpisz kwotę 23,40 i kontrahenta, zmień konto na mBank. Drugi szkic: „Nowa” bez wpisywania, przejdź na
  Mostek i z powrotem. Trzeci: wpisz kwotę, przejdź na Radar, wróć.
- **Oczekiwany efekt:** Ctrl+N z każdego ekranu otwiera Operacje z nowym wpisem i fokusem w kwocie; nowy wpis zawsze
  widoczny (lista przechodzi na jego miesiąc, filtry, które by go ukryły, zdjęte tylko w tym widoku); wiersz z napisem
  „nowa operacja”; pusty szkic po opuszczeniu ekranu znika, wpis z kwotą zostaje zapisany.
- **Nie przechodzi, gdy:**
  - nowy wpis znika z listy po pierwszej zmianie (B77) albo Ctrl+N działa tylko w Operacjach (B64);
  - opuszczenie ekranu gubi wpisaną kwotę albo zostawia puste operacje 0 zł.

#### OP.14 Pola edytora: kwota, Enter, Esc (1.4.2, 1.4.3, 1.6.4, B24, B68, T34, T241)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** w istniejącej operacji: kwota „1.200”, „12,345”, „1 234,56”, „12,50+8,30”; w kwocie wpisz 99 i Esc;
  w „Kontrahent” wpisz tekst i Esc, potem tekst i Enter; zmień notatkę i od razu przejdź na inny ekran; wklej notatkę
  6000 znaków i dziennik 3000 znaków.
- **Oczekiwany efekt:** kwota z więcej niż dwiema cyframi po przecinku odrzucona („1.200” nie jest 1,20 zł); „1 234,56”
  przyjęte; Esc przywraca poprzednią wartość, Enter i wyjście z pola zapisują; przejście na inny ekran nie gubi tekstu;
  notatka do 5000, dziennik do 2000 znaków, dłuższy tekst nie blokuje zapisu operacji; stopka „zapisano … · komputer”.
- **Nie przechodzi, gdy:**
  - „1.200” zapisane jako 1,20 zł albo 1200 zł bez pytania;
  - Esc zapisuje wpisaną wartość (B24);
  - po długiej notatce operacja przestaje się zapisywać (B74).

#### OP.15 Data bez roku i data w przyszłości (1.5.2, B12, T184)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; daty względem D0
- **Jak sprawdzić:** w dacie wpisz „dd.mm” dnia sprzed miesiąca, dnia za 3 dni i dnia za 3 miesiące; operacja z datą
  jutra – odczytaj znaczek i saldo konta w pasku sum.
- **Oczekiwany efekt:** „dd.mm” bez roku = dzień najbliższy dacie pola, najwyżej tydzień po dziś (za 3 miesiące = rok
  wcześniej); operacja z przyszłą datą ma znaczek „w przyszłości” z dymkiem i nie zmienia salda, energii ani warstw do
  tego dnia.
- **Nie przechodzi, gdy:**
  - „dd.mm” z przeszłości trafia w przyszły rok;
  - operacja jutra zmienia saldo dziś albo nie ma znaczka.
- **Odczyt liczb:** saldo konta przed i po dodaniu operacji jutra.

#### OP.16 Rodzaj, kierunek i zwrot towaru (spec „Przypadki szczególne”, 0.3.0, 1.5.2, T174)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** w wydatku 40 zł zmień rodzaj: „Wpływ”, „Przelew własny”, „XTB”, „inne…” → „Podatek PIT-38”,
  „Pożyczka”, „Korekta salda”; przy każdym odczytaj przełącznik kierunku i znak kwoty. Wpisz wydatek 30 zł jako zwrot
  towaru (kwota na plus w wydatku) w kategorii zakupu.
- **Oczekiwany efekt:** kierunki z polskimi nazwami (przelew: „wychodzący / przychodzący”, XTB: „dopłata do XTB /
  wypłata z XTB”, podatek: „zapłata / zwrot”, pożyczka: „pożyczam / spłacam / otrzymuję”); zmiana rodzaju zachowuje
  kwotę; zwrot towaru – ujemny wydatek tej samej kategorii (podpowiedź „Zwrot towaru: ujemny wydatek tej samej
  kategorii.”), zielony z „+”, zmniejsza koszty i kopertę; „Pożyczka” bez pożyczki z Radaru – notka „…liczy się tylko w
  osłonach…”.
- **Nie przechodzi, gdy:**
  - zmiana rodzaju zmienia kwotę albo znak bez wyboru kierunku;
  - zwrot towaru zwiększa koszty albo nie trafia do kategorii zakupu.
- **Odczyt liczb:** „Koszty” w pasku sum i koperta kategorii przed i po zwrocie.

#### OP.17 Kategoria w edytorze: oficer, „poza kopertą”, „Zapamiętaj” (1.5.1, F8, N15, T170, 1.5.2)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z operacją z banku „DINO TESTOWO 4” i wpisem ręcznym
  „Dino” bez kategorii; kategoria bez koperty
- **Jak sprawdzić:** otwórz wpis „Dino” – kliknij „oficer: …”; ustaw kategorię bez koperty i przeczytaj notkę; w
  operacji z banku zmień kategorię i kliknij „Zapamiętaj: „<nazwa z banku>” → <kategoria>”; sprawdź Ustawienia → Import
  z banku.
- **Oczekiwany efekt:** oficer podpowiada kategorię marki z operacji z banku („Dino” → kategoria „DINO TESTOWO 4”);
  kategoria bez koperty – notka „Kategoria bez koperty – nie zmniejsza energii dziś ani żadnej koperty…”; „Zapamiętaj”
  uczy reguły po nazwie, którą pisze bank (nazwa użytkownika w nawiasie), toast „Zapamiętano: …”, reguła widoczna w
  Ustawieniach.
- **Nie przechodzi, gdy:**
  - reguła powstaje na nazwie poprawionej przez użytkownika (kolejny import jej nie znajdzie – N15);
  - oficer proponuje kategorię zarchiwizowaną.

#### OP.18 Historia zmian operacji (D28, 1.5.2, B7, N55)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; folder tylko do odczytu
- **Jak sprawdzić:** zmień kwotę, kategorię i notatkę operacji (co najmniej 10 min odstępu albo zmiana z drugiego
  komputera); „Historia” w nagłówku edytora; wybierz wersję; „Przywróć tę wersję”. Otwórz „Historia” w folderze tylko do
  odczytu.
- **Oczekiwany efekt:** okno „Historia zmian – …” z wersjami (kiedy, który komputer), lista różnic po polsku z nazwami
  kategorii i kwotami w złotych („Ta wersja” / „Obecnie”); przywrócenie przywraca pola, a bieżąca wersja trafia do
  historii; w folderze tylko do odczytu historię da się obejrzeć.
- **Nie przechodzi, gdy:**
  - kwoty w groszach (100× za duże) albo identyfikatory zamiast nazw;
  - przycisk „Historia” niedostępny w folderze tylko do odczytu.

#### OP.19 Ostrzeżenie przy zmianie kwoty operacji z banku (1.7.0, F12, T266)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** w operacji z banku (znaczek „z banku”) zmień kwotę 45,00 → 54,00; „Anuluj”; jeszcze raz i „Zmień
  mimo to”. Zmień też tylko kategorię i notatkę.
- **Oczekiwany efekt:** okno „Zmienić operację?” z „Kwota pochodzi z banku (45,00 zł) – po zmianie operacja nie zgodzi
  się z wyciągiem.” i „Zamrożone dni gry zostają bez zmian.”; „Anuluj” zostawia 45,00; „Zmień mimo to” zapisuje 54,00;
  zmiana kategorii albo notatki nie pyta.
- **Nie przechodzi, gdy:**
  - kwota zmienia się bez pytania albo „Anuluj” i tak zapisuje 54,00;
  - pytanie przy zmianie samej kategorii.

#### OP.20 Okres potwierdzony saldem (1.7.0, F12, D28, T266)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z potwierdzeniem salda mBanku sprzed 10 dni
- **Jak sprawdzić:** otwórz wpis ręczny z mBanku sprzed potwierdzenia – odczytaj znaczek; zmień kwotę o 10 zł, potem
  datę na dzień po potwierdzeniu, potem konto na Portfel XTB. Utwórz nową operację z datą sprzed potwierdzenia.
- **Oczekiwany efekt:** znaczek „okres potwierdzony” z dymkiem; każda zmiana ruszająca potwierdzone saldo pyta: „To
  zmieni potwierdzone saldo konta mBank z dd.mm.rrrr o −10,00 zł i stan osłon.”; „Zmień mimo to” albo „Anuluj”; nowa
  operacja w trakcie pierwszego wpisywania nie pyta; przelew w jednej operacji – pyta o oba konta.
- **Nie przechodzi, gdy:**
  - zmiana przechodzi bez ostrzeżenia albo kwota różnicy jest zła;
  - nowa operacja z datą wsteczną pyta przy pierwszym wpisaniu.
- **Odczyt liczb:** kwota w ostrzeżeniu wobec różnicy salda na dzień potwierdzenia.

#### OP.21 Usuwanie z „Cofnij” (0.3.0, 1.4.2, B9, konwencja)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z operacją z podziałem paragonu, tagami i notatką
- **Jak sprawdzić:** w edytorze ikona kosza → „Usuń na pewno”; odczytaj toast, saldo konta; „Cofnij” w toaście. Usuń
  drugą operację i sprawdź Synchronizację → „Usunięte wpisy”.
- **Oczekiwany efekt:** usunięcie dopiero po drugim kliknięciu; toast „Usunięto: <kontrahent> <kwota> zł (dd.mm.rrrr).”
  z „Cofnij”; „Cofnij” przywraca operację ze wszystkimi polami (części, tagi, notatka), saldo wraca; usunięta jest w
  „Usuniętych wpisach”.
- **Nie przechodzi, gdy:**
  - jedno kliknięcie usuwa bez potwierdzenia;
  - „Cofnij” przywraca operację bez części, tagów albo notatki;
  - plik zostaje na dysku i wpis wraca po restarcie (B9).
- **Odczyt liczb:** saldo konta przed, po usunięciu i po „Cofnij”.

#### OP.22 Podział paragonu – części i reszta (spec „Szybki wpis”, 1.6.4, B76, B78, T238)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** wydatek 100,00 zł w „Jedzenie”, finansuje domownik → „Podziel paragon”; odczytaj części. Pierwsza
  część 60 zł, druga 30 zł – odczytaj resztę, „do ostatniej części”. Potem części 70 + 40 – „odejmij od ostatniej
  części”. „+ część”, usuń część.
- **Oczekiwany efekt:** kategoria i finansujący operacji przechodzą na pierwszą część; „nierozdzielone: 10,00 zł – bez
  kategorii” i „do ostatniej części” wyrównuje; nadmiar „części przekraczają kwotę o 10,00 zł” i „odejmij od ostatniej
  części” nie odwraca znaku części; „części sumują się do kwoty” przy równowadze; reszta liczy się jako „bez kategorii”.
- **Nie przechodzi, gdy:**
  - po podziale znaczek „domownik” zostaje na całej operacji (B78);
  - „do ostatniej części” przy nadmiarze odwraca znak albo reszta trafia do ukrytej kategorii (B76).
- **Odczyt liczb:** koperty obu kategorii przed i po podziale.

#### OP.23 Podział paragonu – opis, tag, ładownia i cel w części (1.11.0, D89, 1.10.0, N-PC-13, B79)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z kontenerem i celem z pieniędzmi
- **Jak sprawdzić:** w paragonie z 3 częściami wpisz „opis części – co to jest…” (501 znaków), tag „#” części, w jednej
  części „Ładownia: <kontener>”, w drugiej cel; usuń przedostatnią część; płatność kontenera podziel na części.
- **Oczekiwany efekt:** opis do 500 znaków; tag części tylko przy niej; część z kontenera liczy się do ładowni, z celu –
  z pieniędzy celu; po usunięciu przedostatniej części opis ostatniej trafia do notatki operacji, a tagi części do tagów
  operacji; płatność kontenera po podziale – notka „Cała operacja liczy się do ładowni – kategorie części nie mają
  znaczenia.” i pole „Ładownia” widoczne.
- **Nie przechodzi, gdy:**
  - opis części ginie po usunięciu części;
  - przy podziale płatności kontenera nie da się zobaczyć ani zmienić „Ładownia” (B79).

#### OP.24 Oznaczenie „domownik” i stan oddania (spec „Ekrany”, D80, D91, 1.12.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z zakupami domownika: nieoddanym, częściowo oddanym,
  oddanym, prezentem i wspólnym
- **Jak sprawdzić:** odczytaj znaczki tych operacji na liście; w edytorze „Finansuje” – lista wyboru; zmień „finansuje:
  X” na „prezent od: X”, potem „Wspólnie”.
- **Oczekiwany efekt:** znaczki „domownik · do oddania”, „domownik · częściowo oddane”, „domownik · oddane”; „Finansuje”
  ma „— ja (mój wydatek) —”, „finansuje: X”, „prezent od: X”, przycisk „Wspólnie”; zakup domownika nie jest „Koszty”.
- **Nie przechodzi, gdy:**
  - oddany zakup nadal „do oddania” albo prezent oznaczony jako dług;
  - zakup domownika liczy się do „Koszty” w pasku sum.
- **Odczyt liczb:** „Koszty” przed i po zmianie finansującego.

#### OP.25 Plan czy impuls (spec „Szybki wpis”, D41, D84 C7, N32)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`, próg dziennika 200 zł; potem próg 0
- **Jak sprawdzić:** wydatki 199,99 zł, 200,00 zł i 200,01 zł bez odpowiedzi – znaczek „?” w wierszu i tekst w edytorze;
  ustaw „impuls”, potem „wyczyść”, potem „plan”; zmień próg na 0 w Ustawieniach.
- **Oczekiwany efekt:** od progu (200,00 włącznie) „?” z dymkiem „Od progu dziennika kapitańskiego: plan czy impuls?” i
  w edytorze „od 200,00 zł: plan czy impuls?”; „impuls” – żółty znaczek „impuls”, „plan” – „plan”; próg 0 – nigdzie nie
  pyta; filtr „Oznaczenia” zna „plan” i „impuls”.
- **Nie przechodzi, gdy:**
  - 199,99 zł pyta albo 200,00 zł nie pyta;
  - próg 0 pyta o każdy wydatek (N32);
  - zakup domownika pyta o impuls (D80 f).

#### OP.26 Noc – cisza nocna w edytorze (D40, 1.5.2, N10, N-PC-19)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`, cisza 23:00–5:00
- **Jak sprawdzić:** wydatek z godziną 22:59, 23:00, 04:59, 05:00 – odczytaj znaczek „noc” i notkę; przy 23:00 bez wpisu
  kliknij „usuń godzinę”; przy 04:59 wpisz dziennik – odczytaj status; kliknij „uzasadniony (plan – bez kary)”; nową
  operację utwórz o godzinie z ciszy nocnej (zegar laboratorium poza ciszą – tylko pole godziny).
- **Oczekiwany efekt:** „noc” dla 23:00 i 04:59, nie dla 22:59 i 05:00; bez wpisu notka „Godzina w ciszy nocnej
  (23:00–05:00): zakup o tej porze potwierdź krótkim wpisem wyżej (D40). Dopisujesz zakup z dnia? usuń godzinę”; z
  wpisem „Potwierdzony zakup w ciszy nocnej – liczy się jako naruszenie w grze.”; po „uzasadniony” – „Wydatek w ciszy
  nocnej uzasadniony (plan)…”; zakup domownika nie jest naruszeniem.
- **Nie przechodzi, gdy:**
  - granica 23:00 albo 5:00 oceniona odwrotnie;
  - zakup nocą bez wpisu w dzienniku liczony jako naruszenie;
  - tekst notki odsyła do kodu decyzji („(D40)”) – UWAGA, zrozumiałość.

#### OP.27 Tagi i wyprawy w Operacjach (1.10.0, F17, T291)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z tagiem połączonym z celem (Wywiad → „Wyprawy”)
- **Jak sprawdzić:** w „Tagi” wpisz „#Wakacje”, w innej operacji „wakacje ”; 21 tagów; tag 41 znaków; filtr „Tag”;
  wyszukaj „#wakacje”; w wydatku z tagiem wyprawy kliknij „wyprawa #… → rozlicz z celu: …”.
- **Oczekiwany efekt:** „#Wakacje” i „wakacje” to jeden tag (zostaje pierwsza pisownia); najwyżej 20 tagów po 40 znaków
  z czytelnym komunikatem; tagi w kolumnie „Tagi”; filtr i wyszukiwanie łapią oba zapisy; „rozlicz z celu” ustawia „Z
  pieniędzy celu” na cel wyprawy.
- **Nie przechodzi, gdy:**
  - dwa osobne tagi różniące się wielkością liter albo spacją;
  - za długi tag blokuje zapis całej operacji bez komunikatu.

#### OP.28 Kategoria dla zaznaczonych (D76, 1.2.1, T91)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z wydatkami „Mokka” bez kategorii i jednym wpływem
- **Jak sprawdzić:** wyszukaj „mokka”, zaznacz pole „Zaznacz wszystkie widoczne”; odczytaj „Zaznaczone: N operacji · −X
  zł”; wybierz kategorię i „zapamiętaj „mokka” jako słowo kluczowe”, „Ustaw”; „Cofnij”. Zmień filtr przy zaznaczonych.
- **Oczekiwany efekt:** „Ustaw” nieaktywne bez kategorii; toast „<kategoria>: N operacji, pominięte (nie wydatek albo
  podział): 1 · słowo kluczowe „mokka”.” z „Cofnij”; „Cofnij” przywraca kategorie i usuwa słowo kluczowe; zmiana filtra
  czyści zaznaczenie; „zapamiętaj dla ich marek (import)” tworzy reguły marek.
- **Nie przechodzi, gdy:**
  - kategoria trafia też do wpływu albo paragonu z podziałem;
  - „Cofnij” zostawia słowo kluczowe albo regułę;
  - zaznaczenie przeżywa zmianę filtra i zmienia niewidoczne operacje.

#### OP.29 Finansujący dla zaznaczonych (D80 g, D83, 1.3.0, 1.5.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z 2–3 domownikami
- **Jak sprawdzić:** zaznacz 3 wydatki; „— finansuje… —” → „<osoba>”, „Ustaw finansującego”; potem „<osoba> – prezent”;
  potem „wspólnie…” z procentami 50 + 40; potem 50 + 50; „ja (mój wydatek)”; „Cofnij” po każdym.
- **Oczekiwany efekt:** toasty „Finansuje X: 3 operacje.”, „Prezent od: X…”, „Wspólnie: …” z „Cofnij”; procenty ≠ 100 %
  – przycisk nieaktywny; saldo osoby rośnie o kwotę zakupów (Mostek, Radar); „Cofnij” przywraca poprzednie finansowanie.
- **Nie przechodzi, gdy:**
  - wspólny podział z sumą 90 % zapisany;
  - saldo domownika nie zmienia się albo zmienia o inną kwotę.
- **Odczyt liczb:** saldo osoby i energia dziś przed i po.

#### OP.30 „Cofnij” zmiany zbiorczej po zmianie w międzyczasie (1.6.4, B66, T240)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** ustaw kategorię 4 zaznaczonym; przed „Cofnij” zmień ręcznie kategorię jednej z nich i notatkę
  drugiej; kliknij „Cofnij” w toaście (toast trzeba złapać w 8 s).
- **Oczekiwany efekt:** „Cofnięto 3 z 4 – jedna zmieniła się w międzyczasie i zostaje bez zmian.”; ręcznie zmieniona
  kategoria zostaje, notatka drugiej operacji zostaje.
- **Nie przechodzi, gdy:**
  - „Cofnij” nadpisuje ręczną zmianę albo kasuje notatkę wpisaną w międzyczasie.

#### OP.31 Zmień zaznaczone: usuń (1.7.0, F11, T265)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z zaznaczonymi: 3 wydatki, 1 zadokowany wpływ
- **Jak sprawdzić:** „zmień” → „Usuń” → „Podgląd…”; odczytaj okno; „Usuń N”; „Cofnij” w toaście.
- **Oczekiwany efekt:** okno z liczbą operacji, skutkiem („Energia dziś”, „Osłony”, koperty, „Saldo: …” przed → po) i
  notką „Usunięte zostają w historii – „Cofnij” po usunięciu albo Synchronizacja → Usunięte wpisy.”; toast „Usunięto 4
  operacje.” z „Cofnij”; „Cofnij” przywraca wszystkie z dokowaniem; liczby po usunięciu = podgląd.
- **Nie przechodzi, gdy:**
  - podgląd pokazuje inne liczby niż ekrany po usunięciu;
  - „Cofnij” nie przywraca dokowania zadokowanej operacji.
- **Odczyt liczb:** każda linia podglądu i te same liczby na Mostku po zmianie.

#### OP.32 Zmień zaznaczone: konto i rodzaj (1.7.0, F11, T265)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; potwierdzone saldo mBanku w okresie zaznaczonych
- **Jak sprawdzić:** zaznacz 3 wydatki z mBanku (jeden sprzed potwierdzenia) → „Przenieś na konto” Portfel XTB →
  „Podgląd…”; potem 2 wydatki → „Zmień rodzaj” → „Przelew własny” z kontem Portfel XTB; zadokowaną operację zmień na
  „Wydatek”.
- **Oczekiwany efekt:** podgląd: salda obu kont przed → po, „Zmieni potwierdzone saldo konta mBank z dd.mm.rrrr o …”;
  zmiana rodzaju na przelew między kontami budżetu = jedna operacja, osłony bez zmian; zadokowana – „pominięte 1 (zmiana
  do nich nie pasuje: zadokowane…)”; toast z „Cofnij”, który przywraca konto i rodzaj.
- **Nie przechodzi, gdy:**
  - zadokowana operacja zmienia rodzaj;
  - podgląd nie mówi o potwierdzonym saldzie;
  - przelew na Portfel XTB zmniejsza osłony.
- **Odczyt liczb:** salda kont i osłony z podglądu i po zmianie.

#### OP.33 Zmień zaznaczone: przesuń datę (1.7.0, F11, T265)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z operacjami z ostatnich 2 dni miesiąca i przelewem w
  jednej operacji z drugą stroną innego dnia
- **Jak sprawdzić:** zaznacz operacje z 30. i 31. dnia miesiąca oraz przelew → „Przesuń datę” o 2 (dymek „Dni: na plus –
  później, na minus – wcześniej”), „Podgląd…”, „Zastosuj do N”; potem o −2 i „Cofnij”.
- **Oczekiwany efekt:** daty przesunięte o 2 dni przez granicę miesiąca (koperty obu miesięcy w podglądzie); przelew
  przesuwa też dzień drugiej strony; „Cofnij” przywraca daty.
- **Nie przechodzi, gdy:**
  - druga strona przelewu zostaje w starym dniu;
  - podgląd pokazuje skutek tylko dla bieżącego miesiąca, gdy zmiana rusza poprzedni.

#### OP.34 Przelew między kontami budżetu jako jedna operacja (1.7.0, F10, D87, T262)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** nowa operacja „Przelew własny”, kierunek „wychodzący”, 500 zł z mBanku, „Na konto” Portfel XTB;
  odczytaj notkę, salda obu kont, osłony; filtr „Konto: Portfel XTB”; zmień kwotę na 600; usuń operację i „Cofnij”.
- **Oczekiwany efekt:** „Jedna operacja dla obu kont: −500,00 zł na mBank, +500,00 zł na Portfel XTB.”; saldo mBanku
  −500, Portfelu +500, osłony i energia bez zmian; na liście Portfela XTB kwota +500; zmiana kwoty i usunięcie obejmują
  obie strony.
- **Nie przechodzi, gdy:**
  - przelew zmienia osłony albo sumę sald;
  - na liście jednego konta kwota z niewłaściwym znakiem;
  - usunięcie zostawia jedną stronę.
- **Odczyt liczb:** salda obu kont i osłony przed, po zapisie, po zmianie kwoty.

#### OP.35 Przelew sprzed 1.7.0 – połącz albo dopisz drugą stronę (1.7.0, F10, T262, T264)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z dwiema jednostronnymi operacjami jednego przelewu i
  jedną jednostronną bez drugiej strony (po ostatnim potwierdzeniu salda)
- **Jak sprawdzić:** otwórz stronę mBanku pary – „Połącz z drugą stroną (dd.mm, Portfel XTB)”; otwórz jednostronną bez
  pary – „Dopisz drugą stronę na Portfel XTB”; przy stronie z okresu potwierdzonego odczytaj pytanie; „Cofnij” w
  toaście.
- **Oczekiwany efekt:** notka „Zapisany przed 1.7.0 jako jedna strona – liczy się tylko na koncie mBank.”; po połączeniu
  jedna operacja, salda bez zmian; dopisanie zmienia saldo Portfela (toast „Przelew jest teraz jedną operacją dla obu
  kont – drugie konto dostało jego kwotę.” z „Cofnij”); w okresie potwierdzonym – „Zmienić operację?”.
- **Nie przechodzi, gdy:**
  - połączenie zmienia saldo któregokolwiek konta;
  - po połączeniu przelew liczony dwa razy.
- **Odczyt liczb:** salda obu kont przed i po.

#### OP.36 Zwrot w drodze – oczekiwanie i ręczne zamknięcie (1.9.0, F34, T289)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** w wydatku 249,00 zł z D0−5 kliknij „Czekam na zwrot pieniędzy (oddany towar, reklamacja, anulowana
  rezerwacja)”; odczytaj kwotę, termin, stan i znaczek na liście; zmień kwotę na 100; „Zamknij – dotarł inaczej albo nie
  przyjdzie”, „Cofnij”; „Nie czekam na zwrot”. W wydatku 0 zł odczytaj przycisk; zmień rodzaj wydatku z oczekiwaniem na
  „Wpływ”.
- **Oczekiwany efekt:** domyślnie cała kwota i termin 14 dni od zakupu; „W drodze – do dd.mm (jeszcze N dni).”; znaczek
  „czeka na zwrot” i filtr; „Zamknij…” – toast „Zwrot zamknięty – nie jest już oczekiwany.” z „Cofnij”; przy 0 zł
  przycisk nieaktywny („Najpierw kwota zakupu”); wpływ nigdy nie czeka na zwrot.
- **Nie przechodzi, gdy:**
  - termin liczony od dziś zamiast od dnia zakupu;
  - znaczek zostaje po „Nie czekam na zwrot”.

#### OP.37 Zwrot w drodze – zamknięcie wpływem i po terminie (1.9.0, F34, T289, spec Radar)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z oczekiwaniami: 249 zł (marka A, termin za 5 dni), 100
  zł (marka B, termin minął 12 dni temu); `L1` z wpływem marki A 230 zł (−7,6 %) i marki C 249 zł
- **Jak sprawdzić:** zaimportuj `L1`; odczytaj stan oczekiwania A; wpisz ręcznie wpływ marki B 85 zł (−15 %). Odczytaj
  odprawę, Meldunki → „Zwroty w drodze”, Radar → „Zwroty w drodze”.
- **Oczekiwany efekt:** wpływ marki A (±10 %) zamyka oczekiwanie sam – „Dotarł: 230,00 zł dd.mm (…)”; wpływ marki C nie
  zamyka; 85 zł marki B (poza ±10 %) nie zamyka; B po terminie: odprawa, Meldunki „<B>: 100,00 zł zwrotu nie dotarło od
  12 dni (termin dd.mm, zakup dd.mm).” z „Pokaż zakup”; Radar – spodziewany wpływ.
- **Nie przechodzi, gdy:**
  - zwrot innej marki albo poza ±10 % zamyka oczekiwanie;
  - jeden wpływ zamyka dwa oczekiwania;
  - przeterminowany zwrot nie ma meldunku.

#### OP.38 Reguła dla tytułu z edytora (1.15.3 – bez decyzji D/T)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z 6 przelewami od tej samej osoby z tytułem „obiad” i
  jednym z tytułem „obiad” od innej osoby
- **Jak sprawdzić:** w przelewie „obiad” kliknij „⚡ Ustaw regułę dla tytułu „obiad”…”; odczytaj „w historii: N”; typ
  „Zwrot / kategoria”, kategoria „Jedzenie · na mieście”; zostaw „Tylko dla operacji od/do: <osoba>”; „Zaktualizuj w
  historii…”; „Zapisz i zaktualizuj (N)”; „Cofnij”. Zaimportuj plik z kolejnym przelewem „obiad”.
- **Oczekiwany efekt:** zmienia tylko operacje tej osoby z tym tytułem (lista podglądu 5 + „+ N więcej”); toast „Reguła
  dla tytułu „obiad” zapamiętana. Zaktualizowano N operacji w historii.” z „Cofnij”; „Cofnij” przywraca operacje i
  reguły; kolejny import rozpoznaje tytuł; zmiana zwrotu zmniejsza kopertę kategorii.
- **Nie przechodzi, gdy:**
  - zmienia też przelew innej osoby mimo zaznaczonego „Tylko dla…”;
  - „Cofnij” nadpisuje zmiany zrobione w międzyczasie w tych operacjach (inaczej niż T240);
  - kolejny import nie stosuje reguły.

#### OP.39 Eksport widocznej listy do CSV i Excela (1.7.0, F18, D89 e, T84, T267)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; filtr Konto: Portfel XTB + sortowanie po kwocie,
  ukryte kolumny „Tagi” i „Notatka”
- **Jak sprawdzić:** „CSV”, zapisz plik (okno zapisu w laboratorium); „Excel”; otwórz oba pliki.
- **Oczekiwany efekt:** domyślna nazwa `operacje_RRRR-MM-DD.csv` / `.xlsx` (data warszawska), toast „Zapisano N
  operacji: <ścieżka>”; tylko widoczne operacje w kolejności listy; wszystkie kolumny mimo ukrytych (z „Notatka” z
  opisami części, „Tagi”, „Finansuje”); CSV – średnik, przecinek dziesiętny, BOM, polskie znaki poprawne w Excelu;
  przelew w jednej operacji z kwotą na Portfelu XTB; suma kwot w pliku = „Wpływy” − „Wydatki” z paska.
- **Nie przechodzi, gdy:**
  - plik ma operacje spoza filtra albo inną kolejność;
  - brak kolumn ukrytych na ekranie;
  - „Ł”, „ż” zniekształcone albo kwota „1 234,56” rozbita na kolumny.
- **Odczyt liczb:** suma kwot w CSV i w Excelu wobec paska sum.

#### OP.40 Brzegi: duże kwoty, długie nazwy, kwota 0 (plan „Co znaczy dokładnie” 3, brak wymagania dla 0 zł)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `brzegi` z: wydatkiem 1 234 567,89 zł, wpływem 9 999 999,99
  zł, kontrahentem 300 znaków z polskimi znakami, wydatkiem 0,00 zł, operacją bez godziny
- **Jak sprawdzić:** odczytaj wiersze, pasek sum, edytor i eksport CSV; wpisz w nowej operacji kwotę 0 i zapisz; wpisz
  kontrahenta 301 znaków.
- **Oczekiwany efekt:** kwoty z separatorem tysięcy bez zaokrągleń i ucięć w wierszu (kolumna kwoty nie obcina cyfr);
  długa nazwa skrócona z „…” i pełna w dymku; pole kontrahenta przyjmuje najwyżej 300 znaków; operacja 0 zł – zachowanie
  sensowne: zapis jawny (np. ostrzeżenie albo nie liczy się nigdzie), bez znaków „−0,00”.
- **Nie przechodzi, gdy:**
  - suma traci grosze przy dużych kwotach;
  - „−0,00 zł” albo 0 zł jako „bez kategorii” w Meldunkach;
  - długa nazwa rozpycha układ listy.

#### OP.41 Klawiatura i liczba kroków (plan oś 6, ui „Skróty”)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** bez myszy: Ctrl+2, „/”, wpisz „orlen”, Esc, ↓ i ↑ po liście, Tab do kategorii w edytorze, zmień
  kategorię, Ctrl+N. Policz kroki typowej poprawki: „zmień kategorię operacji z wczoraj”.
- **Oczekiwany efekt:** ↑ / ↓ zmienia zaznaczoną operację i przewija listę; po wyszukiwaniu Esc nie zamyka aplikacji ani
  nie kasuje filtra innych pól; poprawka kategorii w najwyżej 4 krokach (otwórz, wybierz, kategoria, gotowe – zapis
  sam).
- **Nie przechodzi, gdy:**
  - strzałki nie działają po kliknięciu w wiersz;
  - zmiana kategorii wymaga przycisku „Zapisz” albo ginie bez niego.

#### OP.42 Folder tylko do odczytu i wpis nowszej wersji (1.5.3, 1.6.5, N2, T265)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z folderem tylko do odczytu; `rok` z jedną operacją
  zapisaną przez nowszą wersję aplikacji (wyższy `schemaVersion`)
- **Jak sprawdzić:** w folderze tylko do odczytu: zaznacz operacje, otwórz edytor, „Nowa”. Z wpisem nowszej wersji:
  otwórz go; zaznacz go z innymi i „zmień” → „Usuń” → „Podgląd…”.
- **Oczekiwany efekt:** tylko do odczytu – pola i zmiany zbiorcze wyłączone, zaznaczanie i suma działają, „Historia”
  dostępna; wpis nowszej wersji – do obejrzenia z dopiskiem „zaktualizuj aplikację”, w podglądzie „zapisane przez nowszą
  wersję aplikacji: 1 (bez zmian)”.
- **Nie przechodzi, gdy:**
  - zmiana w folderze tylko do odczytu melduje sukces;
  - wpis nowszej wersji nadpisany albo usunięty.

#### OP.43 Powiadomienie o zwrocie po terminie (1.9.0, F34, T289)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok` z oczekiwanym zwrotem, którego termin mija jutro
- **Jak sprawdzić:** przesuń zegar o 2 dni do przodu, otwórz aplikację (komputer „w użyciu”); poczekaj na powiadomienie;
  kliknij je. Wyłącz przełącznik w Ustawienia → Powiadomienia i dźwięki i powtórz następnego dnia.
- **Oczekiwany efekt:** jedno powiadomienie Windows z nazwą, kwotą i liczbą dni po terminie, nie powtarzane po ponownym
  uruchomieniu; kliknięcie prowadzi do zakupu albo Meldunków; po wyłączeniu – brak powiadomienia.
- **Nie przechodzi, gdy:**
  - powiadomienie przychodzi przed terminem albo kilka razy dziennie;
  - przy ukrytych kwotach powiadomienie pokazuje kwotę.

### ME – Meldunki do rozpatrzenia

#### ME.1 Pusta skrzynka i stan przed startem budżetu (1.6.0, F6, D86, T211)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `start` bez zaległości; `pusty` po wyborze folderu, przed
  kreatorem, z kopią konfliktu w folderze
- **Jak sprawdzić:** Ctrl+Shift+M w `start`; odczytaj nagłówek i menu boczne. W folderze przed startem budżetu odczytaj
  meldunki.
- **Oczekiwany efekt:** „Meldunki do rozpatrzenia”, „wszystko rozpatrzone”, „Brak meldunków – nic nie czeka na
  decyzję.”, przy „Meldunki” w menu bez licznika; przed startem budżetu tylko meldunki folderu danych (konflikty, pliki
  z błędem).
- **Nie przechodzi, gdy:**
  - licznik „0” albo pusty znaczek przy pustej skrzynce;
  - przed startem budżetu meldunki „bez kategorii” albo sald z historii sprzed startu.

#### ME.2 Licznik w menu, skrót i odświeżanie (1.6.0, F6, D86, T211)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z meldunkami kilku rodzajów
- **Jak sprawdzić:** odczytaj liczbę przy „Meldunki” w menu bocznym i na ekranie („N meldunków”); z Mostka Ctrl+Shift+M,
  potem Esc; rozstrzygnij jeden meldunek (np. skategoryzuj wydatki) i wróć; Ctrl+Shift+M z Ustawień.
- **Oczekiwany efekt:** licznik w menu = liczba linii w skrzynce (jedna linia = jeden meldunek); Ctrl+Shift+M z każdego
  ekranu otwiera skrzynkę, Esc wraca na poprzedni ekran; po rozstrzygnięciu licznik maleje bez ponownego uruchomienia
  (duplikaty – po kilku sekundach).
- **Nie przechodzi, gdy:**
  - licznik ≠ liczba linii;
  - licznik nie maleje po rozstrzygnięciu albo zmienia się po ponownym uruchomieniu bez zmiany danych.

#### ME.3 Kolejność sekcji i przyciski prowadzą do decyzji (1.6.0, F6, D86, T211)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z meldunkiem każdego rodzaju (dokowanie, łupy, folder
  danych, bez kategorii, duplikaty, przelewy, podwójne korekty, nieznane sygnały, zwroty do przypisania, do zwrotu,
  zwroty w drodze, ładownia, salda kont)
- **Jak sprawdzić:** odczytaj kolejność paneli; kliknij przycisk każdego meldunku (po każdym wróć Ctrl+Shift+M).
- **Oczekiwany efekt:** sekcje: Dokowanie, Łupy, Folder danych, Bez kategorii, Możliwe duplikaty, Przelewy między
  kontami, Podwójne korekty, Nieznane sygnały, Zwroty do przypisania, Do zwrotu, Zwroty w drodze, Ładownia, Salda kont;
  przyciski: „Zadokuj” – okno dokowania, „Plan miesiąca”, „Synchronizacja”, „Pokaż w Operacjach”, „Scal na ekranie
  Import”, „Połącz…”, „Pokaż korektę”, „Przypisz” – wpłata, „Pokaż zakupy”, „Pokaż zakup”, „Zaktualizuj w Ładowni” /
  „Pokaż w Ładowni”, „Potwierdź saldo” – Ustawienia → Konta; pod sekcjami wyjaśnienie, po co meldunek.
- **Nie przechodzi, gdy:**
  - przycisk prowadzi na zły ekran albo do listy bez filtra, w której trzeba szukać;
  - tytuł sekcji i tekst meldunku mówią o czym innym.

#### ME.4 Wydatki bez kategorii (1.6.0, 1.6.4, D86, T211, T238)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z 3 wydatkami bez kategorii od startu, 1 sprzed startu,
  paragonem z jedną częścią bez kategorii (40 z 100 zł)
- **Jak sprawdzić:** odczytaj meldunek; „Pokaż w Operacjach”; skategoryzuj wszystkie; wróć.
- **Oczekiwany efekt:** „4 wydatki bez kategorii od dd.mm.rrrr – razem X zł.” – tylko od startu budżetu, w kwocie tylko
  część paragonu bez kategorii (40 zł); lista w Operacjach z tymi samymi operacjami, zapisany filtr nietknięty; po
  skategoryzowaniu meldunek znika.
- **Nie przechodzi, gdy:**
  - kwota zawiera całe paragony albo wydatki sprzed startu;
  - lista z „Pokaż w Operacjach” ma inną liczbę operacji niż meldunek.
- **Odczyt liczb:** liczba i kwota z meldunku.

#### ME.5 Możliwe duplikaty (1.6.0, D77, T94, N75)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z 3 grupami duplikatów
- **Jak sprawdzić:** odczytaj meldunek; porównaj z „Możliwe duplikaty: N” nad listą Operacji i z panelem „Duplikaty
  operacji” w Imporcie; kliknij „Scal na ekranie Import” bez otwartego pliku importu i z otwartym.
- **Oczekiwany efekt:** „3 możliwe duplikaty – ta sama operacja dwa razy.”; ta sama liczba w trzech miejscach; bez pliku
  – panel „Duplikaty operacji”, przy otwartym pliku notka „Możliwe duplikaty: 3 – scalisz je po imporcie albo po
  zamknięciu pliku.”
- **Nie przechodzi, gdy:**
  - liczby różnią się między ekranami;
  - przy otwartym pliku przycisk prowadzi donikąd bez wyjaśnienia (N75).

#### ME.6 Pary przelewów zapisane jako dwie operacje (1.7.0, F10, D87, T264)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z 3 parami sprzed 1.7.0 (jedna bez wskazanego konta po
  obu stronach – tylko kwota i dzień)
- **Jak sprawdzić:** „Połącz…” przy meldunku przelewów; odczytaj okno „Przelewy zapisane jako dwie operacje”; odznacz
  parę bez konta; „Połącz zaznaczone (2)”; odczytaj salda kont; „Cofnij”. Przy trzeciej parze „zostaw tak”.
- **Oczekiwany efekt:** okno z parami (data, konto → konto, kwota, dzień wpływu w nawiasie), para bez konta z notką
  „Żadna strona nie wskazuje konta – para po kwocie i dniu; sprawdź, czy to jeden przelew.”; po połączeniu każda para
  jest jedną operacją, salda i warstwy bez zmian, toast „Połączono 2 przelewy w jedną operację dla obu kont.” z
  „Cofnij”; „zostaw tak” – toast „Przelew nie będzie już zgłaszany.” z „Cofnij”.
- **Nie przechodzi, gdy:**
  - połączenie zmienia saldo któregoś konta;
  - para bez konta zaznaczona do połączenia bez ostrzeżenia;
  - „zostawiona” para wraca po ponownym uruchomieniu.
- **Odczyt liczb:** salda kont przed i po połączeniu.

#### ME.7 Przelew liczony dwa razy i brakująca strona (1.7.0, F10, T264)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z przelewem w jednej operacji i osobną operacją jego
  strony na Portfelu XTB; jednostronnym przelewem na Portfel XTB po ostatnim potwierdzeniu salda Portfela i drugim takim
  przed potwierdzeniem
- **Jak sprawdzić:** odczytaj meldunki przelewów; „Połącz” przy podwójnym; „Dopisz drugą stronę” przy brakującym;
  „Pokaż”.
- **Oczekiwany efekt:** podwójny: „mBank → Portfel XTB dd.mm, X zł: strona konta Portfel XTB zapisana też osobno (dd.mm)
  – liczy się dwa razy.”; brakujący: „… zapisany tylko na koncie mBank – saldo konta Portfel XTB go nie ma.”; brakujący
  sprzed potwierdzenia – bez meldunku; po decyzji saldo Portfela poprawne, w toaście „Cofnij”.
- **Nie przechodzi, gdy:**
  - meldunek o brakującej stronie sprzed potwierdzonego salda (różnicę wyrównała już korekta);
  - po „Połącz” kwota dalej liczona dwa razy.
- **Odczyt liczb:** saldo Portfela XTB przed i po.

#### ME.8 Nieznane sygnały – meldunek, oznaczenie i edytor (1.9.0, F31, T288)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z: zakupem marki ponad 1,5 × zwykłej kwoty (marka z ≥ 5
  zakupami w roku przed nim), kategorią w tym miesiącu > 2 × średniej z 3 miesięcy (średnia ≥ 50 zł), nowym kontrahentem
  od 200 zł przy ≥ 90 dniach historii, dwoma obciążeniami z banku tej samej marki i kwoty dzień po dniu
- **Jak sprawdzić:** odczytaj sekcję „Nieznane sygnały”, odprawę na Mostku, oznaczenie „nietypowa” (filtr) i ramkę
  „Nieznany sygnał na radarze” w edytorze; „to w porządku” w Meldunkach przy jednym, „To w porządku” w edytorze przy
  drugim; „Cofnij”; uruchom ponownie.
- **Oczekiwany efekt:** cztery rodzaje tekstów: „<marka> X zł (dd.mm) – zwykle do Y zł.”, „<kategoria>: X zł w tym
  miesiącu – N,N× średniej z 3 miesięcy (Y zł).”, „Nowy kontrahent: …”, „Dwa obciążenia z banku: … – możliwe podwójne
  pobranie (sprawdź; nie są łączone).”; dwa obciążenia nigdy nie są scalane; „to w porządku” – toast „Zapamiętane: to w
  porządku.” z „Cofnij”, sygnał nie wraca po restarcie; odprawa pokazuje sygnały z 14 dni.
- **Nie przechodzi, gdy:**
  - zwykły zakup (poniżej progu) oznaczony jako nietypowy;
  - dwa obciążenia scalone albo zaproponowane w panelu duplikatów;
  - zapamiętany sygnał wraca.

#### ME.9 Powiadomienie o nieznanym sygnale (1.9.0, F31, T288)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`; plik CSV z podwójnym obciążeniem
- **Jak sprawdzić:** zaimportuj plik z dwoma obciążeniami albo wpisz zakup ponad próg marki; poczekaj na powiadomienie;
  wyłącz przełącznik w Ustawienia → Powiadomienia i dźwięki i powtórz z innym sygnałem.
- **Oczekiwany efekt:** jedno powiadomienie na nowy sygnał, nie powtarzane po restarcie; po wyłączeniu – brak.
- **Nie przechodzi, gdy:**
  - po pierwszym uruchomieniu powiadomienia dla wszystkich sygnałów z historii (zalew);
  - sygnał oznaczony „to w porządku” powiadamia ponownie.

#### ME.10 Salda kont do potwierdzenia (1.6.0, D86, T211, B28, T185)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`: mBank potwierdzony 31 dni przed D0, drugie konto 29
  dni przed D0, Portfel XTB bez potwierdzenia od salda otwarcia (ponad 30 dni), Gotówka bez potwierdzenia, konto
  zarchiwizowane
- **Jak sprawdzić:** odczytaj sekcję „Salda kont”; „Potwierdź saldo”; potwierdź mBank i wróć.
- **Oczekiwany efekt:** „mBank: saldo potwierdzone 31 dni temu – sprawdź z bankiem.”, „Portfel XTB: saldo bez
  potwierdzenia od salda otwarcia z dd.mm.rrrr (N dni) – sprawdź z bankiem.”; bez konta z 29 dni, Gotówki i konta
  zarchiwizowanego; przycisk prowadzi do Ustawienia → Konta; potwierdzenie mBanku gasi tylko jego meldunek.
- **Nie przechodzi, gdy:**
  - potwierdzenie mBanku gasi meldunek Portfela XTB (B28);
  - meldunek dla konta potwierdzonego 29 dni temu albo dla Gotówki.

### IM – Import z mBanku

#### IM.1 Ekran Import bez pliku (spec „Ekrany”, 0.3.0, 1.6.3)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** Ctrl+3. Odczytaj nagłówek i panele.
- **Oczekiwany efekt:** „Import · CSV z mBanku”, „ostatni import – mBank: dd.mm.rrrr, gg:mm”; panel „Plik z mBanku” z
  „Wybierz plik CSV…”, „albo upuść go tutaj” i instrukcją „mBank → Historia → lista operacji → „Eksportuj” CSV … Przed
  zapisem powstaje kopia zapasowa.”; „Duplikaty operacji” (gdy są), „Potwierdzenie sald”, „Kategoryzacja” z „Wybierz
  plik CSV z mBanku – operacje pojawią się tu w tematach (kategoriach) i grupach marek.”
- **Nie przechodzi, gdy:**
  - brak instrukcji, skąd wziąć plik;
  - data ostatniego importu w UTC albo w innym formacie niż reszta aplikacji.

#### IM.2 Lista operacji – wczytanie i podgląd (spec „Import z mBanku” 1, D27, 0.3.0, T42)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1`
- **Jak sprawdzić:** „Wybierz plik CSV…” → `L1` (okno wyboru pliku w laboratorium). Odczytaj wiersz pliku, „Konto w
  budżecie”, panel „Podgląd” i przycisk importu. Sprawdź folder danych przed kliknięciem „Importuj”.
- **Oczekiwany efekt:** „<nazwa> · lista operacji · N operacji · dd.mm.rrrr – dd.mm.rrrr” (okres z „#Za okres”),
  „Właściciel rachunku: <#Klient> – przelewy z tym nazwiskiem to przelewy własne.”, konto domyślnie mBank; liczniki
  „nowe operacje”, „połączone z wpisami ręcznymi”, „nierozliczone → rozliczone”, „już zaimportowane (bez zmian)” sumują
  się z pozostałymi do liczby wierszy pliku; „Importuj (N)”; do kliknięcia folder bez zmian.
- **Nie przechodzi, gdy:**
  - liczba operacji ≠ liczba wierszy PLN pliku;
  - w folderze danych pojawiają się operacje przed „Importuj”.
- **Odczyt liczb:** liczniki podglądu i liczba w „Importuj (N)”.

#### IM.3 Historia rachunku – nazwy bez dopisków banku (0.3.0, D79, 1.2.3, T100)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `H1` z „KAWIARNIA MOKKA /Testowo” i „/TESTOWO” z
  różnymi „DATA TRANSAKCJI”, „POS ZWROT TOWARU” sklepu z wcześniejszym zakupem, przelewem z tytułem i nadawcą
- **Jak sprawdzić:** wczytaj `H1`; odczytaj „historia rachunku”, grupy marek, nazwy i tytuły; po imporcie otwórz
  operację kawiarni w Operacjach (sekcja „Z banku”).
- **Oczekiwany efekt:** jeden sklep = jedna grupa niezależnie od dnia transakcji i wielkości liter miasta; nazwa bez
  „DATA TRANSAKCJI”, godziny, numeru karty i miasta; zwrot towaru ma nazwę sklepu i jego kategorię; przelew – kontrahent
  z „#Nadawca/Odbiorca”, tytuł z „#Tytuł”; opis banku w edytorze bez zmian.
- **Nie przechodzi, gdy:**
  - kawiarnia rozpada się na kilka grup po dniach albo mieście;
  - zwrot towaru bez nazwy sklepu albo jako wpływ (przychód).

#### IM.4 Kodowanie pliku (spec „Technika” – CSV Windows-1250, T42)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1`, `L1-utf8`, `L1-utf8-bez-bom`, `L1-utf16`
- **Jak sprawdzić:** wczytaj kolejno cztery pliki (bez importu, „Zamknij plik” między nimi); porównaj nazwy z „Ł”, „ż”,
  „ę”, „Ś”, liczby operacji, sumy i grupy. Zaimportuj `L1`, potem wczytaj `L1-utf8`.
- **Oczekiwany efekt:** ten sam podgląd we wszystkich kodowaniach – polskie znaki poprawne, te same liczniki i kwoty; po
  imporcie `L1` plik `L1-utf8` ma wszystko w „już zaimportowane (bez zmian)”.
- **Nie przechodzi, gdy:**
  - „�”, „Ä…”, „Ĺ‚” w nazwach albo kategoriach mBanku;
  - drugi plik w innym kodowaniu daje nowe operacje (duplikaty).

#### IM.5 Plik albo wiersze, których FI nie przeczyta (T42, T167, T235, B94, 1.6.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `X`, `Z`, `U`, `E`, `G`, `W`
- **Jak sprawdzić:** wczytaj `L1`, podejmij decyzję w jednym temacie; potem wybierz kolejno `X`, `Z`, `U`, `E`, `G`; na
  końcu `W`.
- **Oczekiwany efekt:** `X`, `Z`, `U` – „<nazwa>: To nie jest plik CSV z mBanku: brak nagłówka „#Data operacji …
  #Kwota”. Pobierz w mBanku listę operacji albo historię rachunku jako CSV.” i „– otwarty plik „L1” zostaje bez zmian.”
  (decyzje zostają); `G` – komunikat o rozmiarze ponad 20 MB bez wczytywania; `E` – zrozumiały komunikat (brak
  wymagania); `W` – „Pominięte wiersze: linia N (kwota w EUR – FI prowadzi tylko PLN); linia M (nieczytelna data „…”)”,
  reszta wczytana.
- **Nie przechodzi, gdy:**
  - błędny plik zamyka otwarty albo kasuje decyzje;
  - okno zawiesza się na `G` albo `U`;
  - wiersz w EUR wchodzi jako PLN albo znika bez słowa.

#### IM.6 Upuszczenie pliku na panel (1.6.3, B94, T235)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`; `L1`, `G`
- **Jak sprawdzić:** upuść `L1` na panel „Plik z mBanku” (zdarzenie upuszczenia w laboratorium); potem `G`; potem upuść
  plik w trakcie zapisu importu.
- **Oczekiwany efekt:** upuszczony `L1` – ten sam podgląd co wybrany; `G` – ten sam limit i ten sam komunikat co przy
  wyborze pliku (1.6.3); w trakcie zapisu „Trwa import – poczekaj, aż się skończy.”
- **Nie przechodzi, gdy:**
  - upuszczony `G` wczytuje się mimo limitu;
  - komunikat o rozmiarze inny niż przy wyborze („…wyciąg z banku (limit 20 MB)” wobec „…plik z mBanku (najwyżej 20
    MB)”) – UWAGA, spójność.

#### IM.7 Tematy, grupy marek i sekcje (spec „Import” 3, D75, 1.2.1, 1.5.4, T88)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1` z Biedronką w dwóch miastach, „PAYPRO SA
  *ALLEGRO” i „ALLEGRO.PL”, „SumUp *KAWIARNIA”, Orlenem, kontrahentami spoza słownika
- **Jak sprawdzić:** wczytaj `L1`; odczytaj podsumowanie „Kategoryzacja”, sekcje i plakietki grup; rozwiń temat i grupę.
- **Oczekiwany efekt:** „Nowe operacje: N grup w M tematach – do decyzji a, do sprawdzenia b, gotowe c. Decyzja tematu
  obejmuje wszystkie jego marki…”; sekcje „Do decyzji · a”, „Rozpoznane – sprawdź · b”, „Gotowe · c” (gotowe zwinięte);
  jedna sieć = jedna grupa (miasto, numer sklepu, „SumUp *”, „PAYPRO SA *”, „.PL” nie dzielą); plakietki „reguła”,
  „rozpoznane”, „sieć”, „słowo kluczowe”, „do decyzji”; temat z ponad 30 markami zwinięty, listy po 100.
- **Nie przechodzi, gdy:**
  - Allegro w trzech grupach albo Biedronka w dwóch;
  - suma a + b + c ≠ liczba tematów.

#### IM.8 Decyzja tematu, marki i operacji (1.2.1, 1.6.3, B39, B98, N87, T235)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1`
- **Jak sprawdzić:** w temacie z trzema markami ustaw kategorię tematu; jednej marce inną; jednej operacji inną
  kategorię, drugiej operacji rodzaj „Przelew własny”; przy trzeciej wybierz „(jak grupa)”; „pomiń” przy czwartej; dodaj
  słowo kluczowe (plan liczony od nowa).
- **Oczekiwany efekt:** decyzja tematu obejmuje marki bez własnej; temat z różnie zdecydowanymi markami – „różne – patrz
  marki”; operacja z innym rodzajem – w ramce z „jak grupa”; „(jak grupa)” daje kategorię grupy; „pomiń” przekreśla i
  zmienia się na „importuj”; po przeliczeniu planu decyzje zostają.
- **Nie przechodzi, gdy:**
  - „(jak grupa)” zostawia operację bez kategorii (B98);
  - decyzja tematu znika po przeliczeniu (B39);
  - własna decyzja operacji niewidoczna i nie do cofnięcia (N87).

#### IM.9 Podpowiedzi mBanku (D68, T37, 1.2.1, 1.6.3, B97)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1` z kategoriami mBanku (także nietrafną, np. XTB
  jako „Ubezpieczenia”)
- **Jak sprawdzić:** odczytaj grupy z „kategoria mBanku „…” → …”; „Przyjmij podpowiedzi mBanku (N)”; zmień jedną z
  przyjętych; zaimportuj; wczytaj `L2`.
- **Oczekiwany efekt:** kategoria mBanku nigdy nie jest wpisana sama – tylko po kliknięciu; przyjęta ma plakietkę
  „podpowiedź mBanku” i nie tworzy reguły; zmieniona po przyjęciu – „Twoja decyzja” z zaznaczonym „zapamiętaj”; w `L2`
  marki z przyjętą podpowiedzią znowu jako podpowiedź (bez reguły), marka z własną decyzją – „Gotowe”.
- **Nie przechodzi, gdy:**
  - podpowiedź mBanku działa bez kliknięcia albo zostaje regułą;
  - wypłata XTB dostaje kategorię mBanku zamiast rozpoznania.

#### IM.10 Wyszukiwarka, zaznaczanie i decyzja dla zaznaczonych (D76, 1.2.1, 1.6.3, B37, N83, T90)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `L1`
- **Jak sprawdzić:** w „Szukaj: nazwa, tytuł, kategoria, kwota…” wpisz „orlen”, potem kwotę „12,50”, potem nazwę
  kategorii; „Zaznacz znalezione”; „Decyzja dla zaznaczonych” – „Wydatek / zwrot towaru – kategoria” bez kategorii,
  potem z kategorią; zaznacz też wpływ; „Nie importuj”, „Importuj jednak”, „Odznacz”; „Przyjmij pewne” w trakcie
  wyszukiwania.
- **Oczekiwany efekt:** „znaleziono: N grup + M operacji”; „Zaznaczone: N grup, M operacji”; „Ustaw” nieaktywne bez
  kategorii (dymek „Wybierz kategorię”); „Ustawiono dla N; K nie pasuje do kierunku pieniędzy (wpływ / wydatek) – bez
  zmian.”; „Nie importuję: N operacji.”; „Przyjmij pewne (znalezione: K)” działa tylko na znalezionych; brak wyników –
  „Nic nie pasuje do „…”.”
- **Nie przechodzi, gdy:**
  - „Ustaw” bez kategorii kasuje propozycje sieci (B37);
  - „Przyjmij pewne” w wyszukiwaniu działa na wszystkich tematach (N83);
  - wpływ dostaje kategorię wydatku.

#### IM.11 Słowa kluczowe (D75, D76, 1.2.1, 1.2.3, 1.6.3, N76, T235)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `L1` z kilkoma „CUKIERNIA …” i jedną „Cukiernia” w
  tytule przelewu
- **Jak sprawdzić:** wyszukaj „cukiernia”, zaznacz znalezione, wybierz kategorię i „zapamiętaj „cukiernia” jako słowo
  kluczowe (obejmie X z Y zaznaczonych)”, „Ustaw”; w panelu „Słowa kluczowe” dodaj „data” i „sklep”, potem „weterynarz”
  z decyzją; usuń jedno; rozwiń „Wbudowane słowa (N) i sieci ze słownika (M)”.
- **Oczekiwany efekt:** toast „Ustawiono dla N. Słowo kluczowe „cukiernia” zapamiętane.”, plik liczony od nowa – inne
  grupy ze słowem od razu z decyzją, także przelew z tytułem; zbyt ogólne słowa odrzucone z wyjaśnieniem; słowo dla
  wpływu albo przelewu też możliwe (kierunek z zaznaczonych); słowo działa w kolejnych importach.
- **Nie przechodzi, gdy:**
  - słowo „data” albo „sklep” zapisane;
  - liczba „obejmie X z Y” różni się od liczby operacji, które dostały decyzję.

#### IM.12 Propozycja reguły na słowo (D78, 1.2.2, 1.2.3, N16, T98)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`; `L1` z „KURS JEZYKOWY ABC” i „KURSY ONLINE XYZ”,
  „AUTOMATSPEC”, „ZEGARMISTRZ ROMAN”
- **Jak sprawdzić:** zdecyduj o grupie „KURS JEZYKOWY ABC”; odczytaj propozycję; kliknij ją; przy innej „nie, dziękuję”.
- **Oczekiwany efekt:** „Reguła na słowo – <decyzja>: „kurs” · jeszcze N operacji”; kliknięcie – toast „Słowo „kurs” →
  <decyzja>: jeszcze N operacji w tym pliku i kolejne importy.”, „KURSY ONLINE XYZ” od razu z decyzją; bez propozycji
  słów miast, imion i słów, które złapałyby inne słowa („auto” – „AUTOMATSPEC”, „roma” – „ROMAN”); opisana decyzja =
  zapisana.
- **Nie przechodzi, gdy:**
  - propozycja zapisuje inną decyzję niż pokazana (N16);
  - słowo łapie niezwiązane nazwy.

#### IM.13 Podobne nazwy i połączone nazwy (D78, D79, 1.2.2, 1.2.3, T95–T97)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z połączeniem nieaktywnym z 1.2.2; `L1` z „MOKKA
  KAWIARNIA” i „KAWIARNIA MOKKA”, literówką nazwy, „BAR POD LIPA” i „BAR MLECZNY”, dwiema sieciami ze słownika
- **Jak sprawdzić:** panel „Podobne nazwy”: „Połącz” jedną parę, „To nie to samo” drugą, „Cofnij”; zaznacz dwie grupy i
  „Połącz nazwy (2)”; zaznacz dwie sieci. Ustawienia → Import z banku → „Połączone nazwy”: „rozłącz”, „Usuń nieaktywne
  (N)”, „Rozłącz wszystkie”, „pokazuj znowu”.
- **Oczekiwany efekt:** pary z powodem („te same słowa”, „ucięta nazwa”, „literówka”, „ta sama nazwa na początku”), bez
  „Połącz wszystkie”; „bar” ani miasto nie robią pary; „Połącz” – toast „Połączono „A” z „B” – kolejne importy też je
  połączą.” z „Cofnij”, jedna grupa; dwie sieci – bez „Połącz nazwy”; w Ustawieniach rozłączenia z „Cofnij”, nieaktywne
  oznaczone „nieaktywne (nazwa z datą transakcji, 1.2.2)”.
- **Nie przechodzi, gdy:**
  - para wraca po „To nie to samo”;
  - „BAR POD LIPA” i „BAR MLECZNY” proponowane jako ta sama firma.

#### IM.14 Łączenie z wpisem ręcznym ±3 dni (spec „Import” 2, D26, D77, T36, T233)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z wpisami ręcznymi mBanku: A – ta sama kwota i dzień
  („Biedronka”, kategoria, godzina 18:40, notatka), B – ta sama kwota 3 dni wcześniej, C – 4 dni wcześniej, D – bez
  nazwy; `L1` z ich wierszami
- **Jak sprawdzić:** wczytaj `L1`; odczytaj „Dopasowania” → „Wpisy ręczne z banku (N)”; zaimportuj; otwórz A, B, C w
  Operacjach; odczytaj liczbę operacji tych dni i saldo mBanku.
- **Oczekiwany efekt:** A, B, D zaznaczone („… ⟷ bank dd.mm.rrrr: …”), C nie; po imporcie A, B, D – po jednej operacji z
  kategorią, godziną, notatką i nazwą użytkownika oraz datą, kwotą i danymi banku („z banku”); C i jej wiersz – dwie
  operacje; saldo mBanku zgodne z bankiem.
- **Nie przechodzi, gdy:**
  - wpis i wiersz banku dają dwie operacje przy różnicy do 3 dni;
  - połączona operacja traci kategorię, godzinę albo notatkę.
- **Odczyt liczb:** saldo mBanku i liczba operacji przed i po.

#### IM.15 Możliwy duplikat i „Nie łącz” (D77, T92, T233, B36, B102, 1.6.3, 1.5.1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z wpisami: E – ta sama kwota, inna nazwa, przelew; F –
  kwota różna o 0,30 zł, podobna nazwa; G – „Sklep” przy „SKLEP OLA” i innej kwocie; H – „KFC” przy „KFC 1234 WARSZAWA”;
  wpis przy przelewie własnym banku; `L1`
- **Jak sprawdzić:** odczytaj dopasowania i ich dopiski; odznacz parę wpisu z przelewem własnym; zaimportuj; otwórz
  Import bez pliku – „Duplikaty operacji”.
- **Oczekiwany efekt:** F i H połączone same; E – „możliwy duplikat – inna nazwa · zaznacz, jeśli to ta sama operacja”,
  niezaznaczony; G – nigdy łączony sam; odznaczony – „osobno – wejdzie jako: <decyzja>” i wchodzi z rozpoznaniem
  (przelew własny zostaje przelewem); niepołączony E w panelu duplikatów niezaznaczony.
- **Nie przechodzi, gdy:**
  - odznaczony wiersz wchodzi jako goły wydatek bez rozpoznania (B36);
  - słowo „sklep” łączy parę samo (B102).

#### IM.16 Nierozliczone rozliczone przez bank (T35, T233, 1.6.3, B99, N77)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` po imporcie `L1` z 2 nierozliczonymi (jedna z podziałem
  paragonu z częścią domownika, druga z nazwą zmienioną przez użytkownika); `L2` z nimi rozliczonymi: kwota +6 %, data
  +2 dni
- **Jak sprawdzić:** wczytaj `L2`; odczytaj „Nierozliczone, które bank rozliczył inaczej (2)”, licznik podglądu;
  zaimportuj; otwórz obie operacje.
- **Oczekiwany efekt:** „<nazwa> dd.mm.rrrr → dd.mm.rrrr  X → Y”; po imporcie te same operacje (bez nowych) z kwotą i
  datą banku, znaczek „z banku” zamiast „nierozliczona”; części paragonu przeskalowane proporcjonalnie, część domownika
  zostaje jego; nazwa użytkownika zostaje; „nierozliczone → rozliczone: 2” w podglądzie = „rozliczone: 2” w wyniku i
  toaście.
- **Nie przechodzi, gdy:**
  - różnica kwoty trafia na „moje” bez kategorii (B99);
  - liczniki podglądu i wyniku różne (N77).
- **Odczyt liczb:** kwoty części paragonu i saldo domownika przed i po.

#### IM.17 Nierozliczone, których bank już nie pokazuje (T40, T234, 1.6.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` po imporcie `L1`; `L2` bez jednej nierozliczonej z
  okresu `L2`; `H1` bez nierozliczonych
- **Jak sprawdzić:** wczytaj `L2`; odczytaj sekcję; zaznacz i zaimportuj; Synchronizacja → „Usunięte wpisy”. Wczytaj
  `H1`.
- **Oczekiwany efekt:** „Nierozliczone, których bank już nie pokazuje (1)” z notką „Zwykle anulowana autoryzacja karty –
  ale lista z filtrem też ich nie pokaże…”, niezaznaczona; po zaznaczeniu usunięta („usunięte: 1”), w „Usuniętych
  wpisach”; historia rachunku i nierozliczona spoza okresu pliku nigdy nie są proponowane.
- **Nie przechodzi, gdy:**
  - zniknięta nierozliczona usunięta bez zaznaczenia;
  - `H1` proponuje usunięcie nierozliczonych.

#### IM.18 Przelewy własne i nazwiska właściciela (spec „Import” 4, T37, 1.6.3, B103)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1` z „PRZELEW WŁASNY”, przelewem z i do „KAPITAN
  TESTOWY” (= „#Klient”), przelewem do osoby o tym samym imieniu
- **Jak sprawdzić:** wczytaj `L1`; odczytaj rozpoznanie przelewów; zaimportuj; Ustawienia → Import z banku → „Twoje
  nazwiska w banku”; dodaj drugie nazwisko i wczytaj plik z przelewem na nie.
- **Oczekiwany efekt:** przelewy własne rozpoznane („przelew własny”), nie są kosztem ani przychodem (pasek sum, panel
  „Przychody”); właściciel z pliku dopisany do „Twoje nazwiska w banku”; dodane nazwisko działa po przeliczeniu planu;
  przelew do innej osoby o tym imieniu nie jest własny.
- **Nie przechodzi, gdy:**
  - przelew własny liczony jako wydatek albo przychód;
  - samo imię wystarcza do uznania przelewu za własny.

#### IM.19 Gotówka, opłaty, zwrot towaru i rodzaje operacji (spec „Przypadki szczególne”, T37, 1.2.3, 1.6.3, B103, B105)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `L1` z wypłatą z bankomatu, wypłatą BLIK, „OPŁATA ZA
  KARTĘ”, prowizją za zakup z tytułem „kebab”, „ZWROT ZAKUPU” sklepu z regułą, „PŁATNOŚĆ WEB - KOD MOBILNY”, „SPRZEDAŻ
  WALUTY”, tytułem przelewu z podwójną spacją, mTransferem z przecinkiem w tytule
- **Jak sprawdzić:** wczytaj `L1`; odczytaj decyzję i nazwę każdej z tych grup; zaimportuj; otwórz zwrot w Operacjach.
- **Oczekiwany efekt:** bankomat i wypłata BLIK – wydatek „Gotówka”; opłaty i prowizje – wydatek bez kategorii w temacie
  „Opłaty banku”, prowizja nie bierze decyzji ze słowa „kebab”; zwrot – ujemny wydatek w kategorii zakupów sklepu
  (zielony „+”); „PŁATNOŚĆ WEB” i „SPRZEDAŻ WALUTY” jako rodzaj operacji (nie część nazwy); tytuł z podwójną spacją cały
  w tytule; mTransfer – kontrahentem firma (np. PayU).
- **Nie przechodzi, gdy:**
  - zwrot towaru jako przychód;
  - część tytułu w nazwie kontrahenta (B103).

#### IM.20 XTB – wypłaty i dopłaty (D54–D59, T37, T167, 1.6.3, B106)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z folderem ICTTJ; `L1` z wpływem od „XTB SPÓŁKA AKCYJNA
  … Withdrawal”, przelewem do XTB, BLIK „xtb.com”, przelewem własnym „na portfel XTB”, wpłatą domownika „zwrot za kurs
  XTB”
- **Jak sprawdzić:** wczytaj `L1`; odczytaj rozpoznanie; spróbuj „zapamiętaj” przy XTB; zaimportuj; Mostek → Dokowanie;
  Ustawienia → Reguły importu.
- **Oczekiwany efekt:** wpływ – „XTB – wypłata z konta tradingowego” (czeka na dokowanie), wypływ – „XTB – dopłata do
  konta tradingowego”; „XTB” w tytule przelewu własnego albo wpłaty domownika nie robi z nich tradingu; XTB nigdy nie
  zostaje regułą; bez kategorii „Trading”.
- **Nie przechodzi, gdy:**
  - wypłata XTB wchodzi jako zwykły wpływ albo podpowiedź mBanku;
  - wpłata domownika z „XTB” w tytule jako trading (B106);
  - reguła XTB w Ustawieniach.

#### IM.21 Przelew własny na konto budżetu – jedna operacja (1.7.0, F10, D87, T263, N-PC-15)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1` z dwoma przelewami własnymi wychodzącymi (500 zł
  na Portfel XTB, 300 zł na konto spoza budżetu)
- **Jak sprawdzić:** przy pierwszym wybierz „Przelew własny → Portfel XTB” (albo w wierszu „→ Portfel XTB
  (dwustronny)”), drugi zostaw „Przelew własny – konto spoza budżetu”; zaimportuj; odczytaj salda kont i osłony; otwórz
  przelew.
- **Oczekiwany efekt:** przelew na Portfel XTB – jedna operacja („Jedna operacja dla obu kont…”), Portfel +500, osłony
  bez zmian; przelew poza budżet – tylko strona mBanku; dymek wyboru konta mówi, że przelew dwustronny nie rusza osłon.
- **Nie przechodzi, gdy:**
  - przelew na Portfel XTB zmniejsza osłony albo nie zmienia salda Portfela;
  - powstają dwie operacje.
- **Odczyt liczb:** salda mBanku i Portfela XTB, osłony – przed i po.

#### IM.22 Plik drugiego konta dołącza drugą stronę przelewu (1.7.0, F10, T263)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z drugim kontem mBank („mBank oszczędności”, import z
  mBanku) i przelewem mBank → oszczędności w jednej operacji; `K2` z jego wierszem dzień później i innym opisem
- **Jak sprawdzić:** wczytaj `K2`, „Konto w budżecie” – mBank oszczędności; odczytaj „Druga strona przelewu między
  kontami (1)” i podgląd; zaimportuj; otwórz przelew. Powtórz z odznaczoną stroną na kopii folderu.
- **Oczekiwany efekt:** strona zaznaczona, „mBank → mBank oszczędności dd.mm.rrrr ⟷ bank dd.mm.rrrr: …”; podgląd „druga
  strona przelewu między kontami: 1”; po imporcie nadal jedna operacja z „druga strona z banku (dd.mm)”, wynik „drugie
  strony przelewów: 1”; odznaczona – „osobno – wejdzie jako: … (przelew policzony dwa razy)”.
- **Nie przechodzi, gdy:**
  - wiersz drugiego konta tworzy drugą operację mimo zaznaczenia;
  - druga strona liczona w dniu pierwszej (saldo oszczędności na dzień przelewu).
- **Odczyt liczb:** saldo konta oszczędności na dzień przelewu i dzień później.

#### IM.23 Wpłaty domowników (spec „Rozliczenia z domownikami”, D80 b, D81, D91, 1.3.0, 1.4.2, 1.12.0, 1.15.3, B4)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: Mama (nazwa w banku „ANNA TESTOWA”, ma oddać 120 zł za
  zakupy 50 i 70 zł), Tata („pytaj”), Babcia (przekazuje przez Tatę); `L1` z wpłatami Mamy 70 zł i 300 zł, Taty 200 zł
- **Jak sprawdzić:** wczytaj `L1`; odczytaj tematy domowników, plakietki i „Cel wpłaty domownika”; odpowiedz Tacie
  „zaliczka”; zaimportuj; Mostek i Radar – salda osób; edytor wpłat Mamy („Za co oddaje”); Ustawienia → Domownicy.
- **Oczekiwany efekt:** każda osoba ma własny temat („od domownika: Mama – …”); wpłata 70 zł spłaca zakup 70 zł (pewne
  dopasowanie), 300 zł najpierw wyrównuje resztę do oddania (50 zł), reszta według ustawienia osoby; Tata w „Do decyzji”
  z „zaliczka czy przychód?”, odpowiedź zapamiętana dla Taty dopiero po wyborze; wpłaty domowników nie są „Przychody”
  (poza wybranym „przychód”); jedna nazwa wyboru celu wpłaty w imporcie, edytorze i regule tytułu.
- **Nie przechodzi, gdy:**
  - decyzja Taty przypisuje pieniądze Mamie (B4);
  - spłata nie zmniejsza „ma oddać” (Mostek, Radar);
  - ten sam wybór nazwany różnie („spłata” / „spłata zakupów”, „zaliczka” / „depozyt na przyszłość” / „zaliczka na
    przyszłość”) – UWAGA, spójność.
- **Odczyt liczb:** salda Mamy i Taty, depozyt domowników, „Przychody” bieżącego miesiąca.

#### IM.24 Nowa osoba – „+ domownik” (spec, D80 a, 1.3.0, 1.6.3, N85)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `L1` z przelewem przychodzącym od „JAN NOWAK” (spoza
  domowników), zwrotem kartą i przelewem wychodzącym do tej osoby
- **Jak sprawdzić:** odczytaj grupy; kliknij „+ domownik” przy przelewie przychodzącym; odczytaj grupę; Ustawienia →
  Domownicy.
- **Oczekiwany efekt:** „+ domownik” tylko przy przychodzącym przelewie od osoby spoza listy (dymek „Dopisz nadawcę do
  domowników…”); po kliknięciu osoba z nazwą w banku w Ustawieniach, grupa to jej pieniądze, temat „Do decyzji” z
  „zaliczka czy przychód?”; nic nie zapisane osobie na stałe przed odpowiedzią.
- **Nie przechodzi, gdy:**
  - „+ domownik” przy zwrocie kartą albo przelewie wychodzącym;
  - osobie zapisane „reszta jako przychód” bez pytania (N85).

#### IM.25 Wpłata za kilka osób i wspólny zakup w imporcie (D81, D83, 1.4.0, 1.5.0, N-PC-10)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (Babcia ma oddać 100 zł); `L1` z przelewem Taty 300 zł
  i zakupami w sklepie, który finansujemy wspólnie
- **Jak sprawdzić:** przy wpłacie Taty „w tym za…” → Babcia 100 zł; dla grupy sklepu „Wspólnie – kilka osób płaci”
  procentami 60 + 30, „Importuj”; potem 60 + 40 z „zapamiętaj”; zaimportuj; wczytaj `L2` z kolejnym zakupem tam.
- **Oczekiwany efekt:** część Babci spłaca jej zakupy, reszta zostaje Tacie; procenty ≠ 100 % blokują import komunikatem
  „Wspólny zakup: procenty osób muszą dać razem 100 % – popraw podział i importuj jeszcze raz.”; reguła dzieli kolejny
  zakup tej marki sama.
- **Nie przechodzi, gdy:**
  - import z procentami 90 % zapisuje się;
  - część Babci liczona jako wpłata Taty.
- **Odczyt liczb:** salda Taty i Babci.

#### IM.26 Zwrot pożyczki i PIT-38 – zawsze przy operacji (1.5.1, T166, T167, B34, N14)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z pożyczką udzieloną „Adam” (nazwa w banku „ADAM
  TESTOWY”); `L1` z wpływem od niego i przelewem do urzędu skarbowego; `L2` z kolejnym wpływem od niego
- **Jak sprawdzić:** odczytaj propozycję przy wpływie Adama; dla przelewu do urzędu wybierz „Podatek PIT-38” z
  „zapamiętaj”; zaimportuj; Radar → pożyczki; wczytaj `L2`.
- **Oczekiwany efekt:** „zwrot pożyczki: Adam” w „Rozpoznane – sprawdź”, w decyzjach „Zwrot pożyczki – Adam (Radar)”; po
  imporcie pożyczka pomniejszona; pożyczka i PIT-38 nie tworzą reguły – w `L2` znowu propozycja do sprawdzenia.
- **Nie przechodzi, gdy:**
  - zwrot pożyczki jako przychód;
  - reguła „Podatek PIT-38” albo „Pożyczka” w Ustawieniach (N14).
- **Odczyt liczb:** pozostało do spłaty pożyczki przed i po.

#### IM.27 Reguły uczą się z decyzji (spec „Import” 3, D75, T38, T89, 1.2.1, 1.5.1, 1.6.3, B37, N86)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z regułą na kategorię zarchiwizowaną; `L1`, `L2`
- **Jak sprawdzić:** w `L1` zdecyduj temat z „zapamiętaj”, „Przyjmij pewne (N)”, jedną grupę zostaw bez kategorii;
  zaimportuj; Ustawienia → „Reguły importu”; wczytaj `L2`.
- **Oczekiwany efekt:** wynik „nowe reguły: N”; reguły w Ustawieniach z liczbą „N op.”; w `L2` te marki w „Gotowe” z
  plakietką „reguła”; reguła na kategorię zarchiwizowaną nie nadaje jej – grupa czeka („kategoria reguły zarchiwizowana
  – wybierz nową”), w Ustawieniach „(zarchiwizowana)”; wydatek bez kategorii nie uczy reguły.
- **Nie przechodzi, gdy:**
  - marki zdecydowane w `L1` znowu „Do decyzji”;
  - grupa z regułą na zarchiwizowaną kategorię w „Gotowe” (N86).

#### IM.28 Kopia przed importem (spec „Import” 5, D31, T42, T167)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1`; 11 importów pod rząd (pliki dzienne)
- **Jak sprawdzić:** zaimportuj `L1`; odczytaj „kopia przed importem: <ścieżka>” w panelu „Import zakończony”; otwórz
  ZIP i porównaj liczbę operacji z folderem sprzed importu. Zrób 11 importów; policz kopie. Zaimportuj plik bez nic
  nowego.
- **Oczekiwany efekt:** ZIP w `backups/pre-import` (albo w ustawionym folderze kopii) ze stanem sprzed importu; zostaje
  10 najnowszych kopii przed importem; „Zapisz import (bez zmian)” nie robi kopii; kopia nie trafia do folderu ICTTJ.
- **Nie przechodzi, gdy:**
  - kopia powstaje po zapisie operacji (zawiera import);
  - brak kopii albo ścieżka w panelu nie istnieje.

#### IM.29 Wynik importu i zgodność liczników (0.3.0, 1.6.3, 1.6.6, N77)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1` z tematami bez decyzji
- **Jak sprawdzić:** zapisz liczniki podglądu; „Importuj (N)”; odczytaj toast, panel „Import zakończony”, nagłówek
  „ostatni import”, odprawę, Meldunki „Bez kategorii”; „Zobacz w Operacjach”.
- **Oczekiwany efekt:** toast „Zaimportowano: N nowych operacji; połączone z wpisami: M, rozliczone: K.” (odmiana „1
  nowa operacja”); panel „Nowe: N · połączone z wpisami: M · rozliczone: K · usunięte: 0” + dopiski (drugie strony,
  pominięte, przeniesione, nowe reguły); liczby = podgląd; tematy bez decyzji weszły jako wydatki / wpływy bez
  kategorii, meldunek „Bez kategorii” urósł o ich liczbę; „ostatni import” i odprawa zaktualizowane; saldo mBanku =
  saldo z pliku (gdy znane).
- **Nie przechodzi, gdy:**
  - liczniki wyniku ≠ podgląd;
  - operacja z tematu bez decyzji pominięta albo z kategorią z podpowiedzi mBanku.
- **Odczyt liczb:** liczniki podglądu i wyniku, saldo mBanku po imporcie.

#### IM.30 „Cofnij import” – okno, skutek, ponowny import (1.5.1, F4, T168, T39)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1` z nowymi, połączonymi i rozliczanymi wierszami
- **Jak sprawdzić:** zaimportuj `L1`; zmień kategorię jednej nowej operacji; w panelu wyniku „Cofnij import”; odczytaj
  okno; „Cofnij import”; odczytaj toast i saldo; „Cofnij” w toaście; jeszcze raz „Cofnij import”; wczytaj `L1` ponownie.
- **Oczekiwany efekt:** okno „Cofnij import” z plikiem i okresem: „usunie operacje, które utworzył: N – w tym zmienione
  później przez Ciebie: 1 (te zmiany też znikną)”, „cofnie zmiany we wpisach, które połączył z bankiem albo rozliczył: M
  (Twoje późniejsze zmiany zostają)”, „cofnie reguły…: R”, „Kolejny import tego pliku wczyta te operacje od nowa.”;
  toast „Import cofnięty: usunięte operacje: N, …” z „Cofnij” (wtedy „Import znowu w budżecie.”); saldo jak przed
  importem; operacje w „Usunięte wpisy” z powodem „usunięty przy cofnięciu importu”; ponowne wczytanie `L1` – wiersze
  znowu nowe.
- **Nie przechodzi, gdy:**
  - ponowny import traktuje cofnięte operacje jako „usunięte przez Ciebie”;
  - saldo po cofnięciu ≠ saldo przed importem.
- **Odczyt liczb:** saldo mBanku i liczba operacji: przed importem, po, po cofnięciu, po „Cofnij” cofnięcia.

#### IM.31 „Cofnij import” – wpisy połączone, reguły, potwierdzenie, kolejność (1.5.1, F4, T168, T169)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `H1` (łączy wpis ręczny, rozlicza nierozliczoną, uczy
  reguły, potwierdza saldo), potem `L2`
- **Jak sprawdzić:** zaimportuj `H1`; dopisz notatkę do połączonego wpisu; zmień jedną nauczoną regułę; zaimportuj `L2`.
  Spróbuj cofnąć import `H1` (Ustawienia → Import z banku → „Ostatnie importy”); cofnij `L2`, potem `H1`.
- **Oczekiwany efekt:** „Ostatnie importy” – 10 najnowszych, przy starszym „—” z dymkiem „Importy cofa się od
  ostatniego”; po cofnięciu `H1`: połączony wpis znowu ręczny (jego data i kwota) z dopisaną notatką, nierozliczona
  wraca, nowa reguła usunięta, zmieniona zostaje („reguły zmienione albo usunięte po imporcie zostają, jak są: 1”),
  potwierdzenie salda z pliku usunięte (Ustawienia → Konta), przy pozycji „cofnięty dd.mm”.
- **Nie przechodzi, gdy:**
  - da się cofnąć starszy import przed nowszym;
  - cofnięcie kasuje notatkę dopisaną po imporcie albo zostawia potwierdzenie salda.

#### IM.32 „Cofnij import” przed synchronizacją drugiego komputera (1.5.1, T168)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `dwa-komputery`: B zaimportował `L1`, na A dotarł rekord
  importu, a część operacji jeszcze nie
- **Jak sprawdzić:** na A „Cofnij import”; odczytaj komunikat; „Cofnij mimo to”.
- **Oczekiwany efekt:** „N operacje tego importu nie ma na tym komputerze i nigdy tu nie były – pewnie jeszcze się
  synchronizują (OneDrive)…” z „Cofnij mimo to”; bez potwierdzenia nic nie znika; po „mimo to” cofnięte, co jest.
- **Nie przechodzi, gdy:**
  - cofnięcie idzie bez ostrzeżenia, a operacje dochodzące później zostają jako sieroty.

#### IM.33 Saldo z pliku zgodne – potwierdzenie samo (1.5.1, F5, D84 C11, T169)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (mBank z saldem otwarcia); `H1` z łańcuchem sald
  zgodnym z FI; `L1` (bez sald)
- **Jak sprawdzić:** zaimportuj `H1`; odczytaj panel „Telemetria z banku”; Ustawienia → Konta; Meldunki; Dowództwo –
  misja „Inwentaryzacja”. Zaimportuj `L1`.
- **Oczekiwany efekt:** „mBank: saldo w banku na koniec dd.mm – X zł, w FI – X zł.” i „Kadłub zgodny z odczytem banku.”;
  potwierdzenie zapisane samo z datą ostatniego dnia pliku („ostatnio potwierdzone dd.mm.rrrr (X zł)”), bez korekty;
  meldunek salda mBanku znika; potwierdzenie liczy się do misji; po `L1` – bez telemetrii.
- **Nie przechodzi, gdy:**
  - saldo FI liczone na inny dzień niż bank (data operacji a księgowania);
  - potwierdzenie z datą importu zamiast ostatniego dnia pliku.
- **Odczyt liczb:** saldo banku i FI z panelu.

#### IM.34 Saldo z pliku niezgodne – dzień rozbieżności (1.5.1, F5, T169)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `H2` (wiersz usunięty wcześniej w FI, wpis ręczny bez
  wiersza, kwota inna o 1,00 zł), `H3` (luka w łańcuchu), konto z saldem otwarcia późniejszym niż koniec pliku
- **Jak sprawdzić:** zaimportuj `H2`; odczytaj panel; kliknij pozycję listy; zaimportuj `H3`; plik na konto z późnym
  saldem otwarcia.
- **Oczekiwany efekt:** „Różnica ±X zł (FI − bank) – od dd.mm.rrrr.”; grupy „W banku, a nie w FI (pominięte, usunięte,
  na innym koncie)”, „W FI, a nie w banku (wpisane ręcznie, podwójne, jeszcze niezaksięgowane, korekty)”, „Inna kwota w
  FI niż w banku”, „Luki w saldach pliku (lista przefiltrowana albo niepełna)”; suma grup = różnica; klik – operacja w
  Operacjach; nic nie zapisuje się samo; „Potwierdź z korektą ±X zł” z notką „Korekta to ostatnia opcja – najpierw
  sprawdź operacje wyżej.”; późne saldo otwarcia – notka „…potwierdzenie z pliku nie ma czego porównać.”
- **Nie przechodzi, gdy:**
  - korekta tworzy się sama;
  - pierwszy dzień rozbieżności inny niż dzień najwcześniejszej przyczyny.
- **Odczyt liczb:** różnica i kwoty każdej grupy.

#### IM.35 Nowy plik z mBanku w Pobranych (1.9.0, F14, T287)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; w udawanych Pobranych: `L2` (nowy), `Z`, `X`, plik
  mBanku sprzed 15 dni (data pliku), plik już zaimportowany; obserwacja włączona, potem wyłączona
- **Jak sprawdzić:** połóż pliki przy działającej aplikacji; odczytaj ekran Import („Nowe pliki z mBanku”), odprawę i
  zapis powiadomień; „Importuj”; „Przyjmij pewne”; „Importuj (N)”. Wyłącz Ustawienia → Import z banku → „Szukaj nowych
  plików z mBanku w folderze Pobrane (na tym komputerze)” i połóż kolejny plik.
- **Oczekiwany efekt:** w ciągu minuty: „<nazwa> dd.mm–dd.mm · N operacji · <folder>” z „Importuj”, odprawa „Nowy
  meldunek z mBanku (dd.mm–dd.mm): <nazwa> w folderze Pobrane – importuj.”, jeden zapis powiadomienia; „Importuj”
  otwiera plik (ten sam podgląd co wybór); po imporcie plik znika z listy; `Z`, `X`, stary i zaimportowany – nie
  zgłaszane; po wyłączeniu – nic; od pojawienia się rozpoznanego pliku do zapisu najwyżej 3 kliknięcia.
- **Nie przechodzi, gdy:**
  - zgłoszony plik innego banku albo zwykły CSV;
  - zaimportowany plik dalej „nowy”.

#### IM.36 „Przenieś plik do Kosza” (1.9.0, F14, T287, T290)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`; `L2` zaimportowany z Pobranych (plik syntetyczny – Kosz
  Windows komputera laboratorium)
- **Jak sprawdzić:** po imporcie odczytaj notkę; „Przenieś plik do Kosza”; sprawdź folder Pobrane. Powtórz, gdy plik
  usunięto wcześniej ręcznie.
- **Oczekiwany efekt:** „Plik „<nazwa>” zawiera numer konta i operacje – po imporcie nie jest potrzebny.”; toast
  „„<nazwa>” przeniesiony do Kosza.”, pliku nie ma w Pobranych; usunięty wcześniej – „Nie ma już pliku „…” – nic nie
  przeniesiono.”; inne pliki nietknięte.
- **Nie przechodzi, gdy:**
  - plik usunięty na stałe (nie w Koszu) albo przeniesiony inny plik.

#### IM.37 Powiadomienie „Nowy meldunek z mBanku” (1.9.0, F14, T287)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`; aplikacja w zasobniku; plik `L2` skopiowany do
  Pobranych
- **Jak sprawdzić:** skopiuj plik do Pobranych; poczekaj na powiadomienie Windows; kliknij je; uruchom ponownie
  aplikację.
- **Oczekiwany efekt:** jedno powiadomienie z okresem i nazwą pliku; kliknięcie otwiera Import z wczytanym plikiem; po
  ponownym uruchomieniu powiadomienie się nie powtarza.
- **Nie przechodzi, gdy:**
  - brak powiadomienia przy aplikacji w zasobniku;
  - powiadomienie co minutę albo po każdym uruchomieniu.

#### IM.38 Plik z innego rachunku (1.5.1, F4, T168)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z zapamiętanymi numerami: mBank …1234, mBank
  oszczędności …5555; `R` z numerem …9876; plik z numerem …5555
- **Jak sprawdzić:** wczytaj `R` na mBank; potem plik …5555 na mBank; zmień „Konto w budżecie”; zaimportuj `R`.
- **Oczekiwany efekt:** przed importem: „Plik jest z rachunku …9876, a na konto „mBank” trafiały dotąd pliki z rachunku
  …1234 – sprawdź wybrane konto. Nowy rachunek w banku? Import go zapamięta.”; dla …5555: „Pliki z tego rachunku (…5555)
  trafiały dotąd na konto „mBank oszczędności” – sprawdź, czy wybrane konto się zgadza.”; zmiana konta gasi ostrzeżenie;
  import możliwy, numer zapamiętany.
- **Nie przechodzi, gdy:**
  - brak ostrzeżenia przed importem;
  - ostrzeżenie pokazuje pełny numer rachunku (tylko cztery ostatnie cyfry).

#### IM.39 Plik zaimportowany najpierw na złe konto (1.5.1, T166, B35)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1` zaimportowany na Portfel XTB
- **Jak sprawdzić:** wczytaj `L1` na mBank; odczytaj „Już w budżecie na innym koncie (N)”, podgląd; odznacz jedną;
  zaimportuj; odczytaj salda obu kont.
- **Oczekiwany efekt:** sekcja z notką, operacje zaznaczone, „· teraz na: Portfel XTB”; podgląd „przeniesione z innego
  konta: N−1”; po imporcie przeniesione na mBank z kategorią i notatkami, bez duplikatów; odznaczona zostaje na Portfelu
  XTB.
- **Nie przechodzi, gdy:**
  - operacje wchodzą drugi raz na mBank;
  - przeniesienie gubi kategorię albo notatkę.
- **Odczyt liczb:** salda mBanku i Portfela XTB przed i po.

#### IM.40 Powtórny import i nakładające się okresy (spec „Import”, T35, T167, N13)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z ostatnim importem 4 dni przed D0; `L1` z dwoma
  identycznymi wierszami jednego dnia (ten sam sklep i kwota); `L2`
- **Jak sprawdzić:** zaimportuj `L1`; wczytaj `L1` ponownie; „Zapisz import (bez zmian)”; wczytaj `L2`, zaimportuj;
  wczytaj `L1` trzeci raz.
- **Oczekiwany efekt:** ponownie: „Wszystkie operacje z tego pliku są już w budżecie – ten plik (albo okres) był już
  zaimportowany.”, przycisk „Zapisz import (bez zmian)” z dymkiem; zapis aktualizuje „ostatni import” (odprawa bez
  zaległego importu), bez kopii i bez nowych operacji; `L2` – nowe tylko dni spoza `L1`; dwa identyczne wiersze = dwie
  operacje po każdym imporcie.
- **Nie przechodzi, gdy:**
  - ponowny import tworzy duplikaty;
  - dwa identyczne zakupy jednego dnia sklejone w jeden albo podwojone do czterech.
- **Odczyt liczb:** liczba operacji i saldo mBanku po każdym kroku.

#### IM.41 Ta sama operacja z listy operacji i historii rachunku (1.4.2, B5, T134)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1` zaimportowana; `HL` (ten sam okres, inny opis)
- **Jak sprawdzić:** wczytaj `HL`; odczytaj podgląd; zaimportuj; panel „Duplikaty operacji”.
- **Oczekiwany efekt:** wiersze już wczytane z listy – „już zaimportowane (bez zmian)” z dopiskiem „w tym z listy
  operacji: N”; żadna operacja dwa razy; saldo bez zmian.
- **Nie przechodzi, gdy:**
  - operacje z `HL` wchodzą drugi raz (B5).
- **Odczyt liczb:** saldo mBanku przed i po.

#### IM.42 Operacja usunięta przez Ciebie nie wraca (T39, T234, 1.6.3, B96)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z usuniętą operacją z banku z okresu `L1` i usuniętą
  nierozliczoną, którą `L2` rozlicza inną kwotą (+8 %); `L1`, `L2`
- **Jak sprawdzić:** wczytaj `L1`; odczytaj podgląd i „Usunięte przez Ciebie wcześniej (1)”; zaimportuj; wczytaj `L2`;
  zaznacz usuniętą („importuj mimo to”) i zaimportuj.
- **Oczekiwany efekt:** usunięte – „usunięte przez Ciebie wcześniej (pominięte): 1”, sekcja z notką „…nie wracają same.
  Zaznacz, żeby zaimportować mimo to.”; wynik „pominięte (usunięte wcześniej): 1”; rozliczona usunięta nierozliczona też
  pominięta; zaznaczona wchodzi z grupą i tematem jak nowa; operacje cofniętego importu nie są „usunięte przez Ciebie”.
- **Nie przechodzi, gdy:**
  - usunięta operacja wraca bez zaznaczenia;
  - rozliczenie usuniętej nierozliczonej wchodzi samo (B96).

#### IM.43 Sesja importu: zamknięcie, inny plik, inny ekran, inne konto (1.5.1, N12, T42, T167, konwencja)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `L1`, `L2`
- **Jak sprawdzić:** w `L1` podejmij decyzje tematów i jednej operacji; przejdź do Operacji i wróć; zmień „Konto w
  budżecie” i z powrotem; „Zamknij plik” → „Cofnij”; wczytaj `L2` → „Cofnij”.
- **Oczekiwany efekt:** zmiana ekranu nie gubi pliku ani decyzji; zmiana konta zachowuje decyzje tematów i grup;
  „Zamknięto „L1” bez importu.” z „Cofnij” przywracającym decyzje; „Otwarto „L2” – decyzje pliku „L1” nie zostały
  zaimportowane.” z „Cofnij”.
- **Nie przechodzi, gdy:**
  - przejście na inny ekran zamyka plik albo kasuje decyzje;
  - zamknięcie pliku z decyzjami bez „Cofnij”.

#### IM.44 Zapis importu: blokada ekranu, plan od nowa, folder tylko do odczytu (1.6.3, B38, B93, B95, T166, T235)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `L1`; `dwa-komputery`; folder tylko do odczytu
- **Jak sprawdzić:** przy otwartym `L1` dodaj w Ustawieniach domownika z nazwą nadawcy z pliku i słowo kluczowe – wróć;
  na drugim komputerze zmień operację z okresu pliku tuż przed „Importuj”; w trakcie zapisu kliknij decyzje i „Zamknij
  plik”; otwórz `L1` w folderze tylko do odczytu.
- **Oczekiwany efekt:** podgląd liczony od nowa po zmianach w Ustawieniach, decyzje tematów zostają; zmiana z drugiego
  komputera – „Operacje albo reguły zmieniły się w trakcie (Operacje, Ustawienia, drugi komputer) – sprawdź podgląd i
  kliknij „Importuj” jeszcze raz.”; w trakcie zapisu „Importuję…”, pola wyłączone; tylko do odczytu – przycisk „Folder
  tylko do odczytu”, nic nie zapisane.
- **Nie przechodzi, gdy:**
  - import zapisuje nieaktualny plan;
  - decyzja kliknięta w trakcie zapisu przepada bez śladu albo zmienia zapisany import (B93).

#### IM.45 Audyt reguł importu (1.5.1, F22, T171, 1.10.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z ok. 150 regułami (w tym bez trafień i niespójnymi);
  `L2` z operacją „Netia”
- **Jak sprawdzić:** Ustawienia → Import z banku → „Reguły importu”: odczytaj „sprawdzam reguły… N%”, liczby „N op.”,
  przyciski „wszystkie”, „niespójne (N)”, „bez trafień (N)”; wyszukaj „orlen”; „zmień” regułę Netii: kierunek,
  kategoria, „Tagi operacji” „#ulga-internet”, „Zapisz”, potem „Cofnij” i ponownie „Zapisz”; wczytaj i zaimportuj `L2`.
- **Oczekiwany efekt:** liczba „N op.” = operacje z banku, które reguła łapie dziś; „bez trafień” bez pożyczek, PIT-38 i
  XTB; lista po 100 z „pokaż kolejne”; toast „Reguła „…” zmieniona.” z „Cofnij”; notka „Zmieniona reguła działa przy
  kolejnych importach; operacje z historii zmienia „Zastosuj do historii”.”; operacja Netii z `L2` ma tag
  „#ulga-internet” (gdy decyzja jest decyzją reguły).
- **Nie przechodzi, gdy:**
  - liczba trafień reguły ≠ liczba operacji marki z banku;
  - zmiana reguły przerabia historię bez „Zastosuj do historii”.

#### IM.46 „Zastosuj do historii” (1.5.1, F22, T171)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z regułą marki i 5 operacjami tej marki w innej
  kategorii (jedna z ręcznym podziałem paragonu)
- **Jak sprawdzić:** „N inaczej” przy regule; odczytaj listę „kategoria → kategoria”; zmień jedną z tych operacji
  ręcznie w Operacjach; „Zastosuj do historii (N)”; „Cofnij”.
- **Oczekiwany efekt:** lista „Operacje tej marki z inną kategorią albo innym finansującym niż reguła:”; paragon z
  ręcznym podziałem pominięty; zmieniona w międzyczasie – „Te operacje zmieniły się od sprawdzenia – lista liczy się od
  nowa.”; po zastosowaniu toast „Reguła „…” zastosowana do historii: N operacji.” z „Cofnij”, koperty przeliczone;
  „Cofnij” przywraca tylko operacje, które są wciąż takie, jak je zostawiło.
- **Nie przechodzi, gdy:**
  - zastosowanie nadpisuje ręczną zmianę z międzyczasu;
  - „Cofnij” przywraca też operacje zmienione później.
- **Odczyt liczb:** koperty dotkniętych kategorii przed i po.

#### IM.47 Reguła z progiem kwoty (1.5.1, F22, T171)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z Orlenem: zakupy 8,50–39,90 zł w „kawa i przekąski”,
  120–250 zł w „paliwo”; `L2` z Orlenem 40,00 zł, 35,00 zł i 150,00 zł
- **Jak sprawdzić:** panel „Marki z kilkoma kategoriami”; „Reguła: do 40,00 zł → …”; „Cofnij”; ponownie; „zmień” – próg
  pusty; zaimportuj `L2`.
- **Oczekiwany efekt:** „Orlen: … 12× (8,50–39,90 zł) · … (120,00–250,00 zł)”; toast „Nowa reguła: Orlen do 40 zł.” z
  „Cofnij”; reguła z dopiskiem „do 40,00 zł”; „Zapisz” nieaktywne bez progu; w `L2` 35,00 – kawa, 150,00 – paliwo, 40,00
  – kawa (granica „do” włącznie – brak wymagania, do potwierdzenia).
- **Nie przechodzi, gdy:**
  - Orlen 150 zł dostaje kategorię z progu;
  - próg proponowany, gdy kwoty kategorii zachodzą na siebie.

#### IM.48 Usunięcie reguły i słowa kluczowego (konwencja „Usunięcia… mają „Cofnij””, brak wymagania szczegółowego)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** „usuń” przy regule w „Reguły importu” i przy słowie w „Słowa kluczowe”; odczytaj, co się dzieje;
  wczytaj plik z tą marką.
- **Oczekiwany efekt:** usunięcie z „Cofnij” w toaście (jak każde inne usunięcie w aplikacji) albo z potwierdzeniem; po
  usunięciu marka wraca do „Do decyzji” albo do sieci ze słownika.
- **Nie przechodzi, gdy:**
  - jedno kliknięcie usuwa regułę nauczoną przez miesiące bez potwierdzenia i bez „Cofnij”.

#### IM.49 Panel „Duplikaty operacji” – scalanie (D77, 1.2.1, 1.6.3, T93, T94, T233, B100, N81, N88)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z grupami: wpis ręczny + kopia z banku (pewna), para z
  inną decyzją w kopii, para „możliwy duplikat” (jedno wspólne słowo, inna kwota), kopia pokryta wpłatą domownika, para
  z operacją zadokowaną, para z wpisem nowszej wersji
- **Jak sprawdzić:** Import bez pliku – „Duplikaty operacji”; odczytaj plakietki i zaznaczenia; „Scal zaznaczone (N)”;
  otwórz zachowane operacje; „Cofnij”.
- **Oczekiwany efekt:** plakietki „wpis ręczny + bank”, „ten sam wiersz banku”, „lista operacji + historia rachunku”;
  daty dd.mm.rrrr, polskie nazwy rodzajów; inna decyzja i „możliwy duplikat – zaznacz, jeśli to ta sama operacja” –
  niezaznaczone; nowsza wersja – zablokowana z wyjaśnieniem; po scaleniu toast „Scalono duplikaty: usunięto N kopii.” z
  „Cofnij”; zostaje operacja z danymi banku i Twoją kategorią, notatką, godziną, wpłata domownika wskazuje zachowaną,
  zadokowana zostaje zadokowana; saldo spada o kwoty kopii; „Cofnij” przywraca wszystko.
- **Nie przechodzi, gdy:**
  - scalenie gubi kategorię albo notatkę użytkownika;
  - wpłata domownika wskazuje usuniętą kopię (B100);
  - „income”, „transfer” zamiast polskich nazw (N81).
- **Odczyt liczb:** saldo konta przed scaleniem, po i po „Cofnij”.

#### IM.50 „to nie duplikat” i „pokazuj znowu” (1.6.3, N74, T94, T235)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`; `dwa-komputery`
- **Jak sprawdzić:** przy parze „to nie duplikat”; „Cofnij”; ponownie; uruchom ponownie i otwórz drugi komputer;
  Ustawienia → Import z banku → „Pary oznaczone „to nie duplikat”: N” → „pokazuj znowu”.
- **Oczekiwany efekt:** toast „Para oznaczona „to nie duplikat” – nie będzie pokazywana.” z „Cofnij”; para nie wraca po
  restarcie ani na drugim komputerze; meldunek duplikatów maleje; „pokazuj znowu” – toast „Pary „to nie duplikat” będą
  znowu pokazywane.” z „Cofnij”.
- **Nie przechodzi, gdy:**
  - para wraca po restarcie;
  - „to nie duplikat” nieodwracalne (N74).

#### IM.51 Ten sam wiersz banku z dwóch komputerów (D77, T93)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `dwa-komputery`: A i B importują `L1` przed synchronizacją;
  na A po imporcie dopisana notatka i dokowanie wypłaty XTB
- **Jak sprawdzić:** zsynchronizuj (po kolei na jednym folderze); odczytaj saldo mBanku, meldunek duplikatów i panel;
  scal.
- **Oczekiwany efekt:** przed scaleniem meldunek „N możliwych duplikatów”; grupy „ten sam wiersz banku”; zostaje
  zadokowana, potem ta z danymi użytkownika (notatka), potem nowsza; po scaleniu jedna operacja na wiersz, saldo jak po
  jednym imporcie.
- **Nie przechodzi, gdy:**
  - zostaje kopia bez notatki albo bez dokowania;
  - podwójny import niewidoczny w Meldunkach.
- **Odczyt liczb:** saldo mBanku po synchronizacji i po scaleniu.

#### IM.52 Zaległy import w odprawie (spec „Powiadomienia” – po 3 dniach, F14, T287)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`: ostatni import mBanku 4 dni przed D0; wariant 3 dni
  przed D0; Portfel XTB bez importu
- **Jak sprawdzić:** odczytaj odprawę na Mostku w obu wariantach; zaimportuj plik bez nic nowego („Zapisz import (bez
  zmian)”); odczytaj odprawę.
- **Oczekiwany efekt:** 4 dni – „mBank: ostatni import 4 dni temu – zaimportuj nowy plik (w mBanku: Historia → lista
  operacji → „Eksportuj” CSV).”; 3 dni – bez pozycji; po zapisie – pozycja znika; Portfel XTB (bez eksportu) bez
  przypomnienia.
- **Nie przechodzi, gdy:**
  - przypomnienie dla Portfela XTB;
  - przypomnienie zostaje po imporcie pliku bez nowych operacji (N13).

#### IM.53 Powiadomienie o zaległym imporcie (spec „Powiadomienia”, 1.0.0, 1.9.0)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** `rok` z importem z dnia startu maszyny
- **Jak sprawdzić:** przesuwaj zegar dzień po dniu (aplikacja w zasobniku); po 4. dniu odczytaj powiadomienie;
  zaimportuj; następny dzień. Wyłącz przełącznik w Ustawienia → Powiadomienia i dźwięki.
- **Oczekiwany efekt:** powiadomienie dopiero po 3 dniach bez importu, raz dziennie, z instrukcją pobrania pliku; po
  imporcie – brak; wyłączone – brak.
- **Nie przechodzi, gdy:**
  - powiadomienie 3. dnia albo kilka razy dziennie;
  - po imporcie dalej przychodzi.

#### IM.54 Data operacji, granice miesiąca i roku, zmiana czasu (spec „Dane i synchronizacja” – „Zasady”)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; `H1` z operacją 31.12 zaksięgowaną 02.01, operacjami
  z pierwszego i ostatniego dnia miesiąca i z dnia zmiany czasu
- **Jak sprawdzić:** zaimportuj; w Operacjach odczytaj daty, godziny i miesiąc tych operacji; Plan miesiąca – koperty
  grudnia i stycznia; Wywiad → Killzones.
- **Oczekiwany efekt:** data = „#Data operacji” (nie księgowania); bez godziny (puste pole, w dniu po wpisach z
  godziną); operacja w miesiącu swojej daty; import nie tworzy zakupów nocą ani wpisów w mapie godzin.
- **Nie przechodzi, gdy:**
  - operacja 31.12 w styczniu albo przesunięta o dzień przez UTC;
  - import nadaje godzinę 00:00 (noc, Killzones).
- **Odczyt liczb:** koperty grudnia i stycznia z tą operacją.

#### IM.55 Duży plik i duża historia (1.4.3, 1.5.4 – szybkość widoczna dla użytkownika)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `P30k`
- **Jak sprawdzić:** wczytaj `P30k`; zmierz czas do podglądu; przewijaj tematy, wyszukaj, zdecyduj temat; zaimportuj
  2000 nowych operacji; otwórz Operacje „Cała historia”.
- **Oczekiwany efekt:** podgląd w kilka sekund, ekran odpowiada (decyzja, znak w wyszukiwarce poniżej sekundy); temat z
  ponad 30 markami zwinięty, listy po 100 z „pokaż kolejne”; zapis 2000 operacji kilka sekund; bez okienka „okno nie
  odpowiada”.
- **Nie przechodzi, gdy:**
  - okno zamiera na kilkanaście sekund albo zapis trwa minuty.

#### IM.56 Prawdziwy plik z mBanku (D27, D68, T104)
- **Kto:** Ty · **Ryzyko:** wysokie · **Stan danych:** kopia stanu `start` w laboratorium (nie Twój folder); Twoje pliki
  „lista operacji” i „historia rachunku” z ostatnich 2 tygodni
- **Jak sprawdzić:** wczytaj oba pliki w aplikacji audytowej (nie importuj do swojego folderu); porównaj z bankiem.
- **Oczekiwany efekt:** polskie znaki poprawne; liczba operacji i okres jak w mBanku; saldo z historii rachunku zgodne z
  aplikacją banku; tematy trafne – DO OCENY: ile do decyzji, ile podpowiedzi mBanku nietrafnych.
- **Nie przechodzi, gdy:**
  - plik nie wczytuje się albo część wierszy pominięta bez powodu;
  - nazwy sklepów rozbite na wiele grup jak przed 1.2.3.

### SA – Salda

#### SA.1 Saldo otwarcia – wpisane albo z salda w banku (D68, 0.3.0, 1.6.6, 1.5.3, T25)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (mBank z saldem otwarcia); nowe konto bez salda
  otwarcia z kilkoma operacjami
- **Jak sprawdzić:** Ustawienia → Konta: przy mBanku zmień „Saldo otwarcia” o 100 zł i datę o dzień; wpisz datę jutra.
  Przy nowym koncie wpisz „Saldo w banku teraz” i „Ustaw z salda w banku”. Otwórz „Historia” salda otwarcia.
- **Oczekiwany efekt:** „zł na początek dnia”, „– operacje od tego dnia są doliczane”; zmiana salda otwarcia zmienia
  saldo konta o 100 zł (Operacje, Mostek); data z przyszłości – „Saldo otwarcia nie może być z przyszłości.”; nowe konto
  – toast „<konto>: saldo otwarcia ustawione na początek dd.mm.rrrr (X zł).” (saldo teraz minus operacje), saldo konta =
  wpisanemu, „*” przy koncie w Operacjach znika; historia salda otwarcia z wersjami.
- **Nie przechodzi, gdy:**
  - saldo konta po „Ustaw z salda w banku” ≠ wpisane saldo;
  - data salda otwarcia w innym formacie niż dd.mm.rrrr.
- **Odczyt liczb:** saldo konta przed i po każdej zmianie, wyliczone saldo otwarcia.

#### SA.2 Potwierdzenie salda zgodnego (spec „Potwierdzanie sald”, 0.3.0, 1.6.4, T242)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** Ustawienia → Konta → mBank: „Saldo w banku teraz” = saldo konta z aplikacji (operacje do końca
  dnia), „Potwierdź saldo”; Meldunki i odprawa.
- **Oczekiwany efekt:** toast „mBank: saldo zgodne z operacjami (X zł).”, bez korekty; „ostatnio potwierdzone dd.mm.rrrr
  (X zł)”; meldunek i pozycja odprawy o potwierdzeniu mBanku znikają.
- **Nie przechodzi, gdy:**
  - zgodne saldo daje korektę 0,00 zł;
  - data potwierdzenia inna niż dziś.

#### SA.3 Rozbieżność i korekta (spec „Potwierdzanie sald”, D68, 0.3.0, 1.6.4, B83, T31, T242)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** wpisz saldo o 37,50 zł niższe, „Potwierdź saldo”; odczytaj pytanie; „Tak – zapisz korektę”;
  Operacje, odprawa na Mostku, osłony.
- **Oczekiwany efekt:** pytanie „Różnica … 37,50 zł wobec operacji do końca dnia. Dzisiejsze operacje są już dopisane?”;
  po „Tak – zapisz korektę” toast „mBank: rozbieżność w ładowni … 37,50 zł – dodano korektę do wyjaśnienia
  (Operacje).”; w Operacjach „Korekta salda” −37,50 zł z notatką „Rozbieżność w ładowni – do wyjaśnienia (różnica między
  saldem w banku a operacjami).”; odprawa – żółty alarm, klik prowadzi do korekty; korekta zmienia saldo i osłony, nie
  koszty; znak różnicy jednoznaczny i taki sam w pytaniu, toaście i telemetrii z banku („FI − bank”).
- **Nie przechodzi, gdy:**
  - korekta bez pytania o dzisiejsze operacje (B83);
  - różnica raz „+”, raz „−” dla tej samej sytuacji (UWAGA, zrozumiałość);
  - korekta liczona do „Koszty” albo koperty;
  - saldo konta po korekcie ≠ wpisane saldo z banku.
- **Odczyt liczb:** saldo konta, osłony i „Koszty” przed i po korekcie.

#### SA.4 „Dopiszę i potwierdzę później” (1.6.4, B83, T242)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** wpisz saldo z różnicą, „Potwierdź saldo”, „Dopiszę i potwierdzę później”; dopisz brakujący wydatek
  szybkim wpisem albo w Operacjach; wróć i „Potwierdź saldo”. Drugi raz: przy otwartym pytaniu zmień wpisaną kwotę.
- **Oczekiwany efekt:** „później” – nic nie zapisane, wpisana kwota zostaje w polu; po dopisaniu wydatku potwierdzenie
  zgodne bez korekty; zmiana kwoty zamyka pytanie.
- **Nie przechodzi, gdy:**
  - „później” zapisuje korektę albo kasuje wpisaną kwotę.

#### SA.5 Korekta do wyjaśnienia (spec, 0.3.0, 1.6.1)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z niewyjaśnioną korektą
- **Jak sprawdzić:** otwórz korektę; „Oznacz jako wyjaśnioną”; odprawa; „Przywróć alarm”; dopisz notatkę.
- **Oczekiwany efekt:** ramka „Korekta salda wyrównuje rachunek i osłony – dopóki jej nie oznaczysz jako wyjaśnionej,
  świeci żółtym alarmem w Odprawie.”; po oznaczeniu „Korekta salda wyjaśniona – nie świeci…”, alarm znika; „Przywróć
  alarm” przywraca; kwota korekty bez zmian.
- **Nie przechodzi, gdy:**
  - alarm zostaje po wyjaśnieniu albo wraca po restarcie.

#### SA.6 Przypomnienia o saldach – każde konto osobno (spec „Potwierdzanie sald”, D83, B28, T185, D86)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`: mBank potwierdzony wczoraj, Portfel XTB 8 dni temu,
  Gotówka nigdy, konto zarchiwizowane nigdy
- **Jak sprawdzić:** odczytaj odprawę na Mostku i Meldunki; potwierdź Portfel XTB ręcznie (Ustawienia → Konta).
- **Oczekiwany efekt:** odprawa: „Portfel XTB: saldo potwierdzone 8 dni temu – sprawdź z bankiem.”; mBank bez pozycji;
  bez Gotówki i konta zarchiwizowanego; potwierdzenie Portfela gasi jego pozycję; Meldunki pokazują konto dopiero po 30
  dniach – oba progi zrozumiałe dla użytkownika (odprawa „raz w tygodniu”, Meldunki „ponad 30 dni”).
- **Nie przechodzi, gdy:**
  - potwierdzenie mBanku gasi przypomnienie Portfela (B28);
  - przypomnienie dla Gotówki.

#### SA.7 Potwierdzenie z ekranu Import i brzegi kwot (0.3.0, 1.6.4, T242, T262)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` z przelewem w jednej operacji mBank → Portfel XTB z
  drugą stroną dzień później i operacją z jutrzejszą datą; `brzegi` z debetem na mBanku
- **Jak sprawdzić:** Import → „Potwierdzenie sald”: odczytaj „operacje: X zł” przy kontach, porównaj z Ustawienia →
  Konta; potwierdź Portfel XTB w dniu między stronami przelewu; wpisz saldo ujemne −250,00 zł; wpisz 1 234 567,89 zł.
- **Oczekiwany efekt:** to samo saldo i ten sam wynik potwierdzenia co w Ustawieniach (pytanie o dzisiejsze operacje
  też); przelew liczony na Portfelu w dniu jego strony; operacja jutra poza saldem; saldo ujemne przyjęte; duża kwota
  bez zaokrągleń.
- **Nie przechodzi, gdy:**
  - salda na ekranie Import i w Ustawieniach różne;
  - pole nie przyjmuje salda ujemnego (debet).
- **Odczyt liczb:** salda kont na obu ekranach.

#### SA.8 Potwierdzenie na dwóch komputerach (1.6.2, B129)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `dwa-komputery`
- **Jak sprawdzić:** na A i na B (przed synchronizacją) potwierdź mBank tym samym saldem z różnicą; zsynchronizuj;
  Operacje i Meldunki. Drugi wariant: dwie prawdziwe korekty tej samej kwoty w różnych dniach.
- **Oczekiwany efekt:** jedna korekta zamiast dwóch; dwie takie same korekty z dwóch komputerów – meldunek „Podwójne
  korekty”: „mBank: korekta salda X zł z dd.mm wygląda na powtórzoną – taka sama z dd.mm (komputer)…” z „Pokaż korektę”
  i „to nie powtórzenie” (meldunek nie wraca).
- **Nie przechodzi, gdy:**
  - dwie korekty liczone podwójnie bez meldunku;
  - „to nie powtórzenie” nie działa po restarcie.
- **Odczyt liczb:** saldo mBanku po synchronizacji.

#### SA.9 Niedzielne powiadomienie o potwierdzeniu sald (spec „Powiadomienia”, 1.5.2, T185)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`: mBank potwierdzony 8 dni przed niedzielą, Portfel XTB
  potwierdzony 2 dni przed
- **Jak sprawdzić:** przesuń zegar na niedzielę (aplikacja w zasobniku); odczytaj powiadomienie; wyłącz przełącznik w
  Ustawienia → Powiadomienia i dźwięki i przejdź do kolejnej niedzieli.
- **Oczekiwany efekt:** jedno powiadomienie w niedzielę „Potwierdzenie sald” – „Niedziela: porównaj z bankiem saldo –
  mBank (Ustawienia → Konta).”: konta niepotwierdzone od poniedziałku, bez Gotówki; po wyłączeniu – brak.
- **Nie przechodzi, gdy:**
  - powiadomienie w inny dzień albo kilka razy w niedzielę;
  - wymienia konto potwierdzone w tym tygodniu.
