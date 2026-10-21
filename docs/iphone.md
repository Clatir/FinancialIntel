# Financial Intel na iPhonie

Aplikacja na iPhone'a (od 1.13.0, D92) czyta i zapisuje **ten sam folder danych na OneDrive** co Financial Intel na
Windows. Telefon jest dla folderu kolejnym komputerem („iPhone” – widać go w Synchronizacji i w Ustawieniach komputera).
Instaluje się bez App Store, przez AltStore.

## Co jest na telefonie (1.14.0)

- **Mostek** – stan okrętu, energia dziś, koperty, odprawa, Daily Bias, „skąd ta liczba?”, ostatnie operacje,
  należności, przychody, krzywa majątku. Te same liczby co na komputerze (ten sam silnik).
- **Szybki wpis** – przycisk „+ Wpis” na dole: kwota, kontrahent, kategoria, tagi, „za domownika”, wspólne finansowanie.
- **Operacje** (od 1.14.0) – lista z wyszukiwaniem, miesiącem i filtrami (konto, kategoria, oznaczenia); dotknięcie
  otwiera edytor operacji komputera na cały ekran, „+ Nowa” dodaje operację.
- **Meldunki** (od 1.14.0) – wydatki bez kategorii, nieznane sygnały, zwroty w drodze i salda do potwierdzenia (saldo z
  aplikacji banku wpisujesz w meldunku); licznik w dolnym menu. Pozostałe meldunki – na komputerze.
- **Plan miesiąca i Radar** (od 1.14.0, menu „Więcej”) – podgląd; zmiany na komputerze.
- **Powiadomienia** – odprawa poranna, raport wachty wieczorem i dni z radaru (opłaty, raty, boje, PIT-38) na najbliższy
  tydzień. Planowane przy każdym otwarciu aplikacji, bo iOS nie uruchamia jej w tle – otwórz ją przynajmniej raz w
  tygodniu.
- **Ustawienia telefonu** (Więcej → Telefon) – synchronizacja, konto i folder, nazwa telefonu, ukrywanie kwot,
  powiadomienia.

Reszta ekranów jest na razie tylko na komputerze. Telefon to mówi i proponuje powrót na Mostek. Edycja planu i radaru,
wszystkie meldunki, ładownia, mapa gwiezdna, dowództwo i wywiad dochodzą w kolejnych wersjach (`docs/plan.md`, grupy
iC–iE). Import z mBanku, raporty, kopie zapasowe i pełna Synchronizacja zostają na komputerze.

## Raz: rejestracja aplikacji w Microsoft Entra

Telefon loguje się do OneDrive aplikacją zarejestrowaną na Twoim koncie Microsoft:

1. Wejdź na portal.azure.com (konto Microsoft z OneDrive) → **Microsoft Entra ID** → **Rejestracje aplikacji** →
   **Nowa rejestracja**.
2. Nazwa: „Financial Intel iPhone”. Typy kont: **Tylko osobiste konta Microsoft**.
3. Identyfikator URI przekierowania: platforma **Klient publiczny/natywny (mobilny i klasyczny)**, adres
   `financialintel://auth`. Zarejestruj.
4. **Uwierzytelnianie**: „Zezwalaj na przepływy klienta publicznego” → **Tak**. Zapisz.
5. **Uprawnienia interfejsu API** → Dodaj → Microsoft Graph → **Uprawnienia delegowane**: `Files.ReadWrite`,
   `offline_access`, `User.Read`. Bez klucza tajnego (nie jest potrzebny).
6. Skopiuj **Identyfikator aplikacji (klienta)** – to GUID, na przykład `0a1b2c3d-…`. Nie jest tajny.

Portal może odpowiedzieć, że tworzenie aplikacji poza katalogiem zostało wycofane. Wtedy załóż darmowe konto Azure:
karta służy tylko do weryfikacji, a konto tworzy katalog. Potem wróć do kroku 1.

Identyfikator wpisujesz w aplikacji przy pierwszym uruchomieniu. Możesz go też wbudować w kolejne wersje: w
repozytorium GitHub otwórz Settings → Secrets and variables → Actions → **Variables**, dodaj zmienną `FI_CLIENT_ID` z
identyfikatorem jako wartością. Następne `.ipa` będą go już miały.

## Raz: AltStore

1. Na Windows zainstaluj **iTunes** i **iCloud** ze strony Apple. Nie z Microsoft Store – AltServer potrzebuje wersji ze
   strony Apple.
2. Zainstaluj **AltServer** ze strony altstore.io i uruchom go (ikona w zasobniku).
3. Podłącz iPhone'a kablem, odblokuj go i zaufaj komputerowi. W menu AltServer wybierz **Install AltStore** → swój
   iPhone. Podaj swoje Apple ID – służy do podpisania aplikacji.
4. Na iPhonie włącz **Tryb dewelopera**: Ustawienia → Prywatność i ochrona → Tryb dewelopera. Telefon uruchomi się
   ponownie.

Darmowe Apple ID podpisuje aplikacje na **7 dni** i najwyżej 3 naraz. AltStore odnawia podpis sam, gdy AltServer działa
na komputerze w tej samej sieci Wi-Fi. Możesz też odnowić ręcznie: AltStore → My Apps → Refresh All.

## Instalacja i aktualizacje

1. Na iPhonie otwórz AltStore → **Browse** → **Sources** → **+** i dodaj źródło:

   `https://github.com/Clatir/FinancialIntel/releases/latest/download/altstore.json`

2. W źródle Financial Intel wybierz **Free** albo **Install**. AltStore pobierze `.ipa` z wydania na GitHubie i ją
   podpisze.
3. Nowe wersje pokazuje AltStore → **My Apps** → Update. Wydanie ma `.exe` dla Windows i `Financial-Intel.ipa` dla
   iPhone'a, a `SHA256SUMS.txt` zawiera sumy wszystkich plików.

Bez źródła: pobierz `Financial-Intel.ipa` z wydania na GitHubie (Safari → Pobrane) i otwórz go w AltStore (My Apps →
**+**).

## Pierwsze uruchomienie

1. **Zaloguj się do OneDrive**: wklej identyfikator aplikacji, jeśli wersja nie ma go wbudowanego, potem „Zaloguj”.
   Otworzy się strona Microsoft. Po zalogowaniu Safari zapyta, czy otworzyć Financial Intel – potwierdź.
2. **Folder danych**: domyślnie `FinancialIntel` w głównym folderze OneDrive (jak na komputerze, D62). Inny wpisz jako
   ścieżkę względem OneDrive, na przykład `Dokumenty/FinancialIntel`. Folder musi mieć `fi.json` – założony na
   komputerze.
3. **Pierwsza kopia**: telefon pobiera rekordy folderu, a pasek pokazuje, ile już ma. Bez historii wersji i kopii
   zapasowych – zostają na komputerze. Potem otwiera się Mostek.

Od tej chwili aplikacja startuje z kopii w telefonie, także bez sieci.

## Jak działa synchronizacja

- Przy otwarciu aplikacji, co 30 sekund, gdy jest otwarta, chwilę po każdej zmianie i przy przejściu do tła.
- Bez sieci wpis zapisuje się w telefonie i czeka – pasek u góry pokazuje „offline · N czeka”. Wysyła się, gdy wróci
  sieć.
- Zmiana z komputera dochodzi przy następnej synchronizacji. Wpis edytowany na telefonie w tej samej chwili nie znika:
  pyta jak na komputerze (zmiany z drugiego komputera).
- **Konflikt**: gdy plik zmienił się na OneDrive od ostatniej synchronizacji, a telefon ma swoją zmianę, OneDrive
  zachowuje wersję z komputera. Wersja z telefonu trafia obok jako kopia `…-telefon-<czas>.json`. Wybierasz na komputerze
  w **Synchronizacji** („Zachowaj tę” / „Scal…”). Nic nie przepada.
- Telefon i komputer nie powinny pracować naraz (D2 / D92). Baner na komputerze pokazuje telefon w użyciu.

## Prywatność

Dane budżetu są tylko w telefonie (kopia folderu w pamięci aplikacji) i na Twoim OneDrive – jak na komputerze, bez
szyfrowania. Aplikacja łączy się wyłącznie z Microsoft: z logowaniem i z OneDrive. Token odświeżania logowania jest w
pamięci aplikacji. „Wyloguj” w Ustawieniach telefonu usuwa z telefonu konto i kopię folderu.

## Kłopoty

| Objaw | Co zrobić |
| --- | --- |
| „Zaloguj ponownie” na pasku | Microsoft unieważnił logowanie (zmiana hasła, 90 dni bez otwarcia). Ustawienia telefonu → Zaloguj ponownie. |
| Aplikacja nie startuje po tygodniu | Wygasł podpis AltStore – odnów w AltStore (My Apps → Refresh All) z AltServerem w tej samej sieci. |
| „Folder nie ma fi.json” | Folder nie jest folderem danych FI albo ścieżka jest inna – sprawdź ją w Ustawieniach komputera → Folder i kopie. |
| Brak powiadomień | Ustawienia iOS → Financial Intel → Powiadomienia; otwórz aplikację, żeby zaplanowała kolejny tydzień. |
| Kopie `-telefon-` w Synchronizacji | Konflikt z komputerem – wybierz wersję albo scal na komputerze. |
