---
paths:
  - "tests/**"
  - "vitest.config.mts"
  - "playwright*.config.ts"
---

# Testy

- Układ: `tests/unit` (czyste obliczenia; sklepy okna z atrapą `window.fi` – pliki w `tsconfig.web.json`), `tests/fs`
  (folder danych, historia, kopie, watcher), `tests/mobile`, `tests/e2e` (Playwright `_electron`), `tests/e2e-mobile`,
  `tests/update/*` (tylko Windows CI).
- Każda poprawka i każde znalezisko przeglądu ma test, który bez poprawki pada (mutacja); zbiorcze poprawki grupy
  w `*-fixes.test.ts`. Serie mutacji (> 5 prób) w subagencie.
- W trakcie zmiany uruchamiaj tylko powiązany plik (`npx vitest run <plik> --reporter=dot`); pełny zestaw i E2E raz przed
  commitem, E2E w tle.
- E2E: `launch()` (`tests/e2e/app.ts`; zamknięcie z limitem 40 s – `guardClose`), folder czytany przez
  `tests/e2e/files.ts` (pomija pliki znikające i tymczasowe), folder z rekordami `tests/e2e/seed.ts`; czekanie na
  podsumowanie importu `importDone` w limicie kroków masowych (`MASS`, 30 s); okno zapisu podstawiane przez
  `app.evaluate`; okno szybkiego wpisu – `page.evaluate('window.fi.quickOpen()')`; pole kwoty z wartością – najpierw
  klik, potem wpisanie. Testy z należnościami sprzed dziś ustawiają `household.since`. Kod współdzielony E2E importują
  względnie (bez aliasów).
- Zmienne testowe: `FI_USER_DATA`, `FI_DATA_DIR`, `FI_MACHINE_NAME`, `FI_DEFAULT_DATA_DIR`, `FI_UPDATE_URL`,
  `FI_UPDATE_CHECK_DELAY_MS`, `FI_UPDATE_TOKEN`, `FI_E2E_EXECUTABLE`, `FI_ICTJ_DIR` / `FI_ICTJ_APPDATA` /
  `FI_ICTJ_LAUNCH`, `FI_SYSTEM_IDLE`, `FI_IDLE_CHECK_MS`, `FI_CONFIG_RETRY_MS`, `FI_CONFIG_WRITE_DELAY_MS`,
  `FI_DOWNLOADS_DIR`, `FI_BANK_FILES_POLL_MS`, `FI_OPEN_DELAY_MS`, `FI_OPEN_SLOW_MS`, `FI_FOLDER_CHECK_MS`,
  `FI_FREEZE_AFTER_OPEN_MS`, `FI_FREEZE_QUIET_MS`, `FI_VERIFY_VIEWS`, `FI_PHONE_BROWSER`, `FI_CHROMIUM`; Windows CI:
  `FI_UPDATE_FROM` / `FI_UPDATE_TO` / `FI_UPDATE_TO_VERSION`. Hak E2E `window.__FI_SAVE_DELAY__` (opóźnienie autozapisu).
- Dane: `tests/fixtures/` tylko zanonimizowane albo syntetyczne, nigdy dane użytkownika.
- **Pułapka (03.11.2026):** spakowana aplikacja (`FI_E2E_EXECUTABLE`) przy każdym starcie zapisuje autostart z
  `config.json` przed oknem – na komputerze użytkownika usuwa jego wpis „Financial Intel” w HKCU\…\Run (usuwanie po
  nazwie). Lokalnie uruchamiaj ją tylko z `PORTABLE_EXECUTABLE_FILE` (jak `tests/audyt/lab.ts`); CI to nie dotyczy.
- **Pułapka (03.11.2026):** daty na sztywno w E2E (`'2026-10-05'`) to bomba zegarowa – lista Operacji pokazuje bieżący
  miesiąc, więc po jego końcu wierszy nie widać (`recover.spec.ts`, `repayments.spec.ts` padają od 1.11.2026). Daty
  w testach licz względem `warsawNow()` (`addDays`, `addMonths`). Skrypty laboratorium `tests/audyt/` są w zasięgu
  `tsconfig.node.json`, ale poza typecheck CI – ich typy sprawdza `npm run typecheck:audyt`.
- **Pułapka (04.11.2026):** w ciszy nocnej (23:00–05:00) szybki wpis wymaga notatki (`quick-log-note`) i potwierdzenia
  (`quick-night-ok`) – pomocnik E2E zapisujący szybki wpis musi to obsłużyć i poczekać na pytanie (`quickExpense`
  w `tests/e2e-mobile/phone.spec.ts`), inaczej CI w nocy pada.
- **Lokalnie na komputerze użytkownika:** `ictj.spec.ts` (krok „Nie znaleziono ICT Trade Journal”) pada, bo ICTTJ jest
  zainstalowany – CI to nie dotyczy. `folder-speed` ZIP64 (ok. 20 s) przekracza 60 s, gdy obok idą E2E – powtórz osobno.
  Równoległe drzewa robocze: `node_modules` i `.tools` jako junction do głównego repozytorium; przed
  `git worktree remove` usuń same łącza (`[System.IO.Directory]::Delete(<łącze>, $false)` w PowerShell).
- **Wyrocznia (AP-32, T367):** po każdej grupie silnika pieniędzy `npm run test:wyrocznia` (lokalnie, migawki audytu
  z `C:\FI-audyt`, ok. 2 min); szybka część `tests/unit/wyrocznia-ap32.test.ts` jest w `npm test`. Wyrocznia jest ślepa –
  poprawiaj ją tylko z tekstu wymagań i kopii schematów `tests/audyt/wyrocznia/lib/schemat.mjs` (nowe pole czytane przez
  nią – tam), nigdy z kodu `src/`; rozbieżność to błąd aplikacji (lista `KNOWN` z grupą naprawy) albo luka wyroczni.
