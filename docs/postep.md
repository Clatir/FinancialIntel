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
| N2 Silnik pieniędzy | 1.15.6 | `claude/1.15.6-silnik` | ✅ wydane 04.11 13:06 (wpis w archiwum `postep-od-1.15.4.md`) | #51 | ok. 8 h zegara (05:05–13:06) |
| N3 Opłaty, energia, gra | 1.15.7 | `claude/1.15.7-oplaty` | ✅ wydane 04.11 18:02 (wpis w archiwum `postep-od-1.15.4.md`) | #52 | ok. 10,5 h zegara (07:15–18:02, z przerwą 14:00–14:20) |
| N4 Zasady interfejsu | 1.15.8 | `claude/1.15.8-interfejs` | ✅ wydane 04.11 21:40 (wpis w archiwum `postep-od-1.15.4.md`) | #53 | ok. 9 h zegara (12:09–21:40, z przerwą) |
| N5 Ścieżki i ergonomia | 1.15.9 | `claude/1.15.9-sciezki` | 🔄 przegląd xhigh + 3 rundy poprawione; PR, CI, wydanie | – | – |
| R1 Rozwojowe 1 | 1.16.0 | – | ⏳ | – | – |
| R2 Rozwojowe 2 | 1.17.0 | – | ⏳ | – | – |

## Stan ciągu (wznowione 04.11.2026 ok. 14:20 po przerwie na prośbę użytkownika)

Notatki koordynatora poza repozytorium: `C:\CC-Projekty\FI-wt\_notatki\` (`notatki-n1.md` … `notatki-n5.md` – raporty
podagentów, linie CHANGELOG, „do potwierdzenia”, otwarte; `n*-review*.md` – uwagi przeglądów). Drzewa robocze z
`node_modules` / `.tools` jako junction do tego repozytorium – **przed `git worktree remove` usuń same łącza**
(`[System.IO.Directory]::Delete(<łącze>, $false)`; `.claude/rules/testy.md`). Po przerwie: `git worktree list`, ten plik,
notatki, dalej od pierwszej grupy niewydanej.

- **N3 (1.15.7)** – ✅ wydane 04.11 18:02 (PR #52).
- **N4 (1.15.8)** – ✅ wydane 04.11 21:40 (PR #53).
- **N5 (1.15.9)** – gałąź integracji `claude/1.15.9-sciezki` (drzewo `FI-wt\n5`): wszystkie gałęzie N5 i N4 scalone, wersja
  i CHANGELOG (eab4d36); przegląd xhigh – 11 uwag (`_notatki/n5-review1.md`) w poprawce w `claude/1.15.9-fixa` (`FI-wt\n5b`)
  i `claude/1.15.9-fixb` (`FI-wt\n5d`); potem scalenie, PR, CI, wydanie.
- **R1 (1.16.0), R2 (1.17.0)** – nie zaczęte (zakres w kolejce niżej; R2 bez karty kredytowej – D101).

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
| N5 | Start budżetu (KR.29) | najpierw `fi.json` ze startem, potem salda, plan i kontenery; odmowa – nic w folderze, ponowne kliknięcie od nowa; niedokończony start – baner „Start budżetu niedokończony – Dokończ” (tylko brakujące rekordy, bez „Pomiń”; do tego czasu gra, cele ICTTJ i rozliczenia czekają; per komputer); wolny folder > 15 s – toast i czekanie; osłony poniżej minimum kolorem akcentu | T445, T446 |
| N5 | Autostart i ustawienia komputera | start nigdy nie usuwa wpisu autostartu (wpis z wersji sprzed poprawki albo drugiej kopii przy „wyłączone” zostaje, dopóki nie przełączysz w tej kopii); przełącznik pokazuje prawdziwy wpis z notką; przy zajętym `config.json` przełącznik zostaje w nowym położeniu z komunikatem „działa, zapis ponawia się”; folder ICTTJ, program, token, folder kopii i aktualizacje – „zmiana nie została zapamiętana” | T433, T434 |
| N5 | Konflikty – decyzje | „Zaakceptuj nowsze” według kart; przy nowszej kopii i świeżych zmianach oryginału grupa zostaje dla Ciebie z komunikatem; zachowanie oryginału przy oryginale zmienionym z zewnątrz zatrzymuje go w nowej postaci | T431 |
| N5 | Eksport „Miesiące” | przychody i koszty miesiąca w toku do dziś; kolumny „Zaplanowane koszty” i „Zaplanowane przychody – data po dziś” (w zakończonych 0,00) | T421 |
| N5 | Konto Gotówka | dawne wypłaty z bankomatu (wydatek „Gotówka”) bez konwersji – saldo Gotówki wyrównasz jednym potwierdzeniem salda; reguła „wydatek Gotówka” ustępuje przelewowi, gdy jest konto Gotówka; tag zachowuje pierwszą pisownię jako nazwę; pasek sum Operacji liczy też wiersze z przyszłą datą | T420–T423 |
| N5 | Eksport | „Części” ma wiersz dla każdej operacji (jedna tabela przestawna); daty w Excelu jako rrrr-mm-dd jak w CSV; okres eksportu zapamiętany na tym komputerze; części ponad sumę z resztą 0 zł; odrzucony podział nie jest „niezapisany” przy zamknięciu; „Części – CSV” w pustym okresie – komunikat zamiast pliku | T425–T428 |
| N5 | Nowy komputer i konflikty | lista „Ustaw na tym komputerze” tylko po pierwszym otwarciu wystartowanego budżetu na komputerze bez folderu, do „Gotowe” albo ×; „Zachowaj tę wersję” też odmawia przy zmianie pliku; 15 najnowszych sekcji CHANGELOG w oknie „Co nowego”; słowa „wersja niezachowana”, „pożyczona komuś” | T430–T434 |
| N5 | Konto nowego wpisu | najpierw konto ostatniego wpisu ręcznego w folderze (bez operacji zakładanych przez aplikację), potem wybór tego komputera, potem pierwsze konto | T441 |
| N5 | Dokowanie | wpis z pierwszych dni bez historii banku przed startem nigdy sam nie staje się „Portfel XTB?”; potwierdzenie dopłaty zapisuje rekord dokowania bez wpisu ICTTJ, meldunek 30 dni, naruszenie w grze zostaje, telefon bez meldunku; „dostawa” to tylko wypłata z XTB; para na Portfelu XTB (B69) tylko w „Do zadokowania”, po „Zadokuj” – ostatnią dostawą | T435–T438 |
| N5 | Domownicy | zakup z pieniędzy celu nadal pyta „plan czy impuls?”; edytor Operacji z „pytaj” zapisuje od razu – do wyboru reszta jako przychód; w dzienniku zakup samego domownika nie liczy się wcale | T439 |
| N5 | Szybki wpis i Operacje | Alt+P / Alt+I zamiast „plan / impuls” pod kwotą; edytor wydatku: Data, Konto, Tytuł pod Kategorią; pamiętane tylko „cała historia” i „od – do”; Ctrl+N zostawia wyszukiwanie, inne filtry zdejmuje; czytelna wielkość liter tylko w podpowiedziach i Namierzonych celach; aliasy tylko ręcznie; Wywiad – 12 najnowszych wpisów dziennika | T440–T444 |
| N5 | Kreator | propozycje kopert maleją proporcjonalnie do 10 zł (propozycja pensji D70 bez zmian); podpowiedź kopert codziennych – tylko tekst; opłata sezonowa (ogrzewanie X–IV) nie jest proponowana jako harmonogram; rachunek zmienny tylko co 2 mies.; przed kreatorem w Meldunkach tylko sprawy folderu | T445–T447 |
| N5 | Debriefing i przegląd roczny | przypomnienie roczne osobnym przełącznikiem, domyślnie włączone; tydzień w toku nie do otwarcia przed niedzielą 18:00; debriefing miesiąca w toku bez stopy oszczędności; „Zaplanowane” w przeglądzie rocznym tylko przy miesiącu z historią | T448, T449 |
| N4 | Odmowy i „Cofnij” | zamiana „od” / „do” z komunikatem zamiast odmowy; 0 zł zapisywane z ostrzeżeniem; „Cofnij” najmniej 8 s, licznik długości od 80 %; usunięcie tokenu i przeniesienie do Kosza pytają; przełącznik scenariusza ICTTJ zostaje z banerem | T400–T402 |
| N4 | Odprawa z hierarchią | „sprawy dnia” i najwyżej 8 linii; inne powiadomienia czekają na odprawę do 09:00 (albo jej godziny, najpóźniej 12:00); 3 i więcej naraz = jedno, klik otwiera Mostek; progi gry przeniesione do Ustawień; z ustawioną godziną wcześniejsze otwarcie nie wysyła odprawy, wybór opcji ustawia 07:00 | T405–T409 |
| N4 | Poranny dotyk | okno zostawione na noc przechodzi na Mostek przy pierwszym dotyku po co najmniej 30 min bez dotyku | T411 |
| N4 | Teksty | zoom do siatki 10 %; inflacja i drill bez wymuszonego jednego miejsca po przecinku; cisza nocna „od = do” przyjmowana z komunikatem (wyłączona) | T403, T404 |
| N4 | Szybki wpis – słowa pól | informacja o przyjętej, ale zmienionej wartości dopisana do „Zapisano” (okno czeka 4 s), tylko z tego samego działania | T413, T417 |
| N4 | Nazwy w banku | nazwa, którą import przypisałby innemu domownikowi (także zawierająca jego nazwę – „JAN KOWALSKI SENIOR” przy „JAN KOWALSKI”), nie wraca po „Cofnij” i nie da się jej dopisać (komunikat); „+ domownik” nie pojawia się dla takiej nazwy; najwyżej 20 nazw | T414, T416 |
| N4 | „Cofnij import” i eksport | operacja przywrócona przez cofnięcie i zmieniona przez Ciebie zostaje po „Cofnij”; ponowienie cofniętego importu po późniejszym imporcie odmawiane w całości (nie część wierszy); pusty Excel – „Brak operacji i miesięcy w okresie.” | T412, T415 |
| N4 | Meldunek „Zaliczki przy długu” | „Spłać” / „zostaw” na nieaktualnym meldunku – komunikat „nic do zmiany” | T400 |
| N3 | Opłata zapłacona z celu albo zakupem do zwrotu | zapłacona w Ładowni i silniku – cykl zamknięty, zbiornik nietknięty (zebrane zostaje na następny termin), zwrot domownika to spłata długu; dawny przelew z ukrytym kontenerem nie płaci nigdzie | T393 |
| N3 | Zaległe opłaty | liczone od startu budżetu albo miesiąca dodania kontenera – po aktualizacji stare luki w historii pojawią się od razu („Zapłacone poza budżetem” je czyści); opłata ustawiona jako miesięczna, a płacona co 2 miesiące, pokaże pominięte miesiące; płatność przed dniem następnego terminu idzie najpierw na zaległy | T375, T376 |
| N3 | Boje i pole „Płatność” | boja zamyka się tylko operacją z jej nazwą; pole „Płatność” pokazuje następny termin; silnik trzyma w zbiorniku pieniądze na niezapłacony cykl (tylko notka) | T376, T378 |
| N3 | Energia dziś przy pensji częściowej | dopiski „pensja częściowa”, „bez pensji w tym miesiącu”, „nie więcej niż zostało w miesiącu”; zwrot wcześniejszego zakupu nic nie daje dziś, zwrot tego samego dnia znosi zakup tej samej kategorii głównej (nie sklepu) | T370, T371 |
| N3 | Kadłub od 99 % | „Dopełnij kadłub z osłon” widoczny zawsze, gdy kadłubowi brakuje, a osłony mają nadwyżkę (także w 1 %), bez automatycznego dopełniania; raty celów i dokowanie nadal wymagają 100 % kadłuba; „Pokryj z koperty” domyślnie z koperty z największą rezerwą; linia „firewall wyłączony” na Mostku stale, póki rozkaz wyłączony | T372–T374 |
| N3 | Zamrażanie dni po przerwie | pytanie, gdy import spóźniony > 3 dni (inaczej 7); „Zamroź bez danych” wstrzymuje pytanie do następnego importu, na tym komputerze; konto nigdy nieimportowane niczego nie wstrzymuje; dni czekają najwyżej 7 dni od pierwszego pytania; misja tygodnia czeka razem z dniami luki | T380, T381 |
| N3 | Misje | nazwa „Zaciemnienie” (inaczej „Nocna wachta”); „Dziś bez wydatków” przy wydatku z dziś zapisuje i ostrzega, nie odmawia; „Inwentaryzacja” liczona po chwili zapisu potwierdzenia (ponowne potwierdzenie tego samego salda też się liczy) | T383 |
| N3 | Kurs i symulator | brak nie przechodzi na następny miesiąc: osłony kończą na 0, kurs pokazuje „Brakuje na koszty” jako sumę 12 mies.; „Zasięg po resztce miesiąca” tylko, gdy różni się od „teraz”, i zakłada, że spóźnione spłaty pożyczek wrócą w tym miesiącu; wszystko pełne – „teraz” (także cele) | T385–T387 |
| N3 | Trend poduszki | koniec miesiąca tylko dla zakończonych miesięcy; w Wywiadzie pod „Bilans paliwa”, linia „rosną w N z M mies.”; przy ukrytych kwotach zmiana w zł bez znaku i strzałki, zmiana zasięgu widoczna | T388 |
| N3 | Opłata zapłacona wydatkiem z datą po dziś | płaci termin dopiero w dniu płatności; do tego czasu Ładownia „zaplanowane dd.mm” bez „Zapłacone (dziś)”, odprawa bez alertu (także po 3 dniach łaski), Radar bez tego terminu | T398 |
| N3 | Termin zapłacony wpisem naprzód | znika z Radaru i z „Płatność” w Ładowni (kolejne miesiące też); „Zapłacone (dziś)” nie ma, gdy dzisiejsza płatność zamknęłaby termin tylko przez przesunięcie | T398 |
| N3 | Potwierdzenia salda w „Inwentaryzacji” | dzień potwierdzenia = późniejszy z chwili potwierdzenia i dnia salda; zapisane przed 1.15.7 – po dniu salda, jak w 1.15.6 (import z tygodnia aktualizacji z saldem z niedzieli nie zalicza tygodnia) | T383 |
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

## N5 – Ścieżki i ergonomia (1.15.9, 04–05.11.2026)
- **Zakres:** AP-21 tagi, AP-33 konto Gotówka, AP-36 koszty do dziś (T420–T423), AP-29 eksport części, AP-37 procenty,
  AP-38 podgląd zmian zbiorczych (T425–T429), AP-27 konflikty, AP-28 nowy komputer i autostart (T430–T434), AP-19
  domownicy, AP-26 dokowanie (T435–T439), AP-20 szybki wpis, AP-34 Operacje i klawiatura (T440–T444), AP-25 kreator,
  AP-24 debriefing i przegląd roczny, KR.29 start budżetu (T445–T449).
- **Wykonawcy:** 6 gałęzi (n5a, n5b, n5d, n5e, n5f – dwie dokończone z WIP po przerwie), Opus xhigh / high; integracja
  w dwóch częściach (gałęzie na N4, potem N4 z N2/N3 i gałęzie na `main` – Opus max); poprawki w dwóch strumieniach
  równolegle (`config.json` / konflikty – xhigh; kreator / dokowanie / eksport – max).
- **Przegląd:** xhigh całości (11 uwag), high na poprawkach w trzech rundach (9, 10, 10 uwag). Najpoważniejsze:
  autostart wyłączany albo usuwany wbrew ustawieniu przy zajętym lub uszkodzonym `config.json`, „Zachowaj nowsze”
  wyrzucające niewidzianą wersję, potwierdzenie dopłaty zmieniające kolejność w silniku, odrzucony start budżetu
  zostawiający salda i plan. Mechanizm wycofania startu po trzech rundach zastąpiony odwróceniem kolejności zapisów
  (najpierw `fi.json`, T446) – wszystkie poprawione z testem, który przed poprawką padał; ostatnia runda sprawdzona przez
  koordynatora na diffie.
- **Testy:** typecheck (+ `typecheck:audyt`), `npm test` 1686 (pod obciążeniem pada tylko `folder-speed` ZIP64), build,
  E2E komputera 122/123 (lokalnie `ictj.spec`), telefonu 10/10, wyrocznia bez rozbieżności.
- **Otwarte:** „Co nowego” po aktualizacji z ≤ 1.15.2 pokaże stare sekcje z kodami D…; DM sp. 4 (na który zakup poszła
  zaliczka); SW.26, IM sp. 6–8, IN sp. 1, OP.20, OP.42, OP.10, ME sp. 4; PM sp. 2, AF-54, WY.14 (poza wierszami AP);
  wyrocznia bez `countedFrom` (T363); do sprawdzenia w maszynie – autostart instalator / portable, klucz Run, blokada
  `config.json` (FileShare.None), „Co nowego” offline po aktualizacji instalatorem, „nowy komputer” na prawdziwym
  OneDrive, powiadomienie o starych wpisach przy pierwszym wyborze folderu ICTTJ.
- **Czas:** 12:45–ok. 14:00 pierwsze gałęzie, 14:20–ok. 03:00 dokończenie, integracja, cztery rundy przeglądu, wydanie –
  plan 3–4,5 h pracy; zegar dłuższy przez 6 gałęzi na dwóch bazach i rundy poprawek w obszarze startu budżetu.

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
