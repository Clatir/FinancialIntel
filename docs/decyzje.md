# Financial Intel – decyzje

Decyzje użytkownika (D) z wywiadu i rund pomocniczych 15–16.10.2026 oraz decyzje techniczne (T) podjęte przez Claude.
Decyzji D nie zmieniaj bez pytania; nowe decyzje dopisuj na końcu z datą.

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
  Ctrl+Shift+Y synchronizacja, F1 / ? ściąga. Zmienne testowe `FI_*` zamiast `ICTJ_*` (lista w `.claude/rules/testy.md`).
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
  scalenie duplikatów czy synchronizacja nie przenoszą pieniędzy; dokowanie pary liczonej według puli – utworzenie jej
  operacji, `countedFrom`, T363), bez dokowania utworzenie operacji, nigdy wcześniej niż
  początek jej dnia; łupy – chwila decyzji (`decidedAt`), dokowanie przy starcie – koniec dnia startu. Cel sprzed 1.4.2 bez
  historii działa jak wcześniej (`goalDecided`). Każda zmiana zostaje w historii, także kilka w krótkim czasie: kolejność
  jest wspólna dla wszystkich celów – stan wycięty z historii jednego celu remisowałby albo zamieniał go z innym (scalanie
  bliskich zmian sprawdzone i odrzucone – archiwizacja tuż po dodaniu zabierała celowi pieniądze).
- **T129** Pieniądze celu (D84 C2, B30): archiwizacja celu z pieniędzmi pyta – osłony / inny cel / zostają; przeniesienie =
  wpis `transfers` {at, to, amount}, silnik na koniec dnia przenosi `min(kwota, stan)` (nigdy więcej, niż cel ma);
  „przenieś środki” na liście zarchiwizowanych także później (cele ICTTJ spoza scenariusza też); „Cofnij” przywraca cel.
  **Od 1.15.6 „na koniec dnia” zastąpione przez T340** (w chwili `at` wśród zdarzeń dnia – AP-3, AF-4).
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
  opłaty: przed startem budżetu i jej `from`; płatności sprzed startu – sprzed pierwszej z nich, T345), inaczej to zaległa
  zapłata poprzedniego cyklu. Zapłacony cykl: bez rat,
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
  **Od 1.15.6 zdanie o silniku zastąpione przez T341** (para liczona od razu według puli wpisu – D99 pkt 2, AP-12);
  wstrzymanie zamrażania zostaje.
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
  pokazane jako decyzja tematu – jej zmiana je zastępuje (z „w tym za” kilku marek – trafia do każdej marki, T336).
  Słowo kluczowe z paska zbiorczego dla każdej decyzji ze słowem
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
  podsumowanie importu (269 operacji i kopia folderu) czeka jak kroki masowe (`MASS`, 30 s; lokalnie import przed zmianą
  i po niej trwa tyle samo), porażka pokazuje komunikaty okna i main.log; długi zapis wszystkiego (od 500 ms) zostawia w
  main.log rundy i liczbę niezapisanych. W PR #35 tylko test „Cofnij import”; PR #36 (sama dokumentacja) padł na tym
  samym czekaniu w teście „Oficer…”, więc `importDone` i `MASS` są w `tests/e2e/app.ts` dla każdego czekania na
  podsumowanie importu (import-tools, import, duplikaty, podobne nazwy, plik z Pobranych). Na 15 przebiegach joba
  Windows (1.8.0–1.10.1) czasy testów importu po 1.10.1 są takie jak przed nim – „Oficer…” ok. 7,5 s, „Cofnij import”
  17–39 s – a w przebiegu PR #36 sąsiednie testy importu szły w tej samej minucie 1,4–2,4 × wolniej: dysk runnera bywa
  chwilami wolniejszy, a 10 s domyślnego czekania nie wystarcza wtedy na zapis setek plików.
- **T302** E2E „kwoty ukryte po bezczynności” (1.6.6, F40) na wolnym dysku (CI na `main` po PR #36): „pokazane na
  chwilę” trwało w teście 0,6 s (`revealAmounts(0.01)`), a odpowiedź `revealAmounts` przychodzi po zapisie config.json
  – za zapisem ukrycia tuż przed nim (w teście wolny zapis 300 ms każdy, T271). Job Windows dostał odpowiedź, gdy 0,6 s
  już minęło, i kwot pokazanych nie zobaczył (24 sprawdzenia w 10 s); lokalnie to samo przy zapisie 500 ms. Teraz chwila
  trwa 3 s (`revealAmounts(0.05)`) – dłużej niż dwa wolne zapisy, a koniec chwili nadal mieści się w czekaniu na ukrycie
  (10 s); przy zapisie 500 ms test przechodzi. Aplikacja bez zmian.
- **T303** Opis wydatku i kolumny listy operacji (1.11.0, D89): opis części paragonu to istniejące pole `split.note`
  (schemat bez zmian, bez migracji; limit 500 znaków tylko w polu edytora). `calc/operations.ts` `notesOf` (notatka i
  opisy części, przycięte, niepuste – dymek kolumny), `operationsView.ts` `noteLineOf` (pierwsza linia notatki; bez niej
  opisy części z „ · ”), wyszukiwarka listy i paleta szukają też w opisach części (`searchTextOf`); eksport – kolumna
  „Notatka”: notatka operacji jak jest, potem opisy części z kategorią części („Rozrywka i hobby: kabel HDMI”), bo
  „Kategoria” wymienia wszystkie części, a opisy tylko opisane; duplikaty – opis części liczy się do treści użytkownika
  (kopia z nim zostaje). Usunięcie przedostatniej części: opis ostatniej przechodzi do notatki operacji (jak jej tagi).
  Kolumny: `features/operations/columns.ts` – w localStorage `fi.operations.columns` zapisane ukryte (kolumna nowszej
  wersji widoczna, dopóki jej nie ukryć; ukryte nieznane tej wersji zostają w zapisie, „Przywróć domyślne” czyści
  wszystko), `columnsTemplate` – siatka z widocznych kolumn; kolumny tekstowe `minmax(0, …fr)` (kontrahent najmniej
  64 px), odstęp 6 px zamiast 8 px – dziewięć kolumn ma najmniejszą szerokość taką jak siedem przed 1.11.0 (nagłówek nie
  wchodzi pod panel szczegółów w oknie 1024 px – E2E). Ukrycie kolumny „Kontrahent” przy kolejności po kontrahencie
  wraca do kolejności po dacie (jej nagłówek był jedynym znakiem kolejności); „nowa operacja” w pierwszej widocznej
  kolumnie tekstowej (bez żadnej – data w akcencie). Tagi wiersza i eksportu jednym `tags.ts` `tagsText`, liczone tylko
  przy widocznej kolumnie.
- **T304** Zwrot domownika przypisany do zakupu (1.12.0, D91). Pieniądze bez zmian: wpłata spłaca najwyżej to, co osoba
  ma oddać, reszta to zaliczka albo przychód – osłony, depozyt, przychody i warstwy liczą się jak przed 1.12.0 (test
  porównuje flotę „od najstarszego” i „wskazane”). Zmienia się tylko to, który zakup jest oddany: `calc/household.ts`
  `repay` – od dnia `settings.household.assignFrom` (`assignsOn`; brak = jak dotąd, null = od początku) tylko zakupy, które
  operacja wskazuje (`covers` w kolejności wskazania – przypisany później bierze to, co zostało; `coversOpening` – dług
  salda na start rozliczeń, który nie ma operacji: osobne pole, bo `covers` przyjmuje tylko id operacji, a zmiana formatu
  wyczyściłaby wskazania w starszej wersji), całą kwotą wpłaty; spłacone ponad wskazane czeka na przypisanie
  (`MemberBalance.unassigned`, `owed` = otwarte zakupy − to), wpłata za zakup już spłacony czekającymi pieniędzmi zużywa je
  (najstarsze najpierw). `since` tylko przy długu. Stan każdego zakupu `HouseholdLedger.purchases` (`PurchaseState`:
  pożyczone, z zaliczki, oddane, którymi operacjami), `purchaseStatus`, `repaidMarks` (oznaczenia listy, pamięć po
  mapie). Dopasowanie `calc/repayments.ts`: `matchCovers` (jeden zakup o tej kwocie, suma wszystkich – najwyżej
  `MAX_COVERS` 500 jak schemat, jedyny zestaw 2–3 z ostatnich 40 zakupów z 90 dni), `matchReturn` (ten sam kontrahent),
  `proposeCovers` (każda osoba przelewu osobno), `linkRepayments` (nowe operacje po kolei – każda widzi wcześniejsze;
  tylko operacje domowników, reszta historii odfiltrowana raz) – import (`withRepayments` przed zapisem), szybki wpis i
  wybór osoby w edytorze (`sureCoversOf`). `withKind` zostawia wskazania przy wydatku (zwrot towaru). Dzień przejścia
  ustawiany raz na folder (dziś – `useHouseholdSinceSeed`), zmiana w Ustawieniach → Domownicy z „Cofnij”.
- **T305** Folder danych na telefonie (iA, IP0.1): `DataStore` komputera (`src/main/datastore/`) działa na telefonie bez
  zmian nad wirtualnym systemem plików w pamięci (`src/mobile/vfs/vfs.ts`, `Vfs`) utrwalanym w IndexedDB (`fi-phone`:
  `entries`, `folders`, `kv`; zapisy grupowane). Moduły Node podmienia build telefonu i projekt Vitest `mobile`
  (`scripts/mobile-aliases.mjs`: `node:fs` → `src/mobile/node/fs.ts`, `node:path`, `node:crypto` – SHA-1 i losowe bajty;
  `zlib` / `stream` – „nie działa na telefonie – kopie zapasowe robi komputer”). Każdy plik lustra ma numer zmiany
  (`dirty` – kolejka do wysłania) i metadane OneDrive (`id`, `eTag`, `cTag`); usunięcie pliku znanego na OneDrive
  zostawia nagrobek do wysłania, pliki tymczasowe zapisu atomowego nie są utrwalane ani wysyłane. Lustro to tylko
  `.json` folderu bez `backups/` i `.history/` (historia wersji i kopie zostają na komputerze; historia zmian zrobionych
  na telefonie jest tylko w telefonie) i bez folderów ukrytych poza `.presence/`. Telefon ma system plików bez rozróżniania
  wielkości liter jak OneDrive (`process.platform` = `ios` w buildzie). Bez sieci aplikacja startuje z lustra.
- **T306** Synchronizacja z OneDrive i logowanie (iA, IP0.1, IP0.5): Microsoft Graph – zmiany folderu przez `delta` po
  identyfikatorach (drzewo folderów zapamiętane, więc przeniesienia i zmiany nazw folderów dochodzą), strony delty zebrane
  przed zastosowaniem, 410 = pełna lista od nowa (pliki, których nie ma, usuwane z lustra), pobieranie przez
  `@microsoft.graph.downloadUrl` (bez nagłówka autoryzacji – adresy działają z CORS; wygasły adres pobierany od nowa),
  paczki po 50 i 8 naraz. Wysyłanie: PUT `items/{folder}:/{ścieżka}:/content` z `If-Match` (eTag wersji, którą zmiana
  zastępuje) albo `conflictBehavior=fail` dla nowego pliku, 404 = brakujące foldery tworzone i jeszcze raz, usunięcie z
  `If-Match`; 429 / 503 z `Retry-After`, 401 = jedno odnowienie tokenu. Konflikt (412 / 409 – plik zmienił się na
  OneDrive): wersja z OneDrive zostaje w lustrze i w folderze, wersja z telefonu idzie obok jako
  `<nazwa>-telefon-<czas>.json`, którą komputer pokazuje w Synchronizacji jako kopię konfliktu („zmiana z telefonu w tym
  samym czasie co na komputerze”, `guessConflictSource`) – wybór albo „Scal…” na komputerze; usunięcie odrzucone przez
  412 przywraca wersję z OneDrive. Plik obecności telefonu nadpisywany bez `If-Match`. Zmiany z OneDrive trafiają do
  magazynu w jego kolejce (`DataStore.applyExternal`: zapis do lustra i odświeżenie tych ścieżek pod blokadą – okno
  dostaje je jak zmiany z drugiego komputera, z pytaniem przy własnych niezapisanych edycjach). Harmonogram: przy otwarciu,
  co 30 s przy otwartej aplikacji, 1,5 s po zmianie, przy przejściu do tła (najpierw zapis zmian okna); bez sieci –
  ponowienia po 10 / 30 / 60 / 120 s. Logowanie: kod autoryzacji z PKCE dla klienta publicznego (`consumers`,
  przekierowanie `financialintel://auth`, zakresy `Files.ReadWrite offline_access User.Read`, aplikacja zarejestrowana
  przez użytkownika – D92); żądanie tokenu natywnym HTTP Capacitora (żądanie z WebView dostaje od Microsoft
  AADSTS9002326 – wymiana kodu z innego originu tylko dla SPA), Graph i pobieranie przez `fetch`. Token odświeżania w
  Preferences (pamięć aplikacji, nie pęk kluczy – bez wtyczki spoza Capacitora), token dostępu tylko w pamięci, odnawiany
  5 min przed końcem, jedno odnowienie naraz; odrzucony token odświeżania = stan „zaloguj ponownie” (przycisk w
  Ustawieniach telefonu – lustro i czekające zmiany zostają; zapamiętany `me.id` konta: inne konto jest odrzucane, bo
  folder i czekające zmiany są pierwszego), chwilowa awaria Microsoft (429, 5xx) i brak sieci nie wylogowują.
- **T307** Aplikacja telefonu (iA, IP0.3, IP1, IP2): renderer komputera bez zmian nad `window.fi` z
  `src/mobile/host/host.ts` (`PhoneHost` – to, co na komputerze robi proces główny: magazyn nad lustrem, zmiany po
  pokazaniu folderu, obecność telefonu w `.presence/` i „w użyciu” jak na PC – D86, ustawienia telefonu w Preferences);
  błędy przechodzą w formacie IPC Electrona (`errorMessage` okna zdejmuje przedrostek), funkcje tylko komputera
  (import, kopie, eksport, ICTTJ, aktualizacje, pliki) odpowiadają „To zrobisz na komputerze”. Szybki wpis to okno
  komputera (`QuickApp`) w arkuszu nad aplikacją – ten sam protokół `quick*` w jednym oknie. Telefon: menu na dole
  (Mostek, „+ Szybki wpis”, Telefon), pasek z okrętem, stanem synchronizacji i ukryciem kwot, panele w `CompactContext`
  (bez odłączania, powiększania, ukrywania i zmiany rozmiaru), Mostek w jednej kolumnie (`BridgePanels single` – bez
  dokowania, które zostaje na PC), ekran spoza telefonu mówi, że jest na komputerze, i prowadzi na Mostek. Build
  `vite.mobile.config.mts` (`out/mobile`, Safari 16, CSP: tylko własne pliki i https), E2E `tests/e2e-mobile/`
  (Playwright, profil iPhone 13, Chromium na Linuksie i WebKit na macOS, udawany OneDrive `tests/mobile/fakeGraph.ts` na
  lokalnym serwerze razem z aplikacją).
- **T308** Powiadomienia z wyprzedzeniem (iA, IP0.4): iOS nie uruchamia aplikacji w tle, więc przy każdym otwarciu i
  chwilę po każdej zmianie danych aplikacja oddaje systemowi plan na 7 dni (`src/shared/notifyPlan.ts`
  `plannedNotices`): odprawa poranna po ciszy nocnej, nie przed 7:00 (domyślna cisza kończy się o 5:00), raport wachty o
  jego godzinie (w ciszy nocnej – minutę przed nią, jak na PC; zrobiony dziś – nie dziś), dni z Radaru o 9:00 (opłaty,
  raty, boje, PIT-38, zwroty – wg przełączników telefonu), nic w ciszy nocnej ani w przeszłości, najwyżej 60 (iOS trzyma
  64); plan od nowa także co 10 minut przy otwartej aplikacji, przy powrocie do niej i po „Dziś bez wydatków”. Klucze
  odprawy i raportu są kluczami powiadomień okna i żadne nie przychodzi dwa razy: plan jest zapamiętany
  (`fi.phone.planned` – `keepPlanned`: minione zostają dwa dni, anulowane znikają, nieudany plan nie liczy na stary), a
  klucze należne w ciągu 2 minut trafiają do `fi.notify.sent` przed sprawdzeniem okna (`installPlannedDue` przed
  `initNotifier`); powiadomienie pokazane przez okno (odprawa przy otwarciu o 6:00) zdejmuje zaplanowane z tym kluczem i
  plan go już nie dodaje (`notify` z kluczem, `PhoneHost.wasShown`, dwa dni). Dotknięcie powiadomienia, które uruchomiło
  aplikację, czeka, aż okno zacznie słuchać; w 1.13.0 każde prowadzi na Mostek (pozostałe ekrany dochodzą w iB–iE).
- **T309** Wydanie na iPhone'a (iA, IP0.2): Capacitor 8 (Swift Package Manager, wtyczki App, Browser, Preferences,
  LocalNotifications), projekt `ios/` w repozytorium (`app.financialintel.ios`, iOS 16+, tylko pion, ciemny wygląd,
  schemat URL `financialintel`), ikona i ekran startowy z `resources/icon.png` (`scripts/make-ios-assets.py`). CI:
  job macOS `ios` (PR, gałąź domyślna, ręcznie – jak Windows): E2E telefonu w WebKit, build aplikacji z opcjonalnym
  identyfikatorem klienta ze zmiennej repozytorium `FI_CLIENT_ID` (inaczej wpisywany przy pierwszym uruchomieniu),
  `xcodebuild` bez podpisu → `Financial-Intel.ipa` (AltStore podpisuje ją Apple ID użytkownika), uruchomienie w
  symulatorze (build Debug wypisuje konsolę aplikacji – czeka na `FI_PHONE_BOOT_OK`). Job `ios-release` po wydaniu z jobu
  Windows dołącza do niego `.ipa`, źródło AltStore `altstore.json` (`scripts/altstore-source.mjs`) i dopisuje sumę `.ipa`
  do `SHA256SUMS.txt` (aktualizator na Windows bierze tylko swoje pliki; na chwilę podmiany sumy ma też `digest`
  GitHuba). Wydanie dla Windows nie czeka na macOS – czerwony job `ios` nie wstrzymuje aktualizacji komputerów, a
  kolejne wypchnięcie tej samej wersji dołącza brakującą `.ipa`. Źródło AltStore:
  `https://github.com/Clatir/FinancialIntel/releases/latest/download/altstore.json`. Instrukcja: `docs/iphone.md`.
- **T310** Wachta na telefonie (iB, IP3–IP7): dolne menu – Mostek, Operacje, „+ Wpis”, Meldunki (licznik meldunków
  telefonu), Więcej (Plan miesiąca, Radar, Telefon); kolumny ekranów komputera w trybie telefonu jedna pod drugą
  (`Columns` w `CompactContext`, kontekst w `components/compact.ts` – bez cyklu `Panel` ↔ `layout`). Operacje
  (`src/mobile/app/PhoneOperations.tsx`): lista kart na filtrze listy komputera (`useOperationsUi` – zapisany filtr tego
  telefonu jak na komputerze): wyszukiwanie, miesiąc (‹ ›, „cała historia”), konta, kategorie główne, oznaczenia, sumy;
  filtry ustawione inaczej (kwota, domownik, marka, tagi) działają i można je zdjąć; karta mówi to, co wiersz komputera
  (`features/operations/rowText.ts` `operationRowText` – wspólne: kategoria, wspólny zakup, pieniądze domownika, konta
  przelewu, kwota na koncie listy); nad listą raport wieczorny („Dziś bez wydatków”); dotknięcie – edytor komputera na
  cały ekran (wszystkie pola, „Historia”, usunięcie z „Cofnij”), „+ Nowa” – szkic porzucany bez zmiany; wyjście z
  Operacji zamyka operację (następna wizyta – lista). Zmiana zakładki zapisuje najpierw pole w trakcie pisania
  (`setPhoneTab` → `commitActiveField`: na iPhonie dotknięcie przycisku nie zabiera fokusu, więc żadne wyjście z pola
  go nie zapisze). Meldunki (`PhoneInbox.tsx`): bez kategorii, podwójna korekta („to nie powtórzenie”), anomalie („to w
  porządku”), wpłaty domownika do przypisania, zakupy do zwrotu, zwroty w drodze i salda – saldo z banku wpisane w
  meldunku (`useConfirmToday`: różnica pyta, czy dzisiejsze operacje są dopisane); pozostałe rodzaje policzone, „na
  komputerze”; duplikatów telefon nie szuka (`useInbox(0)`); meldunki liczone raz (`PhoneInboxWatcher` → sklep, licznik
  menu i ekran czytają go). Plan miesiąca i Radar: `MonthPage` / `RadarPage` z `preview` – tylko do odczytu niezależnie od
  folderu (także „Historia” – wersje bez „Przywróć”), miesiące i plan kampanii do przejrzenia (edycja – iC). Dotknięcie
  powiadomienia prowadzi do Operacji (wieczór, operacja czujnika), Planu miesiąca (przydział, koperty, debriefing),
  Radaru i Meldunków (potwierdzenie sald – tag `inbox` w `openTag`); reszta – Mostek (`phoneTapTag`).
- **T311** Dziennik i kurs na telefonie (iC, IP11–IP14). Operacje: „Zaznacz” – dotknięcie karty zaznacza zamiast
  otwierać, „wszystkie / żadna”, pod listą pasek zmian zaznaczonych komputera (`BulkBar` z `OperationsPage` – kategoria z
  zapamiętaniem dla importu, finansujący, konto / rodzaj / data z podglądem skutku i jednym „Cofnij”), zaznaczenie
  zdjęte przy wyjściu z listy; zapisane widoki (`ViewsBar`, wspólne z komputerami) w arkuszu filtrów; eksport widocznej
  listy (`ExportVisible`) – CSV i Excel przez udostępnianie iOS (Pliki, AirDrop, poczta): `PhoneHost.saveTextFile` /
  `saveXlsx` → `HostDeps.shareFile` → `platform.ts` `shareFile` (oficjalne wtyczki Capacitora: Filesystem – plik w
  `Directory.Cache/export/`, Share – arkusz udostępniania; zamknięty bez wyboru = `null`, bez błędu); Excel składany w
  oknie (`host/zip.ts` `storedZip` – ZIP bez kompresji z `crc32`, części z `shared/export/xlsx.ts` `xlsxParts`) – bez
  `yazl` i modułów Node; w przeglądarce testów plik trafia do `window.__FI_SHARED__`. Przelew obiema stronami – edytor
  komputera (od iB). Meldunki: także łupy, duplikaty (`PhoneDuplicates.tsx` – panel duplikatów ekranu importu pod trasą
  `import`; liczone chwilę po zmianie jak na komputerze, przycisk „Pokaż i scal”) i pary przelewów (`TransferPairs`,
  „Pokaż”, „zostaw tak”); dokowanie i ładownia – z iD, konflikty folderu – na komputerze. Plan miesiąca i Radar: ekrany
  komputera do edycji (podgląd z iB usunięty – bez `preview` i `HistoryButton readOnly`); w trybie telefonu
  (`CompactContext`) plan kampanii ze stałą szerokością miesięcy i przypiętą kolumną „pozycja” (przewijanie w bok), wiersz
  Radaru w dwóch liniach (dzień, nazwa, kwota; rodzaj, opis, osłony po zdarzeniu – wcześniej nazwa nie mieściła się
  wcale). „»” planu kampanii widoczny także w trakcie edycji komórki (`group-focus-within`), a `copyOnward` najpierw
  zapisuje pole w trakcie pisania (`commitActiveField`) i kopiuje wartość planu miesiąca – na iPhonie dotknięcie „»” nie
  zabiera fokusu. `Popover` (każde okno): panel przesunięty tak, żeby mieścił się w oknie (właściwość `translate` – łączy
  się z animacją `transform`; 8 px od krawędzi, szerokość najwyżej okno − 16 px). Źródło AltStore: opis wersji jako
  tekst bez złamań wierszy CHANGELOG (pojedyncze złamanie w akapicie i w pozycji listy = spacja). Wtyczki
  `@capacitor/filesystem` 8.1.4 i `@capacitor/share` 8.0.3 (`ios/App/CapApp-SPM/Package.swift`).
- **T312** Wcześniejsza wpłata finansująca późniejszy zakup (1.15.1, D94): `calc/household.ts` w `settleHousehold` śledzi
  w obrębie tej samej epoki rozliczeń przyszłe zakupy (`futureLeft`, `reservedBy`, `reserveFuture`). Wpłata z `covers`
  rezerwuje kwotę w `f.advance`, `st.deposit` i `st.earmarked` oraz `f.paidFor`. Zakup zużywa zarezerwowaną zaliczkę
  (`usedReserved`), zdejmując `st.earmarked`, i zapisuje wpłatę w `PurchaseState.by`. Zarezerwowana zaliczka jest chroniona
  przed niepowiązanymi zakupami pośrednimi. `calc/repayments.ts`: funkcja `choicesForRepayment` uwzględnia późniejsze otwarte
  zakupy oraz zakupy z nieprzypisanej zaliczki; `waitingForPurchase` udostępnia wcześniejsze wpłaty z wolną kwotą
  (`unassigned`, `income`, `freeAdvance`). `features/household/Repayments.tsx`: `PurchaseLine` oblicza oddaną kwotę z `p.by`
  (`paidAmount = sum(p.by) || p.paid`), poprawnie opisując sfinansowany wydatek. Niezmiennik sumy warstw floty
  (`layersSum(state) === state.total`) zachowany każdego dnia.
- **T313** Implementacja audytu funkcjonalnego PC (1.15.2, D95): schematy `coversOpeningMembers` w `transactionSchema`,
  `goalId` i `containerId` w pozycjach podzielonego paragonu (`splitSchema`), obsługa transferów celów i elastycznego podziału
  łupów (`fleet.ts`), korekta dokowania bez naruszania powiązanych transakcji ręcznych (`dock.ts`), wygaszanie ciszy nocnej
  dla wydatków planowych lub kontenerowych (`operations.ts`) oraz wznawianie wachty wieczornej (`reopenEvening`). Pełna zgodność typów.
- **T314** Folder danych znika w trakcie pracy (1.15.5, AP-1, AF-2, AF-42): zapis nigdy nie zakłada samego folderu danych –
  `writeFileAtomic(cel, dane, within)` / `mkdirWithin` robią brakujące katalogi tylko pod istniejącym korzeniem (rekordy,
  kopie konfliktu, `.history/`, `.presence/`, kopie ZIP w `backups/` – `writeZipFile(…, within)`, kopia tygodniowa
  `mkdirOne`); folder kopii ustawiony na komputerze gdzie indziej – jak dotąd. `within` jest obowiązkowy (`string | null`,
  `mkdirFor`; po przeglądzie): `null` tylko poza folderem danych (`config.json`, eksport w okienku zapisu, folder kopii
  gdzie indziej) – pominięte miejsce zapisu to błąd kompilacji, nie folder-widmo; `zipFolder` sam podaje swój korzeń, gdy
  ZIP leży w nim (kopia przed migracją – folder przeniesiony w trakcie otwarcia: otwarcie pada, nic nie powstaje). Przed każdą paczką zapisów `ensureWritable`
  sprawdza `fi.json` (`rootPresent`, jeden `stat`): brak → `FolderUnavailableError` (podklasa `ReadOnlyError`, komunikat
  `FOLDER_UNAVAILABLE_MESSAGE` w `shared/api.ts`), `available = false` i od razu zestaw zmian do okna
  (`DataStoreOptions.onStatus`); pusty folder założony w starym miejscu (bez `fi.json`) też jest niedostępny. Brak pliku
  wpisu przy braku korzenia to nigdy `RemovedOutsideError` („usunięty na innym komputerze”) – pamięć bez zmian; paczka
  (`saveRecords`, `deleteRecords`) przerwana w połowie – reszta z tym samym błędem, stan folderu w zestawie zmian paczki.
- **T315** Sprawdzanie folderu w spoczynku i powrót (1.15.5, AP-1): `checkFolder` w `main/index.ts` co `FI_FOLDER_CHECK_MS`
  (domyślnie 5 s) woła `DataStore.stale()` (stat `fi.json`; przy blokadzie zapisu – próba); różnica → pełne odświeżenie w
  `RefreshQueue`. Przejście ocenia każde odświeżenie (`folderSeen` po każdym odświeżeniu w kolejce, także nieudanym –
  `finally`; po przeglądzie): powrót zauważony najpierw przez obserwatora, obecność, fokus okna czy Synchronizację też
  daje obserwatora od nowa (`watchFolder`; `DataStore.regained` liczy powroty – tylko odświeżenia, które folder
  przeczytały, T334) i wpis w logu („folder danych niedostępny” / „znów dostępny”).
  Okno: przejście `available` false → true w `applyChange` → `resumeSaves` – wszystko, co czekało, zapisane od razu
  (`saveBatch` po kolekcjach; bez wpisów czekających na decyzję z drugiego komputera i wpisów nowszej wersji). W czasie
  niedostępności folder jest tylko do odczytu jak dotąd: nowe zmiany odrzucane z powodem (`UNAVAILABLE_NOTICE`), zapisane
  wcześniej w pamięci czekają; pytanie przy zamknięciu z błędem folderu – własna gałąź `unsavedQuestion`.
- **T316** Tryb tylko do odczytu z próby zapisu (1.15.5, AP-1, AF-14): przy otwarciu (przed migracją) i po powrocie folderu
  `writeProbe` – `access(fi.json, W_OK)` (na Windows atrybut „tylko do odczytu” pliku, bez ponawiania), potem `fi.json`
  otwarty do zapisu (`r+`) i zamknięty bez zapisu (brak prawa zapisu – uprawnienia, udział albo dysk tylko do odczytu);
  EPERM / EACCES / EROFS → `writeBlocked` (`FOLDER_NOT_WRITABLE_MESSAGE`) i `status.readOnly` – bez migracji i bez
  połowicznego startu kreatora. Po przeglądzie: otwarcie ponawiane (chwilowa blokada antywirusa albo OneDrive to nie
  tryb tylko do odczytu; przy otwarciu i powrocie kilka prób, w spoczynku jedna – T335), zamknięcie o niczym nie
  decyduje, a próba nie zakłada własnego pliku (wcześniej `.fi-zapis.tmp-…` w korzeniu przy każdym otwarciu – wpis
  w koszu online OneDrive, przy blokadzie usuwania plik zostawał). Zakładanie nowych plików (każdy zapis to plik
  tymczasowy i zamiana) sprawdza zapis obecności tego komputera w `.presence/` (`DataStoreOptions.presence` =
  `presenceKept.write` w `main/index.ts`; przegląd 2) – zapis, który otwarcie i tak robi (zaraz po nim `heartbeat(true)`),
  więc folder, w którym wolno zmienić `fi.json`, a nie wolno zakładać plików (rzadkie uprawnienia), jest tylko do odczytu
  z powodem i bez migracji, której nie da się dokończyć (wcześniej: bez banera, każdy zapis z własnym błędem, migracja
  przerywała otwarcie). Po przeglądzie 3: z zapisu obecności o trybie tylko do odczytu decyduje tylko odmowa założenia
  nowego pliku – katalogu `.presence/` albo pliku tymczasowego (EPERM / EACCES / EROFS w tym kroku naszego zapisu, po
  próbach jak `fi.json` – T335; nowej nazwy nikt nie trzyma). Po przeglądzie 4 krok zna sam zapis (`atomicStep` –
  `writeFileAtomic` znaczy błąd krokiem, który padł: katalog, plik tymczasowy, zapis, zamiana), nie pole `syscall` błędu
  (wcześniej `mkdir` / `open` z błędu: błąd bez `syscall` albo z innym dawał tylko wpis w logu, a zamiana zgłoszona jako
  `open` – tryb tylko do odczytu). Plik obecności, którego nie da się zastąpić (blokada dłuższa niż próby; atrybut „tylko
  do odczytu” po przywróceniu kopii zapis obecności zdejmuje sam – T337), i każdy inny błąd obecności to tylko wpis
  w logu („write probe: presence not written (step: …)”) – folder przyjmuje zapisy, obecność zapisze heartbeat (wcześniej
  taki jeden plik dawał tryb tylko do odczytu przy każdym otwarciu, bez wyjścia). Przyjęte: uprawnienia odbierające zakładanie plików tylko
  w `.presence/` (nie w reszcie folderu) dałyby tryb tylko do odczytu – OneDrive uprawnień katalogów nie przenosi.
  Otwarcie nieudane albo ustępujące nowszemu po próbie usuwa tę obecność (`openFolder`, `finally`), chyba że ten folder
  jest otwarty albo otwiera go nowsze otwarcie (przegląd 3: `PresenceKeeper` w `main/datastore/presence.ts` – folder
  otwarty i foldery otwarć w toku trzymają obecność; tak samo zamknięcie magazynu i heartbeat magazynu sprzed zmiany;
  wcześniej spóźnione usunięcie zdejmowało obecność zapisaną już przez próbę nowszego otwarcia tego folderu i drugi
  komputer do końca tego otwarcia, także w trakcie migracji, nie widział tego komputera). Po przeglądzie 4 każdy zapis
  i każde usunięcie obecności tego komputera idzie przez `PresenceKeeper` po kolei w danym folderze (`write` – próba
  i heartbeat, `clear`; inne foldery nie czekają), a usunięcie sprawdza trzymanie dopiero w swojej kolejce, tuż przed
  `rm` (wcześniej przy wywołaniu: usunięcie ustępującego otwarcia, puszczone bez czekania, mogło na wolnym OneDrive dojść
  po zapisie próby nowszego otwarcia tego folderu, które zaczęło się w międzyczasie – drugi komputer nie widział tego do
  następnego heartbeatu, w zasobniku do 5 min). Po przeglądzie N1 5: kolejka `PresenceKeeper` uruchamia tylko jego
  własne zapisy i usunięcia – obecność zapisuje sam (`write(folder, próby)`, `beat(folder)`; wersja i ostatni ruch w oknie
  z `content`), nigdy operacji wołającego, więc żaden zapis nie czeka w niej na siebie (wcześniej pilnował tego tylko
  komentarz: operacja wołająca kolejkę zakleszczyłaby folder); zamknięcie folderu (zmiana folderu, wyjście) czeka na
  usunięcie obecności najwyżej 5 s (`PRESENCE_CLEAR_MS`, `clearWithin`; wcześniej bez limitu za wszystkimi zapisami
  obecności folderu – wolny OneDrive wstrzymywał wyjście i otwarcie następnego folderu), potem usunięcie idzie dalej
  w swojej kolejce i sprawdza trzymanie w swojej kolei – obecność nowszego otwarcia zostaje. Po przeglądzie N2 wyjście
  z aplikacji czeka na usunięcie w limicie wyjścia (`clearAtClose` z `quitBy` – koniec `QUIT_DRAIN_MS` po zapisach,
  najmniej 5 s): proces kończy się zaraz potem, więc usunięcie „dalej w tle” nigdy się nie odbywało, plik zostawał,
  a drugi komputer brał ten za uruchomiony do 11 min, choć log mówił, że usunięcie trwa; nieskończone w limicie – log
  mówi, że plik obecności zostaje. Zmiana folderu – jak wyżej. Krok zapisu niesie sam błąd:
  `writeFileAtomic` odrzuca `AtomicWriteError { step, cause }` z kodem i komunikatem błędu fs, `atomicFailure` /
  `atomicStep` znajdują go także w błędzie opakowanym (`cause`) – wcześniej krok w `WeakMap` po obiekcie błędu i
  opakowanie go gubiło (folder naprawdę tylko do odczytu nierozpoznany). Telefon (lustro folderu) i testy bez
  `presence` – tylko `fi.json`.
  W spoczynku sprawdzane znowu, dopóki blokada trwa. Telefon: `constants` i `open(…, 'r+')` w `mobile/node/fs.ts`. Kreator:
  podpowiedź „Uruchom budżet” podaje powód folderu, nie brakujące kroki.
- **T317** „Zapisano.” dopiero po zapisie (1.15.5, AP-1, AF-39, AF-75, AF-41): szybki wpis czeka na swój zapis (`writeNow`,
  najwyżej 5 s); niezapisany → `QuickResult.pending` („Wpis przyjęty, ale jeszcze niezapisany (powód) – zapisze się sam”,
  okno zostaje 4 s); szkic wysłany ponownie – według stanu na dysku (`unsavedOf`). `QuickData.folder` wraca ze szkicem:
  szkic z listami innego folderu (otwartego w międzyczasie) odrzucony; w trakcie zmiany folderu `readOnly` z powodem
  (otwarte okno szybkiego wpisu dostaje go od razu – `switching` w subskrypcji `initQuickHost`, po przeglądzie).
  Ctrl+S / „Zapisz teraz” w folderze tylko do odczytu – powód zamiast „Zapisano.”. Ekran brakującego zapamiętanego
  folderu ponawia otwarcie co 30 s jak przy niedostępnym (`features/setup/retry.ts` `retriesBySelf`).
- **T318** Folder-widmo starszej wersji (1.15.5, AP-1): `ghostFolders` w `main/index.ts` – zapamiętane foldery danych
  (`dataDir`, `recentDirs`, bez otwartego) rodzaju 'partial' z plikami wpisów (`DataStore.recordFiles`) → meldunek
  „Folder danych” („Folder-widmo …: n plików wpisów bez fi.json…”, „Pokaż folder” – `showGhostFolder` otwiera tylko folder z
  ostatniej listy); szukane raz po pokazaniu folderu (`store/ghosts.ts`). Komunikat ekranu wyboru przy 'partial' wspomina
  folder-widmo. Bez automatycznego przenoszenia wpisów.
- **T319** Zmiana czekająca na „Zmień mimo to” i szkice (1.15.5, AP-8, AF-3, AF-11, SA.4): pytanie „Zmienić operację?” w
  `store/guard.ts` (`askGuard`, `answerGuard`, jedno na operację – nowsze wpisanie zastępuje), pokazywane przez
  `GuardDialog` okna (komputer i telefon), nie przez edytor – zostaje po opuszczeniu edytora; liczy się jako niezapisana
  zmiana (`FlushResult.asks`, `unsavedReport`, `saveFirst`, Ctrl+S, pytanie przy zamknięciu „Niezapisana zmiana
  operacji”); inny folder je czyści. Kreator: `startWizard` w trakcie tylko wraca (baner „Wróć do kreatora” z numerem
  kroku); odpowiedzi jako szkic w `localStorage` komputera (`fi.wizard.draft:<folder>`, `v: 1`, po jednym na folder) –
  wracają po restarcie, znikają po starcie budżetu i po „Przerwij kreator”. „Saldo w banku teraz” w Kontach – `useDraft`.
- **T320** Usunięta operacja a drugi format pliku (AP-2, AF-1; doprecyzowuje T39, T134, T234): usunięte operacje z banku
  zna import z opisem – `shared/import/deleted.ts` `deletedBankRows` (z wersji usuniętych `.history/`): klucze wierszy
  (`bank.key` **i** `altKeys` – wiersz drugiego formatu zapamiętany przy B5) oraz wiersze dopasowywane bez klucza
  (`DeletedRow`): nierozliczone (B96, jak dotąd) i zaksięgowane z formatem pliku (`bank.source`, starsze – głos importu
  po `importedAt`, liczony z operacji w budżecie i usuniętych). Zaksięgowana usunięta zatrzymuje tylko wiersz **drugiego**
  formatu miarą B5 (ta sama kwota, ±3 dni, podobna nazwa, dzień objęty plikiem) – w swoim formacie wiersz ma jej klucz.
  Pary od najbliższej, każda usunięta i każdy wiersz raz; wiersz już w budżecie w formacie pliku (po kluczu) zabiera swoją
  usuniętą – kopia usunięta przy podwójnym imporcie sprzed 1.4.2 nie ukrywa innego zakupu tego sklepu. Usunięte przez
  import (zniknięte nierozliczone, kopie z innego konta – T321; znak `byImport` w historii – T331, wcześniejsze – paczka
  `imports/…removed`) to nie usunięcie użytkownika: tylko ich klucze. Wiersz ma status `deleted` z `other` („usunięta z historii rachunku” w podglądzie); „importuj mimo
  to” – jak przy T39.
- **T321** Ten sam rachunek na dwóch kontach budżetu (AP-2, AF-9): przejście B5 obejmuje też konta, na które trafiał numer
  rachunku pliku (oba numery znane i równe – inaczej dwa rachunki nigdy się nie mieszają, T166): wiersz drugiego formatu
  na innym koncie = `elsewhere` z `other`, domyślnie **nie** przenoszony (miara, nie klucz wiersza); przeniesiony – klucz
  swojego formatu na tym koncie, klucz wiersza pliku w `altKeys`. Import naprawczy: wiersz znaleziony na innym koncie po
  kluczu (B35), którego operacja jest tu w drugim formacie, to `known` z kopią (`RowCopy`) – „usuń duplikat” zamiast
  „przenieś” (`ImportChoices.removeCopies`): zaznaczony, gdy kopia przyszła tam z importu i nie ma innej decyzji
  (`conflicting`); nigdy, gdy zadokowana (`ClassifyContext.docked`), spłacana wpłatą domownika (`covers`) albo tylko do
  odczytu. Usunięta kopia oddaje operacji tutaj kategorię i notatki (`takeUserData`), a gdy operacja tutaj nic nie
  wskazuje, też to, co spłaca (`covers`, dług startowy, `repaid` – przegląd N1; także panel duplikatów) – przy tej samej
  decyzji albo pieniądzach tych samych domowników (T333); kopia, której spłacanych zakupów operacja tutaj nie przejmie, nie
  jest zaznaczona („kopia spłaca inne zakupy niż operacja tutaj”, `coversOtherwise`; T333). Usunięta jest w paczce importu („Cofnij import” ją przywraca), licznik `copies`. Wspólne „jedna operacja i jej kopie” (`userContent`, `conflicting`,
  `mergeDuplicate`, `takeUserData`) przeniesione z `duplicates.ts` do `shared/import/copies.ts` (bez cyklu importów).
- **T322** Konto importu po numerze rachunku (AP-2, IM sp. 2): plik otwiera się na koncie, na które trafiał jego numer
  (`accountForNumber`: otwarte konta z tym numerem – z kilku to z importem mBanku, potem wybrane wcześniej); numer nieznany
  albo plik bez numeru – konto wybrane wcześniej, inaczej pierwsze z importem mBanku. Ostrzeżenie o innym rachunku (F4)
  bez zmian.
- **T323** Klucze bez zmiany widocznej (AP-2, AF-28, AF-63): rozliczenie nierozliczonej zachowuje klucz jej wiersza
  w `altKeys` (starsza lista po rozliczeniu zna wiersz – nic drugi raz; operacje rozliczone przed 1.15.5 klucza nie mają –
  siatką zostaje panel duplikatów). Import, który tylko zapamiętuje klucze wierszy (`keysOnly` – różnica wyłącznie
  w `altKeys`), zapisuje je, ale bez kopii przed importem i bez paczki do cofnięcia (jak N13); panel wyniku nie pokazuje
  pustej ścieżki kopii.
- **T324** Meldunek „Wróciły po usunięciu” (AP-2, AF-1 – dane sprzed 1.15.5, bez migracji): operacja, którą zrobił import
  z jej wiersza (T330), zaksięgowana w innym formacie niż usunięta, to samo konto i kwota, ±3 dni, podobna nazwa, zaimportowana po usunięciu importem, którego
  dni (pierwsza i ostatnia operacja) obejmują dzień usuniętej (`returnedOf`; pary od najbliższej). Jeden meldunek na
  operację (rodzaj `returned`, po „Możliwych duplikatach”): „Usuń” – jak w Operacjach (z dokowaniami, „Cofnij”), „Pokaż”,
  „zostaw” – klucz `back:<id>` w `settings.import.notDuplicates` (z „Cofnij”); wiersz przywrócony świadomie („importuj
  mimo to” przy `deleted` z `other`) dostaje ten klucz sam. Usunięte czytane z historii 10 s po otwarciu folderu (gdy jest
  po co – T332), od razu na ekranie Meldunków i przy każdym pliku importu (`features/import/returned.ts`); telefon liczy je
  w „Na komputerze”. „zostaw” w folderze tylko do odczytu – odmowa bez komunikatu o sukcesie. Po przeglądzie N1 5
  Ustawienia → Import („Pary oznaczone „to nie duplikat”: N”, „pokazuj znowu”) liczą i zapominają tylko pary panelu
  duplikatów (`isDuplicatePairKey` w `shared/import/duplicates.ts` – klucz `row:…` albo id pary): klucze `back:<id>`,
  a także `correction:` (B129), `transfer:` i `transfer-lone:` (F10) zostają – wcześniej liczone jako pary, a „pokazuj
  znowu” przywracało meldunki operacji zostawionych i przywróconych świadomie oraz przelewów „zostaw tak”. Po przeglądzie
  N2 para panelu rozpoznana po tym, co panel zapisuje (`row:…` albo co najmniej dwa id połączone `|`), nie po kluczu bez
  dwukropka; przedrostki innych meldunków w rejestrze `REPORT_KEY_PREFIXES` (nowy meldunek dopisuje tam swój) – goły id
  przyszłego meldunku nie jest już parą. Zapisane klucze bez zmian.
- **T325** Rozpoznanie przed regułą innego rodzaju (AP-6, AF-26; doprecyzowuje T167 / N14 i wyjątek domownika z 1.3.0):
  reguła dopasowana po nazwie (marka, cała nazwa, „zawiera”, próg kwoty, słowo w nazwie) ustępuje temu, co aplikacja
  rozpoznaje sama (`ruleGivesWay`, `Recognized` w `classify.ts`) – otwartej pożyczce z Radaru udzielonej nadawcy do dnia
  przelewu (każda reguła poza regułą pożyczki; pożyczka istnieje od dnia udzielenia – przelew sprzed niego nigdy nie jest
  jej zwrotem: z regułą zostaje regułą, bez reguły zwykły wpływ (B34 – tylko od tego dnia), dawna reguła pożyczki
  proponuje pożyczkę bez rekordu; `loanFor`, ten sam w audycie – przegląd N1, N1 2), pieniądzom domownika (każda poza regułą wpływu z osobą i przelewem własnym) i XTB (każda
  poza regułą XTB i przelewem własnym – portfel XTB). Zostaje regułą: słowo kluczowe z tytułu (o tej płatności – „ZA
  PIZZĘ” od pożyczkobiorcy), reguła tego samego rodzaju (dawna reguła pożyczki / XTB – propozycja, N14), przelew własny
  (rozpoznanie domownika i XTB tylko, gdy bank nie mówi „przelew własny”). PIT-38 nie ma rozpoznania po nazwie – chroni
  go tylko decyzja zbiorcza (T326). Pożyczka zamknięta – reguła decyduje jak dotąd. Bez migracji: stare operacje
  zapisane regułą wskazuje audyt reguł (T326).
- **T326** Decyzja zbiorcza i reguły po AP-6 (AF-26, AF-62, AF-64; doprecyzowuje T90): „Decyzja dla zaznaczonych” nie
  zmienia grupy ani operacji, która teraz (własna decyzja, tematu albo propozycja) jest pożyczką, PIT-38, XTB albo
  pieniędzmi domownika, gdy decyzja jest innego rodzaju (`bulkKeeps`): ta sama pożyczka (bez rekordu – dowolna z Radaru),
  ten sam domownik – tak; reszta liczona jako „nie pasuje” z powodem w komunikacie. „+ domownik” tylko przy wpływie
  przelewem od osoby spoza listy z decyzją „wpływ (przychód)” – nigdy przy przelewie własnym (nazwy posiadacza), XTB,
  zwrocie pożyczki ani pieniądzach domownika (`offersNewMember`). Audyt reguł: reguła innego rodzaju niż pożyczka, która
  złapała wpływ od osoby z pożyczką z Radaru udzieloną do dnia wpływu i otwartą teraz (`loanFor` – ta, której import
  ustępuje dziś; zamknięta od tamtej pory – reguła zostaje, bez zgłoszenia, przegląd N1 2), zapisany jako rodzaj reguły – „N do poprawy” w „niespójne” (licznik razem z innymi), z listą operacji do otwarcia;
  słowo z tytułu nie (zostaje regułą – `ruleGivesWay`, przegląd N1);
  „bez trafień” = jego licznik (`inAuditView`, bez reguł pożyczki, PIT-38 i XTB).
- **T327** „+ w tym za X” w wierszu importu (AP-7, AF-27; D81): wiersz bez własnej decyzji pokazuje swoją część
  rozkładu grupy (`RowShares`); zmiana robi z tego własną decyzję wiersza, która zostaje w trakcie wpisu – także linia
  0 zł (porównanie z linią 0 zł, nie `sameChoice`, które linie 0 zł pomija – `rowSharesChoice`); do decyzji grupy wraca
  „jak grupa” albo usunięcie wszystkich linii, gdy grupa nie ma swoich. Nowa linia (wiersz, grupa, temat) startuje od
  tego, co X ma oddać – po zakupach pliku, po własnych wpłatach X w pliku i po częściach X w innych wierszach – najwyżej
  tyle, ile zostało w pieniądzach wiersza albo grupy (`rowStart`, `decisionStart`); przycisk mówi „(ma oddać … zł)”.
  Temat, który pokazuje wspólną decyzję swoich marek bez linii z kwotą (N78), liczy start nowej linii z ich wierszy
  (`themeSharesFrom`; przegląd N1), a linia wpisana tam to decyzja tematu (razem dla X, T328); linie marek z kwotą
  zostają w markach – T336. Własna część wiersza zostaje wpisana jak wpisana (także ponad dług – świadomie, za ten
  przelew).
- **T328** „w tym za X” grupy i tematu (AP-7, AF-27; D81): kwota decyzji wspólnej dla kilku wpłat to razem dla X, nie
  na każdą wpłatę – rozkładana po kolei od najstarszej (każda wpłata najwyżej swoją kwotą), a wszystkie spłaty X z grup
  i tematów pliku razem najwyżej to, co X ma oddać, pomniejszone o własne części wierszy i o własne wpłaty X w pliku,
  które spłacają (D80: najpierw, bez względu na dzień; wpłata X, której grupa albo temat daje części innym, liczy się
  cała, dopóki jej części nie są znane – po kolei; przegląd N1) (`rowShares`). „Ma oddać” =
  dług z księgi teraz plus części X zakupów, które ten import tworzy (zwrot towaru odejmuje), pomniejszone o jego zaliczkę
  (`owedWithFile`); część zaliczki / przychodu (`inflowKind` inny niż spłata) – bez tego limitu. Podgląd mówi przy linii
  jednej decyzji – grupy, tematu z własną decyzją, tematu jednej marki (`lineSpreads`) – z których wpłat poszła i dlaczego
  mniej niż wpisane („tyle X ma oddać” / „tyle zostało we wpłatach”, „X nie ma nic do oddania”); linii kilku decyzji
  razem nie składa (T336); import liczy to samo (`runImport` → `buildImport({ owed })`). Bez migracji: importy
  z „w tym za” w grupie kilku wpłat sprzed 1.15.5 mają zdublowane części – do poprawy w Operacjach.
- **T329** Pewne dopasowanie przy podziale na osoby (AP-7, D91 b – D99; DM sp. 1–2): w edytorze Operacji dopisana albo
  zmieniona część osoby („+ także za…”, „podziel na osoby”) wiąże sama pewny zakup tej osoby, gdy jej część nie wskazuje
  jeszcze żadnego (to samo, co edytor proponował jako „Pasuje: …” – `moreSureCovers`, `repaymentSharesByMember`); część
  usunięta zdejmuje wskazane zakupy tej osoby (`keptCovers`). Import i szybki wpis wiązały już każdą osobę osobno
  (`linkRepayments`). Pewne jest też wpłata co najmniej równa wszystkim otwartym zakupom osoby (do 500) – spłaca wszystkie
  (`matchCovers`; reszta jak dotąd: zaliczka albo przychód według osoby), zamiast „rozliczony” przy zakupach „do oddania”.
- **T330** „Wróciły po usunięciu” tylko dla kopii, którą zrobił import (przegląd N1; doprecyzowuje T324): kandydat to
  wyłącznie operacja utworzona przez import razem z jej wierszem i bez innego wiersza od tamtej pory (`madeByItsImport`:
  zaksięgowana, `createdAt` = `bank.importedAt`). Ręcznie wpisana połączona z wierszem (import – „połącz”, panel
  duplikatów – „scal”) i nierozliczona rozliczona późniejszym plikiem mają w `bank` czas i format tamtego pliku, ale to
  operacje użytkownika – nigdy meldunek (wcześniej „Usuń” mogło skasować jedyną prawdziwą kopię). „Usuń” sprawdza to
  jeszcze raz przy kliknięciu (inaczej komunikat, operacja zostaje). W razie wątpliwości bez meldunku – siatką zostaje panel
  duplikatów.
- **T331** Usunięcie przez sam import w historii (przegląd N1; doprecyzowuje T320, T321): nierozliczone, których bank już
  nie pokazuje, i kopie z innego konta (AF-9) import usuwa z powodem 'import' (`deleteRecords(…, { reason: 'import' })`):
  wersja w `.history/` ze znakiem `byImport: true`, plik dalej `_delete_` – starsza wersja aplikacji dalej trzyma klucze
  wiersza poza importem. `deletedBankRows` bierze z takich tylko klucze, niezależnie od tego, czy paczka importu jest
  jeszcze wśród 10 ostatnich (wcześniej po rotacji paczek liczyły się jako usunięcia użytkownika); usunięte przez import
  przed 1.15.5 – po paczkach, jak dotąd. „Cofnij” po „Cofnij import” usuwa przywrócone przez cofnięcie tak samo – z powodem
  'import' (`redoImport`, przegląd N1 2). Synchronizacja → Usunięte wpisy: „usunięty przez import”. Addytywnie, bez
  `SCHEMA_VERSION`.
- **T332** Koszt meldunku „Wróciły po usunięciu” (przegląd N1; doprecyzowuje T324): operacja wraca tylko z importem po
  usunięciu, więc usunięte czytane 10 s po otwarciu folderu tylko wtedy, gdy ostatnie sprawdzenie tego komputera coś
  zgłosiło albo od niego zmienił się którykolwiek import folderu (`settings.import.lastImport` wszystkich kont i dziennik
  importów `settings.import.log`, także z drugiego komputera – porównane, czy są takie same, nigdy „później niż”: zegar
  drugiego komputera może się spóźniać, przegląd N1 2; dziennik ma klucz na każdy import i scalenie `fi.json` zachowuje
  klucze obu komputerów, a ostatni import konta – tylko jeden czas, przegląd N1 3). Stan w `localStorage` komputera
  (`fi.returned.checked:<folder>` – importy folderu, z którymi nie było nic do zgłoszenia, `importsMark`; brak albo
  starsza postać – czytaj; nieudany odczyt historii go kasuje). Import na tym komputerze czyta usunięte sam; gdy importy
  folderu do jego zapisu są takie jak przy tym odczycie, sprawdzenie bierze importy folderu po zapisie
  (`checkedWithImport` – odczytane, nigdy dopisane tutaj; przegląd N1 3: czas tego komputera wpisany przy koncie zakrywał
  import drugiego komputera na tym koncie scalony pod tym czasem), inaczej czytane przy następnym otwarciu. Ekran
  Meldunków i import czytają jak dotąd. `returnedOf` przy każdej zmianie operacji ogląda tylko operacje kwoty usuniętej,
  dni i format liczy tylko dla importów kandydatów.
- **T333** Kopia z innego konta a zakupy, które spłaca (przegląd N1 2; doprecyzowuje T321): usuwana kopia (AF-9) nigdy po
  cichu nie zabiera spłaty zakupów domownika (D91). Operacja tutaj, która nic nie wskazuje, przejmuje to, co kopia spłaca
  (`covers`, dług startowy, `repaid`), przy tej samej decyzji albo przy innej, gdy jej pieniądze są spłatą każdego
  domownika, którego spłacają pieniądze kopii (`takesCovers` – np. ta sama wpłata Mamy z częścią „w tym za Tata”; także
  panel duplikatów; po przeglądzie 2 N2 pieniądze kopii spłacają według planu księgi – `planOf`, także jawna zaliczka albo
  przychód, które wskazują zakupy (AP-4, T350): wcześniej taka kopia 1.15.3–1.15.5 „nikogo nie spłacała”, nie była
  zaznaczona, a zakup po usunięciu był znów do oddania). Gdy nie przejmie – wskazuje inne zakupy (`coversOtherwise`), ma
  inną decyzję bez pieniędzy tych osób (zwykły wpływ) albo jej pieniądze nie spłacają ich tak, jak pieniądze kopii (spłatę
  kopii – ich przychód albo zaliczka tutaj, które spłaciłyby je tylko wbrew temu, co mówią; jawną zaliczkę kopii ze
  wskazanymi – spłata albo ta sama zaliczka tutaj wystarczy) – kopia nie jest zaznaczona,
  a podgląd mówi „po usunięciu spłacane przez nią zakupy będą znów do oddania” (`RowCopy.dropsCovers`, `copyNotes` –
  zaznaczona czy nie; przegląd N1 3: wcześniej „usunięta – …” przy kopii, której import nie usuwa); zaznaczona mimo to –
  operacja tutaj zostaje ze swoją decyzją, te zakupy znów do oddania (jak przy `otherCovers`). Kopia, której pieniądze
  nikogo nie spłacają, nic nie gubi. Podpis planu (B38, `planSignature`) obejmuje przy kopii też to, czy jest zaznaczona
  domyślnie, ma inną decyzję i czy gubi zakupy – zmiana między podglądem a importem zatrzymuje import („sprawdź podgląd”).
- **T334** Powrót folderu dopiero po jego przeczytaniu (przegląd 2 AP-1; doprecyzowuje T315): odświeżenie, które znalazło
  `fi.json`, ale folderu nie przeczytało (EBUSY – OneDrive dopiero sprowadza pliki), zostawia go niedostępnym (`available`
  z powrotem false w `refreshInQueue`) – sprawdzanie w spoczynku widzi różnicę i za kilka sekund próbuje znowu;
  `regained` podbija dopiero odświeżenie, które folder przeczytało, i to ono mówi oknu „dostępny”, a main obserwuje folder
  od nowa. Błąd już po przeczytaniu (próba zapisu, przepisanie pliku po migracji) powrotu nie cofa – `folderSeen`
  w `finally` kolejki i tak obserwuje folder od nowa. Wcześniej: `regained` podbite, odświeżenie padało przed
  `folderSeen`, a następne zastawało podbitą już liczbę – zostawał stary obserwator (zmiany z drugiego komputera dopiero
  co 5 min), okno nie wiedziało o powrocie.
- **T335** Ile prób w próbie zapisu (przegląd 2 AP-1; doprecyzowuje T316): `fi.json` otwierany do zapisu przy otwarciu
  folderu i przy jego powrocie najwyżej 4 razy (`PROBE_ATTEMPTS`, ok. 0,1 s czekania), w spoczynku (`stale()` co 5 s) i
  przy odświeżeniu w kolejce, dopóki blokada trwa – raz. Wcześniej `withRetry` 8 razy (EPERM / EACCES są w nim
  chwilowe): w folderze naprawdę tylko do odczytu ok. 1,4 s przy otwarciu, co 5 s w spoczynku i przy każdym odświeżeniu
  w kolejce magazynu (zapisy czekały). Blokada dłuższa niż próby przy otwarciu daje baner na kilka sekund – zdejmuje go
  następne sprawdzenie w spoczynku. Po przeglądzie 3 tyle samo prób ma każdy krok zapisu obecności w próbie
  (`writeFileAtomic(…, attempts)`: katalog, plik tymczasowy, zamiana): przy otwarciu i powrocie ok. 0,1 s na krok,
  w spoczynku i w kolejce jedna próba bez czekania. Wcześniej plik tymczasowy raz (jeden chwilowy EPERM na `.presence/`
  dawał tryb tylko do odczytu), a zamiana zawsze 8 razy (ok. 1,4 s co 5 s w spoczynku i w kolejce magazynu). Zwykłe
  zapisy bez zmian: katalog i plik tymczasowy raz, zamiana 8 razy. Po przeglądzie 4 naprawa pliku obecności tylko do
  odczytu (T337) to jeden `access`, `chmod` i drugi zapis z tymi samymi próbami – tylko gdy plik naprawdę nie ma prawa
  zapisu; plik trzymany nie dostaje drugiego zapisu (czas jak dotąd).
- **T336** Temat z jednakową decyzją marek z „w tym za” (przegląd N1 4; doprecyzowuje T235 – N78, T327, T328): gdy
  kilka marek tematu ma tę samą decyzję z liniami „w tym za” z kwotą (`themeShows` 'brands'), wiersz tematu pokazuje ich
  decyzję bez edytora linii – „w tym za – ustawione w markach”; linie, kwoty i uwagi rozkładu są przy każdej marce (jej
  klucz, `lineSpreads`). Zmiana w temacie (np. cel wpłaty) trafia do decyzji każdej marki jako jej własna, a linie marki
  zostają jak wpisane (także 0 zł); inny rodzaj zdejmuje linie w każdej marce, jak ta zmiana w marce (`chooseThemeRow`).
  Nigdy jedna decyzja tematu z kwotą policzoną z marek: kwota tematu jest dla wszystkich jego wierszy razem (T328), kwota
  marki – dla jej wierszy, więc żadna jedna kwota nie jest tym, co wpisała każda marka (przegląd N1 2: kwota jednej marki
  – suma o połowę mniejsza; N1 3: kwota razy liczba marek – X dostawał pieniądze, których nikt za niego nie wysłał; N1 4:
  to, co marki dają teraz – zmiana obok, np. kategorii, zapisywała kwotę obciętą do długu, a gdy dług potem rósł, X
  dostawał mniej, niż marki wpisały, albo nic). Jedna marka albo marki bez linii z kwotą – jak dotąd: zmiana w temacie to
  decyzja tematu (te same wiersze i kwoty). Wiersz tematu nie czyta rozkładu (`themeCommon` – decyzja pierwszej marki,
  bez sumowania), uwagi przy linii zawsze z jednej decyzji – kilku kluczy razem nikt nie składa. Po przeglądzie N1 5
  księgowanie decyzji grupy (B97 – własna po przyjętej podpowiedzi zapamiętana, pytanie „zaliczka czy przychód?” nowego
  domownika, przyjęta podpowiedź, propozycja słowa D78) jest w jednym miejscu (`groupsDecided` w
  `features/import/state.ts`) dla decyzji grupy, zbiorczej, tematu nad markami ('same'), marek z liniami ('brands') i
  „jak temat”; grupa wracająca do tematu traci też pytanie domownika i propozycję słowa (wcześniej „jak temat” po
  „+ domownik” zostawiał pytanie – plakietka i temat „do zrobienia”).
- **T337** Własny plik obecności, którego nie da się zastąpić (przegląd 4 AP-1; doprecyzowuje T316): zamiana
  `.presence/<komputer>.json` odmówiona (EPERM / EACCES w kroku zamiany – `atomicStep`), a plik bez prawa zapisu
  (`access(…, W_OK)`; na Windows atrybut „tylko do odczytu”, np. po przywróceniu kopii) → `writePresence` oddaje mu
  prawo zapisu (`chmod` z bitem zapisu właściciela, na Windows zdejmuje atrybut) i zapisuje raz jeszcze – zamiana
  zostaje atomowa, plik nie znika ani na chwilę. Plik trzymany (blokada antywirusa albo OneDrive) zostaje, jak jest –
  minie sama, ponawia następny heartbeat. Błąd zapisu obecności w heartbeacie nie jest połykany
  (`PresenceKeeper.beat`): wpis w logu, gdy zaczyna się nie udawać w danym folderze (z błędem), i gdy znów się udaje –
  nie przy każdej próbie (co minutę, w zasobniku co 5 min; tygodnie w zasobniku wypchnęłyby resztę z logu 1 MB).
  Seria kończy się bez wpisu, gdy folder zamknięto – obecność z niego usunięta albo heartbeat pisze w innym folderze:
  błąd w nim po powrocie to nowa seria z wpisem (przegląd N1 5; wcześniej jeden znacznik dla wszystkich folderów – po
  powrocie z B błąd w A bez wpisu, a potem mylące „presence written again”).
  Wcześniej plik tylko do odczytu zostawał na zawsze ze starym `lastSeen` (próba i heartbeat tylko odnotowywały albo
  połykały błąd) – drugi komputer po 11 min uznawał ten za niedziałający i oba robiły zapisy w tle naraz. Bez komunikatu
  w oknie: przyczynę trwałą naprawia sam zapis, chwilowa mija; zostaje wpis w logu.
- **T340** Przeniesienie środków celu w swojej chwili (1.15.6, AP-3, AF-4 K – MG.8, MG.10; **zastępuje „na koniec dnia”
  z T129**): wpis `transfers` {at, to, amount} silnik liczy w chwili `at` wśród zdarzeń jej dnia warszawskiego – przed
  pierwszym zdarzeniem dnia (w kolejności silnika), które przyszło do FI później niż przeniesienie (`cameIn`: utworzenie
  dokowania – dokowania pary liczonej według puli: utworzenie jej operacji, T363 –, inaczej operacji, nie wcześniej niż
  początek jej dnia; decyzja o łupach – `decidedAt`; druga strona
  przelewu – jej utworzenie), zawsze po początku dnia (start, przełom miesiąca, termin łupów); gdy tego dnia nic
  później nie przyszło – po ostatnim zdarzeniu dnia, przed następnym dniem. Przenosi `min(kwota, stan celu)`; czego cel
  w tej chwili silnika jeszcze nie ma (wpływ sprzed przeniesienia, który kolejność dnia liczy później – operacje bez
  godziny idą przed operacjami z godziną), przenosi na koniec dnia, nigdy więcej, niż cel ma. Skutek: wydatek z celu
  wpisany po przeniesieniu płaci z celu tyle, ile pokazuje ekran (T131), dostawa tego dnia zaimportowana albo zadokowana
  po przeniesieniu widzi cel po nim i dopełnia go tylko do jego kwoty (D13, spec „każdy do swojej kwoty”). Granica:
  operacja z dnia wcześniejszego liczy się w swoim dniu (kolejność dni) – przeniesienie z późniejszego dnia nie zmienia
  jej podziału. „Przenieś środki” ostrzega (bez blokady), gdy cel docelowy jest już pełny albo przeniesienie przekroczy
  to, czego mu brakuje (`overTarget`, przycisk „tylko brakujące”); cel bez kwoty (cel ICTTJ bez ceny – N46) bez
  ostrzeżenia. Rozważone i odrzucone: stały klucz przeniesienia wśród operacji (godzina albo utworzenie) – operacje
  z godziną i bez niej mają w dniu inne porządki, a zadokowana później dostawa ma chwilę dokowania, nie operacji. Bez
  migracji (stany liczone): dni z przeniesieniem i wydatkiem z celu albo dostawą tego samego dnia przeliczą się inaczej
  (notatka wydania); zamrożone dni gry bez zmian.
- **T341** Dostawa do zadokowania według puli wpisu (1.15.6, AP-12, AF-46, AF-48 – DO.5, DO sp. 1, MG sp. 1, PR sp. 2;
  D99 pkt 2; **zastępuje zdanie T163 o silniku**): para wpisu ICTTJ z operacją banku jeszcze niezadokowana (lista dostaw
  `deliveries` – stan „do zadokowania” z wpisem i operacją, bez dokowania; także para innej kwoty – B22, liczy się kwota
  banku – i wpływ wpisany na Portfelu XTB – B69; bez wpisu pominiętego, sprzed startu, czekającego na import,
  zadokowanego i wpływu z XTB bez wpisu) trafia do silnika jako `FleetInput.pendingPairs` (operacja → pula i dzień
  wpisu, `pendingPairsOf`; okno liczy je z migawki ICTTJ tego komputera tymi samymi danymi co panel Dokowanie –
  `store/fleet.ts` `pendingPairsFor`, mapa ta sama, póki treść ta sama; po przeglądzie N2 z tej samej listy co panel –
  jedna pamięć `store/deliveries.ts`, jedno przejście po operacjach) i liczy się od razu tak, jak jej dokowanie z tą
  pulą bez zmienionego podziału: Cele – prosto do celów (najpierw cele z prognozy ICTTJ; miesiąc celu bez ceny – dzień
  wpisu, N46), Podatek – rezerwa na PIT-38 poza budżetem i bez przychodu (`taxOfDockings` z parami), zwrot z puli
  Podatek – z rezerwy, bez firewalla (T65), pozostałe pule – kolejnością dokowania. Chwila pieniędzy dla celów –
  utworzenie operacji (T128), także po „Zadokuj” (`countedFrom`, T363), więc „Zadokuj” bez zmienionego podziału niczego
  nie przesuwa; dokowanie operacji decyduje nad parą (podział z okna). Gra ocenia dni tym samym wejściem (`gameInputOf`,
  klucz pamięci `engineParts`); dzień z parą dalej czeka na dokowanie najwyżej 7 dni (T163) i zamarza bez fałszywego
  naruszenia „dopłata wbrew firewallowi”. Granica: komputer bez odczytu ICTTJ (i telefon) nie zna puli niezadokowanego
  wpisu – liczy parę jak dotąd zwykłą kolejnością, aż do dokowania (pula jest wtedy w rekordzie dokowania); komputery
  czytające ten sam folder ICTTJ liczą to samo. Bez migracji (jedyne nowe pole – `countedFrom` dokowania, T363);
  zamrożonych dni gry z takim naruszeniem sprzed 1.15.6 nie da się poprawić.
- **T342** „Do zadokowania” na ekranach (1.15.6, AP-12; MG sp. 1, PR sp. 2, DO sp. 4): silnik zlicza pary liczone
  według puli wpisu (`FleetState.toDock` – ile, wpływ i wypływ liczone według puli – wpływ wpisany na Portfelu XTB bez
  części domownika, B69, i bez tego, co jego część spłaty pożyczki oddała osłonom, D100 – nadwyżka ponad dług dokuje
  z resztą (przegląd 2 N2: wcześniej „wpływ” liczył też część pożyczki, o tyle więcej, niż dokuje silnik) –, część wciąż
  w celach; zdarzenie dziennika z `pending`). Część w celach (przegląd N2 5):
  pieniądze pary wychodzą z celu ostatnie (wydatek z celu i przeniesienie biorą najpierw jego inne pieniądze),
  przeniesienie do innego celu zabiera je ze sobą, do osłon – wychodzą z celów; nigdy więcej, niż cele mają (wcześniej
  wszystko, co para włożyła – „w celach 400 zł (w tym do zadokowania 1 000 zł)”). Stan okrętu na Mostku – wiersz „Do
  zadokowania · N wpisów ICTTJ – już w warstwach według puli wpisu” z kwotą wpływu i wypływu (dymek: jak liczone i że
  „Zadokuj” potwierdza albo zmienia podział); „ostatnia dostawa (data, do zadokowania) – dokąd poszła?” i w rozbiciu
  „Dostawa do zadokowania (według puli wpisu ICTTJ)” – także wpływ wpisany na Portfelu XTB (B69; wcześniej pominięty –
  brany tylko rodzaj XTB), część domownika osobno („Domownicy – spłata i zaliczka”, nie w osłonach), część spłaty
  pożyczki też („Spłata pożyczki (do osłon)” – przegląd 2 N2; wcześniej w „Osłony”, jakby z puli); Mapa gwiezdna –
  „w celach … (w tym do zadokowania X zł)”; okno dokowania – „na stan warstw z dnia wpływu (data)” przy wpływie sprzed
  dziś (DO sp. 4) i „Do zadokowania: te pieniądze już są w warstwach według puli wpisu – „Zadokuj” potwierdzi ten
  podział.” (prawda także po zmianie celów – T363).
- **T345** Opłata okresowa zapłacona przed startem (AP-5, AF-12, KR.16; stosuje T135 także przed startem, T45 / T220 bez
  zmian): połączona z kontenerem płatność sprzed startu budżetu nie przechodzi przez przebieg (pieniądze wyszły przed
  saldem otwarcia), ale zamyka swój cykl tak samo jak płatność w przebiegu – `paidBeforeStart` przed przebiegiem silnika
  (`paidCycleOf`: miesiąc terminu, przy cyklu ≥ 3 także miesiąc przed terminem, gdy poprzedni zamknięty; płatność w życiu
  opłaty – `activeIn`; części paragonu jak w przebiegu, tylko wydatek – od 1.15.7 `paymentsIndex`, także z celu i „do
  zwrotu”, T393).
  Przed startem opłata jest śledzona od pierwszej widzianej płatności (przegląd N2 4): cykl przed nią zamknięty (nie
  śledzony – zapłata w miesiącu przed terminem jest wcześniejszą następnego), późniejszy – tylko zapłacony; spóźniona
  zapłata zamyka poprzedni cykl (T135), nigdy następny (wcześniej każdy cykl sprzed startu był zamknięty: luty zapłacony
  28.04 przy starcie 5.05 zamykał maj – bez odkładki, a płatność za maj z energii z alarmem „za mało w zbiorniku”). W
  praktyce to płatności z miesiąca startu (od jego 1. dnia łączy je kreator), przy cyklu ≥ 3 też z miesiąca przed nim,
  gdy były połączone wcześniej.
  Zapłacony cykl nie ma rat: miesiąc startu nie odkłada opłaty drugi raz (energia = pensja pomniejszona według T45 minus
  raty innych zbiorników), zbiornik zbiera na następny termin od miesiąca po zapłaconym cyklu, ma `paidDue` – odprawa
  i Radar pokazują następny termin (bez „Asteroida … dziś”), Ładownia „zapłacone”. Rata zbiornika – jedna funkcja silnika,
  kreatora i planu (T346): `tankWant` (zapłacony cykl 0, inaczej `sinkingInstallment`). Kreator (krok 4 „Odkładki w tym
  miesiącu”, krok 6 „do planu”) liczy przez `startTanks` z płatnościami tą samą regułą co silnik i Ładownia
  (`startPaidDays` – `paymentsIndex`, T393; przegląd N2 3: wcześniej kreator brał indeks Ładowni, a silnik nie liczył
  płatności z celu ani „do zwrotu” – kreator 0 zł, silnik cała rata): kontenera – połączonych, propozycji – tego
  odbiorcy od 1. dnia miesiąca przed miesiącem startu (T379; połączy je start), z kwotami – cykle regułą Ładowni
  (`paidBeforeStart` → `paidDuesOf`, T393; scalenie N2 z N3); opłata poza życiem w miesiącu startu – bez raty, jak
  w silniku. Notka kroku 4, gdy odkładki miesiąca są niższe niż później przez cykl zapłacony: „… – opłaty zapłacone
  przed startem nie odkładają się drugi raz; potem ok. …” (zamiast „zbiorniki nadrabiają do terminów opłat”). Płatność
  z dnia startu jest w przebiegu jak dotąd. Bez migracji: warstwy liczone z rekordów – pierwszy miesiąc przeliczy się sam
  (energia wyższa o opłatę odkładaną drugi raz, zbiornik niższy); zamrożone dni gry zostają.
- **T346** Plan miesiąca = silnik (AP-11, AF-44 / LA.8 = C17, AF-52 / C20 – D99 pkt 9, W5; doprecyzowuje T29, F15):
  miesiąc po bieżącym liczy `monthAhead` od stanu silnika teraz – zbiorniki (kwoty, `paidDue`) i cele (kwoty) – miesiąc
  po miesiącu regułą silnika: opłata z terminem w danym miesiącu, jeszcze niezapłacona, schodzi ze zbiornika w tym
  miesiącu (bieżący – gdy `paidDue` jej nie zamknął); na przełomie miesiąca pensja z planu w mocy daje zbiornikom
  `tankWant` (opłata dodana w trakcie cyklu nadrabia do terminu – 225 zł zamiast 75 zł), w kolejności kontenerów do
  wyczerpania pensji, potem celom z terminem według priorytetu `goalInstallment` od kwoty po wcześniejszych ratach
  („Kurs przechwycenia” stały, nie rosnący; przy założeniu pełnych osłon i kadłuba 1. dnia – podpis jak dotąd). Pensja
  przyjęta w całości (pensji częściowej z pustych osłon plan nie przewiduje). Bez pensji (0 albo brak planu – C20):
  nic nie pobrane, cele bez rat, następne miesiące nadrabiają. Podział pensji: przy odkładce pobrane i „wymagana”
  (`required` – rata według T29, gdy pensja dała mniej), pod nimi żółta notka „Brak pensji: odkładki nie są pobierane –
  zbiorniki będą za planem o X” albo „Pensja nie wystarcza na odkładki: X zamiast Y – …” (`split-tanks-short`).
  Bieżący miesiąc z silnika: pobrane – dziennik, wymagana – `FleetState.tanks[].want` (rata zbiornika z przełomu
  miesiąca, liczona także bez pensji; brak – silnik nie liczył tego miesiąca). „Rozdzielone” liczy pobrane. Miesiące
  minione bez zmian (dziennik, bez „wymagana”). Bez nowego alarmu silnika na Mostku i w odprawie – C20 dotyczy planu.
- **T347** Kontener raty pożyczki z kwotami harmonogramu (AP-11, AF-51 / PR.9; zmienia T72 „kwota pierwszej raty”):
  `installmentAmounts` – `amount` = rata ostatniego miesiąca, wcześniejsze miesiące w historii kwot (`past`, F9 –
  `amountIn`), każda do swojego miesiąca (100 zł w 3: 33,33 zł do grudnia, 33,34 zł w styczniu); kontener dodany
  w trakcie spłaty (`ensureLoanContainer`) – z tego, co zostało z rat. Ładownia pokazuje kwotę i część miesięczną
  bieżącego miesiąca (`amountIn`, `monthlyWeight` z miesiącem), masa ładunku i Plan – miesiąca, więc Ładownia, Plan
  i Radar mówią to samo. Istniejące kontenery bez zmian (grosz w ostatnim miesiącu – bez migracji). Addytywnie (pole
  `past` już jest), bez `SCHEMA_VERSION`. Po przeglądzie N2: „Kwota” zmieniona w Ładowni liczy się od tego miesiąca
  także przy historii sięgającej dalej (`pastAfterChange` kończy ją przed tym miesiącem, poprzedni zostaje przy swojej
  racie – wcześniej historia zostawała, a zmiana działała dopiero po ostatnim jej wpisie); kreator startu liczy Ładownię
  pierwszego miesiąca kwotą tego miesiąca (`amountIn`), nie ostatniej raty. „Termin … – kwota” i „Zapłacone (…)”
  w Ładowni kontenera raty nie dotyczą (`cargoStatuses` pomija kontenery pożyczki – bez zmian).
- **T350** Jeden plan części wpłaty domownika i naprawa zapisanych „zaliczek” przy odczycie (AP-4, AF-8 K, MG sp. 6; D99 S4):
  `incomeShares` mówi, czyje są pieniądze, `inflowPlanOf` – co robią: `debt` (spłata długu – wskazane, inaczej jak
  `assignFrom`; reszta wg `advance`), `named` (jawny niezależny przychód albo zaliczka na przyszłość, które mimo to wskazują
  zakupy – `covers`, dług startowy: spłacają tylko wskazane, także późniejsze jako rezerwacja D94, nigdy najstarsze, nic nie
  czeka na przypisanie; reszta – ich przychód / zaliczka), `none` (jawny rodzaj bez wskazanych – omija dług, jak 1.15.3).
  Zapisane `inflowKind: 'advance'` z wskazanym zakupem (opcja „reszta jako zaliczka” 1.15.3–1.15.5 i wskazanie z wersji
  sprzed 1.15.3) spłacają go deterministycznie, bez przepisywania rekordów – każdy komputer liczy to samo; `inflowKind:
  'income'` ze wskazanym tak samo (ten sam sprzeczny zapis starszej wersji: wskazanie zakupu = ta wpłata go spłaca).
  Po przeglądzie 2 N2 plan części czyta jedno `planOf`: wskazane zakupy są jawnego rodzaju (`named`) tylko wtedy, gdy ta
  osoba nie ma w tej samej operacji części „spłata” – inaczej należą do niej, a część jawna omija dług (zaliczka rozbita
  przez „Spłać” na „spłatę” i zaliczkę – T352: wskazany później zakup, np. „Przypisz” z meldunku, spłaciłaby też
  zaliczka). `repaymentShares` bez zmian – edytor nie proponuje jawnym rodzajom nowych zakupów; spłacający w kopiach
  (`repayersOf`, `copies.ts`) jak księga (`planOf` – także jawny rodzaj ze wskazanymi; spłaty kopii nie zastąpi jawny
  rodzaj operacji tutaj – T333). Addytywnie, bez `SCHEMA_VERSION`.
  Uwaga edytora wpłaty „poza wskazanymi wcześniej zakupami: te spłaca” – jak księga (`namesFor`):
  wskazany zakup albo dług startowy tej osoby, przy `coversOpeningMembers` – tylko wskazanych (`namesPurchases`; przegląd
  N2 2.10: przedtem zaliczka A z `coversOpeningMembers` [B] mówiła, że spłaca).
- **T351** „reszta jako zaliczka” w imporcie = spłata, reszta do depozytu (AP-4, AF-8, IM.23, IM sp. 4): opcja
  `household:<osoba>:advance` daje `inflowKind: 'repay'` i `advance: true` (wcześniej `inflowKind: 'advance'` – reguła
  uczyła się „całość jako zaliczka”); jawne rodzaje to osobne opcje `:all-income` i `:all-advance`; `optionOf`
  (`memberMoneyOf`) rozróżnia wszystkie cztery. Jedna nazwa wyboru w imporcie (`MEMBER_MONEY_TEXT`: „spłata, reszta jako
  przychód / zaliczka”, „niezależny przychód (bez spłaty)”, „zaliczka na przyszłość (bez spłaty)”) – lista, temat, podgląd,
  tekst reguły; przełącznik „spłata / niezależny przychód / zaliczka” obok listy usunięty. Jawny rodzaj przy długu osoby –
  uwaga w imporcie (`skipsDebtText`). Reguła „spłata” (`'repay'` albo brak) bierze resztę z ustawienia osoby (D80 b; od
  1.15.3 dawała zawsze przychód) – reguła reszty nie zapamiętuje, więc jej edytor pokazuje tylko resztę z ustawienia osoby
  (`restNotOfRule`, `choiceOfRule`). Na „zaliczka czy przychód?” odpowiada tylko wybór „spłata” (`inflowVotes`).
  Po scaleniu z T336 (N2): zmiana w liście między wyborami tej samej osoby (cel wpłaty i reszta – dawniej przełącznik
  obok listy) zostawia linie „w tym za” i części pożyczki jak wpisane (`listChoice`) – także w temacie marek, w każdej
  marce; inny rodzaj albo inna osoba – bez linii (`choiceFor`, jak dotąd).
- **T352** Meldunek „Zaliczki przy długu” (AP-4, naprawa danych): silnik zbiera `HouseholdLedger.skipped` – części
  `inflowKind: 'advance'`, które przy długu osoby nic nie spłaciły ani nie zarezerwowały (od ostatniego startu sald);
  meldunek na osobę, dopóki ma oddać (`skippedDebtsOf`) i tylko o tym, co z tamtego długu jest nadal do oddania przez nią
  (przegląd 2 N2 – `SkippedDebt.open`): najmniej z części, długu wtedy minus to, co osoba spłaciła po niej, jej wolnej
  zaliczki od tej chwili w najniższym punkcie i długu teraz, po kolei jej takich wpłat (wcześniejsza pierwsza); dług
  spłacony później inną wpłatą albo zaliczka zużyta na późniejsze zakupy – nic (wcześniej: zaliczka 100 zł przy długu
  100 zł, potem spłata 100 zł, zakup 150 zł – „ma oddać 50 zł. Spłacić?”, a „Spłać” spłacała dług z dnia zaliczki, spłata
  stawała się przychodem 100 zł, zakup cały do oddania: dług 50 → 150 zł). Gdy spłaci mniej, niż mogłyby wpłaty i dług,
  meldunek mówi ile („… – ma oddać 150,00 zł; ta wpłata spłaci z tego 50,00 zł. Spłacić?”). „Spłać” to jawna akcja
  z „Cofnij” (`repayingAdvancesOf`, po kolei, każda wobec księgi ze zmienionymi wcześniejszymi) i spłaca tylko to: część,
  która spłaci wszystko, co mogła wtedy – „spłata, reszta jako zaliczka” (`repayingAdvance`); inaczej linia „spłata” tej
  kwoty tej osoby, reszta zostaje jawną zaliczką (wskazane zakupy są wtedy części „spłata” – T350); pewne zakupy wskazane
  jak w imporcie (`linkRepayments`) tylko, gdy osoba nic nie spłaciła po tej wpłacie (inaczej mogłyby być zakupami
  późniejszej spłaty) – reszta czeka na przypisanie (D91 a); „Cofnij” przywraca tylko wpisy niezmienione od tamtej pory.
  „zostaw” (wpłaty z meldunku) – klucz
  `advanceKept:<operacja>:<osoba>` w `settings.import.notDuplicates` (z „Cofnij”); kolejna taka wpłata – pyta znowu (jawna
  zaliczka wolno omijać dług – D99 S4, meldunek tylko pyta). Klucze AP-4 nie są parami „to nie duplikat”
  (`isDuplicatePairKey`).
- **T353** Reguły z „zaliczką na przyszłość” do przeglądu (AP-4): audyt reguł (`review`) – reguły wpłaty domownika
  z `inflowKind: 'advance'`, poza słowami kluczowymi z Operacji (tam „zaliczka” obok „spłata zakupów” była wyborem
  jawnym), w „niespójne” po jednej, z „do przeglądu”: „Zmień na spłatę” (`repayingRule` – reguła „spłata”, reszta
  z ustawienia osoby; `editRule` z „Cofnij”) albo „zostaw zaliczkę na przyszłość” (klucz `advanceRule:<reguła>`). Do tego
  czasu import z taką regułą pokazuje jej jawną nazwę i uwagę o długu. Bez migracji reguł. Audyt czyta z
  `notDuplicates` tylko te klucze (`advanceRulesKept` – tekst, raz na mapę): inne „zostaw” i „to nie duplikat” nie liczą
  audytu wszystkich operacji od nowa (przegląd N2 2.14).
- **T354** Saldo osoby w obie strony (AF-16, AP-4): Mostek, Radar, Ustawienia → Domownicy i edytor wpłaty pokazują naraz
  „ma oddać” i „zaliczka” (`balanceText`), gdy osoba ma oba (jawna zaliczka może omijać dług – D99 S4; rezerwacja D94) –
  depozyt domowników to suma tego, co widać przy osobach.
- **T355** Spłata pożyczki częścią wpłaty – zapis i silnik (D100 (2); doprecyzowuje T70, T350): część dowolnego wpływu
  (`kind: 'income'`) spłacająca pożyczkę udzieloną to linia podziału z `loanId` bez domownika (`Split.loanId`,
  `memberId: null`) – pieniądze pożyczki, kimkolwiek jest nadawca; spłata całą wpłatą zostaje operacją rodzaju
  „Pożyczka” z `loanId` (import „Zwrot pożyczki – X”, Radar „spłata otrzymana”) – bez zmian. `incomeShares` daje linię
  jako część z `loanId` (ucięta kwotą wpłaty w kolejności linii, jak części domowników); księga domowników jej nie czyta
  (`repaymentShares`, `repayers` pomijają ją jawnie), reszta wpłaty jak dotąd – spłata domownika, depozyt albo przychód.
  Jedno czytanie spłat pożyczki – `loanParts` / `forEachLoanOperation` (stan pożyczki, wartość netto F24, filtr Operacji
  `loanIdsOf`); silnik (`fleet.ts` `repayLoanParts`): do osłon do wysokości długu (kwota pożyczki − spłacone, spłaty
  sprzed startu też – jak spłata całością), nadwyżka dokuje jako przychód z resztą wpłaty (T70). Ile każdej spłaty idzie
  na dług, liczy jedno `loanBacksOf` (`calc/loans.ts`): po kolei operacji przez całą historię do dziś – także spłaty
  w saldzie otwarcia konta po starcie budżetu (nie w przebiegu, ale spłacone; przegląd 2 N2: wcześniej tylko sprzed
  startu, więc późniejsza spłata wracała do osłon cała zamiast w części jako nadwyżka) – silnik i statystyki czytają tę
  samą liczbę. Linia pożyczki nieznanej albo wziętej – przychód (tak czyta ją starsza wersja). Statystyki przychodów
  (przegląd 2 N2, AF-5 – stosuje T70; wcześniej spłata pożyczki nigdy nie była przychodem, a linia każdej pożyczki była
  odejmowana): spłata pożyczki udzielonej do wysokości długu nie jest przychodem, całością ani częścią; nadwyżka ponad dług
  (odsetki) jest – jak dokuje silnik, także sprzed startu (historia); linia pożyczki nieznanej albo wziętej – przychód, jak
  w silniku; kontekst bez silnika (`plainIncomeContext` – domyślny raportów) bez podanych pożyczek nie zna długu: linia
  pożyczki nie jest wtedy przychodem (przegląd 3 N2 – wcześniej domyślnie liczona jako przychód); tagi (F17): to nie zwrot
  pieniędzy na wyprawie. Lista
  Operacji mówi „spłata pożyczki: X”; pożyczki z taką linią nie da się usunąć (linia stałaby się przychodem) – tylko
  zamknąć. Kopia z innego konta: linia pożyczki należy do decyzji (`copies.ts` – inna decyzja niż bez niej, operacja bez
  decyzji ją przejmuje). Addytywnie, bez `SCHEMA_VERSION`: starsza wersja czyta linię jako „mój przychód” (dokuje,
  pożyczka u niej zostaje otwarta).
- **T356** Kto zapłacił (D100 (2)): `LoanState.payments` – każda spłata pożyczki udzielonej (całością i częścią) z nadawcą
  operacji (`memberId` wpłaty domownika, inaczej kontrahent); `loanPayers` – po osobie z sumą, w kolejności pierwszej
  wpłaty: domownik po imieniu (jego wpłata albo jego nazwa w banku – `memberOf`), reszta po nazwie z operacji. Wiersz
  pożyczki na Radarze: „kto zapłacił: Mama 200,00 zł · EWA KOWALSKA 250,00 zł”, gdy zapłacił ktoś inny niż
  pożyczkobiorca (pożyczkobiorca – wszystkie słowa kontrahenta pożyczki w nazwie nadawcy, jak `loanFor`, wspólne `nameIn`);
  same spłaty pożyczkobiorcy – bez tej linii (mówi to „oddane … z …”). Po przeglądzie 2 N2 pożyczkobiorcy jest też spłata
  bez nadawcy (własna „Spłata” Radaru kopiuje kontrahenta pożyczki – pusty, gdy go nie ma), a przy pożyczce bez
  kontrahenta – jej własne spłaty (rodzaj „Pożyczka”, np. „Zwrot pożyczki” z banku: nikogo nie da się od nich odróżnić),
  część wpłaty – nadawcy (wcześniej każda pożyczka bez kontrahenta miała „kto zapłacił: bez nazwy …”); jego spłata bez
  nazwy – po kontrahencie pożyczki, inaczej „pożyczkobiorca”.
- **T357** Spłata pożyczki częścią w imporcie (D100 (2); doprecyzowuje T327, T328): linia „w tym spłata pożyczki” decyzji
  wpływu – pieniędzy domownika albo zwykłego przychodu (`SharePart.loanId`, `memberId` '') – w wierszu, grupie i temacie.
  W `rowShares` pożyczka stoi za domownika pod kluczem `loan:<id>` (`loanKey`, porównania linii po `shareWho`): jej dług
  to kwota otwarta teraz (silnik – `owedWithFile(…, loans)`, `sharesView(…, fleet.loans)` wszędzie tak samo), jej
  „własne pieniądze” w pliku – wiersze spłaty całością tej pożyczki. Własna linia wiersza – jak wpisana (nadwyżka to
  przychód, T70); linia grupy i tematu – razem dla pożyczki, po kolei od najstarszej wpłaty, nigdy ponad dług pomniejszony
  o spłaty całością z pliku i własne linie wierszy; pożyczka zamknięta – bez części. Nowa linia startuje od tego, co
  pożyczka ma jeszcze do spłaty, najwyżej to, co zostało we wpłatach – zawsze pożyczki jeszcze nienazwanej w tej decyzji
  (`loanToName`; wszystkie nazwane – bez przycisku, przegląd N2 2.11). Wiersz wpływu bez linii przy otwartej pożyczce
  pokazuje tylko „+ w tym spłata pożyczki” i czyta rozkład pliku dopiero przy kliknięciu (`rowPartsOf` 'add',
  `RowLoanPart`; przegląd N2 2.13 – setki wierszy pensji). Decyzja zbiorcza nie zmienia decyzji z częścią
  pożyczki (AP-6, `bulkKeeps` – tylko spłata całością tej samej pożyczki), „+ domownik” przy niej się nie pojawia, słowo
  kluczowe z niej się nie uczy. Spłata całością – jak dotąd („Zwrot pożyczki – X (Radar)”, każda otwarta pożyczka przy
  każdym wpływie). W temacie marek z liniami ('brands', T336) linie pożyczki jak linie domowników: zostają w markach
  (wiersz tematu: „w tym spłata pożyczki – ustawiona w markach”, `linesInBrands`), uwagi przy każdej marce z jej klucza
  (`lineSpreads` – dług pożyczki pod `loanKey`), nic nie sumowane.
- **T358** Reguła importu ze spłatą pożyczki (D100 (2); dla pożyczki z Radaru zmienia N14 / T98, doprecyzowuje T325):
  reguła może nazwać pożyczkę udzieloną – `loanId` przy regule rodzaju „Pożyczka” (cała wpłata) albo `loanId` +
  `loanAmount` przy regule wpływu (ta część każdej wpłaty, reszta jak mówi reguła). Działa tylko, gdy pożyczka jest
  otwarta i udzielona do dnia wiersza (`ruleLoanFor` – warunki `loanFor`); inaczej reguła spłaty całością ustępuje (jak
  bez reguły), a część reguły odpada. Część z reguły to propozycja wiersza: liczona dla każdego wiersza osobno, nigdy
  ponad dług (po kolei z innymi częściami pliku) – także w decyzji grupy albo tematu, która ją zostawia (linia z `each`:
  zmiana w liście w obrębie tej samej osoby – `listChoice`; uwaga przy linii „z każdej wpłaty … zł”; przegląd N2 2.2:
  przedtem np. „reszta jako zaliczka” robiła z 200 zł każdej z 3 wpłat 200 zł razem); zmieniona przy grupie (kwota albo
  pożyczka linii) staje się decyzją grupy (razem dla grupy – T328). Reguła uczy się części tylko jako kwoty każdej wpłaty
  – T368.
  Reguła z częścią pożyczki pożyczkobiorcy nie ustępuje rozpoznaniu tej pożyczki (czynsz i rata w jednym przelewie),
  reguła spłaty całością nie ustępuje pieniądzom domownika (użytkownik powiedział, że jego pieniądze spłacają pożyczkę);
  dawna reguła pożyczki bez `loanId` – jak dotąd (propozycja, ustępuje domownikowi). Uczy się tylko na życzenie:
  „zapamiętaj” przy decyzji ze spłatą pożyczki (całością albo częścią) wybranej w miejsce innej zaczyna wyłączone
  (`remembersByDefault`, także decyzja zbiorcza), a decyzja bez spłaty pożyczki wybrana w miejsce takiej wraca do tego,
  co użytkownik miał przed wyborem pożyczki (`rememberKept`, przegląd N2 3.1: jego własne „nie” zostaje), bez tego – do
  domyślnego włączonego (przegląd N2 2.9: „nie” było pożyczki, nie użytkownika). Edytor reguły w Ustawieniach oferuje dla wpływów „Zwrot pożyczki – X”
  otwartych pożyczek i jedną część pożyczki (części domowników reguła nie trzyma – nie pokazane). Audyt reguł bez zmian
  (reguły pożyczki poza „bez trafień” i „Zastosuj do historii”). Addytywnie: starsza wersja czyta regułę pożyczki jako
  propozycję sprzed 1.5.1, części nie widzi. „zapamiętaj” liczy jedno księgowanie decyzji grup (`groupsDecided`, T336):
  decyzja grupy, zbiorcza (każda grupa według tego, co pokazywała) i zmiana w temacie marek.
- **T359** Szybki wpis i edytor Operacji (D100 (2)): w szybkim wpisie przy wpływie „Spłata pożyczki” – otwarta pożyczka
  udzielona z listy (`QuickData.loans` z tym, co zostało) i kwota (pusta = to, co pożyczka ma do spłaty, najwyżej reszta
  wpłaty po częściach domowników; wyczyszczone pole wraca do niej – `typedLoan`, przegląd N2 2.12); zapis – linia pożyczki wpływu, także na całą kwotę (wpłata zostaje wpływem z nadawcą –
  domownikiem albo nazwą, więc „kto zapłacił” go zna); okno odmawia, gdy części przekraczają kwotę albo pożyczka została
  zamknięta lub usunięta w międzyczasie (lista okna starsza – jak przy domownikach, B125). Edytor wpływu: „+ spłata
  pożyczki” (linia z pierwszą otwartą pożyczką jeszcze nienazwaną – `loanToName`; wszystkie nazwane – bez przycisku, przegląd
  N2 2.11: druga linia tej samej pożyczki, każda porównana z całym długiem, ukrywała nadwyżkę; kwota – to, co ma do
  spłaty, najwyżej reszta), pożyczki w liście „czyja
  część” obok domowników, przy linii „do spłaty … zł” i nadwyżka jako przychód (dług bez tej operacji – `openWithout`).
- **T360** „Wycofaj dokowanie” (AP-9, AF-7 / MO.29 / DO.7; realizuje D95 N-PC-2, uzupełnia B15, B17, B69): przycisk
  w oknie zadokowanej dostawy (`docking-undock`) i „wycofaj” w jej wierszu na Mostku (`docking-row-undock`, obok
  przycisku wiersza, nie w nim). Zabiera (`calc/undock.ts` `undockingOf`): dokowanie dostawy i nadmiarowe dokowania
  tego samego wpisu ICTTJ (B17 – inaczej dostawa dalej byłaby zadokowana) oraz operacje Portfela XTB zrobione przez
  dokowanie (`madeByDocking`: rodzaj XTB, bez wiersza banku, id `walletOperationId` wpisu, a sprzed B17 – ten sam
  `createdAt` co dokowanie). Zostają: operacja z banku, wpływ wpisany ręcznie na Portfelu XTB (B69 – zostaje jako
  wypłata XTB i paruje się z wpisem znowu; dawnej kategorii nie odtwarzamy – „Cofnij” dokowania jej nie zna po 6 s)
  i operacja XTB z edytora. Dostawa wraca do „do zadokowania” (para z banku, Portfel XTB) albo „czeka na import”;
  okno się zamyka, toast z „Cofnij” (8 s) dodaje z powrotem te same rekordy (pominięte, gdy w międzyczasie zadokowano
  ponownie – te same id, a po przeglądzie N2 także inne dokowanie tego wpisu albo tej operacji: dokowanie bez stałego id –
  wpływ z XTB bez wpisu, sprzed B17 – dodawało się obok nowego, dwa rekordy na jedną operację). Rekord nowszej wersji (B67) – odmowa w całości, bez wycofania po połowie. Folder ICTTJ tylko
  czytany. Zamrożone dni gry bez zmian (jak przy edycji operacji). Bez zmian formatu.
- **T361** Usuwanie kategorii (AP-9, AF-37 / US.6; realizuje D95 N-PC-7): „usuń” przy kategorii głównej i ikona kosza
  przy podkategorii (Ustawienia → Kategorie); kategoria główna znika razem z podkategoriami. Tylko gdy nic jej nie używa
  (`calc/categoryUse.ts` `categoryUses`, na kategorię z podkategoriami): operacje (także szkice) i części paragonów,
  plany miesięcy (limit koperty – także 0 zł, łupy w kopercie, pokrycie z / do koperty), reguły importu, kontenery,
  boje, zapisane widoki Operacji (filtr kategorii), zamrożone dni gry (naruszenie koperty). Szablony szybkiego wpisu
  powstają z operacji – są w nich. W użyciu: odmowa z toastem „… jest w użyciu (2 operacje, 1 reguła importu) –
  usunąć można tylko nieużywaną; zarchiwizuj ją…” i akcją „Archiwizuj”; systemowej („Gotówka”) – nigdy. „Cofnij”
  (8 s) wstawia kategorie na ich miejsca w liście. Paczki importu (`imports/`) i historia `.history/` nie są
  sprawdzane: wersja przywrócona stamtąd z usuniętą kategorią pokazuje „(usunięta kategoria)” (`categoryIndex.label`),
  jak zmiana z drugiego komputera sprzed synchronizacji. Seed (`settings.seeded`) jej nie przywraca. Bez zmian formatu.
  Po przeglądzie N2 w użyciu także w decyzjach otwartego pliku importu (motywy, grupy, wiersze – „1 decyzja otwartego
  importu”): wcześniej usuwała się, a import zapisywał operacje z kategorią spoza drzewa.
- **T362** Zmiana rodzaju a cel i Ładownia (N-PC-4 z D95 – w 1.15.2 bez kodu): `withKind` zostawia `containerId`
  tylko wydatkowi (jak `goalId`, T24) – na przelewie / pożyczce / XTB powiązanie było ukryte: silnik go nie czytał,
  a Ładownia (`paymentsIndex`) brała taki przelew za zapłatę kontenera. Edytor operacji przy zmianie rodzaju, która
  odpina cel albo kontener (operacji albo części paragonu – `unlinkedBy`), mówi to toastem „Rodzaj „Przelew własny”
  nie bierze pieniędzy z celu ani z Ładowni – operację odpięto: kontener „Prąd”.” z „Cofnij” (pola, które zmiana
  ustawiła, wracają, dopóki operacja ma nowy rodzaj – `kindUndone`; pole zmienione od tej pory zostaje, po przeglądzie N2:
  wcześniej cały rekord sprzed zmiany cofał też kwotę czy kontrahenta wpisane w ciągu 8 s). Toast po zapisie zmiany –
  także po pytaniu o potwierdzone saldo i „Zmień mimo to” (`features/operations/state.ts` `changeKind` /
  `updateOperation`; wcześniej wtedy bez komunikatu i bez „Cofnij”). Zmiana kategorii nie rusza celu ani kontenera (jak
  dotąd). Zmiana zbiorcza rodzaju (F11) – przez `withKind`, z własnym „Cofnij”. Istniejące operacje z ukrytym
  `containerId` nie są poprawiane (bez migracji) – od 1.15.7 nie płacą terminu nigdzie, także w Ładowni (T393).
- **T363** Dokowanie pary liczonej według puli (1.15.6, przegląd N2 1; uzupełnia T341 i T128): „Zadokuj” na parze do
  zadokowania (wpis ICTTJ z operacją banku albo wpływem wpisanym na Portfelu XTB, bez dokowania – liczonej od razu według
  puli wpisu; tylko operacja rodzaju, który silnik tak liczy – `countsByPool`, ten sam warunek co `pairOf`, przegląd N2
  3.2) zapisuje w dokowaniu `countedFrom` = utworzenie operacji; silnik (`cameIn`) liczy takie dokowanie od tej
  chwili, jak liczył parę, nie od utworzenia dokowania. Przeniesienie środków celu (T340) i zmiana celów (C1 – nowy cel,
  kwota, priorytet, archiwizacja, synchronizacja celów ICTTJ) między wpływem a „Zadokuj” nie zmieniają już podziału:
  okno proponuje podział, który warstwy mają (podgląd też z `countedFrom`), „Zadokuj” bez zmian niczego nie przesuwa,
  zmieniony podział (`split`) liczy się od tej samej chwili. Wcześniej chwila dokowania: cel 500 / 1 000 zł, para Cele
  1 000 zł o 9:00 (cel +500, osłony +500), o 10:00 całe 1 000 zł celu do osłon, „Zadokuj” o 11:00 – przeniesienie
  przed wypłatą, cel 500 zł, osłony o 500 zł niżej, niż pokazywał Mostek. Dokowanie bez pola – sprzed 1.15.6, wpływu
  z XTB bez wpisu (zwykłe dokowanie), operacji Portfela XTB tworzonej przez dokowanie – od swojego utworzenia jak dotąd
  (T128), więc dawne dokowania się nie przeliczają; ponowne dokowanie zostawia pole i chwilę rekordu. Rozważone
  i odrzucone: chwila operacji dla każdego dokowania z wpisem ICTTJ (bez pola) – przeliczyłaby dawne dokowania, gdy cel
  zmienił się między importem a dokowaniem; samo ustawienie przeniesień T340 względem wpływu pary – zmiana celu (C1)
  dalej zmieniałaby podział. Pole addytywne (`z.looseObject`), bez `SCHEMA_VERSION` – starsza wersja liczy takie
  dokowanie od jego utworzenia; etykieta historii „Liczone od chwili”.
- **T367** Wyrocznia jako regresja silnika pieniędzy (AP-32, N2; raport audytu sek. 6 – W1, S1–S4, C19 / R-15, C24,
  PR sp. 9): wyrocznia (`tests/audyt/wyrocznia`, u3) zostaje ślepa – wymagania i kopia schematów `lib/schemat.mjs` (pola,
  wartości domyślne, brak ≠ null; `src/` nie czyta), zmiana reguły pieniędzy wchodzi do niej z tekstu T-decyzji, nigdy
  z kodu. Regresja `npm run test:wyrocznia` (`vitest.wyrocznia.config.mts`) – lokalnie, po każdej grupie silnika i przed
  jej PR: stany persony i migawki odczytów audytu z laboratorium (`FI_AUDIT_LAB`, domyślnie `C:\FI-audyt` – dane
  syntetyczne poza repozytorium, D97), wyrocznia i `computeFleet` (z parami ICTTJ jak okno, `monthAhead`) na tych samych
  plikach w tej samej chwili; każda liczba pieniędzy wyroczni = aplikacji, „ten sam stan – ta sama liczba na każdym
  ekranie”, kopia schematów = parsowanie aplikacji; ok. 2 min, poza CI (migawek nie ma w repozytorium). Znane rozbieżności
  – lista `KNOWN` z powodem i grupą naprawy; znana, która zniknęła, też zatrzymuje test. Szybka część w `npm test` (CI):
  `tests/unit/wyrocznia-ap32.test.ts` – scenariusze reguł N2 (wyrocznia = silnik) i ekrany; otwarty błąd jako `it.fails`
  (AF-15 – termin asteroidy w odprawie; naprawiony w N3 – AP-10, T376: po scaleniu N2 z N3 zwykły test, ekrany ze stanem
  opłat i dniami jak okno, `KNOWN` bez niego). Nowa rozbieżność rozstrzyga wymaganie: błąd aplikacji albo luka
  wyroczni – nigdy dopasowanie wyroczni do wyniku.
- **T368** Reguła uczy się części pożyczki tylko jako kwoty każdej wpłaty (przegląd N2 2.3; doprecyzowuje T358, T328):
  `loanAmount` reguły to część każdej wpłaty, linia grupy albo tematu – kwota razem dla jej wpłat (po kolei). Nauka
  (`buildImport` → `ruleDecisionOf(c, rows)`, `rows` – wpłaty, dla których linie decyzji są razem: `rowShares().rows`
  `g:` / `t:`) zapisuje część jako `loanAmount` tylko, gdy jest kwotą każdej wpłaty: część z reguły zostawiona w decyzji
  (`each`, T358) albo linia decyzji jednej wpłaty; linia grupy / tematu kilku wpłat – reguła uczy się decyzji bez części
  pożyczki (jak decyzja bez niej – `upsertRules`: wcześniejsza część reguły znika). Przedtem 600 zł „razem” dla 3 wpłat
  zapisywało 600 zł na każdą przyszłą wpłatę (do 3× więcej). Rozważone i odrzucone: kwota podzielona przez liczbę wpłat
  albo to, co rozkład dał każdej – „po kolei” daje wpłatom różne kwoty, żadna nie jest tym, co użytkownik wpisał. Edytor
  reguły w Ustawieniach – jedna wpłata (`rows` 1): kwota jak wpisana.
- **T370** Zwrot wcześniejszego zakupu nie do energii dziś (1.15.7, AP-13 – MO sp. 6; realizuje D99 pkt 4, doprecyzowuje
  T30 / T295): dzisiejsze części puli dziennej (koperty codzienne i bez kategorii) liczone osobno na kategorię główną (bez
  kategorii – jedna grupa); zwrot (dodatni wydatek) najpierw pomniejsza dzisiejsze zakupy swojej kategorii (towar oddany
  tego samego dnia), a to, co zwraca ponad nie (`daily.returned`, `returnedBy`), nie wchodzi do „wydane dziś” – od jutra
  jest w wydanych wcześniej (mniej), więc rozkłada się na kolejne dni (dziś bez udziału). Wydane dziś nigdy poniżej 0,
  kolejność w dniu bez znaczenia; suma miesiąca, koperty, debriefing i łupy bez zmian; energia miesiąca dostaje zwrot od
  razu (pieniądze na koncie, N-PC-3 bez zmian). Rozważone i odrzucone: (a) każdy dzisiejszy zwrot na kolejne dni – zwrot
  towaru kupionego dziś dawałby przekroczenie dnia, zamrażane w grze; (b) dopasowanie po kontrahencie – inna nazwa tego
  samego sklepu (wpis ręczny i bank) robiłaby z dzisiejszego zwrotu dawny; (c) cała pula jako jedna grupa – zwrot butów
  pokrywałby dzisiejszą kawę. Gra: dzień ze zwrotem dawnego zakupu i wydatkami ponad przydział łamie przydział (przedtem
  zwrot to zasłaniał); dni zamrożone bez zmian. „Skąd ta liczba?” (przegląd N3): wiersz zwrotu stoi obok sumy, w nawiasie
  (`WhyLine.aside`) – nie jest w niej: przydział na dziś − wydane dziś = energia dziś. Bez zmian formatu.
- **T371** Energia dziś nie większa niż energia miesiąca (1.15.7, AP-13 – S6, PM sp. 1, PM.3, MO sp. 5, PM sp. 6;
  realizuje D99 pkt 4, potwierdza T295): `daily.energy` = `min(daily.left, energia miesiąca)` (`cappedEnergy`), gdy warstwy
  się liczą (`started`); `daily.left` (przydział − wydane dziś, T295) zostaje miarą przekroczenia dnia – alarm
  `daily-over`, naruszenie gry i jego kwota (energia miesiąca nigdy < 0, więc energia dziś < 0 dokładnie wtedy, gdy
  `left` < 0); znacznik gry „Liquidity sweep” liczy dalej z `left`. Powód (`daily.cap`): `partial` – pensja częściowa
  (D14), `none` – bez wypłaconej pensji w tym miesiącu (plan 0 zł), `spent` – pensja wypłacona, energię wzięły koperty
  planowe, ładownia, odkładki, raty celów. `energy` czytają: Mostek (z dopiskiem „pensja częściowa – energia miesiąca
  0,00 zł”), Plan miesiąca, „Skąd ta liczba?” (wiersze „Przydział po dzisiejszych wydatkach” i „Energia miesiąca …
  – powód”), odsłuch, Silver Bullet, dymek zasobnika, Raporty, powiadomienia (odprawa; „na wyczerpaniu” z powodem),
  Daily Bias (MO sp. 5: Bearish przy 0 zł miesiąca, nie Neutral), podgląd zmian zbiorczych (F11). Podgląd szybkiego wpisu
  (`energyAfter`) liczy tak samo: zakup bierze energię miesiąca (przy wypłaconej pensji), więc także zakup z koperty
  planowej albo spoza kopert może obniżyć energię dziś – podgląd to mówi; zakup kategorii z dzisiejszym zwrotem dawnego
  zakupu najpierw bierze ten zwrot (T370). „Pokryj z koperty…” (PM sp. 6) mówi skutek dla energii dziś
  (`energyAfterLimit`: koperta codzienna oddaje limit puli dziennej, planowa – bez zmian); domyślna koperta źródłowa
  jak dotąd (największy zapas). Przed startem budżetu bez ograniczenia. Bez zmian formatu.
- **T372** Kadłub od 99 % celu pełny dla firewalla i „wolnego do decyzji” (1.15.7, AP-17 – MO sp. 3, DW sp. 4, DW.12,
  MO.22 b; realizuje D99 pkt 6): `hullCountsFull` – kadłub × 100 ≥ cel × 99 w groszach (`HULL_TOLERANCE_PCT` = 1). Dopłata
  do XTB bez alarmu, gdy osłony po niej ≥ cel i kadłub ≥ 99 % celu; „wolne do decyzji” = cała nadwyżka osłon ponad cel
  przy takim kadłubie (bez odejmowania brakującego ułamka). Bez zmian: dokowanie dopełnia kadłub do 100 % (D13), raty
  celów z pensji (T272) wymagają 100 % na przełomie miesiąca, osiągnięcie „Pancerny kadłub” – 100 %. Mostek przy kadłubie
  w 99–100 % celu: „brakuje X – do 1% celu liczy się jako pełny (firewall, wolne do decyzji)”. Zamrożone dni gry bez
  zmian (alarm firewall znika z dni jeszcze niezamrożonych). Bez zmian formatu.
- **T373** „Dopełnij kadłub z osłon” (1.15.7, AP-17; realizuje D99 pkt 6 – propozycja jednym kliknięciem): przycisk na
  Mostku pod kadłubem (`state-hull-topup`), gdy kadłub < cel i osłony > cel – kwota min(brak kadłuba, nadwyżka osłon).
  Zapis: wpis `{id, amount, at}` w `hullTopUps` planu bieżącego miesiąca (`months/RRRR-MM.json`, jak `envelopeCovers`;
  miesiąc bez własnego planu dostaje kopię planu w mocy – T46), toast z „Cofnij” (8 s) zabiera wpis, a kopię planu,
  którą dopełnienie założyło (bez innych zmian w niej – przegląd N3), całą: miesiąc znowu żyje planem w mocy; zapis
  odrzucony (plik miesiąca z nowszej wersji, plan tylko do odczytu, folder tylko do odczytu) – bez toastu. Silnik liczy go
  w chwili `at` jak przeniesienie środków celu (T340 – ta sama kolejka: przed pierwszym zdarzeniem dnia, które przyszło
  do FI później; czego wtedy nie przeniósł – na koniec dnia) i przenosi min(kwota, osłony − cel osłon, cel kadłuba −
  kadłub): nigdy osłon poniżej celu ani kadłuba ponad cel, przy nieznanym celu nic – późniejsza zmiana celów albo operacji
  przenosi tylko to, co wtedy jest. Dopłata do XTB, która przyszła do FI po dopełnieniu (wpis, import), widzi kadłub
  pełny; wcześniejsza – nie (alarm zostaje). Zdarzenie silnika `hull` (osłony −, kadłub +) nie jest decyzją gry. Okno
  odłączone i folder tylko do odczytu – bez przycisku. Addytywnie: pole opcjonalne (plany bez niego zostają w pliku bez
  zmian), wpis błędny pomijany (`lenientList`), starsza wersja pole pomija (jej warstwy bez dopełnienia), bez
  `SCHEMA_VERSION`; kwota w `AMOUNT_FIELDS`. Rozważone i odrzucone: dopełnianie samo przy każdym wzroście celu (spec
  „Dokowanie” – nadwyżka płynie tylko przy dostawie; D99 wybrało propozycję); zapis w `fi.json` – zdarzenie z chwilą
  należy do miesiąca, jak pokrycie koperty. Przegląd 2 N3 (7): „Cofnij” usuwa plik planu, który dopełnienie założyło,
  tylko gdy jest on nadal dokładnie tym, co dopełnienie zapisało (treść bez znaczników zapisu – `sameContentAs`, także
  pola nieznane tej wersji z `looseObject`, zmiany z drugiego komputera) i żadna zmiana z drugiego komputera nie czeka
  przy nim na decyzję; inaczej zabiera tylko wpis, plik zostaje (wcześniej: porównanie kilku znanych pól – pole nowszej
  wersji albo czekająca zmiana z drugiego komputera ginęły z plikiem). Przegląd 3 N3 (4): bez planu miesiąca (usunięty na
  drugim komputerze, miesiąc z powrotem na planie w mocy) albo bez wpisu dopełnienia w planie „Cofnij” nic nie robi – nie
  zakłada nowej kopii planu w mocy (T46), nic nie zapisuje.
- **T374** Podgląd zmiany celów warstw, firewall wyłączony (1.15.7, AP-17 – MO sp. 4, DW.12): Ustawienia → Warstwy
  i rozkazy – wpisany cel osłon albo kadłuba, zanim pole się zapisze (`NumberField.onDraft`; po 300 ms bez pisania –
  silnik raz na wpisane cele, zapis po wyjściu z pola używa tego przebiegu, `fleetWithLayers` – przegląd N3), pokazuje
  „Po zmianie”: osłony, cel osłon, kadłub, cel kadłuba, cele razem, energię miesiąca i wolne do decyzji przed → po (`layersEffect`,
  silnik z nowymi celami od startu budżetu); zapisana zmiana celu osłon, kadłuba albo przyjętych kosztów – toast „Cele
  warstw zmienione: …” z „Cofnij” (poprzednie wartości). Firewall wyłączony: pod przełącznikiem (Ustawienia i Dowództwo)
  „Firewall wyłączony – dopłaty do XTB nie są sprawdzane…”, w stanie okrętu na Mostku „Firewall wyłączony – dopłaty do
  XTB bez sprawdzania osłon i kadłuba” (bez „nie do dopłaty XTB”), w odprawie dzisiejsza dopłata do XTB – informacja
  „Firewall wyłączony: dopłata do XTB X zł bez sprawdzania osłon i kadłuba.” (zwrot puli Podatek – nie, także przy pustej
  rezerwie na PIT-38: zdarzenie silnika `tax`, przegląd N3). Bez zmian formatu. Przegląd 2 N3 (6): w trakcie pisania
  „Po zmianie” zostaje dla celów ustalonych ostatnio (300 ms bez pisania), aż ustalą się nowe – nie znika przy każdym
  klawiszu; wpisane cele równe zapisanym (pole opuszczone, wartość, której pole nie przyjmie) – bez podglądu. Przegląd 3
  N3 (6): od pierwszego klawisza (także zaraz po zapisie) ramka stoi i mówi „Po zmianie – liczę…”, liczby celów ustalonych
  wcześniej przygaszone pod nią – nigdy jako skutek wpisanej wartości.
- **T375** Jeden stan opłaty i zaległość do zapłaty (1.15.7, AP-10 – AF-50 / RA.4, AF-80, AF-45 / LA.10, LA sp. 1, 6;
  realizuje D99 pkt 3 i rekomendację F1 / T208 wobec D86 / D4 z sekcji 5 wniosków; zmienia T208 „tylko w bieżącym
  miesiącu” i okno 14 dni dla opłat okresowych): płatności przypisuje do terminów jedna funkcja `feeDues`
  (`calc/cargoStatus.ts`) – stan w Ładowni, Radar, odprawa, powiadomienia, salda naprzód i straż ładowni (`cyclesPaid`,
  `deadContainers` – `dueWindow`) liczą to samo. Okno terminu: opłata miesięczna i co 2 miesiące od 14 dni przed dniem
  płatności do 14 dni przed następnym (jak T208); opłata okresowa ≥ 3 mies. od 1. dnia miesiąca przed miesiącem
  terminu (T135 – jak silnik `paidCycleOf`). Płatność z okna przed dniem terminu (opłata okresowa – przed miesiącem
  terminu) idzie najpierw do poprzedniego terminu, gdy ten jest niezapłacony („zaległa zapłata poprzedniego cyklu”,
  T135); druga płatność okna (gdy późniejsze same pokrywają kwotę terminu minus tolerancja ceny 5 %, min. 2 zł;
  rachunek zmienny – każda) spłaca najstarszy niezapłacony termin wcześniej. Niezapłacony termin wcześniejszego
  miesiąca zostaje (`carried`) – „po terminie” 3 dni po dniu płatności, w okresie łaski albo bez pliku banku „czeka na
  import” – aż do zapłaty; liczony od miesiąca startu budżetu (`FleetState.start`), `from` kontenera i miesiąca jego
  dodania (`createdAt`), w życiu kontenera; „Zapłacone poza budżetem” (`settleDue`) ustawia `aliveAt` na dzień po
  terminie (jak „Nadal płacę”) – ten termin i starsze znikają. Termin 28.–31. dnia dostaje „po terminie” w następnym
  miesiącu (AF-80). Bez startu budżetu – tylko termin tego miesiąca (jak dotąd). Odprawa: pozycja `cargo` raz na
  termin (klucz bez zmian); Radar: pozycja zaległa w swoim dniu (`fixed` / `asteroid`, `overdue`), notatka „czeka na
  import” albo „po terminie N dni” (RA sp. 2 – także w 3 dniach łaski; `importPending` liczony od dnia po terminie);
  salda naprzód liczą ją dziś. Ładownia: znaczek wiersza – najstarsza zaległa „po terminie · dd.mm”; w edytorze blok
  „Zaległe” (`container-late`) z „Zapłacone (kwota, dziś)” tylko, gdy płatność dziś zamknie ten termin (`payToday`),
  i „Zapłacone poza budżetem”; „Zapłacone” bieżącego terminu – gdy płatność dziś jest jego (inaczej „Płatność dziś
  zamknie najpierw zaległą opłatę”). Odkładki: notka „Opłata za … niezapłacona – zbiornik trzyma na nią pieniądze”
  (LA sp. 6 – silnik bez zmian: zbiornik trzyma pieniądze niezapłaconego cyklu, następny cykl dozbiera po zapłacie,
  T29). Kwota i zapłata cyklu z płatności (LA.10: „zapłacone 22.10”, lista „Zapłacone”). Bez zmian formatu i migracji.
- **T376** Dzień płatności opłaty (1.15.7, AP-10 – AF-15 / MO.11, MO.15, R-20; W2 – pole „Płatność”, LA sp. 8;
  doprecyzowuje T208): dzień z historii płatności (`paymentDay`) liczy się z płatności od chwili ustawienia dnia ręcznie
  – nowe pole kontenera `dueAt` (ISO, addytywnie, bez `SCHEMA_VERSION`; zapisuje je zmiana `dueDay` / `dueMonth`
  w edytorze); bez płatności po niej – dzień kontenera („ustawiony”). Ten sam dzień dla terminów naprzód: `cargoDays`
  → Radar (`RadarInput.payDays`, asteroidy i opłaty miesięczne kolejnych miesięcy), odprawa (`BriefingInput.payDays`)
  i Ładownia; najbliższy termin do zapłaty – `nextDueOf` (ten miesiąc ze stanu, zapłacony – następny, cykl zapłacony
  przez silnik – pominięty). Odprawa bierze asteroidę z tego stanu, nie z dnia kontenera. Pole „Płatność” zapisanego
  kontenera pokazuje najbliższy niezapłacony termin (nie pierwszą datę sprzed roku), podpowiedź: dzień i jego źródło
  („z historii płatności (zmień datę, gdy bank pobiera innego dnia)”); nowy kontener – data wpisana jak dotąd.
- **T377** Podpowiedź raty zbiornika (1.15.7, AP-10 – AF-43 / LA.3, PR sp. 7, LA sp. 2): `tankRate` (`calc/plan.ts`) –
  rata miesiąca jak w silniku: `want` z przełomu miesiąca (`FleetState.tanks[].want`, T29, zbiornik sprzed raty), bez
  niego `tankWant` od stanu zbiornika sprzed raty (`amount` − pobrane w miesiącu); cykl zapłacony (`paidDue`) – 0, bez
  wyrównania; „wyrównanie” tylko, gdy rata różni się od raty harmonogramu tego miesiąca cyklu o więcej niż 1 gr –
  ostatnia rata z resztą groszy (103,37 zł) i rata harmonogramu F23 (75,00 zł) nie są wyrównaniem. Edytor (pole „Cykl”)
  i wiersz Ładowni („(…)”, dymek) czytają to samo; nowy kontener (szkic) – pusty zbiornik, jak dotąd (225 zł przy
  opłacie dodanej w trakcie cyklu).
- **T378** Debriefing i boje (1.15.7, AP-10 – LA sp. 5, RA sp. 1, RA sp. 4): debriefing miesiąca ma `tanksShort`
  (alarmy `sinking-short` miesiąca na opłatę, suma) – wiersz „Za mało w zbiorniku (odkładce) X – brak zapłacony
  z energii” (`debrief-tank-short`). Boja zamyka się operacją z banku o tej samej kwocie tylko z podobną nazwą: podobną
  według importu (`looseMatch` `similar`) albo ze słowem nazwy boi (lub jej odbiorcy) w nazwie / tytule operacji – to
  samo słowo ≥ 4 liter albo te same pierwsze 5 liter („komina” – KOMINIARZ), bez słów płatności i miesięcy („opłata”,
  „przelew”, „listopad”); operacja bez nazwy (wpisana ręcznie, z wyprzedzeniem – T282) – dokładną kwotą jak dotąd;
  bliska kwota – tylko z podobną nazwą (jak dotąd). „Pozostałe boje”: boja jednorazowa po dniu mówi, co z nią
  (`pastStateOf`: „zrobiona”, „po terminie”, „minęła bez operacji – po 30 dniach zniknęła z radaru”) – z listą wszystkich
  boi: operacja zrobiona z innej boi albo dopasowana do jej dnia (kolejność radaru – jedna operacja, jeden dzień) nie jest
  jej (przegląd N3).
- **T379** Łączenie płatności od miesiąca przed startem (1.15.7, AP-10 – otwarte z N2, T345): `linkFromOf` – kontener
  łączy płatności odbiorcy od 1. dnia miesiąca przed miesiącem startu budżetu (dodanie kontenera, „Połącz płatności”,
  kreator – `paidDays` propozycji): płatność 28.10 za termin 03.11 (start 04.11) jest tego terminu – stan „zapłacone”,
  przy opłacie okresowej ≥ 3 mies. cykl zapłacony (T135, T345), kreator i silnik nie odkładają jej drugi raz.
  Płatności sprzed startu nie przechodzą przez przebieg (jak dotąd), wcześniejsze tylko mówią o dniu płatności.
- **T380** Zamrażanie porcjami w osobnych zadaniach (1.15.7, AP-14, AF-6 / P.1): porcja (`DAYS_PER_PASS` = 2 dni,
  `advancePortion` w `store/game.ts`) rusza z timera (`schedulePortion`, `setTimeout(…, 0)`), nigdy w ciele efektu –
  zapis porcji zmienia rekordy, efekt rusza znowu, a wywołana od razu następna porcja szła w tym samym zadaniu (zustand
  renderuje synchronicznie): zaległość ponad ok. 100 dni (50 porcji) przekraczała limit zagnieżdżonych aktualizacji
  Reacta (#185) na otwartym ekranie. Między porcjami okno się odmalowuje; kolejność i wynik dni bez zmian (te same dni
  w tej samej kolejności). Sprawdzenie zapisu w tle (`writesInBackground`, T301) – w chwili porcji.
- **T381** Pytanie przed zamrożeniem dni bez danych z banku (1.15.7, AP-14, D99 pkt 5; DW sp. 1, DW.37; obok T163):
  `importWait` (`calc/game.ts`) – aktywne konto mBanku (`importFormat` 'mbank'), już importowane, ostatni import ponad
  `IMPORT_DUE_DAYS` (3) dni temu (próg odprawy „zaimportuj nowy plik”), i niezamrożony dzień do zamrożenia (do
  przedwczoraj) od dnia po tym, co obejmują pliki konta (`coveredTo` + 1, bez niego – dzień po imporcie); konto nigdy
  nieimportowane (budżet prowadzony ręcznie) i zarchiwizowane nie czekają. Komputer w użyciu (D86) – ten, który zamraża –
  pyta oknem „Dni bez danych z banku” (nazwa konta, „ostatni import N dni temu”, zakres dni): „Zaimportuj najpierw”
  (Import; pytanie zamknięte do końca życia okna, dni czekają) albo „Zamroź bez danych”; Dowództwo pokazuje czekanie
  z „Importuj” i „Zamroź bez danych”. Dni od luki czekają (`advanceGame` `waitImport`, razem z `hold` z T163 – wcześniejszy
  wygrywa) i misja tygodnia z nimi, gdy luka zaczyna się przed jej poniedziałkiem (wybór czyta 4 tygodnie przed nim).
  Czekanie najwyżej 7 dni (`IMPORT_WAIT_DAYS`, jak T163) od pierwszego czekania na tym komputerze – potem dni zamarzają tak,
  jak są. Odpowiedź i początek czekania – na komputerze (`localStorage` `fi.game.importWait`), po kluczu spóźnionych
  importów (konto + czas importu): nowy import kończy czekanie, a następne spóźnienie to nowe pytanie; „Zamroź bez danych”
  obowiązuje do następnego importu. Drugi komputer pyta sam. Bez nowych pól w folderze; zamrożone dni bez zmian.
- **T382** „Nowa klasa” a nowe dane (1.15.7, AP-14, DW sp. 6, DW.20): dzień zamrażany z inną klasą niż dzień przed nim
  (tak, jak go zamrożono) liczy ten dzień przed nim jeszcze raz z danymi tego dnia (jeden przebieg silnika więcej, tylko
  przy zmianie klasy); gdy dane dają mu już nową klasę (albo dalej), zmiana przyszła z danymi – import historii po
  zamrożeniu wcześniejszych dni – nie z okrętem. Dzień zapisuje to addytywnie w `GameDay.clsBefore` (tylko gdy różne od
  zamrożonej klasy dnia przed); dziennik wachty pokazuje „Klasa: Zwiadowca → Niszczyciel (skutek nowych danych, nie
  zmiana okrętu)” (`WatchEntry` `data`), ekran „Nowa klasa” (`celebrationsOf` – tylko `peak`) jej nie pokazuje. Zmiana
  częściowo z danych (dzień przed według danych w klasie pośredniej) świętuje się jak dotąd. Dni sprzed 1.15.7 bez pola –
  jak dotąd. Bez `SCHEMA_VERSION` (pole opcjonalne, starsza wersja je zachowuje – `z.looseObject`). Panel misji tygodnia
  bez misji (DW sp. 2): „Pierwsza misja w tygodniu od …” tylko, gdy pierwszy pełny tydzień gry jest przed nami
  (`missionAhead`), inaczej „Misja tygodnia zostanie wybrana po zamrożeniu dni” (przy czekaniu na import – „po imporcie
  z banku (albo po „Zamroź bez danych”)”) – nigdy poniedziałek z przeszłości.
- **T383** Misje (1.15.7, AP-30, AF-31, AF-65, RY sp. 1, WY sp. 1; D84 C11 zgodnie): „Inwentaryzacja” liczy potwierdzenie
  po dniu potwierdzenia – warszawski dzień chwili potwierdzenia (`confirmedAt` salda: `confirmBalance` trzyma jeden rekord
  na saldo i ustawia ją przy każdym, także ponownym, potwierdzeniu; rekord bez niej – dzień utworzenia, `createdAt`),
  nigdy ostatni zapis rekordu (`updatedAt` – edycja, scalanie, rozwiązanie konfliktu to nie potwierdzenie; przegląd N3;
  pole addytywne, bez `SCHEMA_VERSION`), nie po dacie salda (saldo z pliku banku ma datę ostatniego dnia pliku) –
  w stanie misji i w wyborze słabego punktu. „Dzień bez wydatków”: dziś potwierdzone „Dziś bez wydatków” liczy się od
  razu (nie „+1, jeśli dziś bez wydatków”); wydatek z dziś i tak go zabiera (`costOn`). „Dziś bez wydatków” przy wydatku
  z dziś zapisuje (raport wachty zamknięty) i mówi toastem / powiadomieniem, że dzień się nie liczy (`noSpendWarning`).
  Misja ciszy nocnej „Zaciemnienie” (dawniej „Cisza w eterze” – tak zostaje osiągnięcie 30 dni; lista misji D73 bez
  innych zmian). Jedna „Twoja killzone”: misja – „z 4 tygodni przed misją”, Wywiad – „killzone wydatków tego okresu
  (N mies.)” i godzina misji obok, gdy misja tygodnia to Killzone (`killzoneNote`). Przegląd 2 N3 (5): rekord bez
  `confirmedAt` (zapisany przed 1.15.7) liczy się dniem salda (`date`), jak liczyła go wersja, która go zapisała – tydzień
  niezamrożony nie zmienia wyniku misji przez samą aktualizację (dzień utworzenia zaliczał po aktualizacji import
  z poniedziałku z saldem z niedzieli, którego 1.15.6 nie liczyła; ponowne potwierdzenie pod 1.15.6 – jak wtedy, po dacie
  salda); każde nowe potwierdzenie ma `confirmedAt` – także zapisane przy imporcie z salda pliku banku. Przegląd 3 N3 (5,
  mieszane wersje): dzień potwierdzenia = późniejszy z dnia `confirmedAt` i dnia salda – 1.15.6 liczy dzień salda,
  a potwierdzając ponownie zapisuje tylko `updatedAt` (dzień salda jest w id rekordu), więc ponowne potwierdzenie pod
  1.15.6 nie zalicza tygodnia także tam (oba komputery zgodne); `updatedAt` nie liczy się nigdy (scalanie i rozwiązanie
  konfliktu też go zapisują). Saldo dnia późniejszego niż chwila potwierdzenia liczy się w tygodniu salda, jak w 1.15.6 –
  ten komputer nigdy nie liczy potwierdzenia wcześniej niż komputer ze starszą wersją.
- **T384** Droga do awansu w Dowództwie (1.15.7, AP-30, DW.18, DW sp. 5): `progressText` – dzień po zmianie stopnia
  „dni zgodne 0 (liczone od 02.11)” zamiast odwróconego „od 02.11 do 01.11”; próg spełniony bez awansu (obniżony w trakcie)
  – „próg spełniony, awans przy zamrożeniu kolejnego dnia” (awans rozstrzyga zamrożenie dnia, jak dotąd).
- **T385** Kurs na 12 miesięcy bez osłon poniżej zera (1.15.7, AP-18, AF-32, WY.19; obok T276): `course` płaci pensję
  regułą silnika (`paySalary`), a gdy osłony i kadłub nie wystarczą – miesiąc ma pensję częściową (`CourseMonth.partial`
  = pensja − wypłacone; czerwony alarm Mostka). Koszty po średniej i boje nadal ponad energię z osłon i kadłuba, wpływy
  miesiąca dokują po nich (dołek w miesiącu pokryty wpływem nie jest brakiem); czego nie pokryje i wpływ – „brakuje”
  (`short`), a osłony kończą miesiąc na zerze (następny liczy od tego, co jest – brak się nie kumuluje jak dług).
  „Najniżej w miesiącu” (`low`) też od zera. Wynik: `partial` (miesiące) i `short` (suma 12 miesięcy); Wywiad – wiersze
  „Pensja częściowa” i „Brakuje na koszty” (akcent) w kursie i w symulatorze, komórka miesiąca z brakiem w akcencie
  z dymkiem. Haczyk AP-13: resztka bieżącego miesiąca nie liczy energii pozostałej (`TODO(AP-13)` w `course.ts`).
- **T386** „Teraz” symulatora = Mostek (1.15.7, AP-18, AF-33, WY.20, PR.3): `Course.rangeNow` to zasięg stanu silnika
  teraz (`rangeMonths` z osłon, kadłuba, średnich kosztów i długu silnika – `courseInputOf`, wspólne wejście kursu
  z `fleet`), z zakupem manewru w tym miesiącu i zmianą kosztów; resztka miesiąca (otwarte boje, spodziewane spłaty
  pożyczek udzielonych – zaległe w tym miesiącu) tylko w `rangeRest`, od którego rusza kurs. Zakup manewru to
  `CourseInput.purchases` (z celu albo z osłon – `goalId` null), osobno od `extras`. Symulator: wiersz „Zasięg i klasa”
  teraz / po manewrze z `rangeNow`, wiersz „Zasięg po resztce miesiąca” (z dymkiem) tylko, gdy różni się w którejś
  kolumnie. Sprostowanie wyroczni (C19, R-15) – AP-32.
- **T387** Daty pełności, „wyczyść manewr”, miesiąc wyczerpania (1.15.7, AP-18, PR sp. 8, WY sp. 3, WY.15): warstwa
  (osłony, kadłub) albo cel pełne już teraz (cele warstw jak silnik – pensja planu tego miesiąca, średnie koszty; po
  zakupie manewru w tym miesiącu) mają datę tego miesiąca, na ekranie „teraz” – także dokładnie pełne (dawniej następny
  miesiąc albo „—”). „Wyczyść manewr” wraca do pustego formularza (`blankForm`: nazwa i termin celu, „rata z pensji”,
  miesiące, cykl), widoczny przy każdej zmianie formularza; termin celu nie w formacie RRRR-MM – pole `aria-invalid`
  i podpowiedź („cel liczy się bez terminu i bez raty”). Prognoza zasięgu: oba zdania nazywają miesiąc wyczerpania jedną
  regułą – ostatni miesiąc, który zaczyna się z paliwem (`rangeForecast.emptyMonth`, `plansEmpty`); równa liczba
  miesięcy kończy się na początku następnego.
- **T388** „Osłony + kadłub i zasięg” na koniec miesiąca (1.15.7, AP-31, kryterium 2, WY.3, RY.23): `calc/cushion.ts`
  `cushionTrend` – osłony + kadłub w ostatnim dniu miesiąca i zasięg tego dnia (jak Mostek tego dnia: średnie koszty
  silnika jedną funkcją `averageCosts` (`fleet.ts`, przegląd N3) – 12 objętych miesięcy przed nim, poniżej 3 przyjęte
  koszty – i dług pożyczek wziętych z dniem
  nie późniejszym), zmiana m/m kwoty (strzałka ↑ / ↓ / →, zieleń / czerwień jak kwoty) i zasięgu (w dziesiątych, po
  obcięciu T218). Tylko miesiące zakończone: bieżący jest po wypłacie pensji do energii, a przed łupami – wobec końca
  miesiąca zawsze by spadał. Miesiące przed startem budżetu pominięte, pierwszy bez zmiany („—”). Wywiad – panel
  „Osłony i kadłub – 12 miesięcy” (najnowszy u góry, „rosną w N z M mies.”); Raporty → Debriefing – sekcja 12 miesięcy
  do debriefowanego (także PDF); Plan miesiąca → debriefing – wiersz miesiąca; Przegląd roczny – zakończone miesiące
  roku. Przy ukrytych kwotach zmiana kwoty bez znaku i strzałki (zasięg – jak dotąd – widoczny).
- **T389** Stany końca miesiąca z logu silnika (1.15.7, AP-31, T4, „Wydajność”): osłony i kadłub to sumy `moves` logu
  jednego przebiegu silnika (`fleet.log`) do końca każdego miesiąca – żadnego przebiegu na miesiąc (12 przebiegów to
  ok. 1,8 s przy 30 tys. operacji); sumy w pamięci po logu (`WeakMap`), hak `useCushion` liczy raz na przebieg silnika
  i rekordy, które czyta. Bezpiecznik: log, który nie sumuje się do stanu silnika teraz (ruch warstwy bez wpisu
  w logu), przełącza na przebieg silnika na koniec każdego miesiąca (`engineAt`). Test: każdy koniec miesiąca =
  `computeFleet` z `now` tego dnia (dostawy, łupy, wydatek ponad energię, pensja z kadłuba, pożyczki, konto dołączone
  później). Nowy ruch warstwy w silniku – zawsze z wpisem w logu.
- **T390** Resztka miesiąca w kursie z energii miesiąca (1.15.7, N3 – integracja AP-13 × AP-18; zamyka haczyk T385
  `TODO(AP-13)`): `courseInputOf` daje kursowi energię miesiąca (`CourseInput.energy`): `left` – energia miesiąca silnika
  (ta, którą T371 ogranicza energię dziś), `needs` – co plan miesiąca jeszcze z niej wyda (`restNeeds`): reszta puli
  dziennej na dni do końca miesiąca z dziś (limit kopert codziennych minus wydane; zwrot dawnego zakupu wraca do puli –
  T370), reszta kopert planowych i opłaty jeszcze do zapłaty ze stanu AP-10 (`cargoStatuses`, także zaległe – `carried`):
  miesięczna w całości, okresowa – czego brakuje w jej zbiorniku (dwa terminy jednego zbiornika dzielą to, co ma).
  Resztka miesiąca: `needs` ponad `left` z osłon (kadłub, gdy brak – jak „energia wyczerpana” silnika), potem boje
  i spłaty – boja tego miesiąca (wydatek) z kategorią koperty planowej bierze najpierw resztę tej koperty (jest już
  w `needs`; jej operacja weźmie z koperty, jak w silniku; boje jednej koperty dzielą resztę), z osłon tylko to, co ponad
  nią (przegląd N3); czego brakuje – `Course.rest.short`: osłony kończą resztkę na zerze (jak miesiąc kursu – T385), „Brakuje na
  koszty” (`Course.short`) liczy ją razem z miesiącami. Co energia zostawi – zostaje w miesiącu (łupy, decyzja kapitana –
  D18, jak dotąd). Zwykły miesiąc (plan w pensji) bez zmian; pensja częściowa, bez pensji albo energia wydana – kurs
  rusza od osłon po tej resztce. „Teraz” symulatora (`rangeNow`) dalej = Mostek (T386), „Zasięg po resztce miesiąca”
  liczy ją; Wywiad: „Resztka miesiąca: koperty i opłaty X ponad energię miesiąca (pensja częściowa) – z osłon, brakuje
  Y.” (`intel-course-rest`, powód z `daily.cap`). Rozważone i odrzucone: koszty po średniej minus wydane w miesiącu –
  podwójnie liczą raty zbiorników (energia już bez nich, średnia z opłatami okresowymi), a wpływów reszty miesiąca kurs
  nie zna; sama pula dzienna (jak porównanie T371) – pomija koperty planowe i czynsz, które biorą tę samą energię. Bez
  zmian formatu.
- **T391** „Kadłub pełny” w kursie od 99 % celu (1.15.7, N3 – integracja AP-17 × AP-18, T372): data pełności kadłuba
  w kursie i symulatorze (`Course.hullFull`, także „teraz” – T387) liczona `hullCountsFull`, jak Mostek („liczy się jako
  pełny”), firewall i „wolne do decyzji”. Bez zmian: raty celów z pensji na przełomie miesiąca kursu (T272) wymagają
  100 % kadłuba, dokowanie w kursie dopełnia go do 100 % (D13), osłony – bez tolerancji.
- **T392** Dowództwo – rozkaz dziennego przydziału przy energii ograniczonej (1.15.7, N3 – integracja AP-13 × gra):
  „wydatki dnia ≤ przydział dnia” (było „≤ energia dziś”) i opis: przydział dnia = koperty codzienne, które zostały,
  ÷ dni do końca miesiąca (z dziś); energia dziś = przydział − wydane dziś, nie więcej niż zostało energii miesiąca
  (T371); naruszenie – dopiero wydatki dnia ponad przydział (energia dziś poniżej zera; `daily.left`, jak alarm i gra).
  Bez zmian reguły gry.
- **T393** Jedna reguła płatności opłaty – Ładownia i silnik (1.15.7, przegląd N3 1–4, 13, scalenie z N2; zmienia T135 /
  T345 w silniku i przegląd N2 3, uzupełnia T375): który termin płaci płatność, decyduje jedna funkcja `feeDuesOf` (`calc/cargoStatus.ts`) – stan
  w Ładowni, Radar, odprawa i cykle zapłacone silnika (`paidDuesOf`: rata zbiornika `tankWant` na przełomie, `paidDue`),
  także kreator (`paidBeforeStart`). Okna T375 (miesięczna i co 2 miesiące – od 14 dni przed dniem płatności, ≥ 3 mies. –
  od 1. dnia miesiąca przed terminem); przed dniem terminu, gdy poprzedni niezapłacony – zaległa zapłata (T394), nie
  następny cykl; druga płatność okna – najstarszy niezapłacony; terminy budżetu od dnia startu, od miesiąca dodania
  kontenera (`createdAt`), w życiu opłaty, nie sprzed „Zapłacone poza budżetem” / „Nadal płacę” (`aliveAt`; ten miesiąc
  zawsze). Przed startem opłata śledzona od pierwszej widzianej płatności (T345, przegląd N2 4): spóźniona zapłata
  płaci zaległy termin, nigdy następny. Na przełomie miesiąca (i w dniu startu) silnik liczy płatności sprzed przełomu
  z dniem płatności tego miesiąca – stan, jaki Ładownia pokazywała tego dnia (płatność 1. dnia jest po przełomie);
  `paidDue` – płatności do dziś. Która płatność płaci opłatę – też jedna reguła (`paymentsIndex`, po scaleniu N2 z N3):
  części wydatku z kontenerem (linii, inaczej operacji), jedna płatność na operację – suma jej części z tym kontenerem
  (wypływ), także sprzed startu i spoza życia opłaty (pieniądze takiej – jak dotąd zwykły wydatek, B56); czytają ją
  Ładownia, Radar, odprawa, straż ładowni, silnik i kreator (`startPaidDays`). Opłata zapłacona z pieniędzy celu albo
  zakupem do zwrotu (cały zakup albo linia paragonu) jest zapłacona – rachunek zapłacony: pieniądze są celu (T131) albo
  domownika (D80), zbiornik nietknięty, cykl zamknięty (rata 0, zbiornik zbiera na następny termin – to, co już
  uzbierał, zostaje na niego); zwrot domownika później to zwykły wpływ (spłata jego długu). Inny rodzaj z kontenerem
  (dawny przelew, pożyczka, XTB sprzed T362) – nigdy, także w Ładowni. Ładownia nie czyta już zbiorników silnika
  (`tankPaid`). Wcześniej (`paidCycleOf`): kwartalna 180 zł, listopad zapłacony 10.12, luty 20.01 – zaległa nie
  zamykała listopada, lutowa była „zaległą”, 1.02 zbiornik brał 180 zł z energii drugi raz (Ładownia – luty zapłacony);
  co 2 miesiące grudzień niezapłacony, płatność 05.02 – Ładownia grudzień (i luty „zapłacone” ze zbiornika silnika),
  silnik luty: jedna płatność dwa terminy, alarm lutego nigdy; listopad „poza budżetem” albo kontener dodany w styczniu
  – silnik nadal brał 20.01 za zaległy listopad.
  Do scalenia z N2 płatności liczyły się różnie: Ładownia – też płatność z celu, cały zakup do zwrotu i dawny przelew
  z kontenerem, silnik i kreator (przegląd N2 3) – żadnej z nich, linii paragonu do zwrotu – nikt (kwartalna 180 zł
  zapłacona z celu 15.11: Ładownia „zapłacone”, silnik bez `paidDue` – plan i zbiornik liczyły zapłacony cykl jak
  niezapłacony; przelew z ukrytym kontenerem – odwrotnie). Rozważone i odrzucone: płaci tylko część z moich pieniędzy
  (jak przegląd N2 3) – Ładownia pokazywałaby rachunek zapłacony z celu albo przez domownika jako zaległy, Radar
  i odprawa – asteroidę zapłaconego terminu. Bez zmian formatu i migracji: warstwy liczone z rekordów – miesiące,
  w których cykl był zapłacony tylko w jednym miejscu, przeliczą się same; zamrożone dni gry zostają. Przegląd 2 N3 (1):
  kreator liczy opłatę kontenera w całości (`startTankItems` – kwoty, kalendarz, życie, rachunek zmienny `variable` F23,
  `createdAt`, `aliveAt`), jak silnik i Ładownia; wcześniej bez `variable` – rachunek co 2 miesiące zapłacony raz dwoma
  przelewami, potem kilka dni przed dniem terminu: kreator był cykl w tyle (lipiec niezapłacony, rata 300 zł i „do planu”
  150 zł), silnik i Ładownia – lipiec zapłacony. Test własności „silnik = Ładownia = kreator” – też rachunki zmienne
  i płatności z wyprzedzeniem (T398).
- **T394** Termin sprzed startu, najstarsza zaległa, „Zapłacone (dziś)” (1.15.7, przegląd N3 5, 10; doprecyzowuje T375,
  T379): terminy budżetu liczą się od dnia startu, nie od miesiąca – termin sprzed niego bez płatności nie jest „po
  terminie” ani zaległy (bez alertu odprawy, pozycji Radaru i resztki kursu z osłon), zapłacony – „zapłacone” (T379);
  płatność po starcie płaci tylko terminy budżetu (01.10 przy starcie 20.09 i terminie 3. – październik, nie wrzesień).
  Płatność przed dniem terminu przy niezapłaconym poprzednim płaci najstarszy niezapłacony termin (wrzesień i październik
  zaległe, płatność 01.11 – wrzesień; wcześniej październik, a wrzesień zostawał na zawsze); poprzedni zapłacony –
  płatność jest wcześniejszą następnego (T135), choćby starszy był zaległy. Płatności przydzielane po kolei (stan każdego
  dnia zostaje): druga płatność okna płaci najstarszy niezapłacony termin w chwili, gdy przyszła. „Zapłacone (kwota,
  dziś)” (`payToday`) – termin, który płatność dziś tej kwoty zostawia zapłaconym (także przez drugą płatność okna, gdy
  termin okna już zapłacony); „Płatność dziś zamknie najpierw zaległą opłatę (termin …)” – ten termin.
- **T398** Płatność wpisana z wyprzedzeniem płaci termin w swoim dniu (1.15.7, przegląd 2 N3 2, przegląd 3 N3 1–3, 9;
  doprecyzowuje T375, T393, B127): płatność opłaty z datą po dziś (wydatek wpisany naprzód) nie płaci terminu przed swoim
  dniem – stan w Ładowni, Radarze, odprawie i resztce kursu (`cargoStatuses` – płatności do dziś) jak silnik (`paidBefore`
  do dziś, `paidDue`, przełom miesiąca); w jej dniu – zapłacony w obu. Zaplanowany jest wyłącznie termin, któremu tę
  płatność daje ta sama reguła (`feeDuesOf` ze wszystkimi płatnościami opłaty, terminy do końca okna Radaru –
  `AHEAD_DAYS` = `RADAR_DAYS`, 90 dni; `plannedDues`, `CargoStatus.planned` – jej pierwsza taka płatność); termin
  zamknięty dopiero wcześniejszą płatnością, którą ona przesuwa (druga płatność okna oddaje wcześniejszą zaległemu – T375),
  nie jest zaplanowany – zostaje „po terminie” do jej dnia. Ładownia: w wierszu „zaplanowane dd.mm” (bez akcentu „po
  terminie”), w edytorze „Zaplanowana płatność: kwota (dd.mm) – zapłaci termin dd.mm w swoim dniu.”, w „Zaległe” –
  „zaplanowana płatność dd.mm (kwota) zamknie go w swoim dniu”. „Zapłacone (kwota, dziś)” (`payToday`) stoi przy
  najstarszym terminie ani zapłaconym, ani zaplanowanym, który płatność dziś zostawi zapłaconym albo zaplanowanym –
  z płatnościami wpisanymi naprzód po niej (zaległy październik zaplanowany płatnością 13.11 z okna listopada: przy
  listopadzie – dzisiejsza zamknie październik, 13.11 listopad); płatność dziś, która zamknęłaby termin tylko przesunięciem
  przez płatność wpisaną naprzód – bez przycisku. Termin zaplanowany – w tym albo kolejnym miesiącu okna Radaru – nie jest
  pozycją Radaru, asteroidą odprawy ani najbliższym terminem do zapłaty w Ładowni (`nextDueOf` – następny); salda naprzód
  liczą wtedy samą operację, raz; odprawa bez alertu „Kontener niezaładowany” dla zaplanowanego; resztka miesiąca w kursie
  (T390) liczy go do zapłaty z energii (silnik jeszcze jej nie wziął). Płatność dalej niż okno Radaru – żadnego terminu.
  Wcześniej (do przeglądu 2 N3) Ładownia, Radar i odprawa pokazywały „zapłacone” od chwili wpisania, a silnik liczył cykl
  dopiero w dniu płatności; po przeglądzie 2 – płatność zaplanowana tylko dla terminów tego miesiąca i zaległych (termin
  kolejnego miesiąca – pozycja Radaru obok operacji, salda naprzód liczyły go dwa razy; tak było od 1.8.0), z zapasową
  płatnością dnia przy przesunięciu i „Zapłacone (dziś)” przy terminie już zaplanowanym (przycisk ukryty). Rozważone
  i odrzucone: płatność naprzód płaci od razu także w silniku – zbiornik przestałby zbierać na pieniądze, które jeszcze są
  na koncie, a data operacji wpisanej naprzód bywa zmieniana. Bez zmian formatu.
- **T399** Wydajność stanu opłat i boi (1.15.7, przegląd 2 N3 3, 4, 8, 9; obok T375, T378): „Zapłacone (dziś)”
  (`payToday`) i płatności zaplanowane (T398) liczone tylko dla opłaty z pokazanym terminem do zapłaty – opłata zapłacona
  nie przelicza całej historii drugi raz; stan opłat w oknie (`features/cargo/status.ts`) przeliczany przy zmianie
  rekordów, dnia, startu i plików z banku, nie przy każdym przebiegu silnika (stan nie czyta zbiorników od T393 –
  `CargoInput.tanks` usunięte). „Pozostałe boje” – stan boi jednorazowych po dniu raz na listę boi, operacji i dzień
  (`pastStates`, pamięć po liście), każda tymi samymi dniami co dotąd (boje z dniem w ±6 dni jej dnia, operacje zrobione
  z każdej boi), nie przebieg po wszystkich bojach dla każdej z nich przy każdym odmalowaniu. Jedna kolejność płatności
  jednego dnia (`byPaymentDay` – indeks Ładowni i płatności sprzed startu w silniku). Wynik bez zmian (test równości ze
  stanem liczonym jak dotąd). Przegląd 3 N3 (7, 8): `pastStateOf` tylko czyta `pastStates` (jedna droga – ta, której
  używa panel); dopasowanie dni okna nie kopiuje zbioru operacji zrobionych z boi (własny zbiór dopasowanych w oknie).
- **T400** Nic nie zmienia się po cichu (1.15.8, N4, AP-15): każda odmowa i każde przycięcie mówi to przy polu – co zostaje
  i dlaczego. Pole kwoty `amountRefusal` (nieprawidłowa / pusta / ujemna; „1.200” i „12,345” z podpowiedzią), `NumberField`
  domyślnie sam mówi („Dozwolone: od … do …”, „Tu tylko liczby całkowite”, `range`; `onReject` nadpisuje), w trybie
  natychmiastowym i `commitOnBlur`; Esc w polu liczbowym cofa wpis (pole zapisujące przy każdym klawiszu wraca do wartości
  z chwili wejścia). Zakres „od” po „do” (kwoty filtra Operacji, daty eksportu) – zamiana ze słowem (`orderRange`), nie
  skasowanie końca. Pusty eksport: „Brak operacji w okresie.” i brak pliku. Limity długości: licznik od 80 % (`LimitHint`,
  w `TextField` / `TextArea` / `NameInput` z `maxLength`), przy limicie „dalszy tekst jest obcinany”; tagi: skrócony do 40
  znaków i pominięty ponad 20 (`tagsLost`) z komunikatem, pełne pole mówi „najwyżej 20 tagów”. Zapis 0 zł – ostrzeżenie w
  edytorze operacji; wyłączony przycisk (nowy kontener, przeniesienie środków celu) podaje powód. Edytor reguły importu nie
  pokazuje „w tym za” (reguła go nie zapamiętuje). Szybki wpis nie ma toastów – każdy toast pól trafia do stopki
  (`QuickApp`), Esc to „×” (wpisywana kwota zostaje w szkicu), a Enter po odmowie pola nie zapisuje starej wartości;
  archiwizowany domownik czyści wybór „Finansuje” (nie podstawia pierwszego z listy). Bez zmian formatu danych.
- **T401** Jeden wzorzec potwierdzenia i „Cofnij” (1.15.8, N4, AP-22): usunięcie, rozłączenie i zrzut, które aplikacja cofa
  (reguły importu i słowa kluczowe `removeRule`, rozłączenie nazwy `unmergeName`, „to nie to samo” `clearDismissedSimilar`,
  „to nie powtórzenie” `dismissCorrection`, „Zrzuć z ładowni” `archiveContainer`, nazwa domownika w banku) – toast z „Cofnij”;
  działania nieodwracalne z aplikacji (Kosz Windows po imporcie i dla uszkodzonego pliku, token aktualizacji, przerwanie
  kreatora) – jedno pytanie w tym samym miejscu, `ConfirmButton` („Usuń na pewno” / własny napis + „Anuluj”, Esc wycofuje, fokus
  na potwierdzeniu; `DeleteButton` jest na nim). Pytanie przy przerwaniu kreatora mówi, co przepada, i wymienia ślady, które
  kreator już zapisał w folderze (domownicy, cele – `WizardState.traces`). Zmiana scenariusza ICTTJ zostaje baner z
  objaśnieniem (stan oczekujący, nie przycisk). Toast z „Cofnij” trwa co najmniej 8 s (`UNDO_MIN_MS`, AF-7).
- **T402** „Cofnij import” (1.15.8, N4, AP-22): okno liczy „zmienione później przez Ciebie” tylko dla operacji, których nie
  dotknął późniejszy import (jego zmiany i usunięcia – `undoPlan(…, { touched })`), a „Cofnij” cofnięcia importu ustawia mu
  nowe `savedAt` (zapisy z powrotem nie są pracą użytkownika). Lista „Ostatnie importy” przy dziesięciu paczkach mówi, że
  następny import usunie najstarszą (razem z jej „Cofnij import”); Ustawienia → Folder i kopie mówią o 5 ręcznych kopiach.
  Bez zmian formatu danych.
- **T403** Teksty interfejsu (1.15.8, N4 – AP-23, AF-55, AF-66, AF-69, AF-71–AF-73): jeden sposób pisania w `shared/format.ts`
  – `plDate` (dd.mm.rrrr), `plDateTime` (dd.mm.rrrr, gg:mm – dwie cyfry dnia i miesiąca), `decimalText` / `percentText`
  (przecinek, minus typograficzny „−”, zero bez znaku), `countLabel` / `plural` / `salariesText` (liczebniki); ISO dat
  nie ma w żadnym tekście (tytuły wpisów w historii i dzienniku zmian `recordTitle`, wartości w różnicach `formatValue`,
  zakres Operacji `periodLabel`, chwile przez `plDateTime`). Stopa oszczędności zawsze z jednym miejscem po przecinku
  (T294: `rateText` „55,0%”, CSV „55,0”, Excel format „0.0”); pole liczby (`NumberField`) pisze przecinek („1,0”).
  Komunikaty systemu po polsku: `shared/plainError.ts` zamienia kody systemu plików (ENOENT, EBUSY, EPERM…), błędy
  JSON, ZIP i schematu (zod) na zdanie; stosuje je `errorMessage` okna (wywołania IPC loguje `handle` z surowym
  tekstem), opis plików z problemami, nieudana kopia, błąd odczytu folderu ICTTJ; plik, który zajął OneDrive albo inny
  program, ma plakietkę „zablokowany”, nie „uszkodzony”. Podsumowanie odzyskania z kopii uzgadnia imiesłów z
  rzeczownikiem („1 plan miesiąca zmieniony”). Kody decyzji, identyfikatory i teksty robocze („spec”) tylko w
  komentarzach – pilnuje tego `tests/unit/ui-no-codes.test.ts` (źródła) i `tests/e2e/ap23.spec.ts` (renderowane
  ekrany i dymki). Słowniczek: osobna lista „Terminy ICT” (`ICT_GLOSSARY`, w F1) – termin po angielsku, objaśnienie po
  polsku; wszystkie linie „Stanu okrętu” i Daily Bias mają dymek. Słowo „firma” zastąpione („sprzedawca albo osoba”),
  przejścia 100 ms → 150 ms (120–160 ms).
- **T404** Sprawdzenia po scaleniu N4 (1.15.8, AP-23, US.9, AF-71): (1) Esc w polach „Progi gry” (Ustawienia → Warstwy
  i rozkazy) cofa wpis – `NumberField` z AP-15 wystarczył, dopisany test E2E; (2) cisza nocna „od” = „do” zostaje
  przyjęta (to sposób na wyłączenie ciszy), ale pole mówi to wprost („ta sama godzina – cisza nocna wyłączona”);
  (3) `clampZoom` zaokrągla do siatki 10 % (ręcznie wpisane 1,23 czyta się jako 120 %, nie „123%”).
- **T405** Odprawa z hierarchią (1.15.8, N4 – AP-16, MO sp. 1, 2, DW sp. 3): `arrangeBriefing` (`calc/briefing.ts`, czyste)
  układa pozycje odprawy: alarmy (czerwone, potem żółte – wszystkie poziomy inne niż „info”), sprawy dnia (informacje
  wymagające ruchu dziś: start, import i nowy plik z mBanku, salda, misja, dostawa czekająca na import, folder ICTTJ,
  firewall wyłączony, łupy), reszta (zapowiedzi i obserwacja: asteroida za 4–14 dni, PIT-38, boje w przód, koniec
  kontenera, cena, kontener bez płatności, nowa opłata, nieznany sygnał, domownik) – w obrębie poziomu kolejność
  `briefing()`. Na wierzchu najwyżej 8 pozycji (`BRIEFING_SHOWN`, nadmiar alarmów i spraw dnia też się zwija), czerwona
  nigdy; reszta pod „Pokaż wszystkie (N)” (N – wszystkie pozycje; zwinięte są w stronie ukryte, `data-tier`). Jedna
  pozycja na sprawę: nieznany sygnał kategorii albo zakupu (sygnał marki i nowego kontrahenta niesie teraz kategorię
  zakupu – `Anomaly.categoryId`, addytywnie) z kategorią, której koperta ma alarm przekroczenia, idzie pod ten alarm
  (`also`, poziom wyższy z obu). Sprawy, które Meldunki też pokazują – dostawa do zadokowania, zwrot po terminie, saldo
  (dzień sprawy: `BriefingItem.since`) – starsze niż 30 dni (`BRIEFING_OLD_DAYS`) tylko w Meldunkach; w odprawie
  odnośnik „N spraw starszych niż 30 dni – w Meldunkach ›”. Domownik (D80 e) się nie starzeje – jego przypomnienie
  zaczyna się po 30 dniach. Osłony poniżej minimum – w grze poważne naruszenie – w odprawie czerwone (DW sp. 3;
  poziom alarmu silnika bez zmian); w Dowództwie poważne naruszenie dnia i dziennika czerwone z plakietką „poważne”.
  Powiadomienia biorą dalej każdą pozycję `briefing()` (własne klucze) – układ dotyczy Mostka, odłączonej Odprawy,
  Raportów (pełna lista w tej samej kolejności) i odsłuchu.
- **T406** Powiadomienia: odprawa pierwsza i jedno zbiorcze (1.15.8, N4 – AP-16, US sp. 1, RY sp. 4, AF-67; rozszerza
  T56): dopóki dzisiejsza odprawa nie przyszła (klucz `briefing:<dzień>` niezapamiętany – `briefingShown`), a nie
  jest jej chwila, pozostałe powiadomienia dnia czekają – przy odprawie „przy pierwszym otwarciu” najwyżej do 9:00
  (`BRIEFING_HOLD_UNTIL`: okno w zasobniku przez cały ranek dostaje je wtedy, odprawę przy otwarciu), przy ustalonej
  godzinie do niej, najwyżej do 12:00 (`BRIEFING_HOLD_MAX`). Trzy i więcej naraz (`BUNDLE_FROM`, start: 10) –
  jedno powiadomienie (`bundleNotices`): odprawa z „Do tego N innych powiadomień: tytuły (z liczbą powtórzeń) –
  Mostek.” albo „Powiadomienia (N)”, kliknięcie – Mostek, dźwięk alarmu, gdy któreś go ma; każdy klucz zapamiętany
  osobno (nic nie przychodzi drugi raz). Zastępuje grupę „Nowe wypłaty w ICTTJ do zadokowania” (3+). Okno dotknięte
  pierwszy raz po ciszy nocnej z odprawą przechodzi na Mostek jak okno pokazane z zasobnika (AF-67), chyba że otworzyło
  je kliknięcie powiadomienia.
- **T407** Godzina odprawy (1.15.8, N4 – D99 pkt 7, D84 C9): `NotifyPrefs.briefingTime` (config.json – komputer;
  addytywnie, brak albo błędna = null) – null: przy pierwszym otwarciu okna po ciszy nocnej (domyślnie, jak dotąd);
  „HH:MM”: odprawa przychodzi o tej godzinie bez otwierania okna (godzina w ciszy nocnej – na jej końcu, `briefingAt`;
  wcześniejsze otwarcie okna jej nie wysyła – odprawa i tak jest na Mostku), okno nie przechodzi wtedy samo na Mostek.
  Ustawienia → Powiadomienia: wybór „przy pierwszym otwarciu okna po ciszy nocnej” / „o ustalonej godzinie” (domyślnie
  07:00, pole godziny), uwaga przy godzinie w ciszy. Telefon planuje odprawę na tę godzinę (`plannedNotices`), wyboru
  w ustawieniach telefonu nie ma (preferencje urządzenia – null).
- **T408** Odsłuch – skrót (1.15.8, N4 – AP-16, MO sp. 1, 7; rozszerza T214): `briefingSpeech` czyta dzień, energię
  dziś (przy ukrytych kwotach „Energia na dziś: kwota ukryta.”, przekroczenie i powód ograniczenia jak dotąd), Daily
  Bias, najważniejszy alarm (pierwsza pozycja `arrangeBriefing` z poziomu alarmów; brak – „Bez alarmów.”) i „Na Mostku
  (jeszcze) N spraw.” – nigdy wszystkich pozycji. Kwoty w tekście czytane jak energia („52 złote 50 groszy”, ukryta –
  „kwota ukryta”), strzałka „→” jako „na”. Silver Bullet bierze ten sam najważniejszy alarm.
- **T409** Rozkazy i progi gry tylko w Ustawieniach (1.15.8, N4 – D99 pkt 7, D84 C9; zmienia T227 „rozkazy edytowalne
  w Dowództwie” i N73): Dowództwo pokazuje rozkazy (minimalne osłony, linia zanurzenia, cisza nocna, próg dziennika,
  firewall) i progi gry (awans, koperta poważnie ponad, degradacja, misja) do odczytu z odnośnikiem „zmień w
  Ustawieniach → Warstwy i rozkazy ›”; progi gry przeniesione do Ustawień → Warstwy i rozkazy (panel „Progi gry”, te
  same pola i granice). Odrzucony próg mówi dlaczego i że zostaje poprzednia wartość (AP-15, DW sp. 5:
  `thresholdRefusal`, komunikat jak przy celach warstw). Bez zmian formatu (`settings.game`, `settings.orders`).
- **T410** „Cofnij import” – zmiany użytkownika po zapisach importów i cofnięć (1.15.8, N4 – przegląd 1 pkt 2, 3; zmienia
  T402): operacja paczki jest „zmieniona później przez Ciebie”, gdy jej `updatedAt` jest późniejszy niż ostatni zapis
  aplikacji tej operacji (`appWrites`: `savedAt` paczek, które ją utworzyły albo zmieniły – import i „Cofnij” cofnięcia –
  oraz `undoneAt` cofniętych paczek, które ją zmieniły albo usunęły), albo gdy jakiś zapis aplikacji zastał ją ze zmianą
  użytkownika – paczka, która pisała, zapamiętuje ją w nowym polu `edited` (lista id, addytywnie): import – operacje
  wcześniejszych importów, które zmienia albo usuwa; cofnięcie – te, które usuwa albo zapisuje z powrotem (`editedOf`).
  `undoneAt` i nowe `savedAt` „Cofnij” są brane po zapisach (`flushSaves`), więc stemple zapisów aplikacji nigdy nie są
  późniejsze. Zastępuje wykluczanie operacji dotkniętych przez późniejszy import (zmiana użytkownika po cofnięciu tamtego
  importu nie ostrzegała) i samo nowe `savedAt` przy „Cofnij” (zmiany sprzed cofnięcia przestawały się liczyć). Granice:
  zapis, który dotarł do folderu dopiero przy ponowieniu, liczy się jak zmiana użytkownika (ostrzeżenie w nadmiarze);
  paczki sprzed 1.15.8 nie mają `edited` – zmiana przykryta wtedy późniejszym importem nie ostrzega; czasy z różnych
  komputerów porównywane jak dotąd. Bez podbicia `SCHEMA_VERSION`. **Zastąpione przez T415** (przegląd 2 N4): porównanie
  czasów miało dalsze dziury (zapis użytkownika w trakcie `flushSaves` ze stemplem sprzed czasu paczki, zapis samych
  kluczy drugiego formatu bez paczki, zegary komputerów) – pole `edited`, `appWrites` i nowe `savedAt` przy „Cofnij”
  usunięte przed wydaniem.
- **T411** Pierwszy dotyk okna po ciszy nocnej (1.15.8, N4 – przegląd 1 pkt 6; zmienia T406): poranny tylko po przerwie –
  poprzedni dotyk przed końcem ciszy i co najmniej 30 min wcześniej (`MORNING_IDLE_MS`, `morningTouch`). Praca przez
  koniec ciszy (04:59 → 05:00) nie przenosi na Mostek; okno zostawione na noc – tak, jak dotąd.
- **T412** Eksport i wyszukiwanie usuniętych (1.15.8, N4 – przegląd 1 pkt 7, 8): „Excel (operacje + miesiące)” zapisuje
  plik, gdy którykolwiek arkusz ma wiersze (`budgetWorkbook` – okres bez operacji ma swoje miesiące); bez niczego –
  „Brak operacji i miesięcy w okresie.” i brak pliku; wiersze liczone raz na kliknięcie. „Usunięte wpisy” szukają dat
  w obu zapisach (`deletedSearchText`): tytuł jak na ekranie (dd.mm.rrrr) i daty rekordu rrrr-mm-dd, chwila usunięcia jak
  na liście („dd.mm.rrrr, gg:mm”) i rrrr-mm-dd tego samego dnia.
- **T413** Słowa pól w szybkim wpisie (1.15.8, N4 – przegląd 1 pkt 5; uzupełnia T400; zawężone przez T417): Enter wstrzymuje tylko odmowa pola
  (toast „error”); słowo o wartości przyjętej, ale zmienionej (tag skrócony do 40 znaków, tag ponad 20 pominięty) idzie do
  stopki zwykłym kolorem, Enter zapisuje, a słowo jest dopisane do odpowiedzi zapisu („Zapisano. Tag … został skrócony.”)
  i okno czeka 4 s, by dało się je przeczytać.
- **T414** Nazwy domownika w banku (1.15.8, N4 – przegląd 1 pkt 4; uzupełnia T401; porównanie nazw – T416): „Cofnij” usunięcia nazwy przywraca
  tylko tę nazwę, na jej miejsce wśród nazw z chwili cofnięcia (dopisane w międzyczasie zostają, inne usunięte nie
  wracają); nie wraca, gdy domownik ma ją znowu albo ma ją teraz inny domownik (komunikat – jedna nazwa nie wskazuje dwóch
  osób). Najwyżej 20 nazw na domownika (`MAX_BANK_NAMES`, granica schematu – ponad nią lista czytała się jako pusta i
  znikała przy zapisie): 21. odmówiona z komunikatem.
- **T415** „Cofnij import” po treści, nie po czasie (1.15.8, N4 – przegląd 2 pkt 1, 4, 5; zastępuje mechanizm T410): paczka
  importu zapisuje odcisk treści każdej utworzonej operacji (`createdHashes`, addytywnie; `contentHash` – rekord po
  schemacie, bez `updatedAt` / `updatedBy` / `schemaVersion` / `computed` i bez kluczy drugiego formatu `altKeys`, pola
  w stałej kolejności, 53-bitowy skrót). „Zmienione później przez Ciebie” = treść inna niż zapisana przez import – kto
  i kiedy ją zapisał, nie gra roli: późniejszy import i jego cofnięcie oddają treść, „Cofnij” cofnięcia zapisuje ją
  z powrotem, import w drugim formacie dopisuje tylko `altKeys` – nic z tego się nie liczy; zmiana użytkownika liczy się
  zawsze, także ze stemplem sprzed chwili paczki (zapis w trakcie `flushSaves`, inny zegar komputera, zapis ponowiony
  później). Import sprzed 1.15.8 (bez odcisków): stempel po `savedAt` to zmiana (więcej ostrzeżeń, nigdy mniej), a przy
  jego cofnięciu operacje nietknięte według stempla dostają odcisk (`UndoPlan.hashes`) – jego „Cofnij” i następne
  cofnięcie porównują już treść. „Cofnij” cofnięcia nie nadpisuje i nie usuwa zmian zrobionych po cofnięciu
  (`redoneAs`): operacja zapisana z powrotem – trójstronnie (podstawa: jak cofnięcie ją zapisało; zmiana użytkownika
  zostaje, zmiana importu wraca na wierzch, przy kolizji wygrywa użytkownik); operacja przywrócona przez cofnięcie
  (usunięta przez import) – zmieniona od cofnięcia zostaje, a import przy następnym cofnięciu jej nie dubluje; toast mówi
  „Zmiany wprowadzone po cofnięciu zostają (N operacji)”. `savedAt` nie zmienia się przy „Cofnij”. Bez podbicia
  `SCHEMA_VERSION`. **Dopisek (przegląd 3 N4):** „Cofnij” cofnięcia odmawia ze słowem, gdy przywróciłby operacje obok tych
  samych wierszy banku (`redoRefusal`): po cofnięciu stoi późniejszy import (ten sam plik znowu, inny – tu albo na drugim
  komputerze) albo klucze wierszy (`bank` / `counterBank`, także `altKeys`) są w budżecie inną drogą – import nie wraca
  wcale (nie częściowo); wczytuje się go ponownie z pliku. Nigdy w ciszy: folder tylko do odczytu albo otwieranie innego,
  import już z powrotem, import, który wypadł z listy dziesięciu – każde ze zdaniem.
- **T416** Jedno porównanie nazw w banku (1.15.8, N4 – przegląd 2 pkt 2, 3, 8): `sameBankName` (`calc/household.ts`) –
  te same słowa co w `memberOf` (`bankNameWords`: bez wielkości liter i polskich znaków, słowa od dwóch znaków), w dowolnej
  kolejności („JAN ŻÓŁW” = „jan zolw” = „ŻÓŁW JAN”). Dodanie nazwy, którą ma inny domownik, jest odmówione z komunikatem
  („Nazwę … ma już …”), to samo przy „Cofnij” jej usunięcia (T414); „+ domownik” z importu dla nazwy, którą ktoś już ma,
  przypisuje tego domownika zamiast tworzyć drugiego. Granica 20 nazw – jedna stała `MAX_BANK_NAMES` w schemacie i w oknie.
  Nazwy częściowo wspólne („ANNA KOWALSKA” i „KOWALSKA ANNA MARIA”) nie są odmawiane – `memberOf` bierze pierwszego.
  **Dopisek (przegląd 3 N4, zmienia zdanie wyżej):** reguła „ta sama osoba” jest regułą `memberOf` – `bankNamesClash`:
  nazwa, którą import znalazłby w nazwie innego domownika albo odwrotnie („JAN KOWALSKI” w „JAN KOWALSKI SENIOR”, „JAN”
  w „JAN JAN”, te same słowa w innej kolejności), jest odmawiana przy dodaniu, przy „Cofnij” usunięcia, w „+ domownik”
  importu (`offersNewMember` – przycisku nie ma) i w domowniku z importu (przypisany ten, którego nazwę import odnajduje).
  Ta sama nazwa tego samego domownika w innej pisowni (`sameBankName`) – słowo „… ma już nazwę …”, nic nie dopisane.
- **T417** Słowa pól w szybkim wpisie należą do jednego działania (1.15.8, N4 – przegląd 2 pkt 6; zawęża T413): słowo
  o przyjętej, ale zmienionej wartości (skrócony tag) idzie z odpowiedzią zapisu tylko wtedy, gdy padło w tym samym
  działaniu (ten sam Enter, to samo kliknięcie „Zapisz”) – każdy nowy klawisz albo kliknięcie zaczyna od zera, bo słowo
  powiedziane wcześniej było już w stopce. Odmowa zapisu (brak kwoty, cisza nocna…) też dopisuje słowa tego działania.
  Tag równy już dodanemu nie jest liczony jako „skrócony” (nic nie przybywa). **Dopisek (przegląd 3 N4):** słowa działania
  są brane w chwili wysłania zapisu (`fieldWords`, `features/quick/fieldWords.ts`) – klawisze wpisane, zanim przyjdzie
  odpowiedź (kolejna kwota po Ctrl+Enter), ich nie gubią.
- **T418** „Cofnij” nie nadpisuje zmian zrobionych po działaniu (1.15.8, N4 – przegląd 3 pkt 6, 7, 8; reguły importu
  i domownicy, uzupełnia T401): „Cofnij” cofa tylko to, co nadal jest takie, jak działanie to zostawiło; zmienione od tego
  czasu zostaje, a toast to mówi (`undoKept`: „Nic nie cofnięto – zmieniło się od tego czasu i zostaje, jak jest.” albo
  „Cofnięte operacje: N; zmienione od tego czasu zostają, jak są: M.”). Dotyczy: zmiany reguły i „spłata” z przeglądu
  reguł (`editRule`, `repayingRule` – reguła zmieniona albo usunięta od tego czasu zostaje), nowej reguły kwotowej (nie
  jest usuwana, gdy zmieniona), „zostaje zaliczką” reguły (zdejmuje tylko swój znak), „Zastosuj do historii”, rozłączenia
  i połączenia nazw (klucze zmienione od tego czasu zostają), „Spłać” zaliczek, przypisania zwrotu (gdy wskazane zakupy się
  zmieniły), zwrotu gotówką (nie jest usuwany, gdy zmieniony), dnia „zwroty spłacają tylko wskazane zakupy”, startu
  rozliczeń (wraca tylko start, jego operacje i saldo na start domowników nadal przeliczone – domownicy dodani albo zmienieni
  potem zostają; dawniej całe ustawienia domowników z chwili kliknięcia). „zostaw” zaliczek liczy meldunek jak skrzynka
  (zostawione już się nie liczą) – na meldunku zostawionym gdzie indziej mówi „nic do zmiany”. Inne ekrany (Ładownia, Radar,
  Operacje) – poza tym przeglądem.
- **T420** „-” i „_” w tagu jak spacja (AP-21, AF-18; zmienia T291): `tagKey` – bez wielkości liter, polskich znaków,
  a „-” i „_” to spacja („#wakacje-chorwacja” w nazwie = tag „Wakacje Chorwacja”; „#słowo” nie ma spacji, więc wyprawa
  z kilku słów rozdwajała się). Bez migracji: tagi operacji zostają jak zapisane (pierwsza pisownia jest etykietą), klucze
  zapisane w ustawieniach przed 1.15.9 czytane przez `tagKey` jeszcze raz – cel wyprawy (`tagGoalOf`; `setTagGoal` usuwa
  dawny klucz tego tagu), filtr zapisanego widoku i filtr tego komputera (`filterOf`). Tag z samych „-” / „_” – żaden.
- **T421** Miesiąc w toku liczony do dziś (AP-36, C16 – D99 (9); RE sp. 4): debriefing (`debriefing` – koszty netto,
  koperty, „bez koperty”, ładownia, sfinansowane przez domowników), przegląd roczny (`yearNumbers(…, today)` – koszty,
  przychody, kategorie, miesiące), bilans paliwa (`fuelMonths` / `fuelSummary(…, today)`) i „Wydatki w czasie” Wywiadu
  czytają operacje z datą do dnia budżetu (`upToDay`, `calc/operations.ts` – ta sama lista, gdy żadna nie jest późniejsza),
  jak salda, energia i warstwy („Operacja z przyszłą datą nie liczy się do sald, energii i warstw do tego dnia”). Koszty
  netto operacji z datą po dziś – osobno jako „Zaplanowane (operacje z datą po dziś – poza kosztami)”: `Debriefing.planned`
  i `YearNumbers.planned` (kolumna „Zaplanowane” w tabeli miesięcy przeglądu, gdy jest), linia tylko przy kwocie ≠ 0.
  Dopisek (integracja 2 N5): tabela miesięcy przeglądu ma tylko miesiące z historią (T449), więc kolumna – gdy ma ją
  któryś z pokazanych miesięcy; zaplanowane późniejszych miesięcy – w linii roku.
  Miesiąc zakończony – jak dawniej (nie ma w nim dat po dziś). Eksport „Miesiące” bierze koszty z debriefingu (do dziś),
  przychody liczy sam (poza tą zmianą). Operacje pokazują listę okresu bez zmian (suma tego, co na liście).
  Dopisek (przegląd N5 8 – zmienia zdanie o przychodach eksportu): eksport „Miesiące” liczy przychody miesiąca w toku
  z tych samych operacji co koszty – do dnia budżetu (`monthRows` z `upToDay`, jak Bilans paliwa `fuelMonths`), więc
  bilans i stopa oszczędności są z jednego okresu (wcześniej: przychody całego miesiąca, także z datą po dziś, przeciw
  kosztom do dziś); koszty netto operacji z datą po dziś – osobno, w nowej ostatniej kolumnie „Zaplanowane – data po
  dziś (zł)” (`Debriefing.planned`; miesiąc zakończony 0,00 – kolumny przed nią na swoich miejscach, jak w AP-29).
  Przychód z datą po dziś nie ma kolumny (jak w debriefingu i przeglądzie rocznym).
  Dopisek (przegląd 2 N5 6 – zmienia ostatnie zdanie poprzedniego dopisku): przychód (D81) operacji z datą po dziś nie
  znika z eksportu – kolumna „Zaplanowane przychody – data po dziś (zł)” obok „Zaplanowane koszty – data po dziś (zł)”
  (dawniej „Zaplanowane – data po dziś (zł)”; `MonthRow.plannedIncome` – ta sama reguła przychodu co „Przychody”);
  bilans i stopa oszczędności dalej do dziś, jak debriefing (AP-36).
- **T422** Wypłata z bankomatu na konto „Gotówka” (AP-33, D100 (1); zmienia spec „Konta budżetu” i „Przypadki
  szczególne”, doprecyzowuje D83): konto gotówki to aktywne konto rodzaju `cash` (`cashAccountOf` – domyślne
  `CASH_ACCOUNT_ID` najpierw; nazwa nie decyduje). Jest – import rozpoznaje wypłatę (`isAtmOperation`: „WYPŁATA
  W BANKOMACIE”, „BLIK WYPŁATA GOTÓWKI” i podobne, jak dotąd) jako przelew własny pliku → Gotówka (`ClassifyContext.cash`,
  `transfer` z `counterAccountId` – jedna operacja dla obu kont, `bothSides`; bez kosztu, warstwy bez zmian), nigdy na
  konto samego pliku; reguła starego modelu – wydatek kategorii systemowej „Gotówka” (bez finansowania i wspólnego zakupu,
  także słowo użytkownika) – ustępuje temu przelewowi, a „zapamiętaj” takiej decyzji przy koncie gotówki reguły nie uczy
  (`ImportPlan.cash`; następny import by jej nie posłuchał); reguła innej kategorii zostaje. Nie ma – wydatek „Gotówka” jak
  w specyfikacji, a import przy pliku z wypłatami proponuje konto (`cashAccountOffer`, przycisk przy pliku, nigdy po
  cichu): zarchiwizowane konto gotówki wraca, konto nazwane „Gotówka” dostaje rodzaj `cash`, inaczej nowe „Gotówka”
  (stałe id, gdy wolne); „Cofnij” przywraca konta, póki żadna operacja nie jest na tym koncie; ekran importu planuje od nowa
  po zmianie kont (`PlanInputs.accounts`). Zakupy gotówką – szybki wpis i edytor z konta „Gotówka” (bez zmian w kodzie,
  pilnuje E2E `cash.spec.ts`). Wpłatomat (wpłata gotówki na rachunek) – bez rozpoznania (brak wzoru opisu mBanku w danych
  testowych), jak dotąd wpływ do decyzji użytkownika.
- **T423** Dawne wypłaty z bankomatu zapisane jako wydatek „Gotówka” – bez migracji i bez meldunku zamiany (AP-33): zamiana
  na przelew nie jest czysta – zmienia koszty, wynik „na plus” i łupy zamkniętych miesięcy (silnik przelicza historię),
  a konto Gotówka dostałoby całą dawną gotówkę, której wydatków dawny model nie wymagał wpisywać (fałszywe saldo). Zostają
  jak są; zmianę pojedynczej wypłaty robi edytor Operacji (rodzaj „Przelew własny” → Gotówka). Dawne podwójne liczenie
  (wypłata jako wydatek i zakup z Gotówki – saldo Gotówki ujemne, OP sp. 7) prostuje jedno potwierdzenie salda Gotówki
  (Ustawienia → Konta → „Potwierdź saldo” – korekta o różnicę) – do potwierdzenia, czy podpowiadać je meldunkiem.
- **T425** Eksport „Części” (AP-29, AF-35, D89 / T303 – wiersz operacji bez zmian): `export/budget.ts` `partRowsOf` – wiersz
  na każdą linię operacji okresu: część paragonu i wspólnego zakupu z własną kwotą, kategorią, „Finansuje” (domownik,
  „(prezent)”, część wpływu „od: …”), opisem i tagami (tagi operacji + linii); operacja bez linii – jeden wiersz; czego
  linie nie pokrywają (plik zmieniony ręcznie) – wiersz kategorii operacji jak `partsOf`, więc suma części = kwota
  operacji i tabela przestawna sumuje kategorie roku. „Nr operacji” = jej miejsce w „Operacjach” tego samego eksportu;
  „Część” jako „1 z 3” (nie „1/3” – Excel bierze to za datę). Raporty → Eksport: „Części – CSV” i arkusz „Części” w Excelu
  (między „Operacjami” a „Miesiącami”); Excel widocznej listy Operacji – też z arkuszem „Części” (strona przelewu na
  liście jednego konta jak wiersz główny). „Miesiące” – na końcu (kolumny przed nimi bez zmian) „Energia miesiąca (zł)”
  (`debriefing().energy.budget`, puste bez pensji) i „Sfinansowane przez domowników (zł)” (suma `financed`).
- **T426** Daty w Excelu (AP-29, RE sp. 3): rodzaje kolumn `date` / `month` / `time` w `export/xlsx.ts` – tekst
  `RRRR-MM-DD` / `RRRR-MM` / `GG:MM` zapisany jako liczba dnia Excela (system 1900) z formatem `yyyy-mm-dd` / `yyyy-mm` /
  `hh:mm` (wygląd jak w CSV, filtr dat i tabela przestawna je widzą); tekst, który datą nie jest, zostaje tekstem bez
  stylu daty. Dopiski (AF-57, AF-70): pasek Operacji – „poza sumami: przelewy własne (i korekty) ±X zł”
  (`operationsView.ts` `asideOfOperations`, kwoty jak w eksporcie – strona przelewu przy liście jednego konta), więc suma
  pliku = Wpływy − Wydatki + X; panel „Przychody” – przy miesiącu z dopłatą do XTB w 12 miesiącach dopisek, że okno liczy
  trading netto, ze średnią miesięcy jak w Bilansie paliwa (`income.ts` `monthsAverageOf`; bez dopłat – brak dopisku).
- **T427** Okres eksportu zapamiętany na tym komputerze (AP-29, RE sp. 1): `localStorage` `fi.reports.exportPeriod`
  (`{from, to, toToday}` – `exportPeriodOf` / `exportPeriodText`), jak filtry Operacji – wybór biurka, nie folderu (inny
  komputer eksportuje swój okres; format danych folderu bez zmian). Koniec okresu równy dniowi wyboru = „do dziś” – przy
  następnym eksporcie idzie z nowym dniem; inny koniec zostaje. Zły zapis – od początku roku do dziś.
- **T428** Procenty „Wspólnie” – jedna reguła (AP-37, AF-49, zmienia „edytor ostrzega” z T156): procenty ≠ 100 % nie są
  zapisywane nigdzie – szybki wpis, zmiana zbiorcza i import odmawiały, teraz edytor operacji też. Wpisany podział, który
  nie daje 100 %, czeka w pamięci okna (`useDraft` `operation-share:<id>` – inna operacja, inny ekran go nie gubią; plik
  operacji ma ostatni pełny podział), aż da 100 % albo „bez podziału” / „Wspólnie” od nowa. Edytor podziału
  (`ShareEditor`, wszystkie miejsca) mówi „razem X % – podział zapisze się dopiero przy 100 %” (`data-state="refused"`)
  i ma „dopełnij ostatniej do 100 %” (`share.ts` `fillLastPercent`: ostatnia osoba dostaje 100 − suma pozostałych, z
  groszami procentów; brak przycisku, gdy pozostali mają już ponad 100 %). Kwoty innych ponad całość – bez zmian (reszta
  0 zł): ich pełność zależy od kwoty operacji, która może się jeszcze zmienić.
- **T429** Podgląd zmiany zbiorczej – cały skutek (AP-38, AF-24, OP sp. 2, rozszerza T265): obok energii dziś, kopert
  bieżącego miesiąca, osłon i sald – cele (`effectOf` `goals`: pieniądze celu przed i po), miniony miesiąc, z którego
  operacje wychodzą albo do którego przychodzą, i każdy, którego łupy silnik kończy inaczej (`monthsEffectOf`: debriefing
  z dziennika silnika przed i po – łupy i „zostało” kopert, tylko miesiące zakończone; bieżący ma swoje linie kopert) oraz
  wypłaty i zwroty ICTTJ, które tracą parę w banku (`pairsLost`: dostawy jak panel Dokowanie – `deliveriesFor` teraz,
  `deliveriesOfLists` ze zmianą; para przed, brak operacji po). Silnik ze zmianą liczy pary niezadokowane z dostaw po
  zmianie (`pendingPairsOf`), nie z obecnych. Tylko odczyt wyników silnika – reguły pieniędzy bez zmian.
  Dopisek (przegląd N5 10): linia tracącej parę – nazwą z okna dokowania (N43, AP-23; `lostPairText` w `calc/effect.ts`):
  „Wypłata z ICTTJ z dd.mm.rrrr (X zł) straci parę w banku…” albo „Zwrot do masy w ICTTJ z …” (było „Wpływ do XTB z
  ICTTJ” – zwrot to wypływ do XTB).
- **T430** Konflikty i historia czytelne (AP-27, DA sp. 3, DA.22, DA.23, DA.28, DA.30): karta konfliktu nazywa wpis tym, co
  człowiek rozpoznaje (`conflicts.ts` `conflictSubject`) – operacja: kontrahent (inaczej tytuł, kategoria), data
  dd.mm.rrrr, kwota ze znakiem i konto; plan i Dowództwo – miesiąc słownie; kontener, cel, pożyczka – nazwa i kwota;
  saldo, boja, import, ustawienia – swoje; z oryginału, gdy nieczytelny – z kopii. Nazwa pliku z ULID tylko w dymku,
  przy stronie „zapisał komputer X”, czasy jak w aplikacji. Różnice (karta, „Scal…”, Historia, Dziennik zmian, okno zmian
  z drugiego komputera, odzyskanie): każde pole każdego schematu ma polską nazwę – `merge.ts` `LABELS`, a pole pod znanym
  przedrostkiem składa się z nazw kluczy (`partsAfter`: „Reguły importu – kwota najwyżej”, dzień mapy jako data); test
  przechodzi wszystkie ścieżki schematów zod i nie dopuszcza surowego klucza (klucz nowszej wersji zostaje, jak był).
  Wartości: wyliczenia słowami (`VALUE_LABELS`: rodzaj operacji, saldo, sposób podziału, kierunek, pula…), tak / nie,
  przecinek, daty i chwile po warszawsku, lista wartości jako wartości, obiekt jako jego pola po polsku – nigdy JSON;
  obiekt tylko po jednej stronie rozpisany na pola (`readableChanges`), identyfikator wpisu nigdy nie jest różnicą ani
  wyborem „Scal…” (scalona wersja ma id oryginału). Kwoty `awaitReturn`, `envelopeCovers`, usuniętych operacji importu –
  w złotych. Historia: odrzucona strona konfliktu to „wersja niezachowana” (zamiast „odrzucona przy scalaniu”, DA.27).
  Meldunki „podwójne korekty” mówią, że para liczy się tylko z dwóch komputerów (SA sp. 3). Tytuły wpisów z datą ISO
  (`recordTitle`) – AP-23 (N4). Dopisek (integracja 2 N5): daty i chwile w różnicach jak wszędzie w aplikacji
  (T403) – dzień `plDate`, chwila `plDateTime` (czas komputera; w Polsce – warszawski), liczby z minusem „−” i bez
  zaokrągleń, lista obiektów liczona `countLabel` („22 pozycje”).
- **T431** Konflikt rozstrzygany na wersjach, które okno pokazało (AP-27, AF-76, DA.28; rozszerza N17): „Scal…” trzyma
  wersje, na których je otwarto (`opened`) – kopia albo oryginał zmienione w trakcie nie wchodzą po cichu: wybory zostają
  na pokazanej treści, „Zapisz scalone” wyłączone, pasek „Kopia zmieniła się w trakcie scalania…” z „Scal od nowa”.
  Proces główny przed każdą decyzją konfliktu czyta oba pliki z dysku jeszcze raz (`freshConflict` – watcher mógł nie
  zdążyć): „Scal…” i „Zachowaj tę wersję” podają czasy plików, które okno pokazało, i strona zmieniona od tamtej chwili
  odmawia (`ConflictChangedError` z bieżącym stanem dla okna) – nic nie jest zapisane ani przeniesione do Kosza;
  „Zaakceptuj nowsze” (zbiorczo, bez wersji okna) też czyta pliki od nowa, więc odrzucona strona trafia do historii taka,
  jaka jest na dysku, nigdy tylko do Kosza. „Zmieniona” – po treści: okno porównuje rekord bez znaczników zapisu
  (`conflicts.ts` `changedSince` – zapis tego komputera tuż przed decyzją, `saveFirst`, który tylko odświeżył znaczniki,
  zmianą nie jest; decyzja idzie z czasami plików, które okno zna po tym zapisie), proces główny – po skrócie treści
  pliku przy czasie, który okno podało (okno za stanem procesu – odmowa). Odmowa jest w logu (strona i czasy).
  Dopisek (przegląd N5): każda decyzja idzie z wersją pokazaną – także „Zachowaj tę wersję” i zbiorcze „Zaakceptuj
  nowsze” (zmienia zdanie „bez wersji okna”). Okno zapamiętuje wersje z chwili kliknięcia (karta, lista kart), po
  `saveFirst` porównuje je po treści z tym, co zna teraz (`conflicts.ts` `seenFor`, `newestOnShown`): strona zmieniona
  w trakcie zapisu (watcher przyniósł nowszą kopię) – odmowa w oknie („Jedna z wersji zmieniła się w trakcie… wybierz od
  nowa”, `CONFLICT_CHANGED_TEXT`; karta pokazuje już nową wersję), inaczej decyzja z czasami po zapisie i odmowa procesu
  głównego jak dla „Scal…” (`resolveConflicts` z `asOf` każdej pozycji). Zbiorczo „nowsza” wybierana jest na wersjach
  pokazanych; grupa kopii jednego pliku ze zmienioną (albo zniknięta) pozycją zostaje cała dla użytkownika, odmowa
  w procesie głównym też zostawia resztę grupy („Pozostawione bez zmian…”); oryginał przepisany zachowaną kopią tej samej
  paczki liczy się z czasem po tym zapisie (`own`). Zmiana z zewnątrz z odmowy idzie do okna osobno, po zapisach paczki
  wysłanych jako zmiana tego komputera (`beforeRefusal`) – własny zapis nigdy nie przychodzi jako cudzy. Dopisek (przegląd 2
  N5): własny zapis okna przed decyzją (`saveFirst` – niezapisane zmiany oryginału, także `fi.json`) nie jest „nowszą
  kopią z OneDrive” – oryginał zmieniony z `updatedBy` tego komputera (`appInfo.machineName`) nie odmawia. Odmowa tylko
  po stronie, którą decyzja odda bez wiedzy użytkownika: kopia zmieniona – zawsze (kopii okno nie pisze); oryginał
  zmieniony z zewnątrz – tylko przy zachowaniu kopii (zastąpiłaby go); zachowanie oryginału zatrzymuje go, jaki jest.
  Zbiorczo: grupa z własnym zapisem oryginału wybiera najnowszą na zapisanym oryginale; z oryginałem zmienionym
  z zewnątrz zostaje dla użytkownika tylko, gdy najnowsza to kopia. „Scal…” bez zmian (wybory na obu pokazanych
  stronach). Wcześniej E2E `sync` (kopia `fi.json`) padał: okno zapisało `fi.json` w `saveFirst` i odmawiało samo sobie.
  Dopisek (przegląd 3 N5 – **zmienia** rozpoznanie i wybór zbiorczy z przeglądu 2): własny zapis rozpoznaje znak tego okna
  i tej decyzji, nie nazwa komputera – niezapisana wersja oryginału wzięta tuż przed `saveFirst` (`SyncPage`
  `unsavedOriginal`, `unsavedOf`) i oryginał po zapisie o tej treści (`sameContentAs`); ta sama nazwa komputera przy innej
  treści (OneDrive przywraca wcześniejszy plik tego komputera, dwa komputery o jednej nazwie) to zmiana z zewnątrz.
  „Zaakceptuj nowsze” zawsze według kart: zostaje wersja, którą karta oznaczyła „nowsza” – własny zapis oryginału nie
  odwraca wyboru. Gdy na karcie nowsza była kopia, a oryginał ma teraz zapisane przed chwilą zmiany użytkownika, grupa
  zostaje dla użytkownika (`newestOnShown` `mine`, komunikat „Nowsza na karcie była kopia, a oryginał ma Twoje zmiany…
  żadnej wersji nie odrzucono, wybierz ręcznie”); oryginał nowszy na karcie zostaje z tymi zmianami.
- **T432** Nowy komputer (AP-28, US.1, US.13, US.31, SW sp. 8): panele ustawień zapisanych w `config.json` mają jeden
  znak „tylko ten komputer” (`MachineOnly` – rozmiar, prywatność kwot, szybki wpis, powiadomienia, dźwięki, ICTTJ: folder
  i program, pliki z mBanku, bieżący i ostatnie foldery, zasobnik i start, aktualizacje, token). Pierwsze otwarcie
  istniejącego budżetu (wystartowanego) na komputerze bez żadnego folderu w `config.json` zostawia w `localStorage`
  (`fi.machineSetup`) prośbę: baner „Pierwsze otwarcie tego budżetu na tym komputerze…” z „Ustaw na tym komputerze” –
  lista ICTTJ, skrót, start z Windows (z przełącznikiem), powiadomienia, token, każde ze stanem i „Ustaw…” do swojego
  panelu; „Gotowe” albo × kończy, „Później” zostawia baner; pytanie o autostart nie pojawia się obok listy. Lista też
  w Ustawieniach → Folder i kopie („Ustaw na tym komputerze…”). Folder tylko do odczytu – baner na każdej zakładce
  Ustawień (na zakładkach komputera z dopiskiem, że ustawienia „tylko ten komputer” działają); pola budżetu wyłączone jak
  dotąd. Scenariusz ICTTJ spoza listy: „nie ma w ICTTJ” tylko przy ICTTJ przeczytanym, inaczej „ICTTJ nie jest czytany na
  tym komputerze” / „teraz niedostępny” (`missingForecastText`). Konto nowego wpisu (edytor i szybki wpis,
  `calc/quick.ts` `entryAccount`): wybór tego komputera, a komputer bez wyboru – konto najnowszego wpisu ręcznego
  w budżecie (bez operacji z banku), dopiero potem pierwsze konto. Format folderu bez zmian. Dopisek (integracja 2
  N5): jedna reguła z T441 (4) – `entryAccount` bierze najpierw konto ostatniego wpisu ręcznego w folderze
  (`lastAccountOf`, `typedByHand`; z kont otwartych – zamknięte pomija), potem wybór tego komputera, potem pierwsze
  konto; nowy komputer dostaje więc konto z folderu jak tu, a drugi komputer – konto ostatniego wpisu w budżecie, nie
  swój dawny wybór (AP-20: „ostatnie konto zapamiętane w folderze”, SW sp. 8).
- **T433** Start z Windows tylko z decyzji na tym komputerze (AP-28, incydent 03.11.2026 – `main/loginItem.ts`
  `loginItemWrites`, czyste reguły z testem): profil inny niż własny aplikacji (`FI_USER_DATA` – testy, laboratorium)
  nigdy nie pisze w kluczu Run; start aplikacji i późny odczyt `config.json` nigdy niczego nie usuwają – przy włączonym
  ustawieniu dopisują tylko brakujący (albo z innymi argumentami) wpis tego exe; wyłączenie tutaj (Ustawienia, kreator,
  baner, lista nowego komputera – `setTrayPrefs` z `launchAtLogin`) usuwa wyłącznie wpisy tego exe (`launchItems` Electrona
  są po ścieżce exe) – wpis o tej samej nazwie innej kopii zostaje; stare wpisy tego exe pod inną nazwą (B52) – tylko przy
  zmianie ustawienia, po zapisie własnego. macOS: zapis przy zmianie albo przy włączonym. Do sprawdzenia w maszynie: dwie
  kopie (zainstalowana i przenośna) dzielą `config.json`, a wpisy mają różne nazwy – wyłączenie w jednej nie usuwa wpisu
  drugiej. Dopisek (przegląd N5 – **zmienia zdanie** „start aplikacji i późny odczyt `config.json` nigdy niczego nie
  usuwają”): wpis w systemie odpowiada przełącznikowi. Zmiana przełącznika stosuje się do systemu i zasobnika od razu,
  przed zapisem `config.json` (`config.ts` `changeTray`) – zapis odrzucony (plik zajęty, ponawiany – T434) nie zostawia
  wpisu innego niż ustawienie; okno pokazuje ustawienie, które działa, z komunikatem „działają, a zapis ponawia się sam”
  (`store/tray.ts`, jak `setMachinePrefs`). Start aplikacji i późny odczyt przy ustawieniu wyłączonym usuwają wpis tego
  exe pod jego własną nazwą (tylko taki – `launchItems` po ścieżce exe; wpis innej kopii, także o tej samej nazwie, i
  druga wersja instalator / portable z inną nazwą zostają); stare wpisy pod inną nazwą (B52) dalej tylko przy zmianie.
  Zapis, który nie zdążył przed wyjściem, przepada jak każda zmiana `config.json` – następny start ustawia system według
  pliku, więc ekran i system się zgadzają. Dopisek (przegląd 2 N5 – **cofa** zdanie o usuwaniu przy starcie): start aplikacji
  i późny odczyt `config.json` znów nigdy niczego nie usuwają – „wyłączone” przy starcie bywa nie wyborem użytkownika,
  a ustawieniem domyślnym (`config.json` uszkodzony i odłożony, usunięty z AppData, nieczytelny), a usunięcie po nazwie
  to klasa incydentu 03.11. Wpis usuwa tylko przełącznik (Ustawienia, kreator, baner, lista nowego komputera), od razu,
  przed zapisem `config.json` (`changeTray`), więc odrzucony zapis nie zostawia wpisu za ustawieniem. Zostaje znana
  rozbieżność: wpis z wersji sprzed poprawki albo drugiej kopii przy „wyłączone” – usuwa go dopiero przełącznik
  (włącz i wyłącz) w tej kopii. Dopisek (przegląd 3 N5): przełącznik pokazuje stan prawdziwego wpisu tej kopii w systemie
  (`loginItem.ts` `loginEntryOf` – wpis tego exe, nie wyłączony w Menedżerze zadań; macOS – `openAtLogin`; `tray.ts`
  `loginEntry`, `trayView().loginEntry`), czytany przy każdym pokazaniu Ustawień → Zasobnik i listy nowego komputera
  (`refreshTrayPrefs`) i po każdej zmianie; inny niż `config.json` – stan systemu z notką („Windows uruchamia tę kopię…
  przełącznik pokazuje stan systemu; wyłącz, żeby usunąć wpis” albo odwrotnie), a przełączenie zapisuje wpis według
  wyboru. Profil testowy i wersja niespakowana – stan nieznany, przełącznik według `config.json`. Baner „Uruchamiać z
  Windows?” nie pyta komputera, który już startuje z Windows. Start dalej niczego nie usuwa. Dopisek (przegląd 4 N5): wpis
  wyłączony w Menedżerze zadań (`enabled: false` – `loginEntryDisabled`) – przełącznik „wyłączony”, a włączenie tutaj
  zapisuje wpis z `enabled: true` (zgoda na start w systemie, `setLoginItemSettings`); przy ustawieniu „tak” notka
  „Wpis startu tej kopii jest wyłączony w Menedżerze zadań – włącz go przełącznikiem tutaj albo tam”, gdyby system go nie
  włączył. Start aplikacji wyboru z Menedżera zadań nie zmienia.
- **T434** „Co nowego” bez sieci, kopie po zmianie folderu kopii, zapis `config.json` ponawiany (AP-28, AF-40, IN.26,
  DA.14, DA.11, US.33): okno ma wbudowane 15 najnowszych sekcji CHANGELOG (`electron.vite.config.mts` `__FI_CHANGELOG__`,
  `releaseNotes.ts` `notesOf`) – panel „Co nowego w wersji X” pokazuje się z nich, gdy notatek z GitHuba nie ma
  (aktualizacja spoza aplikacji, offline), po aktualizacji z wersji Y także wersje pośrednie (`justUpdated.from`).
  Zmiana folderu kopii zapamiętuje poprzedni dla tego folderu danych (`config.json` `backupDirsBefore`, addytywnie,
  najwyżej 8, `backupDirsAfter`): jego kopie zostają na liście pod nagłówkiem „Wcześniejszy folder kopii”, liczą się do
  „Ostatnia kopia” i dają się odzyskać (`listedBackup` czyta tylko kopie z folderów listy); powrót do folderu zdejmuje go
  z listy; nieudany zapis ustawienia cofa folder kopii. Tekst panelu mówi o 5 ostatnich kopiach ręcznych. Nieudany zapis
  `config.json` (plik zajęty) ponawia się sam co 5 s z najnowszym stanem, aż się uda (`ConfigStore.retryLater`) –
  komunikat w oknie to mówi. Dopisek (przegląd N5): ustawienia ważne dopiero po zapisie (`config.ts` `ONLY_ONCE_SAVED`:
  folder kopii i lista wcześniejszych, folder i program ICTTJ, token GitHub, sprawdzanie i pobieranie aktualizacji) przy
  odrzuconym zapisie wracają w pamięci do tego, co ma `config.json` (pole zmienione w trakcie zostaje przy nowszej
  wartości), z komunikatem „config.json jest zajęty… zmiana nie została zapamiętana. Spróbuj ponownie” (`ConfigNotSavedError`) –
  ponowiony zapis nie przywraca ich po restarcie, a ekran (folder kopii w magazynie, odczyt ICTTJ, panel tokenu,
  przełączniki aktualizacji) zostaje przy zapamiętanych. Reszta działa od razu i zapisuje się później: zasobnik i start
  z Windows (T433), preferencje komputera, okno, folder danych i plików z mBanku, pobrana aktualizacja (gotowa do
  instalacji, a nie „nie udało się pobrać”, gdy tylko `config.json` odmówił). Zmiany z chwili nieczytelnego `config.json` (`held`, B114) zostają, aż zapis je
  weźmie: odczyt, po którym zapis jest odrzucony, kończy się (ustawienia działają, odczyt nie jest ponawiany), zmiany
  idą do ponawianego zapisu, a kolejny odczyt nakłada je na plik jeszcze raz (także zmiany zrobione po odczycie, do
  udanego zapisu) – wcześniej odczyt je zdejmował i przepadały z nieudanym zapisem. Dopisek (przegląd 2 N5): pamięć
  zawsze = to, co ustawiono w tej sesji – każdy odczyt (także nieudany co 15 s, plik usunięty albo uszkodzony i odłożony)
  nakłada zmiany `held` na swoją podstawę (plik albo domyślne), a plik usunięty albo odłożony dostaje je od razu; zasobnik,
  ICTTJ, folder kopii i pobrana aktualizacja nie wracają do domyślnych. „Nie została zapamiętana” tylko wtedy, gdy
  `config.json` naprawdę nie ma nowej wartości: zmiana zabrana przez wcześniejszy zapis z kolejki (każdy pisze najnowszy
  stan) jest zapisana – bez komunikatu i bez cofania (`ConfigStore.update` porównuje z `saved`, stanem pliku).
  Dopisek (przegląd 3 N5): zmiana czekająca na liście folderów (`recentDirs`, `backupDirsBefore`) jest zmianą elementów –
  dopisane na początek i usunięte (`config.ts` `listChange`, `applyHeld`) – nakładaną na listę z pliku z jej granicą
  (8), nigdy całą listą zbudowaną na domyślnych (folder otwarty przy nieczytelnym pliku zostawiał z 8 ostatnich folderów
  tylko siebie, a wcześniejsze foldery kopii znikały).
- **T435** Wpis ICTTJ z pierwszych dni budżetu (1.15.9, N5 – AP-26, AF-47 = C15, DO sp. 2; D72, T63; **zmienia zdanie T162**
  „bez Portfela XTB dla okna zaczętego przed startem”): „sprzed startu” tylko wpis z datą przed startem (`deliveries`:
  `!counted(e.date)`); wpis od startu, którego okno pary (−3 dni) zaczyna się przed startem, czeka na import jak każdy
  („czeka na import”, na liście do zadokowania – okno dokowania pozwala zadokować na Portfelu XTB od razu). Po oknie
  (plik banku sięga dalej) „Portfel XTB?” tylko, gdy historia banku kont z XTB sięga pierwszego dnia okna
  (`DeliveriesInput.bankFrom` – najpóźniejszy z pierwszych wierszy z banku tych kont, `dock/state.ts` `coveredOf`) –
  para sprzed startu byłaby w niej i dała „sprzed startu”; bez tej historii dostawa zostaje „czeka na import” z
  `unseen` i tekstem „bez pary w mBanku – zadokuj na Portfelu XTB albo pomiń wpis, jeśli pieniądze wpłynęły przed
  startem budżetu” (wybór użytkownika – bez ryzyka podwójnego liczenia saldem otwarcia). Para silnika bez zmian
  (`pendingPairsFor` – tylko wpisy z operacją).
- **T436** „Czeka na import do …” tylko z datą w przyszłości (1.15.9, N5 – AP-26, DO sp. 3): dostawa po oknie, gdy plik
  banku kończy się w oknie (`coveredTo ≤ until`), ma `Delivery.fileTo` (koniec pliku); okno dokowania mówi „ostatni plik
  z mBanku kończy się dd.mm.rrrr – zaimportuj nowszy” (`waitingText`), odprawa „czeka na nowszy plik z mBanku (ostatni
  kończy się dd.mm)”; w oknie – jak dotąd „FI czeka na import do” dnia końca okna.
- **T437** Dokowanie na ekranach (1.15.9, N5 – AP-26: DO sp. 5, 7, 13, MO.7, PR sp. 2; DM sp. 9 – **zmienia część T342**
  „ostatnia dostawa (data, do zadokowania)”): (1) „ostatnia dostawa – dokąd poszła?” dopiero po dokowaniu – ostatni
  wpływ `trading` z rekordem dokowania (`deliveryWhy(log, …, docked)`; para liczona według puli wpisu i wpływ XTB bez
  dokowania to „Do zadokowania” w Stanie okrętu); dostawa to wypłata z XTB (słowniczek) – wpłata domownika nią nie jest
  (DM sp. 9 bez zmian); (2) jedna data dostawy – dzień pieniędzy w banku (`deliveryDay`: operacja, bez niej wpis): wiersz
  panelu Dokowanie (dzień wpisu w dymku), odprawa i Meldunki; okno dokowania pisze „wpis z dd.mm.rrrr” przy innym dniu
  banku; (3) zadokowane dostawy zostają na liście przy wyłączonym ICTTJ albo nieodczytanym wpisie (`fromDocking` –
  wpis z rekordu dokowania: pula, `entryDate`, kwota operacji; wpis usunięty w ICTTJ – jak dotąd do ponownego
  dokowania); (4) toast: „Zapisz podział” zadokowanej – „Zmieniono podział dostawy X zł.”, nowe dokowanie – „Zadokowano
  X zł”, zawsze kwota operacji (banku przy innej kwocie – B22), także „Wycofano dokowanie” (`dockedText`); (5) ostrzeżenia
  folderu ICTTJ: wpis z nieznaną pulą osobno („Wpisy ICTTJ z nieznaną pulą (N) – FI je czyta”, nie „Pominięte pliki”),
  wpis w dwóch plikach – plik pominięty z plikiem, który FI bierze. Po scaleniu z N2 (integracja 2 N5): (1) obejmuje
  też część T342 z przeglądu 2 N2 – para wpisana na Portfelu XTB (B69) z częścią domownika i częścią spłaty pożyczki
  czeka w „Do zadokowania” (wpływ bez tych części), nie w „ostatniej dostawie”; po „Zadokuj” staje się wypłatą XTB
  (`asPayout`) i jest ostatnią dostawą według swojej puli.
- **T438** Firewall – słowo i potwierdzenie (1.15.9, N5 – AP-26, DO sp. 6, 12; spec „Zasięg i firewall” – „czerwony alarm,
  potwierdzenie i poważne naruszenie”, wnioski sekcja 5 – D99 pkt 9): (1) „firewall” w odprawie, Meldunkach
  i powiadomieniu o zwrocie do masy tylko, gdy silnik liczy go wbrew rozkazowi (`againstFirewall` – alarm `firewall`
  operacji dostawy); zwrot bez operacji w banku – bez werdyktu („do potwierdzenia.”); (2) dopłata do XTB wykryta tylko
  z banku (alarm firewalla, bez wpisu ICTTJ w dostawach do zadokowania, czekających i zadokowanych) – meldunek „Firewall”
  „Dopłata do XTB X zł z dd.mm wbrew rozkazowi firewall … – potwierdź” z „Pokaż” i „Potwierdź” (`topUpsToConfirm`, 30 dni
  – `TOPUP_CONFIRM_DAYS`); potwierdzenie = rekord dokowania operacji bez wpisu i puli (`derivedId(tx, topup:…)` – dwa
  komputery piszą jeden plik; „Cofnij”) – pieniędzy, alarmu ani naruszenia w grze nie zmienia. Dopłata z wpisem ICTTJ
  potwierdza się jak dotąd w oknie dokowania. Telefon meldunku nie pokazuje (dokowanie tylko na komputerze). Bez zmian
  formatu (rekord dokowania jak dotąd).
  Dopisek (przegląd N5 5 – silnik pieniędzy): potwierdzenie zapisuje `countedFrom` = utworzenie operacji
  (`topUpConfirmation`, `calc/inbox.ts` – jak dokowanie pary liczonej według puli, T363), więc chwila operacji w silniku
  (`cameIn`) zostaje jej własna: przeniesienie środków celu (T340) i „Dopełnij kadłub z osłon” (T373) z jej dnia,
  zrobione między importem a kliknięciem, liczą się po dopłacie jak przed potwierdzeniem – warstwy, alarm firewalla,
  `drawShields` i dzień gry bez zmian. Wcześniej rekord bez pola liczył się od kliknięcia (T128): dopłata 9:00,
  przeniesienie celu do osłon 12:00, potwierdzenie 20:00 – przeniesienie przed dopłatą, osłony przy niej wyżej, alarm
  i naruszenie znikały (z dopełnieniem kadłuba – inne kadłub i osłony). Testy: scenariusz recenzji w oknie
  (`n5-review1-fixb-store.test.ts`) i własność na 300 losowych dniach – stan silnika z potwierdzeniem i bez niego
  identyczny (`n5-review1-fixb.test.ts`). Pole addytywne jak w T363; potwierdzeń sprzed poprawki w danych nie ma (1.15.9
  niewydana).
- **T439** Domownicy w grze, dzienniku i listach (1.15.9, N5 – AP-19: AF-22, AF-23, AF-58, OP sp. 1, SW sp. 3, SW.12,
  SW sp. 9, DM sp. 6, 7; R-17 – D99 pkt 9; D80 b, D91 bez zmian): (1) „plan czy impuls?” od mojej części zakupu bez
  tego, co z definicji zaplanowane: `impulseAmount` – linie własne (nie domownika, finansowane ani prezent), bez
  płatności ładowni (kontener: czynsz, rata) i kategorii systemowej „Gotówka” (bankomat); `asksImpulse` liczy z tego
  wszędzie – „?” na liście, edytor, Wywiad, Raporty, szybki wpis (części wspólnego zakupu i paragonu); zakup z celu nadal
  pyta; (2) dziennik kapitański (Wywiad, Raport wachty) – kwota własna (`ownSpent`; przykład audytu: plan 1 060,98 zł
  z częścią domownika 300 zł = 760,98 zł), oznaczony zakup samego domownika się nie liczy (jak w grze); (3) notka ciszy
  nocnej przy zakupie domownika – „to nie Twój wydatek, w grze bez naruszenia” (`nightVerdict`, jak `game.ts`);
  (4) domownik „pytaj” bez wartości domyślnej: szybki wpis nie zaznacza „przychód / zaliczka”, podgląd pyta, zapis
  odmawia przy reszcie ponad dług („Wybierz, czym jest reszta X ponad to, co … ma oddać”; `restToChoose`; reszta po
  częściach innych osób i części spłaty pożyczki – D100, `senderOwn`, integracja 2 N5); edytor Operacji
  (zapis od razu) – bez zaznaczenia i z dopiskiem „pytaj: wybierz (do wyboru liczona jako przychód)”; pierwszy wybór
  zapamiętany jak dotąd; (5) „Pokaż zakupy” przy „X: do oddania” (Meldunki) i linia odprawy – zakupy tej osoby do
  oddania z całej historii (`refundablesFilter`: osoba + „do oddania” / „częściowo oddane”); „wydatki domowników ›” –
  wszystkie jak dotąd; (6) saldo na start rozliczeń nigdy jako „1 zakup” (`openText`): Meldunki „wskaż, co spłaca
  (do oddania: saldo na start rozliczeń)”, przy długu wyrównanym „zwrot … wyrównał dług – wskaż, co spłaca: …”; Radar
  „rozliczony” zamiast „bez długu”, lista „do oddania: …” / „czeka na przypisanie zwrotu: …”; odprawa „zwrot czeka na
  przypisanie (Meldunki)” – reguła księgi (D91 a) bez zmian; (7) dopisek „zmieni przychód zamkniętego miesiąca” przy
  każdej wpłacie z miesiąca przed bieżącym (`waitingForPurchase(…, month)`, dotąd – tylko sprzed miesiąca zakupu),
  miesiąc słownie; (8) szybki wpis „Za domownika” bez wybranej osoby – „wybierz, kto finansuje zakup”, nie imię i
  zaliczka pierwszej osoby; (9) zwrot towaru w edytorze – „Czyj zakup: zakup: X” zamiast „Zwrot dla: finansuje: X”.
- **T440** Szybki wpis – mniej klawiszy (1.15.9, N5 – AP-20, SW.36, SW sp. 5, 6): „Plan czy impuls” klawiszem z każdego
  pola okna – Alt+P plan, Alt+I impuls (sam Alt: AltGr = Ctrl+Alt pisze polskie litery; `e.code`, więc niezależnie od
  układu); sekcja dziennika zostaje na swoim miejscu, przy pytaniu podpowiedź „Alt+P / Alt+I”. Typowy wpis „Orlen 250
  z planem” to 11 klawiszy zamiast 21 (licznik w `tests/e2e/ap20.spec.ts`, ≤ 12). Klawisz wciśnięty, zanim kwota dobiła
  do progu, nic nie zapisuje: okno wysyła `impulse` tylko, gdy dziennik pyta (`asks`) – także gdy kwotę potem obniżono.
  Tagi z „#” w nazwie i notatce widać przed zapisem jako przygaszone chipy obok pola tagów (`quick-tag-hash`; tag już
  w polu nie powtarza się); chip pola tagów ma wyraźne „×” w osobnym polu za linią (ikona zamknięcia, dymek „Usuń tag
  #…”). Przy okazji: `tagsLost` liczył tag z literą „s” jako nowy (`/s+/` zamiast `/\s+/`) – poprawione.
- **T441** Kontrahenci, ostatnie konto i dziennik (1.15.9, N5 – AP-20, SW sp. 7, 8, 11, OP sp. 10, WY.13): (1) nazwa
  operacji na liście, w Namierzonych celach i w dzienniku Wywiadu – `operationName`: kontrahent, a bez niego tytuł; tytuł
  z banku bez dopisków banku (`cleanBankName` z miastem: „BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI: …” →
  „BANKOMAT EURONET 0412”), tytuł wpisany ręcznie bez zmian; dane i klucze bez zmian. (2) Same wielkie litery banku
  jak pisze człowiek (`readableName`: „KEBAB ROMA” → „Kebab Roma”, „APTEKA DBAM O ZDROWIE” → „Apteka Dbam o Zdrowie”,
  krótkie słowo bez samogłoski i słowo z cyfrą zostają – KFC, Z1234) – tylko w podpowiedziach szybkiego wpisu i
  w Namierzonych celach; lista Operacji i edytor pokazują nazwę banku tak, jak przyszła (szukanie, „Zapamiętaj”).
  Nazwa marki: sieć ze słownika, inaczej ostatnia wpisana ręcznie, inaczej ostatnia z banku. (3) Aliasy: „połącz
  nazwy…” w Namierzonych celach – „[nazwa] to ten sam sprzedawca co [nazwa]” robi to samo co „Połącz nazwy” importu
  (`mergeNames`, D78: jedna marka w Wywiadzie, Operacjach, u oficera i w kolejnych importach), toast z „Cofnij”,
  rozłączenie jak dotąd w Ustawieniach → Import z banku. Bez łączenia samoczynnego („Mokka” w „KAWIARNIA MOKKA”) –
  zgadywanie łączyłoby różne sklepy. (4) Ostatnie konto „w folderze” bez nowego pola: konto operacji wpisanej ręcznie
  najpóźniej (`createdAt`, z każdego komputera folderu; import i pusty szkic się nie liczą – `lastAccountOf`), potem
  zapamiętane na tym komputerze, potem pierwsze; to samo dla Ctrl+N. Nie w `fi.json`: zapis przy każdym wpisie to
  scalanie `fi.json` między komputerami bez potrzeby, a rekordy już to wiedzą. Dopisek (integracja N5): „wpisana
  ręcznie” to `typedByHand` – rekord nie ma znaku pochodzenia, więc operacje zapisane przez samą aplikację rozpoznają
  rodzaj i znane pola: z banku (`bank`); rodzaj inny niż wydatek i wpływ (korekta potwierdzenia salda, operacja Portfela
  XTB z dokowania, przelew – „Zaplanuj przelew własny”, pożyczka, PIT-38); płatność kontenera (`containerId` –
  „Zapłacone” w Ładowni, rata pożyczki); zwrot gotówką domownika (tytuł „Zwrot gotówką: …”, `CASH_REPAY_TITLE`);
  „Wykonaj teraz” boi (operacje z `done` boi); pusty szkic. Kreator, reguły i import nie zakładają operacji bez `bank`.
  Wydatek wpisany w edytorze i powiązany z kontenerem też się nie liczy – rzadki, a pomyłka w drugą stronę (konto
  z dokowania) gorsza; nowego pola pochodzenia nie ma – stare rekordy i tak by go nie miały. (5) Wywiad → Dziennik
  kapitański: „Wpisy dziennika” – treść wpisów okresu (12 najnowszych, data, kontrahent, plan / impuls, kwota; klik
  otwiera operację; `logEntries`). Dopisek (integracja N5): kwota to część własna (`ownSpent`), jak w licznikach
  dziennika (R-17, T439); zakup bez części własnej (samego domownika) nie trafia na listę.
- **T442** Fokus w oknach i palecie (1.15.9, N5 – AP-34, IN.28, AF-74, IN sp. 2): `components/trap.ts` (`useFocusTrap`)
  w `Modal`, palecie komend i ściądze F1 (teraz `role="dialog"`): po otwarciu fokus wchodzi do okna (ramka okna z
  `tabIndex=-1`, żeby Enter niczego nie kliknął; pole z `autoFocus` – palety – zostaje), Tab i Shift+Tab krążą po
  elementach okna, fokus wypchnięty pod nakładkę wraca do okna; tylko wierzchnie okno trzyma fokus (stos jak Esc w
  `Modal`). Po zamknięciu fokus wraca na element sprzed otwarcia (czytany przy pierwszym renderze), chyba że działanie
  okna samo go gdzieś postawiło.
- **T443** Operacje – Ctrl+N, okres i kolejność pól (1.15.9, N5 – AP-34, IN.3, IN sp. 3, 4, OP sp. 8, 9, AF-56; zmienia
  B77 w części „bez filtrów”): (1) Ctrl+N nie czyści wyszukiwania; nowa operacja zostaje na liście także po zapisie
  (`keptId`), dopóki filtr się nie zmieni; pozostałe filtry zdejmowane jak dotąd (widok, B88), okres – miesiąc nowej
  operacji jak dotąd. (2) Okres listy pamięta ten komputer, gdy to „cała historia” albo „od – do”; wybrany miesiąc nie
  (lista startuje na bieżącym, B81 – miesiąc to „gdzie patrzę teraz”). (3) „Mój filtr” wraca też do swojego okresu
  (zapamiętanego albo bieżącego miesiąca), nie zostaje przy okresie widoku z Meldunków / Mostka. (4) Edytor wydatku:
  Kwota → Kontrahent → Kategoria, potem Data i godzina, Konto, Tytuł – od kwoty do kategorii dwa Taby (szkic), trzy
  z „wszystkie”; dawniej siedem. Inne rodzaje bez zmian kolejności.
- **T444** Import i pary przelewów (1.15.9, N5 – AP-34, IM.8, IM.19, IM sp. 5, 9, ME sp. 2, AF-59, AF-61): (1) w wierszu
  grupy pierwsza opcja kategorii to „(jak grupa: X)” (albo „(jak grupa)”), wybrana, dopóki wiersz nie ma własnej
  decyzji – jej wybór oddaje wiersz grupie; „— bez kategorii —” to zawsze brak kategorii (B98). (2) Opłata banku (rodzaj
  operacji `fee`) nigdy w temacie podpowiedzi mBanku – zawsze „Opłaty banku” bez kategorii, także gdy plik podaje
  kategorię („Opłaty i odsetki”). (3) Temat podpowiedzi to jedna kategoria banku (klucz tematu z kategorią banku):
  „Edukacja” i „Opłaty i odsetki”, choć dają tę samą kategorię, to dwa tematy – „Przyjmij podpowiedzi” nie łączy
  tego, co bank rozróżnia. (4) Szukanie importu także po rodzaju operacji – jak go pisze bank i po nazwie (bank odmienia:
  „WYPŁATA W BANKOMACIE” nie zawiera „bankomat”; `kindWords`: bankomat, karta, przelew, opłata / prowizja).
  (5) Okno par przelewów sprzed 1.7.0: para, której żadna strona nie wskazuje konta (po samej kwocie i dniu), jest
  niezaznaczona (`pairTickedFirst`) – zaznacza ją użytkownik; „zaznacz wszystkie” jak dotąd. (6) ME.8: ten sam wiersz
  banku zapisany w dwóch operacjach (ten sam klucz albo klucz drugiego formatu z `altKeys`) to duplikat do scalenia,
  nie sygnał „Dwa obciążenia z banku” – meldunki już sobie nie przeczą.
- **T445** Kreator – podział i pierwszy miesiąc (1.15.9, N5 – AP-25, AF-10, KR.12, KR.23, R-4, KR.14, KR sp. 3, 5, 6):
  krok 6 dzieli środki na początek dnia startu (`startMoney` w `calc/start.ts`: saldo wpisane „teraz” minus dzisiejsze
  operacje – `openingFromNow`, ta sama reguła co zapis „Uruchom budżet”; puste pole konta z saldem otwarcia – saldo
  otwarcia i operacje do wczoraj), napis „Środki na początek dnia startu”. Pod podziałem wiersze „W dniu startu”
  (`startEffect` – kolejność silnika: podział, pierwsza pensja z osłon, brak z kadłuba – `paySalary`, potem zaliczki
  domowników do depozytu jak `drawShields`): „Pierwsza pensja do energii” (pensja miesiąca minus wydane przed startem –
  T45), „Depozyt domowników”, „Osłony po starcie (na Mostku)” – na czerwono i z ostrzeżeniem poniżej minimum z rozkazów
  (`shieldsMinimum` = jak alarm silnika), pensja z kadłuba – żółte, częściowa – czerwone. Propozycje kopert dopasowane do
  pensji (`fitEnvelopes`): gdy średnie 3 mies. (T47) przekraczają to, co pensja zostawia po ładowni, odkładkach i
  kopertach wpisanych ręcznie, każda propozycja maleje proporcjonalnie, w dół do pełnych 10 zł (reszta zostaje
  niezaplanowana – łupy); propozycja pensji (D70) bez zmian, kopert wpisanych ręcznie nie zmienia, z informacją pod
  listą. Bez kopert codziennych – ostrzeżenie w kroku 4 („Energia dziś” 0,00 zł od startu) z kwotą do rozdzielenia; bez
  historii nagłówek „bez historii: wpisz je sam” zamiast „średnie z 0 pełnych mies.”. Ślady przerwanego kreatora (AP-22
  bez zmian) uzupełnione o folder ICTTJ wybrany w kroku 5 (cele jego prognozy w folderze) i import zrobiony w trakcie
  (`noteImportTrace` po nowej paczce importu) – z „Cofnij import” w treści pytania.
  Dopisek (przegląd N5 9, 11): informacja „propozycje zmniejszone” tylko, gdy coś zaproponowano (`fitEnvelopes`: bez
  propozycji `fitted` false także wtedy, gdy pensja nic nie zostawia – było „Średnie wydatki (0,00 zł) są wyższe…”).
  „Osłony po starcie” poniżej minimum z rozkazów – kwota kolorem akcentu (`data-state="below-min"`, jak w kursie)
  z ostrzeżeniem pod spodem; na czerwono tylko kwota poniżej zera – zieleń i czerwień tylko dla kwot na plus i minus
  (zmienia „na czerwono i z ostrzeżeniem poniżej minimum”).
- **T446** Start budżetu w całości albo wcale (1.15.9, N5 – KR.29 / AF-14, część „zapis częściowy”; rozszerza T51;
  przeglądy 3 i 4 N5 – najpierw `fi.json`, zastępuje wycofanie startu z przeglądów 1 i 2):
  `finishWizard` najpierw zapisuje wszystko, co czekało (`saveFirst` – członek, cel, inna zmiana; folder, który tego nie
  przyjmuje, nie dostaje niczego ze startu), potem buduje rekordy startu i sprawdza każdy schematem – salda otwarcia
  (zastane saldo otwarcia z nową kwotą i dniem), plan miesiąca, kontener każdej wybranej propozycji (kontener odbiorcy już
  jest – ten; nowy z id nadanym przed zapisem, więc `fi.json` trzyma jego zbiornik). Rekord odrzucony: start odmawia
  („nie da się zapisać rekordu startu: kontener „…” (pole …)”), nic nie zapisane. Dalej **`fi.json` z `budget.start`**
  i resztą ustawień startu jako następny zapis `fi.json` (`writeStart`, `store/data.ts`) z odpowiedzią folderu – do 15 s,
  dłużej z toastem „Folder zapisuje wolno – start czeka…” i czekaniem dalej. Decyzja o zmianie `fi.json` z drugiego
  komputera czeka – start odmawia z komunikatem (okno decyzji otwarte), nigdy nie zapisuje na wersji niewidzianej. Okno
  dostaje start dopiero po odpowiedzi folderu, od razu razem z rekordami startu; zmiana `fi.json` z main z własnego zapisu
  w trakcie startu do okna nie wchodzi (ta sama treść – bez drugiego zapisu). Od kliknięcia do rekordów startu zapisy
  w tle są wstrzymane. Odmowa: w oknie i w folderze nie zmienia się nic – nie ma czego wycofywać; odpowiedzi zostają (także
  szkic na tym komputerze), toast „Budżet nie wystartował – … Nic ze startu nie trafiło do folderu – …”, ponowne „Uruchom
  budżet” zaczyna od nowa (bez drugiego kontenera). Przyjęty: rekordy startu zwykłym zapisem aplikacji (zapis odrzucony –
  toast „Budżet uruchomiony – część zmian nie zapisała się jeszcze w folderze (…)”, autozapis ponawia sam); kontener
  dopasowany do odbiorcy po odpowiedzi folderu – kontener odbiorcy dodany w czasie czekania jest tym kontenerem (zbiornik
  przechodzi na niego, jedyny przypadek drugiego zapisu `fi.json`), płatności połączone (T379). Zmiana `fi.json` w oknie
  w trakcie zapisu (edycja, wersja z drugiego komputera) zostaje – start nałożony na nią, zapisany razem z nią. Inny folder
  pokazany w trakcie zapisu: „Budżet wystartował w poprzednim folderze (ustawienia zapisane), ale … dopisze baner
  „Dokończ” po ponownym otwarciu tamtego folderu”. „Przerwij kreator” jak w N4: odpowiedzi przepadają, ślady (domownicy,
  cele, folder ICTTJ, import) zostają i są wymienione – przed przyjętym `fi.json` nic ze startu nie jest zapisane.
  Przycisk „Uruchom budżet” podaje obok tylko to, czego brakuje (`finishBlockers` – nazwy kont bez salda, pensja, podział
  ponad środki), w folderze tylko do odczytu – powód folderu, a gdy zapisy teraz padają – że start poczeka. Wykrywanie
  i zdejmowanie atrybutu „tylko do odczytu” z plików – czeka na decyzję użytkownika (bez zmian).
  Start niedokończony (przegląd 4 N5): rekordy startu są zapisane na tym komputerze (pamięć okna, klucz `fi.start.left:`
  z folderem – jak szkic kreatora) od przed wysłaniem `fi.json` do chwili, gdy każdy jest w folderze; do tego czasu żaden
  zapis w tle nie rusza (gra – start i zamrażanie dni, cele ICTTJ, start rozliczeń). Okno zamknięte „bez zapisu” po pytaniu
  o niezapisane, awaria albo inny folder w trakcie: po ponownym otwarciu folderu z tym `budget.start` baner „Start budżetu
  niedokończony – w folderze brakuje: … Do ich zapisu gra, cele ICTTJ i rozliczenia czekają.” z „Dokończ” – zapisuje tylko
  rekordy, których w folderze nie ma (po id; rekord zastany, który folder ma w starej wersji – saldo otwarcia albo plan
  sprzed kreatora – zostaje, jak jest), kontenerowi dopasowuje odbiorcę jak start i łączy jego niepołączone płatności; w tym
  samym oknie, gdy zapis rekordu startu padł, ten sam baner z powodem („Dokończ” ponawia zapis). Rekord startu, który
  folder ma w swojej wersji – czeka decyzja o zmianie z drugiego komputera, zapisała go nowsza wersja (B67) – nie
  wstrzymuje dłużej zapisów w tle, z komunikatem „folder ma już swoją wersję części rekordów startu (…)”; rekord usunięty
  przez użytkownika nie wraca. Zapisane – pamięć znika. `fi.json` bez `budget.start` (start nigdy nie dotarł) – pamięć
  znika przy otwarciu folderu. Pamięć jest tego komputera: drugi komputer, który zobaczy `fi.json` przed saldami, dostaje je
  chwilę później przez OneDrive jak każdą zmianę i do tego czasu liczy budżet bez nich tylko na ekranie – zapisy w tle robi
  tylko komputer „w użyciu” (D86), pierwsze zamrożenie dni czeka po otwarciu folderu i po każdej zmianie z drugiego
  komputera (B33, T199), a pierwszy dzień gry to dzień po starcie, zamrażany najwcześniej dwa dni później. Zapis wszystkiego
  (zamknięcie okna, zmiana folderu, Ctrl+S) czeka na zapis `fi.json` startu w drodze i zapisuje rekordy, które przyszły
  z jego odpowiedzią. Rekordy startu (pamięć i czekanie) to zmiany z `apply` – klucze zapisów przed nim i po nim, bez
  haka w zapisach; kolejka `fi.json` w `writeStart` własna, bo zwraca odpowiedź startu (`enqueue` zapisuje stan okna).
  Zastąpione (przeglądy N5 1–3): rekordy startu przed `fi.json` i ich wycofanie przy odmowie (`refusedStart`,
  `withdrawStart`, `WizardState.startWrites` / `startContainers` w szkicu, znacznik salda `byStart` w `budgetStartOf`,
  banerze N23 i wyroczni, usunięcie warunkowe `deleteRecords(…, expected)` z `contentMark` i `ChangedSinceError` w procesie
  głównym), a także cofanie `fi.json` w oknie po odmowie (`takeBackSettings`). Każda runda przeglądu znajdowała w wycofaniu
  nowe przypadki – odczyt z pamięci zamiast pliku, błąd `stat` jako brak pliku, starsza wersja ignorująca `byStart`, ponowny
  zapis nieaktualnej wersji po odmowie, salda `byStart` w warstwach, błąd przypisany innemu rekordowi. Odwrócona kolejność
  zamyka tę klasę: przy odmowie nie ma czego wycofywać, a stan pośredni (`budget.start` przed saldami) niczego nie zapisuje
  w tle i daje się dokończyć. Pole `byStart` nie zostało wydane – usunięte ze schematu bez śladu (bez `SCHEMA_VERSION`).
  Rozważone i odrzucone: `fi.json` najpierw w oknie i zapis `writeNow` (okno liczyłoby budżet bez sald przez czas zapisu,
  a odmowa wymagała cofania); znacznik „start w toku” w folderze (pole schematu, widoczne dla starszych wersji) – pamięć na
  tym komputerze wystarcza, bo dokończyć może tylko komputer, który start zaczął; zapis wielu plików naraz w jednym kroku –
  folder (OneDrive) tego nie ma.
- **T447** Propozycje z historii i pierwsze dni (1.15.9, N5 – AP-25, AF-13, KR.19, KR sp. 9, ME sp. 3, AF-53; rozszerza
  T286): rachunek o zmiennej kwocie także co 2 miesiące (`VARIABLE_MID_CYCLES`) – co najmniej 3 ostatnie płatności w
  odstępie cyklu (±12 dni), kwoty ±60% mediany, w swoim dniu miesiąca (±6 dni), kwota = 75. percentyl roku w górę do
  złotych, `variable`; co 3 i 6 miesięcy – dalej tylko stała kwota. Harmonogram nie powstaje z miesięcy jeden po drugim
  (`cyclicRun` – także przez nowy rok: subskrypcja płacona co miesiąc i anulowana to nie opłata „w miesiącach”; opłata
  sezonowa w ciągłych miesiącach – do dodania ręcznie). Nowe cele prognozy ICTTJ dostają priorytety według terminów
  (najbliższy miesiąc pierwszy, bez terminu na końcu, przy równych – kolejność scenariusza); istniejące cele bez zmian.
  Meldunki budżetu (bez kategorii, salda, duplikaty, przelewy…) dopiero od startu kreatora (`inboxStarted`:
  `budget.start`), przed nim tylko sprawy folderu – także przy saldzie otwarcia z dawną historią. „Nowe dane gdzie
  indziej” na folderze z innymi plikami nie zakłada podfolderu bez słowa: komunikat i „Utwórz podfolder FinancialIntel”
  (jak „Otwórz istniejące”); podfolder z danymi FI otwiera się jak dotąd.
- **T448** Raporty i plan na przełomie (1.15.9, N5 – AP-24, AF-68, RY sp. 2, 3, 6, PM sp. 3, 4, 5, 10, 12): jeden
  „bieżący” tydzień raportu wachty – tydzień należny (`defaultWatchMonday`, od niedzieli 18:00 bieżący, wcześniej
  poprzedni pełny); „później ›” nie przechodzi za niego (tydzień w toku nie jest raportowany), „Koperty na następny
  tydzień” tylko przy nim. Raport wachty pokazuje pokrycia przekroczonych kopert z dni tygodnia (`weekCovers`, dzień
  warszawski chwili pokrycia, tekst jak w dzienniku Dowództwa). Debriefing miesiąca w toku (Raporty): „Bilans paliwa –
  miesiąc trwa – wynik po jego końcu”, bez stopy oszczędności. Łupy zmienione po decyzji (późny import) – jedna reguła
  `lootChange` w Planie miesiąca i w Raportach → Debriefing („było / jest”, podział przeliczony). Plan miesiąca bieżącego
  i przyszłego: debriefing podpisany „(ostatni zamknięty miesiąc)” z notką, że pokazany miesiąc trwa albo się nie zaczął.
  „Pensja” zawsze pokazuje średnie koszty (przy pensji równej propozycji – „pensja równa propozycji”, bez przycisku).
  „+ łupy z …” z dopiskiem „poza pensją – nie wchodzi do „Rozdzielone”” (PM sp. 3); w planie kampanii „rok wcześniej”
  dla miesiąca sprzed pierwszej operacji – „— (przed historią)” (`YearCell.yearAgo` null), nie 0,00 zł.
- **T449** Przegląd roczny (1.15.9, N5 – AP-24, R-19, AF-34, RY.24, RY sp. 5, RY.25): miesiące roku tylko z historią
  (`yearSpan`: od pierwszego dnia danych – operacja albo saldo otwarcia – do bieżącego miesiąca); miesiące przed nim jednym
  wierszem „styczeń … – sierpień …: brak historii”, przyszłe nie są w tabeli (sumy roku bez zmian). Pieniądze i siła
  floty „na początku” w roku, w którym dane zaczynają się później niż 1 stycznia – z datą tego dnia: „saldo otwarcia
  dd.mm.rrrr” (saldo otwarcia tego dnia) albo „początek historii dd.mm.rrrr” (kwota bez zmian – T81). Siła floty netto
  „z należnościami, po odjęciu długu” (było „bez długu”). Cele osiągnięte w roku – z logu silnika i z `achievedAt`
  (także zarchiwizowane później), w kolejności dojścia. Przypomnienie w styczniu: powiadomienie „Przegląd roczny” raz
  (klucz `year:<rok>`) za rok zamknięty, gdy budżet w nim działał; własny przełącznik `NotifyPrefs.yearReview`
  (config.json komputera, addytywnie, domyślnie włączony), kliknięcie – Raporty → Przegląd roczny (w styczniu rok
  zamknięty); wiersz w tabeli powiadomień specyfikacji.
- **T460** Kreator CSV innego banku (1.16.0, R1 – AP-43, raport 2.2 c): plik, który nie jest plikiem mBanku i do którego
  nie pasuje mapowanie żadnego konta, otwiera na ekranie Import kreator kolumn – podgląd pierwszych wierszy, separator
  (; , tabulator |), kodowanie (wykryj / UTF-8 / Windows-1250), wiersze przed nagłówkiem, wiersz nagłówka, format daty
  (7 zapisów), znak dziesiętny („1 234,56” / „1,234.56”), role kolumn: data operacji (wymagana), data księgowania, kwota
  ze znakiem albo uznania + obciążenia (obie), opis / tytuł albo kontrahent (co najmniej jedno), rodzaj operacji, saldo
  po operacji, numer rachunku kontrahenta, waluta; propozycja z nazw nagłówka (`guessCsv`), podgląd wyniku pierwszych
  operacji i brakująca rola przy przycisku. „Zapisz kolumny i wczytaj plik” zapisuje mapowanie przy koncie w `fi.json`
  (`importFormat: 'csv'`, `csvMapping` – addytywnie, bez `SCHEMA_VERSION`; wartości nowszej wersji zostają – `openEnum`,
  `looseObject`; mapowanie nieczytelne dla tej wersji odpada, konto zostaje), potem czyta nim plik; konto z importem
  mBanku zostaje `'mbank'` (mapowanie dopisane – przypomnienia o imporcie i misja „Łączność z bazą” działają dalej),
  „Nowe konto…” zakłada konto rodzaju „konto bankowe”. Następny plik: najpierw mBank, potem konta (niezarchiwizowane)
  z mapowaniem, którego nagłówek jest wśród pierwszych 60 wierszy pliku (linia dopisana przez bank nad nim nie
  przeszkadza; bez nagłówka – pierwsze operacje czytelne), konto wybrane wcześniej pierwsze; „Zmień kolumny” otwiera
  kreator z mapowaniem pliku. Wiersz: uznania na plus, obciążenia na minus bez względu na znak w pliku; waluta z kolumny
  albo z kwoty – inna niż PLN pominięta z powodem (jak w mBanku); godzina przy dacie nie jest czytana (import bez
  godzin); kontrahent z kolumny bez dopisków banku (`cleanBankName`), bez kolumny – z opisu. Ustawienia → Konta: wybór
  „bez importu / CSV z mBanku / CSV innego banku” zamiast pola „import CSV z mBanku”. Plik, który nie jest tabelą –
  błąd obok otwartego pliku (N12). Przegląd R1: kreator pliku, do którego nie pasuje żadne mapowanie, proponuje zawsze
  nowe konto (3); wybór istniejącego konta z innymi kolumnami pyta „Zastąp kolumny” (`csvReplaces`, bez odpowiedzi –
  odmowa ze słowem), „Zmień kolumny” zmienia mapowanie konta, którym plik był czytany (`mappingAccountId` – nie konta
  wybranego potem; 10). Mapowanie konta „bez importu” nie czyta plików, mapowanie nieczytelne dla tej wersji jest
  pomijane (`accountMapping` – `safeParse`; 7). Mapowanie, którego `fi.json` nie zachowa (kolumna od 200, nagłówek ponad
  200 komórek albo komórka ponad 200 znaków), nie jest zapisywane – kreator mówi dlaczego; nazwa nowego konta skracana
  przed numerem do 40 znaków („… 2”), zmieniona – ze słowem (5). Inny separator albo kodowanie: role po nazwach nowego
  nagłówka, inaczej tylko te w kolumnach pliku (`columnsFor`; 11). Drugi przegląd R1 (4, zmienia 11): inne kodowanie
  nie rusza ról; inny separator – znikają tylko role poza kolumnami pliku, ustawione ręcznie zostają (żadna nie została –
  po nazwach nagłówka). Kwota z drugim znakiem dziesiętnym poza tysiącami
  („12.50” przy „,”) – nieczytelna, wiersz pominięty z powodem (14).
- **T461** Tożsamość wiersza CSV innego banku (1.16.0, R1 – AP-43; przegląd R1 1): `bank.key` =
  `csv:<odcisk(konto|data|WIERSZ|kwota)>:<n>`; WIERSZ – wszystkie komórki wiersza w ich kolejności (bez pustych na
  końcu), jak w pliku, niezależnie od ról kolumn – zmiana mapowania nie zmienia kluczy (`rowText`; to samo pole
  `bank.description`, więc B35 – ten sam wiersz na innym koncie – liczy go jak dla mBanku); `n` – numer wiersza w obrębie
  dnia wśród wierszy o tej samej dacie, treści i kwocie (dwa takie same wiersze jednego dnia to dwie operacje), nie
  pozycja w dniu – pozycja zmienia się, gdy plik zaczyna się później albo bank dopisze operację w środku dnia. Bank,
  który zmienia komórki wiersza (operacja w toku zaksięgowana – saldo, stan, data zakończenia), daje mu inny klucz: miara
  B5 (kwota, ±3 dni, podobna nazwa, dzień w okresie pliku) obejmuje dla CSV także operacje tego samego formatu
  (`byMeasure`) – tylko te, których klucz pliku nie znalazł; nowy klucz dopisany do `altKeys`. Drugi przegląd R1 (1,
  zmienia): usunięte operacje CSV tego samego formatu też – tylko te, których wiersza plik nie ma po kluczu
  (`DeletedRow.keys`: `bank.key` i `altKeys`); wiersz usuniętej obecny po kluczu zostaje poza importem po kluczu, a nowy
  taki sam zakup dzień później wchodzi. Drugi przegląd R1 (7): pola banku w granicach wpisu (`bankRowSchema`,
  `transactionSchema` – opis 2000, kontrahent 300, rodzaj 200, tytuł 1000 znaków); dłuższy opis skrócony z odciskiem
  całego tekstu na końcu (`within`) – tożsamość z pełnego wiersza, ta sama przy B35 i w panelu duplikatów. Klucze
  `csv:` sprzed przeglądu nie były wydane (R1 bez wydania) – bez migracji. Ponowny import pliku – wszystko „już zaimportowane”,
  plik zachodzącego okresu – wspólne dni znane, reszta nowa. Format wiersza mówi przedrostek klucza (`keyKindOf`,
  `formatOfBanks` → 'csv'), bo klucz zachowuje każda wersja: `bank.format` zostaje 'mbank' (w 1.15.9 zamknięty enum –
  inna wartość zrobiłaby operację nieczytelną), `bank.source` nie jest zapisywane (1.15.9 by je zgubiło przy zapisie).
  B5 (ten sam wiersz w innym formacie: kwota, ±3 dni, podobna nazwa) działa między CSV a plikami mBanku na tym samym
  koncie jak między listą a historią rachunku. Opis z banku operacji CSV to cały wiersz pliku („Opis z banku” w edytorze
  operacji, słowa reguł tytułu).
- **T462** CSV innego banku – ten sam przebieg co mBank (1.16.0, R1 – AP-43): plik czytany do `MbankFile` w formacie 'csv'
  (bez właściciela rachunku, numeru rachunku i okresu – okres z dat wierszy), dalej `planImport` → `buildImport`:
  reguły i nauka, przelew własny po nazwiskach z ustawień, domownicy, pożyczki, bankomat, łączenie z wpisami ręcznymi,
  duplikaty, kopia przed importem, paczka i „Cofnij import”; kolumna salda daje telemetrię salda i potwierdzenie salda
  jak historia rachunku (kolejność sald po dacie księgowania; notatka „Saldo z pliku banku (CSV)”). CSV nie ma operacji
  nierozliczonych – bez propozycji usunięcia zniknionych (tylko lista operacji mBanku). Nie zmienia się: pliki innych
  banków nie są szukane w Pobranych (F14 – tylko mBank), przypomnienia o zaległym imporcie i misja liczą konta z importem
  mBanku. Przegląd R1 4: rozpoznanie (domownik, spłata pożyczki, przelew własny, bankomat, zwrot towaru, opłata banku)
  czyta rodzaj operacji słowami mBanku – CSV dostaje go przy odczycie (`operationOf`): rodzaj z pliku, gdy zaczyna się
  słowem, które import zna („Płatność kartą”, „Przelew przychodzący”, „Wypłata z bankomatu”), inaczej ze słów rodzaju,
  kontrahenta i opisu (także angielskich: CARD_PAYMENT, TRANSFER, TOPUP, ATM, FEE, REFUND): bankomat, zwrot (wpływ),
  opłata banku (wydatek: prowizja, odsetki, „opłata za kartę / prowadzenie”), przelew, płatność kartą; bez słowa – każdy
  wpływ i wydatek z numerem rachunku kontrahenta to przelew (wpłata domownika, spłata, przelew własny – po nazwie),
  wydatek bez słowa zostaje bez rodzaju (zakup – po nazwie). Kreator bez kolumny rodzaju mówi o tym i pokazuje rodzaj
  w podglądzie. Drugi przegląd R1 (2, 8, 9): jedno rozpoznanie rodzaju – rodzaj banku zostaje tylko, gdy czyta go
  `classify.ts` (`readsOperation`: `isAtmOperation`, `isFeeOperation`, `isReturnOperation`, `isTransferOperation` w kierunku
  wiersza, `opKindOf` 'card'); goły „BLIK” czy „OBCIĄŻENIE” – ze słów jak bez kolumny (wpływ z „BLIK” to przelew osoby,
  nie karta); bankomat po kierunku – wypływ to wypłata, wpływ „WPŁATA WE WPŁATOMACIE” (nie przelew na konto gotówki);
  podgląd kreatora nazywa rodzaj tym samym (`operationKindText`). (6) Przelew własny bierze konto drugiej strony z numeru
  rachunku kontrahenta, potem z opisu – nigdy konto pliku (opis CSV to cały wiersz, z numerem własnego rachunku).
- **T463** Import w Web Workerze (1.16.0, R1 – AP-35, AF-30, IM.55): otwarcie pliku – dekodowanie, odczyt wierszy, wybór
  konta, mapowanie konta i plan – w Workerze (`renderer/features/import/worker.ts`, klient `analysis.ts`); jedna czysta
  funkcja `shared/import/analyze.ts` (`analyzeImport`) w Workerze i w oknie, dane budżetu jako `PlanSource` (zwykłe dane
  – kopia strukturalna wiadomości, bez indeksów i funkcji). Pasek postępu: „Odczyt wierszy” 0–60 %, „Rozpoznawanie
  operacji” 60–100 % (komunikat Workera najwyżej co 60 ms). Bez Workera – okno jak przed 1.16.0, po klatce na
  „Wczytywanie…” (Node w testach, WebKit bez Workera, skrypt Workera nie wstał – `error`: od tej chwili okno; błąd
  w Workerze – okno próbuje samo). Jedna analiza naraz: nowy plik, „Zamknij plik” i inny folder przerywają ją
  (`terminate`); zmiany danych w trakcie – plan od nowa zaraz po niej (`replanIfChanged`); „Importuj” w trakcie
  wczytywania innego pliku – odmowa z komunikatem. Przegląd R1 15 (zmienia): ponowny plan po zmianie danych (zapis,
  zmiana z drugiego komputera, słowo kluczowe, scalenie nazw – `replanIfChanged`) idzie do Workera, gdy jest
  (`replanInWorker`: plik bez odczytu, odpowiedź bez wierszy pliku – wracają wiersze okna), a decyzje przenosi na nowy
  plan po jego przyjściu – także podjęte w międzyczasie (`replanImport(plan)`); jeden naraz, zmiana w trakcie – plan
  jeszcze raz po nim; inny plik, konto albo folder albo zapis importu w międzyczasie – plan odrzucony. W oknie zostają:
  zmiana konta pliku, „Cofnij” innego pliku i plan przed zapisem (`runImport` – synchroniczny z podpisem planu).
  Drugi przegląd R1 (10): Worker trzyma plik swojej analizy i ostatnio wysłane operacje (`answerer` – sesja to id prośby
  analizy); ponowny plan wysyła tylko konto, ustawienia, usunięte i zmiany operacji (`operationsDelta`: kolejność id
  i rekordy inne niż wysłane – rekord sklepu nie zmienia się w miejscu); Worker bez tej sesji (inny plik, nowy Worker) –
  plan w oknie. (5) Każde niepowodzenie drogi przez Workera – błąd, odpowiedź niepasująca do danych okna („plan bez
  operacji”, „plan nie z tego pliku”) – analiza albo plan w oknie, nigdy błąd importu ani stary plan.
  Worker jako moduł ES (`worker.format: 'es'` – electron-vite i telefon; telefon nie importuje plików, build go ma).
- **T464** Plan przez wiadomość Workera (1.16.0, R1 – AP-35): operacje planu jadą jako odnośniki (`txRef`: id i widok –
  druga strona przelewu w jednej operacji `sideOf`, strona przelewu sprzed 1.7.0 `legacySideOf`) i wracają z listy
  okna, z której plan powstał (`txOfRef`, `planFromWire`) – te same obiekty co w planie liczonym w oknie, wiersze planu
  i pliku wspólne (jedna wiadomość). **Pułapka:** widok strony poznaje się po obiekcie (`isSideView`, `realOf`) – kopia
  z wiadomości nie byłaby widokiem i zapis wziąłby stronę drugiego konta za samą operację. Test: plan z Workera równy
  planowi okna na liście, historii i CSV z wpisami ręcznymi, przelewami obu rodzajów i nierozliczoną zniknioną; zapis
  `buildImport` z obu – ten sam (`tests/unit/import-worker-ap35.test.ts`).
- **T465** Wydajność importu – próg i pomiar (1.16.0, R1 – AP-35): test 20 000 wierszy przy 20 000 operacji w budżecie –
  cała analiza poniżej 30 s, każdy z dwóch przestojów okna przy Workerze (kopia prośby, kopia odpowiedzi – liczone
  w całości) krótszy niż analiza w oknie (przegląd R1: suma obu pod obciążeniem pełnego zestawu bywała bliska progu); tu (komputer deweloperski, sam test) analiza w oknie ok. 630 ms, okno przy Workerze ok. 280 ms
  (w pełnym zestawie testów 890 / 450 ms). E2E (aplikacja zbudowana, 20 000 wierszy): okno bez Workera ok. 650 ms,
  najdłużej nie odpowiada ok. 590 ms; z Workerem ok. 900 ms (pierwszy raz ok. 1,3 s – start Workera), najdłużej nie
  odpowiada ok. 200 ms (odbiór planu i rysowanie), pasek postępu się przesuwa. Pomiar w maszynie (IM.55) – do zrobienia.
- **T466** Ekran importu – teksty (1.16.0, R1 – AP-43, AP-35): panel „Plik z banku” (było „Plik z mBanku”) z jednym
  zdaniem o pliku innego banku; plik opisany „CSV innego banku · N operacji”; przy wierszach znalezionych miarą B5
  w pliku CSV – „z innego pliku – po kwocie, dacie i nazwie” (przegląd R1 1: także wiersz tego samego banku o zmienionych
  komórkach); kreator: pytanie „Zastąp kolumny”, zdanie o rozpoznaniu bez kolumny rodzaju operacji, rodzaj w podglądzie; okno wyboru pliku „Plik CSV z banku (z mBanku: lista operacji albo historia
  rachunku)”; nagłówek ekranu „CSV z mBanku i innych banków”. Pasek postępu z `role="status"`, stan w `data-phase`,
  `data-pct`; otwarty plik – `data-format`, `data-via` ('worker' / 'window').
- **T467** Reguły importu z warunkami I / LUB (1.16.0, R1 – AP-45): reguła z trybem `conditions` ma listę warunków
  (`conditions`, najwyżej 10) łączonych `combine` – „wszystkie (I)” albo „którykolwiek (LUB)”: kontrahent zawiera
  (litery i cyfry nazwy jak dotychczasowe „zawiera” – `counterpartyKey`, klucze marki, nazwy i całej nazwy), tytuł zawiera
  (całe słowa jak słowo kluczowe, ostatnie może być dłuższe – „czynsz” = „czynszu”; tylko tytuł, nie nazwa), kwota od–do
  (bez znaku, końce włącznie, jeden z nich może nie być podany; kwota nieznana – warunek nie jest spełniony), konto
  (konto operacji; w imporcie konto pliku – `ClassifyContext.accountId` z `planImport`). Kierunek nie jest warunkiem listy,
  tylko polem reguły jak dotąd (wydatki / wpływy / oba) i zawsze obowiązuje razem z warunkami – „wpływy LUB …” łapałoby
  każdy wpływ. Pierwszeństwo (`findRule`): reguła „wszystkie” z co najmniej dwoma warunkami przed każdą regułą jednego
  dopasowania (jest węższa – jak marka do kwoty przed marką; więcej warunków – wcześniej, przy równej liczbie kolejność
  listy); reguła z jednym warunkiem albo „którykolwiek” po wszystkich dotychczasowych (marka, marka do kwoty, „zawiera”,
  słowa) – działa tylko tam, gdzie żadna z nich nie pasuje (jest tak szeroka jak jedno dopasowanie albo szersza), między
  sobą w kolejności listy. Dotychczasowe reguły (marka, „zawiera”, słowo, słowo z kontrahentem, marka do kwoty) czytane
  bez zmian – to reguły jednego warunku, z tym samym dopasowaniem i tą samą kolejnością (`findOneMatch` to kod sprzed
  1.16.0); test `rules-ap45-golden` porównuje cały import obu fixture'ów (decyzje wierszy, operacje, reguły po imporcie,
  audyt) z wynikiem zapisanym kodem 1.15.9. Format addytywny, bez `SCHEMA_VERSION`: pola `conditions`, `combine`, `manual`
  opcjonalne, dotychczasowa reguła ich nie dostaje. Zgodność ze starszą wersją: polem zgodności jest tryb – wersja przed
  1.16.0 nie zna trybu `conditions` i reguły nie stosuje (pomija nieznany tryb – ten sam `ruleIndexOf`), zamiast dopasować
  ją po samym `match` (dla reguły kilku warunków – za szeroko); pola zachowuje (`looseObject`), edycja decyzji reguły na
  starszej wersji zostawia warunki. Znane ograniczenie: na komputerze ze starszą wersją reguła z warunkami nie działa
  (wiersze czekają na decyzję albo bierze je reguła marki) i jej audyt pokazuje „bez trafień”; „zapamiętaj” na starszej
  wersji może dołożyć regułę marki, którą nowa wersja stawia za regułą „wszystkie” (dwa warunki i więcej). Warunek
  nieznany tej wersji (nowszej wersji, zepsuty) zostaje w pliku, a reguła nie działa wcale – nigdy „do połowy”
  (`compileRule` null, na liście „Warunek nowszej wersji aplikacji – ta wersja tej reguły nie stosuje”); zepsuta lista
  warunków – reguła bez warunków, nieaktywna, pozostałe reguły czytane. Kwoty warunku (`conditions.min`, `.max`) są
  kwotami historii i konfliktów (`AMOUNT_FIELDS`), pola mają polskie nazwy (`Warunki`, `Łączenie warunków`).
  Przegląd R1 (pkt 6, 9): warunki i sposób łączenia, których ta wersja nie umie przeczytać (więcej niż 10 warunków,
  wartość nowszej wersji, zepsute), zostają w `fi.json` bez zmian – proces główny parsuje plik przed każdym zapisem, więc
  `.catch(undefined)` je kasował. Pola `conditions` i `combine` mają typ `unknown` (unia schematu z dowolną wartością)
  i są czytane tylko przez `conditionsOf` / `combineOf` (null – „nieznane”: reguła nie działa); schemat warunku bez
  `.catch` – nieczytelna lista w całości zostaje surowa, nigdy „do połowy”. Reguły z nieczytelnymi warunkami nie da się
  zmienić w edytorze (zapisałby je od nowa) – lista mówi dlaczego, można ją usunąć. Tak samo mapowanie CSV konta
  (`accountSchema.csvMapping`, T460): nieczytelne zostaje w pliku surowe, czytane tylko przez `readCsvMapping` (null –
  import pyta o kolumny); typ pola bez zmian, więc kod importu CSV musi czytać przez `readCsvMapping` / `safeParse`.
  Każde szukanie reguły z operacji podaje jej kwotę i konto – także `ruleFor` („Zapamiętaj” w edytorze operacji) i oficer
  (`officerHint`; 0 zł – kwota niewpisana, warunek kwoty nie jest spełniony); pilnuje tego test w kodzie
  (`rules-r1-review`: każde wywołanie `findRule` ma pięć argumentów, poza `matchRule` – sam klucz).
- **T468** Edytor reguły z warunkami (1.16.0, R1 – AP-45): Ustawienia → Import z banku → „Reguły importu” → „+ Nowa
  reguła z warunkami” (nad listą) i „zmień” przy regule z warunkami (`ConditionsEditor`): nazwa (pusta – z pierwszego
  warunku z tekstem, inaczej „Reguła z warunkami”), „Dla” (wydatki / wpływy / oba kierunki), „gdy spełnione” – wszystkie
  warunki (I) / którykolwiek warunek (LUB), warunki dodawane z listy rodzajów („+ warunek”, najwyżej 10) i usuwane („×”),
  decyzja jak w edytorze reguły (bez rodzajów decydowanych operacja po operacji, bez „w tym za” i reszty wpłaty domownika),
  tagi, „także dla wpisów ręcznych”. Szkic w pamięci okna (`useDraft`, AP-8) do „Zapisz” albo „Anuluj”. Odmowy przy polu
  i przy „Zapisz” (AP-15): bez warunku, kontrahent bez liter i cyfr, tytuł bez słowa, kwota bez obu końców, konto spoza
  listy, warunek nowszej wersji, wydatek bez kategorii (i bez domownika / kilku osób); „od” po „do” – zamiana ze słowem
  (`orderRange`). Reguła z edytora jest Twoja (`learned` false), nowa na końcu listy; zapis z „Cofnij” – nowa usuwana,
  zmieniona wraca, tylko gdy od tego czasu się nie zmieniła (T418). Dotychczasowe reguły edytuje dotychczasowy edytor
  (dopasowanie się nie zmienia – zamiana reguły marki na regułę z warunkami zmieniłaby, co łapie); na liście reguła
  z warunkami ma je opisane słowami („kontrahent zawiera „bolt” i kwota do 10,00 zł”), wyszukiwanie obejmuje ten opis.
  Przegląd R1 (pkt 13, AP-15): w folderze tylko do odczytu (także gdy zniknie przy otwartym edytorze) wyłączone
  przyciski mówią obok dlaczego – raz na listę reguł („+ Nowa reguła z warunkami”, „zmień”, „usuń”), przy „Zapisz”
  edytora i raz na listę słów („też ręczne”); powód folderu (`status.readOnlyReason`) albo „trwa otwieranie innego
  folderu” (`useLockedReason`).
  Przegląd R1 2 (pkt 3): „tylko usunięcie” dotyczy reguły z warunkami z czymkolwiek nieczytelnym (`unreadableRule`:
  warunki, warunek nowszej wersji, `combine`, rodzaj, kierunek) – „zmień” wyłączony z powodem, a każdy zapis reguły odmawia
  ze słowem (`LOCKED_RULE_TEXT`): „Zapisz” edytora (dawniej `combine` nowszej wersji stawało się „all”), zmiana decyzji
  (`editRule`), „Zmień na spłatę” (takiej reguły przegląd już nie podsuwa) i „też ręczne”. Uczenie z importu zmienia tylko
  regułę, która zdecydowała grupę, a nieczytelnej import nie stosuje; „Zastosuj do historii” zapisuje operacje, nie regułę;
  „Cofnij” przywraca regułę w całości.
- **T469** Import, audyt i „Zastosuj do historii” z regułami z warunkami (1.16.0, R1 – AP-45; rozszerza T169, T325,
  T326, T418): import przekazuje regułom konto pliku i kwotę wiersza (także zwrot towaru szukający reguły zakupu); powód
  „Twoja reguła „…””. Reguła z warunkiem tytułu, który jest spełniony, decyduje „o tytule” (`decidedByTitle`, jak słowo
  z tytułu): nie ustępuje pożyczce, domownikowi ani XTB rozpoznanym po nazwie (T325) i nie uczy reguły kontrahenta;
  reguła bez niego ustępuje jak każda inna. Decyzja grupy wierszy jednej reguły z warunkami z „zapamiętaj” zmienia tę
  regułę (decyzja, liczba użyć – warunki zostają), nie dokłada reguły marki, która stałaby za nią (jak reguła marki do
  kwoty, F22). Propozycje słów (uczenie, D78) liczą wiersz reguły jednego warunku albo „którykolwiek” jako taki, który
  słowo by przejęło (stoi po słowach), i czytają konto pliku. Audyt reguł (`feedAudit`) szuka reguły z kontem i kwotą
  operacji: trafienia, „inaczej” z „Zastosuj do historii” i „Cofnij” (T418), „do poprawy” przy wpływie od osoby
  z pożyczką (słowo z tytułu – nie, T326) i „bez trafień” działają dla reguł z warunkami bez zmian w ich kodzie.
- **T470** Reguły dla wpisów ręcznych (1.16.0, R1 – AP-45): reguła z polem `manual` („także dla wpisów ręcznych” –
  w edytorze reguły z warunkami, w edytorze reguły marki i przełącznik „też ręczne” na liście słów kluczowych; na liście
  reguł znak „· też ręczne”) podpowiada w szybkim wpisie i w edytorze operacji wpisanej ręcznie (bez danych z banku)
  decyzję wydatku po wpisaniu kontrahenta albo tytułu (w szybkim wpisie – notatki): kategorię i kto płaci (ja, domownik
  – z prezentem, kilka osób), przyciskiem „z reguły „…”: kategoria · finansuje: …” – dopiero kliknięcie ją przyjmuje,
  nic nie zapisuje się samo. Reguła szukana tak jak w imporcie (`findRule` na samych regułach `manual`, kwota i konto
  wpisu – warunek kwoty nie jest spełniony, dopóki kwoty nie ma), tylko reguła wydatku; kategoria zarchiwizowana –
  podpowiedź samego „kto płaci”, domownik usunięty – samej kategorii; nic do podpowiedzenia, albo wpis ma już tę
  decyzję – podpowiedzi nie ma (`hintChanges`). Gdy reguła podpowiada, oficer (F8) w szybkim wpisie nie wpisuje swojej
  kategorii sam, a jego przycisk znika – jedna podpowiedź naraz, ta z reguły użytkownika. Paragon podzielony ręcznie –
  bez podpowiedzi. Starsza wersja pole `manual` pomija (reguła działa tam w imporcie jak dotąd).
  Przegląd R1 (pkt 12): decyzja operacji porównywana z podpowiedzią przez `hintedOf` – zakup domownika zapisany
  z `memberId` null to zakup pierwszego domownika („Dom”), jak reguła z `memberId` null; ta sama decyzja nie jest zmianą
  (podpowiedź się nie pokazuje i nie zasłania oficera).
- **T471** Test „przed i po” dla dotychczasowych reguł (1.16.0, R1 – AP-45): `tests/fixtures/rules/ap45-before.json` –
  wynik importu obu fixture'ów mBanku z regułami każdego dotychczasowego rodzaju (marka, marka do kwoty, „zawiera”,
  słowo, słowo z kontrahentem, oba kierunki, zwrot towaru, domownik, pożyczka z Radaru, XTB, kategoria zarchiwizowana,
  wspólny zakup, część pożyczki, tagi) zapisany kodem 1.15.9 przed zmianą `findRule`; `rules-ap45-golden` porównuje
  z nim decyzje wierszy, operacje z importu, reguły po imporcie i audyt. Plik zapisuje się ponownie
  (`FI_GOLDEN_WRITE=1`) tylko kodem sprzed zmiany dopasowania reguł – nigdy po to, by test przeszedł.
- **T472** Energia dnia w kalendarzu Radaru (1.16.0, R1 – AP-42): dni minione bieżącego miesiąca z silnika
  (`DailyState.days`, wynik – nic nie jest zapisywane): przydział i wydane z puli dziennej tak, jak ocena dnia w grze liczy
  dzień na jego koniec (`rateDay`: pokrycia zrobione przed tym dniem – D73, łupy zatrzymane w kopertach od dnia decyzji,
  zwroty kategorii netto z jej zakupami dnia, nigdy poniżej zera – T370); dziś – liczby Mostku (`daily`: przydział,
  wydane dziś, energia dziś z ograniczeniem energii miesiąca – T371). Plan miesiąca zmieniony później liczy się w dniach
  minionych od 1. dnia (jak w ocenie dnia liczonej dziś); dzień zamrożony w Dowództwie przed taką zmianą może mieć inny
  przydział – jego ocena zostaje. Test: dzień po dniu równe silnikowi na koniec dnia z `coversBefore` (jak `rateDay`).
- **T473** Prognoza energii dni naprzód (1.16.0, R1 – AP-42): każdy dalszy dzień bieżącego miesiąca – przydział, jaki
  silnik policzy jutro, gdy dziś nic więcej nie wydasz (`dayAhead`: pula zostawiona ÷ dni od jutra; zwrot ponad
  dzisiejsze zakupy wchodzi od jutra), nie więcej niż energia miesiąca, która została; ta sama kwota w każdym dniu („≈”).
  Dni następnych miesięcy – bez energii („przydział tego miesiąca policzy jego plan po pensji 1. dnia”), bez nowego
  liczenia planu; ostatni dzień miesiąca – bez prognozy.
- **T474** Kalendarz-siatka na Radarze (1.16.0, R1 – AP-42): przełącznik „lista / kalendarz” w nagłówku panelu „Na
  radarze” (domyślnie lista; wybór i miesiąc w szkicu okna – zostają przy przejściu do innego ekranu, do zmiany folderu
  albo restartu). Siatka z jednej listy pozycji Radaru (`calendarMonth` z `useFuture().items` – te same obiekty, ten sam
  porządek), tydzień od poniedziałku; miesiące od bieżącego do miesiąca końca okna 90 dni (dalej / wcześniej – przycisk
  wyłączony, obok „Radar do dd.mm.rrrr” – AP-15), dni po oknie przygaszone. Pozycje dat sprzed miesiąca (niezapłacone terminy
  wcześniejszych miesięcy – D99 pkt 3) nad siatką bieżącego miesiąca. Komórka: dzień (dziś w akcencie z obwódką),
  przydział, wydane (ponad przydział – akcent, nie czerwień: to nie kwota na minus), suma płatności „−” i wpływów „+”
  (zieleń), „•” – terminy bez kwoty, „!” – po terminie; dymek z nazwami i kwotami. Klik dnia – pod siatką dzień tygodnia,
  data, energia słowami, pozycje dnia (rodzaj, nazwa, notatka, kwota) i „operacje tego dnia ›” – Operacje z okresem tego
  dnia jako widok (zapisany filtr zostaje – B88); bez klika – dziś. Ukryte kwoty (Ctrl+$) – maska w komórkach i w dniu
  (`plnText`). Telefon: ta sama siatka (7 kolumn mieści się w szerokości iPhone'a), w komórce dzień, przydział i znaczniki
  płatności / wpływów, reszta pod siatką.
- **T475** Opis formatu folderu (1.16.0, R1 – AP-47, bez AI – D74): `docs/format-folderu.md` generowany ze schematów
  (`scripts/format-folderu.ts` – `SCHEMAS`, typy po kontrolach wspólnych typów z `schema/common.ts`: ULID, data, miesiąc,
  godzina, grosze; obecność – wymagane / opcjonalne / domyślnie …) i polskich słów pól (`scripts/format-folderu-pola.ts`,
  klucz `rodzaj:ścieżka`); plik to migawka Vitest (`toMatchFileSnapshot`), `npm run docs:format` zapisuje go od nowa.
  `tests/unit/format-folderu.test.ts` pada na pole schematu bez słów, na słowa pola, którego nie ma, i na plik
  nieaktualny. Części wspólne (wiersz z banku, wspólny zakup, ustawienia importu przed / po) opisane raz, operacja
  w paczce importu – odsyłacz do `transactions/`; mapy z `lenientRecord` mają typ „dowolna wartość” (wartość sprawdza
  transformacja) – jej postać w słowach. Przykładowy skrypt `docs/przyklady/odczyt.mjs` (Node 18+, bez zależności, tylko
  odczyt): wydatki (`kind` = `expense`) miesiąca po kategoriach głównych, linie paragonu osobno, bez linii finansowanych
  przez domowników, tylko pliki o kanonicznej nazwie (kopie konfliktów i pliki tymczasowe pominięte); test na folderze
  zapisanym schematami aplikacji (`seedFolder`) z kopią konfliktu, plikiem tymczasowym i historią – sumy, wiersz
  poleceń i folder bez zmian po odczycie.
  Przegląd R1 (pkt 8): skrypt liczy części jak silnik (`partsOf`) – część kwoty, której linie paragonu nie pokrywają
  (`amount` minus suma linii), idzie pod `categoryId` operacji z jej finansowaniem; opis pola mówi to samo zamiast
  „linie sumują się do `amount`”. Test porównuje sumy skryptu z częściami silnika na tych samych rekordach.
- **T476** Link do opisu formatu (1.16.0, R1 – AP-47): Ustawienia → Folder i kopie, panel „Bieżący folder danych” –
  zdanie o zasadzie „tylko do odczytu, nie zapisuj, gdy aplikacja działa” i „Opis formatu folderu i przykładowy skrypt ›”,
  otwiera w przeglądarce `FOLDER_FORMAT_PAGE` (plik w publicznym repozytorium – D61; `shared/update.ts`). Opisu nie ma
  w aplikacji (bez sieci link się nie otworzy) – w Ustawieniach, nie w F1, bo dotyczy folderu.
- **T480** Plan spłaty pożyczek (1.17.0, R2 – AP-41, D101 (2) – bez kart kredytowych i rat 0 %): tylko pożyczki wzięte,
  otwarte (bez `closedAt`, do spłaty > 0), najstarsza pierwsza; udzielone to należności – poza planem. Panel „Plan spłaty
  pożyczek” na Radarze pod „Pożyczki”, gdy jest choć jedna taka pożyczka. Propozycja: liczy czysta funkcja
  `calc/payoff.ts` z `LoanState` silnika (do spłaty, raty niepokryte – to samo pokrycie rat spłatami co wiersz Radaru), nic
  nie jest zapisywane, silnik, warstwy, dług w zasięgu i kontenery rat w Ładowni bez zmian. Bez „Zastosuj”: boja nadpłaty
  po „Wykonaj teraz” byłaby wydatkiem z energii, nie spłatą pożyczki – nadpłatę zapisuje się jak dotąd w wierszu pożyczki
  („zapłać ratę”, przy racie w Ładowni „z osłon (nadpłata)”). Wejście: „Nadpłata co miesiąc” i „jednorazowo teraz” (szkic
  okna – zostaje przy przejściu do innego ekranu, do zmiany folderu albo restartu), przy „wolnym do decyzji” > 0 – „Osłony ·
  wolne do decyzji … – wstaw jako jednorazową” (tylko propozycja). Wynik: przy pożyczce do spłaty, następna rata i
  oprocentowanie; porównanie „bez nadpłat / lawina / kula śnieżna” – spłata wszystkich (mm.rrrr, „nigdy”), odsetki, mniej
  odsetek, krócej o, nadpłata najpierw, spłata każdej pożyczki; miesiąc po miesiącu wybranego wariantu (wpłata, w tym
  nadpłata, zostaje, „spłacona”; po 100). Bez kwoty nadpłat – tylko harmonogram i zdanie, co wpisać. Ukryte kwoty – maska.
  Telefon: ten sam panel (Radar to ekran komputera – mieści się w szerokości iPhone'a, oprocentowanie idzie na OneDrive).
- **T481** Odsetki i zaokrąglenia planu spłaty (1.17.0, R2 – AP-41): oprocentowanie nominalne roczne w procentach – pole
  `rate` pożyczki (T484), brak = nieznane. Raty harmonogramu zawierają odsetki, więc kapitał na start planu (bieżący miesiąc)
  to wartość obecna rat niepokrytych przy tym oprocentowaniu – wstecz od ostatniego miesiąca, do grosza w każdym:
  (zostaje po miesiącu + raty miesiąca) × 120 000 ÷ (120 000 + punkty bazowe, 1 % = 100); bez oprocentowania (albo 0 %)
  i bez harmonogramu – do spłaty. Co miesiąc najpierw odsetki od tego, co zostało: saldo × punkty bazowe ÷ 120 000
  (oprocentowanie ÷ 12), do grosza, połówki w górę – także pełny pierwszy miesiąc; potem raty miesiąca (rata z miesiąca
  przed planem – zaległa – w pierwszym); ostatnia rata harmonogramu płaci całą resztę (różnica zaokrągleń – reszta w
  ostatniej części: 2 × 100,23 zł przy 12 % to 100,23 + 100,24 zł), potem nadpłata (T482). Wariant bez nadpłat to więc
  harmonogram; odsetki tylko z pożyczek z oprocentowaniem („—”, gdy żadna go nie ma). Uproszczenie: miesiąc = 1/12 roku,
  nie dni jak w banku – liczby banku mogą różnić się o grosze. Przegląd R2: oprocentowanie wpisane dokładniej niż 0,01 %
  zaokrągla się połówką w górę od wpisanej liczby dziesiętnej (7,255 → 7,26 %, `loanRateOf`) i nigdy po cichu – przy polu
  komunikat „Oprocentowanie liczy się z dokładnością do 0,01 % – przyjęte 7,26%.” (plan i „Nowa pożyczka”, zapis po
  wyjściu z pola – AP-15).
- **T482** Strategie planu spłaty (1.17.0, R2 – AP-41): lawina – najpierw najwyższe oprocentowanie (nieznane = 0 %), przy
  równym mniejsze do spłaty; kula śnieżna – najpierw najmniejsze do spłaty (kwota z Radaru, z odsetkami harmonogramu), przy
  równym wyższe oprocentowanie; dalej starsza pożyczka, id; kolejność stała przez cały plan. Ponad raty każdego miesiąca
  idzie nadpłata co miesiąc, w pierwszym także jednorazowa, i raty, które harmonogram ma jeszcze dla pożyczek spłaconych
  wcześniej (oraz część raty niepotrzebna pożyczce, którą miesiąc kończy) – kula się toczy; po kolei, każdej najwyżej to,
  co zostało. Plan nigdy nie chce w miesiącu więcej niż harmonogram + nadpłata (+ jednorazowa w pierwszym): pożyczka
  spłacona zgodnie z harmonogramem nie zostawia raty na następne (jej kontener wychodzi z Ładowni, pieniądze wracają do
  budżetu) – do potwierdzenia (klasyczna kula trzyma całą miesięczną sumę rat do spłaty wszystkich). Bez nadpłaty i
  jednorazowej strategie to harmonogram (nic, także grosz reszty, nie przechodzi na inną pożyczkę). „Nigdy”: pożyczka bez
  harmonogramu bez nadpłat albo odsetki nie mniejsze niż pieniądze ponad raty – plan kończy się na tym miesiącu (najwyżej
  600 miesięcy). Przegląd R2: koniec planu pożyczka po pożyczce, nigdy po sumie sald – po ostatniej racie harmonogramów
  płaci już tylko nadpłata co miesiąc, cała pierwszej otwartej pożyczce w kolejności (dalszym dopiero po jej spłacie);
  plan kończy się, gdy nadpłaty nie ma albo odsetki tej pożyczki nie są mniejsze od niej (ona i dalsze – „nigdy”). Mała
  pożyczka spłacana nadpłatą ma więc datę, choć duża obok rośnie (100 000 zł przy 24 % i 3 000 zł, 1 500 zł miesięcznie:
  kula – 3 000 zł w drugim miesiącu, 100 000 zł „nigdy”; lawina – obie „nigdy”), a każda pożyczka, którą pula zmniejsza,
  ma tę samą datę co liczenie przez cały horyzont (test własności na losowych zestawach). Plan bez końca nie ma sumy
  odsetek – „Odsetki” i „Mniej odsetek” to „—”.
- **T483** Oprocentowanie w oknie (1.17.0, R2 – AP-41): pole „% rocznie” przy pożyczce w planie (zapis po wyjściu z pola
  albo Enter, Esc cofa; folder tylko do odczytu albo wpis nowszej wersji – sam tekst) i „Oprocentowanie” w „Nowa pożyczka”
  przy „Biorę pożyczkę” (puste = nieznane, przy udzielonej nie ma pola). Zapis w rekordzie pożyczki (`setLoanRate`) do
  0,01 %, poza 0–100 – odmowa z komunikatem przy polu; poprzednia wartość w historii wpisu (zwykła zmiana pola, bez toastu
  „Cofnij”). Plan liczy się z `useFleet` (`fleet.loans`, `fleet.month`) – razem z silnikiem, bez osobnego klucza.
- **T484** Pole `rate` pożyczki (1.17.0, R2 – AP-41): `loans/ULID.json` – opcjonalna liczba 0–100 albo `null`, addytywnie,
  bez podbijania `SCHEMA_VERSION`; plik bez niego zostaje bez zmian, starsza wersja go zachowuje (`z.looseObject`) i nie
  czyta; wartość błędna – nieznane (`catch`). Nie jest kwotą (poza `AMOUNT_FIELDS`); w historii i konfliktach
  „Oprocentowanie (% rocznie)”; w `docs/format-folderu.md`. Silnik (`computeFleet`) i wyrocznia go nie czytają – test:
  ten sam stan silnika z polem i bez niego.
- **T485** Prognoza wieloletnia (1.17.0, R2 – AP-44, D99: bez IKE / IKZE / PPK – F32 odrzucone, D88): `calc/forecast.ts`
  `forecast` – czysta, deterministyczna, 1–10 lat (`FORECAST_YEARS`), trzy scenariusze (ostrożny, bazowy, optymistyczny).
  **Rok 1 to kurs na 12 miesięcy** (`course` z tym samym wejściem `courseInputOf` – stan silnika teraz, resztka miesiąca
  z energii, boje, spłaty pożyczek udzielonych; wpływy z pracy – mediana 12 miesięcy jak kurs „bez wypłat z XTB”, dostawy
  scenariusza); test: 12 pierwszych miesięcy = miesiące kursu. Każdy następny rok – te same reguły miesięcy kursu (pensja
  z osłon 1. dnia, raty celów, koszty po średniej, dokowanie D13) od końca roku poprzedniego, z założeniami roku: wpływy
  z pracy × (1 + wzrost)^(rok − 1), koszty i pensja planu × (1 + inflacja)^(rok − 1) (pensja płaci koszty – jak propozycja
  pensji ze średnich kosztów; cele warstw rosną z nią), dostawy z ICTTJ rocznie ÷ 12 co miesiąc – **tylko założenie
  kapitana** (domyślnie „bez dostaw”; prognoza nie czyta ICTTJ ani wyników tradingu), wydatki jednorazowe rocznie
  w ostatnim miesiącu roku z osłon (kadłub, gdy brakuje – jak zakup manewru), w cenach dziś (× inflacja). Boje w swoich
  miesiącach na cały horyzont (roczna co roku, kwoty bez inflacji – wpisane przez kapitana), jak w kursie.
- **T486** Prognoza – pieniądze poza warstwami kursu, ładownia i pożyczki (1.17.0, R2 – AP-44): reszta warstw (energia,
  zbiorniki, depozyt domowników, łupy, cele bez pobierania) zostaje na stanie dziś – zbiorniki na koniec roku w tym samym
  punkcie cyklu, płatności opłat są w średnich kosztach; minus to, co resztka miesiąca jeszcze wyda z energii
  (`min(needs, left)` – T390) i ze zbiorników (opłaty tego miesiąca – `feesDue`, wydzielone z `restNeeds` bez zmiany jego
  wyniku). Pożyczka udzielona: raty harmonogramu nieopłacone wracają w swoich miesiącach (zaległa – w tym, jak kurs),
  należność maleje o nie. Pożyczka wzięta: rata to opłata ładowni – w roku 1 w średnich kosztach (reguła kursu), od roku 2
  w miesiącach harmonogramu, a koszty bez części, którą średnia ma z rat (`loanCosts`: płatności kontenerów pożyczek
  wziętych w miesiącach średniej ÷ ich liczba, także spłaconej już pożyczki; przyjęte koszty – 0) – inaczej po ostatniej
  racie prognoza płaciłaby ją dalej. Dług na koniec roku – jak zasięg kursu (dług minus raty do miesiąca).
  **Przegląd R2 (zmienia zdanie o racie w roku 1; także kurs):** pożyczka wzięta bez kontenera (spłata z osłon) w roku 1
  nie wychodziła z pieniędzy, a dług malał – siła floty rosła o raty. Teraz rata każdej pożyczki wziętej wychodzi w swoim
  miesiącu w każdym roku, w kursie też (`courseInputOf` → `extras`; zaległa – w tym miesiącu; rata tego miesiąca pożyczki
  z kontenerem w ładowni to jego termin w `restNeeds`, nie drugi raz), a miesiące kursu i prognozy wydają średnie koszty
  bez części, którą są płatności kontenerów pożyczek wziętych (`CourseInput.loanCosts`; kontenery z `courseInputOf`,
  indeks płatności kontenerów po miesiącu raz na listę operacji – `containerCostsByMonth`, jak `costsByMonth`). Zasięg
  i cel kadłuba w kursie czytają średnią całą (Mostek), od roku 2 prognozy – koszty roku bez rat. Testy: kurs = silnik
  w miesiącu z ratą (spłata z osłon i rata z kontenera), scenariusz recenzji (12 000 zł, 12 rat: siła floty 8 000 zł po
  roku, nie 20 000).
  **Przegląd R2, runda 2 (zmienia „rata tego miesiąca … w `restNeeds`” i „od roku 2 – koszty roku bez rat”):**
  (1) stan opłat (`cargoStatuses`) pomija kontenery pożyczek, więc `restNeeds` raty tego miesiąca nie miał – rata
  z kontenera znikała z kursu (a dług malał). Pieniądze pożyczek idą teraz osobno od boi: `CourseInput.loanFlows`
  (`loanFlowsOf` – na miesiąc `out` – rata operacją pożyczki, z osłon; `cargo` – rata kontenera w ładowni, z energii
  miesiąca ponad nią z osłon, jak `spendEnergy` silnika; `back` – rata pożyczki udzielonej wraca do osłon, bez dokowania
  – T70); rata kontenera tego miesiąca (także zaległa) – w resztce miesiąca razem z `energy.needs` (`restEnergy`, ta sama
  liczba w prognozie: „wyda z energii”). (2) Przyjęte koszty (`costs.source` 'assumed') zastępują średnią – mają w sobie
  ratę: `loanCosts` = rata każdego kontenera pożyczki wziętej w ładowni (niezarchiwizowanego, przed końcem) w tym
  miesiącu (albo w pierwszym, gdy zaczyna się później) – inaczej miesiąc wydawał przyjęte koszty całe i ratę. (3) Od
  roku 2 prognoza podaje kursowi całą średnią × inflacja i `loanCosts` = cała − wydatki bez rat: cel kadłuba i zasięg jak
  w roku 1 (Mostek), bez skoku na granicy roku. (4) Rata wzięta i spłata udzielona w jednym miesiącu nie znoszą się
  (dawniej jedna suma `extras` – kurs nie widział ani raty, ani spłaty, a silnik płaci z osłon/kadłuba i oddaje do osłon):
  najpierw płatności (najniższy punkt po nich), potem to, co wraca. Testy: `forecast-r2-review2.test.ts` (kurs = silnik
  w listopadzie z ratą kontenera i w grudniu z ratą i spłatą, przyjęte koszty, cel kadłuba roku 2).
- **T487** Siła floty netto na koniec roku (1.17.0, R2 – AP-44): jak przegląd roczny (F24, T449) – pieniądze na kontach
  (osłony, kadłub i cele z kursu + reszta warstw – T486 – minus rezerwa podatkowa: PIT-38 płatny w ciągu roku) + należności
  (saldo domowników jak dziś, pożyczki udzielone jeszcze otwarte) − dług − **wszystkie braki dotąd** (`short` kursu:
  miesiąc kończy osłony na zerze, a tego, czego zabrakło, kapitan i tak nie ma – siła floty może spaść pod zero). „Teraz”
  = konta + należności − dług (test: = przegląd roczny przez `netAdjustments`). Wynik też: miesiąc osiągnięcia każdego celu
  (pierwszy w całej prognozie; pełny teraz – „teraz”), „Osłony do zera” – pierwszy miesiąc z najniższym punktem osłon 0
  (resztę płaci kadłub albo brakuje), „Brakuje na koszty od” – pierwszy miesiąc z brakiem (resztka tego miesiąca – „teraz”),
  zasięg na koniec roku. **Przegląd R2:** „Osłony do zera” – „teraz”, gdy resztka tego miesiąca je opróżnia (najniższy
  punkt osłon w resztce – `Course.restLow`: po tym, co płaci z nich, przed tym, co wpływa), spójnie z „Brakuje na koszty od”.
- **T488** Założenia scenariuszy w `fi.json` (1.17.0, R2 – AP-44; addytywnie, bez podbijania `SCHEMA_VERSION`):
  `settings.intel.forecast.{cautious|base|optimistic}` = `{ wages, inflation, deliveries, oneOff }` (procenty rocznie
  od −50 do 100; grosze ≥ 0), brak scenariusza – jego założenia domyślne (`FORECAST_DEFAULTS`: ostrożny 0 % / 5 %, bazowy
  4 % / 3 %, optymistyczny 7 % / 2,5 %, bez dostaw i wydatków jednorazowych); pole spoza zakresu – cały scenariusz
  domyślnie (`.catch(undefined)`), nieznane pola zachowane (`z.looseObject`). W `fi.json`, nie na komputerze: założenia to
  plan kapitana jak plan miesiąca i CPI wpisane ręcznie (`settings.intel.cpi`) – mają być te same na każdym komputerze
  i w folderze na OneDrive; zmiana przez scalanie trójstronne jak inne ustawienia (nazwy pól w `merge.ts`, kwoty
  w `AMOUNT_FIELDS`, opis w `docs/format-folderu.md`). Liczba lat na ekranie (3 / 5 / 10, domyślnie 5) to wybór widoku –
  na tym komputerze (`localStorage`, jak linia majątku). Pole zapisuje po wyjściu z pola; „domyślne” pod zmienionym
  scenariuszem z „Cofnij” (cofa tylko, gdy scenariusz nadal jest domyślny – AP-22). **Przegląd R2 (zmienia „pole spoza
  zakresu – cały scenariusz domyślnie”):** scenariusz nieczytelny zostaje w pliku w swojej postaci (schemat
  `z.union([założenia, z.unknown()])` – następny zapis `fi.json` go nie gubi), prognoza liczy go z założeniami domyślnymi
  i mówi to pod tabelą założeń (`unreadableScenarios`), „domyślne” jest i pod nim. Pola kwot odmawiają ponad granicę
  schematu (`FORECAST_MAX_AMOUNT` – 100 000 000 zł) z komunikatem, procenty – zakres schematu (`FORECAST_PCT_RANGE`), nic
  nie zapisuje się po to, by przy odczycie wrócić do domyślnych. Pola nowszej wersji w scenariuszu (obok czterech) zostają:
  zapis pola zmienia tylko cztery, „domyślne” zapisuje założenia domyślne obok nich (bez nich – scenariusz znika), „Cofnij”
  przywraca scenariusz w całości (gdy nadal jest taki, jak „domyślne” go zostawiło).
- **T489** Zaokrąglenia i ekran prognozy (1.17.0, R2 – AP-44): każda kwota roku zaokrąglana raz do grosza (`Math.round`)
  od dzisiejszej – czynnik roku jako liczba zmiennoprzecinkowa, nigdy zaokrąglona kwota roku poprzedniego × wzrost (test:
  rok 4); dostawy rocznie ÷ 12 do grosza (rok może różnić się od wpisanej kwoty o kilka groszy); pensja, koszty, wpływy
  i wydatek jednorazowy roku – tak samo; dalej grosze jak w kursie. Wywiad – panel „Prognoza wieloletnia” pod kursem na
  12 miesięcy: siła floty netto teraz i na końcu horyzontu w każdym scenariuszu, wykres SVG (bazowy – ciągła jasna linia,
  ostrożny i optymistyczny – przerywana i kropkowana, pasmo między najniższym a najwyższym, legenda, dymki punktów), tabela
  lat (dymek: konta, warstwy, należności, dług, braki, wpływy, koszty, zasięg), wiersze celów, „Osłony do zera”, „Brakuje
  na koszty od”, zasięg na koniec, tabela założeń do edycji i podpis „Prognoza – nie gwarancja. Założenia: …” z założeniami
  każdego scenariusza, zasadą roku 1 i granicą ICTTJ. Ukryte kwoty (Ctrl+$) – maska w tabeli, polach, dymkach i na osi.
- **T490** Sankey miesiąca – liczby (1.17.0, R2 – AP-46; zmienia „Sankey – nie” z T294): wykres tylko układa liczby,
  które już są (`calc/sankey.ts`), nic nie liczy od nowa. Dwa widoki: „Przychód i koszty” – przychody z pracy i dostawy
  z ICTTJ (praca i trading netto z Bilansu paliwa), zwroty ponad zakupy kategorii (część kosztów poniżej zera – źródło,
  nigdy wstęga ujemna) i – gdy koszty były wyższe od przychodu – „Z osłon i kadłuba” (na czerwono) → „Miesiąc” → kategorie
  główne pod nagłówkami „Koperty codzienne” (z „Bez kategorii” – pula codzienna), „Koperty planowe”, „Bez koperty”
  (wiersze debriefingu), „Ładownia” i „Dołożone do okrętu” (na zielono); bilans = przychód − koszty netto debriefingu
  (= Bilans paliwa, te same operacje do dnia budżetu – AP-36). Pod nagłówkiem „Poza przychodem i kosztami” – od źródła
  prosto do celu, obok miesiąca: zakupy ze środków celów, zakupy domowników (`financed` debriefingu), wpłaty domowników
  (to, czego `incomeParts` nie liczy jako przychód, bez pożyczek i puli „Podatek”: zaliczki z księgi domowników do
  depozytu, reszta do osłon i kadłuba), pożyczki (wypływy; wpływy do długu – `loanBacks`, odsetki są przychodem – T70),
  przelewy własne poza budżet i spoza niego (dwustronny – nic; para jednostronnych w budżecie – netto) i dopłaty do XTB
  ponad wypłaty miesiąca (trading netto poniżej zera – N4). „Pensja i energia” – energia debriefingu: pensja od siebie
  i łupy poprzedniego miesiąca → energia → odkładki do zbiorników, raty celów, wydane (z energii i ponad nią), zostało;
  wynik energii poniżej zera – źródło „Ponad energię – z osłon”. Poza wykresem: pula „Podatek” i PIT-38 (poza budżetem),
  korekty sald, wpływ ujemny. Miesiąc w toku – do dziś, nazwy „(do dziś)”, „Ponad koszty (do dziś)” zamiast „Dołożone”.
  Kategorie poniżej 1% wszystkich pieniędzy wykresu – „Pozostałe” swojej grupy (z nazwami w dymku), gdy są co najmniej
  dwie. Test: każdy węzeł zbilansowany, koszty, przychód, bilans paliwa i energia co do grosza
  (`tests/unit/sankey-ap46.test.ts`). Przegląd R2: czerwony „Z osłon i kadłuba” przy miesiącu to tylko jego deficyt (= Bilans
  paliwa na minus) – pożyczki, przelewy i dopłaty do XTB z osłon mają własne źródło „Z osłon i kadłuba” pod nagłówkiem
  „Poza przychodem i kosztami”; w kolumnie najpierw przepływy miesiąca (kategorie, Ładownia, okręt), potem ten nagłówek,
  jego źródła w kolejności swoich celów – wstęgi się nie krzyżują; „Dostawy z ICTTJ (netto)”, gdy miesiąc miał dopłaty
  do XTB; „Pensja i energia” – część ujemna (zwroty ponad wydatki, zwrot odkładek albo rat, pensja lub łupy poniżej zera)
  po drugiej stronie pod własną nazwą, więc węzeł energii zawsze zbilansowany. Własność „każdy węzeł zbilansowany, sumy
  = debriefing i Bilans paliwa, wstęgi bez krzyżowania” – na losowych miesiącach (`tests/unit/sankey-r2-review.test.ts`).
- **T491** Sankey miesiąca – wygląd (1.17.0, R2 – AP-46): własne SVG bez biblioteki (`shared/sankeyLayout.ts` – ta sama
  geometria na ekranie i w PDF): trzy kolumny (skąd, miesiąc / energia, dokąd), słupek i wstęga proporcjonalne do kwoty,
  wstęga „poza przychodem i kosztami” przechodzi pod węzłem miesiąca (niewidoczny węzeł kolumny), etykiety z kwotą
  (źródła po lewej, reszta po prawej, za długa – ucięta „…”), nagłówki grup z sumą. Wstęgi i słupki szare, akcent tylko
  pod wskaźnikiem, zieleń / czerwień tylko dla kwot na plus / minus, kwoty `.num`, bez gradientów i cieni; dymek – nazwa,
  kwota i procent wszystkich pieniędzy wykresu. Ukryte kwoty (Ctrl+$) – kwoty `•••`, miejsca na etykiety liczone z
  prawdziwych kwot, więc słupki się nie ruszają. Miejsce: Raporty → Debriefing, pod „Wynik wobec planu”, miesiąc z
  wyboru debriefingu, widok przełącznikiem (domyślnie „Przychód i koszty”, wybór do zmiany ekranu). PDF debriefingu –
  oba widoki po „Wyniku wobec planu”, jasne barwy druku, prawdziwe kwoty (D73; `ReportSection.svg`). Okno węższe niż
  640 px przewija wykres w bok; Raporty nie są na telefonie (D92). Przegląd R2: za długa etykieta (ekran i PDF) traci
  koniec nazwy, nigdy kwotę (`labelText`); układ liczony raz na przepływy i szerokość (`layoutOf`) – ruch wskaźnika tylko
  rysuje.
- **T492** Kwota w walucie – dane (1.17.0, R2 – AP-48; „kwoty tylko w PLN” bez zmian): pole operacji `foreign`
  (`{ amount, currency }`, addytywnie, bez podbijania `SCHEMA_VERSION`; starsza wersja je zachowuje – `looseObject`) –
  tylko informacja dla użytkownika (wyjazd). `amount` – setne części jednostki waluty dla każdej waluty (jak grosze:
  45,00 EUR = 4500, także waluty bez groszy – 1 500 JPY = 150000; waluty z trzema miejscami zaokrąglane do setnych),
  zawsze powyżej zera – kierunek daje kwota operacji; `currency` – kod ISO 4217 (trzy wielkie litery); wartość, która
  nimi nie jest, jest pomijana (`catch`), operacja zostaje. Silnik, warstwy, sumy, raporty i kwoty w złotych eksportów
  go nie czytają (test: ten sam stan silnika z polem i bez). Kurs = złote ÷ kwota w walucie, tylko pokazywany (cztery
  miejsca, „kurs 4,3000 zł za 1 EUR”), nigdzie nie zapisywany. Historia i konflikty: polskie nazwy pól, kwota jak pole
  ją pisze („45,00”, ukryta z kwotami – `ValueText.foreign`), nigdy setne ani złote. Duplikat usunięty przy imporcie oddaje
  ją zostającej operacji (`takeUserData`), jak notatkę. Przegląd R2: ścieżka kwoty w walucie – ta sama reguła co kwot
  w groszach (`FOREIGN_AMOUNT_FIELDS` obok `AMOUNT_FIELDS`, jedno dopasowanie ścieżek).
- **T493** Kwota w walucie – okno (1.17.0, R2 – AP-48): edytor operacji (każdy rodzaj) i szybki wpis (także na
  telefonie) – przy kwocie zwinięte „+ kwota w walucie” (klik; poza kolejnością Tab – od kwoty do kontrahenta dalej
  jeden Tab, AP-20, AP-34); rozwinięte: kwota (wpisywana jak złote), kod waluty (lista częstych, dowolne trzy litery;
  małe litery – wielkimi; PLN albo nie-kod – odmowa jak przy kwocie, zostaje poprzedni – AP-15), kurs i „×” (bez kwoty
  w walucie). Nowa kwota zaczyna od waluty ostatniej operacji z kwotą w walucie (wyjazd trwa), bez
  niej – EUR; rozwinięte bez kwoty – szkic okna (AP-8), w szybkim wpisie „Zapisz i następny” zostawia walutę rozwiniętą.
  Lista Operacji – plakietka „45,00 EUR” w oznaczeniach (dymek z kursem), na telefonie dopisek w drugiej linii karty.
  Wyszukiwanie – po kodzie waluty i po kwocie w walucie („45,00”). Eksport CSV i Excel „Operacje” – kolumny „Kwota
  w walucie” (ze znakiem kwoty w złotych) i „Waluta” na końcu (wcześniejsze kolumny na swoich miejscach); „Części” bez
  zmian. Ukryte kwoty (Ctrl+$) maskują też kwotę w walucie.
- **T494** Import z mBanku a kwota w walucie (1.17.0, R2 – AP-48): znane formaty (`tests/fixtures/mbank`, `parseMbank`)
  nie mają kwoty w walucie oryginalnej przy płatności kartą za granicą z rachunku w złotych – kolumna kwoty jest w walucie
  rachunku; wiersz w innej walucie (rachunek walutowy) jest pomijany jak dotąd („kwota w EUR – FI prowadzi tylko PLN”).
  Import nic nie zapisuje w `foreign` i nie zgaduje kwoty z opisu – do zrobienia, gdy pojawi się zanonimizowany plik
  z taką płatnością, w którym bank ją podaje.
- **T495–T518** Ciąg GA–GC (1.17.1–1.18.1): GA (1.17.1, T495–T503) – terminy naprzód po końcu miesiąca, filtr daty przy
  zmianie ceny w Ładowni, boja roczna i zrealizowane cele w prognozie, ukryty `containerId` tylko dla kosztów, wykrywanie
  i odblokowywanie plików tylko do odczytu, bezpieczne „Cofnij” odmawiające nadpisania zmienionego wpisu, duplikaty między
  kontami różnych formatów, zachowanie `shares` przy zbiorczej decyzji domownika; GB (1.18.0, T504–T511) – zachowanie
  nieznanych pól reguł (`keptField`), audyt reguł dla zamkniętych/usuniętych pożyczek, `impliedLoanRate` z harmonogramu,
  rozpoznawanie PIT-38, wzorce regex z wiersza z `\d+`, ręczna kolejność reguł warunkowych; GC (1.18.1, T512–T518) –
  wykres Sankey w Planie miesiąca (`planSankey`), nazwa pożyczki na Radarze telefonu i własna godzina odprawy, części
  spłat pożyczek w eksporcie CSV/Excel, uporządkowanie edytora operacji, tagów i kontrastu skrótu „Ctrl K”.
- **T519** Nadwyżka przelewu domowników w silniku (`calc/household.ts`, 1.19.0, D102): czyste funkcje `surplusView`,
  `sharesOf`, `evenShares`, `debtShares`, `shareMax`, `fitShares`, `writeSurplus`, `loanPart`, `memberPartLines`.
  Zapis bez migracji schematu: część innego domownika to linia spłaty jego długu (`advance: false`, bez `inflowKind`)
  oraz – gdy ma nadwyżkę z wybranym celem – druga linia z `inflowKind: 'income' | 'advance'` (`advance: as === 'advance'`);
  dla osoby z ustawieniem „pytaj” przed wyborem celu nadwyżka zostaje na linii spłaty (w silniku liczona jako przychód do
  chwili wyboru). Domownik bez długu (`owed === 0`) zachowuje `id` i notatkę swojej linii na linii nadwyżki oraz z powrotem
  przy powrocie nadwyżki do 0 zł (historia i powiązania nie giną).
- **T520** Przekazanie nadwyżki osoby na spłatę pożyczki udzielonej (`loanPart` w `calc/household.ts`, 1.19.0, D100, D102):
  przepisuje wyłącznie linie tej osoby (lub zmniejsza resztę nadawcy), dopisując linię `loanId` do wysokości otwartego długu
  pożyczki; zaniżone poniżej długu części innych osób w tym samym przelewie pozostają nietknięte (nic nie jest po cichu
  zabierane z reszty nadawcy).
- **T521** Nadwyżka w szybkim wpisie (`calc/quick.ts`, `QuickApp.tsx`, `quickHost.ts`, 1.19.0, D102): `quickShareAs`,
  `quickSurplusInput`, `quickPartLines`. Podział „po równo” / „proporcjonalnie do długów” zachowuje domyślne ustawienie
  `zaliczka` domownika bez oznaczania go jako ręcznego wyboru `advanceChosen` (który nadpisuje `fi.json` przy osobie
  „pytaj”) i odejmuje wpisaną kwotę spłaty pożyczki od wolnej nadwyżki. Przy osobie „pytaj” z nadwyżką ponad dług zapis
  jest zablokowany czytelnym komunikatem do czasu wyboru `przychód` / `zaliczka`, a dokonany wybór aktualizuje `fi.json`
  (`rememberInflows`).
- **T522** Pytanie „przychód czy zaliczka?” dla części „w tym za” w imporcie (`state.ts`, `DecisionFields.tsx`, 1.19.0,
  D102): wiersz/grupa/temat z nadwyżką dla domownika o ustawieniu `inflow: 'ask'` (nierozstrzygnięta linia `surplus: true`
  albo linia spłaty przekraczająca `owedLeftOfRow` bez `advanceChosen`) zatrzymuje status tematu jako `'todo'`
  (`hasUnansweredAskSurplus`) i pokazuje przyciski `pytaj: [przychód] [zaliczka]`. Wybór zamyka pytanie tematu i przy
  `runImport()` dopisuje głos do `inflowVotes` → `rememberInflows`.
- **T523** Reguły importu z „w tym za” i podziałem nadwyżki (`schema/budget.ts`, `classify.ts`, `rules.ts`, 1.19.0, D102):
  pola addytywne `ImportRule.alsoFor` (`string[]`, unikalne ULID-y domowników poza nadawcą) i `ImportRule.surplusSplit`
  (`'even' | 'debts'`), zachowywane przez `keptField` i opisane w `docs/format-folderu.md`. Reguła nigdy nie zapisuje
  stałych kwot PLN dla domowników – `choiceOf` tworzy dla każdej osoby z `alsoFor` linię `{ memberId, amount: 0, each: true }`
  (z `ask: true` dla domownika `inflow: 'ask'`), która w każdym kolejnym imporcie najpierw spłaca aktualny dług osoby.
- **T524–T526** Rozkład nadwyżki reguły i odpowiedź „pytaj” na linii reguły (`reconcile.ts`, `DecisionFields.tsx`,
  `state.ts`, 1.19.0, D102): `rowShares` wylicza długi z uwzględnieniem zakupów tego samego pliku (`owedWithFile`), najpierw
  pokrywając długi osób z `alsoFor` oraz dług nadawcy, a wolną nadwyżkę dzieli przez `surplusView` + `evenShares` /
  `debtShares` z `calc/household.ts`. Gdy brak nadwyżki, domownik „pytaj” dostaje tylko spłatę długu i temat jest `'done'`;
  gdy nadwyżka > 0, `IncomeSharesEditor` pokazuje na linii reguły (`each: true`) przełącznik `pytaj: [przychód] [zaliczka]`,
  a odpowiedź użytkownika (`advanceChosen: true`, `ask: undefined`) zachowuje `each: true`, zmienia części nadwyżki w
  `rowShares` na `inflowKind: 'income' | 'advance'`, odblokowuje temat (`'done'`) i zapisuje wybór w `fi.json`.
