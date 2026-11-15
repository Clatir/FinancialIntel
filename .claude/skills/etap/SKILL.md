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
| Kroki, które zmieniają silnik pieniędzy (warstwy, dokowanie, rozliczenia z domownikami, zwroty, plan miesiąca) albo granicę ICTTJ – implementacja i jej przegląd, nigdy cała grupa | Opus 5.5 max (D103) |
| Migracje danych, synchronizacja, folder danych, telefon, reszta logiki | Opus 5.5 xhigh (D103) |
| Druga opinia tylko przy znalezisku critical | Fable 5.1 – rzadko (D103) |
| Ekrany na gotowym silniku, teksty, testy według jasnej specyfikacji – domyślny poziom | Opus 5.5 high albo Sonnet 5.5 (D103) |
| CHANGELOG, dokumenty, commit, PR, pilnowanie CI | w grupie – sesja główna Opus 5.5 · high (D104); poza grupą Sonnet 5.5 |
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
2. `/code-review` według D103: poziom według ryzyka – xhigh dla silnika pieniędzy, folderu danych, migracji,
   synchronizacji, telefonu (sync) i granicy ICTTJ; high dla reszty kodu; medium dla samych dokumentów i konfiguracji.
   **Najwyżej dwie rundy:** pierwsza na całym diffie, druga tylko na diffie poprawek z pierwszej; trzecia tylko, gdy
   druga znalazła critical albo high – znowu tylko na nowych poprawkach. Poprawiane: critical i high zawsze (z testem);
   medium – gdy da się napisać test, który bez poprawki pada (w dokumentach: oczywisty błąd); reszta (low, nit, medium
   bez testu) → „Uwagi na później” we wpisie w `docs/postep.md`. Z przeglądu nie wchodzi zmiana zachowania widocznego dla
   użytkownika bez pytania.
3. Commit + push (gałąź `claude/<wersja>-<krótki-opis>`).
4. Wpis w `docs/postep.md` (cały plik ≤ 20 KB – D103): zakres, decyzje (D… / T…), testy, czas faktyczny, rzeczy otwarte,
   „Uwagi na później”. `CHANGELOG.md` przy dopisywaniu wersji – Read z `limit` (początek pliku), nigdy całość. Nowa reguła albo pułapka
   modułu → `.claude/rules/<moduł>.md`; zmiany dla użytkownika → `CHANGELOG.md`. Do CLAUDE.md nie dopisuj map kodu.
5. Zaktualizowana tabela postępu (etap / grupa, model i thinking z górką, szacowany czas, stan).
6. Pauza – użytkownik zmienia model / thinking. Bez komendy nie zaczynaj kolejnego etapu ani grupy (D67). W grupie
   (ciągu) pauza dopiero na jej końcu albo przy pytaniu o zachowanie widoczne dla użytkownika (D104).

## Wykonawcy, grupy, jedno CI (D104, wzorzec `Clatir/RegulatedDay` D317, D349, D351, D354, D413)
- **Sesja główna – Opus 5.5 · high:** kontrakt każdego kroku w sekcji grupy w `docs/postep.md` (typy, sygnatury,
  istniejące funkcje do użycia z `plik:linia`, „gotowe, gdy”, pułapki niżej), przegląd diffu wykonawcy w kodzie, pełne
  testy, `/code-review`, git, dokumenty, CHANGELOG, PR, CI, scalanie i wydanie (zmienia D103 cz. 2 „zamknięcie – Sonnet”).
- **Test i kod pisze wykonawca** z `.claude/agents/` według kolumny „Wykonawca · przegląd” w tabeli prac (D96):
  `wykonawca-opus` (xhigh) – silnik pieniędzy, migracje, synchronizacja, folder danych, telefon, granica ICTTJ, zapis
  rekordów, zmiany zbiorcze pól pieniędzy; kroki „max” z D103 – ten sam wykonawca z `effort: max` w wywołaniu, przegląd
  max w sesji głównej; `wykonawca-sonnet` (high) – ekrany na gotowej logice, interakcje, testy według kontraktu;
  `wykonawca-haiku` (high) – tylko teksty, opisy, listy odbioru, bez kodu funkcji.
- Kroki niezależne – równolegle (najwyżej 4–5 naraz), każdy we własnym drzewie (`isolation: "worktree"`); zależne – po
  scaleniu poprzednich do gałęzi grupy. Numery T przydzielaj z góry. Poprawki po przeglądzie wracają do tego samego
  wykonawcy (SendMessage – jego kontekst zostaje). Pytania wykonawcy o zachowanie widoczne dla użytkownika – do
  użytkownika; techniczne rozstrzyga sesja główna (T-decyzja).
- **Grupa = ciąg (D67, D104):** komunikat „Przed etapem” i pytania o wygląd całej grupy z góry; kroki bez pauzy; pauza
  na końcu albo przy nowym pytaniu o zachowanie widoczne dla użytkownika.
- **Jedno CI na grupę (T531):** `ci.yml` rusza tylko na PR, pushu do `main` i ręcznie – commity kroków na gałęzi grupy
  `claude/<wersja>-<opis>` nie uruchamiają CI (bez `[skip ci]`). PR otwierasz na końcu grupy, po wersji i CHANGELOG –
  każdy push do otwartego PR to nowa runda, więc poprawki po CI zbieraj w jeden push. Scalanie według D71.
- **Pułapki (z TJ, 15.11.2026):**
  - agent z nowego pliku w `.claude/agents/` widać dopiero w nowej sesji – do tego czasu `general-purpose` z `model`
    i `effort` z pliku wykonawcy i poleceniem „przeczytaj `.claude/agents/wykonawca-<x>.md` i postępuj według niego”;
  - drzewo wykonawcy nie startuje od gałęzi grupy – w poleceniu `git fetch origin && git merge --ff-only
    origin/<gałąź grupy>` i oczekiwany hash HEAD (gałąź grupy wypchnięta przed startem wykonawcy);
  - drzewo nie ma `node_modules` – łącze przez PowerShell: `New-Item -ItemType Junction -Path node_modules -Target
    <repo>\node_modules` (`mklink` z bash nie działa); nigdy `npm ci` w drzewie;
  - Node z `.tools\node-v<.node-version>-win-x64` na początku `PATH` (systemowy 20.12 za stary);
  - integracja przez `git -C <drzewo>` i `git push origin HEAD:<gałąź grupy>` – bez `cd` do drzewa wykonawcy; nigdy
    goły `git stash` (stos wspólny dla drzew);
  - `tsconfig.web.json` ma jawną listę testów store'u w `include` – nowy test store'u i czysty moduł renderera testowany
    w node dopisz do `include` / `exclude` (inaczej TS6307); wpisz to do kontraktu;
  - nazwy plików różne tylko wielkością liter (`bulkMenu.ts` obok `BulkMenu.tsx`) – TS1261 na Windows;
  - koszt: wykonawca Opus xhigh z dwiema poprawkami ok. 250 tys. tokenów, Sonnet ok. 100–160 tys.; precyzyjny kontrakt
    (pliki, linie, istniejące funkcje) skraca pracę najbardziej; każdy wykonawca wczytuje pełny CLAUDE.md.

## PR, scalanie (D71), wydanie
- Nowa wersja: `package.json` + sekcja w `CHANGELOG.md` (CI sprawdza `scripts/release-notes.mjs`); jedna wersja i jedna
  sekcja na grupę, PR otwierany po nich (T531).
- PR grupy scalam sam, gdy CI (Linux i Windows) jest zielone, nie ma konfliktu ani otwartych uwag i nic nie czeka na
  decyzję użytkownika. Po scaleniu sprawdź, czy CI na `main` wydało wersję (wydanie publikuje job Windows; czerwone E2E
  na `main` = brak wydania – tak przepadło 0.3.0).
- Na CI czekaj jednym poleceniem w tle (`gh run watch <id> --exit-status`), nie wielokrotnym sprawdzaniem; w sesji
  w chmurze bez `gh` – subskrypcja zdarzeń PR (`subscribe_pr_activity`), nie odpytywanie.
- **Po scaleniu PR** (i sprawdzeniu wydania) powiedz wprost, że `/clear` jest teraz bezpieczny – wszystko wypchnięte,
  `docs/postep.md` mówi, co dalej (D103).
- Po wydaniu: wpisy etapu z `docs/postep.md` przenieś do `docs/archiwum/postep-<zakres>.md` (dopisz na końcu
  właściwego pliku archiwum), w `docs/postep.md` zostaje stan i kolejka.

## Przeglądy
- Diff etapu → `/code-review` według D103 (wyżej, „Po etapie” pkt 2); poprawki po przeglądzie → druga runda tylko na nich.
- Przegląd wieloagentowy (workflow) tylko na komendę użytkownika i tylko dla nowego obszaru albo pierwszego pełnego
  przeglądu. Gdy poprzedni przegląd obszaru dał już tylko uwagi minor / nit – kolejny to `/code-review` na diffie.
- Weryfikacja sceptyczna tylko dla znalezisk critical / high / medium; druga opinia (Fable 5.1) tylko dla critical
  (D103); niskie ocenia wykonawca przy poprawce. Recenzenci na poziomie przeglądu według ryzyka (D103).
