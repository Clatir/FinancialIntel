# Financial Intel – postęp

**Stan:** E0 (fundament, wersja 0.1.0) zrobiony na gałęzi `claude/e0-fundament`, PR do `main` – czeka na zielone CI
(Linux + Windows) i scalenie. Po scaleniu CI publikuje wydanie 0.1.0.
**Następny krok:** odbiór E0 przez użytkownika (instalacja na Windows), potem komunikat „Przed etapem E1”.

## Kolejka prac

Czas = praca Claude Code w sesji (czytanie, pisanie, testy, poprawki), bez testowania przez użytkownika i bez czekania
na CI. Model i thinking z górką (prośba użytkownika 16.10.2026). E0 zmierzony; szacunki E1–E9 przeliczone po E0.

| Etap | Model | Thinking | Czas Claude'a | Stan |
| --- | --- | --- | --- | --- |
| E0 Fundament → 0.1.0 | Opus 5.5 | xhigh | zmierzone ok. 1,5 h | ✅ PR, czeka na CI i scalenie |
| E1 Model i silnik → 0.2.0 | Opus 5.5 | max | 2–3 h | ⏳ |
| E2 Import mBank → 0.3.0 | Opus 5.5 | xhigh | 1,5–2,5 h | ⏳ (potrzebny CSV z mBanku) |
| E3 Start i plan miesiąca → 0.4.0 | Opus 5.5 | xhigh | 2–3 h | ⏳ |
| E4 Mostek i szybki wpis → **1.0.0** | Opus 5.5 | xhigh | 2–3 h | ⏳ |
| 🏁 **MVP = 1.0.0** (E0–E4, D51) | | | **razem ok. 9–13 h** | |
| E5 ICTTJ i dokowanie | Opus 5.5 | max | 2–3 h | ⏳ |
| E6 Radar i należności | Opus 5.5 | xhigh | 1,5–2 h | ⏳ |
| E7 Dowództwo | Opus 5.5 | max | 2–3 h | ⏳ |
| E8 Wywiad i raporty | Opus 5.5 | xhigh | 2,5–3,5 h | ⏳ |
| E9 Pierwszy oficer (opcjonalnie) | Opus 5.5 | xhigh | 1,5–2 h | ⏳ |
| **Całość E0–E9** | | | **ok. 21–30 h** | |

Dla porównania (prośba użytkownika 16.10): programista człowiek potrzebowałby wielokrotnie więcej – E0 ok. 1–2 tygodni,
MVP ok. 2–3 miesięcy, całość ok. 4–6 miesięcy (szacunek zgrubny).

## E0 – fundament (16.10.2026)

Zrobione (kryteria z `plan.md`):
- Stos jak ICTTJ (Electron 44, React 19, TS 6, Vite 7, Tailwind 4), build portable + NSIS, ikona (`scripts/make-icon.mjs`).
- CI: Linux (Node 22.12 / 24 / 26: typecheck, testy, build, sekcja CHANGELOG), E2E na Linuksie pod Xvfb, blokada Node
  22.11, Windows (build-windows.cmd, smoke spakowanej aplikacji, test aktualizacji portable i instalatora, wydanie).
- Folder danych przeniesiony z ICTTJ: zapis atomowy, historia `.history/`, konflikty kopii OneDrive i duplikatów,
  scalanie zmian z drugiego komputera, wpis przeniesiony zmianą daty, kopie (30 dziennych, ręczne, przed migracją),
  watcher, obecność komputerów; `fi.json` z `schemaVersion` 1.
- Pierwsze uruchomienie: propozycja `OneDrive\FinancialIntel` (D62) albo inny folder; zapamiętany folder przy kolejnym
  starcie.
- Zasobnik (zamknięcie chowa – D64), start z Windows ukryty w zasobniku (przełącznik), jedna instancja, logi.
- Aktualizacje z GitHub Releases (repozytorium publiczne – D61), token opcjonalny.
- Wygląd = tokeny ICTTJ; menu boczne (D44) ze wszystkimi ekranami (E5+ przygaszone – D65), puste ekrany z planowanymi
  panelami: zwijanie, powiększanie, ukrywanie, wysokość i szerokość, osobne okno, zapisane układy; paleta komend,
  skróty Ctrl+1…0, ściąga F1; Ustawienia: Okręt (nazwa okrętu, praca na kilku komputerach), Folder i kopie,
  Zasobnik i start, Aktualizacje; Synchronizacja (konflikty, pliki z błędami, usunięte wpisy, historia).
- Testy: `tests/unit`, `tests/fs`, `tests/e2e` (smoke, panele, ustawienia, synchronizacja), `tests/update` (Windows CI).
- Poprawka względem ICTTJ: zachowanie kopii konfliktu pliku ustawień przekazuje nowe ustawienia do okna (w ICTTJ
  `journal.json` zostawał w oknie stary i autozapis mógł nadpisać zachowaną kopię – do zgłoszenia w ICTTJ).

Do sprawdzenia przez użytkownika (Windows 11):
1. Pobrać `Financial-Intel-Setup.exe` i `Financial-Intel-portable.exe` z wydania v0.1.0 (albo z artefaktu PR).
2. Pierwsze uruchomienie → „Utwórz w OneDrive” → w OneDrive powstaje `FinancialIntel\fi.json`.
3. Menu boczne, ekrany, panele (zwiń, powiększ, ukryj, osobne okno na drugim monitorze), Ctrl+K, F1.
4. Ustawienia → Okręt: nazwa okrętu; Zasobnik i start: start z Windows → restart komputera → ikona w zasobniku.
5. Zamknięcie okna chowa do zasobnika, „Zakończ” w menu ikony kończy.
6. Aktualizacja: po wydaniu 0.1.1 / 0.2.0 aplikacja sama ją pobierze i zainstaluje przy zamknięciu.

## Przed etapem E0 (zapis komunikatu z 16.10.2026)

1. **Co trzeba wiedzieć** – zakres: fundament (stos, CI, instalator i portable, aktualizacje, folder danych, zasobnik
   i autostart, menu boczne i puste ekrany w stylu ICTTJ, szkielet ustawień); kod przenoszony z ICTTJ @ 84a8339.
2. **Pytania z propozycją** (odpowiedzi użytkownika: wszystko zgodnie z propozycją, repozytorium publiczne) – D61–D66.
3. **Co przygotować** – nic przed startem; po wydaniu 0.1.0 test na Windows (lista wyżej). Token GitHub niepotrzebny
   (repozytorium publiczne).
4. **Model, thinking, czas** – Opus 5.5 · high (plan), z górką xhigh.

## Dziennik

- 16.10.2026 – specyfikacja, decyzje i plan po wywiadzie z użytkownikiem (rozmowa w Claude, nie w repozytorium).
- 16.10.2026 – przegląd punktów styku z ICTTJ (D54–D60): konto tradingowe tylko w ICTTJ, bez etapu „Okręt bojowy”,
  bez kosztów i bilansu tradingu; menu boczne potwierdzone (D44).
- 16.10.2026 – „Przed etapem E0”: D61 (repozytorium publiczne), D62–D66; roadmapa z modelem i thinking z górką.
- 16.10.2026 – E0 zrobiony (0.1.0), PR do `main`.
