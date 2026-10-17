import { mkdtempSync, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const FUN = '01KDEFCAT00000000000000600'
const RENT = '01KDEFCAT00000000000000201'
const STREAMING = '01KDEFCAT00000000000000703'

const json = async (path: string) => JSON.parse(await fs.readFile(path, 'utf8'))

/** Seven months of history before this one (the first is not full): the same costs every month – 2 479,99 zł. */
function history(month: string) {
  const out: Array<Record<string, unknown>> = []
  for (let i = 7; i >= 1; i--) {
    const m = addMonths(month, -i)
    const t = (day: string, v: number, categoryId: string, counterparty: string) => ({ date: `${m}-${day}`, accountId: ACC, amount: -zl(v), categoryId, counterparty })
    out.push(t('02', 1500, RENT, 'WSPOLNOTA'), t('05', 400, GROCERIES, 'Biedronka'), t('06', 100, GROCERIES, 'Biedronka'), t('12', 280, GROCERIES, 'Lidl'), t('07', 49.99, STREAMING, 'NETFLIX.COM'), t('15', 150, FUN, 'Bolt'))
  }
  return out
}

test('Kreator startu: salda, historia, pensja ze średnich, ładownia i koperty, podział środków, okręt → plan miesiąca i ładownia', async () => {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-month-')), 'FinancialIntel')
  seedFolder(dataDir, { records: { transactions: history(month) } })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.getByTestId('banner-wizard-start').click()
    await expect(page.getByTestId('page-wizard')).toBeVisible()

    // 1. The balance now.
    await page.getByTestId('wizard-balance').first().fill('25000')
    await page.getByTestId('wizard-balance').first().press('Enter')
    // Every account needs its balance (an empty one: 0) – otherwise its history would count from zero.
    await page.getByTestId('wizard-balance').nth(1).fill('0')
    await page.getByTestId('wizard-balance').nth(1).press('Enter')
    await page.getByTestId('wizard-next').click()
    // 2. The history (imported before).
    await expect(page.getByTestId('wizard-history')).toContainText('42')
    await page.getByTestId('wizard-next').click()
    // 3. The salary: the average costs of 6 full months (2 479,99 zł) up to 2 500 zł (D70).
    await expect(page.getByTestId('wizard-salary')).toHaveValue('2 500,00')
    await page.getByTestId('wizard-next').click()
    // 4. The rent as a container; the envelopes from the averages without it.
    await expect(page.getByTestId('wizard-cargo')).toHaveCount(4)
    await page.locator('[data-testid="wizard-cargo"][data-name="WSPOLNOTA"] input').check()
    await expect(page.locator('[data-testid="wizard-envelope"][data-name="Jedzenie"] input')).toHaveValue('780,00')
    await expect(page.locator('[data-testid="wizard-envelope"][data-name="Rozrywka i hobby"] input')).toHaveValue('150,00')
    await page.getByTestId('wizard-next').click()
    // 5. The split: the shields to 3 salaries, the hull to 6 × 2 479,99 zł, the rest free in the shields.
    await expect(page.getByTestId('wizard-split-hull')).toHaveValue('14 879,94')
    await expect(page.getByTestId('wizard-split-shields')).toContainText('10 120,06')
    await page.getByTestId('wizard-next').click()
    // 6. The ship.
    await page.getByTestId('wizard-ship').fill('Sokół')
    await page.getByTestId('wizard-finish').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('banner-wizard')).toHaveCount(0)

    await expect.poll(async () => (await json(join(dataDir, 'fi.json'))).settings.budget.start).toBe(today)
    const fi = await json(join(dataDir, 'fi.json'))
    expect(fi.settings.shipName).toBe('Sokół')
    expect(fi.settings.budget.initial).toMatchObject({ hull: 1487994, goals: {} })
    await expect.poll(async () => (await json(join(dataDir, 'months', `${month}.json`))).salary).toBe(zl(2500))
    const plan = await json(join(dataDir, 'months', `${month}.json`))
    expect(plan.envelopes).toMatchObject({ [FOOD]: zl(780), [FUN]: zl(150) })
    const containers = await fs.readdir(join(dataDir, 'containers'))
    expect(containers).toHaveLength(1)
    expect((await json(join(dataDir, 'containers', containers[0]!))).counterparty).toBe('WSPOLNOTA')
    const balances = await fs.readdir(join(dataDir, 'balances'), { recursive: true })
    const opening = await json(join(dataDir, 'balances', String(balances.find((f) => String(f).endsWith('.json')))))
    expect(opening).toMatchObject({ kind: 'opening', date: today, amount: zl(25000) })

    // Plan miesiąca: the salary and an envelope changed; the split follows.
    await page.getByTestId('nav-month').click()
    await expect(page.getByTestId('month-salary')).toHaveValue('2 500,00')
    await expect(page.getByTestId('split-cargo')).toContainText('1 500,00')
    const fun = page.locator('[data-testid="month-envelope"][data-name="Rozrywka i hobby"] input')
    await fun.fill('200')
    await fun.press('Enter')
    await expect.poll(async () => (await json(join(dataDir, 'months', `${month}.json`))).envelopes[FUN]).toBe(zl(200))
    // 2 500 − 1 500 (rent) − 780 − 200 − 50 = −30: the plan is over the salary.
    await expect(page.getByTestId('month-unallocated')).toContainText('30,00')
    await expect(page.getByTestId('month-unallocated')).toContainText('przekracza')
    await expect(page.getByTestId('month-debrief')).toContainText('Pierwszy debriefing')

    // Ładownia: a yearly fee with its tank; over the load line it asks first.
    await page.getByTestId('nav-cargo').click()
    await expect(page.locator('[data-testid="cargo-row"][data-name="WSPOLNOTA"]')).toBeVisible()
    await page.getByTestId('cargo-add').click()
    await page.getByTestId('container-name').fill('OC auta')
    await page.getByTestId('container-amount').fill('1240')
    await page.getByTestId('container-amount').press('Enter')
    await page.getByTestId('container-cycle').selectOption('12')
    await expect(page.getByTestId('cargo-sim')).toContainText('Zasięg po dodaniu')
    // Rent 1 500 + 103,33 a month = 64,1% of 2 500 zł: over the 40% line – a confirmation first.
    await expect(page.getByTestId('cargo-over-warning')).toBeVisible()
    await page.getByTestId('cargo-new-save').click()
    await page.getByTestId('cargo-new-confirm').click()
    await expect(page.locator('[data-testid="cargo-row"][data-name="OC auta"]')).toBeVisible()
    await expect(page.locator('[data-testid="cargo-tank"][data-name="OC auta"]')).toBeVisible()
    await expect.poll(async () => (await fs.readdir(join(dataDir, 'containers'))).length).toBe(2)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
