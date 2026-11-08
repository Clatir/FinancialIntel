# Raport – SA: salda

- Data: 03.11.2026 (zegar laboratorium = kotwica persony), przebiegi 11:46–12:00.
- Wersja: Financial Intel 1.15.4 z GitHub Releases, laboratorium `tests/audyt/lab.ts`.
- Stan danych: persona `rok` (mBank: saldo otwarcia 18 000,00 zł z 01.09.2025, potwierdzenie 26.10.2026 69 796,78 zł;
  Portfel XTB i Gotówka bez potwierdzeń). Dodatki per przebieg – przy punktach.
- Skrypty: `tests/audyt/sa.spec.ts`, `tests/audyt/im-g.spec.ts` (SA.8), `tests/audyt/sa8b.spec.ts`; dzienniki
  `C:\FI-audyt\przebiegi\sa-*\obs.txt`; zrzuty `C:\FI-audyt\zrzuty\SA.*.png`; odczyty `C:\FI-audyt\odczyty\sa.jsonl`.

**Podsumowanie (SA.1–SA.9):** ZGODNE 6 · NIEZGODNE 1 (N 1) · UWAGA 1 · poza laboratorium 1 (SA.9 – Maszyna).

---

### SA.1 – NIEZGODNE (N)
- Stan: rok + „Konto testowe” (bank, bez salda otwarcia) z operacjami −120,00 (20.10), +500,00 (25.10), −35,50 (01.11);
  przebieg sa-1.
- Zgodne: „Saldo otwarcia [18 000,00] zł na początek dnia [01.09.2025] – operacje od tego dnia są doliczane”; +100 zł →
  saldo konta 69 747,04 → 69 847,04 zł (Ustawienia i pasek Operacji); data 02.09.2025 → 70 160,78 zł; data jutra –
  „Saldo otwarcia nie może być z przyszłości.”, data w polu bez zmiany; nowe konto: „Ustaw z salda w banku” (500,00) –
  toast „Konto testowe: saldo otwarcia ustawione na początek 20.10.2026 (155,50 zł).” (500 − 344,50), saldo 500,00 zł,
  w pasku Operacji „Konto testowe 344,50 zł *” → „500,00 zł” (gwiazdka znika); „historia” – okno z wersjami i „Przywróć
  tę wersję”.
- Niezgodne: okno historii salda otwarcia pokazuje datę w formacie ISO: tytuł „Historia zmian – Saldo 2025-09-02”,
  wiersz „Data 2025-09-01 → 2025-09-02”, wersja „1.09.2025, 10:00”.
- Oczekiwane: nie przechodzi, gdy „data salda otwarcia w innym formacie niż dd.mm.rrrr”.
- Zrzut: SA.1-historia.png, SA.1-konta.png. Odczyt: `sa.jsonl` SA.1.

### SA.2 – ZGODNE
- Stan: rok, sa-1.
- Widać: „Saldo w banku teraz” = 69 747,04 → „Potwierdź saldo” – „mBank: saldo zgodne z operacjami (69 747,04 zł).”,
  bez korekty; „ostatnio potwierdzone 03.11.2026 (69 747,04 zł)”; z odprawy znika „mBank: saldo potwierdzone 8 dni temu
  – sprawdź z bankiem.”; w Meldunkach mBanku nie ma (był w normie 30 dni).

### SA.3 – UWAGA
- Stan: rok, sa-1.
- Zgodne: saldo o 37,50 zł niższe → „Różnica −37,50 zł wobec operacji do końca dnia. Dzisiejsze operacje są już
  dopisane?” → „Tak – zapisz korektę” → „mBank: rozbieżność w ładowni −37,50 zł – dodano korektę do wyjaśnienia
  (Operacje).”; w Operacjach „Korekta salda … −37,50” z notatką „Rozbieżność w ładowni – do wyjaśnienia (różnica między
  saldem w banku a operacjami).”; odprawa „Rozbieżność salda: korekta −37,50 zł do wyjaśnienia.”; saldo konta = wpisane
  (69 709,54), osłony 13 155,50 → 13 118,00 zł, „Koszty” 47,50 → 47,50 zł.
- Uwaga (znak różnicy): pytanie i toast podają różnicę jako bank − FI („Różnica −37,50 zł” przy saldzie banku niższym),
  telemetria z banku jako FI − bank („Różnica −9,05 zł (FI − bank)” przy saldzie banku wyższym, z przyciskiem
  „Potwierdź z korektą +9,05 zł”, IM.34). Ta sama sytuacja ma przeciwny znak na dwóch ekranach – punkt wymaga „znaku
  jednoznacznego … („FI − bank”)”.
- Nie sprawdzone: klik w alarm odprawy (czy prowadzi do korekty).
- Zrzut: SA.3-pytanie.png, SA.3-odprawa.png, IM.34-H2.png. Odczyt: `sa.jsonl` SA.3.

### SA.4 – ZGODNE
- Stan: rok (po SA.3), sa-1.
- Widać: różnica −10,00 → „Dopiszę i potwierdzę później” – korekt 1 → 1, w polu zostaje „69 699,54”; po dopisaniu
  wydatku 10,00 zł w Operacjach (Ctrl+N) i ponownym potwierdzeniu – „mBank: saldo zgodne z operacjami (69 699,54 zł).”,
  bez pytania; przy otwartym pytaniu zmiana kwoty zamyka pytanie (1 → 0).
- Spostrzeżenie: po przejściu na inny ekran i powrocie pole „Saldo w banku teraz” jest puste – wpisana kwota nie
  przeżywa zmiany ekranu (szkic).

### SA.5 – ZGODNE
- Stan: rok z korektą −37,50 (SA.3), sa-1, z restartem.
- Widać: „Korekta salda wyrównuje rachunek i osłony – dopóki jej nie oznaczysz jako wyjaśnionej, świeci żółtym alarmem
  w Odprawie.” → „Oznacz jako wyjaśnioną” → „Korekta salda wyjaśniona – nie świeci żółtym alarmem w Odprawie na Mostku.”,
  alarm znika; „Przywróć alarm” – wraca; notatka dopisana; po ponownym wyjaśnieniu i restarcie alarm nie wraca; kwota
  −37,50 bez zmian.

### SA.6 – ZGODNE
- Stan: rok (mBank potwierdzony 8 dni temu, Portfel XTB nigdy, Gotówka nigdy, „Stare konto” zarchiwizowane nigdy) –
  role kont zamienione wobec opisu punktu (persona ma odwrotnie); sa-6.
- Widać: odprawa „mBank: saldo potwierdzone 8 dni temu – sprawdź z bankiem.” i „Portfel XTB: potwierdź saldo z bankiem
  (raz w tygodniu).”, bez Gotówki i bez konta zarchiwizowanego; potwierdzenie mBanku gasi tylko jego pozycję (Portfel
  zostaje – B28); potwierdzenie Portfela – „Portfel XTB: saldo zgodne z operacjami (3 918,89 zł).”, pozycja znika;
  Meldunki „Portfel XTB: saldo bez potwierdzenia od salda otwarcia z 01.09.2025 (428 dni) – sprawdź z bankiem.” i „Salda
  potwierdzone z bankiem ponad 30 dni temu – …” (mBank z 8 dniami nie ma) – oba progi nazwane.

### SA.7 – ZGODNE
- Stan: rok + przelew w jednej operacji mBank → Portfel XTB 200,00 (strona mBanku 03.11, strona Portfela 04.11) i wydatek
  Portfela 50,00 z datą 04.11; sa-7.
- Widać: Import → „Potwierdzenie sald” i Ustawienia → Konta – te same salda (mBank 69 547,04, Portfel 3 918,89,
  Gotówka −55,36); przelew liczony na mBanku 03.11, na Portfelu dopiero 04.11; operacja jutra poza saldem; potwierdzenie
  Portfela z ekranu Import – „Portfel XTB: saldo zgodne z operacjami (3 918,89 zł).”; „−250” przyjęte („−250,00”,
  pytanie „Różnica −69 797,04 zł …”, to samo w Ustawieniach); „1 234 567,89” bez zaokrągleń („Różnica +1 165 020,85 zł”).
  Debet z persony `brzegi` – stanu nie ma, sprawdzone wpisaniem salda ujemnego. Odczyt: `sa.jsonl` SA.7.

### SA.8 – ZGODNE
- Stan: dwa komputery na kopiach folderu `rok` (A i B potwierdzają mBank tym samym saldem z różnicą −25,00, potem
  synchronizacja B → A); wariant 2 – dwie korekty −25,00 z 02.11 (KOMPUTER-A) i 03.11 (KOMPUTER-B); przebiegi sa-8,
  sa-8b.
- Widać: wariant 1 – po synchronizacji jedna korekta (ten sam identyfikator na obu komputerach), saldo 69 722,04 zł;
  wariant 2 – Meldunki „Podwójne korekty”: „mBank: korekta salda −25,00 zł z 03.11 wygląda na powtórzoną – taka sama
  z 02.11 (KOMPUTER-A); saldo potwierdzone dwa razy, zanim OneDrive przyniósł pierwszą.” z „Pokaż korektę” i „to nie
  powtórzenie”; po „to nie powtórzenie” meldunek znika i nie wraca po restarcie. Zrzut: SA.8-podwojne.png.

### SA.9 – poza laboratorium (Maszyna)

---

## Znaleziska
- SA.1 (N) – historia salda otwarcia pokazuje datę w formacie ISO („Saldo 2025-09-02”, „2025-09-01 → 2025-09-02”).

## Spostrzeżenia
- Znak różnicy: pytanie / toast potwierdzenia salda = bank − FI, telemetria z banku = FI − bank (z przyciskiem korekty
  o znaku przeciwnym do „Różnicy”) – jedna konwencja i jedno słowo („korekta +X” / „w FI mniej o X”) usunęłoby
  zgadywanie (SA.3).
- Wpisane „Saldo w banku teraz” znika po zmianie ekranu (SA.4) – inaczej niż szkice w reszcie aplikacji.
- Podwójne korekty wykrywane tylko z dwóch różnych komputerów (`updatedBy`) – dwie takie same korekty z jednego
  komputera w kilka dni nie są pokazywane (zgodnie z opisem B129, ale warto to nazwać w pomocy).

## Problemy laboratorium
- Pierwsza próba wariantu 2 SA.8 miała obie korekty z jednego komputera (kopia pliku po synchronizacji) – meldunku nie
  było; powtórzona z korektami z dwóch komputerów (sa-8b).
- Stan SA.6 z opisu (mBank wczoraj, Portfel 8 dni) zastąpiony stanem persony (mBank 8 dni, Portfel nigdy) – reguły
  odprawy i Meldunków sprawdzone tak samo.
