# Wyrocznia liczb – AU-9 (blok C, D97)

Niezależne wyliczenie liczb, które Financial Intel 1.15.4 **powinien** pokazać dla persony „Kapitan Testowy” – tylko
z wymagań (specyfikacja, decyzje D/T, CHANGELOG) i z danych. Rozbieżność z ekranem to błąd aplikacji albo luka
w wymaganiach – rozstrzyga AU-11.

## Metoda

- **Ślepota.** Czytane: `docs/specyfikacja.md` (całość), `docs/decyzje.md` (całość, D1–D97, T1–T313),
  `docs/audyt/wyrocznia-reguly.md`, `docs/plan.md`, `docs/audyt/plan.md`, archiwum postępu – tylko „Przed etapem E7”,
  CHANGELOG (Grep + nagłówek 1.15.4 / 1.15.3), CLAUDE.md „Dane”. Wyjątek formatu: `src/shared/schema/{records,budget,
  settings,common}.ts` – tylko nazwy i znaczenie pól. Żadnego innego pliku `src/`, `tests/` (poza tym katalogiem),
  `game/`, `.history/`, odczytów ani raportów laboratorium.
- **Uczciwie:** środowisko samo wstrzyknęło do kontekstu pliki `.claude/rules/silnik.md`, `wydanie.md`, `testy.md`
  (zasady i mapa nazw modułów `calc/`, bez liczb) – nie służyły do obliczeń. Dane wejściowe zawierają rekordy zapisane
  przez aplikację (cele ICTTJ utworzone 03.11 14:17 UTC, paczka importu, `budget.initial` stanu `start`). Zgodność
  średnich kosztów stanu `start` z `budget.initial.hull` kreatora (6 × 6 646,75 zł) posłużyła tylko jako kontrola
  zaokrąglenia średniej (Z3). Liczb aplikacji z ekranów nie widziałem.
- **Skrypt** (Node 24, tylko moduły wbudowane, deterministyczny): `tests/audyt/wyrocznia/wyrocznia.mjs` + `lib/`
  (`daty`, `dane`, `kwoty`, `silnik`, `gra`, `raport`). Silnik liczy dzień po dniu od startu budżetu do dnia chwili;
  migawka końca każdego dnia służy grze. Pomija `game/`, `.history/`, `backups/`, `.presence/` i pliki niekanoniczne
  (kopie konfliktów). Każda kwota jako `{gr, zl}`; warianty sprzeczności obok siebie.

```
.tools\node-v24.21.0-win-x64\node.exe tests\audyt\wyrocznia\wyrocznia.mjs --dane <folder FI> [--ictj <folder ICTTJ>] --chwila "2026-11-03 12:00" [--json <plik>]
.tools\node-v24.21.0-win-x64\node.exe --test tests/audyt/wyrocznia/wyrocznia.test.mjs tests/audyt/wyrocznia/wyrocznia-u3.test.mjs   # 24 + 13 testów (u1, u2, u3)
npm run test:wyrocznia     # u3: regresja na migawkach audytu (wyrocznia a silnik aplikacji, ok. 2 min) + testy wyroczni
```
Wyniki z 03.11: `C:\FI-audyt\wyrocznia\{rok,start}-2026-11-03-1200.{json,txt}`, `rok-2026-11-03-2000.json`; u3 (04.11):
`C:\FI-audyt\wyrocznia\u3\` (`rok-1200.json`, `regresja.json`).

## Reguły (źródła)

| # | Reguła | Źródło |
| --- | --- | --- |
| R1 | Grosze całkowite; podział w dół, reszta w ostatniej części | T3 |
| R2 | Suma warstw = salda kont (osłony, energia, kadłub, cele, zbiorniki, rezerwa PIT, depozyt, łupy czekające) | spec „Pieniądze”, T4, T107 |
| R3 | Saldo otwarcia na początek dnia, potwierdzenie na koniec; operacje sprzed salda otwarcia w saldzie | T25, T106 |
| R4 | Start: podział z kreatora (kadłub, cele, zbiorniki), reszta w osłonach | T51, budget.initial |
| R5 | Pensja 1. dnia (w dniu startu – pomniejszona o koszty netto dni przed startem) z osłon, brak → kadłub (żółty), dalej częściowa (czerwony) | D11, D14, T45, T177, T220 |
| R6 | Odkładki 1. dnia z energii: plan (równo, reszta w ostatnim) + równa część braku / − część nadwyżki zbiornika; płatność ze zbiornika, brak z energii | T29, T135, T136, T286 |
| R7 | Raty celów z terminem tylko przy pełnych osłonach i kadłubie przed pensją, z energii, po priorytecie | T272 |
| R8 | Wydatek z energii; ponad energię → osłony → kadłub → deficyt; cele nigdy | T28, T32 |
| R9 | Dostawa: osłony do 3 × pensja → kadłub do 6 × średnie koszty → cele wg priorytetu → reszta osłony; cel nieznany → osłony | D13, T26 |
| R10 | Cele w stanie z chwili `cameIn` (utworzenie dokowania, bez niego operacji, nie wcześniej niż początek dnia); `activeFrom`, `past` | T128 |
| R11 | Pula Cele → najpierw cele ICTTJ, potem własne; pula Podatek → rezerwa (nie koszt, nie przychód); PIT-38 z rezerwy | D55, D72, T65, T119, T224 |
| R12 | Dopłata do XTB z osłon; alarm firewall, gdy osłony < cel albo kadłub niepełny | D23, T31 |
| R13 | Koszty netto: wydatki własne (z ładownią i ratami), bez części domowników, pieniędzy celów, przelewów, XTB, PIT-38 | spec, T24 |
| R14 | Średnie: pełne miesiące od pierwszego objętego w całości (początek = najstarsza operacja z banku), bez luk, ostatnie 12, przed bieżącym; < 3 → koszty przyjęte | T27, T173 |
| R15 | Przychody: praca bez pieniędzy domowników; trading = wypłaty − dopłaty bez puli Podatek (też sparowanej przed startem), miesiąc ≥ 0, okno netto | D81, T119, T120, T186, T224 |
| R16 | Łupy = niewydana energia; decyzja do 7., inaczej 8. dnia do osłon | D18, T28, T52 |
| R17 | Przydział = (koperty codzienne + łupy „na następny” − wydatki codzienne przed dziś) / dni do końca z dziś, w dół; bez kategorii = codzienny; ładownia, cele, domownicy – nie | T30, T180 |
| R18 | Energia dziś = przydział − wydane dziś; podstawowy = koperty codzienne / dni miesiąca | T295, spec „Wywiad” |
| R19 | Zasięg = max(0, osłony + kadłub − dług) / średnie koszty, napis obcięty do 0,1; klasy 1/3/6/9/12, próg do wyższej | T10, T71, T218 |
| R20 | Wolne do decyzji tylko przy pełnym kadłubie; minimum osłon = min(minimum, cel) × pensja | T181, T219 |
| R21 | Domownicy: zakup – najpierw zaliczka, resztę pożyczają osłony; prezent – reszta z osłon; wpłata najpierw spłaca (wskazane, przed `assignFrom` najstarsze), reszta zaliczka / przychód | D80, D83, D91, T105, T157, T304 |
| R22 | Pożyczki: udzielona z osłon, spłaty do osłon do wysokości długu; wzięta do osłon, dług = harmonogram − raty kontenera; rata zaległa 3 dni po terminie | D72, T70, T71 |
| R23 | Para ICTTJ: ta sama kwota, od −3 dni do +3 dni roboczych (święta PL); bez pary: czeka na import, po oknie i z importem dalej – Portfel XTB | D56, T63, T162, T164 |
| R24 | Gra: dni od `game.start` do D−2; zwykłe – przydział na minusie, koperta planowa ponad limit, ładunek ponad linię po wzroście; poważne – koperta > 120 %, osłony < minimum przez decyzję, firewall, potwierdzony zakup nocny (bez „plan”) | D73, T9, T75, T161, T187, T216, T227, N-PC-19 |
| R25 | Seria, rekord; awans: dni zgodne w 35 od zmiany + 3 × misje ≥ 30; degradacja przy 3. poważnym w miesiącu | D73, T77 |
| R26 | Misje: słabe punkty z 4 tygodni przed poniedziałkiem (kolejność T78), inna niż zeszła; warunki z „Przed etapem E7” | D73, T78 |
| R27 | Masa ładunku = wagi miesięczne (okresowy: kwota × płatności w roku / 12) / pensja; linia 40 % | spec, T286 |
| R28 | Daily Bias: Bullish – energia dziś ≥ podstawowy i koperty planowe w limitach; Bearish – < ½ podstawowego albo osłony < minimum | spec, T57, T216 |

## Założenia (Z) i sprzeczności (S)

| Id | Treść | Od czego zależy |
| --- | --- | --- |
| Z1 | Łupy poprzedniego miesiąca do decyzji to osobna część (nie osłony) | osłony 13 000 vs 13 803,48; zasięg 7,8 vs 8,0 |
| Z2 | Cel kadłuba w chwili t = 6 × średnia z pełnych miesięcy przed miesiącem t (też na przełomie – miesiąc nowy) | warunek rat celów (bez skutku: Laptop pełny) |
| Z3 | Średnia kosztów zaokrąglona do grosza (połówki w górę) | cel kadłuba 39 185,22 |
| Z4 | Zwrot towaru wraca do energii | energia, łupy |
| Z5 | Rata zbiornika ≥ 0; część braku / nadwyżki = w dół, reszta w miesiącu terminu (liczona co miesiąc) | raty Prądu |
| Z6 | Raty pożyczki wziętej (wydatki jej kontenera) są kosztem netto (spec ich nie wyłącza) | cały przebieg dokowania; wariant bez rat (`wariantZ6` w JSON): średnia 6 072,54, cel kadłuba 36 435,24, kadłub 36 316,32, Wakacje 4 948,94, zasięg 8,0 |
| Z7 | „Rower”: `archived: true` bez `past` = zarchiwizowany od zawsze → 0 zł, przeniesienie 2 500 zł przenosi 0 (T129 min(kwota, stan)); `achievedAt` w danych sprzeczne | stan celu (oba warianty dają 0 – cele dostały pieniądze dopiero od 06.2026) |
| Z8 | `cameIn` historii z banku = import 27.10.2026 | które cele były aktywne (bez skutku – laptop i wakacje aktywne) |
| Z9 | Przydział w dół także dla wartości ujemnych; podstawowy przydział w dół do grosza | 83,33 zł |
| Z10 | Salda kont liczą wszystkie operacje dnia (godzina nie dzieli dnia); 12:00 = 20:00 dla obu stanów | — |
| Z11 | (u1: wariant, główny = D72) Wpis ICTTJ sprzed startu bez pary, z oknem za startem → „czeka na import” | `start`: wpis 31.10 (`stanZ11`) |
| Z12 | Misje tylko w tygodniach, w których aplikacja działała (A); model tygodniowy (B): „koperta ponad tempo” = wydane > limit × dzień/dni, „najczęściej przekraczana” = najwięcej takich dni, część tygodnia = limit × 7/dni | stopień |
| Z14 | (u2) Chwila liczona do końca minuty („15:49” = 15:49:59,999) – zapisy z minuty odczytu się liczą | pokrycia kopert, cele na Radarze |
| Z15 | (u2) Radar: pozycje po terminie w swoim dniu (lista, osłony po zdarzeniu), w saldach naprzód – dziś; w jednym dniu spłata przed boją i pensją | kolejność osłon po zdarzeniu |
| Z13 | (u1) T163: dzień wstrzymany = wcześniejszy z dnia wpisu ICTTJ i dnia pary; czeka najwyżej 7 dni po zwykłym zamrożeniu | ostatni zamrożony dzień |
| S1 | Zasięg: przykład spec „6,5 → 7,8” (zaokrąglenie) vs T218 (obcięcie: 6,4) | rok: 7,8 vs 7,9 |
| S2 | „Na plus”: spec (koszty ≤ pensja) vs T178 (wynik energii ≥ 0) | 10.2026: oba „na plus” |
| S3 | Łupy: T28 niewydana energia vs spec „niewydane z kopert” | 803,48 vs 916,37 (netto 324,81) |
| S4 | Wpłata domownika: spec / D80 b / D91 (najpierw spłata) vs 1.15.3 `inflowKind` (zaliczka / przychód bez spłaty) | Marek, depozyt, cel Wakacje |
| S5 | Zakup nocny „plan”: spec (każdy potwierdzony poważny) vs N-PC-19 | bez skutku (jedyny w grze 12.09 – impuls) |
| S6 | Energia dziś: spec / T30 (przydział) vs T295 (przydział − wydane dziś) | 89,28 vs 77,28; Daily Bias |
| S7 | Daily Bias: pierwszeństwo Bullish / Bearish i chwila (przed / po dzisiejszych wydatkach) | Neutral vs Bullish |
| S8 | D73 „dzień bez wpisów zgodny” vs T227 „wydatki dnia ≤ energia dziś” przy ujemnym przydziale | 30.09 bez zmian; wariant B gry |
| S9 | Koperta planowa: naruszenie każdego dnia z wydatkiem ponad limit vs tylko dzień przekroczenia | 33 vs 36 dni zgodnych |
| S10 | „Asteroida rozbita” – opłata roczna: cykl 12 (Podatek z harmonogramem 4×/rok) czy płatna raz w roku | 15.09.2026 vs brak |

## Wartości – stan `rok`, 2026-11-03 12:00 (20:00 – identycznie)

**Konta i warstwy (P1).** Start budżetu 2025-09-01 (podział: osłony 15 000, kadłub 5 800).

| Wielkość | Wartość |
| --- | --- |
| mBank / Portfel XTB / Gotówka | 69 747,04 / 3 918,89 / −55,36 zł · razem **73 610,57 zł** |
| Kontrola | potwierdzenie mBank 26.10 69 796,78 = wyliczone 69 796,78 = plik mBanku (różnica 0,00) |
| Osłony | **13 000,00 zł** (z łupami 13 803,48 – Z1) |
| Energia (zostało w XI) | **6 204,63 zł** (start XI 6 216,63 = 6 500 − odkładki 283,37) |
| Kadłub | **39 066,30 zł** (cel 39 185,22 – brakuje 118,92, kadłub niepełny) |
| Cele | Nowy laptop 6 000,00 / 6 000 (pełny 20.10) · Wakacje 2027 2 198,96 / 8 000 · Rower (archiwum) 0 · cele ICTTJ 0 / 40 000 i 0 / 3 000 |
| Zbiorniki | OC 1 240,00 · Podatek od nieruch. 150,00 · Prąd 210,00 (razem 1 600,00) |
| Rezerwa PIT-38 / łupy X | 0,00 / 803,48 zł |
| Depozyt domowników | Anna 4 377,20 · Kasia 360,00 · Marek 0,00 (razem 4 737,20; wariant S4-B: Marek 60,00) |
| Suma warstw | 73 610,57 = salda (różnica 0,00 – niezmiennik spełniony każdego dnia) |
| Cel osłon / minimum / wolne | 19 500,00 / 6 500,00 / 0,00 zł (kadłub niepełny – T181) |

**Koszty, propozycje, przychody.**

| Wielkość | Wartość |
| --- | --- |
| Koszty netto XI.25…X.26 | 7 962,41 · 6 808,88 · 6 436,06 · 5 840,35 · 6 772,32 · 6 045,23 · 6 420,02 · 6 370,87 · 6 709,18 · 6 043,49 · 7 548,47 · 5 413,19 |
| Średnie 12 / 6 / 3 | **6 530,87** / 6 417,54 / 6 335,05 zł (koszty przyjęte – brak; użyta 12-mies.) |
| Propozycja pensji | 6 500 zł (śr. 6 mies. w górę do 100 zł) |
| Propozycje kopert (śr. 3 mies., w górę / najbliższe 10 zł) | Jedzenie 1 320/1 320 · Auto 950/950 · Osobiste 610/610 · Gotówka 140/130 · Rozrywka 310/310 · Zdrowie 70/70 · Zwierzęta 290/280 · Prezenty 360/350 · Dom 130/120 |
| Przychody (praca 7 500 co miesiąc) | trading: XII 3 500, II 5 000, IV 3 000, VI 2 500, VII 4 500, IX 2 000, X 4 000 (III −1 000 → 0) |
| Średnie „Razem” 3 / 6 / 12 | 9 500,00 / 9 666,67 / 9 458,33 (trading 12: okno netto 1 958,33, suma miesięcy 2 041,67); mediana 12: 9 750 (trading 2 250) |
| Ostrzeżenie „pensja > przychody” | nie (6 500 < 9 666,67) |

**Plan listopada i dziś.**

| Wielkość | Wartość |
| --- | --- |
| Pensja / wypłacono | 6 500 / 6 500 z osłon (kadłub 0, brak 0, bez alarmu) |
| Odkładki XI | OC 103,37 · Podatek 75,00 · Prąd 105,00 (bez wyrównań) · raty celów 0 (osłony 19 500 pełne, kadłub 39 066,30 < 39 185,22) |
| Koperty codzienne | Jedzenie 1 600 · Rozrywka 450 · Osobiste 350 · Gotówka 100 = 2 500 |
| Koperty planowe XI | Dom 300 · Auto 650 · Zwierzęta 200 · Zdrowie 150 · Prezenty 200 – wydane 0 (0 %) |
| Przydział dziś | (2 500 + 0 − 0) / 28 = **89,28 zł**; wydane dziś 12,00 (Mokka 08:10) |
| Energia dziś | **77,28** (T295) / 89,28 (spec); podstawowy 83,33 |
| Łupy X.2026 | **803,48** (energia) · 916,37 (koperty, S3); decyzja do 07.11, bez niej 08.11 → osłony |
| Zasięg / klasa | (13 000 + 39 066,30 − dług 500) / 6 530,87 = 7,8958 → **7,8** (obcięcie) / 7,9 · **Niszczyciel** (z łupami 8,0) |
| Daily Bias | Neutral (T295) / Bullish (spec) |

**Rozliczenia, ładownia, dokowanie, debriefing (P2).**

| Wielkość | Wartość |
| --- | --- |
| Anna / Kasia | ma oddać 0, zaliczka 4 377,20 / 0, 360,00 |
| Marek | A: ma oddać **300,00** od 24.09 (40 dni, przypomnienie > 30 dni), zaliczka 0 · B: 360,00 od 20.08 (75 dni), zaliczka 60,00 |
| Pożyczka dla Tomka | 2 000, spłacono 1 000, zostało 1 000; zaległe 2 raty = 1 000 (od 07.09 i 08.10) |
| Pożyczka od rodziców | 6 000, spłacono 5 500 (11 rat kontenerem), zostało 500; rata 28.10 zaległa od 31.10 |
| Masa ładunku XI | 2 014,32 zł = 30,99 % (30,9 % obcięte) < 40 % (rata rodziców do X.2026) |
| Stan zapłaty XI | CityFit (1.11) – czeka na import (pliki do 26.10); pozostałe – termin przed nami; OC 25.11 (zbiornik 1 240), Podatek 15.11 (150), Prąd 20.11 (210) |
| Sygnały ładowni | Spotify – cichy kontener (brak płatności 08.09 i 08.10); Netflix – nowa cena 49,00 zamiast 43,00 |
| ICTTJ | zadokowane: 20.10.25, 18.12.25, 15.02 (Podatek → rezerwa), 18.02, 20.04, 18.06 (Cele → laptop 2 500), 20.07, 18.09 (Cele → laptop 2 000), 19.10 (→ laptop 801,04, wakacje 2 198,96); 05.03 zwrot do masy 1 000 – para 05.03, niezadokowany (firewall); 25.10 (1 500, Cele) i 31.10 (3 200) – czekają na import |
| XTB bez wpisu ICTTJ | 14.10.2026 +1 000 zł (przypomnienie do 13.11) |
| Debriefing X.2026 | energia 6 500 − 283,33 = 6 216,67; wydane z energii 5 413,19; wynik **+803,48**; koszty netto 5 413,19 → „na plus” (S2: oba); pula dzienna 2 500 / 1 766,52 (FVG +733,48); FVG: Dom −69,89 · Auto +87,12 · Zwierzęta +23,84 · Zdrowie +71,93 · Prezenty −521,67; ładownia 1 738,00; sfinansowane przez Annę 169,86 |

**Gra (P3)** – start 04.09.2026, zamrożone do 01.11 (59 dni).

| Wielkość | Wartość |
| --- | --- |
| Dni zgodne / z naruszeniem / z poważnym | 33 / 26 / 7 (wariant S8+S9: 36 zgodnych) |
| Poważne | 04.09 Zwierzęta 201,7 %; 12.09 Auto 144,7 % + zakup nocny 23:20 Shell 239,05; 19.09 i 25.09 Auto; 22.09 Zwierzęta; 22.10 Prezenty 360,8 %; 23.10 Dom 123,3 % (IX: 6, X: 2, XI: 0) |
| Zwykłe | przydział: 04, 08, 11, 12, 13, 18, 20, 23, 24, 26, 27, 29, 30.09; 03, 13, 17, 19, 21, 25.10 · koperta: 10.09 Auto, 09.10 Dom |
| Seria / rekord | **7** (26.10–01.11) / **7** |
| Stopień | **Kadet** (A – bez misji w minionych tygodniach: okno 28.09–01.11 = 24 dni zgodne < 30) · Chorąży od 29.10 (B – model misji co tydzień: wykonane W39, W40, W41, W44) |
| Klasa | Niszczyciel przez cały okres gry (zasięg 7,6–8,9) |
| Misja W45 | A: Koperta pod kontrolą (pierwszy słaby punkt); B: Pełna energia (W44 = Koperta) |
| Osiągnięcia (od startu gry) | Pełne osłony i Pancerny kadłub 10.09 · Pierwsze dokowanie 19.09 · Cisza w eterze 12.10 · Cel osiągnięty 20.10 · Seria 7 01.11 · Asteroida rozbita 15.09 (S10) · bez: Seria 30, Flagowiec, Czyste konto, Hat-trick |
| Smaczki | Judas 10.09, 12.09, 23.09, 02.10, 22.10 · Turtle Soup 12.09 (zwrot Zara 149,99) |

**P4.** Majątek netto 69 673,37 (konta 73 610,57 + Tomek 1 000 − domownicy netto 4 437,20 − dług 500); krzywa
(koniec miesiąca): IX.25 23 236,53 … X.26 73 622,57; bilans paliwa X.26 6 086,81 (stopa 52,9 %), IX 20,5 %;
dziennik: plan 29, impuls 26 (5 093,86 zł), trafność 52,7 %; Radar do 01.02.2027: OC 1 240 (25.11, zbiornik
1 240), Wesele −800 (21.11), zwrot Allegro +320 (21.11), PIT-37 +1 450 (18.12), pensje 1.12 / 1.01 / 1.02, osłony po
zdarzeniach 13 000 → 14 000 → 13 200 → 6 700 → 8 150 → 1 650 → −4 850 (bez wpływów); PIT-38 niewidoczny (od 1.02).

## Wartości – stan `start`, 2026-11-03 12:00

| Wielkość | Wartość |
| --- | --- |
| Konta | mBank 72 073,56 · Portfel XTB 2 450,00 · Gotówka 180,00 = **74 703,56 zł** |
| Warstwy | osłony **13 400,00** (20 100 − pensja 6 700) · energia **6 700,00** · kadłub **39 880,50** (pełny) · Wkład własny 14 723,06 / 40 000 · reszta 0 |
| Cele warstw | osłony 20 100 (min 6 700) · kadłub 6 × 6 646,75 = 39 880,50 · wolne 0 |
| Średnie kosztów 12 / 6 / 3 | 6 646,75 / 6 697,46 / 6 516,68; propozycja pensji 6 700 |
| Przychody 3 / 6 / 12, mediana | 8 953,33 / 8 976,67 / 9 113,33 (Podatek 1 800 sparowany przed startem wyłączony – T224); mediana 7 680; bez ostrzeżenia |
| Przydział dziś | 2 630 / 28 = **93,92 zł**; energia dziś 93,92; podstawowy 87,66 |
| Zasięg / klasa | 53 280,50 / 6 646,75 = 8,016 → **8,0** · Niszczyciel |
| Masa ładunku | 1 738,00 = 25,9 % |
| ICTTJ | wszystkie 12 wpisów „sprzed startu” (u1, D72; Z11 – 31.10 czeka na import – w `stanZ11`) |
| Gra | start 04.11 – brak dni do oceny; Daily Bias Bullish |

## Czego wyrocznia nie liczy

- Krzywa majątku: BOS / CHoCH i drawdown (są tylko punkty tygodniowe i miesięczne sald); Killzones (mapa), Wyprawy,
  osobista inflacja, kurs 12 miesięcy i manewry (T276, T277), anomalie (T288), zwroty w drodze poza Radarem – czas.
- Celebracje klasy (T227 / D84 C10), dziennik wachty, ekran awansu – zdarzenia okna, nie liczby.
- Ocena dni według danych „w chwili zamrożenia”: wyrocznia ocenia według bieżącego folderu (aplikacja zamraża
  wtedy, gdy otworzyła folder – w laboratorium te same dane, chyba że wykonawcy coś zmienili przed zamrożeniem).
- Pary ICTTJ „inna kwota” (T162, T176), ręczne podziały dokowań, D94 (wcześniejsza wpłata na późniejszy zakup), przelewy
  dwustronne z różnymi dniami – zaimplementowane prosto, w danych persony nie występują.
- Misje minionych tygodni – tylko model (Z12); progi misji („połowa średniej”, „80 % części tygodnia”) to interpretacje.

## Poprawki po uzgodnieniu

**u1 (03.11.2026, pole `wersja`: „2026-11-03 u1”).** Uzgodnienie odczytów bloków A–B
(`C:FI-audytwyroczniaozbieznosci-ab.md`, odpowiedzi: `C:FI-audytwyroczniaodpowiedzi-ab.md`). Wartości stanów
`rok` i `start` w tabelach wyżej – bez zmian poza Radarem i wpisem ICTTJ 31.10 w `start`.

| Pozycja | Co | Dlaczego (źródło) |
| --- | --- | --- |
| R-1 | Saldo na start rozliczeń: `household.since` i `members[].opening` – rejestr zerowany w dniu rozliczeń, należność jako pozycja `opening:<osoba>`, depozyt z osłon; `coversOpening` spłaca ją najpierw | T115, T116, T121, T228, D91 |
| R-2 | Miesiąc startu: wydatki codzienne od 1. dnia miesiąca to „wydatki przed dziś” przydziału | T45 |
| R-3 | Miesiąc startu: koperty planowe liczą wydatki od 1. dnia miesiąca (analogia – luka) | T45, spec „miesiąc kalendarzowy” |
| R-4 | Nowe pole `warstwy.srodkiNaPoczatekDniaStartu` (podstawa podziału kreatora) | T51, T25 |
| R-5 | Radar: pensja z osłon, brak z kadłuba, dalej niewypłacona; boja-wydatek z osłon i kadłuba; boja-wpływ wg D13; pola `kadlubPo`, `niewyplacono` | T275, D14 |
| R-6 | Wpis ICTTJ sprzed startu bez pary = „sprzed startu” (Z11 jako `stanZ11`) | D72, T63, T162 |
| R-7, R-8 | Pole `pozyczki[].zalegle.terminNajstarszej` (termin raty obok dnia zaległości) | T70 – luka tekstu |
| R-9 | Pole `ladownia.masaProcentPensjiZaokraglone` | luka |
| R-10 | Dzień płatności kontenera z historii (Radar, Ładownia, stan zapłaty); niezapłacona płatność bieżącego miesiąca po terminie liczona dziś w saldach naprzód | T208, T221, T274 |
| R-12 | Konto bez salda otwarcia = suma operacji (saldo 0 od pierwszej operacji) | spec – suma warstw = salda |
| R-13 | Wariant B gry: ujemny przydział jak 0 także w kwocie; pola `amountT227` / `amountPrzydzial0`; lista dni B w JSON | luka (S8) – aplikacja = B |
| R-14 | T163: dzień z parą ICTTJ czekającą na dokowanie nie zamarza (najwyżej 7 dni – Z13); `gra.wstrzymaneDniT163` | T163 |
| R-16 | `p4.bilansPaliwaMediany` – mediany stóp z dokładnych i ze zaokrąglonych | T294 – luka |
| R-17 | `p4.dziennikKapitanski.miesiace` – kwoty własne i pełne | spec, T82, T161 – luka |
| R-19 | `p4.przegladRoczny` – saldo na 31.12 roku wcześniej liczone od salda otwarcia wstecz | T81, T83 |
| — | Przychód domownika sprzed dnia rozliczeń poza statystyką | T119 |

Bez zmian (potwierdzone albo luka bez nowego pola): R-11 (S4 – wariant B już w JSON), R-15, R-18.
Nowe testy: R-1, R-2/R-3, R-12, R-14, R-5/R-10 – razem 17, wszystkie przechodzą.

**u2 (03.11.2026, „2026-11-03 u2”).** Uzgodnienie bloku C (`C:FI-audytwyroczniaozbieznosci-c.md`, odpowiedzi:
`C:FI-audytwyroczniaodpowiedzi-c.md`). Stany `rok` i `start` – główne liczby bez zmian.

| Pozycja | Co | Dlaczego (źródło) |
| --- | --- | --- |
| C1 | Dokowanie z zapisanym podziałem także przy puli Podatek: podatkiem tylko `taxHold`; cele zarchiwizowane pominięte; przychód bez części `taxHold` | T224, T176, T119 |
| C2, C8 | Cykle opłat okresowych zamykane według T135 (płatność w miesiącu terminu; przy cyklu ≥ 3 w miesiącu przed terminem przy zamkniętym poprzednim, inaczej zaległa zapłata poprzedniego); zapłacony cykl bez rat; Radar z tego samego stanu | T135, T29 |
| C3 | Waga miesięczna kontenera w groszach, w dół | T3 |
| C4, C5, C6 | Limity kopert = plan + zapas z łupów ± pokrycia (chwila ≤ teraz; gra – sprzed dnia oceny); pula dzienna z limitów kategorii codziennych; debriefing z łupami i zapasem dawanymi miesiącowi; `debriefingiMiesiecy` | T278, T279, T178, T180 |
| C7 | Mniej niż 3 pełne miesiące: koszty przyjęte, a bez nich średnia z dostępnych pełnych miesięcy | T27, T26 |
| C9 | Radar: cele aktywne w chwili liczenia (nie 12:00 UTC); chwila = koniec minuty (Z14) | T275, T128 |
| C10 | Radar: boje po terminie (30 dni, dopasowanie operacji), zwroty po terminie, koniec kontenera; pozycje po terminie w swoim dniu (Z15) | T273, T274, T289 |
| C11 | Części wpłaty ponad kwotę ucinane | T117 |
| C12 | Cel ICTTJ bez kwoty w swoim miesiącu bierze resztę puli Cele | T226 (N46 a) |
| C13 | Para z puli Podatek wyłączona z przychodu tylko sprzed startu; po starcie – z rekordem dokowania | T224, T163, T119 |
| C14 | Wariant `stanOstatniWiersz` (zasięg plików: `coveredTo` albo ostatni wiersz z banku) | luka: T162 vs T208 / T285 |
| C16 | `biezacyMiesiac` – koszty miesiąca w toku z operacjami o przyszłej dacie i bez | luka |
| C20 | `ratyOdkladek[].planowana`, `ratyOdkladekPlanRazem` – rata wymagana obok pobranej | luka |
| C21 | `razemZCzesci` – „Razem” jako suma zaokrąglonych części | luka |
| C22 | `p4.tempoCelow` – tempo (pula Cele + reszta, do 6 pełnych miesięcy budżetu) i ETA celów, „po terminie” | T67, T226, T220 |
| C23 | Wcześniejsza wpłata na wskazany późniejszy zakup: rezerwacja w depozycie, zużywana najpierw, chroniona | D94, T312 |

Potwierdzone bez zmian: C15, C17, C19. C18 – tylko argument za wariantem (bez liczenia). Nowe testy: C1, C2, C6, C7,
C11, C12, C23 – razem 24, wszystkie przechodzą.


## Przegląd kodu wyroczni (AU-11, krok 0, 03.11.2026)

Niezależny przegląd (Opus 5.5 · xhigh, bez kodu aplikacji poza schematami): `C:\FI-audyt\wyrocznia\przeglad.md` –
24 uwagi: 1 wysoka, 4 średnie, 19 niskich. Silnik wyroczni uruchomiony na wszystkich 410 parach migawka–dzień z odczytów:
suma warstw = salda kont każdego dnia, bez błędów wykonania.
- **Wysoka (W1):** przy dokowaniu z zapisanym podziałem pieniądze celu sprawdzane są wobec obecnej archiwizacji celu,
  a nie stanu z chwili dokowania (T128, T176) – to C24 z `LICZBY-C.md`: błąd wyroczni, odczyt `pr:38` (PR.1-25) jest
  zgodny z aplikacją.
- **Średnie (bez zmiany werdyktów audytu):** S1 naruszenie „ładunek” porównuje masy całych miesięcy 1. dnia, bez dnia
  zmiany (fałszywe naruszenie przy kontenerze dodanym później w miesiącu); S2 osłony poniżej minimum bez doliczenia
  pożyczonego domownikom tego dnia (T161); S3 zakup nocny, impuls i zwrot liczone na linię paragonu, nie na operację;
  S4 `household.openingIds` pomijane.
- Niskie: m.in. niedobór przelewu / korekty z kadłuba (T31), „do przypisania” nigdy nie zużywane (T304), parowanie ICTTJ
  bez części warunków T224 / T162, problemy odczytu ICTTJ pomijane w uwagach, wartości persony wpisane na sztywno
  (saldo pliku mBanku, dwa osiągnięcia).
- Wyrocznia nie jest poprawiana w audycie (werdykty się nie zmieniają); przed użyciem jej do testów regresji po grupach
  naprawczych – poprawić W1 i S1–S4.

## u3 – wyrocznia poprawiona i włączona jako regresja (AP-32, N2, 04.11.2026, „2026-11-04 u3”)

Ślepota bez zmian: poprawki tylko z przeglądu kodu wyroczni (`C:\FI-audyt\wyrocznia\przeglad.md`) i z wymagań – D99,
D100 i T340–T362 (`docs/decyzje.md`); format danych z kopii schematów `lib/schemat.mjs` (nazwy pól, wartości domyślne,
brak ≠ null – przepisane z `src/shared/schema` @ 281e4f4; zgodność kopii ze schematami sprawdza regresja). Silnik
aplikacji czyta tylko regresja (`regresja.test.ts`, `tests/unit/wyrocznia-ap32.test.ts`), nigdy wyrocznia.

| Pozycja | Co | Źródło |
| --- | --- | --- |
| W1 = C24 | podział dokowania do celu – cel w stanie z chwili dokowania (`goalAt`), nie dzisiejsze `archived` | T128, T176 |
| S1 | „ładunek”: masa miesiąca znana na koniec dnia wobec znanej na koniec dnia poprzedniego (utworzenie, `archivedAt`, `amountAt`); kontener `from` null – bez dolnej granicy | T75, T227, schemat |
| S2 | osłony poniżej minimum z doliczeniem pożyczonego domownikom tego dnia | T161 |
| S3 | zakup nocny, impuls, zwrot i wydatek z godziną – raz na operację (moja część) | T161, T187 |
| S4 | operacje domowników sprzed rozliczeń spoza `openingIds` – zaraz po saldach na start; rezerwacje D94 i pominięte zerowane w dniu rozliczeń (N4) | T159, T312 |
| N1, N2, N5, N6, N8, N9, N11, N12, N14, N15, N16, N17 | przelew / korekta / pożyczka tylko z osłon; brak w celu – decyzja dnia; linia „do zwrotu” bez osoby – pierwszy domownik; zwrot z prezentu do osłon; kandydat pary wg T224, pominięty wpis parowany na końcu; „sprzed startu” po dacie pary; problemy ICTTJ w uwagach; zapas koperty od chwili decyzji; termin celu z historii; start bez `budget.start` – najwcześniejsze saldo; przeniesienie do nieznanego celu zostaje; saldo pliku mBanku tylko z zewnątrz | T31, T24, schemat, T157, T224, T162, T163, T279, T272, T25 |
| N3 | wskazany zakup spłacony czekającymi pieniędzmi zużywa je | T304 |
| C19 / R-15 | sprostowane: „teraz” symulatora to ten sam zasięg co Mostek (F35, T218), 7,9 w 1.15.4 to zasięg po resztce miesiąca (AF-33, N3) – nie zaokrąglenie; pole `zasieg.wszedzie` | T71, T218, F35 |
| PR sp. 9 | kolejność potwierdzona (D99 pkt 9): wydatek ponad energię – osłony, potem kadłub, potem deficyt; na zwykłej kwocie aplikacja liczy tak samo (test) | T28, T32 |
| T340 | przeniesienie środków celu w chwili `at` – przed pierwszym zdarzeniem dnia, które przyszło później (`cameIn`: dokowanie / operacja, decyzja łupów); czego cel wtedy nie miał – na koniec dnia | T340 (AP-3) |
| T341, T342, C13 | pary ICTTJ liczone przed przebiegiem (`pairIctj`: okno T63 / T164, „inna kwota” T162, Portfel XTB T224); niezadokowana para = dokowanie z pulą wpisu; „Do zadokowania” (ile, wpływ, wypływ, w celach); para z puli Podatek poza przychodem | T341, T342 (AP-12) |
| T345 | płatność opłaty okresowej sprzed startu zamyka swój cykl | T345 (AP-5) |
| T346 | `planNaprzod` – 3 miesiące od stanu teraz: pobrane i wymagane odkładki, raty celów; bez pensji nic pobrane | T346, C20 (AP-11) |
| T350, T352, T354 | główny wariant domowników **D99** (A – spec i B – 1.15.3 obok): „spłata” najpierw spłaca, jawny przychód / zaliczka spłacają tylko wskazane zakupy tej osoby, bez wskazania omijają dług (`zaliczkiPrzyDlugu`); Marek (14.09, zaliczka → EVENTIM) 300,00 zł od 24.09, depozyt 4 737,20 zł | D99 pkt 1 (AP-4) |
| T355, T356 | linia wpływu z `loanId` – spłata pożyczki udzielonej do wysokości długu, nadwyżka dokuje; spłaty sprzed startu w stanie pożyczki; „kto zapłacił”; poza przychodem w statystykach | D100 |
| S8, C21 | przydział dziś nie poniżej zera (`przydzialDzisNieUjemny`, `energiaDzis`); „Razem” przychodów jako suma zaokrąglonych części | D99 pkt 9 |

**Regresja.** `npm run test:wyrocznia` (`vitest.wyrocznia.config.mts`, tylko lokalnie – migawki są w laboratorium,
`FI_AUDIT_LAB`): stany `rok` i `start` oraz każda migawka odczytów (dzień i minuta pierwszego odczytu) – wyrocznia (wariant
D99, pary według T341) i silnik aplikacji (`computeFleet` z parami `deliveries` / `pendingPairsOf` z folderu ICTTJ jak
okno, `monthAhead`) na tych samych plikach i w tej samej chwili: salda kont, suma, warstwy, każdy cel i zbiornik, cele
warstw, wolne do decyzji, średnie koszty, dług, zasięg, klasa, masa ładunku, „do zadokowania”, każdy domownik (ma oddać,
zaliczka), każda pożyczka, pensja (z osłon / kadłuba), odkładki pobrane i wymagane, raty celów, przydział i energia dziś,
średnie przychodów, 3 miesiące planu naprzód; „ten sam stan – ta sama liczba na każdym ekranie” (suma warstw = salda,
depozyt = zaliczki przy osobach, „mają oddać” = suma przy osobach, termin asteroidy odprawa = Radar, eksport miesiąca =
pasek Operacji); kopia schematów (pola wyroczni po jej odczycie = po parsowaniu aplikacji). Wynik:
`C:\FI-audyt\wyrocznia\u3\regresja.json`. Znane rozbieżności – lista `KNOWN` z powodem (błąd aplikacji naprawiany w
późniejszej grupie); zniknięcie znanej też zatrzymuje test. Szybka część w `npm test`: `tests/unit/wyrocznia-ap32.test.ts`
(scenariusze reguł N2 – wyrocznia = silnik; ekrany – AF-15 jako `it.fails`).

**Wynik 04.11.2026 (gałąź `claude/1.15.6-n2b`):** 412 przypadków, 28 963 liczb pieniędzy, 2 852 porównań ekranów,
9,75 mln pól schematów, ok. 2 min (sama regresja) – liczby pieniędzy wyroczni = aplikacji we wszystkich przypadkach. Rozbieżności: termin
asteroidy „Woda” – odprawa 15.11 (dzień kontenera), Radar i Ładownia 14.11 (historia płatności) w 11 migawkach LA – AF-15,
błąd aplikacji, naprawa w N3 (AP-10); zbiornik „OC motocykla” po końcu życia (LA.11-4) – wyrocznia 0,00 zł, aplikacja go
nie pokazuje (te same pieniądze – porównanie czyta brak jako 0). Bez pokrycia na migawkach (nowe w N2, dane 1.15.4 ich
nie mają): T345 z dniem startu po płatności, T355 – sprawdzane scenariuszami w `npm test`.
