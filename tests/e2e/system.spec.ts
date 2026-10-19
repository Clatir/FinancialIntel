import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launch } from './app'
import { json } from './files'
import { seedFolder } from './seed'

/** A user-data folder whose config.json already says where the data was (and what else this computer remembers). */
function userDataWith(config: Record<string, unknown>): string {
  const userData = join(mkdtempSync(join(tmpdir(), 'fi-system-')), 'userData')
  mkdirSync(userData, { recursive: true })
  writeFileSync(join(userData, 'config.json'), `${JSON.stringify(config, null, 2)}\n`)
  return userData
}

test('folder danych (1.5.3, B53): zapamiętany pusty – tylko ponowna próba albo nowe dane z potwierdzeniem; folder z innymi plikami – podfolder', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-system-dirs-'))
  // The remembered folder found empty (OneDrive has not brought it yet).
  const remembered = join(base, 'FinancialIntel')
  mkdirSync(remembered)
  const userData = userDataWith({ dataDir: remembered, recentDirs: [remembered] })
  const first = await launch({ userData, usePreset: false, env: { FI_DEFAULT_DATA_DIR: remembered } })
  try {
    const page = first.page
    await expect(page.getByTestId('setup-message')).toContainText('Zapamiętany folder danych jest pusty')
    await expect(page.getByTestId('retry-folder')).toBeVisible()
    // No plain „create here” and no proposal of that very folder: new data there would split the budget.
    await expect(page.getByTestId('create-here')).toHaveCount(0)
    await expect(page.getByTestId('setup-default')).toHaveCount(0)
    // A main-process guard too: the proposal's call is refused for the remembered folder.
    const refused = await page.evaluate((d) => (globalThis as unknown as { fi: { openDataDir: (d: string, c: boolean) => Promise<{ ok: boolean; problem?: string }> } }).fi.openDataDir(d, true), remembered)
    expect(refused).toMatchObject({ ok: false, problem: 'empty' })
    expect(existsSync(join(remembered, 'fi.json'))).toBe(false)
    // Starting over on purpose: two steps.
    await page.getByTestId('start-over').click()
    await page.getByTestId('start-over-confirm').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    expect(existsSync(join(remembered, 'fi.json'))).toBe(true)
    expect(first.errors).toEqual([])
  } finally {
    await first.app.close()
  }

  // A remembered folder of other files: its FinancialIntel subfolder in one click.
  const other = join(base, 'Dokumenty')
  mkdirSync(other)
  writeFileSync(join(other, 'zakupy.txt'), 'mleko')
  const second = await launch({ userData: userDataWith({ dataDir: other, recentDirs: [other] }), usePreset: false })
  try {
    const page = second.page
    await expect(page.getByTestId('setup-message')).toContainText('podfolder')
    await expect(page.getByTestId('retry-folder')).toHaveCount(0)
    await page.getByTestId('create-subfolder').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    expect(existsSync(join(other, 'FinancialIntel', 'fi.json'))).toBe(true)
    expect(second.errors).toEqual([])
  } finally {
    await second.app.close()
  }
})

test('skrót szybkiego wpisu (1.5.3, B29): Ctrl+Alt+litera polskiego znaku zamieniony na domyślny z komunikatem, nowy taki nie do ustawienia', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-system-shortcut-')), 'FinancialIntel')
  seedFolder(dataDir, {})
  const userData = userDataWith({ prefs: { quickShortcut: 'Control+Alt+S' } })
  const { app, page, errors } = await launch({ dataDir, userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Ctrl+Alt+S zabierał polską literę' })).toContainText('teraz jest Ctrl+Alt+B')
    await expect.poll(async () => (await json(join(userData, 'config.json'))).prefs?.quickShortcut).toBe('Control+Alt+B')

    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-notify').click()
    const field = page.getByTestId('settings-shortcut')
    await field.click()
    await page.keyboard.press('Control+Alt+KeyE')
    await expect(page.getByRole('status').filter({ hasText: 'AltGr+E („ę”)' })).toContainText('Ctrl+Alt+Shift+E')
    await expect(field).toHaveText('Naciśnij skrót…')
    // With Shift it is free.
    await page.keyboard.press('Control+Alt+Shift+KeyE')
    await expect(field).toHaveText('Ctrl+Alt+Shift+E')
    await expect.poll(async () => (await json(join(userData, 'config.json'))).prefs?.quickShortcut).toBe('Control+Alt+Shift+E')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
