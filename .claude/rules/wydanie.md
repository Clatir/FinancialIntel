---
paths:
  - ".github/workflows/**"
  - "package.json"
  - "CHANGELOG.md"
  - "scripts/release-notes.mjs"
  - "scripts/next-version.mjs"
  - "scripts/altstore-source.mjs"
  - "electron-builder.cjs"
---

# Wydanie i CI

- Nowa wersja = `version` w `package.json` + sekcja `## X.Y.Z` w `CHANGELOG.md` (notatki pokazywane w aplikacji; CI
  sprawdza `scripts/release-notes.mjs`). CHANGELOG czytaj tylko od góry (`limit: 35`).
- Wydanie publikuje job Windows na `main` dla nowej wersji (z `SHA256SUMS.txt`), potem `ios-release` dołącza `.ipa`
  i `altstore.json`. Czerwone E2E na `main` = brak wydania (tak przepadło 0.3.0) – po scaleniu sprawdź CI `main`.
- PR grupy scalam sam (D71), gdy CI (Linux i Windows) jest zielone, nie ma konfliktu ani otwartych uwag i nic nie czeka
  na decyzję użytkownika. Pełna procedura: skill `etap`.
- Windows i macOS w CI tylko dla PR, gałęzi domyślnej i ręcznie; na zwykłej gałęzi roboczej – tylko Linux.
- Zmiana `.github/workflows/*` wymaga tokena z uprawnieniem `workflow` przy pushu.
