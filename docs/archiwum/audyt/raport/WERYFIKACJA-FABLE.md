# Druga opinia – Fable (AU-11, krok 3b)

- Data: 03.11.2026. Model: Fable 5.1. Zakres: dziesięć znalezisk z `WERYFIKACJA-1.md`, `-2.md`, `-3.md` (W1–W3, Opus).
- Metoda: niezależny odczyt kodu (`src/`) i wymagań (`docs/specyfikacja.md`, `docs/decyzje.md` – D80, D81, D84, D91,
  T39, T45, T70, T90, T128, T129, T131, T134, T135, T167, T220) wobec dowodów weryfikatorów (pliki, liczniki, zrzuty).
  Odtworzeń nie powtarzałem: w każdym punkcie kod daje dokładnie ten mechanizm, który weryfikator odtworzył, a moje
  rozbieżności dotyczą wag i rozstrzygnięć wymagań, nie faktów. Nic w `src/` ani w stanach laboratorium nie zmieniono.
- Wagi według `docs/audyt/plan.md`: K – zła kwota, utrata danych, zapis w folderze ICTTJ; W – funkcja nie działa albo
  blokuje pracę; S – działa źle w brzegu albo myli; N – ergonomia.

## Tabela

| Znalezisko | Werdykt | Waga u weryfikatora | Waga u mnie | Przyczyna | Naprawa danych | Pilność |
| --- | --- | --- | --- | --- | --- | --- |
| 1. IM.42 | ZGADZAM SIĘ | K (W1) | **K** | trafna: `state.ts:209-213` (tylko `bank.key`), `reconcile.ts:469-487` (B5 tylko na `budget.booked`), `:610` | meldunek, nie migracja | 1 |
| 2. DA.40 | ZGADZAM SIĘ | K (W1) | **K** | trafna: `store.ts:1036-1040` (`available` tylko w `refreshInQueue`), `:1181` (`assertWritable` ufa fladze), `atomic.ts:42` (`mkdir recursive`), `watch.ts:64` (5 min) | nie (ostrzeżenie o folderze-widmie) | 1 |
| 3. DA.43 | ZGADZAM SIĘ | W (W1; K→W) | **W** | trafna: `OperationEditor.tsx:96-105` (`update` → `setAsk`, zwraca `false`), `data.ts:1176` (`flushForClose` zna tylko magazyn) | nie | 3 |
| 4. DM.18 | ZGADZAM SIĘ | S (W1; K→S) | **S** | trafna: `income.ts:52-70` (`loan` → `NONE`); warstwy dobre `fleet.ts:1126-1137` | nie (liczone) | 4 |
| 5. MG.8 / MG.10 | ZGADZAM SIĘ (to błąd T129, nie decyzja użytkownika) | K (W1) | **K** | trafna: `fleet.ts:1304-1323` (`slot: 4` po operacjach `slot: 3`, `evKey :637`) | nie (liczone; przeszłe dni z przeniesieniami się przeliczą) | 1 |
| 6. IM.23 = P.3 | ZGADZAM SIĘ z mechanizmem, NIE ZGADZAM SIĘ z wagą | W (W1) | **K** | trafna: `options.ts:150-153` (`choiceFor` → `inflowKind:'advance'`), `:121` (`optionOf` zlewa `advance` i `inflowKind`), `household.ts:559-563` (`continue` przed `repay`, `covers` pominięte), `classify.ts:505`, `reconcile.ts:983` | tak (reguły i wpłaty od 1.15.3) | 2 |
| 7. IM.39 | ZGADZAM SIĘ | W (W1) | **W** | trafna: `reconcile.ts:336-347` (`budgetedOf` jedno konto), `:416-447` (B35 przed B5), `:469-475` | nie (panel duplikatów) | 3 |
| 8. IM.10 | ZGADZAM SIĘ (W, nie K) | W, „kandydat K” (W3) | **W** | trafna: `options.ts:130-133` (`fits('expense','in')`), `state.ts:626-628` (`remember` samo), `classify.ts:476` (reguła przed `loan :514`) | nie migracja; stare operacje ręcznie, podpowiedź w „niespójne” | 2 |
| 9. IM.25 | ZGADZAM SIĘ | W (W3) | **W** | trafna: `ImportPage.tsx:606-611` + `reconcile.ts:925-929` (`sharesKey` pomija 0), `DecisionFields.tsx:87` (kwota 0, nie należność – D81), `reconcile.ts:1098-1109` (udział grupy w każdym wierszu) | nie migracja; zdublowane części ręcznie | 3 |
| 10. KR.16 | NIE ZGADZAM SIĘ z kwalifikacją „wymaganie”: to błąd techniczny | S, „K, jeśli użytkownik…” (W2) | **W** | trafna: `fleet.ts:957-966` (rata dla cyklu nie w `paidCycles`), `:1013-1017` (`paidCycles` tylko z operacji po starcie), `sinkingInstallment :212-220`; `cargoStatus.ts:129-135` mówi „zapłacone” | nie (liczone; zamrożone dni gry zostają) | 2 |

Pilność: 1 – przed czymkolwiek innym (pieniądze i dane giną albo kłamią bez słowa); 2 – w tym samym wydaniu (zła kwota
na zwykłej drodze, część z naprawą danych); 3 – następne wydanie; 4 – przy okazji.

## Uzasadnienia

### 1. IM.42 – K, zgadzam się
`collectDeleted` (`renderer/features/import/state.ts:195-220`) zna usunięte operacje tylko po `bank.key` ostatniej
wersji z `.history/`; `deletedPending` z opisem powstaje wyłącznie dla nierozliczonych. W `planImport` status `deleted`
daje jedynie `deletedKeys.has(keys[i])` albo `deletedRows` (nierozliczone), `reconcile.ts:610`. Parowanie drugiego
formatu (`:469-487`) iteruje `budget.booked`, czyli istniejące operacje – usuniętej tam nie ma. Klucz listy ≠ klucz
historii (różne opisy), więc T39 nie działa między formatami, choć T134 obiecuje tożsamość wiersza. Usunięta kwota wraca
do salda i warstw z komunikatem „Nowe: 1” – zła kwota bez ostrzeżenia na zalecanej drodze (historia, potem lista): K.
Poprawka W1 (usunięte z opisem, parowane miarą B5; `altKeys` do `deletedKeys`) jest właściwa i obejmuje też IM.39.

### 2. DA.40 – K, zgadzam się
`available` zmienia się tylko w `refreshInQueue` (`main/datastore/store.ts:1036-1037`), a to woła obserwator albo pełne
sprawdzenie co 5 min w trybie natywnym (`watch.ts:64`: `pollMs` = 5 · 60 000). `status()` (`:515-517`) i
`assertWritable` (`:1181-1184`) ufają fladze; `writeFileAtomic` (`atomic.ts:42`) robi `mkdir(dirname, { recursive })`,
więc przy przemianowanym korzeniu odtwarza `transactions/2026/` pod starą ścieżką. Rekord trafia do folderu-widma, okno
mówi „Zapisano.”, a po powrocie oryginału nic go tam nie przenosi (W1: po 60 s brak). Utrata danych w rozumieniu planu,
na dodatek z fałszywym potwierdzeniem – K. Właściwa poprawka ma dwie części, obie potrzebne: zapis nigdy nie tworzy
korzenia (tani test `fi.json` przed paczką zapisów → `ReadOnlyError`), i częstsze, tanie sprawdzenie korzenia w
spoczynku (nie `inspect` całego folderu co 5 s – `fs.stat` na `fi.json`).

### 3. DA.43 – W, zgadzam się
`update` (`OperationEditor.tsx:96-105`) przy zmianie kwoty operacji z banku albo w okresie potwierdzonego salda nie pisze
do magazynu: `setAsk({ run: … })` i `return false`. Pytanie żyje w stanie komponentu; `commitActiveField` przy zamykaniu
kończy się na `setAsk`, a `flushForClose` (`store/data.ts:1176-1192`) liczy tylko `dirty` magazynu → „zapisane”, okno
się zamyka. Przypadek D (Ctrl+1) łamie zasadę „opuszczenie ekranu nigdy nie gubi zmian” (CLAUDE.md). Nie K: na dysku
zostaje wersja zgodna z bankiem, przepada wpisana, jeszcze niepotwierdzona zmiana – to funkcja (zmiana kwoty), która w tej
drodze nie działa, nie utrata zapisanych danych. Poprawka W1 (czekające pytanie = niezapisana zmiana dla
`unsavedReport`; przy odmontowaniu edytora pokazać pytanie albo zostać) – właściwa.

### 4. DM.18 – S, zgadzam się
`fleet.ts:1126-1137`: `back = min(amt, owed)` wraca do osłon, `dock(amt - back, …)` dokuje nadwyżkę – dokładnie T70.
`incomeParts` (`income.ts:52-70`) zna tylko `income` i `trading`; `loan` → `NONE`, więc odsetki nie są przychodem w
„Bilansie paliwa”, średnich „Przychody” i ostrzeżeniu o pensji. Zła jest statystyka (o kwotę odsetek, tylko przy
nadpłacie pożyczki udzielonej), pieniądze w warstwach dobre: S. Poprawka W1 (silnik wystawia nadwyżkę po `txId`,
`incomeParts` liczy ją jako „Praca i inne”) jest właściwa; alternatywnie `incomeParts` może dostać stan pożyczek
(`loanOpen`) z kontekstu – mniej sprzężeń niż nowe pole `FleetState`.

### 5. MG.8 / MG.10 – K, zgadzam się; to błąd reguły technicznej, nie decyzja użytkownika
Zdarzenia dnia idą po kluczu `${date} ${slot} ${rest}` (`fleet.ts:627-637`); operacje mają `slot: 3` (`:1331`),
przeniesienie środków celu `slot: 4` (`:1313`, komentarz „at the end of its day”). Wydatek „z celu” tego samego dnia
widzi więc cel sprzed przeniesienia: `fromGoal = min(900, 0)` (`:1007-1009`) → 900 zł z osłon, 700 zł zostaje w Rowerze.
Ekran (stan na „teraz”, po wszystkich zdarzeniach dnia) pokazuje już Rower 700 i obiecuje w edytorze „cel płaci, ile
ma”. Zła kwota w dwóch warstwach (osłony −700 za dużo, cel +700), trwała i deterministyczna, na typowej drodze
(„przenoszę na rower i kupuję rower”): K.

Rozstrzygnięcie reguły: użytkownik zdecydował w D84 C1 („zmiany celów działają od dnia zmiany”) i C2 (pytanie
„osłony / inny cel / zostaw”). „Na koniec dnia” jest wyłącznie w T129 – decyzji technicznej. Litera T129 nie jest wprost
sprzeczna z C1 (dzień zmiany się zgadza), ale daje stan, w którym ekran i silnik pokazują dwie różne kwoty tego samego
celu tego samego dnia, a T131 („cel płaci, ile ma”) jest łamane wobec tego, co użytkownik widzi. To wystarczy, by
poprawić bez pytania; użytkownik powinien tylko dostać notatkę wydania, że dni z przeniesieniami przeliczą się inaczej.
Poprawka W1 (zdarzenie w kolejności `at` wśród operacji dnia – `slot: 3`, `rest` z chwili `at` w tym samym formacie co
`opRest`) jest właściwa; T128 już porządkuje pieniądze celów po `cameIn`, więc precedens jest.

### 6. IM.23 = P.3 – K (W1: W); S4 do użytkownika, ale sam błąd etykiety jest techniczny
Mechanizm potwierdzony w kodzie: opcja listy `household:X:advance` → `choiceFor` (`options.ts:150-153`) daje
`advance: true` **i** `inflowKind: 'advance'`; w `household.ts:559-563` `inflowKind === 'advance'` idzie w całości do
depozytu (`continue`) **przed** `repay`, więc pomija także jawnie wskazane zakupy (`covers`) – W1 pokazał rekord z
`inflowKind=advance covers=["…EVENTIM"]`, czyli wskazany zakup nieoddany. `optionOf` (`:121`) zlewa oba znaczenia w jedną
opcję (`c.advance || c.inflowKind === 'advance'`), więc dawna odpowiedź osoby „reszta jako zaliczka” po ponownym wybraniu
staje się „całość jako zaliczka”; `ruleDecisionOf` (`reconcile.ts:983`) i `classify.ts:505` utrwalają `inflowKind` w
regule, która potem działa bez pytania przy każdej wpłacie tej osoby.

Dlaczego K, a nie W: etykieta mówi „reszta jako zaliczka” (D80 b – semantyka decyzji użytkownika), a aplikacja robi coś
innego i zapamiętuje to; skutek to złe kwoty w stanie okrętu (osłony zaniżone o każdą spłatę, depozyt zawyżony, „ma
oddać” osoby nie maleje, przypomnienia o długu trwają), na zwykłej drodze, bez ostrzeżenia, trwale (reguła). Suma warstw
się zgadza, ale osłony są główną liczbą aplikacji – to „zła kwota” z definicji planu. Do tego potrzebna naprawa danych.
Nie jest to droga po błędzie użytkownika (jak IM.39) ani sama statystyka (jak DM.18).

Wymagania: decyzje użytkownika to D80 b (wpływ domownika najpierw wyrównuje należność; reszta – zaliczka albo przychód,
pytanie raz, potem zapamiętane) i D91 a–c, f. „Niezależny przychód” i „zaliczka na przyszłość” z 1.15.3 nie mają
decyzji D (`docs/postep.md:9-10`: sesja Antigravity bez wpisu) – to zmiana zachowania widocznego dla użytkownika bez
jego decyzji. **S4 do użytkownika**: czy jawny wybór może omijać dług (jeśli tak – osobna opcja z ostrzeżeniem przy
otwartym długu; jeśli nie – `inflowKind: 'advance'` traktować jak `repay` + `advance`). **Niezależnie od S4, technicznie
do poprawy teraz**: opcja „reszta jako zaliczka” → `inflowKind: 'repay'`, `advance: true`; `optionOf` rozróżnia oba;
reguła z `inflowKind: 'advance'` nie może powstawać z tej opcji.

Naprawa danych: wpłaty z `inflowKind: 'advance'` i niepustym `covers` są sprzeczne same w sobie – te można naprawić
deterministycznie (traktować jako spłatę wskazanych zakupów); pozostałych (puste `covers`) od jawnego „zaliczka” nie
odróżnimy – meldunek „wpłaty X od 24.10 nie spłaciły długu – spłacić?” jak proponuje W1, plus przegląd reguł
importu z `inflowKind: 'advance'`.

### 7. IM.39 – W, zgadzam się
`budgetedOf` (`reconcile.ts:330-347`) buduje `booked` z operacji konta docelowego (`mine`), więc przy złym imporcie na
Portfel parowanie B5 (`:469-475`) nie widzi 17 operacji mBanku z historii → `new`. Przy imporcie naprawczym przejście B35
(`:416-447`, `budget.described` – wszystkie konta, klucz w formacie pliku) bierze wiersze jako `elsewhere`/`move`, zanim
przejście B5 mogłoby je sparować z oryginałami – przeniesione lądują obok oryginałów. W (nie K): pierwszy krok to błąd
użytkownika, przed którym aplikacja ostrzega („Pliki z tego rachunku trafiały dotąd na konto mBank”), a duplikaty widać w
Meldunkach i panelu duplikatów. Poprawka razem z IM.42 (B5 także po operacjach innych kont tego samego numeru rachunku;
w imporcie naprawczym kopia z parą B5 na koncie docelowym → „usuń duplikat”, nie „przenieś”).

### 8. IM.10 – W, zgadzam się (nie K)
`fits('expense', 'in')` jest prawdą (`options.ts:130-133` – wpływ jako zwrot towaru, B40/D83), więc T90 („tylko tam,
gdzie pasuje do kierunku”) formalnie przepuszcza spłatę pożyczki; decyzja zbiorcza sama ustawia `remember[g.group] =
true` (`state.ts:626-628`); w `classifyRow` reguła (`classify.ts:476`) wygrywa z rozpoznaniem pożyczki z Radaru
(`:514`), a wyjątek ustępowania jest tylko dla reguły zwykłego przychodu wobec domownika. Litera T167/N14 („pożyczka
nigdy regułą”) nie jest złamana – reguła jest `expense` – ale jej cel (pożyczkę sprawdza się przy każdej operacji) tak:
reguła nie-pożyczkowa na nazwisko pożyczkobiorcy zabiera każdą kolejną spłatę. Dlaczego W, nie K: pierwsza zła kwota
pochodzi z jawnej decyzji użytkownika dla zaznaczonej grupy, widocznej w podglądzie („Zwrot towaru · Auto · paliwo”);
kolejne importy pokazują tę samą propozycję z marką „reguła” – użytkownik może ją zobaczyć, choć nic go nie ostrzega.
Najważniejsza część poprawki to `classify.ts`: rozpoznanie pożyczki z Radaru przed regułą innego rodzaju tej samej osoby
(analogicznie do wyjątku dla domownika) – naprawia kolejne importy u użytkowników, którzy już mają taką regułę. Druga
część (decyzja zbiorcza pomija wiersze rozpoznane jako pożyczka / PIT-38 / XTB / domownik, liczy je jako „nie pasuje”)
dopełnia T90.

### 9. IM.25 – W, zgadzam się
(1) `onChange={(next) => chooseRow(p.key, sameChoice(next, choice) ? null : next)}` (`ImportPage.tsx:606-611`) z
`sharesKey` filtrującym `amount > 0` (`reconcile.ts:925-929`): nowa linia „w tym za Babcia” startuje z kwotą 0
(`DecisionFields.tsx:87`), więc jest „taka sama” jak decyzja grupy i znika – przycisk w wierszu nie działa. (2) D81
każe startować od tego, co X ma oddać – kod startuje od 0. (3) W `buildImport` (`reconcile.ts:1098-1109`) `c.shares`
decyzji grupy trafia do każdej wpłaty grupy w pełnej kwocie – Babcia dostaje 100 zł dwa razy, Tata traci 100 zł. Złe
salda domowników, ale podgląd pokazuje „w tym za Babcia 100,00” przy obu wierszach, a jedyna droga, która działa, jest
grupowa – funkcja nie działa jak obiecano (D81): W. Poprawka W3 właściwa; dodałbym: udział grupy nigdy ponad należność X
w sumie (rozkład po kolei), żeby decyzja grupowa była bezpieczna także po poprawieniu wiersza.

### 10. KR.16 – W; to błąd techniczny, nie wymaganie do decyzji użytkownika
Kod: `paidCycles` wypełnia tylko `runTx` dla operacji po starcie (`fleet.ts:1013-1017`); płatność z 02.11 siedzi w
saldzie otwarcia i nigdy nie przechodzi przez tę ścieżkę. W `payMonth` (`:957-966`) rata zbiornika dla cyklu z terminem
w miesiącu startu liczy się z `tank = 0` w ostatnim miesiącu cyklu → `sinkingInstallment` daje całe 1 240 zł (`:212-220`),
energia pierwszego miesiąca o tyle niższa. Równocześnie `cargoStatuses` (`cargoStatus.ts:129-135`, okno T208) mówi
„Zapłacone 02.11”, a odprawa – „Asteroida dziś”. Zbiornik zbiera przez rok na cykl już zapłacony (nadwyżka → raty 0 zł do
listopada 2027, pieniądze nie giną).

Dlaczego nie „wymaganie”: T135 już rozstrzyga – „płatność zamyka cykl miesiąca terminu; zapłacony cykl: bez rat, zbiornik
zbiera na następny”. Płatność 02.11 jest w miesiącu terminu i aplikacja sama wiąże ją z kontenerem (Ładownia „Zapłacone”).
T45/T220 wyłączają płatności opłat okresowych sprzed startu z `startMonthSpent` właśnie dlatego, że ma je pokryć
zbiornik – a nie dlatego, że mają być odłożone drugi raz. Silnik po prostu nie stosuje T135 do płatności sprzed startu
– to luka techniczna, spójna z tym, że `followed` (`:1015`) zamyka tylko cykle z terminem **przed** miesiącem startu.
Decyzji użytkownika nie potrzeba: nie ma rozsądnej interpretacji, w której opłata roczna zapłacona wczoraj ma być w całości
odłożona dziś z pierwszej pensji i czekać rok w zbiorniku.

Waga: zła kwota energii pierwszego miesiąca (1 240 z 3 015,60 zł) i fałszywa asteroida, bez utraty pieniędzy, w brzegu
(opłata zapłacona w miesiącu startu przed dniem startu, kontener wybrany w kreatorze). Brzeg jest jednak naturalny (start
budżetu „od nowego miesiąca” tuż po dużej opłacie) i skutek dotyka całego pierwszego miesiąca: **W**, nie S; K zostawiam
dla kwot trwale złych w warstwach albo utraty danych (tu zbiornik faktycznie ma te pieniądze i je zużyje). Poprawka W2
właściwa (przy starcie oznaczyć jako zapłacone cykle z połączoną płatnością miesiąca startu sprzed startu – ta sama
reguła, której używają `startMonthSpentOf` i `cargoStatuses`; kreator krok 4 z tej samej funkcji); poziom max (silnik
pieniędzy, warstwy) zgodnie z CLAUDE.md.

## Rozbieżności z weryfikatorami (podsumowanie)

- **IM.23**: W1 W → u mnie **K** (zła kwota osłon i sald osób na zwykłej drodze, utrwalona regułą, z naprawą danych).
  S4 – decyzja użytkownika; błąd etykiety „reszta jako zaliczka” – techniczny, do poprawy bez czekania na S4.
- **KR.16**: W2 „S, K jeśli użytkownik zdecyduje” → u mnie **W, błąd techniczny** (T135 i Ładownia już mówią
  „zapłacone”; decyzja użytkownika niepotrzebna).
- **IM.10**: W3 „W, kandydat K” → **W** (pierwsza zła kwota z jawnej, widocznej decyzji użytkownika; priorytet poprawki
  w `classify.ts`, bo naprawia kolejne importy u tych, którzy już mają regułę).
- Pozostałe (IM.42 K, DA.40 K, DA.43 W, DM.18 S, MG K, IM.39 W, IM.25 W) – zgodne; przyczyny trafne wszędzie.

## Kolejność napraw (propozycja)

1. DA.40, IM.42 (+ IM.39 tą samą poprawką), MG.8/MG.10 – pieniądze i dane, bez decyzji użytkownika.
2. IM.23 (część techniczna + meldunek naprawy danych), KR.16 (silnik, max), IM.10 (`classify.ts`).
3. IM.25, DA.43.
4. DM.18. Decyzja S4 – od użytkownika, równolegle; nie blokuje punktów 1–3.
