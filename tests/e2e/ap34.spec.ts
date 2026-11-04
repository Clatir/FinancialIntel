import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { launch } from './app'
import { records } from './files'

const FIXTURE = resolve('tests', 'fixtures', 'mbank', 'lista_operacji.csv')

/** The test id of the focused element. */
const focused = (page: Page) => page.locator(':focus').first().getAttribute('data-testid')
/** Is the focus inside the element of this test id (or on it)? */
const focusIn = async (page: Page, testId: string) => (await page.locator(`[data-testid="${testId}"] :focus, [data-testid="${testId}"]:focus`).count()) > 0

async function openFile(app: ElectronApplication, page: Page, path: string): Promise<void> {
  await page.keyboard.press('Control+3')
  await expect(page.getByTestId('page-import')).toBeVisible()
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
  await page.getByTestId('import-pick').click()
  await expect(page.getByTestId('import-file')).toBeVisible()
}

test('AP-34: klawiatura – fokus w palecie i oknie, Ctrl+N nie zeruje wyszukiwania, od kwoty do kategorii dwa Taby, okres listy po ponownym uruchomieniu', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-ap34-'))
  const dataDir = join(base, 'FinancialIntel')
  const userData = join(base, 'userData')
  let { app, page, errors } = await launch({ dataDir, userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    const search = page.getByTestId('operations-search')
    await search.click()

    // IN.28: Tab stays in the palette (Esc then still closes it); closed – the focus is back on the search.
    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('palette-input')).toBeFocused()
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab')
    expect(await focusIn(page, 'palette')).toBe(true)
    await page.keyboard.press('Shift+Tab')
    expect(await focusIn(page, 'palette')).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('palette')).toHaveCount(0)
    await expect(search).toBeFocused()

    // A dialog takes the focus; Tab goes round its own buttons; Esc – back where it was.
    await page.keyboard.press('F1')
    await expect(page.getByTestId('shortcuts')).toBeVisible()
    expect(await focusIn(page, 'shortcuts')).toBe(true)
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      expect(await focusIn(page, 'shortcuts')).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('shortcuts')).toHaveCount(0)
    await expect(search).toBeFocused()

    // IN.3: Ctrl+N keeps the search; the new entry stays on the list once written.
    await search.fill('Biedronka')
    await page.keyboard.press('Control+n')
    await expect(page.getByTestId('operation-amount')).toBeFocused()
    await expect(search).toHaveValue('Biedronka')
    // OP sp. 8: from the amount to the category – the counterparty between them, nothing else.
    await page.keyboard.type('12,50')
    await page.keyboard.press('Tab')
    expect(await focused(page)).toBe('operation-counterparty')
    await page.keyboard.press('Tab')
    expect(await focused(page)).toBe('operation-category')
    await expect.poll(async () => (await records(dataDir, 'transactions')).map((t) => t.amount)).toEqual([-1250])
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await expect(search).toHaveValue('Biedronka')

    // OP sp. 9: „cała historia” stays for the next start (a month does not – the current one).
    await search.fill('')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await expect(page.getByTestId('operations-period')).toHaveText('cała historia')
    expect(errors).toEqual([])
    await app.close()
    ;({ app, page, errors } = await launch({ dataDir, userData }))
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('operations-period')).toHaveText('cała historia')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-34: import – „(jak grupa)” w wierszu grupy z kategorią, „bez kategorii” to brak kategorii', async () => {
  const { app, page, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await openFile(app, page, FIXTURE)
    await page.getByTestId('import-search').fill('biedronka')
    const group = page.locator('[data-testid="import-group"][data-label="Biedronka"]').first()
    if (!(await group.getByTestId('import-group-rows').isVisible())) await group.getByTestId('import-group-toggle').click()
    const select = group.getByTestId('import-row').first().getByTestId('import-row-category')
    // IM.8: the row follows its group – „(jak grupa: …)” first and chosen.
    await expect(select.locator('option').first()).toHaveText(/^\(jak grupa: Jedzenie/)
    await expect(select).toHaveValue('\u0001group')
    await select.selectOption({ label: '— bez kategorii —' })
    await expect(select).toHaveValue('')
    // Back to the group's decision in one choice.
    await select.selectOption({ index: 0 })
    await expect(select).toHaveValue('\u0001group')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
