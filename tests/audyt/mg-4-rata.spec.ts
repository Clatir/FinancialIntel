// MG, przebieg 4 – „rata z pensji” (MG.7) na folderze zbudowanym od zera (seedFolder), tak żeby osłony i kadłub były
// pełne 1. dnia M-2 (09.2026) i M0 (11.2026), a niepełne 1. dnia M-1 (10.2026):
//  - start budżetu 01.09.2026, mBank 6 000 zł na start, na start kadłub 3 000 zł (osłony – reszta 3 000 zł);
//  - osłony = 1 pensja, kadłub = 6 × koszty założone 500 zł; pensja 3 000 zł od 09.2026, bez kopert;
//  - cel „Wakacje 2027” 6 000 zł, termin 2027-07, „rata z pensji” od 2026-08 (M-3), aktywny od 01.08.2026;
//  - 15.09 wydatek 2 454,55 zł (Jedzenie) – zjada energię września po racie (545,45 zł = 6 000 / 11, w dół);
//  - 01.10 osłony 0 zł – pensja z kadłuba; 10.10 przychód 6 000 zł (osłony i kadłub znów pełne); 15.10 wydatek 3 000 zł;
//  - 01.11 osłony i kadłub pełne – rata 5 454,55 / 9 = 606,06 zł (w dół).
// Liczby, które da się policzyć wprost z punktu i stanu: rata IX 545,45; rata X 0; rata XI 606,06; cel 1 151,51 zł.
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { seedFolder } from '../e2e/seed'
import { LAB, shot, start } from './lab'
import { ACC, go, goalLine, layerOf, out, readLayers, readNow, readStarmap, stepper } from './mg-pomoc'

const RUN = 'mg-4'
const STATE = 'od zera: start 01.09.2026, pensja 3 000, osłony 1 pensja, kadłub 6 × 500, Wakacje 2027 6 000 (2027-07) z ratą od 2026-08; pełne 1.IX i 1.XI, niepełne 1.X'
const TRIP = '01KMXAMGRG0000000000000021'
const FOOD = '01KDEFCAT00000000000000100'

test('MG.7 – rata z pensji tylko przy pełnych osłonach i kadłubie', async () => {
  const dir = join(LAB, 'przebiegi', RUN)
  const dataDir = join(dir, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start: '2026-09-01', initial: { shields: 0, hull: 300000, goals: {} } },
      layers: { ...s.layers, shieldSalaries: 1, hullMonths: 6, assumedCosts: 50000 }
    }),
    records: {
      balances: [{ date: '2026-09-01', accountId: ACC.mbank, kind: 'opening', amount: 600000 }],
      months: [{ month: '2026-09', salary: 300000, envelopes: {} }],
      goals: [{ id: TRIP, name: 'Wakacje 2027', target: 600000, priority: 1, source: 'own', deadline: '2027-07', activeFrom: '2026-08-01T00:00:00.000Z', rates: [{ from: '2026-08', until: null }] }],
      transactions: [
        { date: '2026-09-15', accountId: ACC.mbank, kind: 'expense', amount: -245455, categoryId: FOOD, counterparty: 'Zakupy wrzesień' },
        { date: '2026-10-10', accountId: ACC.mbank, kind: 'income', amount: 600000, counterparty: 'PRACODAWCA SP. Z O.O.', title: 'WYNAGRODZENIE' },
        { date: '2026-10-15', accountId: ACC.mbank, kind: 'expense', amount: -300000, categoryId: FOOD, counterparty: 'Zakupy październik' }
      ]
    }
  })
  const dirs = { dataDir }
  const dump = out(RUN)
  const step = stepper(dump)
  const { app, page, errors } = await start(RUN, { dataDir })
  const month = async (label: string) => {
    await page.waitForTimeout(800)
    const txt = (await page.getByTestId('page-month').innerText()).replace(/\s+/g, ' ')
    const rates = await page.getByTestId('split-rates').innerText().catch(() => '(brak wiersza rat)')
    const deb = txt.match(/pensja [^\n]{0,160}raty celów[^\n]{0,60}/)?.[0] ?? '(brak „− raty celów” w tekście)'
    return { miesiac: await page.getByTestId('month-label').innerText(), wierszRat: rates.replace(/\s+/g, ' '), debriefing: deb, tekst: txt.slice(0, 2500), label }
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    await step('mapa-i-warstwy', async () => {
      const l = await readLayers(page)
      await go(page, '6', 'page-starmap')
      const m = await readStarmap(page)
      dump('mapa', m)
      await readNow(page, 'mg', 'MG.7', `${STATE} – Mapa i Mostek`, dirs, async () => ({ Wakacje: goalLine(m.goals[0]!), tempo: m.pace, oslony: layerOf(l.stan, 'Osłony'), kadlub: layerOf(l.stan, 'Kadłub'), energia: layerOf(l.stan, 'Energia'), cele: layerOf(l.stan, 'Układy gwiezdne'), stan: l.stan }))
      await shot(page, 'MG.7-mapa')
    })
    await step('plan-miesiace', async () => {
      await go(page, '4', 'page-month')
      const res: Record<string, unknown> = {}
      res.M0 = await month('M0 11.2026')
      await shot(page, 'MG.7-plan-M0')
      await page.getByTestId('month-prev').click()
      res['M-1'] = await month('M-1 10.2026')
      await shot(page, 'MG.7-plan-M-1')
      await page.getByTestId('month-prev').click()
      res['M-2'] = await month('M-2 09.2026')
      await shot(page, 'MG.7-plan-M-2')
      await page.getByTestId('month-next').click()
      await page.getByTestId('month-next').click()
      await page.getByTestId('month-next').click()
      res['M+1'] = await month('M+1 12.2026')
      await shot(page, 'MG.7-plan-M+1')
      dump('plan', res)
      await readNow(page, 'mg', 'MG.7', `${STATE} – Plan miesiąca IX–XII`, dirs, async () =>
        Object.fromEntries(Object.entries(res).map(([k, v]) => [k, `${(v as { wierszRat: string }).wierszRat} | ${(v as { debriefing: string }).debriefing}`]))
      )
    })
    await step('wylacz', async () => {
      await go(page, '6', 'page-starmap')
      const sw = page.locator('[data-testid="starmap-rate"] [role="switch"]').first()
      const before = await sw.getAttribute('aria-checked')
      await sw.click()
      await page.waitForTimeout(1500)
      const after = await sw.getAttribute('aria-checked')
      const m = await readStarmap(page)
      await go(page, '4', 'page-month')
      const m0 = await month('M0 po wyłączeniu')
      await page.getByTestId('month-next').click()
      const m1 = await month('M+1 po wyłączeniu')
      dump('po-wylaczeniu', { przed: before, po: after, mapa: m.goals.map(goalLine), M0: m0, 'M+1': m1 })
      await readNow(page, 'mg', 'MG.7', `${STATE} – po wyłączeniu „rata z pensji”`, dirs, async () => ({ Wakacje: goalLine(m.goals[0]!), M0: m0.wierszRat, 'M+1': m1.wierszRat }))
      await shot(page, 'MG.7-po-wylaczeniu')
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
