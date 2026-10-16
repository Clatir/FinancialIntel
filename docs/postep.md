# Financial Intel – postęp

**Stan:** przed etapem E0. Kodu jeszcze nie ma; w repozytorium są tylko `CLAUDE.md` i `docs/`.
**Następny krok:** komunikat „Przed etapem E0”, potem czekamy na „start” użytkownika.

## Kolejka prac

| Etap | Model · thinking | Czas | Stan |
| --- | --- | --- | --- |
| E0 Fundament | Opus 5.5 · high | 3–4 h | nie rozpoczęty |
| E1 Model i silnik | Opus 5.5 · xhigh | 4–5 h | nie rozpoczęty |
| E2 Import mBank | Opus 5.5 · high | 3–4 h | nie rozpoczęty |
| E3 Start i plan miesiąca | Opus 5.5 · high | 4 h | nie rozpoczęty |
| E4 Mostek i szybki wpis → 1.0.0 | Opus 5.5 · high | 4–5 h | nie rozpoczęty |
| E5 ICTTJ i dokowanie | Opus 5.5 · xhigh | 4 h | nie rozpoczęty |
| E6 Radar i należności | Opus 5.5 · high | 3 h | nie rozpoczęty |
| E7 Dowództwo | Opus 5.5 · xhigh | 4 h | nie rozpoczęty |
| E8 Wywiad i raporty | Opus 5.5 · high | 5–6 h | nie rozpoczęty |
| E9 Pierwszy oficer (opcjonalnie) | Opus 5.5 · high | 3 h | nie rozpoczęty |

## Przed etapem E0

1. **Co trzeba wiedzieć**
   - Zakres: fundament aplikacji – stos, CI, instalator i portable, aktualizacje, folder danych, zasobnik
     i autostart, menu boczne i puste ekrany w stylu ICTTJ, szkielet ustawień.
   - Większość kodu przenosimy z ICTTJ (lista w `specyfikacja.md`, sekcja „Technika”).
2. **Pytania z propozycją**
   - Domyślny folder danych: `OneDrive\FinancialIntel` (propozycja).
3. **Co przygotować**
   - Prywatne repozytorium `Clatir/FinancialIntel` z tymi plikami.
   - Dostęp sesji do `Clatir/TradingJournal` tylko do odczytu.
   - Po pierwszym wydaniu: token GitHub (fine-grained, tylko odczyt zawartości repozytorium FinancialIntel) wpisany
     w Ustawieniach → Aktualizacje na każdym komputerze, jak w ICTTJ.
4. **Model, thinking, czas:** Opus 5.5 · high, 3–4 h.

## Dziennik

- 16.10.2026 – specyfikacja, decyzje i plan po wywiadzie z użytkownikiem (rozmowa w Claude, nie w repozytorium).
- 16.10.2026 – przegląd punktów styku z ICTTJ (D54–D60): konto tradingowe tylko w ICTTJ, bez etapu „Okręt bojowy”,
  bez kosztów i bilansu tradingu; menu boczne potwierdzone (D44).
