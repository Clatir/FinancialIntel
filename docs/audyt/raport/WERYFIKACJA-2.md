# Audyt 1.15.4 – weryfikacja sceptyczna W2 (AU-11, krok 3)

- Data: 2026-11-03, 20:20–21:50 (zegar systemu bez zmian, dziś = 03.11.2026 – ten sam dzień co przebiegi KR, MO, SW).
- Weryfikator: W2 (Opus · xhigh). Lista: znaleziska średnie kreatora, Mostka i szybkiego wpisu – KR.12 (+ KR.23,
  LICZBY-AB R-4), KR.13, KR.16, KR.19, KR.29, KR.31, MO.11 + MO.15 (R-20), MO.20 (R-11 / S4), SW.24, SW.26, SW.31, SW.33.
- Wydanie: `C:\FI-audyt\wydanie\1.15.4\app\Financial Intel.exe` przez `tests/audyt/lab.ts` (portable, okna poza ekranem);
  najwyżej jedna instancja W2 naraz.
- Stany: nowe foldery z ekranu wyboru folderu (`newBudget` z `kr-pomoc.ts`) + pliki banku `C:\FI-audyt\pliki\kr\`
  (`kr-dzis.csv`, `kr-krotka.csv`, `kr-miesiac.csv`); kopia `rok` (`useState('rok', …)`) dla MO i SW; w SW stan szczególny
  jak w `sw-k` (domownicy z `addMembers`, tagi „Wakacje Chorwacja” 30.10 i „Remont” 23.10).
- Przebiegi i skrypty: `w2-kr-a` (`tests/audyt/w2-kr-a.spec.ts` – KR.12 / R-4 / KR.19 na historii persony), `w2-kr-b`
  (`w2-kr-b.spec.ts` – KR.13, KR.31, KR.23), `w2-kr-c2` (`w2-kr-c.spec.ts` – KR.16, KR.19 na historii syntetycznej;
  pierwsze dwa podejścia `w2-kr-c` przerwane czekaniem narzędzia na import > 30 s przy obciążeniu – nieważne, ich
  wiersze w `w2.jsonl` ze stanem „… (przebieg w2-kr-c)” pomijać),
  `w2-kr-d3` (`w2-kr-d.spec.ts` – KR.29 (a); `w2-kr-d` przerwany zawieszonym zamknięciem przed `attrib` – nieważny),
  `w2-mo` (`w2-mo.spec.ts`), `w2-sw` (`w2-sw.spec.ts`). Teksty ekranów: `C:\FI-audyt\przebiegi\w2-*\kr.log` albo
  `przebieg.log`; odczyty `C:\FI-audyt\odczyty\w2.jsonl`; zrzuty `C:\FI-audyt\zrzuty\W2-*.png`.
- Kolejność metody zachowana: każde znalezisko najpierw odtworzone w wydanej aplikacji (skrypty bez zaglądania do `src\`),
  potem przyczyna w kodzie. Wymagania: `docs/specyfikacja.md`, `docs/decyzje.md` (Grep po T…/D…), punkty
  `docs/audyt/punkty/1-start-mostek-wpis.md`, odpowiedzi wyroczni `C:\FI-audyt\wyrocznia\`.

## Werdykty

| Znalezisko | Werdykt | Waga przed | Waga po | Przyczyna (plik:linia) | Poprawka |
| --- | --- | --- | --- | --- | --- |
| KR.12 (+ R-4) | POTWIERDZONE | S | S | `renderer/features/wizard/WizardPage.tsx:98–100` (podstawa: saldo wpisane „teraz” albo z salda otwarcia „do wczoraj”), `:305–317` (krok 6 bez skutku startu) | S |
| KR.23 | POTWIERDZONE (duplikat KR.12) | S | S | jak KR.12 – krok 6 nie pokazuje pierwszej pensji z osłon (`fleet.ts:1155–1186`, `payMonth`) | (w KR.12) |
| KR.13 | POTWIERDZONE | S | S | `renderer/features/wizard/state.ts:73–91` (`startWizard` zawsze `...initial()`), `renderer/app/Banners.tsx:113–120` (baner także na Imporcie w trakcie kreatora) | S |
| KR.31 | POTWIERDZONE (duplikat przyczyny KR.13) | S | S | jak KR.13; odpowiedzi tylko w pamięci (`state.ts:71`, zustand bez zapisu) | S (powrót) / M (pamięć po restarcie) |
| KR.16 | POTWIERDZONE – inna istota niż w raporcie KR; kwota – WYMAGANIE | S | S (K, gdy użytkownik uzna, że płatność sprzed startu zamyka cykl) | `shared/calc/fleet.ts:957–966` (rata zbiornika dla cyklu niezamkniętego) i `:1013–1017` (cykl zamyka tylko płatność po starcie) wobec `cargoStatus.ts` (Ładownia: „Zapłacone 02.11”) | M |
| KR.19 | WYMAGANIE (aplikacja = T286) | S | N, jeśli zmiana T286 | `shared/calc/plan.ts:286–291` (cykle 2 / 3 / 6 tylko stała kwota), `:297–308` (harmonogram: 9 z 12 miesięcy, przerwa ≤ najdłuższej) | S |
| KR.29 | POTWIERDZONE (wariant (a); (b) nie powtarzany) | S | S | `main/datastore/store.ts:716–720`, `:735` (tylko do odczytu = tylko nowszy format / brak folderu – bez próby zapisu), `renderer/features/wizard/state.ts:115`, `:130`, `:133`, `:155` (start – osobne zapisy rekordów) | M |
| MO.11 + MO.15 (R-20) | POTWIERDZONE | S | S | `shared/calc/briefing.ts:259–276` (`nextUnpaidOf` z `dueDay` kontenera) wobec `radar.ts:103–104`, `:121–138` i Ładowni (`cargoStatuses`, dzień z historii – T208) | S |
| MO.20 (R-11 / S4) | POTWIERDZONE | S | S | `renderer/features/bridge/BridgePage.tsx:719–721`, `renderer/features/settings/HouseholdTab.tsx:203–206` – wiersz osoby pokazuje „ma oddać” albo „zaliczka”, nigdy oba | S (+ decyzja S4) |
| SW.24 | POTWIERDZONE | S | S | `renderer/components/fields.tsx:55–59`, `:86–90` (ujemna kwota odrzucona komunikatem przez `toast`) + `renderer/main.tsx:21` (okno szybkiego wpisu bez `<Toasts />`), `QuickApp.tsx:509` | S |
| SW.26 | WYMAGANIE (aplikacja = T291) | S | N / S, jeśli zmiana T291 | `shared/calc/tags.ts:19–22` (`tagKey` = wielkość liter i polskie znaki, „-” ≠ spacja) | S |
| SW.31 | POTWIERDZONE | S | S | `renderer/features/quick/QuickApp.tsx:372–377` (Esc zamyka bez zastosowania szkicu pola) + `components/fields.tsx:97–100` (Esc w polu kasuje szkic kwoty) | S |
| SW.33 | POTWIERDZONE | S | S | `renderer/store/quickHost.ts:39–40` (podkategoria zarchiwizowanej kategorii głównej zostaje na liście), `QuickApp.tsx:199–219` (brak czyszczenia i komunikatu; komunikat nadpisywany) | S |

Pilne (kolejność): KR.16 (pieniądze – pierwsza pensja i fałszywa asteroida; pytanie o wagę K do użytkownika), SW.33
(zapis na zarchiwizowaną kategorię bez słowa), SW.31 / SW.24 (cicha utrata wpisanej kwoty), KR.13 / KR.31 (jedna linia
w `startWizard`), MO.11 (jedna reguła dnia płatności dla odprawy).

---

## KR.12 – POTWIERDZONE (S); R-4 – POTWIERDZONE

**Odtworzenie** (`w2-kr-a`, 20:25–20:33; skrypt `tests/audyt/w2-kr-a.spec.ts`): nowy folder; krok 1 – „Ania” ma oddać
240,00, „Łukasz Żółć” zaliczka 300,00, mBank 8 432,17 (saldo „teraz”, z dzisiejszymi zakupami), Portfel XTB 1 250,00;
krok 2 – `kr-dzis.csv` (historia persony + 03.11 BIEDRONKA −45,90 i ŻABKA −12,00); pensja z propozycji 6 700,00; krok 6
z propozycji; „Uruchom budżet”.
- Krok 6: „Obecne środki: 9 682,17 zł na kontach budżetu.”, „Osłony · bufor na pensje 9 682,17 zł cel 20 100,00 zł”,
  kadłub 0 – bez słowa o pierwszej pensji ani depozycie (zrzut `W2-KR.12-krok6.png`).
- Mostek po starcie: „Osłony · bufor na pensje 2 740,07 zł / 20 100,00 zł”, „Energia · pensja miesiąca do wydania
  6 642,10 zł”, „Depozyt domowników … 300,00 zł”, „Suma kont budżetu: 9 682,17 zł”, a w odprawie od razu „Osłony (bufor
  na pensje) poniżej minimum o 3 959,93 zł.” (zrzut `W2-KR.12-mostek.png`).
- Pliki: saldo otwarcia mBanku 8 490,07 zł (= 8 432,17 + 57,90, początek dnia – T51), Portfel 1 250,00.

Liczby się domykają (9 740,07 na początek dnia − pensja 6 700 − depozyt 300 = 2 740,07; energia 6 700 − 57,90; suma
warstw = suma kont, zaliczka liczona raz, należność 240 poza kontami) – silnik jest zgodny z T51, T116, T220. Niezgodne
jest to, co pokazuje krok 6: (1) osłony z kroku 6 nie są osłonami po starcie i ekran nie mówi, że pierwsza pensja i
depozyt zejdą z osłon ani że budżet wystartuje poniżej minimum osłon (punkt: „różnicę wyjaśnia ekran kreatora”); (2) R-4 –
podstawa podziału to saldo teraz (9 682,17), a silnik dzieli saldo z początku dnia (9 740,07).

**Przyczyna:** `WizardPage.tsx:98–100` – `startBalance = w.balances[id] ?? (openings.has(id) ? fromOpening(id) : 0)`:
wpisane saldo jest „teraz” (z dzisiejszymi operacjami), saldo z rekordu otwarcia – `balanceAt(…, wczoraj)`, czyli początek
dnia; ta sama suma `total` ma więc dwie podstawy (stąd kr-otwarcie / KR.8 zgodne, kr-salda / KR.12 nie). `finishWizard`
(`state.ts:130`) zapisuje saldo otwarcia `openingFromNow(…)` (teraz − operacje dnia), a silnik (`fleet.ts:1163–1184`)
dzieli `startTotal` z otwarć: `rest = startTotal − hull − cele − zbiorniki` → osłony, potem `payMonth` (pensja z osłon).
Krok 6 (`WizardPage.tsx:305–317`) pokazuje `total − hull − cele − zbiorniki` bez pensji i depozytu.

**Poprawka i test (S):** podstawa kroku 6 = `openingFromNow` dla wpisanych sald (jedna funkcja z `finishWizard`); pod
podziałem wiersz „Po starcie: osłony X − pierwsza pensja Y (do energii) − depozyt domowników Z = W” i ostrzeżenie, gdy
W < minimum osłon. Test unit (czysta funkcja podstawy kreatora: saldo wpisane z zakupem dziś = saldo z otwarcia) + e2e
(`tests/e2e/wizard*.spec.ts`: krok 6 „po starcie” = osłony na Mostku). Bez migracji (podział zapisany kwotami kadłuba i
celów, warstwy liczone na nowo).

**Uwagi:** z kodu (nie odtworzone): przy wpływie z dziś podstawa „teraz” jest większa niż początek dnia, a kreator pozwala
wpisać kadłub i cele do niej (`overSplit`, `WizardPage.tsx:116`) – silnik dałby wtedy osłony ujemne na początek dnia startu
(`addShields(rest)` z `rest < 0`), czego KR.24 zabrania; test poprawki powinien objąć i ten wariant. Duplikat: KR.23.

## KR.23 – POTWIERDZONE (S), duplikat KR.12

**Odtworzenie** (`w2-kr-b`, po ponownym uruchomieniu; bez dzisiejszych operacji – `kr-krotka.csv` kończy się 01.11):
mBank 40 000,00, Portfel 0, pensja 4 000,00, cel własny „B” 3 500,00. Krok 6: „Obecne środki: 40 000,00 zł …”, „Osłony ·
bufor na pensje 12 000,00 zł cel 12 000,00 zł”, kadłub 28 000,00, B 0 (kadłub niepełny – kolejność poprawna; zrzut
`W2-KR.23-krok6.png`). Mostek: „Osłony 8 129,00 zł / 12 000,00 zł”, „Energia 3 871,00 zł” (4 000 − 129 wydane 01.11), „Kadłub
28 000,00 zł”, „Suma kont budżetu: 40 000,00 zł” (`W2-KR.23-mostek.png`). Bez R-4 (brak operacji z dziś) różnica to wyłącznie
pierwsza pensja przeniesiona z osłon do energii (spec „Pensja od siebie”, T45, T220) – ekran kroku 6 jej nie pokazuje.
Kadłub i cele zgodne z krokiem 6. **Przyczyna, poprawka, test:** jak KR.12 (jedna poprawka).

## KR.13 – POTWIERDZONE (S)

**Odtworzenie** (`w2-kr-b`, 20:34–20:39): mBank 10 000,00, Portfel 0,00; krok 2 → import `kr-krotka.csv` → „Wróć do
kreatora”, pensja 5 000,00 – kontrola: „[otwarty na: 3. Pensja i warstwy] mBank „10 000,00”, Portfel „0,00”, pensja „5 000,00””
(droga z punktu działa). Potem krok 2 → „Importuj plik z mBanku”: na ekranie Import jednocześnie „Wróć do kreatora” i baner
z przyciskiem „Kreator startu” (`W2-KR.13-import.png`); klik w baner → „[otwarty na: 1. Konta i salda] mBank „”, Portfel
„”, pensja „7 000,00”” – salda puste, pensja z propozycji, bez ostrzeżenia (`W2-KR.13-po-banerze.png`).

**Przyczyna:** `state.ts:73–91` – `startWizard()` dla budżetu bez startu zawsze robi `setState({ ...initial(), active:
true, … })`, także gdy kreator już trwa (`active: true`); `Banners.tsx:113–120` pokazuje baner na każdej stronie poza
`wizard` (warunek nie patrzy na `useWizard().active`), więc w Imporcie są dwie drogi powrotu, a jedna kasuje odpowiedzi.

**Poprawka i test (S):** w `startWizard` – gdy `useWizard.getState().active`, tylko `navigate({ page: 'wizard' })`;
baner w trakcie kreatora z napisem „Wróć do kreatora” albo ukryty. Test unit (`tests/unit`, sklep z atrapą `window.fi`:
`startWizard` dwa razy zachowuje `balances` i `salary`) + e2e (baner z Importu wraca z wpisanymi saldami). Bez migracji.

## KR.31 – POTWIERDZONE (S), ta sama przyczyna co KR.13

**Odtworzenie** (`w2-kr-b`): kroki 1–3 wypełnione („przed wyjściem: … mBank „10 000,00”, Portfel „0,00”, pensja
„5 000,00””) → Ctrl+2 → baner „Kreator startu” → „mBank „”, Portfel „”, pensja „7 000,00”” (`W2-KR.31-baner.png`); to
samo przez Ctrl+K „Kreator startu budżetu” (`W2-KR.31-paleta.png`); zamknięcie w trakcie kreatora → folder bez pół-budżetu
(„balances 0, months 0, budget {"start":null,"initial":null}” – dobrze) → po ponownym starcie Mostek „Budżet jeszcze nie
wystartował.”, kreator od kroku 1 z pustymi polami, bez informacji, że odpowiedzi przepadły (`W2-KR.31-restart.png`).

**Przyczyna:** jak KR.13 (`state.ts:73–91` – baner i paleta wołają `startWizard`, `CommandPalette.tsx:87`); odpowiedzi
żyją tylko w pamięci okna (`state.ts:71`, `create<WizardState>` bez zapisu).

**Poprawka i test:** powrót – ta sama linia co KR.13 (S); po restarcie – szkic odpowiedzi w pamięci komputera (np.
`config.json`, M) albo zdanie w kroku 1 „Kreator zaczyna od nowa – odpowiedzi nie są zapamiętywane po zamknięciu” (S).
Test jak KR.13 + e2e z restartem. Bez migracji. Wymaganie: punkt „brak wymagania” – reguła CLAUDE.md „opuszczenie ekranu
nigdy nie gubi zmian”; dla restartu punkt dopuszcza start od nowa „z jasną informacją”, której nie ma.

## KR.16 – POTWIERDZONE (inna istota niż w raporcie KR), waga S; kwota – WYMAGANIE (możliwe K)

**Odtworzenie** (`w2-kr-c2`, 21:12–21:19): nowy folder; mBank 107 333,06, Portfel 0; `kr-miesiac.csv` (PZU OC 1 240,00
płacone 04.11.2024, 03.11.2025 i 02.11.2026 – dzień przed startem); w ładowni tylko czynsz, Netflix i PZU (bez WARTY, żeby
widać sam zbiornik PZU).
- Krok 3 przed wyborem OC: „W tym miesiącu wydano już 1 624,40 zł: pierwsza pensja na resztę miesiąca to 1 775,60 zł (pełna
  od 1. następnego miesiąca).”; po zaznaczeniu PZU: „… 384,40 zł: … 3 015,60 zł …” (X bez płatności OC, zwrot pomniejsza –
  zgodnie z punktem i T45 / T220).
- Krok 4: „Odkładki w tym miesiącu: 1 240,00 zł – zbiorniki nadrabiają do terminów opłat; potem ok. 103,33 zł miesięcznie.”;
  krok 6: „zbiornik: PZU SA … do planu (1 136,63 zł)”.
- Po starcie: kontener PZU z `dueDay` 3 (z płatności 03.11.2025); Mostek „Asteroida: PZU SA dziś – 1 240,00 zł, w zbiorniku
  1 240,00 zł.”, „Energia · pensja miesiąca do wydania 1 775,60 zł”, „Zbiorniki 1 240,00 zł”; Plan miesiąca „Wypłacono:
  3 015,60 zł – pierwszy miesiąc budżetu: bez tego, co wydano przed startem”, „Odkładki – opłaty okresowe 1 240,00 zł”,
  „Energia miesiąca (pensja do wydania) 1 775,60 zł”; Ładownia jednocześnie „W TYM MIESIĄCU Zapłacone: 1 240,00 zł (02.11)”
  i w „Odkładki” „PZU SA termin listopad 2026 (w tym miesiącu) 1 240,00 zł / 1 240,00 zł”, „Najbliższa: 03.11.2026”
  (zrzuty `W2-KR.16-krok3.png`, `W2-KR.16-krok4.png`, `W2-KR.16-mostek.png`, `W2-KR.16-plan.png`, `W2-KR.16-ladownia.png`).

**Ocena.** Oczekiwanie raportu KR („energia miesiąca po starcie = Y”) jest wzięte zbyt dosłownie: energia miesiąca =
pensja − odkładki (spec „Odkładki – co miesiąc z energii”; wyrocznia: „start XI 6 216,63 = 6 500 − odkładki 283,37”), więc
różnica Y − energia = odkładki jest zgodna z regułą. Prawdziwy błąd jest gdzie indziej: pierwsza pensja odkłada pełne
1 240 zł na termin, który już zapłacono – energia wychodzi dokładnie taka (1 775,60), jakby wybór OC w kroku 4 nic nie
zmienił, a notka kroku 3 obiecuje 3 015,60. Aplikacja przeczy sama sobie (Ładownia „Zapłacone … (02.11)” obok „termin …
(w tym miesiącu) 1 240 / 1 240” i asteroidy „dziś”). Pieniądze nie giną (zbiornik pełny na listopad 2027, raty przez rok
0 zł), ale energia listopada jest niższa o 1 240 zł. Wyrocznia AU-9 policzyła to samo co aplikacja („Pytanie do AU-11”), a
wymagania są niejednoznaczne: T45 / T220 – płatność opłaty okresowej sprzed startu „jest zbiorników” (nie z pensji);
T135 – „zapłacony cykl: bez rat, zbiornik zbiera na następny”, „cykl sprzed śledzenia opłaty (przed startem) zamknięty”;
termin 03.11 wypada w dniu startu, płatność dzień wcześniej. Waga S (myli, brzeg: roczna opłata zapłacona tuż przed
startem); jeśli użytkownik uzna, że płatność sprzed startu zamyka cykl – energia pierwszego miesiąca to zła kwota (K)
i potrzebna druga opinia (Fable).

**Przyczyna:** `fleet.ts:957–966` – w `payMonth` rata zbiornika liczona dla cyklu, którego nie ma w `paidCycles`; `paidCycles`
wypełniają tylko płatności przetwarzane po starcie (`fleet.ts:1013–1017`), a płatność 02.11 jest sprzed startu (saldo
otwarcia). `sinkingInstallment` (`fleet.ts:212–220`) w ostatnim miesiącu cyklu przy zbiorniku 0 daje całą kwotę. Ładownia
liczy stan z `cargoStatuses` (T208: płatność w oknie [termin − 14 dni, …)) – stąd „Zapłacone”. Odprawa: `nextUnpaidOf` bez
`paidDue` → „dziś”. Kreator robi to samo w kroku 4 (`WizardPage.tsx:128–130`, `sinkingInstallment(…, 0)`).

**Poprawka i test (M, silnik pieniędzy – max):** przy starcie oznaczyć jako zapłacone cykle kontenerów okresowych, których
połączona płatność z miesiąca startu sprzed startu leży w oknie terminu (ta sama reguła co `startMonthSpentOf` i
`cargoStatuses`), i liczyć ratę następnego cyklu (103,33); kreator (krok 4, „do planu”) z tej samej funkcji. Test unit
`tests/unit/fleet*.test.ts` na przykładzie: start 03.11, OC 1 240 co rok, płatność 02.11 → rata listopada 103,33, brak
asteroidy „dziś”, energia = Y − 103,33. Bez migracji (warstwy liczone z rekordów; zamrożone dni gry zostają).

## KR.19 – WYMAGANIE (aplikacja zgodna z T286)

**Odtworzenie.** (a) Historia syntetyczna (`w2-kr-c2`): „TAURON SPRZEDAŻ SP. Z O.O. co miesiąc · zmienna 231,00 zł”, „PZU SA co
rok 1 240,00 zł”, „SPÓŁDZIELNIA GARAŻOWA TESTOWO co kwartał 300,00 zł”, „WARTA SA co rok 480,00 zł”; nic nie zaznaczone samo;
po starcie płatność PZU połączona („Połączono z kontenerem: 1 płatność od 01.11.2026.”) – to, czego punkt wymaga, działa.
(b) Historia persony (`w2-kr-a`, `W2-KR.19-krok4.png`): brak propozycji TAURON (prąd co 2 miesiące: 22.09.2025 … 21.09.2026,
7 płatności 153,06–222,08 zł) i „SPOTIFY w miesiącach: sty, lut, mar, kwi, maj, cze, lip, lis, gru 23,99 zł” (płacony co
miesiąc 08.09.2025–08.07.2026, potem nie).

**Przyczyna – zgodna z wymaganiem:** `plan.ts:286–291` – cykle 2 / 3 / 6 miesięcy wymagają stałej kwoty (`steady`, ±15 %);
rachunek zmienny tylko co miesiąc (`:278–283`) – dosłownie T286 („co 2, 3, 6 miesięcy – … stała kwota”; „rachunek zmienny”
tylko przy „co miesiąc”). `plan.ts:297–308` – harmonogram: 9 płatności w 12 miesiącach, każda w innym miesiącu, stała kwota,
ostatnia 4 miesiące temu = najdłuższa przerwa (lip → lis) – dosłownie T286 („następna nie przegapiona (najdłuższa
przerwa)”). Tekst Ładowni („co 2, 3 albo 6 miesięcy … rachunek o zmiennej kwocie”) nie obiecuje zmiennego co 2 miesiące.

**Do decyzji użytkownika:** (1) czy rachunek o zmiennej kwocie co 2 miesiące (typowy prąd w Polsce) ma być rozpoznawany;
(2) czy opłata miesięczna, która ustała, ma być proponowana jako harmonogram (np. wymóg, by po ostatniej płatności nie
brakowało terminu miesięcznego). Gdy tak – S (dwie reguły w `detectCycle` + testy unit `tests/unit/plan*.test.ts` na obu
wzorcach), waga po N (propozycja wymaga potwierdzenia – D70; Mostek osobno ogłasza „Kontener bez płatności – Spotify …”).

## KR.29 – POTWIERDZONE (S)

**Odtworzenie** (`w2-kr-d3`, 21:30–21:34; skrypt `tests/audyt/w2-kr-d.spec.ts` = kopia `kr-ro.spec.ts` z własnymi nazwami):
nowy folder, zamknięcie, `attrib +R` na plikach i folderze („A    R … fi.json”), ponowny start. Mostek: baner kreatora,
żadnego komunikatu „tylko do odczytu” (`komunikat tylko do odczytu: 0`); w kreatorze „Dodaj domownika” (z imieniem),
„Dodaj cel”, „Wybierz folder…” i „Uruchom budżet” aktywne (`W2-KR.29-atrybut-mostek.png`, `W2-KR.29-atrybut-krok7.png`). Po
„Uruchom budżet”: „Budżet uruchomiony – część zmian nie zapisała się jeszcze w folderze (EPERM: operation not permitted,
rename '…\.fi.json.tmp-05728e4a' -> '…\fi.json') – aplikacja ponawia zapis automatycznie.”, u góry „błąd zapisu – ponów”
(`W2-KR.29-atrybut-po.png`). W folderze dodane `balances/2026/2026-11-03_…` ×2 i `months/2026-11.json`, `fi.json` bez zmian
(„budget: {"start":null,"initial":null}”) – salda otwarcia i plan bez startu budżetu. Zamknięcie zawisło (pytanie o
niezapisane zmiany; laboratorium zamknęło po 40 s). Atrybut zdjęty po przebiegu (sprawdzone: „A … fi.json”). Wariant (b)
(format v2 – zły powód w podpowiedzi przycisku) – nie powtarzany (czas).

**Przyczyna:** stan „tylko do odczytu” zna tylko nowszy format i niedostępny folder (`store.ts:516`, `:716–720`, `:735`) –
nikt nie sprawdza, czy do folderu da się pisać (atrybut R, uprawnienia), więc kreator (`useFolderLocked`) i `finishWizard`
(`state.ts:115`) nie mają powodu odmówić. Start to kilka niezależnych zapisów przez autozapis (`state.ts:130` salda otwarcia,
`:133` ustawienia ze startem, `:155` plan miesiąca, kontenery) – nowe pliki powstają (na Windows atrybut R folderu nie
blokuje tworzenia plików), a podmiana istniejącego `fi.json` pada.

**Poprawka i test (M):** przy otwarciu folderu próba zapisu (plik tymczasowy i podmiana istniejącego) → `readOnly` z
powodem „Folder jest tylko do odczytu”; start kreatora z `fi.json` jako pierwszym zapisem (albo wycofaniem reszty, gdy
padnie). Test fs (`tests/fs`, folder z plikiem bez prawa zapisu: `attrib +R` na Windows / `chmod` na Linuksie → status
`readOnly`) + e2e (kreator: przycisk nieaktywny, nic nie zapisane). Naprawa danych: niepotrzebna – folder z saldami
otwarcia bez startu pokazuje baner „Budżet liczy się na razie od salda otwarcia …”, a ponowny kreator aktualizuje te same
rekordy (`balances/actions.ts:16–19`), nie dubluje ich.

## MO.11 + MO.15 (R-20) – POTWIERDZONE (S)

**Odtworzenie** (`w2-mo`, 21:16; kopia `rok`, w trakcie z interfejsu: Ładownia → „OC samochodu” → pole „Płatność”
25.11.2025 → 06.11.2025): Ładownia „Termin: 25.11 – 1 240,00 zł. dzień płatności z historii: 25.”, lista „termin 25.11”;
Radar „25.11 asteroida OC samochodu w zbiorniku 1 240,00 zł”; Mostek „Asteroida: OC samochodu za 3 dni – 1 240,00 zł,
w zbiorniku 1 240,00 zł.” (`W2-MO.11-ladownia.png`, `W2-MO.11-odprawa.png`). Kwota i zbiornik zgodne, termin nie: odprawa
ostrzega za 3 dni, Radar i Ładownia mówią o 22 dniach (w `mo-c3` odwrotnie – brak asteroidy Podatku za 12 dni). MO.15 to ta
sama odprawa (duplikat).

**Przyczyna:** `briefing.ts:259–276` – asteroida z `nextUnpaidOf(c, f.today, paidDue)`, czyli z `dueDay` kontenera; Radar
(`radar.ts:103–104`, `:121–138`) dla cyklu bieżącego miesiąca bierze `cargoStatuses` (dzień z historii płatności – T208)
i pomija datę z `dueDay`; Ładownia – też `cargoStatuses` (T221 „jak Radar”). `BriefingInput` ma już `cargo`.

**Poprawka i test (S):** w odprawie dla cyklu bieżącego miesiąca termin ze stanu `cargo` (jak Radar), dalsze z
`nextPaymentOf`. Test unit (`tests/unit/briefing*.test.ts`): kontener okresowy z `dueDay` 6 i historią płatności 25. – odprawa
i Radar dają tę samą datę i liczbę dni. Bez migracji.

**Uwagi:** przy okazji widać, że pole „Płatność” kontenera po zmianie nie zmienia terminu w Ładowni ani na Radarze (wygrywa
historia, T208) – użytkownik poprawia termin i nie widzi skutku poza Mostkiem; materiał na AP (pole albo jego opis).

## MO.20 – POTWIERDZONE (S); związek z S4 (R-11)

**Odtworzenie** (`w2-mo`, kopia `rok`): Stan okrętu „Depozyt domowników · ich zaliczki – nie do wydania na siebie 4 797,20
zł” (`W2-MO.20-stan.png`); panel „Rozliczenia z domownikami”: „Anna zaliczka – czeka na wydatki 4 377,20 zł”, „Kasia
zaliczka – czeka na wydatki 360,00 zł”, „Marek ma oddać · od 20.08 (75 dni) 360,00 zł” (`W2-MO.20-rozliczenia.png`);
Ustawienia → Domownicy: Anna „zaliczka 4 377,20 zł”, Kasia „zaliczka 360,00 zł”, Marek „ma oddać 360,00 zł”
(`W2-MO.20-ustawienia.png`). Widoczne zaliczki: 4 737,20 zł; brakuje 60,00 zł – zaliczki Marka.

**Ocena:** w modelu samej aplikacji (1.15.3 `inflowKind` – wariant B wyroczni) Marek ma naraz dług 360 i zaliczkę 60, a
każdy ekran pokazuje jedną z tych liczb – depozyt ≠ suma tego, co widać przy osobach (punkt: „kwoty jak na ekranach
źródłowych”). To błąd niezależnie od S4. Czy osoba w ogóle może mieć dług i zaliczkę naraz – decyzja S4 (spec / D80 b /
D91: wpłata najpierw spłaca; wtedy depozyt 4 737,20 i zgodność wraca sama).

**Przyczyna:** `BridgePage.tsx:719–721` – `m.owed > 0 ? 'ma oddać …' : 'zaliczka …'` i kwota `m.owed > 0 ? m.owed :
m.deposit`; tak samo `HouseholdTab.tsx:203–206`. Silnik (`fleet.receivables.members`) ma obie wielkości.

**Poprawka i test (S):** wiersz osoby z obiema liczbami („ma oddać 360,00 · zaliczka 60,00”) w panelu, Ustawieniach
i Radarze; test e2e / unit widoku: suma zaliczek przy osobach = „Depozyt domowników”. Bez migracji. Rozstrzygnięcie S4 –
osobno (może zmienić liczby Marka; wtedy test na przykładzie z D91).

## SW.24 – POTWIERDZONE (S)

**Odtworzenie** (`w2-sw`, 21:22; kopia `rok`): Osobiste · ubrania, w „Kwota” „-49,99” i wyjście z pola → pole „”, bez
podglądu, komunikatu i czerwonej ramki (`aria-invalid` false); to samo „20-69,99”; Enter → „Wpisz kwotę.”; 0 nowych
operacji (`W2-SW.24.png`, `W2-SW.24-enter.png`). Ani zwrot towaru, ani informacja, że zwrot wpisuje się w Operacjach.

**Przyczyna:** `fields.tsx:55–59` – kwota ujemna bez `allowNegative` → `undefined`, a `onBlur` (`:86–90`) mówi o tym tylko
przez `toast('Nieprawidłowa kwota – zostaje poprzednia.')`; okno szybkiego wpisu renderuje `QuickApp` bez `<Toasts />`
(`main.tsx:21`; `Toasts` tylko w `App.tsx:303`, `:331`), więc komunikat nie pojawia się nigdzie, a „poprzednia” = pusta.
`QuickApp.tsx:509` – pole bez `allowNegative`.

**Poprawka i test (S):** w oknie szybkiego wpisu komunikat w stopce („Zwrot towaru wpisz w Operacjach” albo przyjęcie
ujemnej kwoty jako zwrotu – decyzja wyglądu, spec „Zwrot towaru to ujemny wydatek w tej samej kategorii”); ogólnie –
`AmountField` z własnym komunikatem w miejscu, gdzie nie ma tostów. Test e2e (`tests/e2e/quick*.spec.ts`): „-49,99” daje
widoczny komunikat i nie zapisuje 49,99. Bez migracji.

## SW.26 – WYMAGANIE (aplikacja zgodna z T291)

**Odtworzenie** (`w2-sw`): „+ #Wakacje Chorwacja” (bez „Remont” – starszy niż 7 dni), 54,30, „Gdzie” „Konzum
#wakacje-chorwacja”, „Notatka” „#Remont łazienki”, Enter → rekord `counterparty: "Konzum"`, `note: "#Remont łazienki"`,
`tags: ["Wakacje Chorwacja","wakacje-chorwacja","Remont"]`; Wywiad → Wyprawy: „#Wakacje Chorwacja 30.10.2026 – 03.11.2026 ·
2 operacje 82,90 zł” i osobno „#wakacje-chorwacja 03.11.2026 · 1 operacja 54,30 zł” (`W2-SW.26-okno.png`,
`W2-SW.26-wyprawy.png`). Reszta punktu zgodna.

**Przyczyna – zgodna z wymaganiem:** `tags.ts:19–22` – `tagKey = fold(tagLabel(s))`: bez wielkości liter, polskich znaków
i nadmiarowych spacji, „-” ≠ spacja – dosłownie T291 („Jeden tag różnie zapisany („#Wakacje”, „wakacje ”) to jeden
(`tagKey` – bez wielkości liter i polskich znaków)”). Punkt zakłada, że „#wakacje-chorwacja” to „Wakacje Chorwacja”.

**Do decyzji użytkownika:** „#słowo” nie może mieć spacji, więc wyprawy z kilku słów zawsze się rozdwoją przy wpisie przez
„#”. Propozycja: `tagKey` traktuje „-” i „_” jak spację (S; test unit `tests/unit/tags*.test.ts`; istniejące tagi łączą się
same – klucz liczony, bez migracji). Waga po zmianie T291: S (koszt wyprawy rozbity na dwie).

## SW.31 – POTWIERDZONE (S)

**Odtworzenie** (`w2-sw`): w „Kwota” 64,20 i Esc bez wychodzenia z pola → okno ukryte; po ponownym otwarciu kwota „”, szkic
0 (`W2-SW.31-esc.png`). Dla porównania: 64,20 i przycisk „Zamknij (Esc)” (×) → po otwarciu „64,20”, szkic 1. Esc zamyka
(dobrze), ale porzuca wpisaną kwotę – „szkic czeka” nie działa w tym przypadku, a „×” działa inaczej niż Esc.

**Przyczyna:** `QuickApp.tsx:372–377` – Esc w fazie przechwytywania zamyka okno (`quickClose`) bez zastosowania wartości
pola (Enter robi `blur()` najpierw – `:381–384`); nie zatrzymuje zdarzenia, więc `AmountField` dostaje Esc i kasuje swój
szkic (`fields.tsx:97–100`: `cancelled = true`, `setDraft(null)`), a blur przy ukryciu okna niczego nie zapisuje. Przycisk ×
zabiera fokus z pola, więc kwota trafia do stanu przed zamknięciem.

**Poprawka i test (S):** w `onEscape` zastosować wartość pola przed zamknięciem (np. `stopPropagation` i `blur()` jak przy
Enter, potem `quickClose` w następnym takcie). Test e2e: 64,20 + Esc w polu → po otwarciu szkic z 64,20. Bez migracji.

## SW.33 – POTWIERDZONE (S)

**Odtworzenie** (`w2-sw`, stan z `addMembers`): (1) „Za domownika”, Ania, 44,00, Zwierzęta · karma, Portfel XTB; w głównym
oknie po kolei (po 1,5 s): archiwum Portfela XTB → „Lista kont się zmieniła – sprawdź wybór.”, konto „mBank”; „Archiwizuj”
Zwierzęta → komunikat bez zmian, kategoria „— bez kategorii —”; archiwum Ani → „Lista domowników się zmieniła – sprawdź
wybór.”, podgląd „Finansuje Anna: 44,00 zł – nie zjada energii; z zaliczki 44,00 zł.” (`W2-SW.33-1.png`). Enter → rekord
`categoryId` 01KDEFCAT…401 (Zwierzęta · karma – zarchiwizowana), `memberId` Anny, `accountId` mBank. (2) Tylko
archiwizacja kategorii głównej Zdrowie przy „Zdrowie · leki”: brak komunikatu, pole „— bez kategorii —”, zapis z
`categoryId` 01KDEFCAT…501 (`W2-SW.33-2.png`).

**Ocena:** konto i osoba są zastąpione z komunikatem (punkt dopuszcza „wyczyszczone albo zastąpione”); kategoria – nie:
okno pokazuje „bez kategorii”, a zapisuje zarchiwizowaną, bez słowa („zapis idzie na wybór spoza listy bez komunikatu”).
Komunikat mówi tylko o ostatniej zmienionej liście.

**Przyczyna:** `quickHost.ts:39–40` – lista kategorii dla okna odrzuca tylko kategorie z własnym `archived`; podkategoria
zarchiwizowanej kategorii głównej zostaje, więc `has(categoryId)` w `QuickApp.tsx:199`, `:203`, `:205–207` jest prawdą (nic
nie czyści, brak „kategorii” w komunikacie), a lista wyboru jej nie pokazuje. `QuickApp.tsx:218–219` – każda aktualizacja
nadpisuje komunikat poprzedniej.

**Poprawka i test (S):** w `quickData` odrzucić podkategorie zarchiwizowanych kategorii głównych (jak lista wyboru);
komunikat łączy listy zmienione od ostatniego zapisu. Test unit (`quickData` – podkategoria archiwalnej głównej poza listą)
+ e2e (archiwizacja kategorii głównej przy otwartym oknie → komunikat i zapis bez tej kategorii). Bez migracji (operacje
już zapisane na zarchiwizowanej kategorii są poprawnymi rekordami – kategorię można przywrócić).
