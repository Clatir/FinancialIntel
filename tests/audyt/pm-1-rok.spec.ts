// PM, przebieg 1 – persona „rok” (kotwica 2026-11-03) z jedną zmianą przed startem: plan października 2026 ma kopertę
// „Zdrowie” 300 zł (było 150 zł) – zapas koperty planowej do PM.22. Kolejno: odczyty bazowe (PM.1, PM.5, PM.10, PM.12),
// PM.4 (pensja ponad średnią i z powrotem), łupy października (PM.18 → PM.20 → PM.22 → PM.21), debriefingi (PM.24,
// PM.19 i PM.14 – część na danych z przeszłości), Plan miesiąca w przód (PM.7, PM.8, PM.27), Plan kampanii (PM.28),
// Ustawienia → Kategorie (PM.11, PM.26). Narzędzie obserwacji – oceny w docs/audyt/raport/PM.md.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState } from './lab'
import {
  type Ctx,
  editJson,
  go,
  goMonth,
  out,
  read,
  readBridgeAll,
  readDaily,
  readDebrief,
  readEnvelopes,
  readIncome,
  readSalary,
  readSplit,
  shotEl,
  stepper,
  textOf,
  toasts,
  typeAmount,
  CAT
} from './pm-pomoc'

const RUN = 'pm-1'

const num = (s: string): string => (s.match(/−?-?[\d\s]+,\d\d/)?.[0] ?? '').replace(/\s/g, '')

test('PM przebieg 1 – rok: pensja, przychody, podział, łupy, plan w przód, kampania, kategorie', async () => {
  test.setTimeout(30 * 60_000)
  const st = useState('rok', RUN)
  editJson(join(st.dataDir, 'months', '2026-10.json'), (j) => {
    j.envelopes[CAT.health] = 30000
  })
  const ctx: Ctx = { dataDir: st.dataDir, ictjDir: st.ictjDir, state: 'rok + październik: Zdrowie 300 zł (pm-1)' }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  const rd = (point: string, v: Record<string, string | number | null>) => read(page, ctx, point, v)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(6000)

    // ---- Odczyty bazowe ----
    let bridge0: Record<string, string> = {}
    await step('mostek-0', async () => {
      bridge0 = await readBridgeAll(page)
      dump('mostek-0', bridge0)
      await shot(page, 'PM.1-mostek')
    })
    await step('plan-0', async () => {
      await go(page, '4', 'page-month')
      const s = await readSalary(page)
      const inc = await readIncome(page)
      const sp = await readSplit(page)
      const d = await readDaily(page)
      const e = await readEnvelopes(page)
      const b = await readDebrief(page)
      dump('plan-0', { s, inc, sp, d, e, b, zrodlo: await textOf(page.getByTestId('month-source')) })
      await shot(page, 'PM.1-plan')
      await shotEl(page.getByTestId('month-salary-panel'), 'PM.1-pensja')
      await shotEl(page.getByTestId('income-panel'), 'PM.5-przychody')
      await shotEl(page.getByTestId('month-split'), 'PM.10-podzial-przed')
      await shotEl(page.getByTestId('month-daily'), 'PM.12-przydzial-rok')
      await rd('PM.1', { pensjaPlanu: s.pole, wyplacono: s.wyplacono, alarmy: s.alarmy, panel: s.panel, osłonyMostek: bridge0.stan, energiaMostek: bridge0.stan, energiaDzis: bridge0.energia })
      const inc12: Record<string, string> = {}
      for (const k of Object.keys(inc)) if (/^(work|trading|total)-/.test(k)) inc12[k] = inc[k]!
      await rd('PM.5', { ...inc12, panel: inc.panel, wobecPensji: inc.wobecPensji, tytuly: inc.tytulyKolumn })
      await rd('PM.10', { etap: 'przed decyzją o łupach', ...sp })
      await rd('PM.12', { etap: 'rok bez zmian (bazowy)', ...d, mostekEnergia: bridge0.energia, mostekPodpis: bridge0.podpis, mostekRozbicie: bridge0.rozbicie ?? '' })
    })
    await step('mostek-przychody', async () => {
      await go(page, '1', 'page-bridge')
      const bi = await page.getByTestId('bridge-income').count()
      const vals: Record<string, string> = {}
      if (bi) {
        const r = page.getByTestId('bridge-income')
        for (const row of ['work', 'trading', 'total']) for (const col of ['3', '6', '12', 'median']) vals[`${row}-${col}`] = await textOf(r.getByTestId(`income-${row}-${col}`))
        await shotEl(r, 'PM.5-mostek')
      }
      dump('mostek-przychody', vals)
      await rd('PM.5', { ekran: 'Mostek → Przychody', ...vals })
    })

    // ---- PM.4: pensja ponad średnią 6 mies., potem równa średniej, potem z powrotem 6 500 ----
    await step('PM.4', async () => {
      await go(page, '4', 'page-month')
      const inc = await readIncome(page)
      const avg6 = num(inc['total-6'] ?? '')
      dump('PM.4-srednia', { avg6, inc })
      const salary = page.getByTestId('month-salary')
      const states: Record<string, unknown> = {}
      await typeAmount(page, salary, '15000')
      await page.waitForTimeout(1500)
      states.p15000 = await readSalary(page)
      states.inc15000 = await textOf(page.getByTestId('income-vs-salary'))
      await shotEl(page.getByTestId('month-salary-panel'), 'PM.4-15000')
      const b = await readBridgeAll(page)
      states.odprawa15000 = b.odprawa
      await shotEl(page.locator('section[data-panel="bridge:Odprawa"]').first(), 'PM.4-odprawa')
      await rd('PM.4', { pensja: '15 000,00', srednia6: inc['total-6'] ?? '', ostrzezenie: String((states.p15000 as Record<string, string>).ponadPrzychod), odprawa: b.odprawa.split(' || ').filter((l) => /Pensja|przych/i.test(l)).join(' || ') })
      await go(page, '4', 'page-month')
      if (avg6) {
        await typeAmount(page, salary, avg6)
        await page.waitForTimeout(1500)
        states.rowna = await readSalary(page)
        await rd('PM.4', { pensja: avg6, srednia6: inc['total-6'] ?? '', ostrzezenie: String((states.rowna as Record<string, string>).ponadPrzychod) })
        const cents = Math.round(Number(avg6.replace(',', '.')) * 100) + 1
        const plus1 = `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`
        await typeAmount(page, salary, plus1)
        await page.waitForTimeout(1500)
        states.plusGrosz = await readSalary(page)
        await rd('PM.4', { pensja: plus1, srednia6: inc['total-6'] ?? '', ostrzezenie: String((states.plusGrosz as Record<string, string>).ponadPrzychod) })
      }
      await typeAmount(page, salary, '6500')
      await page.waitForTimeout(1500)
      states.powrot = await readSalary(page)
      await rd('PM.4', { pensja: '6 500,00', ostrzezenie: String((states.powrot as Record<string, string>).ponadPrzychod) })
      dump('PM.4', states)
    })

    // ---- PM.18: łupy października – decyzja do 7.11 ----
    const lootForm = async (label: string) => {
      const p = page.getByTestId('month-debrief')
      const goals = await p.locator('input[aria-label^="Cel "]').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label')}=${(e as HTMLInputElement).value}`))
      const envs = await p.locator('[data-testid="loot-envelope"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ') + ` [${(e.querySelector('input') as HTMLInputElement | null)?.value}]`))
      const confirm = p.getByTestId('loot-confirm')
      const r = {
        loot: (await textOf(p.getByTestId('loot'))).replace(/\s*\n\s*/g, ' | '),
        next: await p.getByTestId('loot-next').inputValue().catch(() => '(brak)'),
        goals: goals.join(' ; '),
        envs: envs.join(' ; '),
        confirmDisabled: (await confirm.count()) ? String(await confirm.isDisabled()) : '(brak)'
      }
      dump(`lupy-${label}`, r)
      return r
    }
    let lootX = ''
    await step('PM.18', async () => {
      await goMonth(page, '2026-10')
      const before = await lootForm('PM.18-przed')
      lootX = num(before.loot.split('Do podziału:')[1] ?? '')
      await shotEl(page.getByTestId('month-debrief'), 'PM.18-przed')
      const bridgeShields0 = (await readBridgeAll(page)).stan
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-10')
      const p = page.getByTestId('month-debrief')
      // Suma ponad X: cała kwota „na następny miesiąc” i 50 zł do celu.
      await typeAmount(page, p.getByTestId('loot-next'), lootX)
      await typeAmount(page, p.getByLabel('Cel Wakacje 2027'), '50')
      const over = await lootForm('PM.18-ponad')
      await shotEl(p, 'PM.18-ponad')
      await typeAmount(page, p.getByTestId('loot-next'), '100')
      const ok = await lootForm('PM.18-100-50')
      await rd('PM.18', { etap: 'formularz', X: lootX, doPodzialu: before.loot, cele: before.goals, zapasy: before.envs, ponadX_next: over.next, ponadX_przyciskWylaczony: over.confirmDisabled, nastepny: ok.next, cel: ok.goals, formularz: ok.loot, mostekStan: bridgeShields0 })
      await p.getByTestId('loot-confirm').click()
      await page.waitForTimeout(2500)
      const after = await readDebrief(page)
      dump('PM.18-po', after)
      await shotEl(page.getByTestId('month-debrief'), 'PM.18-po')
      await goMonth(page, '2026-11')
      const sp = await readSplit(page)
      const d = await readDaily(page)
      await shotEl(page.getByTestId('month-split'), 'PM.18-podzial-M0')
      await go(page, '6', 'page-starmap')
      const map = await textOf(page.getByTestId('page-starmap'))
      dump('PM.18-mapa', map)
      await shot(page, 'PM.18-mapa')
      const b = await readBridgeAll(page)
      await rd('PM.18', { etap: 'po zatwierdzeniu', decyzja: after.decyzja, lupy: after.lupy, lupyWierszM0: sp.lupy, podzialM0: sp.panel, dzienny: d.panel, mapa: map.replace(/\s*\n\s*/g, ' | ').slice(0, 3000), mostekStan: b.stan, energia: b.energia })
    })

    // ---- PM.10: podział pensji M0 po decyzji (łupy „na następny miesiąc” 100 zł) ----
    await step('PM.10', async () => {
      await goMonth(page, '2026-11')
      const sp = await readSplit(page)
      const d = await readDaily(page)
      await shotEl(page.getByTestId('month-split'), 'PM.10')
      await go(page, '5', 'page-cargo')
      const cargo = await textOf(page.getByTestId('page-cargo'))
      dump('PM.10-ladownia', cargo)
      await shot(page, 'PM.10-ladownia')
      await rd('PM.10', { etap: 'po decyzji (następny miesiąc 100 zł)', ...sp, dzienny: d.panel, ladownia: cargo.replace(/\s*\n\s*/g, ' | ').slice(0, 4000) })
    })

    // ---- PM.20: zmiana podziału łupów (przed 7.11 – zegar), „Anuluj”, M-2 ----
    await step('PM.20', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-10')
      const p = page.getByTestId('month-debrief')
      const btn = p.getByTestId('debriefing-edit-loot')
      const has = await btn.count()
      dump('PM.20-przycisk', { has, decyzja: await textOf(p.getByTestId('loot-decided')) })
      if (has) {
        await btn.click()
        await page.waitForTimeout(500)
        const form0 = await lootForm('PM.20-edycja-start')
        await typeAmount(page, p.getByTestId('loot-next'), '200')
        await typeAmount(page, p.getByLabel('Cel Wakacje 2027'), '80')
        const form1 = await lootForm('PM.20-edycja-200-80')
        await shotEl(p, 'PM.20-edycja')
        await p.getByTestId('loot-confirm').click()
        await page.waitForTimeout(2500)
        const after = await readDebrief(page)
        await shotEl(p, 'PM.20-po')
        await goMonth(page, '2026-11')
        const sp = await readSplit(page)
        await go(page, '6', 'page-starmap')
        const map = await textOf(page.getByTestId('page-starmap'))
        const b = await readBridgeAll(page)
        await rd('PM.20', { etap: 'zmiana 100/50 → 200/80', formularzStart: form0.loot, formularz: form1.loot, decyzja: after.decyzja, lupy: after.lupy, lupyWierszM0: sp.lupy, mapa: map.replace(/\s*\n\s*/g, ' | ').slice(0, 3000), mostekStan: b.stan })
        // Drugi raz – „Anuluj”.
        await go(page, '4', 'page-month')
        await goMonth(page, '2026-10')
        await p.getByTestId('debriefing-edit-loot').click()
        await page.waitForTimeout(400)
        await typeAmount(page, p.getByTestId('loot-next'), '300')
        await p.getByRole('button', { name: 'Anuluj', exact: true }).click()
        await page.waitForTimeout(1500)
        const cancel = await readDebrief(page)
        await goMonth(page, '2026-11')
        const sp2 = await readSplit(page)
        const b2 = await readBridgeAll(page)
        await rd('PM.20', { etap: 'Anuluj (300 wpisane)', decyzja: cancel.decyzja, lupy: cancel.lupy, lupyWierszM0: sp2.lupy, mostekStan: b2.stan })
      }
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-09')
      const m2 = page.getByTestId('month-debrief')
      dump('PM.20-M-2', { przycisk: await m2.getByTestId('debriefing-edit-loot').count(), lupy: await textOf(m2.getByTestId('loot')) })
      await shotEl(m2, 'PM.20-M-2')
    })

    // ---- PM.22: zapas koperty planowej Zdrowie na listopad ----
    await step('PM.22', async () => {
      await goMonth(page, '2026-10')
      const p = page.getByTestId('month-debrief')
      const b0 = await readDebrief(page)
      await p.getByTestId('debriefing-edit-loot').click()
      await page.waitForTimeout(400)
      const zap = p.getByLabel('Zapas koperty Zdrowie')
      const exists = await zap.count()
      const res: Record<string, string> = { debriefPrzed: b0.koperty, zapasPole: String(exists) }
      if (exists) {
        await typeAmount(page, zap, '250')
        res.po250 = await zap.inputValue()
        res.form250 = (await lootForm('PM.22-250')).loot
        await typeAmount(page, zap, '200')
        res.po200 = await zap.inputValue()
        res.form200 = (await lootForm('PM.22-200')).loot
        await shotEl(p, 'PM.22-formularz')
        await p.getByTestId('loot-confirm').click()
        await page.waitForTimeout(2500)
        res.decyzja = await textOf(p.getByTestId('loot-decided'))
      }
      await goMonth(page, '2026-11')
      const sp = await readSplit(page)
      const e = await readEnvelopes(page)
      const d = await readDaily(page)
      await shotEl(page.getByTestId('month-split'), 'PM.22-podzial')
      await shotEl(page.getByTestId('month-envelopes'), 'PM.22-koperty')
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Debriefing' }).click()
      await page.waitForTimeout(800)
      await page.getByTestId('reports-debrief-month').selectOption('2026-11')
      await page.waitForTimeout(1200)
      const rep = await textOf(page.getByTestId('reports-debrief'))
      dump('PM.22-raporty-M0', rep)
      await shot(page, 'PM.22-raporty-M0')
      await rd('PM.22', { ...res, podzialM0: sp.koperty, lupyWierszM0: sp.lupy, kopertyM0: e.koperty, dzienny: d.panel, raportyDebriefM0: rep.replace(/\s*\n\s*/g, ' | ').slice(0, 3000) })
    })

    // ---- PM.21: wydatek „Jedzenie” 80 zł z datą w październiku, potem usunięty ----
    await step('PM.21', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-10')
      const before = await readDebrief(page)
      await page.keyboard.press('Control+2')
      await page.getByTestId('page-operations').waitFor({ timeout: 30_000 })
      await page.waitForTimeout(800)
      await page.getByTestId('operation-new').click()
      await page.waitForTimeout(600)
      await typeAmount(page, page.getByTestId('operation-amount'), '80')
      const date = page.getByTestId('operation-date')
      await date.click()
      await date.fill('15.10.2026')
      await date.press('Tab')
      await page.getByTestId('operation-category').selectOption(CAT.groceries)
      await page.getByTestId('operation-counterparty').fill('AUDYT PM21 SKLEP')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(1500)
      dump('PM.21-edytor', (await textOf(page.getByTestId('page-operations'))).slice(0, 2500))
      await shot(page, 'PM.21-operacja')
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-10')
      const after = await readDebrief(page)
      await shotEl(page.getByTestId('month-debrief'), 'PM.21-po-wydatku')
      await rd('PM.21', { etap: 'przed wydatkiem', decyzja: before.decyzja, zmiana: before.zmiana, lupy: before.lupy, energia: before.energia })
      await rd('PM.21', { etap: 'po wydatku 80 zł (15.10)', decyzja: after.decyzja, zmiana: after.zmiana, lupy: after.lupy, energia: after.energia })
      // Usunięcie (kosz w edytorze operacji).
      await page.keyboard.press('Control+2')
      await page.getByTestId('page-operations').waitFor({ timeout: 30_000 })
      await page.waitForTimeout(800)
      const label = await page.getByTestId('operations-period').innerText().catch(() => '')
      if (label !== 'cała historia') {
        await page.getByTestId('operations-period-menu').click()
        await page.getByTestId('operations-period-all').click()
        await page.waitForTimeout(500)
      }
      await page.getByTestId('operations-search').fill('AUDYT PM21')
      await page.waitForTimeout(800)
      await page.getByTestId('operation-row').first().click()
      await page.waitForTimeout(600)
      await page.getByTestId('operation-delete').click()
      await page.getByTestId('operation-delete-confirm').click()
      await page.waitForTimeout(1200)
      dump('PM.21-usuniecie', await toasts(page))
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-10')
      const del = await readDebrief(page)
      await shotEl(page.getByTestId('month-debrief'), 'PM.21-po-usunieciu')
      await rd('PM.21', { etap: 'po usunięciu wydatku', decyzja: del.decyzja, zmiana: del.zmiana, lupy: del.lupy, energia: del.energia })
    })

    // ---- PM.24 (+ PM.23 na październiku i wrześniu bez dodatków): debriefingi M-1, M-2, M0; Raporty ----
    await step('PM.24', async () => {
      const ls = async () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('fi.month.plus')).join(','))
      const ls0 = await ls()
      await go(page, '4', 'page-month')
      const m1 = (await goMonth(page, '2026-10')) && (await readDebrief(page))
      await shotEl(page.getByTestId('month-debrief'), 'PM.24-M-1')
      const anim = await page
        .getByTestId('month-plus')
        .locator('.animate-event-in, .animate-sweep')
        .evaluateAll((els) => els.map((e) => `${e.className} anim=${getComputedStyle(e).animationName} ${getComputedStyle(e).animationDuration}`))
        .catch(() => [])
      const ls1 = await ls()
      await goMonth(page, '2026-09')
      const m2 = await readDebrief(page)
      await shotEl(page.getByTestId('month-debrief'), 'PM.24-M-2')
      await goMonth(page, '2026-11')
      const m0 = await readDebrief(page)
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Debriefing' }).click()
      await page.waitForTimeout(800)
      await page.getByTestId('reports-debrief-month').selectOption('2026-11')
      await page.waitForTimeout(1200)
      const rep = await textOf(page.getByTestId('reports-debrief'))
      await shot(page, 'PM.24-raporty-M0')
      dump('PM.24', { m1, m2, m0, rep, anim, ls0, ls1 })
      await rd('PM.24', { miesiac: '2026-10 (M-1)', plus: (m1 as Record<string, string>).plus, minus: (m1 as Record<string, string>).minus, energia: (m1 as Record<string, string>).energia, paliwo: (m1 as Record<string, string>).paliwo, animacja: anim.join(' ; '), localStorage: `${ls0} → ${ls1}` })
      await rd('PM.24', { miesiac: '2026-09 (M-2)', plus: m2.plus, minus: m2.minus, energia: m2.energia, paliwo: m2.paliwo, panel: m2.panel.slice(0, 2500) })
      await rd('PM.24', { miesiac: '2026-11 (M0) – Plan i Raporty', panelPlanuNaM0: m0.panel.slice(0, 600), raporty: rep.replace(/\s*\n\s*/g, ' | ').slice(0, 2500) })
      await rd('PM.23', { miesiac: '2026-10 (M-1, rok bez dodatków)', ...(m1 as Record<string, string>) })
    })

    // ---- PM.19 (część: miesiące M-2 i starsze bez decyzji) i PM.14 (część: podstawowy przydział lutego) ----
    await step('PM.19-14', async () => {
      await go(page, '4', 'page-month')
      const res: Record<string, string> = {}
      for (const m of ['2026-09', '2026-08', '2026-07', '2026-04', '2026-02', '2025-10']) {
        await goMonth(page, m)
        res[`lupy ${m}`] = await textOf(page.getByTestId('loot'))
        res[`energia ${m}`] = (await textOf(page.getByTestId('debrief-energy'))).replace(/\s*\n\s*/g, ' | ')
      }
      await goMonth(page, '2026-08')
      await shotEl(page.getByTestId('month-debrief'), 'PM.19-sierpien')
      dump('PM.19', res)
      await rd('PM.19', res)
      const daily: Record<string, string> = {}
      for (const m of ['2026-02', '2025-12', '2026-04', '2026-10', '2026-11', '2026-12']) {
        await goMonth(page, m)
        const sp = await readSplit(page)
        daily[m] = `${sp.koperty} || ${(sp.panel.match(/Podstawowy przydział:[^|]*/) ?? [''])[0]} || łupy: ${sp.lupy}`
      }
      await goMonth(page, '2026-02')
      await shotEl(page.getByTestId('month-split'), 'PM.14-luty')
      dump('PM.14', daily)
      await rd('PM.14', daily)
    })

    // ---- PM.7, PM.8, PM.27: następny miesiąc ----
    await step('PM.7', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-12')
      const s0 = await readSalary(page)
      dump('PM.7-przed', { s0, zrodlo: await textOf(page.getByTestId('month-source')), strona: (await textOf(page.getByTestId('page-month'))).slice(0, 2500) })
      await shotEl(page.getByTestId('month-salary-panel'), 'PM.7-propozycja')
      const prop = page.getByTestId('month-salary-propose')
      if (await prop.count()) await prop.click()
      await page.waitForTimeout(1500)
      const s1 = await readSalary(page)
      const src1 = await textOf(page.getByTestId('month-source'))
      await goMonth(page, '2026-11')
      const m0 = await readSalary(page)
      await rd('PM.7', { propozycja: s0.panel, poleM1Przed: s0.pole, poleM1Po: s1.pole, zrodloM1Po: src1, pensjaM0: m0.pole, wyplaconoM0: m0.wyplacono })
    })
    await step('PM.8', async () => {
      await goMonth(page, '2026-12')
      const sp0 = await readSplit(page)
      await page.getByTestId('month-envelopes-propose').click()
      await page.waitForTimeout(800)
      const t = await toasts(page)
      await page.waitForTimeout(1200)
      const sp1 = await readSplit(page)
      await shotEl(page.getByTestId('month-split'), 'PM.8-propozycja')
      // Ręczna poprawka jednej koperty: Jedzenie 1 234,00.
      const food = page.locator('[data-testid="month-envelope"][data-name="Jedzenie"] input')
      await typeAmount(page, food, '1234')
      await goMonth(page, '2026-11')
      const m0 = await readSplit(page)
      await goMonth(page, '2026-12')
      const sp2 = await readSplit(page)
      await rd('PM.8', { toast: t.join(' || '), kopertyPrzed: sp0.koperty, kopertyPropozycja: sp1.koperty, poPoprawce: sp2.koperty, kopertyM0: m0.koperty })
    })
    await step('PM.27', async () => {
      await goMonth(page, '2026-12')
      await typeAmount(page, page.locator('[data-testid="month-envelope"][data-name="Dom"] input'), '444')
      await typeAmount(page, page.locator('[data-testid="month-envelope"][data-name="Auto"] input'), '777')
      await typeAmount(page, page.getByTestId('month-salary'), '7100')
      const s = await readSalary(page)
      const sp = await readSplit(page)
      const panels = {
        koperty: await page.getByTestId('month-envelopes').count(),
        dzienny: await page.getByTestId('month-daily').count(),
        przychody: await page.getByTestId('income-panel').count(),
        debriefing: await textOf(page.getByTestId('month-debrief')).then((x) => x.slice(0, 200))
      }
      await shot(page, 'PM.27-grudzien')
      await page.getByRole('button', { name: 'bieżący', exact: true }).click()
      await page.waitForTimeout(800)
      const m0s = await readSalary(page)
      const m0sp = await readSplit(page)
      await go(page, '7', 'page-radar')
      const radar = await textOf(page.getByTestId('page-radar'))
      dump('PM.27-radar', radar)
      await shot(page, 'PM.27-radar')
      const lines = radar.split('\n').filter((l, i, a) => /Pensja|pensja|01\.12|1 gru|1\.12/.test(l) || /Pensja/.test(a[i - 1] ?? '')).slice(0, 12)
      await rd('PM.27', { pensjaM1: s.pole, kopertyM1: sp.koperty, panele: JSON.stringify(panels), pensjaM0: m0s.pole, kopertyM0: m0sp.koperty, radar: lines.join(' | ') })
    })

    // ---- PM.28: Plan kampanii ----
    await step('PM.28', async () => {
      await go(page, '4', 'page-month')
      await page.getByTestId('month-year-toggle').click()
      await page.waitForTimeout(1200)
      const row = async (name: string) =>
        page.locator(`[data-testid="year-row"][data-name="${name}"]`).evaluate((r) => {
          const cells = Array.from(r.querySelectorAll('[data-testid="year-cell"]')).map((c) => {
            const inp = c.querySelector('input') as HTMLInputElement | null
            const lim = c.querySelector('[data-testid="year-cell-limit"]') as HTMLElement | null
            const sp = c.querySelector('[data-testid="year-cell-spent"]') as HTMLElement | null
            return `${c.getAttribute('data-month')}: limit=${inp ? `[pole ${inp.value}]` : lim?.innerText ?? ''}${c.getAttribute('data-own') ? ' (własny)' : ' (odziedziczony)'} fakt=${sp?.innerText ?? '—'}${c.getAttribute('data-over') ? ' [ponad]' : ''}${sp ? ` kolor=${getComputedStyle(sp).color}` : ''} | title=${c.getAttribute('title')}`
          })
          const total = (r.querySelector('[data-testid="year-row-total"]') as HTMLElement | null)?.innerText.replace(/\s+/g, ' ')
          return [...cells, `rok: ${total}`].join('\n')
        })
      const grid = await textOf(page.getByTestId('year-plan'))
      const food2026 = await row('Jedzenie')
      const sal2026 = await row('Pensja').catch(() => '(brak)')
      await shotEl(page.getByTestId('year-plan'), 'PM.28-2026')
      dump('PM.28-2026', { grid, food2026, sal2026 })
      await rd('PM.28', { rok: '2026', jedzenie: food2026, pensja: sal2026 })
      await page.getByTestId('year-plan-next').click()
      await page.waitForTimeout(1200)
      const food2027 = await row('Jedzenie')
      const jan = page.locator('[data-testid="year-row"][data-name="Jedzenie"] [data-testid="year-cell"][data-month="2027-01"]')
      await typeAmount(page, jan.getByTestId('year-cell-input'), '1700')
      await jan.hover()
      await page.waitForTimeout(300)
      await jan.getByTestId('year-cell-copy').click()
      await page.waitForTimeout(1000)
      const t = await toasts(page)
      const food2027b = await row('Jedzenie')
      await shotEl(page.getByTestId('year-plan'), 'PM.28-2027-kopia')
      await page.getByRole('status').filter({ hasText: 'do końca roku' }).last().getByRole('button', { name: 'Cofnij' }).click()
      await page.waitForTimeout(1500)
      const food2027c = await row('Jedzenie')
      await page.getByTestId('year-plan-prev').click()
      await page.waitForTimeout(1000)
      const food2026b = await row('Jedzenie')
      await page.getByTestId('year-plan-prev').click()
      await page.waitForTimeout(1000)
      const food2025 = await row('Jedzenie')
      dump('PM.28-2027', { food2027, t, food2027b, food2027c, food2026b, food2025 })
      await rd('PM.28', { rok: '2027', przed: food2027, toast: t.join(' || '), poKopii: food2027b, poCofnij: food2027c, rok2026PoCofnij: food2026b, rok2025: food2025 })
      await page.getByTestId('month-year-toggle').click()
      await page.waitForTimeout(500)
    })

    // ---- PM.11: Zdrowie z planowej na codzienną i z powrotem ----
    const settingsCats = async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-categories').click()
      await page.waitForTimeout(700)
    }
    await step('PM.11', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const sp0 = await readSplit(page)
      const d0 = await readDaily(page)
      const b0 = await readBridgeAll(page)
      await rd('PM.11', { etap: 'przed (Zdrowie planowa)', podzial: sp0.panel, dzienny: d0.panel, mostekEnergia: b0.energia, mostekPodpis: b0.podpis })
      await settingsCats()
      await page.locator('[data-testid="category-row"][data-name="Zdrowie"]').getByRole('radio', { name: 'codzienna' }).click()
      await page.waitForTimeout(1500)
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const sp1 = await readSplit(page)
      const d1 = await readDaily(page)
      await shotEl(page.getByTestId('month-split'), 'PM.11-codzienna')
      const b1 = await readBridgeAll(page)
      await rd('PM.11', { etap: 'Zdrowie codzienna', podzial: sp1.panel, dzienny: d1.panel, mostekEnergia: b1.energia, mostekPodpis: b1.podpis, rozbicie: b1.rozbicie ?? '' })
      await settingsCats()
      await page.locator('[data-testid="category-row"][data-name="Zdrowie"]').getByRole('radio', { name: 'planowa' }).click()
      await page.waitForTimeout(1500)
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const sp2 = await readSplit(page)
      const d2 = await readDaily(page)
      const b2 = await readBridgeAll(page)
      await rd('PM.11', { etap: 'po przywróceniu (planowa)', podzial: sp2.panel, dzienny: d2.panel, mostekEnergia: b2.energia, mostekPodpis: b2.podpis })
    })

    // ---- PM.26: archiwizacja „Zwierzęta” i „Cofnij” (dwa razy – toast trwa 8 s) ----
    await step('PM.26', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const quick = async () => {
        const p = page.getByTestId('month-split')
        const t = await textOf(p)
        return `${(t.match(/Rozdzielone[^\n]*\n?[^\n]*/) ?? [''])[0].replace(/\n/g, ' ')} | ${(t.match(/Podstawowy przydział:[^\n]*/) ?? [''])[0]} | Zwierzęta: ${await p.locator('[data-testid="month-envelope"][data-name="Zwierzęta"] input').inputValue().catch(() => '(brak wiersza)')}`
      }
      const before = await quick()
      const res: Record<string, string> = { przedM0: before }
      // 1) M0 i „Cofnij”.
      await settingsCats()
      await page.locator('[data-testid="category-row"][data-name="Zwierzęta"] [data-testid="category-archive"]').click()
      await page.waitForTimeout(400)
      res.toast1 = (await toasts(page)).join(' || ')
      await page.keyboard.press('Control+4')
      await page.getByTestId('page-month').waitFor()
      await page.waitForTimeout(500)
      res.poM0 = await quick()
      await shotEl(page.getByTestId('month-split'), 'PM.26-po')
      await page.getByRole('status').filter({ hasText: 'Zarchiwizowano' }).last().getByRole('button', { name: 'Cofnij' }).click()
      await page.waitForTimeout(1500)
      res.poCofnijM0 = await quick()
      // 2) M+1 i M-1, potem „Cofnij”.
      await settingsCats()
      await page.locator('[data-testid="category-row"][data-name="Zwierzęta"] [data-testid="category-archive"]').click()
      await page.waitForTimeout(400)
      await page.keyboard.press('Control+4')
      await page.getByTestId('page-month').waitFor()
      await page.getByTestId('month-next').click()
      await page.waitForTimeout(500)
      res.poM1 = await quick()
      await page.getByTestId('month-prev').click()
      await page.getByTestId('month-prev').click()
      await page.waitForTimeout(500)
      res.poMminus1 = await quick()
      res.debriefMminus1 = await textOf(page.getByTestId('month-debrief')).then((x) => x.split('\n').filter((l) => /Zwierz/.test(l)).join(' | '))
      await page.getByRole('status').filter({ hasText: 'Zarchiwizowano' }).last().getByRole('button', { name: 'Cofnij' }).click()
      await page.waitForTimeout(1500)
      res.kategoria = await (async () => {
        await settingsCats()
        return textOf(page.locator('[data-testid="category-row"][data-name="Zwierzęta"]'))
      })()
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      res.poCofnij2M0 = await quick()
      await goMonth(page, '2026-12')
      res.poCofnij2M1 = await quick()
      dump('PM.26', res)
      await rd('PM.26', res)
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
