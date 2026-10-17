# Financial Intel – postęp

**Stan:** grupa A (E1 + E2) scalona – PR #3, wydanie 0.3.0. Grupa B (E3 + E4 → 1.0.0) w toku na gałęzi
`claude/grupa-b` (komenda użytkownika 17.10.2026, odpowiedzi D69–D70).
**Następny krok:** E3 – obliczenia planu, Plan miesiąca, Ładownia, kreator startu; potem E4 – Mostek, szybki wpis,
zasobnik, ukrycie kwot, powiadomienia, dźwięki; PR i wydanie 1.0.0, pauza.

## Zasady prowadzenia (prośba użytkownika 16.10.2026 – D67)
- Po każdym kroku (etapie albo grupie) zaktualizowana tabela: model i thinking z górką, szacowany czas pracy Claude'a.
- Bez komendy użytkownika nie zaczynam kolejnego etapu ani grupy.
- Etapy, które mogą iść jednym ciągiem, są zgrupowane: w grupie bez pauzy między etapami (każdy etap i tak kończy się
  testami, `/code-review` high, commitem i wpisem tutaj), jeden PR i jedno wydanie na grupę, potem pauza.

## Kolejka prac

Czas = praca Claude Code w sesji (czytanie, pisanie, testy, poprawki), bez testowania przez użytkownika i bez czekania
na CI. Model i thinking z górką. E0 zmierzony; reszta przeliczona na jego podstawie, z zapasem.

| Grupa | Etapy | Model | Thinking | Czas Claude'a | Wydanie | Co potrzebne przed startem | Stan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| – | E0 Fundament | Opus 5.5 | xhigh | zmierzone ok. 1,5 h | 0.1.0 | – | ✅ scalony |
| **A** | E1 Model i silnik + E2 Import mBank | Opus 5.5 | **max** | ok. 4,5 h (E1 zmierzony: ok. 2 h; E2 z przeglądem: ok. 2,5 h, szacunek z przebiegu sesji) | 0.3.0 | ✅ odpowiedzi (D68), CSV z mBanku | ✅ PR do `main`, czeka na scalenie i odbiór |
| **B** | E3 Start i plan miesiąca + E4 Mostek i szybki wpis | Opus 5.5 | **max** | 4–6 h | **1.0.0** | ✅ odpowiedzi (D69, D70) | ⏳ w toku |
| 🏁 | **MVP = 1.0.0** (E0–E4, D51) | | | **razem ok. 10–12 h** | | | |
| **C** | E5 ICTTJ i dokowanie + E6 Radar i należności | Opus 5.5 | **max** | 3,5–5 h | 1.1.0 | ścieżka folderu ICTTJ, zanonimizowana kopia `payouts/` | ⏳ |
| **D** | E7 Dowództwo + E8 Wywiad i raporty | Opus 5.5 | **max** | 4,5–6,5 h | 1.2.0 | akceptacja listy misji, osiągnięć i smaczków ICT | ⏳ |
| **E** | E9 Pierwszy oficer (opcjonalnie) | Opus 5.5 | xhigh | 1,5–2 h | 1.3.0 | klucz API Claude | ⏳ |
| | **Całość E0–E9** | | | **ok. 20–26 h** | | | |

Dlaczego tak: E1 (silnik pieniędzy) ma najwięcej reguł – sam albo z E2, gdy przed startem jest plik CSV; E3 i E4 to
ekrany na gotowym silniku i razem dają wydanie 1.0.0; E5 i E6 to przepływy z zewnątrz (ICTTJ, pożyczki, należności);
E7 i E8 to warstwa gry i analiz na gotowych danych – obie potrzebują wcześniej zaakceptowanych list. Grupa B podniesiona
z xhigh do max (z górką): 1.0.0 to pierwsza wersja do codziennego użytku na prawdziwych pieniądzach, kreator dzieli
obecne środki i proponuje pensję z silnika, a szybki wpis liczy energię przed zapisem.

Dla porównania: programista człowiek potrzebowałby wielokrotnie więcej – E0 ok. 1–2 tygodni, MVP ok. 2–3 miesięcy,
całość ok. 4–6 miesięcy (szacunek zgrubny).

## Przed etapem E3 (grupa B)

1. **Co trzeba wiedzieć**
   - Zakres grupy B → wydanie **1.0.0** (MVP, D51):
     - E3 Start i plan miesiąca: kreator startu (konta i salda, import historii, propozycja pensji i celów warstw ze
       średnich kosztów, podział obecnych środków), ekran Plan miesiąca (pensja → ładownia, odkładki, koperty planowe
       i codzienne, dzienny przydział), Ładownia (kontenery, linia zanurzenia, symulacja zasięgu), debriefing
       z podziałem łupów i „Miesiąc zamknięty na plus”;
     - E4 Mostek i szybki wpis: Mostek (odprawa, stan okrętu, koperty, do zwrotu, ostatnie operacje), szybki wpis
       w małym oknie nad wszystkimi (globalny skrót, podgląd energii, cisza nocna, dziennik kapitański, do zwrotu,
       podział paragonu), zasobnik z energią dziś, tryb ukrycia kwot, powiadomienia i dźwięki.
   - Grupa A (0.3.0) gotowa: model danych, silnik warstw, Operacje, konta i kategorie, import z mBanku – czeka na
     scalenie i odbiór.
   - Otwarte: kategorie mBanku bywają nietrafne (dlatego są tylko podpowiedzią); przejazdy (Bolt, KOLEO) mBank
     przypisuje do „Przejazdy” i „Podróże”, a w kategoriach startowych nie ma na nie miejsca (pytanie niżej).
2. **Pytania z propozycją**
   - **Pensja w kreatorze:** średnie koszty netto (wszystko: ładownia, odkładki, koperty) z ostatnich 6 pełnych
     miesięcy, zaokrąglone w górę do 100 zł; cel osłon = 3 pensje, kadłub = 6 × średnie koszty (spec); wszystko do
     poprawienia.
   - **Podział obecnych środków:** propozycja według kolejności dokowania (osłony do celu → kadłub → cele), kwoty do
     poprawienia przed zapisem.
   - **Koperty pierwszego miesiąca:** średnie wydatki kategorii z 3 ostatnich pełnych miesięcy, zaokrąglone do 10 zł;
     codzienne i planowe jak w Ustawienia → Kategorie.
   - **Ładownia z historii:** kreator pokaże powtarzające się płatności (ten sam kontrahent i podobna kwota co miesiąc
     albo co rok) jako propozycje kontenerów – każdą trzeba potwierdzić.
   - **Szybki wpis:** skrót Ctrl+Alt+B (spec), okno na środku ekranu, Enter zapisuje, Esc zamyka; kategoria z listy
     z wyszukiwaniem, „oficer” podpowiada kategorię ostatnio użytą u tego kontrahenta.
   - **Ukrycie kwot:** Ctrl+$ jak w ICTTJ (okno i dymek zasobnika).
   - **Odprawa poranna:** przy pierwszym otwarciu okna po 5:00 (koniec ciszy nocnej) – powiadomienie Windows
     z energią dziś i alarmami, pełna odprawa na Mostku.
   - **Dźwięki:** domyślnie włączone i ciche (30%), osobno dla wpisu, dokowania, alarmu i awansu.
   - **Przejazdy:** nowa podkategoria „Auto · przejazdy (taxi, pociąg, komunikacja)” i podpowiedź mBanku „Przejazdy”
     → ta podkategoria.
3. **Co przygotować**
   - Odbiór 0.3.0 na Windows (listy E1 i E2 niżej), najlepiej z pełnym plikiem z mBanku – uwagi do rozpoznawania
     i reguł.
   - Stałe opłaty i opłaty okresowe (OC, przeglądy, abonamenty roczne) z kwotą i miesiącem – do Ładowni w kreatorze.
4. **Model, thinking, czas:** Opus 5.5 · **max** (z górką – uzasadnienie pod tabelą) · 4–6 h.

## E2 – import z mBanku (17.10.2026)

Zrobione (kryteria z `plan.md`):
- Plik z mBanku – „Lista operacji” albo „Historia rachunku” – w UTF-8 albo Windows-1250 (`shared/import/text.ts`,
  `mbank.ts`): nagłówek rozpoznany po kolumnach, opis rozbity na kontrahenta, rodzaj operacji i tytuł, transakcje
  nierozliczone, właściciel rachunku z `#Klient`, okres pliku; wiersze w innej walucie pominięte z informacją.
- Ekran Import (Ctrl+3): wybór albo upuszczenie pliku, konto budżetu, podsumowanie (nowe, znane, rozliczone,
  połączone, usunięte), podgląd i decyzje przed zapisem.
- Ponowny import nakładającego się okresu nie tworzy duplikatów (T35); nierozliczona operacja, która wróciła
  rozliczona (inna kwota albo data), przejmuje dane banku; zniknięta autoryzacja karty – propozycja usunięcia (T40).
- Wpis ręczny i wiersz z banku = jedna operacja (ta sama kwota, ±3 dni, podobny kontrahent – T36): zostaje kategoria,
  godzina i notatki użytkownika, dochodzą dane banku; połączenie można odznaczyć.
- Kategoryzacja grupami po kontrahencie i kierunku: wydatek z kategorią, do zwrotu, wpływ, od domownika, przelew
  własny, XTB; wyjątki dla pojedynczych wierszy. Rozpoznane same: XTB, przelewy własne (nazwisko z pliku
  i z ustawień), bankomat → Gotówka, zwrot towaru, opłaty banku (T37). Kategoria mBanku tylko jako podpowiedź (D68) –
  „Przyjmij podpowiedzi mBanku” ustawia je jednym kliknięciem, ale nie tworzy reguł.
- Reguły uczą się z decyzji (T38): „zapamiętaj” przy grupie (domyślnie zaznaczone przy własnej decyzji) i „Zapamiętaj”
  w edytorze operacji; Ustawienia → Import z banku: reguły z usuwaniem, nazwiska właściciela rachunku.
- Wpłata od domownika spłaca najpierw należność „do zwrotu” – także z zakupów w tym samym pliku – a nadwyżka jest
  przychodem (T41).
- Operacja usunięta przez użytkownika nie wraca z kolejnym importem; można ją zaimportować mimo to (T39).
- Kopia `backups/pre-import` przed zapisem (10 ostatnich); import zablokowany w folderze tylko do odczytu (T42).
- Saldo z banku po imporcie (i w Ustawienia → Konta): saldo otwarcia albo korekta do wyjaśnienia z alarmem.
- Plik testowy `tests/fixtures/mbank/lista_operacji.csv` z eksportu użytkownika, zanonimizowany (T44).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione – m.in. usunięta operacja wracała z kolejnym
  importem, podpowiedzi mBanku tworzyły reguły, zniknięte autoryzacje były zaznaczone same (także przy historii
  rachunku, która nie ma nierozliczonych), wpłata domownika nie spłacała zakupów „do zwrotu” z tego samego pliku,
  zmiana konta kasowała decyzje grup, import w folderze tylko do odczytu, mocniejsza anonimizacja pliku testowego,
  wspólny kod (`fold`, `upsertRule`, kopie). Nowy test wykrył jeszcze, że rozliczenie nierozliczonej porównywało
  nazwę zmienioną przez użytkownika – teraz porównuje nazwę z banku (`bank.counterparty`).
- Testy: 257 unit + fs, E2E 9 (import, Operacje ×3, smoke ×4, synchronizacja).

Do sprawdzenia przez użytkownika (po wydaniu 0.3.0):
1. Import (Ctrl+3) → „Wybierz plik CSV” → pełny plik z mBanku (Lista operacji albo Historia rachunku), konto mBank.
2. Grupy: rozpoznane (XTB, przelewy własne, Gotówka), kategorie dla największych grup, „Przyjmij podpowiedzi mBanku”
   dla reszty – sprawdź, które podpowiedzi są nietrafne – i „Importuj”.
3. Ten sam plik drugi raz → nic nowego; wpis ręczny z wieczora + import następnego dnia → jedna operacja.
4. Operacje → operacja z banku → inna kategoria → „Zapamiętaj”; Ustawienia → Import z banku → reguła na liście.
5. Na końcu importu „Saldo w banku teraz” → saldo otwarcia; po kolejnym imporcie inna kwota → korekta w Operacjach.
6. Folder danych → `backups/pre-import` – kopia sprzed importu.

## Przed etapem E1 (grupa A)

1. **Co trzeba wiedzieć**
   - Zakres E1 (`plan.md`): pełne schematy zod wszystkich rekordów (operacja z podziałem paragonu, kontener, cel,
     plan miesiąca, dokowanie, pożyczka, saldo, gra), kwoty w groszach, silnik `shared/calc/fleet.ts` z testami na
     przykładach ze specyfikacji (dokowanie 5 000 zł, pensja z kadłuba, odkładka OC, przydział dzienny, „do zwrotu”,
     pule Cele / Podatek), konta i kategorie w Ustawieniach, ekran Operacje (dodawanie, edycja z historią, usuwanie
     z „Cofnij”, filtry, wyszukiwanie). Wydanie 0.2.0.
   - E0 zakończony (0.1.0); w ICTTJ jest błąd do zgłoszenia (kopia konfliktu `journal.json`), FI ma go poprawionego.
   - E2 można dołączyć do tej grupy, jeśli przed startem dostanę CSV z mBanku – wtedy wydanie 0.3.0.
2. **Pytania z propozycją**
   - **Kategorie startowe** (spec: 9 głównych z podkategoriami, do edycji). Propozycja podkategorii:
     Jedzenie (zakupy spożywcze, na mieście, kawa i przekąski) · Dom (czynsz i opłaty, media, wyposażenie, chemia) ·
     Auto (paliwo, serwis, ubezpieczenie, parking i opłaty) · Zwierzęta (karma, weterynarz, akcesoria) · Zdrowie
     (leki, lekarz, sport) · Rozrywka i hobby (wyjścia, hobby, podróże) · Subskrypcje i łączność (telefon, internet,
     streaming, aplikacje) · Osobiste (ubrania, kosmetyki, fryzjer) · Prezenty i inne (prezenty, inne). Do tego
     kategoria systemowa „Gotówka” (wypłata z bankomatu – spec).
   - **Konta startowe:** mBank i Portfel XTB, nazwy do zmiany, saldo otwarcia z datą wpisywane w Ustawienia → Konta
     (rekord `balances/`); pełny kreator startu przyjdzie w E3.
   - **Wygląd kwot na liście operacji:** wpływy zielone z „+”, wydatki bez koloru z „−”, zwrot towaru zielony
     (czerwień tylko dla przekroczeń i alarmów).
   - **Grupa A:** czy dołączasz CSV z mBanku teraz (E1 + E2 jednym ciągiem), czy E2 osobno później?
3. **Co przygotować**
   - Odbiór 0.1.0 na Windows (lista w sekcji E0 niżej).
   - Jeśli E1 + E2: zanonimizowany plik CSV z historii rachunku mBanku (kilka miesięcy; nazwy kontrahentów mogą zostać,
     numery kont i nazwiska zamaskuj) – trafi do `tests/fixtures/`.
4. **Model, thinking, czas:** Opus 5.5 · **max** (silnik pieniędzy – najwięcej reguł); E1: 2–3 h, E1 + E2: 3,5–5,5 h.

## E1 – model i silnik (17.10.2026)

Zrobione (kryteria z `plan.md`):
- Pełne schematy zod wszystkich rekordów (`shared/schema/records.ts`): operacja (rodzaje: wydatek, wpływ, przelew
  własny, XTB, PIT-38, pożyczka, korekta; podział paragonu, do zwrotu, plan / impuls, dziennik kapitański, zwrot
  należności, dane z banku), kontener (cykl, odkładka), cel, plan miesiąca (pensja, koperty, łupy), dokowanie (pula
  ICTTJ, podział), pożyczka, saldo (otwarcie / potwierdzenie), miesiąc gry; migracje gotowe (`SCHEMA_VERSION` 1 –
  pola dodane z domyślnymi wartościami, fi.json z E0 czyta się bez zmian).
- Ustawienia w fi.json (`shared/schema/budget.ts`): konta (mBank, Portfel XTB – stałe id), kategorie wg D68 (stałe id),
  warstwy (osłony 3 pensje, kadłub 6 miesięcy), rozkazy (min. osłony, linia zanurzenia 40%, cisza nocna 23–5, próg
  dziennika 200 zł, firewall), start budżetu, import (reguły – E2).
- Silnik `shared/calc/fleet.ts` (czysta funkcja, nic nie zapisuje; T24–T32): salda kont, dokowanie, pensja z alarmem
  żółtym / czerwonym, odkładki, dzienny przydział, łupy, do zwrotu i należności, pule Cele / Podatek, firewall, koszty
  netto, zasięg, klasa okrętu, masa ładunku; niezmiennik „suma warstw = salda kont” sprawdzany w każdym teście.
  Testy na przykładach ze specyfikacji (`tests/unit/fleet.test.ts`): dokowanie 5 000 zł (+3 360 / +1 640, zasięg
  6,5 → 7,8), pensja 4 000 zł z osłon 2 500 (żółty alarm), OC 11 × 103,33 + 103,37, przydział (przeniesienie i
  zmniejszenie), do zwrotu i zwrot z nadwyżką, pule Cele i Podatek.
- Ekran Operacje: lista (filtry okres / konto / rodzaj / kategoria / oznaczenia, wyszukiwanie bez polskich znaków i po
  kwocie, sumy, salda kont), edytor (rodzaj i kierunek, kwota, data i godzina, konto, kontrahent, kategoria, podział
  paragonu, do zwrotu, zwrot należności, konto docelowe przelewu, dziennik kapitański, dane z banku), historia zmian,
  usuwanie z „Cofnij”, Ctrl+N. Kwoty wg D68.
- Ustawienia → Konta (saldo otwarcia na początek dnia, „Saldo w banku teraz” → potwierdzenie albo korekta do
  wyjaśnienia) i Kategorie (nazwy, koperta codzienna / planowa / bez, podkategorie, archiwizacja).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione – m.in. wpisana kwota nie ginie przy Ctrl+N ani
  przy zmianie ekranu (T34), kierunek wybrany przed kwotą i znak części paragonu, potwierdzenie salda sprzed salda
  otwarcia, „Koszty” na liście jak w silniku, świeży zegar po powrocie z zasobnika, wartości ustawień z nowszej wersji
  zachowane (T33), silnik liczony raz dla wszystkich paneli.
- Testy: 237 unit + fs, E2E `tests/e2e/operations.spec.ts` (3) + E0 (5).

Do sprawdzenia przez użytkownika (po wydaniu grupy A):
1. Operacje (Ctrl+2): Ctrl+N, kwota, kategoria, „Podziel paragon”, „Do zwrotu”, wpływ (zielony z „+”).
2. Ustawienia → Konta: „Saldo w banku teraz” dla mBanku → saldo otwarcia; drugi raz inna kwota → korekta w Operacjach.
3. Ustawienia → Kategorie: zmiana nazwy, podkategoria, koperta codzienna / planowa.

## E0 – fundament (16.10.2026)

Zrobione (kryteria z `plan.md`):
- Stos jak ICTTJ (Electron 44, React 19, TS 6, Vite 7, Tailwind 4), build portable + NSIS, ikona (`scripts/make-icon.mjs`).
- CI: Linux (Node 22.12 / 24 / 26: typecheck, testy, build, sekcja CHANGELOG), E2E na Linuksie pod Xvfb, blokada Node
  22.11, Windows (build-windows.cmd, smoke spakowanej aplikacji, test aktualizacji portable i instalatora, wydanie).
- Folder danych przeniesiony z ICTTJ: zapis atomowy, historia `.history/`, konflikty kopii OneDrive i duplikatów,
  scalanie zmian z drugiego komputera, wpis przeniesiony zmianą daty, kopie (30 dziennych, ręczne, przed migracją),
  watcher, obecność komputerów; `fi.json` z `schemaVersion` 1.
- Pierwsze uruchomienie: propozycja `OneDrive\FinancialIntel` (D62) albo inny folder; zapamiętany folder przy kolejnym
  starcie.
- Zasobnik (zamknięcie chowa – D64), start z Windows ukryty w zasobniku (przełącznik), jedna instancja, logi.
- Aktualizacje z GitHub Releases (repozytorium publiczne – D61), token opcjonalny.
- Wygląd = tokeny ICTTJ; menu boczne (D44) ze wszystkimi ekranami (E5+ przygaszone – D65), puste ekrany z planowanymi
  panelami: zwijanie, powiększanie, ukrywanie, wysokość i szerokość, osobne okno, zapisane układy; paleta komend,
  skróty Ctrl+1…0, ściąga F1; Ustawienia: Okręt (nazwa okrętu, praca na kilku komputerach), Folder i kopie,
  Zasobnik i start, Aktualizacje; Synchronizacja (konflikty, pliki z błędami, usunięte wpisy, historia).
- Testy: `tests/unit`, `tests/fs`, `tests/e2e` (smoke, panele, ustawienia, synchronizacja), `tests/update` (Windows CI).
- Przegląd `/code-review` high: 10 znalezisk, wszystkie poprawione – m.in. folder ICTTJ nigdy nie staje się folderem FI
  (`DataStore.inspect` 'ictj'), dane FI bez `fi.json` (OneDrive w trakcie) nie dostają nowych danych ani zagnieżdżonego
  `FinancialIntel\FinancialIntel` ('partial'), niedostępny folder bez „Utwórz dane tutaj”, kopie i eksport tylko z danymi
  (`isDataFile`), rekord bez id dostaje id z nazwy pliku (`idFromPath`), kopia / eksport / rozstrzygnięcie konfliktu
  dopiero po zapisaniu zmian, plik `firma.json` nie jest kopią `fi.json`.
- Poprawka względem ICTTJ: zachowanie kopii konfliktu pliku ustawień przekazuje nowe ustawienia do okna (w ICTTJ
  `journal.json` zostawał w oknie stary i autozapis mógł nadpisać zachowaną kopię – do zgłoszenia w ICTTJ).

Do sprawdzenia przez użytkownika (Windows 11):
1. Pobrać `Financial-Intel-Setup.exe` i `Financial-Intel-portable.exe` z wydania v0.1.0 (albo z artefaktu PR).
2. Pierwsze uruchomienie → „Utwórz w OneDrive” → w OneDrive powstaje `FinancialIntel\fi.json`.
3. Menu boczne, ekrany, panele (zwiń, powiększ, ukryj, osobne okno na drugim monitorze), Ctrl+K, F1.
4. Ustawienia → Okręt: nazwa okrętu; Zasobnik i start: start z Windows → restart komputera → ikona w zasobniku.
5. Zamknięcie okna chowa do zasobnika, „Zakończ” w menu ikony kończy.
6. Aktualizacja: po wydaniu 0.1.1 / 0.2.0 aplikacja sama ją pobierze i zainstaluje przy zamknięciu.

## Przed etapem E0 (zapis komunikatu z 16.10.2026)

1. **Co trzeba wiedzieć** – zakres: fundament (stos, CI, instalator i portable, aktualizacje, folder danych, zasobnik
   i autostart, menu boczne i puste ekrany w stylu ICTTJ, szkielet ustawień); kod przenoszony z ICTTJ @ 84a8339.
2. **Pytania z propozycją** (odpowiedzi użytkownika: wszystko zgodnie z propozycją, repozytorium publiczne) – D61–D66.
3. **Co przygotować** – nic przed startem; po wydaniu 0.1.0 test na Windows (lista wyżej). Token GitHub niepotrzebny
   (repozytorium publiczne).
4. **Model, thinking, czas** – Opus 5.5 · high (plan), z górką xhigh.

## Dziennik

- 16.10.2026 – specyfikacja, decyzje i plan po wywiadzie z użytkownikiem (rozmowa w Claude, nie w repozytorium).
- 16.10.2026 – przegląd punktów styku z ICTTJ (D54–D60): konto tradingowe tylko w ICTTJ, bez etapu „Okręt bojowy”,
  bez kosztów i bilansu tradingu; menu boczne potwierdzone (D44).
- 16.10.2026 – „Przed etapem E0”: D61 (repozytorium publiczne), D62–D66; roadmapa z modelem i thinking z górką.
- 16.10.2026 – E0 zrobiony (0.1.0), PR #1 scalony do `main`.
- 16.10.2026 – zasady prowadzenia (D67): tabela po każdym kroku, bez komendy nie zaczynam etapu, grupy A–E.
- 17.10.2026 – start grupy A (E1 + E2, D68), CSV z mBanku od użytkownika; E1 zrobiony od zera (model, silnik,
  Operacje, konta, kategorie), przegląd i poprawki.
- 17.10.2026 – E2 (import z mBanku), przegląd i poprawki; zamknięcie grupy A: 0.3.0, PR do `main`; „Przed etapem E3”
  (grupa B → 1.0.0, model max); pauza.
