# Financial Intel – zmiany

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
