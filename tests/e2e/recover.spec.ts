import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'

test('odzyskanie z kopii (1.6.0, F3): podgląd różnic, wybrane wpisy jako nowa wersja z „Cofnij”, cały folder do nowego obok', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-recover-')), 'FinancialIntel')
  seedFolder(dataDir, {
    records: {
      transactions: [
        { date: '2026-10-01', accountId: MBANK, amount: -zl(45.99), counterparty: 'Biedronka' },
        { date: '2026-10-02', accountId: MBANK, amount: -zl(200), counterparty: 'Orlen' }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  const names = async (dir: string) => (await records(dir, 'transactions')).map((t) => t.counterparty).sort()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await page.getByTestId('backup-now').click()
    const manual = page.locator('[data-testid="backup-row"]', { hasText: 'ręczna' })
    await expect(manual).toHaveCount(1)

    // After the backup: one operation changed, one deleted, one added.
    await page.keyboard.press('Control+2')
    await page.locator('[data-testid="operation-row"]', { hasText: 'Biedronka' }).click()
    await page.getByTestId('operation-counterparty').fill('Lidl')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.locator('[data-testid="operation-row"]', { hasText: 'Orlen' }).click()
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-amount').fill('10')
    await page.getByTestId('operation-amount').press('Enter')
    await page.getByTestId('operation-counterparty').fill('Po kopii')
    await page.getByTestId('operation-counterparty').press('Enter')
    await expect.poll(() => names(dataDir)).toEqual(['Lidl', 'Po kopii'])

    // The preview: what changed and what was deleted since the backup – the one added after it stays.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await manual.getByTestId('backup-recover').click()
    const dialog = page.getByTestId('recover-dialog')
    await expect(dialog.getByTestId('recover-summary')).toContainText('1 operacja zmieniona, 1 operacja usunięta')
    await expect(dialog.getByTestId('recover-added')).toContainText('1 operacja')
    const changed = dialog.locator('[data-testid="recover-item"][data-change="changed"]', { hasText: 'Operacja' })
    const deleted = dialog.locator('[data-testid="recover-item"][data-change="deleted"]', { hasText: 'Operacja' })
    await expect(changed).toContainText('Biedronka')
    await expect(deleted).toContainText('Orlen')
    await changed.getByTestId('recover-diff').click()
    await expect(changed.getByTestId('recover-changes')).toContainText('Kontrahent')
    await expect(changed.getByTestId('recover-changes')).toContainText('Lidl')
    await changed.getByTestId('recover-pick').check()
    await deleted.getByTestId('recover-pick').check()
    await expect(dialog.getByTestId('recover-selected')).toHaveText('Odzyskaj zaznaczone (2)')
    await dialog.getByTestId('recover-selected').click()
    await expect(dialog).toHaveCount(0)
    await expect.poll(() => names(dataDir)).toEqual(['Biedronka', 'Orlen', 'Po kopii'])
    // „Cofnij”: the operations as they were before the recovery.
    await page.getByRole('status').filter({ hasText: 'Odzyskano z kopii: 2 wpisy' }).getByTestId('toast-action').click()
    await expect.poll(() => names(dataDir)).toEqual(['Lidl', 'Po kopii'])

    // The whole folder: unpacked into a new folder beside the current one and opened; the current one untouched.
    await manual.getByTestId('backup-recover').click()
    await dialog.getByTestId('recover-folder').click()
    await expect(page.getByTestId('settings-data-dir')).toContainText('FinancialIntel – kopia z')
    const opened = (await page.getByTestId('settings-data-dir').textContent())!.trim()
    expect(dirname(opened)).toBe(dirname(dataDir))
    expect(await names(opened)).toEqual(['Biedronka', 'Orlen'])
    expect(await names(dataDir)).toEqual(['Lidl', 'Po kopii'])
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('operation-row')).toHaveCount(2)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
