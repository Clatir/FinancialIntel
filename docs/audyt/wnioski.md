# Wnioski z audytu funkcjonalnego Financial Intel 1.15.4 (AU-11, krok 4)

- **Data:** 03.11.2026. Opus 5.5 · xhigh (D97). Audyt niczego nie naprawia, a te wnioski służą do zaplanowania grup
  naprawczych i rozwojowych (krok 5 – osobno).
- **Podstawa:** `raport.md` (80 AF, sekcje 3–6), `raport/WERYFIKACJA-1…5.md`, `raport/WERYFIKACJA-FABLE.md` (druga
  opinia dla 10 AF), raporty obszarów (sekcje „Spostrzeżenia” – tu „sp. n”), `LICZBY-AB.md`, `LICZBY-C.md`,
  `wyrocznia.md`, `C:\FI-audyt\wnioski\konkurencja.md`, `docs/specyfikacja.md`, `docs/decyzje.md` (D74, D84, D86, D88,
  D95–D97), `docs/przeglad/` (F1–F43), `CHANGELOG.md` (1.15.2–1.15.4).
- **Wagi końcowe (po Fable):** **K 4** (AF-1, AF-2, AF-4, AF-8) · **W 6** (AF-3, AF-7, AF-9, AF-12, AF-26, AF-27) ·
  **S 25** · **N 35** · ODRZUCONE 4 · WYMAGANIE 6. Fable podniosła wagę AF-8 z W do K i AF-12 z S do W. KR.16 i T129 to
  błędy techniczne, a nie pytania do Ciebie. Wagi są zgodne z `raport.md` w stanie z 03.11, godz. 22:12.
- **Bez raportu maszyny i bez „Tylko Ty”**: wnioski, które od nich zależą, zbiera sekcja 6. iPhone jest poza audytem
  (D97).

**Najważniejsze**
- Silnik pieniędzy liczy zgodnie ze swoimi regułami: we wszystkich 814 odczytach żadna kwota nie różni się od wyroczni.
  Granicy ICTTJ aplikacja nie przekroczyła ani razu (sumy SHA-256 bez zmian w 24 przebiegach DO i W5 oraz w PM, DM, MG
  i RA). Plan miesiąca nie ma żadnego znaleziska NIEZGODNE (PM 0 z 30).
- Złe kwoty i utrata danych biorą się z dwóch źródeł. Pierwsze to drogi wokół silnika: import (AF-1, AF-8, AF-9, AF-26,
  AF-27) i folder danych (AF-2, AF-3). Drugie to reguły, które wyrocznia liczy tak samo jak aplikacja: T129 (AF-4) i
  płatność sprzed startu (AF-12).
- Najczęstszy wzorzec to aplikacja, która coś robi albo odrzuca bez słowa (ok. 20 miejsc). Do tego niespójne „Cofnij” i
  ekrany, które liczą tę samą rzecz inaczej niż silnik (plan, kurs, odprawa, „do zadokowania”).
- Dwie zapowiedzi z CHANGELOG 1.15.2 nie istnieją w kodzie (AF-7, AF-37), a dwie zmiany zachowania weszły bez decyzji D
  (1.15.3 – S4, N-PC-19 – S5).
- Kryteria sukcesu są spełnione częściowo: liczba dnia i plan działają, a słabe miejsca to odprawa bez hierarchii, gra po
  przerwie i opłaty po terminie.

## 1. Kryteria sukcesu ze specyfikacji

**Cztery problemy**

| Problem | Ocena | Dowody z audytu | Co brakuje |
| --- | --- | --- | --- |
| Nie wiadomo, ile można dziś wydać | **częściowo** (zwykły dzień – tak) | energia dziś = wyrocznia w każdym odczycie (wariant T295, S6); „Skąd ta liczba?” (F29), podgląd w szybkim wpisie; Daily Bias zgodny (WY.1, WY.2) | przy pensji częściowej albo 0 Mostek pokazuje „Energia dziś 71,42 zł” obok „Energia miesiąca 0,00 zł” (PM sp. 1, MO sp. 5); zwrot dawnego zakupu podnosi energię dziś (MO sp. 6); odprawa ma 15–24 pozycji bez hierarchii (MO sp. 1) → AP-13, AP-16 |
| Nieregularne wypłaty z tradingu utrudniają planowanie | **częściowo** (rdzeń spełniony) | pensja od siebie, osłony, kadłub, podział: PM 21 ZGODNE i 0 NIEZGODNE; dokowanie DO – 21 z 23 ZGODNE; Kurs na 12 mies., średnie przychodów (WY.17, WY.18) | AF-12 (W – pierwsza pensja niższa o 1 240 zł), AF-46 / T163 (liczby skaczą przy „Zadokuj”), AF-47 (wpis z pierwszych 3 dni nigdy nie dokuje), AF-7 (nie ma „Wycofaj dokowanie”), AF-32 (kurs bez pensji częściowej) |
| Pieniądze z tradingu mieszają się z prywatnymi | **spełnione** | 0 zapisów w folderze ICTTJ (DO.23, W5); Portfel XTB jako konto budżetu; pula Podatek poza budżetem (MO, DO); firewall działa (DW) | fałszywy alarm firewalla przy zwrocie z puli Podatek (AF-46); kadłub nigdy nie bywa pełny, więc każda dopłata łamie firewall (MO sp. 3, DW sp. 4 → AP-17); dopłata wykryta tylko z mBanku nie wymaga potwierdzenia (DO sp. 12) |
| Wydatki nie są śledzone | **częściowo** | szybki wpis (SW: 14 ZGODNE; z 14 punktów liczb 1 zgodny, a 13 zgodnych z wariantem), import (IM: 34 z 53 ZGODNE), F14 (plik z Pobranych), Meldunki | import ma 2 znaleziska K (AF-1, AF-8) i 3 W (AF-9, AF-26, AF-27); szybki wpis gubi wpisaną kwotę bez słowa (AF-17, AF-19); wpis z „Zapisano.” trafia do folderu-widma (AF-2, K) |

**Cztery kryteria po 3 miesiącach**

| Kryterium | Ocena | Dowody z audytu | Co brakuje |
| --- | --- | --- | --- |
| Codziennie jedna liczba: ile mogę dziś wydać | **częściowo** | jak wyżej; liczba jest na Mostku, w szybkim wpisie, w odprawie i w Raportach; zgodna co do grosza na dwóch komputerach (DA.33) | AP-13 (liczba nie większa niż energia miesiąca), AP-16 (odprawa: liczba ginie wśród 15–24 pozycji); odłączona Odprawa zabiera liczbę z okna (MO sp. 9); po przerwie ponad 100 dni okno pada z błędem #185 (AF-6, S); dymek zasobnika – maszyna |
| Osłony i kadłub rosną z miesiąca na miesiąc | **częściowo** (mechanizm tak, pomiar trendu nie; na prawdziwych danych audyt tego nie oceni – D97) | warstwy = salda w każdym odczycie; dokowanie według D13 zgodne; krzywa majątku netto (F24, WY.3) | złe kwoty w warstwach: AF-4 (K – osłony −700 zł), AF-8 (K – depozyt zamiast spłaty), AF-26 (W), AF-46 (−300 zł do dokowania); cel kadłuba rośnie razem ze średnimi, więc kadłub nigdy nie jest pełny (MO sp. 3); zmiana celów warstw bez podglądu skutku (MO sp. 4); nie ma widoku „osłony + kadłub miesiąc po miesiącu”, bo krzywa to suma kont z pieniędzmi pożyczonymi i depozytem, a zasięg pokazuje tylko stan „teraz” (RY.23) → AP-31 |
| Żadna opłata okresowa ani PIT-38 nie zaskakuje budżetu | **częściowo** | Ładownia, odkładki, Radar 90 dni i PIT-38 bez kwoty (RY.23) – zgodne; rata wyrównawcza w silniku dobra (LA.8 – silnik) | zaległa opłata znika 1. dnia nowego miesiąca (AF-50), termin od 28.–29. dnia nigdy nie dostaje stanu „po terminie” (AF-80); jedna opłata ma dwa terminy (AF-15); fałszywa „nowa cena” +100 % (AF-45); plan przyszłych miesięcy pokazuje złą ratę (AF-44); fałszywa asteroida „dziś” po starcie (AF-12); prądu co 2 miesiące aplikacja nie proponuje (AF-13) → AP-10, AP-11; powiadomienia 14 i 3 dni przed terminem – maszyna |
| Aplikację otwiera się z przyjemnością, bez przymusu | **częściowo** (ostatecznie ocenisz Ty) | gra = wyrocznia w 59 dniach (stopień, seria, misje, osiągnięcia); szybki wpis w 11–13 klawiszy (SW.36); wygląd jak ICTTJ (IN – 19 ZGODNE) | odprawa ok. 1,5 min odsłuchu (MO sp. 1); 10 powiadomień Windows naraz przy starcie (US sp. 1); „darmowy awans” po przerwie (DW sp. 1, DW.37); „Nowa klasa” świętuje skutek importu (DW sp. 6); czerwony bilans miesiąca po 3 dniach (RY sp. 6); „Plan przekracza pensję” zaraz po starcie (KR sp. 5); teksty z kodami decyzji, datami ISO i komunikatami po angielsku (AF-55, AF-66, DA sp. 2) → AP-14, AP-16, AP-23 |

## 2. Ścieżki kapitana

Kroki policzone w laboratorium; „≈” oznacza szacunek z przebiegów. Tarcia są uszeregowane od najcięższych.

| Ścieżka | Kroki | Tarcia (dowody) | Gdzie łatwo się pogubić | Niesprawdzone |
| --- | --- | --- | --- | --- |
| **Pierwsze uruchomienie** | ekran folderu (3 wybory, KR.1) → baner → kreator w 7 krokach (salda i domownicy → import historii → pensja i warstwy → ładownia i koperty → ICTTJ i cele → podział → nazwa, rozkazy, skrót, autostart); import 14 miesięcy to „Przyjmij pewne (25)” i ok. 50 decyzji grupowych (KR sp. 10) – ≈ 80–100 działań; gra rusza od jutra (KR.32) | AF-12 (W – OC zapłacone przed startem), AF-10 (osłony 20 100 zł w kroku 6, a po starcie 13 400 zł – brakuje pierwszej pensji), AF-11 (powrót banerem kasuje odpowiedzi), AF-14 (folder z atrybutem R), AF-13 (propozycje ładowni), AF-47 (wpis ICTTJ z pierwszych 3 dni); KR sp. 3 (bez historii energia 0,00 zł i brak kopert), KR sp. 5 (od razu „Plan przekracza pensję”), KR sp. 6 (przerwanie bez potwierdzenia, ślady zostają), KR sp. 9 (cele ICTTJ w kolejności listy, nie terminów); 10 powiadomień przy pierwszym starcie (US sp. 1) | krok 6 a Mostek po starcie (inne osłony); baner „Kreator startu” w trakcie kreatora zaczyna go od nowa; 75 decyzji importu w jednym kroku | wariant bez OneDrive (KR.1); instalacja (SY.*); dźwięk (KR.33 – Ty) |
| **Zwykły dzień** | odprawa (1 ekran, 15–24 pozycji) → zakupy szybkim wpisem (skrót + 11 / 13 / 21 klawiszy na zakup, 45 na trzy – SW.36) → wieczorne przypomnienie 21:00 (1 klik: „Dziś bez wydatków” albo dopisanie); ≈ 1–2 min dziennie | AF-2 (K – folder zniknął, a szybki wpis mówi „Zapisano.”), AF-3 (W – zmiana kwoty ginie po Ctrl+1), AF-17 (ujemna kwota znika bez słowa), AF-19 (Esc porzuca kwotę, „×” ją zachowuje), AF-20, AF-22 i OP sp. 1 („plan czy impuls?” przy zakupie domownika, czynszu i bankomacie), SW sp. 6 (10 × Tab do „plan”), SW sp. 3 (domownik „pytaj” nie jest pytany), MO sp. 6 (zwrot podnosi energię dziś), RY sp. 1 („Dziś bez wydatków” mimo wydatku z dziś), MO sp. 2 (ta sama sprawa w dwóch pozycjach) | dwie liczby energii (dziś i miesiąca) przy pustej pensji; odprawa bez hierarchii; odłączona Odprawa | dymek zasobnika, przełom dnia (MO.4), odprawa po ciszy nocnej (MO.16, RY.3), globalny skrót (SW.2), wieczorne powiadomienie (RY.17) – maszyna |
| **Tydzień** | import co 2–3 dni: plik w Pobranych → 1 klik (F14) → podgląd → decyzje nowych grup (≈ 0–10) → „Importuj”; Portfel XTB: Ustawienia → Konta → „Potwierdź saldo” (ME.10); raport wachty w niedzielę (1 ekran); ≈ 5–15 działań | AF-1 (K – historia, potem lista: usunięta operacja wraca), AF-26 (W – decyzja zbiorcza zmienia spłatę pożyczki w zwrot paliwa i powtarza to w każdym kolejnym imporcie), AF-27 (W – „w tym za”), AF-9 i IM sp. 2 (konto importu „klei się” do poprzedniego pliku), AF-28, AF-29, AF-31 (Inwentaryzacja „0 z 3”); RY sp. 2 / AF-68 (dwie definicje „bieżącego” tygodnia); IM.30 / IM.31 (okno „Cofnij import” straszy zmianami, których nie było); SA sp. 2 (wpisane saldo znika po zmianie ekranu) | które konto wybrać do pliku; „rozliczone inaczej” bez zmiany kwoty (IM sp. 8); którego tygodnia dotyczy raport | niedziela, powiadomienie o saldach, raport wachty (etap 3), czas importu 2000 operacji (lab 31–43 s, CHANGELOG 1.4.3: ok. 3 s) |
| **Przełom miesiąca** | pensja z osłon sama 1. dnia → debriefing (1 ekran) → podział łupów do 7. dnia (3 pola; potem trafiają do osłon, zmiana możliwa i później – N-PC-16) → plan następnego miesiąca (propozycja kopert, poprawki); ≈ 3 ekrany i 5–15 działań | AF-50 i AF-80 (zaległa opłata znika, termin od 28.–29. dnia bez stanu „po terminie”), AF-44 (plan liczy ratę nominalną), AF-24 (przesunięcie daty przez granicę miesiąca), RY sp. 3 (późny import zmienia podział łupów z 200 / 300 / 303,48 na 0 / 59 / 0 bez słowa w Raportach), RY sp. 6 (czerwony bilans miesiąca w toku), PM sp. 4 (debriefing października na stronach przyszłych miesięcy), PM sp. 2 („Kurs przechwycenia” znika), PM sp. 7 (powiadomienia w kolejności wstecz) | definicje „na plus” (S2) i łupów (S3); który miesiąc pokazuje prawa kolumna Planu | cały etap 5 maszyny (PM.14, PM.19, PM.20, RY.18, PR.11) |
| **Rok** | przegląd roczny w styczniu (1 ekran) → eksport CSV / Excel / PDF (2–3 pliki) → PIT-38 (przypomnienie do 30.04, bez kwoty) → opłaty roczne z odkładek; ≈ 5–10 działań | AF-34 (pierwszy rok: miesiące sprzed historii jako „0,00 zł”, napis „31.12 roku wcześniej”), AF-69 (stopa bez miejsca po przecinku), RY sp. 5 („bez długu” myli; cel osiągnięty i zarchiwizowany nie jest wymieniony), AF-45 (płatność roczna wcześniej niż 14 dni przed terminem → fałszywa podwyżka), AF-35 (eksport bez kwot części paragonu), RE sp. 3 (daty w XLSX jako tekst), DA.11 (rotacja kopii 14 + 8 nieopisana) | suma kategorii w Excelu przy paragonach dzielonych; „Asteroida rozbita” (S10) | przypomnienie o przeglądzie rocznym (RY.25), cały etap 6 maszyny |
| **Powrót po 2 tygodniach** | otwarcie → po 3 min aplikacja sama zamraża 14 dni bez danych jako zgodne (DW.37: seria 36 → 50, „12 / 30” → „26 / 30”) → import (1–2 pliki, decyzje) → oceny dni zostają, a budżet się przelicza (łupy 2 524,42 → 21,75 zł) → odprawa z zaległymi sprawami; ≈ 4 ekrany | DW sp. 1 („darmowy awans” bez ostrzeżenia – jest tylko „mBank: ostatni import 17 dni temu”), DW sp. 2 (misja z datą sprzed 2 miesięcy), AF-50 (opłata z poprzedniego miesiąca znika), MO sp. 1 (sprawy sprzed miesięcy obok dzisiejszych), US sp. 1 (powiadomienia naraz), DA sp. 5 (najstarszy „Cofnij import” przepada po 10 paczkach); po przerwie ponad 100 dni AF-6 (#185, mija po restarcie) | kolejność „najpierw import, potem zamrażanie” – aplikacja jej nie wymusza ani nie podpowiada; łupy rozdzielone w tym czasie same do osłon | P sp. 2 (zapisy w tle czekają na ruch w oknie) – maszyna |
| **Nowy komputer** | instalacja → „Otwórz istniejące” (DA.2: 1 wybór, 1034 wpisy, folder bez zmian) → ustawienia komputera od nowa: folder ICTTJ, skrót, autostart, ukrycie kwot, token (19 przełączników powiadomień jest domyślnie włączonych – US.16); ≈ 3 ekrany, 5–10 działań; dwa komputery: baner „w użyciu” (DA.34), scalanie co do grosza (DA.32, DA.33) | AF-41 (ODRZUCONE, ale realne: ekran brakującego folderu nie ponawia przed pierwszą synchronizacją OneDrive), US.1 (panele nie mówią, że dotyczą tylko tego komputera), SW sp. 8 (ostatnie konto pamięta komputer, nie folder), DA sp. 3 (konflikty jako nazwy plików z ULID), AF-75, AF-42; incydent 03.11 – aplikacja zapisuje autostart z `config.json` przy każdym starcie | które ustawienia trzeba podać jeszcze raz; czego dotyczy karta konfliktu | instalacja, aktualizacja, restart, odinstalowanie (SY.*, etapy 1 i 7); DA.6, DA.37 – Ty |

## 3. Luki

### a) Obiecane, a niezrobione

| Luka | Gdzie obiecane | Stan w 1.15.4 | Dalej |
| --- | --- | --- | --- |
| „Wycofaj dokowanie” na Mostku | CHANGELOG 1.15.2, D95 N-PC-2 | brak – tylko „Cofnij” w toaście przez ok. 6 s (AF-7, W) | AP-9 |
| Usuwanie nieużywanych kategorii | CHANGELOG 1.15.2, D95 N-PC-7 | brak – tylko archiwizacja (AF-37, S) | AP-9 |
| Pole kwoty „obok checkboxa celu” | CHANGELOG 1.15.2, N-PC-3 | funkcja jest (DO.6 ZGODNE), ale okno ma same pola kwot – opis niezgodny | sprostowanie (AP-9) |
| N-PC-4 (ochrona przeniesień przy zmianie rodzaju), N-PC-14 (oczyszczanie `covers`) | D95 („20 poprawek wdrożonych”) | brak punktu w audycie – nie sprawdzono | AP-9 |
| Odprawa o ustalonej godzinie z powiadomieniem | D84 C9 | brak – tylko „przy pierwszym otwarciu po ciszy nocnej” (US.16); spec i T56 mówią to samo | sekcja 5 |
| Rozkazy tylko w Ustawieniach (edycja w Dowództwie wykreślona) | D84 C9 | Dowództwo pozwala je edytować (T227 / N73, US.8) | sekcja 5 |
| „+ także za X” z kwotą tego, co X ma oddać | D81 | kwota startuje od 0, przy wierszu nie działa (AF-27, W) | AP-7 |
| Odpowiedź „pytanie raz, potem zapamiętane” znaczy to, co mówi jej etykieta | D80 b, D91 | od 1.15.3 „reszta jako zaliczka” działa jak „całość jako zaliczka” (AF-8, K); domownik „pytaj” nie jest pytany (SW sp. 3) | AP-4, AP-19 |
| Zwrot do masy z puli Podatek bez firewalla | T65 | przed „Zadokuj” pojawia się alarm, naruszenie i −300 zł (AF-46; T163) | AP-12 |
| Wypłata bez pary przez 3 dni → Portfel XTB | spec „Dokowanie”, D72, T63 | wpis z pierwszych 3 dni budżetu „sprzed startu” – dokowanie nie pojawi się nigdy (AF-47) | AP-26 |
| „Po terminie” 3 dni po terminie | D86 (F1) | termin od 28.–29. dnia nigdy nie dostaje tego stanu (AF-80) | AP-10 |
| Pensja częściowa i czerwony alarm | spec „Pensja od siebie” | Kurs na 12 mies. nie ma miesięcy z pensją częściową (AF-32) | AP-18 |
| Stopa oszczędności z jednym miejscem po przecinku | T294 | „55%”, „32%” (AF-69) | AP-23 |
| „Opuszczenie ekranu nigdy nie gubi zmian” i „usunięcia mają Cofnij” | konwencje projektu (CLAUDE.md) | AF-3, AF-11, SA sp. 2; AF-29, AF-60, AF-77 | AP-8, AP-22 |
| Słowo „firma” nie występuje; animacje 120–160 ms | spec, konwencje | AF-72, AF-73 | AP-23 |
| Import 2000 operacji w ok. 3 s | CHANGELOG 1.4.3 | w obciążonym laboratorium 31–43 s (do pomiaru w maszynie) | AP-35 |
| Kalibracja progów gry po pierwszym miesiącu | spec „Kwestie otwarte” | ani w decyzjach, ani w postępie nie ma śladu | pytanie 12 |
| Zmiany widoczne dla Ciebie tylko z decyzją | zasada współpracy (CLAUDE.md) | 1.15.3 „niezależne wpłaty” (S4) i N-PC-19 (S5) bez wpisu D | AP-9, sekcja 5 |

### b) Wynikające z audytu (wzorce)

| Wzorzec | Ile miejsc | Przykłady | AP |
| --- | --- | --- | --- |
| Ciche odrzucanie i ciche skutki | ok. 20 | AF-17, AF-19, AF-21, AF-33 (pole), AF-36, AF-38, AF-79; „12,345”, „1.200”, „2,5” (PR sp. 6); limity długości (OP sp. 4, OP.27, DW sp. 7); US.9, US.33, RE sp. 5 | AP-15 |
| Ekran liczy inaczej niż silnik | 8 | AF-4 (cel), AF-44 (plan), AF-32 i AF-33 (kurs, symulator), AF-46 i AF-48 („do zadokowania”), AF-15 (termin w odprawie), AF-24 (podgląd) | AP-3, AP-10–AP-12, AP-18 |
| Ta sama liczba różna na dwóch ekranach | 7 | AF-15, AF-16, AF-33, AF-51, AF-57, AF-70, MO.7 | AP-32 |
| Dostępność folderu i tryb tylko do odczytu | 8 | AF-2 (K), AF-42, AF-41, AF-14, AF-39, AF-75, US.31, DA sp. 6 | AP-1 |
| Niespójne „Cofnij” i potwierdzenia | 10 | AF-29, AF-60, AF-77, ME sp. 1, IM sp. 10, KR.30, IN sp. 8, AF-7 (6 s), DA sp. 5 | AP-22 |
| Import: tożsamość wiersza i reguły, które rozlewają błąd | 6 | AF-1, AF-9, AF-28 (dwa formaty, dwa konta); AF-26, AF-8 (reguła utrwala zły wybór) | AP-2, AP-4, AP-6 |
| Domownicy w grze, dzienniku i listach | 10 | AF-22, AF-23, AF-58, AF-62, AF-16, AF-20, SW.12, SW sp. 9, DM sp. 4, 6, 7 | AP-19 |
| Gra a dane | 5 | zamrożenie przed importem (DW sp. 1), AF-6, AF-46 (naruszenie zamarza), DW sp. 6, AF-31 | AP-14, AP-30 |
| Odprawa i powiadomienia bez hierarchii | 6 | MO sp. 1, 2, 7, US sp. 1, RY sp. 4, PM sp. 7 | AP-16 |
| Teksty techniczne | ok. 25 | daty ISO (AF-55), kody decyzji (AF-66), ENOENT / EBUSY / zod po angielsku (DA sp. 2), ULID w konfliktach (DA sp. 3), „1.0”, „3 pensji”, „w listopad” | AP-23, AP-27 |
| Obietnice wyprzedzają kod | 4 | AF-7, AF-37, N-PC-3; 1.15.3 i N-PC-19 bez D | AP-9 |

### c) Wobec współczesnych aplikacji budżetowych

Pominięte: funkcje już zrobione (F1–F31, F33–F37, F40, F42 – m.in. tagi, wykrywanie opłat cyklicznych, prognozy,
symulator, widoki, Meldunki) i odrzucone w D88 (F32, F38 – razem ze skanowaniem paragonów, F39, F41, F43). Ceny i część
funkcji w źródle są niezweryfikowane (`konkurencja.md`, p. 0).

| Luka | Kto ma | Po co w FI | Nakład | Kolizja z zasadami FI | AP |
| --- | --- | --- | --- | --- | --- |
| Widżet „energia dziś” na iPhonie, ekran blokady | Copilot, YNAB, Monarch | kryterium 1 na telefonie | M–L | brak (WidgetKit, nie moduł Node) | AP-39 |
| Blokada Face ID / PIN | standard w aplikacjach mobilnych | telefon trzyma dane i token Graph | S–M | **spec „bez blokady”** – potrzebna decyzja | AP-40 |
| Plan spłaty długów (lawina / kula śnieżna); konto karty kredytowej z cyklem wyciągu | Monarch Goals 3.0, YNAB; Actual (mapa drogowa) | raty, karty, „kup teraz, zapłać później” | M / M–L | karta: średnia (silnik „suma warstw = salda”) | AP-41 |
| Kalendarz-siatka miesiąca z saldem dnia | Monarch, Lunch Money | szybsze przeglądanie niż lista Radaru | S–M | brak | AP-42 |
| Kreator mapowania dowolnego CSV | YNAB (14.09.2026), Actual | drugi bank, Revolut | M | brak | AP-43 |
| Prognoza wieloletnia (3 scenariusze) | PocketSmith, Monarch, Actual | cel „Flagowiec” i oszczędności za 12 mies. | M (Monte Carlo – L) | blisko F32 (D88) – pytanie | AP-44 |
| Reguły I / LUB, wyrażenia, reguły dla wpisów ręcznych | Actual, Firefly III | mniej ręcznych poprawek | M | brak | AP-45 |
| Sankey miesiąca | Monarch, Actual | „skąd i dokąd” dostawy | S–M | T294 (techniczna) | AP-46 |
| Opis formatu folderu, skrypt / CLI | Firefly III, Actual CLI | własne narzędzia | S | brak (bez AI – D74) | AP-47 |
| Kwota w walucie (informacyjnie) | Lunch Money, Firefly III | wyjazdy | S–M | „tylko PLN” – bez zmiany silnika | AP-48 |

**Nie robić:** synchronizacji bankowej PSD2 (narusza zasadę „sieć tylko do aktualizacji”, D74 i spec; mBank nie ma API
dla klienta), asystenta AI i kategoryzacji AI (D74), pełnej wielowalutowości (kwoty tylko w PLN), szyfrowania E2E (spec
„bez szyfrowania”, nakład L), wspólnej edycji (model „jeden komputer w użyciu”), lokalizacji kontrahenta (F41,
prywatność), motywów (wygląd ICTTJ), wieku pieniędzy (dubluje zasięg) ani importu z innych aplikacji.
**Gdzie FI jest mocniejszy** (`konkurencja.md`, p. 4): jedna liczba dnia z rozbiciem, warstwy z pensją od siebie, praca
offline bez obcej chmury, rozliczenia z domownikami, gra i rytuały, integracja z ICTTJ, brak abonamentu. Propozycje AP
mają te przewagi wzmacniać, a nie zastępować.

## 4. Propozycje AP

**Priorytet:** wysoki – grupa naprawcza przed iD; średni – druga grupa naprawcza albo razem z iD / iE; niski – rozwojowe,
przy okazji. **Nakład:** S – jedna funkcja albo jeden ekran z testem; M – kilka plików albo silnik pieniędzy (max, D96);
L – nowy moduł albo kilka etapów. Czas w godzinach poda krok 5. Kolejność wysokich – według Fable i kryteriów sukcesu.

| AP | Problem (dowody) | Propozycja | Po co | Nakład | Konflikt z decyzją | Priorytet |
| --- | --- | --- | --- | --- | --- | --- |
| AP-1 | folder znika w trakcie pracy, a „Zapisano.” trafia do folderu-widma (AF-2 K, AF-42, AF-14, AF-39, AF-75, AF-41) | zapis nigdy nie tworzy korzenia; przed paczką zapisów i co kilka sekund w spoczynku aplikacja sprawdza `fi.json` – gdy go nie ma, baner „Folder niedostępny”, a zapisy czekają i wznawiają się same; brak korzenia nie znaczy „usunięty na innym komputerze”; „Zapisano.” dopiero po zapisie; tryb tylko do odczytu rozpoznany próbą zapisu przy otwarciu; ekran brakującego folderu ponawia co 30 s; meldunek o folderze-widmie | nic nie ginie z „Zapisano.” – aplikacja żyje tygodniami w zasobniku | M | T248 / T192 / B53 – rozszerzenie (nowa T) | **wysoki** |
| AP-2 | usunięta operacja wraca, przeniesiony import robi duplikaty (AF-1 K, AF-9 W, AF-28, AF-63, IM sp. 2, IM sp. 12) | operacje usunięte zapamiętane z opisem i parowane miarą B5 (z `altKeys`); B5 sprawdza wszystkie konta tego samego rachunku; import naprawczy proponuje „usuń duplikat” zamiast „przenieś”; konto importu wybierane po numerze rachunku; meldunek dla operacji, które już wróciły | import nie zmienia sald bez słowa | M | brak (realizuje T39, T134) | **wysoki** |
| AP-3 | przeniesienie środków celu działa w silniku dopiero na koniec dnia (AF-4 K, AF-48 część, MG sp. 4, MG.4) | przeniesienie liczone w chwili zapisu (`at`) razem z operacjami dnia – nowa T w miejsce „na koniec dnia” z T129; ostrzeżenie przy przeniesieniu do celu już pełnego; notatka wydania: dni z przeniesieniami przeliczą się inaczej | cel płaci tyle, ile pokazuje ekran (T131, D13) | M (max) | T129 (techniczna – zmiana bez pytania) | **wysoki** |
| AP-4 | „reszta jako zaliczka” działa jak „całość jako zaliczka” (AF-8 K, AF-16, MG sp. 6, IM sp. 4) | opcja = spłata i reszta do depozytu; `optionOf` rozróżnia oba znaczenia; reguła z `advance` nie powstaje z tej opcji; w imporcie jedna nazwa wyboru; przy osobie widać naraz dług i zaliczkę; naprawa danych: wpłaty `advance` ze wskazanym zakupem spłacają go (deterministycznie), pozostałe – meldunek „wpłaty X nie spłaciły długu – spłacić?”, a reguły z `advance` do przeglądu | długi maleją, depozyt = suma przy osobach | S + M (dane) | S4 – tylko dla jawnej „zaliczki na przyszłość” (1.15.3 bez D); część techniczna od S4 nie zależy | **wysoki** |
| AP-5 | opłata zapłacona przed startem odkładana drugi raz (AF-12 W, PM sp. 8) | cykl z połączoną płatnością z miesiąca startu w oknie terminu jest zapłacony (T135), więc liczy się rata następnego cyklu; kreator (kroki 3–4, „do planu”) korzysta z tej samej funkcji; znika fałszywa asteroida „dziś” | dobra energia pierwszego miesiąca | M (max) | brak (T135, T45 / T220) | **wysoki** |
| AP-6 | decyzja zbiorcza i reguła zabierają spłaty pożyczek (AF-26 W, AF-62, AF-64) | pożyczka z Radaru, PIT-38, XTB i domownik rozpoznawane przed regułą innego rodzaju tej samej nazwy; decyzja zbiorcza liczy takie wiersze jako „nie pasuje”; „Reguły importu → niespójne” wskazuje reguły na nazwisko pożyczkobiorcy i operacje do poprawy | błąd jednego kliknięcia nie powtarza się w kolejnych importach | M | brak (T90, T167 / N14) | **wysoki** |
| AP-7 | „+ w tym za X” w imporcie (AF-27 W, D91 b, DM sp. 1–2) | decyzja wiersza nie znika w trakcie wpisu; kwota startowa = to, co X ma oddać (D81); w grupie udział rozkładany po kolei, nigdy ponad należność; pewne dopasowanie wiąże się samo także przy podziale na osoby | dobre salda domowników | M | brak (D81, D91) | **wysoki** |
| AP-8 | wpisana zmiana ginie przy zamknięciu albo zmianie ekranu (AF-3 W, AF-11, SA sp. 2, DA sp. 4) | zmiana czekająca na „Zmień mimo to” liczy się jako niezapisana – pytanie przy zamknięciu podaje prawdziwą przyczynę, a opuszczenie edytora pokazuje pytanie; kreator: „Wróć do kreatora” z odpowiedziami jako szkicem (po restarcie – M); wpisane saldo banku też jako szkic | konwencja „opuszczenie ekranu nigdy nie gubi zmian” | S–M | brak | **wysoki** |
| AP-9 | zapowiedzi 1.15.2 bez kodu i zmiany bez D (AF-7 W, AF-37, N-PC-3; 1.15.3, N-PC-19) | „Wycofaj dokowanie” w oknie zadokowanej dostawy i w wierszu panelu (usuwa dokowanie i operację Portfela, z „Cofnij”); „Usuń” kategorię bez odwołań (operacje, części, plany, reguły, kontenery, boje, szablony), z „Cofnij”; sprawdzić N-PC-4 i N-PC-14; sprostować CHANGELOG 1.15.2; od teraz każda linia CHANGELOG ma test e2e albo punkt odbioru, a zmiana widoczna dla Ciebie – wpis D | notatki wydania mówią prawdę | S + M | brak (realizuje D95) | **wysoki** |
| AP-10 | opłaty: dwa terminy, znikające zaległości, fałszywe podwyżki (AF-15, AF-50, AF-80, AF-45, AF-43, LA sp. 2, 5, 6, 8, RA sp. 1, 2, 4; W2 – pole „Płatność”) | odprawa bierze termin z tego samego stanu co Ładownia i Radar; niezapłacony poprzedni termin zostaje „po terminie” do zapłaty (także terminy 28.–31.); płatność ponad 14 dni przed terminem zamyka bieżący cykl, gdy poprzedni jest zamknięty (T135); podpowiedź raty uwzględnia stan zbiornika; alarm „za mało w zbiorniku” także w debriefingu; boja zamyka się operacją o tej samej nazwie, a nie tylko kwocie | kryterium 3 | M | F1 / T208 („w bieżącym miesiącu”) wobec D86 / D4 – sekcja 5 | **wysoki** |
| AP-11 | plan przyszłych miesięcy pokazuje inne raty niż silnik (AF-44, AF-52 / C20, AF-51; W5 – „Kurs przechwycenia” rośnie, niesprawdzone) | `plan.ts` bierze raty z tej samej funkcji co silnik (wyrównanie w trakcie cyklu; przy pensji 0 pobrane 0, rata wymagana obok i alarm); kontener raty pożyczki z kwotą z harmonogramu (reszta w ostatniej) | plan = to, co się stanie | S | C20 (T29 milczy), T72 – dopisać | **wysoki** |
| AP-12 | dostawa „do zadokowania” liczona zwykłą kolejnością (AF-46, AF-48, DO sp. 1, 4, MG sp. 1, PR sp. 2) | silnik dostaje pary z `deliveries` i od razu liczy je według puli wpisu (Podatek – rezerwa bez firewalla, Cele – do celów); panel pokazuje „do zadokowania” osobno; wąski wariant – sam zwrot z puli Podatek (S) | bez fałszywych naruszeń, które po 7 dniach zamarzają w grze | M (max) | T163 wobec T65 – sekcja 5 | **wysoki** |
| AP-13 | energia dziś większa niż to, co zostało w miesiącu (S6, PM sp. 1, MO sp. 5, MO sp. 6, PM sp. 6) | energia dziś = min(przydział według T295, pozostała energia miesiąca) z dopiskiem „pensja częściowa”; zwrot dawnego zakupu do puli pozostałych dni, nie do dziś (do decyzji); „Pokryj z koperty…” pokazuje skutek dla energii dziś | kryterium 1 | S (max) | T30 / T295, Z4 – nowa decyzja | **wysoki** |
| AP-14 | gra po przerwie i zamrażanie (AF-6, DW sp. 1, DW.37, DW sp. 2, 6) | zamrażanie porcjami w osobnych zadaniach (AF-6, S); przy imporcie zaległym ponad 3 dni pytanie przed zamrożeniem („zaimportuj najpierw / zamroź bez danych”) albo wstrzymanie, najwyżej o 7 dni (jak T163); „Nowa klasa” nie świętuje skutku importu; panel misji bez daty z przeszłości | uczciwy stopień – kryterium 4 | S + M | T9, D86 – wstrzymanie to zmiana reguły, potrzebna decyzja | **wysoki** |
| AP-15 | ciche odrzucanie (AF-17, 19, 20, 21, 25, 36, 38, 79; SW sp. 1, PR sp. 6, OP sp. 4, OP.27, US.9, US.33, US sp. 8, DW sp. 5, 7, RE sp. 5) | zasada: każde odrzucenie i każde przycięcie ma komunikat przy polu (w szybkim wpisie – stopka); Esc działa jak „×” (szkic zostaje); Esc cofa w polach liczbowych; „od” po „do” – zamiana z komunikatem; pusty eksport – „Brak operacji w okresie”; limity długości z licznikiem; zapis 0 zł z ostrzeżeniem | nic nie zmienia się bez słowa – AF-38 zmienia cele warstw | M (wiele drobnych S) | brak (ta sama klasa co B24) | **wysoki** |
| AP-16 | odprawa i powiadomienia bez hierarchii (MO sp. 1, 2, 7, US sp. 1, RY sp. 4, PM sp. 7, AF-67, DW sp. 3) | odprawa: alarmy → sprawy dnia → reszta zwinięta („pokaż wszystkie N”), sprawy starsze niż 30 dni tylko w Meldunkach; jedna pozycja na sprawę; odsłuch = skrót (energia, bias, najważniejszy alarm); przy starcie jedno zbiorcze powiadomienie zamiast 10; odprawa przed innymi powiadomieniami; poważne naruszenia na czerwono | kryteria 1 i 4 | M | T214 (rozszerzenie skrótu); D84 C9 – sekcja 5 | **wysoki** |
| AP-17 | kadłub nigdy pełny, więc firewall zawsze łamany (MO sp. 3, DW sp. 4, DW.12, MO sp. 4, MO.22 b) | nadwyżka osłon dopełnia kadłub, gdy jego cel urośnie (albo akcja „dopełnij kadłub z osłon”); kadłub w 99 % celu liczy się jako pełny dla firewalla i „wolnego do decyzji”; podgląd skutku zmiany celów warstw; komunikat, gdy firewall jest wyłączony | firewall i „wolne do decyzji” znów coś znaczą (problem 3, kryterium 2) | S–M (max) | spec „Dokowanie” (nadwyżka płynie tylko przy dostawie), D13 – decyzja | **wysoki** |
| AP-18 | Kurs i symulator liczą inaczej niż Mostek (AF-32, AF-33, PR sp. 8, WY sp. 3, WY.15) | kurs uwzględnia pensję częściową i nie schodzi poniżej zera z osłon; „teraz” w symulatorze = Mostek albo podpis „po resztce miesiąca”; „wyczyść manewr” czyści wszystko; daty pełności przy warstwie już pełnej | prognoza zgodna z regułami | S | brak | średni |
| AP-19 | domownicy w grze, dzienniku i listach (AF-22, AF-23, AF-58, OP sp. 1, SW sp. 3, SW.12, SW sp. 9, DM sp. 4, 6, 7, 9, R-17) | „plan czy impuls?” i próg liczone od mojego udziału; bez pytania przy czynszu, racie, bankomacie i kontenerze; domownik „pytaj” bez wartości domyślnej; „Pokaż zakupy” z filtrem osoby; spójne komunikaty o spłacie salda na start (Mostek, Radar, Meldunki); dziennik kapitański z kwotą własną | mniej zbędnych pytań | S–M | D80 b (zgodnie), R-17 | średni |
| AP-20 | szybki wpis wymaga za dużo klawiszy (SW.36, SW sp. 5–8, 10, 11, OP sp. 10, WY.13) | „plan / impuls” pod kwotą albo klawisz P / I (21 → ok. 12 klawiszy); tagi z „#” widoczne przed zapisem, wyraźny przycisk usuwania; aliasy kontrahentów, nazwy z banku bez „DATA TRANSAKCJI” i bez samych wielkich liter; ostatnie konto zapamiętane w folderze; treść dziennika w Wywiadzie | szybszy wieczorny wpis | S–M | wygląd – Twoja ocena (`ty.md` p. 25) | średni |
| AP-21 | „#wakacje-chorwacja” i „Wakacje Chorwacja” to dwie wyprawy (AF-18) | `tagKey` traktuje „-” i „_” jak spację (istniejące tagi połączą się same) | jeden koszt wyprawy | S | T291 (techniczna) – sekcja 5 | średni |
| AP-22 | „Cofnij” i potwierdzenia niespójne (AF-29, AF-60, AF-77, ME sp. 1, IM sp. 10, KR.30, IN sp. 8, LA sp. 7, DA sp. 5, IM.30, IM.31) | każde usunięcie, rozłączenie i zrzut z toastem „Cofnij”; działania nieodwracalne (Kosz, przerwanie kreatora) z potwierdzeniem; jeden wzorzec potwierdzenia; „Cofnij import” uprzedza o rotacji 10 paczek; okno cofania liczy tylko Twoje zmiany | przewidywalność | S–M | brak (konwencja) | średni |
| AP-23 | teksty techniczne (AF-55, AF-66, AF-69, AF-71–AF-73, DA sp. 2, KR sp. 8, US sp. 3, MG.3, DO sp. 10, IN.19, WY sp. 2, 5, 6, MO.33, PR sp. 4, RY sp. 7, IM.1, DW.18) | daty dd.mm.rrrr; bez kodów decyzji i tekstów roboczych; komunikaty systemu po polsku (szczegół w logu), „zablokowany” zamiast „USZKODZONY”; odmiana liczebników; „1,0” z przecinkiem; stopa z jednym miejscem po przecinku (T294); słowniczek „Terminy ICT” i dymki przy wszystkich liniach Stanu okrętu; minus typograficzny | kryterium 4 | M (wiele drobnych S) | brak (terminy ICT zostają po angielsku, objaśnienia po polsku) | średni |
| AP-24 | debriefing, plan i przegląd roczny (AF-34, AF-54, AF-68, RY sp. 2, 3, 5, 6, PM sp. 2–5, 10, 12, WY.14, RY.25) | dla miesiąca w toku „miesiąc trwa” zamiast czerwonego bilansu; komunikat, gdy łupy przeliczył późny import; podpis debriefingu poprzedniego miesiąca na stronach przyszłych; jedna definicja „bieżącego” tygodnia; przegląd roczny: „brak historii”, „saldo otwarcia (data)”, wszystkie cele osiągnięte, „po odjęciu długu”; przypomnienie o przeglądzie w styczniu; pokrycia kopert w raporcie wachty; średnie koszty zawsze widoczne w „Pensji” | przełom miesiąca i rok bez zgadywania | M | R-19; tabela powiadomień w spec (dopisać przegląd roczny) | średni |
| AP-25 | kreator i pierwszy miesiąc (AF-10, AF-13, AF-53, KR sp. 3, 5, 6, 9, KR.14, ME sp. 3) | krok 6 z wierszami „pierwsza pensja do energii” i „depozyt domowników”, podział od stanu z początku dnia startu (R-4); bez historii – podpowiedź kopert codziennych; propozycje kopert dopasowane do pensji; „Przerwij” z potwierdzeniem i listą śladów; cele ICTTJ według terminów; rozpoznawanie rachunku zmiennego co 2 miesiące, bez harmonogramu dla ustałej subskrypcji; meldunki z historii dopiero po starcie | dobry start (dla Ciebie tylko przy nowym folderze) | M | T286 (sekcja 5), T47 / D70 | średni |
| AP-26 | dokowanie – stany i teksty (AF-47, DO sp. 3, 5, 6, 7, 9, 11, 12, 13, MO.7, PR sp. 2) | wpis z pierwszych 3 dni „czeka na import”; „czeka na import do …” z datą w przyszłości; toasty „Zmieniono podział” z właściwą kwotą; słowo „firewall” tylko przy naruszeniu; dopłata wykryta tylko z mBanku – meldunek do potwierdzenia (spec); zadokowane dostawy widoczne także przy wyłączonym ICTTJ; „ostatnia dostawa” dopiero po dokowaniu; jedna data dostawy | problem 2 | S–M | brak (D72, T63, T162; spec „potwierdzenie” firewalla) | średni |
| AP-27 | konflikty i historia nieczytelne (DA sp. 3, DA.22, 23, 27, 30, AF-76, SA sp. 3) | karta konfliktu z kontrahentem, datą i kwotą zamiast nazwy pliku z ULID; różnice nazwami pól po polsku, bez JSON; „Scal…” odmawia, gdy kopia zmieni się w trakcie | dwa komputery bez strachu | M | brak | średni |
| AP-28 | nowy komputer i ustawienia komputera (US.1, US.13, US.31, US.33, SW sp. 8, DA sp. 5, AF-40; incydent z autostartem 03.11) | panele oznaczone „tylko ten komputer”; po „Otwórz istniejące” lista „ustaw na tym komputerze” (ICTTJ, skrót, autostart, powiadomienia, token); baner „tylko do odczytu” na wszystkich zakładkach; „Co nowego” z CHANGELOG offline; lista kopii po zmianie folderu; zapis autostartu przy dwóch profilach – sprawdzić w maszynie | ścieżka „nowy komputer” | S–M | brak | średni |
| AP-29 | eksport nie pozwala sumować (AF-35 – ODRZUCONE, RE sp. 1, 3, PR sp. 5, AF-57, AF-70) | arkusz „Części” w Excelu i plik „Części – CSV” z kwotami części; daty w XLSX jako daty; okres eksportu zapamiętany; w „Miesiącach” energia miesiąca i kwoty sfinansowane; dopiski przy pasku Operacji (przelewy własne) i przy Przychodach 12 mies. | rok w Excelu | S–M | D89 / T303 – addytywnie, wiersz główny bez zmian | średni |
| AP-30 | gra – drobne (AF-31, AF-65, RY sp. 1, DW.18, WY sp. 1, DW sp. 5; „Cisza w eterze” to jednocześnie misja i osiągnięcie) | misja „Inwentaryzacja” liczona po dniu potwierdzenia; „Dziś bez wydatków” zalicza misję, a przy wydatku z dziś ostrzega; poprawne zakresy dat; jedna „Twoja killzone”; inna nazwa misji | uczciwa gra | S | D84 C11 (zgodnie), D73 (nazwa) | średni |
| AP-31 | nie widać, czy poduszka rośnie (WY.3, RY.23) | w Wywiadzie, debriefingu i przeglądzie rocznym „osłony + kadłub i zasięg” na koniec każdego miesiąca (12 mies.) ze strzałką m/m | **pomiar kryterium 2** | S–M | brak (stany liczone, nie zapisywane – T4) | średni |
| AP-32 | wyrocznia i spójność liczb (raport sek. 6: przegląd kodu wyroczni W1, S1–S4, C19 / R-15, C24; PR sp. 9) | poprawić wyrocznię, kopiować schematy spoza `src/`, uruchamiać ją na migawkach po każdej grupie silnika; test „ten sam stan – ta sama liczba na każdym ekranie” (depozyt = suma zaliczek, termin asteroidy, zasięg, eksport = pasek) | regresja grup naprawczych | S–M | brak | średni |
| AP-33 | konto Gotówka tylko maleje (OP sp. 7: −55,36 zł; IM.19) | wypłata z bankomatu jako przelew mBank → Gotówka, gdy konto Gotówka ma wpisy; w przeciwnym razie wydatek „Gotówka” (jak w spec) | bez podwójnego liczenia | M | spec „Konta budżetu”, D83 – decyzja | średni |
| AP-34 | Operacje, import i klawiatura (AF-56, AF-59, AF-61, AF-74, IN sp. 1–4, OP sp. 8, 9, ME sp. 2, 4, ME.8, IM sp. 5–9) | fokus uwięziony w palecie i oknach modalnych; Ctrl+N nie zeruje wyszukiwania; krótszy Tab od kwoty do kategorii; okres listy zapamiętany; „Mój filtr” z okresem; import: „(jak grupa)”, „Opłaty banku”, szukanie po rodzaju operacji, temat podpowiedzi bez łączenia różnych kategorii; para przelewów po samej kwocie niezaznaczona | ergonomia | M (drobne) | brak | niski |
| AP-35 | duży plik zamraża okno (AF-30, IM sp. 11) | parsowanie i plan w Web Workerze z postępem; najpierw pomiar w maszynie | wydajność | M | brak (Worker to nie moduł natywny) | niski (zależy od maszyny) |
| AP-36 | koszty miesiąca w toku z operacjami z przyszłą datą (C16, RE sp. 4) | koszty liczone do dziś, przyszłe osobno jako „zaplanowane” | spójność z Operacjami | S | luka – sekcja 5 | niski |
| AP-37 | „Wspólnie → procenty”: dwie reguły (AF-49 – ODRZUCONE, SW sp. 4) | edytor odmawia jak szybki wpis i ma przycisk „dopełnij ostatniej do 100 %” | jedna reguła | S | T156 (techniczna) | niski |
| AP-38 | podgląd zmian zbiorczych pokazuje tylko część skutku (AF-24 – WYMAGANIE, OP sp. 2) | w podglądzie także łupy i koperty miesiąca, z którego operacje wychodzą, cele i pary ICTTJ | brak niespodzianek | M | F11 / T265 – sekcja 5 | niski |
| AP-39 | — (konkurencja 2.15) | widżet iPhone „energia dziś” (ekran blokady) | kryterium 1 na telefonie | M–L | brak | średni (po iE) |
| AP-40 | — (2.11) | blokada Face ID / PIN na iPhonie | dane i token na telefonie | S–M | spec „bez blokady” – decyzja | średni (pytanie) |
| AP-41 | — (2.3, 2.4) | plan spłaty długów (lawina / kula śnieżna); konto karty kredytowej z cyklem wyciągu | raty i karty | M / M–L | karta: silnik – najpierw pytanie, czy używasz kart | niski |
| AP-42 | — (2.9) | kalendarz-siatka miesiąca na Radarze (energia dnia, terminy) | szybki przegląd | S–M | brak | niski |
| AP-43 | — (2.2) | kreator mapowania dowolnego CSV | drugi bank | M | brak | niski |
| AP-44 | — (2.7) | prognoza wieloletnia, deterministyczna, 3 scenariusze | horyzont ponad 12 mies. | M | blisko F32 (D88) – pytanie | niski |
| AP-45 | — (2.8) | reguły I / LUB i reguły dla wpisów ręcznych | mniej poprawek | M | brak | niski |
| AP-46 | — (2.5) | Sankey miesiąca (SVG) | obraz przepływów | S–M | T294 (techniczna) | niski |
| AP-47 | — (2.13) | opis formatu folderu i przykładowy skrypt odczytu | własne narzędzia | S | brak (D74 – bez AI) | niski |
| AP-48 | — (2.10) | informacyjne pole „kwota w walucie” przy operacji | wyjazdy | S–M | „tylko PLN” – silnik bez zmian | niski |

## 5. Sprzeczności wymagań – do decyzji użytkownika

Jedna linia na sprzeczność: wariant, który rekomenduję, i dlaczego. Aplikacja wszędzie wybiera konsekwentnie ten sam
wariant – „potwierdzić” znaczy: zmienić tekst spec albo decyzji, kodu nie ruszać.

| Id | Sprzeczność | Rekomenduję | Dlaczego |
| --- | --- | --- | --- |
| S1 | zasięg: przykład w spec „6,5” (zaokrąglenie) wobec T218 (obcięcie) | potwierdzić T218, w spec poprawić przykład na 6,4 | klasa nie rośnie przed czasem; tak liczy każdy ekran (symulator liczy inną wielkość – AF-33) |
| S2 | „miesiąc na plus”: koszty ≤ pensja (spec) wobec wyniku energii ≥ 0 (T178) | potwierdzić T178 | opłata pokryta z odkładki nie jest porażką miesiąca |
| S3 | łupy: niewydana energia (T28) wobec „niewydane z kopert” (spec) | potwierdzić T28 | to ta sama księga co energia; koperty planowe nie znikają z rachunku |
| S4 | wpłata domownika: najpierw spłata (spec, D80 b, D91) wobec 1.15.3 `inflowKind` (bez D) | wariant A: wpłata najpierw spłaca wskazane albo najstarsze zakupy; „niezależny przychód” i „zaliczka na przyszłość” jako jawne opcje z ostrzeżeniem, gdy osoba ma dług; wpisać D | D80 b i D91 to Twoje decyzje; depozyt = suma tego, co widać przy osobach (AF-16); część techniczna AP-4 od tego nie zależy |
| S5 | zakup nocny „plan” bez naruszenia (N-PC-19) wobec spec (każdy potwierdzony zakup to poważne naruszenie) | potwierdzić N-PC-19, wpisać D, poprawić spec | gra ma karać impuls, a nie zaplanowany zakup |
| S6 | energia dziś = przydział (spec, T30) wobec przydział − wydane dziś (T295) | potwierdzić T295 i dodać: nie więcej niż pozostała energia miesiąca (AP-13) | liczba ma mówić, ile jeszcze zostało na dziś, a nie zapraszać do wydawania pieniędzy, których nie ma |
| S7 | Daily Bias: co ma pierwszeństwo i z której chwili | potwierdzić: Bearish pierwszy, po wydatkach dnia | osłony pod minimum są ważniejsze niż dzień |
| S8 / S9 | ujemny przydział i koperta planowa w ocenie dnia | potwierdzić wariant B (dzień przekroczenia; ujemny przydział jak 0) | jedno przekroczenie = jedna kara |
| S10 | „Asteroida rozbita”: tylko opłata roczna czy każda okresowa | potwierdzić aplikację (każda okresowa), poprawić opis osiągnięcia | nagradza ten sam nawyk odkładania; bez zmian w kodzie |
| T163 / DO.5 / MG.12 | dostawa „do zadokowania”: pula dopiero z rekordem dokowania (T163) wobec „zwrot z puli Podatek bez firewalla” (T65) | liczyć parę od razu według puli wpisu (AP-12) | znikają fałszywe naruszenia i rozjazd z DOL; T65 jest bliżej spec |
| F1 / T208 / D86 / RA.4 | stan opłaty tylko „w bieżącym miesiącu” wobec „po terminie” 3 dni po terminie | D86 + D4: niezapłacony termin zostaje „po terminie” do zapłaty (AP-10) | „żadna opłata nie zaskakuje”; dziś czynsz płacony 30. dnia nie alarmuje nigdy (AF-80) |
| T286 / KR.19 | cykle 2 / 3 / 6 mies. tylko przy stałej kwocie; harmonogram 9 z 12 | rozpoznawać rachunek zmienny co 2 miesiące; nie proponować harmonogramu, gdy brakuje terminu miesięcznego | typowy prąd w Polsce; ustała subskrypcja to nie harmonogram |
| T291 / SW.26 | „-” ≠ spacja w kluczu tagu | „-” i „_” jak spacja (AP-21) | „#słowo” nie może mieć spacji, więc wyprawa z kilku słów zawsze się rozdwaja |
| F11 / T265 / OP.33 | podgląd „Przesuń datę” tylko dla bieżącego miesiąca | rozszerzyć o łupy i koperty miesiąca źródłowego (AP-38), niski priorytet | łupy widać na Mostku; najpierw ważniejsze naprawy |
| OP.40 | wydatek 0 zł bez kategorii trafia do meldunku | ostrzeżenie przy zapisie 0 zł i pomijanie 0 zł w meldunku | tak jak dziś dla części paragonu |
| T156 / DM.11 | procenty „Wspólnie”: edytor zapisuje, inne okna odmawiają | jedna reguła: odmowa z przyciskiem „dopełnij ostatniej” (AP-37) | jedno zachowanie w całej aplikacji |
| C14 | „Portfel XTB?” – zasięg pliku według ostatniego wiersza z banku | potwierdzić, dopisać T | zachowanie sensowne i spójne |
| C16 | koszty miesiąca w toku z operacjami z przyszłą datą | koszty do dziś, przyszłe osobno jako „zaplanowane” (AP-36) | jak w Operacjach; znika „grudzień 10,00 zł” w przeglądzie rocznym |
| C20 | odkładki przy pensji 0 | pobrane 0, rata wymagana obok, alarm „brak pensji”; plan = silnik (AP-11) | silnik już tak liczy – trzeba tylko, by plan mówił to samo |
| C21 | „Razem” rozliczeń jako suma zaokrąglonych części | potwierdzić | spójne z podziałem z resztą w ostatniej części (T3) |
| R-3 | koperty planowe w miesiącu startu liczą wydatki od 1. dnia | potwierdzić | ta sama analogia co T45 dla kopert codziennych |
| R-7 / R-8 | data „od” zaległej raty | potwierdzić termin raty („spóźniona od 04.09”) | mówi, od kiedy trwa dług |
| R-9 | masa ładunku – procent zaokrąglony czy dokładny | wyświetlać zaokrąglony, porównywać z linią dokładny | bez fałszywego „ponad linią” na granicy |
| R-16 | mediana stopy ze stóp zaokrąglonych | ze stóp dokładnych | zaokrąglać wynik, nie dane |
| R-17 | dziennik kapitański: kwota pełna czy własna | kwota własna | spójne z „sfinansowane przez domowników” |
| R-19 | przegląd roczny przed początkiem historii | „brak historii” i „saldo otwarcia (data)” (AF-34) | zera wyglądają jak dane |
| T47 / D70 | propozycje kopert „do 10 zł” | potwierdzić zaokrąglanie do najbliższych 10 zł | bez skutku dla pieniędzy |
| Z6 | raty pożyczki wziętej w kosztach netto | potwierdzić (zostają w kosztach) | kadłub ma pokryć realne raty w kryzysie |
| Z12 | misje minionych tygodni | potwierdzić (tylko tygodnie z działającą aplikacją) | gra startuje od dnia instalacji |
| D91 b | pewne dopasowanie wpłaty przy podziale na osoby | wiązać samo także przy podziale (AP-7) | jak przy jednej osobie |
| T28 (kolejność) | wydatek ponad energię: aplikacja bierze kadłub przed osłonami (PR sp. 9) | osłony, potem kadłub – najpierw sprawdzić na zwykłej kwocie | kadłub to fundusz awaryjny; zaobserwowane tylko przy 1 000 000 zł |
| N73 / D84 C9 / T227 | rozkazy edytowane w Dowództwie wobec D84 C9 („zostają w Ustawieniach”) | wrócić do D84 C9: w Dowództwie tylko odczyt z odnośnikiem | to Twoja decyzja, a progi gry zmienia się rzadko (przypadkowe zmiany – AF-38) |
| D84 C9 (odprawa) | odprawa o ustalonej godzinie wobec „przy pierwszym otwarciu” (spec, T56) | dodać opcjonalną godzinę, domyślnie „przy pierwszym otwarciu” | spełnia D84 C9 i nie zmienia dzisiejszego zachowania |
| D84 C4 / spec | kopie: 14 dziennych + 8 tygodniowych wobec „30 ostatnich” w spec | potwierdzić D84 C4, poprawić spec, opisać rotację w Ustawieniach | decyzja jest nowsza niż spec |
| Model gotówki | bankomat jako wydatek „Gotówka” (spec) wobec konta Gotówka (D83) | przelew mBank → Gotówka, gdy konto Gotówka ma wpisy (AP-33) | dziś konto Gotówka tylko maleje i grozi podwójne liczenie |
| Firewall – potwierdzenie (DO.17) | spec wymaga potwierdzenia, nie mówi gdzie | meldunek „dopłata wbrew rozkazowi – potwierdź” (AP-26) | dopłata wykryta tylko z importu dziś przechodzi bez kroku potwierdzenia |
| Zamrażanie po przerwie | T9 / D86 wobec „ocena z danych znanych wtedy” | pytanie przed zamrożeniem dni bez importu albo wstrzymanie najwyżej o 7 dni (AP-14) | bez „darmowego awansu” |
| Kadłub a nadwyżka osłon | spec: nadwyżka płynie tylko przy dostawie | nadwyżka osłon dopełnia kadłub, tolerancja 1 % (AP-17) | inaczej każda dopłata łamie firewall |

**Rozstrzygnięte w weryfikacji – do wiadomości, nie pytania:** T129 / MG.8–MG.10 (błąd reguły technicznej, AP-3 – W1
i Fable); KR.16 (błąd techniczny wobec T135, W – Fable; AP-5); C15 (błąd, AF-47); C24 (błąd wyroczni); S1 w symulatorze
(inna wielkość – AF-33).

**Pytania do Ciebie**
1. S4: czy jawna „zaliczka na przyszłość” może omijać dług osoby? Rekomenduję: tylko z ostrzeżeniem, a „reszta jako …”
   zawsze najpierw spłaca. Część techniczna AP-4 na tę odpowiedź nie czeka.
2. T163: czy liczyć dostawę „do zadokowania” od razu według puli wpisu? Rekomenduję: tak.
3. RA.4: czy zaległa opłata ma przechodzić na następny miesiąc jako „po terminie”? Rekomenduję: tak (D86, D4).
4. S6: czy energia dziś ma być ograniczona pozostałą energią miesiąca? Czy zwrot dawnego zakupu ma trafiać do kolejnych
   dni, a nie do dziś?
5. Po przerwie: czy przed zamrożeniem dni bez importu aplikacja ma pytać, czy wstrzymywać zamrażanie (najwyżej 7 dni)?
6. Kadłub: czy nadwyżka osłon ma go dopełniać i czy przyjąć tolerancję 1 % dla firewalla?
7. Rozkazy: tylko w Ustawieniach (D84 C9) czy także w Dowództwie (T227)? Odprawa o ustalonej godzinie (D84 C9) – zrobić
   czy wykreślić?
8. Gotówka: czy prowadzisz zakupy gotówką w FI (konto Gotówka), czy wystarczy wydatek „Gotówka” przy wypłacie z
   bankomatu?
9. Zbiorczo: czy potwierdzasz rekomendacje z tabeli dla S1, S2, S3, S5, S7, S8 / S9, S10, C14, C16, C20, C21, R-3, R-7 /
   R-8, R-9, R-16, R-17, R-19, T47, Z6, Z12, D91 b, T286, T291, OP.33, OP.40 i T156?
10. Czy grupy naprawcze z priorytetem wysokim (AP-1–AP-17) mają wejść przed iD? Szczegóły i czas poda krok 5.
11. Konkurencja: czy używasz kart kredytowych albo rat (AP-41)? Czy chcesz blokady Face ID na iPhonie, co zmienia
    zasadę „bez blokady” (AP-40)? Czy widżet „energia dziś” po iE (AP-39)? Czy prognoza wieloletnia nie wchodzi w
    odrzucone F32 (AP-44)?
12. Progi gry (30 z 35 dni, 20 % koperty, minimalne osłony): czy kalibrujemy je teraz na Twoich danych z ostatnich
    miesięcy (spec, „Kwestie otwarte”)?

## 6. Co może jeszcze zmienić wnioski

| Źródło | Czego dotyczy | Wnioski zależne |
| --- | --- | --- |
| Raport maszyny (etapy 1–7) | instalacja i aktualizacja, zasobnik, autostart, skrót, wieczór i noc, niedziela, terminy 14 i 3 dni, przełom miesiąca, rok dalej, restart | kryterium 1 (dymek zasobnika, przełom dnia – MO.4), kryterium 3 (LA.19, SY.18), ścieżki „tydzień”, „przełom miesiąca”, „rok”, „nowy komputer”; waga AF-30 i AP-35 (pomiar importu); AP-28 (autostart) |
| „Tylko Ty” (`ty.md`) | wygląd i ton (IN.25), ergonomia szybkiego wpisu (SW.36), odsłuch (MO.17, RY.4), dźwięki i animacje (DW.20, RY.21), Excel i wydruk (RE.6, RE.9, RE.10) | kryterium 4; AP-16, AP-20, AP-23, AP-29 |
| Druga opinia Fable – **uwzględniona** | 10 AF z W1–W3 | AF-8 W → K, AF-12 S → W (KR.16 nie jest już pytaniem), IM.10 zostaje W; kolejność napraw: AF-2, AF-1 (+ AF-9), AF-4 → AF-8 → AF-12 → AF-26 → AF-27 → AF-3 → AF-5 |
| Wyrocznia po poprawkach (AP-32) | W1, S1–S4 z przeglądu jej kodu, C19 / R-15 | testy regresji grup silnika pieniędzy; T28 (kolejność warstw) |

## 7. Plan dalej (AU-11, krok 5)

Grupy naprawcze po audycie – kolejność według wagi (K → W → S → N) i ryzyka, z tym, co wspólne w module. Czas = praca
Claude'a z testami, `/code-review` i E2E, bez testowania przez użytkownika; oparty na faktycznych czasach (grupy kończyły
się w 0,15–0,7 planu). Każda grupa: jeden PR i jedno wydanie (D67), poprawka z testem, który bez niej pada; po grupach
silnika – wyrocznia (po poprawkach AP-32) na migawkach audytu jako test regresji.

| Grupa | Wersja | Zakres (AP → AF) | Model · thinking (z górką) | Czas Claude'a | Przed startem |
| --- | --- | --- | --- | --- | --- |
| **N1 Dane i import** | 1.15.5 | AP-1 folder danych przed zapisem, bez folderu-widma (AF-2 K, AF-42, AF-14, AF-39, AF-41, AF-75); AP-2 jedna tożsamość wiersza banku między formatami i kontami (AF-1 K, AF-9 W, AF-28, AF-63); AP-8 zmiana czekająca na „Zmień mimo to” jako szkic (AF-3 W, AF-11); AP-6 pożyczka, PIT-38, XTB i domownik przed regułą i decyzją zbiorczą (AF-26 W); AP-7 „+ w tym za X” w imporcie (AF-27 W) | Opus 5.5 · xhigh; AP-6 i AP-7 (rozliczenia) – max | 2,5–4 h (z górką 4,5 h) | komenda |
| **N2 Silnik pieniędzy** | 1.15.6 | AP-3 przeniesienie środków celu w chwili zapisu – nowa T zamiast T129 (AF-4 K); AP-4 „reszta jako zaliczka” najpierw spłaca + naprawa zapisanych wpłat (AF-8 K, AF-16); AP-5 płatność sprzed startu zamyka cykl (AF-12 W); AP-9 „Wycofaj dokowanie”, usuwanie kategorii, sprostowanie CHANGELOG 1.15.2 (AF-7 W, AF-37); AP-11 plan = silnik (AF-44, AF-51); AP-12 dostawa według puli przed dokowaniem (AF-46, AF-48); AP-32 wyrocznia poprawiona i włączona jako regresja | Opus 5.5 · **max** (D96) | 3–4,5 h (z górką 5,5 h) | S4 (część AP-4 dla jawnej „zaliczki na przyszłość”), T163 (AP-12) |
| **N3 Opłaty, energia, gra** | 1.15.7 | AP-10 jeden stan opłaty: termin, zaległość, cena (AF-15, AF-50, AF-80, AF-45, AF-43); AP-13 energia dziś ograniczona energią miesiąca; AP-14 zamrażanie porcjami i pytanie po przerwie (AF-6); AP-17 osiągalny kadłub; AP-18 Kurs i symulator = Mostek (AF-32, AF-33); AP-30 gra – drobne (AF-31, AF-65); AP-31 trend poduszki | Opus 5.5 · xhigh; AP-13 i AP-17 – max | 2,5–3,5 h (z górką 4 h) | RA.4, S6, pytania AP-14 i AP-17 |
| **N4 Zasady interfejsu** | 1.15.8 | AP-15 każde odrzucenie z komunikatem; AP-22 „Cofnij” i potwierdzenia wszędzie; AP-23 teksty (daty, kody decyzji, angielskie komunikaty, format stopy – R-18); AP-16 odprawa z hierarchią | Sonnet 5.5 · high (Opus 5.5 · high przy logice) | 2–3 h (z górką 3,5 h) | – |
| **N5 Ścieżki i ergonomia** | 1.15.9 | AP-25 kreator i pierwszy miesiąc (AF-10, AF-13, AF-53); AP-19 domownicy w grze i dzienniku (AF-22, AF-23, AF-58); AP-20 szybszy szybki wpis; AP-21 tagi; AP-24 debriefing i przegląd roczny (AF-34, AF-54, AF-68); AP-26 dokowanie – stany i teksty (AF-47); AP-27 konflikty i historia; AP-28 nowy komputer; AP-29 eksport części; AP-33 gotówka; AP-34 Operacje i klawiatura; AP-36–AP-38 | Opus 5.5 · high (xhigh przy silniku) | 3–4,5 h (z górką 5 h) | odpowiedzi z sekcji 5 (zbiorczo) |
| Rozwojowe | po iE | AP-35 import w Web Workerze (po pomiarze w maszynie), AP-39 widżet „energia dziś”, AP-40 Face ID, AP-41 plan spłaty długów / karta, AP-42 kalendarz, AP-43 dowolny CSV, AP-44 prognoza wieloletnia, AP-45 reguły I / LUB, AP-46 Sankey, AP-47 opis formatu, AP-48 kwota w walucie | do ustalenia przy „Przed grupą” | do ustalenia | decyzje (AP-40, AP-41, AP-44) |

**Miejsce wobec iPhone'a (D92 / D93):** N1 → N2 → N3 przed iD – usuwają wszystkie K i W, a N3 porządkuje opłaty, które iD
przenosi na telefon (Ładownia, IP16); potem iD (1.16.0), N4, iE (1.17.0), N5, rozwojowe. N4 i N5 mogą iść przed iD, jeśli
wolisz najpierw komputer. Razem N1–N5: ok. 13–19,5 h (z górką ok. 22,5 h); iD i iE – według `docs/postep.md`.

**Pytania do użytkownika (przed N2 i N3; reszta zbiorczo przed N5):**
1. S4 – czy jawna „zaliczka na przyszłość” (1.15.3) może omijać dług osoby? (Propozycja: nie – wpłata najpierw spłaca, jak
   spec / D80 b / D91; „depozyt” tylko dla nadwyżki.) Część techniczna AP-4 (etykieta i spłata) nie czeka.
2. T163 – dostawa „do zadokowania” liczona od razu według puli wpisu ICTTJ? (Propozycja: tak – bez fałszywego firewalla.)
3. RA.4 – zaległa opłata przechodzi na następny miesiąc jako „po terminie”? (Propozycja: tak, aż do zapłaty.)
4. S6 – energia dziś ograniczona tym, co zostało w miesiącu? (Propozycja: tak, z dopiskiem „pensja częściowa”.)
5. AP-14 – po przerwie: pytać przed zamrożeniem dni, gdy import jest zaległy? (Propozycja: tak.)
6. AP-17 – nadwyżka osłon dopełnia kadłub, tolerancja 1 % dla firewalla? (Propozycja: tak.)
7. Rozkazy tylko w Ustawieniach (D84 C9) czy też w Dowództwie (T227); odprawa o ustalonej godzinie – zrobić czy wykreślić?
8. Gotówka – konto Gotówka czy wydatek „Gotówka” przy bankomacie?
9. Zbiorcze potwierdzenie rekomendacji sekcji 5 (S1–S3, S5, S7–S10, C14, C16, C20, C21, R-3, T286, T291, OP.33, OP.40,
   T156 i in.).
10. Kolejność: N1–N3 przed iD (propozycja), czy inaczej?
11. Rozwojowe: karty kredytowe i raty, Face ID (zmienia „bez blokady”), widżet „energia dziś”, prognoza wieloletnia (F32?).
12. Kalibracja progów gry na Twoich danych?
