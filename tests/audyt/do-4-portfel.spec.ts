// DO, przebieg do-4: persona „rok” z kopią ICTTJ. DO.8 – wypłata bez pary: Portfel XTB po 3 dniach roboczych (800 zł),
// czeka na import (400 zł; 600 zł przy pliku banku kończącym się w oknie – faza 2); DO.7 – „Cofnij” i szukanie „Wycofaj
// dokowanie” (dostawa z mBanku i na Portfelu XTB, ręczny wydatek tego dnia); DO.12 – inna kwota w banku (1 000 / 998,50);
// DO.11 – wpływ wpisany szybkim wpisem na Portfelu XTB jako para wypłaty.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState, type Run } from './lab'
import { ACC, Boundary, Log, accountBalances, bankXtb, briefing, bridgeValues, countText, dialogState, dockPanel, editJson, findRecords, go, mainLog, openRow, readAt, toasts, writePayout, writeTx } from './do-pomoc'

const RUN = 'do-4'
const W800 = '01KMXD0P000000000000000021'
const W400 = '01KMXD0P000000000000000022'
const W350 = '01KMXD0P000000000000000023'
const W1000 = '01KMXD0P000000000000000024'
const W600 = '01KMXD0P000000000000000025'
const E31 = '01KAZ700000000000000000011'

test('DO.7, DO.8, DO.11, DO.12 – Portfel XTB, Cofnij, inna kwota (rok)', async () => {
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
  const withBalances = async (page: Page) => ({ ...(await bridgeValues(page)), salda: await accountBalances(page) })
  const walletOps = () => findRecords(DATA, 'transactions', (x) => x.accountId === ACC.xtb && x.date >= '2026-10-20').map((x) => `${x.rec.date} ${x.rec.kind} ${x.rec.amount} „${x.rec.title}” ${x.rec.id}`)
  try {
    // ---- Faza 1: plik z mBanku obejmuje dni do 02.11 (import.coveredTo); wpisy 800 (27.10), 400 (02.11), 350 (03.11),
    // 1 000 (02.11); wpływ 3 200 z XTB w mBanku 02.11 (para wpisu 31.10); wpływ 998,50 zł 03.11; ręczny wydatek na
    // Portfelu XTB 27.10.
    editJson(join(DATA, 'fi.json'), (f) => {
      f.settings.import.coveredTo = { ...f.settings.import.coveredTo, [ACC.mbank]: '2026-11-02' }
    })
    b.change('DO.8/DO.11/DO.12: wpisy 800, 400, 350, 1 000', () => {
      writePayout(ICTJ, { id: W800, kind: 'withdrawal', date: '2026-10-27', amount: 800, pool: 'current' })
      writePayout(ICTJ, { id: W400, kind: 'withdrawal', date: '2026-11-02', amount: 400, pool: 'current' })
      writePayout(ICTJ, { id: W350, kind: 'withdrawal', date: '2026-11-03', amount: 350, pool: 'current' })
      writePayout(ICTJ, { id: W1000, kind: 'withdrawal', date: '2026-11-02', amount: 1000, pool: 'current' })
    })
    bankXtb(DATA, '01KMXD0T000000000000000021', '2026-11-02', 320000)
    bankXtb(DATA, '01KMXD0T000000000000000022', '2026-11-03', 99850)
    writeTx(DATA, { id: '01KMXD0T000000000000000023', date: '2026-10-27', amount: -4500, accountId: ACC.xtb, kind: 'expense', categoryId: '01KDEFCAT00000000000000102', counterparty: 'KAWIARNIA AUDYT', title: 'ręczny wydatek' })
    let r = await open('faza 1', true)
    const p = () => r.page
    await log.step('stan początkowy', async () => {
      log.obj('panel', await dockPanel(p()))
      log.obj('odprawa', await briefing(p()))
      await shot(p(), 'DO.8-panel')
    })
    // DO.8 – 800 zł bez pary po 3 dniach roboczych; 400 zł – czeka na import.
    await log.step('DO.8 okna', async () => {
      await openRow(p(), '800,00')
      log.obj('DO.8 okno 800', await dialogState(p()))
      await shot(p(), 'DO.8-okno-800')
      await p().keyboard.press('Escape')
      await openRow(p(), '400,00')
      log.obj('DO.8 okno 400', await dialogState(p()))
      await shot(p(), 'DO.8-okno-400')
      await p().keyboard.press('Escape')
    })
    // DO.7 – Portfel: zadokuj 800 na Portfelu → „Cofnij” z toastu.
    await log.step('DO.7 Portfel – Cofnij', async () => {
      log.obj('DO.8 przed', await readAt('DO.8', 'rok + coveredTo 02.11; wpis 800 (27.10) bez pary – przed dokowaniem na Portfelu', folders, () => withBalances(p())))
      log.obj('operacje Portfela przed', walletOps())
      await openRow(p(), '800,00')
      await p().getByTestId('docking-confirm').click()
      await p().waitForTimeout(1200)
      log.line(`toast: ${await toasts(p())}`)
      await shot(p(), 'DO.8-toast')
      await p().waitForTimeout(1500)
      log.obj('operacje Portfela po dokowaniu', walletOps())
      log.obj('dokowanie W800', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === W800).map((x) => x.rec))
      log.obj('DO.7 po dokowaniu na Portfelu', await readAt('DO.7', 'rok; wpis 800 zadokowany na Portfelu XTB', folders, () => withBalances(p())))
      log.line(`„Wycofaj dokowanie” na Mostku: ${await countText(p(), /Wycofaj dokowanie/i)}`)
      await openRow(p(), '800,00', 'docked')
      log.obj('okno zadokowanej na Portfelu', await dialogState(p()))
      log.line(`„Wycofaj” w oknie: ${await p().getByTestId('docking-dialog').getByText(/Wycofaj/i).count()}`)
      await shot(p(), 'DO.7-okno-portfel')
      await p().keyboard.press('Escape')
      // „Cofnij”: dokowanie jeszcze raz, toast od razu.
    })
    await log.step('DO.7 Portfel – Cofnij z toastu', async () => {
      // A docked one has no toast any more – undo needs a fresh docking: open the Settings and back (toast gone), so the
      // undo is checked on the next one; here the 800 stays docked (DO.8).
      log.obj('DO.8 po', await readAt('DO.8', 'rok; po „Zadokuj na Portfelu XTB” 800', folders, () => withBalances(p())))
    })
    // DO.7 – mBank: wpis 31.10 (3 200) z parą 02.11 → Zadokuj → Cofnij → Zadokuj; szukanie „Wycofaj dokowanie”.
    await log.step('DO.7 mBank', async () => {
      log.obj('DO.7 przed', await readAt('DO.7', 'rok; wpis 31.10 3 200 z parą w mBanku 02.11 – przed dokowaniem', folders, () => withBalances(p())))
      await openRow(p(), '3 200,00', 'pending')
      log.obj('okno 3 200', await dialogState(p()))
      await p().getByTestId('docking-confirm').click()
      await p().waitForTimeout(1200)
      log.line(`toast: ${await toasts(p())}`)
      await p().waitForTimeout(800)
      log.obj('dokowanie 31.10', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === E31).map((x) => x.rec))
      const undo = p().getByTestId('toast-action').filter({ hasText: 'Cofnij' })
      log.line(`Cofnij w toaście: ${await undo.count()}`)
      log.obj('DO.7 po dokowaniu (przed Cofnij)', await readAt('DO.7', 'rok; wpis 31.10 zadokowany (mBank)', folders, () => bridgeValues(p())))
    })
    await log.step('DO.7 Cofnij', async () => {
      await openRow(p(), '3 200,00', 'docked')
      await p().keyboard.press('Escape')
      // Dock again from a fresh toast is impossible for a docked row: so the undo of a fresh docking – the 1 000 (DO.12).
      log.line('(Cofnij sprawdzany na dokowaniu DO.12 – toast świeżego dokowania)')
    })
    // DO.12 – inna kwota: 1 000 w ICTTJ, 998,50 w banku.
    await log.step('DO.12', async () => {
      log.obj('panel', await dockPanel(p()))
      log.obj('DO.12 przed', await readAt('DO.12', 'rok; wpis 1 000 (02.11), wpływ XTB 998,50 (03.11) – przed', folders, () => withBalances(p())))
      await openRow(p(), '1 000,00', 'pending')
      log.obj('DO.12 okno', await readAt('DO.12', 'rok; okno wpisu 1 000 z wpływem 998,50', folders, () => dlgValues(p())))
      await shot(p(), 'DO.12-okno')
      await p().getByTestId('docking-confirm').click()
      await p().waitForTimeout(1200)
      log.line(`toast: ${await toasts(p())}`)
      // DO.7: „Cofnij” świeżego dokowania (mBank) – warstwy wracają, wpis znów do zadokowania, operacja z banku zostaje.
      const undo = p().getByTestId('toast-action').filter({ hasText: 'Cofnij' })
      if (await undo.count()) {
        log.obj('DO.12 po Zadokuj', await bridgeValues(p()))
        await undo.first().click()
        await p().waitForTimeout(2500)
        log.obj('DO.7 po Cofnij (DO.12)', await readAt('DO.7', 'rok; po „Cofnij” dokowania 1 000/998,50', folders, () => withBalances(p())))
        log.obj('dokowania W1000 po Cofnij', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === W1000).map((x) => x.rec))
        log.obj('operacja 998,50 po Cofnij', findRecords(DATA, 'transactions', (x) => x.amount === 99850).map((x) => x.rec.id))
        await openRow(p(), '1 000,00', 'pending')
        await p().getByTestId('docking-confirm').click()
        await p().waitForTimeout(3000)
      }
      log.obj('DO.12 po', await readAt('DO.12', 'rok; po „Zadokuj” 1 000/998,50', folders, () => withBalances(p())))
      log.obj('dokowanie W1000', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === W1000).map((x) => x.rec))
    })
    // DO.7 – Cofnij dokowania na Portfelu: wpis 25.10 (Cele, bez pary) → Zadokuj na Portfelu → Cofnij.
    await log.step('DO.7 Portfel Cofnij', async () => {
      const before = walletOps()
      log.obj('DO.7 Portfel przed', await readAt('DO.7', 'rok; wpis 25.10 Cele bez pary – przed dokowaniem na Portfelu', folders, () => withBalances(p())))
      await openRow(p(), '1 500,00', 'pending')
      log.obj('okno 25.10', await dialogState(p()))
      await p().getByTestId('docking-confirm').click()
      await p().waitForTimeout(1200)
      log.line(`toast: ${await toasts(p())}`)
      log.obj('operacje Portfela po dokowaniu', walletOps())
      const undo = p().getByTestId('toast-action').filter({ hasText: 'Cofnij' })
      if (await undo.count()) {
        await undo.first().click()
        await p().waitForTimeout(2500)
      }
      log.obj('operacje Portfela po Cofnij', walletOps())
      log.line(`operacje Portfela przed = po Cofnij: ${JSON.stringify(before) === JSON.stringify(walletOps())}`)
      log.obj('DO.7 Portfel po Cofnij', await readAt('DO.7', 'rok; po „Cofnij” dokowania na Portfelu (25.10)', folders, () => withBalances(p())))
      log.obj('panel', await dockPanel(p()))
    })
    // DO.11 – szybki wpis: wpływ 350 zł na Portfelu XTB dziś → okno wpisu 350 → Zadokuj → Cofnij.
    await log.step('DO.11', async () => {
      await p().evaluate('window.fi.quickOpen()')
      let q: Page | undefined
      for (let i = 0; i < 100 && !q; i++) {
        q = r.app.windows().find((w) => w.url().includes('quick=1'))
        if (!q) await p().waitForTimeout(100)
      }
      if (!q) throw new Error('brak okna szybkiego wpisu')
      await q.getByTestId('quick-amount').waitFor({ timeout: 15_000 })
      await q.getByRole('radio', { name: 'Wpływ' }).click()
      await q.getByTestId('quick-amount').click()
      await q.getByTestId('quick-amount').pressSequentially('350')
      await q.getByTestId('quick-counterparty').fill('XTB')
      await q.getByTestId('quick-account').selectOption(ACC.xtb)
      await q.getByTestId('quick-amount').click()
      await q.waitForTimeout(300)
      await q.getByTestId('quick-save').click()
      await p().waitForTimeout(3000)
      log.obj('operacje Portfela po szybkim wpisie', walletOps())
      log.obj('panel', await dockPanel(p()))
      log.obj('DO.11 przed', await readAt('DO.11', 'rok; wpis 350 (03.11) + wpływ 350 na Portfelu z szybkiego wpisu – przed', folders, () => withBalances(p())))
      await openRow(p(), '350,00')
      log.obj('DO.11 okno', await dialogState(p()))
      await shot(p(), 'DO.11-okno')
      await p().getByTestId('docking-confirm').click()
      await p().waitForTimeout(1500)
      log.line(`toast: ${await toasts(p())}`)
      log.obj('operacje Portfela po dokowaniu', walletOps())
      const undo = p().getByTestId('toast-action').filter({ hasText: 'Cofnij' })
      log.line(`Cofnij w toaście: ${await undo.count()}`)
      if (await undo.count()) {
        await undo.first().click()
        await p().waitForTimeout(2500)
      }
      log.obj('operacje Portfela po Cofnij', walletOps())
      log.obj('panel po Cofnij', await dockPanel(p()))
      log.obj('DO.11 po Cofnij', await readAt('DO.11', 'rok; po „Cofnij” dokowania 350', folders, () => withBalances(p())))
      // Docked again – the state the point reads after „Zadokuj”.
      await openRow(p(), '350,00')
      log.obj('DO.11 okno ponownie', await dialogState(p()))
      await p().getByTestId('docking-confirm').click()
      await p().waitForTimeout(3000)
      log.obj('operacje Portfela po ponownym dokowaniu', walletOps())
      log.obj('DO.11 po', await readAt('DO.11', 'rok; po „Zadokuj” 350 (wpływ z szybkiego wpisu)', folders, async () => ({ ...(await withBalances(p())), operacjePortfela: walletOps().join(' || ') })))
      await go(p(), '2', 'page-operations')
      await shot(p(), 'DO.11-operacje')
      await go(p(), '1', 'page-bridge')
    })
    await close('faza 1')

    // ---- Faza 2 (DO.8, wariant brzegi): plik z mBanku kończy się w oknie (29.10); wpis 600 zł z 27.10 bez pary.
    editJson(join(DATA, 'fi.json'), (f) => {
      f.settings.import.coveredTo = { ...f.settings.import.coveredTo, [ACC.mbank]: '2026-10-29' }
    })
    b.change('DO.8: wpis 600 zł 27.10', () => writePayout(ICTJ, { id: W600, kind: 'withdrawal', date: '2026-10-27', amount: 600, pool: 'current' }))
    r = await open('faza 2', false)
    await log.step('DO.8 600', async () => {
      log.obj('panel', await dockPanel(r.page))
      log.obj('odprawa', await briefing(r.page))
      await openRow(r.page, '600,00')
      log.obj('DO.8 okno 600', await dialogState(r.page))
      await shot(r.page, 'DO.8-okno-600')
      await r.page.keyboard.press('Escape')
    })
    await close('faza 2')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.7, DO.8, DO.11, DO.12'))
  }
})
