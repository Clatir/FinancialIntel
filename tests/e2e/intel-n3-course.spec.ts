/**
 * N3 (1.15.7), AP-18: the simulator's „teraz” is Mostek's range, „wyczyść manewr” clears everything, the course shows a
 * partial salary instead of shields below zero.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, monthRange, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, seedId, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

test('N3 AP-18: symulator – „teraz” = zasięg Mostka, resztka miesiąca osobno; „wyczyść manewr” czyści wszystko', async () => {
  const { date: today, month } = warsawNow()
  const first = addMonths(month, -3)
  const ended = monthRange(first, addMonths(month, -1))
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n3-sim-')), 'FinancialIntel')
  const loanId = seedId()
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${first}-01`, initial: { shields: 0, hull: zl(10000), goals: {} } } }),
    records: {
      balances: [{ date: `${first}-01`, accountId: MBANK, kind: 'opening', amount: zl(30000) }],
      months: [{ month: first, salary: zl(4000), envelopes: {} }],
      // Tomek's repayments late – the course expects them this month; a buoy of 3 000 zł today.
      loans: [{ id: loanId, name: 'Pożyczka dla Tomka', direction: 'given', amount: zl(1000), date: `${first}-20`, schedule: [{ id: seedId(), date: `${addMonths(month, -2)}-04`, amount: zl(500) }, { id: seedId(), date: `${addMonths(month, -1)}-05`, amount: zl(500) }] }],
      scheduled: [{ name: 'Wesele', date: today, amount: -zl(3000) }],
      transactions: [
        ...ended.map((m) => ({ date: `${m}-15`, accountId: MBANK, kind: 'expense', amount: -zl(3500), counterparty: 'Sklep', categoryId: FOOD })),
        { date: `${first}-20`, accountId: MBANK, kind: 'loan', loanId, amount: -zl(1000), counterparty: 'Tomek', categoryId: null }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const bridge = ((await page.getByTestId('state-range').textContent()) ?? '').trim()
    expect(bridge).toMatch(/\d+,\d mies\./)
    await page.keyboard.press('Control+9')
    const sim = page.getByTestId('intel-maneuver')
    // „Teraz” = Mostek (AF-33); the month's rest (+1 000 zł of Tomek, −3 000 zł of the buoy) in its own row.
    await expect(sim.getByTestId('maneuver-range').locator('td').nth(1)).toContainText(bridge)
    await expect(sim.getByTestId('maneuver-range').locator('td').nth(2)).toContainText(bridge)
    const rest = sim.getByTestId('maneuver-range-rest')
    await expect(rest).toBeVisible()
    await expect(rest.locator('td').nth(1)).not.toContainText(bridge)

    // „Wyczyść manewr” clears every field – the goal's name, a wrong term and „rata z pensji” too (WY sp. 3).
    await sim.getByTestId('maneuver-goal-name').fill('Audyt')
    await sim.getByLabel('Termin nowego celu').fill('2027-13')
    await expect(sim.getByTestId('maneuver-goal-deadline')).toHaveAttribute('aria-invalid', 'true')
    await expect(sim).toContainText('Termin jako RRRR-MM')
    await sim.getByTestId('maneuver-goal-rate').getByRole('switch').click()
    await expect(sim.getByTestId('maneuver-goal-rate').getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    await sim.getByTestId('maneuver-clear').click()
    await expect(sim.getByTestId('maneuver-goal-name')).toHaveValue('')
    await expect(sim.getByTestId('maneuver-goal-deadline')).toHaveValue('')
    await expect(sim.getByTestId('maneuver-goal-deadline')).toHaveAttribute('aria-invalid', 'false')
    await expect(sim.getByTestId('maneuver-goal-rate').getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    await expect(sim.getByTestId('maneuver-clear')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('N3 AP-18: kurs przy pustych osłonach i kadłubie – pensja częściowa i „brakuje”, nigdy osłony poniżej zera', async () => {
  const { month } = warsawNow()
  const first = addMonths(month, -3)
  const ended = monthRange(first, addMonths(month, -1))
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n3-course-')), 'FinancialIntel')
  // 6 000 zł at the start; 3 000 zł in, 4 800 zł of costs a month, the salary 4 000 zł – the ship runs dry.
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${first}-01` } }),
    records: {
      balances: [{ date: `${first}-01`, accountId: MBANK, kind: 'opening', amount: zl(6000) }],
      months: [{ month: first, salary: zl(4000), envelopes: {} }],
      transactions: ended.flatMap((m) => [
        { date: `${m}-10`, accountId: MBANK, kind: 'income', amount: zl(3000), counterparty: 'Pracodawca', categoryId: null },
        { date: `${m}-12`, accountId: MBANK, kind: 'expense', amount: -zl(4800), counterparty: 'Sklep', categoryId: FOOD }
      ])
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+9')
    const summary = page.getByTestId('intel-course-summary')
    await expect(summary.getByTestId('intel-course-partial').locator('td').nth(2)).not.toHaveText('nie')
    await expect(summary.getByTestId('intel-course-short').locator('td').nth(2)).toContainText('zł')
    await expect(page.getByTestId('intel-course-months').locator('tbody tr')).toHaveCount(12)
    // Never „−21 600,00” (WY.19): the shields end each month at zero at the lowest.
    await expect(page.getByTestId('intel-course-months')).not.toContainText('−')
    await expect(page.getByTestId('intel-maneuver').getByTestId('maneuver-partial').locator('td').nth(1)).not.toHaveText('nie')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
