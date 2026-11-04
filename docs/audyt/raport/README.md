# Audyt funkcjonalny 1.15.4 – stan raportu po blokach A, B i C (03.11.2026)

Blok C (AU-9, AU-10) – sekcja „Blok C” na końcu pliku.

Wydanie 1.15.4 z GitHub Releases w laboratorium `C:\FI-audyt`; persona „rok” (kotwica 2026-11-03). Werdykty i dowody –
w plikach obszarów (`<prefiks>.md`), znaleziska z przygotowania – `0-przygotowanie.md`. Liczby z ekranów („LICZBY →
AU-9”) czekają na wyrocznię (blok C); silnik pieniędzy (`punkty/3-pieniadze.md`) – AU-10; punkty „Maszyna” –
`docs/audyt/maszyna.md`; „Ty” – `docs/audyt/ty.md`. Wagi wstępne – rozstrzyga weryfikacja w AU-11.

| Obszar | Punkty Claude | ZGODNE | LICZBY → AU-9 | UWAGA | NIEZGODNE (K / W / S / N) |
| --- | --- | --- | --- | --- | --- |
| KR kreator | 32 | 17 | 4 | 3 | 8 (– / – / 7 / 1) |
| MO Mostek | 29 | 13 | 9 | 3 | 4 (– / 1 / 2 / 1) |
| SW szybki wpis | 34 | 14 | 14 | 1 | 4 (– / – / 4 / –) |
| OP Operacje | 42 | 20 | 13 | 1 | 8 (– / – / 5 / 3) |
| ME meldunki | 9 | 4 | 3 | 1 | 1 (– / – / – / 1) |
| IM import | 53 | 34 | – | 4 | 14 (1 / 2 / 5 / 6) |
| SA salda | 8 | 6 | – | 1 | 1 (– / – / – / 1) |
| DW Dowództwo | 36 | 26 | 5 | 3 | 1 (– / – / 1 / –) + N w DW.29 |
| WY Wywiad | 27 | 14 | 7 | 3 | 3 (– / – / 2 / 1) |
| RY rytuały | 17 | 12 | 1 | – | 3 (– / – / 1 / 2) |
| RE raporty i eksport | 14 | 11 | 6 | 2 | 3 (– / – / 2 / 1) |
| US Ustawienia | 31 | 16 | 4 | 6 | 3 (– / – / 2 / 1) |
| IN interfejs | 26 | 19 | – | 1 | 6 (– / – / 2 / 4) |
| DA dane i dwa komputery | 43 | 28 | 1 | 7 | 7 (2 / – / 2 / 3) |
| Przygotowanie (P) | – | – | – | – | P.1 (W), P.3 = IM.23 |
| **Razem** | **401** | **234** | **67** | **36** | **66 + P.1 (3 / 3 + P.1 / 35 / 25)** |

Reszta do 401: NIE DO SPRAWDZENIA (zegar, Kosz, dźwięk) i NIE WYKONANO – szczegóły w raportach obszarów.

## Znaleziska krytyczne (K) i wysokie (W)
- **IM.42 (K)** – operacja z banku usunięta przez użytkownika wraca po cichu jako nowa przy imporcie pliku drugiego
  formatu (lista po historii rachunku).
- **DA.40 (K)** – folder danych znika w trakcie pracy: aplikacja tego nie widzi, po ~30 s odtwarza pusty folder w tej
  ścieżce i zapisuje tam nowe wpisy z „Zapisano.” – po powrocie prawdziwego folderu ich nie ma.
- **DA.43 (K)** – zamknięcie aplikacji tuż po zmianie kwoty operacji z banku gubi zmianę bez pytania (7 z 7).
- **P.1 (W)** – Operacje zawieszają okno (React #185), gdy gra trwa dłużej niż ok. 105 dni (każdy folder po ~3,5 mies.).
- **IM.23 = P.3 (W)** – opcja „reszta jako zaliczka” przy wpłacie domownika nie spłaca jego długu (spec, D80 b, D91).
- **IM.39 (W)** – przeniesienie importu na właściwe konto tworzy 17 duplikatów.
- **MO.29 (W)** – „Wycofaj dokowanie” (N-PC-2, CHANGELOG 1.15.2) nie istnieje; podobnie usuwanie kategorii (US.6, N-PC-7).

## Wzorce powtarzające się w wielu obszarach (materiał do wniosków)
- **Ciche odrzucanie i ciche skutki:** zła kwota / data / zakres wraca bez słowa (SW.22–24, US.32, WY.20, RE.15, OP.8);
  rotacje kopii i paczek importu znikają bez informacji (DA, IM.28); import po zamrożeniu dni nie zmienia ocen gry (DW).
- **Dostępność folderu sprawdzana tylko przy otwarciu** (DA.3, DA.40, DA.41) i „Zapisano.” w folderze tylko do odczytu
  (IN.4, DA.39).
- **„Cofnij” niespójne:** brak przy usuwaniu reguł, słów i połączeń nazw (IM.48, IM.13); Esc nie cofa w polach liczbowych
  Ustawień (US.32), a w szybkim wpisie gubi kwotę (SW.31).
- **Teksty:** daty ISO (OP.3, SA.1, IN.21, DA.17), kody decyzji „(D40)” w interfejsie (OP.26, WY.25, DW.34, IN.20),
  angielskie komunikaty systemu (DA), słowo „firmę” (IN.20), brak objaśnień terminów ICT w słowniczku (WY.25, MO.33).
- **Domownicy:** „plan czy impuls” i naruszenie ciszy nocnej przy zakupach domownika (OP.25, OP.26), dwie nazwy jednego
  wyboru celu wpłaty (IM.23), domyślna osoba zamiast wyboru (SW.12, SW.33), „Pokaż zakupy” bez filtra osoby (ME.3).
- **Kreator i pierwszy miesiąc:** krok 6 nie pokazuje skutków startu (KR.12, KR.23), OC zapłacone przed startem obciąża
  pierwszą pensję (KR.16), odpowiedzi kreatora giną przy powrocie banerem (KR.13, KR.31).
- **Spójność liczb między ekranami** (do potwierdzenia wyrocznią): termin asteroidy Mostek vs Ładownia / Radar (MO.11),
  depozyt domowników (MO.20), zasięg 7,9 vs 7,8 (WY.20), suma eksportu vs pasek (OP.39), przychody 12 mies. (RE.14).

## Problemy laboratorium (naprawione w trakcie)
Autostart użytkownika (incydent – `docs/postep.md`), autostart i skrót przy ponownym starcie przebiegu, osierocone
procesy (`killTree`), podpowiedź folderu ICTTJ z prawdziwego `%APPDATA%`, Kosz Windows, zamrażanie dni gry natychmiast
zamiast jak w wydaniu, persona z dniami gry ocenionymi przed importem historii (do wygenerowania od nowa przed AU-9).

## Blok C – AU-9 i AU-10 (03.11.2026, Opus 5.5 · max – D96)

**Przygotowanie (C-0):** persona „rok” od nowa – dni gry zamrażane po imporcie historii banku; stan bloków A–B zachowany
jako `stany\rok-ab` (pieniądze identyczne rekord po rekordzie; gra inna – wrzesień 13/27, październik 22/31 dni zgodnych
zamiast 24/27 i 31/31); pakiet maszyny od nowa. **Wyrocznia** (`docs/audyt/wyrocznia.md`, skrypt
`tests/audyt/wyrocznia/`, 24 testy na przykładach ze specyfikacji i planu) liczy z wymagań, bez kodu aplikacji, odczytów
i raportów; dwie rundy uzgodnienia: u1 (po A–B), u2 (po C). Każdy odczyt bloku C ma migawkę folderu z chwili odczytu
(`C:\FI-audyt\migawki\`), więc wyrocznia liczy dokładnie ten stan, który był na ekranie.

| Obszar | Punkty | ZGODNE | UWAGA | LICZBY → AU-9 | NIEZGODNE (K / W / S / N) | Zegar / poza lab. |
| --- | --- | --- | --- | --- | --- | --- |
| PM Plan miesiąca | 30 | 21 | 2 | 3 | 0 | 1 / 3 |
| LA Ładownia | 19 | 12 | – | 1 | 4 (– / – / 3 / 1) | 1 / 1 |
| DO Dokowanie i granica ICTTJ | 25 | 21 | – | – | 2 (– / 1 / 1 / –) | – / 2 |
| MG Mapa gwiezdna | 12 | 6 | 2 | 1 | 3 (2 / – / 1 / –) | – |
| DM Domownicy i pożyczki | 19 | 15 | 1 | – | 2 (1 / – / 1 / –) + N w DM.18 | – / 1 |
| RA Radar | 14 | 11 | 1 | – | 1 (– / – / 1 / –) | – / 1 |
| PR Przekrój liczb | 11 | 6 | – | (6 z ZGODNYCH) | 3 (– / – / 3 / –) + N w PR.10 | – / 2 |
| **Razem** | **130** | **92** | **6** | **5 (+6 PR)** | **15 (3 / 1 / 10 / 1) + 2 N** | **2 / 10** |

**Liczby wobec wyroczni (u2):**
- Bloki A–B (`LICZBY-AB.md`): 67 punktów – ZGODNE 24 · NIEZGODNE 3 (N – format stopy oszczędności „32%”) · SPRZECZNOŚĆ
  WYMAGAŃ 36 · NIEPORÓWNYWALNE 4; poza nimi NIEZGODNE: KR.12 (S – krok 6 kreatora dzieli saldo bieżące zamiast z początku
  dnia startu), MO.11 i MO.15 (S – termin asteroidy na Mostku z dnia kontenera, na Radarze i w Ładowni z historii
  płatności), WY.20 (S – symulator: zasięg 7,9 bez długu), RY.20, RY.21, RY.24 (N). **Żadna kwota pieniędzy nie jest
  zła.** Gra na nowym stanie = wyrocznia w ocenie każdego z 59 dni, w kwotach naruszeń, stopniu, serii, misji i osiągnięciach.
- Blok C (`LICZBY-C.md`): 11 punktów „LICZBY → AU-9” – ZGODNE 2 (PM.1, PM.5) · NIEZGODNE 1 (PR.8 – N, stopa „55” zamiast „55,0” w eksporcie)
  · SPRZECZNOŚĆ WYMAGAŃ 8 (PM.18, LA.11, PR.1, PR.2, PR.4, PR.5, PR.7, MG.5); odczyty: 429 z 440 porównanych – 182 zgodne,
  239 zgodne z wariantem, 8 rozbieżnych. **Żadna kwota pieniędzy nie jest zła.** W punktach ocenionych przez wykonawców
  wyrocznia potwierdziła błędy aplikacji: C15 (DO.1 / DO.2 – S), C17 (LA.8 – S), C19 (PR.3 – S), C25 (stopa „33%” – N);
  do AU-11: C24 (archiwizacja celu – 250 zł z ręcznego podziału dokowania zostaje w celu; T176 nie mówi, z której chwili)
  i C18 (MG.8 / MG.10).

**Znaleziska K i W bloku C** (wagi wstępne – rozstrzyga weryfikacja w AU-11, dla K druga opinia):
- **DM.18 (K)** – nadwyżka spłaty pożyczki udzielonej (odsetki) trafia do osłon jak spłata, a nie jako przychód (T70);
  zaniżone przychody, bilans paliwa i stopa oszczędności, przy pełnych osłonach także zły podział.
- **MG.8 (K), MG.10 (K)** – „przenieś środki” między celami: silnik przenosi na koniec dnia (T129), a Mapa i Mostek
  pokazują przeniesienie od razu; dostawa zadokowana tego dnia przepełnia cel („Rower” 4 081,08 / 2 500 zł, następny cel
  nic – wbrew D13), wydatek z celu płacą osłony. Wyrocznia z dosłownym T129 daje te same liczby (C18) – do rozstrzygnięcia:
  błąd silnika czy reguły T129 (argument za „w chwili zapisu” z T128 / T131 – `odpowiedzi-c.md`).
- **DO.7 (W)** = MO.29 – „Wycofaj dokowanie” z CHANGELOG 1.15.2 nie istnieje; jest tylko toast „Cofnij” (ok. 6 s).

**S bloku C:** LA.3 (podpowiedź raty liczy zbiornik jak pusty), LA.8 = C17 (rata nowej opłaty 75 zamiast 225 zł –
potwierdzone wyrocznią), LA.10 (fałszywa „nowa cena” 240 → 480 zł po zapłacie przed terminem – „Zaktualizuj” podwoiłby
kontener), DO.5 (zwrot z puli Podatek przed „Zadokuj” – fałszywy alarm firewalla i −300 zł z osłon), MG.12 (DOL na celu,
który nie dostanie dostawy), DM.11 („Wspólnie → procenty” 50/30/10 zapisane jako 50/30/20), RA.4 (niezapłacona opłata
znika z Radaru po przełomie miesiąca), PR.3 = WY.20 = C19 (symulator bez długu), PR.9 (rata pożyczki 100 zł / 3 –
reszta nie w ostatniej części), PR.10 (pensja 0 – przydział bez komunikatu), C15 (wpis ICTTJ po starcie budżetu
oznaczony „sprzed startu”). Spostrzeżenia wykonawców (m.in. „Energia dziś” liczona z kopert przy pensji wypłaconej
w 0 zł, opłata zapłacona przed startem odkładana drugi raz, dostawa „do zadokowania” liczona zwykłą kolejnością mimo
znanej puli) – w raportach obszarów, materiał do AU-11.

**Granica ICTTJ (DO.23):** każdy przebieg z folderem ICTTJ miał sumy SHA-256 przed startem i po zamknięciu – zero
zapisów FI (DO: 16 przebiegów; PM, DM, MG, RA – kopie bajt w bajt jak wzorzec); wzorzec `stany\ictj-rok` niezmieniony
(15:25 i 16:13); folder ICTTJ jako folder danych i kopii – odrzucony z komunikatem.

**Sprzeczności wymagań – co wybrała aplikacja** (decyzje użytkownika – AU-11; opis S1–S10 w `wyrocznia.md`): S1 zasięg
obcięty (T218; przykład „6,5” w specyfikacji do poprawy), S2 „na plus” wg T178, S3 łupy = niewydana energia (T28),
S4 wpłata domownika według `inflowKind` z 1.15.3 (Marek: 360 zł od 20.08 zamiast 300 zł od 24.09 według
spec / D80 b / D91), S5 N-PC-19, S6 / S7 energia dziś i Daily Bias według T295, S8 / S9 wariant B gry, S10 każda opłata
okresowa, C14 „Portfel XTB?” przy wierszach bez importu, C16 koszty miesiąca z operacjami z datą przyszłą, C20 odkładki
przy pensji 0, C21 „Razem” jako suma zaokrąglonych części. Do potwierdzenia: R-3 (koperty planowe w miesiącu startu
liczą wydatki od 1. dnia – wyrocznia domknęła lukę analogią do T45).

**Metoda – uwagi:**
- Jedyny wyjątek ślepoty wyroczni – schematy danych `src/shared/schema` (format pól). Ich czytanie samo wczytało do jej
  kontekstu `.claude/rules/silnik.md` (niezmienniki i mapa modułów, bez wzorów i liczb) – zapisane w `wyrocznia.md`;
  następnym razem wyrocznia dostaje kopię schematów spoza `src/`.
- Uzgodnienie: rozbieżność wracała do wyroczni z wartością aplikacji (nadal bez kodu). A–B: 9 poprawek wyroczni, 3 błędy
  aplikacji, 7 luk; C: 14 poprawek, 3 błędy aplikacji, 4 luki, 2 pozycje policzone od nowa (= aplikacja), C18 informacyjna.
- Przekrój bloku C przerwał błąd serwera API (500) – wznowiony z zachowanym kontekstem, bez strat.
- CI gałęzi audytu jest czerwone od AU-2 (nie z powodu bloku C): typecheck obejmuje skrypty laboratorium `tests/audyt/`
  (typy DOM w `page.evaluate`), a dwa testy E2E aplikacji (`recover`, `repayments`) mają daty na sztywno z października
  2026 i od 1.11 padają (lista Operacji pokazuje bieżący miesiąc) – `main` padnie tak samo; propozycja w `docs/postep.md`.

## AU-11 – synteza (03.11.2026)
Skonsolidowany raport z werdyktami weryfikacji i drugą opinią Fable: `docs/audyt/raport.md` (80 znalezisk AF – K 4,
W 6, S 25, N 35; wagi końcowe nadpisują wstępne z tego pliku); wnioski, propozycje AP i plan grup N1–N5:
`docs/audyt/wnioski.md`; weryfikacje: `WERYFIKACJA-1…5.md`, `WERYFIKACJA-FABLE.md`.
