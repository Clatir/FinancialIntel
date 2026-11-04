// RY, przebieg 3 (kopie persony „rok”, godzina wieczornego dopisania = teraz − 1 min): pasek „Raport wachty dnia”,
// „Dziś bez wydatków”, „Wznów raport wachty”, restart, „Dopisz” i dwa wydatki z godziną, wydatek z godziną po 18:00,
// powiadomienie wyłączone, „Dziś bez wydatków” w dniu z wydatkiem; dni potwierdzone w historii (01.11 bez kosztu,
// 30.10 z kosztem – zdjęte z zamrożonych). Narzędzie obserwacji – oceny w docs/audyt/raport/RY.md.
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { recorded, shot, start, text, useState } from './lab'
import { editJson, go, out, stepper, textOf, TODAY_MOKKA } from './wy-pomoc'

const warsaw = (d = new Date()) => d.toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hour12: false })
const TODAY = '2026-11-03'

async function bar(page: Page): Promise<Record<string, string>> {
  return { at: warsaw(), otwarty: await textOf(page.getByTestId('evening-report')), zamkniety: await textOf(page.getByTestId('evening-closed')) }
}
const toasts = async (app: ElectronApplication) => (await recorded(app)).toasts.filter((t) => /wachty|Odprawa/i.test(t.title))

/** A celebration (a class or a rank after the re-frozen days) covers the window: noted and closed. */
async function closeCelebrations(page: Page, log: unknown[]): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const c = page.getByTestId('celebration-close')
    if (!(await c.count())) return
    log.push({ swieto: await textOf(page.getByTestId('celebration')) })
    await c.click()
    await page.waitForTimeout(600)
  }
}

/** A close that hangs is the lab's problem (noted), not a reason to stop the run. */
async function safeClose(app: ElectronApplication, log: unknown[]): Promise<void> {
  try {
    await app.close()
  } catch (e) {
    log.push({ problemLaboratorium: String(e).split('\n')[0] })
  }
}
const noSpend = (dataDir: string) => (JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8')) as { settings: { game: { noSpend: Record<string, string> } } }).settings.game.noSpend

async function quickExpense(app: ElectronApplication, page: Page, amount: string, who: string, time: string, open: () => Promise<void>): Promise<string> {
  await open()
  let q: Page | undefined
  for (let i = 0; i < 100 && !q; i++) {
    q = app.windows().find((w) => w.url().includes('quick=1') && !w.isClosed())
    if (!q) await page.waitForTimeout(100)
  }
  if (!q) return 'brak okna szybkiego wpisu'
  await q.getByTestId('quick-amount').waitFor({ state: 'visible', timeout: 15_000 })
  await q.getByTestId('quick-amount').click()
  await q.getByTestId('quick-amount').fill(amount)
  await q.getByTestId('quick-counterparty').fill(who)
  await q.getByTestId('quick-counterparty').press('Tab')
  await q.getByTestId('quick-time').fill(time)
  await q.getByTestId('quick-time').press('Tab')
  await q.waitForTimeout(400)
  await q.getByTestId('quick-save').click()
  await page.waitForTimeout(1500)
  return `zapisano ${amount} ${who} ${time}`
}

test('RY przebieg 3 – wieczorne dopisanie', async () => {
  test.setTimeout(30 * 60_000)
  const eveningTime = warsaw(new Date(Date.now() - 60_000))

  // A: dziś bez wydatku; dni 01.11 (bez kosztu) i 30.10 (z kosztem) potwierdzone „bez wydatków” i zdjęte z zamrożonych.
  {
    const RUN = 'ry-3a'
    const st = useState('rok', RUN)
    rmSync(join(st.dataDir, TODAY_MOKKA))
    editJson(join(st.dataDir, 'game', '2026-11.json'), (j) => void delete j.days['2026-11-01'])
    editJson(join(st.dataDir, 'game', '2026-10.json'), (j) => void delete j.days['2026-10-30'])
    editJson(join(st.dataDir, 'fi.json'), (j) => {
      j.settings.game.noSpend = { '2026-11-01': '2026-11-01T20:30:00.000Z', '2026-10-30': '2026-10-30T20:30:00.000Z' }
    })
    let { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, prefs: { notify: { eveningTime } } })
    const dump = out(RUN)
    const step = stepper(dump)
    const log: unknown[] = [{ eveningTime }]
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(8000)
      await closeCelebrations(page, log)
      await go(page, '2', 'page-operations')
      log.push({ krok: 'start', ...(await bar(page)), toasty: await toasts(app) })
      await shot(page, 'RY.12-pasek')
      await step('bez-wydatkow', async () => {
        await page.getByTestId('evening-nospend').click()
        await page.waitForTimeout(1500)
        log.push({ krok: '„Dziś bez wydatków”', ...(await bar(page)), plik: noSpend(st.dataDir) })
        await shot(page, 'RY.13-zamkniety')
      })
      await step('dowodztwo', async () => {
        await go(page, '8', 'page-command')
        await page.waitForTimeout(1500)
        const t = await text(page, '[data-testid="page-command"]')
        dump('RY.13-dowodztwo', t)
        dump('RY.13-dni', await page.getByTestId('page-command').locator('[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title')).filter((s) => s && /(30\.10|31\.10|01\.11|02\.11)\.2026/.test(s))))
        const g11 = JSON.parse(readFileSync(join(st.dataDir, 'game', '2026-11.json'), 'utf8')).days['2026-11-01']
        const g10 = JSON.parse(readFileSync(join(st.dataDir, 'game', '2026-10.json'), 'utf8')).days['2026-10-30']
        dump('RY.13-zamrozone', { '2026-11-01': g11, '2026-10-30': g10 })
        await shot(page, 'RY.13-dowodztwo')
      })
      dump('RY.12-log', log)
      // Restart: potwierdzenie zostaje?
      await safeClose(app, log)
      ;({ app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false }))
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(5000)
      await closeCelebrations(page, log)
      await go(page, '2', 'page-operations')
      log.push({ krok: 'po restarcie', ...(await bar(page)), plik: noSpend(st.dataDir), toasty: await toasts(app) })
      await step('wznow', async () => {
        await page.getByTestId('watch-reopen').click()
        await page.waitForTimeout(1500)
        log.push({ krok: '„Wznów raport wachty”', ...(await bar(page)), plik: noSpend(st.dataDir) })
        await shot(page, 'RY.15-wznowiony')
      })
      await safeClose(app, log)
      ;({ app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false }))
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(5000)
      await closeCelebrations(page, log)
      await go(page, '2', 'page-operations')
      log.push({ krok: 'po „Wznów” i restarcie', ...(await bar(page)), plik: noSpend(st.dataDir), toasty: await toasts(app) })
      // RY.12 – „Dopisz” i dwa wydatki z godziną (przed 18:00).
      await step('dopisz', async () => {
        log.push(await quickExpense(app, page, '15', 'Kiosk audyt', '10:00', () => page.getByTestId('evening-quick').click()))
        log.push({ krok: 'po 1. wpisie', ...(await bar(page)) })
        log.push(await quickExpense(app, page, '20', 'Piekarnia audyt', '11:30', () => page.getByTestId('evening-quick').click()))
        log.push({ krok: 'po 2. wpisie', ...(await bar(page)) })
        await shot(page, 'RY.12-po-2-wpisach')
        await page.waitForTimeout(150_000)
        log.push({ krok: 'po 2,5 min', ...(await bar(page)), toasty: await toasts(app) })
      })
      // RY.16 a – wydatek z godziną 19:00 dopisany teraz.
      await step('po-18', async () => {
        log.push(await quickExpense(app, page, '9', 'Wieczór audyt', '19:00', () => page.evaluate('window.fi.quickOpen()') as Promise<void>))
        log.push({ krok: 'po wpisie z godziną 19:00', ...(await bar(page)) })
        await page.waitForTimeout(70_000)
        log.push({ krok: 'po minucie', ...(await bar(page)), toasty: await toasts(app) })
        await shot(page, 'RY.16-a')
      })
      dump('RY.12-log', log)
      dump('bledy', errors)
    } finally {
      await app.close()
    }
  }

  // B: dziś z wydatkiem (Mokka), powiadomienie wieczorne wyłączone.
  {
    const RUN = 'ry-3b'
    const st = useState('rok', RUN)
    const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, prefs: { notify: { eveningTime, evening: false } } })
    const dump = out(RUN)
    const step = stepper(dump)
    const log: unknown[] = [{ eveningTime, evening: false }]
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(8000)
      await closeCelebrations(page, log)
      await go(page, '2', 'page-operations')
      await page.waitForTimeout(70_000)
      log.push({ krok: 'start (wyłączone powiadomienie)', ...(await bar(page)), toasty: await toasts(app) })
      await shot(page, 'RY.16-d')
      await step('bez-wydatkow-z-wydatkiem', async () => {
        await page.getByTestId('evening-nospend').click()
        await page.waitForTimeout(1000)
        const dlg = await page.locator('[role="dialog"]').allInnerTexts()
        const toast = await page.locator('[role="status"], [role="alert"], [data-testid*="toast"]').allInnerTexts().catch(() => [])
        log.push({ krok: '„Dziś bez wydatków” przy wydatku 12 zł dziś', ...(await bar(page)), okno: dlg, toast, plik: noSpend(st.dataDir) })
        await shot(page, 'RY.13-dzien-z-wydatkiem')
      })
      dump('RY.16-log', log)
      dump('bledy', errors)
    } finally {
      await app.close()
    }
  }
  void TODAY
})
