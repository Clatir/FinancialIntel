// MG, przebieg 3 – tempo, ETA i kurs przechwycenia (MG.5, MG.6) na trzech stanach:
//  A) „start” (zaraz po kreatorze, start budżetu 03.11.2026) – za mało historii;
//  B) folder zbudowany od zera (seedFolder): start budżetu 01.09.2026, mBank 26 000 zł na start, pensja 4 000 zł, koszty
//     założone 2 000 zł; na start kadłub 12 000 zł, cele: „Wakacje 2027” 1 200 zł (6 000 zł, termin 2027-07), „Remont
//     balkonu” 800 zł (800 zł, termin 2026-08 – osiągnięty po terminie); „Kurs nurkowania” 0 zł (1 500 zł, termin 2026-10),
//     „Rower” 0 zł (2 000 zł, bez terminu); żadnych wpłat do celów we wrześniu i październiku;
//  C) „rok” – przez interfejs: „Wakacje 2027” kwota 6 000 zł, termin 2027-07, środki do 1 200 zł (938,96 zł do osłon),
//     „Nowy laptop” (osiągnięty) termin 2026-09, nowy „Kurs nurkowania” 1 500 zł z terminem 2026-10.
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { seedFolder } from '../e2e/seed'
import { LAB, shot, start, useState } from './lab'
import { ACC, GOAL, go, goalLine, layerOf, out, readLayers, readNow, readStarmap, stepper, toasts } from './mg-pomoc'

const mapValues = async (page: import('@playwright/test').Page) => {
  await go(page, '6', 'page-starmap')
  await page.waitForTimeout(800)
  const m = await readStarmap(page)
  return {
    m,
    values: {
      ...Object.fromEntries(m.goals.map((g) => [g.name ?? '?', `${goalLine(g)} · eta-kolor=${g.etaColor} · kurs-kolor=${g.needColor} · late=${g.etaLate} · dymek=${g.etaTitle}`])),
      tempo: m.pace,
      naglowek: m.header
    }
  }
}

test('MG.5 A – stan „start”: za mało historii', async () => {
  const RUN = 'mg-3a'
  const st = useState('start', RUN)
  const dirs = { dataDir: st.dataDir, ictjDir: st.ictjDir }
  const dump = out(RUN)
  const step = stepper(dump)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    await step('mapa', async () => {
      const { m } = await mapValues(page)
      dump('mapa', m)
      // An own goal added (no history: no pace).
      await page.getByTestId('starmap-new-name').fill('Rower')
      const amount = page.getByTestId('starmap-new-target')
      await amount.click()
      await amount.fill('2000')
      await amount.press('Tab')
      await page.getByTestId('starmap-new-add').click()
      await page.waitForTimeout(1500)
      const r = await readNow(page, 'mg', 'MG.5', 'start (budżet od 03.11.2026) + cel własny Rower 2 000 zł', dirs, async () => (await mapValues(page)).values)
      dump('mapa-po', r.values)
      await shot(page, 'MG.5-za-malo-historii')
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})

test('MG.5/MG.6 B – folder od zera: bez tempa, środki na start, terminy minione', async () => {
  const RUN = 'mg-3b'
  const dir = join(LAB, 'przebiegi', RUN)
  const dataDir = join(dir, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const G = { trip: '01KMXAMGRG0000000000000011', done: '01KMXAMGRG0000000000000012', late: '01KMXAMGRG0000000000000013', bike: '01KMXAMGRG0000000000000014' }
  const from = '2026-08-01T00:00:00.000Z'
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start: '2026-09-01', initial: { shields: 0, hull: 1200000, goals: { [G.trip]: 120000, [G.done]: 80000 } } },
      layers: { ...s.layers, assumedCosts: 200000 }
    }),
    records: {
      balances: [{ date: '2026-09-01', accountId: ACC.mbank, kind: 'opening', amount: 2600000 }],
      months: [{ month: '2026-09', salary: 400000, envelopes: {} }],
      goals: [
        { id: G.trip, name: 'Wakacje 2027', target: 600000, priority: 1, source: 'own', deadline: '2027-07', activeFrom: from },
        { id: G.done, name: 'Remont balkonu', target: 80000, priority: 2, source: 'own', deadline: '2026-08', activeFrom: from },
        { id: G.late, name: 'Kurs nurkowania', target: 150000, priority: 3, source: 'own', deadline: '2026-10', activeFrom: from },
        { id: G.bike, name: 'Rower', target: 200000, priority: 4, source: 'own', deadline: null, activeFrom: from }
      ]
    }
  })
  const dirs = { dataDir }
  const dump = out(RUN)
  const step = stepper(dump)
  const { app, page, errors } = await start(RUN, { dataDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    await step('mapa', async () => {
      const l = await readLayers(page)
      dump('warstwy', l)
      const r = await readNow(page, 'mg', 'MG.5', 'od zera: start 01.09.2026, środki celów na start 2 000 zł, bez wpłat do celów we IX i X', dirs, async () => ({ ...(await mapValues(page)).values, stan: l.stan }))
      await readNow(page, 'mg', 'MG.6', 'od zera: Wakacje 2027 6 000 / 1 200 (2027-07), Remont balkonu osiągnięty po terminie, Kurs nurkowania po terminie bez tempa, Rower bez terminu', dirs, async () => (await mapValues(page)).values)
      dump('mapa', (await mapValues(page)).m)
      dump('odczyt', r.values)
      await shot(page, 'MG.6-bez-tempa')
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})

test('MG.6 C – rok: kurs przechwycenia Wakacji 2027, osiągnięty po terminie, po terminie z tempem', async () => {
  const RUN = 'mg-3c'
  const st = useState('rok', RUN)
  const dirs = { dataDir: st.dataDir, ictjDir: st.ictjDir }
  const dump = out(RUN)
  const step = stepper(dump)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const goal = (name: string) => page.locator(`[data-testid="starmap-goal"][data-name="${name}"]`)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    await step('zmiany', async () => {
      await go(page, '6', 'page-starmap')
      const f = goal('Wakacje 2027').getByTestId('starmap-target')
      await f.click()
      await f.press('Control+a')
      await f.type('6000')
      await f.press('Tab')
      await page.waitForTimeout(600)
      const d = goal('Wakacje 2027').getByLabel('Termin celu')
      await d.click()
      await d.fill('2027-07')
      await d.press('Tab')
      await page.waitForTimeout(600)
      // The goal's money down to 1 200 zł: 938,96 zł to the shields.
      await goal('Wakacje 2027').getByTestId('goal-move-funds').click()
      await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
      const a = page.getByTestId('starmap-money-amount')
      await a.click()
      await a.press('Control+a')
      await a.type('938,96')
      await a.press('Tab')
      await page.getByTestId('starmap-money-shields').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(800)
      // „Nowy laptop” (reached) with a deadline in the past.
      const dl = goal('Nowy laptop').getByLabel('Termin celu')
      await dl.click()
      await dl.fill('2026-09')
      await dl.press('Tab')
      await page.waitForTimeout(600)
      // A goal of a past deadline, not reached, with the pace of „rok”.
      await page.getByTestId('starmap-new-name').fill('Kurs nurkowania')
      const amount = page.getByTestId('starmap-new-target')
      await amount.click()
      await amount.fill('1500')
      await amount.press('Tab')
      await page.getByLabel('Termin nowego celu').fill('2026-10')
      await page.getByTestId('starmap-new-add').click()
      await page.waitForTimeout(1500)
      dump('toasty', await toasts(page))
      const l = await readLayers(page)
      const r = await readNow(page, 'mg', 'MG.6', 'rok + Wakacje 2027 6 000 / 1 200 (2027-07), Nowy laptop termin 2026-09, Kurs nurkowania 1 500 (2026-10)', dirs, async () => ({ ...(await mapValues(page)).values, oslony: layerOf(l.stan, 'Osłony') }))
      dump('odczyt', r.values)
      dump('mapa', (await mapValues(page)).m)
      await shot(page, 'MG.6-rok')
      // Plan miesiąca (M+1): the goals' installments planned (none switched on yet).
      await go(page, '4', 'page-month')
      await page.getByTestId('month-next').click()
      await page.waitForTimeout(800)
      dump('plan-M+1', (await page.getByTestId('page-month').innerText()).slice(0, 1500))
    })
    dump('bledy-okna', errors)
    dump('nieuzywane', GOAL.trip)
  } finally {
    await app.close()
  }
})
