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
  klik, potem wpisanie. Testy z należnościami sprzed dziś ustawiają `household.since`.
- Zmienne testowe: `FI_USER_DATA`, `FI_DATA_DIR`, `FI_MACHINE_NAME`, `FI_DEFAULT_DATA_DIR`, `FI_UPDATE_URL`,
  `FI_UPDATE_CHECK_DELAY_MS`, `FI_UPDATE_TOKEN`, `FI_E2E_EXECUTABLE`, `FI_ICTJ_DIR` / `FI_ICTJ_APPDATA` /
  `FI_ICTJ_LAUNCH`, `FI_SYSTEM_IDLE`, `FI_IDLE_CHECK_MS`, `FI_CONFIG_RETRY_MS`, `FI_CONFIG_WRITE_DELAY_MS`,
  `FI_DOWNLOADS_DIR`, `FI_BANK_FILES_POLL_MS`, `FI_OPEN_DELAY_MS`, `FI_OPEN_SLOW_MS`, `FI_FREEZE_AFTER_OPEN_MS`,
  `FI_FREEZE_QUIET_MS`, `FI_VERIFY_VIEWS`, `FI_PHONE_BROWSER`, `FI_CHROMIUM`; Windows CI: `FI_UPDATE_FROM` /
  `FI_UPDATE_TO` / `FI_UPDATE_TO_VERSION`. Hak E2E `window.__FI_SAVE_DELAY__` (opóźnienie autozapisu).
- Dane: `tests/fixtures/` tylko zanonimizowane albo syntetyczne, nigdy dane użytkownika.
