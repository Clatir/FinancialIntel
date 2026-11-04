/** US.26 (X do zasobnika – właściwe okno), IN.10 (tylko do odczytu, kreator), IN.18 (cel ujemny). */
import { test } from '@playwright/test'
import { start, useState } from './lab'
import { configOf, editFi, fiOf, goSettings, restart, run, say, snap, text, toasts, typed } from './us-pomoc'

const mainWindow = `(BrowserWindow) => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && !w.getURL().includes('quick=1') && !w.getURL().includes('detached'))`

test.skip('US.26 zasobnik', async () => {
  const N = 'us-zasobnik2'
  const r = await run(N)
  const { app, page } = r
  try {
    const state = () =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .filter((w) => !w.isDestroyed())
          .map((w) => `${w.getURL().replace(/.*index\.html/, '') || 'main'}: visible=${w.isVisible()}`)
      )
    say('US.26 przed X (włączone)', await state())
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && !w.getURL().includes('quick=1') && !w.getURL().includes('detached'))!.close())
    await page.waitForTimeout(2500)
    say('US.26 po X (włączone)', { okna: await state().catch((e) => 'błąd ' + e.message), exit: app.process().exitCode })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && !w.getURL().includes('quick=1') && !w.getURL().includes('detached'))!.showInactive())
    await page.waitForTimeout(800)
    await goSettings(page, 'system')
    await page.getByTestId('tray-close').click()
    await page.waitForTimeout(800)
    say('US.26 wyłączone – config', configOf(N).tray)
    await goSettings(page, 'general')
    const f = page.getByTestId('ship-name-input')
    await f.click()
    await f.press('Control+a')
    await f.pressSequentially('Zmiana-w-polu')
    const exited = new Promise<string>((res) => app.process().once('exit', (c) => res('proces zakończony, kod ' + c)))
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && !w.getURL().includes('quick=1') && !w.getURL().includes('detached'))!.close()).catch(() => undefined)
    say('US.26 X przy wyłączonym (zmiana w polu)', await Promise.race([exited, new Promise<string>((res) => setTimeout(() => res('proces nadal działa po 20 s'), 20_000))]))
    say('US.26 fi.json shipName po zamknięciu', fiOf(N).settings.shipName)
  } finally {
    await app.close().catch(() => undefined)
  }
  const r2 = await restart(N)
  try {
    await goSettings(r2.page, 'system')
    say('US.26 po ponownym uruchomieniu', { closeToTray: await r2.page.getByTestId('tray-close').isChecked(), config: configOf(N).tray })
  } finally {
    await r2.app.close()
  }
})

test('IN.10 tylko do odczytu i kreator; IN.18 cel ujemny', async () => {
  const N = 'in-ro2'
  const { dataDir, ictjDir } = useState('rok', N)
  editFi(dataDir, (fi) => {
    fi.schemaVersion = 2
  })
  const ro = await start(N, { dataDir, ictjDir })
  try {
    ro.page.setDefaultTimeout(15_000)
    await ro.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await ro.page.waitForTimeout(1500)
    await ro.page.getByTestId('panel-hide').first().click()
    await ro.page.getByTestId('layout-menu').click()
    await ro.page.waitForTimeout(500)
    say('IN.10 tylko do odczytu – menu Układ', await text(ro.page, '[data-testid="layout-menu-body"]'))
    await snap(ro.page, 'IN.10-ro')
  } finally {
    await ro.app.close()
  }
  // the wizard: no „Układ” menu
  const w = await start('in-kreator', { usePreset: false })
  try {
    w.page.setDefaultTimeout(15_000)
    await w.page.getByTestId('setup-default').click()
    await w.page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await w.page.getByTestId('banner-wizard-start').click()
    await w.page.getByTestId('page-wizard').waitFor()
    await w.page.waitForTimeout(600)
    say('IN.10 kreator – menu „Układ”', await w.page.getByTestId('layout-menu').count())
    await snap(w.page, 'IN.10-kreator')
  } finally {
    await w.app.close()
  }
  // negative goal
  const g = await run('in-cel2')
  try {
    await g.page.keyboard.press('Control+6')
    await g.page.waitForTimeout(1200)
    await g.page.getByTestId('starmap-new-name').fill('Cel ujemny')
    await g.page.getByTestId('starmap-new-target').click()
    await g.page.getByTestId('starmap-new-target').fill('-500')
    await g.page.getByTestId('starmap-new-target').press('Tab')
    say('IN.18 pole kwoty nowego celu po −500', await g.page.getByTestId('starmap-new-target').inputValue())
    await g.page.getByRole('button', { name: 'Dodaj cel' }).click()
    await g.page.waitForTimeout(700)
    say('IN.18 po „Dodaj cel” z ujemną kwotą', { toasts: await toasts(g.page), celow: await g.page.getByTestId('starmap-target').count() })
    await snap(g.page, 'IN.18-cel-ujemny')
  } finally {
    await g.app.close()
  }
})
