import { promises as fs, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
/** What the main process has on disk now (the watcher's rescan without waiting for it). */
const rescan = () => (globalThis as unknown as { fi: { rescan(): Promise<void> } }).fi.rescan()

test('folder tylko do odczytu (1.5.3, N2): pola i przyciski zmian wyłączone, historia do obejrzenia, nic nie jest zapisywane', async () => {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-folder-ro-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${addMonths(month, -1)}-01` } }),
    records: {
      balances: [{ date: `${addMonths(month, -1)}-01`, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      months: [{ month, salary: zl(4000), envelopes: {} }],
      transactions: [{ date: today, accountId: MBANK, amount: -zl(45), counterparty: 'Sklep' }]
    }
  })
  // Written by a newer version of the app: this one only looks.
  const fiPath = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(fiPath, 'utf8'))
  writeFileSync(fiPath, `${JSON.stringify({ ...fi, schemaVersion: fi.schemaVersion + 1 }, null, 2)}\n`)
  const before = readFileSync(fiPath, 'utf8')
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('banner-ro')).toContainText('tylko do odczytu')

    // Settings of the budget: to look at.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    await expect(page.getByTestId('settings-read-only')).toContainText('Folder jest tylko do odczytu')
    await expect(page.getByTestId('account-confirm-amount').first()).toBeDisabled()

    // The month's plan: the fields off – never a typed value quietly lost.
    await page.keyboard.press('Control+4')
    await expect(page.getByTestId('month-salary')).toBeDisabled()

    // Operations: the bulk bar off; the operation's history still opens.
    await page.keyboard.press('Control+2')
    await page.getByTestId('operation-tick').first().click()
    await expect(page.getByTestId('operations-bulk-apply')).toBeDisabled()
    await page.getByTestId('operation-row').first().click()
    await page.getByTestId('operation-editor').getByTestId('history-open').click()
    await expect(page.getByTestId('history-dialog')).toBeVisible()
    await expect(page.getByTestId('history-empty')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('history-dialog')).toHaveCount(0)

    expect(readFileSync(fiPath, 'utf8')).toBe(before)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('kopia konfliktu (1.5.3, N17, N18): „Scal…” łączy pola obu wersji, obie zostają w historii; historia planu miesiąca', async () => {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-folder-merge-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${addMonths(month, -1)}-01` } }),
    records: {
      balances: [{ date: `${addMonths(month, -1)}-01`, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      months: [{ month, salary: zl(4000), envelopes: {} }],
      transactions: [{ date: today, accountId: MBANK, amount: -zl(10), counterparty: 'Sklep', note: 'z domu' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // OneDrive's copy from the laptop: another amount, no note (written later than the original).
    const dir = join(dataDir, 'transactions', today.slice(0, 4))
    const name = readdirSync(dir).find((n) => n.endsWith('.json'))!
    const original = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    const copyName = name.replace('.json', '-LAPTOP.json')
    writeFileSync(join(dir, copyName), `${JSON.stringify({ ...original, amount: -zl(15), note: '', updatedAt: new Date(Date.now() + 60_000).toISOString(), updatedBy: 'LAPTOP' }, null, 2)}\n`)
    await page.evaluate(rescan)
    await page.getByTestId('nav-sync').click()
    await page.getByTestId('conflict-merge-open').click()
    const merge = page.getByTestId('conflict-merge')
    await expect(merge.getByTestId('conflict-merge-field')).toHaveCount(2)
    // The newer side proposed for both; the note taken from the original.
    await merge.locator('[data-testid="conflict-merge-field"][data-path="note"]').getByTestId('conflict-merge-canonical').check()
    await merge.getByTestId('conflict-merge-save').click()
    await expect(page.getByRole('status').filter({ hasText: 'Scalono obie wersje' })).toBeVisible()
    await expect.poll(async () => (await records(dataDir, 'transactions')).map((t) => [t.amount, t.note])).toEqual([[-zl(15), 'z domu']])
    await expect.poll(async () => (await fs.readdir(dir)).filter((n) => n.includes('LAPTOP'))).toEqual([])

    // Both versions in the operation's history (N18: what the dialogs promise is there to see).
    await page.keyboard.press('Control+2')
    await page.getByTestId('operation-row').first().click()
    await page.getByTestId('operation-editor').getByTestId('history-open').click()
    await expect(page.getByTestId('history-version')).toHaveCount(2)
    await expect(page.getByTestId('history-dialog')).toContainText('przed scaleniem')
    await page.keyboard.press('Escape')

    // The month's plan has its history too: a changed salary, its version before the change brought back.
    await page.keyboard.press('Control+4')
    const salary = page.getByTestId('month-salary')
    // Focused first: the field puts its draft in on focus (a fill racing it would type after it).
    await salary.click()
    await salary.fill('4500')
    await salary.press('Enter')
    await expect.poll(async () => (await records(dataDir, 'months')).map((m) => m.salary)).toEqual([zl(4500)])
    await page.getByTestId('page-month').getByTestId('history-open').click()
    await expect(page.getByTestId('history-version')).toHaveCount(1)
    await page.getByTestId('history-restore').click()
    await expect.poll(async () => (await records(dataDir, 'months')).map((m) => m.salary)).toEqual([zl(4000)])
    await expect(salary).toHaveValue('4\u00a0000,00')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
