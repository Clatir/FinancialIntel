# Audyt 1.15.4 – weryfikacja sceptyczna W5 (AU-11, krok 3)

- Data: 2026-11-03, 19:40–21:10 (zegar systemu bez zmian, dziś = 03.11.2026 – ten sam dzień co migawki bloku C).
- Weryfikator: W5 (Opus · xhigh). Lista: znaleziska średnie silnika pieniędzy bloku C – LA.3, LA.8 (= C17), LA.10, DO.5,
  C15 (DO.1 / DO.2), MG.12, DM.11, RA.4, PR.9, PR.10 (+ C20).
- Wydanie: `C:\FI-audyt\wydanie\1.15.4\app\Financial Intel.exe` przez `tests/audyt/lab.ts` (portable, okna poza ekranem).
- Stany: kopie migawek bloku C do folderów przebiegów (migawki nietknięte): `la\LA.8-2` → `w5-la`, `do\DO.5-1` → `w5-do5`,
  `do\DO.1-1` → `w5-c15`, `mg\MG.12-2` → `w5-mg12`, `ra\RA.4-1` → `w5-ra4`, `pr\PR.9-4` → `w5-pr9`, `pr\PR.10-2` →
  `w5-pr10`, `dm\DM.11-1` → `w5-dm11` (DM.11 i kontener 0 z PR.10 – kroki w UI na kopii).
- Skrypty: `tests/audyt/w5-a.spec.ts` (LA, DO.5, C15), `tests/audyt/w5-b.spec.ts` (MG.12, RA.4, PR.9, PR.10, DM.11),
  pomoc `tests/audyt/w5-pomoc.ts`. Teksty z ekranu: `C:\FI-audyt\przebiegi\w5-*\out\_log.txt`; zrzuty
  `C:\FI-audyt\zrzuty\W5-*.png` (19).
- Granica ICTTJ: w każdym z 8 przebiegów kopia ICTTJ z sumami SHA-256 przed i po (`out\ictj-przed.json`, `ictj-po.json`) –
  bez zmian we wszystkich.
- Kolejność metody zachowana: każde znalezisko najpierw odtworzone w wydanej aplikacji, potem przyczyna w `src\`.

## Werdykty

| Znalezisko | Werdykt | Waga przed | Waga po | Przyczyna (plik:linia) | Poprawka |
| --- | --- | --- | --- | --- | --- |
| LA.3 | POTWIERDZONE | S | S | `renderer/features/cargo/CargoPage.tsx:320` (podpowiedź bez stanu zbiornika → `:86`, `:66–71`), `:189`, `:198` (wiersz – zbiornik już z ratą miesiąca) | S |
| LA.8 = C17 | POTWIERDZONE | S | S (nie K) | `shared/calc/plan.ts:413–416` – miesiąc, którego silnik nie liczył: rata nominalna bez braku | S |
| LA.10 | POTWIERDZONE | S | S | `shared/calc/cargoWatch.ts:81–92` (płatność > 14 dni przed terminem do poprzedniego cyklu); `cargoStatus.ts` (to samo okno 14 dni) wobec T135 | S–M |
| DO.5 | WYMAGANIE (T163 wobec T65) | S | S, jeśli T65 | `shared/calc/fleet.ts:1063–1078` – pula „tax” zwrotu dopiero z rekordem dokowania | S (wąsko) / M (pula od razu – całe Spostrzeżenia 1 DO) |
| C15 (DO.1 / DO.2) | POTWIERDZONE | S (kandydat) | S | `shared/calc/dock.ts:242–245` – „before-start”, zanim sprawdzi, czy okno pary trwa | S |
| MG.12 | WYMAGANIE (duplikat T163 i MG.8 / C18) | S | – (S przy wyborze wariantu) | `renderer/features/starmap/StarMapPage.tsx:58–62` liczy DOL poprawnie ze stanu silnika; rozjazd z T163 i T129 | bez osobnej |
| DM.11 | ODRZUCONE | S | – | zgodne z T156 („edytor ostrzega; szybki wpis, decyzja zbiorcza i import nie przyjmą”) | – (AP spójności) |
| RA.4 | WYMAGANIE (F1 / T208 wobec D86) | S | S, jeśli D86 | `shared/calc/cargoStatus.ts:113–127` – stan tylko dla terminu `monthOf(today)` | S–M |
| PR.9 | POTWIERDZONE | S | N | `renderer/features/radar/actions.ts:81`, `:122` – kontener raty z kwotą pierwszej raty (T72) | S |
| PR.10 (+ C20) | częściowo: kontener 0 POTWIERDZONE; pensja 0 – przydział ODRZUCONE, odkładki (C20) WYMAGANIE | S | N (kontener 0) | `CargoPage.tsx:440`, `:444` (przycisk wyłączony bez komunikatu); C20 – `plan.ts:413–416` wobec `fleet.ts:943–955` | S |

**K: brak.** Żadna z liczb nie psuje warstw ani salda: silnik (`computeFleet`) liczy właściwe kwoty, a złe są projekcje
planu przyszłych miesięcy, podpowiedzi i stany na ekranie. Wyjątek do pilnowania: DO.5 zostawia trwały ślad w grze, gdy
zwrotu nie zadokuje się w 7 dni (niżej).

---

## LA.3 – POTWIERDZONE (S → S)

**Odtworzenie** (`w5-la`, migawka LA.8-2 = stan B z LA + „Ubezpieczenie domu”; Ctrl+5 → kliknięcie kontenera):
- edytor „OC samochodu”, podpowiedź pola Cykl: „Opłata okresowa: co miesiąc z energii idzie rata do zbiornika (103,33 zł,
  ostatnia 103,37 zł; w tym cyklu z wyrównaniem do terminu: 1 240,00 zł/mies. – odkładka).”. W tym samym czasie Odkładki:
  „OC samochodu termin listopad 2026 (w tym miesiącu) 1 240,00 zł / 1 240,00 zł”, a Plan M0: „OC samochodu | termin
  listopad 2026 · 1 240,00 zł | 103,37 zł”;
- „Wywóz śmieci” (cykl zapłacony 22.10): podpowiedź „(80,00 zł; w tym cyklu z wyrównaniem do terminu: 240,00 zł/mies.)”,
  a Plan M0 „Wywóz śmieci … 0,00 zł”;
- „OC motocykla”: wiersz „600,00 zł 50,00 zł/m(45,84 zł)”, dymek „Rata nominalna: 50,00 zł/mies. · rata wyrównawcza w tym
  cyklu (do terminu): 45,84 zł/mies.”, a podpowiedź edytora „(50,00 zł – odkładka)” i Plan M0 50,00 zł. Trzy ekrany, dwie
  różne raty.
- Dymek „OC samochodu”: „rata wyrównawcza … 103,37 zł/mies.” – to zwykła ostatnia rata z resztą groszy, nie wyrównanie.
- Zrzuty: W5-LA.3-edytor.png, W5-LA.3-ocmoto-edytor.png.

**Przyczyna:**
- `CargoPage.tsx:320` woła `installmentText(c)` bez stanu zbiornika. Domyślne `tankAmount = 0` (`:78`, `:86`) liczy
  `sinkingInstallment` jak dla pustego zbiornika: w miesiącu terminu brak = 1 136,63 zł, więc rata = cała kwota. Do tego
  podpowiedź pomija zapłacony cykl (`paidDue`).
- Wiersz i dymek (`:189`, `:198`) podają `tk.amount`, czyli stan zbiornika już z ratą tego miesiąca, do funkcji
  (`fleet.ts:212–220`), która oczekuje stanu przed ratą. Zbiornik 50 zł w pierwszym miesiącu cyklu wychodzi na nadwyżkę
  i daje ratę 45,84 zł. Do tego `takenThisMonth` ≠ nominalnej o grosze (103,37) liczy się jako „wyrównawcza” (`:69`).

**Poprawka i test:**
- Zakres S: jedna funkcja dla edytora, wiersza i planu – rata wzięta w tym miesiącu z logu silnika (`sinkingOf`), a dla
  wyrównania stan zbiornika sprzed raty miesiąca. Przy zapłaconym cyklu bez dopisku o wyrównaniu. Ostatnia rata z resztą
  groszy nie jest wyrównaniem.
- Test: unit (funkcja przeniesiona do `shared/calc`, przypadki: pełny zbiornik w miesiącu terminu, cykl zapłacony,
  pierwszy miesiąc nowego cyklu, ostatnia rata 103,37) albo e2e Ładowni na stanie B.
- Bez migracji.

**Uwagi:** liczby planu i silnika są dobre (LA.3 „Widać (liczby dobre)”); błąd tylko w tekstach Ładowni. Ten sam
mechanizm co „Podatek od nieruchomości … 150,00 zł/mies.” z raportu LA.

## LA.8 = C17 – POTWIERDZONE (S → S, nie K)

**Odtworzenie** (`w5-la`):
- Ładownia: wiersz „Ubezpieczenie domu stały co rok 900,00 zł 75,00 zł/m(225,00 zł)”, Odkładki „225,00 zł / 900,00 zł · Za
  planem o 450,00 zł – kolejne raty będą większe (rata wyrównawcza 225,00 zł/mies. zamiast nominalnej 75,00 zł/mies.).”;
- Plan miesiąca, „Odkładki – opłaty okresowe ▾”: listopad „Ubezpieczenie domu | termin luty 2027 · 900,00 zł | 225,00 zł”,
  grudzień, styczeń i luty – „… | 75,00 zł”, marzec „termin luty 2028 · 900,00 zł | 75,00 zł”.
- Zrzuty: W5-LA.8-edytor.png, W5-LA.8-plan-M_1.png.

**Przyczyna:**
- `plan.ts:413–416`: dla miesiąca, którego silnik jeszcze nie liczył (brak `sinking` z logu), plan bierze ratę
  harmonogramu `sinkingSchedule(...)[pos.index]` bez braku zbiornika (T29: „rata = plan + równa część braku”).
- Silnik działa dobrze. `fleet.ts:957–967` co miesiąc liczy `sinkingInstallment(c, m, tank)` z prawdziwym stanem:
  w grudniu zbiornik 225, oczekiwane 675, brak 450 na 3 miesiące, rata 225 zł. Gdy grudzień stanie się M0, plan pokaże 225
  (rata z logu). Wyrocznia u2 (projekcja 03.12) daje to samo.

**Waga:** S, nie K.
- Zła jest tylko projekcja planu przyszłych miesięcy: przez listopad kapitan widzi w planie grudnia 150 zł więcej
  niezaplanowanych pieniędzy i może je rozdać na koperty.
- Warstwy, energia M0 i zbiornik są dobre. Ładownia na tym samym ekranie mówi o racie 225, a silnik ją pobierze.
- Pewnego braku 450 zł w dniu płatności nie będzie.

**Poprawka i test:**
- Zakres S: plan przyszłego miesiąca przewiduje stan zbiornika od M0 – miesiąc po miesiącu raty z `sinkingInstallment`
  zamiast nominalnej.
- Test: unit `tests/unit/plan.test.ts` – kontener 900 zł co rok dodany w M0 na 4 miesiące przed terminem → M0…M+3 po
  225,00, M+4 75,00.
- Bez migracji.

**Uwagi:** ta sama funkcja daje C20 (PR.10). Przy okazji widać, że „Kurs przechwycenia” Nowego laptopa rośnie w kolejnych
miesiącach planu (250 / 300 / 375 / 500 zł). Wygląda na tę samą klasę projekcji bez wcześniejszych wpłat – niesprawdzone,
poza listą W5.

## LA.10 – POTWIERDZONE (S → S)

**Odtworzenie** (`w5-la`):
- odprawa „[price] Kontener cięższy niż w manifeście – Wywóz śmieci: 240,00 zł → 480,00 zł co kwartał (+100%, +960,00 zł
  rocznie). Zaktualizować?”;
- edytor: „KONTENER CIĘŻSZY NIŻ W MANIFEŚCIE | Wywóz śmieci: 240,00 zł → 480,00 zł co kwartał … | Płatności: 20.08 240,00 zł ·
  22.10 240,00 zł. | … | Zaktualizuj od listopada 2026”;
- „W TYM MIESIĄCU | Zapłacone:” bez żadnej płatności; wiersz „Wywóz śmieci cięższy … zapłacone 20.11 240,00 zł”;
- Odkładki (dobrze): „Wywóz śmieci termin luty 2027 (za 3 mies.) 0,00 zł / 240,00 zł · Opłata za listopad 2026 zapłacona –
  zbiornik zbiera na następny termin.”.
- Zrzuty: W5-LA.10-odprawa.png, W5-LA.10-edytor.png.

**Przyczyna:**
- `cargoWatch.ts:81–92` (`cyclesPaid`) przypisuje płatność do terminu tylko wtedy, gdy przyszła najwyżej `EARLY_DAYS`
  (14 dni) przed nim. Płatność 22.10 na termin 20.11 (29 dni wcześniej) trafia do cyklu sierpniowego i sumuje się
  z 20.08 – stąd „cykl” 480 zł i „nowa cena”.
- Silnik stosuje T135 (płatność w miesiącu przed terminem zamyka cykl przy cyklu ≥ 3 i zamkniętym poprzednim –
  `paidCycles` / `paidDue`) i liczy dobrze.
- `cargoStatuses` używa tego samego okna 14 dni: stan „zapłacone” bierze z `paidDue` zbiornika, ale bez płatności i z datą
  terminu (20.11) zamiast zapłaty.

**Poprawka i test:**
- Zakres S–M: przypisanie płatności do terminu według reguły silnika (T135) w `cyclesPaid` i w `cargoStatuses`; lista
  płatności terminu i data zapłaty z tej samej reguły.
- Test: unit `tests/unit/cargoWatch.test.ts` – kwartalny 240 zł, płatności 20.08 i 22.10 (termin 20.11) → `priceChanges`
  puste; `cargoStatuses` – płatność 22.10 w „W tym miesiącu”.
- Bez migracji (wszystko liczone). Kto kliknął „Zaktualizuj”, ma kontener 480 zł z `past` – cofnie przez Historię.
  Ostrzeżenie do CHANGELOG.

**Uwagi:** jednym kliknięciem „Zaktualizuj” kapitan podwaja kontener. Rosną wtedy raty zbiornika i masa ładunku na kolejne
miesiące – blisko K, ale tylko przez decyzję użytkownika na fałszywej podpowiedzi. Zostawiam S.

## DO.5 – WYMAGANIE (T163 wobec T65; przy wyborze T65 – S)

**Odtworzenie** (`w5-do5`, migawka DO.5-1: zwrot ICTTJ 300 zł z puli Podatek 03.11 + wypływ 300 zł do XTB w mBanku,
niezadokowany):
- odprawa – pierwsza pozycja „[alarm] Firewall: dopłata do XTB 300,00 zł wbrew rozkazowi.”, a niżej „[dock] Zwrot do masy
  z ICTTJ 300,00 zł (03.11, pula Podatek) do potwierdzenia – wraca z rezerwy na PIT-38.”;
- Mostek „Osłony · bufor na pensje 15 400,00 zł / 19 500,00 zł”, „Podatek · poza budżetem (PIT-38) 1 700,00 zł”;
- Dowództwo: „Dziś na razie: naruszenie | Dopłata do XTB wbrew firewallowi: 300,00 zł”.
- Zrzuty: W5-DO.5-mostek.png, W5-DO.5-dowodztwo.png. Po „Zadokuj” poprawnie (raport DO: osłony 15 700, Podatek 1 400).

**Przyczyna:**
- `fleet.ts:1063–1073` bierze z rezerwy podatkowej tylko wtedy, gdy operacja ma rekord dokowania z `pool === 'tax'`
  (`dockingByTx`).
- Niezadokowana para trafia do gałęzi dopłaty (`:1074–1078`): alarm `firewall` (czerwony) i `drawShields`.
- Tak każe T163: „Silnik do dokowania nadal liczy parę zwykłą kolejnością (pula dopiero z rekordem dokowania – wariant
  „pełniej” bez zmian)”. T65 mówi jednak: „zwrot do masy z puli Podatek wraca z rezerwy podatkowej, bez firewalla”.
  Aplikacja wypełnia T163 i łamie T65 (i punkt) do chwili dokowania.
- `deliveries()` zna parę i pulę wpisu, ale silnik jej nie dostaje.

**Waga i skutek:**
- Do „Zadokuj” osłony są niższe o 300 zł, a czerwony alarm „wbrew rozkazowi” pojawia się przy zwrocie z rezerwy PIT-38.
- Dzień z parą niezadokowaną nie zamarza najwyżej 7 dni (T163, `pendingPairDays`). Kto nie zadokuje w tym czasie, ma
  zamrożone naruszenie firewalla – trwały ślad w ocenie dnia i licznik poważnych naruszeń (degradacja).
- Proponuję S i rozstrzygnięcie na korzyść T65 przynajmniej dla zwrotów z puli Podatek.

**Poprawka i test:**
- Wąsko (S): `computeFleet` dostaje pule par „pending” z `deliveries` i traktuje wypływ sparowany ze zwrotem puli „tax” jak
  zadokowany (rezerwa, bez alarmu).
- Szeroko (M): wariant „pełniej” – każda para liczona od razu według puli. Zamyka też Spostrzeżenia 1 DO i MG.12 (1).
- Test: unit `tests/unit/fleet.test.ts` – zwrot 300 zł puli Podatek sparowany, bez dokowania → brak alarmu `firewall`,
  osłony bez zmian, `taxHold` −300.
- Bez migracji. Zamrożonych dni gry z takim naruszeniem nie da się poprawić automatycznie – gra jest zamrożona (zgodnie
  z regułą silnika).

**Uwagi:** decyzja użytkownika – czy niezadokowaną parę liczyć według puli wpisu (zmiana T163).

## C15 (DO.1 / DO.2, Spostrzeżenia 2 DO) – POTWIERDZONE (S)

**Odtworzenie** (`w5-c15`, migawka DO.1-1: start budżetu 01.11.2026, wpis ICTTJ 5 000 zł „Bieżące” z 03.11, wpływu
w mBanku jeszcze nie ma):
- Mostek „DOKOWANIE ? Brak dostaw z konta tradingowego do zadokowania. Pominięte i sprzed startu (1) 03.11.2026 Bieżące ·
  sprzed startu 5 000,00 zł”;
- odprawa bez „czeka na import z mBanku”.
- Zrzut: W5-C15-mostek.png.

**Przyczyna:**
- `dock.ts:242–245`: dla wpisu bez pary `if (!counted(from))` – gdy okno pary (wpis − 3 dni = 31.10) zaczyna się przed
  startem, wpis dostaje stan `before-start`, zanim kod sprawdzi, czy okno jeszcze trwa (`:249–250` „waiting” / „Portfel”).
- T63: „Bez pary – czeka na import”; „Wpisy sprzed startu pominięte” (ten jest po starcie). T162 zabrania tu tylko
  propozycji Portfela XTB („bez Portfela XTB dla okna zaczętego przed startem”), a nie stanu „czeka na import”.
- Wyrocznia u2: „czeka na import (okno do 06.11)”.

**Poprawka i test:**
- Zakres S: przy wpisie z datą po starcie i oknie zaczętym przed startem – w oknie (`today ≤ until`) stan `waiting`; po
  oknie bez pary – jak dotąd bez Portfela (T162), czyli `before-start` albo nowy stan „bez pary – sprawdź”.
- Test: unit `tests/unit/dock.test.ts` – start 01.11, wpis 03.11, dziś 03.11, bez operacji → `waiting`; dziś 10.11 i plik
  banku dalej → nie `pending` z `wallet`.
- Bez migracji.

**Uwagi:**
- Brzeg pierwszych 3 dni budżetu: raz w życiu folderu, ale akurat przy pierwszym dokowaniu nowego użytkownika.
- Po imporcie wpływu wpis paruje się dobrze (DO.1 faza 2). Gdy wpływ nie przyjdzie do mBanku, wpis zostaje na zawsze
  „sprzed startu”, choć jest po starcie.

## MG.12 – WYMAGANIE (duplikat T163 i MG.8 / C18; bez osobnej poprawki)

**Odtworzenie** (`w5-mg12`, migawka MG.12-2: trzy wypłaty z ICTTJ z parami w mBanku czekające na dokowanie – Cele 1 500
z 25.10, Cele 6 000 i Bieżące 8 000 z 02.11):
- Mapa „Nowy laptop 6 000,00 zł / 6 000,00 osiągnięty”, „Wakacje 2027 8 000,00 zł / 8 000,00 osiągnięty”, „Wkład własny –
  mieszkanie 0,00 zł / 40 000,00 zł … DOL”, nagłówek „układy gwiezdne w celach 14 000,00 zł”;
- Mostek „Osłony 22 520,04 zł / 19 500,00 zł”, „DOKOWANIE (6)”;
- okno Bieżące 8 000: „Osłony 500,00 · Kadłub 118,92 · Wakacje 2027 4 361,04 · Wkład własny – mieszkanie 3 020,04”; okno
  Cele 6 000: „Wkład własny 6 000,00”; okno Cele 1 500: „Wkład własny 1 500,00”.
- Zrzuty: W5-MG.12-mapa.png, W5-MG.12-okno-800000.png, -600000.png, -150000.png.

**Przyczyna:**
- DOL liczy się dobrze ze stanu silnika: pierwszy niepełny cel listy z kwot `fleet.goals` (`StarMapPage.tsx:58–62`).
- Rozjazd z oknem ma dwa źródła, oba już nazwane:
  1. T163 – silnik liczy niezadokowane pary zwykłą kolejnością i na dzień wpływu. Cel ICTTJ, którego na 02.11 jeszcze nie
     było w stanie celów (T128), nic nie dostaje, nadwyżka idzie do osłon ponad cel (22 520,04). Okno liczy pulę wpisu na
     chwilę dokowania – dla puli Cele i dla celu ICTTJ inaczej.
  2. Części (2) i (3) z raportu MG – przeniesienie środków „na koniec dnia” (T129) wobec ekranu, który pokazuje je od razu
     (= MG.8 / MG.10, C18).
- Własnego błędu DOL nie ma: po zadokowaniu znaczek pokazuje cel, który dostanie następną (nową) dostawę według stanu
  silnika.

**Poprawka:** wraz z decyzją o T163 (DO.5, Spostrzeżenia 1 DO) i o T129 (MG.8). Ewentualny dopisek (N) przy DOL, gdy są
dostawy czekające na dokowanie: „po dokowaniu czekających dostaw może się przesunąć”.

**Uwagi:** wyrocznia oznaczyła MG.12-3 jako nieporównywalne („okno liczy na chwilę dokowania, wyrocznia na chwilę wpływu”).

## DM.11 – ODRZUCONE (zgodne z T156)

**Odtworzenie** (`w5-dm11`, migawka DM.11-1, Operacje → Ctrl+N → 100 zł „Sklep W5”, Jedzenie → „Wspólnie” → ja, Anna,
Tata):
- równo „33,33 zł / 33,33 zł / 33,34 zł”;
- „procenty” 50 / 30 / 10 → „razem 90 % – ostatnia osoba bierze resztę do 100 %”, części 50,00 / 30,00 / 20,00 zł.
- Plik operacji: `share.mode: percent`, linie 50 / 30 / 10, `splits` −5000 / −3000 / −2000 (suma = kwota 10 000 gr).
- Zrzut: W5-DM.11-procenty.png.

**Powód odrzucenia:**
- T156: „procenty – każda zaokrąglona, ostatnia bierze resztę (suma ≠ 100 % – **edytor ostrzega**, szybki wpis, decyzja
  zbiorcza i import jej nie przyjmą)”. Aplikacja robi dokładnie to.
- Oczekiwanie punktu („zapis niemożliwy”) jest ostrzejsze niż wymaganie. D83 / D85 nie mówią o sumie procentów.
- Pieniądze są spójne: suma części = kwota, reszta w ostatniej części.

**Uwagi:** różnica edytor / szybki wpis jest zamierzona (T156). Jeśli użytkownik chce jednej reguły – propozycja AP
(blokada zapisu albo jawny przycisk „ostatnia bierze resztę”).

## RA.4 – WYMAGANIE (F1 / T208 wobec D86; przy wyborze D86 – S)

**Odtworzenie** (`w5-ra4`, migawka RA.4-1: brak płatności „Telefon Play” z 20.10, mBank zaimportowany do 26.10):
- Radar: „20.11 opłata | Telefon Play | −50,00 zł”, „20.12 …”, „20.01 …” – bez pozycji ani znacznika dla 20.10;
- Ładownia: „Telefon Play abonament co miesiąc termin 20.11 50,00 zł”, edytor „W TYM MIESIĄCU Termin: 20.11 – 50,00 zł.”;
- odprawa bez pozycji o telefonie.
- Zrzuty: W5-RA.4-radar.png, W5-RA.4-telefon.png.

**Przyczyna:**
- `cargoStatus.ts:113–127` liczy stan tylko dla terminu miesiąca `monthOf(today)`. Termin poprzedniego miesiąca bez płatności
  znika ze wszystkich ekranów 1. dnia następnego.
- Tak opisuje F1 („Każdy kontener ładowni ma **w bieżącym miesiącu** stan …”) i T208.
- D86 (decyzja użytkownika) mówi tylko „„po terminie” 3 dni po nim, alarm w odprawie”, bez granicy miesiąca. D4 („żadna
  opłata okresowa nie zaskakuje budżetu”) przemawia za przeniesieniem zaległości.

**Mocny argument za poprawką:**
- „Po terminie” liczy się od dnia `due + 3` (`cargoStatus.ts:132–136`, `OVERDUE_DAYS` = 3). Termin od 28. dnia w miesiącu
  30-dniowym (od 29. w 31-dniowym) nigdy nie dostanie tego stanu: dzień `due + 3` wypada już w następnym miesiącu, gdzie
  liczy się nowy termin. Termin 28. w miesiącu 31-dniowym ma „po terminie” przez jeden dzień – i to tylko wtedy, gdy plik
  z banku sięga za `graceEnd`.
- To łamie regułę F1 / D86 w jej własnym zakresie: czynsz płacony 30. dnia nigdy nie zaalarmuje.

**Poprawka i test:**
- Zakres S–M: obok terminu bieżącego także niezapłacony termin poprzedni (do zapłaty albo do następnego terminu) – stan
  „po terminie” w Ładowni, na Radarze i w odprawie.
- Test: unit `tests/unit/cargoStatus.test.ts` – termin 20.10 bez płatności, dziś 03.11, plik banku do 26.10 → `overdue`;
  termin 30.11, dziś 03.12 → `overdue`.
- Bez migracji.

## PR.9 – POTWIERDZONE (S → N)

**Odtworzenie** (`w5-pr9`, migawka PR.9-4: pożyczka wzięta „Kredyt R2” 100 zł / 3 raty z kontenerem, pierwsza 10.11.2026):
- Radar: „10.11 rata | Rata: Kredyt R2 | −33,33 zł”, „10.12 … −33,33 zł”, „10.01 … −33,34 zł”;
- Ładownia: „Rata: Kredyt R2 rata co miesiąc 33,33 zł 33,33 zł/m”;
- Plan „Ładownia – stałe koszty” – listopad, grudzień, styczeń 1 789,32 zł, luty 1 755,99 zł: w styczniu plan liczy 33,33,
  a rata wynosi 33,34. Suma kontenera 99,99 zł przy pożyczce 100,00 zł.
- Zrzut: W5-PR.9-ladownia.png.

**Przyczyna:** `radar/actions.ts:81` (nowa pożyczka) i `:122` (kontener do istniejącej) zapisują `amount: first.amount` –
dosłownie według T72 („kwota pierwszej raty”), wbrew T3 i specyfikacji („reszta w ostatniej części”). Harmonogram
pożyczki jest dobry (3333 / 3333 / 3334).

**Waga:** N.
- Różnica 1 grosza w projekcji planu jednego miesiąca i dwie kwoty tej samej raty na dwóch ekranach.
- Warstwy liczą prawdziwe operacje (PR.1 zgodne); silnik nie bierze stałych kosztów z kontenera.

**Poprawka i test:**
- Zakres S: kontener raty z kwotą ostatniej raty i `past: [{ until: <miesiąc przedostatniej>, amount: <pierwsza> }]` (F9,
  `amountIn`) albo kwota z harmonogramu pożyczki; dopisać do T72.
- Test: unit (funkcja tworząca kontener) albo e2e Radaru – 100 zł / 3 → `amountIn` w styczniu 3334, suma życia = 10 000.
- Istniejących kontenerów naprawiać nie trzeba (grosz w planie). Bez migracji.

## PR.10 (+ C20) – częściowo

**Odtworzenie** (`w5-pr10`, migawka PR.10-2: pensja 0 w grudniu 2026):
- Plan grudnia: „Ładownia – stałe koszty 1 755,99 zł”, „Odkładki – opłaty okresowe 245,83 zł”, „Podstawowy przydział:
  80,64 zł dziennie”, „Rozdzielone 6 001,82 zł”, „Plan przekracza pensję o 6 001,82 zł”;
- Ładownia → „Dodaj” → nazwa „Kontener zero W5”, kwota 0 → przycisk „Dodaj do ładowni” wyłączony, `title` brak, bez
  komunikatu.
- Zrzuty: W5-PR.10-grudzien.png, W5-PR.10-kontener-0.png.

**Werdykty części:**
- **Kontener 0 – POTWIERDZONE (N).** `CargoPage.tsx:440`, `:444`: `disabled={!draft.name.trim() || draft.amount <= 0}` bez
  podpowiedzi. Cel 0 (`StarMapPage.tsx:521` „Podaj kwotę celu.”) i pożyczka 0 (`RadarPage.tsx:446` „Podaj kwotę pożyczki.”)
  mają komunikat. Poprawka S: komunikat albo `title` przy przycisku. Test e2e Ładowni (kwota 0 → tekst).
- **Pensja 0 – przydział: ODRZUCONE.** Punkt sam podaje „brak wymagania”. Podstawowy przydział wynika z kopert codziennych
  (2 500 / 31 = 80,64) i wyrocznia u2 liczy to samo (C20). Aplikacja pokazuje komunikat „Plan przekracza pensję o 6 001,82
  zł”.
- **Pensja 0 – odkładki (C20): WYMAGANIE** (T29 milczy).
  - Ważne: silnik już wybrał – `fleet.ts:943–955` przy pensji 0 nie ustawia `salaryOfMonth` i nie pobiera rat zbiorników
    ani celów (wyrocznia: 0,00). Plan przyszłego miesiąca pokazuje raty nominalne 245,83 (`plan.ts:413–416`) – inną liczbę
    niż ta, którą weźmie silnik.
  - Cokolwiek użytkownik wybierze, plan ma pokazywać to, co policzy silnik. Poprawka razem z LA.8 (ta sama funkcja, S).
  - Test unit `plan.test.ts`: pensja 0 w M+1 → odkładki M+1 = 0, M+2 z wyrównaniem.

---

## Co pilne (do syntezy)

1. **LA.8 / C20 – jedna poprawka w `plan.ts:413–416`.** Plan przyszłych miesięcy liczy raty nominalne zamiast tego, co
   pobierze silnik – przy dodaniu opłaty w trakcie cyklu (225 → 75) i przy pensji 0 (245,83 → 0). Silnik jest dobry, więc
   nie K.
2. **LA.10 – fałszywe „Kontener cięższy … +100%”** po wcześniejszej zapłacie. Jedno kliknięcie „Zaktualizuj” podwaja
   kontener (`cargoWatch.ts:81–92` wobec T135).
3. **DO.5 i MG.12 – decyzja o T163** (niezadokowana para zwykłą kolejnością). Przy zwrocie z puli Podatek daje czerwony
   alarm, osłony −300 zł i naruszenie, które po 7 dniach bez dokowania zamarza w grze.
4. **C15 – nowe znalezisko S** (było tylko spostrzeżeniem DO): wpis z pierwszych 3 dni budżetu „sprzed startu” zamiast
   „czeka na import” (`dock.ts:242–245`).
5. **RA.4 – decyzja F1 wobec D86.** Niezależnie od niej termin od 28.–29. dnia miesiąca nigdy nie dostaje stanu „po terminie”.
