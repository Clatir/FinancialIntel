/**
 * AU-11 skeptical check W2 – KR.16 (first salary in the start month, OC paid on the 2nd before the start) and KR.19
 * (proposals on the synthetic history).
 * State: a new folder + kr-miesiac.csv (24 months; this month before today: CityFit 129, Biedronka 85,40, Orlen 210, Zara
 * +40, PZU OC 1 240 on 02.11). Answers: mBank 107 333,06, Portfel XTB 0; salary proposed; cargo: rent, Netflix, PZU only
 * (no WARTA – the PZU tank alone); ICTTJ skipped; split proposed.
 */
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { defaultCategoryId as cat } from '../../src/shared/schema/budget'
import { reading } from './lab'
import { KR_FILES, Log, WIZ, amount, balanceField, disarmAutostart, importFromWizard, newBudget, openWizard, readJson, recordsOf, toStep, toasts, type Decision } from './kr-pomoc'

const NAME = process.env.W2_RUN ?? 'w2-kr-c2'
const STATE = 'pusty + kr-miesiac.csv (PZU OC 1 240 zapłacone 02.11), ładownia: czynsz, Netflix, PZU (przebieg w2-kr-c)'
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

test('W2 – KR.16 / KR.19 (historia syntetyczna)', async () => {
  test.setTimeout(25 * 60_000)
  const log = new Log(NAME)
  const { run, dataDir } = await newBudget(NAME, log)
  const { page } = run
  try {
    await openWizard(page)
    await log.step('kroki 1–2', async () => {
      await amount(balanceField(page, 'mBank'), '107333,06')
      await amount(balanceField(page, 'Portfel XTB'), '0')
      await page.getByTestId('wizard-next').click()
      await importFromWizard(run, log, join(KR_FILES, 'kr-miesiac.csv'), DECISIONS).catch(async (e) => {
        log.line(`import – ponad 30 s (${(e as Error).message.split('\n')[0]}); czekam do 4 min`)
        await log.screen(page, 'ekran po 30 s', 'main')
        await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 240_000 })
        await log.screen(page, 'wynik importu', '[data-testid="import-done"]')
      })
      await page.getByTestId('import-back-to-wizard').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(1500)
    })
    await log.step('krok 3 przed wyborem OC', async () => {
      await toStep(page, 2)
      const t = await log.screen(page, 'krok 3', WIZ)
      reading('w2', 'KR.16', `${STATE}, krok 3 przed`, { pensja: await page.getByTestId('wizard-salary').inputValue(), notka: grab(t, /(W tym miesiącu wydano już[^\n]*\n?[^\n]*)/) })
    })
    await log.step('krok 4 – propozycje, wybór czynsz / Netflix / PZU', async () => {
      await toStep(page, 3)
      const cargo = page.getByTestId('wizard-cargo')
      const props: string[] = []
      for (let i = 0; i < (await cargo.count()); i++) props.push((await cargo.nth(i).innerText()).replace(/\s+/g, ' '))
      log.line(`propozycje: ${props.join(' | ')}`)
      reading('w2', 'KR.19', `${STATE}, propozycje`, { propozycje: props.join(' | ') })
      for (let i = 0; i < (await cargo.count()); i++) {
        const name = (await cargo.nth(i).getAttribute('data-name')) ?? ''
        if (/WSPÓLNOTA|WSPOLNOTA|NETFLIX|PZU/i.test(name)) await cargo.nth(i).locator('input').check()
      }
      await page.waitForTimeout(400)
      const t = await log.screen(page, 'krok 4 po wyborze', WIZ)
      await log.shot(page, 'W2-KR.16-krok4')
      reading('w2', 'KR.16', `${STATE}, krok 4`, { odkladki: grab(t, /(Odkładki w tym miesiącu[^\n]*)/), plan: grab(t, /Ładownia \(stałe koszty\) \+ odkładki \+ koperty\n([^\n]*)/), przydzial: grab(t, /(Podstawowy przydział dzienny[^\n]*)/) })
    })
    await log.step('krok 3 po wyborze OC', async () => {
      await toStep(page, 2)
      const t = await log.screen(page, 'krok 3 po', WIZ)
      await log.shot(page, 'W2-KR.16-krok3')
      reading('w2', 'KR.16', `${STATE}, krok 3 po`, { pensja: await page.getByTestId('wizard-salary').inputValue(), notka: grab(t, /(W tym miesiącu wydano już[^\n]*\n?[^\n]*)/) })
    })
    await log.step('krok 6', async () => {
      await toStep(page, 5)
      await log.screen(page, 'krok 6', WIZ)
      const tanks = page.getByTestId('wizard-split-tank')
      const rows: string[] = []
      for (let i = 0; i < (await tanks.count()); i++) {
        const r = tanks.nth(i)
        const plan = r.getByTestId('wizard-split-tank-plan')
        rows.push(`${await r.getAttribute('data-name')}: pole ${await r.locator('input').inputValue()}; ${(await plan.count()) ? `${await plan.innerText()} – „${await plan.getAttribute('title')}”` : 'bez „do planu”'}`)
      }
      log.line(`zbiorniki: ${rows.join(' | ')}`)
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
      const fi = readJson(dataDir, 'fi.json') as any
      log.line(`budget: ${JSON.stringify(fi.settings.budget)}`)
      log.line(`months: ${JSON.stringify(recordsOf(dataDir, 'months'))}`)
      log.line(`containers: ${JSON.stringify(recordsOf(dataDir, 'containers').map((c) => [c.name, c.amount, c.cycleMonths, c.dueMonth, c.dueDay, c.from, c.variable, c.schedule]))}`)
      const linked = recordsOf(dataDir, 'transactions').filter((x) => x.containerId && (x.date as string) >= '2026-10-01')
      log.line(`operacje z kontenerem od 10.2026: ${JSON.stringify(linked.map((x) => [x.date, x.counterparty, x.amount]))}`)
    })
    await log.step('po starcie – Mostek, Plan, Ładownia, Radar', async () => {
      const b = await log.screen(page, 'Mostek', '[data-testid="page-bridge"]')
      await log.shot(page, 'W2-KR.16-mostek')
      const flat = b.replace(/\n/g, ' ')
      reading('w2', 'KR.16', `${STATE}, po starcie – Mostek`, { stan: grab(flat, /(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/), asteroida: grab(flat, /(Asteroida: PZU[^.]*\.[^.]*\.)/) })
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(1500)
      await log.screen(page, 'Plan miesiąca', 'main')
      await log.shot(page, 'W2-KR.16-plan')
      await page.keyboard.press('Control+5')
      await page.waitForTimeout(1500)
      await log.screen(page, 'Ładownia', 'main')
      await page.getByTestId('page-cargo').getByText(/PZU/).first().click().catch(() => undefined)
      await page.waitForTimeout(800)
      await log.screen(page, 'Ładownia – PZU', 'main')
      await log.shot(page, 'W2-KR.16-ladownia')
      await page.keyboard.press('Control+7')
      await page.waitForTimeout(2000)
      await log.screen(page, 'Radar', 'main')
    })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
