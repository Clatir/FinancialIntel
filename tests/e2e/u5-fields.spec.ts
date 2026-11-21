import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { openForm } from './forms'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'
const FOOD = '01KDEFCAT00000000000000100'
const FUEL = '01KDEFCAT00000000000000301'
const MEDS = '01KDEFCAT00000000000000501'

// U5: the category search in the right-click menu of Operacje, the same tree and wording as the editor's field.
test('menu pod prawym przyciskiem: szukanie kategorii – pole na górze, filtr, Enter bierze pierwszą', async () => {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-u5-menu-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }),
    records: {
      balances: [{ date: `${month}-01`, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      transactions: [{ date: addDays(today, -1), accountId: MBANK, amount: -zl(10), categoryId: GROCERIES, counterparty: 'Sklep Alfa' }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operation-row').filter({ hasText: 'Sklep Alfa' }).click({ button: 'right' })
    await page.getByTestId('operations-menu-category').click()
    // The list opens on its search field; the whole tree is there until something is typed.
    const search = page.getByTestId('operations-menu-category-search')
    await expect(search).toBeFocused()
    await expect(page.getByTestId(`operations-menu-category-${GROCERIES}`)).toBeVisible()
    await search.fill('PALIW')
    await expect(page.getByTestId(`operations-menu-category-${FUEL}`)).toHaveText('Auto · paliwo')
    await expect(page.getByTestId(`operations-menu-category-${GROCERIES}`)).toHaveCount(0)
    // The mouse resting over the first item while the list changes under it: the item that comes under it does not take
    // the focus from the field – typing goes on (a mouseover without a move).
    await search.fill('')
    await page.getByTestId(`operations-menu-category-${FOOD}`).hover()
    await search.focus()
    await search.fill('PALIW')
    await expect(page.getByTestId(`operations-menu-category-${FUEL}`)).toBeVisible()
    // What the browser sends when the layout moves an item under a resting pointer: a mouseover, no mousemove.
    await page.getByTestId(`operations-menu-category-${FUEL}`).dispatchEvent('mouseover')
    await page.waitForTimeout(250)
    await expect(search).toBeFocused()
    await page.keyboard.type('o')
    await expect(search).toHaveValue('PALIWo')
    await search.fill('zzz')
    await expect(page.getByTestId('operations-menu-category-none')).toBeVisible()
    await expect(page.getByTestId(`operations-menu-category-${FUEL}`)).toHaveCount(0)
    await search.fill('paliw')
    await search.press('Enter')
    await expect(page.getByTestId('operations-menu')).toHaveCount(0)
    await expect.poll(async () => (await records(dir, 'transactions'))[0]?.categoryId).toBe(FUEL)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

// U5: Esc in a month field the focus only came to is not the field's – the window hears it; a real edit is taken back by it.
test('pole miesiąca: Esc bez wpisu idzie dalej, Esc po wpisie cofa wpis', async () => {
  const { month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-u5-month-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }),
    records: { balances: [{ date: `${month}-01`, accountId: MBANK, kind: 'opening', amount: zl(20000) }] }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+6')
    await openForm(page, 'goal')
    const field = page.getByTestId('starmap-new-deadline')
    await page.evaluate("window.__escapes = 0; window.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.__escapes++ })")
    await field.click()
    await expect(field).toBeFocused()
    await field.press('Escape')
    await expect.poll(() => page.evaluate('window.__escapes')).toBe(1)
    // A typed month taken back: the field's own Esc, the window does not hear it.
    await field.click()
    await field.fill('2027-06')
    await field.press('Escape')
    await expect(field).toHaveValue('')
    expect(await page.evaluate('window.__escapes')).toBe(1)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

// U5: the mouse moved over a category while the search field has the focus – Enter applies the one pointed at, not the first.
test('menu pod prawym przyciskiem: najechana kategoria + Enter zapisuje najechaną, nie pierwszą z listy', async () => {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-u5-hover-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }),
    records: {
      balances: [{ date: `${month}-01`, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      transactions: [{ date: addDays(today, -1), accountId: MBANK, amount: -zl(10), categoryId: GROCERIES, counterparty: 'Sklep Alfa' }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operation-row').filter({ hasText: 'Sklep Alfa' }).click({ button: 'right' })
    await page.getByTestId('operations-menu-category').click()
    await expect(page.getByTestId('operations-menu-category-search')).toBeFocused()
    await page.getByTestId(`operations-menu-category-${MEDS}`).hover()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('operations-menu')).toHaveCount(0)
    await expect.poll(async () => (await records(dir, 'transactions'))[0]?.categoryId).toBe(MEDS)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
