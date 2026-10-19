# Financial Intel – postęp

**Stan:** ciąg grup M–V (D87 – zgoda na całość bez przerw między grupami) – **grupa S** (1.7.0 – operacje, funkcje)
na gałęzi `claude/grupa-s-1.7.0`, PR do `main`; po niej od razu funkcje T, U, V – każda grupa z własnym PR i wydaniem
(D71).
**1.6.6 scalone bez wydania** (PR #28 – E2E ukrywania kwot na Windows na `main`: wyścig zapisu ustawień komputera, poprawka i obie wersje w 1.7.0), **1.6.5 scalone bez wydania** (PR #27 – job Windows na `main` padł na wolnym runnerze, wchodzi w 1.6.6), **1.6.4 wydane** (PR #26), **1.6.3 wydane** (PR #25), **1.6.2 wydane** (PR #24), **1.6.1 wydane** (PR #23), **1.6.0 wydane** (PR #22), **1.5.4 wydane** (PR #21; job Windows na `main` za drugim razem – za pierwszym jednorazowo zawiesił się test duplikatów,
ten sam kod przeszedł w PR, po ponowieniu i lokalnie 5 razy z rzędu), **1.5.3 wydane** (PR #20), **1.5.2 wydane** (PR #19),
**1.5.1 wydane** (PR #18), **1.5.0 wydane**
(PR #17), **1.4.3 wydane** (PR #15 i poprawka szybkiego wpisu PR #16 – E2E na `main` złapał podwójny licznik zamknięcia
okna), **1.4.2 wydane** (PR #14), przegląd po 1.4.1 scalony (PR #13, `docs/przeglad/`),
**1.4.1 wydane** (PR #12), **1.4.0 wydane** (PR #11), **1.3.0 wydane** (PR #10), **1.2.3 wydane** (PR #9), **1.2.2 wydane** (PR #8), **1.2.1 wydane** (PR #7), **1.2.0 wydane** (PR #6), **1.1.0 wydane** (PR #5),
**1.0.0 wydane** (PR #4); bez asystenta AI (D74) plan etapów E0–E8 jest zamknięty. Wydanie 0.3.0 nie wyszło: E2E na `main` po scaleniu PR #3 padło
na wyścigu w teście (plik usuwany w trakcie odczytu), więc job Windows z publikacją się nie uruchomił – zastąpione przez
1.0.0; testy czytają folder przez `tests/e2e/files.ts`.
**Następny krok:** grupa S → scalenie po zielonym CI → wydanie 1.7.0 → od razu grupa T (D87). Po wznowieniu
pracy: sprawdzić, która grupa jest w toku (gałąź `claude/grupa-<litera>-<wersja>`, PR) i kontynuować. Do sprawdzenia w
aplikacji: 1.5.0–1.7.0 – listy w sekcjach niżej.

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
| 1.4.1 | Wczytywanie folderu krok po kroku: postęp, „Przerwij”, log diagnostyczny, większa pula wątków (D82) | Opus 5.5 | **xhigh** | ok. 1 h (szacunek z przebiegu sesji; plan był ok. 1,5 h) | 1.4.1 | ✅ zgłoszenie, diagnoza i komenda (D82) | ✅ wydane (PR #12) |
| Przegląd | Przegląd całej aplikacji po 1.4.1: 10 obszarów × 3 soczewki (błędy, niespójności, wydajność), weryfikacja każdego znaleziska, pomiary na 30 tys. i 150 tys. operacji, brakujące funkcje (`docs/przeglad/`) | Opus 5.5 | **ultracode** | ok. 3 h (zegar sesji, bez przerwy na limit tygodniowy) | – | ✅ prośba, model i skala (150 tys.) | ✅ raport, PR #13 |
| **E** | 1.4.2 Pieniądze i dane się zgadzają: B1–B5, B6, B9–B11, B13, B24, B30, B32, B42–B51, B55, B56, N1 | Opus 5.5 | **max** | zmierzone ok. 2 h (zegar commitów, z przeglądem i E2E; plan był 4–5 h) | 1.4.2 | ✅ D84 (C1–C3) | ✅ wydane (PR #14) |
| **F** | 1.4.3 Szybkość przy dużym folderze: W1–W16, W21–W24, W26, kopie (F2, N19, C4), gra porcjami | Opus 5.5 | **max** | zmierzone ok. 2 h (zegar commitów, z pomiarami 30 / 150 tys., przeglądem i E2E; plan był 3–5 h) | 1.4.3 | ✅ D84 (C4) | ✅ wydane (PR #15, poprawka PR #16) |
| **G** | 1.5.0 Domownicy (D83: wielu finansujących, gotówka, prezent) + ICTTJ i dokowanie (B14–B22, B40, B41, N5) + święta (F42) | Opus 5.5 | **max** | zmierzone ok. 1,5 h (zegar gałęzi, z przeglądem i E2E; plan był 3–4 h) | 1.5.0 | ✅ D83 | ✅ wydane (PR #17) |
| **H** | 1.5.1 Import: B34–B39, N12–N16, „Cofnij import” (F4), saldo z pliku (F5), oficer zna marki (F8), audyt reguł (F22) | Opus 5.5 | **max** | zmierzone ok. 2,5 h (zegar sesji, z przeglądem i E2E; plan był 2–3 h) | 1.5.1 | ✅ D84 (C11) | ✅ wydane (PR #18) |
| **I** | 1.5.2 Liczby się zgadzają: B7, B8, B12, B23, B25, B26, B28, B57–B60, N3, N4, N6–N11, N21 | Opus 5.5 | **max** | zmierzone ok. 1 h (zegar sesji, z przeglądem i E2E; plan był 2–3 h) | 1.5.2 | ✅ D86 | ✅ wydane (PR #19) |
| **J** | 1.5.3 System, folder, dwa komputery: B27, B29, B31, B33, B52–B54, N2, N17, N18, N20, F21 | Opus 5.5 | **max** | zmierzone ok. 1,5 h (zegar gałęzi, z przeglądem i E2E; plan był 2–3 h) | 1.5.3 | ✅ D86 | ✅ wydane (PR #20) |
| **K** | 1.5.4 Wydajność – reszta: W17–W20, W25, W27 | Opus 5.5 | **max** | zmierzone ok. 2 h (zegar sesji, z pomiarami 30 / 150 tys., wzorcami wyników, przeglądem i E2E; część W27 w czasie CI grupy J; plan był ok. 2 h) | 1.5.4 | ✅ D86 | ✅ wydane (PR #21) |
| **L** | 1.6.0 Funkcje: opłaty stałe w miesiącu (F1), odzyskanie z kopii (F3), meldunki (F6), szybki wpis seriami (F7), wieczorne przypomnienie (F13) | Opus 5.5 | **max** | zmierzone ok. 1,5 h (zegar commitów, z przeglądem i E2E; część w czasie CI grupy K; plan był 3–4 h) | 1.6.0 | ✅ D86 | ✅ wydane (PR #22) |
| **M** | 1.6.1 Liczby, plan, raporty, Mostek: B61–B63, B65, B84, B85, B92, B126–B128, N22–N28, N30, N52, N54, N56, N59, N63, N65, N66, N101–N103, W28–W30, W38 | Opus 5.5 | **max** | zmierzone ok. 1,5 h (zegar sesji, z przeglądem i E2E; plan był ok. 2 h) | 1.6.1 | ✅ D87 | ✅ wydane (PR #23) |
| **N** | 1.6.2 Gra, ICTTJ, domownicy, cele, kreator: B69–B73, B75, B87, B89–B91, B129, N29, N38, N40–N49, N64, N67–N71, N73 | Opus 5.5 | **max** | zmierzone ok. 1,5 h (zegar sesji, z przeglądem i E2E; plan był ok. 2 h) | 1.6.2 | ✅ D87 | ✅ wydane (PR #24) |
| **O** | 1.6.3 Import: B93–B106, N74–N90, W31–W36 | Opus 5.5 | **max** | zmierzone ok. 1 h (zegar sesji, z przeglądem i dwoma pełnymi E2E; plan był ok. 2 h) | 1.6.3 | ✅ D87 | ✅ wydane (PR #25) |
| **P** | 1.6.4 Operacje, edytor, szybki wpis: B64, B66, B68, B74, B76–B83, B86, B88, B118, B125, N32, N36, N37, N39, N50, N51, N55, N104 | Opus 5.5 | **max** | zmierzone ok. 1 h (zegar sesji, z przeglądem, mutacjami i dwoma pełnymi E2E; plan był ok. 1,5 h) | 1.6.4 | ✅ D87 | ✅ scalone (PR #26) |
| **Q** | 1.6.5 Folder, system, dwa komputery: B67, B107–B117, B119–B124, N62, N91–N100, W37 | Opus 5.5 | **max** | zmierzone ok. 2 h (zegar sesji, z przeglądem, 31 mutacjami i dwoma pełnymi E2E; plan był ok. 2 h) | 1.6.5 (w 1.6.6) | ✅ D87 | ✅ scalone (PR #27), wydanie przepadło – wchodzi w 1.6.6 |
| **R** | 1.6.6 Teksty, wygląd, wygoda: N31, N33–N35, N53, N57, N58, N60, N61, N72, skala i kontrast (F30), ukrycie kwot po bezczynności (F40) | Opus 5.5 | **max** (plan był xhigh) | zmierzone ok. 1,5 h (zegar sesji, z przeglądem, 47 mutacjami, pełnym E2E i dwiema poprawkami CI; plan był ok. 1,5 h) | 1.6.6 (w 1.7.0) | ✅ D87 | ✅ scalone (PR #28), wydanie przepadło – wchodzi w 1.7.0 |
| **S** | 1.7.0 Operacje – funkcje: przelew z drugą nogą (F10), zbiorcze naprawy (F11), ostrzeżenie edycji (F12), filtry, sortowanie, widoki, eksport (F18), paleta szuka wpisów (F19), dziennik zmian folderu (F33) | Opus 5.5 | **max** | zmierzone ok. 2,5 h (zegar gałęzi, z przeglądem, 64 mutacjami i dwoma pełnymi E2E; część w czasie CI grupy R; plan był ok. 3 h) | 1.7.0 | ✅ D87 | ✅ PR do `main` |
| **T** | 1.8.0 Przyszłość: cel z terminem (F15), zaplanowane operacje na Radarze (F16), prognoza sald kont (F26), kurs na 12 miesięcy (F27), reszta koperty i pokrycie przekroczenia (F28), symulator „co jeśli” (F35), plan roczny (F37) | Opus 5.5 | **max** | plan ok. 4–5 h | 1.8.0 | ✅ D87 | czeka |
| **U** | 1.9.0 Ładownia i czujniki: ceny i martwe kontenery (F9), plik z mBanku w Pobranych (F14), opłaty cykliczne (F23), radar anomalii (F31), zwroty w drodze (F34) | Opus 5.5 | **max** | plan ok. 3 h | 1.9.0 | ✅ D87 | czeka |
| **V** | 1.10.0 Wywiad: tagi i wyprawy (F17), drążenie (F20), majątek netto (F24), stopa oszczędności (F25), „Skąd ta liczba?” (F29), osobista inflacja (F36) | Opus 5.5 | **max** | plan ok. 3 h | 1.10.0 | ✅ D87 | czeka |
| ~~E~~ | ~~E9 Pierwszy oficer~~ | – | – | – | – | – | ❌ wypada (D74: bez asystenta AI) |
| | **Całość E0–E8 + 1.2.1–1.4.1 + przegląd + E + F + G + H + I + J + K + L + M + N + O + P + Q + R + S** | | | **ok. 48,5 h** | | | |
| | **Ciąg M–V (D87, plan)** | | | **ok. 24–25 h** | | | |

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


## Przed grupą E – pieniądze i dane się zgadzają (18.10.2026)

1. **Co trzeba wiedzieć** – przegląd po 1.4.1 scalony (PR #13). Grupa E poprawia błędy, które psują kwoty albo gubią
   dane (`docs/przeglad/bledy.md`): B1 edytor kontenera zapisuje przy każdym znaku, B2 cele przeliczane wstecz (+ scenariusz
   ICTTJ), B3 podwójne salda domowników po zmianie daty rozliczeń, B4 dwóch domowników w jednym temacie importu, B5 ta sama
   operacja z historii i listy dwa razy, B6 fałszywe „Za plan o …” w Ładowni, B9 ciche nieudane usunięcie, B10 decyzja o
   łupach inna niż w silniku, B11 zmiana planu minionego miesiąca zmienia kolejne, B13 łupy do zarchiwizowanych celów, B30
   pieniądze zarchiwizowanego celu, B32 notatka naruszenia blokuje zapis miesiąca gry, B42–B49 folder danych i dwa
   komputery (błąd odczytu, zamknięcie po 4 s, konflikty bez historii, plany jednego miesiąca, scalanie trójstronne,
   zapis rekordu usuniętego gdzie indziej), B50 folder ponad 125 tys. plików, B51 podwójny szybki wpis, B55–B56 opłaty
   okresowe zapłacone wcześniej i życie kontenera, N1 wydatek z pieniędzy celu. Po E od razu F, G i H (D84).
2. **Co użytkownik musi powiedzieć** – ✅ D84: C1 zmiany celów od dnia zmiany, C2 pytanie o pieniądze archiwizowanego
   celu, C3 scenariusz ICTTJ zapamiętany przy pierwszym podłączeniu; komenda „Start E–H”.
3. **Co przygotować** – nic przed startem; po wydaniu 1.4.2: kwoty celów, osłon i salda domowników na prawdziwych
   danych (punkt kontrolny bez przerwy w pracy – D84).
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 4–5 h.

## 1.4.2 – pieniądze i dane się zgadzają (grupa E, 18.10.2026)

Zakres: błędy z przeglądu po 1.4.1, które psują kwoty albo gubią dane (D84, „Przed grupą E” niżej). Zrobione:
- Cele od chwili zmiany (C1, B2, B13): kolejność, kwota, archiwizacja i nowy cel nie przeliczają przeszłości; dostawa do
  celów z chwili, gdy przyszła do FI; łupy tylko do celów, które biorą pieniądze (T128).
- Pieniądze celu (C2, B30): archiwizacja z pieniędzmi pyta (osłony / inny cel / zostają, „Cofnij”), „przenieś środki”
  później; scenariusz ICTTJ zapamiętany, zmiana z potwierdzeniem (C3); wydatek z celu w edytorze operacji (N1) (T129–T131).
- Domownicy i import (B3–B5): saldo na start przeliczane przy zmianie daty rozliczeń, temat importu na osobę, ta sama
  operacja z historii rachunku i listy operacji raz (także w panelu duplikatów, tylko w dniach plików) (T132–T134).
- Ładownia, plan i łupy (B1, B6, B10, B11, B55, B56): edytor kontenera zapisuje po wyjściu z pola, opłata zapłacona przed
  terminem zamyka cykl, życie kontenera od dodania do archiwizacji, resztka zbiornika do osłon, plan minionego miesiąca
  nie zmienia kolejnych, stałe id planu, łupy na ekranie jak w silniku (T135–T139).
- Folder danych i dwa komputery (B9, B42–B50): nieudane usunięcie, plik chwilowo nieczytelny, zamykanie po zapisach,
  konflikty z historią i sprawdzaniem stron, plany miesiąca z dwóch komputerów, scalanie trójstronne, wpis usunięty
  gdzie indziej, folder ponad 125 tys. plików (T140–T143).
- Szybki wpis raz (B51), Esc w polach odrzuca szkic (B24 – z kolejnej grupy porządków, ten sam błąd), notatka gry (B32)
  (T144).
- Przegląd `/code-review` high: 10 kandydatów, 9 poprawionych, 1 bez zmian z uzasadnieniem (T145); przy okazji Esc w
  szybkim wpisie z wpisaną kwotą.
- Testy: 430 unit + fs (nowe `tests/unit/goals.test.ts`, `tests/fs/datastore-robust.test.ts`), E2E 22 (nowe
  `tests/e2e/goals.spec.ts`, poszerzone month, household, ictj, bridge, operations). Każda poprawka z testem sprawdzonym
  bez niej (test pada).

Do sprawdzenia przez użytkownika (po wydaniu 1.4.2, Windows, prawdziwe dane – bez przerwy w pracy, D84):
1. Mapa gwiezdna: kwoty celów takie jak przed aktualizacją; zmiana kolejności nie przesuwa odłożonych pieniędzy.
2. Mostek: osłony, kadłub i salda domowników bez zmian po aktualizacji.
3. Ładownia: opłata zapłacona przed terminem – bez „Za plan o …”; edytor kontenera – miesiące „od / do”.
4. Import kolejnego pliku z mBanku: operacje z poprzedniego pliku w drugim formacie rozpoznane, nic podwójnie.

## 1.4.3 – szybkość przy dużym folderze (grupa F, 18.10.2026)

Zakres: wydajność z przeglądu po 1.4.1 (D84, „Przed grupą F” niżej). Zrobione:
- Okno (W2–W6, W9–W16): silnik budżetu i gra liczone raz na dzień i tylko przy zmianie tego, co czytają; odpowiedź zapisu
  i echo z dysku bez nowej mapy i przeliczenia; pola tekstowe zapisują po wyjściu z pola; duplikaty liczone chwilę po
  zmianie i ok. 13 razy szybciej; Ładownia, wyszukiwanie, dostawy, domownicy, szybki wpis bez zbędnych przeliczeń; zaległe
  dni gry porcjami (T146–T149).
- Magazyn (W1, W8, W26): indeks plików, widoki i różnice tylko dla zmienionych rekordów, zapis i usuwanie paczką (import,
  zbiorcze zmiany, duplikaty), tekst plików tylko do migracji (T150).
- Folder (W21–W24): jedno odświeżenie naraz, pełna kontrola rzadziej i poza kolejką zapisów, zdarzenie katalogu bez
  pełnego skanu, konflikty bez przeskanowania, otwarcie bez osobnego `stat` (T151–T153).
- Kopie (W7, F2, N19, C4): własny zapis ZIP w jednym przejściu, kopie z pamięci magazynu (bajt w bajt, inaczej z dysku),
  kopia dzienna co godzinę i po wybudzeniu, 14 dziennych + 8 tygodniowych, wiek ostatniej kopii w Ustawieniach (T154).
- Przegląd `/code-review` high: 7 kandydatów, wszystkie poprawione (T155); pomiar okna przy 150 tys. pokazał zawieszenie
  przy liczeniu duplikatów – przyspieszone.
- Testy: 449 unit + fs (nowe `tests/fs/folder-speed.test.ts`, poszerzone `backup`, `datastore-robust`, `watch`,
  `data-store`, `game`), E2E 23 (nowy w `sync.spec.ts`). Każda poprawka z przeglądu z testem sprawdzonym bez niej (pada).

Pomiar (syntetyczny folder 10 lat jak w przeglądzie, Linux, 4 rdzenie; „przed” = `docs/przeglad/`, okno = drugi start):

| | 30 tys. przed | 30 tys. po | 150 tys. przed | 150 tys. po |
| --- | --- | --- | --- | --- |
| zapis jednej operacji (proces główny) | 101 ms | 2 ms | 667 ms | 2 ms |
| import 2000 operacji (proces główny) | ok. 3,5 min | 2,7–3,8 s | ok. 22 min | 3,0–3,5 s |
| odświeżenie po zapisie (Windows: zdarzenie katalogu) | pełny skan 1,1 s | 5–9 ms | pełny skan ok. 6 s | 24–37 ms |
| zapis w trakcie pełnej kontroli folderu | czeka 1,1 s | 53 ms | czeka ok. 6 s | 94 ms |
| kopia ZIP (dzienna, przed importem) | 23 s | 1,9 s | 1,5–3 min | 13 s |
| możliwe duplikaty (cała historia) | 0,39 s | 0,13 s | 7,7 s | 0,6 s |
| okno: Mostek po starcie | 7,2 s | 6,7 s | 54 s | 29 s |
| okno: Operacje (najdłuższe zadanie) | 0,5 s (0,44 s) | 0,07 s (0,11 s) | 8,8 s (7,2 s) | 0,1 s (0,47 s) |
| okno: Raporty | 0,44 s | 0,05 s | 2,7 s | 0,1 s |
| okno: Dowództwo | 0,26 s | 0,17 s | 0,75 s | 0,87 s |
| pamięć okna (sterta JS) / procesu głównego | 131 MB / 320 MB | 45 MB / 252 MB | 703 MB / 1,2 GB | 167 MB / 509 MB |

Cel z „Przed grupą F”: przy 30 tys. przełączanie ekranów i pisanie bez zacięć ponad 0,1 s – zostały dwa krótkie zadania:
ocena dnia przy wejściu do Dowództwa (0,15 s) i liczenie duplikatów chwilę po zmianie (0,1 s); 150 tys. – używalne (Mostek
po 29 s, Dowództwo 0,9 s). Dalsze przyspieszenia (przyrostowy silnik W27, import W17–W20, okno „pytaj” W25) – w kolejnych
grupach według przeglądu.

Do sprawdzenia przez użytkownika (po wydaniu 1.4.3, Windows, prawdziwy folder w OneDrive – bez przerwy w pracy, D84):
1. Pisanie notatki i kontrahenta w operacji – płynne; Esc cofa, Enter zapisuje.
2. Import z mBanku – szybciej; po imporcie wszystko na swoim miejscu.
3. Ustawienia → Folder i kopie: „Ostatnia kopia: dziś”; po kilku dniach w zasobniku nowe kopie dzienne, w `backups/weekly`
   kopie tygodniowe.

## Przed grupą G – domownicy, ICTTJ i dokowanie (18.10.2026)

1. **Co trzeba wiedzieć** – grupa F (1.4.3) zrobiona. Grupa G (1.5.0): wydatek finansowany przez wiele osób – równo,
   procentami albo kwotami; moja część to mój wydatek, części innych idą do ich sald; to samo w szybkim wpisie, decyzji
   zbiorczej i regule importu; osoby bez konta (babcia i dziadek osobno), zwrot gotówką na konto „Gotówka”,
   „sfinansowane jako prezent” – bez długu, nie zjada energii (D83). Błędy domowników: operacje sprzed dnia rozliczeń
   dodane później (B14), zwrot towaru z zakupu domownika (B40), wpłata domownika i reguła bez osoby (B41), zakup
   sfinansowany przez domownika bez poważnego naruszenia gry (N5). ICTTJ i dokowanie (B15–B22): osierocone dokowanie po
   usunięciu operacji, zmiana puli po dokowaniu, dwa dokowania jednego wpisu, „Portfel XTB?” od zakresu pliku, granica
   startu po dacie pieniędzy, pula wypłaty jeszcze niezadokowanej, wpis usunięty i wpisany od nowa, inna kwota albo
   przelew po świętach. Polskie święta w dniach roboczych (F42 – zmienia T63).
2. **Co użytkownik musi powiedzieć** – ✅ D83 (wielu finansujących, gotówka, prezent) i D84; nic nowego.
3. **Co przygotować** – nic przed startem; po wydaniu 1.5.0: babcia i dziadek jako osoby (Ustawienia → Domownicy), konto
   „Gotówka”, pierwszy wspólny wydatek z podziałem, dokowanie najbliższej wypłaty z ICTTJ.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 3–4 h (z planu; grupy E i F zajęły po ok. 2 h przy planie 4–5 i 3–5 h).

## 1.5.0 – domownicy, ICTTJ i dokowanie (grupa G, 19.10.2026)

Zakres: D83 (F0) i poprawki z przeglądu po 1.4.1 – B14–B22, B40, B41, N5, F42 („Przed grupą G” wyżej). Zrobione:
- Wspólne finansowanie (D83): wydatek kilku osób – równo, procentami albo kwotami; moja część mój wydatek, części innych
  do ich sald; edytor („Wspólnie”), szybki wpis („wspólnie”), Operacje dla zaznaczonych („wspólnie…”), decyzje i reguły
  importu; linie operacji czytelne dla starszej wersji jak paragon (T156). Prezent – bez długu, najpierw z zaliczki osoby,
  reszta z osłon (T157). Konto „Gotówka” (T158).
- Domownicy (B14, B40, B41 część 2): operacje spoza sald na start liczone zaraz po nich – lista operacji, które salda
  obejmują, zamiast chwili ich ustalenia (wyszło w przeglądzie: zmiana daty albo domownika też musi się liczyć); zwrot
  towaru z zakupu domownika z importu; połączone nazwy a pieniądze domownika (T159, T160).
- Gra (N5, B20): zakup za kogoś nie daje naruszeń; dzień z niezadokowaną parą wypłaty czeka najwyżej tydzień (T161, T163).
- ICTTJ i dokowanie (B15–B19, B21, B22, F42): osierocone i podwójne dokowania, zmiana puli, wpis usunięty i wpisany od
  nowa, zasięg pliku z banku, start po dacie pieniędzy, para innej kwoty, polskie święta (T162, T164).
- Przegląd `/code-review` high: 10 kandydatów, wszystkie poprawione (T165).
- Testy: 478 unit + fs (nowy `tests/unit/share.test.ts`, poszerzone `dock`, `import`, `game`, `household`, `fleet`,
  `settings-defaults`, `tests/fs/ictj.test.ts`), E2E 24 (nowy `tests/e2e/shared.spec.ts`). Każda poprawka z przeglądu z
  testem sprawdzonym bez niej (pada).

Nie zrobione – czeka na decyzję użytkownika („Przed grupą H”): B41 część 1 (słowo kluczowe z tytułu a wpłata domownika).

Do sprawdzenia przez użytkownika (po wydaniu 1.5.0, Windows – bez przerwy w pracy, D84):
1. Ustawienia → Domownicy: babcia i dziadek jako dwie osoby; konto „Gotówka” w Ustawieniach → Konta (saldo otwarcia).
2. Edytor operacji: „Wspólnie” – ja i domownicy po równo, potem procentami; „prezent od: …”; Mostek – kto ile ma oddać.
3. Szybki wpis: „wspólnie” i „prezent”; Operacje: zaznaczone → „wspólnie…”.
4. Najbliższa wypłata z ICTTJ – dokowanie; przy przelewie po świętach albo innej kwocie – „inna kwota” w oknie dokowania.

## Przed grupą H – import z mBanku (19.10.2026)

1. **Co trzeba wiedzieć** – grupa G (1.5.0) zrobiona. Grupa H (1.5.1): import z mBanku według przeglądu – pożyczka z
   importu powiązana z Radarem (B34), operacja przeniesiona na inne konto nie wraca drugi raz (B35), niepołączony możliwy
   duplikat z rozpoznaniem (B36), „Ustaw” bez kategorii nie uczy pustych reguł (B37), plan liczony od nowa po zmianie
   nazwisk, kontenerów, kategorii (B38), temat nie traci decyzji po przeliczeniu (B39); sesja importu nie znika bez pytania
   (N12), import bez nowych operacji zapisuje „ostatni import” (N13), pożyczka / PIT-38 nie stają się regułą (N14), reguła z
   nazwy z banku (N15), propozycja reguły na słowo = to, co zapisuje (N16); „Cofnij import” (F4), saldo z pliku banku z
   dniem rozbieżności (F5), oficer szybkiego wpisu zna marki i reguły (F8), audyt reguł importu (F22).
2. **Co użytkownik musi powiedzieć** – ✅ D84 (C11) na zakres H. Dwa pytania z grupy G (nie blokują H – wdrożona
   propozycja albo nic do czasu odpowiedzi):
   - **Prezent bez zaliczki** – osoba „płaci za mnie” (prezent), a nie ma u mnie zaliczki: resztę pokrywają osłony, nikt nic
     nie jest winien (tak działa 1.5.0 – propozycja). Inaczej: reszta jako długu tej osoby, albo pytanie przy zapisie.
   - **B41 część 1** – słowo kluczowe z tytułu (np. „oszczędności” → przelew własny) a przelew od domownika z takim
     tytułem: dziś wygrywa słowo kluczowe (wpłata staje się przelewem własnym, zaliczka nie rośnie). Propozycja: przy
     rozpoznanym domowniku słowo z tytułu nie decyduje – wpłata zostaje pieniędzmi domownika, a słowo działa dla innych
     nadawców (doprecyzowanie T110).
3. **Co przygotować** – nic przed startem; po wydaniu 1.5.1: zwykły import z mBanku (sprawdzić „Cofnij import” i saldo z
   pliku), przejrzeć listę reguł w Ustawieniach → Import z banku.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2–3 h (plan był 3–5 h; grupy E, F i G zajęły po 1,5–2 h).

## 1.5.1 – import z mBanku (grupa H, 19.10.2026)

Zakres: poprawki z przeglądu po 1.4.1 – B34–B39, N12–N16 – i funkcje F4, F5, F8, F22 („Przed grupą H” wyżej). Zrobione:
- Import (B34–B39, T166): przelew od osoby z otwartą pożyczką z Radaru – jej zwrot (opcje pożyczek Radaru w decyzjach);
  plik zaimportowany najpierw na złe konto – operacje się przenoszą, nie wchodzą drugi raz (klucz wiersza zależy od
  konta; dwa rachunki banku z różnymi numerami – dwie operacje); „Nie łącz” – wiersz z rozpoznaniem; „Ustaw” bez
  kategorii niedostępne, wydatek bez kategorii nie uczy reguły; podgląd od nowa po zmianie nazwisk, kategorii, kontenerów,
  pożyczek i operacji, przed zapisem sprawdzony jeszcze raz; temat zachowuje decyzję.
- Sesja importu (N12–N16, T167): zamknięcie i inny plik z „Cofnij”, zapis bez zmian, pożyczka / PIT-38 / XTB nie
  regułą, „Zapamiętaj” po nazwie z banku, propozycja reguły na słowo z całą decyzją.
- „Cofnij import” (F4, T168): paczka każdego importu (`imports/`, dziesięć ostatnich), cofnięcie od ostatniego z oknem „co
  się stanie” i „Cofnij” w toaście, ponowny import wczytuje wszystko, operacje cofniętego importu do odzyskania z listy
  usuniętych, ostrzeżenie o pliku z innego rachunku i o pliku już zaimportowanym.
- Telemetria z banku (F5, T169, C11): historia rachunku – saldo potwierdzone samo, gdy FI się zgadza; inaczej dzień
  rozbieżności i jej przyczyny (brak w FI, nadmiar w FI, inna kwota, różnica sprzed pliku, luki w pliku).
- Oficer (F8, T170): marka, reguły importu i słownik sieci – szybki wpis i edytor operacji.
- Audyt reguł (F22, T171): wyszukiwarka, trafienia dziś, zmiana reguły, niespójne operacje z „Zastosuj do historii”,
  reguły bez trafień, marki z kilkoma kategoriami i reguła z progiem kwoty.
- Przegląd `/code-review` high: 10 kandydatów, wszystkie poprawione (T172).
- Testy: 504 unit + fs (nowe `import-batch`, `import-statement`, `officer`, `rules-audit`, grupa H w `import.test.ts`,
  powody `undo` / `drop` w `tests/fs/history.test.ts`), E2E 28 (nowy `tests/e2e/import-tools.spec.ts`). Poprawki z
  przeglądu z testem sprawdzonym bez nich (padają).

Nie zrobione – czeka na decyzję użytkownika: B41 część 1 i reszta prezentu bez zaliczki („Przed grupą H”).

Do sprawdzenia przez użytkownika (po wydaniu 1.5.1, Windows):
1. Zwykły import z mBanku, potem „Cofnij import” na ekranie wyniku – i „Cofnij” w toaście; ten sam plik jeszcze raz.
2. Historia rachunku (CSV z saldami) – panel „Telemetria z banku”: zgodne saldo potwierdzone samo albo dzień rozbieżności.
3. Szybki wpis: kontrahent wpisany jak w życiu („Biedronka”, „Orlen”) – podpowiedź oficera.
4. Ustawienia → Import z banku: reguły z liczbą trafień, „niespójne”, „zmień”, marki z kilkoma kategoriami.

## Przed grupą I – liczby się zgadzają (19.10.2026)

1. **Co trzeba wiedzieć** – grupy E–H wydane (1.5.1 – PR #18). Ciąg I–L na komendę „Start I–L” (D86). Grupa I (1.5.2):
   średnie pozycje przeglądu, w których ekran, silnik i kreator liczą inaczej:
   - silnik i plan: propozycje i średnie z pełnych miesięcy bez bieżącego (B23) i od początku historii z banku (B25),
     „Pożyczka” bez rekordu z Radaru nie dokuje jak przychód (B57), płatności usuniętego kontenera (B58), podział
     dokowania po zmianie kwoty (B59), konto otwarte 1. dnia miesiąca przed pensją (B60), „miesiąc na plus” jak silnik
     (N6), koperta zarchiwizowanej kategorii (N8), łupy „na następny miesiąc” i wydatki bez kategorii w podziale pensji
     i debriefingu (N11), „wolne do decyzji” tylko przy pełnym kadłubie (N21);
   - ekrany: kwoty w historii, oknie zmian i Synchronizacji w złotych i z ukryciem Ctrl+$ (B7), kreator – konta z saldem
     otwarcia (B8), odkładki i pierwsza pensja jak silnik (N9), krok folderu ICTTJ i celów (N7, D84 C8); data „dd.mm”
     operacji nie w przyszłości (B12), pola liczb całkowitych (B26), przypomnienie o saldzie każdego konta (B28),
     podgląd energii w szybkim wpisie jak silnik (N3), mediana przychodów (N4), cisza nocna w edytorze operacji (N10).
2. **Co użytkownik musi powiedzieć** – ✅ D85 (pytania z grupy G – zostaje jak jest), ✅ D86 (komenda i propozycje J, L).
3. **Co przygotować** – nic przed startem; po wydaniu 1.5.2: Plan miesiąca (propozycje, podział pensji, debriefing),
   kreator nie jest potrzebny na działającym budżecie.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2–3 h (cały ciąg I–L ok. 9–12 h).

## 1.5.2 – liczby się zgadzają (grupa I, 19.10.2026)

Zakres: B7, B8, B12, B23, B25, B26, B28, B57–B60, N3, N4, N6–N11, N21 („Przed grupą I” wyżej). Zrobione:
- Silnik i plan (T173–T181): jedna historia średnich od początku historii z banku (silnik, kreator, Plan miesiąca,
  Ładownia; bez bieżącego miesiąca i bez miesięcy bez operacji), „Pożyczka” bez Radaru tylko w osłonach, płatności
  usuniętego kontenera znów wydatkami (z „Cofnij”), podział dokowania dopasowany do kwoty operacji i liczony od kwoty z
  banku, saldo otwarcia przed pensją tego dnia, „miesiąc na plus” z wyniku energii (debriefing z rachunkiem energii i
  pulą dzienną), koperta zarchiwizowanej kategorii zdjęta z planu (z „Cofnij”), łupy w dziennym przydziale, „wolne do
  decyzji” tylko przy pełnym kadłubie.
- Ekrany (T182–T187): kwoty w historii, oknie zmian i Synchronizacji w złotych; kreator (konto z saldem otwarcia, krok
  „ICTTJ i cele”, cele w podziale środków, odkładki jak silnik); data bez roku (dzień najbliższy dacie pola, najwyżej
  tydzień naprzód) i znaczek „w przyszłości”; pola liczb całkowitych; przypomnienie o saldzie każdego konta; podgląd
  szybkiego wpisu jak silnik; „Razem” przychodów; cisza nocna potwierdzona wpisem w dzienniku.
- Przegląd `/code-review` high: 10 kandydatów – 8 poprawionych, 2 bez zmian z uzasadnieniem (T188).
- CI Windows PR #19: „Cofnij import” (20–40 operacji) nie mieściło się w 10 s – każdy plik szedł osobno do Kosza
  Windows; plik wpisu z wersją w historii usuwany teraz od razu, do Kosza tylko bez niej (T189).
- Testy: 519 unit + fs (nowy `numbers-agree.test.ts`, poszerzone `income`, `plan`, `game`), E2E 30 (nowy
  `tests/e2e/numbers.spec.ts`, kreator z celami w `month.spec.ts`). Poprawki z testem sprawdzonym bez nich (padają).

Do sprawdzenia przez użytkownika (po wydaniu 1.5.2, Windows):
1. Plan miesiąca: propozycja pensji i „Koperty ze średnich” (z ilu miesięcy), „Podział pensji” z łupami, debriefing
   minionego miesiąca – rachunek energii i „na plus”.
2. Ustawienia → Kategorie: archiwizacja kategorii z kopertą i „Cofnij”.
3. Ładownia: usunięcie kontenera z płatnościami i „Cofnij”.
4. Edytor operacji: data „dd.mm” bez roku, godzina w nocy – potwierdzenie albo „usuń godzinę”.
5. Szybki wpis: kategoria bez koperty i koperta planowana – podgląd.
6. Mostek: przypomnienie o saldzie każdego konta, „wolne do decyzji”.

## Przed grupą J – system, folder, dwa komputery (19.10.2026)

1. **Co trzeba wiedzieć** – grupa I wydana (1.5.2 – PR #19). Grupa J (1.5.3): średnie pozycje przeglądu o systemie,
   folderze danych i pracy na dwóch komputerach:
   - system: skrót szybkiego wpisu z literą polskiego znaku zabiera AltGr (B29), wpisy autostartu wersji portable (B52),
     przyciski ekranu wyboru folderu po tekście komunikatu (B53), okno na odłączonym monitorze (B54);
   - folder: zmiana folderu z Ustawień bez blokady i postępu (B31), tryb tylko do odczytu melduje sukcesy (N2), kopie
     konfliktu bez „Scal” (N17), historia bez przycisku przy planie, celu, pożyczce, saldzie i dokowaniu (N18);
   - dwa komputery: baner przy aplikacji w zasobniku drugiego komputera (N20), komputer „w użyciu” (F21 – zapisy w tle i
     powiadomienia tylko tam), zamrażanie dni od razu po otwarciu folderu (B33), odłączone panele Mostka (B27).
2. **Co użytkownik musi powiedzieć** – ✅ D86 (B29 i N20 / F21 – propozycje przyjęte).
3. **Co przygotować** – nic przed startem; po wydaniu 1.5.3 (Windows): dwa komputery z aplikacją w zasobniku, zmiana
   folderu w Ustawieniach, skrót szybkiego wpisu, autostart wersji portable.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2–3 h.

## 1.5.3 – system, folder i dwa komputery (grupa J, 19.10.2026)

Zakres: B27, B29, B31, B33, B52–B54, N2, N17, N18, N20, F21 („Przed grupą J” wyżej). Zrobione:
- System (T190–T193): skrót Ctrl+Alt+litera polskiego znaku (także z Shift) nie do ustawienia, ustawiony – zamieniony na
  domyślny z komunikatem; jeden wpis autostartu o stałej nazwie, stare wpisy portable usuwane, druga kopia przy logowaniu
  bez okna; okno z odłączonego monitora na ekranie; ekran wyboru folderu po przyczynie (zapamiętany pusty / niedostępny,
  folder z innymi plikami, nowe dane tylko po potwierdzeniu).
- Folder (T194–T197): tryb tylko do odczytu bez fałszywych sukcesów i z wyłączonymi polami; „Scal…” kopii konfliktu
  (każde różniące się pole wyborem, obie strony w historii); „Historia” przy planie miesiąca, celu, pożyczce, saldzie,
  dokowaniu i w oknie zmian, okna nad oknami; zmiana folderu z Ustawień z postępem i „Przerwij”, w trakcie bez zmian,
  zapisy tylko do folderu pokazanego w oknie.
- Dwa komputery (T198–T200): komputer „w użyciu” (ruch w oknie w 10 min) – baner tylko dla niego, zapisy w tle i
  powiadomienia tylko na nim (żaden w użyciu – każdy), obecność w zasobniku co 5 min; pierwsze zamrożenie dni po
  otwarciu czeka 3 min i minutę ciszy; odłączone panele Mostka działają poza Mostkiem.
- Przegląd `/code-review` high: 9 kandydatów – wszystkie poprawione z testami (T201).
- Testy: 525 unit + fs (nowe `system.test.ts`, scalanie w `datastore-robust.test.ts`, `valueAt` w `merge.test.ts`), E2E
  39 (nowe `system.spec.ts`, `folder.spec.ts`, `presence.spec.ts`, poszerzone `bridge.spec.ts`, `numbers.spec.ts`).
  Poprawki z testem sprawdzonym bez nich (padają).

Do sprawdzenia przez użytkownika (po wydaniu 1.5.3, Windows):
1. Dwa komputery: aplikacja w zasobniku na jednym, praca na drugim – bez banera; Synchronizacja → „Inne komputery”
   (w użyciu / w zasobniku, ostatnia zmiana); powiadomienia tylko na komputerze, przy którym siedzisz.
2. Ustawienia → Folder: „Otwórz inny folder…” na dużym folderze – postęp, „Przerwij”, bieżący folder zostaje bez zmian.
3. Synchronizacja: kopia konfliktu (np. `fi-KOMPUTER.json`) – „Scal…”.
4. „Historia” przy planie miesiąca, celu, pożyczce, saldzie otwarcia i zadokowanej dostawie.
5. Ustawienia → Powiadomienia: skrót Ctrl+Alt+S – komunikat; wersja portable z autostartem – jeden wpis w Menedżerze
   zadań → Uruchamianie.
6. Mostek: Odprawa w osobnym oknie na drugim monitorze, praca w Operacjach – okno się odświeża i prowadzi kliknięciem.

## Przed grupą K – szybkość, reszta (19.10.2026)

1. **Co trzeba wiedzieć** – grupa J wydana (1.5.3 – PR #20). Grupa K (1.5.4): pozostałe średnie pozycje wydajności z
   przeglądu: ekran importu rysuje wszystko przy każdej decyzji (W17), plan importu od nowa po każdym zapisie ustawień
   (W18), lista usuniętych przy każdym pliku importu blokuje zapisy (W19), import całej historii w kreatorze (W20), duża
   paczka zmian z drugiego komputera w trybie „pytaj” (W25), silnik floty sortuje całą historię przy każdym przeliczeniu
   (W27). Zachowanie bez zmian – tylko czas; każdy refaktor porównany z wynikami starego kodu.
2. **Co użytkownik musi powiedzieć** – ✅ D86 (nic nowego).
3. **Co przygotować** – nic przed startem; po wydaniu 1.5.4 (Windows): duży plik z mBanku, tryb „pytaj” przy pracy na
   dwóch komputerach.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2 h.

## 1.5.4 – szybkość, reszta (grupa K, 19.10.2026)

Zakres: W17–W20, W25, W27 („Przed grupą K” wyżej). Zrobione:
- Silnik floty (T202): operacje sortowane raz na listę i wplatane w zdarzenia kalendarza, salda kont i przepływy pożyczek
  jednym przejściem, części operacji z pamięci.
- Plan importu i rozpoznanie (T203): indeksy operacji konta raz na listę, wpisy ręczne z ±3 dni, reguły po trybie i
  kierunku, pamięć marek, nazw i podpowiedzi; plan od nowa tylko przy zmianie treści tego, co czyta.
- Ekran importu (T204): temat, marka i wiersz rysowane tylko przy własnej zmianie, duży temat zwinięty na start, listy
  po 100 z „pokaż kolejne”.
- Lista usuniętych (T205): id pod blokadą, historia poza nią (16 naraz), wersja usuniętego zapamiętana po nazwie pliku.
- Zmiany z drugiego komputera (T206): „Zastosuj” i „Zaakceptuj nowsze” jedną zmianą stanu i jednym zapisem, okno po 50.
- Przegląd `/code-review` high: 7 kandydatów – wszystkie poprawione z testami (T207); pierwszą wersję pamięci kluczy
  usuniętych złapało też pełne E2E (ponowny import po usunięciu operacji) – zastąpiona pamięcią w procesie głównym.
- Testy: 539 unit + fs (kolejność zdarzeń silnika i pożyczki w `fleet.test.ts` / `loans.test.ts`, grupa K w
  `import.test.ts`, nowy `import-replan.test.ts`, lista usuniętych w `tests/fs/history.test.ts`, zmiany z drugiego komputera
  naraz w `data-store.test.ts`), E2E 41 (nowy `speed.spec.ts`: duży import, wiele zmian z drugiego komputera). Poprawki z
  testem sprawdzonym bez nich (padają).

Pomiary (dane syntetyczne, Linux; przed → po):

| Co | 30 tys. operacji | 150 tys. operacji |
| --- | --- | --- |
| Silnik floty – jedno przeliczenie | 239 → 145–162 ms | 1,24–1,9 → 0,63–1,0 s |
| Plan pliku z 90 dni (ciepły) | 241 → 28 ms | 3 528 → 72 ms (zimny ok. 0,65 s) |
| Kreator: cała historia (30 tys. wierszy) do pustego budżetu | 5 265 → 251 ms (zimny ok. 0,6 s) | – |
| Lista usuniętych (2 000 usuniętych) | 892–1 111 → 420–512 ms, kolejne wczytanie 96–100 ms; zapis w trakcie czekał 1 235 → 21–60 ms | – |
| „Zastosuj” 1 000 zmian z drugiego komputera | 30,4–30,9 s → 31–49 ms; 500 zapisów → 1 paczka | 233–243 s → 253–264 ms |
| Okno zmian z 1 000 czekającymi (pierwsze rysowanie) | 358–515 → 57–99 ms (50 kart zamiast 1 000) | – |

Ekran importu (rysowanie całej strony, plik roku: 3 tys. wierszy i 600 marek / 15 tys. wierszy i 2 tys. marek):
617–791 → 63–94 ms i 2,2–2,6 s → 165–192 ms; z wyszukiwaniem 1 111 → 482 ms i 5 704 → 1 236 ms.

Do sprawdzenia przez użytkownika (po wydaniu 1.5.4, Windows):
1. Import dużego pliku z mBanku (np. cała historia rachunku): temat z wieloma markami zwinięty na start, „pokaż kolejne”,
   decyzje i wyszukiwanie bez zacięć.
2. Drugi plik importu w tej samej sesji: wczytanie bez czekania; operacja usunięta w Operacjach nie wraca.
3. Ustawienia → Okręt → „Zawsze pytaj przed przyjęciem zmian”, import na drugim komputerze: okno zmian – 50 wpisów,
   „pokaż kolejne”, „Zastosuj” i „Zaakceptuj nowsze”.
4. Duży folder: Mostek i Operacje przeliczają się bez zacięć (np. szybki wpis, edycja kwoty).

## Przed grupą L – funkcje (19.10.2026)

1. **Co trzeba wiedzieć** – grupa K wydana (1.5.4 – PR #21). Grupa L (1.6.0) – funkcje z przeglądu wybrane w D86: opłaty
   stałe w miesiącu (F1), szybki wpis seriami (F7), mądrzejsze wieczorne przypomnienie (F13 – D84 C15), meldunki do
   rozpatrzenia (F6), odzyskanie z kopii (F3); N7 (krok ICTTJ i celów w kreatorze) zrobione już w 1.5.2. Format folderu
   bez zmian (pola addytywne: `settings.game.noSpend`, `notify.cargo` komputera).
2. **Co użytkownik musi powiedzieć** – ✅ D86 (szczegóły każdej funkcji przyjęte w propozycji).
3. **Co przygotować** – nic przed startem; po wydaniu 1.6.0 (Windows): kontener z płatnościami z historii, szybki wpis
   kilku paragonów naraz, wieczór z przypomnieniem, kopia zapasowa do odzyskania (najlepiej na kopii folderu).
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 3–4 h.

## 1.6.0 – funkcje (grupa L, 19.10.2026)

Zakres: F1, F3, F6, F7, F13 („Przed grupą L” wyżej). Zrobione:
- Opłaty stałe w miesiącu (T208): stan kontenera miesięcznego – zapłacone / czeka / po terminie (termin z historii
  płatności, 3 dni, czeka na import), „Kontener niezaładowany” w odprawie i powiadomieniu (do wyłączenia), opłaty
  miesięczne na Radarze, „Zapłacone” w Ładowni.
- Szybki wpis seriami (T209): Ctrl+Enter – zapisz i następny z licznikiem i energią, „Powtórz ostatni”, 5 par kontrahent +
  kategoria, działania w kwocie, „wczoraj” i data słowem, szkic po Esc do 30 min.
- Wieczorny raport wachty (T210): pasek w Operacjach od godziny przypomnienia (ile dopisano z godziną, „Dopisz”, „Dziś bez
  wydatków” w dzienniku wachty, „Przypomnij za 30 min”), te same akcje w zasobniku, bez przypomnienia po wydatku od 18:00.
- Meldunki do rozpatrzenia (T211): skrzynka z licznikiem w menu bocznym (Ctrl+Shift+M) – dokowanie, łupy, folder danych,
  bez kategorii, duplikaty, zwroty, salda ponad 30 dni; każdy meldunek prowadzi do decyzji; bez nowych powiadomień.
- Odzyskanie z kopii (T212): „Odzyskaj…” przy kopii – podgląd różnic, wybrane wpisy i ustawienia jako nowa wersja z
  historią i „Cofnij”, albo cały folder rozpakowany do nowego obok i otwarty (bieżący nietknięty).
- Przegląd `/code-review` high: 10 kandydatów – 9 poprawionych z testami sprawdzonymi bez poprawki, 1 bez zmiany
  zachowania (T213); pierwszą wersję podglądu różnic (porównanie z opakowaniem wpisu zamiast samego wpisu) złapał E2E.
- Testy: 561 unit + fs (nowe `cargo-status.test.ts`, `inbox.test.ts`, `tests/fs/restore.test.ts`; poszerzone `notify`,
  `format`, `game`, `operations-view`), E2E 46 (nowe `fees.spec.ts`, `series.spec.ts`, `inbox.spec.ts`, `recover.spec.ts`).

Do sprawdzenia przez użytkownika (po wydaniu 1.6.0, Windows):
1. Ładownia: kontener z płatnościami z banku – „dzień płatności z historii”, stan w tym miesiącu; „Zapłacone” dla
   opłaty gotówką; Radar – opłaty w kolejnych miesiącach.
2. Szybki wpis: kilka paragonów pod rząd Ctrl+Enter, „12,50+8,30” w kwocie, szablon, „Powtórz ostatni”, Esc i ponowne
   otwarcie (szkic czeka).
3. Wieczorem: pasek „Raport wachty dnia” w Operacjach, „Dziś bez wydatków” z zasobnika, „Przypomnij za 30 min”.
4. Meldunki (menu boczne): licznik, każdy przycisk prowadzi do właściwego miejsca.
5. Odzyskanie z kopii – najlepiej na kopii folderu: „Odzyskaj…” przy kopii, podgląd, wybrany wpis z „Cofnij”; „Odzyskaj
   cały folder do nowego…” – nowy folder obok, stary bez zmian (wracasz z „Ostatnio używane foldery”).

## Przed grupą M – liczby, plan, raporty, Mostek (19.10.2026)

1. **Co trzeba wiedzieć** – grupa L wydana (1.6.0 – PR #22). Ciąg M–V (D87) idzie bez pauz między grupami, każda z
   własnym PR i wydaniem. Grupa M (1.6.1): niskie pozycje przeglądu dotyczące liczb silnika i planu, raportów, Mostka i
   Radaru – B61–B63, B65, B84, B85, B92, B126–B128; N22–N28, N30, N52, N54, N56, N59, N63, N65, N66, N101–N103;
   W28–W30, W38. Format folderu bez zmian.
2. **Co użytkownik musi powiedzieć** – ✅ D87. Tam, gdzie przegląd zostawia wybór (N63 – nazwa krzywej majątku, N66 –
   wpływy roku, N102 – koperty codzienne), wybieram wariant zgodny z decyzjami użytkownika i zapisuję go jako T-decyzję
   do zmiany na życzenie.
3. **Co przygotować** – nic.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2 h.

## 1.6.1 – liczby, plan, raporty, Mostek (grupa M, 19.10.2026)

Zakres: B61–B63, B65, B84, B85, B92, B126–B128, N22–N28, N30, N52, N54, N56, N59, N63, N65, N66, N101–N103, W28–W30, W38
(„Przed grupą M” wyżej; B62 i W28 były już poprawione w 1.4.2 / 1.4.3 – odhaczone). Zrobione:
- Debriefing (T215): koperty tylko z planu (0 zł też), „Bez koperty” osobno bez czerwieni, pula dzienna jak energia,
  „na plus” po końcu miesiąca („miesiąc trwa”, w CSV / Excel „w toku”), łupy tylko z miesiąca przebytego przez silnik.
- Jedna reguła przekroczenia koperty (T216): alarm wg progu Dowództwa, koperta codzienna łagodnie, limit 0 powiadamia,
  Daily Bias po kopertach planowych.
- Nazwy (T217): „Przychody” w raportach, eksporcie i alarmie pensji; „Na kontach” / „Pieniądze na kontach” w Wywiadzie i
  przeglądzie rocznym; odprawa w Raportach z Daily Bias, trafność dziennika w debriefingu (T214); zasięg obcięty w dół
  (T218).
- Mostek i Radar (T221): alarm odprawy do przyczyny, „Odsłuchaj” tylko z polskim głosem, każda dopłata do XTB osobno,
  „po terminie N dni” / „zaległa rata” od 3 dni, Ctrl+$ od razu w Radarze i szybkim wpisie; Ładownia – najbliższa
  płatność od dziś, rata z harmonogramu; Mapa gwiezdna – część w zarchiwizowanych; pożyczka z ratami poniżej kwoty
  odrzucona.
- Start i ustawienia (T219, T220): minimum osłon ≤ cel, kreator liczy wydane przed startem jak silnik, saldo otwarcia bez
  operacji z przyszłości, tempo celów bez środków startowych, gra po kreatorze, baner przy budżecie od salda otwarcia.
- Wydajność (T222): indeksy po miesiącach (operacje, dziennik silnika, koszty), „Ostatnie operacje” jednym przejściem,
  debriefing raz.
- Przegląd `/code-review` high: 8 kandydatów – wszystkie poprawione (T223), w tym kolejność hooków na Mostku.
- Testy: 574 unit + fs (nowy `plan-reports.test.ts` – 13 testów, każda poprawka sprawdzona mutacją: test pada bez niej;
  `export.test.ts`), E2E 46.

Do sprawdzenia przez użytkownika (po wydaniu 1.6.1, Windows):
1. Plan miesiąca → debriefing poprzedniego miesiąca: „Bez koperty”, pula dzienna, „na plus”; Raporty → Debriefing
   bieżącego miesiąca: „miesiąc trwa”.
2. Mostek: kliknięcie alarmu masy ładunku / korekty prowadzi do Ładowni / operacji; „Odsłuchaj” (polski głos).
3. Ustawienia → Warstwy i rozkazy: minimum osłon wyższe od celu – komunikat.

## Przed grupą N – gra, ICTTJ, domownicy, cele, kreator (19.10.2026)

1. **Co trzeba wiedzieć** – grupa M wydana (1.6.1 – PR #23). Grupa N (1.6.2): niskie pozycje przeglądu dotyczące gry,
   ICTTJ i dokowania, domowników, celów i kreatora – B69–B73, B75, B87, B89–B91, B129; N29, N38, N40–N49, N64, N67–N71,
   N73. Format folderu bez zmian (pola addytywne: `container.amountAt`, `docking.entryDate`, `opening.since`).
2. **Co użytkownik musi powiedzieć** – ✅ D87. Wybory z przeglądu: N46 – wariant a (cel ICTTJ bez kwoty bierze w swoim
   miesiącu całą pulę Cele – reguła ICTTJ), N73 – rozkazy edytowalne w Dowództwie (jak w specyfikacji), N38 – pełna
   poprawka (mapa puli Podatek sprzed startu z okna), B129 – stałe id + meldunek z „to nie powtórzenie”; zapisane jako
   T-decyzje do zmiany na życzenie.
3. **Co przygotować** – nic.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2 h.

## 1.6.2 – gra, ICTTJ, domownicy, cele, kreator (grupa N, 19.10.2026)

Zakres: B69–B73, B75, B87, B89–B91, B129, N29, N38, N40–N49, N64, N67–N71, N73 („Przed grupą N” wyżej; N67 poprawione już
w 1.6.1 – T216, odhaczone). Zrobione:
- ICTTJ i dokowanie (T224): wpływ wpisany na Portfelu XTB jako para wypłaty, pula Podatek z podziałem i sprzed startu
  budżetu, pominięty wpis trzyma swoją operację z banku, teksty okna wg kierunku i przy wyłączonym firewallu.
- Odczyt ICTTJ (T225): wpis w dwóch plikach raz, błędy listowania widoczne, dobra migawka po jednym nieudanym odczycie,
  szybka zmiana folderu bez danych starego.
- Cele (T226): tempo i ETA z pulą Cele najpierw do celów ICTTJ, cel ICTTJ bez kwoty w swoim miesiącu (dzień wpisu ICTTJ),
  „po terminie” w akcencie, kwota celu nie spada do 0.
- Gra (T227): masa ładunku w dniu zmiany (`amountAt`, masa nieznana bez dnia do porównania), misja i stopień nowszej
  wersji, „Pełna energia” z dniami niezamrożonymi, „Dzień bez wydatków” z dzisiejszym osobno, klasa ponad szczyt 30 dni,
  „Poważne naruszenia od DD.MM”, opis rozkazu dziennego, rozkazy w Dowództwie.
- Domownicy, salda, kreator, raporty (T228, T229): „Pokrywa” sprzed wpłaty, saldo na start z datą najstarszego zakupu,
  data rozliczeń sprzed startu z dopiskiem, podwójna korekta (stałe id i meldunek), kreator bez utraty kopert, raport
  wachty bieżącego tygodnia.
- Przegląd `/code-review` high: 10 kandydatów – wszystkie poprawione (T230).
- Testy: 594 unit + fs (nowy `ictj-game-goals.test.ts` – 17 testów; każda poprawka i każde znalezisko przeglądu
  sprawdzone mutacją: test pada bez niej), E2E 47 (nowy test podwójnej korekty w `inbox.spec.ts`).

Do sprawdzenia przez użytkownika (po wydaniu 1.6.2, Windows):
1. Mapa gwiezdna: tempo, ETA, znaczek „DOL · pula Cele”, cel z terminem „po terminie” w kolorze akcentu.
2. Dowództwo: rozkazy do zmiany w panelu „Rozkazy i progi”; misja „Dzień bez wydatków” – „+1, jeśli dziś bez wydatków”.
3. Ustawienia → Domownicy: saldo na start z 1.4.0 – przypomnienie od daty zakupu.

## Przed grupą O – import z mBanku (19.10.2026)

1. **Co trzeba wiedzieć** – grupa N wydana (1.6.2 – PR #24). Grupa O (1.6.3): niskie pozycje przeglądu dotyczące importu
   z mBanku – B93–B106, N74–N90 i wydajność W31–W36 (ekran importu w trakcie zapisu, usunięte nierozliczone, łączenie z
   wpisami ręcznymi i panel duplikatów, rozpoznanie opisu i XTB, reguły). Format folderu bez zmian.
2. **Co użytkownik musi powiedzieć** – ✅ D87. Wybory z przeglądu: N85 – „+ domownik” zostawia pytanie „zaliczka czy
   przychód?” (pieniądze osoby to decyzja, reszta ponad należność – odpowiedź), B102 – „może” zamiast „nic” dla krótkich
   nazw i słów „co” (pytane, nigdy łączone samo), W35 – bez samoczynnego usuwania starych reguł (osobna decyzja);
   zapisane jako T-decyzje do zmiany na życzenie.
3. **Co przygotować** – nic.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2 h.

## 1.6.3 – import z mBanku (grupa O, 19.10.2026)

Zakres: B93–B106, N74–N90, W31–W36 („Przed grupą O” wyżej). Zrobione:
- Opis operacji (T231): rodzaje operacji z polską literą na końcu słowa („PŁATNOŚĆ”, „SPRZEDAŻ”), tytuł przelewu z
  podwójną spacją zostaje tytułem, mTransfer z przecinkiem w tytule – kontrahentem firma.
- Rozpoznanie (T232): marka „constructor”, XTB po kontrahencie (przelew własny i domownik przed XTB), reguła z kategorią
  zarchiwizowaną czeka na nową kategorię.
- Łączenie i duplikaty (T233, T234): podobne nazwy bez słów ogólnych, ta sama marka podobna, „może” pytane; panel
  duplikatów jak import; operacje tylko do odczytu nie są łączone; paragon przeskalowany z kwotą banku; usunięte
  nierozliczone nie wchodzą same (pary od najbliższej, wiersz wpuszczony wcześniej zabiera swoją, zniknięcia z importu nie
  blokują rozliczenia); scalenie przenosi `covers`.
- Ekran importu (T235): blokada w trakcie zapisu, upuszczony plik z limitem, błąd zapisu kończy import wynikiem, zmiana
  folderu zamyka plik; „+ domownik” z pytaniem; podpowiedzi i plakietki; „(jak grupa)”; temat „różne – patrz marki”;
  słowo kluczowe z paska zbiorczego; wyszukiwarka; notka o duplikatach; jeden opis decyzji reguły.
- Wydajność (T236): propozycje słów, podobne nazwy, decyzje zbiorcze, nauka reguł jedną kopią, lista reguł po 100,
  scalanie ustawień z tysiącami reguł.
- Przegląd `/code-review` high: 10 kandydatów – wszystkie poprawione (T237).
- Testy: 608 unit + fs (nowy `import-fixes.test.ts` – 14 testów; każda poprawka i każde znalezisko przeglądu sprawdzone
  mutacją: test pada bez niej – 36 mutacji), E2E 47 (`import.spec.ts` – odpowiedź „zaliczka czy przychód?” po
  „+ domownik”).

Do sprawdzenia przez użytkownika (po wydaniu 1.6.3, Windows):
1. Import z mBanku: przelew z tytułem w kilku częściach (tytuł w całości), „PŁATNOŚĆ WEB” jako rodzaj operacji.
2. „+ domownik” przy wpłacie: grupa pyta „zaliczka czy przychód?”, odpowiedź zapamiętana dla osoby.
3. Ustawienia → Import z banku: reguły z kategorią zarchiwizowaną oznaczone, „pokazuj znowu” dla par „to nie duplikat”.

## Przed grupą P – operacje, edytor, szybki wpis (19.10.2026)

1. **Co trzeba wiedzieć** – grupa O wydana (1.6.3 – PR #25). Grupa P (1.6.4): niskie pozycje przeglądu dotyczące
   Operacji, edytora i szybkiego wpisu – B64, B66, B68, B74, B76–B83, B86, B88, B118, B125, N32, N36, N37, N39, N50,
   N51, N55, N104 (Ctrl+N, filtr i widoki listy, „bez kategorii”, podział paragonu, „Cofnij” zbiorczych zmian, saldo dziś,
   świeże listy szybkiego wpisu, szkice formularzy). Format folderu bez zmian. B86 i N55 poprawione już wcześniej (B24 w
   1.4.2 – Esc w polu nie zmienia ekranu; N18 w 1.5.3 – „Historia” poza wyłączanym polem) – tylko odhaczone.
2. **Co użytkownik musi powiedzieć** – ✅ D87. Wybory z przeglądu: B83 – pytanie „Dzisiejsze operacje są już dopisane?”
   przy różnicy (bez wyboru dnia salda – T25 zostaje), N104 – wieczór w ciszy nocnej minutę przed nią (i dopisek w
   Ustawieniach), B88 – widok z innego ekranu z „mój filtr”; zapisane jako T-decyzje do zmiany na życzenie.
3. **Co przygotować** – nic.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 1,5 h.

## 1.6.4 – operacje, edytor, szybki wpis (grupa P, 19.10.2026)

Zakres: „Przed grupą P” wyżej. Zrobione:
- „Bez kategorii” i filtr (T238): jedno znaczenie w oznaczeniu, filtrze i meldunkach (części paragonu, bez wpływów,
  przelewów i zakupów domowników), filtr kategorii po częściach, oznaczenia „lub” w grupie i „i” między grupami,
  kategoria zarchiwizowana w filtrze do odznaczenia.
- Lista (T239, T240): Ctrl+N z każdego ekranu, nowa operacja zawsze widoczna, miesiąc z kalendarzem, widok z innego
  ekranu nie zmienia zapisanego filtra („mój filtr”), „Cofnij” zbiorczych zmian tylko swoich pól z komunikatem.
- Edytor (T241): limity notatki i dziennika, „Podziel paragon” z kategorią w pierwszej części i opisem reszty, „Ładownia”
  przy podziale, podkategoria zarchiwizowanej kategorii w wyborze, kwota do grosza, próg dziennika 0.
- Saldo dziś (T242): pytanie przy różnicy, wpisane saldo zostaje do zapisu.
- Szybki wpis (T243): świeże listy w otwartym oknie, zapis odrzuca konto / kategorię / domownika spoza folderu, wpływ bez
  części paragonu, „zaliczka czy przychód” tylko po wyborze.
- Formularze i drobne (T244): szkice „Nowa pożyczka”, „Nowy kontener”, „Nowy cel” i łupów po zmianie ekranu (pusty
  formularz z dzisiejszą datą także po dniach w zasobniku), ściągawka ze skrótem z ustawień, wieczór w ciszy nocnej.
- Przegląd `/code-review` high: 10 kandydatów – 9 poprawionych, 1 bez zmian (T245).
- Testy: 628 unit + fs (nowe `operations-fixes.test.ts` i `operations-state.test.ts` – sklepy okna z atrapą
  `window.fi`; każda poprawka i każde znalezisko przeglądu sprawdzone mutacją: test pada bez niej – 28 mutacji, w tym 6
  na E2E, jedna z nich na teście zegara Playwrighta spoza CI), E2E 48 (nowy `operations-fixes.spec.ts`; `series.spec.ts` z
  ciszą nocną bez północy).

Do sprawdzenia przez użytkownika (po wydaniu 1.6.4, Windows):
1. Ctrl+N na Mostku albo Radarze – nowa operacja w Operacjach; lista na „od–do” bez dziś przechodzi na bieżący miesiąc.
2. Kliknięcie powiadomienia wieczornego albo pozycji „Do zwrotu” na Mostku: filtr zapamiętany zostaje, „mój filtr” go
   pokazuje.
3. Ustawienia → Konta → „Potwierdź saldo” z różnicą: pytanie, „Dopiszę i potwierdzę później” zostawia wpisaną kwotę.
4. Szybki wpis otwarty, w głównym oknie archiwizacja kategorii albo domownika – okno mówi, że lista się zmieniła.

## Przed grupą Q – folder, system, dwa komputery (19.10.2026)

1. **Co trzeba wiedzieć** – grupa P scalona (1.6.4 – PR #26). Grupa Q (1.6.5): niskie pozycje przeglądu dotyczące
   folderu danych, procesu głównego i dwóch komputerów – B67, B107–B117, B119–B124, N62, N91–N100, W37 (przyczyna
   niezapisanych zmian, wpisy nowszej wersji, fi.json i config.json, kopie, obserwator, aktualizacje, Synchronizacja).
   Format folderu bez zmian. B110, B117 i N93 poprawione już wcześniej (W23 w 1.4.3, B31 w 1.5.3, `CLOCK_AHEAD_MS` w
   1.5.3) – tylko odhaczone.
2. **Co użytkownik musi powiedzieć** – ✅ D87. Wybory z przeglądu: B67 – zmiana wpisu nowszej wersji zostaje w oknie z
   komunikatem (bez pętli prób), kroki wymagające zapisu na nią nie czekają; B115 – podfolder na folder danych (stare
   kopie zostają na miejscu); N100 – start z Windows pytany raz banerem na komputerze z działającym budżetem; zapisane
   jako T-decyzje do zmiany na życzenie.
3. **Co przygotować** – nic.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 2 h.

## 1.6.5 – folder, system, dwa komputery (grupa Q, 19.10.2026)

Zakres: „Przed grupą Q” wyżej. Zrobione:
- Wpisy nowszej wersji (T246): `NewerFileError` bez pętli prób, edytory kontenera, celu, pożyczki i planu tylko do
  obejrzenia z dopiskiem, usunięcie bez znikania, zmiany zbiorcze liczą je osobno, gra i plan nie tworzą wpisu na pliku
  nowszej wersji.
- Przyczyna niezapisanych (T247): zamknięcie pyta według przyczyny (decyzja z drugiego komputera – okno decyzji za
  pytaniem), `saveFirst` w kopii, eksporcie, imporcie, cofnięciu, odzyskaniu, aktualizacji i zmianie folderu, `unsavedNote`
  po imporcie i kreatorze, jedno `saveNow` dla Ctrl+S i palety.
- fi.json (T248): zmiany folderu obok zapisu ustawień od razu w oknie, „Weź ustawienia z historii”, ponowienie
  nieczytelnego co 30 s.
- Folder i kopie (T249): odmowa usunięcia przy drugiej kopii i bez historii, obserwator z odstępami do 5 min i logiem raz
  na godzinę, podfolder kopii na folder danych, rotacja tylko nazw FI, kopia nie w ICTTJ, „niedostępny” bez listowania,
  ostrzeżenie i powiadomienie o nieudanych kopiach, eksport z historią.
- config.json (T250): nigdy nie nadpisany domyślnymi; zmiany z chwili nieczytelności dochodzą pole po polu.
- System (T251): pobrana aktualizacja nie przepada, tekst instalacji przy zasobniku i powiadomienie, kreator bez skrótu i
  zasobnika, baner startu z Windows, okna po awarii, maksymalizacja, dymek zasobnika, migawka po przeładowaniu.
- Synchronizacja (T252): nazwy pól i nazw zamiast identyfikatorów, karta konfliktu jak Historia, akcje plików z
  problemem z potwierdzeniem, znacznik zachowanej kopii, „Zaakceptuj nowsze”.
- Przegląd `/code-review` high: 9 kandydatów – 8 poprawionych, 1 bez zmian (T253).
- Testy: 652 unit + fs (nowe `tests/fs/folder-q.test.ts`; poszerzone `data-store`, `backup`, `config`, `datastore`,
  `updater`, `watch`, `merge`, `system`; każda poprawka i każde znalezisko przeglądu sprawdzone mutacją – 31 mutacji, test
  pada bez poprawki; mutacje wykryły błąd logu obserwatora – każdy błąd zamiast raz na godzinę), E2E 52 (nowy
  `folder-q.spec.ts`).

Do sprawdzenia przez użytkownika (po wydaniu 1.6.5, Windows):
1. Edycja tej samej operacji tutaj i na drugim komputerze, „Później” w oknie zmian, potem zamknięcie aplikacji z menu
   zasobnika – pytanie „Zdecyduj o zmianach z drugiego komputera”, „Anuluj” zostawia okno decyzji.
2. Ustawienia → Folder i kopie z własnym folderem kopii: nowy podfolder z nazwą folderu danych; stare kopie na miejscu.
3. Ustawienia → Aktualizacje przy zamykaniu do zasobnika: „zainstaluje się po „Zakończ” w menu ikony…”.

## Przed grupą R – teksty, wygląd, wygoda (19.10.2026)

1. **Co trzeba wiedzieć** – grupa Q w PR #27 (1.6.5). Grupa R (1.6.6): niskie pozycje przeglądu o tekstach i wyglądzie –
   N31 (metafora zawsze z nazwą i kwotą), N33 (formaty kwot i dat), N34 (martwy kod), N35 („Cofnij” zamknięcia pożyczki),
   N53 (odmiana i język), N57 (nieaktualne teksty), N58 (krzywa majątku na Mostku), N60 (czerwień i zieleń tylko dla
   kwot), N61 (nazwa strony kreatora w „Układ”), N72 (jedna nazwa ładowni, misja domowników) – oraz funkcje F30 (skala
   interfejsu i wyższy kontrast – ustawienie komputera) i F40 (ukrycie kwot po bezczynności i przy starcie). Format
   folderu bez zmian (nowe ustawienia tylko w config.json komputera).
2. **Co użytkownik musi powiedzieć** – ✅ D87 (propozycje przeglądu przyjęte). Wybory: N58 – mała krzywa majątku (26
   tygodni) na Mostku z przejściem do Wywiadu, radar i wywiad dalej przez odprawę; N60 – plakietka „zaszyfrowany” zostaje
   jak w ICTTJ; F30 – skala 90–150 % (Ctrl+Plus / Ctrl+Minus, Ctrl+Shift+0 = 100 %), F40 – próg bezczynności 0 = wyłączone;
   zapisane jako T-decyzje do zmiany na życzenie.
3. **Co przygotować** – nic.
4. **Model, thinking, czas** – Opus 5.5 · xhigh (w ciągu na max) · ok. 1,5 h.

## 1.6.6 – teksty, wygląd, wygoda (grupa R, 19.10.2026)

Zakres: „Przed grupą R” wyżej. Zrobione:
- Teksty i formaty (T254): metafory z prawdziwą nazwą (alarmy, Mostek, kreator, plan, gra, Wywiad), daty `plDate`, eksport
  ZIP z datą warszawską, FVG ze znakiem i zł w raportach, jedna nazwa ładowni, stopień w dopełniaczu, misja „Rozliczenie z
  domownikami”, odmiana liczebników, maska „••• zł” w szybkim wpisie, aktualny tekst zasobnika.
- Martwy kod (T255): formatery z ICTTJ, ekran-zaślepka, `copyText`, `isPortable`, `importRecords`; menu „Układ” zna
  kreator i meldunki, na kreatorze go nie ma.
- „zamknij” pożyczkę z „Cofnij” (T256): raty schodzą jak zrzucony kontener, „otwórz” oddaje tylko zdjęte zamknięciem.
- Krzywa majątku na Mostku – 26 tygodni z przejściem do Wywiadu, liczona raz na stan danych (T257); Bearish w akcencie
  (T258).
- Rozmiar interfejsu 90–150 % i wyższy kontrast – ustawienia komputera, wszystkie okna, Ctrl+Plus / Ctrl+Minus /
  Ctrl+Shift+0 (T259); kwoty ukryte po bezczynności, blokadzie ekranu i przy starcie, „Pokaż na 5 min” / „do końca sesji”
  (T260); zakładka Ustawienia → „Wygląd i prywatność”.
- Przegląd `/code-review` high: 10 kandydatów – wszystkie poprawione z testem (T261).
- Testy: 662 unit + fs (nowe `texts-look`, `machine-store`, `loan-close`, `wealth-memo`), E2E 56 (nowy `look.spec.ts`,
  poszerzone `radar`, `intel`); 47 mutacji – każda poprawka i każde znalezisko przeglądu (część przez E2E: proces główny,
  raporty, Radar, Mostek); mutacje i E2E wykryły dwa błędy przed przeglądem – klawisze rozmiaru nie trafiały do
  `before-input-event` z testów (obsługa przeniesiona do okien) i odpowiedź starszej zmiany ustawień komputera cofała
  nowszą (dwa Ctrl+Plus = jeden krok).
- CI (PR #28): E2E kontrastu czerwone dwa razy – diagnostyka w CI pokazała, że reguła pasuje od razu, ale Chromium oddaje
  wyliczony rozmiar części napisów klatkę później (11,5 px tuż po zmianie, 12 px ok. 20 ms dalej, bez żadnej zmiany w
  aplikacji); test czeka na rozmiar jak na inne wartości (lokalnie nie do odtworzenia, także na jednym rdzeniu). Na
  Windows CI ekran ma 720 px wysokości obszaru roboczego: okno szybkiego wpisu przy 150 % jest – zgodnie z F30 –
  przycięte do ekranu (720 zamiast 900), test liczy oczekiwany rozmiar z obszaru roboczego.
- 1.6.5 nie wyszło: job Windows na `main` po scaleniu PR #27 padł na E2E „Cofnij import” (po 10 s 162 z 269 plików
  usuniętych); w PR #28 ten sam test padł na ponownym imporcie (193 z 269). Przyczyna – wolniejszy runner Windows: w tych
  przebiegach każdy test trwał 1,5–2,5 × dłużej niż w PR #27 (np. podobne nazwy 12,6 s zamiast 5,2 s), a test czekał na
  setki plików najwyżej 10 s. Kroki masowe czekają teraz do 30 s (`MASS`, jak 20 s w importie i duplikatach), testy z nimi
  do 3 min. 1.6.5 wchodzi w 1.6.6: notatki wydania dostają sekcje wersji niewydanych od ostatniego wydania
  (`scripts/release-notes.mjs --since`, krok „Publish” podaje ostatnie wydanie – „Co nowego” w aplikacji pokazuje też 1.6.5).

Do sprawdzenia przez użytkownika (po wydaniu 1.6.6, Windows):
1. Ctrl+Plus / Ctrl+Minus w oknie głównym i w szybkim wpisie, Ctrl+Shift+0 – 100 %; „Wyższy kontrast” w Ustawieniach →
   Wygląd i prywatność.
2. „Ukryj po bezczynności: po 1 min” – po minucie bez ruchu kwoty ukryte, „Pokaż na 5 min”; Win+L – kwoty ukryte.
3. Radar → „zamknij” pożyczkę wziętą, „Cofnij” w komunikacie – rata wraca do Ładowni.

## Przed grupą S – operacje, funkcje (19.10.2026)

1. **Co trzeba wiedzieć** – grupa R w PR #28 (1.6.6, z niewydanym 1.6.5). Grupa S (1.7.0): funkcje Operacji z przeglądu
   po 1.4.1 – F10 (przelew między kontami budżetu jedną operacją), F11 (zmiana zaznaczonych naraz), F12 (ostrzeżenie w
   potwierdzonym okresie), F18 (filtry zaawansowane, kolejność, zapisane widoki, eksport widocznej listy), F19 (paleta
   szuka wpisów), F33 (dziennik zmian folderu). Format folderu addytywny: pola przelewu w operacji, `operationViews` w
   fi.json – starsza wersja je zachowuje (przelew w jednej operacji czyta jak jedną stronę).
2. **Co użytkownik musi powiedzieć** – ✅ D87: F10 – „przelew między kontami budżetu = jedna operacja z kontem źródłowym
   i docelowym; import z banku łączy z nią obie strony zamiast dwóch osobnych wpisów”. Reszta wg propozycji przeglądu
   (F12 – tylko ostrzeżenie, D28 zostaje).
3. **Co przygotować** – nic.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 3 h.

## 1.7.0 – operacje, funkcje (grupa S, 19.10.2026)

Zakres: „Przed grupą S” wyżej. Zrobione:
- Przelew w jednej operacji (T262): każda strona na swoim koncie i w swoim dniu (salda, saldo na dzień, krzywa majątku,
  telemetria), warstwy bez zmian; nowy przelew – jedna operacja, przelew sprzed 1.7.0 zostaje jedną stroną do decyzji.
- Import (T263): wiersz drugiego konta dołącza do przelewu (±3 dni, ta sama kwota; przelew bez konta – tylko wiersz
  przelewu własnego), nowy przelew własny na konto budżetu – jedna operacja.
- Meldunki (T264): pary sprzed 1.7.0 z listą do zaznaczenia i „zostaw tak”, przelew liczony dwa razy, brakująca strona
  (od dnia po potwierdzeniu); połączenie nie przenosi strony przez potwierdzone saldo.
- Zmiana zaznaczonych z podglądem skutku i jednym „Cofnij” (T265); ostrzeżenie w potwierdzonym okresie (T266).
- Lista: filtry zaawansowane, kolejność, widoki w fi.json, eksport widocznej listy (T267); paleta szuka wpisów (T268);
  dziennik zmian w Synchronizacji (T269).
- Przegląd `/code-review` high: 10 kandydatów – 9 poprawionych z testem, 1 wydajnościowy bez testu (T270); najważniejszy –
  strony przelewu po dwóch stronach startu budżetu albo dzisiejszego dnia rozjeżdżały sumę warstw z saldami.
- Testy: 707 unit + fs (nowe `transfers`, `operations-list`, `search`, `change-log`; poszerzone `operations-state`,
  `inbox`, `duplicates`), E2E 58 (nowy `operations-s.spec.ts`); 65 mutacji – 64 wykryte, 1 równoważna (T270).
- 1.6.6 nie wyszło: job Windows na `main` po scaleniu PR #28 padł na E2E ukrywania kwot (dwa ukrycia „bez ruchu”, bez
  „koniec pokazania”). Przyczyna – wyścig: ukrycie ręczne kończyło pokazanie dopiero po zapisie config.json, więc przy
  wolnym dysku kasowało „Pokaż na …” zamówione tuż po nim (T271). Odtworzone lokalnie wolnym zapisem
  (`FI_CONFIG_WRITE_DELAY_MS`), poprawione, test ukrywania kwot biegnie teraz z wolnym zapisem. 1.6.5 i 1.6.6 wchodzą w
  1.7.0 (notatki wydania z sekcjami wersji niewydanych).
- CI PR #29: E2E palety raz na kilka przebiegów otwierał poprzednio szukaną operację – po ponownym otwarciu palety
  wyszukiwanie (opóźnione za pisaniem) przez chwilę pokazywało wyniki poprzedniego otwarcia, a Enter wpisany szybko brał
  pierwszy z nich. Każde otwarcie palety ma teraz własne pisanie i wyniki; test czeka na wynik tego zapytania.
- CI PR #29 (Windows): w oknie o najmniejszej szerokości (1024 px) nagłówek listy Operacji wchodził pod panel
  „Szczegóły” – kolejność po kwocie nie dała się kliknąć. Kolumny kontrahenta i kategorii ustępują w wąskim oknie,
  nagłówek nie wychodzi poza listę; E2E filtrów biegnie teraz w oknie 1024 px (błąd odtworzony lokalnie, przed poprawką
  test pada).

Do sprawdzenia przez użytkownika (po wydaniu 1.7.0, Windows):
1. Meldunki → „Przelewy między kontami” → „Połącz…”: lista par, odznaczenie pary do sprawdzenia, „Połącz zaznaczone”;
   salda kont bez zmian, „Cofnij”.
2. Operacje: zaznacz kilka, „Zmień zaznaczone” → podgląd skutku → „Cofnij”; „Więcej filtrów”, widok zapisany na drugim
   komputerze.
3. Ctrl+K → nazwa kontenera albo celu – otwiera się wyróżniony; Synchronizacja → „Dziennik zmian” → „Zmiany”.

## Przed grupą F – szybkość przy dużym folderze (18.10.2026)

1. **Co trzeba wiedzieć** – grupa E (1.4.2) zrobiona. Grupa F (`docs/przeglad/wydajnosc.md`): zapis importu paczkami i
   przyrostowe widoki w procesie głównym (W1, W8), pola tekstowe zapisują po wyjściu z pola (W2), bez podwójnego
   przeliczenia po echu zapisu (W3), duplikaty na żądanie (W4), mniej kopii map i przeliczeń silnika i gry (W5, W9–W13,
   W15), Ładownia bez kwadratowych propozycji (W6), wyszukiwanie operacji (W14), zaległe dni gry porcjami w tle (W16),
   obserwator folderu i skan (W21–W24), kopie: przed importem i dzienna bez `.history`, dzienna także w zasobniku, 14
   dziennych + 8 tygodniowych (W7, F2, N19, C4). Cel: folder 30 tys. operacji bez zacięć ponad 0,1 s przy pisaniu i
   przełączaniu ekranów, 150 tys. – używalny; pomiar przed i po na syntetycznym folderze jak w przeglądzie.
2. **Co użytkownik musi powiedzieć** – ✅ D84 (C4 kopie); nic nowego.
3. **Co przygotować** – nic przed startem; po wydaniu 1.4.3: płynność na prawdziwym folderze w OneDrive, kopia dzienna
   przy aplikacji w zasobniku.
4. **Model, thinking, czas** – Opus 5.5 · max · ok. 3–5 h.

## Przegląd aplikacji po 1.4.1 (18.10.2026)

Prośba użytkownika: niespójności, brakujące funkcje typowe dla aplikacji budżetowych, potencjalne błędy, duże ilości
danych i optymalizacja; model wybrany przez użytkownika (ultracode), skala próby obciążeniowej 150 tys. operacji.

- Raport: `docs/przeglad/README.md` (najważniejsze, pomiary, proponowana kolejność etapów, lista do odhaczania) i
  szczegóły `bledy.md`, `wydajnosc.md`, `niespojnosci.md`, `funkcje.md`. Kod bez zmian.
- Metoda: 10 obszarów × 3 recenzentów + krytyk kompletności; błędy weryfikowane przez dwóch niezależnych weryfikatorów
  (prześledzenie kodu i sonda), reszta przez jednego; 60 z 462 znalezisk obalonych, duplikaty między obszarami scalone.
- Pomiary (syntetyczny folder 10 lat): 30 tys. – Mostek po 7 s, silnik 0,15–0,23 s przy każdej zmianie i co minutę,
  duplikaty 0,4 s, kopia dzienna 20 MB / 23 s; 150 tys. – folder się nie otwiera (B50), po poprawce jednej linii Mostek
  po 54 s, Operacje 8,8 s, pamięć ok. 2 GB.
- Nowe wymaganie użytkownika F0 (w trakcie przeglądu): wydatek finansowany przez wiele osób, także bez konta w banku
  (dziadkowie, tata) – co już jest, czego brakuje i pytania a–e w raporcie; etap 1.5.0 po odpowiedziach.
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
- 18.10.2026 – PR #12 scalony, wydanie 1.4.1 opublikowane; prośba użytkownika: przegląd całej aplikacji (niespójności,
  brakujące funkcje, błędy, duże dane) – model ultracode, skala 150 tys.; pomiary i przegląd wieloagentowy (przerwa na
  limit tygodniowy), nowe wymaganie F0 (wielu finansujących, osoby bez konta); raport `docs/przeglad/`, PR #13.
- 18.10.2026 – PR #13 scalony; odpowiedzi użytkownika na pytania z przeglądu (D83 – babcia i dziadek osobno, reszta
  zalecanych; D84) i komenda „Start E–H”; grupa E (1.4.2): cele od chwili zmiany, pieniądze celu, domownicy i import,
  Ładownia i łupy, folder danych i dwa komputery, szybki wpis, Esc w polach; przegląd i poprawki; PR grupy E do `main`.
- 18.10.2026 – 1.4.2 wydane (PR #14). Grupa F (1.4.3, szybkość przy dużym folderze): okno (silnik raz na dzień, bez echa
  zapisu, pola tekstowe, duplikaty, gra porcjami), magazyn (indeks plików, przyrostowe widoki, zapis i usuwanie paczkami),
  folder (kolejka odświeżeń, zdarzenia katalogów, konflikty bez przeskanowania, otwarcie bez osobnego `stat`), kopie (ZIP
  w jednym przejściu z pamięci, dzienna w zasobniku, 14 + 8); pomiar na 30 i 150 tys.; przegląd `/code-review` high –
  7 poprawek; PR do `main`.
- 18.10.2026 – PR #15 scalony (CI PR zielone, także Windows); E2E na `main` czerwone – `bridge.spec.ts`: okno szybkiego
  wpisu otwarte ponownie chowało się po chwili. Przyczyna: dwie odpowiedzi „Zapisano” na jeden wpis (B51) ustawiały
  dwa liczniki zamknięcia, a okno pamiętało tylko drugi – pierwszy chował okno otwarte na nowo (zależnie od tego, jak
  szybko główne okno odpowie, dlatego PR przeszedł). Test odtwarza to za każdym razem (druga odpowiedź 300 ms później),
  poprawka: jeden licznik; osobny PR do `main` – wydanie 1.4.3 po zielonym CI.
- 19.10.2026 – PR #16 scalony, wydanie 1.4.3 opublikowane (job Windows na `main`). Grupa G (1.5.0): wspólne finansowanie
  (równo / procenty / kwoty) w edytorze, szybkim wpisie, Operacjach i imporcie, prezent, konto „Gotówka”, operacje spoza sald
  na start, zwroty domowników z importu, gra bez naruszeń za cudze zakupy, dokowanie (osierocone i podwójne dokowania,
  pula, wpis usunięty, zasięg pliku, start po dacie pieniędzy, inna kwota), polskie święta; przegląd `/code-review` high –
  10 poprawek; nowy E2E wspólnego finansowania; PR do `main`. Dwa pytania do użytkownika w „Przed grupą H”.
- 19.10.2026 – PR #17 scalony, wydanie 1.5.0 opublikowane. Grupa H (1.5.1): import z mBanku (B34–B39, N12–N16), „Cofnij
  import” (F4), telemetria z historii rachunku (F5), oficer zna marki (F8), audyt reguł (F22); przegląd `/code-review`
  high – 10 poprawek; nowy E2E `import-tools.spec.ts`; PR #18 do `main`.
- 19.10.2026 – PR #18 scalony, wydanie 1.5.1 opublikowane (job Windows na `main`). Odpowiedzi na pytania z grupy G (D85 –
  zostaje jak jest) i komenda „Start I–L” ze zgodą na propozycje (D86); grupa I (1.5.2) – „Przed grupą I”.
- 19.10.2026 – Grupa I (1.5.2): historia średnich od banku, pożyczka bez Radaru, usunięty kontener, podział dokowania po
  zmianie kwoty, saldo otwarcia przed pensją, miesiąc na plus z energii, koperta zarchiwizowanej kategorii, łupy w
  przydziale, „wolne do decyzji”, kreator z ICTTJ i celami, daty bez roku, liczby całkowite, salda każdego konta, podgląd
  szybkiego wpisu, cisza nocna; przegląd `/code-review` high – 8 poprawek; nowy E2E `numbers.spec.ts`; PR #19 do `main`.
- 19.10.2026 – PR #19 scalony, wydanie 1.5.2 opublikowane (job Windows na `main`); grupa J (1.5.3): skrót AltGr,
  autostart portable, okno na ekranie, ekran wyboru folderu po przyczynie, zmiana folderu z postępem i blokadą zapisów,
  tylko do odczytu bez fałszywych sukcesów, „Scal…” kopii konfliktu, historia każdego wpisu, komputer „w użyciu” (baner,
  zapisy w tle, powiadomienia), pierwsze zamrożenie po otwarciu czeka, odłączone panele Mostka; przegląd `/code-review`
  high – 9 poprawek; nowe E2E `system.spec.ts`, `folder.spec.ts`, `presence.spec.ts`; PR #20 do `main`.
- 19.10.2026 – PR #20 scalony, wydanie 1.5.3 opublikowane (job Windows na `main`); grupa K (1.5.4, szybkość – reszta):
  silnik floty bez sortowania całej historii, plan importu i rozpoznanie z indeksami i pamięcią (także kreator), plan od
  nowa tylko przy zmianie treści, ekran importu rysujący tylko zmienione, lista usuniętych bez blokady zapisów, zmiany z
  drugiego komputera naraz; pomiar na 30 i 150 tys.; przegląd `/code-review` high – 7 poprawek; nowy E2E `speed.spec.ts`;
  PR #21 do `main`.
- 19.10.2026 – PR #21 scalony, wydanie 1.5.4 opublikowane (job Windows na `main` za drugim razem – jednorazowe
  zawieszenie testu duplikatów, ponowienie zielone); grupa L (1.6.0): opłaty stałe w miesiącu, szybki wpis seriami,
  wieczorny raport wachty z „Dziś bez wydatków”, meldunki do rozpatrzenia, odzyskanie z kopii; przegląd `/code-review`
  high – 9 poprawek; nowe E2E `fees.spec.ts`, `series.spec.ts`, `inbox.spec.ts`, `recover.spec.ts`; PR #22 do `main`;
  koniec ciągu I–L – pauza (D67).
- 19.10.2026 – PR #22 scalony, wydanie 1.6.0 opublikowane; propozycja grup M–V i komenda ciągu całości bez przerw (D87:
  wszystkie propozycje poza F32, F38, F39, F41, F43). Grupa M (1.6.1): debriefing z kopertami tylko z planu, jedna reguła
  przekroczenia koperty, „Przychody” i „Pieniądze na kontach”, zasięg bez fałszywej klasy, alarmy odprawy do przyczyny,
  minimum osłon ≤ cel, gra po kreatorze; przegląd `/code-review` high – 8 poprawek; PR #23 scalony, wydanie 1.6.1
  opublikowane (job Windows na `main`).
- 19.10.2026 – Grupa N (1.6.2): wpływ na Portfelu XTB jako para wypłaty, pula Podatek z podziałem i sprzed startu, odczyt
  ICTTJ odporny na błędy, ETA z pulą Cele, cel ICTTJ bez kwoty, masa ładunku w dniu zmiany, misje z dniami niezamrożonymi,
  klasa ponad szczyt 30 dni, rozkazy w Dowództwie, saldo na start z datą, podwójna korekta, kreator bez utraty kopert;
  przegląd `/code-review` high – 10 poprawek; nowy test podwójnej korekty w `inbox.spec.ts`; PR do `main`.
- 19.10.2026 – PR #24 scalony, wydanie 1.6.2 opublikowane (job Windows na `main`). Grupa O (1.6.3): import z mBanku –
  rodzaje operacji z polskimi literami, tytuły z podwójną spacją, XTB po kontrahencie, reguły z kategorią zarchiwizowaną,
  podobne nazwy bez słów ogólnych, usunięte nierozliczone nie wchodzą same, paragon przeskalowany, „+ domownik” z
  pytaniem, ekran czeka na zapis, panel duplikatów jak import, szybsze propozycje i reguły; przegląd `/code-review` high –
  10 poprawek; PR do `main`.
