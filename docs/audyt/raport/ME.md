# Raport – ME: Meldunki do rozpatrzenia

- Data: 03.11.2026 (zegar laboratorium = kotwica persony), przebiegi 11:13–12:06.
- Wersja: Financial Intel 1.15.4 z GitHub Releases, laboratorium `tests/audyt/lab.ts`.
- Skrypty: `tests/audyt/op-1-lista.spec.ts` (ME.2), `op-4-filtry.spec.ts` (ME.4), `op-8-przelewy.spec.ts` (ME.6, ME.7),
  `op-10-meldunki.spec.ts`, `op-12-dopowiedzenia.spec.ts`, `op-13-dopowiedzenia2.spec.ts`; pomocnik `op-pomoc.ts`;
  wyjście `C:\FI-audyt\przebiegi\op-logi\`, zrzuty `C:\FI-audyt\zrzuty\ME.*.png`, odczyty `C:\FI-audyt\odczyty\op.jsonl`.
- Stany: `rok`, `rok+op`, `rok+przelewy` – opis w `raport/OP.md`, „Stany danych”; dodatkowo:
  - **rok+meldunki** (ME.3): rok+op + przelewy sprzed 1.7.0 bez potwierdzenia Portfela XTB + dwie korekty mBanku po
    15,00 zł (27.10 LAPTOP-KAPITANA, 29.10 PC-STACJONARNY) + uszkodzony plik operacji + wpłata Marka 50 zł bez wskazanych
    zakupów;
  - **rok+salda** (ME.10): potwierdzenie mBanku przeniesione na 03.10.2026 (31 dni przed D0, saldo z folderu), konto
    „Konto oszczędnościowe” potwierdzone 05.10 (29 dni), konto zarchiwizowane „Stare konto”;
  - **start** – folder po starcie budżetu dziś, bez operacji; **przed startem** – folder z `fi.json` bez startu budżetu
    i bez salda otwarcia, jedna stara operacja bez kategorii i kopia konfliktu OneDrive (`…-LAPTOP-KAPITANA.json`).
- Podsumowanie (10 punktów): **ZGODNE 4 · NIEZGODNE 1 · UWAGA 1 · LICZBY → AU-9 3 · poza laboratorium 1** (ME.9)
  – NIEZGODNE: ME.3 N (powtórzone na świeżym przebiegu).

## Punkty

### ME.1 – ZGODNE
- Stan: start (`me-start`), przed startem (`me-pusty-2`).
- Widać: start – „Meldunki do rozpatrzenia / wszystko rozpatrzone / Brak meldunków – nic nie czeka na decyzję.”, przy
  „Meldunki” w menu bez licznika. Przed startem budżetu – „1 meldunek / FOLDER DANYCH / 1 konflikt kopii – do
  rozstrzygnięcia w Synchronizacji.”, bez „bez kategorii” (stara operacja bez kategorii jest) i bez sald.
- Spostrzeżenie: folder z saldem otwarcia z przeszłości, przed kreatorem („Budżet liczy się na razie od salda otwarcia,
  bez planu…”), ma już meldunki „1 wydatek bez kategorii od 01.06.2025 – razem 45,00 zł.” i „mBank: saldo bez
  potwierdzenia od salda otwarcia z 01.06.2025 (520 dni)” – budżet liczy się od salda otwarcia (`me-pusty`).
- Zrzuty: ME.1-pusta.png, ME.1-przed-startem-bez-salda.png, ME.1-przed-startem.png

### ME.2 – ZGODNE
- Stan: rok, `me-licznik`.
- Widać: menu „Meldunki … 8”, nagłówek „8 meldunków”, 8 linii; Ctrl+Shift+M z Mostka, Esc – wraca na Mostek; Ctrl+Shift+M
  z Ustawień, Esc – wraca do Ustawień; „to w porządku” przy nieznanym sygnale – toast „Zapamiętane: to w porządku.”
  z „Cofnij”, od razu „7 meldunków” i 7 w menu (bez ponownego uruchomienia). Po ponownym uruchomieniu lista ta sama, bez
  meldunków oznaczonych jako rozpatrzone (ME.6, ME.8). Licznik duplikatów pojawia się po kilku sekundach (ME.5 – czekanie 12 s).
- Zrzut: ME.2-po-decyzji.png

### ME.3 – NIEZGODNE (N)
- Stan: rok+meldunki (`me-sekcje` 11:52); potwierdzenie „Pokaż zakupy” na czystym rok (`me-pokaz-zakupy` 12:05).
- Zrobione: przy „Marek: do oddania 360,00 zł – najstarszy zakup z 20.08 (75 dni).” – „Pokaż zakupy”.
- Widać: Operacje „cała historia”, „Oznaczenia: domownik”, „Operacje 68 / 982” (w rok+meldunki 71) – wszystkie zakupy
  wszystkich domowników, w większości „DOMOWNIK · ODDANE” (pierwsze 8 wierszy: LIDL, BIEDRONKA, Biedronka, SKLEP
  PAPIERNICZY…); zakup Marka do oddania (EVENTIM 20.08) daleko w dół listy. To samo z Mostka (linia „Marek: do oddania…”).
- Oczekiwane: przycisk prowadzi do decyzji, nie do listy, w której trzeba szukać – punkt, „Nie przechodzi” 1.
- Reszta zgodna: kolejność sekcji: Dokowanie, Łupy (w rok: zaraz po Dokowaniu; w rok+meldunki łupów brak – październik
  bez nadwyżki po dodanych operacjach), Folder danych, Bez kategorii, Możliwe duplikaty, Przelewy między kontami, Podwójne
  korekty, Nieznane sygnały, Zwroty do przypisania, Do zwrotu, Zwroty w drodze, Ładownia, Salda kont. Przyciski: „Zadokuj”
  – okno „Dokowanie dostawy”; „Synchronizacja” – ekran Synchronizacja, „PLIKI Z PROBLEMAMI (1) · USZKODZONY ·
  transactions/2026/2026-10-15_….json”; „Pokaż w Operacjach” – 5 operacji od 01.09.2025; „Scal na ekranie Import” –
  Import; „Połącz…” – okno par; „Połącz” / „Dopisz drugą stronę” – wykonują od razu; „Pokaż korektę” – edytor korekty
  z 29.10; „Pokaż operację” – edytor operacji (dwa obciążenia – lista 30–31.10); „Przypisz” – edytor wpłaty „Marek –
  zwrot”; „Pokaż zakup” – MODIVO; „Zaktualizuj w Ładowni” / „Pokaż w Ładowni” – Ładownia; „Potwierdź saldo” – Ustawienia →
  Konta (ME.10).
- UWAGA (tekst): wyjaśnienie pod sekcją jest tylko przy części sekcji (Bez kategorii, Możliwe duplikaty, Przelewy, Do
  zwrotu, Salda kont); bez niego: Dokowanie, Łupy, Folder danych, Podwójne korekty, Nieznane sygnały, Zwroty do
  przypisania, Zwroty w drodze, Ładownia.
- Zrzuty: ME.3-skrzynka.png, ME.3-pokaz-zakupy.png

### ME.4 – LICZBY → AU-9
- Stan: rok+op, `op-filtry-2`.
- Zachowanie zgodne: „5 wydatków bez kategorii od 01.09.2025 – razem 162,79 zł.” (A 30,00 + B 45,50 + C 19,99 + Dino 27,30
  + część paragonu 40,00; bez wydatku z 20.08.2025 sprzed startu, bez całych 100 zł paragonu); „Pokaż w Operacjach” – okres
  „2025-09-01 – …”, „Operacje 5 / 1036”, te same 5 operacji, link „mój filtr” (zapisany filtr nietknięty); po
  skategoryzowaniu wszystkich – lista pusta, meldunek znika.
- Odczyt: `op.jsonl` (ME.4). Zrzut: ME.4-pokaz.png

### ME.5 – ZGODNE
- Stan: rok+op (3 wiersze banku zapisane dwa razy), `me-duplikaty`.
- Widać: „3 możliwe duplikaty – ta sama operacja dwa razy.”; nad listą Operacji „Możliwe duplikaty: 3”; Import bez pliku –
  panel „Duplikaty operacji” z trzema grupami „Ten sam wiersz banku” (ROSSMANN 112, KEBAB ROMA, SKYCASH PARKING, „zostaje” /
  „kopia”); przy otwartym pliku `rok-nowe-lista.csv` – „Możliwe duplikaty: 3 – scalisz je po imporcie albo po zamknięciu
  pliku.”
- Zrzuty: ME.5-import-bez-pliku.png, ME.5-import-z-plikiem.png

### ME.6 – LICZBY → AU-9
- Stan: rok+przelewy, `me-pary` (+ ponowne uruchomienie) i `me-pary-cofnij`.
- Zachowanie zgodne: „3 przelewy między kontami zapisane jako dwie osobne operacje (sprzed 1.7.0) – połączenie w jedną
  operację nie zmienia żadnego salda.”; okno „Przelewy zapisane jako dwie operacje” z parami „12.10.2026 Gotówka → Portfel
  XTB · 50,00 zł”, „27.10.2026 mBank → Portfel XTB (wpływ 28.10) · 300,00 zł”, para bez konta z notką „Żadna strona nie
  wskazuje konta – para po kwocie i dniu; sprawdź, czy to jeden przelew.”; po odznaczeniu – „Połącz zaznaczone (2)”, toast
  „Połączono 2 przelewy w jedną operację dla obu kont.” z „Cofnij” (przywraca dwie pary jako osobne operacje); salda bez
  zmian (mBank 68 697,04, Portfel 5 168,89, Gotówka −285,36 zł); „zostaw tak” – toast „Przelew nie będzie już
  zgłaszany.” z „Cofnij”, po ponownym uruchomieniu para nie wraca.
- Odczyt: `op.jsonl` (ME.6). Spostrzeżenie: para bez wskazanego konta jest w oknie zaznaczona domyślnie (z ostrzeżeniem).
- Zrzut: ME.6-okno.png

### ME.7 – LICZBY → AU-9
- Stan: rok+przelewy, `me-przelewy`.
- Zachowanie zgodne: „mBank → Portfel XTB 31.10, 400,00 zł: strona konta Portfel XTB zapisana też osobno (31.10) – liczy się
  dwa razy.” i „mBank → Portfel XTB 01.11, 250,00 zł: zapisany tylko na koncie mBank – saldo konta Portfel XTB go nie ma.”
  (przyciski „Pokaż”, „zostaw tak”, „Połącz” / „Dopisz drugą stronę”); jednostronny Gotówka → Portfel z 10.10 (przed
  potwierdzeniem Portfela 20.10) – bez meldunku. „Połącz” – Portfel 5 168,89 → 4 768,89 zł (kwota liczona raz), toast
  z „Cofnij”; „Pokaż” – edytor „Przelew bez pary”; „Dopisz drugą stronę” – Portfel 4 768,89 → 5 018,89 zł, toast z „Cofnij”.
- Odczyt: `op.jsonl` (ME.7). Zrzut: ME.7-meldunki.png

### ME.8 – UWAGA
- Stan: rok+op (`me-sygnaly`, + ponowne uruchomienie); sygnał kategorii – rok+op + WETERYNARZ AZOR 620 zł 02.11
  (`me-sygnal-kategorii`).
- Widać: cztery rodzaje – „ZABKA Z1234 95,00 zł (01.11) – zwykle do 33,57 zł.”, „Zwierzęta: 620,00 zł w tym miesiącu –
  2,2× średniej z 3 miesięcy (284,58 zł).”, „Nowy kontrahent: SALON ROWEROWY KOŁO 450,00 zł (01.11).”, „Dwa obciążenia
  z banku: BOLT.EU 23,40 zł – możliwe podwójne pobranie (sprawdź; nie są łączone).”; odprawa na Mostku – sygnały z 14 dni
  (MEDIA EXPERT z 24.09 tylko w Meldunkach); filtr „nietypowa” – 11 operacji ze znaczkiem „NIETYPOWA”; ramka w edytorze
  „NIEZNANY SYGNAŁ NA RADARZE … To w porządku”; „to w porządku” w Meldunkach i w edytorze – toast „Zapamiętane: to
  w porządku.” z „Cofnij” (przywraca ramkę); po ponownym uruchomieniu zapamiętane nie wracają; BOLT.EU nie jest w panelu
  duplikatów ani scalony.
- UWAGA (sprzeczne komunikaty): ten sam wiersz banku zapisany dwa razy (ROSSMANN 112, KEBAB ROMA, SKYCASH PARKING 28.10)
  jest naraz „3 możliwe duplikaty – ta sama operacja dwa razy. Scal…” i „Dwa obciążenia z banku: ROSSMANN 112 34,99 zł –
  możliwe podwójne pobranie (sprawdź; nie są łączone).” – jeden meldunek każe scalić, drugi mówi, że to dwa obciążenia.
- Odczyt: `op.jsonl` (ME.8). Zrzuty: ME.8-sygnaly.png, ME.8-kategoria.png

### ME.9 – poza laboratorium (Kto: Maszyna)

### ME.10 – ZGODNE
- Stan: rok+salda, `me-salda`.
- Widać: „mBank: saldo potwierdzone 31 dni temu – sprawdź z bankiem.” i „Portfel XTB: saldo bez potwierdzenia od salda
  otwarcia z 01.09.2025 (428 dni) – sprawdź z bankiem.”; nic dla „Konto oszczędnościowe” (29 dni), Gotówki i konta
  zarchiwizowanego. „Potwierdź saldo” – Ustawienia, zakładka „Konta”; potwierdzenie mBanku (69 747,04 zł) – toast „mBank:
  saldo zgodne z operacjami (69 747,04 zł).”, w Meldunkach zostaje tylko Portfel XTB.
- Zrzut: ME.10-salda.png

## Znaleziska
- ME.3 (N) – „Pokaż zakupy” przy „<osoba>: do oddania …” (i ta sama linia na Mostku) otwiera wszystkie zakupy wszystkich
  domowników z całej historii (68–71, w większości oddane) zamiast zakupów tej osoby do oddania.
- UWAGA ME.8 – ten sam wiersz banku zapisany dwa razy jest jednocześnie „możliwym duplikatem – scal” i „dwoma
  obciążeniami – nie są łączone”.
- UWAGA ME.3 – wyjaśnienie „po co meldunek” tylko pod 5 z 13 sekcji.

## Spostrzeżenia
- **Spójność „Cofnij”** – „to w porządku”, „zostaw tak” mają toast z „Cofnij”; „to nie powtórzenie” (podwójne korekty)
  zdejmuje meldunek bez toastu i bez „Cofnij”.
- **Para przelewów po samej kwocie i dniu zaznaczona domyślnie** (ME.6) – ostrzeżenie jest, ale bezpieczniej byłoby ją
  odznaczyć, skoro żadna strona nie wskazuje konta.
- **Folder przed kreatorem z saldem otwarcia** (ME.1) – meldunki „bez kategorii” i „salda” dla historii od salda
  otwarcia; zgodne z banerem („Budżet liczy się na razie od salda otwarcia”), ale użytkownik przed kreatorem dostaje już
  zadania z dawnej historii.
- **Przyciski działające od razu** – przy pojedynczym przelewie „Połącz” i „Dopisz drugą stronę” wykonują zmianę bez
  podglądu (tylko toast z „Cofnij”), a przy parach jest okno z listą – dwa różne wzorce dla tej samej czynności.
- **Problemy laboratorium** – brak. Licznik duplikatów liczony z opóźnieniem (10 s po starcie) – skrypty czekają 12 s.
