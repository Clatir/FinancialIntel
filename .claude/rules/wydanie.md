---
paths:
  - ".github/workflows/**"
  - "package.json"
  - "CHANGELOG.md"
  - "scripts/release-notes.mjs"
  - "scripts/next-version.mjs"
  - "scripts/altstore-source.mjs"
  - "electron-builder.cjs"
  - "src/main/update/**"
  - "src/shared/update.ts"
  - "build-windows.cmd"
  - "scripts/build-win.ps1"
  - "scripts/check-node.mjs"
  - ".node-version"
---

# Wydanie, build, CI i aktualizacje

- Build (przeniesione z CLAUDE.md 08.11.2026, T527): electron-builder → `Financial-Intel-Setup.exe` (NSIS) i
  `Financial-Intel-portable.exe`; `appId` `app.financialintel.desktop`, `productName` „Financial Intel”. iPhone: Capacitor 8
  (`ios/`, `capacitor.config.json`, `app.financialintel.ios`), web app telefonu `vite.mobile.config.mts` → `out/mobile`;
  `.ipa` bez podpisu (AltStore), źródło AltStore `altstore.json` w wydaniu.
- CI (`.github/workflows/ci.yml`, wzór ICTTJ): Linux przy każdym wypchnięciu (testy, build, E2E pod Xvfb, E2E telefonu
  w Chromium); Windows (build, smoke, test aktualizacji) i macOS (`ios`: E2E telefonu w WebKit, `.ipa`, symulator) tylko
  dla PR, gałęzi domyślnej i ręcznie.
- Aktualizacje: wzór ICTTJ (GitHub Releases, SHA-256, portable i instalator); repozytorium publiczne (D61), token GitHub
  per komputer w `safeStorage` tylko na wypadek prywatnego.
- Node do budowania ≥ 22.12, przypięty w `.node-version` (jak ICTTJ, `scripts/check-node.mjs`); `build-windows.cmd` bez
  wymagań co do Node.

- Nowa wersja = `version` w `package.json` + sekcja `## X.Y.Z` w `CHANGELOG.md` (notatki pokazywane w aplikacji; CI
  sprawdza `scripts/release-notes.mjs`). CHANGELOG czytaj tylko od góry (Read z `limit: 35`), nigdy całości (D103).
- Wydanie publikuje job Windows na `main` dla nowej wersji (z `SHA256SUMS.txt`), potem `ios-release` dołącza `.ipa`
  i `altstore.json`. Czerwone E2E na `main` = brak wydania (tak przepadło 0.3.0) – po scaleniu sprawdź CI `main`.
- PR grupy scalam sam (D71), gdy CI (Linux i Windows) jest zielone, nie ma konfliktu ani otwartych uwag i nic nie czeka
  na decyzję użytkownika. Pełna procedura: skill `etap`.
- Windows i macOS w CI tylko dla PR, gałęzi domyślnej i ręcznie; na zwykłej gałęzi roboczej – tylko Linux.
- Zmiana `.github/workflows/*` wymaga tokena z uprawnieniem `workflow` przy pushu.
