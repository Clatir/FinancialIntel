# Audyt 1.15.4 – punkty, część 4: Dowództwo, Wywiad, rytuały, Raporty i eksport

Zakres: gra (Dowództwo), analizy Wywiadu, rytuały (odprawa, Silver Bullet, raport wachty, wieczorne dopisanie,
debriefing, przegląd roczny, „Miesiąc zamknięty na plus”) oraz ekran Raporty i pliki eksportu – wydanie 1.15.4 na
komputerze (Windows); telefon poza zakresem (D97).

**Legenda pól**
- Nagłówek `PREFIKS.n Tytuł (źródła)`: spec = `docs/specyfikacja.md` (sekcja), D… / T… = `docs/decyzje.md`,
  F… / N… / B… = `docs/przeglad/`, N-PC-… = audyt 1.15.2 (D95), wersja = `CHANGELOG.md`; „brak wymagania” –
  oczekiwanie sensowne dla użytkownika. Oczekiwania pochodzą z wymagań, nie z kodu (kod – tylko nazwy i kroki).
- **Kto:** Claude – laboratorium (Playwright na wydaniu z GitHuba, syntetyczny folder, prawdziwa data, zegar bez
  zmian; czyta zapis powiadomień, otwiera pliki eksportu, nie słyszy dźwięku); Maszyna – Cowork w maszynie wirtualnej
  (zegar tylko do przodu, prawdziwe powiadomienia, zasobnik); Ty – odsłuch, dźwięki, ocena wykresów i tonu, Excel.
  Przy dwóch wykonawcach pierwszy jest główny.
- **Ryzyko:** wysokie / średnie / niskie – skutek błędu dla kapitana.
- **Stan danych:** `pusty`, `start`, `rok`, `brzegi` (persona „Kapitan Testowy”) i warianty niżej. D = dzień
  wygenerowania danych (dzień odczytu, o ile nie napisano inaczej).
- **Odczyt liczb:** liczby zapisywane z datą i godziną do `C:\FI-audyt\odczyty\` (werdykt „liczby → AU-9”).

**Warianty stanów** (wymagania dla generatora – AU-2):
- `start-0` – kreator ukończony dziś bez importu historii (same salda otwarcia, mniej niż 2 niedziele danych).
- `rok-awans` – jak `rok`, oceny dni zapisane do D−3; zamrożenie D−2 dopełnia 30 dni zgodnych z 35 (awans).
- `rok-degradacja` – jak `rok`, w miesiącu D dwa poważne naruszenia już zamrożone, trzecie w dniu D−2.
- `rok-przerwa` – jak `rok`, ostatni zamrożony dzień D−16, ostatni import i ostatni wpis z godziną sprzed D−16.
- `rok-ictj` – jak `rok` z fiksturą ICTTJ: wypłata z wpisem ICTTJ, sparowana w banku w D−3 i niezadokowana.

**Sztuczki bez zmiany zegara (Claude):** godzina wieczornego dopisania (ustawienie komputera, `config.json`) i cisza
nocna (rozkaz w folderze) ustawione względem bieżącej godziny; skrócone czekanie na pierwsze zamrożenie dni gry
(`FI_FREEZE_AFTER_OPEN_MS`, `FI_FREEZE_QUIET_MS` – T199); okno zapisu pliku podstawione przez narzędzie audytu
(pliki do `C:\FI-audyt\eksport\`).

### DW – Dowództwo

#### DW.1 Start gry po kreatorze – Dowództwo od zera (spec „Gra: Dowództwo”, D73, T76, T220, E7)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `start` (kreator dziś); folder z samym saldem otwarcia
- **Jak sprawdzić:** Ctrl+8. Odczytać podtytuł i panele „Stopień”, „Seria”, „Misja tygodnia”, „Osiągnięcia”,
  „Dziennik wachty”. Potem folder z saldem otwarcia, bez kreatora – to samo.
- **Oczekiwany efekt:** podtytuł „gra od <jutro>” (pierwszy pełny dzień po starcie budżetu); Kadet „od startu gry
  (…)” i „Postęp policzy się po pierwszym zamrożonym dniu.”; Seria 0, Rekord 0; „Pierwsza misja w tygodniu od
  <poniedziałek pierwszego pełnego tygodnia gry> …”; „Jeszcze żadnego – wszystkie są ukryte do zdobycia.”,
  „Ukrytych: 13”; dziennik pusty z objaśnieniem o 24 h. Bez kreatora: „gra wystartuje, gdy budżet działa”, „Misje
  ruszą razem z grą.”, brak oceny „Dziś na razie”.
- **Nie przechodzi, gdy:**
  - gra startuje dziś albo od pierwszego dnia zaimportowanej historii;
  - stopień inny niż Kadet, seria ≠ 0 albo „Ukrytych” ≠ 13;
  - bez kreatora gra ocenia dni albo pokazuje misję.

#### DW.2 Historia sprzed startu gry tylko w statystykach (spec „Gra: Dowództwo”, D73)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (2 miesiące importu przed startem budżetu i gry)
- **Jak sprawdzić:** Dowództwo – dziennik wachty i pasek dni (najedź na pierwsze pola); Wywiad – „Wydatki w czasie”
  i „Krzywa majątku” za te same miesiące.
- **Oczekiwany efekt:** żaden wpis dziennika ani ocena nie ma daty sprzed startu gry; pola paska sprzed startu mają
  stan „przed startem gry”; Wywiad pokazuje miesiące sprzed startu (statystyki).
- **Nie przechodzi, gdy:**
  - naruszenie, smaczek albo seria pochodzi z dni sprzed startu gry;
  - Wywiad pomija historię sprzed startu.

#### DW.3 Ocena dnia „na razie” – dzień zgodny i naruszenie (spec „Ocena dnia”, D73, T75)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (dziś wydatki w przydziale)
- **Jak sprawdzić:** Dowództwo → „Seria” → „Dziś na razie”. Szybki wpis: wydatek z kategorii codziennej większy
  niż energia dziś (godzina poza ciszą nocną) → odczyt. Usunąć wpis („Cofnij”) → odczyt.
- **Oczekiwany efekt:** przed wpisem „Dziś na razie: zgodny”; po nim „naruszenie” i „Przydział dnia przekroczony o
  <wydatek − energia dziś> zł”; po „Cofnij” znowu „zgodny”. Dopisek o zamrożeniu 24 h po końcu dnia.
- **Nie przechodzi, gdy:**
  - ocena dzisiejsza nie reaguje na wpis albo na „Cofnij”;
  - kwota przekroczenia różni się od energii dziś na Mostku po wpisie.
- **Odczyt liczb:** energia dziś przed i po wpisie (Mostek), kwota przekroczenia.

#### DW.4 Zamrożenie 24 h po końcu dnia – „ocenione do” (spec „Ocena dnia”, T9, T76)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** po pierwszym zamrażaniu odczytać podtytuł Dowództwa i stany trzech ostatnich pól paska dni
  (dymek pola).
- **Oczekiwany efekt:** „ocenione do <D−2>”; D−1 i D – „jeszcze nie zamrożony”; D−2 i wcześniejsze – „zgodny” albo
  „naruszenie”.
- **Nie przechodzi, gdy:**
  - zamrożony jest dzień wczorajszy albo dzisiejszy;
  - D−2 (i dni przed nim od startu gry) nie jest zamrożony po 3 min od otwarcia.

#### DW.5 Zamrożenie dnia o północy po 24 h (spec „Ocena dnia”, T9, T76)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** zegar na D+1 23:58, aplikacja otwarta (w użyciu) – odczyt „ocenione do”; po 00:00 D+2 i kilku
  minutach (T199: 3 min po otwarciu i minuta bez zmian z zewnątrz) – odczyt.
- **Oczekiwany efekt:** przed północą „ocenione do <D−1>”, po północy „ocenione do <D>”; wieczorny wpis z D+1 przed
  północą nie zmienia oceny D.
- **Nie przechodzi, gdy:**
  - D zamarza przed upływem 24 h od swojego końca albo nie zamarza po kilku minutach od północy D+2;
  - zamraża komputer tylko w zasobniku (D86 – nie powinien).

#### DW.6 Późniejsza korekta zamrożonego dnia (spec „Ocena dnia”, T9, CHANGELOG 1.2.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (zamrożony dzień z przekroczeniem przydziału)
- **Jak sprawdzić:** w Operacjach usunąć wydatek, który dał przekroczenie zamrożonego dnia; na innym zamrożonym dniu
  zgodnym dopisać duży wydatek. Odczytać Dowództwo i Mostek. „Cofnij” obu zmian.
- **Oczekiwany efekt:** dziennik wachty, pasek, seria, rekord i stopień bez zmian; budżet (energia dziś, koperty,
  osłony) przeliczony.
- **Nie przechodzi, gdy:**
  - ocena zamrożonego dnia, seria albo stopień się zmienia (np. odebrany awans);
  - budżet nie uwzględnia korekty.
- **Odczyt liczb:** seria, rekord, stopień, energia dziś przed i po korekcie.

#### DW.7 Pierwsze zamrożenie po otwarciu folderu i zaległe dni porcjami (T199, T146, B33, CHANGELOG 1.5.3)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok-przerwa` (bez skróconych czasów)
- **Jak sprawdzić:** otworzyć folder; co 30 s przez 4 min odczytywać „ocenione do”; w tym czasie przełączać ekrany
  i otworzyć szybki wpis.
- **Oczekiwany efekt:** przez pierwsze 3 min bez nowych zamrożonych dni; potem dni zamarzają po kolei w tle, okno
  odpowiada bez zawieszania; na końcu „ocenione do <D−2>”.
- **Nie przechodzi, gdy:**
  - dni zamarzają od razu po otwarciu (przed synchronizacją OneDrive);
  - okno zamiera na dłużej niż ok. 1 s albo zamrażanie staje przed D−2.

#### DW.8 Dzień z niezadokowaną wypłatą z ICTTJ czeka (T163, CHANGELOG 1.5.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok-ictj`
- **Jak sprawdzić:** Dowództwo – stan pola D−3 i „ocenione do”; zadokować wypłatę (Mostek → „Dokowanie”) → po
  zamrażaniu odczyt.
- **Oczekiwany efekt:** przed dokowaniem D−3 i dni po nim „jeszcze nie zamrożony” (najwyżej 7 dni); po dokowaniu
  zamarzają; dzień ocenia stan z pulą wypłaty.
- **Nie przechodzi, gdy:**
  - dzień z parą wypłaty zamarza przed dokowaniem (przed upływem 7 dni);
  - gra czeka dłużej niż 7 dni albo nie rusza po dokowaniu.

#### DW.9 Przekroczony przydział dnia – naruszenie zwykłe (spec „Stopnie”, D17, D73, T75)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (zamrożony dzień z przekroczeniem przydziału)
- **Jak sprawdzić:** dziennik wachty pod datą tego dnia; „Poważne naruszenia …” w panelu „Stopień”; seria.
- **Oczekiwany efekt:** wpis „Przydział dnia przekroczony o X zł” bez plakietki „poważne”; seria przerwana tego dnia;
  licznik poważnych bez zmiany. X = wydatki dnia z kopert codziennych (i bez kategorii) − energia dziś tego dnia.
- **Nie przechodzi, gdy:**
  - zwykłe przekroczenie liczy się do degradacji albo nie przerywa serii;
  - X różni się od wyroczni.
- **Odczyt liczb:** X, data, seria przed i po tym dniu.

#### DW.10 Koperta planowa – próg poważnego przekroczenia 20 % (spec „Stopnie”, D73, T75, T216, N67, N102)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `brzegi` (koperta planowa Auto 500 zł; koperta 0 zł)
- **Jak sprawdzić:** w jednym dniu wydatki Auto do 590 zł (18 %), w innym do dokładnie 600 zł (20 %), w trzecim do
  610 zł (22 %); wydatek w kopercie 0 zł; wydatek ponad podział koperty codziennej. Odczyt „Dziś na razie”, dziennika
  po zamrożeniu (historia `brzegi`) i koloru alarmu odprawy.
- **Oczekiwany efekt:** 18 % i 20 % – „Koperta przekroczona: Auto – ponad limit o …” (zwykłe); 22 % – „Koperta
  przekroczona ponad próg: Auto …” z „poważne”; koperta 0 zł – tylko zwykłe; koperta codzienna – bez naruszenia
  koperty (ocenia przydział dnia). Czerwony alarm odprawy dokładnie tam, gdzie poważne naruszenie gry.
- **Nie przechodzi, gdy:**
  - 20 % daje poważne albo 22 % zwykłe;
  - alarm odprawy i gra różnią się progiem (także po zmianie progu w Dowództwie);
  - koperta codzienna ponad podział daje naruszenie koperty.
- **Odczyt liczb:** limit, wydane, kwota „ponad limit o”.

#### DW.11 Osłony poniżej minimum – z decyzji, nie przez pensję (spec „Stopnie”, T16, T75, T161, T219, B84)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `brzegi` (osłony blisko minimum 1 pensji)
- **Jak sprawdzić:** historia: (a) dzień, w którym duży wydatek ponad energię zepchnął osłony pod minimum; (b) 1. dzień
  miesiąca, gdy pod minimum zepchnęła je pensja; (c) zakup sfinansowany przez domownika (pożyczka z osłon) pod minimum.
- **Oczekiwany efekt:** (a) „Osłony (bufor na pensje) poniżej minimum o X zł” z „poważne”; (b) i (c) bez naruszenia.
  Minimum liczone jako min(minimum, cel osłon) × pensja.
- **Nie przechodzi, gdy:**
  - pensja albo zakup za domownika daje naruszenie;
  - decyzja kapitana pod minimum przechodzi bez naruszenia;
  - X nie jest brakiem do minimum.
- **Odczyt liczb:** osłony na koniec dnia, minimum, X.

#### DW.12 Dopłata do XTB wbrew firewallowi (spec „Zasięg i firewall”, D23, D59, T31, T75, T224)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `brzegi` (kadłub niepełny; jedna dopłata przy pełnych)
- **Jak sprawdzić:** historia: dopłata do XTB przy niepełnym kadłubie; dopłata z „wolnego do decyzji” przy pełnych
  osłonach i kadłubie; dopłata przy wyłączonym rozkazie firewall (Ustawienia → Warstwy i rozkazy).
- **Oczekiwany efekt:** pierwsza – „Dopłata do XTB wbrew firewallowi: X zł” z „poważne” (i czerwony alarm odprawy);
  druga i trzecia – bez naruszenia (trzecia z tekstem, że dopłata nie jest sprawdzana).
- **Nie przechodzi, gdy:**
  - dopłata z wolnego przy pełnych warstwach daje naruszenie;
  - wyłączony rozkaz nadal daje naruszenie albo włączony – nie.

#### DW.13 Zakup w ciszy nocnej (spec „Stopnie”, D40, T187, T161, N10, N-PC-19)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` / `brzegi` (cisza 23:00–5:00)
- **Jak sprawdzić:** historia i dziś (cisza nocna przesunięta na bieżącą godzinę): zakup 23:40 z wpisem w dzienniku
  („impuls”); zakup 00:30 oznaczony „plan”; płatność kontenera nocą; nocny zakup sfinansowany przez domownika; zakup z
  importu (bez godziny); edytor – godzina w ciszy bez wpisu.
- **Oczekiwany efekt:** potwierdzony zakup 23:40 – „Zakup w ciszy nocnej: <kontrahent> X zł” z „poważne”; import i
  część domownika – bez naruszenia; godzina w ciszy bez wpisu – edytor prosi o potwierdzenie albo usunięcie godziny.
  Zakup „plan” i płatność kontenera – według rozstrzygnięcia wątpliwości (spec: każdy potwierdzony zakup jest
  poważny; D95 / N-PC-19: planowany nie) – odnotować, co robi aplikacja.
- **Nie przechodzi, gdy:**
  - operacja z importu albo część domownika daje naruszenie;
  - potwierdzony zakup impulsowy nocą przechodzi bez naruszenia;
  - nocna godzina zapisuje się bez potwierdzenia.

#### DW.14 Ładunek ponad linią zanurzenia (D73, T75, T227, B89)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (linia 40 %; kontener dodany i podniesiony ponad nią)
- **Jak sprawdzić:** historia: dzień dodania kontenera ponad linię; dzień podniesienia kwoty; zmiana nazwy kontenera
  1. dnia miesiąca; kolejne dni z ładownią nadal ponad linią.
- **Oczekiwany efekt:** naruszenie zwykłe w dniu dodania i w dniu podniesienia: „Ładunek (stałe koszty) ponad linią
  zanurzenia: <nazwa> – ładownia X zł miesięcznie”; zmiana nazwy i kolejne dni – bez naruszenia.
- **Nie przechodzi, gdy:**
  - naruszenie trafia na dzień przed zmianą albo powtarza się każdego dnia;
  - zmiana nazwy daje naruszenie.

#### DW.15 Zakup za domownika a gra (D80 f, T161)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (domownik z zaliczką i bez)
- **Jak sprawdzić:** dziś szybki wpis „zakup za domownika” większy niż energia dziś, nocą (cisza przesunięta),
  oznaczony „impuls”; potem wspólny zakup z moją częścią 30 %. Odczyt „Dziś na razie” i energii.
- **Oczekiwany efekt:** zakup za domownika – bez naruszenia, bez Judas Swing, energia bez zmian; wspólny zakup –
  ocena i smaczki liczą tylko moją część.
- **Nie przechodzi, gdy:**
  - zakup za domownika daje naruszenie, smaczek albo zjada energię;
  - wspólny zakup liczy całą kwotę.

#### DW.16 „Pokryj z koperty…” a ocena dnia (F28, D87, T279)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `brzegi` (przekroczona koperta planowa, inna z zapasem)
- **Jak sprawdzić:** dziś przekroczyć kopertę Auto, „pokryj z koperty…” z koperty Dom → „Dziś na razie”; historia:
  pokrycie zrobione dzień wcześniej i wydatek kolejnego dnia.
- **Oczekiwany efekt:** pokrycie z tego samego dnia nie zdejmuje naruszenia (dzień oceniany wg limitów sprzed
  pokrycia); pokrycie z wcześniejszego dnia już się liczy; dziennik wachty pokazuje „Pokrycie przekroczenia: Auto z
  koperty Dom – X zł limitu”.
- **Nie przechodzi, gdy:**
  - pokrycie z dnia oceny kasuje naruszenie;
  - pokrycia brak w dzienniku albo kwota różni się od zapisanej.

#### DW.17 Seria, rekord i pasek dni (spec „Seria, misje i osiągnięcia”, D73)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (rekord większy niż bieżąca seria)
- **Jak sprawdzić:** Dowództwo → „Seria”: liczby „Seria” i „Rekord”, stany pól paska (dymki z datą).
- **Oczekiwany efekt:** seria = kolejne zgodne dni zamrożone do „ocenione do”; rekord = najdłuższa seria od startu
  gry; naruszenie zwykłe i poważne zeruje serię; dzień bez wpisów jest zgodny; pasek to ostatnie dni okna awansu
  w kolejności dat.
- **Nie przechodzi, gdy:**
  - seria albo rekord różnią się od wyroczni;
  - dzień bez wpisów przerywa serię albo dzisiejszy, niezamrożony dzień ją zmienia.
- **Odczyt liczb:** seria, rekord, liczba pól „zgodny” i „naruszenie” na pasku.

#### DW.18 Awans – 30 dni zgodnych z 35, od ostatniej zmiany stopnia (spec „Stopnie”, D73, T77)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (co najmniej dwa awanse i degradacja w historii)
- **Jak sprawdzić:** panel „Stopień”: nazwa, „od <data>”, „Do stopnia <dopełniacz> N / 30”, „dni zgodne N (od DD.MM do
  DD.MM) + misje M”; dziennik – wpisy „Awans: …” i „Degradacja: …”.
- **Oczekiwany efekt:** stopień i daty awansów zgodne z wyrocznią (kolejność Kadet → Chorąży → Porucznik → Komandor →
  Kapitan → Admirał); okno = ostatnie 35 dni, ale nie wcześniej niż dzień po ostatniej zmianie stopnia; awans w dniu
  osiągnięcia progu; po awansie licznik od zera; „Do stopnia porucznika” w dopełniaczu.
- **Nie przechodzi, gdy:**
  - awans przy 29 dniach albo jego brak przy 30;
  - okno sięga przed ostatnią zmianę stopnia;
  - postęp przekracza próg albo Admirał ma „Do stopnia …” zamiast „Najwyższy stopień floty.”.
- **Odczyt liczb:** stopień, data od, N, M, daty awansów i degradacji z dziennika.

#### DW.19 Wykonana misja skraca drogę o 3 dni (spec „Seria, misje…”, D38, D73, T77)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok-awans` w odmianie 27 dni zgodnych + 1 misja wykonana
  (niedziela misji w oknie)
- **Jak sprawdzić:** odczyt postępu przed zamrożeniem D−2 i po nim.
- **Oczekiwany efekt:** „+ misje 3” w postępie; 27 + 3 = 30 daje awans w dniu D−2; misja niewykonana nic nie dodaje;
  misja z niedzielą przed oknem się nie liczy.
- **Nie przechodzi, gdy:**
  - misja dodaje inną liczbę dni niż próg „Wykonana misja”;
  - liczy się misja spoza okna albo niewykonana.
- **Odczyt liczb:** dni zgodne, misje (dni), data awansu.

#### DW.20 Ekran awansu – animacja, raz na komputer (spec „Seria, misje…”, D35, D42, T80)
- **Kto:** Claude (obraz) · Ty (dźwięk) · **Ryzyko:** średnie · **Stan danych:** `rok-awans`; Maszyna – awans w
  zwykłym dniu po zmianie zegara
- **Jak sprawdzić:** otworzyć folder, poczekać na zamrożenie D−2; zrzut ekranu; Enter; zamknąć i otworzyć aplikację
  ponownie; drugi raz z „Dowództwo” zamiast Enter.
- **Oczekiwany efekt:** okno „Awans: <stopień>” z insygnią, „Stopień od DD.MM.RRRR – dni zgodne z rozkazami
  i wykonane misje.”, przyciski „Do dzieła” i „Dowództwo”, krótka animacja (bez efekciarstwa); Esc / Enter zamyka;
  po ponownym uruchomieniu nie wraca; „Dowództwo” prowadzi do Dowództwa; dźwięk awansu (Ty).
- **Nie przechodzi, gdy:**
  - ekran nie pojawia się albo pojawia się drugi raz po restarcie;
  - animacja długa, migająca, z gradientem albo cieniem (ICTTJ);
  - brak wpisu „Awans: …” w dzienniku.

#### DW.21 Pierwsze otwarcie folderu z historią – bez lawiny świąt (T80)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (świeże dane komputera; zdarzenia gry starsze i
  z ostatnich 14 dni)
- **Jak sprawdzić:** pierwsze uruchomienie na folderze; obserwować ekrany i toasty przez 5 min (z zamrażaniem).
- **Oczekiwany efekt:** zdarzenia sprzed 14 dni nie są świętowane; świętowane najwyżej zdarzenia z 14 dni; kilka
  drobnych naraz (osiągnięcie, misja, degradacja) jako jeden toast „Dowództwo: N nowe wpisy – szczegóły w dzienniku
  wachty.” z przyciskiem do Dowództwa.
- **Nie przechodzi, gdy:**
  - seria ekranów awansu za cały rok;
  - kilkanaście osobnych toastów.

#### DW.22 Degradacja przy 3. poważnym naruszeniu w miesiącu (spec „Stopnie”, D36, D73, T77)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok-degradacja`; `rok` (miesiąc z 2 poważnymi, miesiące z
  poważnymi rozłożonymi na dwa miesiące, Kadet z 3 poważnymi)
- **Jak sprawdzić:** po zamrożeniu D−2 odczyt stopnia, toastu i dziennika; historia – pozostałe przypadki.
- **Oczekiwany efekt:** w dniu 3. poważnego „Degradacja: <niższy stopień>” w dzienniku i toast „Degradacja: X – limit
  poważnych naruszeń w miesiącu.”; licznik poważnych i postęp od zera; 2 poważne w miesiącu albo 3 w dwóch miesiącach
  – bez degradacji; Kadet nie spada niżej.
- **Nie przechodzi, gdy:**
  - degradacja przy 2. albo 4. poważnym, w złym dniu albo za naruszenia zwykłe;
  - Kadet spada niżej albo degradacja pokazuje się jako błąd.
- **Odczyt liczb:** stopień przed i po, data degradacji, licznik poważnych.

#### DW.23 Licznik poważnych naruszeń po zmianie stopnia (T77, T227, N70)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (w bieżącym miesiącu 2 poważne, potem awans)
- **Jak sprawdzić:** panel „Stopień” – etykieta i liczba „X / 3”; Raporty → Debriefing bieżącego miesiąca.
- **Oczekiwany efekt:** po zmianie stopnia w tym miesiącu „Poważne naruszenia od DD.MM (do degradacji) 0 / 3”; bez
  zmiany – „w tym miesiącu (do degradacji)”; debriefing liczy cały miesiąc (2); wyróżnienie przy limicie − 1.
- **Nie przechodzi, gdy:**
  - etykieta mówi „w tym miesiącu”, a liczba jest od zmiany stopnia;
  - debriefing liczy od zmiany stopnia.

#### DW.24 Klasa okrętu według zasięgu (spec „Klasy okrętu”, T10, T71, T218)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`, `brzegi` (zasięg < 1 mies.), wariant z zasięgiem
  2,96 i 3,00 mies.
- **Jak sprawdzić:** panel „Klasa okrętu”: nazwa, „zasięg X mies.”, „Do klasy Y brakuje Z zasięgu.”, drabina klas;
  porównać z Mostkiem (stan okrętu) i Raporty → Przegląd roczny „Zasięg teraz”.
- **Oczekiwany efekt:** drabina „Zwiadowca < 1”, „Korweta 1–3”, „Fregata 3–6”, „Niszczyciel 6–9”, „Krążownik 9–12”,
  „Flagowiec ≥ 12 mies.”; zasięg = max(0, osłony + kadłub − dług) / średnie koszty netto z 12 mies., obcięty w dół do
  0,1; 2,96 → „2,9 mies.” Korweta, 3,00 → Fregata; „brakuje” w górę, co najmniej 0,1; ta sama liczba na każdym ekranie.
- **Nie przechodzi, gdy:**
  - napis zasięgu pokazuje próg klasy, której okręt nie ma (np. „3,0 mies.” przy Korwecie);
  - klasa albo zasięg różnią się między Dowództwem, Mostkiem i Raportami;
  - dług nie pomniejsza zasięgu.
- **Odczyt liczb:** zasięg, klasa, „brakuje”, osłony, kadłub, dług, średnie koszty.

#### DW.25 Klasa rośnie i spada – święto tylko nowej (D73, D84 C10, T227, N64)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (zasięg krąży wokół 3 mies. przez 30 dni); Maszyna –
  wzrost klasy przez dokowanie
- **Jak sprawdzić:** dziennik wachty – wpisy „Klasa: A → B”; toasty i ekrany przy pierwszym otwarciu (zdarzenia
  z 14 dni).
- **Oczekiwany efekt:** każda zmiana klasy w dzienniku; spadek tylko w dzienniku; wzrost ponad najwyższą z 30 dni –
  ekran „Nowa klasa: X” („Zasięg okrętu wzrósł (data).”) z dźwiękiem; powrót w 30 dniach – wpis „(powtórnie
  w ciągu 30 dni)” bez ekranu; najwyżej jeden ekran danej klasy w miesiącu.
- **Nie przechodzi, gdy:**
  - spadek klasy daje ekran albo toast;
  - każde przejście przez granicę daje ekran z fanfarą.

#### DW.26 Misja tygodnia – wybór i treść (spec „Seria, misje…”, D38, D73, T78, T227, B91)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (słabe punkty z 4 tygodni ułożone tak, że wynik
  wyboru jest jednoznaczny)
- **Jak sprawdzić:** Dowództwo → „Misja tygodnia”: tytuł, treść, „Na razie …”, dopisek o rozliczeniu; to samo
  w odprawie na Mostku i w Raporty → Raport wachty.
- **Oczekiwany efekt:** jedna misja na tydzień ISO z puli 9 (Cisza w eterze, Koperta pod kontrolą, Pełna energia,
  Zero impulsów, Killzone, Rozliczenie z domownikami, Łączność z bazą, Inwentaryzacja, Dzień bez wydatków) – dobrana
  do najsłabszego punktu z 4 tygodni przed poniedziałkiem (z niedzielą), inna niż w zeszłym tygodniu; treść z
  konkretem (koperta i kwota, killzone – dzień, godzina, kwota „połowa średniej”); ten sam tekst w trzech miejscach.
- **Nie przechodzi, gdy:**
  - misja inna niż z wyroczni albo ta sama dwa tygodnie z rzędu;
  - treść bez kwoty albo z kwotą inną niż w odprawie.

#### DW.27 Status misji w trakcie tygodnia (T227, N68, N69)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (misja „Pełna energia” albo „Dzień bez wydatków”)
- **Jak sprawdzić:** „Pełna energia”: dziś przekroczyć przydział → „Na razie …” obok „Dziś na razie: naruszenie”.
  „Dzień bez wydatków”: dziś bez wydatków → odczyt; dopisać wydatek → odczyt.
- **Oczekiwany efekt:** „Pełna energia” – „Na razie: cel chybiony”, zgodnie z oceną dnia; „Dzień bez wydatków” –
  „Na razie: N z 2 (+1, jeśli dziś bez wydatków)” (dziś liczony osobno), po wydatku bez „+1”.
- **Nie przechodzi, gdy:**
  - „kurs utrzymany” obok „Dziś na razie: naruszenie”;
  - niezakończony dzień liczy się jako dzień bez wydatków.

#### DW.28 Rozliczenie misji po zamrożeniu niedzieli (T78, T80)
- **Kto:** Claude (historia) · Maszyna (chwila rozliczenia) · **Ryzyko:** średnie · **Stan danych:** `rok` (misje
  wykonane i niewykonane)
- **Jak sprawdzić:** „Misja tygodnia” → „Poprzednie” (✓ / ✗, tydzień); dziennik – wpisy misji. Maszyna: zegar z
  niedzieli na wtorek po 00:00, odczyt.
- **Oczekiwany efekt:** rozliczenie zgodne z wyrocznią; „Misja wykonana: X (+3 dni do awansu)” albo „Misja
  niewykonana: X”; toast przy rozliczeniu; przed zamrożeniem niedzieli misja nierozliczona.
- **Nie przechodzi, gdy:**
  - rozliczenie przed zamrożeniem niedzieli;
  - wynik różny od wyroczni.

#### DW.29 Misje zależne od czynności kapitana (D73, D84 C11, T78, T210)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (tydzień z misją „Łączność z bazą”, „Inwentaryzacja”,
  „Dzień bez wydatków” albo „Rozliczenie z domownikami” – po jednym w historii)
- **Jak sprawdzić:** dziś wykonać czynność misji (2 importy CSV z mBanku; potwierdzenie sald wszystkich kont – także
  z pliku banku; „Dziś bez wydatków”; wpłata domownika) i odczytać „Na razie …”.
- **Oczekiwany efekt:** licznik misji rośnie po czynności; saldo z pliku banku zalicza „Inwentaryzację” tylko dla
  mBanku; „Dziś bez wydatków” na dniu bez kosztu liczy się do misji.
- **Nie przechodzi, gdy:**
  - czynność nie zmienia statusu misji;
  - „Inwentaryzacja” zaliczona bez potwierdzenia Portfela XTB (plik mBanku potwierdza tylko mBank).

#### DW.30 Ukryte osiągnięcia (spec „Seria, misje…”, D39, D73, T79)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (zdobyte np. Pełne osłony, Seria 7, Seria 30,
  Asteroida rozbita, Hat-trick, Czyste konto; niezdobyte – reszta)
- **Jak sprawdzić:** panel „Osiągnięcia”: nazwy, daty, opisy, „Ukrytych: N”; dziennik – wpisy „Osiągnięcie: …”.
- **Oczekiwany efekt:** widać tylko zdobyte (z 13: Cisza w eterze, Pełne osłony, Pancerny kadłub, Asteroida rozbita,
  Pierwsze dokowanie, Cel osiągnięty, Seria 7 / 30 / 100, Hat-trick, Snajper, Czyste konto, Flagowiec), każde raz,
  z dniem zdobycia zgodnym z wyrocznią; „Ukrytych” = 13 − zdobyte; opisy z prawdziwą nazwą obok metafory.
- **Nie przechodzi, gdy:**
  - widać nazwę niezdobytego osiągnięcia;
  - osiągnięcie dwa razy albo z inną datą niż wyrocznia;
  - Hat-trick przy miesiącu na minusie w trzech kolejnych.
- **Odczyt liczb:** lista zdobytych z datami, liczba ukrytych.

#### DW.31 Dziennik wachty – zawartość i czytelność (spec „Ekrany”, D73, T80, T254, B32)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (kontener o nazwie ok. 300 znaków z polskimi
  literami dodany ponad linię)
- **Jak sprawdzić:** panel „Dziennik wachty” – kolejność, rodzaje wpisów, plakietka „poważne”, daty; wpis ładunku
  z długą nazwą; brak błędu zapisu miesiąca gry (pasek błędów, Meldunki).
- **Oczekiwany efekt:** najnowsze na górze, data DD.MM; wpisy: naruszenia (poważne z plakietką „poważne”), smaczki
  ICT, klasa, stopień, misje, osiągnięcia, pokrycia kopert; metafory z prawdziwą nazwą; długa nazwa zawinięta albo
  ucięta, miesiąc gry zapisany.
- **Nie przechodzi, gdy:**
  - wpis z surowym identyfikatorem (np. „envelope-serious”, id kategorii);
  - długa nazwa blokuje zapis gry albo rozpycha panel.

#### DW.32 Smaczki dnia: Judas Swing, Turtle Soup, Liquidity sweep (spec „Smaczki ICT”, D39, D73, T80, T161)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (dzień z impulsem, dzień ze zwrotem towaru, dzień
  zakończony z energią 0,00 zł i dzień z 0,01 zł)
- **Jak sprawdzić:** dziennik wachty pod tymi datami.
- **Oczekiwany efekt:** „Judas Swing – zakup oznaczony jako impuls” (tylko moja część zakupu); „Turtle Soup – zwrot
  towaru”; „Liquidity sweep – …” tylko przy energii dnia dokładnie 0,00 zł; smaczki nie są naruszeniami (nie
  przerywają serii).
- **Nie przechodzi, gdy:**
  - Liquidity sweep przy 0,01 zł albo jego brak przy 0,00 zł;
  - smaczek przerywa serię albo zakup za domownika daje Judas Swing.

#### DW.33 Premium / Discount na kopertach i DOL na Mapie gwiezdnej (D73, T80, T226)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (koperty powyżej i poniżej tempa miesiąca; cele z
  priorytetami, pierwszy osiągnięty)
- **Jak sprawdzić:** Plan miesiąca / Mostek → koperty: linia Equilibrium i napis; Mapa gwiezdna – znaczek „DOL”.
- **Oczekiwany efekt:** linia na części miesiąca, która minęła; wydane ponad nią – „Premium”, poniżej – „Discount”;
  objaśnienie w dymku; „DOL” przy pierwszym nieosiągniętym celu z listy priorytetów („DOL · pula Cele” przy innym
  celu puli Cele).
- **Nie przechodzi, gdy:**
  - linia w złym miejscu (np. po 15 z 30 dni nie w połowie);
  - DOL przy celu osiągniętym albo niepierwszym.

#### DW.34 Rozkazy w Dowództwie i w Ustawieniach (spec „Rozkazy”, D73, D84 C9, T227, N29, N73, T219, B84)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** „Rozkazy i progi”: opis rozkazu dziennego, pola Minimalne osłony, Linia zanurzenia, Cisza
  od / do, Dziennik kapitański od kwoty, Firewall; zmienić ciszę na 22:00–6:00 → Ustawienia → Warstwy i rozkazy;
  zmienić tam linię na 35 % → Dowództwo; ustawić minimalne osłony ponad cel osłon; restart.
- **Oczekiwany efekt:** rozkaz dzienny opisany jako „wydatki dnia ≤ energia dziś” z objaśnieniem; zmiana w jednym
  miejscu widoczna w drugim i po restarcie; minimum ponad cel – ostrzeżenie „liczy się cel” albo odrzucenie
  z komunikatem; teksty bez identyfikatorów decyzji („(D40)”, „(D41)”) – inaczej UWAGA.
- **Nie przechodzi, gdy:**
  - zmiana nie zapisuje się albo różni się między ekranami;
  - minimum ponad cel daje stały alarm i naruszenia.

#### DW.35 Zmiana rozkazu działa od kolejnych dni (D73, T77)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (zamrożone dni z zakupami 22:30)
- **Jak sprawdzić:** cisza 22:00–6:00 (dziś obejmuje bieżącą godzinę); potwierdzony zakup teraz → „Dziś na razie”;
  dziennik zamrożonych dni z zakupami 22:30.
- **Oczekiwany efekt:** dzisiejszy zakup – naruszenie „Zakup w ciszy nocnej”; zamrożone dni bez zmian.
- **Nie przechodzi, gdy:**
  - zmiana rozkazu przelicza zamrożone dni;
  - nowy rozkaz nie działa dla dziś.

#### DW.36 Progi gry – zmiana i walidacja (spec „Kwestie otwarte”, D73, T77)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`, `rok-degradacja`
- **Jak sprawdzić:** „Progi gry”: wpisać 40 w „Awans: dni zgodnych” przy oknie 35; 0 i 400 w oknie; 2,5 w misji;
  „Degradacja po” 2 w `rok-degradacja` (2 poważne w miesiącu); restart; folder tylko do odczytu.
- **Oczekiwany efekt:** wartości spoza zakresu i awans > okno odrzucone (pole wraca); dopisek „Progi działają od
  kolejnych zamrożonych dni – zamrożone oceny i awanse zostają.”; obniżony próg degradacji działa przy kolejnym
  poważnym naruszeniu; zapis po restarcie; przy folderze tylko do odczytu pola zablokowane.
- **Nie przechodzi, gdy:**
  - zapisuje się ułamek albo awans > okno;
  - zmiana progu cofa zamrożony awans albo degradację.

#### DW.37 Powrót po dwóch tygodniach przerwy (spec „Ocena dnia”, T76, T78, T146, T199)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok-przerwa`
- **Jak sprawdzić:** otworzyć folder, odczytać Dowództwo po zamrożeniu; potem zaimportować CSV z okresu przerwy
  i odczytać ponownie; misje tygodni przerwy.
- **Oczekiwany efekt (spec):** dni przerwy oceniane z danymi znanymi w chwili zamrożenia (bez wpisów – zgodne);
  import po zamrożeniu zmienia budżet, nie oceny; misje tylko dla tygodni z uruchomieniem; okno odpowiada. Odnotować,
  czy aplikacja ostrzega przed zamrożeniem dni bez importu (wątpliwość – darmowy awans po przerwie).
- **Nie przechodzi, gdy:**
  - zamrażanie zawiesza okno albo staje w połowie;
  - tygodnie przerwy mają misje „niewykonane”;
  - świętowane są zdarzenia sprzed 14 dni.
- **Odczyt liczb:** seria, stopień, postęp przed importem i po nim.

### WY – Wywiad

#### WY.1 Daily Bias – Bullish, Neutral, Bearish (spec „Wywiad i raporty”, T11, T57, T216, T258)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (trzy dni do odtworzenia wpisem dziś) i `brzegi`
- **Jak sprawdzić:** Mostek → Odprawa: znak i napis Daily Bias; Raporty → Odprawa „Daily Bias”. Stany: energia dziś
  ≥ podstawowy przydział, koperty planowe w limicie; energia między połową a podstawowym; energia < połowy; osłony
  poniżej minimum.
- **Oczekiwany efekt:** odpowiednio „▲ Bullish”, „◆ Neutral”, „▼ Bearish”, „▼ Bearish”; podstawowy przydział =
  koperty codzienne (z łupami „na następny miesiąc”) ÷ dni miesiąca; Bearish w kolorze akcentu, nie czerwieni; ten sam
  wynik na Mostku, w Raportach i w odsłuchu.
- **Nie przechodzi, gdy:**
  - wynik niezgodny z regułą albo różny między ekranami;
  - Bearish na czerwono.
- **Odczyt liczb:** energia dziś, podstawowy przydział, osłony, minimum osłon, wynik.

#### WY.2 Daily Bias – brzegi (spec „Wywiad i raporty”, T57, T216)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `brzegi`
- **Jak sprawdzić:** energia dziś dokładnie = podstawowy; dokładnie połowa; koperta planowa przekroczona przy pełnej
  energii; koperta codzienna ponad swój podział przy pełnej energii; osłony pod minimum przy pełnej energii.
- **Oczekiwany efekt:** równa podstawowemu – Bullish („co najmniej”); równa połowie – Neutral („poniżej połowy” =
  Bearish); koperta planowa ponad limit – nie Bullish; koperta codzienna ponad podział – bez wpływu; osłony pod
  minimum – Bearish (pierwszeństwo – wątpliwość, odnotować).
- **Nie przechodzi, gdy:**
  - granice odwrotnie (Neutral przy równej, Bearish przy połowie);
  - koperta codzienna psuje Bullish.

#### WY.3 Krzywa majątku – tydzień po tygodniu, „Na kontach” (spec „Wywiad i raporty”, D48, D73, T81, T217, N63)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** Ctrl+9 → „Krzywa majątku” na linii „na kontach”: punkty wykresu (dymki), „Na kontach”,
  „Szczyt”, objaśnienie pod wykresem.
- **Oczekiwany efekt:** punkt = suma sald kont budżetu na koniec każdej niedzieli, ostatni – dziś; historia z importu
  także sprzed salda otwarcia; „Na kontach” = suma sald dziś (jak suma kont na Mostku i w Ustawieniach → Konta);
  dopisek, że obejmuje pożyczone i depozyt domowników.
- **Nie przechodzi, gdy:**
  - punkt tygodnia różny od wyroczni (o grosz też);
  - „Na kontach” różne od sumy sald na innych ekranach.
- **Odczyt liczb:** punkty z 4 wybranych niedziel, „Na kontach”, „Szczyt”.

#### WY.4 Drawdown od szczytu (spec „Wywiad i raporty”, D48, T81)
- **Kto:** Claude · Ty (czytelność) · **Ryzyko:** średnie · **Stan danych:** `rok` (spadek po szczycie i odbicie)
- **Jak sprawdzić:** dolna część wykresu i „Największy drawdown”.
- **Oczekiwany efekt:** drawdown = szczyt do daty − wartość, od pierwszego punktu; największy zgodny z wyrocznią; nowy
  szczyt zeruje drawdown.
- **Nie przechodzi, gdy:**
  - drawdown liczony od szczytu z przyszłości albo ujemny;
  - wartość różna od wyroczni.
- **Odczyt liczb:** szczyt, największy drawdown, data dołka.

#### WY.5 BOS i CHoCH – struktura krzywej (spec „Wywiad i raporty”, D73, T81)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (trend wzrostowy, odwrócenie, nowy trend)
- **Jak sprawdzić:** „Struktura” i lista znaczników pod wykresem („DD.MM.RRRR BOS w górę – poziom X zł”); znaczniki na
  wykresie.
- **Oczekiwany efekt:** swing = zamknięcie tygodnia wyższe / niższe od obu sąsiadów (potwierdzone tydzień później);
  przebicie ostatniego swingu zgodnie z trendem – BOS, przeciw trendowi – CHoCH (pierwsze bez trendu – BOS); struktura
  „bullish – wyższe szczyty”, „bearish – niższe dołki” albo „bez struktury”; daty i poziomy jak w wyroczni.
- **Nie przechodzi, gdy:**
  - znacznik przed potwierdzeniem swingu albo na złym tygodniu;
  - CHoCH zgodnie z trendem albo BOS przeciw niemu.
- **Odczyt liczb:** ostatnie 5 znaczników (data, rodzaj, kierunek, poziom), struktura.

#### WY.6 Siła floty netto – druga linia (F24, D87, T293)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (pożyczka wzięta 10 000 zł, udzielona, domownik
  z należnością i z zaliczką)
- **Jak sprawdzić:** przełącznik „na kontach / siła floty netto”; „Siła floty netto”; tydzień wzięcia pożyczki na obu
  liniach; restart aplikacji.
- **Oczekiwany efekt:** netto = salda kont + należności (domownicy, pożyczki udzielone) − dług (pożyczki wzięte,
  depozyt domowników); wzięta pożyczka podnosi „na kontach”, nie netto; struktura i drawdown liczone na wybranej linii,
  druga przerywana; wybór pamiętany na tym komputerze; Mostek bez zmian.
- **Nie przechodzi, gdy:**
  - wzięta pożyczka podnosi linię netto albo daje na niej CHoCH w górę;
  - wybór linii nie zostaje po restarcie.
- **Odczyt liczb:** netto dziś, netto i „na kontach” w tygodniu pożyczki i tydzień przed.

#### WY.7 Krzywa na Mostku = krzywa w Wywiadzie (T257, N58)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** Mostek → „Krzywa majątku” (26 tygodni) i Wywiad – te same tygodnie; „Wywiad →”.
- **Oczekiwany efekt:** te same wartości i znaczniki BOS / CHoCH (ze struktury całej historii); „Wywiad →” otwiera
  Wywiad.
- **Nie przechodzi, gdy:**
  - wartości albo znaczniki się różnią.

#### WY.8 Okres analiz 3 / 6 / 12 mies. (CHANGELOG 1.2.0, brak wymagania co do domyślnego)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** przełącznik okresu w nagłówku Wywiadu; odczyt kolumn „Wydatki w czasie”, „Namierzone cele”,
  Killzones, „Dziennik kapitański”.
- **Oczekiwany efekt:** domyślnie 6 mies.; panele zależne od okresu zmieniają zakres zgodnie z wyborem (bieżący
  miesiąc ostatni); panele niezależne (krzywa, FVG, kurs) bez zmian.
- **Nie przechodzi, gdy:**
  - okres zmienia tylko część paneli bez widocznej logiki;
  - liczba miesięcy różna od wybranej.

#### WY.9 Killzones – dzień tygodnia × godzina, tylko wpisy z godziną (spec „Wywiad i raporty”, D48, T82)
- **Kto:** Claude · Ty (czytelność mapy) · **Ryzyko:** średnie · **Stan danych:** `rok` (zakupy z godziną skupione
  w pt 18–19; import bez godzin; zwrot z godziną; zakup za domownika z godziną); `start` (same importy)
- **Jak sprawdzić:** panel „Killzones wydatków”: wartości pól (dymki), „Zakupy z godziną: N, bez godziny: M”,
  obwiedzione pole.
- **Oczekiwany efekt:** pole = koszty zakupów z godziną w tym dniu i godzinie (okres analiz); import tylko w liczniku
  „bez godziny”; najjaśniejsze pole (z obwódką) = największe koszty; zakup za domownika nie jest moim kosztem; bez
  wpisów z godziną – „Brak zakupów z godziną w tym okresie – …”.
- **Nie przechodzi, gdy:**
  - wpis z importu trafia do pola (np. 00:00);
  - killzone różna od wyroczni.
- **Odczyt liczb:** N, M, killzone (dzień, godzina, kwota), 3 inne pola.

#### WY.10 FVG kopert (spec „Wywiad i raporty”, D73, T82, T215, T254)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (koperty z zapasem, przekroczone, 0 zł; miesiąc
  bez kopert)
- **Jak sprawdzić:** „FVG kopert – <miesiąc>”, wybór miesiąca; porównać z Plan miesiąca → debriefing i Raporty →
  Debriefing tego miesiąca.
- **Oczekiwany efekt:** wiersz = koperta z planu miesiąca: „wydane / limit” i FVG = limit − wydane („+X zł” zielone,
  „−X zł” czerwone); wybór od pierwszego miesiąca budżetu, najwyżej 12; miesiąc bez kopert – „Bez kopert w tym
  miesiącu.”; objaśnienie „Fair Value Gap …”; te same kwoty na trzech ekranach.
- **Nie przechodzi, gdy:**
  - FVG różny od debriefingu albo wyroczni;
  - znak albo kolor odwrotny.
- **Odczyt liczb:** limit, wydane, FVG każdej koperty poprzedniego miesiąca.

#### WY.11 Wydatki w czasie z Order Block (spec „Wywiad i raporty”, „Smaczki ICT”, D48, D73, T82, T254)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** tabela „Wydatki w czasie”: kategorie główne × miesiące, wiersz „Order Block · ładownia”, „Razem”.
- **Oczekiwany efekt:** komórka = koszty netto kategorii w miesiącu (zwroty odejmują, bez przelewów własnych, dopłat
  do XTB, zakupów domowników, PIT-38 i wydatków z celu); ładownia jako „Order Block” z objaśnieniem; „Razem” miesiąca
  = koszty netto z debriefingu (Raporty) i eksportu „Miesiące”.
- **Nie przechodzi, gdy:**
  - „Razem” różne od kosztów netto debriefingu;
  - płatność kontenera w kategorii i w Order Block jednocześnie.
- **Odczyt liczb:** każda komórka 2 wybranych miesięcy i „Razem”.

#### WY.12 Drążenie do podkategorii i operacji (F20, T292, T298)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** klik kategorii Jedzenie → podkategorie; klik kwoty komórki; klik kwoty „Order Block”; klik
  „bez podkategorii”.
- **Oczekiwany efekt:** podkategorie sumują się do kategorii (część na samej kategorii głównej jako „bez
  podkategorii”, bez kliknięcia); klik kwoty otwiera Operacje z filtrem (miesiąc, wydatki, kategoria) i suma listy =
  kwota komórki; Order Block – płatności kontenerów.
- **Nie przechodzi, gdy:**
  - lista w Operacjach daje inną sumę niż komórka;
  - drążenie kasuje zapisane widoki listy Operacji (B88, T291 – zapisany widok ma zostać).
- **Odczyt liczb:** kwota komórki, suma listy w Operacjach.

#### WY.13 Namierzone cele – kontrahenci (F20, T292, T298)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (marka pod kilkoma nazwami, np. „KFC” i „KFC 1234
  WARSZAWA”; zakupy bez nazwy; płatności kontenera)
- **Jak sprawdzić:** panel „Namierzone cele”: razem, kontakty, średnio, trend, kategoria i udział, dymek „Rozpoznanie
  celu – …”; klik marki.
- **Oczekiwany efekt:** jedna marka = jeden wiersz; średnio = razem ÷ kontakty; trend wobec tak samo długiego okresu
  przed; udział marki liczony od wszystkich zakupów kategorii (także bez nazwy); bez opłat ładowni i zakupów z celu;
  klik – Operacje tej marki z całej historii.
- **Nie przechodzi, gdy:**
  - jedna sieć w kilku wierszach albo udział 100 % przy innych zakupach kategorii;
  - liczby różne od wyroczni.
- **Odczyt liczb:** 3 pierwsze marki: razem, kontakty, średnio, trend, udział.

#### WY.14 Porównanie – miesiąc (F20, T292)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (miesiąc z kategorią o 15 % ponad średnią, inną o 5 %)
- **Jak sprawdzić:** panel porównania: domyślny miesiąc, kolumny „miesiąc”, „śr. 3 mies.”, „śr. 12 mies.”, „rok temu”;
  inny miesiąc z listy.
- **Oczekiwany efekt:** domyślnie ostatni pełny miesiąc; średnie tylko z miesięcy objętych historią; „▲” w akcencie
  tylko przy przekroczeniu o ponad 10 % (15 % – tak, 5 % – nie); miesiąc bez wydatków – „Bez wydatków w tym
  miesiącu.”.
- **Nie przechodzi, gdy:**
  - średnia liczy miesiące spoza historii jako 0;
  - zaznaczenie przy 10 % lub mniej.
- **Odczyt liczb:** wiersze 2 kategorii (4 kolumny).

#### WY.15 Prognoza zasięgu – bez wypłat, z bojami (spec „Wywiad i raporty”, D48, T82, CHANGELOG 1.8.0)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (boje: wydatek i wpływ w kolejnych miesiącach,
  pożyczka wzięta); `start-0` (bez pełnego miesiąca)
- **Jak sprawdzić:** panel „Prognoza zasięgu”: zdanie „Bez żadnej wypłaty paliwa starczy na X (miesiąc).”, linia
  „Z bojami …”, paski miesięcy z kwotami.
- **Oczekiwany efekt:** paliwo = osłony + kadłub − dług, ubywa po średnich kosztach netto; X = zasięg z Mostka
  i Dowództwa (ten sam napis); druga kreska z bojami; bez średnich kosztów – „Brak średnich kosztów – prognoza po
  pierwszym pełnym miesiącu.”.
- **Nie przechodzi, gdy:**
  - X różny od zasięgu na Mostku;
  - boje nie zmieniają drugiej kreski albo zmieniają pierwszą.
- **Odczyt liczb:** X, miesiąc wyczerpania, paliwo w 3 pierwszych miesiącach (obie kreski).

#### WY.16 Dziennik kapitański – trafność plan / impuls (spec „Wywiad i raporty”, D41, D84 C7, T82, T214)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (zakupy ≥ 200 zł oznaczone i bez oznaczenia, < 200 zł
  oznaczone ręcznie)
- **Jak sprawdzić:** tabela „Dziennik kapitański”: plan (liczba · kwota), impuls, bez oznaczenia, trafność; zdanie
  „Impulsy łącznie …”; próg dziennika 0 zł → szybki wpis 500 zł.
- **Oczekiwany efekt:** trafność = plan ÷ (plan + impuls), bez oznaczenia od progu tylko policzone; miesiąc bez
  oznaczonych – „—”; te same liczby w debriefingu Raportów; próg 0 – nikt nie pyta (szybki wpis i edytor).
- **Nie przechodzi, gdy:**
  - trafność liczona od wszystkich wpisów;
  - zakup poniżej progu w „bez oznaczenia”;
  - przy progu 0 któreś okno pyta.
- **Odczyt liczb:** wiersze 3 miesięcy, impulsy łącznie (liczba, kwota).

#### WY.17 Bilans paliwa i stopa oszczędności (F25, D81, T294, T298)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (miesiąc z samą dopłatą do XTB, miesiąc bez
  przychodu, wypłaty z puli Podatek, wpłaty domowników)
- **Jak sprawdzić:** panel „Bilans paliwa”: przychód, koszty, bilans, stopa, bez tradingu; mediany 6 i 12, trend.
- **Oczekiwany efekt:** 12 pełnych miesięcy objętych historią (bieżący pominięty); bilans = przychód (praca + trading
  netto, bez pieniędzy domowników i puli Podatek) − koszty netto; stopa = bilans ÷ przychód z jednym miejscem po
  przecinku, bez przychodu „—”; wariant bez tradingu; kolor tylko dla kwot, bez koloru przy ukrytych kwotach.
- **Nie przechodzi, gdy:**
  - wpłata domownika podnosi przychód;
  - miesiąc samych dopłat ma przychód ujemny;
  - liczby różne od debriefingu i eksportu „Miesiące”.
- **Odczyt liczb:** wiersze wszystkich 12 miesięcy, mediany 6 / 12, mediana bez tradingu, trend.

#### WY.18 Kurs na 12 miesięcy (F27, D87, T276)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (cel z terminem nieosiągalnym, opłata roczna dużej
  kwoty, boje, rata pożyczki)
- **Jak sprawdzić:** panel „Kurs na 12 miesięcy”: trzy kolumny („bez wypłat z XTB”, „mediana”, „średnia” z wpływami
  /mies.), wiersze „Osłony pełne”, „Kadłub pełny”, „Cel: …”, „Poniżej minimum osłon”, „Pensja z kadłuba”, tabela
  miesięcy „osłony · kadłub”.
- **Oczekiwany efekt:** wpływy kursów = mediana pracy / mediana / średnia z 12 mies. (panel Przychody); pensja z osłon
  1. dnia, wpływy dokowane osłony → kadłub → cele; cel po terminie w akcencie; „poza kursem”, gdy nie dojdzie; wyniki
  zgodne z wyrocznią; nic się nie zapisuje.
- **Nie przechodzi, gdy:**
  - wpływy kursu różne od panelu „Przychody”;
  - miesiąc poniżej minimum niewykazany;
  - otwarcie panelu zmienia folder.
- **Odczyt liczb:** wpływy 3 kursów, miesiące pełnych osłon i kadłuba, ETA celów, osłony · kadłub w 3 miesiącach.

#### WY.19 Kurs – brzegi (F27, T276)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `brzegi` (osłony poniżej minimum, pusty kadłub), `start-0`
- **Jak sprawdzić:** panel kursu w obu stanach.
- **Oczekiwany efekt:** `brzegi` – kurs „bez wypłat z XTB” pokazuje miesiące poniżej minimum i „Pensja z kadłuba”
  (albo pensję częściową, gdy kadłub pusty); `start-0` – kurs liczy się od startu budżetu (przed nim „Kurs policzy się
  po starcie budżetu.”), bez NaN i pustych kolumn.
- **Nie przechodzi, gdy:**
  - kurs pokazuje pełne osłony przy wpływach 0 i kosztach > 0;
  - pojawia się „NaN”, „Infinity” albo ujemne miesiące.

#### WY.20 Symulator manewrów – porównanie (F35, D87, T277)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** „Symulator manewrów”: (a) zakup 10 000 zł z osłon w przyszłym miesiącu; (b) 6 miesięcy bez
  wypłat z XTB; (c) koszty +20 %; (d) nowy cel 5 000 zł z terminem i „rata z pensji”; (e) nowy kontener 300 zł co
  1 mies.; wartości spoza zakresu (koszty 300 %, 13 miesięcy bez XTB, termin „2027-13”).
- **Oczekiwany efekt:** tabela „teraz” / „po manewrze”: zasięg i klasa, osłony i kadłub pełne, ETA celów, poniżej
  minimum, pensja z kadłuba – zmiana w dobrą stronę dla danego manewru, pogorszenie wyróżnione; wartości spoza zakresu
  odrzucone; „wyczyść manewr” wraca do stanu wyjściowego.
- **Nie przechodzi, gdy:**
  - manewr bez skutku w tabeli (np. zakup nie przesuwa osłon pełnych);
  - wartość spoza zakresu przyjęta.
- **Odczyt liczb:** wiersze tabeli dla (a) i (b).

#### WY.21 Symulator – zapisuje tylko „Zastosuj pensję” (F35, T277)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** suma kontrolna folderu przed manewrami (a)–(e) z WY.20 i po nich; potem pensja 9 000 zł od
  kolejnego miesiąca → „Zastosuj pensję od …” → toast, Plan miesiąca.
- **Oczekiwany efekt:** manewry nic nie zapisują (folder bajt w bajt, bez wpisów historii); „Zastosuj pensję” – toast
  „Pensja X zł od <miesiąc> w planie miesiąca.”, plan tego miesiąca ma nową pensję, wcześniejsze bez zmian.
- **Nie przechodzi, gdy:**
  - jakikolwiek plik zmienia się bez „Zastosuj”;
  - pensja zmienia się w innym miesiącu niż wybrany.

#### WY.22 Osobista inflacja koszyka (F36, D87, T296)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (marki z ≥ 3 zakupami w obu latach i z 2 zakupami;
  kontener z historią kwot); `start` (mniej niż rok)
- **Jak sprawdzić:** panel „Osobista inflacja”: „Twoja inflacja”, koszty kategorii rok do roku, średni paragon u tych
  samych marek, kontenery, cel kadłuba rok temu i teraz.
- **Oczekiwany efekt:** porównane te same miesiące rok do roku (z 12 ostatnich pełnych); marka z 2 zakupami pominięta;
  „Twoja inflacja” ważona pieniędzmi sprzed roku; bez roku historii – „Porównanie rok do roku potrzebuje roku historii
  z banku …”.
- **Nie przechodzi, gdy:**
  - porównanie różnych miesięcy;
  - marka poniżej progu zakupów w zestawieniu.
- **Odczyt liczb:** Twoja inflacja, 3 kategorie, 2 marki, kontener, cel kadłuba.

#### WY.23 CPI GUS wpisywane ręcznie (F36, D87, D74, T296)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** pole „CPI GUS (rok do roku) za <miesiąc>”: domyślny miesiąc; wpisać „4,9”; „−60”; „250”; puste;
  restart; zapis sieci (log, brak połączeń).
- **Oczekiwany efekt:** domyślnie poprzedni miesiąc; „4,9” zapisane w folderze (widać po restarcie i na drugim
  komputerze); −60 i 250 odrzucone (zakres −50…200); puste zdejmuje; pokazywane ostatnie wpisane; bez sieci.
- **Nie przechodzi, gdy:**
  - wartość spoza zakresu zapisana albo przecinek nieprzyjęty;
  - aplikacja próbuje pobrać CPI z sieci.

#### WY.24 Wyprawy w Wywiadzie (F17, D87, T291, T298; tagi w Operacjach – inna część)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (tag „#wakacje” w kilku kategoriach, zwrot zaliczki,
  część domownika, cel na Mapie gwiezdnej)
- **Jak sprawdzić:** panel „Wyprawy”: karta wyprawy, cel („Cel z Mapy gwiezdnej”), „Pokaż w Operacjach”.
- **Oczekiwany efekt:** wydane netto przez wszystkie kategorie (zwrot odejmuje, część domownika nie jest moim
  kosztem); podział na kategorie i miesiące; „Ekspedycja „wakacje”: wydano X z Y zł celu”; „Pokaż w Operacjach” –
  te same operacje i suma.
- **Nie przechodzi, gdy:**
  - suma karty różna od listy w Operacjach;
  - część domownika liczona jako mój koszt.
- **Odczyt liczb:** wydane netto, cel, podział na kategorie.

#### WY.25 Terminy ICT zrozumiałe na ekranie (D33, D39, plan audytu oś 7; brak wymagania wprost)
- **Kto:** Claude (teksty) · Ty (ocena) · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** dla Daily Bias, BOS, CHoCH, drawdown, FVG, Killzone, Order Block, Silver Bullet, Judas Swing,
  Turtle Soup, Liquidity sweep, Premium / Discount, Equilibrium, DOL – szukać objaśnienia (tekst pod panelem, dymek,
  słowniczek F1).
- **Oczekiwany efekt:** każdy termin ma po polsku jedno zdanie „co to znaczy dla moich pieniędzy”; terminy ICT po
  angielsku, reszta po polsku; bez żargonu deweloperskiego w dymkach (np. „Daily Bias (spec, Wywiad)”).
- **Nie przechodzi, gdy:**
  - termin bez żadnego objaśnienia (UWAGA);
  - dymek odsyła do specyfikacji albo decyzji zamiast objaśniać.

#### WY.26 Wywiad bez historii i na pustym okresie (brak wymagania; teksty z 1.2.0–1.10.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `start-0`, `start`
- **Jak sprawdzić:** Ctrl+9 w obu stanach; każdy panel.
- **Oczekiwany efekt:** puste stany z wyjaśnieniem: krzywa – „Za mało danych – krzywa pojawi się po dwóch tygodniach
  historii.” (przy jednym tygodniu), bilans – „Bilans pojawi się po pierwszym pełnym miesiącu historii.”, prognoza,
  kurs, symulator, inflacja, Killzones – swoje komunikaty; od 2 punktów wykres się rysuje.
- **Nie przechodzi, gdy:**
  - „NaN”, „Infinity”, „undefined”, pusty panel bez słowa albo błąd okna;
  - wykres z jednym punktem rysuje mylący drawdown.

#### WY.27 Wywiad z ukrytymi kwotami (D30, T55, T298)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** Ctrl+$ na Wywiadzie; każdy panel; dymki wykresów; Ctrl+$ ponownie.
- **Oczekiwany efekt:** wszystkie kwoty jako „•••” (tabele, dymki, osie wykresów, poziomy BOS / CHoCH); bilans paliwa
  bez zieleni i czerwieni (znak nie zdradza kwoty); procenty i daty mogą zostać.
- **Nie przechodzi, gdy:**
  - jakakolwiek kwota widoczna (oś wykresu, dymek, „Impulsy łącznie”).

#### WY.28 Wykresy Wywiadu – czytelność (D33, plan audytu oś 9)
- **Kto:** Ty · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** zrzuty krzywej majątku, Killzones, prognozy i kursu (Claude robi zrzuty).
- **Oczekiwany efekt:** czytelne bez instrukcji, wygląd ICTTJ (jeden akcent, zieleń / czerwień tylko dla kwot, bez
  gradientów i cieni); DO OCENY.
- **Nie przechodzi, gdy:**
  - wykres nieczytelny albo mylący (oceniasz Ty).

### RY – rytuały

#### RY.1 Odprawa na Mostku – zawartość (spec „Rytuały”, D48, T57, T68, T74, T221)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (asteroida w 14 dni, zaległy import > 3 dni, saldo
  niepotwierdzone > 7 dni, łupy do decyzji, misja, domownik > 30 dni)
- **Jak sprawdzić:** Mostek → „Odprawa – <dzień>”: energia dziś, „przydział X · podstawowy Y”, Daily Bias, pozycje;
  klik każdej pozycji.
- **Oczekiwany efekt:** Daily Bias, przydział dnia, alerty (asteroidy z kwotą i stanem zbiornika, rozbieżności,
  zaległy import, salda, łupy, domownicy), misja tygodnia; klik prowadzi do przyczyny (Ładownia, korekta, Operacje,
  Plan miesiąca, okno dokowania); bez alarmów – „Bez alarmów – kurs stabilny.”.
- **Nie przechodzi, gdy:**
  - brakuje pozycji z wyroczni albo jest nadmiarowa;
  - klik zawsze prowadzi do Planu miesiąca.
- **Odczyt liczb:** energia dziś, przydział, podstawowy, kwoty w pozycjach.

#### RY.2 Odprawa przy pierwszym otwarciu dnia po ciszy nocnej (spec „Rytuały”, „Powiadomienia”, D70, T56)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`, cisza nocna ustawiona od teraz − 1 h do teraz + 3 min
- **Jak sprawdzić:** start aplikacji (świeże dane komputera) w oknie ciszy; ruch w oknie; po końcu ciszy – ruch
  w oknie; drugi ruch po minucie; zapis powiadomień laboratorium.
- **Oczekiwany efekt:** w ciszy brak powiadomień; pierwszy ruch po ciszy – jedno „Odprawa poranna” z treścią
  „Energia dziś: X zł. Alarmy: N.” (albo „Bez alarmów.”); okno na Mostku; kolejne ruchy tego dnia – bez powtórki.
- **Nie przechodzi, gdy:**
  - odprawa w ciszy nocnej albo dwa razy w dniu;
  - liczba alarmów różna od pozycji czerwonych i żółtych odprawy.

#### RY.3 Odprawa rano – prawdziwy poranek (spec „Rytuały”, T56, D86)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** (a) wieczorem aplikacja w zasobniku, zegar na 7:00 następnego dnia, otworzyć z zasobnika; (b) okno
  zostawione na ekranie przez noc, rano ruch myszą; (c) start Windows o 4:30 (w ciszy), potem 5:05 otwarcie;
  (d) kliknięcie innego powiadomienia rano.
- **Oczekiwany efekt:** (a)–(c) powiadomienie Windows „Odprawa poranna” raz i okno na Mostku; (c) nic przed 5:00;
  (d) okno zostaje na ekranie tego powiadomienia.
- **Nie przechodzi, gdy:**
  - brak odprawy rano albo dwie odprawy;
  - odprawa przerywa kliknięte powiadomienie, przełączając na Mostek.

#### RY.4 Odsłuch odprawy polskim głosem (spec „Rytuały”, D49, T7, T55, N27)
- **Kto:** Ty · **Ryzyko:** niskie · **Stan danych:** `rok`, `brzegi` (energia ujemna)
- **Jak sprawdzić:** „Odsłuchaj” na Mostku (i w odłączonym panelu Odprawy): zwykły dzień; dzień przekroczony; kwoty
  ukryte (Ctrl+$).
- **Oczekiwany efekt:** głos polski czyta datę, energię („Energia na dziś: X złotych” albo „przekroczona o …”), Daily
  Bias, pozycje; przy ukrytych kwotach bez kwot („kwota ukryta”); tempo i wymowa zrozumiałe; nic automatycznie.
- **Nie przechodzi, gdy:**
  - ujemna energia czytana jako „0 złotych”;
  - przy ukrytych kwotach słychać kwotę.

#### RY.5 Odsłuch bez polskiego głosu systemu (T7, N27)
- **Kto:** Claude (tekst) · Maszyna (Windows bez pakietu mowy) · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** nagłówek panelu Odprawy w laboratorium (bez polskiego głosu albo z nim – odnotować); Maszyna –
  Windows bez polskiego pakietu mowy.
- **Oczekiwany efekt:** bez polskiego głosu przycisku „Odsłuchaj” nie ma, jest „Odsłuch: brak polskiego głosu systemu”
  z podpowiedzią o pakiecie mowy Windows; z głosem – przycisk.
- **Nie przechodzi, gdy:**
  - odprawa czytana obcym głosem;
  - brak podpowiedzi, jak dodać głos.

#### RY.6 Silver Bullet – odprawa w trzech zdaniach (spec „Smaczki ICT”, D73, T80, T214)
- **Kto:** Claude (sesja 16:00–17:00 czasu polskiego) · Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** Mostek → Odprawa o 15:55, 16:05 i 17:05 (czas polski poza tygodniami zmiany czasu); odłączony
  panel Odprawy.
- **Oczekiwany efekt:** tylko 10:00–11:00 czasu NY nad pozycjami blok „Silver Bullet · 10:00–11:00 NY”: „Energia dziś
  X zł. Daily Bias: Y. <najważniejszy alarm albo „Bez alarmów.”>”; pełna lista zostaje pod nim; to samo w panelu
  odłączonym.
- **Nie przechodzi, gdy:**
  - blok poza oknem NY albo brak go w oknie;
  - pełna lista znika;
  - „najważniejszy alarm” nie jest pierwszym czerwonym.

#### RY.7 Silver Bullet przy różnej zmianie czasu PL / USA (D73, T80)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** zegar na dzień między ostatnią niedzielą października a pierwszą niedzielą listopada (albo między
  drugą a ostatnią niedzielą marca), 15:05 i 16:05 czasu polskiego.
- **Oczekiwany efekt:** blok o 15:05 (10:05 NY), nie o 16:05.
- **Nie przechodzi, gdy:**
  - okno liczone stałym przesunięciem 6 h.

#### RY.8 Raport wachty – zawartość (spec „Rytuały”, D73, T83, T217, T254)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (tydzień z zakupami z godziną, misją, dniami zgodnymi
  i z naruszeniem)
- **Jak sprawdzić:** Raporty → „Raport wachty”: tytuł z datami, „Koszty netto”, „Przychody” (dymek), dni (kwota
  i ocena), „Kategorie tygodnia”, „Killzone tygodnia”, „Misja tygodnia”, „Koperty na następny tydzień”.
- **Oczekiwany efekt:** tydzień poniedziałek–niedziela; koszty netto tygodnia = suma dni = suma kategorii (z
  „Ładownia (kontenery i opłaty okresowe)”); ocena dnia jak w Dowództwie; killzone tygodnia z liczbą zakupów; misja
  z wynikiem; koperty na dni do końca miesiąca (najwyżej 7).
- **Nie przechodzi, gdy:**
  - suma dni ≠ koszty netto tygodnia;
  - ocena dnia różna od Dowództwa;
  - „Wpływy” zamiast „Przychody”.
- **Odczyt liczb:** koszty netto, przychody, koszty każdego dnia, killzone, koperty.

#### RY.9 Raport wachty – wybór tygodnia (T83, T229, N71)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** w dzień inny niż niedziela po 18:00 otworzyć raport; „‹ tydzień wcześniej” × 3; inny ekran
  i powrót; „bieżący”; „później ›” na bieżącym.
- **Oczekiwany efekt:** domyślnie poprzedni pełny tydzień (bieżący dopiero od niedzieli 18:00); wybór zostaje
  w obrębie tej samej sesji; „bieżący” wraca do domyślnego; „później ›” nieaktywne na bieżącym tygodniu.
- **Nie przechodzi, gdy:**
  - domyślnie bieżący, niepełny tydzień przed niedzielą 18:00;
  - można przejść w przyszłość.

#### RY.10 Raport wachty w niedzielę od 18:00 (spec „Powiadomienia”, D73, T83, T229)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** w środę cofnąć raport o 3 tygodnie; zegar na niedzielę 17:58 → 18:01; kliknąć powiadomienie;
  potem Raporty z menu.
- **Oczekiwany efekt:** o 18:00 jedno powiadomienie „Raport wachty” („Tydzień w liczbach, killzone, koperty na
  następny tydzień i misja – Raporty.”); klik otwiera raport tego tygodnia; z menu też ten tydzień (stary wybór
  unieważniony).
- **Nie przechodzi, gdy:**
  - powiadomienie przed 18:00 albo w inny dzień;
  - z menu otwiera się tydzień sprzed 3 tygodni.

#### RY.11 Raport wachty w ostatni dzień miesiąca (B65, CHANGELOG 1.6.1)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** zegar na ostatni dzień miesiąca (najlepiej niedzielę po 18:00, np. 31.01.2027); raport wachty.
- **Oczekiwany efekt:** brak „na 1 dni”; koperty następnego tygodnia nie liczą jutra z kopert tego miesiąca (od 1.
  koperty startują od nowa).
- **Nie przechodzi, gdy:**
  - „X zł na 1 dni” z resztą koperty kończącego się miesiąca.

#### RY.12 Wieczorne dopisanie – pasek „Raport wachty dnia” (spec „Codzienny rytm”, F13, T210)
- **Kto:** Claude (sesja przed 18:00) · **Ryzyko:** średnie · **Stan danych:** `rok` (dziś 0, potem 2 wpisy
  z godziną); godzina wieczorna = teraz − 1 min
- **Jak sprawdzić:** Operacje – pasek; „Dopisz”; dopisać 2 wydatki z godziną (przed 18:00 – wpis dopisany po 18:00
  zamyka raport, RY.16); zapis powiadomień.
- **Oczekiwany efekt:** pasek „Raport wachty dnia” z przyciskami „Dopisz” (otwiera szybki wpis), „Dziś bez wydatków”,
  „Przypomnij za 30 min”; tekst „Dziś nic jeszcze nie dopisano – …”, po wpisach „Dziś dopisano 2 operacje z godziną –
  …”; powiadomienie o tej samej treści raz.
- **Nie przechodzi, gdy:**
  - pasek przed godziną z ustawień;
  - zła odmiana liczebnika;
  - powiadomienie co minutę.

#### RY.13 „Dziś bez wydatków” (F13, T210, T213)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (dziś bez kosztu); drugi przebieg – dziś z wydatkiem;
  historia z potwierdzonymi dniami bez kosztu
- **Jak sprawdzić:** „Dziś bez wydatków” → pasek; restart; dziennik wachty dni potwierdzonych w historii; misja „Dzień
  bez wydatków”; to samo w dniu z wydatkiem.
- **Oczekiwany efekt:** pasek „Raport wachty zamknięty („Dziś bez wydatków”)” z „Wznów raport wachty”; potwierdzenie
  w folderze (zostaje po restarcie); dzień bez kosztu po zamrożeniu ma „Dzień bez wydatków – potwierdzony w raporcie
  wachty” i liczy się do misji; dzień z wydatkiem – bez znacznika (sensowne: ostrzeżenie przy kliknięciu).
- **Nie przechodzi, gdy:**
  - dzień z wydatkiem dostaje znacznik albo zalicza misję;
  - potwierdzenie ginie po restarcie.

#### RY.14 „Przypomnij za 30 min” (F13, T210)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`, godzina wieczorna = teraz − 1 min
- **Jak sprawdzić:** „Przypomnij za 30 min” → pasek; po 30 min zapis powiadomień i pasek; restart w trakcie.
- **Oczekiwany efekt:** „Raport wachty odłożony do GG:MM” (+30 min) z „Wznów raport wachty”; po 30 min pasek wraca
  i jedno nowe powiadomienie; odłożenie tylko na tym komputerze.
- **Nie przechodzi, gdy:**
  - przypomnienie nie wraca albo wraca wcześniej;
  - godzina odłożenia w złym formacie albo w UTC.

#### RY.15 „Wznów raport wachty” (N-PC-20, D95, CHANGELOG 1.15.2)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** „Dziś bez wydatków” → „Wznów raport wachty”; restart; to samo po „Przypomnij za 30 min”.
- **Oczekiwany efekt:** pasek z przyciskami wraca; wznowienie po przypadkowym „Dziś bez wydatków” cofa potwierdzenie
  dnia (po restarcie dzień niepotwierdzony); wznowienie odłożonego kasuje odłożenie.
- **Nie przechodzi, gdy:**
  - po wznowieniu dzień dalej „bez wydatków” (znacznik i misja);
  - po restarcie pasek znowu zamknięty bez powodu.

#### RY.16 Kiedy wieczorne przypomnienie nie przychodzi (F13, T210, N104)
- **Kto:** Claude (sesja po 18:00) · Maszyna · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** (a) wydatek z godziną po 18:00 dopisany dziś → pasek; (b) wydatek z godziną 12:00 dopisany po
  18:00; (c) godzina wieczorna 23:30 przy ciszy 23:00–5:00 (cisza przesunięta względem teraz) – Ustawienia → godzina
  i chwila przypomnienia; (d) przełącznik powiadomienia wyłączony.
- **Oczekiwany efekt:** (a) i (b) – bez paska i powiadomienia; (c) – Ustawienia uprzedzają, przypomnienie minutę
  przed ciszą; (d) – bez powiadomienia, pasek zostaje.
- **Nie przechodzi, gdy:**
  - przypomnienie mimo dopisania po 18:00;
  - godzina w ciszy nocnej = przypomnienie nigdy.

#### RY.17 Wieczorne – powiadomienie Windows i zasobnik (spec „Okna i zasobnik”, T59, T210, B88)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** `rok` (zapisany widok w Operacjach)
- **Jak sprawdzić:** 21:00 z oknem w zasobniku; kliknąć powiadomienie; menu zasobnika: „Raport wachty dnia”, „Dziś bez
  wydatków”, „Przypomnij za 30 min” przy ukrytym oknie.
- **Oczekiwany efekt:** powiadomienie „Raport wachty dnia”; klik i pozycja menu otwierają Operacje z dzisiejszymi
  wpisami bez kasowania zapisanego filtra; akcje menu działają przy ukrytym oknie, odpowiedź powiadomieniem.
- **Nie przechodzi, gdy:**
  - zapisany filtr Operacji skasowany;
  - akcja z zasobnika bez skutku.

#### RY.18 Debriefing – powiadomienie od 1. dnia miesiąca (spec „Rytuały”, „Powiadomienia”, D18, T56)
- **Kto:** Claude (dni 1–7) · Maszyna (przełom miesiąca) · **Ryzyko:** średnie · **Stan danych:** `rok`; `start`
  (pierwszy miesiąc budżetu)
- **Jak sprawdzić:** zapis powiadomień po starcie; klik; drugi start tego samego dnia; `start`. Maszyna: zegar z
  ostatniego dnia miesiąca na 1. po 5:00 i na 8. dzień.
- **Oczekiwany efekt:** od 1. do 7. dnia raz na komputer „Debriefing miesiąca” („Miesiąc zamknięty – wynik wobec
  planu i podział łupów (Plan miesiąca).”), klik – Plan miesiąca z debriefingiem; od drugiego miesiąca budżetu; 8.
  dnia – bez.
- **Nie przechodzi, gdy:**
  - powiadomienie przy każdym starcie;
  - w pierwszym miesiącu budżetu albo po 7. dniu.

#### RY.19 Debriefing w Raportach – treść (spec „Rytuały”, D18, D73, T83, T214, T215, T294, B10)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (poprzedni miesiąc z łupami „na następny miesiąc”,
  do celu i do osłon, z późnym importem po decyzji)
- **Jak sprawdzić:** Raporty → „Debriefing”: domyślny miesiąc; sekcje „Wynik wobec planu”, „FVG kopert (plan −
  fakt)”, „Dowództwo”, „Dziennik kapitański”, „Podział łupów”; porównać z Plan miesiąca → debriefing.
- **Oczekiwany efekt:** domyślnie poprzedni miesiąc; pensja, koszty netto, ładownia, „Bez koperty”, „Bez kategorii”,
  sfinansowane przez domowników (osobno), energia miesiąca, bilans paliwa i stopa (mediana 6 mies.), „na plus”, łupy;
  FVG z pulą codzienną; dni zgodne / z naruszeniem, poważne, misje, osiągnięcia; trafność; podział łupów taki, jak
  policzył go silnik (po późnym imporcie). Wiersze składają się na koszty netto.
- **Nie przechodzi, gdy:**
  - liczba różna od Planu miesiąca, Wywiadu (FVG, bilans) albo wyroczni;
  - podział łupów z zapisanej decyzji zamiast z silnika po imporcie.
- **Odczyt liczb:** wszystkie wiersze sekcji.

#### RY.20 Debriefing – miesiąc w toku, pierwszy miesiąc budżetu (T215, N65, N25)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`; `start`
- **Jak sprawdzić:** w Debriefingu wybrać bieżący miesiąc i pierwszy miesiąc budżetu; lista miesięcy.
- **Oczekiwany efekt:** bieżący – „Miesiąc zamknięty na plus: miesiąc trwa”, „Łupy …: miesiąc trwa”; lista od
  pierwszego miesiąca budżetu; pierwszy miesiąc – pensja pomniejszona o koszty sprzed startu (T45), bez łupów, gdy
  silnik nie przeszedł końca miesiąca.
- **Nie przechodzi, gdy:**
  - „tak” albo „nie” przed końcem miesiąca;
  - miesiące sprzed startu na liście z łupami.

#### RY.21 „Miesiąc zamknięty na plus” (spec „Debriefing”, „Seria…”, D39, D42, T52, T178, N6)
- **Kto:** Claude (tekst, animacja) · Ty (dźwięk) · **Ryzyko:** średnie · **Stan danych:** `rok` (miesiąc na plus;
  na minusie z energią wyczerpaną; miesiąc z kosztami ≤ pensji, ale energią wyczerpaną przez raty odkładek)
- **Jak sprawdzić:** Plan miesiąca → debriefing każdego z tych miesięcy; zrzut; restart i ponowne otwarcie.
- **Oczekiwany efekt:** na plus – wyróżniony blok „Miesiąc zamknięty na plus” z rachunkiem energii i krótką animacją,
  dźwięk raz na komputer; na minusie – „Energia wyczerpana: X ponad energię miesiąca Y poszło z osłon.”; trzeci
  przypadek – według rozstrzygnięcia wątpliwości (spec: koszty ≤ pensja; T178: wynik energii ≥ 0) – odnotować.
- **Nie przechodzi, gdy:**
  - fanfara przy alarmie „energia wyczerpana”;
  - dźwięk przy każdym otwarciu;
  - wynik różny w Planie miesiąca, Raportach i eksporcie „Miesiące”.
- **Odczyt liczb:** energia miesiąca, wydane z energii, wynik.

#### RY.22 „Miesiąc na plus” na przełomie miesiąca (spec „Debriefing”, T52)
- **Kto:** Maszyna · Ty (dźwięk) · **Ryzyko:** niskie · **Stan danych:** `rok` (bieżący miesiąc na plus)
- **Jak sprawdzić:** zegar na 1. dzień następnego miesiąca po 5:00; Plan miesiąca; drugie otwarcie.
- **Oczekiwany efekt:** blok i animacja przy pierwszym spojrzeniu po końcu miesiąca, dźwięk raz; drugie otwarcie –
  blok bez dźwięku.
- **Nie przechodzi, gdy:**
  - blok przed końcem miesiąca albo brak go po nim.

#### RY.23 Przegląd roczny – treść (spec „Rytuały”, D58, D73, T83, T217, T293, F25, N66)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** Raporty → „Przegląd roczny”, rok poprzedni: „Rok w liczbach”, „Miesiące”, „Kategorie”, „Cele
  i osiągnięcia”, „PIT-38”.
- **Oczekiwany efekt:** koszty netto, sfinansowane przez domowników, przychody, pieniądze na kontach i siła floty netto
  na początku (31.12 roku wcześniej) i na końcu, bilans paliwa roku ze stopą, zasięg teraz z klasą; tabela miesięcy
  z dopiskiem o tradingu netto; top 12 kategorii; cele osiągnięte i osiągnięcia roku; PIT-38 „Rozliczenie za RRRR:
  termin 30 kwietnia RRRR+1 …” bez kwoty.
- **Nie przechodzi, gdy:**
  - jakakolwiek kwota PIT-38;
  - liczby różne od wyroczni i eksportu;
  - salda na początku i końcu niezgodne z krzywą majątku w tych dniach.
- **Odczyt liczb:** wszystkie wiersze „Rok w liczbach”, sumy tabeli miesięcy.

#### RY.24 Przegląd roczny – rok niepełny i bieżący (D73, T83)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok` (pierwszy rok historii zaczęty jesienią)
- **Jak sprawdzić:** lista lat; pierwszy rok historii; bieżący rok.
- **Oczekiwany efekt:** lata z historii i bieżący; pierwszy rok – saldo na początku zgodne z historią (bez fałszywego
  0 zł), miesiące tylko objęte; bieżący – „na końcu (dziś)”.
- **Nie przechodzi, gdy:**
  - rok niepełny pokazuje puste miesiące jako 0 zł kosztów w średnich albo sumach;
  - bieżący rok z „31.12” w przyszłości.

#### RY.25 Przegląd roczny w styczniu (spec „Rytuały”, D73)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** zegar na 2.01.2027; Raporty → „Przegląd roczny”; zapis powiadomień stycznia.
- **Oczekiwany efekt:** domyślnie rok 2026; wcześniejsze lata do wyboru; odnotować, czy jest przypomnienie (spec
  „w styczniu” – bez powiadomienia w tabeli powiadomień).
- **Nie przechodzi, gdy:**
  - w styczniu domyślnie bieżący, prawie pusty rok.

### RE – Raporty i eksport

#### RE.1 Ekran Raporty – zakładki i dojście (spec „Ekrany”, D48, T21, T83)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** Ctrl+0; zakładki; paleta Ctrl+K „raport”; klik zapisanego powiadomienia raportu wachty.
- **Oczekiwany efekt:** zakładki „Odprawa”, „Raport wachty”, „Debriefing”, „Przegląd roczny”, „Eksport”; Ctrl+0 i
  paleta prowadzą do Raportów; powiadomienie – do raportu wachty.
- **Nie przechodzi, gdy:**
  - skrót prowadzi gdzie indziej albo zakładka pusta bez komunikatu.

#### RE.2 Odprawa w Raportach = odprawa na Mostku (N26, T214)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok`, `start`
- **Jak sprawdzić:** Raporty → „Odprawa” i Mostek → Odprawa w tej samej minucie.
- **Oczekiwany efekt:** ta sama energia dziś, Daily Bias i pozycje (te same teksty i kolejność); bez alarmów – „Bez
  alarmów – kurs stabilny.”.
- **Nie przechodzi, gdy:**
  - pozycja albo liczba różni się między ekranami.

#### RE.3 Eksport – okres, nazwy plików, zapis (spec „Eksport”, D29, T84)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** Raporty → „Eksport”: pola „Od” i „Do”; każdy przycisk („Operacje – CSV”, „Miesiące – CSV”, „Excel
  (operacje + miesiące)”, „Pełna kopia danych – ZIP”); anulowanie okna zapisu.
- **Oczekiwany efekt:** domyślnie od 1 stycznia do dziś; nazwy z rodzajem i okresem (np.
  „financial-intel_operacje_RRRR-MM-DD_RRRR-MM-DD.csv”); toast z miejscem zapisu; anulowanie – nic, bez błędu;
  objaśnienie, że pliki mają prawdziwe kwoty.
- **Nie przechodzi, gdy:**
  - plik pusty albo zapisany mimo anulowania;
  - nazwa bez okresu albo z niedozwolonym znakiem.

#### RE.4 Operacje – CSV: format pliku (spec „Eksport”, T84)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** otworzyć bajty pliku: BOM, końce linii, separator, nagłówek, kwoty, daty, godziny.
- **Oczekiwany efekt:** UTF-8 z BOM; średnik; przecinek dziesiętny, zawsze 2 miejsca, minus przy wydatkach (zwrot
  dodatni), bez spacji tysięcy rozbijających liczbę; nagłówek „Data; Godzina; Konto; Rodzaj; Kwota (zł); Kategoria;
  Kontrahent; Tytuł; Finansuje; Dziennik; Notatka; Tagi”; data jednym formatem rozpoznawanym przez polski Excel;
  pusta godzina przy imporcie; polskie znaki poprawne.
- **Nie przechodzi, gdy:**
  - kropka dziesiętna, przecinek jako separator pól albo krzaki zamiast polskich liter;
  - kwota w groszach albo w formacie, którego Excel nie czyta jako liczby.

#### RE.5 Operacje – CSV: zawartość (D29, D80, D89, T84, T291)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (paragon dzielony z opisami części, wspólny zakup,
  przelew między kontami, zwrot, wpłata domownika, tagi, dziennik plan / impuls, operacja z datą w przyszłości)
- **Jak sprawdzić:** porównać plik z Operacjami za ten sam okres (liczba operacji, suma kwot, wybrane wiersze).
- **Oczekiwany efekt:** każda operacja okresu raz (części paragonu – wiersze części z opisami, sumujące się do
  operacji); „Finansuje” z osobą; „Dziennik” plan / impuls; tagi; przelew między kontami bez podwójnego liczenia
  (obie strony opisane); operacje spoza okresu pominięte.
- **Nie przechodzi, gdy:**
  - suma kwot pliku różna od sumy Operacji za okres;
  - brak operacji albo podwójna;
  - opis części paragonu zgubiony.
- **Odczyt liczb:** liczba wierszy, suma kolumny „Kwota (zł)” wydatków i wpływów osobno.

#### RE.6 CSV – znaki specjalne i formuły (T84)
- **Kto:** Claude (bajty) · Ty (Excel) · **Ryzyko:** średnie · **Stan danych:** `rok` (notatka ze średnikiem,
  cudzysłowem i nową linią; kontrahent „=SUMA(A1)”, „+48 600…”, „-rabat”, „@firma”; „Zażółć gęślą jaźń”)
- **Jak sprawdzić:** odczyt wierszy w pliku; otwarcie w Excelu (Ty).
- **Oczekiwany efekt:** pola z `;`, `"` i nową linią w cudzysłowie (cudzysłów podwojony); tekst zaczynający się jak
  formuła z apostrofem – Excel pokazuje tekst, nie liczy; polskie litery poprawne.
- **Nie przechodzi, gdy:**
  - wiersz rozjeżdża się na kolumny;
  - Excel wykonuje formułę.

#### RE.7 Miesiące – CSV (spec „Eksport”, T84, T178, T215, T294, N65, B92)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (okres od miesiąca sprzed startu budżetu do dziś)
- **Jak sprawdzić:** plik „Miesiące – CSV”; nagłówek; wiersze; porównanie z debriefingiem i Bilansem paliwa.
- **Oczekiwany efekt:** nagłówek „Miesiąc; Pensja (zł); Koszty netto (zł); Przychody (zł); Na plus; Łupy (zł); Bilans
  (zł); Stopa oszczędności (%)”; wiersz na miesiąc; „Na plus” tak / nie, bieżący „w toku”; miesiące sprzed startu –
  pusta komórka łupów (nie „0,00”); bilans i stopa = Wywiad i debriefing.
- **Nie przechodzi, gdy:**
  - bieżący miesiąc „tak”;
  - liczby różne od debriefingu tego miesiąca.
- **Odczyt liczb:** wszystkie wiersze.

#### RE.8 Excel – arkusze Operacje i Miesiące (spec „Eksport”, T84)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** rozpakować XLSX: arkusze, typy komórek, nagłówki; porównać z CSV tego samego okresu.
- **Oczekiwany efekt:** dwa arkusze „Operacje” i „Miesiące” z tymi samymi kolumnami i wierszami co CSV; kwoty jako
  liczby (nie tekst), stopa jako liczba; polskie znaki; plik bez błędu struktury.
- **Nie przechodzi, gdy:**
  - kwoty jako tekst;
  - liczba wierszy różna od CSV.

#### RE.9 Excel w Excelu (D29, T84)
- **Kto:** Ty · **Ryzyko:** niskie · **Stan danych:** `rok`
- **Jak sprawdzić:** otworzyć XLSX i oba CSV w Excelu (dwuklik); zsumować kolumnę kwot; posortować po dacie.
- **Oczekiwany efekt:** otwiera się bez ostrzeżeń i naprawy; kolumny czytelnej szerokości; kwoty i daty rozpoznane
  (suma i sortowanie działają); polskie znaki; DO OCENY – wygoda.
- **Nie przechodzi, gdy:**
  - Excel naprawia plik albo CSV ląduje w jednej kolumnie.

#### RE.10 PDF debriefingu i przeglądu rocznego (spec „Eksport”, D29, T84, T254)
- **Kto:** Claude · Ty (wygląd wydruku) · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** Debriefing → „PDF”, Przegląd roczny → „PDF”; tekst z PDF (pdftotext); zrzut strony.
- **Oczekiwany efekt:** nazwy „debriefing_RRRR-MM.pdf”, „przeglad_RRRR.pdf”; tytuł, podtytuł „Financial Intel ·
  DD.MM.RRRR”, te same sekcje i liczby co ekran; FVG ze znakiem „+”; polskie litery; tabela nie ucięta na granicy
  strony; bez skryptów i treści z sieci.
- **Nie przechodzi, gdy:**
  - liczba różna od ekranu;
  - polskie litery jako kwadraty;
  - tabela ucięta.
- **Odczyt liczb:** liczby sekcji „Wynik wobec planu” i „Rok w liczbach” z PDF.

#### RE.11 Eksport przy ukrytych kwotach (D73, T84)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** Ctrl+$; eksport CSV, Excel, PDF debriefingu; porównać z eksportem bez ukrycia.
- **Oczekiwany efekt:** pliki identyczne co do kwot – zawsze prawdziwe; ekran zamaskowany; objaśnienie w panelu
  Eksport.
- **Nie przechodzi, gdy:**
  - w pliku „•••” zamiast kwot.

#### RE.12 Pełna kopia danych – ZIP (spec „Eksport”, D29, T84, T254, N96, CHANGELOG 1.6.5)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok` (z historią zmian, kopiami w `backups/`)
- **Jak sprawdzić:** Raporty → „Pełna kopia danych – ZIP” i Ustawienia → „Eksport: ZIP całego folderu…”; lista plików
  ZIP; rozpakować do pustego folderu i otworzyć w laboratorium; czas tworzenia.
- **Oczekiwany efekt:** domyślna nazwa „Financial-Intel-RRRR-MM-DD.zip” (data warszawska); w środku `fi.json`,
  wszystkie kolekcje i historia zmian, bez `backups/` i `.presence/`; folder z ZIP otwiera się bez błędu z tymi samymi
  liczbami Mostka; oba przyciski dają ten sam zestaw; kilka sekund na folderze `rok`.
- **Nie przechodzi, gdy:**
  - brak plików danych albo historii;
  - w ZIP kopie zapasowe (rozrost) albo ścieżki z `..`;
  - po rozpakowaniu inne liczby.
- **Odczyt liczb:** liczba plików wg kolekcji, energia dziś i suma kont po otwarciu kopii.

#### RE.13 Eksport widocznej listy z Operacji (F18, D89 e, CHANGELOG 1.7.0)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** `rok`
- **Jak sprawdzić:** Operacje: filtr Jedzenie, kwota od 50 zł, sortowanie po kwocie, ukryte kolumny Notatka i Tagi;
  „CSV” i „Excel” widocznych.
- **Oczekiwany efekt:** te same wiersze w tej samej kolejności co lista; wszystkie kolumny (także ukryte); nazwa
  „operacje_<dzień>” z rozszerzeniem; format jak RE.4.
- **Nie przechodzi, gdy:**
  - wiersz spoza filtra albo inna kolejność;
  - ukryte kolumny pominięte.

#### RE.14 Sumy eksportu zgodne z ekranami (plan audytu oś 2, T215, T294)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** `rok`
- **Jak sprawdzić:** dla 2 miesięcy: koszty netto z „Miesiące – CSV”, debriefingu (Raporty, Plan miesiąca, PDF),
  „Razem” w „Wydatki w czasie”, Bilans paliwa, raportów wachty tygodni miesiąca; przychody z CSV, panelu „Przychody”
  i Bilansu paliwa.
- **Oczekiwany efekt:** ta sama kwota co do grosza w każdym miejscu.
- **Nie przechodzi, gdy:**
  - jakakolwiek różnica (opisać źródło i kwotę).
- **Odczyt liczb:** wszystkie porównywane kwoty → AU-9.

#### RE.15 Eksport pustego okresu, odwrócone daty, duże kwoty i długie teksty (brak wymagania; T241)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** `rok` (kwota 1 234 567,89 zł, notatka 5000 znaków), `start-0`
- **Jak sprawdzić:** okres bez operacji; „Do” wcześniejsze niż „Od”; eksport okresu z dużą kwotą i długą notatką
  (CSV, Excel, PDF debriefingu).
- **Oczekiwany efekt:** pusty okres – plik z samym nagłówkiem albo komunikat; odwrócone daty – komunikat albo
  zamiana, bez błędu; duża kwota „1234567,89” (albo z separatorem, który Excel czyta) w CSV i liczbą w Excelu; długa
  notatka cała w CSV i Excelu, w PDF zawinięta.
- **Nie przechodzi, gdy:**
  - błąd okna albo plik uszkodzony;
  - duża kwota w notacji wykładniczej albo ucięta.
