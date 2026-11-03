# Audyt funkcjonalny 1.15.4 – stan raportu po blokach A i B (03.11.2026)

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
