# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary:
`docs/archiwum/postep-do-1.15.md` (Grep po wersji, grupie albo identyfikatorze). Po wydaniu wpisy etapu przenoś do
archiwum – tutaj zostaje stan (≤ 400 linii, sprawdza CI). Odwołania „`docs/postep.md` „…”” w starszych dokumentach
i komentarzach (sekcje do 1.15.1) prowadzą do tego archiwum.

**Stan:** **1.15.4 wydane** (25.10.2026). 1.15.2 (audyt funkcjonalny PC – pakiety A, B, C; N-PC-1 do N-PC-20, D95,
T313), 1.15.3 (niezależne wpłaty domowników, reguły tytuł + kontrahent) i 1.15.4 (poprawki panelu operacji i
komponentu `Segmented`) wydane 24–25.10 – 1.15.3 i 1.15.4 z sesji Antigravity bez wpisu w dzienniku, zakres w
`CHANGELOG.md`. 1.15.1 wydane (PR #46 – wcześniejsza wpłata domownika finansuje późniejszy zakup, D94, T312).
iPhone (D92 / D93): 1.13.0–1.15.0 wydane (grupy iA–iC, PR #42–#44); przerwa po iC (D93) – „Przed grupą iD” niżej.
1.11.0 i 1.12.0 wydała w tym czasie równoległa sesja, więc iPhone ma numery przesunięte: wersje iA–iE 1.13.0–1.17.0,
decyzje D92 / D93, T305–T311.
**Następny krok:** audyt 1.15.4 (D97) zakończony 03.11, odpowiedzi użytkownika 04.11 – D98 (iPhone wstrzymany), D99
(wszystkie AP przyjęte, S4 – „zaliczka na przyszłość” może omijać dług). Grupy N1–N5 (1.15.5–1.15.9), potem R1–R2 – kolejka
niżej; N1 na komendę. Otwarte: karty kredytowe (przed AP-41), maszyna wirtualna, procent
limitu tygodniowego. iPhone (iD, iE, IP15, IP21, IP24) wstrzymany (D98) – „Przed grupą iD” niżej zostaje jako zapis na
później. Przed każdym etapem tabela prac z modelem oszczędnym z górką; thinking domyślnie xhigh, max tylko silnik
pieniędzy i granica ICTTJ (D96). Flota rezerwowa (F32), paragony i gwarancje (F38), ulgi PIT-37 / PIT-36 (F39),
wpisy z telefonu przez skrót iOS (F41) i archiwizacja starych lat (F43) – odrzucone (D88).
Do sprawdzenia w aplikacji: 1.5.0–1.12.0 – listy w archiwum dziennika; iPhone – sekcje „1.13.0”, „1.14.0” i „1.15.0”
w archiwum oraz `docs/iphone.md`.

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

## Zasady prowadzenia (prośba użytkownika 16.10.2026 – D67)
- Po każdym kroku (etapie albo grupie) zaktualizowana tabela: model i thinking z górką, szacowany czas pracy Claude'a.
- Bez komendy użytkownika nie zaczynam kolejnego etapu ani grupy.
- Etapy, które mogą iść jednym ciągiem, są zgrupowane: w grupie bez pauzy między etapami (każdy etap i tak kończy się
  testami, `/code-review` high, commitem i wpisem tutaj), jeden PR i jedno wydanie na grupę, potem pauza.
- Wpis etapu: zakres, decyzje (D… / T…), testy, czas faktyczny, rzeczy otwarte – zwięźle; mapa kodu nie jest
  potrzebna (kod przeszukuje się Grepem).

## Kolejka prac

Czas = praca Claude Code w sesji (czytanie, pisanie, testy, poprawki), bez testowania przez użytkownika i bez czekania
na CI. Model i thinking z górką. Ukończone grupy E0 … 1.15.1 i iA–iC z czasami: archiwum dziennika, sekcja „Kolejka
prac” (razem ok. 63 h; ciąg M–V zmierzone ok. 17 h przy planie ok. 24–25 h).

| Grupa | Etapy | Model | Thinking | Czas Claude'a | Wydanie | Co potrzebne przed startem | Stan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **N1** | Dane i import po audycie: folder danych przed zapisem, tożsamość wiersza banku, szkic przy „Zmień mimo to”, pożyczka przed regułą, „+ w tym za” (AP-1, 2, 6, 7, 8; AF-1 K, AF-2 K, AF-3 W, AF-9 W, AF-26 W, AF-27 W) | Opus 5.5 | xhigh (max w AP-6, AP-7) | 2,5–4 h (z górką 4,5 h) | 1.15.5 | komenda | ⏳ |
| **N2** | Silnik pieniędzy po audycie: przeniesienie środków celu w chwili zapisu (zamiast T129), „reszta jako zaliczka” + naprawa danych, płatność sprzed startu, „Wycofaj dokowanie”, usuwanie kategorii, plan = silnik, dostawa według puli, wyrocznia jako regresja (AP-3, 4, 5, 9, 11, 12, 32); nowa funkcja: wpłata od dowolnej osoby spłaca pożyczkę (D100) | Opus 5.5 | **max** | 3–4,5 h (z górką 5,5 h) | 1.15.6 | S4, T163 (`wnioski.md` sekcja 7) | ⏳ |
| **N3** | Opłaty, energia, gra: jeden stan opłaty, energia dziś w granicach miesiąca, zamrażanie po przerwie, kadłub, Kurs = Mostek, trend poduszki (AP-10, 13, 14, 17, 18, 30, 31) | Opus 5.5 | xhigh (max w AP-13, AP-17) | 2,5–3,5 h (z górką 4 h) | 1.15.7 | RA.4, S6, pytania AP-14, AP-17 | ⏳ |
| **N4** | Zasady interfejsu: komunikat przy każdym odrzuceniu, „Cofnij” wszędzie, teksty, odprawa z hierarchią (AP-15, 16, 22, 23) | Sonnet 5.5 | high (Opus high przy logice) | 2–3 h (z górką 3,5 h) | 1.15.8 | – | ⏳ (po iD albo przed) |
| **N5** | Ścieżki i ergonomia: kreator, domownicy, szybki wpis, debriefing, dokowanie, konflikty, nowy komputer, eksport, Operacje (AP-19–21, 24–29, 33, 34, 36–38) | Opus 5.5 | high (xhigh przy silniku) | 3–4,5 h (z górką 5 h) | 1.15.9 | odpowiedzi z `wnioski.md` sekcja 5 | ⏳ (po iE albo przed) |
| **R1** | Rozwojowe 1: import w Web Workerze (AP-35, po pomiarze w maszynie), kalendarz miesiąca na Radarze (AP-42), dowolny CSV – drugi bank (AP-43), reguły I / LUB i dla wpisów ręcznych (AP-45), opis formatu folderu (AP-47) | Opus 5.5 | xhigh (high przy UI) | 3–4,5 h (z górką 5 h) | 1.16.0 | komenda | ⏳ |
| **R2** | Rozwojowe 2: plan spłaty długów i karta kredytowa (AP-41 – po pytaniu o karty), prognoza wieloletnia bez IKE / IKZE / PPK (AP-44), Sankey miesiąca (AP-46), kwota w walucie (AP-48) | Opus 5.5 | **max** (karta i plan spłaty – silnik) / xhigh | 3–5 h (z górką 6 h) | 1.17.0 | odpowiedź o kartach | ⏳ |
| **iD** | iPhone: Ładownia i gwiazdy – dokowanie z ICTTJ, Ładownia, Mapa gwiezdna (IP15–IP17) | Opus 5.5 | **max** (z IP15; bez niego xhigh) | 1,25–1,75 h z IP15, 0,5–0,75 h bez (z górką 2 h; plan był 4–4,5 h – grupy iA–iC trwały 0,15–0,3 planu) | później | odpowiedź: czy folder danych ICTTJ jest na OneDrive (bez tego IP15 odpada); limit tygodniowy po iC; komenda | ⏸ wstrzymane (D98) |
| **iE** | iPhone: Dowództwo – Dowództwo, Wywiad, kreator, Ustawienia, zapisy w tle (IP18, IP19, IP21, IP22, IP24) | Opus 5.5 | **xhigh** (D96; max tylko w krokach silnika pieniędzy albo granicy ICTTJ) | 5,5–7,5 h (z górką 8 h) | później | decyzje: IP21 (kreator – propozycja: bez), IP24 (zapisy w tle z telefonu) | ⏸ wstrzymane (D98) |
| | **iPhone iA–iE (D92)** | | | **24–31,5 h (z górką 34 h)** | | | |

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

## Przed grupą iD – iPhone: Ładownia i gwiazdy (21.10.2026)

1. **Co trzeba wiedzieć** – grupy iA–iC wydane (1.13.0–1.15.0, PR #42–#44); po iC przerwa (D93). Grupa iD (1.16.0):
   - IP15 Dokowanie z ICTTJ – tylko gdy folder danych ICTTJ jest na OneDrive. Telefon czyta z niego wyłącznie
     `payouts/**` i `forecasts/*.json` (Graph, to samo logowanie – `Files.ReadWrite` obejmuje cały OneDrive, w Entra
     nic nie dochodzi) i nigdy nic do niego nie wysyła: osobna kopia tylko do pobierania, bez obecności telefonu i bez
     kopii konfliktu w folderze ICTTJ. Na telefonie: wybór folderu ICTTJ w ustawieniach telefonu, panel „Dokowanie” na
     Mostku, okno dokowania z podziałem, wypłata bez pary w mBanku po 3 dniach roboczych → Portfel XTB (D72), meldunek
     „Dokowanie”, scenariusz ICTTJ na Mapie gwiezdnej. Bez IP15 dokowanie zostaje na komputerze – liczby na telefonie i
     tak są te same (dokowania leżą w folderze FI).
   - IP16 Ładownia – ekran komputera na telefonie: kontenery (dodanie, zmiana, archiwizacja, historia kwot), linia
     zanurzenia, zbiorniki, symulacja, propozycje opłat, nowe ceny i ciche kontenery, harmonogram miesięcy; meldunek
     „Ładownia” rozpatrywany na telefonie.
   - IP17 Mapa gwiezdna – cele (dodanie, kwota, termin i rata, archiwizacja z przeniesieniem pieniędzy); kolejność celów
     przyciskami ↑ ↓ – na komputerze przeciąganiem, które na iPhonie nie działa pewnie.
   - Zapisy w tle z telefonu (zamrażanie dni gry, cele ICTTJ z prognozy) – nie w iD (IP24, grupa iE). Format folderu
     bez zmian.
2. **Co użytkownik musi powiedzieć**:
   - IP15: czy folder danych ICTTJ jest na OneDrive, a jeśli tak – gdzie (np. `OneDrive\ICT Trade Journal`).
     Propozycja: tak → IP15 jak wyżej (telefon podpowie folder z `journal.json` w głównym folderze OneDrive); nie → iD
     bez IP15.
   - Procent limitu tygodniowego teraz (po iA–iC) – kolumna „Rzeczywiste”.
   - Przed iE (można już teraz): IP21 kreator startu – propozycja: bez niego (budżet startuje na komputerze: kreator
     dzieli środki i proponuje pensję z historii z banku, a import z mBanku jest tylko na komputerze; telefon przed
     startem budżetu mówi, że kreator jest na komputerze). IP24 zapisy w tle z telefonu – propozycja: tak (telefon w
     użyciu zamraża dni gry i – z IP15 – uzupełnia cele ICTTJ, jak komputer w użyciu, z tą samą kontrolą konfliktu);
     bez tego dni zamraża komputer przy otwarciu, a do tego czasu ocena dnia może się zmienić po późniejszej edycji
     operacji.
   - Uwagi z telefonu do iA–iC (jeśli są) – poprawki wejdą do iD.
3. **Co przygotować** – nic nowego (uprawnienie OneDrive obejmuje folder ICTTJ, nowych wtyczek nie ma).
4. **Model, thinking, czas** – tabela prac (D90); grupy iA–iC trwały 0,15–0,3 planu:

| Krok | Co obejmuje | Model i thinking (z górką) | Czas Claude'a |
| --- | --- | --- | --- |
| iD-1 | Folder ICTTJ na telefonie: kopia tylko do pobierania (`payouts/`, `forecasts/`), wybór folderu, odświeżanie razem z synchronizacją, stan ICTTJ w oknie (IP15) | Opus 5.5 · max (minimum xhigh – granica „nigdy nie zapisuj w folderze ICTTJ”) | 0,5–0,75 h |
| iD-2 | Dokowanie na telefonie: panel na Mostku, okno dokowania, Portfel XTB, meldunek (IP15) | Opus 5.5 · xhigh (minimum high) | 0,25 h |
| iD-3 | Ładownia na telefonie, meldunek ładowni (IP16) | Opus 5.5 · xhigh (minimum high) | 0,25 h |
| iD-4 | Mapa gwiezdna na telefonie, kolejność przyciskami (IP17) | Opus 5.5 · high (minimum medium) | 0,1–0,25 h |
| iD-5 | E2E telefonu, przegląd zrzutów, `/code-review` high, CI (Linux, Windows, macOS), wydanie 1.16.0 | Opus 5.5 · xhigh | 0,25 h |
| Razem | rekomendacja: Opus 5.5 · max z IP15, xhigh bez niego | | z IP15 1,25–1,75 h (z górką 2 h), bez 0,5–0,75 h (z górką 1 h); plan był 4–4,5 h |

Limit tygodniowy (D93): iD ok. 2,5 % (bez IP15 ok. 1 %), z górką 3,5 % – przeliczę po procencie po iC.
