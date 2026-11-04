/** US.16, US.18, US.20, US.23, US.24, US.26 – ustawienia tego komputera (config.json). Sounds always muted. */
import { test, type Page } from '@playwright/test'
import { recorded, start, useState } from './lab'
import { configOf, dataDirOf, fiOf, goSettings, mute, quickWin, restart, run, say, snap, text, toasts, userDataOf } from './us-pomoc'

const NOTIFY_ALL_OFF = Object.fromEntries(['briefing', 'evening', 'low', 'overrun', 'asteroid', 'cargo', 'importOverdue', 'balances', 'debriefing', 'ictj', 'loans', 'pit38', 'house', 'plans', 'accounts', 'cargoWatch', 'anomalies', 'returns', 'watch'].map((k) => [k, false]))

async function bigExpense(app: any, page: Page): Promise<void> {
  const q = await quickWin(app, page)
  await q.getByTestId('quick-amount').fill('5000')
  await q.getByTestId('quick-amount').press('Tab')
  await q.getByTestId('quick-time').fill('12:00')
  await q.getByTestId('quick-time').press('Tab')
  await q.getByTestId('quick-save').click()
  await q.waitForTimeout(800)
  await q.keyboard.press('Escape').catch(() => undefined)
}

const titles = async (app: any): Promise<string[]> => (await recorded(app)).toasts.map((t) => `${t.title}: ${t.body}`)

test('US.16 powiadomienia', async () => {
  for (const [label, notify] of [['A: wszystkie włączone', undefined], ['B: bez przekroczeń', { overrun: false, low: false }], ['C: wszystkie wyłączone', NOTIFY_ALL_OFF]] as const) {
    const N = 'us-pow-' + label[0]!.toLowerCase()
    const { dataDir, ictjDir } = useState('rok', N)
    const r = await start(N, { dataDir, ictjDir, prefs: notify ? { notify } : undefined })
    const { app, page } = r
    page.setDefaultTimeout(15_000)
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
      await page.waitForTimeout(14_000)
      const base = await titles(app)
      say(`US.16 ${label} – próby po starcie`, base)
      await bigExpense(app, page)
      await page.waitForTimeout(12_000)
      const after = await titles(app)
      say(`US.16 ${label} – po wydatku 5000 zł`, { nowe: after.slice(base.length), wszystkie: after.length })
      if (label.startsWith('A')) {
        await goSettings(page, 'notify')
        const keys = await page.locator('[data-testid^="notify-"]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-testid'), (e as HTMLInputElement).checked ?? e.getAttribute('aria-checked'), (e.closest('label')?.innerText ?? '').slice(0, 60)]))
        say('US.16 przełączniki', keys)
        await page.getByTestId('notify-overrun').click()
        await page.waitForTimeout(600)
        say('US.16 po wyłączeniu overrun', { config: configOf(N).prefs.notify.overrun, fiNotify: JSON.stringify(fiOf(N)).includes('"overrun"') })
        await snap(page, 'US.16')
      }
    } finally {
      await app.close()
    }
  }
})

test('US.18 dźwięki', async () => {
  const N = 'us-dzwieki'
  const r = await run(N)
  const { app, page } = r
  try {
    await mute(app)
    await goSettings(page, 'notify')
    say('US.18 stan początkowy', configOf(N).prefs.sounds)
    const vol = page.getByTestId('sounds-volume')
    await vol.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(700)
    say('US.18 głośność po 2× strzałka', { ui: await text(page, 'main').then((t) => /\d+%/.exec(t.slice(t.indexOf('DŹWIĘKI')))?.[0]), config: configOf(N).prefs.sounds.volume })
    // alarm off
    await page.getByText('Alarm', { exact: true }).click()
    await page.waitForTimeout(500)
    say('US.18 alarm wyłączony', configOf(N).prefs.sounds.events)
    await page.getByText('▶').nth(1).click()
    await page.waitForTimeout(400)
    await page.getByTestId('sounds-enabled').click()
    await page.waitForTimeout(500)
    say('US.18 „Dźwięki zdarzeń” przełączone', configOf(N).prefs.sounds)
    await page.getByTestId('sounds-enabled').click()
    await page.waitForTimeout(500)
    say('US.18 „Dźwięki zdarzeń” z powrotem', configOf(N).prefs.sounds)
    await snap(page, 'US.18')
  } finally {
    await app.close()
  }
  const r2 = await restart(N)
  try {
    await goSettings(r2.page, 'notify')
    say('US.18 po ponownym uruchomieniu', { config: configOf(N).prefs.sounds, ui: (await text(r2.page, 'main')).slice((await text(r2.page, 'main')).indexOf('DŹWIĘKI')) })
  } finally {
    await r2.app.close()
  }
  const l = await start('us-dzwieki-laptop', { dataDir: dataDirOf(N), machine: 'LAPTOP' })
  try {
    await l.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    say('US.18 LAPTOP (config)', configOf('us-dzwieki-laptop').prefs.sounds)
  } finally {
    await l.app.close()
  }
})

test('US.20 skrót', async () => {
  const N = 'us-skrot'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'notify')
    const f = page.getByTestId('settings-shortcut')
    say('US.20 początek', await f.innerText())
    const press = async (label: string, combo: string) => {
      await f.click()
      await page.keyboard.press(combo)
      await page.waitForTimeout(500)
      say(`US.20 ${label}`, { pole: await f.innerText(), toasts: await toasts(page), config: configOf(N).prefs.quickShortcut, stan: await text(page, '[data-testid="settings-shortcut-state"]').catch(() => '(brak)') })
    }
    await press('Ctrl+Alt+S', 'Control+Alt+S')
    await page.keyboard.press('Escape')
    await press('Ctrl+Alt+Shift+S', 'Control+Alt+Shift+S')
    await page.keyboard.press('Escape')
    await press('Ctrl+Alt+U', 'Control+Alt+U')
    await page.keyboard.press('Escape')
    await press('sam B', 'b')
    await page.keyboard.press('Escape')
    await press('Ctrl+Shift+F9', 'Control+Shift+F9')
    say('US.20 zarejestrowane (zapis)', (await recorded(app)).shortcuts)
    await snap(page, 'US.20-F9')
    await press('F1 w trakcie nasłuchu', 'F1')
    say('US.20 ściągawka po F1 w polu?', { shortcuts: await page.getByTestId('shortcuts').count() })
    await page.keyboard.press('Escape')
    // Esc cancels
    await f.click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('US.20 Esc w nasłuchu', { pole: await f.innerText(), config: configOf(N).prefs.quickShortcut, settings: await page.getByTestId('settings-tab-notify').count() })
    // set a good one, then F1
    await press('Ctrl+Alt+B', 'Control+Alt+B')
    await page.getByTestId('settings-tab-view').click()
    await page.keyboard.press('F1')
    await page.getByTestId('shortcuts').waitFor()
    say('US.20 ściągawka z Ctrl+Alt+B', (await text(page, '[data-testid="shortcuts"]')).split('\n').filter((l) => /szybki wpis|Ctrl\+Alt|brak skrótu|Alt/i.test(l)))
    await page.keyboard.press('Escape')
    await goSettings(page, 'notify')
    await f.click()
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(500)
    say('US.20 Backspace', { pole: await f.innerText(), config: configOf(N).prefs.quickShortcut })
    await page.keyboard.press('F1')
    await page.getByTestId('shortcuts').waitFor()
    say('US.20 ściągawka bez skrótu', (await text(page, '[data-testid="shortcuts"]')).split('\n').filter((l) => /szybki wpis|brak skrótu|skrót/i.test(l)))
    await snap(page, 'US.20-sciagawka')
  } finally {
    await app.close()
  }
})

test('US.23 rozmiar i kontrast', async () => {
  const N = 'us-rozmiar'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'view')
    const zoomOf = async () =>
      app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => [w.webContents.getURL().replace(/.*\/(?=[^/]*$)/, '').slice(0, 30), Math.round(w.webContents.getZoomFactor() * 100) / 100]))
    say('US.23 domyślnie', { zoom: await zoomOf(), config: configOf(N).prefs.zoom, contrast: configOf(N).prefs.highContrast })
    const quick = await quickWin(app, page)
    await page.keyboard.press('Control+1')
    await page.getByTestId('page-bridge').waitFor()
    const detach = page.getByTitle('Otwórz w osobnym oknie (pełny ekran)').first()
    await detach.click().catch(() => undefined)
    await page.waitForTimeout(1500)
    await goSettings(page, 'view')
    const sl = page.getByTestId('settings-zoom')
    await sl.focus()
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(800)
    say('US.23 suwak +60 % (150)', { wartosc: await text(page, '[data-testid="settings-zoom-value"]'), zoom: await zoomOf(), config: configOf(N).prefs.zoom, okna: app.windows().length })
    await snap(page, 'US.23-150')
    for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(800)
    say('US.23 suwak do minimum (90)', { wartosc: await text(page, '[data-testid="settings-zoom-value"]'), zoom: await zoomOf(), config: configOf(N).prefs.zoom })
    await page.getByTestId('settings-zoom-reset').click()
    await page.waitForTimeout(600)
    say('US.23 „100 %”', { wartosc: await text(page, '[data-testid="settings-zoom-value"]'), zoom: await zoomOf(), config: configOf(N).prefs.zoom })
    await quick.close().catch(() => undefined)
    // contrast
    const measure = async (tag: string) => {
      const m = await page.evaluate(() => {
        const lum = (c: string) => {
          const v = c.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
          return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!
        }
        const root = getComputedStyle(document.documentElement)
        const panel = root.getPropertyValue('--color-panel').trim()
        const out: Record<string, unknown> = { muted: root.getPropertyValue('--color-muted').trim(), dim: root.getPropertyValue('--color-dim').trim(), panel }
        const hex = (h: string) => { const n = parseInt(h.replace('#', ''), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})` }
        const ratio = (a: string, b: string) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05) }
        out.mutedOnPanel = ratio(hex(root.getPropertyValue('--color-muted').trim()), hex(panel)).toFixed(2)
        out.dimOnPanel = ratio(hex(root.getPropertyValue('--color-dim').trim()), hex(panel)).toFixed(2)
        let min = 99
        const sizes = new Map<number, number>()
        for (const el of document.querySelectorAll('body *')) {
          if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue
          const fs = parseFloat(getComputedStyle(el).fontSize)
          sizes.set(fs, (sizes.get(fs) ?? 0) + 1)
          min = Math.min(min, fs)
        }
        out.minFont = min
        out.sizes = [...sizes.entries()].sort((a, b) => a[0] - b[0]).slice(0, 5)
        return out
      })
      say('US.23 kontrast ' + tag, m)
    }
    await measure('wyłączony')
    await page.getByTestId('settings-contrast').click()
    await page.waitForTimeout(600)
    await measure('włączony')
    await snap(page, 'US.23-kontrast')
    say('US.23 config po kontraście', configOf(N).prefs)
  } finally {
    await app.close()
  }
  const r2 = await restart(N)
  try {
    await goSettings(r2.page, 'view')
    say('US.23 po ponownym uruchomieniu', { config: configOf(N).prefs, kontrast: await r2.page.getByTestId('settings-contrast').isChecked().catch(() => '?') })
  } finally {
    await r2.app.close()
  }
  for (const z of [1.23, 3, 0.2, 'abc']) {
    const NZ = `us-rozmiar-${String(z).replace('.', '_')}`
    const { dataDir, ictjDir } = useState('rok', NZ)
    const rz = await start(NZ, { dataDir, ictjDir, prefs: { zoom: z } })
    try {
      rz.page.setDefaultTimeout(15_000)
      await rz.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
      await rz.page.waitForTimeout(1200)
      await goSettings(rz.page, 'view')
      say(`US.23 config zoom=${z}`, { ui: await text(rz.page, '[data-testid="settings-zoom-value"]'), okno: await rz.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.webContents.getZoomFactor()), config: configOf(NZ).prefs.zoom })
    } finally {
      await rz.app.close()
    }
  }
})
