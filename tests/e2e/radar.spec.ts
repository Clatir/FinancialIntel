import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, daysBetween, warsawNow } from '../../src/shared/calc/dates'
import { SHORT_MONTHS } from '../../src/shared/calc/cargoWatch'
import { dm, formatPln } from '../../src/shared/format'
import { launch } from './app'
import { openForm } from './forms'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const AUTO = '01KDEFCAT00000000000000300'
const RENT = '01K9Z6B00000000000000000C1'

test('Radar: 90 dni (pensja, asteroida, raty), pożyczka udzielona ze spłatą, pożyczka wzięta w ładowni i dług w zasięgu, należność domu', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  const due = addDays(today, 20)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-radar-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(3000) }, household: { ...s.household, since: start } }),
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
    // The columns are named, a row opens its record (Z10, UX-35, UX-74): the container in Ładownia, marked there.
    await expect(page.getByTestId('radar-columns')).toContainText('osłony po')
    await item('asteroid').getByTestId('radar-item-open').click()
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    await expect(page.locator('[data-testid="cargo-row"][data-name="OC auta"]')).toHaveClass(/bg-accent-soft/)
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()

    // A loan given: 600 zł in two monthly installments, the money out of the shields now.
    await openForm(page, 'loan')
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
    await openForm(page, 'loan')
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

    // „zamknij” with „Cofnij” (1.6.6, N35): the debt and the installments go, and come back as they were.
    await page.keyboard.press('Control+7')
    await page.locator('[data-testid="loan-row"][data-name="Laptop"]').getByTestId('loan-close').click()
    await expect(page.getByTestId('radar-debt')).toHaveCount(0)
    await expect.poll(async () => (await records(dir, 'containers')).filter((c) => c.loanId).map((c) => [c.archived, !!c.archivedAt])).toEqual([[true, true]])
    await page.getByRole('status').filter({ hasText: 'Pożyczka „Laptop” zamknięta' }).getByTestId('toast-action').click()
    await expect(page.getByTestId('radar-debt')).toHaveText('3 300,00 zł')
    await expect.poll(async () => (await records(dir, 'containers')).filter((c) => c.loanId).map((c) => [c.archived, c.archivedAt])).toEqual([[false, null]])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

/**
 * Z6b (1.21.0, D106 pkt 5 – UX-30 on the Radar): the rent unpaid three months – one row of „Na radarze” at its oldest due,
 * said as the briefing says it, the sum in its amount; a fee late once keeps its own row; the row opens the container.
 */
test('Radar: zaległe terminy jednego kontenera jednym wierszem, jak w odprawie; pojedynczy zaległy termin bez zmian', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  // The rent's life ended last month: its three dues unpaid – all of earlier months, whatever day the test runs.
  const first = `${addMonths(month, -3)}-10`
  const last = `${addMonths(month, -1)}-10`
  const years = first.slice(0, 4) !== last.slice(0, 4) || last.slice(0, 4) !== today.slice(0, 4)
  const mon = (d: string) => `${SHORT_MONTHS[Number(d.slice(5, 7)) - 1]}${years ? ` ${d.slice(0, 4)}` : ''}`
  // Netflix only last month: its one due unpaid.
  const netflixDue = `${addMonths(month, -1)}-12`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-radar-z6b-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: start.slice(0, 7), salary: zl(6000), envelopes: {} }],
      containers: [
        { id: RENT, name: 'Czynsz', amount: zl(2000), cycleMonths: 1, dueMonth: start.slice(0, 7), dueDay: 10, until: addMonths(month, -1), accountId: MBANK, counterparty: 'Spółdzielnia' },
        { name: 'Netflix', amount: zl(60), cycleMonths: 1, dueMonth: addMonths(month, -1), dueDay: 12, from: addMonths(month, -1), until: addMonths(month, -1), accountId: MBANK, counterparty: 'NETFLIX' }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    // The briefing's line of the rent – the Radar says the same.
    await expect(page.locator('[data-testid="briefing-item"][data-kind="cargo"]').filter({ hasText: 'Czynsz' })).toHaveText(
      `Kontener niezaładowany – Czynsz: 3 terminy bez płatności (${mon(first)}–${mon(last)}), razem 6 000,00 zł.`
    )
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    const rent = page.locator('[data-testid="radar-item"][data-kind="fixed"]').filter({ hasText: 'Czynsz' })
    await expect(rent).toHaveCount(1)
    await expect(rent).toHaveAttribute('data-overdue', 'yes')
    await expect(rent).toHaveAttribute('data-dues', '3')
    await expect(rent.getByTestId('radar-item-open')).toHaveText(`Czynsz: 3 terminy bez płatności (${mon(first)}–${mon(last)})`)
    await expect(rent).toContainText(dm(first))
    await expect(rent).toContainText('−6 000,00 zł')
    // Said in the notes' place – no „po terminie” of one of its dues beside it.
    await expect(rent).not.toContainText('po terminie')
    // Netflix late once: its own row, as before – its day and the days past it.
    const netflix = page.locator('[data-testid="radar-item"][data-kind="fixed"]').filter({ hasText: 'Netflix' })
    await expect(netflix).toHaveCount(1)
    await expect(netflix).not.toHaveAttribute('data-dues', /.*/)
    await expect(netflix.getByTestId('radar-item-open')).toHaveText('Netflix')
    await expect(netflix).toContainText(`po terminie ${daysBetween(netflixDue, today)} dni`)
    // The briefing's whole line in the row's hint; the row opens the container in Ładownia – with its late dues.
    await expect(rent.getByTestId('radar-item-open')).toHaveAttribute('title', `Czynsz: 3 terminy bez płatności (${mon(first)}–${mon(last)}), razem ${formatPln(zl(6000))} zł.\nPokaż kontener w Ładowni`)
    await rent.getByTestId('radar-item-open').click()
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    await expect(page.getByTestId('container-late-due')).toHaveCount(3)
    // The calendar is the same as before: each due on its own day (only the list groups them).
    await page.keyboard.press('Control+7')
    await page.getByRole('radio', { name: 'kalendarz' }).click()
    await expect(page.getByTestId('radar-calendar')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
