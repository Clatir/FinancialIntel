// MG, przebieg 1 – cele własne na kopii „rok”: MG.1 (dodanie, kwota 0, kolejność, restart), MG.8 (przeniesienie środków),
// MG.9 (archiwizacja z pieniędzmi), MG.10 (wydatek z celu), MG.11 (zmiany celów od chwili zmiany i nowa dostawa).
// Stan zbudowany przed startem (raport MG.md): „Rower” znowu aktywny ze swoimi 2 500 zł (archived=false, achievedAt=null,
// transfers=[]), w kopii ICTTJ wypłata z puli Bieżące 10 000 zł z 02.11.2026 i jej para w mBanku (operacja trading
// +10 000 zł z 02.11.2026, „XTB S.A.”) – nowa dostawa do MG.11. Narzędzie obserwacji – oceny w docs/audyt/raport/MG.md.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { shot, start, text, useState, type Run } from './lab'
import {
  ACC,
  GOAL,
  editJson,
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

const RUN = 'mg-1'
const STATE = 'rok + Rower aktywny 2 500 zł + wypłata ICTTJ Bieżące 10 000 zł (02.11) z parą w mBanku'
const PAY = '01KMXAMGR00000000000000901'
const TX = mgId(1)

test('MG przebieg 1 – cele własne: dodanie, kolejność, przeniesienie, archiwizacja, wydatek z celu, zmiany i dostawa', async () => {
  const st = useState('rok', RUN)
  const dirs = { dataDir: st.dataDir, ictjDir: st.ictjDir }
  editJson(join(st.dataDir, 'goals', `${GOAL.bike}.json`), (g) => ({ ...g, archived: false, achievedAt: null, transfers: [] }))
  writeIctjPayout(st.ictjDir!, { id: PAY, kind: 'withdrawal', date: '2026-11-02', amount: 10000, pool: 'current' })
  seedRecords(st.dataDir, { transactions: [{ id: TX, date: '2026-11-02', accountId: ACC.mbank, kind: 'trading', amount: 1000000, counterparty: 'XTB S.A.', title: 'WYPLATA SRODKOW' }] })
  const guard = ictjGuard(RUN, st.ictjDir)
  const dump = out(RUN)
  const step = stepper(dump)
  let run: Run = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  let page = run.page
  const goal = (name: string) => page.locator(`[data-testid="starmap-goal"][data-name="${name}"]`)
  const map = async () => {
    await go(page, '6', 'page-starmap')
    await page.waitForTimeout(800)
    return readStarmap(page)
  }
  const goalsMap = async () => Object.fromEntries((await map()).goals.map((g) => [g.name ?? '?', goalLine(g)]))
  const goalFile = (id: string) => readJson(join(st.dataDir, 'goals', `${id}.json`))
  const idOf = (name: string) => recordsOf(st.dataDir, 'goals').find((g) => g.name === name)?.id as string | undefined
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(5000)

    // ---------------- MG.1
    await step('MG.1-start', async () => {
      const m = await map()
      dump('MG.1-0-mapa', m)
      await shot(page, 'MG.1-0')
    })
    await step('MG.1-bez-nazwy', async () => {
      await page.getByTestId('starmap-new-name').fill('')
      await page.getByTestId('starmap-new-add').click()
      await page.waitForTimeout(400)
      dump('MG.1-1-bez-nazwy', { toasty: await toasts(page) })
      await page.getByTestId('starmap-new-name').fill('Telewizor')
      await page.getByTestId('starmap-new-add').click()
      await page.waitForTimeout(400)
      dump('MG.1-2-bez-kwoty', { toasty: await toasts(page), cele: recordsOf(st.dataDir, 'goals').map((g) => g.name) })
    })
    await step('MG.1-dodaj', async () => {
      const amount = page.getByTestId('starmap-new-target')
      await amount.click()
      await amount.fill('2400')
      await amount.press('Tab')
      await page.getByLabel('Termin nowego celu').fill('2027-03')
      await page.getByTestId('starmap-new-add').click()
      await page.waitForTimeout(600)
      const t = await toasts(page)
      await page.waitForTimeout(1500)
      const m = await readStarmap(page)
      dump('MG.1-3-dodany', { toasty: t, lista: m.goals.map((g) => `${g.pos}. ${g.name} ${g.amount} / ${g.target} ${g.text}`), plik: recordsOf(st.dataDir, 'goals').filter((g) => g.name === 'Telewizor') })
      await shot(page, 'MG.1-dodany')
    })
    await step('MG.1-kwota-0', async () => {
      const f = goal('Wakacje 2027').getByTestId('starmap-target')
      await f.click()
      await f.press('Control+a')
      await f.type('0')
      await f.press('Tab')
      await page.waitForTimeout(600)
      const t = await toasts(page)
      await page.waitForTimeout(1200)
      dump('MG.1-4-kwota-0', { toasty: t, pole: await f.inputValue(), plik: goalFile(GOAL.trip).target })
      await shot(page, 'MG.1-kwota-0')
    })
    let before: Record<string, string> = {}
    await step('MG.1-kolejnosc', async () => {
      before = (await readNow(page, 'mg', 'MG.1', STATE + ' – przed zmianą kolejności', dirs, goalsMap)).values as Record<string, string>
      // ▲ on the ICTTJ goal „Wkład własny – mieszkanie”, ▼ on „Nowy laptop”, then „Telewizor” dragged before „Wakacje 2027”.
      await goal('Wkład własny – mieszkanie').getByTestId('starmap-up').click()
      await page.waitForTimeout(700)
      await goal('Nowy laptop').getByTestId('starmap-down').click()
      await page.waitForTimeout(700)
      await goal('Telewizor').dragTo(goal('Wakacje 2027'))
      await page.waitForTimeout(1500)
      const after = await readNow(page, 'mg', 'MG.1', STATE + ' – po ▲, ▼ i przeciągnięciu', dirs, goalsMap)
      dump('MG.1-5-kolejnosc', { przed: before, po: after.values, priorytety: recordsOf(st.dataDir, 'goals').map((g) => `${g.priority} ${g.name}${g.archived ? ' (arch.)' : ''}`).sort() })
      await shot(page, 'MG.1-kolejnosc')
    })
    await step('MG.1-restart', async () => {
      await run.app.close()
      run = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false })
      page = run.page
      await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
      await page.waitForTimeout(4000)
      const after = await readNow(page, 'mg', 'MG.1', STATE + ' – po restarcie', dirs, goalsMap)
      dump('MG.1-6-po-restarcie', after.values)
      await shot(page, 'MG.1-po-restarcie')
    })

    // ---------------- MG.8
    const layers0: Record<string, string> = {}
    await step('MG.8-przed', async () => {
      const l = await readLayers(page)
      Object.assign(layers0, l)
      const m = await map()
      await readNow(page, 'mg', 'MG.8', STATE + ' – przed', dirs, async () => ({
        Rower: m.goals.find((g) => g.name === 'Rower')?.amount ?? null,
        Telewizor: m.goals.find((g) => g.name === 'Telewizor')?.amount ?? null,
        oslony: layerOf(l.stan, 'Osłony'),
        kadlub: layerOf(l.stan, 'Kadłub'),
        cele: layerOf(l.stan, 'Układy gwiezdne'),
        stan: l.stan
      }))
    })
    const moveDialog = async (name: string) => {
      await goal(name).getByTestId('goal-move-funds').click()
      await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
      await page.waitForTimeout(300)
      return (await text(page, '[data-testid="starmap-money"] [role="dialog"]')).replace(/\s+/g, ' ')
    }
    const setMoveAmount = async (v: string) => {
      const f = page.getByTestId('starmap-money-amount')
      await f.click()
      await f.press('Control+a')
      await f.type(v)
      await f.press('Tab')
      await page.waitForTimeout(300)
    }
    const after8 = async (label: string) => {
      const l = await readLayers(page)
      const m = await map()
      return readNow(page, 'mg', 'MG.8', `${STATE} – ${label}`, dirs, async () => ({
        Rower: m.goals.find((g) => g.name === 'Rower')?.amount ?? null,
        Telewizor: m.goals.find((g) => g.name === 'Telewizor')?.amount ?? null,
        oslony: layerOf(l.stan, 'Osłony'),
        kadlub: layerOf(l.stan, 'Kadłub'),
        cele: layerOf(l.stan, 'Układy gwiezdne'),
        naglowekMapy: m.header,
        stan: l.stan
      }))
    }
    await step('MG.8-3000-i-calosc', async () => {
      await go(page, '6', 'page-starmap')
      const dlg = await moveDialog('Rower')
      await setMoveAmount('3000')
      const okDisabled = await page.getByTestId('starmap-money-ok').isDisabled()
      await page.getByTestId('starmap-money-shields').check()
      await page.getByTestId('starmap-money-ok').click({ force: true, timeout: 3000 }).catch(() => undefined)
      await page.waitForTimeout(500)
      const t = await toasts(page)
      const fullBtn = await page.getByTestId('starmap-money-full').innerText().catch(() => '(brak)')
      await page.getByTestId('starmap-money-full').click().catch(() => undefined)
      await page.waitForTimeout(300)
      const afterFull = await page.getByTestId('starmap-money-amount').inputValue().catch(() => '?')
      await shot(page, 'MG.8-okno')
      dump('MG.8-1-3000', { okno: dlg, przyciskPrzeniesWylaczony: okDisabled, toasty: t, calosc: fullBtn, poCalosc: afterFull })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    })
    await step('MG.8-500-oslony-cofnij', async () => {
      await go(page, '6', 'page-starmap')
      await moveDialog('Rower')
      await setMoveAmount('500')
      await page.getByTestId('starmap-money-shields').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(500)
      const t = await toasts(page)
      const m = await readStarmap(page)
      dump('MG.8-2-500-oslony', { toasty: t, Rower: m.goals.find((g) => g.name === 'Rower')?.amount, plik: goalFile(GOAL.bike).transfers })
      // „Cofnij” in the toast.
      await page.getByRole('status').filter({ hasText: 'Rower' }).getByTestId('toast-action').first().click()
      await page.waitForTimeout(1500)
      const m2 = await readStarmap(page)
      dump('MG.8-3-cofnij', { Rower: m2.goals.find((g) => g.name === 'Rower')?.amount, plik: goalFile(GOAL.bike).transfers })
      await after8('po 500 do osłon i „Cofnij”')
    })
    await step('MG.8-500-oslony', async () => {
      await go(page, '6', 'page-starmap')
      await moveDialog('Rower')
      await setMoveAmount('500')
      await page.getByTestId('starmap-money-shields').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(800)
      const r = await after8('po 500 do osłon')
      dump('MG.8-4-500', r.values)
    })
    await step('MG.8-300-telewizor', async () => {
      await go(page, '6', 'page-starmap')
      await moveDialog('Rower')
      await setMoveAmount('300')
      await page.getByTestId('starmap-money-goal').check()
      await page.getByTestId('starmap-money').getByRole('combobox').selectOption({ label: 'Telewizor' })
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(500)
      const t = await toasts(page)
      const r = await after8('po 300 do Telewizora')
      dump('MG.8-5-300', { toasty: t, ...r.values, rowerPlik: goalFile(GOAL.bike).transfers })
      await go(page, '6', 'page-starmap')
      await shot(page, 'MG.8-po')
    })

    // ---------------- MG.9
    const tvId = () => idOf('Telewizor')
    const archiveDialog = async () => {
      await goal('Telewizor').getByTestId('starmap-archive').click()
      await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
      await page.waitForTimeout(300)
      return (await text(page, '[data-testid="starmap-money"] [role="dialog"]')).replace(/\s+/g, ' ')
    }
    const read9 = async (label: string) => {
      const l = await readLayers(page)
      const m = await map()
      return readNow(page, 'mg', 'MG.9', `${STATE} – ${label}`, dirs, async () => ({
        Telewizor: m.goals.find((g) => g.name === 'Telewizor')?.amount ?? m.archived.find((a) => a.startsWith('Telewizor')) ?? null,
        Rower: m.goals.find((g) => g.name === 'Rower')?.amount ?? null,
        zarchiwizowane: m.archived.join(' || '),
        naglowekMapy: m.header,
        oslony: layerOf(l.stan, 'Osłony'),
        celeMostek: layerOf(l.stan, 'Układy gwiezdne'),
        stan: l.stan
      }))
    }
    await step('MG.9-oslony', async () => {
      await go(page, '6', 'page-starmap')
      const dlg = await archiveDialog()
      await shot(page, 'MG.9-okno')
      await page.getByTestId('starmap-money-shields').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(500)
      const t = await toasts(page)
      const r = await read9('archiwizacja „do osłon (bufor)”')
      dump('MG.9-1-oslony', { okno: dlg, toasty: t, ...r.values, plik: tvId() ? goalFile(tvId()!) : null })
      await go(page, '6', 'page-starmap')
      await page.getByRole('status').filter({ hasText: 'Telewizor' }).getByTestId('toast-action').first().click()
      await page.waitForTimeout(1500)
      const r2 = await read9('po „Cofnij” (osłony)')
      dump('MG.9-2-cofnij', r2.values)
    })
    await step('MG.9-inny-cel', async () => {
      await go(page, '6', 'page-starmap')
      await archiveDialog()
      await page.getByTestId('starmap-money-goal').check()
      await page.getByTestId('starmap-money').getByRole('combobox').selectOption({ label: 'Rower' })
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(500)
      const t = await toasts(page)
      const r = await read9('archiwizacja „do celu” Rower')
      dump('MG.9-3-inny-cel', { toasty: t, ...r.values })
      await go(page, '6', 'page-starmap')
      await page.getByRole('status').filter({ hasText: 'Telewizor' }).getByTestId('toast-action').first().click()
      await page.waitForTimeout(1500)
      const r2 = await read9('po „Cofnij” (inny cel)')
      dump('MG.9-4-cofnij', r2.values)
    })
    await step('MG.9-zostaw', async () => {
      await go(page, '6', 'page-starmap')
      await archiveDialog()
      await page.getByTestId('starmap-money-stay').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(500)
      const t = await toasts(page)
      const r = await read9('archiwizacja „zostaw w celu”')
      dump('MG.9-5-zostaw', { toasty: t, ...r.values })
      await go(page, '6', 'page-starmap')
      await shot(page, 'MG.9-zarchiwizowany')
    })

    // ---------------- MG.11 (part 1: changes with Telewizor archived with its money) – before MG.10 changes Rower
    let s0: Record<string, unknown> = {}
    await step('MG.11-zmiany', async () => {
      const m0 = await map()
      s0 = { aktywne: m0.goals.map((g) => `${g.name}: ${g.amount}`), zarchiwizowane: m0.archived }
      await readNow(page, 'mg', 'MG.11', `${STATE} – stany przed zmianami celów`, dirs, async () => ({ ...Object.fromEntries(m0.goals.map((g) => [g.name ?? '?', goalLine(g)])), zarchiwizowane: m0.archived.join(' || '), naglowek: m0.header }))
      // 1) a goal's amount: Wakacje 2027 8 000 → 9 000.
      const f = goal('Wakacje 2027').getByTestId('starmap-target')
      await f.click()
      await f.press('Control+a')
      await f.type('9000')
      await f.press('Tab')
      await page.waitForTimeout(800)
      // 2) the order: Rower dragged to the top (before the first goal of the list).
      const first = page.locator('[data-testid="starmap-goal"]').first()
      await goal('Rower').dragTo(first)
      await page.waitForTimeout(800)
      // 3) a new goal: „Konsola” 1 500 zł.
      await page.getByTestId('starmap-new-name').fill('Konsola')
      const amount = page.getByTestId('starmap-new-target')
      await amount.click()
      await amount.fill('1500')
      await amount.press('Tab')
      await page.getByTestId('starmap-new-add').click()
      await page.waitForTimeout(800)
      // 4) another archived with its money kept: „Nowy laptop”.
      await goal('Nowy laptop').getByTestId('starmap-archive').click()
      await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
      await page.getByTestId('starmap-money-stay').check()
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(1500)
      const m1 = await map()
      await readNow(page, 'mg', 'MG.11', `${STATE} – stany po zmianach (kwota Wakacji 9 000, Rower na górę, nowy Konsola, Nowy laptop zarchiwizowany „zostaw”)`, dirs, async () => ({
        ...Object.fromEntries(m1.goals.map((g) => [g.name ?? '?', goalLine(g)])),
        zarchiwizowane: m1.archived.join(' || '),
        naglowek: m1.header
      }))
      dump('MG.11-1-zmiany', { przed: s0, po: { aktywne: m1.goals.map((g) => `${g.name}: ${g.amount}`), zarchiwizowane: m1.archived } })
      await shot(page, 'MG.11-po-zmianach')
    })
    await step('MG.11-dostawa', async () => {
      const l = await readLayers(page)
      dump('MG.11-2-warstwy-przed-dostawa', l)
      const ok = await openDockRow(page, '10 000,00')
      if (!ok) {
        dump('MG.11-3-brak-wiersza', await text(page, 'section[data-panel="bridge:Dokowanie"]'))
        return
      }
      const d = await readDock(page)
      await shot(page, 'MG.11-dokowanie')
      await readNow(page, 'mg', 'MG.11', `${STATE} – okno dokowania nowej dostawy (Bieżące 10 000 zł)`, dirs, async () => ({ ...d, warstwyPrzed: l.stan }))
      await page.getByTestId('docking-confirm').click()
      await page.waitForTimeout(1500)
      dump('MG.11-4-po-dokowaniu-okno', await where(page))
      if (await page.getByTestId('docking-done').count()) await page.keyboard.press('Escape')
      await page.waitForTimeout(800)
      const l2 = await readLayers(page)
      const m2 = await map()
      await readNow(page, 'mg', 'MG.11', `${STATE} – stany po dostawie`, dirs, async () => ({
        ...Object.fromEntries(m2.goals.map((g) => [g.name ?? '?', goalLine(g)])),
        zarchiwizowane: m2.archived.join(' || '),
        naglowek: m2.header,
        stan: l2.stan
      }))
      await shot(page, 'MG.11-po-dostawie')
    })

    // ---------------- MG.9 (cont.): the archived „Telewizor” after the delivery, then its money moved and the goal brought back
    await step('MG.9-przenies-przywroc', async () => {
      const r = await read9('Telewizor zarchiwizowany po dostawie (MG.11)')
      dump('MG.9-6-po-dostawie', r.values)
      await go(page, '6', 'page-starmap')
      const row = page.locator('[data-testid="starmap-archived-row"]').filter({ hasText: 'Telewizor' })
      await row.getByTestId('starmap-archived-move').click()
      await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
      const dlg = (await text(page, '[data-testid="starmap-money"] [role="dialog"]')).replace(/\s+/g, ' ')
      await page.getByTestId('starmap-money-goal').check()
      await page.getByTestId('starmap-money').getByRole('combobox').selectOption({ label: 'Rower' })
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(500)
      const t = await toasts(page)
      const r2 = await read9('„przenieś środki” zarchiwizowanego Telewizora do Rowera')
      dump('MG.9-7-przenies', { okno: dlg, toasty: t, ...r2.values })
      await go(page, '6', 'page-starmap')
      await page.locator('[data-testid="starmap-archived-row"]').filter({ hasText: 'Telewizor' }).getByRole('button', { name: 'przywróć' }).click()
      await page.waitForTimeout(1500)
      const r3 = await read9('„przywróć” Telewizora')
      dump('MG.9-8-przywroc', r3.values)
      await shot(page, 'MG.9-przywrocony')
    })

    // ---------------- MG.10: Rower brought to 700 zł, then an expense of 900 zł paid from it
    await step('MG.10', async () => {
      await go(page, '6', 'page-starmap')
      const m = await readStarmap(page)
      const rower = m.goals.find((g) => g.name === 'Rower')
      const have = Number((rower?.amount ?? '0').replace(/[^\d,]/g, '').replace(',', '.'))
      if (have > 700) {
        await moveDialog('Rower')
        await setMoveAmount(String(Math.round((have - 700) * 100) / 100).replace('.', ','))
        await page.getByTestId('starmap-money-shields').check()
        await page.getByTestId('starmap-money-ok').click()
        await page.waitForTimeout(1500)
      }
      const plan = async () => {
        await go(page, '4', 'page-month')
        await page.waitForTimeout(800)
        const env = await page.locator('[data-testid="month-envelope"][data-name="Rozrywka i hobby"]').innerText().catch(() => '(brak)')
        return { energiaDzis: await text(page, '[data-testid="month-energy-today"]').catch(() => '?'), koperta: env.replace(/\s+/g, ' ') }
      }
      const readAll = async (label: string) => {
        const l = await readLayers(page)
        // „skąd cele osłon i kadłuba?”
        const why = page.getByText('skąd cele osłon i kadłuba?')
        let cele = '(brak)'
        if (await why.count()) {
          await why.first().click()
          await page.waitForTimeout(500)
          cele = (await text(page, 'section[data-panel="bridge:Stan okrętu"]')).replace(/\s+/g, ' ')
          await why.first().click().catch(() => undefined)
        }
        const p = await plan()
        const mm = await map()
        return readNow(page, 'mg', 'MG.10', `${STATE} – ${label}`, dirs, async () => ({
          Rower: mm.goals.find((g) => g.name === 'Rower')?.amount ?? null,
          oslony: layerOf(l.stan, 'Osłony'),
          kadlub: layerOf(l.stan, 'Kadłub'),
          zasieg: (l.stan.match(/ZASIĘG [^K]*/) ?? ['?'])[0],
          energiaDzisMostek: l.energia,
          energiaDzisPlan: p.energiaDzis,
          kopertaRozrywka: p.koperta,
          skadCele: cele,
          stan: l.stan
        }))
      }
      const before10 = await readAll('przed wydatkiem z celu (Rower 700 zł)')
      dump('MG.10-1-przed', before10.values)
      // The expense: Operacje → Ctrl+N, 900 zł, „Rozrywka i hobby”, „Z celu: Rower”.
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
      const goalOptions = await page.getByTestId('operation-goal').locator('option').allInnerTexts()
      const rowerOpt = goalOptions.find((o) => o.startsWith('Rower'))
      if (rowerOpt) await page.getByTestId('operation-goal').selectOption({ label: rowerOpt })
      await page.waitForTimeout(800)
      const note = await text(page, '[data-testid="operation-goal-note"]').catch(() => '(brak)')
      const editor = (await text(page, '[data-testid="operation-editor"]')).replace(/\s+/g, ' ')
      await shot(page, 'MG.10-edytor')
      await page.waitForTimeout(1500)
      const row = page.locator('[data-testid="operation-row"]').filter({ hasText: 'Sklep rowerowy' }).first()
      const rowText = (await row.innerText().catch(() => '(brak wiersza)')).replace(/\s+/g, ' ')
      dump('MG.10-2-edytor', { opcjeCelu: goalOptions, notka: note, edytor: editor, wiersz: rowText, plik: recordsOf(st.dataDir, 'transactions').filter((t) => t.counterparty === 'Sklep rowerowy') })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(800)
      const after10 = await readAll('po wydatku 900 zł z celu Rower')
      dump('MG.10-3-po', after10.values)
    })

    dump('bledy-okna', run.errors)
  } finally {
    await run.app.close().catch(() => undefined)
    dump('ictj-zmiany-aplikacji', guard.check())
  }
})
