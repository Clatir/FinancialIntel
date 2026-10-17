# Financial Intel – plan etapów

Wersja 1.0 (rdzeń + klimat) = E0–E4, około 18–22 h czystej pracy Claude'a. Każdy etap kończy się działającym .exe.
Szacunek nie obejmuje testowania przez użytkownika.

| Etap | Zakres | Model · thinking | Czas | Przygotuj |
| --- | --- | --- | --- | --- |
| E0 Fundament | repozytorium, stos, CI, instalator i portable, aktualizacje, folder danych (zapis, historia, konflikty, kopie), zasobnik i autostart, menu boczne, puste ekrany, szkielet ustawień | Opus 5.5 · high | 3–4 h | puste repo, dostęp do `Clatir/TradingJournal` |
| E1 Model i silnik | schematy rekordów, kwoty w groszach, `calc/fleet.ts` z testami, konta i kategorie, ekran Operacje | Opus 5.5 · xhigh | 4–5 h | — |
| E2 Import mBank | parser CSV, kreator importu, duplikaty, reguły kategorii, kategoryzacja grupowa, przelewy, potwierdzanie sald | Opus 5.5 · high | 3–4 h | przykładowy CSV z mBanku (zanonimizowany) |
| E3 Start i plan miesiąca | kreator startu, Plan miesiąca, Ładownia, odkładki, przydział, debriefing z podziałem łupów | Opus 5.5 · high | 4 h | — |
| E4 Mostek i szybki wpis → 1.0.0 | Mostek, szybki wpis ze skrótem, cisza nocna, dziennik kapitański, do zwrotu, podział paragonu, zasobnik z energią, ukrycie kwot, powiadomienia, dźwięki | Opus 5.5 · high | 4–5 h | — |
| E5 ICTTJ i dokowanie | odczyt ICTTJ z obserwacją zmian, okno dokowania, dopasowanie konta, pule Cele i Podatek, przypomnienie o brakującym wpisie w ICTTJ, firewall, Mapa gwiezdna, przycisk „Otwórz ICTTJ” | Opus 5.5 · xhigh | 4 h | ścieżka folderu ICTTJ, zanonimizowana kopia `payouts/` do testów |
| E6 Radar i należności | Radar 90 dni z przypomnieniem o PIT-38, pożyczki z harmonogramem, należność od domu, przypomnienia | Opus 5.5 · high | 3 h | — |
| E7 Dowództwo | rozkazy, ocena i zamrażanie dni, seria, stopnie, degradacja, klasy, misje, osiągnięcia, dziennik wachty | Opus 5.5 · xhigh | 4 h | akceptacja listy misji i osiągnięć |
| E8 Wywiad i raporty | krzywa majątku z BOS / CHoCH, Killzones, FVG, Daily Bias, odprawa z odsłuchem, raporty, eksporty, smaczki ICT | Opus 5.5 · high | 5–6 h | — |
| ~~E9 Pierwszy oficer~~ | wypada – bez asystenta AI (D74) | – | – | – |

## Gotowe, gdy

**E0 Fundament**
- Instalator i wersja portable instalują się i startują na Windows 11; CI (Linux + Windows) zielone.
- Pierwsze uruchomienie: wybór lub utworzenie folderu danych; `fi.json` z `schemaVersion`.
- Zapis atomowy, historia `.history/`, konflikty, kopie codzienne – przeniesione z ICTTJ, z testami `tests/fs`.
- Start z Windows ukryty w zasobniku (przełącznik), jedna instancja, logi.
- Aktualizacja z GitHub Releases działa (test jak w ICTTJ; repozytorium publiczne – D61).
- Wygląd = tokeny ICTTJ; menu boczne i puste ekrany z panelami (zwijanie, powiększanie, odłączanie, układy).

**E1 Model i silnik**
- Schematy zod wszystkich rekordów z `specyfikacja.md`, migracje gotowe na przyszłość.
- `calc/fleet.ts` przechodzi testy na przykładach:
  - dokowanie 5 000 zł przy osłonach 8 640 / 12 000 i kadłubie 15 000 / 21 900 → osłony +3 360, kadłub +1 640,
    cele 0; zasięg przy kosztach 3 650 zł: 6,5 → 7,8 mies.;
  - pensja 4 000 zł przy osłonach 2 500 zł → 2 500 z osłon + 1 500 z kadłuba, żółty alarm;
  - odkładka OC 1 240 zł rocznie → 11 × 103,33 zł + 103,37 zł;
  - dzienny przydział: przeniesienie niewydanej energii i zmniejszenie po przekroczeniu;
  - zakup „do zwrotu” nie zmienia energii; zwrot zamyka należność, nadwyżka wpłaty dokuje jako przychód;
  - wypłata z puli Cele → cele; z puli Podatek → poza kosztami.
- Ekran Operacje: dodawanie, edycja z historią, usuwanie z „Cofnij”, filtry, wyszukiwanie; konta i kategorie
  w ustawieniach.

**E2 Import mBank**
- Zanonimizowany plik użytkownika w `tests/fixtures/` importuje się bez błędów (kodowanie Windows-1250 / UTF-8).
- Duplikaty z wpisami ręcznymi łączone (kwota, data ±3 dni, kontrahent), z podglądem przed zapisem.
- Reguły kategorii uczą się z decyzji; kategoryzacja grupowa historii po kontrahencie.
- Przelewy własne, do / z XTB i od domowników rozpoznane; kopia przed importem.
- Potwierdzanie sald mBanku i Portfela XTB z wpisem korekty.

**E3 Start i plan miesiąca**
- Kreator od pustego folderu do działającego budżetu (konta, historia, pensja, cele warstw, podział środków).
- Plan miesiąca: ładownia, odkładki, koperty planowe i codzienne, dzienny przydział.
- Ładownia: linia zanurzenia, ostrzeżenie i symulacja zasięgu.
- Debriefing: podział łupów, domyślnie osłony po 7 dniach, „Miesiąc zamknięty na plus”.

**E4 Mostek i szybki wpis (wydanie 1.0.0)**
- Mostek z panelami stanu okrętu, kopert, należności i ostatnich operacji.
- Globalny skrót otwiera szybki wpis w mniej niż sekundę; wpis z podglądem energii, ciszą nocną, dziennikiem,
  „do zwrotu” i podziałem paragonu.
- Zasobnik z energią dziś; tryb ukrycia kwot (także w dymku).
- Powiadomienia z przełącznikami (odprawa, wieczorne dopisanie, limity, import, salda); dźwięki w ustawieniach.
- Wydanie 1.0.0 na GitHub Releases.

**E5–E8** – kryteria spisujemy w komunikacie „Przed etapem N”, na podstawie `specyfikacja.md`.

## Szablon „Przed etapem N”
1. **Co trzeba wiedzieć** – zakres etapu, stan poprzednich, rzeczy otwarte.
2. **Co musisz powiedzieć** – pytania z propozycją, odbiór poprzedniego etapu.
3. **Co przygotować** – pliki, klucze, ustawienia, testy po Twojej stronie.
4. **Model, thinking, szacunek czasu.**
