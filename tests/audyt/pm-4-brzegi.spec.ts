// PM, przebieg 4 – stany „brzegi” zbudowane od zera (seedFolder z tests/e2e/seed.ts), opis w PM.md. Wspólne: start budżetu
// 2026-10-01 (gra od 2026-10-01), plan października 4 000 zł (Jedzenie 1 500 i Rozrywka 500 codzienne, Dom 500 i Prezenty
// 1 000 planowe; listopad bez własnego planu), wydatki października razem 4 000 zł (= energia – łupy 0). Saldo otwarcia
// mBanku 01.10 dobrane tak, żeby przed wypłatą 1.11 osłony i kadłub były jak w punkcie:
//  pm-4a (PM.2): osłony 2 500, kadłub 3 000 · pm-4b (PM.3 w1): osłony 2 500, kadłub 500 · pm-4c (PM.3 w2): 0 i 0 ·
//  pm-4d (PM.15): październik ponad energię o 600 zł, cel „Rower PM” 2 000 zł, zaliczka Anny 500 zł, 02.11 wydatek 5 800 zł.
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { test } from '@playwright/test'
import { LAB, shot, start } from './lab'
import { seedFolder } from '../e2e/seed'
import { ACC, ANNA, CAT, type Ctx, go, goMonth, out, read, readBridgeAll, readDebrief, readSalary, readSplit, readDaily, shotEl, stepper, textOf } from './pm-pomoc'

const G = '01KMXAPM000000000000000401'

function seed(run: string, o: { balance: number; hull: number; goal?: number; octExtra?: number; anna?: boolean; nov?: number }): string {
  const dir = join(LAB, 'przebiegi', run, 'dane')
  rmSync(dir, { recursive: true, force: true })
  const tx = (date: string, amount: number, categoryId: string | null, counterparty: string, extra: Record<string, unknown> = {}) => ({ date, accountId: ACC.mbank, kind: 'expense', amount, categoryId, counterparty, ...extra })
  const transactions: Array<Record<string, unknown>> = [
    tx('2026-10-05', -150000, CAT.groceries, 'BIEDRONKA PM'),
    tx('2026-10-10', -50000, '01KDEFCAT00000000000000601', 'KINO PM'),
    tx('2026-10-15', -100000, CAT.giftsSub, 'JUBILER PM'),
    tx('2026-10-20', -100000, CAT.homeGoods, 'IKEA PM')
  ]
  if (o.octExtra) transactions.push(tx('2026-10-25', -o.octExtra, CAT.giftsSub, 'PREZENT EXTRA PM'))
  if (o.anna) transactions.push({ date: '2026-10-12', accountId: ACC.mbank, kind: 'income', amount: 50000, counterparty: 'ANNA TESTOWA', title: 'ZALICZKA', memberId: ANNA, advance: true, inflowKind: 'advance' })
  if (o.nov) transactions.push(tx('2026-11-02', -o.nov, CAT.giftsSub, 'SALON PM'))
  seedFolder(dir, {
    settings: (s) => ({
      ...s,
      shipName: 'Brzeg',
      budget: { ...s.budget, start: '2026-10-01', initial: { shields: 0, hull: o.hull, goals: o.goal ? { [G]: o.goal } : {} } },
      game: { ...s.game, start: '2026-10-01' },
      household: o.anna
        ? { ...s.household, since: '2026-10-01', members: [{ id: ANNA, name: 'Anna', bankNames: ['ANNA TESTOWA'], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 } }] }
        : s.household
    }),
    records: {
      balances: [
        { date: '2026-10-01', accountId: ACC.mbank, kind: 'opening', amount: o.balance },
        { date: '2026-10-01', accountId: ACC.xtb, kind: 'opening', amount: 0 },
        { date: '2026-10-01', accountId: ACC.cash, kind: 'opening', amount: 0 }
      ],
      months: [{ month: '2026-10', salary: 400000, envelopes: { [CAT.food]: 150000, [CAT.fun]: 50000, [CAT.home]: 50000, [CAT.gifts]: 100000 } }],
      transactions,
      ...(o.goal ? { goals: [{ id: G, name: 'Rower PM', target: 500000, priority: 1, source: 'own', deadline: null, archived: false, activeFrom: '2026-10-01T08:00:00.000Z' }] } : {})
    }
  })
  return dir
}

async function observe(run: string, point: string, stateLabel: string, withM1 = false): Promise<void> {
  const dataDir = join(LAB, 'przebiegi', run, 'dane')
  const ctx: Ctx = { dataDir, state: stateLabel }
  const { app, page, errors } = await start(run, { dataDir })
  const dump = out(run)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    const res: Record<string, string> = {}
    await step('mostek', async () => {
      const b = await readBridgeAll(page)
      dump('mostek', b)
      Object.assign(res, { odprawa: b.odprawa, stan: b.stan, energiaDzis: b.energia })
      await shotEl(page.locator('section[data-panel="bridge:Odprawa"]').first(), `${point}-${run}-odprawa`)
      await shotEl(page.locator('section[data-panel="bridge:Stan okrętu"]').first(), `${point}-${run}-stan`)
    })
    await step('plan', async () => {
      await go(page, '4', 'page-month')
      const s = await readSalary(page)
      const sp = await readSplit(page)
      const dl = await readDaily(page)
      dump('plan', { s, sp, dl, debrief: await readDebrief(page) })
      await shotEl(page.getByTestId('month-salary-panel'), `${point}-${run}-pensja`)
      Object.assign(res, { pensja: s.panel, wyplacono: s.wyplacono, alarmyPensji: s.alarmy, dzienny: dl.panel })
      if (withM1) {
        await goMonth(page, '2026-10')
        const b = await readDebrief(page)
        dump('debrief-pazdziernik', b)
        await shotEl(page.getByTestId('month-debrief'), `${point}-${run}-debriefing`)
        Object.assign(res, { debriefPazdziernik: b.panel.slice(0, 2000), minus: b.minus, plus: b.plus })
      }
    })
    await step('dowodztwo', async () => {
      await go(page, '8', 'page-command')
      const log = await page.getByTestId('command-log-entry').evaluateAll((els) => els.slice(0, 15).map((e) => `${e.getAttribute('data-kind')}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
      const strip = await page.getByTestId('command-strip').locator('span').evaluateAll((els) => els.slice(-5).map((e) => `${e.getAttribute('title')} [${e.getAttribute('data-state')}]`))
      const today = await textOf(page.getByTestId('command-today'))
      dump('dowodztwo', { today, log, strip })
      await shot(page, `${point}-${run}-dowodztwo`)
      Object.assign(res, { dowodztwoDzien: today.replace(/\s*\n\s*/g, ' | '), dziennik: log.join(' || '), pasek: strip.join(' ; ') })
    })
    await step('odczyt', async () => {
      await read(page, ctx, point, res)
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
}

test('PM.2 – osłony 2 500, kadłub 3 000, pensja 4 000', async () => {
  seed('pm-4a', { balance: 950000, hull: 300000 })
  await observe('pm-4a', 'PM.2', 'brzegi pm-4a: przed 1.11 osłony 2 500, kadłub 3 000, pensja 4 000')
})

test('PM.3 w1 – osłony 2 500, kadłub 500', async () => {
  seed('pm-4b', { balance: 700000, hull: 50000 })
  await observe('pm-4b', 'PM.3', 'brzegi pm-4b: przed 1.11 osłony 2 500, kadłub 500, pensja 4 000')
})

test('PM.3 w2 – osłony 0, kadłub 0', async () => {
  seed('pm-4c', { balance: 400000, hull: 0 })
  await observe('pm-4c', 'PM.3', 'brzegi pm-4c: przed 1.11 osłony 0, kadłub 0, pensja 4 000')
})

test('PM.15 – energia wyczerpana, kadłub, deficyt', async () => {
  seed('pm-4d', { balance: 1210000, hull: 50000, goal: 200000, octExtra: 60000, anna: true, nov: 580000 })
  await observe('pm-4d', 'PM.15', 'brzegi pm-4d: październik −600 ponad energię; 1.11 osłony 5 000 → 1 000 po pensji, kadłub 500, cel 2 000, depozyt Anny 500; 02.11 wydatek 5 800', true)
})
