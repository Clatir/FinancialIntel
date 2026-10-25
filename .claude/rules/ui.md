---
paths:
  - "src/renderer/**"
---

# Okno (renderer)

- Pola kwot, dat, godzin, miesięcy i nazw zapisują po wyjściu z pola (`AmountField`, `DateField`, `TimeField`,
  `MonthField`, `NameInput`); teksty przez `useTextDraft` (Enter / Ctrl+Enter zatwierdza, Esc cofa). Akcja czytająca
  formularz woła najpierw `commitActiveField` (`store/ui.ts`, T34).
- Szkice formularzy w pamięci okna (`store/drafts.ts` `useDraft`); zmiana folderu je czyści.
- Kwoty zawsze przez `plnText` / `signedPln` (maskowanie przy ukrytych kwotach – flaga ustawiana przy każdym renderze,
  nic nie jest memoizowane) i `formatPln`; liczebniki przez `plural` / `countLabel`.
- Selektory zustand zwracają prymitywy albo istniejące referencje (nowy obiekt w selektorze = pętla renderów).
- Długie listy po 100 (`ShowMore`), wiersze w `memo`; okna przez `Modal` (portal ze stosem, Esc zamyka wierzchnie).
- Usunięcia i zmiany zbiorcze z „Cofnij”; przy ważnych rekordach `HistoryButton`.
- Zapis zablokowany przy folderze tylko do odczytu albo w trakcie przełączania (`canWrite`, `useFolderLocked`);
  zapisy zwracają boolean.
- `data-testid` w kebab-case z prefiksem ekranu (`operation-…`, `import-…`, `quick-…`, `phone-…`); stan w `data-*`
  (`data-state`, `data-kind`), nie w tekście.
- Skróty: Ctrl+1…0 ekrany, Ctrl+N nowa operacja (każdy ekran), Ctrl+S zapis, Ctrl+$ ukrycie kwot, Ctrl+Shift+M meldunki,
  Ctrl+Plus / Minus / Shift+0 rozmiar; ściągawka F1.
- Ekrany komputera są używane też na telefonie – układ przez `CompactContext` / `Columns`, bez osobnych kopii ekranów.
