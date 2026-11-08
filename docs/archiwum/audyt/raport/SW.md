# Raport AU-4 – SW: szybki wpis

- Data: 03.11.2026, 11:08–11:43 (czas warszawski). Przebiegi: `sw-a` … `sw-k`, `sw-30` (`C:\FI-audyt\przebiegi\sw-*`).
- Wersja: 1.15.4 z GitHub Releases (`C:\FI-audyt\wydanie\1.15.4`). Okno szybkiego wpisu otwierane przez
  `window.fi.quickOpen()`, przycisk Mostka i paletę. Skrypty: `tests/audyt/sw-*.spec.ts`, pomoc `tests/audyt/sw-pomoc.ts`.
- Stan danych: persona `rok` (kotwica 2026-11-03), komputer `AUDYT` (świeże `userData`). Persona nie ma wszystkich
  danych z przykładów punktów, więc część punktów idzie na **stanach szczególnych**, zrobionych na kopii przed startem:
  - **+domownicy** (`addMembers`): w `fi.json` dopisani domownicy z przykładów punktów, z saldem na start rozliczeń:
    Tata (pytaj, ma oddać 180,00), Mama (przez Tatę, pytaj, ma oddać 90,00), Ania (przychód), Łukasz (zaliczka 50,00),
    Babcia (pytaj). Mostek pokazał salda zgodnie z tym, co dopisano.
  - **+tagi**: tag „Wakacje Chorwacja” na Lody Grycan z 30.10, „Remont” na Drogeria Natura z 23.10.
  - **+reguły** (SW.25): reguła importu „MOKKA DWORZEC” → Jedzenie · kawa i przekąski; reguła „Netia” →
    Subskrypcje i łączność · internet, a ta podkategoria zarchiwizowana.
  - **+konto archiwalne** (SW.21): konto „Stare konto” z `archived: true`.
  - **Prezenty bez koperty** (SW.6): w kategorii „Prezenty i inne” koperta ustawiona na „brak” (`envelope: null`).
  - **Próg 0** (SW.18): próg dziennika 0.
  - **Tylko do odczytu** (SW.34): (a) `fi.json` z `schemaVersion: 2`, (b) atrybut R (`attrib +R /S /D`),
    (c) bez folderu.
- Odczyty liczb: `C:\FI-audyt\odczyty\sw.jsonl` (20 wpisów). Zrzuty: `C:\FI-audyt\zrzuty\SW.*.png`.

**Podsumowanie (34 punkty „Kto: Claude”):** LICZBY → AU-9: 14 · ZGODNE: 14 · NIEZGODNE: 4 (S ×4) · UWAGA: 1 ·
DO OCENY: 1 · NIE DO SPRAWDZENIA: 0 (jeden wariant SW.3 – poza laboratorium). Poza laboratorium (Maszyna): SW.2, SW.20.

---

### SW.1 – LICZBY → AU-9
- Stan: rok, przebieg sw-a, 11:11.
- Widać: okno 440×600 bez ramki, zawsze na wierzchu; „Szybki wpis · energia dziś 77,28 zł” (Mostek „77,28 zł”); kursor
  w „Kwota”; „Wydatek” zaznaczony, obok „Wpływ”, „Za domownika”; „Gdzie” z podpowiedzią „sklep, usługa, osoba”;
  „— bez kategorii —”; „03.11.2026”, „11:11” (teraz); „Notatka”, „Tagi”; stopka „Enter – zapisz · Ctrl+Enter – zapisz
  i następny · Esc – zamknij” i „Zapisz”. Przycisk na Mostku i paleta („Szybki wpis (okno nad wszystkimi)”) otwierają
  to samo okno: w aplikacji są cały czas 2 okna.
- Konto: przy pierwszym otwarciu na tym komputerze jest „mBank” (pierwsze). Po zapisie szybkiego wpisu na Portfelu XTB
  (SW.4) następne otwarcie proponuje „Portfel XTB”. To ostatnio użyte konto zapamiętuje komputer (zob. Spostrzeżenia).
- Przycisk na Mostku ma napis „Szybki wpis” bez skrótu, bo w laboratorium skrót jest wyłączony. Po ustawieniu skrótu
  (SW.3) napis brzmi „Szybki wpis · Ctrl+Alt+K”.
- Zrzut: SW.1.png.

### SW.2 – poza laboratorium (Maszyna)

### SW.3 – ZGODNE
- Stan: rok, przebiegi sw-i i sw-i-kreator (nowy folder → kreator, krok 7), 11:40. Laboratorium podstawia w procesie
  głównym `globalShortcut`, więc żaden skrót nie zostaje zarejestrowany w systemie.
- Widać (Ustawienia → Powiadomienia i dźwięki oraz kreator, krok 7 – w obu miejscach tak samo):
  - Ctrl+Alt+S: „Ctrl+Alt+S to w polskim układzie AltGr+S („ś”) – skrót zabrałby ten znak wszystkim programom. Wybierz
    inną literę albo cyfrę, np. Ctrl+Alt+B.”, a pole zostaje w trybie „Naciśnij skrót…”;
  - Ctrl+Alt+Shift+E: „… AltGr+Shift+E („Ę”) …”;
  - Ctrl+Alt+K: przyjęty („Ctrl+Alt+K”), w `config.json` zapisane `Control+Alt+K`, przycisk na Mostku „Szybki wpis ·
    Ctrl+Alt+K”.
- Wariantu z `config.json` ze skrótem Ctrl+Alt+A nie sprawdzono (NIE DO SPRAWDZENIA w laboratorium): start
  zarejestrowałby w systemie prawdziwy skrót Ctrl+Alt+B. Ten wariant zostaje dla maszyny.
- Zrzuty: SW.3-ustawienia-ctrl-alt-s.png, SW.3-kreator-ctrl-alt-s.png, SW.3-ustawienia.png.

### SW.4 – LICZBY → AU-9
- Stan: rok, sw-a, 11:11. Zrobione: 23,40, „Żabka”, Jedzenie · kawa i przekąski, Portfel XTB, Enter; Mostek; Operacje;
  zamknięcie aplikacji i ponowny start na tym samym `userData`.
- Widać: w stopce „Zapisano.”, okno znika. Powstał jeden plik `transactions/2026/2026-11-03_01M6GE8Y7TVGK9F83JPBC6PF1E.json`
  z `amount: -2340`, kategorią, kontem, `date 2026-11-03`, `time 11:11`, `updatedBy: AUDYT`. Energia na Mostku
  77,28 → 53,88 zł, a na górze „Ostatnich operacji” „03.11 Żabka … −23,40”. W Operacjach wiersz „03.11 wt 11:11 Żabka
  Portfel XTB Jedzenie · kawa i przekąski −23,40”, edytor z przyciskiem „Historia”. Po ponownym starcie operacje sesji
  dalej są na liście.
- Zamiast „Zakończ” z zasobnika użyto `app.close()`, bo w laboratorium menu zasobnika jest nieosiągalne.
- Zrzuty: SW.4-zapisano.png, SW.4-mostek.png, SW.4-operacje.png.

### SW.5 – LICZBY → AU-9
- Stan: rok, sw-a, 11:11.
- Widać: 50,00 Jedzenie – „Energia dziś: 53,88 zł → 3,88 zł”; bez kategorii – ten sam podgląd; 500,00 –
  „… → −446,12 zł” na czerwono (`text-down`). Po zapisie 50,00 Jedzenie Mostek pokazuje „3,88 zł”.
- Zrzut: SW.5-ponad-energie.png.

### SW.6 – LICZBY → AU-9
- Stan: rok (sw-a, 11:11) i rok + Prezenty bez koperty (sw-f, 11:31).
- Koperta planowa: Auto · paliwo 200,00 – „Koperta Auto: 650,00 zł → 450,00 zł”; 700,00 – „Koperta Auto: 650,00 zł →
  −50,00 zł” na czerwono. Energia dziś bez zmian (3,88). Po zapisie koperty Auto „700,00 / 650,00 zł”.
- Kategoria z kopertą „brak”: Prezenty i inne · prezenty 100,00 – „Poza kopertami 100,00 zł – energia dziś bez zmian
  (zmniejsza energię miesiąca: 6 204,63 zł → 6 104,63 zł).”; 7 000,00 – „… 6 204,63 zł → 0,00 zł; z osłon 795,37 zł).”
  na czerwono. Po zapisie energia dziś 77,28 bez zmian, energia miesiąca 6 104,63 zł.
- Kategoria planowa bez limitu w planie miesiąca (Subskrypcje i łączność, wariant persony): podgląd „Koperta
  Subskrypcje i łączność: bez limitu w tym miesiącu”. Energia dziś bez zmian, energia miesiąca −100,00
  (5 431,23 → 5 331,23).
- Zrzuty: SW.6-auto.png, SW.6-poza-kopertami-brak.png, SW.6-z-oslon.png, SW.6-poza-kopertami.png.

### SW.7 – LICZBY → AU-9
- Stan: rok, sw-a, 11:12.
- Widać: po „wczoraj” – „02.11.2026”, godzina pusta, przycisk „wczoraj” znika; podgląd „Energia dziś: 3,88 zł → −1,12 zł
  (wydatek z 02.11 – rozłożony na pozostałe dni)”, czyli X − Y = 5,00 = 140 / 28 dni. Dla 28.10 – „Wydatek z innego
  miesiąca – energia dziś bez zmian.”. Dla 06.11 – „Data w przyszłości – energia dziś bez zmian.” i znaczek
  „w przyszłości – do salda od 06.11”. Po zapisie (02.11) Mostek pokazuje „−1,12 zł”.
- Zrzuty: SW.7-wczoraj.png, SW.7-przyszlosc.png.

### SW.8 – LICZBY → AU-9
- Stan: rok + domownicy, sw-b, 11:14.
- Widać: po „Wpływ” etykieta „Od kogo”, wiersza kategorii nie ma; podgląd „Wpływ – dokuje w warstwach okrętu.”. Po
  Enter nie ma okna dokowania (0 okien dialogowych), w „Ostatnich operacjach” „03.11 Pracodawca Testowy +1 000,00” na
  zielono (`text-up`). Osłony 13 000,00 → 14 000,00 zł (poniżej celu 19 500, więc całość trafia do osłon); kadłub
  i cele bez zmian, energia dziś 77,28 bez zmian.
- Zrzuty: SW.8.png, SW.8-mostek.png.

### SW.9 – LICZBY → AU-9
- Stan: rok + domownicy, sw-b, 11:14.
- Widać: Tata 300,00 – przełącznik domyślnie na „przychód”, po wybraniu „zaliczka”: „Od: Tata – wyrównuje 180,00 zł
  (ma oddać 180,00 zł), reszta 120,00 zł jako zaliczka (depozyt).”. Po zapisie na Mostku „Tata zaliczka – czeka na
  wydatki 120,00 zł”, depozyt domowników 4 897,20 → 5 017,20, osłony 14 050,00 → 14 230,00. Radar: „Tata / zaliczka
  (depozyt) / 120,00 zł / zwrot do przypisania: 180,00 zł – wskaż zakupy w Meldunkach” (zob. Spostrzeżenia).
  Ania 300,00 – „Od: Ania – 300,00 zł jako przychód (dokuje).”, osłony +300,00.
- Zrzuty: SW.9-tata.png, SW.9-ania.png.

### SW.10 – ZGODNE
- Stan: rok + domownicy, sw-b, 11:14 (Babcia „pytaj” zamiast Mamy).
- Widać: wpływ od Babci bez ruszania przełącznika (stoi na „przychód”) – „Od: Babcia – 50,00 zł jako przychód
  (dokuje).”. W Ustawieniach Babcia dalej „pytaj”. Drugi wpływ z „zaliczka” – w Ustawieniach „Babcia: zaliczka”.

### SW.11 – LICZBY → AU-9
- Stan: rok + domownicy, sw-c, 11:16.
- Widać: wiersz „W tym za Mama” z pustym polem i podpowiedzią „ma oddać 90,00 zł”. Przy 500,00 w polu Mamy podgląd
  „Części innych osób przekraczają kwotę.”, a Enter daje „Części innych osób przekraczają kwotę wpłaty.” (bez pliku).
  Przy 90,00: „Od: Tata – wyrównuje 180,00 zł (ma oddać 180,00 zł), reszta 130,00 zł jako przychód (dokuje).” i
  „W tym za: Mama – wyrównuje 90,00 zł (ma oddać 90,00 zł).”. Po zapisie Tata i Mama znikają z należności, przelew ma
  `memberId` Taty i część Mamy 90,00. Osłony +400,00.
- Zrzuty: SW.11-wiersz.png, SW.11-wariant.png, SW.11-podglad.png.

### SW.12 – UWAGA
- Stan: rok + domownicy, sw-c (11:16) i potwierdzenie w sw-k (11:36).
- Zrobione: „Za domownika”, 120,00, Jedzenie, „Finansuje” Łukasz, Enter; potem „— wybierz domownika —”.
- Widać: „Finansuje Łukasz: 120,00 zł – nie zjada energii; z zaliczki 50,00 zł; pożyczają osłony 70,00 zł, ma
  oddać.”. Po zapisie energia (77,28) i koperty bez zmian, „Łukasz ma oddać … 70,00 zł”, zaliczka 0, osłony
  13 400,00 → 13 330,00. Bez osoby odmowa „Wybierz domownika, który finansuje zakup.” i nic się nie zapisuje.
- Uwaga (tekst): gdy w polu jest „— wybierz domownika —”, podgląd mówi „Finansuje Anna: 120,00 zł – nie zjada energii;
  z zaliczki 120,00 zł.”. Pokazuje więc pierwszą osobę z listy i jej zaliczkę, choć nikt nie jest wybrany. Potwierdzone
  na drugim przebiegu.
- Zrzuty: SW.12.png, SW.12-bez-osoby.png.

### SW.13 – LICZBY → AU-9
- Stan: rok + domownicy, sw-c, 11:16.
- Widać: dymek „Prezent: nic nie jest winna / winien – najpierw z zaliczki, resztę pokrywają osłony”; podgląd
  „Prezent od Babcia: 200,00 zł – nie zjada energii; osłony 200,00 zł, nikt nic nie jest winien.”. Po zapisie Babcia
  nie ma należności, energia i koperty bez zmian, osłony 13 330,00 → 13 130,00.
- Zrzut: SW.13.png.

### SW.14 – LICZBY → AU-9
- Stan: rok + domownicy, sw-c, 11:16.
- Widać:
  - równo 90,00: części 30,00 / 30,00 / 30,00, „Energia dziś: 77,28 zł → 47,28 zł”, „Finansuje Ania: 30,00 zł …”,
    „Finansuje Łukasz: 30,00 zł …”;
  - procenty 50 / 30 / 10: „razem 90 % – ostatnia osoba bierze resztę do 100 %”, Enter daje „Procenty osób muszą dać
    razem 100 %.” (bez pliku);
  - kwoty Ania 25,00 i Łukasz 25,00: „ja – reszta 40,00 zł”, energia −40,00;
  - 100,01 równo: 33,33 / 33,33 / 33,35, suma 100,01, reszta groszy w ostatniej części.
- Po zapisie energia 43,95 (jak w podglądzie), „Ania ma oddać 33,33 zł”, Łukasz 70,00 → 103,35.
- Zrzuty: SW.14-rowno.png, SW.14-procenty.png, SW.14-kwoty.png, SW.14-100-01.png.

### SW.15 – LICZBY → AU-9
- Stan: rok, sw-d, 11:24.
- Widać: dymek „+”: „Podziel paragon: kilka kategorii albo część domownika”. Pierwsza część przejmuje 187,45 i
  Jedzenie. Po wpisaniu 150,00 w pierwszej części pojawia się „nierozdzielone: 37,45 zł”, a „+ część” dodaje część
  37,45. „bez podziału” wraca do jednej kategorii (Jedzenie). Przy sumie 180,00 widać „nierozdzielone: 7,45 zł”, a
  Enter daje „Części paragonu nie sumują się do kwoty.” (bez pliku). Po poprawce podgląd „Energia dziś: 77,28 zł →
  −72,72 zł” i „Koperta Dom: 300,00 zł → 262,55 zł”. Po zapisie Mostek pokazuje −72,72, „Dom … 37,45 / 300,00 zł”,
  a w Operacjach „Biedronka mBank 2 części −187,45”.
- Zrzuty: SW.15-plus-czesc.png, SW.15-niezgodna-suma.png, SW.15-podglad.png, SW.15-operacje.png.

### SW.16 – LICZBY → AU-9
- Stan: rok + domownicy, sw-c, 11:17.
- Widać: przy każdej części wybór osoby z domyślnym „ja”. Podgląd „Energia dziś: 43,95 zł → −36,05 zł” (−80,00) i
  „Finansuje Ania: 40,00 zł – nie zjada energii; pożyczają osłony 40,00 zł, ma oddać.”. Po zapisie Ania ma oddać
  33,33 → 73,33, energia −36,05, Jedzenie +80,00. Część Ani (Osobiste, koperta codzienna) nie zmniejszyła energii.
- Zrzut: SW.16.png.

### SW.17 – ZGODNE
- Stan: rok, sw-d. Widać: po przełączeniu na „Wpływ” części znikają, a podgląd brzmi „Wpływ – dokuje w warstwach
  okrętu.”. Enter daje „Zapisano.”, plik ma wpływ +60,00 bez `splits`.

### SW.18 – ZGODNE
- Stan: rok (sw-d, 11:24) i próg 0 (sw-f, 11:32).
- Widać: przy 199,99 sekcji dziennika nie ma. Przy 200,00 jest „DZIENNIK KAPITAŃSKI · Plan czy impuls? plan / impuls”
  z polem „Krótko: skąd ten zakup?”. Zapis ma `impulse: impulse` i `logNote: wyprzedaż`. W Operacjach wiersz ma znacznik
  „IMPULS”, a w edytorze są „impuls” i „wyprzedaż”. W Wywiadzie (dziennik) „listopad 2026 … 1 · 200,00” w kolumnie
  impuls. Treść wpisu Wywiad pokazuje tylko jako liczbę, nie tekst. Przy wpływie 500,00 sekcji nie ma.
- Próg 0: przy 5 000,00 okno nie pyta; kolumna „bez oznaczenia” w Wywiadzie ma 0 we wszystkich miesiącach.
- Zrzuty: SW.18.png, SW.18-operacje.png, SW.18-wywiad.png, SW.18-prog-0.png, SW.18-prog-0-wywiad.png.

### SW.19 – ZGODNE
- Stan: rok, sw-d, 11:24. Godzinę wpisywano w polu godziny.
- Widać:
  - 22:59 i 05:00: bez znaczka i bez dziennika;
  - 23:00, 23:30, 00:15, 04:59: znaczek „cisza nocna” i „DZIENNIK KAPITAŃSKI” z polem „Zakup w ciszy nocnej – dlaczego
    teraz?” oraz „Potwierdzam zakup w ciszy nocnej (23:00–05:00)”;
  - 00:15: Enter bez niczego i Enter z samym potwierdzeniem dają „Cisza nocna: potwierdź zakup i wpisz krótko, dlaczego
    teraz.”; z potwierdzeniem i notką zapis `time 00:15`, `logNote: pizza po dyżurze`;
  - wpływ o 23:30: bez pytania, zapisany.
- Zrzuty: SW.19-2330.png, SW.19-odmowa.png.

### SW.20 – poza laboratorium (Maszyna)

### SW.21 – LICZBY → AU-9
- Stan: rok + konto archiwalne, sw-a, 11:12.
- Widać: lista kont „mBank, Portfel XTB, Gotówka” (bez „Stare konto”; konta tradingowego persona nie ma). 15,00 na
  Gotówce, Enter; kolejne otwarcie proponuje „Gotówka”. Ctrl+Enter zostawia „Gotówka”. Saldo Gotówki −55,36 → −75,36
  (15,00 + 5,00). Po ponownym uruchomieniu aplikacji dalej proponuje „Gotówka”.

### SW.22 – ZGODNE
- Stan: rok, sw-d, 11:24.
- Widać:
  - data: „dziś” → 03.11.2026, „wcz” → 02.11, „przedwczoraj” → 01.11, „-3” → 31.10, „29.10” → 29.10.2026, „13.11”
    (10 dni naprzód) → 13.11.2025;
  - odrzucone: „15” (pole zostaje 31.10) i „31.02” (pole zostaje 13.11.2025);
  - godzina: „7:5” → 07:05, „25:00” odrzucone (zostaje 07:05), puste – zapis z `time: null`;
  - „wczoraj” – zob. SW.7 (bez godziny, przycisk znika).
- Odrzucenie jest ciche – okno nie pokazuje żadnego komunikatu (zob. Spostrzeżenia).
- Zrzuty: SW.22-31-02.png, SW.22-13-11.png, SW.22-godzina.png.

### SW.23 – ZGODNE
- Stan: rok, sw-d, 11:25.
- Widać:
  - działania i formaty: „12,50+8,30” → 20,80, „3*4,99” → 14,97, „10/3” → 3,33, „100-25,5” → 74,50, „1 234,56” →
    1 234,56, „1234.5” → 1 234,50;
  - odrzucone, z poprzednią wartością w polu: „1.200”, „0,005”, „abc”;
  - „999999,99” → 999 999,99, podgląd „… → −1 000 319,71 zł”;
  - „0” – pole puste, Enter daje „Wpisz kwotę.”;
  - zapis „3*4,99” ma w pliku `-1497`; podgląd zawsze liczy wynik działania.
- Odrzucenie jest ciche – przy „1.200” w polu zostaje poprzednie 1 234,50 bez słowa (zob. Spostrzeżenia).
- Zrzuty: SW.23-1-200.png, SW.23-zero.png.

### SW.24 – NIEZGODNE (S)
- Stan: rok, sw-d (11:25) i potwierdzenie na świeżym przebiegu sw-k (11:36).
- Zrobione: wydatek, Osobiste · ubrania, w „Kwota” „-49,99”, wyjście z pola; potem „20-69,99”; Enter.
- Widać: pole kwoty po wyjściu jest puste, bez podglądu i bez komunikatu (także w głównym oknie). Po Enter jest tylko
  „Wpisz kwotę.”. Nic się nie zapisuje.
- Oczekiwane: zachowanie sensowne – zwrot towaru (ujemny wydatek oddający energię lub kopertę, widoczny w podglądzie)
  albo jasny komunikat, że zwrot wpisuje się w Operacjach. Jest ani jedno, ani drugie: minus znika razem z kwotą, bez
  słowa, a „Wpisz kwotę.” sugeruje, że nic nie wpisano.
- Zrzuty: SW.24.png, SW.24-minus.png, SW.24-enter.png.

### SW.25 – ZGODNE
- Stan: rok + reguły, sw-e, 11:28 (marki z przykładów zastąpione markami persony).
- Widać – kategoria i źródło (dymek „oficer: …”):
  - „Cityfit” (marka tylko z banku) → Zdrowie · sport, „ostatnio u tej marki”;
  - „Mokka” → kawa i przekąski, „ostatnio u tej marki”;
  - „Mokka Dworzec” → kawa i przekąski, „reguła importu”;
  - „Orlen” (ręczny wpis z 01.11 z Auto · serwis) → Auto · serwis, „ostatnio u tej marki”;
  - „Kaufland” → zakupy spożywcze, „sieć ze słownika”;
  - „Lidl” → zakupy spożywcze, ale „ostatnio u tej marki”, bo persona ma LIDL w historii banku;
  - „Netia” (reguła i historia na zarchiwizowanej kategorii) → bez podpowiedzi;
  - „Sklepik u Zosi” → bez podpowiedzi.
- Ręczny wybór (Prezenty i inne · prezenty) zostaje, „oficer: Zdrowie · sport” przyjmuje podpowiedź jednym kliknięciem.
  Na liście kontrahentów (40) każda marka występuje raz (np. „Żabka”, „Biedronka”, „Orlen”, „Lidl”). Osobno są jednak
  „Mokka” / „KAWIARNIA MOKKA” i „Apteka” / „APTEKA DBAM O ZDROWIE” – bez połączenia (aliasu) aplikacja ma je za dwie
  marki (zob. Spostrzeżenia).
- Zrzuty: SW.25-mokka-dworzec.png, SW.25-reczna.png.

### SW.26 – NIEZGODNE (S)
- Stan: rok + tagi, sw-e (11:28) i potwierdzenie na świeżym przebiegu sw-k (11:36).
- Zrobione: „+ #Wakacje Chorwacja”, 54,30, „Gdzie” „Konzum #wakacje-chorwacja” (w potwierdzeniu „Kaufland
  #wakacje-chorwacja”), „Notatka” „#Remont łazienki”, Enter; drugi wpis „Pizzeria #1”; Operacje; Wywiad → Wyprawy.
- Widać – zgodnie z punktem:
  - przycisk „+ #Wakacje Chorwacja” (bez „Remont”, który ma 11 dni), po kliknięciu chip „#Wakacje Chorwacja”;
  - kontrahent „Konzum”; oficer dla „Kaufland #…” podpowiada zakupy spożywcze, więc patrzy na markę bez tagu;
  - notatka zostaje „#Remont łazienki”, a tag „Remont” jest dodany;
  - „Pizzeria #1” zostaje nazwą, bez tagu.
- Błąd: w pliku `tags: ["Wakacje Chorwacja", "wakacje-chorwacja", "Remont"]`. W Wyprawach są dwie wyprawy:
  „#Wakacje Chorwacja 30.10.2026 – 03.11.2026 · 2 operacje 82,90 zł” i „#wakacje-chorwacja 03.11.2026 · 1 operacja
  54,30 zł”. Ten sam zakup liczy się w obu, a w Operacjach wiersz ma „#Wakacje Chorwacja #wakacje-chorwacja #Remont”.
- Oczekiwane: „ten sam tag różnie zapisany to jeden”. Punkt nie przechodzi: „jeden tag zapisuje się jako dwa”. Tagu
  ze spacją nie da się wpisać jako „#słowo”, więc wyprawy z kilku słów zawsze się rozdwoją.
- Zrzuty: SW.26-tagi.png, SW.26-operacje.png, SW.26-wyprawy.png, SW.26-wyprawy-potwierdzenie.png.

### SW.27 – LICZBY → AU-9
- Stan: rok + tagi, sw-k, 11:36. Wcześniej sw-e z tagiem „Remont” – tam tag ostatnich dni zmienił się po SW.26.
- Widać: „wczoraj”, Portfel XTB, „+ #Wakacje Chorwacja”; trzy razy Ctrl+Enter. Stopki: „Zapisano. Dopisano: 1 ·
  energia dziś 76,85 zł”, „… 2 · 76,55 zł”, „… 3 · 75,48 zł”. Okno zostaje, kwota pusta z kursorem. Konto, dzień
  02.11, godzina (pusta), rodzaj i tag zostają; kategoria wraca do „— bez kategorii —”. Czwarty Enter zapisuje i
  zamyka. W folderze są 4 operacje z 02.11 na Portfelu XTB z tagiem. Mostek pokazuje 75,30 = 75,48 − 5,00 / 28.
- Zrzuty: SW.27.png, SW.27-seria.png.

### SW.28 – ZGODNE
- Stan: rok + domownicy, sw-c, 11:17. Wzór: „Za domownika” 45,00 „Kwiaciarnia Róża”, Ania, prezent, z datą wczoraj.
- Widać: dymek „Kwiaciarnia Róża · 45,00 zł”. Formularz po kliknięciu: Za domownika, 45,00, kontrahent, Prezenty i
  inne · prezenty, mBank, Ania, prezent zaznaczony, „03.11.2026 11:17” (dziś i teraz, nie 02.11). Enter zapisuje drugą
  taką operację. Wariant: dymek „wpływ · 50,00 zł”, a formularz to Wpływ, Tata, „zaliczka”, „Od: Tata – 50,00 zł jako
  zaliczka (depozyt).”.
- Zrzuty: SW.28.png, SW.28-wariant.png.

### SW.29 – ZGODNE
- Stan: rok, sw-e, 11:28.
- Widać: 5 przycisków – „Mokka · kawa i przekąski”, „Lody Grycan · kawa i przekąski”, „Apteka · leki”, „Bar pod Lipą ·
  na mieście”, „Żabka · kawa i przekąski” (najnowsze różne pary ręcznych zakupów). Po 9,99 i kliknięciu „Apteka”:
  kwota 9,99 zostaje, „Apteka”, „Zdrowie · leki”, kursor w kwocie. Edytora szablonów nie ma. Po zakupie domownika
  („Księgarnia Domowa”) i wpływie („Zwrot od kolegi”) żadne z nich nie trafia do szablonów.
- Zrzut: SW.29.png.

### SW.30 – ZGODNE
- Stan: rok, sw-30, 11:09–11:43 (czekanie naprawdę, w tle).
- Widać: 64,20, „Rossmann”, 2 części, Esc. Po minucie ten sam szkic z częściami i podglądem oraz „Szkic z poprzedniego
  otwarcia. Wyczyść”. „Wyczyść” daje czysty formularz (03.11, 11:10, kursor w kwocie, 0 części). Po drugim Esc i 31
  minutach formularz jest czysty (11:42), szkicu nie ma. W folderze 0 nowych operacji.
- Zrzuty: SW.30-przed-esc.png, SW.30-po-minucie.png, SW.30-wyczysc.png, SW.30-po-31-min.png.

### SW.31 – NIEZGODNE (S)
- Stan: rok, sw-d (11:25) i potwierdzenie na świeżym przebiegu sw-k (11:36).
- Zrobione: w „Kwota” wpisać 64,20 i bez wychodzenia z pola nacisnąć Esc; otworzyć ponownie. Wariant: najpierw
  „Gdzie” „Rossmann”, potem kwota i Esc.
- Widać: okno się zamyka, ale po ponownym otwarciu kwota jest pusta i szkicu nie ma („szkic 0”). W wariancie wraca
  „Szkic z poprzedniego otwarcia.” z „Rossmann”, ale bez kwoty. Przycisk „×” w tej samej sytuacji zachowuje szkic z
  64,20. Shift+Enter nie zapisuje (okno zostaje, 7,77 w polu), Enter w polu zapisuje wpisane 8,88.
- Oczekiwane: „Esc zawsze zamyka okno (także w trakcie wpisywania kwoty), a szkic czeka (SW.30)”. Esc w polu kwoty
  porzuca wpisaną kwotę, więc szkic nie czeka – inaczej niż przy „×”.
- Zrzuty: SW.31-esc.png, SW.31-esc-wariant.png.

### SW.32 – ZGODNE
- Stan: rok, sw-d, 11:25. Widać: 15,00 i dwa szybkie Enter – 1 operacja; dwuklik „Zapisz” – 1 operacja. Okno
  otwarte zaraz po „Zapisano.” po 2 s dalej jest widoczne, z czystym formularzem i kursorem w kwocie (1 operacja).
- Zrzut: SW.32-ponownie.png.

### SW.33 – NIEZGODNE (S)
- Stan: rok + domownicy, sw-g (11:33) i potwierdzenie na świeżym przebiegu sw-k (11:36).
- Zrobione:
  - (1) w oknie 44,00, Za domownika Ania, Zwierzęta · karma, Portfel XTB; w głównym oknie po kolei: archiwum Portfela
    XTB (Konta), „Archiwizuj” Zwierzęta (Kategorie), archiwum Ani (Domownicy); powrót do okna i Enter;
  - (2) w świeżym przebiegu tylko archiwizacja kategorii Zwierzęta przy wybranym „Zwierzęta · karma”;
  - (3) wszystkie trzy archiwizacje naraz (345 ms): Portfel XTB, Zdrowie, Ania przy „Zdrowie · leki”.
- Widać:
  - (1) jest tylko „Lista domowników się zmieniła – sprawdź wybór.” – wcześniejsze komunikaty o koncie i kategorii
    nadpisał ostatni. Konto zmienione na „mBank”, kategoria pokazuje „— bez kategorii —”, a „Finansuje” samo zmieniło
    się na „Anna” („Finansuje Anna: 44,00 zł – nie zjada energii; z zaliczki 44,00 zł.”). Po Enter plik ma
    `categoryId` Zwierzęta · karma (zarchiwizowana kategoria) i `memberId` Anny.
  - (2) brak jakiegokolwiek komunikatu; pole „— bez kategorii —”, podgląd „Koperta koperta: bez limitu w tym
    miesiącu”. Enter zapisuje operację z kategorią Zwierzęta · karma.
  - (3) „Lista kont i domowników się zmieniła – sprawdź wybór.” (bez „kategorii”). Zapis z kategorią Zdrowie · leki
    (zarchiwizowana), na mBanku, za Annę.
- Oczekiwane: komunikat „Lista kont, kategorii i domowników się zmieniła – sprawdź wybór.”; „nic nie zapisuje się na
  zarchiwizowane konto, kategorię ani osobę bez wyboru użytkownika”. Nie przechodzi: „zapis idzie na wybór spoza listy
  bez komunikatu”. Podkategoria zarchiwizowanej kategorii głównej znika z listy, ale zostaje w szkicu i zapisuje się,
  choć okno pokazuje „— bez kategorii —”.
- Kwota zostaje (44,00), energia w nagłówku aktualna (52,79).
- Zrzuty: SW.33.png, SW.33-kategoria.png, SW.33-trzy.png.

### SW.34 – ZGODNE
- Stan: (a) folder w nowszym formacie, sw-h-a; (b) atrybut R, sw-h-b; (c) bez folderu, sw-h-c; 11:38–11:39.
- Widać:
  - (a) Mostek: „Folder danych ma format v2, a ta wersja aplikacji obsługuje v1. … tylko do odczytu.”; w oknie po Enter
    „Folder jest tylko do odczytu.”, okno i kwota 25,00 zostają, pliku nie ma;
  - (b) atrybut R w Windows nie blokuje nowych plików: „Zapisano.”, plik jest, a główne okno pokazuje „zapisano
    11:39:20” – zgodnie z prawdą;
  - (c) „Otwórz Financial Intel z folderem danych – szybki wpis zapisuje do niego.”.
- Zrzuty: SW.34-tylko-odczyt.png, SW.34-atrybut-mostek.png, SW.34-bez-folderu.png.

### SW.35 – ZGODNE
- Stan: rok + domownicy, sw-g, 11:33.
- Widać: po Ctrl+$ w głównym oknie, bez ponownego otwarcia:
  - nagłówek „energia dziś ••• zł”;
  - podgląd „Finansuje Ania: ••• zł – nie zjada energii; pożyczają osłony ••• zł, ma oddać.”;
  - dymek „Apteka · ••• zł”;
  - „W tym za Mama ma oddać ••• zł” i „Od: Tata – wyrównuje ••• zł (ma oddać ••• zł).”;
  - stopka serii „Zapisano. Dopisano: 1 · energia dziś ••• zł”.
- Wpisywanie kwoty działa (15,50 trafia do podglądu). Pole kwoty po wyjściu z niego też pokazuje „•••”; w trakcie
  pisania widać cyfry.
- Zrzuty: SW.35.png, SW.35-w-tym-za.png, SW.35-seria.png.

### SW.36 – DO OCENY
- Stan: rok + domownicy, sw-g, 11:33. Samą klawiaturą (bez myszy) dopisano 3 zakupy.
- Kolejność Tab od kwoty: kwota → Gdzie → Kategoria → „+” → „wspólnie” → Konto → data → godzina → „wczoraj” → Notatka
  → Tagi → Zapisz → „×” → Wydatek / Wpływ / Za domownika → „Powtórz ostatni” → 5 szablonów → kwota. Tab nie wychodzi z
  okna i nie trafia w niewidoczne pole.
- Klawisze na zakup:
  - Żabka 8,99 – **11** („8,99” Tab „Żabka” Ctrl+Enter; oficer sam ustawia Jedzenie · zakupy spożywcze);
  - Orlen 250,00 z „plan” – **21** (oficer ustawia Auto · paliwo; do „plan” trzeba 10 razy Tab, potem Spacja);
  - Apteka 32,40 – **13** (Enter zamyka).
- Razem 45 klawiszy. Kategorię da się też wybrać z klawiatury: „Zd” w polu kategorii daje „Zdrowie”, strzałka w dół –
  „Zdrowie · leki”. Zapisy w pliku są zgodne (Orlen `impulse: plan`).
- Do oceny przez użytkownika: liczba klawiszy, zwłaszcza 10 × Tab do „plan”.

---

## Znaleziska
- **SW.24 – NIEZGODNE (S):** kwota ujemna („-49,99”, „20-69,99”) znika z pola bez słowa, potem jest tylko „Wpisz
  kwotę.”. Okno nie przyjmuje zwrotu i nie mówi, że zwrot wpisuje się w Operacjach (SW.24.png).
- **SW.26 – NIEZGODNE (S):** „#wakacje-chorwacja” w nazwie i tag „Wakacje Chorwacja” zapisują się jako dwa tagi. W
  Wywiadzie → Wyprawy powstają dwie wyprawy, a zakup liczy się w obu. Tagu ze spacją nie da się wpisać jako „#słowo”
  (SW.26-wyprawy-potwierdzenie.png).
- **SW.31 – NIEZGODNE (S):** Esc w trakcie wpisywania kwoty zamyka okno i porzuca wpisaną kwotę – szkic wraca bez niej
  albo wcale. „×” w tej samej sytuacji kwotę zachowuje (SW.31-esc.png, SW.31-esc-wariant.png).
- **SW.33 – NIEZGODNE (S):** gdy przy otwartym oknie zarchiwizować kategorię główną, okno pokazuje „— bez kategorii —”
  bez komunikatu (albo z komunikatem bez „kategorii”), a Enter zapisuje operację w zarchiwizowanej podkategorii. Przy
  kilku zmianach po kolei komunikat mówi tylko o ostatniej. Zarchiwizowanego domownika zastępuje sam pierwszy z listy
  (Anna, „z zaliczki 44,00 zł”) (SW.33-kategoria.png, SW.33-trzy.png).
- **SW.12 – UWAGA:** przy „— wybierz domownika —” podgląd mówi „Finansuje Anna: 120,00 zł – … z zaliczki 120,00 zł.”
  (SW.12-bez-osoby.png).

## Spostrzeżenia
1. **Ciche odrzucanie wartości w oknie szybkiego wpisu.** Okno nie ma miejsca na komunikaty pól. Komunikaty „Nieprawidłowa
   kwota / data / godzina – zostaje poprzednia.” istnieją w głównym oknie, tu nie widać żadnego (SW.22, SW.23, SW.24).
   Ryzyko: kto poprawia kwotę, wpisując „1.200”, zostaje bez słowa z poprzednią kwotą, a Enter ją zapisze.
   Propozycja: komunikat w stopce okna i podświetlone pole.
2. **Zmiana list przy otwartym oknie (B125)** pokazuje jeden komunikat, który nadpisuje poprzedni. Podkategoria
   zarchiwizowanej kategorii zostaje w szkicu bez pokazania, a podgląd mówi „Koperta koperta: …”. Za zarchiwizowanego
   domownika podstawiana jest pierwsza osoba, która płaci ze swojej zaliczki. Lepiej wyczyścić wybór i wymagać nowego
   (jak „— wybierz domownika —”) oraz łączyć komunikaty.
3. **Domownik „pytaj” nie jest pytany:** przełącznik stoi od razu na „przychód”, więc Enter zapisuje przychód bez
   decyzji (SW.9, SW.10). Pamięć działa (N39), ale to, czy okno pyta, zależy od tego, czy ktoś zauważy przełącznik.
   Propozycja: dla „pytaj” bez wartości domyślnej i odmowa „Wybierz: przychód czy zaliczka”.
4. **Wspólnie – procenty:** podpowiedź „razem 90 % – ostatnia osoba bierze resztę do 100 %”, a podgląd liczy
   ostatniej osobie 18,00 (20 %). Zapis odmawia jednak: „Procenty osób muszą dać razem 100 %.” (SW.14). Trzeba wybrać
   jedno zachowanie.
5. **Tagi z „#”** w Gdzie i Notatce nie są widoczne przed zapisem (żaden chip), a przycisk usunięcia przy chipie jest
   ledwo widoczny – mały pomarańczowy kwadrat, do oceny na SW.26-tagi.png. Wyprawy z kilku słów rozdwajają się
   (SW.26).
6. **Ergonomia „Plan czy impuls?”:** dziennik jest na dole formularza, do „plan” trzeba 10 razy Tab z „Gdzie”.
   Klawisz (np. P / I) albo miejsce zaraz pod kwotą skróciłoby wpis z 21 do ok. 12 klawiszy (SW.36).
7. **Lista kontrahentów** łączy nazwy po marce, ale bez aliasu „Mokka” i „KAWIARNIA MOKKA” albo „Apteka” i „APTEKA DBAM
   O ZDROWIE” są osobno. Nazwy z banku są wielkimi literami („KEBAB ROMA”, „DROGERIA NATURA”), choć są też wpisy ręczne
   tej marki (SW.25). Oficer dla „Żabka” podaje kategorię z banku (zakupy spożywcze), choć ostatni ręczny wpis Żabka był
   „kawa i przekąski”.
8. **Ostatnio użyte konto pamięta komputer, nie folder.** Na drugim komputerze pierwsze otwarcie proponuje pierwsze
   konto (mBank), choć ostatnie wpisy były na Portfelu XTB (SW.1). Do rozważenia przy pracy na dwóch komputerach.
9. **Spłata salda na start a Radar i Meldunki** (do sprawdzenia w DM, por. P.3). Po wpłacie Taty, który miał tylko saldo
   na start (ma oddać 180), Mostek nie pokazuje długu, a podgląd mówił „wyrównuje 180,00 zł”. Radar pokazuje jednak „Tata
   / bez długu / zwrot do przypisania: 180,00 zł – wskaż zakupy w Meldunkach / 1 zakup do oddania”, a Meldunki „Tata:
   zwrot 180,00 zł z 03.11 – wskaż, które zakupy spłaca (do oddania: 1 zakup). Przypisz”. Te trzy komunikaty sobie
   przeczą, a zakupu do wskazania nie ma, bo to saldo na start (stan szczególny „+domownicy”, sw-b i sw-c).
10. **Koperta planowa bez limitu w miesiącu:** podgląd „Koperta X: bez limitu w tym miesiącu” nie mówi, że wydatek
    zmniejsza energię miesiąca, a wariant „Poza kopertami” mówi to wprost (SW.6).
11. **Wywiad → dziennik kapitański** pokazuje oznaczenia tylko jako liczby. Treść wpisu („wyprzedaż”) jest wyłącznie w
    edytorze operacji (SW.18).

## Problemy laboratorium
- Skrót jest w laboratorium wyłączony, więc przycisk na Mostku ma napis „Szybki wpis” bez skrótu. Wariantu SW.3 z
  `config.json` (Ctrl+Alt+A) nie uruchomiono, bo start zarejestrowałby prawdziwy skrót Ctrl+Alt+B. W SW.3 skrypt
  podstawia `globalShortcut` w procesie głównym. `config.json` przebiegu `sw-i` przywrócono na `quickShortcut: ''`.
- „Zakończ” z zasobnika zastąpiono `app.close()`, bo menu zasobnika jest nieosiągalne.
- Persona nie ma danych z przykładów punktów (Tata / Mama / Ania / Łukasz / Babcia, tagi, reguła z aliasem, konto
  archiwalne, kategoria z kopertą „brak”) – dopisano je jako stany szczególne. Marki Dino / Lidl zastąpiono markami
  persony (Cityfit, Kaufland).
- Szkic z poprzedniego otwarcia wraca między punktami tego samego przebiegu, więc skrypty klikają „Wyczyść”
  (`openFresh`). To zachowanie aplikacji (SW.30), nie błąd.
- Folder z atrybutem R (SW.34 b) nie jest dla aplikacji folderem „tylko do odczytu”. Taki stan daje nowszy format
  `fi.json` (wariant a).
