# Financial Intel – zmiany

## 1.3.0

Rozliczenia z domownikami (prośba użytkownika: część wydatków finansują inne osoby, decyzja D80). Każdy domownik ma
saldo w obie strony – ile ma oddać albo ile wpłacił z góry – a jego zakupy nie są Twoimi kosztami.

- Ustawienia → Domownicy: osoby z nazwami nadawcy w banku i odpowiedzią, czym jest reszta ich wpłaty ponad to, co mają
  oddać (pytaj / zaliczka / przychód); archiwum zamiast usuwania. Zakupy oznaczone wcześniej „do zwrotu” należą do
  pierwszej osoby z listy („Dom”) – zmień jej imię, jeśli to konkretna osoba.
- Wydatek – cały albo część paragonu – „finansuje: osoba”: nie zjada energii ani kopert, nie jest Twoim kosztem ani
  naruszeniem w Dowództwie. Najpierw bierze z zaliczki tej osoby, resztę pożyczają osłony, aż odda. W edytorze, w
  szybkim wpisie („Za domownika”), zbiorczo w Operacjach („Ustaw finansującego” z „Cofnij”), w imporcie i regułach.
- Wpłata domownika najpierw wyrównuje to, co ma oddać (wskazane zakupy, inaczej od najstarszych); reszta to zaliczka
  albo przychód (dokuje jak dotąd) – pytanie raz, odpowiedź zapamiętana dla osoby. Zakup oznaczony później sam zamienia
  wcześniejszy przychód w spłatę.
- Nowa warstwa „Depozyt domowników” w stanie okrętu: ich zaliczki na Twoich kontach, nie do wydania na siebie (suma
  warstw nadal równa saldom kont).
- Mostek i Radar: saldo każdej osoby (ma oddać od kiedy, albo zaliczka); ostatnie operacje mówią, kto finansuje.
  Przypomnienie w odprawie i powiadomienie, gdy osoba nie oddała za zakup od ponad 30 dni (Ustawienia → Powiadomienia).
- Import z mBanku: wpłaty osób z listy rozpoznane po nazwie nadawcy (osoba z „pytaj” ma osobny temat do decyzji),
  „+ domownik” przy przelewie od nowej osoby; reguła zwykłego wpływu sprzed dopisania osoby ustępuje domownikowi.
- Plan miesiąca i Raporty: „Sfinansowane przez domowników – nie Twoje koszty” w debriefingu i przeglądzie rocznym;
  przychód w statystykach bez spłat i zaliczek domowników; CSV i Excel z kolumną „Finansuje”.
- Bez zmiany formatu folderu: nowe pola są dodatkowe (wersja 1.2.x otworzy folder i je zachowa).

## 1.2.3

Poprawka „Podobnych nazw” i propozycji słowa (zgłoszenie użytkownika, D79): w historii rachunku z mBanku nazwa sklepu
ma dopiski banku („Apteka Na Rynku   /Testowo    DATA TRANSAKCJI: 2026-10-01”), przez co jeden sklep rozpadał się na
wiele nazw, a niezwiązane sklepy wyglądały na „podobne”.

- Nazwa sklepu bez dopisków banku: daty transakcji i innych dat, godziny, numeru karty, „Ref”, miasta po „/” (tak, jak
  pisze je bank – małymi albo wielkimi literami, tylko w nazwie z datą transakcji) – jeden sklep to jedna grupa
  niezależnie od dnia i miasta; opis operacji z banku zostaje bez zmian (kolejne importy rozpoznają te same wiersze).
  Nazwy wpisane ręcznie („Czynsz/mieszkanie”) i przelewy na wspólne konto („JAN KOWALSKI / ANNA KOWALSKA”) zachowują
  całą nazwę. Reguły zapamiętane na nazwach z dopiskami działają dalej, także w Operacjach.
- Zwrot towaru z historii rachunku („POS ZWROT TOWARU”) ma nazwę sklepu i kategorię jego zakupów.
- Prowizja za zakup nie przejmuje decyzji sklepu ze swojego tytułu (słowo kluczowe „kebab” nie decyduje o prowizji
  banku), a bankomat i prowizja za wypłatę nie są „podobnymi nazwami”.
- „Podobne nazwy” ostrożniej: słowo z nazw wielu różnych firm (miasto, „bar”, słowa banku) nie łączy nazw; tylko
  pojedyncze „Połącz” dla każdej pary (bez „Połącz wszystkie”). Ustawienia → Import z banku → „Połączone nazwy”:
  połączenia z 1.2.2 zrobione na nazwach z datą są oznaczone jako nieaktywne – „Usuń nieaktywne”; do tego „Rozłącz
  wszystkie”, oba z „Cofnij”.
- Propozycja słowa bez słów banku, słów prawie wszystkich nazw pliku i pośrednika płatności przed nazwą sklepu
  („SumUp *…”, „PayPro *…”); słowo z końcówką tylko polską („kurs” → „kursy”, ale nie „roma” → „roman”); zbyt ogólne
  słowo kluczowe („data”, „sklep”) jest odrzucane z wyjaśnieniem.

## 1.2.2

Import z mBanku uczy się dalej (decyzja D78 – pomysły 5 i 6 z propozycji, nadal bez AI).

- „Podobne nazwy”: nazwy spoza słownika sieci, które wyglądają na jedną firmę albo osobę – inna kolejność słów („JAN
  NOWAK” i „NOWAK JAN”), jedno słowo więcej („MOKKA” i „KAWIARNIA MOKKA”), ucięta nazwa, literówka, ta sama nazwa na
  początku („MOKKA DWORZEC”, „MOKKA GALERIA”) – także z markami Twoich reguł z wcześniejszych importów. Nic nie łączy
  się samo: „Połącz” (jedna grupa i jedna reguła, także w kolejnych importach i w Operacjach) albo „To nie to samo”
  (para nie wraca); „Połącz wszystkie” i „Cofnij”.
- „Połącz nazwy” dla zaznaczonych grup – gdy podobieństwo nie wystarcza; dwie różne sieci ze słownika nie łączą się.
- Ustawienia → Import z banku: lista połączonych nazw z „rozłącz” i powrót odrzuconych par.
- Propozycja reguły: po Twojej decyzji dla grupy słowa z jej nazwy (przy przelewie – z tytułu), które mają też inne
  operacje pliku, z liczbą operacji, które reguła zmieni („„kurs” · jeszcze 3 operacje”); kliknięcie = Twoje słowo
  kluczowe z całą decyzją, plik liczony od nowa od razu. Bez nazw miejscowości, imion i nazwisk, bez słów, które
  złapałyby inne słowa („auto” – „AUTOMATSPEC”).

## 1.2.1

Import z mBanku w tematach zamiast dziesiątek grup (zgłoszenie użytkownika, decyzja D75) – bez AI, na stałych listach.

- Jedna sieć to jedna grupa: klucz marki bez miasta, numeru sklepu, operatora płatności („SumUp *”, „PAYPRO SA *”) i
  końcówki domeny („ALLEGRO.PL”, „Allegro” i „PAYPRO SA *ALLEGRO” razem).
- Słownik ponad 200 sieci i usług z kategoriami (Biedronka, Lidl, Żabka, Orlen, McDonald's, Netflix, PKP…) i 30 słów
  kluczowych nazwy albo tytułu („apteka”, „stacja paliw”, „weterynarz”, „parking”, „kolacja” w tytule przelewu);
  własne słowa kluczowe w Ustawieniach → Import z banku i na ekranie importu.
- Tematy: grupy z tą samą kategorią (albo tą samą podpowiedzią mBanku, tym samym rodzajem operacji) pod jednym
  tematem – decyzja tematu obejmuje wszystkie jego marki; sekcje „Do decyzji”, „Rozpoznane – sprawdź”, „Gotowe”.
- „Przyjmij pewne”: rozpoznane tematy jako Twoja decyzja, zapamiętane jako reguły marek – kolejny import pokaże je jako
  gotowe; „Przyjmij podpowiedzi mBanku” działa na całe tematy (bez reguł).
- Wyszukiwarka (nazwa, tytuł, kategoria, data, kwota), zaznaczanie grup i operacji (także „zaznacz znalezione”),
  jedna decyzja dla zaznaczonych i „Nie importuj” – pominięte operacje wrócą z kolejnym plikiem; wyszukiwane słowo
  można zapamiętać jako słowo kluczowe dla kolejnych importów.
- Operacje: zaznaczanie (ręcznie albo wszystkie widoczne po wyszukiwaniu i filtrach) i jedna kategoria dla
  zaznaczonych z „Cofnij” – z zapamiętaniem dla marek albo wyszukiwanego słowa.
- Reguły uczą się po marce (sieć w każdym mieście to jedna reguła), reguły sprzed 1.2.1 działają dalej.
- Bez podwójnych wpisów (jak w ICTTJ): operacja wpisana ręcznie łączy się z importem także pod inną nazwą albo przy
  kwocie różnej o grosze („możliwy duplikat” – pewne łączone same, niepewne do zaznaczenia); panel „Duplikaty operacji”
  scala zapisane już podwójnie (wpis ręczny + kopia z banku, ten sam wiersz banku z dwóch komputerów – zostaje nowszy)
  z jednym „Cofnij” i „to nie duplikat”; w Operacjach odnośnik „Możliwe duplikaty”.

## 1.2.0

Gra i wywiad (grupa D: etapy E7 i E8) – Dowództwo ocenia każdy dzień, a Wywiad i Raporty czytają strukturę własnych
pieniędzy w języku ICT. Asystent AI nie powstanie (decyzja D74) – plan etapów jest zamknięty.

- Dowództwo (Ctrl+8): każdy dzień od startu gry (pierwszy pełny dzień po uruchomieniu tej wersji) oceniany według
  rozkazów i zamrażany 24 h po swoim końcu – późniejsza korekta zmienia budżet, nie ocenę. Naruszenia zwykłe
  (przydział dnia, koperta, ładunek ponad linią) i poważne (koperta ponad 20%, osłony poniżej minimum z decyzji,
  dopłata do XTB wbrew firewallowi, zakup w ciszy nocnej).
- Stopnie Kadet → Chorąży → Porucznik → Komandor → Kapitan → Admirał: awans po 30 dniach zgodnych w ostatnich 35
  (wykonana misja = 3 dni), degradacja przy 3. poważnym naruszeniu w miesiącu; klasa okrętu z zasięgu; seria i rekord;
  ekran awansu z animacją i dźwiękiem; progi gry do zmiany w Dowództwie.
- Misje tygodniowe dobierane do słabego punktu z ostatnich 4 tygodni (także w odprawie), 13 ukrytych osiągnięć,
  dziennik wachty.
- Smaczki ICT: Silver Bullet (krótka odprawa 10–11 czasu NY), Premium / Discount na kopertach (linia Equilibrium),
  Draw on Liquidity na Mapie gwiezdnej, Judas Swing, Turtle Soup i Liquidity sweep w dzienniku wachty, Order Block
  (ładownia) w wydatkach.
- Wywiad (Ctrl+9): krzywa majątku tydzień po tygodniu z drawdownem i BOS / CHoCH, Killzones wydatków, FVG kopert,
  wydatki w czasie, prognoza zasięgu bez wypłat, trafność dziennika kapitańskiego.
- Raporty (Ctrl+0): odprawa, raport wachty (powiadomienie w niedzielę od 18:00), debriefing i przegląd roczny do PDF;
  eksport CSV i Excel (operacje, miesiące) oraz pełna kopia danych w ZIP – zawsze z prawdziwymi kwotami.

## 1.1.0

Przepływy z zewnątrz (grupa C: etapy E5 i E6) – wypłaty z ICT Trade Journal dokują do budżetu, a Radar pokazuje, co
nadciąga w ciągu 90 dni.

- ICTTJ (Ustawienia → ICTTJ): FI czyta folder danych ICT Trade Journal tylko do odczytu (wypłaty i cele prognozy),
  z obserwacją zmian; folder podpowiadany z ustawień ICTTJ na tym komputerze albo wskazany ręcznie, osobno na każdym
  komputerze; nowszy format ICTTJ albo nieczytelny plik – ostrzeżenie, nie błąd. „Otwórz ICTTJ” w menu bocznym
  (zainstalowany ICTTJ znajdowany sam, wersja portable wskazana raz).
- Dokowanie: wypłata z ICTTJ łączona z wpływem od XTB w mBanku (ta sama kwota, do 3 dni roboczych), bez pary –
  propozycja Portfela XTB; okno dokowania z podziałem według kolejności (osłony → kadłub → cele) do zmiany przed
  zapisem, z animacją i dźwiękiem, „Cofnij”; pula Cele prosto do celów, pula Podatek poza kosztami; wpływ z XTB bez
  wpisu w ICTTJ – przypomnienie; wypłaty sprzed startu budżetu pominięte; powiadomienie „Nowa wypłata w ICTTJ do
  zadokowania”; Mostek → panel „Dokowanie”.
- Mapa gwiezdna (Ctrl+6): cele z prognozy ICTTJ (tylko do odczytu) i własne na jednej liście priorytetów
  (przeciąganie), postęp, termin, ETA z tempa ostatnich 6 miesięcy, archiwum.
- Radar (Ctrl+7): 90 dni – pensje, opłaty okresowe ze stanem zbiorników, raty i spodziewane spłaty pożyczek (zaległe
  oznaczone), PIT-38 od 1 lutego do 30 kwietnia (bez kwoty – kwota jest w ICTTJ).
- Pożyczki w obie strony z harmonogramem rat: udzielona – należność, spłaty wracają do osłon; wzięta – raty jako
  kontener ładowni na czas spłaty, dług odejmowany od zasięgu (Mostek, symulacja Ładowni); spłata, zamknięcie; w
  edytorze operacji wybór pożyczki.
- Odprawa i powiadomienia: zaległa rata po 3 dniach, PIT-38 14 i 3 dni przed terminem, należność domu starsza niż
  30 dni – powiadomienia z przełącznikami (Ustawienia → Powiadomienia i dźwięki).
- Poprawka: pole kwoty nie zabiera już fokusu następnemu polu, gdy okno odświeża się z opóźnieniem (np. tuż po
  pokazaniu) – wpisana tam wartość nie trafia do kwoty.

## 1.0.0

Pierwsza wersja do codziennego użytku (grupa B: etapy E3 i E4) – budżet startuje z kreatora, a codzienność obsługują
Mostek i szybki wpis.

- Kreator startu: salda kont teraz, import historii z mBanku, pensja od siebie ze średnich kosztów, cele osłon
  i kadłuba, stałe opłaty wykryte w historii jako kontenery ładowni, koperty ze średnich, podział obecnych środków na
  warstwy, nazwa okrętu, rozkazy, skrót szybkiego wpisu i start z Windows. Pierwszy miesiąc liczy pensję bez wydatków
  sprzed startu.
- Plan miesiąca (Ctrl+4): pensja z propozycją, podział na ładownię, odkładki i koperty planowe oraz codzienne, energia
  na dziś, koperty wobec limitów, debriefing (plan i fakt), „Miesiąc zamknięty na plus” i podział łupów do 7. dnia.
- Ładownia (Ctrl+5): kontenery (stałe, abonamenty, raty, opłaty okresowe) z odbiorcą w banku, linia zanurzenia,
  zbiorniki odkładek, symulacja dodania i zrzutu kontenera, propozycje z historii; import i Operacje łączą płatności
  z kontenerem.
- Mostek (Ctrl+1): odprawa z energią na dziś, Daily Bias, alarmami, asteroidami, zaległym importem i saldami do
  potwierdzenia („Odsłuchaj” głosem systemu); stan okrętu, koperty, należność domu, ostatnie operacje. Odprawa, stan
  okrętu i koperty mogą działać w osobnym oknie na drugim monitorze.
- Szybki wpis (Ctrl+Alt+B w całym systemie): małe okno nad wszystkimi programami – kwota, kontrahent z podpowiedzią
  kategorii, podział paragonu, do zwrotu, wpływ od domownika; podgląd energii przed zapisem, cisza nocna z
  potwierdzeniem, dziennik kapitański. Enter zapisuje, Esc zamyka.
- Zasobnik: energia na dziś w dymku; menu z szybkim wpisem i raportem wachty dnia.
- Ukrycie kwot (Ctrl+$): w oknie, dymku zasobnika, powiadomieniach i oknach odłączonych.
- Powiadomienia Windows (odprawa, wieczorne dopisanie wydatków, energia i koperty, przekroczenia, opłaty okresowe,
  zaległy import, salda, debriefing) i dźwięki zdarzeń – każde z przełącznikiem, osobno na każdym komputerze
  (Ustawienia → Powiadomienia i dźwięki).
- Ustawienia → Warstwy i rozkazy: cele osłon i kadłuba, minimalne osłony, linia zanurzenia, cisza nocna, próg dziennika
  kapitańskiego, firewall.
- Przejazdy: nowa podkategoria Auto · przejazdy; Bolt trafia do rozrywki, KOLEO do przejazdów.

## 0.3.0

Model budżetu, ekran Operacje i import z mBanku (grupa A: etapy E1 i E2).

- Operacje (Ctrl+2): wydatki, wpływy, przelewy własne, XTB, korekty; kwota, data i godzina, konto, kontrahent,
  kategoria z podkategorią, podział paragonu na kilka kategorii albo na część swoją i „do zwrotu”, zwrot należności od
  domownika, dziennik kapitański (plan / impuls, zakupy w ciszy nocnej); filtry (okres, konto, rodzaj, kategoria,
  oznaczenia), wyszukiwanie bez polskich znaków i po kwocie, sumy i salda kont; historia zmian, usuwanie z „Cofnij”,
  Ctrl+N.
- Ustawienia → Konta: mBank i Portfel XTB z saldem otwarcia; „Saldo w banku teraz” potwierdza saldo albo dodaje
  korektę do wyjaśnienia.
- Ustawienia → Kategorie: 9 kategorii z podkategoriami i „Gotówka”, koperta codzienna albo planowa, archiwizacja.
- Import z mBanku (Ctrl+3): plik CSV z listy operacji albo historii rachunku; ponowny import bez duplikatów,
  transakcje nierozliczone rozliczane, wpisy ręczne łączone z wierszami banku (kwota, ±3 dni, kontrahent);
  kategoryzacja grupami po kontrahencie z regułami, które uczą się z Twoich decyzji; rozpoznawanie XTB, przelewów
  własnych, bankomatu i zwrotów towaru; kategoria mBanku tylko jako podpowiedź; operacje usunięte przez Ciebie nie
  wracają; kopia zapasowa przed każdym importem; saldo z banku na koniec.
- Ustawienia → Import z banku: zapamiętane reguły i nazwiska właściciela rachunku.
- Silnik warstw (osłony, kadłub, cele, energia, ładownia, odkładki, łupy) liczy stan okrętu z operacji – ekrany pokażą
  go w wersji 1.0.0 (Mostek, Plan miesiąca, Ładownia).

## 0.1.0

Fundament aplikacji (etap E0).

- Pierwsze uruchomienie: wybór folderu danych – propozycja `OneDrive\FinancialIntel` jednym kliknięciem, albo własny
  folder (nowy lub istniejący z innego komputera).
- Folder danych jak w ICT Trade Journal: zapis atomowy, historia zmian każdego wpisu, scalanie zmian z drugiego komputera,
  rozwiązywanie konfliktów OneDrive (strona Synchronizacja), codzienna kopia zapasowa (30 ostatnich) i kopia ręczna.
- Menu boczne z wszystkimi ekranami (puste – wypełnią je kolejne etapy), panele: zwijanie, powiększanie, ukrywanie,
  zmiana wysokości i szerokości, osobne okno na drugim monitorze, zapisane układy.
- Paleta komend (Ctrl+K), skróty Ctrl+1…0 dla ekranów, ściąga skrótów (F1).
- Zasobnik: zamknięcie okna chowa aplikację do zasobnika; start z Windows (ukryta w zasobniku) w ustawieniach.
- Aktualizacje z GitHub Releases: sprawdzanie przy starcie i co 6 godzin, pobieranie w tle, instalacja przy zamknięciu,
  sprawdzanie sumy SHA-256.
