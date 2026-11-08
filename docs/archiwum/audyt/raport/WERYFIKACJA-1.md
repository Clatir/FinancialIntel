# Weryfikacja sceptyczna – W1 (AU-11, krok 3)

- Data: 03.11.2026, 20:00–22:20 (zegar prawdziwy, Warszawa; dzień = kotwica persony). Weryfikator W1 (Opus 5.5 · xhigh).
- Wersja: Financial Intel 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4`), `tests/audyt/lab.ts` (bez zmian).
- Stany: `rok` (odnowiony 03.11 ok. 15:17; **każdy przebieg na świeżej kopii**), stany szczególne zbudowane na kopii `rok`
  i opisane przy punktach. Stanów `rok-ab` i `start` nie było potrzeba.
- Skrypty: `tests/audyt/w1-*.spec.ts` (`w1-im42`, `w1-im39`, `w1-im23`, `w1-da40`, `w1-da43`, `w1-dm18`, `w1-mg`, `w1-mo29`, `w1-p1`, `w1-p1b`), pomocnik `tests/audyt/w1-pomoc.ts` (DM.18 i IM.23 biorą też gotowe funkcje odczytu
  z `dm-pomoc.ts` / `im-pomoc.ts` – tylko import, bez zmian). Dzienniki: `C:\FI-audyt\przebiegi\w1-*\w1.log`
  (P.1 – `C:\FI-audyt\przebiegi\w1\przebieg.log`), zrzuty `C:\FI-audyt\zrzuty\W1-*.png`.
- Uruchomienie (PowerShell, katalog repozytorium):
  `$env:Path = "$PWD\.tools\node-v24.21.0-win-x64;$env:Path"; $env:FI_AUDIT_OUT='w1-x'; npx playwright test -c playwright.audyt.config.ts w1-<plik>.spec.ts`
  (P.1: `$env:W1_P1='110b,106b'` – dni gry i `b` = sam `fi.json` / `f` = pełna persona; `$env:W1_FREEZE0='1'` – dni gry
  zamrażane od razu).
- Metoda: każde znalezisko najpierw odtworzone w wydanej aplikacji (własny skrypt, nie skrypt obszaru, z kontrolą tam, gdzie
  się dało), dopiero potem przyczyna w `src/`. Kod nie zmieniony.

## Werdykty

| Znalezisko | Werdykt | Waga przed | Waga po | Przyczyna (plik:linia) | Poprawka |
| --- | --- | --- | --- | --- | --- |
| IM.42 | POTWIERDZONE | K | **K** | `renderer/features/import/state.ts:209-213`, `shared/import/reconcile.ts:469-487`, `:610` | M |
| DA.40 | POTWIERDZONE | K | **K** | `main/datastore/store.ts:1036-1040`, `:1181`, `main/datastore/atomic.ts:42`, `main/datastore/watch.ts:64` | M |
| DA.43 | POTWIERDZONE (szerzej: też opuszczenie ekranu) | K | **W** | `renderer/features/operations/OperationEditor.tsx:96-106`, `renderer/store/data.ts:1176` | S–M |
| DM.18 | POTWIERDZONE częściowo (warstwy dobre, przychód zły) | K | **S** | `shared/calc/income.ts:52-70` (warstwy: `shared/calc/fleet.ts:1126-1137` – dobrze) | S |
| MG.8 / MG.10 | POTWIERDZONE – błąd reguły technicznej T129, nie liczenia | K | **K** | `shared/calc/fleet.ts:1304-1323` (`slot: 4`) | M |
| IM.23 = P.3 | POTWIERDZONE (W) + WYMAGANIE (S4) | W | **W** | `renderer/features/import/options.ts:150-153`, `shared/calc/household.ts:559-563` | S (+ naprawa danych) |
| IM.39 | POTWIERDZONE (ta sama luka co IM.42) | W | **W** | `shared/import/reconcile.ts:416-447`, `:469-475`, `:336-347` | M (z IM.42) |
| P.1 | POTWIERDZONE z poprawionym opisem (zaległość zamrażania > ~100 dni, nie długość gry; każdy ekran) | W | **S** | `renderer/store/game.ts:47`, `:89-110` | S |
| MO.29 = DO.7 | POTWIERDZONE | W | **W** | brak funkcji: `renderer/features/dock/DockingDialog.tsx:134-143`; CHANGELOG 1.15.2 (wiersz 33) | S |

Pilne (pieniądze i dane): **DA.40** (wpisy z „Zapisano.” trafiają do folderu-widma), **IM.42** (usunięta operacja wraca
do salda bez słowa), **MG.8 / MG.10** (zła kwota w warstwach, trwała); potem DA.43 i IM.23 (cicha utrata zmiany /
zła interpretacja zapamiętanego wyboru osoby).

---

## IM.42 – POTWIERDZONE, K → K

**Odtworzenie** (`w1-im42.spec.ts`, przebieg `w1-im42`, 21:18–21:20):
1. Świeża kopia `rok`. Plik listy zrobiony z `C:\FI-audyt\pliki\im\L1.csv` bajt w bajt (Windows-1250, CRLF): nagłówek
   z okresem 19.10.2026–26.10.2026 i tylko 17 wierszy z tych dni – wszystkie to operacje persony zaimportowane wcześniej
   z historii rachunku (`W1-lista-1910-2610.csv` w katalogu przebiegu).
2. W folderze przed: `2026-10-25 mBank expense -3195 „ZABKA Z1234” bank={"s":"historia"}`.
3. Operacje → cała historia → szukaj „31,95” → „25.10 nd ZABKA Z1234 mBank Jedzenie · zakupy spożywcze −31,95” → Usuń →
   potwierdź. W folderze: brak; operacji 982 → 981.
4. **Kontrola (ten sam format):** Import → `rok-historia.csv` → liczniki `known 907 · deleted 1`, tekst „usunięte przez
   Ciebie wcześniej (pominięte)” – zamknięty bez importu (zrzut `W1-IM.42-kontrola-historia.png`).
5. **Drugi format:** Import → lista 19–26.10 → liczniki `new 1 · known 16 · other-format 16`, **bez** „usunięte przez
   Ciebie” (zrzut `W1-IM.42-lista-podglad.png`) → „Importuj” → „Nowe: 1 · połączone z wpisami: 0 · rozliczone: 0 ·
   usunięte: 0” (`W1-IM.42-lista-wynik.png`).
6. W folderze znowu `2026-10-25 mBank expense -3195 „ZABKA Z1234” bank={"s":"lista"}` (nowy id), w Operacjach wiersz
   „25.10 nd ZABKA Z1234 … −31,95” (`W1-IM.42-operacje-po.png`); operacji 981 → 982.

**Przyczyna.** Usunięte operacje z banku zna import tylko po `bank.key` ostatniej wersji z `.history/`
(`renderer/features/import/state.ts:209-213` – `deletedKeys.add(key)`; opis wiersza zapamiętywany jest tylko dla
nierozliczonych, `deletedPending`). Klucz wiersza zależy od formatu pliku, więc wiersz listy usuniętej operacji z historii
ma inny klucz. Parowanie dwóch formatów (B5, T134) działa tylko na istniejących operacjach (`shared/import/reconcile.ts:469-487`,
`budget.booked`), a status „usunięte” daje tylko zgodny klucz (`reconcile.ts:610`). T39 (usunięta nie wraca) i T134 (dwa
formaty) nie spotykają się w kodzie.

**Poprawka (M) i test.** Zapamiętywać usunięte operacje z banku z opisem (konto, data, kwota, nazwa, format – jak
`DeletedPending`) i parować je z wierszami drugiego formatu tą samą miarą co B5 (±3 dni, kwota, podobna nazwa, okres
pliku) → status „deleted”; do `deletedKeys` dopisać też `bank.altKeys`. Test unit (`planImport`: usunięta operacja
z historii + wiersz listy → `deleted`; kontrola: inna operacja tej samej kwoty poza okresem → `new`) i e2e (historia →
usuń → lista → „usunięte przez Ciebie wcześniej (pominięte): 1”). Bez migracji; u użytkownika, który już to przeszedł,
operacje „wróciły” – można je wskazać (operacja z listy o tożsamości B5 usuniętej z historii) jako meldunek, nie naprawiać
samemu.

**Uwagi.** Waga K utrzymana: kwota wraca do salda i warstw bez ostrzeżenia, a droga (historia, potem lista – zalecany
eksport) jest zwykła. Ta sama luka (tożsamość wiersza między formatami poza parowaniem istniejących operacji) daje IM.39.

## DA.40 – POTWIERDZONE, K → K

**Odtworzenie** (`w1-da40.spec.ts`, przebieg `w1-da40`, 21:08–21:12):
1. Świeża kopia `rok`, aplikacja na Mostku. Z zewnątrz `dane` → `dane-odlaczony` (21:10:07).
2. Co 5 s przez 45 s: okno bez zmian (menu, Mostek), **0 wystąpień „niedostępny”**, brak wskaźnika „tylko odczyt”;
   stara ścieżka – brak (zrzut `W1-DA.40-po-45s.png`).
3. Szybki wpis (`window.fi.quickOpen()`): 7 zł, „W1 wpis bez folderu” → komunikat **„Zapisano.”**
4. W starej ścieżce powstał folder: `transactions/2026/2026-11-03_01M6HGJE7WG87GV93ZDW48FPK6.json` i
   `.presence/.AUDYT.json.tmp-…` – aplikacja sama odtworzyła folder danych i zapisała w nim wpis.
5. Folder aplikacji odsunięty (`dane-utworzony-przez-aplikacje`), oryginał przywrócony (po 56 s). Przez 60 s po powrocie:
   wpisu „W1 wpis bez folderu” w oryginale **nie ma** (zrzut `W1-DA.40-po-powrocie.png`).

Różnica wobec raportu DA: w moim przebiegu przez 45 s bez działań folder nie powstał (u DA `.presence` po ~30 s) –
powstał przy pierwszym zapisie. Mechanizm i skutek te same.

**Przyczyna.** Dostępność folderu (`available`) jest liczona tylko w `refreshInQueue` (`main/datastore/store.ts:1036-1040`),
czyli po zdarzeniu obserwatora albo pełnym sprawdzeniu – w trybie natywnym co 5 min (`main/datastore/watch.ts:64`).
Na Windows rekurencyjny `fs.watch` na przemianowanym folderze nie zgłasza błędu ani zdarzenia (uchwyt idzie za katalogiem),
więc flaga zostaje `true`; `assertWritable` (`store.ts:1181`) przepuszcza zapis, a `writeFileAtomic` robi
`fs.mkdir(dirname(target), { recursive: true })` (`main/datastore/atomic.ts:42`) – odtwarza brakujący folder danych
i podfolder kolekcji. Tak samo zapis obecności (`.presence`).

**Poprawka (M) i test.** (1) Zapis nigdy nie tworzy folderu danych: `mkdir` tylko poniżej istniejącego korzenia z `fi.json`
(brak → błąd „niedostępny”, wpis zostaje niezapisany w oknie); (2) przed każdą paczką zapisów i co kilka sekund w spoczynku
tani test korzenia (`fi.json` istnieje) → `available=false` + baner. Test fs (`tests/fs`): store otwarty, korzeń
przemianowany → `saveRecord` rzuca `ReadOnlyError`, korzeń nie powstaje, `status().available === false` w N s; po powrocie
zapis działa. E2E: baner i „tylko odczyt”. Bez migracji. U użytkownika mogą istnieć foldery-widma ze starych zdarzeń – nie
do naprawy automatycznej (można przy otwarciu ostrzec o folderze danych bez `fi.json` z rekordami).

**Uwagi.** K utrzymane: „Zapisano.” przy wpisie, który nie trafia do budżetu, i nowy folder w starej ścieżce (punkt wprost:
„aplikacja zakłada pusty folder w starej ścieżce (K)”). Szczególnie groźne przy aplikacji żyjącej tygodniami w zasobniku
i szybkim wpisie z globalnego skrótu. Powiązane: DA.41 (fałszywa przyczyna „drugi komputer”).

## DA.43 – POTWIERDZONE, K → W

**Odtworzenie** (`w1-da43.spec.ts`, przebieg `w1-da43`, 21:35–21:40; jedna kopia `rok`, ponowny start między
przypadkami; okna systemowe (`dialog.showMessageBox*`) przechwytywane i zapisywane – żadnego nie było):

| Przypadek | Wpisano | W pliku przed → po | Pytanie |
| --- | --- | --- | --- |
| A: CINEMA CITY 14.10 (mBank, z banku) – kwota bez wyjścia z pola, „Zakończ” (`app.quit`) | 104,04 | −6 501 → **−6 501** | brak; `main.log`: tylko „zamykanie: okno zamknięte” |
| B (kontrola): Lody Grycan 30.10 (Portfel XTB, ręczna) – tak samo | 101,01 | −2 860 → **−10 101** | brak |
| C: FRYZJER STYL 19.10 (mBank) – kwota + Enter, w oknie pytanie „ZMIENIĆ OPERACJĘ? To zmieni potwierdzone saldo konta mBank z 26.10.2026 o −18,15 zł i stan osłon. Kwota pochodzi z banku (−87,91 zł) – po zmianie operacja nie zgodzi się z wyciągiem. … Anuluj / Zmień mimo to”, potem „Zakończ” | 106,06 | −8 791 → **−8 791** | brak (zamknięcie trwało 49 s; narzędzie zgłosiło „Aplikacja nie zamknęła się w 40 s”) |
| D: CINEMA CITY – kwota bez wyjścia z pola, **Ctrl+1** (opuszczenie ekranu, bez zamykania) | 103,03 | −6 501 → **−6 501** (po 2,5 s i po zamknięciu) | brak w oknie |

Zrzuty: `W1-DA.43-pytanie.png`, `W1-DA.43-opuszczenie.png`.

**Przyczyna.** Zmiana, która zmienia potwierdzone saldo albo kwotę z banku, nie idzie do magazynu, tylko do lokalnego stanu
edytora `ask` (`renderer/features/operations/OperationEditor.tsx:96-106` – `setAsk({ run: () => void updateRecord(…) … })`).
Zatwierdzenie pola przy zamykaniu / odmontowaniu edytora kończy się na `setAsk`, a `flushForClose`
(`renderer/store/data.ts:1176`) i pytanie procesu głównego widzą tylko niezapisane rekordy magazynu – „wszystko zapisane”,
okno się zamyka, pytanie i zmiana znikają razem z edytorem. Dotyczy każdej zmiany kwoty / daty / konta operacji
w okresie potwierdzonego salda, nie tylko kwot z banku (pytanie z `confirmedChanges`).

**Poprawka (S–M) i test.** Zmiana czekająca na „Zmień mimo to” ma być „niezapisaną zmianą” znaną `unsavedReport`
(zamknięcie pyta z prawdziwą przyczyną: „Zmiana kwoty operacji z banku czeka na potwierdzenie”), a odmontowanie edytora
z czekającym pytaniem – zostawić edytor albo pokazać pytanie przed przejściem. Test e2e: wpisz kwotę operacji z banku →
`app.close()` → proces główny pyta (zapis w `main.log`) albo po „Zmień mimo to” kwota w pliku; drugi – Ctrl+1 z wpisaną
kwotą → pytanie zostaje. Bez migracji.

**Uwagi (waga).** Obniżam K → W: przepada tylko niezatwierdzona zmiana, która i tak wymaga potwierdzenia, na dysku zostaje
wersja zgodna z bankiem, nic zapisanego nie ginie. Ale obejmuje też zwykłe opuszczenie ekranu (D – sprzeczne z zasadą
„opuszczenie ekranu nigdy nie gubi zmian”) i każdą operację w okresie potwierdzonego salda (salda potwierdza się co tydzień),
więc nie S. Jeśli użytkownik uzna utratę wpisanej zmiany bez słowa za utratę danych w rozumieniu planu – K.

## DM.18 – POTWIERDZONE częściowo, K → S

**Odtworzenie** (`w1-dm18.spec.ts`, przebiegi `w1-dm18a` 21:14 i `w1-dm18b` 21:40):
- A (czysty `rok`, tylko okno): Radar → „Pożyczka dla Tomka” (udzielona 2 000, „oddane 1 000,00 zł z 2 000,00 zł”) →
  „spłata otrzymana” 1 050 → „Spłata 1 050,00 zł zapisana.” Osłony 13 000,00 → **14 050,00** / 19 500,00, kadłub bez
  zmian, „oddane 2 050,00 zł z 2 000,00 zł”, Debriefing listopad „Bilans paliwa (przychód − koszty netto) −12,00 zł” →
  **−12,00 zł**. Kontrola: zwykły wpływ 50 zł (Operacje, Wpływ) → osłony 14 100,00, „Bilans paliwa … **+38,00 zł**”.
  Zrzuty `W1-DM.18-radar-tomek.png`, `W1-DM.18-debriefing.png`.
- B (`rok` + pożyczka udzielona sprzed startu budżetu, bez wypływu: „Pożyczka dla brata” 10 000 zł z 01.06.2025, rata
  10 500 zł – plik `loans/01KW1M00000000000000000001.json` dopisany przed startem): „spłata otrzymana” 10 500 → osłony
  13 000,00 → **23 000,00** / 19 500,00 („wolne do decyzji: 3 500,00 zł”), kadłub 39 066,30 → **39 185,22** / 39 185,22,
  cele 8 138,96 → **8 520,04**; „Bilans paliwa … −12,00 zł” bez zmian. Zrzut `W1-DM.18-brat-mostek.png`.

Wniosek: 10 000 wraca do osłon, a 500 odsetek **dokuje** według D13 (osłony pełne → kadłub +118,92 → cele +381,08) – warstwy
zgodne z T70. W przebiegu DM (osłony poniżej celu) dokowanie też kończyło w osłonach, stąd wrażenie „jak spłata”. Zgodnie
z raportem DM: odsetki nie są przychodem – „Bilans paliwa” (i średnie „Przychody”, ostrzeżenie o pensji) bez nich.

**Przyczyna.** `incomeParts` liczy przychód tylko z operacji `income` i `trading` (`shared/calc/income.ts:52-70`); operacja
`loan` zawsze `NONE`, także jej część ponad dług. Silnik warstw robi to dobrze (`shared/calc/fleet.ts:1126-1137` –
`dock(amt - back, …)`).

**Poprawka (S) i test.** Silnik zna nadwyżkę każdej spłaty (`back` w `fleet.ts:1130`) – wystawić ją (np. `FleetState`:
odsetki po `txId`) i liczyć w `incomeParts` jako „Praca i inne”. Test unit (`tests/unit/income*.test.ts` albo
`numbers-agree.test.ts`): spłata 1 050 pożyczki 1 000 → przychód 50 w miesiącu, Bilans paliwa +50. Bez migracji (liczone).

**Uwagi.** Obniżam K → S: pieniądze w warstwach są dobre, zła jest statystyka przychodu (o kwotę odsetek), i tylko przy
nadpłacie pożyczki udzielonej. Osobno z raportu DM (N): „zwrot pożyczki …? przypisz” tylko przy jednej otwartej pożyczce.

## MG.8 / MG.10 – POTWIERDZONE (błąd reguły technicznej T129), K → K

**Odtworzenie** (`w1-mg.spec.ts`, przebieg `w1-mg`, 21:20–21:22, czysty `rok`, tylko okno):
- Kontrola (pieniądze celu z dawnych dostaw): Operacje → Ctrl+N → 300 zł, „Rozrywka i hobby”, „Z celu: Wakacje 2027
  (2 138,96 zł)” → Wakacje 2 138,96 → **1 838,96**, osłony 13 000,00 bez zmian, cele 8 138,96 → 7 838,96. Zgodnie z T131.
- Mapa → „Rower” (zarchiwizowany) „przywróć” → „Nowy laptop” „przenieś środki”: okno „W celu jest 6 000,00 zł. Dokąd i ile
  przenieść?”, 700 zł „do celu Rower” → „Środki celu „Nowy laptop” przechodzą do celu „Rower”.” Mapa od razu: Nowy laptop
  5 300,00, Rower 700,00 (zrzut `W1-MG.10-po-przeniesieniu.png`); w pliku `transfers=[{"at":"2026-11-03T20:21:44.381Z",
  "to":"…003","amount":70000}]`.
- Operacje → Ctrl+N → 900 zł „W1 Sklep rowerowy”, lista celów „Rower (700,00 zł)”, notka „Wydatek schodzi z celu – bez
  energii i koperty; czego w celu brakuje, bierze osłony.” (`W1-MG.10-edytor-Rower.png`) → Esc. Po: **Rower 700,00 (bez
  zmian)**, **osłony 13 000,00 → 12 100,00 (−900)**, cele 7 838,96 bez zmian, suma kont −900 (`W1-MG.10-mapa-po.png`).
  Oczekiwane według T131 i tego, co ekran pokazał: Rower 0,00, osłony −200.
- MG.8 (dostawa tego dnia przepełnia cel) nie powtarzałem – ten sam mechanizm; liczby w MG.md i C18 (wyrocznia z dosłownym
  T129 = aplikacja, 21 odczytów).

**Przyczyna.** Przeniesienie środków celu jest w silniku zdarzeniem „na koniec dnia” (`shared/calc/fleet.ts:1304-1323`,
`slot: 4`, komentarz „at the end of its day”), więc wydatki i dostawy tego dnia (wcześniejsze sloty) widzą cel sprzed
przeniesienia; ekran czyta stan na teraz – po wszystkich zdarzeniach dnia – i pokazuje cel już po przeniesieniu. Liczy
dosłownie T129 („silnik na koniec dnia przenosi min(kwota, stan)”).

**Rozstrzygnięcie reguły.** T129 to decyzja techniczna (moja, z D84 C2 – użytkownik zdecydował tylko o pytaniu
„osłony / inny cel / zostaw”). Jej „koniec dnia” łamie wymagania użytkownika: specyfikacja „Cele według priorytetów,
każdy do swojej kwoty” (MG.8: Rower 4 081,08 zł przy celu 2 500), D84 C1 „zmiany celów działają od dnia zmiany” i T131
„cel płaci, ile ma” w tym, co ma według ekranu (MG.10: cel z 700 zł nie płaci nic). T128 już porządkuje pieniądze celów
według chwili (`cameIn`) – przeniesienie można postawić w tym samym porządku (`at` wobec `cameIn` operacji i dokowań dnia;
operacja z banku bez godziny – `createdAt`, nie wcześniej niż początek dnia). To błąd reguły T, nie decyzja do użytkownika.

**Szkoda dla użytkownika.** Trwała zła kwota w warstwach (silnik liczy ten dzień zawsze tak samo): pieniądze wydane
„z celu” zostają w celu, a ubywają z osłon (MG.10: 700 zł); dostawa tego dnia daje celowi więcej, niż brakuje, a następny
cel nic nie dostaje (MG.8). Suma kont dobra – źle rozłożona między osłony a cele. Typowa droga: „przenoszę na rower
i kupuję rower” – tego samego dnia.

**Poprawka (M) i test.** Zdarzenie przeniesienia w kolejności chwili (`at`) z operacjami i dokowaniami dnia; nowa T-decyzja
zamiast „na koniec dnia” w T129; wyrocznia (`tests/audyt/wyrocznia`) według nowej reguły. Testy unit (`tests/unit/fleet.test.ts`):
przeniesienie → wydatek z celu tego dnia (cel płaci do swojego stanu); przeniesienie → dostawa tego dnia (cel do swojej
kwoty). Bez migracji (stany liczone), ale przeliczy przeszłe dni z przeniesieniami – wartości warstw z tamtych dni się
zmienią (do notatki wydania).

## IM.23 = P.3 – POTWIERDZONE (W) + WYMAGANIE (S4)

**Odtworzenie** (`w1-im23.spec.ts`, przebieg `w1-im23a`, 21:42–21:43, czysty `rok`: Marek „do oddania 360,00 zł –
najstarszy zakup z 20.08 (75 dni)”, jego ustawienie „advance” i reguła importu persony „Od domownika: Marek – reszta jako
zaliczka”). Plik listy z jednym wierszem „MAREK TESTOWY, ZWROT ZA BILETY … PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY … 100,00 PLN”
z 02.11 (wiersz PIOTR TESTOWY z L1 ze zmienioną nazwą i kwotą, bajty zachowane).
- Podgląd: „GOTOWE · 1 … Od domownika: Marek – zaliczka · 1 marka · 1 operacja +100,00 [Od domownika: Marek – reszta jako
  zaliczka] ‹spłata› ‹niezależny przychód› ‹zaliczka› … Twoje reguły” – nic nie klikane, „Importuj” → „Nowe: 1”.
- W pliku: `2026-11-02 10000 member=…0003 inflowKind=advance advance=true covers=[]` (i wpłata persony z 14.09:
  `36000 inflowKind=advance covers=["…EVENTIM"]` – wskazany zakup).
- Po imporcie Mostek: „Marek: do oddania 360,00 zł – najstarszy zakup z 20.08 (75 dni).” – bez zmian; 100 zł w depozycie.
- Wariant b (`w1-im23b`, klik „zaliczka”) nie przeszedł – mój skrypt szukał przełącznika jako `role=radio` (błąd narzędzia,
  nie aplikacji); niepotrzebny, bo już propozycja importu (a) daje `advance`. Dla porównania IM.23 / im-b2: osoba bez reguły
  (Mama), przełącznik na „spłata” – spłata zakupów, reszta do depozytu, zgodnie z D80 b.

**Przyczyna.** Opcja listy „Od domownika: X – reszta jako zaliczka” (`household:X:advance`) daje
`{ advance: true, inflowKind: 'advance' }` (`renderer/features/import/options.ts:150-153`), a `inflowKind: 'advance'` to
od 1.15.3 „zaliczka na przyszłość” – cała wpłata do depozytu, bez spłaty i bez `covers` (`shared/calc/household.ts:559-563`).
Reguła importu zapamiętuje `inflowKind` (`shared/import/reconcile.ts:973-983`, `classify.ts:505`), więc zapamiętana raz
odpowiedź (D80 b: „pytanie raz, potem zapamiętane dla osoby”) od 1.15.3 znaczy coś innego niż jej etykieta.

**Werdykt.** Dwie warstwy:
1. **Błąd (W), niezależnie od decyzji o 1.15.3:** etykieta „reszta jako zaliczka” i zapamiętany wybór osoby oznaczają resztę
   ponad dług, a działa jak „całość jako zaliczka”; wskazany zakup (`covers`) zostaje nieoddany. Skutek: długi domowników
   nie maleją, przypomnienia „do oddania” trwają, depozyt rośnie zamiast osłon (zła kwota w warstwach depozyt / osłony).
2. **WYMAGANIE (S4):** czy jawny wybór „zaliczka na przyszłość” może w ogóle omijać dług osoby – specyfikacja „Rozliczenia
   z domownikami”, D80 b i D91 c mówią „najpierw wyrównuje to, co ma oddać”; 1.15.3 (bez decyzji D) – „nie wymusza już
   traktowania jej jako spłaty”. Do decyzji użytkownika.

**Poprawka (S + naprawa danych) i test.** Opcja „reszta jako zaliczka” → `inflowKind: 'repay'` + `advance: true` (spłata,
reszta do depozytu); `'advance'` tylko z przełącznika „zaliczka”, z ostrzeżeniem, gdy osoba ma dług. Naprawa danych: reguły
importu z `inflowKind: 'advance'` zapisane z opcji listy i wpłaty z nich od 1.15.3 – nie do odróżnienia od jawnego
„zaliczka”, więc meldunek „wpłaty X nie spłaciły długu – spłacić?” zamiast cichej migracji. Test unit (`options` →
`Choice`; `household`: wpłata z `advance` i `covers` przy długu) i e2e importu (jak wyżej → „do oddania 260,00 zł”).

## IM.39 – POTWIERDZONE, W → W

**Odtworzenie** (`w1-im39.spec.ts`, przebieg `w1-im39`, 21:45–21:47, czysty `rok`, ten sam plik 17 wierszy 19–26.10 co
w IM.42 – każdy wiersz jest już na mBanku z historii rachunku):
1. Przed: mBank 19–26.10 – 17 operacji, Portfel XTB – 1, duplikatów 0; suma kont 73 610,57 zł.
2. Import → plik → „Konto w budżecie” = Portfel XTB: ostrzeżenie „Pliki z tego rachunku (…0001) trafiały dotąd na konto
   „mBank” – sprawdź, czy wybrane konto się zgadza.”, liczniki `new 17 · known 0` → „Importuj” → „Nowe: 17”. Portfel 1 → 18.
3. Ten sam plik znowu – lista „Konto w budżecie” stoi na „Portfel XTB” (po złym imporcie) → wybrane „mBank”: liczniki
   `moved 17`, „Te operacje z banku są na innym koncie – … Nie wejdą drugi raz; zaznaczone przeniosę na to konto (z kategorią
   i notatkami).”, „ZABKA Z1234 25.10.2026 · teraz na: Portfel XTB” … → „Importuj” → „przeniesione z innego konta: 17”.
4. Po: mBank 19–26.10 – **34** operacje, Portfel – 1, **16 par podwójnych** (np. „2026-10-20|300000|XTB S.A. ×2”,
   „2026-10-25|-3195|ZABKA Z1234 ×2”, „2026-10-19|-8791|FRYZJER STYL ×2”); „Suma kont budżetu: 74 902,12 zł” (+1 291,55).
   Zrzuty `W1-IM.39-portfel-podglad.png`, `W1-IM.39-mbank-podglad.png`, `W1-IM.39-mostek.png`.

**Przyczyna.** Ta sama luka co IM.42 – tożsamość wiersza między formatami działa tylko w jednym przejściu i tylko na koncie
docelowym: (1) przy złym imporcie parowanie drugiego formatu bierze tylko zaksięgowane operacje konta docelowego
(`shared/import/reconcile.ts:469-475` na `budget.booked`, a `budgetedOf` zbiera tylko operacje tego konta – `:336-347`),
więc 17 wierszy, które są na mBanku z historii, wchodzi na Portfel jako nowe; (2) przy imporcie naprawczym przejście
„na innym koncie” (B35, `reconcile.ts:416-447`, klucz z opisu wiersza w formacie pliku, wszystkie konta) zajmuje te wiersze
jako „przenieś” (`status: 'elsewhere'`, `:444`), zanim przejście drugiego formatu (`:469-487`) sparowałoby je z operacjami
mBanku z historii – przeniesione stają obok oryginałów.

**Poprawka (M, razem z IM.42) i test.** Przejście drugiego formatu także po operacjach innych kont tego samego rachunku
(numer konta pliku) – wiersz już w budżecie na innym koncie w drugim formacie = „na innym koncie”, nie „nowy”; a w imporcie
naprawczym kopia na złym koncie, której wiersz ma parę z drugiego formatu na koncie docelowym, nie jest przenoszona, tylko
proponowana do usunięcia (para duplikatów). Test unit (`planImport`: historia na mBanku, lista na Portfel → `elsewhere`
albo ostrzeżenie; lista na mBank po złym imporcie → bez przenosin wierszy z parą) i e2e jak wyżej (duplikatów 0). Bez
migracji; użytkownik, który to przeszedł, ma pary w panelu duplikatów (raport IM: Meldunki „19 możliwych duplikatów”).

**Uwagi.** W utrzymane (nie K): zła kwota powstaje dopiero na drodze naprawy błędu użytkownika, przed którym aplikacja
ostrzega, a duplikaty widać w Meldunkach. Dodatkowo (z raportu IM): po złym imporcie numer …0001 zapamiętany dla Portfela
i lista „Konto w budżecie” podsuwa Portfel – potwierdzone w kroku 3.

## P.1 – POTWIERDZONE z poprawionym opisem, W → S

**Odtworzenie** (`w1-p1.spec.ts`, `w1-p1b.spec.ts`; przebiegi `w1-p1-*`, dziennik `C:\FI-audyt\przebiegi\w1\przebieg.log`):
- Seria 1 (20:5x–21:0x, zamrażanie jak w wydaniu: 3 min po otwarciu): `game.start` = dziś − N dni, sam `fi.json`
  (kolekcje usunięte, „b”) albo pełna persona („f”), Mostek → Ctrl+2 po ~7 s. **Bez błędu we wszystkich 14 przypadkach:**
  101b, 103b–107b, 109b, 110b, 115b, 130b, 200b, 60f, 110f, 200f – Operacje z listą (zrzut `W1-P1-110f.png`:
  „Operacje 1 / 982 …”). Opis „Operacje zawieszają okno, gdy gra trwa dłużej niż ok. 105 dni” w tej postaci się nie odtwarza.
- Trop: zrzut z przygotowania `AU2-operacje-petla.png` ma nad Operacjami okno „Awans: Kapitan” – dni gry były wtedy
  zamrażane od razu. Seria 2 z `FI_FREEZE_AFTER_OPEN_MS=0`, `FI_FREEZE_QUIET_MS=0` („z”):
  - 100bz: Mostek, okno „Awans: Komandor – Stopień od 23.10.2026 …”, Operacje działają, #185 – 0;
  - **106bz i 110bz: już Mostek pada** – „Ten widok napotkał błąd · Minified React error #185 … Dane na dysku nie zostały
    naruszone. Możesz wrócić na mostek.” (zrzut `W1-P1-w1-p1-110bz-start.png`), w konsoli `Minified React error #185`;
  - 110fz (pełna persona, ma zamrożone dni od 04.09 – zaległość 0): bez błędu.
- Po pierwszym otwarciu 110bz w `game/` są zamrożone 109 dni (16.07–02.11). **Drugie otwarcie tego folderu** (`w1-p1b`):
  „Mostek=true Operacje=true #185=0” – samo się naprawia.

**Przyczyna.** Nie długość gry ani ekran Operacji, tylko **zaległość niezamrożonych dni ponad ok. 100**. Zamrażanie idzie
porcjami po 2 dni (`renderer/store/game.ts:47` – `DAYS_PER_PASS = 2`); efekt (`game.ts:89-110`) zapisuje porcję
(`addRecords` / `updateRecord`), zmiana magazynu zmienia `parts` i efekt rusza znowu. Komentarz zakłada „the window between
them”, ale aktualizacja magazynu zustand (`useSyncExternalStore` – pas synchroniczny) z efektu daje synchroniczny render
i następny efekt w tym samym zadaniu – bez przerwy; przy ponad 50 porcjach (React: limit 50 zagnieżdżonych aktualizacji)
pada „Maximum update depth exceeded” (#185) na ekranie, który akurat jest otwarty. Pomiar zgodny: 100 dni = 50 porcji –
dobrze, 106 (53) i 110 (55) – błąd. W wydaniu zdarzy się to 3 min po otwarciu (pierwsze zamrażanie) na dowolnym ekranie.

**Od którego dnia u zwykłego użytkownika.** Od żadnego dnia gry: przy codziennym (nawet co kilka dni) używaniu aplikacji
zaległość ma 1–2 dni, a „powrót po 2 tygodniach” to 7 porcji. Błąd wystąpi, gdy na komputerze „w użyciu” (D86) zbierze
się **ponad ok. 100 dni bez zamrożenia** – powrót po ponad 3 miesiącach przerwy, folder z kopii sprzed ponad 100 dni bez
miesięcy gry, `game.start` przestawiony wstecz. Po ponownym uruchomieniu działa (dni już zamrożone). Danych nie traci.

**Poprawka (S) i test.** Następna porcja w nowym zadaniu (`setTimeout(…, 0)` / licznik w stanie), żeby okno faktycznie
odmalowało się między porcjami – albo zaległość liczona w jednym przebiegu poza Reactem. Test e2e: folder z
`game.start` sprzed 150 dni bez `game/`, `FI_FREEZE_AFTER_OPEN_MS=0` → przez 30 s bez #185, potem wszystkie dni zamrożone.
Bez migracji.

**Uwagi.** Obniżam W → S: blokuje pracę, ale tylko w brzegu (zaległość > 100 dni) i samo mija po restarcie. Notatka
w `wykonanie.md` („nie zmieniaj `game.start` wstecz … P.1”) opiera się na złym mechanizmie – ograniczeniem jest zaległość
zamrażania przy `FI_FREEZE_AFTER_OPEN_MS=0`, nie długość gry.

## MO.29 = DO.7 – POTWIERDZONE, W → W

**Odtworzenie** (`w1-mo29.spec.ts`, przebieg `w1-mo29`, 21:22–21:25, czysty `rok` + ICTTJ, nic nie zapisane):
- Każdy ekran (Ctrl+1…9, 0): 0 wystąpień „wycofa…”.
- Mostek → panel „DOKOWANIE (4)” – wiersze „19.10.2026 Wypłata z ICTTJ · Nadwyżki w masie zadokowana +3 000,00 zł”,
  „18.09.2026 … Cele zadokowana +2 000,00 zł”, „20.07.2026 …”, „18.06.2026 …”. Okno każdej zadokowanej: przyciski tylko
  „Historia · Anuluj · Zapisz podział” (zrzuty `W1-MO.29-okno-*.png`); prawy klik – nic.
- Edytor zadokowanej operacji z banku („20.10 wt XTB S.A. mBank … +3 000,00”): „Wypłata z konta tradingowego dokuje jak każda
  dostawa; FI łączy ją z wpisem w ICTTJ … – Mostek → Dokowanie.” – bez wycofania (`W1-MO.29-edytor.png`).
- Ctrl+K: okno palety nie dało się odczytać jako dialog (narzędzie) – bez wpływu na werdykt.

**Przyczyna.** Funkcji nie ma. CHANGELOG 1.15.2 (wiersz 33) i D95 (`docs/decyzje.md:385`, N-PC-2) ją zapowiadają, ale
commit `130345b` (1.15.2) nie zmienia ani okna dokowania, ani akcji dokowania (`git show --stat`: brak
`features/dock/*`). Okno zadokowanej dostawy: `renderer/features/dock/DockingDialog.tsx:134-143` (Historia / Anuluj /
Zapisz podział). Wycofanie istnieje tylko jako „Cofnij” w toaście po dokowaniu (`renderer/features/dock/actions.ts:59-100`,
ok. 6 s).

**Poprawka (S) i test.** Przycisk „Wycofaj dokowanie” w oknie zadokowanej dostawy (i w wierszu panelu): usuwa rekord
dokowania i operację Portfela XTB utworzoną przy dokowaniu, operacja z banku zostaje (logika jak „Cofnij” z
`dockDelivery` / `removeExtraDockings`), toast z „Cofnij”. Test e2e (`tests/e2e` – dokowanie): zadokuj → zamknij → otwórz →
„Wycofaj dokowanie” → „do zadokowania”, warstwy jak przed, operacja z banku jest, operacji Portfela nie ma → „Cofnij”.
Bez migracji. Albo – jeśli funkcja ma poczekać – sprostować notatkę 1.15.2.

**Uwagi.** W utrzymane: funkcja z notatek wydania nie istnieje; obejście tylko częściowe (zmiana podziału) – dokowania na
złe konto (Portfel XTB zamiast pary w mBanku) po 6 s nie da się cofnąć. MO.29 i DO.7 to jedno znalezisko.

## Problemy narzędzia (moje, poprawione w trakcie)

- `w1-da43` pierwszy przebieg: identyfikatory operacji z `da-pomoc.ts` są sprzed odnowienia persony (15:17) – wiersz nie
  znaleziony; drugi przebieg szuka operacji po nazwie w folderze (wynik wyżej).
- `w1-dm18b` pierwszy przebieg: id pożyczki z literą „L” (spoza alfabetu ULID) – aplikacja odrzuciła plik („1 problems”);
  drugi przebieg z poprawnym id (wynik wyżej).
- `w1-im23b`: przełącznik „spłata / niezależny przychód / zaliczka” nie ma `role=radio` – klik nieudany; wariant zbędny.
- `w1-p1-110bz` pierwszy przebieg: skrypt czekał 90 s na Mostek i padł bez zrzutu; drugi zapisuje zrzut i błędy okna.
- Ctrl+K w `w1-mo29`: paleta nie jest `[role=dialog]` – tekst nieodczytany (bez wpływu na werdykt).
