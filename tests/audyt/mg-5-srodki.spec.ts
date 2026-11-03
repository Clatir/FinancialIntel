// MG, przebieg 5 – MG.8 (przeniesienie środków), MG.9 (archiwizacja z pieniędzmi), MG.10 (wydatek z celu) na kopii „rok”.
// Stan zbudowany przez interfejs na początku przebiegu (raport MG.md): „Rower” (zarchiwizowany w personie, 0 zł) → „przywróć”,
// potem 2 500 zł z „Nowy laptop” → „Rower” („przenieś środki”); nowy cel „Telewizor” 2 400 zł (0 zł). Po archiwizacji
// Telewizora z pieniędzmi – w trakcie przebiegu – w kopii ICTTJ wypłata z puli Bieżące 9 000 zł z 03.11 i jej para w mBanku
// (operacja trading +9 000 zł, zapisana do folderu przy otwartej aplikacji): dokąd idzie nowa dostawa (zarchiwizowany nie
// bierze). Narzędzie obserwacji – oceny w docs/audyt/raport/MG.md.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import {
  ACC,
  GOAL,
  bridgePanels,
  go,
  goalLine,
  ictjGuard,
  layerOf,
  mgId,
  openDockRow,
  out,
  readDock,
  readJson,
  readLayers,
  readNow,
  readStarmap,
  recordsOf,
  seedRecords,
  stepper,
  toasts,
  where,
  writeIctjPayout
} from './mg-pomoc'

const RUN = 'mg-5'
const STATE = 'rok + przez UI: Rower przywrócony i 2 500 zł z Nowego laptopa, nowy Telewizor 2 400 zł'
const PAY = '01KMXAMGR00000000000000951'

test('MG przebieg 5 – przeniesienie środków, archiwizacja z pieniędzmi, wydatek z celu', async () => {
  const st = useState('rok', RUN)
  const dirs = { dataDir: st.dataDir, ictjDir: st.ictjDir }
  const guard = ictjGuard(RUN, st.ictjDir)
  const dump = out(RUN)
  const step = stepper(dump)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const goal = (name: string) => page.locator(`[data-testid="starmap-goal"][data-name="${name}"]`)
  const map = async () => {
    await go(page, '6', 'page-starmap')
    await page.waitForTimeout(800)
    return readStarmap(page)
  }
  const dialogText = async () => (await text(page, '[data-testid="starmap-money"] [role="dialog"]')).replace(/\s+/g, ' ')
  const moveDialog = async (name: string) => {
    await goal(name).getByTestId('goal-move-funds').click()
    await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
    await page.waitForTimeout(300)
    return dialogText()
  }
  const setMoveAmount = async (v: string) => {
    const f = page.getByTestId('starmap-money-amount')
    await f.click()
    await f.press('Control+a')
    await f.type(v)
    await f.press('Tab')
    await page.waitForTimeout(300)
  }
  const chooseGoal = async (name: string) => {
    await page.getByTestId('starmap-money-goal').check()
    await page.getByTestId('starmap-money').getByRole('combobox').selectOption({ label: name })
  }
  const undo = async (hasText: string) => {
    await page.getByRole('status').filter({ hasText }).getByTestId('toast-action').first().click()
    await page.waitForTimeout(1500)
  }
  const snap = async (point: string, label: string) => {
    const l = await readLayers(page)
    const p = await bridgePanels(page)
    const m = await map()
    const g = (n: string) => m.goals.find((x) => x.name === n)?.amount ?? m.archived.find((a) => a.startsWith(n)) ?? null
    return readNow(page, 'mg', point, `${STATE} – ${label}`, dirs, async () => ({
      Rower: g('Rower'),
      Telewizor: g('Telewizor'),
      'Nowy laptop': g('Nowy laptop'),
      'Wakacje 2027': g('Wakacje 2027'),
      oslony: layerOf(l.stan, 'Osłony'),
      kadlub: layerOf(l.stan, 'Kadłub'),
      celeMostek: layerOf(l.stan, 'Układy gwiezdne'),
      naglowekMapy: m.header,
      zarchiwizowane: m.archived.join(' || '),
      sumaKont: (l.stan.match(/Suma kont budżetu: [^ ]+ ?[^ ]* zł/) ?? ['?'])[0],
      koperty: p['bridge:Koperty'] ?? '(brak)',
      stan: l.stan
    }))
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(5000)

    // ---------------- state through the UI
    await step('stan', async () => {
      await go(page, '6', 'page-starmap')
      await page.locator('[data-testid="starmap-archived-row"]').filter({ hasText: 'Rower' }).getByRole('button', { name: 'przywróć' }).click()
      await page.waitForTimeout(1200)
      await moveDialog('Nowy laptop')
      await setMoveAmount('2500')
      await chooseGoal('Rower')
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(1200)
      await page.getByTestId('starmap-new-name').fill('Telewizor')
      const amount = page.getByTestId('starmap-new-target')
      await amount.click()
      await amount.fill('2400')
      await amount.press('Tab')
      await page.getByTestId('starmap-new-add').click()
      await page.waitForTimeout(1500)
      dump('0-stan', { toasty: await toasts(page), mapa: (await readStarmap(page)).goals.map(goalLine), pliki: recordsOf(st.dataDir, 'goals').map((g) => `${g.name} arch=${g.archived} prio=${g.priority} transfers=${JSON.stringify(g.transfers)}`) })
      await snap('MG.8', 'przed (Rower 2 500, Telewizor 0)')
      await shot(page, 'MG.8-przed')
    })

    // ---------------- MG.8
    await step('MG.8-3000-calosc', async () => {
      await go(page, '6', 'page-starmap')
      const dlg = await moveDialog('Rower')
      await setMoveAmount('3000')
      await page.getByTestId('starmap-money-shields').check()
      const okDisabled = await page.getByTestId('starmap-money-ok').isDisabled()
      // The button is off for 3 000: Enter in the amount field and a forced click – the message, if any.
      await page.getByTestId('starmap-money-amount').press('Enter')
      await page.waitForTimeout(400)
      const t1 = await toasts(page)
      await page.getByTestId('starmap-money-ok').click({ force: true, timeout: 3000 }).catch(() => undefined)
      await page.waitForTimeout(400)
      const t2 = await toasts(page)
      await shot(page, 'MG.8-3000')
      const full = await page.getByTestId('starmap-money-full').innerText().catch(() => '(brak)')
      await page.getByTestId('starmap-money-full').click().catch(() => undefined)
      await page.waitForTimeout(300)
      dump('MG.8-1-3000', { okno: dlg, przyciskWylaczony: okDisabled, toastyEnter: t1, toastyKlik: t2, calosc: full, poCalosc: await page.getByTestId('starmap-money-amount').inputValue().catch(() => '?'), stanOkna: await dialogText().catch(() => '') })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    })
    await step('MG.8-500-cofnij', async () => {
      await go(page, '6', 'page-starmap')
      await moveDialog('Rower')
      await setMoveAmount('500')
      await page.getByTestId('starmap-money-shields').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(600)
      const t = await toasts(page)
      const r = await snap('MG.8', 'po 500 do osłon')
      dump('MG.8-2-500', { toasty: t, ...r.values })
      await go(page, '6', 'page-starmap')
      await undo('Rower')
      const r2 = await snap('MG.8', 'po „Cofnij” przeniesienia 500 do osłon')
      dump('MG.8-3-cofnij', { ...r2.values, plik: readJson(join(st.dataDir, 'goals', `${GOAL.bike}.json`)).transfers })
    })
    await step('MG.8-500-300', async () => {
      await go(page, '6', 'page-starmap')
      await moveDialog('Rower')
      await setMoveAmount('500')
      await page.getByTestId('starmap-money-shields').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(1000)
      await go(page, '6', 'page-starmap')
      await moveDialog('Rower')
      await setMoveAmount('300')
      await chooseGoal('Telewizor')
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(600)
      const t = await toasts(page)
      const r = await snap('MG.8', 'po 500 do osłon i 300 do Telewizora')
      dump('MG.8-4-500-300', { toasty: t, ...r.values, rower: readJson(join(st.dataDir, 'goals', `${GOAL.bike}.json`)).transfers })
      await go(page, '6', 'page-starmap')
      await shot(page, 'MG.8-po')
    })

    // ---------------- MG.9
    const archiveTv = async () => {
      await go(page, '6', 'page-starmap')
      await goal('Telewizor').getByTestId('starmap-archive').click()
      await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
      await page.waitForTimeout(300)
      return dialogText()
    }
    await step('MG.9-oslony', async () => {
      const dlg = await archiveTv()
      await shot(page, 'MG.9-okno')
      await page.getByTestId('starmap-money-shields').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(600)
      const t = await toasts(page)
      const r = await snap('MG.9', 'archiwizacja Telewizora „do osłon (bufor)”')
      dump('MG.9-1-oslony', { okno: dlg, toasty: t, ...r.values })
      await go(page, '6', 'page-starmap')
      await undo('Telewizor')
      const r2 = await snap('MG.9', 'po „Cofnij” (do osłon)')
      dump('MG.9-2-cofnij', r2.values)
    })
    await step('MG.9-inny-cel', async () => {
      await archiveTv()
      await chooseGoal('Rower')
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(600)
      const t = await toasts(page)
      const r = await snap('MG.9', 'archiwizacja Telewizora „do celu” Rower')
      dump('MG.9-3-inny-cel', { toasty: t, ...r.values })
      await go(page, '6', 'page-starmap')
      await undo('Telewizor')
      const r2 = await snap('MG.9', 'po „Cofnij” (do celu)')
      dump('MG.9-4-cofnij', r2.values)
    })
    await step('MG.9-zostaw', async () => {
      await archiveTv()
      await page.getByTestId('starmap-money-stay').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(600)
      const t = await toasts(page)
      const r = await snap('MG.9', 'archiwizacja Telewizora „zostaw w celu”')
      dump('MG.9-5-zostaw', { toasty: t, ...r.values })
      await go(page, '6', 'page-starmap')
      await shot(page, 'MG.9-zarchiwizowany')
    })
    // An archived goal takes no delivery, no loot: Telewizor moved to the top while active? It is archived – a delivery now.
    await step('MG.9-dostawa-lupy', async () => {
      // The loot split of October (Plan miesiąca, X): the goals offered.
      await go(page, '4', 'page-month')
      await page.getByTestId('month-prev').click()
      await page.waitForTimeout(1000)
      const loot = (await page.getByTestId('loot').innerText().catch(() => '(brak sekcji łupów)')).replace(/\s+/g, ' ')
      await page.getByTestId('month-next').click()
      await page.waitForTimeout(800)
      const lootNov = (await page.getByTestId('loot').innerText().catch(() => '(brak sekcji łupów)')).replace(/\s+/g, ' ')
      // A delivery now: the payout and its mBank pair written while the app runs.
      guard.change('MG.9: wypłata z puli Bieżące 9 000 zł z 03.11 dopisana w kopii ICTTJ', () => writeIctjPayout(st.ictjDir!, { id: PAY, kind: 'withdrawal', date: '2026-11-03', amount: 9000, pool: 'current' }))
      seedRecords(st.dataDir, { transactions: [{ id: mgId(51), date: '2026-11-03', accountId: ACC.mbank, kind: 'trading', amount: 900000, counterparty: 'XTB S.A.', title: 'WYPLATA SRODKOW', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] })
      await page.waitForTimeout(8000)
      await go(page, '1', 'page-bridge')
      let ok = await openDockRow(page, '9 000,00')
      for (let i = 0; !ok && i < 6; i++) {
        await page.waitForTimeout(5000)
        await go(page, '1', 'page-bridge')
        ok = await openDockRow(page, '9 000,00')
      }
      const d = ok ? await readDock(page) : { okno: (await text(page, 'section[data-panel="bridge:Dokowanie"]')).replace(/\s+/g, ' ') }
      await shot(page, 'MG.9-dostawa')
      await readNow(page, 'mg', 'MG.9', `${STATE} – okno dokowania Bieżące 9 000 zł przy zarchiwizowanym Telewizorze (300 zł)`, dirs, async () => ({ ...d, lupyX: loot, lupyXI: lootNov }))
      if (ok) {
        await page.getByTestId('docking-confirm').click()
        await page.waitForTimeout(1500)
        if (await page.getByTestId('docking-done').count()) await page.keyboard.press('Escape')
      }
      const r = await snap('MG.9', 'po dokowaniu 9 000 zł (Telewizor zarchiwizowany)')
      dump('MG.9-6-dostawa', { dok: d, lupyX: loot, lupyXI: lootNov, ...r.values })
    })
    await step('MG.9-przenies-przywroc', async () => {
      await go(page, '6', 'page-starmap')
      const row = page.locator('[data-testid="starmap-archived-row"]').filter({ hasText: 'Telewizor' })
      await row.getByTestId('starmap-archived-move').click()
      await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
      const dlg = await dialogText()
      await chooseGoal('Rower')
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(600)
      const t = await toasts(page)
      const r = await snap('MG.9', '„przenieś środki” zarchiwizowanego Telewizora do Rowera')
      dump('MG.9-7-przenies', { okno: dlg, toasty: t, ...r.values })
      await go(page, '6', 'page-starmap')
      await page.locator('[data-testid="starmap-archived-row"]').filter({ hasText: 'Telewizor' }).getByRole('button', { name: 'przywróć' }).click()
      await page.waitForTimeout(1500)
      const r2 = await snap('MG.9', '„przywróć” Telewizora')
      dump('MG.9-8-przywroc', r2.values)
    })

    // ---------------- MG.10
    await step('MG.10', async () => {
      const m = await map()
      const have = Number((m.goals.find((g) => g.name === 'Rower')?.amount ?? '0').replace(/[^\d,]/g, '').replace(',', '.'))
      if (have > 700) {
        await moveDialog('Rower')
        await setMoveAmount(String(Math.round((have - 700) * 100) / 100).replace('.', ','))
        await page.getByTestId('starmap-money-shields').check()
        await page.getByTestId('starmap-money-ok').click()
        await page.waitForTimeout(1500)
      }
      const planEnergy = async () => {
        await go(page, '4', 'page-month')
        return { energiaDzisPlan: await text(page, '[data-testid="month-energy-today"]').catch(() => '?'), kopertyPlan: (await page.getByTestId('page-month').innerText()).replace(/\s+/g, ' ').match(/KOPERTY \?.*$/)?.[0]?.slice(0, 900) ?? '?' }
      }
      const whyCele = async () => {
        await go(page, '1', 'page-bridge')
        const why = page.getByText('skąd cele osłon i kadłuba?')
        if (!(await why.count())) return '(brak)'
        await why.first().click()
        await page.waitForTimeout(500)
        const t = (await text(page, 'section[data-panel="bridge:Stan okrętu"]')).replace(/\s+/g, ' ')
        await why.first().click().catch(() => undefined)
        return t
      }
      const b1 = { ...(await planEnergy()), skad: await whyCele() }
      const r1 = await snap('MG.10', 'przed wydatkiem 900 zł z celu Rower (700 zł)')
      dump('MG.10-1-przed', { ...b1, ...r1.values })
      await go(page, '2', 'page-operations')
      await page.keyboard.press('Control+n')
      await page.getByTestId('operation-editor').waitFor({ state: 'visible', timeout: 15_000 })
      const amount = page.getByTestId('operation-amount')
      await amount.click()
      await amount.fill('900')
      await amount.press('Enter')
      await page.getByTestId('operation-counterparty').fill('Sklep rowerowy')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.getByTestId('operation-category').selectOption({ label: 'Rozrywka i hobby' })
      await page.waitForTimeout(400)
      const opts = await page.getByTestId('operation-goal').locator('option').allInnerTexts()
      const rowerOpt = opts.find((o) => o.startsWith('Rower'))
      if (rowerOpt) await page.getByTestId('operation-goal').selectOption({ label: rowerOpt })
      await page.waitForTimeout(1500)
      const note = await text(page, '[data-testid="operation-goal-note"]').catch(() => '(brak)')
      await shot(page, 'MG.10-edytor')
      const rowText = (await page.locator('[data-testid="operation-row"]').filter({ hasText: 'Sklep rowerowy' }).first().innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(800)
      const b2 = { ...(await planEnergy()), skad: await whyCele() }
      const r2 = await snap('MG.10', 'po wydatku 900 zł z celu Rower')
      dump('MG.10-2-po', { opcje: opts, notka: note, wiersz: rowText, ...b2, ...r2.values, plik: recordsOf(st.dataDir, 'transactions').filter((t) => t.counterparty === 'Sklep rowerowy').map((t) => `${t.amount} ${t.categoryId} goal=${t.goalId}`) })
    })

    dump('bledy-okna', errors)
  } finally {
    await app.close().catch(() => undefined)
    dump('ictj-zmiany-aplikacji', guard.check())
  }
})
