// 1.19.0 (D102): the surplus of one transfer repaying two household members – the editor's „Nadwyżka” panel (step 2):
// how big the surplus is, split „po równo” (debts first), each person's share given „as” income or advance.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test'
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

async function typeAmount(page: Page, target: string | Locator, text: string) {
  const field = typeof target === 'string' ? page.getByTestId(target) : target
  await field.click()
  await field.fill(text)
  await field.press('Enter')
}

type Op = { amount: number; memberId: string | null; advance: boolean; splits: Array<{ memberId: string | null; amount: number; advance: boolean; inflowKind?: string; loanId?: string }> }

test('D102: edytor – „Nadwyżka” przy przelewie Taty za siebie i Mamę: kwota, podział na osoby, „jako”', async () => {
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

    // The surplus said and split – 150 zł beyond both debts; half to Mama as her advance.
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

test('D102: szybki wpis – „W tym za” przy przelewie Taty za siebie i Mamę: nadwyżka, „jako” (przychód/zaliczka), blokada przy pytaj', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const person = (id: string, name: string, inflow: string, via: string | null = null) => ({ id, name, bankNames: [], inflow, archived: false, via, opening: { owed: 0, deposit: 0 } })
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-surplus-quick-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      household: {
        since: start,
        assignFrom: start,
        members: [...s.household.members, person(TATA, 'Tata', 'income'), person(MAMA, 'Mama', 'ask', TATA)]
      }
    }),
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
    const incomes = async () => ((await records(dir, 'transactions')) as unknown as Op[]).filter((t) => t.amount === zl(400)).map((t) => [t.memberId, t.advance, t.splits.map((s) => [s.memberId, s.amount, s.inflowKind ?? 'repay', s.advance])])

    const quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Wpływ' }).click()
    await quick.getByTestId('quick-amount').fill('400')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-payer').selectOption({ label: 'Tata' })

    // Button „po równo”: 400 zł covers 150 (Tata) + 100 (Mama), leaving 150 zł surplus -> 75 zł each. Mama gets 100 + 75 = 175 zł.
    await quick.getByTestId('quick-surplus-even').click()
    await expect(quick.getByTestId('quick-share')).toHaveValue('175,00')

    // Mama is „ask”, so before choosing: preview warns about „przychód czy zaliczka?”, saving is refused.
    await expect(quick.getByTestId('quick-preview-share')).toHaveText(/W tym za: Mama – wyrównuje 100,00 zł \(ma oddać 100,00 zł\), reszta 75,00 zł – przychód czy zaliczka\? Wybierz wyżej\./)
    await quick.getByTestId('quick-save').click()
    await expect(quick.getByTestId('quick-message')).toHaveText('Wybierz, czym jest reszta 75,00 zł ponad to, co Mama ma oddać: przychód czy zaliczka.')
    expect(await incomes()).toEqual([])

    // Choose „zaliczka” on Mama's surplus
    const mamaRow = quick.locator('[data-testid="quick-share-as"]')
    await mamaRow.getByRole('radio', { name: 'zaliczka' }).click()
    await expect(quick.getByTestId('quick-preview-share')).toHaveText(/W tym za: Mama – wyrównuje 100,00 zł \(ma oddać 100,00 zł\), reszta 75,00 zł jako zaliczka \(depozyt\)\./)

    await quick.getByTestId('quick-save').click()
    await expect.poll(incomes).toEqual([[TATA, false, [[MAMA, zl(100), 'repay', false], [MAMA, zl(75), 'advance', true]]]])
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.household.members.find((m: { id: string }) => m.id === MAMA)?.inflow).toBe('advance')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
