// DO, przebieg do-3b (powtórka części do-3 – tam wiersze otwierano po kwocie i trafiono w inny wpis): persona „rok”.
// DO.3 wariant 1 – wypłata 1 500 zł z puli Cele (02.11) z parą w mBanku; DO.4 – przychód z tradingu przy podziale
// 1 500 podatek / 500 osłony i przelew do urzędu (w pełnym miesiącu październiku: Wywiad → Bilans paliwa); DO.17 – okno
// zwrotu 500 zł wbrew rozkazowi, potwierdzenie przed zapisem, Dowództwo.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState, type Run } from './lab'
import { Boundary, Log, bankXtb, briefing, bridgeValues, dialogState, editJson, findRecords, go, mainLog, openDelivery, readAt, starmap, toasts, writePayout, writeTx } from './do-pomoc'

const RUN = 'do-3b'
const FORECAST = 'forecasts/01KAZ710000000000000000001.json'
const C1 = '01KMXD0P000000000000000061'
const T3 = '01KMXD0P000000000000000062'
const RF = '01KMXD0P000000000000000063'

async function fuelOctober(page: Page): Promise<string> {
  await go(page, '9', 'page-intel')
  const row = page.locator('[data-testid="intel-fuel-row"][data-month="2026-10"]')
  return (await row.count()) ? (await row.innerText()).replace(/\s+/g, ' ') : '(brak wiersza 2026-10)'
}

test('DO.3 (para w mBanku), DO.4 (przychód), DO.17 (okno, potwierdzenie) – rok', async () => {
  test.setTimeout(30 * 60_000)
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
    // ---- Faza A: październik bez zmian (Wywiad → Bilans paliwa), Mostek.
    let r = await open('faza A', true)
    await log.step('stan wyjściowy', async () => {
      log.line(`Bilans paliwa – październik (wyjściowo): ${await fuelOctober(r.page)}`)
    })
    await close('faza A')

    // ---- Faza B: DO.3 wariant 1 (para w mBanku) i DO.4 (październik: wpis Podatek 2 000 z parą 21.10, przelew do US 22.10).
    b.change('DO.3: scenariusz – cel ICTTJ 1 000 zł, drugi wyłączony', () =>
      editJson(join(ICTJ, FORECAST), (f) => {
        f.updatedAt = '2026-11-03T10:00:00.000Z'
        f.goals = f.goals.map((g: Record<string, unknown>) => (g.id === '01KAZ720000000000000000001' ? { ...g, enabled: false } : { ...g, amount: 1000 }))
      })
    )
    b.change('DO.3/DO.4: wypłata 1 500 Cele 02.11, wypłata 2 000 Podatek 21.10', () => {
      writePayout(ICTJ, { id: C1, kind: 'withdrawal', date: '2026-11-02', amount: 1500, pool: 'goals' })
      writePayout(ICTJ, { id: T3, kind: 'withdrawal', date: '2026-10-21', amount: 2000, pool: 'tax' })
    })
    bankXtb(DATA, '01KMXD0T000000000000000061', '2026-11-03', 150000)
    bankXtb(DATA, '01KMXD0T000000000000000062', '2026-10-21', 200000)
    r = await open('faza B', false)
    await log.step('DO.3 wariant 1 (para w mBanku)', async () => {
      log.obj('DO.3 mapa przed', await starmap(r.page))
      await shot(r.page, 'DO.3-mapa-przed-b')
      await go(r.page, '1', 'page-bridge')
      log.obj('DO.3 przed', await readAt('DO.3', 'rok + scenariusz zmieniony; wypłata Cele 1 500 (02.11) z parą w mBanku 03.11 – przed', folders, () => bridgeValues(r.page)))
      await openDelivery(r.page, '02.11.2026', '+1 500,00')
      log.obj('DO.3 okno', await readAt('DO.3', 'rok; okno wypłaty Cele 1 500 z parą w mBanku – propozycja', folders, () => dlgValues(r.page)))
      await shot(r.page, 'DO.3-okno-mbank')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(1200)
      log.line(`toast: ${await toasts(r.page)}`)
      await r.page.waitForTimeout(2000)
      log.obj('dokowanie C1', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === C1).map((x) => x.rec))
      log.obj('DO.3 po', await readAt('DO.3', 'rok; po „Zadokuj” wypłaty Cele 1 500 z parą w mBanku', folders, () => bridgeValues(r.page)))
      log.obj('DO.3 mapa po', await starmap(r.page))
    })
    await log.step('DO.4 październik', async () => {
      log.line(`Bilans paliwa – październik (wpis Podatek 2 000 niezadokowany): ${await fuelOctober(r.page)}`)
      await go(r.page, '1', 'page-bridge')
      const dlg = await openDelivery(r.page, '21.10.2026', '+2 000,00')
      log.obj('DO.4 okno (21.10)', await dialogState(r.page))
      const tax = dlg.getByTestId('docking-tax')
      await tax.click()
      await tax.press('Control+a')
      await tax.pressSequentially('1500')
      await tax.press('Tab')
      await r.page.waitForTimeout(400)
      log.obj('DO.4 okno – 1 500 / 500', await dialogState(r.page))
      await dlg.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(3000)
      log.obj('dokowanie T3', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === T3).map((x) => x.rec))
      const oct = await fuelOctober(r.page)
      log.line(`Bilans paliwa – październik (po dokowaniu 1 500 / 500): ${oct}`)
      await readAt('DO.4', 'rok; wpis Podatek 2 000 (21.10) zadokowany 1 500 podatek / 500 osłony – Wywiad, październik', folders, async () => ({ bilansPazdziernik: oct, ...(await bridgeValues(r.page)) }))
      await go(r.page, '9', 'page-intel')
      await shot(r.page, 'DO.4-wywiad-pazdziernik')
    })
    await close('faza B')
    // Przelew do urzędu skarbowego 1 800 zł 22.10 (październik).
    writeTx(DATA, { id: '01KMXD0T000000000000000063', date: '2026-10-22', amount: -180000, kind: 'tax', counterparty: 'URZĄD SKARBOWY', title: 'PIT-38 ZA 2025' })
    r = await open('faza B2', false)
    await log.step('DO.4 przelew do US w październiku', async () => {
      const oct = await fuelOctober(r.page)
      log.line(`Bilans paliwa – październik (po przelewie do US 1 800): ${oct}`)
      await readAt('DO.4', 'rok; + przelew do US 1 800 (22.10) – Wywiad, październik', folders, async () => ({ bilansPazdziernik: oct, ...(await bridgeValues(r.page)) }))
    })
    await close('faza B2')

    // ---- Faza C (DO.17): zwrot 500 zł Bieżące 03.11 z wypływem; dopłata 200 zł tylko w mBanku.
    b.change('DO.17: zwrot 500 zł Bieżące 03.11', () => writePayout(ICTJ, { id: RF, kind: 'return', date: '2026-11-03', amount: 500, pool: 'current' }))
    bankXtb(DATA, '01KMXD0T000000000000000064', '2026-11-03', -50000)
    bankXtb(DATA, '01KMXD0T000000000000000065', '2026-11-03', -20000)
    r = await open('faza C', false)
    await log.step('DO.17', async () => {
      log.obj('DO.17 przed', await readAt('DO.17', 'rok; zwrot 500 (Bieżące) z wypływem + dopłata 200 tylko w mBanku – przed „Zadokuj”', folders, () => bridgeValues(r.page)))
      log.obj('DO.17 odprawa', (await briefing(r.page)).filter((x) => /irewall|XTB|Zwrot/.test(x)))
      await openDelivery(r.page, '03.11.2026', '−500,00')
      log.obj('DO.17 okno', await dialogState(r.page))
      await shot(r.page, 'DO.17-okno-b')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(800)
      const dialogs = await r.page.locator('[role="dialog"]').allInnerTexts()
      log.line(`okna po kliknięciu „Zadokuj”: ${dialogs.map((t) => t.replace(/\s+/g, ' ')).join(' || ') || '(żadnego)'}`)
      log.line(`toast: ${await toasts(r.page)}`)
      await shot(r.page, 'DO.17-po-kliknieciu-b')
      await r.page.waitForTimeout(2500)
      log.obj('dokowanie RF', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === RF).map((x) => x.rec))
      log.obj('DO.17 po', await readAt('DO.17', 'rok; po „Zadokuj” zwrotu 500 wbrew rozkazowi', folders, () => bridgeValues(r.page)))
      log.obj('DO.17 odprawa po', (await briefing(r.page)).filter((x) => /irewall|XTB|Zwrot/.test(x)))
      await go(r.page, '8', 'page-command')
      log.line(`Dowództwo: ${(await r.page.getByTestId('page-command').innerText()).split('\n').filter((l) => /narusz|irewall|wbrew|Dziś/.test(l)).join(' | ')}`)
      await shot(r.page, 'DO.17-dowodztwo-b')
    })
    await close('faza C')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.3, DO.4, DO.17 (powtórka)'))
  }
})
