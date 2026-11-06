// 1.19.0 (D102): the surplus of one transfer repaying two household members. Step 0: today's editor – the split works,
// but nothing says how big the surplus is nor lets it be given to a person „as” something. `test.fail` until step 2 (the
// „Nadwyżka” panel) makes it pass – then `test.fail` becomes `test`.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'
const MAMA = '01KMEMMAMA0000000000000001'
const TATA = '01KMEMTATA0000000000000002'

async function typeAmount(page: Page, target: string | Locator, text: string) {
  const field = typeof target === 'string' ? page.getByTestId(target) : target
  await field.click()
  await field.fill(text)
  await field.press('Enter')
}

type Op = { amount: number; memberId: string | null; advance: boolean; splits: Array<{ memberId: string | null; amount: number; advance: boolean; inflowKind?: string; loanId?: string }> }

test.fail('D102: edytor – „Nadwyżka” przy przelewie Taty za siebie i Mamę: kwota, podział na osoby, „jako”', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const person = (id: string, name: string, inflow: string, via: string | null = null) => ({ id, name, bankNames: [], inflow, archived: false, via, opening: { owed: 0, deposit: 0 } })
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-surplus-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { since: start, assignFrom: start, members: [...s.household.members, person(TATA, 'Tata', 'income'), person(MAMA, 'Mama', 'ask', TATA)] } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      transactions: [
        { date: today, accountId: ACC, amount: -zl(100), categoryId: GROCERIES, counterparty: 'Apteka Mamy', refundable: true, memberId: MAMA },
        { date: today, accountId: ACC, amount: -zl(150), categoryId: GROCERIES, counterparty: 'Kiosk Taty', refundable: true, memberId: TATA }
      ]
    }
  })
  const { page, app, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByRole('radio', { name: 'Wpływ' }).click()
    await typeAmount(page, 'operation-amount', '400')
    await page.getByTestId('operation-counterparty').fill('Tata przelew')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-payer').selectOption({ label: 'Tata' })
    // Today: „+ także za Mama” – her part starts at what she owes; the rest (250 zł) is Tata's.
    await page.getByTestId('operation-also-for').click()
    await expect(page.getByTestId('income-split-amount')).toHaveValue('100,00')

    // Wanted (step 2): the surplus said and split – 150 zł beyond both debts; half to Mama as her advance.
    const panel = page.getByTestId('surplus-panel')
    await expect(panel.getByTestId('surplus-summary')).toHaveText(/Spłaca: Tata 150,00 zł · Mama 100,00 zł · nadwyżka 150,00 zł/)
    await panel.getByTestId('surplus-even').click()
    const mama = panel.locator('[data-testid="surplus-line"][data-member="Mama"]')
    await expect(mama.getByTestId('surplus-amount')).toHaveValue('75,00')
    await mama.getByRole('radio', { name: 'zaliczka' }).click()
    const tata = panel.locator('[data-testid="surplus-line"][data-member="Tata"]')
    await tata.getByRole('radio', { name: 'przychód' }).click()
    await expect
      .poll(async () => ((await records(dir, 'transactions')) as unknown as Op[]).filter((t) => t.amount === zl(400)).map((t) => [t.memberId, t.advance, t.splits.map((x) => [x.memberId, x.amount, x.inflowKind ?? 'repay', x.advance])]))
      .toEqual([[TATA, false, [[MAMA, zl(100), 'repay', false], [MAMA, zl(75), 'advance', true]]]])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
