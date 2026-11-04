/**
 * W1 (AU-11, skeptical verification) – P.1: Operacje loop (React #185) by the game's length. Bisects the threshold
 * (bare fi.json, all collections removed) and checks the persona's full folder with the game pushed back.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { addDays, warsawNow } from '../../src/shared/calc/dates'
import { LAB, note, shot, start, useState } from './lab'

const COLLS = ['transactions', 'containers', 'goals', 'months', 'dockings', 'loans', 'balances', 'scheduled', 'game', 'imports']
// First run (14:xx): 101b, 103b–107b, 109b, 60f, 110f – no loop. W1_P1 = e.g. „110b,115b,130b,200b”.
const CASES: Array<{ days: number; bare: boolean }> = (process.env.W1_P1 ?? '110b,115b,130b,200b')
  .split(',')
  .map((c) => ({ days: Number(c.slice(0, -1)), bare: c.endsWith('b') }))

for (const c of CASES) {
  test(`P.1 gra od ${c.days} dni (${c.bare ? 'sam fi.json' : 'pełna persona'})`, async () => {
    test.skip(!existsSync(join(LAB, 'stany', 'rok', 'fi.json')))
    const run = `w1-p1-${c.days}${c.bare ? 'b' : 'f'}${process.env.W1_FREEZE0 ? 'z' : ''}`
    const { dataDir } = useState('rok', run)
    if (c.bare) for (const k of COLLS) rmSync(join(dataDir, k), { recursive: true, force: true })
    const f = join(dataDir, 'fi.json')
    const fi = JSON.parse(readFileSync(f, 'utf8'))
    const before = fi.settings.game.start
    fi.settings.game.start = addDays(warsawNow().date, -c.days)
    writeFileSync(f, `${JSON.stringify(fi, null, 2)}\n`)
    const { app, page, errors } = await start(run, { dataDir, env: process.env.W1_FREEZE0 ? { FI_FREEZE_AFTER_OPEN_MS: '0', FI_FREEZE_QUIET_MS: '0' } : {} })
    try {
      const bridge = await page.getByTestId('page-bridge').waitFor({ timeout: 45_000 }).then(() => true, () => false)
      await shot(page, `W1-P1-${run}-start`)
      note('w1', `P.1 ${run} Mostek widoczny=${bridge} błędy=${JSON.stringify(errors.slice(0, 3)).slice(0, 600)} tekst=${JSON.stringify((await page.evaluate(() => document.body.innerText)).slice(0, 150))}`)
      await page.waitForTimeout(4000)
      note('w1', `P.1 ${run} Mostek przed Ctrl+2: ${JSON.stringify((await page.evaluate(() => document.body.innerText)).match(/Awans.{0,120}/gs))}`)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(3000)
      await shot(page, `W1-P1-${c.days}${c.bare ? 'b' : 'f'}${process.env.W1_FREEZE0 ? 'z' : ''}`)
      const txt = await page.evaluate(() => document.body.innerText.trim())
      const loop = errors.filter((e) => e.includes('#185')).length
      const line = `P.1 freeze0=${!!process.env.W1_FREEZE0} days=${c.days} bare=${c.bare} gameStartBefore=${before} gameStart=${fi.settings.game.start} blank=${!txt.length} loop185=${loop} firstErr=${JSON.stringify(errors.slice(0, 2)).slice(0, 300)} head=${JSON.stringify(txt.slice(0, 120))}`
      note('w1', line)
      console.log(line)
    } finally {
      await app.close()
    }
  })
}
