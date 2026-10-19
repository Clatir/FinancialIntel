# Przegląd aplikacji po 1.4.1 (18.10.2026)

Prośba użytkownika: znaleźć niespójności, brakujące funkcje typowe dla aplikacji budżetowych, potencjalne błędy i
problemy, ze szczególnym uwzględnieniem dużej ilości danych i optymalizacji. Przegląd nie zmienia kodu – poprawki i
nowe funkcje to osobne etapy, każdy na komendę użytkownika (D67).

Szczegóły każdego punktu (scenariusz „co się dzieje” i propozycja poprawki): [bledy.md](bledy.md),
[wydajnosc.md](wydajnosc.md), [niespojnosci.md](niespojnosci.md), [funkcje.md](funkcje.md).

## Jak powstał

- Kod podzielony na 10 obszarów (silnik budżetu; domownicy i ICTTJ; gra, Wywiad i raporty; import – logika; import –
  ekran; folder danych i synchronizacja; proces główny i okna; Operacje, Plan, Ładownia, kreator; Mostek, Radar, Mapa,
  Ustawienia; całość przekrojowo). Każdy obszar czytali w całości trzej recenzenci (błędy, niespójności z kodem i
  dokumentami `specyfikacja.md` / `decyzje.md` / CLAUDE.md, wydajność), potem krytyk kompletności.
- Każde znalezisko sprawdzone w kodzie: błędy przez dwóch niezależnych weryfikatorów (prześledzenie od realnego
  wywołania i sonda – test na kodzie aplikacji), niespójności i wydajność przez jednego. Obalone (60 z 462) usunięte,
  zgłoszone w kilku obszarach scalone. „Do potwierdzenia” = jeden z dwóch weryfikatorów nie odtworzył.
- Pomiary na syntetycznym folderze z 10 lat (30 tys. i 150 tys. operacji) – w node i w prawdziwej aplikacji (Electron).
- Brakujące funkcje z trzech perspektyw: porównanie z YNAB, Actual Budget, Firefly III, Monarch, Copilot, Spendee,
  Wallet; codzienne użycie; dane i automatyzacja – z decyzjami użytkownika (D…) obok.
- ICTTJ: moduły przeniesiono z commita 84a8339, który jest nadal bieżącym stanem ICTTJ – nie ma późniejszych poprawek do
  przeniesienia.

**Wynik:** 129 błędów (5 wysokich, 55 średnich, 69 niskich), 38 problemów wydajności (8 / 19 / 11), 104 niespójności
(1 / 20 / 83), 43 brakujące funkcje (8 / 24 / 11) + nowe wymaganie użytkownika (F0).

## Najważniejsze

Pieniądze i dane:
1. **B2 – cele przeliczane wstecz.** Archiwizacja celu, zmiana priorytetu albo kwoty, nowy cel przeliczają całą historię
   dokowań: pieniądze przeskakują między celami i osłonami bez żadnej operacji (po archiwizacji osiągniętego i wydanego
   celu osłony spadają o jego kwotę). Do tego domyślny scenariusz „zmieniony ostatnio w ICTTJ” archiwizuje cele okrętu,
   gdy w ICTTJ edytujesz inny scenariusz.
2. **B3 – podwójne salda domowników** po zmianie daty rozliczeń (także „od startu budżetu”) po saldzie na start z 1.4.0.
3. **B4 – dwóch domowników „pytaj” w jednym temacie importu:** decyzja tematu przypisuje pieniądze drugiej osoby pierwszej
   i uczy złej reguły na kolejne importy.
4. **B5 – ta sama operacja z „Historii rachunku” i z „Listy operacji” wchodzi dwa razy** (różny opis = różny klucz),
   a panel duplikatów jej nie widzi.
5. **B1 – edytor kontenera w Ładowni zapisuje przy każdym znaku:** okresu „od / do” nie da się wpisać.
6. **B51 – szybki wpis:** podwójne kliknięcie „Zapisz” albo dwa razy Enter = dwie identyczne operacje.
7. **B32 – za długa notatka naruszenia** (kilka kontenerów o długich nazwach jednego dnia) – miesiąc gry przestaje się
   zapisywać, okno w kółko ponawia zapis.
8. **B43 – zamknięcie aplikacji po 4 s uznaje zmiany za zapisane**, choć kolejka zapisów w procesie głównym trwa.
9. **B44–B49 – dwa komputery i konflikty:** rozstrzygnięcie konfliktu bez śladu w historii, „Zachowaj” przy uszkodzonym
   oryginale kasuje jedyną czytelną wersję, scalanie traktuje klucz dodany po jednej stronie (nowa koperta) jak konflikt
   i domyślnie go usuwa, zapis przywraca rekord usunięty na drugim komputerze.
10. **B7 – Historia zmian i okno zmian z drugiego komputera pokazują kwoty w surowych groszach** (100× za duże) i bez
    ukrycia Ctrl+$.
11. **N1 – wydatku nie da się opłacić z pieniędzy celu:** silnik to obsługuje (`goalId`), ale żaden ekran tego nie ustawia.

Okna i system:
12. **B29 – skrót szybkiego wpisu z literą polskiego znaku** (Ctrl+Alt+A, C, E, L, N, O, S, X, Z) zabiera AltGr całemu
    systemowi – nie da się pisać „ą”, „ś”…; pole skrótu przyjmuje też Ctrl+C / Ctrl+V.
13. **B52 – wersja portable:** wpisy autostartu mnożą się z każdą wersją, wyłączenie autostartu nie działa.
14. **N19 / F2 – kopia „codzienna” robi się tylko przy otwarciu folderu**, a aplikacja tygodniami żyje w zasobniku.

Duże dane:
15. **B50 – folder z ponad ok. 125 tys. plików w jednej kolekcji nie otwiera się** („Maximum call stack size exceeded”).
16. **W8 + W1 – każdy zapis rekordu przebudowuje w procesie głównym widoki całego folderu** (0,1 s przy 30 tys., 0,7 s przy
    150 tys.), a import i operacje zbiorcze zapisują rekord po rekordzie: import 2000 wierszy ≈ 3,5 min przy 30 tys.
17. **W2, W5, W9 – okno liczy silnik budżetu od nowa przy każdym znaku w polu tekstowym, przy każdym potwierdzeniu
    zapisu i co minutę** (wynik zależy tylko od daty).
18. **W4 – „Możliwe duplikaty” liczone od nowa przy każdej zmianie operacji:** 0,4 s przy 30 tys., 7,7 s przy 150 tys.
    (pierwsze wejście w Operacje zamraża okno na 7 s).
19. **W7 – kopia ZIP (dzienna i przed każdym importem) pakuje wszystko od nowa:** 20 MB i 23 s przy 30 tys., 99 MB i
    1,5–3 min przy 150 tys.; 30 kopii dziennych to ok. 0,6 GB / 3 GB w OneDrive.
20. **W16 – zaległe dni gry:** każdy dzień to pełny przebieg silnika w oknie (2 tygodnie przerwy: 2,5 s / 13,6 s zamrożenia).

## Pomiary (18.10.2026, Linux, 4 rdzenie, syntetyczny folder 10 lat)

Folder: import przez parser mBanku, 5% wpisów ręcznych, 2% finansowanych przez domownika, 3% podzielonych, kontenery,
plany miesięcy, dokowania, cele, pożyczka, gra zamrożona do września. W tle pracowali inni recenzenci – liczby są raczej
zawyżone. Na Windows z OneDrive odczyt i zapis plików są zwykle wolniejsze.

| | 30 tys. operacji | 150 tys. operacji |
|---|---|---|
| plików / na dysku | 30 315 / 122 MB | 150 315 / 599 MB |
| otwarcie folderu (main.log) | 5,5–7,2 s | **nie otwiera się** (B50); po poprawce jednej linii 28 s |
| Mostek widoczny od startu | 7,2 s (pierwszy start na zimno 30 s) | 54 s |
| migawka danych do okna | 27 MB | 120 MB |
| silnik budżetu (computeFleet) | 140–230 ms | 0,6–1,2 s, kilka razy zaraz po otwarciu |
| dzisiejsza ocena gry (co minutę) | 100 ms | 1,1 s |
| nadrabianie 15 dni gry | 2,5 s | 13,6–15 s (okno stoi) |
| możliwe duplikaty | 0,4 s | 7,7 s |
| propozycje opłat stałych (Ładownia) | 0,1 s | 2,1 s |
| plan importu 90 dni | 0,2 s | 1,5 s |
| wyszukiwanie po wszystkich operacjach | 86 ms | 0,5 s |
| pierwsze wejście w Operacje | 0,5 s | 8,8 s |
| Ładownia / Dowództwo / Wywiad / Raporty | 0,16 / 0,15–0,26 / 0,17–0,25 / 0,18–0,44 s | 1,2 / 0,75 / 0,64 / 2,7 s |
| pamięć: proces główny / okno | 0,3–0,45 / 0,35–0,42 GB | 1,2 / 0,95 GB |
| kopia dzienna ZIP | 23 s, 20 MB | 1,5–3 min, 99 MB |

Przy realnym tempie (ok. 3 tys. operacji rocznie) 30 tys. to ok. 10 lat. Już przy tej skali najbardziej odczuwalne są
zapisy rekord po rekordzie (import, operacje zbiorcze), przeliczenia przy każdym znaku i co minutę oraz codzienna kopia.

## F0. Nowe wymaganie użytkownika (18.10.2026): wydatek finansowany przez wiele osób, także bez konta w banku

„Wydatki mogą być finansowane przez wiele osób oraz przez wiele osób bez konta bankowego, np. dziadków oraz tatę (który
może mieć albo nie mieć konta bankowego).”

- Już jest (1.3.0–1.4.0): „Podziel paragon” – każda pozycja ma własne „finansuje: X” (ręczne kwoty, każda z kategorią);
  domownik bez nazw w banku; pieniądze przez innego domownika („przekazuje przez”, „+ także za X”); grupa jako jedna
  osoba („Dziadkowie”).
- Brakuje: wspólnego finansowania jednym ruchem (równo / procenty / kwoty, bez kategorii; także w szybkim wpisie,
  decyzji zbiorczej i regule importu) oraz zwrotu gotówką (FI widzi tylko pieniądze na kontach).
- Pytania do użytkownika (z propozycją): a) jak dziadkowie i tata oddają pieniądze (przelew / przez kogoś / gotówka /
  wcale); b) zwrot gotówką – wariant A: konto „Gotówka” w budżecie (polecany), B: „rozliczone gotówką” = jak wypłata z
  bankomatu; c) podział równo / procenty / kwoty; d) „Dziadkowie” jako jedna osoba czy dwie; e) „sfinansowane jako
  prezent” (nikt nic nie jest winien, wydatek nie zjada energii).
- Etap: 1.5.0 (tabela niżej), Opus 5.5 · max, ok. 2–3 h po odpowiedziach.
- ✅ Zrobione w 1.5.0 (D83, T156–T158): wspólne finansowanie równo / procentami / kwotami w edytorze, szybkim wpisie,
  decyzji zbiorczej i imporcie (z regułą), prezent, konto „Gotówka”, babcia i dziadek jako dwie osoby.

## Proponowana kolejność etapów

Propozycja do decyzji użytkownika (D67 – każdy etap na komendę). Model i thinking z górką, czas pracy Claude'a.

| Etap | Zakres | Model | Thinking | Czas |
|---|---|---|---|---|
| 1.4.2 Pieniądze i dane się zgadzają | błędy wysokie i średnie, które psują kwoty albo gubią dane: B1–B5, B6, B9–B11, B13, B30, B32, B42–B51, B55, B56 i pokrewne | Opus 5.5 | max | ok. 4–5 h |
| 1.4.3 Szybkość przy dużym folderze | W1–W16 i W21–W24: zapis paczkami i przyrostowe widoki w procesie głównym, szkic w polach tekstowych, silnik liczony raz na dzień i przy zmianie danych, duplikaty na żądanie, kopia bez `.history` i rzadziej pełna, gra porcjami, obserwator folderu na Windows; cel: 30 tys. bez zacięć > 0,1 s, 150 tys. używalne | Opus 5.5 | max | ok. 4–6 h |
| 1.5.0 Domownicy: wielu finansujących, osoby bez konta, gotówka | F0 + błędy domowników (B14, B40, B41, N5…) | Opus 5.5 | max | ok. 2–3 h |
| 1.5.1 ICTTJ i dokowanie | B15–B22 i pokrewne niespójności | Opus 5.5 | max | ok. 2 h |
| 1.5.2 Import – reszta | B34–B41, N12–N16 i niskie importu | Opus 5.5 | max | ok. 2–3 h |
| 1.5.3 Porządki w ekranach | Esc w polach, pola liczb, Ctrl+$, tryb tylko do odczytu (N2), stare teksty kreatora, formaty, martwy kod, niskie niespójności | Opus 5.5 | xhigh | ok. 3 h |
| 1.6.0 Funkcje z listy | wybór z F1–F8 (opłaty stałe w miesiącu, kopia w zasobniku, przywracanie z kopii, „Cofnij import”, saldo z pliku banku, meldunki, szybki wpis seriami, oficer zna marki) | Opus 5.5 | max | ok. 4–6 h |

Razem ok. 21–28 h.

Wykonane według D84 (grupy E–H jednym ciągiem, `docs/postep.md`): **1.4.2** = E, **1.4.3** = F, **1.5.0** = G (domownicy
oraz ICTTJ i dokowanie – B14–B22, B40, B41, N5, F0, F42), **1.5.1** = H (import – B34–B39, N12–N16 i z listy funkcji F4,
F5, F8, F22). Według D86 (grupy I–L jednym ciągiem): **1.5.2** = I (liczby się zgadzają – B7, B8, B12, B23, B25, B26,
B28, B57–B60, N3, N4, N6–N11, N21; B41 zamknięte według D85), **1.5.3** = J (system, folder i dwa komputery – B27, B29,
B31, B33, B52–B54, N2, N17, N18, N20, F21), **1.5.4** = K (wydajność – W17–W20, W25, W27), **1.6.0** = L (funkcje F1, F3, F6, F7,
F13). Zostają dalsze, niskie pozycje – niezaznaczone niżej.

## Lista do odhaczania

## Błędy (129: 5 wysokich, 55 średnich, 69 niskich)

### Priorytet wysoki

- [x] **B1** Ładownia: pola edytora kontenera (okres od / do, cykl „inny…”, nazwa) zapisują się przy każdym znaku – miesiąca nie da się wpisać, a Backspace kasuje termin końca – `renderer/features/cargo/CargoPage.tsx:157`, `renderer/features/cargo/CargoPage.tsx:162` (+13)
- [x] **B2** Cele: archiwizacja, zmiana priorytetu, zmiana kwoty i nowy cel przeliczają wstecz całą historię dokowań – pieniądze przeskakują między celami i osłonami – `shared/calc/fleet.ts:469`, `shared/calc/fleet.ts:486` (+11)
- [x] **B3** Zmiana daty rozliczeń po saldzie na start z 1.4.0 (także „od startu budżetu”) liczy salda domowników drugi raz – `renderer/features/household/actions.ts:84`, `renderer/features/household/actions.ts:98` (+7)
- [x] **B4** Dwóch domowników „pytaj” trafia do jednego tematu – decyzja tematu przypisuje pieniądze drugiej osoby pierwszej (i uczy złej reguły) – `shared/import/reconcile.ts:101`, `shared/import/reconcile.ts:365` (+10)
- [x] **B5** Ta sama operacja z „Historii rachunku” i z „Listy operacji” wchodzi dwa razy, a panel duplikatów jej nie widzi – `shared/import/mbank.ts:228`, `shared/import/mbank.ts:254` (+6)

### Priorytet średni

- [x] **B6** Ładownia po zapłacie opłaty okresowej pokazuje fałszywe „Za plan o … – kolejne raty będą większe” i termin „w tym miesiącu” – `renderer/features/cargo/CargoPage.tsx:342-361`, `shared/calc/fleet.ts:923` (+6)
- [x] **B7** Historia zmian, „Zmiany z drugiego komputera” i Synchronizacja pokazują kwoty w groszach jako surowe liczby (100× za duże) i bez maskowania Ctrl+$ – `shared/merge.ts:236-244`, `renderer/features/history/HistoryDialog.tsx:42-46` (+18)
- [x] **B8** Kreator startu: „Obecne środki” i podział na start pomijają konta, które mają już saldo otwarcia, a pole zostało puste – `renderer/features/wizard/WizardPage.tsx:68-71`, `renderer/features/wizard/WizardPage.tsx:90` (+11)
- [x] **B9** Nieudane usunięcie operacji (plik zablokowany) jest ciche – wpis znika z ekranu, ale zostaje na dysku i wraca po restarcie – `renderer/store/data.ts:559-574`, `renderer/features/history/actions.ts:23-36` (+16)
- [x] **B10** Debriefing i raport pokazują zapisane kwoty decyzji o łupach, a silnik dzieli łupy, które są teraz – po późnym imporcie liczby się rozjeżdżają – `renderer/features/month/MonthPage.tsx:327-330`, `renderer/features/reports/ReportsPage.tsx:240` (+13)
- [x] **B11** Zmiana planu minionego miesiąca zmienia też bieżący i kolejne miesiące, które z niego „korzystały” – wbrew T46 – `renderer/features/month/actions.ts:24-38`, `shared/calc/plan.ts:270-274` (+10)
- [x] **B12** Data wpisana jako „dd.mm” bierze rok z bieżącej wartości pola – na początku stycznia grudniowy zakup trafia w przyszły grudzień, a silnik go pomija bez ostrzeżenia – `renderer/components/fields.tsx:118`, `renderer/lib/format.ts:130-148` (+4)
- [x] **B13** Podział łupów proponuje zarchiwizowane cele, a silnik wpłaca do nich pieniądze – `renderer/features/month/MonthPage.tsx:340-345`, `shared/calc/fleet.ts:507` (+9)
- [x] **B14** Rozliczenia „od dziś” (seed 1.4.0) gubią operacje domowników datowane przed dniem rozliczeń i dodane później (opóźniony import mBanku) – `renderer/features/household/actions.ts:104`, `shared/calc/household.ts:221` (+2)
- [x] **B15** Usunięta operacja zadokowanej dostawy zostawia osierocone dokowanie: wpis ICTTJ na zawsze „zadokowany”, pieniądze bez puli – `shared/calc/dock.ts:85`, `shared/calc/dock.ts:101` (+2)
- [x] **B16** Zmiana puli wpisu w ICTTJ po dokowaniu nie jest wykrywana – silnik liczy starą pulę – `shared/calc/dock.ts:103`, `renderer/features/dock/actions.ts:48` (+1)
- [x] **B17** Dwa dokowania jednego wpisu na Portfelu XTB (dwa komputery przed synchronizacją) dublują pieniądze, a drugiej operacji nie widać w dokowaniu – `renderer/features/dock/actions.ts:64`, `shared/calc/dock.ts:85` (+2)
- [x] **B18** Propozycja „Portfel XTB?” liczona od chwili importu (dowolnego konta mBank), a nie od zakresu pliku z banku – `shared/calc/dock.ts:130`, `renderer/features/dock/state.ts:42` (+5)
- [x] **B19** Granica startu budżetu dla dostaw liczona po dacie wpisu ICTTJ, a nie po dacie pieniędzy w banku – `shared/calc/dock.ts:86`, `shared/calc/dock.ts:110` (+4)
- [x] **B20** Para wypłaty ICTTJ jeszcze niezadokowana: silnik ignoruje pulę (Podatek w osłonach, zwrot z puli Podatek = czerwony firewall), na komputerze bez ICTTJ zawsze – `shared/calc/fleet.ts:657`, `shared/calc/fleet.ts:670` (+4)
- [x] **B21** Wpis ICTTJ usunięty i wpisany od nowa: operacja banku zostaje zablokowana przez dokowanie nieistniejącego wpisu, a nowy wpis dostaje „Portfel XTB?” – `shared/calc/dock.ts:85`, `shared/calc/dock.ts:88` (+3)
- [x] **B22** Kwota w banku inna niż w ICTTJ albo przelew po świętach: wpis dostaje „Portfel XTB?”, a wpływ „bez wpisu” – po potwierdzeniu pieniądze liczą się dwa razy – `shared/calc/dock.ts:114`, `shared/calc/dock.ts:120` (+4)
- [x] **B23** Propozycje pensji i „Koperty ze średnich” dla przyszłego miesiąca liczą niepełny bieżący miesiąc (i miesiące bez danych) jako pełne (wbrew T47) – `shared/calc/plan.ts:33`, `shared/calc/plan.ts:35` (+3)
- [x] **B24** Esc w polach kwoty, daty i godziny nie anuluje szkicu – wpisana wartość i tak się zapisuje – `renderer/components/fields.tsx:82-89`, `renderer/components/fields.tsx:90-96` (+8)
- [x] **B25** Średnie i propozycje liczą od najstarszej operacji dowolnego rodzaju – jedna stara pożyczka z Radaru dokłada puste miesiące i zaniża pensję, koperty i cel kadłuba – `shared/calc/plan.ts:25-30`, `shared/calc/plan.ts:33-38` (+5)
- [x] **B26** Pola liczb całkowitych (NumberField z decimals=0) przyjmują ułamki: harmonogram pożyczki gubi część kwoty, cel osłon i kadłuba wraca po cichu do 3 / 6 – `renderer/features/radar/RadarPage.tsx:307`, `renderer/components/ui.tsx:77` (+9)
- [x] **B27** Odłączone panele Mostka zamierają po wyjściu z Mostka: dane się nie odświeżają, a kliknięcia nic nie robią – `renderer/store/detach.ts:58`, `renderer/store/detach.ts:66` (+7)
- [x] **B28** Przypomnienie o potwierdzeniu sald bierze najnowsze potwierdzenie dowolnego konta – Portfel XTB może nie być potwierdzany nigdy – `renderer/features/bridge/BridgePage.tsx:307`, `shared/calc/briefing.ts:181` (+5)
- [x] **B29** Skrót szybkiego wpisu Ctrl+Alt+litera polskiego znaku (A, C, E, L, N, O, S, X, Z) przejmuje AltGr w całym systemie – nie da się pisać „ś”, „ą”, „ę”… – `renderer/components/ShortcutField.tsx:6`, `renderer/components/ShortcutField.tsx:15` (+4)
- [x] **B30** Pieniędzy zarchiwizowanego celu nie da się odzyskać – po zmianie scenariusza ICTTJ zostają zamrożone poza zasięgiem i poza innymi celami (T66) – `renderer/features/starmap/StarMapPage.tsx:96`, `renderer/features/starmap/StarMapPage.tsx:104` (+5)
- [x] **B31** Przełączanie folderu z Ustawień bez blokady i postępu: zapisy w trakcie trafiają do nowego folderu albo przepadają, brak „Przerwij”, drugie kliknięcie wypiera otwarcie – `renderer/features/settings/SettingsPage.tsx:175`, `renderer/features/settings/SettingsPage.tsx:195` (+15)
- [x] **B32** Notatka naruszenia „cargo” bez limitu długości – miesiąc gry nie przechodzi schematu i nie zapisuje się – `shared/calc/game.ts:220`, `shared/calc/game.ts:222` (+6)
- [x] **B33** Zamrażanie dni od razu po otwarciu folderu – przed synchronizacją OneDrive oceny zapadają na nieaktualnych danych – `renderer/store/game.ts:37`, `renderer/store/game.ts:43` (+4)
- [x] **B34** „Zwrot pożyczki” / „Pożyczka udzielona” z importu bez powiązania z pożyczką z Radaru – pożyczka zostaje otwarta i zaległa, a zapamiętana reguła powtarza błąd – `renderer/features/import/options.ts:17`, `renderer/features/import/options.ts:25` (+9)
- [x] **B35** Operacja z banku przeniesiona na inne konto wraca przy kolejnym imporcie jako druga – panel duplikatów jej nie widzi – `shared/import/reconcile.ts:115`, `shared/import/reconcile.ts:116` (+9)
- [x] **B36** Niepołączony możliwy duplikat (domyślnie przy `ask`) importuje się bez rozpoznania – przelew własny jako wydatek, wypłata XTB jako zwykły wpływ – `shared/import/reconcile.ts:188`, `shared/import/reconcile.ts:556` (+9)
- [x] **B37** „Ustaw” dla zaznaczonych bez wybranej kategorii nadpisuje propozycje sieci i uczy reguł „wydatek bez kategorii” – kolejne importy pokazują te marki jako gotowe – `renderer/features/import/ImportPage.tsx:562`, `renderer/features/import/ImportPage.tsx:571` (+5)
- [x] **B38** Plan na ekranie nie jest liczony od nowa po zmianie nazwisk właściciela, kontenerów, kategorii ani operacji – import liczy go od nowa i decyzje o zmienionych kluczach przepadają po cichu – `renderer/features/import/ImportPage.tsx:791`, `renderer/features/import/state.ts:40` (+7)
- [x] **B39** Po przeliczeniu planu (słowo kluczowe, połączenie nazw, „+ domownik”) temat traci swoją decyzję, a jej późniejsza zmiana nie obejmuje żadnej grupy – `renderer/features/import/state.ts:192`, `renderer/features/import/state.ts:243` (+4)
- [x] **B40** Zwrot towaru z zakupu, który finansuje domownik, trafia do mnie: import nigdy nie tworzy zwrotu „finansuje: X” – `shared/import/classify.ts:340-347`, `shared/import/reconcile.ts:562-564` (+3)
- [x] **B41** Wpłata domownika traci rozpoznanie przez regułę bez osoby: słowo kluczowe z tytułu albo reguła połączonej nazwy – `shared/import/classify.ts:298-302`, `shared/import/classify.ts:327-336` (+3) · 1.5.0: część 2 (połączone nazwy) zrobiona; część 1 (słowo z tytułu) – zostaje jak jest (D85)
- [x] **B42** Jednorazowy błąd odczytu pliku zostaje „uszkodzonym plikiem” aż do restartu, a zapis w to miejsce odsuwa poprawny plik – `main/datastore/store.ts:314`, `main/datastore/store.ts:315` (+6)
- [x] **B43** Zamknięcie aplikacji czeka na zapis tylko 4 s – przy 150 tys. zapisy i rescan trwają dłużej, okno zamyka się jak po udanym zapisie – `main/index.ts:900`, `main/index.ts:904` (+6)
- [x] **B44** „Zachowaj tę wersję” / „Zachowaj nowsze” nie odkłada odrzuconej wersji do historii: oryginał nadpisany w miejscu bez śladu, kopia tylko do Kosza tego komputera (albo usunięta bez Kosza) – `main/datastore/store.ts:952`, `main/datastore/store.ts:957` (+10)
- [x] **B45** Rozstrzygnięcie konfliktu nie sprawdza stron: „Zachowaj” przy brakującym / uszkodzonym oryginale kasuje jedyną czytelną wersję, kopia nadpisuje uszkodzony albo nowszy plik, a kopia w nowszym formacie staje się zapisywalna – `renderer/features/sync/SyncPage.tsx:81`, `main/datastore/store.ts:952` (+6)
- [x] **B46** Dwa plany tego samego miesiąca z dwóch komputerów (losowe id): okno ma oba naraz, zastąpiony plan jest „usunięty na innym komputerze”, a „Zachowaj” nie zapisze się nigdy – `renderer/features/month/actions.ts:30`, `renderer/features/month/actions.ts:37` (+6)
- [x] **B47** Scalanie trójstronne: klucz dodany po jednej stronie (np. nowa koperta) to „konflikt”, a domyślny wybór „moja” go usuwa – `shared/merge.ts:92`, `shared/merge.ts:96` (+5)
- [x] **B48** Zmiana z drugiego komputera w trakcie zapisu: wybór „Weź z …” / „Usuń też tutaj” nie trafia na dysk – `renderer/store/data.ts:209`, `renderer/store/data.ts:222` (+6)
- [x] **B49** Zapis rekordu usuniętego właśnie na drugim komputerze po cichu go przywraca – bez kopii, bez pytania – `main/datastore/store.ts:780`, `main/datastore/store.ts:784` (+3)
- [x] **B50** Folder z ponad ok. 125 tys. plików w jednej kolekcji w ogóle się nie otwiera – „Maximum call stack size exceeded” – `main/datastore/store.ts:271`, `main/datastore/store.ts:451`
- [x] **B51** Szybki wpis: podwójne kliknięcie „Zapisz” (albo dwa razy Enter) dodaje tę samą operację dwa razy; zapisany szkic zostaje w oknie do następnego otwarcia – `renderer/features/quick/QuickApp.tsx:85`, `renderer/features/quick/QuickApp.tsx:178` (+4)
- [x] **B52** Wersja portable: AUMID = ścieżka tymczasowa zmieniająca się co wersję – wpisy autostartu się mnożą, wyłączenie nie działa, okno wyskakuje przy logowaniu, ustawienia powiadomień Windows się zerują – `main/index.ts:43`, `main/tray.ts:106` (+3)
- [x] **B53** Ekran wyboru folderu dobiera przyciski po tekście komunikatu: „Utwórz w OneDrive (zalecane)” zakłada nowe dane w niedostępnym zapamiętanym folderze, „Utwórz dane tutaj” kręci się w kółko, brak przycisku podfolderu – `renderer/features/setup/FolderSetup.tsx:35`, `renderer/features/setup/FolderSetup.tsx:57` (+8)
- [x] **B54** Okno zapamiętane na odłączonym monitorze otwiera się poza ekranem – `main/index.ts:811`, `main/index.ts:859` (+1)
- [x] **B55** Opłata okresowa zapłacona przed terminem (miesiąc wcześniej albo przed dniem płatności): silnik zbiera ją z energii drugi raz, a odprawa, radar i Odkładki dalej ostrzegają – `shared/calc/fleet.ts:108`, `shared/calc/fleet.ts:591` (+7)
- [x] **B56** Życie kontenera nie ma dat: nowy kontener okresowy zbiera raty wstecz z minionych miesięcy, archiwizacja przelicza całą historię, a resztka zbiornika po `until` zostaje na zawsze – `shared/calc/fleet.ts:177`, `shared/calc/fleet.ts:591` (+4)
- [x] **B57** Operacja „Pożyczka” bez rekordu pożyczki traktowana jak pożyczka udzielona: pożyczone pieniądze dokują jak przychód, ich zwrot tworzy fikcyjną należność – `shared/calc/fleet.ts:695`, `shared/calc/fleet.ts:710` (+4)
- [x] **B58** Płatności powiązane z usuniętym kontenerem znikają z kopert i dziennego przydziału, choć silnik dalej pobiera je z energii – `shared/calc/fleet.ts:608`, `shared/calc/fleet.ts:878` (+3)
- [x] **B59** Zapisany podział dokowania (split) stosowany w kwotach bezwzględnych także po zmianie kwoty operacji – osłony spadają o różnicę – `shared/calc/fleet.ts:508`, `shared/calc/fleet.ts:653` (+2)
- [x] **B60** Konto z saldem otwarcia na 1. dzień miesiąca (dodane po starcie): pensja płacona przed jego pieniędzmi – pensja częściowa i za mało energii na cały miesiąc – `shared/calc/fleet.ts:757`, `shared/calc/fleet.ts:760` (+3)

### Priorytet niski

- [x] **B61** Ctrl+$ nie maskuje notatek Radaru („w zbiorniku …”) ani otwartego okna szybkiego wpisu – `renderer/features/radar/RadarPage.tsx:40-44`, `shared/calc/radar.ts:72` (+15)
- [x] **B62** Data decyzji o łupach w debriefingu pokazana w UTC, a nie w czasie warszawskim – `renderer/features/month/MonthPage.tsx:328`, `renderer/features/month/actions.ts:57` (+1)
- [x] **B63** Panel kontenera: podpowiedź „Najbliższa” płatność pokazuje datę z przeszłości – `renderer/features/cargo/CargoPage.tsx:35-38`, `renderer/features/cargo/CargoPage.tsx:158` (+3)
- [ ] **B64** Ctrl+N („nowa operacja”) jest opisany jako skrót ogólny (ściągawka, paleta, podpowiedź na Mostku), a działa tylko na ekranie Operacje – `renderer/app/ShortcutsHelp.tsx:13`, `renderer/app/App.tsx:74-118` (+5)
- [x] **B65** Raport wachty w ostatni dzień miesiąca planuje koperty „na 1 dni”, choć jutro koperty startują od nowa – `shared/calc/intel.ts:284-291`, `renderer/features/reports/ReportsPage.tsx:118` (+5)
- [ ] **B66** „Cofnij” zbiorczej kategorii albo finansującego przywraca całe stare rekordy i nadpisuje późniejsze zmiany – `renderer/features/operations/state.ts:92-115`, `renderer/features/operations/state.ts:131-142` (+3)
- [ ] **B67** Pojedyncze pliki z nowszej wersji (np. w trakcie synchronizacji OneDrive): edytory poza Operacjami po cichu gubią zmiany, usunięcie znika z ekranu, a plik gry, którego ta wersja nie odczyta, daje stały „błąd zapisu” *(do potwierdzenia)* – `renderer/store/data.ts:489`, `renderer/store/data.ts:531` (+11)
- [ ] **B68** Pole kwoty przyjmuje po cichu więcej niż 2 miejsca po przecinku – „1.200” to 1,20 zł – `renderer/lib/format.ts:101-107`, `renderer/components/fields.tsx:52-58`
- [ ] **B69** Wpływ na Portfel XTB wpisany szybkim wpisem (rodzaj „wpływ”) nie jest parą wypłaty ICTTJ – „Portfel XTB?” tworzy drugą operację, pula przepada *(do potwierdzenia)* – `shared/calc/dock.ts:88`, `renderer/store/quickHost.ts:127` (+1)
- [ ] **B70** Pula Podatek z podziałem zmienionym w oknie: silnik dokuje część do budżetu, a przychody liczą całość jako podatek – `shared/calc/income.ts:44`, `shared/calc/fleet.ts:661` (+1)
- [ ] **B71** Ten sam id wpisu ICTTJ w dwóch plikach (wpis przeniesiony zmianą daty, OneDrive w trakcie) daje dwie dostawy o tym samym kluczu – `main/ictj/reader.ts:47`, `main/ictj/reader.ts:69` (+2)
- [ ] **B72** Szybka zmiana folderu ICTTJ: odpowiedź starszego odczytu nadpisuje w oknie migawkę bieżącego folderu – `main/ictj/source.ts:67`, `main/index.ts:682` (+1)
- [ ] **B73** Odczyt ICTTJ połyka błędy listowania folderów: status „czytany” bez wpisów i bez ostrzeżenia *(do potwierdzenia)* – `main/ictj/reader.ts:28`, `main/ictj/reader.ts:41` (+2)
- [ ] **B74** Notatka i dziennik kapitański operacji bez limitu długości – po wklejeniu długiego tekstu operacja przestaje się zapisywać – `renderer/features/operations/OperationEditor.tsx:315-321`, `renderer/features/operations/OperationEditor.tsx:326` (+4)
- [ ] **B75** Kreator: zaznaczenie albo odznaczenie kontenera z historii kasuje ręcznie wpisane koperty – `renderer/features/wizard/WizardPage.tsx:171`, `renderer/features/wizard/WizardPage.tsx:175` (+1)
- [ ] **B76** Podział paragonu: reszta bez znaku – „do ostatniej części” przy nadmiarze odwraca znak części, „nierozdzielone” także przy nadmiarze, a niedobór trafia do ukrytej kategorii – `renderer/features/operations/OperationEditor.tsx:374`, `renderer/features/operations/OperationEditor.tsx:380` (+3)
- [ ] **B77** Nowa operacja przy filtrze okresu „od–do” znika z listy po pierwszej zmianie – `renderer/features/operations/state.ts:183`, `renderer/features/operations/state.ts:185` (+1)
- [ ] **B78** „Podziel paragon” zostawia rodzicowi flagę „finansuje domownik” – znak „domownik” i filtr „do zwrotu” kłamią – `renderer/features/operations/OperationEditor.tsx:224`, `shared/operationsView.ts:28` (+1)
- [ ] **B79** Podział paragonu ukrywa pole „Ładownia” – płatność kontenera po podziale dalej idzie w całości do ładowni, części nie trafiają do kopert, a odpiąć się nie da – `renderer/features/operations/OperationEditor.tsx:216-257`, `renderer/features/operations/OperationEditor.tsx:248` (+2)
- [ ] **B80** Wybór kategorii pokazuje „— bez kategorii —” dla podkategorii zarchiwizowanej kategorii głównej – `renderer/features/operations/pickers.tsx:38`, `renderer/features/operations/pickers.tsx:48` (+1)
- [ ] **B81** Domyślny miesiąc listy Operacji nie zmienia się po zmianie miesiąca, gdy aplikacja działa w zasobniku – `renderer/features/operations/state.ts:46-50`
- [ ] **B82** Filtr kategorii z zarchiwizowaną albo usuniętą kategorią: w podsumowaniu ULID zamiast nazwy, a w menu nie ma pola do odznaczenia – `renderer/features/operations/OperationsPage.tsx:100`, `renderer/features/operations/OperationsPage.tsx:402` (+1)
- [ ] **B83** „Saldo w banku teraz” liczy się jako saldo na koniec dzisiejszego dnia – wydatek z rana dopisany wieczorem daje błędną korektę *(do potwierdzenia)* – `renderer/features/settings/AccountsTab.tsx:125`, `renderer/features/settings/AccountsTab.tsx:133` (+4)
- [x] **B84** Rozkazy przyjmują minimalne osłony większe niż cel osłon – stały alarm, Bearish i poważne naruszenia w grze – `renderer/features/settings/MachineTabs.tsx:25`, `renderer/features/settings/MachineTabs.tsx:38` (+4)
- [x] **B85** Pożyczka wzięta: „Do spłaty razem” mniejsze niż kwota przechodzi bez sprawdzenia i zaniża dług – `renderer/features/radar/RadarPage.tsx:266`, `renderer/features/radar/RadarPage.tsx:270` (+1)
- [ ] **B86** Esc w polu nazwy w Ustawieniach przenosi z Ustawień na poprzedni ekran – `renderer/components/ui.tsx:425`, `renderer/app/App.tsx:58`
- [ ] **B87** Mapa gwiezdna: cel osiągnięty po terminie świeci się na czerwono „będzie po terminie”, a nieosiągnięty po terminie bez tempa nie ma żadnego oznaczenia – `renderer/features/starmap/StarMapPage.tsx:188`, `renderer/features/starmap/StarMapPage.tsx:245` (+1)
- [ ] **B88** Kliknięcie powiadomienia wieczornego albo „Raport wachty dnia” w zasobniku kasuje zapisany filtr Operacji – `renderer/store/notifier.ts:51`, `renderer/store/notifier.ts:52` (+4)
- [ ] **B89** Podniesiony kontener: naruszenie trafia na dzień przed zmianą, a zmiana 2. dnia miesiąca nie jest zapisana wcale – `shared/calc/game.ts:214`, `shared/calc/game.ts:217` (+2)
- [ ] **B90** Starsza wersja na drugim komputerze ocenia misję nieznanego szablonu jako niewykonaną i źle czyta nieznany stopień *(do potwierdzenia)* – `shared/calc/game.ts:419`, `shared/calc/game.ts:420` (+6)
- [ ] **B91** Wybór misji tygodnia zależy od dnia uruchomienia: w poniedziałek „Pełna energia” nie widzi niedzieli – `shared/calc/game.ts:325-329`, `shared/calc/game.ts:530` (+3)
- [x] **B92** Eksport „Miesiące”: miesiące sprzed startu budżetu mają „Łupy 0,00” zamiast pustej komórki – `shared/calc/plan.ts:318`, `shared/calc/plan.ts:319` (+4)
- [ ] **B93** W trakcie importu ekran dalej przyjmuje zmiany: decyzje zmienione podczas kopii przepadają, upuszczony plik jest zamykany, „Zamknij plik” nie przerywa importu – `renderer/features/import/state.ts:447`, `renderer/features/import/state.ts:454` (+6)
- [ ] **B94** Upuszczenie pliku omija limit 20 MB i odczyt w procesie głównym (T42), a błąd odczytu nie jest obsłużony – `renderer/features/import/ImportPage.tsx:79`, `renderer/features/import/ImportPage.tsx:80` (+2)
- [ ] **B95** Błąd w połowie zapisu importu zostawia otwarty plik z nieaktualnym podglądem; ponowny import nie uczy już reguł, a operacje z nowszej wersji są po cichu pomijane – `renderer/features/import/state.ts:460`, `renderer/features/import/state.ts:462` (+8)
- [ ] **B96** Usunięta nierozliczona operacja wraca, gdy bank rozliczy ją inną kwotą lub datą (T39) – `shared/import/reconcile.ts:126`, `shared/import/reconcile.ts:195` (+2)
- [ ] **B97** Po przyjęciu podpowiedzi mBanku własna zmiana decyzji nie jest domyślnie zapamiętywana, a plakietka mówi „Twoja decyzja” – `renderer/features/import/state.ts:262`, `renderer/features/import/state.ts:263` (+7)
- [ ] **B98** Pozycja „(jak grupa)” w kategorii operacji ustawia operacji brak kategorii zamiast kategorii grupy – `renderer/features/import/ImportPage.tsx:452`, `renderer/features/import/ImportPage.tsx:455` (+1)
- [ ] **B99** Rozliczenie nierozliczonej i łączenie „bliskiej kwoty” zmieniają kwotę, a podział paragonu zostaje: różnica idzie na „moje” bez kategorii – `shared/import/reconcile.ts:531`, `shared/import/reconcile.ts:544` (+3)
- [ ] **B100** Scalenie duplikatów zostawia `covers` wpłat domowników wskazujące na usuniętą kopię – `renderer/features/import/DuplicatesPanel.tsx:69`, `renderer/features/import/DuplicatesPanel.tsx:76` (+2)
- [ ] **B101** Sesja importu przeżywa zmianę folderu – nieaktualne `deletedKeys` z poprzedniego folderu pomijają wiersze – `renderer/features/import/state.ts:57`, `renderer/features/import/state.ts:124` (+2)
- [ ] **B102** „Podobna nazwa” liczy słowa ogólne („polska”, „sklep”, „spółka”) i krótkie klucze: możliwy duplikat z inną kwotą łączy się sam, a panel duplikatów go zaznacza – `shared/import/reconcile.ts:46-54`, `shared/import/reconcile.ts:154` (+6)
- [ ] **B103** Podwójna spacja w tytule przelewu (lista operacji) zamienia część tytułu w kontrahenta *(do potwierdzenia)* – `shared/import/mbank.ts:118`, `shared/import/mbank.ts:144` (+2)
- [ ] **B104** Klucz marki „constructor” trafia w Object.prototype: resolveBrand zwraca undefined (wyjątek przy regule „zawiera”, decyzja grupy nigdy nie zostaje zapamiętana) – `shared/import/aliases.ts:16`, `shared/import/classify.ts:82` (+3)
- [ ] **B105** „PŁATNOŚĆ …” i „SPRZEDAŻ …” nie są rozpoznawane jako rodzaj operacji (\b po polskiej literze) – `shared/import/mbank.ts:88`, `shared/import/mbank.ts:134` (+2)
- [ ] **B106** „XTB” gdziekolwiek w opisie (także w tytule) robi z przelewu własnego i wpłaty domownika operację tradingową *(do potwierdzenia)* – `shared/import/classify.ts:223`, `shared/import/classify.ts:323-327`
- [ ] **B107** saveSettings i przywrócenie fi.json z historii połykają zmiany: kopia „-zewnetrzna-” / odsunięty uszkodzony fi.json nie docierają do okna, a restore nadpisuje uszkodzony fi.json bez odsunięcia – `main/datastore/store.ts:934`, `main/datastore/store.ts:938` (+7)
- [ ] **B108** Oczekująca decyzja o zmianie z drugiego komputera blokuje każde „zapisz wszystko”, a komunikaty mówią o zablokowanym pliku i ponowieniu, którego nie ma – `renderer/store/data.ts:385`, `renderer/store/data.ts:598` (+9)
- [ ] **B109** Nieczytelny fi.json przy otwarciu (start z Windows przed OneDrive) kończy się ekranem wyboru bez „Spróbuj ponownie” i bez ponowienia; uszkodzony fi.json nie ma ścieżki naprawy – `main/datastore/store.ts:319`, `main/datastore/store.ts:413` (+3)
- [ ] **B110** Pełne skanowanie po własnej akcji (Do Kosza, rozstrzygnięcie konfliktu) oznacza cudze zmiany jako „local” – omijają scalanie i tryb „pytaj” – `main/datastore/store.ts:987`, `main/datastore/store.ts:998` (+3)
- [ ] **B111** Usunięcie wpisu z duplikatem id: starsza kopia od razu wraca jako ten wpis – `main/datastore/store.ts:885`, `main/datastore/store.ts:889` (+2)
- [ ] **B112** Błąd zapisu historii jest połykany bez śladu, a próg 10 min ustawiany przed zapisem blokuje też następną próbę; usunięcie przechodzi bez wersji w historii – `main/datastore/history.ts:190`, `main/datastore/history.ts:201` (+4)
- [ ] **B113** Obserwator niedostępnego folderu restartuje się co 5 s bez końca i co 5 s pisze błąd ze stosem do main.log – `main/datastore/watch.ts:127`, `main/datastore/watch.ts:136` (+2)
- [ ] **B114** config.json: każdy błąd odczytu (nie tylko brak pliku) daje ustawienia domyślne, a pierwszy zapis nadpisuje prawdziwe – znika autostart, folder danych, folder ICTTJ, token, skrót – `main/config.ts:70`, `main/config.ts:82` (+5)
- [ ] **B115** Własny folder kopii (backupDirOverride) jest wspólny dla wszystkich folderów danych komputera – kopia dzienna drugiego folderu się nie robi, a „kopia z dziś” bywa innym budżetem – `main/index.ts:379`, `main/index.ts:631` (+5)
- [ ] **B116** Heartbeat i odświeżenie przy fokusie wysyłają do okna zmiany starego folderu po przełączeniu – `main/index.ts:268`, `main/index.ts:904` (+2)
- [ ] **B117** openFolder zwraca błąd już po przełączeniu magazynu (zapis config.json) – `main/index.ts:391`, `main/index.ts:418` (+1)
- [ ] **B118** Szybki wpis: po podziale paragonu i zmianie rodzaju na „Wpływ” zapis blokuje niewidoczny podział – `renderer/features/quick/QuickApp.tsx:182`, `renderer/features/quick/QuickApp.tsx:239` (+1)
- [ ] **B119** Start ukryty z systemem gubi maksymalizację okna – `main/index.ts:835`, `main/index.ts:869`
- [ ] **B120** Sprawdzanie folderu ICTTJ w rodzicach wywala otwieranie, gdy rodzica nie można wylistować *(do potwierdzenia)* – `main/index.ts:439`, `main/datastore/store.ts:187`
- [ ] **B121** Folder kopii zapasowych można ustawić w folderze danych ICTTJ – `main/index.ts:623`, `main/index.ts:337` (+1)
- [ ] **B122** Pobrana aktualizacja przepada do restartu, gdy ręczne „Sprawdź” znajdzie nowszą wersję, a jej pobieranie się nie uda – `main/update/updater.ts:225`, `main/update/updater.ts:229` (+4)
- [ ] **B123** Nieudana kopia dzienna (np. folder kopii na odłączonym dysku) zostawia tylko wpis w logu – użytkownik nie wie, że kopie nie powstają – `main/index.ts:413`, `main/index.ts:415` (+2)
- [ ] **B124** Awaria renderera okna szybkiego wpisu (lub panelu odłączonego) nie jest obsługiwana – skrót pokazuje martwe okno aż do restartu – `main/index.ts:1009`, `main/index.ts:1013` (+3)
- [ ] **B125** Otwarty szybki wpis nie odświeża danych (kategorie, konta, energia, tylko do odczytu), a zapis nie sprawdza, czy konto i kategoria nadal istnieją – `renderer/features/quick/QuickApp.tsx:72`, `main/quick.ts:104` (+3)
- [x] **B126** Pensja miesiąca startu (T45): zwroty sprzed startu ją zwiększają, a kreator zapowiada inną kwotę niż wypłaca silnik – `shared/calc/fleet.ts:575`, `shared/calc/fleet.ts:579` (+2)
- [x] **B127** Kreator: saldo otwarcia z salda „teraz” odejmuje też operacje z przyszłą datą – saldo konta trwale zawyżone – `shared/calc/start.ts:285`, `renderer/features/wizard/state.ts:114`
- [x] **B128** ETA celów liczone z „tempa”, które obejmuje przydział środków na starcie budżetu – `shared/calc/goals.ts:95`, `shared/calc/goals.ts:103` (+2)
- [ ] **B129** Dwa komputery: potwierdzenie salda przed synchronizacją OneDrive dodaje drugą, identyczną korektę – `renderer/features/balances/actions.ts:28`, `renderer/features/balances/actions.ts:44` (+2)

## Wydajność i duże dane (38: 8 wysokich, 19 średnich, 11 niskich)

### Priorytet wysoki

- [x] **W1** Zapis importu: każda operacja osobnym saveRecord – w main O(N) na zapis, w oknie kopia mapy, silnik i pełny render po każdym – `renderer/features/import/state.ts:460`, `renderer/features/import/state.ts:461` (+41)
- [x] **W2** Pola tekstowe edytora operacji i kontenera zapisują rekord przy każdym znaku (wbrew T34) – każdy znak przelicza silnik, grę i ekran – `renderer/components/ui.tsx:158`, `renderer/components/ui.tsx:197` (+28)
- [x] **W3** Każda edycja i każde usunięcie przelicza aplikację dwa razy (echo zapisu z dysku) – `renderer/store/data.ts:405`, `renderer/store/data.ts:415` (+3)
- [x] **W4** Operacje: „Możliwe duplikaty” liczone od nowa przy każdej zmianie operacji – każdy znak w edytorze uruchamia findDuplicates na całej historii – `renderer/features/operations/OperationsPage.tsx:211-212`, `renderer/features/operations/OperationsPage.tsx:443` (+18)
- [x] **W5** Każda zmiana `records` (znak w polu, potwierdzenie zapisu, lokalne usunięcie) kopiuje mapę całej kolekcji i przelicza cały silnik budżetu i grę – `renderer/store/data.ts:486`, `renderer/store/data.ts:501` (+35)
- [x] **W6** Ładownia: recurringPayments jest kwadratowe (kopiuje tablicę grupy przy każdej operacji), liczy się od nowa przy każdym znaku w kontenerze, a „Połącz płatności” skanuje wszystkie operacje przy każdym renderze – `shared/calc/plan.ts:158`, `shared/calc/plan.ts:72` (+10)
- [x] **W7** Kopia ZIP przed każdym importem (i dzienna, ręczna, eksport) trwa 22 s przy 30 tys. i ≈2 min przy 150 tys., przechodzi przez całe .history – `main/datastore/zip.ts:58-66`, `main/datastore/zip.ts:36-46` (+14)
- [x] **W8** Każdy zapis i usunięcie rekordu kosztuje w procesie głównym O(wszystkich plików), więc import tysięcy wierszy trwa minuty – `main/datastore/store.ts:807-846`, `main/datastore/store.ts:520-579` (+22)

### Priorytet średni

- [x] **W9** Silnik budżetu (i dane gry) liczone od nowa co minutę, choć wynik zależy tylko od daty – na każdym ekranie i w zasobniku – `renderer/store/fleet.ts:31`, `renderer/store/fleet.ts:55` (+22)
- [x] **W10** Pamięć silnika i hooków unieważniana przez każdą zmianę dowolnej kolekcji albo dowolnego ustawienia – `renderer/store/fleet.ts:55`, `renderer/store/game.ts:55` (+13)
- [x] **W11** Raporty (wachta, debriefing, przegląd roczny) liczą co minutę ocenę dzisiejszego dnia, której nie pokazują – `renderer/features/reports/ReportsPage.tsx:103`, `renderer/features/reports/ReportsPage.tsx:206` (+4)
- [x] **W12** Przychody: memberOf po nazwie w banku liczone od nowa dla każdego wpływu sprzed daty rozliczeń przy każdym przeliczeniu silnika – `shared/calc/income.ts:56`, `shared/calc/household.ts:126` (+4)
- [x] **W13** Dostawy (deliveries) budują Map wszystkich operacji przy każdej zmianie dowolnej operacji, na każdym ekranie – `shared/calc/dock.ts:81`, `shared/calc/dock.ts:88` (+2)
- [x] **W14** Wyszukiwanie na liście operacji składa i normalizuje (NFD) tekst każdej operacji przy każdym znaku zapytania – `shared/operationsView.ts:77`, `shared/operationsView.ts:96` (+5)
- [x] **W15** Każde otwarcie szybkiego wpisu sortuje wszystkie wydatki (localeCompare) i może przeliczyć cały silnik – `renderer/store/quickHost.ts:30-75`, `main/quick.ts:111-122` (+5)
- [x] **W16** Zaległe dni gry: każdy dzień to osobny pełny computeFleet od startu budżetu, liczony synchronicznie w rendererze i bez górnej granicy – `shared/calc/game.ts:532`, `shared/calc/game.ts:534` (+4)
- [x] **W17** Ekran importu bez wirtualizacji i memo: każda decyzja, zaznaczenie i znak w wyszukiwarce renderuje wszystkie grupy – `renderer/features/import/ImportPage.tsx:480`, `renderer/features/import/ImportPage.tsx:481` (+12)
- [x] **W18** Pełny ponowny plan importu po każdym zapisie fi.json – także gdy reguły się nie zmieniły – `renderer/features/import/ImportPage.tsx:786`, `renderer/features/import/ImportPage.tsx:791` (+7)
- [x] **W19** historyDeleted przy każdym wczytaniu pliku importu i na stronie Synchronizacja: przebudowa widoków na każdą kolekcję + sekwencyjny odczyt ostatniej wersji każdego usuniętego – `main/datastore/store.ts:1013`, `main/datastore/history.ts:131` (+10)
- [x] **W20** Import całej historii (kreator): koszt jednego wiersza 70–145 µs (brandOf liniowo po słowniku, findRule filtruje wszystkie reguły), a pełny plan liczy się od nowa po każdym słowie kluczowym czy połączeniu nazw – `shared/import/brands.ts:62`, `shared/import/brands.ts:639` (+7)
- [x] **W21** Pełne przeskanowanie folderu co 30 s i przy każdym fokusie okna, bez łączenia zaległych żądań – `main/datastore/watch.ts:52`, `main/index.ts:399-407` (+6)
- [x] **W22** Na Windows każdy zapis prawdopodobnie wywołuje pełne przeskanowanie folderu (zdarzenie katalogu z rekurencyjnego fs.watch) – `main/datastore/watch.ts:66-73`, `main/datastore/store.ts:662-668` (+3)
- [x] **W23** Rozstrzyganie konfliktów i „Do Kosza” robią pełny rescan na każdą pozycję; lista konfliktów bez wirtualizacji i w każdym ChangeSet – `main/datastore/store.ts:950`, `main/datastore/store.ts:987` (+4)
- [x] **W24** Otwarcie folderu: zbędny stat przed każdym odczytem, wolny fs.promises.readFile i drugi pełny listing (cleanupTempFiles) – `main/datastore/store.ts:309`, `main/datastore/store.ts:318` (+2)
- [x] **W25** Tryb „pytaj” przy dużej paczce zmian z drugiego komputera: okno renderuje wszystkie karty, „Zastosuj” kopiuje mapę na każdą pozycję – `renderer/features/sync/RemoteChangesDialog.tsx:39`, `renderer/features/sync/RemoteChangesDialog.tsx:207` (+3)
- [x] **W26** Proces główny trzyma pełny tekst każdego pliku (FileState.text) – połowa pamięci magazynu – `main/datastore/store.ts:47`, `main/datastore/store.ts:364-373` (+2)
- [x] **W27** computeFleet odtwarza całą historię od startu przy każdym wywołaniu – stałe koszty O(n log n) z dużą alokacją, a pożyczki i konta po osobnym przebiegu każde – `shared/calc/fleet.ts:846`, `shared/calc/fleet.ts:850` (+8)

### Priorytet niski

- [x] **W28** Okno dokowania liczy cały silnik drugi raz: przy otwarciu, co minutę i po każdej zmianie rekordu – `renderer/features/dock/DockingDialog.tsx:59`, `renderer/features/dock/DockingDialog.tsx:66` (+2)
- [x] **W29** Mostek, „Ostatnie operacje”: przy każdym renderze kopia i sortowanie wszystkich operacji, żeby pokazać 10 – `renderer/features/bridge/BridgePage.tsx:115`, `renderer/features/bridge/BridgePage.tsx:132`
- [x] **W30** Eksport „Miesiące – CSV” i Excel: monthRows to O(miesiące × (operacje + log silnika)), całe liczenie w kliknięciu – `shared/export/budget.ts:134`, `shared/export/budget.ts:136` (+5)
- [ ] **W31** findRule skanuje liniowo wszystkie reguły dla każdego wiersza, a wzorzec słowa kluczowego jest kompilowany przy każdym porównaniu – `shared/import/classify.ts:69`, `shared/import/classify.ts:70` (+9)
- [ ] **W32** Decyzja zbiorcza („Ustaw” dla zaznaczonych): osobny setState na każdą grupę – O(G²) kopii i powiadomienie wszystkich subskrypcji – `renderer/features/import/state.ts:362`, `renderer/features/import/state.ts:373` (+5)
- [ ] **W33** Podobne nazwy: similarPairs filtruje wszystkie reguły dla każdej marki i liczy się od nowa przy każdym „To nie to samo” – `renderer/features/import/Learning.tsx:54`, `shared/import/similar.ts:369` (+2)
- [ ] **W34** keywordProposals: każde słowo-kandydat przegląda wszystkie wiersze pliku i parsuje wzorzec przy każdym wywołaniu; liczone od nowa przy każdej zmianie `choices` – `shared/import/learn.ts:148`, `shared/import/learn.ts:169` (+3)
- [ ] **W35** Reguły importu w fi.json rosną z każdą marką i nigdy nie są przycinane (≈0,4 KB na regułę), a wszystkie odczyty przeglądają je liniowo – `shared/schema/budget.ts:215`, `shared/import/reconcile.ts:610` (+2)
- [ ] **W36** Scalanie i różnice na tablicach z id są O(R²) – przy tysiącach reguł importu każda zmiana fi.json kosztuje setki ms – `shared/merge.ts:63`, `shared/merge.ts:67` (+5)
- [ ] **W37** Po przeładowaniu okna (np. po awarii renderera) folder jest czytany od nowa z dysku zamiast z pamięci – `main/index.ts:482-487`, `main/index.ts:1009-1016` (+2)
- [x] **W38** Plan miesiąca: każde przejście miesiąca (i każda minuta) liczy pensję i debriefing po całej historii, debriefing dwa razy – `renderer/features/month/MonthPage.tsx:54`, `renderer/features/month/MonthPage.tsx:57` (+6)

## Niespójności (104: 1 wysokich, 20 średnich, 83 niskich)

### Priorytet wysoki

- [x] **N1** Wydatku nie da się opłacić z pieniędzy celu: `goalId` obsługuje tylko silnik, nie ma go w żadnym ekranie – `shared/schema/records.ts:122`, `shared/calc/fleet.ts:610` (+8)

### Priorytet średni

- [x] **N2** Tryb tylko do odczytu: część ekranów pokazuje sukces, choć nic się nie zapisało – `renderer/features/settings/AccountsTab.tsx:126`, `renderer/features/balances/actions.ts:39` (+53)
- [x] **N3** Szybki wpis: podgląd „Energia dziś → …” liczy inaczej niż silnik (kategoria bez koperty, data inna niż dziś) – `renderer/features/quick/QuickApp.tsx:142-144`, `renderer/features/quick/QuickApp.tsx:150` (+10)
- [x] **N4** Panel „Przychody”: mediana „Razem” liczona z miesięcy z ujemnym tradingiem – niezgodna z resztą panelu i z raportami – `shared/calc/income.ts:129`, `shared/calc/income.ts:145` (+4)
- [x] **N5** Zakup sfinansowany przez domownika nadal daje poważne naruszenie (cisza nocna, osłony poniżej minimum) – wbrew D80 f / T107 – `shared/calc/game.ts:237`, `shared/calc/game.ts:187` (+12)
- [x] **N6** „Miesiąc zamknięty na plus” (T52) przeczy silnikowi: fanfara przy alarmie „energia wyczerpana”, a miesiąc opłaty ze zbiornika nigdy nie jest na plus – `shared/calc/plan.ts:290`, `shared/calc/plan.ts:326` (+12)
- [x] **N7** Kreator startu: nieaktualne teksty o „wersji 1.1”, brak kroku folderu ICTTJ i celów w podziale środków (spec, kroki 5–6) – `renderer/features/wizard/WizardPage.tsx:230`, `renderer/features/wizard/WizardPage.tsx:280` (+7)
- [x] **N8** Koperta zarchiwizowanej kategorii znika z formularza planu, ale dalej liczy się do sum, energii dnia i kolejnych miesięcy – `renderer/features/month/MonthPage.tsx:172`, `renderer/features/month/MonthPage.tsx:203` (+3)
- [x] **N9** Kreator pokazuje inne odkładki i inną pierwszą pensję niż potem silnik i Plan miesiąca – `renderer/features/wizard/WizardPage.tsx:75`, `renderer/features/wizard/WizardPage.tsx:77` (+6)
- [x] **N10** Edytor operacji: zakup w ciszy nocnej bez potwierdzenia (D40), a godzina domyślnie „teraz” – gra liczy to jako poważne naruszenie – `renderer/features/operations/state.ts:179`, `renderer/features/operations/OperationEditor.tsx:186` (+4)
- [x] **N11** Dzienny przydział: silnik dolicza łupy „na następny miesiąc” i wydatki bez kategorii, a „Podział pensji” i debriefing nie – `shared/calc/fleet.ts:835`, `shared/calc/fleet.ts:897` (+7)
- [x] **N12** Nowy plik, błędny plik albo „Zamknij plik” kasują wszystkie decyzje otwartej sesji bez pytania; sesja nie przeżywa też przeładowania okna – `renderer/features/import/state.ts:120`, `renderer/features/import/state.ts:126` (+6)
- [x] **N13** Import pliku bez nowych operacji nie da się zapisać – „ostatni import” stoi, alarm „Zaległy import” zostaje, a Portfel XTB czeka – `renderer/features/import/ImportPage.tsx:156`, `renderer/features/import/ImportPage.tsx:200` (+4)
- [x] **N14** Decyzja grupy „Pożyczka” / „Podatek PIT-38” zostaje regułą: kolejne przelewy do tej osoby albo urzędu są pożyczką / podatkiem bez pytania – `shared/import/reconcile.ts:597-626`, `shared/import/learn.ts:135-137` (+5)
- [x] **N15** „Zapamiętaj” i decyzja zbiorcza w Operacjach uczą regułę z nazwy poprawionej przez użytkownika, a import szuka jej po nazwie z banku – `renderer/features/import/rules.ts:15`, `renderer/features/import/rules.ts:25-36` (+6)
- [x] **N16** Propozycja reguły na słowo pokazuje inną decyzję niż ta, którą zapisuje – `renderer/features/import/Learning.tsx:133`, `renderer/features/import/Learning.tsx:141` (+2)
- [x] **N17** Kopie konfliktu chmury nie mają „Scal” – jedna strona przepada w całości, choć okno zmian z drugiego komputera umie scalać tę samą sytuację – `renderer/features/sync/SyncPage.tsx:63`, `renderer/features/sync/SyncPage.tsx:81` (+4)
- [x] **N18** Historia zapisywana dla wszystkich wpisów, ale do obejrzenia tylko dla operacji, kontenerów i ustawień, mimo tekstów „jest w historii wpisu” – `renderer/features/operations/OperationEditor.tsx:114`, `renderer/features/cargo/CargoPage.tsx:270` (+4)
- [x] **N19** Kopia dzienna (D31 „codziennie”) robi się tylko przy otwarciu folderu, a aplikacja z założenia żyje tygodniami w zasobniku (D64) – `main/index.ts:411`, `main/datastore/backup.ts:52` (+3)
- [x] **N20** Baner „Ten folder jest też otwarty na: …” stale widoczny, bo aplikacja zgodnie z D46/D64 działa w tle na każdym komputerze (heartbeat w OneDrive co minutę całą dobę) – `renderer/app/Banners.tsx:84`, `main/index.ts:268` (+2)
- [x] **N21** Mostek pokazuje „wolne do decyzji” przy niepełnym kadłubie, a dopłata do XTB z tej kwoty łamie firewall – `shared/calc/fleet.ts:931`, `shared/calc/fleet.ts:680` (+2)

### Priorytet niski

- [x] **N22** Mostek („Układy gwiezdne · cele”) i Mapa gwiezdna („w celach”) pokazują różną sumę pieniędzy w celach, gdy zarchiwizowany cel ma środki – `renderer/features/bridge/BridgePage.tsx:375`, `renderer/features/bridge/BridgePage.tsx:387` (+3)
- [x] **N23** „Budżet jeszcze nie wystartował” (baner, kreator) przy budżecie, który silnik już prowadzi od salda otwarcia (T25) – `renderer/app/Banners.tsx:98-104`, `renderer/features/wizard/state.ts:66` (+3)
- [x] **N24** „Wpływy” w Operacjach i w Raportach / eksporcie to różne wielkości pod tą samą nazwą, a ta sama średnia raz jest „wpływami”, raz „przychodem” – `shared/operationsView.ts:117-138`, `renderer/features/operations/OperationsPage.tsx:435` (+12)
- [x] **N25** Debriefing: wiersze nie składają się na „Koszty netto”, a w Raportach i PDF brakuje „Bez kategorii” – `shared/calc/plan.ts:303`, `shared/calc/plan.ts:312` (+3)
- [x] **N26** Raporty: debriefing i odprawa bez elementów ze specyfikacji (seria, trafność dziennika, plan następnego miesiąca, Daily Bias) – `renderer/features/reports/ReportsPage.tsx:241`, `renderer/features/reports/ReportsPage.tsx:268` (+8)
- [x] **N27** Odsłuch odprawy: ujemna energia czytana jako 0 zł, brak zachowania z T7 – `renderer/features/bridge/BridgePage.tsx:222`, `renderer/features/bridge/BridgePage.tsx:258` (+5)
- [x] **N28** Kliknięcie alarmu w odprawie zawsze prowadzi do Planu miesiąca – `renderer/features/bridge/BridgePage.tsx:73`, `renderer/features/bridge/BridgePage.tsx:85` (+6)
- [ ] **N29** Dowództwo opisuje rozkaz „Dzienny przydział energii” wzorem podstawowego przydziału, a egzekwuje coś innego – `renderer/features/command/CommandPage.tsx:368`, `shared/calc/fleet.ts:130` (+1)
- [x] **N30** Specyfikacja odprawy i powiadomień: brak godziny odprawy, automatycznego odsłuchu i godzin powiadomień; Silver Bullet nie skraca odprawy – `docs/specyfikacja.md:323`, `docs/specyfikacja.md:334` (+7)
- [ ] **N31** Mostek: „Masa ładunku” bez prawdziwej nazwy i kwoty (reguła D34) – `renderer/features/bridge/BridgePage.tsx:406`, `renderer/features/bridge/BridgePage.tsx:408` (+22)
- [ ] **N32** Próg dziennika kapitańskiego 0 zł: szybki wpis nigdy nie pyta, reszta aplikacji pyta o każdy wydatek – `renderer/features/quick/QuickApp.tsx:102`, `shared/calc/operations.ts:112` (+5)
- [ ] **N33** Niespójne formaty kwot, dat i tekstów między ekranami – `renderer/features/quick/QuickApp.tsx:104`, `renderer/app/App.tsx:240` (+18)
- [ ] **N34** Martwy kod: nieużywane formatery z ICTTJ, ekran-zaślepka i flaga „ready” – `renderer/lib/format.ts:4`, `renderer/lib/format.ts:41` (+60)
- [ ] **N35** „Cofnij” niespójnie przy archiwizacji i zamykaniu – `renderer/features/radar/actions.ts:143`, `renderer/features/radar/RadarPage.tsx:214` (+14)
- [ ] **N36** Formularze „Nowa pożyczka”, „Nowy kontener”, „Nowy cel” i podział łupów giną po przejściu na inny ekran – `renderer/features/radar/RadarPage.tsx:263`, `renderer/features/cargo/CargoPage.tsx:51` (+3)
- [ ] **N37** Ściągawka skrótów pokazuje stały „Ctrl Alt B”, choć skrót szybkiego wpisu można zmienić albo może się nie zarejestrować – `renderer/app/ShortcutsHelp.tsx:14`, `renderer/features/bridge/BridgePage.tsx:158-160` (+4)
- [ ] **N38** Panel „Przychody” liczy wypłaty z puli Podatek sprzed startu budżetu (i niezadokowane) jako przychód z tradingu – `shared/calc/income.ts:39`, `shared/calc/income.ts:62` (+4)
- [ ] **N39** Szybki wpis zapamiętuje „przychód” domownika, którego nikt nie zapytał (edytor robi to tylko po jawnym wyborze) – `renderer/store/quickHost.ts:159`, `renderer/features/quick/QuickApp.tsx:341` (+3)
- [ ] **N40** „Pokrywa” w edytorze wpłaty pokazuje zakupy otwarte dziś, a „+ także za” – stan sprzed wpłaty – `renderer/features/household/MemberPickers.tsx:109`, `renderer/features/household/MemberPickers.tsx:115` (+3)
- [ ] **N41** Seed 1.4.0 przenosi należność jako „saldo na start” z datą dnia rozliczeń – przypomnienie po 30 dniach znika na miesiąc, data najstarszego zakupu ginie – `shared/calc/household.ts:207`, `renderer/features/household/actions.ts:113` (+2)
- [ ] **N42** ETA i znaczek DOL zakładają kolejność listy, a wypłata z puli Cele wypełnia najpierw cele ICTTJ – `shared/calc/goals.ts:117`, `renderer/features/starmap/StarMapPage.tsx:34` (+3)
- [ ] **N43** Zwrot do masy: teksty o wpływie i o firewallu nie pasują do wypływu i do puli Podatek – `renderer/features/dock/DockingDialog.tsx:156`, `renderer/features/dock/DockingDialog.tsx:158` (+5)
- [ ] **N44** Okno dokowania przy wyłączonym rozkazie firewall twierdzi, że osłony i kadłub są pełne – `renderer/features/dock/DockingDialog.tsx:83`, `renderer/features/dock/DockingDialog.tsx:199` (+1)
- [ ] **N45** Pominięty wpis ICTTJ z parą w banku: wpływ wraca jako „bez wpisu w ICTTJ – dopisz wypłatę” – `shared/calc/dock.ts:106`, `shared/calc/dock.ts:136` (+2)
- [ ] **N46** Cel ICTTJ w PLN bez kwoty („bierze wszystko odłożone w miesiącu”) nigdy nie dostaje pieniędzy z puli Cele – `shared/calc/goals.ts:37`, `shared/ictj.ts:136` (+2)
- [ ] **N47** Data rozliczeń wcześniejsza niż start budżetu jest pokazywana, choć silnik liczy od startu – `renderer/features/settings/HouseholdTab.tsx:71`, `renderer/features/household/actions.ts:84` (+1)
- [ ] **N48** Nowy cel wymaga kwoty > 0, a edycja pozwala ustawić 0 – cel bez słowa staje się „bez kwoty” – `renderer/features/starmap/StarMapPage.tsx:242`, `renderer/features/starmap/StarMapPage.tsx:300` (+1)
- [ ] **N49** Nieaktualny opis: przepływy domowników sprzed startu „dla statystyk” nigdy się już nie liczą – `shared/calc/household.ts:5`, `shared/calc/income.ts:56` (+2)
- [ ] **N50** Filtr „Kategoria → bez kategorii” łapie wpływy, przelewy, XTB i zakupy domowników – inaczej niż oznaczenie „bez kategorii” – `shared/operationsView.ts:87`, `shared/operationsView.ts:32` (+4)
- [ ] **N51** Filtr „Oznaczenia” działa jako I (AND), pozostałe menu jako LUB – ten sam wygląd, inne znaczenie – `shared/operationsView.ts:92`, `shared/operationsView.ts:85` (+2)
- [x] **N52** Zaokrąglenie odkładki: Ładownia pokazuje Math.round, harmonogram i Plan – trunc z resztą w ostatniej racie – `renderer/features/cargo/CargoPage.tsx:102`, `renderer/features/cargo/CargoPage.tsx:173` (+3)
- [ ] **N53** Błędy językowe w tekstach ekranów – `renderer/features/month/MonthPage.tsx:149`, `renderer/features/wizard/WizardPage.tsx:114` (+11)
- [x] **N54** Panel „Koperty” bieżącego miesiąca pomija kategorie bez koperty, a dla minionych miesięcy je pokazuje – `renderer/features/month/MonthPage.tsx:266`, `shared/calc/fleet.ts:902` (+1)
- [ ] **N55** Historia operacji niedostępna w trybie tylko do odczytu i dla wpisu z nowszej wersji – przycisk leży w fieldset disabled – `renderer/features/operations/OperationEditor.tsx:107`, `renderer/features/operations/OperationEditor.tsx:114` (+1)
- [x] **N56** Zasięg zaokrąglony do 0,1 miesiąca pokazuje próg klasy, której okręt nie ma – `renderer/features/bridge/BridgePage.tsx:35`, `renderer/features/bridge/BridgePage.tsx:150` (+9)
- [ ] **N57** Nieaktualne teksty w UI: „w późniejszych etapach” zasobnik pokaże energię, ICTTJ „w wersji 1.1” – `renderer/features/settings/SettingsPage.tsx:366`, `renderer/features/wizard/WizardPage.tsx:280` (+3)
- [ ] **N58** Specyfikacja zapowiada na Mostku radar, wywiad i krzywą majątku – po E6 i E8 ich tam nie ma – `docs/specyfikacja.md:277`, `renderer/features/bridge/BridgePage.tsx:163`
- [x] **N59** „Zaległa” na Radarze od 1. dnia po terminie, a w pożyczce i odprawie dopiero po 3 dniach – `shared/calc/radar.ts:89`, `renderer/features/radar/RadarPage.tsx:164` (+5)
- [ ] **N60** Czerwień i zieleń poza kwotami: ETA po terminie, Bearish, plakietka „zaszyfrowany” – `renderer/features/starmap/StarMapPage.tsx:245`, `renderer/features/bridge/BridgePage.tsx:263` (+1)
- [ ] **N61** Menu „Układ” na ekranie kreatora pokazuje identyfikator „wizard” zamiast nazwy – `renderer/features/layout/LayoutMenu.tsx:51`, `shared/panels.ts:220`
- [ ] **N62** „Zapisz teraz” w palecie pomija pytanie o zmiany z drugiego komputera, które obsługuje Ctrl+S – `renderer/features/palette/CommandPalette.tsx:52`, `renderer/app/App.tsx:100`
- [x] **N63** Krzywa majątku i przegląd roczny liczą pożyczkę zaciągniętą i depozyt domowników jako majątek – fałszywy BOS/CHoCH w górę – `shared/calc/intel.ts:27-88`, `shared/calc/intel.ts:330-334` (+8)
- [ ] **N64** Klasa okrętu bez histerezy: każdy powrót ponad tę samą granicę to nowy ekran „Nowa klasa” z fanfarą (D73) – `shared/calc/game.ts:636-643`, `renderer/store/game.ts:124` (+5)
- [x] **N65** Miesiąc w toku raportowany jako „Miesiąc zamknięty na plus: tak” (Raporty → Debriefing, CSV i Excel miesięcy) – `shared/calc/plan.ts:319-330`, `shared/export/budget.ts:123-124` (+6)
- [x] **N66** Przegląd roczny: suma „Wpływów” z tabeli miesięcy różni się od „Wpływów” roku na tym samym ekranie i w PDF – `shared/calc/intel.ts:303-316`, `shared/calc/intel.ts:310` (+4)
- [ ] **N67** Próg poważnego przekroczenia koperty w dwóch miejscach: alarm silnika na sztywno 20%, gra wg ustawienia z Dowództwa – `shared/calc/fleet.ts:907`, `shared/calc/game.ts:210-212` (+1)
- [ ] **N68** Status misji „Pełna energia” w trakcie tygodnia nie widzi dwóch ostatnich dni – „kurs utrzymany” obok „Dziś na razie: naruszenie” – `shared/calc/game.ts:385-390`, `renderer/features/command/CommandPage.tsx:74` (+4)
- [ ] **N69** Status misji „Dzień bez wydatków” liczy dzisiejszy, niezakończony dzień jako wolny od wydatków – `shared/calc/game.ts:414-417`, `renderer/features/command/CommandPage.tsx:74` (+3)
- [ ] **N70** „Poważne naruszenia w tym miesiącu” w Dowództwie liczone od ostatniej zmiany stopnia, w debriefingu – za cały miesiąc – `shared/calc/game.ts:589`, `shared/calc/game.ts:652-660` (+3)
- [ ] **N71** Raport wachty: wybrany tydzień zostaje w pamięci na tygodnie – „Raporty” z menu otwierają stary tydzień – `renderer/features/reports/state.ts:12-15`, `renderer/features/reports/ReportsPage.tsx:107` (+1)
- [ ] **N72** Jedna wielkość pod trzema nazwami: „Ładownia” / „Ładownia i odkładki” / „Order Block · ładownia”; misja „Rozliczenie z domem” po D80 – `renderer/features/reports/ReportsPage.tsx:156`, `renderer/features/reports/ReportsPage.tsx:247` (+4)
- [ ] **N73** Rozkazów nie da się zmienić w Dowództwie (spec), są tylko do odczytu z odnośnikiem do Ustawień – `renderer/features/command/CommandPage.tsx:366-376`, `docs/specyfikacja.md:226`
- [ ] **N74** „to nie duplikat” jest nieodwracalne, a „To nie to samo” w podobnych nazwach ma powrót w Ustawieniach – `renderer/features/import/DuplicatesPanel.tsx:98`, `renderer/features/import/DuplicatesPanel.tsx:150` (+2)
- [ ] **N75** Odnośnik „Możliwe duplikaty: N” z Operacji prowadzi do Importu, który przy otwartym pliku nie pokazuje panelu duplikatów – `renderer/features/operations/OperationsPage.tsx:215`, `renderer/features/import/ImportPage.tsx:823` (+1)
- [ ] **N76** Słowo kluczowe z paska zbiorczego importu zapisuje się tylko dla wydatków i nie obsługuje „Finansuje: X”, inaczej niż w Operacjach i w propozycji słowa – `renderer/features/import/ImportPage.tsx:541`, `renderer/features/import/ImportPage.tsx:561` (+4)
- [ ] **N77** Podgląd liczy „nierozliczone → rozliczone” inaczej niż wynik importu i toast – `renderer/features/import/ImportPage.tsx:155`, `renderer/features/import/ImportPage.tsx:171` (+5)
- [ ] **N78** Temat w sekcji „Gotowe” z plakietką „do decyzji” i pustą decyzją, gdy marki zdecydowano osobno – `renderer/features/import/state.ts:410`, `renderer/features/import/ImportPage.tsx:508` (+1)
- [ ] **N79** „zapamiętaj” przy temacie ze słowa w tytule – reguła i tak nie powstanie, choć grupa pisze „bez reguły” – `renderer/features/import/ImportPage.tsx:509`, `renderer/features/import/ImportPage.tsx:412` (+2)
- [ ] **N80** Ta sama decyzja reguły opisana na trzy sposoby (Reguły importu, Słowa kluczowe, propozycja słowa) – `renderer/features/settings/ImportTab.tsx:103`, `renderer/features/settings/ImportTab.tsx:126` (+3)
- [ ] **N81** Panel duplikatów pokazuje angielskie kody rodzaju („income”, „transfer”), inny format daty i opis wyboru niezgodny z T93 – `renderer/features/import/DuplicatesPanel.tsx:104`, `renderer/features/import/DuplicatesPanel.tsx:117` (+2)
- [ ] **N82** Wyszukiwarka i słowo kluczowe z wyszukiwania działają według innych zasad (kategoria propozycji, podciąg, powód) – `shared/import/reconcile.ts:411`, `renderer/features/import/ImportPage.tsx:588` (+1)
- [ ] **N83** „Przyjmij pewne (N)” i „Przyjmij podpowiedzi mBanku (N)” działają na wszystkich tematach także podczas wyszukiwania – `renderer/features/import/ImportPage.tsx:637`, `renderer/features/import/ImportPage.tsx:654` (+1)
- [ ] **N84** Odpowiedź „zaliczka / przychód” dla domownika liczona z liczby wpisów decyzji, a nie operacji – razem z pominiętymi – `renderer/features/import/state.ts:484`, `renderer/features/household/actions.ts:65`
- [ ] **N85** „+ domownik” zapisuje osobie na stałe „reszta jako przychód”, choć nikt o to nie zapytał (D80 b) – `renderer/features/import/ImportPage.tsx:363`, `renderer/features/import/ImportPage.tsx:364` (+5)
- [ ] **N86** Reguła do zarchiwizowanej (usuniętej) kategorii dalej ją nadaje nowym operacjom, a temat jest „Gotowe” – `shared/import/classify.ts:313`, `shared/import/classify.ts:171` (+11)
- [ ] **N87** Własna decyzja pojedynczej operacji inna niż wydatek jest niewidoczna na liście i nie da się jej cofnąć – `renderer/features/import/ImportPage.tsx:439`, `renderer/features/import/ImportPage.tsx:451` (+2)
- [ ] **N88** Panel duplikatów domyślnie scala możliwe duplikaty, przy których import pyta i ich nie łączy – `shared/import/reconcile.ts:166-186`, `shared/import/duplicates.ts:306-329` (+2)
- [ ] **N89** Ta sama reguła looseMatch dostaje inną nazwę banku w imporcie i w panelu – operacja banku bez nazwy jest w panelu „podobna” do wszystkiego – `shared/import/reconcile.ts:175`, `shared/import/reconcile.ts:46-50` (+2)
- [ ] **N90** Przywrócony wiersz usuniętej operacji („importuj mimo to”) wchodzi z gołą propozycją – nie ma go w grupach ani tematach – `shared/import/reconcile.ts:327`, `shared/import/reconcile.ts:554-561` (+2)
- [ ] **N91** Zachowana kopia konfliktu jest zapisywana z czasem tego komputera, ale z nazwą komputera kopii (updatedBy) – `main/datastore/store.ts:963`, `main/datastore/store.ts:971`
- [ ] **N92** Etykiety pól w Historii i oknie zmian: angielskie klucze i surowe ULID-y zamiast nazw – `shared/merge.ts:155`, `shared/merge.ts:224` (+2)
- [ ] **N93** Obecność: komputer z zegarem przestawionym do przodu nigdy nie jest „aktywny” – znika ostrzeżenie o folderze otwartym na dwóch komputerach – `main/datastore/presence.ts:39`, `renderer/app/Banners.tsx:83`
- [ ] **N94** Strona Synchronizacja porównuje wersje inaczej niż okna Historii i Zmian (surowe klucze, indeksy, updatedBy jako różnica) – `renderer/features/sync/SyncPage.tsx:34`, `renderer/features/sync/SyncPage.tsx:49` (+3)
- [ ] **N95** „Do Kosza” bez potwierdzenia przy każdym pliku z problemem – także w nowszym formacie i chwilowo nieczytelnym – `renderer/features/sync/SyncPage.tsx:338`, `main/datastore/store.ts:990` (+1)
- [ ] **N96** „Eksport: ZIP całego folderu” i przywracanie z niego tracą historię; strona Synchronizacja odsyła do backups/ mimo innego folderu kopii – `main/index.ts:571`, `main/datastore/backup.ts:19` (+3)
- [ ] **N97** Ta sama akcja nazywa się „Zachowaj nowsze” (Konflikty) i „Zaakceptuj nowsze” (Zmiany z drugiego komputera); „Weź z inny komputer” – `renderer/features/sync/SyncPage.tsx:259`, `renderer/features/sync/RemoteChangesDialog.tsx:253` (+2)
- [ ] **N98** „Zainstaluje się po zamknięciu aplikacji” – przy domyślnym zamykaniu do zasobnika aktualizacja nigdy nie instaluje się sama – `renderer/app/Banners.tsx:43`, `renderer/features/settings/UpdatesTab.tsx:73` (+6)
- [ ] **N99** Dymek zasobnika bez „Energia dziś” po włączeniu zamykania do zasobnika w trakcie pracy – `main/index.ts:663`, `main/index.ts:546` (+3)
- [ ] **N100** Kreator startu nadpisuje ustawienia tego komputera: skrót wraca do Ctrl+Alt+B, „zamykaj do zasobnika” wymuszone; drugi komputer nigdy nie dostaje autostartu – `renderer/features/wizard/state.ts:57`, `renderer/features/wizard/state.ts:125` (+3)
- [x] **N101** Kategoria bez koperty w tym miesiącu: w trakcie „bez limitu”, w debriefingu czerwone „ponad plan” – `shared/calc/plan.ts:312`, `shared/calc/plan.ts:314` (+2)
- [x] **N102** Przekroczenie koperty ma różne reguły w silniku, odprawie, powiadomieniach, grze i Daily Bias (próg 20%, koperty codzienne, limit 0) – `shared/calc/fleet.ts:907`, `shared/calc/game.ts:210` (+5)
- [x] **N103** Odprawa pokazuje tylko pierwszą dopłatę do XTB wbrew firewallowi w miesiącu – `shared/calc/briefing.ts:152`, `shared/calc/briefing.ts:155`
- [ ] **N104** Wieczorne przypomnienie ustawione w godzinach ciszy nocnej nigdy nie przychodzi – `shared/notify.ts:40`, `shared/notify.ts:55` (+1)

## Brakujące funkcje (43)

### Priorytet wysoki

- [x] **F1** Opłaty stałe w miesiącu: zapłacone / czeka / po terminie, alarm brakującej płatności, kontenery miesięczne na Radarze *(nakład M)*
- [x] **F2** Kopia dzienna także wtedy, gdy aplikacja tygodniami działa w zasobniku *(nakład S)* · ⚠ Zmienia decyzję techniczną T20 („przy starcie raz dziennie”) – zgodnie z D31 (kopie codzienne).
- [x] **F3** Przywracanie z kopii zapasowej w aplikacji (cały folder albo wybrane wpisy) *(nakład M)*
- [x] **F4** „Cofnij import” – całe wczytanie pliku z mBanku jednym przyciskiem *(nakład M)* · ⚠ T39 (operacja usunięta przez użytkownika nie wraca z kolejnym importem): usunięcie przy cofnięciu importu nie może być liczone jako „usunięte przez użytkownika”, inaczej ponowny import pominie te wiersze.
- [x] **F5** Saldo z pliku banku: automatyczne potwierdzenie i wskazanie dnia rozbieżności *(nakład M)* · ⚠ D73: misja „Inwentaryzacja” liczy potwierdzenia sald, więc potwierdzenie z pliku zaliczy ją dla mBanku samo – trzeba zdecydować, czy tak ma być.
- [x] **F6** „Meldunki do rozpatrzenia”: skrzynka zaległych spraw i diagnostyka danych z licznikiem w menu *(nakład M)*
- [x] **F7** Szybki wpis seriami: „Zapisz i następny”, szablony, powtórz ostatni, działania w kwocie, „wczoraj”, szkic po Esc *(nakład M)* · ⚠ D70 (Enter zapisuje, Esc zamyka) zostaje bez zmian – seria działa pod Ctrl+Enter.
- [x] **F8** Oficer szybkiego wpisu zna marki, reguły importu i słownik sieci *(nakład S)*

### Priorytet średni

- [ ] **F9** Ładownia pilnuje cen: podwyżki abonamentów, opłaty o zmiennej kwocie, martwe kontenery *(nakład M)*
- [ ] **F10** Przelew między kontami budżetu z drugą nogą *(nakład M)*
- [ ] **F11** Zbiorcze naprawy w Operacjach: usuń, zmień konto, rodzaj albo datę zaznaczonych – z „Cofnij” *(nakład M)*
- [ ] **F12** Ostrzeżenie przy edycji operacji z potwierdzonego okresu albo z banku *(nakład S)* · ⚠ D28 (pełna edycja) – zostaje, bo to tylko ostrzeżenie, bez blokady.
- [x] **F13** Mądrzejsze wieczorne przypomnienie: „Dziś bez wydatków”, „Przypomnij za 30 min”, pominięcie po dopisaniu *(nakład S)*
- [ ] **F14** Nowy plik z mBanku wykryty sam w folderze Pobrane – import jednym kliknięciem *(nakład S)*
- [ ] **F15** Cel z terminem: potrzebna rata miesięczna i opcjonalna odkładka z pensji *(nakład M)* · ⚠ Samo pokazanie potrzebnej raty – bez konfliktu. Rata z pensji omija kolejność D13 (osłony → kadłub → cele) i D72 (cele zasilane z dokowania) – do decyzji użytkownika.
- [ ] **F16** Zaplanowane operacje jednorazowe, spodziewane wpływy i przypomnienia własne na Radarze *(nakład M)*
- [ ] **F17** Tagi i „wyprawy” – koszt wyjazdu albo projektu przez wiele kategorii *(nakład M)*
- [ ] **F18** Operacje: filtry zaawansowane, sortowanie, zapisane widoki, eksport widocznej listy *(nakład M)*
- [ ] **F19** Paleta (Ctrl+K) szuka też wpisów: operacji, kontenerów, celów, pożyczek, domowników i ustawień *(nakład M)*
- [ ] **F20** Wywiad z drążeniem: podkategorie, kontrahenci, porównania okresów *(nakład M)*
- [x] **F21** Dwa komputery: „w użyciu” zamiast „otwarty” – komputer w zasobniku nie pisze w tle i nie powiela powiadomień *(nakład M)*
- [x] **F22** Audyt reguł importu: edycja, niespójności, „Zastosuj do historii”, warunek kwoty *(nakład M)*
- [ ] **F23** Wykrywanie opłat cyklicznych: kwartalne, półroczne, zmienne kwoty i harmonogram dat *(nakład M)* · ⚠ T48 (zasady wykrywania stałych opłat: cykl miesięczny ±15% albo roczny) – do rozszerzenia.
- [ ] **F24** Majątek netto: krzywa z długiem i należnościami *(nakład M)* · ⚠ D73 i T81 (krzywa majątku = suma sald kont na koniec tygodnia) – propozycja dodaje drugą linię zamiast zmieniać definicję; do decyzji użytkownika.
- [ ] **F25** Stopa oszczędności i bilans paliwa miesiąca *(nakład S)*
- [ ] **F26** Prognoza sald kont fizycznych – czy na mBanku starczy na płatność *(nakład M)*
- [ ] **F27** Kurs na 12 miesięcy: prognoza przepływów z wpływami *(nakład L)*
- [ ] **F28** Reszta koperty planowej na następny miesiąc i „pokryj przekroczenie z innej koperty” *(nakład M)* · ⚠ D18 (łupy: osłony / cel / następny miesiąc) – rozszerzenie trzeciej opcji. „Pokryj przekroczenie” przed końcem dnia może usunąć naruszenie koperty (D73, T75) – trzeba zdecydować, czy gra ocenia stan przed przesunięciem, czy po nim.
- [ ] **F29** „Skąd ta liczba?” – rozbicie energii dziś, zasięgu i warstw oraz słowniczek metafory *(nakład M)*
- [ ] **F30** Skala interfejsu i tryb wyższego kontrastu (ustawienie komputera) *(nakład S)* · ⚠ D33 (wygląd jak ICTTJ) – tylko jako opcja komputera, domyślnie bez zmian.
- [ ] **F31** Radar anomalii: nietypowe kwoty i możliwe podwójne obciążenia *(nakład M)*
- [ ] **F32** Flota rezerwowa: IKE, IKZE, PPK, obligacje i lokaty poza budżetem *(nakład L)* · ⚠ D10 (jeden zbiór kont, podział wirtualny) i T31 – aktywa wychodzą poza warstwy, więc nie zmieniają osłon ani zasięgu. D73 / T81 – krzywa majątku jako suma sald kont budżetu. D54 – konto tradingowe (maklerskie) XTB nie może tu trafić. Jeśli IKE / IKZE są w XTB, trzeba potwierdzić, że to nie konto tradingowe.

### Priorytet niski

- [ ] **F33** Dziennik zmian folderu i historia przy każdym wpisie *(nakład M)*
- [ ] **F34** Zwroty w drodze: oczekiwany zwrot pieniędzy *(nakład M)*
- [ ] **F35** Symulator manewrów „co jeśli” *(nakład M)*
- [ ] **F36** Osobista inflacja koszyka *(nakład M)* · ⚠ Automatyczne pobieranie CPI z GUS łamałoby zasadę „sieć tylko do aktualizacji” (D74), stąd wariant z CPI wpisywanym ręcznie.
- [ ] **F37** Plan roczny: siatka kopert i pensji na 12 miesięcy *(nakład M)*
- [ ] **F38** Paragony, faktury i gwarancje przy operacji – z terminem zwrotu lub rękojmi *(nakład M)* · ⚠ Brak sprzeczności z decyzją użytkownika. Trzeba zmienić decyzje techniczne T22 („bez protokołu plików – FI nie ma screenów”) i T20 (kopia „folder FI jest mały, bez screenów”) – kopie bez załączników albo tygodniowe, pilnowanie rozmiaru folderu na OneDrive.
- [ ] **F39** Ulgi z PIT-37 / PIT-36: wydatki do odliczenia w roku *(nakład M)* · ⚠ D58 dotyczy tylko PIT-38 (termin bez kwoty) – PIT-37/36 to nowa sprawa. D8 (trading bez ZUS) sugeruje, że dochodu z PIT-37 może nie być – do potwierdzenia przez użytkownika.
- [ ] **F40** Automatyczne ukrycie kwot po bezczynności i przy starcie z Windows *(nakład S)* · ⚠ D30 (bez blokady) – zgodne, bo to tylko ukrycie kwot.
- [ ] **F41** Wpisy z telefonu przez skrzynkę na OneDrive *(nakład M)* · ⚠ D2 (bez wersji na iPhone'a) – to nie aplikacja na telefon, tylko skrót iOS zapisujący plik; do decyzji użytkownika.
- [x] **F42** Polskie dni wolne w liczeniu dni roboczych *(nakład S)* · ⚠ T63 (decyzja techniczna: „pon–pt, bez świąt”) – do zmiany. D72 mówi o „3 dniach roboczych”, więc uwzględnienie świąt jest zgodne z intencją użytkownika.
- [ ] **F43** Zamknięcie i archiwizacja starych lat, porządki w folderze *(nakład L)* · ⚠ Brak sprzeczności z decyzją użytkownika. Zmienia decyzję techniczną T2 (jeden plik JSON na rekord) dla zamkniętych lat i wymaga ostrożności przy scalaniu / konfliktach (T18).
