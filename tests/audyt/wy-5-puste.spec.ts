// WY / RY, przebieg 5: Wywiad i Raporty na stanach bez historii – folder bez startu budżetu, budżet od dziś (1 punkt
// krzywej), budżet od 27.10 (2 punkty), „brzegi” (osłony poniżej minimum, pusty kadłub, koszty ponad wpływy) i stan
// `start` (po kreatorze, historia z importu). Narzędzie obserwacji – oceny w WY.md i RY.md.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, recorded, shot, start, text, useState } from './lab'
import { seedFolder, zl } from '../e2e/seed'
import { go, out, panels, shotEl, stepper, textOf } from './wy-pomoc'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

type V = { id: string; prep: () => { dataDir: string; ictjDir?: string } }
const seeded = (id: string, s: Parameters<typeof seedFolder>[1]) => () => {
  const dataDir = join(LAB, 'przebiegi', `wy-5-${id}`, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  seedFolder(dataDir, s)
  return { dataDir }
}
const VARIANTS: V[] = [
  { id: 'bez-startu', prep: seeded('bez-startu', { settings: (s) => ({ ...s, shipName: 'Bez startu' }) }) },
  {
    id: 'od-dzis',
    prep: seeded('od-dzis', {
      settings: (s) => ({ ...s, shipName: 'Od dziś', budget: { ...s.budget, start: '2026-11-03', initial: { shields: zl(20000), hull: zl(5000), goals: {} } }, household: { ...s.household, since: '2026-11-03' } }),
      records: {
        balances: [{ date: '2026-11-03', accountId: ACC, kind: 'opening', amount: zl(25000) }],
        months: [{ month: '2026-11', salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }]
      }
    })
  },
  {
    id: 'od-27-10',
    prep: seeded('od-27-10', {
      settings: (s) => ({ ...s, shipName: 'Tydzień', budget: { ...s.budget, start: '2026-10-27', initial: { shields: zl(20000), hull: zl(5000), goals: {} } }, household: { ...s.household, since: '2026-10-27' } }),
      records: {
        balances: [{ date: '2026-10-27', accountId: ACC, kind: 'opening', amount: zl(25000) }],
        months: [
          { month: '2026-10', salary: zl(4000), envelopes: { [FOOD]: zl(1500) } },
          { month: '2026-11', salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }
        ],
        transactions: [
          { date: '2026-10-28', time: '18:20', accountId: ACC, amount: -zl(42.5), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Biedronka' },
          { date: '2026-11-02', accountId: ACC, amount: -zl(60), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Lidl' }
        ]
      }
    })
  },
  {
    id: 'brzegi',
    prep: seeded('brzegi', {
      settings: (s) => ({
        ...s,
        shipName: 'Brzegi',
        budget: { ...s.budget, start: '2026-08-01', initial: { shields: zl(6000), hull: 0, goals: {} } },
        household: { ...s.household, since: '2026-08-01' },
        orders: { ...s.orders, minShieldSalaries: 1 }
      }),
      records: {
        balances: [{ date: '2026-08-01', accountId: ACC, kind: 'opening', amount: zl(6000) }],
        months: ['2026-08', '2026-09', '2026-10', '2026-11'].map((month) => ({ month, salary: zl(4000), envelopes: { [FOOD]: zl(3000) } })),
        transactions: [
          ...['2026-08', '2026-09', '2026-10'].flatMap((m) => [
            { date: `${m}-10`, accountId: ACC, kind: 'income', amount: zl(3000), counterparty: 'PRACODAWCA SP Z O O' },
            { date: `${m}-05`, accountId: ACC, amount: -zl(1600), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Biedronka' },
            { date: `${m}-15`, accountId: ACC, amount: -zl(1600), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Lidl' },
            { date: `${m}-25`, accountId: ACC, amount: -zl(1600), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Auchan' }
          ]),
          { date: '2026-11-02', accountId: ACC, amount: -zl(300), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Lidl' }
        ]
      }
    })
  },
  { id: 'start', prep: () => useState('start', 'wy-5-start') }
]

test('WY/RY przebieg 5 – Wywiad bez historii', async () => {
  test.setTimeout(30 * 60_000)
  for (const v of VARIANTS) {
    const run = `wy-5-${v.id}`
    const st = v.prep()
    const { app, page, errors } = await start(run, { dataDir: st.dataDir, ictjDir: st.ictjDir })
    const dump = out(run)
    const step = stepper(dump)
    try {
      await page.waitForTimeout(8000)
      await step('wywiad', async () => {
        await go(page, '9', 'page-intel')
        await page.waitForTimeout(2500)
        const t = await text(page, '[data-testid="page-intel"]')
        dump('wywiad', t)
        dump('podejrzane', t.split('\n').filter((l) => /NaN|Infinity|undefined|null/.test(l)))
        dump('panele', (await panels(page.getByTestId('page-intel'))).map((p) => `#### ${p.id}\n${p.text}`).join('\n'))
        dump('krzywa', { punkty: await page.getByTestId('intel-wealth-chart').getAttribute('data-points').catch(() => null) })
        await shot(page, `WY.26-${v.id}`)
        for (const id of ['intel-wealth', 'intel-course', 'intel-maneuver', 'intel-range', 'intel-fuel', 'intel-inflation', 'intel-killzones-panel']) {
          const l = page.getByTestId(id)
          if (await l.count()) await shotEl(l, `WY.26-${v.id}-${id}`)
        }
      })
      await step('raporty', async () => {
        await go(page, '0', 'page-reports')
        for (const tab of ['Odprawa', 'Raport wachty', 'Debriefing', 'Przegląd roczny']) {
          await page.getByRole('radio', { name: tab }).click()
          await page.waitForTimeout(1000)
          dump(`raporty-${tab}`, await text(page, '[data-testid="page-reports"]'))
        }
        await page.getByRole('radio', { name: 'Debriefing' }).click()
        const sel = page.getByTestId('reports-debrief-month')
        if (await sel.count()) dump('debrief-opcje', await sel.evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.value)))
      })
      await step('plan', async () => {
        await go(page, '4', 'page-month')
        dump('plan', (await text(page, '[data-testid="page-month"]')).slice(0, 3000))
      })
      dump('powiadomienia', (await recorded(app)).toasts.map((t) => `${t.title}: ${t.body}`))
      dump('bledy', errors)
      void textOf
    } finally {
      await app.close().catch((e) => out(run)('problem-zamkniecia', String(e).slice(0, 200)))
    }
  }
})
