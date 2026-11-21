import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'

// Grupa 1.21.0 (D106, UX-14, 15, 16, 71, 73, 77): the list's keys, the editor hidden without a choice, the way out of an
// empty list, the „bez kategorii” queue, Ctrl+Enter in the editor, the period „od – do” as typed dates.
function seed(categorized: boolean) {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ops-keys-')), 'FinancialIntel')
  const names = ['Sklep Alfa', 'Sklep Beta', 'Sklep Gamma']
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }),
    records: {
      balances: [{ date: `${month}-01`, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      transactions: names.map((counterparty, i) => ({ date: today, accountId: MBANK, amount: -zl(10 * (i + 1)), counterparty, ...(categorized ? { categoryId: GROCERIES } : {}) }))
    }
  })
  return { dataDir }
}

const rows = (page: Page) => page.getByTestId('operation-row')

async function openList(page: Page, count: number): Promise<void> {
  await expect(page.getByTestId('page-bridge')).toBeVisible()
  await page.keyboard.press('Control+2')
  await expect(page.getByTestId('page-operations')).toBeVisible()
  await expect(rows(page)).toHaveCount(count)
}

test('klawiatura listy: fokus na wierszu, strzałki, Enter do kwoty, Ctrl+Enter nowy szkic, Delete z „Cofnij”, Shift+F10', async () => {
  const { dataDir } = seed(true)
  const { app, page, errors } = await launch({ dataDir })
  try {
    await openList(page, 3)
    // UX-77: nothing chosen – no editor, the list takes the width.
    await expect(page.getByTestId('operation-editor')).toHaveCount(0)
    await expect(page.locator('[data-panel="operations:Szczegóły"]')).toBeHidden()
    // UX-71: one Tab stop on the list (the first row), the ticks are out of the Tab order.
    await expect(rows(page).nth(0)).toHaveAttribute('tabindex', '0')
    await expect(rows(page).nth(1)).toHaveAttribute('tabindex', '-1')
    await expect(page.getByTestId('operation-tick').first()).toHaveAttribute('tabindex', '-1')
    await rows(page).nth(0).focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByTestId('operation-editor')).toBeVisible()
    await expect(rows(page).nth(0)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(rows(page).nth(1)).toBeFocused()
    await expect(rows(page).nth(1)).toHaveAttribute('tabindex', '0')
    await expect(rows(page).nth(0)).toHaveAttribute('tabindex', '-1')
    // Enter: the editor's amount.
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('operation-amount')).toBeFocused()
    // UX-73: Ctrl+Enter – a new entry.
    await page.keyboard.press('Control+Enter')
    await expect(page.getByTestId('operation-editor-title')).toHaveText('Nowa operacja')
    await expect(rows(page)).toHaveCount(4)
    await expect(page.getByTestId('operation-amount')).toBeFocused()
    // An untouched new entry is dropped with the next choice.
    await rows(page).nth(1).click()
    await expect(rows(page)).toHaveCount(3)

    // Delete: the menu's delete (its preview), then „Cofnij”.
    await rows(page).nth(2).focus()
    await page.keyboard.press('Delete')
    await page.getByTestId('operations-bulk-confirm').click()
    await expect(rows(page)).toHaveCount(2)
    await page.getByRole('button', { name: 'Cofnij', exact: true }).last().click()
    await expect(rows(page)).toHaveCount(3)

    // Shift+F10: the menu under the right button.
    await rows(page).nth(0).focus()
    await page.keyboard.press('Shift+F10')
    await expect(page.getByTestId('operations-menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operations-menu')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('pusty wynik: poprzedni miesiąc, cała historia, wyczyść filtry; okres „od – do” jako wpisane daty', async () => {
  const { dataDir } = seed(true)
  const { app, page, errors } = await launch({ dataDir })
  try {
    await openList(page, 3)
    // UX-14: a search that finds nothing – a way out beside the message.
    await page.getByTestId('operations-search').fill('zzzz')
    await expect(page.getByTestId('operations-empty')).toBeVisible()
    await page.getByTestId('operations-empty-clear').click()
    await expect(rows(page)).toHaveCount(3)
    // An empty month: „Poprzedni miesiąc” goes one more back, „Cała historia” shows everything.
    await page.getByTestId('operations-prev-month').click()
    await expect(rows(page)).toHaveCount(0)
    const label = await page.getByTestId('operations-period').innerText()
    await page.getByTestId('operations-empty-prev').click()
    await expect(page.getByTestId('operations-period')).not.toHaveText(label)
    await page.getByTestId('operations-empty-all').click()
    await expect(page.getByTestId('operations-period')).toHaveText('cała historia')
    await expect(rows(page)).toHaveCount(3)

    // UX-16: the range typed as dd.mm.rrrr, not the browser's date input.
    await page.getByTestId('operations-period-menu').click()
    const from = page.getByTestId('operations-period-from')
    await expect(from).toHaveAttribute('placeholder', 'dd.mm.rrrr')
    await from.click()
    await from.fill('01.01.2020')
    await from.press('Enter')
    await expect(page.getByTestId('operations-period')).toHaveText('01.01.2020 – …')
    await expect(rows(page)).toHaveCount(3)
    await from.fill('')
    await from.press('Enter')
    await expect(page.getByTestId('operations-period')).toHaveText('… – …')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('„bez kategorii”: po nadaniu kategorii wybór idzie na następny wiersz, „zostało N”; na końcu edytor się chowa', async () => {
  const { dataDir } = seed(false)
  const { app, page, errors } = await launch({ dataDir })
  try {
    await openList(page, 3)
    await page.getByTestId('operations-categories').click()
    await page.getByTestId('operations-categories-none').click()
    await page.keyboard.press('Escape')
    await expect(rows(page)).toHaveCount(3)
    const name = async (i: number) => (await rows(page).nth(i).getByText(/^Sklep /).innerText()).trim()
    const names = [await name(0), await name(1), await name(2)]
    await rows(page).nth(0).click()
    await expect(page.getByTestId('operation-counterparty')).toHaveValue(names[0]!)
    await page.getByTestId('operation-category').selectOption({ value: GROCERIES })
    await expect(rows(page)).toHaveCount(2)
    await expect(page.getByTestId('operation-counterparty')).toHaveValue(names[1]!)
    await expect(page.getByRole('status').filter({ hasText: 'Zostało do skategoryzowania: 2' })).toBeVisible()
    await page.getByTestId('operation-category').selectOption({ value: GROCERIES })
    await expect(rows(page)).toHaveCount(1)
    await expect(page.getByTestId('operation-counterparty')).toHaveValue(names[2]!)
    await page.getByTestId('operation-category').selectOption({ value: GROCERIES })
    await expect(rows(page)).toHaveCount(0)
    await expect(page.getByTestId('operation-editor')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
