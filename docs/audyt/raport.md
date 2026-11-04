# Audyt funkcjonalny Financial Intel 1.15.4 – raport skonsolidowany (AU-11, krok 2)

- **Wersja:** 1.15.4 z GitHub Releases (rozpakowany instalator, SHA-256 zgodne), laboratorium `C:\FI-audyt`.
- **Daty:** przygotowanie i bloki A–B – 03.11.2026 przed południem (ok. 11:00–13:00), blok C – 03.11.2026 po południu
  (C-0 od 15:16, odczyty ok. 15:40–16:20); konsolidacja – 03.11.2026.
- **Bloki:** A (Opus 5.5 · xhigh) – AU-4 KR, MO, SW, OP, ME, IM, SA; AU-5 DW, WY, RY; AU-6 DA. B (Sonnet 5.5 · high) –
  AU-7 US, IN; AU-8 RE. C (Opus 5.5 · max, D96) – AU-9 wyrocznia i PR; AU-10 PM, LA, DO, MG, DM, RA.
- **Stany danych:** `pusty`, `start` (po kreatorze, 03.11 ok. 11:16), `rok` (14 miesięcy, kotwica 2026-11-03; odnowiony
  w C-0 – dni gry zamrażane po imporcie historii), `rok-ab` (stan bloków A–B – te same pieniądze, inna gra), `brzegi`,
  `dwa-komputery`; folder ICTTJ `ictj-rok` / `ictj-start`; stany szczególne – tabele w raportach obszarów.
- **Źródła:** `docs/audyt/plan.md` (metoda, wagi, AU-11), `raport/README.md` (stan po A–C), raporty obszarów
  `raport/<prefiks>.md`, `raport/0-przygotowanie.md` (P.1–P.3), werdykty liczb `raport/LICZBY-AB.md` i
  `raport/LICZBY-C.md` (wyrocznia u2), `wyrocznia.md` (założenia Z, sprzeczności S1–S10, poprawki u1 / u2),
  `maszyna.md` i `ty.md` (punkty poza laboratorium). Dowody (kroki, „Widać”, zrzuty) – w raportach obszarów, tu tylko
  odsyłacze.
- **Weryfikacja sceptyczna (krok 3) – zakończona** 03.11.2026 ok. 19:40–22:20: W1 (K i W), W2 (KR, MO, SW), W3 (OP, IM),
  W4 (DW, WY, RY, RE, US, IN, DA), W5 (silnik pieniędzy bloku C) – `raport/WERYFIKACJA-1…5.md`; każde znalezisko najpierw
  odtworzone w wydanej aplikacji, potem przyczyna w kodzie. Przegląd kodu wyroczni – `wyrocznia.md`, sekcja „Przegląd kodu
  wyroczni”. **Druga opinia Fable 5.1 – zakończona** (`raport/WERYFIKACJA-FABLE.md`) dla 10 AF pieniędzy i danych:
  zgadza się w 8, podnosi AF-8 (IM.23) W → K i AF-12 (KR.16) S → W jako błąd techniczny. **Weryfikacja zakończona – wagi
  w sekcji 3 są końcowe.**
- Raport maszyny i wyniki „Tylko Ty” jeszcze nie istnieją – punkty poza laboratorium są tylko wymienione (sekcja 4).

## 1. Wynik w liczbach

- **563 punkty** (521 sprawdzał Claude, 42 poza laboratorium), **326 ZGODNE**, **82 punkty NIEZGODNE** w działaniu
  (z P.1), po werdykcie liczb **95 wpisów NIEZGODNE → 79 znalezisk AF** po połączeniu duplikatów, wagi wstępne
  **K 5 · W 4 · S 43 · N 27**; weryfikacja dodała AF-80.
- **Wagi końcowe (80 AF, po weryfikacji i drugiej opinii Fable): K 4 · W 6 · S 25 · N 35**, ODRZUCONE 4 (zgodne
  z decyzjami – zostają z powodem), WYMAGANIE 6 (przeniesione do decyzji użytkownika – sekcja 5).
  - K: AF-1 IM.42 (usunięta operacja wraca), AF-2 DA.40 (folder-widmo), AF-4 MG.8 / MG.10 (przeniesienie celu – błąd reguły
    T129), AF-8 IM.23 = P.3 („reszta jako zaliczka” działa jak „całość jako zaliczka”).
  - W: AF-3 DA.43, AF-7 MO.29 = DO.7, AF-9 IM.39, AF-12 KR.16, AF-26 IM.10, AF-27 IM.25.
- **Żadna kwota pieniędzy nie jest zła wobec wyroczni** (bloki A–C, 814 odczytów): zła kwota w warstwach wychodzi tylko
  tam, gdzie wyrocznia liczy tę samą regułę co aplikacja (AF-4 – T129) albo w drodze importu (AF-1, AF-9, AF-26, AF-27);
  DM.18 – tylko statystyka przychodu (warstwy dobre).
- **Granica ICTTJ dotrzymana:** w każdym przebiegu z folderem ICTTJ sumy SHA-256 przed i po bez zmian (DO.23, 16 przebiegów
  DO + PM, DM, MG, RA); folder ICTTJ jako folder danych i kopii – odrzucony.

## 2. Wynik obszarów

Tabela pokazuje werdykty wykonawców i liczb **przed weryfikacją sceptyczną**; wagi po weryfikacji – sekcja 3.
NIEZGODNE liczone jako wpisy (punkt z dwiema wagami – dwa wpisy: DW.29, DM.18, PR.10, RY.24, PR.3). „Po liczbach” –
po werdyktach `LICZBY-AB` / `LICZBY-C` (wyrocznia u2). LICZBY: Z – ZGODNE, NZ – NIEZGODNE, SP – SPRZECZNOŚĆ WYMAGAŃ
(liczby = jeden z wariantów S / luki), NP – NIEPORÓWNYWALNE.

| Obszar | Blok | Punkty | Claude | ZGODNE | NIEZGODNE (K / W / S / N) | UWAGA | DO OCENY | NDS | Poza lab. | LICZBY → AU-9 | Liczby Z / NZ / SP / NP | NIEZGODNE po liczbach (K / W / S / N) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KR kreator | A | 33 | 32 | 17 | 8 (– / – / 7 / 1) | 3 | – | – ¹ | 1 | 4 | 3 / – / 1 / – | 8 (– / – / 7 / 1) |
| MO Mostek | A | 34 | 29 | 13 | 4 (– / 1 / 2 / 1) | 3 | – | – ¹ | 5 | 9 | 1 / – / 8 / – | 5 (– / 1 / 3 / 1) – MO.15 |
| SW szybki wpis | A | 36 | 34 | 14 | 4 (– / – / 4 / –) | 1 | 1 | – | 2 | 14 | 1 / – / 13 / – | 4 (– / – / 4 / –) |
| OP Operacje | A | 43 | 42 | 20 | 8 (– / – / 5 / 3) | 1 | – | – | 1 | 13 | 7 / – / 5 / 1 | 8 (– / – / 5 / 3) |
| ME meldunki | A | 10 | 9 | 4 | 1 (– / – / – / 1) | 1 | – | – | 1 | 3 | 2 / – / – / 1 | 1 (– / – / – / 1) |
| IM import | A | 56 | 53 | 34 | 14 (1 / 2 / 5 / 6) | 4 | – | 1 | 3 | – | – | 14 (1 / 2 / 5 / 6) |
| SA salda | A | 9 | 8 | 6 | 1 (– / – / – / 1) | 1 | – | – | 1 | – | – | 1 (– / – / – / 1) |
| DW Dowództwo | A | 37 | 36 | 26 | 2 (– / – / 1 / 1) – DW.29 | 3 | – | 1 | 1 | 5 | 2 / – / 3 / – | 2 (– / – / 1 / 1) |
| WY Wywiad | A | 28 | 27 | 14 ² | 3 (– / – / 2 / 1) | 3 | – | – | 1 | 7 | 4 / – / 1 / 2 | 3 (– / – / 2 / 1) |
| RY rytuały | A | 25 | 17 | 12 ² | 3 (– / – / 1 / 2) | – | – | 1 | 8 | 1 | – / 1 / – / – | 7 (– / – / 1 / 6) – RY.20, 21, 23, 24 |
| RE raporty i eksport | B | 15 | 14 | 11 | 3 (– / – / 2 / 1) | 2 ³ | – | – ¹ | 1 | 6 ² | 2 / 2 / 2 / – | 5 (– / – / 2 / 3) – RE.7, RE.10 |
| US Ustawienia | B | 33 | 31 | 16 | 3 (– / – / 2 / 1) | 6 | – | 2 | 2 | 4 ⁴ | 2 / – / 2 / – | 3 (– / – / 2 / 1) |
| IN interfejs | B | 28 | 26 | 19 | 6 (– / – / 2 / 4) | 1 | – ⁵ | – | 2 | – | – | 6 (– / – / 2 / 4) |
| DA dane, dwa komputery | A | 46 | 43 | 28 | 7 (2 / – / 2 / 3) | 7 | – | – | 3 | 1 | – / – / 1 / – | 7 (2 / – / 2 / 3) |
| **Razem A–B** | | **433** | **401** | **234** | **67 (3 / 3 / 35 / 26)** | **36** | **1** | **5** | **32** | **67** | **24 / 3 / 36 / 4** | **74 (3 / 3 / 36 / 32)** |
| PM Plan miesiąca | C | 30 | 27 | 21 | 0 | 2 | – | 1 | 3 | 3 | 2 / – / 1 / – | 0 |
| LA Ładownia | C | 19 | 18 | 12 | 4 (– / – / 3 / 1) | – | – | 1 ⁶ | 1 | 1 | – / – / 1 / – | 4 (– / – / 3 / 1) |
| DO Dokowanie, ICTTJ | C | 25 | 23 | 21 | 2 (– / 1 / 1 / –) | – | – | – ¹ | 2 | – | – | 3 (– / 1 / 2 / –) – C15 |
| MG Mapa gwiezdna | C | 12 | 12 | 6 | 3 (2 / – / 1 / –) | 2 | – | – | – | 1 | – / – / 1 / – | 3 (2 / – / 1 / –) |
| DM Domownicy, pożyczki | C | 19 | 18 | 15 | 3 (1 / – / 1 / 1) – DM.18 | 1 | – | – | 1 | – | – | 3 (1 / – / 1 / 1) |
| RA Radar | C | 14 | 13 | 11 | 1 (– / – / 1 / –) | 1 | – | – | 1 | – | – | 1 (– / – / 1 / –) |
| PR Przekrój liczb | C | 11 | 9 | 6 ² | 4 (– / – / 3 / 1) – PR.10 | – | – | – ¹ | 2 | 6 ² | – / 1 / 5 / – | 6 (– / – / 3 / 3) – PR.8, C25 |
| **Razem C** | | **130** | **120** | **92** | **17 (3 / 1 / 10 / 3)** | **6** | **–** | **2** | **10** | **11** | **2 / 1 / 8 / –** | **20 (3 / 1 / 11 / 5)** |
| P przygotowanie | – | – | – | – | 1 (– / 1 / – / –) – P.1; P.3 = IM.23 | – | – | – | – | – | – | 1 (– / 1 / – / –) |
| **Razem** | | **563** | **521** | **326** | **85 wpisów w 82 punktach (6 / 5 / 45 / 29)** | **42** | **1** | **7** | **42** | **78** | **26 / 4 / 44 / 4** | **95 (6 / 5 / 47 / 37) → 79 AF** |

¹ Część punktu NIE DO SPRAWDZENIA przy werdykcie ZGODNE: KR.1 (wariant bez OneDrive), MO.22 b, RE.1 (powiadomienie
w niedzielę), DO.17 (część zależna od zegara), PR.11 (23:00 i 8. dzień) – sekcja 4.
² Punkty liczone też w innej kolumnie: WY – 7 z 14 ZGODNYCH ma liczby → AU-9 (osobno od 7 „LICZBY”); RY – 4 z 12;
RE – 6 punktów LICZBY to 4 ZGODNE i 2 NIEZGODNE (RE.5, RE.14 – liczby zgodne, NIEZGODNE w działaniu); PR – 6 ZGODNYCH to
dokładnie 6 punktów LICZBY (PR.8 w liczbach NZ).
³ RE: dwie UWAGI w spostrzeżeniach, nie w punktach (daty w XLSX jako tekst, „Miesiące – CSV” dla zakresu dni).
⁴ US.5 i US.12 – „→ AU-10”; US.12 „od dziś” NIEPORÓWNYWALNE (zapis aplikacji z tej chwili nie zachował się).
⁵ IN.25 (DO OCENY) jest poza laboratorium (Ty).
⁶ LA.12 – NDS częściowo (zegar), sprawdzona część ZGODNA.

**Werdykty liczb poza punktami „LICZBY”** (zmieniają kolumnę „po liczbach”): MO.15 → NIEZGODNE (S, R-20); RY.20, RY.21,
RY.24 → NIEZGODNE (N, R-18); C15 (DO.1 / DO.2, ZGODNE u wykonawcy) → błąd aplikacji (S); C25 (PR.3) → stopa „33%” (N).
Liczby zgodne z wyrocznią mimo NIEZGODNE wykonawcy (do oceny w weryfikacji): KR.16, KR.23 (po u1), RE.14 (obie wartości
= wyrocznia, R15), PR.10 (przydział 80,64 = wyrocznia, C20). Gra na nowym stanie `rok` = wyrocznia (wariant B) w każdym
z 59 dni, kwotach naruszeń, stopniu, serii, misji i osiągnięciach.

## 3. Znaleziska

Kolejność: waga wstępna, potem obszar (P, KR, MO, SW, OP, ME, IM, SA, DW, WY, RY, RE, US, IN, DA, PM, LA, DO, MG, DM, RA, PR);
numery AF bez zmian po weryfikacji, AF-80 – nowe z weryfikacji. Szczegóły odtworzenia, przyczyny i testu – raport
weryfikacji (W1 = `raport/WERYFIKACJA-1.md` … W5), dowody pierwotne – raport obszaru. „sp. n” – spostrzeżenie n raportu
obszaru. Ścieżki przyczyn względem `src/`. Poprawka S / M / L – nakład według weryfikatora. N nie były weryfikowane
(plan, krok 3: tylko K, W, S) – waga końcowa = wstępna. „+ Fable” – druga opinia Fable 5.1 (`raport/WERYFIKACJA-FABLE.md`).

| AF | Waga wstępna | Obszar | Punkty źródłowe | Znalezisko | Weryfikacja | Przyczyna (plik:linia) | Poprawka | Waga końcowa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AF-1 | K | IM | IM.42 | Operacja z banku usunięta przez użytkownika wraca po cichu jako nowa przy imporcie pliku drugiego formatu (lista po historii rachunku) – dane, pieniądze. | W1: POTWIERDZONE + Fable: zgadza się (K); naprawa danych – meldunek, nie migracja | `renderer/features/import/state.ts:209-213`, `shared/import/reconcile.ts:469-487`, `:610` | M | **K** |
| AF-2 | K | DA | DA.40 (pokrewne AF-41, AF-42) | Zniknięcie folderu danych w trakcie pracy nie jest rozpoznane: bez banera, po ~30 s aplikacja odtwarza pusty folder w starej ścieżce (`.presence`), wpisy z „Zapisano.” trafiają tam i po powrocie oryginału ich nie ma – dane. | W1: POTWIERDZONE + Fable: zgadza się (K); ostrzeżenie o folderze-widmie | `main/datastore/store.ts:1036-1040`, `:1181`, `main/datastore/atomic.ts:42`, `main/datastore/watch.ts:64` | M | **K** |
| AF-3 | K | DA | DA.43 | Wpisana, a niezatwierdzona zmiana kwoty / daty / konta operacji w okresie potwierdzonego salda (także z banku) czeka w edytorze na „Zmień mimo to” i ginie bez pytania przy zamknięciu aplikacji **i przy opuszczeniu ekranu** (Ctrl+1); na dysku zostaje wersja sprzed zmiany. | W1: POTWIERDZONE, szerzej niż w DA (każda zmiana w okresie potwierdzonego salda, też opuszczenie ekranu); K → W – nic zapisanego nie ginie + Fable: zgadza się (W) | `renderer/features/operations/OperationEditor.tsx:96-106` (zmiana tylko w stanie `ask`), `renderer/store/data.ts:1176` (`flushForClose` jej nie widzi) | S–M | **W** |
| AF-4 | K | MG | MG.8, MG.10, C18 | „Przenieś środki” między celami: silnik przenosi na koniec dnia (T129), Mapa i Mostek od razu – dostawa z tego dnia przepełnia cel (Rower 4 081,08 / 2 500 zł, następny cel nic – wbrew D13), wydatek z celu tego dnia bierze 0 / 400 zamiast 700 zł, resztę z osłon; trwała zła kwota w warstwach (suma kont dobra) – pieniądze. | W1: POTWIERDZONE – błąd reguły technicznej T129 (łamie spec „każdy do swojej kwoty”, D84 C1, T131), nie decyzja użytkownika; nowa T-decyzja: przeniesienie w kolejności chwili `at` + Fable: zgadza się (K) – błąd reguły T129, nie decyzja użytkownika | `shared/calc/fleet.ts:1304-1323` (`slot: 4`, „at the end of its day”) | M (przeliczy przeszłe dni z przeniesieniami – notatka wydania) | **K** |
| AF-5 | K | DM | DM.18 (K) | Nadwyżka spłaty pożyczki udzielonej (odsetki) nie jest przychodem (T70) – zaniżone „Bilans paliwa”, średnie przychody i stopa oszczędności; **warstwy dobre** – odsetki dokują według D13 (wrażenie „jak spłata” z przebiegu przy niepełnych osłonach). | W1: POTWIERDZONE częściowo (przychód zły, warstwy dobre); K → S + Fable: zgadza się (S) | `shared/calc/income.ts:52-70` (operacja `loan` zawsze poza przychodem; silnik zna nadwyżkę – `shared/calc/fleet.ts:1126-1137`) | S | **S** |
| AF-6 | W | P | P.1 | Zaległość ponad ok. 100 **niezamrożonych dni gry naraz** (nie długość gry): zamrażanie porcjami po 2 dni bez przerwy między porcjami przekracza limit 50 aktualizacji Reacta – #185 na ekranie, który akurat jest otwarty (3 min po otwarciu); u zwykłego użytkownika tylko po ponad 3 miesiącach przerwy, z kopii sprzed 100 dni albo po przestawieniu `game.start` wstecz; po restarcie samo mija, danych nie traci. | W1: POTWIERDZONE z poprawionym opisem (wyzwalacz – zaległość > ~100 dni, każdy ekran); W → S | `renderer/store/game.ts:47` (`DAYS_PER_PASS = 2`), `:89-110` | S | **S** |
| AF-7 | W | MO | MO.29, DO.7, DO sp. 8 | „Wycofaj dokowanie” zapowiedziane w CHANGELOG 1.15.2 (N-PC-2, D95) nie istnieje – cofnąć można tylko z toastu przez ok. 6 s; dokowania na złe konto po 6 s nie da się cofnąć (por. AF-37). | W1: POTWIERDZONE (commit 1.15.2 nie zmienia okna ani akcji dokowania) | brak funkcji: `renderer/features/dock/DockingDialog.tsx:134-143`; „Cofnij” tylko w `renderer/features/dock/actions.ts:59-100` | S (albo sprostować notatkę 1.15.2) | **W** |
| AF-8 | W | IM | IM.23, P.3, (S4; MO.20, DM sp. 5) | Opcja listy „Od domownika: X – reszta jako zaliczka” zapisuje `inflowKind: advance` (od 1.15.3 – cała wpłata do depozytu), więc wpłata nie spłaca długu, nawet gdy wskazuje zakup (`covers`); zapamiętana raz odpowiedź (D80 b) znaczy co innego niż jej etykieta – długi nie maleją, depozyt rośnie zamiast osłon – pieniądze. | W1: POTWIERDZONE (W) niezależnie od S4 + WYMAGANIE S4 (czy jawna „zaliczka” może omijać dług – sekcja 5) + Fable: **zmienia wagę W → K** – „reszta jako zaliczka” działa jak „całość jako zaliczka”, pomija wskazane zakupy (`covers`), utrwalone regułą; poprawka techniczna niezależna od S4 (opcja → `inflowKind: repay` + `advance`, `optionOf` rozróżnia; `options.ts:121`); naprawa danych: wpłaty `inflowKind: advance` z niepustym `covers` – deterministycznie jako spłata wskazanych zakupów, reszta – meldunek | `renderer/features/import/options.ts:150-153`, `shared/calc/household.ts:559-563`, reguła zapamiętuje: `shared/import/reconcile.ts:973-983` | S + naprawa danych (meldunek „wpłaty X nie spłaciły długu – spłacić?”) | **K** |
| AF-9 | W | IM | IM.39 | Przeniesienie importu na właściwe konto przenosi też kopie operacji, które już były na mBanku – 17 duplikatów (+1 291,55 zł sumy kont); ta sama luka co AF-1 – dane, pieniądze. | W1: POTWIERDZONE (zła kwota dopiero na drodze naprawy błędu, przed którym aplikacja ostrzega – nie K) + Fable: zgadza się (W) | `shared/import/reconcile.ts:416-447`, `:469-475`, `:336-347` | M (razem z AF-1) | **W** |
| AF-10 | S | KR | KR.12, KR.23, R-4 | Krok 6 kreatora nie pokazuje, co start zabierze z osłon (pierwsza pensja do energii, depozyt domowników) – osłony po starcie zawsze niższe niż w kreatorze; przy dzisiejszych operacjach krok 6 dzieli saldo bieżące zamiast środków z początku dnia startu (R-4, T51). | W2: POTWIERDZONE (KR.23 – duplikat) | `renderer/features/wizard/WizardPage.tsx:98-100` (podstawa podziału), `:305-317` (krok 6 bez skutku startu) | S | **S** |
| AF-11 | S | KR | KR.13, KR.31 | Powrót do kreatora banerem „Kreator startu” albo paletą zaczyna go od nowa i kasuje odpowiedzi (salda, pensja) bez ostrzeżenia; zamknięcie aplikacji też je gubi. | W2: POTWIERDZONE (jedna przyczyna) | `renderer/features/wizard/state.ts:73-91` (`startWizard` zawsze `...initial()`), `:71` (tylko pamięć), `renderer/app/Banners.tsx:113-120` | S (powrót) / M (pamięć po restarcie) | **S** |
| AF-12 | S | KR | KR.16, PM sp. 8 | Opłata okresowa zapłacona tuż przed startem (OC 02.11, termin 03.11): pierwsza pensja odkłada pełne 1 240 zł na cykl już zapłacony – energia listopada niższa o 1 240 zł, Mostek „Asteroida … dziś”, a Ładownia jednocześnie „Zapłacone (02.11)”; notka kroku 3 kreatora obiecuje inną energię. Różnica „energia = pensja − odkładki” z raportu KR jest zgodna z regułą. | W2: POTWIERDZONE – inna istota niż w KR; kwota – WYMAGANIE (T45 / T220 / T135, sekcja 5) + Fable: **zmienia wagę S → W i kwalifikację** – błąd techniczny, nie wymaganie: T135 już zamyka cykl płatnością w miesiącu terminu, silnik nie stosuje go do płatności sprzed startu (`cargoStatus.ts:129-135` sam mówi „zapłacone”); decyzja użytkownika niepotrzebna | `shared/calc/fleet.ts:957-966` (rata dla cyklu spoza `paidCycles`), `:1013-1017` (cykl zamyka tylko płatność po starcie), `:212-220`; kreator `WizardPage.tsx:128-130` | M (silnik pieniędzy) | **W** |
| AF-13 | S | KR | KR.19, KR sp. 4 | Propozycje ładowni: prąd co 2 miesiące o zmiennej kwocie bez propozycji, ustała subskrypcja (Spotify) proponowana jako harmonogram. | W2: WYMAGANIE – aplikacja = T286 → sekcja 5 | `shared/calc/plan.ts:286-291`, `:297-308` | S (przy zmianie T286) | – (N przy zmianie T286) |
| AF-14 | S | KR | KR.29 | Folder z atrybutem „tylko do odczytu” nie jest rozpoznany; „Uruchom budżet” zapisuje salda otwarcia i plan bez `budget.start` (zapis częściowy), podpowiedź przycisku podaje zły powód. | W2: POTWIERDZONE (wariant a) | `main/datastore/store.ts:716-720`, `:735`; `renderer/features/wizard/state.ts:115`, `:130`, `:133`, `:155` | M | **S** |
| AF-15 | S | MO | MO.11, MO.15, R-20 | Termin asteroidy na Mostku liczony z dnia kontenera, a w Ładowni i Radarze z dnia płatności z historii (T208, T221) – ta sama opłata ma dwa terminy, ostrzeżenie przychodzi za wcześnie albo wcale. | W2: POTWIERDZONE | `shared/calc/briefing.ts:259-276` (`nextUnpaidOf` z `dueDay` kontenera) wobec `radar.ts:103-104`, `:121-138` | S | **S** |
| AF-16 | S | MO | MO.20, PR sp. 1, DM sp. 5 | „Depozyt domowników 4 797,20 zł” ≠ suma zaliczek przy osobach (4 737,20) – 60 zł zaliczki Marka nigdzie niewidoczne: wiersz osoby pokazuje „ma oddać” albo „zaliczka”, nigdy oba. | W2: POTWIERDZONE (związek z S4) | `renderer/features/bridge/BridgePage.tsx:719-721`, `renderer/features/settings/HouseholdTab.tsx:203-206` | S (+ decyzja S4) | **S** |
| AF-17 | S | SW | SW.24 | Kwota ujemna w szybkim wpisie znika z pola bez słowa – komunikat idzie do toastu, którego okno szybkiego wpisu nie ma. | W2: POTWIERDZONE | `renderer/components/fields.tsx:55-59`, `:86-90`; `renderer/main.tsx:21` (bez `<Toasts />`), `QuickApp.tsx:509` | S | **S** |
| AF-18 | S | SW | SW.26 | „#wakacje-chorwacja” w nazwie i tag „Wakacje Chorwacja” zapisują się jako dwa tagi – dwie wyprawy w Wywiadzie. | W2: WYMAGANIE – aplikacja = T291 („-” ≠ spacja) → sekcja 5 | `shared/calc/tags.ts:19-22` | S (przy zmianie T291) | – (S przy zmianie T291) |
| AF-19 | S | SW | SW.31 | Esc w trakcie wpisywania kwoty zamyka szybki wpis i porzuca kwotę, a „×” ją zachowuje. | W2: POTWIERDZONE | `renderer/features/quick/QuickApp.tsx:372-377`, `renderer/components/fields.tsx:97-100` | S | **S** |
| AF-20 | S | SW | SW.33 | Archiwizacja kategorii albo domownika przy otwartym szybkim wpisie: „— bez kategorii —” bez komunikatu, Enter zapisuje w zarchiwizowanej podkategorii, za domownika podstawiany pierwszy z listy. | W2: POTWIERDZONE | `renderer/store/quickHost.ts:39-40`, `QuickApp.tsx:199-219` | S | **S** |
| AF-21 | S | OP | OP.8 | Filtr „Kwota (bez znaku)” od 100 do 20 zł po cichu kasuje „od” i pokazuje kwoty do 20 zł. | W3: POTWIERDZONE | `renderer/features/operations/ListTools.tsx:152` | S | **S** |
| AF-22 | S | OP | OP.25, OP sp. 1 | Zakup finansowany przez domownika pyta „plan czy impuls?” (lista „?”, edytor, Wywiad, Raporty) – pytanie patrzy na kwotę całej operacji, nie na mój udział. | W3: POTWIERDZONE | `shared/calc/operations.ts:235-237`, `shared/calc/intel.ts:279-286` | S | **S** |
| AF-23 | S | OP | OP.26 | Notka edytora przy zakupie domownika nocą mówi „liczy się jako naruszenie w grze”, choć gra liczy dobrze (bez naruszenia). | W3: POTWIERDZONE – tylko tekst; S → N | `renderer/features/operations/OperationEditor.tsx:496-508` | S | **N** |
| AF-24 | S | OP | OP.33 | Podgląd „Przesuń datę” przez granicę miesiąca pokazuje tylko koperty bieżącego miesiąca – łupy (803,48 → 850,02) i bilans poprzedniego zmieniają się bez zapowiedzi. | W3: WYMAGANIE – aplikacja = F11, T265 → sekcja 5 | `shared/calc/effect.ts:16-30` | M (przy zmianie) | – (S przy zmianie) |
| AF-25 | S | OP | OP.40 | Wydatek 0,00 zł bez kategorii daje meldunek „1 wydatek bez kategorii … – razem 0,00 zł.”. | W3: POTWIERDZONE; S → N | `shared/operationsView.ts:35` | S | **N** |
| AF-26 | S | IM | IM.10, (IM.24) | „Decyzja dla zaznaczonych” z kategorią zmienia zaznaczony wpływ (spłatę pożyczki) w zwrot towaru bez komunikatu – spłaty stają się ujemnymi kosztami (koszty, łupy i energia zawyżone), a zapamiętana reguła rozlewa to po cichu na kolejne importy – pieniądze. | W3: POTWIERDZONE; S → W (kandydat K) + Fable: zgadza się (W, nie K) – pierwsza zła kwota z jawnej, widocznej decyzji; najpierw `classify.ts` (pożyczka z Radaru przed regułą innego rodzaju – naprawia kolejne importy) | `renderer/features/import/options.ts:130-133`, `state.ts:626-628`, `shared/import/classify.ts:476`, `:514` | M | **W** |
| AF-27 | S | IM | IM.25 | „+ w tym za …” przy pojedynczej wpłacie nie działa, a przy grupie dotyczy każdej wpłaty – jedyna działająca droga daje złe salda domowników (przy „reszta jako przychód” także zaniżony przychód) – pieniądze. | W3: POTWIERDZONE; S → W + Fable: zgadza się (W); dodatkowo udział grupy nigdy ponad należność osoby w sumie (`reconcile.ts:925-929` – `sharesKey` pomija 0; D81 – start od należności) | `renderer/features/import/ImportPage.tsx:606-611`, `shared/import/reconcile.ts:925-931`, `:1098-1109`, `DecisionFields.tsx:87` | M | **W** |
| AF-28 | S | IM | IM.40 | Starsza lista po rozliczeniu proponuje rozliczone nierozliczone jako nowe – duplikaty po „Importuj”. | W3: POTWIERDZONE | `shared/import/reconcile.ts:1055-1061` (wobec `:343`) | S | **S** |
| AF-29 | S | IM | IM.48 | Usunięcie reguły i słowa kluczowego bez potwierdzenia i bez „Cofnij”. | W3: POTWIERDZONE | `renderer/features/import/rules.ts:121-123` | S | **S** |
| AF-30 | S | IM | IM.55 | Wczytanie bardzo dużego pliku (30 tys. wierszy) zamraża okno na czas analizy. | W3: POTWIERDZONE co do mechanizmu, czas niewiarygodny (laboratorium 100 % CPU); S → N, pomiar w maszynie | `renderer/features/import/state.ts:248-265` | M | **N** |
| AF-31 | S | DW | DW.29 (S) | Saldo z pliku mBanku nie zalicza misji „Inwentaryzacja”, gdy plik kończy się przed poniedziałkiem misji („0 z 3”) – potwierdzenia liczone po dacie salda, nie po dniu czynności. | W4: POTWIERDZONE | `shared/calc/game.ts:515` | S | **S** |
| AF-32 | S | WY | WY.19 | Kurs na 12 miesięcy przy pustym kadłubie płaci pensję regułą silnika, ale zdejmuje średnie koszty z osłon bez dolnej granicy („Osłony −21 600,00”) i nie ma miesięcy z pensją częściową („Pensja z kadłuba: nie”), choć Mostek mówi „Pensja częściowa” i spec wymaga czerwonego alarmu. | W4: POTWIERDZONE, mechanizm inny niż w WY | `shared/calc/course.ts:155-176`, `:111-116`, `:205-215` | S | **S** |
| AF-33 | S | WY | WY.20, PR.3, C19, R-15 | Symulator manewrów: „teraz 7,9 mies.” wobec 7,8 na innych ekranach – „teraz” to zasięg po resztce bieżącego miesiąca: otwarte boje i **zaległe spłaty pożyczek danych przeniesione na ten miesiąc** (zakłada, że spóźniona od 04.09 rata Tomka wróci teraz); nie brak długu (PR.3) ani zaokrąglenie (R-15) – wyrocznia do sprostowania. Też: wartość spoza zakresu z klawiatury po cichu wraca do poprzedniej. | W4: POTWIERDZONE, mechanizm inny niż w raportach | `shared/calc/course.ts:139-145`, `renderer/features/intel/Course.tsx:39-45`; pole: `renderer/components/ui.tsx:99-105`, `:113`, `Course.tsx:236`, `:240` | S | **S** |
| AF-34 | S | RY | RY.24 (S), R-19 (RY.23, RE.10), PM sp. 10 | Przegląd roczny pierwszego roku pokazuje miesiące sprzed historii jako „0,00 zł” i saldo otwarcia podpisane „na początku (31.12 roku wcześniej)”. | W4: POTWIERDZONE; S → N | `shared/calc/intel.ts:363` (zawsze 12 miesięcy), `renderer/features/reports/ReportsPage.tsx:440` | S | **N** |
| AF-35 | S | RE | RE.5 | Paragon dzielony w „Operacje – CSV” / Excel to jedna pozycja bez kwot części. | W4: **ODRZUCONE** – zgodne z D89 i T303 (jeden wiersz, części w „Notatce”); materiał na AP (arkusz „Części”) | – | – (AP) | – |
| AF-36 | S | RE | RE.15 | „Do” wcześniejsze niż „Od” daje po cichu pusty plik i toast „Zapisano”. | W4: POTWIERDZONE; S → N | `renderer/features/reports/ReportsPage.tsx:502-507`, `:520` | S | **N** |
| AF-37 | S | US | US.6 | Brak usuwania nieużywanych kategorii i podkategorii (tylko archiwizacja), mimo N-PC-7 (D95) i wpisu w CHANGELOG 1.15.2. | W4: POTWIERDZONE (funkcji nie ma w kodzie) | `renderer/features/settings/CategoriesTab.tsx:111-115` | M (+ sprostowanie CHANGELOG 1.15.2) | **S** |
| AF-38 | S | US | US.32 | W polach liczbowych Ustawień Esc nie cofa wpisu, a opuszczenie pola zapisuje wartość do silnika warstw. | W4: POTWIERDZONE | `renderer/components/ui.tsx:115-122` (bez Esc), `:106-113` (zapis przy wyjściu) | S | **S** |
| AF-39 | S | IN | IN.4, DA.39 | W folderze tylko do odczytu Ctrl+S i „Zapisz teraz” mówią „Zapisano.”, choć nic nie zapisano. | W4: POTWIERDZONE; S → N | `renderer/store/data.ts:1232-1246` (`saveNow` bez sprawdzenia trybu) | S | **N** |
| AF-40 | S | IN | IN.26 | Baner „Zaktualizowano … – Co nowego” prowadzi (offline, aktualizacja spoza aplikacji) do Aktualizacji bez panelu „Co nowego”. | W4: POTWIERDZONE; S → N | `main/update/updater.ts:148`, `renderer/features/settings/UpdatesTab.tsx:172-176`, `:245` | S | **N** |
| AF-41 | S | DA | DA.3 | Ekran brakującego zapamiętanego folderu nie ponawia otwarcia co 30 s. | W4: **ODRZUCONE** – zgodne z T248, T192, B53 (ponawianie tylko przy nieczytelnym `fi.json`); AP (N, nakład S) | – | – (AP) | – |
| AF-42 | S | DA | DA.41 | Zmiana wpisana tuż przed zniknięciem folderu: pytanie przy zamknięciu podaje fałszywą przyczynę („Zmiany z drugiego komputera”), po powrocie folderu zmiana nie zapisuje się sama, „Zamknij mimo to” ją gubi – dane. | W4: POTWIERDZONE (przyczyna wspólna z AF-2) | `main/datastore/store.ts:1356-1362` (brak pliku = „usunięty na innym komputerze”) | M (razem z AF-2) | **S** |
| AF-43 | S | LA | LA.3, PR sp. 7 | Podpowiedź edytora opłaty okresowej liczy „ratę z wyrównaniem do terminu” jak przy pustym zbiorniku (OC „1 240,00 zł/mies.” przy pełnym zbiorniku i racie 103,37 w Planie). | W5: POTWIERDZONE | `renderer/features/cargo/CargoPage.tsx:320`, `:86`, `:66-71`, `:189`, `:198` | S | **S** |
| AF-44 | S | LA | LA.8, C17, (C20) | Plan przyszłych miesięcy pokazuje ratę nominalną zamiast tej, którą pobierze silnik (75 zamiast 225 zł przy opłacie dodanej w trakcie cyklu; 245,83 zamiast 0 przy pensji 0 – C20); silnik liczy dobrze. | W5: POTWIERDZONE (nie K – zła projekcja, nie warstwy) | `shared/calc/plan.ts:413-416` | S (jedna poprawka z C20) | **S** |
| AF-45 | S | LA | LA.10, LA sp. 1 | Opłata zapłacona ponad 14 dni przed terminem trafia do poprzedniego cyklu – fałszywa „nowa cena” (240 → 480 zł, +100 %) w odprawie, Meldunkach i Ładowni; „Zaktualizuj” podwoiłby kontener. | W5: POTWIERDZONE (wobec T135) | `shared/calc/cargoWatch.ts:81-92`, `cargoStatus.ts` (okno 14 dni) | S–M | **S** |
| AF-46 | S | DO | DO.5, DO sp. 1, MG sp. 1, PR sp. 2 | Zwrot do masy z puli Podatek przed „Zadokuj” daje czerwony alarm firewalla, naruszenie dnia (zamarza w grze po 7 dniach bez dokowania) i −300 zł z osłon; szerzej – niezadokowana para liczy się zwykłą kolejnością. | W5: WYMAGANIE – aplikacja = T163 (wobec T65) → sekcja 5 | `shared/calc/fleet.ts:1063-1078` | S wąsko / M (pula od razu – zamyka DO sp. 1 i MG.12) | – (S przy wyborze T65) |
| AF-47 | S | DO | C15 (DO.1, DO.2), DO sp. 2 | Wpis ICTTJ z pierwszych 3 dni budżetu bez pary w banku oznaczony „sprzed startu” zamiast „czeka na import” – przy wypłacie na Portfel XTB FI nigdy nie zaproponuje dokowania (D72, T63, T162). | W5: POTWIERDZONE (nowe znalezisko – w DO tylko spostrzeżenie) | `shared/calc/dock.ts:242-245` („before-start” przed sprawdzeniem okna pary) | S | **S** |
| AF-48 | S | MG | MG.12 | „DOL” wskazuje cel, który nie dostanie następnej dostawy. | W5: WYMAGANIE – DOL liczony poprawnie ze stanu silnika; rozjazd wynika z T163 i T129 (AF-46, AF-4) → sekcja 5 | `renderer/features/starmap/StarMapPage.tsx:58-62` (poprawnie) | bez osobnej (z AF-4 / AF-46) | – |
| AF-49 | S | DM | DM.11, SW sp. 4 | Edytor Operacji przy „Wspólnie → procenty” 50 / 30 / 10 ostrzega, ale zapisuje, a szybki wpis, zmiana zbiorcza i import odmawiają. | W5: **ODRZUCONE** – zgodne z T156; AP spójności | – | – (AP) | – |
| AF-50 | S | RA | RA.4 | Zaległa opłata kontenera miesięcznego z poprzedniego miesiąca z początkiem nowego miesiąca znika z Radaru, Ładowni i odprawy. | W5: WYMAGANIE – aplikacja = F1, T208 (wobec D86, D4) → sekcja 5; część niezależna – AF-80 | `shared/calc/cargoStatus.ts:113-127` | S–M | – (S przy wyborze D86) |
| AF-51 | S | PR | PR.9 | Rata pożyczki 100 zł / 3: Ładownia i Plan „33,33 zł/m”, Radar ostatnia „−33,34 zł” – kontener raty ma kwotę pierwszej raty (T72). | W5: POTWIERDZONE; S → N | `renderer/features/radar/actions.ts:81`, `:122` | S | **N** |
| AF-52 | S | PR | PR.10 (S), C20 | Pensja 0 w M+1: „Podstawowy przydział 80,64 zł dziennie” i odkładki 245,83 w planie. | W5: przydział **ODRZUCONE** (z kopert codziennych = wyrocznia, punkt sam „brak wymagania”); odkładki – WYMAGANIE C20 (sekcja 5), rozjazd planu z silnikiem w AF-44 | – | (w AF-44) | – |
| AF-53 | N | KR | KR.3 | „Nowe dane gdzie indziej” na folderze z obcymi plikami tworzy podfolder FinancialIntel bez komunikatu. | – (N) | | | **N** |
| AF-54 | N | MO | MO.30 | Krzywa majątku po tygodniu historii (dwa punkty) zamiast „Za mało danych – … po dwóch tygodniach”. | – (N) | | | **N** |
| AF-55 | N | OP | OP.3, SA.1, IN.21 (+UWAGI DA.17, DA.22) | Daty ISO w interfejsie: zakres dat w Operacjach, historia salda otwarcia, Dziennik zmian i okno Historii. | – (N) | | | **N** |
| AF-56 | N | OP | OP.11 | „Mój filtr” po widoku z Meldunków / Mostka przywraca konto i rodzaj, ale zostawia okres tamtego widoku. | – (N) | | | **N** |
| AF-57 | N | OP | OP.39 | Suma kwot eksportu ≠ „Wpływy” − „Wydatki” paska przy przelewach własnych (pasek je pomija bez wyjaśnienia). | – (N) | | | **N** |
| AF-58 | N | ME | ME.3, OP sp. 6 | „Pokaż zakupy” przy „<osoba>: do oddania” otwiera wszystkie zakupy wszystkich domowników z całej historii. | – (N) | | | **N** |
| AF-59 | N | IM | IM.8 | Brak „(jak grupa)” w wierszu, gdy grupa ma kategorię; pierwsza opcja listy – „— bez kategorii —”. | – (N) | | | **N** |
| AF-60 | N | IM | IM.13 | „Rozłącz” połączonych nazw bez „Cofnij”. | – (N) | | | **N** |
| AF-61 | N | IM | IM.19 | Opłaty z kategorią mBanku lądują w temacie podpowiedzi, nie w „Opłaty banku”. | – (N) | | | **N** |
| AF-62 | N | IM | IM.24 | „+ domownik” proponowany przy przelewie własnym, wypłacie XTB i zwrocie pożyczki. | – (N; pokrewne AF-26) | | | **N** |
| AF-63 | N | IM | IM.28 | „Zapisz import (bez zmian)” dla pliku drugiego formatu robi kopię przed importem. | – (N) | | | **N** |
| AF-64 | N | IM | IM.45 | „Bez trafień” pokazuje reguły pożyczki / PIT-38 / XTB; licznik ≠ lista (136 / 139). | – (N) | | | **N** |
| AF-65 | N | DW | DW.29 (N) | „Dziś bez wydatków” nie zmienia statusu misji „Dzień bez wydatków”. | – (N) | | | **N** |
| AF-66 | N | WY | WY.25 (+UWAGI MO.33, OP.26, DW.34) | Dymek „Daily Bias (spec, Wywiad)” i kody decyzji „(D81)”, „(D40)”… w tekstach; słowniczek F1 bez terminów ICT. | – (N) | | | **N** |
| AF-67 | N | RY | RY.2 | Odprawa poranna po ciszy nocnej przychodzi, ale okno otwarte na innym ekranie nie przechodzi na Mostek. | – (N) | | | **N** |
| AF-68 | N | RY | RY.9 | „później ›” aktywne na domyślnym tygodniu – prowadzi do niepełnego tygodnia w toku. | – (N) | | | **N** |
| AF-69 | N | RY | R-18: RY.20, RY.21, RY.23, RY.24 (N), RE.7, RE.10, PR.8, C25 (PR.3); WY sp. 6, RY sp. 5 | Stopa oszczędności bez miejsca po przecinku („55%”, „32%”, „33%”, CSV „55”) obok „52,9%” – wbrew T294. | potwierdzone przez wyrocznię (R-18, C25) | | | **N** |
| AF-70 | N | RE | RE.14 | Panel „Przychody → 12 mies.” 9 458,33 ≠ średnia wierszy Bilansu paliwa 9 541,67 bez objaśnienia (obie = wyrocznia, R15). | – (N; liczby zgodne – kandydat na UWAGĘ) | | | **N** |
| AF-71 | N | US | US.23 | Zoom 1,23 → „123%” zamiast 120 %; przy wyższym kontraście „Ctrl K” ma 10 px. | – (N) | | | **N** |
| AF-72 | N | IN | IN.20 | Słowo „firma” w trzech miejscach importu. | – (N) | | | **N** |
| AF-73 | N | IN | IN.24 | Przejście 100 ms poza przedziałem 120–160 ms. | – (N) | | | **N** |
| AF-74 | N | IN | IN.28 | Tab z palety wychodzi za nakładkę i Esc przestaje ją zamykać; w oknach modalnych fokus nie przechodzi do okna. | – (N) | | | **N** |
| AF-75 | N | DA | DA.7 | Szybki wpis w trakcie zmiany folderu pokazuje dane starego folderu, zapis trafia do nowego. | – (N) | | | **N** |
| AF-76 | N | DA | DA.28 | Kopia zmieniona w trakcie „Scal…” – okno samo się odświeża i zapisuje nową wersję zamiast odmowy. | – (N) | | | **N** |
| AF-77 | N | LA | LA.17 | „Zrzuć z ładowni” archiwizuje bez „Cofnij”. | – (N) | | | **N** |
| AF-78 | N | DM | DM.18 (N) | Podpowiedź „zwrot pożyczki „…”? przypisz” pojawia się tylko przy jednej otwartej pożyczce udzielonej. | – (N; W1 wymienia bez sprawdzenia) | | | **N** |
| AF-79 | N | PR | PR.10 (N), MG sp. 3 | Kontener z kwotą 0: „Dodaj do ładowni” nieaktywny bez komunikatu (cel 0 i pożyczka 0 – „Podaj kwotę …”). | W5: POTWIERDZONE | `renderer/features/cargo/CargoPage.tsx:440`, `:444` | S | **N** |
| AF-80 | – (nowe) | RA | RA.4 (część), z W5 | Termin od 28. dnia w miesiącu 30-dniowym (od 29. w 31-dniowym) nigdy nie dostaje stanu „po terminie” (`due + 3` wypada w następnym miesiącu, gdzie liczy się nowy termin) – czynsz płacony 30. dnia nigdy nie zaalarmuje; łamie F1 / D86 w ich własnym zakresie, niezależnie od decyzji o AF-50. | W5: nowe – POTWIERDZONE w kodzie (odtworzenie na terminie 20.10 – część AF-50) | `shared/calc/cargoStatus.ts:132-136` (`OVERDUE_DAYS` = 3), `:113-127` | S–M (z AF-50) | **S** |

**Wagi końcowe (80 AF):** K 4 · W 6 · S 25 · N 35 · ODRZUCONE 4 (AF-35, AF-41, AF-49, AF-52) · WYMAGANIE 6 (AF-13,
AF-18, AF-24, AF-46, AF-48, AF-50 – sekcja 5). Z częścią do decyzji przy potwierdzonym błędzie: AF-8 (S4 – tylko jawna
„zaliczka”; błąd opcji poprawiany niezależnie), AF-44 (C20). Druga opinia Fable dla 10 AF (AF-1, 2, 3, 4, 5, 8, 9, 12, 26,
27): zgadza się w 8, zmienia AF-8 W → K i AF-12 S → W (błąd techniczny – T135, bez decyzji użytkownika). Zmiany wag
względem wstępnych: K → W AF-3, K → S AF-5, W → K AF-8, W → S AF-6, S → W AF-12, AF-26, AF-27, S → N AF-23, AF-25, AF-30,
AF-34, AF-36, AF-39, AF-40, AF-51.

**Kolejność napraw (Fable, dla 10 AF pieniędzy i danych):**
1. AF-2 DA.40, AF-1 IM.42 (+ AF-9 IM.39 tą samą poprawką), AF-4 MG.8 / MG.10 – pieniądze i dane, bez decyzji użytkownika.
2. AF-8 IM.23 (część techniczna + naprawa danych: wpłaty `inflowKind: advance` z niepustym `covers` – deterministycznie
   jako spłata, reszta – meldunek), AF-12 KR.16 (silnik pieniędzy – max), AF-26 IM.10 (`classify.ts`).
3. AF-27 IM.25, AF-3 DA.43.
4. AF-5 DM.18. Decyzja S4 – od użytkownika, równolegle; nie blokuje punktów 1–3.

Małe poprawki S według W2–W5: AF-11 (jedna linia), AF-15, AF-17, AF-19, AF-20, AF-31, AF-33, AF-38, AF-44 (jedna funkcja
z C20), AF-47; AF-42 razem z AF-2.

**Połączone duplikaty (16 wpisów mniej):** MO.29 = DO.7; WY.20 = PR.3 = C19 = R-15; LA.8 = C17; KR.12 = KR.23 = R-4;
IM.23 = P.3; MO.11 = MO.15 = R-20; KR.13 = KR.31; MG.8 = MG.10 = C18; IN.4 = DA.39; OP.3 = SA.1 = IN.21; R-18 = RY.20 =
RY.21 = RY.23 = RY.24 (N) = RE.7 = RE.10 = PR.8 = C25; weryfikacja dołożyła RY.24 = R-19, LA.8 = C20 (ta sama funkcja planu),
MG.12 → T163 / T129. Odsyłacze bez łączenia (inna funkcja, wspólna przyczyna albo wzorzec):
AF-7 / AF-37 (zapowiedzi 1.15.2), AF-2 / AF-41 / AF-42 (dostępność folderu), AF-46 / AF-48 / AF-4 (dostawa przed
dokowaniem, przeniesienie celu), AF-8 / AF-16 (S4), AF-29 / AF-60 / AF-77 (brak „Cofnij”), AF-17 / AF-21 / AF-36 / AF-38
(ciche odrzucanie), AF-14 / AF-39 (tylko do odczytu).

## 4. UWAGI, DO OCENY, NIE DO SPRAWDZENIA i poza laboratorium

### UWAGI (tekst, wygląd) – 42
- **KR.14** – nagłówek „średnie z 0 pełnych mies.”; bez historii kreator zostawia energię dziś 0,00 zł bez podpowiedzi kopert.
- **KR.26** – minimum osłon z kropką „1.0” (kreator, Ustawienia, Dowództwo); reszta pól z przecinkiem.
- **KR.30** – „Przerwij kreator” bez potwierdzenia; domownicy i cele z kreatora zostają po przerwaniu bez słowa.
- **MO.7** – dwie daty jednej dostawy na Mostku (20.10 – bank, 19.10 – wpis ICTTJ) bez wyjaśnienia.
- **MO.31** – „Ostatnie operacje” w obrębie dnia według chwili wpisania, nie godziny (wymaganie milczy).
- **MO.33** – bez objaśnienia: Daily Bias, Bullish / Neutral / Bearish, Killzone, BOS / CHoCH, „Zwrot do masy”, „Bieżące”;
  linie „Układy gwiezdne”, „Zbiorniki”, „Depozyt domowników”, „Łupy”, „Dług” bez dymku (→ AF-66).
- **SW.12** – przy „— wybierz domownika —” podgląd mówi „Finansuje Anna … z zaliczki 120,00 zł”.
- **OP.27** – limit 20 tagów i 40 znaków bez komunikatu (pole znika, tag ucięty po cichu).
- **OP.26 (część)** – notka ciszy nocnej z kodem „(D40)”.
- **ME.3 (część)** – wyjaśnienie „po co meldunek” tylko pod 5 z 13 sekcji.
- **ME.8** – ten sam wiersz banku zapisany dwa razy jest jednocześnie „możliwym duplikatem – scal” i „dwoma obciążeniami –
  nie są łączone”.
- **IM.1** – znaczniki czasu „3.11.2026, 11:23” obok dat „03.11.2026”.
- **IM.6** – dwa różne teksty odrzucenia pliku 21 MB (upuszczenie / wybór z okna).
- **IM.30** – po „Cofnij” cofnięcia okno mówi „zmienione później przez Ciebie: 71”.
- **IM.31** – okno cofania H1 „zmienione później przez Ciebie: 10”, choć użytkownik ich nie zmieniał.
- **SA.3** – znak różnicy salda: bank − FI w pytaniu i toaście, FI − bank w telemetrii z banku.
- **DW.12** – przy wyłączonym firewallu brak informacji, że dopłaty nie są sprawdzane.
- **DW.18** – po awansie „dni zgodne 0 (od 02.11 do 01.11)” – zakres odwrócony.
- **DW.34** – kody decyzji (D40, D41, D23) w rozkazach.
- **WY.13** – marka „BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI: 2026-08-29”; „Mokka” i „KAWIARNIA MOKKA” osobno.
- **WY.14** – miesiąc bez wydatków – tabela zer zamiast komunikatu.
- **WY.15** – „Z bojami … do lipca 2027” obok „(czerwiec 2027)” bez boi.
- **RE (sp. 3)** – XLSX: daty i godziny jako tekst ISO (filtr dat i tabela przestawna ich nie widzą).
- **RE (sp. 2)** – „Miesiące – CSV” dla zakresu dni oddaje cały miesiąc pod nazwą z dniem.
- **US.1** – cztery panele ustawień komputera nie mówią, że są „tylko tego komputera”.
- **US.9** – cisza nocna „od = do” przyjęta po cichu jako „brak ciszy”.
- **US.13** – po „Nie czytaj ICTTJ…” selektor pokazuje „(scenariusza nie ma w ICTTJ)”.
- **US.16** – brak godziny odprawy porannej (D84 C9) – tylko „przy pierwszym otwarciu okna po ciszy nocnej”.
- **US.31** – brak banera „tylko do odczytu” na zakładkach Import z banku i ICTTJ.
- **US.33** – zmiana ustawienia przy chwilowo zablokowanym `config.json` ginie bez ponowienia i bez komunikatu.
- **IN.19** – w banerze „tylko do odczytu” „-” zamiast „–”.
- **DA.8** – komunikat parsera po angielsku; „Weź ustawienia z historii” bez wskazania, co przepadło.
- **DA.11** – rotacja ręcznych kopii (5) nieopisana w Ustawieniach.
- **DA.15** – „ENOENT: no such file or directory, mkdir '\\?'” w komunikacie.
- **DA.17** – „1 plan miesiąca zmieniona”; tytuły z datą ISO.
- **DA.20** – ucięty ZIP: komunikat po angielsku; operacja nowszej wersji liczona jako „Dodane po kopii”.
- **DA.22** – „Masa od dnia — / 2026-11-03T11:24:23.355Z” w historii kontenera.
- **DA.31** – plik chwilowo zablokowany z odznaką „USZKODZONY”; przyczyny po angielsku.
- **PM.22** – debriefing M0 w Raportach bez „(w tym +200,00 zł zapasu i pokryć)”.
- **PM.24** – „Miesiąc trwa – wynik po jego końcu.” nie występuje w Planie miesiąca (na M0 – debriefing M-1).
- **MG.3** – „w listopad 2026”, „w grudzień 2026” (mianownik).
- **MG.4** – potwierdzenie zmiany scenariusza bez listy celów do archiwizacji (T130).
- **DM.10** – „od: Tata, Anna” – nadawca przelewu na końcu.
- **RA.10** – przy braku źródła przelewu tylko „Zabraknie …”, bez podpowiedzi z punktu.

### DO OCENY → `ty.md`
- **SW.36** – ergonomia szybkiego wpisu: 45 klawiszy na trzy zakupy, 10 × Tab do „plan” (`ty.md` p. 25).
- **IN.25** – wygląd i ton wobec ICTTJ (`ty.md` p. 18; zrzuty `IN.16-*`, `IN.17-*`, `US.23-kontrast.png`).
- Części „Ty” punktów sprawdzonych przez Claude: WY.4, WY.9 (czytelność), WY.25 (terminy ICT), WY.28, RE.6 (Excel),
  RE.9, RE.10 (wydruk), DW.20, RY.21, RY.22, US.19 (dźwięk), MO.17 / RY.4 (odsłuch) – `ty.md` p. 7–17.
- Do dopisania w `ty.md` p. 25 (z raportów, poza obecnym wykazem): `RE.3-panel.png` (wąski panel Eksportu – jest),
  `SW.26-tagi.png` (ledwo widoczny przycisk usunięcia tagu), czerwony status „Brak połączenia z GitHubem…” (US, IN.23 –
  czy to nadużycie czerwieni), `DW.20-*`, `RY.21-*` (animacje zdarzeń).

### NIE DO SPRAWDZENIA – z przyczyną
| Punkt | Przyczyna | Kto dalej |
| --- | --- | --- |
| KR.1 (wariant) | „Utwórz w Dokumentach” bez OneDrive – laboratorium podstawia `FI_DEFAULT_DATA_DIR` | brak w `maszyna.md` |
| MO.22 b | na kopiach `rok` kadłub zawsze kilkadziesiąt zł pod celem – stanu „wolne do decyzji” nie da się zbudować | brak wykonawcy |
| MO.18 | z polskim głosem w Windows maszyny – NDS z założenia | maszyna (etap 1.9) |
| IM.55 (AF-30, z W3) | czas zamrożenia okna przy 30 tys. wierszy – laboratorium obciążone (100 % CPU) | brak w `maszyna.md` (pomiar) |
| IM.36 | „Przenieś plik do Kosza” – Kosz Windows użytkownika | brak w `maszyna.md` |
| DW.12 (część) | dopłata z wolnego przy pełnych warstwach – kadłub zawsze ok. 0,3 % pod celem | brak wykonawcy |
| DW.25 | persona bez zasięgu przy granicy klasy (zawsze Niszczyciel); stan nie zbudowany | brak wykonawcy |
| RY.5 (część) | Windows bez pakietu mowy | maszyna (pokrewne MO.18) |
| RY.6 | pora – Silver Bullet 16:00–17:00, sesja 11:50–12:50 | brak w `maszyna.md` (pokrewne MO.19) |
| RY.16 b | wydatek z godziną dopisany po 18:00 – wymaga zegara | brak w `maszyna.md` |
| RY.18 (część) | przełom miesiąca i 8. dzień | maszyna (etap 5, pokrewne PR.11, PM.19) |
| RE.1 (część) | powiadomienie w niedzielę po 18:00 | maszyna (pokrewne RY.10, etap 3.4) |
| US.13 (część) | wybór z podpowiedzi folderu ICTTJ – w laboratorium podpowiedź z prawdziwego `%APPDATA%` | brak wykonawcy |
| US.21 | laboratorium zeruje skrót przed startem – migracja zarejestrowałaby prawdziwy skrót | maszyna SY.14 |
| US.22 | rejestracja skrótu podstawiona („zajęty” się nie pojawi) | brak w `maszyna.md` (SY.14?) |
| US.33 b | `config.json` zablokowany przy starcie – narzędzie czyta plik przed startem | brak wykonawcy |
| IN.19 (część) | banery „inny komputer w użyciu”, migracja, konflikt, folder niedostępny – NIE WYKONANO (stany z DA) | częściowo DA |
| PM.20 | warunek „D po 7. dniu” – zegar | brak w `maszyna.md` (pokrewne PM.19) |
| LA.12 (część) | zegar | brak w `maszyna.md` (pokrewne LA.19) |
| DO.17 (część) | część zależna od zegara | brak w `maszyna.md` |
| PR.11 (część) | chwile 23:00 i 8. dnia | maszyna (etap 5.2, 5.4) |

### Poza laboratorium – 42 punkty
| Kto | Punkty (etap maszyny / pozycja `ty.md`) |
| --- | --- |
| Maszyna (30) | MO.4 (2.3, 5.2), MO.16 (2.4), MO.18 (1.9), MO.19 (2.5), SW.2 (1.7), SW.20 (2.2), OP.43 (4.3), ME.9 (3.3), IM.37 (3.2), IM.53 (3.1), SA.9 (3.1), DW.5 (2.3), RY.3 (2.4), RY.7 (6.4), RY.10 (3.4), RY.11 (5.1), RY.17 (2.1), RY.22 (5.2, dźwięk – Ty), RY.25 (6.1), US.25 (1.7), DA.16 (2.3, 3.5), PM.14 (5.3, 6.3, 6.6, 6.7), PM.19 (5.4), PM.30 (5.5), LA.19 (4.1, 4.3), DO.20 (1.8), DM.16 (3.1), RA.9 (6.2, 6.5, 6.6), PR.6 (1.10), PR.11 (5.2) – oraz punkty SY.* (instalacja, aktualizacja, zasobnik, autostart, skrót, powiadomienia, restart, odinstalowanie) |
| Ty (12) | KR.33 (p. 1), IM.56 (p. 2), DO.24 (p. 3), DA.6 (p. 4), DA.37 (p. 5), IN.12 (p. 6), US.19 (p. 7), MO.17 i RY.4 (p. 8), RE.9 (p. 12), WY.28 (p. 17), IN.25 (p. 18) |

30 punktów maszyny + 12 „Ty” = 42 (RY.22 – maszyna, część dźwiękowa – Ty; MO.17 i RY.4 – dwa punkty jednego podejścia).
Punkty SY.* są wyłącznie w maszynie (48 punktów maszyny razem z nimi) i nie wchodzą do 563.

## 5. Sprzeczności i luki wymagań – do decyzji użytkownika

Aplikacja wybiera w każdym miejscu konsekwentnie ten sam wariant. Wiersze oznaczone „(W…)” przeniosła tu weryfikacja
(WYMAGANIE – aplikacja zgodna z decyzją, oczekiwanie punktu idzie dalej). Propozycje są
wariantami do wyboru, nie rozstrzygnięciem.

| Id | Czego dotyczy (punkty) | Sprzeczność / luka | Co wybrała aplikacja | Propozycja wariantu |
| --- | --- | --- | --- | --- |
| S1 | zasięg i klasa (MO.6, MO.23, DW.24, KR.6, US.7, WY.15, PR.3, PR.4) | przykład spec „6,5 → 7,8” (zaokrąglenie) wobec T218 (obcięcie) | obcięcie T218 (7,8; 6,4) wszędzie, także w symulatorze (W4: 7,9 w symulatorze to inna wielkość – AF-33) | zostawić T218, poprawić przykład w specyfikacji |
| S2 | „miesiąc na plus” (RY.21, RE.7, PM.24, PR.8) | spec (koszty ≤ pensja) wobec T178 (wynik energii ≥ 0) | T178 – różni się VI.2026 („nie”) i X.2026 z OC („na plus” przy kosztach > pensja) | potwierdzić T178 i zmienić tekst spec albo przejść na spec |
| S3 | łupy (MO.9, OP.31, RY.19, RE.10, PM.18, PM.21) | T28 niewydana energia wobec spec „niewydane z kopert” | A – niewydana energia (803,48 wobec 916,37) | potwierdzić T28, dopisać w spec |
| S4 | wpłata domownika (IM.23 / P.3 – AF-8, MO.9, 14, 20, 21, 26, OP.29, US.7, US.12, DA.33, SW.9, SW.11, DM.*, MG.*, PR.1, 4, 7) | spec / D80 b / D91 (najpierw spłata) wobec 1.15.3 `inflowKind` (bez decyzji D) | B – „reszta jako zaliczka / przychód” nie spłaca długu (Marek 360 od 20.08 zamiast 300 od 24.09; depozyt 4 797,20); nowe wpłaty z szybkiego wpisu – A | wariant A dla „reszta jako …” (najpierw wskazane / najstarsze zakupy, reszta zaliczka albo przychód) i „niezależny przychód” jako jawna opcja; albo B ze zmianą nazwy opcji i decyzją D |
| S5 | zakup nocny „plan” (DW.13) | spec (każdy potwierdzony – poważny) wobec N-PC-19 | N-PC-19 – bez naruszenia | potwierdzić N-PC-19, poprawić spec |
| S6 | energia dziś (MO.2, 3, 5, SW.*, OP.15, RE.2, RE.12, DW.3, 6, 15, WY.1, 2, PR.4, PR.5) | spec / T30 (przydział) wobec T295 (przydział − wydane dziś); PM sp. 1 / MO sp. 5: energia dziś nie patrzy na pensję wypłaconą (0 zł) | T295 (77,28 wobec 89,28) | potwierdzić T295; nowa decyzja: energia dziś nie większa niż pozostała energia miesiąca (kandydat S) |
| S7 | Daily Bias (MO.8, MO.34, DW.15, WY.1, PM.12) | pierwszeństwo Bullish / Bearish i chwila (przed / po wydatkach dnia) | T295; Bearish pierwszy (osłony < minimum) | potwierdzić |
| S8 / S9 | ocena dni gry (DW.9, DW.17) | D73 wobec T227 przy ujemnym przydziale; koperta planowa – każdy dzień ponad limit czy dzień przekroczenia | B – dzień przekroczenia; ujemny przydział jak 0 (także w kwocie) | potwierdzić B |
| S10 | „Asteroida rozbita” (DW.30) | opłata roczna: cykl 12 czy każda okresowa | każda opłata okresowa (15.09.2026) | potwierdzić albo zawęzić do cyklu 12 |
| T129 / C18 | przeniesienie środków celu (MG.8, MG.10 – AF-4, MG.9, MG.12) | T129 „na koniec dnia” wobec T128 (stan z chwili zdarzenia), T131 i obrazu ekranu | dosłowny T129 (ekran pokazuje od razu, silnik wieczorem) | **rozstrzygnięte w weryfikacji (W1):** T129 to decyzja techniczna, a jej „koniec dnia” łamie wymagania użytkownika (spec „każdy do swojej kwoty”, D84 C1, T131) – błąd reguły, nowa T-decyzja: przeniesienie w kolejności chwili `at` (AF-4, K); do wiadomości użytkownika |
| C14 | „Portfel XTB?” przy wierszach banku bez importu (DO.3–DO.17) | T162 wobec T208 / T285 – zasięg plików | `stanOstatniWiersz` (ostatni wiersz z banku) | potwierdzić, dopisać T |
| C15 | → AF-47 | – | – | potwierdzone jako błąd (D72, T63, T162) |
| C16 | koszty miesiąca w toku (PR.2, PR.8; RE sp. 4 – przegląd roczny z przyszłą datą) | czy operacje z datą przyszłą liczą się do kosztów | liczy (142,00 wobec 102,00; grudzień „10,00 zł” w przeglądzie) | koszty „do dziś” jak w Operacjach, przyszłe osobno („zaplanowane”) |
| C20 | odkładki przy pensji 0 (PR.10 – AF-52) | T29 milczy | silnik nie pobiera rat przy pensji 0 (`fleet.ts:943-955`), plan pokazuje raty nominalne 245,83 (W5) | wybrać: rata wymagana pokazana, pobrana 0 + alarm „brak pensji”; niezależnie plan = silnik (AF-44) |
| C21 | „Razem” rozliczeń (DM.12) | suma zaokrąglonych części czy zaokrąglona całość | `razemZCzesci` (9 708,34 wobec 9 708,33) | potwierdzić (spójne z podziałem z resztą) |
| C24 | archiwizacja celu z pieniędzmi z ręcznego podziału dokowania (PR.1, krok 11) | T176 bez chwili | 250 zł zostaje w celu | **rozstrzygnięte:** błąd wyroczni (przegląd kodu wyroczni, W1 – archiwizacja z chwili obecnej zamiast z chwili dokowania, T128 / T176); odczyt `pr:38` zgodny – bez decyzji |
| R-3 | koperty planowe w miesiącu startu (KR.21) | luka – wyrocznia domknęła analogią do T45 | wydatki od 1. dnia miesiąca | potwierdzić |
| R-7 / R-8 | data „od” zaległej raty pożyczki (MO.3, MO.9, MO.15, RY.1, DO.17) | termin raty czy dzień zaległości | termin raty („spóźniona od 04.09”) | potwierdzić |
| R-9 | masa ładunku (SW.9, DW.24, LA.11, PR.7) | procent dokładny czy zaokrąglony | zaokrąglony („31,0%”) | potwierdzić |
| R-16 | mediana stopy oszczędności (WY.17, RY.21, PR.8) | ze stóp dokładnych czy zaokrąglonych | zaokrąglonych (39,3 wobec 39,4) | ze stóp dokładnych |
| R-17 | dziennik kapitański (RY.20) | kwota własna czy pełna z częścią domownika | pełna (1 060,98 wobec 760,98) | kwota własna (spójna z „sfinansowane przez domowników”) |
| R-19 | przegląd roczny przed historią (RY.23, RY.24 – AF-34, RE.10) | miesiące sprzed historii | „0,00 zł” i „31.12 roku wcześniej” | „brak historii” / „saldo otwarcia (data)” |
| T47 / D70 | propozycje kopert (KR.20, KR.21, PM.8) | kierunek zaokrąglenia „do 10 zł” | do najbliższych 10 zł | potwierdzić |
| Z6 | raty pożyczki wziętej w kosztach netto (cały przebieg) | spec ich nie wyłącza | w kosztach (średnia 6 530,87; bez rat 6 072,54) | potwierdzić albo wyłączyć (zmienia cel kadłuba i zasięg) |
| Z12 | misje minionych tygodni (DW.18, DW.26) | interpretacja progów misji | tylko tygodnie działania aplikacji | potwierdzić |
| T163 (W5) | dostawa „do zadokowania” (DO.5 – AF-46, MG.12 – AF-48, DO sp. 1, MG sp. 1, PR sp. 2) | T163 (pula dopiero z rekordem dokowania) wobec T65 | zwykła kolejność do „Zadokuj”; zwrot z puli Podatek daje alarm firewalla, −300 zł z osłon i naruszenie, które zamarza po 7 dniach | liczyć parę od razu według puli wpisu (M, zamyka AF-46 i AF-48) albo wąsko – zwrot z puli Podatek bez alarmu (S); albo pokazać kwotę „do zadokowania” osobno |
| D91 b | części wpłaty a pewne dopasowanie (DM sp. 1, 2) | „wiąże samo” przy jednej osobie i w szybkim wpisie, przy podziale na osoby – nie | „do przypisania” mimo „Pasuje: …” | wiązać samo także przy podziale |
| T28 | kolejność warstw przy wydatku ponad osłony (PR sp. 9) | T28 mówi o osłonach; aplikacja bierze energię, potem kadłub, dopiero osłony | energia → kadłub → osłony | odpowiedź wyroczni / AU-10 nie ma w źródłach – do ustalenia |
| KR.19 (W2) | propozycje ładowni (AF-13) | T286: cykle 2 / 3 / 6 mies. tylko stała kwota; harmonogram 9 z 12 miesięcy | prąd co 2 mies. o zmiennej kwocie bez propozycji; ustała subskrypcja jako harmonogram | rozpoznawać rachunek zmienny co 2 mies. i nie proponować harmonogramu, gdy brakuje terminu miesięcznego (S, waga N) |
| SW.26 (W2) | tagi i wyprawy (AF-18) | T291: `tagKey` bez wielkości liter i znaków, „-” ≠ spacja; „#słowo” nie ma spacji | „#wakacje-chorwacja” ≠ „Wakacje Chorwacja” – dwie wyprawy | „-” i „_” jak spacja w `tagKey` (S, bez migracji) |
| OP.33 (W3) | podgląd „Przesuń datę” (AF-24) | F11, T265: podgląd energii dziś, kopert bieżącego miesiąca i sald | łupy i bilans poprzedniego miesiąca bez podglądu | dodać do podglądu łupy (i koperty) miesiąca, z którego operacje wychodzą (M) |
| RA.4 (W5) | zaległa opłata z poprzedniego miesiąca (AF-50) | F1 / T208 („w bieżącym miesiącu”) wobec D86 („po terminie” 3 dni po nim) i D4 | znika 1. dnia następnego miesiąca | obok terminu bieżącego także niezapłacony poprzedni – „po terminie” do zapłaty (S–M, razem z AF-80) |
| S4 (W1) | jawny wybór „zaliczka na przyszłość” przy długu (AF-8) | jak S4 | omija dług | niezależnie od S4: opcja „reszta jako zaliczka” = spłata + reszta (błąd AF-8); decyzja tylko dla jawnej „zaliczki” – z ostrzeżeniem, gdy osoba ma dług |
| N73 / D84 C9 | rozkazy w Dowództwie (US sp. 6) | punkt US.8: „do odczytu”; aplikacja pozwala zmieniać | edycja w Dowództwie | wybrać jedno i poprawić spec albo punkt |
| model gotówki | konto Gotówka ujemne (OP sp. 7) | wypłata z bankomatu jako wydatek „Gotówka” na mBanku + zakupy gotówką jako wydatki | konto Gotówka tylko maleje (−55,36 zł) | wypłata z bankomatu jako przelew mBank → Gotówka |

## 6. Indeks spostrzeżeń spoza punktów (materiał do wniosków)

### Kandydaci na znaleziska (z proponowaną wagą, bez werdyktu NIEZGODNE)
- DO sp. 1 = MG sp. 1 = PR sp. 2 – dostawa „do zadokowania” liczona zwykłą kolejnością mimo znanej puli (S) – W5: WYMAGANIE (T163, sekcja 5).
- PM sp. 1 = MO sp. 5 – „Energia dziś 71,42 zł” przy energii miesiąca 0,00 zł (S) – S6.
- DO sp. 2 – wpis „sprzed startu” (S) – potwierdzony jako AF-47.

### Z weryfikacji (W1–W5) – AP i sprostowania
- **AP z odrzuconych:** kwoty części paragonu w eksporcie, np. arkusz „Części” (RE.5 – AF-35); ponawianie co 30 s także
  przy brakującym zapamiętanym folderze (DA.3 – AF-41, N, nakład S); jedna reguła „Wspólnie → procenty” w edytorze i
  szybkim wpisie (DM.11 – AF-49).
- **W2 (MO.11):** pole „Płatność” kontenera po zmianie nie zmienia terminu w Ładowni ani na Radarze (wygrywa historia, T208)
  – użytkownik poprawia termin i nie widzi skutku poza Mostkiem (AP: pole albo jego opis).
- **W3 (OP.25):** `asksImpulse` nie patrzy na mój udział – ta sama przyczyna w OP.26 i w OP sp. 1 (czynsz, rata, bankomat).
- **W3 (OP.33):** podglądy zmian zbiorczych pokazują część skutku – to samo co OP sp. 2 (OP.31), materiał na AP.
- **W5 (LA.8):** „Kurs przechwycenia” Nowego laptopa rośnie w kolejnych miesiącach planu (250 / 300 / 375 / 500 zł) –
  prawdopodobnie ta sama projekcja bez wcześniejszych wpłat; niesprawdzone.
- **W1 (P.1):** notatka w `docs/audyt/wykonanie.md` („nie zmieniaj `game.start` wstecz … P.1”) opiera się na złym
  mechanizmie – ograniczeniem jest zaległość zamrażania przy `FI_FREEZE_AFTER_OPEN_MS=0`.
- **W1 (IM.23):** naprawa danych – reguły importu z `inflowKind: advance` zapisane z opcji listy od 1.15.3 są nie do
  odróżnienia od jawnej „zaliczki” – meldunek zamiast cichej migracji.
- **Wyrocznia do sprostowania:** C19 / R-15 (7,8958 jest prawdziwe dla Mostka – symulator liczy inną wielkość), C24 (błąd
  wyroczni); przed użyciem wyroczni do testów regresji po grupach naprawczych – poprawić W1 i S1–S4 z przeglądu jej kodu.
- **Granica ICTTJ w weryfikacji:** W5 – 8 przebiegów z sumami SHA-256 kopii ICTTJ przed i po, bez zmian.

### Wzorce w wielu obszarach (README)
- Ciche odrzucanie i ciche skutki (SW.22–24, US.32, WY.20, RE.15, OP.8, PR sp. 6, DA sp. 6, DW sp. 5, OP sp. 4).
- Dostępność folderu tylko przy otwarciu i „Zapisano.” w folderze tylko do odczytu (DA.3, DA.40, DA.41, IN.4, DA.39, KR.29).
- „Cofnij” niespójne (IM.48, IM.13, LA.17, ME sp. 1, US.32, SW.31).
- Teksty: daty ISO, kody decyzji, angielskie komunikaty systemu, „firma”, odmiana („3 pensji”, „1 plan … zmieniona”),
  kropka „1.0”, terminy ICT bez objaśnień.
- Domownicy: plan czy impuls, cisza nocna, dwie nazwy wyboru celu wpłaty, domyślna osoba, „Pokaż zakupy” bez filtra.
- Spójność liczb między ekranami (AF-15, AF-16, AF-33, AF-57, AF-70, MO.7).

### Po obszarach (jedna linia, odsyłacz)
- **P sp. 2** – zapisy w tle (zamrożenie dni, cele ICTTJ) czekają na ruch w oknie (D86) – możliwa nieaktualna ocena dnia.
- **KR sp. 3** – kreator bez historii: energia dziś 0,00, bez kopert codziennych i bez podpowiedzi.
- **KR sp. 5** – pierwszy miesiąc „Plan przekracza pensję” od razu (koperty ze średniej 3 mies. > pensja ze średniej 6 mies.).
- **KR sp. 6** – „Przerwij kreator” bez potwierdzenia, ślady (domownicy, cele) zostają.
- **KR sp. 8** – teksty: „1.0”, „(3 pensji)”, liczba pojedyncza, toast nad „Uruchom budżet”.
- **KR sp. 9** – cele ICTTJ w kolejności listy scenariusza, nie terminów („Nowe stanowisko” od 0 zł, rata 3 000 zł/mies.).
- **KR sp. 10** – import w kreatorze: „Przyjmij pewne (25)” + ok. 50 decyzji grupowych; przed startem „Na kontach budżetu 9 670,86 zł” bez znaczenia.
- **KR sp. 11** – plik persony kończy się 26.10, kreator liczy październik jako pełny.
- **MO sp. 1** – odprawa bez hierarchii (15–24 pozycje, sprawy sprzed 8 miesięcy), odsłuch ok. 1,5 min.
- **MO sp. 2** – dublowanie sygnałów (koperta ponad limit + nieznany sygnał tej samej sprawy).
- **MO sp. 3 / DW sp. 4** – kadłub nigdy pełny bez dostawy (cel rośnie ze średnimi) – „wolne do decyzji” prawie nieosiągalne, dopłata do XTB zawsze łamie firewall.
- **MO sp. 4** – zmiana celów warstw bez podglądu skutku („Osłony 0,00 / 6 500”).
- **MO sp. 6** – zwrot dawnego zakupu podnosi energię dziś.
- **MO sp. 7** – odsłuch: niespójne czytanie kwot, przy ukrytych kwotach zdanie o energii znika, czytane „→”, nazwy plików.
- **MO sp. 8** – dymek „Daily Bias (spec, Wywiad)” – tekst roboczy.
- **MO sp. 9** – odłączona Odprawa zabiera energię dziś z głównego okna.
- **SW sp. 3 / DM sp. 3** – domownik „pytaj” nie jest pytany (przełącznik od razu na „przychód”).
- **SW sp. 5** – tagi z „#” niewidoczne przed zapisem; przycisk usunięcia ledwo widoczny.
- **SW sp. 6** – „plan czy impuls” na dole formularza – 10 × Tab; klawisz P / I skróciłby wpis z 21 do 12 klawiszy.
- **SW sp. 7 / WY sp. 7** – kontrahenci bez aliasów („Mokka” / „KAWIARNIA MOKKA”), nazwy z banku wielkimi literami.
- **SW sp. 8** – ostatnio użyte konto pamięta komputer, nie folder.
- **SW sp. 9** – spłata salda na start: Mostek, Radar i Meldunki sobie przeczą („wskaż zakupy”, których nie ma).
- **SW sp. 10** – „Koperta X: bez limitu w tym miesiącu” nie mówi o energii miesiąca.
- **SW sp. 11** – dziennik kapitański w Wywiadzie bez treści wpisu.
- **OP sp. 1** – „plan czy impuls?” przy czynszu, ratach ładowni i bankomacie.
- **OP sp. 2** – podglądy zmian zbiorczych pokazują część skutku (łupy, cele, „wpis ICTTJ straci parę”).
- **OP sp. 4** – ciche limity długości (notatka 5000, dziennik 2000, tag 40, kontrahent 300).
- **OP sp. 8** – edytor: 7 × Tab od kwoty do kategorii; „Nowa” aktywna w folderze tylko do odczytu; „+ Zapisz widok” tylko z filtrem.
- **OP sp. 9** – okres listy niepamiętany po ponownym uruchomieniu.
- **OP sp. 10 / WY.13** – nazwa z banku z dopiskiem „DATA TRANSAKCJI” jako kontrahent.
- **ME sp. 1** – „to nie powtórzenie” bez toastu i „Cofnij”.
- **ME sp. 2** – para przelewów po samej kwocie i dniu zaznaczona domyślnie.
- **ME sp. 3** – folder przed kreatorem dostaje zadania z dawnej historii.
- **ME sp. 4** – „Połącz” / „Dopisz drugą stronę” bez podglądu przy pojedynczym przelewie, z oknem przy parach.
- **IM sp. 2** – konto importu „klei się” do poprzedniego pliku – wybór po numerze rachunku zamknąłby IM.38 / IM.39.
- **IM sp. 4** – dwie nazwy jednego wyboru celu wpłaty (źródło P.3); „wskaż zakupy” przy jednym zakupie.
- **IM sp. 5** – temat podpowiedzi łączy różne kategorie banku.
- **IM sp. 6** – „Połącz nazwy (N)” dla dowolnych grup (wpływ + wydatek).
- **IM sp. 7** – komunikat odrzuconego pliku tylko w dymku; w panelu poprzedni błąd.
- **IM sp. 8** – „rozliczone inaczej” pokazuje rozliczenia bez zmiany („−23,50 → −23,50”).
- **IM sp. 9** – wyszukiwarka importu nie szuka po rodzaju operacji („bankomat”).
- **IM sp. 10** – „Przenieś plik do Kosza” bez potwierdzenia.
- **IM sp. 11** – import 2000 operacji 31–43 s (do pomiaru w maszynie).
- **IM sp. 12** – jedna ścieżka dopasowania „ta sama operacja z listy i z historii” zamknęłaby AF-1 i AF-9.
- **SA sp. 2** – wpisane „Saldo w banku teraz” znika po zmianie ekranu (nie jest szkicem).
- **SA sp. 3** – podwójne korekty wykrywane tylko z dwóch komputerów.
- **DW sp. 1** – import po zamrożeniu: oceny dni bez historii banku zostają („darmowy awans”), brak ostrzeżenia.
- **DW sp. 2** – panel misji przed pierwszym zamrożeniem z datą z przeszłości.
- **DW sp. 3** – „Dziś na razie” nie odróżnia poważnych naruszeń; alarm minimum osłon żółty, choć poważny.
- **DW sp. 6** – ekran „Nowa klasa” świętuje skutek importu.
- **DW sp. 7** – nazwa kontenera ucięta do 80 znaków bez informacji.
- **WY sp. 1** – dwie „Twoje killzone” naraz (misja wt 20–21, Wywiad pt 19–20).
- **WY sp. 2** – słowniczek bez terminów ICT (lista 13 terminów) – druga część „Terminy ICT”.
- **WY sp. 3** – „wyczyść manewr” nie czyści terminu, celu ani „rata z pensji”; brak komunikatu złego terminu.
- **WY sp. 4** – dwie sumy w Operacjach po drążeniu („Wydatki” / „Koszty”).
- **WY sp. 5** – FVG przy ukrytych kwotach zachowuje kolor i znak; Porównanie bez wzrostu od zera; Prognoza z paskiem „0,00”.
- **WY sp. 6** – typografia liczb: łącznik w procentach („-6,2%”), minus w kwotach; stopa raz z miejscem po przecinku.
- **RY sp. 1** – „Dziś bez wydatków” przy wydatku z dziś zapisuje bez ostrzeżenia.
- **RY sp. 2** – dwie definicje „bieżącego” tygodnia w raporcie wachty.
- **RY sp. 3** – rozkład łupów po późnym imporcie zmienia się bez słowa w Debriefingu.
- **RY sp. 4** – odprawa poranna dopiero przy ruchu, inne powiadomienia od razu po ciszy.
- **RY sp. 5** – „Siła floty netto … bez długu” myli; „Rower” (osiągnięty, zarchiwizowany) poza „Cele osiągnięte”.
- **RY sp. 6** – debriefing miesiąca w toku z czerwonym bilansem po 3 dniach.
- **RY sp. 7** – Daily Bias w Raportach bez strzałki i koloru.
- **RE sp. 1** – okres eksportu niepamiętany.
- **RE sp. 5** – eksport 0 wierszy z toastem „Zapisano” – bez „Brak operacji w okresie”.
- **RE sp. 6** – nazwa kategorii > 40 znaków w `fi.json` kasowana po cichu (błąd przygotowania).
- **US sp. 1 / IN sp. 5** – 10 powiadomień Windows naraz przy starcie; „Nieznany sygnał…” skleja nazwę z kwotą.
- **US sp. 3 / IN sp. 6** – „(3 pensji)”, „1.0”, wartość spoza zakresu „Kadłub – cel” wraca bez słowa.
- **US sp. 8** – „Usuń token” / „Zapisz i sprawdź” bez słowa „zapisano”.
- **US sp. 9 / IN sp. 7** – czerwony status sieci (czerwień dla kwot i alarmów).
- **IN sp. 1** – „Synchronizacja” bez skrótu w menu, Meldunki z licznikiem zamiast skrótu.
- **IN sp. 2** – fokus ginie po „Usuń na pewno” i po zamknięciu palety.
- **IN sp. 3** – Ctrl+N przy filtrze zeruje szukanie bez słowa.
- **IN sp. 4** – szkic Ctrl+N widoczny na liście przy szukaniu, które go nie obejmuje.
- **IN sp. 8** – dwa wzorce potwierdzenia (inline „Usuń na pewno” i okno z „Anuluj”).
- **DA sp. 2** – surowe komunikaty systemu po angielsku (ENOENT, EBUSY, ZIP, JSON, zod).
- **DA sp. 3** – konflikty i różnice nieczytelne (nazwy plików z ULID, surowe klucze, JSON, „ODRZUCONA PRZY SCALANIU”).
- **DA sp. 4** – pytanie „Zmienić operację?” nieznane zamknięciu, zmianie ekranu i folderu (przyczyna AF-3).
- **DA sp. 5** – rotacje bez informacji: ręczne kopie (5), paczki importu (10 – „Cofnij import” przepada), lista kopii po zmianie folderu, „Weź ustawienia z historii”.
- **DA sp. 6** – „USZKODZONY” dla zablokowanego; nazwa kopii odzyskania inna niż zapowiedź; „12,345” odrzucane bez słowa; aktywne przyciski w folderze tylko do odczytu.
- **PM sp. 2** – „Kurs przechwycenia” znika w bieżącym miesiącu przy niepełnych osłonach bez słowa.
- **PM sp. 3** – „+ łupy” w bloku „Koperty codzienne” bez podpisu, że nie wchodzi do „Rozdzielone”.
- **PM sp. 4 / MG sp. 7** – debriefing ostatniego zamkniętego miesiąca na stronach przyszłych miesięcy.
- **PM sp. 5** – propozycja pensji znika, gdy plan jej równy – średnich kosztów nie widać.
- **PM sp. 6** – „Pokryj z koperty…” domyślnie z codziennej o największym zapasie – obniża energię dziś bez słowa.
- **PM sp. 7** – powiadomienie „ponad 80%” po „przekroczona” (kolejność wstecz).
- **PM sp. 9** – pożyczki wypełniają osłony, dostawa XTB „wypycha” do celów (zgodne z T31, do wniosków).
- **PM sp. 11** – zmiana koperty na codzienną przenosi zapas z łupów do puli dziennej.
- **PM sp. 12** – pokrycia kopert nie w Raporcie wachty.
- **LA sp. 2** – „rata wyrównawcza” w dymkach także dla zwykłej ostatniej raty.
- **LA sp. 3** – rozpoznanie harmonogramu proponuje przypadkowe zakupy (Orlen sty / kwi / gru).
- **LA sp. 4** – nowy kontener z płatnością = dziś bierze całą kwotę z energii bieżącego miesiąca.
- **LA sp. 5** – alarm „Za mało w zbiorniku” tylko w odprawie, nie w debriefingu.
- **LA sp. 6** – po zaległej zapłacie zbiornik bierze 180 zł naraz.
- **LA sp. 7** – „Zrzuć z ładowni” zostawia masę miesiąca bez zmian bez słowa (T136).
- **LA sp. 8** – pole „Płatność” kontenera miesięcznego z datą sprzed roku.
- **DO sp. 3** – „FI czeka na import do 30.10.2026” w dniu 03.11.
- **DO sp. 4** – propozycja okna liczy warstwy na dzień wpływu, bez słowa.
- **DO sp. 5** – toasty dokowania: „Zadokowano” przy zmianie podziału, zła kwota przy rozbieżności.
- **DO sp. 6** – „firewall” przy dopłacie zgodnej z rozkazem.
- **DO sp. 7** – „Pominięte pliki ICTTJ” obejmuje plik „bonus”, ścieżka starszego pliku w ostrzeżeniu.
- **DO sp. 9** – folder bez `journal.json`: status zostaje „CZYTANY” (opis punktu DO.21 do poprawy).
- **DO sp. 10** – „OneDrive może się jeszcze nie uruchomił” – błąd gramatyczny.
- **DO sp. 11** – pierwszy wybór folderu ICTTJ: powiadomienie o starych wpisach.
- **DO sp. 12** – dopłata wykryta tylko z mBanku bez kroku potwierdzenia.
- **DO sp. 13** – ICTTJ wyłączony: zadokowane dostawy znikają z panelu „Dokowanie”.
- **MG sp. 2** – panel „Tempo” bez części (pula Cele / reszta).
- **MG sp. 4** – przeniesienie do celu już pełnego bez ostrzeżenia.
- **MG sp. 5** – „Rower” persony bez historii `past` (dane persony).
- **MG sp. 6** – wpłata Marka z `covers` nie spłaca EVENTIM (S4).
- **DM sp. 4** – zaliczka z wpłaty od razu na późniejszy zakup – edytor nie mówi, dokąd poszła.
- **DM sp. 6** – zwrot towaru do zakupu oddanego zmniejsza inny dług jako „zwrot do przypisania”; etykieta „Zwrot dla – finansuje”.
- **DM sp. 7** – dopisek „zmieni przychód zamkniętego miesiąca” tylko przy części wpłat.
- **DM sp. 8** – „Pożyczam komuś” bez „Do spłaty razem” – odsetek nie da się zapisać (przyczyna AF-5).
- **DM sp. 9** – wpłata domownika nie zmienia linku „ostatnia dostawa”.
- **DM sp. 11** – powiadomienie „Rozliczenie z domownikiem” – ponawianie do maszyny (DM.16).
- **RA sp. 1** – boja zamyka się operacją o tej samej kwocie i innej nazwie (ZALANDO → „Przegląd komina”) bez słowa.
- **RA sp. 2** – na osi „01.11 CityFit” bez „czeka na import” / „po terminie”.
- **RA sp. 4** – „Pozostałe boje” sprzed 30 dni z dawną datą bez opisu stanu.
- **PR sp. 3** – przykład w specyfikacji „6,5 → 7,8” do poprawy (T218 – S1).
- **PR sp. 4 / MO.33** – dymki metafor tylko przy części linii „Stanu okrętu”.
- **PR sp. 5** – eksport „Miesiące” bez „Energia miesiąca” i „Sfinansowane przez domowników”.
- **PR sp. 6** – ciche odrzucenie „12,345”, „1.200”, liczby rat „2,5” w szybkim wpisie i kontenerze.
- **PR sp. 8** – symulator: „Osłony pełne 12.2026 12.2026” przy osłonach już ponad celem, „— —” przy dokładnie pełnej.

### Metoda i laboratorium – uwagi
- Wyrocznia czytała jako jedyny wyjątek schematy `src/shared/schema` – wczytało to `.claude/rules/silnik.md` (niezmienniki,
  bez wzorów); następnym razem kopia schematów spoza `src/` (`wyrocznia.md`).
- Uzgodnienie wyroczni: A–B – 9 poprawek wyroczni, 3 błędy aplikacji, 7 luk; C – 14 poprawek, 3 błędy aplikacji, 4 luki.
- CI gałęzi audytu czerwone od AU-2 (typecheck skryptów laboratorium, dwa E2E z datami z października – `recover`,
  `repayments`) – według historii gałęzi poprawione w commitach 5c6d304 i 6f19d5e (nie z powodu aplikacji 1.15.4).
