# Audyt funkcjonalny – jak wykonać punkty w laboratorium

Instrukcja dla grup AU-4–AU-10 (Claude i jego agenci). Plan i zasady: `docs/audyt/plan.md`; punkty:
`docs/audyt/punkty/*.md`. Audyt **niczego nie naprawia** – kod aplikacji zostaje bez zmian.

## Laboratorium
- Wydanie z GitHuba: `C:\FI-audyt\wydanie\1.15.4\app\Financial Intel.exe` (rozpakowany instalator, SHA-256 zgodne).
- Node do narzędzi: `.tools\node-v24.21.0-win-x64` – w PowerShell najpierw
  `$env:Path = "$PWD\.tools\node-v24.21.0-win-x64;$env:Path"`.
- Uruchomienie skryptu: `npx playwright test -c playwright.audyt.config.ts <plik>` (testy w `tests/audyt/`, poza CI).
- Narzędzie `tests/audyt/lab.ts`:
  - `start(nazwa, { dataDir, ictjDir, machine, usePreset, prefs, fresh })` – wydana aplikacja na własnym `userData`
    (`C:\FI-audyt\przebiegi\<nazwa>\userdata`), okna poza ekranem, bez fokusu; bez globalnego skrótu, dźwięków
    i aktualizacji; powiadomienia Windows, autostart, otwieranie plików / folderów / linków – tylko zapisywane.
  - `useState('rok', nazwa)` – kopia stanu persony do przebiegu (`dane`, `ictj`); stan w `C:\FI-audyt\stany` zostaje
    nietknięty. Stany: `rok` (14 miesięcy, opis w `C:\FI-audyt\stany\rok.log` i `rok.persona.json`).
  - `answerDialogs(app, { paths | savePath | cancel })` – odpowiedź na następne okno wyboru / zapisu pliku.
  - `text(page, selektor)` – widoczny tekst; `shot(page, id)` – zrzut `C:\FI-audyt\zrzuty\<id>.png`.
  - `reading(grupa, punkt, stan, wartości)` – odczyt liczb do `C:\FI-audyt\odczyty\<grupa>.jsonl` (wyrocznia w AU-9).
  - `recorded(app)` – próby powiadomień (`toasts`), autostart (`login`), otwarte ścieżki (`opened`).
  - `onScreen(app)` – ile okien aplikacji jest na ekranach (ma być 0).
- Wzorce sterowania: `tests/e2e/*.spec.ts` (identyfikatory `data-testid`, okno szybkiego wpisu –
  `page.evaluate('window.fi.quickOpen()')` i `app.windows()`, pola kwot – najpierw klik, potem wpisanie).
- Pliki z banku: `C:\FI-audyt\pliki\` (`rok-historia.csv` – zaimportowana historia, `rok-nowe-lista.csv` i
  `rok-nowe-historia.csv` – ostatni tydzień, jeszcze nie zaimportowany; Windows-1250, CRLF).
- Nigdy: Twój folder `OneDrive\FinancialIntel`, `%APPDATA%\Financial Intel`, prawdziwy folder ICTTJ, zegar systemu,
  rejestr Windows, Kosz Windows (punkty „Przenieś do Kosza” – tylko do kroku przed potwierdzeniem albo NIE DO SPRAWDZENIA).
- **Autostart (incydent 03.11.2026):** wydana aplikacja przy każdym starcie zapisuje swój wpis autostartu, zanim okno
  powstanie – jako zwykła instalacja usuwała wpis „Financial Intel” Twojej aplikacji. `start()` uruchamia ją więc jako
  portable (`PORTABLE_EXECUTABLE_FILE` – wpis „Financial Intel (portable)”, którego nie masz) i czyta wpisy FI w rejestrze
  przed i po starcie: każda zmiana przerywa przebieg. Skutek dla audytu: aplikacja w laboratorium mówi o sobie jak wersja
  przenośna (Ustawienia → Aktualizacje) – teksty wersji instalowanej sprawdza maszyna.
- **„W użyciu” (D86):** `start()` porusza myszą nad oknem – komputer jest w użyciu i robi zapisy w tle (zamrażanie dni
  gry, cele ICTTJ). `idle: true` – komputer zostawiony sam sobie (punkty o drugim komputerze, zasobniku).
- **Stany szczególne** (punkt wymaga danych, których `rok` nie ma): zrób je na kopii (`useState('rok', przebieg)`, potem
  zmiana plików przed `start()`; nowe rekordy przez `seedFolder` z `tests/e2e/seed.ts` albo przez interfejs aplikacji)
  i opisz w raporcie, co dodałeś. Stan `pusty` – `start(nazwa, { usePreset: false })` albo pusty `dataDir`.
- **Znane z przygotowania** (`raport/0-przygotowanie.md`): Operacje zawieszają okno przy grze dłuższej niż ok. 105 dni
  (P.1) – persona ma grę od 60 dni, nie zmieniaj `game.start` wstecz poza punktem P.1.

## Jak oceniać
1. Każdy punkt wykonujesz według „Jak sprawdzić” i oceniasz **dosłownie** według „Oczekiwany efekt” i „Nie przechodzi,
   gdy”. Nie ustalasz oczekiwania z kodu; kod czytasz tylko po to, żeby trafić w przycisk albo zrozumieć, co widać.
2. Werdykty: **ZGODNE**, **NIEZGODNE** (z wagą K / W / S / N – `plan.md`), **UWAGA** (tylko wygląd albo tekst),
   **DO OCENY** (gust – zrzut dla użytkownika), **NIE DO SPRAWDZENIA** (powód), **LICZBY → AU-9** (punkt pokazuje kwoty
   – zachowanie ocenione, liczby zapisane w odczytach do porównania z wyrocznią).
3. Dowód każdego NIEZGODNE i UWAGA: dosłowny tekst z ekranu w cudzysłowie, zrzut, kroki do powtórzenia. Bez dowodu nie
   ma znaleziska.
4. Nic nie naprawiasz i niczego nie obchodzisz. Gdy krok się nie udaje (brak przycisku, błąd w oknie, aplikacja się
   zamyka) – zapisz to jako wynik punktu i idź dalej.
5. Przy okazji zapisuj spostrzeżenia spoza punktów (myląca etykieta, brak „Cofnij”, za dużo kroków) – to materiał
   do wniosków (AU-11), sekcja „Spostrzeżenia”.

## Praca równoległa (kilka obszarów naraz)
- Skrypty obszaru: `tests/audyt/<prefiks>-*.spec.ts` (np. `kr-kreator.spec.ts`); pomocnicze funkcje obszaru –
  `tests/audyt/<prefiks>-pomoc.ts`. **Nie zmieniaj** `lab.ts`, `persona*.ts` ani plików innych obszarów – błąd w nich
  zgłoś w raporcie.
- Nazwy przebiegów (`start(nazwa)`, `useState(stan, nazwa)`) zaczynają się od prefiksu obszaru (`kr-…`, `op-…`).
- Odczyty liczb: `reading('<prefiks>', …)` – plik `C:\FI-audyt\odczyty\<prefiks>.jsonl`.
- Punkty „Kto: Maszyna” i „Kto: Ty” nie są wykonywane w laboratorium – w raporcie jedna linia „poza laboratorium”.

## Raport
Plik `docs/audyt/raport/<prefiks>.md` (np. `raport/KR.md`), na górze data, wersja, stan danych i podsumowanie (liczba
werdyktów). Każdy punkt:

```
### SW.12 – NIEZGODNE (S)
- Stan: rok (kotwica 2026-11-03), przebieg au4-wpis, 2026-11-03 14:05
- Zrobione: …
- Widać: „…” (dosłownie)
- Oczekiwane: … (punkt / wyrocznia)
- Zrzut: SW.12.png
```

Punkty ZGODNE mogą być zwięzłe (jedna linia „Widać”). Na końcu sekcja **Znaleziska** (NIEZGODNE z wagą, po jednej linii,
z numerem punktu) i **Spostrzeżenia**. Numery `AF-n` nadaje synteza (AU-11).
