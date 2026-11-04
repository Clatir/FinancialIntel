// DO, przebieg do-8: dowód DO.5 – stan z migawki DO.5-1 (zwrot do masy 300 zł z puli Podatek zaimportowany, jeszcze
// niezadokowany) otwarty jeszcze raz: Mostek (odprawa z czerwonym alarmem, osłony, Podatek) i Dowództwo – zrzuty.
// Kopia migawki w folderze przebiegu; migawka zostaje nietknięta. Granica ICTTJ jak w każdym przebiegu.
import { cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { shot, start } from './lab'
import { Boundary, Log, MIG, RUNS, briefing, bridgeValues, go, mainLog } from './do-pomoc'

const RUN = 'do-8'

test('DO.5 – zrzut stanu przed zadokowaniem zwrotu z puli Podatek', async () => {
  test.setTimeout(10 * 60_000)
  const log = new Log(RUN)
  const dir = join(RUNS, RUN)
  for (const x of ['dane', 'ictj']) {
    rmSync(join(dir, x), { recursive: true, force: true })
    cpSync(join(MIG, 'DO.5-1', x), join(dir, x), { recursive: true })
  }
  const b = new Boundary(RUN, join(dir, 'ictj'))
  const run = await start(RUN, { dataDir: join(dir, 'dane'), ictjDir: join(dir, 'ictj') })
  try {
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await run.page.waitForTimeout(5000)
    log.obj('mostek', await bridgeValues(run.page))
    log.obj('odprawa', await briefing(run.page))
    await shot(run.page, 'DO.5-mostek-przed-dokowaniem')
    await go(run.page, '8', 'page-command')
    log.line(`Dowództwo: ${(await run.page.getByTestId('page-command').innerText()).split('\n').filter((l) => /narusz|irewall|wbrew|Dziś/.test(l)).join(' | ')}`)
    await shot(run.page, 'DO.5-dowodztwo-przed-dokowaniem')
  } finally {
    await run.app.close().catch(() => undefined)
    log.obj('main.log', mainLog(run.userData).split(/\r?\n/).filter((l) => /ICTTJ/.test(l)).join('\n'))
    log.obj('granica', b.end('DO.5 zrzut'))
  }
})
