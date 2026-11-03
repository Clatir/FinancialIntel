# Weryfikacja sceptyczna W4 (AU-11, krok 3) – znaleziska S: Dowództwo, Wywiad, rytuały, raporty, Ustawienia, interfejs, dane

- Data: 03.11.2026, 20:30–21:30 (zegar prawdziwy, Warszawa); weryfikator W4 (Opus 5.5 · xhigh); wersja 1.15.4 z GitHub
  Releases (`C:\FI-audyt\wydanie\1.15.4`, uruchamiana przez `tests/audyt/lab.ts` jako portable).
- Stany: `rok` (persona odnowiona 03.11 ok. 15:17), `rok-ab` (tylko DW.29 – drugi przebieg), `start` (IN.26); stany
  szczególne na kopiach – opis przy znalezisku. Każdy przebieg na świeżej kopii, stany w `C:\FI-audyt\stany` nietknięte.
- Skrypty: `tests/audyt/w4-a.spec.ts`, `tests/audyt/w4-b.spec.ts`; przebiegi `C:\FI-audyt\przebiegi\w4-*` (teksty ekranów
  w `out\`), zrzuty `C:\FI-audyt\zrzuty\W4-*.png`, odczyt `C:\FI-audyt\odczyty\w4.jsonl` (WY.20). Kolejność: najpierw
  odtworzenie w aplikacji, potem kod `src\` (tylko odczyt).

| Znalezisko | Werdykt | Waga przed | Waga po | Przyczyna (plik:linia) | Poprawka |
| --- | --- | --- | --- | --- | --- |
| DW.29 | POTWIERDZONE | S | S | `shared/calc/game.ts:515` – liczy potwierdzenia po dacie salda (`b.date`), nie po dniu czynności | S |
| WY.19 | POTWIERDZONE (inny mechanizm) | S | S | `shared/calc/course.ts:155–176` (koszty z pustych osłon pod zero), `:205–215` (brak miesięcy z pensją częściową) | S |
| WY.20 (= PR.3, C19, R-15) | POTWIERDZONE (inny mechanizm) | S | S | `shared/calc/course.ts:139–145` + `renderer/features/intel/Course.tsx:39–45` – „teraz” po resztkach miesiąca (boje, zaległe spłaty) | S |
| RY.24 (= R-19) | POTWIERDZONE | S | N | `shared/calc/intel.ts:363` (zawsze 12 miesięcy), `renderer/features/reports/ReportsPage.tsx:440` (stały podpis) | S |
| RE.5 | ODRZUCONE | S | – | zgodne z D89 i T303 (jeden wiersz, opisy części w „Notatce”) | – (AP) |
| RE.15 | POTWIERDZONE | S | N | `renderer/features/reports/ReportsPage.tsx:502–507, 520` – okres bez kontroli | S |
| US.6 | POTWIERDZONE | S | S | `renderer/features/settings/CategoriesTab.tsx:111–115` – funkcji N-PC-7 nie ma w kodzie | M |
| US.32 | POTWIERDZONE | S | S | `renderer/components/ui.tsx:115–122` (`NumberField` bez Esc), `:106–113` (zapis przy wyjściu) | S |
| IN.4 (= DA.39) | POTWIERDZONE | S | N | `renderer/store/data.ts:1232–1246` – `saveNow` bez sprawdzenia trybu tylko do odczytu | S |
| IN.26 | POTWIERDZONE | S | N | `main/update/updater.ts:148`, `renderer/features/settings/UpdatesTab.tsx:172–176, 245` | S |
| DA.3 | ODRZUCONE | S | – | zgodne z T248 / T192 / B53 (ponawianie co 30 s tylko dla nieczytelnego fi.json) | – (AP) |
| DA.41 | POTWIERDZONE | S | S | `main/datastore/store.ts:1356–1362` – brak pliku = „usunięty na innym komputerze” bez sprawdzenia folderu (przyczyna DA.40, K) | M (razem z DA.40) |

Razem: POTWIERDZONE 10 (S 6, N 4), ODRZUCONE 2, WYMAGANIE 0. Bez K i W. Dwa znaleziska (WY.19, WY.20) potwierdzone z innym
mechanizmem niż w raportach obszarów i w wyroczni – opisy niżej. Migracji ani naprawy danych użytkownika nie wymaga żadne.

---

## DW.29 – POTWIERDZONE (S)

**Odtworzenie.** Przebiegi `w4-dw29-rok` (stan `rok`) i `w4-dw29-rok-ab` (stan `rok-ab`), misja W45 w
`game/2026-11.json` podmieniona na `balances` („Inwentaryzacja”), import `C:\FI-audyt\pliki\rok-nowe-historia.csv`
(Ctrl+3, „Za okres” 27.10–02.11, ostatni wiersz 01.11, saldo końcowe 72 073,56 zł) na mBank.
- Przed: „Inwentaryzacja | Potwierdź salda wszystkich kont. | Na razie: 0 z 3”.
- Po imporcie („Nowe: 8 · połączone z wpisami: 2”): „Na razie: 0 z 3”, a w folderze nowe potwierdzenie
  `2026-11-01 mBank 72 073,56 zł (zapis 2026-11-03T19:39:59Z)`; odprawa na Mostku przestała prosić o saldo mBanku (zostało
  tylko „Portfel XTB: potwierdź saldo z bankiem (raz w tygodniu).”).
- Ten sam wynik na obu stanach – nie zależy od gry zamrożonej przed importem (`rok-ab`).
- Zrzuty: W4-DW.29-rok-po-imporcie.png, W4-DW.29-rok-ab-po-imporcie.png.

**Przyczyna.** `shared/calc/game.ts:513–516` – misja liczy konto jako potwierdzone, gdy ma potwierdzenie z **datą salda**
w tygodniu misji (`b.date >= monday`). Potwierdzenie z pliku banku dostaje datę ostatniego dnia pliku (T-decyzja przy
imporcie: „potwierdzenie z datą ostatniego dnia pliku … Misja „Inwentaryzacja” liczy je jak każde potwierdzenie”). Import
we wtorek pliku kończącego się w niedzielę (typowy rytm „import co 2–3 dni”) nigdy nie zalicza misji, choć czynność
kapitana była w tym tygodniu – wbrew D84 C11 („potwierdzenie salda z pliku banku zalicza misję „Inwentaryzacja” tylko dla
mBanku”). Dla porównania misja „Łączność z bazą” (`game.ts:510`) liczy po chwili importu.

**Poprawka i test.** S: potwierdzenie liczy się, gdy dzień jego zapisu (`createdAt`, data warszawska) **albo** data salda
jest w tygodniu misji. Test unit (`tests/unit/game.test.ts`): misja `balances` z potwierdzeniem dnia D−1 (niedziela)
zapisanym we wtorek → `have` 1; dziś pada. Bez migracji (rozliczone misje są zamrożone).

**Uwagi.** Część N z DW.md („Dziś bez wydatków” nie zmienia „1 z 2 (+1, jeśli dziś bez wydatków)”) – poza moją listą;
z kodu (`game.ts:519–528`, N69) dzień bieżący liczy się dopiero po zamrożeniu, a status już mówi „+1, jeśli dziś bez
wydatków” – raczej zgodne z N69 niż błąd (nieodtwarzane).

## WY.19 – POTWIERDZONE (S), mechanizm inny niż w WY.md

**Odtworzenie.** Przebieg `w4-brzegi`: `seedFolder` jak `wy-5-brzegi` (start 01.08.2026, osłony 6 000 zł, kadłub 0,
minimum osłon 1 pensja, pensja 4 000 zł, wpływ 3 000 zł i koszty 4 800 zł miesięcznie, 02.11 wydatek 300 zł).
- Mostek: „Pensja częściowa: brakuje 3 400,00 zł – osłony (bufor na pensje) i kadłub (fundusz awaryjny) puste.”
- Wywiad → „Kurs na 12 miesięcy” (wszystkie trzy kursy po 3 000 zł/mies.): „Poniżej minimum osłon 12.2026 … 11.2027”,
  „Pensja z kadłuba nie nie nie”, tabela „gru 26 −1 800,00 · 0,00”, „sty 27 −3 600,00 · 0,00” … „lis 27 −21 600,00 ·
  0,00”; dopisek „Pensja z osłon 1. dnia, koszty po średniej (nad pensję – z osłon) …”. Bez NaN i Infinity.
- Zrzut: W4-WY.19-kurs.png.

**Przyczyna.** WY.md pisze o „pełnej pensji co miesiąc z pustych osłon” – to nieprawda: kurs płaci pensję regułą silnika
(`paySalary`, `course.ts:155–158` – przy pustych osłonach i kadłubie 0 zł), ale potem **zdejmuje średnie koszty 4 800 zł
z osłon bez dolnej granicy** (`course.ts:171–176`, `drawShields` `:111–116` – reszta ponad zero idzie w minus), a wpływ
3 000 zł dokuje: −1 800 zł co miesiąc. Wynik kursu nie ma miesięcy z pensją częściową (`course.ts:205–215` – tylko
`belowMin` i `fromHull`), więc kurs mówi „Pensja z kadłuba nie”, a o czerwonym alarmie ze specyfikacji („Za mało także
w kadłubie: pensja częściowa i czerwony alarm”, spec. linia 123) milczy; ujemna warstwa „Osłony −21 600,00” jest sprzeczna
z Mostkiem („puste”). T276 nie przewiduje tego stanu – sprzeczność z punktem i ze specyfikacją, nie z decyzją.

**Poprawka i test.** S: w kursie miesiące z `pay.paid < salary` (nowe pole `partial`, wiersz „Pensja częściowa” w
akcencie) i niedobór zamiast ujemnych osłon (osłony od 0, „brakuje X zł”) – sposób pokazania deficytu do potwierdzenia
przez użytkownika w „Przed etapem”. Test unit (`tests/unit/course.test.ts`): pusty okręt, wpływy < koszty → `partial`
niepuste, `shields >= 0`; dziś pada.

## WY.20 (= PR.3 = LICZBY-C C19 = LICZBY-AB R-15) – POTWIERDZONE (S), mechanizm inny niż w raportach

**Odtworzenie.**
- `w4-rok` (`rok` bez zmian): Mostek „ZASIĘG 7,8 mies.”, Wywiad „Bez żadnej wypłaty paliwa starczy na 7,8 mies. (czerwiec
  2027).”, Symulator manewrów „Zasięg i klasa | 7,9 mies. · Niszczyciel | 7,9 mies. · Niszczyciel” (bez manewru).
  Zrzut W4-WY.20-symulator.png, odczyt `w4.jsonl`.
- Wariant rozstrzygający `w4-wy20b`: `rok` z dwiema zaległymi ratami „Pożyczki dla Tomka” (04.09, 05.10, po 500 zł)
  przesuniętymi na 03.2027 i 04.2027. Mostek dalej „7,8 mies.” (osłony 13 000,00 / 19 500,00, kadłub 39 066,30, dług
  500,00, średnie koszty 6 530,87), symulator **„7,7 mies.”**. Zrzut W4-WY.20-wariant.png.
- Obie dotychczasowe hipotezy odpadają: „bez odjęcia długu” (PR.3) dałoby w wariancie (12 200 + 39 066,30) / 6 530,87 =
  7,85 → „7,8”; „zaokrąglenie wbrew T218” (R-15) – 7,77 zaokrąglone to też „7,8”. `rangeText` obcina poprawnie
  (`shared/format.ts:33–35`), dług jest odejmowany (`Course.tsx:68`, `course.ts:145`).

**Przyczyna.** „Teraz” symulatora to `course.rangeNow` – zasięg **po resztce bieżącego miesiąca**: `course.ts:139–145`
dodaje do osłon (albo z nich zdejmuje) „extras” tego miesiąca, a `Course.tsx:39–45` wkłada tam otwarte boje miesiąca
(Wesele Oli −800 zł 21.11) i **zaległe spłaty pożyczek danych – zaległe przenosi na bieżący miesiąc** (Tomek +1 000 zł,
spóźniony od 04.09). `rok`: (13 000 + 200 + 39 066,30 − 500) / 6 530,87 = 7,93 → „7,9”; wariant: (13 000 − 800 +
39 066,30 − 500) / 6 530,87 = 7,77 → „7,7”. F35 wymaga „wynik obok stanu bieżącego”, a plan audytu (oś 2) i T218 – tej
samej liczby na każdym ekranie; „teraz” zakłada przy tym, że pożyczka spóźniona od dwóch miesięcy wróci w tym miesiącu.

**Poprawka i test.** S: kolumna „teraz” z zasięgu silnika (`fleet.range` – ten sam co Mostek), a resztka miesiąca tylko
w „po manewrze” (albo osobny wiersz „po operacjach tego miesiąca”). Test unit (`tests/unit/numbers-agree.test.ts` albo
`course.test.ts`): stan z zaległą ratą pożyczki danej i boją w bieżącym miesiącu → „teraz” = `rangeMonths` silnika; dziś pada.

**Uwagi.** Część poboczna WY.20 (wartość spoza zakresu) odtworzona: „300” pisane w „Koszty wyższe o” – pole
`aria-invalid`, tabela już liczy +30 % („6,0 mies.”), po wyjściu pole „30”. Przyczyna: `NumberField` bez `commitOnBlur`
(`renderer/components/ui.tsx:99–105` zapisuje każdą poprawną wartość pośrednią, `:113` przywraca ostatnią) w
`Course.tsx:236, 240` – poprawka S (`commitOnBlur` + `onReject`). Wyrocznia (C19, R-15) do sprostowania: wartość 7,8958
jest prawdziwa dla Mostka, symulator liczy inną wielkość.

## RY.24 (= LICZBY-AB R-19) – POTWIERDZONE, waga S → N

**Odtworzenie.** `w4-rok`, Raporty → „Przegląd roczny”: lista „2026, 2025”, domyślnie 2026. 2025: „Pieniądze na kontach
na początku (31.12 roku wcześniej) 20 800,00 zł”, „styczeń 2025 0,00 zł 0,00 zł” … „sierpień 2025 0,00 zł 0,00 zł”,
„wrzesień 2025 5 568,82 zł 7 500,00 zł”; koszty roku 25 515,45 zł = suma IX–XII. 2026: „grudzień 2026” (przyszły) też
w tabeli. Zrzuty W4-RY.24-2025.png, W4-RY.24-2026.png.

**Przyczyna.** `shared/calc/intel.ts:363` – `yearNumbers` zawsze bierze 12 miesięcy (`monthRange(year-01, year-12)`),
bez startu budżetu i dnia dzisiejszego; `ReportsPage.tsx:440` – stały podpis „31.12 roku wcześniej”, choć kwota to saldo
otwarcia liczone wstecz (T81 – kwota zgodna z wymaganiem, wyrocznia R-19: luka prezentacji).

**Waga N, nie S:** żadna kwota, suma ani stopa nie jest zła – kryterium punktu „puste miesiące jako 0 zł w średnich albo
sumach” nie zachodzi (przegląd nie ma średnich, zera nie zmieniają sum). Zostaje prezentacja: miesiące sprzed startu
i przyszłe jako „0,00 zł” oraz nieprawdziwa data przy saldzie początkowym.

**Poprawka i test.** S: miesiące od miesiąca startu budżetu do bieżącego; podpis „na początku (start budżetu 01.09.2025)”
w pierwszym roku. Test unit (`tests/unit/intel*.test.ts`): `yearNumbers` dla roku ze startem we wrześniu → 4 miesiące.

## RE.5 – ODRZUCONE (zgodne z wymaganiem: D89, T303)

**Odtworzenie.** `w4-re`: `rok` + 14.10.2026 Carrefour −130,00 zł na Portfelu XTB, dwie części (Jedzenie · zakupy
spożywcze −100,00 „zakupy na tydzień”, Dom · wyposażenie −30,00 „kabel HDMI”), dopisane schematami aplikacji przed
startem. Lista Operacji: „14.10 śr | Carrefour | Portfel XTB | zakupy na tydzień · kabel HDMI | 2 części | −130,00”.
CSV okresu 14.10–14.10: „2026-10-14;;Portfel XTB;Wydatek;-130,00;Jedzenie · zakupy spożywcze + Dom ·
wyposażenie;Carrefour;;;;Jedzenie · zakupy spożywcze: zakupy na tydzień · Dom · wyposażenie: kabel HDMI;” – jeden wiersz,
bez kwot części. Odtworzone.

**Dlaczego odrzucone.** Oczekiwanie punktu („części paragonu – wiersze części … sumujące się do operacji”) nie ma źródła.
D89 (decyzja użytkownika) chce „opis części paragonu … w eksporcie” – jest; T303 opisuje dokładnie to, co aplikacja
robi: „eksport – kolumna „Notatka”: notatka operacji jak jest, potem opisy części z kategorią części …, bo „Kategoria”
wymienia wszystkie części”. OP.39 uznało ten sam wiersz za zgodny. Każda operacja raz, suma pliku = suma Operacji.

**Uwagi.** Brak kwot części w pliku utrudnia sumę kategorii w Excelu – materiał na `AP` (np. arkusz „Części” w Excelu albo
kolumna „Kwoty części”), nakład S, bez konfliktu z decyzją.

## RE.15 – POTWIERDZONE, waga S → N

**Odtworzenie.** `w4-re`, Raporty → Eksport, „Od” 31.10.2026, „Do” 01.10.2026 – przy polach brak ostrzeżenia; „Operacje –
CSV” → okno zapisu z nazwą „financial-intel_operacje_2026-10-31_2026-10-01.csv”, plik 102 B (sam nagłówek), toast
„Zapisano: C:\FI-audyt\eksport\w4-re15-odwrocone.csv”. Zrzut W4-RE.15-odwrocone.png.

**Przyczyna.** `ReportsPage.tsx:502–507` – `from` / `to` idą wprost do `operationRows` i nazwy pliku, bez sprawdzenia
kolejności ani zamiany; przycisk `:520` zapisuje także pusty wynik bez słowa.

**Waga N, nie S:** brak wymagania (punkt sam: „brak wymagania”), żadna kwota ani dane nie są zagrożone, nazwa pliku od razu
pokazuje odwrócony okres, a plik z samym nagłówkiem punkt uznaje dla pustego okresu za poprawny. Zostaje ergonomia: brak
komunikatu przy odwróconych datach.

**Poprawka i test.** S: zamiana dat (albo przyciski nieaktywne z „„Od” jest po „Do””) i toast „w okresie nie ma operacji”.
Test e2e (`tests/e2e/reports*.spec.ts`) albo unit na funkcji okresu eksportu.

## US.6 – POTWIERDZONE (S)

**Odtworzenie.** `w4-rok`, Ustawienia → Kategorie, „+ Kategoria” → „Testowa” → „podkategoria”. Przyciski wiersza:
„codzienna | planowa | bez koperty | podkategoria | archiwizuj | ×”, „×” ma tytuł „Archiwizuj (dawne operacje zachowają
kategorię)”; opis zakładki „Usunięcie to archiwizacja: dawne operacje zachowują kategorię.”. Po „×” i „archiwizuj” w
fi.json zostaje `{"name":"Testowa", "archived": true}` (bez toastu); paleta „usuń kategor” – „Nic nie znaleziono.”.
Zrzut W4-US.6-testowa.png.

**Przyczyna.** Funkcji nie ma w kodzie: `CategoriesTab.tsx:111–115` ma tylko „archiwizuj” / „przywróć”, a commit 1.15.2
(`130345b`, „usuwanie kategorii w Ustawieniach (N-PC-7)”) dodał do `CategoriesTab.tsx` jedynie ostrzeżenie o braku
koperty codziennej (+5 linii). Wymaganie: D95 (N-PC-7) i CHANGELOG 1.15.2 („Usuwanie nieużywanych kategorii i
podkategorii bezpośrednio w Ustawieniach…”) – notatka wydania obiecuje coś, czego nie ma.

**Waga S** (nie W): archiwizacja jest pełnym obejściem, praca nie jest zablokowana; skutek – lista rośnie o nieużywane
pozycje, a CHANGELOG wprowadza w błąd.

**Poprawka i test.** M: „usuń” tylko przy kategorii bez odwołań (operacje i ich części, plany miesięcy, reguły importu,
kontenery, boje, szablony szybkiego wpisu) z „Cofnij”; reszta – archiwizacja. Test unit na funkcji „używana?” +
e2e (Ustawienia → usuń „Testową” → brak w fi.json po restarcie). Bez migracji. Do sprostowania CHANGELOG 1.15.2 albo
dopisek w kolejnym wydaniu.

## US.32 – POTWIERDZONE (S)

**Odtworzenie.** `w4-rok`, Ustawienia → Warstwy i rozkazy. „Osłony – cel” 3 → wpisane „5” → Esc: pole „5”, fokus w polu,
fi.json 3, ekran Ustawień; klik obok: fi.json `shieldSalaries: 5`. „Minimalne osłony” 1 → „2” → Esc → klik obok:
fi.json 2. Zrzut W4-US.32-po-esc.png.

**Przyczyna.** `renderer/components/ui.tsx:115–122` – `NumberField` obsługuje Enter i strzałki, Esc nie; przy
`commitOnBlur` `onBlur` (`:106–113`) zapisuje szkic. To ta sama klasa błędu co B24 (naprawiona w `AmountField`,
`DateField`, `TimeField`), pominięta w `NumberField`. Skutek: wartość, którą kapitan chciał anulować, zmienia cele
warstw silnika (osłony, kadłub, minimum, linia zanurzenia).

**Poprawka i test.** S: Esc w `NumberField` – `setDraft(null)` i wyjście z pola bez zapisu (flaga pomijająca zapis w
`onBlur`); w trybie bez `commitOnBlur` przywrócenie wartości sprzed fokusu. Test e2e (`tests/e2e/settings*.spec.ts`):
„Osłony – cel” 5 + Esc + klik obok → fi.json bez zmiany; dziś pada.

## IN.4 (= DA.39) – POTWIERDZONE, waga S → N

**Odtworzenie.** `w4-ro`: `rok` z `fi.json` `schemaVersion: 2`. Baner „Folder danych ma format v2, a ta wersja aplikacji
obsługuje v1. Zaktualizuj aplikację - do tego czasu dane są tylko do odczytu.”; Ctrl+S → toast „Zapisano. (Zapis jest
automatyczny – Ctrl+S nie jest potrzebne.)”; paleta „Zapisz teraz” → ten sam toast. Zrzut W4-IN.4-ctrl-s.png.

**Przyczyna.** `renderer/store/data.ts:1232–1246` – `saveNow` czyta tylko wynik `flushSaves()` (przy braku zapisów do
zrobienia: `true`) i nie sprawdza `folderReadOnly()` (`data.ts:792`).

**Waga N:** w trybie tylko do odczytu nic nie da się zmienić, więc nic nie czeka na zapis – komunikat jest mylący, ale
żadne dane nie są zagrożone; baner o trybie jest widoczny. To samo co DA.39 (N) – jedno znalezisko.

**Poprawka i test.** S: w `saveNow` przy folderze tylko do odczytu komunikat `READ_ONLY_MESSAGE`. Test unit (sklep z
atrapą `window.fi`, status `readOnly`) → toast bez „Zapisano.”.

## IN.26 – POTWIERDZONE, waga S → N

**Odtworzenie.** `w4-baner`: stan `start`, pierwsze uruchomienie, potem w `config.json` `updates.lastRunVersion`
„1.15.3” (było „1.15.4”, `pending: null`), drugie uruchomienie. Baner „Zaktualizowano do wersji 1.15.4. Co nowego ×”;
„Co nowego” → Ustawienia → Aktualizacje: „Ta wersja 1.15.4 …”, „Status Brak połączenia z GitHubem (praca offline?).
Spróbuję ponownie później.” – panelu „Co nowego w wersji …” nie ma i nie ma słowa, dlaczego. `main.log`: „INFO updated
1.15.3 -> 1.15.4”, „WARN update check failed”. Zrzuty W4-IN.26-baner.png, W4-IN.26-aktualizacje.png.

**Przyczyna.** `main/update/updater.ts:148` – notatki „właśnie zaktualizowano” są tylko z rekordu pobranej przez
aplikację aktualizacji (`pending.notes`); `UpdatesTab.tsx:172–176, 245` – panel tylko, gdy notatki są. Aktualizacja
spoza aplikacji (ręczny instalator, nowy plik portable) i brak sieci → baner prowadzi donikąd.

**Waga N:** z siecią panel się pojawia (`updater.ts:226` – sprawdzenie „aktualna” zapisuje wydanie bieżącej wersji),
a przy aktualizacji przez aplikację notatki są z pobrania; zostaje przypadek offline + aktualizacja spoza aplikacji.

**Poprawka i test.** S: przy `justUpdated` bez notatek – tekst „Opis zmian pokaże się po połączeniu z GitHubem” z
odnośnikiem „Wszystkie wydania” (albo sekcja CHANGELOG wbudowana przy budowie – `scripts/release-notes.mjs`). Test unit
widoku Aktualizacji (stan `justUpdated.notes: ''`, `release: null`) → informacja widoczna.

## DA.3 – ODRZUCONE (zgodne z wymaganiem: T248, T192, B53)

**Odtworzenie.** `w4-da3`: `rok`, pierwsze uruchomienie (folder zapamiętany), zamknięcie, nazwa folderu zmieniona, start
bez ustawionego folderu (`usePreset: false`). Ekran: „Zapamiętany folder danych jest niedostępny (np. OneDrive jeszcze
się nie uruchomił albo dysk jest odłączony). Spróbuj ponownie albo wskaż inny folder.” z „Spróbuj ponownie” i „Utwórz tu
nowe dane…”; po 15 s nazwa przywrócona, przez 78 s bez kliknięcia – bez Mostka, w `main.log` jedno „open start” (przy
starcie); „Spróbuj ponownie” → Mostek. Zrzuty W4-DA.3-brak.png, W4-DA.3-po-powrocie.png. Odtworzone.

**Dlaczego odrzucone.** Ponawianie co 30 s jest wymagane dla nieczytelnego fi.json (T248, CHANGELOG 1.6.5: „nieczytelny
chwilowo (start z Windows przed OneDrive) – „Spróbuj ponownie” i ponowienie co 30 s”); aplikacja robi je też dla
`unavailable` i `partial` (`renderer/features/setup/FolderSetup.tsx:53–56`). Dla brakującego folderu wymaganie (T192,
B53) to „Spróbuj ponownie” i zakaz nowych danych jednym kliknięciem – spełnione. Oczekiwanie punktu rozszerza T248.

**Uwagi.** Luka warta `AP` (N, nakład S – `'missing'` przy `remembered` w warunku `waiting`): komunikat sam podaje
„OneDrive jeszcze się nie uruchomił”, a B53 opisuje ten stan jako „OneDrive jeszcze go nie pobrał”. Przy OneDrive
uruchamianym po aplikacji folder zwykle istnieje (pliki „tylko online” → `unavailable` – ponawiane), więc skutek dotyczy
głównie odłączonego dysku i nowego komputera przed pierwszą synchronizacją.

## DA.41 – POTWIERDZONE (S)

**Odtworzenie.** `w4-da41`: `rok`, Operacje → „Lody Grycan” (−28,60 zł, Portfel XTB), kwota „44,44”, nazwa folderu
danych zmieniona, Enter, po 3 s nazwa przywrócona. Po wyjściu z pola – bez toastu i bez banera. Przez 137 s po powrocie
folderu plik dalej −28,60 (zapis nie ponowił się sam). „Zakończ” (`app.quit`) → pytanie „Zmiany z drugiego komputera –
Zdecyduj o zmianach z drugiego komputera (1). Te wpisy zmieniono tutaj i na drugim komputerze – … „Zamknij mimo to”
zostawia na dysku wersję z drugiego komputera, a zmiany stąd przepadają.” [Anuluj | Zamknij mimo to]; `main.log`: „WARN
zamykanie: niezapisane zmiany (decyzje: 1, nowsza wersja: 0, błąd: brak)”. Zrzut W4-DA.41-po-powrocie.png.

**Przyczyna.** `main/datastore/store.ts:1356–1362` – przed zapisem: plik wpisu nieobecny i nieznaleziony jako przeniesiony
→ `removedOutside` i `RemovedOutsideError` („usunięty na innym komputerze”), bez sprawdzenia, czy istnieje sam folder
danych (korzeń / `fi.json`). Okno dostaje decyzję o „zmianie z drugiego komputera”, zapis czeka na nią (nie jest
ponawiany po powrocie folderu), a pytanie przy zamknięciu podaje fałszywą przyczynę i podsuwa „Zamknij mimo to”, które
gubi kwotę. Ta sama przyczyna co DA.40 (K – zniknięcie folderu nierozpoznane).

**Waga S** (nie K): zmiana nie ginie po cichu – „Anuluj” zostawia okno decyzji, w którym można zachować wersję z tego
komputera; utrata tylko po wyborze ostrzegającym, że „zmiany stąd przepadają” – ale z mylącym powodem.

**Poprawka i test.** M, razem z DA.40: brak korzenia albo `fi.json` → błąd „folder niedostępny” (ponawiany jak
`ReadOnlyError`, przyczyna T247 „Folder danych może być niedostępny…”), nie `RemovedOutsideError`. Test fs
(`tests/fs/datastore.test.ts`): zapis przy przemianowanym folderze → błąd niedostępności (nie usunięcie), po
przywróceniu – zapis przechodzi; dziś pada. Bez migracji.

---

## Pilne i sprostowania
- Do poprawy w najbliższej grupie naprawczej (S, małe): DW.29, WY.20, US.32, WY.19; US.6 (M) – także sprostowanie
  CHANGELOG 1.15.2; DA.41 tylko razem z DA.40 (K).
- Sprostować w konsolidacji: WY.20 / PR.3 / C19 / R-15 – „teraz” symulatora nie pomija długu i nie zaokrągla, tylko liczy
  zasięg po resztce miesiąca (z zaległą spłatą pożyczki danej); WY.19 – kurs nie płaci pełnej pensji z pustych osłon,
  tylko zdejmuje koszty pod zero i nie pokazuje pensji częściowej.
- Duplikaty: IN.4 = DA.39 (N); WY.20 = PR.3 = C19 = R-15; RY.24 = R-19 (RY.23 powołuje się na RY.24).
- `AP` z odrzuconych: kwoty części paragonu w eksporcie (RE.5); ponawianie co 30 s także przy brakującym zapamiętanym
  folderze (DA.3).
