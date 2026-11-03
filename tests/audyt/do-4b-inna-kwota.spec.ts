// DO, przebieg do-4b (powtórka części do-4: tam wiersz otwierano po kwocie i trafiono w zwrot 05.03; w fazie 2 wiersze
// banku z 02–03.11 sięgały za okno). Persona „rok”. DO.8 wariant brzegi – ostatni plik z mBanku kończy się w oknie (29.10),
// wpis 600 zł z 27.10 bez pary; DO.12 – wpis 1 000,00 zł, wpływ z XTB 998,50 zł dzień później.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState, type Run } from './lab'
import { ACC, Boundary, Log, accountBalances, bankXtb, briefing, bridgeValues, dialogState, dockPanel, editJson, findRecords, mainLog, openDelivery, readAt, toasts, writePayout } from './do-pomoc'

const RUN = 'do-4b'
const W600 = '01KMXD0P000000000000000071'
const W1000 = '01KMXD0P000000000000000072'

test('DO.8 (plik w oknie), DO.12 (inna kwota) – rok', async () => {
  test.setTimeout(20 * 60_000)
  const log = new Log(RUN)
  const st = useState('rok', RUN)
  const DATA = st.dataDir
  const ICTJ = st.ictjDir!
  const folders = { dataDir: DATA, ictjDir: ICTJ }
  const b = new Boundary(RUN, ICTJ)
  let run: Run | null = null
  const open = async (label: string, fresh: boolean) => {
    b.check(`przed start() – ${label}`)
    run = await start(RUN, { dataDir: DATA, ictjDir: ICTJ, fresh })
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await run.page.waitForTimeout(5000)
    return run
  }
  const close = async (label: string) => {
    if (!run) return
    log.obj(`błędy okna (${label})`, run.errors)
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    log.obj(`main.log ICTTJ (${label})`, mainLog(run.userData).split(/\r?\n/).filter((l) => /ictj|ICTTJ|EPERM|EACCES/i.test(l)).join('\n'))
    run = null
    b.check(`po zamknięciu – ${label}`)
  }
  const dlgValues = async (page: Page) => Object.fromEntries(Object.entries(await dialogState(page)).map(([k, x]) => [k, String(x)]))
  try {
    // ---- Faza 1 (DO.8): plik z mBanku kończy się 29.10 (w oknie 28–30.10 wpisu z 27.10); ostatni wiersz banku 26.10.
    editJson(join(DATA, 'fi.json'), (f) => {
      f.settings.import.coveredTo = { ...f.settings.import.coveredTo, [ACC.mbank]: '2026-10-29' }
    })
    b.change('DO.8: wpis 600 zł 27.10', () => writePayout(ICTJ, { id: W600, kind: 'withdrawal', date: '2026-10-27', amount: 600, pool: 'current' }))
    let r = await open('faza 1', true)
    await log.step('DO.8 600', async () => {
      log.obj('panel', await dockPanel(r.page))
      log.obj('odprawa', (await briefing(r.page)).filter((x) => x.startsWith('[dock]')))
      await openDelivery(r.page, '27.10.2026', '+600,00')
      log.obj('DO.8 okno 600', await dialogState(r.page))
      await shot(r.page, 'DO.8-okno-600-plik-w-oknie')
      await r.page.keyboard.press('Escape')
    })
    await close('faza 1')

    // ---- Faza 2 (DO.12): wpis 1 000,00 zł (02.11), wpływ z XTB 998,50 zł (03.11).
    b.change('DO.12: wpis 1 000 zł 02.11', () => writePayout(ICTJ, { id: W1000, kind: 'withdrawal', date: '2026-11-02', amount: 1000, pool: 'current' }))
    bankXtb(DATA, '01KMXD0T000000000000000071', '2026-11-03', 99850)
    r = await open('faza 2', false)
    await log.step('DO.12', async () => {
      log.obj('panel', await dockPanel(r.page))
      log.obj('odprawa', (await briefing(r.page)).filter((x) => x.startsWith('[dock]')))
      await shot(r.page, 'DO.12-panel')
      log.obj('DO.12 przed', await readAt('DO.12', 'rok; wpis 1 000 (02.11), wpływ XTB 998,50 (03.11) – przed', folders, async () => ({ ...(await bridgeValues(r.page)), salda: await accountBalances(r.page) })))
      await openDelivery(r.page, '02.11.2026', '+1 000,00')
      log.obj('DO.12 okno', await readAt('DO.12', 'rok; okno wpisu 1 000 z wpływem 998,50 – propozycja', folders, () => dlgValues(r.page)))
      await shot(r.page, 'DO.12-okno')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(1200)
      log.line(`toast: ${await toasts(r.page)}`)
      await r.page.waitForTimeout(2500)
      log.obj('dokowanie W1000', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === W1000).map((x) => x.rec))
      log.obj('operacje 998,50 / 1 000', findRecords(DATA, 'transactions', (x) => x.date >= '2026-11-01' && (x.amount === 99850 || x.amount === 100000)).map((x) => `${x.rec.date} ${x.rec.accountId} ${x.rec.kind} ${x.rec.amount}`))
      log.obj('DO.12 po', await readAt('DO.12', 'rok; po „Zadokuj” 1 000/998,50', folders, async () => ({ ...(await bridgeValues(r.page)), salda: await accountBalances(r.page) })))
      log.obj('panel po', await dockPanel(r.page))
    })
    await close('faza 2')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.8 (brzegi), DO.12'))
  }
})
