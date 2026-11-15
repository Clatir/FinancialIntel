import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { addDays, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'
const CARGO = '01KCNT00000000000000000001'

// D105 (grupa 1.20.0): the selection with Ctrl / Shift / Ctrl+A / Esc and the menu under the right button – the same
// changes as the bar's, the same preview and „Cofnij”.
function seed() {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-bulk-menu-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }),
    records: {
      balances: [{ date: `${month}-01`, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      containers: [{ id: CARGO, name: 'Czynsz', amount: zl(100), cycleMonths: 1, dueMonth: month }],
      transactions: [
        { date: addDays(today, -1), accountId: MBANK, amount: -zl(10), categoryId: GROCERIES, counterparty: 'Sklep Alfa', tags: ['Remont'] },
        { date: addDays(today, -2), accountId: MBANK, amount: -zl(20), categoryId: GROCERIES, counterparty: 'Sklep Beta' },
        { date: addDays(today, -3), accountId: MBANK, amount: -zl(30), categoryId: GROCERIES, counterparty: 'Sklep Gamma' },
        { date: addDays(today, -4), accountId: MBANK, amount: -zl(40), categoryId: GROCERIES, counterparty: 'Sklep Delta' }
      ]
    }
  })
  return { dataDir, today }
}

const row = (page: Page, name: string) => page.getByTestId('operation-row').filter({ hasText: name })

async function openList(page: Page): Promise<void> {
  await expect(page.getByTestId('page-bridge')).toBeVisible()
  await page.keyboard.press('Control+2')
  await expect(page.getByTestId('page-operations')).toBeVisible()
  await page.getByTestId('operations-period-menu').click()
  await page.getByTestId('operations-period-all').click()
  await expect(page.getByTestId('operation-row')).toHaveCount(4)
}

test('zaznaczanie: Ctrl+klik, Shift+klik, Ctrl+A, Esc', async () => {
  const { dataDir } = seed()
  const { app, page, errors } = await launch({ dataDir })
  try {
    await openList(page)
    const ticked = page.locator('[data-testid="operation-row"][data-ticked="1"]')
    await row(page, 'Sklep Alfa').click({ modifiers: ['Control'] })
    await row(page, 'Sklep Gamma').click({ modifiers: ['Shift'] })
    await expect(ticked).toHaveCount(3)
    // Ctrl+click takes one off; a plain click moves only the cursor.
    await row(page, 'Sklep Beta').click({ modifiers: ['Control'] })
    await expect(ticked).toHaveCount(2)
    await expect(row(page, 'Sklep Beta')).not.toHaveAttribute('data-ticked', '1')
    await row(page, 'Sklep Delta').click()
    await expect(ticked).toHaveCount(2)
    await page.keyboard.press('Control+a')
    await expect(ticked).toHaveCount(4)
    await page.keyboard.press('Escape')
    await expect(ticked).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('menu pod prawym przyciskiem: tag (✓ / „—”), Esc, ładownia przez podgląd, „Cofnij”, zapis na dysku', async () => {
  const { dataDir } = seed()
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  const menu = page.getByTestId('operations-menu')
  const ticked = page.locator('[data-testid="operation-row"][data-ticked="1"]')
  const tagsOf = async () => Object.fromEntries((await records(dir, 'transactions')).map((t) => [t.counterparty as string, ((t.tags as string[] | undefined) ?? []).length]))
  try {
    await openList(page)
    // A row outside the ticked ones becomes the only one ticked.
    await row(page, 'Sklep Beta').click({ button: 'right' })
    await expect(menu).toBeVisible()
    await expect(page.getByTestId('operations-menu-header')).toHaveText('Zmień 1 operację')
    await expect(ticked).toHaveCount(1)
    // Esc closes only the menu: the ticks stay.
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(ticked).toHaveCount(1)

    await page.keyboard.press('Control+a')
    await row(page, 'Sklep Alfa').click({ button: 'right' })
    await expect(page.getByTestId('operations-menu-header')).toHaveText('Zmień 4 operacje')
    await page.getByTestId('operations-menu-tags').hover()
    // One of the four has the tag: „—”; a click puts it on all four – and the menu stays open.
    const tag = page.getByTestId('operations-menu-tags-remont')
    await expect(tag).toHaveAttribute('data-state', 'mixed')
    await expect(tag).toContainText('—')
    await tag.click()
    await expect(tag).toHaveAttribute('data-state', 'on')
    await expect(tag).toContainText('✓')
    await expect(menu).toBeVisible()
    await expect(ticked).toHaveCount(4)
    await expect.poll(tagsOf).toEqual({ 'Sklep Alfa': 1, 'Sklep Beta': 1, 'Sklep Gamma': 1, 'Sklep Delta': 1 })
    // On all of them it takes the tag off – no operation has it now, so the history's list of tags no longer knows it.
    await tag.click()
    await expect(tag).toHaveCount(0)
    await expect(menu).toBeVisible()
    await expect(ticked).toHaveCount(4)
    await expect.poll(tagsOf).toEqual({ 'Sklep Alfa': 0, 'Sklep Beta': 0, 'Sklep Gamma': 0, 'Sklep Delta': 0 })
    // „Cofnij” of the last change brings the tag back to all four.
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Cofnij', exact: true }).last().click()
    await expect.poll(tagsOf).toEqual({ 'Sklep Alfa': 1, 'Sklep Beta': 1, 'Sklep Gamma': 1, 'Sklep Delta': 1 })

    // The cargo goes through the preview.
    await row(page, 'Sklep Alfa').click({ button: 'right' })
    await page.getByTestId('operations-menu-container').hover()
    await page.getByTestId(`operations-menu-container-${CARGO}`).click()
    await expect(menu).toHaveCount(0)
    const dialog = page.getByTestId('operations-bulk-dialog')
    await expect(dialog).toContainText('Ładownia „Czynsz”')
    await expect(page.getByTestId('operations-bulk-effect')).toContainText('4 operacje')
    await page.getByTestId('operations-bulk-confirm').click()
    const cargoOf = async () => (await records(dir, 'transactions')).map((t) => (t.containerId as string | null | undefined) ?? null)
    await expect.poll(cargoOf).toEqual([CARGO, CARGO, CARGO, CARGO])
    await page.getByRole('button', { name: 'Cofnij', exact: true }).last().click()
    await expect.poll(cargoOf).toEqual([null, null, null, null])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('menu: data z kalendarza i konto przez wspólny podgląd; pasek zaznaczonych działa jak dotąd', async () => {
  const { dataDir, today } = seed()
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await openList(page)
    const target = addDays(today, -1)
    await row(page, 'Sklep Beta').click({ button: 'right' })
    await page.getByTestId('operations-menu-date').hover()
    await expect(page.getByTestId('operations-menu-date-calendar')).toBeVisible()
    // The calendar opens on the operation's month; „today” is marked.
    await page.getByTestId(`operations-menu-date-day-${target}`).click()
    await expect(page.getByTestId('operations-bulk-dialog')).toContainText('Zmień datę na ')
    await page.getByTestId('operations-bulk-confirm').click()
    await expect.poll(async () => (await records(dir, 'transactions')).find((t) => t.counterparty === 'Sklep Beta')?.date).toBe(target)

    // The bar's own change opens the very same preview.
    await row(page, 'Sklep Delta').getByTestId('operation-tick').check()
    await page.getByTestId('operations-bulk-change').selectOption('shift')
    await page.getByTestId('operations-bulk-days').fill('1')
    await page.getByTestId('operations-bulk-preview').click()
    await expect(page.getByTestId('operations-bulk-dialog')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operations-bulk-dialog')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('okno 1100 × 680: menu i podmenu w granicach okna', async () => {
  const { dataDir } = seed()
  const { app, page, errors } = await launch({ dataDir })
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setContentSize(1100, 680))
    await openList(page)
    const inside = async (testId: string) => {
      const box = await page.getByTestId(testId).boundingBox()
      const win = await page.evaluate<{ w: number; h: number }>('({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight })')
      expect(box, testId).not.toBeNull()
      expect(box!.x, testId).toBeGreaterThanOrEqual(0)
      expect(box!.y, testId).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width, testId).toBeLessThanOrEqual(win.w)
      expect(box!.y + box!.height, testId).toBeLessThanOrEqual(win.h)
    }
    // The last row's right end: the menu opens against the window's corner.
    const last = row(page, 'Sklep Delta')
    const at = await last.boundingBox()
    await page.mouse.click(at!.x + at!.width - 12, at!.y + at!.height / 2, { button: 'right' })
    await expect(page.getByTestId('operations-menu')).toBeVisible()
    await inside('operations-menu')
    for (const group of ['category', 'date', 'tags', 'kind']) {
      await page.getByTestId(`operations-menu-${group}`).hover()
      await expect(page.getByTestId(`operations-menu-panel-${group}`)).toBeVisible()
      await inside(`operations-menu-panel-${group}`)
    }
    // The keys: Esc closes the menu alone.
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operations-menu')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
