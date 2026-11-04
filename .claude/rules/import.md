---
paths:
  - "src/shared/import/**"
  - "src/renderer/features/import/**"
  - "src/main/bankFiles.ts"
  - "tests/fixtures/mbank/**"
  - "tests/unit/import*.test.ts"
  - "tests/unit/mbank.test.ts"
  - "tests/unit/duplicates.test.ts"
  - "tests/unit/officer.test.ts"
  - "tests/unit/rules-audit.test.ts"
  - "tests/unit/bank-files.test.ts"
  - "tests/fs/bank-files.test.ts"
  - "tests/e2e/import*.spec.ts"
  - "tests/e2e/duplicates.spec.ts"
  - "tests/e2e/learning.spec.ts"
  - "src/renderer/store/bankFiles.ts"
  - "src/renderer/store/officer.ts"
  - "src/renderer/features/settings/ImportTab.tsx"
---

# Import z mBanku

## Przepływ
- `text.ts` (`decodeText`: BOM UTF-8 / UTF-16, UTF-8, Windows-1250; `parseCsv`; `IMPORT_MAX_BYTES`) → `mbank.ts`
  (`parseMbank` – „Lista operacji” / „Historia rachunku”, `splitDescription`; klucz wiersza zależy od konta –
  `keyOnAccount`) → `classify.ts` (`classifyRow`, `findRule`) → `reconcile.ts` (`planImport` → known / settle / merge /
  new / deleted / elsewhere; `buildImport`).
- `runImport` (`features/import/state.ts`): tylko do odczytu → zapis zmian → kopia (`backups/pre-import`) → plan od
  nowa → `buildImport` → zapis paczką z rekordem `imports/` (cofnięcie: `shared/import/batch.ts`) → reguły i nazwiska.
  Zmiana tylko kluczy (`keysOnly` – same `altKeys`) to „bez zmian”: bez kopii i paczki (T323).
- Usunięte operacje z banku: `shared/import/deleted.ts` (`deletedBankRows` – klucze z `altKeys`, `DeletedRow` z formatem;
  `returnedOf` – meldunek „Wróciły po usunięciu”, tylko `madeByItsImport`), w oknie `features/import/returned.ts`
  (T320, T324, T330–T332). **Pułapka:** czasów z różnych komputerów (`lastImport`, `importedAt`) nie porównuj „później
  niż” – zegary się różnią; porównuj, czy się zmieniły (`importsMark`, T332) – z dziennikiem `log` (klucz na import;
  scalenie `fi.json` zostawia przy koncie jeden czas) i tylko z tym, co jest w folderze, nigdy z czasem dopisanym tutaj.
- Konto importu po numerze rachunku pliku (`accountForNumber`, T322); jedna operacja i jej kopie – `copies.ts`.
  **Pułapka:** `conflicting` nie porównuje `covers` – usuwana kopia oddaje spłacane zakupy przez `takeUserData` (ta sama
  decyzja albo pieniądze tych samych domowników – `takesCovers`), a kopia, której zakupów operacja tutaj nie przejmie,
  nie jest zaznaczona (`coversOtherwise`, `dropsCovers`; T321, T333).
- Pliki z banku w Pobranych: `main/bankFiles.ts` + `shared/import/bankFiles.ts`.

## Rozpoznanie
- Kolejność: reguła (`findRule`: marka → cała nazwa → „zawiera” → słowo użytkownika; tryb `amount` z `maxAmount`) →
  pożyczka z Radaru → przelew własny → domownik → XTB → bankomat, zwrot towaru, opłata banku. Pożyczka tylko otwarta
  i od dnia jej udzielenia – z regułą i bez (`loanFor`). Reguła innego rodzaju ustępuje pożyczce, domownikowi i XTB
  (`ruleGivesWay`, T325); słowo z tytułu i przelew własny zostają regułą. Audyt reguł (`audit.ts`) zgłasza tylko to,
  czemu reguła ustępuje teraz – ta sama `loanFor`.
- Decyzja zbiorcza nie zmienia pożyczki, PIT-38, XTB ani pieniędzy domownika decyzją innego rodzaju (`bulkKeeps`, T326);
  „+ domownik” tylko przy zwykłym wpływie od obcej osoby (`offersNewMember`).
- „w tym za X” (D81): części wierszy liczy tylko `rowShares` – grupa / temat rozkłada kwotę po kolei, najwyżej to, co X
  ma oddać z zakupami pliku, bez jego własnych wpłat pliku (`owedWithFile`, T328); ekran (`sharesView`, uwagi przy linii
  `lineSpreads` – zawsze jednej decyzji) i `runImport` z tego samego. Temat z decyzją swoich marek (N78 – `themeShows`,
  `themeCommon`: decyzja pierwszej marki, nic nie sumowane): bez linii z kwotą zmiana tam to decyzja tematu; kilka marek
  z liniami ('brands') – linie zostają w markach, zmiana w temacie trafia do każdej marki (`chooseThemeRow`, T336).
  **Pułapka:** kwota tematu jest dla wszystkich jego wierszy razem, kwota marki – dla jej wierszy: nie składaj linii marek
  w jedną decyzję tematu (przeglądy N1 2–4: raz o połowę mniej, raz więcej, raz zgubiona kwota). **Pułapka:** `sameChoice`
  pomija linie 0 zł – do „czy wiersz ma własną decyzję” nie wystarcza (`rowSharesChoice`, T327).
- Wpłata domownika (AP-4, T351): opcje `household:<osoba>:income|advance|all-income|all-advance`, jedna nazwa wyboru
  (`MEMBER_MONEY_TEXT` – lista, temat, podgląd, reguła). „spłata, reszta jako …” = `inflowKind: 'repay'` + `advance`.
  Reguła reszty nie zapamiętuje – „spłata” bierze ją z ustawienia osoby (D80 b, `restNotOfRule` w edytorze reguły).
  **Pułapka:** opcja „reszta jako zaliczka” nigdy `inflowKind: 'advance'` (AF-8 – reguła uczyła się omijać dług).
  **Pułapka:** zmiana w liście w obrębie tej samej osoby zostawia linie „w tym za” i części pożyczki (`listChoice` – cel
  wpłaty, T336); `choiceFor` sam linii nie niesie (inny rodzaj).
- Spłata pożyczki częścią (D100, T357): linia „w tym” z `loanId` (`memberId` '') przy każdym wpływie (domownika i
  zwykłym); w `rowShares` pożyczka to klucz `loanKey` – dług z `owedWithFile(…, loans)`, spłaty całością pliku jak własne
  pieniądze. `sharesView` wszędzie z `fleet.loans` (jedna pamięć). **Pułapka:** linie porównuj po `shareWho`, nie
  `memberId`; bez pożyczki w `owed` część grupy = 0 (zamknięta – słusznie). **Pułapka:** część z reguły (`each`) to
  kwota każdej wpłaty, linia grupy / tematu – razem (T328): zmiana z listy ją zostawia (`each` zostaje), zmiana kwoty
  albo pożyczki linii zdejmuje `each`; `loanAmount` reguły tylko z kwoty każdej wpłaty (`ruleDecisionOf(c, rows)`, T368).
- Rodzaje `PER_OPERATION_KINDS` (pożyczka, PIT-38, XTB) nigdy regułą – poza spłatą pożyczki z Radaru (T358: `loanId`,
  `loanAmount`; tylko otwarta od swojego dnia – `ruleLoanFor`; „zapamiętaj” domyślnie wyłączone – `remembersByDefault`
  w `groupsDecided`, jedynym księgowaniu decyzji grup).
  Kategoria mBanku tylko jako podpowiedź (`hintFor`).
- Bankomat (D100, AP-33, T422): przelew własny pliku → konto gotówki (`ClassifyContext.cash` z `cashAccountOf`, nigdy
  konto pliku), bez niego wydatek „Gotówka” i propozycja konta przy pliku (`features/import/cash.tsx`). **Pułapka:**
  reguła wydatku „Gotówka” na wypłacie ustępuje przelewowi (`isCashExpenseRule`) – dlatego „zapamiętaj” jej nie uczy
  przy koncie gotówki (`ImportPlan.cash`); nowe wejście planu z ustawień dopisz do `PlanInputs` (tu: `accounts`).
- Nazwy czyszczone `cleanBankName`; klucze sprzed 1.2.3 (`bankName`, `RuleTarget.legacy`) muszą dalej pasować –
  zmiana kluczy nie może osierocić reguł zapisanych w folderach użytkownika.
- Łączenie i duplikaty: `looseMatch` (kwota, ±3 dni, podobieństwo kontrahenta), także między kontami; decyzja
  użytkownika („Nie łącz”, `notDuplicates`, `notSimilar`) zawsze wygrywa. **Pułapka:** `notDuplicates` trzyma też
  „zostaw” innych meldunków (`back:`, `correction:`, `transfer:`, `transfer-lone:`, AP-4: `advanceRule:`, `advanceKept:`) –
  pary panelu duplikatów tylko przez `isDuplicatePairKey`; klucz nowego meldunku – z przedrostkiem dopisanym do
  `REPORT_KEY_PREFIXES` (`import/duplicates.ts`).
- Tożsamość wiersza między formatami (B5) to miara, nie klucz – stosuj ją wszędzie, gdzie działa klucz: przy usuniętych
  (T320), na kontach tego samego numeru rachunku (T321), przy rozliczeniu (stary klucz w `altKeys`, T323). Kolejność
  przejść planu ma znaczenie: B5 tutaj bierze też wiersze `elsewhere` z B35 (kopia → `RowCopy`, „usuń duplikat”), a
  usunięte – po wszystkich przejściach „już w budżecie”.
- **Pułapka:** rekord usunięty przez sam import nie jest usunięciem użytkownika – tylko jego klucze zatrzymują wiersz;
  usuwaj go z `reason: 'import'` (znak `byImport` w historii, T331) i dopisuj do paczki, nie usuwaj obok niej – także
  ponownie przy „Cofnij” cofnięcia importu (`redoImport`).
- **Pułapka:** połączenie z ręcznie wpisaną i rozliczenie nadpisują `bank` (`importedAt`, `source`) – „kiedy i jakim
  plikiem przyszedł wiersz” to nie „kiedy import zrobił operację” (`createdAt`, T330).

## Wydajność
- Pamięć `brandOf` / `counterpartyKey` do 50 tys.; plan od nowa tylko przy zmianie treści (`BY_CONTENT` + `deepEqual`);
  listy ekranu po 100 (`ShowMore`), `memo` tematów, marek i wierszy. Wiersz bez linii nie czyta rozkładu pliku przy
  każdej zmianie – tylko przycisk (`rowPartsOf` 'add'); audyt reguł zależy od tekstu `advanceRulesKept`, nie od całej
  mapy `notDuplicates` (przegląd N2 2.13–2.14).

## Dane testowe
- `tests/fixtures/mbank/` – tylko pliki zanonimizowane (T44) albo syntetyczne; nigdy dane użytkownika. Zostają z CRLF
  i BOM jak z banku (`.gitattributes`: `tests/fixtures/** -text`).

Szczegóły i powody zmian: `docs/archiwum/claude-md-do-1.15.4.md` (Grep po nazwie funkcji) i `docs/decyzje.md`.
