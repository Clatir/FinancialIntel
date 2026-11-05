// N5 (1.15.9), AP-19: the quick entry asks a member „pytaj” for the rest of their money (SW sp. 3), never asks „plan czy
// impuls?” of a member's purchase (AF-22) nor names a member nobody chose (SW.12); „Pokaż zakupy” in Meldunki shows that
// member's purchases still to be paid back (AF-58); Alt+P of AP-20 marks nothing on a member's purchase.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'
const MAMA = '01KMEMMAMA0000000000000001'
const TATA = '01KMEMTATA0000000000000002'

async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

test('AP-19: domownik „pytaj” wybiera resztę, zakup za domownika bez „plan czy impuls?”, „Pokaż zakupy” jednej osoby', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const person = (id: string, name: string, inflow: string) => ({ id, name, bankNames: [], inflow, archived: false, via: null, opening: { owed: 0, deposit: 0 } })
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n5-household-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { since: start, members: [...s.household.members, person(MAMA, 'Mama', 'ask'), person(TATA, 'Tata', 'income')] } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      transactions: [
        { date: start, accountId: ACC, amount: -zl(60), categoryId: GROCERIES, counterparty: 'Apteka Mamy', refundable: true, memberId: MAMA },
        { date: start, accountId: ACC, amount: -zl(30), categoryId: GROCERIES, counterparty: 'Kiosk Taty', refundable: true, memberId: TATA }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const incomes = async () => (await records(dir, 'transactions')).filter((t) => t.kind === 'income').map((t) => [t.memberId, t.amount, t.advance])

    // Mama „pytaj” pays 100 zł, owing 60 zł: the rest of 40 zł is asked – no answer given beforehand.
    let quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Wpływ' }).click()
    await quick.getByTestId('quick-amount').fill('100')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-payer').selectOption({ label: 'Mama' })
    await expect(quick.getByRole('radio', { name: 'przychód' })).not.toBeChecked()
    await expect(quick.getByRole('radio', { name: 'zaliczka' })).not.toBeChecked()
    await expect(quick.getByTestId('quick-preview-member')).toHaveText('Od: Mama – wyrównuje 60,00 zł (ma oddać 60,00 zł), reszta 40,00 zł – przychód czy zaliczka? Wybierz wyżej.')
    await quick.getByTestId('quick-save').click()
    await expect(quick.getByTestId('quick-message')).toHaveText('Wybierz, czym jest reszta 40,00 zł ponad to, co Mama ma oddać: przychód czy zaliczka.')
    expect(await incomes()).toEqual([])
    await quick.getByRole('radio', { name: 'zaliczka' }).click()
    await quick.getByTestId('quick-save').click()
    await expect.poll(incomes).toEqual([[MAMA, zl(100), true]])
    // The answer is remembered for her (D80 b).
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.household.members.find((m: { id: string }) => m.id === MAMA)?.inflow).toBe('advance')

    // A purchase for a member of 250 zł (the log's threshold 200 zł): not mine – no „plan czy impuls?”; none chosen – no name.
    quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Za domownika' }).click()
    await quick.getByTestId('quick-amount').fill('250')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-financer').selectOption({ label: 'Tata' })
    await expect(quick.getByTestId('quick-preview-financed')).toContainText('Finansuje Tata: 250,00 zł')
    await expect(quick.getByTestId('quick-log')).toHaveCount(0)
    await quick.getByTestId('quick-financer').selectOption({ value: '' })
    await expect(quick.getByTestId('quick-preview-financed')).toHaveText('Za domownika: wybierz, kto finansuje zakup.')
    // My own purchase of the same amount is asked.
    await quick.getByRole('radio', { name: 'Wydatek' }).click()
    await expect(quick.getByTestId('quick-log')).toContainText('Plan czy impuls?')
    await quick.getByTestId('quick-close').click()

    // Meldunki: „Tata: do oddania” – „Pokaż zakupy” shows his purchase only (not Mama's paid one).
    await page.keyboard.press('Control+Shift+M')
    await expect(page.getByTestId('page-inbox')).toBeVisible()
    const refunds = page.locator('[data-testid="inbox-item"][data-kind="refunds"]')
    await expect(refunds).toHaveCount(1)
    await expect(refunds).toContainText('Tata: do oddania 30,00 zł')
    await refunds.getByTestId('inbox-open').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await expect(page.getByTestId('operation-row')).toContainText('Kiosk Taty')

    // N5 integration (AP-19 × AP-20): Alt+P on a member's purchase above the threshold – the log asks of my own part only,
    // so nothing is marked when it is saved.
    quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Za domownika' }).click()
    await quick.getByTestId('quick-amount').fill('250')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-financer').selectOption({ label: 'Tata' })
    await quick.getByTestId('quick-counterparty').fill('Księgarnia Taty')
    await quick.keyboard.press('Alt+KeyP')
    await quick.getByTestId('quick-save').click()
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'Księgarnia Taty').map((t) => [t.amount, t.memberId, t.impulse ?? null]))
      .toEqual([[-zl(250), TATA, null]])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

// N5 integration 2 (AP-19 × D100): a member „pytaj” whose whole inflow repays a loan – nothing left to choose.
test('AP-19 × D100: domownik „pytaj” spłaca całą wpłatą pożyczkę – bez pytania o resztę', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const LOAN = '01KN5P0ZYCZKA0000000000001'
  const mama = { id: MAMA, name: 'Mama', bankNames: [], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } }
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n5-household-loan-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { since: start, members: [...s.household.members, mama] } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      loans: [{ id: LOAN, name: 'Pożyczka dla Mamy', direction: 'given', counterparty: 'MAMA', amount: zl(100), date: start }],
      transactions: [{ date: start, accountId: ACC, kind: 'loan', amount: -zl(100), loanId: LOAN, counterparty: 'MAMA' }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Wpływ' }).click()
    await quick.getByTestId('quick-amount').fill('100')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-payer').selectOption({ label: 'Mama' })
    await quick.getByTestId('quick-loan').selectOption({ label: 'Pożyczka dla Mamy (zostało 100,00 zł)' })
    await expect(quick.getByTestId('quick-loan-amount')).toHaveValue('100,00')
    // Her own part is 0 zł: no „przychód czy zaliczka?” (before: the 100 zł of the loan's part was asked about too).
    await expect(quick.getByTestId('quick-preview-member')).toHaveCount(0)
    await quick.getByTestId('quick-save').click()
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.kind === 'income').map((t) => [t.memberId, t.amount, (t.splits as Array<{ loanId?: string; amount: number }>).map((x) => [x.loanId ?? null, x.amount])]))
      .toEqual([[MAMA, zl(100), [[LOAN, zl(100)]]]])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
