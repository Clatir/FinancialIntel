# Financial Intel – decyzje użytkownika

Decyzje użytkownika (D) z wywiadu i rund pomocniczych 15–16.10.2026 i późniejsze. Decyzji D nie zmieniaj bez pytania;
nowe dopisuj na końcu z datą i wskaż, którą zastępują. Decyzje techniczne (T) są od 08.11.2026 w
`docs/decyzje-techniczne.md` (D103, T525) – odwołania „`docs/decyzje.md` T…” w starszych plikach prowadzą tam.

## Decyzje użytkownika

### Zakres i granica
- **D1** Nazwa: Financial Intel. Okręt nazywa użytkownik, domyślnie „Flagowiec”.
- **D2** Windows 11, kilka komputerów (nigdy jednocześnie), synchronizacja przez OneDrive. Bez wersji na iPhone'a – **zniesione (D92)**: wersja na iPhone'a.
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
- **D89** (20.10.2026) Pytanie: jak opisać, czym jest wydatek (nie tylko kontrahent i tytuł przelewu)? Odpowiedź: jest
  „Notatka” (edytor, szybki wpis), dziennik kapitański i tagi; braki – notatki nie widać na liście, część paragonu nie ma
  opisu. Prośba: dodać te funkcje i wybór widocznych kolumn listy operacji. „Zgoda na wszystkie propozycje” (1.11.0):
  - a) notatka na liście jako osobna kolumna „Notatka” (pierwsza linia, całość w dymku; bez notatki – opisy części);
  - b) kolumny do ukrycia: Godzina, Kontrahent, Konto, Notatka, Kategoria, Tagi, Oznaczenia (konto i tagi we własnych
    kolumnach); Data i Kwota zawsze; domyślnie wszystkie widoczne;
  - c) wybór kolumn zapamiętany na tym komputerze;
  - d) zapisane widoki listy nie pamiętają kolumn;
  - e) eksport widocznej listy zawsze ze wszystkimi kolumnami;
  - opis części paragonu w edytorze operacji (do 500 znaków), w wyszukiwarce i w eksporcie; szybki wpis bez zmian.
- **D90** (21.10.2026) Zasada współpracy: przed każdym zadaniem tabela prac – krok, zakres, model i thinking oszczędne,
  ale z górką (o stopień wyżej niż minimum), szacowany czas pracy Claude'a; razem i rekomendacja dla całości (CLAUDE.md,
  „Zasada współpracy”). Zgłoszenie do 1.12.0: zwrot domownika liczony „od najstarszego wydatku” jest nieintuicyjny –
  zwrot (także przez pośrednika) ma być powiązany z konkretnym wydatkiem; propozycja w „Przed etapem 1.12.0”
  (`docs/postep.md`), czeka na odpowiedzi.
- **D91** (21.10.2026) Komenda „Rozpocznij całość prac (etapy 1–5) jednym ciągiem” po „Przed etapem 1.12.0” – bez
  odpowiedzi na pytania a–f, więc przyjęte propozycje (jak D86): a) wpłata bez pewnego dopasowania – „zwrot do
  przypisania” (saldo osoby maleje, zakupy czekają na wskazanie); b) pewne dopasowanie (kwota jednego zakupu, suma
  wszystkich, jedyny zestaw 2–3 z 90 dni) wiąże samo, do zmiany; c) nadwyżka ponad wskazane zakupy – przy innych
  zakupach do oddania „do przypisania”, bez nich wg ustawienia osoby; d) dawne zwroty zostają jak są (od najstarszego) do
  dnia aktualizacji, dzień do zmiany w Ustawieniach → Domownicy; e) zwrot towaru – do wskazanego zakupu (podpowiedź: ten
  sam kontrahent); f) zaliczka idzie sama na najbliższy zakup (jak dotąd). Wydanie 1.12.0.

- **D92** (21.10.2026) Wersja na iPhone'a – odpowiedź na plan grup iA–iE („D2 znosimy, AltStore, rejestracja na az
  ok, wspólna numeracja”):
  - D2 zniesione: aplikacja na iPhone'a z tym samym folderem danych na OneDrive; telefon jest dla folderu kolejnym
    komputerem (nigdy naraz – jak D2);
  - zakres: wersja towarzysząca (IP0.1–IP0.5, IP1–IP7) i pełny port bez importu z mBanku (IP10), raportów (IP20) i pełnej
    Synchronizacji (IP23) – te zostają na PC; numeracja IP… w `docs/plan.md`, sekcja „Wersja na iPhone'a”;
  - instalacja bez App Store: AltStore z darmowym Apple ID (IP-A1; podpis odnawiany co 7 dni przez AltServer na
    Windows), plik `.ipa` w GitHub Releases i źródło AltStore z repozytorium;
  - rejestracja aplikacji w Microsoft Entra (Azure) na koncie Microsoft użytkownika – po jego stronie (kroki w „Przed
    grupą iA” w `docs/postep.md`);
  - numeracja wersji wspólna z Windows: grupa iA = 1.13.0, kolejne grupy – kolejne wersje (zapisane najpierw jako D89 /
    D90 z iA = 1.11.0; 1.11.0 i 1.12.0 wydała w tym czasie równoległa sesja – D89, D91 – więc numery przesunięte);
  - grupy iA–iE z pauzą i komendą przed każdą (D67), jeden PR i wydanie na grupę (D71).
  Do decyzji później: IP21 (kreator na telefonie – propozycja: bez niego), IP15 (dokowanie – tylko gdy folder ICTTJ jest
  na OneDrive; przed iD), IP24 (zapisy w tle z telefonu; przed iE). F41 (skrót iOS zapisujący plik) nadal odrzucone (D88).
- **D93** (21.10.2026) Komenda „Rozpocznij grupy” – grupy iA–iE jedna po drugiej, każda z własnym PR i wydaniem (D71);
  w tabeli prac przy każdej grupie – co potrzebne przed nią i szacunek zużycia limitu tygodniowego (plan Max 20x, 55 %
  zużyte 21.10.2026; odnowienie w niedzielę o 18:00). Przerwa po grupie iC na sprawdzenie limitu (z górką iA–iC ok.
  37 %), chyba że użytkownik powie inaczej; iD czeka na odpowiedź o folderze ICTTJ (IP15), iE – na IP21 i IP24. Start iA
  wstrzymany do przełączenia thinking na max (prośba użytkownika).
- **D94** (24.10.2026) Wcześniejsza wpłata domownika może finansować późniejszy zakup: zgłoszenie użytkownika („jeżeli
  najpierw otrzymam przelew na zrealizowanie zakupów a potem zrobię zakup to nie mogę ustawić że wcześniejsza wpłata
  finansuje późniejszy zakup”). Wcześniejszy wpływ domownika (`income` lub `repaymentShare`) wskazujący późniejszy
  zakup w `covers` rezerwuje kwotę jako celową zaliczkę w warstwie depozytu (nawet przy `advance: false`), a późniejszy
  zakup zużywa ją w pierwszej kolejności przed wolnymi zaliczkami i pożyczką z osłon, zapisując wpłatę w `PurchaseState.by`
  i otrzymując status `oddane` (lub `częściowo oddane`). W interfejsie zakupu menu „Przypisz zwrot…” oferuje wcześniejsze
  wpłaty z wolną kwotą, a edytor wpłaty oferuje późniejsze zakupy danego domownika.
- **D95** (24.10.2026) Kompleksowy audyt funkcjonalny aplikacji na PC pod kątem spójności i ergonomii (N-PC-1 do N-PC-20):
  20 poprawek wdrożonych w 3 pakietach (A, B, C):
  - *Pakiet A (Dokowanie i finanse)*: N-PC-1 (częściowe dokowanie z ICTTJ), N-PC-2 (wycofanie i korekta dokowania),
    N-PC-3 (precyzyjne kwoty zasilenia celów w dokowaniu), N-PC-4 (ochrona transakcji celów i ładowni przy zmianie kategorii/rodzaju),
    N-PC-5 (wybór konta w szybkim wpisie), N-PC-7 (usuwanie nieużywanych kategorii w Ustawieniach).
  - *Pakiet B (Import, domownicy i pozycje)*: N-PC-9 (wcześniejsze wpłaty z zamkniętych miesięcy w „Przypisz zwrot…”),
    N-PC-10 (podział wpłaty od wielu domowników w regułach i imporcie), N-PC-15 (dwustronny przelew własny w imporcie),
    N-PC-13 (cele i ładownia w pozycjach podzielonego paragonu), N-PC-14 (automatyczne oczyszczenie covers usuniętego zakupu),
    N-PC-11 (czytelne etykiety tagów w szybkim wpisie).
  - *Pakiet C (Wygoda, Radar i Rytuały)*: N-PC-6 (przenoszenie środków z aktywnego celu bez archiwizacji), N-PC-8 (rata
    nominalna vs wyrównawcza w ładowni), N-PC-12 (rozliczenie długu otwarcia wybranego domownika w transakcjach wieloosobowych),
    N-PC-16 (zmiana podziału łupów także po 7. dniu miesiąca), N-PC-17 (spłata pożyczki z planu miesiąca przez kontener ładowni),
    N-PC-18 (domownicy i rozliczenia na start w Kreatorze), N-PC-19 (naprawa paradoksu ciszy nocnej dla wydatków planowanych),
    N-PC-20 (wznowienie zamkniętego lub odłożonego raportu wachty wieczornej).
- **D96** (25.10.2026) Po audycie zużycia tokenów: (1) **thinking domyślnie xhigh**, **max tylko** dla kroków silnika
  pieniędzy (warstwy, dokowanie, rozliczenia z domownikami, zwroty, plan miesiąca) i granicy ICTTJ („nigdy nie zapisuj w
  folderze ICTTJ”) – dotąd prawie wszystkie grupy szły na max; (2) **tabela prac przed każdym etapem** (zamiast przed
  każdym zadaniem – zmienia D90): krok, zakres, model i thinking z górką, szacowany czas, razem i rekomendacja; przy
  pojedynczym zadaniu poza etapem wystarczy jedna linia z modelem i thinking.
- **D97** (03.11.2026) Audyt funkcjonalny wydania 1.15.4 (`docs/audyt/plan.md`, wzór: odbiór Regulated Day): tylko
  funkcje użytkowe aplikacji na komputerze; wersja na iPhone'a poza audytem; audyt przed grupą iD. Grupy w blokach
  według modelu: najpierw Opus · xhigh, potem Sonnet, na końcu Opus · max; synteza i wnioski po bloku max (xhigh), bo
  muszą widzieć wszystkie znaleziska. W trakcie audytu nic nie jest naprawiane. Jeden `/code-review` dla narzędzia
  i generatora danych, commit po każdej grupie, jeden PR na końcu. Limit tygodniowy nie ogranicza audytu. Maszyna
  wirtualna z Cowork – tak (AU-3). Tylko dane syntetyczne – bez kopii prawdziwego folderu. Bloki A i B jednym ciągiem.
- **D98** (04.11.2026) Wersja na iPhone'a wstrzymana bez terminu: grupy iD i iE (dawne 1.16.0, 1.17.0) oraz usprawnienia
  tylko dla telefonu (AP-39 widżet, AP-40 Face ID) czekają na osobną decyzję; wydane 1.13.0–1.15.0 zostają bez zmian.
  Po audycie najpierw komputer: grupy naprawcze N1–N5 (1.15.5–1.15.9), potem rozwojowe.
- **D99** (04.11.2026) Wnioski audytu 1.15.4 (`docs/audyt/wnioski.md`) przyjęte: wszystkie usprawnienia AP-1…AP-48
  (poza AP-39 i AP-40 – D98) według rekomendacji z sekcji 4, w tym AP-17 jako propozycja „Dopełnij kadłub z osłon”
  jednym kliknięciem i tolerancja 1 % firewalla; AP-41 i AP-44 też wchodzą (na końcu, rozwojowo; prognoza wieloletnia bez
  IKE / IKZE / PPK – F32 odrzucone, D88). Pytania z sekcji 7: (1) S4 – jawna „zaliczka na przyszłość” **może omijać dług
  osoby** (zostaje zachowanie 1.15.3); „reszta jako zaliczka” nadal najpierw spłaca, a reszta idzie do depozytu
  (AF-8 – błąd etykiety i działania); (2) T163 – dostawa liczona od razu według puli wpisu ICTTJ; (3) RA.4 – niezapłacona
  opłata zostaje „po terminie” także w kolejnych miesiącach, aż do zapłaty; (4) S6 – energia dziś nie większa niż energia
  pozostała w miesiącu, zwrot dawnego zakupu rozłożony na kolejne dni; (5) po przerwie pytanie przed zamrożeniem dni bez
  importu; (6) tolerancja 1 % i propozycja dopełnienia kadłuba; (7) rozkazy tylko w Ustawieniach (D84 C9, w Dowództwie
  odczyt), godzina odprawy jako opcja, domyślnie przy pierwszym otwarciu; (9) wszystkie rekomendacje z tabeli sekcji 5
  (S1, S2, S3, S5, S7–S10, C14, C16, C20, C21, R-3, R-7 / R-8, R-9, R-16, R-17, R-19, T47, Z6, Z12, D91 b, T286, T291,
  OP.33, OP.40, T156 i pozostałe wiersze tabeli); (10) nieaktualne (D98); (12) kalibracja progów gry po N3, po 1–2
  miesiącach na poprawionej wersji, za osobną zgodą. Otwarte: (8) model gotówki – przed N5 (AP-33); (11) karty kredytowe
  – przed AP-41.
- **D100** (04.11.2026) (1) Gotówka prowadzona na koncie „Gotówka” (pytanie 8 z D99): wypłata z bankomatu to przelew
  mBank → Gotówka, zakupy gotówką – wydatki z konta Gotówka (AP-33). (2) Nowa funkcja (grupa N2): **każda wpłata – także od
  innej osoby niż pożyczkobiorca (domownik albo ktoś spoza listy) – może spłacać pożyczkę udzieloną**: przy wpływie (szybki
  wpis, Operacje, import – wiersz i grupa, reguła importu) wybór „spłata pożyczki …” z listy otwartych pożyczek, także
  część wpłaty (reszta – jak dziś: spłata domownika, depozyt albo przychód); pożyczka maleje o spłatę, nadwyżka ponad dług
  to przychód (T70); w wierszu pożyczki widać, kto zapłacił. Szczegóły techniczne – T-decyzja w N2.
- **D101** (04.11.2026) Ciąg prac po audycie: (1) grupy N1 → N2 → N3 → N4 → N5 → R1 → R2 jednym ciągiem, bez pauz między
  grupami (komenda z 04.11); sesja główna koordynuje, pracę wykonują podagenci z modelem i thinking według D96; (2) kart
  kredytowych ani rat 0 % nie używam – AP-41 w R2 to tylko plan spłaty pożyczek, bez konta karty z cyklem wyciągu
  (pytanie 11 z D99 zamknięte); (3) wydanie po każdej grupie (1.15.5 … 1.15.9, 1.16.0, 1.17.0); (4) zasada wątpliwości:
  zachowanie widoczne dla użytkownika, którego nie rozstrzygają D99 i D100 – wariant rekomendowany, zapisany „do
  potwierdzenia” w `docs/postep.md`, ciąg idzie dalej; przerwa tylko przy wyborze trudnym do cofnięcia (np. zmiana formatu
  danych), przy CI czerwonym dwa razy w tej samej grupie albo krytycznym znalezisku w nowym kodzie bez naprawy; (5) procentu
  limitu tygodniowego nie podaję – bez szacunku zużycia.
- **D102** (06.11.2026) Nadwyżka przelewu za kilku domowników: (1) zawsze najpierw pełna spłata długów wszystkich osób
  w przelewie (nadawcy oraz domowników z „w tym za”), a podziałowi podlega dopiero wolna górka ponad sumę ich długów
  i spłat pożyczek; (2) domyślnie nadwyżka należy do nadawcy według jego ustawienia (`przychód` / `zaliczka` / `pytaj` –
  przy „pytaj” pyta za każdym razem), z przyciskami szybkiego podziału „po równo” (grosze reszty dla nadawcy – T3) oraz
  „proporcjonalnie do długów”; (3) nadwyżka innego domownika w „w tym za” ma jawny cel (`przychód` lub `zaliczka`), a dla
  osoby z ustawieniem „pytaj” wymaga odpowiedzi (w szybkim wpisie blokuje zapis z komunikatem, w imporcie trzyma temat
  jako „do zrobienia”, a odpowiedź zapisuje wybór w `fi.json`); (4) „spłata pożyczki” z nadwyżki dotyczy wyłącznie
  otwartych pożyczek udzielonych z Radaru (D100), bez długów między domownikami; (5) reguły importu pamiętają listę osób
  w „w tym za” (`alsoFor`) i podział nadwyżki (`surplusSplit`: `'even' | 'debts'`) bez stałych kwot PLN dla domowników
  („najpierw dług” zawsze); (6) poprawione wszystkie trzy miejsca: edytor operacji, szybki wpis i import CSV. Wydanie 1.19.0.
- **D103** (08.11.2026) Oszczędzanie tokenów bez spadku jakości (audyt zużycia tokenów, zmienia D96 część (1)):
  (1) **przeglądy** – poziom `/code-review` według ryzyka: xhigh – silnik pieniędzy (warstwy, dokowanie, rozliczenia
  z domownikami, zwroty, plan miesiąca), folder danych, migracje, synchronizacja, telefon (sync), granica ICTTJ; high –
  reszta kodu; medium – same dokumenty i konfiguracja. Najwyżej dwie rundy na PR: pierwsza na całym diffie, druga tylko
  na diffie poprawek z pierwszej; trzecia tylko, gdy druga znalazła critical albo high – znowu tylko na nowych poprawkach.
  Poprawiane: critical i high zawsze (z testem); medium – gdy da się napisać test, który bez poprawki pada (w dokumentach:
  oczywisty błąd); reszta (low, nit, medium bez testu) → „Uwagi na później” we wpisie w postępie. Z przeglądu nie wchodzi
  zmiana zachowania widocznego dla użytkownika bez pytania. Fable 5.1 tylko jako druga opinia przy znalezisku critical;
  (2) **thinking** – domyślnie high; xhigh dla logiki (migracje, synchronizacja, folder danych, telefon, reszta logiki);
  **max tylko** w krokach, które zmieniają silnik pieniędzy albo granicę ICTTJ (implementacja i jej przegląd), nigdy dla
  całej grupy; zamknięcie (CHANGELOG, postęp, PR, CI) – Sonnet 5.5 według tabeli skilla `etap`, na granicy kroku z `/clear`;
  (3) **kontekst** – `/clear` po każdym scalonym PR (Claude mówi wprost, że można); `docs/postep.md` ≤ 20 KB (stan, kolejka,
  wpis bieżącej grupy; wpisy po wydaniu do archiwum); `CHANGELOG.md` przy dopisywaniu wersji – Read z `limit` (początek
  pliku), nigdy całość; zamknięte przeglądy i raporty → `docs/archiwum/`.

