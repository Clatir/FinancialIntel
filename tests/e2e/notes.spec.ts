import { join } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { launch } from './app'
import { records } from './files'

/** Every operation file of the folder, parsed. */
const operations = (dataDir: string) => records(dataDir, 'transactions')

async function typeAmount(page: Page, target: string | Locator, text: string) {
  const field = typeof target === 'string' ? page.getByTestId(target) : target
  await field.click()
  await field.fill(text)
  await field.press('Enter')
}

test('Opis wydatku (1.11.0, D89): notatka na liście, opis części paragonu, wybór kolumn na tym komputerze', async () => {
  const first = await launch()
  const { dataDir, userData } = first
  try {
    const { page, errors } = first
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()

    // A note says what the expense is: the list shows its first line, the hint the whole.
    await page.keyboard.press('Control+n')
    await typeAmount(page, 'operation-amount', '120')
    await page.getByTestId('operation-counterparty').fill('Auchan')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-note').fill('Prezent dla mamy – szalik\nzamówiony w promocji')
    await page.getByTestId('operation-note').press('Control+Enter')
    await expect.poll(async () => (await operations(dataDir)).map((t) => t.note)).toEqual(['Prezent dla mamy – szalik\nzamówiony w promocji'])
    const row = page.locator('[data-testid="operation-row"]', { hasText: 'Auchan' })
    await expect(row.getByTestId('operation-row-note')).toHaveText('Prezent dla mamy – szalik')
    await expect(row.getByTestId('operation-row-note')).toHaveAttribute('title', 'Prezent dla mamy – szalik\nzamówiony w promocji')
    await expect(row.getByTestId('operation-row-account')).toHaveText('mBank')

    // A split receipt: each line its own description; without the operation's note the list shows the lines'.
    await page.getByTestId('operation-split').click()
    await expect(page.getByTestId('split-line')).toHaveCount(2)
    await typeAmount(page, page.getByTestId('split-amount').nth(0), '100')
    await typeAmount(page, page.getByTestId('split-amount').nth(1), '20')
    await page.getByTestId('split-note').nth(0).fill('zakupy na tydzień')
    await page.getByTestId('split-note').nth(0).press('Enter')
    await page.getByTestId('split-note').nth(1).fill('kabel HDMI')
    await page.getByTestId('split-note').nth(1).press('Enter')
    await page.getByTestId('operation-note').fill('')
    await page.getByTestId('operation-note').press('Control+Enter')
    await expect
      .poll(async () => (await operations(dataDir)).map((t) => [t.note, (t.splits as Array<{ note: string }>).map((s) => s.note)]))
      .toEqual([['', ['zakupy na tydzień', 'kabel HDMI']]])
    await expect(row.getByTestId('operation-row-note')).toHaveText('zakupy na tydzień · kabel HDMI')

    // The search finds a line's description.
    await page.getByTestId('operations-search').fill('hdmi')
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await page.getByTestId('operations-search').fill('')

    // Sorted by the counterparty: hiding its column brings the newest first back (its header was the only sign).
    await page.getByTestId('operations-sort-counterparty').click()
    await expect(page.getByTestId('operations-sort-counterparty')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-column-counterparty').uncheck()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operations-sort-counterparty')).toHaveCount(0)
    await expect(page.getByTestId('operations-sort-date')).toHaveAttribute('aria-pressed', 'true')
    // A new entry says so without the counterparty's column – in the note's.
    await page.keyboard.press('Control+n')
    await expect(page.getByTestId('operation-editor-title')).toHaveText('Nowa operacja')
    await expect(page.getByTestId('operation-row-note').filter({ hasText: 'nowa operacja' })).toHaveCount(1)
    await page.getByTestId('operation-row').filter({ hasText: 'zakupy na tydzień' }).click()
    await expect(page.getByTestId('operation-row')).toHaveCount(1)

    // „Kolumny”: hidden ones leave the header and the rows, the date and the amount stay.
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-column-counterparty').check()
    await page.getByTestId('operations-column-note').uncheck()
    await page.getByTestId('operations-column-account').uncheck()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operations-columns')).toHaveText(/Kolumny: 2 ukryte/)
    await expect(page.getByTestId('operations-header')).not.toContainText('Notatka')
    await expect(page.getByTestId('operations-header')).not.toContainText('Konto')
    await expect(page.getByTestId('operations-header')).toContainText('Kategoria')
    await expect(row.getByTestId('operation-row-note')).toHaveCount(0)
    await expect(row.getByTestId('operation-row-account')).toHaveCount(0)
    await expect(row.getByTestId('operation-amount-cell')).toHaveText('−120,00')
    expect(errors).toEqual([])
  } finally {
    await first.app.close()
  }

  // The choice is this computer's: the next start shows the list as it was left.
  const second = await launch({ dataDir, userData })
  try {
    const { app, page, errors } = second
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    const row = page.locator('[data-testid="operation-row"]', { hasText: 'Auchan' })
    await expect(row).toHaveCount(1)
    await expect(row.getByTestId('operation-row-note')).toHaveCount(0)
    await expect(page.getByTestId('operations-columns')).toHaveText(/Kolumny: 2 ukryte/)

    // „Przywróć domyślne”: every column back.
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-columns-reset').click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operations-columns')).toHaveText(/^Kolumny/)
    await expect(page.getByTestId('operations-columns')).not.toHaveText(/ukryt/)
    await expect(row.getByTestId('operation-row-note')).toHaveText('zakupy na tydzień · kabel HDMI')

    // The receipt back to one line: the line's description stays – the operation's note now.
    await row.click()
    await page.getByTitle('Usuń część').nth(1).click()
    await expect(page.getByTestId('split-line')).toHaveCount(0)
    await expect(page.getByTestId('operation-note')).toHaveValue('zakupy na tydzień')
    await expect.poll(async () => (await operations(dataDir)).map((t) => [t.note, (t.splits as unknown[]).length])).toEqual([['zakupy na tydzień', 0]])
    await expect(row.getByTestId('operation-row-note')).toHaveText('zakupy na tydzień')

    // The least window with the details open: every column shown, the header never reaches under the details.
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.isVisible())?.setSize(1024, 700))
    await row.click()
    await expect(page.getByTestId('operation-editor-title')).toBeVisible()
    await expect
      .poll(async () => {
        const amount = await page.getByTestId('operations-sort-amount').boundingBox()
        const details = await page.locator('[data-panel="operations:Szczegóły"]').boundingBox()
        return !!amount && !!details && amount.x + amount.width <= details.x + 1
      })
      .toBe(true)
    await page.screenshot({ path: join('test-results', 'screens', '11-opis-wydatku.png') })
    expect(errors).toEqual([])
  } finally {
    await second.app.close()
  }
})
