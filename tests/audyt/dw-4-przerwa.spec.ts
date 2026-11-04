// DW, przebieg 4 (DW.7, DW.37): „rok-przerwa” – ostatni zamrożony dzień D−16, ostatni import i wpis sprzed D−16.
// Otwarcie bez skróconych czasów zamrażania (3 min po otwarciu, minuta ciszy – T199): co 30 s „ocenione do”, przełączanie
// ekranów i szybki wpis, czas reakcji okna. Potem import CSV z okresu przerwy i odczyt Dowództwa ponownie.
// Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { test } from '@playwright/test'
import { importDone } from '../e2e/app'
import { answerDialogs, reading, recorded, shot, start, text, useState } from './lab'
import { addDay, command, gameFiles, go, lastFrozen, makeBreak, out, textOf, toasts } from './dw-pomoc'

const RUN = 'dw-4'
const TODAY = '2026-11-03'

test('DW.7 / DW.37 – powrót po przerwie', async () => {
  test.setTimeout(25 * 60_000)
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('wariant', makeBreak(st.dataDir, addDay(TODAY, -16)))
  dump('gra-przed', gameFiles(st.dataDir))
  const t0 = Date.now()
  const { app, page, errors, userData } = await start(RUN, {
    dataDir: st.dataDir,
    ictjDir: st.ictjDir,
    env: { FI_FREEZE_AFTER_OPEN_MS: String(3 * 60_000), FI_FREEZE_QUIET_MS: String(60_000) }
  })
  const seen: string[] = []
  const watch = setInterval(() => {
    toasts(page)
      .then((t) => {
        for (const x of t) if (!seen.some((s) => s.endsWith(x))) seen.push(`${Math.round((Date.now() - t0) / 1000)}s ${x}`)
      })
      .catch(() => {})
  }, 500)
  const s = () => Math.round((Date.now() - t0) / 1000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(3000)
    dump('mostek-start', await text(page, '[data-testid="page-bridge"]'))
    await shot(page, 'DW.37-mostek-start')
    await go(page, '8', 'page-command')
    dump('dowodztwo-start', await command(page))
    const timeline: string[] = []
    const screens = [
      ['1', 'page-bridge'],
      ['8', 'page-command'],
      ['4', 'page-month'],
      ['8', 'page-command'],
      ['9', 'page-intel'],
      ['8', 'page-command']
    ] as const
    for (let i = 0; i < 13; i++) {
      // A probe of the window: a round trip and a screen switch, timed.
      const a = Date.now()
      await page.evaluate(() => 1)
      const rt = Date.now() - a
      const [key, id] = screens[i % screens.length]!
      const b = Date.now()
      await go(page, key, id)
      const sw = Date.now() - b - 600
      let quick = ''
      if (i === 4 || i === 9) {
        const c = Date.now()
        await page.evaluate('window.fi.quickOpen()')
        let win = app.windows().find((w) => w.url().includes('quick=1'))
        for (let k = 0; k < 100 && !win; k++) {
          await page.waitForTimeout(100)
          win = app.windows().find((w) => w.url().includes('quick=1'))
        }
        if (win) {
          await win.getByTestId('quick-amount').waitFor({ state: 'visible', timeout: 15_000 })
          quick = ` szybki wpis ${Date.now() - c} ms`
          await win.keyboard.press('Escape')
        } else quick = ' szybki wpis: brak okna'
      }
      if (!(await page.getByTestId('page-command').count())) await go(page, '8', 'page-command')
      const head = await textOf(page.getByTestId('page-command').locator('h1').locator('..'))
      timeline.push(`${s()}s plik=${lastFrozen(st.dataDir)} ekran="${head.replace(/\s+/g, ' ')}" rt=${rt}ms przełączenie=${sw}ms${quick}`)
      dump('os-czasu', timeline)
      await page.waitForTimeout(Math.max(0, 30_000 - (Date.now() - a)))
    }
    // Until the last day is frozen (at most 4 more minutes).
    for (let i = 0; i < 24 && lastFrozen(st.dataDir) !== addDay(TODAY, -2); i++) {
      await page.waitForTimeout(10_000)
      timeline.push(`${s()}s plik=${lastFrozen(st.dataDir)}`)
    }
    dump('os-czasu', timeline)
    await go(page, '8', 'page-command')
    const before = await command(page)
    dump('dowodztwo-po-zamrozeniu', before)
    await shot(page, 'DW.37-po-zamrozeniu')
    reading('dw', 'DW.37', 'rok-przerwa przed importem', { seria: String(before.streak), stopien: String(before.rank).replace(/\s+/g, ' '), pasek: (before.strip as string[]).slice(-20).join(' | ') })
    dump('mostek-po-zamrozeniu', await text(page, '[data-testid="page-bridge"]').catch(() => ''))
    await go(page, '1', 'page-bridge')
    dump('mostek-po-zamrozeniu', await text(page, '[data-testid="page-bridge"]'))
    dump('gra-po-zamrozeniu', gameFiles(st.dataDir))

    // The bank's files of the break: the history (rows up to 26.10, the older known) and the last week.
    for (const f of ['rok-historia.csv', 'rok-nowe-historia.csv']) {
      await go(page, '3', 'page-import')
      await answerDialogs(app, { paths: [`C:\\FI-audyt\\pliki\\${f}`] })
      await page.getByTestId('import-pick').click()
      await page.getByTestId('import-file').waitFor({ state: 'visible', timeout: 60_000 })
      const counts: Record<string, string> = {}
      for (const k of ['new', 'merge', 'known', 'excluded']) {
        const c = page.getByTestId(`import-count-${k}`)
        if (await c.count()) counts[k] = await c.innerText()
      }
      dump(`import-${f}`, counts)
      await page.getByTestId('import-run').click()
      await importDone(page, userData)
      dump(`import-${f}-wynik`, await text(page, '[data-testid="import-done"]'))
    }
    await go(page, '1', 'page-bridge')
    await page.waitForTimeout(3000)
    dump('mostek-po-imporcie', await text(page, '[data-testid="page-bridge"]'))
    await go(page, '8', 'page-command')
    const after = await command(page)
    dump('dowodztwo-po-imporcie', after)
    await shot(page, 'DW.37-po-imporcie')
    reading('dw', 'DW.37', 'rok-przerwa po imporcie', { seria: String(after.streak), stopien: String(after.rank).replace(/\s+/g, ' '), pasek: (after.strip as string[]).slice(-20).join(' | ') })
    dump('gra-po-imporcie', gameFiles(st.dataDir))
    dump('toasty', seen)
    dump('powiadomienia', await recorded(app))
    dump('bledy', errors)
  } finally {
    clearInterval(watch)
    await app.close()
  }
})
