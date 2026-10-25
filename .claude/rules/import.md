---
paths:
  - "src/shared/import/**"
  - "src/renderer/features/import/**"
  - "src/main/bankFiles.ts"
  - "tests/fixtures/mbank/**"
  - "tests/unit/import*.test.ts"
  - "tests/unit/mbank.test.ts"
---

# Import z mBanku

## Przepływ
- `text.ts` (`decodeText`: BOM UTF-8 / UTF-16, UTF-8, Windows-1250; `parseCsv`; `IMPORT_MAX_BYTES`) → `mbank.ts`
  (`parseMbank` – „Lista operacji” / „Historia rachunku”, `splitDescription`; klucz wiersza zależy od konta –
  `keyOnAccount`) → `classify.ts` (`classifyRow`, `findRule`) → `reconcile.ts` (`planImport` → known / settle / merge /
  new / deleted / elsewhere; `buildImport`).
- `runImport` (`features/import/state.ts`): tylko do odczytu → zapis zmian → kopia (`backups/pre-import`) → plan od
  nowa → `buildImport` → zapis paczką z rekordem `imports/` (cofnięcie: `shared/import/batch.ts`) → reguły i nazwiska.
- Pliki z banku w Pobranych: `main/bankFiles.ts` + `shared/import/bankFiles.ts`.

## Rozpoznanie
- Kolejność: przelew własny → domownik → XTB → reguła. Reguła: marka → cała nazwa → „zawiera” → słowo użytkownika
  (`findRule`); tryb `amount` z `maxAmount`.
- Rodzaje `PER_OPERATION_KINDS` (pożyczka, PIT-38, XTB) nigdy regułą. Kategoria mBanku tylko jako podpowiedź (`hintFor`).
- Nazwy czyszczone `cleanBankName`; klucze sprzed 1.2.3 (`bankName`, `RuleTarget.legacy`) muszą dalej pasować –
  zmiana kluczy nie może osierocić reguł zapisanych w folderach użytkownika.
- Łączenie i duplikaty: `looseMatch` (kwota, ±3 dni, podobieństwo kontrahenta), także między kontami; decyzja
  użytkownika („Nie łącz”, `notDuplicates`, `notSimilar`) zawsze wygrywa.

## Wydajność
- Pamięć `brandOf` / `counterpartyKey` do 50 tys.; plan od nowa tylko przy zmianie treści (`BY_CONTENT` + `deepEqual`);
  listy ekranu po 100 (`ShowMore`), `memo` tematów, marek i wierszy.

## Dane testowe
- `tests/fixtures/mbank/` – tylko pliki zanonimizowane (T44) albo syntetyczne; nigdy dane użytkownika. Zostają z CRLF
  i BOM jak z banku (`.gitattributes`: `tests/fixtures/** -text`).

Szczegóły i powody zmian: `docs/archiwum/claude-md-do-1.15.4.md` (Grep po nazwie funkcji) i `docs/decyzje.md`.
