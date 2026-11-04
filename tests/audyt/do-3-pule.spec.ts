// DO, przebieg do-3: persona „rok” (osłony poniżej celu) z kopią folderu ICTTJ. DO.3 – pula Cele (cele ICTTJ najpierw;
// wariant 2: wszystkie cele pełne), DO.4 – pula Podatek (poza budżetem, przelew do urzędu, podział zmieniony), DO.5 –
// zwrot do masy z puli Podatek, DO.17 – firewall: zwrot 500 zł z puli Bieżące i dopłata 200 zł tylko w mBanku.
// Każda faza: zmiany plików przed start(), granica ICTTJ przed i po.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState, type Run } from './lab'
import { ACC, Boundary, Log, bankXtb, briefing, bridgeValues, dialogState, dockPanel, editJson, findRecords, go, mainLog, openRow, readAt, starmap, toasts, writePayout, writeTx } from './do-pomoc'

const RUN = 'do-3'
const FORECAST = 'forecasts/01KAZ710000000000000000001.json'
const C1 = '01KMXD0P000000000000000011'
const C2 = '01KMXD0P000000000000000012'
const TX1 = '01KMXD0P000000000000000013'
const TX2 = '01KMXD0P000000000000000014'
const RT = '01KMXD0P000000000000000015'
const RF = '01KMXD0P000000000000000016'
const WAKACJE = 'goals/01KAZ300000000000000000002.json'

/** Lines of a screen with the words of the point (income, tax, costs, firewall …). */
async function linesOf(page: Page, key: string, testId: string, re: RegExp): Promise<string> {
  await go(page, key, testId)
  await page.waitForTimeout(800)
  const t = await page.getByTestId(testId).innerText()
  return t
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, all) => re.test(l) || (i > 0 && re.test(all[i - 1]!)))
    .join(' | ')
}

test('DO.3, DO.4, DO.5, DO.17 – pule Cele i Podatek, firewall (rok)', async () => {
  test.setTimeout(40 * 60_000)
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
  const money = async (page: Page) => ({
    ...(await bridgeValues(page)),
    plan: await linesOf(page, '4', 'page-month', /Przych|trading|Trading|XTB|odat|PIT|oszt/),
    radar: await linesOf(page, '7', 'page-radar', /PIT|odat/)
  })
  try {
    // ---- Faza 1 (DO.3 wariant 1): scenariusz ICTTJ – „Nowe stanowisko tradingowe” 1 000 zł, „Wkład własny” wyłączony;
    // wypłata 1 500 zł z puli Cele (02.11) i wpływ 1 500 zł w mBanku (03.11).
    b.change('DO.3: scenariusz – cel ICTTJ 1 000 zł, drugi wyłączony', () =>
      editJson(join(ICTJ, FORECAST), (f) => {
        f.updatedAt = '2026-11-03T10:00:00.000Z'
        f.goals = f.goals.map((g: Record<string, unknown>) => (g.id === '01KAZ720000000000000000001' ? { ...g, enabled: false } : { ...g, amount: 1000 }))
      })
    )
    b.change('DO.3: wypłata 1 500 zł Cele 02.11', () => writePayout(ICTJ, { id: C1, kind: 'withdrawal', date: '2026-11-02', amount: 1500, pool: 'goals' }))
    bankXtb(DATA, '01KMXD0T000000000000000011', '2026-11-03', 150000)
    let r = await open('faza 1', true)
    await log.step('DO.3 wariant 1', async () => {
      await r.page.waitForTimeout(3000)
      log.obj('cele (pliki)', findRecords(DATA, 'goals', () => true).map((x) => `${x.rec.name} p${x.rec.priority} ${x.rec.source} target ${x.rec.target} arch ${x.rec.archived}`))
      log.obj('DO.3 mapa przed', await starmap(r.page))
      await shot(r.page, 'DO.3-mapa-przed')
      log.obj('DO.3 przed', await readAt('DO.3', 'rok + scenariusz zmieniony; wypłata Cele 1 500 z parą, przed „Zadokuj”', folders, () => bridgeValues(r.page)))
      await openRow(r.page, '1 500,00', 'pending')
      log.obj('DO.3 okno', await readAt('DO.3', 'rok; okno dokowania puli Cele 1 500 – propozycja', folders, () => dlgValues(r.page)))
      await shot(r.page, 'DO.3-okno')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(1200)
      log.line(`toast: ${await toasts(r.page)}`)
      await r.page.waitForTimeout(2500)
      log.obj('dokowanie C1', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === C1).map((x) => x.rec))
      log.obj('DO.3 po', await readAt('DO.3', 'rok; po „Zadokuj” puli Cele 1 500', folders, () => bridgeValues(r.page)))
      log.obj('DO.3 mapa po', await starmap(r.page))
      await shot(r.page, 'DO.3-mapa-po')
    })
    await close('faza 1')

    // ---- Faza 2 (DO.3 wariant 2): wszystkie cele pełne (Wakacje 2027: cel = obecna kwota), wypłata 700 zł z puli Cele.
    const wak = findRecords(DATA, 'goals', (x) => x.name === 'Wakacje 2027')[0]
    log.line(`Wakacje 2027 przed zmianą celu: ${JSON.stringify(wak?.rec.target)}`)
    b.change('DO.3: wypłata 700 zł Cele 03.11', () => writePayout(ICTJ, { id: C2, kind: 'withdrawal', date: '2026-11-03', amount: 700, pool: 'goals' }))
    bankXtb(DATA, '01KMXD0T000000000000000012', '2026-11-03', 70000)
    r = await open('faza 2a', false)
    let wakAmount = ''
    await log.step('DO.3 kwota Wakacji', async () => {
      const m = await starmap(r.page)
      log.obj('mapa', m)
      wakAmount = /Wakacje 2027: \d+(?:DOL)?▲▼([\d\s]+,\d\d) zł/.exec(m.find((x) => x.startsWith('Wakacje 2027')) ?? '')?.[1] ?? ''
      log.line(`Wakacje 2027 – kwota z ekranu: ${wakAmount}`)
    })
    await close('faza 2a')
    const grosze = Math.round(Number(wakAmount.replace(/\s/g, '').replace(',', '.')) * 100)
    if (grosze > 0) editJson(join(DATA, WAKACJE), (g) => ({ ...g, target: grosze, updatedAt: '2026-11-03T13:00:00.000Z' }))
    log.line(`Wakacje 2027 – cel ustawiony na ${grosze} gr`)
    r = await open('faza 2b', false)
    await log.step('DO.3 wariant 2', async () => {
      log.obj('DO.3 mapa – wszystkie pełne', await starmap(r.page))
      log.obj('DO.3 w2 przed', await readAt('DO.3', 'rok; wariant 2 – wszystkie cele pełne; wypłata Cele 700 z parą, przed „Zadokuj”', folders, () => bridgeValues(r.page)))
      await openRow(r.page, '700,00', 'pending')
      log.obj('DO.3 w2 okno', await readAt('DO.3', 'rok; wariant 2 – okno puli Cele 700', folders, () => dlgValues(r.page)))
      await shot(r.page, 'DO.3-okno-wariant2')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(3500)
      log.obj('DO.3 w2 po', await readAt('DO.3', 'rok; wariant 2 – po „Zadokuj” 700', folders, () => bridgeValues(r.page)))
    })
    await close('faza 2b')

    // ---- Faza 3 (DO.4): wypłata 2 000 zł z puli Podatek (02.11) z parą w mBanku (02.11).
    b.change('DO.4: wypłata 2 000 zł Podatek 02.11', () => writePayout(ICTJ, { id: TX1, kind: 'withdrawal', date: '2026-11-02', amount: 2000, pool: 'tax' }))
    bankXtb(DATA, '01KMXD0T000000000000000013', '2026-11-02', 200000)
    r = await open('faza 3', false)
    await log.step('DO.4 pierwszy wpis', async () => {
      log.obj('DO.4 przed', await readAt('DO.4', 'rok; wypłata Podatek 2 000 z parą, przed „Zadokuj”', folders, () => money(r.page)))
      await go(r.page, '1', 'page-bridge')
      await openRow(r.page, '2 000,00', 'pending')
      log.obj('DO.4 okno', await readAt('DO.4', 'rok; okno puli Podatek 2 000 – propozycja', folders, () => dlgValues(r.page)))
      await shot(r.page, 'DO.4-okno')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(3500)
      log.obj('DO.4 po', await readAt('DO.4', 'rok; po „Zadokuj” Podatek 2 000', folders, () => money(r.page)))
      await go(r.page, '1', 'page-bridge')
      await shot(r.page, 'DO.4-mostek-po')
      await go(r.page, '7', 'page-radar')
      await shot(r.page, 'DO.4-radar')
    })
    await close('faza 3')

    // ---- Faza 4 (DO.4): przelew do urzędu skarbowego 1 800 zł (03.11); drugi wpis Podatek 2 000 zł (03.11) z parą –
    // podział zmieniony: podatek 1 500, reszta osłony.
    writeTx(DATA, { id: '01KMXD0T000000000000000014', date: '2026-11-03', amount: -180000, kind: 'tax', counterparty: 'URZĄD SKARBOWY', title: 'PIT-38 ZA 2025' })
    b.change('DO.4: drugi wpis 2 000 zł Podatek 03.11', () => writePayout(ICTJ, { id: TX2, kind: 'withdrawal', date: '2026-11-03', amount: 2000, pool: 'tax' }))
    bankXtb(DATA, '01KMXD0T000000000000000015', '2026-11-03', 200000)
    r = await open('faza 4', false)
    await log.step('DO.4 przelew do urzędu i drugi wpis', async () => {
      log.obj('DO.4 po przelewie, przed 2. wpisem', await readAt('DO.4', 'rok; przelew do US 1 800; 2. wpis Podatek 2 000 niezadokowany', folders, () => money(r.page)))
      await go(r.page, '1', 'page-bridge')
      const dlg = await openRow(r.page, '2 000,00', 'pending')
      log.obj('DO.4 okno 2', await dialogState(r.page))
      const tax = dlg.getByTestId('docking-tax')
      await tax.click()
      await tax.press('Control+a')
      await tax.pressSequentially('1500')
      await tax.press('Tab')
      await r.page.waitForTimeout(400)
      log.obj('DO.4 okno 2 – podatek 1 500', await readAt('DO.4', 'rok; okno 2. wpisu Podatek: podatek 1 500, reszta osłony', folders, () => dlgValues(r.page)))
      await shot(r.page, 'DO.4-okno-2')
      await dlg.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(3500)
      log.obj('dokowanie TX2', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === TX2).map((x) => x.rec))
      log.obj('DO.4 po 2. wpisie', await readAt('DO.4', 'rok; po „Zadokuj” 2. wpisu (1 500 podatek / 500 osłony)', folders, () => money(r.page)))
    })
    await close('faza 4')

    // ---- Faza 5 (DO.5): zwrot do masy 300 zł z puli Podatek z wypływem 300 zł do XTB w mBanku.
    b.change('DO.5: zwrot 300 zł Podatek 03.11', () => writePayout(ICTJ, { id: RT, kind: 'return', date: '2026-11-03', amount: 300, pool: 'tax' }))
    bankXtb(DATA, '01KMXD0T000000000000000016', '2026-11-03', -30000)
    r = await open('faza 5', false)
    await log.step('DO.5', async () => {
      log.obj('DO.5 przed', await readAt('DO.5', 'rok; zwrot Podatek 300 z wypływem, przed „Zadokuj”', folders, () => money(r.page)))
      await go(r.page, '1', 'page-bridge')
      log.obj('DO.5 odprawa przed', await briefing(r.page))
      await openRow(r.page, '300,00', 'pending')
      log.obj('DO.5 okno', await dialogState(r.page))
      await shot(r.page, 'DO.5-okno')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(1200)
      log.line(`okna po kliknięciu: ${await r.page.locator('[role="dialog"]').allInnerTexts().then((x) => x.map((t) => t.replace(/\s+/g, ' ')).join(' || '))}`)
      log.line(`toast: ${await toasts(r.page)}`)
      await r.page.waitForTimeout(2500)
      log.obj('DO.5 po', await readAt('DO.5', 'rok; po „Zadokuj” zwrotu Podatek 300', folders, () => money(r.page)))
      await go(r.page, '1', 'page-bridge')
      log.obj('DO.5 odprawa po', await briefing(r.page))
      log.obj('DO.5 dowództwo', await linesOf(r.page, '8', 'page-command', /narusz|Narusz|irewall|XTB|03\.11|dziś/))
    })
    await close('faza 5')

    // ---- Faza 6 (DO.17): zwrot 500 zł z puli Bieżące z wypływem; dopłata 200 zł do XTB tylko w mBanku.
    b.change('DO.17: zwrot 500 zł Bieżące 03.11', () => writePayout(ICTJ, { id: RF, kind: 'return', date: '2026-11-03', amount: 500, pool: 'current' }))
    bankXtb(DATA, '01KMXD0T000000000000000017', '2026-11-03', -50000)
    bankXtb(DATA, '01KMXD0T000000000000000018', '2026-11-03', -20000)
    r = await open('faza 6', false)
    await log.step('DO.17', async () => {
      log.obj('DO.17 przed', await readAt('DO.17', 'rok; zwrot Bieżące 500 z wypływem + dopłata 200 tylko w mBanku, przed „Zadokuj”', folders, () => money(r.page)))
      await go(r.page, '1', 'page-bridge')
      log.obj('DO.17 odprawa', await briefing(r.page))
      log.obj('DO.17 panel', await dockPanel(r.page))
      await shot(r.page, 'DO.17-mostek')
      await openRow(r.page, '500,00', 'pending')
      log.obj('DO.17 okno', await dialogState(r.page))
      await shot(r.page, 'DO.17-okno')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(1000)
      log.line(`okna po kliknięciu „Zadokuj”: ${await r.page.locator('[role="dialog"]').allInnerTexts().then((x) => x.map((t) => t.replace(/\s+/g, ' ')).join(' || '))}`)
      log.line(`toast: ${await toasts(r.page)}`)
      await shot(r.page, 'DO.17-po-kliknieciu')
      await r.page.waitForTimeout(2500)
      log.obj('dokowanie RF', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === RF).map((x) => x.rec))
      log.obj('DO.17 po', await readAt('DO.17', 'rok; po „Zadokuj” zwrotu 500 (wbrew rozkazowi)', folders, () => money(r.page)))
      await go(r.page, '1', 'page-bridge')
      log.obj('DO.17 odprawa po', await briefing(r.page))
      log.obj('DO.17 dowództwo', await linesOf(r.page, '8', 'page-command', /narusz|Narusz|irewall|XTB|wbrew/))
      await shot(r.page, 'DO.17-dowodztwo')
    })
    await close('faza 6')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.3, DO.4, DO.5, DO.17'))
  }
  void ACC
})
