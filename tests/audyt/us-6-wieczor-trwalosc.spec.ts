/** US.17 (wieczorne dopisanie, czeka), US.30 (trwałość i podział komputer / folder), US.33 (config.json uszkodzony / zablokowany). */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, answerDialogs, recorded, start, useState } from './lab'
import { configOf, dataDirOf, fiOf, goSettings, mute, restart, run, say, snap, text, toasts, typed, userDataOf } from './us-pomoc'

const hhmm = (d: Date) => new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)

test('US.17 wieczorne dopisanie', async () => {
  const N = 'us-wieczor'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'notify')
    const target = new Date(Date.now() + 2 * 60_000)
    const at = hhmm(target)
    say('US.17 ustawiam godzinę', at)
    await typed(page, page.getByTestId('notify-evening-time'), at)
    say('US.17 config', configOf(N).prefs.notify.eveningTime)
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(500)
    const before = (await recorded(app)).toasts.length
    const t0 = Date.now()
    let got: string[] = []
    while (Date.now() - t0 < 200_000) {
      await page.waitForTimeout(5000)
      got = (await recorded(app)).toasts.slice(before).map((t) => `${t.at.slice(11, 19)} ${t.title}: ${t.body}`)
      if (got.length) break
    }
    say('US.17 próba o godzinie', { czas: hhmm(new Date()), got })
    say('US.17 pasek w Operacjach', await text(page, '[data-testid="evening-report"]').catch(() => '(brak paska)'))
    await snap(page, 'US.17-pasek')
    // after „Dziś bez wydatków” no new reminder
    await page.getByTestId('evening-nospend').click().catch(() => undefined)
    await page.waitForTimeout(800)
    say('US.17 po „Dziś bez wydatków”', await text(page, '[data-testid="evening-closed"], [data-testid="evening-report"]').catch(() => '(brak)'))
    await goSettings(page, 'notify')
    const at2 = hhmm(new Date(Date.now() + 2 * 60_000))
    await typed(page, page.getByTestId('notify-evening-time'), at2)
    const before2 = (await recorded(app)).toasts.length
    await page.waitForTimeout(170_000)
    say('US.17 po ponownym ustawieniu na teraz+2 (potwierdzony dzień)', { czas: hhmm(new Date()), nowe: (await recorded(app)).toasts.slice(before2).map((t) => `${t.title}: ${t.body}`) })
  } finally {
    await app.close()
  }
})

test('US.30 trwałość i podział', async () => {
  const N = 'us-trwalosc'
  const { dataDir, ictjDir } = useState('rok', N)
  const r = await start(N, { dataDir, ictjDir, machine: 'DOM-PC' })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(1500)
    await mute(app)
    // folder (fi.json)
    await goSettings(page, 'general')
    await typed(page, 'ship-name-input', 'Trwały')
    await goSettings(page, 'accounts')
    await typed(page, page.getByTestId('account-name').nth(2), 'Kieszonkowe')
    await goSettings(page, 'categories')
    await typed(page, page.locator('[data-testid="category-row"][data-name="Auto"]').getByTestId('category-name'), 'Auto i serwis')
    await goSettings(page, 'layers')
    await typed(page, 'layers-hull', '7')
    await goSettings(page, 'household')
    await typed(page, page.locator('[data-testid="member-row"][data-name="Kasia"]').getByTestId('member-name'), 'Kasia K')
    await goSettings(page, 'import')
    await typed(page, 'own-name-input', 'JAN TESTOWY', 'Enter')
    await page.getByTestId('own-name-add').click()
    // machine (config.json)
    await goSettings(page, 'notify')
    await page.getByTestId('notify-briefing').click()
    await typed(page, 'notify-evening-time', '20:30')
    await page.getByText('Awans', { exact: true }).click()
    await goSettings(page, 'view')
    await page.getByTestId('settings-zoom').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)
    await page.getByTestId('settings-hide-idle').selectOption('15')
    await page.getByTestId('settings-contrast').click()
    await goSettings(page, 'system')
    await page.getByTestId('tray-close').click()
    await goSettings(page, 'updates')
    await page.getByTestId('toggle-auto-check').click()
    await goSettings(page, 'import')
    await page.getByTestId('settings-bank-files').click()
    await goSettings(page, 'folder')
    const backupDir = join(LAB, 'przebiegi', N, 'kopie-lokalne')
    await answerDialogs(app, { paths: [backupDir] })
    await page.getByRole('button', { name: /Zmień folder kopii/ }).click()
    await page.waitForTimeout(1500)
    await page.waitForTimeout(1500)
    say('US.30 config DOM-PC przed zamknięciem', configOf(N))
    await snap(page, 'US.30-dom')
  } finally {
    await app.close()
  }
  say('US.30 fi.json (ustawienia folderu)', { shipName: fiOf(N).settings.shipName, konta: fiOf(N).settings.accounts.map((a: any) => a.name), hull: fiOf(N).settings.layers.hullMonths, member: fiOf(N).settings.household.members.map((m: any) => m.name), own: fiOf(N).settings.import.ownNames })
  const r2 = await restart(N, { machine: 'DOM-PC' })
  try {
    for (const tab of ['notify', 'view', 'system', 'updates', 'import', 'folder']) {
      await goSettings(r2.page, tab)
      const t = await text(r2.page, 'main')
      say(`US.30 DOM-PC po restarcie – ${tab}`, tab === 'folder' ? t.split('\n').filter((l) => /kopie|Folder:|backups/i.test(l)).slice(0, 3) : tab === 'notify' ? { briefing: await r2.page.getByTestId('notify-briefing').isChecked(), eveningTime: await r2.page.getByTestId('notify-evening-time').inputValue() } : tab === 'view' ? { zoom: await text(r2.page, '[data-testid="settings-zoom-value"]'), idle: await r2.page.getByTestId('settings-hide-idle').inputValue(), contrast: await r2.page.getByTestId('settings-contrast').isChecked() } : tab === 'system' ? { closeToTray: await r2.page.getByTestId('tray-close').isChecked() } : tab === 'updates' ? { autoCheck: await r2.page.getByTestId('toggle-auto-check').isChecked() } : { bankFiles: await r2.page.getByTestId('settings-bank-files').isChecked() })
    }
    say('US.30 config po restarcie', configOf(N))
  } finally {
    await r2.app.close()
  }
  const l = await start('us-trwalosc-laptop', { dataDir, ictjDir, machine: 'LAPTOP' })
  try {
    l.page.setDefaultTimeout(15_000)
    await l.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await l.page.waitForTimeout(1500)
    await goSettings(l.page, 'general')
    say('US.30 LAPTOP – okręt, konta, kategorie, rozkazy', { okret: await l.page.getByTestId('ship-name-input').inputValue(), menu: await text(l.page, '[data-testid="menu-ship-name"]') })
    await goSettings(l.page, 'accounts')
    say('US.30 LAPTOP – konta', await l.page.getByTestId('account-name').evaluateAll((e) => e.map((x) => (x as HTMLInputElement).value)))
    await goSettings(l.page, 'layers')
    say('US.30 LAPTOP – kadłub', await l.page.getByTestId('layers-hull').inputValue())
    await goSettings(l.page, 'household')
    say('US.30 LAPTOP – domownicy', await l.page.getByTestId('member-name').evaluateAll((e) => e.map((x) => (x as HTMLInputElement).value)))
    await goSettings(l.page, 'import')
    say('US.30 LAPTOP – import', { own: await l.page.getByTestId('own-name').allInnerTexts(), bankFiles: await l.page.getByTestId('settings-bank-files').isChecked() })
    await goSettings(l.page, 'notify')
    say('US.30 LAPTOP – powiadomienia', { briefing: await l.page.getByTestId('notify-briefing').isChecked(), eveningTime: await l.page.getByTestId('notify-evening-time').inputValue() })
    await goSettings(l.page, 'view')
    say('US.30 LAPTOP – wygląd', { zoom: await text(l.page, '[data-testid="settings-zoom-value"]'), idle: await l.page.getByTestId('settings-hide-idle').inputValue(), contrast: await l.page.getByTestId('settings-contrast').isChecked() })
    await goSettings(l.page, 'system')
    say('US.30 LAPTOP – zasobnik', await l.page.getByTestId('tray-close').isChecked())
    await goSettings(l.page, 'updates')
    say('US.30 LAPTOP – aktualizacje', await l.page.getByTestId('toggle-auto-check').isChecked())
    await goSettings(l.page, 'ictj')
    say('US.30 LAPTOP – ICTTJ', { status: await text(l.page, '[data-testid="ictj-status"]'), forecast: await l.page.getByTestId('ictj-forecast').inputValue() })
    say('US.30 LAPTOP – config', configOf('us-trwalosc-laptop'))
  } finally {
    await l.app.close()
  }
})

test('US.33 config.json uszkodzony (próba wyścigu z uruchomieniem)', async () => {
  const N = 'us-config-a'
  const { dataDir, ictjDir } = useState('rok', N)
  // First a normal run (creates userdata and config.json), then the file corrupted while the next start is going on.
  const r0 = await start(N, { dataDir, ictjDir })
  await r0.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r0.app.close()
  const cfg = join(userDataOf(N), 'config.json')
  const good = readFileSync(cfg, 'utf8')
  // start() reads the file itself first – the corruption comes right after, before the app reads it.
  const corrupt = new Promise<number>((res) => setTimeout(() => { try { writeFileSync(cfg, '{ "dataDir": "C:\\tu", "prefs": { broken'); res(1) } catch { res(-1) } }, 30))
  let r: Awaited<ReturnType<typeof start>> | null = null
  try {
    r = await start(N, { dataDir, ictjDir, fresh: false })
  } catch (e) {
    say('US.33a start()', (e as Error).message.slice(0, 300))
  }
  say('US.33a próba zepsucia', await corrupt)
  if (r) {
    try {
      await r.page.waitForTimeout(4000)
      say('US.33a pliki userdata', readdirSync(userDataOf(N)).filter((f) => /config/.test(f)))
      say('US.33a config.json po starcie', existsSync(cfg) ? readFileSync(cfg, 'utf8').slice(0, 300) : '(brak)')
      say('US.33a ekran', (await text(r.page, 'body')).slice(0, 300))
    } finally {
      await r.app.close()
    }
  }
})
