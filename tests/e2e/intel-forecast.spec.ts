/**
 * R2 (1.17.0), AP-44: the forecast for years in Wywiad – three scenarios, the table of the years, the assumptions edited
 * and kept in fi.json („domyślne” with „Cofnij”), the years shown, the note „prognoza – nie gwarancja”, Ctrl+$.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, monthRange, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
/** „27 500,00” / „−1 200,00” → grosze. */
const grosze = (text: string | null) => Math.round(Number((text ?? '').replace(/\s/g, '').replace('−', '-').replace(',', '.')) * 100)

test('AP-44: prognoza wieloletnia – scenariusze, założenia zapisane w fi.json, lata, podpis, ukryte kwoty', async () => {
  const { month } = warsawNow()
  const first = addMonths(month, -3)
  const ended = monthRange(first, addMonths(month, -1))
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-forecast-')), 'FinancialIntel')
  // 5 000 zł in from work and 3 000 zł of costs each month: the median and the average the forecast starts from.
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${first}-01`, initial: { shields: 0, hull: zl(10000), goals: {} } } }),
    records: {
      balances: [{ date: `${first}-01`, accountId: MBANK, kind: 'opening', amount: zl(30000) }],
      months: [{ month: first, salary: zl(4000), envelopes: {} }],
      transactions: ended.flatMap((m) => [
        { date: `${m}-10`, accountId: MBANK, kind: 'income', amount: zl(5000), counterparty: 'Pracodawca', categoryId: null },
        { date: `${m}-15`, accountId: MBANK, kind: 'expense', amount: -zl(3000), counterparty: 'Sklep', categoryId: FOOD }
      ])
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+9')
    const panel = page.getByTestId('intel-forecast')
    await expect(panel).toBeVisible()
    const rows = panel.getByTestId('intel-forecast-year')
    // 5 years by default; the first ends with the course's 12th month.
    await expect(rows).toHaveCount(5)
    await expect(rows.first()).toHaveAttribute('data-month', addMonths(month, 12))
    await expect(rows.first().locator('td').first()).toContainText('za 1 rok')
    await expect(panel.getByTestId('intel-forecast-chart')).toHaveAttribute('data-years', '5')
    await expect(panel.getByTestId('intel-forecast-line')).toHaveCount(3)
    const note = panel.getByTestId('intel-forecast-note')
    await expect(note).toContainText('Prognoza – nie gwarancja. Założenia: ostrożny – wpływy z pracy 0,0%/rok, koszty +5,0%/rok, dostawy z ICTTJ bez dostaw')
    await expect(note).toContainText('nie czyta wyników tradingu')
    await expect(note).toContainText('bez IKE, IKZE, PPK i inwestycji')
    await expect(panel.getByTestId('intel-forecast-short')).toContainText('nie')

    // The base scenario: the wages +10 % a year, the costs flat – year 2 adds 12 × (5 500 − 3 000), year 3 12 × (6 050 − 3 000).
    await panel.getByTestId('intel-forecast-wages-base').fill('10')
    await panel.getByTestId('intel-forecast-inflation-base').click()
    await panel.getByTestId('intel-forecast-inflation-base').fill('0')
    await panel.getByTestId('intel-forecast-inflation-base').press('Tab')
    await expect.poll(async () => (await json(join(dataDir, 'fi.json'))).settings.intel.forecast?.base).toEqual({ wages: 10, inflation: 0, deliveries: 0, oneOff: 0 })
    const base = (year: number) => panel.locator(`[data-testid="intel-forecast-year"][data-year="${year}"] [data-testid="intel-forecast-net"][data-scenario="base"]`)
    await expect(base(2)).not.toHaveText('')
    await expect.poll(async () => grosze(await base(2).textContent()) - grosze(await base(1).textContent())).toBe(zl(30000))
    expect(grosze(await base(3).textContent()) - grosze(await base(2).textContent())).toBe(zl(36600))
    await expect(note).toContainText('bazowy – wpływy z pracy +10,0%/rok, koszty 0,0%/rok')

    // The deliveries of ICTTJ – only the captain's assumption: 12 000 zł a year in the optimistic one.
    const deliveries = panel.getByTestId('intel-forecast-deliveries-optimistic')
    await deliveries.click()
    await deliveries.fill('12000')
    await deliveries.press('Tab')
    await expect.poll(async () => (await json(join(dataDir, 'fi.json'))).settings.intel.forecast?.optimistic?.deliveries).toBe(zl(12000))
    await expect(note).toContainText('dostawy z ICTTJ 12 000,00 zł/rok')

    // 10 years – kept on this computer.
    await panel.getByRole('radio', { name: '10 lat' }).click()
    await expect(rows).toHaveCount(10)
    await expect(panel.getByTestId('intel-forecast-chart')).toHaveAttribute('data-years', '10')
    await panel.screenshot({ path: join('test-results', 'screens', 'forecast.png') })
    await note.scrollIntoViewIfNeeded()
    await panel.getByTestId('intel-forecast-assumptions').screenshot({ path: join('test-results', 'screens', 'forecast-assumptions.png') })
    await note.screenshot({ path: join('test-results', 'screens', 'forecast-note.png') })

    // „domyślne” with „Cofnij”.
    await panel.getByTestId('intel-forecast-reset-base').click()
    await expect.poll(async () => (await json(join(dataDir, 'fi.json'))).settings.intel.forecast?.base ?? null).toBeNull()
    await expect(panel.getByTestId('intel-forecast-wages-base')).toHaveValue('4')
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click()
    await expect.poll(async () => (await json(join(dataDir, 'fi.json'))).settings.intel.forecast?.base).toEqual({ wages: 10, inflation: 0, deliveries: 0, oneOff: 0 })
    await expect(panel.getByTestId('intel-forecast-wages-base')).toHaveValue('10')

    // Ctrl+$: the amounts hidden – the table, the facts, the fields and the chart's axis.
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(base(1)).toHaveText('•••')
    await expect(panel.getByTestId('intel-forecast-now')).toHaveText('••• zł')
    await expect(deliveries).toHaveValue('•••')
    await expect(panel.getByTestId('intel-forecast-chart').locator('text').first()).toHaveText('•••')
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(base(1)).not.toHaveText('•••')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
