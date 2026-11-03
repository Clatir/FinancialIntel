// DW, przebieg 0 (persona „rok”, odczyt): Dowództwo panel po panelu, Mostek (klasa, zasięg), Raporty (przegląd roczny),
// toasty okna przez pierwsze minuty. Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { test } from '@playwright/test'
import { reading, recorded, shot, start, text, useState } from './lab'
import { command, gameFiles, go, out, textOf, toasts } from './dw-pomoc'

const RUN = 'dw-0'

test('DW przebieg 0 – zwiad Dowództwa (rok)', async () => {
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('gra-przed', gameFiles(st.dataDir))
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const seen: string[] = []
  const watch = setInterval(() => {
    toasts(page)
      .then((t) => {
        for (const x of t) if (!seen.includes(x)) seen.push(x)
      })
      .catch(() => {})
  }, 500)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(8000)
    dump('mostek', await text(page))
    await shot(page, 'DW-0-mostek')
    await go(page, '8', 'page-command')
    await page.waitForTimeout(1500)
    const c = await command(page)
    dump('dowodztwo', c)
    dump('dowodztwo-tekst', await text(page, '[data-testid="page-command"]'))
    await shot(page, 'DW-0-dowodztwo')
    reading('dw', 'DW.zwiad', 'rok', { head: String(c.head), rank: String(c.rank).replace(/\s+/g, ' '), klasa: String(c.klasa).replace(/\s+/g, ' '), seria: String(c.seria).replace(/\s+/g, ' ') })
    await go(page, '0', 'page-reports')
    dump('raporty', await text(page, '[data-testid="page-reports"]'))
    await shot(page, 'DW-0-raporty')
    const tabs = await page.locator('[data-testid="page-reports"] button').allInnerTexts()
    dump('raporty-przyciski', tabs)
    await page.waitForTimeout(60_000)
    await go(page, '8', 'page-command')
    dump('dowodztwo-po-minucie', await command(page))
    dump('toasty', seen)
    dump('powiadomienia', await recorded(app))
    dump('bledy', errors)
    dump('gra-po', gameFiles(st.dataDir))
  } finally {
    clearInterval(watch)
    await app.close()
  }
})
