// DW, przebieg 5 (DW.18–20, DW.23, DW.28): wariant „rok-awans” – na kopii „rok” dzień D−2 (01.11) wycofany z gry,
// awans na Chorążego przesunięty ręcznie z 06.10 na 05.10 (okno od 06.10: do 31.10 26 dni zgodnych), misja tygodnia W44
// „Pełna energia” (niedziela 01.11) nierozliczona i misja W40 wykonana z niedzielą 04.10 przed oknem – obie dopisane ręcznie
// do game/. Odczyt przed zamrożeniem D−2 (komputer nieużywany) i po nim: 27 + 3 = 30 → awans w dniu D−2, ekran awansu,
// Enter, restart; drugi przebieg – przycisk „Dowództwo”. Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { reading, recorded, shot, start, text, useState, useWindow } from './lab'
import { command, editJson, dropGameDays, gameFiles, go, lastFrozen, out, textOf, toasts } from './dw-pomoc'

function prepare(dataDir: string): Record<string, unknown> {
  const dropped = dropGameDays(dataDir, '2026-11-01')
  editJson(join(dataDir, 'game', '2026-10.json'), (g) => {
    g.promotions = g.promotions.map((p: { day: string }) => ({ ...p, day: '2026-10-05' }))
    g.missions = [...(g.missions ?? []), { id: '01KMSN00000000000000202644', template: 'energy', week: '2026-W44', done: false, evaluatedAt: null, params: {} }]
  })
  editJson(join(dataDir, 'game', '2026-09.json'), (g) => {
    g.missions = [...(g.missions ?? []), { id: '01KMSN00000000000000202640', template: 'quiet', week: '2026-W40', done: true, evaluatedAt: '2026-10-06T08:00:00.000Z', params: {} }]
  })
  return { dropped }
}

async function celebrationInfo(page: Page): Promise<Record<string, unknown>> {
  const c = page.getByTestId('celebration')
  return {
    tekst: await c.innerText(),
    przyciski: await c.locator('button').allInnerTexts(),
    insygnia: await c.locator('svg').count(),
    style: await c.evaluate((root) =>
      [root, ...Array.from(root.querySelectorAll('*'))].map((e) => {
        const s = getComputedStyle(e)
        return `${e.tagName}.${(e.getAttribute('class') ?? '').slice(0, 80)} anim=${s.animationName}/${s.animationDuration}/${s.animationIterationCount} bg=${s.backgroundImage} shadow=${s.boxShadow}`
      })
    )
  }
}

test('DW.19 / DW.20 – awans przez misję, ekran awansu, Enter, restart', async () => {
  const RUN = 'dw-5a'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('wariant', prepare(st.dataDir))
  // The first freezing 40 s after the opening (idle: true does not hold it – the user works at this computer): the progress before D−2 freezes.
  let r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, env: { FI_FREEZE_AFTER_OPEN_MS: '40000' } })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(3000)
    await go(r.page, '8', 'page-command')
    const c0 = await command(r.page)
    dump('0-przed-zamrozeniem', { plik: lastFrozen(st.dataDir), ...c0 })
    await shot(r.page, 'DW.19-przed')
    reading('dw', 'DW.19', 'rok-awans przed zamrożeniem D−2', { stopien: String(c0.rank).replace(/\s+/g, ' '), plik: lastFrozen(st.dataDir) })
    // The lab's Electron reports reduced motion: the animations as on a computer without it.
    await r.page.emulateMedia({ reducedMotion: 'no-preference' })
    const t0 = Date.now()
    await useWindow(r.page)
    let seenAt = -1
    for (let i = 0; i < 120 && seenAt < 0; i++) {
      await r.page.waitForTimeout(500)
      if (await r.page.getByTestId('celebration').count()) seenAt = Date.now() - t0
    }
    dump('1-ekran', { poMs: seenAt, plik: lastFrozen(st.dataDir) })
    for (let k = 0; k < 4 && (await r.page.getByTestId('celebration').count()); k++) {
      await r.page.waitForTimeout(150)
      await shot(r.page, `DW.20-ekran-${k}-w-animacji`)
      dump(`1-ekran-${k}`, await celebrationInfo(r.page))
      await r.page.waitForTimeout(1500)
      await shot(r.page, `DW.20-ekran-${k}`)
      await r.page.keyboard.press(k === 0 ? 'Enter' : 'Escape')
      await r.page.waitForTimeout(800)
      dump(`1-po-${k === 0 ? 'enter' : 'esc'}-${k}`, { ekran: await r.page.getByTestId('celebration').count() })
    }
    await r.page.waitForTimeout(3000)
    dump('1-toasty', await toasts(r.page))
    await go(r.page, '8', 'page-command')
    const c1 = await command(r.page)
    dump('2-po-zamrozeniu', c1)
    await shot(r.page, 'DW.19-po')
    reading('dw', 'DW.19', 'rok-awans po zamrożeniu D−2', { stopien: String(c1.rank).replace(/\s+/g, ' '), poprzednie: (c1.poprzednie as string[]).join(' | '), dziennik: (c1.log as string[]).slice(0, 6).join(' | ') })
    reading('dw', 'DW.18', 'rok-awans', { stopien: String(c1.rank).replace(/\s+/g, ' '), awanse: (c1.log as string[]).filter((l) => l.startsWith('rank')).join(' | ') })
    // DW.23 – the counter after a change of rank this month; the month's debriefing.
    await go(r.page, '0', 'page-reports')
    await r.page.getByText('Debriefing', { exact: true }).first().click()
    await r.page.waitForTimeout(1000)
    dump('3-debriefing', await text(r.page, '[data-testid="page-reports"]'))
    dump('gra', gameFiles(st.dataDir))
    dump('powiadomienia', await recorded(r.app))
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
  // The same computer again: the promotion's screen never comes back.
  r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    let again = 0
    for (let i = 0; i < 20; i++) {
      await r.page.waitForTimeout(500)
      again += await r.page.getByTestId('celebration').count()
    }
    dump('4-restart', { ekranPonownie: again, toasty: await toasts(r.page) })
    await shot(r.page, 'DW.20-restart')
  } finally {
    await r.app.close()
  }
})

test('DW.20 – ekran awansu, przycisk „Dowództwo”', async () => {
  const RUN = 'dw-5b'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  prepare(st.dataDir)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('celebration').waitFor({ state: 'visible', timeout: 60_000 })
    await r.page.getByTestId('celebration').getByRole('button', { name: 'Dowództwo' }).click()
    await r.page.waitForTimeout(1000)
    dump('po-kliknieciu', { dowodztwo: await r.page.getByTestId('page-command').count(), ekran: await r.page.getByTestId('celebration').count(), naglowek: await textOf(r.page.getByTestId('page-command').locator('h1')) })
    await shot(r.page, 'DW.20-przycisk-dowodztwo')
    // Esc on a second screen is not possible here – the Esc check in DW.20 uses run A's Enter; this one closes by click.
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
