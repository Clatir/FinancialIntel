/**
 * N3 (1.15.7) – one state, every screen (T390–T392): a partial salary this month (AP-13 – today's energy capped by the
 * month's) with last month's rent unpaid (AP-10 – still due): Mostek, Plan miesiąca, odprawa, Ładownia, Radar,
 * Dowództwo and Wywiad (the course's rest of the month from the month's energy, „teraz” = Mostek – AP-18) say the same;
 * the hull at 99,4 % of its target counts as full on Mostek and in the course alike (AP-17).
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, daysBetween, warsawNow } from '../../src/shared/calc/dates'
import { dm } from '../../src/shared/format'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const HOME = '01KDEFCAT00000000000000200'
const FUN = '01KDEFCAT00000000000000600'
const GIFTS = '01KDEFCAT00000000000000900'
const RENT = '01K9N3J00000000000000000C1'

test('N3: pensja częściowa i zaległy czynsz – Mostek, Plan, odprawa, Ładownia, Radar, Dowództwo i Wywiad mówią to samo', async () => {
  const { date: today, month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const lateDue = `${prev}-10`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n3-whole-')), 'FinancialIntel')
  // PM.3 w2: 4 000 zł at the start, all of it spent last month – this month's salary of 4 000 zł finds the shields and
  // the hull empty (0 zł paid); 2 000 zł in today (the shields). The rent of 800 zł on the 10th: last month's unpaid.
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(4000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500), [FUN]: zl(500), [HOME]: zl(500), [GIFTS]: zl(1000) } }],
      containers: [{ id: RENT, name: 'Czynsz', amount: zl(800), cycleMonths: 1, dueMonth: prev, dueDay: 10, accountId: ACC, counterparty: 'Spółdzielnia' }],
      transactions: [
        { date: `${prev}-05`, accountId: ACC, amount: -zl(1500), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: `${prev}-10`, accountId: ACC, amount: -zl(500), categoryId: FUN, counterparty: 'Kino' },
        { date: `${prev}-15`, accountId: ACC, amount: -zl(1000), categoryId: GIFTS, counterparty: 'Jubiler' },
        { date: `${prev}-20`, accountId: ACC, amount: -zl(1000), categoryId: HOME, counterparty: 'IKEA' },
        { date: today, accountId: ACC, kind: 'income', amount: zl(2000), categoryId: null, counterparty: 'Pracodawca' }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    // Mostek: today's energy capped by the month's (0 zł – a partial salary), the range of 2 000 zł over 4 000 zł of costs.
    await expect(page.getByTestId('bridge-energy')).toHaveText('0,00 zł')
    await expect(page.getByTestId('bridge-energy-cap')).toHaveText('pensja częściowa – energia miesiąca 0,00 zł')
    await expect(page.getByTestId('state-range')).toHaveText('0,5 mies.')
    // The briefing: the partial salary and last month's rent – once.
    await expect(page.locator('[data-testid="briefing-item"][data-kind="alarm"]').filter({ hasText: 'Pensja częściowa: brakuje 4 000,00 zł' })).toHaveCount(1)
    await expect(page.locator('[data-testid="briefing-item"][data-kind="cargo"]').filter({ hasText: `termin ${dm(lateDue)} minął` })).toHaveText(`Kontener niezaładowany: Czynsz 800,00 zł – termin ${dm(lateDue)} minął, brak płatności.`)

    // Plan miesiąca: the same energy today.
    await page.getByTestId('nav-month').click()
    await expect(page.getByTestId('month-energy-today')).toHaveText('0,00 zł')
    await expect(page.getByTestId('month-energy-cap')).toHaveText('pensja częściowa – energia miesiąca 0,00 zł')

    // Ładownia: last month's due on the row.
    await page.keyboard.press('Control+5')
    const row = page.locator('[data-testid="cargo-row"][data-name="Czynsz"]').getByTestId('cargo-state')
    await expect(row).toHaveAttribute('data-state', 'overdue')
    await expect(row).toHaveAttribute('data-due', lateDue)
    await expect(row).toHaveAttribute('data-carried', 'yes')

    // Radar: the same due on its day.
    await page.keyboard.press('Control+7')
    const late = page.locator('[data-testid="radar-item"][data-kind="fixed"]').filter({ hasText: 'Czynsz' }).filter({ hasText: dm(lateDue) })
    await expect(late).toHaveAttribute('data-overdue', 'yes')
    await expect(late).toContainText(`po terminie ${daysBetween(lateDue, today)} dni`)

    // Dowództwo: the order says what today's energy is – capped by the month's – and what breaks it (the allowance).
    await page.keyboard.press('Control+8')
    await expect(page.getByTestId('command-orders')).toContainText('wydatki dnia ≤ przydział dnia')
    await expect(page.getByTestId('command-orders-daily')).toContainText('nie więcej niż zostało energii miesiąca')

    // Wywiad: „teraz” = Mostek; the month's rest – the envelopes 3 500 zł and the two rents 1 600 zł over the month's
    // energy (0 zł): 2 000 zł from the shields, 3 100 zł lacking; the course starts from it.
    await page.keyboard.press('Control+9')
    await expect(page.getByTestId('intel-course-rest')).toHaveText('Resztka miesiąca: koperty i opłaty 5 100,00 zł ponad energię miesiąca (pensja częściowa) – z osłon, brakuje 3 100,00 zł.')
    const sim = page.getByTestId('intel-maneuver')
    await expect(sim.getByTestId('maneuver-range').locator('td').nth(1)).toHaveText('0,5 mies. · Zwiadowca')
    await expect(sim.getByTestId('maneuver-range-rest').locator('td').nth(1)).toHaveText('0,0 mies. · Zwiadowca')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('N3: kadłub 99,4 % celu – „liczy się jako pełny” na Mostku i „Kadłub pełny – teraz” w kursie i symulatorze', async () => {
  const { date: today, month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n3-hull-full-')), 'FinancialIntel')
  // The hull 17 900 / 18 000 zł (6 × 3 000 zł of costs assumed), the shields 14 100 / 12 000 zł after this month's salary.
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start, initial: { shields: 0, hull: zl(17900), goals: {} } }, layers: { ...s.layers, assumedCosts: zl(3000) } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(40000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500), [HOME]: zl(500) } }],
      transactions: [
        { date: `${prev}-05`, accountId: ACC, amount: -zl(1500), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: `${prev}-12`, accountId: ACC, amount: -zl(2500), categoryId: HOME, counterparty: 'IKEA' },
        { date: today, accountId: ACC, amount: -zl(100), categoryId: GROCERIES, counterparty: 'Żabka' }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('state-hull-tolerance')).toHaveText('brakuje 100,00 zł – do 1% celu liczy się jako pełny (firewall, wolne do decyzji)')
    await page.keyboard.press('Control+9')
    // Before: „Kadłub pełny —” – no income in the course fills the last 100 zł.
    const hull = page.getByTestId('intel-course-hull-full').locator('td')
    for (const i of [1, 2, 3]) await expect(hull.nth(i)).toHaveText('teraz')
    await expect(page.getByTestId('intel-maneuver').locator('tr').filter({ hasText: 'Kadłub pełny' }).locator('td').nth(1)).toHaveText('teraz')
    // The month's energy pays its rest: nothing said over it.
    await expect(page.getByTestId('intel-course-rest')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
