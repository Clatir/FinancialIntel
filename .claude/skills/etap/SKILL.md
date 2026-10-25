---
name: etap
description: Rytm etapu i grupy w Financial Intel – tabela prac i komunikat „Przed etapem N”, zamknięcie etapu (testy, /code-review, commit, wpis w docs/postep.md), PR, scalanie (D71), wydanie, przeglądy i czekanie na CI. Użyj przed rozpoczęciem i po zakończeniu każdego etapu albo grupy, a także przed wydaniem.
---

# Etap / grupa – Financial Intel

## Przed etapem – tabela prac (D96, zmienia D90)
Przy pojedynczym zadaniu poza etapem wystarczy jedna linia z modelem i thinking. Przed etapem: krok, co obejmuje, model i thinking – najtańszy, który wystarczy, z górką (o stopień wyżej) – oraz szacowany czas pracy
Claude'a; na końcu razem i rekomendacja dla całości. Szacunki czasu bywały kilkukrotnie za duże (grupy kończyły się
w 0,15–0,7 planu) – opieraj je na czasach faktycznych z `docs/postep.md` i archiwum.

Dobór modelu (relatywnie: Fable 5.1 ≈ 2,5× Opus 5.5 ≈ 5× Sonnet 5.5; Haiku 5.5 ≈ 1/40 Opus):

| Zadanie | Model |
| --- | --- |
| Silnik pieniędzy (warstwy, dokowanie, rozliczenia z domownikami, zwroty, plan miesiąca), granica ICTTJ | Opus 5.5 max (D96) |
| Migracje danych, synchronizacja, folder danych, telefon, reszta logiki | Opus 5.5 xhigh – domyślny poziom (D96) |
| Projekt reguł o najwyższej stawce, druga opinia przy znalezisku critical / high | Fable 5.1 – rzadko |
| Ekrany na gotowym silniku, teksty, testy według jasnej specyfikacji | Opus 5.5 high albo Sonnet 5.5 |
| CHANGELOG, dokumenty, commit, PR, pilnowanie CI | Sonnet 5.5 |
| Szerokie przeszukiwanie kodu | agent `Explore` z `model: haiku` |

Model zmieniaj tylko na granicy etapu (pauza) razem z `/clear` – pamięć podręczna promptu jest osobna dla każdego
modelu, a stan przenosi `docs/postep.md`.

## Przed etapem N – komunikat (zapisz go też w `docs/postep.md`)
1. **Co trzeba wiedzieć** – zakres etapu, stan poprzednich, rzeczy otwarte.
2. **Co użytkownik musi powiedzieć** – pytania z propozycją, odbiór poprzedniego etapu.
3. **Co trzeba dodać / przygotować** – pliki, klucze, ustawienia, testy po stronie użytkownika.
4. **Model, thinking, szacunek czasu** – tabela prac jak wyżej.

## Po etapie
1. Testy: w trakcie tylko pliki powiązane ze zmianą (`--reporter=dot`); przed commitem raz pełny zestaw –
   `npm run typecheck`, `npm test`, `npm run build`, E2E (`xvfb-run -a npx playwright test` na Linuksie, w tle), przy
   zmianach telefonu `npm run test:e2e:mobile`. Każda poprawka z testem, który bez niej pada; serie mutacji (> 5 prób)
   w subagencie.
2. `/code-review` high na diffie etapu; znaleziska poprawione z testem.
3. Commit + push (gałąź `claude/<wersja>-<krótki-opis>`).
4. Wpis w `docs/postep.md`: zakres, decyzje (D… / T…), testy, czas faktyczny, rzeczy otwarte. Nowa reguła albo pułapka
   modułu → `.claude/rules/<moduł>.md`; zmiany dla użytkownika → `CHANGELOG.md`. Do CLAUDE.md nie dopisuj map kodu.
5. Zaktualizowana tabela postępu (etap / grupa, model i thinking z górką, szacowany czas, stan).
6. Pauza – użytkownik zmienia model / thinking. Bez komendy nie zaczynaj kolejnego etapu ani grupy (D67).

## PR, scalanie (D71), wydanie
- Nowa wersja: `package.json` + sekcja w `CHANGELOG.md` (CI sprawdza `scripts/release-notes.mjs`).
- PR grupy scalam sam, gdy CI (Linux i Windows) jest zielone, nie ma konfliktu ani otwartych uwag i nic nie czeka na
  decyzję użytkownika. Po scaleniu sprawdź, czy CI na `main` wydało wersję (wydanie publikuje job Windows; czerwone E2E
  na `main` = brak wydania – tak przepadło 0.3.0).
- Na CI czekaj jednym poleceniem w tle (`gh run watch <id> --exit-status`), nie wielokrotnym sprawdzaniem.
- Po wydaniu: wpisy etapu z `docs/postep.md` przenieś do `docs/archiwum/postep-<zakres>.md` (dopisz na końcu
  właściwego pliku archiwum), w `docs/postep.md` zostaje stan i kolejka.

## Przeglądy
- Diff etapu albo poprawki po przeglądzie → `/code-review` high (krytyczne obszary: xhigh).
- Przegląd wieloagentowy (workflow) tylko na komendę użytkownika i tylko dla nowego obszaru albo pierwszego pełnego
  przeglądu. Gdy poprzedni przegląd obszaru dał już tylko uwagi minor / nit – kolejny to `/code-review` na diffie.
- Weryfikacja sceptyczna tylko dla znalezisk critical / high / medium (druga opinia dla critical / high); niskie ocenia
  wykonawca przy poprawce. Recenzenci domyślnie Opus 5.5 xhigh, Fable 5.1 tylko do drugiej opinii.
