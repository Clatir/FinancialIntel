import { promises as fs } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication } from '@playwright/test'
import { launch } from './app'

/** The file dialog of the main process answers with `path` (a dialog cannot be clicked in a test). */
async function answerFileDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

/** A list of operations of `n` small shops nothing recognizes (one theme „Zakupy bez rozpoznania”), one purchase each. */
function bigFile(n: number): string {
  const syl = ['ka', 'ro', 'mi', 'lo', 'za', 'be', 'tu', 'ni', 'po', 've']
  const names = Array.from({ length: n }, (_, i) => `${syl[i % 10]}${syl[Math.floor(i / 10) % 10]}${syl[Math.floor(i / 100) % 10]}tex`.toUpperCase())
  const header = ['mBank S.A. Bankowość Detaliczna;;;', ';;;', '#Klient;;;', 'JAN KAPITAN;;;', ';;;', 'Lista operacji;;;', ';;;', '#Za okres:;;;', '01.10.2025;31.10.2025;;', ';;;', '#Data operacji;#Opis operacji;#Kategoria;#Kwota']
  const rows = names.map((name, i) => `${String(1 + (i % 28)).padStart(2, '0')}.10.2025;${name}  ZAKUP PRZY UŻYCIU KARTY W KRAJU${' '.repeat(50)};Bez kategorii;-${10 + i},00 PLN`)
  return `${[...header, ...rows].join('\r\n')}\r\n`
}

test('duży import (1.5.4, W17): temat ponad 30 marek zwinięty na start, marki po 100 z „pokaż kolejne”, decyzja i zaznaczenie jednej marki', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'fi-big-import-')), 'lista.csv')
  await fs.writeFile(file, bigFile(150))
  const { app, page, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await answerFileDialog(app, file)
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-count-new')).toHaveText('150')
    const theme = page.locator('[data-testid="import-theme"][data-status="todo"]')
    await expect(theme).toHaveCount(1)
    await expect(theme).toContainText('150 marek')
    // Closed on start: no brand of it rendered.
    await expect(page.getByTestId('import-group')).toHaveCount(0)
    await theme.getByTestId('import-theme-toggle').click()
    await expect(page.getByTestId('import-group')).toHaveCount(100)
    await page.getByTestId('import-groups-more').click()
    await expect(page.getByTestId('import-group')).toHaveCount(150)
    await expect(page.getByTestId('import-groups-more')).toHaveCount(0)
    // One brand decided and ticked: the list stays as it is.
    const first = page.getByTestId('import-group').first()
    await first.getByTestId('import-group-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await expect(first).toContainText('Twoja decyzja')
    await first.getByTestId('import-group-select').check()
    await expect(page.getByTestId('import-bulk-count')).toContainText('1 grupa')
    await expect(page.getByTestId('import-group')).toHaveCount(150)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
