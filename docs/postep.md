# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary: do 1.15.4 –
`docs/archiwum/postep-do-1.15.md`, audyt 1.15.4 i grupy po nim – `docs/archiwum/postep-od-1.15.4.md` (Grep po wersji,
grupie albo identyfikatorze). Po wydaniu wpisy grupy przenoś do archiwum – tutaj zostaje stan (≤ 400 linii, sprawdza CI).
Odwołania „`docs/postep.md` „…”” w starszych dokumentach i komentarzach (sekcje do 1.15.1 i audyt) prowadzą do archiwum.

**Stan:** **1.15.4 wydane** (25.10.2026). Audyt funkcjonalny 1.15.4 (D97) zakończony 03.11 – 80 znalezisk, 48 AP,
plan N1–N5 (`docs/audyt/raport.md`, `docs/audyt/wnioski.md`; przebieg w archiwum). Odpowiedzi 04.11: D98 (iPhone
wstrzymany), D99 (wnioski przyjęte, S4), D100 (konto Gotówka, wpłata od dowolnej osoby spłaca pożyczkę), D101 (ciąg
N1–R2 bez pauz, bez kart kredytowych, wydanie po każdej grupie, zasada wątpliwości).
**Następny krok:** ciąg N1 → N2 → N3 → N4 → N5 → R1 → R2 (D101) w toku – stan w tabeli niżej; po wznowieniu kontynuuj od
pierwszej grupy bez ✅. Otwarte poza ciągiem: raport maszyny wirtualnej i lista „Tylko Ty” (`docs/audyt/ty.md`) – dopiszą się
do wniosków, gdy będą; kalibracja progów gry po N3 (D99 pkt 12, za osobną zgodą). iPhone (iD, iE, AP-39, AP-40)
wstrzymany (D98) – „Przed grupą iD” niżej zostaje jako zapis na później. Odrzucone (D88): F32, F38, F39, F41, F43.

## Ciąg N1–R2 (D101) – stan

Koordynator: sesja główna (Opus 5.5 · xhigh) – „Przed grupą”, zlecenia, `/code-review`, PR, CI, scalenie (D71), wydanie,
wpisy. Wykonawcy: podagenci z modelem i thinking według D96 (tabela prac każdej grupy). Każda grupa: kod z testami, które
bez poprawki padają → pełne testy → `/code-review` (N1, N2 – xhigh, reszta – high) → poprawki → CHANGELOG i wersja → PR →
CI (Linux, Windows) → scalenie → wydanie → wpis tutaj → następna grupa bez pauzy. Po grupach silnika (N2, N3) wyrocznia
(AP-32) na migawkach audytu jako regresja.

| Grupa | Wersja | Gałąź | Stan | PR | Czas faktyczny |
| --- | --- | --- | --- | --- | --- |
| 0 – przygotowanie | – | `claude/audyt-1.15.4` | ⏳ D101, porządek tego pliku, PR audytu do `main` (bez wydania) | – | – |
| N1 Dane i import | 1.15.5 | `claude/1.15.5-dane-import` | ⏳ | – | – |
| N2 Silnik pieniędzy | 1.15.6 | – | ⏳ | – | – |
| N3 Opłaty, energia, gra | 1.15.7 | – | ⏳ | – | – |
| N4 Zasady interfejsu | 1.15.8 | – | ⏳ | – | – |
| N5 Ścieżki i ergonomia | 1.15.9 | – | ⏳ | – | – |
| R1 Rozwojowe 1 | 1.16.0 | – | ⏳ | – | – |
| R2 Rozwojowe 2 | 1.17.0 | – | ⏳ | – | – |

### Do potwierdzenia (zasada wątpliwości, D101 pkt 4)
Zachowanie widoczne dla Ciebie, którego nie rozstrzygały D99 i D100 – wybrany wariant rekomendowany; możesz go odwrócić.

| Grupa | Sprawa | Wybrany wariant | Gdzie |
| --- | --- | --- | --- |
| – | – | – | – |

## Przed grupą N1 – Dane i import (04.11.2026)
1. **Co trzeba wiedzieć.** Zakres: AP-1 (folder danych przed zapisem, bez folderu-widma – AF-2 K, AF-42, AF-14, AF-39,
   AF-41, AF-75), AP-2 (jedna tożsamość wiersza banku między formatami i kontami – AF-1 K, AF-9 W, AF-28, AF-63), AP-8
   (zmiana czekająca na „Zmień mimo to” jako szkic – AF-3 W, AF-11), AP-6 (pożyczka, PIT-38, XTB i domownik przed regułą
   i decyzją zbiorczą – AF-26 W, AF-62, AF-64), AP-7 („+ w tym za X” w imporcie – AF-27 W); opisy w `docs/audyt/wnioski.md`
   sekcja 4, dowody w `docs/audyt/raport.md`. Najpierw PR audytu (dokumenty i laboratorium `tests/audyt/`, bez zmiany
   wersji) do `main`; gałąź N1 wychodzi z gałęzi audytu. AP-1 i AP-8 (folder danych, edytory) idą równolegle w osobnym
   drzewie roboczym; AP-2, potem AP-6 i AP-7 (ten sam moduł importu) – po kolei.
2. **Co musisz powiedzieć** – nic (D101).
3. **Co przygotować** – nic.
4. **Tabela prac:**

| Krok | Co obejmuje | Model i thinking (z górką; minimum) | Czas Claude'a |
| --- | --- | --- | --- |
| N1-a | AP-1 folder danych przed zapisem, baner „Folder niedostępny”, „Zapisano.” po zapisie; AP-8 szkic przy „Zmień mimo to”, kreator i saldo banku jako szkic | podagent Opus 5.5 · xhigh (min. high); osobne drzewo, równolegle | 1–1,5 h |
| N1-b | AP-2 operacje usunięte z opisem i parowane miarą B5, B5 po wszystkich kontach rachunku, „usuń duplikat”, konto po numerze rachunku, meldunek | podagent Opus 5.5 · xhigh (min. high) | 0,75–1,25 h |
| N1-c | AP-6 pożyczka, PIT-38, XTB i domownik przed regułą, „niespójne” reguły; AP-7 „+ w tym za X” w imporcie | podagent Opus 5.5 · max (min. xhigh) – rozliczenia (D96) | 0,75–1,25 h, po N1-b |
| N1-d | pełne testy, `/code-review` xhigh, poprawki z testem | koordynator; poprawki – podagent Opus 5.5 · xhigh | 0,5 h |
| N1-e | CHANGELOG 1.15.5, wersja, PR, CI, scalenie, wydanie, wpis | koordynator (wystarczy Sonnet 5.5) | 0,25 h + CI |
| Razem | rekomendacja: Opus 5.5 · xhigh, max w N1-c | | 2,5–4 h (z górką 4,5 h) + CI ok. 40 min |

## Zasady prowadzenia (prośba użytkownika 16.10.2026 – D67)
- Po każdym kroku (etapie albo grupie) zaktualizowana tabela: model i thinking z górką, szacowany czas pracy Claude'a.
- Bez komendy użytkownika nie zaczynam kolejnego etapu ani grupy. Wyjątek: ciąg N1–R2 – komenda z 04.11.2026 obejmuje
  wszystkie grupy, bez pauz między nimi (D101).
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
| **N1** | Dane i import po audycie: folder danych przed zapisem, tożsamość wiersza banku, szkic przy „Zmień mimo to”, pożyczka przed regułą, „+ w tym za” (AP-1, 2, 6, 7, 8; AF-1 K, AF-2 K, AF-3 W, AF-9 W, AF-26 W, AF-27 W) | Opus 5.5 | xhigh (max w AP-6, AP-7) | 2,5–4 h (z górką 4,5 h) | 1.15.5 | D101 | ⏳ |
| **N2** | Silnik pieniędzy po audycie: przeniesienie środków celu w chwili zapisu (zamiast T129), „reszta jako zaliczka” + naprawa danych, płatność sprzed startu, „Wycofaj dokowanie”, usuwanie kategorii, plan = silnik, dostawa według puli, wyrocznia jako regresja (AP-3, 4, 5, 9, 11, 12, 32); nowa funkcja: wpłata od dowolnej osoby spłaca pożyczkę (D100) | Opus 5.5 | **max** | 3–4,5 h (z górką 5,5 h) | 1.15.6 | – (S4, T163 – D99) | ⏳ |
| **N3** | Opłaty, energia, gra: jeden stan opłaty, energia dziś w granicach miesiąca, zamrażanie po przerwie, kadłub, Kurs = Mostek, trend poduszki (AP-10, 13, 14, 17, 18, 30, 31) | Opus 5.5 | xhigh (max w AP-13, AP-17) | 2,5–3,5 h (z górką 4 h) | 1.15.7 | – (D99) | ⏳ |
| **N4** | Zasady interfejsu: komunikat przy każdym odrzuceniu, „Cofnij” wszędzie, teksty, odprawa z hierarchią (AP-15, 16, 22, 23) | Sonnet 5.5 | high (Opus high przy logice) | 2–3 h (z górką 3,5 h) | 1.15.8 | – | ⏳ |
| **N5** | Ścieżki i ergonomia: kreator, domownicy, szybki wpis, debriefing, dokowanie, konflikty, nowy komputer, eksport, Operacje (AP-19–21, 24–29, 33, 34, 36–38) | Opus 5.5 | high (xhigh przy silniku) | 3–4,5 h (z górką 5 h) | 1.15.9 | – (D99, D100) | ⏳ |
| **R1** | Rozwojowe 1: import w Web Workerze (AP-35, po pomiarze w maszynie), kalendarz miesiąca na Radarze (AP-42), dowolny CSV – drugi bank (AP-43), reguły I / LUB i dla wpisów ręcznych (AP-45), opis formatu folderu (AP-47) | Opus 5.5 | xhigh (high przy UI) | 3–4,5 h (z górką 5 h) | 1.16.0 | D101 | ⏳ |
| **R2** | Rozwojowe 2: plan spłaty pożyczek (AP-41, bez karty kredytowej – D101), prognoza wieloletnia bez IKE / IKZE / PPK (AP-44), Sankey miesiąca (AP-46), kwota w walucie (AP-48) | Opus 5.5 | **max** (plan spłaty – silnik) / xhigh | 3–5 h (z górką 6 h) | 1.17.0 | – (D101) | ⏳ |
| **iD** | iPhone: Ładownia i gwiazdy – dokowanie z ICTTJ, Ładownia, Mapa gwiezdna (IP15–IP17) | Opus 5.5 | **max** (z IP15; bez niego xhigh) | 1,25–1,75 h z IP15, 0,5–0,75 h bez (z górką 2 h; plan był 4–4,5 h – grupy iA–iC trwały 0,15–0,3 planu) | później | odpowiedź: czy folder danych ICTTJ jest na OneDrive (bez tego IP15 odpada); limit tygodniowy po iC; komenda | ⏸ wstrzymane (D98) |
| **iE** | iPhone: Dowództwo – Dowództwo, Wywiad, kreator, Ustawienia, zapisy w tle (IP18, IP19, IP21, IP22, IP24) | Opus 5.5 | **xhigh** (D96; max tylko w krokach silnika pieniędzy albo granicy ICTTJ) | 5,5–7,5 h (z górką 8 h) | później | decyzje: IP21 (kreator – propozycja: bez), IP24 (zapisy w tle z telefonu) | ⏸ wstrzymane (D98) |
| | **iPhone iA–iE (D92)** | | | **24–31,5 h (z górką 34 h)** | | | |


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
