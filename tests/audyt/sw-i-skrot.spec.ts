/**
 * SW.3 – a shortcut with a Polish letter (AltGr) refused, in Ustawienia → Powiadomienia i dźwięki and in the wizard's
 * step 7. The lab never registers a global shortcut on this computer: globalShortcut is replaced in the main process
 * (recorded, reported as registered) before any shortcut is set. The variant „config.json with Ctrl+Alt+A” is not run –
 * its start would register Ctrl+Alt+B for real.
 */
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { start, text } from './lab'
import { log, openRok, snap } from './sw-pomoc'

async function stubShortcuts(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ globalShortcut }) => {
    const g = globalThis as unknown as { __swShortcuts?: string[] }
    g.__swShortcuts = []
    globalShortcut.register = ((acc: string) => {
      g.__swShortcuts!.push(`register ${acc}`)
      return true
    }) as typeof globalShortcut.register
    globalShortcut.unregister = ((acc: string) => {
      g.__swShortcuts!.push(`unregister ${acc}`)
    }) as typeof globalShortcut.unregister
  })
}

async function tryKeys(page: Page, field: string, run: string, label: string): Promise<void> {
  for (const k of ['Control+Alt+KeyS', 'Control+Alt+Shift+KeyE', 'Control+Alt+KeyK']) {
    await page.getByTestId(field).click()
    await page.waitForTimeout(150)
    await page.keyboard.press(k)
    await page.waitForTimeout(500)
    const toasts = await page.getByRole('status').allInnerTexts().catch(() => [] as string[])
    log(run, `SW.3 ${label} ${k}`, '| pole', await page.getByTestId(field).innerText(), '| komunikaty', toasts.join(' || '))
    if (k === 'Control+Alt+KeyS') await snap(page, `SW.3-${label}-ctrl-alt-s`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }
}

test('SW.3 Ustawienia', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'sw-i'
  const { app, page, userData } = await openRok(run)
  try {
    await stubShortcuts(app)
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-notify').click()
    await page.waitForTimeout(600)
    await tryKeys(page, 'settings-shortcut', run, 'ustawienia')
    await page.waitForTimeout(800)
    log(run, 'SW.3 stan skrótu', await page.getByTestId('settings-shortcut-state').innerText().catch(() => '(brak)'))
    log(run, 'SW.3 config.json prefs.quickShortcut', JSON.parse(readFileSync(join(userData, 'config.json'), 'utf8')).prefs?.quickShortcut)
    log(run, 'SW.3 rejestracje (podstawione)', await app.evaluate(() => (globalThis as unknown as { __swShortcuts?: string[] }).__swShortcuts))
    await page.keyboard.press('Control+1')
    log(run, 'SW.3 przycisk na Mostku', await page.getByTestId('bridge-quick').innerText())
    await snap(page, 'SW.3-ustawienia')
  } finally {
    // Back to no shortcut before closing (the stub stays until the end).
    await app.close()
  }
})

test('SW.3 kreator krok 7', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'sw-i-kreator'
  const { app, page } = await start(run, { dataDir: join('C:\\FI-audyt\\przebiegi', run, 'nowy-folder') })
  try {
    await stubShortcuts(app)
    await page.waitForTimeout(3000)
    log(run, 'ekran', (await text(page)).replace(/\s+/g, ' ').slice(0, 300))
    if (await page.getByTestId('banner-wizard-start').count()) await page.getByTestId('banner-wizard-start').click()
    await page.getByTestId('page-wizard').waitFor({ timeout: 30_000 })
    for (let i = 0; i < 6 && !(await page.getByTestId('wizard-shortcut').count()); i++) {
      if (await page.getByTestId('wizard-balance').count()) {
        const b = page.getByTestId('wizard-balance')
        for (let j = 0; j < (await b.count()); j++) {
          await b.nth(j).fill('0')
          await b.nth(j).press('Enter')
        }
      }
      await page.getByTestId('wizard-next').click().catch(() => undefined)
      await page.waitForTimeout(500)
    }
    log(run, 'krok 7 – pole skrótu', await page.getByTestId('wizard-shortcut').count())
    if (await page.getByTestId('wizard-shortcut').count()) await tryKeys(page, 'wizard-shortcut', run, 'kreator')
  } finally {
    await app.close()
  }
})
