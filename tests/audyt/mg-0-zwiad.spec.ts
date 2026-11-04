// MG / RA, przebieg 0 (persona „rok”, tylko odczyt): Mapa gwiezdna, Radar, Ładownia, Plan miesiąca i Mostek na stanie
// „rok” – rozpoznanie ekranów i odczyty bazowe (MG.5, MG.12, RA.1). Narzędzie obserwacji – oceny w raport/MG.md i RA.md.
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import { bridgePanels, briefing, go, goalLine, ictjGuard, itemLine, out, readNow, readRadar, readStarmap, stepper } from './mg-pomoc'

const RUN = 'mg-0'

test('MG/RA przebieg 0 – rozpoznanie na stanie rok', async () => {
  const st = useState('rok', RUN)
  const guard = ictjGuard(RUN, st.ictjDir)
  const dirs = { dataDir: st.dataDir, ictjDir: st.ictjDir }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(6000)

    await step('mostek', async () => {
      dump('mostek-odprawa', await briefing(page))
      dump('mostek-panele', await bridgePanels(page))
      await shot(page, 'MG-0-mostek')
    })

    await step('mapa', async () => {
      await go(page, '6', 'page-starmap')
      await page.waitForTimeout(1500)
      const m = await readStarmap(page)
      dump('mapa', m)
      dump('mapa-tekst', await text(page, '[data-testid="page-starmap"]'))
      await shot(page, 'MG-0-mapa')
      await readNow(page, 'mg', 'MG.5', 'rok', dirs, async () => ({
        naglowek: m.header,
        tempo: m.pace,
        ...Object.fromEntries(m.goals.map((g) => [g.name ?? '?', goalLine(g)])),
        zarchiwizowane: m.archived.join(' || ')
      }))
      await readNow(page, 'mg', 'MG.12', 'rok', dirs, async () => ({
        ...Object.fromEntries(m.goals.map((g) => [g.name ?? '?', `${g.amount} / ${g.target} · DOL=${g.dol ?? '-'} · pula=${g.dolPool ?? '-'}`]))
      }))
    })

    await step('radar', async () => {
      await go(page, '7', 'page-radar')
      await page.waitForTimeout(1500)
      const r = await readRadar(page)
      dump('radar', r)
      dump('radar-tekst', await text(page, '[data-testid="page-radar"]'))
      await shot(page, 'RA-0-radar')
      await readNow(page, 'ra', 'RA.1', 'rok', dirs, async () => ({
        naglowek: r.header,
        ...Object.fromEntries(r.items.map((i, n) => [`${String(n).padStart(2, '0')}:${i.kind}`, itemLine(i)]))
      }))
    })

    await step('ladownia', async () => {
      await go(page, '5', 'page-cargo')
      await page.waitForTimeout(1200)
      dump('ladownia-tekst', await text(page, '[data-testid="page-cargo"]'))
      await shot(page, 'MG-0-ladownia')
    })

    await step('plan', async () => {
      await go(page, '4', 'page-month')
      await page.waitForTimeout(1200)
      dump('plan-tekst', await text(page, '[data-testid="page-month"]'))
      await shot(page, 'MG-0-plan')
    })

    dump('bledy-okna', errors)
  } finally {
    await app.close()
    dump('ictj-zmiany', guard.check())
  }
})
