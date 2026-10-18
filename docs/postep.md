# Financial Intel – postęp

**Stan:** 1.4.1 – wczytywanie folderu krok po kroku (D82) gotowe: PR #12 do `main`, scalenie po zielonym CI (D71).
**1.4.0 wydane** (PR #11), **1.3.0 wydane** (PR #10), **1.2.3 wydane** (PR #9), **1.2.2 wydane** (PR #8), **1.2.1 wydane** (PR #7), **1.2.0 wydane** (PR #6), **1.1.0 wydane** (PR #5),
**1.0.0 wydane** (PR #4); bez asystenta AI (D74) plan etapów E0–E8 jest zamknięty. Wydanie 0.3.0 nie wyszło: E2E na `main` po scaleniu PR #3 padło
na wyścigu w teście (plik usuwany w trakcie odczytu), więc job Windows z publikacją się nie uruchomił – zastąpione przez
1.0.0; testy czytają folder przez `tests/e2e/files.ts`.
**Następny krok:** pauza – odbiór 1.4.1 na drugim komputerze (otwarcie folderu z postępem; przy wolnych plikach
„Zawsze zachowuj na tym urządzeniu”, w razie problemu `main.log`), odbiór 1.3.0 i 1.4.0 w aplikacji (data rozliczeń i
salda na start, pośrednik, podział pierwszej wspólnej wpłaty, panel „Przychody”), kalibracja progów gry po pierwszym miesiącu na prawdziwych danych;
kolejny etap tylko na komendę użytkownika (D67).

## Zasady prowadzenia (prośba użytkownika 16.10.2026 – D67)
- Po każdym kroku (etapie albo grupie) zaktualizowana tabela: model i thinking z górką, szacowany czas pracy Claude'a.
- Bez komendy użytkownika nie zaczynam kolejnego etapu ani grupy.
- Etapy, które mogą iść jednym ciągiem, są zgrupowane: w grupie bez pauzy między etapami (każdy etap i tak kończy się
  testami, `/code-review` high, commitem i wpisem tutaj), jeden PR i jedno wydanie na grupę, potem pauza.

## Kolejka prac

Czas = praca Claude Code w sesji (czytanie, pisanie, testy, poprawki), bez testowania przez użytkownika i bez czekania
na CI. Model i thinking z górką. E0 oraz grupy B, C i D zmierzone zegarem sesji.

| Grupa | Etapy | Model | Thinking | Czas Claude'a | Wydanie | Co potrzebne przed startem | Stan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| – | E0 Fundament | Opus 5.5 | xhigh | zmierzone ok. 1,5 h | 0.1.0 | – | ✅ wydane |
| **A** | E1 Model i silnik + E2 Import mBank | Opus 5.5 | **max** | ok. 4,5 h (E1 zmierzony: ok. 2 h; E2 z przeglądem: ok. 2,5 h, szacunek z przebiegu sesji) | 0.3.0 | ✅ odpowiedzi (D68), CSV z mBanku | ✅ scalony (PR #3); wydanie nie wyszło – zastąpione przez 1.0.0 |
| **B** | E3 Start i plan miesiąca + E4 Mostek i szybki wpis | Opus 5.5 | **max** | zmierzone ok. 1,5 h (plan był 4–6 h) | **1.0.0** | ✅ odpowiedzi (D69, D70) | ✅ wydane (PR #4), czeka na odbiór na Windows |
| 🏁 | **MVP = 1.0.0** (E0–E4, D51) | | | **razem ok. 7,5 h** | | | |
| **C** | E5 ICTTJ i dokowanie + E6 Radar i należności | Opus 5.5 | **max** | zmierzone ok. 1 h (plan był 2–3 h) | 1.1.0 | ✅ odpowiedzi (D71, D72) | ✅ wydane (PR #5) |
| **D** | E7 Dowództwo + E8 Wywiad i raporty | Opus 5.5 | **max** | zmierzone ok. 1 h (plan był 2–3 h) | 1.2.0 | ✅ komenda i propozycje (D73) | ✅ wydane (PR #6) |
| 1.2.1 | Grupowanie importu z mBanku (1 + 3 + 4 + 2) + wyszukiwarka i decyzje zbiorcze + duplikaty jak w ICTTJ | Opus 5.5 | **max** | zmierzone ok. 2 h (plan był 1–1,5 h + 0,5 h + 0,75 h) | 1.2.1 | ✅ wybór pomysłów (D75–D77) | ✅ wydane (PR #7) |
| 1.2.2 | Podobne nazwy (5) + propozycja reguły z liczbą operacji (6) | Opus 5.5 | **max** | zmierzone ok. 1 h (plan był 1–1,5 h) | 1.2.2 | ✅ wybór „opcja 2” (D78) | ✅ wydane (PR #8) |
| 1.2.3 | Poprawka: dopiski banku w nazwach, ostrożniejsze podobieństwo i propozycje (D79), sprawdzenie na prawdziwej historii rachunku (T104) | Opus 5.5 | **max** | zmierzone ok. 1,5 h | 1.2.3 | ✅ zgłoszenie (D79) | ✅ wydane (PR #9) |
| 1.3.0 | Rozliczenia z domownikami: saldo każdej osoby w obie strony, depozyt, import, Mostek, Radar, raporty (D80) | Opus 5.5 | **max** | ok. 3,5 h (szacunek z przebiegu sesji; plan był 2,5–3 h) | 1.3.0 | ✅ odpowiedzi i komenda (D80) | ✅ wydane (PR #10) |
| 1.4.0 | Domownicy bez bankowości (pośrednik, podział wpłaty), rozliczenia od dziś z saldem początkowym, panel przychodów (D81) | Opus 5.5 | **max** | ok. 2 h (szacunek z przebiegu sesji; plan był ok. 3 h) | 1.4.0 | ✅ odpowiedzi i komenda (D81) | ✅ wydane (PR #11) |
| 1.4.1 | Wczytywanie folderu krok po kroku: postęp, „Przerwij”, log diagnostyczny, większa pula wątków (D82) | Opus 5.5 | **xhigh** | ok. 1 h (szacunek z przebiegu sesji; plan był ok. 1,5 h) | 1.4.1 | ✅ zgłoszenie, diagnoza i komenda (D82) | ✅ gotowe, PR #12 – scalenie po zielonym CI |
| ~~E~~ | ~~E9 Pierwszy oficer~~ | – | – | – | – | – | ❌ wypada (D74: bez asystenta AI) |
| | **Całość E0–E8 + 1.2.1–1.4.1** | | | **ok. 20,5 h** | | | |

Grupa B zajęła ok. 1,5 h zegara sesji (od utworzenia gałęzi do wypchnięcia PR, z przeglądami kodu i pełnymi E2E) –
dużo mniej niż plan 4–6 h; grupa C ok. 1 h (plan 2–3 h). Szacunki D–E przeliczone na tej podstawie, nadal z zapasem:
grupa D jest największa (gra ocenia każdy dzień, Wywiad to nowe wykresy, raporty PDF i Excel).

Dlaczego tak: E1 (silnik pieniędzy) ma najwięcej reguł – sam albo z E2, gdy przed startem jest plik CSV; E3 i E4 to
ekrany na gotowym silniku i razem dają wydanie 1.0.0; E5 i E6 to przepływy z zewnątrz (ICTTJ, pożyczki, należności);
E7 i E8 to warstwa gry i analiz na gotowych danych – obie potrzebują wcześniej zaakceptowanych list. Grupa B podniesiona
z xhigh do max (z górką): 1.0.0 to pierwsza wersja do codziennego użytku na prawdziwych pieniądzach, kreator dzieli
obecne środki i proponuje pensję z silnika, a szybki wpis liczy energię przed zapisem.

Dla porównania: programista człowiek potrzebowałby wielokrotnie więcej – E0 ok. 1–2 tygodni, MVP ok. 2–3 miesięcy,
całość ok. 4–6 miesięcy (szacunek zgrubny).

## Przed etapem 1.3.0 – rozliczenia z domownikami (17.10.2026)

1. **Co trzeba wiedzieć** – część wydatków finansują domownicy; dotąd FI miał jedną należność „od domu” (D21) i wybór
   zwrot / przychód przy wpłacie (D20). Zakres: saldo każdego domownika w obie strony (należność albo zaliczka),
   wydatek albo część paragonu „finansuje: osoba” (nie zjada energii, nie jest kosztem), wpływ od domownika najpierw
   wyrównuje należność, reszta zaliczka albo przychód; salda na Mostku i Radarze, przypomnienia, sfinansowane osobno
   w debriefingu i Raportach. 1.2.3 wydane (PR #9), nic nie jest otwarte.
2. **Co użytkownik musi powiedzieć** – ✅ odpowiedzi (kto płaci pierwszy: różnie; tylko domownicy; sfinansowane widać
   osobno; nic dotąd nie oznaczone) i propozycje a–g przyjęte komendą „Ok” (D80).
3. **Co przygotować** – nic przed startem; po wydaniu: domownicy w Ustawieniach, oznaczenie kilku wspólnych wydatków,
   sprawdzenie sald na Mostku i dopasowania po imporcie.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2,5–3 h.

## Przed etapem 1.4.0 – domownicy bez bankowości i przychody (18.10.2026)

1. **Co trzeba wiedzieć** – 1.3.0 wydane (PR #10). Część domowników nie ma bankowości: pieniądze przekazuje inny
   domownik, czasem w jednym przelewie są pieniądze kilku osób, a historii nie da się rozsupłać. Zakres: pośrednik jako
   podpowiedź („+ także za X”) i ręczny podział wpłaty na osoby, rozliczenia od dziś z saldem początkowym osoby (dawne
   przelewy domowników poza przychodem), panel „Przychody” (średnie 3 / 6 / 12 mies. i mediana; praca i trading XTB
   netto bez puli Podatek).
2. **Co użytkownik musi powiedzieć** – ✅ odpowiedzi i komenda „Ok” (D81).
3. **Co przygotować** – nic przed startem; po wydaniu: data rozliczeń i salda początkowe osób, pośrednik przy osobie
   bez konta, podział pierwszej wspólnej wpłaty.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 3 h.

## 1.4.0 – domownicy bez bankowości i przychody (18.10.2026)

Zgłoszenie użytkownika po 1.3.0 (D81): część domowników nie ma konta – pieniądze przekazuje inny domownik, czasem w
jednym przelewie są pieniądze kilku osób, a historii nie da się rozsupłać; przychody mają wynikać ze średnich.

Zrobione:
- Rozliczenia od dnia (`settings.household.since`): pierwszy raz od dziś z dotychczasowymi saldami osób jako saldem na
  start; rejestr zeruje się przy starcie budżetu i w dniu rozliczeń (salda na start), depozyt w tym dniu = zaliczki na
  start (T115, T116).
- Podział wpłaty na osoby (`splits` wpływu, reszta kwoty nadawcy) i pośrednik jako podpowiedź („+ także za X” z kwotą
  na dzień wpłaty, „W tym za X” w szybkim wpisie, „przekazuje przez” w przypomnieniu i na Radarze) (T117, T118).
- Przychód do statystyk w `calc/income.ts`: praca bez pieniędzy domowników (sprzed daty rozliczeń wcale), trading XTB
  netto bez puli Podatek; panel „Przychody” w Planie miesiąca i na Mostku (średnie 3 / 6 / 12, mediana, porównanie z
  pensją); ostrzeżenie o pensji i raporty z tych samych liczb (T119, T120).
- Ustawienia → Domownicy: data rozliczeń, saldo na start, „przekazuje przez” (T121).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione (T122) – najważniejsze: pierwsze uruchomienie
  zerowało salda z 1.3.0 (teraz przechodzą jako saldo na start), późniejsza data rozliczeń przestała zerować salda przy
  starcie budżetu, trading w roku liczony miesiącami zamiast netto.
- Testy: 393 unit + fs (nowe `tests/unit/income.test.ts`, D81 w `household.test.ts`), E2E 19 (nowy test D81 w
  `tests/e2e/household.spec.ts`; Mostek, Radar i domownicy z datą rozliczeń w danych).

Do sprawdzenia przez użytkownika (po wydaniu 1.4.0, Windows):
1. Ustawienia → Domownicy: „Rozliczenia od” (dzień pierwszego uruchomienia 1.4.0), salda na start osób, „Pieniądze
   przekazuje przez” przy osobie bez konta.
2. Przelew pośrednika z pieniędzmi innej osoby: „+ także za …” w edytorze albo „W tym za …” w szybkim wpisie.
3. Panel „Przychody”: praca i trading XTB osobno, średnie i mediana wobec pensji.

## Przed etapem 1.4.1 – wczytywanie folderu (18.10.2026)

1. **Co trzeba wiedzieć** – 1.4.0 wydane (PR #11). Na drugim komputerze „Otwórz istniejące” przygasza przyciski i
   aplikacja wisi minutami; w `main.log` nie ma linii „opened” – proces główny stoi na odczycie plików. Przyczyna
   (T123): OneDrive trzyma pliki tylko online, a Node czyta pliki na 4 wątkach. Zakres: postęp wczytywania na ekranie,
   podpowiedź OneDrive, „Przerwij”, folder logów, czasy etapów i obliczeń okna w logu, okienko przy zawieszonym oknie,
   szybszy odczyt.
2. **Co użytkownik musi powiedzieć** – ✅ zakres („Tak”), log bez „opened”; model i thinking po diagnozie, przed
   zmianami (D82).
3. **Co przygotować** – obejście od razu: „Zawsze zachowuj na tym urządzeniu” na folderze danych; po wydaniu: otwarcie
   folderu na drugim komputerze, w razie problemu `%APPDATA%\Financial Intel\logs\main.log`.
4. **Model, thinking, czas** – Opus 5.5 · xhigh (zmiany w odczycie folderu) · ok. 1,5 h.

## 1.4.1 – wczytywanie folderu krok po kroku (18.10.2026)

Zgłoszenie użytkownika po 1.4.0 (D82): na drugim komputerze otwarcie folderu wisiało minutami bez śladu w logu.

Zrobione:
- Pula wątków plików 32 zamiast 4 (`main/threadpool.ts`, importowany pierwszy; sprawdzone w Electronie), odczyt po 24
  pliki naraz – czekające na chmurę pliki nie zatrzymują reszty aplikacji (T123).
- Postęp otwierania: etapy, „x z N”, plik czekający najdłużej, wolne odczyty, czasy etapów; do okna co 250 ms, do logu
  co 10 s i przy końcu (najwolniejsze pliki) (T124).
- „Przerwij” do końca odczytu (bez migracji i sprzątania folderu, „Spróbuj ponownie”), nowsze otwarcie wygrywa ze
  starszym, obecność innych komputerów najwyżej 2 s (T125).
- Okno: panel postępu na ekranie wyboru folderu i przy starcie, podpowiedź „Zawsze zachowuj na tym urządzeniu”, „Folder
  logów (diagnostyka)”; długie obliczenia (silnik, gra, saldo na start) do logu, zawieszone okno – wpis z etapem i
  okienko po 10 s (T126).
- Przegląd `/code-review` high: 8 kandydatów, 7 poprawionych, 1 bez zmian z uzasadnieniem (T127).
- Testy: 398 unit + fs (nowy `tests/fs/open-progress.test.ts`), E2E 20 (nowy `tests/e2e/open.spec.ts`: postęp,
  podpowiedź, „Przerwij”, ponowna próba, log).

Do sprawdzenia przez użytkownika (po wydaniu 1.4.1, Windows, drugi komputer):
1. Otwarcie folderu: pasek „Wczytywanie plików: x z N”, czas, przy wolnych plikach podpowiedź OneDrive.
2. „Przerwij” wraca do wyboru folderu, „Spróbuj ponownie” otwiera go jeszcze raz.
3. Gdy coś dalej trwa długo: „Folder logów (diagnostyka)” → `main.log` (linie „open progress …” pokazują, na czym
   stoi).

## 1.3.0 – rozliczenia z domownikami (18.10.2026)

Prośba użytkownika: część wydatków finansują inne osoby (propozycja użytkownika – odjąć wydatek od wpływów tej osoby).
Wybrany wariant A: saldo każdego domownika w obie strony (D80, propozycje a–g przyjęte komendą „Ok”).

Zrobione:
- Rejestr rozliczeń (`calc/household.ts`): liczony z operacji w kolejności silnika, nigdy zapisywany; zakup „finansuje:
  osoba” najpierw z jej zaliczki, resztę pożyczają osłony; wpłata najpierw spłaca (wskazane zakupy, inaczej od
  najstarszych), reszta zaliczka albo przychód; zwrot towaru z zakupu domownika = jego pieniądze; salda od startu budżetu
  (jak pożyczki), konto dołączone później – bez operacji sprzed jego salda otwarcia (T105, T106).
- Silnik warstw: nowa warstwa „Depozyt domowników” (suma warstw = salda kont), należności każdej osoby, przychód bez
  spłat i zaliczek, zakup finansowany nie jest kosztem ani naruszeniem w grze (T107); zapisy sprzed 1.3.0 – „Dom”
  (T108); misja „Rozlicz się z domownikami” z tego samego rejestru.
- Ustawienia → Domownicy (nazwy w banku, „pytaj / zaliczka / przychód” zapamiętane po pierwszej odpowiedzi – T109).
- Import: domownik po nazwie nadawcy (z „pytaj” we własnym temacie), „+ domownik”, opcje „Finansuje: X” i „Od
  domownika: X – reszta jako …”, reguły i słowa kluczowe z osobą; reguła zwykłego wpływu sprzed dopisania osoby
  ustępuje domownikowi (T110).
- Ekrany (T112): edytor (kto finansuje – cały wydatek i część paragonu; wpłata od domownika z „Pokrywa”), szybki wpis
  („Za domownika”, „Od domownika” z podglądem), Operacje („Ustaw finansującego” z „Cofnij”), Mostek (depozyt, rozliczenia,
  kto finansuje w ostatnich operacjach), Radar, Plan miesiąca i Raporty („Sfinansowane przez domowników”), CSV / Excel
  („Finansuje”); przypomnienie po 30 dniach w odprawie i powiadomieniu (T111).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione (T114) – najważniejsze: rejestr jak silnik przy koncie
  dołączonym później (depozyt mógł zejść poniżej zera), stara reguła „wpływ” wygrywała z dopisanym domownikiem, decyzja
  tematu przelewów obcych osób zabierała osobę, szybki wpis bez wybranej osoby księgował „Dom”.
- Testy: 381 unit + fs (nowe `tests/unit/household.test.ts`, domownicy w `import.test.ts`), E2E 18 (nowy
  `tests/e2e/household.spec.ts`; Mostek, Operacje, import i CSV dostosowane).

Do sprawdzenia przez użytkownika (po wydaniu 1.3.0, Windows):
1. Ustawienia → Domownicy: osoby z nazwami nadawcy z banku (albo „+ domownik” w imporcie), odpowiedź „zaliczka /
   przychód”; pierwsza osoba „Dom” – zmień imię, jeśli to konkretna osoba.
2. Kilka wspólnych wydatków oznaczonych „finansuje” (edytor, szybki wpis albo „Ustaw finansującego” w Operacjach) –
   salda na Mostku i Radarze, energia bez tych zakupów.
3. Import z wpłatami domowników: spłata, reszta jako zaliczka (depozyt w stanie okrętu) albo przychód.

## 1.2.3 – poprawka podobnych nazw (17.10.2026)

Zgłoszenie użytkownika (D79): rozpoznawanie podobnych transakcji nie działa – wiele nazw ma datę transakcji, a to samo
słowo (nazwa miasta, „bar”) łączy niezwiązane. Przyczyna: historia rachunku mBanku pisze płatność kartą jako „SKLEP /MIASTO
DATA TRANSAKCJI: RRRR-MM-DD” (sklep w tytule); dopiski zostawały w nazwie – jeden sklep rozpadał się na nazwy, a
sklepy, którym po odjęciu słów ogólnych zostawały tylko dopiski, wyglądały na „podobne”; propozycje słowa podsuwały
„data” / „transakcji”. Na pierwszym pliku użytkownika (lista operacji) tych dopisków nie było, dlatego pomiar w 1.2.2
tego nie pokazał.

Zrobione:
- Nazwa bez dopisków banku (data i godzina, numer karty, „Ref”, miasto po „/” – tylko w nazwie sklepu, wielkimi
  literami); opis z banku i klucz wiersza bez zmian; reguły sprzed 1.2.3 dalej działają (stare klucze, także w
  Operacjach) (T100).
- Podobne nazwy: słowo z nazw ponad 4 marek, rodzaje miejsc i miasta nic nie łączą; tylko pojedyncze „Połącz”;
  nieaktywne połączenia z 1.2.2 oznaczone i „Usuń nieaktywne”, „Rozłącz wszystkie” (T101).
- Propozycja słowa: bez słów banku i słów prawie wszystkich nazw, tylko polskie końcówki; zbyt ogólne słowo kluczowe
  odrzucane (T102).
- Pomiar: syntetyczna historia rachunku – sklep z trzech dni jedna grupa, jedna trafna para, sklepy jednego miasta bez
  par; plik użytkownika (lista operacji) – bez regresji (para z nazwiskiem zamaskowanym „xxx” znika – „xxx” jest w wielu
  nazwach i nie wskazuje osoby).
- Przegląd `/code-review` high: 10 znalezisk – poprawione: miasto po „/” tylko w nazwie sklepu (wspólne konto w
  przelewie), rodzaje miejsc nie są „za ogólne” dla słów kluczowych, dokładne stare klucze (płatność nazwana rodzajem
  operacji, tytuł bez obcinania adresu), stare klucze w Operacjach (`BankRow.bankName`), nieaktywne połączenia zamiast
  „rozłącz wszystko”, przymiotnikowe końcówki, mniej pracy dla sieci, reguła na nazwie z dopiskami nie jest „inną
  nazwą”; świadomie bez zmian: próg 4 marek dla słowa (sieć z 5+ oddziałami – propozycja słowa albo „Połącz nazwy”).
- Sprawdzenie na prawdziwej historii rachunku użytkownika (T104, przed scaleniem): miasto było pisane bez spacji przed
  „/” i małymi literami („…/Miasto”) – poprawione (miasto tylko w nazwie z datą transakcji, nazwy wpisane ręcznie
  całe); bankomat i prowizja nie są parą, prowizja nie bierze decyzji sklepu z tytułu, „POS ZWROT TOWARU” = zwrot
  towaru, propozycje bez pośredników płatności. Wynik: 4 trafne pary, propozycje przy 43 grupach bez miast i słów banku.
  Drugi przegląd `/code-review` high (9 znalezisk): poprawione – miasto tylko w nazwie z datą (nie „Czynsz/mieszkanie”,
  „AC/DC”, długie miasta znów ucinane), jeden warunek prowizji (`isFeeOperation`), pośrednik zdejmowany zamiast listy
  słów ogólnych, cięta forma prawna wycofana (zmieniała klucze reguł); świadomie bez zmian: „POS ZWROT” w temacie „inne”
  (wpływ – nie trafia do decyzji zbiorczej zakupów).
- Testy: 369 unit + fs, E2E 17 (`tests/e2e/learning.spec.ts` na `tests/fixtures/mbank/historia_rachunku.csv`).

Do sprawdzenia przez użytkownika (po wydaniu 1.2.3, Windows):
1. Ustawienia → Import z banku → „Połączone nazwy”: „Usuń nieaktywne” (połączenia z 1.2.2) i ewentualnie słowa kluczowe
   dodane z błędnych propozycji („data”, „transakcji”).
2. Import historii rachunku: jeden sklep = jedna grupa, „Podobne nazwy” tylko trafne pary.

## 1.2.2 – podobne nazwy i propozycja reguły (17.10.2026)

Zrobione (D78 – pomysły 5 i 6 z propozycji importu):
- „Podobne nazwy” na ekranie importu: pary nazw spoza słownika sieci, które wyglądają na jedną firmę albo osobę (te same
  słowa w innej kolejności albo jedno więcej, ucięta nazwa, literówka – nie u osób, ta sama nazwa na początku), także z
  markami Twoich reguł z wcześniejszych importów; „Połącz” / „Połącz wszystkie” z „Cofnij”, „To nie to samo”
  zapamiętane (T95, T96).
- Połączone nazwy (`settings.import.aliases`): jedna grupa i jedna reguła w tym i kolejnych importach i w Operacjach,
  także gdy rozpoznana jest tylko jedna z nazw; nazwa połączona z siecią ze słownika jest tą siecią; Ustawienia → Import z
  banku: lista z „rozłącz” i powrót odrzuconych par (T95).
- „Połącz nazwy” dla zaznaczonych grup, gdy podobieństwo nie wystarcza (T97).
- Propozycja reguły pod grupą, której decyzję zmieniłeś ostatnio: słowa z nazwy (przelew – z tytułu) z liczbą innych
  operacji pliku, którym reguła zmieni decyzję; kliknięcie = Twoje słowo kluczowe z całą decyzją, plik liczony od nowa;
  bez miejscowości, imion i nazwisk (także odmienionych), bez słów łapiących inne słowa (T98).
- Pomiar na pliku użytkownika (271 operacji): 2 pary podobnych nazw – ta sama osoba w odwrotnej kolejności i ta sama
  restauracja pod dwiema nazwami; propozycje słowa przy 4 grupach (nazwa restauracji, „apteka” przy innej kategorii niż
  wbudowana). Długa historia (syntetycznie 4000 operacji, ~1000 marek, 400 reguł): podobne nazwy 64 ms, propozycja
  ok. 30 ms (T99).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione – odmiana imion zbyt szeroka („karma” jak „Karol”),
  reguła całej nazwy sprzed 1.2.1 jako „podobna nazwa”, „Połącz nazwy” w folderze tylko do odczytu, propozycja po
  decyzji zbiorczej, słowo kluczowe z decyzją pożyczki / XTB, dwie grupy po połączeniu nazw z różnym rozpoznaniem,
  pętla połączeń z dwóch komputerów, grupy liczone dwa razy przy przeliczeniu planu, porządki.
- Drugi przegląd `/code-review` high: 8 znalezisk, wszystkie poprawione – literówka u osób, miejscowość tylko przy sieci
  albo trzech markach (bez formy prawnej), wspólne rozpoznanie bez kontenera, „Połącz wszystkie” bez sklejania dwóch
  reguł, przycisk „Połącz nazwy” tylko gdy można, „Te nazwy są już połączone”, wspólny opis decyzji reguły, porównanie
  słów i pamięć słów kluczowych / miast z `brands.ts`.
- Testy: 364 unit + fs (`tests/unit/import-similar.test.ts`), E2E 17 (`tests/e2e/learning.spec.ts` – połącz parę,
  „Połącz nazwy” z „Cofnij”, propozycja słowa z liczbą operacji, „nie, dziękuję”, rozłączenie w Ustawieniach, „To nie to
  samo” i powrót odrzuconych par).

Do sprawdzenia przez użytkownika (po wydaniu 1.2.2, Windows):
1. Import pełnej historii z mBanku: „Podobne nazwy” – czy pary są trafne; „Połącz” i potem jedna grupa.
2. Decyzja dla grupy z nazwą, która jest też w innych operacjach (np. własna nazwa kawiarni) – propozycja słowa z
   liczbą operacji, kliknięcie i inne grupy od razu z tą kategorią.
3. Ustawienia → Import z banku → „Połączone nazwy”: rozłączenie.

## Przed etapem 1.2.1 – grupowanie importu z mBanku (17.10.2026)

1. **Co trzeba wiedzieć** – import grupuje dziś po całej nazwie kontrahenta: na pliku użytkownika 271 operacji to 81
   grup, z czego 49 jednoosobowych (ta sama sieć w kilku miastach, operator płatności przed nazwą, końcówka domeny).
   Zmiana dotyczy tylko importu (E2) i reguł; bez AI – stałe listy i dopasowanie całych słów.
2. **Co użytkownik musi powiedzieć** – wybór z propozycji: ✅ 1 + 3 + 4 + 2 (D75). Rozstrzygam sam (T-decyzje):
   - rozpoznanie sieci i słowa kluczowe działają jak dzisiejsze rozpoznanie XTB czy bankomatu – kategoria widoczna w
     podglądzie wchodzi z importem, można ją zmienić; kategoria mBanku nadal tylko podpowiedzią (D68);
   - „Przyjmij pewne” przyjmuje rozpoznane tematy jako Twoją decyzję i zapamiętuje je jako reguły – kolejny import
     pokaże je od razu jako gotowe;
   - słowa kluczowe działają tylko na wydatki (wpływ z tytułem „kręgle” to zwrot od znajomego – do Twojej decyzji).
3. **Co przygotować** – nic.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 1–1,5 h.

## 1.2.1 – grupowanie importu z mBanku (17.10.2026)

Zrobione (D75 – pomysły 1 + 3 + 4 + 2, D76 – wyszukiwarka i zaznaczanie dopisane w trakcie):
- Klucz marki: sieć w każdym mieście, pod operatorem płatności i z końcówką domeny to jedna grupa; reguły uczą się
  po marce, reguły sprzed 1.2.1 działają dalej (T85, T87).
- Słownik ponad 200 sieci i usług z kategoriami i 30 słów kluczowych nazwy albo tytułu; własne słowa kluczowe
  (Ustawienia → Import z banku i ekran importu – plik liczony od nowa od razu) (T86).
- Tematy (kategoria / podpowiedź mBanku / rodzaj operacji) z sekcjami „Do decyzji”, „Rozpoznane – sprawdź”,
  „Gotowe”, decyzja tematu dla wszystkich jego marek, „Przyjmij pewne” z zapamiętaniem, podpowiedzi mBanku dla
  całych tematów bez reguł (T88, T89).
- Wyszukiwarka, zaznaczanie grup i operacji, decyzja dla zaznaczonych, „Nie importuj”, wyszukiwane słowo jako
  słowo kluczowe (T90); w Operacjach zaznaczanie (ręcznie albo wszystkie widoczne) i kategoria dla zaznaczonych z
  „Cofnij” i zapamiętaniem dla marek albo słowa (T91).
- Duplikaty jak w ICTTJ (D77): możliwy duplikat wpisu ręcznego w imporcie (inna nazwa, kwota różna o grosze; pewne
  łączone same, niepewne do zaznaczenia), panel „Duplikaty operacji” (wpis ręczny + kopia z banku, ten sam wiersz banku
  z dwóch komputerów – zostaje nowsza wersja), scalanie z jednym „Cofnij”, „to nie duplikat” (T92–T94).
- Pomiar na pliku użytkownika (271 operacji): 81 grup → 80 grup marek w 36 tematach; 19 tematów rozpoznanych do
  przyjęcia jednym kliknięciem, 10 z podpowiedzią mBanku, do ręcznej decyzji głównie przelewy od i do osób. Na
  dłuższej historii łączenie marek daje więcej (ta sama sieć w wielu miastach).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione:
  - reguła sieci nie łapie wypłaty z bankomatu w tej sieci (bankomat bez słownika);
  - przelew do osoby: sieć tylko od początku nazwy, nazwiska-miasta nie są wycinane („JAN KALISZ” ≠ „JAN KONIN”);
  - kilka grup jednej marki z różnymi decyzjami – reguła z decyzji większej grupy;
  - plan od nowa: decyzje tematów przechodzą na grupy, zaznaczenie bez nieistniejących grup; plan od nowa tylko po
    zmianie reguł (nie przy każdym wejściu na ekran);
  - liczba w wyszukiwarce to kwota albo tekst (data, numer); znaczek tematu przy wyszukiwaniu dotyczy znalezionych;
  - kody sklepów („Z6512”) znikają z klucza; licznik zaznaczonych bez podwójnego liczenia; porządki w kodzie.
- Drugi przegląd `/code-review` high (decyzje zbiorcze, Operacje): 10 znalezisk, wszystkie poprawione – „Cofnij”
  także reguł, bez szkicu nowego wpisu i bez niewidocznych operacji, kategoria wymagana, reguły marek zachowują
  „do zwrotu”, decyzje i zaznaczenia po przeliczeniu planu przenoszone po operacjach, słowo z Operacji w obu
  kierunkach, podpowiedź mBanku grupy jako przyjęta propozycja, odmiana „operacje”.
- Trzeci przegląd `/code-review` high (duplikaty): 8 znalezisk, wszystkie poprawione – korekta salda nigdy nie łączona,
  niepewny możliwy duplikat do zaznaczenia (nie sam), cała decyzja kopii przy scalaniu, „Cofnij” przywraca też zachowaną
  operację i dokowania, odporny zapis „to nie duplikat”, szukanie w oknie ±3 dni i raz dla wszystkich ekranów, jedna
  reguła dopasowania dla importu i panelu, decyzje w dokumentach.
- Testy: 357 unit + fs (`tests/unit/import-brands.test.ts`, `duplicates.test.ts`), E2E 16 (`duplicates.spec.ts`) (`tests/e2e/import.spec.ts` – tematy,
  wyszukiwarka, zaznaczanie, „Nie importuj”, słowo kluczowe z wyszukiwania, „Przyjmij pewne”, Operacje: zaznaczenie
  znalezionych, kategoria, reguła marki, „Cofnij”).

Do sprawdzenia przez użytkownika (po wydaniu 1.2.1, Windows):
1. Import pełnej historii z mBanku: liczba tematów, „Przyjmij pewne”, trafność słownika i słów kluczowych.
2. Własne słowo kluczowe (np. nazwa ulubionej cukierni) i wyszukiwarka z zaznaczaniem.
3. Operacje: wyszukaj, zaznacz wszystkie widoczne, ustaw kategorię (z zapamiętaniem) i „Cofnij”.
4. Wpis ręczny przed importem (np. wieczorem) – po imporcie jedna operacja; panel „Duplikaty operacji” na ekranie Import.

## E8 – Wywiad i raporty (17.10.2026)

Zrobione (zakres i odpowiedzi z „Przed etapem E7” – D73):
- Wywiad (Ctrl+9): krzywa majątku tydzień po tygodniu z drawdownem i oznaczeniami BOS / CHoCH, Killzones wydatków
  (dzień × godzina), FVG kopert dowolnego miesiąca, wydatki w czasie z ładownią jako Order Block, prognoza zasięgu bez
  wypłat, trafność dziennika kapitańskiego; okres 3 / 6 / 12 miesięcy (T81, T82).
- Raporty (Ctrl+0): odprawa, raport wachty (tydzień w liczbach, dni gry, killzone, misja, koperty na najbliższe dni),
  debriefing z FVG, grą, dziennikiem i łupami, przegląd roczny; PDF debriefingu i przeglądu; eksport CSV i Excel
  (operacje, miesiące) i pełna kopia ZIP; powiadomienie „Raport wachty” w niedzielę od 18:00 (T83, T84).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione:
  - salda tygodni liczone sumami narastającymi (bez kwadratowego kopiowania), analizy przeliczane z dniem, nie co minutę;
  - przegląd roczny: majątek na granicach roku, cele osiągnięte w tym roku (z dziennika silnika);
  - szczyt krzywej od pierwszego punktu; CSV odporny na formuły (apostrof);
  - powiadomienie otwiera raport bieżącego tygodnia (stan Raportów poza stroną); łupy z częścią do osłon;
  - koperty na najbliższe dni – tylko do końca miesiąca, z liczbą dni; usunięty martwy kod.
- Testy: 342 unit + fs (`tests/unit/intel.test.ts`, `export.test.ts`), E2E 15 (`tests/e2e/intel.spec.ts`).

Do sprawdzenia przez użytkownika (po wydaniu 1.2.0, Windows):
1. Wywiad: krzywa majątku z historią z importu, Killzones (wpisy z godziną), FVG poprzedniego miesiąca.
2. Raporty: raport wachty, debriefing i przegląd roczny do PDF, eksport CSV / Excel – otwarcie w Excelu.

## E7 – Dowództwo (17.10.2026)

Zrobione (zakres i odpowiedzi z „Przed etapem E7” – D73):
- Ocena każdego dnia od startu gry (pierwszy pełny dzień po uruchomieniu 1.2.0) i zamrożenie 24 h po końcu dnia, w tle:
  naruszenia zwykłe i poważne, smaczki ICT dnia, klasa okrętu (T75, T76).
- Stopnie Kadet → Admirał (30 z 35, misja = 3 dni, degradacja przy 3. poważnym w miesiącu), seria i rekord, misje
  tygodniowe dobierane do słabego punktu (9 w puli), 13 ukrytych osiągnięć (T77–T79).
- Dowództwo (Ctrl+8): stopień z postępem, klasa z drabiną zasięgu, seria z paskiem 35 dni i oceną dnia „na razie”, misja
  tygodnia z postępem, osiągnięcia, rozkazy i progi gry (do zmiany), dziennik wachty.
- Ekran awansu i wyższej klasy z animacją i dźwiękiem; degradacja, osiągnięcia i misje jako toasty (T80).
- Odprawa: misja tygodnia, Silver Bullet (10–11 NY); koperty: Equilibrium (Premium / Discount); Mapa gwiezdna: DOL.
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione:
  - święta tylko ze zdarzeń z ostatnich 14 dni (pamięć „widzianych” nie odtwarza starych), kilka naraz jako jeden toast;
  - degradacja nie jako „Błąd”, bez liczby na sztywno; niższa klasa tylko w dzienniku (D73);
  - ładunek: wzrost masy względem poprzedniego zamrożonego dnia zamiast `updatedAt` (zmiana nazwy, scalenie);
  - degradacja działa też po obniżeniu progu; wybór misji „import” z danych sprzed poniedziałku;
  - dziennik importów jako obiekt (scalanie z drugiego komputera po kluczach);
  - święta z dziennika wachty (bez drugiego wyprowadzenia, daty warszawskie); progi klas z jednego miejsca.
- Testy: 327 unit + fs (`tests/unit/game.test.ts` – 17), E2E 14 (`tests/e2e/command.spec.ts`).

Do sprawdzenia przez użytkownika (po wydaniu 1.2.0, Windows):
1. Dowództwo: data startu gry (jutro po pierwszym uruchomieniu), ocena dnia „na razie”, misja od pierwszego pełnego tygodnia.
2. Po kilku dniach: dziennik wachty, seria, pasek dni; próg gry – do kalibracji po pierwszym miesiącu.

Otwarte (zgłoszenie użytkownika 17.10.2026): import historii z mBanku daje za dużo grup – pomysły bez AI (klucz marki
bez miast i numerów sklepów, słownik sieci, reguły na słowa kluczowe w nazwie i tytule, grupowanie wielopoziomowe,
łączenie podobnych nazw, nauka reguł z decyzji); propozycja: 1 + 3 + 4 jako osobna zmiana po grupie D (1.2.1) –
czeka na wybór użytkownika.

## Przed etapem E7 (grupa D)

1. **Co trzeba wiedzieć**
   - Zakres grupy D → wydanie 1.2.0:
     - E7 Dowództwo (Ctrl+8): rozkazy (te same co w Ustawienia → Warstwy i rozkazy), ocena każdego dnia i zamrożenie
       24 h po jego końcu (T9 – późniejsza korekta danych zmienia budżet, ale nie odbiera awansu), seria i rekord serii,
       stopnie Kadet → Chorąży → Porucznik → Komandor → Kapitan → Admirał, klasa okrętu z zasięgu (T10), misje tygodniowe
       (także w odprawie), ukryte osiągnięcia, dziennik wachty, ekran awansu z animacją i dźwiękiem; zapis w
       `game/RRRR-MM.json`.
     - E8 Wywiad (Ctrl+9) i Raporty (Ctrl+0): krzywa majątku tydzień po tygodniu z drawdownem i BOS / CHoCH, Killzones
       (dzień tygodnia × godzina, tylko wpisy z godziną), FVG kopert (plan i fakt), wydatki w czasie, prognoza zasięgu
       bez wypłat, trafność dziennika kapitańskiego; raporty: odprawa, raport wachty, debriefing, przegląd roczny;
       eksport CSV i Excel (operacje, miesiące), PDF (debriefing, przegląd roczny), pełna kopia w ZIP; smaczki ICT.
   - Grupa C (1.1.0) gotowa – PR do `main`, scalenie przy zielonym CI (D71); odbiór na Windows – listy w sekcjach E5
     i E6 niżej.
   - Bez nowych połączeń sieciowych: wszystko liczone z rekordów folderu.
2. **Pytania z propozycją**
   - **Start gry:** od pierwszego pełnego dnia po uruchomieniu 1.2.0 – stopień Kadet, seria 0; dni wcześniejsze tylko
     w statystykach Wywiadu (specyfikacja: „gra startuje od zera w dniu instalacji”).
   - **Co łamie dzień** (dzień zgodny = bez złamanego rozkazu):
     - zwykłe naruszenie – przerywa serię, nie liczy się do degradacji: energia dnia poniżej zera na jego koniec
       (przekroczony przydział), koperta planowa przekroczona o najwyżej 20%, kontener dodany albo podniesiony ponad
       linię zanurzenia (40% pensji);
     - poważne – przerywa serię i liczy się do degradacji (specyfikacja): koperta przekroczona o ponad 20%, osłony
       poniżej minimum przez Twoją decyzję (wydatek, podział łupów, przelew – nie przez wypłatę pensji), dopłata do konta
       tradingowego XTB wbrew firewallowi, potwierdzony zakup w ciszy nocnej;
     - dzień bez wpisów jest zgodny; ocena bierze dane znane w chwili zamrożenia (import po zamrożeniu zmienia budżet,
       nie ocenę).
   - **Awans i degradacja:** awans po 30 dniach zgodnych w ostatnich 35, liczonych od ostatniej zmiany stopnia (po
     awansie licznik od zera); każda wykonana misja liczy się jak 3 dni zgodne; degradacja od razu przy 3. poważnym
     naruszeniu w miesiącu kalendarzowym (Kadet nie spada niżej), po niej licznik od zera. Klasa okrętu rośnie i spada
     z zasięgiem; wyższa klasa – krótka animacja i dźwięk jak przy awansie, niższa – informacja w dzienniku wachty.
   - **Progi gry:** na start jak w specyfikacji (30 z 35 dni, 20% koperty, 3 poważne naruszenia, misja = 3 dni),
     wspólne dla folderu i do zmiany w Dowództwie; kalibracja po pierwszym miesiącu na Twoich danych (kwestia otwarta
     w specyfikacji).
   - **Misje tygodniowe:** jedna na tydzień (poniedziałek–niedziela), dobrana w poniedziałek do najsłabszego punktu
     z ostatnich 4 tygodni (bez słabego punktu – kolejna z puli), rozliczona po zamrożeniu niedzieli. Pula:
     1. „Killzone” – w Twojej killzone wydatków (dzień tygodnia × godzina z największymi wydatkami) najwyżej połowa
        średniej;
     2. „Pełna energia” – 7 dni bez przekroczenia przydziału;
     3. „Cisza w eterze” – tydzień bez zakupów w ciszy nocnej;
     4. „Koperta pod kontrolą” – koperta najczęściej przekraczana najwyżej na 80% swojej części tygodnia;
     5. „Zero impulsów” – żaden zakup oznaczony jako impuls;
     6. „Dzień bez wydatków” – co najmniej 2 dni bez żadnego wydatku;
     7. „Łączność z bazą” – co najmniej 2 importy z mBanku w tygodniu;
     8. „Inwentaryzacja” – potwierdzone salda wszystkich kont;
     9. „Rozliczenie z domem” – należność domu zmniejszona (gdy jest starsza niż 14 dni).
   - **Ukryte osiągnięcia** (widać zdobyte i liczbę ukrytych): „Cisza w eterze” (30 dni bez nocnych zakupów), „Pełne
     osłony” (osłony na celu), „Pancerny kadłub” (kadłub na celu), „Asteroida rozbita” (opłata roczna w całości
     z odkładki), „Pierwsze dokowanie” (wypłata z ICTTJ zadokowana), „Cel osiągnięty” (pierwszy cel z Mapy gwiezdnej),
     „Seria 7”, „Seria 30”, „Seria 100”, „Hat-trick” (3 miesiące z rzędu na plus), „Snajper” (miesiąc, w którym każda
     koperta zamknęła się w 90–100% limitu), „Czyste konto” (pożyczka wzięta spłacona), „Flagowiec” (zasięg 12 miesięcy).
   - **Smaczki ICT** (propozycja ze specyfikacji i dwie nowe):
     - Judas Swing – zakup oznaczony jako impuls (dopisek w dzienniku wachty);
     - Turtle Soup – zwrot towaru (wydatek na plus);
     - Liquidity sweep – dzień zakończony z energią równą dokładnie 0 zł;
     - Order Blocks – kontenery ładowni jako strefy na wykresie miesiąca w Wywiadzie;
     - Silver Bullet – krótka odprawa (trzy zdania), gdy otwierasz FI między 10:00 a 11:00 czasu NY (zwykle 16:00–17:00
       w Polsce);
     - nowe: Premium / Discount – na paskach kopert linia „Equilibrium” (część miesiąca, która minęła): wydane ponad nią
       = Premium, poniżej = Discount; Draw on Liquidity – najbliższy cel na Mapie gwiezdnej oznaczony „DOL”.
   - **Krzywa majątku:** majątek = suma sald kont budżetu na koniec każdego tygodnia (od salda otwarcia, z importowaną
     historią także wstecz); swingi z tygodniowych zamknięć; BOS = przebicie ostatniego swingu w kierunku trendu, CHoCH =
     pierwsze przebicie przeciwnego swingu (zmiana trendu).
   - **Raporty:** raport wachty w niedzielę od 18:00 (tydzień poniedziałek–niedziela, z powiadomieniem); debriefing jak
     w Planie miesiąca, z FVG kopert i grą; przegląd roczny od 1 stycznia za poprzedni rok (każdy wcześniejszy rok też
     do otwarcia); eksport zawsze z prawdziwymi kwotami (ukrycie kwot dotyczy ekranu – okno eksportu o tym mówi).
3. **Co przygotować**
   - Odbiór 1.1.0 na Windows (listy w sekcjach E5 i E6 niżej): folder ICTTJ, dokowanie, Mapa gwiezdna, pożyczki, Radar.
   - Akceptacja albo zmiany list (misje, osiągnięcia, smaczki) i progów; własne pomysły mile widziane.
   - Nic więcej – bez kluczy i bez nowych połączeń sieciowych.
4. **Model, thinking, czas:** Opus 5.5 · **max** (z górką – gra ocenia każdy dzień na prawdziwych danych i zamraża
   wynik na zawsze; krzywa majątku z BOS / CHoCH, raporty PDF i Excel to dużo nowego kodu) · 2–3 h.

## Przed etapem E5 (grupa C)

1. **Co trzeba wiedzieć**
   - Zakres grupy C → wydanie 1.1.0:
     - E5 ICTTJ i dokowanie: odczyt folderu ICTTJ (tylko `payouts/` i `forecasts/`, z obserwacją zmian), okno dokowania
       z podziałem dostawy i dopasowanym kontem, pule Cele i Podatek, przypomnienie o brakującym wpisie w ICTTJ,
       firewall dopłat do konta tradingowego (D59), Mapa gwiezdna (cele z prognozy ICTTJ i własne, priorytety, ETA),
       przycisk „Otwórz ICTTJ”, powiadomienie „Nowa wypłata w ICTTJ do zadokowania”;
     - E6 Radar i należności: Radar 90 dni (pensje, asteroidy, raty pożyczek, przypomnienie o PIT-38 – termin
       30 kwietnia, bez kwoty), pożyczki w obie strony z harmonogramem, należność od domu, przypomnienia.
   - Grupa B (1.0.0) gotowa – PR #4 czeka na scalenie i odbiór (lista w sekcji E4 niżej).
   - W ICTTJ nic się nie zmienia; FI tylko czyta (D60).
2. **Pytania z propozycją**
   - **Folder ICTTJ:** FI podpowiada ścieżkę zapisaną w ustawieniach ICTTJ na tym komputerze (czyta tylko ścieżkę),
     zatwierdzasz ją w Ustawienia → ICTTJ albo wskazujesz folder ręcznie; ustawienie każdego komputera osobno.
   - **Wypłaty sprzed startu budżetu:** pomijane (są już w saldach otwarcia), widoczne na liście jako „sprzed startu”.
   - **Dopasowanie do mBanku:** ta sama kwota w PLN, wpływ od XTB do 3 dni roboczych po dacie wpisu w ICTTJ (wypłaty
     z piątku przychodzą w poniedziałek–wtorek); bez pary po 3 dniach roboczych – propozycja Portfela XTB (D56)
     do potwierdzenia przy dokowaniu.
   - **Okno dokowania:** tylko dla wypłat z ICTTJ i wpływów od XTB; podział proponowany według kolejności (osłony →
     kadłub → cele, D13), do zmiany przed zapisem, z animacją i dźwiękiem dokowania. Inne wpływy (od domownika jako
     przychód, zwroty) dokują same według kolejności, bez okna.
   - **Pula Cele:** prosto do celów z prognozy ICTTJ według ich kolejności, potem do własnych celów FI; co się nie
     zmieści – do osłon jako „wolne do decyzji”.
   - **Mapa gwiezdna:** cele ICTTJ tylko do odczytu (nazwa, kwota), własne cele FI z kwotą, terminem i priorytetem;
     jedna lista priorytetów dla obu rodzajów (przeciąganie, nowe na końcu); ETA ze średnich dostaw do celów
     z ostatnich 6 miesięcy.
   - **„Otwórz ICTTJ”:** uruchamia zainstalowany ICTTJ; wersję portable wskazujesz raz (plik .exe) w ustawieniach
     komputera.
   - **Pożyczka udzielona:** kwota wychodzi z osłon (spec), raty według harmonogramu wracają do osłon; zaległa rata –
     przypomnienie po 3 dniach.
   - **Pożyczka wzięta:** otrzymana kwota trafia do osłon, ale zasięg liczy osłony pomniejszone o pozostały dług;
     raty – kontener ładowni na czas spłaty.
   - **PIT-38 na radarze:** od 1 lutego, powiadomienie 14 i 3 dni przed 30 kwietnia (jak asteroidy).
   - **Należność od domu:** w odprawie, gdy najstarszy niespłacony zakup „do zwrotu” ma ponad 30 dni.
3. **Co przygotować**
   - Odbiór 1.0.0 na Windows (lista w sekcji E4 niżej).
   - Ścieżka do folderu danych ICTTJ na każdym komputerze (FI czyta tylko `payouts/` i `forecasts/`).
   - Pliki testowe przygotuję sam na podstawie schematu ICTTJ – bez Twoich danych; zanonimizowana kopia `payouts/`
     potrzebna tylko wtedy, gdy masz wpisy nietypowe.
   - Bieżące pożyczki (kwota, raty, terminy) – do wpisania po wydaniu 1.1.0.
4. **Model, thinking, czas:** Opus 5.5 · **max** (z górką – przepływy prawdziwych pieniędzy z zewnątrz i zmiany
   w silniku: dokowanie, pule, pożyczki) · 2–3 h.

## E6 – Radar i należności (17.10.2026)

Zrobione (zakres z „Przed etapem E5”, odpowiedzi D72):
- Radar (Ctrl+7): 90 dni – pensje 1. dnia, każda płatność asteroid w oknie (stan zbiornika), raty własne i spodziewane
  spłaty (zaległe oznaczone), PIT-38 od 1 lutego do 30 kwietnia bez kwoty (T73).
- Pożyczki w obie strony: nowa z harmonogramem miesięcznym i operacją na koncie; udzielona – spłaty wracają do osłon,
  należność na Mostku i Radarze; wzięta – kontener „Rata: …” w Ładowni na czas spłaty, dług odjęty od zasięgu (Mostek,
  symulacja Ładowni); „spłata otrzymana” / „zapłać ratę”, zamknięcie, usunięcie bez operacji; w edytorze operacji wybór
  pożyczki (T70–T72).
- Należność domu: najstarszy niespłacony zakup „do zwrotu” (spłaty od najstarszych) – w odprawie po 30 dniach (T71, T74).
- Powiadomienia: zaległa rata po 3 dniach, PIT-38 14 i 3 dni przed terminem – każde z przełącznikiem (T74).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione:
  - należności pożyczek, wiek należności domu i dług liczone raz – w silniku (Mostek i Radar zawsze zgodne);
  - spłata pożyczki udzielonej bez operacji wypływu (pożyczone przed startem) wraca do osłon, zamknięta bez należności;
  - powiązanie z pożyczką tylko dla operacji „Pożyczka”; usunięcie pożyczki sprawdza też raty z importu;
  - zasięg w symulacji Ładowni z długiem; zasięg nigdy ujemny;
  - domyślna pierwsza rata istniejącego dnia (31 → koniec miesiąca), kwota spłaty = to, co należne teraz;
  - każda nowa zaległa rata = nowe przypomnienie; kolory zaległości w akcencie.
- Testy: 310 unit + fs (`tests/unit/loans.test.ts`), E2E 13 (`tests/e2e/radar.spec.ts`).
- CI Windows w PR #5 złapał dwa błędy, których Linux nie pokazał:
  - pole kwoty zaznaczało tekst w następnej klatce, a `select()` przenosi fokus – spóźniona klatka (okno odświeżane
    z opóźnieniem) zabierała fokus następnemu polu i wpisana tam liczba trafiała do kwoty (pożyczka 2 zł zamiast
    600 zł); teraz zaznacza tylko, gdy pole nadal ma fokus (odtworzone lokalnie przed poprawką i sprawdzone po niej);
  - test ICTTJ porównywał ścieżki z „/”, a Windows podaje je z „\”.

Do sprawdzenia przez użytkownika (po wydaniu 1.1.0, Windows):
1. Radar: najbliższe pensje, opłaty okresowe ze stanem zbiorników.
2. Bieżące pożyczki: „Nowa pożyczka” (udzielona / wzięta, raty), spłata – kwota otwarta maleje, Mostek → Do zwrotu.
3. Pożyczka wzięta: kontener „Rata: …” w Ładowni, „Dług” na Mostku, zasięg pomniejszony.
4. Odprawa: zakup „do zwrotu” starszy niż 30 dni; w lutym – PIT-38 na Radarze.

## E5 – ICTTJ i dokowanie (17.10.2026)

Zrobione (zakres z „Przed etapem E5”, odpowiedzi D72):
- Odczyt ICTTJ tylko do odczytu: `payouts/` (wypłaty z pulą, zwroty do masy; wydatki pominięte) i `forecasts/` (cele
  scenariuszy), z obserwacją zmian i odczytem co 30 s; nowszy format ICTTJ albo zepsuty plik = ostrzeżenie (T62).
- Ustawienia → ICTTJ: podpowiedź folderu (ścieżka, której ICTTJ używa na tym komputerze), „Wskaż folder…”, wyłączenie;
  scenariusz celów (domyślnie zmieniony ostatnio); program ICTTJ – zainstalowany znaleziony sam, portable wskazany raz.
- Dopasowanie wypłat do wpływów z XTB w mBanku (kwota, do 3 dni roboczych), Portfel XTB po oknie i nowym imporcie,
  wpływ z XTB bez wpisu z przypomnieniem, wpisy sprzed startu pominięte, „Pomiń wpis” (T63).
- Okno dokowania: źródło z pulą, dopasowane konto (albo nowa operacja na Portfelu XTB), podział proponowany silnikiem
  według kolejności dokowania do zmiany przed zapisem, firewall przy zwrocie do masy, animacja i dźwięk, „Cofnij”;
  Mostek → panel „Dokowanie” i pozycje odprawy (T64, T68).
- Silnik: pula Cele najpierw do celów ICTTJ, zwrot z puli Podatek z rezerwy podatkowej (T65).
- Mapa gwiezdna (Ctrl+6): cele ICTTJ (tylko do odczytu) i własne na jednej liście priorytetów (przeciąganie, strzałki),
  kwota wobec celu, termin, ETA z tempa ostatnich miesięcy, archiwum (T66, T67).
- „Otwórz ICTTJ” w menu bocznym i palecie; powiadomienie „Nowa wypłata w ICTTJ do zadokowania” (T68).
- Przegląd `/code-review` high: 10 znalezisk, 9 poprawionych:
  - wybór folderu w trakcie odczytu poprzedniego czyta nowy od razu; zatrzymanie nie zostawia obserwatorów;
  - Portfel XTB proponowany dopiero, gdy import z mBanku sięga za okno dopasowania (bez podwójnego liczenia);
  - dwa dokowania jednej operacji – silnik i okno biorą to samo (wcześniejsze);
  - zadokowana dostawa bez operacji w folderze nie tworzy drugiej operacji;
  - zwrot do masy nazwany zwrotem w odprawie; zarchiwizowany cel znika z zapisanego podziału;
  - kliknięcie powiadomienia otwiera tę wypłatę, nie pierwszą z listy; jedna krótka data dla odprawy i powiadomień.
  Pominięte świadomie: pamięć podręczna plików ICTTJ po czasie modyfikacji – folder ma kilkadziesiąt małych plików,
  ponowny odczyt co 30 s kosztuje ułamek sekundy.
- Testy: 301 unit + fs (`tests/unit/dock.test.ts`, `tests/fs/ictj.test.ts`), E2E 12 (`tests/e2e/ictj.spec.ts`).

Do sprawdzenia przez użytkownika (po wydaniu 1.1.0, Windows):
1. Ustawienia → ICTTJ: „Użyj tego folderu” (albo „Wskaż folder…”) na każdym komputerze; liczba wypłat się zgadza.
2. Mostek → „Dokowanie”: wypłata z ICTTJ z wpływem z mBanku (po imporcie) → okno → „Zadokuj”; podział w osłonach /
   kadłubie / celach jak oczekujesz.
3. Wypłata na Portfel XTB (bez wpływu w mBanku) → po 3 dniach roboczych i imporcie: „Zadokuj na Portfelu XTB”.
4. Mapa gwiezdna: cele z prognozy ICTTJ (wybrany scenariusz w Ustawieniach), własny cel, kolejność, ETA.
5. „Otwórz ICTTJ” w menu bocznym (wersja portable: wskaż plik .exe w Ustawienia → ICTTJ).
6. Nowa wypłata wpisana w ICTTJ przy otwartym FI → powiadomienie i pozycja na Mostku.

## E4 – Mostek i szybki wpis (17.10.2026)

Zrobione (kryteria z `plan.md`):
- Mostek (Ctrl+1): odprawa – energia dziś, Daily Bias, alarmy miesiąca, asteroidy w 14 dni, zaległy import, salda,
  łupy, „Odsłuchaj” głosem systemu (T57); stan okrętu – osłony z minimum, energia, kadłub, cele, zbiorniki, podatek,
  łupy, zasięg, klasa, masa ładunku; koperty, do zwrotu, ostatnie operacje. Odprawa, Stan okrętu i Koperty odłączane
  na drugi monitor (T60).
- Szybki wpis (Ctrl+Alt+B w całym systemie; też przycisk na Mostku, paleta i menu zasobnika): małe okno nad
  wszystkimi, na ekranie od razu; wydatek, wpływ, do zwrotu, kwota, kontrahent z „oficerem”, kategoria, podział
  paragonu, konto, data i godzina, wpływ od domownika; podgląd energii dziś i koperty przed zapisem; cisza nocna
  z potwierdzeniem i krótkim wpisem, dziennik kapitański od progu; Enter zapisuje, Esc zamyka (T54).
- Zasobnik: energia dziś w dymku; menu Szybki wpis, Otwórz, Raport wachty dnia, Zakończ (T59).
- Ukrycie kwot Ctrl+$: w oknie, dymku, odprawie, powiadomieniach i oknach odłączonych, osobno na każdym komputerze
  (T55).
- Powiadomienia Windows z przełącznikami: odprawa, wieczorne dopisanie, energia i koperty, przekroczenia, asteroidy,
  import, salda, debriefing (T56); dźwięki: wpis, dokowanie, alarm, awans, miesiąc na plus – z głośnością (T58).
- Ustawienia: Warstwy i rozkazy (`fi.json`), Powiadomienia i dźwięki (ten komputer) ze skrótem szybkiego wpisu (T53,
  T61).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione:
  - kliknięte powiadomienie nie jest nadpisywane przejściem na Mostek;
  - odprawa także dla okna zostawionego na ekranie przez noc;
  - asteroidy tylko w czasie trwania kontenera;
  - przekroczenie przy wyłączonych przekroczeniach nie udaje „na wyczerpaniu”;
  - data ostatniego importu po warszawsku;
  - debriefing także wtedy, gdy 1. dnia komputer był wyłączony (do 7. dnia);
  - niedzielne salda nie po potwierdzeniu w tym tygodniu;
  - suwak głośności zapisuje po puszczeniu, skrót rejestrowany tylko przy zmianie;
  - jeden format kwot dla ekranów, odprawy i powiadomień (`shared/format.ts`).
- Testy: 278 unit + fs (`tests/unit/notify.test.ts`, `briefing.test.ts`), E2E 11 (`tests/e2e/bridge.spec.ts` – Mostek,
  szybki wpis, ukrycie kwot, osobne okno, ustawienia komputera).

Do sprawdzenia przez użytkownika (po wydaniu 1.0.0, Windows):
1. Po aktualizacji baner „Kreator startu” → kreator na prawdziwych danych (salda teraz, import historii, pensja,
   warstwy, ładownia, koperty) → „Uruchom budżet”.
2. Mostek: odprawa, Daily Bias, stan okrętu, koperty; „Odsłuchaj” (polski głos: Ustawienia Windows → Czas i język →
   Mowa).
3. Ctrl+Alt+B z innego programu (np. platformy tradingowej) → szybki wpis → Enter; zakup z godziną po 23:00 →
   potwierdzenie i krótki wpis.
4. Zasobnik: energia dziś w dymku; Ctrl+$ ukrywa kwoty także tam.
5. Powiadomienia: rano odprawa po otwarciu okna, o 21:00 dopisanie wydatków; Ustawienia → Powiadomienia i dźwięki –
   przełączniki, głośność, skrót.
6. Panel „Stan okrętu” → „Otwórz w osobnym oknie” na drugim monitorze.
7. Plan miesiąca i Ładownia (lista w sekcji E3 niżej).

## E3 – start i plan miesiąca (17.10.2026)

Zrobione (kryteria z `plan.md`):
- Kreator startu (paleta „Kreator startu budżetu”, baner, dopóki budżet nie działa): salda teraz, historia z mBanku
  (import i powrót do kreatora), pensja ze średnich i cele warstw, ładownia z powtarzających się płatności i koperty
  ze średnich, podział obecnych środków według dokowania, okręt, rozkazy, skrót szybkiego wpisu, start z Windows (T51).
- Plan miesiąca (Ctrl+4): pensja z propozycją, podział pensji (ładownia, odkładki, koperty planowe i codzienne,
  niezaplanowane), dzienny przydział (energia dziś), koperty wobec limitów, debriefing – plan i fakt (FVG kopert),
  „Miesiąc zamknięty na plus”, podział łupów do 7. dnia (T46, T52); pierwszy miesiąc: pensja bez tego, co wydał przed
  startem (T45).
- Ładownia (Ctrl+5): kontenery (stały, abonament, rata; cykl; płatność; konto; kategoria; odbiorca w banku), linia
  zanurzenia, odkładki ze stanem zbiornika i zaległością wobec planu, symulacja dodania i zrzutu, propozycje z historii
  (T48–T50); import i Operacje łączą płatności z kontenerem (T49).
- Przejazdy (D69): Auto · przejazdy, reguły startowe Bolt → Rozrywka i hobby, KOLEO → Auto · przejazdy.
- Przegląd `/code-review` high: 9 znalezisk – poprawione: Enter w szybkim wpisie zapisywał stary szkic, kreator z palety
  mógł zrestartować działający budżet, konto bez salda liczyło historię od zera, odbiorca bez kontrahenta (sam tytuł)
  nie łączył się z kontenerem, opłata okresowa sprzed startu zmniejszała pierwszą pensję, łupy debriefingu nigdy ujemne,
  zbędne przeliczenia propozycji, zieleń tylko dla kwot; podłączenie zasobnika, powiadomień i stanu skrótu – w E4.
- Testy: 271 unit + fs (`tests/unit/plan.test.ts`), E2E 10 (`tests/e2e/month.spec.ts` – kreator, plan, ładownia).

Do sprawdzenia przez użytkownika (po wydaniu 1.0.0): kreator startu na prawdziwych danych (pensja, koperty, ładownia),
Plan miesiąca i Ładownia.

## Przed etapem E3 (grupa B)

1. **Co trzeba wiedzieć**
   - Zakres grupy B → wydanie **1.0.0** (MVP, D51):
     - E3 Start i plan miesiąca: kreator startu (konta i salda, import historii, propozycja pensji i celów warstw ze
       średnich kosztów, podział obecnych środków), ekran Plan miesiąca (pensja → ładownia, odkładki, koperty planowe
       i codzienne, dzienny przydział), Ładownia (kontenery, linia zanurzenia, symulacja zasięgu), debriefing
       z podziałem łupów i „Miesiąc zamknięty na plus”;
     - E4 Mostek i szybki wpis: Mostek (odprawa, stan okrętu, koperty, do zwrotu, ostatnie operacje), szybki wpis
       w małym oknie nad wszystkimi (globalny skrót, podgląd energii, cisza nocna, dziennik kapitański, do zwrotu,
       podział paragonu), zasobnik z energią dziś, tryb ukrycia kwot, powiadomienia i dźwięki.
   - Grupa A (0.3.0) gotowa: model danych, silnik warstw, Operacje, konta i kategorie, import z mBanku – czeka na
     scalenie i odbiór.
   - Otwarte: kategorie mBanku bywają nietrafne (dlatego są tylko podpowiedzią); przejazdy (Bolt, KOLEO) mBank
     przypisuje do „Przejazdy” i „Podróże”, a w kategoriach startowych nie ma na nie miejsca (pytanie niżej).
2. **Pytania z propozycją**
   - **Pensja w kreatorze:** średnie koszty netto (wszystko: ładownia, odkładki, koperty) z ostatnich 6 pełnych
     miesięcy, zaokrąglone w górę do 100 zł; cel osłon = 3 pensje, kadłub = 6 × średnie koszty (spec); wszystko do
     poprawienia.
   - **Podział obecnych środków:** propozycja według kolejności dokowania (osłony do celu → kadłub → cele), kwoty do
     poprawienia przed zapisem.
   - **Koperty pierwszego miesiąca:** średnie wydatki kategorii z 3 ostatnich pełnych miesięcy, zaokrąglone do 10 zł;
     codzienne i planowe jak w Ustawienia → Kategorie.
   - **Ładownia z historii:** kreator pokaże powtarzające się płatności (ten sam kontrahent i podobna kwota co miesiąc
     albo co rok) jako propozycje kontenerów – każdą trzeba potwierdzić.
   - **Szybki wpis:** skrót Ctrl+Alt+B (spec), okno na środku ekranu, Enter zapisuje, Esc zamyka; kategoria z listy
     z wyszukiwaniem, „oficer” podpowiada kategorię ostatnio użytą u tego kontrahenta.
   - **Ukrycie kwot:** Ctrl+$ jak w ICTTJ (okno i dymek zasobnika).
   - **Odprawa poranna:** przy pierwszym otwarciu okna po 5:00 (koniec ciszy nocnej) – powiadomienie Windows
     z energią dziś i alarmami, pełna odprawa na Mostku.
   - **Dźwięki:** domyślnie włączone i ciche (30%), osobno dla wpisu, dokowania, alarmu i awansu.
   - **Przejazdy:** nowa podkategoria „Auto · przejazdy (taxi, pociąg, komunikacja)” i podpowiedź mBanku „Przejazdy”
     → ta podkategoria.
3. **Co przygotować**
   - Odbiór 0.3.0 na Windows (listy E1 i E2 niżej), najlepiej z pełnym plikiem z mBanku – uwagi do rozpoznawania
     i reguł.
   - Stałe opłaty i opłaty okresowe (OC, przeglądy, abonamenty roczne) z kwotą i miesiącem – do Ładowni w kreatorze.
4. **Model, thinking, czas:** Opus 5.5 · **max** (z górką – uzasadnienie pod tabelą) · 4–6 h.

## E2 – import z mBanku (17.10.2026)

Zrobione (kryteria z `plan.md`):
- Plik z mBanku – „Lista operacji” albo „Historia rachunku” – w UTF-8 albo Windows-1250 (`shared/import/text.ts`,
  `mbank.ts`): nagłówek rozpoznany po kolumnach, opis rozbity na kontrahenta, rodzaj operacji i tytuł, transakcje
  nierozliczone, właściciel rachunku z `#Klient`, okres pliku; wiersze w innej walucie pominięte z informacją.
- Ekran Import (Ctrl+3): wybór albo upuszczenie pliku, konto budżetu, podsumowanie (nowe, znane, rozliczone,
  połączone, usunięte), podgląd i decyzje przed zapisem.
- Ponowny import nakładającego się okresu nie tworzy duplikatów (T35); nierozliczona operacja, która wróciła
  rozliczona (inna kwota albo data), przejmuje dane banku; zniknięta autoryzacja karty – propozycja usunięcia (T40).
- Wpis ręczny i wiersz z banku = jedna operacja (ta sama kwota, ±3 dni, podobny kontrahent – T36): zostaje kategoria,
  godzina i notatki użytkownika, dochodzą dane banku; połączenie można odznaczyć.
- Kategoryzacja grupami po kontrahencie i kierunku: wydatek z kategorią, do zwrotu, wpływ, od domownika, przelew
  własny, XTB; wyjątki dla pojedynczych wierszy. Rozpoznane same: XTB, przelewy własne (nazwisko z pliku
  i z ustawień), bankomat → Gotówka, zwrot towaru, opłaty banku (T37). Kategoria mBanku tylko jako podpowiedź (D68) –
  „Przyjmij podpowiedzi mBanku” ustawia je jednym kliknięciem, ale nie tworzy reguł.
- Reguły uczą się z decyzji (T38): „zapamiętaj” przy grupie (domyślnie zaznaczone przy własnej decyzji) i „Zapamiętaj”
  w edytorze operacji; Ustawienia → Import z banku: reguły z usuwaniem, nazwiska właściciela rachunku.
- Wpłata od domownika spłaca najpierw należność „do zwrotu” – także z zakupów w tym samym pliku – a nadwyżka jest
  przychodem (T41).
- Operacja usunięta przez użytkownika nie wraca z kolejnym importem; można ją zaimportować mimo to (T39).
- Kopia `backups/pre-import` przed zapisem (10 ostatnich); import zablokowany w folderze tylko do odczytu (T42).
- Saldo z banku po imporcie (i w Ustawienia → Konta): saldo otwarcia albo korekta do wyjaśnienia z alarmem.
- Plik testowy `tests/fixtures/mbank/lista_operacji.csv` z eksportu użytkownika, zanonimizowany (T44).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione – m.in. usunięta operacja wracała z kolejnym
  importem, podpowiedzi mBanku tworzyły reguły, zniknięte autoryzacje były zaznaczone same (także przy historii
  rachunku, która nie ma nierozliczonych), wpłata domownika nie spłacała zakupów „do zwrotu” z tego samego pliku,
  zmiana konta kasowała decyzje grup, import w folderze tylko do odczytu, mocniejsza anonimizacja pliku testowego,
  wspólny kod (`fold`, `upsertRule`, kopie). Nowy test wykrył jeszcze, że rozliczenie nierozliczonej porównywało
  nazwę zmienioną przez użytkownika – teraz porównuje nazwę z banku (`bank.counterparty`).
- Testy: 257 unit + fs, E2E 9 (import, Operacje ×3, smoke ×4, synchronizacja).

Do sprawdzenia przez użytkownika (po wydaniu 0.3.0):
1. Import (Ctrl+3) → „Wybierz plik CSV” → pełny plik z mBanku (Lista operacji albo Historia rachunku), konto mBank.
2. Grupy: rozpoznane (XTB, przelewy własne, Gotówka), kategorie dla największych grup, „Przyjmij podpowiedzi mBanku”
   dla reszty – sprawdź, które podpowiedzi są nietrafne – i „Importuj”.
3. Ten sam plik drugi raz → nic nowego; wpis ręczny z wieczora + import następnego dnia → jedna operacja.
4. Operacje → operacja z banku → inna kategoria → „Zapamiętaj”; Ustawienia → Import z banku → reguła na liście.
5. Na końcu importu „Saldo w banku teraz” → saldo otwarcia; po kolejnym imporcie inna kwota → korekta w Operacjach.
6. Folder danych → `backups/pre-import` – kopia sprzed importu.

## Przed etapem E1 (grupa A)

1. **Co trzeba wiedzieć**
   - Zakres E1 (`plan.md`): pełne schematy zod wszystkich rekordów (operacja z podziałem paragonu, kontener, cel,
     plan miesiąca, dokowanie, pożyczka, saldo, gra), kwoty w groszach, silnik `shared/calc/fleet.ts` z testami na
     przykładach ze specyfikacji (dokowanie 5 000 zł, pensja z kadłuba, odkładka OC, przydział dzienny, „do zwrotu”,
     pule Cele / Podatek), konta i kategorie w Ustawieniach, ekran Operacje (dodawanie, edycja z historią, usuwanie
     z „Cofnij”, filtry, wyszukiwanie). Wydanie 0.2.0.
   - E0 zakończony (0.1.0); w ICTTJ jest błąd do zgłoszenia (kopia konfliktu `journal.json`), FI ma go poprawionego.
   - E2 można dołączyć do tej grupy, jeśli przed startem dostanę CSV z mBanku – wtedy wydanie 0.3.0.
2. **Pytania z propozycją**
   - **Kategorie startowe** (spec: 9 głównych z podkategoriami, do edycji). Propozycja podkategorii:
     Jedzenie (zakupy spożywcze, na mieście, kawa i przekąski) · Dom (czynsz i opłaty, media, wyposażenie, chemia) ·
     Auto (paliwo, serwis, ubezpieczenie, parking i opłaty) · Zwierzęta (karma, weterynarz, akcesoria) · Zdrowie
     (leki, lekarz, sport) · Rozrywka i hobby (wyjścia, hobby, podróże) · Subskrypcje i łączność (telefon, internet,
     streaming, aplikacje) · Osobiste (ubrania, kosmetyki, fryzjer) · Prezenty i inne (prezenty, inne). Do tego
     kategoria systemowa „Gotówka” (wypłata z bankomatu – spec).
   - **Konta startowe:** mBank i Portfel XTB, nazwy do zmiany, saldo otwarcia z datą wpisywane w Ustawienia → Konta
     (rekord `balances/`); pełny kreator startu przyjdzie w E3.
   - **Wygląd kwot na liście operacji:** wpływy zielone z „+”, wydatki bez koloru z „−”, zwrot towaru zielony
     (czerwień tylko dla przekroczeń i alarmów).
   - **Grupa A:** czy dołączasz CSV z mBanku teraz (E1 + E2 jednym ciągiem), czy E2 osobno później?
3. **Co przygotować**
   - Odbiór 0.1.0 na Windows (lista w sekcji E0 niżej).
   - Jeśli E1 + E2: zanonimizowany plik CSV z historii rachunku mBanku (kilka miesięcy; nazwy kontrahentów mogą zostać,
     numery kont i nazwiska zamaskuj) – trafi do `tests/fixtures/`.
4. **Model, thinking, czas:** Opus 5.5 · **max** (silnik pieniędzy – najwięcej reguł); E1: 2–3 h, E1 + E2: 3,5–5,5 h.

## E1 – model i silnik (17.10.2026)

Zrobione (kryteria z `plan.md`):
- Pełne schematy zod wszystkich rekordów (`shared/schema/records.ts`): operacja (rodzaje: wydatek, wpływ, przelew
  własny, XTB, PIT-38, pożyczka, korekta; podział paragonu, do zwrotu, plan / impuls, dziennik kapitański, zwrot
  należności, dane z banku), kontener (cykl, odkładka), cel, plan miesiąca (pensja, koperty, łupy), dokowanie (pula
  ICTTJ, podział), pożyczka, saldo (otwarcie / potwierdzenie), miesiąc gry; migracje gotowe (`SCHEMA_VERSION` 1 –
  pola dodane z domyślnymi wartościami, fi.json z E0 czyta się bez zmian).
- Ustawienia w fi.json (`shared/schema/budget.ts`): konta (mBank, Portfel XTB – stałe id), kategorie wg D68 (stałe id),
  warstwy (osłony 3 pensje, kadłub 6 miesięcy), rozkazy (min. osłony, linia zanurzenia 40%, cisza nocna 23–5, próg
  dziennika 200 zł, firewall), start budżetu, import (reguły – E2).
- Silnik `shared/calc/fleet.ts` (czysta funkcja, nic nie zapisuje; T24–T32): salda kont, dokowanie, pensja z alarmem
  żółtym / czerwonym, odkładki, dzienny przydział, łupy, do zwrotu i należności, pule Cele / Podatek, firewall, koszty
  netto, zasięg, klasa okrętu, masa ładunku; niezmiennik „suma warstw = salda kont” sprawdzany w każdym teście.
  Testy na przykładach ze specyfikacji (`tests/unit/fleet.test.ts`): dokowanie 5 000 zł (+3 360 / +1 640, zasięg
  6,5 → 7,8), pensja 4 000 zł z osłon 2 500 (żółty alarm), OC 11 × 103,33 + 103,37, przydział (przeniesienie i
  zmniejszenie), do zwrotu i zwrot z nadwyżką, pule Cele i Podatek.
- Ekran Operacje: lista (filtry okres / konto / rodzaj / kategoria / oznaczenia, wyszukiwanie bez polskich znaków i po
  kwocie, sumy, salda kont), edytor (rodzaj i kierunek, kwota, data i godzina, konto, kontrahent, kategoria, podział
  paragonu, do zwrotu, zwrot należności, konto docelowe przelewu, dziennik kapitański, dane z banku), historia zmian,
  usuwanie z „Cofnij”, Ctrl+N. Kwoty wg D68.
- Ustawienia → Konta (saldo otwarcia na początek dnia, „Saldo w banku teraz” → potwierdzenie albo korekta do
  wyjaśnienia) i Kategorie (nazwy, koperta codzienna / planowa / bez, podkategorie, archiwizacja).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione – m.in. wpisana kwota nie ginie przy Ctrl+N ani
  przy zmianie ekranu (T34), kierunek wybrany przed kwotą i znak części paragonu, potwierdzenie salda sprzed salda
  otwarcia, „Koszty” na liście jak w silniku, świeży zegar po powrocie z zasobnika, wartości ustawień z nowszej wersji
  zachowane (T33), silnik liczony raz dla wszystkich paneli.
- Testy: 237 unit + fs, E2E `tests/e2e/operations.spec.ts` (3) + E0 (5).

Do sprawdzenia przez użytkownika (po wydaniu grupy A):
1. Operacje (Ctrl+2): Ctrl+N, kwota, kategoria, „Podziel paragon”, „Do zwrotu”, wpływ (zielony z „+”).
2. Ustawienia → Konta: „Saldo w banku teraz” dla mBanku → saldo otwarcia; drugi raz inna kwota → korekta w Operacjach.
3. Ustawienia → Kategorie: zmiana nazwy, podkategoria, koperta codzienna / planowa.

## E0 – fundament (16.10.2026)

Zrobione (kryteria z `plan.md`):
- Stos jak ICTTJ (Electron 44, React 19, TS 6, Vite 7, Tailwind 4), build portable + NSIS, ikona (`scripts/make-icon.mjs`).
- CI: Linux (Node 22.12 / 24 / 26: typecheck, testy, build, sekcja CHANGELOG), E2E na Linuksie pod Xvfb, blokada Node
  22.11, Windows (build-windows.cmd, smoke spakowanej aplikacji, test aktualizacji portable i instalatora, wydanie).
- Folder danych przeniesiony z ICTTJ: zapis atomowy, historia `.history/`, konflikty kopii OneDrive i duplikatów,
  scalanie zmian z drugiego komputera, wpis przeniesiony zmianą daty, kopie (30 dziennych, ręczne, przed migracją),
  watcher, obecność komputerów; `fi.json` z `schemaVersion` 1.
- Pierwsze uruchomienie: propozycja `OneDrive\FinancialIntel` (D62) albo inny folder; zapamiętany folder przy kolejnym
  starcie.
- Zasobnik (zamknięcie chowa – D64), start z Windows ukryty w zasobniku (przełącznik), jedna instancja, logi.
- Aktualizacje z GitHub Releases (repozytorium publiczne – D61), token opcjonalny.
- Wygląd = tokeny ICTTJ; menu boczne (D44) ze wszystkimi ekranami (E5+ przygaszone – D65), puste ekrany z planowanymi
  panelami: zwijanie, powiększanie, ukrywanie, wysokość i szerokość, osobne okno, zapisane układy; paleta komend,
  skróty Ctrl+1…0, ściąga F1; Ustawienia: Okręt (nazwa okrętu, praca na kilku komputerach), Folder i kopie,
  Zasobnik i start, Aktualizacje; Synchronizacja (konflikty, pliki z błędami, usunięte wpisy, historia).
- Testy: `tests/unit`, `tests/fs`, `tests/e2e` (smoke, panele, ustawienia, synchronizacja), `tests/update` (Windows CI).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione – m.in. folder ICTTJ nigdy nie staje się folderem FI
  (`DataStore.inspect` 'ictj'), dane FI bez `fi.json` (OneDrive w trakcie) nie dostają nowych danych ani zagnieżdżonego
  `FinancialIntel\FinancialIntel` ('partial'), niedostępny folder bez „Utwórz dane tutaj”, kopie i eksport tylko z danymi
  (`isDataFile`), rekord bez id dostaje id z nazwy pliku (`idFromPath`), kopia / eksport / rozstrzygnięcie konfliktu
  dopiero po zapisaniu zmian, plik `firma.json` nie jest kopią `fi.json`.
- Poprawka względem ICTTJ: zachowanie kopii konfliktu pliku ustawień przekazuje nowe ustawienia do okna (w ICTTJ
  `journal.json` zostawał w oknie stary i autozapis mógł nadpisać zachowaną kopię – do zgłoszenia w ICTTJ).

Do sprawdzenia przez użytkownika (Windows 11):
1. Pobrać `Financial-Intel-Setup.exe` i `Financial-Intel-portable.exe` z wydania v0.1.0 (albo z artefaktu PR).
2. Pierwsze uruchomienie → „Utwórz w OneDrive” → w OneDrive powstaje `FinancialIntel\fi.json`.
3. Menu boczne, ekrany, panele (zwiń, powiększ, ukryj, osobne okno na drugim monitorze), Ctrl+K, F1.
4. Ustawienia → Okręt: nazwa okrętu; Zasobnik i start: start z Windows → restart komputera → ikona w zasobniku.
5. Zamknięcie okna chowa do zasobnika, „Zakończ” w menu ikony kończy.
6. Aktualizacja: po wydaniu 0.1.1 / 0.2.0 aplikacja sama ją pobierze i zainstaluje przy zamknięciu.

## Przed etapem E0 (zapis komunikatu z 16.10.2026)

1. **Co trzeba wiedzieć** – zakres: fundament (stos, CI, instalator i portable, aktualizacje, folder danych, zasobnik
   i autostart, menu boczne i puste ekrany w stylu ICTTJ, szkielet ustawień); kod przenoszony z ICTTJ @ 84a8339.
2. **Pytania z propozycją** (odpowiedzi użytkownika: wszystko zgodnie z propozycją, repozytorium publiczne) – D61–D66.
3. **Co przygotować** – nic przed startem; po wydaniu 0.1.0 test na Windows (lista wyżej). Token GitHub niepotrzebny
   (repozytorium publiczne).
4. **Model, thinking, czas** – Opus 5.5 · high (plan), z górką xhigh.

## Dziennik

- 16.10.2026 – specyfikacja, decyzje i plan po wywiadzie z użytkownikiem (rozmowa w Claude, nie w repozytorium).
- 16.10.2026 – przegląd punktów styku z ICTTJ (D54–D60): konto tradingowe tylko w ICTTJ, bez etapu „Okręt bojowy”,
  bez kosztów i bilansu tradingu; menu boczne potwierdzone (D44).
- 16.10.2026 – „Przed etapem E0”: D61 (repozytorium publiczne), D62–D66; roadmapa z modelem i thinking z górką.
- 16.10.2026 – E0 zrobiony (0.1.0), PR #1 scalony do `main`.
- 16.10.2026 – zasady prowadzenia (D67): tabela po każdym kroku, bez komendy nie zaczynam etapu, grupy A–E.
- 17.10.2026 – start grupy A (E1 + E2, D68), CSV z mBanku od użytkownika; E1 zrobiony od zera (model, silnik,
  Operacje, konta, kategorie), przegląd i poprawki.
- 17.10.2026 – E2 (import z mBanku), przegląd i poprawki; zamknięcie grupy A: 0.3.0, PR do `main`; „Przed etapem E3”
  (grupa B → 1.0.0, model max); pauza.
- 17.10.2026 – PR #3 scalony (0.3.0); odpowiedzi D69 (przejazdy) i D70; start grupy B na komendę użytkownika.
- 17.10.2026 – E3 (kreator startu, Plan miesiąca, Ładownia), przegląd i poprawki; E4 (Mostek, szybki wpis, zasobnik,
  ukrycie kwot, powiadomienia, dźwięki), przegląd i poprawki; zamknięcie grupy B: 1.0.0, PR #4 do `main`; „Przed
  etapem E5” (grupa C, model max); pauza.
- 17.10.2026 – PR #4 scalony, wydanie 1.0.0 opublikowane; przy sprawdzaniu wyszło, że 0.3.0 nie zostało wydane (E2E
  na `main` – wyścig w pomocniku testu operacji, poprawiony w grupie C); D71 (scalanie bez pytania przy zielonym CI)
  i D72 (odpowiedzi na „Przed etapem E5”); start grupy C na komendę użytkownika.
- 17.10.2026 – E5 (odczyt ICTTJ, dokowanie z oknem, Portfel XTB, pule Cele i Podatek, Mapa gwiezdna, „Otwórz ICTTJ”,
  powiadomienie o nowej wypłacie), przegląd i poprawki; dalej E6 bez pauzy.
- 17.10.2026 – E6 (Radar 90 dni, pożyczki w obie strony, należność domu, PIT-38, powiadomienia), przegląd i poprawki.
- 17.10.2026 – zamknięcie grupy C: 1.1.0, PR do `main`; „Przed etapem E7” (grupa D → 1.2.0, model max); pauza.
- 17.10.2026 – Windows CI w PR #5 złapał błąd pola kwoty (fokus) i ścieżki w teście – poprawione; PR #5 scalony,
  wydanie 1.1.0 opublikowane; komenda startu grupy D z propozycjami „Przed etapem E7” (D73), bez asystenta AI (D74 –
  E9 wypada).
- 17.10.2026 – E7 (Dowództwo: ocena i zamrażanie dni, stopnie, misje, osiągnięcia, dziennik wachty, smaczki ICT), przegląd
  i poprawki; zgłoszenie użytkownika o grupowaniu importu – pomysły podane, czeka na wybór.
- 17.10.2026 – E8 (Wywiad: krzywa majątku z BOS / CHoCH, Killzones, FVG, Order Block, zasięg, dziennik; Raporty i eksport
  CSV / Excel / PDF / ZIP, raport wachty w niedzielę), przegląd i poprawki.
- 17.10.2026 – zamknięcie grupy D: 1.2.0, PR do `main`; plan etapów E0–E8 zamknięty (E9 wypada – D74); propozycja
  usprawnienia importu (1.2.1) czeka na wybór użytkownika; pauza.
- 17.10.2026 – PR #6 scalony, wydanie 1.2.0 opublikowane; komenda startu 1.2.1 (D75: pomysły 1 + 3 + 4 + 2), w trakcie
  dopisane wyszukiwarka i zaznaczanie (D76) oraz duplikaty jak w ICTTJ (D77); klucz marki, słownik sieci, słowa
  kluczowe, tematy z „Przyjmij pewne”, decyzje zbiorcze w imporcie i Operacjach, scalanie duplikatów; trzy przeglądy
  i poprawki; PR #7 do `main`; pauza.
- 17.10.2026 – PR #7 scalony, wydanie 1.2.1 opublikowane; użytkownik wybrał „opcję 2” – pomysły 5 i 6 (D78): podobne
  nazwy z połączeniem zapamiętanym w folderze, „Połącz nazwy”, propozycja reguły z liczbą operacji; dwa przeglądy i
  poprawki; PR #8 scalony, wydanie 1.2.2 opublikowane; pauza.
- 17.10.2026 – zgłoszenie użytkownika (D79): podobne nazwy nie działają na historii rachunku (daty w nazwach, wspólne
  słowa); poprawka 1.2.3 – nazwy bez dopisków banku, ostrożniejsze podobieństwo i propozycje; przegląd i poprawki; PR
  #9 do `main`; użytkownik przysłał historię rachunku – sprawdzenie na niej (T104), poprawki formatu banku, prowizji,
  zwrotu towaru i pośredników, drugi przegląd.
- 17.10.2026 – PR #9 scalony, wydanie 1.2.3 opublikowane; prośba użytkownika: część wydatków finansują domownicy –
  propozycja (wariant A: saldo każdej osoby w obie strony), odpowiedzi i komenda „Ok” (D80); start 1.3.0.
- 18.10.2026 – 1.3.0 (rejestr rozliczeń, depozyt w warstwach, domownicy w Ustawieniach, import z osobami, edytor, szybki
  wpis, Operacje, Mostek, Radar, raporty), przegląd i poprawki; PR #10 do `main`.
- 18.10.2026 – PR #10 scalony, wydanie 1.3.0 opublikowane; zgłoszenie użytkownika: domownicy bez bankowości (pieniądze
  przez innego domownika, kilka osób w jednym przelewie), rozliczenia od dziś, przychody ze średnich – propozycje,
  odpowiedzi i komenda „Ok” (D81); start 1.4.0.
- 18.10.2026 – 1.4.0 (rozliczenia od dnia z saldem na start, podział wpłaty na osoby, pośrednik jako podpowiedź, panel
  „Przychody” z pracą i tradingiem XTB netto), przegląd i poprawki; PR #11 do `main`.
- 18.10.2026 – PR #11 scalony, wydanie 1.4.0 opublikowane; zgłoszenie: otwarcie folderu na drugim komputerze wisi –
  diagnoza (log bez „opened”, OneDrive tylko online, 4 wątki), zakres przyjęty, model po diagnozie (D82); 1.4.1 (postęp
  wczytywania, „Przerwij”, log, pula wątków), przegląd i poprawki; PR #12 do `main`.
