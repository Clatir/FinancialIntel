// R1 (1.16.0), AP-47: Ustawienia → Folder i kopie – the description of the folder's format for one's own tools opens
// in the browser (the public repository's docs/format-folderu.md).
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { FOLDER_FORMAT_PAGE } from '../../src/shared/update'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'

test('Ustawienia → Folder: „Opis formatu folderu” otwiera opis w przeglądarce', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-format-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: { balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(1000) }] }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    // The browser is not opened by a test: the address is recorded instead.
    await app.evaluate(({ shell }) => {
      const opened: string[] = []
      ;(globalThis as { __opened?: string[] }).__opened = opened
      shell.openExternal = async (url: string) => {
        opened.push(url)
      }
    })
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await page.getByTestId('settings-folder-format').click()
    await expect.poll(() => app.evaluate(() => (globalThis as { __opened?: string[] }).__opened ?? [])).toEqual([FOLDER_FORMAT_PAGE])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
