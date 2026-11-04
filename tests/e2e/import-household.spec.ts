import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { importDone, launch } from './app'
import { records } from './files'
import { listaCsv, type CsvTransfer } from './mbank-csv'
import { seedFolder, zl } from './seed'

const FUEL = '01KDEFCAT00000000000000301'
const LOAN = '01KN1HPZYCZKA0000000000001'
const AT = '2026-01-01T00:00:00.000Z'

/** The file dialog of the main process answers with `path` (a dialog cannot be clicked in a test). */
async function answerFileDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

async function importFile(app: ElectronApplication, page: Page, path: string): Promise<void> {
  await answerFileDialog(app, path)
  await page.getByTestId('import-pick').click()
  await expect(page.getByTestId('import-file')).toBeVisible()
}

const group = (page: Page, label: string) => page.locator(`[data-testid="import-group"][data-label="${label}"]`).first()
let ruleSeq = 0
const rule = (match: string, over: Record<string, unknown> = {}) => ({ id: `01KN1HRYYY${String(++ruleSeq).padStart(16, '0')}`, match, mode: 'exact', direction: 'in', label: match, kind: 'expense', categoryId: FUEL, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 1, updatedAt: AT, ...over })

test('AP-6: zwrot pożyczki z Radaru przed regułą „zwrot towaru”, decyzja zbiorcza go nie zabiera, „+ domownik” tylko przy obcym, reguła do poprawy w „niespójne”', async () => {
  const { date: today, month } = warsawNow()
  const dir = mkdtempSync(join(tmpdir(), 'fi-ap6-'))
  const dataDir = join(dir, 'FinancialIntel')
  const userData = join(dir, 'userData')
  const transfers: CsvTransfer[] = [
    { date: addDays(today, -3), amount: 300, name: 'TOMASZ KOLEGA', title: 'ZWROT POZYCZKI 2' },
    { date: addDays(today, -4), amount: 900, name: 'XTB SPÓŁKA AKCYJNA', title: 'WITHDRAWAL' },
    { date: addDays(today, -4), amount: 250, name: 'JAN KAPITAN', title: 'PRZELEW' },
    { date: addDays(today, -2), amount: 80, name: 'MAREK OBCY', title: 'ZA BILETY' }
  ]
  const file = join(dir, 'lista_operacji.csv')
  writeFileSync(file, listaCsv([{ date: addDays(today, -5), amount: 210, name: 'ORLEN STACJA 7' }], { from: addDays(today, -8), to: addDays(today, -1) }, null, transfers))
  const mistaken = rule('tomaszkolega', { label: 'TOMASZ KOLEGA' })
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start: `${addMonths(month, -3)}-01` },
      // Before the fix: one click made Tomasz's repayment a product return of fuel – the rule kept it; a loan's rule of
      // before 1.5.1 catches nothing (a proposal only), another rule nothing either.
      import: { ...s.import, ownNames: ['JAN KAPITAN'], rules: [...s.import.rules, mistaken, rule('pozyczkastara', { kind: 'loan', categoryId: null }), rule('niktnikt')] }
    }),
    records: {
      loans: [{ id: LOAN, name: 'Pożyczka dla Tomka', direction: 'given', counterparty: 'Tomasz Kolega', amount: zl(2000), date: addDays(today, -60) }],
      transactions: [
        {
          date: addDays(today, -20),
          accountId: MBANK_ACCOUNT_ID,
          kind: 'expense',
          amount: zl(500),
          categoryId: FUEL,
          counterparty: 'TOMASZ KOLEGA',
          title: 'ZWROT POZYCZKI',
          bank: { format: 'mbank', key: 'mbank:old-tomasz:0', description: 'TOMASZ KOLEGA, ZWROT POZYCZKI PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', counterparty: 'TOMASZ KOLEGA', operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', category: '', pending: false, importedAt: AT, source: 'lista' }
        }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir, userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await importFile(app, page, file)
    const search = page.getByTestId('import-search')

    // The loan of the Radar before the rule of another kind on its borrower's name; no „+ domownik” there.
    await search.fill('kolega')
    await expect(group(page, 'TOMASZ KOLEGA').getByTestId('import-group-kind')).toHaveValue(`loan:${LOAN}`)
    await expect(group(page, 'TOMASZ KOLEGA').getByTestId('import-group-new-member')).toHaveCount(0)
    // „+ domownik” only at a stranger's money (AF-62): not the holder's own transfer, not XTB.
    for (const [q, label, n] of [['xtb', 'XTB SPÓŁKA AKCYJNA', 0], ['kapitan', 'JAN KAPITAN', 0], ['marek', 'MAREK OBCY', 1]] as const) {
      await search.fill(q)
      await expect(group(page, label)).toBeVisible()
      await expect(group(page, label).getByTestId('import-group-new-member')).toHaveCount(n)
    }

    // The one-click mistake again (IM.10): Orlen and Tomasz ticked, „Wydatek / zwrot towaru – Auto · paliwo” – the loan's
    // repayment stays, counted as not fitting.
    await search.fill('orlen')
    await page.getByTestId('import-select-visible').click()
    await search.fill('kolega')
    await page.getByTestId('import-select-visible').click()
    await page.getByTestId('import-bulk-kind').selectOption('expense')
    await page.getByTestId('import-bulk-category').selectOption({ label: 'Auto · paliwo' })
    await page.getByTestId('import-bulk-apply').click()
    await expect(page.getByRole('status').filter({ hasText: 'Ustawiono dla 1' })).toContainText('1 nie pasuje (zwrot pożyczki, XTB, PIT-38 i wpłatę domownika zmienisz tylko w ich grupie)')
    await expect(group(page, 'TOMASZ KOLEGA').getByTestId('import-group-kind')).toHaveValue(`loan:${LOAN}`)
    await page.getByTestId('import-bulk-clear').click()
    await search.fill('')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect
      .poll(async () => (await records(dataDir, 'transactions')).filter((t) => t.counterparty === 'TOMASZ KOLEGA').map((t) => [t.kind, t.amount, t.loanId ?? null]).sort())
      .toEqual([
        ['expense', zl(500), null],
        ['loan', zl(300), LOAN]
      ])

    // Ustawienia → Import z banku → Reguły importu: the rule on the borrower's name in „niespójne” with the operation to
    // fix; „bez trafień” – as many as its count, never the loan's rule (AF-64).
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await page.getByTestId('import-rules-show-differ').click()
    const tomasz = page.locator('[data-testid="import-rule"][data-match="tomaszkolega"]')
    await expect(tomasz.getByTestId('import-rule-borrower')).toHaveText('1 do poprawy')
    await tomasz.getByTestId('import-rule-borrower').click()
    await expect(tomasz.getByTestId('import-rule-borrower-note')).toContainText('Pożyczka dla Tomka')
    await expect(tomasz.getByTestId('import-rule-borrower-row')).toHaveCount(1)
    await page.getByTestId('import-rules-show-idle').click()
    const idle = Number((await page.getByTestId('import-rules-show-idle').textContent())!.match(/\((\d+)\)/)![1])
    await expect(page.getByTestId('import-rule')).toHaveCount(idle)
    await expect(page.locator('[data-testid="import-rule"][data-match="pozyczkastara"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="import-rule"][data-match="niktnikt"]')).toHaveCount(1)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-7: „+ w tym za Babcia” w wierszu zostaje i startuje od jej długu; w grupie rozkład po kolei – raz, z lekami', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  const TATA = '01KN1STATA0000000000000001'
  const BABCIA = '01KN1SBABC0000000000000002'
  const LEKI = '01KN1SPZYCZKA0000000000003'
  const dir = mkdtempSync(join(tmpdir(), 'fi-ap7-'))
  const dataDir = join(dir, 'FinancialIntel')
  const userData = join(dir, 'userData')
  const earlier = addDays(today, -6)
  const later = addDays(today, -3)
  const file = join(dir, 'lista_operacji.csv')
  writeFileSync(
    file,
    listaCsv([], { from: addDays(today, -8), to: addDays(today, -1) }, null, [
      { date: later, amount: 300, name: 'PIOTR TESTOWY', title: 'OD TATY I BABCI' },
      { date: earlier, amount: 200, name: 'PIOTR TESTOWY', title: 'ZWROT ZA KURS XTB' }
    ])
  )
  const person = (id: string, name: string, over: object = {}) => ({ id, name, bankNames: [] as string[], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 }, ...over })
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      household: { since: start, assignFrom: start, members: [...s.household.members, person(TATA, 'Tata', { bankNames: ['PIOTR TESTOWY'] }), person(BABCIA, 'Babcia', { via: TATA })] }
    }),
    records: {
      balances: [{ date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) }],
      // „Leki dla Babci”: she owes them back (IM.25).
      transactions: [{ id: LEKI, date: addDays(today, -10), accountId: MBANK_ACCOUNT_ID, amount: -zl(100), categoryId: '01KDEFCAT00000000000000500', counterparty: 'Apteka', refundable: true, memberId: BABCIA }]
    }
  })
  const { app, page, errors } = await launch({ dataDir, userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await importFile(app, page, file)
    await page.getByTestId('import-search').fill('piotr')
    const tata = group(page, 'PIOTR TESTOWY')
    await tata.getByTestId('import-group-toggle').click()
    const laterRow = tata.locator('[data-testid="import-row"]', { hasText: 'OD TATY I BABCI' })
    const earlierRow = tata.locator('[data-testid="import-row"]', { hasText: 'ZWROT ZA KURS XTB' })

    // The row: „+ w tym za Babcia” with what she owes back – the line stays (IM.25: it vanished at once); „jak grupa” back.
    await expect(laterRow.getByTestId('import-row-also-for-via')).toHaveText('+ w tym za Babcia (ma oddać 100,00 zł)')
    await laterRow.getByTestId('import-row-also-for-via').click()
    await expect(laterRow.getByTestId('import-row-also-for-amount')).toHaveValue('100,00')
    await expect(laterRow.getByTestId('import-row-also-for-line')).toHaveCount(1)
    await laterRow.getByTestId('import-row-reset').click()
    await expect(laterRow.getByTestId('import-row-also-for-line')).toHaveCount(0)

    // The group: from her debt too, spread over Tata's transfers in their order – once, from the earlier one.
    await tata.getByTestId('import-group-also-for-via').click()
    await expect(tata.getByTestId('import-group-also-for-amount')).toHaveValue('100,00')
    await expect(tata.getByTestId('import-group-also-for-spread')).toHaveText(`z wpłaty ${earlier.slice(8, 10)}.${earlier.slice(5, 7)} 100,00 zł`)
    // Decided, the group moved to „Gotowe” (shown closed): its rows again – the earlier one carries her part, the later none.
    if (!(await tata.getByTestId('import-group-rows').isVisible())) await tata.getByTestId('import-group-toggle').click()
    await expect(earlierRow.getByTestId('import-row-also-for-amount')).toHaveValue('100,00')
    await expect(laterRow.getByTestId('import-row-also-for-line')).toHaveCount(0)
    // More than she owes: still her debt only.
    await tata.getByTestId('import-group-also-for-amount').click()
    await tata.getByTestId('import-group-also-for-amount').fill('150')
    await tata.getByTestId('import-group-also-for-amount').press('Enter')
    await expect(tata.getByTestId('import-group-also-for-spread')).toContainText('100,00 z 150,00 zł (tyle Babcia ma oddać)')
    await page.getByTestId('import-search').fill('')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect
      .poll(async () =>
        (await records(dataDir, 'transactions'))
          .filter((t) => t.counterparty === 'PIOTR TESTOWY')
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))
          .map((t) => [t.date, (t.splits as Array<{ memberId: string; amount: number }>).map((x) => [x.memberId, x.amount]), t.covers])
      )
      .toEqual([
        [earlier, [[BABCIA, zl(100)]], [LEKI]],
        [later, [], []]
      ])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
