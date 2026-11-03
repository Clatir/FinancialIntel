/** US.33 (b) – config.json zablokowany na wyłączność w trakcie pracy; US.16 – przekroczenie przy wyłączonym przełączniku (czeka 90 s). */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { recorded, start, useState } from './lab'
import { configOf, goSettings, quickWin, say, userDataOf } from './us-pomoc'

test('US.33b plik zablokowany w trakcie pracy', async () => {
  const N = 'us-config-b'
  const { dataDir, ictjDir } = useState('rok', N)
  const r = await start(N, { dataDir, ictjDir, env: { FI_CONFIG_RETRY_MS: '2000' } })
  r.page.setDefaultTimeout(15_000)
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r.page.waitForTimeout(1500)
    const cfg = join(userDataOf(N), 'config.json')
    const before = readFileSync(cfg, 'utf8')
    const ps = spawn('powershell', ['-NoProfile', '-Command', `$f=[IO.File]::Open('${cfg}','Open','Read','None'); Start-Sleep 30; $f.Close()`], { stdio: 'ignore' })
    await r.page.waitForTimeout(2500)
    await goSettings(r.page, 'view')
    const sl = r.page.getByTestId('settings-zoom')
    await sl.focus()
    await r.page.keyboard.press('ArrowRight')
    await r.page.keyboard.press('ArrowRight')
    await r.page.waitForTimeout(4000)
    say('US.33b w czasie blokady – okno', { suwak: await r.page.getByTestId('settings-zoom-value').innerText(), zoom: await r.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.getZoomFactor()) })
    await new Promise((res) => ps.once('exit', res))
    say('US.33b po zwolnieniu – natychmiast', JSON.parse(readFileSync(cfg, 'utf8')).prefs.zoom)
    await r.page.waitForTimeout(35_000)
    const after = JSON.parse(readFileSync(cfg, 'utf8'))
    say('US.33b po 35 s od zwolnienia', { zoom: after.prefs.zoom, dataDir: after.dataDir, tray: after.tray, rozmiarPrzed: before.length, rozmiarPo: JSON.stringify(after).length })
    say('US.33b log', readFileSync(join(userDataOf(N), 'logs', 'main.log'), 'utf8').split('\n').filter((l) => /config/i.test(l)).slice(-6))
  } finally {
    await r.app.close()
  }
})

test('US.16 przekroczenie przy wyłączonym przełączniku', async () => {
  const N = 'us-pow3'
  const { dataDir, ictjDir } = useState('rok', N)
  const r = await start(N, { dataDir, ictjDir, prefs: { notify: { overrun: false, low: false } } })
  r.page.setDefaultTimeout(15_000)
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r.page.waitForTimeout(12_000)
    const base = (await recorded(r.app)).toasts.length
    const q = await quickWin(r.app, r.page)
    await q.getByTestId('quick-amount').fill('5000')
    await q.getByTestId('quick-amount').press('Tab')
    await q.getByTestId('quick-time').fill('12:00')
    await q.getByTestId('quick-time').press('Tab')
    await q.getByTestId('quick-save').click()
    await q.waitForTimeout(1500)
    await q.keyboard.press('Escape').catch(() => undefined)
    await r.page.waitForTimeout(100_000)
    say('US.16 przy wyłączonych overrun/low – nowe próby po 100 s', (await recorded(r.app)).toasts.slice(base).map((t) => `${t.title}: ${t.body}`))
  } finally {
    await r.app.close()
  }
})
