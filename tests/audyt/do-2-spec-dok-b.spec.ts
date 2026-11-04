// DO, przebieg do-2: stan „spec-dok, wariant B” od zera (seedFolder) z własnym folderem ICTTJ (scenariusz z celem
// „Laptop” 5 000 zł). DO.2 – dostawa 8 000 zł z puli „Nadwyżki w masie”: kadłub, cele według priorytetów, „wolne do
// decyzji”. DO.18 – zwroty do masy 1 000 zł i 2 000 zł (firewall zgodny i wbrew rozkazowi), rozkaz wyłączony.
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { seedFolder } from '../e2e/seed'
import { recorded, shot, start, type Run } from './lab'
import { ACC, Boundary, Log, RUNS, bankXtb, briefing, bridgeValues, dialogState, dockPanel, findRecords, go, mainLog, makeIctj, openRow, readAt, settingsTab, starmap, toasts, writePayout } from './do-pomoc'

const RUN = 'do-2'
const DIR = join(RUNS, RUN)
const DATA = join(DIR, 'dane')
const ICTJ = join(DIR, 'ictj')
const ROWER = '01KMXD0R000000000000000002'
const FC = '01KMXD0F000000000000000001'
const LAPTOP = '01KMXD0G000000000000000001'
const P3 = '01KMXD0P000000000000000003'
const R1 = '01KMXD0P000000000000000004'
const R2 = '01KMXD0P000000000000000005'
const D = '2026-11-03'
const STATE = 'spec-dok B (seed: start 2026-11-01, otwarcie mBank 39 400 zł, osłony 12 000/12 000, kadłub 20 900/21 900, Rower 2 500/3 000 p1, Laptop ICTTJ 0/5 000 p2)'

test('DO.2, DO.18 – spec-dok B: nadwyżka do celów, firewall', async () => {
  test.setTimeout(30 * 60_000)
  const log = new Log(RUN)
  rmSync(DATA, { recursive: true, force: true })
  seedFolder(DATA, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start: '2026-11-01', initial: { shields: 1600000, hull: 2090000, goals: { [ROWER]: 250000 } } },
      layers: { ...s.layers, shieldSalaries: 3, hullMonths: 6, assumedCosts: 365000 },
      ictj: { ...s.ictj, forecastId: FC }
    }),
    records: {
      balances: [{ date: '2026-11-01', accountId: ACC.mbank, kind: 'opening', amount: 3940000 }],
      months: [{ month: '2026-11', salary: 400000, envelopes: {} }],
      goals: [{ id: ROWER, name: 'Rower', target: 300000, priority: 1, source: 'own' }]
    }
  })
  makeIctj(ICTJ, {
    payouts: [],
    forecasts: [
      {
        schemaVersion: 1,
        id: FC,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        name: 'Plan audytu',
        currency: 'PLN',
        firstMonth: '2026-11',
        goals: [{ id: LAPTOP, name: 'Laptop', month: 6, amount: 5000, enabled: true, flexible: false }]
      }
    ]
  })
  const b = new Boundary(RUN, ICTJ)
  b.change('DO.2: wypłata 8 000 zł Nadwyżki w masie z dnia D', () => writePayout(ICTJ, { id: P3, kind: 'withdrawal', date: D, amount: 8000, pool: 'surplus' }))
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
    log.obj(`powiadomienia (${label})`, (await recorded(run.app).catch(() => null))?.toasts ?? '(brak)')
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    log.obj(`main.log ICTTJ (${label})`, mainLog(run.userData).split(/\r?\n/).filter((l) => /ictj|ICTTJ|EPERM|EACCES/i.test(l)).join('\n'))
    run = null
    b.check(`po zamknięciu – ${label}`)
  }
  const goals = () => findRecords(DATA, 'goals', () => true).map((x) => `${x.rec.name} p${x.rec.priority} ${x.rec.source} target ${x.rec.target} archived ${x.rec.archived}`)
  try {
    // ---- Faza 1: przed wpływem – cel ICTTJ „Laptop” zakładany przez FI z prognozy.
    let r = await open('faza 1', true)
    await log.step('DO.2 przed wpływem', async () => {
      for (let i = 0; i < 20 && !findRecords(DATA, 'goals', (x) => x.id === LAPTOP).length; i++) await r.page.waitForTimeout(1000)
      log.obj('cele (pliki)', goals())
      log.obj('DO.2 przed', await readAt('DO.2', `${STATE}; przed wpływem`, folders, () => bridgeValues(r.page)))
      log.obj('DO.2 mapa przed', await starmap(r.page))
      await shot(r.page, 'DO.2-mapa-przed')
    })
    await close('faza 1')

    // ---- Faza 2: wpływ 8 000 zł od XTB w mBanku → okno → „Zadokuj”.
    bankXtb(DATA, '01KMXD0T000000000000000003', D, 800000)
    r = await open('faza 2', false)
    await log.step('DO.2 okno i Zadokuj', async () => {
      log.obj('DO.2 z wpływem przed Zadokuj', await readAt('DO.2', `${STATE}; wpływ 8 000 w mBanku, przed „Zadokuj”`, folders, () => bridgeValues(r.page)))
      await openRow(r.page, '8 000,00', 'pending')
      log.obj(
        'DO.2 okno',
        await readAt('DO.2', `${STATE}; okno dokowania – propozycja`, folders, async () => Object.fromEntries(Object.entries(await dialogState(r.page)).map(([k, x]) => [k, String(x)])))
      )
      await shot(r.page, 'DO.2-okno')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(1200)
      log.line(`toast: ${await toasts(r.page)}`)
      await r.page.waitForTimeout(2500)
      log.obj('dokowanie P3', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === P3).map((x) => x.rec))
      log.obj('DO.2 po', await readAt('DO.2', `${STATE}; po „Zadokuj”`, folders, () => bridgeValues(r.page)))
      await shot(r.page, 'DO.2-mostek-po')
      log.obj('DO.2 mapa po', await starmap(r.page))
      await shot(r.page, 'DO.2-mapa-po')
    })
    await close('faza 2')

    // ---- Faza 3 (DO.18): zwrot do masy 1 000 zł (Bieżące) z wypływem w mBanku.
    b.change('DO.18: zwrot 1 000 zł Bieżące z dnia D', () => writePayout(ICTJ, { id: R1, kind: 'return', date: D, amount: 1000, pool: 'current' }))
    bankXtb(DATA, '01KMXD0T000000000000000004', D, -100000)
    r = await open('faza 3', false)
    await log.step('DO.18 zwrot 1 000', async () => {
      log.obj('DO.18 przed (zwrot 1 000 w mBanku)', await readAt('DO.18', `${STATE}; po DO.2; zwrot 1 000 z wypływem, przed „Zadokuj”`, folders, () => bridgeValues(r.page)))
      log.obj('odprawa', await briefing(r.page))
      await openRow(r.page, 'Zwrot do masy', 'pending')
      log.obj('DO.18 okno 1 000', await dialogState(r.page))
      await shot(r.page, 'DO.18-okno-1000')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(1200)
      log.line(`toast: ${await toasts(r.page)}`)
      log.line(`okna po kliknięciu: ${await r.page.locator('[role="dialog"]').allInnerTexts().then((x) => x.map((t) => t.replace(/\s+/g, ' ')).join(' || '))}`)
      await r.page.waitForTimeout(2500)
      log.obj('DO.18 po zwrocie 1 000', await readAt('DO.18', `${STATE}; po „Zadokuj” zwrotu 1 000`, folders, () => bridgeValues(r.page)))
      log.obj('odprawa po', await briefing(r.page))
    })
    await close('faza 3')

    // ---- Faza 4 (DO.18): zwrot do masy 2 000 zł; potem rozkaz firewall wyłączony.
    b.change('DO.18: zwrot 2 000 zł Bieżące z dnia D', () => writePayout(ICTJ, { id: R2, kind: 'return', date: D, amount: 2000, pool: 'current' }))
    bankXtb(DATA, '01KMXD0T000000000000000005', D, -200000)
    r = await open('faza 4', false)
    await log.step('DO.18 zwrot 2 000', async () => {
      log.obj('DO.18 przed (zwrot 2 000 w mBanku)', await readAt('DO.18', `${STATE}; zwrot 2 000 z wypływem, przed „Zadokuj”`, folders, () => bridgeValues(r.page)))
      log.obj('odprawa', await briefing(r.page))
      await openRow(r.page, '2 000,00', 'pending')
      log.obj('DO.18 okno 2 000', await dialogState(r.page))
      await shot(r.page, 'DO.18-okno-2000')
      await r.page.keyboard.press('Escape')
      await r.page.waitForTimeout(500)
      await settingsTab(r.page, 'layers')
      const t = r.page.locator('label', { hasText: 'Firewall: dopłata do XTB' }).locator('button')
      log.line(`przełącznik firewall: ${await t.count()} aria-pressed=${await t.getAttribute('aria-pressed').catch(() => '?')} aria-checked=${await t.getAttribute('aria-checked').catch(() => '?')}`)
      await t.click()
      await r.page.waitForTimeout(1500)
      log.line(`po kliknięciu aria-checked=${await t.getAttribute('aria-checked').catch(() => '?')}`)
      log.obj('fi.json orders', JSON.parse(readFileSync(join(DATA, 'fi.json'), 'utf8')).settings.orders)
      await go(r.page, '1', 'page-bridge')
      await openRow(r.page, '2 000,00', 'pending')
      log.obj('DO.18 okno 2 000 – rozkaz wyłączony', await dialogState(r.page))
      await shot(r.page, 'DO.18-okno-2000-wylaczony')
      log.obj('odprawa – rozkaz wyłączony', await briefing(r.page))
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(1200)
      log.line(`toast: ${await toasts(r.page)}`)
      await r.page.waitForTimeout(2500)
      log.obj('DO.18 po zwrocie 2 000 (rozkaz wyłączony)', await readAt('DO.18', `${STATE}; po „Zadokuj” zwrotu 2 000, firewall wyłączony`, folders, () => bridgeValues(r.page)))
      log.obj('dokowania zwrotów', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === R1 || x.ictjEntryId === R2).map((x) => x.rec))
      log.obj('panel', await dockPanel(r.page))
    })
    await close('faza 4')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.2, DO.18'))
  }
})
