// DW, przebieg 11 (DW.2, DW.24, DW.31): W1 – „rok” z grą od 15.10 (game/ usunięte, aplikacja zamraża od nowa): pasek
// sprzed startu, dziennik, Wywiad (miesiące sprzed startu), klasa i zasięg na Dowództwie, Mostku i w Przeglądzie rocznym.
// W2 / W3 – folder z samym saldem otwarcia 8 880 zł i 9 000 zł przy przyjętych kosztach 3 000 zł (zasięg 2,96 i 3,00).
// Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { seedFolder, zl } from '../e2e/seed'
import { LAB, reading, shot, start, text, useState } from './lab'
import { command, editSettings, go, MBANK, out, textOf } from './dw-pomoc'

test('W1 – gra od 15.10: pasek, dziennik, Wywiad, klasa na trzech ekranach', async () => {
  const RUN = 'dw-11a'
  const st = useState('rok', RUN)
  rmSync(join(st.dataDir, 'game'), { recursive: true, force: true })
  editSettings(st.dataDir, (s) => {
    s.game.start = '2026-10-15'
  })
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(500)
      if (await page.getByTestId('celebration').count()) await page.keyboard.press('Escape')
    }
    const bridge = await text(page, '[data-testid="page-bridge"]')
    const s: Record<string, unknown> = {}
    s.mostekKlasa = bridge.slice(bridge.indexOf('ZASIĘG'), bridge.indexOf('ZASIĘG') + 120).replace(/\s+/g, ' ')
    s.mostekNaglowek = bridge.split('\n').slice(0, 4).join(' | ')
    await go(page, '8', 'page-command')
    const c = await command(page)
    s.dowodztwo = { head: c.head, klasa: c.klasa, strip: (c.strip as string[]).slice(0, 18), log: c.log }
    await shot(page, 'DW.2-dowodztwo')
    await go(page, '0', 'page-reports')
    await page.getByText('Przegląd roczny', { exact: true }).first().click()
    await page.waitForTimeout(1000)
    const y = await text(page, '[data-testid="page-reports"]')
    s.przegladZasieg = y.split('\n').filter((l, i, a) => /Zasięg|Klasa/i.test(l) || /Zasięg/i.test(a[i - 1] ?? '')).slice(0, 8)
    await shot(page, 'DW.24-przeglad-roczny')
    await go(page, '9', 'page-intel')
    await page.waitForTimeout(1500)
    s.wywiad6 = await text(page, '[data-testid="page-intel"]')
    const p12 = page.getByTestId('page-intel').getByText('12 mies.', { exact: true }).first()
    if (await p12.count()) {
      await p12.click()
      await page.waitForTimeout(1500)
      s.wywiad12 = await text(page, '[data-testid="page-intel"]')
    }
    await shot(page, 'DW.2-wywiad')
    dump('kroki', s)
    reading('dw', 'DW.24', 'rok (gra od 15.10)', { mostek: String(s.mostekKlasa), dowodztwo: String(c.klasa).replace(/\s+/g, ' '), przeglad: JSON.stringify(s.przegladZasieg) })
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})

for (const [name, opening] of [
  ['W2', 8880],
  ['W3', 9000]
] as const) {
  test(`${name} – zasięg z salda ${opening} zł przy kosztach 3 000 zł`, async () => {
    const RUN = `dw-11${name.toLowerCase()}`
    const dir = join(LAB, 'przebiegi', RUN, 'dane')
    rmSync(dir, { recursive: true, force: true })
    seedFolder(dir, {
      settings: (s) => ({ ...s, budget: { ...s.budget, start: '2026-11-01' }, layers: { ...s.layers, assumedCosts: zl(3000) } }),
      records: { balances: [{ date: '2026-11-01', accountId: MBANK, kind: 'opening', amount: zl(opening) }] }
    })
    const dump = out(RUN)
    const r = await start(RUN, { dataDir: dir })
    const page = r.page
    try {
      await page.waitForTimeout(8000)
      const s: Record<string, unknown> = {}
      const b = await text(page).catch(() => '')
      s.mostek = b.slice(b.indexOf('STAN OKRĘTU'), b.indexOf('STAN OKRĘTU') + 600).replace(/\s+/g, ' ')
      await page.keyboard.press('Control+8')
      await page.waitForTimeout(1500)
      s.dowodztwo = await textOf(page.getByTestId('command-class'))
      await shot(page, `DW.24-${name}`)
      await page.keyboard.press('Control+0')
      await page.waitForTimeout(1000)
      await page.getByText('Przegląd roczny', { exact: true }).first().click().catch(() => {})
      await page.waitForTimeout(1000)
      const y = await text(page, '[data-testid="page-reports"]').catch(() => '')
      s.przeglad = y.split('\n').filter((l, i, a) => /Zasięg|Klasa/i.test(l) || /Zasięg/i.test(a[i - 1] ?? '')).slice(0, 8)
      dump('kroki', s)
      reading('dw', 'DW.24', `saldo ${opening} zł, koszty 3 000 zł`, { mostek: String(s.mostek), dowodztwo: String(s.dowodztwo).replace(/\s+/g, ' '), przeglad: JSON.stringify(s.przeglad) })
    } finally {
      await r.app.close()
    }
  })
}
