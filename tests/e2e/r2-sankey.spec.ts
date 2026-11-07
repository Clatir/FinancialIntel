import { mkdtempSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { monthLabel } from '../../src/renderer/lib/format'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const AUTO = '01KDEFCAT00000000000000300'

/**
 * AP-46 (1.17.0, R2 – T490, T491): „Skąd i dokąd” in the debriefing – the month's income through the month to the
 * envelopes' categories and to the ship, the salary through the energy; the tooltip with the amount and its percent;
 * the hidden amounts keep the bars; the PDF with it.
 */
test('Debriefing (AP-46): Sankey miesiąca – przychód i koszty, pensja i energia, dymek, ukryte kwoty, PDF', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  const last = addMonths(month, -1)
  const out = mkdtempSync(join(tmpdir(), 'fi-sankey-out-'))
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-sankey-')), 'FinancialIntel')
  const transactions = [
    { date: `${last}-08`, accountId: MBANK, amount: zl(5000), kind: 'income', counterparty: 'Firma' },
    { date: `${last}-03`, accountId: MBANK, amount: -zl(200), categoryId: FOOD, counterparty: 'Sklep' },
    { date: `${last}-10`, accountId: MBANK, amount: -zl(200), categoryId: FOOD, counterparty: 'Sklep' },
    { date: `${last}-17`, accountId: MBANK, amount: -zl(200), categoryId: FOOD, counterparty: 'Sklep' },
    { date: `${last}-12`, accountId: MBANK, amount: -zl(400), categoryId: AUTO, counterparty: 'Serwis' },
    { date: `${last}-05`, accountId: MBANK, amount: -zl(50), counterparty: 'Kiosk' }
  ]
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(2500) } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: start.slice(0, 7), salary: zl(3000), envelopes: { [FOOD]: zl(1200), [AUTO]: zl(400) } }],
      transactions
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+0')
    await page.getByRole('radio', { name: 'Debriefing' }).click()
    await expect(page.getByTestId('reports-debrief-month')).toHaveValue(last)
    await expect(page.getByTestId('reports-debrief-month-note')).toHaveAttribute('data-state', 'last-closed')
    await expect(page.getByTestId('reports-debrief-month-note')).toHaveText('ostatni zamknięty miesiąc')
    const sankey = page.getByTestId('reports-sankey')
    await expect(sankey).toHaveAttribute('data-view', 'money')
    await expect(sankey.getByTestId('reports-sankey-title')).toHaveText(`Skąd i dokąd – ${monthLabel(last)}`)
    const label = (id: string) => sankey.locator(`[data-testid="reports-sankey-label"][data-id="${id}"]`)
    // The income, the costs by envelope's category, what the month added to the ship: 5 000 − 1 050 = 3 950 zł.
    await expect(label('work')).toHaveText('Przychody z pracy · 5 000,00 zł')
    await expect(label('month')).toHaveText('Miesiąc · 5 000,00 zł')
    await expect(label(`cat:${FOOD}`)).toHaveText('Jedzenie · 600,00 zł')
    await expect(label(`cat:${AUTO}`)).toHaveText('Auto · 400,00 zł')
    await expect(label('cat:none')).toHaveText('Bez kategorii · 50,00 zł')
    await expect(label('ship')).toHaveText('Dołożone do okrętu · 3 950,00 zł')
    await expect(sankey.getByTestId('reports-sankey-heading')).toHaveText(['Koperty codzienne · 650,00 zł', 'Koperty planowe · 400,00 zł'])
    // The tooltip: the amount and its percent of the chart, plus the work node's transaction details.
    await sankey.locator('[data-testid="reports-sankey-node"][data-id="work"]').hover()
    await expect(sankey.getByTestId('reports-sankey-tip')).toContainText('Przychody z pracy')
    await expect(sankey.getByTestId('reports-sankey-tip')).toContainText('Firma · 5 000,00 zł')
    await sankey.locator('[data-testid="reports-sankey-link"][data-from="month"][data-to="ship"]').hover()
    await expect(sankey.getByTestId('reports-sankey-tip')).toContainText('Miesiąc → Dołożone do okrętu')
    await expect(sankey.getByTestId('reports-sankey-tip')).toContainText('3 950,00 zł · 79,0% wszystkich przepływów na wykresie')

    // Ctrl+$: the amounts hidden, the bars as they were.
    const bar = sankey.locator('[data-testid="reports-sankey-node"][data-id="ship"]')
    const height = await bar.getAttribute('height')
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(label('ship')).toHaveText('Dołożone do okrętu · ••• zł')
    expect(await bar.getAttribute('height')).toBe(height)
    await sankey.locator('[data-testid="reports-sankey-node"][data-id="work"]').hover()
    await expect(sankey.getByTestId('reports-sankey-tip')).toContainText('Firma · ••• zł')
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(label('ship')).toHaveText('Dołożone do okrętu · 3 950,00 zł')

    // The salary through the energy: 3 000 − 1 050 spent = 1 950 zł left (the loot).
    await sankey.getByRole('radio', { name: 'Pensja i energia' }).click()
    await expect(sankey).toHaveAttribute('data-view', 'energy')
    await expect(label('salary')).toHaveText('Pensja od siebie · 3 000,00 zł')
    // A long name is cut to the chart's width (Windows CI's 1024×768 screen cuts this one) – its amount never (T491, D73).
    // A pattern is not whitespace-normalised like a string: the amount's thousands are apart by a no-break space.
    await expect(label('used')).toHaveText(/^Wydane\s\(z\senergii(?:\si\sponad\snią\)|.*…)\s·\s1\s050,00\szł$/)
    await expect(label('left')).toHaveText('Zostało – łupy · 1 950,00 zł')

    // The PDF draws it too (the debriefing's file).
    const pdf = join(out, 'debriefing.pdf')
    await app.evaluate(({ dialog }, p) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: p })
    }, pdf)
    await page.getByTestId('reports-debrief-pdf').click()
    await expect.poll(async () => (await readFile(pdf).catch(() => Buffer.alloc(0))).subarray(0, 4).toString()).toBe('%PDF')

    // The month in progress: up to today, via quick button „bieżący”.
    await sankey.getByRole('radio', { name: 'Przychód i koszty' }).click()
    await page.getByTestId('reports-debrief-current').click()
    await expect(page.getByTestId('reports-debrief-month')).toHaveValue(month)
    await expect(page.getByTestId('reports-debrief-month-note')).toHaveAttribute('data-state', 'current')
    await expect(page.getByTestId('reports-debrief-month-note')).toHaveText('miesiąc bieżący (w toku – do dziś)')
    await expect(sankey.getByTestId('reports-sankey-title')).toHaveText(`Skąd i dokąd – ${monthLabel(month)}`)
    await expect(sankey.locator('[data-testid="reports-sankey-label"][data-id="month"], [data-testid="reports-sankey-empty"]')).toBeVisible()

    // Plan miesiąca also shows the analyzed month in the Sankey header, and Debriefing remembers the selected month in the session.
    await page.keyboard.press('Control+4')
    await page.getByTestId('month-prev').click()
    const monthSankey = page.getByTestId('month-plan-sankey').getByTestId('reports-sankey')
    await expect(monthSankey.getByTestId('reports-sankey-title')).toHaveText(`Skąd i dokąd – ${monthLabel(last)}`)
    await page.keyboard.press('Control+0')
    await expect(page.getByTestId('reports-debrief-month')).toHaveValue(month)
    await page.getByTestId('reports-debrief-last-closed').click()
    await expect(page.getByTestId('reports-debrief-month')).toHaveValue(last)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
