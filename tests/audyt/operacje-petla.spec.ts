/**
 * Reproduction of an audit finding (docs/audyt/raport/0-przygotowanie.md): in 1.15.4 Operacje loops (React #185 –
 * „Maximum update depth exceeded”) and the window goes blank when the game started more than ~105 days ago – with no
 * operation in the folder, on a second opening too. 100 days: fine; 110 days: the loop. Fails while the bug is there.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, warsawNow } from '../../src/shared/calc/dates'
import { LAB, shot, start, useState } from './lab'

const COLLS = ['transactions', 'containers', 'goals', 'months', 'dockings', 'loans', 'balances', 'scheduled', 'game', 'imports']

for (const days of [100, 110]) {
  test(`Operacje przy grze od ${days} dni`, async () => {
    test.skip(!existsSync(join(LAB, 'stany', 'rok', 'fi.json')), 'najpierw persona.spec.ts (stan „rok”)')
    // P.1: a known bug of 1.15.4 – the 110 days' case fails while it is there (and passes once fixed: then drop this).
    test.fail(days === 110, 'P.1 – znany błąd 1.15.4')
    const run = `operacje-petla-${days}`
    const { dataDir } = useState('rok', run)
    for (const c of COLLS) rmSync(join(dataDir, c), { recursive: true, force: true })
    const f = join(dataDir, 'fi.json')
    const fi = JSON.parse(readFileSync(f, 'utf8'))
    fi.settings.game.start = addDays(warsawNow().date, -days)
    writeFileSync(f, `${JSON.stringify(fi, null, 2)}\n`)
    const { app, page, errors } = await start(run, { dataDir })
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
      await page.waitForTimeout(5000)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(3000)
      await shot(page, `AF-operacje-petla-${days}`)
      const blank = !(await page.evaluate(() => document.body.innerText.trim().length))
      expect({ blank, loop: errors.filter((e) => e.includes('#185')).length }).toEqual({ blank: false, loop: 0 })
    } finally {
      await app.close()
    }
  })
}
