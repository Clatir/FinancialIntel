// DW, przebieg 1 („rok” z grą liczoną od nowa): kopia persony bez folderu game/ – aplikacja zamraża wszystkie dni od
// startu gry przy pierwszym otwarciu, już z zaimportowaną historią. Obserwacja 5 min: ekrany świąt, toasty (DW.21),
// potem Dowództwo panel po panelu (DW.9, 17, 24, 25, 30–32). Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, recorded, shot, start, text, useState } from './lab'
import { command, gameFiles, go, lastFrozen, out, textOf, toasts } from './dw-pomoc'

const RUN = 'dw-1'

test('DW przebieg 1 – gra przeliczona od nowa na „rok”', async () => {
  const st = useState('rok', RUN)
  rmSync(join(st.dataDir, 'game'), { recursive: true, force: true })
  const dump = out(RUN)
  const t0 = Date.now()
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const seen: string[] = []
  const screens: string[] = []
  const watch = setInterval(() => {
    toasts(page)
      .then((t) => {
        for (const x of t) if (!seen.includes(x)) seen.push(`${Math.round((Date.now() - t0) / 1000)}s ${x}`)
      })
      .catch(() => {})
    page
      .getByTestId('celebration')
      .count()
      .then(async (n) => {
        if (n) {
          const s = `${Math.round((Date.now() - t0) / 1000)}s ${(await page.getByTestId('celebration').innerText()).replace(/\s+/g, ' ')}`
          if (!screens.some((x) => x.endsWith(s.split('s ').slice(1).join('s ')))) screens.push(s)
        }
      })
      .catch(() => {})
  }, 400)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(3000)
      dump(`zamrozone-${i}`, { s: Math.round((Date.now() - t0) / 1000), last: lastFrozen(st.dataDir) })
      if (await page.getByTestId('celebration').count()) {
        await shot(page, `DW-1-swieto-${i}`)
        dump(`swieto-${i}`, await text(page, '[data-testid="celebration"]'))
        // An animation check: classes of the screen's parts.
        dump(`swieto-klasy-${i}`, await page.getByTestId('celebration').evaluate((e) => [e.className, ...Array.from(e.querySelectorAll('*')).map((x) => `${x.tagName} ${x.getAttribute('class')}`)]))
        await page.keyboard.press('Enter')
        await page.waitForTimeout(800)
      }
    }
    await shot(page, 'DW-1-mostek')
    dump('mostek', await text(page, '[data-testid="page-bridge"]'))
    await go(page, '8', 'page-command')
    const c = await command(page)
    dump('dowodztwo', c)
    await shot(page, 'DW-1-dowodztwo')
    reading('dw', 'DW.17', 'rok-przeliczona', { seria: String(c.streak), seriaPanel: String(c.seria).replace(/\s+/g, ' '), pasek: (c.strip as string[]).join(' | ') })
    reading('dw', 'DW.18', 'rok-przeliczona', { stopien: String(c.rank).replace(/\s+/g, ' ') })
    reading('dw', 'DW.24', 'rok-przeliczona', { klasa: String(c.klasa).replace(/\s+/g, ' ') })
    reading('dw', 'DW.30', 'rok-przeliczona', { osiagniecia: (c.osiagniecia as string[]).join(' | '), ukryte: String(c.ukryte) })
    reading('dw', 'DW.31', 'rok-przeliczona', { dziennik: (c.log as string[]).join(' | ') })
    // The rest of the five minutes: toasts and screens.
    const left = 5 * 60_000 - (Date.now() - t0)
    for (let i = 0; i < Math.max(0, Math.floor(left / 5000)); i++) {
      await page.waitForTimeout(5000)
      if (await page.getByTestId('celebration').count()) {
        await shot(page, `DW-1-swieto-pozne-${i}`)
        await page.keyboard.press('Escape')
      }
    }
    dump('toasty', seen)
    dump('ekrany', screens)
    dump('powiadomienia', await recorded(app))
    dump('bledy', errors)
    dump('gra-po', gameFiles(st.dataDir))
    dump('dowodztwo-koniec', await command(page))
    dump('localStorage', await page.evaluate(() => localStorage.getItem('fi.game.seen')))
  } finally {
    clearInterval(watch)
    await app.close()
  }
})
