// PR, przebieg 2 (kopia persony „rok” + kategoria główna „Bez koperty PR” bez koperty w fi.json): PR.5 – energia dziś na
// Mostku, w Planie miesiąca i w nagłówku szybkiego wpisu przed i po wydatkach (25 zł Jedzenie dziś, 30 zł wczoraj, data
// w przyszłości, kategoria bez koperty, koperta planowa); podgląd szybkiego wpisu wobec wyniku po zapisie. Do tego PR.8 –
// eksport „Miesiące” od 01.08.2025 (miesiąc sprzed startu). Narzędzie obserwacji – oceny w docs/audyt/raport/PR.md.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { answerDialogs, start, useState } from './lab'
import { EXP, flat, go, out, parseCsv, quickHead, quickWindow, rec, snap, stepper, textOf, waitFile, type Ctx } from './pr-pomoc'

const RUN = 'pr-2'
const FOOD = '01KDEFCAT00000000000000100'
const HOME = '01KDEFCAT00000000000000200'
const NOENV = '01KDEFCAT00000000000000950'

async function energyEverywhere(page: Page, app: ElectronApplication): Promise<Record<string, string>> {
  const r: Record<string, string> = {}
  await go(page, '1', 'page-bridge')
  r.mostek = await textOf(page.getByTestId('bridge-energy'))
  r.mostek_podpis = await textOf(page.getByTestId('bridge-energy-why'))
  await page.getByTestId('bridge-energy-why').click()
  await page.waitForTimeout(300)
  r.mostek_rozbicie = (await page.getByTestId('bridge-energy-lines').locator('[data-testid="why-line"]').allInnerTexts()).map((l) => l.replace(/\s+/g, ' ')).join(' | ')
  await page.getByTestId('bridge-energy-why').click()
  const st = await textOf(page.locator('section[data-panel="bridge:Stan okrętu"]'))
  r.mostek_energia_miesiaca = /Energia\n· pensja miesiąca do wydania\n([^\n]+)/.exec(st)?.[1] ?? '?'
  await go(page, '4', 'page-month')
  r.plan_energia_dzis = flat(await textOf(page.getByTestId('month-energy-today')))
  const plan = await textOf(page.getByTestId('page-month'))
  r.plan_przydzial = flat(/DZIENNY PRZYDZIAŁ[\s\S]*?Niewydana energia/.exec(plan)?.[0] ?? '?')
  r.plan_koperty = flat(/KOPERTY\n\?[\s\S]*?DEBRIEFING/.exec(plan)?.[0] ?? '?')
  const q = await quickWindow(app, page)
  r.szybki = await quickHead(q)
  await q.keyboard.press('Escape')
  await page.waitForTimeout(600)
  await go(page, '1', 'page-bridge')
  return r
}

/** The quick entry filled (not saved): its whole text with the preview. */
async function quickFill(app: ElectronApplication, page: Page, o: { amount: string; who: string; category: string; date?: 'yesterday' | string }): Promise<{ q: Page; text: string; preview: string; date: string }> {
  const q = await quickWindow(app, page)
  await q.getByTestId('quick-amount').click()
  await q.getByTestId('quick-amount').fill(o.amount)
  await q.getByTestId('quick-counterparty').fill(o.who)
  await q.getByTestId('quick-category').selectOption(o.category)
  await q.getByTestId('quick-time').fill('')
  if (o.date === 'yesterday') await q.getByTestId('quick-yesterday').click()
  else if (o.date) {
    await q.getByTestId('quick-date').click()
    await q.getByTestId('quick-date').fill(o.date)
    await q.getByTestId('quick-date').press('Tab')
  }
  await q.getByTestId('quick-note').click()
  await q.waitForTimeout(600)
  return { q, text: await textOf(q.getByTestId('quick-entry')), preview: flat(await textOf(q.getByTestId('quick-preview'))), date: await q.getByTestId('quick-date').inputValue() }
}

test('PR przebieg 2 – energia dziś na trzech ekranach (PR.5) i eksport od 01.08.2025 (PR.8)', async () => {
  const st = useState('rok', RUN)
  const fiFile = join(st.dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(fiFile, 'utf8'))
  fi.settings.categories.push({ id: NOENV, name: 'Bez koperty PR', parentId: null, envelope: null, system: null, archived: false })
  writeFileSync(fiFile, `${JSON.stringify(fi, null, 2)}\n`)
  const ctx: Ctx = { run: RUN, dataDir: st.dataDir, ictjDir: st.ictjDir }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  page.setDefaultTimeout(20_000)
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(5000)

    // R0 – przed wpisami, z pustym podglądem szybkiego wpisu (kwota pusta i 0).
    await step('R0', async () => {
      const v = await rec(ctx, 'PR.5', 'rok (+kategoria Bez koperty PR) – przed wpisami', async () => energyEverywhere(page, app))
      dump('R0', v)
      const q = await quickWindow(app, page)
      const empty = { tekst: await textOf(q.getByTestId('quick-entry')), podglad: await textOf(q.getByTestId('quick-preview')) }
      await q.getByTestId('quick-amount').click()
      await q.getByTestId('quick-amount').fill('0')
      await q.getByTestId('quick-counterparty').click()
      await q.waitForTimeout(400)
      dump('R0-szybki-pusty-i-0', { ...empty, po0: await textOf(q.getByTestId('quick-preview')), naglowek: await quickHead(q), kwota: await q.getByTestId('quick-amount').inputValue(), zapisz: await q.getByTestId('quick-save').isEnabled() })
      await q.getByTestId('quick-amount').fill('')
      await q.keyboard.press('Escape')
      await page.waitForTimeout(500)
    })

    // 25 zł Jedzenie dziś: podgląd → zapis → odczyt.
    await step('25-dzis', async () => {
      const f = await quickFill(app, page, { amount: '25', who: 'Sklep PR5', category: FOOD })
      dump('25-podglad', f)
      await snap(f.q, 'PR.5-podglad-25')
      await f.q.getByTestId('quick-save').click()
      await page.waitForTimeout(2500)
      const v = await rec(ctx, 'PR.5', 'rok + 25 zł Jedzenie dziś', async () => ({ ...(await energyEverywhere(page, app)), podglad_przed_zapisem: f.preview }))
      dump('25-po', v)
      await snap(page, 'PR.5-po-25')
    })

    // 30 zł Jedzenie wczoraj („wczoraj”).
    await step('30-wczoraj', async () => {
      const f = await quickFill(app, page, { amount: '30', who: 'Sklep PR5 wczoraj', category: FOOD, date: 'yesterday' })
      dump('30-podglad', f)
      await snap(f.q, 'PR.5-podglad-wczoraj')
      await f.q.getByTestId('quick-save').click()
      await page.waitForTimeout(2500)
      const v = await rec(ctx, 'PR.5', 'rok + 25 zł dziś + 30 zł Jedzenie wczoraj', async () => ({ ...(await energyEverywhere(page, app)), podglad_przed_zapisem: f.preview }))
      dump('30-po', v)
    })

    // 40 zł z datą w przyszłości (10.11.2026).
    await step('przyszlosc', async () => {
      const f = await quickFill(app, page, { amount: '40', who: 'Sklep PR5 przyszłość', category: FOOD, date: '10.11.2026' })
      dump('przyszlosc-podglad', { ...f, przyszloscZnacznik: await textOf(f.q.getByTestId('quick-future')), komunikat: await textOf(f.q.getByTestId('quick-message')) })
      await snap(f.q, 'PR.5-podglad-przyszlosc')
      await f.q.getByTestId('quick-save').click()
      await page.waitForTimeout(2500)
      const v = await rec(ctx, 'PR.5', 'rok + … + 40 zł Jedzenie z datą 10.11.2026', async () => ({ ...(await energyEverywhere(page, app)), podglad_przed_zapisem: f.preview, data_w_polu: f.date }))
      dump('przyszlosc-po', v)
    })

    // 15 zł w kategorii bez koperty.
    await step('bez-koperty', async () => {
      const f = await quickFill(app, page, { amount: '15', who: 'Sklep PR5 bez koperty', category: NOENV })
      dump('bez-koperty-podglad', f)
      await snap(f.q, 'PR.5-podglad-bez-koperty')
      await f.q.getByTestId('quick-save').click()
      await page.waitForTimeout(2500)
      const v = await rec(ctx, 'PR.5', 'rok + … + 15 zł kategoria bez koperty', async () => ({ ...(await energyEverywhere(page, app)), podglad_przed_zapisem: f.preview }))
      dump('bez-koperty-po', v)
    })

    // 20 zł Dom (koperta planowa).
    await step('planowa', async () => {
      const f = await quickFill(app, page, { amount: '20', who: 'Sklep PR5 dom', category: HOME })
      dump('planowa-podglad', f)
      await f.q.getByTestId('quick-save').click()
      await page.waitForTimeout(2500)
      const v = await rec(ctx, 'PR.5', 'rok + … + 20 zł Dom (koperta planowa)', async () => ({ ...(await energyEverywhere(page, app)), podglad_przed_zapisem: f.preview }))
      dump('planowa-po', v)
    })

    // PR.2 – okno średnich kosztów: koszty netto każdego miesiąca z debriefingu (Raporty) wobec „średnie koszty” Mostka.
    await step('PR.2-okno', async () => {
      await rec(ctx, 'PR.2', 'rok (+wpisy PR.5 w listopadzie) – koszty netto miesięcy z debriefingu i średnie koszty Mostka', async () => {
        await go(page, '1', 'page-bridge')
        const stan = await textOf(page.locator('section[data-panel="bridge:Stan okrętu"]'))
        await go(page, '0', 'page-reports')
        await page.getByRole('radio', { name: 'Debriefing' }).click()
        await page.waitForTimeout(600)
        const opts = await page.getByTestId('reports-debrief-month').locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
        const costs: Record<string, string> = {}
        for (const m of opts) {
          await page.getByTestId('reports-debrief-month').selectOption(m)
          await page.waitForTimeout(350)
          const t = await textOf(page.getByTestId('reports-debrief'))
          costs[m] = /Koszty netto\n([^\n]+)/.exec(t)?.[1] ?? '?'
        }
        dump('PR.2-koszty-miesiecy', costs)
        return { srednie_koszty_mostek: /średnie koszty ([^\n]+)/.exec(stan)?.[1] ?? '?', kadlub: /Kadłub\n· fundusz awaryjny\n([^\n]+)/.exec(stan)?.[1] ?? '?', koszty_netto_miesiecy: JSON.stringify(costs) }
      })
    })

    // PR.8 – eksport „Miesiące” od 01.08.2025.
    await step('PR.8-eksport', async () => {
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Eksport' }).click()
      await page.waitForTimeout(600)
      const from = page.getByTestId('export-from')
      await from.click()
      await from.fill('01.08.2025')
      await from.press('Enter')
      await page.waitForTimeout(400)
      const csv = join(EXP, 'pr-2-miesiace-od-2025-08.csv')
      let rows: string[][] = []
      let ok = false
      await rec(ctx, 'PR.8', 'rok + wpisy PR.5 – eksport Miesiące od 01.08.2025', async () => {
        await answerDialogs(app, { savePath: csv })
        await page.getByTestId('export-months-csv').click()
        ok = await waitFile(csv)
        await page.waitForTimeout(1000)
        rows = ok ? parseCsv(readFileSync(csv, 'utf8')) : []
        return { plik: csv, wiersze: rows.map((r) => r.join(';')).join(' || ') }
      })
      dump('PR.8-eksport-od-2025-08', { od: await from.inputValue(), ok, wiersze: rows.map((r) => r.join(';')) })
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
