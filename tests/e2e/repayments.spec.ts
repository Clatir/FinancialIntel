import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const MAMA = '01KMEMMAMA0000000000000001'
const TATA = '01KMEMTATA0000000000000002'
const id = (n: number) => `01KRPAY${String(n).padStart(19, '0')}`
const A = id(1)
const B = id(2)
const C = id(3)
const D = id(4)

type Op = { id: string; kind: string; amount: number; counterparty: string; covers: string[] }
const operations = async (dataDir: string) => (await records(dataDir, 'transactions')) as unknown as Op[]
const coversOf = async (dataDir: string, counterparty: string) => (await operations(dataDir)).find((t) => t.counterparty === counterparty)?.covers

async function typeAmount(page: Page, target: string | Locator, text: string) {
  const field = typeof target === 'string' ? page.getByTestId(target) : target
  await field.click()
  await field.fill(text)
  await field.press('Enter')
}

/** A new income from a household member: the amount first, then whose money (the payer picks the sure purchase). */
async function memberIncome(page: Page, amount: string, payer: string, name: string) {
  await page.keyboard.press('Control+n')
  await page.getByRole('radio', { name: 'Wpływ' }).click()
  await typeAmount(page, 'operation-amount', amount)
  await page.getByTestId('operation-counterparty').fill(name)
  await page.getByTestId('operation-counterparty').press('Enter')
  await page.getByTestId('operation-payer').selectOption({ label: payer })
}

test('Zwrot domownika przypisany do zakupu (1.12.0, D91): pewne dopasowanie, „do przypisania”, Meldunki, „Przypisz zwrot…”, pośrednik, oznaczenia', async () => {
  const { date: today, month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-repay-')), 'FinancialIntel')
  const person = (pid: string, name: string) => ({ id: pid, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 } })
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      household: { ...s.household, since: null, assignFrom: start, members: [...s.household.members, person(MAMA, 'Mama'), person(TATA, 'Tata')] }
    }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(10000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }],
      transactions: [
        { id: A, date: today, accountId: ACC, amount: -zl(80), categoryId: GROCERIES, counterparty: 'Biedronka', refundable: true, memberId: MAMA },
        { id: B, date: today, accountId: ACC, amount: -zl(50), categoryId: GROCERIES, counterparty: 'Lidl', refundable: true, memberId: MAMA },
        { id: C, date: today, accountId: ACC, amount: -zl(40), categoryId: GROCERIES, counterparty: 'Rossmann', refundable: true, memberId: TATA },
        { id: D, date: today, accountId: ACC, amount: -zl(15), categoryId: GROCERIES, counterparty: 'Apteka', refundable: true, memberId: MAMA }
      ]
    }
  })
  const { page, app, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('operation-row')).toHaveCount(4)

    // 80 zł from Mama: the only purchase of hers of that amount – named at once, nothing from the oldest.
    await memberIncome(page, '80', 'Mama', 'Mama przelew')
    await expect.poll(() => coversOf(dataDir, 'Mama przelew')).toEqual([A])
    const mama = page.locator('[data-testid="repayment-member"][data-member="Mama"]')
    await expect(mama.getByTestId('repayment-result')).toContainText('Biedronka 80,00 zł')

    // 30 zł: no purchase sure – it waits to be assigned (what she owes is lower, no purchase marked).
    await memberIncome(page, '30', 'Mama', 'Mama zwrot')
    await expect(mama.getByTestId('repayment-result')).toHaveText('do przypisania 30,00 zł')
    await expect(mama.getByTestId('operation-cover')).toHaveCount(2)
    await expect.poll(() => coversOf(dataDir, 'Mama zwrot')).toEqual([])
    await page.keyboard.press('Control+Shift+M')
    const report = page.locator('[data-testid="inbox-item"][data-kind="repayments"]')
    await expect(report).toContainText('Mama: zwrot 30,00 zł')

    // From the purchase: „Przypisz zwrot…” – Mama's money waiting goes to it.
    await page.keyboard.press('Control+2')
    await page.locator('[data-testid="operation-row"]', { hasText: 'Lidl' }).click()
    await expect(page.getByTestId('purchase-repaid-status')).toHaveText('Mama: do oddania 50,00 zł')
    await page.getByTestId('purchase-assign').click()
    await page.getByTestId('purchase-assign-option').click()
    await expect(page.getByTestId('purchase-repaid-status')).toHaveText('Mama: oddane 30,00 z 50,00 zł · do oddania 20,00 zł')
    await expect(page.getByTestId('purchase-repaid-by')).toContainText('Mama zwrot · 30,00 zł')
    await expect.poll(() => coversOf(dataDir, 'Mama zwrot')).toEqual([B])
    await page.keyboard.press('Control+Shift+M')
    await expect(report).toHaveCount(0)

    // Tata's transfer with Mama's part (through another member): each part its own purchases – offered, one click each.
    await page.keyboard.press('Control+2')
    await memberIncome(page, '60', 'Tata', 'Tata przelew')
    await page.getByTestId('operation-income-split').click()
    await page.getByTestId('income-split-member').selectOption({ label: 'Mama' })
    await typeAmount(page, page.getByTestId('income-split-amount'), '20')
    const tata = page.locator('[data-testid="repayment-member"][data-member="Tata"]')
    await tata.getByTestId('repayment-offer').click()
    await mama.getByTestId('repayment-offer').click()
    await expect.poll(async () => (await coversOf(dataDir, 'Tata przelew'))?.slice().sort()).toEqual([B, C].sort())
    await expect(mama.getByTestId('repayment-result')).toContainText('Lidl 20,00 zł')
    await expect(tata.getByTestId('repayment-result')).toContainText('Rossmann 40,00 zł')
    await page.screenshot({ path: join('test-results', 'screens', '12-zwroty.png') })

    // The list's marks: paid back – Biedronka, Lidl, Rossmann; still owed – Apteka.
    await page.getByTestId('operations-marks').click()
    await page.getByTestId('operations-marks-repaid').check()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operation-row')).toHaveCount(3)
    // The order of one day's rows is the list's; the set is what counts.
    const rows = await page.getByTestId('operation-row').allTextContents()
    expect(rows.map((r) => ['Biedronka', 'Lidl', 'Rossmann'].find((n) => r.includes(n))).sort()).toEqual(['Biedronka', 'Lidl', 'Rossmann'])
    await page.getByTestId('operations-marks').click()
    await page.getByTestId('operations-marks-repaid').uncheck()
    await page.getByTestId('operations-marks-owed').check()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await expect(page.getByTestId('operation-row')).toContainText('Apteka')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Wcześniejsza wpłata domownika finansuje późniejszy zakup (1.15.1): „Przypisz zwrot…” na zakupie, status oddane', async () => {
  const { date: today, month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-repay-early-')), 'FinancialIntel')
  const person = (pid: string, name: string) => ({ id: pid, name, bankNames: [], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 } })
  const PAY = id(10)
  const BUY = id(11)
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      household: { ...s.household, since: null, assignFrom: start, members: [...s.household.members, person(MAMA, 'Mama')] }
    }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(10000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }],
      transactions: [
        { id: PAY, date: '2026-10-05', accountId: ACC, amount: zl(100), kind: 'income', counterparty: 'Mama na zakupy', memberId: MAMA, covers: [] },
        { id: BUY, date: '2026-10-10', accountId: ACC, amount: -zl(80), categoryId: GROCERIES, counterparty: 'Biedronka', refundable: true, memberId: MAMA }
      ]
    }
  })
  const { page, app, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('operation-row')).toHaveCount(2)

    // Open purchase: Mama owes 80 zł
    await page.locator('[data-testid="operation-row"]', { hasText: 'Biedronka' }).click()
    await expect(page.getByTestId('purchase-repaid-status')).toHaveText('Mama: do oddania 80,00 zł')

    // Click "Przypisz zwrot..." and select earlier payment
    await page.getByTestId('purchase-assign').click()
    const option = page.getByTestId('purchase-assign-option')
    await expect(option).toContainText('Mama na zakupy')
    await expect(option).toContainText('100,00 zł')
    await option.click()

    // Status becomes oddane 80,00 zł, paid by earlier payment
    await expect(page.getByTestId('purchase-repaid-status')).toHaveText('Mama: oddane 80,00 zł')
    await expect(page.getByTestId('purchase-repaid-by')).toContainText('Mama na zakupy · 80,00 zł')
    await expect.poll(() => coversOf(dataDir, 'Mama na zakupy')).toEqual([BUY])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
