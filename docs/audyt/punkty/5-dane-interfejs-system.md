# Audyt 1.15.4 – punkty, część 5: dane, Ustawienia, interfejs, system Windows

Zakres: dane i dwa komputery (DA), Ustawienia (US), interfejs (IN) i system Windows (SY) aplikacji na komputerze –
telefon poza zakresem (D97).

**Legenda**
- Nagłówek: identyfikator, funkcja, w nawiasie źródło wymagania – specyfikacja (sekcja), D…, T…, F…, regresja
  z przeglądów (B…, N…, N-PC-…), wersja z `CHANGELOG.md`, E0 / E4 („Gotowe, gdy” w `docs/plan.md`); „brak wymagania” –
  oczekiwanie sensowne dla użytkownika.
- **Kto:** Claude – laboratorium (wydanie rozpakowane, Playwright, pliki zmieniane z zewnątrz, drugi „komputer” po kolei
  przez `FI_MACHINE_NAME` i osobne userData, `main.log`, `config.json`, zapis prób powiadomień, odpowiedzi oknom wyboru
  pliku); Maszyna – Cowork w maszynie z Windows (instalacja, aktualizacja, zasobnik, autostart, globalny skrót,
  powiadomienia Windows, zegar tylko do przodu, uśpienie); Ty – dwa prawdziwe komputery z OneDrive, pliki „tylko
  online”, drugi monitor, dźwięk, ocena wyglądu (DO OCENY).
- **Ryzyko:** wysokie – utrata albo zła wartość danych; średnie – funkcja nie działa albo myli; niskie – ergonomia,
  tekst, wygląd.
- **Stan danych:** `pusty`, `start`, `rok`, `brzegi`, `dwa-komputery` (persona „Kapitan Testowy”) i to, co trzeba
  przygotować z zewnątrz; przy Maszynie także zegar (dzień, godzina).
- „Suma kontrolna” = SHA-256 każdego pliku folderu przed i po (bez `.presence/` i `backups/`, chyba że punkt mówi
  inaczej). Komputery w laboratorium: „DOM-PC” (pierwszy) i „LAPTOP” (drugi).

**Laboratorium – czego nie robić** (ochrona Twojej aplikacji)
- Nie włączać „Uruchamiaj z Windows”, w kreatorze odznaczyć start z Windows, na banerze autostartu wybrać „Nie” – wpis
  w rejestrze ma tę samą nazwę „Financial Intel” co Twoja aplikacja (T191) i nadpisałby albo usunął Twój autostart.
- Propozycja folderu tylko przez `FI_DEFAULT_DATA_DIR` – inaczej „Utwórz w OneDrive” założy dane w Twoim OneDrive.
- „Do Kosza” (kopie konfliktów, pliki z problemami, plik CSV) trafia do Kosza Windows Twojego konta – tylko dane
  syntetyczne.

### DA – dane i dwa komputery

#### DA.1 Pierwsze uruchomienie – propozycja folderu jednym kliknięciem (spec „Kreator startu” 1, D62, E0, 0.1.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** pusty – nowe userData, `FI_DEFAULT_DATA_DIR` →
  `C:\FI-audyt\dane\pusty-propozycja\FinancialIntel`
- **Jak sprawdzić:** uruchom bez `config.json`. Na ekranie „Kapitanie, gdzie trzymamy dziennik pokładowy?” odczytaj
  propozycję (ścieżka, napis przycisku). Kliknij przycisk propozycji („Utwórz w OneDrive (zalecane)” albo „Utwórz
  w Dokumentach”). Zamknij („Zakończ”) i uruchom ponownie.
- **Oczekiwany efekt:** propozycja to jedna ścieżka z folderem `FinancialIntel`; po kliknięciu powstaje `fi.json`
  z `schemaVersion`, wcięciem 2 spacji i końcowym `\n`; aplikacja prowadzi do kreatora startu (baner „Budżet jeszcze nie
  wystartował…” z „Kreator startu”); po ponownym uruchomieniu otwiera ten sam folder bez ekranu wyboru.
- **Nie przechodzi, gdy:**
  - ponowne uruchomienie znowu pyta o folder;
  - `fi.json` bez `schemaVersion` albo w innym formacie;
  - w folderze zostają pliki tymczasowe.

#### DA.2 „Nowe dane gdzie indziej” i „Otwórz istniejące” (D62, E0, 0.1.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** pusty (pusty folder) + rok (suma kontrolna przed)
- **Jak sprawdzić:** „Nowe dane gdzie indziej” → okno „Wybierz folder na nowe dane” → pusty folder. Potem nowe userData:
  „Otwórz istniejące” → okno „Wskaż folder z danymi Financial Intel” → folder `rok`. Porównaj sumy kontrolne.
- **Oczekiwany efekt:** w pustym folderze powstają nowe dane i kreator; istniejący folder otwiera się bez kreatora,
  z pełnymi danymi (liczba operacji jak w generatorze); pliki danych `rok` bajt w bajt bez zmian (zmienia się tylko
  `.presence/` i powstaje kopia dzienna).
- **Nie przechodzi, gdy:**
  - otwarcie istniejącego folderu zmienia pliki danych;
  - istniejący folder pokazuje kreator albo pusty budżet.

#### DA.3 Folder z obcymi plikami, zapamiętany folder pusty albo brakujący (T192, B53, 1.5.3)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok (kopia) + folder z obcymi plikami (`notatki.txt`)
- **Jak sprawdzić:** (a) „Otwórz istniejące” na folderze z obcymi plikami; (b) zamknij aplikację, zmień nazwę
  zapamiętanego folderu `rok`, uruchom, po minucie przywróć nazwę; (c) zastąp zapamiętany folder pustym, uruchom.
- **Oczekiwany efekt:** (a) „W tym folderze nie ma danych Financial Intel (fi.json). Można utworzyć w nim podfolder
  „FinancialIntel”.” i „Utwórz podfolder FinancialIntel” – obce pliki nietknięte; (b) komunikat o niedostępnym folderze,
  „Spróbuj ponownie” (i ponawianie co 30 s), żaden przycisk nie zakłada jednym kliknięciem nowych danych w tej ścieżce;
  po przywróceniu nazwy folder otwiera się z danymi; (c) nowe dane tylko po dwóch krokach „Utwórz tu nowe dane…” → „Na
  pewno – nowy budżet w tym folderze”.
- **Nie przechodzi, gdy:**
  - w brakującej ścieżce powstaje nowy `fi.json` (po powrocie OneDrive dwa budżety);
  - propozycja tej samej ścieżki jest wyróżniona jako „zalecane”;
  - obce pliki zmienione albo przeniesione.

#### DA.4 Folder ICTTJ odrzucony jako folder danych (spec „Granica z ICTTJ”, E0, T249)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** fikstura ICTTJ `C:\FI-audyt\ictj\` (suma kontrolna przed)
- **Jak sprawdzić:** wskaż folder ICTTJ i jego podfolder (`payouts\`) w „Otwórz istniejące” i „Nowe dane gdzie indziej”
  na ekranie wyboru oraz w Ustawienia → Folder i kopie → „Otwórz inny folder…” i „Nowe dane w innym folderze…”. Sumy
  kontrolne ICTTJ po.
- **Oczekiwany efekt:** każda próba odrzucona komunikatem „To folder danych ICT Trade Journal – Financial Intel nigdy
  w nim nie zapisuje. Wybierz inny folder.”; bieżący folder FI bez zmian; folder ICTTJ bajt w bajt taki sam.
- **Nie przechodzi, gdy:**
  - w ICTTJ powstaje cokolwiek (`fi.json`, `.presence/`, `backups/`) – waga K;
  - podfolder ICTTJ przyjęty jako folder danych.

#### DA.5 Postęp otwarcia i „Przerwij” (D82, T124–T126, 1.4.1)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok; `FI_OPEN_DELAY_MS` (np. 30 ms na plik),
  `FI_OPEN_SLOW_MS`
- **Jak sprawdzić:** uruchom z opóźnieniem. Odczytuj panel postępu co sekundę: etap, „Wczytywanie plików: X z Y”, pasek,
  czas, „Czeka Xs: …”, podpowiedź o plikach tylko online. Kliknij „Przerwij”, potem „Spróbuj ponownie”. Przeczytaj
  `main.log`. Powtórz z „Otwórz istniejące” na ekranie wyboru.
- **Oczekiwany efekt:** etapy „Sprawdzanie folderu” → „Szukanie plików – znaleziono N” → „Wczytywanie plików: X z Y” (Y
  = liczba plików, X rośnie do Y); „Przerwij” wraca do wyboru folderu z informacją, że nic nie zostało zmienione,
  a folder ma te same sumy kontrolne (bez kopii dziennej); „Spróbuj ponownie” otwiera go; od „Aktualizacja formatu
  danych” „Przerwij” jest wyłączone; w logu wiersze „open start / progress / aborted” co ok. 10 s.
- **Nie przechodzi, gdy:**
  - okno stoi bez postępu albo „Przerwij” nie działa;
  - po przerwaniu w folderze przybyło plików;
  - log nie mówi, gdzie otwieranie stanęło.

#### DA.6 Folder „tylko online” w OneDrive (D82, T123, 1.4.1)
- **Kto:** Ty · **Ryzyko:** średnie · **Stan danych:** rok (syntetyczny) w OneDrive na drugim komputerze, „Zwolnij
  miejsce” na folderze
- **Jak sprawdzić:** na drugim komputerze otwórz folder w FI („Otwórz istniejące” albo Ustawienia → „Otwórz inny
  folder…”); obserwuj postęp; po otwarciu porównaj Mostek z pierwszym komputerem.
- **Oczekiwany efekt:** licznik plików rośnie bez minutowych przestojów, pojawia się podpowiedź „Zawsze zachowuj na tym
  urządzeniu”, folder otwiera się w rozsądnym czasie; liczby Mostka takie same jak na pierwszym komputerze.
- **Nie przechodzi, gdy:**
  - okno „wisi” ponad minutę bez zmiany licznika;
  - po otwarciu brak części danych albo inne liczby.

#### DA.7 Zmiana folderu z Ustawień i powrót (T197, B31, 1.5.3, 1.6.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok + start (dwa foldery)
- **Jak sprawdzić:** w `rok` wpisz nową kwotę w edytorze operacji (bez wyjścia z pola) i od razu Ustawienia → Folder
  i kopie → „Otwórz inny folder…” → `start`. W trakcie wczytywania spróbuj edytować i otworzyć szybki wpis. Potem
  „Ostatnio używane foldery” → „Otwórz” przy `rok`.
- **Oczekiwany efekt:** kwota zapisana w pliku `rok` przed przełączeniem, nic z `rok` nie trafia do `start`; w trakcie
  postęp z „Przerwij”, pola i przyciski folderu wyłączone, szybki wpis odmawia z wyjaśnieniem; toast „Otwarto folder
  danych.”; powrót pokazuje dane `rok` z nową kwotą.
- **Nie przechodzi, gdy:**
  - wpisana kwota przepada albo ląduje w drugim folderze;
  - drugie kliknięcie w trakcie otwiera folder drugi raz;
  - po powrocie widać stare dane.

#### DA.8 Uszkodzony fi.json – „Weź ustawienia z historii” (T248, B107, B109, 1.6.5)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok (kopia) z kilkoma wersjami `fi.json` w `.history/`
- **Jak sprawdzić:** zamknij aplikację, utnij `fi.json` w połowie (niepoprawny JSON), uruchom; kliknij „Weź ustawienia
  z historii”; sprawdź Ustawienia i Synchronizację.
- **Oczekiwany efekt:** ekran wyboru folderu z wyjaśnieniem po polsku; po kliknięciu folder otwiera się z ustawieniami
  z najnowszej czytelnej wersji (nazwa okrętu, konta, kategorie); uszkodzony plik leży obok jako kopia widoczna
  w Synchronizacji; nic nie nadpisane bez śladu.
- **Nie przechodzi, gdy:**
  - powstaje nowy pusty `fi.json` (utrata ustawień – K);
  - uszkodzony plik znika;
  - komunikat techniczny po angielsku.

#### DA.9 Kopia dzienna przy otwarciu (D31, D84 C4, T154, 1.4.3)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok, bez kopii z dziś
- **Jak sprawdzić:** otwórz folder; sprawdź `backups/daily/`; rozpakuj ZIP i porównaj z folderem; Ustawienia → Folder
  i kopie; zamknij i otwórz drugi raz tego dnia.
- **Oczekiwany efekt:** `RRRR-MM-DD.zip` z dzisiejszą datą warszawską; w ZIP wszystkie pliki danych i `fi.json` (te same
  bajty), bez `.history/`, `.presence/` i `backups/`; „Ostatnia kopia: dziś”, na liście kopia „dzienna”; drugie otwarcie
  nie robi drugiej kopii.
- **Nie przechodzi, gdy:**
  - brak kopii albo brakuje w niej plików;
  - ZIP zawiera historię albo inne kopie.

#### DA.10 Rotacja – 14 dziennych i 8 tygodniowych (D84 C4, T154, T249)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok; w `backups/daily/` 20 ZIP-ów z nazwami z 20 ostatnich
  dni i plik `notatka.zip`, w `backups/weekly/` 10 ZIP-ów tygodni ISO, bez kopii z dziś
- **Jak sprawdzić:** otwórz folder (kopia dzienna i rotacja); policz pliki w obu podfolderach.
- **Oczekiwany efekt:** zostaje 14 najnowszych dziennych i 8 najnowszych tygodniowych; tygodniowa bieżącego tygodnia ISO
  powstaje z dzisiejszej dziennej; `notatka.zip` nietknięty.
- **Nie przechodzi, gdy:**
  - usuwane są najnowsze zamiast najstarszych;
  - znika plik o obcej nazwie;
  - zostaje inna liczba kopii.

#### DA.11 Kopia ręczna (spec „Kopie zapasowe”, T20, T154, 1.4.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** Ustawienia → Folder i kopie → „Kopia teraz”; paleta „Kopia zapasowa teraz”; łącznie 6 kopii;
  rozpakuj ostatnią.
- **Oczekiwany efekt:** toast „Utworzono kopię: …”, plik w `backups/manual/`, „ręczna” na liście, „Ostatnia kopia:
  dziś”; zawartość jak w DA.9; zostaje 5 najnowszych ręcznych (T20), a Ustawienia mówią, że ręczne też się rotują.
- **Nie przechodzi, gdy:**
  - kopia niepełna;
  - starsza kopia ręczna znika bez żadnej informacji w Ustawieniach (UWAGA).

#### DA.12 Kopia przed importem (spec „Import z mBanku” 5, 0.3.0, D84 C4)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok + CSV z mBanku z nowymi wierszami (suma kontrolna przed)
- **Jak sprawdzić:** import pliku do zapisu; sprawdź `backups/pre-import/`, rozpakuj i porównaj ze stanem sprzed; zrób
  11 importów z nowymi wierszami (małe pliki).
- **Oczekiwany efekt:** przed zapisem powstaje ZIP ze stanem sprzed importu (bez operacji z pliku), „przed importem” na
  liście; zostaje 10 najnowszych.
- **Nie przechodzi, gdy:**
  - kopia zawiera już operacje z importu;
  - import bez kopii;
  - rotacja usuwa inne rodzaje kopii.

#### DA.13 Kopia przed migracją formatu (spec „Kopie zapasowe”, T20, T154, E1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok (kopia): `fi.json` bez pola `schemaVersion` (format v0)
  i nieznane pole `x-audyt`; wariant 2: tylko jeden plik operacji bez `schemaVersion`
- **Jak sprawdzić:** otwórz folder; przeczytaj baner; sprawdź `backups/pre-migration/` i przepisane pliki.
- **Oczekiwany efekt:** przed przepisaniem powstaje `…_v0-v1.zip` z oryginałami bajt w bajt; baner „Dane zaktualizowano
  z formatu v0 do v1. Kopia sprzed migracji: …”; na liście „przed migracją”; pliki mają `schemaVersion: 1`, nieznane
  pole zostaje; wariant 2 – oryginał w `pre-migration/<czas>/`.
- **Nie przechodzi, gdy:**
  - migracja bez kopii albo kopia z już przepisanymi plikami;
  - utrata nieznanego pola (K).

#### DA.14 Własny folder kopii (T249, B115, B121, 1.6.5)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok + start
- **Jak sprawdzić:** „Zmień folder kopii…” → `C:\FI-audyt\kopie\`; „Kopia teraz”; zmień folder danych na `start`, „Kopia
  teraz”; spróbuj ustawić folder kopii w folderze ICTTJ; wróć do „Domyślny (backups/ w folderze danych)”; sprawdź
  `fi.json` i Synchronizację.
- **Oczekiwany efekt:** kopie każdego folderu danych w osobnym podfolderze (`nazwa-<skrót>`), wcześniejsze kopie zostają
  na miejscu; Ustawienia i Synchronizacja podają prawdziwy folder kopii; folder w ICTTJ odrzucony („… Wybierz inny
  folder na kopie.”); ustawienie tylko tego komputera (nie ma go w `fi.json`).
- **Nie przechodzi, gdy:**
  - kopie dwóch folderów danych mieszają się albo rotują nawzajem;
  - cokolwiek zapisane w ICTTJ (K).

#### DA.15 Nieudana kopia i plik nieczytelny (T154, T249, B123, 1.4.3, 1.6.5)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok
- **Jak sprawdzić:** (a) folder kopii `C:\FI-audyt\kopie-x\`, usuń go z zewnątrz, uruchom ponownie (kopia dzienna); (b)
  otwórz jeden plik operacji na wyłączność z zewnątrz (PowerShell `[IO.File]::Open(…, 'Open', 'Read', 'None')`) i „Kopia
  teraz”; zwolnij plik i powtórz.
- **Oczekiwany efekt:** (a) Ustawienia pokazują, kiedy i dlaczego kopia się nie udała, po polsku; udana kopia ręczna
  w działającym folderze zdejmuje ostrzeżenie; (b) kopia przerwana z komunikatem, nie powstaje niepełny ZIP; po
  zwolnieniu pliku kopia się udaje.
- **Nie przechodzi, gdy:**
  - błąd widać tylko w logu;
  - na liście pojawia się niepełna kopia;
  - aplikacja zawiesza się na zablokowanym pliku.

#### DA.16 Kopia dzienna w zasobniku i ostrzeżenie po 3 dniach (F2, T154, T249, 1.4.3, 1.6.5)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** start; zegar: dzień D 23:50 → D+1 00:10 z aplikacją
  w zasobniku (bez uśpienia), potem pierwszy poniedziałek, potem folder kopii odłączony i zegar +3 dni
- **Jak sprawdzić:** zostaw aplikację w zasobniku przez północ, po godzinie sprawdź `backups/daily/`; w poniedziałek
  sprawdź `backups/weekly/`; ustaw folder kopii na pendrive albo udział, odłącz, przesuń zegar o 3 dni (aplikacja
  w zasobniku), poczekaj godzinę.
- **Oczekiwany efekt:** kopia z nową datą w ciągu godziny bez otwierania okna; w nowym tygodniu ISO kopia tygodniowa; po
  3 dniach bez kopii powiadomienie „Kopie zapasowe nie powstają” najwyżej raz dziennie i w Ustawieniach ostrzeżenie „…
  starsza niż 3 dni: sprawdź folder kopii albo zrób kopię teraz.”
- **Nie przechodzi, gdy:**
  - kopia powstaje dopiero po otwarciu okna;
  - brak powiadomienia albo przychodzi co godzinę.

#### DA.17 Odzyskanie z kopii – podgląd (F3, D86, T212, 1.6.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; „Kopia teraz”, potem: kwota 2 operacji zmieniona, 1
  operacja usunięta, koperta planu bieżącego miesiąca zmieniona, nazwa okrętu zmieniona, 1 operacja dodana
- **Jak sprawdzić:** „Odzyskaj…” przy tej kopii; przeczytaj podsumowanie, pozycje i „różnice”; to samo przy ukrytych
  kwotach (Ctrl+$); sumy kontrolne folderu przed i po samym podglądzie.
- **Oczekiwany efekt:** „Od kopii: 3 zmienione, 1 usunięty” (dwie operacje i plan), osobno „Ustawienia”, „Dodane po
  kopii: 1” (zostają); różnice z polskimi nazwami pól, kwotami „−12,50 zł” i nazwami kategorii (kolumny „Teraz” / „W
  kopii”); przy ukrytych kwotach „•••”; podgląd niczego nie zmienia w folderze.
- **Nie przechodzi, gdy:**
  - liczby nie zgadzają się z tym, co zmieniono;
  - kwoty w groszach albo widoczne mimo Ctrl+$ (B7);
  - identyfikatory zamiast nazw;
  - błędna odmiana („3 zmienionych”, „1 usuniętych”) – UWAGA.

#### DA.18 Odzyskanie wybranych wpisów z „Cofnij” (F3, D86, T212)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** jak DA.17
- **Jak sprawdzić:** zaznacz usuniętą i jedną zmienioną operację, „Odzyskaj zaznaczone (2)”; sprawdź Operacje, Historię
  obu wpisów i Mostek; „Cofnij” w toaście; odzyskaj jeszcze raz i zostaw.
- **Oczekiwany efekt:** toast „Odzyskano z kopii: 2 wpisy… Poprzednie wersje są w historii.” z „Cofnij”; usunięta wraca
  z tym samym id, zmieniona ma wartości z kopii, w Historii wersja „przed przywróceniem”; Mostek przeliczony; „Cofnij”
  przywraca stan sprzed („Cofnięto odzyskanie z kopii.”), usunięta znowu znika; niezaznaczone wpisy bez zmian.
- **Nie przechodzi, gdy:**
  - odzyskanie bez wersji w historii;
  - „Cofnij” nie działa albo zostawia duplikat;
  - zmieniają się wpisy niezaznaczone.

#### DA.19 Odzyskanie całego folderu do nowego (F3, D86, T212)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok (suma kontrolna bieżącego folderu przed)
- **Jak sprawdzić:** „Odzyskaj cały folder do nowego…” przy kopii dziennej; powtórz z tą samą kopią w tej samej minucie;
  wróć przez „Ostatnio używane foldery”.
- **Oczekiwany efekt:** obok folderu danych powstaje „<folder> – kopia z RRRR-MM-DD GG.MM” (drugi raz – z numerem)
  i otwiera się z postępem; w nim stan z kopii; bieżący folder bajt w bajt bez zmian; powrót do niego działa.
- **Nie przechodzi, gdy:**
  - bieżący folder nadpisany (K);
  - drugie odzyskanie nadpisuje pierwsze;
  - nowy folder bez `fi.json` albo bez drogi powrotu.

#### DA.20 Odzyskanie – spreparowana albo uszkodzona kopia (T212, F3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok; w folderze kopii trzy ZIP-y o nazwach kopii dziennych:
  (a) z wpisem `..\..\audyt.json`, (b) ucięty w połowie, (c) z operacją `schemaVersion: 2`
- **Jak sprawdzić:** „Odzyskaj…” przy każdym; sprawdź, czy poza folderem danych nie powstał `audyt.json`.
- **Oczekiwany efekt:** (a) kopia odrzucona w całości komunikatem, nic nie zapisane; (b) zrozumiały błąd w oknie; (c)
  wpis nowszej wersji pominięty z informacją albo nie do odzyskania; aplikacja działa dalej.
- **Nie przechodzi, gdy:**
  - plik zapisany poza folderem (K);
  - awaria okna albo cisza.

#### DA.21 Historia wpisu – operacja (D28, T196, T269, B7, N92, E1)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** zmień kwotę, kategorię i notatkę operacji; „Historia”; „Przywróć tę wersję”; otwórz Historię
  jeszcze raz; powtórz przy Ctrl+$.
- **Oczekiwany efekt:** okno „Historia zmian – <tytuł>”: wersje z czasem, komputerem i powodem („przed edycją”) – edycje
  jednego komputera w ciągu 10 min to jedna wersja (T269); różnice „Ta wersja” / „Obecnie” z polskimi nazwami pól,
  nazwami kategorii i kwotami w zł; przywrócenie – toast „Przywrócono: … Poprzednia wersja jest w historii.” i bieżąca
  wersja w historii; przy ukrytych kwotach „•••”.
- **Nie przechodzi, gdy:**
  - kwoty w groszach albo bez maski (B7);
  - identyfikatory ULID zamiast nazw (N92);
  - przywrócenie gubi bieżącą wersję.

#### DA.22 Historia przy innych wpisach (T196, N18, F33, 1.5.3)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** po jednej zmianie: plan miesiąca, kontener, cel, pożyczka, saldo otwarcia konta, zadokowana
  dostawa, ustawienia (Synchronizacja – „Ustawienia (fi.json) też mają historię”), wpis w oknie „Zmiany z drugiego
  komputera”; przy każdym „Historia”; Esc.
- **Oczekiwany efekt:** przycisk „Historia” jest przy każdym, okno pokazuje wersję sprzed zmiany; Esc zamyka tylko okno
  historii, okno pod nim zostaje.
- **Nie przechodzi, gdy:**
  - przy którymś wpisie brak historii;
  - Esc zamyka dwa okna naraz.

#### DA.23 Historia w trybie tylko do odczytu i wpisu nowszej wersji (T194, N55, 1.5.3)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok z `fi.json` `schemaVersion: 2`; osobno rok z jedną
  operacją `schemaVersion: 2`
- **Jak sprawdzić:** w obu stanach otwórz Historię operacji i spróbuj „Przywróć tę wersję”.
- **Oczekiwany efekt:** Historię da się otworzyć i przeczytać; przywrócenie niedostępne albo odmówione z wyjaśnieniem;
  pliki bez zmian.
- **Nie przechodzi, gdy:**
  - przycisk Historii wyłączony razem z polami;
  - przywrócenie zapisuje mimo trybu.

#### DA.24 Usunięte wpisy i Kosz (E0, T189, T205, 0.1.0, 1.9.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok
- **Jak sprawdzić:** usuń operację (ikona kosza → „Usuń na pewno”) i kontener, nie cofaj; zajrzyj do folderu;
  Synchronizacja → „Usunięte wpisy” → „Pokaż”, wyszukaj kontrahenta, „Przywróć” przy obu; sprawdź Mostek.
- **Oczekiwany efekt:** plik wpisu znika z folderu od razu, wersja zostaje w historii; wpis na liście „usunięty” z datą;
  „Przywróć” oddaje go z tym samym id i wartościami, liczby wracają; do Kosza Windows idą tylko kopie konfliktów, pliki
  z problemami i plik CSV z importu – usunięte wpisy wracają z aplikacji; pusta lista: „Brak usuniętych wpisów
  w historii.”
- **Nie przechodzi, gdy:**
  - usuniętego wpisu nie ma na liście;
  - „Przywróć” tworzy nowy id albo duplikat;
  - wpis usunięty bez możliwości odzyskania (K).

#### DA.25 Dziennik zmian folderu (F33, T269, 1.7.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** dwa-komputery; w dniu testu zmiany z DOM-PC i LAPTOP (po
  kolei), w danych zmiany sprzed 3 i 20 dni
- **Jak sprawdzić:** Synchronizacja → „Dziennik zmian”: „dziś”, „7 dni”, „30 dni”; „każdy komputer” / „każdy rodzaj”;
  „Zmiany” przy operacji z LAPTOP; „Weź poprzednią wersję”; „pokaż”; filtr bez wyników.
- **Oczekiwany efekt:** każdy wpis raz (ostatni zapis), z czasem, komputerem i rodzajem, najnowsze najpierw, „nowy” przy
  utworzonych w okresie; filtry zawężają; „Zmiany” – „Przed zmianą” / „Teraz” po polsku w zł; „Weź poprzednią wersję”
  przywraca z wersją w historii; „pokaż” otwiera wpis na jego ekranie; pusto – „Brak zmian dziś…”.
- **Nie przechodzi, gdy:**
  - zmiany LAPTOP przypisane DOM-PC;
  - brakuje rodzaju (plan, kontener, cel, pożyczka, saldo, dokowanie, boja, ustawienia);
  - „Weź poprzednią wersję” bez śladu w historii.

#### DA.26 Konflikt kopii chmury – wykrycie (spec „Dane i synchronizacja”, E0, T252, N92–N94)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; z zewnątrz kopia pliku operacji z dopiskiem `-LAPTOP`
  (inna kwota i notatka, `updatedBy` LAPTOP)
- **Jak sprawdzić:** przy otwartej aplikacji utwórz plik; odczekaj odświeżenie albo „Przeskanuj teraz”; sprawdź baner,
  liczniki w menu, Meldunki, Synchronizacja → „Konflikty (1)”, Mostek.
- **Oczekiwany efekt:** baner „Konflikty synchronizacji: 1…” z „Rozstrzygnij”; licznik przy Synchronizacji
  i w Meldunkach; karta: „Operacja”, „Oryginał” / „Kopia”, „nowsza”, różnice po polsku w zł; do rozstrzygnięcia ekrany
  liczą jedną operację (bez podwójnej kwoty w energii).
- **Nie przechodzi, gdy:**
  - kopia liczona jako druga operacja (K);
  - brak banera albo licznika;
  - surowe klucze pól.

#### DA.27 Konflikt – „Zachowaj tę wersję” (T141, T252, B44, B45, N91)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** jak DA.26, dwa konflikty
- **Jak sprawdzić:** w pierwszym „Zachowaj tę wersję” po stronie kopii, w drugim po stronie oryginału; sprawdź plik,
  Historię, Kosz Windows i licznik.
- **Oczekiwany efekt:** zostaje wybrana wersja pod nazwą oryginału, zapisana z czasem i nazwą tego komputera; odrzucona
  w Historii wpisu; plik kopii w Koszu; konflikt znika, liczby przeliczone.
- **Nie przechodzi, gdy:**
  - odrzucona wersja przepada bez śladu (K);
  - zachowana kopia ma `updatedBy` LAPTOP i czas tego komputera;
  - konflikt wraca po odświeżeniu.

#### DA.28 Konflikt – „Scal…” (N17, T195, T143, B47, 1.5.3)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; para 1: wersja w historii, po stronie oryginału inna
  kwota, po stronie kopii – nowa notatka i nowe pole tagów; para 2: ta sama kwota zmieniona po obu stronach
- **Jak sprawdzić:** „Scal…”, przejrzyj zaznaczenia, „Zapisz scalone”; para 2 – między otwarciem „Scal…” a zapisem zmień
  z zewnątrz plik kopii.
- **Oczekiwany efekt:** przy każdym różnym polu wybór „oryginał:” / „kopia:”; domyślnie strona, która pole zmieniła
  (kwota z oryginału, notatka i tagi z kopii), przy zmianie po obu stronach – nowsza; wynik pod id oryginału, obie
  strony w Historii, kopia do Kosza; zmiana w trakcie → odmowa i prośba o ponowne „Scal…”.
- **Nie przechodzi, gdy:**
  - scalenie gubi pole albo usuwa klucz dodany po jednej stronie (B47);
  - nadpisuje wersję zmienioną w trakcie.

#### DA.29 Konflikty zbiorczo – „Zaakceptuj nowsze” (1.4.3, N97, T252)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok + 5 kopii konfliktu (3 nowsze w kopii, 2 w oryginale)
- **Jak sprawdzić:** „zaznacz wszystkie” → „Zaakceptuj nowsze: wszystkie (5)”; porównaj nazwę akcji z oknem „Zmiany
  z drugiego komputera”.
- **Oczekiwany efekt:** każdy wpis w nowszej wersji, odrzucone w historii, jednym ruchem bez zawieszenia; ta sama nazwa
  „Zaakceptuj nowsze” w obu miejscach.
- **Nie przechodzi, gdy:**
  - zostaje starsza wersja;
  - część konfliktów zostaje bez komunikatu.

#### DA.30 Konflikt ustawień i planu miesiąca (E0, T141, B46)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; (a) `fi-LAPTOP.json` z inną nazwą okrętu i celem osłon;
  (b) drugi plan bieżącego miesiąca z innym id i innymi kopertami (kopia `-LAPTOP`)
- **Jak sprawdzić:** (a) „Zachowaj tę wersję” przy kopii, bez restartu sprawdź Ustawienia i menu boczne, po minucie
  `fi.json`; (b) Plan miesiąca przed i po rozstrzygnięciu.
- **Oczekiwany efekt:** (a) okno od razu pokazuje zachowane ustawienia i autozapis ich nie cofa; (b) Plan miesiąca
  pokazuje jeden plan, druga wersja czeka w Synchronizacji; po wyborze plan i energia według wybranej.
- **Nie przechodzi, gdy:**
  - okno nadpisuje zachowaną kopię starymi ustawieniami (K);
  - dwa plany jednego miesiąca naraz albo „usunięty na innym komputerze”.

#### DA.31 Pliki z problemami (T252, N95, B42, 1.6.5)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok + z zewnątrz pliki operacji: (a) niepoprawny JSON, (b)
  bez kwoty, (c) `schemaVersion: 2`, (d) zablokowany na wyłączność
- **Jak sprawdzić:** Synchronizacja → „Pliki z problemami”; przy (a) „Do Kosza” → „Do Kosza na pewno”; przy (d) zwolnij
  blokadę i „Wczytaj ponownie”.
- **Oczekiwany efekt:** odznaki „uszkodzony”, „zła struktura”, „nowszy format”, nieczytelny; (a) do Kosza dopiero po
  potwierdzeniu; (c) bez „Do Kosza”, z „zaktualizuj aplikację”; (d) wpis wraca na ekrany bez restartu, plik nie jest
  odsunięty; reszta danych działa.
- **Nie przechodzi, gdy:**
  - plik nowszej wersji albo chwilowo nieczytelny da się wyrzucić jednym kliknięciem;
  - zablokowany plik traktowany jak uszkodzony.

#### DA.32 Zmiany z drugiego komputera w trakcie pracy (E0, B48, B49, T143)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** dwa-komputery; Ustawienia → Okręt → „Praca na kilku
  komputerach”
- **Jak sprawdzić:** (a) „Scalaj zmiany, pytaj tylko przy konflikcie”: z zewnątrz zmień plik operacji (zapis jak
  LAPTOP); (b) „Zawsze pytaj przed przyjęciem zmian”: to samo → okno → „Później” → chip → „Zastosuj” z „Przyjmij
  zmiany”; (c) z zewnątrz usuń plik operacji → „Zachowaj (przywróć plik)”; sprawdź pliki.
- **Oczekiwany efekt:** (a) nowa wartość na ekranie w ciągu ok. 30 s bez pytania; (b) „Zmiany z drugiego komputera (1)”
  z różnicami po polsku, „Później” zostawia chip „Zmiany z drugiego komputera: 1”, wybór trafia na dysk; (c) „usunięty
  na innym komputerze”, po „Zachowaj (przywróć plik)” plik wraca.
- **Nie przechodzi, gdy:**
  - zmiana z zewnątrz nadpisana bez pytania;
  - wybór nie trafia na dysk (B48);
  - usunięty wpis wraca po cichu (B49).

#### DA.33 Dwa komputery po kolei – te same dane i liczby (spec „Dane i synchronizacja”, D2, E0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** dwa-komputery; DOM-PC i LAPTOP z osobnym userData
- **Jak sprawdzić:** DOM-PC: dodaj operację, zmień kopertę, potwierdź saldo, „Zakończ”. LAPTOP: uruchom, odczytaj
  Mostek, zmień cel osłon, „Zakończ”. DOM-PC: uruchom. Sprawdź pliki i Synchronizację.
- **Oczekiwany efekt:** każdy komputer widzi zmiany drugiego; Mostek na obu takie same co do grosza (odczyty → AU-9);
  `updatedBy` = komputer, który zmienił; bez kopii konfliktu i bez duplikatów wpisów pochodnych (plan miesiąca, miesiąc
  gry); „Ostatnia zmiana z innego komputera: LAPTOP, …”.
- **Nie przechodzi, gdy:**
  - różne liczby na dwóch komputerach;
  - konflikt albo duplikat bez równoczesnej pracy.

#### DA.34 Obecność i „w użyciu” (D86, F21, T198, N20, N93, 1.5.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** dwa-komputery; z zewnątrz plik `.presence/` LAPTOP (wzór –
  zapisany przez LAPTOP w DA.33): (1) sygnał i ruch teraz, (2) sygnał teraz, ruch sprzed 15 min, (3) bez ruchu (wersja
  sprzed 1.5.3), sygnał sprzed 2 min, (4) sygnał sprzed 12 min
- **Jak sprawdzić:** DOM-PC otwarty; po każdym wariancie odczytaj Synchronizacja → „Inne komputery”, Ustawienia → Okręt,
  baner.
- **Oczekiwany efekt:** (1) „LAPTOP – w użyciu”, baner „Ten folder jest też w użyciu na: LAPTOP…”; (2) „w zasobniku”,
  bez banera; (3) w użyciu; (4) LAPTOP znika z listy; przy każdym godzina sygnału i ruchu.
- **Nie przechodzi, gdy:**
  - baner przy komputerze w zasobniku (N20);
  - brak banera przy komputerze w użyciu.

#### DA.35 Zapisy w tle tylko na komputerze w użyciu (D86, F21, T198, T199, B33)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** dwa-komputery z dniami gry do zamrożenia (ostatnie zamrożenie
  3 dni temu) i celami ICTTJ do przepisania
- **Jak sprawdzić:** DOM-PC start ukryty (`--hidden`), bez ruchu; LAPTOP „w użyciu” (plik obecności odświeżany
  z zewnątrz co minutę) przez 15 min – obserwuj czasy zmian `game/` i `goals/`. Potem pokaż okno DOM-PC, porusz myszą,
  przestań odświeżać LAPTOP, czekaj 5 min.
- **Oczekiwany efekt:** w zasobniku przy LAPTOP w użyciu żadnych zapisów w tle (poza obecnością i kopią dzienną); po
  przejściu w użycie dni zamrażane najwcześniej 3 min po otwarciu i minutę po ostatniej zmianie z zewnątrz.
- **Nie przechodzi, gdy:**
  - komputer w zasobniku zamraża dni albo zapisuje cele;
  - zamrożenie od razu po otwarciu (B33).

#### DA.36 Powiadomienia bez podwójnych (D86, F21, T56, T198)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** dwa-komputery z powodem powiadomienia dziś (np. przekroczony
  przydział); zapis prób powiadomień
- **Jak sprawdzić:** DOM-PC w zasobniku, LAPTOP w użyciu (plik obecności) – czekaj 2 cykle (2 min); potem LAPTOP
  w zasobniku i nowy powód (wydatek ponad kopertę); potem ponowne uruchomienie DOM-PC.
- **Oczekiwany efekt:** przy LAPTOP w użyciu DOM-PC nie pokazuje powiadomienia (zapamiętuje jako pokazane); gdy żaden
  nie jest w użyciu – pokazuje; to samo powiadomienie nie wraca po ponownym uruchomieniu.
- **Nie przechodzi, gdy:**
  - powiadomienie na komputerze w zasobniku mimo drugiego w użyciu;
  - powtórka po ponownym uruchomieniu.

#### DA.37 Dwa prawdziwe komputery z OneDrive (D2, D86, F21)
- **Kto:** Ty · **Ryzyko:** wysokie · **Stan danych:** dwa-komputery – syntetyczny folder skopiowany do OneDrive (nie
  Twój)
- **Jak sprawdzić:** komputer A: dodaj operacje, schowaj do zasobnika; po synchronizacji pracuj na B; po kilku godzinach
  wróć na A; zostaw oba w zasobniku na noc i rano otwórz jeden.
- **Oczekiwany efekt:** zmiany docierają w obie strony; brak banera, gdy drugi jest tylko w zasobniku; brak kopii
  konfliktu bez równoczesnej edycji; powiadomienia tylko na komputerze, przy którym siedzisz; kopia dzienna na obu.
- **Nie przechodzi, gdy:**
  - kopie `-KOMPUTER` bez powodu (np. pliki gry, obecność);
  - podwójne powiadomienia;
  - utracona zmiana.

#### DA.38 Wpis z nowszej wersji – tylko do odczytu (spec „Konwencje”, T141, T194, B67, 1.6.5)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok + z zewnątrz operacja, kontener, cel i plan miesiąca
  z `schemaVersion: 2` i nieznanym polem (sumy kontrolne)
- **Jak sprawdzić:** otwórz każdy wpis w edytorze i spróbuj zmienić; usuń; zaznacz operację z innymi i „Zmień
  zaznaczone”; zamknij aplikację; porównaj pliki.
- **Oczekiwany efekt:** wpisy widoczne z dopiskiem „zaktualizuj aplikację” („Ten wpis zapisała nowsza wersja
  aplikacji…”); pola wyłączone; usunięcie odmówione, wpis zostaje na ekranie; zmiana zbiorcza liczy go osobno; pliki
  bajt w bajt bez zmian; zamknięcie bez pytania (albo, gdy coś próbowało zapisu, pytanie z przyczyną „nowsza wersja”).
- **Nie przechodzi, gdy:**
  - plik nadpisany albo utracone nieznane pole (K);
  - zmiana „znika po cichu”;
  - komunikat w kółko.

#### DA.39 Folder nowszej wersji – cały tylko do odczytu (T194, N2, 1.5.3)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok z `fi.json` `schemaVersion: 2` (sumy kontrolne)
- **Jak sprawdzić:** otwórz; spróbuj: Ctrl+N i zapis, zmiana ustawień budżetu, koperta w Planie miesiąca, zmiana
  zbiorcza w Operacjach, szybki wpis z palety, import CSV, Ctrl+S; zmień ustawienie komputera (rozmiar).
- **Oczekiwany efekt:** baner „Folder danych ma format v2, a ta wersja aplikacji obsługuje v1. Zaktualizuj aplikację –
  do tego czasu dane są tylko do odczytu.”; wskaźnik „tylko odczyt”; pola zmian wyłączone; akcje mówią „Folder jest
  tylko do odczytu” zamiast sukcesu; żaden plik danych się nie zmienia; ustawienia komputera działają.
- **Nie przechodzi, gdy:**
  - komunikat sukcesu bez zapisu (N2);
  - jakikolwiek zapis albo migracja.

#### DA.40 Folder znika w trakcie pracy i wraca (plan audytu oś 8, T249, B113, brak wymagania co do treści)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok
- **Jak sprawdzić:** przy otwartej aplikacji zmień z zewnątrz nazwę folderu danych; po minucie spróbuj edycji, Ctrl+N,
  szybkiego wpisu; przywróć nazwę; czekaj do 5 min; sprawdź folder i `main.log`.
- **Oczekiwany efekt:** w ciągu kilkunastu sekund baner „Folder danych jest niedostępny (odłączony dysk lub brak
  dostępu). Zmiany nie są zapisywane.”, wskaźnik „tylko odczyt”, żadna akcja nie udaje sukcesu; w starej ścieżce nie
  powstaje nowy folder ani `fi.json`; po powrocie baner znika sam (najpóźniej po 5 min), zapisy działają, dane pełne;
  w logu kilka wpisów bez stosu co 5 s.
- **Nie przechodzi, gdy:**
  - aplikacja zakłada pusty folder w starej ścieżce (K);
  - powrót wymaga ponownego uruchomienia;
  - log zalany wpisami.

#### DA.41 Zmiana wpisana tuż przed zniknięciem folderu (plan audytu oś 8, T140, T247)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok
- **Jak sprawdzić:** wpisz kwotę w edytorze operacji, zmień z zewnątrz nazwę folderu, wyjdź z pola; zamknij aplikację
  zanim folder wróci. Drugi przebieg: przywróć folder przed zamknięciem.
- **Oczekiwany efekt:** przy zamknięciu bez folderu pytanie „Niezapisane zmiany” z przyczyną („Powód: … Folder danych
  może być niedostępny…”), „Anuluj” zostawia aplikację i ponawia zapis; po powrocie folderu zmiana zapisuje się sama,
  zamknięcie bez pytania, kwota w pliku.
- **Nie przechodzi, gdy:**
  - zamknięcie bez pytania i utrata zmiany (K);
  - pytanie bez przyczyny.

#### DA.42 Plik wpisu usunięty z zewnątrz w trakcie edycji (B49, T140)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** otwórz operację w edytorze, usuń z zewnątrz jej plik, zmień notatkę i wyjdź z pola.
- **Oczekiwany efekt:** pytanie, czy usunąć wpis też tutaj, czy zachować („Zachowaj (przywróć plik)”); po „Zachowaj”
  plik wraca z nową notatką; po „Usuń też tutaj” wpis znika z ekranu.
- **Nie przechodzi, gdy:**
  - wpis odtworzony po cichu albo zmiana porzucona bez słowa.

#### DA.43 Zamknięcie zaraz po zmianie – bez fałszywego pytania (D88, T301, 1.10.1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok
- **Jak sprawdzić:** 10 razy: zmień kwotę i od razu, bez wyjścia z pola, zamknij aplikację (X przy wyłączonym „Zamykaj
  do zasobnika” albo „Zakończ” – ta sama droga); także w trakcie zmiany kategorii 200 zaznaczonych operacji i zaraz po
  imporcie; uruchom i sprawdź pliki oraz `main.log`.
- **Oczekiwany efekt:** aplikacja zamyka się bez pytania; każda zmiana jest w pliku po ponownym uruchomieniu.
- **Nie przechodzi, gdy:**
  - pytanie o niezapisane zmiany bez prawdziwej przyczyny („zapis jeszcze trwa”);
  - utracona ostatnia zmiana (K).

#### DA.44 Zamknięcie i kroki zapisu przy czekającej decyzji (T247, B108, 1.6.5)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** dwa-komputery, „Zawsze pytaj przed przyjęciem zmian”
- **Jak sprawdzić:** zmiana z zewnątrz → „Później”; zmień ten sam wpis tutaj; „Kopia teraz”; „Otwórz inny folder…”;
  zamknij aplikację → „Anuluj”; zamknij ponownie → „Zamknij mimo to”; uruchom i sprawdź plik.
- **Oczekiwany efekt:** kopia i zmiana folderu mówią, że czekają na decyzję („Czekają zmiany z drugiego komputera (1) –
  … w otwartym oknie”); zamknięcie: „Zdecyduj o zmianach z drugiego komputera (1).” z wyjaśnieniem obu przycisków;
  „Anuluj” zostawia aplikację z oknem decyzji; „Zamknij mimo to” zostawia na dysku wersję drugiego komputera.
- **Nie przechodzi, gdy:**
  - komunikat o zablokowanym pliku i ponawianiu;
  - „Anuluj” zamyka aplikację.

#### DA.45 Szkic nowego wpisu i opuszczenie ekranu (spec „Konwencje”, T34, T244, N36, 1.6.4)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** (a) Ctrl+N, nic nie wpisuj, Ctrl+1; (b) Ctrl+N, kwota bez wyjścia z pola, Ctrl+4; (c) „Nowa
  pożyczka”, „Nowy kontener”, „Nowy cel”, podział łupów – wpisz tekst, przejdź na inny ekran i wróć; (d) po (c) zmień
  folder i wróć, osobno uruchom ponownie.
- **Oczekiwany efekt:** (a) w folderze nie powstaje pusta operacja; (b) kwota zapisana; (c) tekst czeka po powrocie,
  pusty formularz ma dzisiejszą datę; (d) po zmianie folderu albo ponownym uruchomieniu formularze od nowa (T244).
- **Nie przechodzi, gdy:**
  - pusta operacja 0 zł na liście;
  - utracona kwota albo tekst formularza po zmianie ekranu.

#### DA.46 Format plików i nieznane pola (spec „Dane i synchronizacja”, CLAUDE.md „Dane”, E0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; z zewnątrz pole `x-audyt` w operacji, kontenerze
  i `fi.json`
- **Jak sprawdzić:** edytuj te wpisy i ustawienia; po zamknięciu przejrzyj zmienione pliki.
- **Oczekiwany efekt:** JSON z wcięciem 2 spacji i `\n` na końcu; `updatedAt` w UTC, `updatedBy` = nazwa komputera;
  nazwy plików z datą warszawską i ULID; kwoty całkowite w groszach; pole `x-audyt` zachowane; brak plików tymczasowych.
- **Nie przechodzi, gdy:**
  - utracone nieznane pole (K);
  - kwota ułamkowa albo plik tymczasowy po zamknięciu.

### US – Ustawienia

#### US.1 Zakładki Ustawień (spec „Ekrany” – Ustawienia, E0, T61)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** Ctrl+, i menu „Ustawienia”; kliknij każdą zakładkę; Esc.
- **Oczekiwany efekt:** zakładki: Okręt, Konta, Kategorie, Warstwy i rozkazy, Domownicy, Import z banku, ICTTJ,
  Powiadomienia i dźwięki, Wygląd i prywatność, Folder i kopie, Zasobnik i start, Aktualizacje – każda otwiera się bez
  błędu; przy ustawieniach tego komputera jest to powiedziane; Esc wraca na poprzedni ekran.
- **Nie przechodzi, gdy:**
  - zakładka pusta albo z błędem;
  - nie wiadomo, które ustawienia są wspólne, a które tylko tego komputera.

#### US.2 Nazwa okrętu (D1, spec „Założenia stałe”, B86, T34)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start
- **Jak sprawdzić:** zmień na „Żółw Gęślą Jaźń” (Enter); 40 znaków; 41 znaków; pusta; nowa nazwa i Esc; drugi komputer.
- **Oczekiwany efekt:** domyślnie „Flagowiec”; nowa nazwa w menu („okręt …”) i wszędzie, gdzie pada; polskie znaki; 40
  znaków mieści się bez psucia menu, 41. nie wchodzi; pusta – „Okręt musi mieć nazwę.” i zostaje poprzednia; Esc
  przywraca poprzednią i zostaje w Ustawieniach (B86); LAPTOP widzi nową nazwę.
- **Nie przechodzi, gdy:**
  - Esc zapisuje albo przenosi na inny ekran;
  - pusta nazwa zapisana.

#### US.3 Konta – dodanie, nazwa, rodzaj, archiwum (spec „Konta budżetu”, D68, E1, 0.3.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** „Konto” → nazwa „Konto oszczędnościowe”, rodzaj, „import CSV z mBanku”; nazwa istniejąca; pusta;
  „archiwum” przy koncie z operacjami; przywróć.
- **Oczekiwany efekt:** nowe konto od razu w szybkim wpisie, edytorze i filtrach; „Takie konto już jest.”, „Konto musi
  mieć nazwę.”; zarchiwizowane znika z wyboru w nowych operacjach, a jego operacje, saldo i warstwy zostają (suma warstw
  = saldo kont); przywrócenie oddaje je do wyboru.
- **Nie przechodzi, gdy:**
  - archiwum zmienia salda albo warstwy;
  - konto znika z dawnych operacji.

#### US.4 Konta – saldo otwarcia (D68, T25, E1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** start
- **Jak sprawdzić:** „Saldo otwarcia” z datą sprzed 10 dni; data jutrzejsza; saldo ujemne; zmiana kwoty; „Historia”.
- **Oczekiwany efekt:** „saldo teraz” = otwarcie + operacje od daty (odczyt → AU-9); jutro – „Saldo otwarcia nie może
  być z przyszłości.”; ujemne przyjęte; zmiana przelicza Mostek; wersja w historii.
- **Nie przechodzi, gdy:**
  - saldo liczy operacje sprzed daty otwarcia;
  - kwota 100× za duża.

#### US.5 Kategorie – nazwa, podkategoria, koperta (spec „Kategorie startowe”, D68, 0.3.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start
- **Jak sprawdzić:** „Jedzenie” → „Jedzenie i picie”; „podkategoria”; nazwa istniejąca; pusta; koperta „Rozrywka
  i hobby”: „codzienna” → „planowa” → „bez koperty”; wszystkie główne bez „codzienna”.
- **Oczekiwany efekt:** nowa nazwa także w dawnych operacjach i raportach; „Taka kategoria już jest.”, „Kategoria musi
  mieć nazwę.”; zmiana koperty przelicza przydział w Planie miesiąca i na Mostku (odczyt → AU-10); bez żadnej
  codziennej – ostrzeżenie, że „Energia dziś” będzie 0,00 zł.
- **Nie przechodzi, gdy:**
  - zmiana nazwy tworzy nową kategorię;
  - energia nie zmienia się po przełączeniu koperty.

#### US.6 Kategorie – archiwizacja i usuwanie nieużywanych (D95 N-PC-7, 1.15.2, N8)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start + kategoria „Testowa” bez operacji (z podkategorią)
  i kategoria z operacjami i kopertą w planie
- **Jak sprawdzić:** usuń „Testową” i jej podkategorię; spróbuj usunąć używaną; zarchiwizuj używaną („archiwizuj”),
  „Cofnij” w toaście; zarchiwizuj podkategorię „×”, przywróć „↺”; ponowne uruchomienie.
- **Oczekiwany efekt:** nieużywaną kategorię i podkategorię da się usunąć (znikają i nie wracają); używaną – tylko
  zarchiwizować, dawne operacje zachowują nazwę; archiwizacja z kopertą – toast „… jej koperta zniknęła z planu tego
  miesiąca i kolejnych.” z „Cofnij”, który oddaje kategorię i kopertę; koperta zarchiwizowanej nie liczy się do energii.
- **Nie przechodzi, gdy:**
  - nie ma usuwania nieużywanych (D95);
  - usunięcie używanej;
  - archiwizacja podkategorii bez „Cofnij”, choć główna je ma (spójność – UWAGA).

#### US.7 Warstwy – cele osłon i kadłuba, przyjęte koszty (spec „Warstwy”, D12, T61, 1.0.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok
- **Jak sprawdzić:** „Osłony – cel”: 3 → 4 → 0 → 25; „Kadłub – cel”: 6 → 9; „Przyjęte średnie koszty” wpisz i wyczyść;
  po każdej zmianie Mostek; LAPTOP.
- **Oczekiwany efekt:** domyślnie 3 pensje i 6 miesięcy; zmiana od razu przelicza cele warstw i zasięg (odczyty → AU-9);
  poza zakresem – „Cel osłon to od 1 do 24 pensji – zostaje poprzedni.”; cel poniżej minimalnych osłon – odmowa
  z wyjaśnieniem; ustawienia wspólne (LAPTOP je widzi).
- **Nie przechodzi, gdy:**
  - wartość spoza zakresu zapisana;
  - Mostek nie przelicza się bez ponownego uruchomienia.

#### US.8 Rozkazy (spec „Gra: Dowództwo” – rozkazy, D73, D84 C9, N73, 1.0.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** zmień „Minimalne osłony (pensje)” (także ponad cel), „Linia zanurzenia (% pensji)”, ciszę nocną,
  „Dziennik kapitański od kwoty”, firewall; otwórz Dowództwo, Ładownię, szybki wpis.
- **Oczekiwany efekt:** domyślnie 1 pensja, 40 %, 23:00–05:00, 200 zł, firewall włączony; minimum ponad cel – „Minimalne
  osłony nie mogą przekraczać celu osłon…”; Dowództwo pokazuje rozkazy do odczytu z odnośnikiem do Ustawień (D84 C9);
  zmiana działa od razu (linia w Ładowni, cisza w szybkim wpisie).
- **Nie przechodzi, gdy:**
  - zmiana nie działa bez ponownego uruchomienia;
  - Dowództwo i Ustawienia pokazują różne wartości.

#### US.9 Cisza nocna – przez północ i brzegi (spec „Szybki wpis”, D40, T56, T244, N104)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start
- **Jak sprawdzić:** cisza 22:00–02:00 i szybki wpis z godziną 01:30 i 02:00; cisza 01:00–06:00; od = do (23:00–23:00);
  wieczorne dopisanie 23:30 przy ciszy 23:00–05:00.
- **Oczekiwany efekt:** okno przez północ działa (01:30 wymaga potwierdzenia i krótkiego wpisu, 02:00 – nie, granica
  jasna); od = do – odmowa albo jasne znaczenie (brak wymagania); przy wieczornym w ciszy napis „w ciszy nocnej
  (23:00–05:00) – przyjdzie o 22:59”.
- **Nie przechodzi, gdy:**
  - cisza przez północ nie działa po północy;
  - od = do wyłącza aplikację z błędem albo cicho robi całodobową ciszę.

#### US.10 Próg dziennika kapitańskiego (D41, D84 C7, N32)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start
- **Jak sprawdzić:** próg 200 zł: wydatki 199,99 i 200,00 zł w szybkim wpisie i w edytorze operacji; próg 0 i pusty:
  wydatek 5 000 zł w obu miejscach.
- **Oczekiwany efekt:** „plan czy impuls?” od progu włącznie, tak samo w szybkim wpisie i edytorze; przy 0 nigdzie nie
  pyta (D84 C7).
- **Nie przechodzi, gdy:**
  - szybki wpis i edytor zachowują się różnie (N32).

#### US.11 Domownicy – osoby i nazwy w banku (D80, D81, 1.3.0, 1.4.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** „Domownik” → „Babcia Zosia”; „Nazwy w banku:” dodaj „ZOFIA KOWALSKA”, duplikat, usuń „×”;
  „Pieniądze przekazuje przez:”; „reszta wpłaty ponad to, co ma oddać:” – „pytaj” / „zaliczka” / „przychód”; puste imię;
  duplikat; „archiwum”.
- **Oczekiwany efekt:** osoba od razu w szybkim wpisie i edytorze („finansuje”); „Domownik musi mieć imię.”, „Taki
  domownik już jest.”; zarchiwizowana znika z wyborów, jej saldo i dawne operacje zostają; ustawienia wspólne dla
  folderu.
- **Nie przechodzi, gdy:**
  - archiwum zmienia saldo osoby albo dawne operacje;
  - duplikat nazwy w banku przyjęty dwa razy.

#### US.12 Domownicy – daty rozliczeń i saldo na start (D81, D91 d, N47, B3, 1.4.0, 1.12.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok
- **Jak sprawdzić:** „Rozliczenia od:” „od dziś”, potem „od startu budżetu”, potem data sprzed startu; „Na start
  rozliczeń:” „ma oddać” 150 zł; „Zwrot spłaca wskazany zakup od:” „od dziś”; odczytaj salda osób.
- **Oczekiwany efekt:** data sprzed startu – „Data sprzed startu budżetu – rozliczenia liczą się od startu (…)”; saldo
  osoby = saldo na start + zmiany od daty, liczone raz (odczyty → AU-10).
- **Nie przechodzi, gdy:**
  - zmiana daty liczy saldo drugi raz (B3).

#### US.13 ICTTJ – folder (D72, T62, E5, spec „Zasady odczytu”)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** start + fikstura ICTTJ; `FI_ICTJ_APPDATA` z ustawieniami
  ICTTJ (podpowiedź); sumy kontrolne ICTTJ
- **Jak sprawdzić:** zakładka ICTTJ: „Użyj tego folderu”; „Nie czytaj ICTTJ na tym komputerze”; „Wskaż folder…” → folder
  FI, pusty folder, folder ICTTJ; LAPTOP; sumy kontrolne po.
- **Oczekiwany efekt:** podpowiedź „ICTTJ na tym komputerze używa folderu …”; po wyborze status „czytany” i „Wypłaty: N,
  zwroty do masy: N, scenariusze prognozy: N.” zgodne z fiksturą; folder FI – „To folder danych Financial Intel – wskaż
  folder ICT Trade Journal.”; pusty – „… (brak pliku journal.json).”; LAPTOP bez folderu ICTTJ (ustawienie komputera);
  ICTTJ bajt w bajt bez zmian.
- **Nie przechodzi, gdy:**
  - jakikolwiek zapis w ICTTJ (K);
  - folder ICTTJ jednego komputera pojawia się na drugim.

#### US.14 ICTTJ – scenariusz i program .exe (D72, D84 C3, T130, E5)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start + fikstura ICTTJ z dwoma scenariuszami;
  `FI_ICTJ_LAUNCH` – atrapa
- **Jak sprawdzić:** „Scenariusz” – wybierz; zmień na drugi („Anuluj”, potem „Zmień scenariusz”); bez .exe „Otwórz
  ICTTJ” w menu bocznym; „Wskaż plik .exe…” → atrapa; „Otwórz ICTTJ”; „Zapomnij wybór”.
- **Oczekiwany efekt:** zmiana pyta z opisem skutku („Cele scenariusza „X” zostaną zarchiwizowane…”), „Anuluj” nic nie
  zmienia; bez .exe toast z odesłaniem do Ustawienia → ICTTJ; z atrapą – uruchomienie (zapis atrapy); scenariusz wspólny
  dla folderu, .exe tylko tego komputera.
- **Nie przechodzi, gdy:**
  - zmiana scenariusza bez pytania;
  - „Otwórz ICTTJ” milczy.

#### US.15 Import z banku – ustawienia (0.3.0, 1.6.3, F14, 1.9.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok; CSV z mBanku do `FI_DOWNLOADS_DIR`
- **Jak sprawdzić:** „Twoje nazwiska w banku” – dodaj, pusta, duplikat, usuń; wyłącz „Szukaj nowych plików z mBanku
  w folderze Pobrane” i wrzuć CSV; włącz; „pokazuj znowu”; „Rozłącz wszystkie” → „Cofnij”.
- **Oczekiwany efekt:** wyłączone – brak meldunku o pliku, włączone – meldunek „Nowy meldunek z mBanku”; pusta
  i duplikat – „Dodaj” wyłączony; „Cofnij” przywraca połączenia; przełącznik Pobranych tylko tego komputera.
- **Nie przechodzi, gdy:**
  - plik wykryty mimo wyłączenia;
  - „Cofnij” nie przywraca połączonych nazw.

#### US.16 Powiadomienia – lista przełączników (spec „Powiadomienia”, D47, D70, D84 C9, T56, 1.0.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start; zapis prób powiadomień
- **Jak sprawdzić:** Powiadomienia i dźwięki – porównaj listę z tabelą specyfikacji; wyłącz „Przekroczenie przydziału
  albo koperty” i przekrocz przydział; włącz i przekrocz kopertę; sprawdź `config.json` i `fi.json`.
- **Oczekiwany efekt:** każda pozycja tabeli ma przełącznik (odprawa, wieczorne, energia < 20 % / koperta > 80 %,
  przekroczenie, asteroida 14 i 3 dni, zaległy import po 3 dniach, salda w niedzielę, raport wachty i debriefing, ICTTJ)
  plus nowsze (kontener, raty, PIT-38, domownik, boje, salda kont, ładownia, anomalie, zwroty); domyślnie włączone;
  wyłączone – brak próby; zapis w `config.json` (ten komputer), nie w `fi.json`.
- **Nie przechodzi, gdy:**
  - brak przełącznika dla pozycji specyfikacji;
  - wyłączone i tak przychodzi;
  - brak godziny odprawy, którą zapowiada D84 C9 (wątpliwość – patrz raport).

#### US.17 Wieczorne dopisanie – godzina (spec „Wieczorne dopisanie”, T56, T244, F13, N104)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start z operacjami dziś; zapis prób powiadomień
- **Jak sprawdzić:** ustaw godzinę = teraz + 2 min, czekaj; Operacje; osobno: po wydatku z godziną po 18:00 albo „Dziś
  bez wydatków” ustaw godzinę ponownie na teraz + 2 min.
- **Oczekiwany efekt:** o tej godzinie próba „Raport wachty dnia” z liczbą dopisanych operacji, w Operacjach pasek
  „Raport wachty dnia” („Dopisz”, „Dziś bez wydatków”, „Przypomnij za 30 min”); po wydatku po 18:00 albo „Dziś bez
  wydatków” – bez przypomnienia.
- **Nie przechodzi, gdy:**
  - przypomnienie nie przychodzi o ustawionej godzinie;
  - przychodzi mimo potwierdzonego dnia.

#### US.18 Dźwięki – ustawienia (spec „Dźwięki”, D42, D70, T58)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start
- **Jak sprawdzić:** sprawdź wartości domyślne; „Głośność” przesuń i puść; wyłącz „Alarm”; „▶” przy zdarzeniu; wyłącz
  „Dźwięki zdarzeń”; ponowne uruchomienie; LAPTOP.
- **Oczekiwany efekt:** domyślnie włączone, głośność 30 %; zapis po puszczeniu suwaka (z próbką); przełącznik każdego
  zdarzenia (wpis, dokowanie, alarm, awans, „Miesiąc zamknięty na plus”); wszystko zostaje po ponownym uruchomieniu;
  LAPTOP ma własne (domyślne).
- **Nie przechodzi, gdy:**
  - ustawienie wraca do domyślnego po ponownym uruchomieniu.

#### US.19 Dźwięki – odsłuch (spec „Dźwięki”, D42, D70)
- **Kto:** Ty · **Ryzyko:** niskie · **Stan danych:** start
- **Jak sprawdzić:** „▶” przy każdym zdarzeniu na 30 % i 100 %; zapis operacji, alarm (przekroczenie); wyłączone
  zdarzenie.
- **Oczekiwany efekt:** każdy dźwięk słychać, różnią się, 30 % jest ciche, 100 % nie drażni; wyłączone milczy; DO
  OCENY – czy pasują do aplikacji.
- **Nie przechodzi, gdy:**
  - dźwięk mimo wyłączenia; trzaski, za głośno przy 30 %.

#### US.20 Skrót szybkiego wpisu – pole i AltGr (spec „Szybki wpis”, D46, D86, T190, B29, 1.5.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start
- **Jak sprawdzić:** „Skrót globalny” → „Naciśnij skrót…”: Ctrl+Alt+S, Ctrl+Alt+Shift+S, Ctrl+Alt+U, sam „B”,
  Ctrl+Shift+F9; w trakcie Esc; Backspace; F1.
- **Oczekiwany efekt:** Ctrl+Alt+S (także z Shift) i Ctrl+Alt+U odrzucone – „Ctrl+Alt+S to w polskim układzie AltGr+S
  („ś”)…”, pole słucha dalej; sam klawisz to nie skrót; Ctrl+Shift+F9 przyjęty ze stanem „działa” albo „zajęty…”; Esc
  anuluje zmianę; Backspace – „brak skrótu”; ściągawka pokazuje aktualny skrót.
- **Nie przechodzi, gdy:**
  - skrót z AltGr przyjęty;
  - ściągawka pokazuje stary skrót.

#### US.21 Skrót z AltGr zapisany wcześniej (T190, D86)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start; w `config.json` z zewnątrz skrót `Control+Alt+S`
- **Jak sprawdzić:** uruchom; ponownie uruchom.
- **Oczekiwany efekt:** skrót zamieniony na Ctrl+Alt+B, komunikat raz („Skrót szybkiego wpisu … zabierał polską literę
  (AltGr) …”), `config.json` poprawiony, wpis w logu; drugi start bez komunikatu.
- **Nie przechodzi, gdy:**
  - stary skrót zostaje albo komunikat przy każdym starcie.

#### US.22 Skrót zajęty przez inny program (T8, T54, T244, N37)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start; Twoja aplikacja w zasobniku trzyma Ctrl+Alt+B
- **Jak sprawdzić:** uruchom laboratorium z domyślnym skrótem; Ustawienia → Powiadomienia i dźwięki; F1; zmień skrót na
  wolny.
- **Oczekiwany efekt:** „zajęty przez inny program – wybierz inny niż Ctrl+Alt+B”; ściągawka ostrzega („… zmień go
  w Ustawieniach”); po zmianie „działa”.
- **Nie przechodzi, gdy:**
  - „działa” mimo nieudanej rejestracji.

#### US.23 Wygląd – rozmiar i wyższy kontrast (F30, T259, 1.6.6)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start; potem `config.json` z `zoom` 1,23 i osobno 3
- **Jak sprawdzić:** suwak „Rozmiar interfejsu” 90 → 150 % (puść); „100 %”; „Wyższy kontrast” – zmierz kontrast
  przygaszonych napisów na panelu i najmniejszy rozmiar czcionki; ponowne uruchomienie; wartości z `config.json`.
- **Oczekiwany efekt:** rozmiar zmienia się po puszczeniu suwaka we wszystkich oknach (główne, szybki wpis, panel
  odłączony); kontrast przygaszonych ≥ 4,5:1, najmniejsze napisy 12 px; po ponownym uruchomieniu zostaje; 1,23 → 120 %,
  3 → 150 %; domyślnie 100 % i kontrast wyłączony.
- **Nie przechodzi, gdy:**
  - szybki wpis albo panel odłączony w innym rozmiarze;
  - wartość spoza zakresu psuje okno.

#### US.24 Ukrycie kwot po bezczynności i przy starcie (F40, D30, T260, T261, T271, 1.6.6)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok; `FI_SYSTEM_IDLE`, `FI_IDLE_CHECK_MS`
- **Jak sprawdzić:** „Ukryj po bezczynności” „po 1 min”; bezczynność 61 s; „Pokaż na 5 min” (czekaj 5 min); „do końca
  sesji” i ponowna bezczynność; Ctrl+$; „Startuj z ukrytymi kwotami” + ponowne uruchomienie; `hideIdleMin` 7
  w `config.json`.
- **Oczekiwany efekt:** po progu „•••” we wszystkich oknach i w dymku (tekst dymku); pasek „Kwoty ukryte · Pokaż na 5
  min · do końca sesji”; po 5 min znowu ukryte; „do końca sesji” – bezczynność nie ukrywa do zamknięcia; Ctrl+$ kończy
  pokazanie; start z ukrytymi; lista pokazuje „7 min” bez zmiany na inną; bez hasła (to nie blokada).
- **Nie przechodzi, gdy:**
  - choć jedna kwota widoczna po ukryciu;
  - „Pokaż na 5 min” przepada od razu (T271).

#### US.25 Ukrycie kwot – prawdziwa bezczynność i blokada ekranu (F40, T260)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start; zegar dowolny
- **Jak sprawdzić:** „po 1 min”; nie ruszaj myszą 70 s; pokaż kwoty; Win+L i odblokuj; dymek zasobnika.
- **Oczekiwany efekt:** po minucie kwoty ukryte w oknie i dymku; po Win+L ukryte od razu po odblokowaniu (także po „do
  końca sesji”).
- **Nie przechodzi, gdy:**
  - kwoty widoczne po bezczynności albo po blokadzie.

#### US.26 Zasobnik i start – zamykanie do zasobnika (D64, T251, N98)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start (start z Windows – tylko Maszyna, SY.12)
- **Jak sprawdzić:** „Zamykaj do zasobnika” włączone – X; wyłącz – X (ze zmianą w polu); Aktualizacje – opis instalacji
  w obu stanach; ponowne uruchomienie.
- **Oczekiwany efekt:** domyślnie włączone; X chowa okno, proces działa; wyłączone – X kończy aplikację po zapisie
  zmian; opis instalacji aktualizacji zgodny z trybem („po „Zakończ” w menu ikony…” albo „po zamknięciu aplikacji”);
  ustawienie zostaje.
- **Nie przechodzi, gdy:**
  - X kończy aplikację mimo włączonego zasobnika albo gubi zmianę.

#### US.27 Folder i kopie – zakładka (E0, 1.4.3, 1.6.5)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok; `FI_MACHINE_NAME` DOM-PC
- **Jak sprawdzić:** odczytaj „Bieżący folder danych”, „Format danych”, „Wersja aplikacji”, „Ten komputer”, „Wczytanie”,
  opis kopii; „Pokaż w Eksploratorze”; „Przeskanuj”; „Eksport: ZIP całego folderu…”.
- **Oczekiwany efekt:** wersja 1.15.4, komputer DOM-PC; opis kopii zgodny z D84 C4 (14 dziennych, 8 tygodniowych, 10
  przed importem, przed migracją); „Przeskanowano folder.”; ZIP eksportu z historią zmian i datą warszawską w nazwie;
  lista kopii z rodzajem i datą, przy każdej „Odzyskaj…”.
- **Nie przechodzi, gdy:**
  - opis kopii niezgodny z działaniem (DA.9–DA.13).

#### US.28 Aktualizacje – zakładka w laboratorium (D61, 0.1.0, 1.7.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start; `FI_UPDATE_URL` – adres nieosiągalny
- **Jak sprawdzić:** odczytaj „Ta wersja” i tryb; „Sprawdź teraz”; przełączniki „Sprawdzaj automatycznie…”, „Pobieraj
  w tle…”; panel „Co nowego”; ponowne uruchomienie.
- **Oczekiwany efekt:** 1.15.4; przy braku połączenia zrozumiały komunikat („Brak połączenia z GitHubem (praca
  offline?)…”), aplikacja działa; przełączniki zostają; „Co nowego” z sekcją 1.15.4 albo „Brak opisu zmian.” bez błędu.
- **Nie przechodzi, gdy:**
  - błąd techniczny albo komunikaty co chwilę.

#### US.29 Token GitHub (D61, T258)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start
- **Jak sprawdzić:** w „Dostęp do prywatnego repozytorium (ten komputer)” wpisz fikcyjny `github_pat_TEST…`, „Zapisz
  i sprawdź”; przeszukaj `config.json` i folder danych; „Usuń token”.
- **Oczekiwany efekt:** „zapisany …” z „zaszyfrowany”; tokenu nie ma jawnym tekstem w `config.json` ani w folderze
  danych; błędny token – komunikat o tokenie albo o sieci; po „Usuń token” – „brak”.
- **Nie przechodzi, gdy:**
  - token jawnym tekstem w pliku;
  - token w `fi.json` (trafiłby na OneDrive).

#### US.30 Trwałość po ponownym uruchomieniu i podział komputer / folder (spec „Dane i synchronizacja”, T53, T61, T12)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; DOM-PC i LAPTOP
- **Jak sprawdzić:** na DOM-PC zmień po jednym ustawieniu w każdej zakładce (bez autostartu); „Zakończ”; uruchom DOM-PC;
  uruchom LAPTOP na tym folderze.
- **Oczekiwany efekt:** na DOM-PC wszystko zostaje; na LAPTOP widać ustawienia folderu (okręt, konta, kategorie, warstwy
  i rozkazy, domownicy, reguły importu, scenariusz ICTTJ, zapisane układy), a ustawienia komputera są domyślne
  (powiadomienia, dźwięki, skrót, wygląd, ukrycie kwot, folder ICTTJ i .exe, folder kopii, Pobrane, zasobnik,
  aktualizacje, token).
- **Nie przechodzi, gdy:**
  - jakieś ustawienie wraca do domyślnego po ponownym uruchomieniu;
  - ustawienie komputera wędruje na drugi komputer albo folderowe nie wędruje.

#### US.31 Ustawienia w folderze tylko do odczytu (T194, 1.5.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok z `fi.json` `schemaVersion: 2`
- **Jak sprawdzić:** przejdź po zakładkach, spróbuj zmienić ustawienie budżetu i ustawienie komputera.
- **Oczekiwany efekt:** „Folder jest tylko do odczytu – ustawienia budżetu można tylko oglądać.”; pola budżetu
  wyłączone; ustawienia komputera działają.
- **Nie przechodzi, gdy:**
  - zmiana budżetu udaje sukces;
  - ustawienia komputera też zablokowane.

#### US.32 Pola Ustawień – Enter, Esc, wyjście z pola (T34, B24, B86)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start
- **Jak sprawdzić:** w polach: nazwa konta, kategorii, domownika, „Osłony – cel”, „Saldo otwarcia”, „Cisza od” – wpisz
  i Esc; wpisz i Enter; wpisz i Ctrl+2.
- **Oczekiwany efekt:** Esc cofa wpis i zostawia w Ustawieniach; Enter i wyjście z pola zapisują; zmiana ekranu nie gubi
  wpisu; tak samo w każdym polu.
- **Nie przechodzi, gdy:**
  - Esc zapisuje albo przenosi na poprzedni ekran (B86);
  - wpis ginie przy zmianie ekranu.

#### US.33 Ustawienia komputera – plik nieczytelny albo uszkodzony (T250, B114, 1.6.5)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** start; (a) `config.json` z niepoprawnym JSON; (b) poprawny,
  ale zablokowany na wyłączność
- **Jak sprawdzić:** (a) uruchom; (b) uruchom, zmień rozmiar interfejsu, po 30 s zwolnij plik, czekaj 30 s.
- **Oczekiwany efekt:** (a) plik odsunięty jako `config.uszkodzony-<czas>.json`, start z domyślnymi; (b) start
  z domyślnymi tylko w pamięci, plik nie nadpisany; po zwolnieniu wraca folder danych, skrót i reszta, a zmiana rozmiaru
  dochodzi do pliku.
- **Nie przechodzi, gdy:**
  - `config.json` nadpisany domyślnymi – znika folder danych, autostart, token (K).

### IN – interfejs

#### IN.1 Menu boczne (D44, D65, spec „Ekrany”, E0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** odczytaj pozycje i liczniki; kliknij każdą; porównaj liczniki z Meldunkami i Synchronizacją.
- **Oczekiwany efekt:** Mostek, Operacje, Import, Plan miesiąca, Ładownia, Mapa gwiezdna, Radar, Dowództwo, Wywiad,
  Raporty, potem Meldunki, „Otwórz ICTTJ”, Synchronizacja, Ustawienia, „? skróty”; każdy ekran się otwiera, aktywny
  wyróżniony; liczniki = liczba spraw; nic przygaszonego z dopiskiem etapu (D65 – wszystkie etapy gotowe).
- **Nie przechodzi, gdy:**
  - licznik niezgodny z listą;
  - pozycja prowadzi do pustego albo złego ekranu.

#### IN.2 Skróty ekranów i „wstecz” (T21, E0, 0.1.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** Ctrl+1…9 i Ctrl+0, Ctrl+, , Ctrl+Shift+Y, Ctrl+Shift+M – z każdego ekranu i z fokusem w polu
  tekstowym; Esc i przycisk myszy „wstecz” w Ustawieniach, Synchronizacji i Meldunkach.
- **Oczekiwany efekt:** Ctrl+1…0 w kolejności menu (Ctrl+0 – Raporty), Ctrl+, Ustawienia, Ctrl+Shift+Y Synchronizacja,
  Ctrl+Shift+M Meldunki; z pola skrót działa, a cyfra nie trafia do pola (brak wymagania); Esc i „wstecz” wracają na
  poprzedni ekran.
- **Nie przechodzi, gdy:**
  - skrót prowadzi gdzie indziej niż mówi ściągawka;
  - skrót w polu wpisuje znak i zmienia ekran.

#### IN.3 Ctrl+N z każdego ekranu (T239, B64, 1.6.4)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok; Operacje na poprzednim miesiącu z filtrem kategorii
- **Jak sprawdzić:** Ctrl+N na każdym ekranie, w Ustawieniach, Synchronizacji, Meldunkach; przy otwartej palecie
  i oknie; dopisz wydatek; sprawdź filtr („mój filtr”).
- **Oczekiwany efekt:** Operacje z nowym wpisem z dzisiejszą datą; nad paletą i oknem nic się nie dzieje; nowa operacja
  widoczna mimo okresu i filtra, a zapisany filtr nienaruszony.
- **Nie przechodzi, gdy:**
  - Ctrl+N działa tylko w Operacjach (B64);
  - nowa operacja niewidoczna albo zapisany filtr skasowany.

#### IN.4 Ctrl+S i „Zapisz teraz” (T247, T253, N62, 1.6.5)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok; osobno tylko do odczytu i czekająca decyzja z DA.44
- **Jak sprawdzić:** zmień pole, Ctrl+S; paleta „Zapisz teraz”; to samo w trybie tylko do odczytu i przy czekającej
  decyzji.
- **Oczekiwany efekt:** „Zapisano.” tylko po udanym zapisie, wskaźnik „zapisano GG:MM:SS”; tylko do odczytu – bez
  „Zapisano.”, z informacją; czekająca decyzja – otwiera okno decyzji; Ctrl+S i paleta działają tak samo.
- **Nie przechodzi, gdy:**
  - „Zapisano.” przy nieudanym zapisie;
  - paleta pomija pytanie, które zadaje Ctrl+S (N62).

#### IN.5 Ctrl+$ – ukrycie kwot wszędzie (D30, T55, D73, B7, B61, 1.0.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok + konflikt z kwotą i otwarty podgląd odzyskania
- **Jak sprawdzić:** Ctrl+$ (i Ctrl+Shift+4); przejdź po ekranach, Historii, Synchronizacji, oknie zmian, odzyskaniu,
  palecie (szukanie po kwocie), szybkim wpisie, panelu odłączonym; tooltip zasobnika i zapis prób powiadomień; edytuj
  pole kwoty; eksport CSV; ponowne uruchomienie.
- **Oczekiwany efekt:** toast „Kwoty ukryte (Ctrl+$ pokazuje).”; wszędzie „•••” (szybki wpis „••• zł”); pole kwoty
  pokazuje liczbę tylko w edycji; eksport z prawdziwymi kwotami (D73); stan zostaje po ponownym uruchomieniu; drugi
  Ctrl+$ – „Kwoty widoczne.”
- **Nie przechodzi, gdy:**
  - którakolwiek kwota widoczna (Historia, konflikt, tytuł wpisu, dymek, powiadomienie).

#### IN.6 Rozmiar – Ctrl+Plus / Ctrl+Minus / Ctrl+Shift+0 (F30, T259, 1.6.6, 1.10.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start
- **Jak sprawdzić:** Ctrl+Plus ×7, Ctrl+Minus ×8, Ctrl+Shift+0, Ctrl+=, plus z klawiatury numerycznej; to samo w szybkim
  wpisie; Ctrl+0.
- **Oczekiwany efekt:** krok 10 %, granice 90 i 150 %, Ctrl+Shift+0 – 100 %, Ctrl+0 – Raporty (nie reset); wszystkie
  okna razem, jedno naciśnięcie = jeden krok; suwak w Ustawieniach pokazuje wartość.
- **Nie przechodzi, gdy:**
  - okna w różnych rozmiarach;
  - kilka kroków na jedno naciśnięcie.

#### IN.7 Paleta – polecenia (spec „Ekrany”, T21, E0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** Ctrl+K i przycisk „Komendy”; wpisz „ladownia”, „kopia”, „zapisz”, „ukryj”, „xyz”; strzałki, Enter,
  Esc.
- **Oczekiwany efekt:** polecenia: ekrany, akcje (m.in. „Nowa operacja”, „Szybki wpis (okno nad wszystkimi)”, „Kopia
  zapasowa teraz”, „Zapisz teraz”, „Otwórz folder logów”, „Sprawdź aktualizacje”), zakładki Ustawień, układ strony;
  szukanie bez polskich znaków; Enter wykonuje; „Nic nie znaleziono.”; Esc zamyka i oddaje fokus.
- **Nie przechodzi, gdy:**
  - polecenie nie działa albo prowadzi gdzie indziej;
  - „ladownia” nie znajduje „Ładownia”.

#### IN.8 Paleta – wyszukiwanie wpisów (F19, T268, 1.7.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** wpisz kontrahenta bez polskich znaków, kwotę „1240” i „12,50”, nazwę kontenera, celu, pożyczki,
  domownika, „cisza nocna”; Enter przy każdym.
- **Oczekiwany efekt:** grupy „Operacje” (do 30 najnowszych), „Ładownia”, „Cele”, „Pożyczki”, „Domownicy”, „Ustawienia”
  (po 10); sama kwota nie szuka ustawień; wybrany wpis otwiera się na swoim ekranie z wyróżnieniem (ok. 2 s), operacja
  rozwinięta w Operacjach; „cisza nocna” → Warstwy i rozkazy.
- **Nie przechodzi, gdy:**
  - wpis istnieje, a paleta go nie znajduje;
  - Enter otwiera ekran bez wskazania wpisu.

#### IN.9 Panele – zwijanie, powiększanie, ukrywanie, rozmiar (spec „Ekrany”, E0, 0.1.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** na Mostku: „Zwiń panel” i dwuklik tytułu; „Powiększ na całe okno”, Esc; „Ukryj panel…”, przywróć
  w menu „Układ” („· 1 ukr.”); przeciągnij wysokość i szerokość, ↑↓, Shift, Home; ponowne uruchomienie.
- **Oczekiwany efekt:** każda akcja działa i jest odwracalna; stan zostaje po ponownym uruchomieniu (ten komputer).
- **Nie przechodzi, gdy:**
  - ukrytego panelu nie da się przywrócić;
  - układ ginie po ponownym uruchomieniu.

#### IN.10 Zapisane układy (spec „Ekrany”, E0, N61, T255)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok; LAPTOP; osobno tylko do odczytu
- **Jak sprawdzić:** menu „Układ”: „Zapisz bieżący” jako „Duży wykres”; zmień układ; „Użyj tego układu”; „Nadpisz”;
  „Nazwa”; „Usuń układ”; „Domyślny układ tej strony” i „… wszystkich stron”; LAPTOP; tylko do odczytu; kreator.
- **Oczekiwany efekt:** układy w folderze danych – LAPTOP je widzi; przywrócenie domyślnego; toasty „Układ „Duży
  wykres”.”; tylko do odczytu – „Folder tylko do odczytu – nowych układów nie zapiszesz.”; polskie nazwy stron; na
  kreatorze brak menu „Układ”.
- **Nie przechodzi, gdy:**
  - zapisany układ nie wraca;
  - identyfikator strony zamiast nazwy (N61).

#### IN.11 Panele odłączone (D45, T60, T200, B27, 1.0.0, 1.5.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** na Mostku „Otwórz w osobnym oknie (pełny ekran)” przy „Stan okrętu”, „Koperty”, „Odprawa”;
  w głównym oknie przejdź do Operacji i dodaj wydatek; kliknij pozycję w oknie odłączonym; F11; Ctrl+$; „Przywróć do
  aplikacji”; zamknij okno odłączone; zamknij główne.
- **Oczekiwany efekt:** okno „<panel> – Financial Intel”; liczby odświeżają się po wydatku mimo innego ekranu w głównym;
  kliknięcie prowadzi główne okno; w głównym „Otwarte w osobnym oknie.” z „Pokaż okno” / „Przywróć tutaj”; maska
  i rozmiar jak w głównym; zamknięcie odłączonego oddaje panel; zamknięcie głównego zamyka odłączone.
- **Nie przechodzi, gdy:**
  - okno odłączone zamiera po wyjściu z Mostka (B27);
  - kwoty w nim widoczne przy Ctrl+$.

#### IN.12 Drugi monitor (D45, T193, B54)
- **Kto:** Ty · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** panel odłączony na drugim monitorze przez noc (aplikacja w zasobniku); rano odczytaj; przenieś okno
  główne na drugi monitor, zakończ, odłącz monitor, uruchom.
- **Oczekiwany efekt:** panel odłączony pokazuje dane nowego dnia; okno zapamiętane na odłączonym monitorze otwiera się
  na ekranie (wyśrodkowane, nie większe niż ekran).
- **Nie przechodzi, gdy:**
  - okno poza ekranem;
  - panel pokazuje wczorajsze liczby.

#### IN.13 Ściągawka F1 i słowniczek (E0, T244, N37, 1.6.4, 1.10.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** F1, „?”, „? skróty” w menu; przy zmienionym i zajętym skrócie szybkiego wpisu; „?” w nagłówku
  panelu; Esc.
- **Oczekiwany efekt:** „Skróty klawiszowe i słowniczek”; każdy skrót z listy działa jak opisano (IN.2–IN.6); szybki
  wpis – ustawiony skrót albo „brak skrótu”, przy zajętym ostrzeżenie; „Słowniczek okrętu” – metafora z prawdziwą nazwą
  (Osłony = bufor na pensje, Kadłub = fundusz awaryjny…), te same opisy w „?” paneli.
- **Nie przechodzi, gdy:**
  - ściągawka podaje stały „Ctrl Alt B” (N37);
  - skrót z listy nie działa.

#### IN.14 Okna modalne – Esc, Enter, stos (T196, CLAUDE.md „Konwencje”)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** otwórz Historię z okna „Zmiany z drugiego komputera” (okno w oknie), Esc; potwierdzenia („Usuń na
  pewno”, „Zmień scenariusz”, „Do Kosza na pewno”) – Esc, Enter, kliknięcie obok; fokus po zamknięciu.
- **Oczekiwany efekt:** Esc zamyka tylko wierzchnie okno; okno z okna przykrywa całą aplikację; Esc nigdy nie wykonuje
  akcji; potwierdzenie usunięcia wymaga świadomego kliknięcia albo Enter na przycisku z fokusem; fokus wraca do miejsca
  wywołania (brak wymagania).
- **Nie przechodzi, gdy:**
  - Esc zamyka dwa okna albo wykonuje akcję;
  - fokus ginie.

#### IN.15 Esc i Enter w polach ekranów budżetu (T34, T144, B24, 1.4.3)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** w edytorze operacji (kwota, data, godzina, kontrahent, notatka), w Planie miesiąca (koperta),
  Ładowni (kwota kontenera), Mapie gwiezdnej (kwota celu) – wpisz i Esc; wpisz i Enter.
- **Oczekiwany efekt:** Esc przywraca wartość sprzed edycji i nic nie zapisuje; Enter zapisuje; wszędzie tak samo.
- **Nie przechodzi, gdy:**
  - Esc zapisuje wpisaną wartość (B24);
  - moduły różnią się zachowaniem.

#### IN.16 Puste stany (spec „Ekrany”, E0, N23, brak wymagania co do treści)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** pusty po wyborze folderu (przed kreatorem) i start
- **Jak sprawdzić:** odwiedź każdy ekran i panel, także Meldunki, Synchronizację, Dziennik zmian, Usunięte wpisy,
  Raporty, Wywiad, listę kopii, Konta bez kont dodatkowych.
- **Oczekiwany efekt:** pusty panel mówi po polsku, czego brak i co zrobić (przycisk albo odnośnik); bez „NaN”,
  „undefined”, „Invalid Date”, pustych wykresów bez opisu; baner „Budżet jeszcze nie wystartował…” z „Kreator startu”
  tylko przed startem.
- **Nie przechodzi, gdy:**
  - panel pusty bez słowa albo z błędnym tekstem;
  - „0,00 zł” udaje dane tam, gdzie danych nie ma.

#### IN.17 Długie nazwy i polskie znaki (plan audytu oś 3)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** brzegi – nazwy 40 znaków, „Żółć Gęślą Jaźń”, kontrahent 120
  znaków, kwoty ≥ 1 000 000 zł
- **Jak sprawdzić:** zrzuty Mostka, Operacji, Planu, Ładowni, Radaru, menu, palety, szybkiego wpisu; zapis prób
  powiadomień; tooltip zasobnika.
- **Oczekiwany efekt:** tekst ucięty z „…” albo zawinięty, bez nachodzenia na kwoty i przyciski; polskie znaki poprawne
  wszędzie; duże kwoty mieszczą się w kolumnach.
- **Nie przechodzi, gdy:**
  - tekst zasłania kwotę albo przycisk;
  - krzaki zamiast polskich znaków.

#### IN.18 Komunikaty błędów użytkownika i systemu (CLAUDE.md „Konwencje”, T140, brak wymagania co do treści)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** brzegi
- **Jak sprawdzić:** w polach: kwota „abc”, „12,345”, data 31.02, godzina 25:00, pusta nazwa, ujemny cel; zbierz
  komunikaty z DA (folder niedostępny, plik zablokowany, nowsza wersja).
- **Oczekiwany efekt:** komunikat po polsku mówi, co jest źle i co zrobić, przy polu albo w toaście; bez kodów
  systemowych (ENOENT, EPERM), stosu i „Error:”; błędna wartość się nie zapisuje.
- **Nie przechodzi, gdy:**
  - komunikat po angielsku albo techniczny;
  - błędna wartość zapisana.

#### IN.19 Banery (E0, 1.5.3, 1.6.5, T251, N23)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** różne – pusty, rok na LAPTOP (autostart – wybrać „Nie”), tylko
  do odczytu, folder niedostępny, inny komputer w użyciu, migracja, konflikt, `lastRunVersion` 1.15.3 w `config.json`
- **Jak sprawdzić:** wywołaj każdy baner, potem kilka naraz; „×” (Ukryj); rozwiąż sprawę.
- **Oczekiwany efekt:** każdy ma jasny tekst i działanie; kilka banerów jeden pod drugim bez zasłaniania treści; po
  rozwiązaniu sprawy baner znika sam; ukryty nie wraca do czasu nowej sprawy (brak wymagania).
- **Nie przechodzi, gdy:**
  - baner zasłania przyciski ekranu;
  - baner zostaje po rozwiązaniu sprawy.

#### IN.20 Terminy i metafora z prawdziwą nazwą i kwotą (D34, D3, T254, N31, N72, 1.6.6)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok
- **Jak sprawdzić:** zbierz teksty Mostka, alarmów odprawy, Planu miesiąca, Ładowni, kreatora, Dowództwa, Wywiadu,
  tooltipu zasobnika, powiadomień (zapis prób), raportów i PDF.
- **Oczekiwany efekt:** każda metafora z prawdziwą nazwą i kwotą obok („Osłony · bufor 8 640 zł”, „Pensja z kadłuba
  (funduszu awaryjnego)”); jedna nazwa na jedną rzecz („Ładownia (kontenery i opłaty okresowe)”, „Zaakceptuj nowsze”);
  terminy ICT po angielsku (Daily Bias, FVG, BOS, CHoCH, Killzones), reszta po polsku; słowo „firma” nie występuje.
- **Nie przechodzi, gdy:**
  - metafora bez prawdziwej nazwy albo kwoty;
  - ta sama rzecz pod dwiema nazwami.

#### IN.21 Polszczyzna – odmiana, kwoty, daty (N33, N53, T254, 1.6.6)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** brzegi – liczności 1, 2, 5, 12, 22, 25
- **Jak sprawdzić:** zbierz teksty z liczbami (operacje, wpisy, dni, pliki, kopie, konflikty, meldunki), kwoty dodatnie,
  ujemne i ≥ 1 000 000, daty na ekranach i w toastach.
- **Oczekiwany efekt:** „1 operacja”, „2 operacje”, „5 operacji”, „22 operacje”; kwoty „1 234,56 zł” (spacja tysięcy,
  przecinek, minus „−”); daty „18.10.2026”; bez literówek i angielskich słów poza ICT.
- **Nie przechodzi, gdy:**
  - „2 operacji”, „1234.56”, „2026-10-18” w interfejsie.

#### IN.22 Wygląd – tokeny ICTTJ (D33, spec „Założenia stałe”, CLAUDE.md „Konwencje”, E0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start
- **Jak sprawdzić:** odczytaj style obliczone tła, paneli, linii, tekstu, akcentu, plusa i minusa oraz font kwot
  (`.num`); porównaj z `C:\CC-Projekty\TradingJournal\src\renderer\styles\index.css`.
- **Oczekiwany efekt:** te same wartości co w ICTTJ (tło `#0b0d10`, panel `#111418`, podniesione `#161b21`, linia
  `#1e232a`, tekst `#c3cbd4` / `#e8edf2`, przygaszony `#7a838e`, akcent `#e8a33d`, plus `#2ebd85`, minus `#f6465d`);
  kwoty w JetBrains Mono z cyframi tabelarycznymi; linie 1 px.
- **Nie przechodzi, gdy:**
  - wartość inna niż w ICTTJ bez decyzji.

#### IN.23 Jeden akcent, zieleń i czerwień tylko dla kwot, bez gradientów i cieni (CLAUDE.md, D68, N60, T258)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok + brzegi
- **Jak sprawdzić:** w DOM znajdź elementy w kolorze plusa i minusa i sprawdź, czy to kwoty; style `box-shadow`
  i gradientów; zrzuty Mostka, Operacji, Planu, Dowództwa, Wywiadu.
- **Oczekiwany efekt:** wpływy zielone z „+”, wydatki bez koloru z „−”, zwrot towaru zielony, czerwień – przekroczenia
  i alarmy (D68); Bearish i zaległości w akcencie; poza tym jeden akcent; bez cieni i gradientów.
- **Nie przechodzi, gdy:**
  - zieleń albo czerwień na tekście bez kwoty;
  - cień albo gradient w interfejsie.

#### IN.24 Animacje (spec „Animacje”, D42, CLAUDE.md „Konwencje”)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** odczytaj czasy przejść i animacji przycisków, paneli, menu, toastów i okien; zdarzenia: dokowanie,
  awans, „Miesiąc zamknięty na plus” (z AU-5 / AU-10).
- **Oczekiwany efekt:** zwykły interfejs 120–160 ms; dłużej tylko przy zdarzeniach, bez efekciarstwa; nic nie animuje
  się w pętli.
- **Nie przechodzi, gdy:**
  - przejście poza 120–160 ms bez zdarzenia;
  - animacja w pętli.

#### IN.25 Wygląd wobec ICTTJ i ton – ocena (D33, D34, spec „Kryteria sukcesu”)
- **Kto:** Ty · **Ryzyko:** niskie · **Stan danych:** rok; zrzuty z `C:\FI-audyt\zrzuty\` i ICTTJ obok
- **Jak sprawdzić:** porównaj Mostek, Operacje, Ustawienia, paletę i panele z ICTTJ; wieczorem przy zwykłym i wyższym
  kontraście.
- **Oczekiwany efekt:** ta sama rodzina wizualna (kolory, fonty, panele z nagłówkiem, paleta), menu boczne jako jedyna
  świadoma różnica (D44); czytelne wieczorem; „otwiera się z przyjemnością” – DO OCENY.
- **Nie przechodzi, gdy:**
  - DO OCENY.

#### IN.26 „Co nowego” po aktualizacji (0.1.0, 1.7.0, wydanie.md)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start; `config.json` z `lastRunVersion` „1.15.3” (z zewnątrz)
- **Jak sprawdzić:** uruchom; baner; „Co nowego”; „×”; ponowne uruchomienie.
- **Oczekiwany efekt:** baner „Zaktualizowano do wersji 1.15.4.” z „Co nowego” → Ustawienia → Aktualizacje, panel „Co
  nowego w wersji 1.15.4 (ta wersja)” z sekcją 1.15.4 po polsku (bez dostępu do GitHuba – zrozumiała informacja); po „×”
  i ponownym uruchomieniu baner nie wraca.
- **Nie przechodzi, gdy:**
  - baner wraca przy każdym starcie;
  - panel pusty bez wyjaśnienia.

#### IN.27 Wskaźnik zapisu (E0, CLAUDE.md „Konwencje” – autozapis, brak wymagania co do treści)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** obserwuj wskaźnik przy edycji, w trybie tylko do odczytu i przy niedostępnym folderze (DA.40);
  kliknij „błąd zapisu – ponów”.
- **Oczekiwany efekt:** „zapisywanie…” → „zapisano GG:MM:SS”; „tylko odczyt”; „błąd zapisu – ponów” ponawia zapis po
  powrocie folderu.
- **Nie przechodzi, gdy:**
  - „zapisano” przy nieudanym zapisie.

#### IN.28 Klawiatura bez myszy (plan audytu oś 6, brak wymagania)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok
- **Jak sprawdzić:** Tab przez Ustawienia, paletę, okna modalne, panele i menu boczne; Spacja na przełącznikach.
- **Oczekiwany efekt:** każdy przycisk osiągalny Tabem w logicznej kolejności, fokus widoczny; przełączniki działają
  Spacją.
- **Nie przechodzi, gdy:**
  - element nieosiągalny z klawiatury albo fokus niewidoczny.

### SY – system Windows

#### SY.1 Pliki wydania i sumy SHA-256 (D50, T13, E0, wydanie.md)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `C:\FI-audyt\wydanie\`
- **Jak sprawdzić:** policz SHA-256 Setup i portable 1.15.4 oraz Setup 1.15.3; porównaj z `SHA256SUMS.txt` wydań;
  odczytaj wersję rozpakowanej aplikacji.
- **Oczekiwany efekt:** sumy zgodne; nazwy `Financial-Intel-Setup.exe` i `Financial-Intel-portable.exe`; Ustawienia →
  Aktualizacje „1.15.4”.
- **Nie przechodzi, gdy:**
  - suma niezgodna albo brak pliku w wydaniu.

#### SY.2 Instalacja 1.15.3 na czystym Windows (E0 „Gotowe, gdy”, D50)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** pusty; zegar: dzień M0 (dzień roboczy), przed 20:00
- **Jak sprawdzić:** pobierz Setup 1.15.3 z GitHub Releases, sprawdź SHA-256, uruchom; menu Start; uruchom aplikację;
  Ustawienia → Aktualizacje.
- **Oczekiwany efekt:** instalacja bez błędów, „Financial Intel” w menu Start z ikoną; aplikacja startuje; „Ta wersja
  1.15.3”, „wersja zainstalowana – …”.
- **Nie przechodzi, gdy:**
  - instalator przerywa się albo aplikacja nie startuje.

#### SY.3 Pierwsze uruchomienie i kreator na świeżym Windows (D62, D64, T251, spec „Kreator startu”)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** pusty, Windows bez skonfigurowanego OneDrive; zegar jak SY.2
- **Jak sprawdzić:** ekran wyboru folderu; przycisk propozycji; kreator do końca na danych z instrukcji maszyny;
  w ostatnim kroku zostaw zaproponowany start z Windows; Ctrl+Alt+B.
- **Oczekiwany efekt:** „Utwórz w Dokumentach – OneDrive nie jest skonfigurowany na tym komputerze” →
  `Dokumenty\FinancialIntel`; kreator kończy się działającym budżetem; start z Windows proponowany jako włączony;
  Ctrl+Alt+B działa od razu.
- **Nie przechodzi, gdy:**
  - propozycja w nieistniejącym OneDrive;
  - kreator nie kończy się albo skrót nie działa.

#### SY.4 Aktualizacja 1.15.3 → 1.15.4 przez „Uruchom ponownie teraz” (D50, D61, D84 C6, 0.1.0)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** start (po SY.3); sieć; zegar: dzień M0
- **Jak sprawdzić:** sumy kontrolne folderu danych i kopia `config.json`; okno otwarte – czekaj ok. 15 s albo „Sprawdź
  teraz”; obserwuj statusy i baner; „Uruchom ponownie teraz”; sprawdź wersję, dane, skrót, autostart.
- **Oczekiwany efekt:** „Dostępna wersja 1.15.4.” → „Pobieranie wersji 1.15.4…” → „Wersja 1.15.4 pobrana i sprawdzona
  (SHA-256)…”; po restarcie 1.15.4 i baner „Zaktualizowano do wersji 1.15.4.” z „Co nowego”; przed instalacją zapis
  wszystkich zmian; pliki danych bez zmian (poza obecnością i kopią), `config.json` zachowany, skrót i autostart
  działają.
- **Nie przechodzi, gdy:**
  - aktualizacja gubi zmianę albo ustawienia komputera (K);
  - po restarcie dalej 1.15.3 bez komunikatu.

#### SY.5 Aktualizacja przy zamykaniu do zasobnika (D84 C6, T251, N98, 1.6.5)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** start z czekającą aktualizacją (1.15.3 zainstalowana
  ponownie albo druga instalacja – patrz raport); zegar dowolny, po SY.4
- **Jak sprawdzić:** okno w zasobniku, aktualizacja pobrana; powiadomienie; Ustawienia → Aktualizacje (opis); menu ikony
  „Uruchom ponownie i zaktualizuj” albo „Zakończ” i uruchom; wariant: zamknij Windows z czekającą aktualizacją.
- **Oczekiwany efekt:** raz powiadomienie „Aktualizacja czeka” („… zainstaluje się po „Zakończ” albo „Uruchom ponownie
  i zaktualizuj” w menu ikony przy zegarze.”), klik → Ustawienia → Aktualizacje; po „Zakończ” instalacja w tle bez okien
  instalatora, następny start 1.15.4; przy zamknięciu Windows instalacja przy następnym starcie, bez utraty danych.
- **Nie przechodzi, gdy:**
  - przy zamykaniu do zasobnika aktualizacja nigdy się nie instaluje (N98);
  - powiadomienie powtarza się.

#### SY.6 Aktualizacja – brak sieci (spec „Technika” – aktualizacje, B122, brak wymagania co do treści)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start; `FI_UPDATE_URL` – adres nieosiągalny
- **Jak sprawdzić:** „Sprawdź teraz”; paleta „Sprawdź aktualizacje”; odczekaj 2 min; `main.log`.
- **Oczekiwany efekt:** komunikat po polsku o braku połączenia, aplikacja działa; bez powiadomień i banerów w pętli; log
  z jednym wpisem na próbę.
- **Nie przechodzi, gdy:**
  - błąd techniczny albo zawieszenie.

#### SY.7 Wersja portable (spec „Technika”, D50, T191, B52, 1.5.3)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start (folder z SY.3); zainstalowana aplikacja zamknięta
  przez „Zakończ”; zegar dowolny
- **Jak sprawdzić:** uruchom `Financial-Intel-portable.exe` 1.15.4 z Pobranych; Ustawienia → Aktualizacje (tryb);
  „Uruchamiaj z Windows”; wyloguj i zaloguj; Menedżer zadań → Uruchamianie; wyłącz; zaloguj ponownie.
- **Oczekiwany efekt:** startuje bez instalacji i otwiera folder danych; tryb „wersja portable – nowy plik .exe
  zastępuje obecny po zamknięciu aplikacji, bez instalatora”; jeden wpis „Financial Intel (portable)”; po zalogowaniu
  tylko ikona w zasobniku; po wyłączeniu wpis znika.
- **Nie przechodzi, gdy:**
  - wpisy autostartu się mnożą albo wyłączenie nie działa (B52);
  - okno wyskakuje przy logowaniu.

#### SY.8 Jedna instancja (E0, T191, 0.1.0)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** start, to samo userData
- **Jak sprawdzić:** uruchom; schowaj do zasobnika; uruchom ten sam exe drugi raz; potem drugi raz z `--hidden`; policz
  procesy główne.
- **Oczekiwany efekt:** druga kopia kończy się od razu, pierwsza pokazuje okno (także z zasobnika); z `--hidden` okno
  się nie pokazuje; zawsze jeden proces główny.
- **Nie przechodzi, gdy:**
  - dwie instancje na jednym folderze;
  - `--hidden` pokazuje okno.

#### SY.9 X chowa do zasobnika, „Zakończ” kończy (D64, E0, 0.1.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start
- **Jak sprawdzić:** X przy włączonym „Zamykaj do zasobnika”; sprawdź proces i obecność (sygnał co 5 min); zakończ
  z menu ikony (w laboratorium – ta sama droga zamknięcia) ze zmianą w polu.
- **Oczekiwany efekt:** X chowa okno, proces działa, kopia i powiadomienia dalej; obecność „w zasobniku”; „Zakończ”
  kończy po zapisie zmian.
- **Nie przechodzi, gdy:**
  - X kończy proces;
  - „Zakończ” gubi zmianę.

#### SY.10 Zasobnik – ikona, dymek, menu (spec „Okna i zasobnik”, D46, D64, T59, T251, B88, 1.0.0, 1.6.0, 1.10.0)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start z wydatkami dziś; zegar: M0, 10:00–20:00
- **Jak sprawdzić:** X; odczytaj dymek pierwszego ukrycia; najedź na ikonę; prawy klik; „Szybki wpis”, „Otwórz”, „Raport
  wachty dnia”, „Dziś bez wydatków”, „Przypomnij za 30 min”, „Zakończ”; klik i dwuklik; X drugi raz.
- **Oczekiwany efekt:** dymek „Financial Intel działa w zasobniku – … Ikona przy zegarze: Otwórz / Zakończ.” tylko przy
  pierwszym ukryciu; tooltip „Financial Intel” i „Energia dziś: … zł (przydział … − dziś …)” zgodny z Mostkiem co do
  grosza (odczyt → AU-9); menu w tej kolejności; „Raport wachty dnia” otwiera Operacje z dzisiejszymi wpisami bez zmiany
  zapisanego filtra; „Dziś bez wydatków” potwierdza zapis; „Zakończ” kończy po zapisie.
- **Nie przechodzi, gdy:**
  - energia w dymku inna niż na Mostku;
  - dymek przy każdym ukryciu;
  - „Raport wachty dnia” kasuje filtr (B88).

#### SY.11 Zasobnik – ukryte kwoty i nowy dzień (T55, T59, N99, D30)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start; zegar: M0 23:55 → M0+1 00:05
- **Jak sprawdzić:** Ctrl+$ w oknie, schowaj, najedź; Ctrl+$ ponownie; zostaw aplikację w zasobniku przez północ; najedź
  po 00:02.
- **Oczekiwany efekt:** „Energia dziś: ••• zł” przy ukrytych; po północy dymek z energią nowego dnia.
- **Nie przechodzi, gdy:**
  - kwota w dymku mimo ukrycia;
  - dymek z wczorajszą energią.

#### SY.12 Start z Windows ukryty w zasobniku (D46, D64, T191, T251, B119, E0)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** start (po SY.4); zegar dowolny
- **Jak sprawdzić:** „Uruchamiaj z Windows (ukryta w zasobniku)” włączone; okno zmaksymalizowane; uruchom ponownie
  Windows; Menedżer zadań → Uruchamianie; otwórz z ikony; wyłącz i uruchom ponownie Windows.
- **Oczekiwany efekt:** po zalogowaniu tylko ikona, bez okna; jeden wpis „Financial Intel”; okno otwiera się
  zmaksymalizowane; kopia dzienna i dymek działają bez otwierania; po wyłączeniu brak wpisu i brak startu.
- **Nie przechodzi, gdy:**
  - okno pokazuje się przy logowaniu;
  - przełącznik nie wyłącza startu.

#### SY.13 Globalny skrót nad innym oknem (spec „Szybki wpis”, D46, E4 „Gotowe, gdy”, T54)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** start; aplikacja w zasobniku; Notatnik na pełnym ekranie;
  zegar: 10:00–20:00
- **Jak sprawdzić:** Ctrl+Alt+B, zmierz czas; wpisz wydatek 12,50, Enter; Ctrl+Alt+B, Esc; w Notatniku AltGr+A, C, E, L,
  N, O, S, X, Z.
- **Oczekiwany efekt:** okno szybkiego wpisu w mniej niż sekundę, nad Notatnikiem, na ekranie z kursorem, bez paska
  zadań; Enter zapisuje (operacja w Operacjach, dymek zmienia energię); Esc chowa, fokus wraca do Notatnika; polskie
  znaki piszą się normalnie.
- **Nie przechodzi, gdy:**
  - okno pod Notatnikiem albo dłużej niż sekunda;
  - AltGr+litera otwiera szybki wpis.

#### SY.14 Zmiana globalnego skrótu (spec „Szybki wpis”, D46, T53, T190)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start; zegar dowolny
- **Jak sprawdzić:** Ustawienia → Powiadomienia i dźwięki → „Skrót globalny” → Ctrl+Shift+F9; w Notatniku Ctrl+Shift+F9
  i Ctrl+Alt+B; uruchom ponownie Windows; Backspace („brak skrótu”), F1.
- **Oczekiwany efekt:** nowy skrót działa w całym systemie, Ctrl+Alt+B już nie; po ponownym uruchomieniu zostaje; „brak
  skrótu” – nic nie rejestruje, ściągawka mówi „brak skrótu”.
- **Nie przechodzi, gdy:**
  - stary skrót dalej działa;
  - nowy ginie po ponownym uruchomieniu.

#### SY.15 Powiadomienia – próby i treść w laboratorium (T56, T68, T198, F14, D47)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** brzegi (historia ułożona względem dnia: asteroida za 14 i 3
  dni, kontener 3 dni po terminie, ostatni import sprzed 3 dni, rata 3 dni po terminie, zakup domownika sprzed 30 dni,
  boja); zapis prób powiadomień
- **Jak sprawdzić:** otwórz folder; wywołaj zdarzenia danymi: wydatki do energii < 20 %, koperta > 80 % i ponad limit,
  przekroczony przydział, wypłata w fiksturze ICTTJ, CSV w `FI_DOWNLOADS_DIR`, wieczorne (godzina = teraz + 2 min);
  powtórz przy Ctrl+$ i przy wyłączonych przełącznikach; ponowne uruchomienie.
- **Oczekiwany efekt:** każde powiadomienie raz, tytuł i treść po polsku z prawdziwą nazwą i kwotą („Asteroida na
  kursie”, „Kontener niezaładowany”, „Zaległy import z mBanku”, „Rata pożyczki po terminie”, „Rozliczenie
  z domownikiem”, „Energia dziś na wyczerpaniu”, „Koperta … ponad 80%”, „Koperta … przekroczona”, „Przydział dnia
  przekroczony”, „Nowa wypłata w ICTTJ do zadokowania”, „Nowy meldunek z mBanku”, „Raport wachty dnia”); przy ukrytych
  kwotach „•••”; wyłączone – brak; po ponownym uruchomieniu bez powtórek.
- **Nie przechodzi, gdy:**
  - brak próby przy spełnionym warunku;
  - kwota widoczna przy ukryciu;
  - powtórka tego samego.

#### SY.16 Powiadomienia dzienne i cisza nocna (spec „Powiadomienia”, D70, T56, D84 C9)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start z wydatkami; zegar: M0 21:00 (wieczorne), M0 23:30
  (wydatek ponad przydział), M0+1 05:01 i pierwsze otwarcie okna (odprawa)
- **Jak sprawdzić:** aplikacja w zasobniku; czekaj na 21:00, kliknij powiadomienie; o 23:30 dopisz wydatek ponad
  przydział (szybki wpis – potwierdź ciszę); rano po 5:00 otwórz okno z ikony; kliknij odprawę.
- **Oczekiwany efekt:** 21:00 „Raport wachty dnia”, klik → Operacje z dzisiejszymi wpisami; 23:30–05:00 żadnego
  powiadomienia (także z procesu głównego – wątpliwość w raporcie); odprawa przy pierwszym otwarciu po ciszy – „Energia
  dziś: … Alarmy: N.”, klik → Mostek; każde raz.
- **Nie przechodzi, gdy:**
  - powiadomienie w ciszy nocnej;
  - odprawa przed 5:00 albo dwa razy.

#### SY.17 Powiadomienia o limitach i zdarzeniach (spec „Powiadomienia”, T56, T68, F14)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start; folder ICTTJ maszyny; zegar: 10:00–20:00
- **Jak sprawdzić:** szybkim wpisem doprowadź energię poniżej 20 %, kopertę ponad 80 % i ponad limit, przydział dnia
  ponad limit; dopisz wypłatę w folderze ICTTJ; skopiuj CSV z mBanku do Pobranych; klikaj każde powiadomienie.
- **Oczekiwany efekt:** toasty Windows „Financial Intel”: „Energia dziś na wyczerpaniu”, „Koperta … ponad 80%”, „Koperta
  … przekroczona” (z dźwiękiem alarmu), „Przydział dnia przekroczony”, „Nowa wypłata w ICTTJ do zadokowania” (klik →
  Mostek z dokowaniem), „Nowy meldunek z mBanku” (klik → Import z plikiem); każde raz.
- **Nie przechodzi, gdy:**
  - brak toastu przy spełnionym warunku;
  - klik prowadzi na zły ekran.

#### SY.18 Powiadomienia terminowe (spec „Powiadomienia”, D72, F1, F16, T56, T74)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start + kontener roczny z terminem T, miesięczny z dniem
  płatności P, pożyczka z ratą R, boja B, zakup za domownika z dnia Z, ostatni import I (daty w instrukcji maszyny);
  zegar kolejno: T−14, T−3, P+3, R+3, B−14, B−3, I+3, Z+30, każdorazowo 10:00
- **Jak sprawdzić:** po każdym przesunięciu zegara aplikacja w zasobniku, czekaj 2 min; kliknij powiadomienie.
- **Oczekiwany efekt:** „Asteroida na kursie” 14 i 3 dni przed (nazwa, kwota), „Kontener niezaładowany” 3 dni po
  terminie bez płatności, „Rata pożyczki po terminie”, „Boja na kursie” / „Termin na radarze”, „Zaległy import z mBanku”
  (z podpowiedzią pobrania pliku), „Rozliczenie z domownikiem”; klik → Ładownia, Radar, Import, Radar; każde raz.
- **Nie przechodzi, gdy:**
  - powiadomienie dzień za wcześnie albo za późno;
  - powtórka tego samego terminu.

#### SY.19 Powiadomienia tygodniowe, miesięczne i PIT-38 (spec „Powiadomienia”, D72, D73, T56, T185)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** start z budżetem uruchomionym w miesiącu M (kreator w SY.3);
  zegar: pierwsza niedziela po M0 10:00 i 18:05; 1. dzień M+1 09:00; 16.04 i 27.04 następnego roku 10:00
- **Jak sprawdzić:** w każdym punkcie zegara aplikacja w zasobniku, czekaj 2 min; kliknij powiadomienie.
- **Oczekiwany efekt:** niedziela – „Potwierdzenie sald” dla każdego konta niepotwierdzonego od poniedziałku; od 18:00 –
  „Raport wachty” → Raporty; 1. dzień – „Debriefing miesiąca” → Plan miesiąca; „PIT-38 na radarze” 14 i 3 dni przed 30
  kwietnia, bez kwoty; każde raz.
- **Nie przechodzi, gdy:**
  - debriefing w pierwszym miesiącu budżetu;
  - PIT-38 z kwotą.

#### SY.20 Kliknięcie powiadomienia i „Nie przeszkadzać” (T56, brak wymagania dla „Nie przeszkadzać”)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** start; zegar: 10:00–20:00
- **Jak sprawdzić:** kliknij powiadomienie przy oknie w zasobniku i przy oknie na innym ekranie; włącz w Windows „Nie
  przeszkadzać”, wywołaj powiadomienie, wyłącz; otwórz Centrum powiadomień.
- **Oczekiwany efekt:** klik pokazuje okno na ekranie sprawy; przy „Nie przeszkadzać” bez wyskakującego okna, ale
  w Centrum powiadomień; po wyłączeniu bez zaległej lawiny.
- **Nie przechodzi, gdy:**
  - klik nie pokazuje okna;
  - przy „Nie przeszkadzać” powiadomienie przepada bez śladu albo wraca lawiną.

#### SY.21 Logi (E0, D82, T124, T126)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok, po punktach DA
- **Jak sprawdzić:** „Otwórz folder logów” w Ustawieniach, palecie i na ekranie wyboru; przeczytaj `main.log`; rozmiar
  ponad 1 MB.
- **Oczekiwany efekt:** folder `logs` w danych aplikacji; w `main.log` etapy otwierania, kopie, błędy zapisu i folderu
  z czasem; bez kwot i nazw kontrahentów (brak wymagania – prywatność); powyżej 1 MB plik przechodzi do `main.old.log`.
- **Nie przechodzi, gdy:**
  - przycisk nie otwiera folderu;
  - log nie mówi, co się stało przy błędach z DA.

#### SY.22 Uśpienie i wybudzenie (F2, T154, 1.4.3)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** start; aplikacja w zasobniku; zegar: uśpienie M1 22:00,
  wybudzenie M1+1 08:00 (zegar przesunięty w czasie uśpienia)
- **Jak sprawdzić:** uśpij; przestaw zegar; wybudź; po 5 min sprawdź `backups/daily/`, dymek, powiadomienia; otwórz
  okno.
- **Oczekiwany efekt:** kopia dzienna z nową datą w ciągu kilku minut po wybudzeniu; dymek z energią nowego dnia;
  odprawa przy pierwszym otwarciu; bez powtórek wczorajszych powiadomień; Operacje na bieżącym miesiącu.
- **Nie przechodzi, gdy:**
  - kopia dopiero po ponownym uruchomieniu;
  - wczorajsze powiadomienia wracają.

#### SY.23 Zamknięcie Windows z otwartą aplikacją i zmianą (brak wymagania; T142, T301)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** start; zegar dowolny
- **Jak sprawdzić:** wpisz kwotę w edytorze bez wyjścia z pola; Start → Zamknij system; uruchom i sprawdź operację.
- **Oczekiwany efekt:** Windows się wyłącza (FI nie blokuje go długo albo pyta z przyczyną); po starcie zmiana zapisana.
- **Nie przechodzi, gdy:**
  - zmiana przepada bez pytania (K);
  - FI blokuje wyłączenie bez wyjaśnienia.

#### SY.24 Odinstalowanie bez utraty danych (plan audytu AU-3, brak wymagania)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** start; ostatni krok maszyny; sumy kontrolne folderu danych
  i kopii
- **Jak sprawdzić:** Ustawienia Windows → Aplikacje → Financial Intel → Odinstaluj; sprawdź folder danych, kopie, menu
  Start i autostart; zainstaluj 1.15.4 ponownie i uruchom.
- **Oczekiwany efekt:** folder danych i kopie bajt w bajt bez zmian; skrót w menu Start i wpis autostartu usunięte; po
  ponownej instalacji aplikacja otwiera zapamiętany folder albo pozwala go wskazać („Otwórz istniejące”), dane pełne.
- **Nie przechodzi, gdy:**
  - deinstalator usuwa albo zmienia dane (K);
  - zostaje martwy wpis autostartu.
