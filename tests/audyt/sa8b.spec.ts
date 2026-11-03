// Area SA – run sa-8 continued: the second variant of SA.8 done right – two equal corrections on two days saved by two
// different computers (the copy of 02.11 marked as KOMPUTER-A; the one of 03.11 is KOMPUTER-B's).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { LAB, start } from './lab'
import { Obs, readable, short, statuses, txs } from './im-pomoc'

test('sa-8b: podwójne korekty z dwóch komputerów', async () => {
  const o = new Obs('sa-8b')
  const dataDir = join(LAB, 'przebiegi', 'sa-8', 'dane')
  const ictjDir = join(LAB, 'przebiegi', 'sa-8', 'ictj')
  const p = join(dataDir, 'transactions', '2026', '2026-11-02_01KAZ990000000000000000201.json')
  writeFileSync(p, readFileSync(p, 'utf8').replace('"updatedBy": "KOMPUTER-B"', '"updatedBy": "KOMPUTER-A"'))
  o.log('stan', (await txs(dataDir)).filter((t) => t.kind === 'correction').map((t) => `${short(t)} by=${t.updatedBy}`))
  let run = await start('sa-8', { dataDir, ictjDir, machine: 'KOMPUTER-A', fresh: false })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(1500)
    await page.keyboard.press('Control+Shift+M')
    await page.waitForTimeout(1500)
    const m = await readable(page, 'main')
    o.log('SA.8 Meldunki', m.split('\n').filter((l, i, a) => /korekt|powtórz|Pokaż korektę/i.test(l) || /Podwójne/i.test(a[i - 1] ?? '')))
    await o.shot(page, 'SA.8-podwojne')
    const not = page.getByRole('button', { name: /to nie powtórzenie/ })
    o.log('SA.8 przyciski', { pokaz: await page.getByRole('button', { name: /Pokaż korektę/ }).count(), nie: await not.count() })
    if (await not.count()) {
      await not.first().click()
      await page.waitForTimeout(1000)
      o.log('SA.8 po „to nie powtórzenie”', { meldunki: (await readable(page, 'main')).split('\n').filter((l) => /powtórz/i.test(l)), toast: await statuses(page) })
    }
  } finally {
    await run.app.close()
  }
  run = await start('sa-8', { dataDir, ictjDir, machine: 'KOMPUTER-A', fresh: false })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(1500)
    await page.keyboard.press('Control+Shift+M')
    await page.waitForTimeout(1500)
    o.log('SA.8 po restarcie – Meldunki (powtórzone)', (await readable(page, 'main')).split('\n').filter((l) => /powtórz/i.test(l)))
  } finally {
    await run.app.close()
  }
})
