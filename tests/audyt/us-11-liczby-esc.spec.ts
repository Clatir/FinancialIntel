/** US.32 / IN.15 – Esc w polach liczbowych Ustawień (NumberField): widoczna wartość i zapis po opuszczeniu pola. */
import { test } from '@playwright/test'
import { fiOf, goSettings, run, say, snap } from './us-pomoc'

test('US.32 Esc w polach liczbowych', async () => {
  const N = 'us-liczby'
  const r = await run(N)
  const { app, page } = r
  try {
    const cases: Array<[string, string, string, () => unknown]> = [
      ['Osłony – cel', 'layers-shields', '5', () => fiOf(N).settings.layers.shieldSalaries],
      ['Kadłub – cel', 'layers-hull', '8', () => fiOf(N).settings.layers.hullMonths],
      ['Linia zanurzenia', 'orders-cargo', '33', () => fiOf(N).settings.orders.cargoLimitPct],
      ['Minimalne osłony', 'orders-min-shields', '2', () => fiOf(N).settings.orders.minShieldSalaries]
    ]
    for (const [label, tid, val, file] of cases) {
      await goSettings(page, 'layers')
      const f = page.getByTestId(tid)
      const old = await f.inputValue()
      await f.click()
      await f.press('Control+a')
      await f.pressSequentially(val)
      await f.press('Escape')
      await page.waitForTimeout(700)
      const afterEsc = { pole: await f.inputValue(), fokus: await f.evaluate((e) => document.activeElement === e), plik: file() }
      // leave the field by clicking an empty place
      await page.locator('main').click({ position: { x: 5, y: 5 } })
      await page.waitForTimeout(900)
      const afterLeave = { pole: await f.inputValue(), plik: file() }
      await goSettings(page, 'general')
      await goSettings(page, 'layers')
      say(`US.32 ${label}`, { przed: old, poEsc: afterEsc, poOpuszczeniu: afterLeave, poPowrocie: await f.inputValue() })
    }
    await snap(page, 'US.32-liczby')
  } finally {
    await app.close()
  }
})
