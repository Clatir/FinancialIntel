// RY, przebieg 4 (kopie persony „rok”, cisza nocna przesunięta względem teraz): (A) odprawa poranna po końcu ciszy
// (cisza od teraz − 60 min do teraz + 3 min); (B) godzina wieczorna w ciszy – Ustawienia i przypomnienie minutę przed
// ciszą. Narzędzie obserwacji – oceny w docs/audyt/raport/RY.md.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { recorded, shot, start, useState, useWindow } from './lab'
import { editJson, go, out, stepper, textOf } from './wy-pomoc'

const hm = (msFromNow: number) => new Date(Date.now() + msFromNow).toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hour12: false })
const where = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="page-"]')).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getAttribute('data-testid')).join(','))
const notes = async (app: ElectronApplication) => (await recorded(app)).toasts.map((t) => `${t.at.slice(11, 19)}Z ${t.title}: ${t.body}`)

test('RY przebieg 4 – cisza nocna', async () => {
  test.setTimeout(30 * 60_000)
  // A – RY.2.
  if (process.env.RY4_ONLY !== 'B') {
    const RUN = process.env.RY4_RUN ?? 'ry-4a'
    const st = useState('rok', RUN)
    const quiet = { from: hm(-60 * 60_000), to: hm(3 * 60_000) }
    editJson(join(st.dataDir, 'fi.json'), (j) => void (j.settings.orders.quietHours = quiet))
    const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
    const dump = out(RUN)
    const log: unknown[] = [{ quiet }]
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(5000)
      await go(page, '2', 'page-operations')
      await useWindow(page)
      log.push({ krok: 'w ciszy, ruch w oknie', at: hm(0), ekran: await where(page), powiadomienia: await notes(app) })
      // Do końca ciszy + 30 s.
      for (let i = 0; i < 10 && hm(0) <= quiet.to; i++) await page.waitForTimeout(30_000)
      await page.waitForTimeout(30_000)
      log.push({ krok: 'po ciszy, bez ruchu', at: hm(0), ekran: await where(page), powiadomienia: await notes(app) })
      await useWindow(page)
      await page.waitForTimeout(5000)
      log.push({ krok: 'po ciszy, pierwszy ruch', at: hm(0), ekran: await where(page), powiadomienia: await notes(app) })
      await shot(page, 'RY.2-po-ciszy')
      await page.waitForTimeout(65_000)
      await useWindow(page)
      await page.waitForTimeout(5000)
      log.push({ krok: 'drugi ruch po minucie', at: hm(0), ekran: await where(page), powiadomienia: await notes(app) })
      const items = await page.locator('section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"]').evaluateAll((els) => els.map((e) => `${getComputedStyle(e.querySelector('span')!).backgroundColor} ${(e as HTMLElement).innerText.slice(0, 50)}`))
      log.push({ pozycjeOdprawy: items })
      dump('RY.2-log', log)
      dump('bledy', errors)
    } finally {
      await app.close()
    }
  }
  // B – RY.16 c.
  if (process.env.RY4_ONLY !== 'A') {
    const RUN = 'ry-4b'
    const st = useState('rok', RUN)
    const quiet = { from: hm(3 * 60_000), to: '05:00' }
    const eveningTime = hm(6 * 60_000)
    editJson(join(st.dataDir, 'fi.json'), (j) => void (j.settings.orders.quietHours = quiet))
    const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, prefs: { notify: { eveningTime } } })
    const dump = out(RUN)
    const step = stepper(dump)
    const log: unknown[] = [{ quiet, eveningTime }]
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(4000)
      await step('ustawienia', async () => {
        await page.keyboard.press('Control+Comma')
        await page.getByTestId('settings-tab-notify').click({ timeout: 20_000 })
        await page.waitForTimeout(800)
        log.push({ krok: 'Ustawienia → Powiadomienia', godzina: await page.getByTestId('notify-evening-time').inputValue(), uprzedzenie: await textOf(page.getByTestId('notify-evening-quiet')) })
        await shot(page, 'RY.16-c-ustawienia')
      })
      await go(page, '2', 'page-operations')
      const expected = (() => {
        const [h, m] = quiet.from.split(':').map(Number) as [number, number]
        const t = h * 60 + m - 1
        return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
      })()
      log.push({ krok: 'przed', at: hm(0), oczekiwana: expected, pasek: await textOf(page.getByTestId('evening-report')), powiadomienia: (await notes(app)).filter((n) => /wachty/.test(n)) })
      for (let i = 0; i < 12 && hm(0) <= expected; i++) await page.waitForTimeout(20_000)
      await page.waitForTimeout(40_000)
      log.push({ krok: 'minutę przed ciszą', at: hm(0), pasek: await textOf(page.getByTestId('evening-report')), powiadomienia: (await notes(app)).filter((n) => /wachty/.test(n)) })
      await shot(page, 'RY.16-c-pasek')
      dump('RY.16-c-log', log)
      dump('bledy', errors)
    } finally {
      await app.close()
    }
  }
})
