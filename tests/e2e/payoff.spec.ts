import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { launch } from './app'
import { records } from './files'
import { seedFolder, seedId, zl } from './seed'

// AP-41 (R2, T480–T484): the plan of the taken loans' payoff on the Radar – the schedule, the avalanche and the snowball
// with money over the installments; the yearly interest is the loan's informational field; nothing else is written.
const A = '01KR2PAYA00000000000000001'
const B = '01KR2PAYB00000000000000001'
const C = '01KR2PAYC00000000000000001'

/** Three taken loans from this month on (the example of `tests/unit/payoff.test.ts`) and one given (not in the plan). */
function seed(dataDir: string) {
  const { month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  const day = (n: number) => `${addMonths(month, n)}-28`
  const schedule = (amounts: number[]) => amounts.map((amount, i) => ({ id: seedId(), date: day(i), amount }))
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(3000) }, household: { ...s.household, since: start } }),
    records: {
      // Much over the shields' target: „wolne do decyzji” to propose.
      balances: [{ date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(100000) }],
      months: [{ month: addMonths(month, -3), salary: zl(4000), envelopes: {} }],
      loans: [
        { id: A, name: 'Pożyczka od rodziców', direction: 'taken', counterparty: 'Mama', amount: zl(400), date: start, accountId: MBANK_ACCOUNT_ID, schedule: schedule([zl(100), zl(100), zl(100), zl(100)]) },
        { id: B, name: 'Kredyt gotówkowy', direction: 'taken', counterparty: 'Bank', amount: zl(294.1), date: start, accountId: MBANK_ACCOUNT_ID, schedule: schedule([zl(100), zl(100), zl(100)]), rate: 12 },
        { id: C, name: 'Kredyt na laptop', direction: 'taken', counterparty: 'Sklep', amount: zl(396.08), date: start, accountId: MBANK_ACCOUNT_ID, schedule: schedule([zl(204), zl(204)]), rate: 24 },
        { name: 'Pożyczka dla Ani', direction: 'given', counterparty: 'Anna', amount: zl(500), date: start, accountId: MBANK_ACCOUNT_ID, schedule: schedule([zl(500)]) }
      ]
    }
  })
  return { month }
}

const mmyyyy = (m: string) => `${m.slice(5, 7)}.${m.slice(0, 4)}`

test('Plan spłaty pożyczek: harmonogram, lawina i kula śnieżna z nadpłatą, oprocentowanie w pożyczce, jednorazowo „wolne do decyzji”, nic poza tym', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-payoff-')), 'FinancialIntel')
  const { month } = seed(dataDir)
  const m = (n: number) => mmyyyy(addMonths(month, n))
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    const panel = page.getByTestId('radar-payoff')
    const cells = (testId: string) => panel.getByTestId(testId).locator('td')
    const loanEnd = (name: string) => panel.locator(`[data-testid="radar-payoff-loan-end"][data-name="${name}"] td`)
    // Only the taken loans; the given one is a receivable.
    await expect(panel.getByTestId('radar-payoff-loan')).toHaveCount(3)
    await expect(panel.locator('[data-testid="radar-payoff-loan"][data-name="Pożyczka dla Ani"]')).toHaveCount(0)
    await expect(panel).toContainText('Dług 1 108,00 zł · 3 pożyczki wzięte')

    // The schedule: the laptop in a month, the cash loan in two, the parents' in three; interest 5,90 + 11,92 zł.
    await expect(cells('radar-payoff-end')).toHaveText(['Spłata wszystkich', m(3)])
    await expect(cells('radar-payoff-interest')).toHaveText(['Odsetki (zł)', '17,82'])
    await expect(panel.getByTestId('radar-payoff-unrated')).toContainText('Pożyczki bez oprocentowania liczą się bez odsetek')
    await expect(panel.getByTestId('radar-payoff-month')).toHaveCount(4)

    // 100 zł more each month: the avalanche (the laptop's 24 % first) and the snowball (the 300 zł cash loan first).
    const extra = panel.getByTestId('radar-payoff-extra')
    await extra.click()
    await extra.fill('100')
    await extra.press('Enter')
    await expect(cells('radar-payoff-end')).toHaveText(['Spłata wszystkich', m(3), m(2), m(2)])
    await expect(cells('radar-payoff-interest')).toHaveText(['Odsetki (zł)', '17,82', '14,83', '15,83'])
    await expect(cells('radar-payoff-less')).toHaveText(['Mniej odsetek (zł)', '—', '2,99', '1,99'])
    await expect(cells('radar-payoff-sooner')).toHaveText(['Krócej o', '—', '1 miesiąc', '1 miesiąc'])
    await expect(cells('radar-payoff-first')).toHaveText(['Nadpłata najpierw', '—', 'Kredyt na laptop', 'Kredyt gotówkowy'])
    await expect(loanEnd('Kredyt na laptop')).toHaveText(['Spłata: Kredyt na laptop', m(1), m(1), m(1)])
    await expect(loanEnd('Kredyt gotówkowy')).toHaveText(['Spłata: Kredyt gotówkowy', m(2), m(1), m(1)])
    await expect(loanEnd('Pożyczka od rodziców')).toHaveText(['Spłata: Pożyczka od rodziców', m(3), m(2), m(2)])

    // Month by month – the avalanche first: 100 zł over the laptop's installment, the next month its rest goes on.
    const months = panel.getByTestId('radar-payoff-month')
    await expect(panel.getByTestId('radar-payoff-months')).toHaveAttribute('data-variant', 'avalanche')
    await expect(months).toHaveCount(3)
    await expect(months.first().getByTestId('radar-payoff-month-paid')).toHaveText('504,00 zł')
    await expect(months.first()).toContainText('Kredyt na laptop 204,00 + nadpłata 100,00')
    const line = (n: number, name: string) => months.nth(n).locator(`[data-testid="radar-payoff-month-line"][data-name="${name}"]`)
    await expect(line(1, 'Kredyt gotówkowy')).toHaveAttribute('data-state', 'paid-off')
    await expect(line(1, 'Kredyt gotówkowy')).toContainText('Kredyt gotówkowy 100,00 + nadpłata 99,01 – spłacona')
    await expect(line(1, 'Kredyt na laptop')).toContainText('Kredyt na laptop 102,00 – spłacona')
    await expect(line(1, 'Pożyczka od rodziców')).toContainText('Pożyczka od rodziców 100,00 + nadpłata 102,99')
    await expect(line(1, 'Pożyczka od rodziców')).not.toHaveAttribute('data-state', 'paid-off')
    await panel.screenshot({ path: join('test-results', 'screens', '12b-radar-payoff.png') })
    await panel.getByRole('radio', { name: 'kula śnieżna' }).click()
    await expect(months.first()).toContainText('Kredyt gotówkowy 100,00 + nadpłata 100,00')
    await expect(months.first().getByTestId('radar-payoff-month-left')).toHaveText('zostaje 597,04 zł')

    // The draft stays while another screen is looked at; the amounts hide with Ctrl+$.
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+7')
    await expect(panel.getByTestId('radar-payoff-extra')).toHaveValue('100,00')
    await expect(panel.getByTestId('radar-payoff-months')).toHaveAttribute('data-variant', 'snowball')
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(page.getByTestId('amounts-hidden')).toBeVisible()
    await expect(cells('radar-payoff-interest')).toHaveText(['Odsetki (zł)', '•••', '•••', '•••'])
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(page.getByTestId('amounts-hidden')).toHaveCount(0)

    // „Wolne do decyzji” proposed once now: everything paid off this month.
    const free = panel.getByTestId('radar-payoff-free')
    await expect(free).toContainText('Osłony · wolne do decyzji')
    await free.getByTestId('radar-payoff-free-use').click()
    await expect(cells('radar-payoff-end')).toHaveText(['Spłata wszystkich', m(3), m(0), m(0)])
    await expect(free.getByTestId('radar-payoff-free-use')).toHaveCount(0)
    const once = panel.getByTestId('radar-payoff-once')
    await once.click()
    await once.fill('')
    await once.press('Enter')
    await expect(cells('radar-payoff-end')).toHaveText(['Spłata wszystkich', m(3), m(2), m(2)])

    // The parents' loan at 6 %: the loan's own field (its file), the plan counts its interest; cleared – not known again.
    const rate = panel.locator('[data-testid="radar-payoff-loan"][data-name="Pożyczka od rodziców"]').getByTestId('radar-payoff-rate')
    await rate.click()
    await rate.fill('6')
    await rate.press('Tab')
    await expect.poll(async () => (await records(dir, 'loans')).find((l) => l.id === A)?.rate).toBe(6)
    await expect(rate).toHaveValue('6,00')
    await expect(panel.getByTestId('radar-payoff-unrated')).toHaveCount(0)
    await expect(cells('radar-payoff-interest')).not.toHaveText(['Odsetki (zł)', '17,82', '14,83', '15,83'])
    await rate.click()
    await rate.fill('')
    await rate.press('Tab')
    await expect.poll(async () => (await records(dir, 'loans')).find((l) => l.id === A)?.rate).toBeNull()
    await expect(cells('radar-payoff-interest')).toHaveText(['Odsetki (zł)', '17,82', '14,83', '15,83'])

    // A new taken loan with its interest typed: in the plan with it.
    await page.getByRole('radio', { name: 'Biorę pożyczkę' }).click()
    await page.getByTestId('loan-name').fill('Kredyt na rower')
    await page.getByTestId('loan-amount').fill('1200')
    await page.getByTestId('loan-amount').press('Tab')
    await page.getByTestId('loan-installments').fill('2')
    await page.getByTestId('loan-installments').press('Tab')
    await page.getByTestId('loan-rate').fill('9,5')
    await page.getByTestId('loan-rate').press('Tab')
    await page.getByTestId('loan-save').click()
    await expect.poll(async () => (await records(dir, 'loans')).find((l) => l.name === 'Kredyt na rower')?.rate).toBe(9.5)
    await expect(panel.getByTestId('radar-payoff-loan')).toHaveCount(4)
    await expect(panel.locator('[data-testid="radar-payoff-loan"][data-name="Kredyt na rower"]').getByTestId('radar-payoff-rate')).toHaveValue('9,50')

    // The plan itself wrote nothing: the only operation is the new loan's money in, no container or buoy of its own.
    await expect.poll(async () => (await records(dir, 'transactions')).map((t) => [t.kind, t.amount])).toEqual([['loan', zl(1200)]])
    expect((await records(dir, 'scheduled')).length).toBe(0)
    expect((await records(dir, 'containers')).map((c) => c.name)).toEqual(['Rata: Kredyt na rower'])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
