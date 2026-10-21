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

## Wersja na iPhone'a (D92)

Telefon czyta i zapisuje ten sam folder danych na OneDrive (Microsoft Graph, kopia w telefonie – działa bez sieci) i jest
dla folderu kolejnym komputerem. Logika `src/shared` wspólna z Windows – te same liczby. Opakowanie iOS: Capacitor (ten
sam React, TypeScript i Vite); `.ipa` budowane w GitHub Actions na macOS, instalacja przez AltStore (IP-A1). Czas = praca
Claude'a, bez testów użytkownika na telefonie.

**Numeracja funkcji (IP…)**

| Nr | Co | Czas | Grupa |
| --- | --- | --- | --- |
| IP0.1 | Dostęp do OneDrive przez Microsoft Graph: pierwsze pobranie folderu, potem tylko zmiany, zapis z wykryciem konfliktu z PC, kopia w telefonie | 4–5 h | iA |
| IP0.2 | Opakowanie iOS (Capacitor), budowanie `.ipa` w GitHub Actions, źródło AltStore, instrukcja instalacji | 1–1,5 h | iA |
| IP0.3 | Układ pod telefon: dolne menu, przyciski i pola pod palec | 0,5–1 h | iA |
| IP0.4 | Powiadomienia lokalne, planowane przy każdym otwarciu | 0,5 h | iA |
| IP0.5 | Konflikt z PC: telefon zachowuje obie wersje, wybór na PC (Synchronizacja) | 0,5 h | iA |
| IP1 | Szybki wpis (tagi, „za domownika”, wspólne finansowanie) | 0,5–1 h | iA |
| IP2 | Mostek: stan okrętu, odprawa, Daily Bias, „skąd ta liczba?” | 0,5–1 h | iA |
| IP3 | Operacje: lista, filtr, wyszukiwanie | 0,5 h | iB |
| IP4 | Operacje: edycja podstawowa (kwota, data, kategoria, notatka, tagi, finansujący) | 0,5 h | iB |
| IP5 | Meldunki, część: bez kategorii, anomalie, zwroty, potwierdzenie salda | 0,5 h | iB |
| IP6 | Plan miesiąca – podgląd | 0,25–0,5 h | iB |
| IP7 | Radar – podgląd | 0,25–0,5 h | iB |
| ~~IP10~~ | ~~Import z mBanku~~ – zostaje na PC (D92) | – | – |
| IP11 | Operacje pełne: przelew obiema stronami, zmiana zaznaczonych, zapisane widoki, eksport | 1,5–2 h | iC |
| IP12 | Meldunki – wszystkie (pary przelewów, duplikaty) | 1 h | iC |
| IP13 | Plan miesiąca – edycja: pensja, koperty, łupy, „pokryj z koperty…”, plan kampanii | 1,5–2 h | iC |
| IP14 | Radar – edycja: pożyczki, spłaty, boje, „Zaplanuj przelew własny” | 1–1,5 h | iC |
| IP15 | Dokowanie z ICTTJ (tylko gdy folder danych ICTTJ jest na OneDrive – do decyzji przed iD) | 1,5–2 h | iD |
| IP16 | Ładownia – pełna | 1,5 h | iD |
| IP17 | Mapa gwiezdna – pełna | 1 h | iD |
| IP18 | Dowództwo | 1 h | iE |
| IP19 | Wywiad | 1,5–2 h | iE |
| ~~IP20~~ | ~~Raporty z PDF i eksportem~~ – zostają na PC (D92) | – | – |
| IP21 | Kreator startu (propozycja: bez niego – budżet startuje na PC; do decyzji przed iE) | 1 h | iE |
| IP22 | Ustawienia (bez folderu i kopii) | 1,5–2,5 h | iE |
| ~~IP23~~ | ~~Synchronizacja pełna~~ – zostaje na PC (D92) | – | – |
| IP24 | Zapisy w tle z telefonu (zamrażanie dni gry, cele ICTTJ) – do decyzji przed iE | 0,5–1 h | iE |

Ograniczenia iOS (IP-L): L1 bez globalnego skrótu, zasobnika, autostartu, folderu Pobrane i odłączanych paneli; L2
powiadomienia z danych ostatniego otwarcia; L4 pierwsze pobranie dużego folderu – kilka minut; L5 synchronizacja wymaga
sieci (bez niej – kopia w telefonie); L6 test na iPhonie po stronie użytkownika (Claude – symulator i WebKit).

**Grupy**

| Grupa | Zakres | Model · thinking (z górką) | Czas | Z górką | Wydanie |
| --- | --- | --- | --- | --- | --- |
| iA Okręt w kieszeni | IP0.1–IP0.5, IP1, IP2 | Opus 5.5 · max | 7,5–10,5 h | 11 h | 1.13.0 |
| iB Wachta | IP3–IP7 – wersja towarzysząca gotowa | Opus 5.5 · max | 2–2,5 h | 3 h | 1.14.0 |
| iC Dziennik i kurs | IP11–IP14 | Opus 5.5 · max | 5–6,5 h | 7 h | 1.15.0 |
| iD Ładownia i gwiazdy | IP15–IP17 | Opus 5.5 · max | 4–4,5 h | 5 h | 1.16.0 |
| iE Dowództwo | IP18, IP19, IP21, IP22, IP24 | Opus 5.5 · max | 5,5–7,5 h | 8 h | 1.17.0 |
| | **Razem** | | **24–31,5 h** | **34 h** | |

**iA – gotowe, gdy**
- `Financial-Intel.ipa` w wydaniu 1.13.0 (z `SHA256SUMS.txt`) instaluje się przez AltStore i startuje; CI Linux,
  Windows i macOS zielone; aplikacja na Windows działa jak wcześniej.
- Logowanie kontem Microsoft, wybór folderu danych na OneDrive, pierwsze pobranie z postępem; po zamknięciu i bez sieci
  aplikacja otwiera się z kopii w telefonie.
- Szybki wpis z telefonu trafia do folderu jako zwykła operacja i FI na PC ją pokazuje; zmiana z PC dochodzi do
  telefonu po odświeżeniu.
- Mostek pokazuje te same liczby co PC przy tych samych danych (ten sam silnik, test na wspólnym folderze).
- Ta sama operacja zmieniona na PC i na telefonie – nic nie przepada: obie wersje, wybór w Synchronizacji na PC.
- Telefon widoczny na PC jako komputer folderu (obecność); powiadomienia lokalne (energia, koperty, wieczorny raport).

**iB–iE** – kryteria spisujemy w komunikacie „Przed grupą”.

## Szablon „Przed etapem N”
1. **Co trzeba wiedzieć** – zakres etapu, stan poprzednich, rzeczy otwarte.
2. **Co musisz powiedzieć** – pytania z propozycją, odbiór poprzedniego etapu.
3. **Co przygotować** – pliki, klucze, ustawienia, testy po Twojej stronie.
4. **Model, thinking, szacunek czasu.**
