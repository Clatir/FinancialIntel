// PM, przebieg 6 – kopia persony „rok” zmieniona przed startem (opis w PM.md):
//  - PM.9: usunięte własne plany września 2026 (M-2) i listopada 2026 (M0) – wrzesień korzysta z planu sierpnia (M-3),
//    listopad z planu października;
//  - PM.23: decyzja łupów sierpnia (210,68 zł) z 03.09.2026: zapas koperty Zdrowie 50 zł, reszta 160,68 zł do osłon;
//    we wrześniu wydatek bez kategorii 35,50 zł (12.09) i Subskrypcje → aplikacje 29,99 zł (18.09, bez kontenera);
//  - PM.24: płatność OC samochodu 1 240 zł 28.10.2026 (kontener roczny „OC samochodu”, termin 25.11) – opłata ze zbiornika
//    w październiku.
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { CAT, type Ctx, editJson, go, goMonth, out, pmId, read, readBridgeAll, readDebrief, readSplit, readSalary, shotEl, stepper, textOf, typeAmount, writeTx } from './pm-pomoc'

const RUN = 'pm-6'

test('PM przebieg 6 – plan odziedziczony, debriefing z dodatkami, OC ze zbiornika', async () => {
  test.setTimeout(20 * 60_000)
  const st = useState('rok', RUN)
  const d = st.dataDir
  rmSync(join(d, 'months', '2026-09.json'))
  rmSync(join(d, 'months', '2026-11.json'))
  editJson(join(d, 'months', '2026-08.json'), (j) => {
    j.loot = { decidedAt: '2026-09-03T10:00:00.000Z', shields: 16068, nextMonth: 0, goals: {}, envelopes: { [CAT.health]: 5000 } }
    j.updatedAt = '2026-09-03T10:00:00.000Z'
  })
  writeTx(d, { id: pmId(601), date: '2026-09-12', amount: -3550, categoryId: null, counterparty: 'SKLEP BEZ KATEGORII PM' })
  writeTx(d, { id: pmId(602), date: '2026-09-18', amount: -2999, categoryId: CAT.apps, counterparty: 'APP STORE PM' })
  writeTx(d, { id: pmId(603), date: '2026-10-28', amount: -124000, categoryId: '01KDEFCAT00000000000000303', counterparty: 'PZU SA', containerId: '01KAZ400000000000000000007' })
  const ctx: Ctx = { dataDir: d, ictjDir: st.ictjDir, state: 'rok bez własnych planów 2026-09 i 2026-11 + łupy sierpnia z zapasem Zdrowie 50 + wrzesień: bez kategorii 35,50, aplikacje 29,99 + OC 1 240 28.10 (pm-6)' }
  const { app, page, errors } = await start(RUN, { dataDir: d, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  const rd = (point: string, v: Record<string, string | number | null>) => read(page, ctx, point, v)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(6000)

    await step('PM.23', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-09')
      const sep = await readDebrief(page)
      await shotEl(page.getByTestId('month-debrief'), 'PM.23-wrzesien')
      await goMonth(page, '2026-08')
      const aug = await readDebrief(page)
      dump('PM.23', { sep, aug })
      await rd('PM.23', { miesiac: '2026-09 (z dodatkami)', ...sep })
      await rd('PM.23', { miesiac: '2026-08 (decyzja łupów z zapasem)', decyzja: aug.decyzja, zmiana: aug.zmiana, lupy: aug.lupy })
    })
    await step('PM.24', async () => {
      await goMonth(page, '2026-10')
      const oct = await readDebrief(page)
      await shotEl(page.getByTestId('month-debrief'), 'PM.24-pazdziernik-OC')
      dump('PM.24-oct', oct)
      await rd('PM.24', { miesiac: '2026-10 z płatnością OC 1 240 zł ze zbiornika', plus: oct.plus, minus: oct.minus, energia: oct.energia, paliwo: oct.paliwo, panel: oct.panel.slice(0, 2500) })
    })

    // ---- PM.9: plan odziedziczony; zmiana koperty „Jedzenie” w M-2 ----
    await step('PM.9', async () => {
      const b0 = await readBridgeAll(page)
      await go(page, '4', 'page-month')
      const view = async (m: string) => {
        await goMonth(page, m)
        const sp = await readSplit(page)
        const s = await readSalary(page)
        return { zrodlo: await textOf(page.getByTestId('month-source')), pensja: s.pole, koperty: sp.koperty, historia: String(await page.getByTestId('page-month').getByTestId('history-open').count()) }
      }
      const before: Record<string, unknown> = {}
      for (const m of ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']) before[m] = await view(m)
      const sepDeb0 = (await goMonth(page, '2026-09')) && (await readDebrief(page))
      dump('PM.9-przed', { before, sepDeb0 })
      await rd('PM.9', { etap: 'przed zmianą', plany: JSON.stringify(before), energiaDzis: b0.energia, debriefWrzesien: (sepDeb0 as Record<string, string>).koperty })
      await goMonth(page, '2026-09')
      await typeAmount(page, page.locator('[data-testid="month-envelope"][data-name="Jedzenie"] input'), '1750')
      await page.waitForTimeout(1500)
      const after: Record<string, unknown> = {}
      for (const m of ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']) after[m] = await view(m)
      await goMonth(page, '2026-09')
      const sepDeb1 = await readDebrief(page)
      await shotEl(page.getByTestId('month-debrief'), 'PM.9-debriefing-wrzesien')
      // Historia zmian planu września.
      const hist = page.getByTestId('page-month').getByTestId('history-open')
      let historia = '(brak przycisku)'
      if (await hist.count()) {
        await hist.first().click()
        await page.waitForTimeout(800)
        historia = (await textOf(page.locator('[role="dialog"]').last())).replace(/\s*\n\s*/g, ' | ').slice(0, 1500)
        await shot(page, 'PM.9-historia')
        await page.keyboard.press('Escape')
      }
      // Plan kampanii: jasne / przygaszone komórki.
      await page.getByTestId('month-year-toggle').click()
      await page.waitForTimeout(1000)
      const cells = await page.locator('[data-testid="year-row"][data-name="Jedzenie"] [data-testid="year-cell"]').evaluateAll((els) =>
        els.map((c) => `${c.getAttribute('data-month')}${c.getAttribute('data-own') ? ' jasny' : ' przygaszony'} ${(c.querySelector('input') as HTMLInputElement | null)?.value ?? (c.querySelector('[data-testid="year-cell-limit"]') as HTMLElement | null)?.innerText ?? ''} kolor=${getComputedStyle((c.querySelector('[data-testid="year-cell-limit"]') ?? c.querySelector('input') ?? c) as Element).color}`)
      )
      await shotEl(page.getByTestId('year-plan'), 'PM.9-kampania')
      await page.getByTestId('month-year-toggle').click()
      const b1 = await readBridgeAll(page)
      dump('PM.9-po', { after, sepDeb1, historia, cells })
      await rd('PM.9', { etap: 'po zmianie Jedzenie M-2 na 1 750', plany: JSON.stringify(after), debriefWrzesien: sepDeb1.koperty, pula: sepDeb1.pula, kampania: cells.join(' ; '), historia, energiaDzis: b1.energia })
    })

    // ---- PM.10 (brzeg): kontener z nową ceną – Netflix 43 → 49 zł „Zaktualizuj od listopada” ----
    await step('PM.10-cena', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const sp0 = await readSplit(page)
      await go(page, '5', 'page-cargo')
      await page.locator('[data-testid="cargo-row"][data-name="Netflix"]').first().click()
      await page.waitForTimeout(800)
      const box = await textOf(page.getByTestId('container-price'))
      const upd = page.getByTestId('container-price-update')
      const label = await textOf(upd)
      if (await upd.count()) await upd.click()
      await page.waitForTimeout(1500)
      await shot(page, 'PM.10-netflix')
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const sp1 = await readSplit(page)
      await goMonth(page, '2026-10')
      const oct = await readDebrief(page)
      await rd('PM.10', { etap: 'Netflix 43 → 49 zł (Zaktualizuj)', okno: box.replace(/\s*\n\s*/g, ' | '), przycisk: label, ladowniaPrzed: sp0.ladownia, ladowniaPo: sp1.ladownia, rozdzielonePo: sp1.panel.slice(-200), pazdziernikLadownia: (oct.panel.match(/Ładownia i odkładki \| [^|]*/) ?? [''])[0] })
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
