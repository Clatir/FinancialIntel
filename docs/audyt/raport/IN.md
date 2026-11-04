# Raport audytu – IN (interfejs)

- Data: 03.11.2026, 12:00–13:15 (zegar prawdziwy, Warszawa); wersja 1.15.4 z GitHub Releases, uruchamiana jako portable
  (laboratorium `C:\FI-audyt`, `start()` z `tests/audyt/lab.ts`).
- Stan danych: kopie persony `rok` (kotwica 2026-11-03) w przebiegach `in-*`; `start` (IN.19 / IN.26); nowy budżet z propozycji ekranu
  wyboru folderu (IN.16, przed kreatorem); stan „brzegi” zrobiony na kopii `rok` (IN.17): nazwa okrętu, konta i kategorii po 40 znaków
  „Żółć Gęślą Jaźń…”, kontrahent 120 znaków, wydatki 123 456 789 groszy (1 234 567,89 zł) i 1 000 000,00 zł, wpływ 2 500 000,00 zł;
  tryb tylko do odczytu – `fi.json` z `schemaVersion: 2`.
- Skrypty: `tests/audyt/in-*.spec.ts` (pomocnik `us-pomoc.ts`, jeden import `op-pomoc.ts` do dopisania rekordów w IN.17); wyniki
  `C:\FI-audyt\in-*.out`; zrzuty `C:\FI-audyt\zrzuty\IN.*.png`; zebrane teksty wszystkich ekranów `przebiegi\in-teksty\teksty.txt`.

**Podsumowanie (28 punktów):** ZGODNE 19 · UWAGA 1 · NIEZGODNE 6 (S 2, N 4) · poza laboratorium 2 (IN.12 – Ty, IN.25 – Ty, DO OCENY).

## Punkty

### IN.1 – ZGODNE
- Menu: Mostek, Operacje, Import, Plan miesiąca, Ładownia, Mapa gwiezdna, Radar, Dowództwo, Wywiad, Raporty, potem Meldunki, Otwórz ICTTJ,
  Synchronizacja, Ustawienia, „? skróty”; każdy klik otwiera właściwy ekran, aktywny w akcencie; licznik Meldunków „8” = „8 meldunków”
  = 8 pozycji na ekranie; Synchronizacja bez licznika (0 problemów); nic przygaszonego z dopiskiem etapu. Zrzut IN.1-menu.png.

### IN.2 – ZGODNE
- Ctrl+1…0, Ctrl+, , Ctrl+Shift+Y, Ctrl+Shift+M: 52 przejścia z Mostku, Operacji, Planu i Ustawień – wszystkie zgodne z menu i ściągawką (Ctrl+Shift+Y rozpoznane po tekście „Synchronizacja i problemy”, bo ekran Synchronizacji nie ma identyfikatora strony w DOM);
  z fokusem w polu wyszukiwania Operacji skrót działa, a cyfra nie trafia do pola. Esc (bez fokusu w polu) i przycisk myszy „wstecz”
  (zdarzenie `mouseup` przycisku 3) w Ustawieniach, Synchronizacji i Meldunkach wracają na poprzedni ekran (Plan miesiąca). Esc w polu
  nie wraca (pole obsługuje Esc samo).

### IN.3 – ZGODNE
- Ctrl+N z trzynastu ekranów (Mostek … Raporty, Ustawienia, Synchronizacja, Meldunki) – zawsze Operacje z nowym szkicem z datą 03.11.2026;
  nad otwartą paletą nic się nie dzieje. Operacje na październiku z szukaniem „Biedronka” → Ctrl+N + dopisanie wydatku: widok przechodzi
  na bieżący miesiąc (listopad), pole szukania wyczyszczone, nowa operacja widoczna. Zapisany filtr („mój filtr”) – nie tworzony.
  Zrzut IN.3-po-dopisaniu.png.

### IN.4 – NIEZGODNE (S)
- Stan: rok, `fi.json` `schemaVersion: 2` (tylko do odczytu); przebiegi in-ro (12:35) i in-ro3 (12:55, powtórzenie).
- Zrobione: baner „Folder danych ma format v2…”, Ctrl+S; paleta „Zapisz teraz”.
- Widać: toast „Zapisano. (Zapis jest automatyczny – Ctrl+S nie jest potrzebne.)”, choć nic nie zostało (i nie mogło) zapisane;
  wskaźnik w pasku pokazuje „tylko odczyt”; Ctrl+N w tym trybie – „Folder jest tylko do odczytu – zmiany nie są zapisywane.”.
- Oczekiwane: „tylko do odczytu – bez „Zapisano.”, z informacją”.
- W trybie zapisu ZGODNE: Ctrl+S i paleta „Zapisz teraz” – ten sam toast, wskaźnik „zapisano 12:35:12”. Wariant „czekająca decyzja”
  – NIE WYKONANO (stan z DA.44).
- Zrzut: IN.4-ro.png

### IN.5 – ZGODNE
- Ctrl+$ (Ctrl+Shift+4): „Kwoty ukryte (Ctrl+$ pokazuje).”; na 13 ekranach (w tym Synchronizacja, Ustawienia/Konta, okno Historia salda otwarcia)
  żadna kwota poza stałym przykładem w opisie Ładowni; paleta po „1240” – „••• zł”; pole kwoty „•••” poza edycją, w edycji „12,00”;
  szybki wpis „••• zł”; panel odłączony „•••”; powiadomienia z aplikacją uruchomioną z ukrytymi kwotami (`hideAmounts`): „Energia dziś:
  ••• zł…”, „Marek: do oddania ••• zł…”; po restarcie `hideOnStart` – ukryte (US.24); drugi Ctrl+$ – „Kwoty widoczne.”.
- Nie sprawdzone: konflikt i podgląd odzyskania z kwotą (stany DA), tooltip zasobnika (maszyna), eksport CSV z prawdziwymi kwotami.

### IN.6 – ZGODNE
- Ctrl++ (każdy z wariantów: Ctrl++, Ctrl+Shift+=, Ctrl+=, Ctrl+Num+): jedno naciśnięcie = +10 %; od 100 %: 110, 120, 130, 140, 150, 150, 150
  (granica 150); Ctrl+− od 150: 140 … 90, 90, 90 (granica 90); Ctrl+Shift+0 – 100 %; Ctrl+0 – Raporty (nie reset); okno główne i szybki wpis
  zawsze razem; Ctrl++ wciśnięte w szybkim wpisie zmienia oba okna; suwak w Ustawieniach pokazuje „110%”.

### IN.7 – ZGODNE
- Ctrl+K i przycisk „Komendy”: ekrany, „Nowa operacja”, „Kreator startu budżetu”, „Szybki wpis (okno nad wszystkimi)”, „Ukryj / pokaż kwoty”,
  „Otwórz ICT Trade Journal”, „Dokowanie: następna dostawa z XTB”, 12 zakładek „Ustawienia: …”, „Zapisz teraz”, „Kopia zapasowa teraz”, „Pokaż
  folder danych w Eksploratorze”, „Otwórz folder logów”, „Sprawdź aktualizacje”, „Skróty klawiszowe”. „ladownia” → „Ładownia – stałe koszty”;
  „kopia”, „zapisz”, „ukryj” znajdują właściwe; „xyz” – „Nic nie znaleziono.”; strzałki + Enter wykonują; „Kopia zapasowa teraz” – „Utworzono
  kopię: …\backups\manual\…zip”; „Otwórz folder logów” – zapis `path:…\logs`; Esc zamyka, fokus na `body` (nie wraca do przycisku).
  Zrzut IN.7-paleta.png. (UWAGA do fokusu w IN.28.)

### IN.8 – ZGODNE
- „1240” – operacja PZU 25.11.2025 i kontener „OC samochodu · 1 240,00 zł” (sama kwota nie szuka ustawień); „12,00” – operacja Mokka; „mokka”
  – 30 najnowszych operacji; „netflix”, „czynsz” – operacje + kontener („Netflix 43,00 zł”, „Czynsz 1 450,00 zł”); „wakacje” – operacja + cel
  „Wakacje 2027 · 8 000,00 zł”; „pozyczka” (bez ogonków) – operacje + „Pożyczka dla Tomka”, „Pożyczka od rodziców”; „marek” – operacja + domownik
  „Marek”; „cisza nocna” → „Cisza nocna · Warstwy i rozkazy” i Enter otwiera zakładkę Warstwy i rozkazy; Enter na operacji otwiera Operacje na jej
  miesiącu z operacją rozwiniętą (zrzuty IN.8-*.png). Wyróżnienie ok. 2 s od zaznaczenia wiersza nie do odróżnienia na zrzutach (0,5 s i 3 s po Enter).

### IN.9 – ZGODNE
- Mostek (8 paneli): „Zwiń panel” / „Rozwiń” / dwuklik tytułu; „Powiększ na całe okno” + Esc; „Ukryj panel…” → „Układ · 1 ukr.”, menu „Układ” (lista paneli,
  „Pokaż wszystkie”) przywraca; wysokość: 2× ↓ +40 px, Shift+↓ +100, Home – naturalna (518 px), ↑ −20, przeciągnięcie +60 px; po ponownym uruchomieniu zostają
  zwinięty i ukryty panel (ten komputer). Zrzuty IN.9-powiekszony.png, IN.9-uklad.png.

### IN.10 – ZGODNE
- Zapis „Duży wykres” (na domyślnym układzie: „Układ tej strony jest domyślny – zmień coś (ukryj, zwiń, przeciągnij), zanim go zapiszesz.”); „Zapisano układ „Duży
  wykres”.”; „Użyj tego układu” – „Układ „Duży wykres”.” z „Cofnij”; „Nazwa” → „Mały wykres”; „Nadpisz” – „Nadpisano układ „Mały wykres” bieżącym.”; „Domyślny układ
  tej strony” – „Przywrócono domyślny układ strony „Mostek”.” (polska nazwa strony), „… wszystkich stron” – „Przywrócono domyślny układ wszystkich stron.”; „Usuń układ” –
  „Usunięto układ „Mały wykres”.” (wszystkie z „Cofnij”); układ jest w `fi.json`, LAPTOP go widzi; tylko do odczytu – zamiast pola: „Folder tylko do odczytu – nowych
  układów nie zapiszesz.”; kreator – brak menu „Układ”. Menu na Operacjach: „PANELE – OPERACJE · Szczegóły”. Zrzuty IN.10-menu.png, IN.10-ro.png, IN.10-kreator.png.

### IN.11 – ZGODNE
- Trzy panele Mostku odłączone (okna „Odprawa – 3 listopada – Financial Intel” …); w głównym „Otwarte w osobnym oknie.” z „Pokaż okno” / „Przywróć tutaj”; wydatek 10 zł
  dopisany na Operacjach – okno odłączone zmieniło energię 77,28 → 67,28 zł (B27 nie wraca); F11 przełącza („Okno” ↔ „Pełny ekran”); Ctrl+$ – „•••” w odłączonym;
  „Przywróć tutaj” i „Przywróć do aplikacji” w odłączonym zmniejszają liczbę okien i notatek; zamknięcie okna głównego (zasobnik wyłączony) kończy aplikację z oknami
  odłączonymi. Zrzuty IN.11-odlaczony.png, IN.11-glowne.png.

### IN.12 – poza laboratorium
- Kto: Ty (drugi monitor).

### IN.13 – ZGODNE
- F1, „? skróty” i przycisk w menu: „Skróty klawiszowe i słowniczek” – skróty ogólne (Ctrl K, Ctrl S, Ctrl N, Ctrl $, Ctrl + / Ctrl −, Ctrl Shift 0, Esc / mysz „wstecz”,
  F1), ekrany (Ctrl 1…0, Ctrl Shift Y, Ctrl Shift M, Ctrl ,), panele i osobne okna (F11 …); szybki wpis: „szybki wpis – w całym systemie (zmiana: Ustawienia →
  Powiadomienia i dźwięki)” + „Ctrl Alt B” albo „brak skrótu” (US.20); „Słowniczek okrętu” z prawdziwymi nazwami („Osłony – Bufor na pensje…”, „Kadłub – Fundusz
  awaryjny…”) i te same opisy w „?” paneli („Dostawa – …”, „Koperty – …”); Esc zamyka, fokus wraca na „? skróty”. Wszystkie skróty z listy sprawdzone w IN.2–IN.6.
  Zrzut IN.13-sciagawka.png.

### IN.14 – ZGODNE
- Usuwanie operacji: pierwszy klik w kosz zmienia go w „Usuń na pewno” (+ „Anuluj”); Esc i klik obok nic nie usuwają (operacja i edytor zostają); drugi klik jest
  świadomy (fokus po pierwszym kliku ginie na `body`, Enter nic nie robi). „Zmień scenariusz”: Esc zamyka pytanie bez zmiany. Historia (okno): Esc zamyka, fokus na przycisku
  „historia”. „Okno z okna” (Historia z okna „Zmiany z drugiego komputera”) i „Do Kosza na pewno” – NIE WYKONANO (stany z DA / nie potwierdzam Kosza). Zrzut IN.14-usun.png.

### IN.15 – ZGODNE
- Edytor operacji (kwota, data, godzina, kontrahent, notatka) i Plan miesiąca (pensja, trzy koperty): Esc przywraca wartość i nic nie zapisuje, Enter zapisuje.
  Ładownia i Mapa gwiezdna – pola kwot nie ćwiczone osobno. Uwaga: pola liczbowe Ustawień zachowują się inaczej (Esc nie cofa) – patrz US.32.

### IN.16 – ZGODNE
- Nowy budżet przed kreatorem: baner „Budżet jeszcze nie wystartował: kreator startu ustawi salda, pensję, warstwy okrętu i koperty.” z „Kreator startu”; każdy ekran
  mówi po polsku, czego brak i co zrobić: „Brak operacji – szybki wpis albo import z mBanku.”, „Ładownia jest pusta. Dodaj stałe opłaty…”, „Brak celów – dodaj własny
  albo wybierz scenariusz prognozy ICTTJ (Ustawienia → ICTTJ).”, „Nic na radarze w najbliższych 90 dniach.”, „Brak meldunków – nic nie czeka na decyzję.”, „Wszystkie pliki
  wczytane poprawnie.”, „Brak kopii.”/„Ostatnia kopia: dziś”; Dowództwo: „gra jeszcze nie wystartowała”; bez „NaN”, „undefined”, „Invalid Date” na żadnym z 12 ekranów.
  „0,00 zł” przy kontach w pasku Operacji z gwiazdką (bez salda otwarcia). Zrzuty IN.16-*.png.

### IN.17 – ZGODNE
- Nazwa okrętu 40 znaków, konto i kategoria „Żółć Gęślą Jaźń…”, kontrahent 120 znaków, kwoty 1 234 567,89, 1 000 000,00, 2 500 000,00 zł: menu ucina z „…”, lista
  Operacji, Mostek („Koperty”, „Ostatnie operacje”), paleta, szybki wpis (przyciski szybkich szablonów) – bez nachodzenia na kwoty i przyciski, polskie znaki poprawne,
  duże kwoty w kolumnach; skaner DOM nie znalazł tekstu uciętego bez wielokropka na 8 ekranach; powiadomienie ucina nazwę kontrahenta do 120 znaków („…ul. Świę 1 234 567,89 zł”).
  Zrzuty IN.17-*.png.

### IN.18 – ZGODNE
- Kwota „abc”, „12,345”, „−5”, „1e3” – „Nieprawidłowa kwota – zostaje poprzednia.”; data „31.02.2026”, „99.99”, „jutro” – „Nieprawidłowa data – zostaje poprzednia.”;
  godzina „25:00”, „12:99”, „abc” – „Nieprawidłowa godzina – zostaje poprzednia.”; pusta nazwa – „Konto musi mieć nazwę.” / „Okręt musi mieć nazwę.”; cel z kwotą −500 – „Nieprawidłowa
  kwota – zostaje poprzednia.” i „Podaj kwotę celu.”, cel nie powstaje; „Podaj nazwę celu.”. Wartości błędne nie zapisane, bez kodów systemowych (w zebranych komunikatach).
  Komunikaty z DA (folder niedostępny, plik zablokowany) – NIE WYKONANO (zbiera synteza).

### IN.19 – UWAGA
- Sprawdzone banery: kreator („Budżet jeszcze nie wystartował…” + „Kreator startu”), tylko do odczytu („Folder danych ma format v2, a ta wersja aplikacji obsługuje v1. Zaktualizuj
  aplikację - do tego czasu dane są tylko do odczytu.”, bez „×”), autostart na drugim komputerze („Uruchamiać Financial Intel z Windows na tym komputerze? …” – „Nie” zamyka baner,
  `autostartAsked: true`, `launchAtLogin: false`), „Zaktualizowano do wersji 1.15.4.” z „Co nowego” i „×”. Dwa naraz (tylko do odczytu + zaktualizowano): jeden pod drugim (34–90 px),
  ekran zaczyna się pod nimi; „×” zdejmuje tylko jeden.
- Widać (UWAGA): w banerze „ro” myślnik „-” zamiast półpauzy „–” używanej w całej aplikacji („…Zaktualizuj aplikację - do tego czasu…”). Banery „inny komputer w użyciu”, migracja,
  konflikt, folder niedostępny – NIE WYKONANO (stany z DA).
- Zrzut: IN.19-ro.png, IN.19-kilka.png

### IN.20 – NIEZGODNE (N)
- Stan: rok; przebieg in-teksty (teksty 12 ekranów + 12 zakładek + F1 + tooltipy w `teksty.txt`), 12:50.
- Widać: „Nazwy, które przy imporcie połączyłeś jako jedną firmę albo osobę…” (Ustawienia → Import z banku → Połączone nazwy); „…te nazwy wyglądają na jedną firmę albo osobę…”
  (Import, Uczenie); tooltip „Zaznaczone grupy to jedna firma albo osoba pod różnymi nazwami…” (Import).
- Oczekiwane: „słowo „firma” nie występuje”.
- Reszta ZGODNA: metafory z prawdziwą nazwą i kwotą („Osłony · bufor na pensje 13 000,00 zł / 19 500,00 zł”, „Kadłub · fundusz awaryjny 39 066,30 zł / 39 185,22 zł”,
  „Order Block · ładownia”), terminy ICT po angielsku (Bearish, Bullish, Neutral, Killzone), „Ładownia – stałe koszty”. UWAGA (tekst): kody decyzji w interfejsie: „(D40)”
  przy ciszy nocnej, „(D41)” przy progu dziennika, „(D23)” przy firewallu, „(D12)” przy kadłubie (Ustawienia → Warstwy i rozkazy i Dowództwo), „(D81)” w podpowiedzi Mostku.

### IN.21 – NIEZGODNE (N)
- Stan: rok (liczności 1/2/5/12/22/25 sprawdzone przeszukaniem tekstów; wyciągi „brzegi” – IN.17), przebieg in-teksty i us-konta4.
- Widać: Synchronizacja → Dziennik zmian: „Operacja 2026-11-03: Mokka −12,00 zł”; okno „Historia zmian – Saldo 2026-10-24” (Ustawienia → Konta → historia).
- Oczekiwane: daty „18.10.2026”, nie „2026-10-18” w interfejsie.
- Reszta ZGODNA: kwoty „1 234 567,89 zł”, „−2 234 579,89 zł”, „+2 500 000,00 zł” (spacja tysięcy, przecinek, minus „−”); w zebranych tekstach nie ma „2 operacji” / „5 operacje” /
  „1234.56”; daty ekranów „03.11.2026”, „30.10”; wyrażenia „3 dni”, „14 i 3 dni” poprawne.
- Zrzut: IN.1-sync.png

### IN.22 – ZGODNE
- Zmienne stylu okna wobec `C:\CC-Projekty\TradingJournal\src\renderer\styles\index.css`: bg #0b0d10, panel #111418, raised #161b21, hover #1a2027, line #1e232a, line-strong #2b323b,
  fg #c3cbd4, fg-strong #e8edf2, muted #7a838e, dim #4f5862, accent #e8a33d, up #2ebd85, down #f6465d – identyczne; accent-soft #e8a33d24 = rgb(232 163 61 / 0.14); fonty te same
  (cudzysłowy inne); `--color-warn` nie jest wyliczany w oknie (nieużywany). Panel: tło rgb(17,20,24), ramka 1 px rgb(30,35,42); `.num`: JetBrains Mono, `tabular-nums`, załadowany.
  Zrzut IN.22-mostek.png.

### IN.23 – ZGODNE
- Elementy w kolorze plusa i minusa na 13 ekranach: wpływy „+ 1 000,00 zł”, „+ 3 166,67 zł / mies.”, „+6 086,81 zł”, „+500,00 zł” (Radar), saldo „−55,36 zł”, odchylenia
  „−69,89 zł” – wszystkie to kwoty; czerwone tło tylko paska przekroczenia koperty (Wywiad, Koperty); `box-shadow` występuje tylko jako 1-px linia
  `rgb(30,35,42) -1px 0 0 0` krawędzi paneli (nie cień); gradientów nie ma. Zrzuty IN.23-*.png. (Status sieci w Aktualizacjach jest czerwony – patrz spostrzeżenia.)

### IN.24 – NIEZGODNE (N)
- Stan: rok; przebieg in-anim (z `emulateMedia({ reducedMotion: 'no-preference' })` – okna laboratorium mają wyłączone animacje).
- Widać: przejścia 0,12 s, 0,15 s oraz 0,1 s (100 ms, `transition-colors duration-100` – np. zakładki Ustawień); animacje: `fade-in` 0,14 s, `pop-in` 0,14 s, `slide-up` 0,16 s
  (toast), zdarzenia `event-in` 0,6 s i `sweep` 0,9 s; żadnej animacji w pętli (`getAnimations` z `iterations = Infinity`: pusto).
- Oczekiwane: zwykły interfejs 120–160 ms, dłużej tylko zdarzenia – 100 ms jest poza przedziałem (rozbieżność drobna). Zdarzenia dokowania / awansu / „Miesiąc zamknięty
  na plus” – NIE WYKONANO (AU-5 / AU-10).

### IN.25 – poza laboratorium (DO OCENY)
- Kto: Ty. Zrzuty do porównania z ICTTJ: `IN.22-mostek.png`, `IN.4-ro.png` (Mostek), `IN.17-Operacje.png`, `IN.14-usun.png` (Operacje z edytorem), `US.1-notify.png`,
  `US.1-view.png` (Ustawienia), `IN.7-paleta.png`, `IN.9-uklad.png` (menu Układ), `IN.13-sciagawka.png`, `IN.11-glowne.png` (panele), `IN.28-fokus.png`; wyższy kontrast –
  `US.23-kontrast.png`.

### IN.26 – NIEZGODNE (S)
- Stan: start; `config.json` z `lastRunVersion` „1.15.3” z zewnątrz; przebiegi in-baner (12:50) i in-conowego (13:05, powtórzenie).
- Zrobione: uruchomienie; baner; „Co nowego”; „×”; ponowne uruchomienie.
- Widać: baner „Zaktualizowano do wersji 1.15.4. [Co nowego] [×]”; „Co nowego” otwiera Ustawienia → Aktualizacje, ale na zakładce nie ma panelu „Co nowego w wersji …” ani żadnego
  wyjaśnienia (są tylko „Ta wersja 1.15.4”, „Status: Brak połączenia z GitHubem (praca offline?)…”); log: „WARN update check failed”. Po „×” i ponownym uruchomieniu baner nie wraca.
- Oczekiwane: panel „Co nowego w wersji 1.15.4 (ta wersja)” z sekcją po polsku, „bez dostępu do GitHuba – zrozumiała informacja”.
- Zrzut: IN.26-co-nowego.png, IN.26-aktualizacje.png

### IN.27 – ZGODNE
- Wskaźnik w górnym pasku: „zapis automatyczny” → po edycji „zapisano 12:42:49”; tryb tylko do odczytu – „tylko odczyt” (akcent, zrzut IN.4-ro.png). „Błąd zapisu – ponów” i niedostępny
  folder – NIE WYKONANO (DA.40).

### IN.28 – NIEZGODNE (N)
- Stan: rok; przebiegi in-klawiatura (12:42) i in-fokus (13:00).
- Zrobione: Tab przez Ustawienia, menu boczne, Mostek, paletę; Spacja na przełączniku; Esc.
- Widać: wszystkie przyciski osiągalne Tabem w logicznej kolejności (pasek górny → baner → zakładki Ustawień → panele → menu), fokus widoczny (kontur 1–2 px albo zmiana ramki pola
  na akcent rgb(232,163,61)), Spacja przełącza „Dźwięki zdarzeń”; po otwarciu palety (Ctrl+K) pierwszy Tab przenosi fokus do menu bocznego pod nakładką („nav-bridge” … „nav-cargo”,
  poza paletą), a Esc na takim fokusie palety już nie zamyka (nakładka blokuje klikanie – 27 prób kliknięcia).
- Oczekiwane: „każdy przycisk osiągalny Tabem w logicznej kolejności, fokus widoczny”; okna modalne – fokus nie ucieka za nakładkę. Okno Historia: po otwarciu fokus zostaje na
  przycisku „historia” poza oknem (nie przeniesiony do okna).
- Zrzut: IN.28-fokus.png, IN.28-pole.png

## Znaleziska

- IN.4 – NIEZGODNE (S): w folderze tylko do odczytu Ctrl+S i paleta „Zapisz teraz” pokazują „Zapisano. (Zapis jest automatyczny – Ctrl+S nie jest potrzebne.)”, choć nic nie zapisano. Zrzut IN.4-ro.png.
- IN.26 – NIEZGODNE (S): baner „Zaktualizowano do wersji 1.15.4. – Co nowego” prowadzi do Aktualizacji bez panelu „Co nowego” i bez słowa wyjaśnienia (offline). Zrzut IN.26-co-nowego.png.
- IN.20 – NIEZGODNE (N): słowo „firma” („firmę”) w trzech miejscach importu (Ustawienia → Import z banku, Import, Uczenie). Opis: Ustawienia → Import z banku → „Połączone nazwy”.
- IN.21 – NIEZGODNE (N): data ISO w interfejsie – Dziennik zmian „Operacja 2026-11-03: Mokka”, okno Historia „Saldo 2026-10-24”. Zrzut IN.1-sync.png.
- IN.24 – NIEZGODNE (N): przejście 100 ms (`duration-100`) poza przedziałem 120–160 ms.
- IN.28 – NIEZGODNE (N): Tab z otwartej palety wychodzi za nakładkę do menu bocznego, a Esc przestaje zamykać paletę; w oknach modalnych fokus nie jest przenoszony do okna. Zrzut IN.28-fokus.png.

## Spostrzeżenia

- Pozycja menu „Synchronizacja” nie pokazuje skrótu (Ctrl Shift Y jest tylko w ściągawce), Meldunki pokazują licznik zamiast skrótu (IN.1).
- Po pierwszym kliknięciu kosza („Usuń na pewno”) fokus ginie – użytkownik klawiatury musi szukać przycisku Tabem (IN.14); po zamknięciu palety (Esc) fokus nie wraca do poprzedniego miejsca, tylko na tło (IN.7).
- Ctrl+N z filtrem „Biedronka” na październiku zeruje szukanie i skacze na bieżący miesiąc – wygodne, ale nie powiedziane w toaście (IN.3).
- Szkic z Ctrl+N („nowa operacja 0,00”) widać na liście Operacji także przy aktywnym szukaniu, które go nie obejmuje (zauważone przy wyszukiwaniu w przebiegu us-dom; do sprawdzenia w obszarze OP).
- Przy starcie 10 powiadomień Windows naraz (patrz US.16); powiadomienie „Nieznany sygnał…” skleja nazwę z kwotą bez separatora („…Świę 1 234 567,89 zł”).
- Pole „Minimalne osłony” z kropką „1.0” i „(3 pensji)” w komunikatach (US.7) – spójność liczb i odmiany.
- Status sieci „Brak połączenia z GitHubem…” w czerwieni jak alarm (IN.23) – do oceny, czy to nie nadużycie czerwieni (CLAUDE.md: czerwień dla kwot i alarmów).
- Dwa wzorce potwierdzenia: inline „Usuń na pewno” (kosz) i okno z „Anuluj” (zmiana scenariusza – pole inline z przyciskami); Esc w obu wycofuje.
- W laboratorium nie ma `prefers-reduced-motion` wyłączonego – animacje 1 ms; pomiary IN.24 po emulacji.

## Problemy laboratorium (nie aplikacji)

- Okna w laboratorium mają włączone `prefers-reduced-motion` – czasy animacji tylko po `emulateMedia` (IN.24).
- `Control+Plus` nie jest nazwą klawisza w Playwright – Ctrl++ wysyłane jako `Control++` / `Control+Shift+Equal` / `Control+NumpadAdd`.
- Przycisk „wstecz” myszy w Playwright nie istnieje – zastąpiony zdarzeniem `mouseup` z `button: 3` w oknie.
- Problemy `start()` (parsowanie `config.json`, `FI_ICTJ_APPDATA`) – patrz raport US.
