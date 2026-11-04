# Raport – znaleziska z przygotowania (AU-1, AU-2)

Wersja 1.15.4 z GitHub Releases (rozpakowany instalator, SHA-256 zgodne), laboratorium `C:\FI-audyt`, 03.11.2026.
Znaleziska spoza listy punktów, które wyszły przy budowie laboratorium i persony.

### P.1 – NIEZGODNE (W): Operacje zawieszają okno, gdy gra trwa dłużej niż ok. 105 dni
- Stan: folder z `settings.game.start` sprzed 110 dni – dowolny, także bez żadnej operacji, kontenera ani celu (sam
  `fi.json`). 100 dni – dobrze, 110 dni – błąd; tak samo przy drugim otwarciu, gdy dni gry są już zamrożone.
- Zrobione: otwarcie folderu → Mostek (działa) → Ctrl+2 (Operacje). Inne ekrany (Ctrl+1, 3–9, 0) bez błędu.
- Widać: okno całkowicie puste (bez menu bocznego); w konsoli okna „Minified React error #185” (Maximum update depth
  exceeded) i „Błąd widoku: …”. Kolejne skróty (Ctrl+1, Ctrl+3) już niczego nie pokazują – okno trzeba zamknąć.
- Oczekiwane: lista operacji (spec „Ekrany” – Operacje) niezależnie od długości gry.
- Skutek dla użytkownika: każdy folder dochodzi do tego progu ok. 3,5 miesiąca po starcie gry (gra od 1.2.0) – wtedy
  główna lista przestaje działać. Ryzyko wysokie, bez utraty danych.
- Odtworzenie: `tests/audyt/operacje-petla.spec.ts` (dziś przypadek 110 dni pada, 100 dni przechodzi).
- Zrzuty: `AF-operacje-petla-110.png`, `AU2-operacje-petla.png`.

### P.3 – kandydat (do potwierdzenia w IM.23 / DM): „reszta jako zaliczka” w imporcie nie spłaca długu
- Stan: persona `rok`. Import historii, grupa „MAREK TESTOWY” (wpływ) → opcja „Od domownika: Marek – reszta jako
  zaliczka”. Potem wpłacie 360 zł z 14.09 wskazany zakup „EVENTIM” 360 zł z 20.08 (pole `covers`, jak „Przypisz zwrot…”).
- Widać na Mostku: „Marek: do oddania 360,00 zł – najstarszy zakup z 20.08 (75 dni)”. W pliku wpłata ma
  `inflowKind: advance` – cała idzie do depozytu, bilety zostają nieoddane, choć wpłata je wskazuje; depozyt pokrył
  dopiero późniejszy zakup (Media Expert, część Marka 300 zł).
- Oczekiwane (spec „Rozliczenia z domownikami”, D80 b, D91): wpłata domownika najpierw wyrównuje to, co ma oddać
  (wskazane zakupy), dopiero reszta to zaliczka – tak też brzmi etykieta opcji („reszta jako zaliczka”). 1.15.3
  („niezależne wpłaty”, bez decyzji D) zmieniło znaczenie opcji – sprzeczność do rozstrzygnięcia przez użytkownika.

### P.2 – spostrzeżenie: zapisy w tle czekają na ruch w oknie
- Komputer jest „w użyciu” (D86) dopiero po ruchu myszy albo klawiatury w oknie albo po fokusie. Okno otwarte z zasobnika
  bez dotknięcia nie zamraża dni gry ani nie dopisuje celów ICTTJ. Zgodne z D86; do sprawdzenia w maszynie, czy
  użytkownik może przez to widzieć nieaktualną ocenę dnia (RY / DW).
