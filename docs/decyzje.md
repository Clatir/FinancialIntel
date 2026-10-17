# Financial Intel – decyzje

Decyzje użytkownika (D) z wywiadu i rund pomocniczych 15–16.10.2026 oraz decyzje techniczne (T) podjęte przez Claude.
Decyzji D nie zmieniaj bez pytania; nowe decyzje dopisuj na końcu z datą.

## Decyzje użytkownika

### Zakres i granica
- **D1** Nazwa: Financial Intel. Okręt nazywa użytkownik, domyślnie „Flagowiec”.
- **D2** Windows 11, kilka komputerów (nigdy jednocześnie), synchronizacja przez OneDrive. Bez wersji na iPhone'a.
- **D3** Zakres: budżet prywatny. Trading zostaje w ICTTJ. Słowo „firma” nie występuje (trading i „firma” to to samo).
- **D4** Cele aplikacji: spokój przy nieregularnych wypłatach, kontrola codziennych wydatków, budowa poduszki i celów,
  brak niespodzianek z opłatami. Kryteria sukcesu: wszystkie cztery z `specyfikacja.md`.
- **D5** Granica z ICTTJ: ICTTJ prowadzi trading, pule, rezerwę podatkową, wypłaty z XTB, zwroty do masy i prognozę;
  FI – wszystko po wypłacie. FI tylko czyta folder ICTTJ. Wydatki wpisuje się wyłącznie w FI.
- **D6** ICTTJ zostaje bez zmian („kieszeń” pul i realizacja celów w ICTTJ będą ignorowane).
- **D7** ~~Jedno konto tradingowe XTB = jeden okręt bojowy~~ – zastąpione przez D54 (16.10.2026).

### Pieniądze
- **D8** Trading: własne konto w XTB (polski broker, PIT-8C), wypłaty w PLN, nieregularnie. Bez ZUS i bez składek.
  Rezerwa na podatek nie w FI (prowadzi ją ICTTJ).
- **D9** Konta budżetu: mBank (import CSV + szybki wpis), Portfel XTB z kartą (tylko ręcznie, brak eksportu; zasilany
  z konta tradingowego – przelew do portfela to wypłata zapisywana w ICTTJ). Gotówki prawie brak – wypłata
  z bankomatu to wydatek.
- **D10** Podział wirtualny na jednym zbiorze kont (bez osobnych kont na warstwy).
- **D11** Pensja od siebie: stała kwota z bufora 1. dnia miesiąca.
- **D12** Kadłub (fundusz awaryjny): 6 miesięcy kosztów.
- **D13** Kolejność dokowania: osłony → kadłub → cele.
- **D14** Brak w osłonach na pensję: pensja z kadłuba + żółty alarm.
- **D15** Limit wydatków: dzienny przydział + koperty.
- **D16** Do dziennej energii liczą się tylko koperty codzienne; planowe mają limity miesięczne.
- **D17** Przekroczenie: alarm, przeliczenie kolejnych dni, przerwana seria.
- **D18** Niewydane z kopert: decyzja na debriefingu („podział łupów”), bez decyzji w 7 dni → osłony.
- **D19** Cele: kilka naraz z priorytetami; cele z prognozy ICTTJ (tylko odczyt) + własne w FI.
- **D20** Wpłaty domowników: przy każdej wybór (zwrot / przychód); przychód → osłony.
- **D21** Zakupy dla domu: oznaczenie „do zwrotu”, nie zjadają energii; jedna należność od domu (bez osób).
- **D22** Pożyczki prywatne w obie strony.
- **D23** Firewall: dopłata do XTB tylko z nadwyżki ponad pełne osłony i kadłub.
- **D24** Koszty stałe i jednorazowe dodawane w aplikacji (ładownia, odkładki).
- **D25** Kategorie: 8–10 głównych z podkategoriami.

### Codzienność i dane
- **D26** Wydatki poza domem: wieczorne dopisanie + import z mBanku co 2–3 dni.
- **D27** Import: CSV z mBanku + szybki wpis ręczny; na start cała dostępna historia.
- **D28** Edycja: pełna, z dziennikiem zmian.
- **D29** Eksport: CSV / Excel, PDF, pełna kopia danych.
- **D30** Dane bez szyfrowania (czytelne pliki jak ICTTJ); bez blokady; tryb ukrycia kwot.
- **D31** Kopie: automatyczne codzienne, 30 ostatnich (plus przed importem).
- **D32** Tylko jeden użytkownik.

### Wygląd i gra
- **D33** Styl: taki sam jak ICTTJ (makieta D). Kosmos w nazwach, ICT jako warstwa wywiadu (analizy).
- **D34** Nazwy: metafora + prawdziwa nazwa i kwota obok.
- **D35** Grywalizacja pełna: stopnie, klasy okrętu, osiągnięcia, dźwięki i animacje.
- **D36** Degradacja: po 3 poważnych naruszeniach w miesiącu.
- **D37** ~~Konto XTB w metaforze: osobny okręt bojowy we flocie~~ – zastąpione przez D54 (16.10.2026).
- **D38** Tygodniowe misje.
- **D39** Smaczki: „Miesiąc zamknięty na plus”, ukryte osiągnięcia, easter eggi ICT, dużo nawiązań do tradingu i ICT.
- **D40** Cisza nocna z potwierdzeniem.
- **D41** Próg dziennika kapitańskiego („plan czy impuls”): w ustawieniach, domyślnie 200 zł.
- **D42** Animacje przy zdarzeniach; dźwięki do wyboru w ustawieniach.
- **D43** Język: polski.

### Windows i system
- **D44** Układ: mostek z panelami i **menu boczne** (potwierdzone 16.10.2026; inaczej niż pasek u góry w ICTTJ).
- **D45** Kilka monitorów (panele odłączane jak w ICTTJ).
- **D46** Ikona w zasobniku; start z Windows w zasobniku; globalny skrót szybkiego wpisu (do zmiany).
- **D47** Powiadomienia: osobna sekcja z włączaniem i wyłączaniem każdego.
- **D48** Raporty: odprawa poranna, raport wachty, debriefing miesięczny, przegląd roczny. Wykresy: krzywa majątku
  z drawdownem, wydatki per kategoria w czasie, heatmapa godzin i dni, prognoza zasięgu. Bilans tradingu usunięty
  (D57).
- **D49** Odprawa czytana głosem – opcjonalnie.

### Budowa
- **D50** Windows 11; ICTTJ jest w Electronie; build przez GitHub Actions; instalator + auto-aktualizacje.
- **D51** MVP: rdzeń + klimat (E0–E4); małe etapy, każdy kończy się działającym .exe.
- **D52** Automatyczne testy obliczeń; Claude decyduje technicznie, użytkownik testuje.
- **D53** Asystent AI później, jako osobny etap.

### Punkty styku z ICTTJ (przegląd 16.10.2026)
- **D54** Konto tradingowe (maklerskie) XTB nie jest częścią FI – wyłącznie ICTTJ. Bez okrętu bojowego i bez etapu
  „Okręt bojowy”. Portfel XTB (konto bankowe z kartą) zostaje kontem budżetu.
- **D55** Wypłata z konta tradingowego: FI dowiaduje się z wpisu w ICTTJ i dopasowuje go do mBanku albo Portfela XTB.
  Pula decyduje o miejscu: Cele → cele, Podatek → poza budżetem, reszta → zwykłe dokowanie.
- **D56** Wypłata z ICTTJ bez pary w CSV z mBanku przez 3 dni → Portfel XTB (potwierdzenie przy dokowaniu). Wpływ z XTB
  w mBanku bez wpisu w ICTTJ → dokuje + przypomnienie o wpisie w ICTTJ.
- **D57** Kosztów tradingu nie zakładamy (brak kategorii Trading); bilans tradingu usunięty.
- **D58** Pule i rezerwa ICTTJ w FI: tylko przypomnienie o terminie PIT-38, bez kwoty.
- **D59** Firewall dopłat z budżetu do konta tradingowego zostaje (wykrywany z mBanku i z wpisów ICTTJ).
- **D60** Odczyt folderu ICTTJ automatyczny, z obserwacją zmian; integracja w E5, po wydaniu 1.0; moduły ICTTJ
  kopiowane i dostosowane; przycisk „Otwórz ICTTJ” w FI.

### Przed etapem E0 (16.10.2026)
- **D61** Repozytorium `Clatir/FinancialIntel` zostaje **publiczne** (zastępuje „prywatne” w T13 i w specyfikacji).
  Aktualizacje działają bez tokena; pole tokena w Ustawieniach → Aktualizacje zostaje na wypadek zmiany na prywatne.
  Danych użytkownika nigdy nie ma w repozytorium (pliki przykładowe tylko zanonimizowane, `tests/fixtures/`).
- **D62** Domyślny folder danych: `%OneDrive%\FinancialIntel` (bez OneDrive: `Dokumenty\FinancialIntel`), pokazany przy
  pierwszym uruchomieniu jako propozycja „jednym kliknięciem”; można wskazać inny folder albo istniejący.
- **D63** Praca etapami na gałęzi i PR do `main`; wersje: E0 = 0.1.0, E1 = 0.2.0 … E4 = 1.0.0, każda jako zwykłe wydanie
  (aktualizacja między etapami działa sama).
- **D64** Zamknięcie okna (X) chowa aplikację do zasobnika (powiadomienia w tle), „Zakończ” w menu ikony; przy pierwszym
  ukryciu dymek. Start z Windows: przełącznik w ustawieniach, domyślnie wyłączony – włącza go kreator startu (E3).
- **D65** Menu boczne pokazuje wszystkie ekrany; ekrany po wydaniu 1.0 (E5+) przygaszone z dopiskiem etapu.
- **D66** Ikona generowana skryptem (`scripts/make-icon.mjs`): radar i okręt w kolorze akcentu `#e8a33d` na `#0b0d10`.
- **D67** (16.10.2026) Po każdym kroku zaktualizowana tabela postępu z modelem i thinking z górką i szacowanym czasem
  pracy Claude'a; bez komendy użytkownika nie zaczyna się kolejnego etapu; etapy, które mogą iść jednym ciągiem, są
  zgrupowane (A: E1 [+ E2], B: E3 + E4, C: E5 + E6, D: E7 + E8, E: E9) – w grupie bez pauzy, jeden PR i jedno wydanie.

### Przed etapem E1 (17.10.2026)
- **D68** Odpowiedzi na „Przed etapem E1” (wszystko zgodnie z propozycją):
  - kategorie startowe: Jedzenie (zakupy spożywcze, na mieście, kawa i przekąski), Dom (czynsz i opłaty, media,
    wyposażenie, chemia), Auto (paliwo, serwis, ubezpieczenie, parking i opłaty), Zwierzęta (karma, weterynarz,
    akcesoria), Zdrowie (leki, lekarz, sport), Rozrywka i hobby (wyjścia, hobby, podróże), Subskrypcje i łączność
    (telefon, internet, streaming, aplikacje), Osobiste (ubrania, kosmetyki, fryzjer), Prezenty i inne (prezenty,
    inne) + systemowa „Gotówka” (wypłata z bankomatu); codzienne: Jedzenie, Rozrywka i hobby, Osobiste, Gotówka;
  - konta startowe: mBank i Portfel XTB (nazwy do zmiany), saldo otwarcia z datą w Ustawienia → Konta (rekord
    `balances/`); pełny kreator startu w E3;
  - kwoty na liście operacji: wpływy zielone z „+”, wydatki bez koloru z „−”, zwrot towaru zielony; czerwień tylko
    dla przekroczeń i alarmów;
  - grupa A = E1 + E2 jednym ciągiem (CSV z mBanku dostarczony); E1 i E2 robione od zera na modelu z thinking max;
  - kategorie mBanku w CSV nie zawsze są trafne – najwyżej słaba podpowiedź, nigdy wpisywana sama.

## Decyzje techniczne (Claude)
- **T1** Stos jak ICTTJ, wersje z jego `package.json`; bez natywnych modułów Node.
- **T2** Dane: jeden plik JSON na rekord (układ jak ICTTJ), moduły folderu danych przeniesione z ICTTJ.
- **T3** Kwoty w groszach (liczby całkowite); podziały z resztą w ostatniej części.
- **T4** Stany warstw liczone czystą funkcją `shared/calc/fleet.ts`, nigdy zapisywane.
- **T5** Moduły z ICTTJ kopiowane i dostosowane, bez wspólnej biblioteki – niezależne wydania obu aplikacji.
- **T6** Dźwięki syntezowane (WebAudio), bez plików.
- **T7** Odsłuch: Web Speech API; brak polskiego głosu w systemie → przycisk ukryty + podpowiedź o pakiecie mowy.
- **T8** Globalny skrót: Electron `globalShortcut`; zajęty skrót → komunikat i wybór innego.
- **T9** Ocena dnia zamyka się 24 h po końcu dnia, potem jest zamrożona.
- **T10** Klasy okrętu wg zasięgu: < 1, 1–3, 3–6, 6–9, 9–12, ≥ 12 miesięcy.
- **T11** Daily Bias: reguła z `specyfikacja.md` (Bullish / Neutral / Bearish wg energii i osłon).
- **T12** Ustawienia komputera w `userData/config.json`; ścieżka ICTTJ per komputer.
- **T13** Repozytorium `Clatir/FinancialIntel` (publiczne – D61), `appId` `app.financialintel.desktop`, pliki
  `Financial-Intel-Setup.exe` i `Financial-Intel-portable.exe`.
- **T14** Odczyt ICTTJ tolerancyjny (`z.looseObject`), nowszy format = ostrzeżenie.
- **T15** Dokowanie idempotentne: rekord `dockings/*` ze źródłem (`ictjEntryId` albo skrót wiersza CSV).
- **T16** Osłony poniżej minimum liczą się jako poważne naruszenie tylko z decyzji użytkownika, nie przez wypłatę
  pensji (spójnie z D14).
- **T17** (E0) Kod przeniesiony z ICTTJ @ 84a8339 (gałąź domyślna ICTTJ, wersja 1.20.0); każdy plik z komentarzem
  `adapted from ICTTJ …`. Bez osobnej aplikacji Beta, kanałów wersji testowych, danych demo, OCR, EODHD i skanera.
- **T18** Układ folderu: kolekcje z jednym z trzech układów plików (`paths.ts` `LAYOUTS`): `dated`
  (`<kolekcja>/RRRR/RRRR-MM-DD_ULID.json`, pole `date` – zmiana daty przenosi plik), `id` (`<kolekcja>/ULID.json`),
  `month` (`<kolekcja>/RRRR-MM.json`, pole `month`). Plik ustawień `fi.json` = rodzaj `fi`. Magazyn (`DataStore`),
  historia, konflikty i scalanie są ogólne – nowa kolekcja to wpis w `COLLECTIONS` / `LAYOUTS` i schemat.
- **T19** E0: schematy rekordów tymczasowe (pola wspólne + `date` / `month`, `z.looseObject`); pełne schematy w E1.
  `SCHEMA_VERSION` = 1.
- **T20** Kopie zapasowe: przy starcie raz dziennie ZIP całego folderu (bez `backups/`, `.history/`, `.presence/`),
  30 ostatnich; ręczne (5 ostatnich); przed migracją formatu. Bez kopii tygodniowej ICTTJ (folder FI jest mały, bez
  screenów). Kopia przed importem – w E2.
- **T21** Skróty: Ctrl+1…0 = ekrany w kolejności menu (po pozycji klawisza), Ctrl+K paleta, Ctrl+, ustawienia,
  Ctrl+Shift+Y synchronizacja, F1 / ? ściąga. Zmienne testowe `FI_*` zamiast `ICTJ_*` (lista w `CLAUDE.md`).
- **T22** Preload wystawia `window.fi` (kanały IPC `fi:*`); okno renderera: contextIsolation, sandbox, CSP bez
  zewnętrznych źródeł (bez protokołu plików – FI nie ma screenów).
- **T23** CI: Linux (Node 22.12 / 24 / 26, typecheck, testy, build) + E2E na Linuksie pod Xvfb przy każdym wypchnięciu;
  Windows (build-windows.cmd, smoke, test aktualizacji portable i instalatora, wydanie) dla PR, gałęzi domyślnej i ręcznie.

### E1 – model i silnik (17.10.2026)
- **T24** Wydatek opłacony z pieniędzy celu (`goalId`) nie jest miesięcznym kosztem netto (nie podnosi celu kadłuba
  ani nie skraca zasięgu); płaci go cel, brak w celu – osłony.
- **T25** Start warstw: `settings.budget.start` (kreator E3), inaczej najwcześniejsze saldo otwarcia; historia sprzed
  startu służy tylko statystykom. Saldo otwarcia = na początek swojego dnia, potwierdzenie salda = na koniec dnia
  (`shared/calc/balances.ts`); konto otwarte po starcie wpływa do osłon w dniu otwarcia.
- **T26** Dokowanie bez rekordu = kolejność domyślna liczona przez silnik w chwili wpływu (cele warstw z planu
  miesiąca – brak planu = ostatni wcześniejszy – i średnich kosztów sprzed miesiąca); rekord `dockings/*` tylko dla
  zmienionego podziału albo wpisu ICTTJ (pula). Nieznany cel osłon (brak pensji) albo kadłuba (brak kosztów) →
  pieniądze zostają w osłonach.
- **T27** Średnie koszty netto: pełne miesiące kalendarzowe (od pierwszego w całości objętego danymi), ostatnie 12;
  przy mniej niż 3 pełnych miesiącach – `layers.assumedCosts`, jeśli ustawione. Średnie wpływy (ostrzeżenie o pensji):
  6 pełnych miesięcy, wpływy = przychody bez zwrotów należności + wypłaty z XTB.
- **T28** Energia = pieniądze pensji miesiąca; wydatek ponad nią idzie z osłon (czerwony alarm „energia
  wyczerpana”); bez pensji (brak planu) wydatki idą prosto z osłon. Niewydana energia na koniec miesiąca = łupy:
  decyzja w planie miesiąca (`loot`) do 7. dnia, inaczej 8. dnia do osłon; część „na następny miesiąc” powiększa
  koperty codzienne.
- **T29** Odkładki: rata = plan (kwota opłaty równo na miesiące cyklu, reszta w ostatnim – 11 × 103,33 + 103,37) plus
  równa część braku zbiornika wobec planu (opłata dodana późno) albo minus część nadwyżki; opłata idzie ze zbiornika,
  brak – z energii (żółty alarm).
- **T30** Energia dziś = (koperty codzienne − wydatki codzienne przed dziś) / dni do końca miesiąca z dzisiejszym,
  w dół do grosza; wydatek bez kategorii liczy się jako codzienny (ostrożnie), płatności kontenerów i z celów nie.
- **T31** Przelew własny, korekta salda, pożyczka zaciągnięta zmieniają tylko osłony (para przelewów między kontami
  budżetu się znosi); dopłata do XTB idzie z osłon, a gdy osłony po dopłacie byłyby poniżej celu albo kadłub nie jest
  pełny – czerwony alarm „firewall” (przy włączonym rozkazie).
- **T32** Brakujące pieniądze (wydatek ponad energię, do zwrotu, dopłata do XTB): osłony → kadłub → osłony poniżej
  zera (deficyt, czerwony alarm). Cele nigdy nie są ruszane same.
- **T33** Pozycje ustawień z wartością ze znanego zbioru (rodzaj konta, format importu, koperta, kategoria
  systemowa, rodzaj / tryb / kierunek reguły importu) przyjmują dowolny tekst: starsza wersja na drugim komputerze
  zachowuje wartość wpisaną przez nowszą; nieznana wartość = brak. Pozycja bez id albo nazwy jest pomijana.
- **T34** Pola edytowane jako szkic (kwota, data, godzina, nazwy) zapisują się po wyjściu z pola; zmiana ekranu,
  wybór innego wpisu i `flushSaves` najpierw zdejmują fokus z pola (`commitActiveField`) – wpisana wartość nie ginie.
