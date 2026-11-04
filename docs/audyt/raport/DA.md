# Raport audytu – DA (dane i dwa komputery)

- Data: 03.11.2026, 11:55–13:05 (zegar prawdziwy, Warszawa); wersja 1.15.4 z GitHub Releases (laboratorium `C:\FI-audyt`,
  `start()` z `tests/audyt/lab.ts`).
- Stan danych: `rok` (kotwica 2026-11-03, świeża kopia na każdy przebieg), `start` (opis w `raport/KR.md`), `pusty`;
  stan „dwa komputery” zrobiony z `rok` – przebiegi „DOM-PC” i „LAPTOP” po kolei, każdy z własnym `userData`; zmiany
  i obecność drugiego komputera zapisywane z zewnątrz. Stany szczególne – tabela niżej.
- Przebiegi: `da-*` (`C:\FI-audyt\przebiegi\da-*\da.log` – tekst ekranów, pliki, wycinki `main.log`), skrypty
  `tests/audyt/da-*.spec.ts` (pomocnik `da-pomoc.ts`, odczyt ZIP-ów `da-zip.mjs`), odczyty liczb
  `C:\FI-audyt\odczyty\da.jsonl` (DA.33), zrzuty `C:\FI-audyt\zrzuty\DA.*.png`.
- W każdym przebiegu: zamrażanie dni gry jak w wydaniu (`FI_FREEZE_AFTER_OPEN_MS` 180 000, `FI_FREEZE_QUIET_MS` 60 000 –
  bez tego laboratorium ustawia 0, zob. „Problemy laboratorium”); przeniesienia do Kosza Windows (`shell.trashItem`)
  przechwycone – plik trafia do `przebiegi\da-*\kosz` i jest zapisany jako próba, Kosz użytkownika nietknięty.
- Folder ICTTJ: wyłącznie kopie `stany\ictj-rok` w folderach przebiegów (DA.4, DA.14, persona) – po przebiegach bajt
  w bajt bez zmian.

**Podsumowanie (46 punktów):** ZGODNE 28 · LICZBY → AU-9 1 · UWAGA 7 · NIEZGODNE 7 (K 2, S 2, N 3) · poza
laboratorium 3 (DA.6, DA.37 – Ty; DA.16 – Maszyna).

## Stany szczególne

| Przebieg | Stan (co dodano) | Punkty |
| --- | --- | --- |
| `da-2`, `da-3`, `da-3p`, `da-5` | kopia `rok` jako zapamiętany folder; nazwa folderu zmieniana / folder podmieniony na pusty przy zamkniętej aplikacji; `FI_OPEN_DELAY_MS` 400 / `FI_OPEN_SLOW_MS` 300 | DA.2, 3, 5 |
| `da-4`, `da-14` | kopia `stany\ictj-rok` w folderze przebiegu (fikstury `C:\FI-audyt\ictj\` nie ma) | DA.4, 14 |
| `da-9`, `da-10` | bez kopii z dziś; DA.10: 20 dziennych ZIP-ów z 20 dni (czas pliku = data z nazwy), `notatka.zip`, 10 tygodniowych W35–W44 | DA.9, 10 |
| `da-12` | `rok-nowe-historia.csv` + 11 małych list operacji (po 1 nowym wierszu, `przebiegi\da-12\pliki`) | DA.12 |
| `da-13`, `da-13b` | `fi.json` bez `schemaVersion` + pole `x-audyt` (otwarcie spowolnione 60 ms/plik); wariant 2 – jedna operacja bez `schemaVersion` | DA.13, 5 |
| `da-15` | folder kopii `kopie-x` usunięty; potem `backupDirOverride` = `Z:\FI-kopie` (dysku Z: nie ma); plik operacji otwarty na wyłączność przez PowerShell | DA.15 |
| `da-17`, `da-18` | „Kopia teraz”, potem w aplikacji: 2 kwoty, 1 usunięcie, koperta, nazwa okrętu, 1 nowa operacja | DA.17, 18 |
| `da-20` | w `backups/daily`: ZIP z wpisem `..\..\audyt.json`, z `../../audyt.json`, ucięty w połowie, z operacją `schemaVersion: 2` | DA.20 |
| `da-23`, `da-38`, `da-39`, `da-39p` | wpisy (operacja, kontener, cel, plan) albo `fi.json` z `schemaVersion: 2` i nieznanym polem | DA.23, 38, 39 |
| `da-26` … `da-31` | kopie `-LAPTOP.json` operacji, `fi-LAPTOP.json`, `months/2026-11-LAPTOP.json`; pliki z problemami (niepoprawny JSON, bez kwoty, v2, zablokowany) | DA.26–31 |
| `da-25`, `da-32`–`da-36`, `da-44` | DOM-PC / LAPTOP po kolei; `.presence/LAPTOP.json` pisany z zewnątrz co 3 s; DA.35: dni gry 31.10–02.11 niezamrożone, cel ICTTJ 40 000 → 45 000; DA.44: „Zawsze pytaj” | DA.25, 32–36, 44 |
| `da-40`, `da-40p`, `da-41`, `da-41b` | nazwa folderu danych zmieniana z zewnątrz w trakcie pracy | DA.40, 41 |
| `da-8` | w historii `fi.json` dwie dodatkowe wersje i najnowsza nieczytelna; `fi.json` ucięty w połowie | DA.8 |

## Punkty

### DA.1 – ZGODNE
- Stan: pusty, przebieg da-1, 11:55. Widać: „Kapitanie, gdzie trzymamy dziennik pokładowy?”, jedna propozycja
  „Utwórz w OneDrive (zalecane)” z `…\da-1\OneDrive\FinancialIntel` (propozycję podstawia laboratorium); po kliknięciu
  `fi.json` z `schemaVersion: 1`, wcięcie 2, `\n` na końcu, baner „Budżet jeszcze nie wystartował: kreator startu ustawi
  salda, pensję, warstwy okrętu i koperty.” z „Kreator startu”; bez plików tymczasowych; ponowny start – od razu Mostek
  z tym samym folderem. Zrzuty: DA.1-propozycja.png, DA.1-po-kliknieciu.png, DA.1-ponowny-start.png.

### DA.2 – ZGODNE
- „Nowe dane gdzie indziej” (okno „Wybierz folder na nowe dane”) → w pustym folderze `fi.json` i baner kreatora.
  „Otwórz istniejące” (okno „Wskaż folder z danymi Financial Intel”) na kopii `rok` z nowym `userData` → Mostek bez
  kreatora, pełne dane („Wczytanie: 1034 wpisy”, Mostek jak persona); sumy kontrolne `rok` po zamknięciu: 0 zmian
  (wszystkie pliki, także `backups/` – kopia z dziś już była). Zrzuty: DA.2-nowe.png, DA.2-istniejace.png.

### DA.3 – NIEZGODNE (S)
- Stan: rok (kopia), przebiegi da-3 (11:58–12:01) i potwierdzenie da-3p (12:30).
- Zrobione: (a) „Otwórz istniejące” na folderze z `notatki.txt` i `zdjecie.jpg`; (b) zamknięta aplikacja, nazwa
  zapamiętanego folderu zmieniona, start, po 60 s (da-3p: po 15 s) nazwa przywrócona, czekanie 53 s (da-3p: 81 s) bez
  klikania; (c) zapamiętany folder podmieniony na pusty, start.
- Widać: (a) „W tym folderze nie ma danych Financial Intel (fi.json). Można utworzyć w nim podfolder „FinancialIntel”.” +
  „Utwórz podfolder FinancialIntel”; obce pliki bez zmian – dobrze. (b) „Zapamiętany folder danych jest niedostępny (np.
  OneDrive jeszcze się nie uruchomił albo dysk jest odłączony). Spróbuj ponownie albo wskaż inny folder.” z „Spróbuj
  ponownie” i „Utwórz tu nowe dane…”; w ścieżce nic nie powstało, propozycja to inna ścieżka – dobrze. **Po
  przywróceniu nazwy folder nie otworzył się sam**: w `main.log` jedno „open start” przy starcie i żadnego ponowienia
  przez 113 s (da-3) i 96 s (da-3p); dopiero kliknięcie „Spróbuj ponownie” otworzyło dane. (c) „Zapamiętany folder
  danych jest pusty – OneDrive mógł go jeszcze nie pobrać…”, nowe dane dopiero po „Utwórz tu nowe dane…” → „Na pewno –
  nowy budżet w tym folderze” – dobrze.
- Oczekiwane: komunikat o niedostępnym folderze z „Spróbuj ponownie” **i ponawianiem co 30 s**; po przywróceniu nazwy
  folder otwiera się z danymi. Skutek: aplikacja uruchomiona z Windows przed OneDrive (scenariusz, który komunikat sam
  podaje) czeka na kliknięcie – w tym czasie w zasobniku nie ma kopii dziennej ani powiadomień.
- Zrzuty: DA.3a-obce.png, DA.3b-brak.png, DA.3b-potwierdzenie.png, DA.3c-pusty.png, DA.3c-potwierdzenie.png.

### DA.4 – ZGODNE
- Kopia folderu ICTTJ i jego `payouts\`: na ekranie wyboru („Otwórz istniejące”, „Nowe dane gdzie indziej”) i w
  Ustawieniach („Otwórz inny folder…”, „Nowe dane w innym folderze…”) każda z 8 prób: „To folder danych ICT Trade
  Journal – Financial Intel nigdy w nim nie zapisuje. Wybierz inny folder.”; bieżący folder FI bez zmian; ICTTJ 15
  plików bajt w bajt, bez `fi.json` / `.presence` / `backups`. Zrzuty: DA.4-*.png.

### DA.5 – ZGODNE
- Start z opóźnieniem 400 ms/plik: „Sprawdzanie folderu” → „Wczytywanie plików: 72 z 1035 … 576 z 1035”, czas, pasek,
  podpowiedź „Pliki czytają się wolno … „Zawsze zachowuj na tym urządzeniu”…” (etap „Szukanie plików” mignął szybciej
  niż odczyt co 1 s). „Przerwij” → „Przerwano wczytywanie folderu – nic w nim nie zostało zmienione. …” + „Spróbuj
  ponownie”; folder bajt w bajt, kopia dzienna nie powstała; „Spróbuj ponownie” otwiera (32 s). Log: „open start”,
  „open progress … step read, 576/1035 files, … waiting …” co 10 s, „open aborted … 648/1035”. Etap „Aktualizacja
  formatu danych” (przebieg da-13): „Przerwij” wyłączone. To samo przez „Otwórz istniejące”. Zrzuty: DA.5-postep.png,
  DA.5-przerwij.png. (Podpowiedź mówi „czekało dłużej niż 0 s” – próg 300 ms ustawiony w laboratorium.)

### DA.6 – poza laboratorium (Kto: Ty)

### DA.7 – NIEZGODNE (N)
- Stan: rok + start, przebiegi da-7 (12:38, otwieranie 250 ms/plik) i da-7q (12:44, 400 ms/plik).
- Zrobione: kwota 55,55 w edytorze „Lody Grycan” bez wyjścia z pola → Ustawienia → Folder i kopie → „Otwórz inny
  folder…” → `start`; w trakcie: drugie kliknięcie, szybki wpis (`quickOpen`), Ctrl+N; „Ostatnio używane foldery” →
  „Otwórz” przy `rok`.
- Widać (dobrze): kwota w pliku `rok` przed przełączeniem (−5555), w `start` nic z `rok`; w trakcie „Wczytywanie
  plików: 48 z 922 … Przerwij”, „Otwórz inny folder…” i „Nowe dane w innym folderze…” wyłączone, drugie kliknięcie
  niemożliwe; powrót – „Otwarto folder danych.”, edytor pokazuje 55,55.
- Widać (źle): **szybki wpis w trakcie otwierania drugiego folderu otwiera się bez odmowy** – z energią poprzedniego
  folderu („Szybki wpis · energia dziś 77,28 zł”); w da-7q wpis 6,66 zł zapisany po „Zapisz” („Zapisano.”) trafił do
  folderu `start` (`transactions/2026/2026-11-03_01M6GKKZ9P….json`), choć okno pokazywało dane `rok`. Ctrl+N w trakcie
  nic nie robi i nic nie mówi.
- Oczekiwane: w trakcie „szybki wpis odmawia z wyjaśnieniem”.
- Zrzut: DA.7-w-trakcie.png.

### DA.8 – UWAGA
- Stan: rok (kopia), `fi.json` ucięty w połowie, w historii wersje z 01.10, 02.11, 03.11 09:59 i najnowsza (03.11 10:00)
  nieczytelna; przebieg da-8, 12:39.
- Widać: „Plik fi.json jest uszkodzony (Uszkodzony JSON: Unterminated string in JSON at position 8499 (line 326 column
  19)). Ostatnią dobrą wersję ustawień można wziąć z historii zmian – uszkodzony plik zostanie obok jako kopia.” +
  „Weź ustawienia z historii”. Po kliknięciu: okręt Flagowiec, 3 konta, 40 kategorii z najnowszej czytelnej wersji
  (03.11 09:59), nieczytelna pominięta; obok `fi-uszkodzona-20261103T113911Z.json`, w Synchronizacji „USZKODZONY PLIK
  ODSUNIĘTY PRZY ZAPISIE”; nowego pustego `fi.json` nie ma – funkcja działa.
- Uwaga (tekst): w komunikacie surowy angielski opis parsera („Unterminated string in JSON at position 8499 (line 326
  column 19)”). Punkt: „komunikat techniczny po angielsku” – tu tylko wtrącenie, reszta po polsku.
- Zrzuty: DA.8-ekran.png, DA.8-synchronizacja.png. (Zob. Spostrzeżenia – ustawienia zmienione po ostatniej wersji
  w historii przepadają bez słowa.)

### DA.9 – ZGODNE
- Bez kopii z dziś: po otwarciu `backups/daily/2026-11-03.zip` (data warszawska) i `weekly/2026-W45.zip`; ZIP = 1035
  plików danych z `fi.json`, te same bajty, bez `.history/`, `.presence/`, `backups/`; „Ostatnia kopia: dziś”,
  „dzienna” na liście; drugie otwarcie – ten sam plik (czas i zawartość), bez drugiej kopii. Zrzut: DA.9-kopie.png.

### DA.10 – ZGODNE
- 20 dziennych + `notatka.zip`, 10 tygodniowych → po otwarciu 14 dziennych (21.10–03.11) + `notatka.zip` nietknięty,
  8 tygodniowych (W38–W45); W45 = dzisiejsza dzienna (te same bajty).

### DA.11 – UWAGA
- 5 × „Kopia teraz” + paleta „Kopia zapasowa teraz”: toast „Utworzono kopię: …\backups\manual\2026-11-03_120511.zip”,
  „ręczna” na liście, „Ostatnia kopia: dziś”; po szóstej zostaje 5 najnowszych (najstarsza 120511 usunięta);
  ostatnia = 1035 plików danych, te same bajty.
- Uwaga (tekst): Ustawienia mówią „zostaje 14 dziennych i 8 tygodniowych; przed każdym importem z banku (10 ostatnich)
  i przed migracją formatu zawsze” – o rotacji ręcznych (5) ani słowa; szósta kopia usuwa najstarszą bez informacji.
- Zrzuty: DA.11-paleta.png, DA.11-lista.png.

### DA.12 – ZGODNE
- Import `rok-nowe-historia.csv`, potem 11 małych plików: przed każdym zapisem nowy ZIP w `pre-import/` = stan sprzed
  importu (porównanie z sumami folderu tuż przed „Importuj”: 0 różnic, bez operacji z pliku); „przed importem” na
  liście; na końcu 10 najnowszych (wypadły 110013 persony i 120627); dzienna, tygodniowa i ręczne nietknięte.
  Zrzut: DA.12-lista.png. (Zob. Spostrzeżenia – przy 11. imporcie znika też paczka najstarszego importu.)

### DA.13 – ZGODNE
- `fi.json` v0 z `x-audyt`: postęp „Wczytywanie plików” → „Aktualizacja formatu danych” („Przerwij” wyłączone); baner
  „Dane zaktualizowano z formatu v0 do v1. Kopia sprzed migracji: …\pre-migration\20261103T110933Z_v0-v1.zip”; ZIP =
  oryginały bajt w bajt (1035, `fi.json` = oryginał); „przed migracją” na liście; `fi.json` ma `schemaVersion: 1`,
  `x-audyt` zostało. Wariant 2: oryginał operacji w `pre-migration/20261103T111004Z/transactions/…` (bajt w bajt),
  operacja v1 z zachowanym `x-audyt`. Zrzuty: DA.13-baner.png, DA.13-wariant2.png.

### DA.14 – ZGODNE
- „Zmień folder kopii…” → `przebiegi\da-14\kopie`: kopie `rok` w `kopie\dane-546ed234\`, po zmianie folderu danych na
  `start` – w `kopie\dane-1b5340b7\` (osobno, żadna rotacja nie miesza); wcześniejsze kopie w `backups/` zostały.
  Ustawienia: „Folder: …\kopie\dane-…”, Synchronizacja: „…odzyskać z kopii zapasowej (Ustawienia → Folder i kopie:
  …\kopie\dane-546ed234)”. Folder w ICTTJ (i `payouts`): „To folder danych ICT Trade Journal – Financial Intel nigdy w nim
  nie zapisuje. Wybierz inny folder na kopie.”; „Domyślny” wraca do `backups/`; `fi.json` bez ścieżki kopii,
  `config.json` – `backupDirOverride`. ICTTJ bez zmian. Zrzuty: DA.14-wlasny.png, DA.14-ictj.png. (Zob. Spostrzeżenia –
  po zmianie folderu kopii lista pokazuje „Brak kopii.”.)

### DA.15 – UWAGA
- Stan: rok, przebiegi da-15 (12:11) i da-31 (12:26).
- (a) Folder kopii usunięty z zewnątrz → aplikacja tworzy go od nowa i robi kopię (bez ostrzeżenia – rozsądnie).
  Folder kopii na nieistniejącym dysku `Z:\FI-kopie`: „Kopia dzienna nie powstała (3.11.2026, 12:11:28): ENOENT: no
  such file or directory, mkdir '\\?' – sprawdź, czy folder kopii jest dostępny (np. dysk podłączony).”; po
  „Domyślny” i „Kopia teraz” ostrzeżenie znika – dobrze.
- (b) Plik operacji otwarty na wyłączność: „Kopia teraz” udaje się, ZIP pełny (1035, z tym plikiem) – aplikacja bierze
  rekord z pamięci, więc przerwania nie ma i niepełnej kopii też nie. Plik niewczytany przy otwarciu (zablokowany od
  startu, da-31): „Kopia teraz” → „Błąd EBUSY: resource busy or locked, open 'C:\FI-audyt\…\2026-10-30_01KAZ…203.json'”,
  ZIP nie powstał, lista bez zmian, okno odpowiada; po zwolnieniu kopia się udaje.
- Uwaga (tekst): przyczyny po angielsku i z technicznym zapisem („ENOENT: no such file or directory, mkdir '\\?'”,
  „EBUSY: resource busy or locked”); punkt wymaga „po polsku”.
- Zrzuty: DA.15a-blad.png, DA.15a-po-kopii.png, DA.15b-blokada.png, DA.15b-plik-z-dysku.png.

### DA.16 – poza laboratorium (Kto: Maszyna)

### DA.17 – UWAGA
- Stan: rok, przebieg da-17 (12:18): „Kopia teraz”, potem kwota CINEMA CITY 14.10 i ZOOPLUS 13.10, usunięta FRYZJER STYL
  19.10, koperta „Rozrywka i hobby” 450 → 500, nazwa okrętu, nowa operacja „Po kopii DA”.
- Widać: „W kopii: 1034 wpisy. Od kopii: 2 operacje zmienione, 1 operacja usunięta · **1 plan miesiąca zmieniona**.”,
  osobno „Ustawienia – inne niż w kopii (…)”, „Dodane po kopii: 1 operacja – zostają …”; różnice „Pole / Teraz / W kopii”:
  „Kwota −180,00 zł / −176,16 zł”, „Koperty – Rozrywka i hobby 500,00 zł / 450,00 zł”; przy Ctrl+$ „••• zł”; sam podgląd
  nie zmienia żadnego pliku danych (zmienił się tylko `.presence/`).
- Uwaga (tekst): błędna odmiana „1 plan miesiąca zmieniona” (ma być „zmieniony”); tytuły wpisów z datą ISO („Operacja
  2026-10-13: ZOOPLUS −176,16 zł”). Liczby zgodne ze zmianami (podsumowanie po rodzajach zamiast „3 zmienione, 1
  usunięty”).
- Zrzuty: DA.17-podglad.png, DA.17-ukryte.png.

### DA.18 – ZGODNE
- Zaznaczone FRYZJER (usunięta) i CINEMA (zmieniona) → „Odzyskaj zaznaczone (2)” → „Odzyskano z kopii: 2 wpisy.
  Poprzednie wersje są w historii.” z „Cofnij”; FRYZJER wraca z tym samym id i ścieżką, CINEMA −65,01, ZOOPLUS
  (niezaznaczony) bez zmian; w Historii CINEMA „przed przywróceniem”; Mostek przeliczony (73 669,38 → 73 594,23 zł =
  −87,91 + 12,76). „Cofnij” → „Cofnięto odzyskanie z kopii.”, stan sprzed (da-17: ZOOPLUS z powrotem −180,00; da-18:
  suma kont wraca do 73 685,72 zł), bez duplikatów id; drugie odzyskanie zostawione – suma 73 610,57 zł jak przed
  zmianami. Zrzuty: DA.18-toast.png, DA.18-historia.png.

### DA.19 – ZGODNE
- „Odzyskaj cały folder do nowego…” przy dziennej: powstaje „dane – kopia z 2026-11-03 10.59” i otwiera się (drugi raz
  z postępem „Sprawdzanie folderu…”), w nim stan kopii z `fi.json`; drugi raz tą samą kopią – „… 10.59 (2)”, pierwszy
  nienadpisany; bieżący folder bajt w bajt bez zmian; powrót przez „Ostatnio używane foldery” działa („Otwarto folder
  danych.”). Zrzuty: DA.19-nowy-1.png, DA.19-nowy-2.png.

### DA.20 – UWAGA
- (a) ZIP z `..\..\audyt.json` i z `../../audyt.json`: „ZIP zawiera niedozwolone ścieżki (np. ../) – odrzucony.”, nic
  nie zapisane, `audyt.json` nigdzie poza folderem. (c) operacja v2: „1 pliku kopii nie da się odczytać (zapisane przez
  nowszą wersję aplikacji) – pominięte.”, cały folder z tej kopii otwiera się. Aplikacja działa dalej – dobrze.
- (b) ucięty ZIP: „Uszkodzony plik ZIP: End of central directory record signature not found. Either not a zip file, or
  file is truncated.” – uwaga (tekst): błąd po angielsku.
- Zrzuty: DA.20-2026-10-01.png … DA.20-2026-10-04.png. (W (c) operacja z kopii liczona jako „Dodane po kopii: 1
  operacja”, choć w kopii jest – tylko nieczytelna.)

### DA.21 – ZGODNE
- BOLT.EU 15.10: kwota, kategoria i notatka zmienione w ciągu minuty → jedna wersja („27.10.2026, 11:00 ·
  LAPTOP-KAPITANA · PRZED EDYCJĄ”); okno „Historia zmian – Operacja 2026-10-15: BOLT.EU −25,50 zł”, różnice „Ta wersja /
  Obecnie”: „Kwota −20,31 zł / −25,50 zł”, „Kategoria wyjścia / na mieście”, „Notatka puste / przejazd na lotnisko”;
  przy Ctrl+$ „••• zł”; „Przywróć tę wersję” → „Przywrócono: wersja z 27.10.2026, 11:00. Poprzednia wersja jest
  w historii.”, bieżąca wersja w historii („PRZED PRZYWRÓCENIEM”). Zrzuty: DA.21-historia.png, DA.21-ukryte.png,
  DA.21-po.png.

### DA.22 – UWAGA
- „Historia” jest przy planie miesiąca, kontenerze, celu, pożyczce (Radar), saldzie otwarcia (Ustawienia → Konta),
  ustawieniach (Synchronizacja „Ustawienia (fi.json) też mają historię:”) i w oknie „Zmiany z drugiego komputera”
  (przebieg da-32); po zmianie planu, kontenera i nazwy okrętu okno pokazuje wersję sprzed zmiany; Esc zamyka tylko
  historię (edytor kontenera, okno zmian i okno „Dokowanie dostawy” zostają). Cel, pożyczka, saldo i zadokowana
  dostawa (Mostek → Dokowanie → „Wypłata z ICTTJ 19.10.2026 · zadokowana”, przebieg da-22d) – bez zmiany, okno „Brak
  zapisanych wcześniejszych wersji tego wpisu.”.
- Uwaga (tekst): w historii kontenera „Masa od dnia — / 2026-11-03T11:24:23.355Z” – surowy czas ISO.
- Zrzuty: DA.22-koniec.png, DA.22-dokowanie.png.

### DA.23 – ZGODNE
- Operacja v2 z wersjami w historii (Cinema City 04.09.2025): Historia otwiera się, wersje widać; „Przywróć tę wersję”
  → „Błąd Ten wpis zapisała nowsza wersja aplikacji (na drugim komputerze) – ta wersja go nie zmieni. Zaktualizuj
  aplikację (Ustawienia → Aktualizacje).”; folder z `fi.json` v2 – Historia czytelna, „Przywróć” wyłączone; pliki bez
  zmian w obu przebiegach. Zrzuty: DA.23-wpis-v2-historia.png, DA.23-folder-v2-historia.png. (W różnicach „Dane
  z banku: puste / {"format":"mbank","key":…}” – surowy JSON, zob. Spostrzeżenia.)

### DA.24 – ZGODNE
- ZOOPLUS 13.10 usunięta („Usunięto: ZOOPLUS −176,16 zł (13.10.2026).” + „Cofnij”) i kontener Netflix („Usunięto
  kontener „Netflix” – jego płatności (14) liczą się teraz jak zwykłe wydatki.”): pliki znikają od razu, w historii
  wersje „delete”, nic do Kosza. „Usunięte wpisy” → „Pokaż”: „Kontener: Netflix · usunięty 3.11.2026, 12:25 · AUDYT”,
  wyszukiwanie działa, „Przywróć” → „Przywrócono: …. Poprzednia wersja jest w historii.”; ten sam id, ścieżka i wartości;
  suma kont i masa ładunku wracają (73 610,57 zł, 31,0 %). Pusta lista: „Brak usuniętych wpisów w historii.”.
  Zrzut: DA.24-usuniete.png.

### DA.25 – ZGODNE
- Zmiany dziś z DOM-PC (CINEMA, plan) i LAPTOP (ZOOPLUS, Netflix), w danych zmiany sprzed 3 i 20 dni: „dziś” 7 wpisów,
  „7 dni” 11, „30 dni” 50; każdy wpis raz, czas, komputer, rodzaj, najnowsze najpierw, „NOWY” przy utworzonych
  w okresie; filtr „LAPTOP” – tylko jego dwa; „Zmiany” – „Przed zmianą / Teraz”: „Kwota −176,16 zł / −190,00 zł”;
  „Weź poprzednią wersję” – „Przywrócono: … – wersja z 27.10.2026, 11:00. Poprzednia wersja jest w historii.”
  (plik −176,16 zł, wersja w historii); „pokaż” otwiera operację; pusto: „Brak zmian dziś dla wybranych filtrów.”.
  Rodzaje: operacja, plan miesiąca, kontener, cel, pożyczka, saldo, dokowanie, boja, ustawienia. Zrzuty: DA.25-dzis.png,
  DA.25-zmiany.png.

### DA.26 – ZGODNE
- Kopia `-LAPTOP` dzisiejszej „Mokka” (−15,00 zł, notatka): baner „Konflikty synchronizacji: 1. Rozstrzygnij” po 1 s
  bez „Przeskanuj”, w menu „Synchronizacja 1”, w Meldunkach „1 konflikt kopii – do rozstrzygnięcia w Synchronizacji.”;
  karta „Operacja”, „Oryginał” / „Kopia” z „NOWSZA”, „Kwota −12,00 zł / −15,00 zł”, „Notatka puste / kawa z laptopa”;
  Mostek bez zmian (energia 77,28 zł, „Jedzenie 12,00 / 1 600,00 zł”). Zrzuty: DA.26-mostek.png,
  DA.26-synchronizacja.png. (Karta nie podaje, której operacji dotyczy – zob. Spostrzeżenia.)

### DA.27 – ZGODNE
- CINEMA – „Zachowaj tę wersję” przy kopii: −99,99 zł i notatka z kopii pod nazwą oryginału, `updatedBy` AUDYT
  i bieżący czas; oryginał w historii („ODRZUCONA PRZY SCALANIU”, −65,01 zł). ZOOPLUS – przy oryginale: bez zmian,
  kopia (−200,00 zł) w historii. Obie kopie poszły do Kosza (przechwycone), toast „Konflikt rozstrzygnięty – odrzucona
  wersja jest w historii wpisu (i w Koszu).”; po „Przeskanuj” zostaje tylko nierozstrzygnięty konflikt z DA.26; Mostek
  przeliczony (73 610,57 → 73 575,59 zł). Zrzut: DA.27-historia.png.

### DA.28 – NIEZGODNE (N)
- Stan: rok, przebiegi da-28 (12:27) i potwierdzenie da-28p (12:32).
- Para 1 (dobrze): kwota zmieniona tutaj (−33,33), w kopii notatka i tagi → „Scal…”: „Kwota oryginał: −33,33 zł /
  kopia: −28,15 zł” zaznaczony oryginał, „Notatka” i „tags” zaznaczona kopia; „Zapisz scalone” → „Scalono obie wersje –
  każda z nich jest w historii wpisu.”, wynik −33,33 / „notatka z laptopa” / `tags: ["laptop"]` pod id oryginału, obie
  strony w historii, kopia do Kosza.
- Para 2: kwota po obu stronach (−61,00 tutaj, −62,00 w kopii, kopia nowsza) – zaznaczona kopia (dobrze). Po otwarciu
  „Scal…” kopia zmieniona z zewnątrz (−63,00 i notatka „zmiana w trakcie”): okno **samo się odświeża** („kopia: −63,00
  zł”, nowy wiersz „Notatka”), a „Zapisz scalone” zapisuje: „Scalono obie wersje…”, wynik −63,00 / „zmiana w trakcie”.
  Odmowy i prośby o ponowne „Scal…” nie ma (oba przebiegi).
- Oczekiwane: zmiana kopii w trakcie → odmowa i prośba o ponowne „Scal…”. Niczego nie nadpisuje (obie wersje
  w historii), ale wybory mogą się zmienić pod ręką bez słowa.
- Uwaga (tekst): pole „tags” bez polskiej nazwy, wartość „1 pozycja”.
- Zrzuty: DA.28-scal-1.png, DA.28-scal-2.png, DA.28p-po-zmianie.png.

### DA.29 – ZGODNE
- 5 kopii (3 nowsze w kopii, 2 w oryginale) → „zaznacz wszystkie” → „Zaakceptuj nowsze: wszystkie (5)” → „Zaakceptowano
  nowsze wersje: 5 – odrzucone są w historii wpisów (i w Koszu).” w 3 s; każdy wpis w nowszej wersji, odrzucone
  w historii („discarded”), 0 konfliktów. Ta sama nazwa „Zaakceptuj nowsze: wszystkie (N)” w oknie „Zmiany z drugiego
  komputera” (da-32). Zrzut: DA.29-przed.png.

### DA.30 – ZGODNE
- (a) `fi-LAPTOP.json` (Jastrząb, osłony 4 pensje): różnice „Nazwa okrętu”, „Warstwy – osłony (pensje)”; „Zachowaj tę
  wersję” przy kopii → od razu menu „okręt Jastrząb”, Ustawienia „Jastrząb”, Mostek „Osłony … / 26 000,00 zł”; po
  minucie `fi.json` nadal Jastrząb / 4. (b) drugi plan 2026-11 z innym id: Plan miesiąca pokazuje jeden plan (Rozrywka
  450,00), druga wersja czeka w Synchronizacji, bez „usunięty na innym komputerze”; po wyborze kopii plan i Mostek
  999,00 zł. Zrzuty: DA.30a.png, DA.30b-plan-przed.png, DA.30b-po.png. (W różnicach planu wiersz „id” z dwoma ULID-ami.)

### DA.31 – UWAGA
- Problemy: „USZKODZONY … Uszkodzony JSON: Unterminated string…” z „Do Kosza”; „ZŁA STRUKTURA … amount: Invalid input:
  expected number, received undefined” z „Do Kosza”; zablokowany plik „USZKODZONY … Nie można odczytać pliku (OneDrive
  może go jeszcze pobierać): EBUSY: resource busy or locked, open '…'” z „Wczytaj ponownie”, bez „Do Kosza”. (a) „Do
  Kosza” → „Do Kosza na pewno” → „Plik przeniesiony do Kosza.” (przechwycone). (d) po zwolnieniu i „Wczytaj ponownie”
  wpis Apteka wraca bez restartu, plik na miejscu. Operacja v2 (c) nie trafia na listę problemów – jest na ekranach jako
  wpis tylko do odczytu z dopiskiem „zaktualizuj aplikację” (jak DA.38), bez „Do Kosza”. Reszta danych działa.
- Uwaga (tekst): plik chwilowo zablokowany ma odznakę „USZKODZONY” (oczekiwana „nieczytelny”), przyczyny parsera
  i systemu po angielsku. Zachowanie bezpieczne: nowszego ani zablokowanego nie da się wyrzucić.
- Zrzuty: DA.31-problemy.png, DA.31-po.png.

### DA.32 – ZGODNE
- (a) „Scalaj…”: zmiana CINEMA z zewnątrz (LAPTOP) widoczna w otwartym edytorze po 1 s, bez pytania. (b) „Zawsze
  pytaj…” (zapisane w `fi.json`): okno „Zmiany z drugiego komputera (1)” – „Operacja 2026-10-13: ZOOPLUS −176,16 zł · Z
  KOMPUTERA LAPTOP · BEZ TWOICH ZMIAN · NOWSZA: Z LAPTOP”, „Zmiany z LAPTOP: 2 – Kwota −176,16 zł / −188,88 zł, Notatka”;
  „Później” → chip „Zmiany z drugiego komputera: 1”; chip → „Przyjmij zmiany” → „Zastosuj” – plik z wersją LAPTOP, chip
  znika. (c) plik BOLT.EU usunięty z zewnątrz → „USUNIĘTY NA INNYM KOMPUTERZE · NOWSZE: USUNIĘCIE”, „Zachowaj (przywróć
  plik)” → plik wraca. Przy „Scalaj” usunięcie bez lokalnych zmian przyjmowane bez pytania. Zrzuty: DA.32b-okno.png,
  DA.32b-chip.png, DA.32c-okno.png.

### DA.33 – LICZBY → AU-9
- DOM-PC: operacja 23,45 zł, koperta Osobiste 380, potwierdzone saldo Portfela XTB („saldo zgodne z operacjami
  (3 918,89 zł)”), „Zakończ”. LAPTOP (nowe `userData`): Mostek co do grosza jak DOM-PC (energia 54,90 zł, suma kont
  73 587,12 zł…), widzi operację i kopertę; cel osłon 3 → 4 pensje. DOM-PC znowu: Mostek jak LAPTOP po zmianie (osłony
  19 500,00 / 26 000,00, kadłub 36 205,26 zł, zasięg 8,4 mies.), cel osłon 4; `updatedBy` – operacja, plan, saldo
  DOM-PC, `fi.json` LAPTOP; bez kopii konfliktu, jeden plan 2026-11, jeden plik gry na miesiąc; Synchronizacja
  „Ostatnia zmiana z innego komputera: LAPTOP, 3.11.2026, 12:30”. Odczyty: `odczyty\da.jsonl` (DA.33, 4 wiersze).
  Zrzut: DA.33-dom-powrot.png.

### DA.34 – ZGODNE
- Plik obecności LAPTOP pisany z zewnątrz: (1) „LAPTOP – w użyciu, sygnał 12:32, ostatni ruch w oknie 12:32”, baner „Ten
  folder jest też w użyciu na: LAPTOP (ruch w oknie w ostatnich 10 min)…”, Ustawienia „Folder otwarty też na: LAPTOP (w
  użyciu)”; (2) „LAPTOP – w zasobniku, …, ostatni ruch w oknie 12:18”, bez banera; (3) wersja bez ruchu, sygnał sprzed
  2 min – „w użyciu” z banerem; (4) sygnał sprzed 12 min – LAPTOP znika. Zrzuty: DA.34-1.png … DA.34-4.png.

### DA.35 – ZGODNE
- Stan: rok, dni gry 31.10–02.11 niezamrożone (ostatnie zamrożenie 30.10), w kopii ICTTJ cel „Wkład własny – mieszkanie”
  40 000 → 45 000; DOM-PC uruchomiony bez ruchu i schowany do zasobnika, LAPTOP „w użyciu” (obecność z zewnątrz co 3 s);
  przebieg da-35, 12:36–12:54.
- Przez 15 min w zasobniku: pliki `game/` i `goals/` bez zmian (czasy plików sprzed startu), obecność DOM-PC
  `activeAt: null`, odświeżana co 5 min. Po pokazaniu okna i ruchu myszą (902 s po otwarciu, LAPTOP przestaje
  bić): w ciągu 10 s 31.10 i 01.11 zamrożone, cel ICTTJ przepisany na 45 000 zł (`updatedBy` DOM-PC). 02.11 (wczoraj)
  niezamrożony przez 150 s – tak samo jak w stanie persony (obszar gry).

### DA.36 – ZGODNE
- Stan: rok, DOM-PC uruchomiony bez ruchu i schowany do zasobnika, LAPTOP „w użyciu” (obecność z zewnątrz); przebieg
  da-36, 12:56–13:03; zapis prób powiadomień.
- Na starcie okno jest pokazane (dla aplikacji – otwarte), więc przychodzą powiadomienia dnia (odprawa, asteroida, raty,
  kontenery…). Potem, przy LAPTOP w użyciu, wydatek 300 zł dziś z LAPTOP (ponad przydział dnia, nowy kontrahent) –
  przez 2,5 min żadnego powiadomienia o nim (tylko jednorazowe „Financial Intel działa w zasobniku…”). LAPTOP
  w zasobniku i nowy powód (Zwierzęta 250 zł przy kopercie 200 zł): „Koperta Zwierzęta przekroczona: Wydane 250,00 zł
  z 200,00 zł – ponad próg poważnego naruszenia.” i „Nieznany sygnał na radarze – Nowy kontrahent: Weterynarz
  z laptopa…”; powód z czasu „w użyciu” nie wraca. Po ponownym uruchomieniu DOM-PC – żadnego powiadomienia.

### DA.37 – poza laboratorium (Kto: Ty)

### DA.38 – ZGODNE
- Operacja, kontener, cel i plan v2 z nieznanym polem: każdy z dopiskiem „Ten wpis zapisała nowsza wersja aplikacji
  (na drugim komputerze) – ta wersja go nie zmieni. Zaktualizuj aplikację (Ustawienia → Aktualizacje).”; pola
  wyłączone, usuwania nie ma; zmiana zbiorcza 32 operacji: „Dom: 31 operacji, bez zmian (zapisane przez nowszą wersję
  aplikacji): 1.”; zamknięcie bez pytania; 4 pliki v2 bajt w bajt, nieznane pole zostało. Zrzuty: DA.38-*.png.

### DA.39 – NIEZGODNE (N)
- Stan: rok z `fi.json` v2, przebiegi da-39 (12:26) i potwierdzenie da-39p (12:32).
- Widać (dobrze): baner „Folder danych ma format v2, a ta wersja aplikacji obsługuje v1. Zaktualizuj aplikację - do
  tego czasu dane są tylko do odczytu.”, wskaźnik „tylko odczyt”; Ctrl+N – „Folder jest tylko do odczytu – zmiany nie
  są zapisywane.”; Ustawienia „Folder jest tylko do odczytu – ustawienia budżetu można tylko oglądać.”, pola wyłączone;
  koperty i pensja wyłączone; „zaznacz wszystkie” w Operacjach wyłączone; szybki wpis po „Zapisz” – „Folder jest tylko
  do odczytu.”; import – „Folder tylko do odczytu”, „Importuj” wyłączone; rozmiar okna (Ctrl+=) zapisany w `config.json`
  (1 → 1,1); żaden plik danych się nie zmienił, bez migracji.
- Widać (źle): **Ctrl+S → „Zapisano. (Zapis jest automatyczny – Ctrl+S nie jest potrzebne.)”** (oba przebiegi).
- Oczekiwane: „Folder jest tylko do odczytu” zamiast sukcesu (punkt: „komunikat sukcesu bez zapisu (N2)”).
- Zrzuty: DA.39-mostek.png, DA.39p-ctrl-s.png, DA.39-import.png.

### DA.40 – NIEZGODNE (K)
- Stan: rok, przebiegi da-40 (12:28) i potwierdzenie da-40p (12:38).
- Zrobione: przy otwartej aplikacji nazwa folderu danych zmieniona z zewnątrz; 90 s bez działań; szybki wpis 7 zł;
  edycja kwoty „Lody Grycan”; potem (da-40p) folder utworzony przez aplikację odsunięty i oryginał przywrócony.
- Widać: **żadnego banera „Folder danych jest niedostępny…” ani wskaźnika „tylko odczyt”** (przez 90 s i dalej –
  „zapis automatyczny”). **Po ~30 s w starej ścieżce powstaje folder `dane\.presence\AUDYT.json`** (aplikacja odtwarza
  folder sama, bez żadnego działania). Szybki wpis: „Zapisano.” – plik `transactions/2026/2026-11-03_01M6GKEWG1….json`
  w tym nowym folderze. Edycja istniejącej operacji: okno „Zmiany z drugiego komputera (1) – Operacja 2026-10-30: Lody
  Grycan −31,31 zł · USUNIĘTY NA INNYM KOMPUTERZE · MASZ NIEZAPISANE ZMIANY” i „błąd zapisu – ponów”; w `main.log`
  jeden wpis „ERROR saveRecord RemovedOutsideError: Ten wpis został właśnie usunięty na innym komputerze…”. Po powrocie
  oryginału chip i błąd znikają w 30 s, edycja Grycan zapisana (−31,31) – ale **wpis z szybkiego wpisu nie trafia do
  budżetu** (został w folderze odtworzonym przez aplikację).
- Oczekiwane: w kilkanaście sekund baner o niedostępnym folderze, „tylko odczyt”, żadna akcja nie udaje sukcesu;
  w starej ścieżce nie powstaje nowy folder; po powrocie dane pełne. Punkt: „aplikacja zakłada pusty folder w starej
  ścieżce (K)”.
- Zrzuty: DA.40-proby.png, DA.40p-po-90s.png, DA.40p-edycja.png, DA.40p-po-powrocie.png.

### DA.41 – NIEZGODNE (S)
- Stan: rok, przebiegi da-41 i da-41b (12:30–12:35).
- Zrobione: kwota 33,33 (da-41b: 44,44) w edytorze „Lody Grycan”, nazwa folderu zmieniona, wyjście z pola (Enter);
  da-41: „Zakończ” → „Anuluj”, folder przywrócony, czekanie 134 s, „Zakończ” → „Zamknij mimo to”; da-41b: folder
  przywrócony po 3 s, czekanie 134 s, „Zakończ”.
- Widać: po wyjściu z pola nic (bez toastu, bez banera). Pytanie przy zamknięciu: „Zmiany z drugiego komputera –
  Zdecyduj o zmianach z drugiego komputera (1). Te wpisy zmieniono tutaj i na drugim komputerze – … „Zamknij mimo to”
  zostawia na dysku wersję z drugiego komputera, a zmiany stąd przepadają.” („Anuluj” zostawia aplikację – dobrze).
  **Po powrocie folderu zmiana nie zapisuje się sama** (oba przebiegi: plik −28,60 po 134 s); drugie zamknięcie znowu
  pyta (`main.log`: „zamykanie: niezapisane zmiany (decyzje: 1 …)”), „Zamknij mimo to” – kwota przepada.
- Oczekiwane: pytanie „Niezapisane zmiany” z przyczyną „Folder danych może być niedostępny…”; po powrocie folderu zmiana
  zapisuje się sama, zamknięcie bez pytania. Tu przyczyna fałszywa (drugi komputer), a wybór „Zamknij mimo to”, który
  ona podsuwa, gubi zmianę.
- Zrzut: DA.41-anuluj.png.

### DA.42 – ZGODNE
- Plik „Lody Grycan” usunięty z zewnątrz w trakcie edycji, notatka zmieniona: okno „Zmiany z drugiego komputera (1) –
  … USUNIĘTY NA INNYM KOMPUTERZE · MASZ NIEZAPISANE ZMIANY” z „Usuń też tutaj” / „Zachowaj (przywróć plik)”; „Zachowaj”
  → plik wraca z nową notatką; przy „Mokka” „Usuń też tutaj” → wpis znika z ekranu. Zrzuty: DA.42-zachowaj.png,
  DA.42-usu_.png.

### DA.43 – NIEZGODNE (K)
- Stan: rok, przebiegi da-43 (12:36) i potwierdzenie da-43p (12:38).
- Zrobione: 10 razy – kwota wpisana w edytorze i od razu zamknięcie (bez wyjścia z pola); zmiana kategorii 43 (da-43)
  i 982 (da-43p) zaznaczonych operacji i od razu zamknięcie; import i od razu zamknięcie; ponowny start.
- Widać: operacje Portfela XTB / gotówki (Lody Grycan, Mokka, Apteka) – kwota w pliku, zamknięcie w 0,2 s bez pytania;
  notatka operacji z banku – w pliku; zmiana zbiorcza (982 operacje, zapis 19 s) i import – w plikach, bez pytania.
  **Kwota operacji z mBanku (CINEMA CITY, ZOOPLUS, FRYZJER STYL, DROGERIA NATURA, Rossmann, BOLT.EU, NETIA SA) przepada
  po cichu**: 7 z 7 (da-43) i 1 z 1 (da-43p, „A”) – plik bez zmian, bez pytania, w `main.log` tylko „zamykanie: okno
  zamknięte”. Tak samo, gdy po Enter wisi już pytanie „Zmienić operację? … Kwota pochodzi z banku (−87,91 zł) – po
  zmianie operacja nie zgodzi się z wyciągiem. … Anuluj / Zmień mimo to” – zamknięcie bez słowa, zmiana przepada.
- Oczekiwane: aplikacja zamyka się bez pytania i każda zmiana jest w pliku – albo (przy operacji z banku) pyta; punkt:
  „utracona ostatnia zmiana (K)”.
- Zrzut: DA.43p-pytanie.png.

### DA.44 – ZGODNE
- Stan: rok, „Zawsze pytaj przed przyjęciem zmian”, przebieg da-44 (13:03).
- Zmiana CINEMA z zewnątrz → „Później” → chip „Zmiany z drugiego komputera: 1”; notatka zmieniona tutaj czeka.
  „Kopia teraz”: „Czekają zmiany z drugiego komputera (1) – kopia czeka na Twoją decyzję w otwartym oknie.”;
  „Otwórz inny folder…”: „Czekają zmiany z drugiego komputera (1) – zmiana folderu czeka na Twoją decyzję w otwartym
  oknie. Folder nie został zmieniony.”. Zamknięcie: „Zdecyduj o zmianach z drugiego komputera (1).” z wyjaśnieniem
  „„Anuluj” zostawia aplikację otwartą z tym oknem; „Zamknij mimo to” zostawia na dysku wersję z drugiego komputera,
  a zmiany stąd przepadają.”; „Anuluj” – aplikacja działa z oknem decyzji; „Zamknij mimo to” – w pliku wersja LAPTOP
  (−70,20 zł, „z laptopa”). Bez komunikatu o zablokowanym pliku. Zrzuty: DA.44-folder.png, DA.44-anuluj.png.

### DA.45 – ZGODNE
- (a) Ctrl+N bez wpisywania, Ctrl+1 – 982 → 982 operacji, bez pustej 0 zł. (b) Ctrl+N, 17,17 bez wyjścia z pola,
  Ctrl+4 – nowa operacja 17,17 zł z dziś w pliku. (c) „Nowy kontener” (pusty formularz z datą 03.11.2026), „Nowy cel”,
  „Nowa pożyczka”, łupy „na następny miesiąc” 100 – po zmianie ekranu i powrocie tekst i kwota czekają. (d) po zmianie
  folderu na `start` i powrocie oraz po ponownym uruchomieniu formularze puste. Zrzut: DA.45-lupy.png.

### DA.46 – ZGODNE
- Pole `x-audyt` w operacji, kontenerze, `fi.json` (i w `settings`): po edycji notatki, kwoty kontenera (49,99) i nazwy
  okrętu – zostaje; JSON z wcięciem 2 i `\n` (1036 plików, 0 złych); `updatedAt` UTC, `updatedBy` DOM-PC; nowa
  operacja `2026-11-03_01M6GKBNAT….json` (data warszawska + ULID), kwota −880; kwoty całkowite; bez plików
  tymczasowych. (Wpisanie „12,345” w kwotę zostało po cichu odrzucone – pole wróciło do 28,60.)

## Znaleziska

- DA.40 – NIEZGODNE (K): zniknięcie folderu danych nie jest rozpoznawane – brak banera i „tylko odczyt”, aplikacja
  po ~30 s odtwarza folder w starej ścieżce (`.presence`), szybki wpis „Zapisano.” trafia do tego folderu i po powrocie
  oryginału nie ma go w budżecie; edycje stają się „usunięty na innym komputerze”.
- DA.43 – NIEZGODNE (K): zamknięcie zaraz po wpisaniu kwoty operacji z banku gubi zmianę po cichu (także gdy wisi już
  pytanie „Zmienić operację?”); inne pola i operacje spoza banku zapisują się.
- DA.3 – NIEZGODNE (S): przy brakującym zapamiętanym folderze ekran nie ponawia otwarcia (co 30 s) – po powrocie folderu
  trzeba kliknąć „Spróbuj ponownie”.
- DA.41 – NIEZGODNE (S): zmiana wpisana tuż przed zniknięciem folderu – pytanie przy zamknięciu podaje fałszywą
  przyczynę („Zmiany z drugiego komputera”), po powrocie folderu zmiana nie zapisuje się sama; „Zamknij mimo to” ją gubi.
- DA.7 – NIEZGODNE (N): szybki wpis w trakcie zmiany folderu nie odmawia – pokazuje dane starego folderu, a zapis
  trafia do nowego.
- DA.28 – NIEZGODNE (N): kopia zmieniona w trakcie „Scal…” – zamiast odmowy okno samo się odświeża i zapisuje nową wersję.
- DA.39 – NIEZGODNE (N): Ctrl+S w folderze tylko do odczytu mówi „Zapisano.”.

## Spostrzeżenia

1. **Dostępność folderu.** Folder danych sprawdzany jest tylko przy otwieraniu: znikający w trakcie pracy folder
   (odłączony dysk, przeniesienie, OneDrive) nie daje stanu „niedostępny”; zapisy w tle (obecność co minutę) odtwarzają
   folder w starej ścieżce, a każdy edytowany wpis wygląda jak „usunięty na innym komputerze” (DA.40, DA.41). Ekran
   startowy przy brakującym folderze nie ponawia (DA.3). Do rozważenia jedna kontrola „folder jest” (korzeń + `fi.json`)
   przed każdym zapisem, baner i automatyczne wznowienie.
2. **Komunikaty z surowym tekstem systemu po angielsku**: „ENOENT: no such file or directory, mkdir '\\?'”, „EBUSY:
   resource busy or locked, open '…'”, „End of central directory record signature not found…”, „Unterminated string
   in JSON at position …”, „amount: Invalid input: expected number, received undefined” (DA.8, DA.15, DA.20, DA.31).
   Typowe kody (ENOENT, EBUSY, EPERM, uszkodzony ZIP / JSON) warto tłumaczyć na zdanie po polsku, szczegół zostawić
   w logu.
3. **Czytelność różnic i konfliktów.** Karta konfliktu w Synchronizacji pokazuje tylko nazwy plików z ULID-em
   („2026-10-14_01M6GDM914YEJ2RP70WV1T1NF8.json”) – bez kontrahenta, daty i kwoty, więc nie wiadomo, której operacji
   dotyczy (DA.26–DA.29); w różnicach surowe klucze i wartości: „tags” / „1 pozycja” (DA.28), „id” z dwoma ULID-ami
   (DA.30), „Dane z banku: {"format":"mbank",…}” (DA.23), „Masa od dnia 2026-11-03T11:24:23.355Z” (DA.22); tytuły
   z datą ISO („Operacja 2026-10-13: …”) w odzyskaniu, historii, dzienniku i oknie zmian; „1 plan miesiąca zmieniona”
   (DA.17); wersja odrzucona przez „Zachowaj tę wersję” opisana w historii jako „ODRZUCONA PRZY SCALANIU” (DA.27).
4. **Zamknięcie z pytaniem „Zmienić operację?”** – pytanie o kwotę operacji z banku żyje tylko w edytorze; zamknięcie,
   zmiana ekranu czy folderu nie wiedzą o nim (DA.43). Najprościej: zmiana czekająca na to pytanie liczona jak
   niezapisana (przyczyna w pytaniu przy zamknięciu).
5. **Rotacje bez informacji**: ręczne kopie (5) – Ustawienia o nich milczą (DA.11); paczki importu (10) – przy 11.
   imporcie znika `imports/…` najstarszego importu, więc jego „Cofnij import” przepada bez słowa (DA.12, persona: import
   908 wierszy); po zmianie folderu kopii lista pokazuje „Brak kopii.” i „Ostatnia kopia” znika, choć wcześniejsze kopie
   leżą w starym folderze (DA.14); „Weź ustawienia z historii” bierze najnowszą wersję z historii, a ustawienia zmienione
   po niej (tu: reguły importu, domownicy, ICTTJ) przepadają bez wskazania, czego brakuje (DA.8).
6. Drobne: odznaka „USZKODZONY” dla pliku tylko chwilowo zablokowanego (DA.31); okno odzyskania zapowiada nazwę „… –
   kopia z 3.11.2026, 10:59:46”, a folder ma „… – kopia z 2026-11-03 10.59” (DA.19); w kopii z wpisem nowszej wersji ten
   wpis liczony jako „Dodane po kopii” (DA.20); kwota z trzema miejscami po przecinku („12,345”) odrzucana bez słowa
   (DA.46); baner wersji nowszej z „-” zamiast „–” (DA.39); przyciski „Nowa operacja” i „Szybki wpis” na Mostku
   wyglądają na aktywne w folderze tylko do odczytu (DA.39).

## Problemy laboratorium

- `start()` przekazuje `launch()` z `tests/e2e/app.ts`, które ustawia `FI_FREEZE_AFTER_OPEN_MS=0` i
  `FI_FREEZE_QUIET_MS=0` – w przebiegach laboratorium dni gry zamrażają się od razu po otwarciu, a nie po 3 min / 1 min
  ciszy jak w wydaniu. Obszar DA przekazywał wartości wydania; inne obszary (gra, Mostek) mogą to mieć w odczytach.
- `start()` zawsze pokazuje okno (poza ekranem) – aplikacja uznaje je za „otwarte” (powiadomienia jak przy otwarciu)
  także przy `idle: true`; komputer „w zasobniku” (DA.35, DA.36) uzyskany zamknięciem okna do zasobnika
  (`BrowserWindow.close()` przy „Zamykaj do zasobnika”).
- Laboratorium nie przechwytuje `shell.trashItem` – rozstrzygnięcie konfliktu, „Zaakceptuj nowsze” i „Do Kosza”
  przeniosłyby pliki do Kosza Windows użytkownika. Obszar DA podmieniał je w każdym przebiegu (`trap` w `da-pomoc.ts`,
  sprawdzone przed użyciem) – warto przenieść to do `guard()` w `lab.ts`.
- Dwa zamknięcia (da-18, da-29, ta sama sekunda 12:21:40, przy 3–4 przebiegach naraz) przekroczyły 40 s mimo „koniec
  pracy” w `main.log` – zakończone `killTree`; niepowtarzalne, uznane za obciążenie maszyny.
- Brak fikstury `C:\FI-audyt\ictj\` (DA.4) i stanu `dwa-komputery` – użyte kopie `stany\ictj-rok` i dwa przebiegi na
  kopii `rok`. Kontrahenci persony się powtarzają – skrypty wskazują operacje po id (`OP` w `da-pomoc.ts`).
