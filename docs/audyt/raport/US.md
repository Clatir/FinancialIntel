# Raport audytu – US (Ustawienia)

- Data: 03.11.2026, 11:40–13:15 (zegar prawdziwy, Warszawa); wersja 1.15.4 z GitHub Releases, uruchamiana jako portable
  (laboratorium `C:\FI-audyt`, `start()` z `tests/audyt/lab.ts`).
- Stan danych: kopie persony `rok` (kotwica 2026-11-03) w przebiegach `us-*` (po jednej kopii na punkt albo grupę punktów),
  `start` dla US.13–14 i `IN`-ów; nowe rekordy: tylko przez interfejs aplikacji albo `fi.json` zmieniony przed startem
  (`schemaVersion: 2` dla trybu tylko do odczytu – US.31; trzy aliasy nazw w US.15; `config.json` z `zoom` – US.23). Fikstura
  ICTTJ: kopia `ictj-start` (US.13–14), sumy kontrolne przed i po identyczne (`bcb288214916dffd`).
- Skrypty: `tests/audyt/us-*.spec.ts` (pomocnik `us-pomoc.ts`), wyniki ekranów w `C:\FI-audyt\us-*.out`, odczyty liczb
  `C:\FI-audyt\odczyty\us.jsonl`, zrzuty `C:\FI-audyt\zrzuty\US.*.png`.
- Oczekiwania z punktów (`punkty/5-dane-interfejs-system.md`), nie z kodu; kod czytany tylko po `data-testid`.

**Podsumowanie (33 punkty):** ZGODNE 16 · LICZBY → AU-9 / AU-10 4 · UWAGA 6 · NIEZGODNE 3 (S 2, N 1) ·
NIE DO SPRAWDZENIA 2 (US.21, US.22) · poza laboratorium 2 (US.19 – Ty, US.25 – Maszyna).

## Punkty

### US.1 – UWAGA
- Stan: rok, przebieg us-zwiad, 12:09. Zakładki: Okręt, Konta, Kategorie, Warstwy i rozkazy, Domownicy, Import z banku, ICTTJ,
  Powiadomienia i dźwięki, Wygląd i prywatność, Folder i kopie, Zasobnik i start, Aktualizacje – wszystkie otwierają się bez
  błędu (zrzuty `US.1-<zakładka>.png`); Esc (bez fokusu w polu) wraca na poprzedni ekran.
- Widać: ustawienia tego komputera mówią to różnie: „Tylko na tym komputerze; działają w tle…” (Powiadomienia), „…(TEN KOMPUTER)”
  (Zasobnik, Token), „Ustawienie tego komputera.” (ICTTJ), ale panele „Szybki wpis” (Skrót globalny), „Dźwięki”, „Prywatność kwot”
  i „Rozmiar i kontrast” (poza podpowiedzią „Wszystkie okna aplikacji na tym komputerze”) nie mówią, że są tylko tego komputera.
- Oczekiwane: „przy ustawieniach tego komputera jest to powiedziane” – brakuje w czterech panelach.
- Zrzut: US.1-notify.png, US.1-view.png

### US.2 – ZGODNE
- Domyślnie „Flagowiec”; „Żółw Gęślą Jaźń” + Enter → menu „okręt Żółw Gęślą Jaźń” i Mostek; 40 znaków – menu ucina z „…”,
  nie psuje układu; 41. znak nie wchodzi (pole ma limit 40); pusta – „Okręt musi mieć nazwę.” i zostaje poprzednia; Esc
  przywraca i zostaje w Ustawieniach; LAPTOP (osobny `userData`, ten sam folder) widzi nową nazwę. Zrzuty US.2-40.png, US.2-pusta.png.

### US.3 – ZGODNE
- Nowe konto „Konto oszczędnościowe” (rodzaj „konto bankowe”, import CSV mBanku) od razu w szybkim wpisie, w selektach edytora
  i w pasku sum Operacji; duplikat „mbank” – „Takie konto już jest.”; pusta – „Konto musi mieć nazwę.”. Archiwum mBanku: salda
  przed / po te same (69 747,04 / 3 918,89 / −55,36 zł), konto znika z wyboru w szybkim wpisie, dawne operacje i warstwy zostają;
  „przywróć” oddaje je do wyboru. Zrzut US.3-archiwum-mostek.png.

### US.4 – ZGODNE · LICZBY → AU-9
- Data otwarcia 24.10.2026 (18 000,00 zł): „saldo teraz” 17 610,29 zł = 18 000,00 + operacje konta od 24.10 (−389,71 zł z plików);
  jutro (04.11) – „Saldo otwarcia nie może być z przyszłości.” i zostaje 24.10; −500,00 przyjęte (−889,71 zł); 1 000,00 → 610,29 zł;
  Mostek przeliczył się („Deficyt: osłony … poniżej zera o 1 626,18 zł”); „Historia” pokazuje wersję 1.09.2025 → obecna.
  Odczyty w `odczyty\us.jsonl`. Zrzuty US.4-jutro.png, US.4-historia.png.

### US.5 – ZGODNE · LICZBY → AU-10
- „Jedzenie” → „Jedzenie i picie”: nowa nazwa w kategoriach, w wierszu Operacji (bez nowej kategorii); duplikat – „Taka kategoria już
  jest.” / „Taka podkategoria już jest.”; pusta – „Kategoria musi mieć nazwę.”. „Rozrywka i hobby”: codzienna → planowa: energia dziś
  77,28 → 61,21 zł, „bez koperty” bez zmiany; wszystkie główne „planowa” – ostrzeżenie „Uwaga: żadna aktywna kategoria główna nie ma
  koperty codzienna – „Energia dziś” na Mostku będzie wynosić 0,00 zł…” i energia 0,00 zł. Przydział w Planie miesiąca nie odczytywany
  (AU-10). Zrzut US.5-ostrzezenie.png.

### US.6 – NIEZGODNE (S)
- Stan: rok, przebiegi us-kategorie (11:50) i us-kat2 (potwierdzenie, 12:40); kategoria „Testowa” z podkategorią dodana w interfejsie.
- Zrobione: „+ Kategoria” → „Testowa” → „podkategoria”; szukanie przycisku usunięcia; „archiwizuj”; „×”; paleta „usuń kategorię”.
- Widać: wiersz „codzienna | planowa | bez koperty | podkategoria | archiwizuj | ×” – po archiwizacji „przywróć” i „↺”; żadnego
  „usuń”, w palecie „usuń kategorię” – brak wyników; opis zakładki: „Usunięcie to archiwizacja…”. Po ponownym uruchomieniu
  „Testowa” wraca jako zarchiwizowana (wiersz przygaszony).
- Oczekiwane: nieużywaną kategorię i podkategorię da się usunąć (znikają i nie wracają) – D95 N-PC-7; CHANGELOG 1.15.2 zapowiada
  „Usuwanie nieużywanych kategorii i podkategorii bezpośrednio w Ustawieniach (N-PC-7)”.
- Reszta ZGODNA: archiwizacja „Dom” z kopertą – toast „Zarchiwizowano „Dom” – jej koperta zniknęła z planu tego miesiąca
  i kolejnych.” z „Cofnij”; „Osobiste” (codzienna 350 zł): energia dziś 77,28 → 64,78 zł, po „Cofnij” 77,28 zł i kategoria wraca
  z kopertą „daily”. UWAGA: archiwizacja podkategorii „×” bez toastu i bez „Cofnij” (główna ma) – spójność.
- Zrzut: US.6-brak-usuwania.png, US.6-testowa.png

### US.7 – ZGODNE · LICZBY → AU-9
- Domyślnie 3 pensje i 6 miesięcy; zmiana przelicza Mostek bez restartu: cel osłon 19 500,00 → 26 000,00 zł (pensja 6 500), zasięg
  7,8 → 8,4 mies., cel kadłuba 39 185,22 → 58 777,83 zł (9 mies.); „przyjęte koszty” 4 000 – bez wpływu przy historii ≥ 3 mies. (zgodnie
  z podpowiedzią). 0 i 25 – „Cel osłon to od 1 do 24 pensji – zostaje poprzedni.”; cel 2 przy minimum 3 – „Cel osłon nie może być
  mniejszy niż minimalne osłony (3 pensji) – najpierw zmniejsz minimum.”. Odczyty `us.jsonl`. LAPTOP widzi ustawienia folderu (US.30).
- UWAGA (tekst): „(3 pensji)” – po liczebniku 3 powinno być „3 pensje” (też w US.8: „celu osłon (3 pensji)”); Kadłub 0 i 37 –
  wartość wraca po cichu, bez komunikatu (osłony go mają); pole „Minimalne osłony” pokazuje „1.0” z kropką (reszta aplikacji – przecinek).

### US.8 – ZGODNE
- Domyślnie 1 pensja, 40 %, 23:00–05:00, 200,00 zł, firewall włączony. Min 5 przy celu 3 – „Minimalne osłony nie mogą przekraczać celu
  osłon (3 pensji) – zostaje poprzednie.”. Po zmianach (min 2, 20 %, 22:00–04:00, 300 zł, firewall wył.) Dowództwo pokazuje te same
  wartości, Ładownia – „linia 20%” i „Masa ładunku 31,0%… ponad linią” od razu, szybki wpis o 23:30 przy kwocie 250 zł – blok
  „Dziennik kapitański” i „Potwierdzam zakup w ciszy nocnej (22:00–04:00)”.
- Uwaga do punktu: w Dowództwie rozkazy są polami do zmiany (z odnośnikiem „warstwy okrętu w Ustawieniach ›”), a nie „do odczytu” –
  zgodnie ze specyfikacją (N73), ale inaczej niż w oczekiwaniu punktu; wartości w obu miejscach takie same. Zrzut US.8-dowodztwo-po.png.

### US.9 – UWAGA
- Cisza 22:00–02:00: 01:30 – „cisza nocna”, blok dziennika, „Cisza nocna: potwierdź zakup i wpisz krótko, dlaczego teraz.”; 02:00 –
  zapisane bez pytania (koniec wyłączony), 21:59 – bez pytania, 22:00 – pytanie (początek włączony). 01:00–06:00: 02:00 pytanie,
  23:30 nie. Wieczorne dopisanie 23:30 przy ciszy 23:00–05:00: „w ciszy nocnej (23:00–05:00) – przyjdzie o 22:59” (dosłownie).
- Widać (od = do): 23:00–23:00 przyjęte bez żadnego komunikatu; szybki wpis o 23:00 i 03:00 – bez pytania (cisza nocna wyłączona).
- Oczekiwane: „odmowa albo jasne znaczenie (brak wymagania)” – znaczenie („brak ciszy”) nie jest nigdzie powiedziane. Zrzut US.9-od-do.png.

### US.10 – ZGODNE
- Próg 200 zł: 199,99 – brak pytania, 200 i 200,00 – „plan czy impuls?” (od progu włącznie), tak samo w szybkim wpisie i w edytorze
  operacji („od 200,00 zł: plan czy impuls?”); próg 0 i pusty (zapisuje 0): 5 000 zł nigdzie nie pyta.

### US.11 – ZGODNE
- „Domownik” → „Babcia Zosia”; od razu w edytorze: „finansuje: Babcia Zosia”, „prezent od: Babcia Zosia”; „Nazwy w banku” – „ZOFIA
  KOWALSKA” dodana, ta sama małymi literami i dokładny duplikat – nie przyjęte drugi raz (po cichu, pole się czyści), „×” usuwa;
  „Pieniądze przekazuje przez” Anna; „pytaj / zaliczka / przychód” zapisane; puste imię – „Domownik musi mieć imię.”, duplikat –
  „Taki domownik już jest.”. Archiwum Marka: saldo „ma oddać 360,00 zł” zostaje, znika z wyborów w edytorze (zostają Anna, Kasia,
  Babcia Zosia). Zrzut US.11.png.

### US.12 – LICZBY → AU-10
- Data 01.01.2025 (przed startem 01.09.2025): „Data sprzed startu budżetu – rozliczenia liczą się od startu (01.09.2025).”. Salda
  (Anna / Kasia / Marek): start budżetu – zaliczka 4 377,20 / zaliczka 360,00 / ma oddać 360,00 zł; „od dziś” (03.11.2026) – bez zmian
  / bez zmian / ma oddać 300,00 zł; powrót „od startu budżetu” – jak na początku (odwracalne). „Na start rozliczeń: ma oddać 150,00”
  u Anny: zaliczka 4 377,20 → 4 227,20 zł (raz, także po przełączeniu daty). Zrzuty US.12.png, US.12-przed-startem.png.
- UWAGA do rozstrzygnięcia w AU-10: przy „od dziś” zmienia się tylko Marek (−60,00 zł), saldo Anny i Kasi (zaliczki z wcześniejszych
  wpłat) zostaje – wyrocznia powie, czy tak ma być.

### US.13 – UWAGA
- Stan: start + fikstura ICTTJ (kopia `ictj-start`, 12 wpisów, 2 scenariusze); przebieg us-ictj.
- Zrobione: „Wskaż folder…” (odpowiedź na okno wyboru) → folder FI, pusty folder, folder ICTTJ; „Nie czytaj ICTTJ na tym komputerze”;
  LAPTOP.
- Widać: folder FI – „To folder danych Financial Intel – wskaż folder ICT Trade Journal.”; pusty – „W tym folderze nie ma danych ICT Trade
  Journal (brak pliku journal.json).”; fikstura – status „CZYTANY”, „ICTTJ: 12 wpisów wypłat i zwrotów, 2 scenariusze prognozy.”
  (na zakładce „Wypłaty: 11, zwroty do masy: 1, scenariusze prognozy: 2.”); sumy kontrolne fikstury przed i po identyczne; LAPTOP –
  „NIE WYBRANO”, scenariusz wspólny. Podpowiedź „ICTTJ na tym komputerze używa folderu …” z „Użyj tego folderu” widać (z prawdziwym
  folderem użytkownika – patrz problem laboratorium; przycisku nie klikałem); wybór z podpowiedzi fikstury – NIE DO SPRAWDZENIA.
- UWAGA (tekst): po „Nie czytaj ICTTJ…” (status „NIE WYBRANO”) selektor scenariusza pokazuje „(scenariusza nie ma w ICTTJ)” – myli,
  ICTTJ po prostu nie jest czytany. Zrzut US.13-nie-czytaj.png.

### US.14 – ZGODNE
- Zmiana scenariusza pyta: „Cele scenariusza „Plan główny” zostaną zarchiwizowane: ich środki zostają w nich (przeniesiesz je na Mapie
  gwiezdnej), a nowe pieniądze trafią do celów scenariusza „Plan ostrożny”.”; „Anuluj” – bez zmiany; „Zmień scenariusz” – zmiana
  (Mapa: „w celach 14 723,06 zł (w tym zarchiwizowane 14 723,06 zł)”). Atrapa .exe: „Wybrany: …\ICTTJ-atrapa.exe”, „Otwórz ICTTJ” –
  w logu „ICTTJ: start …atrapa.exe (próba)”; „Zapomnij wybór” wraca do „Zainstalowany: …”. Scenariusz wspólny, .exe tylko tego komputera
  (config). „Bez .exe – toast z odesłaniem” – NIE DO SPRAWDZENIA (ICTTJ jest zainstalowany na tym komputerze, aplikacja znajduje go
  sama). Zrzut US.14-pytanie.png.

### US.15 – ZGODNE
- Nazwiska: „Dodaj” wyłączony przy pustym i przy duplikacie (bez względu na wielkość liter), „usuń”. Pliki z mBanku: włączone –
  na Mostku „Nowy meldunek z mBanku (27.10–02.11): mbank-A.csv w folderze Pobrane – importuj.”; wyłączone – meldunek znika, plik B
  niewidoczny; włączone znowu – oba. Przełącznik zapisany tylko w `config.json`. „Rozłącz wszystkie” – „Rozłączono 3 nazwy – każda
  wraca do własnej grupy.” z „Cofnij”, który przywraca. W ciągu 6 s od pojawienia się pliku nie przyszło powiadomienie Windows
  (przy starcie z plikiem – tak, w persona.log). „pokazuj znowu” nie wystąpiło (nic nie ukryto).

### US.16 – UWAGA
- 19 przełączników: odprawa, wieczorne (+godzina), energia < 20 % / koperta > 80 %, przekroczenie, asteroida, kontener, zaległy import,
  salda w niedzielę, debriefing, ICTTJ, raty pożyczek, PIT-38, domownik, boje i terminy, salda kont, ładownia, anomalie, zwroty, raport
  wachty – wszystkie pozycje tabeli specyfikacji + nowsze; domyślnie włączone; zapis tylko w `config.json` (w `fi.json` brak).
  Przebieg A (wszystkie włączone): 10 prób przy starcie; wydatek 5 000 zł → po ok. 50 s „Przydział dnia przekroczony: Ponad przydział
  o 4 922,72 zł – kolejne dni dostaną mniej.”. Przebieg wszystkie wyłączone: 0 prób; przebieg overrun + low wyłączone: po 100 s od
  wydatku 5 000 zł żadnej próby.
- Widać (UWAGA): „Odprawa poranna – przy pierwszym otwarciu okna po ciszy nocnej” – bez godziny; D84 C9 zapowiada „odprawę o ustalonej
  godzinie z powiadomieniem” (wątpliwość z punktu). Zrzut US.16.png.

### US.17 – ZGODNE
- Godzina = teraz + 2 min (12:45): o 12:45 próba „Raport wachty dnia: Dziś dopisano 1 operację z godziną – dopisz resztę albo potwierdź
  „Dziś bez wydatków”.”; w Operacjach pasek „Raport wachty dnia” z „Dopisz”, „Dziś bez wydatków”, „Przypomnij za 30 min”. Po „Dziś bez
  wydatków” – pasek „Raport wachty zamknięty („Dziś bez wydatków”) · Wznów raport wachty”; ponowne ustawienie godziny na teraz + 2 min –
  przez 170 s żadnej próby. Zrzut US.17-pasek.png. (Wariant „po wydatku po 18:00” – nie robiony osobno.)

### US.18 – ZGODNE
- Wartości domyślne w pliku: głośność 0,3, wszystkie zdarzenia włączone (przełącznik główny w laboratorium wyłączony przez narzędzie –
  domyślne „włączone” wg kodu `DEFAULT_MACHINE_PREFS`, nie z ekranu). Suwak (2× →, zapis po puszczeniu) – 32 % w pliku; „Alarm” wyłączony;
  „▶” (okna wyciszone przez `setAudioMuted`); po ponownym uruchomieniu wszystko zostaje; LAPTOP – 30 % i wszystko domyślne. Zrzut US.18.png.

### US.19 – poza laboratorium
- Kto: Ty (odsłuch).

### US.20 – ZGODNE
- Ctrl+Alt+S, Ctrl+Alt+Shift+S i Ctrl+Alt+U – „Ctrl+Alt+S to w polskim układzie AltGr+S („ś”) – skrót zabrałby ten znak wszystkim programom.
  Wybierz inną literę albo cyfrę, np. Ctrl+Alt+B.” (pole słucha dalej); sam „B” – bez efektu; Ctrl+Shift+F9 – przyjęty, „działa”;
  Esc anuluje (zostaje poprzedni); Backspace – „brak”; ściągawka: „szybki wpis – w całym systemie (zmiana: Ustawienia → Powiadomienia
  i dźwięki)” + „Ctrl Alt B” / „brak skrótu”. UWAGA (drobna): F1 w trakcie nasłuchu pola otwiera ściągawkę (pole dalej nasłuchuje).
  Zrzuty US.20-F9.png, US.20-sciagawka.png.

### US.21 – NIE DO SPRAWDZENIA (laboratorium)
- `start()` zeruje skrót w `config.json` przed każdym startem (aplikacja stosuje go przy starcie, zanim zadziała przechwycenie) –
  migracja zapisanego `Control+Alt+S` na Ctrl+Alt+B zarejestrowałaby prawdziwy skrót globalny. Sprawdza maszyna (SY.14).

### US.22 – NIE DO SPRAWDZENIA (laboratorium)
- Rejestracja skrótu jest w laboratorium podstawiona (zawsze „działa”), więc „zajęty przez inny program” się nie pojawi – maszyna.

### US.23 – NIEZGODNE (N)
- Stan: rok; przebieg us-rozmiar (+ cztery z `config.json`), 12:20.
- Suwak 90–150 %: po puszczeniu zmienia okno główne, szybki wpis i panel odłączony razem (zoom 1,5 / 0,9 / 1,0 we wszystkich trzech);
  „100 %” wraca; po ponownym uruchomieniu zostaje. Wyższy kontrast: przygaszony tekst na panelu 4,81 → 7,23:1 (zwykły już ≥ 4,5),
  „dim” 2,55 → 5,93:1; po włączeniu napisy 12 / 12,5 px. `config.json`: zoom 3 → 150 %, 0,2 → 90 %, „abc” → 100 %.
- Widać: `zoom` 1,23 w `config.json` → suwak „123%”, współczynnik okna 1,23 (nie 120 %); przy wyższym kontraście zostaje jeden napis 10 px:
  podpowiedź skrótu „Ctrl K” w przycisku „Komendy” (`kbd`) na każdym ekranie.
- Oczekiwane: „1,23 → 120 %” i „najmniejsze napisy 12 px”.
- Zrzut: US.23-kontrast.png

### US.24 – ZGODNE
- Próg „po 1 min”, bezczynność systemu 61 s (`FI_SYSTEM_IDLE`): od razu pasek „Kwoty ukryte · Pokaż na 5 min · do końca sesji”, „•••” na
  Mostku (Osłony ••• zł / ••• zł), w szybkim wpisie („energia dziś ••• zł”, „Energia dziś: ••• zł → ••• zł”), w panelu odłączonym; na
  dziesięciu ekranach (Ctrl+1…0) jedyna kwota widoczna to stały przykład w opisie Ładowni („OC 1 240 zł rocznie ≈ 103,33 zł”). „Pokaż
  na 5 min”: po 60 / 240 / 290 s kwoty widoczne, po 305 s znowu ukryte (pasek). „Do końca sesji”: po 4 s widoczne; Ctrl+$ kończy
  pokazanie (ukrywa), drugi Ctrl+$ – „Kwoty widoczne.”. „Startuj z ukrytymi kwotami” + ponowne uruchomienie – ukryte od startu;
  `hideIdleMin` 7 – lista pokazuje „po 7 min”. Zrzut US.24-ukryte.png. Dymek zasobnika – maszyna (US.25).

### US.25 – poza laboratorium
- Kto: Maszyna (Win+L, prawdziwa bezczynność).

### US.26 – ZGODNE
- Domyślnie „Zamykaj do zasobnika” włączone: X (zamknięcie okna głównego) chowa je, proces działa. Wyłączone + wpisana zmiana w polu
  nazwy okrętu: proces kończy się kodem 0, a nazwa jest w `fi.json` („Zmiana-w-polu”); po ponownym uruchomieniu zostaje wyłączone.
  Opis instalacji aktualizacji zależny od trybu – NIE DO SPRAWDZENIA (laboratorium mówi o sobie jak wersja przenośna: „nowy plik .exe
  zastępuje obecny po zamknięciu aplikacji”).

### US.27 – ZGODNE
- Wersja 1.15.4, „Ten komputer” DOM-PC, „Format danych v1 (aplikacja obsługuje v1)”, „Wczytanie 1034 wpisy · 922 ms”; opis kopii: „zostaje
  14 dziennych i 8 tygodniowych); przed każdym importem z banku (10 ostatnich) i przed migracją formatu zawsze” (zgodny z D84 C4);
  „Przeskanuj” – „Przeskanowano folder.”; „Pokaż w Eksploratorze” – zapis `path:…\dane`; eksport ZIP – proponowana nazwa
  „Financial-Intel-2026-11-03.zip”, w ZIP 1166 plików w tym 130 z `.history`, bez `backups/`; „Kopia teraz” – „Utworzono kopię: …”; lista
  kopii: rodzaj (ręczna, przed importem, dzienna, tygodniowa), nazwa, rozmiar, data, „Odzyskaj…”. Zrzut US.27.png.

### US.28 – ZGODNE
- 1.15.4 „wersja portable – nowy plik .exe zastępuje obecny po zamknięciu aplikacji, bez instalatora”; adres nieosiągalny – „Brak połączenia
  z GitHubem (praca offline?). Spróbuję ponownie później.” (czerwony, bez toastu i bez kodu technicznego); przełączniki zapisane
  i zostają po ponownym uruchomieniu. Panel „Co nowego” poza aktualizacją nie istnieje (brak wydania) – dla baneru po aktualizacji patrz IN.26.
  Zrzut US.28.png.

### US.29 – ZGODNE
- Fikcyjny `github_pat_TESTFIKCYJNY_…cdef`: „Token GitHub: zapisany …cdef” + „ZASZYFROWANY”; w `config.json` `tokenEncrypted: true`
  i blob base64, w katalogu `userdata` ani w folderze danych ciągu „TESTFIKCYJNY” nie ma; po zapisie status „Brak połączenia
  z GitHubem…”; „Usuń token” – „brak”, `token: null`. Zrzut US.29.png.

### US.30 – ZGODNE
- DOM-PC: ustawienia z każdej zakładki (nazwa okrętu, konto, kategoria, kadłub 7, domownik, nazwisko, powiadomienia + godzina 20:30,
  dźwięk „Awans”, rozmiar 120 %, ukrycie po 15 min, kontrast, zasobnik, aktualizacje, Pobrane, folder kopii) zostają po „Zakończ”
  i ponownym uruchomieniu. LAPTOP na tym folderze: widzi okręt „Trwały”, konta, kategorie, kadłub 7, domowników, nazwiska; ustawienia
  komputera domyślne (powiadomienia, 21:00, 100 %, brak ukrycia, zasobnik włączony, aktualizacje wyłączone, folder kopii domyślny);
  ICTTJ na LAPTOPIE „CZYTANY” z powodu zmiennej `FI_ICTJ_DIR` narzędzia (nie sprawdza podziału). Zrzut US.30-dom.png.

### US.31 – UWAGA
- `fi.json` `schemaVersion: 2`: na Okręt, Konta, Kategorie, Warstwy i rozkazy, Domownicy – „Folder jest tylko do odczytu – ustawienia
  budżetu można tylko oglądać.”, pola budżetu wyłączone; ustawienia komputera (kontrast, powiadomienia) działają i zapisują się.
- Widać (UWAGA): zakładki „Import z banku” i „ICTTJ” (scenariusz) mają ustawienia budżetu, część pól wyłączona (edycja / usuwanie reguł,
  „Dodaj” nazwisko, scenariusz), ale bez tego komunikatu; próba dodania nazwiska kończy się toastem „Folder jest tylko do odczytu –
  zmiany nie są zapisywane.”. Zrzut US.31-import.png.

### US.32 – NIEZGODNE (S)
- Stan: rok; przebiegi us-pola (12:50) i us-liczby (12:55, powtórzenie na świeżym przebiegu).
- Zrobione: w polach Osłony – cel, Kadłub – cel, Linia zanurzenia, Minimalne osłony: wpisanie wartości i Esc, potem kliknięcie w puste
  miejsce.
- Widać: po Esc pole zostaje z wpisaną wartością i fokusem (Osłony „5”, Kadłub „8”, Linia „33”, Minimalne „2”) – w pliku jeszcze stara;
  po kliknięciu obok wpisana wartość zapisuje się (`fi.json`: 5 / 8 / 33 / 2) i zostaje po powrocie na zakładkę.
- Oczekiwane: „Esc cofa wpis i zostawia w Ustawieniach”; nie przechodzi, gdy „Esc zapisuje” (B24).
- Reszta ZGODNA: nazwa konta, kategorii, imię domownika, „Saldo otwarcia”, „Cisza od” – Esc cofa i zostaje w Ustawieniach, Enter
  i wyjście z pola (Ctrl+2) zapisują, zmiana ekranu nie gubi wpisu.
- Zrzut: US.32-liczby.png

### US.33 – UWAGA
- (a) `config.json` z niepoprawnym JSON: laboratorium nie pozwala uruchomić takiego stanu (`start()` parsuje plik); plik zepsuty
  w wyścigu tuż po jego odczycie przez narzędzie, przed odczytem przez aplikację → aplikacja odsunęła go jako
  `config.uszkodzony-20261103T114845397Z.json` i wystartowała z domyślnymi (okno główne, folder z zapisanego `FI_DATA_DIR`). ZGODNE.
- (b) plik zablokowany na wyłączność przy starcie – NIE DO SPRAWDZENIA (narzędzie czyta plik przed startem). Wariant: blokada w trakcie
  pracy (PowerShell, FileShare.None, 30 s) i zmiana rozmiaru: okno pokazuje 120 %, w logu dwa razy „ERROR setMachinePrefs Error: EPERM:
  operation not permitted, rename …”; plik nie został nadpisany domyślnymi (folder danych, `tray` bez zmian) – ale po zwolnieniu pliku
  i 35 s oczekiwania zmiana rozmiaru nie dotarła do pliku (`zoom` 1) i nie ponowiła się; po ponownym uruchomieniu rozmiar wróci do 100 %.
  Czy użytkownik dostał komunikat w oknie – nie sprawdzone.

## Znaleziska

- US.6 – NIEZGODNE (S): brak usuwania nieużywanych kategorii i podkategorii w Ustawieniach (tylko „archiwizuj” / „×”), mimo D95 N-PC-7
  i wpisu w CHANGELOG 1.15.2; po ponownym uruchomieniu „Testowa” wraca jako zarchiwizowana. Zrzut US.6-brak-usuwania.png.
- US.32 – NIEZGODNE (S): w polach liczbowych Ustawień (Osłony – cel, Kadłub – cel, Linia zanurzenia, Minimalne osłony) Esc nie cofa
  wpisu, a opuszczenie pola zapisuje wpisaną wartość (do silnika warstw). Zrzut US.32-liczby.png.
- US.23 – NIEZGODNE (N): `zoom` 1,23 → „123%” zamiast 120 %; przy wyższym kontraście „Ctrl K” w przycisku „Komendy” ma 10 px (nie 12).
  Zrzut US.23-kontrast.png.

## Spostrzeżenia

- Przy starcie aplikacja wysyła naraz 10 powiadomień Windows (odprawa, asteroida, import, dwie raty, domownik, dwa kontenery, debriefing,
  ICTTJ) – zasypywanie; przydałoby się jedno zbiorcze albo odstępy (US.16).
- Brak godziny odprawy porannej (D84 C9) – tylko „przy pierwszym otwarciu okna po ciszy nocnej” (US.16).
- Teksty ustawień: „(3 pensji)” zamiast „(3 pensje)”, „1.0” z kropką w polu „Minimalne osłony”, wartość spoza zakresu w „Kadłub – cel”
  wraca bez słowa, „Ustawienie tego komputera” powiedziane w połowie paneli (US.1, US.7).
- Zmiana ustawienia komputera przy chwilowo zablokowanym `config.json` ginie bez ponowienia i (jak się zdaje) bez komunikatu (US.33).
- „od = do” w ciszy nocnej przyjęte po cichu jako „brak ciszy” (US.9); brak banera „tylko do odczytu” na zakładkach Import z banku i ICTTJ (US.31).
- W lab: Dowództwo pozwala zmieniać rozkazy, punkt US.8 oczekuje „do odczytu” – do ujednolicenia punktu albo specyfikacji (N73 vs D84 C9).
- Selektor scenariusza przy niewybranym folderze ICTTJ: „(scenariusza nie ma w ICTTJ)” (US.13).
- Po „Usuń token” / „Zapisz i sprawdź” brak potwierdzenia słowem „zapisano” poza zmianą wiersza – wystarczające, ale ciche.
- Status „Brak połączenia z GitHubem…” jest czerwony – czerwień ma być dla kwot i alarmów (CLAUDE.md); komunikat sieciowy to nie alarm (do oceny).

## Problemy laboratorium (nie aplikacji)

- `start()` zawsze nadpisuje `FI_ICTJ_APPDATA` (gdy brak `ictjDir`) i nie ustawia go wcale przy `ictjDir` – aplikacja czyta wtedy prawdziwy
  `%APPDATA%\ICT Trade Journal\config.json` użytkownika (tylko odczyt) i pokazuje jego folder w podpowiedzi „Użyj tego folderu”.
  Podpowiedzi z fikstury (US.13) nie da się sprawdzić bez zmiany `lab.ts`.
- `start()` parsuje `config.json` przed uruchomieniem: niepoprawny JSON albo plik zablokowany na wyłączność przerywają narzędzie, zanim
  powstanie aplikacja (US.33 wymagało wyścigu zapisu po starcie narzędzia).
- Okna aplikacji w laboratorium mają `prefers-reduced-motion: reduce` (animacje 1 ms) – czasy (IN.24) mierzone z `emulateMedia`.
- ICTTJ jest zainstalowany na tym komputerze – „Zainstalowany: …\ICT Trade Journal.exe” (rejestr / `%LOCALAPPDATA%`), więc punkt „bez .exe”
  (US.14) nie do wykonania.
- `FI_UPDATE_URL` ustawia `launch()` domyślnie na adres nieosiągalny (log: `net::ERR_UNSAFE_PORT`); sprawdzanie aktualizacji w laboratorium
  nigdy nie dociera do GitHuba.
- Wyjątek skryptu przy niezatwierdzonym polu zostawia aplikację, która nie zamyka się w 40 s (`Aplikacja nie zamknęła się w 40 s`) –
  narzędzie ją kończy (`killTree`); nie błąd aplikacji.
