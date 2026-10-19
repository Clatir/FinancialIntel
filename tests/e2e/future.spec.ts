import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const XTB = '01KDEFACC00000000000000002'
const DOM = '01KDEFCAT00000000000000200'
const ZDROWIE = '01KDEFCAT00000000000000500'

test('1.8.0 Radar: boje (dopasowana operacja z banku, „to nie ta”, odhacz, wykonaj teraz, termin co roku), saldo konta przed płatnością i przelew własny, odprawa', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  const yesterday = addDays(today, -1)
  const wedding = addDays(today, 10)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-future-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { ...s.household, since: start } }),
    records: {
      balances: [
        { date: start, accountId: MBANK, kind: 'opening', amount: zl(2250) },
        { date: start, accountId: XTB, kind: 'opening', amount: zl(10000) }
      ],
      months: [{ month: addMonths(month, -3), salary: zl(4000), envelopes: {} }],
      // A buoy of yesterday and the bank's operation of the same amount and payee: matched on its own.
      scheduled: [{ name: 'Czynsz garażu', date: yesterday, amount: -zl(250), accountId: MBANK, counterparty: 'Garaże Sp' }],
      transactions: [{ date: yesterday, accountId: MBANK, kind: 'expense', amount: -zl(250), counterparty: 'Garaże Sp', categoryId: DOM }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    const day = (name: string) => page.locator(`[data-testid="buoy-day"][data-name="${name}"]`)

    // The operation from the bank did the buoy; „to nie ta” – the day is late again, „odhacz” closes it without one.
    const done = page.getByTestId('buoys-done')
    await done.locator('summary').click()
    await expect(done.locator('[data-testid="buoy-done"][data-name="Czynsz garażu"]')).toContainText('operacja dopasowana')
    await done.getByTestId('buoy-not-this').click()
    await expect(day('Czynsz garażu')).toHaveAttribute('data-state', 'late')
    await expect(day('Czynsz garażu')).toContainText('po terminie 1 dzień')
    await expect.poll(async () => (await records(dir, 'scheduled')).map((s) => (s.notMatched as string[]).length)).toEqual([1])
    await day('Czynsz garażu').getByTestId('buoy-tick').click()
    await expect(day('Czynsz garażu')).toHaveCount(0)
    await expect(page.locator('[data-testid="buoy-done"][data-name="Czynsz garażu"]')).toContainText('odhaczone')

    // A new buoy: 3 000 zł from mBank in 10 days – mBank has 2 000 zł.
    const form = page.getByTestId('radar-new-buoy')
    await form.getByTestId('buoy-name').fill('Wesele Kasi')
    await form.getByTestId('buoy-date').fill(wedding)
    await form.getByTestId('buoy-date').press('Tab')
    await form.getByTestId('buoy-amount').fill('3000')
    await form.getByTestId('buoy-amount').press('Tab')
    await form.getByTestId('buoy-account').selectOption({ label: 'mBank' })
    await form.getByTestId('buoy-save').click()
    await expect(day('Wesele Kasi')).toHaveAttribute('data-state', 'ahead')
    await expect(day('Wesele Kasi')).toContainText('za 10 dni')
    await expect(page.locator('[data-testid="radar-item"][data-kind="plan"]').filter({ hasText: 'Wesele Kasi' })).toHaveCount(1)
    await expect.poll(async () => (await records(dir, 'scheduled')).filter((s) => s.name === 'Wesele Kasi').map((s) => [s.date, s.amount, s.accountId])).toEqual([[wedding, -zl(3000), MBANK]])
    const mbank = page.locator('[data-testid="radar-account"][data-name="mBank"]')
    await expect(mbank.getByTestId('radar-account-short')).toContainText('Zabraknie 1 000,00 zł')
    await expect(mbank.getByTestId('radar-account-short')).toContainText('przelej z konta Portfel XTB')

    // A term without an amount, every year.
    await form.getByRole('radio', { name: 'Termin bez kwoty' }).click()
    await form.getByTestId('buoy-name').fill('Przegląd auta')
    await form.getByTestId('buoy-date').fill(addDays(today, 5))
    await form.getByTestId('buoy-date').press('Tab')
    await form.getByTestId('buoy-yearly').getByRole('switch').click()
    await form.getByTestId('buoy-save').click()
    await expect(day('Przegląd auta')).toContainText('co roku')
    await expect(day('Przegląd auta').getByTestId('buoy-execute')).toHaveCount(0)

    // The briefing: both buoys and the account short of money.
    await page.keyboard.press('Control+1')
    const brief = (kind: string) => page.locator(`[data-testid="briefing-item"][data-kind="${kind}"]`)
    await expect(brief('plan').filter({ hasText: 'Wesele Kasi' })).toContainText('Boja: Wesele Kasi za 10 dni – 3 000,00 zł (wydatek).')
    await expect(brief('plan').filter({ hasText: 'Przegląd auta' })).toContainText('Termin: Przegląd auta za 5 dni.')
    await expect(brief('account')).toContainText('Na koncie mBank zabraknie 1 000,00 zł')

    // „Zaplanuj przelew własny”: one operation of both accounts, today – the short is gone.
    await page.keyboard.press('Control+7')
    await mbank.getByTestId('radar-account-transfer').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.kind === 'transfer').map((t) => [t.date, t.accountId, t.counterAccountId, t.amount, t.bothSides]))
      .toEqual([[today, XTB, MBANK, -zl(1000), true]])
    await page.keyboard.press('Control+7')
    await expect(mbank.getByTestId('radar-account-short')).toHaveCount(0)

    // „Wykonaj teraz”: the operation of the buoy today, the buoy done by it.
    await day('Wesele Kasi').getByTestId('buoy-execute').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.title === 'Wesele Kasi').map((t) => [t.date, t.accountId, t.amount, t.kind]))
      .toEqual([[today, MBANK, -zl(3000), 'expense']])
    await page.keyboard.press('Control+7')
    await expect(day('Wesele Kasi')).toHaveCount(0)
    await expect(page.locator('[data-testid="buoy-done"][data-name="Wesele Kasi"]')).toContainText('operacja z boi')
    await page.screenshot({ path: join('test-results', 'screens', '30-buoys.png') })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('1.8.0 Plan miesiąca: zapas koperty z łupów, „pokryj z koperty” z „Cofnij” i dziennikiem wachty, rata celu z terminem, plan kampanii z „kopiuj dalej”', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  const next = addMonths(month, 1)
  // The year after the one of next month (the page goes to next month first).
  const year = Number(next.slice(0, 4)) + 1
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-future-')), 'FinancialIntel')
  const plan = { salary: zl(4000), envelopes: { [DOM]: zl(500), [ZDROWIE]: zl(300) } }
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start, initial: { shields: 0, hull: 0, goals: {} } }, household: { ...s.household, since: start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(30000) }],
      months: [
        { month: addMonths(month, -3), ...plan },
        // Last month's loot: 100 zł of Dom's reserve kept in it for this month (F28).
        { month: addMonths(month, -1), ...plan, loot: { decidedAt: `${month}-01T08:00:00.000Z`, envelopes: { [DOM]: zl(100) } } }
      ],
      goals: [{ name: 'Wakacje', target: zl(6000), priority: 1, deadline: addMonths(month, 6) }],
      transactions: [{ date: today, accountId: MBANK, kind: 'expense', amount: -zl(450), counterparty: 'Apteka', categoryId: ZDROWIE }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+4')
    await expect(page.getByTestId('page-month')).toBeVisible()
    const envelope = (name: string) => page.getByTestId('month-envelopes').locator(`[data-testid="envelope-state"][data-name="${name}"]`)
    await expect(envelope('Dom')).toContainText('0,00 / 600,00 zł')
    await expect(envelope('Zdrowie')).toContainText('450,00 / 300,00 zł')
    await expect(page.getByTestId('month-envelope-extra')).toHaveText('+100,00')

    // The overrun covered from Dom's reserve – then „Cofnij”, then covered again.
    const cover = async () => {
      await envelope('Zdrowie').getByTestId('envelope-cover').click()
      const dialog = page.getByTestId('cover-dialog')
      await expect(dialog.getByTestId('cover-from')).toHaveValue(DOM)
      await expect(dialog.getByTestId('cover-amount')).toHaveValue('150,00')
      await dialog.getByTestId('cover-confirm').click()
      await expect(envelope('Zdrowie')).toContainText('450,00 / 450,00 zł')
      await expect(envelope('Dom')).toContainText('0,00 / 450,00 zł')
      await expect(envelope('Zdrowie').getByTestId('envelope-cover')).toHaveCount(0)
    }
    await cover()
    await page.getByRole('status').filter({ hasText: 'Koperta Zdrowie pokryta z Dom' }).getByTestId('toast-action').click()
    await expect(envelope('Zdrowie')).toContainText('450,00 / 300,00 zł')
    await cover()
    await expect
      .poll(async () => (await records(dir, 'months')).filter((m) => m.month === month).flatMap((m) => (m.envelopeCovers as Array<Record<string, unknown>>).map((c) => [c.from, c.to, c.amount])))
      .toEqual([[DOM, ZDROWIE, zl(150)]])
    await page.keyboard.press('Control+8')
    await expect(page.locator('[data-testid="command-log-entry"][data-kind="cover"]')).toHaveText(/Pokrycie przekroczenia: Zdrowie z koperty Dom – 150,00 zł limitu/)

    // A goal with a deadline: the rate it needs, „rata z pensji” – next month's split shows it.
    await page.keyboard.press('Control+6')
    const need = page.getByTestId('starmap-need')
    await expect(need).toContainText('kurs przechwycenia: 1 000,00 zł/mies.')
    await need.getByTestId('starmap-rate').getByRole('switch').click()
    await expect.poll(async () => (await records(dir, 'goals')).map((g) => g.rates)).toEqual([[{ from: next, until: null }]])
    await page.keyboard.press('Control+4')
    await page.getByTestId('month-next').click()
    await expect(page.getByTestId('split-rates')).toContainText('1 000,00 zł')
    await expect(page.getByTestId('split-rates')).toContainText('gdy osłony i kadłub pełne')

    // The year's plan: next year's January and March edited, January copied on – „Cofnij” sets March back.
    await page.getByTestId('month-year-toggle').click()
    await page.getByTestId('year-plan-next').click()
    await expect(page.getByTestId('year-plan')).toContainText(`Plan kampanii ${year}`)
    const cell = (row: string, m: number) => page.locator(`[data-testid="year-row"][data-id="${row}"] [data-testid="year-cell"][data-month="${year}-${String(m).padStart(2, '0')}"]`)
    // Focused first: the field puts its draft in on focus (a fill racing it would type after it).
    const type = async (row: string, m: number, text: string) => {
      const input = cell(row, m).getByTestId('year-cell-input')
      await input.click()
      await input.fill(text)
      await input.press('Tab')
    }
    await type('salary', 1, '5000')
    await type('salary', 3, '5500')
    await expect(cell('salary', 2).getByTestId('year-cell-input')).toHaveValue('5\u00a0000,00')
    await expect(cell('salary', 3)).toHaveAttribute('data-own', 'true')
    await cell('salary', 1).hover()
    await cell('salary', 1).getByTestId('year-cell-copy').click()
    await expect(cell('salary', 3).getByTestId('year-cell-input')).toHaveValue('5\u00a0000,00')
    await expect.poll(async () => (await records(dir, 'months')).filter((m) => String(m.month).startsWith(`${year}-`)).map((m) => [m.month, m.salary])).toEqual([
      [`${year}-01`, zl(5000)],
      [`${year}-03`, zl(5000)]
    ])
    await page.getByRole('status').filter({ hasText: `od stycznia ${year} do końca roku` }).getByTestId('toast-action').click()
    await expect(cell('salary', 3).getByTestId('year-cell-input')).toHaveValue('5\u00a0500,00')
    await type(DOM, 4, '')
    await expect.poll(async () => (await records(dir, 'months')).filter((m) => m.month === `${year}-04`).map((m) => (m.envelopes as Record<string, number>)[DOM] ?? null)).toEqual([null])
    await page.screenshot({ path: join('test-results', 'screens', '31-year-plan.png') })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('1.8.0 Wywiad: kurs na 12 miesięcy i symulator manewrów (zakup, pensja zastosowana w planie)', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -6)}-01`
  const next = addMonths(month, 1)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-future-')), 'FinancialIntel')
  const months = [5, 4, 3, 2, 1].map((n) => addMonths(month, -n))
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start, initial: { shields: 0, hull: 0, goals: {} } }, household: { ...s.household, since: start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -6), salary: zl(4000), envelopes: {} }],
      transactions: months.flatMap((m) => [
        { date: `${m}-10`, accountId: MBANK, kind: 'income', amount: zl(5000), counterparty: 'Pracodawca' },
        { date: `${m}-15`, accountId: MBANK, kind: 'expense', amount: -zl(2500), counterparty: 'Czynsz', categoryId: DOM }
      ])
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+9')
    const course = page.getByTestId('intel-course')
    await expect(course.getByTestId('intel-course-summary')).toContainText('Osłony pełne')
    await expect(course.getByTestId('intel-course-months').locator('tbody tr')).toHaveCount(12)

    const sim = page.getByTestId('intel-maneuver')
    const range = sim.getByTestId('maneuver-range')
    const before = (await range.locator('td').nth(1).textContent()) ?? ''
    await expect(range.locator('td').nth(2)).toHaveText(before)
    await sim.getByTestId('maneuver-purchase').fill('15000')
    await sim.getByTestId('maneuver-purchase').press('Tab')
    await expect(range.locator('td').nth(2)).not.toHaveText(before)
    await expect(range.locator('td').nth(1)).toHaveText(before)

    await sim.getByTestId('maneuver-salary').fill('6000')
    await sim.getByTestId('maneuver-salary').press('Tab')
    await sim.getByTestId('maneuver-apply-salary').click()
    await expect.poll(async () => (await records(dir, 'months')).filter((m) => m.month === next).map((m) => m.salary)).toEqual([zl(6000)])
    await page.screenshot({ path: join('test-results', 'screens', '32-course.png') })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
