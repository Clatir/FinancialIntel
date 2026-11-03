# Audyt 1.15.4 – punkty: kreator startu, Mostek, szybki wpis

Zakres: pierwsze uruchomienie (wybór folderu i kreator budżetu), Mostek z odprawą i wszystkimi panelami oraz okno
szybkiego wpisu – aplikacja na komputerze (Windows, Electron), wydanie 1.15.4.

Legenda:
- **Nagłówek:** identyfikator, funkcja i źródło wymagania: spec (`docs/specyfikacja.md`), D… / T… (`docs/decyzje.md`),
  F… / B… / N… (`docs/przeglad/`), N-PC-… (audyt 1.15.2, D95), wersja (`CHANGELOG.md`). „Brak wymagania” – wymagania
  milczą; oczekiwane jest zachowanie sensowne dla użytkownika, opisane w punkcie.
- **Kto:** Claude – laboratorium: wydanie sterowane Playwrightem na syntetycznym folderze, okno szybkiego wpisu
  otwierane przez `window.fi.quickOpen()`, okna systemowe wyboru folderu podstawiane; Maszyna – Cowork w maszynie
  z Windows (zegar do przodu, zasobnik, globalny skrót, logowanie); Ty – tylko użytkownik (głos, dźwięk, ocena).
- **Ryzyko:** wysokie (pieniądze, dane, główna ścieżka dnia), średnie, niskie.
- **Stan danych:** `pusty`, `start`, `rok`, `brzegi`, `dwa-komputery` (`docs/audyt/plan.md`) i to, czego punkt
  potrzebuje ponad stan. Kwoty w przykładach są syntetyczne.
- **Jak sprawdzić / Oczekiwany efekt / Nie przechodzi, gdy** – jak w odbiorze Regulated Day; nazwy przycisków i pól
  dosłownie z ekranu.
- **Odczyt liczb:** liczby do zapisania w `C:\FI-audyt\odczyty\` z datą i godziną odczytu; punkt z odczytem dostaje
  werdykt „liczby → AU-9”, wartości ocenia wyrocznia.

### KR – kreator startu

#### KR.1 Ekran wyboru folderu przy pierwszym uruchomieniu (spec „Kreator startu” 1, D62, 0.1.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty` – czysty `userData`, bez folderu;
  `FI_DEFAULT_DATA_DIR` wskazuje folder w laboratorium
- **Jak sprawdzić:** uruchomić wydanie; przeczytać ekran (tekst i zrzut).
- **Oczekiwany efekt:** ekran „Financial·Intel” z pytaniem „Kapitanie, gdzie trzymamy dziennik pokładowy?” i
  wyjaśnieniem (pliki JSON, najlepiej OneDrive, wybór zapamiętany na tym komputerze); duży przycisk propozycji
  „Utwórz w OneDrive (zalecane)” ze ścieżką `…\FinancialIntel` (bez OneDrive – „Utwórz w Dokumentach” z dopiskiem, że
  OneDrive nie jest skonfigurowany); „Nowe dane gdzie indziej – wybierz pusty folder”; „Otwórz istniejące – folder z
  plikiem fi.json (np. z drugiego komputera)”; „Folder logów (diagnostyka)”. Przed wyborem nie ma ekranów budżetu.
- **Nie przechodzi, gdy:**
  - nie ma propozycji jednym kliknięciem albo wskazuje inny folder niż `<OneDrive>\FinancialIntel`
    (bez OneDrive – `Dokumenty\FinancialIntel`, D62);
  - aplikacja zakłada folder sama, bez kliknięcia;
  - na ekranie są angielskie teksty albo identyfikatory techniczne.

#### KR.2 Nowy folder danych z propozycji (D62, D68, D69, T158, 0.1.0, 1.5.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` (jak KR.1)
- **Jak sprawdzić:** kliknąć przycisk propozycji; przeczytać `fi.json` i listę plików folderu; Ustawienia → Konta
  i → Kategorie; sprawdzić, że poza folderem laboratorium i `userData` nic nie powstało.
- **Oczekiwany efekt:** folder z `fi.json` (wcięcie 2 spacje, końcowe `\n`, `schemaVersion`), okręt „Flagowiec”; konta
  mBank, Portfel XTB i Gotówka; 9 kategorii startowych z podkategoriami (D68) i systemowa „Gotówka”, podkategoria
  Auto · przejazdy (D69); koperty codzienne: Jedzenie, Rozrywka i hobby, Osobiste, Gotówka (reszta nie); reguły
  startowe Bolt → Rozrywka i hobby, KOLEO → Auto · przejazdy. Aplikacja przechodzi do okna głównego z banerem
  kreatora (KR.6).
- **Nie przechodzi, gdy:**
  - brakuje konta, kategorii albo reguły startowej, albo jest kategoria „Trading” (D57);
  - plik ma inny format (wcięcie, brak `\n`);
  - cokolwiek zapisało się w prawdziwym OneDrive albo w `%APPDATA%\Financial Intel`.

#### KR.3 „Nowe dane gdzie indziej” – folder z innymi plikami (1.5.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty` + folder w laboratorium z dwoma obcymi plikami
- **Jak sprawdzić:** „Nowe dane gdzie indziej”, w oknie wyboru wskazać folder z obcymi plikami; przeczytać komunikat
  i przyciski; utworzyć dane; porównać obce pliki przed i po (suma kontrolna).
- **Oczekiwany efekt:** komunikat, że folder zawiera inne pliki, i przycisk „Utwórz podfolder FinancialIntel”; dane
  powstają w `<folder>\FinancialIntel`, obce pliki bez zmian.
- **Nie przechodzi, gdy:**
  - `fi.json` powstaje obok obcych plików bez pytania;
  - obce pliki są zmienione albo usunięte;
  - jedyną drogą jest „Spróbuj ponownie”.

#### KR.4 „Otwórz istniejące” – budżet z drugiego komputera (spec „Okna i zasobnik”, D64, N100, 1.6.5)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`, czysty `userData` i inna `FI_MACHINE_NAME`
- **Jak sprawdzić:** „Otwórz istniejące”, wskazać folder `rok`; przeczytać banery i Mostek; „Nie” w pytaniu o start
  z Windows; zamknąć („Zakończ”) i uruchomić ponownie.
- **Oczekiwany efekt:** budżet otwiera się od razu (Mostek ze Stanem okrętu), bez kreatora i bez banera kreatora;
  jeden raz baner „Uruchamiać Financial Intel z Windows na tym komputerze? …” z „Tak, z Windows” / „Nie”; po wyborze
  nie wraca. W folderze zmienia się tylko obecność komputera.
- **Nie przechodzi, gdy:**
  - pokazuje się kreator albo „Budżet jeszcze nie wystartował”;
  - pytania o autostart nie ma wcale (D64: drugi komputer nie dostałby autostartu) albo wraca po każdym starcie.

#### KR.5 Postęp otwierania folderu i „Przerwij” (D82, 1.4.1)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `FI_OPEN_DELAY_MS` i `FI_OPEN_SLOW_MS` spowalniają
  odczyt plików
- **Jak sprawdzić:** suma kontrolna folderu; „Otwórz istniejące”; w trakcie przeczytać panel postępu; „Przerwij”;
  suma kontrolna jeszcze raz; „Otwórz folder logów”.
- **Oczekiwany efekt:** panel z etapem („Sprawdzanie folderu”, „Szukanie plików – znaleziono N”, „Wczytywanie plików:
  x z N”), paskiem, czasem w sekundach, plikiem, na który aplikacja czeka („Czeka N s: …”), a przy wolnych plikach
  podpowiedź „Zawsze zachowuj na tym urządzeniu”; „Przerwij” wraca do wyboru folderu; folder bajt w bajt bez zmian.
- **Nie przechodzi, gdy:**
  - okno wisi bez postępu;
  - „Przerwij” zostawia częściowo otwarty budżet albo zmienia choć jeden plik.

#### KR.6 Baner kreatora przed startem budżetu (spec „Kreator startu”, N23, T220, 1.6.1)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty` po KR.2; wariant: przed kreatorem saldo otwarcia
  mBanku wpisane w Ustawienia → Konta z datą pierwszej operacji historii
- **Jak sprawdzić:** przeczytać baner na Mostku i w Operacjach; w wariancie – baner i Dowództwo.
- **Oczekiwany efekt:** „Budżet jeszcze nie wystartował: kreator startu ustawi salda, pensję, warstwy okrętu i koperty.”
  z przyciskiem „Kreator startu”; w wariancie: „Budżet liczy się na razie od salda otwarcia, bez planu: kreator startu
  ustawi od dziś salda, pensję, warstwy okrętu i koperty. Dowództwo zacznie się po kreatorze.”, a Dowództwo nie ocenia
  dni. Baner znika na ekranie kreatora i po „Uruchom budżet”.
- **Nie przechodzi, gdy:**
  - baneru nie ma albo mówi, że budżet nie działa, choć silnik liczy go od salda otwarcia;
  - gra ocenia dni przed kreatorem.

#### KR.7 Krok 1 „Konta i salda” – saldo teraz staje się saldem otwarcia (spec „Kreator startu” 2, T51)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + historia z CSV zaimportowana w kroku 2, w niej
  dwie operacje mBanku z dziś (np. −45,90 i −12,00 zł)
- **Jak sprawdzić:** „1. Konta i salda”: mBank 8 432,17, Portfel XTB 1 250,00, Gotówka pusta; dokończyć kreator;
  Ustawienia → Konta (saldo otwarcia i jego data); Mostek → „Suma kont budżetu”.
- **Oczekiwany efekt:** notki „Saldo każdego konta tak, jak widzisz je teraz w banku (z dzisiejszymi operacjami). Od
  dziś suma kont = warstwy okrętu.” i o koncie tradingowym XTB poza budżetem; przy Gotówce „puste = 0 zł”. Saldo
  otwarcia mBanku z datą dziś = saldo teraz − dzisiejsze operacje (8 490,07 zł); „Suma kont budżetu” = 9 682,17 zł.
- **Nie przechodzi, gdy:**
  - saldo otwarcia równa się wpisanemu (dzisiejsze operacje liczą się dwa razy);
  - Gotówka jest wymagana;
  - suma kont na Mostku różni się od sumy wpisanych sald.
- **Odczyt liczb:** wpisane salda, saldo otwarcia każdego konta, „Suma kont budżetu”.

#### KR.8 Krok 1 – konto z saldem otwarcia i pustym polem (B8, T183, 1.5.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + historia z CSV + saldo otwarcia mBanku ustawione
  wcześniej w Ustawienia → Konta
- **Jak sprawdzić:** w kroku 1 zostawić pole mBanku puste; przeczytać podpowiedź; „6. Podział środków”; uruchomić.
- **Oczekiwany efekt:** podpowiedź „Ma już saldo otwarcia – puste pole: X zł (saldo otwarcia i operacje do
  wczoraj).”; „Obecne środki” w kroku 6 obejmują X; po starcie zostaje jedno saldo otwarcia, a „Suma kont budżetu” =
  X + dzisiejsze operacje mBanku + pozostałe konta.
- **Nie przechodzi, gdy:**
  - konto liczy się jako 0 zł w „Obecnych środkach”;
  - kreator mimo podpowiedzi wymaga salda;
  - po starcie konto ma drugie saldo otwarcia.
- **Odczyt liczb:** X, „Obecne środki”, „Suma kont budżetu” po starcie.

#### KR.9 Krok 1 – operacja z datą po dziś (B127, T220, 1.6.1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + historia z CSV + operacja ręczna na mBanku
  z datą za 5 dni (−300,00 zł)
- **Jak sprawdzić:** w kroku 1 wpisać saldo mBanku teraz; przeczytać podpowiedź; uruchomić; porównać saldo otwarcia,
  saldo konta dziś i w dniu operacji (Operacje, Radar → salda kont).
- **Oczekiwany efekt:** podpowiedź „Na koncie 1 operacja z datą po dziś – saldo „teraz” jej nie obejmuje, silnik
  odejmie ją w jej dniu.”; saldo otwarcia bez tych 300 zł; saldo konta spada o 300 zł dopiero w dniu operacji.
- **Nie przechodzi, gdy:**
  - saldo otwarcia jest pomniejszone albo powiększone o operację z przyszłości;
  - operacja liczy się dwa razy.
- **Odczyt liczb:** saldo teraz, saldo otwarcia, saldo konta dziś i w dniu operacji.

#### KR.10 Krok 1 – brzegi kwot salda (spec „Zasady” – grosze; brak wymagania dla salda ujemnego)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty`
- **Jak sprawdzić:** w polach sald wpisać: 0 (Portfel XTB), −150,00 (mBank w debecie), potem 1 234 567,89; spróbować
  „1.200” i „12,345”; przejść do kroku 6 i po starcie na Mostek.
- **Oczekiwany efekt:** 0 przyjęte jako puste konto; saldo ujemne przyjęte i pokazane bez zmiany znaku (osłony mogą
  wyjść poniżej zera – widać to jako alarm, nie błąd); duża kwota „1 234 567,89 zł” bez zaokrągleń i bez rozjechanego
  układu; „1.200” i trzy miejsca po przecinku odrzucone (1.6.4).
- **Nie przechodzi, gdy:**
  - grosze giną albo kwota ujemna zmienia się w dodatnią;
  - „1.200” przyjęte jako 1,20 zł;
  - kreator albo Mostek zgłasza błąd przy ujemnych środkach.
- **Odczyt liczb:** wpisane salda, „Obecne środki”, osłony po starcie.

#### KR.11 Krok 1 – „Domownicy i rozliczenia na start” (N-PC-18, D81, 1.15.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + historia z CSV
- **Jak sprawdzić:** sekcja „Domownicy i rozliczenia na start (opcjonalnie)”: „Ania” → „Dodaj domownika”, „ma
  oddać” 240,00; „Łukasz Żółć” → „zaliczka” 300,00; u Ani wpisać jeszcze zaliczkę; uruchomić budżet; Mostek →
  „Rozliczenia z domownikami” i Stan okrętu; Ustawienia → Domownicy.
- **Oczekiwany efekt:** osoby od razu na liście; u jednej osoby „ma oddać” i „zaliczka” wykluczają się; po starcie Ania
  „ma oddać” 240,00 zł (saldo na start rozliczeń), Łukasz „zaliczka – czeka na wydatki” 300,00 zł, „Domownicy mają
  oddać razem” 240,00 zł, „Depozyt domowników” 300,00 zł; w Ustawieniach „Na start rozliczeń” z tymi kwotami, data
  rozliczeń = dzień startu.
- **Nie przechodzi, gdy:**
  - salda na start nie trafiają do budżetu albo osoba ma obie kwoty naraz;
  - data rozliczeń jest inna niż dzień startu;
  - polskie znaki w imieniu są zniekształcone.
- **Odczyt liczb:** ma oddać, zaliczka, „Domownicy mają oddać razem”, „Depozyt domowników”.

#### KR.12 Podział środków a stan okrętu po starcie, gdy są salda domowników (spec „Pieniądze”, D80 c–d, T116)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** jak KR.11 (należność 240 zł, zaliczka 300 zł)
- **Jak sprawdzić:** zapisać kwoty z „6. Podział środków”; „Uruchom budżet”; od razu przeczytać Stan okrętu.
- **Oczekiwany efekt:** suma warstw na kontach = „Suma kont budżetu” (spec); zaliczka 300 zł jest w „Depozycie
  domowników”, nie w osłonach (D80 c); należność 240 zł to pieniądze poza kontami – ich zwrot zasili osłony (D80 d).
  Osłony na Mostku zgadzają się z krokiem 6, a jeśli nie – różnicę wyjaśnia ekran kreatora.
- **Nie przechodzi, gdy:**
  - osłony po starcie różnią się od kroku 6 bez wyjaśnienia;
  - zaliczka liczy się dwa razy (w osłonach i w depozycie) albo suma warstw ≠ suma kont.
- **Odczyt liczb:** osłony, kadłub, cele z kroku 6; osłony, kadłub, cele, depozyt i „Suma kont budżetu” po starcie.

#### KR.13 Krok 2 „Historia z mBanku” – import i powrót do kreatora (spec „Kreator startu” 3, D27, 1.0.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + CSV persony (Windows-1250, 14 miesięcy)
- **Jak sprawdzić:** wpisać salda w kroku 1; „2. Historia z mBanku” → „Importuj plik z mBanku”; wczytać plik,
  rozstrzygnąć tematy („Przyjmij pewne” i kilka decyzji grupowych), zapisać import; „Wróć do kreatora”.
- **Oczekiwany efekt:** na ekranie Import przycisk „Wróć do kreatora”; po powrocie krok 2 z licznikiem „W budżecie:
  N operacji, pełne miesiące od RRRR-MM (do średnich: K mies.)” zgodnym z plikiem; salda z kroku 1 zostają; kopia przed
  importem w `backups/pre-import/`.
- **Nie przechodzi, gdy:**
  - powrót zaczyna kreator od nowa (np. baner „Kreator startu” widoczny w Imporcie kasuje odpowiedzi);
  - liczba operacji różni się od zaimportowanych albo nie ma kopii przed importem.
- **Odczyt liczb:** N, pierwszy pełny miesiąc, K.

#### KR.14 Kreator bez historii z banku (spec „Kreator startu” 3–4, T27, 1.0.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty`, bez importu
- **Jak sprawdzić:** przejść kroki bez importu; pensja 4 000,00; „Średnie koszty miesięczne” 3 200,00; uruchomić.
- **Oczekiwany efekt:** krok 2 „Brak operacji.” i notka, że pensję i koperty wpisze się samemu; krok 3 „Brak pełnego
  miesiąca historii – wpisz kwotę.” i pole średnich kosztów; cel kadłuba 19 200,00 zł (3 200 × 6); krok 4 „Brak
  propozycji. Stałe opłaty dodasz w Ładowni.”; budżet startuje; panel Przychody „Średnie będą po pierwszym pełnym
  miesiącu historii.”
- **Nie przechodzi, gdy:**
  - kreator nie pozwala wystartować bez historii;
  - cel kadłuba jest pusty mimo przyjętych kosztów albo pojawia się błąd zamiast komunikatu.
- **Odczyt liczb:** cel osłon, cel kadłuba, energia dziś po starcie.

#### KR.15 Krok 3 – propozycja pensji ze średnich kosztów (spec „Pensja”, D70, T27, T47, 1.5.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + CSV persony (co najmniej 7 pełnych miesięcy)
- **Jak sprawdzić:** „3. Pensja i warstwy” – przeczytać podpowiedź pod „Pensja miesięczna” i wartość pola.
- **Oczekiwany efekt:** „Średnie koszty netto z 6 pełnych mies.: X zł → propozycja Y zł”; X – średnia kosztów netto
  6 ostatnich pełnych miesięcy (wydatki − zwroty, bez przelewów własnych, dopłat do XTB, zakupów domowników i PIT-38),
  bez bieżącego miesiąca; Y = X w górę do pełnych 100 zł; pole ma Y i da się je zmienić.
- **Nie przechodzi, gdy:**
  - średnia obejmuje bieżący miesiąc, przelewy własne albo zakupy domowników;
  - zaokrąglenie idzie w dół albo do innej jednostki niż 100 zł.
- **Odczyt liczb:** X, Y, liczba miesięcy.

#### KR.16 Krok 3 – pierwsza pensja w miesiącu startu (T45, T220, B126, 1.6.1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + CSV z wydatkami bieżącego miesiąca przed dziś:
  zakupy, zwrot towaru 40 zł i płatność opłaty rocznej (OC)
- **Jak sprawdzić:** krok 3 – notka pod pensją; krok 4 – zaznaczyć OC; wrócić do kroku 3; uruchomić; Plan miesiąca
  i Stan okrętu → „Energia”.
- **Oczekiwany efekt:** „W tym miesiącu wydano już X: pierwsza pensja na resztę miesiąca to Y (pełna od 1. następnego
  miesiąca).”; X = koszty netto miesiąca sprzed startu (zwrot pomniejsza, płatność wybranej OC nie wchodzi); Y = pensja
  − X, nie mniej niż 0; Plan miesiąca i energia miesiąca po starcie mają tę samą Y.
- **Nie przechodzi, gdy:**
  - X obejmuje płatność OC albo zwrot zwiększa X;
  - Y w kreatorze różni się od energii miesiąca po starcie.
- **Odczyt liczb:** X, Y, energia miesiąca po starcie.

#### KR.17 Krok 3 – cele osłon i kadłuba (spec „Kreator startu” 4, D12, D70, T219, 1.6.1, 1.6.6)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty` + CSV persony
- **Jak sprawdzić:** przeczytać etykiety i podpowiedzi; osłony 4, kadłub 9; spróbować 2,5 i 0; w kroku 7 „Minimalne
  osłony (pensje)” 5 przy celu 4.
- **Oczekiwany efekt:** etykiety z prawdziwą nazwą: „Osłony (bufor na pensje) – cel w pensjach”, „Kadłub (fundusz
  awaryjny) – cel w miesiącach”; „Cel osłon: …” = liczba pensji × pensja i „Cel kadłuba: … (średnie koszty … × M)”
  (średnie z 12 miesięcy – spec) przeliczają się od razu; ułamki i 0 odrzucone; minimum wyższe niż cel odrzucone,
  podpowiedź „Najwyżej cel osłon (N pensji).”
- **Nie przechodzi, gdy:**
  - cel kadłuba liczy się z innych kosztów niż średnie miesięczne koszty netto;
  - ułamek albo minimum wyższe niż cel zostaje przyjęte;
  - metafora stoi bez prawdziwej nazwy.
- **Odczyt liczb:** cel osłon, cel kadłuba, średnie koszty.

#### KR.18 Krok 3 – historia krótsza niż 3 pełne miesiące (T27, T47)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty` + krótki CSV persony (2 pełne miesiące i bieżący)
- **Jak sprawdzić:** zaimportować krótki plik; krok 3 – „Średnie koszty miesięczne” 3 500,00; krok 6; po starcie
  Mostek (zasięg, „średnie koszty”).
- **Oczekiwany efekt:** pole widoczne z podpowiedzią „Historia ma mniej niż 3 pełne miesiące: przyjęta kwota posłuży
  do celu kadłuba i zasięgu, dopóki historia nie urośnie.”; cel kadłuba 21 000,00 zł; Mostek liczy zasięg
  z 3 500,00 zł.
- **Nie przechodzi, gdy:**
  - pola nie ma albo cel kadłuba to „—”;
  - Mostek liczy zasięg z innej kwoty.
- **Odczyt liczb:** cel kadłuba, zasięg, średnie koszty na Mostku.

#### KR.19 Krok 4 – ładownia z powtarzających się płatności (spec „Ładownia”, D70, T48, 1.0.0, 1.9.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + CSV persony: czynsz i abonament co miesiąc, OC
  co rok, opłata co kwartał, prąd o zmiennej kwocie
- **Jak sprawdzić:** „4. Ładownia i koperty” – lista „Ładownia (stałe koszty) – powtarzające się płatności z
  historii”; zaznaczyć czynsz, abonament i OC; uruchomić; Ładownia.
- **Oczekiwany efekt:** propozycje z cyklem (co miesiąc, co rok, co 3 miesiące), „· zmienna” przy prądzie, kwotą
  ostatniej płatności (zmienna – szacunek z roku); nic nie jest zaznaczone samo (D70); po starcie w Ładowni tylko
  zaznaczone kontenery, z połączonymi płatnościami tego miesiąca.
- **Nie przechodzi, gdy:**
  - wzorzec z historii nie daje propozycji albo propozycja jest zaznaczona bez decyzji;
  - kontener nie ma połączonych płatności, a płatność OC liczy się w kopercie.
- **Odczyt liczb:** kwoty propozycji, masa ładunku po starcie.

#### KR.20 Krok 4 – koperty pierwszego miesiąca (D70, T47, B75, 1.6.2)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty` + CSV persony
- **Jak sprawdzić:** przeczytać „Koperty pierwszego miesiąca – średnie z N pełnych mies., do 10 zł”; wpisać Jedzenie
  1 500,00, wyczyścić Zwierzęta; zaznaczyć i odznaczyć kontener; uruchomić; Plan miesiąca.
- **Oczekiwany efekt:** każda kategoria z kopertą („codzienna” / „planowa”) ma propozycję = średnie wydatki kategorii
  z 3 pełnych miesięcy, zaokrąglone do 10 zł, bez płatności kontenerów; wpisana i wyczyszczona koperta zostaje po
  zmianie ładowni; przy wydatkach bez kategorii notka „Bez kategorii średnio X miesięcznie – liczy się do energii
  dnia.”; Plan miesiąca ma dokładnie te koperty.
- **Nie przechodzi, gdy:**
  - zmiana ładowni kasuje ręczne koperty (B75);
  - propozycja zawiera płatności kontenera albo Plan miesiąca ma inne limity niż kreator.
- **Odczyt liczb:** propozycja każdej koperty, limity w Planie miesiąca.

#### KR.21 Krok 4 – bilans pensji i dzienny przydział (spec „Podział pensji”, T29, N9, 1.5.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + CSV persony, wybrana OC z płatnością za 2 miesiące
- **Jak sprawdzić:** przeczytać podsumowanie pod kopertami; obniżyć pensję poniżej sumy; przywrócić; uruchomić;
  Plan miesiąca → „Podział pensji”; Mostek → „podstawowy …”.
- **Oczekiwany efekt:** wiersze „Pensja”, „Ładownia (stałe koszty) + odkładki + koperty”, „Niezaplanowane (łupy)”
  albo czerwone „Plan przekracza pensję o …”; przy opłacie blisko terminu „Odkładki w tym miesiącu: X – zbiorniki
  nadrabiają do terminów opłat; potem ok. Y miesięcznie.”; „Podstawowy przydział dzienny: Z” = suma kopert
  codziennych / dni miesiąca, w dół do grosza. Te same kwoty w Planie miesiąca i na Mostku po starcie (N9).
- **Nie przechodzi, gdy:**
  - odkładka pierwszego miesiąca albo podstawowy przydział różni się od Planu miesiąca i Mostka;
  - plan ponad pensję nie daje ostrzeżenia.
- **Odczyt liczb:** wiersze podsumowania, X, Y, Z; to samo w Planie miesiąca i na Mostku.

#### KR.22 Krok 5 „ICTTJ i cele” (spec „Kreator startu” 6, D84 C8, N7, 1.5.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + fikstura ICTTJ ze scenariuszem prognozy (2 cele),
  `FI_ICTJ_APPDATA` z jej ścieżką; suma kontrolna fikstury przed i po
- **Jak sprawdzić:** „5. ICTTJ i cele”: „Użyj folderu ICTTJ z tego komputera”; obejrzeć cele; „Rower górski”
  3 500,00 → „Dodaj cel”; w drugim przebiegu pominąć krok („Dalej”).
- **Oczekiwany efekt:** notka, że krok jest opcjonalny; po wyborze ścieżka i znaczek „czytany”, cele scenariusza ze
  znaczkiem „ICTTJ” w kolejności priorytetów, cel własny na końcu; „Wybierz folder…” wskazuje inny; bez folderu
  „nie wybrano” i kreator idzie dalej; żadnego tekstu o „wersji 1.1” (N7). Folder ICTTJ bajt w bajt bez zmian.
- **Nie przechodzi, gdy:**
  - cokolwiek zapisało się w folderze ICTTJ (waga K);
  - cele ICTTJ da się edytować albo kroku nie da się pominąć;
  - cel z kwotą 0 zostaje przyjęty.

#### KR.23 Krok 6 „Podział środków” – kolejność dokowania (spec „Kreator startu” 5, D13, D70, T51, T183)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + salda teraz razem 40 000,00 zł, pensja 4 000
  (cel osłon 12 000), cel kadłuba 21 900, cele: ICTTJ „A” 5 000 (priorytet 1), własny „B” 3 500
- **Jak sprawdzić:** przeczytać propozycję; kadłub 15 000, potem „propozycja”; zmienić cel B, potem „cele –
  propozycja”; uruchomić z propozycją; Stan okrętu i Mapa gwiezdna.
- **Oczekiwany efekt:** „Obecne środki: 40 000,00 zł na kontach budżetu” i opis kolejności; propozycja: osłony
  12 000, kadłub 21 900, A 5 000, B 1 100, „wolne do decyzji” 0; zmiana kadłuba przenosi różnicę do osłon;
  „propozycja” i „cele – propozycja” przywracają; po starcie Stan okrętu i Mapa gwiezdna mają kwoty z kroku 6.
- **Nie przechodzi, gdy:**
  - kolejność jest inna niż osłony → kadłub → cele według priorytetów;
  - cele dostają pieniądze przed pełnym kadłubem;
  - kwoty po starcie różnią się od kroku 6.
- **Odczyt liczb:** każda pozycja propozycji i po zmianie; osłony, kadłub, cele po starcie.

#### KR.24 Krok 6 – kadłub i cele ponad obecne środki (T183, 1.5.2)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** jak KR.23
- **Jak sprawdzić:** kadłub 39 000; przeczytać komunikat; na kroku 7 najechać „Uruchom budżet”; poprawić kadłub.
- **Oczekiwany efekt:** osłony na czerwono i „Kadłub, cele i zbiorniki (X) przekraczają obecne środki (Y) – zmniejsz
  je.”; „Uruchom budżet” nieaktywny z podpowiedzią „Potrzebne: saldo każdego konta (krok 1), pensja (krok 3) i kadłub
  z celami w granicach środków (krok 6)”; po poprawie aktywny.
- **Nie przechodzi, gdy:**
  - budżet startuje z ujemnymi osłonami z podziału;
  - brak komunikatu albo numery kroków w podpowiedzi nie zgadzają się z listą kroków.

#### KR.25 Krok 6 – zbiorniki opłat okresowych na start (brak wymagania; kod: „N-PC-7”, w D95 N-PC-7 to coś innego)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** jak KR.21 (OC wybrana w kroku 4, płatność za 2 miesiące)
- **Jak sprawdzić:** w kroku 6 przy „zbiornik: OC …” kliknąć „do planu (X)” i przeczytać dymek; wrócić do kroku 4;
  uruchomić; Ładownia → zbiornik OC; Plan miesiąca → odkładki.
- **Oczekiwany efekt:** zachowanie sensowne: kwota zbiornika na start zmniejsza osłony o tyle samo, a odkładka
  pierwszego miesiąca w kroku 4 przestaje nadrabiać; po starcie Ładownia pokazuje tę kwotę w zbiorniku, a Plan miesiąca
  tę samą ratę co kreator; dymek tłumaczy, skąd X.
- **Nie przechodzi, gdy:**
  - kwota zbiornika na start znika po „Uruchom budżet”;
  - pieniądze liczą się dwa razy (w osłonach i w zbiorniku);
  - rata w Planie miesiąca różni się od kreatora.
- **Odczyt liczb:** X, osłony, rata pierwszego miesiąca przed i po, zbiornik w Ładowni.

#### KR.26 Krok 7 „Okręt i rozkazy” – nazwa i rozkazy domyślne (spec „Rozkazy”, D1, D41, C7, T219)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty`
- **Jak sprawdzić:** przeczytać wartości domyślne; „Nazwa okrętu” – „Żółta Łódź Świętej Pamięci Admirała” i próba
  41. znaku; „Dziennik od kwoty” 0; wyłączyć firewall; uruchomić; nagłówek Mostka, Ustawienia → Warstwy i rozkazy,
  Dowództwo.
- **Oczekiwany efekt:** domyślnie „Minimalne osłony (pensje)” 1, „Linia zanurzenia (% pensji)” 40, „Cisza nocna”
  23:00–05:00, „Dziennik od kwoty” 200,00 z podpowiedzią „0 albo puste – dziennik nie pyta.”, firewall włączony
  („Firewall: dopłaty do XTB tylko z „wolnego do decyzji””); nazwa do 40 znaków, na Mostku „okręt <nazwa>” bez
  zniekształceń; wszystkie wartości w Ustawieniach i Dowództwie takie jak w kreatorze.
- **Nie przechodzi, gdy:**
  - wartości domyślne różnią się od specyfikacji;
  - zmiana rozkazu w kreatorze nie trafia do Ustawień;
  - próg 0 w Dowództwie wygląda jak „od 0,00 zł” zamiast „dziennik nie pyta” (N32).

#### KR.27 Krok 7 „Ten komputer” – skrót i start z Windows (spec „Kreator startu” 6, D64, N100, 1.6.5)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty`; w `config.json` wcześniej skrót Ctrl+Shift+Q
  i wyłączone „Zamykaj do zasobnika”
- **Jak sprawdzić:** odczytać pole „Szybki wpis – skrót” i przełącznik „Uruchamiaj z Windows (ukryty w zasobniku)”;
  zmienić skrót na Ctrl+Alt+K; uruchomić; `config.json`, Ustawienia → Powiadomienia i dźwięki, → Zasobnik i start.
  (Faktyczny start z Windows – Maszyna, AU-3.)
- **Oczekiwany efekt:** pole pokazuje bieżący skrót tego komputera (Ctrl+Shift+Q); po starcie skrót Ctrl+Alt+K
  i autostart zgodny z przełącznikiem; „Zamykaj do zasobnika” dalej wyłączone; nic z tego nie trafia do `fi.json`.
- **Nie przechodzi, gdy:**
  - kreator przywraca Ctrl+Alt+B albo włącza zamykanie do zasobnika (N100);
  - skrót zapisuje się w folderze danych.

#### KR.28 „Uruchom budżet” – skutek i zapisane pliki (spec „Kreator startu”, T51, T52, 1.0.0, 1.6.5)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `pusty` + pełny przebieg kreatora (KR.7–KR.27)
- **Jak sprawdzić:** „Uruchom budżet”; przeczytać toast i Mostek; przeczytać nowe i zmienione pliki folderu; potem
  paleta Ctrl+K → „Kreator startu budżetu”.
- **Oczekiwany efekt:** toast „Okręt wypłynął: budżet działa od dziś.” (albo „Budżet uruchomiony – …”, gdy coś
  jeszcze się zapisuje, z wyjaśnieniem); przejście na Mostek ze Stanem okrętu; dźwięk dokowania (ocena – Ty);
  w folderze: salda otwarcia z datą dziś (`balances/`), plan bieżącego miesiąca z pensją i kopertami
  (`months/RRRR-MM.json`), wybrane kontenery, start budżetu = dziś w `fi.json`; baner kreatora znika. Kreator otwarty
  ponownie mówi „Budżet działa od DD.MM.RRRR. Kreator startu jest potrzebny tylko raz.”
- **Nie przechodzi, gdy:**
  - po błędzie zapis jest częściowy (np. salda bez planu);
  - kreator da się przejść drugi raz na działającym budżecie;
  - pliki mają inny format niż JSON z wcięciem 2 spacje i końcowym `\n`.

#### KR.29 Warunki przycisku „Uruchom budżet” (T51, T183)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty`; wariant: folder z atrybutem tylko do odczytu
- **Jak sprawdzić:** na kroku 7 sprawdzić przycisk: bez salda mBanku; z pensją pustą i 0; z kompletem; w wariancie –
  także „Dodaj domownika” i „Dodaj cel”.
- **Oczekiwany efekt:** przycisk nieaktywny z podpowiedzią o brakach, gdy brak salda konta (poza Gotówką) albo pensja
  jest pusta lub 0; aktywny przy komplecie; w folderze tylko do odczytu nieaktywny, a dodawanie domowników i celów
  wyłączone (gdyby start ruszył – „Folder jest tylko do odczytu – budżetu nie można uruchomić.”).
- **Nie przechodzi, gdy:**
  - budżet startuje bez salda albo z pensją 0;
  - nieaktywny przycisk nie mówi dlaczego;
  - w folderze tylko do odczytu coś się zapisuje.

#### KR.30 Nawigacja po krokach i „Przerwij kreator” (spec „Kreator startu”, T51)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty` + CSV persony
- **Jak sprawdzić:** „Dalej” i „Wstecz” przez wszystkie kroki; klik w krok 6 na liście po lewej; w kroku 1 dodać
  domownika, w kroku 5 cel; „Przerwij kreator”; Mostek, Ustawienia → Domownicy, Mapa gwiezdna, pliki folderu.
- **Oczekiwany efekt:** lista 7 kroków („Konta i salda”, „Historia z mBanku”, „Pensja i warstwy”, „Ładownia
  i koperty”, „ICTTJ i cele”, „Podział środków”, „Okręt i rozkazy”) z wyróżnionym bieżącym i ✓ przy minionych;
  „Wstecz” nieaktywny na kroku 1; skok do dowolnego kroku zachowuje odpowiedzi; „Przerwij kreator” wraca na Mostek
  bez startu, sald otwarcia i planu (T51). To, co zostaje po przerwaniu (domownik, cel, folder ICTTJ), jest
  zrozumiałe dla użytkownika – ekran o tym mówi albo nic nie zostaje.
- **Nie przechodzi, gdy:**
  - przerwany kreator zostawia salda otwarcia albo plan miesiąca;
  - domownik i cel zostają zapisane po cichu, choć kreator został przerwany (UWAGA);
  - przerwanie po wielu krokach nie pyta o potwierdzenie (brak wymagania – UWAGA).

#### KR.31 Opuszczenie kreatora i powrót (CLAUDE.md „opuszczenie ekranu nigdy nie gubi zmian”; brak wymagania)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty`
- **Jak sprawdzić:** wypełnić kroki 1–3; Ctrl+2 (Operacje); wrócić banerem „Kreator startu”; powtórzyć z powrotem przez
  paletę „Kreator startu budżetu”; na koniec „Zakończ” w trakcie kreatora i ponowne uruchomienie.
- **Oczekiwany efekt:** powrót banerem albo paletą otwiera kreator z wpisanymi odpowiedziami; po ponownym
  uruchomieniu odpowiedzi wracają albo kreator zaczyna od nowa z jasną informacją; folder nie ma pół-budżetu.
- **Nie przechodzi, gdy:**
  - baner albo paleta czyści salda i pensję bez ostrzeżenia;
  - zamknięcie w trakcie zostawia częściowo uruchomiony budżet.

#### KR.32 Gra po kreatorze (spec „Gra”, D73, T76, T220)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `start` (zaraz po kreatorze, z historią 14 miesięcy)
- **Jak sprawdzić:** Dowództwo: stopień, seria, początek gry, dziennik wachty.
- **Oczekiwany efekt:** Kadet, seria 0, gra od pierwszego pełnego dnia po uruchomieniu (jutro); żaden dzień historii
  nie jest oceniony (historia służy tylko statystykom Wywiadu).
- **Nie przechodzi, gdy:**
  - dni sprzed startu mają oceny albo naruszenia z importowanej historii;
  - gra startuje przed kreatorem.

#### KR.33 Kreator na prawdziwym pliku z mBanku (spec „Kreator startu”, kryteria sukcesu)
- **Kto:** Ty · **Ryzyko:** średnie · **Stan danych:** nowy, pusty folder testowy (nie Twój budżet) i Twój CSV
- **Jak sprawdzić:** przejść kreator jak przy pierwszym uruchomieniu, z prawdziwym plikiem; nie na prawdziwym folderze.
- **Oczekiwany efekt:** DO OCENY – propozycje pensji, kopert i ładowni wyglądają wiarygodnie; kroki są zrozumiałe bez
  dokumentacji; całość zajmuje rozsądny czas. Zapisz, gdzie się zawahałeś.
- **Nie przechodzi, gdy:**
  - propozycje są oderwane od Twoich wydatków albo stałe opłaty z historii nie są rozpoznane;
  - któregoś kroku nie rozumiesz bez pytania.

### MO – Mostek

#### MO.1 Mostek przed startem budżetu (spec „Ekrany”, T220, 1.0.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `pusty` po KR.2
- **Jak sprawdzić:** Ctrl+1; przeczytać wszystkie panele.
- **Oczekiwany efekt:** w „Odprawie” „Budżet jeszcze nie wystartował.” z przyciskiem „Kreator startu” (otwiera
  kreator); bez energii dziś, Daily Bias, Stanu okrętu i Dokowania; „Koperty” – „Bez kopert w planie tego miesiąca.”;
  „Ostatnie operacje” – „Brak operacji – szybki wpis albo import z mBanku.”; „Przychody” – „Średnie będą po pierwszym
  pełnym miesiącu historii.”; „Krzywa majątku” – „Za mało danych – …”.
- **Nie przechodzi, gdy:**
  - Mostek pokazuje warstwy z zerami jak działający budżet;
  - panel jest pusty bez tekstu albo pojawia się błąd.

#### MO.2 Energia dziś – liczba i podpis (spec „Dzienny przydział”, T30, kryterium „codziennie jedna liczba”)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (środek miesiąca; wydatki codzienne przed dziś i dziś
  z godziną; zakup za domownika, płatność kontenera i wydatek z celu w tym miesiącu)
- **Jak sprawdzić:** przeczytać nagłówek „Odprawa – <dzień>”, „Energia dziś” i podpis „przydział X · podstawowy Y”.
- **Oczekiwany efekt:** przydział = (koperty codzienne miesiąca z łupami − wydane z nich do wczoraj) / dni do końca
  miesiąca z dzisiejszym, w dół do grosza; energia dziś = przydział − wydane dziś; podstawowy = suma kopert
  codziennych / dni miesiąca; wydatki bez kategorii liczą się jak codzienne, a płatności kontenerów, wydatki z celów
  i zakupy domowników – nie. Duża liczba bez koloru, gdy ≥ 0.
- **Nie przechodzi, gdy:**
  - energia różni się od wyroczni;
  - zakup domownika, płatność kontenera albo wydatek z celu zmniejsza energię;
  - grosz jest zaokrąglony w górę.
- **Odczyt liczb:** energia dziś, przydział, podstawowy, data w nagłówku.

#### MO.3 Energia dziś po przekroczeniu (spec „Dzienny przydział”, D17, T216)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `brzegi` (dziś wydano więcej niż przydział)
- **Jak sprawdzić:** przeczytać energię, odprawę i Daily Bias; „skąd ta liczba?”.
- **Oczekiwany efekt:** energia ujemna na czerwono („−X zł”); w odprawie „Przydział dnia przekroczony o X zł.”; Daily
  Bias Bearish; przekroczenie zmniejsza przydział kolejnych dni (w rozbiciu następnego dnia „Przekroczone wcześniej –
  mniej na każdy dzień”).
- **Nie przechodzi, gdy:**
  - energia pokazuje 0 zł zamiast wartości ujemnej;
  - brak alarmu albo czerwień poza kwotą i alarmem.
- **Odczyt liczb:** energia, przydział, kwota alarmu.

#### MO.4 Energia dziś na przełomie dnia i miesiąca (spec „Dzienny przydział”, D18, T28, T30)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** `rok` w maszynie; aplikacja otwarta przez północ; zegar
  przesuwany na ostatni dzień miesiąca 23:50, potem na 1. dzień rano
- **Jak sprawdzić:** odczyt o 23:50 ostatniego dnia; odczyt po północy bez ponownego uruchomienia; odczyt 1. dnia rano.
- **Oczekiwany efekt:** ostatniego dnia przydział = cała reszta kopert codziennych („Zostało na 1 dzień (z
  dzisiejszym)”); po północy sam zmienia się nagłówek „Odprawa – <nowy dzień>” i energia; 1. dnia energia z nowej
  pensji, nowy podstawowy przydział, w odprawie „Łupy z poprzedniego miesiąca: X – podział do 7. dnia, potem trafią
  do osłon.”
- **Nie przechodzi, gdy:**
  - po północy zostaje wczorajsza energia;
  - ostatniego dnia pojawia się „—”, błąd albo dzielenie przez zero;
  - łupy liczą się w energii nowego miesiąca bez decyzji.
- **Odczyt liczb:** energia, przydział, podstawowy, łupy – w każdym z trzech momentów.

#### MO.5 „Skąd ta liczba?” – rozbicie energii dziś (F29, T295, 1.10.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (łupy poprzedniego miesiąca „na następny miesiąc”)
- **Jak sprawdzić:** kliknąć „skąd ta liczba?” pod energią; przeczytać linie; „zwiń”.
- **Oczekiwany efekt:** linie „Koperty codzienne w tym miesiącu (plan i łupy)”, „Wydane z nich do wczoraj”, „Zostało
  na N dni (z dzisiejszym)”, „Podstawowy przydział (limit / D dni)”, „Zaoszczędzone wcześniej – na każdy dzień” (albo
  „Przekroczone wcześniej – …”), „Przydział na dziś”, „Wydane dziś” i wynik „Energia dziś” równy dużej liczbie; linie
  dają się dodać rachunkowo; „zwiń” chowa rozbicie.
- **Nie przechodzi, gdy:**
  - wynik rozbicia ≠ energia dziś albo linie się nie sumują;
  - N ≠ dni do końca miesiąca z dzisiejszym;
  - pierwsza linia pomija łupy „na następny miesiąc”.
- **Odczyt liczb:** każda linia.

#### MO.6 „Skąd ta liczba?” – zasięg oraz cele osłon i kadłuba (spec „Zasięg”, D72, F29, T218, T295)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` z wziętą pożyczką (dług > 0)
- **Jak sprawdzić:** kliknąć kafelek „Zasięg”; potem „skąd cele osłon i kadłuba?”; sprawdzić, że otwarte jest jedno
  rozbicie naraz.
- **Oczekiwany efekt:** zasięg: „Osłony”, „Kadłub”, „Dług do spłaty” (ujemny), „Paliwo (bez dopływu wypłat)”, „Koszty
  miesiąca (…)”, „Zasięg” = paliwo / koszty, obcięty w dół do 0,1 mies., ta sama liczba co kafelek z podpisem
  „(osłony − dług + kadłub) / koszty”; cele: „Cel osłon: N × pensja”, „Cel kadłuba: M × koszty miesiąca”, „Koszty
  miesiąca” – równe celom w liniach Osłon i Kadłuba; bez pensji „—” i „(brak pensji)”.
- **Nie przechodzi, gdy:**
  - zasięg w rozbiciu ≠ kafelek albo dług nie jest odjęty;
  - cele w rozbiciu ≠ cele w liniach warstw;
  - dwa rozbicia otwarte naraz nakładają się.
- **Odczyt liczb:** linie obu rozbić.

#### MO.7 „Ostatnia dostawa – dokąd poszła?” (spec „Dokowanie”, F29, T295)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` + fikstura ICTTJ; ostatnia zadokowana wypłata z
  częścią na rezerwę PIT-38 i celem
- **Jak sprawdzić:** kliknąć „ostatnia dostawa (DD.MM.RRRR) – dokąd poszła?”; porównać z historią tego dokowania.
- **Oczekiwany efekt:** „Dostawa” = kwota wypłaty, potem „Rezerwa na PIT-38”, „Osłony”, „Kadłub”, „Cel: <nazwa>”;
  części sumują się do dostawy; podział i data jak w zapisie dokowania.
- **Nie przechodzi, gdy:**
  - części się nie sumują albo rozbicie dotyczy innej dostawy niż ostatnia;
  - brak rezerwy PIT-38, choć była w podziale.
- **Odczyt liczb:** każda linia.

#### MO.8 Daily Bias (spec „Analizy”, T57, T216, T258, 1.6.1, 1.6.6)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (energia ≥ podstawowy, koperty planowe w limitach);
  `rok` + koperta planowa ponad limit; `brzegi` (osłony poniżej minimum przy energii ≥ podstawowy)
- **Jak sprawdzić:** w każdym stanie przeczytać Daily Bias na Mostku i w Raporty → odprawa; w `rok` dopisać wydatek
  Jedzenie ponad podział koperty, ale w puli dziennej.
- **Oczekiwany efekt:** Bullish, gdy energia dziś ≥ podstawowy przydział i koperty planowe w limitach; Bearish, gdy
  energia < połowy podstawowego albo osłony poniżej minimum; inaczej Neutral. „▲ Bullish” jasnym tekstem, „◆ Neutral”
  przygaszony, „▼ Bearish” w kolorze akcentu (nie czerwony); koperta codzienna ponad swój podział nie zmienia biasu;
  w Raportach ten sam bias.
- **Nie przechodzi, gdy:**
  - Bullish przy osłonach poniżej minimum;
  - Bearish na czerwono albo inny bias w Raportach.
- **Odczyt liczb:** bias, energia, podstawowy, osłony i minimum.

#### MO.9 Odprawa – alarmy (spec „Rytuały”, T57, T216, N102, N103, 1.6.1, 1.6.6)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `brzegi`: energia miesiąca wyczerpana dwa razy, dwie dopłaty
  do XTB wbrew firewallowi, Auto +15 %, Zdrowie +35 %, korekta salda, masa ładunku ponad linią
- **Jak sprawdzić:** przeczytać listę pozycji odprawy (tekst, kolor kropki i tekstu).
- **Oczekiwany efekt:** czerwone alarmy na górze, z czerwoną kropką i tekstem; żółte z kropką w kolorze akcentu;
  „Energia wyczerpana: …” jedną linią z sumą; każda dopłata osobno: „Firewall: dopłata do XTB X zł wbrew rozkazowi.”;
  Zdrowie (+35 %) czerwone, Auto (+15 %) żółte (próg poważnego naruszenia z Dowództwa); metafory z prawdziwą nazwą
  („Osłony (bufor na pensje) …”, „Masa ładunku (stałe koszty X/mies.) ponad linią zanurzenia.”). W `rok` bez spraw:
  „Bez alarmów – kurs stabilny.”
- **Nie przechodzi, gdy:**
  - druga dopłata do XTB nie ma linii;
  - koperta codzienna ponad swój podział daje czerwony alarm;
  - kwota alarmu różni się od ekranu przyczyny.
- **Odczyt liczb:** tekst i kwota każdej pozycji.

#### MO.10 Odprawa – kliknięcie prowadzi do przyczyny (N28, T221, 1.6.1)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `brzegi` i `rok` (pozycje wszystkich rodzajów)
- **Jak sprawdzić:** kliknąć każdą pozycję; zapisać ekran docelowy i wyróżniony wpis.
- **Oczekiwany efekt:** masa ładunku, zbiornik, asteroida, kontener niezaładowany, koniec kontenera, nowa opłata →
  Ładownia (nowa cena i cichy kontener z wyróżnionym kontenerem); korekta salda i firewall → ta operacja w Operacjach;
  koperta, pensja, osłony, energia, łupy → Plan miesiąca; zaległy import → Import (nowy plik – od razu wczytany);
  salda → Ustawienia → Konta; dostawa → okno dokowania; ICTTJ → Ustawienia → ICTTJ; pożyczka, PIT-38, boja, saldo
  konta naprzód → Radar; domownik → wydatki domowników w Operacjach; misja → Dowództwo; nieznany sygnał i zwrot po
  terminie → ta operacja.
- **Nie przechodzi, gdy:**
  - pozycja prowadzi do Planu miesiąca, choć przyczyna jest gdzie indziej;
  - kliknięcie nic nie robi albo Operacje otwierają się bez wyróżnionej operacji.

#### MO.11 Odprawa – asteroidy (spec „Rytuały”, „Powiadomienia”, T57, B55)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` + OC roczna z terminem za 3 dni, opłata kwartalna za
  14 dni, roczna za 15 dni, roczna opłacona przed terminem
- **Jak sprawdzić:** przeczytać pozycje „Asteroida: …”; porównać z Ładownią.
- **Oczekiwany efekt:** „Asteroida: OC za 3 dni – X zł, w zbiorniku Y zł.” (żółta) i kwartalna „za 14 dni” (info);
  bez pozycji dla terminu za 15 dni i dla opłaty zapłaconej przed terminem; kwota i stan zbiornika jak w Ładowni.
- **Nie przechodzi, gdy:**
  - asteroida pojawia się poza oknem 14 dni albo opłacona dalej ostrzega;
  - stan zbiornika różni się od Ładowni.
- **Odczyt liczb:** kwota i zbiornik każdej asteroidy.

#### MO.12 Odprawa – zaległy import i nowy plik z banku (spec „Rytuały”, T57, F14, 1.9.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `brzegi` (ostatni import mBanku 5 dni temu), `rok` (3 dni
  temu); wariant: CSV mBanku w `FI_DOWNLOADS_DIR`
- **Jak sprawdzić:** przeczytać pozycję importu w obu stanach; w wariancie – pozycję pliku i kliknąć.
- **Oczekiwany efekt:** po 5 dniach „mBank: ostatni import 5 dni temu – zaimportuj nowy plik (…jak pobrać plik
  w mBanku…).”; przy 3 dniach brak pozycji; nowy plik: pozycja „… – importuj.”, kliknięcie otwiera Import z tym plikiem.
- **Nie przechodzi, gdy:**
  - przypomnienie pojawia się po 3 dniach albo wcześniej;
  - kliknięcie otwiera pusty Import zamiast pliku.

#### MO.13 Odprawa – salda do potwierdzenia (spec „Potwierdzanie sald”, T57, T185, B28)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`: mBank potwierdzony 2 dni temu, Portfel XTB 10 dni
  temu, Gotówka nigdy
- **Jak sprawdzić:** przeczytać pozycje sald; kliknąć.
- **Oczekiwany efekt:** osobna pozycja dla Portfela XTB („Portfel XTB: saldo potwierdzone 10 dni temu – sprawdź
  z bankiem.”); bez pozycji dla mBanku i Gotówki; kliknięcie → Ustawienia → Konta.
- **Nie przechodzi, gdy:**
  - jest jedna wspólna pozycja dla kont albo przypomnienie o Gotówce;
  - brak przypomnienia dla konta niepotwierdzonego ponad 7 dni.

#### MO.14 Odprawa – domownicy (spec „Rozliczenia”, D80 e, D81, D91, T118)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`: Tata ma oddać od 40 dni i ma zwrot czekający na
  przypisanie; Mama (przekazuje przez Tatę) od 35 dni; Ania od 20 dni
- **Jak sprawdzić:** przeczytać pozycje domowników; kliknąć jedną; porównać z panelem „Rozliczenia z domownikami”.
- **Oczekiwany efekt:** pozycja tylko przy najstarszym nieoddanym zakupie ponad 30 dni: „Tata: do oddania X –
  najstarszy zakup z DD.MM (40 dni); zwrot Y czeka na przypisanie do zakupów.”, „Mama: … – przekazuje przez: Tata.”;
  bez pozycji Ani; kliknięcie → wydatki domowników w Operacjach.
- **Nie przechodzi, gdy:**
  - jest jedna łączna pozycja zamiast osobnych;
  - pozycja pojawia się po 20 dniach;
  - kwota różni się od panelu rozliczeń.
- **Odczyt liczb:** kwoty i liczby dni.

#### MO.15 Odprawa – pozostałe pozycje: misja, boje, salda naprzód, czujniki, ładownia (T57, F1, F9, F16, F26, F31, F34)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` + misja tygodnia, boja za 3 dni, płatność, której
  zabraknie na mBanku, nietypowy zakup, zwrot po terminie, kontener bez płatności, kontener z nową ceną
- **Jak sprawdzić:** przeczytać odprawę; dla każdej sprawy: czy jest pozycja, jej tekst i kwota wobec ekranu
  źródłowego; załatwić jedną (np. „To w porządku” przy sygnale) i odczytać jeszcze raz.
- **Oczekiwany efekt:** każda sprawa ma jedną pozycję z prawdziwą nazwą i kwotą („Misja tygodnia – …”, „Boja: …”, „Na
  koncie mBank zabraknie X na płatność DD.MM (…)”, „Nieznany sygnał na radarze – …”, „Kontener cięższy niż w manifeście
  – …”); pozycja znika po załatwieniu sprawy.
- **Nie przechodzi, gdy:**
  - znana sprawa nie ma pozycji albo pozycja wraca po załatwieniu;
  - kwota różni się od Radaru, Ładowni albo Operacji.
- **Odczyt liczb:** kwoty pozycji.

#### MO.16 Odprawa poranna przy pierwszym otwarciu dnia (spec „Rytuały”, D70, T56)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** `rok`; aplikacja w zasobniku przez noc, ostatnio na ekranie
  Operacje
- **Jak sprawdzić:** o 4:30 otworzyć okno z zasobnika i schować; po 5:00 otworzyć znowu; drugi raz tego dnia; wariant:
  okno zostawione na ekranie przez noc – pierwszy ruch myszy po 5:00.
- **Oczekiwany efekt:** pierwsze otwarcie okna po ciszy nocnej przechodzi na Mostek z odprawą dnia; o 4:30 (w ciszy)
  bez przejścia; kolejne otwarcie tego dnia zostaje na wybranym ekranie.
- **Nie przechodzi, gdy:**
  - odprawa pojawia się w ciszy nocnej albo nie pojawia się rano;
  - każde otwarcie wymusza Mostek.

#### MO.17 „Odsłuchaj” – odprawa polskim głosem (spec „Rytuały”, D49, T7, N27, 1.6.1)
- **Kto:** Ty · **Ryzyko:** niskie · **Stan danych:** `rok` i `brzegi` (energia przekroczona); Windows z polskim głosem
- **Jak sprawdzić:** „Odsłuchaj” w Odprawie; potem z ukrytymi kwotami (Ctrl+$).
- **Oczekiwany efekt:** polski głos czyta „Odprawa, <dzień>.”, energię ze złotymi i groszami, przy przekroczeniu
  „Energia na dziś przekroczona o …”, Daily Bias, pozycje odprawy albo „Bez alarmów.”; przy ukrytych kwotach „kwota
  ukryta” zamiast liczb. DO OCENY: zrozumiałość i tempo.
- **Nie przechodzi, gdy:**
  - przy przekroczeniu słychać „0 złotych”;
  - głos jest obcy albo czyta kwoty mimo ukrycia.

#### MO.18 Odsłuch bez polskiego głosu systemu (T7, N27, 1.6.1)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`; Windows bez pakietu mowy pl-PL
- **Jak sprawdzić:** przeczytać nagłówek Odprawy; dodać polski głos w Ustawieniach Windows; uruchomić aplikację znowu.
- **Oczekiwany efekt:** zamiast przycisku „Odsłuch: brak polskiego głosu systemu” z podpowiedzią „Ustawienia Windows →
  Czas i język → Mowa → Zarządzaj głosami → dodaj głos polski”; po dodaniu głosu przycisk „Odsłuchaj” wraca.
- **Nie przechodzi, gdy:**
  - przycisk czyta polski tekst obcym głosem;
  - brak podpowiedzi, jak dodać głos.

#### MO.19 Silver Bullet (spec „Smaczki ICT”, D73, T80, T214)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`; zegar na 10:30 czasu Nowego Jorku, potem 11:05
- **Jak sprawdzić:** w obu chwilach przeczytać Odprawę.
- **Oczekiwany efekt:** o 10:30 NY nad listą ramka „Silver Bullet · 10:00–11:00 NY” z trzema zdaniami: „Energia dziś
  X.”, „Daily Bias: …”, najważniejszy alarm (albo „Bez alarmów.”); pełna lista zostaje pod ramką; o 11:05 NY ramki nie
  ma. Okno liczone w czasie Nowego Jorku (także w tygodniach, gdy zmiana czasu w USA i w Polsce się rozjeżdża).
- **Nie przechodzi, gdy:**
  - ramka jest poza oknem albo zastępuje listę;
  - okno liczy się w czasie Warszawy.

#### MO.20 Stan okrętu – warstwy z prawdziwą nazwą i kwotą (spec „Ekrany”, „Warstwy”, D34)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: cele z pieniędzmi (w tym jeden zarchiwizowany),
  zbiorniki, depozyt, rezerwa puli Podatek, łupy, wzięta pożyczka
- **Jak sprawdzić:** przeczytać panel „Stan okrętu” i dymki metafor; porównać kwoty z Mapą gwiezdną, Ładownią, Radarem.
- **Oczekiwany efekt:** „Osłony · bufor na pensje X / cel” z paskiem i znacznikiem minimum; „Energia · pensja miesiąca
  do wydania”; „Kadłub · fundusz awaryjny X / cel”; „Układy gwiezdne · cele”; „Zbiorniki · odkładki na opłaty
  okresowe”; „Podatek · poza budżetem (PIT-38)”; „Depozyt domowników · ich zaliczki – nie do wydania na siebie”;
  „Łupy · do podziału”; „Dług · pożyczki wzięte – odjęte od zasięgu”; linie bez pieniędzy ukryte; dymek = wpis
  słowniczka. Kwoty jak na ekranach źródłowych.
- **Nie przechodzi, gdy:**
  - metafora stoi bez prawdziwej nazwy albo bez kwoty;
  - „Układy gwiezdne” ≠ pieniądze w celach na Mapie gwiezdnej bez wyjaśnienia (N22 – cele zarchiwizowane);
  - zbiorniki ≠ Ładownia.
- **Odczyt liczb:** każda linia, cele osłon i kadłuba, minimum.

#### MO.21 Suma warstw = suma kont budżetu (spec „Pieniądze”, T4)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `start`, `rok`, `brzegi`
- **Jak sprawdzić:** w każdym stanie zsumować linie warstw leżących na kontach i porównać z „Suma kont budżetu: X”;
  X porównać z sumą sald kont (Ustawienia → Konta, Operacje).
- **Oczekiwany efekt:** osłony + energia + kadłub + cele + zbiorniki + podatek + depozyt (+ łupy, jeśli są osobną
  warstwą – rozstrzyga wyrocznia) = X co do grosza = suma sald kont; dług i należności poza tą sumą.
- **Nie przechodzi, gdy:**
  - różnica choćby 0,01 zł bez wyjaśnienia na ekranie;
  - X różni się od sald kont.
- **Odczyt liczb:** wszystkie linie warstw, X, salda kont.

#### MO.22 „Wolne do decyzji” i „ponad cel osłon” (spec „Zasięg i firewall”, D23, N21, T181, 1.5.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** warianty `brzegi`: (a) osłony 19 000 / 12 000, kadłub
  5 000 / 21 900; (b) osłony 14 000 / 12 000, kadłub pełny; (c) brak celu kadłuba (historia < 3 mies., bez kosztów)
- **Jak sprawdzić:** w każdym wariancie przeczytać podpis pod osłonami.
- **Oczekiwany efekt:** (a) „ponad cel osłon: 7 000,00 zł – kadłub niepełny, nie do dopłaty XTB”; (b) „wolne do decyzji:
  2 000,00 zł”; (c) „ponad cel osłon: … – cel kadłuba jeszcze nieznany (za krótka historia kosztów), nie do dopłaty
  XTB”.
- **Nie przechodzi, gdy:**
  - „wolne do decyzji” pojawia się przy niepełnym albo nieznanym kadłubie (dopłata z tej kwoty łamie firewall).
- **Odczyt liczb:** osłony, cel osłon, kadłub, kwota w podpisie.

#### MO.23 Zasięg i klasa okrętu (spec „Zasięg”, „Klasy okrętu”, T10, T218, N56, 1.6.1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (zasięg ok. 6,5 mies.), `brzegi` (pusty kadłub, zasięg
  poniżej 1), wariant z zasięgiem 11,96
- **Jak sprawdzić:** przeczytać kafelki „Zasięg” i „Klasa” (podpis „średnie koszty X”), plakietkę klasy w nagłówku
  Mostka i jej dymek; klasa w Dowództwie.
- **Oczekiwany efekt:** zasięg = (osłony + kadłub − dług) / średnie koszty netto, obcięty w dół do 0,1 („11,9 mies.”,
  nie „12,0”); klasa z tej samej liczby: poniżej 1 – Zwiadowca, 1–3 – Korweta, 3–6 – Fregata, 6–9 – Niszczyciel,
  9–12 – Krążownik, od 12 – Flagowiec; dymek „Klasa według zasięgu: X mies.”; ta sama klasa w Dowództwie.
- **Nie przechodzi, gdy:**
  - klasa jest wyższa, niż wynika z pokazanego zasięgu;
  - dług nie jest odjęty albo Dowództwo podaje inną klasę.
- **Odczyt liczb:** zasięg, klasa, średnie koszty.

#### MO.24 Masa ładunku (spec „Ładownia i linia zanurzenia”, D34, N31, T221, 1.6.6)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (masa ok. 35 %), `brzegi` (ponad 40 %)
- **Jak sprawdzić:** przeczytać kafelek „Masa ładunku”; kliknąć; porównać z Ładownią.
- **Oczekiwany efekt:** „X,X%” i „stałe koszty Y zł/mies. · linia 40%”; X = Y / pensja × 100; ponad linią X na
  czerwono; kliknięcie → Ładownia z tą samą masą i kwotą.
- **Nie przechodzi, gdy:**
  - procent stoi bez kwoty stałych kosztów;
  - masa różni się od Ładowni.
- **Odczyt liczb:** X, Y, pensja.

#### MO.25 Panel „Koperty” (spec „Ekrany”, „Podział pensji”, D73 Premium / Discount, T80, T215)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: koperty codzienne i planowe, jedna ponad Equilibrium,
  jedna poniżej, jedna przekroczona, jedna z limitem 0 zł
- **Jak sprawdzić:** przeczytać panel; porównać z Planem miesiąca.
- **Oczekiwany efekt:** każda koperta z planu tego miesiąca (także 0 zł): nazwa, „codzienna” / „planowa”, „Premium”
  (wydane ponad część miesiąca, która minęła) albo „Discount”, „wydane / limit zł” (przekroczona – kwota na czerwono),
  pasek ze znacznikiem 80 %; kwoty jak w Planie miesiąca. Bez planu – „Bez kopert w planie tego miesiąca.”
- **Nie przechodzi, gdy:**
  - na liście jest koperta spoza planu;
  - wydane ≠ Plan miesiąca;
  - Premium i Discount są zamienione.
- **Odczyt liczb:** wydane i limit każdej koperty.

#### MO.26 Panel „Rozliczenia z domownikami” (spec „Rozliczenia”, D80, D81, 1.3.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: osoba „ma oddać”, osoba z zaliczką, osoba z zerem,
  pożyczka udzielona
- **Jak sprawdzić:** przeczytać panel; „wydatki domowników ›”; porównać z Radarem → Należności i Ustawienia →
  Domownicy.
- **Oczekiwany efekt:** wiersze tylko osób z saldem: „ma oddać · od DD.MM (N dni)” z kwotą albo „zaliczka – czeka na
  wydatki”; „Domownicy mają oddać razem” = suma należności; „Pożyczki udzielone”, gdy są; notka o kolejności wyrównania
  wpłaty; link otwiera Operacje z wydatkami domowników; kwoty jak na Radarze i w Ustawieniach.
- **Nie przechodzi, gdy:**
  - suma ≠ wiersze albo kwoty ≠ Radar;
  - data „od” ≠ najstarszy nieoddany zakup;
  - osoba z zerem ma wiersz.
- **Odczyt liczb:** każda osoba, razem, pożyczki udzielone.

#### MO.27 Panel „Przychody” (spec „Przychody”, D81, T119, T186, 1.4.0, 1.5.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: praca co miesiąc, jedna premia, wypłaty z XTB,
  dopłata do XTB, wypłata z puli Podatek, wpłaty domowników, przelewy własne
- **Jak sprawdzić:** przeczytać tabelę i linię porównania z pensją; porównać z Planem miesiąca → Przychody.
- **Oczekiwany efekt:** kolumny „3 mies.”, „6 mies.”, „12 mies.”, „mediana”; wiersze „Praca i inne”, „Trading (XTB)”,
  „Razem”; bez przelewów własnych, spłat i zaliczek domowników i puli Podatek; trading = wypłaty − dopłaty, nigdy
  poniżej zera; mediana nie skacze od premii; „Pensja X · średni przychód (6 mies.) Y → ±Z zł / mies.”; te same
  liczby w Planie miesiąca.
- **Nie przechodzi, gdy:**
  - wpłata domownika albo przelew własny liczy się jako przychód;
  - pula Podatek liczy się jako trading;
  - liczby różnią się od Planu miesiąca.
- **Odczyt liczb:** 12 komórek tabeli i Z.

#### MO.28 Panel „Dokowanie” (spec „Dokowanie”, D55, D56, T68, 1.1.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` + fikstura ICTTJ: wypłata do zadokowania, czekająca
  na import, pominięta, sprzed startu; wariant bez folderu ICTTJ; suma kontrolna fikstury
- **Jak sprawdzić:** przeczytać panel; kliknąć otwartą dostawę; rozwinąć pominięte; w wariancie kliknąć link.
- **Oczekiwany efekt:** tytuł „Dokowanie (N)”, N = otwarte dostawy; wiersze z pulą, datą, kwotą i stanem („do
  zadokowania”, „czeka na import”, „zadokowana”) i znaczkami („Portfel XTB?”, „inna kwota”, „pula zmieniona”…);
  kliknięcie otwiera okno dokowania tej dostawy; „Pominięte i sprzed startu (N)” z „przywróć”; bez dostaw „Brak dostaw
  z konta tradingowego do zadokowania.”; bez folderu „Wypłaty z ICTTJ: wybierz folder ICT Trade Journal
  w Ustawieniach ›” → Ustawienia → ICTTJ. Folder ICTTJ bez zmian.
- **Nie przechodzi, gdy:**
  - liczba w tytule ≠ otwarte dostawy albo zadokowana wygląda na otwartą;
  - cokolwiek zapisało się w folderze ICTTJ (waga K).

#### MO.29 „Wycofaj dokowanie” na Mostku (N-PC-2, 1.15.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` + zadokowana wypłata ICTTJ z operacją z mBanku
  i ręczną operacją dokowania na Portfelu XTB
- **Jak sprawdzić:** na Mostku znaleźć „Wycofaj dokowanie” przy zadokowanej dostawie (panel i okno dokowania);
  wycofać; przeczytać panel, Stan okrętu, Operacje; „Cofnij”.
- **Oczekiwany efekt (CHANGELOG 1.15.2):** przycisk „Wycofaj dokowanie” na Mostku; po wycofaniu dostawa wraca do
  „do zadokowania”, warstwy wracają do stanu sprzed dokowania, operacja z banku zostaje, ręczne operacje dokowania nie
  są usuwane; „Cofnij” przywraca dokowanie.
- **Nie przechodzi, gdy:**
  - przycisku nie ma na Mostku ani w oknie dokowania;
  - wycofanie usuwa operację z banku albo warstwy nie wracają.
- **Odczyt liczb:** osłony, kadłub, cele przed dokowaniem, po nim i po wycofaniu.

#### MO.30 Panel „Krzywa majątku” (spec „Ekrany”, D73, T81, T257, 1.6.6)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (ponad 26 tygodni, z BOS i CHoCH w ostatnim
  półroczu); `start` (historia z kontem otwartym tydzień temu)
- **Jak sprawdzić:** przeczytać podpis; zrzut wykresu; „Wywiad →”; porównać ostatnie 26 tygodni z Wywiadem.
- **Oczekiwany efekt:** „Na kontach budżetu X · ostatnie 26 tygodni, koniec każdego tygodnia”, X = „Suma kont
  budżetu”; punkty na koniec niedziel i dziś; BOS i CHoCH w tych samych tygodniach co w Wywiadzie; „Wywiad →” otwiera
  Wywiad; przy krótkiej historii „Za mało danych – krzywa pojawi się po dwóch tygodniach historii.”
- **Nie przechodzi, gdy:**
  - X ≠ suma kont albo wykres obejmuje całą historię;
  - oznaczenia różnią się od Wywiadu.
- **Odczyt liczb:** X, wartości tygodni z Wywiadu, tygodnie oznaczeń.

#### MO.31 Panel „Ostatnie operacje” (spec „Ekrany”, D68, T112, 1.6.4)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; dziś: wydatek, zwrot towaru, zakup za domownika,
  wpłata od domownika, przelew własny; zapamiętany filtr Operacji inny niż bieżący miesiąc
- **Jak sprawdzić:** przeczytać wiersze; kliknąć jeden z poprzedniego miesiąca; wrócić do Operacji z menu.
- **Oczekiwany efekt:** 10 najnowszych operacji, najnowsza na górze: „DD.MM”, kontrahent (albo tytuł, albo „—”),
  opis „finansuje: X”, „od: X” albo kategoria, kwota ze znakiem – wpływ zielony z „+”, wydatek bez koloru z „−”, zwrot
  towaru zielony; kliknięcie → Operacje na miesiącu operacji z nią zaznaczoną; zapamiętany filtr Operacji bez zmian.
- **Nie przechodzi, gdy:**
  - starsza operacja stoi nad nowszą;
  - zwrot jest czerwony albo zakup domownika pokazuje kategorię zamiast osoby;
  - kliknięcie zmienia zapamiętany filtr.

#### MO.32 Panele Mostka w osobnym oknie (spec „Ekrany”, D45, T60, B27, 1.5.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** odłączyć „Odprawa”, „Stan okrętu” i „Koperty”; główne okno przełączyć na Operacje; zapisać szybki
  wpis; kliknąć pozycję odprawy w osobnym oknie.
- **Oczekiwany efekt:** osobne okna pokazują to samo co panele; po zapisie energia i koperty odświeżają się, choć
  główne okno jest na Operacjach; kliknięcie w osobnym oknie prowadzi główne okno do przyczyny.
- **Nie przechodzi, gdy:**
  - osobne okno zamiera po wyjściu z Mostka;
  - kliknięcie w osobnym oknie nic nie robi.

#### MO.33 Słowniczek okrętu i podpowiedzi metafor (spec „Podsumowanie”, D34, F29, T295, 1.10.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** F1 – sekcja „Słowniczek okrętu”; „?” w nagłówku „Koperty” i „Dokowanie”; dymki „Osłony”,
  „Kadłub”, „Energia”, „Zasięg”; wypisać terminy widoczne na Mostku i sprawdzić, czy każdy jest wyjaśniony.
- **Oczekiwany efekt:** słowniczek z Osłonami, Kadłubem, Pensją, Energią, Kopertami, Ładownią, Zbiornikiem, Łupami,
  Dostawą, Zasięgiem, Klasą okrętu, Mapą gwiezdną, Radarem, Boją, Asteroidą, Firewallem, Depozytem, Wyprawą i Bilansem
  paliwa – każdy z prawdziwym znaczeniem; „?” i dymki mówią to samo co słowniczek.
- **Nie przechodzi, gdy:**
  - dymek różni się od słowniczka;
  - termin widoczny na Mostku (np. Daily Bias, Premium / Discount, Equilibrium, BOS / CHoCH) nie ma wyjaśnienia ani
    w słowniczku, ani na ekranie (UWAGA – zrozumiałość).

#### MO.34 Jedna liczba na dziś na wszystkich ekranach (kryterium sukcesu „codziennie jedna liczba”)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** w tej samej minucie odczytać energię dziś: Mostek, nagłówek szybkiego wpisu („· energia dziś X”),
  Plan miesiąca, Raporty → odprawa, odłączone okno Odprawy; zapisać wydatek 37,00 Jedzenie i odczytać jeszcze raz.
  (Dymek zasobnika – Maszyna, AU-3.)
- **Oczekiwany efekt:** wszędzie ta sama kwota co do grosza, przed i po zapisie, bez ponownego otwierania ekranów.
- **Nie przechodzi, gdy:**
  - któryś ekran podaje inną kwotę albo odświeża się dopiero po przełączeniu.
- **Odczyt liczb:** energia na każdym ekranie, przed i po.

### SW – szybki wpis

#### SW.1 Otwarcie okna i stan początkowy (spec „Szybki wpis”, T54, N-PC-5, 1.15.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`; ostatni zapis szybkiego wpisu był na Portfelu XTB
- **Jak sprawdzić:** `window.fi.quickOpen()`; przeczytać okno; zamknąć i otworzyć przyciskiem „Szybki wpis · Ctrl+Alt+B”
  na Mostku i paletą „Szybki wpis (okno nad wszystkimi)”.
- **Oczekiwany efekt:** małe okno bez ramki: „Szybki wpis · energia dziś X”, kursor w „Kwota”; rodzaj „Wydatek”
  (obok „Wpływ”, „Za domownika”); „Gdzie” z podpowiedzią „sklep, usługa, osoba”; „Kategoria” „— bez kategorii —”;
  „Konto” – ostatnio użyte (Portfel XTB); „Kiedy” – dziś i godzina teraz; „Notatka”, „Tagi”; stopka „Enter – zapisz ·
  Ctrl+Enter – zapisz i następny · Esc – zamknij” i „Zapisz”. X = energia dziś na Mostku; każde wejście otwiera to
  samo okno.
- **Nie przechodzi, gdy:**
  - kursor nie stoi w kwocie albo godzina jest pusta lub z innego dnia;
  - konto zawsze wraca do pierwszego;
  - energia w nagłówku ≠ Mostek.
- **Odczyt liczb:** X.

#### SW.2 Globalny skrót, jego zmiana i skrót zajęty (spec „Szybki wpis”, D46, D70, T8, T54, N37, 1.6.4)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** `rok`; FI w zasobniku, na wierzchu inny program; drugi
  monitor, jeśli jest
- **Jak sprawdzić:** Ctrl+Alt+B, 12,50, Enter; to samo z kursorem na drugim monitorze; menu zasobnika → „Szybki wpis”;
  Ustawienia → Powiadomienia i dźwięki → skrót Ctrl+Shift+Spacja i sprawdzić oba skróty; ustawić skrót zajęty przez
  inny program; F1 i przycisk na Mostku.
- **Oczekiwany efekt:** okno pojawia się od razu nad wszystkimi, na ekranie z kursorem, bez ikony na pasku zadań; po
  Enter znika, fokus wraca do poprzedniego programu, operacja zapisana; nowy skrót działa od razu, stary nie; skrót
  zajęty – informacja w Ustawieniach; ściągawka F1 i przycisk na Mostku pokazują bieżący skrót, ściągawka ostrzega,
  gdy się nie zarejestrował.
- **Nie przechodzi, gdy:**
  - okno jest za innym programem, na złym monitorze albo wyskakuje główne okno FI;
  - rejestracja skrótu zawodzi po cichu;
  - ściągawka dalej podaje „Ctrl Alt B” po zmianie.

#### SW.3 Skrót z literą polskiego znaku odrzucony (B29, D86, T190, 1.5.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; wariant: `config.json` ze skrótem Ctrl+Alt+A
- **Jak sprawdzić:** w polu skrótu (Ustawienia i krok 7 kreatora) ustawić Ctrl+Alt+S, Ctrl+Alt+Shift+E, Ctrl+Alt+K;
  w wariancie uruchomić aplikację.
- **Oczekiwany efekt:** Ctrl+Alt + A, C, E, L, N, O, S, U, X, Z (także z Shift) nie do ustawienia, z wyjaśnieniem
  o AltGr i polskich znakach; Ctrl+Alt+K przyjęty; zapamiętany Ctrl+Alt+A zamieniony na Ctrl+Alt+B z komunikatem.
- **Nie przechodzi, gdy:**
  - Ctrl+Alt+S zostaje zapisany;
  - zamiana zapamiętanego skrótu odbywa się bez komunikatu.

#### SW.4 Zwykły wydatek – Enter zapisuje i zamyka (spec „Szybki wpis”, D70, T54, T144)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** 23,40, „Gdzie” „Żabka”, Jedzenie · kawa i przekąski, Enter; przeczytać nowy plik operacji, Mostek,
  Operacje (historia wpisu); „Zakończ” z zasobnika, uruchomić ponownie, sprawdzić operację.
- **Oczekiwany efekt:** w stopce „Zapisano.”, okno znika po chwili; jeden plik `transactions/RRRR/RRRR-MM-DD_ULID.json`
  z kwotą −2340 groszy, kategorią, kontem, dzisiejszą datą, godziną i `updatedBy` = nazwa komputera; energia dziś na
  Mostku mniejsza o 23,40 zł, operacja na górze „Ostatnich operacji”; po ponownym uruchomieniu operacja jest.
- **Nie przechodzi, gdy:**
  - powstają dwie operacje albo kwota ma zły znak lub zaokrąglenie;
  - energia nie zmienia się od razu;
  - po ponownym uruchomieniu operacji nie ma.
- **Odczyt liczb:** energia przed i po, kwota w pliku.

#### SW.5 Podgląd energii – koperta codzienna i wydatek bez kategorii (spec „Szybki wpis”, T30, T186, N3)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** 50,00, Jedzenie – przeczytać podgląd; zmienić na „— bez kategorii —”; potem kwota większa niż
  energia dziś; zapisać wariant 50,00 Jedzenie i porównać z Mostkiem.
- **Oczekiwany efekt:** przed zapisem „Energia dziś: X → Y”, Y = X − 50,00; bez kategorii tak samo (wydatek bez
  kategorii liczy się jak codzienny); ponad energię Y ujemne na czerwono; po zapisie Mostek pokazuje Y.
- **Nie przechodzi, gdy:**
  - podgląd różni się od Mostka po zapisie;
  - podglądu nie ma przed zapisem.
- **Odczyt liczb:** X, Y, energia na Mostku po zapisie.

#### SW.6 Podgląd – koperta planowa i kategoria bez koperty (N3, T186, 1.5.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: Auto – limit 600, wydane 450; kategoria „Prezenty
  i inne” bez koperty w planie
- **Jak sprawdzić:** 200,00 Auto · paliwo – podgląd, zapis; 100,00 Prezenty i inne · prezenty – podgląd, zapis;
  Mostek: energia dziś, Koperty, Stan okrętu → „Energia”.
- **Oczekiwany efekt:** Auto: „Koperta Auto: 150,00 zł → −50,00 zł” (wynik na czerwono), energia dziś bez zmian; po
  zapisie koperta Auto 650 / 600; prezenty: „Poza kopertami 100,00 zł – energia dziś bez zmian (zmniejsza energię
  miesiąca: A → B).”, przy energii miesiąca mniejszej niż kwota dopisek „; z osłon C”; po zapisie energia dziś bez
  zmian, energia miesiąca mniejsza o 100,00.
- **Nie przechodzi, gdy:**
  - wydatek planowy albo bez koperty zmniejsza energię dziś w podglądzie lub po zapisie (N3);
  - Mostek po zapisie różni się od podglądu.
- **Odczyt liczb:** stan koperty Auto przed i po, A, B, energia dziś i energia miesiąca przed i po.

#### SW.7 Podgląd – wydatek z innego dnia (N3, T186, 1.5.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (dziś co najmniej 3. dzień miesiąca)
- **Jak sprawdzić:** 140,00 Jedzenie; „wczoraj” – podgląd; data z poprzedniego miesiąca – podgląd; data za 3 dni –
  podgląd; zapisać wariant „wczoraj”; Mostek.
- **Oczekiwany efekt:** wczoraj – „Energia dziś: X → Y (wydatek z DD.MM – rozłożony na pozostałe dni)”, gdzie X − Y ≈
  140 / dni do końca miesiąca z dzisiejszym (dokładnie – wyrocznia); poprzedni miesiąc – „Wydatek z innego miesiąca –
  energia dziś bez zmian.”; przyszłość – „Data w przyszłości – energia dziś bez zmian.” i znaczek „w przyszłości – do
  salda od DD.MM”; po zapisie Mostek pokazuje Y.
- **Nie przechodzi, gdy:**
  - całe 140 zł odejmuje się od dzisiejszej energii;
  - podgląd różni się od Mostka po zapisie.
- **Odczyt liczb:** X, Y, Mostek po zapisie.

#### SW.8 Wpływ (spec „Szybki wpis”, „Dokowanie”, D72)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** „Wpływ”, 1 000,00, „Od kogo” „Pracodawca Testowy”, mBank; podgląd; Enter; Mostek.
- **Oczekiwany efekt:** „Gdzie” zmienia się na „Od kogo”, kategoria znika; podgląd „Wpływ – dokuje w warstwach
  okrętu.”; po zapisie wpływ +1 000,00 zł (zielony z „+” w „Ostatnich operacjach”), osłony, kadłub i cele rosną według
  kolejności dokowania, bez okna dokowania (inne wpływy dokują same – D72); energia dziś bez zmian.
- **Nie przechodzi, gdy:**
  - wpływ zmienia energię dziś albo zapisuje się jako wydatek;
  - pieniądze trafiają do warstw w innej kolejności.
- **Odczyt liczb:** osłony, kadłub, cele przed i po.

#### SW.9 Wpływ od domownika – spłata i reszta (spec „Rozliczenia”, D80 b, T112, 1.3.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: Tata ma oddać 180,00 („pytaj”); Ania ma oddać 0
  („przychód”)
- **Jak sprawdzić:** „Wpływ”, 300,00, „Od domownika” Tata; przeczytać podgląd; wybrać „zaliczka”; Enter. Tak samo Ania.
- **Oczekiwany efekt:** podgląd „Od: Tata – wyrównuje 180,00 zł (ma oddać 180,00 zł), reszta 120,00 zł jako zaliczka
  (depozyt).”; po zapisie Tata ma oddać 0, zaliczka 120,00 (Mostek i Radar), „Depozyt domowników” +120,00, osłony
  +180,00; Ania – „Od: Ania – 300,00 zł jako przychód (dokuje).”
- **Nie przechodzi, gdy:**
  - cała kwota jest przychodem albo zaliczka trafia do osłon;
  - spłata pokrywa inne zakupy niż wskazane albo najstarsze.
- **Odczyt liczb:** ma oddać i zaliczka przed i po, depozyt, osłony.

#### SW.10 „Przychód czy zaliczka” zapamiętane tylko po wyborze (D80 b, N39, T243, 1.6.4)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; Mama z ustawieniem „pytaj”
- **Jak sprawdzić:** „Wpływ” od Mamy bez ruszania przełącznika, Enter; Ustawienia → Domownicy; drugi wpływ –
  przełączyć na „zaliczka”, Enter; Ustawienia.
- **Oczekiwany efekt:** po pierwszym zapisie Mama dalej „pytaj”; po jawnym wyborze odpowiedź zapamiętana.
- **Nie przechodzi, gdy:**
  - osobie zapisuje się „przychód”, choć nikt nie wybrał.

#### SW.11 „W tym za X” – przelew z pieniędzmi innej osoby (spec „Rozliczenia”, D81, T118, 1.4.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: Mama przekazuje pieniądze przez Tatę; Mama ma oddać
  90,00, Tata 180,00
- **Jak sprawdzić:** „Wpływ”, 400,00, „Od domownika” Tata; przeczytać wiersz „W tym za Mama”; wpisać 90,00; podgląd;
  Enter. Wariant: 500,00 w polu Mamy przy kwocie 400,00 i Enter.
- **Oczekiwany efekt:** wiersz pusty z podpowiedzią „ma oddać 90,00 zł” (nic nie dzieli się samo); podgląd „Od: Tata –
  wyrównuje 180,00 …, reszta 130,00 …” i „W tym za: Mama – wyrównuje 90,00 …”; po zapisie obie należności 0, przelew
  należy do Taty; wariant – „Części innych osób przekraczają kwotę.” i zapis odrzucony.
- **Nie przechodzi, gdy:**
  - pole wypełnia się samo;
  - części większe niż kwota zapisują się;
  - przelew zostaje przypisany Mamie.
- **Odczyt liczb:** należności i zaliczki przed i po.

#### SW.12 „Za domownika” – zakup finansowany przez osobę (spec „Rozliczenia”, D80, T112, 1.3.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: Łukasz z zaliczką 50,00
- **Jak sprawdzić:** „Za domownika”, 120,00, Jedzenie, „Finansuje” Łukasz; podgląd; Enter. Potem „— wybierz domownika
  —” i Enter.
- **Oczekiwany efekt:** podgląd „Finansuje Łukasz: 120,00 zł – nie zjada energii; z zaliczki 50,00 zł; pożyczają osłony
  70,00 zł, ma oddać.”; po zapisie energia dziś i koperty bez zmian, zaliczka 0, Łukasz ma oddać 70,00, osłony −70,00;
  bez osoby – „Wybierz domownika, który finansuje zakup.” i nic się nie zapisuje.
- **Nie przechodzi, gdy:**
  - energia albo koperta maleje;
  - zapis przechodzi bez osoby;
  - zaliczka nie jest użyta jako pierwsza.
- **Odczyt liczb:** energia, koperta, zaliczka, ma oddać, osłony – przed i po.

#### SW.13 Prezent od domownika (D83, D85, T157, 1.5.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`: Babcia bez zaliczki
- **Jak sprawdzić:** „Za domownika”, 200,00, „Finansuje” Babcia, zaznaczyć „prezent” (dymek); podgląd; Enter.
- **Oczekiwany efekt:** podgląd „Prezent od Babcia: 200,00 zł – nie zjada energii; osłony 200,00 zł, nikt nic nie jest
  winien.”; po zapisie Babcia nic nie ma oddać, energia i koperty bez zmian, osłony −200,00 (D85).
- **Nie przechodzi, gdy:**
  - prezent tworzy należność albo zjada energię.
- **Odczyt liczb:** osłony, energia, saldo Babci.

#### SW.14 „Wspólnie” – kilka osób płaci za zakup (D83, T156, 1.5.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (domownicy Ania i Łukasz)
- **Jak sprawdzić:** 90,00 Jedzenie → „wspólnie”: równo (ja, Ania, Łukasz) – podgląd; procenty 50 / 30 / 10 – Enter;
  kwoty Ania 25,00 i Łukasz 25,00 – podgląd; 100,01 równo na trzy – podgląd i Enter.
- **Oczekiwany efekt:** równo – po 30,00 zł, moja część w energii („Energia dziś: X → X − 30,00”), „Finansuje Ania:
  30,00 …”, „Finansuje Łukasz: 30,00 …”; procenty ≠ 100 – „Procenty osób muszą dać razem 100 %.” i brak zapisu; kwoty
  – moja część to reszta 40,00; 100,01 – reszta groszy w ostatniej części (T3), suma = 100,01; po zapisie salda osób
  i energia jak w podglądzie.
- **Nie przechodzi, gdy:**
  - suma części ≠ kwota albo procenty ≠ 100 zapisują się;
  - cała kwota zjada energię.
- **Odczyt liczb:** części, energia, salda osób.

#### SW.15 Podział paragonu na kategorie (spec „Szybki wpis”, T3, 1.0.0, 1.6.4)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** 187,45, „Biedronka”, Jedzenie; przycisk „+” (dymek „Podziel paragon: kilka kategorii albo część
  domownika”); część 1 – 150,00 Jedzenie, część 2 – 37,45 Dom · chemia; „+ część”; „bez podziału”; podzielić znowu
  z sumą 180,00 i Enter; poprawić i Enter.
- **Oczekiwany efekt:** pierwsza część przejmuje kwotę i kategorię całości; „+ część” dodaje część z nierozdzieloną
  resztą; przy różnicy „nierozdzielone: X zł” i odmowa „Części paragonu nie sumują się do kwoty.”; „bez podziału”
  wraca do jednej kategorii; podgląd liczy każdą część jej kopertą (Jedzenie – energia, Dom – „Koperta Dom: …”); po
  zapisie operacja z częściami w Operacjach i koperty jak w podglądzie.
- **Nie przechodzi, gdy:**
  - zapis przechodzi przy niezgodnej sumie;
  - koperty po zapisie różnią się od podglądu.
- **Odczyt liczb:** energia i koperta Dom przed i po.

#### SW.16 Podział paragonu – część domownika (spec „Szybki wpis”, D80, T112)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** 120,00 → podział: 80,00 Jedzenie (osoba „ja”), 40,00 Osobiste z osobą Ania; podgląd; Enter.
- **Oczekiwany efekt:** przy każdej części wybór osoby z domyślnym „ja”; podgląd „Energia dziś: X → X − 80,00”
  i „Finansuje Ania: 40,00 zł – nie zjada energii; pożyczają osłony 40,00 zł, ma oddać.”; po zapisie Ania ma oddać
  +40,00, energia −80,00, koperta Osobiste bez tych 40,00.
- **Nie przechodzi, gdy:**
  - część domownika zjada energię albo nie tworzy należności.
- **Odczyt liczb:** energia, koperta Osobiste, ma oddać Ani.

#### SW.17 Podział paragonu, potem „Wpływ” (B118, T243, 1.6.4)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** wydatek 60,00 podzielony na 2 części; przełączyć na „Wpływ”; Enter.
- **Oczekiwany efekt:** części znikają po przełączeniu; zapis bez błędu o częściach; wpływ 60,00 bez części.
- **Nie przechodzi, gdy:**
  - przy wpływie pojawia się „Części paragonu nie sumują się do kwoty.”;
  - wpływ zapisuje się z częściami.

#### SW.18 „Plan czy impuls?” od progu dziennika (spec „Szybki wpis”, D41, D84 C7, N32, 1.6.4)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (próg 200,00); wariant: próg 0
- **Jak sprawdzić:** wydatek 199,99; 200,00 – wybrać „impuls”, w polu „Krótko: skąd ten zakup?” wpisać „wyprzedaż”,
  Enter; Operacje i Wywiad → dziennik kapitański; „Wpływ” 500,00; w wariancie wydatek 5 000,00.
- **Oczekiwany efekt:** sekcja „Dziennik kapitański” z „Plan czy impuls?” (plan / impuls) od 200,00 zł włącznie, nie
  przy 199,99 ani przy wpływie; oznaczenie i wpis zapisane przy operacji i widoczne w Operacjach i Wywiadzie; próg 0 –
  szybki wpis nie pyta, a reszta aplikacji też nie traktuje wydatków jako nieoznaczonych.
- **Nie przechodzi, gdy:**
  - pytanie pojawia się poniżej progu albo nie pojawia się od progu;
  - przy progu 0 aplikacja pyta albo liczy wydatki jako „bez oznaczenia”.

#### SW.19 Cisza nocna – godziny w oknie i przez północ (spec „Szybki wpis”, D40, 1.0.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (cisza nocna 23:00–05:00)
- **Jak sprawdzić:** wydatek 35,00; w polu godziny kolejno 22:59, 23:00, 23:30, 00:15, 04:59, 05:00 – przy każdej
  przeczytać okno; przy 00:15: Enter bez niczego, z samym potwierdzeniem, z potwierdzeniem i notką „pizza po dyżurze”;
  „Wpływ” o 23:30.
- **Oczekiwany efekt:** 23:00–04:59 – znaczek „cisza nocna” przy godzinie, sekcja „Dziennik kapitański” z polem
  „Zakup w ciszy nocnej – dlaczego teraz?” i „Potwierdzam zakup w ciszy nocnej (23:00–05:00)”; 22:59 i 05:00 – bez;
  bez potwierdzenia albo bez notki odmowa „Cisza nocna: potwierdź zakup i wpisz krótko, dlaczego teraz.”; z oboma –
  zapis z godziną i wpisem w dzienniku; wpływ nocą bez pytania.
- **Nie przechodzi, gdy:**
  - okno nie działa po północy albo 05:00 liczy się jako cisza;
  - nocny zakup zapisuje się bez potwierdzenia i notki.

#### SW.20 Cisza nocna na prawdziwym zegarze i skutek w grze (spec „Gra”, D40, D80 f, N-PC-19, T187, 1.15.2)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** `rok` w maszynie (próg dziennika 200,00)
- **Jak sprawdzić:** o 23:30 otworzyć szybki wpis skrótem; zapisać: (a) „Za domownika” 60,00 Ania; (b) wydatek 250,00
  z potwierdzeniem, notką i „plan”; (c) wydatek 50,00 z potwierdzeniem i notką. Przesunąć zegar o 2 dni; Dowództwo →
  dzień zakupów.
- **Oczekiwany efekt:** godzina domyślna 23:30 od razu ze znaczkiem „cisza nocna”; po zamrożeniu dnia poważne
  naruszenie „zakup w ciszy nocnej” tylko za (c); (a) – zakup domownika nie jest moim (D80 f); (b) – wpis
  w dzienniku wyjaśnia planowany wydatek (N-PC-19).
- **Nie przechodzi, gdy:**
  - (a) albo (b) daje naruszenie;
  - zakupu nocnego poniżej progu nie da się oznaczyć jako planowego, a okno tego nie mówi (UWAGA).

#### SW.21 Konto – wybór i zapamiętanie (spec „Szybki wpis”, D9, D83, N-PC-5, 1.15.2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: mBank, Portfel XTB, Gotówka, jedno konto
  zarchiwizowane
- **Jak sprawdzić:** rozwinąć „Konto”; zapisać wydatek 15,00 na Gotówce; otworzyć okno ponownie; Ctrl+Enter na Gotówce;
  saldo Gotówki w Ustawienia → Konta.
- **Oczekiwany efekt:** lista tylko aktywnych kont budżetu (bez zarchiwizowanego i bez konta tradingowego XTB); wydatek
  zmniejsza saldo wybranego konta; kolejne otwarcie proponuje ostatnio użyte konto; „Zapisz i następny” zostawia konto.
- **Nie przechodzi, gdy:**
  - operacja zapisuje się na innym koncie niż wybrane;
  - konto zarchiwizowane jest na liście albo wybór wraca do pierwszego konta.
- **Odczyt liczb:** saldo Gotówki przed i po.

#### SW.22 Pole „Kiedy” – „wczoraj”, słowa i data bez roku (D86 F7, T184, T209, 1.5.2, 1.6.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** kliknąć „wczoraj”; w polu daty: „dziś”, „wcz”, „przedwczoraj”, „-3”, „15”, „DD.MM” sprzed 5 dni,
  „DD.MM” za 10 dni, „31.02”; w polu godziny „7:5”, „25:00”, puste.
- **Oczekiwany efekt:** „wczoraj” ustawia wczorajszą datę bez godziny i znika (jest tylko przy dacie dziś); słowa i
  „-N” dają właściwe dni; „DD.MM” bez roku – najbliższy taki dzień, najwyżej tydzień po dziś (za 10 dni → rok
  wcześniej); przyszła data ze znaczkiem „w przyszłości – do salda od DD.MM”; „31.02” i „25:00” odrzucone, pole wraca
  do poprzedniej wartości; pusta godzina – operacja bez godziny; „15” – zachowanie sensowne (dzień bieżącego miesiąca
  albo odrzucenie; F7 to proponował, D86 nie).
- **Nie przechodzi, gdy:**
  - „wczoraj” zostawia godzinę teraz (fałszywa cisza nocna i killzone);
  - zła data przyjmuje się po cichu albo rok wybiera się w przyszłość.

#### SW.23 Kwota – działania, format i brzegi (D86 F7, T209, 1.6.0, 1.6.4)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** w „Kwota” wpisywać i wychodzić z pola: „12,50+8,30”, „3*4,99”, „10/3”, „100-25,5”, „1 234,56”,
  „1234.5”, „1.200”, „0,005”, „0”, „abc”, „999999,99”; przy każdej przeczytać pole i podgląd; przy 0 – Enter.
- **Oczekiwany efekt:** 20,80; 14,97; 3,33; 74,50; 1 234,56; 1 234,50; „1.200” i „0,005” odrzucone; „abc” odrzucone;
  0 – „Wpisz kwotę.” i brak zapisu; duża kwota bez zaokrągleń; podgląd energii liczy wynik działania.
- **Nie przechodzi, gdy:**
  - wynik działania jest inny albo grosze giną w zapisie;
  - „1.200” zostaje przyjęte jako 1,20.

#### SW.24 Zwrot towaru (kwota ujemna) w szybkim wpisie (spec „Przypadki szczególne”; brak wymagania dla okna)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** wydatek „-49,99”, potem „20-69,99”, Osobiste · ubrania; podgląd; Enter.
- **Oczekiwany efekt:** zachowanie sensowne: albo zwrot towaru – ujemny wydatek w tej kategorii, oddający energię lub
  kopertę (podgląd to pokazuje), albo jasny komunikat, że zwrot wpisuje się w Operacjach.
- **Nie przechodzi, gdy:**
  - minus znika po cichu i zapisuje się zwykły wydatek 49,99;
  - pole przyjmuje kwotę ujemną bez żadnego skutku albo komunikatu.

#### SW.25 Oficer – podpowiedź kategorii z marek, reguł i słownika (D70, F8, T170, 1.5.1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`: operacje z banku „DINO TESTOWO 4” (Jedzenie · zakupy
  spożywcze), reguła importu „KAWIARNIA MOKKA” → Jedzenie · kawa i przekąski z połączoną nazwą „MOKKA DWORZEC”, ręczny
  „Orlen” sprzed 2 dni z Auto · paliwo, reguła „Netia” z kategorią zarchiwizowaną
- **Jak sprawdzić:** w „Gdzie” wpisywać: „Dino”, „Mokka”, „Orlen”, „Lidl”, „Netia”, „Sklepik u Zosi”; przy każdym
  przeczytać kategorię i przycisk „oficer: …” (dymek – źródło); wybrać kategorię ręcznie i zmienić nazwę; rozwinąć
  listę podpowiedzi kontrahentów.
- **Oczekiwany efekt:** „Dino” → zakupy spożywcze (marka z banku); „Mokka” → kawa i przekąski (reguła i połączona
  nazwa); „Orlen” → ostatnio użyta z tą marką; „Lidl” → kategoria ze słownika sieci; „Netia” – bez zarchiwizowanej
  kategorii; nieznany – bez podpowiedzi; pusta kategoria wypełnia się sama, ręczny wybór zostaje, a „oficer: …”
  przyjmuje podpowiedź jednym kliknięciem; lista kontrahentów – jedna nazwa na markę.
- **Nie przechodzi, gdy:**
  - oficer nadpisuje ręczny wybór;
  - marka z historii banku nie daje podpowiedzi albo podpowiada zarchiwizowaną kategorię;
  - lista ma tę samą markę kilka razy.

#### SW.26 Tagi i wyprawy w szybkim wpisie (F17, T291, N-PC-11, 1.10.0, 1.15.2)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`: tag „Wakacje Chorwacja” użyty 3 dni temu, „Remont”
  10 dni temu
- **Jak sprawdzić:** przeczytać „Tagi” i przycisk „+ #…”; kliknąć go; w „Gdzie” wpisać „Konzum #wakacje-chorwacja”,
  w „Notatka” „#Remont łazienki”, w drugim wpisie „Pizzeria #1”; Enter; Operacje (tagi, kontrahent); Wywiad → Wyprawy.
- **Oczekiwany efekt:** „+ #Wakacje Chorwacja” (tag ostatnich 7 dni), bez „Remont”; „#słowo” w nazwie dodaje tag
  i znika z nazwy (kontrahent „Konzum”, oficer patrzy na markę bez tagu); „#” w notatce dodaje tag, notatka zostaje;
  „Pizzeria #1” zostaje nazwą; ten sam tag różnie zapisany to jeden; tag w polu odróżnia się od podpowiedzi; koszt
  wyprawy w Wywiadzie rośnie o kwotę.
- **Nie przechodzi, gdy:**
  - „#wakacje-chorwacja” zostaje w nazwie kontrahenta;
  - jeden tag zapisuje się jako dwa;
  - podpowiadany jest tag starszy niż 7 dni.
- **Odczyt liczb:** koszt wyprawy przed i po.

#### SW.27 Seriami – Ctrl+Enter „zapisz i następny” (D86 F7, T209, 1.6.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** „wczoraj”, konto Portfel XTB, tag „Wakacje Chorwacja”; trzy wydatki 12,00 / 8,50 / 30,00, każdy
  Ctrl+Enter; czwarty Enter; folder i Mostek.
- **Oczekiwany efekt:** po Ctrl+Enter okno zostaje, w stopce „Zapisano. Dopisano: N · energia dziś X” z aktualną
  energią; nowy formularz zachowuje konto, dzień, godzinę, rodzaj i tagi, kwota pusta z kursorem; Enter zapisuje
  czwarty i zamyka; 4 operacje w folderze, energia na Mostku = ostatnie X.
- **Nie przechodzi, gdy:**
  - okno zamyka się po Ctrl+Enter albo licznik nie rośnie;
  - energia w stopce jest nieaktualna;
  - seria gubi konto, dzień albo tagi.
- **Odczyt liczb:** X po każdym zapisie, energia na Mostku.

#### SW.28 „Powtórz ostatni” (D86 F7, T209, 1.6.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; ostatni wpis ręczny: „Za domownika” 45,00 Ania,
  prezent; wariant: ostatni wpis – wpływ od Taty jako zaliczka
- **Jak sprawdzić:** najechać i kliknąć „Powtórz ostatni”; Enter; w wariancie to samo.
- **Oczekiwany efekt:** dymek z nazwą i kwotą; formularz z rodzajem, kwotą, kontrahentem, kategorią, kontem i osobą
  (prezent zaznaczony), z dzisiejszą datą i godziną teraz; wariant – wpływ od Taty z „zaliczka”; po zapisie druga taka
  operacja. Operacje z banku nie są „ostatnim” wpisem.
- **Nie przechodzi, gdy:**
  - giną osoba albo prezent;
  - data jest skopiowana z poprzedniej operacji.

#### SW.29 Szablony – 5 ostatnich par kontrahent + kategoria (D86 F7, T209, 1.6.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (co najmniej 7 różnych par ręcznych zakupów
  w ostatnich tygodniach)
- **Jak sprawdzić:** przeczytać przyciski pod rodzajem; wpisać 9,99; kliknąć szablon.
- **Oczekiwany efekt:** najwyżej 5 przycisków „Kontrahent · podkategoria” z najnowszych różnych par własnych zakupów
  (bez wpływów i zakupów domowników); kliknięcie wypełnia kontrahenta i kategorię, zostawia 9,99, kursor w kwocie;
  bez edytora szablonów (D86).
- **Nie przechodzi, gdy:**
  - przycisków jest więcej niż 5 albo pary się powtarzają;
  - szablon kasuje wpisaną kwotę;
  - stare pary wypierają nowsze.

#### SW.30 Szkic po Esc wraca do 30 minut (D86 F7, T209, 1.6.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** wpisać 64,20, „Rossmann”, podział na 2 części; Esc; otworzyć po minucie; „Wyczyść”; wpisać znowu,
  Esc; otworzyć po 31 minutach (czekanie w tle); sprawdzić folder.
- **Oczekiwany efekt:** po minucie ten sam szkic z podziałem i „Szkic z poprzedniego otwarcia.” z „Wyczyść”; „Wyczyść”
  daje czysty formularz (dziś, teraz, kursor w kwocie); po 31 minutach czysty formularz; szkic niczego nie zapisuje
  w folderze.
- **Nie przechodzi, gdy:**
  - szkic znika po Esc albo wraca po 30 minutach;
  - szkic zapisuje się jako operacja.

#### SW.31 Esc, przycisk zamknięcia i Enter w polu (D70, T144, 1.4.2)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** wpisać kwotę i nie wychodząc z pola nacisnąć Esc; to samo z przyciskiem „×” („Zamknij (Esc)”);
  wpisać kwotę i od razu Enter; Shift+Enter.
- **Oczekiwany efekt:** Esc zawsze zamyka okno (także w trakcie wpisywania kwoty), a szkic czeka (SW.30); „×” działa
  jak Esc; Enter zatwierdza wartość pola i zapisuje właśnie ją; Shift+Enter nie zapisuje.
- **Nie przechodzi, gdy:**
  - Esc tylko cofa pole, a okno zostaje;
  - Enter zapisuje kwotę sprzed wpisania.

#### SW.32 Jeden zapis przy podwójnym Enter lub kliknięciu (B51, T144, 1.4.2, 1.4.3)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** 15,00 i dwa szybkie Enter; potem dwuklik „Zapisz”; zaraz po „Zapisano.” otworzyć okno ponownie.
- **Oczekiwany efekt:** jedna operacja na każdy wpis; okno otwarte zaraz po zapisie nie zamyka się samo i ma czysty
  formularz.
- **Nie przechodzi, gdy:**
  - powstają dwie operacje;
  - ponownie otwarte okno znika samo.
- **Odczyt liczb:** liczba nowych plików operacji.

#### SW.33 Zmiana list przy otwartym oknie (B125, T243, 1.6.4)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** w oknie: 44,00, konto Portfel XTB, Zwierzęta · karma, „Za domownika” Ania; w głównym oknie
  zarchiwizować Portfel XTB, kategorię Zwierzęta i Anię; wrócić do okna; zapisać.
- **Oczekiwany efekt:** komunikat „Lista kont, kategorii i domowników się zmieniła – sprawdź wybór.”; wybory
  wyczyszczone albo zastąpione, kwota zostaje; energia w nagłówku aktualna; nic nie zapisuje się na zarchiwizowane
  konto, kategorię ani osobę bez wyboru użytkownika.
- **Nie przechodzi, gdy:**
  - zapis idzie na wybór spoza listy bez komunikatu;
  - wpisana kwota ginie.

#### SW.34 Folder tylko do odczytu i brak folderu (T54, T246)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` z atrybutem tylko do odczytu; wariant: ekran wyboru
  folderu bez otwartego folderu
- **Jak sprawdzić:** otworzyć okno; wpisać i zapisać wydatek.
- **Oczekiwany efekt:** tylko do odczytu – „Folder jest tylko do odczytu.” i brak pliku; bez folderu – „Otwórz
  Financial Intel z folderem danych – szybki wpis zapisuje do niego.”
- **Nie przechodzi, gdy:**
  - pojawia się „Zapisano.”, a pliku nie ma;
  - wpisana kwota ginie bez komunikatu.

#### SW.35 Ukryte kwoty w szybkim wpisie (spec „Prywatność”, D30, T55, B61, 1.6.1, 1.6.6)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** otworzyć okno, wpisać 120,00 Za domownika; w głównym oknie Ctrl+$; przeczytać nagłówek, podgląd,
  „ma oddać” przy „W tym za…”, dymek „Powtórz ostatni”, stopkę serii.
- **Oczekiwany efekt:** od razu, bez ponownego otwarcia, wszystkie kwoty poza polem kwoty jako „••• zł”; wpisywanie
  kwoty dalej działa.
- **Nie przechodzi, gdy:**
  - kwotę widać w podglądzie, dymku albo stopce;
  - maska działa dopiero po ponownym otwarciu okna.

#### SW.36 Ergonomia – wieczorne dopisanie trzech zakupów (spec „Codzienny rytm”, D26, kryterium „bez przymusu”)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** samą klawiaturą dopisać trzy zakupy (Żabka 8,99 Jedzenie; Orlen 250,00 Auto · paliwo z „plan”;
  Apteka 32,40 Zdrowie · leki) – od otwarcia do zamknięcia; liczyć klawisze i przejścia Tab.
- **Oczekiwany efekt:** całość bez myszy: Tab idzie przez pola w kolejności ekranu, kategoria i „plan” wybieralne
  z klawiatury, Ctrl+Enter i Enter działają; liczba klawiszy na zakup zapisana w raporcie (DO OCENY).
- **Nie przechodzi, gdy:**
  - któryś krok wymaga myszy;
  - Tab trafia do niewidocznego pola albo wychodzi z okna.
