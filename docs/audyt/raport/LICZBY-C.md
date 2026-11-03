# Raport audytu – LICZBY-C (liczby z ekranów bloku C wobec wyroczni)

- Data: 03.11.2026; wersja 1.15.4 z GitHub Releases (laboratorium `C:\FI-audyt`).
- Wyrocznia: `tests/audyt/wyrocznia/wyrocznia.mjs` w wersji **„2026-11-03 u2”** – po uzgodnieniu bloków A–B (u1) i bloku C
  (u2: `C:\FI-audyt\wyrocznia\rozbieznosci-c.md` → `odpowiedzi-c.md`); poprawki: `docs/audyt/wyrocznia.md`, „Poprawki po
  uzgodnieniu”. Wszystkie porównania bloku C liczone na u1 i od nowa na u2.
- Materiał: odczyty `C:\FI-audyt\odczyty\{pm,la,do,dm,pr,mg,ra}.jsonl` (440: PM 64, LA 37, DO 84, DM 72, PR 102, MG 55, RA 26),
  każdy z migawką folderu danych i ICTTJ (`C:\FI-audyt\migawki\<obszar>\<punkt>-<n>`). Dla każdego odczytu wyrocznia na jego
  migawce w chwili odczytu (`C:\FI-audyt\wyrocznia\pc\json\<plik>-<linia>.json`). Porównywacze i wyniki odczyt po odczycie:
  `C:\FI-audyt\wyrocznia\pc\` (`porownaj.mjs`, `radar.mjs`, `okna.mjs`, `dokstan.mjs`, `wynik\klasyfikacja-u2.tsv`,
  `wynik\<plik>.jsonl`, `wynik\radar.txt`); wielkości spoza JSON wyroczni (wariant S4-B przychodów, inne miesiące, dni gry
  A / B) – funkcjami wyroczni bez zmian (`pc\plus.mjs`, `pc\gra-b.mjs`). Raporty obszarów bloku C bez zmian – werdykty
  liczb są tutaj.

## Podsumowanie

**11 punktów „LICZBY → AU-9”** (PM.1, PM.5, PM.18, LA.11, PR.1, PR.2, PR.4, PR.5, PR.7, PR.8, MG.5):
**ZGODNE 2 · NIEZGODNE 1 (K 0 / S 0 / N 1) · SPRZECZNOŚĆ WYMAGAŃ 8 · NIEPORÓWNYWALNE 0**.

- Żadna kwota pieniędzy nie jest zła (K brak). Po u2 wszystkie kwoty tych punktów – warstwy i suma kont, salda, energia
  i przydział, plan miesiąca, przychody, łupy, cele warstw, koszty netto, rozbicia, dostawy, Radar, debriefingi, tempo i ETA
  celów – są równe wyroczni albo jednemu z jej wariantów.
- Jedyne NIEZGODNE wśród 11: PR.8 – format stopy oszczędności w eksporcie („55” zamiast „55,0” – R-18 z bloków A–B, N).
- Poza tymi 11 punktami wyrocznia potwierdziła błąd aplikacji w czterech punktach ocenianych przez wykonawców:
  - DO.1 / DO.2 – stan wpisu „sprzed startu”, kandydat S (C15);
  - LA.8 – plan rat na przyszłe miesiące, S (C17);
  - PR.3 – symulator zasięgu, S (C19);
  - PR.3 – format stopy w przeglądzie rocznym, N (C25).
- Do AU-11 zostają dwie sprawy:
  - C18 – MG.8 / MG.10: wyrocznia z dosłownym T129 liczy tak samo jak aplikacja (sekcja niżej);
  - C24 – podział dokowania przy celu zarchiwizowanym później: wyrocznia u2 różni się o 250 zł; ocena – prawdopodobnie błąd
    wyroczni.
- Sprzeczności wymagań – aplikacja wybiera stale:
  - S1 – obcięcie zasięgu (poza symulatorem);
  - S2 – T178;
  - S3 – A (łupy z energii);
  - S4 – B (`inflowKind` 1.15.3 – decyzja użytkownika, jak w LICZBY-AB);
  - S6 / S7 – T295;
  - luki z wariantami w JSON: masa ładunku zaokrąglona, termin raty w dacie zaległości, `stanOstatniWiersz`,
    `kosztyNettoZPrzyszlymi`, `razemZCzesci`, propozycje kopert do najbliższych 10 zł.
- Odczyty (440): ZGODNY 182 · ROZBIEŻNY 8 · SPRZECZNOŚĆ 239 · NIEPORÓWNYWALNY 4 · BRAK w wyroczni 7 (porównane 429).

| plik | odczyty | ZGODNY | ROZBIEŻNY | SPRZECZNOŚĆ | NIEPORÓWNYWALNY | BRAK |
| --- | --- | --- | --- | --- | --- | --- |
| pm | 64 | 45 | 0 | 14 | 1 | 4 |
| la | 37 | 20 | 1 | 13 | 1 | 2 |
| do | 84 | 23 | 2 | 58 | 1 | 0 |
| dm | 72 | 5 | 0 | 67 | 0 | 0 |
| pr | 102 | 58 | 5 | 39 | 0 | 0 |
| mg | 55 | 11 | 0 | 43 | 1 | 0 |
| ra | 26 | 20 | 0 | 5 | 0 | 1 |
| **razem** | **440** | **182** | **8** | **239** | **4** | **7** |

Klasy odczytów:
- ROZBIEŻNY – co najmniej jedna liczba różna od wyroczni (u2) i od jej wariantów.
- SPRZECZNOŚĆ – wszystkie liczby równe, co najmniej jedna zależy od S… albo od luki z wariantem w JSON.
- NIEPORÓWNYWALNY – migawka z innej chwili niż ekran albo ustawienie komputera, którego wyrocznia nie zna.
- BRAK – wielkość, której wyrocznia nie liczy.

Rozbieżne odczyty po u2:
- do.jsonl:1 i 9 – C15;
- la.jsonl:37 – C17;
- pr.jsonl:80 – C19;
- pr.jsonl:86 – C20, luka;
- pr.jsonl:38 – C24;
- pr.jsonl:3 i 25 – C25.

**Rozbieżności z etapu 1 i odpowiedzi wyroczni:**
- POPRAWIONE (błąd wyroczni): C1–C13 i C23. C6, C10, C22 i C23 były „brak w wyroczni” – teraz są policzone.
- POTWIERDZONE (błąd aplikacji): C15, C17, C19.
- LUKA (warianty dopisane do JSON, aplikacja = jeden z nich): C14, C16, C21; C20 – luka, przy której liczby się różnią.
- Informacyjnie: C18.
- Po przeliczeniu na u2 dwie nowe pozycje: C24 (do AU-11) i C25 (= R-18).

## Punkty LICZBY → AU-9 – werdykty liczb

| Punkt | Werdykt liczb | Uzasadnienie | Odczyty |
| --- | --- | --- | --- |
| PM.1 | ZGODNE | „Wypłacono: 6 500,00 zł” z osłon, „Cel osłon: 19 500,00 zł (pensje × 3)”, „Osłony 13 000,00 / 19 500,00”, „Energia 6 204,63 zł” (6 216,63 − 12,00) = wyrocznia. W tym samym odczycie: cele i depozyt – S4-B, masa „31,0%” – R-9, energia dziś 77,28 – S6 / T295 | pm:1 |
| PM.5 | ZGODNE | 12 liczb przychodów: praca 7 500,00 ×4; trading 2 000,00 / 2 166,67 / 1 958,33 / 2 250,00; razem 9 500,00 / 9 666,67 / 9 458,33 / 9 750,00 = wyrocznia; bez zmian przy wpływie z bieżącego miesiąca i starej pożyczce (pm-3) | pm:2, 5, 42 |
| PM.18 | SPRZECZNOŚĆ WYMAGAŃ – S3 (aplikacja = A) i S4 (B) | „Do podziału: 803,48 zł” = niewydana energia (S3-A; z kopert byłoby 916,37); po decyzji osłony 13 653,48, „+ łupy … 100,00”, podstawowy 86,66 = wyrocznia; cele 8 138,96 → 8 188,96 – S4-B (A: 8 198,96 → 8 248,96) | pm:10, 11, 12 |
| LA.11 | SPRZECZNOŚĆ WYMAGAŃ – R-9 i S4 | symulacja „35,5% → 34,7%” (zaokrąglona – R-9) i „2 306,24 → 2 256,24 zł” = wyrocznia u2; zasięg 7,7 → 7,8; resztka OC motocykla (B2): osłony 13 000,00, kadłub 40 116,30, cele 4 728,96 (S4-B), energia, zbiorniki, odkładki = wyrocznia (po C2 i C3) | la:13, 16, 17, 18 |
| PR.1 | SPRZECZNOŚĆ WYMAGAŃ – S4 (B) | warstwy, „Suma kont budżetu”, salda w 37 odczytach = wyrocznia (rok: 13 000,00 · 6 204,63 · 39 066,30 · 8 138,96 S4-B · 1 600,00 · depozyt 4 797,20 S4-B · łupy 803,48 · 73 610,57; ciąg pr-3b z podziałem z puli Podatek – po C1; start, spec-dok, brzegi, 11,96 / 6,00). Wyjątek pr:38 (krok 11, archiwizacja celu) – C24, do AU-11 | pr:1, 5–9, 11–17, 26–30, 32–39, 43, 47, 48, 52, 56, 60, 64, 68, 72, 76, 92 |
| PR.2 | SPRZECZNOŚĆ WYMAGAŃ – luka C16 | cele osłon / kadłuba / minimum, „Koszty miesiąca (średnia z 12 mies.) 6 530,87”, koszty przyjęte, „wolne do decyzji” w brzegach = wyrocznia; 14 miesięcy kosztów netto co do grosza; listopad „142,00 zł” = `biezacyMiesiac.kosztyNettoZPrzyszlymi` (z wydatkiem z 10.11; bez niego 102,00) | pr:24, 40, 44, 49, 53, 57, 61, 65, 69, 73, 77, 93 |
| PR.4 | SPRZECZNOŚĆ WYMAGAŃ – S6 (T295), S4 (B) | rozbicie energii (2 500 / 0 / 28 dni / 83,33 / 5,95 / 89,28 / −12,00 / 77,28), zasięgu (51 566,30 / 6 530,87 = 7,8), celów, dostawy z puli Podatek („600 · 50 · 100 · 250” – po C1), spec-dok „3 360 · 1 640” = wyrocznia; dostawa 20.10 „Nowy laptop 861,04 · Wakacje 2 138,96” – S4-B | pr:2, 10, 31, 42, 46, 51, 55, 59, 63, 67, 71, 75, 79, 95 |
| PR.5 | SPRZECZNOŚĆ WYMAGAŃ – S6 (aplikacja = T295) | energia dziś 77,28 → 52,28 → 51,21 (wczoraj: przydział 88,21) → 51,21 (przyszła data, bez koperty, Dom) i energia miesiąca 6 149,63 / 6 134,63 / 6 114,63 = wyrocznia | pr:18–23 |
| PR.7 | SPRZECZNOŚĆ WYMAGAŃ – S4 (B), R-9 | pary równe między ekranami i z wyrocznią: osłony 13 000,00, Radar 13 500,00 / 13 200,00 / 6 700,00, cele 8 138,96 (S4-B), masa 2 014,32 / „31,0%” (R-9), dług 500,00, należności 360,00 (S4-B) / 1 000,00, przychody, energia 6 204,63, zbiorniki 1 600,00 | pr:102 |
| PR.8 | NIEZGODNE (N) | debriefing X, Raporty X / XI / IX.25 i 15 wierszy eksportu = wyrocznia (S2 = T178: VI.2026 „nie”; S3 – A; mediana 28,4 %; dziennik X 2 · 522,46 / 3 · 744,82; Dowództwo X 22 / 9). Stopa 2025-10 „55” zamiast „55,0” (R-18, C25); listopad 142,00 – luka C16 | pr:4, 25 |
| MG.5 | SPRZECZNOŚĆ WYMAGAŃ – S4 (B) | tempo 1 356,49 (pula Cele 750,00 + reszta 606,49) = S4-B (A: 1 366,49); ETA: Wakacje IX 2027, Wkład własny IX 2029 po terminie, Nowe stanowisko XII 2029 po terminie (B; A: XI 2029); mg-2 1 606,49 przed i po dokowaniu (B); start „—”; od zera 0,00 / „ETA —” = wyrocznia u2 (`p4.tempoCelow`) | mg:1, 25, 49, 50 |

## NIEZGODNE – punkty LICZBY

### PR.8 – NIEZGODNE (N)
- Stan: rok + wpisy PR.5 w listopadzie (przebieg `pr-2`), 2026-11-03 15:45; migawka `C:\FI-audyt\migawki\pr\PR.8-2`.
- Zrobione: Ctrl+$ → Raporty → Eksport → „Miesiące – CSV” od 01.08.2025 (`C:\FI-audyt\eksport\pr-2-miesiace-od-2025-08.csv`).
- Widać: „2025-10;6500,00;5175,34;11500,00;tak;745,84;6324,66;55” (inne wiersze z jednym miejscem: „25,7”, „52,9”).
- Oczekiwane: stopa 6 324,66 / 11 500 = 54,997 % → „55,0” (T294 – jedno miejsce po przecinku). Reszta 16 wierszy = wyrocznia u2:
  pensja, koszty netto, przychody, „na plus” (S2 – T178: VI.2026 „nie”), łupy (S3 – A), bilans. Listopad „142,00” =
  `biezacyMiesiac.kosztyNettoZPrzyszlymi` (luka C16).
- Odpowiedź wyroczni: R-18 POTWIERDZONE w rundzie A–B (ten sam plik CSV, waga minimalna) – tu C25, bez nowej rundy.
- Plik: `C:\FI-audyt\eksport\pr-2-miesiace-od-2025-08.csv`.

## Rozbieżności w punktach ocenionych przez wykonawców

Pozycje C-n z `C:\FI-audyt\wyrocznia\rozbieznosci-c.md`, odpowiedzi z `odpowiedzi-c.md` (u2). Werdykty wykonawców bez zmian.

| C | Punkty (werdykt wykonawcy) | Rozbieżność (aplikacja / wyrocznia u1) | Odpowiedź wyroczni (u2) |
| --- | --- | --- | --- |
| C1 | PR.1, PR.4, DO.4, DO.5, DO.17 (ZGODNE) | podział z puli Podatek: PIT 600 + osłony 50 + kadłub 100 + cel 250 / całość 1 000 do PIT | POPRAWIONE (T224) – = aplikacja |
| C2 | LA.3, LA.4, LA.8, LA.9, LA.10, LA.11 | Wywóz śmieci zapłacony 22.10 przed terminem 20.11: rata M0 0 / 240 | POPRAWIONE (T135) – = aplikacja |
| C3 | PR.9, PR.3, LA.4, LA.11 | masa 2 117,65 / 2 117,66 (część w groszach) | POPRAWIONE (T3) – = aplikacja |
| C4 | PM.11 (ZGODNE) | zapas z łupów w kategorii codziennej: 101,66 / 95,00 | POPRAWIONE (T278) – = aplikacja |
| C5 | PM.23 (ZGODNE) | debriefing IX: energia 6 304,17 / 6 254,17 | POPRAWIONE (T178) – = aplikacja |
| C6 | PM.13, PM.16, PM.17 (ZGODNE) | pokrycia kopert: 82,83 / 83,33 | POPRAWIONE (T279, F28) – = aplikacja |
| C7 | PM.2, PM.3, PM.15 (ZGODNE) | koszty przy 1 pełnym miesiącu: 4 000 / „—” | POPRAWIONE (T27 „jeśli ustawione”) – = aplikacja |
| C8 | LA.10, RA.1, RA.3, RA.7, RA.11, RA.14 (ZGODNE) | Radar – zapłata terminu opłaty okresowej (Woda 14.11, Wywóz 20.11) | POPRAWIONE (T135) – = aplikacja |
| C9 | RA.11 (ZGODNE) | boja-wpływ: osłony 19 500 / 28 080,04 | POPRAWIONE (chwila liczenia, Z14) – = aplikacja |
| C10 | RA.1, RA.5, RA.6, RA.7, RA.11, RA.13, RA.14, PR.9 | boje po terminie, zwrot po terminie, koniec kontenera – brak w wyroczni | POPRAWIONE (T273, T289, T274) – = aplikacja |
| C11 | DM.10 (UWAGA) | część wpłaty ponad kwotę: osłony 13 000 / 12 970 | POPRAWIONE (T117) – = aplikacja |
| C12 | MG.2, MG.3 | cel ICTTJ bez kwoty: Rezerwa 1 000 / 0 | POPRAWIONE (T226) – = aplikacja |
| C13 | DO.4 (ZGODNE) | przychód z niezadokowanej pary z puli Podatek: 13 500 / 11 500 | POPRAWIONE (T163, T119) – = aplikacja |
| C14 | DO.3–DO.17 (ZGODNE) | „Portfel XTB?” wobec „czeka na import” (wiersze banku bez importu) | LUKA – aplikacja = `stanOstatniWiersz` |
| C15 | DO.1, DO.2 (ZGODNE; Spostrzeżenia 2 – kandydat S) | wpis 03.11 przy starcie 01.11 bez pary: „sprzed startu” / „czeka na import” | **POTWIERDZONE – błąd aplikacji** (D72, T63, T162) |
| C16 | PR.2, PR.8 (ZGODNE) | koszty XI z wydatkiem z datą przyszłą: 142,00 / 102,00 | LUKA – aplikacja = `kosztyNettoZPrzyszlymi` |
| C17 | LA.8 (NIEZGODNE S) | plan XII–II nowej opłaty rocznej: 75,00 / 225,00 | **POTWIERDZONE – błąd aplikacji** (T29) |
| C18 | MG.8, MG.10 (NIEZGODNE K), MG.9, MG.12 | wyrocznia z T129 = aplikacja | informacyjnie – sekcja niżej |
| C19 | PR.3 (NIEZGODNE S) | symulator manewrów 7,9 / 7,8 | **POTWIERDZONE – błąd aplikacji** (T71, T218, T282) |
| C20 | PR.10 (NIEZGODNE S) | pensja 0: przydział 80,64 = wyrocznia; odkładki 245,83 / 0,00 | LUKA (T29 milczy; `planowana`) |
| C21 | DM.12 (ZGODNE) | „Razem” 9 708,34 / 9 708,33 | LUKA (N) – aplikacja = `razemZCzesci` |
| C22 | MG.5 (LICZBY), MG.7 | tempo i ETA – brak w wyroczni | POLICZONE – = aplikacja w wariancie S4-B |
| C23 | DM.7, DM.8 (ZGODNE) | wpłata przypisana późniejszemu zakupowi (D94) | POPRAWIONE (D94, T312) – = aplikacja |
| C24 | PR.1 (ZGODNE) – nowa w u2 | archiwizacja celu, któremu dokowanie z ręcznym podziałem dało 250 zł: aplikacja zostawia je w celu (osłony 15 739,00, cele 9 418,96), wyrocznia u2 przenosi do osłon (15 989,00 / 9 168,96, S4-B) | bez rundy; ocena: prawdopodobnie błąd wyroczni (u2 bierze dzisiejsze `archived` zamiast stanu celu z chwili dokowania – T128 / T129), T176 bez chwili – **do AU-11** |
| C25 | PR.3 (NIEZGODNE S), PR.8 – nowa w u2 | stopa „33%” w przeglądzie 2026, „55” w CSV (kwoty zgodne) | = R-18 POTWIERDZONE w rundzie A–B (błąd aplikacji, N) |

Liczby w pozostałych punktach bloku C (PM, LA, DO, DM, MG, RA) – zgodne z wyrocznią u2 albo z jej wariantem. Odczyty
rozbieżne: `pc\wynik\klasyfikacja-u2.tsv`.

## C18 – MG.8 / MG.10: przeniesienie środków celu „na koniec dnia” (do oceny wagi K w AU-11)

- Wykonawca MG ocenił MG.8 i MG.10 jako NIEZGODNE (K). Przyczyna: przeniesienie środków między celami silnik wykonuje na
  koniec dnia, a Mapa i Mostek pokazują je od razu.
- Wyrocznia u1 i u2 liczy dosłownie T129 („silnik na koniec dnia przenosi `min(kwota, stan)`”) i daje **te same liczby co
  aplikacja** we wszystkich 21 odczytach (mg:28–48):
  - dostawa 9 000 zł (`mg-6`): okno „Osłony 6 500,00 · Kadłub 118,92 · Rower 2 381,08” = podział wyroczni, po dokowaniu
    „Rower 4 081,08 zł” przy celu 2 500, „Nowy laptop 3 500,00” bez dostawy;
  - MG.10 `mg-5`: „Rower 700,00 → 700,00”, osłony 21 300,00 → 20 400,00;
  - MG.10 `mg-6`: „Rower 700,00 → 300,00”, osłony 23 681,08 → 23 181,08;
  - `mg-1` (pieniądze z dostawy, nie z przeniesienia): Rower 700 → 0, osłony −200.
- Wyrocznia z chwilą 04.11 na tych migawkach: Rower 4 081,08 / 300,00 / 700,00 – skutek trwały.
- Argument za wariantem „przeniesienie w chwili zapisu `at`” (opisany w odpowiedzi wyroczni, niepoliczony):
  - T129 zapisuje przeniesienie z chwilą `at`;
  - T128 każe liczyć cele w stanie z chwili zdarzenia;
  - T131 („wydatek z celu płaci tyle, ile cel ma”) przy przeniesieniu na koniec dnia pozwala wydać z celu pieniądze, które
    użytkownik już przeniósł;
  - ekran pokazuje przeniesienie od razu, więc ekran i silnik różnią się przez cały dzień.
  
  W tym wariancie dostawa 9 000 zł dałaby Rowerowi 800 zł (do celu 2 500), a Nowemu laptopowi 1 581,08 zł; wydatek 900 zł
  wziąłby z celu 700 zł, a z osłon 200 zł. Wyrocznia go nie liczy – kolejność przeniesienia względem operacji dnia
  wymagałaby godzin, a operacje z banku ich nie mają.
- Do AU-11: aplikacja = wymaganie T129 w brzmieniu dosłownym. Czy to K, rozstrzyga wybór reguły (T129 „na koniec dnia”
  wobec T128 / T131 i obrazu ekranu), a nie błąd liczenia.

## Sprzeczności wymagań – co wybrała aplikacja

| Id | Aplikacja | Przykłady (blok C) |
| --- | --- | --- |
| S1 zasięg | obcięcie T218 – 190 paneli spójnych; poza symulatorem (7,9 – C19) | PR.3, PR.4, DO.1, MG.10 |
| S2 „na plus” | T178 – rozróżniają: X z OC (koszty 6 653,19 > pensja – „na plus”) i VI.2026 („nie” przy kosztach 6 370,87 < pensja) | PM.24, PR.8 |
| S3 łupy | A – niewydana energia (803,48; 723,48 po wydatku) | PM.18, PM.21, PR.8 |
| S4 wpłata domownika | B (1.15.3 `inflowKind`; decyzja użytkownika – jak R-11 w LICZBY-AB): cele 8 138,96, depozyt 4 797,20, Marek 360 od 20.08 (75 dni), dostawa 20.10 „861,04 / 2 138,96”, DM.6 przychody i bilans X +6 286,81, tempo 1 356,49 i ETA, PR.10 „wolne do decyzji 944 520,03” | PR.1, PR.4, PR.7, PM.18, DM.*, MG.*, RA.12 |
| S6 / S7 | T295 – energia dziś = przydział − wydane dziś (77,28); Daily Bias „Neutral” | PR.4, PR.5, PM.1, PM.12 |
| S8 / S9 gra | bez rozstrzygnięcia w bloku C – październik w A i B: 22 / 9, poważne 2 | PR.8, PM.2 |
| Z1, Z3, Z6, Z7, Z9 | łupy osobno; średnia do grosza 6 530,87; raty pożyczki wziętej w kosztach; Rower 0; podstawowy przydział w dół | PR.1, PR.2, PM.14 |
| Luki z wariantami | R-9 masa ładunku zaokrąglona („31,0%”); R-7 termin raty w dacie zaległości („spóźniona od 04.09”); C14 `stanOstatniWiersz`; C16 `kosztyNettoZPrzyszlymi`; C21 `razemZCzesci` | PR.7, LA.11, DO.17, PR.2, DM.12 |
| Propozycje kopert (T47, D70) | do najbliższych 10 zł (Dom 120, Zwierzęta 280, Prezenty 350, Gotówka 130) | PM.8 |
| Mediana stopy (R-16) | z 6 miesięcy przed miesiącem debriefingu (28,4 %; IX pm-6 27,9 %) | PR.8, PM.23 |

## Brak w wyroczni

- Wyrocznia nie liczy:
  - propozycji kontenerów z historii i 75. percentyla rachunku zmiennego (LA.6, LA.7);
  - rocznych sum i faktów kopert codziennych (PM.28);
  - zakresu dat poza laboratorium (PM.30);
  - raportu wachty i dziennika pokryć (PM.17-4);
  - list Radaru i Ładowni bez liczb (RA.6 – lista boi);
  - drawdownu krzywej majątku (PR.3);
  - stanu „inna kwota” i „wpis usunięty w ICTTJ” na liście dokowań (DO.12, DO.14 – kwoty i warstwy zgodne).
- Nieporównywalne (4):
  - LA.18-1 – odczyt w czasie toastu „Cofnij”: migawka jeszcze z kontenerem;
  - PM.21-1 – wartości „przed wydatkiem”, migawka po jego zapisie;
  - MG.12-3 – podgląd okna bez dokowania: okno liczy na chwilę dokowania, wyrocznia na chwilę wpływu (T128);
  - DO.10-5 – ICTTJ wyłączony w ustawieniach komputera.
- Do tego pola „przed…” w odczytach wieloetapowych (PM.17-3, PM.26).
