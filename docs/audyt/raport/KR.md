# Raport audytu – KR (kreator startu)

- Data: 03.11.2026, 11:09–11:45 (zegar prawdziwy, Warszawa); wersja 1.15.4 z GitHub Releases (laboratorium `C:\FI-audyt`,
  `start()` z `tests/audyt/lab.ts`).
- Stan danych: `pusty` (nowy folder z propozycji ekranu wyboru folderu, czysty `userData`), `rok` (kotwica 2026-11-03)
  dla KR.4 i KR.5; stany szczególne – tabela niżej. Pliki z banku: `C:\FI-audyt\pliki\rok-historia.csv` i własne
  `C:\FI-audyt\pliki\kr\*.csv` (generator `tests/audyt/kr-pliki.spec.ts`, opis w `pliki\kr\pliki.log`).
- Przebiegi: `kr-*` (`C:\FI-audyt\przebiegi\kr-*\kr.log` – tekst ekranów, pola, pliki), skrypty
  `tests/audyt/kr-*.spec.ts` (pomocnik `kr-pomoc.ts`), odczyty liczb `C:\FI-audyt\odczyty\kr.jsonl`, zrzuty
  `C:\FI-audyt\zrzuty\KR*.png`.
- Folder ICTTJ (kopia `ictj-rok` w `kr-pelny`, własna fikstura w `kr-podzial`): po przebiegach sumy kontrolne bez zmian.

**Podsumowanie (33 punkty):** ZGODNE 17 · LICZBY → AU-9 4 · UWAGA 3 · NIEZGODNE 8 (S 7, N 1) · poza laboratorium 1
(KR.33 – Ty).

## Stan `start` (dla innych obszarów)

`C:\FI-audyt\stany\start` (+ `ictj-start` – kopia `ictj-rok`, więc `useState('start', …)` daje też folder ICTTJ) –
przebieg `kr-pelny`, kreator przejściem typowym, 03.11.2026 ok. 11:16:
- Krok 1: mBank 72 073,56 zł (saldo po zaksięgowanych wierszach `rok-nowe-historia.csv` – „saldo w banku teraz”),
  Portfel XTB 2 450,00, Gotówka 180,00; domownik „Anna” (bez sald na start).
- Krok 2: `rok-historia.csv` (908 operacji): „Przyjmij pewne (25)”, potem decyzje grupowe persony (kategorie sklepów,
  zwrot ZARA, wynagrodzenie – przychód, XTB – trading, PIT-38 – podatek, ROBERT – wydatek bez kategorii / wpływ jako
  pożyczka, TOMASZ – pożyczka, MAREK – przychód, ANNA – „Od domownika: Anna – reszta jako przychód”, bankomat – Gotówka).
- Krok 3: pensja z propozycji 6 700,00; osłony 3 pensje, kadłub 6 miesięcy (cel 39 880,50).
- Krok 4: ładownia WSPÓLNOTA 1 450, CITYFIT 129, NETIA 60, P4 50, NETFLIX 49 (PZU i TAURON nie były proponowane);
  koperty z propozycji.
- Krok 5: folder ICTTJ „z tego komputera” (kopia `ictj-rok`: cele „Wkład własny – mieszkanie” 40 000, „Nowe stanowisko
  tradingowe” 3 000) + cel własny „Rower górski” 3 500.
- Krok 6: podział z propozycji (osłony 20 100, kadłub 39 880,50, cel „Wkład własny” 14 723,06).
- Krok 7: „Flagowiec”, rozkazy domyślne, skrót wyczyszczony (laboratorium bez globalnego skrótu), „Uruchamiaj z
  Windows” jak proponował kreator – zapisane tylko w laboratorium, w `config.json` przebiegu potem wyłączone.
- Po starcie: osłony 13 400,00 / 20 100, energia 6 700,00, kadłub 39 880,50, cele 14 723,06, suma kont 74 703,56 zł;
  gra od 04.11.2026. Uwaga dla innych obszarów: nowe pliki `rok-nowe-*.csv` (27.10–02.11) są niezaimportowane.

## Stany szczególne

| Przebieg | Stan (co dodano) | Punkty |
| --- | --- | --- |
| `kr-pelny` | wariant typowy (wyżej) | KR.1, 2, 6, 13, 15, 17, 19–22, 26–28, 32 |
| `kr-salda`, `-2` | nowy folder + operacja ręczna mBank za 5 dni (08.11, −300,00, zapis rekordu przed drugim startem) + `kr-dzis.csv` (historia persony + dziś BIEDRONKA −45,90 i ŻABKA −12,00) | KR.7, 9, 11, 12, 22 (pominięcie) |
| `kr-otwarcie` | nowy folder + `kr-dzis.csv` na ekranie Import + saldo otwarcia mBanku 18 000,00 z 01.09.2025 (Ustawienia → Konta) | KR.6 (wariant), KR.8 |
| `kr-podzial`, `-2` | nowy folder bez historii; ICTTJ „z tego komputera” – fikstura z prognozą „Plan A”, cel „A” 5 000 | KR.23, 24 |
| `kr-miesiac`, `-2` | nowy folder + `kr-miesiac.csv` (syntetyczna historia 24 mies.: czynsz, Netia, Netflix, CityFit, prąd co miesiąc o zmiennej kwocie, garaż co kwartał, OC PZU co rok – zapłacone 02.11 tego miesiąca, OC WARTA co rok – termin w styczniu; w tym miesiącu przed dziś CityFit 129, Biedronka 85,40, Orlen 210, zwrot ZARA +40, PZU 1 240) | KR.16, 19, 20, 21, 25 |
| `kr-komputer` | nowy folder bez historii; `config.json` przed startem: skrót Ctrl+Shift+Q, „Zamykaj do zasobnika” wyłączone | KR.10, 14, 26, 27, 29 |
| `kr-minus` | nowy folder bez historii, mBank −150,00 | KR.10 |
| `kr-krotka` | nowy folder + `kr-krotka.csv` (wiersze persony 01.09–01.11: dwa pełne miesiące i bieżący) | KR.18 |
| `kr-nawigacja`, `-2` | nowy folder + `kr-krotka.csv` | KR.13 (baner), 30, 31 |
| `kr-obce-nowe`, `kr-obce-otworz` (+ pierwszy `kr-obce`) | folder w laboratorium z dwoma obcymi plikami | KR.3 |
| `kr-istniejace` | kopia `rok`, czysty `userData`, komputer `DRUGI-PC` | KR.4 |
| `kr-postep` | kopia `rok`, `FI_OPEN_DELAY_MS` 1500, `FI_OPEN_SLOW_MS` 1000 | KR.5 |
| `kr-ro-atrybut`, `-2` | nowy folder, potem `attrib +R /S /D` na plikach i folderze (zdjęte po przebiegu) | KR.29 (a) |
| `kr-ro-nowszy` | nowy folder, `fi.json` z `schemaVersion: 2` (format nowszej wersji) | KR.29 (b) |

## Punkty

### KR.1 – ZGODNE
- Stan: pusty, przebieg kr-pelny, 11:15. Widać: „Financial·Intel”, „Kapitanie, gdzie trzymamy dziennik pokładowy?”,
  opis (pliki JSON, najlepiej OneDrive, wybór zapamiętany na tym komputerze), „Utwórz w OneDrive (zalecane)” ze ścieżką
  `…\OneDrive\FinancialIntel`, „Nowe dane gdzie indziej / wybierz pusty folder”, „Otwórz istniejące / folder z plikiem
  fi.json (np. z drugiego komputera)”, „Folder logów (diagnostyka)”; bez menu bocznego, folder nie istnieje przed
  kliknięciem, bez angielskich tekstów. Zrzut: KR.1.png.
- Wariant bez OneDrive („Utwórz w Dokumentach”) – NIE DO SPRAWDZENIA w laboratorium (propozycję podstawia
  `FI_DEFAULT_DATA_DIR`).

### KR.2 – ZGODNE
- `fi.json`: wcięcie 2, końcowe `\n`, `schemaVersion` 1, „Flagowiec”; konta mBank / Portfel XTB / Gotówka; 9 kategorii
  z podkategoriami + systemowa „Gotówka”, „Auto · przejazdy”; codzienne: Jedzenie, Rozrywka i hobby, Osobiste, Gotówka
  (reszta planowe); reguły Bolt → Rozrywka i hobby, KOLEO → Auto · przejazdy; bez „Trading”. Po kliknięciu okno główne
  z banerem kreatora. Zapisy tylko w folderze przebiegu i jego `userData` (`config.json` → ścieżki laboratorium;
  `Dokumenty\FinancialIntel` nie powstał). Prawdziwego OneDrive i `%APPDATA%` nie da się porównać plik w plik (pisze tam
  Twoja działająca aplikacja) – sprawdzone po ścieżkach. Zrzut: KR.2-kategorie.png.

### KR.3 – NIEZGODNE (N)
- Stan: pusty + folder `Dokumenty-test` z `notatki.txt` i `budzet-stary.xlsx`; przebiegi kr-obce (11:29), potwierdzenie
  kr-obce-nowe i kr-obce-otworz (11:32).
- Zrobione: „Nowe dane gdzie indziej” → w oknie wyboru folder z obcymi plikami.
- Widać: od razu okno główne, pasek ścieżki „…\Dokumenty-test\FinancialIntel”; żadnego komunikatu ani przycisku,
  żadnego toastu. Dane powstały w podfolderze `FinancialIntel`, obce pliki bajt w bajt bez zmian.
- Oczekiwane: komunikat, że folder zawiera inne pliki, i przycisk „Utwórz podfolder FinancialIntel”. Tak jest tylko
  w drodze „Otwórz istniejące”: „W tym folderze nie ma danych Financial Intel (fi.json). Można utworzyć w nim podfolder
  „FinancialIntel”.” + „Utwórz podfolder FinancialIntel”.
- Skutek: bezpieczny (nic obok obcych plików), ale użytkownik nie wie, że dane są w innym folderze niż wskazał.
- Zrzuty: KR.3-setup-create.png, KR.3-setup-open.png.

### KR.4 – ZGODNE
- Kopia `rok`, `DRUGI-PC`: od razu Mostek ze Stanem okrętu, bez kreatora i banera kreatora; raz baner „Uruchamiać
  Financial Intel z Windows na tym komputerze? Przypomnienia i powiadomienia działają wtedy w tle (ukryta w zasobniku).”
  z „Tak, z Windows” / „Nie”; po „Nie” znika, po ponownym starcie nie wraca (zapis autostartu: `openAtLogin: false`).
  Folder bez zmian (sumy kontrolne). Zamknięcie przez `app.close()` (odpowiednik „Zakończ”). Zrzuty: KR.4-mostek.png,
  KR.4-drugi-start.png.

### KR.5 – ZGODNE
- Panel: „Sprawdzanie folderu”, „Wczytywanie plików: 0 z 1035 … 96 z 1035”, czas w s, pasek (9 %), „Czeka 1 s:
  transactions/2025/…”, „Pliki czytają się wolno (96 czekało dłużej niż 1 s) … „Zawsze zachowuj na tym urządzeniu” …”.
  „Otwórz folder logów” → otwarcie `userdata\logs` (zapis laboratorium). „Przerwij” → ekran wyboru folderu: „Przerwano
  wczytywanie folderu – nic w nim nie zostało zmienione. …” + „Spróbuj ponownie”; folder bajt w bajt bez zmian. Etap
  „Szukanie plików – znaleziono N” mignął szybciej niż odczyt co 250 ms. Zrzuty: KR.5-postep.png, KR.5-przerwij.png.

### KR.6 – ZGODNE
- Mostek i Operacje: „Budżet jeszcze nie wystartował: kreator startu ustawi salda, pensję, warstwy okrętu i koperty.”
  + „Kreator startu”; na ekranie kreatora baneru nie ma, po „Uruchom budżet” znika. Dowództwo: „gra wystartuje, gdy
  budżet działa”.
- Wariant (kr-otwarcie, saldo otwarcia 18 000 z 01.09.2025): „Budżet liczy się na razie od salda otwarcia, bez planu:
  kreator startu ustawi od dziś salda, pensję, warstwy okrętu i koperty. Dowództwo zacznie się po kreatorze.”;
  Dowództwo bez ocen (`game.start` null, brak `game/`). Zrzuty: KR.6-mostek.png, KR.6-operacje.png,
  KR.6-wariant-mostek.png, KR.6-wariant-dowodztwo.png.

### KR.7 – ZGODNE (liczby zapisane)
- kr-salda: notki „Saldo każdego konta tak, jak widzisz je teraz w banku (z dzisiejszymi operacjami). Od dziś suma
  kont = warstwy okrętu.” i o koncie tradingowym XTB; przy Gotówce „Gotówka w portfelu – puste = 0 zł.” (pusta
  przyjęta). Po starcie saldo otwarcia mBanku 8 490,07 zł z dnia 03.11.2026 (8 432,17 + 45,90 + 12,00), Portfel 1 250,00;
  „Suma kont budżetu: 9 682,17 zł”. Zrzuty: KR.7-krok1.png, KR.7-konta.png.

### KR.8 – ZGODNE
- Podpowiedź: „Ma już saldo otwarcia – puste pole: 69 796,78 zł (saldo otwarcia i operacje do wczoraj).” (= 18 000 +
  operacje do 02.11); krok 6 „Obecne środki: 71 046,78 zł” (z Portfelem 1 250); po starcie jedno saldo otwarcia mBanku
  (01.09.2025, 18 000) i „Suma kont budżetu: 70 988,88 zł” = 69 796,78 − 57,90 + 1 250. Zrzuty: KR.8-krok1.png,
  KR.8-krok6.png, KR.8-mostek.png.

### KR.9 – ZGODNE
- Podpowiedź: „Na koncie 1 operacja z datą po dziś – saldo „teraz” ich nie obejmuje, silnik odejmie je w ich dniu.”
  Saldo otwarcia 8 490,07 (bez −300); saldo mBanku dziś 8 432,17 (Ustawienia, Operacje); Radar → „Salda kont za 90 dni”:
  „mBank 8 432,17 zł · min. 8 132,17 zł (08.11)” – spadek o 300 dopiero w dniu operacji, raz. Dzień operacji sprawdzony
  prognozą Radaru, nie zegarem. Zrzuty: KR.9-krok1.png, KR.9-radar.png.

### KR.10 – ZGODNE
- 0 (Portfel) → „0,00”; −150,00 przyjęte jako „−150,00” (krok 6 „Obecne środki: −150,00 zł”, osłony −150,00); po
  starcie z −150 (kr-minus): „Deficyt: osłony (bufor na pensje) poniżej zera o 150,00 zł.”, „Pensja częściowa: brakuje
  4 000,00 zł …”, bez błędu okna. 1 234 567,89 bez zaokrągleń w kroku 6 i na Mostku (osłony 1 211 367,89, suma
  1 234 567,89), układ nie rozjechany. „1.200” i „12,345” odrzucone („Nieprawidłowa kwota – zostaje poprzednia.”, pole
  wraca do poprzedniej wartości). Zrzuty: KR.10-minus-krok6.png, KR.10-minus-mostek.png, KR.10-duza-krok6.png,
  KR.26-mostek.png.

### KR.11 – ZGODNE
- Osoby od razu na liście (Dom, Ania, Łukasz Żółć – polskie znaki bez zniekształceń). U Ani wpisanie zaliczki 50 czyści
  „ma oddać” i odwrotnie. Po starcie: „Ania · ma oddać · od 03.11 (0 dni) 240,00 zł”, „Łukasz Żółć · zaliczka – czeka na
  wydatki 300,00 zł”, „Domownicy mają oddać razem 240,00 zł”, „Depozyt domowników · ich zaliczki – nie do wydania na
  siebie 300,00 zł”; Ustawienia → Domownicy: „Rozliczenia od 03.11.2026”, „Na start rozliczeń” 240,00 / 300,00.
  Zrzuty: KR.11-krok1.png, KR.11-domownicy.png.

### KR.12 – NIEZGODNE (S)
- Stan: kr-salda (11:20), potwierdzone kr-salda-2 (11:34) – wynik identyczny.
- Zrobione: należność Ani 240, zaliczka Łukasza 300; krok 6 odczytany; „Uruchom budżet”; Stan okrętu.
- Widać w kroku 6: „Obecne środki: 9 682,17 zł”, „Osłony · bufor na pensje 9 682,17 zł”, kadłub 0,00 – bez wiersza
  energii ani depozytu. Po starcie: „Osłony 2 740,07 zł / 20 100,00 zł”, „Energia 6 642,10 zł”, „Depozyt domowników
  300,00 zł”, „Suma kont budżetu: 9 682,17 zł”.
- Oczekiwane: osłony na Mostku zgadzają się z krokiem 6 albo różnicę wyjaśnia ekran kreatora. Suma warstw = suma kont,
  zaliczka nie liczy się dwa razy, należność poza kontami – to jest dobrze; ale osłony spadają o 6 942,10 (pierwsza
  pensja 6 700 do energii + depozyt 300; 57,90 to dzisiejsze wydatki) i kreator o tym nie mówi.
- Zrzuty: KR.12-krok6.png, KR.12-mostek.png. Ta sama przyczyna co KR.23.

### KR.13 – NIEZGODNE (S)
- Stan: kr-nawigacja (11:30), potwierdzone kr-nawigacja-2.
- Droga z punktu („Wróć do kreatora”, kr-pelny) – dobrze: „W budżecie: 908 operacji, pełne miesiące od 2025-09 (do
  średnich: 12 mies.).”, salda z kroku 1 zostały, kopia `backups/pre-import/2026-11-03_111541.zip`.
- Zrobione: w trakcie kreatora krok 2 → „Importuj plik z mBanku”; na ekranie Import widać jednocześnie „Wróć do
  kreatora” i baner „Budżet jeszcze nie wystartował: …” z przyciskiem „Kreator startu”; klik w baner.
- Widać: kreator od kroku „1. Konta i salda”, mBank „” i Portfel „” (były 10 000,00 i 0,00), pensja „7 000,00”
  (propozycja zamiast wpisanych 5 000,00) – bez ostrzeżenia.
- Oczekiwane: powrót nie zaczyna kreatora od nowa (punkt wprost: „baner „Kreator startu” widoczny w Imporcie kasuje
  odpowiedzi”).
- Zrzuty: KR.13-baner-import.png, KR.13-po-banerze.png, KR.13-powrot.png. Ta sama przyczyna co KR.31.

### KR.14 – UWAGA
- Bez importu (kr-komputer): krok 2 „Brak operacji.” i „Bez historii kreator nie zaproponuje pensji ani kopert –
  wpiszesz je sam; możesz to pominąć.”; krok 3 „Brak pełnego miesiąca historii – wpisz kwotę.”, pole „Średnie koszty
  miesięczne”; przy 3 200,00 „Cel kadłuba: 19 200,00 zł (średnie koszty 3 200,00 zł × 6).”, cel osłon 12 000,00; krok 4
  „Brak propozycji. Stałe opłaty dodasz w Ładowni.”; budżet startuje; Przychody „Średnie będą po pierwszym pełnym
  miesiącu historii.”
- Tekst: nagłówek kopert w kroku 4 brzmi „Koperty pierwszego miesiąca – średnie z 0 pełnych mies., do 10 zł” (przy braku
  historii). Energia dziś po starcie 0,00 zł (zero kopert – zob. Spostrzeżenia). Zrzuty: KR.14-krok3.png,
  KR.14-krok4.png.

### KR.15 – LICZBY → AU-9
- „Średnie koszty netto z 6 pełnych mies.: 6 697,46 zł → propozycja 6 700,00 zł.”; pole 6 700,00, da się zmienić;
  zaokrąglenie w górę do 100 zł (też 3 393,78 → 3 400 w kr-miesiac). Średnia X do wyroczni (odczyty KR.15) – uwaga:
  plik persony kończy się 26.10, a październik liczy się jako pełny miesiąc. Zrzut: KR.15-krok3.png.

### KR.16 – NIEZGODNE (S)
- Stan: kr-miesiac (11:24), potwierdzone kr-miesiac-2 (11:35) – wynik identyczny.
- Notka przed wyborem OC: „W tym miesiącu wydano już 1 624,40 zł: pierwsza pensja na resztę miesiąca to 1 775,60 zł
  (pełna od 1. następnego miesiąca).”; po zaznaczeniu OC: „… 384,40 zł: … 3 015,60 zł …” – X dobrze (CityFit 129 +
  Biedronka 85,40 + Orlen 210 − zwrot 40; płatność PZU 1 240 wyłączona). Plan miesiąca: „Wypłacono: 3 015,60 zł –
  pierwszy miesiąc budżetu: bez tego, co wydano przed startem” – zgodnie z Y.
- Widać po starcie: „Energia · pensja miesiąca do wydania 1 735,60 zł” (Mostek) i „Energia miesiąca (pensja do wydania)
  1 735,60 zł” (Plan miesiąca); „Odkładki – opłaty okresowe 1 280,00 zł”, z czego 1 240 to zbiornik OC PZU: Ładownia
  „PZU SA … zapłacone 02.11” i jednocześnie „Odkładki: PZU SA termin listopad 2026 (w tym miesiącu) 1 240,00 zł /
  1 240,00 zł”; na Mostku „Asteroida: PZU SA dziś – 1 240,00 zł, w zbiorniku 1 240,00 zł.”
- Oczekiwane: energia miesiąca po starcie = Y (3 015,60). Pierwsza pensja odkłada ponownie całe OC zapłacone 02.11 przed
  startem (do terminu, który już minął) – czy to podwójne liczenie, rozstrzyga wyrocznia (AU-9); waga może wzrosnąć.
- Zrzuty: KR.16-krok3-przed.png, KR.16-krok3-po.png, KR.16-mostek.png, KR.21-plan.png, KR.19-ladownia.png.

### KR.17 – LICZBY → AU-9
- Etykiety „Osłony (bufor na pensje) – cel w pensjach”, „Kadłub (fundusz awaryjny) – cel w miesiącach”; 4 / 9 →
  „Cel osłon: 26 800,00 zł.”, „Cel kadłuba: 59 820,75 zł (średnie koszty 6 646,75 zł × 9).” – od razu. „2,5” i „0” w obu
  polach odrzucone (czerwona ramka, po Enter wraca 4 / 9). Minimum 5 przy celu 4 odrzucone, podpowiedź „Najwyżej cel
  osłon (4 pensji).” Średnie koszty kadłuba (12 mies.) do wyroczni. Zrzut: KR.17-minimum.png.

### KR.18 – ZGODNE
- `kr-krotka.csv`: „W budżecie: 137 operacji, pełne miesiące od 2026-09 (do średnich: 2 mies.).”; pole „Średnie koszty
  miesięczne” z podpowiedzią „Historia ma mniej niż 3 pełne miesiące: przyjęta kwota posłuży do celu kadłuba i zasięgu,
  dopóki historia nie urośnie.”; 3 500,00 → „Cel kadłuba: 21 000,00 zł”; Mostek „średnie koszty 3 500,00 zł”, zasięg
  18,6 mies. (= (44 202,56 + 21 000) / 3 500). Zrzuty: KR.18-krok3.png, KR.18-mostek.png.

### KR.19 – NIEZGODNE (S)
- Stan: kr-pelny i kr-salda (historia persony), kr-miesiac i kr-miesiac-2 (syntetyczna).
- Dobrze: na syntetycznej historii propozycje z cyklem – „co miesiąc”, „co rok” (PZU 1 240, WARTA 480), „co kwartał”
  (garaż 300), „TAURON … co miesiąc · zmienna 231,00 zł” (75. percentyl roku); nic nie zaznaczone samo; po starcie
  w Ładowni tylko 4 zaznaczone kontenery, płatność PZU z 02.11 połączona („Połączono z kontenerem: 1 płatność od
  01.11.2026.”); persona: podatek od nieruchomości „w miesiącach: mar, maj, wrz, lis” – dobrze.
- Widać źle (historia persony, dwa przebiegi): prąd persony (TAURON co 2 miesiące, 7 płatności 150–230 zł) – brak
  propozycji; SPOTIFY (subskrypcja płacona co miesiąc, ostatnio 08.07) – „w miesiącach: sty, lut, mar, kwi, maj, cze,
  lip, lis, gru 23,99 zł”.
- Oczekiwane: „prąd o zmiennej kwocie” daje propozycję z „· zmienna” (tekst Ładowni sam obiecuje „co miesiąc, co 2, 3
  albo 6 miesięcy … rachunek o zmiennej kwocie”); anulowana subskrypcja nie jest proponowana jako opłata „w miesiącach”.
- Zrzuty: KR.19-krok4.png (persona), KR.19-krok4-przed.png (syntetyczna), KR.19-ladownia.png.

### KR.20 – ZGODNE
- „Koperty pierwszego miesiąca – średnie z 3 pełnych mies., do 10 zł”; propozycje = średnia 3 miesięcy do 10 zł bez
  płatności kontenerów (np. Jedzenie 748,49 → 750, Auto 519,75 → 520 i 420 przy zaznaczonym garażu, Dom 1 690 → 240 po
  wyborze czynszu); Jedzenie 1 500,00 i wyczyszczone Zwierzęta zostają po zaznaczeniu i odznaczeniu garażu (B75); „Bez
  kategorii średnio 56,73 zł miesięcznie – liczy się do energii dnia.”; plan miesiąca po starcie ma dokładnie te koperty
  (bez Zwierząt). Zrzut: KR.21-krok4.png.

### KR.21 – LICZBY → AU-9
- Wiersze „Pensja”, „Ładownia (stałe koszty) + odkładki + koperty”, „Niezaplanowane (łupy)” / czerwone „Plan
  przekracza pensję o …” (przy 3 000: „… o 2 419,00 zł”); „Odkładki w tym miesiącu: 1 400,00 zł – zbiorniki nadrabiają
  do terminów opłat; potem ok. 143,33 zł miesięcznie.” (po „do planu” WARTA 1 280,00); „Podstawowy przydział dzienny:
  52,33 zł.” Plan miesiąca po starcie: Ładownia 1 499, odkładki 1 280, podstawowy 52,33, rozdzielone 5 299, „Plan
  przekracza pensję o 1 899,00 zł” – te same kwoty; Mostek „podstawowy 52,33 zł”. Persona (kr-pelny): 6 168 / 532 /
  87,66 – te same w kreatorze, Planie i na Mostku. Kwota odkładki PZU – zob. KR.16. Zrzuty: KR.21-krok4.png,
  KR.21-przekracza.png, KR.21-plan.png.

### KR.22 – ZGODNE
- Notka „Folder ICT Trade Journal (opcjonalnie): … Bez ICTTJ – pomiń ten krok.”; „Użyj folderu ICTTJ z tego komputera”
  → ścieżka i „CZYTANY”, cele „Wkład własny – mieszkanie · ICTTJ · 40 000,00 zł”, „Nowe stanowisko tradingowe · ICTTJ ·
  3 000,00 zł”, własny „Rower górski 3 500,00 zł” na końcu; „Wybierz folder…” obecny; kwota 0 – „Dodaj cel” nieaktywny;
  bez tekstu o „wersji 1.1”; folder ICTTJ bajt w bajt bez zmian. Pominięcie (kr-salda): „—”, „NIE WYBRANO”, „Dalej”
  przechodzi do kroku 6. Zrzuty: KR.22-przed.png, KR.22-po.png, KR.22-pominiety.png.

### KR.23 – NIEZGODNE (S)
- Stan: kr-podzial (11:22), potwierdzone kr-podzial-2.
- Dobrze w kroku 6: „Obecne środki: 40 000,00 zł …” i opis kolejności; propozycja osłony 12 000, kadłub 21 900, A 5 000,
  B 1 100, wolne 0; kadłub 15 000 → osłony 18 900; „propozycja” i „cele – propozycja” przywracają; cel B 500 → osłony
  12 600. Kolejność osłony → kadłub → cele wg priorytetu.
- Widać po starcie (Uruchom z propozycją): „Osłony 8 000,00 zł / 12 000,00 zł”, „Energia 4 000,00 zł”, kadłub
  21 900,00, cele 6 100,00 (Mapa: A 5 000 „osiągnięty”, B 1 100).
- Oczekiwane: „po starcie Stan okrętu i Mapa gwiezdna mają kwoty z kroku 6” – osłony różnią się o pierwszą pensję
  (4 000), krok 6 tego nie pokazuje. Tak samo w kr-pelny (20 100 → 13 400) i kr-otwarcie (31 166,28 → 24 466,28).
- Zrzuty: KR.23-propozycja.png, KR.23-kadlub15000.png, KR.23-mostek.png, KR.23-mapa.png.

### KR.24 – ZGODNE
- Kadłub 39 000: osłony czerwone „−5 100,00 zł”, „Kadłub, cele i zbiorniki (45 100,00 zł) przekraczają obecne środki
  (40 000,00 zł) – zmniejsz je.”; „Uruchom budżet” nieaktywny, podpowiedź „Potrzebne: saldo każdego konta (krok 1),
  pensja (krok 3) i kadłub z celami w granicach środków (krok 6)” – numery zgodne z listą; po „propozycja” aktywny.
  Zrzuty: KR.24-kadlub39000.png, KR.24-krok7.png.

### KR.25 – LICZBY → AU-9
- „zbiornik: WARTA SA” → „do planu (360,00 zł)”, dymek „Tyle przypada za miesiące cyklu przed startem budżetu – po
  uzupełnieniu rata odkładki nie musi nadrabiać”; po kliknięciu osłony 86 569,94 → 86 209,94 (−360), odkładki w kroku 4
  1 400 → 1 280 (WARTA bez nadrabiania, 40 zł/mies.); po starcie `budget.initial.tanks` 360, Ładownia „WARTA SA … 400,00 zł
  / 480,00 zł” (360 + rata 40), Plan miesiąca 1 280 = kreator. Kreator proponuje też „do planu (1 136,63 zł)” przy PZU,
  którego opłata za ten cykl została zapłacona 02.11 (zob. KR.16). Zrzuty: KR.25-krok6-przed.png, KR.25-krok6-po.png.

### KR.26 – UWAGA
- Domyślnie: „Minimalne osłony (pensje)” 1, „Linia zanurzenia (% pensji)” 40, „Cisza nocna 23:00–05:00”, „Dziennik od
  kwoty” 200,00 z „0 albo puste – dziennik nie pyta.”, firewall włączony („Firewall: dopłaty do XTB tylko z „wolnego do
  decyzji””). Nazwa 41 znaków ucięta do 40; „Żółta Łódź Świętej Pamięci Admirała” na Mostku („okręt Żółta Łódź Świętej
  Pamięci Admirała”) bez zniekształceń; próg 0 i firewall wyłączony w `fi.json`, Ustawieniach (Warstwy i rozkazy)
  i Dowództwie; w Dowództwie „0,00” z podpowiedzią „… 0 albo puste – dziennik nie pyta.” (nie „od 0,00 zł”).
- Tekst: minimum osłon pokazane z kropką dziesiętną – „1.0” (kreator krok 7, Ustawienia → Warstwy i rozkazy,
  Dowództwo); reszta pól używa przecinka („200,00”). Zrzuty: KR.26-krok7.png, KR.26-dowodztwo.png.

### KR.27 – ZGODNE
- Pole „Szybki wpis – skrót” pokazuje „Ctrl+Shift+Q” (skrót tego komputera z `config.json`), „Uruchamiaj z Windows
  (ukryty w zasobniku)” włączone; po zmianie na Ctrl+Alt+K i starcie: `config.json` `quickShortcut: "Control+Alt+K"`,
  `closeToTray: false` bez zmian, `launchAtLogin: true` (zapis laboratorium `openAtLogin: true`); Mostek „Szybki wpis ·
  Ctrl+Alt+K”; Ustawienia → Zasobnik i start: „Zamykaj do zasobnika” wyłączone, „Uruchamiaj z Windows” włączone;
  w `fi.json` nic o skrócie ani autostarcie. Zrzuty: KR.27-krok7-przed.png, KR.27-ustawienia-system.png.

### KR.28 – ZGODNE
- Toast „Okręt wypłynął: budżet działa od dziś.”; Mostek ze Stanem okrętu; nowe pliki: 3 × `balances/2026/2026-11-03_…`
  (saldo otwarcia z datą dziś), `months/2026-11.json` (pensja 6 700, koperty), 5 kontenerów, zmieniony `fi.json`
  (`budget.start` 2026-11-03); 922 pliki JSON – wcięcie 2 i końcowe `\n`; baner znika; paleta Ctrl+K → „Kreator startu
  budżetu”: „Budżet działa od 03.11.2026. Kreator startu jest potrzebny tylko raz.” Dźwięk – poza laboratorium (Ty).
  Zapis częściowy po błędzie – zob. KR.29 (a). Zrzuty: KR.28-krok6.png, KR.28-mostek.png, KR.28-paleta.png.

### KR.29 – NIEZGODNE (S)
- Warunki przycisku (kr-komputer) – dobrze: bez sald, z pustym mBankiem, z pensją pustą i 0 – nieaktywny z podpowiedzią
  „Potrzebne: …”; z kompletem aktywny (Gotówka pusta wystarcza).
- Wariant (b) – tryb tylko do odczytu aplikacji (`fi.json` w formacie v2): komunikat „Folder danych ma format v2 … dane
  są tylko do odczytu”; kreator (z palety) – „Dodaj domownika”, „Dodaj cel”, „Wybierz folder…” i „Uruchom budżet”
  nieaktywne, nic nie zapisane. Podpowiedź przycisku podaje jednak zły powód („Potrzebne: saldo każdego konta (krok 1),
  pensja (krok 3) …”, choć wszystko było wpisane).
- Wariant (a) z punktu – atrybut „tylko do odczytu” (kr-ro-atrybut 11:33, potwierdzone kr-ro-atrybut-2):
  - Widać: brak jakiegokolwiek komunikatu, baner kreatora, wszystkie przyciski aktywne. Po „Uruchom budżet”: toast
    „Budżet uruchomiony – część zmian nie zapisała się jeszcze w folderze (EPERM: operation not permitted, rename
    '…\.fi.json.tmp-…' -> '…\fi.json') – aplikacja ponawia zapis automatycznie.”, u góry „błąd zapisu – ponów”; okno
    pokazuje działający budżet (osłony 1 000, energia 4 000).
  - W folderze: dopisane 2 × `balances/…` i `months/2026-11.json`, a `fi.json` bez zmian (`budget.start` null) –
    salda otwarcia i plan bez startu budżetu. Przy zamknięciu aplikacja wstrzymuje się na pytaniu o niezapisane zmiany.
    Gdy w pierwszym przebiegu atrybut zdjęto, a aplikacja jeszcze działała, ponowiony zapis dopisał `budget.start`
    (folder spójny) – naprawa działa, ale tylko jeśli aplikacja nie zostanie zamknięta z odrzuceniem zmian.
  - Oczekiwane: w folderze tylko do odczytu przycisk nieaktywny, dodawanie domowników i celów wyłączone, nic nie zapisane.
- Zrzuty: KR.29-atrybut-mostek.png, KR.29-atrybut-krok7.png, KR.29-atrybut-po.png, KR.29-nowszy-krok7.png.

### KR.30 – UWAGA
- Lista 7 kroków („Konta i salda” … „Okręt i rozkazy”), bieżący wyróżniony, ✓ przy minionych; „Wstecz” nieaktywny na
  kroku 1; na kroku 7 zamiast „Dalej” – „Uruchom budżet”; klik w krok 6 zachowuje odpowiedzi (10 000,00, cel Wakacje).
  „Przerwij kreator” → Mostek bez startu (`budget.start` null), bez sald otwarcia i planu; folder bez zmian.
- Uwaga (punkt sam ocenia to jako UWAGA): „Przerwij kreator” działa bez potwierdzenia, także po siedmiu krokach; domownik
  „Kasia” i cel „Wakacje” dodane w kreatorze zostają (Ustawienia → Domownicy, Mapa gwiezdna), ekran o tym nie mówi.
  Zrzuty: KR.30-krok7.png, KR.30-skok6.png, KR.30-przerwij.png.

### KR.31 – NIEZGODNE (S)
- Stan: kr-nawigacja (11:30), potwierdzone kr-nawigacja-2.
- Zrobione: kroki 1–3 (mBank 10 000, Portfel 0, pensja 5 000) → Ctrl+2 → baner „Kreator startu”; drugi raz → paleta
  „Kreator startu budżetu”; na koniec zamknięcie aplikacji w trakcie kreatora i ponowny start.
- Widać: po banerze i po palecie kreator od „1. Konta i salda”, mBank „”, Portfel „”, pensja „7 000,00” (propozycja) –
  wpisane odpowiedzi znikają bez ostrzeżenia. Po ponownym starcie kreator od nowa, bez żadnej informacji. Folder bez
  pół-budżetu (0 sald, 0 planów, `budget.start` null) – to dobrze.
- Oczekiwane: powrót banerem albo paletą otwiera kreator z wpisanymi odpowiedziami.
- Zrzuty: KR.31-baner.png, KR.31-paleta.png, KR.31-restart.png.

### KR.32 – ZGODNE
- Dowództwo: „gra od 04.11.2026”, „Kadet · od startu gry (04.11.2026)”, seria 0, rekord 0, „Dziennik zapełni się, gdy
  pierwsze dni zostaną zamrożone …”; brak `game/` – żaden dzień historii nie oceniony. Zrzut: KR.32-dowodztwo.png.

### KR.33 – poza laboratorium (Kto: Ty)

## Znaleziska

- KR.12 (S) – po „Uruchom budżet” osłony mniejsze niż w kroku 6 o pierwszą pensję i depozyt domowników; kreator tego
  nie pokazuje.
- KR.13 (S) – baner „Kreator startu” na ekranie Import w trakcie kreatora zaczyna kreator od nowa i kasuje salda
  i pensję.
- KR.16 (S) – energia miesiąca po starcie ≠ pierwszej pensji z kreatora: zbiornik OC zapłaconego przed startem
  (02.11) odkłada ponownie 1 240 zł z pierwszej pensji, a Mostek ogłasza „Asteroida: PZU SA dziś”; do wyroczni, czy
  to zła kwota (wtedy K).
- KR.19 (S) – prąd co 2 miesiące o zmiennej kwocie nie daje propozycji ładowni; anulowana subskrypcja (Spotify) proponowana
  jako opłata „w miesiącach: …”.
- KR.23 (S) – kwoty po starcie różnią się od kroku 6 (osłony − pierwsza pensja); ta sama przyczyna co KR.12.
- KR.29 (S) – folder z atrybutem „tylko do odczytu” nie jest rozpoznany; „Uruchom budżet” zapisuje salda otwarcia
  i plan bez startu w `fi.json` (zapis częściowy); w trybie tylko do odczytu aplikacji podpowiedź przycisku podaje zły
  powód.
- KR.31 (S) – powrót do kreatora banerem albo paletą kasuje wpisane odpowiedzi bez ostrzeżenia; po zamknięciu aplikacji
  kreator zaczyna od nowa bez informacji. Ta sama przyczyna co KR.13.
- KR.3 (N) – „Nowe dane gdzie indziej” na folderze z obcymi plikami tworzy podfolder FinancialIntel bez komunikatu
  i przycisku (bezpiecznie, ale bez słowa).

## Spostrzeżenia

1. **Krok 6 nie pokazuje, co start zabierze z osłon** (KR.12, KR.23): pierwsza pensja idzie z osłon do energii
   1. dnia, zaliczki domowników do depozytu – w kroku 6 brakuje wierszy „Energia – pensja tego miesiąca” i „Depozyt
   domowników”, przez co osłony „po starcie” są zawsze niższe niż w kreatorze.
2. **Odpowiedzi kreatora żyją tylko w pamięci okna** (KR.13, KR.31): baner i paleta wołają start kreatora od zera,
   zamknięcie aplikacji je gubi. Gdy kreator trwa, baner i paleta mogłyby mówić „Wróć do kreatora” (jak przycisk
   w Imporcie), a odpowiedzi być szkicem (konwencja „opuszczenie ekranu nigdy nie gubi zmian”).
3. **Kreator bez historii zostawia energię dziś 0,00 zł** (KR.14): bez propozycji kopert i bez ostrzeżenia w kroku 4
   budżet startuje bez kopert codziennych – każdy wydatek od pierwszego dnia przekracza przydział. Brakuje podpowiedzi
   „wpisz koperty codzienne” albo prostego podziału pensji; nagłówek „średnie z 0 pełnych mies.” wygląda na błąd.
4. **Propozycje ładowni do dopracowania** (KR.19): sklepy (ZOOPLUS „co miesiąc 161,18”, KWIACIARNIA „co miesiąc ·
   zmienna”) trafiają na listę opłat; anulowana subskrypcja wraca jako harmonogram; prąd co 2 miesiące – brak; dzień
   terminu brany z ostatniej płatności (czynsz „termin 12.11”, bo 10.10 była sobota); nazwy kontenerów to surowe nazwy
   z banku („WSPÓLNOTA MIESZKANIOWA TESTOWA 1”, „P4 SP. Z O.O.”), czynsz typu „abonament”.
5. **Pierwszy miesiąc wygląda na przekroczony od razu** (KR.21, KR.16): propozycje kopert (średnia 3 miesięcy) potrafią
   być wyższe niż propozycja pensji (średnia 6 miesięcy) – czerwone „Plan przekracza pensję o 30,00 zł” bez żadnej
   zmiany użytkownika; opłata okresowa zapłacona w miesiącu startu jeszcze raz obciąża pierwszą pensję („Plan przekracza
   pensję o 1 899,00 zł”), a „do planu (1 136,63 zł)” jest proponowane dla opłaty już zapłaconej.
6. **Przerwanie i ślady** (KR.30): „Przerwij kreator” bez potwierdzenia; domownicy i cele z kreatora zapisują się od razu
   (członkowie w `fi.json` jeszcze przed „Uruchom budżet”) i zostają po przerwaniu – warto to powiedzieć na ekranie.
7. **Tylko do odczytu** (KR.29): aplikacja rozpoznaje tylko format nowszej wersji i niedostępny folder; plik z atrybutem
   R (albo brak praw) wychodzi dopiero przy zapisie – wtedy start budżetu zostawia salda i plan bez `budget.start`.
8. **Teksty**: „1.0” z kropką w minimum osłon (3 ekrany); „Najwyżej cel osłon (3 pensji)” / „(4 pensji)” – dla 2–4 „pensje”;
   „Na koncie 1 operacja … saldo „teraz” ich nie obejmuje, silnik odejmie je w ich dniu” – liczba pojedyncza; toast
   importu („Zaimportowano: 908 …”) zostaje w prawym dolnym rogu tuż nad „Uruchom budżet”.
9. **Kolejność celów ICTTJ** (KR.22): cele prognozy dostają priorytet w kolejności listy scenariusza, nie terminów –
   „Wkład własny” (miesiąc 30) przed „Nowe stanowisko tradingowe” (miesiąc 16, termin 12.2026), które startuje z 0 zł
   i „kursem przechwycenia 3 000,00 zł/mies.”.
10. **Ergonomia importu w kreatorze**: 14 miesięcy persony wymagało „Przyjmij pewne (25)” i ok. 50 decyzji grupowych;
    przed startem, bez saldo otwarcia, Mostek pokazuje „Na kontach budżetu 9 670,86 zł” (krzywa majątku liczona
    z samych operacji) – liczba bez znaczenia dla użytkownika (obszar MO).
11. **Pliki persony**: `rok-historia.csv` kończy się 26.10, a kreator traktuje październik jako pełny miesiąc średnich
    (pensja, koperty) – wyrocznia (AU-9) powinna to uwzględnić; użytkownik z plikiem do dziś tego problemu nie ma.

## Problemy laboratorium

- KR.27 wymaga skrótu w `config.json`: w przebiegu `kr-komputer` aplikacja laboratorium miała przez ok. minutę
  zarejestrowane globalne skróty Ctrl+Shift+Q, potem Ctrl+Alt+K (pozostałe przebiegi – bez skrótu; w kreatorze
  skrót czyszczony Backspace). Rejestr i autostart nietknięte (wpisy sprawdzane przez `start()`).
- Po kreatorze z „Uruchamiaj z Windows” `config.json` przebiegu ma `launchAtLogin: true` – ponowny start tego samego
  `userData` zapisałby prawdziwy wpis „Financial Intel (portable)” przed strażnikiem `lab.ts`. Skrypty KR wyłączają to
  w `config.json` po każdym przebiegu (`disarmAutostart` w `kr-pomoc.ts`); warto dodać to do `lab.ts`.
- `kr-ro-atrybut`, `kr-ro-atrybut-2`: `app.close()` czekało 40 s na pytanie aplikacji o niezapisane zmiany (okno
  dialogowe bez odpowiedzi), `guardClose` zgłosił błąd zamknięcia, a w `-2` proces główny aplikacji przeżył
  `kill('SIGKILL')` i został sierotą z ikoną w zasobniku – zatrzymany ręcznie (`Stop-Process`, tylko drzewo tego
  przebiegu). Zachowanie aplikacji poprawne (pyta przed utratą zmian); `lab.ts` powinien przy zabiciu kończyć całe drzewo
  procesów (np. `taskkill /T /F`). Wpisy autostartu w rejestrze po przebiegach: tylko Twój `app.financialintel.desktop`.
- Wariant KR.1 „bez OneDrive” i dźwięk (KR.28) – niedostępne w laboratorium; prawdziwego OneDrive i `%APPDATA%` nie da
  się porównać plik w plik (zapisuje tam Twoja aplikacja) – sprawdzone po ścieżkach `config.json` i `userData`.
