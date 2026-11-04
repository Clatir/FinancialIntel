# Reguły liczenia z wymagań – lista kontrolna dla wyroczni (AU-9)

Zebrane przez autorów punktów (AU-1) ze specyfikacji, decyzji D… i T… – **nie z kodu**. Wyrocznia (AU-9, Opus · max)
sprawdza każdą regułę sama w `docs/specyfikacja.md` i `docs/decyzje.md` i dopiero wtedy liczy; tam, gdzie wymagania są
sprzeczne, liczy oba warianty i zapisuje sprzeczność (lista na końcu).

## Pieniądze
1. **Kwoty:** grosze w liczbach całkowitych; części w dół, reszta w ostatniej (T3). Suma warstw = salda kont (spec, T4):
   osłony, energia, kadłub, cele, zbiorniki odkładek, rezerwa podatku, depozyt domowników (łupy – do ustalenia).
2. **Kolejność dokowania:** osłony do 3 × pensja → kadłub do 6 × średnie koszty netto z 12 pełnych miesięcy → cele
   według priorytetów, każdy do kwoty → reszta w osłonach; „wolne do decyzji” tylko przy pełnym kadłubie (D13, T181);
   nieznany cel osłon / kadłuba → wszystko w osłonach (T26).
3. **Pule ICTTJ:** Cele – prosto do celów, najpierw cele ICTTJ, potem własne, nadmiar do osłon (D72, T65); Podatek – poza
   budżetem, nie przychód ani koszt; przy zmienionym podziale podatkiem jest tylko część z podziału (D55, D58, T119,
   T224); zwrot z puli Podatek wraca z rezerwy, bez firewalla (T65).
4. **Parowanie z bankiem:** okno od 3 dni przed wpisem do 3 dni roboczych po nim (bez weekendów i świąt PL; T63, T164);
   bez pary po oknie i z importem obejmującym dni po oknie → propozycja Portfela XTB z potwierdzeniem (D56, T162);
   „inna kwota”: różnica ≤ max(5 zł, 1 %), do 4 dni po oknie, liczy się kwota z banku (T162, T176); wpis sprzed startu
   rozstrzyga data pieniędzy w banku. **Od 1.15.6 (T341, D99 pkt 2):** para niezadokowana liczy się od razu jak dokowanie
   z pulą wpisu (Cele → cele, Podatek → rezerwa i poza przychodem, zwrot z puli Podatek z rezerwy bez firewalla); rekord
   dokowania decyduje nad parą; „Do zadokowania” – ile, wpływ, wypływ, część w celach (T342).
5. **Pensja 1. dnia:** z osłon; brak → z kadłuba (żółty alarm); dalej brak → częściowa (czerwony) (D11, D14). Pierwszy
   miesiąc: pensja − koszty netto dni przed startem, bez opłat okresowych (T45, T220).
6. **Energia i przydział:** energia = pensja − raty odkładek − raty celów + łupy „na następny miesiąc”; wydatek ponad
   energię z osłon, potem z kadłuba, potem deficyt, nigdy z celów (T28, T32, T178). Przydział dziś = (koperty codzienne
   + łupy − wydatki codzienne przed dziś) / dni do końca miesiąca z dziś, w dół do grosza; bez kategorii = codzienny;
   ładownia, wydatki z celu i zakupy domowników – nie. Energia dziś = przydział − wydane dziś (T30, T180, T295).
   Podstawowy przydział = (koperty codzienne + łupy) / dni miesiąca.
7. **Koszty netto:** wydatki − zwroty towarów, bez przelewów własnych, dopłat do XTB, zakupów domowników, PIT-38 z rezerwy
   i wydatków z celu (spec, T24); średnie z pełnych miesięcy od pierwszego pełnego z banku, ostatnie 12, bez luk i bez
   bieżącego; < 3 pełne miesiące – koszty przyjęte (T27, T173). Propozycja pensji: średnia 6 miesięcy w górę do 100 zł;
   koperty: średnia 3 miesięcy do 10 zł (kierunek niejasny – D70).
8. **Przychody:** praca bez przelewów własnych, spłat i zaliczek domowników, spłat pożyczek; trading = wypłaty − dopłaty
   bez puli Podatek, miesiąc nie poniżej 0; średnie 3 / 6 / 12, mediana z 12; ostrzeżenie, gdy pensja > średnia
   6 miesięcy „Razem” (D81, T119, T120, T186).
9. **Zasięg i klasa:** zasięg = max(0, osłony + kadłub − dług) / średnie koszty, napis obcięty do 0,1 (T71, T218); progi
   klas 1 / 3 / 6 / 9 / 12 miesięcy, wartość na progu należy do wyższej klasy (T10).
10. **Odkładki:** rata = kwota / miesiące cyklu w dół, reszta w miesiącu terminu, plus równa część braku zbiornika na
    pozostałe miesiące (T29); kontener dodany w trakcie zbiera od bieżącego miesiąca; zapłata przed terminem zamyka cykl;
    resztka po końcu życia → osłony (T135, T136); harmonogram: cykl = odstęp między miesiącami, waga = kwota × liczba
    miesięcy / 12; rachunek zmienny = 75. percentyl roku w górę do zł (T286, T284); kwota w miesiącu według historii kwot
    (T283); masa ładunku = suma wag miesięcznych / pensja, linia 40 %. **Od 1.15.6:** płatność sprzed startu zamyka swój cykl
    (T345); plan następnych miesięcy od stanu silnika teraz, bez pensji nic pobrane, wymagana obok (T346); rata pożyczki
    z harmonogramu w historii kwot (T347); kontener z `from` null – bez dolnej granicy (schemat). **Od 1.15.7:** który
    termin płaci płatność – jedna reguła stanu Ładowni (okna T375, zaległa najpierw, terminy budżetu od dnia startu –
    T393, T394); płatności opłaty – części wydatku z kontenerem, jedna na operację, także z celu i „do zwrotu” (rachunek
    zapłacony, zbiornik nietknięty), inny rodzaj z kontenerem nigdy (T393 po scaleniu N2 z N3, T362).
11. **Łupy:** = niewydana energia (T28; spec: „niewydane z kopert”); decyzja do 7. dnia: cele → zapas kopert planowych →
    następny miesiąc → reszta do osłon; bez decyzji do osłon 8. dnia (D18, T52, T278); późna zmiana danych: cele
    i następny miesiąc zostają, zmienia się reszta (T139).
12. **„Na plus”:** wynik energii ≥ 0 (T178, D86) – spec: koszty netto ≤ pensja; czerwony alarm koperty od 20 %; limit 0 zł
    bez naruszenia poważnego (T216); pokrycie przesuwa limity (T279).
13. **Cele:** pieniądze zostają tam, gdzie trafiły; zmiany od chwili zmiany (T128); przeniesienie = min(kwota, stan)
    w chwili `at` wśród zdarzeń dnia – przed pierwszym, które przyszło do FI później, czego cel wtedy nie ma – na koniec
    dnia (**T340**, od 1.15.6 zamiast „na koniec dnia” z T129); wydatek z celu – cel płaci, ile ma, resztę osłony (T131); tempo = średnia wpłat do celów z ostatnich pełnych
    miesięcy (do 6), bez środków na start; rata do terminu = brak / liczba miesięcy w dół, reszta w ostatniej; rata
    z pensji tylko przy pełnych osłonach i kadłubie na przełomie miesiąca (T272).
14. **Domownicy:** zakup finansowany – najpierw z zaliczki osoby, resztę pożyczają osłony; wpłata spłaca najwyżej to, co
    osoba ma oddać (wskazane zakupy; bez wskazania – „do przypisania”), reszta zaliczka albo przychód; wcześniejsza wpłata
    rezerwuje kwotę na wskazany późniejszy zakup; wspólny zakup równo z resztą w ostatniej części; prezent – z zaliczki,
    resztę osłony; przed datą rozliczeń salda na start, przelewy domowników nie są przychodem; przypomnienie po 30 dniach
    od najstarszego otwartego zakupu (D80, D81, D83, D91, D94, T105–T107, T115, T304, T312). Sprzeczność: 1.15.3
    („niezależne wpłaty”, `inflowKind`) – patrz `raport/0-przygotowanie.md` P.3. **Rozstrzygnięte (D99 pkt 1, T350):**
    „spłata” (i „reszta jako zaliczka”) najpierw spłaca, jawny przychód / zaliczka na przyszłość wskazujące zakupy tej
    osoby spłacają tylko je (późniejsze – rezerwacja D94), bez wskazania omijają dług (meldunek T352); przy osobie naraz
    dług i zaliczka (T354); operacje domowników sprzed rozliczeń spoza `openingIds` – zaraz po saldach na start (T159).
15. **Pożyczki:** udzielona – wypływ z osłon, spłaty do osłon do wysokości długu (także sprzed startu), nadwyżka to przychód,
    zaległa po 3 dniach; spłata częścią dowolnej wpłaty – linia `loanId` (D100, T355, T356 – kto zapłacił);
    wzięta – kwota do osłon, dług = suma harmonogramu, raty w ładowni; harmonogram z resztą w ostatniej racie, w krótkim
    miesiącu jego ostatni dzień (D72, T70–T72, T174).
16. **Firewall:** dopłata do XTB tylko gdy osłony po dopłacie ≥ celu i kadłub pełny; inaczej czerwony alarm i poważne
    naruszenie (D23, D59, T31).
17. **Radar:** okno D…D+90; pensja z planu w mocy; osłony po zdarzeniach (T275); salda kont naprzód (T274, przelew w górę
    do pełnych zł); PIT-38 30.04, widoczny od 1.02, bez kwoty.

## Gra
18. **Ocena dnia:** od `game.start` (pierwszy pełny dzień po kreatorze; T76, T220) do D−2 (T9); stan na koniec dnia
    warszawskiego, dane znane w chwili zamrożenia; dzień bez wpisów zgodny (D73, T75); dzień z niezadokowaną parą ICTTJ
    czeka najwyżej 7 dni (T163).
19. **Naruszenia zwykłe** (przerywają serię): energia dziś < 0 na koniec dnia; koperta planowa ponad limit do progu;
    ładownia ponad linię po wzroście masy wobec poprzedniego zamrożonego dnia (zmiana nazwy się nie liczy; T75, T227).
20. **Naruszenia poważne:** koperta planowa > limit × 1,2 (koperta 0 zł – tylko zwykłe; T216); osłony na koniec dnia
    < min(minimum, cel osłon) × pensja, gdy decyzje dnia netto zabrały z osłon i kadłuba (bez pensji, korekt, PIT-38,
    własnych rat, części domowników; T16, T75, T161, T219); alarm firewalla (T31); potwierdzony zakup nocny – godzina
    w ciszy nocnej + wpis w dzienniku, tylko część własna (T187, T161; N-PC-19 wyłącza „plan” i kontenery – sprzeczność
    ze spec); zakup finansowany przez domownika nigdy (D80 f); dzień oceniany limitami sprzed pokrycia z tego dnia (T279).
21. **Seria, awans, degradacja:** seria = kolejne zamrożone dni zgodne, rekord = najdłuższa; awans, gdy dni zgodne
    w ostatnich 35 (od dnia po ostatniej zmianie stopnia) + 3 × wykonane misje z niedzielą w oknie ≥ 30; kolejność
    Kadet → Chorąży → Porucznik → Komandor → Kapitan → Admirał, licznik od nowa (D73, T77); degradacja w dniu poważnego
    naruszenia, które daje 3. w miesiącu od ostatniej zmiany; Kadet nie spada; zmiany stopnia nie są przeliczane wstecz
    (D36, T77).
22. **Klasa:** świętowanie tylko powyżej najwyższej klasy z ostatnich 30 dni (T227; D84 C10: raz w miesiącu na klasę –
    sprzeczność).
23. **Misje:** tydzień ISO, jedna misja z 4 tygodni przed poniedziałkiem, inna niż w zeszłym tygodniu; kolejność słabych
    punktów (T78): zakupy nocne, koperta planowa ponad tempo, ≥ 2 przekroczenia przydziału, ≥ 2 impulsy, killzone,
    należność domownika > 14 dni, import > 4 dni, brak potwierdzeń sald, < 4 dni bez wydatków; warunki misji
    w `docs/archiwum/postep-do-1.15.md` „Przed etapem E7” (D73); rozliczenie po zamrożeniu niedzieli.
24. **Osiągnięcia i smaczki:** 13 osiągnięć („Przed etapem E7”, T79) – stanowe w dniu spełnienia, Hat-trick i Snajper
    po zamrożeniu 1. dnia miesiąca, każde raz; Judas Swing = impuls (część własna), Turtle Soup = zwrot towaru,
    sweep = energia dokładnie 0 zł, nospend = potwierdzony dzień bez kosztu (T210).

## Analizy
25. Daily Bias (spec, T57, T216 – pierwszeństwo warunków nieustalone); krzywa (T81); majątek netto (T293); bilans paliwa
    (T294); kurs (T276); FVG = limit − wydane, łupy w puli codziennej (T180, T215); trafność dziennika = plan / (plan +
    impuls) (T82); prognoza zasięgu = osłony + kadłub − dług pomniejszane o średnie koszty (T82).

## Sprzeczności do rozstrzygnięcia przez użytkownika (wyrocznia liczy oba warianty)
- Zasięg w przykładzie spec „6,5 → 7,8” vs obcięcie T218 (6,4).
- „Na plus”: spec (koszty ≤ pensja) vs T178 (energia ≥ 0).
- Łupy: spec „niewydane z kopert” vs T28 „niewydana energia”.
- Wpłata domownika: spec / D80 b / D91 (najpierw spłata) vs 1.15.3 (`inflowKind`: spłata / przychód / depozyt).
- Zakup nocny „plan”: spec (każdy potwierdzony = poważne) vs N-PC-19.
- „Energia dziś”: spec (przydział) vs T295 (przydział − wydane dziś).
- Daily Bias: pierwszeństwo Bullish / Bearish, chwila liczenia (przed / po dzisiejszych wydatkach).
