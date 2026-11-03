/**
 * W1 – P.1, the second opening: the folder of run w1-p1-110bz (game of 110 days, the first opening looped with #185) opened
 * again as it is (no fresh copy), days frozen at once. Does the window work now (Mostek, Operacje)?
 */
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, note, shot, start } from './lab'

test('W1 P.1 – drugie otwarcie folderu po pętli', async () => {
  const run = 'w1-p1-110bz'
  const dataDir = join(LAB, 'przebiegi', run, 'dane')
  const { app, page, errors } = await start(run, { dataDir, fresh: false, env: { FI_FREEZE_AFTER_OPEN_MS: '0', FI_FREEZE_QUIET_MS: '0' } })
  try {
    const bridge = await page.getByTestId('page-bridge').waitFor({ timeout: 45_000 }).then(() => true, () => false)
    await page.waitForTimeout(8000)
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(3000)
    const ops = await page.getByTestId('page-operations').isVisible().catch(() => false)
    await shot(page, 'W1-P1-110bz-drugie-otwarcie')
    const line = `P.1 drugie otwarcie ${run}: Mostek=${bridge} Operacje=${ops} #185=${errors.filter((e) => e.includes('#185')).length}`
    note('w1', line)
    console.log(line)
  } finally {
    await app.close()
  }
})
