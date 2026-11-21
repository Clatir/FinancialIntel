import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'

// Grupa 1.21.1 (T553): the keyboard in the shell – Alt+← through the tabs of Ustawienia, Tab in the „Podziel…” menu.
function seed() {
  const { month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-u4-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }),
    records: { balances: [{ date: `${month}-01`, accountId: MBANK, kind: 'opening', amount: zl(20000) }] }
  })
  return dataDir
}

test('Alt+← w Ustawieniach wraca do poprzedniej zakładki, nie do ostatniej zapamiętanej', async () => {
  const { app, page, errors } = await launch({ dataDir: seed() })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // The menu's „Ustawienia” names no tab: it shows the remembered one (Okręt).
    await page.getByTestId('nav-settings').click()
    await expect(page.getByTestId('ship-name-input')).toBeVisible()
    await page.getByTestId('settings-tab-folder').click()
    await expect(page.getByTestId('settings-data-dir')).toBeVisible()
    await page.keyboard.press('Alt+ArrowLeft')
    await expect(page.getByTestId('ship-name-input')).toBeVisible()
    await expect(page.getByTestId('settings-data-dir')).toHaveCount(0)
    await page.keyboard.press('Alt+ArrowRight')
    await expect(page.getByTestId('settings-data-dir')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Tab w menu „Podziel…” zamyka je i zostawia fokus na stronie – dalej i wstecz', async () => {
  const { app, page, errors } = await launch({ dataDir: seed() })
  try {
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.keyboard.press('Control+n')
    const menu = page.getByTestId('operation-split-menu')
    // The focus goes on from the button – to a neighbour inside the editor – not from the unmounted item's place (the
    // portal at the page's end), which sends it to the start of the page or out of it.
    const lost = () => page.evaluate("!document.activeElement?.closest('[data-testid=\"operation-editor\"]')")
    await menu.click()
    await expect(page.getByTestId('operation-split')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('operation-split')).toHaveCount(0)
    await expect(menu).not.toBeFocused()
    expect(await lost()).toBe(false)
    await menu.click()
    await expect(page.getByTestId('operation-split')).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByTestId('operation-split')).toHaveCount(0)
    await expect(menu).not.toBeFocused()
    expect(await lost()).toBe(false)
    await expect(page.getByTestId('operation-editor')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
