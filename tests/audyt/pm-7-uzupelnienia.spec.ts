// PM, przebieg 7 – persona „rok” bez zmian; uzupełnienia po przebiegu 1: PM.7 (propozycja pensji M+1 widoczna dopiero,
// gdy plan M+1 różni się od propozycji – pensja grudnia zmieniona na 7 000 zł, potem „przyjmij”), PM.28 („»” na miesiące
// 2027 z własnym planem – najpierw własne plany marca i czerwca 2027 przez zmianę koperty „Dom”, potem Jedzenie w styczniu
// 2027 → „»” → „Cofnij”), PM.26 (archiwizacja „Zwierzęta” i „Cofnij” – odczyt bez czekania na brakujące pole).
import { test } from '@playwright/test'
import { join } from 'node:path'
import { LAB, shot, start, useState } from './lab'
import { type Ctx, go, goMonth, out, read, readSalary, shotEl, stepper, textOf, toasts, typeAmount } from './pm-pomoc'

const RUN = 'pm-7'

test('PM przebieg 7 – propozycja pensji M+1, „»” w kampanii, archiwizacja kategorii', async () => {
  test.setTimeout(20 * 60_000)
  const st = useState('rok', RUN)
  const ctx: Ctx = { dataDir: st.dataDir, ictjDir: st.ictjDir, state: 'rok (pm-7)' }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  const rd = (point: string, v: Record<string, string | number | null>) => read(page, ctx, point, v)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(6000)

    await step('PM.7', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-12')
      const s0 = await readSalary(page)
      const src0 = await textOf(page.getByTestId('month-source'))
      await typeAmount(page, page.getByTestId('month-salary'), '7000')
      await page.waitForTimeout(1200)
      const s1 = await readSalary(page)
      const src1 = await textOf(page.getByTestId('month-source'))
      await shotEl(page.getByTestId('month-salary-panel'), 'PM.7-propozycja')
      const prop = page.getByTestId('month-salary-propose')
      const label = await textOf(prop)
      if (await prop.count()) await prop.click()
      await page.waitForTimeout(1200)
      const s2 = await readSalary(page)
      await goMonth(page, '2026-11')
      const m0 = await readSalary(page)
      await goMonth(page, '2027-01')
      const m2 = await readSalary(page)
      const src2 = await textOf(page.getByTestId('month-source'))
      await rd('PM.7', { M1przed: `${s0.panel} [${src0}]`, M1po7000: `${s1.panel} [${src1}]`, przycisk: label, M1poPrzyjmij: s2.panel, poleM1: s2.pole, pensjaM0: m0.pole, M0panel: m0.panel, M2: `${m2.pole} [${src2}]` })
    })

    const row = async (name: string) =>
      page.locator(`[data-testid="year-row"][data-name="${name}"]`).evaluate((r) =>
        Array.from(r.querySelectorAll('[data-testid="year-cell"]'))
          .map((c) => `${c.getAttribute('data-month')}=${(c.querySelector('input') as HTMLInputElement | null)?.value ?? (c.querySelector('[data-testid="year-cell-limit"]') as HTMLElement | null)?.innerText ?? ''}${c.getAttribute('data-own') ? '*' : ''}`)
          .concat(`rok=${(r.querySelector('[data-testid="year-row-total"]') as HTMLElement | null)?.innerText.replace(/\s+/g, ' ')}`)
          .join(' ')
      )
    await step('PM.28', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      await page.getByTestId('month-year-toggle').click()
      await page.waitForTimeout(1000)
      const food2026a = await row('Jedzenie')
      // Miesiąc miniony – czy jest pole edycji.
      const pastEditable = await page.locator('[data-testid="year-row"][data-name="Jedzenie"] [data-testid="year-cell"][data-month="2026-10"] input').count()
      await page.getByTestId('year-plan-next').click()
      await page.waitForTimeout(1000)
      const cell = (name: string, m: string) => page.locator(`[data-testid="year-row"][data-name="${name}"] [data-testid="year-cell"][data-month="${m}"]`)
      await typeAmount(page, cell('Dom', '2027-03').getByTestId('year-cell-input'), '310')
      await typeAmount(page, cell('Dom', '2027-06').getByTestId('year-cell-input'), '320')
      await page.waitForTimeout(800)
      const food2027a = await row('Jedzenie')
      const dom2027 = await row('Dom')
      await typeAmount(page, cell('Jedzenie', '2027-01').getByTestId('year-cell-input'), '1700')
      const food2027b = await row('Jedzenie')
      await cell('Jedzenie', '2027-01').hover()
      await page.waitForTimeout(300)
      await cell('Jedzenie', '2027-01').getByTestId('year-cell-copy').click()
      await page.waitForTimeout(600)
      const t = await toasts(page)
      const food2027c = await row('Jedzenie')
      await shotEl(page.getByTestId('year-plan'), 'PM.28-kopia')
      const undo = page.getByRole('status').filter({ hasText: 'do końca roku' }).last().getByRole('button', { name: 'Cofnij' })
      const hasUndo = await undo.count()
      if (hasUndo) await undo.click()
      await page.waitForTimeout(1500)
      const food2027d = await row('Jedzenie')
      await page.getByTestId('year-plan-prev').click()
      await page.waitForTimeout(1000)
      const food2026b = await row('Jedzenie')
      await page.getByTestId('month-year-toggle').click()
      dump('PM.28', { food2026a, pastEditable, food2027a, dom2027, food2027b, t, food2027c, hasUndo, food2027d, food2026b })
      await rd('PM.28', { rok2026: food2026a, mininyEdytowalny: String(pastEditable), rok2027przed: food2027a, dom2027, poWpisieStycznia: food2027b, toast: t.join(' || '), poKopii: food2027c, poCofnij: food2027d, rok2026Po: food2026b })
    })

    await step('PM.26', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const quick = async () => {
        const p = page.getByTestId('month-split')
        const t = await textOf(p)
        const zw = p.locator('[data-testid="month-envelope"][data-name="Zwierzęta"] input')
        return `${(t.match(/Rozdzielone\n[^\n]*/) ?? [''])[0].replace(/\n/g, ' ')} | ${(t.match(/KOPERTY PLANOWE\n[^\n]*/) ?? [''])[0].replace(/\n/g, ' ')} | ${(t.match(/Podstawowy przydział:[^\n]*/) ?? [''])[0]} | Zwierzęta: ${(await zw.count()) ? await zw.inputValue() : '(brak wiersza)'}`
      }
      const settingsCats = async () => {
        await page.keyboard.press('Control+,')
        await page.getByTestId('settings-tab-categories').click()
        await page.waitForTimeout(600)
      }
      const res: Record<string, string> = { przedM0: await quick() }
      await goMonth(page, '2026-10')
      res.przedMminus1 = await textOf(page.getByTestId('month-debrief')).then((x) => x.split('\n').filter((l, i, a) => /Zwierz/.test(l) || /Zwierz/.test(a[i - 1] ?? '')).join(' | '))
      await settingsCats()
      await page.locator('[data-testid="category-row"][data-name="Zwierzęta"] [data-testid="category-archive"]').click()
      await page.waitForTimeout(300)
      res.toast = (await toasts(page)).join(' || ')
      await page.keyboard.press('Control+4')
      await page.getByTestId('page-month').waitFor()
      await page.waitForTimeout(300)
      res.poM0 = await quick()
      await page.getByTestId('month-next').click()
      await page.waitForTimeout(300)
      res.poM1 = await quick()
      await page.getByTestId('month-prev').click()
      await page.getByTestId('month-prev').click()
      await page.waitForTimeout(300)
      res.poMminus1 = `${await quick()} || debriefing: ${await textOf(page.getByTestId('month-debrief')).then((x) => x.split('\n').filter((l, i, a) => /Zwierz/.test(l) || /Zwierz/.test(a[i - 1] ?? '')).join(' | '))}`
      await shot(page, 'PM.26-po')
      const undo = page.getByRole('status').filter({ hasText: 'Zarchiwizowano' }).last().getByTestId('toast-action')
      res.cofnijDostepne = String(await undo.count())
      if (await undo.count()) await undo.click()
      await page.waitForTimeout(1500)
      await page.getByRole('button', { name: 'bieżący', exact: true }).click()
      await page.waitForTimeout(500)
      res.poCofnijM0 = await quick()
      await page.getByTestId('month-next').click()
      await page.waitForTimeout(300)
      res.poCofnijM1 = await quick()
      await settingsCats()
      res.kategoriaPoCofnij = (await textOf(page.locator('[data-testid="category-row"][data-name="Zwierzęta"]'))).replace(/\s*\n\s*/g, ' | ')
      dump('PM.26', res)
      await rd('PM.26', res)
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})

// PM.17 – dziennik wachty: folder przebiegu pm-2 po pokryciach (Auto z Dom 150 zł, Zdrowie z Rozrywki 15 zł), bieżący
// tydzień raportu wachty („później ›”) i dziennik Dowództwa.
test('PM.17 – pokrycia w raporcie wachty (folder pm-2)', async () => {
  const dataDir = join(LAB, 'przebiegi', 'pm-2', 'dane')
  const { app, page } = await start('pm-2b', { dataDir })
  const dump = out('pm-2b')
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)
    await go(page, '0', 'page-reports')
    await page.getByRole('radio', { name: 'Raport wachty' }).click()
    await page.waitForTimeout(800)
    await page.getByText('później ›').click().catch(() => undefined)
    await page.waitForTimeout(1000)
    const watch = await textOf(page.getByTestId('reports-watch'))
    await shot(page, 'PM.17-wachta-biezacy')
    await go(page, '8', 'page-command')
    const log = await page.getByTestId('command-log-entry').evaluateAll((els) => els.slice(0, 10).map((e) => `${e.getAttribute('data-kind')}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
    dump('PM.17-wachta', { watch, log })
    await read(page, { dataDir, state: 'brzegi-koperty po pokryciach (folder pm-2)' }, 'PM.17', { etap: 'raport wachty – bieżący tydzień', wachta: watch.replace(/\s*\n\s*/g, ' | ').slice(0, 3000), dziennikDowodztwa: log.join(' || ') })
  } finally {
    await app.close()
  }
})

// PM.2 – dziennik dnia 1.11 w Dowództwie: folder przebiegu pm-4a (osłony 2 500, kadłub 3 000 przed wypłatą), dni gry
// zamrażane od razu (FI_FREEZE_AFTER_OPEN_MS = 0, FI_FREEZE_QUIET_MS = 0).
for (const [src, point] of [['pm-4a', 'PM.2'], ['pm-4b', 'PM.3']] as const)
test(`${point} – ocena dnia 1.11 po zamrożeniu (folder ${src})`, async () => {
  const dataDir = join(LAB, 'przebiegi', src, 'dane')
  const { app, page } = await start(`${src}2`, { dataDir, env: { FI_FREEZE_AFTER_OPEN_MS: '0', FI_FREEZE_QUIET_MS: '0' } })
  const dump = out(`${src}2`)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(12000)
    await go(page, '8', 'page-command')
    await page.waitForTimeout(1500)
    const log = await page.getByTestId('command-log-entry').evaluateAll((els) => els.slice(0, 15).map((e) => `${e.getAttribute('data-kind')}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
    const strip = await page.getByTestId('command-strip').locator('span').evaluateAll((els) => els.slice(-6).map((e) => `${e.getAttribute('title')} [${e.getAttribute('data-state')}]`))
    await shot(page, `${point}-dowodztwo`)
    dump(`${point}-dowodztwo`, { log, strip })
    await read(page, { dataDir, state: `brzegi ${src} po zamrożeniu dni` }, point, { etap: 'Dowództwo po zamrożeniu', pasek: strip.join(' ; '), dziennik: log.join(' || ') })
  } finally {
    await app.close()
  }
})
