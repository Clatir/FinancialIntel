# Audyt 1.15.4 – raport DO: Dokowanie z ICTTJ i granica ICTTJ (AU-10, blok C)

- Data: 2026-11-03, 15:25–16:20 (prawdziwy zegar, bez zmian zegara systemu).
- Wersja: 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4\app\Financial Intel.exe`), uruchamiana przez
  `tests/audyt/lab.ts` (jako portable, `FI_ICTJ_LAUNCH=dry`, okna poza ekranem).
- Stan danych: persona `rok` (kotwica 2026-11-03, start budżetu 2025-09-01, wygenerowana 03.11.2026 ok. 15:17) z kopią
  folderu ICTTJ `stany\ictj-rok`; stany `spec-dok` A i B zbudowane od zera (seedFolder) z własnym folderem ICTTJ; kopie
  `rok` zmienione przed startem (opis w „Zbudowane stany”).
- Podsumowanie (25 punktów): **ZGODNE 21**, **NIEZGODNE 2** (K 0 · W 1 · S 1 · N 0), UWAGA 0, LICZBY → AU-9 0 (kwoty
  podane w punktach oceniłem sam; liczby bezwzględne stanu `rok` są w odczytach dla AU-9), NIE DO SPRAWDZENIA 0 (część
  DO.17 zależna od zegara → maszyna), poza laboratorium 2 (DO.20 maszyna, DO.24 Ty). Dwa kandydaty na znaleziska spoza
  kroków punktów – Spostrzeżenia 1 i 2.
- **Granica ICTTJ: 16 przebiegów, w każdym folder ICTTJ bajt w bajt bez zmian; wzorzec `stany\ictj-rok` przed i po pracy
  identyczny** (sekcja „Granica ICTTJ”). Znalezisk K brak.
- Skrypty: `tests/audyt/do-0-zwiad.spec.ts`, `do-1-spec-dok`, `do-2-spec-dok-b`, `do-3-pule`, `do-3b-pule`,
  `do-4-portfel`, `do-4b-inna-kwota`, `do-5-pary`, `do-6-wpisy`, `do-7-ustawienia`, `do-8-zrzut-do5`, `do-9-meldunki`,
  `do-10-znika`; pomoc `tests/audyt/do-pomoc.ts`. Logi: `C:\FI-audyt\przebiegi\do-*\do.log`, `granica.log`,
  `granica-*.sha256`.
- Odczyty liczb: 84 w `C:\FI-audyt\odczyty\do.jsonl`; przy każdym migawka `C:\FI-audyt\migawki\do\<punkt>-<n>` (`dane` bez
  `backups` i `.history`, `ictj`), ścieżka w polu `_migawka`.

## Zbudowane stany

| Stan / przebieg | Jak zbudowany (wszystko przed `start()`, chyba że zaznaczono „na żywo”) | Punkty |
| --- | --- | --- |
| `spec-dok` A (`do-1`) | seedFolder: start budżetu **2026-11-01**; saldo otwarcia mBank 29 640,00 zł (2026-11-01); `budget.initial` kadłub 15 000, cel „Rower” 2 000 (reszta do osłon); cel własny „Rower” 3 000 zł, priorytet 1; plan 2026-11 pensja 4 000 zł; `layers` 3 pensje / 6 mies., `assumedCosts` 3 650 zł. Po pensji 01.11: osłony 8 640 / 12 000, kadłub 15 000 / 21 900. Własny folder ICTTJ (journal.json); dopisane: wypłata 5 000 zł „Bieżące” 03.11 (przed fazą 1), wypłata 3 000 zł „Bieżące” 03.11 (przed fazą 3). mBank: wpływ XTB 5 000 zł 03.11 (przed fazą 2), 3 000 zł 03.11 (przed fazą 3). | DO.1, DO.6 |
| `spec-dok` B (`do-2`) | seedFolder jak A, ale otwarcie 39 400 zł; initial kadłub 20 900, Rower 2 500 → osłony 12 000 / 12 000, kadłub 20 900 / 21 900; Rower 2 500 / 3 000 (p1); scenariusz ICTTJ „Plan audytu” (firstMonth 2026-11) z celem „Laptop” 5 000 zł (FI zakłada go sam – p2, 0 / 5 000); wypłata 8 000 zł „Nadwyżki w masie” 03.11 + wpływ w mBanku; potem zwrot 1 000 zł (Bieżące) z wypływem w mBanku, potem zwrot 2 000 zł z wypływem. | DO.2, DO.18 |
| rok + pule (`do-3`, `do-3b`) | Kopia `rok`. ICTTJ: scenariusz „Plan główny” – „Wkład własny – mieszkanie” `enabled: false`, „Nowe stanowisko tradingowe” 1 000 zł (`updatedAt` 03.11); wypłata 1 500 zł Cele 02.11 + wpływ 1 500 zł 03.11 w mBanku. Odpowiednik nazw punktu: „Rower” (własny, wyżej na liście, brakuje ≥ 500) = „Wakacje 2027” (p2; „Nowy laptop” p1 pełny), „Laptop” (ICTTJ, brakuje 1 000) = „Nowe stanowisko tradingowe” (p3). Wariant 2: cel „Wakacje 2027” = jego kwota (2 638,96 zł), wypłata 700 zł Cele + wpływ. Podatek: wypłata 2 000 zł Podatek 02.11 + wpływ 02.11; przelew do US 1 800 zł (rodzaj „tax”, mBank) 03.11; drugi wpis 2 000 zł Podatek 03.11 + wpływ; w `do-3b` wpis 2 000 zł Podatek 21.10 + wpływ 21.10 i przelew do US 1 800 zł 22.10 (pełny miesiąc – Wywiad). Zwrot 300 zł Podatek 03.11 + wypływ 300 zł. Zwrot 500 zł Bieżące 03.11 + wypływ 500 zł, dopłata 200 zł do XTB tylko w mBanku 03.11. | DO.3, DO.4, DO.5, DO.17 |
| rok + Portfel (`do-4`, `do-4b`, `do-9`) | Kopia `rok`; `import.coveredTo` mBank = 02.11 (plik banku obejmuje dni po oknie). ICTTJ: 800 zł 27.10, 400 zł 02.11, 350 zł 03.11, 1 000 zł 02.11 (Bieżące). mBank: wpływ 3 200 zł 02.11 (para wpisu persony 31.10), 998,50 zł 03.11. Portfel XTB: ręczny wydatek 45 zł 27.10. Szybkim wpisem (UI): wpływ 350 zł na Portfelu XTB dziś. `do-4b`: kopia `rok`, `coveredTo` = 29.10 (ostatni wiersz banku 26.10), wpis 600 zł 27.10; potem wpis 1 000 zł 02.11 i wpływ 998,50 zł 03.11. `do-9`: `coveredTo` 02.11, na żywo wpis 820 zł 27.10. | DO.7, DO.8, DO.11, DO.12, DO.19 |
| rok + pary (`do-5`) | Kopia `rok`. ICTTJ: 600 zł 02.04.2026, 700 zł 23.12.2025, 1 100 zł 28.08.2025, 1 200 zł 31.08.2025 (Bieżące). mBank: 600 zł 08.04.2026, 700 zł 31.12.2025, 1 100 zł 29.08.2025 (przed startem), 1 200 zł 02.09.2025, 3 200 zł 02.11 (para wpisu 31.10). Faza 2: wpływ XTB 1 000 zł 02.11 bez wpisu; na żywo dopisany wpis 1 000 zł Cele 02.11. | DO.9, DO.10, DO.15, DO.16 |
| rok + wpisy (`do-6`) | Kopia `rok`; drugie dokowanie wpisu 19.10 (3 000, Nadwyżki) na Portfelu XTB (operacja +3 000 z 19.10 i dokowanie, `updatedBy` DRUGI-PC, utworzone 21.10). Na żywo: notatka i `updatedAt` wpisów 19.10 i 20.07; usunięcie pliku wpisu 20.07, przywrócenie z pulą Cele; wpływ 3 200 zł 02.11; nowe wypłaty 650 zł, potem 710 / 720 / 730 zł. Faza 2: wpis v2 z nieznanymi polami (900 zł), pula „bonus” (450 zł), uszkodzony JSON, „expense” 120 zł, ten sam id w dwóch plikach (250 zł 02.11 i 260 zł 03.11, nowszy `updatedAt`), kopia „… (1).json”; wpływy 900 i 450 zł w mBanku. | DO.13, DO.14, DO.19, DO.22 |
| rok bez FI_ICTJ_DIR (`do-7`, `do-10`) | Kopia `rok`; folder ICTTJ wybierany w Ustawieniach (config.json ICTTJ w appdata przebiegu dopisany po starcie); folder `nie-ictj` bez journal.json; drugi `userData` (`do-7-drugi`); `do-10`: zmiana nazwy kopii ICTTJ przy zamkniętej aplikacji, powrót przy otwartej; przebiegi bez programu ICTTJ (`-bez-ictj`): `LOCALAPPDATA` przebiegu i `PATH` bez narzędzi systemu; atrapa `.exe` (nigdy nieuruchomiona). `do-7-ro`: świeża kopia `ictj-rok` z atrybutem tylko do odczytu na wszystkich plikach. `do-8`: kopia migawki DO.5-1 (dowód DO.5). | DO.5, DO.21, DO.23, DO.25 |

## Punkty

### DO.1 – ZGODNE
- Stan: `spec-dok` A, przebieg `do-1`, 15:39–15:40 (odczyty DO.1-1…4).
- Zrobione: faza 1 – Mostek przed wpływem (wpis ICTTJ 5 000 zł z 03.11 jest, wpływu w mBanku jeszcze nie ma); faza 2 –
  wpływ 5 000 zł od XTB w mBanku z 03.11, Mostek, „Dokowanie (1)” → wiersz → okno → „Zadokuj”.
- Widać: przed wpływem „Osłony · bufor na pensje 8 640,00 zł / 12 000,00 zł”, „Kadłub 15 000,00 zł / 21 900,00 zł”,
  „ZASIĘG 6,4 mies.”, „KLASA Niszczyciel”; wiersz „03.11.2026 Wypłata z ICTTJ · Bieżące do zadokowania +5 000,00 zł”;
  okno: „Źródło Wypłata z ICTTJ · 03.11.2026 BIEŻĄCE +5 000,00 zł”, „Konto mBank – wpływ 03.11.2026 (XTB S.A.)”,
  „Osłony bufor na pensje (reszta) 3 360,00 zł”, „Kadłub” 1 640,00, „Rower” 0,00; po „Zadokuj” okno „Zadokowano”,
  toast „Zadokowano 5 000,00 zł.” z „Cofnij”, wiersz „zadokowana”; „12 000,00 zł / 12 000,00 zł”,
  „16 640,00 zł / 21 900,00 zł”, „7,8 mies.”, „Niszczyciel”.
- Oczekiwane: 3 360 / 1 640 / 0, osłony 12 000 / 12 000, kadłub 16 640 / 21 900, zasięg 6,4 → 7,8, Niszczyciel – zgodne.
  Uwaga do obrazu: od chwili, gdy wpływ jest w mBanku (przed „Zadokuj”), Mostek już pokazuje 12 000 / 16 640 / 7,8 –
  niezadokowana dostawa liczy się zwykłą kolejnością (zob. Spostrzeżenia 1). Przed wpływem wpis był „sprzed startu”
  (Spostrzeżenia 2).
- Zrzut: DO.1-przed-wplywem.png, DO.1-mostek-przed.png, DO.1-okno.png, DO.1-toast.png, DO.1-po.png

### DO.2 – ZGODNE
- Stan: `spec-dok` B, przebieg `do-2`, 15:42–15:43 (DO.2-1…4).
- Zrobione: Mostek i Mapa gwiezdna przed wpływem; wpływ 8 000 zł w mBanku; okno → „Zadokuj”; Mostek, Mapa gwiezdna.
- Widać: przed – „12 000,00 zł / 12 000,00 zł”, „20 900,00 zł / 21 900,00 zł”, „Rower 2 500,00 zł”, „Laptop ICTTJ
  DOL · pula Cele 0,00 zł/5 000,00 zł” (p2); okno – „Osłony … 1 500,00 zł”, „Kadłub” 1 000,00, „Rower” 500,00,
  „Laptop” 5 000,00; toast „Zadokowano 8 000,00 zł.”; po – „13 500,00 zł / 12 000,00 zł”, „wolne do decyzji: 1 500,00 zł”,
  „21 900,00 zł / 21 900,00 zł”, Mapa: „Rower 3 000,00 zł/osiągnięty”, „Laptop 5 000,00 zł/5 000,00 zł osiągnięty”.
- Oczekiwane: kadłub +1 000, Rower +500, Laptop +5 000, reszta 1 500 „wolne do decyzji” – zgodne.
- Zrzut: DO.2-mapa-przed.png, DO.2-okno.png, DO.2-mostek-po.png, DO.2-mapa-po.png

### DO.3 – ZGODNE
- Stan: rok + pule, przebieg `do-3b` 15:58 (wariant 1, para w mBanku; DO.3-8…10) i `do-3` 15:45–15:47 (wariant 2;
  DO.3-4…6). Odpowiednik nazw punktu – w „Zbudowane stany”.
- Zrobione: Mapa gwiezdna przed; okno wypłaty 1 500 zł Cele (02.11, wpływ 03.11 w mBanku) → „Zadokuj”; Mapa; wariant 2 –
  wszystkie cele pełne, wypłata 700 zł Cele → okno → „Zadokuj”.
- Widać: przed – „Nowe stanowisko tradingowe … ICTTJ DOL · pula Cele 0,00 zł/1 000,00 zł”, „Wakacje 2027 … DOL
  4 138,96 zł”, osłony „14 500,00 zł / 19 500,00 zł” (poniżej celu); okno – „Konto mBank – wpływ 03.11.2026 (XTB S.A.)”,
  „Osłony czego cele nie potrzebują 0,00 zł”, „Nowe stanowisko tradingowe” 1 000,00, „Wakacje 2027” 500,00, notka
  „Propozycja według kolejności dokowania – pula Cele: prosto do celów, najpierw cele z prognozy ICTTJ.”; po –
  „Nowe stanowisko tradingowe 1 000,00 zł/1 000,00 zł osiągnięty”, „Wakacje 2027 4 638,96 zł”. Wariant 2 – okno
  „Osłony czego cele nie potrzebują 700,00 zł”, cele 0,00.
- Oczekiwane: cel ICTTJ najpierw (1 000), potem cel własny wyżej na liście (500), osłony 0 mimo niepełnych; wariant 2 –
  całość do osłon – zgodne. (W `do-3` ten sam podział dał też wpis 25.10 – Cele 1 500 bez pary, na Portfelu XTB.)
- Zrzut: DO.3-mapa-przed-b.png, DO.3-okno-mbank.png, DO.3-okno-wariant2.png, DO.3-mapa-po.png

### DO.4 – ZGODNE
- Stan: rok + pule, `do-3` 15:47–15:48 (DO.4-1…6, M0 listopad) i `do-3b` 15:58–15:59 (DO.4-8, 9; październik, Wywiad).
- Zrobione: okno wpisu Podatek 2 000 zł → „Zadokuj”; Mostek, Radar, Plan miesiąca; przelew do US 1 800 zł; drugi wpis
  Podatek 2 000 zł – w oknie „Na podatek” 1 500 (osłony 500) → „Zadokuj”. Przychód: ten sam przypadek w pełnym miesiącu
  (21.10) – Wywiad → „Bilans paliwa”, wiersz „październik 2026”.
- Widać: okno – wiersz „Podatek poza budżetem, na PIT-38” 2 000,00, „Osłony … 0,00 zł”, notka „… – pula Podatek: poza
  budżetem.”; po – Mostek „Podatek · poza budżetem (PIT-38) 2 000,00 zł”, Radar „Wypłacone na podatek (poza budżetem):
  2 000,00 zł”, osłony 15 200 jak przed wpływem, energia 6 204,63 bez zmian; po przelewie do US – „Podatek … 200,00 zł”,
  Radar „… 200,00 zł”, energia bez zmian; po 1 500 / 500 – „Podatek … 1 700,00 zł”, osłony +500. Październik: wyjściowo
  „przychód 11 500,00 · koszty 5 413,19”, po dokowaniu 1 500 / 500 „12 000,00 · 5 413,19”, po przelewie do US
  „12 000,00 · 5 413,19”.
- Oczekiwane: całość w „Podatek”, osłony 0, Mostek = Radar, nie przychód i nie koszt, przelew zmniejsza „Podatek” i nie
  jest kosztem, przy podziale przychodem tylko 500 – zgodne po zadokowaniu. Przed „Zadokuj” zaimportowany wpływ z puli
  Podatek liczy się jak zwykła dostawa: osłony +2 000, przychód października +2 000 (13 500,00) – zob. DO.5
  i Spostrzeżenia 1.
- Zrzut: DO.4-okno.png, DO.4-mostek-po.png, DO.4-radar.png, DO.4-okno-2.png, DO.4-wywiad-pazdziernik.png

### DO.5 – NIEZGODNE (S)
- Stan: rok + pule, przebieg `do-3` 15:48–15:49 (DO.5-1, 2); dowód ponownie z migawki DO.5-1 w przebiegu `do-8`.
- Zrobione: wpis ICTTJ „return” 300 zł z puli Podatek (03.11) i wypływ 300 zł do XTB w mBanku (03.11), przy „Podatek”
  1 700 zł; Mostek → odprawa, „Dokowanie” → „Zwrot do masy” → okno → „Zadokuj”; odprawa, Dowództwo.
- Widać: zanim zwrot zadokowano, odprawa: „Firewall: dopłata do XTB 300,00 zł wbrew rozkazowi.” (czerwony alarm, pierwszy
  w odprawie) obok „Zwrot do masy z ICTTJ 300,00 zł (03.11, pula Podatek) do potwierdzenia – wraca z rezerwy na
  PIT-38.”; osłony „15 400,00 zł” (−300), „Podatek … 1 700,00 zł”; podsumowanie odprawy „Energia dziś 77,28 zł. Daily Bias:
  Neutral. Firewall: dopłata do XTB 300,00 zł wbrew rozkazowi.”; Dowództwo „Dziś na razie: naruszenie | Dopłata do XTB
  wbrew firewallowi: 300,00 zł” (`do-8`, ten sam stan z migawki). Okno: „Zwrot z puli Podatek: wraca z rezerwy na PIT-38,
  nie z budżetu.” (szary). Po „Zadokuj”: osłony 15 700,00 (bez zmian), „Podatek … 1 400,00 zł”, alarm znika, Dowództwo
  „Poważne naruszenia w tym miesiącu 0 / 3” bez naruszenia dziś.
- Oczekiwane: bez czerwonego alarmu i naruszenia, osłony bez zmian (punkt: „Nie przechodzi, gdy: czerwony firewall albo
  osłony −300 zł”). Po zadokowaniu zgodne, ale od importu do kliknięcia „Zadokuj” aplikacja pokazuje czerwony alarm
  firewall i odejmuje 300 zł z osłon – kapitan widzi „wbrew rozkazowi” przy zwrocie z rezerwy podatkowej.
- Kroki: kopia `rok`; w folderze ICTTJ wpis `return` 300 zł `pool: tax`; w mBanku wypływ 300 zł do XTB z tego dnia (przy
  `Podatek` > 0); Mostek, odprawa – przed zadokowaniem.
- Zrzut: DO.5-mostek-przed-dokowaniem.png, DO.5-dowodztwo-przed-dokowaniem.png, DO.5-okno.png

### DO.6 – ZGODNE
- Stan: `spec-dok` A po DO.1, przebieg `do-1` faza 3, 15:39–15:40 (DO.6-1…4).
- Zrobione: wypłata 3 000 zł Bieżące + wpływ; okno → kadłub 1 000, Rower 300; kadłub 3 000 (razem 3 300);
  „przywróć propozycję”; ponownie 1 000 / 300 → „Zadokuj”; okno zadokowanej → 200 / 1 000 → „Zapisz podział”.
- Widać: „Osłony … 1 700,00 zł”; przy 3 300 „Osłony … −300,00 zł” i „Podział przekracza kwotę dostawy o 300,00 zł.”,
  „Zadokuj” nieaktywny; po „przywróć propozycję” 0 / 3 000 / 0; po „Zadokuj” zapisany podział 1 700 / 1 000 / 300,
  „13 700,00 zł / 12 000,00 zł”, „ponad cel osłon: 1 700,00 zł – kadłub niepełny, nie do dopłaty XTB”, kadłub
  „17 640,00 zł”, Rower 2 300,00; po „Zapisz podział” to samo dokowanie (ten sam id, nowy `updatedAt`), jedna operacja
  3 000 zł, „13 800,00 zł”, kadłub „16 840,00 zł”, „Rower 3 000,00 zł/osiągnięty”.
- Oczekiwane: osłony = 3 000 − 1 000 − 300, komunikat i blokada ponad kwotę, warstwy według podziału, „Zapisz podział” bez
  nowej operacji i drugiego dokowania – zgodne. Reszta przy niepełnym kadłubie podpisana „ponad cel osłon … kadłub
  niepełny” zamiast „wolne do decyzji” – zgodnie z T181. Toast po „Zapisz podział”: „Zadokowano 3 000,00 zł.”
  (Spostrzeżenia 5).
- Zrzut: DO.6-okno-1000-300.png, DO.6-ponad.png, DO.6-zapisz-podzial.png, DO.6-po.png

### DO.7 – NIEZGODNE (W)
- Stan: rok + Portfel, przebieg `do-4` 15:51–15:53 (DO.7-1…6).
- Zrobione: zadokowano 800 zł na Portfelu XTB i 3 200 zł z parą w mBanku; szukano „Wycofaj dokowanie” na Mostku
  i w oknie zadokowanej dostawy; „Cofnij” z toastu po dokowaniu z mBanku (zwrot 05.03) i na Portfelu (wpis 25.10, Cele).
- Widać: „Wycofaj dokowanie” na Mostku – 0 wystąpień; okno zadokowanej („Portfel XTB – wpływ 27.10.2026 (XTB)”) ma tylko
  „Historia | Anuluj | Zapisz podział”. „Cofnij” z toastu: dokowanie znika, operacja z banku zostaje, operacja Portfela
  XTB utworzona przy dokowaniu znika („operacje Portfela przed = po Cofnij: true”), ręczny wydatek 27.10 bez zmian,
  warstwy i saldo Portfela jak przed dokowaniem (4 673,89 zł).
- Oczekiwane: „Wycofaj dokowanie” na Mostku (CHANGELOG 1.15.2, N-PC-2). Nie przechodzi: „brak „Wycofaj dokowanie” na
  Mostku”. Cofnięcie działa tylko przez 6 s toastu – dokowania sprzed chwili nie da się wycofać (to samo co MO.29).
- Zrzut: DO.7-okno-portfel.png, DO.8-panel.png

### DO.8 – ZGODNE
- Stan: rok + Portfel, `do-4` 15:50–15:51 (DO.8-1, 2) i `do-4b` 16:00 (wpis 600 zł).
- Zrobione: panel i okna wpisów 800 zł (27.10, bez pary, plik banku do 02.11), 400 zł (02.11), 600 zł (27.10, plik banku
  kończy się 29.10); 800 → „Zadokuj na Portfelu XTB”; Ustawienia → Konta (saldo Portfela).
- Widać: 800 – znaczek „Portfel XTB?”, „W mBanku nie ma tej kwoty od XTB po 3 dniach roboczych – najpewniej Portfel XTB.
  Potwierdź albo poczekaj na import.”, przycisk „Zadokuj na Portfelu XTB”; toast „Zadokowano 800,00 zł na Portfelu XTB.”;
  operacja Portfela „2026-10-27 trading +800,00 „Wypłata z ICTTJ (pula Bieżące)””; saldo Portfela 3 873,89 → 4 673,89 zł;
  podział zwykłą kolejnością (na dzień 27.10). 400 – „czeka na import”, „Wpływ z XTB w mBanku jeszcze nie przyszedł – FI
  czeka na import do 05.11.2026. Jeśli pieniądze poszły na Portfel XTB, zadokuj teraz.” 600 – „czeka na import”, „… FI
  czeka na import do 30.10.2026. …”, odprawa „Wypłata z ICTTJ 600,00 zł (27.10) czeka na import z mBanku.”
- Oczekiwane: jak w punkcie – zgodne. Dopisek: w `do-4` faza 2 ten sam wpis 600 zł dostał „Portfel XTB?”, bo w folderze
  były już wiersze banku z 02–03.11 (najnowszy wiersz banku przeważa nad końcem pliku) – stan mój, nie błąd.
- Zrzut: DO.8-panel.png, DO.8-okno-800.png, DO.8-okno-400.png, DO.8-okno-600-plik-w-oknie.png, DO.8-toast.png

### DO.9 – ZGODNE
- Stan: rok + pary, przebieg `do-5` faza 1, 16:02 (DO.9-1, 2).
- Zrobione: Mostek → „Dokowanie” → okna wpisów 600 zł (02.04.2026, czwartek; 06.04 Poniedziałek Wielkanocny) i 700 zł
  (23.12.2025, wtorek; 24–26.12 wolne), wpływy 600 zł 08.04.2026 i 700 zł 31.12.2025.
- Widać: wiersze „02.04.2026 Wypłata z ICTTJ · Bieżące do zadokowania +600,00 zł” i „23.12.2025 … do zadokowania
  +700,00 zł” bez znaczków; okna „Konto mBank – wpływ 08.04.2026 (XTB S.A.)” i „Konto mBank – wpływ 31.12.2025 (XTB
  S.A.)”, przycisk „Zadokuj”.
- Oczekiwane: oba wpisy sparowane, bez „Portfel XTB?” i „inna kwota” – zgodne.
- Zrzut: DO.9-panel.png, DO.9-okno-600_00.png, DO.9-okno-700_00.png

### DO.10 – ZGODNE
- Stan: rok + pary, przebieg `do-5` faza 2, 16:03–16:04 (DO.10-1…5).
- Zrobione: wpływ „XTB S.A.” 1 000 zł w mBanku 02.11 bez wpisu → odprawa, okno → „Zadokuj”; potem (aplikacja otwarta)
  dopisany w kopii ICTTJ wpis 1 000 zł Cele 02.11 → panel, odprawa → okno → „Zadokuj”; Ustawienia → ICTTJ → „Nie czytaj
  ICTTJ na tym komputerze” → Mostek.
- Widać: wiersz „02.11.2026 Wpływ z XTB · bez wpisu w ICTTJ do zadokowania +1 000,00 zł”; odprawa „Wpływ z XTB 1 000,00 zł
  (02.11) do zadokowania – dopisz wypłatę w ICTTJ.”; okno „Bez wpisu w ICTTJ – dokuje zwykłą kolejnością. Dopisz tę wypłatę
  w ICTTJ (z pulą): FI połączy ją sama.”; po dokowaniu odprawa „Wpływ z XTB 1 000,00 zł z 02.11 bez wpisu w ICTTJ –
  dopisz wypłatę w ICTTJ.”. Po dopisaniu wpisu (bez restartu) wiersz „02.11.2026 Wypłata z ICTTJ · Cele do zadokowania
  +1 000,00 zł”, przypomnienie zniknęło, okno „pula Cele … „Wkład własny – mieszkanie” 1 000,00”; po „Zadokuj” to samo
  dokowanie (ten sam id, `ictjEntryId` i `pool: goals`), osłony 17 200 → 16 200, cele +1 000. Bez folderu ICTTJ: „Wypłaty
  z ICTTJ: wybierz folder ICT Trade Journal w Ustawieniach ›”, odprawa „Wpływ z XTB 1 000,00 zł (14.10) do zadokowania.”
  – bez „dopisz wypłatę”. Wpływy od pracodawcy (persona, co miesiąc) nie pojawiają się w „Dokowaniu” ani w odprawie.
- Oczekiwane: jak w punkcie – zgodne (bez podwójnego dokowania; zwykły wpływ bez okna).
- Zrzut: DO.10-mostek.png, DO.10-okno.png, DO.10-okno-polaczony.png, DO.10-bez-ictj.png

### DO.11 – ZGODNE
- Stan: rok + Portfel, `do-4` 15:53 (DO.11-1…3).
- Zrobione: szybki wpis (okno szybkiego wpisu): „Wpływ” 350 zł, „XTB”, konto Portfel XTB, dziś; okno wpisu ICTTJ 350 zł
  (03.11) → „Zadokuj” → „Cofnij” → ponownie „Zadokuj”; operacje Portfela z folderu, saldo w Ustawieniach.
- Widać: okno „Na Portfelu XTB jest już wpływ 350,00 zł z 03.11.2026 – „Zadokuj” zrobi z niego tę wypłatę (bez drugiej
  operacji).”, „Konto Portfel XTB – wpływ 03.11.2026 (XTB)”, przycisk „Zadokuj”; po dokowaniu jedna operacja
  „2026-11-03 trading 35000” (wcześniej „income 35000”), saldo Portfela 5 023,89 zł przed i po (wpływ liczony raz);
  „Cofnij” – operacja znów „income”, wpis „do zadokowania”.
- Oczekiwane: jak w punkcie – zgodne.
- Zrzut: DO.11-okno.png, DO.11-operacje.png

### DO.12 – ZGODNE
- Stan: rok, przebieg `do-4b` faza 2, 16:01 (DO.12-5…7; wcześniejsze DO.12-1…4 – zob. „Odczyty liczb”).
- Zrobione: wpis 1 000,00 zł 02.11, wpływ z XTB 998,50 zł 03.11 → panel → okno → „Zadokuj”; Ustawienia → Konta.
- Widać: wiersz „02.11.2026 Wypłata z ICTTJ · Bieżące INNA KWOTA do zadokowania +1 000,00 zł”; okno „W banku jest wpływ z XTB
  z 03.11.2026 na 998,50 zł – różni się od wpisu o 1,50 zł (przewalutowanie, prowizja, literówka?). „Zadokuj” połączy je:
  liczy się kwota z banku.”, „Osłony … 998,50 zł”; brak „Portfel XTB?” i brak wiersza „Wpływ z XTB · bez wpisu w ICTTJ” dla
  998,50; po „Zadokuj” jedna operacja 998,50 zł, „Suma kont budżetu: 74 609,07 zł” bez zmian, saldo mBank 70 745,54 zł bez
  zmian; wiersz „… ROZBIEŻNOŚĆ zadokowana +1 000,00 zł”.
- Oczekiwane: podział od 998,50, bez podwójnego liczenia – zgodne. Toast po dokowaniu „Zadokowano 1 000,00 zł.” podaje kwotę
  wpisu, nie zadokowaną 998,50 (Spostrzeżenia 5).
- Zrzut: DO.12-panel.png, DO.12-okno.png

### DO.13 – ZGODNE
- Stan: rok + wpisy, przebieg `do-6` faza 1, 16:04–16:06 (DO.13-1…4).
- Zrobione: w folderze FI drugie dokowanie wpisu 19.10 (3 000 zł, Nadwyżki) na operacji Portfela XTB +3 000 zł (jak
  z drugiego komputera); start, zamknięcie, start; w kopii ICTTJ zmiana `note` i `updatedAt` wpisów 19.10 i 20.07 przy
  otwartej aplikacji (35 s); okno 19.10 → „Usuń nadmiarowe”.
- Widać: „19.10.2026 Wypłata z ICTTJ · Nadwyżki w masie PODWÓJNIE zadokowana +3 000,00 zł”, „Suma kont budżetu:
  76 610,57 zł”, cele 11 138,96 zł (podwójnie, jak zapowiada okno); po restarcie i zmianie notatki to samo, wpisy
  „zadokowana”, okno pokazuje „„zmieniona notatka (audyt)””; okno: „Ten wpis zadokowano 2 razy (np. na dwóch komputerach
  przed synchronizacją) – pieniądze liczą się podwójnie.” i „Usuń nadmiarowe”; po nim toast „Usunięto podwójne dokowanie
  i jego operację na Portfelu XTB.” z „Cofnij”, zostaje jedno dokowanie (na operacji z mBanku), operacja Portfela usunięta,
  „Suma kont budżetu: 73 610,57 zł”, cele 8 138,96 zł (jak w stanie `rok` z jednym dokowaniem).
- Oczekiwane: jak w punkcie – zgodne (zmiana notatki nie zmienia stanu; po „Usuń nadmiarowe” warstwy jak po jednym).
- Zrzut: DO.13-panel.png, DO.13-okno.png

### DO.14 – ZGODNE
- Stan: rok + wpisy, przebieg `do-6` faza 1b, 16:06–16:07 (DO.14-1…6).
- Zrobione (aplikacja otwarta): usunięcie pliku wpisu 20.07 (4 500 zł, Bieżące, zadokowany z mBankiem 21.07) → Mostek,
  okno; przywrócenie pliku z `pool: goals` → okno → „Zapisz podział”; zadokowanie wpisu 31.10 (para 02.11) → Operacje →
  ta operacja → kosz → „Usuń na pewno” → „Cofnij”.
- Widać: po 1 s „21.07.2026 Wpływ z XTB · bez wpisu w ICTTJ WPIS USUNIĘTY do zadokowania +4 500,00 zł”, okno „Wpis tej
  wypłaty usunięto w ICTTJ – pula, z którą ją zadokowano, już nie obowiązuje. Zadokuj ponownie (zwykłą kolejnością) albo
  dopisz wpis w ICTTJ: FI połączy go sama.”, warstwy bez zmian (73 610,57 / cele 8 138,96); po przywróceniu „20.07.2026
  Wypłata z ICTTJ · Cele PULA ZMIENIONA zadokowana”, okno „Pula wpisu zmieniła się w ICTTJ po dokowaniu (było: Bieżące) –
  „Zapisz podział” zadokuje z obecną pulą.”; po „Zapisz podział” to samo dokowanie z `pool: goals`, cele 8 138,96 →
  9 000,00 zł (pozostałe kwoty historii przeliczone – liczby → AU-9). Usunięcie operacji: toast „Usunięto: XTB S.A.
  3 200,00 zł (02.11.2026).” z „Cofnij” – dokowanie i operacja 0 / 0, po „Cofnij” 1 / 1, warstwy jak przed.
- Oczekiwane: jak w punkcie – zgodne (pieniądze nie znikają, znaczki są, bez dokowania bez operacji).
- Zrzut: DO.14-wpis-usuniety.png, DO.14-pula-zmieniona.png, DO.14-usunieta-operacja.png

### DO.15 – ZGODNE
- Stan: rok + pary, przebieg `do-5` faza 1, 16:02 (DO.15-1, 2).
- Zrobione: wpis 1 100 zł 28.08.2025 z parą 29.08.2025 (przed startem 01.09.2025); wpis 1 200 zł 31.08.2025 z parą
  02.09.2025; Mostek → „Pominięte i sprzed startu (1)”; okno 1 200 → „Zadokuj”.
- Widać: „Pominięte i sprzed startu (1) · 28.08.2025 Bieżące · sprzed startu 1 100,00 zł” (bez przycisku dokowania);
  „31.08.2025 Wypłata z ICTTJ · Bieżące do zadokowania +1 200,00 zł”, okno „Konto mBank – wpływ 02.09.2025 (XTB S.A.)”,
  po „Zadokuj” – „zadokowana”, warstwy bez skoku (osłony 16 200,00 przed i po).
- Oczekiwane: pierwszy „sprzed startu”, drugi dokuje normalnie – zgodne. Inny brzeg startu (wpis po starcie bez pary
  w oknie −3 dni) – Spostrzeżenia 2.
- Zrzut: DO.15-panel.png

### DO.16 – ZGODNE
- Stan: rok + pary, przebieg `do-5` faza 1, 16:02–16:03 (DO.16-1…3).
- Zrobione: wpis 31.10 (3 200 zł) z parą 02.11 i wpis 25.10 (1 500 zł Cele) bez pary → „Pomiń wpis” w obu oknach →
  „Pominięte i sprzed startu” → „przywróć” (oba).
- Widać: „31.10.2026 Bieżące · pominięta · wpływ w banku 02.11.2026 3 200,00 zł przywróć”, „25.10.2026 Cele · pominięta
  1 500,00 zł przywróć”; wpływ 3 200 nie wraca jako „Wpływ z XTB · bez wpisu w ICTTJ”, odprawa bez obu wpisów;
  `fi.json` `ictj.skipped` z dwoma id; osłony 16 200,00 przed, po pominięciu i po przywróceniu; po „przywróć” oba
  „do zadokowania” („Portfel XTB?” przy 25.10, jak przed).
- Oczekiwane: jak w punkcie – zgodne.
- Zrzut: DO.16-pominiete.png

### DO.17 – ZGODNE
- Stan: rok + pule, `do-3` 15:49 i `do-3b` 15:59 (DO.17-1, 5, 6).
- Zrobione: zwrot 500 zł Bieżące z wypływem 500 zł i dopłata 200 zł tylko w mBanku (03.11); odprawa; okno zwrotu →
  „Zadokuj”; Dowództwo; energia i osłony przed i po.
- Widać: odprawa – dwie osobne czerwone linie „Firewall: dopłata do XTB 500,00 zł wbrew rozkazowi.” i „Firewall: dopłata
  do XTB 200,00 zł wbrew rozkazowi.”; okno – czerwony tekst „Firewall: dopłata do konta tradingowego, gdy osłony albo
  kadłub nie są pełne – wbrew rozkazowi (czerwony alarm).”, przyciski „Pomiń wpis | Anuluj | Zadokuj”; po „Zadokuj” od
  razu „Zadokowano” i toast „Zadokowano 500,00 zł.” (bez osobnego pytania); Dowództwo „Dziś na razie: naruszenie |
  Dopłata do XTB wbrew firewallowi: 500,00 zł | Dopłata do XTB wbrew firewallowi: 200,00 zł”; osłony 13 200 → 12 500
  (−700), energia 6 204,63 bez zmian.
- Oczekiwane: czerwony alarm w oknie i odprawie (każda dopłata osobno, także tylko z mBanku – D59), potwierdzenie przed
  zapisem, naruszenie, dopłata z osłon, nie koszt – zgodne. Potwierdzeniem jest okno dokowania („do potwierdzenia –
  firewall” w odprawie); osobnego pytania nie ma, a dopłata tylko z mBanku nie ma okna. Czy dzień zamrozi się z
  „poważnym” naruszeniem (licznik „0 / 3” dotyczy dni zamrożonych) – zegar → maszyna.
- Zrzut: DO.17-mostek.png, DO.17-okno-b.png, DO.17-po-kliknieciu-b.png, DO.17-dowodztwo-b.png

### DO.18 – ZGODNE
- Stan: `spec-dok` B po DO.2, przebieg `do-2` fazy 3–4, 15:43–15:44 (DO.18-1…4).
- Zrobione: zwrot 1 000 zł (wypływ w mBanku) → okno → „Zadokuj”; zwrot 2 000 zł → okno; Ustawienia → Warstwy i rozkazy →
  przełącznik „Firewall: …” wyłączony (`orders.firewall: false`) → okno → „Zadokuj”.
- Widać: 1 000 – „Dopłata z „wolnego do decyzji” przy pełnych osłonach i kadłubie – zgodnie z rozkazem.” (szary), bez
  alarmu w odprawie; po – „12 500,00 zł / 12 000,00 zł”, „wolne do decyzji: 500,00 zł”. 2 000 – „10 500,00 zł /
  12 000,00 zł”, odprawa „Firewall: dopłata do XTB 2 000,00 zł wbrew rozkazowi.”, okno czerwone „Firewall: … (czerwony
  alarm).”; rozkaz wyłączony – „Rozkaz firewall wyłączony – dopłata bez sprawdzania osłon i kadłuba.” (szary), alarm
  znika z odprawy.
- Oczekiwane: jak w punkcie – zgodne. Odprawa i powiadomienie przy zgodnej dopłacie mówią „do potwierdzenia – firewall”
  (Spostrzeżenia 6).
- Zrzut: DO.18-okno-1000.png, DO.18-okno-2000.png, DO.18-okno-2000-wylaczony.png

### DO.19 – ZGODNE
- Stan: rok, FI otwarty, folder ICTTJ czytany; przebieg `do-6` 16:07 i `do-9` 16:12.
- Zrobione: przy otwartej aplikacji dopisany wpis „withdrawal” 650 zł (03.11), potem trzy naraz (710 / 720 / 730 zł, różne
  pule); w `do-9` wpis 820 zł z 27.10 bez pary (plik banku obejmuje dni po oknie); panel, odprawa, licznik „Meldunki”,
  zapis prób powiadomień.
- Widać: wiersz po 1 s (`do-6`) i 3 s (`do-9`) bez restartu; 650 – „03.11.2026 Wypłata z ICTTJ · Bieżące czeka na import
  +650,00 zł”, odprawa „Wypłata z ICTTJ 650,00 zł (03.11) czeka na import z mBanku.”; trzy – trzy wiersze po 1 s i trzy
  pozycje odprawy; „Meldunki do rozpatrzenia 9” bez zmiany dla wpisów „czeka na import”; 820 – „27.10.2026 Wypłata z ICTTJ ·
  Bieżące PORTFEL XTB? do zadokowania +820,00 zł”, „Meldunki do rozpatrzenia 9” → „10”, odprawa „Wypłata z ICTTJ 820,00 zł
  (27.10, pula Bieżące) bez pary w mBanku – zadokuj na Portfelu XTB albo poczekaj na import.”.
- Oczekiwane: wiersz w 30 s bez restartu, odprawa, Meldunki +1, trzy wiersze – zgodne. Świeży wpis bez wpływu w banku jest
  „czeka na import” (D72) i nie liczy się do Meldunków; +1 dostaje wpis „do zadokowania”.
- Zrzut: DO.19-jedna.png, DO.19-trzy.png, DO.19-meldunki.png

### DO.20 – poza laboratorium (maszyna)
- Przy okazji w laboratorium (zapis prób powiadomień): „Nowa wypłata w ICTTJ do zadokowania” / „8 000,00 zł · pula
  Nadwyżki w masie · 03.11” (`do-2`, gdy dostawa stała się „do zadokowania”), „Zwrot do masy w ICTTJ” / „1 000,00 zł –
  potwierdź w Financial Intel (firewall).”; jeden wpis na żywo – „Nowa wypłata w ICTTJ do zadokowania” / „650,00 zł · pula
  Bieżące · 03.11” (`do-6`) i „820,00 zł · pula Bieżące · 27.10” (`do-9`); trzy naraz – jedno zbiorcze „Nowe wypłaty
  w ICTTJ do zadokowania” / „3 wpisy czekają na dokowanie (Mostek).”. Prawdziwe powiadomienia Windows, kliknięcie
  i ustawienie „wyłączone” – maszyna.

### DO.21 – ZGODNE
- Stan: rok bez `FI_ICTJ_DIR`, przebiegi `do-7` (16:08–16:09), `do-7-drugi`, `do-10` (16:10–16:12).
- Zrobione: Ustawienia → ICTTJ („ICTTJ na tym komputerze używa folderu …” z config.json ICTTJ w appdata przebiegu) →
  „Użyj tego folderu”; „Wskaż folder…” → folder z `payouts\`, bez `journal.json`; folder znika (zmiana nazwy przy
  zamkniętej aplikacji – przy otwartej Windows odmawia: EPERM, folder obserwowany), start, Mostek, odprawa, Ustawienia,
  powrót nazwy przy otwartej aplikacji; „Nie czytaj ICTTJ na tym komputerze”; drugi `userData` (DRUGI-PC) na tym samym
  folderze FI.
- Widać: „CZYTANY”, „Wypłaty: 11, zwroty do masy: 1, scenariusze prognozy: 2.” (kopia: 11 × withdrawal, 1 × return);
  ścieżka tylko w `config.json` komputera (`ictj.dir`), w `fi.json` jej nie ma. Folder bez journal.json – toast „Błąd W tym
  folderze nie ma danych ICT Trade Journal (brak pliku journal.json).”, wybór odrzucony, zostaje poprzedni folder
  („CZYTANY”). Folder zniknął – Mostek „ICTTJ: Folder ICTTJ jest niedostępny – OneDrive może się jeszcze nie uruchomił albo
  dysk jest odłączony. ›”, ta sama pozycja w odprawie, Ustawienia „NIEDOSTĘPNY”, bez błędów okna, dokowania w folderze FI
  9 → 9; po powrocie nazwy czyta sam (napis znika po 54 s, `main.log` „missing” → „ok” po 30 s). „Nie czytaj …” –
  „NIE WYBRANO”, Mostek „Wypłaty z ICTTJ: wybierz folder ICT Trade Journal w Ustawieniach ›”. Drugi komputer: „—”,
  „NIE WYBRANO”.
- Oczekiwane: jak w punkcie – zgodne (bez błędu okna i bez utraty dokowań, ścieżka nie przechodzi na drugi komputer).
  Folder bez journal.json: komunikat dosłownie jak w punkcie, ale jako odmowa w toaście zamiast statusu „to nie folder
  ICTTJ” (Spostrzeżenia 9).
- Zrzut: DO.21-bez-folderu.png, DO.21-czytany.png, DO.21-nie-ictj.png, DO.21-zniknal.png, DO.21-wrocil.png,
  DO.21-wylaczony.png, DO.21-drugi-komputer.png

### DO.22 – ZGODNE
- Stan: rok + wpisy, przebieg `do-6` faza 2, 16:07 (DO.22-1).
- Zrobione: w kopii ICTTJ przed startem: wpis 900 zł `schemaVersion: 2` z polami `fxRate`, `broker`; wpis 450 zł
  `pool: "bonus"`; plik ucięty w połowie JSON; wpis `expense` 120 zł; ten sam id w plikach z 02.11 (250 zł, starszy
  `updatedAt`) i 03.11 (260 zł, nowszy); kopia „…_<id> (1).json” wpisu 900; wpływy 900 i 450 zł w mBanku. Ustawienia →
  ICTTJ, Mostek → „Dokowanie”, okna, „Zadokuj” wpisu 900.
- Widać: Ustawienia i pod listą na Mostku: „ICTTJ zapisał dane w nowszym formacie (wersja 2) – FI czyta pola, które zna;
  zaktualizuj Financial Intel.”, „Pominięte pliki ICTTJ (2): payouts/2026/2026-11-03_…052.json: nieznana pula „bonus” –
  dokuje zwykłą kolejnością; payouts/2026/2026-11-03_…053.json: nieczytelny plik”, „Wpis ICTTJ w dwóch plikach (konflikt do
  rozstrzygnięcia w ICTTJ → Synchronizacja) – FI bierze nowszy: payouts/2026/2026-11-02_…055.json”; status „CZYTANY”,
  pozostałe wpisy czytane, żaden „wpis usunięty”; wiersze 900 i 450 „do zadokowania” (450 jako „Bieżące”), jeden wiersz
  wpisu dwóch plików – 260 zł (nowszy), 250 i 120 zł nie ma, kopia „(1)” nie daje drugiego wiersza; wpis v2 – „Zadokuj” →
  „zadokowana”, dokowanie zapisane.
- Oczekiwane: jak w punkcie – zgodne. Teksty ostrzeżeń mylą (Spostrzeżenia 7).
- Zrzut: DO.22-ustawienia.png, DO.22-panel.png

### DO.23 – ZGODNE
- Stan: wszystkie przebiegi z folderem ICTTJ (tabela „Granica ICTTJ”); wzorzec `stany\ictj-rok`; `do-7`, `do-7-ro`.
- Zrobione: przed każdym `start()` i po każdym zamknięciu – manifest kopii ICTTJ przebiegu (każdy plik i folder, także
  ukryte: ścieżka, rozmiar, czas modyfikacji, SHA-256; `granica-*.sha256`); moje zmiany kopii zawsze między dwoma
  manifestami (różnica przed moją zmianą = zapis FI); manifest wzorca na początku (15:25) i na końcu pracy; appdata ICTTJ
  przebiegu (`ictj-appdata\ICT Trade Journal\config.json`) przed i po; przegląd `main.log` wszystkich przebiegów; kopia ICTTJ
  z atrybutem tylko do odczytu na wszystkich plikach (`do-7-ro`: odczyt, „Zadokuj”); Ustawienia → Folder i kopie: folder
  kopii = kopia ICTTJ i jej `payouts`, „Otwórz inny folder…” = kopia ICTTJ; „Otwórz ICTTJ” (DO.25).
- Widać: żadnej różnicy w żadnym przebiegu (także po próbie otwarcia folderu ICTTJ jako folderu danych – w `main.log`
  „open start C:\FI-audyt\przebiegi\do-7\ictj”, potem odmowa); wzorzec przed i po – ta sama suma; appdata ICTTJ bez zmian;
  w `main.log` o ICTTJ tylko „ICTTJ: ok (N wpisów, M scenariuszy)”, „folder wybrany / wyłączony”, „off”, „start … (próba)”
  i odmowy – żadnych błędów zapisu ani ścieżek plików ICTTJ; folder tylko do odczytu: „CZYTANY”, „Zadokowano 1 000,00 zł.”,
  bez błędów okna; folder kopii: „Błąd To folder danych ICT Trade Journal – Financial Intel nigdy w nim nie zapisuje. Wybierz
  inny folder na kopie.” (oba), folder danych: „Błąd To folder danych ICT Trade Journal – Financial Intel nigdy w nim nie
  zapisuje. Wybierz inny folder.”, `backupDirOverride` = null.
- Oczekiwane: manifest bajt w bajt, bez nowych plików, brak prób zapisu, folder tylko do odczytu bez błędów, odmowy
  z komunikatem – zgodne. Zakres: DO.1–DO.18 i „Otwórz ICTTJ” na kopiach; MG.2–MG.4 przechodzi obszar MG (inny wykonawca).
- Zrzut: DO.23-folder-ictj.png

### DO.24 – poza laboratorium (Ty)
- Prawdziwy folder ICTTJ i prawdziwa wypłata – lista „Tylko Ty”. W laboratorium tę samą granicę sprawdza DO.23.

### DO.25 – ZGODNE
- Stan: rok, `FI_ICTJ_LAUNCH=dry`; na tym komputerze ICTTJ 1.24.0 jest zainstalowany – „bez programu” w przebiegach
  `do-7-bez-ictj` i `do-10-bez-ictj` (`LOCALAPPDATA` przebiegu i `PATH` bez narzędzi systemu, więc aplikacja nie znajduje
  programu ani w folderze, ani w rejestrze; rejestr niczego nie dostał).
- Zrobione: menu boczne → „Otwórz ICTTJ”; akcja „Ustawienia” w komunikacie; „Wskaż plik .exe…” (atrapa w folderze
  przebiegu) → „Otwórz ICTTJ” w Ustawieniach i w menu; „Zapomnij wybór”; w zwykłym przebiegu (`do-7`) – zainstalowany.
- Widać: bez programu – toast „Błąd Nie znaleziono ICT Trade Journal na tym komputerze – wskaż jego plik .exe (wersja
  portable) w Ustawienia → ICTTJ.” z przyciskiem „Ustawienia” → zakładka ICTTJ („Nie znaleziono zainstalowanego ICTTJ – przy
  wersji portable wskaż jej plik .exe.”); po wskazaniu „Wybrany: C:\FI-audyt\przebiegi\do-7\ICT-Trade-Journal-portable.exe”,
  `main.log` „ICTTJ: start C:\FI-audyt\przebiegi\do-7\ICT-Trade-Journal-portable.exe (próba)” (2×); „Zapomnij wybór” –
  znów „Nie znaleziono zainstalowanego ICTTJ …”; zainstalowany – „Zainstalowany: %LOCALAPPDATA%\Programs\ICT
  Trade Journal\ICT Trade Journal.exe”, `main.log` „ICTTJ: start … (próba)”; zapisane otwarcia (`recorded.opened`) – puste;
  folder ICTTJ bez zmian.
- Oczekiwane: jak w punkcie – zgodne.
- Zrzut: DO.25-nie-znaleziono.png, DO.25-ustawienia.png, DO.25-wybrany.png

## Znaleziska

- **DO.5 – NIEZGODNE (S):** zaimportowany zwrot do masy z puli Podatek, dopóki nie kliknie się „Zadokuj”, daje w odprawie
  czerwony alarm „Firewall: dopłata do XTB 300,00 zł wbrew rozkazowi.” i naruszenie dnia w Dowództwie, a kwotę odejmuje
  z osłon (rezerwa PIT-38 bez zmian); po zadokowaniu poprawnie. Ten sam mechanizm – Spostrzeżenia 1.
- **DO.7 – NIEZGODNE (W):** brak „Wycofaj dokowanie” na Mostku i w oknie zadokowanej dostawy (CHANGELOG 1.15.2, N-PC-2);
  cofnąć można tylko z toastu przez kilka sekund po dokowaniu (duplikat MO.29).

Kandydaci spoza kroków punktów (do decyzji w AU-11): Spostrzeżenia 1 (niezadokowana dostawa liczona zwykłą kolejnością
mimo znanej puli – proponowana waga S) i 2 (wpis z pierwszych dni budżetu „sprzed startu” – S).

## Spostrzeżenia

1. **Dostawa „do zadokowania” liczy się zwykłą kolejnością, choć pula jest znana** (DO.1–DO.5, DO.10): od importu do
   kliknięcia „Zadokuj” sparowany wpływ trafia do osłon / kadłuba / celów jak zwykła dostawa, a pula wpisu działa dopiero
   po dokowaniu. Skutki: pula Cele – osłony 14 500 → po „Zadokuj” 13 000, cele +1 500 (`do-3b`); pula Podatek – osłony
   +2 000 i przychód października 13 500,00 zamiast 12 000,00 (`do-3b`, Wywiad → Bilans paliwa); zwrot z puli Podatek –
   czerwony alarm i naruszenie dnia (DO.5); w `spec-dok` B przed „Zadokuj” „wolne do decyzji: 6 500,00 zł”, po – 1 500,00
   (cel ICTTJ założony dziś, wpływ zapisany wcześniej). Liczby na Mostku skaczą przy „Zadokuj”, a kapitan, który nie
   zadokuje, ma zawyżone osłony i przychód. Propozycja: wpis sparowany liczyć od razu według puli (dokowanie potwierdza /
   zmienia podział) albo pokazać kwotę „do zadokowania” osobno. Proponowana waga S.
2. **Wpis z pierwszych 3 dni budżetu bez pary w banku – „sprzed startu”** (`do-1`, `do-2`, faza 1): start budżetu 01.11,
   wpis ICTTJ z 03.11 (dziś), wpływu jeszcze nie ma → panel „Dokowanie” pusty, w zwiniętym „Pominięte i sprzed startu (1)”:
   „03.11.2026 Bieżące · sprzed startu 5 000,00 zł”, zamiast „czeka na import”. Okno parowania (−3 dni) zaczyna się przed
   startem, więc wpis jest odkładany jak sprzed startu, choć sam jest po starcie; gdyby pieniądze poszły na Portfel XTB (bez
   wpływu w mBanku), FI nigdy nie zaproponuje dokowania. Po imporcie wpływu wpis paruje się poprawnie. Kroki: seedFolder ze
   startem 2026-11-01, wpis ICTTJ z 2026-11-03 bez wpływu; zrzut DO.1-przed-wplywem.png, migawka DO.1-1. Proponowana waga S.
3. **„FI czeka na import do 30.10.2026” w dniu 03.11** (DO.8, plik banku kończy się w oknie) – data w przeszłości; czytelniej:
   „ostatni plik z mBanku kończy się 29.10 – zaimportuj nowszy”.
4. **Propozycja w oknie liczy warstwy na dzień wpływu** (DO.8: 800 zł z 27.10 – cała do „Wakacje 2027”, choć dziś osłony
   17 198,50 / 19 500) – zgodne z kolejnością na tamten dzień, ale okno tego nie mówi.
5. **Toasty dokowania**: po „Zapisz podział” – „Zadokowano 3 000,00 zł.” jak przy nowym dokowaniu (DO.6); przy innej kwocie
   w banku – „Zadokowano 1 000,00 zł.”, choć zadokowano 998,50 zł, a wiersz zadokowanej pokazuje „+1 000,00 zł ROZBIEŻNOŚĆ”
   (DO.12).
6. **„Firewall” przy dopłacie zgodnej z rozkazem** (DO.18): odprawa „Zwrot do masy z ICTTJ 1 000,00 zł (03.11) do
   potwierdzenia – firewall.”, powiadomienie „1 000,00 zł – potwierdź w Financial Intel (firewall).”, choć okno mówi
   „zgodnie z rozkazem”.
7. **Teksty ostrzeżeń folderu ICTTJ** (DO.22): nagłówek „Pominięte pliki ICTTJ (2)” obejmuje plik z pulą „bonus”, który nie jest
   pominięty (dokuje – w wierszu jako „Bieżące”, nie widać, że to „bonus”); „… – FI bierze nowszy:
   payouts/2026/2026-11-02_…055.json” podaje ścieżkę starszego pliku, którego FI nie bierze.
8. **Cofnięcie dokowania tylko przez kilka sekund toastu** (DO.7, MO.29) – „Wycofaj dokowanie” w oknie zadokowanej dostawy
   (zapowiedziane w 1.15.2).
9. **Folder bez journal.json** (DO.21): wybór odrzucony toastem „Błąd W tym folderze nie ma danych ICT Trade Journal (brak
   pliku journal.json).”, status zostaje „CZYTANY” (poprzedni folder) – punkt opisuje status „to nie folder ICTTJ”. Zachowanie
   bezpieczniejsze; opis w punkcie do poprawy.
10. **Komunikat folderu niedostępnego**: „OneDrive może się jeszcze nie uruchomił albo dysk jest odłączony.” – błąd
    gramatyczny (np. „OneDrive mógł się jeszcze nie uruchomić”).
11. **Pierwszy wybór folderu ICTTJ na komputerze** (`do-7`): powiadomienie „Nowe wypłaty w ICTTJ do zadokowania – 3 wpisy czekają
    na dokowanie (Mostek).” o starych wpisach (pierwszy odczyt) – do sprawdzenia przez maszynę (DO.20).
12. **Potwierdzenie dopłaty wbrew rozkazowi** (DO.17): jest nim samo okno dokowania („do potwierdzenia – firewall”), bez pytania
    „na pewno?”; dopłata wykryta tylko z mBanku nie ma kroku potwierdzenia (zostaje alarm i naruszenie).
13. **ICTTJ wyłączony albo niedostępny**: zadokowane dostawy z wpisami znikają z panelu „Dokowanie” (zostają wpływy XTB);
    warstwy i dokowania bez zmian (DO.10, DO.21).

## Granica ICTTJ

Wzorzec `C:\FI-audyt\stany\ictj-rok` (15 plików): manifest (ścieżki, rozmiary, czasy modyfikacji) i SHA-256 każdego pliku
o 15:25 (przed pierwszym przebiegiem) i o 16:13 (po ostatnim) – identyczne; SHA-256 listy sum `9cab8839e9b9f6c9` przed
i po (`C:\FI-audyt\migawki\do\_wzorzec-ictj-rok-start.*`, `…-koniec.*`). Kopie `rok` w przebiegach zaczynają z sumą
manifestu `7ce6630bc9170ee9` (ta sama co wzorzec – kopiowanie zachowuje czasy).

Suma manifestu = SHA-256 (16 znaków) listy: ścieżka, rozmiar, czas modyfikacji i SHA-256 każdego pliku i folderu (także
ukrytych). „Oczekiwana” = po moich zmianach; każda moja zmiana między dwoma manifestami (różnica przed nią byłaby zapisem
FI). Szczegóły: `C:\FI-audyt\przebiegi\<przebieg>\granica.log`, `granica-*.sha256`; zbiorczo
`C:\FI-audyt\migawki\do\_granica.jsonl`.

| Przebieg | Folder ICTTJ | Plików po | Suma przed start() | Suma oczekiwana | Suma po zamknięciu | Moje zmiany | Różnice od FI | Wynik |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `do-0` | `do-0\ictj` | 15 | `7ce6630bc9170ee9` | `7ce6630bc9170ee9` | `7ce6630bc9170ee9` | 0 | 0 | bez zmian |
| `do-1` | `do-1\ictj` | 3 | `57f369334567664e` | `9579cc473a40c5f8` | `9579cc473a40c5f8` | 2 | 0 | bez zmian |
| `do-2` | `do-2\ictj` | 5 | `aebde54d9157ef4f` | `dab521960f51c10f` | `dab521960f51c10f` | 3 | 0 | bez zmian |
| `do-3` | `do-3\ictj` | 21 | `7ce6630bc9170ee9` | `03138eac68be256a` | `03138eac68be256a` | 7 | 0 | bez zmian |
| `do-4` | `do-4\ictj` | 20 | `7ce6630bc9170ee9` | `0850172e5400d877` | `0850172e5400d877` | 2 | 0 | bez zmian |
| `do-3b` (1.) | `do-3b\ictj` | 18 | `7ce6630bc9170ee9` | `061d70936f5b7ab1` | `061d70936f5b7ab1` | 3 | 0 | bez zmian |
| `do-4b` (1.) | `do-4b\ictj` | 17 | `7ce6630bc9170ee9` | `212f35e2bcf6afdf` | `212f35e2bcf6afdf` | 2 | 0 | bez zmian |
| `do-3b` (2.) | `do-3b\ictj` | 18 | `7ce6630bc9170ee9` | `b4a26f8093108c48` | `b4a26f8093108c48` | 3 | 0 | bez zmian |
| `do-4b` (2.) | `do-4b\ictj` | 17 | `7ce6630bc9170ee9` | `fc75be6b1013a327` | `fc75be6b1013a327` | 2 | 0 | bez zmian |
| `do-5` | `do-5\ictj` | 20 | `7ce6630bc9170ee9` | `c51feb9f5df2ac4e` | `c51feb9f5df2ac4e` | 2 | 0 | bez zmian |
| `do-6` | `do-6\ictj` | 26 | `7ce6630bc9170ee9` | `374873dc37d55719` | `374873dc37d55719` | 6 | 0 | bez zmian |
| `do-7` (+ `-drugi`, `-bez-ictj`) | `do-7\ictj` | 15 | `7ce6630bc9170ee9` | `7ce6630bc9170ee9` | `7ce6630bc9170ee9` | 0 | 0 | bez zmian |
| `do-7-ro` (tylko do odczytu) | `do-7\ictj-ro` | 15 | `7ce6630bc9170ee9` | `7ce6630bc9170ee9` | `7ce6630bc9170ee9` | 0 | 0 | bez zmian |
| `do-10` (+ `-bez-ictj`) | `do-10\ictj` | 15 | `7ce6630bc9170ee9` | `7ce6630bc9170ee9` | `7ce6630bc9170ee9` | 0 (nazwa tam i z powrotem) | 0 | bez zmian |
| `do-8` | `do-8\ictj` (z migawki DO.5-1) | 20 | `d873e4c2c5f865ce` | `d873e4c2c5f865ce` | `d873e4c2c5f865ce` | 0 | 0 | bez zmian |
| `do-9` | `do-9\ictj` | 16 | `7ce6630bc9170ee9` | `dcdaba80c7c5c26d` | `dcdaba80c7c5c26d` | 1 | 0 | bez zmian |

16 przebiegów, 0 różnic. Dodatkowo przed każdym `start()` i po każdym zamknięciu każdej fazy (np. `do-3` – 7 faz) –
wszystkie „bez zmian”. Appdata ICTTJ przebiegu (`ictj-appdata\ICT Trade Journal\config.json`, 54 B) bez zmian. `main.log`
wszystkich przebiegów: o ICTTJ tylko odczyty („ICTTJ: ok / missing / off”), wybór i wyłączenie folderu, „start … (próba)”
i odmowy – żadnej próby zapisu, żadnej ścieżki pliku ICTTJ.

## Odczyty liczb

84 odczyty w `C:\FI-audyt\odczyty\do.jsonl`, 84 migawki w `C:\FI-audyt\migawki\do\<punkt>-<n>` (pole `_migawka`). Wartości
z ekranu odpowiadają migawce; poniższe odczyty mają **niedokładny opis stanu** (skrypt otworzył inny wiersz – moja pomyłka,
liczby nadal ważne dla wyroczni):
- DO.3-2, DO.3-3 (`do-3`): okno i dokowanie wpisu 25.10 (Cele 1 500 zł bez pary – na Portfelu XTB), nie wpisu 02.11 z parą
  w mBanku (ten – DO.3-8…10).
- DO.17-2 (`do-3`): zadokowano wpis 02.11 (Cele 1 500 zł, wszystkie cele pełne → osłony), nie zwrot 500 zł.
- DO.12-2, DO.7-4, DO.12-3 (`do-4`): okno, „Cofnij” i ponowne dokowanie zwrotu do masy z 05.03 (−1 000 zł, firewall), nie wpisu
  1 000 / 998,50 (ten – DO.12-5…7).
- DO.17-4 (`do-3b`, 1. przebieg): zadokowano zwrot z 05.03 (−1 000 zł), nie zwrot 500 zł (ten – DO.17-6); DO.4-7 – wpis
  Podatek 21.10 jeszcze niezadokowany (dokowanie nie doszło do skutku).

## Problemy narzędzia

- `lab.ts`: bez błędów. Z `ictjDir` ustawia `FI_ICTJ_DIR`, które w wydaniu ma pierwszeństwo przed ustawieniem komputera –
  DO.21 przechodził więc bez niego, a `config.json` ICTTJ (podpowiedź „Użyj tego folderu”) dopisywałem po `start()` (lab
  usuwa `ictj-appdata` przed startem; podpowiedź jest czytana przy otwarciu zakładki).
- Zmiana nazwy folderu ICTTJ przy otwartej aplikacji – EPERM (Windows: folder obserwowany); „folder znika” sprawdzony przy
  zamkniętej aplikacji (`do-10`).
- Na tym komputerze jest zainstalowany ICTTJ 1.24.0 – „bez zainstalowanego ICTTJ” (DO.25) uzyskane zmiennymi `LOCALAPPDATA`
  i `PATH` przebiegu (aplikacja tylko czyta rejestr; nic nie zapisano). Prawdziwego ICTTJ nie uruchomiono (`dry`, puste
  `recorded.opened`).
- Moje pomyłki: wybór wiersza dokowania po fragmencie kwoty („500,00” trafiało w „1 500,00”, „1 000,00” w zwrot z 05.03) –
  w `do-3`, `do-4` i 1. przebiegach `do-3b` / `do-4b`; poprawione (`openDelivery` – data i kwota ze znakiem), części
  powtórzone w `do-3b`, `do-4b`. Odczyty z tych kroków – lista wyżej.
