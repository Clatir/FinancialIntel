// SW.30 – the draft closed by Esc comes back within 30 minutes (real waiting: 1 minute, then 31 minutes).
import { test } from '@playwright/test'
import { CAT, added, log, openQuick, openRok, ops, qread, snap, typeAmount, typeIn, waitHidden } from './sw-pomoc'

test('SW.30 szkic po Esc', async () => {
  test.setTimeout(50 * 60_000)
  const run = 'sw-30'
  const { app, page, dataDir } = await openRok(run)
  try {
    const before = await ops(dataDir)
    let q = await openQuick(app, page)
    await typeAmount(q, '64,20')
    await typeIn(q, 'quick-counterparty', 'Rossmann')
    await q.getByTestId('quick-split').click()
    await q.waitForTimeout(200)
    const parts = q.locator('[data-testid="quick-lines"] input[aria-label^="Część"]')
    await parts.nth(0).click()
    await parts.nth(0).fill('40,00')
    await parts.nth(0).press('Tab')
    await q.locator('[data-testid="quick-lines"] select[aria-label="Kategoria"]').nth(0).selectOption(CAT.personal)
    await parts.nth(1).click()
    await parts.nth(1).fill('24,20')
    await parts.nth(1).press('Tab')
    await q.locator('[data-testid="quick-lines"] select[aria-label="Kategoria"]').nth(1).selectOption(CAT.chem)
    log(run, 'przed Esc', await qread(q), await q.getByTestId('quick-lines').innerText())
    await snap(q, 'SW.30-przed-esc')
    await q.keyboard.press('Escape')
    log(run, 'ukryte po Esc', await waitHidden(app))
    const t0 = Date.now()
    await page.waitForTimeout(60_000)
    q = await openQuick(app, page)
    log(run, 'po minucie', await qread(q), 'szkic:', (await q.getByTestId('quick-restored').count()) ? await q.getByTestId('quick-restored').innerText() : '(brak)', 'części:', (await q.getByTestId('quick-lines').count()) ? await q.getByTestId('quick-lines').innerText() : '(brak)')
    await snap(q, 'SW.30-po-minucie')
    await q.getByTestId('quick-clear').click()
    await q.waitForTimeout(400)
    log(run, 'po Wyczyść', await qread(q), 'części:', await q.getByTestId('quick-lines').count())
    await snap(q, 'SW.30-wyczysc')
    await typeAmount(q, '64,20')
    await typeIn(q, 'quick-counterparty', 'Rossmann')
    await q.keyboard.press('Escape')
    log(run, 'drugie Esc ukryte', await waitHidden(app), 'po', Math.round((Date.now() - t0) / 1000), 's')
    const closedAt = Date.now()
    // 31 minutes from the closing, in the background.
    while (Date.now() - closedAt < 31 * 60_000 + 5000) await page.waitForTimeout(30_000)
    q = await openQuick(app, page)
    log(run, 'po 31 min', await qread(q), 'szkic:', await q.getByTestId('quick-restored').count())
    await snap(q, 'SW.30-po-31-min')
    log(run, 'nowe pliki operacji', (await added(dataDir, before)).length)
    await q.keyboard.press('Escape')
  } finally {
    await app.close()
  }
})
