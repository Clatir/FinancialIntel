// DO, przebieg do-9: DO.19 uzupełnienie – licznik Meldunków przy nowym wpisie ICTTJ, który od razu jest „do
// zadokowania” (wpis z datą 27.10 bez pary, plik z mBanku obejmuje dni po oknie – „Portfel XTB?”), dopisanym przy
// otwartej aplikacji. Persona „rok”, import.coveredTo mBank = 02.11. Granica ICTTJ jak w każdym przebiegu.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { recorded, shot, start, useState } from './lab'
import { ACC, Boundary, Log, briefing, dockPanel, editJson, mainLog, writePayout } from './do-pomoc'

const RUN = 'do-9'

test('DO.19 – Meldunki przy nowym wpisie „do zadokowania” na żywo', async () => {
  test.setTimeout(10 * 60_000)
  const log = new Log(RUN)
  const st = useState('rok', RUN)
  editJson(join(st.dataDir, 'fi.json'), (f) => {
    f.settings.import.coveredTo = { ...f.settings.import.coveredTo, [ACC.mbank]: '2026-11-02' }
  })
  const b = new Boundary(RUN, st.ictjDir!)
  const run = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const p = run.page
  try {
    await p.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await p.waitForTimeout(5000)
    const inbox = async () => (await p.getByTestId('nav-inbox').innerText()).replace(/\s+/g, ' ')
    const n0 = (await recorded(run.app)).toasts.length
    log.line(`przed: ${await inbox()} | ${(await dockPanel(p)).title}`)
    b.change('DO.19: wpis 820 zł Bieżące z 27.10 (bez pary) przy otwartej aplikacji', () => writePayout(st.ictjDir!, { id: '01KMXD0P000000000000000091', kind: 'withdrawal', date: '2026-10-27', amount: 820, pool: 'current' }))
    const t0 = Date.now()
    let row = ''
    for (let i = 0; i < 40 && !row; i++) {
      row = (await dockPanel(p)).rows.find((x) => x.includes('820,00')) ?? ''
      if (!row) await p.waitForTimeout(1000)
    }
    await p.waitForTimeout(1500)
    log.line(`po ${Math.round((Date.now() - t0) / 1000)} s: wiersz „${row}” | ${await inbox()} | ${(await dockPanel(p)).title}`)
    log.obj('odprawa', (await briefing(p)).filter((x) => x.includes('820,00')))
    log.obj('powiadomienia', (await recorded(run.app)).toasts.slice(n0))
    await shot(p, 'DO.19-meldunki')
  } finally {
    await run.app.close().catch(() => undefined)
    log.obj('main.log', mainLog(run.userData).split(/\r?\n/).filter((l) => /ICTTJ/.test(l)).join('\n'))
    log.obj('granica', b.end('DO.19 Meldunki'))
  }
})
