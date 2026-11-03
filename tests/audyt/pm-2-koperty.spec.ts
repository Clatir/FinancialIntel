// PM, przebieg 2 – stan „brzegi-koperty” na kopii persony „rok” (opis w PM.md): plan listopada Dom 700 zł, Prezenty i inne
// 0 zł; operacje listopada: 01.11 Auto (paliwo) 800 zł, Dom (wyposażenie) 300 zł, Jedzenie 50 zł; 02.11 Zdrowie (leki)
// 165 zł, Prezenty (prezenty) 60 zł, Subskrypcje (aplikacje) 29,99 zł, Jedzenie (na mieście) 234,48 zł (= przydział 02.11
// 84,48 + 150). Punkty PM.16, PM.17, PM.13 (+ zapis prób powiadomień – część PM.30).
import { test } from '@playwright/test'
import { recorded, shot, start, useState } from './lab'
import { quickWindow } from './dw-pomoc'
import { qread } from './sw-pomoc'
import { CAT, type Ctx, editJson, go, goMonth, out, pmId, read, readBridgeAll, readDaily, readEnvelopes, readSplit, shotEl, stepper, textOf, toasts, typeAmount, writeTx } from './pm-pomoc'
import { join } from 'node:path'

const RUN = 'pm-2'

test('PM przebieg 2 – koperty planowe, pokrycie, przekroczenie dnia', async () => {
  test.setTimeout(20 * 60_000)
  const st = useState('rok', RUN)
  const d = st.dataDir
  editJson(join(d, 'months', '2026-11.json'), (j) => {
    j.envelopes[CAT.home] = 70000
    j.envelopes[CAT.gifts] = 0
  })
  writeTx(d, { id: pmId(201), date: '2026-11-01', time: '10:00', amount: -80000, categoryId: CAT.fuel, counterparty: 'ORLEN PM' })
  writeTx(d, { id: pmId(202), date: '2026-11-01', time: '11:00', amount: -30000, categoryId: CAT.homeGoods, counterparty: 'IKEA PM' })
  writeTx(d, { id: pmId(203), date: '2026-11-01', time: '12:00', amount: -5000, categoryId: CAT.groceries, counterparty: 'BIEDRONKA PM' })
  writeTx(d, { id: pmId(204), date: '2026-11-02', time: '10:00', amount: -16500, categoryId: CAT.meds, counterparty: 'APTEKA PM' })
  writeTx(d, { id: pmId(205), date: '2026-11-02', time: '11:00', amount: -6000, categoryId: CAT.giftsSub, counterparty: 'KWIACIARNIA PM' })
  writeTx(d, { id: pmId(206), date: '2026-11-02', time: '12:00', amount: -2999, categoryId: CAT.apps, counterparty: 'APP STORE PM' })
  writeTx(d, { id: pmId(207), date: '2026-11-02', time: '19:00', amount: -23448, categoryId: CAT.eatOut, counterparty: 'RESTAURACJA PM' })
  const ctx: Ctx = { dataDir: d, ictjDir: st.ictjDir, state: 'brzegi-koperty (rok + listopad: Auto +150, Zdrowie +15, Prezenty limit 0, Dom 700, 02.11 +150 ponad przydział)' }
  const { app, page, errors } = await start(RUN, { dataDir: d, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  const rd = (point: string, v: Record<string, string | number | null>) => read(page, ctx, point, v)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(6000)

    await step('start', async () => {
      const b = await readBridgeAll(page)
      dump('mostek-0', b)
      await shotEl(page.locator('section[data-panel="bridge:Odprawa"]').first(), 'PM.16-odprawa')
      await go(page, '4', 'page-month')
      const e = await readEnvelopes(page)
      const sp = await readSplit(page)
      const dl = await readDaily(page)
      dump('plan-0', { e, sp, dl })
      await shotEl(page.getByTestId('month-envelopes'), 'PM.16-koperty')
      await shotEl(page.getByTestId('month-daily'), 'PM.13-przydzial')
      await rd('PM.16', { etap: 'start', koperty: e.koperty, bezKoperty: e.bezKoperty, odprawa: b.odprawa, mostekKoperty: b.koperty, energiaDzis: b.energia })
      await rd('PM.13', { etap: 'start (wczoraj +150 ponad przydział)', dzienny: dl.panel, energia: dl.energia, mostekEnergia: b.energia, podpis: b.podpis, rozbicie: b.rozbicie ?? '', odprawa: b.odprawa })
    })
    await step('dowodztwo', async () => {
      await go(page, '8', 'page-command')
      const log = await page.getByTestId('command-log-entry').evaluateAll((els) => els.slice(0, 12).map((e) => `${e.getAttribute('data-kind')}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
      const strip = await page.getByTestId('command-strip').locator('span').evaluateAll((els) => els.slice(-6).map((e) => `${e.getAttribute('title')} [${e.getAttribute('data-state')}]`))
      dump('dowodztwo', { today: await textOf(page.getByTestId('command-today')), log, strip })
    })

    // ---- PM.17: pokryj Auto z Dom, „Cofnij”; drugi raz bez „Cofnij”; kwota ponad zapas; źródło codzienne ----
    const dialog = async (label: string) => {
      const dlg = page.getByTestId('cover-dialog')
      const opts = await dlg.getByTestId('cover-from').locator('option').allInnerTexts().catch(() => [])
      const r = {
        tekst: (await textOf(dlg)).replace(/\s*\n\s*/g, ' | '),
        zrodla: opts.join(' ; '),
        wybrane: await dlg.getByTestId('cover-from').evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent ?? '').catch(() => '(brak)'),
        kwota: await dlg.getByTestId('cover-amount').inputValue().catch(() => '(brak)'),
        pokryjWylaczony: String(await dlg.getByTestId('cover-confirm').isDisabled().catch(() => null))
      }
      dump(`PM.17-okno-${label}`, r)
      return r
    }
    const openCover = async (name: string) => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      await page.locator(`[data-testid="envelope-state"][data-name="${name}"] [data-testid="envelope-cover"]`).click()
      await page.getByTestId('cover-dialog').waitFor()
      await page.waitForTimeout(300)
    }
    const limits = async () => {
      const e = await readEnvelopes(page)
      const sp = await readSplit(page)
      return { koperty: e.koperty, planowe: (sp.panel.match(/Koperty planowe \| [^|]*/) ?? [''])[0], codzienne: (sp.panel.match(/Koperty codzienne \| [^|]*/) ?? [''])[0], split: sp.koperty }
    }
    await step('PM.17-a', async () => {
      await go(page, '4', 'page-month')
      const l0 = await limits()
      await openCover('Auto')
      const w0 = await dialog('start')
      await page.getByTestId('cover-from').selectOption({ label: (w0.zrodla.split(' ; ').find((o) => o.startsWith('Dom')) ?? '') })
      await page.waitForTimeout(300)
      const w1 = await dialog('Dom')
      await shotEl(page.getByTestId('cover-dialog'), 'PM.17-okno')
      await page.getByTestId('cover-confirm').click()
      await page.waitForTimeout(500)
      const t = await toasts(page)
      const l1 = await limits()
      await page.getByRole('status').filter({ hasText: 'pokryta' }).last().getByRole('button', { name: 'Cofnij' }).click()
      await page.waitForTimeout(1500)
      const l2 = await limits()
      await rd('PM.17', { etap: 'Auto z Dom + Cofnij', przed: JSON.stringify(l0), oknoStart: JSON.stringify(w0), oknoDom: JSON.stringify(w1), toast: t.join(' || '), po: JSON.stringify(l1), poCofnij: JSON.stringify(l2) })
    })
    await step('PM.17-b', async () => {
      await openCover('Auto')
      const w0 = await dialog('drugi')
      await page.getByTestId('cover-from').selectOption({ label: (w0.zrodla.split(' ; ').find((o) => o.startsWith('Dom')) ?? '') })
      await page.waitForTimeout(300)
      await page.getByTestId('cover-confirm').click()
      await page.waitForTimeout(1500)
      const l1 = await limits()
      const b = await readBridgeAll(page)
      await shotEl(page.locator('section[data-panel="bridge:Odprawa"]').first(), 'PM.17-odprawa-po')
      await rd('PM.17', { etap: 'Auto z Dom (bez Cofnij)', po: JSON.stringify(l1), odprawa: b.odprawa, energia: b.energia })
    })
    await step('PM.17-c', async () => {
      // Zdrowie (ponad o 15 zł): z Dom kwota ponad zapas, potem źródło codzienne (Rozrywka i hobby).
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const d0 = await readDaily(page)
      const b0 = await readBridgeAll(page)
      await openCover('Zdrowie')
      const w0 = await dialog('zdrowie-start')
      await page.getByTestId('cover-from').selectOption({ label: (w0.zrodla.split(' ; ').find((o) => o.startsWith('Dom')) ?? '') })
      await page.waitForTimeout(300)
      await typeAmount(page, page.getByTestId('cover-amount'), '300')
      const w1 = await dialog('zdrowie-dom-300')
      await shotEl(page.getByTestId('cover-dialog'), 'PM.17-ponad-zapas')
      await page.getByTestId('cover-from').selectOption({ label: (w0.zrodla.split(' ; ').find((o) => o.startsWith('Rozrywka')) ?? '') })
      await page.waitForTimeout(300)
      await typeAmount(page, page.getByTestId('cover-amount'), '15')
      const w2 = await dialog('zdrowie-rozrywka-15')
      await page.getByTestId('cover-confirm').click()
      await page.waitForTimeout(1500)
      const t = await toasts(page)
      const l1 = await limits()
      const d1 = await readDaily(page)
      const b1 = await readBridgeAll(page)
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Raport wachty' }).click()
      await page.waitForTimeout(1000)
      const watch = await textOf(page.getByTestId('reports-watch'))
      dump('PM.17-wachta', watch)
      await shot(page, 'PM.17-wachta')
      await rd('PM.17', { etap: 'Zdrowie: Dom 300 (ponad zapas), potem Rozrywka 15', oknoStart: JSON.stringify(w0), oknoDom300: JSON.stringify(w1), oknoRozrywka15: JSON.stringify(w2), toast: t.join(' || '), po: JSON.stringify(l1), dziennyPrzed: d0.panel, dziennyPo: d1.panel, mostekPrzed: b0.energia, mostekPo: b1.energia, wachta: watch.split('\n').filter((x) => /pokry|Pokry|kopert/i.test(x)).join(' | ') })
    })

    // ---- PM.16: wydatek planowy (Auto 50 zł) szybkim wpisem – energia dziś przed i po ----
    await step('PM.16-wpis', async () => {
      const b0 = await readBridgeAll(page)
      const q = await quickWindow(app, page)
      await q.getByTestId('quick-amount').click()
      await q.getByTestId('quick-amount').fill('50')
      await q.getByTestId('quick-counterparty').fill('ORLEN PM16')
      await q.getByTestId('quick-category').selectOption(CAT.fuel)
      await q.waitForTimeout(500)
      const r = await qread(q)
      await shot(q, 'PM.16-szybki')
      await q.getByTestId('quick-amount').press('Enter')
      await page.waitForTimeout(2000)
      const b1 = await readBridgeAll(page)
      await go(page, '4', 'page-month')
      const e = await readEnvelopes(page)
      await rd('PM.16', { etap: 'szybki wpis Auto 50 zł', energiaPrzed: b0.energia, podglad: String(r.preview), energiaPo: b1.energia, kopertyPo: e.koperty, odprawaPo: b1.odprawa })
    })

    // ---- PM.13: szybki wpis Jedzenie większy niż energia dziś ----
    await step('PM.13-wpis', async () => {
      const b0 = await readBridgeAll(page)
      const q = await quickWindow(app, page)
      await q.getByTestId('quick-amount').click()
      await q.getByTestId('quick-amount').fill('100')
      await q.getByTestId('quick-counterparty').fill('LIDL PM13')
      await q.getByTestId('quick-category').selectOption(CAT.groceries)
      await q.waitForTimeout(500)
      const r = await qread(q)
      await shot(q, 'PM.13-szybki')
      await q.getByTestId('quick-amount').press('Enter')
      await page.waitForTimeout(2000)
      const b1 = await readBridgeAll(page)
      await shotEl(page.locator('section[data-panel="bridge:Odprawa"]').first(), 'PM.13-odprawa-po')
      await go(page, '4', 'page-month')
      const dl = await readDaily(page)
      await shotEl(page.getByTestId('month-daily'), 'PM.13-po')
      await rd('PM.13', { etap: 'szybki wpis Jedzenie 100 zł', energiaPrzed: b0.energia, podglad: String(r.preview), formularz: JSON.stringify(r), energiaPo: b1.energia, energiaKolor: b1.energiaKolor, dziennyPo: dl.panel, energiaPlanKolor: dl.energiaKolor, odprawaPo: b1.odprawa })
    })
    await step('powiadomienia', async () => {
      const rec = await recorded(app)
      dump('PM.30-powiadomienia', rec.toasts)
      await rd('PM.30', { zakres: 'próby powiadomień zapisane przez laboratorium (bez Windows)', proby: JSON.stringify(rec.toasts) })
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
