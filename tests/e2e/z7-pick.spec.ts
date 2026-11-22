import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, warsawNow } from '../../src/shared/calc/dates'
import { launch, quickWindow } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'
const FUEL = '01KDEFCAT00000000000000301'

// Grupa 1.21.0 (D106 pkt 9, UX-36, 37, 70, 72): the category field with a search and „Ostatnie”, the counterparty's
// suggestions from the history, „Podziel…” as one menu – in the editor and in the quick entry.
function seed() {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-z7-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }),
    records: {
      balances: [{ date: `${month}-01`, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      transactions: [
        { date: addDays(today, -3), accountId: MBANK, amount: -zl(20), counterparty: 'Biedronka', categoryId: GROCERIES },
        { date: addDays(today, -2), accountId: MBANK, amount: -zl(30), counterparty: 'Biedronka', categoryId: GROCERIES },
        { date: addDays(today, -1), accountId: MBANK, amount: -zl(200), counterparty: 'Orlen', categoryId: FUEL }
      ]
    }
  })
  return dataDir
}

test('edytor: kategoria z szukaniem i „Ostatnie”, kontrahent z historii, „Podziel…”', async () => {
  const { app, page, errors } = await launch({ dataDir: seed() })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.keyboard.press('Control+n')
    const counterparty = page.getByTestId('operation-counterparty')
    const category = page.getByTestId('operation-category')
    await expect(category).toHaveAttribute('role', 'combobox')
    await expect(category).toHaveAttribute('data-value', '')

    // UX-72: a fragment – the most used names that hold it, a pick with arrows and Enter; the category of the name
    // comes along into the empty field.
    await counterparty.fill('bied')
    const names = page.getByTestId('operation-counterparty-option')
    await expect(page.getByTestId('operation-counterparty-list')).toHaveAttribute('role', 'listbox')
    await expect(names).toHaveText(['Biedronka'])
    await counterparty.press('ArrowDown')
    await counterparty.press('Enter')
    await expect(page.getByTestId('operation-counterparty-list')).toHaveCount(0)
    await expect(counterparty).toHaveValue('Biedronka')
    await expect(category).toHaveAttribute('data-value', GROCERIES)

    // A category already there stays when another name is picked.
    await counterparty.fill('orl')
    await counterparty.press('ArrowDown')
    await counterparty.press('Enter')
    await expect(counterparty).toHaveValue('Orlen')
    await expect(category).toHaveAttribute('data-value', GROCERIES)

    // UX-70: „Ostatnie” – the categories of the newest operations, the newest first; the search ignores Polish marks.
    await category.click()
    const options = page.getByTestId('operation-category-option')
    await expect(page.getByTestId('operation-category-list')).toHaveAttribute('role', 'listbox')
    await expect(options.first()).toHaveAttribute('data-id', '')
    const recent = page.locator('[data-testid="operation-category-option"][data-section="recent"]')
    await expect(recent).toHaveCount(2)
    // (The entry being edited counts too: it is today's, with the category it just got – its category is the first.)
    await expect(recent.nth(0)).toHaveAttribute('data-id', GROCERIES)
    await expect(recent.nth(1)).toHaveAttribute('data-id', FUEL)
    // Esc closes the list and only it.
    await category.press('Escape')
    await expect(page.getByTestId('operation-category-list')).toHaveCount(0)
    await expect(page.getByTestId('operation-editor')).toBeVisible()

    await category.fill('na miescie')
    await expect(options).toHaveText(['Jedzenie · na mieście'])
    await category.fill('PALIW')
    await expect(options).toHaveText(['Auto · paliwo'])
    // Enter takes the highlighted one – and saves nothing else, the list closes.
    await category.press('Enter')
    await expect(page.getByTestId('operation-category-list')).toHaveCount(0)
    await expect(category).toHaveAttribute('data-value', FUEL)
    await expect(category).toHaveValue('Auto · paliwo')
    // Leaving the field with something typed takes nothing.
    await category.fill('jedz')
    await page.getByTestId('operation-amount').click()
    await expect(category).toHaveAttribute('data-value', FUEL)
    await expect(category).toHaveValue('Auto · paliwo')
    // „bez kategorii” is the list's first choice.
    await category.click()
    await options.first().click()
    await expect(category).toHaveAttribute('data-value', '')

    // UX-37: one „Podziel…” – the menu with the two ways: into categories and between people.
    await page.getByTestId('operation-split-menu').click()
    await expect(page.getByTestId('operation-split')).toBeVisible()
    await expect(page.getByTestId('operation-share-start')).toBeVisible()
    // The first item has the focus, the arrow moves it; Esc closes the menu only.
    await expect(page.getByTestId('operation-split')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByTestId('operation-share-start')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operation-split')).toHaveCount(0)
    await expect(page.getByTestId('operation-editor')).toBeVisible()
    await page.getByTestId('operation-split-menu').click()
    await page.getByTestId('operation-split').click()
    await expect(page.getByTestId('split-line')).toHaveCount(2)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('szybki wpis: Enter na liście wybiera i niczego nie zapisuje; kontrahent z historii podstawia kategorię', async () => {
  const dataDir = seed()
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    const before = (await records(dir, 'transactions')).length
    const quick = await quickWindow(app, page)
    const counterparty = quick.getByTestId('quick-counterparty')
    const category = quick.getByTestId('quick-category')
    await expect(category).toHaveAttribute('role', 'combobox')
    await quick.getByTestId('quick-amount').fill('12')
    await quick.getByTestId('quick-amount').press('Tab')
    await counterparty.fill('bied')
    await expect(quick.getByTestId('quick-counterparty-option')).toHaveText(['Biedronka'])
    await counterparty.press('ArrowDown')
    await counterparty.press('Enter')
    await expect(counterparty).toHaveValue('Biedronka')
    await expect(category).toHaveAttribute('data-value', GROCERIES)
    // The category list's Enter: the choice, no save.
    await category.click()
    await category.fill('paliw')
    await category.press('Enter')
    await expect(category).toHaveAttribute('data-value', FUEL)
    await expect(quick.getByTestId('quick-entry')).toBeVisible()
    await expect(quick.getByTestId('quick-message')).toHaveCount(0)
    // Esc with the list open closes the list, the window stays.
    await category.click()
    await expect(quick.getByTestId('quick-category-list')).toBeVisible()
    await category.press('Escape')
    await expect(quick.getByTestId('quick-category-list')).toHaveCount(0)
    await expect(quick.getByTestId('quick-entry')).toBeVisible()
    expect((await records(dir, 'transactions')).length).toBe(before)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
