import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { importDone, launch } from './app'
import { json, records } from './files'
import { listaCsv } from './mbank-csv'
import { seedFolder, zl } from './seed'

// D100 (2): any inflow – also from someone other than the borrower – repays a loan given, whole or a part: the quick
// entry, the import (a group's part), the Operations editor; the Radar's row says who paid.
const GROCERIES = '01KDEFCAT00000000000000101'
const MAMA = '01KMEMMAMA0000000000000001'
const JAN = '01KN2EJAN00000000000000001'
const mama = { id: MAMA, name: 'Mama', bankNames: ['ANNA NOWAK'], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 } }
type Split = { memberId: string | null; loanId?: string; amount: number }

async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

async function typeAmount(target: Locator, text: string) {
  await target.click()
  await target.fill(text)
  await target.press('Enter')
}

/** Jan owes 1 000 zł (lent at the budget's start); Mama owes 350 zł for groceries she finances. */
function seed(dataDir: string) {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { since: start, assignFrom: start, members: [...s.household.members, mama] } }),
    records: {
      balances: [{ date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) }],
      loans: [{ id: JAN, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: zl(1000), date: start }],
      transactions: [
        { date: start, accountId: MBANK_ACCOUNT_ID, kind: 'loan', amount: -zl(1000), loanId: JAN, counterparty: 'JAN KOWALSKI' },
        { date: addDays(today, -10), accountId: MBANK_ACCOUNT_ID, amount: -zl(350), categoryId: GROCERIES, refundable: true, memberId: MAMA, counterparty: 'Sklep' }
      ]
    }
  })
  return { today }
}

test('D100: mama Jana spłaca jego pożyczkę szybkim wpisem – pożyczka 600 zł, w wierszu Radaru „kto zapłacił”', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-loans-n2q-')), 'FinancialIntel')
  seed(dataDir)
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Wpływ' }).click()
    await quick.getByTestId('quick-amount').fill('400')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-counterparty').fill('Ewa Kowalska')
    await expect(quick.getByTestId('quick-loan').locator('option')).toHaveText(['— nie —', 'Pożyczka dla Jana (zostało 1 000,00 zł)'])
    await quick.getByTestId('quick-loan').selectOption({ label: 'Pożyczka dla Jana (zostało 1 000,00 zł)' })
    // The whole inflow repays it – at most what is left, beside nothing else.
    await expect(quick.getByTestId('quick-loan-amount')).toHaveValue('400,00')
    await expect(quick.getByTestId('quick-preview-loan')).toHaveText('Spłata pożyczki Pożyczka dla Jana: 400,00 zł wraca do osłon (zostało 1 000,00 zł → 600,00 zł).')
    await quick.getByTestId('quick-save').click()
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'Ewa Kowalska').map((t) => [t.kind, t.amount, t.memberId, (t.splits as Split[]).map((s) => [s.memberId, s.loanId, s.amount])]))
      .toEqual([['income', zl(400), null, [[null, JAN, zl(400)]]]])

    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    const row = page.locator('[data-testid="loan-row"][data-name="Pożyczka dla Jana"]')
    await expect(row.getByTestId('loan-open')).toHaveText('600,00 zł')
    await expect(row).toContainText('oddane 400,00 zł z 1 000,00 zł')
    await expect(row.getByTestId('loan-payers')).toHaveText('kto zapłacił: Ewa Kowalska 400,00 zł')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('D100: import – 500 zł Mamy, w tym 200 zł spłaty pożyczki, reszta spłaca jej zakupy; edytor Operacji – część wpływu spłaca pożyczkę', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fi-loans-n2i-'))
  const dataDir = join(root, 'FinancialIntel')
  const userData = join(root, 'userData')
  const { today } = seed(dataDir)
  const file = join(root, 'lista_operacji.csv')
  writeFileSync(file, listaCsv([], { from: addDays(today, -5), to: addDays(today, -1) }, null, [{ date: addDays(today, -2), amount: 500, name: 'ANNA NOWAK', title: 'PRZELEW' }]))
  const { app, page, dataDir: dir, errors } = await launch({ dataDir, userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as typeof dialog.showOpenDialog
    }, file)
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-file')).toBeVisible()
    await page.getByTestId('import-search').fill('anna')
    const g = page.locator('[data-testid="import-group"][data-label="ANNA NOWAK"]').first()
    await expect(g.getByTestId('import-group-kind')).toHaveValue(`household:${MAMA}:income`)
    // A part of her money repays Jan's loan: it starts at what the loan still owes, at most the transfer.
    await g.getByTestId('import-group-loan-part-add').click()
    await expect(g.getByTestId('import-group-loan-part-amount')).toHaveValue('500,00')
    await typeAmount(g.getByTestId('import-group-loan-part-amount'), '200')
    await expect(g.getByTestId('import-group-loan-part-note')).toHaveText(/z wpłaty \d\d\.\d\d 200,00 zł/)
    // A loan's repayment is remembered as a rule only when asked (N14 the default).
    await expect(g.getByTestId('import-group-remember')).not.toBeChecked()
    await page.getByTestId('import-search').fill('')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'ANNA NOWAK').map((t) => [t.memberId, t.amount, (t.splits as Split[]).map((s) => [s.memberId, s.loanId, s.amount])]))
      .toEqual([[MAMA, zl(500), [[null, JAN, zl(200)]]]])
    expect((await json(join(dir, 'fi.json'))).settings.import.rules.filter((r: { loanId?: string }) => r.loanId)).toEqual([])

    // Mostek: her 300 zł repaid her groceries – she owes 50 zł.
    await page.keyboard.press('Control+1')
    await expect(page.locator('[data-testid="bridge-member"]', { hasText: 'Mama' })).toContainText('50,00 zł')

    // Operacje: a new inflow, its part repaying the loan – at most what is left of it.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByRole('radio', { name: 'Wpływ' }).click()
    await typeAmount(page.getByTestId('operation-amount'), '300')
    await page.getByTestId('operation-counterparty').fill('EWA KOWALSKA')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-loan-part').click()
    await expect(page.getByTestId('income-split-member')).toHaveValue(`loan:${JAN}`)
    await expect(page.getByTestId('income-split-amount')).toHaveValue('300,00')
    await typeAmount(page.getByTestId('income-split-amount'), '250')
    await expect(page.getByTestId('income-split-rest')).toHaveText('Reszta 50,00 zł – mój przychód.')
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'EWA KOWALSKA').map((t) => [t.kind, t.amount, (t.splits as Split[]).map((s) => [s.memberId, s.loanId, s.amount])]))
      .toEqual([['income', zl(300), [[null, JAN, zl(250)]]]])
    // The Operations list says which loan it repays.
    await expect(page.locator('[data-testid="operation-row"]', { hasText: 'EWA KOWALSKA' })).toContainText('spłata pożyczki: Pożyczka dla Jana')

    await page.keyboard.press('Control+7')
    const row = page.locator('[data-testid="loan-row"][data-name="Pożyczka dla Jana"]')
    await expect(row.getByTestId('loan-open')).toHaveText('550,00 zł')
    await expect(row.getByTestId('loan-payers')).toHaveText('kto zapłacił: Mama 200,00 zł · EWA KOWALSKA 250,00 zł')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

