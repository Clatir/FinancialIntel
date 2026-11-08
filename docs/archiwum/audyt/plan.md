# Audyt funkcjonalny Financial Intel 1.15.4 – plan

Stan: 03.11.2026, plan zaakceptowany (D97): maszyna wirtualna z Cowork – tak, tylko dane syntetyczne, bloki A i B
jednym ciągiem. Wzór: odbiór Regulated Day (`docs/odbior.md` i `docs/odbior-vm.md` w `Clatir/RegulatedDay`):
punkty „Jak sprawdzić / Oczekiwany efekt / Nie przechodzi, gdy”, raport z werdyktami, maszyna z Cowork dla zegara
i Windows.

## Cel i zakres
- Sprawdzić każdą funkcję widoczną dla użytkownika w wydaniu 1.15.4 na komputerze tak, jak używa jej kapitan: czy
  działa zgodnie ze specyfikacją i decyzjami, czy liczby są dobre, czy ścieżki są spójne i wygodne i czy nic nie
  przepada.
- Na końcu wnioski: czego brakuje i co usprawnić, z priorytetem, nakładem i propozycją grup.
- Poza zakresem: wersja na iPhone'a (D97); jakość kodu, architektura, pokrycie testami, wydajność wewnętrzna
  i bezpieczeństwo – chyba że skutek widać (zła kwota, utrata danych, wolny ekran, zapis w folderze ICTTJ).
- **W trakcie audytu nic nie jest naprawiane.** Poprawki i usprawnienia to osobne grupy po wnioskach, na komendę (D67).
  Znalezisko krytyczne zgłaszam od razu; Ty decydujesz, czy poprawka wychodzi wcześniej.
- Wcześniejsze przeglądy: przegląd 1.4.1 (`docs/przeglad/`: B, W, N, F; F1–F43 wdrożone poza odrzuconymi w D88)
  i audyt 1.15.2 (D95: N-PC-1…20, tylko spójność i ergonomia). Ten audyt jest pierwszym pełnym przejściem wszystkich
  funkcji z niezależną wyrocznią liczb. Naprawione B, N i N-PC widoczne dla użytkownika wracają jako punkty regresji.

## Wersja do audytu (z GitHuba)
- 03.11.2026: lokalny `main` = `origin/main` (e2cd030); ostatnie wydanie to v1.15.4 (25.10). Od tagu zmieniły się tylko
  dokumenty, kod `src/` jest ten sam.
- AU-1 zaczyna od `git pull` i pobrania z GitHub Releases (wzór wyglądu ICTTJ: `C:\CC-Projekty\TradingJournal`,
  tylko odczyt):
  v1.15.4 (Setup, portable, `SHA256SUMS.txt`) oraz Setup v1.15.3 dla maszyny, do `C:\FI-audyt\wydanie\`, z kontrolą
  SHA-256. Gdy w międzyczasie wyjdzie nowsza wersja, audyt idzie na nią (z wpisem w raporcie).
- Claude testuje dokładnie plik z GitHuba: instalator rozpakowany 7-Zipem, bez instalacji (na Twoim komputerze
  instalator nie jest uruchamiany, bo nadpisałby Twoją aplikację). `Financial Intel.exe` steruje Playwright
  (`FI_E2E_EXECUTABLE`); w zapasie jest build z tagu v1.15.4. Instalacja i aktualizacja – tylko w maszynie.

## Bezpieczeństwo Twoich danych
- Laboratorium `C:\FI-audyt\` leży poza repozytorium i poza OneDrive: `wydanie\`, `dane\<stan>\`,
  `userdata\<komputer>\`, `ictj\`, `pobrane\`, `odczyty\`, `zrzuty\`, `eksport\`.
- Instancja audytowa ma własne `userData` (blokada jednej instancji jest per `userData`), więc Twoja aplikacja
  w zasobniku działa dalej i niczego nie widzi. Audyt nigdy nie pisze w `OneDrive\FinancialIntel`,
  `%APPDATA%\Financial Intel` ani w folderze ICTTJ (`FI_ICTJ_DIR` wskazuje fiksturę, `FI_ICTJ_LAUNCH` – atrapę). Aktualizacje są wyłączone (`FI_UPDATE_URL`), Pobrane przekierowane (`FI_DOWNLOADS_DIR`), powiadomienia
  instancji audytowej wyłączone (inaczej pokazywałyby się na Twoim pulpicie).
- Zegara Twojego Windows nikt nie zmienia. Punkty zależne od daty idą w maszynie albo na historii ułożonej względem dnia
  wygenerowania danych.
- Repozytorium jest publiczne (D61): w dokumentach audytu tylko dane syntetyczne.

## Metoda

**Punkty.** Każdy punkt w `docs/audyt/punkty.md` ma identyfikator obszaru (`MO.4`, `SW.12` …), źródło wymagania
(specyfikacja, D…, F…, wersja), kto sprawdza (Claude / Maszyna / Ty) i trzy części jak w RD: **Jak sprawdzić**,
**Oczekiwany efekt**, **Nie przechodzi, gdy**. Na górze pliku jest lista „Do sprawdzenia” w kolejności grup.

**Co znaczy „dokładnie”** – osie, po których idzie każdy punkt:
1. Zgodność ze specyfikacją i decyzjami.
2. Liczby: zgodne z wyrocznią co do grosza i takie same na każdym ekranie (Mostek, zasobnik, Plan miesiąca, Radar,
   eksport); podział z resztą w ostatniej części.
3. Brzegi: pusty folder, 1. i ostatni dzień miesiąca, zmiana czasu, cisza nocna przez północ, kwota 0, zwrot (kwota
   ujemna), duże kwoty, polskie znaki i długie nazwy, operacja bez godziny (import).
4. Błędy użytkownika: „Cofnij”, szkic, opuszczenie ekranu, Esc, potwierdzenia, zrozumiałe komunikaty.
5. Spójność: ten sam wzorzec w każdym module (szkic, „Cofnij”, Esc i Enter, puste stany, nazwy, metafora z prawdziwą
   nazwą i kwotą obok).
6. Ergonomia: liczba kroków w typowych zadaniach (dopisanie wydatku, import, dokowanie, debriefing), klawiatura,
   czytelność.
7. Zrozumiałość: „Skąd ta liczba?”, słowniczek, terminy ICT.
8. Dane: nic nie przepada przy zamknięciu, konflikcie, drugim komputerze ani zniknięciu folderu.
9. Wygląd zgodny z ICTTJ – DO OCENY (oceniasz Ty, na zrzutach).

**Załoga testowa.** Persona „Kapitan Testowy” jest syntetyczna (generator w `tests/audyt/`, stała data odniesienia
z dnia generowania) i ma stany folderu:
- `pusty` – do kreatora;
- `start` – zaraz po kreatorze;
- `rok` – 14 miesięcy historii;
- `brzegi` – osłony poniżej minimum, pusty kadłub, przekroczona koperta, firewall, miesiąc na minusie, zakupy nocą;
- `dwa-komputery`.

Kopii Twojego prawdziwego folderu audyt nie używa (D97).

Do tego CSV z mBanku w formacie fikstury (Windows-1250) i folder ICTTJ z wypłatami z pul: zwykłą, Cele, Podatek, zwrotem
do masy i wypłatą bez pary w mBanku.

**Odczyty liczb i wyrocznia.** Bloki A i B sprawdzają działanie i przy okazji zapisują każdą liczbę z ekranu, z datą
i godziną odczytu, do `C:\FI-audyt\odczyty\` – punkt z liczbą ma tam werdykt „liczby → AU-9”. W bloku C osobny agent
z thinking max liczy wyrocznię: widzi tylko specyfikację, decyzje i dane persony, a nie widzi `src/` ani testów.
Wylicza warstwy, energię dziś, przydział, pensję, odkładki, zasięg, klasę, łupy, salda domowników, ocenę dni, serię
i stopień – na dzień każdego odczytu. Jeśli aplikacja pokazuje coś innego niż wyrocznia, to albo błąd, albo luka
w specyfikacji – rozstrzyga weryfikacja w AU-11.

**Dowody.** Liczby i teksty są czytane z ekranu jako tekst (Playwright: `innerText` albo migawka dostępności), co jest
dokładne i tanie. Zrzut ekranu (`C:\FI-audyt\zrzuty\<punkt>.png`) powstaje dla punktów wyglądu i układu i Claude go
ogląda.

**Werdykty** są jak w RD: ZGODNE, NIEZGODNE, UWAGA (tylko wygląd albo tekst), DO OCENY (gust), NIE DO SPRAWDZENIA
(z powodem). Każde NIEZGODNE daje znalezisko `AF-n` z wagą:

| Waga | Kiedy |
| --- | --- |
| **K** krytyczne | zła kwota, utrata danych, zapis w folderze ICTTJ |
| **W** wysokie | funkcja nie działa albo blokuje pracę |
| **S** średnie | działa źle w brzegu albo myli |
| **N** niskie | ergonomia |

Propozycje usprawnień mają numery `AP-n`. Wpis w `docs/audyt/raport.md`:

```
### SW.12 – NIEZGODNE (S) → AF-7
- Stan: rok, odczyt 2026-11-10 14:05
- Zrobione: …
- Widać: „…” (dosłownie)
- Oczekiwane: … (punkt / wyrocznia)
- Zrzut: SW.12.png
```

## Grupy w blokach według modelu (D97)

Blok to grupy na tym samym modelu i thinking: między nimi tylko `/clear` (świeży kontekst), bez zmiany modelu. Każda
grupa idzie jednym ciągiem; po niej commit na gałęzi `claude/audyt-1.15.4`, wpis w `docs/postep.md` i pauza. Przed
każdą grupą „Przed grupą AU-n” z tabelą prac (skill `etap`). Kolejna grupa startuje na Twoją komendę (D67) – możesz
też powiedzieć „cały blok A”.

| Blok | Grupa | Co obejmuje | Model · thinking (z górką; minimum) | Czas Claude'a |
| --- | --- | --- | --- | --- |
| **A** | AU-1 Laboratorium i katalog | pobranie z GH, laboratorium, narzędzie audytu, katalog funkcji, punkty | Opus 5.5 · xhigh (min. high); subagenci: Sonnet 5.5 · low (pobranie), Explore · haiku (przegląd ekranów) | 2,5–3,5 h |
| A | AU-2 Załoga testowa | generator persony, stany folderu, CSV, folder ICTTJ, `/code-review` narzędzia | Opus 5.5 · xhigh (min. high) | 1,5–2 h |
| A | AU-3 Instrukcja maszyny | instrukcja dla Cowork (gdy maszyna – tak) | Opus 5.5 · xhigh (min. high) | 1–1,5 h |
| A | AU-4 Codzienny rytm | kreator, Mostek, szybki wpis, Operacje, meldunki, import z mBanku, salda | Opus 5.5 · xhigh (min. high) | 3–4 h |
| A | AU-5 Dowództwo i Wywiad | gra, analizy ICT, rytuały | Opus 5.5 · xhigh (min. high) | 2–3 h |
| A | AU-6 Dane i dwa komputery | kopie, przywracanie, historia, konflikty, dwa komputery, znikający folder | Opus 5.5 · xhigh (min. high) | 1,5–2 h |
| **B** | AU-7 Interfejs i ustawienia | Ustawienia, paleta, panele, ukrycie kwot, puste stany, teksty, wygląd | Sonnet 5.5 · high (min. medium) | 2–2,5 h |
| B | AU-8 Raporty, eksport, „Tylko Ty” | raporty, pliki CSV / Excel / PDF / ZIP, Twoja lista | Sonnet 5.5 · high (min. medium) | 1–1,5 h |
| **C** | AU-9 Wyrocznia i przekrój liczb | wyrocznia, porównanie wszystkich odczytów z bloków A i B | Opus 5.5 · max (min. xhigh) – D96 | 2–2,5 h |
| C | AU-10 Silnik pieniędzy | plan miesiąca, Ładownia, dokowanie i granica ICTTJ, Mapa gwiezdna, domownicy i pożyczki, Radar | Opus 5.5 · max (min. xhigh) – D96 | 3,5–4,5 h |
| **Koniec** | AU-11 Synteza i wnioski | raport maszyny, konsolidacja, weryfikacja, luki, usprawnienia, plan dalej | Opus 5.5 · xhigh (min. high); druga opinia K / W: Fable 5.1 | 3–4 h |
| | **Razem** | | | **23–31 h** (realnie ok. 10–20 h) |

AU-11 jest jedynym wyjątkiem od kolejności xhigh → Sonnet → max: wnioski muszą widzieć wszystkie znaleziska, także
z bloku max. Bez maszyny AU-3 wypada (−1–1,5 h), a jej punkty przechodzą na listę „Tylko Ty”.

### Blok A – Opus 5.5 · xhigh

**AU-1 Laboratorium i katalog**
1. **Wersja z GH i laboratorium.** `git pull` (`main` i `ICTTJ_ref`), gałąź `claude/audyt-1.15.4`, pobranie wydań
   z kontrolą SHA-256, rozpakowanie instalatora, utworzenie `C:\FI-audyt\`. Narzędzie `tests/audyt/` z
   `playwright.audyt.config.ts` (poza `npm test` i CI) uruchamia `Financial Intel.exe` z wydania na izolowanym folderze,
   czyta tekst ekranu, zapisuje odczyty i robi zrzut. Próba: w Ustawieniach widać wersję 1.15.4.
2. **Katalog funkcji** (`docs/audyt/katalog.md`): każdy ekran, panel, okno, przycisk akcji, skrót, powiadomienie,
   ustawienie i eksport, ze źródłem (specyfikacja, D…, F…, CHANGELOG, wersja). Źródła: specyfikacja, decyzje (Grep),
   CHANGELOG, listy „Do sprawdzenia w aplikacji” 1.5.0–1.12.0 z archiwum dziennika i teksty interfejsu
   w `src/renderer/features/*` (to, co widzi użytkownik).
3. **Punkty** (`docs/audyt/punkty.md`): Jak sprawdzić / Oczekiwany efekt / Nie przechodzi, gdy / Kto / ryzyko.
   Szacunek: 250–350 punktów.
- Gotowe, gdy: aplikacja z wydania startuje w laboratorium, każdy ekran z katalogu ma punkty, a Ty dostajesz katalog do
  przejrzenia (co dodać, co pominąć).

**AU-2 Załoga testowa**
1. Generator persony i stany `pusty`, `start`, `rok`, `brzegi`, `dwa-komputery`; CSV z mBanku; folder ICTTJ.
2. Próba: każdy stan otwiera się w aplikacji bez błędu. Na końcu `/code-review` high narzędzia i generatora – zły
   generator dawałby fałszywe znaleziska.

**AU-3 Instrukcja maszyny** (zaraz po AU-2, żeby Cowork pracował równolegle z AU-4–AU-10). `docs/audyt/maszyna.md`
jak `odbior-vm.md` w RD: przygotowanie maszyny (Ty, ok. 1 h; maszynę `RD-test` można sklonować z migawki „czysta”, nie
cofając jej), zasady Cowork, format raportu, dni z zegarem tylko do przodu i polecenie do wklejenia. Zakres:
- instalacja 1.15.3 z GH i aktualizacja do 1.15.4 (SHA-256, kopia przed aktualizacją, „Co nowego”), kreator na świeżym
  Windows;
- zasobnik (energia w dymku, ukrycie kwot), start z Windows w zasobniku, globalny skrót nad innym oknem i jego zmiana;
- powiadomienia Windows o swoich porach: odprawa, 21:00, energia < 20 %, koperta > 80 %, asteroida 14 i 3 dni przed
  terminem, zaległy import, niedziela, 1. dzień miesiąca, wypłata w ICTTJ;
- zegar do przodu: przełom miesiąca (pensja, debriefing, łupy po 7 dniach, „miesiąc na plus”), zamrożenie dnia po 24 h,
  niedzielny raport wachty, cisza nocna 23:00–5:00, kwiecień (PIT-38), styczeń (przegląd roczny), Silver Bullet;
- uśpienie i wybudzenie (kopia dzienna), wersja portable, odinstalowanie bez utraty danych.

Cowork w maszynie: Sonnet 5.5 (ocena dosłownie według punktów), ok. 12–18 h pracy maszyny, głównie czekanie, w sesjach
po jednym dniu maszyny. Ty: ok. 1 h przygotowania i kilka minut na każdy dzień maszyny.

**AU-4 Codzienny rytm**
- **Kreator startu** od pustego folderu: konta, salda otwarcia, import historii, propozycja pensji, cele osłon
  i kadłuba, podział środków, domownicy i rozliczenia na start, ICTTJ, rozkazy, skrót, autostart.
- **Mostek:** stan okrętu, odprawa, Daily Bias, „Skąd ta liczba?”, koperty, rozliczenia, przychody, dokowanie, krzywa
  majątku, ostatnie operacje.
- **Szybki wpis:** wydatek, wpływ, zakup za domownika, wspólne finansowanie, „W tym za X”, podział paragonu, „plan czy
  impuls” od progu, cisza nocna, podgląd energii, konto, tagi i wyprawy, oficer (marki, reguły), seriami, szablony,
  „powtórz”, „wczoraj”, szkic po Esc.
- **Operacje:** lista, filtry, wyszukiwanie, sortowanie, zapisane widoki, edycja z historią, ostrzeżenie przy edycji
  z banku albo z potwierdzonego okresu, zmiany zbiorcze z „Cofnij”, przelew między kontami, zwroty w drodze, eksport
  widocznej listy; skrzynka meldunków.
- **Import z mBanku:** plik i podgląd, duplikaty ±3 dni, reguły i ich audyt, kategoryzacja grupowa, przelewy własne,
  XTB, domownicy, kopia przed importem, „Cofnij import”, saldo z pliku, plik w Pobranych, plik z innego rachunku,
  powtórny import tego samego okresu.
- **Salda:** potwierdzanie sald, rozbieżność i korekta.

**AU-5 Dowództwo i Wywiad**
- **Gra:** rozkazy i ich zmiana, ocena i zamrożenie dni, seria i rekord, awans (30 z 35), degradacja (3 poważne), klasy
  według zasięgu, misje i skrócenie drogi, ukryte osiągnięcia, dziennik wachty, smaczki ICT.
- **Wywiad:** krzywa majątku z drawdownem, BOS i CHoCH, Killzones, FVG, wydatki w czasie z drążeniem i porównaniem
  okresów, prognoza zasięgu, dziennik kapitański, majątek netto, stopa oszczędności i bilans paliwa, kurs na 12 miesięcy
  i manewry „co jeśli”, osobista inflacja.
- **Rytuały:** odprawa poranna (z Silver Bullet), raport wachty, debriefing z FVG i łupami, przegląd roczny, „Miesiąc
  zamknięty na plus”, wieczorne dopisanie („Dziś bez wydatków”, „Przypomnij za 30 min”).

**AU-6 Dane i dwa komputery**
- Kopie: dzienne, tygodniowe, ręczne, przed importem.
- Przywracanie z podglądem (cały folder albo wybrane wpisy), historia wpisu, dziennik zmian, Kosz.
- Dwa komputery na jednym folderze, po kolei, jak w życiu: „w użyciu”, obecność, zapisy w tle tylko na jednym, bez
  podwójnych powiadomień.
- Konflikt kopii chmury i scalanie w Synchronizacji, wpis z nowszej wersji (tylko do odczytu).
- Folder znika w trakcie pracy i wraca, zmiana folderu, folder ICTTJ odrzucony jako folder danych, zamknięcie
  z niezapisanymi zmianami.

### Blok B – Sonnet 5.5 · high

**AU-7 Interfejs i ustawienia**
- **Ustawienia:** każda zakładka i każdy przełącznik działa i zostaje po ponownym uruchomieniu (konta, kategorie i ich
  usuwanie, warstwy, rozkazy, domownicy, powiadomienia, dźwięki, skróty, ICTTJ, import, kopie, aktualizacje, skala,
  kontrast).
- **Interfejs:** paleta Ctrl+K (polecenia i wyszukiwanie wpisów), panele (zwijanie, powiększanie, ukrywanie,
  odłączanie, układy), menu boczne, ukrycie kwot (skrót, po bezczynności), puste stany i komunikaty błędów,
  polszczyzna, spójność terminów i metafory, słowniczek, klawiatura, wygląd wobec ICTTJ (zrzuty DO OCENY).

**AU-8 Raporty, eksport i lista „Tylko Ty”**
- **Raporty i eksport:** CSV i Excel (operacje, miesiące), PDF (debriefing, przegląd roczny), ZIP. Pliki są otwierane
  i sprawdzane: polskie znaki, separator, format kwot i dat; liczby trafiają do odczytów (porównanie z ekranem
  i wyrocznią w AU-9).
- **`docs/audyt/ty.md`** – krótka lista „Tylko Ty”: OneDrive na dwóch komputerach, prawdziwy CSV z mBanku, prawdziwy
  folder ICTTJ i wypłata, dźwięki, odsłuch odprawy polskim głosem, wygląd i ton (DO OCENY), „czy aplikacja otwiera się
  z przyjemnością”; bez maszyny – także jej punkty.

### Blok C – Opus 5.5 · max (D96: silnik pieniędzy i granica ICTTJ)

**AU-9 Wyrocznia i przekrój liczb**
1. Wyrocznia (`docs/audyt/wyrocznia.md`): subagent z thinking max, bez dostępu do `src/` i `tests/`; oczekiwane liczby
   dla każdego stanu i dnia odczytu.
2. Przekrój: każdy odczyt z bloków A i B porównany z wyrocznią; ta sama liczba na wszystkich ekranach, w zasobniku
   i w eksporcie. Werdykty „liczby → AU-9” dostają ZGODNE albo NIEZGODNE.

**AU-10 Silnik pieniędzy** (z wyrocznią pod ręką)
- **Plan miesiąca:** pensja i alarmy (z kadłuba, częściowa), ostrzeżenie „pensja > wpływy”, przychody (3, 6, 12 miesięcy
  i mediana), koperty codzienne i planowe, dzienny przydział, przeniesienie energii, przekroczenie, reszta koperty,
  „pokryj z koperty”, plan kampanii na 12 miesięcy, łupy i domyślne osłony po 7 dniach, plan następnego miesiąca.
- **Ładownia:** kontenery i cykle, odkładki z resztą, linia zanurzenia i symulacja, stan zapłaty, „Zapłacone” i „Połącz
  płatność”, nowe ceny, ciche kontenery, opłaty zmienne, raty i spłata pożyczki.
- **Dokowanie z ICTTJ:** kolejność rozładunku (przykład ze specyfikacji), pule Cele i Podatek, częściowe dokowanie,
  wycofanie i korekta, Portfel XTB po 3 dniach roboczych, wpływ z XTB bez wpisu w ICTTJ, każdy wpis dokuje raz, firewall
  dopłat, „Otwórz ICTTJ”, nowszy format ICTTJ. **Folder ICTTJ po audycie jest bajt w bajt bez zmian** (suma kontrolna
  przed i po).
- **Mapa gwiezdna:** cele własne i z prognozy, priorytety, ETA, rata do terminu, przeniesienie środków, archiwizacja.
- **Domownicy i pożyczki:** zaliczka i „ma oddać”, wpłata wyrównuje wskazane albo najstarsze zakupy, „przychód czy
  zaliczka” (pytanie raz), osoba przez innego domownika, „Przypisz zwrot…”, saldo na start, rozliczenia od wybranego
  dnia, przypomnienie po 30 dniach, pożyczki w obie strony z harmonogramem.
- **Radar:** 90 dni, pensje, asteroidy (14 i 3 dni), spodziewane wpłaty, boje, PIT-38, salda kont naprzód, anomalie,
  należności.

### Koniec – Opus 5.5 · xhigh

**AU-11 Synteza i wnioski**
1. **Raport maszyny** (gdy była) i Twoja lista: każde NIEZGODNE sprawdzam w `main.log` i w aplikacji.
2. **Konsolidacja** `raport.md`: wynik dla każdego obszaru, połączone duplikaty, wagi.
3. **Weryfikacja sceptyczna** znalezisk K, W i S: świeży agent (Opus 5.5 · xhigh) najpierw odtwarza każde znalezisko
   w aplikacji z wydania, dopiero potem szuka przyczyny w kodzie. Dla K i W dotyczących pieniędzy i danych – druga
   opinia Fable 5.1. Odrzucone znaleziska zostają w raporcie z powodem.
4. **Wnioski** (`docs/audyt/wnioski.md`):
   - kryteria sukcesu ze specyfikacji (cztery problemy i cztery kryteria po 3 miesiącach): spełnione, częściowo albo
     nie – z dowodami z audytu;
   - ścieżki kapitana: pierwsze uruchomienie, zwykły dzień, tydzień, przełom miesiąca, rok, powrót po 2 tygodniach
     przerwy, nowy komputer – tarcia, liczba kroków i miejsca, w których łatwo się pogubić;
   - luki: obiecane w specyfikacji albo decyzjach, a niezrobione; wynikające z audytu; względem współczesnych aplikacji
     budżetowych (YNAB, Actual Budget, Monarch, Copilot, Firefly III i in., aktualne funkcje sprawdzone w sieci) – bez
     funkcji już zrobionych (F1–F43) i odrzuconych (D88);
   - propozycje `AP-n`: problem → propozycja → po co → nakład S / M / L → konflikt z decyzją → priorytet.
5. **Plan dalej:** grupy naprawcze (wersje 1.15.x) i rozwojowe, z modelem i czasem, ich miejsce przed iD i iE, oraz
   pytania do Ciebie.

## Pliki audytu
- `docs/audyt/`: `plan.md` (ten plik), `katalog.md`, `punkty.md`, `wyrocznia.md`, `raport.md`, `maszyna.md`, `ty.md`,
  `wnioski.md`.
- Narzędzie: `tests/audyt/` i `playwright.audyt.config.ts`, poza `npm test` i CI.
- Laboratorium `C:\FI-audyt\` – nigdy w repozytorium.
