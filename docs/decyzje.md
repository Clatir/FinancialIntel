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
  startem, jest w saldzie otwarcia; przepływy sprzed startu zostają dla statystyk (ile z wpłaty było przychodem). Konto
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
