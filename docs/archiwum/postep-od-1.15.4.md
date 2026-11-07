# Financial Intel – postęp od 1.15.4 (archiwum)

Zamknięte wpisy z `docs/postep.md`: audyt funkcjonalny 1.15.4 (D97) i grupy po nim. Nieaktualizowane – prawdą jest kod
i bieżący `docs/postep.md`. Grep po grupie (AU-…, N1 …), wersji albo identyfikatorze.

## Audyt funkcjonalny 1.15.4 (D97) – stan

Plan: `docs/audyt/plan.md`; jak wykonywać: `docs/audyt/wykonanie.md`; gałąź `claude/audyt-1.15.4`. Bloki A–B jednym
ciągiem na komendę z 03.11.2026. Laboratorium `C:\FI-audyt` (wydanie z GitHuba, SHA-256 zgodne), Node 24.21.0
w `.tools`.

| Grupa | Stan | Uwagi |
| --- | --- | --- |
| AU-1 Laboratorium i katalog | ✅ 03.11 | 587 punktów w `docs/audyt/punkty/` (Claude 527, Maszyna 48, Ty 12); `katalog.md` |
| AU-2 Załoga testowa | ✅ 03.11 | persona „rok” (14 mies. przez import wydania), `/code-review` high narzędzia – 10 uwag poprawionych; stan `start` z KR |
| AU-3 Instrukcja maszyny | ✅ 03.11 | `docs/audyt/maszyna.md`, pakiet `C:\FI-vm-pakiet` (`pakiet.spec.ts`) – maszyna po stronie użytkownika |
| AU-4 Codzienny rytm | ✅ 03.11 | KR, MO, SW, OP, ME, IM, SA – 5 wykonawców Opus · xhigh równolegle |
| AU-5 Dowództwo, Wywiad | ✅ 03.11 | DW, WY, RY (Opus · xhigh) |
| AU-6 Dane i dwa komputery | ✅ 03.11 | DA (Opus · xhigh) |
| AU-7, AU-8 Interfejs, ustawienia, raporty | ✅ 03.11 | US, IN, RE i `docs/audyt/ty.md` (Sonnet · high) |
| C-0 Persona od nowa | ✅ 03.11 | dni gry zamrażane po imporcie; pieniądze identyczne ze stanem A–B (`stany\rok-ab`); gra: wrzesień 13/27, październik 22/31 dni zgodnych (było 24/27, 31/31); pakiet maszyny od nowa |
| AU-9, AU-10 Blok C (max) | ✅ 03.11 | wyrocznia (u2, 24 testy), 130 punktów (PM, LA, DO, MG, DM, RA, PR – 6 wykonawców Opus · max), przekrój 814 odczytów wobec wyroczni – wynik niżej |
| AU-11 Synteza | ✅ 03.11 | przegląd kodu wyroczni (24 uwagi, werdykty bez zmian), `raport.md` (80 AF), weryfikacja 5 × Opus · xhigh + druga opinia Fable 5.1 (10 K / W), `wnioski.md` (48 AP, plan N1–N5, 12 pytań); bez raportu maszyny i listy „Tylko Ty” – dopiszą się później |

**Wynik bloków A–B** (`docs/audyt/raport/README.md`): 401 punktów Claude'a – 234 ZGODNE, 67 liczb do wyroczni, 36 UWAG,
66 NIEZGODNE (3 K, 3 W + P.1, 35 S, 25 N). K: IM.42 (usunięta operacja wraca przy imporcie drugiego formatu), DA.40
(znikający folder – wpisy zapisane do odtworzonego pustego folderu), DA.43 (zamknięcie gubi zmianę kwoty bez pytania).
Czas: AU-1–AU-3 ok. 2 h, AU-4–AU-8 ok. 2,5 h (równolegle 5–6 wykonawców); razem ok. 4,5 h zegara sesji.

### Przed blokiem C – AU-9 i AU-10 (03.11.2026)
1. **Co trzeba wiedzieć.** AU-9: wyrocznia i przekrój liczb (ok. 370 odczytów z bloków A–B, PR.1–PR.11); AU-10: 119
   punktów „Claude” z `punkty/3-pieniadze.md` (PM 30, LA 19, DO 25, MG 12, DM 19, RA 14); punkty „Maszyna” (9) i „Ty”
   (DO.24) – poza laboratorium. C-0 zrobione: persona od nowa, stan bloków A–B zachowany jako `stany\rok-ab` (na nim są
   odczyty A–B; pieniądze obu stanów identyczne, więc odczyty pieniędzy się porównują; odczyty gry – od nowa na nowym
   stanie); pakiet maszyny od nowa (maszyna FI jeszcze nie ruszyła – brak maszyny `FI-test`, pusty `C:\FI-vm-raport`).
   Kolejność: wyrocznia na ślepo (bez kodu, odczytów i raportów; własny skrypt z wymagań, liczy dowolny folder na dowolną
   chwilę; jedyny wyjątek – schematy danych `src/shared/schema`, czyli format pól, nie obliczenia) **równolegle** z 5
   wykonawcami AU-10 (PM, LA, DO, MG + RA, DM; migawka folderu przy każdym odczycie) → przekrój: każdy odczyt A–B i AU-10
   wobec wyroczni i między ekranami; rozbieżność wraca do wyroczni (sprawdza się sama, nadal bez kodu), dopiero potem
   werdykt; przyczynę w kodzie szuka AU-11. Odstępstwo od planu: AU-10 nie czeka na wyrocznię (ok. 1–1,5 h zegara mniej),
   a liczby z wyrocznią porównuje jedno miejsce – przekrój.
2. **Co musisz powiedzieć** – nic przed startem. Pakiet maszyny gotowy – maszynę możesz przygotować w każdej chwili.
3. **Co przygotować** – nic.
4. **Tabela prac:**

| Krok | Co obejmuje | Model i thinking (z górką; minimum) | Czas Claude'a |
| --- | --- | --- | --- |
| C-0 | kopia stanu A–B, persona od nowa, porównanie pieniędzy, pakiet maszyny | Opus 5.5 · xhigh (min. high) | 0,25 h (zrobione) |
| AU-9a | wyrocznia: skrypt z wymagań, `docs/audyt/wyrocznia.md` | Opus 5.5 · max (min. xhigh) – D96 | 1,5–2 h, równolegle z AU-10 |
| AU-10 | 119 punktów silnika pieniędzy, 5 wykonawców równolegle | Opus 5.5 · max (min. xhigh) – D96 | 1,5–2,5 h zegara |
| AU-9b | przekrój odczytów A–B i AU-10, PR.1–PR.11, uzgodnienie z wyrocznią, `raport/PR.md` | Opus 5.5 · max (min. xhigh) | 0,75–1,25 h |
| Zamknięcie | podsumowanie w `raport/README.md`, wpis tutaj, commit + push | Opus 5.5 · xhigh (wystarczy Sonnet 5.5) | 0,25 h |
| Razem | rekomendacja: Opus 5.5 · max (D96) | | ok. 3–4,5 h zegara (plan 5,5–7 h) |

**Wynik bloku C** (`docs/audyt/raport/README.md`, sekcja „Blok C”; raporty `PM`, `LA`, `DO`, `MG`, `DM`, `RA`, `PR`,
`LICZBY-AB`, `LICZBY-C`; wyrocznia `docs/audyt/wyrocznia.md`): 130 punktów – 92 ZGODNE, 6 UWAG, 15 NIEZGODNE (3 K, 1 W,
10 S, 1 N) + 2 N, reszta zegar / maszyna. K: DM.18 (odsetki od pożyczki udzielonej nie są przychodem – T70), MG.8 i MG.10
(„przenieś środki” między celami: silnik na koniec dnia – T129, ekran od razu; dostawa tego dnia przepełnia cel, wydatek
z celu płacą osłony; wyrocznia z dosłownym T129 daje to samo – błąd silnika czy reguły, rozstrzyga AU-11). W: DO.7 =
MO.29 (brak „Wycofaj dokowanie”). Liczby: z 814 odczytów (A–B z grą 374, blok C 440) 740 porównanych z wyrocznią
(u2) – **żadna kwota pieniędzy nie jest zła**;
NIEZGODNE w liczbach tylko S / N (KR.12, MO.11, MO.15, WY.20 = PR.3, C15, C17 = LA.8, format stopy „55%”); gra na nowym
stanie = wyrocznia w każdym z 59 dni. Granica ICTTJ: zero zapisów FI we wszystkich przebiegach (sumy SHA-256). Uzgodnienie
z wyrocznią: A–B 9 poprawek wyroczni / 3 błędy aplikacji / 7 luk; C 14 / 3 / 4. Czas: ok. 2,75 h zegara (15:10–17:55;
wyrocznia 36 + 30 min uzgodnień, wykonawcy 33–55 min, przekroje ok. 50 + 25 min) – plan 5,5–7 h, szacunek 3–4,5 h.

**Otwarte po bloku C:**
- K (DM.18, MG.8, MG.10) – Twoja decyzja, czy poprawka wychodzi przed końcem audytu; propozycja: po weryfikacji w AU-11.
- Decyzje wymagań (AU-11 zbierze z propozycjami): S4 wpłata domownika – spec / D80 b / D91 czy `inflowKind` z 1.15.3
  (Marek 300 czy 360 zł), S1–S3, S5–S10, C14, C16, C20, C21, R-3, T129 (C18); szczegóły w `wyrocznia.md` i raportach LICZBY.
- **CI gałęzi audytu czerwone od AU-2** (nie z powodu bloku C): `npm run typecheck` obejmuje `tests/audyt/` (1 119 błędów
  skryptów laboratorium – typy DOM w `page.evaluate`, `unknown`), a E2E `recover` i `repayments` mają daty na sztywno
  z października 2026 i od 1.11 padają (lista Operacji pokazuje bieżący miesiąc) – `main` padnie tak samo przy następnym
  wypchnięciu (= brak wydania). Propozycja (osobne małe zadanie, Opus 5.5 · xhigh, ok. 20 min): daty względne
  w dwóch testach E2E + `tests/audyt/` poza typecheck CI (jak poza `npm test`), z osobnym `tsconfig` dla rdzenia
  laboratorium.
- Maszyna: pakiet `C:\FI-vm-pakiet` z nową personą (15:19) – 48 punktów czeka na Twoje przygotowanie maszyny.

### Przed AU-11 – synteza i wnioski (03.11.2026, komenda „Rozpocznij kroki 1.1 i 1.2”, druga opinia – Fable)
Krok 1.1 (CI) zrobiony: daty E2E z bieżącego miesiąca (PR #48 do `main`, commit też na tej gałęzi), `tests/audyt/` poza
typecheck CI, rdzeń laboratorium – `npm run typecheck:audyt`. Raportu maszyny ani listy „Tylko Ty” jeszcze nie ma – dojdą
po Twojej stronie (AU-11 je wtedy dopisze).

| Krok | Co obejmuje | Model i thinking (z górką; minimum) | Czas Claude'a |
| --- | --- | --- | --- |
| 0 | przegląd kodu wyroczni (jak `/code-review` high; recenzent tylko zgłasza, poprawki – wyrocznia bez kodu aplikacji) | Opus 5.5 · xhigh (min. high) | 0,5 h, równolegle |
| 2 | konsolidacja `docs/audyt/raport.md`: AF-n, duplikaty, wagi, uwagi, zegar → maszyna | Opus 5.5 · high (min. medium) | 0,5–0,75 h, równolegle |
| 3 | weryfikacja sceptyczna 6 K, 4 W, ok. 45 S – odtworzenie w wydaniu, potem przyczyna w kodzie; 5 weryfikatorów równolegle | Opus 5.5 · xhigh (min. high) | 1–1,5 h zegara |
| 3b | druga opinia dla K i W o pieniądzach i danych (IM.42, DA.40, DA.43, DM.18, MG.8, MG.10, IM.23, IM.39) | Fable 5.1 | 0,5 h |
| 4 | wnioski `docs/audyt/wnioski.md`: kryteria sukcesu, ścieżki kapitana, luki, porównanie z YNAB / Actual / Monarch / Copilot / Firefly III (badanie w sieci – Sonnet 5.5), AP-n | Opus 5.5 · xhigh (min. high) | 1–1,5 h |
| 5 | plan dalej: grupy naprawcze i rozwojowe z modelem i czasem, pytania do Ciebie | Opus 5.5 · xhigh | 0,25 h |
| Razem | rekomendacja: Opus 5.5 · xhigh, Fable 5.1 do drugiej opinii | | ok. 3–4 h zegara |

**Wynik AU-11** (`docs/audyt/raport.md`, `docs/audyt/wnioski.md`, weryfikacje `docs/audyt/raport/WERYFIKACJA-1…5.md` i
`WERYFIKACJA-FABLE.md`): 80 znalezisk po połączeniu duplikatów – **K 4** (IM.42 usunięta operacja wraca przy drugim
formacie, DA.40 folder-widmo, MG.8 = MG.10 przeniesienie środków celu na koniec dnia – błąd reguły T129, IM.23 = P.3
„reszta jako zaliczka” = całość – Fable podniósł z W), **W 6** (DA.43, MO.29 = DO.7, IM.39, KR.16 – Fable podniósł,
IM.10, IM.25), S 25, N 35; odrzucone 4 (RE.5, DA.3, DM.11, PR.10 – zgodne z decyzjami, jako AP), do decyzji 6 + S4.
Sprostowania z weryfikacji: P.1 to zaległość ponad ok. 100 niezamrożonych dni (nie długość gry – bez terminu w styczniu),
S; DM.18 – warstwy dobre, tylko przychód, S; WY.20 – symulator zakłada powrót spóźnionej spłaty, nie pomija długu.
Kryteria sukcesu: spełniony „trading oddzielony” (zero zapisów w ICTTJ), reszta częściowo. 48 propozycji AP; plan grup
N1–N5 przed / między iD i iE (kolejka niżej) i 12 pytań (`wnioski.md` sekcja 7). Krok 1.1 (CI): PR #48 scalony, `main`
zielony bez nowego wydania. Czas AU-11: ok. 2,25 h zegara (20:15–22:30), plan 3–4 h.

**Incydent 03.11:** wydana aplikacja przy każdym starcie zapisuje autostart z `config.json` (przed oknem) – przebiegi
laboratorium usunęły wpis „Financial Intel” w HKCU\…\Run użytkownika. Został starszy wpis `app.financialintel.desktop`
(FI dalej startuje z Windows); aplikacja użytkownika odtwarza swój wpis przy następnym starcie. Laboratorium od tej chwili
startuje jako portable (wpis „Financial Intel (portable)”) i sprawdza wpisy FI w rejestrze przed i po każdym starcie.
Znaleziska z przygotowania: `docs/audyt/raport/0-przygotowanie.md` (P.1 Operacje przy grze > ~105 dni, P.3 wpłata
„reszta jako zaliczka” nie spłaca długu).

**iPhone – limit tygodniowy (D93).** Plan Max 20x, odnowienie w niedzielę o 18:00; 21.10.2026 zużyte 55 %. Podstawa:
od odnowienia 18.10 o 18:00 grupy E–V i 1.10.1 (ok. 33 h pracy Claude'a – zegar z tabeli, Opus 5.5 · max, przegląd
`/code-review` high, mutacje, E2E) i koniec przeglądu ultracode zużyły ok. 55 %, czyli ok. 1,4–1,7 % na godzinę pracy.
Grupy FI kończyły się w ok. 0,7 czasu planu. „Oczekiwane” = 0,7 środka planu × 1,55 %/h (+ zapas na CI macOS w iA),
„z górką” = górna granica „z górką” × 1,7 %/h. Rzeczywiste zużycie wpisuję po każdej grupie (użytkownik podaje %).

| Grupa | Oczekiwane | Z górką | Narastająco z górką | Rzeczywiste |
| --- | --- | --- | --- | --- |
| iA | ok. 11 % | 20 % | 75 % | – |
| iB | ok. 2,5 % | 5 % | 80 % | – |
| iC | ok. 6 % | 12 % | 92 % | – |
| iD | ok. 2,5 % (bez IP15 ok. 1 %) | 3,5 % | rzeczywiste po iC + 3,5 % | – |
| iE | ok. 7 % | 13,5 % | po odnowieniu | – |
| **Razem** | **ok. 29 %** | **ok. 54 %** | | |

iD przeliczone z czasu w „Przed grupą iD” (21.10, po iC: grupy iA–iC trwały 0,15–0,3 planu); iE – w „Przed grupą iE”.
Po podaniu procentu po iC przeliczam zużycie na godzinę pracy i obie grupy.

**Porządek kontekstu (25.10.2026):** CLAUDE.md skrócony ze 124 KB do kompasu, wiedza modułów w `.claude/rules/`,
dziennik i mapa kodu w `docs/archiwum/`. Punkt odniesienia do porównania: ok. 1,4–1,7 % limitu na godzinę pracy
(Opus 5.5 · max, wyżej) – po kolejnej grupie porównaj z nowym zużyciem.

## N1 – Dane i import (1.15.5, 04.11.2026) – wydane 04.11 07:33, PR #50
- **Zakres:** AP-1 (T314–T318), AP-8 (T319), AP-2 (T320–T324), AP-6 (T325, T326), AP-7 (T327–T329); po przeglądzie
  T330–T332. Wykonawcy: N1-a (AP-1, AP-8) w osobnym drzewie równolegle z N1-b (AP-2), potem N1-c (AP-6, AP-7, max).
- **Przegląd:** 4 rundy – xhigh na całości (15 uwag: 14 poprawionych, 1 odrzucona – telefon sam przekazuje stan folderu),
  potem high na samych poprawkach (10, 7, 8 uwag – wszystkie poprawione; w 4. rundzie temat z „w tym za” uproszczony
  zamiast kolejnej łaty, T336). Każda poprawka z testem, który przed nią padał. Najpoważniejsze: „Usuń” w meldunku „Wróciły po
  usunięciu” mógł skasować prawdziwą operację połączoną z wierszem banku; kopia usuwana przy imporcie gubiła spłacane
  zakupy; „w tym za X” nie liczył własnych wpłat X; próba zapisu przy otwarciu dawała „tylko do odczytu” przy chwilowej
  blokadzie OneDrive; kopia przed migracją mogła założyć folder-widmo. Weryfikacja przez odtworzenie testem (druga opinia
  Fable niepotrzebna). Poprawki – po 2–3 podagentów równolegle w osobnych drzewach (max dla rozliczeń, xhigh reszta).
  Zasada na kolejne grupy: pełny przegląd + jeden na poprawkach; dalej tylko przy poważnych uwagach.
- **Testy:** typecheck, `npm test` (ok. 1065), build, E2E komputera 78, telefonu 10/10. Lokalnie pada tylko `ictj.spec.ts`
  (ICTTJ zainstalowany na tym komputerze); ZIP64 w `folder-speed` przekracza czas pod obciążeniem – pułapki w
  `.claude/rules/testy.md`. Decyzje T314–T337.
- **Krok 0:** CI audytu padało w nocy – szybki wpis telefonu w ciszy nocnej wymaga notatki (poprawiony pomocnik E2E).
- **Otwarte:** KR.29 (przy starcie budżetu najpierw `fi.json` albo wycofanie przy częściowym błędzie); numer pliku
  zapamiętany przy złym koncie po błędnym imporcie; panel duplikatów nie paruje kopii między kontami bez importu
  naprawczego; PIT-38 bez rozpoznania po nazwie; edytor reguł pokazuje „w tym za”, którego reguły nie zachowują (AP-15,
  N4).
- **Czas:** 01:53–07:00 do PR, ok. 5 h (N1-b 42 min, N1-a 63 min, N1-c 65 min; 4 przeglądy 6–20 min; 4 rundy poprawek
  20–34 min) – plan 2,5–4 h; przekroczenie z rund przeglądu.


## N2 – Silnik pieniędzy (1.15.6, 04.11.2026) – wydane 04.11 13:06, PR #51
- **Zakres:** AP-3 przeniesienie środków celu w chwili zapisu (T340, zastępuje „na koniec dnia” z T129), AP-12 dostawy
  według puli przed dokowaniem (T341, T342, T363), AP-5 płatność sprzed startu (T345), AP-11 plan = silnik (T346, T347),
  AP-9 „Wycofaj dokowanie”, usuwanie kategorii, N-PC-4 i N-PC-14 (T360–T362), AP-4 „reszta jako zaliczka” najpierw spłaca
  i naprawa przy odczycie (T350–T354), D100 wpłata od dowolnej osoby spłaca pożyczkę (T355–T359, T368), AP-32 wyrocznia
  jako regresja (T367), AF-5 – odsetki od pożyczki jako przychód (T70, poprawka po przeglądzie), drobne po N1 (N2-h).
- **Wykonawcy:** 3 strumienie równolegle w osobnych drzewach (warstwy i cele; opłaty i plan, potem AP-9; rozliczenia –
  AP-4, potem D100), wszystkie Opus · max poza AP-9 i drobnymi (xhigh); scalenie konfliktów importu (max), AP-32 (max).
- **Przegląd:** xhigh na części 1 (14 uwag) i części 2 (14 + AF-5) – wszystkie poprawione z testem, który przed
  poprawką padał (1 częściowo odrzucona: fragment Ładowni nieosiągalny dla kontenera pożyczki); high na poprawkach – bez
  pewnych błędów, 6 drobnych poprawionych. Najpoważniejsze: „Zadokuj” przesuwał pieniądze po przeniesieniu środków celu,
  spóźniona płatność sprzed startu zamykała następny cykl, „Spłać” w meldunku rozliczał historię od nowa (dług 50 → 150 zł),
  część pożyczki z reguły stawała się sumą grupy.
- **Wyrocznia:** `npm run test:wyrocznia` (lokalnie, migawki `C:\FI-audyt`, ok. 2 min) – 412 przypadków, 28 963 kwoty,
  2 852 porównania ekranów zgodne z aplikacją; znane: AF-15 (termin asteroidy w odprawie – naprawia N3), zbiornik po końcu
  życia opłaty (bez różnicy w pieniądzach).
- **Testy:** typecheck (także `typecheck:audyt`), `npm test` ok. 1265, build, E2E komputera 89 (lokalnie pada tylko
  `ictj.spec.ts`), telefonu 10/10.
- **Otwarte:** audyt reguł nie oznacza reguły z zamkniętą pożyczką; telefon pokazuje „pożyczka” zamiast nazwy; eksport
  bez kolumny części pożyczki; edytor operacji nadal „depozyt na przyszłość”; zbiorcza decyzja tej samej osoby kasuje linie
  „w tym za”; operacje z ukrytym `containerId` bez migracji; wyrocznia – pary przychodu w toku bez części domownika
  i pożyczki (lab ich nie ma).
- **Czas:** 05:05–ok. 13:00 do PR (strumienie 55–100 min, scalenia i przeglądy, 3 rundy poprawek) – plan 3–4,5 h pracy;
  zegar dłuższy przez rundy przeglądu i scalenia równoległych gałęzi.

## N3 – Opłaty, energia, gra (1.15.7, 04.11.2026) – wydane 04.11 18:02, PR #52
- **Zakres:** AP-13 energia dziś w granicach miesiąca, zwrot dawnego zakupu od jutra (T370, T371), AP-17 kadłub od 99 %,
  „Dopełnij kadłub z osłon”, podgląd celów warstw (T372–T374), AP-10 jeden stan opłaty i zaległości (T375–T379), AP-14
  zamrażanie dni po przerwie porcjami, pytanie bez importu, „Nowa klasa” (T380–T382), AP-30 misje i droga do awansu
  (T383, T384), AP-18 kurs bez osłon poniżej zera, „teraz” = Mostek (T385–T387), AP-31 trend poduszki (T388, T389);
  integracja (T390–T392), jedna reguła „która płatność płaci opłatę” – silnik = Ładownia = kreator (T393, T394), płatność
  z datą po dziś (T398), wydajność stanu opłat i boi (T399).
- **Wykonawcy:** 4 strumienie w osobnych drzewach (AP-13 + AP-17 max, AP-10, AP-14 + AP-30, AP-18 + AP-31 – xhigh),
  integracja max, scalenie z N2 (max) – razem z N2 w jednej regule płatności opłat.
- **Przegląd:** xhigh całości (15 uwag – przyczyna: dwie reguły płatność ↔ cykl; poprawki R max i S xhigh), high na
  poprawkach i rozwiązaniu konfliktów z N2 (9 uwag: 8 poprawionych, 1 z innym skutkiem niż w recenzji – poprawiony
  skutek odwrotny; kreator z rachunkiem zmiennym o cykl w tyle, płatność z datą po dziś zapłacona tylko w Ładowni,
  „Cofnij” dopełnienia kadłuba mógł usunąć plan miesiąca z cudzą zmianą), high na tych poprawkach (9 uwag – reguła
  płatności wpisanej z wyprzedzeniem uproszczona do jednego zbioru terminów zaplanowanych w oknie Radaru, co zamknęło też
  podwójne liczenie w saldach naprzód od 1.8.0; „Cofnij” bez planu nic nie tworzy); trzecia runda sprawdzona przez
  koordynatora na diffie.
- **Wyrocznia:** 412 przypadków, 28 963 kwoty, 2 852 porównania ekranów – bez rozbieżności; AF-15 zamknięte.
- **Testy:** typecheck (także `typecheck:audyt`), `npm test` 1424 (lokalnie pod obciążeniem pada tylko `folder-speed`
  ZIP64), build, E2E zmienionych ekranów; pełne E2E – CI (Linux zielone na 2cf22ba).
- **Otwarte:** zaległy termin zamknięty dopiero przesunięciem przez drugą płatność okna wpisaną naprzód zostaje „po
  terminie” do jej dnia (w saldach naprzód podwójnie); `priceChanges` liczy płatności wpisane naprzód; dni zamrożone przed 1.15.7 bez `clsBefore`;
  kalibracja progów gry (D99 pkt 12) – za osobną zgodą.
- **Czas:** 07:15–ok. 13:50 kod i dwa przeglądy (przerwa 14:00–14:20), 14:20–ok. 16:45 przegląd poprawek, poprawki,
  wydanie – plan 2,5–3,5 h pracy; zegar dłuższy przez scalenie z N2 i trzy rundy przeglądu.

## N4 – Zasady interfejsu (1.15.8, 04.11.2026) – wydane 04.11 21:40, PR #53
- **Zakres:** AP-15 komunikat przy każdej odmowie i przycięciu (T400–T402), AP-22 „Cofnij” wszędzie, AP-16 odprawa
  z hierarchią, godzina odprawy, progi gry w Ustawieniach (T405–T409), AP-23 teksty – daty dd.mm.rrrr, bez kodów, błędy
  po polsku, odmiana, „−” (T403, T404); po przeglądach: „Cofnij import” po odcisku treści (T415 zamiast T410), jedna
  reguła „ta sama osoba” jak `memberOf` (T416), słowa pól szybkiego wpisu (T413, T417), żadne „Cofnij” reguł
  i domowników nie nadpisuje późniejszych zmian (T418), poranny dotyk (T411), eksport i wyszukiwanie usuniętych (T412),
  limit 20 nazw w banku (T414).
- **Wykonawcy:** N4-a (AP-15, AP-22 – Sonnet high), N4-b (AP-16 – Opus high), N4-c (AP-23 – Sonnet high); poprawki
  przeglądów – Opus xhigh; scalenie N3 z N2 do N4 – Opus max (10 konfliktów, m.in. księga domowników – bez zmian).
- **Przegląd:** high całości (10 uwag), high na poprawkach (10 – m.in. „Cofnij import” mógł usunąć zmianę użytkownika
  bez ostrzeżenia; przeprojektowane na odcisk treści), high na poprawkach i scaleniu z N3 (10 + 1 – m.in. ponowienie po
  cofnięciu dublowało operacje, nazwa domownika, którą import przypisałby innej osobie) – wszystkie poprawione z testem,
  który przed poprawką padał; trzecia runda sprawdzona przez koordynatora na diffie.
- **Testy:** typecheck, `npm test` 1517 (pod obciążeniem pada tylko `folder-speed` ZIP64), build, E2E komputera 106/108
  po scaleniu (lokalnie `ictj.spec`, `series.spec` – osobno zielony), telefonu 10/10, wyrocznia bez rozbieżności.
- **Otwarte:** „Cofnij” poza regułami i domownikami (Ładownia, Radar, Operacje, Kategorie) może nadpisywać zmiany zrobione
  po działaniu; paczki importu sprzed 1.15.8 ostrzegają w nadmiarze, dopóki nie wypadną z 10 ostatnich; chip „+ #tag
  ostatnich dni” zasłania pole tagów w wąskim oknie; krótkie daty dd.mm (58 miejsc) zostają; „Ctrl K” przy wysokim
  kontraście; telefon bez własnej godziny odprawy.
- **CI:** trzy razy czerwone na `briefing-n4.spec` (pod Xvfb kursor nad oknem daje dotyk przy starcie, notifier bierze
  jeden dotyk na 30 s) – po decyzji użytkownika (D101: zbadaj i popraw test) potwierdzone na gałęzi diagnostycznej,
  poprawiony tylko test.
- **Czas:** 12:09–ok. 13:50 kod (przed przerwą), 14:20–21:40 trzy rundy poprawek, scalenie z N3, CI, wydanie – plan
  2–3 h pracy; zegar dłuższy przez rundy przeglądu, scalenie z N2/N3 i czerwone CI.

## N5 – Ścieżki i ergonomia (1.15.9, 04–05.11.2026) – wydane 05.11 02:28, PR #54
- **Zakres:** AP-21 tagi, AP-33 konto Gotówka, AP-36 koszty do dziś (T420–T423), AP-29 eksport części, AP-37 procenty,
  AP-38 podgląd zmian zbiorczych (T425–T429), AP-27 konflikty, AP-28 nowy komputer i autostart (T430–T434), AP-19
  domownicy, AP-26 dokowanie (T435–T439), AP-20 szybki wpis, AP-34 Operacje i klawiatura (T440–T444), AP-25 kreator,
  AP-24 debriefing i przegląd roczny, KR.29 start budżetu (T445–T449).
- **Wykonawcy:** 6 gałęzi (n5a, n5b, n5d, n5e, n5f – dwie dokończone z WIP po przerwie), Opus xhigh / high; integracja
  w dwóch częściach (gałęzie na N4, potem N4 z N2/N3 i gałęzie na `main` – Opus max); poprawki w dwóch strumieniach
  równolegle (`config.json` / konflikty – xhigh; kreator / dokowanie / eksport – max).
- **Przegląd:** xhigh całości (11 uwag), high na poprawkach w trzech rundach (9, 10, 10 uwag). Najpoważniejsze:
  autostart wyłączany albo usuwany wbrew ustawieniu przy zajętym lub uszkodzonym `config.json`, „Zachowaj nowsze”
  wyrzucające niewidzianą wersję, potwierdzenie dopłaty zmieniające kolejność w silniku, odrzucony start budżetu
  zostawiający salda i plan. Mechanizm wycofania startu po trzech rundach zastąpiony odwróceniem kolejności zapisów
  (najpierw `fi.json`, T446) – wszystkie poprawione z testem, który przed poprawką padał; ostatnia runda sprawdzona przez
  koordynatora na diffie.
- **Testy:** typecheck (+ `typecheck:audyt`), `npm test` 1686 (pod obciążeniem pada tylko `folder-speed` ZIP64), build,
  E2E komputera 122/123 (lokalnie `ictj.spec`), telefonu 10/10, wyrocznia bez rozbieżności.
- **Otwarte:** „Co nowego” po aktualizacji z ≤ 1.15.2 pokaże stare sekcje z kodami D…; DM sp. 4 (na który zakup poszła
  zaliczka); SW.26, IM sp. 6–8, IN sp. 1, OP.20, OP.42, OP.10, ME sp. 4; PM sp. 2, AF-54, WY.14 (poza wierszami AP);
  wyrocznia bez `countedFrom` (T363); do sprawdzenia w maszynie – autostart instalator / portable, klucz Run, blokada
  `config.json` (FileShare.None), „Co nowego” offline po aktualizacji instalatorem, „nowy komputer” na prawdziwym
  OneDrive, powiadomienie o starych wpisach przy pierwszym wyborze folderu ICTTJ.
- **Czas:** 12:45–ok. 14:00 pierwsze gałęzie, 14:20–02:28 dokończenie, integracja, cztery rundy przeglądu, wydanie –
  plan 3–4,5 h pracy; zegar dłuższy przez 6 gałęzi na dwóch bazach i rundy poprawek w obszarze startu budżetu.

## R1 – Rozwojowe 1 (1.16.0, 05.11.2026) – wydane 05.11 06:05, PR #55
- **Zakres:** AP-43 import CSV innego banku z kreatorem kolumn (T460–T462), AP-35 analiza i plan importu w Web Workerze
  z paskiem postępu (T463–T466), AP-45 reguły importu z warunkami I / LUB i dla wpisów ręcznych (T467–T471), AP-42
  kalendarz-siatka miesiąca na Radarze (T472–T474), AP-47 opis formatu folderu generowany ze schematów i przykładowy
  skrypt odczytu (T475, T476).
- **Wykonawcy:** 3 strumienie równolegle (AP-43 + AP-35, AP-45 – Opus xhigh; AP-42 + AP-47 – Opus high), poprawki po
  przeglądach w dwóch strumieniach (CSV / Worker; reguły / schemat / dokumenty).
- **Przegląd:** xhigh całości (15 uwag – m.in. tożsamość wiersza CSV zależna od ról kolumn, kreator nadpisujący
  mapowanie innego konta, migawka bez odwołania do pliku, nieczytelne nowsze pola gubione przy zapisie), high na
  poprawkach (10 – m.in. przelew własny na to samo konto, długi wiersz poza schematem, usunięta operacja wracająca,
  brak powrotu do okna po błędzie Workera) – wszystkie poprawione z testem, który przed poprawką padał; ostatnia runda
  sprawdzona przez koordynatora na diffie.
- **Testy:** typecheck (+ `typecheck:audyt`), `npm test` ok. 1790 (pod obciążeniem pada tylko `folder-speed` ZIP64),
  build, E2E komputera 129/130 (lokalnie `ictj.spec`), telefonu 10/10, wyrocznia bez rozbieżności; test „przed i po”
  reguł na imporcie 1.15.9.
- **Otwarte:** pomiar Workera w maszynie (IM.55); regex z wiersza AP-45, podpowiedź „od domownika” przy wpływach, ręczna
  kolejność reguł z warunkami; inne pola reguł z `.catch(undefined)` (udział, tagi, rodzaj wpływu) gubią nieczytelną
  wartość przy odczycie (jak dotąd); mapy `lenientRecord` w opisie folderu jako „dowolna wartość”.
- **Czas:** ok. 01:50–ok. 06:30 (równolegle z końcem N5 i początkiem R2) – plan 3–4,5 h pracy.

## R2 – Rozwojowe 2 (1.17.0, 05.11.2026) – wydane po CI na `main`, PR #56
- **Zakres:** AP-41 plan spłaty pożyczek wziętych na Radarze – harmonogram, lawina, kula śnieżna, nadpłata co miesiąc i
  jednorazowa, oprocentowanie `loan.rate` (T480–T484); AP-44 prognoza wieloletnia w Wywiadzie – 3 scenariusze, rok 1 =
  kurs, założenia w `settings.intel.forecast` (T485–T489); AP-46 Sankey miesiąca w Debriefingu – „Przychód i koszty” i
  „Pensja i energia”, także w PDF (T490, T491); AP-48 kwota w walucie przy operacji – pole informacyjne `foreign`
  (T492–T494; wyjątek od „tylko PLN” w CLAUDE.md). Bez karty kredytowej (D101).
- **Wykonawcy:** 3 strumienie równolegle (AP-41 – Opus max; AP-44, AP-46 + AP-48 – Opus xhigh), poprawki w trzech
  gałęziach (plan spłaty; kurs i prognoza; Sankey), druga runda w dwóch.
- **Przegląd:** xhigh całości (15 uwag – m.in. raty pożyczek bez kontenera nigdy niepłacone w roku 1 prognozy, plan spłaty
  zatrzymany przy rosnącej sumie sald, czerwony węzeł Sankeya z wypływami spoza deficytu, PDF ucinający kwotę), high na
  poprawkach (8 – m.in. rata pożyczki z kontenerem pomijana w kursie, podwójna rata przy przyjętych kosztach, skok celu
  kadłuba na granicy roku 2, rata i spłata w jednym miesiącu znoszące się) – wszystkie poprawione z testem, który przed
  poprawką padał (`CourseInput.loanFlows`, wspólne `roomOf` / `fitLabel` ekranu i PDF).
- **Scalenie:** z `main` 1.16.0 – konflikt tylko w `.claude/rules/import.md`; `npm run docs:format`.
- **Testy:** typecheck, build, `npm test` 1865/1866 (lokalnie `folder-speed` ZIP64 – osobno 12/12), CI Linux / Windows /
  iPhone zielone. Na CI dwa czerwone runy: Windows – E2E Sankeya oczekiwał pełnej nazwy, a ekran 1024×768 ją ucina
  (poprawiony test, T491: kwota zawsze cała); Linux – `ap20.spec.ts:53` (pytanie „Plan czy impuls?” nie w 10 s),
  niestabilny – po ponownym uruchomieniu zielony, ten sam kod zielony w runie wcześniej.
- **Otwarte:** Sankey w Planie miesiąca; import kwoty w walucie z mBanku (czeka na zanonimizowany plik); podpowiedź
  oprocentowania z harmonogramu; boja roczna w prognozie może dublować się ze średnimi (T276); osiągnięty cel w prognozie
  zostaje w pieniądzach; `ap20.spec.ts:53` – obserwować, przy drugim razie poprawić czekanie na okno.
- **Czas:** ok. 02:40–06:45 strumienie i dwie rundy przeglądu, 10:50–13:31 scalenie z 1.16.0, wersja, PR, CI (dwa
  czerwone runy) – plan 3–5 h pracy.

## 1.19.0 – Nadwyżka przelewu za kilku domowników (D102, 06–07.11.2026)
- **Zakres:** D102 – nadwyżka przelewu od domownika spłacającego także innych domowników („w tym za”): najpierw pełna spłata
  długów wszystkich objętych osób, potem podział wolnej górki (domyślnie nadawcy, „po równo” z resztą groszy dla nadawcy,
  „proporcjonalnie do długów”), jawny cel nadwyżki (`przychód`, `zaliczka`, a w edytorze także `spłata pożyczki` udzielonej
  z Radaru – D100), wymuszenie odpowiedzi przy ustawieniu „pytaj” (`inflow: 'ask'`) oraz nauka i stosowanie reguł importu
  z `alsoFor` i `surplusSplit` bez stałych kwot PLN („najpierw dług” zawsze). Wdrożone spójnie w silniku (`calc/household.ts`,
  `calc/quick.ts`), edytorze operacji (`SurplusPanel.tsx`), szybkim wpisie (`QuickApp.tsx`, `quickHost.ts`) i imporcie CSV
  (`DecisionFields.tsx`, `state.ts`, `rules.ts`, `classify.ts`, `reconcile.ts`, `budget.ts`) – T519–T526.
- **Przegląd:** `/code-review` na całym diffie `main...HEAD` – poprawione T526 (bezpośrednie użycie `surplusView` /
  `evenShares` / `debtShares` / `memberPartLines` w `DecisionFields.tsx` i `reconcile.ts`, przyciski `pytaj` na linii
  reguły z `each: true` i `surplusSplit`, porównanie z `owedLeftOfRow` w `hasUnansweredAskSurplus`).
- **Testy:** `npm run typecheck`, `npm test` (208 plików, 1937 testów), `npm run build`, E2E `tests/e2e/surplus.spec.ts` (3/3),
  `check-context.mjs`, `release-notes.mjs`.
- **Czas:** 6 kroków w 3 blokach (0 → 2 → 4, 1 → 3, 6) – łącznie ok. 2,75 h (plan 3,5–5,5 h).
