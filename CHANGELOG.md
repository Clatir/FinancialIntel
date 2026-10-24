# Financial Intel – zmiany

## 1.15.1

Rozliczenia z domownikami: wcześniejsza wpłata na zakupy (D94).

- Wcześniejsza wpłata domownika (np. przelew na zakupy otrzymany zanim zrobisz wydatek) może teraz finansować późniejszy zakup.
- W edytorze zakupu menu „Przypisz zwrot…” pokazuje wcześniejsze wpłaty z wolną kwotą — jedno kliknięcie łączy operacje, a zakup otrzymuje status „oddane” (lub „częściowo oddane”).
- W edytorze wpłaty na liście zakupów do wskazania pojawiają się późniejsze zakupy domownika, które czekają na oddanie lub zostały sfinansowane z zaliczki tej wpłaty.
- Pieniądze ze wskazanej wcześniejszej wpłaty są rezerwowane na wskazany zakup jako celowa zaliczka w warstwie depozytu i nie są podkradane przez niepowiązane zakupy pośrednie.

## 1.15.0

Dziennik i kurs na iPhonie (grupa iC, D92): pełne Operacje i Meldunki, Plan miesiąca i Radar do edycji na telefonie.

- Operacje: „Zaznacz” – dotknięcie zaznacza operacje (także „wszystkie”), a pod listą jest pasek zmian jak na
  komputerze: kategoria (z zapamiętaniem dla importu), kto finansuje, konto, rodzaj albo data – z podglądem skutku i
  „Cofnij”. W filtrach zapisane widoki listy (te same na każdym komputerze). „CSV” i „Excel” wysyłają widoczną listę do
  udostępniania iOS – Pliki, AirDrop, poczta.
- Meldunki – także łupy do podziału, pary przelewów zapisanych jako dwie operacje (połączenie w jedną) i możliwe
  duplikaty („Pokaż i scal” – scalanie z „Cofnij”). Dokowanie i ładownia są na razie na komputerze, konflikty folderu
  rozstrzygasz na komputerze.
- Plan miesiąca do edycji: pensja, koperty, łupy, „pokryj z koperty…” i plan kampanii – na telefonie przewijany w bok, z
  nazwą wiersza zawsze na ekranie; „»” kopiuje wpisaną wartość na dalsze miesiące.
- Radar do edycji: pożyczki i ich spłaty, boje, „Zaplanuj przelew własny”. Na wąskim ekranie każde zdarzenie w dwóch
  liniach – nazwa i kwota, pod nimi rodzaj, opis i osłony po zdarzeniu.
- Na komputerze: okienka pod przyciskami (np. „+ Zapisz widok”) nie wychodzą poza okno.

## 1.14.0

Wachta na iPhonie (grupa iB, D92): operacje, meldunki, plan miesiąca i radar w telefonie.

- Operacje: lista z wyszukiwaniem (nazwa, notatka, kwota, #tag), miesiącem (‹ › albo cała historia) i filtrami – konto,
  kategoria, oznaczenia; sumy wpływów i wydatków; wieczorem raport wachty z „Dziś bez wydatków”. Dotknięcie otwiera
  edytor operacji na cały ekran – te same pola co na komputerze (kwota, data, kategoria, notatka, tagi, finansujący,
  podział paragonu…), „Historia” i usunięcie z „Cofnij”. „+ Nowa” dodaje operację.
- Meldunki z licznikiem w dolnym menu: wydatki bez kategorii (prosto do Operacji), podwójna korekta, nieznane sygnały
  („to w porządku”), wpłaty domowników do przypisania, zakupy do zwrotu, zwroty w drodze i salda do potwierdzenia – saldo
  z aplikacji banku wpisujesz w samym meldunku. Pozostałe meldunki (dokowanie, łupy, duplikaty, pary przelewów,
  ładownia) telefon policzy i odeśle na komputer.
- Plan miesiąca i Radar – podgląd: pensja, podział, koperty, debriefing, plan kampanii, 90 dni, pożyczki, boje, salda
  kont naprzód. Zmiany robisz na komputerze (na telefonie w kolejnej wersji).
- Dolne menu: Mostek, Operacje, „+ Wpis”, Meldunki, Więcej (Plan miesiąca, Radar, ustawienia telefonu). Dotknięcie
  powiadomienia otwiera jego ekran: raport wieczorny – Operacje, przekroczenia i debriefing – Plan miesiąca, dni z
  radaru – Radar, potwierdzenie sald – Meldunki.

## 1.13.0

Okręt w kieszeni (grupa iA, D92): Financial Intel na iPhonie – ten sam folder danych na OneDrive co na komputerze,
instalacja bez App Store przez AltStore (instrukcja: `docs/iphone.md` w repozytorium).

Na telefonie:
- Logowanie do OneDrive kontem Microsoft (aplikacja zarejestrowana raz w Microsoft Entra), wybór folderu danych
  (domyślnie `FinancialIntel`) i pierwsza kopia z postępem. Potem tylko zmiany, a aplikacja startuje z kopii w telefonie
  – także bez sieci.
- Mostek z tymi samymi liczbami co na komputerze: stan okrętu, energia dziś, koperty, odprawa, Daily Bias, „skąd ta
  liczba?”, ostatnie operacje, należności, przychody i krzywa majątku.
- Szybki wpis przyciskiem na dole: tagi, „za domownika”, wspólne finansowanie. Bez sieci wpis czeka w telefonie
  („offline · 1 czeka”) i wysyła się, gdy sieć wróci.
- Powiadomienia na najbliższy tydzień planowane przy każdym otwarciu: odprawa poranna (po ciszy nocnej, nie przed
  7:00), raport wachty wieczorem i dni z Radaru – opłaty, raty, boje, PIT-38 – o 9:00. To samo powiadomienie nie
  przychodzi dwa razy.
- Telefon jest dla folderu kolejnym komputerem („iPhone”, nazwę można zmienić): komputer widzi go w Synchronizacji i w
  banerze, gdy jest w użyciu.
- Logowanie unieważnione przez Microsoft (na przykład po zmianie hasła): „Zaloguj ponownie” w Ustawieniach telefonu –
  kopia folderu i czekające wpisy zostają.
- Ekranów, których telefon jeszcze nie ma, dotyczy komunikat z powrotem na Mostek. Operacje, meldunki, plan miesiąca i
  Radar dochodzą w kolejnych wersjach. Import z mBanku, raporty i kopie zapasowe zostają na komputerze.

Na komputerze:
- Zmiana zrobiona na telefonie w tej samej chwili co na komputerze nie przepada: wersja z telefonu jest kopią
  konfliktu `…-telefon-…` w Synchronizacji, z opisem „zmiana z telefonu w tym samym czasie co na komputerze” – „Zachowaj
  tę” albo „Scal…”.
- Wydanie zawiera też `Financial-Intel.ipa` i źródło AltStore. `SHA256SUMS.txt` ma sumy wszystkich plików.

## 1.12.0

Zwrot domownika przypisany do konkretnego wydatku (D91) – zamiast „od najstarszego”:
- Wpłata domownika (także jego część w przelewie innej osoby – pośrednik) spłaca zakupy, które wskazuje. Sama je
  wskazuje, gdy kwota pasuje pewnie: kwota jednego zakupu tej osoby, suma wszystkich jej zakupów do oddania albo jedyny
  zestaw 2–3 zakupów z ostatnich 90 dni – przy imporcie z mBanku, w szybkim wpisie i po wyborze osoby w edytorze.
- Bez pewnego dopasowania wpłata „czeka na przypisanie”: to, co osoba ma oddać, i tak maleje (osłony, depozyt i przychody
  liczą się jak dotąd), ale żaden zakup nie jest oznaczony jako oddany. Meldunki → „Zwroty do przypisania” prowadzą do
  wpłaty, a edytor wpłaty pokazuje „Za co oddaje” osobno dla każdej osoby, z „Pasuje: …” albo „Może: …” jednym
  kliknięciem.
- Zakup finansowany przez domownika pokazuje, ile z niego oddano i którą wpłatą („oddane 30 z 50 zł · do oddania 20 zł”,
  przejście do wpłaty), oraz „Przypisz zwrot…” z pieniędzy tej osoby czekających na przypisanie. Zwrot towaru – do
  wskazanego zakupu (sam, gdy u tego kontrahenta jest jeden).
- Lista operacji: „domownik · do oddania / częściowo oddane / oddane” i filtr Oznaczenia po nich. Radar: zakupy do
  oddania każdej osoby i zwrot do przypisania; odprawa i Ustawienia → Domownicy też go pokazują.
- Zwroty sprzed aktualizacji zostają, jak były (od najstarszego); w Ustawieniach → Domownicy „Zwrot spłaca wskazany zakup
  od:” – dzień do zmiany albo „dla wszystkich zwrotów”.

## 1.11.0

Opis wydatku i kolumny listy operacji (D89):
- Kolumna „Notatka” na liście operacji: czym jest wydatek – pierwsza linia notatki, cała notatka po najechaniu
  kursorem. Operacja bez notatki pokazuje opisy części paragonu („zakupy na tydzień · kabel HDMI”).
- Opis każdej części paragonu: pole „opis części” pod każdą częścią w edytorze podziału (do 500 znaków). Wyszukiwarka
  w Operacjach i paleta (Ctrl+K) znajdują operację po opisie części; w eksporcie CSV i Excel opisy części są w kolumnie
  „Notatka” po notatce operacji, każdy z kategorią swojej części. Usunięcie przedostatniej części przenosi opis ostatniej
  do notatki operacji.
- „Kolumny” nad listą operacji: Godzina, Kontrahent, Konto, Notatka, Kategoria, Tagi i Oznaczenia można ukryć (Data i
  Kwota zawsze widoczne), „przywróć domyślne” pokazuje wszystkie. Wybór zapamiętany na tym komputerze – laptop i duży
  monitor mogą mieć inne. Konto i tagi mają teraz własne kolumny. Eksport zawsze ma wszystkie kolumny.
- Ukrycie kolumny „Kontrahent”, gdy lista jest posortowana po kontrahencie, wraca do kolejności po dacie; nowa operacja
  bez kolumny kontrahenta ma napis „nowa operacja” w następnej widocznej kolumnie.

## 1.10.1

Poprawka (D88):
- Zamknięcie aplikacji tuż po zmianie nie pyta już o „niezapisane zmiany (zapis jeszcze trwa)”: zmiana zrobiona, gdy
  poprzedni zapis był w drodze (na przykład zatwierdzone pole, zapis kilku wpisów naraz, zamrożenie dnia gry w tle),
  zapisuje się przed zamknięciem okna; zamknięcie czeka też na usunięcie, które jeszcze trwa (gdy dysk nie odda pliku,
  wpis zostaje razem ze swoją zmianą). Pytanie zostaje tylko z prawdziwym powodem: decyzja o zmianie z drugiego
  komputera, wpis nowszej wersji aplikacji albo błąd zapisu.
- Na czas zapisu przed zamknięciem, Ctrl+S, kopią, eksportem, importem i zmianą folderu aplikacja nie zaczyna zapisów w
  tle (zamrażanie dni gry, cele z ICTTJ, data i salda rozliczeń) – ruszają zaraz po nim.

## 1.10.0

Wywiad (grupa V, D87): skąd liczby, dokąd idą pieniądze i ile zostaje – do szczegółu, z wyprawami, majątkiem netto,
bilansem paliwa i osobistą inflacją.

Wyprawy:
- Tagi operacji i części paragonu („Wakacje Chorwacja”, „Remont łazienki”): pole „Tagi” w edytorze, „#” przy części
  paragonu, w szybkim wpisie pole, „+ #tag” ostatnich dni jednym kliknięciem i „#słowo” w nazwie albo notatce („Zapisz
  i następny” zachowuje tagi – paragony z wyjazdu po kolei). Reguła importu też może dawać tagi („Netia →
  #ulga-internet”).
- Wywiad → „Wyprawy”: ile kosztowała wyprawa przez wszystkie kategorie (zwrot zaliczki odejmuje, część domownika nie
  jest Twoim kosztem), po kategoriach i miesiącach, z celem z Mapy gwiezdnej („Ekspedycja „Wakacje”: wydano 880 z
  2 000 zł celu”) i „Pokaż w Operacjach”.
- Filtr „Tag” w Operacjach (także w zapisanych widokach), wyszukiwanie po „#tag”, tagi w wierszu listy i kolumna
  „Tagi” w eksporcie CSV i Excel.

Wywiad do szczegółu:
- „Wydatki w czasie” rozwijają podkategorie (Jedzenie → zakupy spożywcze, na mieście, kawa), a kwota w komórce
  otwiera jej operacje.
- „Namierzone cele” – sklepy i usługi, w których zostawiasz pieniądze: suma, kontakty, średni paragon, trend, udział w
  kategorii, ostatnia wizyta; klik – wszystkie operacje marki.
- „Porównanie” – miesiąc wobec średniej z 3 i 12 miesięcy i roku wcześniej, z akcentem tylko przy przekroczeniach.
- W edytorze zakupu: „u tego kontrahenta w 2026 – 34 zakupy, 1 240 zł, średnio 36 zł”.

Majątek i paliwo:
- Siła floty netto: druga linia na krzywej majątku – konta plus należności (domownicy, pożyczki udzielone) minus dług
  (pożyczki wzięte); wzięta pożyczka już nie wygląda jak wzrost. Przełącznik wybiera linię dla BOS / CHoCH i drawdownu;
  przegląd roczny podaje siłę floty netto na początku i końcu roku.
- Bilans paliwa: ile każdy miesiąc dołożył do okrętu (przychód minus koszty netto) i stopa oszczędności z medianami 6
  i 12 miesięcy, także bez tradingu – w Wywiadzie, w debriefingu („Stopa oszczędności 23% (mediana 6 mies.: 18%)”), w
  Raportach i w eksporcie „Miesiące” (kolumny „Bilans” i „Stopa oszczędności”).
- Osobista inflacja: koszty kategorii rok do roku, średni paragon u tych samych marek, ceny kontenerów i „Twoja
  inflacja” obok CPI GUS wpisanego ręcznie (bez sieci); o ile urósł cel kadłuba.

Skąd ta liczba:
- Mostek rozbija „Energię dziś” (koperty codzienne, wydane do wczoraj, dni do końca miesiąca, przydział, wydane dziś),
  zasięg, cele osłon i kadłuba oraz podział ostatniej dostawy – także w osobnym oknie. Dymek zasobnika mówi, z czego
  jest energia dziś.
- Słowniczek okrętu (Osłony = bufor na pensje, Kadłub = fundusz awaryjny…) pod F1, w nagłówkach paneli („?”) i w
  dymkach stanu okrętu.

Poprawka:
- Ustawienia komputera (rozmiar, kontrast, ukrywanie kwot) widać we wszystkich oknach od razu, nie dopiero po zapisie
  na dysk; Ctrl+Minus w szybkim wpisie zaraz po kilku Ctrl+Plus w oknie głównym zmniejszał o kilka kroków naraz (przy
  wolnym zapisie ustawień) – teraz zawsze o jeden.

## 1.9.0

Ładownia i czujniki (grupa U, D87): okręt sam zauważa nowe ceny, ciche kontenery, nowe opłaty, pliki z banku,
nietypowe wydatki i zwroty, które nie dotarły.

Ładownia:
- Kontener cięższy (albo lżejszy) niż w manifeście: dwie ostatnie płatności w innej cenie (opłata okresowa – ostatnia;
  kilka przelewów jednego terminu, np. czynsz w dwóch częściach, liczy się razem) dają „Netflix: 43,00 zł → 49,00 zł co miesiąc (+14%, +72,00 zł rocznie)” w odprawie, w Meldunkach i w Ładowni – z
  symulacją linii zanurzenia i zasięgu. „Zaktualizuj od …” zmienia kwotę od bieżącego miesiąca (wcześniejsze miesiące
  liczą się starą kwotą – historia kwot w kontenerze), „To nie zmiana ceny” – ta kwota nie wraca jako propozycja.
- Kontener bez płatności: dwa terminy bez płatności (w zasięgu plików z banku) – „subskrypcja anulowana?”; „Zrzuć z
  ładowni” albo „Nadal płacę”.
- Opłaty co 2, 3 i 6 miesięcy oraz harmonogram miesięcy („w miesiącach: mar, maj, wrz, lis” – podatek od
  nieruchomości): zbiornik zbiera do najbliższej płatności. Rachunek o zmiennej kwocie (prąd, woda) – kwota z roku
  płatności (75. percentyl); gdy rok się zmieni o ponad 10%, Ładownia proponuje nową.
- Propozycje z historii rozpoznają te cykle i rachunki zmienne; nowa opłata w historii jest ogłaszana w odprawie raz w
  miesiącu; „Nie proponuj” chowa płatność (do „proponuj znowu”).

Czujniki:
- Nowy plik CSV z mBanku w folderze Pobrane (albo w folderze ostatniego importu): powiadomienie „Nowy meldunek z
  mBanku”, pozycja odprawy i przycisk „Importuj” – jeden klik otwiera go w imporcie; po imporcie „Przenieś plik do
  Kosza” (plik zawiera numer konta i operacje). Wyłącznik na tym komputerze: Ustawienia → Import z banku. Przypomnienie
  o zaległym imporcie mówi, jak pobrać plik w mBanku.
- Nieznany sygnał na radarze: zakup znacznie powyżej zwykłej kwoty u tej marki, kategoria ponad 2× średniej z 3
  miesięcy, nowy kontrahent od progu dziennika, dwa obciążenia z banku tej samej marki i kwoty dzień po dniu (możliwe
  podwójne pobranie – do sprawdzenia, nigdy nie łączone). W odprawie, Meldunkach, powiadomieniach i jako oznaczenie
  „nietypowa” w Operacjach; „To w porządku” zapamiętuje.
- Zwroty w drodze (Turtle Soup): przy wydatku „Czekam na zwrot pieniędzy” – kwota i termin (domyślnie całość, 14 dni).
  Wpływ tej samej marki (±10%) – z importu albo wpisany – zamyka zwrot sam; po terminie przypomnienie w odprawie i
  powiadomienie, na Radarze panel „Zwroty w drodze” i spodziewany wpływ, w Operacjach oznaczenie „czeka na zwrot”.

## 1.8.0

Przyszłość (grupa T, D87): co jest przed okrętem – zaplanowane wydatki, salda kont, kurs na rok, plan roczny.

Radar:
- Boje nawigacyjne – zaplanowane wydatki, wpływy i terminy bez kwoty (jednorazowe albo co roku): na osi Radaru, w
  odprawie i w powiadomieniach (domyślnie 14 i 3 dni przed). Operacja z banku o tej samej kwocie (±3 dni) zamyka boję
  sama („to nie ta”, gdy pomyłka); „Wykonaj teraz” zapisuje operację z boi, „odhacz” – bez operacji.
- Salda kont za 90 dni: płatności kontenerów, pożyczek i boi z kontem oraz operacje z późniejszą datą. Gdy płatność
  zabierze więcej, niż jest na koncie – kwota, dzień, przyczyna i „Zaplanuj przelew własny” z konta, które ma zapas
  (jeden przelew, „Cofnij”); także w odprawie.
- Przy każdym zdarzeniu osłony po nim; koniec kontenera z datą końca – „potem ładownia lżejsza o …/mies.”.

Cele i koperty:
- Cel z terminem pokazuje zawsze potrzebną ratę („kurs przechwycenia”) obok tempa. Opcja „rata z pensji”: rata idzie z
  pensji po zbiornikach, tylko gdy osłony i kadłub są pełne na początku miesiąca; widać ją w podziale pensji i w
  debriefingu.
- Zapas koperty planowej przy podziale łupów może zostać w niej na następny miesiąc (jej limit rośnie).
- „pokryj z koperty…” przy przekroczonej kopercie planowej: limit przechodzi z koperty z zapasem, z „Cofnij”; ocena
  dnia w grze liczy limity sprzed pokrycia, dziennik wachty je pokazuje.
- Plan kampanii w Planie miesiąca: pensja i koperty na 12 miesięcy roku, fakt pod limitem, ten sam miesiąc rok
  wcześniej w podpowiedzi; edycja bieżącego i dalszych miesięcy, „»” kopiuje wartość na resztę roku.

Wywiad:
- Kurs na 12 miesięcy: osłony, kadłub i cele miesiąc po miesiącu w trzech wariantach wpływów (bez wypłat z XTB,
  mediana, średnia) – kiedy warstwy będą pełne, kiedy cele, czy osłony spadną poniżej minimum.
- Symulator manewrów: inna pensja, zakup, miesiące bez wypłat z XTB, wyższe koszty, nowy cel albo kontener – porównanie
  „teraz” i „po manewrze”; nic się nie zapisuje (poza „Zastosuj pensję”).
- Prognoza zasięgu z bojami – druga kreska w każdym miesiącu.

## 1.7.0

Nowe funkcje Operacji (grupa S, D87).

Przelew między kontami budżetu to jedna operacja:
- Przelew z konta na konto budżetu (np. mBank → Portfel XTB) zapisuje się raz – z kontem źródłowym i docelowym; każde
  konto ma swoją stronę, w swoim dniu, a warstwy się nie zmieniają.
- Import pliku drugiego konta dołącza jego wiersz do przelewu zamiast tworzyć drugą operację; nowy przelew własny na
  konto budżetu z importu jest od razu jedną operacją.
- Przelewy zapisane wcześniej jako dwie osobne operacje: Meldunki pokazują listę par do połączenia (z zaznaczeniem i
  „zostaw tak”), przelew liczony dwa razy i stronę, której brakuje; edytor przelewu ma „Połącz z drugą stroną” albo
  „Dopisz drugą stronę”. Wszystko z „Cofnij”.

Operacje:
- Zmiana zaznaczonych naraz: usuń, przenieś na inne konto, zmień rodzaj albo przesuń datę – najpierw podgląd skutku
  (energia dziś, koperty, osłony, salda kont), potem jedno „Cofnij”.
- Ostrzeżenie przy zmianie operacji z okresu potwierdzonego saldem: o ile zmieni się potwierdzone saldo konta – zmiana
  dopiero po „Zmień mimo to”; tak samo przy zmianie kwoty operacji z banku. Znaczek „okres potwierdzony” w edytorze.
- „Więcej filtrów”: kwota od–do, domownik, kontrahent (wszystkie zapisy jednej sieci razem), kontener, cel, pożyczka,
  konto przelewu; kategoria główna razem z podkategoriami. „wszystkie” przy kontrahencie w edytorze.
- Kolejność listy: data, kwota albo kontrahent (klik w nagłówek).
- Zapisane widoki listy – przyciski nad listą, wspólne dla wszystkich komputerów (z okresem albo bez).
- Eksport widocznej listy do CSV i Excela – z jej filtrami i w jej kolejności.

Paleta i Synchronizacja:
- Paleta (Ctrl+K) szuka też operacji, kontenerów, celów, pożyczek, domowników i pozycji Ustawień; wybrany wpis otwiera
  się na swoim ekranie z wyróżnieniem.
- Dziennik zmian w Synchronizacji: co zmieniło się dziś, w 7 albo 30 dni – na którym komputerze, które pola; „Weź
  poprzednią wersję” jednym kliknięciem.

Poprawka: „Pokaż na 5 min” zaraz po ukryciu kwot nie przepada przy wolnym dysku (kwoty nie chowają się od razu przez
bezczynność).

## 1.6.6

Poprawki z przeglądu aplikacji (grupa R, D87): teksty, wygląd i wygoda.

Wygląd i prywatność (nowa zakładka Ustawienia → Wygląd i prywatność – ustawienia tego komputera):
- Rozmiar interfejsu 90–150 % we wszystkich oknach, także w szybkim wpisie i panelach odłączonych: suwak albo Ctrl+Plus /
  Ctrl+Minus, Ctrl+Shift+0 – 100 %.
- „Wyższy kontrast”: jaśniejsze przygaszone napisy, najmniejsze napisy 12 px. Domyślnie wygląd bez zmian.
- Kwoty mogą chować się same po wybranym czasie bez ruchu myszy i klawiatury albo po zablokowaniu ekranu; opcja
  „Startuj z ukrytymi kwotami”. Przy ukrytych kwotach na pasku u góry „Pokaż na 5 min” i „do końca sesji”, Ctrl+$ jak
  dotąd. Dymek zasobnika, powiadomienia i szybki wpis są wtedy też zamaskowane. To nie blokada.

Mostek i Radar:
- Krzywa majątku z ostatnich 26 tygodni na Mostku, „Wywiad →” prowadzi do całej historii.
- Masa ładunku ze stałymi kosztami miesięcznie obok procentu; Daily Bias „Bearish” w kolorze akcentu – czerwień tylko
  dla kwot.
- „zamknij” pożyczkę z „Cofnij”; raty schodzą z ładowni jak zrzucony kontener (liczą się do końca miesiąca), a „otwórz”
  oddaje tylko raty zdjęte zamknięciem.

Teksty i formaty:
- Metafory z prawdziwą nazwą obok (osłony – bufor na pensje, kadłub – fundusz awaryjny, ładunek – stałe koszty) w
  alarmach, kreatorze, planie miesiąca, grze i Wywiadzie.
- Daty jak w całej aplikacji (18.10.2026): potwierdzone saldo w Ustawieniach, saldo otwarcia, podpowiedź salda w
  Operacjach, podtytuł PDF; eksport ZIP z datą warszawską.
- Raporty: FVG kopert ze znakiem „+”, kwoty dni raportu wachty w zł, jedna nazwa „Ładownia (kontenery i opłaty
  okresowe)”.
- Odmiana i język: „1 operacja”, „3 nowe wpisy”, „(1 dzień)”, „Połączono z kontenerem: 2 płatności”, „Zaimportowano:
  1 nowa operacja”, „Do stopnia porucznika”, misja „Rozliczenie z domownikami”, „Za planem o …”, „Komu pożyczasz”.
- Szybki wpis: ukryta kwota „••• zł” jak w oknie głównym; Ustawienia → Zasobnik i start bez nieaktualnej zapowiedzi; na
  kreatorze startu bez menu „Układ”.

Wewnętrzne: usunięty nieużywany kod (formatery z ICTTJ, ekran-zaślepka, nieużywane wywołania procesu głównego).

## 1.6.5

Poprawki z przeglądu aplikacji (grupa Q, D87): folder danych, system i dwa komputery.

Niezapisane zmiany mówią prawdę:
- Zmiana czekająca na decyzję o zmianach z drugiego komputera: zamknięcie aplikacji pyta „Zdecyduj o zmianach z drugiego
  komputera” (okno decyzji otwarte za pytaniem), a kopia, eksport, import, odzyskanie, aktualizacja i zmiana folderu
  mówią, że czekają na Twoją decyzję – zamiast „plik zablokowany, spróbuj ponownie”.
- Ctrl+S i „Zapisz teraz” z palety działają tak samo; po imporcie i kreatorze komunikat mówi, co jeszcze się zapisuje i
  dlaczego.

Wpisy zapisane przez nowszą wersję aplikacji (zanim fi.json dotarł z drugiego komputera):
- Kontener, cel, pożyczka i plan miesiąca – do obejrzenia, z dopiskiem „zaktualizuj aplikację”; zmiana takiego wpisu nie
  znika po cichu, usunięcie nie zdejmuje go z ekranu, zmiany zbiorcze liczą go osobno.
- Zmiana, której ta wersja nie zapisze, nie ponawia się bez końca (jeden komunikat); gra i plan miesiąca nie tworzą wpisu
  w miejscu pliku nowszej wersji.

Folder danych i kopie:
- Uszkodzony fi.json: „Weź ustawienia z historii” na ekranie wyboru folderu (uszkodzony plik zostaje obok jako kopia);
  nieczytelny chwilowo (start z Windows przed OneDrive) – „Spróbuj ponownie” i ponowienie co 30 s.
- Własny folder kopii: osobny podfolder dla każdego folderu danych (dotychczasowe kopie zostają na miejscu); kopie
  usuwają tylko pliki z nazwami Financial Intel, folder kopii nie może być w folderze ICT Trade Journal.
- Nieudana kopia dzienna widoczna w Ustawieniach (kiedy i dlaczego), powiadomienie, gdy kopii nie ma od 3 dni.
- Eksport całego folderu zawiera historię zmian; Synchronizacja podaje prawdziwy folder kopii.
- Usunięcie wpisu, który ma drugą kopię z innego komputera – najpierw rozstrzygnięcie w Synchronizacji; bez wersji w
  historii wpis nie jest usuwany (nie dałoby się go odzyskać).
- Folder na dysku, którego nie ma: ponowne podłączanie coraz rzadziej (do 5 min), w logu najwyżej wpis na godzinę;
  folder na udziale sieciowym bez prawa listowania – „niedostępny”, nie błąd otwierania.

Dwa komputery i Synchronizacja:
- Karta kopii konfliktu pokazuje różnice jak Historia – nazwy pól po polsku, nazwy kategorii, celów i domowników zamiast
  identyfikatorów (także w Historii i oknie zmian).
- Plik z problemem: nieczytelny teraz – „Wczytaj ponownie”, nowszy format – „zaktualizuj aplikację”, uszkodzony – „Do
  Kosza” z potwierdzeniem; zachowana kopia konfliktu zapisana jako zmiana tego komputera; „Zaakceptuj nowsze” wszędzie.

System:
- config.json tego komputera nieczytelny chwilowo – ustawienia komputera (folder, autostart, skrót, token) nie są
  nadpisywane domyślnymi, a zmiany z tej chwili dochodzą, gdy plik da się odczytać; uszkodzony – odsunięty obok.
- Pobrana aktualizacja nie przepada, gdy pobranie nowszej się nie uda; przy zamykaniu do zasobnika Ustawienia mówią, że
  instaluje się po „Zakończ”, a powiadomienie przypomina o czekającej.
- Kreator nie zmienia skrótu szybkiego wpisu ani zamykania do zasobnika; drugi komputer z działającym budżetem pyta raz
  o start z Windows.
- Okno szybkiego wpisu i panele odłączone po awarii otwierają się od nowa; start z systemem pamięta maksymalizację; dymek
  zasobnika z energią także po włączeniu zasobnika w trakcie pracy; przeładowane okno nie czyta folderu od nowa.

## 1.6.4

Poprawki z przeglądu aplikacji (grupa P, D87): operacje, edytor i szybki wpis.

Lista operacji:
- Ctrl+N dodaje operację z każdego ekranu (jak mówią ściągawka i paleta); nowa operacja jest zawsze widoczna – lista
  przechodzi na jej miesiąc, gdy okres jej nie obejmuje (także „od–do”), a filtry, które by ją ukryły, zdejmuje tylko w
  tym widoku.
- Bieżący miesiąc listy przechodzi na nowy z kalendarzem (aplikacja w zasobniku tygodniami); wybrany miesiąc zostaje.
- Lista otwarta z Mostka, powiadomienia, zasobnika, meldunków albo duplikatów nie zmienia filtra zapamiętanego na tym
  komputerze: zmiany w takim widoku zostają widoku, „mój filtr” pokazuje zapamiętany.
- „Bez kategorii” znaczy wszędzie to samo (oznaczenie, filtr, meldunki): wydatek albo część paragonu bez kategorii – nie
  wpływy, przelewy ani zakupy domowników; meldunki liczą kwotę tylko takich części, pusta część 0 zł się nie liczy.
- Filtr kategorii widzi części paragonu, znak „domownik” – części domowników; oznaczenia z jednej grupy łączą się „lub”
  („z banku” + „nierozliczona”), z różnych – „i”; kategoria zarchiwizowana w filtrze ma nazwę i da się ją odznaczyć.
- „Cofnij” zbiorczej kategorii i finansującego cofa tylko swoje zmiany – to, co zmieniło się w międzyczasie (także reguły
  importu dodane potem), zostaje, a komunikat mówi, ile cofnięto.

Edytor:
- Notatka do 5000 znaków, dziennik kapitański do 2000 – długi wklejony tekst nie blokuje już zapisu.
- „Podziel paragon” przenosi kategorię i finansującego na pierwszą część; edytor mówi, dokąd idzie nierozdzielona reszta,
  a „odejmij od ostatniej części” nie zmienia jej kierunku; „Ładownia” widoczna także przy podziale.
- Wybór kategorii pokazuje podkategorię zarchiwizowanej kategorii głównej; kwota z więcej niż dwiema cyframi po przecinku
  jest odrzucana („1.200” to nie 1,20 zł); próg „Plan czy impuls?” 0 – dziennik nie pyta.

Saldo z banku:
- „Potwierdź saldo” z różnicą pyta najpierw, czy dzisiejsze operacje są dopisane – korekta albo „Dopiszę i potwierdzę
  później”; wpisane saldo zostaje w polu do zapisu (Ustawienia → Konta i ekran importu).

Szybki wpis:
- Otwarte okno dostaje świeże listy kont, kategorii i domowników, energię i stan folderu bez utraty wpisu; wybór, którego
  już nie ma, czyści z komunikatem, a zapis odrzuca konto, kategorię albo domownika spoza folderu.
- Podział paragonu, potem „Wpływ” – zapis bez błędu o częściach; „zaliczka czy przychód” domownika zapamiętane tylko po
  Twoim wyborze.

Formularze i drobne:
- „Nowa pożyczka”, „Nowy kontener”, „Nowy cel” i podział łupów zachowują wpisany tekst po przejściu na inny ekran; pusty
  formularz ma dzisiejszą datę także po dniach w zasobniku.
- Ściągawka skrótów pokazuje ustawiony skrót szybkiego wpisu (albo „brak skrótu”) i ostrzega, gdy się nie zarejestrował.
- Wieczorne przypomnienie ustawione w godzinach ciszy nocnej przychodzi minutę przed nią – Ustawienia to mówią.

## 1.6.3

Poprawki z przeglądu aplikacji (grupa O, D87): import z mBanku.

Rozpoznanie operacji:
- „PŁATNOŚĆ WEB…” i „SPRZEDAŻ WALUTY” rozpoznawane jako rodzaj operacji; tytuł przelewu z podwójną spacją zostaje tytułem
  (część tytułu nie staje się kontrahentem), a mTransfer z przecinkiem w tytule ma za kontrahenta firmę (np. PayU).
- XTB tylko po kontrahencie (albo po opisie, gdy kontrahenta nie ma): przelew własny „na portfel XTB” i wpłata domownika
  „zwrot za kurs XTB” nie są już tradingiem.
- Reguła z kategorią zarchiwizowaną nie nadaje jej nowym operacjom – grupa czeka na nową kategorię; w Ustawieniach reguła
  z dopiskiem „(zarchiwizowana)”. Marka o nazwie „constructor” nie psuje już importu.

Łączenie z wpisami ręcznymi i duplikaty:
- Podobna nazwa nie liczy słów ogólnych („polska”, „sklep”, „spółka”), rodzajów miejsc ani miast; ta sama marka jest
  podobna mimo krótkiej nazwy („KFC” i „KFC 1234 WARSZAWA”). Jedno wspólne słowo albo krótka nazwa w innej przy innej
  kwocie – import pyta, a panel duplikatów nie zaznacza pary sam.
- Panel duplikatów porównuje jak import (operacja banku bez nazwy – po opisie), pokazuje polskie nazwy rodzajów i daty,
  „to nie duplikat” ma „Cofnij”, a w Ustawieniach → Import z banku „pokazuj znowu”; przy otwartym pliku – notka o liczbie
  możliwych duplikatów. Scalenie przenosi wpłaty domowników, które pokrywały kopię.
- Rozliczenie nierozliczonej i scalenie z inną kwotą przeskalowują podział paragonu – udział domownika zostaje jego.
- Usunięta nierozliczona nie wraca, gdy bank rozliczy ją inną kwotą lub dniem (z „importuj mimo to”); nie ukrywa przy tym
  innego zakupu tego sklepu, a nierozliczone usunięte przez sam import (bank ich już nie pokazywał) nie blokują swojego
  rozliczenia.
- Operacje zapisane przez nowszą wersję aplikacji nie są łączone ani rozliczane (wiersz banku wchodzi osobno).

Ekran importu:
- W trakcie zapisu importu ekran czeka (decyzje, „Zamknij plik”, upuszczony plik); upuszczony plik ma ten sam limit
  20 MB i komunikat błędu co wybrany; błąd zapisu nie zostawia pliku z nieaktualnym podglądem; zmiana folderu zamyka plik.
- „+ domownik” nie zapisuje osobie „reszta jako przychód” bez pytania – „zaliczka czy przychód?” czeka na odpowiedź;
  odpowiedź liczona z operacji, bez pominiętych.
- Twoja decyzja po przyjętej podpowiedzi mBanku jest zapamiętywana domyślnie; „(jak grupa)” w operacji daje kategorię
  grupy; własna decyzja operacji widoczna i do cofnięcia; wiersz „importuj mimo to” należy do swojej grupy i tematu.
- Temat z markami zdecydowanymi osobno: „różne – patrz marki” albo wspólna decyzja do zmiany jednym wyborem; „zapamiętaj”
  znika przy słowie z tytułu przelewu; liczniki podglądu i wyniku zgodne („rozliczone”).
- Słowo kluczowe z paska zbiorczego także dla wpływów, przelewów i domowników (kierunek z zaznaczonych); wyszukiwarka po
  kategorii, którą grupa dostaje; „Przyjmij pewne” i „Przyjmij podpowiedzi” w wyszukiwaniu tylko na znalezionych.
- Jeden opis decyzji reguły w Regułach importu, Słowach kluczowych i propozycji słowa.

Szybkość:
- Propozycje słów kluczowych, podobne nazwy, decyzje zbiorcze, nauka reguł i scalanie ustawień z tysiącami reguł bez
  przeglądania wszystkiego za każdym razem; lista reguł w Ustawieniach po 100.

## 1.6.2

Poprawki z przeglądu aplikacji (grupa N, D87): Dowództwo, ICTTJ i dokowanie, domownicy, cele i kreator.

ICTTJ i dokowanie:
- Wpływ wpisany szybkim wpisem na Portfelu XTB jest parą wypłaty z ICTTJ tej samej kwoty – „Zadokuj” zmienia go w
  wypłatę, bez drugiej operacji (operacja z banku ma pierwszeństwo).
- Pula Podatek z podziałem zmienionym w oknie: podatkiem jest tylko część z podziału; wypłaty z puli Podatek sprzed startu
  budżetu nie są przychodem z tradingu w panelu „Przychody”.
- Pominięty wpis ICTTJ trzyma swoją operację z banku – wpływ nie wraca jako „bez wpisu w ICTTJ” i nie zabiera pary innej
  wypłacie.
- Teksty okna dokowania wg kierunku (zwrot do masy), „wraca z rezerwy na PIT-38” w odprawie i powiadomieniu, przy
  wyłączonym rozkazie firewall – że dopłata nie jest sprawdzana.
- Odczyt folderu ICTTJ: wpis w dwóch plikach liczony raz (nowszy, z ostrzeżeniem), błąd odczytu folderu widoczny jako
  błąd, a jednorazowo nieudany odczyt zostawia poprzedni stan z ostrzeżeniem; szybka zmiana folderu nie pokazuje danych
  starego.

Cele (Mapa gwiezdna):
- ETA i tempo w dwóch częściach: wypłaty z puli Cele najpierw do celów ICTTJ, reszta w kolejności listy; znaczek „DOL ·
  pula Cele”.
- Cel ICTTJ bez kwoty bierze w swoim miesiącu (miesiąc wpisu w ICTTJ) całą wypłatę z puli Cele – jak w ICTTJ.
- „Po terminie” w kolorze akcentu: nigdy przy celu osiągniętym, także gdy przy obecnym tempie cel nie dojdzie wcale albo
  termin minął bez tempa. Kwota istniejącego celu nie może spaść do 0.

Dowództwo:
- Masa ładunku: podniesienie kontenera ocenia dzień zmiany, nie dzień zamrożony po niej; zmiana nazwy kontenera 1. dnia
  miesiąca nie jest naruszeniem.
- „Pełna energia” widzi dni jeszcze niezamrożone (wybór misji w poniedziałek widzi niedzielę, status w tygodniu – dziś);
  „Dzień bez wydatków” liczy dzisiejszy dzień osobno („+1, jeśli dziś bez wydatków”).
- Misja i stopień nadane przez nowszą wersję nie są oceniane przez starszą; klasa okrętu świętowana tylko ponad najwyższą
  z ostatnich 30 dni.
- „Poważne naruszenia od DD.MM”, gdy stopień zmienił się w tym miesiącu; rozkaz dzienny opisany tak, jak ocenia go gra;
  rozkazy można zmienić także w Dowództwie.

Domownicy, salda, kreator, raporty:
- „Pokrywa” w edytorze wpłaty pokazuje zakupy otwarte tuż przed tą wpłatą.
- Saldo na start domownika ma datę najstarszego zakupu – przypomnienie liczy od niej (także saldo przeniesione z 1.3.0).
- Data rozliczeń sprzed startu budżetu z dopiskiem, od kiedy liczą się rozliczenia.
- Saldo potwierdzone na dwóch komputerach przed synchronizacją to jedna korekta; dwie takie same korekty z dwóch komputerów
  – meldunek „Podwójne korekty” z „to nie powtórzenie”.
- Kreator: zmiana ładowni nie kasuje kopert wpisanych ręcznie.
- Raport wachty po tygodniu wraca do bieżącego tygodnia; przycisk „bieżący”.

## 1.6.1

Poprawki z przeglądu aplikacji (grupa M, D87): liczby planu i raportów, Mostek, Radar i Ładownia.

Plan miesiąca i debriefing:
- Koperty tylko z planu miesiąca – także z limitem 0 zł. Wydatki kategorii bez koperty są osobno („Bez koperty”), bez
  czerwieni „ponad plan”.
- Pula dzienna liczy wydatki wszystkich kategorii codziennych i operacji bez kategorii – tak jak energia dnia.
- „Miesiąc na plus” dopiero po końcu miesiąca: w Raportach „miesiąc trwa”, w CSV i Excelu „w toku”.
- Łupy tylko z miesięcy, które budżet przeszedł do końca (miesiąc sprzed startu ich nie ma).
- Przekroczenie koperty ma jedną regułę: czerwony alarm odprawy = próg poważnego naruszenia z Dowództwa. Koperta
  codzienna ponad swój podział daje łagodne powiadomienie bez dźwięku alarmu (liczy się pula dzienna), Daily Bias patrzy
  tylko na koperty planowe; koperta 0 zł też powiadamia.

Raporty i nazwy:
- „Przychody” wszędzie tam, gdzie chodzi o przychód (raport wachty, przegląd roczny, CSV i Excel miesięcy, alarm
  pensji); „Wpływy” w Operacjach mają podpowiedź, że to wszystkie pieniądze na plus.
- Odprawa w Raportach z Daily Bias, debriefing z trafnością dziennika kapitańskiego.
- Przegląd roczny i Wywiad: „Pieniądze na kontach” / „Na kontach” – suma sald z pożyczonymi i depozytem domowników.
- Zasięg nigdy nie pokazuje progu klasy, której okręt nie ma (11,96 mies. to „11,9 mies.”), „brakuje” co najmniej
  0,1 mies.

Mostek, Radar, Ładownia, Mapa gwiezdna:
- Kliknięcie alarmu w odprawie prowadzi do przyczyny: Ładownia, operacja korekty albo Operacje.
- „Odsłuchaj” tylko z polskim głosem systemu (bez niego podpowiedź o pakiecie mowy); energia ponad przydział czytana
  „przekroczona o …”.
- Każda dopłata do XTB wbrew firewallowi w osobnej linii odprawy.
- Radar: rata po terminie pokazuje dni po terminie, a od 3 dni „zaległa rata” / „spóźniona spłata”; Ctrl+$ ukrywa
  kwoty od razu także w Radarze i otwartym szybkim wpisie.
- Ładownia: najbliższa płatność liczona od dziś, rata zbiornika z harmonogramu („ostatnia …”), „/m” jako średnia.
- Mapa gwiezdna podaje, ile z kwoty w celach leży w celach zarchiwizowanych.
- Pożyczka zaciągnięta z „Do spłaty razem” mniejszym niż kwota jest odrzucana z komunikatem.

Start budżetu i ustawienia:
- Minimalne osłony nigdy ponad cel osłon (Ustawienia i kreator odrzucają taką parę, silnik bierze mniejszą).
- Kreator: wydane w miesiącu startu przed startem liczy jak silnik (zwrot pomniejsza zakup), saldo otwarcia nie odejmuje
  operacji z datą w przyszłości.
- Tempo celów na Mapie gwiezdnej bez środków na start, konta dołączonego później i depozytu domowników.
- Budżet liczony od samego salda otwarcia: baner mówi, co ustawi kreator, a Dowództwo zaczyna się po kreatorze.

Szybkość: debriefing, eksport miesięcy, propozycje Planu miesiąca i „Ostatnie operacje” Mostka bez przeglądania całej
historii przy każdym miesiącu i każdej minucie.

## 1.6.0

Nowe funkcje z przeglądu aplikacji po 1.4.1 (D86): opłaty stałe w miesiącu, szybki wpis seriami, wieczorny raport
wachty, meldunki do rozpatrzenia i odzyskanie z kopii.

Opłaty stałe (Ładownia):
- Kontener miesięczny ma stan w tym miesiącu: zapłacone, czeka albo po terminie. Termin to dzień płatności z historii
  (środkowy z ostatnich płatności, bez historii – dzień kontenera); „po terminie” zaczyna się 3 dni po nim. Dopóki
  pliki z banku nie obejmą tych dni, opłata czeka na import zamiast być „po terminie”.
- „Kontener niezaładowany” w odprawie i powiadomienie (do wyłączenia w Ustawienia → Powiadomienia i dźwięki).
- „Zapłacone” w Ładowni zapisuje płatność gotówką albo z konta bez importu – od 14 dni przed terminem.
- Radar pokazuje opłaty miesięczne w każdym miesiącu; zaległa – z oznaczeniem.

Szybki wpis:
- Ctrl+Enter zapisuje i zostawia okno na następny wpis („Dopisano: 3 · energia dziś …”); Enter zapisuje i zamyka, Esc
  zamyka jak dotąd.
- „Powtórz ostatni” (także z pieniędzmi domownika) i 5 ostatnich par kontrahent + kategoria jako szablony.
- Działania w kwocie („12,50+8,30”, „3*4,99”), „wczoraj” jednym kliknięciem, data słowem („wczoraj”, „-3”).
- Szkic zamknięty Esc czeka do następnego otwarcia (najwyżej 30 minut) – „Wyczyść” zaczyna od nowa.

Wieczorny raport wachty:
- Od godziny przypomnienia w Operacjach pasek „Raport wachty dnia”: ile dziś dopisano operacji z godziną, „Dopisz”,
  „Dziś bez wydatków” (zapisane przy dniu – dziennik wachty to oznacza) i „Przypomnij za 30 min”; te same akcje w menu
  zasobnika.
- Bez przypomnienia, gdy po 18:00 dopisano wydatek albo dzień jest potwierdzony.

Meldunki do rozpatrzenia (menu boczne, Ctrl+Shift+M):
- Jedna skrzynka z licznikiem: wypłaty z ICTTJ do zadokowania, łupy do podziału, konflikty kopii i pliki z błędem,
  wydatki bez kategorii od startu budżetu, możliwe duplikaty, zwroty od domowników, salda niepotwierdzone ponad 30 dni.
  Każdy meldunek prowadzi do decyzji (okno dokowania, Operacje z filtrem, Synchronizacja, Plan miesiąca, Konta).
  Bez nowych powiadomień.
- Płatność kontenera i wydatek z celu nie są już „bez kategorii” (mają swoje miejsce w budżecie) – lista operacji
  pisze przy nich „ładownia” albo „z celu”.

Odzyskanie z kopii (Ustawienia → Folder i kopie → „Odzyskaj…” przy kopii):
- Podgląd: co zmieniło się i co usunięto od kopii (z różnicami pól), co dodano po niej.
- Wybrane wpisy i ustawienia wracają jako nowa wersja – bieżące zostają w historii, toast ma „Cofnij”.
- Cały folder: kopia rozpakowana do nowego folderu obok bieżącego („… – kopia z RRRR-MM-DD GG.MM”) i otwarta; bieżący
  folder nie jest nadpisywany. Rozpakowanie bezpieczne – tylko pliki danych, ścieżka z ../ odrzuca kopię.

## 1.5.4

Szybkość przy dużym folderze – reszta poprawek wydajności z przeglądu aplikacji po 1.4.1 (D86). Wszystko liczy się tak
samo jak dotąd, krócej.

Import z mBanku:
- Ekran importu przy pliku z setkami marek: temat z ponad 30 markami do rozstrzygnięcia jest na start zwinięty, marki,
  wiersze, dopasowania i usunięte pokazują się po 100 z „pokaż kolejne”, a decyzja, zaznaczenie czy znak w wyszukiwarce
  odświeża tylko to, co się zmieniło – przy 150 tys. operacji ekran rysuje się w ok. 0,2 s zamiast 2,2–2,6 s.
- Plan importu: wpisy ręczne szukane w dniach wokół operacji, reguły i marki z pamięci – plik z 90 dni przy 150 tys.
  operacji planuje się w ok. 0,07 s zamiast 3,5 s, cała historia w kreatorze (30 tys. wierszy) w ok. 0,25 s zamiast 5,3 s.
- Plan liczy się od nowa tylko wtedy, gdy zmieni się to, co czyta (reguły, połączone nazwy, domownicy, nazwiska,
  kategorie, numery rachunków), a nie po każdym zapisie ustawień.
- Lista operacji usuniętych przez Ciebie (ich wiersze z banku nie wracają same) czyta historię kilka plików naraz i nie
  wstrzymuje zapisów; wersję usuniętej operacji czyta raz – na drugim komputerze plik historii z chmury jest pobierany
  raz, a nie przy każdym pliku importu.

Zmiany z drugiego komputera:
- „Zastosuj” i „Zaakceptuj nowsze” rozstrzygają całą paczkę naraz i zapisują ją jednym wywołaniem: 1000 zmian przy
  30 tys. operacji w ok. 0,05 s zamiast 30 s (przy 150 tys. – 0,25 s zamiast 4 min).
- Okno pokazuje 50 wpisów z „pokaż kolejne”; „Zastosuj” obejmuje wszystkie – jeszcze niepokazane z wyborem domyślnym
  (okno to mówi).

Silnik budżetu:
- Stan okrętu liczy się bez sortowania całej historii przy każdym przeliczeniu: operacje posortowane raz, salda kont i
  pożyczek jednym przejściem – przy 150 tys. operacji ok. 0,6–1,0 s zamiast 1,2–1,9 s, przy 30 tys. ok. 0,15 s zamiast
  0,24 s.

## 1.5.3

System, folder danych i dwa komputery – poprawki z przeglądu aplikacji po 1.4.1 (D84, D86).

Dwa komputery:
- Komputer „w użyciu” = ruch w którymś z okien aplikacji w ostatnich 10 minutach. Baner „Ten folder jest też w użyciu
  na …” pokazuje się tylko wtedy, gdy drugi komputer jest w użyciu – aplikacja w zasobniku go nie wywołuje. Ustawienia i
  Synchronizacja pokazują przy innych komputerach „w użyciu” albo „w zasobniku”, a Synchronizacja także, z którego
  komputera i kiedy przyszła ostatnia zmiana.
- Komputer w zasobniku nic nie zapisuje w tle: nie zamraża dni gry, nie przepisuje celów z ICTTJ i nie ustawia sald
  domowników na start – robi to komputer w użyciu. Powiadomienia pokazuje komputer w użyciu; gdy żaden nie jest w użyciu
  – każdy (jak dotąd). Kopia dzienna – na każdym (jak dotąd).
- W zasobniku znak obecności w folderze zapisuje się co 5 minut zamiast co minutę – OneDrive nie synchronizuje go całą
  noc.
- Pierwsze zamrożenie dni gry po otwarciu folderu czeka 3 minuty i minutę bez zmian z drugiego komputera – OneDrive
  najpierw przynosi to, co zapisał drugi komputer; przy kopii konfliktu miesiąca gry dni nie są zamrażane.
- Odłączone panele Mostka (Odprawa, Stan okrętu, Koperty) na drugim monitorze odświeżają się i reagują na kliknięcia
  także wtedy, gdy główne okno pokazuje inny ekran – także po północy.

Folder danych:
- Zmiana folderu w Ustawieniach pokazuje postęp wczytywania z „Przerwij”; w tym czasie nic nie da się zmienić, a
  przyciski folderu są wyłączone. Zmiana wysłana jeszcze dla poprzedniego folderu nigdy nie trafia do nowego, a
  przerwane wczytywanie zostawia bieżący folder bez zmian. Zapamiętany folder, który okazał się pusty – nowe dane w nim
  tylko po „Utwórz tu nowe dane”; folder z innymi plikami – „Utwórz podfolder FinancialIntel”.
- Folder tylko do odczytu: pola i przyciski zmian są wyłączone (ustawienia budżetu, Plan miesiąca, zbiorcze zmiany w
  Operacjach, Synchronizacja i inne), a akcja, która nic nie zapisała, mówi „Folder jest tylko do odczytu” zamiast
  meldować sukces. Historię wpisu da się obejrzeć.
- Kopia konfliktu z OneDrive ma „Scal…”: przy każdym polu, którym wersje się różnią, wybierasz wersję – zaznaczona jest
  ta, która pole zmieniła (według historii wpisu), a przy zmianie po obu stronach nowsza. Scalona wersja zostaje pod
  oryginałem, obie strony trafiają do historii wpisu; gdy któraś wersja zmieni się w trakcie, scalenie trzeba otworzyć
  jeszcze raz.
- „Historia” przy planie miesiąca, celu na Mapie gwiezdnej, pożyczce w Radarze, saldzie otwarcia konta, zadokowanej
  dostawie i przy każdym wpisie w oknie „Zmiany z drugiego komputera”. Okno otwarte z innego okna przykrywa całe okno
  aplikacji, a Esc zamyka tylko to na wierzchu.
- Ekran wyboru folderu dobiera przyciski po przyczynie: zapamiętany folder pusty albo niedostępny (np. OneDrive go
  jeszcze nie pobrał) – „Spróbuj ponownie”, a nowe dane w nim tylko po potwierdzeniu; folder z innymi plikami –
  „Utwórz podfolder FinancialIntel”; propozycja tego samego folderu się nie powtarza.

System:
- Skrót szybkiego wpisu Ctrl+Alt+litera polskiego znaku (A, C, E, L, N, O, S, U, X, Z – także z Shift, czyli wielkie
  litery) zabierał AltGr w całym Windows: nie da się go ustawić, a ustawiony wcześniej zmienia się na domyślny
  (Ctrl+Alt+B) z komunikatem.
- Uruchamianie z systemem: jeden wpis na rodzaj aplikacji (instalator / portable) o stałej nazwie; stare wpisy wersji
  portable z każdej aktualizacji są usuwane, wyłączenie działa, a druga kopia przy logowaniu nie pokazuje okna.
- Okno zapamiętane na odłączonym monitorze otwiera się na ekranie (wyśrodkowane, nie większe niż ekran).

## 1.5.2

Liczby się zgadzają: średnie, plan miesiąca, ładownia, kreator, pola i podglądy liczą tak samo jak silnik budżetu –
poprawki z przeglądu aplikacji po 1.4.1 (D84).

Silnik i plan miesiąca:
- Średnie kosztów i przychodów, cel kadłuba i propozycje (pensja, koperty, stałe opłaty) liczą się od początku historii
  z banku: stara pożyczka z Radaru ani wpis ręczny sprzed importu nie dokładają pustych miesięcy, bieżący miesiąc nigdy
  nie jest „pełny”, a miesiąc bez żadnej operacji (luka w importach) nie liczy się jak miesiąc bez kosztów. Bez historii
  z banku – od salda otwarcia albo najstarszego wpisanego wydatku lub wpływu. Kreator, Plan miesiąca i Ładownia
  proponują z tych samych miesięcy co silnik; gdy nie ma czego zaproponować – komunikat.
- „Miesiąc zamknięty na plus” = energia miesiąca wystarczyła: pensja po ratach odkładek i łupy z poprzedniego miesiąca
  pokryły wydatki, osłony nic nie dopłaciły. Opłata zapłacona ze zbiornika nie psuje miesiąca, a miesiąc z alarmem
  „energia wyczerpana” nie jest na plus. Debriefing pokazuje rachunek energii i pulę dzienną (koperty dzienne, łupy,
  wydatki bez kategorii) – także w Raportach.
- Łupy „na następny miesiąc” podnoszą dzienny przydział także w „Podziale pensji” („w tym łupy”) i w debriefingu – jak w
  silniku.
- Zarchiwizowana kategoria zdejmuje swoją kopertę z planu tego miesiąca i kolejnych (minione miesiące ją zachowują) – z
  „Cofnij”. Koperta zarchiwizowanej kategorii, która została w planie, jest oznaczona.
- Usunięty kontener: jego płatności liczą się znów jak zwykłe wydatki – w energii, kopertach i debriefingu; „Cofnij”
  łączy je z nim ponownie, a nowy kontener tego odbiorcy może je przejąć.
- Operacja „Pożyczka” bez pożyczki z Radaru zmienia tylko osłony: pożyczone pieniądze nie są przychodem, a ich oddanie
  nie tworzy należności. Edytor to mówi, a wpływ przy jednej otwartej pożyczce udzielonej podpowiada „zwrot pożyczki …?
  przypisz”.
- Konto z saldem otwarcia na 1. dzień miesiąca zasila osłony przed pensją tego dnia – pensja jest cała.
- „Wolne do decyzji” na Mostku tylko przy pełnym kadłubie (jak firewall); inaczej „ponad cel osłon … nie do dopłaty XTB”.
- Dokowanie: zapisany podział po zmianie kwoty operacji jest dopasowany do nowej kwoty (podatek, kadłub, cele, reszta do
  osłon) z notką w oknie; wypłata z ICTTJ z inną kwotą w banku dzieli kwotę z banku.

Kreator startu:
- Konto z saldem otwarcia i pustym polem liczy się w „Obecnych środkach” kwotą, którą przyjmie silnik.
- Nowy krok „ICTTJ i cele”: folder ICTTJ (cele prognozy stają się celami okrętu) i cele własne; w podziale środków kwoty
  na cele (kadłub i cele razem najwyżej tyle, ile środków).
- Odkładki pierwszego miesiąca jak w silniku (zbiornik opłaty, która jest blisko, nadrabia), potem miesięczna rata;
  płatności opłat okresowych nie zjadają pierwszej pensji. Bez napisów o „wersji 1.1”.

Pola, edytor i szybki wpis:
- Data „dd.mm” bez roku w edytorze operacji i w szybkim wpisie: dzień najbliższy dacie pola, najwyżej tydzień po dziś –
  28.12 wpisane 3 stycznia to miniony grudzień. Operacja z datą w przyszłości ma znaczek „w przyszłości” (do sald liczy
  się od tego dnia).
- Pola liczb całkowitych (raty pożyczki, cele osłon i kadłuba) nie przyjmują ułamków; harmonogram pożyczki nie gubi
  części kwoty.
- Edytor operacji: godzina w ciszy nocnej prosi o potwierdzenie krótkim wpisem w dzienniku (albo „usuń godzinę” dla
  zakupu dopisanego później); gra liczy nocny zakup tylko potwierdzony. Nowa operacja wpisana w ciszy nocnej jest bez
  godziny.
- Szybki wpis: podgląd jak silnik – kategoria bez koperty „poza kopertami” (energia dziś bez zmian), koperta planowana –
  jej stan, wydatek z wcześniejszego dnia miesiąca – rozłożony na pozostałe dni, inny miesiąc albo data w przyszłości –
  energia dziś bez zmian.
- Historia zmian, „Zmiany z drugiego komputera” i Synchronizacja pokazują kwoty w złotych (z ukryciem Ctrl+$).
- Przypomnienie o potwierdzeniu sald – osobno dla każdego konta (gotówka bez przypomnień); niedzielne powiadomienie
  wymienia konta.
- Panel „Przychody”: „Razem” w miesiącu liczy trading jak raporty – nigdy poniżej zera.

Folder danych:
- Usuwanie wielu wpisów naraz („Cofnij import”, duplikaty) szybsze na Windows: plik wpisu, którego wersja jest w
  historii (Synchronizacja → „Usunięte wpisy”), usuwa się od razu, do Kosza Windows trafia tylko bez wersji w historii.

## 1.5.1

Import z mBanku: cofnięcie całego importu, saldo z pliku banku, oficer zna marki, audyt reguł i poprawki z przeglądu
aplikacji po 1.4.1 (D84).

Nowe:
- „Cofnij import” – całe wczytanie pliku jednym przyciskiem: na ekranie wyniku i w Ustawienia → Import z banku
  („Ostatnie importy”, dziesięć ostatnich). Okno mówi, co się stanie: ile operacji zniknie (także zmienionych potem przez
  Ciebie), w ilu wpisach cofną się zmiany połączenia z bankiem albo rozliczenia (Twoje późniejsze zmiany zostają), ile
  reguł się cofnie. Toast ma „Cofnij” – import wraca w całości. Kolejny import tego pliku wczytuje te operacje od nowa
  (nie są „usunięte przez Ciebie”); operacje cofniętego importu są też na liście usuniętych w Synchronizacji – razem z
  Twoimi zmianami. Importy cofa się od ostatniego. Gdy część operacji importu nie dotarła jeszcze z drugiego komputera,
  cofnięcie czeka (albo „Cofnij mimo to”).
- Plik z innego rachunku – ostrzeżenie przed importem (numer rachunku z nagłówka pliku zapamiętany przy koncie); plik w
  całości już zaimportowany – komunikat.
- Telemetria z banku: po imporcie historii rachunku FI porównuje saldo z banku po ostatnim dniu pliku z saldem w FI. Gdy
  się zgadza – saldo jest potwierdzone samo (misja „Inwentaryzacja” dla mBanku, C11). Gdy nie – pokazuje, od którego dnia
  salda się rozjeżdżają i dlaczego: operacje z banku, których nie ma w FI, wpisy z FI, których nie ma w banku (wpisane
  ręcznie, podwójne, jeszcze niezaksięgowane), inna kwota, różnica sprzed pliku, luki w saldach samego pliku
  (przefiltrowana lista). Korekta zostaje ostatnią opcją. Cofnięcie importu usuwa też to potwierdzenie.
- Oficer szybkiego wpisu i edytora zna marki: „Dino” wpisane ręcznie dostaje kategorię operacji z banku „DINO TESTOWO 4”,
  reguły importu (także połączone nazwy) i słownik sieci – bez historii wpisów ręcznych. Lista kontrahentów w szybkim
  wpisie jedna na markę. W edytorze operacji bez kategorii – podpowiedź „oficer: …”.
- Audyt reguł importu (Ustawienia → Import z banku): wyszukiwarka, przy każdej regule liczba operacji z banku, które łapie
  dziś, „zmień” (kierunek, decyzja, kategoria), reguły bez trafień, operacje marki z inną kategorią niż jej reguła –
  „Zastosuj do historii” z „Cofnij”. Marki z kilkoma kategoriami; gdy kwoty je rozdzielają (Orlen do 40 zł – kawa, więcej –
  paliwo), FI proponuje regułę z progiem kwoty.

Import z mBanku:
- Przelew od osoby z otwartą pożyczką z Radaru – „zwrot pożyczki: …” z tą pożyczką; w decyzjach także pożyczki z Radaru.
  Pożyczka, PIT-38 i XTB nie stają się regułą – sprawdzane przy każdej operacji.
- Plik zaimportowany najpierw na złe konto – przy imporcie na właściwe operacje się przenoszą, nie wchodzą drugi raz. Ta
  sama płatność na dwóch rachunkach mBanku (różne numery rachunków) to dwie operacje.
- Wpis ręczny „Nie łącz” z wierszem banku – wiersz wchodzi z rozpoznaniem jak inne wiersze pliku.
- „Ustaw” zaznaczonych bez kategorii jest niedostępne; wydatek bez kategorii nie uczy reguły.
- Podgląd liczy się od nowa po zmianie nazwisk, kategorii, kontenerów, pożyczek i operacji (też z drugiego komputera);
  przed zapisem sprawdzany jeszcze raz. Decyzja tematu zostaje po przeliczeniu.
- Zamknięcie pliku albo wczytanie innego z decyzjami – z „Cofnij”; błędny plik nie zamyka otwartego.
- Plik bez nowych operacji – „Zapisz import (bez zmian)” zapisuje czas importu i okres pliku.
- „Zapamiętaj” w edytorze uczy reguły po nazwie z banku (Twoja nazwa obok); propozycja reguły na słowo pokazuje całą
  decyzję, którą zapisze.

## 1.5.0

Domownicy, ICTTJ i dokowanie: wspólne finansowanie wydatków (D83) i poprawki z przeglądu aplikacji po 1.4.1 (D84).

Wspólne finansowanie:
- Wydatek może sfinansować kilka osób naraz: „Wspólnie” w edytorze operacji – ja i domownicy, równo, procentami albo
  kwotami. Moja część to mój wydatek, części innych idą do ich sald; jedna kategoria, bez rozbijania paragonu. Nowa kwota
  albo kategoria przelicza części.
- To samo w szybkim wpisie („wspólnie”), w Operacjach dla zaznaczonych („wspólnie…”), w decyzjach importu z mBanku i w
  regułach – kolejne importy dzielą zakupy tej marki same. Procenty, które nie dają razem 100 %, nie zostaną zapisane.
- „Prezent od: X” – osoba płaci za mnie i nic nie jest winna: najpierw z jej zaliczki, resztę pokrywają osłony; wydatek
  nie zjada energii ani kopert. Prezent także jako część wspólnego zakupu.
- Konto „Gotówka” (portfel): zwrot gotówką od domownika to wpływ na tym koncie, wydatki z portfela – szybkim wpisem;
  w kreatorze saldo gotówki nieobowiązkowe.
- Babcia i dziadek jako dwie osoby (Ustawienia → Domownicy); ich wspólną wpłatę dzieli podział wpłaty z 1.4.0.

Domownicy:
- Operacje sprzed dnia rozliczeń, których salda na start nie obejmują – dopisane później (import z banku z opóźnieniem,
  drugi komputer), z datą przesuniętą przed ten dzień albo z domownikiem dodanym potem – liczą się zaraz po saldach na
  start, nic nie znika; Ustawienia → Domownicy podają ich liczbę. Dzień rozliczeń nowego folderu to dzień po ostatniej
  operacji z banku.
- Zwrot towaru z zakupu domownika z importu trafia do niego („Zwrot towaru – dla: X”), nie do mnie.
- Połączone nazwy nie zabierają wpłacie domownika rozpoznania.
- Gra: zakup za domownika (albo jego prezent) nie daje naruszenia ciszy nocnej, impulsu ani osłon poniżej minimum –
  liczy się tylko moja część.
- Reguła zapamiętana jeszcze raz (np. sama kategoria) nie zostawia starego podziału ani prezentu.

ICTTJ i dokowanie:
- Usunięcie zadokowanej operacji usuwa jej dokowanie („Cofnij” cofa oba) – wpis ICTTJ znów czeka na zadokowanie.
- Pula wpisu zmieniona w ICTTJ po dokowaniu – znaczek „pula zmieniona”; ponowne dokowanie bierze nową.
- Wpis zadokowany na dwóch komputerach przed synchronizacją – znaczek „podwójnie” i przycisk usuwający drugie
  dokowanie (zostaje to z operacją z banku); ta sama wypłata na Portfelu XTB z obu komputerów to jeden plik.
- „Portfel XTB?” dopiero, gdy plik z banku obejmuje dni po oknie wypłaty (okres pliku, nie dzień importu).
- O starcie budżetu decyduje data pieniędzy w banku: wypłata wpisana w ICTTJ przed startem, a zaksięgowana po nim, dokuje.
- Dzień z niezadokowaną parą wypłaty czeka w grze (najwyżej tydzień) – najpierw pula, potem ocena dnia.
- Wpis usunięty w ICTTJ i wpisany od nowa – operacja z banku paruje z nowym, bez „Portfel XTB?”.
- Kwota w banku inna o grosze (przewalutowanie, opłata) albo przelew po świętach – „inna kwota” do potwierdzenia w
  oknie dokowania, pieniądze nie liczą się dwa razy.
- Dni robocze bez polskich świąt (Wielkanoc, Boże Ciało, 11 listopada, Wigilia…) w oknie 3 dni roboczych wypłaty.

## 1.4.3

Szybkość przy dużym folderze – poprawki z przeglądu aplikacji po 1.4.1 (decyzje D84). Zmierzone na syntetycznym folderze
z 10 lat: 30 tys. i 150 tys. operacji.

Praca w oknie:
- Kontrahent, tytuł i notatki operacji i kontenera zapisują się po wyjściu z pola albo Enterze (Esc cofa) – pisanie nie
  przelicza już całego budżetu przy każdym znaku. Gdy w tym czasie ten sam tekst zmienił się na innym komputerze, zostaje
  wpisany tutaj, a okno o tym mówi (tamta wersja jest w historii wpisu).
- Budżet i gra liczą się raz na dzień i tylko po zmianie danych, których potrzebują; zapis wpisu nie przelicza wszystkiego
  drugi raz.
- Operacje otwierają się w 0,1 s (było 0,5 s przy 30 tys. i 9 s przy 150 tys.), Raporty w 0,05 s (było 0,44 s);
  „Możliwe duplikaty” liczą się chwilę po zmianie i do 13 razy szybciej.
- Zaległe dni gry zamrażane porcjami w tle – okno nie zamiera po dłuższej przerwie.
- Pamięć okna przy 30 tys. operacji: 45 MB zamiast 131 MB.

Folder danych:
- Import z banku zapisuje operacje jedną paczką: 2000 operacji w ok. 3 s (było kilka minut przy 30 tys. i ponad 20 min
  przy 150 tys.); sprzątanie duplikatów i jego „Cofnij” też paczką. Zapis pojedynczej zmiany trwa milisekundy przy każdej
  wielkości folderu.
- Zapis na Windows nie skanuje całego folderu – aplikacja sprawdza tylko zmieniony katalog; pełna kontrola co 5 minut i
  najwyżej raz na minutę przy przejściu do okna, bez wstrzymywania zapisów.
- „Zachowaj nowsze” w Synchronizacji jednym ruchem, bez przeskanowania folderu po każdej pozycji.

Kopie zapasowe:
- Kopia dzienna także wtedy, gdy aplikacja tygodniami działa w zasobniku: co godzinę i po wybudzeniu komputera sprawdza,
  czy jest dzisiejsza.
- Zostaje 14 dziennych i 8 tygodniowych (było 30 dziennych); pierwsze tygodniowe powstają z dotychczasowych dziennych.
- Kopia ZIP ok. 12 razy szybsza: 2 s przy 30 tys. operacji (było 23 s), 13 s przy 150 tys. (było ok. 3 min), bez historii
  zmian; plik, którego nie da się odczytać, przerywa kopię zamiast zostać po cichu pominięty.
- Ustawienia → Folder i kopie: „Ostatnia kopia: dziś / wczoraj / N dni temu”, ostrzeżenie, gdy ma ponad 3 dni.

Szybki wpis:
- Okno otwarte ponownie zaraz po zapisie nie chowa się samo, gdy na ten sam wpis przyszły dwie odpowiedzi (podwójny
  Enter z 1.4.2) – liczył się wtedy podwójny licznik zamknięcia.

## 1.4.2

Pieniądze i dane się zgadzają – poprawki z przeglądu aplikacji po 1.4.1 (decyzje D84).

Cele (Mapa gwiezdna):
- Zmiana celu – kolejność, kwota, archiwizacja – i nowy cel liczą się od chwili zmiany: pieniądze, które przyszły
  wcześniej, zostają tam, gdzie trafiły (wcześniej cała historia przeliczała się od nowa i pieniądze przeskakiwały
  między celami i osłonami). Dostawa zadokowana później trafia do celów z chwili dokowania.
- Archiwizacja celu z pieniędzmi pyta, co z nimi: do osłon, do innego celu albo zostają w celu (z „Cofnij”); na liście
  zarchiwizowanych „przenieś środki” także później – również dla celów scenariusza ICTTJ zarchiwizowanych przy zmianie
  scenariusza (wcześniej ich pieniądze były zamrożone).
- Wydatek z pieniędzy celu: w edytorze operacji pole „Z celu” (cel płaci, ile ma, resztę osłony).
- Podział łupów proponuje tylko cele, które teraz biorą pieniądze.
- Scenariusz ICTTJ zapamiętany przy pierwszym podłączeniu; zmiana scenariusza dopiero po potwierdzeniu (cele
  poprzedniego są archiwizowane, ich pieniądze zostają).

Domownicy i import z mBanku:
- Zmiana daty „Rozliczenia od” przelicza salda na start (komunikat z „Cofnij”) – sald domowników nic nie liczy drugi raz.
- Każdy domownik „pytaj” ma w imporcie własny temat – decyzja jednej osoby nie przypisuje pieniędzy drugiej.
- Ta sama operacja z „Historii rachunku” i z „Listy operacji” nie wchodzi drugi raz; panel duplikatów łączy takie
  pary zaimportowane wcześniej.

Ładownia i plan miesiąca:
- Edytor kontenera: miesiące „od / do” i cykl „inny…” zapisują się po wyjściu z pola (wcześniej przy każdym znaku –
  miesiąca nie dało się wpisać), nazwa nigdy pusta.
- Opłata okresowa zapłacona przed terminem zamyka cykl: bez drugiego zbierania z energii, bez fałszywego „Za plan o …”
  w Ładowni i ostrzeżeń w odprawie i na Radarze. Zaległa zapłata poprzedniego cyklu nie zamyka następnego.
- Kontener dodany w trakcie budżetu zbiera od bieżącego miesiąca (nie wstecz), archiwizacja liczy się od swojego
  miesiąca, a resztka zbiornika po końcu życia kontenera wraca do osłon.
- Zmiana planu minionego miesiąca nie zmienia bieżącego ani kolejnych.
- Debriefing i raport pokazują podział łupów taki, jak go zrobił silnik – z informacją, gdy łupy zmieniły się po decyzji.

Folder danych i dwa komputery:
- Nieudane usunięcie (plik zajęty przez OneDrive albo antywirusa) – komunikat, wpis zostaje; usunięcie jest ponawiane.
- Plik chwilowo nieczytelny (OneDrive go jeszcze pobiera) nie jest „uszkodzony”: aplikacja czyta go ponownie i nigdy
  go nie odsuwa.
- Zamknięcie aplikacji czeka na wszystkie zapisy (najwyżej minutę, potem pyta).
- Rozstrzygnięcie konfliktu odkłada odrzuconą wersję do historii wpisu; nie kasuje jedynej czytelnej wersji i nie
  nadpisuje pliku zapisanego przez nowszą wersję aplikacji.
- Plan miesiąca zrobiony na dwóch komputerach: druga wersja czeka w Synchronizacji jako kopia do wyboru (nowe plany mają
  stałe id miesiąca).
- Scalanie zmian z dwóch komputerów nie usuwa pól dodanych po jednej stronie (np. nowej koperty); wybór „Weź z …”
  w trakcie zapisu trafia na dysk.
- Wpis usunięty właśnie na drugim komputerze nie wraca po cichu przy zapisie – okno pyta, czy go zachować.
- Folder z ponad 125 tys. plików się otwiera.

Inne:
- Szybki wpis zapisuje operację raz (drugi Enter, podwójne kliknięcie); Esc zamyka okno także z wpisaną kwotą.
- Esc w polach kwoty, daty, godziny, miesiąca i nazwy odrzuca wpisaną wartość (wcześniej ją zapisywał).
- Gra: długa notatka naruszenia nie blokuje zapisu miesiąca.

## 1.4.1

Wczytywanie folderu krok po kroku (zgłoszenie użytkownika: na drugim komputerze aplikacja wisiała minutami przy
otwieraniu folderu danych, decyzja D82).

- Przyczyna: OneDrive trzyma na nowym komputerze pliki tylko online i pobiera każdy przy pierwszym odczycie, a aplikacja
  czytała pliki tylko czterema „rękami” naraz – kilka czekających plików zatrzymywało całą resztę. Teraz czyta ich
  znacznie więcej równolegle i zawsze zostawia zapas na zapis.
- Przy otwieraniu folderu (ekran wyboru i start aplikacji) widać, co się dzieje: etap, „Wczytywanie plików: x z N” z
  paskiem, plik, na który aplikacja czeka najdłużej, i czas. Gdy pliki czytają się wolno – podpowiedź „Zawsze zachowuj na
  tym urządzeniu” (prawy klik na folderze w Eksploratorze).
- „Przerwij” wraca do wyboru folderu i niczego w nim nie zmienia; „Spróbuj ponownie” otwiera go jeszcze raz.
- „Otwórz folder logów” na ekranie wyboru folderu. Log zapisuje każdy etap otwierania (co 10 s, także gdy aplikację
  zamknięto w trakcie), czasy i najwolniejsze pliki, długie obliczenia okna, a gdy okno przestaje odpowiadać – co
  właśnie liczyło (po 10 s także okienko z informacją).

## 1.4.0

Domownicy bez własnego konta i przychody ze średnich (zgłoszenie użytkownika po 1.3.0, decyzja D81).

- Rozliczenia z domownikami od wybranego dnia – przy pierwszym uruchomieniu od dziś: to, co osoby były winne albo
  wpłaciły z góry do wczoraj, jest ich saldem na start (Ustawienia → Domownicy: „Na start rozliczeń: ma oddać /
  zaliczka”, do zmiany). Przelewy domowników sprzed tej daty nie są Twoim przychodem.
- Jeden przelew z pieniędzmi kilku osób: przy wpłacie „podziel na osoby” – każda część spłaca to, co jej osoba ma oddać,
  reszta to jej zaliczka albo przychód; reszta kwoty zostaje nadawcy.
- Osoba bez konta: „Pieniądze przekazuje przez: Tata”. Przelew Taty dalej jest Taty, a przy nim pojawia się „+ także za
  Mamę (ma oddać …)” – jedno kliknięcie, nic samo; w szybkim wpisie pole „W tym za Mamę”. Przypomnienie i Radar mówią,
  przez kogo osoba przekazuje pieniądze.
- Panel „Przychody” w Planie miesiąca i na Mostku: średnie z 3, 6 i 12 pełnych miesięcy i mediana (jedna premia jej nie
  rusza), osobno praca i inne wpływy oraz trading XTB (wypłaty minus dopłaty, bez puli Podatek), porównanie z pensją.
  Ostrzeżenie „pensja wyższa niż średnie wpływy” i raporty liczą przychód tak samo.
- Lista operacji i CSV mówią, czyje są pieniądze wpłaty („od: Tata, Mama”).

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
