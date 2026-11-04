# Audyt 1.15.4 – lista „Tylko Ty”

Rzeczy, których ani laboratorium (Claude), ani maszyna wirtualna nie sprawdzą: prawdziwe pliki, prawdziwe komputery,
dźwięk, Excel i Twoja ocena. Punkty i ich pełny opis: `docs/audyt/punkty/*.md` (numer punktu → Grep po numerze).

## Ile to zajmie
- **Czas czynny: ok. 5–6 h**, najlepiej w 3 sesjach: (A) komputer + Excel + dźwięk ok. 2 h, (B) prawdziwe pliki z banku
  i ICTTJ ok. 1,5 h, (C) wygląd i ton ok. 1 h; do tego dwa oczekiwania (DA.37 – 2 dni, DO.24 – tydzień), które
  zajmują Ci po kilka minut dziennie.
- Kolejność: najpierw sesja B (wyniki wpływają na ocenę importu), na końcu C – po przeczytaniu raportów.
- Nic z tej listy nie wymaga zmiany kodu ani zegara; wszystko poza DA.6, DA.37, DO.24 możesz zrobić na kopii
  z laboratorium (`C:\FI-audyt\stany\…`) albo na świeżym, pustym folderze.

## Jak zgłaszać
Jedna linia na punkt, wprost w rozmowie albo w pliku `C:\FI-audyt\ty-wyniki.txt`:

`<numer punktu> | <co zrobiłeś> | <co widać, dosłownie> | <godzina>` – a przy problemie zrzut ekranu (Win+Shift+S).

Przykład: `RE.9 | otworzyłem budzet.xlsx dwuklikiem | Excel: „Wykryto problem z zawartością” | 14:20`.
Werdykt: ZGODNE / NIEZGODNE / DO OCENY (opinia: dobrze – tak sobie – źle). Dopisz, gdzie się zawahałeś, nawet jeśli
wszystko działa. Wpisów nie poprawiaj – lepsza jedna linia z godziną niż opis z pamięci.

## 1. Punkty „Kto: Ty” (20)

### Pliki z banku i ICTTJ (sesja B)
1. **KR.33** – przejdź kreator na pustym folderze testowym z Twoim prawdziwym CSV (nie na swoim budżecie). Patrz: czy
   propozycje pensji, kopert i ładowni wyglądają wiarygodnie, czy kroki są zrozumiałe bez dokumentacji, ile trwa.
2. **IM.56** – wczytaj oba prawdziwe pliki (lista i historia rachunku) w aplikacji audytowej na stanie `start`, bez
   importu do swojego folderu. Patrz: polskie znaki, liczba operacji i okres jak w mBanku, saldo = aplikacja banku,
   ile pozycji wymaga decyzji, ile podpowiedzi „temat” jest nietrafnych.
3. **DO.24** – prawdziwa wypłata w ICTTJ przy otwartym FI. Przed: zapisz listę plików i „Data modyfikacji”
   w `payouts/` ICTTJ. Po: import mBanku, dokowanie, „Otwórz ICTTJ”; po tygodniu porównaj listę. Patrz: w ICTTJ nic nie
   przybyło ani nie zmieniło daty poza Twoimi wpisami.

### Komputery i OneDrive (sesja A, część czasowa)
4. **DA.6** – na drugim komputerze otwórz w FI folder z rokiem syntetycznym, którego pliki są „tylko online”
   („Zwolnij miejsce”). Patrz: licznik plików rośnie bez minutowych przestojów, jest podpowiedź „Zawsze zachowuj na tym
   urządzeniu”, liczby Mostka jak na pierwszym komputerze.
5. **DA.37** – dwa prawdziwe komputery: dodaj operacje na A, schowaj do zasobnika, pracuj na B, po kilku godzinach wróć
   na A, zostaw oba w zasobniku na noc. Patrz: zmiany idą w obie strony, brak banera i brak kopii konfliktu bez
   równoczesnej edycji, powiadomienia tylko tam, gdzie siedzisz, kopia dzienna na obu.
6. **IN.12** – drugi monitor: panel odłączony na noc (aplikacja w zasobniku), rano czy pokazuje nowy dzień; potem okno
   główne na drugi monitor, zakończ, odłącz monitor, uruchom. Patrz: okno otwiera się na ekranie, wyśrodkowane.

### Dźwięk i głos (sesja A)
7. **US.19** – Ustawienia → Powiadomienia i dźwięki: „▶” przy każdym zdarzeniu na 30 % i 100 %; zapis operacji, alarm;
   wyłączone zdarzenie. Patrz: dźwięki się różnią, 30 % jest ciche, 100 % nie drażni, wyłączone milczy; czy pasują.
8. **MO.17** i **RY.4** (jedno podejście) – „Odsłuchaj” w Odprawie na Mostku: zwykły dzień, dzień z przekroczoną energią
   (stan `brzegi`), kwoty ukryte (Ctrl+$). Patrz: polski głos czyta datę, energię, Daily Bias, pozycje; przy ukrytych
   kwotach „kwota ukryta”; wymowa i tempo zrozumiałe; nic nie startuje samo.
9. **DW.20** – ekran awansu (stan `rok-awans`): dźwięk awansu, animacja bez efekciarstwa; Enter zamyka, po restarcie nie
   wraca. Patrz też zrzuty `DW.20-*.png`.
10. **RY.21** i **RY.22** – „Miesiąc zamknięty na plus”: dźwięk dokładnie raz na komputer, drugie otwarcie bez dźwięku
    (RY.22 – po przełomie miesiąca, maszyna zmienia zegar, Ty słuchasz).

### Excel i druk (sesja A)
11. **RE.6** – otwórz w Excelu `C:\FI-audyt\eksport\re-1-ops.csv` (wiersze z „'=SUMA(A1)”, „'+48 600 100 200”,
    „'-rabat”, „'@firma”, notatka ze średnikiem). Patrz: Excel pokazuje tekst, niczego nie liczy, wiersz nie
    rozjeżdża się na kolumny, polskie litery poprawne; zwróć uwagę, czy widać apostrof przed tekstem.
12. **RE.9** – dwuklik `re-1-xlsx.xlsx`, `re-1-ops.csv`, `re-1-months.csv`; zsumuj kolumnę „Kwota (zł)” (powinno wyjść
    52 017,23 zł; plik nie ma przyszłej operacji z 15.12), posortuj po dacie. Patrz: bez ostrzeżeń i naprawy pliku,
    CSV nie w jednej kolumnie, daty i kwoty rozpoznane (w xlsx daty są tekstem ISO – sprawdź, czy sortowanie i filtr
    dat działają), szerokość kolumn.

13. **RE.10** (wygląd wydruku) – otwórz PDF-y `re-1-debriefing-2026-10.pdf`, `re-1-przeglad-2026.pdf` (są też
    zrzuty stron `C:\FI-audyt\zrzuty\RE.10-*.png`) i wydrukuj / podejrzyj wydruk. Patrz: czytelność, wcięcia, czy
    nic nie jest ucięte, czy tabele i marginesy wyglądają profesjonalnie.

### Czytelność analiz (sesja C)
14. **WY.4** – wykres drawdownu i „Największy drawdown”: czy bez instrukcji wiesz, co pokazuje.
15. **WY.9** – mapa Killzones (dzień × godzina): czy najjaśniejsze pole „samo mówi”, czy legenda wystarcza.
16. **WY.25** – terminy ICT (Daily Bias, BOS, CHoCH, FVG, Killzone, Order Block, Silver Bullet, Judas Swing,
    Turtle Soup,
    Liquidity sweep, Premium / Discount, Equilibrium, DOL): czy każdy ma zrozumiałe zdanie „co to dla moich pieniędzy”.
17. **WY.28** – wykresy Wywiadu (zrzuty `WY.28-*.png`): czytelne bez instrukcji, jeden akcent, bez gradientów.
18. **IN.25** – wygląd wobec ICTTJ i ton: porównaj Mostek, Operacje, Ustawienia, paletę i panele z ICTTJ obok (zrzuty
    `IN.16-*.png`, `IN.17-*.png`), także wieczorem. Patrz: ta sama rodzina (menu boczne to jedyna różnica – D44).

Pozostałe punkty z „Ty” w nawiasach (**RE.6**, **WY.4**, **WY.9**, **WY.25**, **RY.21**) wykonuje Claude (bajty, teksty,
liczby) – tu zostaje tylko część „Ty”, jak wyżej.

## 2. Czego nie sprawdzi ani laboratorium, ani maszyna (nie ma punktu)
19. **OneDrive na dwóch prawdziwych komputerach – konflikt i scalanie na żywo.** Zmień tę samą operację na A i na B
    zanim zsynchronizują się (wyłącz sieć na jednym), potem włącz. Patrz: powstaje „kopia konfliktu” i aplikacja ją
    scala trójstronnie (dwie różne zmiany obie zostają, ta sama – jedna), nic nie ginie, w Synchronizacji jest opis.
20. **Prawdziwy CSV z mBanku – kodowanie i rozpoznanie.** (Rozszerzenie IM.56.) Wczytaj plik prosto z banku, nie
    z przeróbki: czy aplikacja sama rozpoznaje „listę operacji” i „historię rachunku”, czy polskie litery w nazwach
    kontrahentów są dobre (Windows-1250), czy daty i kwoty zgadzają się z bankiem; spróbuj też pliku z innego okresu.
21. **Prawdziwy folder ICTTJ i prawdziwa wypłata.** (Rozszerzenie DO.24.) Czy FI znajduje Twój folder ICTTJ bez
    wskazywania, czy pule (zwykła, Cele, Podatek) trafiają tam, gdzie powinny, czy zwrot do masy jest zauważony.
22. **Dźwięki – każde zdarzenie i głośność.** (Szerzej niż US.19.) Przejdź realnie przez zdarzenia: zapis operacji,
    alarm, awans, miesiąc na plus, wyłączenie dźwięku w Ustawieniach, Windows na cicho; czy nic nie gra w ciszy nocnej.
23. **Odsłuch odprawy polskim głosem.** (MO.17 / RY.4.) Jeśli Windows nie ma polskiego głosu, zainstaluj go (Ustawienia
    Windows → Czas i język → Mowa) i sprawdź jeszcze raz; zapisz, jaki głos był użyty.
24. **Otwarcie eksportu w Excelu na swoim komputerze** (wersja Excela, język, separator listy) – RE.9. Jeśli CSV ląduje
    w jednej kolumnie, zapisz ustawienie „Separator listy” (Panel sterowania → Region → Ustawienia dodatkowe).
25. **Wygląd i ton – zrzuty „DO OCENY”** (pliki w `C:\FI-audyt\zrzuty\`; pełny wykaz uzupełni synteza AU-11, tu stan
    na teraz):
    - Raporty i eksport: `RE.1-ctrl0.png`, `RE.1-paleta.png`, `RE.2-raporty-odprawa.png`, `RE.2-bez-alarmow.png`,
      `RE.3-panel.png`, `RE.10-debriefing-2026-10-1.png`, `RE.10-przeglad-2026-1.png`, `RE.10-przeglad-2026-2.png`,
      `RE.10-debriefing-2026-09-1.png`, `RE.10-debriefing-2025-09-1.png`, `RE.11-ukryte-debriefing.png`,
      `RE.11-ukryte-eksport.png`, `RE.13-lista.png`, `RE.14-wywiad.png`, `RE.14-przychody-mostek.png`;
    - Wywiad: `WY.28-intel-wealth.png`, `WY.28-intel-killzones-panel.png`, `WY.28-intel-range.png`,
      `WY.28-intel-course.png`, `WY.9.png`, `WY.25-F1.png`;
    - Dowództwo i rytuały: `DW.20-ekran-awansu.png`, `DW.20-ekran-1-w-animacji.png`, `RY.21-plus-pierwsze.png`,
      `RY.21-plan-*.png`;
    - Wygląd ogólny: `IN.16-*.png` (każdy ekran), `IN.17-*.png`, `IN.17-paleta.png`, `IN.17-szybki.png`;
    - Okno szybkiego wpisu i klawiatura: SW.36 – 45 klawiszy na trzy zakupy, 10 × Tab do „plan” (czy za dużo).
26. **„Czy aplikacja otwiera się z przyjemnością”** (kryterium sukcesu ze specyfikacji). Gdy raporty będą gotowe:
    przez tydzień codziennie otwórz aplikację na swoim budżecie jak zwykle i zapisz jedno zdanie (co cieszyło, co
    irytowało, co chciałeś zrobić, a nie dało się szybko). To jedyny punkt, którego nie zamknie jeden wpis – werdykt
    daje użycie.

## Podsumowanie
- Pozycji: 18 grup punktów „Kto: Ty” (20 numerów punktów, w tym RE.6 częściowo) + 8 rzeczy spoza punktów = 26 pozycji.
- Szacunek: ok. 5–6 h czynnych + DA.37 (2 dni) + DO.24 (tydzień) + kryterium przyjemności (tydzień po kilka minut).
