import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launch } from './app'

const shots = (name: string) => join('test-results', 'screens', `${name}.png`)

test('pierwsze uruchomienie: propozycja folderu, fi.json, menu boczne i puste ekrany', async () => {
  const { app, page, userData, errors } = await launch({ usePreset: false })
  try {
    await expect(page.getByTestId('folder-setup')).toBeVisible()
    const proposed = await page.getByTestId('setup-default-dir').innerText()
    expect(proposed).toContain(join('OneDrive', 'FinancialIntel'))
    await page.screenshot({ path: shots('01-pierwsze-uruchomienie') })
    await page.getByTestId('setup-default').click()

    await expect(page.getByTestId('side-menu')).toBeVisible()
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('menu-ship-name')).toHaveText('okręt Flagowiec')
    const dir = join(userData, '..', 'OneDrive', 'FinancialIntel')
    const fi = JSON.parse(await fs.readFile(join(dir, 'fi.json'), 'utf8'))
    expect(fi.schemaVersion).toBe(1)
    expect(fi.settings.shipName).toBe('Flagowiec')
    expect(fi.updatedBy ?? null).toBeNull()
    for (const sub of ['transactions', 'months', 'dockings', 'backups']) expect((await fs.stat(join(dir, sub))).isDirectory()).toBe(true)
    // The daily backup of the new folder.
    await expect.poll(async () => (await fs.readdir(join(dir, 'backups', 'daily')).catch(() => [])).length).toBe(1)
    await page.screenshot({ path: shots('02-mostek') })

    // Every screen of the menu, by click and by Ctrl+digit.
    await page.getByTestId('nav-operations').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.getByTestId('nav-import').click()
    await expect(page.getByTestId('page-import')).toBeVisible()
    // Plan miesiąca and Ładownia are real screens from E3.
    for (const page_ of ['month', 'cargo']) {
      await page.getByTestId(`nav-${page_}`).click()
      await expect(page.getByTestId(`page-${page_}`)).toBeVisible()
      await expect(page.getByTestId('page-stage')).toHaveCount(0)
    }
    for (const [page_, stage] of [
      ['starmap', 'E5'],
      ['radar', 'E6'],
      ['command', 'E7'],
      ['intel', 'E8'],
      ['reports', 'E8']
    ]) {
      await page.getByTestId(`nav-${page_}`).click()
      await expect(page.getByTestId(`page-${page_}`)).toBeVisible()
      await expect(page.getByTestId('page-stage')).toHaveText(`etap ${stage}`)
    }
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+5')
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    await expect(page.getByTestId('nav-cargo')).toHaveAttribute('aria-current', 'page')

    // The second start opens the remembered folder without asking.
    await app.close()
    const again = await launch({ usePreset: false, userData })
    try {
      await expect(again.page.getByTestId('page-bridge')).toBeVisible()
      await expect(again.page.getByTestId('data-dir')).toHaveText(dir)
    } finally {
      await again.app.close()
    }
    expect(errors).toEqual([])
  } finally {
    await app.close().catch(() => undefined)
  }
})

test('ustawienia: nazwa okrętu zapisana w fi.json, zasobnik, paleta i skróty', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await expect(page.getByTestId('settings-tab-general')).toBeVisible()
    const input = page.getByTestId('ship-name-input')
    await input.fill('Sokół')
    await input.press('Enter')
    await expect(page.getByTestId('menu-ship-name')).toHaveText('okręt Sokół')
    await expect.poll(async () => JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8')).settings.shipName).toBe('Sokół')
    const fi = JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8'))
    expect(fi.updatedBy).toBe('E2E-PC')

    // History of the settings: the version before the edit is kept.
    const hist = await fs.readdir(join(dataDir, '.history', 'fi'))
    expect(hist.length).toBe(1)

    await page.getByTestId('settings-tab-folder').click()
    await expect(page.getByTestId('settings-data-dir')).toHaveText(dataDir)
    await page.getByTestId('backup-now').click()
    await expect(page.getByTestId('backup-row').first()).toBeVisible()

    await page.getByTestId('settings-tab-system').click()
    await expect(page.getByTestId('tray-close').getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    await page.getByTestId('tray-close').getByRole('switch').click()
    await expect(page.getByTestId('tray-close').getByRole('switch')).toHaveAttribute('aria-checked', 'false')

    await page.getByTestId('settings-tab-updates').click()
    await expect(page.getByText('Aktualizacje z GitHuba')).toBeVisible()

    // Palette: a screen by name.
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('Ładownia')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('page-cargo')).toBeVisible()

    // Cheat sheet.
    await page.keyboard.press('F1')
    await expect(page.getByTestId('shortcuts')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('shortcuts')).toBeHidden()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('panele: zwijanie, powiększenie, ukrywanie z menu Układ i osobne okno', async () => {
  const { app, page, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const panel = page.locator('section:not([hidden])[data-panel="bridge:Stan okrętu"]')
    await expect(panel).toBeVisible()

    // Collapse by double-clicking the title, back again.
    await panel.getByText('Stan okrętu', { exact: true }).dblclick()
    await expect(panel).toHaveAttribute('data-collapsed', '1')
    await panel.getByText('Stan okrętu', { exact: true }).dblclick()
    await expect(panel).not.toHaveAttribute('data-collapsed', '1')

    // Maximize, Esc back.
    await panel.getByTestId('panel-maximize').click()
    await expect(panel).toHaveAttribute('data-maximized', '1')
    await page.keyboard.press('Escape')
    await expect(panel).not.toHaveAttribute('data-maximized', '1')

    // Hide, then show again from the Układ menu.
    await panel.getByTestId('panel-hide').click()
    await expect(page.locator('section[hidden][data-panel="bridge:Stan okrętu"]')).toHaveCount(1)
    await page.getByTestId('layout-menu').click()
    await page.locator('[data-testid="layout-panel"][data-name="Stan okrętu"]').click()
    await expect(page.locator('section[hidden][data-panel="bridge:Stan okrętu"]')).toHaveCount(0)
    await page.keyboard.press('Escape')

    // Its own window (a second monitor).
    const [win] = await Promise.all([app.waitForEvent('window'), panel.getByTestId('panel-detach').click()])
    await win.waitForLoadState('domcontentloaded')
    await expect(win.getByTestId('detached-title')).toHaveText('Stan okrętu')
    await expect(win.getByTestId('detached-placeholder')).toContainText('etapie E4')
    await expect(panel.getByTestId('panel-detached-note')).toBeVisible()
    await Promise.all([win.waitForEvent('close'), win.getByTestId('detached-attach').click().catch(() => undefined)])
    await expect(panel.getByTestId('panel-detached-note')).toBeHidden()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('folder danych: nigdy w folderze ICTTJ, bez drugiego FinancialIntel w trakcie synchronizacji', async () => {
  const { app, page, userData, errors } = await launch({ usePreset: false })
  try {
    await expect(page.getByTestId('folder-setup')).toBeVisible()
    const base = join(userData, '..')
    const ictj = join(base, 'Dziennik')
    await fs.mkdir(join(ictj, 'trades'), { recursive: true })
    await fs.writeFile(join(ictj, 'journal.json'), '{}')
    const proposal = join(base, 'OneDrive', 'FinancialIntel')
    await fs.mkdir(join(proposal, 'transactions', '2026'), { recursive: true })
    type Open = (dir: string, create: boolean) => Promise<{ ok: boolean; message?: string }>
    const open = (dir: string) => page.evaluate((d) => (globalThis as unknown as { fi: { openDataDir: Open } }).fi.openDataDir(d, true), dir)

    for (const dir of [ictj, join(ictj, 'trades')]) {
      const res = await open(dir)
      expect(res.ok).toBe(false)
      expect(res.message).toContain('ICT Trade Journal')
    }
    expect(await fs.readdir(ictj)).toEqual(['journal.json', 'trades'])

    // OneDrive has the folders but not fi.json yet: no new data (and no FinancialIntel\FinancialIntel).
    await page.getByTestId('setup-default').click()
    await expect(page.getByTestId('setup-message')).toContainText('bez pliku fi.json')
    await expect(page.getByTestId('retry-folder')).toBeVisible()
    await expect(page.getByTestId('create-here')).toHaveCount(0)
    expect(await fs.readdir(proposal)).toEqual(['transactions'])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
