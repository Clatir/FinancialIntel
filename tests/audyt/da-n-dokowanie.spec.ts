/**
 * Audit DA – DA.22 for a docked delivery: its dialog from the bridge's „Dokowanie” panel, „Historia”, Esc.
 * Observation only: C:\FI-audyt\przebiegi\da-22d\da.log.
 */
import { test } from '@playwright/test'
import { Log, answerQuestions, openRok } from './da-pomoc'

test('DA.22 – historia zadokowanej dostawy', async () => {
  test.setTimeout(8 * 60_000)
  const NAME = 'da-22d'
  const log = new Log(NAME)
  const { run } = await openRok(NAME, { log })
  const { page } = run
  try {
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(3000)
    const rows = page.locator('[data-testid="docking-row"]')
    log.line(`wiersze dokowania: ${(await rows.evaluateAll((els) => els.map((e) => `${e.getAttribute('data-state')}: ${e.textContent?.replace(/\s+/g, ' ')}`))).join(' || ')}`)
    const docked = page.locator('[data-testid="docking-row"][data-state="docked"]').first()
    if (!(await docked.count())) return log.line('brak zadokowanej dostawy na Mostku')
    await docked.click()
    await page.waitForTimeout(1000)
    const dialogs = page.locator('[role="dialog"]')
    log.line(`okno: ${(await dialogs.last().innerText().catch(() => '(brak)')).replace(/\s+/g, ' ').slice(0, 500)}`)
    const hist = dialogs.last().getByTestId('history-open')
    log.line(`Historia w oknie: ${await hist.count()}`)
    if (await hist.count()) {
      await hist.first().click()
      await page.waitForTimeout(800)
      log.line(`historia: ${(await page.getByTestId('history-dialog').innerText()).replace(/\s+/g, ' ').slice(0, 500)}`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      log.line(`po Esc: historia ${await page.getByTestId('history-dialog').count()}, okien ${await dialogs.count()} – ${(await dialogs.last().innerText().catch(() => '(brak)')).slice(0, 80).replace(/\s+/g, ' ')}`)
    }
    await log.shot(page, 'DA.22-dokowanie')
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch(() => undefined)
  }
})
