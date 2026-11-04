# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary: do 1.15.4 –
`docs/archiwum/postep-do-1.15.md`, audyt 1.15.4 i grupy po nim – `docs/archiwum/postep-od-1.15.4.md` (Grep po wersji,
grupie albo identyfikatorze). Po wydaniu wpisy grupy przenoś do archiwum – tutaj zostaje stan (≤ 400 linii, sprawdza CI).
Odwołania „`docs/postep.md` „…”” w starszych dokumentach i komentarzach (sekcje do 1.15.1 i audyt) prowadzą do archiwum.

**Stan:** **1.15.4 wydane** (25.10.2026). Audyt funkcjonalny 1.15.4 (D97) zakończony 03.11 – 80 znalezisk, 48 AP,
plan N1–N5 (`docs/audyt/raport.md`, `docs/audyt/wnioski.md`; przebieg w archiwum). Odpowiedzi 04.11: D98 (iPhone
wstrzymany), D99 (wnioski przyjęte, S4), D100 (konto Gotówka, wpłata od dowolnej osoby spłaca pożyczkę), D101 (ciąg
N1–R2 bez pauz, bez kart kredytowych, wydanie po każdej grupie, zasada wątpliwości).
**Następny krok:** ciąg N1 → N2 → N3 → N4 → N5 → R1 → R2 (D101) **przerwany 04.11 ok. 14:00** – po wznowieniu zacznij od
sekcji „WZNOWIENIE” niżej. Otwarte poza ciągiem: raport maszyny wirtualnej i lista „Tylko Ty” (`docs/audyt/ty.md`) – dopiszą się
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
| N2 Silnik pieniędzy | 1.15.6 | `claude/1.15.6-silnik` | ✅ wydane 04.11 13:06 (wpis niżej – do archiwum przy PR N3) | #51 | ok. 8 h zegara (05:05–13:06) |
| N3 Opłaty, energia, gra | 1.15.7 | `claude/1.15.7-oplaty` | 🔄 kod gotowy (z N2), wyrocznia bez rozbieżności; zostały przegląd poprawek, wydanie | – | – |
| N4 Zasady interfejsu | 1.15.8 | `claude/1.15.8-interfejs` | 🔄 kod gotowy; 10 uwag przeglądu do poprawy | – | – |
| N5 Ścieżki i ergonomia | 1.15.9 | `claude/1.15.9-n5*` | 🔄 6 z 13 AP gotowe, 2 WIP, reszta nie zaczęta | – | – |
| R1 Rozwojowe 1 | 1.16.0 | – | ⏳ | – | – |
| R2 Rozwojowe 2 | 1.17.0 | – | ⏳ | – | – |

## WZNOWIENIE – przerwane 04.11.2026 ok. 14:00 (na prośbę użytkownika)

Po wznowieniu przeczytaj tę sekcję, potem notatki koordynatora w `C:\CC-Projekty\FI-wt\_notatki\` (poza repozytorium:
`notatki-n1.md` … `notatki-n5.md` – raporty podagentów, linie CHANGELOG, „do potwierdzenia”, otwarte; `n*-review*.md` –
uwagi przeglądów; `ap32-wyrocznia.md`). Drzewa robocze z `node_modules` / `.tools` jako junction do tego repozytorium –
**przed `git worktree remove` usuń same łącza** (`[System.IO.Directory]::Delete(<łącze>, $false)`; `.claude/rules/testy.md`).

**Wydane:** 1.15.5 (N1, PR #50) i 1.15.6 (N2, PR #51, w tym D100 – spłata pożyczki dowolną wpłatą). Główny katalog jest na
gałęzi N3 `claude/1.15.7-oplaty`.

**N3 (1.15.7) – kod gotowy, gałąź `claude/1.15.7-oplaty` (ten katalog), wypchnięta.** Zawiera N2 (scalone), AP-10, 13, 14,
17, 18, 30, 31, integrację (T370–T394), poprawki po przeglądzie xhigh (15 uwag), jedną regułę płatność ↔ cykl opłaty
(`feeDuesOf`, `paymentsIndex` – T393/T394) i wyrocznię bez rozbieżności (412 przypadków, AF-15 zamknięte). Testy: npm test
1392, E2E zielone. **Dalej:** (1) `/code-review` high na poprawkach: commity 54a189c, cb8ee7b, dd2d47d (rozwiązanie
konfliktów), 8c8a9e3, a4a67e3 – przerwany przed startem; (2) poprawki; (3) wersja 1.15.7, CHANGELOG (linie
w `_notatki/notatki-n3.md`), tutaj: wpis N2 do archiwum, wpis N3, wiersze N3 do „Do potwierdzenia”; (4) PR, CI, scalenie,
wydanie.

**N4 (1.15.8) – kod gotowy, gałąź `claude/1.15.8-interfejs` (drzewo `C:\CC-Projekty\FI-wt\n4a`), wypchnięta.** AP-15, AP-22,
AP-16, AP-23 (T400–T409); baza: N3 sprzed scalenia z N2. Przegląd high zrobiony – **10 uwag niepoprawionych**
(`_notatki/n4-review1.md`; m.in. literówka `/s+/` w `tagsLost`, „Cofnij import” bez ostrzeżenia o własnych zmianach,
„Cofnij” nazwy banku nadpisuje listę). **Dalej:** po wydaniu N3 scal `claude/1.15.7-oplaty` do N4, popraw 10 uwag (testy),
CHANGELOG (linie w `_notatki/notatki-n4.md`), PR, wydanie.

**N5 (1.15.9) – w toku, gałęzie lokalne (niewypchnięte):**
- `claude/1.15.9-n5a` (wypchnięta; baza `main` = 1.15.6) – ✅ AP-21, AP-36, AP-33 (T420–T423).
- `claude/1.15.9-n5b` (drzewo `FI-wt\n5b`; baza `main`) – ✅ AP-29, AP-37, AP-38 (T425–T429); **WIP** AP-27, AP-28
  (commit 72415b0, przerwany, niesprawdzony – dokończyć albo zacząć od nowa; T430–T434).
- `claude/1.15.9-n5d` (drzewo `FI-wt\n5d`; baza N4) – AP-19, AP-26 nie zaczęte (T435–T439).
- `claude/1.15.9-n5e` (drzewo `FI-wt\n5e`; baza N4) – AP-20, AP-34 nie zaczęte (T440–T444).
- `claude/1.15.9-n5f` (drzewo `FI-wt\n5f`; baza N4) – **WIP** AP-25 (commit a3e8614, tylko `start.ts`, niesprawdzony);
  AP-24 nie zaczęte (T445–T449).
**Dalej:** dokończyć AP-27/28, AP-19/26, AP-20/34, AP-24/25 (polecenia zleceń jak dotąd – opis w `_notatki/notatki-n5.md`),
scalić wszystkie gałęzie N5 na bazie N4 po jego wydaniu, przegląd high, poprawki, wydanie.

**R1 (1.16.0), R2 (1.17.0)** – nie zaczęte (zakres w kolejce niżej; R2 bez karty kredytowej – D101).

**Lekcje z ciągu:** równolegle najwyżej 4–5 podagentów (więcej – zbyt wolne E2E i niestabilności); jeden przegląd xhigh
całości + jeden high na poprawkach, dalej tylko przy poważnych uwagach; numery T przydzielaj podagentom z góry.

### Do Twojej decyzji
- **Rekordy z atrybutem „tylko do odczytu”** (np. po przywróceniu kopii): zapis takiego rekordu pada (EPERM, 8 prób), nic nie
  ginie. Propozycja: wykrywać przy otwarciu folderu i dać przycisk „Zdejmij blokadę” w Synchronizacji (jawnie, za
  zgodą); alternatywy: zdejmować po cichu przy zapisie albo tylko czytelny komunikat. Bez Twojej zgody nic nie zmieniam.

### Do potwierdzenia (zasada wątpliwości, D101 pkt 4)
Zachowanie widoczne dla Ciebie, którego nie rozstrzygały D99 i D100 – wybrany wariant rekomendowany; możesz go odwrócić.

| Grupa | Sprawa | Wybrany wariant | Gdzie |
| --- | --- | --- | --- |
| N3 | Opłata zapłacona z celu albo zakupem do zwrotu | zapłacona w Ładowni i silniku – cykl zamknięty, zbiornik nietknięty (zebrane zostaje na następny termin), zwrot domownika to spłata długu; dawny przelew z ukrytym kontenerem nie płaci nigdzie | T393 |
| N3 | Zaległe opłaty | liczone od startu budżetu albo miesiąca dodania kontenera – po aktualizacji stare luki w historii pojawią się od razu („Zapłacone poza budżetem” je czyści); opłata ustawiona jako miesięczna, a płacona co 2 miesiące, pokaże pominięte miesiące; płatność przed dniem następnego terminu idzie najpierw na zaległy | T375, T376 |
| N3 | Boje i pole „Płatność” | boja zamyka się tylko operacją z jej nazwą; pole „Płatność” pokazuje następny termin; silnik trzyma w zbiorniku pieniądze na niezapłacony cykl (tylko notka) | T376, T378 |
| N3 | Energia dziś przy pensji częściowej | dopiski „pensja częściowa”, „bez pensji w tym miesiącu”, „nie więcej niż zostało w miesiącu”; zwrot wcześniejszego zakupu nic nie daje dziś, zwrot tego samego dnia znosi zakup tej samej kategorii głównej (nie sklepu) | T370, T371 |
| N3 | Kadłub od 99 % | „Dopełnij kadłub z osłon” widoczny zawsze, gdy kadłubowi brakuje, a osłony mają nadwyżkę (także w 1 %), bez automatycznego dopełniania; raty celów i dokowanie nadal wymagają 100 % kadłuba; „Pokryj z koperty” domyślnie z koperty z największą rezerwą; linia „firewall wyłączony” na Mostku stale, póki rozkaz wyłączony | T372–T374 |
| N3 | Zamrażanie dni po przerwie | pytanie, gdy import spóźniony > 3 dni (inaczej 7); „Zamroź bez danych” wstrzymuje pytanie do następnego importu, na tym komputerze; konto nigdy nieimportowane niczego nie wstrzymuje; dni czekają najwyżej 7 dni od pierwszego pytania; misja tygodnia czeka razem z dniami luki | T380, T381 |
| N3 | Misje | nazwa „Zaciemnienie” (inaczej „Nocna wachta”); „Dziś bez wydatków” przy wydatku z dziś zapisuje i ostrzega, nie odmawia; „Inwentaryzacja” liczona po chwili zapisu potwierdzenia (ponowne potwierdzenie tego samego salda też się liczy) | T383 |
| N3 | Kurs i symulator | brak nie przechodzi na następny miesiąc: osłony kończą na 0, kurs pokazuje „Brakuje na koszty” jako sumę 12 mies.; „Zasięg po resztce miesiąca” tylko, gdy różni się od „teraz”, i zakłada, że spóźnione spłaty pożyczek wrócą w tym miesiącu; wszystko pełne – „teraz” (także cele) | T385–T387 |
| N3 | Trend poduszki | koniec miesiąca tylko dla zakończonych miesięcy; w Wywiadzie pod „Bilans paliwa”, linia „rosną w N z M mies.”; przy ukrytych kwotach zmiana w zł bez znaku i strzałki, zmiana zasięgu widoczna | T388 |
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
