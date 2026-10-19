import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { formatPln, plural } from '../../src/shared/format'
import { GLOSSARY } from '../../src/shared/glossary'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const cat = (n: number, sub = 0) => `01KDEFCAT${String(n * 100 + sub).padStart(17, '0')}`
const FOOD = cat(1)
const GROCERIES = cat(1, 1)
const COFFEE = cat(1, 3)
const FUEL = cat(3, 1)
const TRAVEL = cat(6, 3)
const HOME_CHEM = cat(2, 4)
const NET = cat(7, 2)
const GOAL = '01KVTR1PGA0000000000000001'
const LOAN = '01KVKR3D1T0000000000000001'
const RULE = '01KVNET1A00000000000000001'

const zlText = (g: number) => `${formatPln(g)} zł`
/** „31 400,00 zł” → grosze. */
const grosze = (text: string) => Math.round(Number(text.replace(/zł/, '').replace(/[\s ]/g, '').replace('−', '-').replace(',', '.')) * 100)

const buy = (date: string, counterparty: string, amount: number, categoryId: string | null, more: Record<string, unknown> = {}) => ({
  date,
  accountId: MBANK,
  kind: 'expense',
  amount: -zl(amount),
  categoryId,
  counterparty,
  ...more
})

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

test('tagi i wyprawy (1.10.0, F17): karta wyprawy z celem, „Pokaż w Operacjach”, tag w edytorze, ostatni tag i #słowo w szybkim wpisie, tagi reguły importu', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-intel-v-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      import: {
        ...s.import,
        rules: [{ id: RULE, match: 'netia', mode: 'exact', direction: 'out', label: 'Netia', kind: 'expense', categoryId: NET, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 2, updatedAt: '2026-01-01T00:00:00.000Z' }]
      }
    }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(10000) }],
      months: [{ month: addMonths(month, -2), salary: zl(4000), envelopes: {} }],
      goals: [{ id: GOAL, name: 'Wakacje', target: zl(2000), priority: 1 }],
      transactions: [
        buy(addDays(today, -3), 'ORLEN', 300, FUEL, { tags: ['Chorwacja'] }),
        buy(addDays(today, -2), 'BOOKING.COM', 500, TRAVEL, { tags: ['Chorwacja'] }),
        // A receipt: its groceries' line on the trip, the cleaning products not.
        buy(addDays(today, -2), 'LIDL', 120, null, {
          splits: [
            { id: '01KVSP11T00000000000000001', amount: -zl(80), categoryId: GROCERIES, refundable: false, memberId: null, advance: false, note: '', tags: ['Chorwacja'] },
            { id: '01KVSP11T00000000000000002', amount: -zl(40), categoryId: HOME_CHEM, refundable: false, memberId: null, advance: false, note: '' }
          ]
        }),
        buy(addDays(today, -1), 'ŻABKA', 20, GROCERIES)
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+9')
    await expect(page.getByTestId('page-intel')).toBeVisible()
    // The expedition: its money across categories – the receipt's own line only.
    const trip = page.locator('[data-testid="intel-expedition"][data-tag="Chorwacja"]')
    await expect(trip.getByTestId('intel-expedition-spent')).toHaveText(zlText(zl(880)))
    await expect(trip).toContainText('3 operacje')
    await trip.getByTestId('intel-expedition-open').click()
    const byCategory = trip.getByTestId('intel-expedition-categories')
    await expect(byCategory).toContainText('Rozrywka i hobby')
    await expect(byCategory).toContainText('Auto')
    await expect(byCategory).toContainText(zlText(zl(80)))
    // Its goal of the star map: „wydano … z … celu”, kept in fi.json by the tag's key.
    await trip.getByTestId('intel-expedition-goal-select').selectOption(GOAL)
    await expect(trip.getByTestId('intel-expedition-goal')).toContainText(`Ekspedycja „Wakacje”: wydano ${zlText(zl(880))} z ${zlText(zl(2000))} celu`)
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.intel.tagGoals).toEqual({ chorwacja: GOAL })

    // „Pokaż w Operacjach”: the tag's operations of the whole history, each row with its tags.
    await trip.getByTestId('intel-expedition-operations').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operations-period')).toHaveText('cała historia')
    await expect(page.getByTestId('operations-more')).toContainText('Więcej filtrów: 1')
    await expect(page.getByTestId('operations-outflow')).toHaveText(zlText(-zl(920)))
    await expect(page.getByTestId('operation-row').first().getByTestId('operation-row-tags')).toHaveText('#Chorwacja')

    // The editor: a tag typed („#” or none), Enter adds it.
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('ŻABKA')
    await expect(page.getByTestId('palette-operation').first()).toContainText('ŻABKA')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('operation-counterparty')).toHaveValue('ŻABKA')
    await page.getByTestId('operation-tags-input').fill('#Chorwacja')
    await page.getByTestId('operation-tags-input').press('Enter')
    await expect(page.getByTestId('operation-tags-chip')).toContainText('#Chorwacja')
    await expect.poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'ŻABKA').map((t) => t.tags)).toEqual([['Chorwacja']])

    // The quick entry: the tag of the last days in one click, a „#słowo” in the name – the name without it.
    const quick = await quickWindow(app, page)
    await expect(quick.getByTestId('quick-tag-last')).toHaveText('+ #Chorwacja')
    await quick.getByTestId('quick-tag-last').click()
    await expect(quick.getByTestId('quick-tags-chip')).toContainText('#Chorwacja')
    await expect(quick.getByTestId('quick-tag-last')).toHaveCount(0)
    await quick.getByTestId('quick-amount').fill('45')
    await quick.getByTestId('quick-counterparty').fill('KAWIARNIA PORT #morze')
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-save').click()
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => String(t.counterparty).startsWith('KAWIARNIA')).map((t) => [t.counterparty, t.tags]))
      .toEqual([['KAWIARNIA PORT', ['Chorwacja', 'morze']]])

    // The import's rule: its tags („Netia → #ulga-internet”) – the operations it makes carry them.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    const netia = page.locator('[data-testid="import-rule"][data-match="netia"]')
    await netia.getByTestId('import-rule-edit').click()
    await netia.getByTestId('import-rule-tags-input').fill('ulga-internet')
    await netia.getByTestId('import-rule-tags-input').press('Enter')
    await netia.getByTestId('import-rule-save').click()
    await expect(netia.getByTestId('import-rule-tag-list')).toHaveText('#ulga-internet')
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.import.rules.find((r: { id: string }) => r.id === RULE)?.tags).toEqual(['ulga-internet'])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Wywiad do szczegółu (1.10.0, F20, F24, F25): podkategorie i komórka → Operacje, namierzone cele, porównanie, bilans paliwa, siła floty netto, rok kontrahenta', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -13)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-intel-v-')), 'FinancialIntel')
  const transactions: Array<Record<string, unknown>> = [
    // A loan taken at the start: the accounts' money grows, the net worth does not.
    { date: addDays(start, 1), accountId: MBANK, kind: 'loan', amount: zl(5000), loanId: LOAN, counterparty: 'BRAT', categoryId: null }
  ]
  for (let m = 13; m >= 1; m--) {
    const mon = addMonths(month, -m)
    transactions.push({ date: `${mon}-10`, accountId: MBANK, kind: 'income', amount: zl(6000), counterparty: 'PRACODAWCA', categoryId: null })
    transactions.push(buy(`${mon}-05`, 'BIEDRONKA', 400, GROCERIES), buy(`${mon}-20`, 'BIEDRONKA', 200, GROCERIES), buy(`${mon}-12`, 'COSTA COFFEE', 100, COFFEE))
  }
  // Last month: groceries over their averages; a purchase on the food itself (no subcategory).
  const last = addMonths(month, -1)
  transactions.push(buy(`${last}-25`, 'BIEDRONKA', 500, GROCERIES), buy(`${last}-26`, 'ZABKA', 50, FOOD))
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -13), salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }],
      loans: [{ id: LOAN, name: 'Pożyczka od brata', direction: 'taken', counterparty: 'BRAT', amount: zl(5000), date: addDays(start, 1), accountId: MBANK }],
      transactions
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+9')
    await expect(page.getByTestId('page-intel')).toBeVisible()

    // F25: the fuel balance – last month 6 000 − 1 250 (79,2%), the median of the 6 months before now 88,3%.
    const balance = page.locator(`[data-testid="intel-fuel-row"][data-month="${last}"]`).getByTestId('intel-fuel-balance')
    await expect(page.locator(`[data-testid="intel-fuel-row"][data-month="${last}"]`).getByTestId('intel-fuel-rate')).toHaveText('79,2%')
    await expect(balance).toHaveText(`+${formatPln(zl(4750))}`)
    await expect(balance).toHaveClass(/text-up/)
    await expect(page.getByTestId('intel-fuel-median6')).toHaveText('88,3%')
    // The amounts hidden (Ctrl+$): the balance masked and neutral – no green or red (B61).
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(balance).toHaveText('•••')
    await expect(balance).not.toHaveClass(/text-up/)
    await page.keyboard.press('Control+Shift+Digit4')
    await expect(balance).toHaveClass(/text-up/)

    // F24: the net worth beside the accounts – the loan taken lifts only the accounts.
    const accounts = grosze(await page.getByTestId('intel-wealth-accounts').innerText())
    await expect.poll(async () => grosze(await page.getByTestId('intel-wealth-net').innerText())).toBe(accounts - zl(5000))
    await page.getByRole('radio', { name: 'siła floty netto' }).click()
    await expect.poll(async () => Number(await page.getByTestId('intel-wealth-chart').getAttribute('data-second'))).toBeGreaterThan(10)

    // F20: the categories open their subcategories; a cell – its operations.
    const food = page.locator('[data-testid="intel-spend-row"][data-label="Jedzenie"]')
    await food.getByTestId('intel-spend-toggle').click()
    const groceries = page.locator('[data-testid="intel-spend-sub"][data-label="zakupy spożywcze"]')
    await expect(groceries).toBeVisible()
    await expect(page.locator('[data-testid="intel-spend-sub"][data-label="kawa i przekąski"]')).toBeVisible()
    // The food's own line: its amounts plain – Operacje would show the whole food with its subcategories.
    const own = page.locator('[data-testid="intel-spend-sub"][data-label="bez podkategorii"]')
    await expect(own.getByTestId('intel-spend-value').last()).toHaveText(formatPln(zl(50)))
    await expect(own.getByTestId('intel-spend-cell')).toHaveCount(0)
    await groceries.getByTestId('intel-spend-cell').last().click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operations-outflow')).toHaveText(zlText(-zl(1100)))

    // „Namierzone cele”: the brands of the period, the most money first; a click – the brand's whole history.
    await page.keyboard.press('Control+9')
    const target = page.getByTestId('intel-target').first()
    await expect(target).toHaveAttribute('data-name', 'BIEDRONKA')
    await expect(target.getByTestId('intel-target-total')).toHaveText(formatPln(zl(5 * 600 + 500)))
    await target.click()
    await expect(page.getByTestId('operations-outflow')).toHaveText(zlText(-zl(13 * 600 + 500)))

    // A month against its averages: the food over them – the accent only there.
    await page.keyboard.press('Control+9')
    await expect(page.getByTestId('intel-comparison-month')).toHaveValue(last)
    await expect(page.locator(`[data-testid="intel-comparison-row"][data-id="${FOOD}"]`)).toHaveAttribute('data-over', 'true')

    // The counterparty's year in the editor („Rozpoznanie celu”).
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('BIEDRONKA')
    // The operations are searched after the typing settles: Enter only once they are listed.
    await expect(page.getByTestId('palette-operation').first()).toContainText('BIEDRONKA')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('operation-counterparty')).toHaveValue('BIEDRONKA')
    // The year of the purchase the palette opened (its newest – last month's, as a rule).
    const year = /(\d{4})$/.exec(await page.getByTestId('operation-date').inputValue())![1]!
    const ofYear = transactions.filter((t) => t.counterparty === 'BIEDRONKA' && String(t.date).startsWith(year))
    const total = -ofYear.reduce((s, t) => s + Number(t.amount), 0)
    await expect(page.getByTestId('operation-brand-year')).toHaveText(
      `Rozpoznanie celu: u tego kontrahenta w ${year} – ${ofYear.length} ${plural(ofYear.length, 'zakup', 'zakupy', 'zakupów')}, ${zlText(total)}, średnio ${zlText(Math.round(total / ofYear.length))}`
    )

    // The debriefing of last month: its fuel balance and savings rate.
    await page.keyboard.press('Control+4')
    await page.getByTestId('month-prev').click()
    await expect(page.getByTestId('debrief-fuel')).toContainText('stopa oszczędności 79,2% (mediana 6 mies.: 88,3%)')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('„Skąd ta liczba?” i słowniczek (1.10.0, F29), osobista inflacja z CPI wpisanym ręcznie (F36)', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -14)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-intel-v-')), 'FinancialIntel')
  const transactions: Array<Record<string, unknown>> = []
  for (let m = 14; m >= 1; m--) {
    const mon = addMonths(month, -m)
    // The same shop, its receipt 50 zł a year ago and 55 zł now: +10%.
    const price = m <= 2 ? 55 : 50
    transactions.push({ date: `${mon}-10`, accountId: MBANK, kind: 'income', amount: zl(5000), counterparty: 'PRACODAWCA', categoryId: null })
    transactions.push(buy(`${mon}-05`, 'BIEDRONKA', price, GROCERIES), buy(`${mon}-18`, 'BIEDRONKA', price, GROCERIES))
  }
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(15000) }],
      months: [{ month: addMonths(month, -14), salary: zl(3000), envelopes: { [FOOD]: zl(900) } }],
      transactions
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // Today's energy taken apart: the last line is the number on the bridge.
    const energy = await page.getByTestId('bridge-energy').innerText()
    await page.getByTestId('bridge-energy-why').click()
    const lines = page.getByTestId('bridge-energy-lines').getByTestId('why-line')
    await expect(lines.last()).toContainText('Energia dziś')
    await expect(lines.last()).toContainText(energy)
    await expect(page.getByTestId('bridge-energy-lines')).toContainText('Koperty codzienne w tym miesiącu (plan i łupy)')
    // The range and the layers' targets.
    await page.getByTestId('state-range-why').click()
    await expect(page.getByTestId('state-range-lines')).toContainText('Paliwo (bez dopływu wypłat)')
    await expect(page.getByTestId('state-range-lines').getByTestId('why-line').last()).toContainText('Zasięg')
    await page.getByTestId('state-targets-why').click()
    await expect(page.getByTestId('state-range-lines')).toHaveCount(0)
    await expect(page.getByTestId('state-targets-lines')).toContainText('Cel osłon: 3 × pensja')
    // No payout docked yet: no delivery to take apart.
    await expect(page.getByTestId('state-delivery-why')).toHaveCount(0)
    // The glossary: in the panels' headers and under F1.
    await expect(page.getByTestId('bridge-envelopes').getByTestId('panel-hint')).toHaveAttribute('title', /^Koperty – Limity wydatków/)
    await page.keyboard.press('F1')
    await expect(page.getByTestId('glossary-term')).toHaveCount(GLOSSARY.length)
    await expect(page.getByTestId('shortcuts-glossary')).toContainText('Kadłub – Fundusz awaryjny')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('shortcuts')).toHaveCount(0)

    // The personal inflation: the same shop's receipt +10% year on year; the CPI of GUS typed by hand.
    await page.keyboard.press('Control+9')
    await expect(page.getByTestId('intel-inflation-personal')).toHaveText('+10%')
    await expect(page.locator('[data-testid="intel-inflation-brand"][data-name="BIEDRONKA"]')).toContainText('+10%')
    await expect(page.getByTestId('intel-inflation-cpi')).toHaveText('nie wpisano')
    await expect(page.getByTestId('intel-cpi-month')).toHaveValue(addMonths(month, -1))
    await page.getByTestId('intel-cpi-value').fill('4,9')
    await page.getByTestId('intel-cpi-value').press('Enter')
    await expect(page.getByTestId('intel-inflation-cpi')).toHaveText('+4,9%')
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.intel.cpi).toEqual({ [addMonths(month, -1)]: 4.9 })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
