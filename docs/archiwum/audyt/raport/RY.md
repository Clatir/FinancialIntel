# Raport audytu – RY (rytuały)

- Data: 03.11.2026 (wtorek), 11:50–12:50 (zegar prawdziwy, Warszawa, czas zimowy – Silver Bullet byłby 16:00–17:00);
  wersja 1.15.4 z GitHub Releases (laboratorium `C:\FI-audyt`).
- Stan danych: persona `rok` (kotwica 2026-11-03) z folderem ICTTJ persony; stan `start` (KR); kopie `rok` zmienione
  przed startem (tabela niżej). Zegara nie zmieniano – rytuały zależne od pory oceniane w tym, co dostępne we wtorek
  3.11 przed 18:00, reszta „poza laboratorium (Maszyna)”.
- Przebiegi: `ry-1` … `ry-6` (`C:\FI-audyt\przebiegi\ry-*`, teksty w `out\`), skrypty `tests/audyt/ry-*.spec.ts`
  (pomocnik `wy-pomoc.ts`), odczyty `C:\FI-audyt\odczyty\ry.jsonl`, zrzuty `C:\FI-audyt\zrzuty\RY*.png`.
- Powiadomienia Windows i odsłuch: w laboratorium tylko zapisywane (`recorded`, syntezator podstawiony w oknie).

**Podsumowanie (25 punktów):** ZGODNE 12 (z nich 4 z liczbami → AU-9) · LICZBY → AU-9 1 · NIEZGODNE 3 (S 1, N 2) · UWAGA 0 ·
NIE DO SPRAWDZENIA 1 (RY.6 – pora; RY.16 b – część punktu) · poza laboratorium 8 (RY.3, 7, 10, 11, 17, 22, 25 – Maszyna;
RY.4 – Ty). Odczyty: `ry.jsonl` (RY.1, 8, 19–21, 23, 24).

## Stany szczególne

| Przebieg | Zmiana przed startem | Punkty |
| --- | --- | --- |
| `ry-1`, `ry-6` | `rok` bez zmian (odczyt; w `ry-1` głosy `pl-*` odfiltrowane w oknie przed przeładowaniem – RY.5) | RY.1, 5, 8, 9, 18–21, 23, 24 |
| `ry-2` | `rok`; z interfejsu: podział łupów października (200 zł na następny miesiąc, 300 zł cel „Wakacje 2027”, reszta do osłon), potem import `rok-nowe-historia.csv` (27.10–02.11) | RY.9, 19 |
| `ry-3a` | `rok` bez dzisiejszej Mokki; dni 01.11 (bez kosztu) i 30.10 (koszt 46,54 zł) zdjęte z zamrożonych i oznaczone „bez wydatków” (`settings.game.noSpend`); godzina wieczorna = teraz − 1 min | RY.12, 13, 15, 16 a |
| `ry-3b` | `rok` (Mokka 12 zł dziś), godzina wieczorna = teraz − 1 min, powiadomienie wieczorne wyłączone | RY.13, 16 d |
| `ry-4a`, `ry-4c` | `rok`, cisza nocna od teraz − 60 min do teraz + 3 min (dwa przebiegi) | RY.2 |
| `ry-4b` | `rok`, cisza nocna od teraz + 3 min do 05:00, godzina wieczorna = teraz + 6 min (w ciszy) | RY.16 c |
| `ry-5` | `rok`, godzina wieczorna = teraz − 1 min; restart w trakcie odłożenia | RY.14, 15 |
| `wy-5-*` | stan `start`; `seedFolder` – budżet od dziś (pierwszy miesiąc) | RY.18, 20 |

## Punkty

### RY.1 – ZGODNE (liczby → AU-9)
- Stan: rok (`ry-1`, 12:04; `wy-0` 11:52). Zrzuty: RY.1-odprawa.png, RY.1-klik-*.png
- Widać: „ODPRAWA – 3 LISTOPADA”, „ENERGIA DZIŚ 77,28 zł”, „przydział 89,28 zł · podstawowy 83,33 zł”, „◆ Neutral”; 15 pozycji:
  „Asteroida: Podatek od nieruchomości za 12 dni – 150,00 zł, w zbiorniku 150,00 zł.”, zaległy import (7 dni), dwa salda,
  „Łupy z poprzedniego miesiąca: 803,48 zł – podział do 7. dnia …”, cztery sprawy dokowania (zwrot do masy 1 000 zł –
  firewall, wpływ z XTB 1 000 zł, dwie wypłaty z ICTTJ czekające na import), dwie pożyczki, „Marek: do oddania 360,00 zł –
  najstarszy zakup z 20.08 (75 dni).”, misja tygodnia (Killzone), Netflix 43 → 49 zł, Spotify bez płatności. Kliknięcia:
  asteroida i kontenery → Ładownia, import → Import, salda → Ustawienia → Konta, łupy → Plan miesiąca, dokowanie → okno
  „Dokowanie dostawy” tej sprawy, pożyczki → Radar, Marek → Operacje, misja → Dowództwo – nigdy wszystko do Planu miesiąca.
  Żółte (akcent): łupy, zwrot do masy, wpływ z XTB, dwie pożyczki (5); czerwonych brak. „Bez alarmów – kurs stabilny.” –
  persona zawsze ma pozycje informacyjne, nie wystąpiło (folder od dziś: tylko informacyjne, powiadomienie „Bez alarmów.”).
  Pełna zgodność listy z wyrocznią – AU-9.

### RY.2 – NIEZGODNE (N)
- Stan: kopia `rok`, cisza nocna 11:21–12:24 (`ry-4a`), powtórzenie: cisza 11:39–12:42 (`ry-4c`). Zrzut: RY.2-po-ciszy.png
- Zrobione: start w ciszy (nowe dane komputera), przejście na Operacje, ruch w oknie w ciszy; po 12:24 – bez ruchu, potem
  ruch; po minucie drugi ruch.
- Widać: w ciszy – żadnego powiadomienia; o 12:24:23 (koniec ciszy, bez ruchu) przyszły zaległe powiadomienia dnia
  (asteroida, import, pożyczki, Marek, kontenery, „Debriefing miesiąca”, ICTTJ) – bez odprawy; pierwszy ruch (12:25:44) –
  jedno „Odprawa poranna: Energia dziś: 77,28 zł. Alarmy: 5.” (5 = żółte pozycje odprawy, czerwonych brak); drugi ruch po
  minucie – bez powtórki. Okno zostało na Operacjach (`page-operations`) – nie przeszło na Mostek.
- Oczekiwane: „pierwszy ruch po ciszy – jedno „Odprawa poranna” …; okno na Mostku” (punkt; T56: „okno pokazane dla odprawy
  przechodzi na Mostek”). W powtórzeniu to samo: odprawa o 12:43:32 przy pierwszym ruchu, raz, okno dalej na Operacjach.
- Skutek: powiadomienie „Odprawa poranna” przychodzi, ale okno nie pokazuje odprawy; reszta (raz dziennie, nic w ciszy,
  liczba alarmów) – zgodnie. Waga N: kliknięcie Mostka (Ctrl+1) wystarcza.

### RY.3 – poza laboratorium (Maszyna)

### RY.4 – poza laboratorium (Ty)
- Tekst odsłuchu do odsłuchania (syntezator podstawiony): „Odprawa, 3 listopada. Energia na dziś: 77 złotych 28 groszy. Daily
  Bias: Neutral. Asteroida: … 150,00 złotych …” – głos „Microsoft Adam – Polish (Poland)”, tempo 1 (`wy-0`). Ujemna energia
  i ukryte kwoty – opisane w MO (MO.17).

### RY.5 – ZGODNE (część Claude; Windows bez pakietu mowy – Maszyna)
- Stan: rok (`ry-1`, `wy-0`). Zrzut: RY.5-bez-glosu.png
- Widać: laboratorium ma głosy polskie (Microsoft Adam, Paulina) – przycisk „Odsłuchaj”, odprawa czytana głosem pl-PL
  „Microsoft Adam”. Po odfiltrowaniu głosów `pl-*` w oknie: przycisku nie ma, jest „Odsłuch: brak polskiego głosu systemu”
  z dymkiem „Ustawienia Windows → Czas i język → Mowa → Zarządzaj głosami → dodaj głos polski”.

### RY.6 – NIE DO SPRAWDZENIA (pora)
- Silver Bullet w listopadzie to 16:00–17:00 czasu polskiego; sesja laboratorium 11:50–12:50. Poza oknem (11:52, 12:04, 12:20)
  bloku „Silver Bullet · 10:00–11:00 NY” na Mostku nie ma, pełna lista pozycji – zgodnie. W oknie – Maszyna.

### RY.7 – poza laboratorium (Maszyna)

### RY.8 – ZGODNE (liczby → AU-9)
- Stan: rok (`ry-1`, 12:05). Zrzuty: RY.8.png, RY.8-dowodztwo.png
- Widać: „RAPORT WACHTY – 26.10.2026 – 01.11.2026” (poniedziałek–niedziela); „Koszty netto 105,22 zł” = dni (26,88 + 0 + 31,80 +
  0 + 46,54 + 0 + 0) = kategorie („Jedzenie 87,28 zł”, „Zdrowie 17,94 zł”); „Przychody 0,00 zł” z dymkiem „Przychód (D81): …”
  (nie „Wpływy”); każdy dzień „zgodny” = Dowództwo („26.10.2026 – zgodny” … „01.11.2026 – zgodny”); „KILLZONE TYGODNIA śr
  08:00–09:00 – 31,80 zł (1 zak.)”; „MISJA TYGODNIA Bez misji w tym tygodniu.” (misja persony dopiero od 02.11 – tak samo
  w Dowództwie); „KOPERTY NA NASTĘPNY TYDZIEŃ Jedzenie 411,70 zł na 7 dni (zostało 1 588,00 zł)” … (7 dni, nie więcej).
  Tydzień 05.10–11.10: „Ładownia (kontenery i opłaty okresowe) 49,00 zł” wśród kategorii, „czw 16:00–17:00 – 17,62 zł
  (1 zak.)”, panel kopert ukryty (tydzień dawny). Tydzień w toku 02.11–08.11: misja „… – na razie na kursie.”, dni
  przyszłe „0,00 zł —” bez oceny.

### RY.9 – NIEZGODNE (N)
- Stan: rok (`ry-1` 12:05, `ry-2` 12:14). Zrzuty: RY.9.png, RY.9-pozniej.png
- Zrobione: Raporty → „Raport wachty” we wtorek 12:05; „‹ tydzień wcześniej” × 3; Operacje i powrót; „bieżący”; „później ›”
  (trzy razy w `ry-2`).
- Widać: domyślnie „26.10.2026 – 01.11.2026” (poprzedni pełny tydzień – dobrze); × 3 → „05.10.2026 – 11.10.2026”, po innym
  ekranie dalej ten tydzień (dobrze); „bieżący” → „26.10.2026 – 01.11.2026”. Na tym tygodniu „później ›” jest aktywne
  (`disabled=false`) i prowadzi do „02.11.2026 – 08.11.2026” – tygodnia w toku (wt 03.11 12,00 zł, śr–nd 0,00 zł „—”); tam
  dopiero „później ›” nieaktywne. Dalej w przyszłość się nie da.
- Oczekiwane: „„później ›” nieaktywne na bieżącym tygodniu” – przed niedzielą 18:00 bieżący (domyślny) jest tydzień
  26.10–01.11 i z niego nie powinno się dać przejść do niepełnego tygodnia (T83: raport bieżącego tygodnia od niedzieli
  18:00). Przycisk „bieżący” i „później ›” znaczą tu różne tygodnie.

### RY.10, RY.11 – poza laboratorium (Maszyna)

### RY.12 – ZGODNE
- Stan: kopia `rok` bez dzisiejszego zakupu, godzina wieczorna 12:31 (`ry-3a`, powtórzony przebieg 12:32–12:36); `rok`
  (Mokka 08:10) w `ry-5` i `ry-4b`. Zrzuty: RY.12-pasek.png, RY.12-po-2-wpisach.png
- Widać: Operacje – pasek „Raport wachty dnia · Dziś nic jeszcze nie dopisano – szybki wpis albo „Dziś bez wydatków”, gdy nic
  nie wydano.” z przyciskami „Dopisz”, „Dziś bez wydatków”, „Przypomnij za 30 min”; jedno powiadomienie o tej samej treści
  przy starcie. „Dopisz” otwiera szybki wpis; po wydatku 10:00 – „Dziś dopisano 1 operację z godziną – dopisz resztę albo
  potwierdź „Dziś bez wydatków”.”, po drugim (11:30) – „Dziś dopisano 2 operacje z godziną – …”. Przez 2,5 minuty i po
  restartach żadnego kolejnego powiadomienia. Pasek przed godziną z ustawień – nie do zobaczenia w laboratorium bez zmiany
  godziny (godzina ustawiana na „teraz − 1 min”); w `ry-4b` pasku nie było przed 12:29, był od 12:29 (godzina przeniesiona
  przed ciszę).

### RY.13 – ZGODNE (część; misja „Dzień bez wydatków” – brak w stanie)
- Stan: `ry-3a` (dziś bez kosztu; 01.11 i 30.10 oznaczone „bez wydatków” i zdjęte z zamrożonych), `ry-3b` (dziś 12 zł).
  Zrzuty: RY.13-zamkniety.png, RY.13-dowodztwo.png, RY.13-dzien-z-wydatkiem.png
- Widać: „Dziś bez wydatków” → „Raport wachty zamknięty („Dziś bez wydatków”)” z „Wznów raport wachty”; w `fi.json`
  `noSpend["2026-11-03"]`; po restarcie pasek dalej zamknięty. Ponownie zamrożony 01.11 (bez kosztu) – `tags: ["nospend"]`,
  w dzienniku wachty Dowództwa „Dzień bez wydatków – potwierdzony w raporcie wachty”; 30.10 (koszt 46,54 zł) – bez znacznika.
  Dzień z wydatkiem (`ry-3b`): „Dziś bez wydatków” przy wydatku 12 zł z dziś – bez ostrzeżenia: toast „Dziś bez wydatków –
  zapisane w dzienniku wachty.” z „Cofnij”, pasek zamknięty, potwierdzenie zapisane w `fi.json` (znacznik po zamrożeniu
  zależy od kosztu dnia – jak dla 30.10, które znacznika nie dostało).
- Misji „Dzień bez wydatków” persona nie ma – zaliczenie misji nie sprawdzone.

### RY.14 – ZGODNE
- Stan: `rok`, godzina wieczorna 12:11 (`ry-5`, 12:12–12:48, restart o 12:18). Zrzuty: RY.14-odlozony.png, RY.14-po-30-min.png
- Widać: 12:12 „Przypomnij za 30 min” → toast „Przypomnę o 12:42.”, pasek „Raport wachty odłożony do 12:42” z „Wznów raport
  wachty” (czas polski, GG:MM); po restarcie o 12:18 dalej „odłożony do 12:42” i bez nowego powiadomienia; do 12:39 pasek
  zamknięty, zero powiadomień; o 12:42:14 jedno nowe „Raport wachty dnia: Dziś dopisano 1 operację z godziną – …” i pasek
  wraca; do 12:48 bez kolejnych. Odłożenie zapisane tylko w danych komputera (nie w folderze) – drugiego komputera nie
  sprawdzano.

### RY.15 – ZGODNE
- Stan: `ry-3a` (po „Dziś bez wydatków”), `ry-5` (po odłożeniu). Zrzut: RY.15-wznowiony.png
- Widać: „Wznów raport wachty” po „Dziś bez wydatków” – pasek z przyciskami wraca, w `fi.json` potwierdzenie dnia znika
  (`noSpend` bez 03.11); po restarcie pasek otwarty. Po drugim odłożeniu („odłożony do 13:18”) „Wznów” – pasek wraca,
  odłożenie skasowane (dane komputera bez wpisu), po restarcie pasek otwarty.

### RY.16 – ZGODNE (a, c, d); (b) – NIE DO SPRAWDZENIA (pora)
- Stan: `ry-3a` (a), `ry-4b` (c, cisza 12:30–05:00, godzina wieczorna 12:33), `ry-3b` (d). Zrzuty: RY.16-a.png,
  RY.16-c-ustawienia.png, RY.16-c-pasek.png, RY.16-d.png
- (a) wydatek z godziną 19:00 dopisany o 12:35 – pasek znika, przez minutę żadnego powiadomienia.
- (b) wydatek z godziną 12:00 dopisany po 18:00 – wymaga sesji po 18:00 (data utworzenia wpisu), nie do zrobienia bez zmiany
  zegara.
- (c) Ustawienia → Powiadomienia: „w ciszy nocnej (12:30–05:00) – przyjdzie o 12:29”; o 12:29:06 powiadomienie „Raport wachty
  dnia” i pasek w Operacjach – minutę przed ciszą.
- (d) powiadomienie wieczorne wyłączone (`notify.evening: false`), godzina 12:31 – pasek „Raport wachty dnia” jest, przez
  ponad minutę żadnego powiadomienia „Raport wachty dnia” (tylko odprawa poranna).

### RY.17 – poza laboratorium (Maszyna)

### RY.18 – ZGODNE (część Claude; przełom miesiąca i 8. dzień – Maszyna)
- Stan: rok (`ry-1`, `wy-0`), `start` (`wy-5-start`), budżet od dziś (`wy-5-od-dzis`).
- Widać: pierwszy start 3 listopada (dzień 3) – jedno „Debriefing miesiąca: Miesiąc zamknięty – wynik wobec planu i podział
  łupów (Plan miesiąca).”; drugi start tego samego dnia na tych samych danych komputera – żadnego powiadomienia (także bez
  ponownej odprawy); `start` i budżet od dziś (pierwszy miesiąc budżetu) – tylko „Odprawa poranna …”, debriefingu brak.
  Kliknięcie powiadomienia – nie do sprawdzenia (laboratorium tylko zapisuje powiadomienia).

### RY.19 – ZGODNE (liczby → AU-9)
- Stan: rok (`ry-1`), rok + podział łupów i późny import (`ry-2`, 12:14–12:16), `wy-3` (sierpień bez kopert). Zrzuty:
  RY.19-raporty-*.png, RY.19-plan-*.png
- Widać: domyślnie „DEBRIEFING – PAŹDZIERNIK 2026”; „Pensja od siebie 6 500,00 zł”, „Koszty netto 5 413,19 zł”, „Ładownia
  (kontenery i opłaty okresowe) 1 738,00 zł”, „Sfinansowane przez domowników 169,86 zł (Anna)”, „Energia miesiąca (pensja po
  odkładkach, z łupami) 6 216,67 zł”, „Wydane z energii (i ponad nią z osłon) 5 413,19 zł”, „Bilans paliwa … +6 086,81 zł”,
  „Stopa oszczędności 52,9% (mediana 6 mies.: 28,4%)”, „Miesiąc zamknięty na plus tak”, „Łupy … 803,48 zł”; FVG z „Pula
  codzienna (z łupami i bez kategorii) 2 500,00 zł 1 766,52 zł +733,48 zł”; „Dni zgodne / z naruszeniem 31 / 0”, „Poważne
  naruszenia 0”, „Misje wykonane 0 z 0”, „Osiągnięcia Cisza w eterze, Seria 30”; dziennik „Plan 2 · 522,46 zł”, „Impuls
  3 · 744,82 zł”, „Bez oznaczenia (od progu) 1”, „Trafność … 40%”. Wiersze składają się na koszty netto (1 738,00 +
  3 675,19). Te same kwoty w Planie miesiąca i w Wywiadzie (FVG, bilans). „Bez koperty” pojawia się, gdy jest (sierpień bez
  kopert: „Bez koperty 3 805,49 zł (Jedzenie, Auto, …)”).
- Po decyzji (200 / 300 / reszta): „PODZIAŁ ŁUPÓW Na następny miesiąc 200,00 zł / Do celów 300,00 zł / Do osłon 303,48 zł”.
  Po późnym imporcie (+744,48 zł kosztów października): „Koszty netto 6 157,67 zł”, „Łupy … 59,00 zł”, podział „0,00 / 59,00 /
  0,00” – z silnika, nie z zapisanej decyzji; w Planie „Łupy zmieniły się po decyzji (było 803,48 zł, jest 59,00 zł) – podział
  przeliczony: cele, następny miesiąc, reszta do osłon.” Kolejność przeliczenia (najpierw cel) – do oceny wyroczni.

### RY.20 – ZGODNE
- Stan: rok (`ry-1`), `start`, budżet od dziś (`wy-5`). Zrzuty: RY.20-raporty-2026-11.png, RY.20-raporty-2025-09.png
- Widać: listopad 2026 – „Miesiąc zamknięty na plus miesiąc trwa”, „Łupy (energia na koniec miesiąca) miesiąc trwa”; lista
  od „wrzesień 2025” (pierwszy miesiąc budżetu) do „listopad 2026”; wrzesień 2025 – „Energia miesiąca … 5 726,68 zł”, „Łupy
  488,86 zł” (silnik przeszedł koniec miesiąca), stopa bez mediany. `start` i budżet od dziś – lista tylko „listopad 2026”,
  „Pensja od siebie 6 700,00 zł” / „4 000,00 zł” = energia (kosztów sprzed startu w listopadzie brak), łupy „miesiąc trwa”.
- Spostrzeżenie: w miesiącu w toku „Bilans paliwa (przychód − koszty netto) −12,00 zł” – ujemny bilans po trzech dniach
  miesiąca, przed wpływem pensji z pracy.

### RY.21 – ZGODNE (liczby → AU-9; dźwięk – Ty)
- Stan: rok (`ry-1`, `ry-6`). Zrzuty: RY.21-plan-01.png (na plus), RY.21-plan-02.png, RY.21-plan-04.png, RY.21-plan-05.png,
  RY.21-plan-08.png
- Widać: na plus (październik 2026): wyróżniony blok „Miesiąc zamknięty na plus – Wydatki z energii 5 413,19 zł nie
  przekroczyły energii miesiąca 6 216,67 zł.” (ramka w akcencie, animacje „event-in” i „sweep” – przy pierwszym, drugim otwarciu i po restarcie, `ry-6`); na minusie z energią wyczerpaną (wrzesień 2026): „Energia
  wyczerpana: 934,30 zł ponad energię miesiąca 6 254,17 zł poszło z osłon.” (także grudzień 2025, listopad 2025). Trzeci
  przypadek – koszty ≤ pensja, energia wyczerpana przez raty odkładek: lipiec 2026 („Wydane z energii 6 499,18 zł”, pensja
  6 500, energia 6 282,64) – „Energia wyczerpana: 216,54 zł …”, bez bloku na plus; tak samo czerwiec (6 370,87) i marzec
  2026 (6 450,65). Odnotowane: aplikacja rozstrzyga według T178 (wynik energii), nie „koszty ≤ pensja” ze specyfikacji.
  Wynik ten sam w Planie i w Raportach („Miesiąc zamknięty na plus tak / nie”). Eksport „Miesiące” – obszar RE.

### RY.22 – poza laboratorium (Maszyna, dźwięk – Ty)

### RY.23 – LICZBY → AU-9
- Stan: rok (`ry-1`, 12:06; `ry-6`). Zrzuty: RY.23-2025.png, RY.23-2025-dol.png, RY.23-2026.png
- Widać (2025, rok poprzedni): „Koszty netto 25 515,45 zł”, „Sfinansowane przez domowników 618,28 zł (Anna)”, „Przychody
  37 500,00 zł”, „Pieniądze na kontach na początku (31.12 roku wcześniej) 20 800,00 zł”, „… na końcu (31.12) 40 686,27 zł”,
  „Siła floty netto na początku (z należnościami, bez długu) 20 800,00 zł”, „… na końcu (31.12) 33 784,55 zł”, „Bilans paliwa
  roku … +11 984,55 zł · stopa oszczędności 32%”, „Zasięg teraz 7,8 mies. (Niszczyciel)”; miesiące z dopiskiem o tradingu
  netto; kategorie (9); „Cele osiągnięte w roku —”, „Osiągnięcia roku —”; „PIT-38 Rozliczenie za 2025: termin 30 kwietnia
  2026. Kwotę liczy ICT Trade Journal (rezerwa podatkowa).” – bez kwoty. Koniec 2025 (40 686,27) = początek 2026; leży między
  punktami krzywej 28.12.2025 (41 800,01) i 04.01.2026 (39 670,05).
- Do wyroczni: rok 2026 – „Cele osiągnięte w roku: Nowy laptop” (osiągnięty kwotą), bez „Rower” (w danych `achievedAt`
  20.03.2026, potem zarchiwizowany); „Przychody 95 000,00 zł” przy sumie miesięcy 96 000 (dopisek: przychody roku nettują
  dopłaty z całego roku – zwrot 1 000 zł do XTB w marcu).

### RY.24 – NIEZGODNE (S)
- Stan: rok (`ry-1` 12:06, `ry-6` 12:39 – powtórzenie), budżet od dziś (`wy-5-od-dzis`, 12:28). Zrzuty: RY.23-2025.png,
  RY.24-2025.png, RY.23-2026.png
- Zrobione: Raporty → „Przegląd roczny”: lista lat, 2025 (pierwszy rok historii, od września), 2026 (bieżący).
- Widać: lista „2026, 2025”, domyślnie 2026 (dobrze); 2026 – „Pieniądze na kontach na końcu (dziś)” (dobrze, bez 31.12
  w przyszłości). 2025: tabela miesięcy „styczeń 2025 0,00 zł 0,00 zł” … „sierpień 2025 0,00 zł 0,00 zł” – osiem miesięcy
  sprzed historii jako zera, dopiero „wrzesień 2025 5 568,82 zł 7 500,00 zł”; „Pieniądze na kontach na początku (31.12 roku
  wcześniej) 20 800,00 zł” – to saldo otwarcia z 01.09.2025, podpisane datą 31.12.2024, kiedy budżetu i historii nie było.
  Budżet od 03.11.2026: rok 2026 – wszystkie miesiące styczeń–grudzień „0,00 zł”, „na początku (31.12 roku wcześniej)
  25 000,00 zł” (saldo otwarcia z 03.11.2026). Bieżący rok pokazuje też grudzień 2026 (przyszły) jako „0,00 zł”. Sumy roku
  poprawne (koszty 25 515,45 = suma czterech miesięcy).
- Oczekiwane: „pierwszy rok – saldo na początku zgodne z historią (bez fałszywego 0 zł), miesiące tylko objęte” (punkt).
  Saldo nie jest fałszywym zerem, ale miesiące spoza historii są w tabeli jako 0,00 zł, a data salda początkowego jest
  nieprawdziwa. Skutek: rok wygląda, jakby osiem miesięcy nic nie kosztowało.

### RY.25 – poza laboratorium (Maszyna)

## Znaleziska

- RY.24 – NIEZGODNE (S): przegląd roczny pierwszego roku pokazuje miesiące sprzed historii jako „0,00 zł” (styczeń–sierpień
  2025; przy budżecie od 03.11.2026 – cały 2026) i saldo otwarcia podpisane „na początku (31.12 roku wcześniej)”.
- RY.9 – NIEZGODNE (N): „później ›” aktywne na domyślnym („bieżącym”) tygodniu 26.10–01.11 – prowadzi do niepełnego tygodnia
  w toku 02.11–08.11.
- RY.2 – NIEZGODNE (N): odprawa poranna po ciszy nocnej przychodzi (raz, z liczbą alarmów), ale okno otwarte na innym
  ekranie nie przechodzi na Mostek.

## Spostrzeżenia

1. **„Dziś bez wydatków” przy wydatku z dziś** zapisuje potwierdzenie bez słowa ostrzeżenia („Dziś bez wydatków – zapisane
   w dzienniku wachty.”), choć dzień ze 12 zł kosztu i tak nie dostanie znacznika – użytkownik myśli, że zamknął dzień „na
   zero”.
2. **Przycisk „bieżący” w raporcie wachty** wraca do poprzedniego pełnego tygodnia, a tydzień w toku osiąga się „później ›” –
   dwie różne definicje „bieżącego” na jednym panelu; „Koperty na następny tydzień” w tygodniu w toku liczą te same 7 dni co
   w poprzednim.
3. **Rozkład łupów po późnym imporcie** przelicza decyzję (było 200 / 300 / 303,48, jest 0 / 59 / 0) – komunikat w Planie
   miesiąca jest, w Raportach → Debriefing tylko liczby bez słowa, że podział zmienił się po decyzji.
4. **Odprawa poranna przy oknie otwartym w ciszy:** wszystkie inne powiadomienia dnia przychodzą same w minucie końca ciszy
   (bez ruchu), odprawa dopiero przy ruchu – kolejność odwrotna niż w rytuale („najpierw odprawa”); okno zostaje na bieżącym
   ekranie.
5. **Przegląd roczny:** „Siła floty netto na początku (z należnościami, bez długu)” – „bez długu” czyta się jak „dług
   pominięty”, a netto go odejmuje; stopa oszczędności roku bez miejsca po przecinku („32%”, „33%”), w Bilansie paliwa
   z jednym („52,9%”). „Cele osiągnięte w roku 2026: Nowy laptop” bez celu „Rower” (osiągnięty 20.03.2026, potem
   zarchiwizowany) – do wyroczni.
6. **Debriefing miesiąca w toku** pokazuje „Bilans paliwa −12,00 zł” po trzech dniach (przed pensją z pracy) – czerwony
   bilans, który nic nie mówi; lepiej „miesiąc trwa” jak przy łupach.
7. **Raporty → Odprawa** pokazuje Daily Bias bez strzałki i koloru („Bearish” zwykłym tekstem), Mostek – „▼ Bearish”
   w akcencie; ta sama odprawa w dwóch postaciach.

## Problemy laboratorium

- Zegar systemu bez zmian: Silver Bullet (16:00–17:00), niedziela 18:00, przełom miesiąca, styczeń, wpis po 18:00 – Maszyna.
- Powiadomienia Windows są tylko zapisywane – kliknięcia powiadomień (RY.18, RY.17) nie do wykonania.
- Kilka aplikacji naraz – zamknięcie przekraczało 40 s (pierwszy `ry-3` przerwany na restarcie); powtórzony sam, z obsługą
  zawieszonego zamknięcia.
- Zdjęcie dni z zamrożonych w `ry-3a` dało świętowanie „Nowa klasa: Niszczyciel – Zasięg okrętu wzrósł (30.10.2026).” –
  persona zamroziła 01.11 z klasą „scout” (niepełne dane przy generowaniu); okno świętowania zasłaniało pasek, skrypt je
  zamyka.
- Stan `start` ma pełną historię z importu (14 miesięcy) – „pierwszy miesiąc budżetu bez historii” zrobiony osobnym folderem
  (`seedFolder`, budżet od dziś).
