---
paths:
  - "src/main/ictj/**"
  - "src/shared/ictj.ts"
  - "src/shared/calc/dock.ts"
  - "src/shared/calc/goals.ts"
  - "src/renderer/store/ictj.ts"
  - "src/renderer/features/dock/**"
  - "src/renderer/features/starmap/**"
  - "tests/fs/ictj.test.ts"
  - "tests/unit/dock.test.ts"
---

# ICTTJ: odczyt folderu, dokowanie, cele

- Odczyt folderu danych ICTTJ (od etapu E5, `src/main/ictj/`, z obserwacją zmian): tylko `payouts/**` (wpisy
  `withdrawal` z pulą i `return`; `expense` pomijane) i `forecasts/*.json` (cele scenariuszy). Schematy tolerancyjne
  (`z.looseObject`, tylko używane pola), nowszy `schemaVersion` ICTTJ = ostrzeżenie, nie błąd. Każdy wpis ICTTJ dokuje
  najwyżej raz (`dockings/*` z `source.ictjEntryId`).
- Pula wpisu ICTTJ: `current` / `surplus` → zwykłe dokowanie, `goals` → prosto do celów, `tax` → przepływ poza
  budżetem (PIT-38), nie koszt. PIT-38 na radarze tylko jako termin, bez kwoty.
- Dopasowanie: wypłata z ICTTJ bez pary w CSV z mBanku przez 3 dni robocze (D72) → Portfel XTB (potwierdzenie przy
  dokowaniu); wpływ z XTB w mBanku bez wpisu w ICTTJ → dokuje normalnie + przypomnienie o wpisie w ICTTJ.
- Przycisk „Otwórz ICTTJ” w menu bocznym FI; w ICTTJ nic się nie zmienia.
- Czytnik (`reader.ts`, `source.ts` – obserwacja i odczyt co 30 s): tylko ENOENT = pusto (`ListingError`); nieudany
  odczyt zostawia ostatnią dobrą migawkę (`LAST_READ_FAILED`); dwa pliki jednego wpisu – ostrzeżenie (`oneEntryPerId`).
- Dostawy (`calc/dock.ts` `deliveries`): stany pending / waiting / docked / skipped / before-start, okno −3 dni … +3 dni
  robocze; operacja Portfela i dokowanie z id wpisu (`derivedId`); usunięty wpis albo zmieniona pula oznaczane, nie
  gubione (`entryGone`, `poolChanged`).
- Cele ICTTJ: `syncIctjGoals` – rekordy z id ICTTJ; pula Cele najpierw do celów ICTTJ.
- Testy: `FI_ICTJ_DIR`, `FI_ICTJ_APPDATA`, `FI_ICTJ_LAUNCH=dry`; przykładowy folder ICTTJ tylko zanonimizowany.

Szczegóły i powody zmian: `docs/archiwum/claude-md-do-1.15.4.md` (Grep po nazwie funkcji) i `docs/decyzje.md`.
