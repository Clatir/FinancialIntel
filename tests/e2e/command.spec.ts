import { mkdtempSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

test('Dowództwo: dni zamrożone w tle, naruszenie poważne, awans z ekranem, misja tygodnia w odprawie, progi gry', async () => {
  const { date: today, month } = warsawNow()
  const budget = `${addMonths(month, -3)}-01`
  // The game started 32 days ago: 30 compliant days are frozen by now – a promotion.
  const start = addDays(today, -32)
  const night = addDays(today, -40)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-command-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: budget }, layers: { ...s.layers, assumedCosts: zl(3000) }, game: { ...s.game, start } }),
    records: {
      balances: [{ date: budget, accountId: MBANK, kind: 'opening', amount: zl(40000) }],
      months: [{ month: addMonths(month, -3), salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }],
      // A purchase in the quiet hours before the game: no violation (the game starts from zero); one tonight – today's
      // rating so far is broken.
      transactions: [
        { date: night, time: '23:40', accountId: MBANK, amount: -zl(25), categoryId: FOOD, counterparty: 'Żabka' },
        { date: today, time: '23:30', accountId: MBANK, amount: -zl(30), categoryId: FOOD, counterparty: 'Nocny sklep' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    // The promotion's screen with its fanfare (the days froze in the background on opening).
    await expect(page.getByTestId('celebration')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('celebration-title')).toHaveText('Awans: Chorąży')
    await page.getByTestId('celebration-close').click()
    await expect(page.getByTestId('celebration')).toHaveCount(0)

    // The frozen days are in the folder, with the promotion.
    await expect.poll(async () => (await records(dir, 'game')).reduce((n, g) => n + Object.keys(g.days as object).length, 0)).toBe(31)
    const game = await records(dir, 'game')
    expect(game.flatMap((g) => g.promotions as Array<{ rank: string }>).map((p) => p.rank)).toEqual(['ensign'])

    // The briefing carries this week's mission.
    await expect(page.locator('[data-testid="briefing-item"][data-kind="mission"]')).toContainText('Misja tygodnia')

    await page.keyboard.press('Control+8')
    await expect(page.getByTestId('page-command')).toBeVisible()
    await expect(page.getByTestId('command-rank-name')).toHaveText('Chorąży')
    await expect(page.getByTestId('command-streak-days')).toHaveText('31')
    await expect(page.getByTestId('command-mission-title')).not.toBeEmpty()
    await expect(page.locator('[data-testid="command-log-entry"][data-kind="rank"]')).toContainText('Awans: Chorąży')
    await expect(page.getByTestId('command-hidden')).toContainText('Ukrytych:')

    // Tonight's purchase in the quiet hours: today so far is broken (a serious violation); the frozen days stay.
    await expect(page.getByTestId('command-today')).toContainText('naruszenie')
    await expect(page.getByTestId('command-today')).toContainText('Zakup w ciszy nocnej')

    // The game's thresholds are the folder's (fi.json).
    await page.getByTestId('game-promote-days').fill('25')
    await page.getByTestId('game-promote-days').press('Tab')
    await expect.poll(async () => JSON.parse(await readFile(join(dir, 'fi.json'), 'utf8')).settings.game.promoteDays).toBe(25)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
