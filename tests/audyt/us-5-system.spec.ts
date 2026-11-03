/** US.24, US.26 – US.31: ukrycie kwot po bezczynności, zasobnik, folder, aktualizacje, token, trwałość, tylko do odczytu. */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { LAB, answerDialogs, recorded, start, useState } from './lab'
import { configOf, dataDirOf, editFi, fiOf, goSettings, mute, quickWin, restart, run, say, snap, text, toasts, typed, userDataOf } from './us-pomoc'

const IDLE = { FI_SYSTEM_IDLE: '61', FI_IDLE_CHECK_MS: '500', FI_CONFIG_WRITE_DELAY_MS: '200' }

async function stateShields(page: Page): Promise<string> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(500)
  return (await page.getByTestId('state-shields').innerText().catch(() => '(brak)')).replace(/\n/g, ' ')
}

test('US.24 ukrycie kwot', async () => {
  const N = 'us-ukrycie'
  const { dataDir, ictjDir } = useState('rok', N)
  const r = await start(N, { dataDir, ictjDir, env: IDLE, prefs: { hideIdleMin: 1 } })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(2500)
    say('US.24 po starcie (bezczynność 61 s, próg 1 min)', { pasek: await page.getByTestId('amounts-hidden').count(), tarcze: await stateShields(page), config: configOf(N).prefs.hideAmounts })
    say('US.24 pasek', await page.getByTestId('amounts-hidden').innerText())
    await snap(page, 'US.24-ukryte')
    // every screen masked?
    const leaks: string[] = []
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      await page.keyboard.press('Control+' + k)
      await page.waitForTimeout(900)
      const t = await text(page, 'main')
      const m = t.match(/\d[\d  ]*,\d{2}\s?zł/g) ?? []
      if (m.length) leaks.push(`Ctrl+${k}: ${m.slice(0, 4).join(' | ')} (${m.length})`)
    }
    say('US.24 kwoty widoczne mimo ukrycia (Ctrl+1…0)', leaks.length ? leaks : '(żadnej)')
    const q = await quickWin(app, page)
    await q.getByTestId('quick-amount').fill('12')
    await q.getByTestId('quick-amount').press('Tab')
    await q.waitForTimeout(500)
    say('US.24 szybki wpis', (await text(q, 'body')).split('\n').filter((l) => /zł|•••/.test(l)).slice(0, 6))
    await q.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.getByTestId('reveal-5').click()
    await page.waitForTimeout(1500)
    say('US.24 „Pokaż na 5 min” po 1,5 s', { pasek: await page.getByTestId('amounts-hidden').count(), tarcze: await stateShields(page) })
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(800)
    say('US.24 Ctrl+$ po pokazaniu', { pasek: await page.getByTestId('amounts-hidden').count() })
    await page.getByTestId('reveal-session').click()
    await page.waitForTimeout(4000)
    say('US.24 „do końca sesji” po 4 s', { pasek: await page.getByTestId('amounts-hidden').count(), tarcze: await stateShields(page) })
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(500)
    say('US.24 Ctrl+$ ukrywa', { pasek: await page.getByTestId('amounts-hidden').count() })
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(500)
    say('US.24 Ctrl+$ pokazuje', { pasek: await page.getByTestId('amounts-hidden').count(), toasts: await toasts(page) })
    await goSettings(page, 'view')
    await page.getByTestId('settings-hide-start').click()
    await page.waitForTimeout(600)
    say('US.24 config', configOf(N).prefs)
  } finally {
    await app.close()
  }
  const r2 = await start(N, { dataDir, ictjDir, fresh: false, prefs: { hideIdleMin: 7 } })
  try {
    r2.page.setDefaultTimeout(15_000)
    await r2.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r2.page.waitForTimeout(1500)
    say('US.24 start z ukrytymi kwotami (hideOnStart)', { pasek: await r2.page.getByTestId('amounts-hidden').count(), tarcze: await stateShields(r2.page) })
    await goSettings(r2.page, 'view')
    say('US.24 hideIdleMin 7', { wybrane: await r2.page.getByTestId('settings-hide-idle').inputValue(), opcje: await r2.page.getByTestId('settings-hide-idle').locator('option').allInnerTexts() })
    say('US.24 zasobnik (zapis prób powiadomień)', (await recorded(r2.app)).toasts.map((t) => t.body))
  } finally {
    await r2.app.close()
  }
})

test('US.24b pokaż na 5 min (czeka 5 min)', async () => {
  const N = 'us-ukrycie5'
  const { dataDir, ictjDir } = useState('rok', N)
  const r = await start(N, { dataDir, ictjDir, env: IDLE, prefs: { hideIdleMin: 1 } })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(2500)
    await page.getByTestId('reveal-5').click()
    const t0 = Date.now()
    for (const at of [60, 240, 290, 305, 330]) {
      await page.waitForTimeout(Math.max(0, at * 1000 - (Date.now() - t0)))
      say(`US.24b po ${at} s`, { pasek: await page.getByTestId('amounts-hidden').count() })
    }
  } finally {
    await app.close()
  }
})

test('US.26 zasobnik', async () => {
  const N = 'us-zasobnik'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'system')
    say('US.26 domyślnie', { closeToTray: await page.getByTestId('tray-close').isChecked().catch(() => '?'), config: configOf(N).tray })
    await page.getByTestId('settings-tab-general').click()
    const visible = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed()).map((w) => w.isVisible()))
    say('US.26 przed X', await visible())
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close())
    await page.waitForTimeout(2000)
    say('US.26 po X (włączone) – okna widoczne? proces żyje?', { widoczne: await visible().catch((e) => 'błąd: ' + e.message), exit: app.process().exitCode })
    // show again
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.showInactive())
    await page.waitForTimeout(500)
    await goSettings(page, 'system')
    await page.getByTestId('tray-close').click()
    await page.waitForTimeout(600)
    say('US.26 wyłączone', configOf(N).tray)
    await goSettings(page, 'general')
    const f = page.getByTestId('ship-name-input')
    await f.click()
    await f.press('Control+a')
    await f.pressSequentially('Zmiana-w-polu')
    const closed = new Promise<string>((res) => app.process().once('exit', (c) => res('proces zakończony, kod ' + c)))
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close()).catch(() => undefined)
    const wynik = await Promise.race([closed, new Promise<string>((res) => setTimeout(() => res('proces nadal działa po 15 s'), 15_000))])
    say('US.26 X przy wyłączonym (ze zmianą w polu)', wynik)
    say('US.26 fi.json shipName po zamknięciu', fiOf(N).settings.shipName)
    say('US.26 tray w config', configOf(N).tray)
  } finally {
    await app.close().catch(() => undefined)
  }
  const r2 = await restart(N).catch((e) => ({ error: String(e) }))
  if ('app' in r2) {
    try {
      await goSettings(r2.page, 'system')
      say('US.26 po ponownym uruchomieniu', { closeToTray: await r2.page.getByTestId('tray-close').isChecked().catch(() => '?'), config: configOf(N).tray })
    } finally {
      await r2.app.close()
    }
  }
})

test('US.27 folder i kopie / US.28 aktualizacje / US.29 token', async () => {
  const N = 'us-folder'
  const { dataDir, ictjDir } = useState('rok', N)
  const r = await start(N, { dataDir, ictjDir, machine: 'DOM-PC', env: { FI_UPDATE_URL: 'http://127.0.0.1:9/nic' } })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(1500)
    await goSettings(page, 'folder')
    say('US.27 odczyt', { dir: await text(page, '[data-testid="settings-data-dir"]'), wersja: await text(page, '[data-testid="app-version"]'), main: (await text(page, 'main')).split('\n').filter((l) => /Format|Ten komputer|Wczytanie|DOM-PC|v1/.test(l)) })
    await page.getByRole('button', { name: /Pokaż w Eksploratorze/ }).click()
    await page.getByRole('button', { name: /Przeskanuj/ }).click()
    await page.waitForTimeout(800)
    say('US.27 Eksplorator + Przeskanuj', { toasts: await toasts(page), opened: (await recorded(app)).opened })
    const zip = join(LAB, 'przebiegi', N, 'eksport.zip')
    rmSync(zip, { force: true })
    await app.evaluate(({ dialog }, out) => {
      ;(globalThis as any).__saveOpts = null
      dialog.showSaveDialog = (async (...a: any[]) => {
        ;(globalThis as any).__saveOpts = a[a.length - 1]
        return { canceled: false, filePath: out }
      }) as any
    }, zip)
    await page.getByTestId('export-zip').click()
    await page.waitForTimeout(6000)
    say('US.27 eksport – proponowana nazwa', await app.evaluate(() => (globalThis as any).__saveOpts))
    say('US.27 eksport – toasty', await toasts(page))
    if (existsSync(zip)) {
      const list = execFileSync('tar', ['-tf', zip], { encoding: 'utf8', maxBuffer: 1 << 26 }).split(/\r?\n/)
      say('US.27 ZIP', { rozmiar: statSync(zip).size, pliki: list.length, historia: list.filter((l) => l.includes('.history')).length, fi: list.filter((l) => /fi\.json$/.test(l)), backups: list.filter((l) => l.startsWith('backups')).length })
    } else say('US.27 ZIP', '(plik nie powstał)')
    await page.getByTestId('backup-now').click()
    await page.waitForTimeout(3000)
    say('US.27 Kopia teraz', { toasts: await toasts(page), wiersze: await page.getByTestId('backup-row').allInnerTexts() })
    await snap(page, 'US.27')

    // --- US.28
    await goSettings(page, 'updates')
    say('US.28 zakładka', await text(page, 'main'))
    await page.getByTestId('check-updates').click()
    await page.waitForTimeout(4000)
    say('US.28 po „Sprawdź teraz”', { status: await text(page, '[data-testid="update-status"]'), toasts: await toasts(page) })
    await snap(page, 'US.28')
    await page.getByTestId('toggle-auto-check').click()
    await page.getByTestId('toggle-auto-download').click()
    await page.waitForTimeout(600)
    say('US.28 przełączniki', configOf(N).updates.prefs)

    // --- US.29
    const tok = 'github_pat_TESTFIKCYJNY_0123456789abcdef'
    await page.getByTestId('update-token-input').fill(tok)
    await page.getByTestId('update-token-save').click()
    await page.waitForTimeout(4000)
    say('US.29 po „Zapisz i sprawdź”', { panel: await text(page, '[data-testid="update-token-panel"]'), toasts: await toasts(page) })
    await snap(page, 'US.29')
    const grep = (dir: string): string[] => {
      const hits: string[] = []
      const walk = (d: string): void => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, e.name)
          if (e.isDirectory()) {
            if (/Cache|GPU|Code Cache|Crashpad|blob_storage|Local Storage|Session Storage|Network|Partitions/i.test(e.name)) continue
            walk(p)
          } else {
            try {
              if (statSync(p).size < 20_000_000 && readFileSync(p).includes('TESTFIKCYJNY')) hits.push(p)
            } catch {
              /* locked */
            }
          }
        }
      }
      walk(dir)
      return hits
    }
    say('US.29 jawny token w config/userdata', grep(userDataOf(N)))
    say('US.29 jawny token w folderze danych', grep(dataDir))
    say('US.29 config.updates', configOf(N).updates)
    await page.getByTestId('update-token-remove').click()
    await page.waitForTimeout(800)
    say('US.29 po „Usuń token”', { panel: await text(page, '[data-testid="update-token-panel"]'), config: configOf(N).updates })
  } finally {
    await app.close()
  }
  const r2 = await start(N, { dataDir, ictjDir, fresh: false, machine: 'DOM-PC', env: { FI_UPDATE_URL: 'http://127.0.0.1:9/nic' } })
  try {
    r2.page.setDefaultTimeout(15_000)
    await r2.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await goSettings(r2.page, 'updates')
    say('US.28 po ponownym uruchomieniu', { auto: await r2.page.getByTestId('toggle-auto-check').isChecked().catch(() => '?'), dl: await r2.page.getByTestId('toggle-auto-download').isChecked().catch(() => '?'), config: configOf(N).updates.prefs })
  } finally {
    await r2.app.close()
  }
})

test('US.31 tylko do odczytu', async () => {
  const N = 'us-ro'
  const { dataDir, ictjDir } = useState('rok', N)
  editFi(dataDir, (fi) => {
    fi.schemaVersion = 2
  })
  const r = await start(N, { dataDir, ictjDir })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(2000)
    for (const tab of ['general', 'accounts', 'categories', 'layers', 'household', 'import', 'ictj', 'notify', 'view', 'folder', 'system', 'updates']) {
      await goSettings(page, tab)
      const info = await page.evaluate(() => {
        const els = [...document.querySelectorAll('main input, main select, main button')] as HTMLInputElement[]
        return { total: els.length, disabled: els.filter((e) => e.disabled || e.closest('fieldset:disabled')).length }
      })
      say(`US.31 ${tab}`, { baner: await text(page, '[data-testid="settings-read-only"]').catch(() => '(brak)'), ...info })
    }
    await goSettings(page, 'general')
    await snap(page, 'US.31')
    const f = page.getByTestId('ship-name-input')
    say('US.31 pole nazwy wyłączone?', await f.isDisabled())
    await goSettings(page, 'view')
    await page.getByTestId('settings-contrast').click()
    await page.waitForTimeout(500)
    say('US.31 ustawienie komputera (kontrast)', configOf(N).prefs.highContrast)
    await goSettings(page, 'notify')
    await page.getByTestId('notify-briefing').click()
    await page.waitForTimeout(500)
    say('US.31 ustawienie komputera (odprawa)', configOf(N).prefs.notify.briefing)
    say('US.31 wskaźnik zapisu', await text(page, '[data-testid="save-state"]').catch(() => '(brak)'))
  } finally {
    await app.close()
  }
})
