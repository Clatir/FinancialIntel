import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, dayOfMonth, daysInMonth, warsawNow } from '../../src/shared/calc/dates'
import { SHORT_MONTHS } from '../../src/shared/calc/cargoWatch'
import { formatPln } from '../../src/shared/format'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const GIFTS = '01KDEFCAT00000000000000900'
const PRESENTS = '01KDEFCAT00000000000000901'
const RENT = '01K9Z6000000000000000000C1'

/**
 * Z6 (1.21.0, D106 pkt 2, 4, 5): Mostek – the rent unpaid three months in one line of the briefing (UX-30) and one report
 * of Meldunki with „Zapłacone poza budżetem” (UX-31), „N meldunków ›” on the briefing; the month's bar over it (UX-32)
 * and the envelopes leading to their operations, the label only over the pace (UX-34); „Energia miesiąca” (UX-33); the
 * wealth curve's base said (UX-66); no empty panels (UX-76); the evening report over the briefing (UX-5).
 */
test('Mostek i Meldunki: zaległe opłaty jedną linią i jednym meldunkiem, pasek miesiąca, koperty do operacji, puste panele schowane', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  // The rent's life ended last month: its three dues unpaid – all of earlier months, whatever day the test runs.
  const first = `${addMonths(month, -3)}-10`
  const last = `${addMonths(month, -1)}-10`
  const years = first.slice(0, 4) !== last.slice(0, 4) || last.slice(0, 4) !== today.slice(0, 4)
  const mon = (d: string) => `${SHORT_MONTHS[Number(d.slice(5, 7)) - 1]}${years ? ` ${d.slice(0, 4)}` : ''}`
  const rentText = `Czynsz: 3 terminy bez płatności (${mon(first)}–${mon(last)}), razem 6 000,00 zł.`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-bridge-z6-')), 'FinancialIntel')
  seedFolder(dataDir, {
    // The quiet hours of one minute before midnight: the evening's hour from midnight is not moved before them (N104).
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, orders: { ...s.orders, quietHours: { from: '23:59', to: '00:00' } } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: start.slice(0, 7), salary: zl(6000), envelopes: { [FOOD]: zl(1500), [GIFTS]: zl(100) } }],
      containers: [{ id: RENT, name: 'Czynsz', amount: zl(2000), cycleMonths: 1, dueMonth: start.slice(0, 7), dueDay: 10, until: addMonths(month, -1), accountId: ACC, counterparty: 'Spółdzielnia' }],
      transactions: [
        ...[3, 2, 1].map((k) => ({ date: `${addMonths(month, -k)}-01`, accountId: ACC, kind: 'income', amount: zl(6000), categoryId: null, counterparty: 'Pracodawca' })),
        { date: today, accountId: ACC, amount: -zl(35), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: today, accountId: ACC, amount: -zl(150), categoryId: PRESENTS, counterparty: 'Empik' },
        { date: today, accountId: ACC, kind: 'income', amount: zl(80), categoryId: null, counterparty: 'Zwrot od znajomego' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()

    // UX-30: the three dues in one line (the notifications keep each due – unit tests).
    const rent = page.locator('[data-testid="briefing-item"][data-kind="cargo"]')
    await expect(rent).toHaveCount(1)
    await expect(rent).toHaveText(`Kontener niezaładowany – ${rentText}`)

    // UX-32: the month's bar over the briefing – the daily envelopes, the day, today against its allowance.
    await expect(page.getByTestId('bridge-month-spent')).toHaveText('35,00 zł')
    await expect(page.getByTestId('bridge-month-day')).toHaveText(`dzień ${dayOfMonth(today)} z ${daysInMonth(month)}`)
    await expect(page.getByTestId('bridge-month-today')).toHaveText('35,00 zł')

    // UX-33: „Energia miesiąca” with today's energy in its row; UX-66: the curve's base in its title, its layout's name kept.
    await expect(page.getByTestId('state-energy')).toContainText('Energia miesiąca')
    await expect(page.getByTestId('state-energy-today')).toContainText('energia dziś:')
    await expect(page.locator('[data-testid="bridge-wealth"] h2')).toHaveText('Krzywa majątku (na kontach)')
    await expect(page.getByTestId('bridge-wealth')).toHaveAttribute('data-panel', 'bridge:Krzywa majątku')

    // UX-76 (D106 pkt 4): no household, no ICTTJ, no trading – their panels and row hidden.
    await expect(page.getByTestId('bridge-receivables')).toHaveCount(0)
    await expect(page.getByTestId('bridge-docking')).toHaveCount(0)
    await expect(page.getByTestId('bridge-income').getByTestId('income-work-6')).toBeVisible()
    await expect(page.getByTestId('bridge-income').getByTestId('income-trading-6')).toHaveCount(0)

    // UX-34 (D106 pkt 2): only an envelope over its pace says so – by how much; Premium in its hint.
    const envelope = (name: string) => page.locator(`[data-testid="bridge-envelopes"] [data-testid="envelope-state"][data-name="${name}"]`)
    const pace = Math.round(zl(100) * (dayOfMonth(today) / daysInMonth(month)))
    await expect(envelope('Prezenty i inne').getByTestId('envelope-zone')).toHaveText(`+${formatPln(zl(150) - pace)} zł ponad tempo`)
    await expect(envelope('Prezenty i inne').getByTestId('envelope-zone')).toHaveAttribute('title', /^Premium \/ Discount – /)
    await expect(envelope('Jedzenie').getByTestId('envelope-zone')).toHaveCount(0)
    // UX-74: an envelope → its operations of the month in Operacje; the month's bar → every operation of the month.
    await envelope('Jedzenie').getByTestId('envelope-open').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await expect(page.getByTestId('operation-row')).toContainText('Biedronka')
    await page.keyboard.press('Control+1')
    await page.getByTestId('bridge-month').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-row')).toHaveCount(3)

    // UX-31: „N meldunków ›” on the briefing – the side menu's count – leads to Meldunki.
    await page.keyboard.press('Control+1')
    const reports = page.getByTestId('briefing-reports')
    const badge = await page.getByTestId('nav-inbox').getAttribute('data-badge')
    expect(Number(badge)).toBeGreaterThan(1)
    await expect(reports).toHaveAttribute('data-count', badge!)
    await reports.click()
    await expect(page.getByTestId('page-inbox')).toBeVisible()
    const fees = page.locator('[data-testid="inbox-item"][data-kind="fees"]')
    await expect(fees).toHaveCount(1)
    await expect(page.getByTestId('inbox-fees')).toContainText('Zaległe opłaty')
    await expect(fees).toContainText(rentText)
    // „Zapłacone poza budżetem” – Ładownia's own action: the dues up to the last one settled, „Cofnij” brings them back.
    await fees.getByTestId('inbox-fees-settle').click()
    await expect(fees).toHaveCount(0)
    await expect.poll(async () => (await records(dir, 'containers')).find((c) => c.id === RENT)?.aliveAt).toBe(addDays(last, 1))
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click()
    await expect(fees).toHaveCount(1)
    await expect.poll(async () => (await records(dir, 'containers')).find((c) => c.id === RENT)?.aliveAt ?? null).toBeNull()
    // „Pokaż w Ładowni”: the container with its late dues.
    await fees.getByTestId('inbox-open').click()
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    await expect(page.getByTestId('container-late-due')).toHaveCount(3)

    // The briefing's line leads to the same container.
    await page.keyboard.press('Control+1')
    await rent.click()
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    await expect(page.getByTestId('container-late-due')).toHaveCount(3)

    // UX-5: the evening report over the briefing too (its hour from midnight on this computer).
    await page.keyboard.press('Control+1')
    await page.evaluate(() => (globalThis as unknown as { fi: { setMachinePrefs(p: unknown): Promise<unknown> } }).fi.setMachinePrefs({ notify: { eveningTime: '00:00' } }))
    await expect(page.getByTestId('page-bridge').getByTestId('evening-report')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Mostek: same pożyczki udzielone (bez domowników) – panel rozliczeń bez „rozlicz na Radarze ›” (Radar go nie pokazuje)', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const LOAN = '01K9Z6000000000000000000A1'
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-bridge-z6-loan-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: start.slice(0, 7), salary: zl(6000), envelopes: {} }],
      loans: [{ id: LOAN, name: 'Pożyczka dla Jana', direction: 'given', counterparty: 'JAN KOWALSKI', amount: zl(1000), date: addDays(today, -5) }],
      transactions: [{ date: addDays(today, -5), accountId: ACC, kind: 'loan', amount: -zl(1000), loanId: LOAN, counterparty: 'JAN KOWALSKI' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // The loan given keeps Mostek's panel (D106 pkt 4)…
    const panel = page.getByTestId('bridge-receivables')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Pożyczki udzielone')
    // …but nobody of the household: Radar's panel is hidden – before, the link led to nothing there.
    await expect(panel.getByTestId('bridge-settlements')).toHaveCount(0)
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    await expect(page.getByTestId('radar-settlements')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
