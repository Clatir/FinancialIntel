---
paths:
  - "src/mobile/**"
  - "ios/**"
  - "tests/mobile/**"
  - "tests/e2e-mobile/**"
  - "vite.mobile.config.mts"
  - "playwright.mobile.config.ts"
  - "tsconfig.mobile.json"
  - "capacitor.config.json"
  - "scripts/mobile-aliases.mjs"
  - "scripts/altstore-source.mjs"
---

# iPhone (D92, od 1.13.0)

- Zasada: renderer komputera bez zmian – telefon dostarcza `window.fi` (`host/host.ts` `PhoneHost` implementuje `FiApi`)
  i ekrany telefonu (`app/`); ekrany komputera dostosowują się przez `CompactContext` (`components/compact.ts`).
- Lustro folderu (`vfs/vfs.ts` – pliki w pamięci z numerem zmiany do wysłania i metadanymi OneDrive, nagrobki usunięć;
  `vfs/idb.ts` – IndexedDB `fi-phone`). Moduły Node telefonu (`node/` – `fs`, `path`, `crypto`) przez aliasy
  `scripts/mobile-aliases.mjs` (build i projekt Vitest `mobile`); magazyn komputera bez zmian nad `MIRROR` (`/fi`).
- Synchronizacja (`sync/`): Microsoft Graph (`graph.ts` – delta, upload z `ifMatch`), `engine.ts` (pull po id folderów,
  pełna lista po 410, push z kopią konfliktu `-telefon-<czas>`), `scheduler.ts` (30 s, 1,5 s po zmianie), `auth.ts`
  (PKCE; 429 / 5xx nie wylogowuje). Lustro obejmuje tylko `.json`, bez `backups/` i `.history/`.
- Folder ICTTJ na telefonie (IP15, jeśli będzie): tylko pobieranie `payouts/` i `forecasts/`, nigdy zapis – granica
  z CLAUDE.md obowiązuje także tu.
- Powiadomienia planowane na 7 dni (`shared/notifyPlan.ts`, `PLANNED_MAX` 60).
- Testy: `tests/mobile/*` (udawany OneDrive `fakeGraph.ts` – `FakeDrive`), E2E `tests/e2e-mobile/*` (serwer `server.ts`
  z aplikacją i `FakeDrive`, `seedDrive`); `FI_PHONE_BROWSER` (webkit), w przeglądarce testów `window.__FI_PHONE_TEST__`.
- Instalacja i wydanie: `docs/iphone.md`, CI `ios` / `ios-release` (`.ipa`, `altstore.json`); plan grup iA–iE i
  pozycje IP… w `docs/plan.md`.

Szczegóły i powody zmian: `docs/archiwum/claude-md-do-1.15.4.md` (sekcje „iA”–„iC”) i `docs/decyzje.md` (D92, D93, T305–T311).
