// DO, przebieg do-1: stan „spec-dok” (warstwy jak w przykładzie ze specyfikacji) zbudowany od zera (seedFolder) i własny
// folder ICTTJ przebiegu. DO.1 – kolejność rozładunku dostawy 5 000 zł (przed wpływem, z wpływem, okno, „Zadokuj”, po);
// DO.6 – dostawa 3 000 zł: podział ręczny, ponad kwotę, „przywróć propozycję”, „Zadokuj”, „Zapisz podział”.
// Granica ICTTJ: sumy przed każdym startem i po każdym zamknięciu; moje zmiany ICTTJ między dwiema sumami.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { seedFolder } from '../e2e/seed'
import { shot, start, type Run } from './lab'
import { ACC, Boundary, Log, RUNS, bankXtb, bridgeValues, dialogState, dockPanel, fillAmount, findRecords, go, mainLog, makeIctj, openRow, readAt, starmap, toasts, writePayout } from './do-pomoc'

const RUN = 'do-1'
const DIR = join(RUNS, RUN)
const DATA = join(DIR, 'dane')
const ICTJ = join(DIR, 'ictj')
const ROWER = '01KMXD0R000000000000000001'
const P1 = '01KMXD0P000000000000000001'
const P2 = '01KMXD0P000000000000000002'
const T1 = '01KMXD0T000000000000000001'
const T2 = '01KMXD0T000000000000000002'
const D = '2026-11-03'
const STATE = 'spec-dok (seed: start 2026-11-01, otwarcie mBank 29 640 zł, kadłub 15 000, Rower 2 000/3 000, pensja XI 4 000, koszty założone 3 650)'

test('DO.1, DO.6 – spec-dok: kolejność rozładunku, podział ręczny', async () => {
  test.setTimeout(30 * 60_000)
  const log = new Log(RUN)
  rmSync(DATA, { recursive: true, force: true })
  seedFolder(DATA, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start: '2026-11-01', initial: { shields: 1264000, hull: 1500000, goals: { [ROWER]: 200000 } } },
      layers: { ...s.layers, shieldSalaries: 3, hullMonths: 6, assumedCosts: 365000 }
    }),
    records: {
      balances: [{ date: '2026-11-01', accountId: ACC.mbank, kind: 'opening', amount: 2964000 }],
      months: [{ month: '2026-11', salary: 400000, envelopes: {} }],
      goals: [{ id: ROWER, name: 'Rower', target: 300000, priority: 1, source: 'own' }]
    }
  })
  makeIctj(ICTJ, { payouts: [] })
  const b = new Boundary(RUN, ICTJ)
  b.change('DO.1: wypłata 5 000 zł Bieżące z dnia D', () => writePayout(ICTJ, { id: P1, kind: 'withdrawal', date: D, amount: 5000, pool: 'current' }))
  const folders = { dataDir: DATA, ictjDir: ICTJ }
  let run: Run | null = null
  const open = async (label: string, fresh: boolean) => {
    b.check(`przed start() – ${label}`)
    run = await start(RUN, { dataDir: DATA, ictjDir: ICTJ, fresh })
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await run.page.waitForTimeout(4000)
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

  try {
    // ---- Faza 1: przed wpływem w mBanku (wpis ICTTJ czeka na import).
    let r = await open('faza 1', true)
    await log.step('DO.1 przed wpływem', async () => {
      const v = await readAt('DO.1', `${STATE}; przed wpływem w mBanku`, folders, () => bridgeValues(r.page))
      log.obj('DO.1 przed wpływem', v)
      await shot(r.page, 'DO.1-przed-wplywem')
    })
    await close('faza 1')

    // ---- Faza 2: wpływ 5 000 zł od XTB w mBanku z dnia D (jak po imporcie) → okno → „Zadokuj”.
    bankXtb(DATA, T1, D, 500000)
    r = await open('faza 2', false)
    await log.step('DO.1 z wpływem, przed Zadokuj', async () => {
      const v = await readAt('DO.1', `${STATE}; wpływ 5 000 w mBanku, przed „Zadokuj”`, folders, () => bridgeValues(r.page))
      log.obj('DO.1 z wpływem przed Zadokuj', v)
      await shot(r.page, 'DO.1-mostek-przed')
    })
    await log.step('DO.1 okno', async () => {
      await openRow(r.page, '5 000,00', 'pending')
      const v = await readAt('DO.1', `${STATE}; okno dokowania – propozycja`, folders, async () => {
        const d = await dialogState(r.page)
        return Object.fromEntries(Object.entries(d).map(([k, x]) => [k, String(x)]))
      })
      log.obj('DO.1 okno', v)
      await shot(r.page, 'DO.1-okno')
      await r.page.getByTestId('docking-confirm').click()
      const done = await r.page.getByTestId('docking-done').waitFor({ state: 'visible', timeout: 3000 }).then(
        async () => `widoczne: ${(await r.page.getByTestId('docking-done').innerText()).replace(/\s+/g, ' ')}`,
        () => 'nie złapano okna „Zadokowano”'
      )
      log.line(`animacja: ${done}`)
      await r.page.waitForTimeout(300)
      log.line(`toast: ${await toasts(r.page)}`)
      log.line(`przycisk toastu: ${await r.page.getByTestId('toast-action').allInnerTexts()}`)
      await shot(r.page, 'DO.1-toast')
      await r.page.waitForTimeout(2500)
      log.obj('dokowania P1', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === P1).map((x) => x.rec))
      const after = await readAt('DO.1', `${STATE}; po „Zadokuj”`, folders, () => bridgeValues(r.page))
      log.obj('DO.1 po', after)
      log.obj('DO.1 panel po', await dockPanel(r.page))
      await shot(r.page, 'DO.1-po')
      log.obj('DO.1 mapa po', await starmap(r.page))
    })
    await close('faza 2')

    // ---- Faza 3 (DO.6): wypłata 3 000 zł Bieżące z dnia D + wpływ w mBanku.
    b.change('DO.6: wypłata 3 000 zł Bieżące z dnia D', () => writePayout(ICTJ, { id: P2, kind: 'withdrawal', date: D, amount: 3000, pool: 'current' }))
    bankXtb(DATA, T2, D, 300000)
    r = await open('faza 3', false)
    const p = () => r.page
    await log.step('DO.6 przed', async () => {
      log.obj('DO.6 przed', await readAt('DO.6', `${STATE}; po DO.1; wpływ 3 000 niezadokowany`, folders, () => bridgeValues(p())))
      log.obj('DO.6 mapa przed', await starmap(p()))
    })
    await log.step('DO.6 podział ręczny', async () => {
      await go(p(), '1', 'page-bridge')
      const dlg = await openRow(p(), '3 000,00', 'pending')
      log.obj('DO.6 okno – propozycja', await dialogState(p()))
      await fillAmount(dlg.getByTestId('docking-hull'), '1000')
      await fillAmount(dlg.getByLabel('Do celu Rower'), '300')
      await p().waitForTimeout(400)
      const v1 = await readAt('DO.6', `${STATE}; okno: kadłub 1 000, Rower 300`, folders, async () => {
        const d = await dialogState(p())
        return Object.fromEntries(Object.entries(d).map(([k, x]) => [k, String(x)]))
      })
      log.obj('DO.6 okno – 1 000 / 300', v1)
      await shot(p(), 'DO.6-okno-1000-300')
      await fillAmount(dlg.getByTestId('docking-hull'), '3000')
      await p().waitForTimeout(400)
      log.obj('DO.6 okno – ponad kwotę', await dialogState(p()))
      await shot(p(), 'DO.6-ponad')
      const reset = dlg.getByTestId('docking-reset')
      log.line(`przywróć propozycję: ${await reset.count()}`)
      if (await reset.count()) await reset.click()
      await p().waitForTimeout(400)
      log.obj('DO.6 okno – po „przywróć propozycję”', await dialogState(p()))
      await fillAmount(dlg.getByTestId('docking-hull'), '1000')
      await fillAmount(dlg.getByLabel('Do celu Rower'), '300')
      await p().waitForTimeout(400)
      log.obj('DO.6 okno – ponownie 1 000 / 300', await dialogState(p()))
      await dlg.getByTestId('docking-confirm').click()
      await p().waitForTimeout(1500)
      log.line(`toast: ${await toasts(p())}`)
      await p().waitForTimeout(2000)
      log.obj('dokowania P2', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === P2).map((x) => x.rec))
      log.obj('DO.6 po Zadokuj', await readAt('DO.6', `${STATE}; po „Zadokuj” z podziałem 1 000 / 300`, folders, () => bridgeValues(p())))
      log.obj('DO.6 mapa po Zadokuj', await starmap(p()))
    })
    await log.step('DO.6 Zapisz podział', async () => {
      await go(p(), '1', 'page-bridge')
      const dlg = await openRow(p(), '3 000,00', 'docked')
      log.obj('DO.6 okno zadokowanej', await dialogState(p()))
      await fillAmount(dlg.getByTestId('docking-hull'), '200')
      await fillAmount(dlg.getByLabel('Do celu Rower'), '1000')
      await p().waitForTimeout(400)
      log.obj('DO.6 okno zadokowanej – 200 / 1 000', await dialogState(p()))
      await shot(p(), 'DO.6-zapisz-podzial')
      await dlg.getByTestId('docking-confirm').click()
      await p().waitForTimeout(1500)
      log.line(`toast: ${await toasts(p())}`)
      await p().waitForTimeout(2000)
      log.obj('dokowania P2 po Zapisz', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === P2).map((x) => x.rec))
      log.obj('operacje 3 000 zł', findRecords(DATA, 'transactions', (x) => Math.abs(x.amount) === 300000).map((x) => `${x.rec.date} ${x.rec.accountId} ${x.rec.kind} ${x.rec.amount} ${x.rec.id}`))
      log.obj('DO.6 po Zapisz podział', await readAt('DO.6', `${STATE}; po „Zapisz podział” 200 / 1 000`, folders, () => bridgeValues(p())))
      log.obj('DO.6 mapa po Zapisz', await starmap(p()))
      await shot(p(), 'DO.6-po')
    })
    await close('faza 3')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.1, DO.6'))
  }
})
