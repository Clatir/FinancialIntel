---
paths:
  - "src/renderer/**"
---

# Okno (renderer)

- Wygląd = ICTTJ (przeniesione z CLAUDE.md 08.11.2026, T527): tokeny z jego `src/renderer/styles/index.css` (tło `#0b0d10`,
  panel `#111418`, podniesione `#161b21`, linia `#1e232a`, tekst `#c3cbd4` / `#e8edf2`, przygaszony `#7a838e`, akcent
  `#e8a33d`, plus `#2ebd85`, minus `#f6465d`); liczby `.num` (JetBrains Mono, cyfry tabelaryczne); jeden akcent; zieleń /
  czerwień tylko dla kwot na plus / minus; bez gradientów i cieni; panele z nagłówkiem, linie 1 px; animacje 120–160 ms
  (zdarzenia: dokowanie, awans, „miesiąc na plus” – dłużej, ale bez efekciarstwa).
- Nawigacja: menu boczne (D44, inaczej niż pasek u góry w ICTTJ); reszta komponentów jak ICTTJ (`components/`).
- Metafora zawsze z prawdziwą nazwą i kwotą obok („Osłony · bufor 8 640 zł”).
- Nowy wpis jest szkicem do pierwszej edycji; opuszczenie ekranu nigdy nie gubi zmian. Sklepy w `store/` (zustand,
  autozapis jak ICTTJ), ekrany w `features/<ekran>/`.

- Pola kwot, dat, godzin, miesięcy i nazw zapisują po wyjściu z pola (`AmountField`, `DateField`, `TimeField`,
  `MonthField`, `NameInput`); teksty przez `useTextDraft` (Enter / Ctrl+Enter zatwierdza, Esc cofa). Akcja czytająca
  formularz woła najpierw `commitActiveField` (`store/ui.ts`, T34).
- Szkice formularzy w pamięci okna (`store/drafts.ts` `useDraft`); zmiana folderu je czyści. **Pułapka (AP-8):** wpisana
  wartość w `useState` komponentu ginie przy zmianie ekranu – pole, które coś wpisuje, to szkic; pytanie przed zmianą
  („Zmień mimo to”) nie żyje w komponencie, tylko w sklepie i liczy się jako niezapisane (`store/guard.ts`, T319);
  odpowiedzi kreatora – szkic w `localStorage` per folder.
- „Zapisano.” tylko po zapisie na dysk (`writeNow`, T317); w folderze tylko do odczytu – powód (`status.readOnlyReason`).
- Kwoty zawsze przez `plnText` / `signedPln` (maskowanie przy ukrytych kwotach – flaga ustawiana przy każdym renderze,
  nic nie jest memoizowane) i `formatPln`; liczebniki przez `plural` / `countLabel`.
- Selektory zustand zwracają prymitywy albo istniejące referencje (nowy obiekt w selektorze = pętla renderów).
- Długie listy po 100 (`ShowMore`), wiersze w `memo`; okna przez `Modal` (portal ze stosem, Esc zamyka wierzchnie).
  Fokus uwięziony w oknie i wraca po zamknięciu (`useFocusTrap`, T442) – własna nakładka (paleta, F1) też go używa.
- Usunięcia i zmiany zbiorcze z „Cofnij”; przy ważnych rekordach `HistoryButton`.
- Zapis zablokowany przy folderze tylko do odczytu albo w trakcie przełączania (`canWrite`, `useFolderLocked`);
  zapisy zwracają boolean.
- `data-testid` w kebab-case z prefiksem ekranu (`operation-…`, `import-…`, `quick-…`, `phone-…`); stan w `data-*`
  (`data-state`, `data-kind`), nie w tekście.
- Skróty: Ctrl+1…0 ekrany, Ctrl+N nowa operacja (każdy ekran), Ctrl+S zapis, Ctrl+$ ukrycie kwot, Ctrl+Shift+M meldunki,
  Ctrl+Plus / Minus / Shift+0 rozmiar; ściągawka F1.
- Ekrany komputera są używane też na telefonie – układ przez `CompactContext` / `Columns`, bez osobnych kopii ekranów.
- **Nic po cichu (AP-15, T400):** odmowa i przycięcie mają komunikat przy polu (w oknie szybkiego wpisu toasty idą do stopki;
  Enter wstrzymuje tylko odmowa, słowo o przycięciu z tego samego działania wraca z „Zapisano” – T413, T417).
  `NumberField` mówi sam (`range`), kwoty `amountRefusal`, zakres „od / do” – `orderRange` (zamiana ze słowem), limit długości
  – `LimitHint` (pola z `maxLength`), wyłączony przycisk podaje powód obok. Esc w polu = cofnięcie wpisu; w szybkim wpisie
  Esc = „×” (szkic zostaje).
- **Cofnij i potwierdzenia (AP-22, T401):** usunięcie, rozłączenie i zrzut mają toast „Cofnij” (min. 8 s); działanie
  nieodwracalne z aplikacji (Kosz, token, przerwanie kreatora) – `ConfirmButton`, nigdy własny dwuklik. „Cofnij” cofa tylko
  to, co nadal jest jak zostawiło je działanie – zmienione od tego czasu zostaje ze słowem (`undoKept`, T418).
- **Teksty (AP-23, T403):** daty tylko `plDate` / `plDateTime` (dd.mm.rrrr – nigdy ISO ani `toLocaleString`), liczby z
  przecinkiem i minusem „−” (`decimalText`, `percentText`; stopa oszczędności `rateText` zawsze z jednym miejscem),
  liczebniki `countLabel` / `salariesText`, imiesłów zgodny z rzeczownikiem. Kody decyzji (D…, T…, B…, F…, AF-…) i „spec”
  tylko w komentarzach (`tests/unit/ui-no-codes.test.ts` pada na każdym w tekście). Błąd systemu, JSON, ZIP i zod
  przechodzi przez `plainError` (`errorMessage` w oknie robi to sam); nowy termin ICT – do `ICT_GLOSSARY`, nowa linia
  Stanu okrętu – dymek z `glossaryOf`.
