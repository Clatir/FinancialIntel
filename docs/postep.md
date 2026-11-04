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
| 0 – przygotowanie | – | `claude/audyt-1.15.4` | ✅ D101, porządek tego pliku, PR audytu scalony (bez wydania); poprawka E2E telefonu w nocy | #49 | 0,5 h |
| N1 Dane i import | 1.15.5 | `claude/1.15.5-dane-import` | ✅ wydane 04.11 07:33 (wpis w archiwum `postep-od-1.15.4.md`) | #50 | ok. 5,5 h (01:53–07:33) |
| N2 Silnik pieniędzy | 1.15.6 | `claude/1.15.6-silnik` | 🔄 kod i przeglądy gotowe; PR, CI, wydanie | – | ok. 8 h zegara (05:05–13:00 do PR) |
| N3 Opłaty, energia, gra | 1.15.7 | `claude/1.15.7-oplaty` | 🔄 kod zintegrowany, przegląd xhigh zrobiony; ostatnia poprawka – jedna reguła płatność ↔ cykl opłaty | – | – |
| N4 Zasady interfejsu | 1.15.8 | – | ⏳ | – | – |
| N5 Ścieżki i ergonomia | 1.15.9 | – | ⏳ | – | – |
| R1 Rozwojowe 1 | 1.16.0 | – | ⏳ | – | – |
| R2 Rozwojowe 2 | 1.17.0 | – | ⏳ | – | – |

### Do Twojej decyzji
- **Rekordy z atrybutem „tylko do odczytu”** (np. po przywróceniu kopii): zapis takiego rekordu pada (EPERM, 8 prób), nic nie
  ginie. Propozycja: wykrywać przy otwarciu folderu i dać przycisk „Zdejmij blokadę” w Synchronizacji (jawnie, za
  zgodą); alternatywy: zdejmować po cichu przy zapisie albo tylko czytelny komunikat. Bez Twojej zgody nic nie zmieniam.

### Do potwierdzenia (zasada wątpliwości, D101 pkt 4)
Zachowanie widoczne dla Ciebie, którego nie rozstrzygały D99 i D100 – wybrany wariant rekomendowany; możesz go odwrócić.

| Grupa | Sprawa | Wybrany wariant | Gdzie |
| --- | --- | --- | --- |
| N1 | Zmiany w trakcie niedostępności folderu | folder tylko do odczytu jak dotąd: nowe zmiany odrzucane z komunikatem, czekają tylko przyjęte wcześniej (inaczej: przyjmować w pamięci) | T315 |
| N1 | Szybki wpis tuż przed wykryciem braku folderu | „Wpis przyjęty, ale jeszcze niezapisany…”, okno zostaje 4 s | T317 |
| N1 | Pytanie „Zmienić operację?” poza edytorem | z nazwą operacji (pojawia się też na innym ekranie) | T319 |
| N1 | Odpowiedzi kreatora w toku | na tym komputerze, osobno dla folderu; baner „Kreator startu jest w toku (krok N z 7)” | T319 |
| N1 | Ten sam numer rachunku na innym koncie | wiersz pokazany, domyślnie nie przenoszony | T321 |
| N1 | „Usuń duplikat” w imporcie naprawczym | zaznaczone, gdy kopia przyszła z importu bez innej decyzji; zadokowana, spłacana przez domownika, spłacająca inne zakupy albo tylko do odczytu – nigdy (z powodem) | T321 |
| N1 | Kilka kont z numerem pliku | wygrywa konto z importem mBanku | T322 |
| N1 | Rozpoznanie a reguła | słowo z tytułu i reguła przelewu własnego mają pierwszeństwo; domownik będący pożyczkobiorcą – wygrywa pożyczka; pożyczka wygrywa z regułą tylko od dnia jej udzielenia | T325 |
| N1 | „w tym za X” | część wiersza może przekroczyć dług, część grupy / tematu – nigdy (licząc zakupy i własne wpłaty X z pliku); wpłata ≥ cały dług spłaca wszystkie zakupy | T327–T329 |
| N1 | Temat z jednakową decyzją kilku marek z „w tym za” | wiersz tematu bez edytora części: „w tym za – ustawione w markach”; zmiana w temacie trafia do każdej marki, kwoty marek bez zmian | T336 |
| N2 | Ostrzeżenie przy przenoszeniu do celu | także gdy przeniesienie przekracza brakującą kwotę (nie tylko przy pełnym celu), z „tylko brakujące”; nigdy nie blokuje | T340 |
| N2 | Para do zadokowania | liczona według puli także dla bliskich kwot (B22) i wpływów wpisanych na Portfelu XTB (B69); komputer bez odczytu ICTTJ i telefon liczą zwykłą kolejnością do dokowania | T341 |
| N2 | Opłata zapłacona przed startem | w miesiącu startu odkłada 0 zł, następny cykl od kolejnego miesiąca; każda połączona płatność sprzed startu zamyka swój cykl | T345 |
| N2 | Pensja 0 zł | alarm tylko w Planie (bez Mostka i odprawy); prognoza zakłada pełną pensję co miesiąc | T346 |
| N2 | „Wycofaj dokowanie” i kategorie | bez okna potwierdzenia, tylko „Cofnij” 8 s; usunięcie kategorii głównej zabiera nieużywane podkategorie; koperta 0 zł liczy się jako „w użyciu” | T360, T361 |
| N2 | Wpłata domownika | reguła nie zapisuje reszty – reszta zawsze z ustawienia osoby (istniejące reguły spłaty dla osób z ustawieniem „zaliczka” wysyłają resztę do depozytu); niezależny przychód wskazujący zakup też go spłaca; zmiana opcji tej samej osoby zachowuje linie „w tym za” i pożyczki | T350, T351 |
| N2 | Meldunek „Zaliczki przy długu” | pyta tylko o dług nadal do oddania przez zaliczkę, także o zaliczki wybrane świadomie; „zostaw” raz na wpłatę | T352 |
| N2 | Spłata pożyczki dowolną wpłatą | „kto zapłacił” tylko, gdy płacił ktoś inny (wtedy wszyscy płacący); „zapamiętaj” domyślnie wyłączone; cała spłata z szybkiego wpisu zapisana jako wpływ z częścią pożyczki; część z reguły – na każdą wpłatę, suma dla kilku wpłat nie trafia do reguły | T355–T359, T368 |
| N1 | Audyt reguł | tylko wskazuje operacje do poprawy, bez naprawy jednym kliknięciem; stare błędne operacje sprzed 1.15.5 – ręcznie | T326 |

## N2 – Silnik pieniędzy (1.15.6, 04.11.2026)
- **Zakres:** AP-3 przeniesienie środków celu w chwili zapisu (T340, zastępuje „na koniec dnia” z T129), AP-12 dostawy
  według puli przed dokowaniem (T341, T342, T363), AP-5 płatność sprzed startu (T345), AP-11 plan = silnik (T346, T347),
  AP-9 „Wycofaj dokowanie”, usuwanie kategorii, N-PC-4 i N-PC-14 (T360–T362), AP-4 „reszta jako zaliczka” najpierw spłaca
  i naprawa przy odczycie (T350–T354), D100 wpłata od dowolnej osoby spłaca pożyczkę (T355–T359, T368), AP-32 wyrocznia
  jako regresja (T367), AF-5 – odsetki od pożyczki jako przychód (T70, poprawka po przeglądzie), drobne po N1 (N2-h).
- **Wykonawcy:** 3 strumienie równolegle w osobnych drzewach (warstwy i cele; opłaty i plan, potem AP-9; rozliczenia –
  AP-4, potem D100), wszystkie Opus · max poza AP-9 i drobnymi (xhigh); scalenie konfliktów importu (max), AP-32 (max).
- **Przegląd:** xhigh na części 1 (14 uwag) i części 2 (14 + AF-5) – wszystkie poprawione z testem, który przed
  poprawką padał (1 częściowo odrzucona: fragment Ładowni nieosiągalny dla kontenera pożyczki); high na poprawkach – bez
  pewnych błędów, 6 drobnych poprawionych. Najpoważniejsze: „Zadokuj” przesuwał pieniądze po przeniesieniu środków celu,
  spóźniona płatność sprzed startu zamykała następny cykl, „Spłać” w meldunku rozliczał historię od nowa (dług 50 → 150 zł),
  część pożyczki z reguły stawała się sumą grupy.
- **Wyrocznia:** `npm run test:wyrocznia` (lokalnie, migawki `C:\FI-audyt`, ok. 2 min) – 412 przypadków, 28 963 kwoty,
  2 852 porównania ekranów zgodne z aplikacją; znane: AF-15 (termin asteroidy w odprawie – naprawia N3), zbiornik po końcu
  życia opłaty (bez różnicy w pieniądzach).
- **Testy:** typecheck (także `typecheck:audyt`), `npm test` ok. 1265, build, E2E komputera 89 (lokalnie pada tylko
  `ictj.spec.ts`), telefonu 10/10.
- **Otwarte:** audyt reguł nie oznacza reguły z zamkniętą pożyczką; telefon pokazuje „pożyczka” zamiast nazwy; eksport
  bez kolumny części pożyczki; edytor operacji nadal „depozyt na przyszłość”; zbiorcza decyzja tej samej osoby kasuje linie
  „w tym za”; operacje z ukrytym `containerId` bez migracji; wyrocznia – pary przychodu w toku bez części domownika
  i pożyczki (lab ich nie ma).
- **Czas:** 05:05–ok. 13:00 do PR (strumienie 55–100 min, scalenia i przeglądy, 3 rundy poprawek) – plan 3–4,5 h pracy;
  zegar dłuższy przez rundy przeglądu i scalenia równoległych gałęzi.

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
