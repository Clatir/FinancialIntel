# Raport audytu – DW (Dowództwo)

- Data: 03.11.2026, 11:39–12:35 (zegar prawdziwy, Warszawa); wersja 1.15.4 z GitHub Releases (laboratorium `C:\FI-audyt`).
- Stan danych: persona `rok` (kotwica 2026-11-03, gra od 04.09.2026) z folderem ICTTJ persony, stan `start` (DW.1);
  warianty `rok-awans`, `rok-degradacja`, `rok-przerwa`, `rok-ictj` i inne zrobione na kopiach `rok` (tabela niżej) –
  stanów `brzegi` i wariantów z planu laboratorium nie ma.
- **Ważne dla wyroczni (AU-9):** dni gry persony `rok` zamroziła aplikacja przy **pierwszym** starcie generatora, przed
  importem historii (`frozenAt` 2026-11-03T09:59:46Z, kopia przed importem 11:00:13 czasu polskiego). Oceny 04.09–01.11
  w `rok` liczą więc tylko wpisy ręczne (bez 908 wierszy banku): Chorąży od 06.10, seria 50, klasa dni „Zwiadowca”. Ta
  sama gra policzona przez aplikację od nowa z importem (przebieg `dw-1`, folder `game/` usunięty) daje Kadeta, serię 7
  i 31 naruszeń. Odczyty mają stan opisany przy każdym (`rok` albo `rok-przeliczona`).
- Przebiegi: `dw-0` … `dw-18` (`C:\FI-audyt\przebiegi\dw-*`, teksty ekranów w `out\`), skrypty `tests/audyt/dw-*.spec.ts`
  (pomocnicze `dw-pomoc.ts`), odczyty `C:\FI-audyt\odczyty\dw.jsonl` (56 wierszy), zrzuty `C:\FI-audyt\zrzuty\DW*.png`.
- Folder ICTTJ: po każdym przebiegu (33 kopie) identyczny ze stanem (`diff -rq`) – nic nie zapisano.

**Podsumowanie (37 punktów):** ZGODNE 26 · LICZBY → AU-9 5 · UWAGA 3 · NIEZGODNE 1 (S) · NIE DO SPRAWDZENIA 1 ·
poza laboratorium 1 (DW.5 – Maszyna). Dźwięki (DW.20) – Ty.

## Stany szczególne (co zmieniono w kopii `rok` przed startem)

| Przebieg | Zmiana | Punkty |
| --- | --- | --- |
| `dw-1` | folder `game/` usunięty – aplikacja zamraża 04.09–01.11 od nowa (z importem) | 9, 17, 21, 30–32 |
| `dw-2a`, `dw-2b` | stan `start`; nowy folder z samym saldem otwarcia 12 000 zł (bez kreatora) | 1 |
| `dw-4`, `dw-15` | „rok-przerwa”: dni gry od 19.10 usunięte (z miesiącem listopada i misją W45), operacje, potwierdzenia sald i dokowania po 18.10 usunięte, znaczniki importu cofnięte o 10 dni (na 17.10); zamrażanie bez skrótów (3 min, minuta ciszy) | 4, 7, 37 |
| `dw-5a`, `dw-5b` | „rok-awans”: dzień 01.11 usunięty z gry; awans na Chorążego przesunięty **ręcznie** z 06.10 na 05.10; misja W44 „Pełna energia” (nierozliczona) i W40 „Cisza w eterze” (wykonana, niedziela 04.10) dopisane **ręcznie** do `game/`; pierwsze zamrażanie 40 s po otwarciu | 18–20, 23, 28 |
| `dw-6a`, `dw-6b` | „rok-degradacja”: dni od 20.10 usunięte z gry (aplikacja zamraża je z importem: poważne 22.10 i 23.10); potwierdzony zakup nocny 23:40 45 zł z wpisem – 27.10 (A) albo 01.11 (B); misje W43 „Zero impulsów” i W44 „Cisza w eterze” dopisane ręcznie (nierozliczone) | 22, 28, 36 |
| `dw-7` | „rok-ictj”: dni od 20.10 usunięte z gry; wpływ z XTB 3 200 zł z 31.10 (wiersz banku) – para wypłaty ICTTJ, niezadokowana; dokowanie wpływu 3 000 zł z 20.10 usunięte (para czeka 14 dni) | 8 |
| `dw-8` | cisza nocna 11:00–15:00 (obejmuje bieżącą godzinę); dziś płatność kontenera Netflix 12:00 z wpisem, zakup z importu bez godziny; 10.10 zakup 12:30 z wpisem (dzień zamrożony) | 13, 34, 35 |
| `dw-9k1` | koperta Zwierzęta w planie listopada 0 zł | 10, 33 |
| `dw-9k3` | minimum osłon 2,5 pensji; 01.11 usunięty z gry, 01.11 zakup 83,32 zł | 11, 32 |
| `dw-9k4`, `dw-16` | dziś dopłata 500 zł do XTB (`trading`); `dw-16`: cel osłon 1 pensja, kadłub 4 / 3 mies. | 12 |
| `dw-9k5` | cisza 11:00–15:00; 01.11 usunięty z gry, 01.11 zakup 83,33 zł i zakup „impuls” 250 zł za Marka; dziś wspólny zakup 300 zł (moje 30 %, Anna 70 %) | 15, 32 |
| `dw-9k2`, `dw-14` | `dw-14`: pokrycie 02.11 Dom → Prezenty 100 zł (limity planu przesunięte i zapis pokrycia); dziś Prezent 250 zł | 16 |
| `dw-10*`, `dw-17`, `dw-18` | misja W45 podmieniona **ręcznie** w `game/2026-11.json` (Pełna energia, Dzień bez wydatków, Łączność z bazą, Inwentaryzacja, Rozliczenie z domownikami) | 27, 29 |
| `dw-11a` | `game/` usunięte, start gry 15.10 | 2, 24 |
| `dw-11w2`, `dw-11w3` | nowy folder: budżet od 01.11, saldo otwarcia 8 880 / 9 000 zł, przyjęte koszty 3 000 zł | 24 |
| `dw-12` | dni od 30.10 usunięte z gry; kontener 700 zł/mies. (nazwa 80 znaków z polskimi literami) dodany 30.10, nazwa zmieniona 01.11 | 14, 31 |
| `dw-13a–c` | `rok`; fi.json w formacie v2 (tylko do odczytu); dni od 20.10 usunięte z gry i próg degradacji 2 | 36 |

## Punkty

### DW.1 – ZGODNE
- Stan: `start` (kreator dziś) i nowy folder z samym saldem otwarcia; `dw-2a`, `dw-2b`, 11:47. Zrzuty: DW.1-start.png, DW.1-bez-kreatora.png
- Widać (start): „gra od 04.11.2026”; „Kadet / od startu gry (04.11.2026) / Postęp policzy się po pierwszym zamrożonym
  dniu.”; Seria 0, Rekord 0; „Pierwsza misja w tygodniu od 09.11.2026 (pierwszy pełny tydzień gry).”; „Jeszcze żadnego –
  wszystkie są ukryte do zdobycia.”, „Ukrytych: 13”; „Dziennik zapełni się, gdy pierwsze dni zostaną zamrożone (24 h po
  końcu dnia).”
- Widać (bez kreatora): „gra wystartuje, gdy budżet działa”, „Misje ruszą razem z grą.”, bez „Dziś na razie”, w `game/`
  nic.

### DW.2 – ZGODNE
- Stan: `rok` z grą od 15.10 (`dw-11a`). Zrzuty: DW.2-dowodztwo.png, DW.2-wywiad.png
- Widać: pasek 30.09–14.10 „przed startem gry”, od 15.10 oceny; dziennik bez wpisów sprzed 15.10; Wywiad „Wydatki
  w czasie” – 6 mies. „cze … lis”, 12 mies. „gru … lis” (miesiące sprzed startu gry i budżetu), krzywa majątku od 2025.

### DW.3 – ZGODNE
- Stan: `rok`, `dw-3`, 11:55. Zrzuty: DW.3-po-wpisie.png, DW.3-po-cofnij.png
- Zrobione: szybki wpis 100 zł (Jedzenie, 11:05) → Operacje: usunięcie, „Cofnij”, usunięcie.
- Widać: przed – „Dziś na razie: zgodny”, energia 77,28 zł; po wpisie – „Dziś na razie: naruszenie / Przydział dnia
  przekroczony o 22,72 zł”, Mostek „−22,72 zł”; po usunięciu „zgodny” (77,28 zł); po „Cofnij” znowu „naruszenie … 22,72 zł”.
  Dopisek „Dzień zamraża się 24 h po swoim końcu; późniejsza korekta zmienia budżet, nie ocenę.”

### DW.4 – ZGODNE
- Stan: `rok` (`dw-0`) i `rok-przerwa` (`dw-4`, czasy domyślne). Zrzut: DW-0-dowodztwo.png
- Widać: „gra od 04.09.2026 · ocenione do 01.11.2026”; pasek „02.11.2026 – jeszcze nie zamrożony”, „03.11.2026 – jeszcze nie
  zamrożony”, „01.11.2026 – zgodny”. Po przerwie dni do 01.11 zamrożone w 3. minucie (przed 198 s, plik i ekran).

### DW.5 – poza laboratorium (Maszyna)

### DW.6 – ZGODNE (liczby w odczycie)
- Stan: `rok`, `dw-3`. Zrzuty: DW.6-mostek-po.png, DW.6-dowodztwo-po.png
- Zrobione: na zamrożonym 01.11 (zgodny) szybki wpis 300 zł Jedzenie; usunięty „Fryzjer Styl −79,34 zł (08.09.2026)” z dnia
  „Przydział dnia przekroczony o 54,11 zł”; odczyt; „Cofnij” i usunięcie wpisu.
- Widać: dziennik, pasek, seria 50, rekord 50, „Chorąży od 06.10.2026 … 26 / 30” bez zmian; pliki `game/` bez zmian;
  energia 77,28 → „66,57 zł” (przydział 89,28 → 78,57), po cofnięciu 77,28.

### DW.7 – ZGODNE
- Stan: `rok-przerwa` (ostatni zamrożony 18.10), czasy domyślne (3 min, minuta ciszy), `dw-4`.
- Widać (co 30 s, plik / ekran / czas reakcji): 18–167 s „ocenione do 18.10.2026”, 198 s „ocenione do 01.11.2026”;
  odpowiedź okna 3–30 ms, przełączenie ekranu 34–302 ms, szybki wpis 712 ms (pierwsze otwarcie) i 53 ms – bez zawieszania.

### DW.8 – ZGODNE
- Stan: `rok-ictj`, `dw-7`. Zrzuty: DW.8-przed-dokowaniem.png, DW.8-okno-dokowania.png, DW.8-po-dokowaniu.png
- Widać: przed dokowaniem „ocenione do 30.10.2026”, „31.10.2026 – jeszcze nie zamrożony”, „01.11.2026 – jeszcze nie
  zamrożony”; para z 20.10 niezadokowana od 14 dni nie wstrzymała gry (20.10–30.10 zamrożone). Po „Zadokuj” (31.10,
  „Wypłata z ICTTJ · 31.10.2026 BIEŻĄCE +3 200,00 zł”) – „ocenione do 01.11.2026”, 31.10 i 01.11 „zgodny”.

### DW.9 – LICZBY → AU-9
- Stan: `rok` i `rok-przeliczona` (`dw-0`, `dw-1`).
- Widać: „08.09 Przydział dnia przekroczony o 54,11 zł” (`rok`), „08.09 … o 100,50 zł” (`rok-przeliczona`) – bez plakietki
  „poważne”; pasek – dzień „naruszenie”, seria liczona od następnego dnia; licznik poważnych bez zmiany. Kwoty X wszystkich
  dni w odczytach (DW.9).

### DW.10 – ZGODNE
- Stan: `rok`, koperta Zwierzęta 0 zł, `dw-9k1`. Zrzuty: DW.10-odprawa-122.png, DW.10-odprawa-118-prog10.png
- Zrobione: dziś Auto (limit 650 zł) 767 → 780 → 793 zł (edytor); próg 10 % i z powrotem 767 zł; Zwierzęta 10 zł;
  Subskrypcje (bez limitu w planie) 15 zł; Jedzenie 60 zł.
- Widać: 767 – „Koperta przekroczona: Auto – ponad limit o 117,00 zł”, alarm odprawy w kolorze akcentu; 780 – „… o 130,00
  zł”, akcent; 793 – „Koperta przekroczona ponad próg: Auto – ponad limit o 143,00 zł”, alarm czerwony; próg 10 % i 767 –
  „ponad próg … 117,00 zł”, czerwony; Zwierzęta – „Koperta przekroczona: Zwierzęta – ponad limit o 10,00 zł” (zwykłe);
  Jedzenie – bez naruszenia koperty. Historia (`rok-przeliczona`): „Koperta przekroczona: Dom – ponad limit o 41,74 zł”
  (zwykłe), „… ponad próg: Dom – … 69,89 zł POWAŻNE”.

### DW.11 – ZGODNE
- Stan: `rok`, minimum osłon 2,5 pensji (16 250 zł), 01.11 zamrażany od nowa, `dw-9k3`. Zrzuty: DW.11-mostek.png, DW.11-dowodztwo.png
- Widać: 01.11 (pensja zepchnęła osłony do 13 000 zł) – bez naruszenia; dziś „Za domownika” Anna 300 zł – energia 74,31 bez
  zmian, „zgodny”; własny wydatek 7 000 zł – „Osłony (bufor na pensje) poniżej minimum o 4 128,69 zł” (16 250 − 12 121,31).
- Uwaga: w odprawie ten alarm ma kolor akcentu (żółty), w grze jest poważny – patrz Spostrzeżenia.

### DW.12 – UWAGA
- Stan: `rok`, `dw-9k4`, `dw-16`. Zrzuty: DW.12-odprawa.png, DW.12-bez-firewalla.png, DW.12-pelne-warstwy.png
- Widać: dopłata 500 zł przy niepełnym kadłubie – „Dopłata do XTB wbrew firewallowi: 500,00 zł”, odprawa na czerwono
  „Firewall: dopłata do XTB 500,00 zł wbrew rozkazowi.”; rozkaz wyłączony – „Dziś na razie: zgodny”, alarm znika.
- Oczekiwane: przy wyłączonym rozkazie tekst, że dopłata nie jest sprawdzana – **brak** (przełącznik ma tylko etykietę
  „Firewall: dopłata do XTB tylko z „wolnego do decyzji” …”, odprawa i Dowództwo milczą).
- Przypadek „dopłata z wolnego przy pełnych warstwach” – NIE DO SPRAWDZENIA: przy celu osłon 1 pensja i kadłubie 6 / 4 / 3
  mies. kadłub zawsze ok. 0,3 % pod celem („39 066,30 zł / 39 185,22 zł”, „26 044,20 / 26 123,48”, „19 533,15 /
  19 592,61”), osłony „ponad cel osłon: 19 672,11 zł – kadłub niepełny, nie do dopłaty XTB” – naruszenie zgodnie z regułą.

### DW.13 – ZGODNE
- Stan: `rok`, cisza 11:00–15:00, `dw-8`. Zrzuty: DW.13-szybki-wpis-bez-potwierdzenia.png, DW.13-edytor.png, DW.13-dzis.png
- Widać: szybki wpis 30 zł w ciszy, Enter bez potwierdzenia – „Cisza nocna: potwierdź zakup i wpisz krótko, dlaczego
  teraz.” (nie zapisuje); z wpisem i potwierdzeniem – „Zakup w ciszy nocnej: Nocny DW1 30,00 zł”; edytor – „Godzina
  w ciszy nocnej (11:00–15:00): zakup o tej porze potwierdź krótkim wpisem wyżej (D40). … usuń godzinę”, z wpisem –
  „Potwierdzony zakup w ciszy nocnej – liczy się jako naruszenie w grze.”; import bez godziny – bez naruszenia; historia
  „12.09 Zakup w ciszy nocnej: Shell 239,05 zł POWAŻNE”.
- Odnotowane (wątpliwość spec / N-PC-19): zakup „plan” 250 zł nocą z wpisem i płatność kontenera Netflix nocą z wpisem –
  **bez** naruszenia (wariant N-PC-19).

### DW.14 – ZGODNE
- Stan: `rok`, kontener 700 zł od 30.10, `dw-12`. Zrzuty: DW.14-ladownia.png, DW.14-dowodztwo.png
- Widać: „30.10 Ładunek (stałe koszty) ponad linią zanurzenia: Żółć ęśąłńź – długi kontener: … – ładownia 3 214,32 zł
  miesięcznie” (zwykłe); 31.10 i 01.11 (zmiana nazwy) bez naruszenia; dziś zmiana nazwy – „zgodny”, podniesienie do 800 zł –
  „Ładunek … ładownia 2 814,32 zł miesięcznie”.

### DW.15 – ZGODNE
- Stan: `rok`, cisza 11:00–15:00, `dw-9k5`. Zrzut: DW.15-dowodztwo.png
- Widać: wspólny zakup 300 zł (moje 30 %) – energia „−15,70 zł” = 86,30 − 12 − 90, „Przydział dnia przekroczony o 15,70 zł”
  (tylko moja część); zakup za Marka 250 zł o 12:16 w ciszy, „impuls”, z wpisem – energia i ocena bez zmian; 01.11 zakup
  „impuls” za Marka – bez naruszenia i bez Judas Swing.

### DW.16 – ZGODNE
- Stan: `rok`, `dw-9k2`, `dw-14`. Zrzuty: DW.16-okno.png, DW.16-dowodztwo.png, DW.16-pokrycie-wczesniej.png
- Widać: dziś Auto 700 zł – „Koperta przekroczona: Auto – ponad limit o 50,00 zł”; „pokryj z koperty…” (okno: „ocena dnia
  w grze liczy stan sprzed przesunięcia”) 50 zł – naruszenie zostaje, dziennik „03.11 Pokrycie przekroczenia: Auto z koperty
  Jedzenie – 50,00 zł limitu”; pokrycie z 02.11 (Prezenty 300 zł) i dziś 250 zł – „Dziś na razie: zgodny”.
- Odnotowane: pokrycia z 02.11 (dzień jeszcze nie zamrożony) dziennik nie pokazuje – dopisane ręcznie, więc tylko uwaga.

### DW.17 – LICZBY → AU-9
- Stan: `rok`, `rok-przeliczona`, `rok-degradacja`. Odczyty DW.17.
- Widać: `rok` seria 50 / rekord 50; `rok-przeliczona` 7 / 7; `rok-degradacja` A 5 / 38, B 0 / 38; pasek 35 dni w kolejności
  dat; 14 dni przerwy bez wpisów – zgodne; dzisiejszy dzień nie zmienia serii.

### DW.18 – UWAGA
- Stan: `rok`, `rok-awans`, `dw-5a`. Zrzut: DW.19-po.png
- Widać: „Awans: Chorąży” 06.10 przy dokładnie 30 dniach zgodnych z 33 (04.09–06.10, 3 naruszenia); „Do stopnia porucznika
  26 / 30 – dni zgodne 26 (od 07.10 do 01.11)”; w `rok-awans` dwa awanse („05.10 Awans: Chorąży”, „01.11 Awans:
  Porucznik”), po awansie „Do stopnia komandora 0 / 30”.
- Tekst: po awansie „dni zgodne 0 (od 02.11 do 01.11)” – zakres dat odwrócony (od jutra do przedwczoraj).

### DW.19 – ZGODNE
- Stan: `rok-awans`, `dw-5a`. Zrzuty: DW.19-przed.png, DW.19-po.png
- Widać: przed zamrożeniem D−2 – „26 / 30 – dni zgodne 26 (od 06.10 do 31.10)” (wykonana misja W40 z niedzielą 04.10 przed
  oknem – nie liczy się); po – „01.11 Misja wykonana: Pełna energia (+3 dni do awansu)”, „01.11 Awans: Porucznik” (27 + 3).

### DW.20 – ZGODNE (obraz; dźwięk – Ty)
- Stan: `rok-awans`, `dw-5a`, `dw-5b`. Zrzuty: DW.20-ekran-1.png, DW.20-ekran-1-w-animacji.png, DW.20-przycisk-dowodztwo.png
- Widać: „Awans: Porucznik / Stopień od 01.11.2026 – dni zgodne z rozkazami i wykonane misje. / Do dzieła / Dowództwo”,
  insygnia (2 paski); animacje 140 ms (okno), 600 ms (napisy), 900 ms (linia), bez gradientu i cienia; Enter i Esc
  zamykają; po restarcie ekran nie wraca; „Dowództwo” otwiera Dowództwo; wpis „Awans: Porucznik” w dzienniku. Przed nim
  ekran „Nowa klasa: Niszczyciel / Zasięg okrętu wzrósł (01.11.2026).” (skutek zamrożenia persony przed importem).

### DW.21 – ZGODNE
- Stan: `rok` na świeżym komputerze (`dw-0`) i `rok-przeliczona` (`dw-1`, 5 min z zamrażaniem), `rok-degradacja`.
- Widać: `rok` – żadnego ekranu ani toastu z historii; `rok-przeliczona` – tylko 2 toasty z 14 dni („Osiągnięcie: Cel
  osiągnięty …” 20.10, „Osiągnięcie: Seria 7 …” 01.11), starsze (Pełne osłony 10.09 i in.) bez święta; `rok-degradacja` –
  jeden toast „Dowództwo: 6 nowych wpisów – szczegóły w dzienniku wachty.” z przyciskiem „Dowództwo”.

### DW.22 – ZGODNE
- Stan: `rok-degradacja`, `dw-6a`, `dw-6b`, `dw-1`. Zrzuty: DW.22-A-dowodztwo.png, DW.22-B-dowodztwo.png
- Widać: A – „27.10 Degradacja: Kadet” po „22.10 … Prezenty i inne … POWAŻNE”, „23.10 … Dom … POWAŻNE”, „27.10 Zakup w ciszy
  nocnej: Nocny sklep DW 45,00 zł POWAŻNE”; „Kadet od 27.10.2026 – 5 / 30 (od 28.10 do 01.11)”, „w tym miesiącu 0 / 3”;
  toast zbiorczy (6 wpisów, z degradacją). B (2 w październiku + 1 w listopadzie) – Chorąży, „1 / 3”. Kadet z 3 poważnymi
  we wrześniu (`rok-przeliczona`) – bez degradacji.

### DW.23 – ZGODNE (część)
- Stan: `rok-awans`, `dw-5a`.
- Widać: po awansie 01.11 „Poważne naruszenia od 02.11 (do degradacji) 0 / 3”; bez zmiany stopnia – „w tym miesiącu”.
- Nie sprawdzono: debriefing miesiąca z 2 poważnymi przed awansem (w listopadzie zamrożony tylko 01.11).

### DW.24 – LICZBY → AU-9
- Stan: `rok`, saldo 8 880 / 9 000 zł przy kosztach 3 000 zł (`dw-11*`). Zrzuty: DW.24-W2.png, DW.24-W3.png, DW.24-przeglad-roczny.png
- Widać: `rok` – Mostek „ZASIĘG 7,8 mies. (osłony − dług + kadłub) / koszty, KLASA Niszczyciel”, Dowództwo „Niszczyciel
  zasięg 7,8 mies. Do klasy Krążownik brakuje 1,2 mies.”, Przegląd roczny „7,8 mies. (Niszczyciel)”; 2,96 → „2,9 mies.”
  Korweta, „Do klasy Fregata brakuje 0,1 mies. zasięgu.”; 3,00 → „3,0 mies.” Fregata – tak samo na trzech ekranach;
  drabina klas zgodna z punktem.

### DW.25 – NIE DO SPRAWDZENIA
- Powód: persona nie ma zasięgu krążącego wokół granicy klasy (zawsze Niszczyciel); wariant wymagałby sald zmienianych
  dzień po dniu (niski priorytet – nie zbudowano).
- Widziane przy okazji: wzrost klasy (Zwiadowca → Niszczyciel, skutek zamrożenia persony przed importem) – wpis „Klasa:
  Zwiadowca → Niszczyciel” i ekran „Nowa klasa: Niszczyciel” (z 14 dni); spadków nie było.

### DW.26 – LICZBY → AU-9
- Stan: `rok` (`dw-10a`), `rok-przeliczona`. Zrzut: DW.26-raport-wachty.png
- Widać: Dowództwo, odprawa i Raport wachty (02.11–08.11) – ten sam tekst „Killzone: Twoja killzone wydatków – wtorek
  20:00–21:00: najwyżej 19,43 zł (połowa średniej)”; w `rok-przeliczona` misja „Koperta pod kontrolą – Prezenty i inne
  najwyżej 37,33 zł”. Wybór – wyrocznia (misja persony wybrana przed importem).

### DW.27 – ZGODNE
- Stan: `rok`, misja W45 podmieniona, `dw-10b`, `dw-10c`. Zrzuty: DW.27-pelna-energia.png, DW.27-dzien-bez-wydatkow.png
- Widać: „Pełna energia” – „Na razie: kurs utrzymany” → po 100 zł „Na razie: cel chybiony” obok „Dziś na razie: naruszenie”;
  „Dzień bez wydatków” – z dzisiejszą Mokką „1 z 2”, po jej usunięciu „1 z 2 (+1, jeśli dziś bez wydatków)”, po wydatku 5 zł
  „1 z 2”.

### DW.28 – ZGODNE
- Stan: misje dopisane ręcznie (`dw-5a`, `dw-6a`, `dw-6b`).
- Widać: przed zamrożeniem niedzieli W44 nierozliczona; po – „01.11 Misja wykonana: Pełna energia (+3 dni do awansu)” (✓
  W44) z toastem „Misja wykonana: Pełna energia – bliżej awansu.”; „25.10 Misja niewykonana: Zero impulsów” (impulsy 22.10),
  „01.11 Misja niewykonana: Cisza w eterze” (zakup nocny) – „✗” w „Poprzednie”.

### DW.29 – NIEZGODNE (S)
- Stan: `rok`, misja W45 podmieniona na „Inwentaryzacja” (`dw-10e`, potwierdzone w `dw-17` dwa razy), 12:25 i 12:31.
- Zrobione: import `rok-nowe-historia.csv` (27.10–02.11; saldo w pliku) → Dowództwo; potem ręczne potwierdzenia.
- Widać: przed „Na razie: 0 z 3”, po imporcie „Na razie: 0 z 3” (aplikacja zapisała potwierdzenie salda mBanku z datą
  „2026-11-01” – ostatni zaksięgowany dzień pliku, niedziela poprzedniego tygodnia; odprawa przestała prosić o saldo
  mBanku); ręcznie Portfel XTB → „1 z 3”, Gotówka → „2 z 3”; ręcznie mBank → „1 z 3” (`dw-17`).
- Oczekiwane: saldo z pliku banku zalicza „Inwentaryzację” dla mBanku (licznik rośnie po czynności).
- Zrzuty: DW.29-inwentaryzacja-dowodztwo.png, DW.29-inwentaryzacja-po-imporcie.png
- Też: „Dziś bez wydatków” (z menu zasobnika; zapis w `noSpend` dziś) nie zmienia „Na razie: 1 z 2 (+1, jeśli dziś bez
  wydatków)” – czynność bez widocznego skutku (`dw-18`, dwa razy; DW.29-dzis-bez-wydatkow.png). Pozostałe działają:
  „Łączność z bazą” 0 → 1 → „2 z 2” po dwóch importach (drugi „Nowe: 0”), „Rozliczenie z domownikami” „cel chybiony (0,00
  zł)” → po wpłacie Marka 100 zł „kurs utrzymany (100,00 zł)”.

### DW.30 – LICZBY → AU-9
- Stan: `rok`, `rok-przeliczona`.
- Widać: `rok` – Pierwsze dokowanie, Seria 7 (19.09), Cisza w eterze, Seria 30 (12.10), „Ukrytych: 9”; `rok-przeliczona` –
  Pełne osłony, Pancerny kadłub (10.09), Asteroida rozbita (15.09), Pierwsze dokowanie (19.09), Cisza w eterze (12.10), Cel
  osiągnięty (20.10), Seria 7 (01.11), „Ukrytych: 6”; każde raz, opisy z prawdziwą nazwą („Osłony (bufor na pensje) doszły do
  swojego celu.”); niezdobyte bez nazw.

### DW.31 – ZGODNE
- Stan: `rok`, `dw-12`, `dw-9k2`. Zrzut: DW.31-dziennik.png
- Widać: najnowsze na górze, daty DD.MM; naruszenia z plakietką „POWAŻNE”, smaczki, klasa, stopień, misje, osiągnięcia,
  „Pokrycie przekroczenia: Auto z koperty Jedzenie – 50,00 zł limitu”; nazwy kopert zamiast identyfikatorów; nazwa kontenera
  ucięta przez pole do 80 znaków, w dzienniku zawinięta (panel bez przewijania w poziomie); bez błędu zapisu gry.

### DW.32 – ZGODNE
- Stan: `rok`, `rok-przeliczona`, `dw-9k3`, `dw-9k5`.
- Widać: „Judas Swing – zakup oznaczony jako impuls” (12.09, 02.10, 10.09, 23.09, 22.10), „12.09 Turtle Soup – zwrot towaru”;
  01.11 z wydatkiem 83,33 zł – „Liquidity sweep – energia dnia zebrana co do grosza”, z 83,32 zł – bez; dni z samymi
  smaczkami „zgodny” (02.10); zakup za domownika „impuls” – bez Judas Swing.

### DW.33 – ZGODNE
- Stan: `rok`, `dw-9k1`. Zrzuty: DW.33-koperty-start.png, DW.33-koperty-po.png, DW.33-mapa.png
- Widać: linia Equilibrium „left: 10%” (3. dzień z 30), dymek „Equilibrium: część miesiąca, która minęła – wydane ponad nią
  to Premium, poniżej Discount”; Auto 767 / 650 – „Premium”, reszta „Discount”; Mapa – „DOL” przy celu 2 (pierwszy
  nieosiągnięty, cel 1 „osiągnięty”), „DOL · PULA CELE” przy „Wkład własny – mieszkanie” (pierwszy cel ICTTJ).

### DW.34 – UWAGA
- Stan: `rok`, `dw-8`. Zrzuty: DW.34-ustawienia.png, DW.34-minimum-ponad-cel.png, DW.34-po-restarcie.png
- Widać: „Dzienny przydział energii (wydatków dnia) – wydatki dnia ≤ energia dziś” z objaśnieniem; cisza 22:00–06:00
  z Dowództwa widoczna w Ustawieniach, linia 35 % z Ustawień w Dowództwie, obie po restarcie; minimum 4 (> cel 3) –
  odrzucone z komunikatem „Minimalne osłony nie mogą przekraczać celu osłon (3 pensji) – zostaje poprzednie.”
- Tekst: w rozkazach identyfikatory decyzji – „… krótkiego wpisu (D40).”, „„Plan czy impuls?” od tej kwoty (D41)”,
  „Firewall: … gdy osłony i kadłub są pełne (D23)” (Dowództwo i Ustawienia).

### DW.35 – ZGODNE
- Stan: `rok`, cisza 11:00–15:00 (obejmuje bieżącą godzinę), `dw-8`.
- Widać: potwierdzony zakup teraz – „Zakup w ciszy nocnej: Nocny DW1 30,00 zł”; zamrożony 10.10 z zakupem 12:30 z wpisem –
  „zgodny”, bez wpisu w dzienniku; po zmianie ciszy na 22:00–06:00 dzisiejsze naruszenia nocne znikają z „Dziś na razie”.

### DW.36 – ZGODNE
- Stan: `rok`, `dw-13a–c`, `dw-6b`. Zrzuty: DW.36-progi.png, DW.36-tylko-do-odczytu.png
- Widać: awans 40 przy oknie 35 → pole wraca do 30; okno 0 i 400 → 35; okno 20 przy awansie 30 → 35; misja „2,5” → 3;
  w fi.json bez zmian; awans 25 i próg 25 % zapisane i po restarcie; dopisek „Progi działają od kolejnych zamrożonych dni –
  zamrożone oceny i awanse zostają.”; folder tylko do odczytu – pola nieedytowalne, rozkazy zablokowane, baner „Folder danych
  ma format v2 …”; próg 2 przed zamrożeniem – „23.10 Degradacja: Kadet” przy drugim poważnym; próg 2 po zamrożeniu – stopień
  bez zmian, „1 / 2”.
- Odnotowane: odrzucenie progów bez komunikatu (pole po prostu wraca); po obniżeniu awansu do 25 panel „25 / 25” bez awansu
  do kolejnego zamrożenia.

### DW.37 – ZGODNE
- Stan: `rok-przerwa`, `dw-4`, `dw-15`. Zrzuty: DW.37-po-zamrozeniu.png, DW.37-po-imporcie.png, DW.37-misja-przed-zamrozeniem.png
- Widać: 14 dni przerwy zamrożonych jako zgodne (seria 36 → 50, „12 / 30” → „26 / 30”); import 17 + 10 operacji z przerwy –
  oceny, pasek, seria i stopień bez zmian, budżet przeliczony (łupy 2 524,42 → 21,75 zł); misji W43, W44 brak, W45
  utworzona; okno odpowiada; zdarzenia z 19.10 (15 dni) nieświętowane.
- Ostrzeżenia przed zamrożeniem dni bez importu brak – tylko zwykłe „mBank: ostatni import 17 dni temu – zaimportuj nowy plik”.
- Tekst (UWAGA, potwierdzone dwa razy): przez pierwsze ~3 min, zanim powstanie misja tygodnia, panel mówi „Pierwsza misja
  w tygodniu od 07.09.2026 (pierwszy pełny tydzień gry).” – data sprzed dwóch miesięcy, gra trwa od 04.09.

## Znaleziska

- DW.29 (S) – saldo z pliku mBanku nie zalicza misji „Inwentaryzacja”, gdy plik kończy się przed poniedziałkiem misji
  (potwierdzenie z datą ostatniego dnia pliku, 01.11): po imporcie „0 z 3”, choć odprawa uznaje saldo mBanku za
  potwierdzone. Zrzut DW.29-inwentaryzacja-dowodztwo.png.
- DW.29 (N) – „Dziś bez wydatków” nie zmienia statusu misji „Dzień bez wydatków” („1 z 2 (+1, jeśli dziś bez wydatków)”
  przed i po). Zrzut DW.29-dzis-bez-wydatkow.png.

## Spostrzeżenia

1. **Import po zamrożeniu (oceny „z danych znanych wtedy”).** Gra persony oceniła 59 dni bez historii banku, bo import
   przyszedł 27 s po pierwszym zamrożeniu: Chorąży i seria 50, a te same dni z importem to Kadet, seria 7 i 31 naruszeń;
   debriefing października „Dni zgodne / z naruszeniem 31 / 0” obok „Prezenty i inne … −521,67 zł”. Po przerwie 14 dni bez
   danych zamarza jako zgodne („darmowy awans”: 12 → 26 / 30). Brakuje ostrzeżenia „dni zamrożą się bez importu” i
   informacji po imporcie, że oceny dni z importu zostają.
2. **Panel misji przed pierwszym zamrożeniem** pokazuje „Pierwsza misja w tygodniu od 07.09.2026 …” (data z przeszłości);
   dotyczy każdego pierwszego otwarcia w nowym tygodniu przez ~3 min. Lepiej „Misja tygodnia zostanie wybrana po
   zamrożeniu dni”.
3. **„Dziś na razie” nie odróżnia poważnych naruszeń** (w dzienniku plakietka „POWAŻNE”, dziś – sama treść), a alarm
   odprawy „Osłony … poniżej minimum” jest żółty, choć gra liczy go jako poważny (koperty: czerwony = poważne).
4. **Kadłub nigdy pełny bez dostawy:** cel kadłuba rośnie ze średnimi kosztami, a nadwyżka osłon go nie dopełnia (kadłub
   ok. 0,3 % pod celem przy każdym ustawieniu, osłony 19 672 zł ponad cel) – dopłata do XTB zawsze łamie firewall do
   najbliższego dokowania. Przy wyłączonym firewallu brak informacji, że dopłaty nie są sprawdzane.
5. **Teksty Dowództwa:** identyfikatory decyzji (D40, D41, D23) w rozkazach; po awansie „dni zgodne 0 (od 02.11 do 01.11)”;
   odrzucone progi gry wracają bez komunikatu (minimum osłon ma komunikat – niespójnie); po obniżeniu progu „25 / 25” bez
   awansu do jutra bez słowa wyjaśnienia.
6. Ekran „Nowa klasa” po imporcie historii po starcie gry (Zwiadowca → Niszczyciel) świętuje skutek importu, nie zmianę
   okrętu.
7. Pole nazwy kontenera ucina tekst do 80 znaków bez informacji (wklejona dłuższa nazwa znika w połowie słowa).

## Problemy laboratorium

1. Persona `rok`: dni gry zamrożone przy pierwszym starcie generatora, przed importem (`persona.spec.ts` zakłada, że
   zamrozi je drugi start) – wyrocznia musi liczyć oceny `rok` z samych wpisów ręcznych albo korzystać z odczytów
   `rok-przeliczona`.
2. `start(…, { idle: true })` nie wstrzymuje zapisów w tle, gdy użytkownik pracuje przy komputerze (aplikacja patrzy na
   bezczynność systemu) – odczyt „przed zamrożeniem” zrobiony przez `FI_FREEZE_AFTER_OPEN_MS=40000`.
3. Electron w laboratorium zgłasza `prefers-reduced-motion: reduce` (animacje 1 ms) – do DW.20 `emulateMedia` bez
   ograniczenia ruchu.
4. Przy kilku przebiegach równolegle (11:19–11:23 UTC) cztery zamknięcia aplikacji przekroczyły 40 s, choć `main.log` ma
   „koniec pracy” – wyniki zebrane przed zamknięciem; do sprawdzenia w maszynie, czy proces zostaje po wyjściu.
5. Wieczorny raport w Operacjach nie pojawił się po `setMachinePrefs({ notify: { eveningTime: '00:00' } })` przy ciszy
   23:00–05:00 – „Dziś bez wydatków” wywołane z menu zasobnika (`fi:notificationClick`).
6. Brak stanów `brzegi`, `rok-awans`, `rok-degradacja`, `rok-przerwa`, `rok-ictj` – zbudowane w skryptach (tabela wyżej);
   misje przeszłych tygodni i jedna data awansu wpisane ręcznie do `game/`.
