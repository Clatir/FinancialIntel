// DO, przebieg do-5: persona „rok” z kopią ICTTJ. DO.9 – polskie dni wolne w oknie 3 dni roboczych (02.04.2026 →
// 08.04, 23.12.2025 → 31.12); DO.15 – wypłaty sprzed startu budżetu (para przed startem / para po starcie); DO.16 –
// „Pomiń wpis” i „przywróć” (z parą i bez pary); DO.10 – wpływ z XTB bez wpisu w ICTTJ, potem wpis dopisany na żywo,
// potem „Nie czytaj ICTTJ na tym komputerze”.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState, type Run } from './lab'
import { Boundary, Log, bankXtb, briefing, bridgeValues, dialogState, dockPanel, findRecords, go, mainLog, openDelivery, readAt, settingsTab, toasts, writePayout } from './do-pomoc'

const RUN = 'do-5'
const H600 = '01KMXD0P000000000000000031'
const H700 = '01KMXD0P000000000000000032'
const S1 = '01KMXD0P000000000000000033'
const S2 = '01KMXD0P000000000000000034'
const X1 = '01KMXD0P000000000000000035'

test('DO.9, DO.15, DO.16, DO.10 – dni wolne, sprzed startu, pomiń, wpływ bez wpisu (rok)', async () => {
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
  const expandRest = async (page: Page) => {
    const s = page.getByTestId('bridge-docking').locator('summary')
    if ((await s.count()) && !(await page.getByTestId('bridge-docking').locator('details').first().getAttribute('open').then((x) => x !== null))) await s.click()
    await page.waitForTimeout(300)
  }
  try {
    // ---- Faza 1: DO.9 (dni wolne), DO.15 (sprzed startu), DO.16 (pomiń / przywróć).
    b.change('DO.9/DO.15: wpisy 600 (02.04.2026), 700 (23.12.2025), 1 100 (28.08.2025), 1 200 (31.08.2025)', () => {
      writePayout(ICTJ, { id: H600, kind: 'withdrawal', date: '2026-04-02', amount: 600, pool: 'current' })
      writePayout(ICTJ, { id: H700, kind: 'withdrawal', date: '2025-12-23', amount: 700, pool: 'current' })
      writePayout(ICTJ, { id: S1, kind: 'withdrawal', date: '2025-08-28', amount: 1100, pool: 'current' })
      writePayout(ICTJ, { id: S2, kind: 'withdrawal', date: '2025-08-31', amount: 1200, pool: 'current' })
    })
    bankXtb(DATA, '01KMXD0T000000000000000031', '2026-04-08', 60000)
    bankXtb(DATA, '01KMXD0T000000000000000032', '2025-12-31', 70000)
    bankXtb(DATA, '01KMXD0T000000000000000033', '2025-08-29', 110000)
    bankXtb(DATA, '01KMXD0T000000000000000034', '2025-09-02', 120000)
    // DO.16: para wpisu 31.10 (3 200) w mBanku 02.11; wpis 25.10 (1 500, Cele) bez pary.
    bankXtb(DATA, '01KMXD0T000000000000000035', '2026-11-02', 320000)
    let r = await open('faza 1', true)
    const p = () => r.page
    await log.step('panel', async () => {
      await expandRest(p())
      log.obj('panel', await dockPanel(p()))
      log.obj('odprawa', await briefing(p()))
      await shot(p(), 'DO.9-panel')
    })
    await log.step('DO.9', async () => {
      for (const [date, amount] of [['02.04.2026', '600,00'], ['23.12.2025', '700,00']]) {
        await go(p(), '1', 'page-bridge')
        await openDelivery(p(), date!, '+' + amount!)
        const d = await dialogState(p())
        log.obj(`DO.9 okno ${amount}`, d)
        await readAt('DO.9', `rok; wpis ${amount} z parą po dniach wolnych – okno`, folders, async () => ({ zrodlo: String(d.zrodlo), konto: String(d.konto), calosc: String(d.calosc) }))
        await shot(p(), `DO.9-okno-${amount.replace(',', '_')}`)
        await p().keyboard.press('Escape')
      }
    })
    await log.step('DO.15', async () => {
      await go(p(), '1', 'page-bridge')
      await expandRest(p())
      log.obj('DO.15 przed', await readAt('DO.15', 'rok; wpisy sprzed startu: 1 100 (para 29.08.2025), 1 200 (para 02.09.2025) – przed dokowaniem', folders, () => bridgeValues(p())))
      await shot(p(), 'DO.15-panel')
      const row = p().locator('[data-testid="docking-row"]').filter({ hasText: '1 200,00' })
      log.line(`wiersz 1 200: ${await row.count()} ${await row.first().textContent().catch(() => '')}`)
      if (await row.count()) {
        await row.first().click()
        await p().getByTestId('docking-dialog').waitFor()
        log.obj('DO.15 okno 1 200', await dialogState(p()))
        await p().getByTestId('docking-confirm').click()
        await p().waitForTimeout(3500)
        log.obj('DO.15 po', await readAt('DO.15', 'rok; po „Zadokuj” wpisu 1 200 (31.08.2025, para 02.09.2025)', folders, () => bridgeValues(p())))
      }
      await expandRest(p())
      log.obj('panel po', await dockPanel(p()))
    })
    await log.step('DO.16 pomiń', async () => {
      await go(p(), '1', 'page-bridge')
      log.obj('DO.16 przed', await readAt('DO.16', 'rok; wpis 31.10 3 200 z parą 02.11, wpis 25.10 1 500 bez pary – przed pominięciem', folders, () => bridgeValues(p())))
      for (const [date, amount] of [['31.10.2026', '+3 200,00'], ['25.10.2026', '+1 500,00']]) {
        await openDelivery(p(), date!, amount!)
        log.obj(`okno ${amount}`, await dialogState(p()))
        await p().getByTestId('docking-skip').click()
        await p().waitForTimeout(1500)
      }
      await expandRest(p())
      log.obj('DO.16 po pominięciu', await readAt('DO.16', 'rok; po „Pomiń wpis” obu', folders, () => bridgeValues(p())))
      log.obj('odprawa po pominięciu', await briefing(p()))
      log.obj('fi.json ictj.skipped', JSON.parse(readFileSync(join(DATA, 'fi.json'), 'utf8')).settings.ictj)
      await shot(p(), 'DO.16-pominiete')
      const restore = p().getByTestId('bridge-docking').getByRole('button', { name: 'przywróć' })
      log.line(`przyciski „przywróć”: ${await restore.count()}`)
      while (await restore.count()) {
        await restore.first().click()
        await p().waitForTimeout(1200)
      }
      await expandRest(p())
      log.obj('DO.16 po przywróceniu', await readAt('DO.16', 'rok; po „przywróć” obu', folders, () => bridgeValues(p())))
    })
    await close('faza 1')

    // ---- Faza 2 (DO.10): wpływ z XTB 1 000 zł w mBanku 02.11 bez wpisu w ICTTJ.
    bankXtb(DATA, '01KMXD0T000000000000000036', '2026-11-02', 100000)
    r = await open('faza 2', false)
    await log.step('DO.10 bez wpisu', async () => {
      log.obj('odprawa', await briefing(p()))
      log.obj('DO.10 przed', await readAt('DO.10', 'rok; wpływ XTB 1 000 (02.11) bez wpisu – przed dokowaniem', folders, () => bridgeValues(p())))
      await shot(p(), 'DO.10-mostek')
      await openDelivery(p(), '02.11.2026', '+1 000,00')
      log.obj('DO.10 okno', await dialogState(p()))
      await shot(p(), 'DO.10-okno')
      await p().getByTestId('docking-confirm').click()
      await p().waitForTimeout(1200)
      log.line(`toast: ${await toasts(p())}`)
      await p().waitForTimeout(2000)
      log.obj('DO.10 po dokowaniu', await readAt('DO.10', 'rok; po „Zadokuj” wpływu bez wpisu', folders, () => bridgeValues(p())))
      log.obj('odprawa po', await briefing(p()))
    })
    await log.step('DO.10 wpis dopisany na żywo', async () => {
      b.change('DO.10: wpis 1 000 zł Cele 02.11 (przy działającej aplikacji)', () => writePayout(ICTJ, { id: X1, kind: 'withdrawal', date: '2026-11-02', amount: 1000, pool: 'goals' }))
      let found = ''
      for (let i = 0; i < 40; i++) {
        const rows = (await dockPanel(p())).rows.filter((x) => x.includes('02.11.2026') && x.includes('1 000,00'))
        found = rows.join(' || ')
        if (rows.some((x) => x.includes('Cele'))) break
        await p().waitForTimeout(1000)
      }
      log.line(`po dopisaniu wpisu: ${found}`)
      log.obj('panel', await dockPanel(p()))
      log.obj('odprawa', await briefing(p()))
      log.obj('DO.10 po połączeniu', await readAt('DO.10', 'rok; wpis Cele 1 000 dopisany – połączony z zadokowanym wpływem', folders, () => bridgeValues(p())))
      const row = p().locator('[data-testid="docking-row"]').filter({ hasText: '02.11.2026' }).filter({ hasText: 'Cele' })
      if (await row.count()) {
        await row.first().click()
        await p().getByTestId('docking-dialog').waitFor()
        log.obj('DO.10 okno po połączeniu', await dialogState(p()))
        await shot(p(), 'DO.10-okno-polaczony')
        await p().getByTestId('docking-confirm').click()
        await p().waitForTimeout(3000)
        log.obj('dokowania wpływu 02.11', findRecords(DATA, 'dockings', (x) => x.transactionId === '01KMXD0T000000000000000036').map((x) => x.rec))
        log.obj('DO.10 po ponownym dokowaniu', await readAt('DO.10', 'rok; po ponownym „Zadokuj” z pulą Cele', folders, () => bridgeValues(p())))
      }
    })
    await log.step('DO.10 bez folderu ICTTJ', async () => {
      await settingsTab(p(), 'ictj')
      await p().getByTestId('ictj-off').click()
      await p().waitForTimeout(2000)
      log.line(`status ICTTJ: ${await p().getByTestId('ictj-status').innerText().catch(() => '?')}`)
      await go(p(), '1', 'page-bridge')
      log.obj('panel bez ICTTJ', await dockPanel(p()))
      log.obj('odprawa bez ICTTJ', await briefing(p()))
      await shot(p(), 'DO.10-bez-ictj')
      log.obj('DO.10 bez ICTTJ', await readAt('DO.10', 'rok; ICTTJ wyłączony na tym komputerze', folders, () => bridgeValues(p())))
    })
    await close('faza 2')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.9, DO.10, DO.15, DO.16'))
  }
})
