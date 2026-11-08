# Weryfikacja sceptyczna W3 – znaleziska S: Operacje i import z mBanku (AU-11, krok 3)

- Data: 03.11.2026, 20:20–21:15 (zegar laboratorium = kotwica persony 03.11.2026). Weryfikator W3 (Opus 5.5 · xhigh).
- Wersja: Financial Intel 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4`), laboratorium `tests/audyt/lab.ts`
  (wersja „przenośna”, okna poza ekranem). Kolejność: najpierw odtworzenie w wydanej aplikacji, potem kod `src/`.
- Stany: `rok` (persona odnowiona 03.11 ok. 15:17; cisza 23:00–05:00, próg dziennika 200 zł) – świeża kopia na każdy
  przebieg; `rok` + `prepareImportState` (`tests/audyt/im-pomoc.ts`: Mama / Tata / Babcia przez Tatę, Babcia ma oddać
  100 zł) dla IM.10, IM.25, IM.40, IM.48. Dodane rekordy – przy punktach.
- Skrypty: `tests/audyt/w3-op.spec.ts`, `w3-op2.spec.ts`, `w3-im.spec.ts`; przebiegi `w3-op-domownik`, `w3-op-zero`,
  `w3-op-kwota`, `w3-op-data`, `w3-op-dziennik`, `w3-im-a`, `w3-im-b`, `w3-im-h`; dzienniki
  `C:\FI-audyt\przebiegi\w3-op.log`, `w3-op2.log`, `w3-im.log`, `przebiegi\w3-im-*\obs.txt`; zrzuty `C:\FI-audyt\zrzuty\W3.*.png`;
  odczyt `C:\FI-audyt\odczyty\w3.jsonl` (OP.33).
- Obciążenie laboratorium: o 20:58 procesor 100 % (6 procesorów logicznych), 9 procesów „Financial Intel” innych
  weryfikatorów – czasy (IM.55) niewiarygodne co do wielkości.

## Werdykty

| Znalezisko | Werdykt | Waga przed | Waga po | Przyczyna (plik:linia) | Poprawka |
| --- | --- | --- | --- | --- | --- |
| OP.8 kwota od 100 do 20 | POTWIERDZONE | S | S | `renderer/features/operations/ListTools.tsx:152` | S |
| OP.25 zakup domownika pyta „plan czy impuls?” | POTWIERDZONE | S | S | `shared/calc/operations.ts:235–237`; `shared/calc/intel.ts:279–286` | S |
| OP.26 zakup domownika nocą „liczy się jako naruszenie” | POTWIERDZONE – tylko tekst (gra liczy dobrze) | S | N | `renderer/features/operations/OperationEditor.tsx:496–508` | S |
| OP.33 podgląd „Przesuń datę” bez poprzedniego miesiąca | WYMAGANIE | S | – (S, jeśli przyjąć oczekiwanie punktu) | `shared/calc/effect.ts:16–30` | M |
| OP.40 wydatek 0,00 zł w meldunku „bez kategorii” | POTWIERDZONE | S | N | `shared/operationsView.ts:35` | S |
| IM.10 decyzja zbiorcza zmienia spłatę pożyczki w zwrot paliwa | POTWIERDZONE | S | **W** (kandydat K – druga opinia Fable) | `renderer/features/import/options.ts:130–133`, `state.ts:626–628`, `shared/import/classify.ts:476/514` | M |
| IM.25 „+ w tym za Babcia” | POTWIERDZONE | S | **W** (pieniądze domowników – druga opinia Fable) | `renderer/features/import/ImportPage.tsx:606–611` + `shared/import/reconcile.ts:925–931`; `reconcile.ts:1098–1109`; `DecisionFields.tsx:87` | M |
| IM.40 starsza lista po rozliczeniu – duplikaty | POTWIERDZONE | S | S | `shared/import/reconcile.ts:1055–1061` (wobec `:343`) | S |
| IM.48 usunięcie reguły i słowa bez „Cofnij” | POTWIERDZONE | S | S | `renderer/features/import/rules.ts:121–123` | S |
| IM.55 plik 30 tys. wierszy zamraża okno | POTWIERDZONE – mechanizm; długość niewiarygodna | S | N (do pomiaru w maszynie) | `renderer/features/import/state.ts:248–265` | M |

Pilne: IM.10 i IM.25 (złe kwoty w budżecie i w saldach domowników; IM.10 rozlewa się po cichu na kolejne importy).

---

### OP.8 – POTWIERDZONE (S)
- **Odtworzenie** (`w3-op-kwota`, rok, 20:30): Operacje → „cała historia” („Operacje 982”) → „Więcej filtrów” →
  „Kwota (bez znaku)”: od 100 (Tab) – pola „od 100,00”, „do” puste; do 20 (Tab) – pola **„od” puste, „do 20,00”**,
  „Więcej filtrów: 1 ▾”, „Operacje 170 / 982”, kwoty 7,00–19,99 zł, bez komunikatu. To samo z Enter. W odwrotnej
  kolejności (do 20, potem od 100) aplikacja kasuje „do” – „Operacje 282 / 982”, 100,38–7 500,00 zł (bez górnej granicy).
  Zrzuty: W3.OP8-menu.png, W3.OP8-lista.png.
- **Wymaganie:** T267 – „„do” poniżej „od” = bez górnej granicy”. Wynik zależy od kolejności wpisania; przy „od → do”
  aplikacja pokazuje odwrotność zamiaru.
- **Przyczyna:** `ListTools.tsx:152` – zmiana „do” mniejszego niż „od” ustawia `amountMin: null` (kasuje dolną granicę);
  `:150` symetrycznie kasuje „do”. Reguła T267 jest zrobiona tylko w normalizacji zapisanego widoku
  (`shared/operationsView.ts:215`: `max < min → null`), ekran jej nie używa.
- **Poprawka i test:** S – w `:152` przy `amountMax < amountMin` zostawić „od”, a „do” wyzerować (jak `operationsView.ts:215`);
  najlepiej jedna czysta funkcja granic w `operationsView.ts` dla obu pól. Test unit (`tests/unit/operations-view.test.ts`):
  od 100 → do 20 daje od 100 bez górnej granicy, w obu kolejnościach. Bez migracji.
- **Uwagi:** waga S zostaje – działa źle w brzegu i myli (lista bez słowa pokazuje coś innego niż wpisano); pieniędzy nie rusza.

### OP.25 – POTWIERDZONE (S)
- **Odtworzenie** (`w3-op-domownik` 20:27, `w3-op-dziennik` 21:00, rok):
  - nowy wydatek 250 zł, Portfel XTB, „Finansuje: Anna” – wiersz „W3 dla Anny 250 … DOMOWNIK · ODDANE **?** −250,00”, dymek
    „Od progu dziennika kapitańskiego: plan czy impuls?”, w edytorze „od 200,00 zł: plan czy impuls?” (W3.OP25-domownik-250.png);
  - gra liczy zgodnie z D80 f / T161: zakup Anny 250 zł oznaczony „impuls” (dziś 14:00) – Dowództwo „Dziś na razie: zgodny”;
    po zmianie na „— ja (mój wydatek) —” własny impuls też nie jest naruszeniem (pojawia się tylko „Przydział dnia
    przekroczony o 232,72 zł”);
  - **skutek poza grą:** Wywiad → „Dziennik kapitański” liczy zakup Anny jako mój: z oznaczeniem „impuls” – „listopad 2026
    0 · 0,00 | **1 · 250,00** | 0 | 0%”; bez oznaczenia – „bez oznaczenia **1**”, tak samo jak mój zakup
    (W3.OP25-wywiad-impuls.png).
- **Wymaganie:** D80 f (zakup sfinansowany przez domownika nie jest naruszeniem), T161 (impuls i „judas” – tylko moja
  część, `ownSpent`), D80 („sfinansowane wydatki widać osobno”, „nie jest moim kosztem”). Spec „Szybki wpis” nie robi
  wyjątku dla domowników, ale pytanie o cudzy zakup nie ma sensu, a odpowiedź psuje moją trafność w Wywiadzie i Raportach.
- **Przyczyna:** `shared/calc/operations.ts:235–237` `asksImpulse` patrzy tylko na rodzaj, kwotę całej operacji i próg –
  nie na `ownSpent` (mój udział). Z niej: „?” na liście (`operationsView.ts:100` `needsLog` → `OperationsPage.tsx:261`),
  edytor (`OperationEditor.tsx:477`), Wywiad i Raporty (`intel.ts:279–286` `logAccuracy` – pełne `t.amount`,
  „bez oznaczenia” przez `asksImpulse`; `ReportsPage.tsx:233`). Szybki wpis ma własny warunek
  (`QuickApp.tsx:238`: `d.kind !== 'income'` – także „Za domownika”). Gra jest dobra (`game.ts:287–288, 431, 485–487`
  z `ownSpent(t) > 0`).
- **Poprawka i test:** S – `asksImpulse` od `ownSpent(t)` (mój udział od progu), `logAccuracy` liczy mój udział i pomija
  zakupy bez mojego udziału, szybki wpis tym samym warunkiem. Test unit (`operations-fixes.test.ts` / `intel.test.ts`):
  zakup w całości „finansuje: Anna” 250 zł – nie pyta, nie liczy się w dzienniku; paragon 100 moje + 150 Anny – nie pyta
  przy progu 200. Bez migracji (oznaczenia już zapisane zostaną pominięte w liczeniu).
- **Uwagi:** pokrewne z OP.26 (ten sam brak `ownSpent` w oknie) i ze spostrzeżeniem OP („plan czy impuls” przy czynszu,
  racie, bankomacie).

### OP.26 – POTWIERDZONE, tylko tekst (S → N)
- **Odtworzenie** (`w3-op-domownik`, rok + zakup „Noc dla Anny W3” 03.11 00:30, 60 zł, finansuje Anna, wpis „kupione dla
  Anny”): edytor – „**Potwierdzony zakup w ciszy nocnej – liczy się jako naruszenie w grze.** uzasadniony (plan – bez kary)”
  (W3.OP26-edytor-domownik.png); to samo dla nowego zakupu Anny o 01:30 z wpisem (W3.OP26-domownik-wpis.png), bez wpisu –
  „Godzina w ciszy nocnej (23:00–05:00): zakup o tej porze potwierdź krótkim wpisem wyżej (D40). …”. **Gra:** Dowództwo
  „Dziś na razie: zgodny” (W3.OP26-dzis-domownik.png); po przestawieniu tego samego zakupu na „— ja (mój wydatek) —”
  – „Dziś na razie: naruszenie | Zakup w ciszy nocnej: Noc dla Anny W3 60,00 zł” (W3.OP26-dzis-moj.png).
- **Ocena:** zachowanie gry jest zgodne z D80 f / T161 / T187 – zakup domownika nie jest naruszeniem. Fałszywy jest tylko
  tekst edytora, który zapowiada naruszenie i podsuwa „uzasadniony (plan)” (a „plan” trafia potem do „Dziennika
  kapitańskiego” – OP.25). Wada tekstu, który wprowadza w błąd → N (nie S: nic nie działa źle).
- **Przyczyna:** `OperationEditor.tsx:496–508` – status nocny powtarza warunek `isConfirmedNight` (plan / explained /
  kontener), ale bez `ownSpent(t) > 0`, którego używa gra (`game.ts:287`).
- **Poprawka i test:** S – przy `ownSpent(t) === 0` tekst „Zakup domownika – bez naruszenia w grze.” (bez przycisku
  „uzasadniony”); jedna funkcja „czy nocny zakup liczy się w grze” w `calc/operations.ts` dla gry i okna. Test unit tej
  funkcji (zakup w całości domownika, paragon z moją częścią) + ewentualnie e2e tekstu edytora. Bez migracji.
- **Uwagi:** UWAGA „(D40)” w notce (osobno w OP.md) potwierdzona – ten sam tekst.

### OP.33 – WYMAGANIE
- **Odtworzenie** (`w3-op-data`, rok + przelew Portfel XTB → Gotówka 30.10 / druga strona 31.10, 150 zł): zaznaczone
  „Lody Grycan” 30.10 (−28,60), „Apteka” mBank 30.10 (−17,94), przelew → „Przesuń datę” +2 → „Podgląd…”: „3 operacje. /
  Energia dziś 77,28 zł → 76,26 zł / Koperta: Jedzenie 1 588,00 zł → 1 559,40 zł / Koperta: Zdrowie 150,00 zł → 132,06 zł”
  (koperty listopada; W3.OP33-podglad.png). Po zastosowaniu (daty 01.11, przelew 01.11 / 02.11, toast „Przesunięto datę o
  +2 dni: 3 operacje.” z „Cofnij”) zmieniło się też to, czego podgląd nie pokazał: Mostek „Łupy z poprzedniego miesiąca:
  **803,48 zł → 850,02 zł** – podział do 7. dnia, potem trafią do osłon.” i Plan października „Bilans paliwa: +6 086,81 zł
  → **+6 133,35 zł** (koszty 5 413,19 → 5 366,65 zł)” (W3.OP33-plan-paz-przed.png / -po.png; `w3.jsonl`).
- **Ocena:** aplikacja robi dokładnie to, co mówią F11 („podgląd skutku: zmiana energii dziś, kopert i salda konta”) i T265
  („stan pokazywany na ekranach”, `effect.ts`: „The envelopes of this month”). Oczekiwanie punktu („koperty obu miesięcy”)
  idzie dalej niż wymaganie. T265 to decyzja techniczna o zachowaniu widocznym dla użytkownika – do rozstrzygnięcia przez
  użytkownika: czy podgląd ma pokazać miesiąc, z którego operacje wychodzą (łupy i koperty), skoro łupy widać na Mostku.
- **Przyczyna (gdyby przyjąć oczekiwanie):** `shared/calc/effect.ts:16–30` – `effectOf` porównuje tylko koperty bieżącego
  miesiąca, energię, osłony i salda; łupów poprzedniego miesiąca (`calc/plan.ts`) nie ma w `Effect`.
- **Poprawka i test:** M – w `Effect` łupy poprzedniego miesiąca (i jego koperty, gdy zmiana go rusza); test unit
  `effectOf` dla przesunięcia 30.10 → 01.11. Bez migracji.
- **Uwagi:** to samo spostrzeżenie OP („podglądy zmian zbiorczych pokazują część skutku”, OP.31) – materiał na AP.

### OP.40 – POTWIERDZONE (S → N)
- **Odtworzenie** (`w3-op-zero`, rok, 20:32): Meldunki przed – brak meldunku „bez kategorii”. Operacje → „Nowa” → kwota 0
  (Tab), Portfel XTB, kontrahent „W3 zero złotych” (Enter) – zapis bez ostrzeżenia (plik: `expense`, `amount: 0`,
  `categoryId: null`), wiersz „03.11 wt 20:32 W3 zero złotych Portfel XTB bez kategorii 0,00”. Meldunki: „**1 wydatek bez
  kategorii od 01.09.2025 – razem 0,00 zł.** Pokaż w Operacjach” (W3.OP40-meldunek.png).
- **Ocena:** odtwarza się, ale punkt sam mówi „brak wymagania dla 0 zł” – oczekiwanie pochodzi z punktu, nie z wymagań.
  Meldunek jest prawdziwy (operacja bez kategorii, „razem 0,00 zł”) i niczego nie liczy źle; niespójny z regułą dla części
  paragonu 0 zł (pomijana). Ergonomia → N.
- **Przyczyna:** `shared/operationsView.ts:35` `waitsForCategory`: `(p.amount !== 0 || !t.splits.length)` – 0 zł
  pomijane tylko w paragonie; cała operacja 0 zł czeka na kategorię (`inbox.ts:66–76`). Zapis 0 zł bez ostrzeżenia
  (punkt OP.40 „zapis jawny”).
- **Poprawka i test:** S – pomijać każdą linię 0 zł (`p.amount !== 0`) albo ostrzegać przy zapisie 0 zł; test unit
  `isUncategorized` / `uncategorizedOf` (`inbox.test.ts`). Bez migracji. Do decyzji użytkownika, który wariant.

### IM.10 – POTWIERDZONE (S → W, kandydat K)
- **Odtworzenie** (`w3-im-a`, rok przygotowany, L1, 20:47): grupa TOMASZ KOLEGA „+500,00 [Zwrot pożyczki – Pożyczka dla
  Tomka (Radar)] rozpoznane”. „kolega” + „orlen” → „Zaznacz znalezione” → „Zaznaczone: 2 grupy, 3 operacje” → „Wydatek /
  zwrot towaru – kategoria”, „Auto · paliwo” → „Ustaw”: toast „**Ustawiono dla 2.**” (bez „… nie pasuje do kierunku
  pieniędzy”); grupa: „[Zwrot towaru (ujemny wydatek)] [Auto · paliwo] Twoja decyzja [x] zapamiętaj” (W3.IM10-po-ustaw.png).
  Po imporcie L1: operacja „2026-10-30 mBank expense **+500,00** „TOMASZ KOLEGA” Auto · paliwo, bez pożyczki”; Radar
  „Pożyczka dla Tomka … oddane 1 000,00 zł z 2 000,00 zł” bez zmian (w przebiegu bez tej decyzji, `w3-im-b`: „oddane
  1 500,00 zł”); nowa reguła `tomaszkolega` (wpływy, `expense`, Auto · paliwo). **Kolejny plik L2** bez żadnej decyzji
  zapisał „2026-11-03 expense **+300,00** „TOMASZ KOLEGA” ZWROT POŻYCZKI 2” jako zwrot paliwa; Ustawienia → Reguły importu
  „TOMASZ KOLEGA wpływy Auto · paliwo 4 op. inny rodzaj” (W3.IM48-regula.png).
- **Wymaganie:** T90 („decyzja dla zaznaczonych tylko tam, gdzie pasuje do kierunku pieniędzy”), T167 / N14 (pożyczka,
  PIT-38 i XTB nigdy regułą – sprawdzane przy każdej operacji), punkt IM.10 („wpływ dostaje kategorię wydatku” = nie
  przechodzi). Skutek: spłaty pożyczki stają się ujemnymi kosztami paliwa (koszty, łupy i energia zawyżone), pożyczka
  wisi jako spóźniona – teraz i w każdym następnym imporcie, po cichu.
- **Przyczyna:** (1) `options.ts:130–133` `fits('expense', 'in') === true` („Wydatek” przy wpływie = zwrot towaru) – także
  dla wpływu rozpoznanego jako spłata pożyczki; (2) `state.ts:626–628` decyzja zbiorcza ustawia `remember[g.group] = true`
  → reguła `expense / in` na nazwisko pożyczkobiorcy; (3) `classify.ts:476` reguła wygrywa z rozpoznaniem pożyczki, które
  jest dopiero w `:514` – nauczona reguła zabiera każdą kolejną spłatę.
- **Poprawka i test:** M – decyzja zbiorcza „Wydatek / zwrot towaru” nie zmienia grup / wierszy rozpoznanych jako
  pożyczka, PIT-38, XTB i wpłata domownika (liczy je jako „nie pasuje”); rozpoznanie pożyczki z Radaru przed regułą
  nie-pożyczkową tej samej osoby (albo reguła `in` nie powstaje dla kontrahenta pożyczki). Testy: unit
  `tests/unit/import-fixes.test.ts` (bulk z wpływem-pożyczką → bez zmian, toast „1 nie pasuje”), unit `import.test.ts`
  (classify: otwarta pożyczka Tomka + reguła `tomaszkolega` expense/in → „zwrot pożyczki”). Dane: brak migracji; kto już
  to zrobił, ma regułę „wpływy … inny rodzaj” i błędne operacje – poprawka (2) w classify naprawia kolejne importy, stare
  operacje do ręcznej poprawy (podpowiedź w „Reguły importu → niespójne”).
- **Uwagi:** waga W: zła kwota, która po jednej decyzji użytkownika rozchodzi się bez ostrzeżenia na następne importy;
  pierwszy krok jest widoczny w podglądzie, dlatego nie K – do drugiej opinii Fable (pieniądze). Pokrewne IM.24 (N).

### IM.25 – POTWIERDZONE (S → W)
- **Odtworzenie** (`w3-im-b`, rok przygotowany – Babcia przez Tatę, „Leki dla Babci” 100 zł do oddania; L1, 20:51): grupa
  „PIOTR TESTOWY · 2 operacje · 29.10–01.11 +500,00”, wiersze „01.11 OD TATY I BABCI +300,00 ‹+ w tym za Babcia›” i
  „29.10 ZWROT ZA KURS XTB +200,00 ‹+ w tym za Babcia›”. Klik „+ w tym za Babcia” **w wierszu** – panel bez zmian, pole kwoty
  się nie pojawia (W3.IM25-wiersz.png). Klik w grupie – „w tym za [Babcia] [ ]” (pole puste), po wpisaniu 100 **oba wiersze**
  mają „w tym za [Babcia] [100,00]” (W3.IM25-grupa.png). Po imporcie (Tata „zaliczka”): wpłata 29.10 – 100 zł Babci
  (spłaca „Leki dla Babci”), wpłata 01.11 – **drugie 100 zł Babci jako zaliczka**; Tacie zostaje 300 zł zamiast 400 zł.
- **Wymaganie:** D81 – „przy wpłacie przycisk „+ także za X” dzieli ją z kwotą tego, co X ma oddać (do zmiany)”; punkt
  IM.25 – „część Babci spłaca jej zakupy, reszta zostaje Tacie”.
- **Przyczyna:** (1) wiersz: `ImportPage.tsx:606–611` – `chooseRow(p.key, sameChoice(next, choice) ? null : next)`, a
  `sharesKey` (`reconcile.ts:925–929`) pomija linie z kwotą 0 → nowa linia (kwota 0, `DecisionFields.tsx:87`) jest „taka
  sama jak grupa” i decyzja wiersza od razu znika; (2) kwota startowa 0 zamiast tego, co X ma oddać (D81) –
  `DecisionFields.tsx:87`; (3) grupa: `reconcile.ts:1098–1109` – „w tym za” decyzji grupy (kwota bezwzględna) trafia do
  każdej wpłaty grupy.
- **Poprawka i test:** M – wiersz zachowuje własną decyzję z linią w trakcie wpisywania (porównanie bez pomijania linii 0
  albo osobny szkic), kwota startowa = należność X (do zmiany), w grupie z kilkoma wpłatami „w tym za” tylko przy wierszach
  (albo podział należności X po kolei, nigdy ponad to, co ma oddać). Testy: unit `import-fixes.test.ts` (`buildImport`: dwie
  wpłaty Taty, „w tym za Babcia 100” w grupie → Babcia 100 raz) + e2e importu (klik w wierszu pokazuje pole z 100,00).
  Dane: bez migracji schematu; importy zrobione „w tym za” w grupie z kilkoma wpłatami mają zdublowane części – do ręcznej
  poprawy w Operacjach (edytor ma własne „w tym za”).
- **Uwagi:** waga W – funkcja przy wierszu nie działa, a jedyna działająca droga w imporcie daje złe salda domowników (przy
  „reszta jako przychód” także zaniżony mój przychód); widać to w podglądzie, więc nie K – do drugiej opinii Fable
  (rozliczenia z domownikami = silnik pieniędzy, D96). Reguła Taty nie zapamiętuje części Babci (sprawdzone w `fi.json`).

### IM.40 – POTWIERDZONE (S)
- **Odtworzenie** (`w3-im-a`, 20:48): L1 → L2 („nierozliczone → rozliczone 3”, ZABKA −24,91, ORLEN −212,00, APTEKA −54,00)
  → L1 trzeci raz: „nowe operacje 3 … już zaimportowane 86 · usunięte przez Ciebie wcześniej (pominięte) 1” (KIOSK RUCH 12
  zniknięty – dobrze), w kategoryzacji „ZABKA Z1234 … nierozliczona −23,50”, „APTEKA GEMINI … nierozliczona −50,00” i Orlen
  (W3.IM40-trzeci-raz.png). Po „Importuj (3)” operacji 1074 → 1077: w folderze obok rozliczonych są znowu −23,50, −200,00
  i −50,00; Meldunki: „3 możliwe duplikaty – ta sama operacja dwa razy.” (W3.IM40-meldunki.png).
- **Wymaganie:** T35 (ten sam wiersz w kolejnym pliku – „znana”), punkt IM.40 („ponowny import tworzy duplikaty” = nie
  przechodzi).
- **Przyczyna:** `reconcile.ts:1055–1061` – rozliczenie zapisuje `bank: bankOf(p)` (`:1001–1012`) bez `altKeys`, więc
  klucz wiersza nierozliczonego przepada; rozpoznanie znanych po starych kluczach (`:343` – `altKeys` → `byKey`) nie ma
  czego dopasować. Inne ścieżki zachowują stary klucz (`:1018`, `:1042`).
- **Poprawka i test:** S – przy rozliczeniu `altKeys: [...(p.tx.bank.altKeys ?? []), p.tx.bank.key].slice(-20)`. Test unit
  (`import.test.ts` / `import-fixes.test.ts`): `planImport` L1 (nierozliczona) → `buildImport` L2 (rozliczona) → L1 znowu –
  wiersz „known”. Dane: bez migracji; operacje rozliczone przed poprawką nie mają starego klucza (zostaje meldunek
  duplikatów jako siatka).
- **Uwagi:** S zostaje – brzeg (starszy plik po nowszym), skutek widoczny w podglądzie („nierozliczona”) i zaraz po imporcie
  w Meldunkach. Wspólny wątek z IM.42 / IM.39 (dopasowanie po kluczach między plikami).

### IM.48 – POTWIERDZONE (S)
- **Odtworzenie** (`w3-im-a`, 20:49): Ustawienia → Import z banku → Reguły importu: „Bolt wydatki Rozrywka i hobby · wyjścia
  46 op. zmień usuń” → „usuń”: brak okna, brak nowego komunikatu, reguł 13 → 12, w `fi.json` reguły nie ma (W3.IM48-regula.png).
  Słowo „szewc” → „usuń”: słów 2 → 1, bez komunikatu (W3.IM48-slowo.png).
- **Wymaganie:** konwencja „Usunięcia i zmiany zbiorcze mają „Cofnij”” (CLAUDE.md, `.claude/rules/ui.md`); „zmień” tej samej
  listy ma toast z „Cofnij” (IM.45).
- **Przyczyna:** `renderer/features/import/rules.ts:121–123` `deleteRule` tylko filtruje listę (`setRules`), bez toastu
  i bez cofnięcia; to samo słowa kluczowe (`KeywordRules.tsx:64` → `deleteRule`).
- **Poprawka i test:** S – toast „Usunięto regułę „Bolt”.” z „Cofnij” (przywraca regułę na jej miejscu). Test unit sklepu
  (atrapa `window.fi`) albo e2e Ustawień. Bez migracji.

### IM.55 – POTWIERDZONE co do mechanizmu (S → N, długość do pomiaru w maszynie)
- **Odtworzenie** (`w3-im-h`, rok, P30k – 30 000 wierszy, 20:52): dwie próby – najdłuższa przerwa bez klatki okna
  **16,0 s i 15,7 s**, podgląd po 18,3 s i 17,6 s, „Importuj (30000)” (W3.IM55-podglad-1.png, -2.png). Zapis P2k (2000
  operacji) 200,6 s przy oknie odpowiadającym (najdłuższa przerwa 0,46 s); `main.log`: „window zapis wszystkiego: rundy 1,
  niezapisane 0 199197 ms”. Przy pomiarze procesor 100 % (6 procesorów logicznych, 9 procesów FI innych weryfikatorów) –
  w raporcie IM ten sam zapis trwał 31–43 s, CHANGELOG 1.4.3 podaje ok. 3 s.
- **Ocena:** zamrożenie jest prawdziwe (wczytanie i plan na wątku okna, bez postępu), ale jego długość w obciążonym
  laboratorium nie mówi, ile trwa u użytkownika (1.5.4: plan 30 tys. wierszy ok. 0,25 s; przegląd W: parse 0,8 s + plan
  2–2,7 s przed poprawkami). Plik 30 tys. wierszy to brzeg (cała historia raz, w kreatorze lub przy pierwszym imporcie).
  Waga N do czasu pomiaru na nieobciążonej maszynie (IM.53 / maszyna); jeśli maszyna pokaże > 5 s – S.
- **Przyczyna:** `renderer/features/import/state.ts:248–265` `loadImportFile` – `parseMbank(decodeText(bytes))` (`:251`)
  i `planNow` → `planImport` (`:265`) synchronicznie w wątku okna, potem pierwsze renderowanie tematów; bez wskaźnika
  postępu.
- **Poprawka i test:** M – parse + plan w Web Workerze (albo w porcjach z postępem „wczytuję x z N”); test wydajności
  `planImport` 30 tys. wierszy w budżecie czasu (unit, jak pomiary 1.4.3 / 1.5.4) i pomiar w maszynie. Bez migracji.

## Problemy laboratorium
- `w3-im-h`: zamknięcie po 200-sekundowym imporcie przekroczyło limit 40 s (`Aplikacja nie zamknęła się w 40 s`) – drzewo
  zabite przez narzędzie; `main.log` kończy się poprawnie („zamykanie: okno zamknięte”, „koniec pracy”). Skutek obciążenia,
  wyniki punktu zapisane przed zamknięciem.
- Banner „Uruchamiać Financial Intel z Windows na tym komputerze?” widoczny na zrzutach – nie klikany (autostart nietknięty).
