# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary:
`docs/archiwum/postep-do-1.15.md` (Grep po wersji, grupie albo identyfikatorze). Po wydaniu wpisy etapu przenoś do
archiwum – tutaj zostaje stan (≤ 400 linii, sprawdza CI). Odwołania „`docs/postep.md` „…”” w starszych dokumentach
i komentarzach (sekcje do 1.15.1) prowadzą do tego archiwum.

**Stan:** **1.15.4 wydane** (25.10.2026). 1.15.2 (audyt funkcjonalny PC – pakiety A, B, C; N-PC-1 do N-PC-20, D95,
T313), 1.15.3 (niezależne wpłaty domowników, reguły tytuł + kontrahent) i 1.15.4 (poprawki panelu operacji i
komponentu `Segmented`) wydane 24–25.10 – 1.15.3 i 1.15.4 z sesji Antigravity bez wpisu w dzienniku, zakres w
`CHANGELOG.md`. 1.15.1 wydane (PR #46 – wcześniejsza wpłata domownika finansuje późniejszy zakup, D94, T312).
iPhone (D92 / D93): 1.13.0–1.15.0 wydane (grupy iA–iC, PR #42–#44); przerwa po iC (D93) – „Przed grupą iD” niżej.
1.11.0 i 1.12.0 wydała w tym czasie równoległa sesja, więc iPhone ma numery przesunięte: wersje iA–iE 1.13.0–1.17.0,
decyzje D92 / D93, T305–T311.
**Następny krok:** przerwa po iC (D93) – od użytkownika: procent limitu tygodniowego (kolumna „Rzeczywiste”), odpowiedź
do IP15 (czy folder danych ICTTJ jest na OneDrive – bez niej iD nie startuje), decyzje IP21 (kreator) i IP24 (zapisy w
tle) przed iE, uwagi z telefonu do iA–iC; potem grupa iD (1.16.0) na komendę (D67). Przed każdym etapem tabela prac z
modelem oszczędnym z górką; thinking domyślnie xhigh, max tylko silnik pieniędzy i granica ICTTJ (D96). Flota rezerwowa (F32), paragony i gwarancje (F38), ulgi PIT-37 / PIT-36 (F39),
wpisy z telefonu przez skrót iOS (F41) i archiwizacja starych lat (F43) – odrzucone (D88).
Do sprawdzenia w aplikacji: 1.5.0–1.12.0 – listy w archiwum dziennika; iPhone – sekcje „1.13.0”, „1.14.0” i „1.15.0”
w archiwum oraz `docs/iphone.md`.

## Zasady prowadzenia (prośba użytkownika 16.10.2026 – D67)
- Po każdym kroku (etapie albo grupie) zaktualizowana tabela: model i thinking z górką, szacowany czas pracy Claude'a.
- Bez komendy użytkownika nie zaczynam kolejnego etapu ani grupy.
- Etapy, które mogą iść jednym ciągiem, są zgrupowane: w grupie bez pauzy między etapami (każdy etap i tak kończy się
  testami, `/code-review` high, commitem i wpisem tutaj), jeden PR i jedno wydanie na grupę, potem pauza.
- Wpis etapu: zakres, decyzje (D… / T…), testy, czas faktyczny, rzeczy otwarte – zwięźle; mapa kodu nie jest
  potrzebna (kod przeszukuje się Grepem).

## Kolejka prac

Czas = praca Claude Code w sesji (czytanie, pisanie, testy, poprawki), bez testowania przez użytkownika i bez czekania
na CI. Model i thinking z górką. Ukończone grupy E0 … 1.15.1 i iA–iC z czasami: archiwum dziennika, sekcja „Kolejka
prac” (razem ok. 63 h; ciąg M–V zmierzone ok. 17 h przy planie ok. 24–25 h).

| Grupa | Etapy | Model | Thinking | Czas Claude'a | Wydanie | Co potrzebne przed startem | Stan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **iD** | iPhone: Ładownia i gwiazdy – dokowanie z ICTTJ, Ładownia, Mapa gwiezdna (IP15–IP17) | Opus 5.5 | **max** (z IP15; bez niego xhigh) | 1,25–1,75 h z IP15, 0,5–0,75 h bez (z górką 2 h; plan był 4–4,5 h – grupy iA–iC trwały 0,15–0,3 planu) | 1.16.0 | odpowiedź: czy folder danych ICTTJ jest na OneDrive (bez tego IP15 odpada); limit tygodniowy po iC; komenda | ⏳ czeka na odpowiedzi |
| **iE** | iPhone: Dowództwo – Dowództwo, Wywiad, kreator, Ustawienia, zapisy w tle (IP18, IP19, IP21, IP22, IP24) | Opus 5.5 | **xhigh** (D96; max tylko w krokach silnika pieniędzy albo granicy ICTTJ) | 5,5–7,5 h (z górką 8 h) | 1.17.0 | decyzje: IP21 (kreator – propozycja: bez), IP24 (zapisy w tle z telefonu) | ⏳ |
| | **iPhone iA–iE (D92)** | | | **24–31,5 h (z górką 34 h)** | | | |

**iPhone – limit tygodniowy (D93).** Plan Max 20x, odnowienie w niedzielę o 18:00; 21.10.2026 zużyte 55 %. Podstawa:
od odnowienia 18.10 o 18:00 grupy E–V i 1.10.1 (ok. 33 h pracy Claude'a – zegar z tabeli, Opus 5.5 · max, przegląd
`/code-review` high, mutacje, E2E) i koniec przeglądu ultracode zużyły ok. 55 %, czyli ok. 1,4–1,7 % na godzinę pracy.
Grupy FI kończyły się w ok. 0,7 czasu planu. „Oczekiwane” = 0,7 środka planu × 1,55 %/h (+ zapas na CI macOS w iA),
„z górką” = górna granica „z górką” × 1,7 %/h. Rzeczywiste zużycie wpisuję po każdej grupie (użytkownik podaje %).

| Grupa | Oczekiwane | Z górką | Narastająco z górką | Rzeczywiste |
| --- | --- | --- | --- | --- |
| iA | ok. 11 % | 20 % | 75 % | – |
| iB | ok. 2,5 % | 5 % | 80 % | – |
| iC | ok. 6 % | 12 % | 92 % | – |
| iD | ok. 2,5 % (bez IP15 ok. 1 %) | 3,5 % | rzeczywiste po iC + 3,5 % | – |
| iE | ok. 7 % | 13,5 % | po odnowieniu | – |
| **Razem** | **ok. 29 %** | **ok. 54 %** | | |

iD przeliczone z czasu w „Przed grupą iD” (21.10, po iC: grupy iA–iC trwały 0,15–0,3 planu); iE – w „Przed grupą iE”.
Po podaniu procentu po iC przeliczam zużycie na godzinę pracy i obie grupy.

**Porządek kontekstu (25.10.2026):** CLAUDE.md skrócony ze 124 KB do kompasu, wiedza modułów w `.claude/rules/`,
dziennik i mapa kodu w `docs/archiwum/`. Punkt odniesienia do porównania: ok. 1,4–1,7 % limitu na godzinę pracy
(Opus 5.5 · max, wyżej) – po kolejnej grupie porównaj z nowym zużyciem.

## Przed grupą iD – iPhone: Ładownia i gwiazdy (21.10.2026)

1. **Co trzeba wiedzieć** – grupy iA–iC wydane (1.13.0–1.15.0, PR #42–#44); po iC przerwa (D93). Grupa iD (1.16.0):
   - IP15 Dokowanie z ICTTJ – tylko gdy folder danych ICTTJ jest na OneDrive. Telefon czyta z niego wyłącznie
     `payouts/**` i `forecasts/*.json` (Graph, to samo logowanie – `Files.ReadWrite` obejmuje cały OneDrive, w Entra
     nic nie dochodzi) i nigdy nic do niego nie wysyła: osobna kopia tylko do pobierania, bez obecności telefonu i bez
     kopii konfliktu w folderze ICTTJ. Na telefonie: wybór folderu ICTTJ w ustawieniach telefonu, panel „Dokowanie” na
     Mostku, okno dokowania z podziałem, wypłata bez pary w mBanku po 3 dniach roboczych → Portfel XTB (D72), meldunek
     „Dokowanie”, scenariusz ICTTJ na Mapie gwiezdnej. Bez IP15 dokowanie zostaje na komputerze – liczby na telefonie i
     tak są te same (dokowania leżą w folderze FI).
   - IP16 Ładownia – ekran komputera na telefonie: kontenery (dodanie, zmiana, archiwizacja, historia kwot), linia
     zanurzenia, zbiorniki, symulacja, propozycje opłat, nowe ceny i ciche kontenery, harmonogram miesięcy; meldunek
     „Ładownia” rozpatrywany na telefonie.
   - IP17 Mapa gwiezdna – cele (dodanie, kwota, termin i rata, archiwizacja z przeniesieniem pieniędzy); kolejność celów
     przyciskami ↑ ↓ – na komputerze przeciąganiem, które na iPhonie nie działa pewnie.
   - Zapisy w tle z telefonu (zamrażanie dni gry, cele ICTTJ z prognozy) – nie w iD (IP24, grupa iE). Format folderu
     bez zmian.
2. **Co użytkownik musi powiedzieć**:
   - IP15: czy folder danych ICTTJ jest na OneDrive, a jeśli tak – gdzie (np. `OneDrive\ICT Trade Journal`).
     Propozycja: tak → IP15 jak wyżej (telefon podpowie folder z `journal.json` w głównym folderze OneDrive); nie → iD
     bez IP15.
   - Procent limitu tygodniowego teraz (po iA–iC) – kolumna „Rzeczywiste”.
   - Przed iE (można już teraz): IP21 kreator startu – propozycja: bez niego (budżet startuje na komputerze: kreator
     dzieli środki i proponuje pensję z historii z banku, a import z mBanku jest tylko na komputerze; telefon przed
     startem budżetu mówi, że kreator jest na komputerze). IP24 zapisy w tle z telefonu – propozycja: tak (telefon w
     użyciu zamraża dni gry i – z IP15 – uzupełnia cele ICTTJ, jak komputer w użyciu, z tą samą kontrolą konfliktu);
     bez tego dni zamraża komputer przy otwarciu, a do tego czasu ocena dnia może się zmienić po późniejszej edycji
     operacji.
   - Uwagi z telefonu do iA–iC (jeśli są) – poprawki wejdą do iD.
3. **Co przygotować** – nic nowego (uprawnienie OneDrive obejmuje folder ICTTJ, nowych wtyczek nie ma).
4. **Model, thinking, czas** – tabela prac (D90); grupy iA–iC trwały 0,15–0,3 planu:

| Krok | Co obejmuje | Model i thinking (z górką) | Czas Claude'a |
| --- | --- | --- | --- |
| iD-1 | Folder ICTTJ na telefonie: kopia tylko do pobierania (`payouts/`, `forecasts/`), wybór folderu, odświeżanie razem z synchronizacją, stan ICTTJ w oknie (IP15) | Opus 5.5 · max (minimum xhigh – granica „nigdy nie zapisuj w folderze ICTTJ”) | 0,5–0,75 h |
| iD-2 | Dokowanie na telefonie: panel na Mostku, okno dokowania, Portfel XTB, meldunek (IP15) | Opus 5.5 · xhigh (minimum high) | 0,25 h |
| iD-3 | Ładownia na telefonie, meldunek ładowni (IP16) | Opus 5.5 · xhigh (minimum high) | 0,25 h |
| iD-4 | Mapa gwiezdna na telefonie, kolejność przyciskami (IP17) | Opus 5.5 · high (minimum medium) | 0,1–0,25 h |
| iD-5 | E2E telefonu, przegląd zrzutów, `/code-review` high, CI (Linux, Windows, macOS), wydanie 1.16.0 | Opus 5.5 · xhigh | 0,25 h |
| Razem | rekomendacja: Opus 5.5 · max z IP15, xhigh bez niego | | z IP15 1,25–1,75 h (z górką 2 h), bez 0,5–0,75 h (z górką 1 h); plan był 4–4,5 h |

Limit tygodniowy (D93): iD ok. 2,5 % (bez IP15 ok. 1 %), z górką 3,5 % – przeliczę po procencie po iC.
