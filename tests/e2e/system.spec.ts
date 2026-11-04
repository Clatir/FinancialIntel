import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launch } from './app'
import { json } from './files'
import { warsawNow } from '../../src/shared/calc/dates'
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
    await expect(page.getByRole('status').filter({ hasText: 'AltGr+E („ę”)' })).toContainText('Wybierz inną literę')
    await expect(field).toHaveText('Naciśnij skrót…')
    // With Shift it is the capital letter – refused too.
    await page.keyboard.press('Control+Alt+Shift+KeyE')
    await expect(page.getByRole('status').filter({ hasText: 'AltGr+Shift+E („Ę”)' })).toBeVisible()
    await expect(field).toHaveText('Naciśnij skrót…')
    // Another letter is free.
    await page.keyboard.press('Control+Alt+KeyD')
    await expect(field).toHaveText('Ctrl+Alt+D')
    await expect.poll(async () => (await json(join(userData, 'config.json'))).prefs?.quickShortcut).toBe('Control+Alt+D')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('zmiana folderu z Ustawień (1.5.3, B31): postęp z „Przerwij”, w trakcie bez edycji, zapis tylko do folderu pokazanego w oknie', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-system-switch-'))
  const first = join(base, 'Dom', 'FinancialIntel')
  const second = join(base, 'Laptop', 'FinancialIntel')
  seedFolder(first, { settings: (s) => ({ ...s, shipName: 'Pierwszy' }) })
  seedFolder(second, {
    settings: (s) => ({ ...s, shipName: 'Drugi' }),
    records: { transactions: Array.from({ length: 120 }, (_, i) => ({ date: '2026-09-10', accountId: '01KDEFACC00000000000000001', amount: -(1000 + i), counterparty: 'Sklep' })) }
  })
  // Every read waits: the second folder takes seconds, like one OneDrive fetches from the cloud.
  const userData = userDataWith({ dataDir: first, recentDirs: [first, second] })
  const { app, page, errors } = await launch({ userData, usePreset: false, env: { FI_OPEN_DELAY_MS: '1500' } })
  const shipOf = async (dir: string) => (await json(join(dir, 'fi.json'))).settings.shipName
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 30_000 })
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await expect(page.getByTestId('settings-data-dir')).toHaveText(first)

    // The open in progress: its progress here, „Przerwij”, the folder buttons off.
    await page.getByTestId('recent-folder-open').click()
    await expect(page.getByTestId('open-progress')).toBeVisible()
    await expect(page.getByTestId('recent-folder-open')).toBeDisabled()
    // Meanwhile nothing changes the budget: the folder's settings only to look at.
    await page.getByTestId('settings-tab-general').click()
    await expect(page.getByTestId('settings-read-only')).toContainText('Trwa otwieranie innego folderu')
    await expect(page.getByTestId('ship-name-input')).toBeDisabled()
    await page.getByTestId('settings-tab-folder').click()
    await page.getByTestId('open-cancel').click()
    await expect(page.getByRole('status').filter({ hasText: 'Przerwano wczytywanie folderu' })).toBeVisible()
    await expect(page.getByTestId('open-progress')).toHaveCount(0)
    await expect(page.getByTestId('settings-data-dir')).toHaveText(first)

    // Stopped: the first folder works as before – a change lands in it.
    await page.getByTestId('settings-tab-general').click()
    const ship = page.getByTestId('ship-name-input')
    await expect(ship).toBeEnabled()
    await ship.fill('Pierwszy bis')
    await ship.press('Enter')
    await expect.poll(() => shipOf(first)).toBe('Pierwszy bis')

    // Opened to the end: the second folder shown, nothing of the first one written into it.
    await page.getByTestId('settings-tab-folder').click()
    await page.getByTestId('recent-folder-open').click()
    await expect(page.getByTestId('settings-data-dir')).toHaveText(second, { timeout: 30_000 })
    await expect(page.getByRole('status').filter({ hasText: 'Otwarto folder danych' })).toBeVisible()
    expect(await shipOf(second)).toBe('Drugi')

    // Main takes a write only for the folder the window shows: another folder opened behind the window's back (the
    // window still shows this one) refuses the window's write instead of putting it into that folder.
    const refused = await page.evaluate(async (dir) => {
      const fi = (globalThis as unknown as { fi: { openDataDir: (d: string, c: boolean) => Promise<{ ok: boolean; snapshot?: { fi: unknown } }>; saveSettings: (f: unknown) => Promise<unknown> } }).fi
      const res = await fi.openDataDir(dir, false)
      if (!res.ok || !res.snapshot) return 'not opened'
      return fi.saveSettings({ ...(res.snapshot.fi as object), settings: { ...(res.snapshot.fi as { settings: object }).settings, shipName: 'Obcy' } }).then(
        () => 'saved',
        (e: Error) => e.message
      )
    }, first)
    expect(refused).toContain('Trwa otwieranie innego folderu')
    expect(await shipOf(first)).toBe('Pierwszy bis')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('zapamiętany pusty folder z Ustawień (1.5.3, B53): nowe dane tylko na wyraźne „Utwórz tu nowe dane”', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-system-recent-'))
  const current = join(base, 'Dom', 'FinancialIntel')
  const emptied = join(base, 'Stary', 'FinancialIntel')
  seedFolder(current, {})
  mkdirSync(emptied, { recursive: true })
  const { app, page, errors } = await launch({ userData: userDataWith({ dataDir: current, recentDirs: [current, emptied] }), usePreset: false })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await page.getByTestId('recent-folder-open').click()
    const told = page.getByRole('status').filter({ hasText: 'Zapamiętany folder danych jest pusty' })
    await expect(told).toBeVisible()
    expect(existsSync(join(emptied, 'fi.json'))).toBe(false)
    await expect(page.getByTestId('settings-data-dir')).toHaveText(current)
    await told.getByRole('button', { name: 'Utwórz tu nowe dane' }).click()
    await expect(page.getByTestId('settings-data-dir')).toHaveText(emptied)
    expect(existsSync(join(emptied, 'fi.json'))).toBe(true)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('nowy komputer (AP-28): po „Otwórz istniejące” lista „Ustaw na tym komputerze”, „Co nowego” bez sieci; drugi start – bez listy', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-system-new-pc-'))
  const dataDir = join(base, 'OneDrive', 'FinancialIntel')
  const { month } = warsawNow()
  seedFolder(dataDir, { settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }) })
  const userData = join(base, 'userData')
  const first = await launch({ userData, usePreset: false, env: { FI_DEFAULT_DATA_DIR: join(base, 'Inny', 'FinancialIntel') } })
  try {
    const { app, page } = first
    await expect(page.getByTestId('folder-setup')).toBeVisible()
    // The system's folder dialog answers with the budget the other computer made.
    await app.evaluate(({ dialog }, dir) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [dir] })) as typeof dialog.showOpenDialog
    }, dataDir)
    await page.getByTestId('setup-open').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('banner-machine-setup')).toContainText('na tym komputerze')
    // The start with Windows is on the list – no second banner asking it.
    await expect(page.getByTestId('banner-autostart')).toHaveCount(0)
    await page.getByTestId('banner-machine-setup-open').click()
    const list = page.getByTestId('machine-setup')
    for (const row of ['ictj', 'shortcut', 'autostart', 'notify', 'token']) await expect(list.getByTestId(`machine-setup-${row}`)).toBeVisible()
    await expect(list.getByTestId('machine-setup-token')).toHaveAttribute('data-state', 'todo')
    // „Ustaw…” goes to the panel – marked as this computer's.
    await list.getByTestId('machine-setup-go-ictj').click()
    await expect(page.getByTestId('machine-setup')).toHaveCount(0)
    await expect(page.getByTestId('ictj-dir')).toBeVisible()
    await expect(page.getByTestId('machine-only').first()).toHaveText('tylko ten komputer')
    // „Co nowego” of this version from the CHANGELOG built in – GitHub is out of reach in tests.
    await page.getByTestId('settings-tab-updates').click()
    await expect(page.getByTestId('whats-new')).toBeVisible()
    // The list again from Folder i kopie; „Gotowe” ends it on this computer.
    await page.getByTestId('settings-tab-folder').click()
    await page.getByTestId('machine-setup-open').click()
    await page.getByTestId('machine-setup-done').click()
    await expect(page.getByTestId('banner-machine-setup')).toHaveCount(0)
    expect(first.errors).toEqual([])
  } finally {
    await first.app.close()
  }
  // The same computer again: its folder is remembered – nothing new to set.
  const again = await launch({ userData, usePreset: false })
  try {
    await expect(again.page.getByTestId('page-bridge')).toBeVisible()
    await expect(again.page.getByTestId('banner-machine-setup')).toHaveCount(0)
  } finally {
    await again.app.close()
  }
})

test('folder kopii zmieniony (AP-28, DA.14): wcześniejsze kopie zostają na liście pod swoim folderem i dają się odzyskać', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-system-backups-'))
  const dataDir = join(base, 'FinancialIntel')
  seedFolder(dataDir, {})
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await page.getByTestId('backup-now').click()
    await expect(page.locator('[data-testid="backup-row"]', { hasText: 'ręczna' })).toHaveCount(1)
    // Another folder of backups (a local disk instead of OneDrive).
    const local = join(base, 'Kopie')
    mkdirSync(local)
    await app.evaluate(({ dialog }, dir) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [dir] })) as typeof dialog.showOpenDialog
    }, local)
    await page.getByRole('button', { name: 'Zmień folder kopii…' }).click()
    const earlier = page.getByTestId('backup-earlier')
    await expect(earlier).toContainText(join(dataDir, 'backups'))
    await expect(earlier.locator('[data-testid="backup-row"]', { hasText: 'ręczna' })).toHaveCount(1)
    await expect(page.getByTestId('backup-age')).toContainText('dziś')
    // Recovered from there as from the current folder.
    await earlier.locator('[data-testid="backup-row"]', { hasText: 'ręczna' }).getByTestId('backup-recover').click()
    await expect(page.getByTestId('recover-summary')).toBeVisible()
    await expect(page.getByTestId('recover-error')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
