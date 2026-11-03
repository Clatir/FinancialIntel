// LA, przebieg B (stan „rok + opłaty okresowe”): LA.3 odkładka OC, LA.4 cykle, LA.8 rata wyrównawcza, LA.9 płatność ze
// zbiornika, LA.10 opłata przed terminem, LA.11 zrzut i archiwizacja; przebieg B2 – OC motocykla zarchiwizowane we wrześniu
// (resztka zbiornika). Narzędzie obserwacji – oceny w docs/audyt/raport/LA.md.
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { briefing, bridgeState, build, C, cargoScreen, go, monthAt, monthScreen, openContainer, out, rd, ready, recordsOf, textOf, toasts } from './la-pomoc'

/** Plan miesiąca from `from` months to `to` months around the current one: each month's split and debriefing. */
async function months(page: import('@playwright/test').Page, from: number, to: number): Promise<Record<string, Record<string, string>>> {
  const res: Record<string, Record<string, string>> = {}
  await monthAt(page, from)
  for (let d = from; d <= to; d++) {
    if (d > from) {
      await page.getByTestId('month-next').click()
      await page.waitForTimeout(450)
    }
    const m = await monthScreen(page)
    res[`${d >= 0 ? '+' : ''}${d} ${m.miesiac}`] = { odkladki: m.odkladki, podzial: m.podzial, debriefing: m.debriefing }
  }
  return res
}

async function radar(page: import('@playwright/test').Page): Promise<string> {
  await go(page, '7', 'page-radar')
  return (await textOf(page.getByTestId('radar-items'))).replace(/\n/g, ' | ')
}

test('LA przebieg B – opłaty okresowe: LA.3, LA.4, LA.8, LA.9, LA.10, LA.11', async () => {
  const RUN = 'la-b'
  const STATE = 'rok + opłaty okresowe (la-b)'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('stan', build(st.dataDir, ['okresowe']))
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
      await shot(page, `LA-b-BLAD-${name}`).catch(() => undefined)
    }
  }
  try {
    await ready(page)
    await step('start', async () => {
      const b = await bridgeState(page)
      const o = await briefing(page)
      await shot(page, 'LA.10-mostek')
      const rad = await radar(page)
      await shot(page, 'LA.10-radar')
      await go(page, '5', 'page-cargo')
      const c = await cargoScreen(page)
      await shot(page, 'LA.3-ladownia')
      const ms = await months(page, -14, 4)
      dump('B-start', { b, o, rad, c, ms })
      rd('LA.3', `${STATE} – start`, { odkladki: c.odkladki, wiersze: c.rows, mostek: b.stan, plan: ms }, st)
      rd('LA.10', `${STATE} – start`, { odprawa: o.map((x) => x.text), radar: rad, odkladki: c.odkladki, plan: Object.fromEntries(Object.entries(ms).filter(([k]) => /^[+-]?[01] |^\+[2-4] /.test(k))) }, st)
      rd('LA.9', `${STATE} – start`, { odkladki: c.odkladki, mostek: b.stan, energia: b.energia, planM1: JSON.stringify(Object.entries(ms).find(([k]) => k.startsWith('-1 '))), planM2: JSON.stringify(Object.entries(ms).find(([k]) => k.startsWith('-2 '))) }, st)
      rd('LA.11', `${STATE} – przed archiwizacją (OC motocykla aktywny)`, { mostek: b.stan, energia: b.energia, odkladki: c.odkladki }, st)
    })
    await step('edytory', async () => {
      await go(page, '5', 'page-cargo')
      const eds: Record<string, string> = {}
      for (const n of ['OC samochodu', 'Wywóz śmieci', 'Podatek od nieruchomości', 'Woda', 'OC motocykla']) {
        eds[n] = await openContainer(page, n)
        // The hints of the cycle and the payment (only the field's hint texts).
        eds[`${n}:pola`] = (await page.getByTestId('cargo-editor').locator('xpath=.//*[contains(text(),"Opłata okresowa") or contains(text(),"Najbliższa") or contains(text(),"Co miesiąc")]').allInnerTexts()).join(' / ')
      }
      await openContainer(page, 'Podatek od nieruchomości')
      await shot(page, 'LA.4-podatek')
      dump('B-edytory', eds)
    })
    // ---- LA.4: Przegląd auta, cykl 13, potem 61 i 0; harmonogram z 1 i 12 miesiącami ----
    await step('LA.4', async () => {
      await go(page, '5', 'page-cargo')
      await page.getByTestId('cargo-add').click()
      const f = page.getByTestId('cargo-new')
      await f.getByTestId('container-name').fill('Przegląd auta')
      const a = f.getByTestId('container-amount')
      await a.click()
      await a.fill('350')
      await a.press('Tab')
      await f.getByTestId('container-cycle').selectOption('0')
      const n = f.getByTestId('container-cycle-months')
      await n.click()
      await n.fill('13')
      await n.press('Tab')
      await page.waitForTimeout(500)
      const draft13 = (await textOf(f)).replace(/\n/g, ' | ')
      await shot(page, 'LA.4-cykl13')
      // 61 and 0 in the draft
      await n.click()
      await n.fill('61')
      await n.press('Tab')
      await page.waitForTimeout(400)
      const t61d = await toasts(page)
      const v61d = await n.inputValue()
      await n.click()
      await n.fill('0')
      await n.press('Tab')
      await page.waitForTimeout(400)
      const t0d = await toasts(page)
      const v0d = await n.inputValue()
      await page.getByTestId('cargo-new-save').click()
      await page.waitForTimeout(1200)
      const rec = recordsOf(st.dataDir, 'containers').find((c) => c.name === 'Przegląd auta')
      // 61 and 0 in the saved container's editor
      const ed = page.getByTestId('cargo-editor')
      const n2 = ed.getByTestId('container-cycle-months')
      let saved: Record<string, unknown> = {}
      if (await n2.count()) {
        await n2.click()
        await n2.fill('61')
        await n2.press('Tab')
        await page.waitForTimeout(600)
        const t61 = await toasts(page)
        const r61 = recordsOf(st.dataDir, 'containers').find((c) => c.name === 'Przegląd auta')?.cycleMonths
        await n2.click()
        await n2.fill('0')
        await n2.press('Tab')
        await page.waitForTimeout(600)
        const t0 = await toasts(page)
        const r0 = recordsOf(st.dataDir, 'containers').find((c) => c.name === 'Przegląd auta')?.cycleMonths
        saved = { t61, r61, t0, r0, pole: await n2.inputValue() }
      } else saved = { brak: 'brak pola liczby miesięcy w edytorze', ed: await textOf(ed) }
      await shot(page, 'LA.4-cykl61')
      const edText = await openContainer(page, 'Przegląd auta')
      // Harmonogram with 1 and with 12 months – in a new draft (then cancelled).
      await page.getByTestId('cargo-add').click()
      const g = page.getByTestId('cargo-new')
      await g.getByTestId('container-name').fill('Harmonogram test')
      const a2 = g.getByTestId('container-amount')
      await a2.click()
      await a2.fill('100')
      await a2.press('Tab')
      await g.getByTestId('container-cycle').selectOption('-1')
      await page.waitForTimeout(400)
      const pressed1 = await g.locator('[data-testid="container-schedule-month"][aria-pressed="true"]').count()
      const hint1 = (await textOf(g.getByTestId('container-schedule'))).replace(/\n/g, ' | ')
      await shot(page, 'LA.4-harmonogram-1')
      for (let m = 1; m <= 12; m++) {
        const b = g.locator(`[data-testid="container-schedule-month"][data-month="${m}"]`)
        if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click()
      }
      await page.waitForTimeout(300)
      const pressed12 = await g.locator('[data-testid="container-schedule-month"][aria-pressed="true"]').count()
      const hint12 = (await textOf(g.getByTestId('container-schedule'))).replace(/\n/g, ' | ')
      await shot(page, 'LA.4-harmonogram-12')
      await g.getByRole('button', { name: 'Anuluj', exact: true }).click()
      await page.waitForTimeout(500)
      const c = await cargoScreen(page)
      const ms = await months(page, 0, 2)
      dump('LA.4', { draft13, t61d, v61d, t0d, v0d, rec, saved, edText, pressed1, hint1, pressed12, hint12, c, ms })
      rd('LA.4', `${STATE} + „Przegląd auta” 350 zł co 13 mies.`, { wiersze: c.rows, odkladki: c.odkladki, masa: c.masa, linia: c.linia, plan: ms, projekt13: draft13 }, st)
    })
    // ---- LA.8: Ubezpieczenie domu 900 zł co rok, termin za 3 miesiące ----
    await step('LA.8', async () => {
      await go(page, '5', 'page-cargo')
      await page.getByTestId('cargo-add').click()
      const f = page.getByTestId('cargo-new')
      await f.getByTestId('container-name').fill('Ubezpieczenie domu')
      const a = f.getByTestId('container-amount')
      await a.click()
      await a.fill('900')
      await a.press('Tab')
      await f.getByTestId('container-cycle').selectOption('12')
      const due = f.getByTestId('container-due')
      await due.click()
      await due.fill('10.02.2027')
      await due.press('Tab')
      await page.waitForTimeout(500)
      const draft = (await textOf(f)).replace(/\n/g, ' | ')
      await shot(page, 'LA.8-formularz')
      await page.getByTestId('cargo-new-save').click()
      await page.waitForTimeout(1200)
      const rec = recordsOf(st.dataDir, 'containers').find((c) => c.name === 'Ubezpieczenie domu')
      const edText = await openContainer(page, 'Ubezpieczenie domu')
      const hint = (await page.getByTestId('cargo-editor').locator('xpath=.//*[contains(text(),"Opłata okresowa")]').allInnerTexts()).join(' / ')
      const c = await cargoScreen(page)
      await shot(page, 'LA.8-ladownia')
      const ms = await months(page, 0, 5)
      await monthAt(page, 0)
      await shot(page, 'LA.8-plan-M0')
      dump('LA.8', { draft, rec, edText, hint, c, ms })
      rd('LA.8', `${STATE} + „Ubezpieczenie domu” 900 zł co rok, termin 10.02.2027 (dodany 03.11.2026)`, { wiersz: JSON.stringify((c.rows as Array<{ name: string }>).find((x) => x.name === 'Ubezpieczenie domu')), odkladki: c.odkladki, podpowiedz: hint, plan: ms }, st)
    })
    // ---- LA.11: zrzut OC motocykla (zbiornik częściowo pełny) ----
    await step('LA.11', async () => {
      await go(page, '1', 'page-bridge')
      const b0 = await bridgeState(page)
      await go(page, '5', 'page-cargo')
      const ed0 = await openContainer(page, 'OC motocykla')
      const sim = (await textOf(page.getByTestId('cargo-editor').getByTestId('cargo-sim'))).replace(/\n/g, ' | ')
      const c0 = await cargoScreen(page)
      await shot(page, 'LA.11-symulacja')
      rd('LA.11', `${STATE} + LA.4/LA.8 – symulacja zrzutu OC motocykla`, { symulacja: sim, masa: c0.masa, linia: c0.linia, odkladki: c0.odkladki, mostek: b0.stan }, st)
      await page.getByTestId('container-archived').click()
      await page.waitForTimeout(1000)
      const rec = recordsOf(st.dataDir, 'containers').find((c) => c.id === C.ocMoto)
      const t = await toasts(page)
      const c1 = await cargoScreen(page)
      const ms = await months(page, -1, 2)
      await go(page, '1', 'page-bridge')
      const b1 = await bridgeState(page)
      await shot(page, 'LA.11-zarchiwizowany')
      rd('LA.11', `${STATE} + LA.4/LA.8 – OC motocykla zarchiwizowany 03.11.2026`, { masa: c1.masa, odkladki: c1.odkladki, mostek: b1.stan, plan: ms }, st)
      await go(page, '5', 'page-cargo')
      await page.locator('label', { hasText: 'zarchiwizowane' }).locator('input').check()
      await page.waitForTimeout(400)
      await openContainer(page, 'OC motocykla')
      await page.getByTestId('container-archived').click()
      await page.waitForTimeout(1000)
      const rec2 = recordsOf(st.dataDir, 'containers').find((c) => c.id === C.ocMoto)
      const c2 = await cargoScreen(page)
      const ms2 = await months(page, 0, 1)
      dump('LA.11', { b0, ed0, sim, c0, rec: { archived: rec?.archived, archivedAt: rec?.archivedAt }, t, c1, ms, b1, rec2: { archived: rec2?.archived, archivedAt: rec2?.archivedAt }, c2, ms2 })
    })
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})

test('LA przebieg B2 – OC motocykla zarchiwizowane 15.09.2026: resztka zbiornika (LA.11)', async () => {
  const RUN = 'la-b2'
  const STATE = 'rok + opłaty okresowe, OC motocykla zarchiwizowane 2026-09-15 (la-b2)'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('stan', build(st.dataDir, ['okresowe', 'okresowe-archiwum']))
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  try {
    await ready(page)
    const b = await bridgeState(page)
    await page.getByTestId('state-range-why').click().catch(() => undefined)
    await shot(page, 'LA.11-B2-mostek')
    await go(page, '5', 'page-cargo')
    const c = await cargoScreen(page)
    const ms = await months(page, -3, 1)
    dump('B2', { b, c, ms })
    rd('LA.11', STATE, { mostek: b.stan, energia: b.energia, odkladki: c.odkladki, masa: c.masa, plan: ms }, st)
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
