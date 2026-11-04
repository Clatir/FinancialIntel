import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

function folder(extra: Parameters<typeof seedFolder>[1]['records'] = {}): string {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap15-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: { balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(5000) }], months: [{ month: addMonths(month, -1), salary: zl(3000), envelopes: {} }], ...extra }
  })
  return dataDir
}

test('AP-15 szybki wpis: odmowa w stopce, Enter nie zapisuje starej kwoty, Esc = „×”, limity i tagi', async () => {
  const dataDir = folder()
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const quick = await quickWindow(app, page)
    const amount = quick.getByTestId('quick-amount')
    const message = quick.getByTestId('quick-message')
    // AF-17: a refused amount says so in the footer (this window has no toasts) and goes back to the saved one.
    await amount.click()
    await amount.fill('1.200')
    await amount.press('Tab')
    await expect(message).toContainText('Nieprawidłowa kwota – zostaje poprzednia')
    await expect(amount).toHaveValue('')
    // SW sp. 1: Enter on a refused amount does not save the old one in its place.
    await amount.click()
    await amount.fill('40')
    await amount.press('Tab')
    await amount.click()
    await amount.fill('12,345')
    await amount.press('Enter')
    await expect(message).toContainText('Nieprawidłowa kwota')
    await expect(amount).toHaveValue('40,00')
    await quick.waitForTimeout(800)
    await expect(message).not.toHaveText('Zapisano.')
    expect(await records(dir, 'transactions')).toEqual([])
    // AF-19: Esc is „×” – the amount being typed stays for the next opening.
    await amount.click()
    await amount.fill('25')
    await amount.press('Escape')
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length)).toBe(1)
    const again = await quickWindow(app, page)
    await expect(again.getByTestId('quick-amount')).toHaveValue('25,00')
    await expect(again.getByTestId('quick-restored')).toBeVisible()
    // OP sp. 4: the counter of a length limit, and the word at the limit.
    await again.getByTestId('quick-note').fill('x'.repeat(450))
    await expect(again.getByTestId('limit-hint')).toHaveText('450 / 500')
    await again.getByTestId('quick-note').fill('x'.repeat(500))
    await expect(again.getByTestId('limit-hint')).toHaveAttribute('data-full', 'true')
    // OP.27: tags beyond 20 are said, and the field says it is full.
    const tags = again.getByTestId('quick-tags-input')
    await tags.click()
    await tags.fill(Array.from({ length: 21 }, (_, i) => `t${i}`).join(', '))
    await tags.press('Tab')
    await expect(again.getByTestId('quick-message')).toContainText('Najwyżej 20 tagów')
    await expect(again.getByTestId('quick-tags-full')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-15 okno główne: kwoty od-do zamienione, liczby poza zakresem, Esc cofa, pusty eksport, 0 zł, przycisk bez powodu', async () => {
  const { date } = warsawNow()
  const dataDir = folder({ transactions: [{ date, accountId: ACC, amount: 0, kind: 'expense', counterparty: 'Zerowa', note: '', splits: [] }] })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // AF-21: the amount filter crossed – the ends swap, with a word.
    await page.getByTestId('nav-operations').click()
    await page.getByTestId('operations-more').click()
    const min = page.getByTestId('operations-amount-min')
    const max = page.getByTestId('operations-amount-max')
    await min.click()
    await min.fill('100')
    await min.press('Tab')
    await max.click()
    await max.fill('20')
    await max.press('Tab')
    await expect(page.getByRole('status').filter({ hasText: 'zamienione: 20,00 zł – 100,00 zł' })).toBeVisible()
    await expect(min).toHaveValue('20,00')
    await expect(max).toHaveValue('100,00')
    await page.getByTestId('operations-more-clear').click()
    // AF-25: an operation of 0 zł is saved with a warning.
    await page.keyboard.press('Escape')
    await page.locator('[data-testid="operation-row"]', { hasText: 'Zerowa' }).click()
    await expect(page.getByTestId('operation-zero')).toContainText('Kwota 0,00 zł')
    // AF-38 and „Kadłub – cel”: a number out of range is said; Esc takes the typing back.
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-layers').click()
    const hull = page.getByTestId('layers-hull')
    const was = await hull.inputValue()
    await hull.click()
    await hull.fill('99')
    await hull.press('Tab')
    await expect(page.getByRole('status').filter({ hasText: 'Dozwolone: od 1 do 36' })).toBeVisible()
    await expect(hull).toHaveValue(was)
    await hull.click()
    await hull.fill('2')
    await hull.press('Escape')
    await expect(hull).toHaveValue(was)
    await hull.click()
    await hull.fill('2,5')
    await hull.press('Tab')
    await expect(page.getByRole('status').filter({ hasText: 'Tu tylko liczby całkowite' })).toBeVisible()
    // AF-36 and RE sp. 5: „od” after „do” swap; an empty period is no empty file.
    await page.getByTestId('nav-reports').click()
    await page.getByRole('radio', { name: 'Eksport' }).click()
    const from = page.getByTestId('export-from')
    await from.click()
    await from.fill(`${Number(date.slice(0, 4)) + 1}-01-10`)
    await from.press('Tab')
    await expect(page.getByRole('status').filter({ hasText: '„Od” było po „do”' })).toBeVisible()
    // Now from the 10th of January to the 10th (a year later): no operation in it.
    await from.click()
    await from.fill(`${Number(date.slice(0, 4)) + 1}-01-05`)
    await from.press('Tab')
    await page.getByTestId('export-operations-csv').click()
    await expect(page.getByRole('status').filter({ hasText: 'Brak operacji w okresie.' })).toBeVisible()
    // AF-79: the disabled „Dodaj do ładowni” says why.
    await page.getByTestId('nav-cargo').click()
    await page.getByTestId('cargo-add').click()
    await expect(page.getByTestId('cargo-new-hint')).toContainText('Podaj nazwę i kwotę')
    await expect(page.getByTestId('cargo-new-save')).toBeDisabled()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
