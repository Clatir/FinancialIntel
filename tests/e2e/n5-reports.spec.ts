import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, monthOf, warsawNow } from '../../src/shared/calc/dates'
import { defaultWatchMonday } from '../../src/shared/calc/intel'
import { monthLabel, plDate } from '../../src/renderer/lib/format'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const FUN = '01KDEFCAT00000000000000600'

/**
 * AP-24 (1.15.9, N5): the reports at the turn of a week, a month and a year – one „current” week (AF-68), the week's
 * covers of envelopes (PM sp. 12), a month in progress without a balance (RY sp. 6), the year's review over its history
 * only (R-19, AF-34).
 */
test('Raporty (AP-24): bieżący tydzień bez „później ›”, pokrycia kopert tygodnia, miesiąc w toku „miesiąc trwa”, przegląd roczny od salda otwarcia', async () => {
  const { date: today, month, time } = warsawNow()
  const start = `${addMonths(month, -3)}-15`
  const year = start.slice(0, 4)
  const due = defaultWatchMonday(today, time)
  const coverDay = addDays(due, 2)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n5-reports-')), 'FinancialIntel')
  const transactions = []
  for (let d = start; d < today; d = addDays(d, 4)) transactions.push({ date: d, accountId: MBANK, amount: -zl(50), categoryId: FOOD, time: '12:00', counterparty: 'Sklep' })
  // This month's spending (before the salary from work): the running month's balance would be a minus.
  transactions.push({ date: today, accountId: MBANK, amount: -zl(12), categoryId: FOOD, counterparty: 'Kiosk' })
  const cover = { id: '01KN5C0VER0000000000000001', from: FUN, to: FOOD, amount: zl(120), at: `${coverDay}T10:00:00.000Z` }
  const startMonth = monthOf(start)
  const coverMonth = monthOf(coverDay)
  const months = [
    { month: startMonth, salary: zl(3000), envelopes: { [FOOD]: zl(1200), [FUN]: zl(300) }, ...(coverMonth === startMonth ? { envelopeCovers: [cover] } : {}) },
    ...(coverMonth !== startMonth ? [{ month: coverMonth, salary: zl(3000), envelopes: { [FOOD]: zl(1200), [FUN]: zl(300) }, envelopeCovers: [cover] }] : [])
  ]
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(2500) } }),
    records: { balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }], months, transactions }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+0')
    await expect(page.getByTestId('page-reports')).toBeVisible()
    // The week due is the report's „current” one: no way past it to a week in progress (AF-68); one back and forth.
    await expect(page.getByTestId('reports-watch')).toContainText(`${plDate(due)} – ${plDate(addDays(due, 6))}`)
    await expect(page.getByTestId('reports-watch-next')).toBeDisabled()
    await expect(page.getByTestId('reports-watch-current')).toHaveCount(0)
    await expect(page.getByTestId('reports-watch-covers')).toContainText(`${plDate(coverDay).slice(0, 5)} Jedzenie z koperty Rozrywka i hobby`)
    await expect(page.getByTestId('reports-watch-covers')).toContainText('120,00 zł limitu')
    await page.getByTestId('reports-watch-prev').click()
    await expect(page.getByTestId('reports-watch-covers')).toHaveCount(0)
    await expect(page.getByTestId('reports-watch-envelopes')).toHaveCount(0)
    await page.getByTestId('reports-watch-next').click()
    await expect(page.getByTestId('reports-watch-next')).toBeDisabled()

    // A month in progress has no balance of fuel yet (RY sp. 6).
    await page.getByRole('radio', { name: 'Debriefing' }).click()
    await page.getByTestId('reports-debrief-month').selectOption(month)
    await expect(page.getByTestId('reports-debrief')).toContainText('miesiąc trwa – wynik po jego końcu')
    await expect(page.getByTestId('reports-debrief')).not.toContainText('Stopa oszczędności')

    // The year's review from the data's first day (R-19): its opening balance's day, the months before – no history.
    await page.getByRole('radio', { name: 'Przegląd roczny' }).click()
    await page.getByTestId('reports-year-select').selectOption(year)
    await expect(page.getByTestId('reports-year')).toContainText(`Pieniądze na kontach na początku (saldo otwarcia ${plDate(start)})`)
    await expect(page.getByTestId('reports-year')).toContainText('po odjęciu długu')
    if (startMonth > `${year}-01`) await expect(page.getByTestId('reports-year')).toContainText('brak historii')
    else await expect(page.getByTestId('reports-year')).not.toContainText('brak historii')
    const ahead = addMonths(month, 1)
    if (ahead.startsWith(`${year}-`)) await expect(page.getByTestId('reports-year')).not.toContainText(monthLabel(ahead))
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
