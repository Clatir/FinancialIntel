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
- **D78** (17.10.2026) 1.2.2 – pozostałe pomysły z propozycji importu (wybór użytkownika „opcja 2”):
  - (5) podobne nazwy łączone w jedną grupę – literówki i warianty nazw spoza słownika sieci, prosta miara podobieństwa
    tekstu (wspólne słowa, ucięta nazwa, literówka), lista „to chyba to samo” do zatwierdzenia;
  - (6) nauka z decyzji – po decyzji dla grupy aplikacja proponuje regułę na słowo („wszystko zawierające ‚cukiernia’”)
    i od razu pokazuje, ile innych operacji obejmie.
- **D79** (17.10.2026) Zgłoszenie użytkownika po 1.2.2: rozpoznawanie podobnych transakcji nie działa – wiele nazw ma
  datę transakcji, a to samo słowo w nazwach (nazwa miasta, „bar”) łączy niezwiązane transakcje. Poprawka 1.2.3: nazwy bez
  dopisków banku, ostrożniejsze podobieństwo i propozycje, łączenie tylko parami, „Rozłącz wszystkie”.
- **D80** (17.10.2026) Rozliczenia z domownikami (1.3.0, prośba użytkownika: część wydatków finansują inne osoby;
  propozycja użytkownika – odjąć wydatek od wpływów tej osoby; wybrany wariant A z „Przed etapem 1.3.0”, komenda „Ok”).
  Zastępuje „jedna należność od domu (bez osób)” z D21 i rozszerza D20. Odpowiedzi użytkownika: kto płaci pierwszy –
  różnie (oba kierunki); tylko domownicy; sfinansowane wydatki widać osobno; nic dotąd nie oznaczone („do zwrotu”,
  „od domownika”) – bez przenoszenia danych. Przyjęte propozycje:
  - każdy domownik ma saldo w obie strony: należność (zapłaciłem za niego) albo zaliczka (przelał z góry);
  - wydatek – cały albo część paragonu – „finansuje: osoba”: nie zjada energii ani kopert, nie jest moim kosztem; najpierw
    bierze z zaliczki tej osoby, brakujące pieniądze pożyczają osłony (jak dotąd „do zwrotu”);
  - a. domownicy w Ustawieniach (imię i nazwy nadawcy z banku); import rozpoznaje przelew po nadawcy i podpowiada
    dopisanie nowej osoby;
  - b. wpływ od domownika najpierw wyrównuje jego należność; reszta: zaliczka albo przychód – pytanie raz, potem
    zapamiętane dla tej osoby;
  - c. zaliczka = pieniądze domowników na moim koncie, nie do wydania na siebie: osobno w stanie okrętu („Depozyt
    domowników”), nie w energii; wydatek „finansuje X” najpierw zużywa zaliczkę X;
  - d. pomost: należność bez zaliczki pożyczają osłony, zwrot wraca do osłon;
  - e. przypomnienie (odprawa i powiadomienie) o należności starszej niż 30 dni – dla każdej osoby; zaliczka tylko
    pokazywana;
  - f. gra: wydatek sfinansowany przez domownika nie jest naruszeniem i nie liczy się do kopert dnia;
  - g. w Operacjach zbiorczo „finansuje: X”; przy wpływie opcjonalnie wskazanie pokrytych wydatków (inaczej od
    najstarszych); reguła importu może oznaczać, kto finansuje (po sklepie);
  - salda na Mostku i Radarze, sfinansowane wydatki osobno w debriefingu miesiąca i Raportach.
- **D81** (18.10.2026) Domownicy bez bankowości i przychody ze średnich (1.4.0, zgłoszenie użytkownika po 1.3.0: część
  domowników nie ma konta – przekazuje pieniądze innemu domownikowi, który przelewa; w jednym przelewie bywają pieniądze
  kilku osób, a rozsupłanie historii jest niemożliwe; przychody mają wynikać też ze średnich). Odpowiedzi i komenda „Ok”:
  - przelew domyślnie należy do nadawcy; „pośrednik” (osoba, przez którą ktoś przekazuje pieniądze) to tylko
    podpowiedź – przy wpłacie przycisk „+ także za X” dzieli ją z kwotą tego, co X ma oddać (do zmiany); do tego ręczny
    podział wpłaty na dowolne osoby (jak podział paragonu); przypomnienie mówi „przekazuje przez Y”;
  - rozliczenia z domownikami od dziś (data do zmiany) z opcjonalnym saldem początkowym osoby; przelewy domowników
    sprzed tej daty nie są przychodem w statystykach;
  - panel „Przychody” (Plan miesiąca, Mostek): średnia z 3, 6 i 12 miesięcy oraz mediana, osobno „Praca i inne” i
    „Trading (XTB)” oraz suma; trading = wypłaty minus dopłaty, bez wypłat z puli Podatek; bez przelewów własnych, spłat
    i zaliczek domowników; porównanie z pensją; te same liczby w średnich przychodach silnika (ostrzeżenie „pensja
    wyższa niż średnie wpływy”). Tryb „pensja automatyczna” – nie (nie wybrany).
- **D82** (18.10.2026) Wczytywanie folderu krok po kroku (1.4.1, zgłoszenie użytkownika: na drugim komputerze
  „Otwórz istniejące” przygasza przyciski i aplikacja wisi minutami, w logu brak śladu wczytania). Propozycja przyjęta
  („Tak”): postęp wczytywania (etap, „x z N”, plik czekający najdłużej, czas) na ekranie wyboru folderu i przy starcie,
  podpowiedź „Zawsze zachowuj na tym urządzeniu”, gdy pliki czytają się wolno, „Przerwij” (bez zmian w folderze) i
  „Otwórz folder logów”, czasy etapów i długich obliczeń okna w logu, okienko przy zawieszonym oknie, szybszy odczyt
  plików pobieranych z chmury; model i thinking podawane po diagnozie, przed zmianami (prośba użytkownika).
- **D83** (18.10.2026) Wydatek finansowany przez wiele osób, także bez konta w banku (F0 z przeglądu po 1.4.1, prośba
  użytkownika: „wydatki finansowane przez wiele osób oraz przez wiele osób bez konta bankowego, np. dziadków oraz tatę,
  który może mieć albo nie mieć konta”). Odpowiedzi (zalecane przyjęte, B4 zmienione przez użytkownika):
  - dziadkowie i tata oddają pieniądze na wszystkie sposoby: przelewem z własnego konta, przez innego domownika,
    gotówką do ręki, czasem wcale (prezent);
  - zwrot gotówką – wariant A: konto „Gotówka” (portfel) w budżecie; zwrot gotówką wpływa na to konto, wydatki z gotówki
    dopisuje się szybkim wpisem;
  - wspólne finansowanie jednym ruchem: równo / procenty / kwoty, bez rozbijania na kategorie; moja część = mój wydatek,
    części innych osób do ich sald; to samo w szybkim wpisie, decyzji zbiorczej i regule importu;
  - babcia i dziadek jako dwie osoby (wspólna wpłata – podział wpłaty, D81);
  - opcja „sfinansowane jako prezent”: osoba płaci za mnie, nic nie jest winna, wydatek nie zjada energii.
- **D84** (18.10.2026) Decyzje z przeglądu po 1.4.1 (`docs/przeglad/`, pytania A1, C1–C15 – zalecane odpowiedzi
  przyjęte, komenda „Start E–H”):
  - A1: kolejność grup E (1.4.2 pieniądze i dane) → F (1.4.3 szybkość) → G (1.5.0 domownicy, ICTTJ i dokowanie) → H
    (1.5.1 import) jednym ciągiem bez czekania na komendę między grupami; każda grupa z własnym PR i wydaniem; przerwa
    tylko przy czerwonym CI nie do naprawienia w grupie, pytaniu spoza tych odpowiedzi albo zgłoszonym problemie; po H
    pauza (D67), I i J na kolejną komendę;
  - C1: zmiany celów (archiwizacja, priorytet, kwota, nowy cel) działają od dnia zmiany – odłożone pieniądze zostają;
  - C2: przy archiwizacji celu z pieniędzmi pytanie „przenieś środki do: osłony / inny cel / zostaw w celu”;
  - C3: scenariusz ICTTJ zapamiętany przy pierwszym podłączeniu; zmiana tylko ręcznie, z ostrzeżeniem o archiwizacji
    celów;
  - C4: kopia dzienna także w zasobniku, kopie bez `.history`, 14 dziennych + 8 tygodniowych zamiast 30 dziennych;
  - C5: baner „folder otwarty też na …” tylko, gdy drugi komputer był używany w ostatnich 10 min; komputer w zasobniku
    nie zapisuje w tle;
  - C6: aktualizacja – baner „Uruchom ponownie teraz”, instalacja także przy pełnym zamknięciu i przy starcie Windows;
  - C7: próg dziennika kapitańskiego 0 zł = nie pytaj nigdy, wszędzie tak samo;
  - C8: kreator startu z krokiem folderu ICTTJ i celów (krótkie, do pominięcia);
  - C9: zrobić – odprawa o ustalonej godzinie z powiadomieniem, w debriefingu Raportów seria, trafność dziennika i plan
    następnego miesiąca; wykreślić ze specyfikacji – automatyczny odsłuch, osobne godziny każdego powiadomienia, edycję
    rozkazów w Dowództwie (zostają w Ustawieniach), radar / Wywiad / krzywą na Mostku;
  - C10: ekran „Nowa klasa” najwyżej raz na miesiąc dla danej klasy;
  - C11: potwierdzenie salda z pliku banku zalicza misję „Inwentaryzacja” tylko dla mBanku;
  - C12: cel z terminem – tylko pokazanie potrzebnej raty (bez odkładania z pensji – D13);
  - C13: ulgi z PIT-37 / PIT-36 (F39) – odpadają, jeśli brak takiego dochodu (do potwierdzenia przy grupie K);
  - C14: wpisy z telefonu (F41) – nie teraz;
  - C15: funkcje – pierwsza paczka F1–F8, F13, F21, F22, F42; druga (później) F9–F12, F16, F18, F19, F24, F25, F29; bez
    F27, F32–F41, F43.
- **D85** (19.10.2026) Dwa pytania z grupy G – „zgadzam się na to, jak jest teraz”:
  - prezent bez zaliczki: osoba „płaci za mnie” (prezent), a nie ma u mnie zaliczki – resztę pokrywają osłony, nikt nic
    nie jest winien (jak w 1.5.0);
  - B41 część 1: słowo kluczowe z tytułu decyduje także przy przelewie od rozpoznanego domownika (np. „oszczędności” →
    przelew własny) – bez zmian; B41 zamknięte.
- **D86** (19.10.2026) Komenda „Start I–L” i zgoda na wszystkie propozycje: grupy I (1.5.2 liczby się zgadzają), J
  (1.5.3 system, folder, dwa komputery), K (1.5.4 wydajność – reszta), L (1.6.0 funkcje) jednym ciągiem jak E–H (D84
  A1: własny PR i wydanie na grupę, pauza po L). Przyjęte propozycje:
  - J, B29: skrót szybkiego wpisu Ctrl+Alt+litera polskiego znaku (A, C, E, L, N, O, S, X, Z) nie do ustawienia, a już
    ustawiony zamieniany na domyślny z komunikatem;
  - J, N20 / F21: komputer „w użyciu” = ruch w oknie w ostatnich 10 min; baner „folder otwarty też na …” tylko wtedy;
    komputer tylko w zasobniku nie zamraża dni gry w tle; powiadomienia na komputerze w użyciu, a gdy żaden nie jest –
    na każdym (jak dotąd); kopia dzienna na każdym (jak dotąd);
  - L, F1: kontener miesięczny ma stan zapłacone / czeka / po terminie (termin = dzień płatności z historii, „po terminie”
    3 dni po nim), alarm w odprawie i powiadomienie do wyłączenia, kontenery miesięczne na Radarze;
  - L, F3: odzyskanie z kopii – wybrane wpisy (podgląd różnic, nowa wersja z historią i „Cofnij”) albo cały folder
    (kopia rozpakowana do nowego folderu obok i przełączenie na niego; bieżący nigdy nienadpisywany);
  - L, F6: „Meldunki do rozpatrzenia” – jedna skrzynka z licznikiem w menu bocznym (niezadokowane wypłaty z ICTTJ,
    konflikty i pliki z błędem, operacje bez kategorii, możliwe duplikaty, otwarte zwroty, saldo niepotwierdzone ponad
    30 dni, nierozstrzygnięte łupy), bez nowych powiadomień;
  - L, F7: szybki wpis seriami – Enter zapisuje, Esc zamyka (D70 bez zmian), Ctrl+Enter = zapisz i następny; „Powtórz
    ostatni” i 5 ostatnich kombinacji kontrahent + kategoria jako szablony (bez edytora szablonów); „wczoraj”; działania
    w kwocie („12+8,5”); szkic po Esc czeka do następnego otwarcia (najwyżej 30 min).
  W zakresie także pozycje, o których użytkownik już zdecydował: N7 – krok folderu ICTTJ i celów w kreatorze (D84 C8),
  F13 – mądrzejsze wieczorne przypomnienie (pierwsza paczka funkcji, D84 C15) w grupie L.
- **D87** (19.10.2026) Zgoda na całość dalszych prac jednym ciągiem, bez przerw między grupami (komenda po propozycji
  z 19.10.2026 – D67 na ten ciąg zawieszone): poprawki niskich pozycji przeglądu po 1.4.1 – M (1.6.1 liczby, plan,
  raporty, Mostek), N (1.6.2 gra, ICTTJ, domownicy, cele, kreator), O (1.6.3 import), P (1.6.4 Operacje, edytor, szybki
  wpis), Q (1.6.5 folder, system, dwa komputery), R (1.6.6 teksty, wygląd, wygoda z F30 i F40) – i funkcje: S (1.7.0
  Operacje: F10, F11, F12, F18, F19, F33), T (1.8.0 przyszłość: F15, F16, F26, F27, F28, F35, F37), U (1.9.0 ładownia i
  czujniki: F9, F14, F23, F31, F34), V (1.10.0 Wywiad: F17, F20, F24, F25, F29, F36). Każda grupa z własnym PR i
  wydaniem (D71). Przyjęte zalecane odpowiedzi:
  - F10: przelew między kontami budżetu = jedna operacja z kontem źródłowym i docelowym; import z banku łączy z nią obie
    strony zamiast dwóch osobnych wpisów;
  - F15: potrzebna rata miesięczna celu z terminem zawsze widoczna; odkładka z pensji tylko jako opcja celu, brana po
    osłonach i kadłubie (kolejność D13 bez zmian);
  - F28: „pokryj przekroczenie z innej koperty” – gra ocenia dzień według stanu sprzed przesunięcia (D73 bez zmian);
  - F24: majątek netto jako druga linia wykresu; krzywa majątku (D73, T81) bez zmian;
  - F36: inflacja GUS wpisywana ręcznie, bez pobierania z sieci.
  Poza zakresem, każda do osobnej decyzji: F32 (flota rezerwowa), F38 (paragony i gwarancje), F39 (ulgi PIT-37 / 36),
  F41 (wpisy z telefonu), F43 (archiwizacja starych lat).
- **D88** (20.10.2026) Po wydaniu 1.10.0 – odpowiedź na dwie propozycje („Ok co do 1, drugie nie”):
  - tak: 1.10.1 – zamknięcie aplikacji bez fałszywego pytania o niezapisane zmiany („zapis jeszcze trwa” – job Windows
    w PR #32 i #34): zapis przy zamykaniu w rundach, zapisy w tle wstrzymane na czas zapisu (T301);
  - nie: F32 (flota rezerwowa – IKE, IKZE, PPK, lokaty), F38 (paragony i gwarancje przy operacji), F39 (ulgi PIT-37 /
    PIT-36), F41 (wpisy z telefonu przez OneDrive), F43 (archiwizacja starych lat) – odrzucone, poza planem.

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
  screenów). Kopia przed importem – w E2. **Od 1.4.3 zastąpione przez T154** (D84 C4: 14 dziennych + 8 tygodniowych,
  kopia dzienna także w zasobniku).
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
- **T95** Połączone nazwy (D78, `shared/import/aliases.ts`, `settings.import.aliases`: klucz marki → klucz, z którym jest
  jedną, z nazwami do listy w Ustawieniach): reguła szuka najpierw marki po połączeniu, potem marki z nazwy, potem całej
  nazwy (reguła połączonej nazwy działa dalej, gdy ta druga nie ma swojej); nazwa połączona z siecią ze słownika jest tą
  siecią (jej kategoria). Łańcuchy zawsze o jednym kroku (`withMerged` przepina wcześniejsze połączenia); para połączona
  na dwóch komputerach w przeciwne strony (pętla) daje wszystkim jej nazwom jeden klucz – pierwszy w kolejności. Rekord,
  więc dwa komputery scalają się po kluczach; zły wpis odpada sam. To samo w Operacjach („Zapamiętaj”, decyzja
  zbiorcza). „Cofnij” w komunikacie przywraca tylko zmienione klucze; „rozłącz” w Ustawieniach → Import z banku. Zmiana
  połączeń liczy otwarty plik od nowa (jak zmiana reguł). Połączone nazwy to jedna grupa także wtedy, gdy rozpoznana
  jest tylko jedna z nich: operacje bez rozpoznania biorą najczęstsze rozpoznanie pozostałych nazw (reguła, sieć, słowo
  nazwy – „jak „KAWIARNIA MOKKA” (połączone nazwy)”); rozpoznanie aplikacji (bankomat, przelew własny), słowo z tytułu
  i płatność kontenera (łączona po dokładnym odbiorcy) nie przechodzą.
- **T96** Podobne nazwy (D78, `shared/import/similar.ts`): tylko nazwy spoza słownika sieci, z pliku między sobą i z markami
  Twoich reguł spoza pliku (etykieta reguły = nazwa z banku). Rodzaje: „ucięta nazwa” (krótszy klucz ≥ 12 znaków jest
  początkiem dłuższego), „te same słowa” (słowa wyróżniające jednej nazwy w drugiej – bez ogólnych: „sklep”, „rynek”,
  miesiące, słowa wbudowanych słów kluczowych; osoba – przelew – co najmniej dwa słowa; jedno słowo ostatnie w obu nazwach
  to raczej miejscowość dwóch sklepów, chyba że to cała jedna nazwa), „literówka” (odległość edycji ≤ 1 przy kluczu ≥ 6
  znaków, ≤ 2 przy ≥ 12; nie przy osobach – „MARIA” i „MARTA KOWALSKA” to dwie osoby), „ta sama nazwa na początku”
  (pierwsze słowo ≥ 5 liter, nie przy osobach). Reguła całej nazwy sprzed 1.2.1, która już rozpoznaje nazwę z pliku, nie
  jest „inną nazwą”. Porównywane tylko nazwy ze wspólnym słowem, początkiem albo końcem klucza (historia z lat ma setki
  nazw); najwyżej 60 par. Cel połączenia: nazwa z regułą, potem z większą liczbą operacji, potem dłuższy klucz.
  „Połącz wszystkie” pomija parę, która połączyłaby dwie nazwy z regułami (wprost albo przez trzecią) – taką łączy się
  pojedynczo i wtedy decyduje reguła nazwy, w którą łączy. „To nie to samo”: `settings.import.notSimilar` (para kluczy →
  czas), powrót w Ustawieniach.
- **T97** „Połącz nazwy” dla zaznaczonych grup (co najmniej dwie marki, najwyżej jedna sieć ze słownika – inaczej przycisku
  nie ma): gdy podobieństwo nie wystarcza; z siecią – łączy się w nią; inaczej cel jak w T96. Nazwy połączone już
  wcześniej (np. na drugim komputerze) – komunikat „Te nazwy są już połączone”, bez „Cofnij”.
- **T98** Propozycja reguły (D78, `shared/import/learn.ts`): tylko pod grupą, której decyzję użytkownik zmienił ostatnio
  pojedynczo (nie decyzja zbiorcza, nie podpowiedź mBanku), do „nie, dziękuję” albo kolejnej decyzji; do 3 słów. Słowa z
  nazwy (przelew – z tytułu: druga strona to często osoba), co najmniej 4 litery, bez ogólnych, miast, miejscowości z
  pliku (ostatnie słowo nazw – bez formy prawnej – sieci i innej marki albo trzech marek, nie słowo kluczowe: „DINO
  ŚWIEBODZICE”, ale nie „PIEKARNIA GRZYBEK” i „CUKIERNIA GRZYBEK”), osób (słowa nazw stron przelewów i właściciela
  rachunku – także w innej formie: imię bez końcowej samogłoski + do 3 liter końcówki, „ANNY” = „ANNA”, ale „KARMA” ≠
  „KAROL”), bez Twoich słów. Tylko decyzje, które trzyma słowo kluczowe: wydatek (też do zwrotu), wpływ (też od
  domownika), przelew własny – pożyczka, XTB i podatek są decyzją dla każdej operacji. Liczba = operacje innych grup tego kierunku bez
  Twojej decyzji i nie pominięte, którym reguła słowa zmieni decyzję (dokładna reguła marki i dłuższe słowo mają
  pierwszeństwo – `findRule`); słowo, które złapałoby inne, dłuższe słowo (więcej niż 2 litery końcówki – „auto” →
  „AUTOMATSPEC”), nie jest proponowane. Przyjęta propozycja = Twoje słowo kluczowe z całą decyzją grupy (kategoria, do
  zwrotu, od domownika, przelew własny…).
- **T99** Pomiar 1.2.2: na pliku użytkownika (271 operacji) 2 pary podobnych nazw (obie trafne) i propozycje słowa przy
  4 grupach; syntetyczna historia (4000 operacji, ~1000 marek, 400 reguł) – podobne nazwy 64 ms, propozycja ok. 30 ms.
- **T100** Dopiski banku (`shared/import/names.ts` `cleanBankName`, D79): z nazwy znika „DATA TRANSAKCJI: …” (i
  operacji, wykonania, księgowania, waluty), każda data i godzina, zamaskowany numer karty i „Ref …”; miasto po
  ostatnim „/” na końcu (historia rachunku mBanku: sklep w 19 znakach, zaraz za nim „/Miasto” w 10 znakach dowolną
  wielkością liter – albo telefon, strona, nic – potem „DATA TRANSAKCJI: RRRR-MM-DD”) tylko w nazwie sklepu z tym
  dopiskiem daty i bez spacji po „/” – nigdy druga osoba wspólnego konta w przelewie („JAN KOWALSKI / ANNA KOWALSKA”)
  ani nazwa wpisana ręcznie („Czynsz/mieszkanie”, „AC/DC”); nazwa bez niczego innego zostaje. Parser: kontrahent bez
  dopisków, płatność kartą z historii (`ZAKUP`, `BLIK ZAKUP`, `PŁATNOŚĆ`, `TRANSAKCJA`, `ZWROT`, `POS ZWROT` bez
  nadawcy) – sklep z tytułu, bez tytułu; `description` bez zmian, więc klucz wiersza
  (`rowIdentity`) ten sam co we wcześniejszych importach. `brandOf` czyści też nazwy zapisane wcześniej (Operacje),
  `counterpartyKey` – bez miasta. Reguły nauczone przed 1.2.3: `MbankRow.bankName` / `BankRow.bankName` = nazwa
  dokładnie tak, jak czytały ją wcześniejsze wersje ('' = nazwał ją rodzaj operacji), `RuleTarget.legacy` = jej klucze
  (`raw`) – szukane po marce i nazwie połączonej, przed kluczem całej nazwy; także w Operacjach.
- **T101** Podobne nazwy ostrożniej: słowo, które jest w nazwach więcej niż 4 różnych marek pliku (liczone też dla sieci),
  nie wyróżnia nazwy (miasto, słowa banku, rodzaj lokalu) – sieć z 5 i więcej oddziałami spoza słownika łączy się więc
  propozycją słowa albo „Połącz nazwy”, nie parą; miasta, rodzaje miejsc i instytucji (`isKindWord`: „pracownia”,
  „szkoła”, „klub” – nie są ogólne dla słów kluczowych) i słowa banku też nie; „ta sama nazwa na początku” tylko dla
  słowa wyróżniającego; reguła nauczona na nazwie z dopiskami sklepu z pliku nie jest „inną nazwą”. Łączenie wyłącznie
  parami („Połącz wszystkie” usunięte – zła para mogła połączyć się bez czytania). Ustawienia → „Połączone nazwy”:
  połączenia z 1.2.2 na nazwach z dopiskami oznaczone jako nieaktywne (nic już nie łączą) i „Usuń nieaktywne”, a także
  „Rozłącz wszystkie” – oba z „Cofnij”.
- **T102** Propozycja słowa: bez słów z nazw lub tytułów ponad połowy marek pliku (przy co najmniej 6 markach) i bez
  słów banku; słowo łapie inne tylko z polską końcówką rzeczownika albo przymiotnika (-a, -e, -i, -o, -u, -y, -ie, -om,
  -ów, -em, -ej, -ym, -im, -ich, -ych, -ego, -emu, -iej, -iem, -ach, -ami, -owi, -owie, -owa, -owy, -owe, -owej, -owym,
  -owego) – inne przedłużenie to inne słowo („roma” – „roman”), a propozycja go nie pokazuje. Słowo kluczowe złożone
  tylko ze słów ogólnych i słów banku („data”, „sklep”) jest odrzucane (`saveKeywordRule`); rodzaje miejsc nie.
- **T103** Test E2E na syntetycznej historii rachunku (`tests/fixtures/mbank/historia_rachunku.csv`, bez danych
  użytkownika, w formacie banku: sklep w 19 znakach, „/Miasto”, daty DD.MM.RRRR): sklep z trzech dni w jednej grupie,
  sklepy jednego miasta bez par, zapisane nazwy bez dopisków, opis z banku z datą.
- **T104** Sprawdzenie na prawdziwej historii rachunku użytkownika (1023 operacje, 727 płatności z „DATA TRANSAKCJI”;
  plik tylko do odczytu poza repozytorium) przed wydaniem 1.2.3 pokazało format, którego pierwsza wersja poprawki nie
  znała (miasto bez spacji przed „/” i małymi literami) – stąd T100 w obecnej postaci, oraz:
  - grupa nazwana rodzajem operacji (bez nadawcy: bankomat, prowizja) nie jest „podobną nazwą” (`similar.ts`);
  - prowizja banku bez nazwy (`isFeeOperation` – PROWIZJA, OPŁATA, ODSETKI, PODATEK; to samo co `opKindOf` 'fee'): jej
    tytuł mówi o innej operacji (sklep zakupu), więc słowo kluczowe tytułu jej nie decyduje (`ruleTargetOf` – tytuł
    pusty) i propozycja słowa się z niej nie uczy;
  - „POS ZWROT TOWARU” = zwrot towaru (sklep z tytułu, kategoria zakupów sklepu);
  - propozycja słowa czyta nazwę sklepu bez pośrednika płatności przed nią (`withoutProcessor` – ta sama lista co
    `brandOf`), więc nie podsuwa „sumup”;
  - forma prawna ucięta przez bank („… SP. Z”) zostaje częścią nazwy – nazwa z pełną formą to para „podobnych nazw”
    (zmiana klucza zgubiłaby reguły i połączenia zapisane na nim).
  Wynik: 4 pary podobnych nazw (wszystkie trafne), 193 grupy, propozycje słowa przy 43 grupach – bez miast, słów banku i
  pośredników; lista operacji użytkownika (271) bez zmian (1 trafna para).

### 1.3.0 – rozliczenia z domownikami (18.10.2026)

- **T105** Rejestr rozliczeń (D80, `shared/calc/household.ts` `settleHousehold`): liczony z operacji, nigdy zapisywany,
  w kolejności silnika (data, godzina – bez godziny pierwsza, utworzenie, id). Saldo osoby w obie strony: ma oddać
  (kolejka otwartych zakupów, od najstarszego) albo zaliczka. Wydatek finansowany (część z `refundable`, osoba
  `financerOf` = `memberId`, bez niego pierwszy domownik) bierze najpierw z zaliczki, resztę pożyczają osłony; wpłata
  domownika (`income` z `memberId`) spłaca najpierw zakupy z `covers`, potem najstarsze, reszta to zaliczka (`advance`)
  albo przychód; zwrot towaru z zakupu domownika to jego pieniądze (spłata, reszta zaliczka). Spłata jest dynamiczna:
  zakup oznaczony później z wcześniejszą datą sam zamienia przychód w spłatę. Przepływy operacji (`byTx`: z zaliczki,
  pożyczone, spłata, zaliczka, przychód) czytają silnik warstw, edytor, raporty i misja – jeden rejestr
  (`FleetState.household`; bez floty `fleet.ts` `householdOf`).
- **T106** Start budżetu: salda osób zerowane przy pierwszej operacji od startu (jak pożyczki – T70) – to, co było przed
  startem, jest w saldzie otwarcia; przepływy sprzed startu zostają dla statystyk (ile z wpłaty było przychodem – od 1.4.0
  przychód sprzed daty rozliczeń pomijany, T119; N49). Konto
  dołączone po starcie: jego operacje sprzed jego salda otwarcia są w tym saldzie (silnik je pomija – `counts`), więc
  rejestr też (`openings`). Jedna reguła salda otwarcia w mocy (`balances.ts` `openingsOf` / `openingOf`: najpóźniejsze
  do dziś, z jednego dnia ostatnio edytowane) – silnik, start budżetu i rejestr.
- **T107** Warstwy (`fleet.ts`): nowa warstwa `deposit` (zaliczki domowników), wliczona do sumy warstw – suma warstw =
  salda kont. Zakup finansowany: część z zaliczki z depozytu, reszta z osłon (+ należność); wpłata: spłata do osłon
  (− należność), zaliczka do depozytu, przychód dokuje jak dostawa. Zakup finansowany nie zjada energii ani kopert,
  nie jest kosztem (`costOf`) ani naruszeniem w grze; wpłata domownika jest przychodem statystyk tylko w części
  „przychód” (`incomeOf(t, rejestr)`). `receivables.members` – saldo każdej osoby, `house` – suma należności,
  `houseSince` – najstarszy otwarty zakup.
- **T108** Zapisy sprzed 1.3.0: `refundable` bez `memberId` należy do pierwszego domownika (`HOUSE_MEMBER_ID` =
  `fixedId('MEM', 1)`, „Dom” na domyślnej liście); wpływ z `repaid` > 0 bez osoby to pieniądze „Domu” spłacające
  najwyżej `repaid` (D20), reszta przychód. Nowe zapisy mają `repaid` = 0 – decyduje rejestr. Pola addytywne
  (`memberId`, `advance`, `covers` w operacji, `memberId` w części paragonu i w regule, `settings.household`) –
  `SCHEMA_VERSION` bez zmian; 1.2.x zachowuje je (`looseObject`), ale liczy po swojemu (jedna należność domu).
- **T109** Domownicy (`settings.household.members`: `id`, `name` 1–40 znaków, `bankNames` do 20, `inflow` pytaj /
  zaliczka / przychód, `archived`): usunięcie = archiwum (saldo nadal liczone; w listach wyboru aktywni i już wybrany).
  Imiona unikalne (Ustawienia; „+ domownik” z importu dopisuje „2”, „3”…). Odpowiedź „zaliczka / przychód” (D80 b,
  `rememberInflows`): pierwsza jawna decyzja dla osoby z „pytaj” (import – decyzja tematu, grupy albo wiersza; edytor;
  szybki wpis; przy kilku w jednym imporcie – częstsza) zostaje jej ustawieniem; potem zmiana tylko w Ustawieniach,
  a pojedyncza wpłata może być inna.
- **T110** Import (`classify.ts`, `reconcile.ts`): domownik po nazwie w banku (`memberOf`: każde słowo nazwy z banku
  ≥ 2 litery w nazwie nadawcy; nazwa z jednego słowa – tylko cała nazwa nadawcy), tylko przelewy przychodzące
  (PRZELEW, BLIK P2P, WPŁATA, UZNANIE, ZLECENIE), po przelewie własnym. „Pytaj” = propozycja „od domownika – reszta
  jako przychód” do decyzji (`source: 'none'`) we własnym temacie (temat z propozycji, nie temat przelewów obcych osób
  – jego decyzja nie zabiera osoby); inaczej rozpoznane (`builtin`). Reguła zwykłego wpływu bez osoby (nauczona przed
  dopisaniem osoby albo przed 1.3.0, także „od domownika” bez osoby) ustępuje domownikowi; reguła z osobą, przelew
  własny i inne rodzaje – nie. Opcje decyzji: „Finansuje: X” (wydatek z kategorią) i „Od domownika: X – reszta jako
  przychód / zaliczka” dla każdej aktywnej osoby (i tej, którą decyzja już wskazuje). „+ domownik” przy grupie
  przelewów przychodzących od nieznanej osoby: osoba z pierwszego słowa nazwy z banku, grupa od razu jej (plan liczony
  od nowa przenosi decyzję po operacjach). Reguły, słowa kluczowe, duplikaty i scalanie zachowują osobę (`memberId`).
- **T111** Przypomnienie (D80 e): zakup osoby nieoddany dłużej niż 30 dni (`HOUSE_DAYS`) od najstarszego otwartego –
  pozycja odprawy dla każdej osoby (klucz: osoba i data najstarszego zakupu – nowy zakup jej nie odnawia, spłata
  najstarszego tak) i powiadomienie „Rozliczenie z domownikiem” (tag radar, `notify.house`, domyślnie włączone).
  Zaliczka jest tylko pokazywana. Misja „Rozlicz się z domownikami” = suma spłat tygodnia z rejestru silnika na dzień
  oceny (`householdOf`).
- **T112** Ekrany:
  - Ustawienia → Domownicy: lista, nazwy w banku (Enter dodaje), pytaj / zaliczka / przychód, saldo, archiwum;
  - edytor operacji: „Finansuje” (cały wydatek i każda część paragonu) z tym, co zrobił z tego rejestr („z zaliczki …,
    pożyczone z osłon … (ma oddać)”); przy wpływie „Od domownika”: reszta przychód / zaliczka, przepływy, saldo osoby,
    „Pokrywa” (otwarte zakupy osoby do daty wpłaty; inaczej od najstarszych); osoba wybrana przed wpisaniem kwoty
    zostaje;
  - szybki wpis: rodzaj „Za domownika” (bez wybranej osoby zapis odmawia), osoba przy części paragonu, „Od domownika”
    przy wpływie z podglądem („wyrównuje …, reszta … jako zaliczka / przychód”);
  - Operacje: „Ustaw finansującego” dla zaznaczonych wydatków bez podziału (z „Cofnij”), oznaczenie „domownik”;
  - Mostek: „Depozyt domowników” w stanie okrętu, „Rozliczenia z domownikami” (osoba: ma oddać od …, albo zaliczka),
    ostatnie operacje „finansuje: X” / „od: X” zamiast kategorii; Radar – salda osób w „Należnościach”;
  - Plan miesiąca i Raporty: „Sfinansowane przez domowników (osoby) – nie Twoje koszty” w debriefingu i przeglądzie
    rocznym; CSV i Excel – kolumna „Finansuje” zamiast „Do zwrotu”.
- **T113** Statystyki (`weekNumbers`, `yearNumbers`, `monthRows`): przychód z rejestru silnika (`FleetState.household`),
  liczonego raz; bez floty – rejestr całej historii.
- **T114** Przegląd 1.3.0 (`/code-review` high, 10 kandydatów – wszystkie poprawione): rejestr jak silnik przy koncie
  dołączonym później (T106); reguła sprzed dopisania osoby i osobny temat domownika (T110); szybki wpis bez osoby (T112;
  podgląd i zapis czytają brak osoby jak rejestr); misja na dzień oceny (T111); osoba wybrana przy kwocie 0; jeden
  rejestr dla ekranów zamiast drugiego liczenia; rejestr tygodnia liczony raz; jedna reguła salda otwarcia; unikalne
  imiona.

### 1.4.0 – domownicy bez bankowości i przychody (18.10.2026)

- **T115** Data rozliczeń (D81, `settings.household.since`): brak = jeszcze nie wybrana – 1.4.0 przy pierwszym otwarciu
  folderu (zapis w tle, nie w folderze tylko do odczytu) ustawia dziś, a salda osób do wczoraj (tak, jak liczyła je 1.3.0)
  zapisuje jako ich saldo na start – nic oznaczonego wcześniej nie ginie; null = od startu budżetu (jak 1.3.0); data z
  przyszłości odrzucana. Data obowiązuje nie wcześniej niż start budżetu (`settleFromOf`). Rejestr zeruje salda przy
  starcie budżetu (jak 1.3.0) i drugi raz w dniu rozliczeń – wtedy salda osób to ich `opening` (należność jako otwarta
  pozycja `opening:<osoba>` z tą datą; przypomnienie mówi „saldo na start rozliczeń”). Operacje konta sprzed jego salda
  otwarcia liczone od startu budżetu, jak w silniku.
- **T116** Silnik w dniu rozliczeń (zdarzenie `household`, po saldach otwarcia kont, przed operacjami dnia): depozyt
  ustawiany na sumę zaliczek na start – to, co trzymał wcześniej, wraca do osłon, brakujące bierze z osłon (zaliczki to
  pieniądze domowników na moich kontach). Suma warstw = salda kont dalej.
- **T117** Podział wpłaty (D81): `splits` wpływu = części innych osób (`memberId`, null = mój przychód; `advance` – reszta
  części jako zaliczka); reszta kwoty jest nadawcy (`memberId` operacji, jego `advance`); części ponad kwotę ucinane
  (`incomeShares`). Każda część spłaca swoją osobę (zakupy z „Pokrywa” najpierw), reszta to zaliczka albo przychód; do
  warstw dokuje kwota minus spłaty i zaliczki (`heldOf`). Podział zostaje tylko przy tym samym rodzaju operacji (paragon
  wydatku i części wpływu to różne rzeczy). Lista operacji i CSV pokazują „od: osoby”, duplikaty porównują osoby części.
- **T118** Pośrednik (`member.via`): tylko podpowiedź – przy wpłacie nadawcy przycisk „+ także za X (ma oddać …)”
  (kwota = co X był winien tuż przed tą wpłatą – rejestr operacji przed nią, nie dzisiejszy), w szybkim wpisie pole „W tym
  za X”; nigdy nic samo. Przypomnienie i Radar: „przekazuje przez: Y”.
- **T119** Przychód do statystyk (`calc/income.ts`, jedno źródło dla panelu „Przychody”, średniej silnika i raportów):
  praca = wpływy bez spłat i zaliczek domowników (`heldOf`; części domowników, których rejestr nie rozliczył, też nie);
  pieniądze domowników sprzed daty rozliczeń (oznaczone, podzielone albo po nazwie w banku – `isMemberMoney`) – nie
  przychód; trading = wypłaty z konta tradingowego minus dopłaty, bez pieniędzy puli Podatek (dokowanie z pulą albo
  część `split.taxHold`; także zwrot puli do kapitału), netto w okresie i nigdy poniżej zera (miesiąc, okno, rok – rok
  netto w całym roku, miesiące każdy osobno).
- **T120** Panel „Przychody” (`FleetState.incomeStats`): pełne miesiące przed bieżącym od pierwszego pełnego miesiąca
  historii, ostatnie 12; średnie 3 / 6 / 12 (krótsza historia – tyle, ile jest) i mediany 12 miesięcy, osobno praca,
  trading, razem; porównanie średniej 6 miesięcy z pensją. `FleetState.income` (ostrzeżenie „pensja wyższa niż średnie
  wpływy”) = razem z 6 miesięcy.
- **T121** Ustawienia → Domownicy: „Rozliczenia od” (data albo „od startu budżetu”), przy osobie „Na start rozliczeń: ma
  oddać / zaliczka” (rodzaj wynika z zapisanego salda, wybierany przy pustym) i „Pieniądze przekazuje przez”; historia
  zmian nazywa nowe pola.
- **T122** Przegląd 1.4.0 (`/code-review` high, 10 kandydatów – wszystkie poprawione): salda 1.3.0 przenoszone przy
  pierwszym ustawieniu daty (T115), zerowanie przy starcie budżetu przy późniejszej dacie (T115), wykluczenie
  przychodów od efektywnej daty rozliczeń (T119), części domowników bez rozliczenia poza przychodem (T119), trading
  netto w całym roku (T119), pole salda na start zgodne z danymi (T121), kwota „+ także za” na dzień wpłaty (T118), CSV i
  duplikaty z częściami wpłaty (T117), decyzje T115–T122.

### 1.4.1 – wczytywanie folderu (18.10.2026)

- **T123** Przyczyna zawieszenia (D82): log bez „opened” = proces główny stał na odczycie plików. OneDrive na nowym
  komputerze trzyma pliki tylko online i pobiera każdy przy pierwszym odczycie, a Node czyta pliki na puli 4 wątków
  (libuv) – cztery czekające odczyty zatrzymywały każdą inną operację na plikach (sprawdzone w Electronie na FIFO: przy
  4 wątkach `stat` czekał, przy większej puli trwał 45 ms). `main/threadpool.ts` (importowany pierwszy) ustawia
  `UV_THREADPOOL_SIZE` 32, odczyt (otwarcie i pełne odświeżenie) idzie po `READ_CONCURRENCY` 24 pliki – zawsze zostają
  wolne wątki na zapis, kopie i obecność.
- **T124** Postęp (`DataStore.open({signal, slowMs, onCommit})`, `ReadTracker` w `main/datastore/progress.ts`): etapy
  list → read → migrate → prepare, „x z N”, plik czekający najdłużej, odczyty wolne (≥ `SLOW_FILE_MS` 3 s),
  najwolniejsze pliki i czasy etapów (`loadStats`); `openFolder` dokłada inspect i machines, wysyła `OpenProgress` do
  okna co 250 ms (`fi:openProgress`) i pisze wiersz do logu co 10 s („open start / progress / aborted / failed /
  superseded”, przy „opened” czasy i najwolniejsze pliki) – log mówi, gdzie stanęło, nawet gdy aplikację zamknięto.
- **T125** „Przerwij” (`cancelOpen`): działa do końca odczytu – `untilAborted` zwalnia okno od razu, odczyty w toku
  kończą się same, nowe nie startują, przerwane otwarcie nie migruje i nie sprząta folderu (wynik `aborted`, komunikat
  „nic nie zostało zmienione”, „Spróbuj ponownie”). Od migracji (`onCommit`) otwarcie już się nie przerywa – przycisk
  wyłączony. Nowsze otwarcie wygrywa ze starszym (`openGeneration`), `closeStore` odłącza wszystko przed czekaniem;
  obecność innych komputerów czeka najwyżej 2 s.
- **T126** Okno: `OpenProgressPanel` na ekranie wyboru folderu i przy starcie (zamiast samego „Wczytywanie…”), podpowiedź
  „Zawsze zachowuj na tym urządzeniu” przy wolnych odczytach, „Folder logów (diagnostyka)” na ekranie wyboru. Długie
  obliczenia okna (`timed`: silnik budżetu, gra, saldo na start) zgłaszane procesowi głównemu – czas ≥ 500 ms do logu;
  okno, które nie odpowiada (`unresponsive`), to wiersz w logu z etapem danego okna i po 10 s okienko z „Otwórz folder
  logów”. Testowe `FI_OPEN_DELAY_MS` / `FI_OPEN_SLOW_MS` (E2E `tests/e2e/open.spec.ts`).
- **T127** Przegląd 1.4.1 (`/code-review` high, 8 kandydatów): poprawione – przerwanie w trakcie migracji (T125),
  pełne odświeżenie po 64 pliki (T123), krótki powrót paska do „Szukanie plików”, „Przerwij” bez skutku po odczycie,
  przeplatanie dwóch otwarć i przeciek obserwatora (T125), stan wykrywania zawieszeń po awarii okna, etapy obliczeń
  mieszane między oknami (T126); bez zmian – 24 odczyty naraz zamiast 64 nie spowalniają lokalnego folderu (wcześniej
  i tak szły najwyżej 4 naraz – pula wątków).

### 1.4.2 – pieniądze i dane się zgadzają (grupa E, 18.10.2026)

- **T128** Cele od chwili zmiany (D84 C1, B2): cel ma `activeFrom` (dodany w 1.4.2 albo później – bierze pieniądze od
  tej chwili), `past` (stan – kolejność, kwota, archiwizacja – sprzed każdej zmiany, z chwilą `until`) i `transfers`.
  Pieniądze idą do celów w stanie z chwili, gdy przyszły do FI (`cameIn`): utworzenie dokowania (nie jego ostatni zapis –
  scalenie duplikatów czy synchronizacja nie przenoszą pieniędzy), bez dokowania utworzenie operacji, nigdy wcześniej niż
  początek jej dnia; łupy – chwila decyzji (`decidedAt`), dokowanie przy starcie – koniec dnia startu. Cel sprzed 1.4.2 bez
  historii działa jak wcześniej (`goalDecided`). Każda zmiana zostaje w historii, także kilka w krótkim czasie: kolejność
  jest wspólna dla wszystkich celów – stan wycięty z historii jednego celu remisowałby albo zamieniał go z innym (scalanie
  bliskich zmian sprawdzone i odrzucone – archiwizacja tuż po dodaniu zabierała celowi pieniądze).
- **T129** Pieniądze celu (D84 C2, B30): archiwizacja celu z pieniędzmi pyta – osłony / inny cel / zostają; przeniesienie =
  wpis `transfers` {at, to, amount}, silnik na koniec dnia przenosi `min(kwota, stan)` (nigdy więcej, niż cel ma);
  „przenieś środki” na liście zarchiwizowanych także później (cele ICTTJ spoza scenariusza też); „Cofnij” przywraca cel.
- **T130** Scenariusz ICTTJ (D84 C3): scenariusz zapamiętany w `fi.json` przy pierwszym podłączeniu (ostatnio zmieniany
  w ICTTJ – `chosenForecast`); zmiana w Ustawieniach → ICTTJ dopiero po potwierdzeniu z listą celów do archiwizacji (ich
  pieniądze zostają).
- **T131** Wydatek z celu (N1): `goalId` tylko przy wydatku; cel i kontener wykluczają się; cel płaci, ile ma, reszta z
  osłon; zmiana rodzaju operacji zdejmuje cel.
- **T132** Zmiana daty „Rozliczenia od” (B3): `rebaseOpenings` liczy nowe salda na start z rejestru – późniejsza data:
  saldo w dniu przed nią; wcześniejsza: stare saldo na start minus to, co rejestr przypisuje dniom między datami; komunikat
  z „Cofnij” (poprzednie salda i data).
- **T133** Temat importu domownika „pytaj” (B4): podpis propozycji z osobą – każda osoba ma własny temat.
- **T134** Dwa formaty pliku (B5): operacja z banku pamięta format pliku (`bank.source`; starsze – głos po `importedAt`,
  `formatsOf`) i klucze drugiego formatu (`altKeys`, najwyżej 20). Wiersz drugiego formatu = zaksięgowana operacja tego
  konta z tą samą kwotą ±3 dni i podobną nazwą, tylko z dni objętych plikiem (`coverageOf`: okres pliku, inaczej jego
  pierwszy i ostatni dzień) – operacja spoza okresu nie może być w pliku, a wiersz obok niej to inna operacja. Panel
  duplikatów (`bank-format`) łączy pary zaimportowane wcześniej, każdą w dniach importu drugiej strony.
- **T135** Cykl opłaty okresowej (B55, B6): płatność zamyka cykl miesiąca terminu; przy cyklu ≥ 3 miesięcy także płatność
  w miesiącu przed terminem (np. 1. w poniedziałek) – gdy poprzedni cykl jest zamknięty (zapłacony albo sprzed śledzenia
  opłaty: przed startem budżetu i jej `from`), inaczej to zaległa zapłata poprzedniego cyklu. Zapłacony cykl: bez rat,
  zbiornik zbiera na następny, odprawa i Radar pokazują następny termin (`nextUnpaidOf`, `paidDue`).
- **T136** Życie kontenera (B56): opłata okresowa dodana albo zmieniona na okresową w trakcie budżetu zbiera od bieżącego
  miesiąca (`from`); archiwizacja zapisuje `archivedAt` i liczy się do końca swojego miesiąca (zarchiwizowany sprzed 1.4.2
  bez daty – nigdy); po końcu życia (`until`, archiwizacja) resztka zbiornika wraca do osłon (zdarzenie `tank`).
- **T137** Edytor kontenera (B1): `MonthField` (zapis po wyjściu z pola, nieczytelny miesiąc – komunikat i poprzednia
  wartość), cykl „inny…” liczbą po wyjściu z pola, nazwa przez `NameInput` (pusta – komunikat).
- **T138** Plan miesiąca (B11, B46): nowy plan ma stałe id miesiąca (`monthPlanId`) – dwa komputery piszą ten sam rekord;
  zmiana pensji albo kopert minionego miesiąca najpierw zamraża następny miesiąc jako jego własny plan (kopia planu w mocy),
  więc bieżący i kolejne się nie zmieniają.
- **T139** Łupy na ekranie (B10): debriefing i raport biorą podział z dziennika silnika (`lootApplied`, zdarzenie `loot` z
  `ref` = miesiąc łupów), a nie zapisane kwoty decyzji; gdy łupy zmieniły się po decyzji – „było …, jest …”.
- **T140** Folder danych – odczyt, zapis, usunięcie (B9, B42, B49, B50): błąd odczytu nie jest treścią pliku – problem
  `readError` czytany ponownie przy następnym odświeżeniu i przed zapisem w to miejsce (tylko pliki tego wpisu; zbiór
  `unreadable`), nigdy odsuwany jak uszkodzony; rekord przeczytany wcześniej zostaje. Zapis wpisu, którego plik właśnie
  zniknął: przeniesiony (inna data) – w nowe miejsce, usunięty – `RemovedOutsideError` z usunięciem dla okna (pytanie),
  zapis wraca po „Zachowaj”. Usunięcie: wersja „usunięty” w historii cofana, gdy plik się nie dał usunąć (ponawianie
  `withRetry`, komunikat). Listy plików bez rozkładania tablic (stos przy 125 tys.); obcy błąd otwarcia (kod systemu,
  błąd środowiska) po polsku z odesłaniem do logu.
- **T141** Konflikty (B44–B46): odrzucona wersja do historii wpisu (powód 'discarded'; plan miesiąca o innym id – pod id
  planu, który zostaje, więc nigdy „usunięty wpis”, który historia wstawiłaby drugi raz na ten miesiąc); „Zachowaj
  oryginał” bez czytelnego oryginału – odmowa; kopia i oryginał w nowszym formacie – odmowa; uszkodzony oryginał
  odsunięty, nie nadpisany. Plan miesiąca, którego plik ma już inny rekord: moja wersja jako kopia
  `RRRR-MM-KOMPUTER.json` do wyboru w Synchronizacji (`ConflictCopyError`, okno go zapomina), bez ponawiania.
- **T142** Zamykanie (B43): proces główny czeka na kolejkę zapisów (najwyżej 30 s), w trakcie zamykania bez skanu folderu
  (fokus, obserwator); okno, które jeszcze zapisuje, mówi o tym co 1 s (`fi:flushing`) – cisza 4 s = okno nie odpowiada,
  najwyżej 60 s, potem pytanie jak przy nieudanym zapisie.
- **T143** Scalanie trójstronne (B47, B48): klucz nieobecny w znanej bazie (`MISSING`) dodany po jednej stronie to nie
  konflikt; wybór „Weź z …” / „Usuń też tutaj” dla wpisu zapisanego w międzyczasie (`savedAfter`) zapisuje się jeszcze raz.
- **T144** Szybki wpis i pola (B51, B24): id operacji nadaje okno szybkiego wpisu, główne okno odpowiada „Zapisano” bez
  drugiego zapisu znanego id; po sukcesie okno zablokowane do następnego otwarcia, nowy szkic od razu; Esc okna w fazie
  przechwytywania (pole ze szkicem by go zatrzymało); zegar chowania po „Zapisano” kasowany przy ponownym otwarciu. Esc w
  polach kwoty, daty, godziny, miesiąca i nazwy odrzuca szkic (`cancelled` – blur po Esc idzie z propsami poprzedniego
  renderu) i nie przechodzi dalej, gdy był szkic.
- **T145** Przegląd grupy E (`/code-review` high, 10 kandydatów): poprawione 9 – drugi format tylko w dniach pliku i w
  zakresach importów (T134), chwila wpływu z utworzenia dokowania (T128), Esc w polach (T144, przy okazji całe B24),
  ponawianie usunięcia (T140), usunięcie i kopia planu do okna w tym samym kroku kolejki (T140, T141), zaległa zapłata
  a wczesna (T135), zbiór nieczytelnych plików zamiast przeglądania wszystkich (T140), komunikat błędu otwarcia po
  rodzaju błędu (T140), odrzucony plan miesiąca pod id zachowanego (T141); bez zmian – historia celów bez skracania (T128).
  Przy okazji: Esc w szybkim wpisie z wpisaną kwotą nie zamykał okna (test przechodził dzięki zegarowi z poprzedniego
  zapisu) – T144.
- **T146** Okno – silnik i gra (W9–W11, W16): silnik liczony po dniu warszawskim (nie co minutę) i tylko przy zmianie
  tego, co czyta – klucz z referencji części ustawień i map kolekcji (`KEY_SETTINGS`, `KEY_COLLECTIONS`); gra – części
  silnika + `settings.game` + `game`; jedna lista rekordów na mapę dla wszystkich ekranów (`listOf`). Raporty bez oceny
  dnia dzisiejszego. Zaległe dni gry porcjami po 2 dni (każdy dzień to cały przebieg silnika), kolejna porcja po
  zapisaniu poprzedniej; misja tygodnia po nadrobieniu; miesiąc gry zapisany przez nowszą wersję (tylko do odczytu)
  pominięty – porcja nigdy na nim nie utyka.
- **T147** Echo zapisu (W3, W5): odpowiedź zapisu i własna zmiana z dysku, które różnią się tylko polami zapisu
  (`updatedAt`, `updatedBy`, `schemaVersion`), wchodzą do mapy na miejsce – bez nowej mapy i przeliczenia; usunięcie wpisu,
  którego w pamięci już nie ma, mapy nie kopiuje; ustawienia z dysku dzielą niezmienione części; zadania tła okna w
  osobnym komponencie (zmiana rekordów nie renderuje całego okna).
- **T148** Pola tekstowe (W2, zgodnie z T34): kontrahent, tytuł i notatki operacji oraz kontenera – szkic do wyjścia z pola
  (Enter, Ctrl+Enter w polu wielowierszowym; Esc cofa); termin celu – pole miesiąca. Tekst zmieniony w międzyczasie na
  innym komputerze: wygrywa wpisany tutaj, okno o tym mówi, tamta wersja jest w historii wpisu (proces główny zawsze
  zachowuje nadpisywaną wersję innego komputera) – rzadkie, bo FI nie pracuje na dwóch komputerach naraz.
- **T149** Ekrany (W4, W6, W12–W15): licznik możliwych duplikatów 1,5 s po ostatniej zmianie (pełna lista na żądanie);
  `findDuplicates` najpierw tania kwota, potem nazwa; klucz nazwy i jej słowa raz na nazwę (pamięć do 50 tys. nazw), dni ±3
  raz na datę – 150 tys. operacji: 0,6 s zamiast 7,9 s. Propozycje opłat stałych bez kwadratowego grupowania, klucz
  odbiorcy raz na rekord, propozycje po sygnaturze odbiorców; domownik po nazwie raz na nazwę; dostawy bez mapy
  wszystkich operacji; tekst wyszukiwania raz na rekord; podpowiedzi oficera raz na mapę operacji.
- **T150** Magazyn w procesie głównym (W1, W8, W26): indeks plików aktualizowany przy każdym `set` / `delete` (ścieżki
  rekordu, problemy, kopie, katalogi, rekordy do migracji); widoki i różnice tylko dla zmienionych rekordów, w testach
  porównywane z pełną przebudową (`FI_VERIFY_VIEWS`); zapis i usuwanie paczką (`saveRecords` / `deleteRecords`: jedna
  zmiana dla okna, usunięcie z zewnątrz w osobnej) – import, zbiorcza kategoria i finansujący, sprzątanie duplikatów i jego
  „Cofnij”; tekst pliku tylko dla rekordów do migracji. W oknie: zapis po nieudanym nigdy nie czeka w nieskończoność,
  odpowiedź, której nie da się przyjąć, = zapisy ponawiane po jednym; wpis, którego dysk nie dał usunąć, wraca z
  niezapisanymi zmianami i je zapisuje.
- **T151** Obserwator i odświeżanie (W21, W22): jedno odświeżenie naraz, zaległe łączone (`RefreshQueue`: ścieżki
  sumowane, pełne wygrywa); pełna kontrola co 5 min przy obserwatorze natywnym (Windows), 30 s na Linuksie, przy fokusie
  okna najwyżej raz na minutę; jej listowanie i `stat` przed kolejką zapisów (zapis w trakcie czeka 0,05–0,1 s, nie 1–5 s),
  w kolejce czytane tylko pliki o innym `stat`. Zdarzenie katalogu (`change` – Windows zgłasza je przy każdym zapisie w
  nim): wpisy katalogu porównane z plikami znanymi w nim, nowy podkatalog cały; katalog, który się pojawił, zniknął albo
  zmienił nazwę (`rename`, np. odzyskany z kosza z plikami o tych samych nazwach) – zgłaszany jako `katalog/`, wszystko
  pod nim czytane ponownie, gdzie zmienił się `stat`; ścieżka spoza kolekcji – nic; katalog, którego nie da się odczytać –
  pełne przeskanowanie.
- **T152** Konflikty (W23): rozstrzygnięcie i „Do Kosza” zwracają zmianę z kolejki magazynu, bez przeskanowania folderu
  (wcześniejsze przeskanowanie oznaczało też obce zmiany jako „własne”); „Zachowaj nowsze” – jedno żądanie
  `resolveConflicts` w kolejności planu, grupa z nieudanym zachowaniem kopii zostaje (`skipped`), jedna zmiana dla okna.
- **T153** Otwarcie (W24): plik bez wcześniejszego stanu czytany jednym otwarciem (`stat` z uchwytu); pliki tymczasowe
  przerwanych zapisów zebrane przy pierwszym przejściu folderu (także w katalogu głównym).
- **T154** Kopie (W7, F2, N19, D84 C4 – zastępuje T20): ZIP pisany własnym zapisem w jednym przejściu (yazl szukał
  kolejnego wpisu od pierwszego – czas rósł z kwadratem liczby plików), ZIP64 od 65 535 wpisów, kompresja na miejscu
  porcjami (mały plik szybciej skompresować niż oddać do puli wątków); kopie danych (dzienna, tygodniowa, ręczna, przed
  importem, eksport ZIP) z rekordów w pamięci magazynu, gdy ich zapis daje te same bajty co plik (SHA-1), inaczej z dysku;
  plik nieczytelny (OneDrive) przerywa kopię – nigdy kopia bez niego, która z czasem wypchnęłaby pełne; przed kopią
  dzienną i ręczną pełna kontrola folderu; kopia przed migracją – z dysku (oryginały), bez wchodzenia do `.history/`.
  Kopia dzienna przy otwarciu, co godzinę i po wybudzeniu komputera; zostaje 14 dziennych i 8 tygodniowych (z dnia
  tygodnia ISO; pierwsze tygodniowe z dziennych sprzed 1.4.3 – najnowsza z każdego tygodnia); w Ustawieniach wiek
  ostatniej kopii, ostrzeżenie po 3 dniach. Bez ZIP-a przed operacjami zbiorczymi (F2 go proponował): mają „Cofnij” i
  historię, a ZIP przy każdym zaznaczeniu kosztowałby sekundy i miejsce w OneDrive.
- **T155** Przegląd grupy F (`/code-review` high, 7 kandydatów): poprawione wszystkie – kopia z pamięci tylko bajt w bajt
  (T154), plik nieczytelny przerywa kopię (T154), gra nie utyka na miesiącu nowszej wersji (T146), komunikat przy tekście
  zmienionym w międzyczasie (T148), katalog odzyskany w całości czytany od nowa (T151), zapis paczką nigdy nie blokuje
  następnych i wpis nieusunięty zachowuje zmiany (T150). Pomiar okna przy 150 tys. pokazał 5,9 s zawieszenia przy liczeniu
  duplikatów – przyspieszone (T149).
- **T156** Wspólne finansowanie (D83, F0): operacja `expense` z opisem `share` {`mode` równo / procenty / kwoty, `lines`
  {`memberId` – null = ja, `value`, `gift`}} i liniami `splits` – jedna na osobę, kategoria operacji, część domownika
  `refundable` z jego `memberId`. Prawdą są linie: każda wersja (także 1.4.x) czyta je jak paragon z częściami domowników,
  więc te same pieniądze liczą się tak samo; `share` mówi tylko, jak je zrobiono (`shareOf` sprawdza, że linie wciąż go
  słuchają – ręczna zmiana linii zostawia zwykły paragon). Nowa kwota (edytor, wiersz banku z „nierozliczonej”,
  scalenie wpisu ręcznego z importem) robi linie od nowa (`withAmount`); zmiana kategorii też. Grosze: równo – części
  ucięte, reszta w ostatniej (T3); procenty – każda zaokrąglona, ostatnia bierze resztę (suma ≠ 100 % – edytor
  ostrzega, szybki wpis, decyzja zbiorcza i import jej nie przyjmą; procenty po równo – ucięte, ostatnia reszta do 100,
  `equalPercents`); kwoty – wpisane części innych, moja linia (bez niej ostatnia) bierze resztę (`restIndex`), nigdy
  ponad całość. Kwota z banku (rozliczenie wiersza „nierozliczonej”, scalenie z wpisem ręcznym) robi od nowa tylko linie
  wspólnego zakupu – linie zwykłego paragonu zostają, jakie były (`withBankAmount`). To samo w edytorze, szybkim wpisie, decyzji zbiorczej Operacji i importu (równo / procenty – kwoty
  zależą od operacji) i w regule importu (`importRuleSchema.share`, `ImportDecision.share`). Pola addytywne, opcjonalne –
  zapis bez `gift: false` i bez `share` przy zwykłej operacji.
- **T157** Prezent (D83 „sfinansowane jako prezent”): `gift: true` przy operacji z jednym finansującym („prezent od: X”)
  albo przy linii wspólnego zakupu. Rejestr: najpierw zaliczka tej osoby, resztę płacą osłony (`MemberFlow.gift`) – nikt
  nic nie jest winien, wydatek nie zjada energii, kopert ani mojego kosztu; zwrot towaru z prezentu wraca do osłon.
  Gdy zaliczki brakuje – reszta z osłon (propozycja zgodna z D83 „nic nie jest winna”; pytanie do użytkownika otwarte,
  „Przed grupą H”). Gra: prezent tak jak zakup domownika (N5 – T161).
- **T158** Konto „Gotówka” (D83 wariant A): rodzaj konta `cash` (`ACCOUNT_KINDS`, starsza wersja zachowuje wartość –
  T33), stałe id `CASH_ACCOUNT_ID` = `fixedId('ACC', 3)`; nowy folder ma je od razu, istniejący dostaje raz przy wczytaniu
  (`settings.seeded` 'account:gotowka'; pominięte, gdy jest konto o tym id albo tej nazwie). W kreatorze saldo gotówki
  nieobowiązkowe (puste = 0 zł); zwrot gotówką – wpływ na tym koncie, wydatki z portfela – szybki wpis.
- **T159** Operacje domowników spoza sald na start (B14): `settings.household.openingIds` = operacje, które salda na
  start obejmują – domowników, z datą od startu budżetu do dnia przed rozliczeniami, zapisane razem z saldami
  (`openingIdsOf`: pierwsze ustawienie daty rozliczeń, każda zmiana daty; folder sprzed 1.5.0 – przy pierwszym starcie
  1.5.0 te, które wtedy są). Operacja z tego okresu spoza listy – dopisana później (import z opóźnieniem, drugi komputer),
  z datą przesuniętą sprzed rozliczeń albo z domownikiem dopisanym potem – rejestr liczy zaraz po saldach na start
  (`HouseholdLedger.late`, depozyt na start silnika + `lateDeposit`); lista zamiast chwili ustalenia sald, bo sam czas
  utworzenia nie widzi zmiany daty ani domownika. Wcześniejsza data rozliczeń nie odejmuje od salda na start operacji,
  których ono nie obejmowało (`rebaseOpenings`). Saldo na start wpisane ręcznie – bez tych operacji (mówi o tym
  Ustawienia → Domownicy, `household-since-late`, z ich liczbą). Data rozliczeń nowego folderu (`seedSince`) = dzień po
  ostatniej operacji z banku, najpóźniej dziś (bez importu – dziś). Operacja z listy przeniesiona za dzień rozliczeń liczy
  się jeszcze raz – jak w 1.4.x (rzadkie; saldo na start do poprawy ręcznie).
- **T160** Import a domownicy (B40, B41): reguła „finansuje: X” działa w obie strony – zwrot towaru z zakupu domownika
  (wpływ) to jego pieniądze („Zwrot towaru – dla: X”), także zwrot kartą („POS ZWROT”) z reguły zakupu; prezent i wspólny
  podział też. Reguła zapamiętana jeszcze raz (edytor, decyzja zbiorcza, import) dostaje całą nową decyzję – bez
  podziału albo prezentu, których nowa nie ma; „Zapamiętaj” i „zapamiętaj dla ich marek” zapisują też, kto finansuje. Połączone nazwy (`shareMerged`) nie oddają decyzji wierszowi rozpoznanemu jako pieniądze domownika, chyba
  że dawca jest tą samą osobą (B41 część 2). Część 1 B41 – słowo kluczowe z tytułu wygrywa z rozpoznanym domownikiem –
  czeka na decyzję użytkownika (doprecyzowanie T110, „Przed grupą H”); bez zmian.
- **T161** Gra a domownicy (N5, zgodnie z D80 f / T107): naruszenia ciszy nocnej i impulsu, tag „judas” i misje „cicho” /
  „bez impulsu” liczą tylko moją część zakupu (`ownSpent`); sprawdzenie osłon poniżej minimum oddaje to, co tego dnia
  pożyczyły domownikom albo zapłaciły za ich prezent – zakup za kogoś nie daje poważnego naruszenia.
- **T162** Dostawy z ICTTJ (B15–B19, B21, B22; zmienia T63): dokowanie, którego operacji już nie ma, nic nie dokuje
  (`orphans` – usuwane przy ponownym dokowaniu, usunięcie operacji usuwa jej dokowania, „Cofnij” je przywraca); wpis
  usunięty w ICTTJ zwalnia operację – dokuje się jeszcze raz (`entryGone`), gdy wszystkie foldery wypłat ICTTJ dały się
  odczytać, a pliku tego wpisu nie ma wśród nieczytelnych (`IctjSnapshot.unread` / `complete` – id z nazwy pliku;
  ostrzeżenie o nowszym formacie ICTTJ niczego nie blokuje); zmiana puli wpisu po
  dokowaniu – znaczek „pula zmieniona”, ponowne dokowanie bierze nową (`poolChanged`); dwa dokowania jednego wpisu (dwa
  komputery) – liczy się dokowanie operacji z banku przed dopisaną na Portfelu XTB, potem starsze; drugie do usunięcia
  jednym przyciskiem razem z jego operacją Portfela (`extra`); id operacji Portfela XTB i dokowania
  z wpisu ICTTJ (`derivedId`; data operacji Portfela z wpisu, dokowania – z jego operacji: drugi komputer pisze ten sam
  plik, nie drugą operację); „Portfel XTB?” dopiero, gdy
  plik z banku konta, na które przychodzą pieniądze XTB, sięga dalej niż okno (`settings.import.coveredTo` – okres pliku,
  nie chwila importu); start budżetu po dacie pieniędzy w banku (wpis sprzed startu z parą po nim dokuje; para sprzed
  startu = salda otwarcia; bez Portfela XTB dla okna zaczętego przed startem); para innej kwoty (≤ max(5 zł, 1 %), do
  4 dni po oknie – przelew po świętach, przewalutowanie) dopiero po wszystkich dokładnych – znaczek „inna kwota”, liczy się
  kwota banku, nigdy Portfel XTB obok.
- **T163** Gra czeka na dokowanie (B20, wariant „najtaniej” z przeglądu): dzień z parą wypłaty ICTTJ jeszcze
  niezadokowaną nie zamarza (`pendingPairDays`, `advanceGame` `hold`, liczone z bieżących dostaw – także po pominięciu
  wpisu czy nowym odczycie ICTTJ) – najwyżej 7 dni, potem zamarza jak dotąd. Silnik
  do dokowania nadal liczy parę zwykłą kolejnością (pula dopiero z rekordem dokowania – wariant „pełniej” bez zmian).
- **T164** Dni robocze (F42, zmienia T63): bez sobót, niedziel i polskich świąt ustawowych – stałe (1.01, 6.01, 1.05,
  3.05, 15.08, 1.11, 11.11, 25–26.12; 24.12 od 2025), Wielkanoc i poniedziałek wielkanocny, Zielone Świątki (+49 dni),
  Boże Ciało (+60) – `isPolishHoliday` / `isWorkingDay` (`calc/dates.ts`), tylko w oknie pary i 3 dniach roboczych D72.
- **T165** Przegląd grupy G (`/code-review` high, 10 kandydatów): poprawione wszystkie – reguła zapamiętana jeszcze raz
  bez starego podziału czy prezentu (T160), saldo na start i operacje spoza niego przy wcześniejszej dacie rozliczeń, po
  zmianie daty albo domownika (T159), dokowanie operacji z banku przed Portfelem XTB (T162), kwota z banku nie zmienia
  linii paragonu (T156), wpis usunięty w ICTTJ także przy ostrzeżeniach odczytu (T162), procenty ≠ 100 % niezapisywane
  zbiorczo i w imporcie (T156), wstrzymanie gry liczone z bieżących dostaw (T163), jedna reguła reszty i procentów po równo
  w edytorze i obliczeniach (T156). Każda poprawka z testem sprawdzonym bez niej (pada).
- **T166** Import z mBanku (grupa H, B34–B39): przelew przychodzący od osoby z otwartą pożyczką udzieloną z Radaru
  (`loanOf` – nazwa w banku, najstarsza otwarta) to jej zwrot (`decision.loanId`, propozycja do sprawdzenia); opcje
  `loan:<id>` w decyzjach (Radar), zamknięta pożyczka tylko gdy już wybrana. Klucz wiersza zależy od konta
  (`keyOnAccount`): ta sama operacja na innym koncie budżetu to `elsewhere` – zaimportowana tam (klucz tamtego konta) =
  plik trafił na złe konto, przenoszona tu domyślnie; przeniesiona tam przez użytkownika – zostaje (`ImportChoices.moveHere`);
  duplikaty szukają też między kontami. Konto, którego pliki są z innego rachunku banku (oba numery znane – T168,
  `otherBankAccount`), ma swoje operacje: ta sama płatność tego samego dnia na dwóch rachunkach to dwie operacje – ani
  `elsewhere`, ani duplikat. Wpis ręczny „Nie łącz” dostaje rozpoznanie i grupę jak inne wiersze pliku
  (`merge.planned`). Decyzja „Ustaw” bez kategorii niedostępna, wydatek bez kategorii nikogo innego nie uczy reguły
  (`learnable`, zasłoniłby sieć). Plan od nowa po zmianie reguł, połączonych nazw, domowników, nazwisk, kategorii,
  kontenerów, pożyczek i operacji (`planInputs`, porównanie referencji), tuż przed zapisem jeszcze raz z historią usunięć –
  inny wynik (`planSignature`) = podgląd od nowa i komunikat; temat zachowuje decyzję użytkownika po przeliczeniu, propozycja
  przyjęta hurtem („Przyjmij pewne”) ustępuje nowej.
- **T167** Sesja importu (N12–N16): zamknięcie pliku albo wczytanie innego, gdy są decyzje – stan sesji w toaście z
  „Cofnij” (przeliczony na danych z tej chwili); błędny plik nie zamyka otwartego (błąd z nazwą pliku). Plik bez nic
  nowego zapisuje „ostatni import”, okres pliku i wpis do dziennika misji, bez kopii przed importem i bez rekordów (N13).
  Pożyczka, PIT-38 i XTB (`PER_OPERATION_KINDS`) nigdy nie są regułą; reguła sprzed 1.5.1 takiego rodzaju daje tylko
  propozycję (N14). „Zapamiętaj” uczy po nazwie, którą pisze bank (`bankNameOf`, nazwa użytkownika w nawiasie – N15);
  propozycja reguły na słowo pokazuje całą decyzję (`ruleDecisionText` – N16).
- **T168** „Cofnij import” (F4): każdy import, który coś zmienia, zapisuje paczkę – kolekcja `imports/` (`importBatchSchema`,
  układ 'id', addytywnie; starsza wersja jej nie czyta): utworzone operacje (id), zmienione – wersja przed i po importie,
  usunięte (nierozliczone, które zniknęły z banku), reguły przed i po (`rulesChanged`), ustawienia przed i po (ostatni
  import, zasięg plików, numer rachunku, zapamiętane wpłaty domowników), dopisane nazwisko z pliku, potwierdzenie salda z
  pliku (T169); dziesięć ostatnich (`batchesToDrop`). Cofa się od ostatniej stojącej paczki (`latestImport` – stos: późniejszy
  import mógł rozliczyć albo połączyć to, co utworzył wcześniejszy). Cofnięcie (`undoPlan`, `settingsUndone`): utworzone
  operacje usuwane – także zmienione potem (okno podaje ich liczbę, toast ma „Cofnij”) – z powodem historii `undo`: są na
  liście usuniętych (Synchronizacja – do odzyskania z ich zmianami), ale kolejnego importu nie blokują (T39 –
  `deletedBankKeys` pomija `undo`; starsza wersja szuka tylko `_delete_`); zmienione wpisy – scalanie trójstronne
  (baza = wersja po imporcie, zmiana użytkownika wygrywa); usunięte – odzyskane, gdy ich nie ma; reguła nowa – usunięta,
  zmieniona – jak przed importem, zmieniona albo usunięta potem – zostaje; ustawienia – każde tylko, gdy wciąż jest takie,
  jak import je ustawił; wpis dziennika misji znika. Operacja paczki, której na tym komputerze nie ma i nigdy nie było (bez
  wersji w historii – jeszcze się synchronizuje albo usunięta poza aplikacją), wstrzymuje cofnięcie z komunikatem i
  „Cofnij mimo to”; plik, którego dysk nie oddał (zajęty), zostawia import nietknięty – ponowne „Cofnij import” kończy.
  „Cofnij” cofnięcia (`settingsRedone`) ustawia znowu tylko to, co cofnięcie zmieniło – zmiana z międzyczasu zostaje.
  Paczka zapisuje się także, gdy folder nie przyjął jeszcze zapisów (ponawiane), a stan „po imporcie” (reguły, ustawienia,
  domownicy) jest brany zaraz po zmianach importu, nie po czekaniu na dysk. Najstarsze paczki ponad dziesięć usuwane bez
  wersji w historii (powód `drop`, main dopuszcza go tylko dla `imports/`). Numer rachunku z
  nagłówka (`accountNumberOf` – cyfry, min. 10) zapamiętany przy koncie (`settings.import.accountNumbers`, ostatni
  zaimportowany): plik z innego rachunku albo rachunku innego konta – ostrzeżenie przed importem; plik w całości
  znany – komunikat. Nieudane usunięcie nierozliczonej (plik zajęty) nie przerywa już importu – komunikat po wszystkim.
- **T169** Saldo z pliku banku (F5, C11): historia rachunku – kolejność księgowania z łańcucha sald (kolejność pliku albo
  odwrotna, potem dzień księgowania – `bookingOrder`), saldo otwarcia i zamknięcia dnia z końców łańcucha dnia (kolejność
  w dniu bez znaczenia), luka = pieniądze między dniami (albo w dniu) bez wiersza (`statementOf`; data księgowania
  `MbankRow.booked`, addytywnie). FI liczy po dacie operacji: saldo banku na koniec dnia D (od pierwszego księgowania pliku)
  = saldo przed plikiem + wiersze z datą operacji ≤ D. Porównanie (`statementCheck`) na koniec ostatniego dnia pliku;
  różnica rozłożona na: sprzed pliku (albo saldo otwarcia późniejsze niż plik – porównanie od niego), wiersze banku bez
  operacji w FI, operacje FI bez wiersza (ręczne, podwójne, niezaksięgowane, korekty), inna kwota, luki pliku, reszta;
  pierwszy dzień = najwcześniejszy z nich. Zgodne i konto ma saldo otwarcia – potwierdzenie z datą ostatniego dnia pliku
  zapisuje się samo (bez drugiego takiego samego), jest w paczce importu (cofnięcie je usuwa). Misja „Inwentaryzacja”
  liczy je jak każde potwierdzenie – dla konta pliku (C11). Bez zgodności nic się nie zapisuje samo: „Potwierdź z korektą”
  (albo „Ustaw saldo otwarcia z pliku”) to ręczna, ostatnia opcja. Lista operacji (bez sald) – bez telemetrii.
- **T170** Oficer (F8): kategoria po kluczu marki (`ruleTargetOf` z nazwy, a operacji z banku – z jej nazwy w banku, jak
  reguły; połączone nazwy), kolejno: ostatnio użyta z marką (wydatki, 2000 najnowszych – W15), reguła importu (także
  słowo kluczowe), kategoria sieci ze słownika (`officerHint`); zarchiwizowana nie. Szybki wpis dostaje `lastByBrand`,
  reguły i połączone nazwy (`QuickData`), lista kontrahentów – jedna nazwa na markę (sieć – jej nazwa). Edytor operacji
  bez kategorii – „oficer: …”. Marka operacji liczona raz na wersję rekordu (`officerTarget`, WeakMap; rekordy nie
  zmieniają się w miejscu); 2000 najnowszych bez sortowania całej listy (próg dnia z liczników dni).
- **T171** Audyt reguł (F22): reguła z progiem kwoty to nowy tryb `amount` (klucz marki + `maxAmount` w groszach, bez
  znaku; addytywnie – starsza wersja nie zna trybu i bierze zwykłą regułę marki): przed regułą `exact` marki, najciaśniejszy
  próg, tylko gdy kwota jest znana (`findRule(…, amount)`). Uczenie z decyzji grupy, którą rozstrzygnęła reguła z progiem,
  zmienia tę regułę, nie zwykłą (`ruleDecisionOf`); `upsertRule` progów nie dotyka. Audyt (`startAudit` / `feedAudit` /
  `finishAudit`, porcjami po 2000 operacji – duży folder nie zatrzymuje ekranu): operacje z banku, które reguła łapie dziś,
  wydatki reguły wydatku z inną kategorią albo finansującym (`withRule` – kategoria, finansujący, prezent, wspólny podział;
  paragon podzielony ręcznie pominięty), operacje innego rodzaju (tylko pokazane), reguły bez trafień (bez pożyczki, PIT-38,
  XTB), marki z dwiema i więcej kategoriami – próg proponowany, gdy dokładnie dwie kategorie nie zachodzą na siebie kwotami
  (pełne złote nad największą mniejszą, o ile nie łapie większej). „Zastosuj do historii” – tylko operacje o treści
  niezmienionej od policzenia (zapis podmienia rekord w miejscu – porównanie treści, nie obiektu), „Cofnij” – te, które
  wciąż są takie, jak je zostawiło. Zmiana reguły w ustawieniach = `learned` false.
- **T172** Przegląd grupy H (`/code-review` high, 10 kandydatów): poprawione wszystkie – ta sama płatność na dwóch
  rachunkach banku (numery rachunków – T166), cofnięcie importu z operacjami w drodze albo z plikiem zajętym, operacje
  cofniętego importu do odzyskania z listy usuniętych, paczka zapisana także przy nieudanym zapisie i ze stanem „po
  imporcie” z chwili importu, stare paczki bez historii, „Cofnij” cofnięcia bez nadpisywania zmian z międzyczasu (T168),
  „Zastosuj do historii” po treści (T171), podgląd importu nieliczony w trakcie zapisu (`replanIfChanged` czeka, po
  imporcie jedno sprawdzenie), oficer bez sortowania całej listy (T170). Poprawki z testami (numery rachunków, „Cofnij”
  cofnięcia, powód `drop`, E2E operacji usuniętej poza aplikacją) sprawdzonymi bez nich (padają).


### 1.5.2 – liczby się zgadzają (grupa I, 19.10.2026)

- **T173** Historia średnich (B23, B25; doprecyzowuje T27 i T47): jedna reguła dla silnika (średnie koszty i przychody,
  cel kadłuba) i propozycji planu (`calc/history.ts`). Początek = najstarsza operacja z banku; bez operacji z banku –
  najwcześniejsze z sald otwarcia kont i wydatków / wpływów wpisanych ręcznie (pożyczka, korekta ani przelew nigdy). Przy
  historii z banku saldo otwarcia ani wpis ręczny sprzed niej nie robią z jej pierwszego, niepełnego miesiąca pełnego.
  Pełne miesiące kalendarzowe od pierwszego objętego w całości do miesiąca przed bieżącym; miesiąc bez żadnej operacji
  (luka importów) pominięty, nie liczy się jako zero. Propozycje pensji, kopert i stałych opłat (kreator, Plan miesiąca,
  Ładownia) czytają miesiące silnika (`FleetState.historyMonths`) – miesiąc w przód nigdy nie uśrednia bieżącego; kreator
  pokazuje pierwszy z nich. Brak propozycji kopert – komunikat zamiast ciszy.
- **T174** Pożyczka bez rekordu z Radaru (B57, doprecyzowuje T31): operacja „Pożyczka” bez `loanId` zmienia tylko osłony –
  nie przychód, nie dokowanie. Po kontrahencie (klucz nazwy): wpływ najpierw zamyka otwartą pożyczkę udzieloną bez
  rekordu, reszta to pieniądze pożyczone (`borrowedNoRecord`); wypływ najpierw oddaje to, co od niego pożyczono, reszta
  to pożyczka udzielona (należność). Spłata pożyczki udzielonej z Radaru zawsze z rekordu pożyczki. Edytor mówi, że bez
  pożyczki z Radaru liczą się tylko osłony; wpływ przy jednej otwartej pożyczce udzielonej – „zwrot pożyczki …? przypisz”.
- **T175** Kontener usunięty (B58): płatność z `containerId` kontenera, którego nie ma, jest zwykłym wydatkiem
  (`isCargoPayment` – energia, koperty, debriefing, propozycje, gra), jak w silniku. Usunięcie kontenera zdejmuje
  `containerId` z jego płatności (zapis paczką); „Cofnij” łączy je ponownie – te, których w międzyczasie nie połączono z
  innym. Płatności kontenera usuniętego na innym komputerze albo przed 1.5.2 może przejąć nowy kontener tego odbiorcy
  (`unlinkedPayments` / `paymentsToLink` z id istniejących kontenerów).
- **T176** Podział dokowania a kwota (B59, B22; doprecyzowuje T63 i T162): zapisany podział (`docking.split`) silnik
  dopasowuje do kwoty operacji (`fitSplit`): podatek, potem kadłub, potem cele (zarchiwizowany pominięty), reszta do
  osłon. Okno pokazuje dopasowany podział z notką, „Zapisz podział” go utrwala. Podział liczy się zawsze od kwoty operacji
  – przy parze „inna kwota” od kwoty z banku: osłony w oknie i w zapisanym podziale też.
- **T177** Saldo otwarcia przed pensją (B60): zdarzenie salda otwarcia konta ma w dniu klucz przed pensją (`0 0a`) –
  konto otwarte 1. dnia miesiąca zasila osłony, zanim silnik wypłaci pensję tego dnia.
- **T178** Miesiąc na plus (N6; zmienia T52 w części „na plus”): miesiąc zamknięty na plus = wynik energii ≥ 0 po końcu
  miesiąca. Energia = pensja wypłacona − raty odkładek + łupy poprzedniego miesiąca dane temu (`lootExtraOf`); zużyta =
  wydatki z energii (log silnika, po zwrotach) + to, co po jej wyczerpaniu zapłaciły osłony (alarm „energia wyczerpana”).
  Opłata zapłacona ze zbiornika nie jest kosztem pensji. Bez miesiąca silnika (przed startem, bez pensji z silnika) –
  koszty netto ≤ pensja. Ten sam rachunek w debriefingu (Plan miesiąca, Raporty, eksport „Miesiące”) i misji hattrick;
  tekst alarmu: „ponad energię miesiąca (pensja po ratach odkładek) poszło z osłon”.
- **T179** Koperta zarchiwizowanej kategorii (N8): archiwizacja kategorii głównej zdejmuje jej kopertę z planu bieżącego
  miesiąca (własny plan z planu w mocy – T46) i z planów późniejszych; minione zostają (debriefing). Toast z „Cofnij” –
  kategoria i koperty wracają (miesiąc, który ma ją już znowu, zostaje przy swojej). Koperta, która została w planie
  (archiwizacja sprzed 1.5.2, minione miesiące), jest na formularzu oznaczona.
- **T180** Łupy w dziennym przydziale (N11, doprecyzowuje T28 i T30): łupy z decyzji „na następny miesiąc” podnoszą dzienne
  koperty także w „Podziale pensji” (`salarySplit` – podstawowy przydział z łupami, wiersz „w tym łupy”) i w debriefingu
  (pula dzienna = koperty dzienne + łupy wobec wydatków dziennych i bez kategorii – jak T30).
- **T181** Wolne do decyzji (N21, zgodnie z D23 i T31): `shields.free` = nadwyżka ponad cel osłon tylko przy pełnym
  kadłubie (cel znany i osiągnięty) – ta sama reguła co firewall; inaczej Mostek pokazuje „ponad cel osłon” z powodem
  (kadłub niepełny albo jego cel jeszcze nieznany).
- **T182** Kwoty w historii i synchronizacji (B7): ścieżki pól kwot w groszach (`AMOUNT_FIELDS`, `isAmountPath` /
  `isAmountKey` w `merge.ts` – segmenty `#id` i indeksy pomijane) pokazywane przez `plnText` (maska Ctrl+$) w historii
  zmian, „Zmianach z drugiego komputera”, Synchronizacji i tytułach rekordów.
- **T183** Kreator (B8, N7, N9): konto z saldem otwarcia i pustym polem – kwota silnika (saldo na koniec wczoraj,
  `balanceAt`). Krok „ICTTJ i cele” (folder ICTTJ jak w Ustawieniach, cele własne); podział środków z celami w kolejności
  priorytetów (`startSplit` jak dokowanie – D13, D70; `budget.initial.goals` tylko > 0; kadłub + cele ≤ środki). Odkładki
  pierwszego miesiąca `sinkingInstallment(c, miesiąc, 0)` dla kontenerów i wybranych propozycji z cyklem > 1, osobno rata
  dalszych miesięcy; „wydane w tym miesiącu” bez płatności opłat okresowych. Bez tekstów o „wersji 1.1”.
- **T184** Daty i liczby całkowite (B12, B26): data operacji wpisana bez roku (edytor, szybki wpis – `DateField notAfter`)
  = dzień najbliższy dacie pola spośród trzech lat, nie później niż tydzień po dziś (o ile taki dzień jest – 29.02 zostaje);
  późniejsza – z rokiem. Operacja z datą w przyszłości ma znaczek „w przyszłości”. `NumberField` z `decimals` 0 odrzuca
  ułamki; `splitEvenly` bierze całe części (harmonogram pożyczki).
- **T185** Potwierdzenia sald per konto (B28): przypomnienie w odprawie i niedzielne powiadomienie dla każdego aktywnego
  konta budżetu poza gotówką (`confirmationsOf`), klucz pozycji per konto; powiadomienie wymienia konta.
- **T186** Szybki wpis i przychody (N3, N4): podgląd szybkiego wpisu jak silnik (T30) – bez kategorii albo koperta dzienna:
  energia dziś (`energyAfter`; wydatek z wcześniejszego dnia miesiąca zmniejsza przydział pozostałych dni, inny miesiąc albo
  przyszłość – bez zmian), koperta planowana – jej stan (ten miesiąc), kategoria bez koperty – „poza kopertami”. Panel
  „Przychody”: miesiąc liczy trading jak raporty (T119 – nigdy poniżej zera), okno – netto ze wszystkich jego miesięcy
  (okres jak `incomeOfPeriod`); suma miesięcy może się więc różnić od okna, gdy trading miał w nim straty.
- **T187** Cisza nocna potwierdzona (N10; doprecyzowuje D40 i T75): nocny zakup w grze (naruszenie, smaczki, misja
  „cicho”) = godzina w ciszy nocnej i wpis w dzienniku (`isConfirmedNight`). Edytor przy godzinie w ciszy nocnej bez wpisu
  prosi o potwierdzenie albo „usuń godzinę”; nowa operacja w ciszy nocnej – bez godziny (`newOperation`).
- **T188** Przegląd grupy I (`/code-review` high, 10 kandydatów): poprawione – dzień bez roku najbliższy dacie pola
  (T184), początek historii bez banku także sprzed sald otwarcia z kreatora (T173), podział dokowania od kwoty z banku w
  oknie i w zapisie (T176), licznik płatności do połączenia z id istniejących kontenerów (T175), propozycje Ładowni z
  miesięcy silnika (T173), powód „cel kadłuba nieznany” na Mostku (T181), jedna pętla wydatków kopert w misjach gry,
  harmonogram pożyczki bez podwójnego obcięcia. Bez zmian: data bez roku dalej niż tydzień naprzód – rok wcześniej (B12 w
  D84: operacja to zapis tego, co było; późniejsza data z rokiem); okno „Przychody” netto (T186). Poprawki z testami
  sprawdzonymi bez nich (padają).
- **T189** Usuwanie plików wpisów (CI Windows PR #19): plik usuwanego wpisu, którego wersję zapisała historia (`.history/`
  – na każdym komputerze, B44), usuwa się od razu (`DataStoreOptions.remove`, domyślnie `removeFile`); do Kosza
  (`shell.trashItem`) tylko wtedy, gdy historia go nie przyjęła. Paczka importu odrzucana bez historii (`drop`) – od razu.
  Kosz Windows to ułamek sekundy na plik: „Cofnij import” setek operacji trwało minuty, a test E2E na Windows przekraczał
  limit. Kopie konfliktów i pliki z problemami – nadal do Kosza.

### 1.5.3 – system, folder i dwa komputery (grupa J, 19.10.2026)

- **T190** Skrót szybkiego wpisu a AltGr (B29, D86): `altGrConflict` – Ctrl+Alt (albo AltGr) + A, C, E, L, N, O, S, U,
  X, Z to w polskim układzie programisty znak (ą ć ę ł ń ó ś € ź ż), z Shift – wielka litera; wolny tylko z klawiszem
  Windows albo inną literą / cyfrą. U (€) dopisane do listy z D86. `machinePrefsFrom` zamienia taki skrót na domyślny,
  proces główny zapisuje zamieniony przy starcie i loguje, okno mówi o tym raz (`noticeReplacedShortcut`); pole skrótu
  go nie przyjmuje (komunikat, słucha dalej).
- **T191** Uruchamianie z systemem (B52): wpis w kluczu Run o stałej nazwie `loginItemName` („Financial Intel” albo
  „Financial Intel (portable)”); przy każdym zapisie usuwane są wpisy tego samego pliku exe o innej nazwie (dawne nazwy
  od tymczasowego folderu portable); `second-instance` z `--hidden` nie pokazuje okna. Stały AUMID wersji portable – nie
  teraz (wymaga sprawdzenia powiadomień na Windows bez skrótu w Menu Start).
- **T192** Ekran wyboru folderu (B53): wynik otwarcia niesie przyczynę (`problem`: missing / unavailable / empty / other
  / partial / ictj), `remembered`, `subfolder`; `inspect` zwraca 'missing' tylko przy ENOENT, inne błędy = 'unavailable';
  zapamiętany folder (bieżący albo z ostatnich) pusty albo niedostępny dostaje nowe dane tylko z `force` (dwa kroki
  „Zacznij od nowa” na ekranie wyboru, „Utwórz tu nowe dane” w Ustawieniach); `FI_DATA_DIR` testów zawsze z `force`.
- **T193** Okno poza ekranem (B54): `windowBounds(saved, workAreas, primary)` – zapamiętane położenie zostaje, gdy pasek
  tytułu (co najmniej 100 × 32 px) jest na którymś ekranie; inaczej okno wyśrodkowane i nie większe niż ekran główny.
- **T194** Folder tylko do odczytu (N2): `addRecord` / `addRecords` / `replaceRecords` / `updateRecord` / `updateSettings`
  zwracają, czy zmiana weszła; akcje z komunikatem sukcesu i „Cofnij” – tylko po wejściu (`canWrite()`, komunikat
  `READ_ONLY_MESSAGE` najwyżej raz na 4 s, zapisy w tle bez komunikatu); `useFolderLocked` (tylko do odczytu albo zmiana
  folderu) wyłącza pola i przyciski (fieldset, `AmountField disabled`); historia wpisu do obejrzenia (przycisk poza
  wyłączanym fieldsetem), odznaczanie w Operacjach dostępne.
- **T195** Scalanie kopii konfliktu (N17): `DataStore.mergeConflict(id, merged, asOf)` – wynik pod id oryginału (plan
  miesiąca – id zachowanego), obie strony do historii z powodem 'merge', kopia do Kosza; odmowa, gdy czas pliku którejś
  strony różni się od tego, z którego zrobiono scalenie (zapis tego wpisu, OneDrive w trakcie). W oknie każde pole, którym
  wersje się różnią, jest wyborem (`merge3` bez bazy): wersja z historii nie późniejsza niż obie strony (`mergeBase`) może
  być wcześniejszą edycją jednej strony, więc tylko podpowiada stronę, która pole zmieniła (`valueAt`); przy zmianie po
  obu stronach albo bez bazy – nowsza strona. Wybory zostają przy odświeżeniach folderu (od nowa tylko przy innych
  wersjach plików).
- **T196** Historia każdego wpisu (N18): `HistoryButton` (warianty: przycisk / ikona / link) przy planie miesiąca, celu,
  pożyczce, saldzie otwarcia, dokowaniu i przy każdym wpisie okna zmian z drugiego komputera. `Modal` przez portal do
  `document.body` i stos otwartych okien – Esc zamyka tylko wierzchnie, okno z okna przykrywa całe okno aplikacji.
- **T197** Zmiana folderu z Ustawień (B31, uzupełnia T126): w oknie `switchFolder` – najpierw zapis zmian, potem stan
  `switching` (zapisy odrzucane jak w folderze tylko do odczytu, szybki wpis odmawia), postęp z „Przerwij”, przyciski
  folderu wyłączone, na koniec `applySnapshot`. W procesie głównym każde otwarcie ma numer (`snapshot.generation`); okno
  potwierdza pokazany folder (`folderShown`) i dopiero wtedy zapisy są przyjmowane (`writableStore`); zmiany z folderu,
  który nie jest już otwarty, nie idą do okna (`sendFrom`, także odświeżenie kończące się po zmianie), zmiany nowego
  folderu sprzed potwierdzenia czekają (`unshown`) i idą po nim; błąd zapamiętania folderu po otwarciu nie jest porażką
  otwarcia.
- **T198** Komputer w użyciu (N20, F21, D86): proces główny liczy ruch w oknach – każde okno zgłasza wskaźnik, klawisz,
  kółko (najwyżej co 30 s, `reportActivity`), do tego fokus i pokazanie okna; w użyciu 10 min po ostatnim ruchu
  (`IN_USE_MS`), koniec mówiony oknu dokładnie wtedy (`fi:inUse`). Plik obecności z `activeAt`: w użyciu co minutę, w
  zasobniku co 5 min, od razu, gdy komputer znowu jest w użyciu; inne komputery widoczne do 11 min po ostatnim sygnale
  (zegar innego komputera do 5 min do przodu – też), plik bez `activeAt` (wersja sprzed 1.5.3) = w użyciu, gdy sygnał
  młodszy niż 3 min (jak dotąd). Zapisy w tle (gra, cele z ICTTJ, salda domowników na start) – tylko w użyciu.
  Powiadomienia: komputer nie w użyciu, gdy inny jest w użyciu, zapisuje je jako pokazane, nie pokazując (okno pokazane
  albo dotknięte w tej chwili = w użyciu); żaden w użyciu – każdy. Baner tylko dla komputerów w użyciu; Synchronizacja –
  stan innych i ostatnia zmiana z innego komputera (`lastRemote`: najnowszy `updatedAt` z `updatedBy` innym niż ten
  komputer, liczony przy otwarciu i z każdej zmiany).
- **T199** Pierwsze zamrożenie dni gry po otwarciu folderu (B33, uzupełnia T76): czeka 3 min od otwarcia w oknie
  (`openedAt`) i minutę od ostatniej zmiany rekordów z zewnątrz (`externalAt`, zmiana samej obecności się nie liczy);
  przy kopii konfliktu w kolekcji `game` – nie zamraża. Testy skracają czasy (`FI_FREEZE_AFTER_OPEN_MS`,
  `FI_FREEZE_QUIET_MS` → `AppInfo.freeze`).
- **T200** Odłączone panele Mostka (B27): dane i kliknięcia okien `bridge:*` obsługuje `BridgeDetachHost` w oknie głównym
  (obok `TrayStatus`, niezależnie od ekranu – `useHostedDetach`); panele na Mostku z `hosted: true` tylko otwierają,
  zamykają i przywołują okna.
- **T201** Przegląd grupy J (`/code-review` high, 9 kandydatów – wszystkie poprawione z testami): odświeżenie folderu
  kończące się po zmianie folderu nie trafia do okna; Shift przy Ctrl+Alt+litera to wielka polska litera – też nie do
  ustawienia; „Scal…” bez cichego przejmowania pól, wybory nie giną przy odświeżeniu, scalenie nieaktualnych wersji
  odrzucane; nowe dane w zapamiętanym pustym folderze z Ustawień – na wyraźne „Utwórz tu nowe dane”; słowo kluczowe nie
  melduje zapisu w trakcie zmiany folderu; „Odznacz” w folderze tylko do odczytu; ostatnia zmiana z innego komputera
  liczona przyrostowo zamiast przeglądania wszystkich wpisów.

### 1.5.4 – szybkość, reszta (grupa K, 19.10.2026)

Poprawki wydajności z przeglądu po 1.4.1 (W17–W20, W25, W27, D86). Wyniki bez zmian – każdy refaktor porównany z
wynikami starego kodu na danych syntetycznych (wzorzec poza repozytorium), pomiary na 30 i 150 tys. operacji
(`docs/postep.md` „1.5.4”).

- **T202** Silnik floty bez kluczy tekstowych (W27): operacje sortowane raz na listę (`sortedOps`, WeakMap po tablicy
  z magazynu) komparatorem (data, godzina, `createdAt`, id) – ten sam porządek co dawne sklejone klucze, bo żadna część
  nie zawiera znaku ≤ spacji; kilkaset zdarzeń kalendarza (pensja, łupy, zbiorniki…) sortowanych osobno i wplatanych
  przed operacje dwoma wskaźnikami (`evFirst`: przy równym kluczu najpierw zdarzenie – jak dotąd); salda wszystkich kont
  i ruchy sprzed startu jednym przejściem; pożyczki – przepływy wszystkich jednym przejściem (`flowsByLoan`); części
  operacji z pamięci (`partsOf`, WeakMap po rekordzie), własna część bez podziału bez tworzenia części; miesiące historii
  bez powtórzeń. Wzorzec: 800 różnych wejść + 30 tys. + skrót wyniku przy 150 tys.
- **T203** Plan importu i rozpoznanie (W18, W20): indeksy operacji konta raz na listę operacji (`budgetedOf`: po kluczu
  wiersza, opisane po dniu, nierozliczone, zaksięgowane, format, wpisy ręczne), wpisy ręczne z ±3 dni (`manualNear`,
  raz na datę); reguły jednego kierunku po trybie (`ruleIndexOf` – budowane przy pierwszym pytaniu o ten kierunek,
  wzorzec słowa kluczowego przy pierwszym użyciu), pamięć `brandOf` i `ruleTargetOf` (do 50 tys. nazw), `keywordIn`,
  `hintFor` (na indeks kategorii), odbiorcy kontenerów (`payeesOf`). Plan od nowa: po zmianie referencji tego, co czyta;
  reguły, połączone nazwy, domownicy, nazwiska, kategorie i numery rachunków w nowym obiekcie o tej samej treści
  (`deepEqual`) – bez nowego planu. Wzorzec: rozpoznanie 30 tys. wierszy przy 3 zestawach reguł (z regułami kwot,
  wpływów, domownika), plany z dopasowaniami, luźnymi, rozliczeniami, usuniętymi i znanymi, kreator.
- **T204** Ekran importu (W17): temat, marka i wiersz w `memo`, stan czytany po kluczu (`useShallow`, selektory wartości),
  temat z ponad 30 markami do rozstrzygnięcia zwinięty na start (`BIG_THEME`), listy po 100 (`ShowMore` – wspólny z oknem
  zmian): marki, wiersze, dopasowania i usunięte osobno, od pierwszej strony przy innym pliku; pominięte w marce liczone
  raz na stan pominięć (`skippedIn`); opcje kategorii raz na indeks kategorii (`categoryOptions`).
- **T205** Lista usuniętych (W19): id istniejących wpisów brane pod blokadą magazynu (jedna chwila), historia czytana
  poza nią – 16 plików naraz, zapis nie czeka; ostatnia wersja usuniętego zapamiętana w procesie głównym po nazwie pliku
  (plik historii nigdy się nie zmienia – nowa wersja to nowy plik), więc następne wczytanie czyta tylko nowe usunięcia.
  Pamięć kluczy usuniętych w oknie (pierwsza wersja K-b) odrzucona: usunięcie operacji dodanej po zapamiętaniu jej nie
  unieważniało, a historia usunięcia z drugiego komputera może przyjść później niż samo usunięcie.
- **T206** Zmiany z drugiego komputera naraz (W25): `resolveRemoteMany(decyzje)` – jedna zmiana listy czekających, jedna
  kopia mapy na kolekcję, potem zapisy (kilka wpisów kolekcji jedną paczką, jeden jak dotąd); ta sama zmiana dwa razy w
  paczce – rozstrzygnięta raz; `resolveRemote` to paczka z jedną decyzją; `acceptNewer` liczy plany przed zastosowaniem
  (plan wpisu zależy tylko od niego); `applyChange` szuka czekających po kluczu. Okno: 50 wpisów i „pokaż kolejne”,
  karta w `memo` z wywołaniami po kluczu, „Zastosuj” obejmuje wszystkie (niepokazane z wyborem domyślnym – napis pod
  listą).
- **T207** Przegląd grupy K (`/code-review` high, 7 kandydatów – wszystkie poprawione): pamięć kluczy usuniętych w oknie
  i żywa mapa w liście usuniętych (T205); paczka zapisu zapomina wpis, którego nie ma już w pamięci (jak pojedynczy
  zapis – nic nie zostaje „niezapisane”); „pokaż kolejne” dopasowań i usuniętych osobno; plakietka „nowsza” liczona przy
  każdym rysowaniu swojej karty (bez pamięci, która nie widziała stanu edycji); indeks reguł tylko pytanego kierunku i
  wzorce słów przy pierwszym użyciu (`keywordProposals` buduje listę na każde słowo); pominięte w marce liczone raz na
  stan pominięć, nie przy każdym znaku w wyszukiwarce.
- **T208** Opłaty stałe w miesiącu (F1, D86): `cargoStatuses` (`shared/calc/cargoStatus.ts`) – dzień płatności =
  środkowy (dolny) z ostatnich 6 płatności kontenera przed miesiącem, bez nich `dueDay` kontenera; płatności terminu
  liczą się w oknie [termin − 14 dni, następny termin − 14 dni) (`from`), opłata okresowa także ze zbiornika silnika
  (`paidDue`); „po terminie” od 3. dnia po terminie (`OVERDUE_DAYS`), chyba że pliki z banku konta (`coveredTo` albo
  ostatni wiersz z banku) nie obejmują jeszcze tych dni – wtedy „czeka na import”. Odprawa: pozycja `cargo` raz na termin,
  powiadomienie z tagiem `cargo` (`notify.cargo`, domyślnie włączone). Radar: kontenery miesięczne w każdym miesiącu w ich
  dniu płatności (`fixed`), opłata okresowa tego miesiąca raz – w dniu z historii, bez drugiej w dniu kontenera.
  „Zapłacone” w Ładowni (płatność dziś na koncie kontenera) dopiero od początku okna – wcześniejsza należy do poprzedniego
  terminu.
- **T209** Szybki wpis seriami (F7): Ctrl+Enter zapisuje i zostawia okno (świeży szkic z tym samym kontem, dniem, godziną i
  kierunkiem; `QuickResult.data` – energia po zapisie), Enter i Esc bez zmian (D70); `quickTemplates` jednym przejściem –
  ostatni wpis ręczny z jedną linią (z pieniędzmi domownika: zakup / prezent, wpłata z zaliczką) i 5 najnowszych par
  `counterpartyKey` + kategoria własnych zakupów; działania w kwocie w `parseAmountInput` (+ − * / :, mnożenie i dzielenie
  najpierw, wynik do grosza; zwykła liczba jak dotąd); data słowem w `parseDateInput` (dziś, wczoraj, przedwczoraj, „-N”,
  `Object.hasOwn`); szkic zamknięty bez zapisu czeka 30 min od ostatniej zmiany albo zamknięcia (`visibilitychange`, Esc,
  przycisk); fokus pola kwoty po narysowaniu nowego formularza (szablon, „Wyczyść”).
- **T210** Wieczorny raport wachty (F13, D84 C15): `settings.game.noSpend` (dzień → chwila potwierdzenia, addytywne,
  400 dni); `eveningState` – dopisane dziś = operacje dnia spoza banku z godziną, raport zrobiony = dzień potwierdzony albo
  własny wydatek dziś z godziną od 18:00 lub dopisany od 18:00 (`EVENING_FROM`); „Przypomnij za 30 min” per komputer
  (localStorage `fi.evening.snooze`), powiadomienie po odłożeniu pod nowym kluczem `evening:<dzień>:<n>`; menu zasobnika
  wysyła `evening:nospend` / `evening:snooze` do okna (przy ukrytym oknie odpowiedź powiadomieniem); znacznik gry
  `nospend` przy potwierdzonym dniu bez kosztu – jak liczy misja „Dzień bez wydatków”.
- **T211** Meldunki do rozpatrzenia (F6): `inboxItems` (`shared/calc/inbox.ts`) – jeden meldunek = jedna linia, licznik w
  menu = liczba linii; kolejność: dokowanie (każda dostawa `pending`), łupy, folder danych (konflikty + pliki z błędem),
  bez kategorii (od startu budżetu, `isUncategorized` wspólne ze znacznikiem Operacji – bez płatności kontenerów i
  wydatków z celu, w liście „ładownia” / „z celu”), możliwe duplikaty, zwroty (domownik z należnością), salda (ostatnie
  potwierdzenie albo saldo otwarcia sprzed ponad 30 dni); przed startem budżetu tylko folder. Duplikaty: menu bierze
  ostatnią liczbę policzoną przez ekran, który je pokazuje (`useDuplicatesKnown` – W4: bez 0,6 s przy 150 tys. po każdej
  zmianie na każdym ekranie), sam liczy raz 10 s po otwarciu folderu; skrzynka liczy je 3 s po zmianie. Trasa `inbox`,
  Ctrl+Shift+M, Esc wraca jak z Synchronizacji.
- **T212** Odzyskanie z kopii (F3): proces główny czyta ZIP kopii w pamięci (`readBackupZip`: yauzl, `sanitizeRelPath`,
  tylko `isDataFile`, `parseRecordText` z migracjami, kopie konfliktów pominięte) – tylko kopię z listy folderu kopii;
  porównanie pod blokadą magazynu (`compareBackup`: `sameContentAs` bez pól zapisu; paczki importów pominięte; dodane po
  kopii tylko policzone); zapis `restoreVersions` = `putVersion` na wpis (bieżąca wersja do historii z powodem
  'restore', nowa `updatedAt`, ścieżka kanoniczna – zajęta przez inny wpis = błąd tego wpisu) i ustawienia osobno (błąd
  zgłoszony, zmiana wpisów i tak idzie do okna); odczytana kopia trzymana 10 min albo do odzyskania. „Cofnij” = wersje
  zastąpione (z pamięci okna) zapisane jednym wywołaniem `putVersions`, odtworzone z kopii usuwane ponownie. Cały folder:
  `unpackBackup` do `<folder> – kopia z RRRR-MM-DD GG.MM` obok folderu danych (numer, gdy nazwa zajęta) przez ukryty folder
  tymczasowy przemianowany po całości, wymagany fi.json, potem otwarcie jak przy zmianie folderu (zapis zmian, postęp).
- **T213** Przegląd grupy L (`/code-review` high, 10 kandydatów): 9 poprawionych z testami sprawdzonymi bez poprawki
  (okno „Zapłacone”, opłata okresowa raz na Radarze, ustawienia odzyskania osobno, „bez kategorii” bez ładowni i celów,
  „Powtórz ostatni” z pieniędzmi domownika, wpisy kopii po id, licznik meldunków bez liczenia duplikatów na każdym ekranie,
  „Cofnij” odzyskania jednym wywołaniem, słowa dni bez nazw prototypu); znacznik „Dziś bez wydatków” zostaje liczony jak
  misja „Dzień bez wydatków” (bez kosztu dnia, także stałych opłat) – poprawiony tylko komentarz.
- **T214** Raporty i specyfikacja (N26, N30, T83 – grupa M, D87): debriefing w Raportach bez serii i planu następnego
  miesiąca – seria jest w Dowództwie, plan w Planie miesiąca (zdanie dopisane do specyfikacji); „Dziennik kapitański”
  podaje trafność (plan ÷ oznaczone wpisy, jak Wywiad); odprawa w Raportach ma Daily Bias jak Mostek. Silver Bullet:
  specyfikacja mówi o 3 zdaniach nad pełną odprawą (tak jest od E7) – zwijanie zależne od godziny dnia nie powstaje
  (T80 bez zmian).
- **T215** Debriefing (N25, N54, N65, N101, B92): koperty tylko z planu miesiąca (0 zł też jest limitem – „nic na
  prezenty”), kategorie bez koperty osobno (`outside`: „Bez koperty”, bez czerwieni i bez paska limitu); pula dzienna =
  wydatki wszystkich kategorii codziennych i operacji bez kategorii, jak energia silnika; „miesiąc na plus” dopiero po
  końcu miesiąca (`ended`; w Raportach „miesiąc trwa”, w CSV / Excel „w toku”); łupy tylko z miesiąca, którego koniec silnik
  przeszedł (start budżetu przed tym końcem) – miesiąc sprzed startu nie ma łupów.
- **T216** Przekroczenie koperty – jedna reguła (N102): `envelopeOverrun` (`calc/fleet.ts`) dla alarmu silnika (czerwony =
  próg poważnego naruszenia z Dowództwa, `seriousEnvelopePct`), gry i powiadomień; limit 0 zł – przekroczenie bez
  „poważnego” (część z zera nie jest miarą), powiadomienie jest, „ponad 80%” nie. Koperta codzienna ponad swój podział:
  łagodne powiadomienie bez dźwięku alarmu („ponad podział – liczy się pula dzienna”), bez alarmu i naruszenia; Daily Bias
  patrzy tylko na koperty planowe (D16: pulę dzienną ocenia energia). Do zmiany na życzenie.
- **T217** Nazwy (N24, N63, N66): „Przychody” = przychód wg D81 wszędzie (raport wachty, przegląd roczny – linia i tabela,
  nagłówek CSV / Excel, alarm pensji „średni przychód z 6 mies.”); „Wpływy” w Operacjach zostają sumą brutto z podpowiedzią
  („to nie przychód”). Wywiad: „Na kontach” zamiast „Majątek” z dopiskiem, że suma sald obejmuje pożyczone i depozyt
  domowników; przegląd roczny „Pieniądze na kontach na początku / na końcu” i dopisek o tradingu netto miesiąc po miesiącu
  (T119). Krzywa majątku (T81, D73) bez zmian – majątek netto (bez długu i depozytu) przychodzi drugą linią w grupie V
  (F24, D87).
- **T218** Zasięg (N56): `rangeText` (`shared/format.ts`) obcina w dół do 0,1 mies. – napis nigdy nie pokazuje progu klasy,
  której okręt nie ma (klasa czyta tę samą liczbę); „brakuje” (`rangeGapText`) w górę i co najmniej 0,1. Mostek,
  Ładownia, Raporty, Dowództwo i Wywiad tą samą funkcją.
- **T219** Minimum osłon (B84): silnik liczy `minShields` = min(minimum, cel osłon) × pensja – dokowanie napełnia osłony
  tylko do celu, wyższe minimum byłoby stałym alarmem, Bearish i naruszeniami gry. Ustawienia i kreator odrzucają minimum
  wyższe od celu (i cel niższy od minimum) z komunikatem, ostrzegają przy minimum > cel − 1.
- **T220** Start budżetu (B126, B127, B128, N23): `startMonthSpentOf` – jedna reguła silnika i kreatora (koszty netto dni
  przed startem w miesiącu startu, zwrot pomniejsza zakup, nigdy poniżej zera, płatności opłat okresowych i kontenerów
  wybranych w kreatorze poza); saldo otwarcia z salda teraz odejmuje tylko operacje z dziś (z datą w przyszłości nie ma
  ich jeszcze w banku); tempo celów bez środków na start, konta dołączonego później i depozytu domowników. Gra startuje
  dopiero po kreatorze (`settings.budget.start`) – budżet liczony od samego salda otwarcia nie ma pensji ani planu; baner
  mówi wtedy, że budżet liczy się od salda otwarcia, a kreator ustawi resztę od dziś (T25, T51 bez zmian).
- **T221** Mostek, Radar, Ładownia (N22, N27, N28, N52, N59, N103, B61, B63, B85): alarm odprawy prowadzi do przyczyny
  (masa ładunku i zbiornik – Ładownia, korekta – ta operacja, firewall – Operacje, reszta – Plan miesiąca); „Odsłuchaj”
  tylko z polskim głosem systemu (bez niego podpowiedź o pakiecie mowy, T7), energia ujemna czytana „przekroczona o …”;
  każda dopłata do XTB wbrew firewallowi w osobnej linii; Radar: „po terminie N dni”, a od 3 dni „zaległa rata” /
  „spóźniona spłata” (jak odprawa, D72); Mapa gwiezdna podaje część w celach zarchiwizowanych; Ctrl+$ od razu w Radarze i
  otwartym szybkim wpisie; Ładownia: najbliższa płatność od dziś (`nextPaymentOf` jak Radar), rata zbiornika z harmonogramu
  („ostatnia …”, gdy inna), „/m” = średnio; pożyczka zaciągnięta z „Do spłaty razem” mniejszym niż kwota – odrzucona.
- **T222** Wydajność (W28–W30, W38): indeksy w WeakMap po tablicy z magazynu – operacje po miesiącach
  (`transactionsOfMonth`), dziennik silnika po miesiącach z końcami miesięcy i startem (`logIndex`), koszty po miesiącach
  (`costsByMonth`, wynik wspólny – tylko do odczytu); „Ostatnie operacje” Mostka jednym przejściem (`newestOperations`);
  debriefing Planu miesiąca liczony raz, tempo celów Mapy gwiezdnej w pamięci. Okno dokowania liczy podgląd tylko przy
  zmianie tego, co czyta silnik (od 1.4.3).
- **T223** Przegląd grupy M (`/code-review` high, 8 kandydatów – wszystkie poprawione): pamięć „Ostatnich operacji”
  Mostka przed wczesnym wyjściem (stała kolejność hooków); silnik liczony od nowa tylko przy zmianie progu poważnego
  naruszenia, nie każdego zapisu ustawień gry („Dziś bez wydatków”, start gry); „Najbliższa” płatność w Ładowni pomija cykl
  już opłacony ze zbiornika (`nextUnpaidOf`, jak Radar i odprawa); kreator – operacje z przyszłą datą liczone raz na
  konta, z odmianą „operacji”; baner N23 tylko przy saldzie otwarcia z dziś albo wcześniej (reguła `budgetStartOf`);
  powiadomienie koperty z `envelopeOverrun` i progiem Dowództwa (dopisek „ponad próg poważnego naruszenia”); Dowództwo
  pokazuje minimum osłon, które silnik stosuje (przy minimum ponad cel – cel z dopiskiem).

### 1.6.2 – gra, ICTTJ, domownicy, cele, kreator (grupa N, 19.10.2026)

- **T224** ICTTJ i dokowanie (B69, B70, N38, N43–N45 – grupa N, D87): wpływ wpisany na Portfelu XTB (rodzaj „wpływ”, kwota
  dodatnia, bez domownika, zaliczki, podziału i „Pokrywa”) jest kandydatem na parę wypłaty z ICTTJ tej samej kwoty w oknie –
  operacja z banku ma pierwszeństwo; „Zadokuj” zmienia mu rodzaj na trading (`asPayout` na bieżącym rekordzie – zmiany
  wpisane w międzyczasie zostają; „Cofnij” cofa tylko rodzaj, kategorię, kontrahenta i spłatę), bez drugiej operacji; bez
  wpisu w ICTTJ zostaje zwykłym przychodem (nigdy „bez wpisu w ICTTJ”). Pula Podatek z podziałem zmienionym w oknie:
  podatkiem jest część z podziału (`taxHold`, najwyżej kwota). Wypłaty z puli Podatek sparowane przed startem budżetu nie
  są przychodem z tradingu: okno liczy mapę operacja → kwota (`preStartTaxOf`, te same reguły pary co dostawy) i podaje ją
  silnikowi (`FleetInput.preStartTax`) – silnik dalej nie czyta ICTTJ; w kluczu silnika treść mapy (nowa migawka ICTTJ z
  tymi samymi wypłatami niczego nie przelicza). Pominięty wpis trzyma swoją operację z banku – parowany po wszystkich
  wpisach do zadokowania, więc nie zabiera im pary: wpływ nie jest „bez wpisu w ICTTJ”, Mostek pokazuje „· wpływ w banku
  DD.MM”. Teksty okna wg kierunku (zwrot do masy – wypływ do XTB), „wraca z rezerwy na PIT-38” w odprawie i powiadomieniu
  (bez „firewall”), przy wyłączonym rozkazie „Rozkaz firewall wyłączony – dopłata bez sprawdzania osłon i kadłuba.”;
  nazwy „Wypłata z ICTTJ” / „Zwrot do masy z ICTTJ”.
- **T225** Odczyt ICTTJ (B71–B73): jeden wpis na id (nowszy `updatedAt`, przy remisie mniejsza ścieżka – reguła ICTTJ) z
  ostrzeżeniem „Wpis ICTTJ w dwóch plikach …”; pusta lista tylko przy ENOENT – inny błąd listowania `payouts/` albo roku =
  stan „błąd” z kodem („nie udało się odczytać payouts/RRRR: KOD”), brak folderu roku = odczyt niepełny (`complete`
  false – żaden wpis nie jest „usunięty w ICTTJ”), błąd `forecasts/` = ostrzeżenie; jeden nieudany odczyt po dobrym
  zostawia dobrą migawkę z ostrzeżeniem „Ostatni odczyt folderu ICTTJ nieudany – FI pokazuje poprzedni: …”. Szybka zmiana
  folderu: okno bierze tylko odpowiedź ostatniego wyboru, a odczyt folderu już niewybranego oddaje stan wybranego.
- **T226** Cele (B87, N42, N46, N48): tempo w dwóch częściach (`goalPace`: wypłaty z puli Cele i reszta; razem = „Tempo”,
  jedno przejście dziennika); ETA – pula Cele najpierw do celów ICTTJ, reszta w kolejności listy (jak silnik, T65); znaczek
  „DOL · pula Cele” przy celu, do którego trafi wypłata z puli Cele, gdy to inny cel niż DOL. Cel ICTTJ bez kwoty (N46 –
  wariant a, reguła ICTTJ): w swoim miesiącu bierze całą resztę puli Cele, poza nim nic; miesiąc = dzień wpisu ICTTJ
  (`docking.entryDate`, addytywne; dokowania sprzed 1.6.2 – dzień operacji); Mapa: „bez kwoty – pula Cele w {miesiąc}”.
  „Po terminie” (`goalLate`, akcent, nigdy czerwień – T74): nieosiągnięty z ETA po terminie, bez ETA przy tempie > 0
  („ponad 50 lat – po terminie”) albo bez tempa po minionym terminie; osiągnięty – nigdy. Kwota istniejącego celu 0
  odrzucona z komunikatem jak przy dodawaniu (cel bez kwoty nie dostaje dostaw – archiwizacja).
- **T227** Gra (B89–B91, N29, N64, N68–N70, N73): kontener ma dzień zmiany masy (`container.amountAt`, addytywne – przy
  zmianie kwoty, cyklu, terminu; sprzed 1.6.2 `updatedAt`); dzień zamrażany po późniejszej zmianie zostaje przy masie dnia
  poprzedniego (wzrost ocenia dzień zmiany), a bez dnia do porównania (1. dzień miesiąca, dzień po nieznanym) zapisuje
  masę nieznaną (`cargo` null) – zmiana masy tego dnia ponad linią liczy się, zmiana nazwy nie (rozszerza T75). Misja o
  szablonie spoza tej wersji nie jest oceniana (oceni ją wersja, która go zna); stopień nowszej wersji pokazany z nazwy, bez
  awansu i degradacji od niego. „Pełna energia”: dni jeszcze niezamrożone ocenia silnik na koniec dnia, jak ocena dnia
  (wybór misji w poniedziałek widzi niedzielę – doprecyzowuje T78; status w tygodniu widzi dziś); wynik dnia pamiętany na
  dane silnika. „Dzień bez wydatków”: liczą się dni zakończone, dzisiejszy osobno („+1, jeśli dziś bez wydatków”). Klasa
  świętowana tylko ponad najwyższą z 30 dni (`CLASS_PEAK_DAYS`), ponowne wejście – wpis w dzienniku „(powtórnie w ciągu 30
  dni)” (doprecyzowuje T80). „Poważne naruszenia od DD.MM (do degradacji)”, gdy stopień zmienił się w tym miesiącu (T77).
  Rozkaz dzienny opisany tak, jak go ocenia gra („wydatki dnia ≤ energia dziś”, podstawa w dopisku); rozkazy edytowalne w
  Dowództwie tymi samymi polami co w Ustawieniach (specyfikacja, N73).
- **T228** Domownicy, salda, kreator (N40, N41, N47, N49, B75, B129): „Pokrywa” i „+ także za” z tego samego stanu –
  rejestru tuż przed wpłatą. Saldo na start ma datę najstarszego otwartego zakupu (`opening.since`, addytywne): seed 1.4.0
  ją zapisuje, folder po seedzie dostaje ją raz z rejestru 1.3.0 do dnia przed datą rozliczeń (gdy należność się zgadza;
  inaczej bez daty – dzień rozliczeń), saldo wpisane ręcznie – bez daty. Data rozliczeń sprzed startu budżetu z dopiskiem
  „Data sprzed startu budżetu – rozliczenia liczą się od startu (DD.MM.RRRR).”. Kreator: koperty wpisane ręcznie zostają
  przy zmianie ładowni (stan kreatora trzyma tylko zmiany ręczne nad propozycją). Potwierdzenie salda: korekta i
  potwierdzenie z deterministycznym id (konto, dzień, kwota z banku; korekta także różnica) – to samo potwierdzenie na dwóch
  komputerach to jeden wpis; dwie korekty jednego konta o tej samej kwocie w 7 dni z dwóch komputerów (`doubleCorrections`)
  – meldunek „Podwójne korekty” z „Pokaż korektę” i „to nie powtórzenie” (na stałe: `settings.import.notDuplicates`,
  klucz `correction:<id>`).
- **T229** Raporty (N71): raport wachty pamięta wybrany tydzień razem z tygodniem domyślnym z chwili wyboru – nowy tydzień
  domyślny (niedziela od 18:00) unieważnia wybór; przycisk „bieżący”.
- **T230** Przegląd grupy N (`/code-review` high, 10 kandydatów – wszystkie poprawione, każdy z testem sprawdzonym bez
  poprawki): pominięty wpis parowany po wpisach do zadokowania; masa nieznana bez dnia do porównania i dzień zmiany masy
  (`amountAt`); dokowanie wpływu z Portfela na bieżącym rekordzie; miesiąc celu bez kwoty z dnia wpisu ICTTJ; „to nie
  powtórzenie”; klucz silnika z treści mapy podatku, nie z tablicy wpisów; pamięć ocen dni niezamrożonych; „po terminie”
  bez ETA przy tempie; „Tempo” z tego samego przejścia dziennika; dokumentacja `chooseMission`.
- **T231** Opis operacji mBanku (B103, B105): rodzaj operacji kończy się tam, gdzie nie idzie dalej litera ani cyfra (także
  po polskiej literze – „PŁATNOŚĆ WEB…”, „SPRZEDAŻ WALUTY”). Przelew z listy operacji: części po pierwszej (do adresu albo
  numeru rachunku) są nazwą tylko wtedy, gdy przed nimi nie ma „nazwa, tytuł” (mTransfer: „Doładowanie telefonu | BLUE
  MEDIA SPÓŁKA AKCYJNA”), gdy powtarzają nazwę sprzed przecinka (XTB) albo gdy są firmą – forma prawna, operator płatności
  („Zamówienie 12, sklep X | PAYU SPÓŁKA AKCYJNA”); inaczej to dalszy ciąg tytułu z podwójną spacją („ZA  OBIAD”).
- **T232** Rozpoznanie (B104, B106, N86, doprecyzowuje T37): klucze marek, połączonych nazw i podpowiedzi mBanku tylko jako
  własne pola (`Object.hasOwn` – marka „constructor”). XTB po kontrahencie (bez operatora płatności przed sklepem –
  „PAYU*XTB”), po opisie tylko bez własnego kontrahenta (brak albo sam operator płatności); przelew własny, zwrot pożyczki i
  pieniądze domownika rozpoznawane przed XTB („na portfel XTB”, „zwrot za kurs XTB”). Reguła wydatku – także reguła zakupu
  dla zwrotu towaru – z kategorią zarchiwizowaną: bez kategorii, źródło „do decyzji”, powód „kategoria reguły
  zarchiwizowana – wybierz nową” (wybór użytkownika zmienia regułę); w Ustawieniach reguła z dopiskiem „(zarchiwizowana)”.
- **T233** Łączenie z wpisami ręcznymi i duplikaty (B95, B99, B100, B102, N88, N89; zmienia T36 i T92): podobieństwo nazw
  (`counterpartySimilarity`) – pewne: ten sam klucz, ta sama marka (`brandOf`: „KFC” i „KFC 1234 WARSZAWA”), klucz w
  drugim, gdy ma co najmniej 5 liter i mówi kto, albo dwa wspólne słowa mówiące kto (4 litery i więcej; nie słowo ogólne –
  „polska”, „sklep”, „spółka” –, rodzaj miejsca, słowo kluczowe ani miasto); „może” – jedno takie słowo albo krótki klucz /
  słowo „co” w drugim („bar” – „BARBERSHOP”, „Sklep” – „SKLEP OLA”): pytane, nigdy łączone samo. Jedna reguła importu i
  panelu duplikatów (`looseSure`): pewne = podobna nazwa ponad „może” albo zakup kartą najwyżej dzień obok, inaczej
  pytane (w panelu niezaznaczone); nazwa banku = kontrahent, inaczej opis (nigdy pusta). Wpis zapisany przez nowszą
  wersję (tylko do odczytu) nie jest łączony, rozliczany ani proponowany do usunięcia jako zniknięty – wiersz banku wchodzi
  jako nowy, panel duplikatów blokuje scalenie z nim. Kwota z banku (rozliczenie nierozliczonej, scalenie z wpisem
  ręcznym) przeskalowuje linie paragonu proporcjonalnie (grosze zaokrągleń do największej linii; udział domownika zostaje
  jego), części wpłaty zostają (różnica – reszta nadawcy), wspólny zakup od nowa. Scalenie duplikatów przenosi `covers`
  wpłat domowników na zachowaną operację.
- **T234** Usunięte nierozliczone (B96, doprecyzowuje T39): wiersz banku rozliczający nierozliczoną usuniętą przez
  użytkownika (inna kwota do max(5 zł, 10 %), ±3 dni, podobna nazwa banku – jak przy rozliczeniu) nie wchodzi sam: status
  „usunięta” z „importuj mimo to”. Pary od najbliższej, każda usunięta i każdy wiersz raz; wiersz już w budżecie, który
  wszedł po usunięciu (wpuszczony wcześniej przez „importuj mimo to”), zabiera swoją usuniętą – nie ukrywa wtedy innego
  zakupu tego sklepu. Nierozliczone usunięte przez sam import jako „bank już ich nie pokazuje” (zapisane w paczce importu –
  F4, ostatnie 10) nie są usunięciem użytkownika – ich rozliczenie po końcu okresu pliku wchodzi.
- **T235** Ekran importu (B93, B94, B97, B98, B101, N74–N85, N87, N90): w trakcie zapisu importu ekran jest wyłączony,
  „Zamknij plik” i upuszczony plik czekają; upuszczony plik jak wybrany (limit 20 MB – `IMPORT_MAX_BYTES`, błąd odczytu z
  komunikatem); błąd zapisu kończy import wynikiem i komunikatem (zapis ponawiany), nigdy plikiem z nieaktualnym podglądem;
  zmiana folderu zamyka sesję. Własna decyzja po przyjętej podpowiedzi zapamiętywana domyślnie; plakietki „podpowiedź
  mBanku” / „przyjęte” / „Twoja decyzja”. „(jak grupa)” w kategorii operacji = decyzja grupy. „+ domownik”: pieniądze osoby
  to decyzja użytkownika (reguła nadawcy jak każda), reszta ponad należność – pytanie „zaliczka czy przychód?” (temat „do
  decyzji”, także po nowym planie z innym kluczem grupy); odpowiedź zapamiętana dla osoby tylko z decyzji użytkownika,
  głosami operacji bez pominiętych. Temat: „różne – patrz marki”, gdy marki zdecydowano różnie; jednakowe decyzje marek
  pokazane jako decyzja tematu – jej zmiana je zastępuje. Słowo kluczowe z paska zbiorczego dla każdej decyzji ze słowem
  (wydatek, wpływ, przelew, domownik), kierunek z zaznaczonych, do których decyzja pasuje; żaden nie pasuje – słowo
  niezapisane. Wyszukiwarka po kategorii, którą grupa dostaje (nie propozycji), bez powodu propozycji; „Przyjmij pewne” i
  „Przyjmij podpowiedzi” w wyszukiwaniu tylko na znalezionych. Własna decyzja operacji inna niż wydatek widoczna z „jak
  grupa”; wiersz usuniętej „importuj mimo to” w grupach i tematach jak nowy. Panel duplikatów: polskie nazwy rodzajów,
  daty dd.mm.rrrr, „to nie duplikat” z „Cofnij” i „pokazuj znowu” w Ustawieniach; przy otwartym pliku notka „Możliwe
  duplikaty: n”. Jeden opis decyzji reguły (Reguły importu, Słowa kluczowe, propozycja słowa – `ruleDecisionText`) i
  kierunku (`directionText`).
- **T236** Wydajność importu (W31–W36): reguła wiersza raz na propozycje słów, wzorzec słowa raz na kandydata; marki reguł i
  indeks reguł dokładnych raz na listę reguł; pary podobnych nazw liczone raz, „To nie to samo” je tylko filtruje; decyzje
  zbiorcze jedną zmianą stanu; nauka reguł importu w jednej kopii listy (`upsertRules`); lista reguł w Ustawieniach po 100;
  różnice i scalanie tablic z id przez mapę (ten sam element – bez zaglądania); plakietka „nowsza” w oknie zmian liczona
  raz na wersję i zapis. Starych reguł nic samo nie usuwa (zmiana widoczna dla użytkownika – osobna decyzja).
- **T237** Przegląd grupy O (`/code-review` high, 10 kandydatów – wszystkie poprawione, każdy z testem albo E2E): pytanie
  „zaliczka czy przychód?” zostaje przy nowym planie, „zapamiętaj” domyślne po odpowiedzi; usunięte nierozliczone od
  najbliższej pary i zabierane przez wiersz wpuszczony wcześniej; zniknięte usunięte przez import nie ukrywają swojego
  rozliczenia; słowo kluczowe bez pasujących niezapisane; temat z jednakowymi decyzjami marek; nierozliczona tylko do
  odczytu nie jest „zniknięta”; ta sama marka i krótkie nazwy (pytane); mTransfer z przecinkiem w tytule; plakietka
  „nowsza” po zapisie ustawień.
- **T238** „Bez kategorii” – jedno znaczenie (N50, B76, B78, N51, B82): oznaczenie, filtr „bez kategorii” i meldunki
  (F6) to wydatek własny (bez kontenera i celu) z częścią moją bez kategorii – operacji albo paragonu (`partsOf`); część
  0 zł zostawiona po „Podziel paragon” niczego nie czeka; wpływy, przelewy i zakupy domowników nie są „bez kategorii”;
  meldunki liczą kwotę tylko takich części. Filtr kategorii patrzy na części (reszta starego podziału – w kategorii
  operacji), znak „domownik” – na części jak pieniądze. „Podziel paragon” przenosi kategorię i finansowanie operacji na
  pierwszą część; reszta bez części to linia bez kategorii (edytor ją nazywa). Oznaczenia: w grupie (pochodzenie: z
  banku / nierozliczona / wpisana ręcznie; dziennik: plan / impuls) dowolne z zaznaczonych, między grupami wszystkie.
  Kategoria zarchiwizowana albo usunięta w filtrze – z nazwą „(archiwum)” / „nieznana kategoria”, do odznaczenia.
- **T239** Lista operacji (B64, B77, B81, B88): Ctrl+N dodaje operację z każdego ekranu (nie nad paletą ani oknem). Nowa
  operacja zawsze widoczna: okres bez jej dnia (też „od–do”) → miesiąc operacji, filtry, które by ją ukryły, zdjęte w
  widoku. Bieżący miesiąc listy idzie z kalendarzem (aplikacja w zasobniku tygodniami), miesiąc wybrany zostaje. Widok z
  innego ekranu (Mostek, powiadomienie, zasobnik, meldunki, duplikaty, skok do operacji) chowający część zapisanego
  filtra jest widokiem: zmiany w nim (także „wyczyść filtry”) zostają widoku, „mój filtr” pokazuje zapisany, po nim zmiany
  zapisują się znowu; widok zmieniający tylko okres albo wyszukiwanie (albo te same wartości) nie jest widokiem.
- **T240** „Cofnij” zmian zbiorczych (B66): cofa tylko pola akcji i tylko tam, gdzie wciąż są jej – kategoria zmieniona
  w międzyczasie (tu albo na drugim komputerze) zostaje; finansowanie porównywane bez kwot (wspólny zakup po zmianie kwoty
  ma nowe linie, a „Cofnij” i tak zdejmuje wspólne finansowanie); reguły importu zapisane akcją porównywane treścią
  (ustawienia przeczytane po zapisie to inne obiekty), reguły dodane w międzyczasie zostają. Gdy coś zostało, komunikat
  „Cofnięto n z m – … zmieniły się w międzyczasie”.
- **T241** Edytor operacji (B68, B74, B79, B80, N32): notatka do 5000 znaków, dziennik kapitański do 2000 (limity
  schematu – dłuższy tekst nie blokuje zapisu); kwota z więcej niż dwiema cyframi po przecinku odrzucana („1.200” to nie
  1,20 zł) – także w działaniach; „Ładownia” widoczna przy podziale paragonu z dopiskiem, że cała operacja liczy się do
  ładowni; wybór kategorii pokazuje bieżącą podkategorię zarchiwizowanej kategorii głównej (tylko tę); próg „Plan czy
  impuls?” 0 albo pusty – dziennik nie pyta nigdzie.
- **T242** „Potwierdź saldo” dziś (B83, doprecyzowuje T25 – wariant zgodny z D-decyzjami: potwierdzenie dalej na koniec
  dnia, bez wyboru dnia): różnica wobec operacji do końca dnia pyta najpierw „Dzisiejsze operacje są już dopisane?” –
  „Tak – zapisz korektę” albo „Dopiszę i potwierdzę później” (nic nie zapisane); zgodne saldo i saldo otwarcia od razu.
  Wpisane saldo zostaje w polu do zapisu (po „później” – do następnego „Potwierdź”), zmiana wpisanej kwoty zamyka pytanie;
  plan potwierdzenia liczony raz (Ustawienia → Konta i ekran importu).
- **T243** Szybki wpis (B118, B125, N39): główne okno wysyła świeże dane (listy, energia, tylko do odczytu) do widocznego
  okna szybkiego wpisu najwyżej co 500 ms – bez utraty wpisu; wybór spoza nowych list (konto, kategoria, domownik –
  także części paragonu, wspólny zakup, części wpłaty) czyszczony z komunikatem „Lista … się zmieniła – sprawdź wybór”.
  Lista okna ma tylko aktywne konta i domowników, więc zarchiwizowanie wybranego zmienia wybór (z komunikatem); zapis w
  głównym oknie odrzuca tylko konto, kategorię i domownika spoza folderu (zarchiwizowani to wciąż folder). Wpływ nie ma
  części paragonu (zmiana rodzaju je czyści). „Zaliczka czy przychód” osoby zapamiętane tylko po wyborze użytkownika.
- **T244** Szkice formularzy i drobne (N36, N37, N104): „Nowa pożyczka”, „Nowy kontener”, „Nowy cel” i podział łupów
  trzymają wpisany tekst w pamięci okna po kluczu formularza (nie na dysku; inny folder albo restart – od nowa); pusty
  formularz liczony od nowa przy każdym rysowaniu bez wpisu – po dniach w zasobniku z dzisiejszą datą (sprawdzone raz
  zegarem Playwrighta, test trwa minutę – poza CI). Ściągawka skrótów: ustawiony skrót szybkiego wpisu albo „brak
  skrótu”, z ostrzeżeniem, gdy się nie zarejestrował. Wieczorne przypomnienie w godzinach ciszy nocnej przychodzi minutę
  przed nią (powiadomienie i raport w Operacjach), Ustawienia to mówią.
- **T245** Przegląd grupy P (`/code-review` high, 10 kandydatów – 9 poprawionych z testem albo E2E, 1 bez zmian):
  pusta część paragonu, widok filtra z innego ekranu (zmiany i „wyczyść” w nim, widok tylko z okresem), pusty formularz po
  dniach, domownik w szybkim wpisie (okno i zapis), „Cofnij” wspólnego zakupu po zmianie kwoty i reguł przeczytanych po
  zapisie, komunikat o niecofniętych, wpisane saldo do zapisu, jeden przebieg planu potwierdzenia. Bez zmian: konto
  zarchiwizowane w trakcie szybkiego wpisu zmienia wybór z komunikatem (T243, propozycja B125).
- **T246** Wpisy zapisane przez nowszą wersję aplikacji (B67): main odróżnia `NewerFileError` (plik wpisu nowszej
  wersji – ponawianie nic nie da) od `ReadOnlyError` folderu (chwilowo niedostępny – ponawiany jak dotąd). Okno trzyma
  taką zmianę w pamięci z jednym komunikatem, bez pętli prób (kolejna zmiana albo „ponów” próbują raz); zmiana takiego
  wpisu – komunikat zamiast cichego „nic”; usunięcie – odmowa, wpis zostaje; edytory kontenera, celu, pożyczki i planu
  miesiąca wyłączone z dopiskiem; zmiany zbiorcze liczą takie operacje osobno. Gra i plan miesiąca nie tworzą wpisu na
  ścieżce pliku nowszej wersji, którego ta nie odczyta (`tooNewMonths`). Kroki wymagające zapisu wszystkiego (kopia,
  eksport, import…) na takie zmiany nie czekają – ta wersja nigdy ich nie zapisze.
- **T247** Prawdziwa przyczyna niezapisanych zmian (B108, N62): `unsavedReport` – czekające decyzje o zmianach z drugiego
  komputera, wpisy nowszej wersji, błąd zapisu reszty. Zamknięcie okna pyta według przyczyny (decyzja – okno decyzji
  otwarte za pytaniem, „Anuluj” zostawia aplikację z nim; błąd zapisu – z powodem; nowsza wersja – „zaktualizuj
  aplikację”). Kroki wymagające zapisu (kopia, eksport, import i jego cofnięcie, odzyskanie wersji i z kopii, aktualizacja,
  zmiana folderu, rozstrzygnięcie i scalenie konfliktu) przez `saveFirst`: „Czekają zmiany z drugiego komputera (n) –
  kopia czeka na Twoją decyzję w otwartym oknie” albo „Nie udało się zapisać bieżących zmian (powód), więc kopia czeka –
  aplikacja ponawia zapis”. Po krokach zrobionych w pamięci (import, jego cofnięcie, kreator) `unsavedNote` mówi, co
  jeszcze nie jest na dysku i dlaczego. Ctrl+S i „Zapisz teraz” z palety – jedna funkcja `saveNow`.
- **T248** fi.json (B107, B109): zapis ustawień zwraca zmianę folderu obok (kopia „-zewnetrzna-”, odsunięty uszkodzony
  plik) – okno wie od razu; wersja ustawień wzięta z historii odsuwa uszkodzony fi.json, nigdy go nie nadpisuje.
  Nieczytelny fi.json przy otwarciu (OneDrive jeszcze go nie pobrał) – ekran z „Spróbuj ponownie” i ponowieniem co 30 s;
  uszkodzony – „Weź ustawienia z historii”: najnowsza czytelna wersja z `.history/fi` staje się fi.json, uszkodzony plik
  zostaje obok jako kopia w Synchronizacji.
- **T249** Folder i kopie (B111, B112, B113, B115, B120, B121, B123, N96): usunięcie wpisu z drugą kopią (ten sam id z
  dwóch komputerów) – odmowa do rozstrzygnięcia w Synchronizacji; wersja do historii się nie zapisała (folder `.history`
  niedostępny) – odmowa zamiast Kosza (wpisu bez wersji nie dałoby się odzyskać „Cofnij”). Obserwator niedostępnego folderu –
  ponowienia po 5 s, 10 s… do 5 min (od nowa po minucie działania); w logu pierwszy błąd, potem najwyżej raz na godzinę z
  liczbą pominiętych. Własny folder kopii tego komputera – podfolder na każdy folder danych (`nazwa-<skrót ścieżki>`;
  dotychczasowe kopie zostają w starym miejscu, nietknięte); rotacja i lista kopii tylko plików z nazwami FI; folder
  kopii nigdy w folderze ICTTJ. Folder bez prawa listowania – „niedostępny”, rodzice sprawdzani tylko po `journal.json`.
  Nieudana kopia dzienna – w Ustawieniach (kiedy i dlaczego; udana kopia ręczna zdejmuje ostrzeżenie), powiadomienie raz
  dziennie, gdy najnowsza widoczna kopia ma 3 dni albo – żadnej nie widać (folder kopii odłączony, nowy podfolder) –
  kopie dzienne nie powstają od 3 dni.
  Eksport całego folderu niesie historię zmian (kopie dzienne bez niej – T20); Synchronizacja podaje prawdziwy folder kopii.
- **T250** config.json tego komputera (B114): odczyt ponawiany; błąd inny niż brak pliku – ustawienia domyślne tylko w
  pamięci, zapisy wstrzymane (plik nigdy nie nadpisany domyślnymi), ponowna próba co 15 s, po udanej – folder, zasobnik,
  skrót, ICTTJ i sprawdzanie aktualizacji jak przy starcie; zmiany z tej chwili (pobrana aktualizacja, zasobnik, folder)
  dochodzą do odczytanego pliku pole po polu – nigdy wartości domyślne obok nich; uszkodzony JSON odsunięty jako
  `config.uszkodzony-<czas>.json`.
- **T251** System i okna (B116, B119, B122, B124, N98, N99, N100, W37): obecność po przełączeniu folderu nie pisze do
  starego; start ukryty pamięta maksymalizację; nieudane pobranie nowszej wersji zostawia gotową wcześniej pobraną (z
  komunikatem w Aktualizacjach); awaria okna szybkiego wpisu albo panelu odłączonego – okno tworzone od nowa przy
  następnym otwarciu. Kiedy zainstaluje się aktualizacja – według zamykania do zasobnika („po „Zakończ” w menu ikony”);
  pobrana aktualizacja czekająca przy oknie w zasobniku – powiadomienie raz. Dymek zasobnika z energią także po
  włączeniu zasobnika w trakcie pracy. Kreator nie zmienia skrótu ani zamykania do zasobnika; start z Windows proponuje
  (włączony, jeśli nie wybrano wcześniej), a drugi komputer z działającym budżetem pyta raz baner (`autostartAsked`).
  Przeładowane okno dostaje folder z pamięci procesu głównego, bez czytania dysku od nowa.
- **T252** Dwa komputery i Synchronizacja (N91, N92, N94, N95, N97): zachowana kopia konfliktu zapisana z czasem i
  komputerem rozstrzygnięcia; nazwy pól po polsku i nazwy zamiast identyfikatorów (kategorie, cele, kontenery, pożyczki,
  domownicy) w Historii, oknie zmian i na karcie konfliktu (ta sama lista zmian); plik z problemem: nieczytelny teraz –
  „Wczytaj ponownie”, nowszy format – „zaktualizuj aplikację”, uszkodzony – „Do Kosza” z potwierdzeniem; „Zaakceptuj
  nowsze” w obu miejscach, „z drugiego komputera” zamiast nazwy komputera, gdy jej brak.
- **T253** Przegląd grupy Q (`/code-review` high, 9 kandydatów – 8 poprawionych z testem, 1 bez zmian): zmiany ustawień
  komputera z chwili nieczytelnego config.json (także pobrana aktualizacja i sprawdzanie aktualizacji), powiadomienie o
  kopiach dopiero po 3 dniach także bez widocznych kopii, ostrzeżenie zdejmowane przez kopię ręczną i przy innym
  folderze, obecność przy ponownym otwarciu tego samego folderu, gra nie liczy się od nowa przy każdej zmianie folderu,
  Ctrl+S bez „Zapisano.” przy nieudanym zapisie, nowa awaria obserwatora po spokojnym okresie od razu w logu, zmiana
  folderu z niezapisywalnymi zmianami pyta („Zmień mimo to”). Bez zmian: komputer sprzed 1.6.5 bez zapisanej odpowiedzi o
  starcie z Windows dostaje pytanie raz (nie wiadomo, na którym komputerze kreator pytał – raz to mniej niż nigdy na
  drugim komputerze, N100).
- **T254** Teksty i formaty (N31, N33, N53, N57, N72): metafora zawsze z prawdziwą nazwą (D34) – alarmy („Pensja z kadłuba
  (funduszu awaryjnego)”, „Masa ładunku (stałe koszty X/mies.)”, „Rozbieżność salda: korekta”), Mostek („stałe koszty X/mies.
  · linia N%”), kreator, plan miesiąca, naruszenia i osiągnięcia gry, Wywiad; daty w oknie przez `plDate` (także podtytuł
  PDF i podpowiedź salda w Operacjach), nazwa eksportu ZIP z datą warszawską; FVG kopert w raportach i PDF ze znakiem
  „+” (jak Plan miesiąca i Wywiad), kwoty dni raportu wachty w zł, jedna nazwa „Ładownia (kontenery i opłaty okresowe)”
  w raporcie wachty, debriefingu i przeglądzie rocznym (warstwa „Order Block · ładownia” w Wywiadzie zostaje); stopień w
  dopełniaczu po „Do stopnia” (`RANK_GENITIVE`), misja „Rozliczenie z domownikami” (klucz `house` bez zmian); odmiana
  liczebników (`countLabel` / `plural`) w importie, kreatorze, ładowni, Radarze, Mostku, Dowództwie, powiadomieniu o
  dostawach i Ustawieniach; „Za planem o”, „Komu pożyczasz”, „bez tego, co wydano przed startem”; maska kwot szybkiego
  wpisu „••• zł”; Ustawienia → Zasobnik i start bez zapowiedzi funkcji działających od 1.0.0.
- **T255** Martwy kod (N34): usunięte nieużywane formatery z ICTTJ (`fmtNum`, `fmtPercent`, `fmtAmount`, `fmtPct`,
  `fmtPctShort`, `fmtPln` – format bez groszy sprzeczny z `formatPln` –, `toneClass`, `tone`), ekran-zaślepka
  `PlaceholderPage` z polami `stage` / `ready` i rodzajem okna 'placeholder', IPC `copyText`, `AppInfo.isPortable`,
  `DataStore.importRecords`; plan i Operacje biorą `activeIn` / `monthLabel` / `plDate` ze wspólnych modułów.
  `GameChange.events` zostaje świadomie (testy czytają z niego decyzje przebiegu; okno bierze świętowania z dziennika
  wachty – T80); menu „Układ” zna nazwy stron kreatora i meldunków, na kreatorze go nie ma (N61).
- **T256** Zamknięcie pożyczki z „Cofnij” (N35): raty wziętej pożyczki, które są w ładowni, schodzą z niej jak zrzucony
  kontener (B56 – masa liczy się do końca miesiąca) z czasem `closedAt` pożyczki; „otwórz” oddaje do ładowni tylko raty
  zdjęte tym zamknięciem (ten sam czas albo zamknięcie sprzed 1.6.6 – bez czasu), nigdy rat zarchiwizowanych osobno;
  „Cofnij” (zamknięcia i otwarcia) oddaje pożyczkę i tylko zmienione kontenery w stanie sprzed.
- **T257** Krzywa majątku na Mostku (N58, wybór z „Przed grupą R”): panel „Krzywa majątku” – ostatnie 26 tygodni, BOS /
  CHoCH ze struktury całej historii, „Wywiad →”; krzywa liczona raz na stan danych dla Mostka i Wywiadu (`wealthOf`), na
  Mostku tylko przy widocznym panelu (zwinięty albo ukryty nic nie liczy); radar i reszta wywiadu – przez odprawę i własne
  ekrany; wiersz Mostka w specyfikacji poprawiony.
- **T258** Kolory poza kwotami (N60): Daily Bias „Bearish” w kolorze akcentu (jak zaległości – T74), „Bullish” jasnym
  tekstem; ETA po terminie celu w akcencie już od 1.6.2; plakietka „zaszyfrowany” przy tokenie zostaje jak w ICTTJ.
- **T259** Rozmiar interfejsu i wyższy kontrast (F30, ustawienia tego komputera w config.json): `prefs.zoom` 0,9–1,5
  (krok 10 %, wartość spoza siatki dochodzi do niej) – proces główny ustawia `setZoomFactor` we wszystkich oknach (główne,
  szybki wpis, panele odłączone) przy zmianie i po każdym wczytaniu strony, okno szybkiego wpisu rośnie z nim w granicach
  ekranu (treść przewija się na małym laptopie), także przy Ctrl+Plus w nim samym; klawisze Ctrl+Plus (też Ctrl+= i plus
  z klawiatury numerycznej) / Ctrl+Minus / Ctrl+Shift+0 = 100 % (Ctrl+0 to Raporty) obsługuje każde okno w fazie
  przechwytywania (AltGr nigdy) – jedna droga dla klawiatury i testów; `prefs.highContrast` – atrybut `data-contrast`
  strony: przygaszone napisy jaśniejsze (AA na panelu), najmniejsze 12 px, style poza warstwami. Ustawienia → „Wygląd i
  prywatność” (suwak zapisuje po puszczeniu). Zmiany ustawień komputera z okna: odpowiedź (i echo) starszej zmiany nie
  cofa nowszej w drodze (dwa Ctrl+Plus pod rząd – dwa kroki).
- **T260** Ukrywanie kwot bez blokady (F40, D30): `prefs.hideIdleMin` (0 = nigdy – domyślnie; lista 1–60 min, inna
  wartość z pliku pokazana jak jest) – po tylu minutach bez ruchu w systemie (`powerMonitor`) albo po zablokowaniu ekranu
  proces główny ukrywa kwoty we wszystkich oknach, w dymku zasobnika i powiadomieniach; `prefs.hideOnStart` – przy każdym
  starcie (także gdy config.json da się odczytać dopiero później); przy ukrytych kwotach pasek u góry „Kwoty ukryte ·
  Pokaż na 5 min · do końca sesji” (i paleta): pokazanie na chwilę wraca do ukrycia po czasie, „do końca sesji” wyłącza
  ukrywanie po bezczynności do zamknięcia aplikacji; ukrycie ręczne (Ctrl+$) i zablokowany ekran kończą każde pokazanie;
  pokazanie na chwilę przy kwotach już widocznych nic nie zmienia. Zmienne testowe `FI_SYSTEM_IDLE`, `FI_IDLE_CHECK_MS`,
  `FI_CONFIG_RETRY_MS`.
- **T261** Przegląd grupy R (`/code-review` high, 10 kandydatów – wszystkie poprawione z testem): start z ukrytymi
  kwotami także po późnym odczycie config.json, „Pokaż …” z palety tylko przy ukrytych kwotach (pokazanie na chwilę nie
  ukrywa później kwot widocznych), zablokowany ekran chowa też po „do końca sesji”, okno szybkiego wpisu w granicach
  ekranu, „otwórz” pożyczki tylko dla rat zdjętych zamknięciem, „Cofnij” tylko zmienionych kontenerów, krzywa majątku raz
  na stan danych i tylko przy widocznym panelu, próg bezczynności spoza listy pokazany jak jest, jedno wczytanie ustawień
  komputera w oknie (odpowiedź nie cofa zmiany w drodze), przesunięte komentarze i T-decyzje.
- **T262** Przelew między kontami budżetu jako jedna operacja (F10, D87): operacja `transfer` z `bothSides: true` i
  `counterAccountId` = drugie konto budżetu ma kwotę na swoim koncie i przeciwną na drugim (`calc/operations.ts`
  `isTwoSided`, `accountAmounts`, `amountOn`, `dateOn`, `touchesAccount`); `counterBank` = wiersz z banku drugiego konta,
  `counterDate` = dzień drugiej strony, gdy bank zaksięgował ją innego dnia (pola addytywne – starsza wersja czyta taką
  operację jak jedną stronę). Salda, saldo na dzień, krzywa majątku, saldo „teraz” kreatora, telemetria z banku i
  potwierdzenia liczą każdą stronę na jej koncie i w jej dniu. Warstwy się nie zmieniają, póki obie strony są w biegu
  silnika; strona poza nim (przed startem budżetu – jest w pieniądzach startu, po dziś – nie ma jej w żadnym saldzie,
  przed saldem otwarcia swojego konta) zostawia drugą stronę jako ruch osłon w jej własnym dniu (przegląd S – suma warstw
  zawsze równa saldom). Nowy przelew (zmiana rodzaju na „Przelew”, `withKind`) jest jedną operacją; przelew sprzed 1.7.0
  (jedna strona, T31) zostaje jedną stroną także po wybraniu „Na konto” albo zmianie zbiorczej – jego druga strona może
  być osobną operacją, łączy je ramka w edytorze albo Meldunki (przegląd S).
- **T263** Import i przelew w jednej operacji (F10): plik drugiego konta dołącza wiersz o kwocie przelewu ±3 dni od strony
  tego konta do przelewu (`reconcile.ts` `sideOf` / `legacySideOf`, `budgetedOf.waiting`, `RowPlan.merge.side`), bez
  porównania nazwy (bank drugiego konta nazywa przelew po swojemu) – najbliższe dni najpierw, przelew w jednej operacji
  przed jednostronnym; przelew sprzed 1.7.0 bez wskazanego konta (import go nie oferował) tylko z wierszem, który bank
  nazywa przelewem własnym (`isOwnTransferRow`), i tylko gdy to konto nie ma swojej strony tej pary (T31). Nowy wiersz
  przelewu własnego na konto budżetu – jedna operacja dla obu stron (opcje `transfer:<konto>`), na konto spoza budżetu –
  jedna strona. Nierozliczona druga strona rozliczona z innym opisem zmienia tylko swój wiersz; zniknięta z listy nie
  jest proponowana do usunięcia (usunęłaby cały przelew). Licznik `sides` w podsumowaniu importu.
- **T264** Przelewy sprzed 1.7.0 w Meldunkach (F10): `calc/transfers.ts` `transferIssues` – para (dwie jednostronne
  operacje jednego ruchu: przeciwne kwoty na dwóch kontach, ±3 dni, żadna nie wskazuje trzeciego konta – połączenie nie
  zmienia sald), podwójna (przelew w jednej operacji i osobna strona jego drugiego konta – liczy się dwa razy), brakująca
  (jednostronna wskazująca konto budżetu bez drugiej strony – od dnia po ostatnim potwierdzonym saldzie tego konta, inaczej
  od salda otwarcia: wcześniej różnicę wyrównała korekta). Połączenie nigdy nie przenosi strony przez potwierdzone saldo
  (`joinedDay`); podwójna z obiema stronami przed potwierdzeniem (`settled`) nie jest meldunkiem – edytor dalej ją łączy,
  pytając (F12). Pary razem: najpierw lista z zaznaczeniem (`TransferPairs`, „Połącz…”) – para, której żadna strona nie
  wskazuje konta, oznaczona do sprawdzenia; „zostaw tak” (`notDuplicates`). Połączenie z jednym „Cofnij”; druga strona,
  której dysk nie usunął (nowsza wersja, plik zajęty), cofa połączenie swojej pary – pieniądze nigdy dwa razy na drugim
  koncie (przegląd S).
- **T265** Zmiana zaznaczonych operacji naraz (F11): usuń, inne konto, inny rodzaj (przelew – z kontem docelowym), data
  przesunięta o N dni (z dniem drugiej strony) – najpierw podgląd: ile operacji, pominięte (zadokowana zachowuje rodzaj,
  przelew na konto swojej drugiej strony), zapisane przez nowszą wersję (bez zmian), skutek – energia dziś, koperty,
  osłony, salda kont (`calc/effect.ts`: stan pokazywany na ekranach wobec silnika ze zmianą – przegląd S: stan „przed” z
  pamięci, liczony raz) i potwierdzone salda, które zmiana ruszy. Jedno „Cofnij”: usunięte wracają z historii (z
  dokowaniami – tylko operacji, które dysk usunął), reszta dostaje swoje pola, póki są takie, jak zmiana je ustawiła
  (B66).
- **T266** Ostrzeżenie w potwierdzonym okresie (F12, D28 – ostrzeżenie, nie blokada): `balances.ts` `confirmedChanges`
  (zmiana salda konta w dniu jego ostatniego potwierdzenia – suma zmian, przelew w jednej operacji obiema stronami, przed
  saldem otwarcia nic) i `confirmedPeriodOf` (znaczek „okres potwierdzony” w edytorze). Zmiana kwoty, daty albo konta,
  która ruszy potwierdzone saldo, i zmiana kwoty operacji z banku pyta „Zmienić operację?” z kwotą i dniem; zamrożone dni
  gry zostają bez zmian. Nowy wpis w trakcie pierwszego pisania nie pyta (`fresh` – data wsteczna zwykłego wpisu to nie
  zmiana potwierdzonego okresu). Połączenie i dopisanie strony przelewu w edytorze pytają tak samo; zmiana zbiorcza
  pokazuje to w podglądzie.
- **T267** Lista Operacji (F18): filtry „Więcej filtrów” – kwota od / do bez znaku (granice włącznie, „do” poniżej „od” =
  bez górnej granicy), domownik (finansuje zakup – także część, wpłata od niego), kontrahent po marce importu
  (`brandKeyOf` z połączonymi nazwami), kontener, cel, pożyczka, konto przelewu ('' = spoza budżetu; przelew w jednej
  operacji – oba konta); kategoria główna bierze podkategorie, podkategoria sama. Kolejność: data, kwota bez znaku od
  największej, kontrahent A–Z po polsku (bez nazwy na końcu). Widoki w fi.json (`settings.operationViews`, wspólne dla
  komputerów, ta sama nazwa – zastąpiony, okres tylko na życzenie; `filterOf` sprawdza każde pole – wartość nowszej wersji
  pominięta), filtr komputera pamięta też kwoty i kolejność. Eksport CSV / Excel widocznej listy w jej kolejności, na
  liście jednego konta z kwotą przelewu na tym koncie (przegląd S). Przejście do operacji z innego ekranu i nowa operacja
  zdejmują wszystkie filtry, które mogą ją ukryć (`noNarrowing`), a „wszystkie” w edytorze jest widokiem – zapisany filtr
  zostaje (przegląd S).
- **T268** Paleta szuka wpisów (F19): `shared/search.ts` `searchRecords` – operacje jak wyszukiwanie Operacji (najnowsze 30),
  kontenery, cele, pożyczki, domownicy i pozycje Ustawień (po 10; sama kwota nie szuka ustawień); cmdk bez własnego
  filtra (`shouldFilter={false}`), komendy po słowach bez polskich znaków. Wybrany wpis otwiera swój ekran
  (`focusRecord` + `useFocusRecord`: rozwinięcie szczegółów, przewinięcie, wyróżnienie `focus-mark` na 2 s), operacja –
  w Operacjach jak z Meldunków.
- **T269** Dziennik zmian folderu (F33, Synchronizacja): ostatni zapis każdego wpisu (`updatedAt` / `updatedBy`) z dziś,
  7 albo 30 dni, po komputerze i rodzaju, najnowsze najpierw (`shared/changeLog.ts`); „nowy” = utworzony w tym okresie
  (przegląd S – wpis pisany w edytorze zapisuje się wiele razy). „Zmiany” porównuje z najnowszą wersją z historii
  wpisu (odkładaną najwyżej co 10 min edycji tego komputera, zawsze przy zmianie z innego), „Weź poprzednią wersję”,
  „pokaż” – wpis na jego ekranie. Lista czyta znaczniki zapisu, które zapis wpisuje w miejscu (W26) – liczona ponownie po
  każdym zapisie.
- **T270** Przegląd grupy S (`/code-review` high, 10 kandydatów – 9 poprawionych z testem, 1 wydajnościowy bez testu):
  strony przelewu w dniach po dwóch stronach startu budżetu albo dzisiejszego dnia (T262), filtry 1.7.0 przy przejściu
  do operacji i „wszystkie” jako widok (T267), „Na konto” przelewu sprzed 1.7.0 (T262), połączenie pary bez usuniętej
  drugiej strony i błąd usunięcia pokazany (T264), lista par przed połączeniem (T264), scalenie duplikatów z przelewem w
  jednej operacji (cała decyzja: obie strony, wiersz i dzień drugiej; jedna strona to inna decyzja), eksport listy jednego
  konta (T267), podgląd zmiany zbiorczej bez drugiego liczenia stanu sprzed zmiany (T265), „nowy” w dzienniku zmian
  (T269). Mutacje: 64, 63 wykryte przez testy, 1 równoważna (zdarzenie drugiej strony przelewu, gdy obie są w biegu –
  ruch 0 zł, bez wpisu w dzienniku silnika).
- **T271** Ukrycie kwot w chwili zmiany (F40, CI na `main` po scaleniu 1.6.6): ukrycie (ręczne albo koniec pokazania)
  kończy pokazanie „na chwilę” i „do końca sesji” w chwili zmiany, nie po zapisie config.json – inaczej przy wolnym
  dysku ukrycie zapisywane dłużej kasowało nowsze „Pokaż na …” zamówione w międzyczasie, a bezczynność chowała kwoty od
  razu (job Windows na `main` – 1.6.6 bez wydania, wchodzi w 1.7.0). Zmienna testowa `FI_CONFIG_WRITE_DELAY_MS` (wolny
  zapis config.json) odtwarza to w E2E na każdym komputerze.

### 1.8.0 – przyszłość, funkcje (grupa T, 19.10.2026)

- **T272** Cel z terminem – potrzebna rata (F15, D87): `fleet.ts` `goalInstallment(brak, miesiąc, termin)` = brak
  podzielony po równo na miesiące do terminu (ten włącznie), w całych groszach w dół, reszta w miesiącu terminu; po
  terminie 0. Mapa gwiezdna pokazuje ją przy każdym celu z terminem zawsze („kurs przechwycenia: X/mies. do MM.RRRR”, obok
  tempo z ETA; akcent, gdy rata wyższa niż tempo). „Rata z pensji” to opcja celu: `goal.rates` [{from, until}] (addytywne,
  od następnego miesiąca; wyłączenie zamyka okres na bieżącym miesiącu – raty pobrane zostają w celu). Silnik bierze raty
  przy wypłacie pensji po zbiornikach, tylko gdy osłony i kadłub są pełne na przełomie miesiąca (przed pensją – kolejność
  D13 bez zmian), z energii miesiąca (najwyżej to, co jest), cele po priorytecie; zdarzenie dziennika `rate`. Termin celu
  jest w jego historii zmian (`past[].deadline`, `goalAt` – stan sprzed 1.8.0 bez terminu bierze najbliższy późniejszy
  znany): zmiana terminu nie zmienia rat miesięcy przed nią. Plan miesiąca: wiersz „Kurs przechwycenia – raty celów z
  terminem” (miesiąc przed silnikiem: raty planowe z dopiskiem „gdy osłony i kadłub pełne 1. dnia”), debriefing –
  „− raty celów” w energii miesiąca.
- **T273** Zaplanowane operacje – boje nawigacyjne (F16): kolekcja `scheduled/ULID.json` (układ 'id', addytywna –
  starsza wersja jej nie czyta): nazwa, dzień, kwota ze znakiem (null = termin bez kwoty), `yearly` (29 lutego – 28. w
  innych latach), konto, kategoria (wydatek), kontrahent, `remind` (dni przed terminem, domyślnie 14 i 3), `done`
  {dzień: id operacji | '' = odhaczone}, `notMatched`, notatka. Dzień zrobiony: operacja zrobiona z boi („Wykonaj
  teraz” – zapisuje operację dziś z kwotą, kategorią, kontem i kontrahentem boi i otwiera ją w Operacjach, „Cofnij”
  zdejmuje oba), odhaczenie albo operacja dopasowana jak wpis ręczny w imporcie (`looseMatch`: ta sama kwota ±3 dni,
  podobna nazwa przed samą kwotą, bliższy dzień; jedna operacja – jeden dzień, konto boi, gdy ustawione, nigdy przelew
  własny ani korekta; także operacja zapisana z wyprzedzeniem – prognoza sald kont liczy ją, a boi już nie); „to nie
  ta” wyklucza operację na stałe. Dzień po terminie zostaje „po terminie” przez 30
  dni (`LAPSE_DAYS`), potem znika (co roku – czeka na następny rok). Radar (rodzaj `plan`, konto płatności), odprawa
  (przypomnienia z `remind`, po terminie), powiadomienia (`notify.plans`); koniec kontenera z `until` (ostatnia płatność
  w 14 dniach – Radar `end`, odprawa, powiadomienie: „potem ładownia lżejsza o X/mies.”).
- **T274** Prognoza sald kont (F26): `calc/ahead.ts` `accountsAhead` – każde konto budżetu przez 90 dni Radaru od
  dzisiejszego salda: płatności Radaru z kontem (kontenery i pożyczki z kontem, boje z kontem – zaległa dziś) i operacje
  już zapisane z późniejszą datą (każda strona przelewu na swoim koncie). Brak = pierwszy dzień, w którym płatność schodzi
  poniżej zera przy dzisiejszym saldzie ≥ 0 (saldo ujemne już dziś to sprawa banku, nie prognozy); źródło = inne konto
  (nie gotówka), które do tego dnia zachowuje najwięcej i co najmniej brakującą kwotę. „Zaplanuj przelew własny” zapisuje
  jeden przelew (F10, obie strony) dziś na kwotę w górę do pełnych złotych i otwiera go w Operacjach („Cofnij”). Odprawa
  i powiadomienie (`notify.accounts`, alarm): „Na koncie X zabraknie … na płatność dd.mm (przyczyna) – przelej z konta Y”.
  Wydatki codzienne nie są prognozowane (bez dnia i konta).
- **T275** Osłony po zdarzeniu na Radarze (F27): od dzisiejszych warstw – pensja 1. dnia z osłon (z kadłuba, gdy brakuje
  – D14), boja-wydatek z osłon (kadłub, gdy brakuje), boja-wpływ dokowany w kolejności D13, spłata pożyczki udzielonej do
  osłon. Płatności ładowni i zbiorników idą z pensji (osłony ich nie widzą), wpływów bez dnia nie liczymy – linia z samych
  znanych zdarzeń.
- **T276** Kurs na 12 miesięcy (F27, Wywiad): `calc/course.ts` `course` – od dzisiejszych warstw miesiąc po miesiącu
  regułami silnika: pensja z osłon 1. dnia (kadłub, gdy brakuje), raty celów (T272) tylko przy pełnych osłonach i
  kadłubie, koszty po średniej z pensji (ponad nią – z osłon), boje i spodziewane spłaty w swoich miesiącach, wpływy
  dokowane D13, reszta energii do osłon (łupy). Trzy kursy wpływów: „bez wypłat z XTB” (mediana pracy), mediana, średnia
  z 12 miesięcy (panel Przychody). Wynik: osłony i kadłub pełne, ETA celów (akcent po terminie), miesiące poniżej
  minimum osłon i z pensją z kadłuba, tabela osłon i kadłuba. Nic nie jest zapisywane.
- **T277** Symulator manewrów (F35): manewr to zmienione wejście kursu (`maneuver`) – pensja od miesiąca, zakup w
  miesiącu (z osłon albo z pieniędzy celu – brak dopłacają osłony), N miesięcy bez wypłat z XTB, koszty wyższe o %, nowy
  cel (z opcją raty), nowy kontener (miesięczny udział kosztów); porównanie „teraz” / „po manewrze” na wybranym kursie.
  Jedyny zapis: „Zastosuj pensję od …” (plan miesiąca, jak zmiana pensji w Planie miesiąca).
- **T278** Reszta koperty planowej na następny miesiąc (F28, D87): decyzja łupów ma `envelopes` {kategoria: kwota}
  (addytywne; najwyżej to, czego koperta nie wydała – ekran), kolejność: cele → koperty planowe → koperty codzienne
  następnego miesiąca → osłony. Silnik dodaje kwotę do energii i do limitu koperty w miesiącu decyzji (`envelopeExtra`);
  podział pensji pokazuje „+X” przy kopercie, debriefing „w tym ±X zapasu i pokryć”. Starsza wersja oddaje tę część
  osłonom.
- **T279** „Pokryj z koperty…” (F28, D73 bez zmian): `monthPlan.envelopeCovers` [{id, from, to, amount, at}] (addytywne)
  – przesunięcie limitu w bieżącym miesiącu z koperty z zapasem na przekroczoną planową (domyślnie mniejsza z kwot:
  przekroczenie, zapas źródła); dwie zmiany planu w jednej, „Cofnij”. Gra ocenia dzień według limitów sprzed pokryć z
  tego dnia (`coversBefore` = początek dnia oceny) – pokrycie z wcześniejszego dnia już się liczy; dziennik wachty
  pokazuje każde pokrycie.
- **T280** Plan kampanii (F37): siatka 12 miesięcy roku w Planie miesiąca – pensja i limit każdej koperty (plan w mocy:
  własny miesiąca jasno, odziedziczony przygaszony), pod limitem fakt (wydatki jak w debriefingu: bez płatności
  kontenerów, pieniędzy celów i zakupów do zwrotu; pensja – koszty miesiąca), w podpowiedzi ten sam miesiąc rok wcześniej
  (sezon). Edycja bieżącego i dalszych miesięcy (miesiąc miniony zostaje – silnik go przeliczył); puste pole = bez
  koperty w tym miesiącu; „»” kopiuje wartość na dalsze miesiące roku z własnym planem (pozostałe biorą ją z planu
  wcześniejszego) z „Cofnij”. Wiersz kategorii zarchiwizowanej tylko, gdy plan roku daje jej limit.
- **T281** Teksty 1.8.0: miesiąc po „od / do / z” w dopełniaczu (`monthGenLabel` – „od stycznia 2027”), także w
  „+ łupy z …” planu miesiąca; konto nazwane wprost („Na koncie mBank zabraknie …”, „z konta Portfel XTB”) – metafora
  ładowni zostaje dla kontenerów (D34); „pensja / pensje / pensji” przez `countLabel`.
- **T282** Przegląd grupy T (`/code-review` high, 10 kandydatów – wszystkie poprawione): operacja zapisana z wyprzedzeniem
  zamyka boję (każdy dzień boi z kwotą szuka swojej operacji w ±3 dni, nie tylko dni do 3 dni naprzód – prognoza sald
  kont nie liczy tych pieniędzy dwa razy); przypomnienia boi dalej niż 90 dni (odprawa i powiadomienia czytają dni tak
  daleko, jak sięga najdłuższe przypomnienie – `remindReach`; Radar i panel boi zostają przy 90 dniach); symulator –
  koszty jeszcze nieznane zostają nieznane (zmiana kosztów i kontener bez skutku, z podpowiedzią), pensja manewru do
  następnego miesiąca z własnym planem (jak „Zastosuj pensję”), zasięg „teraz” z całym długiem (rata tego miesiąca i
  zaległa jeszcze niezapłacone); plan kampanii – przekroczenie według limitu silnika (zapas i pokrycia miesiąca –
  `extraOf`, „+” / „−” przy fakcie) i w akcencie (zieleń / czerwień tylko dla kwot na plus / minus); jedno liczenie
  wydatków kopert dla debriefingu i planu rocznego (`monthSpending`); klasa okrętu w symulatorze z `shipClass`; indeks
  operacji boi raz na listę.

### 1.9.0 – ładownia i czujniki, funkcje (grupa U, 19.10.2026)

- **T283** Historia kwot kontenera (F9): `container.past` [{until, amount}] (addytywne). Zmiana kwoty – w edytorze albo
  „Zaktualizuj” – liczy się od bieżącego miesiąca: miesiące wcześniejsze zostają przy starej kwocie (`pastAfterChange`:
  dotychczasowa kwota do poprzedniego miesiąca, chyba że kontener liczy się dopiero od tego miesiąca – `from`, inaczej
  miesiąc utworzenia – albo zmiana z tego miesiąca już zamknęła historię: druga zmiana w miesiącu ustawia tylko nową
  kwotę). `amountIn(c, miesiąc)` wszędzie, gdzie liczy się kwota w miesiącu (podział pensji, raty zbiorników, linia
  zanurzenia `monthlyWeight(c, miesiąc)`, Radar, odprawa, stan opłat). „Jedna kwota we wszystkich miesiącach”
  (`clearPast`) to poprawka pomyłki, nie podwyżka. Starsza wersja czyta samo `amount`.
- **T284** Nowa cena kontenera (F9): płatności liczone cyklami – suma płatności jednego terminu (płatność do 14 dni
  przed terminem należy do niego, jak w stanie opłat; czynsz w dwóch przelewach to jedna kwota), ostatni cykl dopiero
  cały (minęły jego dni albo ma tyle płatności co cykl przed nim). Opłata co miesiąc i co 2 miesiące – dwa ostatnie
  cykle po ostatniej zmianie kwoty (`amountAt`; cena ustawiona po nich to decyzja), każdy dalej od kwoty niż max(5%,
  2 zł) i zgodne ze sobą; opłata okresowa (co 3 miesiące i rzadziej, harmonogram) – ostatni cykl; rachunek zmienny –
  75. percentyl cykli z 12 miesięcy (co najmniej 3), w górę do pełnych złotych, dalej niż max(10%, 2 zł). Kontener pożyczki pomijany (raty są
  pożyczki). „Zaktualizuj od <miesiąca>” (T283, „Cofnij”), „To nie zmiana ceny” – `priceIgnored` = ta kwota (inna cena
  będzie proponowana). Odprawa (`price`, raz na nową cenę), powiadomienie (`notify.cargoWatch`), Meldunki („Ładownia”),
  Ładownia – znaczek „cięższy / lżejszy”, w edytorze płatności, symulacja linii zanurzenia i zasięgu z nową kwotą.
- **T285** Kontener bez płatności (F9): kontener z płatnościami, bez płatności w dwóch ostatnich terminach – termin w
  dniu płatności (`paymentDay`: środkowy z ostatnich płatności, inaczej dzień kontenera), po swoich 3 dniach
  (`OVERDUE_DAYS`) i w zasięgu plików z banku jego konta (`coveredTo` albo ostatni wiersz z banku; konto bez plików –
  dziś); płatność do 14 dni przed terminem należy do niego; po `until` kontenera terminów nie ma. „Zrzuć z ładowni”
  (archiwizacja, najpierw symulacja), „Nadal płacę” (`aliveAt` – liczy się jak płatność tego dnia). Odprawa (`dead`, klucz
  z drugim brakującym terminem), powiadomienie, Meldunki.
- **T286** Opłaty cykliczne (F23): `container.schedule` [miesiące 1–12] (addytywne) – opłata w zaznaczonych miesiącach
  (2–11; dzień z daty płatności; każda w kwocie płatności), `cycleMonths` = 12, więc starsza wersja czyta ją jak opłatę co
  rok (zbiornik zbiera na cały rok – bezpiecznie). Cykl = od poprzedniego zaznaczonego miesiąca do następnego
  (`cyclePosition` → `length`), raty zbiornika na tę długość, waga miesięczna = kwota × liczba miesięcy / 12.
  `container.variable` (addytywne) – rachunek o zmiennej kwocie (pilnowany wg T284). Rozpoznanie w historii
  (`recurringPayments`): co miesiąc – stała kwota (±15%) albo rachunek zmienny (±60% mediany, dzień miesiąca ±6 dni od
  środkowego; kwota = 75. percentyl roku w górę do złotych); co 2, 3, 6 miesięcy – co najmniej 3 ostatnie płatności w
  odstępie cyklu (±12 dni), stała kwota, następna nie przegapiona; co rok – jak dotąd; harmonogram – 3–11 płatności w 12
  miesiącach, każda w innym miesiącu, stała kwota, ten sam dzień (±6), historia z banku od co najmniej roku, następna nie
  przegapiona (najdłuższa przerwa). Nowa opłata (`fresh` – płatność poprzedniego miesiąca zrobiła z niej opłatę) –
  odprawa (`recurring`, raz w miesiącu) i powiadomienie. „Nie proponuj” → `settings.cargo.ignored` (klucze odbiorców,
  addytywne; „Ukryte propozycje: N – proponuj znowu”).
- **T287** Plik z mBanku w Pobranych (F14): main `BankFiles` obserwuje Pobrane (`app.getPath('downloads')`, w testach
  `FI_DOWNLOADS_DIR`) i folder pliku ostatnio wybranego w imporcie (`config.importDir`) – `fs.watch` i przegląd co minutę;
  plik CSV do 20 MB zmieniony w ostatnich 14 dniach czytany parserem importu (nagłówek, okres, numer rachunku, liczba
  wierszy). Okno może przeczytać albo przenieść do Kosza tylko plik, o którym dostało wiadomość (id = SHA-1 ścieżki).
  Nowy = nie ma importu tej nazwy i okresu (niecofniętego) ani importów jego konta obejmujących okres po zapisaniu
  pliku. Odprawa („Nowy meldunek z mBanku (dd.mm–dd.mm): nazwa w folderze Pobrane – importuj.”), powiadomienie (zawsze
  przy włączonej obserwacji), Import – „Nowe pliki z mBanku” z „Importuj”; po imporcie „Przenieś plik do Kosza”.
  Wyłącznik per komputer `prefs.bankFiles` (Ustawienia → Import z banku). Przypomnienie o zaległym imporcie podaje, jak
  pobrać plik w mBanku (`MBANK_EXPORT_HINT`).
- **T288** Radar anomalii (F31): wydatki z 60 dni (zakupy – wydatek bez pieniędzy celu i bez całego zakupu domownika;
  płatności kontenerów tylko w (d) – pilnuje ich Ładownia): (a) koszt > 1,5 × 90. percentyl zakupów marki z roku przed
  nim (co najmniej 5); (b) kategoria w tym miesiącu > 2 × średniej z 3 miesięcy przed (średnia ≥ 50 zł, historia sprzed
  tych 3 miesięcy, bez ładowni); (c) nowy kontrahent (marka pierwszy raz) od progu dziennika (`impulseThreshold`, 0 =
  wyłączone) przy co najmniej 90 dniach historii przed nim; (d) dwa wiersze z banku (nie nierozliczone) jednej marki i
  kwoty tego samego albo następnego dnia – możliwe podwójne pobranie (nigdy nie łączone; żółte). „To w porządku” →
  `settings.anomalies.ok` (klucze, ostatnie 1000, „Cofnij”). Odprawa – sygnały z 14 dni; Meldunki – wszystkie;
  Operacje – oznaczenie „nietypowa” (filtr); powiadomienie (`notify.anomalies`); edytor operacji – notatka z „To w
  porządku”.
- **T289** Zwroty w drodze (F34): operacja `awaitReturn` {amount, until, closedAt} (addytywne) – wydatek czekający na
  pieniądze; domyślnie cała kwota i 14 dni od zakupu. Wpływ tej samej marki (wpływ albo wydatek o dodatniej kwocie –
  zwrot towaru) ±10% kwoty, w dniu zakupu albo później, zamyka go sam (jeden wpływ – jeden zakup, najpierw
  najwcześniejszy zakup, najbliższa kwota). Po `until` – odprawa (żółta, codziennie do zwrotu albo zamknięcia),
  powiadomienie (`notify.returns`), Meldunki („Zwroty w drodze”); Radar – panel „Zwroty w drodze” i spodziewany wpływ w
  jego dniu (bez konta: prognoza sald kont na nim nie polega); Operacje – oznaczenie „czeka na zwrot”. „Zamknij”
  (`closedAt`, zostaje w historii), „Nie czekam na zwrot” zdejmuje; zmiana rodzaju operacji z wydatku i kierunku na
  wpływ zdejmuje też `awaitReturn` (wpływ nigdy nie czeka – byłby swoim własnym zwrotem); zakup bez kwoty – przycisk
  nieaktywny.
- **T290** Przegląd grupy U (`/code-review` high, 10 kandydatów – 9 poprawionych z testem, wersja 1.9.0 przed PR):
  cena kontenera płaconego kilkoma przelewami z sumy cyklu (T284 – wcześniej czynsz w dwóch przelewach dawał fałszywe
  „lżejszy 2 000 → 1 000 zł”); zwrot po zmianie kierunku na wpływ nie paruje się sam ze sobą (T289); otwarcie pliku z
  banku z powiadomienia albo odprawy czeka na koniec zapisu importu (jak upuszczenie pliku – B93); harmonogram i historia
  kwot kontenera zapisują chwilę zmiany masy (`amountAt` – ocena ładunku w grze); czujniki liczone tylko po zmianie
  pól, które czytają (`sensorTransactions` – lista operacji ta sama po wpisaniu notatki, dziennika, godziny; ładownia
  po treści miesięcy historii silnika, anomalie po swoich ustawieniach, nie całym fi.json): pomiar na 150 tys. operacji –
  propozycje z historii ≈ 170 ms i anomalie ≈ 130 ms na każdą zmianę, licznik menu bocznego jest zawsze zamontowany;
  oznaczenia wierszy Operacji z jednego liczenia strony; obserwacja Pobranych czyta najpierw 16 KB (nagłówek mBanku –
  inny CSV nigdy w całości); „Przenieś plik do Kosza” przy pliku już usuniętym – „nic nie przeniesiono” zamiast błędu;
  wspólne `dm` (`format.ts`), `percentile` (`plan.ts`), `SHORT_MONTHS`. Wersja w `package.json` – podbita przed PR.

### 1.10.0 – wywiad, funkcje (grupa V, 19.10.2026)

- **T291** Tagi i wyprawy (F17): `transaction.tags`, `split.tags` i `importRule.tags` (addytywne, `tagListSchema` – do
  20 tagów po 40 znaków; zły zapis – pole pominięte, nie rekord). Jeden tag różnie zapisany („#Wakacje”, „wakacje ”)
  to jeden (`tagKey` – bez wielkości liter i polskich znaków), zostaje pierwsza pisownia. Tag operacji dotyczy
  wszystkich jej części, część paragonu może mieć własny. Gdzie: edytor (pole „Tagi” przy wydatku i wpływie, „#” przy
  części paragonu; ostatnia część usunięta oddaje swoje tagi operacji), szybki wpis (pole, „+ #tag” ostatnich 7 dni –
  `LAST_TAG_DAYS`, „#słowo” w nazwie – wyjęte z nazwy, żeby marka była bez niego – albo w notatce – zostaje w niej;
  „Zapisz i następny” zachowuje tagi; „#” z cyfrą na początku to część nazwy, np. „Pizzeria #1”), reguła importu
  („zmień” → „Tagi operacji”; operacja z reguły dostaje jej tagi tylko wtedy, gdy decyzja wiersza jest decyzją
  reguły), filtr Operacji („Więcej filtrów” → „Tag” – klucze tagów, także w zapisanych widokach), wyszukiwanie (tekst
  operacji z „#tag”), wiersz listy, eksport CSV i Excel („Tagi”). Wywiad → „Wyprawy”: wydane netto (zwrot towaru i
  zaliczki odejmuje; część domownika nie jest moim kosztem; zakup z pieniędzy celu się liczy – wyprawa jest na niego),
  operacje, okres, karta po kategoriach głównych i miesiącach, cel z Mapy gwiezdnej (`settings.intel.tagGoals`: klucz
  tagu → id celu, „Ekspedycja „X”: wydano … z … celu”, ponad cel – akcent) i „Pokaż w Operacjach” (cała historia;
  widok – zapisany filtr zostaje, B88).
- **T292** Wywiad do szczegółu (F20): „Wydatki w czasie” – kategoria główna rozwija podkategorie (część na samej
  kategorii głównej – „bez podkategorii”), kwota w komórce otwiera Operacje (miesiąc, wydatki, ta kategoria; wiersz
  ładowni – jej kontenery). „Namierzone cele” – marki okresu strony (z połączonymi nazwami importu, 1.2.2): suma,
  kontakty, średni paragon, trend wobec tak samo długiego okresu wcześniej, główna kategoria i udział marki w niej,
  ostatnia wizyta (dymek „Rozpoznanie celu – …”); klik – Operacje tej marki z całej historii; bez opłat ładowni i
  zakupów z pieniędzy celu. „Porównanie – miesiąc” (domyślnie ostatni pełny): kategorie główne i ładownia wobec
  średniej z 3 i 12 miesięcy przed nim (tylko miesiące objęte historią) i tego samego miesiąca rok wcześniej; akcent
  (▲) tylko przy przekroczeniu o ponad 10% (`OVER_SHARE`). Edytor wydatku: „Rozpoznanie celu: u tego kontrahenta w RRRR
  – N zakupów, X zł, średnio Y zł” (od 2 zakupów w roku operacji; indeks marek liczony raz na listę operacji –
  `brandYears`).
- **T293** Majątek netto (F24, D87 – druga linia, D73 / T81 bez zmian): „Siła floty netto” = salda kont + należności −
  dług. Pożyczka udzielona: otwarta w danym dniu kwota (od dnia pożyczki, minus spłaty do tego dnia; zamknięta – 0 od
  dnia `closedAt`), wzięta – tak samo ze znakiem minus; domownicy – saldo teraz (należne − depozyt) minus przepływy
  operacji po danym dniu (pożyczone − oddane − (zaliczki − wzięte z depozytu)). Wykres Wywiadu: przełącznik „na kontach
  / siła floty netto” (na tym komputerze, `fi.intel.wealthBasis`) – struktura (BOS / CHoCH), szczyt i drawdown na
  wybranej linii, druga przerywana; przegląd roczny – siła floty netto na początku i końcu roku. Mostek bez zmian.
- **T294** Bilans paliwa (F25): przychód miesiąca (praca i trading netto, bez pieniędzy domowników – D81; miesiąc
  samych dopłat do XTB – 0, N4) minus koszty netto (jak debriefing) = ile miesiąc dołożył do okrętu; stopa
  oszczędności = bilans / przychód (jedno miejsce po przecinku; bez przychodu „—”); wariant bez tradingu (praca −
  koszty). Wywiad – 12 pełnych miesięcy objętych historią (bieżący w toku – pominięty), mediany 6 i 12 miesięcy,
  mediana bez tradingu, trend (mediana 3 ostatnich wobec 3 wcześniejszych); debriefing (Plan miesiąca, Raporty) –
  „Bilans paliwa …, stopa oszczędności X% (mediana 6 mies.: Y%)” (mediana z 6 miesięcy przed tym miesiącem); przegląd
  roczny – bilans i stopa roku; eksport „Miesiące” – kolumny „Bilans (zł)” i „Stopa oszczędności (%)”. Wykres
  przepływu (Sankey, w propozycji opcjonalny) – nie.
- **T295** „Skąd ta liczba?” (F29): Mostek – energia dziś rozbita (koperty codzienne miesiąca z łupami, wydane do
  wczoraj, zostało na N dni, podstawowy przydział, zaoszczędzone / przekroczone wcześniej na każdy dzień, przydział na
  dziś, wydane dziś = energia dziś), zasięg (osłony + kadłub − dług = paliwo, koszty miesiąca ze źródłem, zasięg), cele
  osłon i kadłuba (× pensja, × koszty), ostatnia dostawa (rezerwa PIT-38, osłony, kadłub, cele) – jedno rozbicie naraz,
  także w osobnym oknie (dane w `BridgeFleet`). Dymek zasobnika: „Energia dziś: X zł (przydział Y − dziś Z)” od
  pierwszego wydatku dnia. Słowniczek metafory (`shared/glossary.ts`) pod F1, „?” w nagłówkach paneli (`Panel hint`:
  Koperty, Pensja, Dzienny przydział, Linia zanurzenia, Odkładki, Kolejność wypełniania, Na radarze, Dokowanie, Wyprawy,
  Bilans paliwa) i dymki metafor stanu okrętu.
- **T296** Osobista inflacja (F36, D87 – CPI GUS wpisywane ręcznie, bez sieci): porównywane są te z 12 ostatnich
  pełnych miesięcy, które mają w historii swój miesiąc rok wcześniej; kategorie główne rok do roku (ceny i nawyki
  razem); średni paragon u tych samych marek (co najmniej 3 zakupy w obu latach – `INFLATION_MIN_PURCHASES`);
  kontenery – kwota sprzed roku i teraz (historia kwot, F9); „Twoja inflacja” = zmiany marek i kontenerów ważone
  pieniędzmi sprzed roku; CPI za miesiąc (`settings.intel.cpi` RRRR-MM → % rok do roku, −50…200, „4,9”; puste
  zdejmuje; domyślnie poprzedni miesiąc – GUS publikuje w połowie następnego), pokazywane ostatnie wpisane; cel kadłuba
  (miesiące × średnia kosztów 12 objętych miesięcy) rok temu i teraz.
- **T297** Wywiad w kodzie: panele w osobnych plikach (`features/intel/Drill.tsx`, `Expeditions.tsx`, `Fuel.tsx`,
  `Inflation.tsx`), obliczenia czyste (`calc/drill.ts`, `tags.ts`, `fuel.ts`, `netWorth.ts`, `inflation.ts`, `why.ts`,
  `shared/glossary.ts`), liczone raz na stan danych (tagi historii, podsumowania wypraw i indeks marek – WeakMap po
  liście operacji; panele – `useMemo`).
- **T298** Przegląd grupy V (`/code-review` high, 10 kandydatów – wszystkie poprawione, z testem tam, gdzie liczby):
  tagi wpisane po przecinku z „#” („#wakacje, #remont”) – bez „#” w drugim (`tagLabel` obcina spacje przed „#”); wpływ
  z tagiem odejmuje od wyprawy tylko moje pieniądze – przelew domownika i jego część wpłaty nie są „mniej wydanym”
  (D80, D81: `incomeShares` z numerem części – `line`, moja część ze swoimi tagami i kategorią); „bez podkategorii” w
  „Wydatkach w czasie” bez kliknięcia (filtr Operacji bierze kategorię główną z podkategoriami – pokazałby więcej niż
  kwota); udział marki w kategorii liczony od wszystkich zakupów kategorii w okresie, także bez nazwy (gotówka, wpis
  ręczny – wcześniej 100%); waga kontenera w „Twojej inflacji” z porównywanych miesięcy jak waga marek (wcześniej × 12
  przy krótszej historii); majątek netto czyta operacje pożyczek tym samym przejściem co stan pożyczek
  (`forEachLoanOperation`); zasięg w „Skąd ta liczba?” tekstem Mostka (`rangeText`); ostatni tag szybkiego wpisu liczony
  raz na listę operacji i dzień (`lastTagOf` – nie przy każdym otwarciu okna); bilans paliwa bez zieleni i czerwieni
  przy ukrytych kwotach (B61); usunięte nieużywane `brandYear`, `periodMonths`, `summaryTotal`. Poza przeglądem: „?”
  słowniczka obok tytułu panelu, nie w nim (nazwa panelu w menu „Układ” bez „?”).
- **T299** Zamykanie aplikacji w E2E (1.10.0, Windows CI): test zawiesił się na `app.close()` – proces główny czekał na
  synchroniczne pytanie o niezapisane zmiany, co blokuje też Playwright i sprzątanie workera (3 min + 90 s bez słowa o
  przyczynie). `launch()` (`tests/e2e/app.ts` `guardClose`) zamyka aplikację z limitem 40 s, po nim kończy proces
  (SIGKILL – na SIGTERM Electron sam się zamyka, czego zablokowany proces nie zrobi) i zgłasza błąd z końcem main.log;
  proces główny przed pytaniem zapisuje w logu jego przyczynę (decyzje o zmianach z drugiego komputera, wpisy nowszej
  wersji, błąd zapisu) – także dla użytkownika, który prześle main.log.
- **T300** Ustawienia komputera w oknach od razu, klawisze rozmiaru (F30) jako krok liczony w procesie głównym (1.10.0 –
  job Windows na `main` po PR #32): proces główny zmieniał ustawienia w pamięci od razu, ale stosował je i rozsyłał do
  okien dopiero po zapisie config.json – zapisy idą po kolei, każda zmiana czeka na swój (na Windows antywirus spowalnia
  każdy), a każde echo niosło stan z chwili swojej zmiany. Okno liczyło nowy rozmiar ze swojej kopii: Ctrl+Plus × 5 w
  oknie głównym i od razu Ctrl+Minus w szybkim wpisie – okno szybkiego wpisu miało jeszcze 130 % i wysłało 120 % (zamiast
  140 %), które proces główny zapisał jako ostatnie. Teraz `changePrefs` stosuje zmianę (rozmiar, skrót, pliki z banku)
  i rozsyła ją w chwili zmiany w pamięci, zapis po nim, odpowiedź = ustawienia po zapisie (najnowsze); okno wysyła tylko
  klawisz rozmiaru (`zoomKeyOf` → `'in'` / `'out'` / `'reset'`, IPC `zoomBy`), krok liczy proces główny od rozmiaru,
  który ma (`zoomByKey`; na granicy 90 / 150 % bez zapisu), okno niczego nie zgaduje (odpowiedź pokazana, gdy żadna
  zmiana tego okna nie jest w drodze). Nieudany zapis zostawia zmianę działającą (komunikat „działają, ale bez
  zapisu”), a okno bierze wtedy ustawienia procesu głównego (`loadMachinePrefs` – echa innych zmian nie były w tym
  czasie pokazane). Suwak i „100%” w Ustawieniach zostają rozmiarem wprost (wybrany, nie krok). E2E `look.spec.ts` z
  wolnym zapisem config.json (300 ms) – na starym kodzie pada za każdym razem (90 % zamiast 140 %); 11 mutacji – wszystkie
  wykryte.
- **T301** Zamknięcie bez fałszywego „zapis jeszcze trwa” (1.10.1, D88 – job Windows w PR #32 i #34): przy zamykaniu
  `flushSaves` wysyłał zapis każdego niezapisanego wpisu i czekał tylko na zapisy trwające w tej chwili. Wpis zmieniony
  w trakcie – na przykład pole zatwierdzone przy zamykaniu, zapis paczką zaczęty tuż przed albo zapis w tle (porcja dni
  gry, cele ICTTJ, data i salda rozliczeń) – zostawał niezapisany bez błędu, więc proces główny pytał „niezapisane
  zmiany (zapis jeszcze trwa)” i stawał na synchronicznym pytaniu (main.log z CI nie mówi, który wpis – poprawka działa
  po wersjach wpisów, więc obejmuje każde z tych źródeł). Teraz `flushSaves` pisze w rundach (najwyżej 10): każda wysyła
  wpisy, których wersja zmieniła się od wysłania w tym zapisie, i czeka na wszystkie trwające zapisy i usunięcia
  (`deletions` – `deleteRecord`, `deleteRecords`: wpis, którego pliku dysk nie oddał, jest znowu w pamięci z niezapisaną
  zmianą i ta zapisuje się przed odpowiedzią); zapis nieudany albo czekający na decyzję o zmianie z drugiego komputera
  nie jest wysyłany drugi raz (odpowiedzią jest jego błąd albo decyzja – bez pętli). Na czas każdego zapisu wszystkiego
  (zamykanie, Ctrl+S, „zapisz przed…” kopii, eksportu, importu, cofnięcia, aktualizacji; zmiana folderu – od zapisu do
  otwarcia innego) zapisy w tle nie ruszają (`backgroundHeld`, `holding`, warunek `writesInBackground` w
  `useGameAdvance`, `useIctjGoalSync`, `useHouseholdSinceSeed` – sprawdzany przy rysowaniu i jeszcze raz, gdy efekt
  rusza); po zamknięciu z zapisanym wszystkim – aż okno zniknie, najwyżej 10 s (gdyby proces główny okno zostawił:
  pytanie po minucie zapisu, „Anuluj”); nowy obraz folderu (`applySnapshot`) to wstrzymanie kończy. Świadomie bez zmian
  (przegląd): efekty zapisów w tle ruszają po każdym zapisie wszystkiego – gra bez dni do zamrożenia tylko przegląda
  zamrożone dni, cele ICTTJ i rozliczenia tylko porównują; paczka, której zapis nie wyszedł w trakcie zamykania,
  ponawiana po jednym wpisie – jak przed 1.10.1, z pytaniem procesu głównego po minucie. Testy jednostkowe: zmiana w
  trakcie zapisu, paczka zaczęta w trakcie zamykania, usunięcie jednego i kilku wpisów w drodze, zapis nieudany (jedna
  próba), wstrzymanie przy Ctrl+S, kopii i zmianie folderu, koniec wstrzymania z nowym folderem; 14 mutacji – 13
  wykrytych, jedna nieobserwowalna (zakończone usunięcie zostawione w zbiorze daje tylko puste rundy). CI na Windows:
  podsumowanie pierwszego importu (269 operacji i kopia folderu) w teście „Cofnij import” czeka jak kroki masowe tego
  testu (`MASS`, 30 s; lokalnie import przed zmianą i po niej trwa tyle samo), porażka pokazuje komunikaty okna i
  main.log; długi zapis wszystkiego (od 500 ms) zostawia w main.log rundy i liczbę niezapisanych.
