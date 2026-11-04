/**
 * Audit KR – step 3 and 4 on a history with this month's spending (KR.16, KR.19, KR.20, KR.21, KR.25).
 * State: a new folder + kr-miesiac.csv (synthetic, 24 months – see kr-pliki.spec.ts) imported in step 2.
 * Answers: mBank 107 333,06, Portfel XTB 0; salary proposed (lowered and restored); cargo: rent, Netflix, PZU (car OC,
 * paid on the 2nd of this month), WARTA (motorcycle OC, due in 2 months); envelopes: Jedzenie 1 500,00, Zwierzęta
 * cleared, the garage checked and unchecked; ICTTJ skipped; tank of WARTA „do planu”.
 */
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { defaultCategoryId as cat } from '../../src/shared/schema/budget'
import { reading } from './lab'
import { KR_FILES, Log, WIZ, amount, balanceField, disarmAutostart, importFromWizard, logRecorded, newBudget, openWizard, readJson, recordsOf, toStep, toasts, type Decision } from './kr-pomoc'

const NAME = process.env.KR_RUN ?? 'kr-miesiac'
const STATE = `pusty + kr-miesiac.csv (24 mies., w tym miesiącu przed dziś: CityFit 129, Biedronka 85,40, Orlen 210, zwrot Zara +40, PZU OC 1 240) (przebieg ${NAME})`
const grab = (t: string, re: RegExp) => t.match(re)?.[1] ?? null

const DECISIONS: Decision[] = [
  { token: 'biedronka', dir: 'out', option: 'expense', categoryId: cat(1, 1) },
  { token: 'orlen', dir: 'out', option: 'expense', categoryId: cat(3, 1) },
  { token: 'zooplus', dir: 'out', option: 'expense', categoryId: cat(4, 1) },
  { token: 'netflix', dir: 'out', option: 'expense', categoryId: cat(7, 3) },
  { token: 'cityfit', dir: 'out', option: 'expense', categoryId: cat(5, 3) },
  { token: 'wspólnota', dir: 'out', option: 'expense', categoryId: cat(2, 1) },
  { token: 'netia', dir: 'out', option: 'expense', categoryId: cat(7, 2) },
  { token: 'tauron', dir: 'out', option: 'expense', categoryId: cat(2, 2) },
  { token: 'spółdzielnia', dir: 'out', option: 'expense', categoryId: cat(3, 4) },
  { token: 'pzu', dir: 'out', option: 'expense', categoryId: cat(3, 3) },
  { token: 'warta', dir: 'out', option: 'expense', categoryId: cat(3, 3) },
  { token: 'zara', dir: 'out', option: 'expense', categoryId: cat(8, 1) },
  { token: 'zara', dir: 'in', option: 'refund', categoryId: cat(8, 1) },
  { token: 'kwiaciarnia', dir: 'out', option: 'expense', categoryId: '' },
  { token: 'firma testowa', dir: 'in', option: 'income' }
]

async function step4(page: Page, log: Log, label: string): Promise<Record<string, string | null>> {
  const t = await log.screen(page, `krok 4 – ${label}`, WIZ)
  const env = page.getByTestId('wizard-envelope')
  const envs: string[] = []
  for (let i = 0; i < (await env.count()); i++) envs.push(`${await env.nth(i).getAttribute('data-name')}=${await env.nth(i).locator('input').inputValue()}`)
  const cargo = page.getByTestId('wizard-cargo')
  const chosen: string[] = []
  for (let i = 0; i < (await cargo.count()); i++) if (await cargo.nth(i).locator('input').isChecked()) chosen.push((await cargo.nth(i).getAttribute('data-name')) ?? '?')
  const v = {
    zaznaczone: chosen.join(', '),
    koperty: envs.join('; '),
    naglowek: grab(t, /(Koperty pierwszego miesiąca[^\n]*)/i),
    bez_kategorii: grab(t, /(Bez kategorii[^\n]*)/),
    pensja: grab(t, /\nPensja\n([^\n]*)/),
    plan: grab(t, /Ładownia \(stałe koszty\) \+ odkładki \+ koperty\n([^\n]*)/),
    odkladki: grab(t, /(Odkładki w tym miesiącu[^\n]*)/),
    niezaplanowane: grab(t, /((?:Niezaplanowane \(łupy\)|Plan przekracza pensję o)\n[^\n]*)/),
    przydzial: grab(t, /(Podstawowy przydział dzienny[^\n]*)/)
  }
  log.line(`[krok 4 – ${label}] ${JSON.stringify(v)}`)
  return v
}

const check = async (page: Page, re: RegExp, on: boolean) => {
  const cargo = page.getByTestId('wizard-cargo')
  for (let i = 0; i < (await cargo.count()); i++) {
    const name = (await cargo.nth(i).getAttribute('data-name')) ?? ''
    if (re.test(name)) {
      const box = cargo.nth(i).locator('input')
      if (on) await box.check()
      else await box.uncheck()
    }
  }
  await page.waitForTimeout(300)
}

test('KR – pensja w miesiącu startu, ładownia, koperty, odkładki (KR.16, 19, 20, 21, 25)', async () => {
  test.setTimeout(20 * 60_000)
  const log = new Log(NAME)
  const { run, dataDir } = await newBudget(NAME, log)
  const { page } = run
  let proposedSalary = ''
  try {
    await openWizard(page)
    await log.step('kroki 1–2', async () => {
      await amount(balanceField(page, 'mBank'), '107333,06')
      await amount(balanceField(page, 'Portfel XTB'), '0')
      await page.getByTestId('wizard-next').click()
      await importFromWizard(run, log, join(KR_FILES, 'kr-miesiac.csv'), DECISIONS, 'KR.19-import')
      await page.getByTestId('import-back-to-wizard').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(1500)
      await log.screen(page, 'krok 2 po imporcie', WIZ)
      const tx = recordsOf(dataDir, 'transactions').filter((x) => (x.date as string) >= '2026-11-01')
      log.line(`operacje listopada: ${JSON.stringify(tx.map((x) => [x.date, x.counterparty, x.kind, x.amount, x.categoryId]))}`)
      const kw = recordsOf(dataDir, 'transactions').filter((x) => String(x.counterparty).includes('KWIACIARNIA')).slice(0, 2)
      log.line(`kwiaciarnia: ${JSON.stringify(kw.map((x) => [x.date, x.kind, x.categoryId]))}`)
    })
    await log.step('KR.16 krok 3 – przed wyborem OC', async () => {
      await toStep(page, 2)
      const t = await log.screen(page, 'krok 3', WIZ)
      await log.shot(page, 'KR.16-krok3-przed')
      proposedSalary = await page.getByTestId('wizard-salary').inputValue()
      reading('kr', 'KR.16', `${STATE}, krok 3 przed wyborem OC`, { pensja: proposedSalary, propozycja: grab(t, /(Średnie koszty netto[^\n]*)/), notka: grab(t, /(W tym miesiącu wydano już[^\n]*\n?[^\n]*)/) })
      reading('kr', 'KR.15', `${STATE}`, { podpowiedz: grab(t, /(Średnie koszty netto[^\n]*)/), pole: proposedSalary })
    })
    await log.step('KR.19 / KR.20 krok 4', async () => {
      await toStep(page, 3)
      await log.shot(page, 'KR.19-krok4-przed')
      const cargo = page.getByTestId('wizard-cargo')
      const props: string[] = []
      let checked = 0
      for (let i = 0; i < (await cargo.count()); i++) {
        props.push((await cargo.nth(i).innerText()).replace(/\s+/g, ' '))
        if (await cargo.nth(i).locator('input').isChecked()) checked++
      }
      log.line(`propozycje: ${props.join(' | ')}; zaznaczone samo: ${checked}`)
      reading('kr', 'KR.19', STATE, { propozycje: props.join(' | '), zaznaczone_samo: checked })
      reading('kr', 'KR.20', `${STATE}, propozycje`, await step4(page, log, 'propozycje'))
      await amount(page.getByLabel('Koperta Jedzenie', { exact: true }), '1500')
      const pets = page.getByLabel('Koperta Zwierzęta', { exact: true })
      await pets.click()
      await pets.fill('')
      await pets.press('Enter')
      await page.waitForTimeout(300)
      reading('kr', 'KR.20', `${STATE}, Jedzenie 1 500, Zwierzęta wyczyszczone`, await step4(page, log, 'Jedzenie 1500, Zwierzęta puste'))
      await check(page, /GARA/i, true)
      reading('kr', 'KR.20', `${STATE}, garaż zaznaczony`, await step4(page, log, 'garaż zaznaczony'))
      await check(page, /GARA/i, false)
      reading('kr', 'KR.20', `${STATE}, garaż odznaczony`, await step4(page, log, 'garaż odznaczony'))
      await check(page, /WSPÓLNOTA|WSPOLNOTA|NETFLIX|PZU|WARTA/i, true)
      await log.shot(page, 'KR.21-krok4')
      reading('kr', 'KR.21', `${STATE}, ładownia: czynsz, Netflix, PZU, WARTA`, await step4(page, log, 'czynsz, Netflix, PZU, WARTA'))
    })
    await log.step('KR.21 pensja poniżej planu', async () => {
      await toStep(page, 2)
      await amount(page.getByTestId('wizard-salary'), '3000')
      await toStep(page, 3)
      await log.shot(page, 'KR.21-przekracza')
      reading('kr', 'KR.21', `${STATE}, pensja 3 000`, await step4(page, log, 'pensja 3000'))
      await toStep(page, 2)
      await amount(page.getByTestId('wizard-salary'), proposedSalary)
      await toStep(page, 3)
      reading('kr', 'KR.21', `${STATE}, pensja przywrócona`, await step4(page, log, 'pensja przywrócona'))
    })
    await log.step('KR.16 krok 3 – po wyborze OC', async () => {
      await toStep(page, 2)
      const t = await log.screen(page, 'krok 3 po wyborze OC', WIZ)
      await log.shot(page, 'KR.16-krok3-po')
      reading('kr', 'KR.16', `${STATE}, krok 3 po wyborze OC (PZU i WARTA)`, { pensja: await page.getByTestId('wizard-salary').inputValue(), notka: grab(t, /(W tym miesiącu wydano już[^\n]*\n?[^\n]*)/) })
    })
    await log.step('KR.25 krok 6 – zbiorniki', async () => {
      await toStep(page, 5)
      const t = await log.screen(page, 'krok 6', WIZ)
      await log.shot(page, 'KR.25-krok6-przed')
      const tanks = page.getByTestId('wizard-split-tank')
      const rows: string[] = []
      for (let i = 0; i < (await tanks.count()); i++) {
        const r = tanks.nth(i)
        const plan = r.getByTestId('wizard-split-tank-plan')
        rows.push(`${await r.getAttribute('data-name')}: pole ${await r.locator('input').inputValue()}; ${(await plan.count()) ? `${await plan.innerText()} – „${await plan.getAttribute('title')}”` : 'bez „do planu”'}`)
      }
      log.line(`zbiorniki: ${rows.join(' | ')}`)
      reading('kr', 'KR.25', `${STATE}, krok 6 przed`, { zbiorniki: rows.join(' | '), osłony: await page.getByTestId('wizard-split-shields').innerText(), kadłub: await page.getByTestId('wizard-split-hull').inputValue(), obecne: await page.getByTestId('wizard-total').innerText(), tekst: grab(t, /(Obecne środki[^\n]*)/) })
      const warta = page.locator('[data-testid="wizard-split-tank"][data-name*="WARTA"]')
      const btn = warta.getByTestId('wizard-split-tank-plan')
      await btn.hover()
      await page.waitForTimeout(300)
      await btn.click()
      await page.waitForTimeout(400)
      const rows2: string[] = []
      for (let i = 0; i < (await tanks.count()); i++) rows2.push(`${await tanks.nth(i).getAttribute('data-name')}: pole ${await tanks.nth(i).locator('input').inputValue()}`)
      await log.screen(page, 'krok 6 po „do planu”', WIZ)
      await log.shot(page, 'KR.25-krok6-po')
      reading('kr', 'KR.25', `${STATE}, krok 6 po „do planu” WARTA`, { zbiorniki: rows2.join(' | '), osłony: await page.getByTestId('wizard-split-shields').innerText(), kadłub: await page.getByTestId('wizard-split-hull').inputValue() })
      await toStep(page, 3)
      reading('kr', 'KR.25', `${STATE}, krok 4 po „do planu” WARTA`, await step4(page, log, 'po „do planu”'))
      reading('kr', 'KR.21', `${STATE}, krok 4 końcowy (po „do planu” WARTA)`, await step4(page, log, 'końcowy'))
    })
    await log.step('start', async () => {
      await toStep(page, 6)
      const sc = page.getByTestId('wizard-shortcut')
      await sc.click()
      await sc.press('Backspace')
      await page.getByTestId('wizard-finish').click()
      const seen = new Set<string>()
      for (let i = 0; i < 12; i++) {
        for (const x of await toasts(page)) seen.add(x.replace(/\s+/g, ' '))
        await page.waitForTimeout(250)
      }
      log.line(`toasty: ${[...seen].join(' || ')}`)
      await expect(page.getByTestId('page-bridge')).toBeVisible()
      await page.waitForTimeout(2500)
      await logRecorded(run, log)
      const fi = readJson(dataDir, 'fi.json') as any
      log.line(`budget: ${JSON.stringify(fi.settings.budget)}`)
      log.line(`months: ${JSON.stringify(recordsOf(dataDir, 'months').map((m) => [m.month, m.salary, m.envelopes]))}`)
      log.line(`containers: ${JSON.stringify(recordsOf(dataDir, 'containers').map((c) => [c.id, c.name, c.amount, c.cycleMonths, c.dueMonth, c.dueDay, c.variable, c.schedule]))}`)
      const linked = recordsOf(dataDir, 'transactions').filter((x) => x.containerId)
      log.line(`operacje z kontenerem: ${linked.length}; listopad: ${JSON.stringify(linked.filter((x) => (x.date as string) >= '2026-11-01').map((x) => [x.date, x.counterparty, x.amount, x.containerId]))}`)
    })
    await log.step('po starcie – Mostek, Plan miesiąca, Ładownia', async () => {
      const b = await log.screen(page, 'Mostek', '[data-testid="page-bridge"]')
      await log.shot(page, 'KR.16-mostek')
      const flat = b.replace(/\n/g, ' ')
      reading('kr', 'KR.16', `${STATE}, po starcie – Mostek`, { energia_dzis: grab(flat, /(ENERGIA DZIŚ.*?skąd ta liczba\?)/), stan: grab(flat, /(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/) })
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(1500)
      const m = await log.screen(page, 'Plan miesiąca', 'main')
      await log.shot(page, 'KR.21-plan')
      reading('kr', 'KR.21', `${STATE}, po starcie – Plan miesiąca`, { plan: m.replace(/\s+/g, ' ').slice(0, 3500) })
      await page.keyboard.press('Control+5')
      await page.waitForTimeout(1500)
      const c = await log.screen(page, 'Ładownia', 'main')
      await log.shot(page, 'KR.19-ladownia')
      reading('kr', 'KR.19', `${STATE}, po starcie – Ładownia`, { ladownia: c.replace(/\s+/g, ' ').slice(0, 3500) })
    })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
