import { promises as fs } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication } from '@playwright/test'
import { recordRelPath } from '../../src/shared/paths'
import { MBANK_ACCOUNT_ID } from '../../src/shared/schema'
import { launch } from './app'
import { records } from './files'
import { seedFolder } from './seed'

/** What the main process has on disk now (the watcher's rescan without waiting for it). */
const rescan = () => (globalThis as unknown as { fi: { rescan(): Promise<void> } }).fi.rescan()

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

test('wiele zmian z drugiego komputera (1.5.4, W25): okno po 50 kart, „Zastosuj” rozstrzyga wszystkie naraz', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-remote-many-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, sync: { ...s.sync, remoteChanges: 'ask' } }),
    records: { transactions: Array.from({ length: 120 }, (_, i) => ({ date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, amount: -(100 + i), counterparty: `Sklep ${i}` })) }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // The other computer changed every one of them; OneDrive brings the files.
    const at = new Date(Date.now() + 1000).toISOString()
    for (const r of await records(dataDir, 'transactions')) {
      const file = join(dataDir, ...recordRelPath('transactions', r as never).split('/'))
      await fs.writeFile(file, `${JSON.stringify({ ...r, note: 'z laptopa', updatedAt: at, updatedBy: 'LAPTOP' }, null, 2)}\n`)
    }
    await page.evaluate(rescan)
    await expect(page.getByTestId('remote-dialog')).toBeVisible()
    await expect(page.getByTestId('remote-item')).toHaveCount(50)
    await expect(page.getByTestId('remote-hidden')).toContainText('wszystkie 120')
    await page.getByTestId('remote-more').click()
    await expect(page.getByTestId('remote-item')).toHaveCount(100)
    // One kept as it is here, the rest with the default choice – the shown and the not shown alike.
    await page.getByTestId('remote-item').first().getByRole('radio', { name: 'Zachowaj moją wersję' }).click()
    await page.getByTestId('remote-apply').click()
    await expect(page.getByTestId('remote-dialog')).toHaveCount(0)
    await expect(page.getByTestId('remote-chip')).toHaveCount(0)
    await expect.poll(async () => (await records(dataDir, 'transactions')).filter((r) => r.note === 'z laptopa').length).toBe(119)
    const mine = (await records(dataDir, 'transactions')).filter((r) => r.note !== 'z laptopa')
    expect(mine.map((r) => r.updatedBy)).toEqual(['E2E-PC'])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
