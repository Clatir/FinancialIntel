# Financial Intel – decyzje

Decyzje użytkownika (D) z wywiadu i rund pomocniczych 15–16.10.2026 oraz decyzje techniczne (T) podjęte przez Claude.
Decyzji D nie zmieniaj bez pytania; nowe decyzje dopisuj na końcu z datą.

## Decyzje użytkownika

### Zakres i granica
- **D1** Nazwa: Financial Intel. Okręt nazywa użytkownik, domyślnie „Flagowiec”.
- **D2** Windows 11, kilka komputerów (nigdy jednocześnie), synchronizacja przez OneDrive. Bez wersji na iPhone'a.
- **D3** Zakres: budżet prywatny. Trading zostaje w ICTTJ. Słowo „firma” nie występuje (trading i „firma” to to samo).
- **D4** Cele aplikacji: spokój przy nieregularnych wypłatach, kontrola codziennych wydatków, budowa poduszki i celów,
  brak niespodzianek z opłatami. Kryteria sukcesu: wszystkie cztery z `specyfikacja.md`.
- **D5** Granica z ICTTJ: ICTTJ prowadzi trading, pule, rezerwę podatkową, wypłaty z XTB, zwroty do masy i prognozę;
  FI – wszystko po wypłacie. FI tylko czyta folder ICTTJ. Wydatki wpisuje się wyłącznie w FI.
- **D6** ICTTJ zostaje bez zmian („kieszeń” pul i realizacja celów w ICTTJ będą ignorowane).
- **D7** ~~Jedno konto tradingowe XTB = jeden okręt bojowy~~ – zastąpione przez D54 (16.10.2026).

### Pieniądze
- **D8** Trading: własne konto w XTB (polski broker, PIT-8C), wypłaty w PLN, nieregularnie. Bez ZUS i bez składek.
  Rezerwa na podatek nie w FI (prowadzi ją ICTTJ).
- **D9** Konta budżetu: mBank (import CSV + szybki wpis), Portfel XTB z kartą (tylko ręcznie, brak eksportu; zasilany
  z konta tradingowego – przelew do portfela to wypłata zapisywana w ICTTJ). Gotówki prawie brak – wypłata
  z bankomatu to wydatek.
- **D10** Podział wirtualny na jednym zbiorze kont (bez osobnych kont na warstwy).
- **D11** Pensja od siebie: stała kwota z bufora 1. dnia miesiąca.
- **D12** Kadłub (fundusz awaryjny): 6 miesięcy kosztów.
- **D13** Kolejność dokowania: osłony → kadłub → cele.
- **D14** Brak w osłonach na pensję: pensja z kadłuba + żółty alarm.
- **D15** Limit wydatków: dzienny przydział + koperty.
- **D16** Do dziennej energii liczą się tylko koperty codzienne; planowe mają limity miesięczne.
- **D17** Przekroczenie: alarm, przeliczenie kolejnych dni, przerwana seria.
- **D18** Niewydane z kopert: decyzja na debriefingu („podział łupów”), bez decyzji w 7 dni → osłony.
- **D19** Cele: kilka naraz z priorytetami; cele z prognozy ICTTJ (tylko odczyt) + własne w FI.
- **D20** Wpłaty domowników: przy każdej wybór (zwrot / przychód); przychód → osłony.
- **D21** Zakupy dla domu: oznaczenie „do zwrotu”, nie zjadają energii; jedna należność od domu (bez osób).
- **D22** Pożyczki prywatne w obie strony.
- **D23** Firewall: dopłata do XTB tylko z nadwyżki ponad pełne osłony i kadłub.
- **D24** Koszty stałe i jednorazowe dodawane w aplikacji (ładownia, odkładki).
- **D25** Kategorie: 8–10 głównych z podkategoriami.

### Codzienność i dane
- **D26** Wydatki poza domem: wieczorne dopisanie + import z mBanku co 2–3 dni.
- **D27** Import: CSV z mBanku + szybki wpis ręczny; na start cała dostępna historia.
- **D28** Edycja: pełna, z dziennikiem zmian.
- **D29** Eksport: CSV / Excel, PDF, pełna kopia danych.
- **D30** Dane bez szyfrowania (czytelne pliki jak ICTTJ); bez blokady; tryb ukrycia kwot.
- **D31** Kopie: automatyczne codzienne, 30 ostatnich (plus przed importem).
- **D32** Tylko jeden użytkownik.

### Wygląd i gra
- **D33** Styl: taki sam jak ICTTJ (makieta D). Kosmos w nazwach, ICT jako warstwa wywiadu (analizy).
- **D34** Nazwy: metafora + prawdziwa nazwa i kwota obok.
- **D35** Grywalizacja pełna: stopnie, klasy okrętu, osiągnięcia, dźwięki i animacje.
- **D36** Degradacja: po 3 poważnych naruszeniach w miesiącu.
- **D37** ~~Konto XTB w metaforze: osobny okręt bojowy we flocie~~ – zastąpione przez D54 (16.10.2026).
- **D38** Tygodniowe misje.
- **D39** Smaczki: „Miesiąc zamknięty na plus”, ukryte osiągnięcia, easter eggi ICT, dużo nawiązań do tradingu i ICT.
- **D40** Cisza nocna z potwierdzeniem.
- **D41** Próg dziennika kapitańskiego („plan czy impuls”): w ustawieniach, domyślnie 200 zł.
- **D42** Animacje przy zdarzeniach; dźwięki do wyboru w ustawieniach.
- **D43** Język: polski.

### Windows i system
- **D44** Układ: mostek z panelami i **menu boczne** (potwierdzone 16.10.2026; inaczej niż pasek u góry w ICTTJ).
- **D45** Kilka monitorów (panele odłączane jak w ICTTJ).
- **D46** Ikona w zasobniku; start z Windows w zasobniku; globalny skrót szybkiego wpisu (do zmiany).
- **D47** Powiadomienia: osobna sekcja z włączaniem i wyłączaniem każdego.
- **D48** Raporty: odprawa poranna, raport wachty, debriefing miesięczny, przegląd roczny. Wykresy: krzywa majątku
  z drawdownem, wydatki per kategoria w czasie, heatmapa godzin i dni, prognoza zasięgu. Bilans tradingu usunięty
  (D57).
- **D49** Odprawa czytana głosem – opcjonalnie.

### Budowa
- **D50** Windows 11; ICTTJ jest w Electronie; build przez GitHub Actions; instalator + auto-aktualizacje.
- **D51** MVP: rdzeń + klimat (E0–E4); małe etapy, każdy kończy się działającym .exe.
- **D52** Automatyczne testy obliczeń; Claude decyduje technicznie, użytkownik testuje.
- **D53** ~~Asystent AI później, jako osobny etap.~~ – zastąpione przez D74 (17.10.2026): bez asystenta AI.

### Punkty styku z ICTTJ (przegląd 16.10.2026)
- **D54** Konto tradingowe (maklerskie) XTB nie jest częścią FI – wyłącznie ICTTJ. Bez okrętu bojowego i bez etapu
  „Okręt bojowy”. Portfel XTB (konto bankowe z kartą) zostaje kontem budżetu.
- **D55** Wypłata z konta tradingowego: FI dowiaduje się z wpisu w ICTTJ i dopasowuje go do mBanku albo Portfela XTB.
  Pula decyduje o miejscu: Cele → cele, Podatek → poza budżetem, reszta → zwykłe dokowanie.
- **D56** Wypłata z ICTTJ bez pary w CSV z mBanku przez 3 dni → Portfel XTB (potwierdzenie przy dokowaniu). Wpływ z XTB
  w mBanku bez wpisu w ICTTJ → dokuje + przypomnienie o wpisie w ICTTJ.
- **D57** Kosztów tradingu nie zakładamy (brak kategorii Trading); bilans tradingu usunięty.
- **D58** Pule i rezerwa ICTTJ w FI: tylko przypomnienie o terminie PIT-38, bez kwoty.
- **D59** Firewall dopłat z budżetu do konta tradingowego zostaje (wykrywany z mBanku i z wpisów ICTTJ).
- **D60** Odczyt folderu ICTTJ automatyczny, z obserwacją zmian; integracja w E5, po wydaniu 1.0; moduły ICTTJ
  kopiowane i dostosowane; przycisk „Otwórz ICTTJ” w FI.

### Przed etapem E0 (16.10.2026)
- **D61** Repozytorium `Clatir/FinancialIntel` zostaje **publiczne** (zastępuje „prywatne” w T13 i w specyfikacji).
  Aktualizacje działają bez tokena; pole tokena w Ustawieniach → Aktualizacje zostaje na wypadek zmiany na prywatne.
  Danych użytkownika nigdy nie ma w repozytorium (pliki przykładowe tylko zanonimizowane, `tests/fixtures/`).
- **D62** Domyślny folder danych: `%OneDrive%\FinancialIntel` (bez OneDrive: `Dokumenty\FinancialIntel`), pokazany przy
  pierwszym uruchomieniu jako propozycja „jednym kliknięciem”; można wskazać inny folder albo istniejący.
- **D63** Praca etapami na gałęzi i PR do `main`; wersje: E0 = 0.1.0, E1 = 0.2.0 … E4 = 1.0.0, każda jako zwykłe wydanie
  (aktualizacja między etapami działa sama).
- **D64** Zamknięcie okna (X) chowa aplikację do zasobnika (powiadomienia w tle), „Zakończ” w menu ikony; przy pierwszym
  ukryciu dymek. Start z Windows: przełącznik w ustawieniach, domyślnie wyłączony – włącza go kreator startu (E3).
- **D65** Menu boczne pokazuje wszystkie ekrany; ekrany po wydaniu 1.0 (E5+) przygaszone z dopiskiem etapu.
- **D66** Ikona generowana skryptem (`scripts/make-icon.mjs`): radar i okręt w kolorze akcentu `#e8a33d` na `#0b0d10`.
- **D67** (16.10.2026) Po każdym kroku zaktualizowana tabela postępu z modelem i thinking z górką i szacowanym czasem
  pracy Claude'a; bez komendy użytkownika nie zaczyna się kolejnego etapu; etapy, które mogą iść jednym ciągiem, są
  zgrupowane (A: E1 [+ E2], B: E3 + E4, C: E5 + E6, D: E7 + E8, E: E9) – w grupie bez pauzy, jeden PR i jedno wydanie.

### Przed etapem E1 (17.10.2026)
- **D68** Odpowiedzi na „Przed etapem E1” (wszystko zgodnie z propozycją):
  - kategorie startowe: Jedzenie (zakupy spożywcze, na mieście, kawa i przekąski), Dom (czynsz i opłaty, media,
    wyposażenie, chemia), Auto (paliwo, serwis, ubezpieczenie, parking i opłaty), Zwierzęta (karma, weterynarz,
    akcesoria), Zdrowie (leki, lekarz, sport), Rozrywka i hobby (wyjścia, hobby, podróże), Subskrypcje i łączność
    (telefon, internet, streaming, aplikacje), Osobiste (ubrania, kosmetyki, fryzjer), Prezenty i inne (prezenty,
    inne) + systemowa „Gotówka” (wypłata z bankomatu); codzienne: Jedzenie, Rozrywka i hobby, Osobiste, Gotówka;
  - konta startowe: mBank i Portfel XTB (nazwy do zmiany), saldo otwarcia z datą w Ustawienia → Konta (rekord
    `balances/`); pełny kreator startu w E3;
  - kwoty na liście operacji: wpływy zielone z „+”, wydatki bez koloru z „−”, zwrot towaru zielony; czerwień tylko
    dla przekroczeń i alarmów;
  - grupa A = E1 + E2 jednym ciągiem (CSV z mBanku dostarczony); E1 i E2 robione od zera na modelu z thinking max;
  - kategorie mBanku w CSV nie zawsze są trafne – najwyżej słaba podpowiedź, nigdy wpisywana sama.

### Przed etapem E3 (17.10.2026)
- **D69** Przejazdy: Bolt → Rozrywka i hobby, KOLEO → nowa podkategoria Auto · przejazdy (podpowiedź mBanku
  „Przejazdy” → Auto · przejazdy). Obie reguły startowe trafiają do folderu raz (`settings.seeded`): usunięta reguła
  albo zarchiwizowana kategoria nie wraca, a własna decyzja użytkownika dla tego kontrahenta ma pierwszeństwo.
- **D70** Odpowiedzi na „Przed etapem E3” (zgodnie z propozycją): pensja w kreatorze = średnie koszty netto z 6 pełnych
  miesięcy w górę do 100 zł (cel osłon 3 pensje, kadłub 6 × średnie koszty); obecne środki dzielone według kolejności
  dokowania, do poprawienia; koperty pierwszego miesiąca = średnie wydatki kategorii z 3 pełnych miesięcy, do 10 zł;
  ładownia z historii jako propozycje kontenerów do potwierdzenia; szybki wpis Ctrl+Alt+B (Enter zapisuje, Esc
  zamyka, „oficer” podpowiada ostatnią kategorię kontrahenta); ukrycie kwot Ctrl+$; odprawa przy pierwszym otwarciu
  okna po 5:00; dźwięki domyślnie włączone i ciche (30%). Grupa B (E3 + E4 → 1.0.0) na komendę 17.10.2026.

### Przed etapem E5 (17.10.2026)
- **D71** Scalanie bez pytania (zgoda a priori): PR grupy scalam sam, gdy CI (Linux i Windows) jest zielone, nie ma
  konfliktu ani otwartych uwag i nic nie czeka na decyzję użytkownika; po scaleniu sprawdzam, czy CI wydało wersję.
  Kolejna grupa nadal tylko na komendę (D67).
- **D72** Odpowiedzi na „Przed etapem E5” (zgodnie z propozycją):
  - folder ICTTJ: FI podpowiada ścieżkę z ustawień ICTTJ na tym komputerze (czyta tylko ścieżkę), użytkownik ją
    zatwierdza w Ustawienia → ICTTJ albo wskazuje folder ręcznie; ustawienie każdego komputera osobno;
  - wypłaty z ICTTJ sprzed startu budżetu są pomijane (są w saldach otwarcia), widoczne z dopiskiem „sprzed startu”;
  - dopasowanie (doprecyzowanie D56): ta sama kwota w PLN, wpływ od XTB najpóźniej 3 dni robocze po dacie wpisu
    w ICTTJ; bez pary po tym czasie – propozycja Portfela XTB do potwierdzenia przy dokowaniu;
  - okno dokowania tylko dla wypłat z ICTTJ i wpływów od XTB: podział według D13 do zmiany przed zapisem, animacja
    i dźwięk; inne wpływy dokują same, bez okna;
  - pula Cele: najpierw cele z prognozy ICTTJ, potem własne cele FI, w obu przypadkach według wspólnej listy
    priorytetów; czego cele nie potrzebują – do osłon („wolne do decyzji”); zwykła nadwyżka idzie do wszystkich celów
    według tej samej listy;
  - Mapa gwiezdna: cele ICTTJ tylko do odczytu (nazwa, kwota), własne cele FI z kwotą, terminem i priorytetem; jedna
    lista priorytetów (przeciąganie, nowy cel na końcu); ETA ze średnich wpłat do celów z ostatnich 6 miesięcy;
  - „Otwórz ICTTJ”: zainstalowany ICTTJ FI znajduje sam, wersję portable użytkownik wskazuje raz (ustawienie komputera);
  - pożyczka udzielona: kwota wychodzi z osłon, raty wracają do osłon (nie są przychodem), zaległa rata – przypomnienie
    po 3 dniach;
  - pożyczka wzięta: kwota do osłon, zasięg z osłon pomniejszonych o pozostały dług, raty jako kontener ładowni na czas
    spłaty;
  - PIT-38 na radarze od 1 lutego, powiadomienia 14 i 3 dni przed 30 kwietnia, bez kwoty (D58);
  - należność od domu w odprawie, gdy najstarszy niespłacony zakup „do zwrotu” ma ponad 30 dni.

  Grupa C (E5 + E6 → 1.1.0) na komendę 17.10.2026.
- **D73** (17.10.2026) Komenda „jak się skończy, to leć dalej” po wydaniu 1.1.0 = start grupy D (E7 + E8 → 1.2.0)
  z propozycjami z „Przed etapem E7” bez zmian:
  - start gry: pierwszy pełny dzień po uruchomieniu 1.2.0 (datę zapisuje w folderze pierwszy komputer), stopień
    Kadet, seria 0; dni wcześniejsze tylko w statystykach Wywiadu;
  - naruszenie zwykłe (przerywa serię): przekroczony przydział dnia, koperta planowa przekroczona o najwyżej 20%,
    kontener dodany albo zmieniony ponad linię zanurzenia; poważne (przerywa serię i liczy się do degradacji): koperta
    przekroczona o ponad 20%, osłony poniżej minimum przez decyzję (nie przez wypłatę pensji), dopłata do konta
    tradingowego wbrew firewallowi, zakup w ciszy nocnej; dzień bez wpisów jest zgodny; ocena z danych znanych w chwili
    zamrożenia;
  - awans: 30 dni zgodnych w ostatnich 35, liczonych od ostatniej zmiany stopnia; wykonana misja = 3 dni zgodne;
    degradacja przy 3. poważnym naruszeniu w miesiącu kalendarzowym (Kadet nie spada niżej), potem licznik od zera;
    klasa okrętu rośnie i spada z zasięgiem – wyższa z animacją i dźwiękiem, niższa w dzienniku wachty;
  - progi jak w specyfikacji (30 z 35, 20%, 3 poważne, misja = 3 dni), wspólne dla folderu, do zmiany w Dowództwie;
  - misje: jedna na tydzień (poniedziałek–niedziela), dobrana do najsłabszego punktu z ostatnich 4 tygodni, rozliczona
    po zamrożeniu niedzieli; pula: Killzone, Pełna energia, Cisza w eterze, Koperta pod kontrolą, Zero impulsów, Dzień
    bez wydatków, Łączność z bazą, Inwentaryzacja, Rozliczenie z domem;
  - ukryte osiągnięcia: Cisza w eterze, Pełne osłony, Pancerny kadłub, Asteroida rozbita, Pierwsze dokowanie, Cel
    osiągnięty, Seria 7 / 30 / 100, Hat-trick, Snajper, Czyste konto, Flagowiec;
  - smaczki ICT: Judas Swing (impuls), Turtle Soup (zwrot towaru), Liquidity sweep (energia dokładnie 0 zł), Order
    Blocks (kontenery na wykresie), Silver Bullet (krótka odprawa 10–11 czasu NY), Premium / Discount (linia
    Equilibrium na kopertach), Draw on Liquidity (najbliższy cel „DOL”);
  - krzywa majątku: suma sald kont na koniec tygodnia, swingi z tygodniowych zamknięć, BOS i CHoCH;
  - raporty: raport wachty w niedzielę od 18:00, debriefing z FVG i grą, przegląd roczny od 1 stycznia; eksport zawsze
    z prawdziwymi kwotami (ukrycie kwot dotyczy ekranu).
- **D74** (17.10.2026) Bez asystenta AI: etap E9 „Pierwszy oficer” wypada (zastępuje D53 i grupę E z D67); grupa D
  (1.2.0) zamyka plan etapów. Sieć tylko do aktualizacji.
- **D75** (17.10.2026) Grupowanie importu z mBanku (1.2.1, zgłoszenie użytkownika: za dużo grup, ta sama firma pod
  wieloma nazwami, podmiot wprost w nazwie albo tytule – „cukiernia”, „stacja benzynowa”), bez AI – zaakceptowane
  pomysły z propozycji (1 + 3 + 4 + 2):
  - klucz marki zamiast całej nazwy: bez miasta, numeru sklepu, prefiksu operatora płatności („SumUp *”) i końcówki
    domeny;
  - wbudowany słownik sieci z kategoriami;
  - słowa kluczowe w nazwie i tytule: zestaw startowy + własne;
  - grupowanie wielopoziomowe (temat = kategoria / rodzaj / podpowiedź mBanku → marki → operacje) z „Przyjmij pewne”.
  Na razie bez łączenia podobnych nazw (5) i propozycji reguły z liczbą wierszy (6).
- **D76** (17.10.2026) Do 1.2.1 dochodzi (prośba użytkownika w trakcie pracy, doprecyzowana: „bulkowe dodawanie
  transakcji według przyjętego klucza na podstawie wyniku wyszukiwania lub ręcznie”): wyszukiwarka na ekranie importu,
  zaznaczanie grup i operacji (ręcznie albo wszystkie znalezione) z decyzją dla zaznaczonych, „Nie importuj”,
  zapamiętanie wyszukiwanego słowa jako słowa kluczowego; to samo w Operacjach dla już zaimportowanych – zaznaczanie,
  kategoria dla zaznaczonych z „Cofnij”, zapamiętanie dla marek albo jako słowo kluczowe.
- **D77** (17.10.2026) Do 1.2.1 dochodzi (prośba użytkownika): rozwiązywanie konfliktów importu i duplikatów jak w
  ICTTJ (1.19.1 „Duplikaty z importu”, 1.20.0 „Zaakceptuj nowsze”) – wpis ręczny, który pojawi się w imporcie, nie daje
  podwójnej operacji; duplikaty już zapisane do scalenia z „Cofnij”.

## Decyzje techniczne (Claude)
- **T1** Stos jak ICTTJ, wersje z jego `package.json`; bez natywnych modułów Node.
- **T2** Dane: jeden plik JSON na rekord (układ jak ICTTJ), moduły folderu danych przeniesione z ICTTJ.
- **T3** Kwoty w groszach (liczby całkowite); podziały z resztą w ostatniej części.
- **T4** Stany warstw liczone czystą funkcją `shared/calc/fleet.ts`, nigdy zapisywane.
- **T5** Moduły z ICTTJ kopiowane i dostosowane, bez wspólnej biblioteki – niezależne wydania obu aplikacji.
- **T6** Dźwięki syntezowane (WebAudio), bez plików.
- **T7** Odsłuch: Web Speech API; brak polskiego głosu w systemie → przycisk ukryty + podpowiedź o pakiecie mowy.
- **T8** Globalny skrót: Electron `globalShortcut`; zajęty skrót → komunikat i wybór innego.
- **T9** Ocena dnia zamyka się 24 h po końcu dnia, potem jest zamrożona.
- **T10** Klasy okrętu wg zasięgu: < 1, 1–3, 3–6, 6–9, 9–12, ≥ 12 miesięcy.
- **T11** Daily Bias: reguła z `specyfikacja.md` (Bullish / Neutral / Bearish wg energii i osłon).
- **T12** Ustawienia komputera w `userData/config.json`; ścieżka ICTTJ per komputer.
- **T13** Repozytorium `Clatir/FinancialIntel` (publiczne – D61), `appId` `app.financialintel.desktop`, pliki
  `Financial-Intel-Setup.exe` i `Financial-Intel-portable.exe`.
- **T14** Odczyt ICTTJ tolerancyjny (`z.looseObject`), nowszy format = ostrzeżenie.
- **T15** Dokowanie idempotentne: rekord `dockings/*` ze źródłem (`ictjEntryId` albo skrót wiersza CSV).
- **T16** Osłony poniżej minimum liczą się jako poważne naruszenie tylko z decyzji użytkownika, nie przez wypłatę
  pensji (spójnie z D14).
- **T17** (E0) Kod przeniesiony z ICTTJ @ 84a8339 (gałąź domyślna ICTTJ, wersja 1.20.0); każdy plik z komentarzem
  `adapted from ICTTJ …`. Bez osobnej aplikacji Beta, kanałów wersji testowych, danych demo, OCR, EODHD i skanera.
- **T18** Układ folderu: kolekcje z jednym z trzech układów plików (`paths.ts` `LAYOUTS`): `dated`
  (`<kolekcja>/RRRR/RRRR-MM-DD_ULID.json`, pole `date` – zmiana daty przenosi plik), `id` (`<kolekcja>/ULID.json`),
  `month` (`<kolekcja>/RRRR-MM.json`, pole `month`). Plik ustawień `fi.json` = rodzaj `fi`. Magazyn (`DataStore`),
  historia, konflikty i scalanie są ogólne – nowa kolekcja to wpis w `COLLECTIONS` / `LAYOUTS` i schemat.
- **T19** E0: schematy rekordów tymczasowe (pola wspólne + `date` / `month`, `z.looseObject`); pełne schematy w E1.
  `SCHEMA_VERSION` = 1.
- **T20** Kopie zapasowe: przy starcie raz dziennie ZIP całego folderu (bez `backups/`, `.history/`, `.presence/`),
  30 ostatnich; ręczne (5 ostatnich); przed migracją formatu. Bez kopii tygodniowej ICTTJ (folder FI jest mały, bez
  screenów). Kopia przed importem – w E2.
- **T21** Skróty: Ctrl+1…0 = ekrany w kolejności menu (po pozycji klawisza), Ctrl+K paleta, Ctrl+, ustawienia,
  Ctrl+Shift+Y synchronizacja, F1 / ? ściąga. Zmienne testowe `FI_*` zamiast `ICTJ_*` (lista w `CLAUDE.md`).
- **T22** Preload wystawia `window.fi` (kanały IPC `fi:*`); okno renderera: contextIsolation, sandbox, CSP bez
  zewnętrznych źródeł (bez protokołu plików – FI nie ma screenów).
- **T23** CI: Linux (Node 22.12 / 24 / 26, typecheck, testy, build) + E2E na Linuksie pod Xvfb przy każdym wypchnięciu;
  Windows (build-windows.cmd, smoke, test aktualizacji portable i instalatora, wydanie) dla PR, gałęzi domyślnej i ręcznie.

### E1 – model i silnik (17.10.2026)
- **T24** Wydatek opłacony z pieniędzy celu (`goalId`) nie jest miesięcznym kosztem netto (nie podnosi celu kadłuba
  ani nie skraca zasięgu); płaci go cel, brak w celu – osłony.
- **T25** Start warstw: `settings.budget.start` (kreator E3), inaczej najwcześniejsze saldo otwarcia; historia sprzed
  startu służy tylko statystykom. Saldo otwarcia = na początek swojego dnia, potwierdzenie salda = na koniec dnia
  (`shared/calc/balances.ts`); konto otwarte po starcie wpływa do osłon w dniu otwarcia.
- **T26** Dokowanie bez rekordu = kolejność domyślna liczona przez silnik w chwili wpływu (cele warstw z planu
  miesiąca – brak planu = ostatni wcześniejszy – i średnich kosztów sprzed miesiąca); rekord `dockings/*` tylko dla
  zmienionego podziału albo wpisu ICTTJ (pula). Nieznany cel osłon (brak pensji) albo kadłuba (brak kosztów) →
  pieniądze zostają w osłonach.
- **T27** Średnie koszty netto: pełne miesiące kalendarzowe (od pierwszego w całości objętego danymi), ostatnie 12;
  przy mniej niż 3 pełnych miesiącach – `layers.assumedCosts`, jeśli ustawione. Średnie wpływy (ostrzeżenie o pensji):
  6 pełnych miesięcy, wpływy = przychody bez zwrotów należności + wypłaty z XTB.
- **T28** Energia = pieniądze pensji miesiąca; wydatek ponad nią idzie z osłon (czerwony alarm „energia
  wyczerpana”); bez pensji (brak planu) wydatki idą prosto z osłon. Niewydana energia na koniec miesiąca = łupy:
  decyzja w planie miesiąca (`loot`) do 7. dnia, inaczej 8. dnia do osłon; część „na następny miesiąc” powiększa
  koperty codzienne.
- **T29** Odkładki: rata = plan (kwota opłaty równo na miesiące cyklu, reszta w ostatnim – 11 × 103,33 + 103,37) plus
  równa część braku zbiornika wobec planu (opłata dodana późno) albo minus część nadwyżki; opłata idzie ze zbiornika,
  brak – z energii (żółty alarm).
- **T30** Energia dziś = (koperty codzienne − wydatki codzienne przed dziś) / dni do końca miesiąca z dzisiejszym,
  w dół do grosza; wydatek bez kategorii liczy się jako codzienny (ostrożnie), płatności kontenerów i z celów nie.
- **T31** Przelew własny, korekta salda, pożyczka zaciągnięta zmieniają tylko osłony (para przelewów między kontami
  budżetu się znosi); dopłata do XTB idzie z osłon, a gdy osłony po dopłacie byłyby poniżej celu albo kadłub nie jest
  pełny – czerwony alarm „firewall” (przy włączonym rozkazie).
- **T32** Brakujące pieniądze (wydatek ponad energię, do zwrotu, dopłata do XTB): osłony → kadłub → osłony poniżej
  zera (deficyt, czerwony alarm). Cele nigdy nie są ruszane same.
- **T33** Pozycje ustawień z wartością ze znanego zbioru (rodzaj konta, format importu, koperta, kategoria
  systemowa, rodzaj / tryb / kierunek reguły importu) przyjmują dowolny tekst: starsza wersja na drugim komputerze
  zachowuje wartość wpisaną przez nowszą; nieznana wartość = brak. Pozycja bez id albo nazwy jest pomijana.
- **T34** Pola edytowane jako szkic (kwota, data, godzina, nazwy) zapisują się po wyjściu z pola; zmiana ekranu,
  wybór innego wpisu i `flushSaves` najpierw zdejmują fokus z pola (`commitActiveField`) – wpisana wartość nie ginie.

### E2 – import z mBanku (17.10.2026)
- **T35** Tożsamość wiersza z banku: `bank.key` = `mbank:<odcisk FNV-1a: konto, data, opis (wielkie litery,
  pojedyncze spacje), kwota>:<n>`, n = kolejne wystąpienie identycznego wiersza w pliku (dwa takie same zakupy jednego
  dnia to dwie operacje). Ten sam wiersz w kolejnym pliku (nakładające się okresy) ma ten sam klucz – „znana”.
  Nierozliczona, która wróciła rozliczona (opis bez dopisku, kwota ± max(5 zł, 10%), data ±3 dni, podobna nazwa
  kontrahenta z banku `bank.counterparty`) – „rozliczona”: przejmuje kwotę, datę i dane banku; nazwa kontrahenta
  zmieniona przez użytkownika zostaje.
- **T36** Łączenie z wpisem ręcznym (operacja bez `bank`, to samo konto): ta sama kwota, data ±3 dni, podobny
  kontrahent (pusty, jeden klucz zawiera drugi albo wspólne słowo z co najmniej 4 liter); najpierw najbliższa data,
  potem wpis z nazwą; każda strona najwyżej raz. Wpis zachowuje kategorię, godzinę, notatki i swoją nazwę, dostaje datę
  i dane banku; w podglądzie „nie łącz”.
- **T37** Kolejność rozpoznawania nowego wiersza: reguła (dokładny klucz przed fragmentem, reguła drugiego kierunku
  się nie liczy) → rozpoznanie wbudowane (XTB → konto tradingowe; „PRZELEW WŁASNY” albo przelew z nazwiskiem
  właściciela – `#Klient` pliku i `settings.import.ownNames` – → przelew własny; wypłata z bankomatu / BLIK → wydatek
  „Gotówka”; przychodzący „ZWROT” → ujemny wydatek w kategorii z reguły zakupów tego kontrahenta; opłaty i prowizje
  banku → wydatek bez kategorii) → bez decyzji. Kategoria mBanku tylko podpowiada najbliższą kategorię startową
  (istniejącą, niezarchiwizowaną); „Przyjmij podpowiedzi mBanku” ustawia je jednym kliknięciem bez zapamiętania.
- **T38** Reguły: klucz kontrahenta (`counterpartyKey`: małe litery bez znaków diakrytycznych, bez form prawnych,
  numerów sklepów i terminali) + kierunek; uczą się z decyzji grupy z zaznaczonym „zapamiętaj” (domyślnie przy
  własnej decyzji) i z „Zapamiętaj” w edytorze operacji (`upsertRule`: ta sama reguła zmienia się, licznik trafień
  rośnie). Reguły i nazwiska właściciela w Ustawienia → Import z banku.
- **T39** Operacja usunięta przez użytkownika (ostatnia wersja w `.history/` z `bank.key`) nie wraca z kolejnym
  importem – wiersz „usunięty, pominięty”, chyba że użytkownik zaznaczy „importuj mimo to”.
- **T40** Zniknięte nierozliczone (autoryzacja karty anulowana przez bank): tylko przy „Liście operacji” z okresem
  pliku (historia rachunku nie ma nierozliczonych), proponowane do usunięcia, nigdy zaznaczone same – lista mogła być
  filtrowana.
- **T41** Należność domu w imporcie liczona po dacie przez cały plik: zakupy „do zwrotu” z pliku ją zwiększają, wpłata
  od domownika spłaca ją najpierw (`repaid`), reszta to przychód (D20) – jak w silniku warstw.
- **T42** Import: konto pliku wybierane na ekranie (domyślnie pierwsze konto z importem mBanku; zmiana konta zachowuje
  decyzje grup); przed zapisem zapis bieżących zmian, potem kopia `backups/pre-import/<czas>.zip` (10 ostatnich),
  plan liczony jeszcze raz na aktualnych danych; w folderze tylko do odczytu import zablokowany;
  `settings.import.lastImport` = czas ostatniego importu. Plik CSV do 20 MB, czytany w procesie głównym, dekodowany
  w oknie.
- **T43** Operacja z banku zapisuje wiersz źródłowy w `transaction.bank` (format, klucz, opis, kontrahent, rodzaj
  operacji, kategoria mBanku, nierozliczona, czas importu) – addytywnie, bez zmiany `SCHEMA_VERSION`.
- **T44** Plik testowy z prawdziwego eksportu tylko zanonimizowany skryptem trzymanym poza repozytorium (zawiera
  zastępowane dane): osoby, miejsca, terminale i część usług zastąpione, daty przesunięte o 52 tygodnie (dni tygodnia
  zostają), kwoty pomnożone przez współczynnik 0,6–1,4 losowany osobno dla każdego kontrahenta (nie do odwrócenia),
  część wierszy usunięta; format pliku (BOM, CRLF, pola opisu) bez zmian – `.gitattributes` `tests/fixtures/** -text`.
  Napisy testów pochodzące z pliku używają nazw zanonimizowanych.

### E3 – start i plan miesiąca (17.10.2026)
- **T45** Pierwszy miesiąc budżetu: pensja w miesiącu startu jest pomniejszona o koszty netto tego miesiąca sprzed startu
  (bez opłat okresowych – te są zbiorników), więc reszta miesiąca ma tyle energii, ile zostało z pensji; dzienny
  przydział liczy cały miesiąc (T30).
- **T46** Plan miesiąca: miesiąc bez własnego planu korzysta z ostatniego wcześniejszego; pierwsza zmiana (pensja,
  koperta, łupy) tworzy jego własny plan – kopię pensji i kopert, bez decyzji o łupach – i nie zmienia innych miesięcy.
  Puste pole koperty = kategoria bez koperty w tym miesiącu.
- **T47** Propozycje (D70) z pełnych miesięcy historii (od pierwszego objętego w całości, bez bieżącego): pensja –
  średnie koszty netto 6 mies. w górę do 100 zł; koperty – średnie wydatki kategorii głównej z 3 mies., do 10 zł, bez
  płatności kontenerów (połączonych albo do tego samego odbiorcy); cel kadłuba w kreatorze – średnie z 12 mies. jak
  silnik (T27), przy mniej niż 3 pełnych miesiącach – koszty przyjęte w kreatorze.
- **T48** Stałe opłaty z historii: ten sam odbiorca (kontrahent, a bez niego tytuł – `payeeKey`) prawie w każdym
  z ostatnich pełnych miesięcy (co najmniej 3; najwyżej jedna płatność ponad liczbę miesięcy; kwoty ±15% mediany) albo
  2–3 płatności co 11–13 miesięcy; kwota = ostatnia płatność; każdą propozycję trzeba potwierdzić.
- **T49** Kontener ma odbiorcę w banku (`container.counterparty`, addytywnie): import łączy jego płatności
  (`containerId`; kategoria kontenera, gdy nie ma innej decyzji – reguła wygrywa), dodanie kontenera łączy płatności
  tego odbiorcy od 1. dnia miesiąca startu budżetu, a w edytorze kontenera jest „Połącz płatności”. Silnik i debriefing
  liczą jako ładownię tylko płatności połączone; nie są wydatkami kopert. W Operacjach wydatek ma pole „Ładownia”.
- **T50** Nowy kontener jest formularzem do „Dodaj do ładowni”: ponad linią zanurzenia najpierw ostrzeżenie
  z symulacją (masa ładunku i zasięg przy kosztach powiększonych o miesięczną część kontenera) i potwierdzenie;
  zmiany istniejącego zapisują się od razu; zrzut = archiwizacja (symulacja w edytorze).
- **T51** Kreator startu stosuje odpowiedzi razem przy „Uruchom budżet”: saldo otwarcia każdego konta na początek dnia =
  saldo teraz − operacje tego dnia już w budżecie (kolejność salda i importu nie ma znaczenia); konto bez salda otwarcia
  wymaga salda (0, gdy puste); start = dziś; podział środków według dokowania (kadłub do poprawienia, reszta w osłonach;
  cele z Mapą gwiezdną, E5); plan bieżącego miesiąca; wybrane kontenery; skrót szybkiego wpisu i start z Windows (D64).
  Działający budżet nie uruchamia kreatora drugi raz.
- **T52** Łupy (D18): decyzja do 7. dnia następnego miesiąca zapisana w planie zakończonego miesiąca (następny miesiąc –
  koperty codzienne, cele, reszta do osłon); „Miesiąc zamknięty na plus” = koszty netto ≤ pensja, z krótką animacją
  i dźwiękiem raz na komputer; debriefing od pierwszego miesiąca budżetu.

### E4 – Mostek i szybki wpis (17.10.2026)
- **T53** Ustawienia komputera w `config.json` → `prefs` (skrót szybkiego wpisu, ukrycie kwot, powiadomienia, dźwięki –
  nigdy w folderze na OneDrive): odczyt tolerancyjny (brak albo zła wartość = domyślna), zmiana łatką jednej sekcji;
  proces główny zapisuje i rozsyła wynik wszystkim oknom (główne, szybki wpis, panele odłączone); skrót rejestrowany
  ponownie tylko wtedy, gdy go ustawiono (także ten sam – ponowna próba po zwolnieniu przez inny program).
- **T54** Szybki wpis: osobne okno (bez ramki, nad wszystkimi, bez paska zadań) tworzone ukryte 3 s po starcie, więc
  skrót pokazuje je od razu, na ekranie z kursorem. Dane ma główne okno: szybki wpis dostaje zwięzły stan (kategorie,
  konta, energia dziś i koperty, cisza nocna, próg dziennika, ostatnie kategorie kontrahentów, należność domu, ukrycie
  kwot) i odsyła szkic, a zapisuje główne okno (autozapis i historia jak każdy wpis; folder tylko do odczytu – odmowa
  w oknie). Enter zapisuje, Esc zamyka; zakup w ciszy nocnej – potwierdzenie i krótki wpis (D40), od progu dziennika
  „Plan czy impuls?” (D41), wpływ od domownika najpierw spłaca należność domu (T41). Skrót zajęty przez inny program –
  informacja w Ustawieniach; szybki wpis jest też na Mostku, w palecie i w menu zasobnika.
- **T55** Ukrycie kwot (Ctrl+$, D30) – ustawienie komputera: kwoty ekranów, dymku zasobnika, odprawy, powiadomień
  i paneli odłączonych pisane jako `•••`; pole kwoty pokazuje liczbę dopiero w trakcie edycji; odprawa czytana głosem
  pomija kwoty.
- **T56** Powiadomienia (D70, specyfikacja „Powiadomienia”): liczone co minutę i przy pokazaniu okna, każde raz na
  komputerze (klucz zapamiętany w oknie na 60 dni), ciche – dźwięk tylko z ustawień aplikacji (alarm); nic w ciszy
  nocnej i przed startem budżetu.
  - Odprawa: pierwsze pokazanie okna po ciszy nocnej (z zasobnika, start) albo pierwszy ruch w oknie, które zostało na
    ekranie przez noc („po 5:00” z D70 = koniec ciszy nocnej z rozkazów); okno pokazane dla odprawy przechodzi na
    Mostek, chyba że otworzyło je kliknięcie innego powiadomienia.
  - Wieczorne dopisanie od godziny z ustawień (21:00). Przydział dnia: przekroczenie (alarm) albo poniżej 20%; koperta:
    przekroczenie albo ponad 80% (raz w miesiącu) – przekroczenie nigdy nie udaje „na wyczerpaniu”.
  - Asteroida: 14 i 3 dni przed płatnością, tylko płatność w czasie trwania kontenera. Import: po 3 dniach od daty
    warszawskiej ostatniego. Salda: w niedzielę, gdy nie potwierdzone od poniedziałku. Debriefing: przy pierwszym
    spojrzeniu od 1. do 7. dnia (termin łupów), od drugiego miesiąca budżetu; raport wachty w niedzielę – z Raportami (E8).
  - Kliknięcie otwiera ekran sprawy (Operacje dnia, Ładownia, Import, Konta, Plan miesiąca, Mostek).
- **T57** Odprawa i Daily Bias (specyfikacja „Wywiad” – na Mostku już w 1.0.0): Bullish – energia dziś co najmniej
  podstawowy przydział i koperty w limitach; Bearish – energia poniżej połowy podstawowego przydziału albo osłony poniżej
  minimum; inaczej Neutral. Pozycje odprawy: alarmy silnika z bieżącego miesiąca (wyczerpana energia i braki zbiorników
  zsumowane), asteroidy w 14 dni z kwotą i stanem zbiornika, zaległy import (ponad 3 dni), salda (ponad 7 dni), łupy do
  decyzji. „Odsłuchaj” – głos systemu pl-PL (D49).
- **T58** Dźwięki syntezowane WebAudio (bez plików i licencji): wpis, dokowanie, alarm, awans, „Miesiąc zamknięty na
  plus”; włącznik, głośność (zapis po puszczeniu suwaka, z próbką) i przełącznik każdego zdarzenia – na komputer.
- **T59** Zasobnik: druga linia dymku „Energia dziś: …” (z ukryciem kwot); menu: Szybki wpis, Otwórz, Raport wachty
  dnia (Operacje z dzisiejszymi wpisami), aktualizacja, Zakończ.
- **T60** Panele Mostka (Odprawa, Stan okrętu, Koperty) odłączane na drugi monitor (D45): okno dostaje dane jako JSON
  (wycinek stanu okrętu, pozycje odprawy, nazwy kopert), a kliknięcie w nim prowadzi główne okno.
- **T61** Ustawienia: „Warstwy i rozkazy” w `fi.json` (wspólne dla komputerów: cele warstw, przyjęte koszty, rozkazy)
  i „Powiadomienia i dźwięki” w `config.json` (ten komputer: skrót, ukrycie kwot, powiadomienia, dźwięki).

### E5 – ICTTJ i dokowanie (17.10.2026)
- **T62** Odczyt ICTTJ (`src/main/ictj/`, tylko do odczytu): `reader.ts` czyta wyłącznie kanoniczne pliki
  `payouts/RRRR/RRRR-MM-DD_ULID.json` i `forecasts/ULID.json` (kopie narzędzi synchronizacji, pliki tymczasowe i reszta
  folderu są pomijane); kwoty ICTTJ (PLN, liczby) → grosze `Math.round(× 100)`; wydatki pominięte; nieznany rodzaj,
  nieznana pula (→ zwykłe dokowanie), plik nieczytelny albo nowszy `schemaVersion` – ostrzeżenie, nie błąd.
  `source.ts`: obserwacja `payouts/` i `forecasts/` (gdy istnieją) i ponowny odczyt co 30 s; do okna idzie tylko
  zmieniony stan (`fi:ictj`); odczyt folderu, który przestał być wybrany, niczego nie publikuje. Folder i program ICTTJ
  to ustawienia komputera (`config.json` → `ictj {dir, exe}`); podpowiedź folderu = tylko ścieżka z
  `%APPDATA%\ICT Trade Journal\config.json` (`dataDir`, w trybie demo `lastRealDir`; też Beta); program: wybrany .exe,
  inaczej `%LOCALAPPDATA%\Programs\ICT Trade Journal\` albo rejestr (`Uninstall` → `InstallLocation`).
- **T63** Dostawy (`shared/calc/dock.ts` `deliveries`): wpis ICTTJ ↔ operacja `trading` tej samej kwoty w groszach,
  data od 3 dni przed wpisem do 3 dni roboczych po nim (pon–pt, bez świąt), najbliższa data, każda raz; zwrot do masy
  paruje z wypływem do XTB. Bez pary – „czeka na import”; po 3 dniach roboczych **i** z importem mBanku późniejszym niż
  okno → propozycja Portfela XTB (bez nowego importu dalej czeka – inaczej wpływ policzyłby się dwa razy). Wpływ z XTB
  bez wpisu → do zadokowania zwykłą kolejnością + przypomnienie (gdy ICTTJ czytany na tym komputerze, 30 dni). Wpisy
  sprzed startu pominięte; „Pomiń wpis” = `settings.ictj.skipped` (z powrotem: „przywróć”).
- **T64** Dokowanie = rekord `dockings/*` (pula i `ictjEntryId` wpisu; `split` tylko po zmianie w oknie – bez zmian
  liczy kolejność dokowania na nowo, gdy dojdą starsze dane); dwa dokowania jednej operacji (dwa komputery naraz) –
  liczy się wcześniejsze, tak samo w silniku i w oknie (`dockingsByTx`). Dostawa bez pary w banku tworzy przy
  dokowaniu operację na Portfelu XTB z dniem wpisu; „Cofnij”; ponowne otwarcie zadokowanej = zmiana podziału (bez nowej
  operacji, gdy jej nie ma w folderze). Okno liczy propozycję samym silnikiem (`withDocking`), pokazuje firewall zwrotu.
- **T65** Silnik: pula Cele – najpierw cele z prognozy ICTTJ, potem własne, każde wg listy priorytetów (D72); zwrot do
  masy z puli Podatek wraca z rezerwy podatkowej, bez firewalla.
- **T66** Cele ICTTJ jako rekordy `goals/<id celu ICTTJ>.json` (`source: 'ictj'`; nazwa, kwota i miesiąc z ICTTJ – w FI
  tylko do odczytu); `ictj.version` = `updatedAt` scenariusza: starsza kopia scenariusza (OneDrive w trakcie) nic nie
  zmienia; cel zniknięty albo wyłączony w scenariuszu → `archived` (zachowuje środki, nowe nie trafiają). Scenariusz celów:
  `settings.ictj.forecastId` (null = zmieniony ostatnio w ICTTJ); scenariusz w innej walucie niż PLN → cele bez kwoty
  w PLN (kwota oryginalna do wglądu); brak scenariusza → bez zmian.
- **T67** Mapa gwiezdna: lista priorytetów = `priority` 1…n (przeciąganie i strzałki); ETA (`goalEtas`) przy średniej
  wpłat do celów z ostatnich pełnych miesięcy budżetu (do 6, z dziennika silnika – `goalInflow`), cele po kolei; nowy
  cel własny na końcu listy; archiwizacja z „Cofnij”.
- **T68** Powiadomienie „Nowa wypłata w ICTTJ do zadokowania” (`notify.ictj`, ten komputer): raz na wpis, od razu po
  zmianie w folderze ICTTJ; 3 i więcej naraz = jedno zbiorcze; kliknięcie otwiera okno tej dostawy. Odprawa: dostawy do
  zadokowania i czekające na import, rozbieżna kwota, wpływ bez wpisu w ICTTJ, niedostępny folder. Mostek: panel
  „Dokowanie”; menu boczne: „Otwórz ICTTJ”; Ustawienia → ICTTJ.
- **T69** Zmienne testowe: `FI_ICTJ_DIR` (folder ICTTJ bez ustawień), `FI_ICTJ_APPDATA` (gdzie szukać config.json ICTTJ),
  `FI_ICTJ_LAUNCH=dry` (bez uruchamiania programu).

### E6 – Radar i należności (17.10.2026)
- **T70** Pożyczki (`shared/calc/loans.ts`): stan z harmonogramu i operacji. Udzielona – należność = kwota pożyczki −
  spłaty (operacje „Pożyczka” z jej id); spłata wraca do osłon do wysokości długu (także pożyczka sprzed startu, bez
  operacji wypływu), nadwyżka (odsetki) dokuje jako przychód. Wzięta – do spłaty = suma harmonogramu (z odsetkami), raty
  = wydatki jej kontenera w ładowni (albo operacje „Pożyczka” na minus). Wpłaty pokrywają raty po kolei; rata
  niezapłacona 3 dni po terminie jest zaległa (wszystkie zaległe razem; każda nowa zaległa = nowe przypomnienie).
  Zamknięta – bez należności i rat; usunięcie tylko bez operacji (także rat z importu), inaczej „zamknij”. Powiązanie
  z pożyczką ma tylko operacja rodzaju „Pożyczka” (zmiana rodzaju je zdejmuje).
- **T71** Silnik: stan okrętu ma `loans` (stany pożyczek), `debt` (wzięte do spłaty) i należności z rekordów pożyczek
  (zamknięte bez); zasięg = max(0, osłony + kadłub − dług) / koszty – tak samo w symulacji Ładowni; `receivables.houseSince`
  = najstarszy niespłacony zakup „do zwrotu” (spłaty od najstarszych, jak suma należności domu).
- **T72** Nowa pożyczka (Radar): harmonogram miesięczny (grosze z resztą w ostatniej racie, dzień miesiąca, w krótszym
  miesiącu jego ostatni dzień), opcjonalnie operacja na wybranym koncie (udzielona – wypływ z osłon, wzięta – wpływ do
  osłon); wzięta tworzy kontener „Rata: …” (rodzaj rata, kwota pierwszej raty, od pierwszej do ostatniej raty, odbiorca =
  pożyczkodawca – import łączy przelewy); zamknięcie archiwizuje kontener. „Spłata otrzymana” / „zapłać ratę” – kwota
  następnej raty, data dziś.
- **T73** Radar 90 dni (`shared/calc/radar.ts`): pensje 1. dnia (z osłon do energii), każda płatność asteroidy w oknie
  w czasie życia kontenera (stan zbiornika przy pierwszej), raty własne i spodziewane spłaty (także zaległe – oznaczone),
  PIT-38: 30 kwietnia, na radarze od 1 lutego, bez kwoty (D58).
- **T74** Odprawa i powiadomienia: zaległa rata (`notify.loans`), PIT-38 14 i 3 dni przed terminem (`notify.pit38`),
  należność domu po 30 dniach od najstarszego zakupu (odprawa). Kolory: zaległość w akcencie – czerwień zostaje dla kwot
  i alarmów.

### E7 – Dowództwo (17.10.2026)
- **T75** Ocena dnia (`shared/calc/game.ts` `rateDay`): stan okrętu na koniec dnia warszawskiego (`computeFleet` z
  `warsawEndOf`), dane znane w chwili zamrożenia. Zwykłe: przydział dnia na minusie, koperta planowa przekroczona tego
  dnia (`EnvelopeState.today`), masa ładunku ponad linią po wzroście względem poprzedniego zamrożonego dnia (masa
  zapisana w dniu – `cargo`; bez poprzedniego: kontener dodany tego dnia). Poważne: koperta planowa ponad limit + próg
  (domyślnie 20%; limit 0 – tylko zwykłe), osłony poniżej minimum na koniec dnia, gdy decyzje dnia (wydatek, wpływ,
  XTB, pożyczka udzielona, przelew – bez pensji, korekty, PIT-38 i rat własnych) netto zabrały z osłon i kadłuba,
  alarm firewalla tego dnia, każdy zakup w ciszy nocnej. Koperty codzienne liczy przydział dnia.
- **T76** Zamrażanie (`advanceGame`, w tle w oknie głównym co minutę i przy zmianie rekordów): dni od `game.start`
  do dziś − 2 (24 h po końcu, T9), po kolei; rekordy `game/RRRR-MM.json` ze stałymi id (miesiąc, misja tygodnia,
  zmiana stopnia – ULID z daty), więc dwa komputery piszą to samo. Start gry: pierwszy pełny dzień po uruchomieniu 1.2.0
  na działającym budżecie (`settings.game.start`, raz).
- **T77** Stopień: awans, gdy dni zgodne w ostatnich `windowDays` od dnia po ostatniej zmianie + misje wykonane
  (niedziela w tym oknie) × `missionDays` ≥ `promoteDays`; degradacja w dniu z poważnym naruszeniem, które doprowadza
  liczbę poważnych w miesiącu (od ostatniej zmiany) do progu – działa też po obniżeniu progu. Zmiana stopnia zapisana
  (nie przeliczana), więc późniejsza korekta danych ani zmiana progów jej nie cofa.
- **T78** Misje: jedna na tydzień ISO, wybierana przy pierwszym uruchomieniu w tygodniu (od pierwszego pełnego tygodnia
  gry), z danych sprzed poniedziałku (4 tygodnie): kolejno cisza nocna, koperta planowa ponad tempo, ≥ 2 przekroczenia
  przydziału, ≥ 2 impulsy, killzone (≥ 8 wydatków z godziną, ≥ 25% kosztów w jednej godzinie dnia tygodnia), należność
  domu starsza niż 14 dni, import starszy niż 4 dni, brak potwierdzeń sald, < 4 dni bez wydatków – inna niż w zeszłym
  tygodniu; bez słabego punktu po kolei z puli stałej. Rozliczenie po zamrożeniu niedzieli. Importy zapisywane
  w `settings.import.log` (czas → konto, ostatnie 100; obiekt – dwa komputery scalają się po kluczach).
- **T79** Osiągnięcia ukryte (13, D73): stanowe (osłony, kadłub, cel, Flagowiec, spłacona pożyczka) w dniu, w którym
  stan je spełnia; z historii gry (Cisza w eterze, serie, dokowanie od startu gry); Hat-trick i Snajper przy
  zamrożeniu 1. dnia miesiąca – miesiące od startu gry. Każde raz.
- **T80** Ekran awansu i święta: z dziennika wachty (`gameView`), tylko zdarzenia z ostatnich 14 dni, raz na komputer
  (`fi.game.seen` w localStorage; pierwsze uruchomienie zapamiętuje historię bez świętowania); awans i wyższa klasa –
  ekran z dźwiękiem, degradacja / osiągnięcie / misja – toast (kilka naraz jako jeden), niższa klasa tylko w dzienniku.
  Smaczki ICT: Silver Bullet = odprawa skrócona do 3 zdań między 10:00 a 11:00 czasu NY; Equilibrium na kopertach
  (część miesiąca, która minęła – Premium / Discount), DOL = pierwszy nieosiągnięty cel na liście priorytetów; Judas
  Swing, Turtle Soup, Liquidity sweep – oznaczenia dnia w dzienniku wachty.

### E8 – Wywiad i raporty (17.10.2026)
- **T81** Krzywa majątku (`shared/calc/intel.ts`): suma sald kont budżetu na koniec każdej niedzieli (ostatni punkt –
  dziś), saldo z ostatniego salda otwarcia w obie strony (historia z importu wstecz), sumy narastające i wyszukiwanie
  binarne (lata historii); drawdown od szczytu. Struktura: swing = tygodniowe zamknięcie wyższe / niższe od obu
  sąsiadów (potwierdzone tydzień później); zamknięcie ponad ostatni swing high albo pod swing low – BOS zgodnie z
  trendem, CHoCH przeciw niemu (pierwsze przebicie bez trendu = BOS).
- **T82** Killzones: koszty zakupów z godziną (dzień tygodnia × godzina), bez godziny tylko policzone; FVG kopert =
  debriefing (plan − fakt); wydatki w czasie – kategorie główne miesiąc po miesiącu, ładownia jako wiersz „Order Block”;
  prognoza zasięgu – osłony + kadłub − dług ubywające po średnich kosztach; dziennik – plan / impuls / bez oznaczenia
  od progu, trafność = plan wśród oznaczonych.
- **T83** Raporty: raport wachty – tydzień poniedziałek–niedziela (domyślnie bieżący od niedzieli 18:00, wcześniej
  poprzedni), koperty na najbliższe dni do końca miesiąca (do 7); debriefing – debriefing miesiąca + FVG + dni gry,
  poważne naruszenia, misje, osiągnięcia, dziennik, podział łupów (z osłonami); przegląd roczny – majątek na koniec
  31.12 roku wcześniej i roku (dziś w bieżącym), cele osiągnięte w roku (z dziennika silnika), osiągnięcia roku,
  PIT-38 bez kwoty. Powiadomienie „Raport wachty” w niedzielę od 18:00 (`notify.watch`) otwiera raport tego tygodnia.
- **T84** Eksport: CSV dla polskiego Excela (średnik, przecinek dziesiętny, BOM; tekst zaczynający się jak formuła
  dostaje apostrof), Excel – generator z ICTTJ @ 84a8339 (arkusze Operacje i Miesiące), PDF – samodzielny HTML bez
  skryptów drukowany przez ukryte okno (moduł z ICTTJ), pełna kopia ZIP (`exportZip` z E0). Pliki zawsze z prawdziwymi
  kwotami (D73).

### 1.2.1 – grupowanie importu z mBanku (17.10.2026)
- **T85** Klucz marki (`shared/import/brands.ts` `brandOf`): nazwa złożona do małych liter bez znaków diakrytycznych,
  bez form prawnych, adresu `www.` i końcówki domeny, prefiksu operatora płatności („SumUp *”, „PAYPRO SA *”, „PAYU *”,
  „GOOGLE *”…, „SP ” sklepu Shopify); sieć ze słownika = jej stałe id; inaczej słowa bez miast (ok. 130 miast i
  kurortów, „?” w tekście banku = dowolna litera), kodów sklepów („Z6512”), liczb i kraju na końcu. Wyjątki: BLIK P2P i
  bankomat – bez słownika; druga strona przelewu – sieć tylko od początku nazwy, bez wycinania miast (nazwiska).
- **T86** Słownik sieci (`BRANDS`, ponad 200) i słowa kluczowe (`KEYWORDS`, 30 grup) – całe słowa, „*” = dłuższa
  końcówka, „^” = początek nazwy, pierwsze pasujące wygrywa (najpierw frazy szczególne: schronisko dla zwierząt,
  toaleta na dworcu). Kategorie przez miejsce w drzewie startowym; kategoria zarchiwizowana albo usunięta = brak
  propozycji. Taksówki jak Bolt (D69) – Rozrywka i hobby. Słowa tylko dla wydatków; słowo z tytułu przelewu
  (`byTitle`) dotyczy tej płatności – nigdy nie uczy reguły kontrahenta.
- **T87** Kolejność rozpoznania (rozszerza T37): reguła użytkownika (dokładna marka → dokładna cała nazwa sprzed
  1.2.1 → „zawiera” → słowo kluczowe użytkownika, najdłuższe) → rozpoznanie wbudowane → zwrot towaru: reguła zakupów,
  inaczej kategoria sieci → wydatek: sieć ze słownika → słowo kluczowe → bez decyzji. Reguła słowa ma tryb `keyword`
  (addytywnie w `mode`; starsza wersja go pomija).
- **T88** Grupa = marka + kierunek + propozycja (`groupKey`, `proposalSig`); temat (`importThemes`) = ta sama propozycja,
  albo – bez propozycji – ta sama podpowiedź mBanku, albo ten sam rodzaj operacji. Decyzja: wiersz → grupa → temat →
  propozycja. Stan tematu: do decyzji (bez propozycji), do sprawdzenia (sieć, słowo, rozpoznanie), gotowe (Twoja
  decyzja albo same reguły). Propozycje sieci i słów wchodzą z importem jak rozpoznanie wbudowane (widoczne w
  podglądzie); kategoria mBanku nadal tylko podpowiedzią (D68).
- **T89** Nauka reguł po marce: decyzja grupy albo tematu z „zapamiętaj” → reguła dokładna klucza marki; bez reguły,
  gdy własna reguła albo rozpoznanie mówi to samo, gdy decyzja pochodzi z tytułu albo gdy wszystkie operacje grupy są
  pominięte; kilka grup jednej marki – decyzja grupy z największą liczbą operacji, trafienia razem. „Przyjmij pewne” =
  propozycje tematów do sprawdzenia jako decyzja z zapamiętaniem; „Przyjmij podpowiedzi mBanku” – bez.
- **T90** Wyszukiwarka i zaznaczanie (D76): słowa w nazwach, kategorii mBanku i powodzie grupy (cała grupa) albo w
  opisie, tytule i dacie operacji (tylko te operacje), liczba także jako kwota; zaznaczenie grup i operacji w sesji
  importu; decyzja dla zaznaczonych tylko tam, gdzie pasuje do kierunku pieniędzy; „Nie importuj” (`choices.skip`) –
  operacja nie powstaje, kolejny plik pokaże ją znów jako nową. Zmiana reguł przy otwartym pliku (słowo kluczowe,
  usunięta reguła, inny komputer) = plan od nowa: decyzje tematów przechodzą na ich grupy, grupa ze zmienioną
  propozycją zachowuje Twoją decyzję pod tą samą marką i kierunkiem – przyjęta propozycja („Przyjmij pewne”,
  podpowiedź mBanku) ustępuje nowej propozycji (np. nowemu słowu kluczowemu).
- **T91** Operacje – decyzja zbiorcza (D76): zaznaczenie w sesji, każda zmiana filtrów i wyszukiwania je czyści, a
  zmiana dotyczy tylko zaznaczonych widocznych na liście (nigdy szkicu nowego wpisu); kategoria tylko dla wydatków
  bez podziału (reszta policzona jako pominięta), musi być wybrana; „Cofnij” przywraca operacje i reguły importu
  zapisane razem z nimi. Zapamiętanie: reguła każdej marki (zachowuje „do zwrotu”) albo wyszukiwanie jako słowo
  kluczowe (oba kierunki, gdy wśród zaznaczonych są zwroty). W imporcie słowo z wyszukiwania zapisuje się przed decyzją;
  plan liczony od nowa przenosi decyzje i zaznaczenia po operacjach (nie po marce), podpowiedź mBanku dla grupy to
  przyjęta propozycja, nie decyzja.
- **T92** Możliwy duplikat przy imporcie (D77, `looseMatch` – jedna reguła dla importu i panelu): wpis ręczny (nie korekta
  salda) po tej samej stronie, ±3 dni, ta sama kwota pod inną nazwą albo kwota różna o najwyżej max(1 zł, 3%) przy
  podobnej nazwie – po ścisłym dopasowaniu (T36), najpierw ta sama kwota, potem podobna nazwa i bliższa data, każda
  strona raz. Łączony sam, gdy pewny (podobna nazwa; albo zakup kartą najwyżej dzień obok), inaczej pyta (`ask` – łączy
  dopiero zaznaczony, jak w ICTTJ możliwy duplikat nie jest brany sam); nie połączony znajdzie potem panel duplikatów.
- **T93** Duplikaty zapisanych operacji (`shared/import/duplicates.ts`): ten sam wiersz banku dwa razy na jednym koncie
  (import na dwóch komputerach przed synchronizacją) – zostaje zadokowana, potem z większą liczbą danych użytkownika, potem
  nowsza wersja („Zaakceptuj nowsze”); wpis ręczny + kopia z banku – zostaje wpis i bierze datę, kwotę i wiersz banku.
  Zachowana bierze z kopii to, czego nie ma (cała decyzja, gdy sama jej nie ma – także XTB, przelew własny; notatki,
  godzina, dziennik). Inna decyzja w kopii = konflikt (niezaznaczony), obie zadokowane = zablokowane. Szukanie po koncie i
  dacie (±3 dni), wynik liczony raz dla wszystkich ekranów.
- **T94** Panel „Duplikaty operacji” na ekranie Import (bez otwartego pliku) i odnośnik „Możliwe duplikaty: N” w
  Operacjach: scalanie zaznaczonych, dokowania kopii przepinane na zachowaną, kopie usuwane z jednym „Cofnij”, które
  przywraca też zachowaną operację i dokowania; „to nie duplikat” zapamiętane w folderze (`settings.import.notDuplicates`:
  para id albo wiersz banku → czas; zły wpis odpada sam, nie wszystkie).
