/** IN.6 (rozmiar – klawisze), IN.4 (tylko do odczytu), IN.5 (powiadomienia przy ukrytych kwotach), IN.8 (dane persony). */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { recorded, start, useState } from './lab'
import { editFi, goSettings, mute, quickWin, run, say, snap, text, toasts } from './us-pomoc'

const whichPage = async (page: Page) => (await page.getByTestId('page-bridge').count() ? 'bridge' : (await page.getByTestId('page-reports').count()) ? 'reports' : '?')

test('IN.6 rozmiar klawiszami', async () => {
  const N = 'in-rozmiar'
  const r = await run(N)
  const { app, page } = r
  try {
    await mute(app)
    const zoom = async () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => Math.round(w.webContents.getZoomFactor() * 100)))
    const q = await quickWin(app, page)
    await q.waitForTimeout(500)
    await page.locator('main').click({ position: { x: 5, y: 5 } }).catch(() => undefined)
    for (const [label, combo] of [['Ctrl++', 'Control++'], ['Ctrl+Shift+=', 'Control+Shift+Equal'], ['Ctrl+=', 'Control+Equal'], ['Ctrl+Num+', 'Control+NumpadAdd']] as const) {
      const before = await zoom()
      try {
        await page.keyboard.press(combo)
      } catch (e) {
        say(`IN.6 ${label}`, 'klawisz niedostępny w Playwright: ' + (e as Error).message.slice(0, 80))
        continue
      }
      await page.waitForTimeout(400)
      say(`IN.6 ${label} jednokrotnie`, { przed: before, po: await zoom() })
    }
    await page.keyboard.press('Control+Shift+0')
    await page.waitForTimeout(400)
    const up: number[] = []
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Control+Shift+Equal')
      await page.waitForTimeout(300)
      up.push((await zoom())[0]!)
    }
    say('IN.6 7× Ctrl++ od 100 % (okno główne)', up)
    say('IN.6 wszystkie okna', await zoom())
    const down: number[] = []
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Control+Minus')
      await page.waitForTimeout(300)
      down.push((await zoom())[0]!)
    }
    say('IN.6 8× Ctrl+−', down)
    say('IN.6 wszystkie okna', await zoom())
    await page.keyboard.press('Control+Shift+Equal')
    await page.keyboard.press('Control+Shift+Equal')
    await page.waitForTimeout(400)
    await page.keyboard.press('Control+Shift+0')
    await page.waitForTimeout(400)
    say('IN.6 Ctrl+Shift+0', await zoom())
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(700)
    say('IN.6 Ctrl+0', { ekran: await whichPage(page), zoom: await zoom() })
    await goSettings(page, 'view')
    await page.keyboard.press('Control+Shift+Equal')
    await page.waitForTimeout(500)
    say('IN.6 suwak w Ustawieniach po Ctrl++', await text(page, '[data-testid="settings-zoom-value"]'))
    // in the quick window
    await q.bringToFront().catch(() => undefined)
    await q.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => undefined)
    await q.keyboard.press('Control+Shift+Equal')
    await q.waitForTimeout(500)
    say('IN.6 Ctrl++ w szybkim wpisie', await zoom())
  } finally {
    await app.close()
  }
})

test('IN.4 / IN.5 / IN.8 uzupełnienia', async () => {
  // IN.4 read-only
  const N = 'in-ro'
  const { dataDir, ictjDir } = useState('rok', N)
  editFi(dataDir, (fi) => {
    fi.schemaVersion = 2
  })
  const r = await start(N, { dataDir, ictjDir })
  r.page.setDefaultTimeout(15_000)
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r.page.waitForTimeout(1800)
    say('IN.4 tylko do odczytu – wskaźnik', await text(r.page, '[data-testid="save-state"]').catch(() => '(brak)'))
    await r.page.keyboard.press('Control+s')
    await r.page.waitForTimeout(700)
    say('IN.4 tylko do odczytu – Ctrl+S', await toasts(r.page))
    await r.page.keyboard.press('Control+k')
    await r.page.getByTestId('palette-input').fill('zapisz')
    await r.page.waitForTimeout(400)
    await r.page.keyboard.press('Enter')
    await r.page.waitForTimeout(700)
    say('IN.4 tylko do odczytu – paleta „Zapisz teraz”', await toasts(r.page))
    await snap(r.page, 'IN.4-ro')
  } finally {
    await r.app.close()
  }
  // IN.5 notifications with hidden amounts from the start
  const N2 = 'in-ukryte-pow'
  const s2 = useState('rok', N2)
  const r2 = await start(N2, { dataDir: s2.dataDir, ictjDir: s2.ictjDir, prefs: { hideAmounts: true } })
  r2.page.setDefaultTimeout(15_000)
  try {
    await r2.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r2.page.waitForTimeout(14_000)
    say('IN.5 powiadomienia przy ukrytych kwotach', (await recorded(r2.app)).toasts.map((t) => `${t.title}: ${t.body}`))
    await r2.page.keyboard.press('Control+k')
    await r2.page.getByTestId('palette-input').fill('1240')
    await r2.page.waitForTimeout(600)
    say('IN.5 paleta po kwocie przy ukrytych', await r2.page.getByRole('option').allInnerTexts())
    await r2.page.keyboard.press('Escape')
    // conflict / sync window with amounts hidden is another point (DA)
  } finally {
    await r2.app.close()
  }
  // IN.8 with data of „rok”
  const r3 = await run('in-paleta2')
  try {
    const q = async (s: string) => {
      await r3.page.keyboard.press('Control+k')
      await r3.page.getByTestId('palette-input').fill(s)
      await r3.page.waitForTimeout(700)
      const o = (await r3.page.getByRole('option').allInnerTexts()).map((x) => x.replace(/\n/g, ' · '))
      const groups = await r3.page.locator('[data-testid="palette"] [class*="label"], [data-testid="palette"] h2, [data-testid="palette"] [role="group"]').allInnerTexts().catch(() => [])
      await r3.page.keyboard.press('Escape')
      return { n: o.length, grupy: groups, wyniki: o.slice(0, 14) }
    }
    for (const s of ['mokka', '12,00', '1240', 'czynsz', 'rowerowy', 'netflix', 'Rata – rodzice', 'Marek', 'anna']) say(`IN.8 „${s}”`, await q(s))
    await r3.page.keyboard.press('Control+k')
    await r3.page.getByTestId('palette-input').fill('mokka')
    await r3.page.waitForTimeout(500)
    await r3.page.keyboard.press('Enter')
    await r3.page.waitForTimeout(500)
    await snap(r3.page, 'IN.8-mokka-0.5s')
    await r3.page.waitForTimeout(2500)
    await snap(r3.page, 'IN.8-mokka-3s')
    say('IN.8 po Enter „mokka”', { rozwinieta: await r3.page.getByTestId('operation-editor').count(), tekst: (await text(r3.page, '[data-testid="operation-editor"]').catch(() => '')).slice(0, 120).replace(/\n/g, ' | ') })
    // highlighted element: any with a transient accent ring
    const hl = await r3.page.evaluate(() => [...document.querySelectorAll('[data-focus], [data-highlight], [class*="ring"], [class*="focus-flash"], [class*="pulse"]')].map((e) => (e.className + '').slice(0, 80)).slice(0, 5))
    say('IN.8 element wyróżniony', hl)
  } finally {
    await r3.app.close()
  }
})
