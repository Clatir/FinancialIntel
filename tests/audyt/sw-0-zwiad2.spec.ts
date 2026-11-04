// SW – reconnaissance 2: the household members of the points' examples added with opening balances.
import { test } from '@playwright/test'
import { text } from './lab'
import { addMembers, bridge, log, openRok } from './sw-pomoc'

test('SW zwiad 2', async () => {
  const run = 'sw-zwiad2'
  const { app, page } = await openRok(run, addMembers)
  try {
    log(run, 'mostek', (await bridge(page)).receivables)
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-household').click()
    await page.waitForTimeout(800)
    log(run, 'domownicy', (await text(page, 'main')).slice(1200, 5000))
  } finally {
    await app.close()
  }
})
