import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const AUTO = '01KDEFCAT00000000000000300'

test('Radar: 90 dni (pensja, asteroida, raty), pożyczka udzielona ze spłatą, pożyczka wzięta w ładowni i dług w zasięgu, należność domu', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  const due = addDays(today, 20)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-radar-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(3000) } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(30000) }],
      months: [{ month: addMonths(month, -3), salary: zl(4000), envelopes: {} }],
      containers: [{ name: 'OC auta', amount: zl(1240), cycleMonths: 12, dueMonth: due.slice(0, 7), dueDay: Number(due.slice(8, 10)), categoryId: AUTO }],
      // Bought for the house 40 days ago and not repaid: the briefing recalls it after 30 days.
      transactions: [{ date: addDays(today, -40), accountId: MBANK, amount: -zl(85), refundable: true, counterparty: 'Rossmann' }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.locator('[data-testid="briefing-item"][data-kind="house"]')).toContainText('85,00 zł')

    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    const item = (kind: string) => page.locator(`[data-testid="radar-item"][data-kind="${kind}"]`)
    await expect(item('asteroid')).toContainText('OC auta')
    await expect(item('salary').first()).toContainText('Pensja od siebie')
    await expect(page.getByTestId('radar-house')).toHaveText('85,00 zł')

    // A loan given: 600 zł in two monthly installments, the money out of the shields now.
    await page.getByTestId('loan-name').fill('Pożyczka dla Ani')
    await page.getByTestId('loan-counterparty').fill('Anna Nowak')
    await page.getByTestId('loan-amount').fill('600')
    await page.getByTestId('loan-amount').press('Tab')
    await page.getByTestId('loan-installments').fill('2')
    await page.getByTestId('loan-installments').press('Tab')
    await page.getByTestId('loan-save').click()
    const ania = page.locator('[data-testid="loan-row"][data-name="Pożyczka dla Ani"]')
    await expect(ania.getByTestId('loan-open')).toHaveText('600,00 zł')
    await expect(item('repayment')).toHaveCount(2)
    await expect.poll(async () => (await records(dir, 'transactions')).filter((t) => t.kind === 'loan').map((t) => t.amount)).toEqual([-zl(600)])

    // The first repayment came: the loan's open amount and the radar follow.
    await ania.getByTestId('loan-pay-open').click()
    await expect(ania.getByTestId('loan-pay-amount')).toHaveValue('300,00')
    await ania.getByTestId('loan-pay').click()
    await expect(ania.getByTestId('loan-open')).toHaveText('300,00 zł')
    await expect(item('repayment')).toHaveCount(1)

    // A loan taken: 3 000 zł, 3 300 zł to pay back in 3 installments – a container of the cargo hold, the debt in the range.
    await page.getByRole('radio', { name: 'Biorę pożyczkę' }).click()
    await page.getByTestId('loan-name').fill('Laptop')
    await page.getByTestId('loan-counterparty').fill('Bank XYZ')
    await page.getByTestId('loan-amount').fill('3000')
    await page.getByTestId('loan-amount').press('Tab')
    await page.getByTestId('loan-total').fill('3300')
    await page.getByTestId('loan-total').press('Tab')
    await page.getByTestId('loan-installments').fill('3')
    await page.getByTestId('loan-installments').press('Tab')
    await page.getByTestId('loan-save').click()
    await expect(page.locator('[data-testid="loan-row"][data-name="Laptop"]').getByTestId('loan-open')).toHaveText('3 300,00 zł')
    await expect(page.getByTestId('radar-debt')).toHaveText('3 300,00 zł')
    await expect(item('installment').first()).toContainText('Rata: Laptop')
    await expect.poll(async () => (await records(dir, 'containers')).filter((c) => c.loanId).map((c) => [c.type, c.amount, c.cycleMonths])).toEqual([['installment', zl(1100), 1]])
    await page.screenshot({ path: join('test-results', 'screens', '12-radar.png') })

    // The bridge: the debt beside the shields, the cargo hold with the installments.
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('state-debt')).toContainText('3 300,00 zł')
    await page.keyboard.press('Control+5')
    await expect(page.locator('[data-testid="cargo-row"][data-name="Rata: Laptop"]')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
