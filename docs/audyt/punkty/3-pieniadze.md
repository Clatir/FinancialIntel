# Audyt 1.15.4 – punkty, część 3: silnik pieniędzy

Plan miesiąca, Ładownia, dokowanie i granica ICTTJ, Mapa gwiezdna, domownicy i pożyczki, Radar oraz przekrój liczb
między ekranami – sprawdzane w bloku C (AU-9, AU-10) z wyrocznią liczb i najwyższą starannością (D96, D97).

**Legenda pól**
- Nagłówek punktu: `PREFIKS.n Nazwa (źródło)` – źródło wymagania: spec (sekcja), D…, F…, T…, N-PC…, B…, N…, wersja.
- **Kto:** Claude – laboratorium: wydana aplikacja sterowana Playwrightem na syntetycznym folderze FI i syntetycznym
  folderze ICTTJ (może dopisywać i zmieniać pliki w swojej kopii fikstury ICTTJ, liczy sumy kontrolne), nie zmienia
  zegara (historia ułożona względem dnia wygenerowania), nie widzi powiadomień Windows (tylko zapis i `main.log`);
  Maszyna – Cowork w maszynie wirtualnej (zegar tylko do przodu, prawdziwe powiadomienia); Ty – prawdziwy folder ICTTJ,
  prawdziwa wypłata i prawdziwy mBank.
- **Ryzyko:** wysokie – pieniądze (zła kwota, zła warstwa, zapis w folderze ICTTJ); średnie – działa źle w brzegu albo
  myli; niskie – ergonomia i tekst.
- **Stan danych:** stany persony „Kapitan Testowy”: `pusty`, `start`, `rok`, `brzegi` oraz wariant `spec-dok`
  (warstwy dokładnie jak w przykładzie ze specyfikacji); nazwy kont, domowników, kontenerów, celów, pożyczek i wpisów
  ICTTJ – jak w opisie generatora (AU-2). Punkt mówi, czego potrzebuje ponad stan.
- **Jak sprawdzić / Oczekiwany efekt / Nie przechodzi, gdy:** jak w odbiorze Regulated Day. Oczekiwanie pochodzi
  z wymagań, nie z kodu; „brak wymagania” = oczekiwanie sensowne dla użytkownika.
- **Odczyt liczb:** liczby czytane z ekranu jako tekst, z datą i godziną odczytu, do `C:\FI-audyt\odczyty\` –
  porównanie z wyrocznią w AU-9 (werdykt „liczby → AU-9”).
- Oznaczenia: D – dzień odczytu; M0 – miesiąc odczytu, M-1 / M+1 – sąsiednie; „wyrocznia” – liczba z AU-9.
  Ekrany: Mostek Ctrl+1, Plan miesiąca Ctrl+4, Ładownia Ctrl+5, Mapa gwiezdna Ctrl+6, Radar Ctrl+7.

### PM – Plan miesiąca

#### PM.1 Pensja 1. dnia z osłon (spec „Pensja od siebie”, D11, T46)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – plan M0 z pensją (np. 4 500 zł), 1. dnia M0 osłony
  większe niż pensja.
- **Jak sprawdzić:** Plan miesiąca → bieżący miesiąc → panel „Pensja”: pole „Pensja”, linia „Wypłacono: …”, „Cel osłon:
  … (pensje × 3)”. Mostek → „Stan okrętu”: „Osłony · bufor na pensje”, „Energia · pensja miesiąca do wydania”.
- **Oczekiwany efekt:** „Wypłacono” = pensja z planu M0, w całości z osłon (bez dopisku „z kadłuba”); brak alarmu
  pensji; cel osłon = 3 × pensja; energia na Mostku = pensja − raty odkładek − wydatki z energii od 1. dnia (wyrocznia).
- **Nie przechodzi, gdy:**
  - „Wypłacono” różni się od pensji planu przy wystarczających osłonach;
  - pensja wypłacona w innym dniu niż 1. albo dwa razy;
  - cel osłon nie jest wielokrotnością pensji z ustawienia warstw.
- **Odczyt liczb:** pensja planu, „Wypłacono”, cel osłon, osłony, energia (Mostek).

#### PM.2 Za mało w osłonach – reszta z kadłuba, żółty alarm (spec, D14, plan E1 – 4 000 / 2 500)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** brzegi – pensja M0 4 000 zł; przed wypłatą 1. dnia M0 osłony
  2 500 zł, kadłub co najmniej 1 500 zł.
- **Jak sprawdzić:** Plan miesiąca → M0 → „Pensja”; Mostek → odprawa i „Stan okrętu”; Dowództwo → dziennik dnia 1.
- **Oczekiwany efekt:** „Wypłacono: 4 000,00 zł (z osłon – bufora na pensje 2 500,00 zł, z kadłuba – funduszu
  awaryjnego 1 500,00 zł)”; żółty alarm „Za mało w osłonach: 1 500,00 zł z kadłuba (żółty alarm).”; w odprawie alarm
  z prawdziwą nazwą („funduszu awaryjnego”, D34); kadłub niższy o 1 500 zł; to nie jest naruszenie rozkazu – dzień 1.
  bez naruszenia „osłony poniżej minimum” (spec, T16).
- **Nie przechodzi, gdy:**
  - podział 2 500 / 1 500 inny albo alarm czerwony;
  - pensja częściowa mimo pieniędzy w kadłubie;
  - Dowództwo liczy 1. dzień jako naruszenie.
- **Odczyt liczb:** „Wypłacono”, z osłon, z kadłuba, kadłub i osłony (Mostek).

#### PM.3 Pensja częściowa – czerwony alarm, brzeg „pusty kadłub” (spec, D14)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** brzegi – miesiąc z pensją 4 000 zł, przed wypłatą osłony
  2 500 zł i kadłub 500 zł; drugi wariant (osobny miesiąc albo stan): osłony 0 i kadłub 0.
- **Jak sprawdzić:** Plan miesiąca → ten miesiąc → „Pensja”; Mostek → odprawa.
- **Oczekiwany efekt:** wariant 1: „Wypłacono: 3 000,00 zł”, czerwony alarm „Pensja częściowa: brakuje 1 000,00 zł
  (czerwony alarm).”, osłony i kadłub po wypłacie 0,00 zł; wariant 2: wypłacono 0,00 zł, brakuje 4 000,00 zł. Bez
  naruszenia w grze (nie decyzja użytkownika – T16).
- **Nie przechodzi, gdy:**
  - wypłacona cała pensja, a osłony albo kadłub schodzą poniżej zera;
  - alarm żółty albo brak alarmu;
  - kwota „brakuje” ≠ pensja − (osłony + kadłub).
- **Odczyt liczb:** „Wypłacono”, „brakuje”, osłony i kadłub po wypłacie.

#### PM.4 Ostrzeżenie „pensja wyższa niż średnie przychody” (spec, D81, T120, T217)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – pensja M0 wyższa niż średnia „Razem” z 6 pełnych
  miesięcy w panelu „Przychody”.
- **Jak sprawdzić:** Plan miesiąca → M0 → „Pensja” i „Przychody”; Mostek → odprawa. Potem obniż pensję M0 poniżej
  średniej (pole „Pensja”, Tab) i wróć do pierwotnej kwoty.
- **Oczekiwany efekt:** „Pensja wyższa niż średni przychód z 6 mies. o X zł – osłony będą się kurczyć.”, X = pensja −
  średnia 6 mies. „Razem” z panelu „Przychody” (ta sama liczba w odprawie); przy pensji ≤ średniej ostrzeżenie znika.
- **Nie przechodzi, gdy:**
  - X nie jest różnicą pensji i średniej z panelu;
  - ostrzeżenie przy pensji równej albo niższej niż średnia;
  - średnia liczy bieżący miesiąc albo wpływy brutto zamiast przychodu (D81).
- **Odczyt liczb:** pensja, średnia 6 mies. „Razem”, X.

#### PM.5 Panel „Przychody”: 3, 6, 12 miesięcy i mediana (spec „Przychody”, D81, T119, T120, N4, N38)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – stała pensja z pracy, jedna premia (np. +6 000 zł
  w M-5), wypłaty z XTB różnej wielkości, miesiąc, w którym dopłaty do XTB są większe niż wypłaty, wypłata z puli
  Podatek, wpłaty domowników (spłata i zaliczka), przelewy własne, spłata pożyczki udzielonej, zwrot towaru.
- **Jak sprawdzić:** Plan miesiąca → „Przychody” (wiersze „Praca i inne”, „Trading (XTB)”, „Razem”; kolumny „3 mies.”,
  „6 mies.”, „12 mies.”, „mediana”; „Pełnych miesięcy historii: N”). To samo na Mostku → „Przychody”.
- **Oczekiwany efekt:** okna z pełnych miesięcy przed bieżącym; mediana z 12 miesięcy (premia podnosi średnie, nie
  medianę); praca bez przelewów własnych, spłat i zaliczek domowników i spłat pożyczek; trading = wypłaty − dopłaty, bez
  puli Podatek, miesiąc nigdy poniżej zera (okno – netto ze wszystkich jego miesięcy, T186); Mostek = Plan miesiąca.
- **Nie przechodzi, gdy:**
  - bieżący miesiąc wchodzi do średnich;
  - wypłata z puli Podatek, zaliczka domownika albo spłata pożyczki jest przychodem;
  - mediana „Razem” liczona z miesiąca z ujemnym tradingiem;
  - liczby na Mostku i w Planie miesiąca różne.
- **Odczyt liczb:** 12 liczb (3 wiersze × 4 kolumny), N.

#### PM.6 Przychody i propozycje przy krótkiej historii (T120, T173, B23, B25)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** start (mniej niż 1 pełny miesiąc historii); rok z dopisaną
  starą pożyczką z Radaru sprzed historii banku.
- **Jak sprawdzić:** Plan miesiąca → „Przychody”, „Pensja” (propozycja), „Koperty ze średnich”.
- **Oczekiwany efekt:** start: „Średnie będą po pierwszym pełnym miesiącu historii.”, brak propozycji pensji, przy
  „Koperty ze średnich” komunikat „Za mało historii…” (nie zera); rok: stara pożyczka nie dokłada pustych miesięcy –
  średnie i propozycje bez zmian wobec stanu bez niej; okno krótsze niż 3 / 6 / 12 – średnia z tylu, ile jest.
- **Nie przechodzi, gdy:**
  - pojawiają się średnie 0,00 zł albo propozycja pensji 0 zł;
  - pożyczka sprzed historii zaniża średnie (puste miesiące liczone jako zero).
- **Odczyt liczb:** średnie i propozycje w obu wariantach.

#### PM.7 Propozycja pensji ze średnich kosztów (D70, T47, T173)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok.
- **Jak sprawdzić:** Plan miesiąca → „Następny miesiąc” (M+1) → „Pensja”: „Średnie koszty z N mies.: X · przyjmij Y” →
  „przyjmij Y”. Wróć do M0 („bieżący”).
- **Oczekiwany efekt:** N = 6 pełnych miesięcy przed bieżącym; X = średnie koszty netto (wydatki − zwroty towarów, bez
  przelewów własnych, dopłat do XTB, zakupów domowników, PIT-38 z rezerwy i wydatków z celu – spec, T24); Y = X w górę
  do pełnych 100 zł; „przyjmij” zmienia tylko M+1 (własny plan), M0 bez zmian.
- **Nie przechodzi, gdy:**
  - N obejmuje bieżący miesiąc albo miesiąc bez operacji (luka importu);
  - Y zaokrąglone w dół albo do innej wielokrotności;
  - zmiana M+1 zmienia pensję M0.
- **Odczyt liczb:** N, X, Y.

#### PM.8 „Koperty ze średnich” (D70, T47, spec „Plan następnego miesiąca”)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – w ostatnich 3 pełnych miesiącach płatności kontenerów
  w kategoriach z kopertami (Czynsz w „Dom”, Internet w „Subskrypcje i łączność”).
- **Jak sprawdzić:** Plan miesiąca → M+1 → „Podział pensji” → „Koperty ze średnich”; komunikat; popraw jedną kopertę.
- **Oczekiwany efekt:** komunikat „Koperty ze średnich z 3 mies. (…)” z nazwami miesięcy; koperta każdej kategorii
  głównej = średnie wydatki tej kategorii z 3 pełnych miesięcy, do 10 zł, bez płatności kontenerów i zakupów
  domowników; ręczna poprawka zostaje; M0 bez zmian.
- **Nie przechodzi, gdy:**
  - płatności Czynszu albo Internetu podnoszą koperty;
  - liczy się bieżący miesiąc;
  - koperta nie jest wielokrotnością 10 zł.
- **Odczyt liczb:** koperta każdej kategorii, miesiące z komunikatu.

#### PM.9 Plan odziedziczony i własny; zmiana minionego planu (T46, B11, T138)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – własny plan w M-3, M-2 bez własnego planu; M0 bez
  własnego planu.
- **Jak sprawdzić:** Plan miesiąca → M-2 → zmień kopertę „Jedzenie” → przejdź do M-1, M0 i M+1; „Plan kampanii”
  (jasne / przygaszone komórki); historia zmian planu.
- **Oczekiwany efekt:** M-2 bez własnego planu pokazuje plan M-3; pierwsza zmiana tworzy własny plan M-2 (kopia pensji
  i kopert, bez łupów) i nie zmienia M-1, M0 ani M+1; debriefing M-2 przeliczony z nową kopertą; w planie kampanii M-2
  jasny, odziedziczone przygaszone.
- **Nie przechodzi, gdy:**
  - zmiana M-2 zmienia koperty M-1, M0 albo M+1;
  - M-2 traci pensję albo inne koperty po pierwszej zmianie.
- **Odczyt liczb:** koperta „Jedzenie” M-2, M-1, M0, M+1; energia dziś przed i po.

#### PM.10 Podział pensji: ładownia, odkładki, raty celów, koperty (spec „Podział pensji”, T180, T283)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – kontenery miesięczne i okresowe, cel z „rata z pensji”,
  łupy M-1 częściowo „na następny miesiąc”.
- **Jak sprawdzić:** Plan miesiąca → M0 → „Podział pensji”: „Ładownia – stałe koszty ›”, „Odkładki – opłaty okresowe”
  (rozwiń), „Kurs przechwycenia – raty celów z terminem”, „Koperty planowe”, „Koperty codzienne”, „+ łupy z …”,
  „Podstawowy przydział: X dziennie”, „Rozdzielone”, „Niezaplanowane – zostaje w energii (łupy)”.
- **Oczekiwany efekt:** ładownia = suma kontenerów miesięcznych w kwotach M0; odkładki = suma rat zbiorników (każdy
  z terminem i kwotą); „Rozdzielone” = suma wierszy; „Niezaplanowane” = pensja − rozdzielone, przy nadmiarze „Plan
  przekracza pensję o” na czerwono; podstawowy przydział = (koperty codzienne + łupy „na następny miesiąc”) / liczba dni
  M0 (spec „Wywiad”, T180).
- **Nie przechodzi, gdy:**
  - wiersze nie sumują się do „Rozdzielone”;
  - podstawowy przydział dzielony przez dni do końca miesiąca albo bez łupów;
  - kontener z nową ceną liczony starą kwotą w M0.
- **Odczyt liczb:** każdy wiersz, podstawowy przydział.

#### PM.11 Koperty codzienne i planowe według ustawień (spec, D16)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok.
- **Jak sprawdzić:** Ustawienia → Kategorie: „Zdrowie” z planowej na codzienną → Plan miesiąca („Podział pensji”,
  „Dzienny przydział”) i Mostek („Energia dziś”); przywróć planową.
- **Oczekiwany efekt:** Zdrowie przechodzi do „Koperty codzienne”; podstawowy przydział rośnie o kopertę Zdrowia / dni
  miesiąca; energia dziś zmienia się według wzoru z PM.12 (wydatki Zdrowia od 1. dnia liczą się do puli dziennej);
  po przywróceniu – liczby jak przed.
- **Nie przechodzi, gdy:**
  - koperta planowa zmienia energię dziś;
  - zmiana widoczna dopiero po ponownym uruchomieniu.
- **Odczyt liczb:** podstawowy przydział i energia dziś przed, w trakcie i po.

#### PM.12 Dzienny przydział i przeniesienie niewydanej energii (spec „Dzienny przydział”, D15, T30, T295)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – w M0 wydatki codzienne w dniach przed D niższe niż
  przydział; jeden wydatek bez kategorii; płatność kontenera, wydatek z celu i zakup domownika w M0; wydatek dziś.
- **Jak sprawdzić:** Plan miesiąca → „Dzienny przydział” („Energia dziś … z X”, „Wydane dziś (koperty codzienne)”,
  „Podstawowy przydział”, „Koperty codzienne: wydane / limit”, „Dni do końca miesiąca (z dziś)”); Mostek → „Energia
  dziś” i rozbicie (przycisk „przydział … · podstawowy …”).
- **Oczekiwany efekt:** przydział na dziś X = (limit kopert codziennych z łupami − wydane codzienne przed D) / dni do
  końca miesiąca z D, w dół do grosza; energia dziś = X − wydane dziś; X > podstawowy przydział, bo wcześniej
  zaoszczędzono; wydatek bez kategorii liczy się jak codzienny; płatność kontenera, wydatek z celu i zakup domownika –
  nie.
- **Nie przechodzi, gdy:**
  - X zaokrąglone w górę albo liczone bez dzisiejszego dnia;
  - płatność kontenera, wydatek z celu albo zakup domownika zmniejsza X;
  - Mostek i Plan miesiąca pokazują różne liczby.
- **Odczyt liczb:** X, energia dziś, wydane dziś, wydane / limit, dni do końca, podstawowy przydział.

#### PM.13 Przekroczenie dnia – mniejszy przydział kolejnych dni (spec, D17, T30)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – wczoraj wydatki codzienne o 150 zł ponad przydział.
- **Jak sprawdzić:** Plan miesiąca → „Dzienny przydział”; Mostek → odprawa. Szybki wpis (Ctrl+Alt+B): wydatek
  „Jedzenie” większy niż energia dziś – odczytaj podgląd energii przed zapisem; zapisz.
- **Oczekiwany efekt:** przydział dziś niższy niż przy wydatkach równych przydziałowi (wczorajsze 150 zł rozłożone na
  dni do końca miesiąca); po dzisiejszym wydatku energia dziś ujemna, czerwona, alarm „Przydział dnia przekroczony
  o X”; podgląd w szybkim wpisie = energia po zapisie.
- **Nie przechodzi, gdy:**
  - przekroczenie z wczoraj nie zmniejsza przydziału dziś;
  - energia dziś obcięta do 0 zamiast wartości ujemnej;
  - podgląd szybkiego wpisu różni się od energii po zapisie.
- **Odczyt liczb:** przydział dziś, energia przed i po wydatku, podgląd, X alarmu.

#### PM.14 Pierwszy i ostatni dzień miesiąca, miesiące 28–31 dni (T30, spec „Miesiąc budżetu”)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** rok, zegar maszyny: 28.02, 1.03, 30.04, 31.05, 1.06.
- **Jak sprawdzić:** w każdym z dni – Plan miesiąca → „Dzienny przydział” i Mostek → „Energia dziś”.
- **Oczekiwany efekt:** ostatni dzień: „Dni do końca miesiąca (z dziś)” = 1, przydział = cała reszta kopert
  codziennych; 1. dzień: nowe koperty, wydane 0, przydział = (koperty + łupy) / liczba dni miesiąca; luty: podstawowy
  przydział = koperty / 28 (w roku przestępnym 29).
- **Nie przechodzi, gdy:**
  - ostatni dzień ma 0 dni albo dzieli przez 2;
  - 1. dzień niesie przekroczenie z poprzedniego miesiąca;
  - podstawowy przydział liczy 30 dni dla każdego miesiąca.
- **Odczyt liczb:** przydział, energia dziś, dni do końca w każdym dniu.

#### PM.15 Energia wyczerpana – ponad energię z osłon, kadłuba, deficyt (T28, T32)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** brzegi – miesiąc na minusie: wydatki z energii większe niż
  energia miesiąca; osłony małe, kadłub mały.
- **Jak sprawdzić:** Mostek → odprawa i „Stan okrętu”; Plan miesiąca → „Debriefing” tego miesiąca.
- **Oczekiwany efekt:** czerwony alarm „Energia wyczerpana: X ponad energię miesiąca (pensja po ratach odkładek)
  poszło z osłon (bufora na pensje).”; brakujące pieniądze najpierw z osłon, potem z kadłuba, potem osłony poniżej zera
  z alarmem „Deficyt: …” (T32); cele nigdy nie są ruszane; suma warstw = salda kont.
- **Nie przechodzi, gdy:**
  - pieniądze biorą się z celów albo depozytu domowników;
  - energia ujemna bez alarmu;
  - suma warstw różni się od sald kont.
- **Odczyt liczb:** X, osłony, kadłub, cele, depozyt, suma kont.

#### PM.16 Koperty planowe: przekroczenie do 20 % i ponad 20 %, limit 0 zł, „Bez koperty” (spec, D16, D73, T215, T216)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** brzegi – w M0 koperta „Auto” przekroczona o ponad 20 %,
  „Zdrowie” o mniej niż 20 %, „Prezenty i inne” z limitem 0 zł i wydatkiem, wydatki kategorii bez koperty.
- **Jak sprawdzić:** Plan miesiąca → „Koperty”; Mostek → koperty i odprawa; energia dziś przed i po dopisaniu wydatku
  „Auto” (szybki wpis).
- **Oczekiwany efekt:** wydatek planowy nie zmienia energii dziś; Auto – czerwony alarm „Koperta Auto ponad limit
  o X.” (próg z Dowództwa, domyślnie 20 %); Zdrowie – przekroczenie bez czerwonego progu; limit 0 zł – przekroczenie bez
  „poważnego”; kategorie bez koperty w wierszu „Bez koperty”, bez czerwieni i paska limitu.
- **Nie przechodzi, gdy:**
  - wydatek koperty planowej zmniejsza energię dziś;
  - Zdrowie dostaje czerwony alarm albo Auto go nie dostaje;
  - kategoria bez koperty pokazana jako „ponad plan”.
- **Odczyt liczb:** wydane / limit każdej koperty, X, „Bez koperty”.

#### PM.17 „Pokryj z koperty…” – przesunięcie limitu (F28, D87, T279)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** brzegi – w M0 „Auto” przekroczona o 150 zł, „Dom” ma zapas
  400 zł, koperta codzienna „Rozrywka i hobby” ma zapas.
- **Jak sprawdzić:** Plan miesiąca → „Koperty” → przy „Auto” „pokryj z koperty…” → okno „Pokryj przekroczenie: Auto”
  („z koperty”, „kwota”, „najwyżej …”) → „Pokryj”; toast → „Cofnij”. Powtórz, wpisując kwotę ponad zapas; potem
  źródło – koperta codzienna.
- **Oczekiwany efekt:** po wyborze „Dom” kwota domyślna = mniejsza z przekroczenia i zapasu źródła (150 zł,
  T279); po „Pokryj”: toast „Koperta Auto pokryta z Dom: 150,00 zł limitu.”, limit Auto +150 zł, Dom −150 zł, suma
  kopert bez zmian, alarm Auto znika; „Cofnij” przywraca oba limity; kwota ponad zapas – „Pokryj” nieaktywny; pokrycie
  z koperty codziennej zmniejsza pulę dzienną i energię dziś (brak wymagania – sensowne); dziennik wachty pokazuje
  pokrycie.
- **Nie przechodzi, gdy:**
  - zmienia się tylko jedna koperta albo suma kopert;
  - „Cofnij” zostawia którąkolwiek zmianę;
  - przy braku zapasu nie ma „Żadna koperta nie ma zapasu w tym miesiącu.”
- **Odczyt liczb:** limity Auto i Dom przed, po i po „Cofnij”; energia dziś przy źródle codziennym.

#### PM.18 Łupy: decyzja do 7. dnia (spec „Debriefing”, D18, T52, T28, B13)
- **Kto:** Claude (gdy D to 1.–7. dzień miesiąca; inaczej Maszyna) · **Ryzyko:** wysokie · **Stan danych:** rok – M-1
  zakończony z niewydaną energią, bez decyzji o łupach; cel „Rower” niepełny, cel zarchiwizowany.
- **Jak sprawdzić:** Plan miesiąca → M-1 → „Debriefing – …” → „Podział łupów”: „Do podziału: X – decyzja do 07.MM,
  potem trafią do osłon.”; „na następny miesiąc” 100, „cel: Rower” 50 → „Zatwierdź podział łupów”. M0 → „Podział
  pensji”; Mapa gwiezdna.
- **Oczekiwany efekt:** X = niewydana energia M-1 (wyrocznia); „do osłon (reszta)” = X − 150; po zatwierdzeniu „Decyzja
  z DD.MM.RRRR: osłony …, następny miesiąc 100,00 zł, cele 50,00 zł.”; w M0 wiersz „+ łupy z … (decyzja „na następny
  miesiąc”)” 100 zł i podstawowy przydział wyższy o 100 / dni M0; Rower +50 zł; cel zarchiwizowany nie jest
  proponowany; suma ponad X – przycisk nieaktywny.
- **Nie przechodzi, gdy:**
  - reszta nie trafia do osłon;
  - łupy „na następny miesiąc” nie podnoszą kopert codziennych M0;
  - można rozdzielić więcej niż X.
- **Odczyt liczb:** X, części, osłony po decyzji, Rower, podstawowy przydział M0.

#### PM.19 Łupy bez decyzji – do osłon po 7 dniach (D18, T28, T52, T211)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** rok, zegar maszyny: 7. dzień miesiąca 23:50 → 8. dzień.
- **Jak sprawdzić:** 7. dnia: Plan miesiąca → M-1 → „Podział łupów”, Meldunki, osłony na Mostku; 8. dnia – to samo.
- **Oczekiwany efekt:** 7. dnia decyzja wciąż możliwa, Meldunki mają „łupy do podziału”; 8. dnia „Łupy X bez decyzji do
  07.MM – trafiły do osłon.”, osłony + X, meldunek znika. W stanie `rok` (Claude) miesiące M-2 i starsze bez decyzji
  mają ten sam tekst, a ich łupy są w osłonach.
- **Nie przechodzi, gdy:**
  - łupy przepadają albo trafiają gdzie indziej niż do osłon;
  - przejście następuje 7. dnia albo dopiero 9.
- **Odczyt liczb:** X, osłony 7. i 8. dnia.

#### PM.20 Zmiana podziału łupów po 7. dniu (N-PC-16, D95)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok, D po 7. dniu M0 – łupy M-1 rozdzielone albo z osłonami
  po terminie.
- **Jak sprawdzić:** Plan miesiąca → M-1 → „Debriefing” → „Zmień podział łupów” → zmień „na następny miesiąc” i cel →
  „Zatwierdź podział łupów”; drugi raz – „Anuluj”. M-2 – czy przycisk jest.
- **Oczekiwany efekt:** nowy podział obowiązuje: osłony, cel i łupy „na następny miesiąc” w M0 zmieniają się o różnicę;
  „Decyzja zapisana po 07.MM.”; „Anuluj” nic nie zmienia; suma warstw = salda kont.
- **Nie przechodzi, gdy:**
  - po zatwierdzeniu warstwy się nie zmieniają albo zmieniają o inną kwotę;
  - pieniądze liczą się podwójnie (osłony i cel naraz).
- **Odczyt liczb:** podział przed i po, osłony, cel, „+ łupy” w M0.

#### PM.21 Łupy po późnej zmianie danych miesiąca (B10, T139)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – łupy M-1 z decyzją.
- **Jak sprawdzić:** Operacje → dopisz wydatek „Jedzenie” 80 zł z datą w M-1 → Plan miesiąca → M-1 → „Podział łupów”;
  usuń wydatek („Cofnij” albo usuń).
- **Oczekiwany efekt:** „Łupy zmieniły się po decyzji (było X, jest X − 80) – podział przeliczony: cele, następny
  miesiąc, reszta do osłon.”; cele i następny miesiąc zostają, maleje reszta do osłon; po usunięciu – jak przed.
- **Nie przechodzi, gdy:**
  - debriefing pokazuje stare kwoty decyzji;
  - suma części ≠ nowe łupy.
- **Odczyt liczb:** łupy przed i po, części podziału.

#### PM.22 Reszta koperty planowej na następny miesiąc (F28, D87, T278)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – w M-1 koperta planowa „Zdrowie” 300 zł, wydane 100 zł;
  łupy M-1 do decyzji albo do zmiany (PM.20).
- **Jak sprawdzić:** Plan miesiąca → M-1 → „Podział łupów” → „zapas: Zdrowie” 200 (spróbuj 250) → „Zatwierdź”. M0 →
  „Podział pensji” (Zdrowie), „Koperty”, „Dzienny przydział”.
- **Oczekiwany efekt:** pole przyjmuje najwyżej 200 („do 200,00 zł”); w M0 przy Zdrowiu „+200,00”, limit 500 zł, w
  debriefingu M0 „(w tym +200,00 zł zapasu i pokryć)”; „do osłon (reszta)” = łupy − następny miesiąc − cele − zapas;
  dzienny przydział bez zmian (zapas idzie do koperty planowej).
- **Nie przechodzi, gdy:**
  - zapas większy niż niewydane z koperty;
  - limit Zdrowia w M0 nie rośnie albo rośnie przydział dzienny;
  - zapas liczony drugi raz w osłonach.
- **Odczyt liczb:** zapas, limit Zdrowia M0, reszta do osłon, przydział dzienny.

#### PM.23 Debriefing: rachunek energii, FVG, koszty netto, domownicy (spec „Debriefing”, D80, T178, T215, T294)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – M-1 z opłatą ze zbiornika, zakupami domowników,
  wydatkiem bez kategorii, kategorią bez koperty, kopertą z zapasem z łupów.
- **Jak sprawdzić:** Plan miesiąca → M-1 → „Debriefing – …”: „Energia miesiąca” (pensja − odkładki − raty celów + łupy),
  „Wydane z energii (i ponad nią z osłon)”, „Koszty netto miesiąca”, „Ładownia i odkładki”, „Sfinansowane przez
  domowników (…) – nie Twoje koszty”, „Bez kategorii”, „Pula codzienna …”, każda koperta „wydane z limit” i luka,
  „Bez koperty”, „Bilans paliwa”.
- **Oczekiwany efekt:** luka koperty = limit − wydane (+ zielone, − czerwone, D68); pula codzienna = koperty codzienne
  + łupy wobec wydatków codziennych i bez kategorii; zakupy domowników tylko w swoim wierszu, nie w kosztach netto;
  koszty netto = wydatki − zwroty towarów (spec); bilans paliwa = przychód − koszty netto miesiąca.
- **Nie przechodzi, gdy:**
  - zakup domownika albo wydatek z celu jest w kosztach netto;
  - luka koperty niezgodna z planem miesiąca;
  - kategoria bez koperty ma pasek limitu.
- **Odczyt liczb:** wszystkie wiersze debriefingu.

#### PM.24 „Miesiąc zamknięty na plus” i na minusie (spec, D39, T178 – zmienia T52, D86, T215)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – M-1: energia wystarczyła, opłata OC ze zbiornika
  sprawia, że koszty netto > pensja; M-2: alarm „energia wyczerpana”; M0 w toku.
- **Jak sprawdzić:** Plan miesiąca → M-1, M-2, M0 → „Debriefing”; Raporty → Debriefing M0.
- **Oczekiwany efekt:** M-1 – „Miesiąc zamknięty na plus” z krótką animacją (dźwięk raz na komputer), tekst „Wydatki
  z energii … nie przekroczyły energii miesiąca …” (T178 – opłata ze zbiornika nie psuje miesiąca); M-2 – „Energia
  wyczerpana: X ponad energię miesiąca … poszło z osłon.”; M0 – „Miesiąc trwa – wynik po jego końcu.”, w Raportach
  „miesiąc trwa”.
- **Nie przechodzi, gdy:**
  - M-2 ma fanfarę mimo alarmu;
  - M0 pokazany jako zamknięty;
  - M-1 na minusie tylko przez płatność ze zbiornika (rozstrzygnięcie T178 / spec – wątpliwość w raporcie).
- **Odczyt liczb:** energia miesiąca, wydane z energii, koszty netto, pensja – M-1 i M-2.

#### PM.25 Pierwszy miesiąc budżetu (T45, T220, B126)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** start – kreator uruchomiony w trakcie miesiąca, wydatki
  z dni przed startem w tym miesiącu (w tym zwrot towaru i płatność opłaty okresowej).
- **Jak sprawdzić:** Plan miesiąca → M0 → „Pensja” („Wypłacono: …”) i „Dzienny przydział”.
- **Oczekiwany efekt:** „Wypłacono” = pensja − koszty netto dni przed startem (zwrot pomniejsza zakup; bez opłat
  okresowych i kontenerów wybranych w kreatorze), z dopiskiem „– pierwszy miesiąc budżetu: bez tego, co wydano przed
  startem”; przydział liczy cały miesiąc; kwota wypłacona = kwota zapowiedziana w kreatorze.
- **Nie przechodzi, gdy:**
  - pensja pierwszego miesiąca cała mimo wydatków przed startem albo pomniejszona o opłatę okresową;
  - zwrot sprzed startu zwiększa pensję ponad plan.
- **Odczyt liczb:** pensja planu, „Wypłacono”, wydatki przed startem, przydział.

#### PM.26 Zarchiwizowana kategoria z kopertą (T179, N8)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – kategoria „Zwierzęta” z kopertą w M0.
- **Jak sprawdzić:** Ustawienia → Kategorie → archiwizuj „Zwierzęta” → Plan miesiąca M0, M+1, M-1; toast → „Cofnij”.
- **Oczekiwany efekt:** koperta znika z planu M0 i dalszych (suma kopert i „Rozdzielone” maleją), M-1 ją zachowuje;
  „Cofnij” przywraca kategorię i koperty.
- **Nie przechodzi, gdy:**
  - koperta znika z formularza, a dalej liczy się w sumach i energii dnia;
  - archiwizacja zmienia debriefing minionego miesiąca.
- **Odczyt liczb:** „Rozdzielone” i podstawowy przydział przed, po i po „Cofnij”.

#### PM.27 Plan następnego miesiąca (spec „Plan następnego miesiąca”, T214)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok.
- **Jak sprawdzić:** Plan miesiąca → strzałka „Następny miesiąc” → „Koperty ze średnich” → popraw dwie koperty i pensję
  → „bieżący”; Radar – pensja 1. dnia M+1.
- **Oczekiwany efekt:** M+1 ma własny plan z propozycją i poprawkami; M0 bez zmian; Radar pokazuje pensję M+1 z jego
  planu; przyszły miesiąc nie ma panelu „Koperty” ani debriefingu.
- **Nie przechodzi, gdy:**
  - zmiany M+1 trafiają do M0;
  - Radar pokazuje pensję M0 w dniu 1. M+1.
- **Odczyt liczb:** pensja i koperty M+1, pensja M+1 na Radarze.

#### PM.28 Plan kampanii – 12 miesięcy (F37, D87, T280)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok.
- **Jak sprawdzić:** Plan miesiąca → „Plan kampanii”: rok bieżący, „Poprzedni rok” / „Następny rok”; najedź na komórkę
  (fakt rok wcześniej); edytuj kopertę „Jedzenie” w M+2 → „»” → „Cofnij”; spróbuj edytować miesiąc miniony.
- **Oczekiwany efekt:** w komórkach limit i pod nim fakt (wydatki jak w debriefingu: bez kontenerów, pieniędzy celów
  i zakupów domowników); przekroczenie w akcencie, nie na czerwono; „»” kopiuje wartość na dalsze miesiące roku,
  „Cofnij” ją zdejmuje; minione miesiące nieedytowalne; suma roczna na kopertę (F37).
- **Nie przechodzi, gdy:**
  - fakt w kampanii ≠ fakt w debriefingu tego miesiąca;
  - „»” zmienia miesiące wcześniejsze albo inny rok;
  - brak sumy rocznej (F37) – UWAGA, gdy reszta działa.
- **Odczyt liczb:** limit i fakt „Jedzenie” w 12 miesiącach.

#### PM.29 Spłata pożyczki z planu miesiąca (N-PC-17, D72, T72, T256)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – pożyczka wzięta „Pożyczka od Marka” z kontenerem
  „Rata: Pożyczka od Marka”; druga pożyczka wzięta bez kontenera.
- **Jak sprawdzić:** Plan miesiąca → „Podział pensji” → „Ładownia”; Radar → „Pożyczki”: przy pożyczce bez kontenera „do
  Ładowni”; przy pożyczce z kontenerem „zapłać ratę” → „Źródło spłaty”: „z pensji (Ładownia)”, potem drugi raz „z osłon
  (nadpłata)” → „Zapisz”.
- **Oczekiwany efekt:** rata jest w ładowni i masie ładunku; „do Ładowni” – toast „Utworzono kontener „Rata: …”
  w Ładowni – raty zejdą z pensji.”; rata z pensji – dług −rata, energia miesiąca przez ładownię; nadpłata z osłon –
  osłony −kwota, dług −kwota, energia bez zmian.
- **Nie przechodzi, gdy:**
  - spłata zmniejsza dług dwa razy albo wcale;
  - nadpłata z osłon zjada energię dziś.
- **Odczyt liczb:** dług, osłony, energia, ładownia przed i po każdej spłacie.

#### PM.30 Powiadomienia energii i kopert (spec „Powiadomienia”, T216)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** rok, powiadomienia włączone.
- **Jak sprawdzić:** szybkim wpisem: wydatek, po którym energia dziś < 20 % przydziału; wydatek koperty planowej ponad
  80 %, potem ponad 100 %; wydatek codzienny ponad energię dziś; wydatek koperty codziennej ponad jej podział.
- **Oczekiwany efekt:** powiadomienia „energia dziś poniżej 20 %”, „koperta powyżej 80 %”, „przekroczenie przydziału
  albo koperty”, każde raz; koperta codzienna ponad podział – łagodne, bez dźwięku alarmu („liczy się pula dzienna”);
  wyłączone w Ustawieniach – nie przychodzą.
- **Nie przechodzi, gdy:**
  - powiadomienie przychodzi kilka razy na to samo zdarzenie albo wcale;
  - kwota w powiadomieniu ≠ kwota na ekranie.
- **Odczyt liczb:** kwoty z powiadomień i z ekranu.

### LA – Ładownia

#### LA.1 Nowy kontener miesięczny (spec „Ładownia”, D24, T49, T50, N36)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – w historii płatności do „TESTNET SP Z O O” bez
  kontenera, masa ładunku z zapasem do linii.
- **Jak sprawdzić:** Ładownia → „Kontener” → „Nowy kontener”: Nazwa „Internet”, Rodzaj „abonament”, Kwota płatności 79,
  Cykl „co miesiąc”, Płatność (dzień 15), Konto „mBank”, Kategoria „Subskrypcje i łączność”, Odbiorca w banku
  „TESTNET” → przejdź na Mostek i wróć (szkic) → „Dodaj do ładowni”.
- **Oczekiwany efekt:** szkic zostaje po zmianie ekranu; kontener na liście (rodzaj, kwota, cykl); masa ładunku rośnie
  o 79 / pensja; „Podział pensji” → Ładownia +79 zł; płatności odbiorcy od 1. dnia miesiąca startu budżetu połączone
  z kontenerem i wychodzą z kopert (koperta „Subskrypcje…” wydane maleje); w Operacjach pole „Ładownia”.
- **Nie przechodzi, gdy:**
  - szkic ginie po zmianie ekranu;
  - połączone płatności liczą się dalej w kopercie;
  - masa ładunku i podział pensji różnią się o inną kwotę niż kwota kontenera.
- **Odczyt liczb:** masa (%) przed i po, ładownia w podziale pensji, wydane w kopercie przed i po.

#### LA.2 Linia zanurzenia – ostrzeżenie i symulacja przed zapisem (spec „Ładownia i linia zanurzenia”, T50, T71)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – masa ładunku ok. 35 % pensji, linia 40 %, dług
  z pożyczki wziętej.
- **Jak sprawdzić:** Ładownia → „Kontener” → kwota, która przekracza linię → odczytaj ostrzeżenie i symulację →
  „Dodaj mimo przekroczenia…” → „Tak, dodaj ponad linię”. Potem drugi nowy kontener → „Anuluj”.
- **Oczekiwany efekt:** przed zapisem „Ponad linię zanurzenia: X% pensji, limit 40%.” i symulacja „po dodaniu”: masa
  = (stałe koszty + miesięczna część) / pensja, zasięg przy kosztach powiększonych o miesięczną część = (osłony +
  kadłub − dług) / (koszty + część); zapis dopiero po drugim potwierdzeniu; potem Mostek „Masa ładunku” na czerwono,
  odprawa „Masa ładunku (stałe koszty X/mies.) ponad linią zanurzenia.”; „Anuluj” – nic nie zapisane.
- **Nie przechodzi, gdy:**
  - kontener ponad linią zapisuje się jednym kliknięciem;
  - symulowany zasięg ignoruje dług albo miesięczną część;
  - masa na Mostku ≠ masa w Ładowni.
- **Odczyt liczb:** masa i zasięg teraz i po dodaniu, stałe koszty.

#### LA.3 Odkładka rocznej opłaty – reszta w ostatniej części (spec „Podział pensji” – OC 1 240, T29, N52)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „OC Auto” 1 240 zł co rok, zbiornik zbiera pełny cykl
  od 12 miesięcy, termin w M+k.
- **Jak sprawdzić:** Ładownia → „Odkładki” (rata, stan zbiornika, termin); Plan miesiąca → „Odkładki – opłaty
  okresowe” (rozwiń) w M0 i w miesiącu terminu; minione miesiące cyklu.
- **Oczekiwany efekt:** 11 rat po 103,33 zł i rata w miesiącu terminu 103,37 zł; suma rat cyklu = 1 240,00 zł; stan
  zbiornika = suma rat od początku cyklu; w Ładowni rata z harmonogramu („ostatnia 103,37”), „/m” = średnio.
- **Nie przechodzi, gdy:**
  - pojawia się 103,34 albo zaokrąglenie w górę;
  - ostatnia rata ≠ 103,37 zł albo suma ≠ 1 240,00 zł;
  - Ładownia i Plan miesiąca pokazują inną ratę tego miesiąca.
- **Odczyt liczb:** rata M0, rata miesiąca terminu, stan zbiornika.

#### LA.4 Cykle: co kwartał, harmonogram, 13 miesięcy, granice cyklu (spec, F23, D87, T286)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Wywóz śmieci” 240 zł co kwartał; „Podatek od
  nieruchomości” harmonogram mar / maj / wrz / lis po 150 zł.
- **Jak sprawdzić:** Ładownia → oba kontenery („Odkładki”, rata, najbliższa płatność). Dodaj „Przegląd auta” 350 zł,
  Cykl „inny…” 13; potem cykl 61 i 0; harmonogram z 1 i z 12 zaznaczonymi miesiącami.
- **Oczekiwany efekt:** kwartał – rata 80 zł / mies.; harmonogram – zbiornik zbiera do najbliższej płatności na długość
  cyklu (wrz → lis: 2 mies. po 75 zł; lis → mar: 4 mies. po 37,50 zł), waga w masie ładunku = 150 × 4 / 12 = 50 zł /
  mies.; 13 mies. – 12 rat po 26,92 zł i ostatnia 26,96 zł; cykl 61 / 0 – „Cykl to od 1 do 60 miesięcy – zostaje
  poprzedni.”; harmonogram z 1 albo 12 miesiącami – podpowiedź „Zaznacz od 2 do 11 miesięcy…”.
- **Nie przechodzi, gdy:**
  - harmonogram liczony jak jedna opłata roczna 600 zł albo jak cztery osobne roczne;
  - cykl 13 zaokrąglony do roku;
  - błędny cykl zapisany.
- **Odczyt liczb:** raty i wagi miesięczne trzech kontenerów.

#### LA.5 Dzień płatności 31 w krótszym miesiącu (brak wymagania; analogia T72)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – kontener miesięczny „Rata leasingu” 300 zł, data
  płatności 31., bez historii płatności.
- **Jak sprawdzić:** Ładownia → kontener („Najbliższa: …”, stan w tym miesiącu); Radar → 90 dni (miesiące 30-
  i 31-dniowe, luty, gdy w oknie).
- **Oczekiwany efekt:** w miesiącu krótszym płatność w jego ostatnim dniu (30.11, 28.02); w 31-dniowych – 31.; po
  jednej pozycji na miesiąc.
- **Nie przechodzi, gdy:**
  - płatność przeskakuje na 1. dzień następnego miesiąca albo znika w krótkim miesiącu;
  - dwie płatności w jednym miesiącu.
- **Odczyt liczb:** daty i kwoty płatności na Radarze.

#### LA.6 Rachunek o zmiennej kwocie (F23, F9, T284, T286)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – „Prąd” z płatnościami 150–260 zł co miesiąc przez
  12 miesięcy; kontener z „Kwota zmienna” i kwotą o ponad 10 % niższą niż 75. percentyl roku.
- **Jak sprawdzić:** Ładownia → „Prąd”: kwota, znaczek ceny, propozycja z symulacją.
- **Oczekiwany efekt:** kwota rachunku zmiennego = 75. percentyl płatności z 12 miesięcy, w górę do pełnych złotych;
  gdy różni się od kwoty kontenera o więcej niż max(10 %, 2 zł) – propozycja nowej kwoty z symulacją; propozycja
  z historii (przed dodaniem kontenera) rozpoznaje rachunek zmienny.
- **Nie przechodzi, gdy:**
  - kwota = ostatnia płatność albo średnia;
  - propozycja przy różnicy poniżej progu.
- **Odczyt liczb:** płatności 12 miesięcy, kwota proponowana.

#### LA.7 Propozycje z historii (T48, T286, D70)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – w historii płatności cykliczne bez kontenera: co
  miesiąc stała, co 2, 3 i 6 miesięcy, co rok, harmonogram; jedna płatność jednorazowa.
- **Jak sprawdzić:** Ładownia → „Z historii – propozycje” → „Do ładowni” dla jednej (formularz z danymi), „Nie
  proponuj” dla drugiej → „Ukryte propozycje: 1” → „proponuj znowu”.
- **Oczekiwany efekt:** propozycje mają wykryty cykl i kwotę; żadna nie wchodzi do ładowni bez potwierdzenia; płatności
  już w kontenerach i jednorazowe nie są proponowane; „Nie proponuj” chowa, „proponuj znowu” przywraca.
- **Nie przechodzi, gdy:**
  - propozycja dodaje kontener sama;
  - jednorazowa płatność proponowana jako cykliczna.
- **Odczyt liczb:** kwoty i cykle propozycji.

#### LA.8 Rata nominalna i wyrównawcza (N-PC-8, T29, T136)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Ubezpieczenie domu” 900 zł co rok, dodany 4 miesiące
  przed terminem (miesiąc dodania + 3 kolejne, ostatni = miesiąc terminu).
- **Jak sprawdzić:** Ładownia → „Odkładki” i edytor kontenera; Plan miesiąca → „Odkładki” (rozwiń).
- **Oczekiwany efekt:** „Rata nominalna: 75,00 zł/mies. · rata wyrównawcza w tym cyklu (do terminu): 225,00 zł/mies.”;
  odkładka w planie miesiąca = 225 zł; zbiornik nie zbiera za miesiące sprzed dodania (T136); po terminie nowy cykl
  po 75 zł.
- **Nie przechodzi, gdy:**
  - rata 75 zł i pewny brak w dniu płatności (żółty alarm);
  - raty wsteczne z minionych miesięcy;
  - Ładownia i Plan miesiąca pokazują różne raty.
- **Odczyt liczb:** rata nominalna, wyrównawcza, stan zbiornika.

#### LA.9 Płatność ze zbiornika; za mało – z energii (spec, T29, D73 „Asteroida rozbita”)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „OC Auto” zapłacone w M-1 w całości ze zbiornika;
  brzegi – płatność opłaty okresowej przy niepełnym zbiorniku.
- **Jak sprawdzić:** Ładownia → „Odkładki”; Plan miesiąca → M-1 i miesiąc z brakiem („Debriefing”); Mostek → odprawa.
- **Oczekiwany efekt:** płatność z kontenerem (pole „Ładownia”) idzie ze zbiornika – nie z energii ani kopert; „Opłata
  za … zapłacona – zbiornik zbiera na następny termin.”; brak – żółty alarm „Za mało w zbiorniku (odkładce) …: X z
  energii (pensji miesiąca).”, energia miesiąca mniejsza o X.
- **Nie przechodzi, gdy:**
  - pełna płatność ze zbiornika zmniejsza energię;
  - brakująca część idzie z osłon zamiast z energii;
  - płatność liczy się do koperty.
- **Odczyt liczb:** zbiornik przed i po, X, energia miesiąca.

#### LA.10 Opłata zapłacona przed terminem zamyka cykl (B55, B6, T135)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Wywóz śmieci” zapłacony w miesiącu przed terminem;
  drugi kontener z zaległą zapłatą poprzedniego cyklu.
- **Jak sprawdzić:** Ładownia, Plan miesiąca („Odkładki”), Radar, odprawa.
- **Oczekiwany efekt:** cykl zamknięty: bez rat w miesiącu terminu, bez „Za planem o …”, Radar i odprawa pokazują
  następny termin; zaległa zapłata poprzedniego cyklu nie zamyka bieżącego.
- **Nie przechodzi, gdy:**
  - zbiornik zbiera drugi raz na ten sam termin;
  - odprawa ostrzega o zapłaconej opłacie.
- **Odczyt liczb:** raty M0 i M+1, stan zbiornika.

#### LA.11 Zrzut z ładowni, archiwizacja i resztka zbiornika (spec „symulacja dodania i zrzutu”, T50, T136, B56)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – opłata okresowa ze zbiornikiem częściowo pełnym.
- **Jak sprawdzić:** Ładownia → kontener → „Symulacja zrzutu” → przełącznik „Zarchiwizowany (zrzucony z ładowni)”;
  Plan miesiąca M0 i M+1; Mostek (osłony, zbiorniki); odznacz.
- **Oczekiwany efekt:** symulacja „po zrzucie” = masa i zasięg bez kontenera; archiwizacja liczy się do końca swojego
  miesiąca (M0 z ratą, M+1 bez); po końcu życia resztka zbiornika wraca do osłon (osłony + resztka, zbiorniki −
  resztka, suma warstw bez zmian).
- **Nie przechodzi, gdy:**
  - resztka zbiornika znika albo zostaje w zbiorniku na zawsze;
  - archiwizacja przelicza minione miesiące.
- **Odczyt liczb:** symulacja, zbiornik, osłony przed i po.

#### LA.12 Stan opłat w miesiącu: zapłacone / termin / po terminie / czeka na import (F1, D86, T208)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Czynsz zapłacony w M0; Internet z terminem za ≥ 3 dni;
  „Telefon” 60 zł z terminem ≥ 3 dni temu bez płatności, plik z banku obejmuje dni po terminie; brzegi – opłata
  z terminem ≥ 3 dni temu, ostatni plik z banku sprzed terminu.
- **Jak sprawdzić:** Ładownia → każdy kontener → „W tym miesiącu”; Mostek → odprawa; Radar.
- **Oczekiwany efekt:** termin = dzień płatności z historii (środkowy z ostatnich płatności), bez historii – dzień
  kontenera; „zapłacone DD.MM”, „termin DD.MM”, „po terminie · DD.MM” od 3. dnia po terminie, „czeka na import · DD.MM”
  („Termin … minął – czeka na plik z banku, który obejmie te dni.”); odprawa: „Kontener niezaładowany: Telefon 60,00 zł
  – termin DD.MM …” (żółty); Radar oznacza zaległą.
- **Nie przechodzi, gdy:**
  - „po terminie” wcześniej niż 3 dni po terminie;
  - „po terminie”, gdy plik z banku nie obejmuje tych dni;
  - zapłacony kontener w odprawie.
- **Odczyt liczb:** termin i stan każdego kontenera.

#### LA.13 „Zapłacone” bez importu (F1, D86, T208)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Internet z terminem w M0, niezapłacony; kontener
  z terminem za ponad 14 dni.
- **Jak sprawdzić:** Ładownia → Internet → „Zapłacone (…, dziś)” → toast „Zapisano płatność: Internet 79,00 zł
  (dziś).” → Operacje (operacja dnia D) → „Cofnij”; kontener z odległym terminem – czy przycisk jest.
- **Oczekiwany efekt:** operacja z kwotą, kontem i kategorią kontenera, połączona z nim; stan „zapłacone DD.MM”;
  energia dziś bez zmian (płatność ładowni); „Cofnij” usuwa operację; przy terminie dalej niż 14 dni – „„Zapłacone”
  od DD.MM” zamiast przycisku.
- **Nie przechodzi, gdy:**
  - płatność zmniejsza energię dziś albo kopertę;
  - po „Cofnij” kontener dalej „zapłacone”.
- **Odczyt liczb:** energia dziś i energia miesiąca przed i po.

#### LA.14 „Połącz płatności” (T49, T175)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – w M0 i M-1 płatności „TESTNET” bez kontenera, wpisane
  z kategorią codzienną.
- **Jak sprawdzić:** Ładownia → kontener z odbiorcą → „Połącz płatności „TESTNET” z tym kontenerem (N)”; Plan miesiąca
  („Koperty”, „Dzienny przydział”); Mostek.
- **Oczekiwany efekt:** N = liczba płatności odbiorcy bez kontenera od startu budżetu; po połączeniu płatności nie są
  w kopertach, stan „zapłacone”, energia dziś rośnie o ich udział w puli dziennej M0 (T30).
- **Nie przechodzi, gdy:**
  - połączone płatności liczą się w kopercie i w ładowni naraz;
  - łączone są płatności innego odbiorcy.
- **Odczyt liczb:** N, wydane w kopercie, energia dziś przed i po.

#### LA.15 Nowa cena – kontener cięższy (F9, D87, T283, T284)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Netflix” 43 zł, dwie ostatnie płatności 49 zł;
  „Spotify” 23 zł, ostatnie płatności 24 zł (różnica poniżej progu); kontener z jedną płatnością w nowej cenie.
- **Jak sprawdzić:** Mostek → odprawa; Meldunki → „Ładownia”; Ładownia → „Netflix” („Kontener cięższy niż w
  manifeście”, symulacja) → „Zaktualizuj od …” → toast → „Historia kwot”; Plan miesiąca M0 i M-1; „Cofnij”; drugi raz
  „To nie zmiana ceny”.
- **Oczekiwany efekt:** „Netflix: 43,00 zł → 49,00 zł co miesiąc (+14%, +72,00 zł rocznie)” w odprawie, Meldunkach
  i Ładowni (znaczek „cięższy”); „Zaktualizuj” → „Netflix: 49,00 zł od <miesiąca> – wcześniejsze miesiące liczą się
  kwotą 43,00 zł.”; M0 z 49 zł, M-1 z 43 zł; „To nie zmiana ceny” – ta kwota nie wraca; Spotify i jedna płatność – bez
  propozycji.
- **Nie przechodzi, gdy:**
  - zmiana kwoty przelicza minione miesiące;
  - procent albo kwota roczna inne;
  - propozycja przy różnicy ≤ max(5 %, 2 zł) albo po jednej płatności.
- **Odczyt liczb:** kwota M0 i M-1, procent, kwota roczna.

#### LA.16 „Jedna kwota we wszystkich miesiącach” – poprawka pomyłki (T283)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – kontener z historią kwot (po LA.15).
- **Jak sprawdzić:** Ładownia → kontener → „Historia kwot” → „Jedna kwota we wszystkich miesiącach”; Plan miesiąca M-1.
- **Oczekiwany efekt:** toast „…: X zł we wszystkich miesiącach.”; minione miesiące liczą się nową kwotą (to poprawka,
  nie podwyżka); historia kwot pusta.
- **Nie przechodzi, gdy:** M-1 dalej ze starą kwotą albo historia kwot zostaje.
- **Odczyt liczb:** ładownia M-1 przed i po.

#### LA.17 Kontener bez płatności – „subskrypcja anulowana?” (F9, T285)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – „Siłownia” 120 zł co miesiąc, płatności do M-3, brak
  w terminach M-2 i M-1 (plik z banku je obejmuje); drugi kontener z jednym brakującym terminem.
- **Jak sprawdzić:** Ładownia → „Siłownia” („Kontener bez płatności”, „Terminy bez płatności: …”) → „Zrzuć z ładowni”;
  „Cofnij”; „Nadal płacę”; Meldunki; odprawa.
- **Oczekiwany efekt:** sygnał dopiero po dwóch terminach bez płatności; „Zrzuć z ładowni” pokazuje symulację
  i archiwizuje; „Nadal płacę” – „Siłownia zostaje w ładowni.”, sygnał znika do następnego braku; jeden brak – bez
  sygnału.
- **Nie przechodzi, gdy:**
  - sygnał po jednym terminie albo dla terminu, którego plik z banku nie obejmuje;
  - zrzut bez symulacji.
- **Odczyt liczb:** masa ładunku przed i po zrzucie.

#### LA.18 Usunięcie kontenera z płatnościami i „Cofnij” (T175, B58)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – kontener „Internet” z płatnościami w M0.
- **Jak sprawdzić:** Ładownia → „Usuń kontener” → potwierdzenie; Plan miesiąca („Koperty”, „Dzienny przydział”) →
  toast „Cofnij”; ponownie: usuń i dodaj nowy kontener tego odbiorcy.
- **Oczekiwany efekt:** po usunięciu płatności liczą się jak zwykłe wydatki (koperta, energia dziś, debriefing);
  „Cofnij” łączy je ponownie; nowy kontener tego odbiorcy może je przejąć („Połącz płatności”).
- **Nie przechodzi, gdy:**
  - płatności znikają z kopert, a energia dalej je odejmuje;
  - „Cofnij” przywraca kontener bez płatności.
- **Odczyt liczb:** koperta, energia dziś przed, po usunięciu i po „Cofnij”.

#### LA.19 Powiadomienia Ładowni (spec „Powiadomienia”, D86, T208, T284, T285)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** rok; zegar maszyny: 14 i 3 dni przed terminem opłaty
  okresowej, 3. dzień po terminie opłaty stałej bez płatności.
- **Jak sprawdzić:** czekaj na powiadomienia; kliknij każde.
- **Oczekiwany efekt:** asteroida 14 i 3 dni przed terminem (raz każda); „Kontener niezaładowany” 3 dni po terminie;
  nowa cena i kontener bez płatności – raz; opłata zapłacona przed terminem – bez powiadomienia; wyłączone w Ustawienia
  → Powiadomienia i dźwięki – nie przychodzą.
- **Nie przechodzi, gdy:**
  - powiadomienie o zapłaconej opłacie albo podwójne;
  - kwota albo termin inne niż w Ładowni.
- **Odczyt liczb:** kwoty i daty z powiadomień.

### DO – Dokowanie z ICTTJ i granica ICTTJ

#### DO.1 Kolejność rozładunku – przykład ze specyfikacji (spec „Dokowanie”, D13, plan E1, T218)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** spec-dok – osłony 8 640 / 12 000 zł (pensja 4 000 zł, cel
  3 pensje), kadłub 15 000 / 21 900 zł (koszty 3 650 zł / mies.), cel własny niepełny; Claude dopisuje w fiksturze
  ICTTJ wypłatę 5 000 zł z puli „Bieżące” z dnia D, a w mBanku jest wpływ od XTB 5 000 zł z dnia D.
- **Jak sprawdzić:** Mostek → panel „Dokowanie (1)” → wiersz „Wypłata z ICTTJ · Bieżące … do zadokowania +5 000,00 zł”
  → okno „Dokowanie dostawy” („Źródło”, „Konto: mBank – wpływ DD.MM”, „Podział”) → „Zadokuj”.
- **Oczekiwany efekt:** propozycja: Osłony 3 360,00 zł, Kadłub 1 640,00 zł, cele 0,00 zł; po „Zadokuj” animacja
  „Zadokowano”, toast „Zadokowano 5 000,00 zł.” z „Cofnij”, wiersz „zadokowana”; osłony 12 000 / 12 000 zł, kadłub
  16 640 / 21 900 zł; zasięg 6,476 → 7,846 mies. (napis „6,4” → „7,8”, obcięty do 0,1 – T218; spec podaje 6,5),
  klasa Niszczyciel bez zmiany.
- **Nie przechodzi, gdy:**
  - podział inny niż 3 360 / 1 640 / 0;
  - kadłub dostaje cokolwiek, zanim osłony są pełne;
  - zasięg albo klasa inne niż wyrocznia.
- **Odczyt liczb:** osłony, kadłub, cele, zasięg i klasa przed i po; podział w oknie.

#### DO.2 Nadwyżka do celów według priorytetów i „wolne do decyzji” (spec „Dokowanie” 3–4, D13, D72, T181)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** spec-dok, wariant B – osłony 12 000 / 12 000 zł, kadłub
  20 900 / 21 900 zł;
  „Rower” 2 500 / 3 000 zł (priorytet 1), „Laptop” (ICTTJ) 0 / 5 000 zł (priorytet 2); Claude dopisuje wypłatę
  8 000 zł z puli „Nadwyżki w masie” i wpływ w mBanku.
- **Jak sprawdzić:** okno dokowania (propozycja) → „Zadokuj”; Mostek („Osłony … wolne do decyzji”), Mapa gwiezdna.
- **Oczekiwany efekt:** kadłub +1 000 (pełny), Rower +500 (pełny), Laptop +5 000 (pełny), reszta 1 500 zł zostaje
  w osłonach ponad cel; Mostek: „wolne do decyzji: 1 500,00 zł” (kadłub pełny – T181).
- **Nie przechodzi, gdy:**
  - cel dostaje ponad swoją kwotę;
  - kolejność celów niezgodna z listą priorytetów;
  - reszta nie jest „wolna do decyzji” przy pełnym kadłubie.
- **Odczyt liczb:** kadłub, Rower, Laptop, osłony, „wolne do decyzji”.

#### DO.3 Pula Cele – prosto do celów, najpierw cele ICTTJ (spec, D55, D72, T65, T226)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – osłony poniżej celu; „Rower” (własny, priorytet 1)
  brakuje 2 000 zł, „Laptop” (ICTTJ, priorytet 2) brakuje 1 000 zł; Claude dopisuje wypłatę 1 500 zł z puli „Cele”
  z parą w mBanku; drugi wariant – wszystkie cele pełne.
- **Jak sprawdzić:** okno dokowania → Podział, notka pod nim → „Zadokuj”; Mapa gwiezdna; Mostek.
- **Oczekiwany efekt:** propozycja: Laptop 1 000 zł (cele ICTTJ najpierw, mimo niższej pozycji na liście), Rower
  500 zł, osłony 0 zł mimo niepełnych osłon; notka „Propozycja według kolejności dokowania – pula Cele: prosto do
  celów, najpierw cele z prognozy ICTTJ.”; wariant 2 – całość do osłon („czego cele nie potrzebują”); znaczek
  „DOL · pula Cele” przy Laptopie przed dokowaniem.
- **Nie przechodzi, gdy:**
  - pula Cele zasila osłony albo kadłub, gdy cele mają braki;
  - Rower dostaje przed Laptopem.
- **Odczyt liczb:** Laptop, Rower, osłony przed i po.

#### DO.4 Pula Podatek – poza budżetem (spec, D55, D58, T119, T224)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – wpis ICTTJ 2 000 zł z puli „Podatek” z parą w mBanku;
  później w M0 przelew do urzędu skarbowego 1 800 zł.
- **Jak sprawdzić:** okno dokowania → wiersz „Podatek · poza budżetem, na PIT-38” → „Zadokuj”; Mostek („Podatek · poza
  budżetem (PIT-38)”), Radar → „PIT-38”, Plan miesiąca → „Przychody”, debriefing (koszty netto). Drugi wpis z puli
  Podatek: zmień podział w oknie (podatek 1 500, reszta osłony) → „Zadokuj”.
- **Oczekiwany efekt:** całość w „Podatek”, osłony 0; Mostek i Radar („Wypłacone na podatek (poza budżetem): …”) te
  same kwoty; nie przychód i nie koszt; przelew do urzędu nie jest kosztem netto i zmniejsza „Podatek”; przy zmienionym
  podziale przychodem z tradingu jest tylko część poza podatkiem (500 zł).
- **Nie przechodzi, gdy:**
  - wypłata z puli Podatek podnosi osłony, energię albo przychód;
  - przelew do urzędu jest kosztem miesiąca albo zjada energię.
- **Odczyt liczb:** Podatek (Mostek, Radar), przychody trading przed i po, koszty netto M0.

#### DO.5 Zwrot do masy z puli Podatek – z rezerwy, bez firewalla (T65, T224, N43)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** brzegi – osłony poniżej celu; wpis ICTTJ „return” 300 zł
  z puli Podatek i wypływ 300 zł do XTB w mBanku.
- **Jak sprawdzić:** Mostek → „Dokowanie” → „Zwrot do masy” → okno; odprawa.
- **Oczekiwany efekt:** okno: „Zwrot z puli Podatek: wraca z rezerwy na PIT-38, nie z budżetu.”; bez czerwonego alarmu
  i naruszenia; odprawa „wraca z rezerwy na PIT-38”; osłony bez zmian, „Podatek” −300 zł.
- **Nie przechodzi, gdy:** czerwony firewall albo osłony −300 zł.
- **Odczyt liczb:** osłony, Podatek przed i po.

#### DO.6 Częściowe dokowanie i dokładne kwoty celów (spec „Podział zawsze można zmienić”, N-PC-1, N-PC-3, D95)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** spec-dok po DO.1; wypłata 3 000 zł z puli „Bieżące”.
- **Jak sprawdzić:** okno → „Do kadłuba” 1 000 → „Do celu Rower” 300 → odczytaj „Osłony”; wpisz razem więcej niż 3 000;
  „przywróć propozycję”; ustaw ponownie i „Zadokuj”; otwórz zadokowaną → zmień podział → „Zapisz podział”.
- **Oczekiwany efekt:** Osłony = 3 000 − 1 000 − 300 (reszta, przy pełnych osłonach ponad cel – „wolne do decyzji”);
  ponad kwotę – „Podział przekracza kwotę dostawy o X.” i „Zadokuj” nieaktywny; po dokowaniu warstwy według zapisanego
  podziału; „Zapisz podział” zmienia warstwy bez nowej operacji i bez drugiego dokowania.
- **Nie przechodzi, gdy:**
  - zapisany podział różni się od wpisanego;
  - ponowne otwarcie tworzy drugie dokowanie albo drugą operację.
- **Odczyt liczb:** podział, osłony, kadłub, Rower przed i po każdej zmianie.

#### DO.7 Wycofanie i korekta dokowania (N-PC-2, D95, T64, T162)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – jedna wypłata z parą w mBanku, druga zadokowana na
  Portfelu XTB; ręczny wydatek z tego samego dnia.
- **Jak sprawdzić:** zadokuj → toast „Cofnij”; Mostek → „Wycofaj dokowanie” (1.15.2) przy zadokowanej dostawie z mBanku
  i przy dostawie na Portfelu XTB; Operacje.
- **Oczekiwany efekt:** wycofanie przywraca „do zadokowania” i warstwy sprzed dokowania; operacja z banku zostaje;
  operacja Portfela XTB utworzona przy dokowaniu znika razem z dokowaniem; ręczne operacje nie są ruszane.
- **Nie przechodzi, gdy:**
  - brak „Wycofaj dokowanie” na Mostku (CHANGELOG 1.15.2);
  - wycofanie usuwa operację z banku albo zostawia operację Portfela XTB;
  - warstwy po wycofaniu ≠ przed dokowaniem.
- **Odczyt liczb:** osłony, kadłub, cele, saldo Portfela XTB przed, po dokowaniu i po wycofaniu.

#### DO.8 Wypłata bez pary w mBanku – Portfel XTB po 3 dniach roboczych (spec, D56, D72, T63, T162)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – wpis ICTTJ 800 zł z puli „Bieżące” sprzed 5 dni
  roboczych, bez wpływu w mBanku, plik z mBanku obejmuje dni po oknie; wpis 400 zł sprzed 1 dnia roboczego; wpis
  600 zł sprzed 5 dni roboczych, ale ostatni plik z mBanku kończy się w oknie (wariant brzegi).
- **Jak sprawdzić:** Mostek → „Dokowanie” (znaczki, stany) → okno każdego wpisu → dla 800 zł „Zadokuj na Portfelu
  XTB”; Operacje (Portfel XTB).
- **Oczekiwany efekt:** 800 zł: znaczek „Portfel XTB?”, „W mBanku nie ma tej kwoty od XTB po 3 dniach roboczych –
  najpewniej Portfel XTB. Potwierdź albo poczekaj na import.”; po potwierdzeniu toast „Zadokowano 800,00 zł na Portfelu
  XTB.”, operacja XTB na Portfelu z datą wpisu, saldo Portfela +800, dokowanie zwykłą kolejnością; 400 zł i 600 zł –
  „czeka na import” („… FI czeka na import do DD.MM. Jeśli pieniądze poszły na Portfel XTB, zadokuj teraz.”).
- **Nie przechodzi, gdy:**
  - „Portfel XTB?” przed upływem 3 dni roboczych albo bez pliku z banku obejmującego dni po oknie;
  - Portfel XTB bez potwierdzenia użytkownika;
  - operacja Portfela z inną datą albo kwotą.
- **Odczyt liczb:** saldo Portfela XTB, warstwy przed i po.

#### DO.9 Polskie dni wolne w oknie 3 dni roboczych (F42, D72, T164)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – niezadokowane wpisy ICTTJ: 600 zł z 2026-04-02
  (czwartek; 06.04 Poniedziałek Wielkanocny) z wpływem 600 zł w mBanku 2026-04-08; 700 zł z 2025-12-23 (wtorek; 24–26.12
  wolne) z wpływem 700 zł 2025-12-31; obie daty po starcie budżetu.
- **Jak sprawdzić:** Mostek → „Dokowanie” → okno obu wpisów („Konto”).
- **Oczekiwany efekt:** oba wpisy sparowane z wpływem z mBanku („mBank – wpływ 08.04.2026”, „… 31.12.2025”), bez
  „Portfel XTB?” i bez „inna kwota” – okno kończy się 3. dniem roboczym z pominięciem świąt.
- **Nie przechodzi, gdy:** wpis bez pary, z „Portfel XTB?” albo z „inna kwota”.
- **Odczyt liczb:** daty wpisu i pary.

#### DO.10 Wpływ z XTB w mBanku bez wpisu w ICTTJ (spec, D56, D72, T63)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – w M0 wpływ „XTB S.A.” 1 000 zł w mBanku bez wpisu
  w ICTTJ; inny wpływ (np. od pracodawcy).
- **Jak sprawdzić:** Mostek → „Dokowanie” (wiersz „Wpływ z XTB · bez wpisu w ICTTJ”), odprawa → okno → „Zadokuj”;
  potem Claude dopisuje w fiksturze wpis ICTTJ 1 000 zł z tego dnia (pula „Cele”); ponownie bez folderu ICTTJ
  (Ustawienia → ICTTJ → „Nie czytaj ICTTJ na tym komputerze”).
- **Oczekiwany efekt:** okno: „Bez wpisu w ICTTJ – dokuje zwykłą kolejnością. Dopisz tę wypłatę w ICTTJ (z pulą): FI
  połączy ją sama.”; odprawa przypomina o wpisie w ICTTJ; po dopisaniu wpisu – połączenie samo, przypomnienie znika,
  ponowne dokowanie bierze pulę Cele; bez folderu ICTTJ – bez przypomnienia; wpływ od pracodawcy dokuje sam, bez okna.
- **Nie przechodzi, gdy:**
  - wpływ z XTB bez wpisu nie dokuje albo dokuje dwa razy po dopisaniu wpisu;
  - zwykły wpływ otwiera okno dokowania.
- **Odczyt liczb:** warstwy po dokowaniu i po połączeniu z wpisem.

#### DO.11 Wpływ wpisany na Portfelu XTB jako para wypłaty (T224, B69)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – wpis ICTTJ 350 zł bez pary w mBanku; szybkim wpisem
  wpływ 350 zł na Portfelu XTB z tego dnia.
- **Jak sprawdzić:** okno dokowania → „Zadokuj” → Operacje (Portfel XTB) → „Cofnij”.
- **Oczekiwany efekt:** okno: „Na Portfelu XTB jest już wpływ 350,00 zł z DD.MM – „Zadokuj” zrobi z niego tę wypłatę
  (bez drugiej operacji).”; po dokowaniu jedna operacja (rodzaj XTB), saldo Portfela +350 raz; „Cofnij” przywraca
  zwykły wpływ.
- **Nie przechodzi, gdy:** powstaje druga operacja 350 zł albo saldo Portfela rośnie o 700 zł.
- **Odczyt liczb:** saldo Portfela XTB, liczba operacji.

#### DO.12 Inna kwota w banku (T162, T176, B22)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – wpis ICTTJ 1 000,00 zł, wpływ z XTB 998,50 zł dzień
  później.
- **Jak sprawdzić:** Mostek → „Dokowanie” (znaczek) → okno → „Zadokuj”; suma kont.
- **Oczekiwany efekt:** znaczek „inna kwota”; „W banku jest wpływ z XTB z DD.MM na 998,50 zł – różni się od wpisu
  o 1,50 zł (przewalutowanie, prowizja, literówka?). „Zadokuj” połączy je: liczy się kwota z banku.”; podział od
  998,50 zł; brak „Portfel XTB?” i brak „Wpływ z XTB · bez wpisu w ICTTJ”.
- **Nie przechodzi, gdy:** pieniądze liczą się dwa razy albo podział od 1 000,00 zł.
- **Odczyt liczb:** podział, suma kont.

#### DO.13 Każdy wpis dokuje raz (spec, T15, T64, T162)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – zadokowana wypłata; w folderze FI dopisane przez
  Claude'a drugie dokowanie tego wpisu (symulacja drugiego komputera).
- **Jak sprawdzić:** zamknij i uruchom aplikację; zmień w fiksturze ICTTJ `updatedAt` i notatkę wpisu; Mostek →
  „Dokowanie”; okno → „Usuń nadmiarowe”.
- **Oczekiwany efekt:** po restarcie i zmianie wpisu stan „zadokowana”, warstwy bez zmian; podwójne dokowanie –
  znaczek „podwójnie”, w oknie „Ten wpis zadokowano 2 razy … – pieniądze liczą się podwójnie.” i „Usuń nadmiarowe” –
  po nim warstwy jak po jednym dokowaniu.
- **Nie przechodzi, gdy:**
  - ten sam wpis dodaje pieniądze drugi raz;
  - zmiana notatki w ICTTJ zmienia stan na „do zadokowania”.
- **Odczyt liczb:** osłony, kadłub, cele, suma kont przed i po.

#### DO.14 Wpis usunięty albo pula zmieniona w ICTTJ (T162, B15, B16, B21)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – zadokowana wypłata z parą w mBanku.
- **Jak sprawdzić:** usuń plik wpisu w fiksturze → Mostek; przywróć plik ze zmienioną pulą („Cele”) → okno → „Zapisz
  podział”; w Operacjach usuń zadokowaną operację → „Cofnij”.
- **Oczekiwany efekt:** usunięty wpis – „wpis usunięty”, „Wpis tej wypłaty usunięto w ICTTJ – … Zadokuj ponownie …”;
  pula zmieniona – „pula zmieniona” i „Pula wpisu zmieniła się w ICTTJ po dokowaniu (było: Bieżące) – …”, po „Zapisz
  podział” pieniądze według puli Cele; usunięcie operacji usuwa jej dokowanie, „Cofnij” przywraca oba.
- **Nie przechodzi, gdy:**
  - pieniądze znikają z warstw albo zostają ze starą pulą bez znaczka;
  - wpis zostaje „zadokowany” bez operacji.
- **Odczyt liczb:** warstwy po każdym kroku.

#### DO.15 Wypłaty sprzed startu budżetu (D72, T162)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – wpis ICTTJ i jego para z dnia przed startem budżetu;
  wpis z dnia przed startem z parą w banku po starcie.
- **Jak sprawdzić:** Mostek → „Dokowanie” → „Pominięte i sprzed startu (N)”.
- **Oczekiwany efekt:** pierwszy wpis – „sprzed startu”, nie dokuje (pieniądze są w saldzie otwarcia); drugi – dokuje
  normalnie (decyduje data pieniędzy w banku).
- **Nie przechodzi, gdy:** wpis sprzed startu dokuje drugi raz albo wpis z parą po starcie jest pominięty.
- **Odczyt liczb:** warstwy przed i po dokowaniu drugiego.

#### DO.16 „Pomiń wpis” i „przywróć” (T63, T224, N45)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – wpis ICTTJ z parą w mBanku, wpis bez pary.
- **Jak sprawdzić:** okno → „Pomiń wpis” (oba) → „Pominięte i sprzed startu” → „przywróć”.
- **Oczekiwany efekt:** pominięty wpis z parą: „pominięta · wpływ w banku DD.MM”, wpływ liczy się zwykłą kolejnością
  i nie wraca jako „bez wpisu w ICTTJ”; bez pary – nic nie dokuje; „przywróć” – „do zadokowania”.
- **Nie przechodzi, gdy:** pominięty wpis zabiera parę innej wypłacie albo wraca jako „bez wpisu”.
- **Odczyt liczb:** warstwy przed i po pominięciu.

#### DO.17 Firewall – dopłata do XTB wbrew rozkazowi (spec „Zasięg i firewall”, D23, D59, T31, T221)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** brzegi – osłony poniżej celu; wpis ICTTJ „return” 500 zł
  z puli „Bieżące” i wypływ 500 zł do XTB w mBanku; druga dopłata 200 zł tylko w mBanku (bez wpisu ICTTJ).
- **Jak sprawdzić:** Mostek → „Dokowanie” → „Zwrot do masy” → okno → „Zadokuj”; odprawa; Dowództwo (dzień dopłaty);
  Plan miesiąca (koszty netto).
- **Oczekiwany efekt:** okno – czerwony tekst „Firewall: dopłata do konta tradingowego, gdy osłony albo kadłub nie są
  pełne – wbrew rozkazowi (czerwony alarm).”; odprawa – każda dopłata w osobnej linii „Firewall: dopłata do XTB
  X zł wbrew rozkazowi.” (także ta tylko z mBanku – D59); potwierdzenie przed zapisem (spec); poważne naruszenie
  w Dowództwie; dopłata z osłon, nie koszt netto.
- **Nie przechodzi, gdy:**
  - dopłata wbrew rozkazowi bez czerwonego alarmu albo bez naruszenia;
  - dopłata z mBanku bez wpisu ICTTJ nie jest wykryta;
  - dopłata liczy się do kosztów albo energii.
- **Odczyt liczb:** osłony przed i po, kwoty alarmów.

#### DO.18 Firewall – dopłata zgodna z rozkazem i rozkaz wyłączony (D23, T31, T181, T224, N44)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** spec-dok po DO.2 – osłony i kadłub pełne, „wolne do
  decyzji” 1 500 zł; Claude dopisuje „return” 1 000 zł, potem „return” 2 000 zł.
- **Jak sprawdzić:** okno każdego zwrotu; Ustawienia → Warstwy i rozkazy → firewall wyłączony → okno ponownie.
- **Oczekiwany efekt:** 1 000 zł – „Dopłata z „wolnego do decyzji” przy pełnych osłonach i kadłubie – zgodnie
  z rozkazem.”, bez alarmu; 2 000 zł (osłony po dopłacie poniżej celu) – czerwony alarm; rozkaz wyłączony – „Rozkaz
  firewall wyłączony – dopłata bez sprawdzania osłon i kadłuba.”, bez alarmu.
- **Nie przechodzi, gdy:** dopłata ponad „wolne do decyzji” przechodzi bez alarmu przy włączonym rozkazie.
- **Odczyt liczb:** wolne do decyzji, osłony po każdej dopłacie.

#### DO.19 Nowa wypłata na żywo (spec „Zasady odczytu”, D60, T68)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok, FI otwarty, folder ICTTJ czytany.
- **Jak sprawdzić:** dopisz w fiksturze nowy wpis „withdrawal”; obserwuj Mostek → „Dokowanie”, odprawę, licznik
  Meldunków; potem trzy wpisy naraz.
- **Oczekiwany efekt:** wiersz „do zadokowania” w ciągu 30 s bez restartu; pozycja w odprawie; Meldunki +1; trzy wpisy
  – trzy wiersze (powiadomienia sprawdza DO.20).
- **Nie przechodzi, gdy:** nowy wpis widać dopiero po restarcie albo po ręcznym odświeżeniu.

#### DO.20 Powiadomienie „Nowa wypłata w ICTTJ do zadokowania” (spec „Powiadomienia”, T68)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** rok z folderem ICTTJ w maszynie; FI w zasobniku.
- **Jak sprawdzić:** dopisz plik wpisu w folderze ICTTJ maszyny; potem trzy naraz; kliknij powiadomienie.
- **Oczekiwany efekt:** jedno powiadomienie na wpis od razu po zmianie; 3 i więcej – jedno zbiorcze; kliknięcie otwiera
  okno tej dostawy; wyłączone w Ustawieniach – nie przychodzi; po restarcie FI nie powtarza starych.
- **Nie przechodzi, gdy:** powiadomienie powtarza się albo prowadzi do innej dostawy.

#### DO.21 Ustawienia → ICTTJ: wybór folderu, brak folderu, folder niedostępny (spec „Zasady odczytu”, D72, T62, T225)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok; `FI_ICTJ_APPDATA` z `config.json` ICTTJ wskazującym
  fiksturę; drugi `userData` (drugi komputer).
- **Jak sprawdzić:** Ustawienia → ICTTJ: „Użyj tego folderu” → stan i liczby; „Wskaż folder…” na folder bez
  `journal.json`; zmień nazwę fikstury (folder znika) → Mostek i odprawa → przywróć nazwę; „Nie czytaj ICTTJ na tym
  komputerze”; drugi `userData` na tym samym folderze FI.
- **Oczekiwany efekt:** status „czytany”, „Wypłaty: N” zgodne z liczbą wpisów withdrawal / return; folder bez
  `journal.json` – „to nie folder ICTTJ” („W tym folderze nie ma danych ICT Trade Journal (brak pliku journal.json).”);
  znikający folder – „niedostępny”, Mostek „ICTTJ: … ›”, odprawa, po powrocie czyta sam; wyłączony –
  „Wypłaty z ICTTJ: wybierz folder ICT Trade Journal w Ustawieniach ›”; drugi komputer bez wybranego folderu (ustawienie
  komputera).
- **Nie przechodzi, gdy:**
  - zniknięcie folderu daje błąd okna albo kasuje dokowania;
  - ścieżka przechodzi na drugi komputer.

#### DO.22 Nowszy format ICTTJ i pliki nieczytelne (spec, T14, T62, T225)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; Claude dopisuje w fiksturze: wpis z `schemaVersion` 2
  i nieznanym polem, wpis z pulą „bonus”, plik z uszkodzonym JSON, wpis rodzaju „expense”, ten sam id w dwóch plikach
  (różne `updatedAt`), kopię „…(1).json”.
- **Jak sprawdzić:** Ustawienia → ICTTJ (ostrzeżenia), Mostek → „Dokowanie” (ostrzeżenia pod listą), okna wpisów.
- **Oczekiwany efekt:** „ICTTJ zapisał dane w nowszym formacie (wersja 2) – FI czyta pola, które zna; zaktualizuj
  Financial Intel.” – wpis dokuje normalnie; pula „bonus” – ostrzeżenie „nieznana pula „bonus” – dokuje zwykłą
  kolejnością”; uszkodzony plik – ostrzeżenie, reszta działa i żaden wpis nie jest „usunięty”; „expense” niewidoczny;
  dwa pliki – „Wpis ICTTJ w dwóch plikach … – FI bierze nowszy”; kopia „(1)” pominięta.
- **Nie przechodzi, gdy:**
  - jeden zły plik blokuje odczyt całego folderu;
  - wydatek ICTTJ pojawia się w FI;
  - wpis z dwóch plików liczy się dwa razy.

#### DO.23 FI nigdy nie zapisuje w folderze ICTTJ (spec „Dane i synchronizacja”, D5, D15, plan AU-10, B121)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** każdy stan z fiksturą ICTTJ; osobna kopia wzorcowa
  fikstury, której Claude nie zmienia.
- **Jak sprawdzić:** przed pierwszym uruchomieniem – manifest kopii wzorcowej (ścieżki z ukrytymi plikami, rozmiary,
  SHA-256, czasy modyfikacji) i folderu `ICT Trade Journal` w `FI_ICTJ_APPDATA`; atrybut tylko do odczytu na kopii;
  przejdź DO.1–DO.18, MG.2–MG.4 i „Otwórz ICTTJ” na tej kopii (zmiany wpisów – tylko w osobnej kopii roboczej); po
  bloku – manifest ponownie; `main.log`; Ustawienia → Folder i kopie: folder kopii wewnątrz folderu ICTTJ; wybór
  folderu ICTTJ jako folderu danych FI.
- **Oczekiwany efekt:** manifest bajt w bajt taki sam (żadnych nowych plików: `.history`, `.presence`, tymczasowych,
  kopii); w `main.log` brak prób zapisu w folderze ICTTJ; folder tylko do odczytu działa bez błędów; folder kopii
  i folder danych w folderze ICTTJ odrzucone z komunikatem.
- **Nie przechodzi, gdy:** zmienia się jakikolwiek bajt, czas modyfikacji albo lista plików – waga K.

#### DO.24 Prawdziwa wypłata i prawdziwy folder ICTTJ (spec „Granica z ICTTJ”, D55, D56, D60)
- **Kto:** Ty · **Ryzyko:** wysokie · **Stan danych:** Twój folder FI i Twój folder ICTTJ.
- **Jak sprawdzić:** przed wypłatą zapisz listę plików `payouts/` i daty modyfikacji (Eksplorator, „Data
  modyfikacji”); wpisz wypłatę w ICTTJ przy otwartym FI; po imporcie mBanku zadokuj; „Otwórz ICTTJ” z menu bocznego;
  po tygodniu porównaj listę plików i daty.
- **Oczekiwany efekt:** FI pokazuje wypłatę i powiadomienie; para z mBankiem (albo Portfel XTB po 3 dniach roboczych);
  podział zgodny z oczekiwaniem; ICTTJ uruchamia się; w folderze ICTTJ nic nie przybyło ani nie zmieniło daty poza
  Twoimi wpisami w ICTTJ.
- **Nie przechodzi, gdy:** w folderze ICTTJ pojawia się plik FI albo zmienia się data pliku, którego nie ruszałeś.
- **Odczyt liczb:** kwota wypłaty, podział, warstwy przed i po.

#### DO.25 „Otwórz ICTTJ” (spec „Okna i zasobnik”, D60, D72, T62)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok, `FI_ICTJ_LAUNCH=dry`, bez zainstalowanego ICTTJ.
- **Jak sprawdzić:** menu boczne → „Otwórz ICTTJ”; Ustawienia → ICTTJ → „Wskaż plik .exe…” → „Otwórz ICTTJ”; „Zapomnij
  wybór”.
- **Oczekiwany efekt:** bez programu – „Nie znaleziono ICT Trade Journal” z drogą do Ustawień; po wskazaniu – „Wybrany”,
  w `main.log` „ICTTJ: start <ścieżka>”; folder ICTTJ bez zmian (DO.23).
- **Nie przechodzi, gdy:** przycisk nic nie robi bez komunikatu albo uruchamia coś innego.

### MG – Mapa gwiezdna

#### MG.1 Cele własne: dodanie, kwota, termin, kolejność (D19, D72, T67, T226, N48)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – cele z pieniędzmi.
- **Jak sprawdzić:** Mapa gwiezdna → „Nowy cel”: nazwa „Telewizor”, kwota 2 400, termin → „Dodaj cel”; bez nazwy, bez
  kwoty; w istniejącym celu kwota 0; ▲ / ▼ i przeciąganie; restart aplikacji.
- **Oczekiwany efekt:** toast „Nowy cel „Telewizor” na końcu listy.” i cel na końcu; „Podaj nazwę celu.”, „Podaj kwotę
  celu.”; kwota 0 odrzucona z komunikatem; kolejność zostaje po restarcie; stany wszystkich celów bez zmian po zmianie
  kolejności (D84 C1).
- **Nie przechodzi, gdy:**
  - zmiana kolejności przesuwa odłożone pieniądze;
  - cel z kwotą 0 zapisuje się po cichu.
- **Odczyt liczb:** stany celów przed i po zmianie kolejności.

#### MG.2 Cele z prognozy ICTTJ – tylko do odczytu (spec „Granica”, D19, D72, T66)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – fikstura `forecasts/`: scenariusz „Plan testowy” (PLN)
  z celami „Laptop” 5 000 zł, „Rezerwa” bez kwoty, „Stary cel” wyłączony.
- **Jak sprawdzić:** Mapa gwiezdna → lista i panel „Prognoza ICTTJ”; spróbuj zmienić nazwę i kwotę „Laptop”; w fiksturze
  zmień kwotę „Laptop” na 5 500 i usuń „Rezerwa” → Mapa gwiezdna.
- **Oczekiwany efekt:** cele ICTTJ na wspólnej liście, nazwa i kwota bez edycji („nazwy i kwoty zmieniasz w ICTTJ”);
  wyłączony cel nie bierze pieniędzy; nowa kwota widoczna bez restartu; cel usunięty w ICTTJ – zarchiwizowany,
  jego środki zostają.
- **Nie przechodzi, gdy:**
  - FI pozwala zmienić cel ICTTJ;
  - zniknięcie celu w ICTTJ zabiera jego pieniądze.
- **Odczyt liczb:** kwoty i stany celów ICTTJ przed i po.

#### MG.3 Cel ICTTJ bez kwoty i scenariusz w innej walucie (T66, T226, N46)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Rezerwa” bez kwoty w miesiącu M0 i wypłata z puli
  Cele w M0; drugi scenariusz w EUR.
- **Jak sprawdzić:** Mapa gwiezdna (przy celu); okno dokowania wypłaty z puli Cele; Ustawienia → ICTTJ → scenariusz
  EUR (potwierdzenie) → Mapa.
- **Oczekiwany efekt:** „bez kwoty – pula Cele w <miesiąc>”; w swoim miesiącu bierze całą resztę puli Cele (po celach
  ICTTJ z kwotą), poza nim nic; EUR – „Scenariusz w EUR – cele bez kwoty w PLN.”, przy celu „X EUR – bez kwoty w PLN”.
- **Nie przechodzi, gdy:** cel bez kwoty nigdy nie dostaje pieniędzy albo bierze je w innym miesiącu.
- **Odczyt liczb:** podział puli Cele, stan „Rezerwy”.

#### MG.4 Zmiana scenariusza ICTTJ tylko po potwierdzeniu (D84 C3, T130, B30)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – dwa scenariusze, cele pierwszego z pieniędzmi.
- **Jak sprawdzić:** Ustawienia → ICTTJ → „Scenariusz” → drugi → okno z listą celów do archiwizacji → „Anuluj”; jeszcze
  raz → „Zmień scenariusz”; Mapa gwiezdna → „Zarchiwizowane (N)” → „przenieś środki”.
- **Oczekiwany efekt:** przed potwierdzeniem nic się nie zmienia; po – cele poprzedniego zarchiwizowane z pieniędzmi,
  cele nowego na liście; środki zarchiwizowanych można przenieść (MG.9).
- **Nie przechodzi, gdy:** scenariusz zmienia się bez potwierdzenia albo pieniądze celów znikają.
- **Odczyt liczb:** stany celów obu scenariuszy, „w celach … (w tym zarchiwizowane …)”.

#### MG.5 Tempo i ETA (D72, T67, T220, T226)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – wpłaty do celów w 6 ostatnich pełnych miesiącach:
  nadwyżka z dokowania, pula Cele, łupy; środki celów na starcie budżetu; cel osiągnięty; cel bez tempa.
- **Jak sprawdzić:** Mapa gwiezdna → panel „Tempo” i ETA przy każdym celu.
- **Oczekiwany efekt:** tempo = średnia miesięczna wpłat do celów z ostatnich pełnych miesięcy budżetu (do 6),
  w dwóch częściach (pula Cele i reszta), bez środków na start; ETA cel po celu w kolejności listy (pula Cele najpierw
  do celów ICTTJ); „osiągnięty”; bez tempa „ETA —”; przy zbyt małej historii „Za mało historii: ETA pojawi się po
  pierwszym pełnym miesiącu budżetu.”
- **Nie przechodzi, gdy:**
  - tempo liczy bieżący miesiąc albo środki na start;
  - ETA ignoruje kolejność celów.
- **Odczyt liczb:** tempo (obie części), ETA każdego celu.

#### MG.6 Cel z terminem – kurs przechwycenia, po terminie (F15, D84 C12, D87, T272, T226, N60)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Wakacje 2027” 6 000 zł, stan 1 200 zł, termin
  07.2027; cel z terminem minionym, niepełny, bez tempa; cel osiągnięty po terminie; cel bez terminu.
- **Jak sprawdzić:** Mapa gwiezdna → przy celach napis kursu, dymek, ETA.
- **Oczekiwany efekt:** „kurs przechwycenia: X/mies. do 07.2027”, X = brak / liczba pensji do terminu
  (dymek „… pensji od <miesiąca>”), w groszach w dół, reszta w ostatniej racie; akcent, gdy rata wyższa niż tempo;
  minięty termin bez tempa – „po terminie” w kolorze akcentu (nigdy czerwień); osiągnięty – nigdy „po terminie”; bez
  terminu – bez kursu.
- **Nie przechodzi, gdy:**
  - rata ≠ brak / liczba pensji albo bez reszty w ostatniej;
  - „po terminie” na czerwono albo przy celu osiągniętym.
- **Odczyt liczb:** brak, liczba pensji, X.

#### MG.7 Rata z pensji (F15, D87, T272, D13)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Wakacje 2027” z „rata z pensji” od M-3, osłony
  i kadłub pełne 1. dnia M-2 i M0, niepełne 1. dnia M-1; brzegi – osłony niepełne.
- **Jak sprawdzić:** Mapa gwiezdna (przełącznik „rata z pensji”); Plan miesiąca M-2, M-1, M0 („Podział pensji” –
  „Kurs przechwycenia – raty celów z terminem”, debriefing – „− raty celów”) i M+1 („gdy osłony i kadłub pełne
  1. dnia”); wyłącz przełącznik.
- **Oczekiwany efekt:** rata pobrana z energii po zbiornikach tylko w M-2 i M0 (osłony i kadłub pełne na przełomie),
  w M-1 – 0; cel rośnie o raty; wyłączenie od następnego miesiąca, pobrane raty zostają w celu; brzegi – 0.
- **Nie przechodzi, gdy:**
  - rata pobrana przy niepełnych osłonach albo kadłubie (łamie D13);
  - rata pobrana z osłon zamiast z energii.
- **Odczyt liczb:** rata w każdym miesiącu, stan celu, energia miesiąca.

#### MG.8 Przeniesienie środków z celu bez archiwizacji (N-PC-6, D95, T129)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Rower” 2 500 zł, „Telewizor” 0 zł.
- **Jak sprawdzić:** Mapa gwiezdna → „Rower” → „przenieś środki” → okno („W celu jest 2 500,00 zł. Dokąd i ile
  przenieść?”): 500 „do osłon (bufor)” → „Przenieś”; 300 do „Telewizor”; 3 000; „całość (2 500,00 zł)”; „Cofnij”.
- **Oczekiwany efekt:** Rower −500, osłony +500; Rower −300, Telewizor +300; 3 000 – „Podaj kwotę od 0,01 zł do 2 500,00
  zł.”; Rower dalej aktywny i bierze dostawy; „Cofnij” przywraca; suma warstw bez zmian.
- **Nie przechodzi, gdy:**
  - przeniesienie większe niż stan celu;
  - zmiana widoczna dopiero następnego dnia (T129 – „na koniec dnia”; wątpliwość);
  - suma warstw się zmienia.
- **Odczyt liczb:** Rower, Telewizor, osłony przed i po.

#### MG.9 Archiwizacja celu z pieniędzmi (D84 C2, T129, T221, N22)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Telewizor” z pieniędzmi.
- **Jak sprawdzić:** Mapa gwiezdna → „archiwizuj” → okno („W celu jest X. Od dziś nie trafią do niego nowe pieniądze.
  Co z tymi, które są?”) → kolejno: „do osłon (bufor)”, inny cel, „zostaw w celu (…)”, z „Cofnij”; „Zarchiwizowane
  (N)” → „przenieś środki”, „przywróć”; nagłówek „w celach … (w tym zarchiwizowane …)”; Mostek „Układy gwiezdne”.
- **Oczekiwany efekt:** każda opcja robi to, co mówi; toast „Cel „Telewizor” zarchiwizowany…, nowe już nie trafiają.”
  z „Cofnij”; zarchiwizowany nie bierze dostaw ani łupów; Mapa i Mostek pokazują tę samą sumę w celach.
- **Nie przechodzi, gdy:**
  - pieniądze zarchiwizowanego celu znikają albo są nie do odzyskania;
  - zarchiwizowany cel dostaje dostawę.
- **Odczyt liczb:** stan celu, osłony, suma w celach (Mapa, Mostek).

#### MG.10 Wydatek z pieniędzy celu (T24, T131, N1)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Rower” 700 zł.
- **Jak sprawdzić:** Operacje → nowy wydatek 900 zł „Rozrywka i hobby”, pole „Z celu: Rower” → zapisz; Mapa, Mostek,
  Plan miesiąca (energia, koperta), „skąd cele osłon i kadłuba?”.
- **Oczekiwany efekt:** cel płaci 700, osłony 200; energia dziś i koperta bez zmian; nie jest kosztem netto (cel
  kadłuba i zasięg bez zmian); na liście „z celu”, nie „bez kategorii”.
- **Nie przechodzi, gdy:** wydatek zjada energię, cel schodzi poniżej zera albo koszty netto rosną.
- **Odczyt liczb:** Rower, osłony, energia dziś, koszty netto, zasięg przed i po.

#### MG.11 Zmiany celów od chwili zmiany (D84 C1, T128, B2)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – trzy cele z pieniędzmi, historia dokowań.
- **Jak sprawdzić:** zapisz stany celów; zmień kwotę celu, kolejność, dodaj cel, zarchiwizuj inny z „zostaw w celu”;
  zapisz stany; potem zadokuj nową dostawę.
- **Oczekiwany efekt:** stany celów po zmianach identyczne jak przed (poza przenoszonymi świadomie); nowa dostawa
  według nowej kolejności i kwot.
- **Nie przechodzi, gdy:** pieniądze przeskakują między celami albo do osłon po samej zmianie celu.
- **Odczyt liczb:** stany celów przed, po zmianach i po dostawie.

#### MG.12 DOL i znaczek „DOL · pula Cele” (D73 smaczki, T226, N42)
- **Kto:** Claude · **Ryzyko:** niskie · **Stan danych:** rok – pierwszy niepełny cel własny wyżej niż pierwszy
  niepełny cel ICTTJ.
- **Jak sprawdzić:** Mapa gwiezdna (dymki „Draw on Liquidity – …” i „Następna wypłata z puli Cele w ICTTJ trafi najpierw
  tutaj …”).
- **Oczekiwany efekt:** „DOL” przy pierwszym niepełnym celu listy; „DOL · pula Cele” przy pierwszym niepełnym
  celu ICTTJ; zgodne z tym, dokąd rzeczywiście poszła kolejna dostawa (DO.2, DO.3).
- **Nie przechodzi, gdy:** znaczek wskazuje cel, który nie dostaje następnej dostawy.

### DM – Domownicy i pożyczki

#### DM.1 Zakup finansowany przez domownika nie zjada energii (spec „Rozliczenia z domownikami”, D80, T107)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Anna” bez zaliczki i bez długu.
- **Jak sprawdzić:** Operacje (Ctrl+N) → wydatek 120 zł „Jedzenie”, „Finansuje: Anna” → zapisz; szybki wpis „Za
  domownika” → Anna, 60 zł; Mostek („Rozliczenia z domownikami”, „Energia dziś”), Radar („Należności”), Plan miesiąca
  (koperta „Jedzenie”, debriefing).
- **Oczekiwany efekt:** energia dziś i koperta bez zmian; osłony −180 zł; Anna „ma oddać 180,00 zł od DD.MM” na Mostku
  i Radarze; edytor: „pożyczone z osłon … (ma oddać)”; zakupy poza kosztami netto, w debriefingu w „Sfinansowane przez
  domowników (Anna) – nie Twoje koszty”; bez naruszenia w grze; szybki wpis bez osoby nie zapisuje.
- **Nie przechodzi, gdy:**
  - zakup zmniejsza energię albo kopertę;
  - kwota „ma oddać” ≠ suma zakupów;
  - zakup jest w kosztach netto.
- **Odczyt liczb:** energia dziś, koperta, osłony, „ma oddać” (Mostek, Radar).

#### DM.2 Zakup z zaliczki osoby, reszta z osłon (spec, D80 c, D80 d, T107)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Tata” zaliczka 500 zł (depozyt).
- **Jak sprawdzić:** wydatek 200 zł „Finansuje: Tata”; potem 700 zł; Mostek („Depozyt domowników”, osłony), Radar.
- **Oczekiwany efekt:** 200 zł – depozyt 500 → 300, osłony bez zmian; 700 zł – 300 z zaliczki, 400 pożyczone z osłon,
  depozyt 0, Tata „ma oddać 400,00 zł”; suma warstw = salda kont.
- **Nie przechodzi, gdy:** zakup pożycza z osłon, gdy zaliczka wystarcza, albo depozyt ujemny.
- **Odczyt liczb:** depozyt, osłony, „ma oddać”.

#### DM.3 Wpłata spłaca wskazany zakup – pewne dopasowanie (spec, D80 b, D91 b, T304)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Anna: zakupy 50 zł (M-2), 80 zł (M-1), 120 zł (M0),
  dzień „Zwrot spłaca wskazany zakup od:” przed nimi.
- **Jak sprawdzić:** Operacje → wpływ 80 zł „Od domownika: Anna” → „Za co oddaje” („Pasuje: …”) → zapisz; lista
  operacji (oznaczenia, filtr Oznaczenia); Radar; panel „Przychody”.
- **Oczekiwany efekt:** wpłata wiąże się sama z zakupem 80 zł („oddane”), pozostałe „do oddania”; Anna ma oddać 170 zł;
  osłony +80; przychód bez zmian.
- **Nie przechodzi, gdy:**
  - wpłata spłaca najstarszy zakup 50 zł zamiast pasującego;
  - wpłata jest przychodem.
- **Odczyt liczb:** „ma oddać”, osłony, przychód M0.

#### DM.4 Wpłata bez pewnego dopasowania – „zwrot do przypisania” (D91 a, D91 d, T304)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – jak DM.3; zwroty Anny sprzed dnia „Zwrot spłaca
  wskazany zakup od:” rozliczone od najstarszego.
- **Jak sprawdzić:** wpływ 100 zł od Anny (żaden zakup ani zestaw nie pasuje) → Meldunki → „Zwroty do przypisania” →
  wskaż zakupy 50 + 120 (część); Radar („zwrot do przypisania: … – wskaż zakupy w Meldunkach”); dawne zwroty.
- **Oczekiwany efekt:** przed wskazaniem Anna ma oddać 100 mniej, ale żaden zakup nie jest „oddane”; po wskazaniu
  statusy „oddane” / „częściowo oddane” zgodne z kwotami; osłony +100 raz; dawne zwroty zostają, jak były.
- **Nie przechodzi, gdy:**
  - wpłata sama oznacza najstarszy zakup;
  - wskazanie zmienia osłony drugi raz.
- **Odczyt liczb:** „ma oddać”, zwrot do przypisania, osłony.

#### DM.5 Nadwyżka wpłaty: przychód czy zaliczka – pytanie raz (spec, D80 b, T109, N39, N85)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Tata” z odpowiedzią „pytaj”, ma oddać 100 zł.
- **Jak sprawdzić:** Operacje → wpływ 300 zł od Taty → wybór reszty „zaliczka” → zapisz; Ustawienia → Domownicy (Tata);
  druga wpłata 150 zł (bez długu) – czy pyta; w Ustawieniach zmień na „przychód” → trzecia wpłata; szybki wpis wpływu
  od osoby z „pytaj” bez wyboru.
- **Oczekiwany efekt:** 100 zł spłaca, 200 zł do depozytu („Depozyt domowników” +200); Tata w Ustawieniach „zaliczka”;
  druga wpłata – bez pytania, zaliczka; „przychód” – reszta dokuje jak dostawa (osłony → kadłub → cele) i jest
  przychodem w panelu „Przychody”; pojedyncza wpłata może być inna niż ustawienie; szybki wpis bez wyboru nie zmienia
  ustawienia osoby.
- **Nie przechodzi, gdy:**
  - pytanie wraca przy każdej wpłacie albo odpowiedź zapamiętana bez jawnego wyboru;
  - zaliczka liczy się jako przychód.
- **Odczyt liczb:** depozyt, osłony, przychód M0.

#### DM.6 Niezależna wpłata: „niezależny przychód” i „depozyt na przyszłość” (CHANGELOG 1.15.3; wątpliwość wobec D80 b)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Anna ma oddać 170 zł.
- **Jak sprawdzić:** edytor wpływu 200 zł od Anny → „Cel wpłaty”: „niezależny przychód” → zapisz; drugi wpływ 100 zł →
  „depozyt na przyszłość”; trzeci – „spłata zakupów”; Mostek, Radar, „Przychody”.
- **Oczekiwany efekt:** „niezależny przychód” – dług Anny bez zmian, 200 zł przychodem i dostawą; „depozyt na
  przyszłość” – depozyt +100, dług bez zmian; „spłata zakupów” – jak DM.3; te same wybory w imporcie z mBanku
  i w częściach wpłaty.
- **Nie przechodzi, gdy:** wybór nie zmienia sposobu liczenia albo zmienia go dla innej wpłaty.
- **Odczyt liczb:** dług, depozyt, przychód.

#### DM.7 Wcześniejsza wpłata finansuje późniejszy zakup (D94, T312)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Tata 3 dni temu przelał 300 zł (zaliczka), bez długu;
  dziś zakup 280 zł „Finansuje: Tata”; między nimi zakup 50 zł „Finansuje: Tata”.
- **Jak sprawdzić:** edytor zakupu 280 zł → „Przypisz zwrot…” → wcześniejsza wpłata z wolną kwotą; edytor wpłaty 300 zł
  (lista późniejszych zakupów); Mostek, Radar.
- **Oczekiwany efekt:** zakup 280 zł „oddane” tą wpłatą; zarezerwowana kwota nie jest zużyta przez zakup 50 zł (ten
  pożycza z osłon albo z wolnej zaliczki); osłony nie pożyczają na zakup 280 zł; reszta 20 zł – zaliczka.
- **Nie przechodzi, gdy:** zakup 50 zł zabiera zarezerwowane pieniądze albo osłony pożyczają na zakup 280 zł.
- **Odczyt liczb:** depozyt, osłony, „ma oddać”, statusy zakupów.

#### DM.8 „Przypisz zwrot…” z wpłaty z zamkniętego miesiąca (N-PC-9, D95)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – wpłata Anny z M-2 z wolną kwotą, zakup Anny z M-1.
- **Jak sprawdzić:** edytor zakupu z M-1 → „Przypisz zwrot…” → lista wpłat (kolejność) → wybierz wpłatę z M-2.
- **Oczekiwany efekt:** wpłata z zamkniętego miesiąca jest na liście w kolejności dat i rozlicza zakup; debriefing M-2
  i M-1 bez zmiany kosztów.
- **Nie przechodzi, gdy:** wpłaty z zamkniętych miesięcy nie ma albo przypisanie zmienia koszty minionych miesięcy.
- **Odczyt liczb:** statusy, „ma oddać”.

#### DM.9 Osoba bez konta przez innego domownika – „+ także za X” (spec, D81, T118)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Babcia” (bez konta, „Pieniądze przekazuje przez:
  Tata”) ma oddać 150 zł; Tata ma oddać 100 zł.
- **Jak sprawdzić:** wpływ 250 zł od Taty → „+ także za Babcia (ma oddać 150,00 zł)” → zapisz; drugi wpływ bez
  kliknięcia; szybki wpis – „W tym za Babcia”; Radar i odprawa.
- **Oczekiwany efekt:** z kliknięciem: 150 zł spłaca Babcię, 100 zł Tatę, oboje 0; bez kliknięcia całość jest Taty
  (100 spłata, 150 reszta według jego ustawienia) – nic samo; kwota przy „+ także za” = dług Babci tuż przed wpłatą;
  Radar i przypomnienie „przekazuje przez: Tata”.
- **Nie przechodzi, gdy:** podział dzieje się sam albo kwota „+ także za” liczona z dzisiejszego, a nie sprzed wpłaty
  stanu.
- **Odczyt liczb:** „ma oddać” obu osób, depozyt, przychód.

#### DM.10 Ręczny podział wpłaty na osoby (D81, T117, N-PC-10)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Anna i Tata z długami.
- **Jak sprawdzić:** wpływ 300 zł od Anny → podział: część 120 zł dla Taty → zapisz; części ponad kwotę wpłaty; reguła
  importu z podziałem (Ustawienia → Import z banku) – podgląd w imporcie (AU-4 dla samego importu).
- **Oczekiwany efekt:** część Taty spłaca Tatę, reszta 180 zł jest Anny; każda część: spłata, potem zaliczka albo
  przychód według osoby; części ponad kwotę ucięte z komunikatem; lista operacji „od: Anna, Tata”.
- **Nie przechodzi, gdy:** suma części ≠ kwota wpłaty w rozliczeniu.
- **Odczyt liczb:** salda obu osób.

#### DM.11 Wspólne finansowanie i prezent (D83, D85, T156, T157)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Tata z zaliczką 20 zł.
- **Jak sprawdzić:** wydatek 100 zł „Wspólnie”, równo: ja, Anna, Tata; procenty 50 / 30 / 10; kwoty; zmiana kwoty
  wydatku na 90 zł; „prezent od: Tata” przy wydatku 60 zł.
- **Oczekiwany efekt:** równo – 33,33 / 33,33 / 33,34 zł (reszta w ostatniej części); moja część zjada energię i jest
  moim kosztem, części domowników idą do ich sald; procenty ≠ 100 % – ostrzeżenie, zapis niemożliwy; nowa kwota
  przelicza części; prezent – 20 zł z zaliczki Taty, 40 zł z osłon, nikt nic nie winien, energia bez zmian.
- **Nie przechodzi, gdy:**
  - suma części ≠ kwota albo reszta nie w ostatniej;
  - prezent tworzy dług albo zjada energię.
- **Odczyt liczb:** części, energia dziś, salda osób, depozyt, osłony.

#### DM.12 Rozliczenia od wybranego dnia i saldo na start (spec, D81, T115, T121, T132, T228)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Rozliczenia od” = 1. dzień M-2; przelewy domowników
  przed i po tej dacie; Babcia z saldem na start „ma oddać 300 zł” z datą najstarszego zakupu.
- **Jak sprawdzić:** Ustawienia → Domownicy: „Rozliczenia od” → późniejsza data (komunikat, „Cofnij”); data
  z przyszłości; „od startu budżetu”; „Na start rozliczeń” przy osobie; panel „Przychody”.
- **Oczekiwany efekt:** zmiana daty – „Saldo na start rozliczeń przeliczone – …” z „Cofnij”, salda osób nie liczone
  drugi raz; przyszła data – „Rozliczenia nie mogą zaczynać się w przyszłości.”; data sprzed startu – dopisek „Data
  sprzed startu budżetu – rozliczenia liczą się od startu (DD.MM.RRRR).”; przelewy domowników sprzed daty nie są
  przychodem.
- **Nie przechodzi, gdy:**
  - salda osób zmieniają się o operacje policzone dwa razy;
  - „Cofnij” nie przywraca salda i daty.
- **Odczyt liczb:** salda osób i przychody przed, po zmianie daty i po „Cofnij”.

#### DM.13 Dług otwarcia w wpłacie kilku osób (N-PC-12, D95, T304)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Babcia: saldo na start „ma oddać 300 zł” (bez
  operacji); Tata bez długu.
- **Jak sprawdzić:** wpływ 300 zł od Taty → część Babci 300 zł → „Za co oddaje” → „saldo na start rozliczeń” → zapisz;
  Radar („saldo na start rozliczeń z …”).
- **Oczekiwany efekt:** dług otwarcia Babci 0; pozycja „saldo na start rozliczeń” znika z zakupów do oddania; Tata bez
  zmian.
- **Nie przechodzi, gdy:** dług otwarcia zostaje albo część trafia do Taty.
- **Odczyt liczb:** dług Babci, osłony.

#### DM.14 Zwrot towaru z zakupu domownika (D91 e, T105, T160)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – zakup Anny 120 zł w „SKLEP TESTOWY”, nieoddany.
- **Jak sprawdzić:** wydatek −40 zł (zwrot towaru) w „SKLEP TESTOWY”, „Finansuje: Anna” → wskazanie zakupu; Mostek,
  Radar.
- **Oczekiwany efekt:** zwrot to pieniądze Anny: Anna ma oddać 80 zł; moje koszty netto bez zmian; podpowiedź tego
  samego kontrahenta; przy zakupie oddanym – reszta jako zaliczka Anny.
- **Nie przechodzi, gdy:** zwrot zmniejsza moje koszty albo zwiększa moją energię.
- **Odczyt liczb:** „ma oddać”, koszty netto, energia.

#### DM.15 Przypomnienie po 30 dniach – odprawa i Radar (spec, D80 e, T111, T228)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – najstarszy otwarty zakup Anny sprzed 35 dni, Taty
  sprzed 20 dni; Babcia – saldo na start z datą sprzed 40 dni.
- **Jak sprawdzić:** Mostek → odprawa; Radar → „Należności” („najstarszy zakup z DD.MM (N dni)”); spłata najstarszego
  zakupu Anny.
- **Oczekiwany efekt:** pozycje odprawy dla Anny i Babci („saldo na start rozliczeń”, „przekazuje przez: Tata”), nie dla
  Taty; Radar – dni w akcencie powyżej 30; po spłacie najstarszego liczy od następnego otwartego (albo znika); nowy
  zakup nie odnawia licznika.
- **Nie przechodzi, gdy:** przypomnienie przed 30 dniami albo liczone od dnia rozliczeń zamiast daty zakupu.
- **Odczyt liczb:** daty i liczby dni.

#### DM.16 Powiadomienie „Rozliczenie z domownikiem” (spec „Powiadomienia”, D80 e, T111)
- **Kto:** Maszyna · **Ryzyko:** niskie · **Stan danych:** rok; zegar maszyny: 31. dzień od najstarszego zakupu.
- **Jak sprawdzić:** czekaj na powiadomienie; kliknij; wyłącz w Ustawieniach i przesuń zegar na kolejny przypadek.
- **Oczekiwany efekt:** jedno powiadomienie na osobę i najstarszy zakup; kliknięcie prowadzi do rozliczeń; wyłączone
  – nie przychodzi.
- **Nie przechodzi, gdy:** powiadomienie codziennie dla tego samego zakupu albo z inną kwotą niż Radar.
- **Odczyt liczb:** kwota w powiadomieniu.

#### DM.17 Pożyczka udzielona z harmonogramem (spec „Przypadki szczególne”, D22, D72, T70, T72)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok.
- **Jak sprawdzić:** Radar → „Nowa pożyczka”: „Pożyczam komuś”, Nazwa „Pożyczka dla Kuby”, Kwota 1 000, „Do spłaty
  razem” puste, Data i konto (mBank), Raty 3, Pierwsza rata 31. dnia miesiąca → „Zapisz pożyczkę”; Mostek, Radar,
  Operacje, „Przychody”.
- **Oczekiwany efekt:** toast „Pożyczka „Pożyczka dla Kuby” zapisana – 3 raty na radarze.”; raty 333,33 / 333,33 /
  333,34 zł; w krótszym miesiącu rata w jego ostatnim dniu; wypływ 1 000 zł z osłon; „Pożyczki udzielone” rosną
  o 1 000 zł; nie koszt netto, nie przychód.
- **Nie przechodzi, gdy:** reszta groszy nie w ostatniej racie albo pożyczka jest kosztem.
- **Odczyt liczb:** raty, osłony, należności.

#### DM.18 Spłata pożyczki udzielonej nie jest przychodem (spec, D72, T70, T174, T221)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Pożyczka dla Oli” 1 000 zł, „Do spłaty razem”
  1 050 zł (3 raty po 350 zł), rata 4 dni po terminie; „Pożyczka dla Igi” z ratą 1 dzień po terminie; wpływ „Pożyczka”
  bez pożyczki z Radaru.
- **Jak sprawdzić:** Radar → „spłata otrzymana” → „Zapisz” (kolejne raty); znaczki przy pożyczce; „Przychody”; edytor
  wpływu bez pożyczki.
- **Oczekiwany efekt:** spłaty wracają do osłon do wysokości długu, nadwyżka 50 zł (odsetki) jest przychodem; rata
  1 dzień po terminie – „po terminie 1 dzień”, 4 dni – „spóźniona spłata”; należność maleje o spłatę; wpływ bez
  pożyczki z Radaru zmienia tylko osłony, edytor to mówi i podpowiada „zwrot pożyczki …? przypisz”.
- **Nie przechodzi, gdy:**
  - spłata (poza odsetkami) jest przychodem;
  - „spóźniona spłata” przed 3. dniem po terminie.
- **Odczyt liczb:** osłony, należność, przychód przed i po.

#### DM.19 Pożyczka wzięta z ratami w ładowni (spec, D22, D72, T71, T72, T256, B85)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok.
- **Jak sprawdzić:** Radar → „Nowa pożyczka”: „Biorę pożyczkę”, „Pożyczka od Ewy”, 3 000, „Do spłaty razem” 3 150,
  6 rat, „Raty jako kontener w Ładowni …” → „Zapisz pożyczkę”; Mostek, Ładownia; „Do spłaty razem” 2 900 przy kwocie
  3 000; „zamknij” → „Cofnij”; „usuń” przy pożyczce z operacjami.
- **Oczekiwany efekt:** osłony +3 000 (nie przychód); „Dług · pożyczki wzięte – odjęte od zasięgu” rośnie o 3 150 zł
  na Mostku i Radarze; zasięg = (osłony + kadłub − dług) / koszty; kontener „Rata: Pożyczka od Ewy” 525 zł od
  pierwszej do ostatniej raty; 2 900 – „„Do spłaty razem” nie może być mniej niż kwota pożyczki (puste = kwota).”;
  zamknięcie zdejmuje kontener (masa do końca miesiąca), „Cofnij” oddaje; usunięcie – „Ta pożyczka ma operacje – zamknij
  ją zamiast usuwać.”; zaległa rata po 3 dniach „zaległa rata”.
- **Nie przechodzi, gdy:**
  - pożyczona kwota jest przychodem albo dokuje do kadłuba lub celów;
  - zasięg nie odejmuje długu;
  - rata liczy się w ładowni i z osłon naraz.
- **Odczyt liczb:** osłony, dług, zasięg, masa ładunku przed i po.

### RA – Radar

#### RA.1 Oś 90 dni – zakres i rodzaje zdarzeń (spec „Ekrany” – Radar, T73, T208, T273)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok.
- **Jak sprawdzić:** Radar → nagłówek („90 dni – do DD.MM.RRRR”), panel „Na radarze” (miesiące, dzień, rodzaj, nazwa,
  notatka, kwota, osłony po zdarzeniu).
- **Oczekiwany efekt:** okno D … D+90; rodzaje: „pensja” (1. dnia każdego miesiąca), „asteroida”, „opłata” (kontenery
  miesięczne), „rata”, „spłata”, „boja”, „koniec”, „zwrot”, „termin” (PIT-38, gdy w oknie); wpływy „+” na zielono,
  wypływy „−”; zdarzenia po dniach rosnąco; nic poza oknem.
- **Nie przechodzi, gdy:** zdarzenia z okna brakuje albo pojawia się zdarzenie spoza 90 dni.
- **Odczyt liczb:** każda pozycja (dzień, rodzaj, kwota).

#### RA.2 Pensje na Radarze z planu w mocy (T46, T73)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – własny plan M+1 z inną pensją niż M0; M+2 bez planu.
- **Jak sprawdzić:** Radar → pozycje „pensja”; Plan miesiąca M+1, M+2.
- **Oczekiwany efekt:** 1. dnia M+1 pensja z planu M+1, 1. dnia M+2 – ta sama (plan odziedziczony); osłony po zdarzeniu
  maleją o pensję (z kadłuba, gdy brakuje – D14).
- **Nie przechodzi, gdy:** kwota pensji na Radarze ≠ plan w mocy tego miesiąca.
- **Odczyt liczb:** pensje i osłony po zdarzeniu.

#### RA.3 Asteroidy ze stanem zbiornika (spec, T73, T135, T221)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – „Podatek od nieruchomości” 15.11 (≤ 14 dni od D, jeśli
  D w listopadzie – inaczej najbliższa płatność harmonogramu), „OC Auto” w oknie, „Wywóz śmieci” zapłacony przed
  terminem.
- **Jak sprawdzić:** Radar → pozycje „asteroida” (notatka „w zbiorniku …”); Ładownia → „Odkładki”; Mostek → odprawa.
- **Oczekiwany efekt:** każda płatność opłaty okresowej w oknie, przy pierwszej stan zbiornika = stan w Ładowni;
  zapłacona przed terminem – następny termin; odprawa: asteroidy w ciągu 14 dni (osobno ≤ 3 dni).
- **Nie przechodzi, gdy:** stan zbiornika na Radarze ≠ Ładownia albo zapłacona opłata dalej ogłaszana.
- **Odczyt liczb:** kwoty, stany zbiorników, dni do terminu.

#### RA.4 Opłaty miesięczne na Radarze (F1, D86, T208)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – Czynsz, Internet, Telefon (zaległy), opłata okresowa
  w M0.
- **Jak sprawdzić:** Radar → pozycje „opłata” w kolejnych miesiącach.
- **Oczekiwany efekt:** każdy kontener miesięczny w każdym miesiącu okna, w dniu płatności z historii; zaległy –
  oznaczony („po terminie”); opłata okresowa tego miesiąca raz (w dniu z historii, bez drugiej w dniu kontenera).
- **Nie przechodzi, gdy:** opłata podwójna w miesiącu albo brak kontenerów miesięcznych.
- **Odczyt liczb:** dni i kwoty opłat.

#### RA.5 Spodziewane wpłaty i zaległości (spec, D72, T73, T221, N59)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – rata „Pożyczki dla Oli” 4 dni po terminie, rata
  „Pożyczki dla Igi” 1 dzień po terminie, rata „Pożyczki od Marka” 2 dni po terminie, boja-wpływ, zwrot w drodze.
- **Jak sprawdzić:** Radar → oś; „Pożyczki” (znaczki); odprawa.
- **Oczekiwany efekt:** spodziewane spłaty i wpływy z „+”; zaległe na osi oznaczone, „po terminie N dni”; od 3. dnia
  po terminie „spóźniona spłata” / „zaległa rata” i przypomnienie w odprawie (D72); kwoty zaległych = brakująca część
  raty.
- **Nie przechodzi, gdy:** „zaległa” wcześniej niż po 3 dniach albo zaległość znika z osi.
- **Odczyt liczb:** kwoty i dni po terminie.

#### RA.6 Boje: wydatek, wpływ, termin bez kwoty, co roku (F16, D87, T273)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok.
- **Jak sprawdzić:** Radar → „Nowa boja”: „Wydatek” „Wesele Kasi” 1 500 zł za 20 dni, konto mBank, kategoria
  „Prezenty i inne”, „Przypomnij” 14, 3; „Wpływ” „Premia” 2 000 zł za 40 dni; „Termin bez kwoty” „Wymiana dowodu” za
  60 dni; boja „co roku” z dniem 29.02; boja bez nazwy i wydatek bez kwoty.
- **Oczekiwany efekt:** toast „Boja „…” na radarze.”; boje na osi (rodzaj „boja”) i w panelu boi; termin bez kwoty
  z „—”; boja co roku w kolejnym roku; 29.02 w roku nieprzestępnym – 28.02 (brak D – T273); błędy: „Nazwij boję
  (np. „Wesele Kasi”).”, „Podaj kwotę albo wybierz „Termin bez kwoty”.”; przypomnienia boi w odprawie 14 i 3 dni przed.
- **Nie przechodzi, gdy:** boja bez kwoty zmienia osłony po zdarzeniu albo boja co roku nie wraca.
- **Odczyt liczb:** kwoty boi, osłony po zdarzeniu.

#### RA.7 Boja: „Wykonaj teraz”, „odhacz”, dopasowanie z banku, „to nie ta”, po terminie (F16, T273, T282)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – boja „Serwis auta” 600 zł z dniem D−2 i operacja
  z banku 600 zł z D−1; boja z dniem D−10 bez operacji; boja z dniem D−35.
- **Jak sprawdzić:** panel boi: „operacja ›”, „to nie ta”; przy innej boi „Wykonaj teraz” → Operacje → „Cofnij”;
  „odhacz”; boje sprzed 10 i 35 dni.
- **Oczekiwany efekt:** operacja z ±3 dni zamyka boję („operacja ›”); „to nie ta” – boja znowu otwarta i ta operacja
  już jej nie zamknie; „Wykonaj teraz” – operacja dziś z kwotą, kategorią, kontem i kontrahentem boi, otwarta
  w Operacjach, „Cofnij” zdejmuje oba; „odhacz” – bez operacji; boja sprzed 10 dni „po terminie”; sprzed 35 dni –
  zniknęła (30 dni).
- **Nie przechodzi, gdy:**
  - zamknięta boja dalej liczy się w saldach kont naprzód (podwójnie z operacją);
  - „Cofnij” zostawia operację.
- **Odczyt liczb:** salda kont naprzód przed i po zamknięciu boi.

#### RA.8 PIT-38 – termin bez kwoty (spec „Granica”, D58, D72, T73)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok z wypłatą z puli Podatek; D poza 1.02–30.04.
- **Jak sprawdzić:** Radar → panel „PIT-38”; oś; Mostek → odprawa.
- **Oczekiwany efekt:** „Na radarze od 1 lutego (termin 30 kwietnia).”, „Kwotę liczy ICTTJ (rezerwa podatkowa); FI
  przypomina tylko o terminie.”, „Wypłacone na podatek (poza budżetem): X”; nigdzie kwoty podatku do zapłaty.
- **Nie przechodzi, gdy:** FI pokazuje kwotę PIT-38 do zapłaty albo termin inny niż 30 kwietnia.
- **Odczyt liczb:** „Wypłacone na podatek”.

#### RA.9 PIT-38 od 1 lutego, przypomnienia 14 i 3 dni (spec, D72, T74)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** rok; zegar maszyny: 31.01 → 1.02, 16.04, 27.04, 1.05.
- **Jak sprawdzić:** Radar (oś, panel „PIT-38”) i odprawa w każdym z dni; powiadomienia.
- **Oczekiwany efekt:** od 1.02 pozycja „termin” 30.04 na osi, kwota „—”, panel „Termin: 30 kwietnia RRRR (za
  RRRR−1)”; powiadomienia 16.04 i 27.04 bez kwoty; 1.05 – po terminie znika (następny rok).
- **Nie przechodzi, gdy:** pozycja przed 1.02 albo powiadomienie z kwotą.

#### RA.10 Salda kont naprzód – czy starczy na płatność (F26, D87, T274, T281)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** brzegi – mBank 1 500 zł, Czynsz 2 000 zł z mBanku za 7 dni,
  Portfel XTB 3 000 zł; wariant – Portfel XTB 200 zł; wariant – mBank już ujemny.
- **Jak sprawdzić:** Radar → „Salda kont za 90 dni” → „Zaplanuj przelew własny” → toast → Operacje → „Cofnij”; Mostek →
  odprawa; warianty.
- **Oczekiwany efekt:** mBank „min. −500,00 zł (DD.MM)”, „Zabraknie 500,00 zł na płatność DD.MM (Czynsz) – przelej
  z konta Portfel XTB”; odprawa „Na koncie mBank zabraknie …”; przelew dziś na kwotę w górę do pełnych złotych, obie
  strony, toast „Przelew 500,00 zł z konta Portfel XTB na konto mBank zapisany – zmień dzień, gdy zrobisz go później.”;
  po przelewie ostrzeżenie znika, warstwy i suma kont bez zmian; Portfel 200 zł – „Żadne inne konto nie ma tyle do tego
  dnia – przelew trzeba zaplanować ręcznie.”; saldo ujemne już dziś – bez prognozy braku.
- **Nie przechodzi, gdy:**
  - przelew zmienia osłony albo energię;
  - brak liczy wydatki codzienne;
  - kwota przelewu mniejsza niż brak.
- **Odczyt liczb:** salda i minima kont, brak, kwota przelewu, warstwy przed i po.

#### RA.11 Osłony po zdarzeniu (F27, D87, T275)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – w oknie pensje, boja-wydatek, boja-wpływ, spłata
  pożyczki udzielonej, opłaty ładowni.
- **Jak sprawdzić:** Radar → kolumna osłon (dymek „Osłony po tym zdarzeniu (bez wpływów, których dnia nie znamy)”).
- **Oczekiwany efekt:** start od dzisiejszych osłon; pensja zmniejsza osłony (z kadłuba, gdy brakuje); boja-wydatek
  z osłon; boja-wpływ dokowany kolejnością D13; spłata pożyczki do osłon; opłaty ładowni i zbiorników nie zmieniają
  osłon; wartość ujemna w kolorze akcentu.
- **Nie przechodzi, gdy:** opłata z ładowni zmniejsza osłony albo boja-wpływ cały w osłonach przy pełnych osłonach.
- **Odczyt liczb:** osłony po każdym zdarzeniu.

#### RA.12 Należności na Radarze (spec, D80, D91, T112)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok – Anna (ma oddać, zwrot do przypisania), Tata (zaliczka),
  Babcia (saldo na start, przez Tatę), pożyczka udzielona i wzięta.
- **Jak sprawdzić:** Radar → „Należności” (rozwiń „N zakupy do oddania”, kliknij zakup); „wydatki domowników ›”;
  Mostek → „Rozliczenia z domownikami”.
- **Oczekiwany efekt:** przy osobie „ma oddać” / „zaliczka (depozyt)”, „najstarszy zakup z DD.MM (N dni)”, „przekazuje
  przez: Tata”, „zwrot do przypisania: …”; lista zakupów prowadzi do operacji; „Domownicy mają oddać razem” = suma
  osób; „Pożyczki udzielone”; „Dług (pożyczki wzięte)”; liczby = Mostek.
- **Nie przechodzi, gdy:** suma ≠ suma osób albo Radar i Mostek się różnią.
- **Odczyt liczb:** salda osób, suma, pożyczki, dług.

#### RA.13 Koniec kontenera i „ładownia lżejsza” (F16, T273)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – kontener z „Do miesiąca” = M0 albo M+1, ostatnia
  płatność w ciągu 14 dni.
- **Jak sprawdzić:** Radar → pozycja „koniec”; Mostek → odprawa; Plan miesiąca M+1 (ładownia).
- **Oczekiwany efekt:** „… potem ładownia lżejsza o X/mies.”, X = miesięczna część kontenera; w M+2 (po końcu) ładownia
  mniejsza o X.
- **Nie przechodzi, gdy:** kontener liczy się po swoim końcu.
- **Odczyt liczb:** X, ładownia przed i po końcu.

#### RA.14 Zwroty w drodze na Radarze (F34, D87, T289)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok – wydatek z „Czekam na zwrot pieniędzy” (termin za
  5 dni), drugi po terminie.
- **Jak sprawdzić:** Radar → „Zwroty w drodze” („pokaż”, „zamknij”), oś (rodzaj „zwrot”).
- **Oczekiwany efekt:** zwrot w swoim dniu jako spodziewany wpływ; po terminie „po terminie N dni”; „zamknij” zdejmuje
  z panelu i osi; salda kont naprzód go nie liczą (bez konta).
- **Nie przechodzi, gdy:** zwrot zmienia warstwy, zanim pieniądze wpłyną.
- **Odczyt liczb:** kwoty zwrotów.

### PR – Przekrój liczb

#### PR.1 Suma warstw = salda kont (spec „Pieniądze: konta, warstwy i przepływy”, T4, T107)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** start, rok, brzegi, spec-dok; po każdym punkcie, który
  zmienia pieniądze (dokowanie, łupy, przeniesienie, przelew, pożyczka, zakup domownika).
- **Jak sprawdzić:** Mostek → „Stan okrętu”: Osłony, Energia, Kadłub, Układy gwiezdne, Zbiorniki, Podatek, Depozyt
  domowników, Łupy, „Suma kont budżetu”; Operacje → salda kont; Ustawienia → Konta.
- **Oczekiwany efekt:** Osłony + Energia + Kadłub + Cele (z zarchiwizowanymi) + Zbiorniki + Podatek + Depozyt (+ Łupy
  do podziału, gdy są osobną warstwą – skład rozstrzyga wyrocznia) = „Suma kont budżetu” = suma sald kont co do grosza,
  w każdym stanie i po każdej zmianie; Należności i Dług nie są dodawane (należności już zmniejszyły osłony).
- **Nie przechodzi, gdy:** różnica choćby o grosz – waga K.
- **Odczyt liczb:** wszystkie warstwy, suma kont, salda kont.

#### PR.2 Warstwy, cele warstw i „wolne do decyzji” (spec „Warstwy”, D12, D13, T27, T181, T219)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; brzegi (osłony poniżej minimum, pusty kadłub, cel
  kadłuba nieznany – za krótka historia).
- **Jak sprawdzić:** Mostek → „Stan okrętu” (wartość / cel, pasek z kreską minimum), „skąd cele osłon i kadłuba?”,
  odprawa.
- **Oczekiwany efekt:** cel osłon = pensja × 3 (ustawienie); minimum = min(minimum, cel) × pensja; cel kadłuba = 6 ×
  średnie koszty netto z 12 pełnych miesięcy (przy < 3 – koszty przyjęte); „wolne do decyzji” tylko przy pełnym
  kadłubie, inaczej „ponad cel osłon: X – kadłub niepełny, nie do dopłaty XTB” albo „cel kadłuba jeszcze nieznany …”;
  brzegi – „Osłony (bufor na pensje) poniżej minimum o X.”.
- **Nie przechodzi, gdy:**
  - cel kadłuba liczony z bieżącego miesiąca albo innego okna;
  - „wolne do decyzji” przy niepełnym kadłubie.
- **Odczyt liczb:** osłony, cel, minimum, kadłub, cel, wolne, X.

#### PR.3 Zasięg i klasa okrętu (spec „Zasięg i firewall”, „Klasy okrętu”, T10, T71, T218)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok, brzegi, spec-dok; wariant z zasięgiem 11,96 mies.
  i dokładnie 6,00 mies.
- **Jak sprawdzić:** Mostek → „Zasięg” (rozbicie), „Klasa”, „średnie koszty …”; Ładownia (symulacja „teraz”); Raporty;
  Dowództwo; Wywiad.
- **Oczekiwany efekt:** zasięg = max(0, osłony + kadłub − dług) / średnie koszty netto, napis obcięty do 0,1 mies.;
  11,96 → „11,9 mies.” i Krążownik; 6,00 → Niszczyciel; klasy: < 1 Zwiadowca, 1–3 Korweta, 3–6 Fregata, 6–9
  Niszczyciel, 9–12 Krążownik, ≥ 12 Flagowiec; bez kosztów „—”; ta sama liczba na wszystkich ekranach.
- **Nie przechodzi, gdy:** napis pokazuje próg klasy, której okręt nie ma, albo ekrany się różnią.
- **Odczyt liczb:** paliwo, koszty, zasięg, klasa na każdym ekranie.

#### PR.4 „Skąd ta liczba?” – rozbicia składają się (F29, D87, T295)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok, po zadokowanej dostawie z pulą Podatek i celami.
- **Jak sprawdzić:** Mostek → rozbicie energii dziś, „Zasięg”, „skąd cele osłon i kadłuba?”, „ostatnia dostawa
  (DD.MM) – dokąd poszła?”; „?” w nagłówkach paneli i dymki metafor.
- **Oczekiwany efekt:** linie każdego rozbicia sumują się do ostatniej linii; energia: koperty codzienne z łupami,
  wydane do wczoraj, zostało na N dni, podstawowy przydział, zaoszczędzone / przekroczone, przydział na dziś, wydane
  dziś = energia dziś; dostawa: rezerwa PIT-38 + osłony + kadłub + cele = kwota dostawy; metafora zawsze z prawdziwą
  nazwą (D34).
- **Nie przechodzi, gdy:** linie nie dają wyniku albo wynik ≠ liczba na Mostku.
- **Odczyt liczb:** każda linia rozbić.

#### PR.5 Energia dziś: Mostek, Plan miesiąca, szybki wpis (spec, T186, T295)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok.
- **Jak sprawdzić:** odczytaj energię dziś na Mostku, w Planie miesiąca i w podglądzie szybkiego wpisu (wydatek 0 zł /
  pusty); wpisz wydatek 25 zł „Jedzenie” – podgląd; zapisz; odczytaj ponownie; wydatek z datą wczoraj i z datą
  w przyszłości.
- **Oczekiwany efekt:** jedna liczba na trzech ekranach; podgląd = wynik po zapisie; wydatek wczorajszy rozkłada się na
  pozostałe dni; data w przyszłości i kategoria bez koperty – energia dziś bez zmian („poza kopertami”).
- **Nie przechodzi, gdy:** różnica choćby o grosz między ekranami albo podgląd ≠ wynik.
- **Odczyt liczb:** energia dziś na trzech ekranach przed i po.

#### PR.6 Energia w dymku zasobnika (spec „Okna i zasobnik”, T295)
- **Kto:** Maszyna · **Ryzyko:** średnie · **Stan danych:** rok.
- **Jak sprawdzić:** najedź na ikonę w zasobniku przed pierwszym wydatkiem dnia i po nim; Ctrl+$.
- **Oczekiwany efekt:** „Energia dziś: X zł (przydział Y − dziś Z)” od pierwszego wydatku; X = Mostek; ukryte kwoty –
  dymek bez kwot.
- **Nie przechodzi, gdy:** X ≠ Mostek albo dymek nieaktualny po wpisie.
- **Odczyt liczb:** X, Y, Z.

#### PR.7 Ta sama liczba na wszystkich ekranach (T218, T221, N22, N31)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok.
- **Jak sprawdzić:** porównaj: osłony (Mostek) i pierwsze „osłony po zdarzeniu” na Radarze przed pensją; cele (Mostek
  „Układy gwiezdne”, Mapa „w celach”); masa ładunku (Mostek, Ładownia); dług i należności (Mostek, Radar); przychody
  (Mostek, Plan); energia miesiąca (Mostek, Plan); zbiorniki (Mostek, Ładownia).
- **Oczekiwany efekt:** każda para identyczna co do grosza; masa ładunku z prawdziwą nazwą i kwotą („stałe koszty
  X/mies. · linia 40%”).
- **Nie przechodzi, gdy:** którakolwiek para się różni.
- **Odczyt liczb:** każda para.

#### PR.8 Raporty i eksport – te same liczby co Plan miesiąca (spec „Eksport”, D73, T178, T215, T294)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok; włączone ukrycie kwot (Ctrl+$) przy eksporcie.
- **Jak sprawdzić:** Raporty → Debriefing M-1 i M0; eksport „Miesiące” CSV i Excel; PDF debriefingu M-1; porównaj z Plan
  miesiąca → Debriefing.
- **Oczekiwany efekt:** koszty netto, energia, łupy, „na plus”, bilans paliwa i stopa oszczędności, sfinansowane przez
  domowników – identyczne; M0 – „w toku”; miesiące sprzed startu – łupy puste; eksport z prawdziwymi kwotami mimo
  ukrycia.
- **Nie przechodzi, gdy:** liczba w eksporcie lub raporcie ≠ ekran.
- **Odczyt liczb:** wszystkie kolumny M-1 i M0.

#### PR.9 Grosze i podział z resztą w ostatniej części (spec „Zasady”, T3, B26, B68)
- **Kto:** Claude · **Ryzyko:** wysokie · **Stan danych:** rok.
- **Jak sprawdzić:** zbierz podziały z LA.3, LA.4, MG.6, DM.11, DM.17; wpisz kwotę „12,345” i „1.200” w pole kwoty
  wydatku i kontenera; raty pożyczki jako ułamek.
- **Oczekiwany efekt:** suma części = całość; reszta zawsze w ostatniej części (103,37; 26,96; 33,34; 333,34); żadna
  kwota z ułamkiem grosza; więcej niż 2 miejsca po przecinku – komunikat albo odrzucenie, nigdy cicha zmiana kwoty;
  liczba rat tylko całkowita.
- **Nie przechodzi, gdy:** „1.200” zapisane po cichu jako 1,20 zł albo reszta w pierwszej części.
- **Odczyt liczb:** wszystkie części i sumy.

#### PR.10 Kwota 0 i duże kwoty (brak wymagania; T216, T226)
- **Kto:** Claude · **Ryzyko:** średnie · **Stan danych:** rok.
- **Jak sprawdzić:** pensja 0 w M+1; koperta 0 zł; cel 0; pożyczka 0; kontener 0; wydatek 1 000 000,00 zł z „Cofnij”;
  dostawa 999 999,99 zł.
- **Oczekiwany efekt:** pensja 0 – brak przydziału z komunikatem; koperta 0 – limit („nic na …”), przekroczenie bez
  „poważnego”; cel 0, pożyczka 0, kontener 0 – odrzucone z komunikatem; duże kwoty poprawnie sformatowane, bez
  przepełnienia i z poprawną sumą warstw; „Cofnij” przywraca liczby.
- **Nie przechodzi, gdy:** kwota 0 zapisuje się bez sensu albo duża kwota psuje układ lub sumę.
- **Odczyt liczb:** warstwy przed, po i po „Cofnij”.

#### PR.11 Liczby w czasie – przełom miesiąca (spec, D11, D18, T28)
- **Kto:** Maszyna · **Ryzyko:** wysokie · **Stan danych:** rok; zegar maszyny: ostatni dzień miesiąca 23:00 →
  1. dzień → 8. dzień.
- **Jak sprawdzić:** w każdym punkcie: Mostek (warstwy, suma kont, energia, łupy), Plan miesiąca (pensja, łupy),
  Meldunki.
- **Oczekiwany efekt:** 1. dnia: pensja wypłacona, energia = pensja − raty odkładek − raty celów, „Łupy · do podziału” =
  niewydana energia, debriefing z „na plus” albo bez; 8. dnia: łupy bez decyzji w osłonach; suma warstw = salda kont
  przez cały czas.
- **Nie przechodzi, gdy:** pensja nie wypłacona 1. dnia, łupy przepadają albo suma warstw ≠ salda kont.
- **Odczyt liczb:** warstwy w trzech chwilach.
