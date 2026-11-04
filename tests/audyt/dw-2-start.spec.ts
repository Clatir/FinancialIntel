// DW, przebieg 2 (DW.1): Dowództwo zaraz po kreatorze (stan „start”) i na folderze z samym saldem otwarcia, bez
// kreatora. Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { warsawNow } from '../../src/shared/calc/dates'
import { seedFolder, zl } from '../e2e/seed'
import { LAB, reading, shot, start, text, useState } from './lab'
import { command, gameFiles, go, out } from './dw-pomoc'

const MBANK = '01KDEFACC00000000000000001'

test('DW.1 – stan „start” (kreator dziś)', async () => {
  const RUN = 'dw-2a'
  const st = useState('start', RUN)
  const dump = out(RUN)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(6000)
    dump('mostek', await text(page, '[data-testid="page-bridge"]'))
    await go(page, '8', 'page-command')
    const c = await command(page)
    dump('dowodztwo', c)
    dump('dowodztwo-tekst', await text(page, '[data-testid="page-command"]'))
    await shot(page, 'DW.1-start')
    reading('dw', 'DW.1', 'start', { head: String(c.head), rank: String(c.rank).replace(/\s+/g, ' '), seria: String(c.seria).replace(/\s+/g, ' '), misja: String(c.misja).replace(/\s+/g, ' '), ukryte: String(c.ukryte) })
    dump('gra', gameFiles(st.dataDir))
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})

test('DW.1 – folder z samym saldem otwarcia, bez kreatora', async () => {
  const RUN = 'dw-2b'
  const dir = join(LAB, 'przebiegi', RUN, 'dane')
  const today = warsawNow().date
  seedFolder(dir, { records: { balances: [{ date: today, accountId: MBANK, kind: 'opening', amount: zl(12000) }] } })
  const dump = out(RUN)
  const { app, page, errors } = await start(RUN, { dataDir: dir })
  try {
    await page.waitForTimeout(8000)
    dump('ekran', await text(page))
    await shot(page, 'DW.1-bez-kreatora-ekran')
    await page.keyboard.press('Control+8')
    await page.waitForTimeout(2000)
    if (await page.getByTestId('page-command').count()) {
      const c = await command(page)
      dump('dowodztwo', c)
      dump('dowodztwo-tekst', await text(page, '[data-testid="page-command"]'))
      reading('dw', 'DW.1', 'saldo-bez-kreatora', { head: String(c.head), rank: String(c.rank).replace(/\s+/g, ' '), seria: String(c.seria).replace(/\s+/g, ' '), misja: String(c.misja).replace(/\s+/g, ' ') })
    } else dump('dowodztwo', `brak ekranu Dowództwa: ${await text(page)}`)
    await shot(page, 'DW.1-bez-kreatora')
    dump('gra', gameFiles(dir))
    dump('fi', await page.evaluate(() => 0))
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
