import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launch } from './app'
import { json } from './files'
import { seedFolder } from './seed'

// Z9 (1.21.0): Ustawienia in groups with the last tab remembered, the mode of work on several computers in „Folder
// i kopie” with a link from Synchronizacja, the notifications in groups, the first start on a second computer.

test('Ustawienia: grupy, pamięć ostatniej zakładki, tryb scalania w „Folder i kopie” z linkiem z Synchronizacji', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await expect(page.getByTestId('settings-autosave')).toContainText('Zmiany zapisują się od razu')
    for (const g of ['budget', 'machine', 'data']) await expect(page.getByTestId(`settings-group-${g}`)).toBeVisible()
    await expect(page.getByTestId('settings-group-budget').getByTestId('settings-tab-general')).toBeVisible()
    await expect(page.getByTestId('settings-group-machine').getByTestId('settings-tab-notify')).toBeVisible()
    await expect(page.getByTestId('settings-group-data').getByTestId('settings-tab-folder')).toBeVisible()
    // The first time: „Okręt”, and the mode is not there any more.
    await expect(page.getByTestId('ship-name-input')).toBeVisible()
    await expect(page.getByTestId('settings-two-computers')).toHaveCount(0)

    await page.getByTestId('settings-tab-folder').click()
    await expect(page.getByTestId('settings-two-computers')).toBeVisible()
    await page.getByRole('radio', { name: 'Zawsze pytaj przed przyjęciem zmian' }).click()
    await expect.poll(async () => (await json(join(dataDir, 'fi.json'))).settings.sync.remoteChanges).toBe('ask')

    // Ctrl+, opens the tab shown last.
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.keyboard.press('Control+,')
    await expect(page.getByTestId('settings-data-dir')).toBeVisible()
    await expect(page.getByTestId('ship-name-input')).toHaveCount(0)

    // The shortcut of the quick entry is in „Zasobnik i start”.
    await page.getByTestId('settings-tab-system').click()
    await expect(page.getByTestId('settings-shortcut')).toBeVisible()
    await page.getByTestId('settings-tab-notify').click()
    await expect(page.getByTestId('settings-shortcut')).toHaveCount(0)

    // Synchronizacja: the conflicts and the problems first, the mode with a link to the setting.
    await page.keyboard.press('Control+Shift+Y')
    await expect(page.getByTestId('sync-mode-link')).toContainText('zawsze pytaj')
    const mode = await page.getByTestId('sync-mode').boundingBox()
    const other = await page.getByRole('heading', { name: /^Konflikty/ }).boundingBox()
    expect(mode!.y).toBeLessThan(other!.y)
    await page.getByTestId('sync-mode-link').click()
    await expect(page.getByTestId('settings-two-computers')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('powiadomienia: grupy, „włączone N z 20”, włącz / wyłącz wszystkie, cisza nocna z linkiem', async () => {
  const { app, page, userData, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-notify').click()
    const count = page.getByTestId('notify-count')
    await expect(count).toHaveText('włączone 20 z 20')
    await expect(page.getByTestId('notify-quiet-hours')).toContainText('Cisza nocna')

    await page.getByTestId('notify-all-off').click()
    await expect(count).toHaveText('włączone 0 z 20')
    await expect.poll(async () => Object.entries((await json(join(userData, 'config.json'))).prefs?.notify ?? {}).filter(([, v]) => v === true).length).toBe(0)
    // The hours are not switches – they stay.
    await expect.poll(async () => (await json(join(userData, 'config.json'))).prefs?.notify?.eveningTime).toBe('21:00')

    await page.getByTestId('notify-group-toggle-day').click()
    await expect(page.getByTestId('notify-group-count-day')).toHaveText('7 z 7')
    await expect(count).toHaveText('włączone 7 z 20')
    await page.getByTestId('notify-briefing').getByRole('switch').click()
    await expect(count).toHaveText('włączone 6 z 20')
    await page.getByTestId('notify-all-on').click()
    await expect(count).toHaveText('włączone 20 z 20')

    await page.getByTestId('notify-quiet-link').click()
    await expect(page.getByTestId('settings-game')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('pierwszy start na drugim komputerze: budżet z OneDrive znaleziony – „Otwórz dane z OneDrive (znalezione)”, nic nowego nie powstaje', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-z9-'))
  const found = join(base, 'OneDrive', 'FinancialIntel')
  seedFolder(found, { settings: (s) => ({ ...s, shipName: 'Z drugiego komputera' }) })
  const { app, page, errors } = await launch({ usePreset: false, env: { FI_DEFAULT_DATA_DIR: found } })
  try {
    const button = page.getByTestId('setup-default')
    await expect(button).toBeVisible({ timeout: 15_000 })
    await expect(button).toContainText('Otwórz dane z OneDrive (znalezione)')
    await expect(button).toHaveAttribute('data-found', 'yes')
    await button.click()
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('menu-ship-name')).toHaveText('okręt Z drugiego komputera')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
