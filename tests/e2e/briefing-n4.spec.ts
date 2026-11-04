// AP-16 (N4, 1.15.8): the briefing with a hierarchy (alarms → the day's matters → the rest folded), one notification at
// the start instead of many, the briefing's hour as an option (D99 pkt 7), Dowództwo reading the orders and the game's
// thresholds, changed in Ustawienia (D84 C9) – with a word for a refused value (AP-15).
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const AUTO = '01KDEFCAT00000000000000300'

/** 'HH:MM' this many minutes after `time` (round the clock). */
const clockPlus = (time: string, minutes: number) => {
  const [h, m] = time.split(':').map(Number) as [number, number]
  const t = (h * 60 + m + minutes) % (24 * 60)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

test('odprawa z hierarchią, jedno powiadomienie przy starcie, godzina odprawy, rozkazy i progi tylko w Ustawieniach (AP-16)', async () => {
  // The touch's throttle waited out (31 s) on top of the rest.
  test.setTimeout(150_000)
  const { date: today, month, time } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  // An asteroid in 10 days (information – folded), the mBank never imported (the day's matter).
  const due = addDays(today, 10)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-briefing-n4-')), 'FinancialIntel')
  seedFolder(dataDir, {
    // The quiet hours away from now: the notifications are due whenever the test runs.
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, orders: { ...s.orders, quietHours: { from: clockPlus(time, 180), to: clockPlus(time, 181) } } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: { [FOOD]: zl(1500), [AUTO]: zl(300) } }],
      containers: [{ name: 'OC auta', amount: zl(1240), cycleMonths: 12, dueMonth: due.slice(0, 7), dueDay: Number(due.slice(8, 10)), categoryId: AUTO }]
    }
  })
  const { app, page, userData, dataDir: dir, errors } = await launch({ dataDir })
  try {
    // The system's notifications recorded in main (never on the desktop).
    await app.evaluate(({ Notification }) => {
      const g = globalThis as unknown as { __notes: Array<{ title: string; body: string }> }
      g.__notes = []
      Notification.isSupported = () => true
      Notification.prototype.show = function (this: Electron.Notification) {
        g.__notes.push({ title: this.title, body: this.body })
      }
    })
    const notes = () => app.evaluate(() => (globalThis as unknown as { __notes: Array<{ title: string; body: string }> }).__notes)

    await expect(page.getByTestId('page-bridge')).toBeVisible()

    // The start's notifications (the briefing, the import, the asteroid): one – the briefing naming the others.
    await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('fi.notify.sent') ?? '{}')))).toContain(`briefing:${today}`)
    await app.evaluate(() => {
      ;(globalThis as unknown as { __notes: unknown[] }).__notes = []
    })
    await page.evaluate(() => localStorage.removeItem('fi.notify.sent'))
    // The first touch of the window: the morning's opening. The notifier takes one touch in 30 s – a pointer resting over
    // the window at its start (Xvfb: the cursor in the screen's corner, over the window) is one: the throttle waited out.
    expect(await page.evaluate('document.visibilityState')).toBe('visible')
    await page.waitForTimeout(31_000)
    await page.evaluate('window.dispatchEvent(new PointerEvent("pointerdown"))')
    await expect.poll(notes).toHaveLength(1)
    const [note] = await notes()
    expect(note!.title).toBe('Odprawa poranna')
    // The day's others (a debriefing in the first week, the evening report after 21:00) may join them – one notification still.
    expect(note!.body).toMatch(/^Energia dziś: .* Do tego \d+ inn\S+ powiadomie\S+: .*– Mostek\.$/)
    expect(note!.body).toContain('Asteroida na kursie')
    expect(note!.body).toContain('Zaległy import z mBanku')

    // The bridge: the day's matter (the import) shown, the asteroid 10 days ahead folded – „Pokaż wszystkie”.
    const line = (kind: string) => page.locator(`[data-testid="briefing-item"][data-kind="${kind}"]`)
    await expect(line('import')).toBeVisible()
    await expect(line('import')).toHaveAttribute('data-tier', 'day')
    await expect(line('asteroid')).toHaveAttribute('data-tier', 'rest')
    await expect(line('asteroid')).toBeHidden()
    const all = page.getByTestId('briefing-all')
    const total = await page.locator('[data-testid="briefing-item"]').count()
    await expect(all).toHaveText(`Pokaż wszystkie (${total})`)
    await all.click()
    await expect(line('asteroid')).toBeVisible()
    await expect(line('asteroid')).toContainText('OC auta za 10 dni')
    await expect(all).toHaveText('Zwiń')
    await all.click()
    await expect(line('asteroid')).toBeHidden()

    // Ustawienia → Powiadomienia: the briefing at the first opening (default) or at its hour (config.json, this computer).
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-notify').click()
    const when = page.getByTestId('notify-briefing-when')
    await expect(when).toHaveValue('open')
    await expect(page.getByTestId('notify-briefing-time')).toHaveCount(0)
    await when.selectOption('time')
    await expect.poll(async () => (await json(join(userData, 'config.json'))).prefs?.notify?.briefingTime).toBe('07:00')
    await expect(page.getByTestId('notify-briefing-time')).toHaveValue('07:00')
    await when.selectOption('open')
    await expect.poll(async () => (await json(join(userData, 'config.json'))).prefs?.notify?.briefingTime).toBeNull()

    // Dowództwo: the orders and the thresholds only read; „zmień w Ustawieniach” leads there.
    await page.keyboard.press('Control+8')
    const orders = page.getByTestId('command-orders')
    await expect(orders).toBeVisible()
    await expect(orders.locator('input, select')).toHaveCount(0)
    await expect(page.getByTestId('command-game-values')).toContainText('dni zgodnych w ostatnich')
    await page.getByTestId('command-orders-edit').click()
    await expect(page.getByTestId('settings-game')).toBeVisible()
    // A refused threshold says why – the previous one stays (AP-15); a good one is the folder's.
    const before = (await json(join(dir, 'fi.json'))).settings.game.promoteDays
    await page.getByTestId('game-promote-days').fill('400')
    await page.getByTestId('game-promote-days').press('Tab')
    await expect(page.getByRole('status').filter({ hasText: 'Dni zgodnych do awansu: od 1 do 366 – zostaje poprzednia wartość.' })).toBeVisible()
    await expect(page.getByTestId('game-promote-days')).toHaveValue(String(before))
    await page.getByTestId('game-promote-days').fill('25')
    await page.getByTestId('game-promote-days').press('Tab')
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.game.promoteDays).toBe(25)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
