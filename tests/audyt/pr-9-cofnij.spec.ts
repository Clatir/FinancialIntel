// PR, przebieg 9 (kopia persony „rok”), uzupełnienie PR.10: wydatek 1 000 000,00 zł → usunięcie → „Cofnij” od razu (w pr-6
// toast zniknął przed kliknięciem); wypłata z XTB 999 999,99 zł (rodzaj XTB, „wypłata z XTB”) zadokowana w oknie dokowania;
// koperta Zwierzęta 0 zł z wydatkiem 10 zł – debriefing M0 w Raportach i Dowództwo; zrzut planu grudnia z pensją 0.
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { start, useState } from './lab'
import { flat, go, out, pr1, quickWindow, readAll, rec, screenValues, snap, stepper, textOf, type Ctx } from './pr-pomoc'

const RUN = 'pr-9'
const PETS_FOOD = '01KDEFCAT00000000000000401'

async function layers(ctx: Ctx, page: Page, app: ElectronApplication, label: string, dump: (n: string, c: unknown) => void, tag: string): Promise<void> {
  await page.waitForTimeout(1500)
  let chk: Record<string, unknown> = {}
  await rec(ctx, 'PR.10', label, async () => {
    const s = await readAll(page, app, ['operacje', 'konta'])
    chk = { ...pr1(s), stan: flat(s.mostek.stan.text), energia: s.mostek.energia }
    return { ...screenValues(s), krok: label }
  })
  dump(`warstwy-${tag}`, chk)
  await snap(page, `PR.10-${tag}`)
}

test('PR przebieg 9 – „Cofnij” po wydatku 1 000 000 zł, dostawa z XTB 999 999,99 zł, koperta 0 w raportach', async () => {
  const st = useState('rok', RUN)
  const ctx: Ctx = { run: RUN, dataDir: st.dataDir, ictjDir: st.ictjDir }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  page.setDefaultTimeout(20_000)
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(4000)
    await layers(ctx, page, app, 'rok – przed (pr-9)', dump, '9-0-przed')

    await step('milion', async () => {
      await go(page, '2', 'page-operations')
      await page.keyboard.press('Control+n')
      const a = page.getByTestId('operation-amount')
      await a.waitFor()
      await a.click()
      await a.fill('1000000')
      await a.press('Enter')
      await page.getByTestId('operation-counterparty').fill('Duży zakup PR9')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(1500)
    })
    await layers(ctx, page, app, 'rok + wydatek 1 000 000,00 zł (bez kategorii, mBank)', dump, '9-1-milion')
    await step('usun-i-cofnij', async () => {
      await go(page, '2', 'page-operations')
      await page.getByTestId('operations-search').fill('Duży zakup PR9')
      await page.waitForTimeout(1000)
      await page.locator('[data-testid="operation-row"]').first().click()
      await page.waitForTimeout(500)
      await page.getByTestId('operation-delete').click()
      await page.getByTestId('operation-delete-confirm').click()
      await page.waitForTimeout(500)
      const t = page.getByRole('status').filter({ hasText: /Usunięto/ }).getByTestId('toast-action')
      const toast = await page.getByRole('status').allInnerTexts()
      const n = await t.count()
      if (n) await t.first().click()
      await page.waitForTimeout(1200)
      dump('usun-i-cofnij', { toast, przycisk: n, po: await page.getByRole('status').allInnerTexts(), lista: flat(await textOf(page.getByTestId('operations-list'))).slice(0, 300) })
      await page.getByTestId('operations-search').fill('')
    })
    await layers(ctx, page, app, 'rok + wydatek 1 000 000,00 zł usunięty i przywrócony „Cofnij”', dump, '9-2-cofnij')

    // Wypłata z XTB 999 999,99 zł na Portfel XTB (rodzaj XTB, kierunek „wypłata z XTB”) i jej dokowanie.
    await step('xtb', async () => {
      await go(page, '2', 'page-operations')
      await page.keyboard.press('Control+n')
      await page.getByTestId('operation-amount').waitFor()
      await page.getByRole('radio', { name: 'XTB', exact: true }).click()
      await page.waitForTimeout(300)
      await page.getByRole('radio', { name: 'wypłata z XTB' }).click()
      const a = page.getByTestId('operation-amount')
      await a.click()
      await a.fill('999999,99')
      await a.press('Enter')
      await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' }).catch(() => undefined)
      await page.getByTestId('operation-counterparty').fill('XTB S.A.')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(1500)
      dump('xtb-edytor', flat(await textOf(page.getByTestId('operation-editor'))))
      await go(page, '1', 'page-bridge')
      const rows = page.locator('[data-testid="docking-row"]')
      dump('xtb-wiersze', (await rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')))
      await rows.filter({ hasText: /999\s999,99/ }).first().click()
      await page.getByTestId('docking-dialog').waitFor()
      await page.waitForTimeout(600)
      dump('xtb-okno', await textOf(page.getByTestId('docking-dialog')))
      await snap(page, 'PR.10-xtb-okno')
      await page.getByTestId('docking-confirm').click()
      await page.waitForTimeout(2000)
    })
    await layers(ctx, page, app, 'rok + wydatek 1 000 000 zł + wypłata z XTB 999 999,99 zł zadokowana (propozycja)', dump, '9-3-xtb')

    // Koperta Zwierzęta 0 zł i wydatek 10 zł: debriefing M0 w Raportach, Dowództwo.
    await step('koperta-0', async () => {
      await go(page, '4', 'page-month')
      const row = page.locator('[data-testid="month-envelope"]').filter({ hasText: 'Zwierzęta' }).first()
      const inp = row.getByTestId('month-envelope-input')
      await inp.click()
      await inp.fill('0')
      await inp.press('Tab')
      await page.waitForTimeout(800)
      const q = await quickWindow(app, page)
      await q.getByTestId('quick-amount').click()
      await q.getByTestId('quick-amount').fill('10')
      await q.getByTestId('quick-counterparty').fill('Zoo PR9')
      await q.getByTestId('quick-category').selectOption(PETS_FOOD)
      await q.getByTestId('quick-time').fill('')
      await q.getByTestId('quick-note').click()
      await q.getByTestId('quick-save').click()
      await page.waitForTimeout(2000)
      await rec(ctx, 'PR.10', 'rok + … + koperta Zwierzęta 0 zł + wydatek 10 zł – Raporty M0, Dowództwo, odprawa', async () => {
        await go(page, '1', 'page-bridge')
        const items = await page.locator('[data-testid="briefing-item"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-kind')}/${e.getAttribute('data-level') ?? ''}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
        await go(page, '0', 'page-reports')
        await page.getByRole('radio', { name: 'Debriefing' }).click()
        await page.getByTestId('reports-debrief-month').selectOption('2026-11')
        await page.waitForTimeout(600)
        const deb = await textOf(page.getByTestId('reports-debrief'))
        await snap(page, 'PR.10-koperta-0-raporty')
        await go(page, '8', 'page-command')
        const cmd = await textOf(page.getByTestId('page-command'))
        return { odprawa: items.filter((x) => /Zwierzęta|Energia|Deficyt|Przydział/.test(x)).join(' || '), debriefing_m0: flat(deb), dowodztwo: flat(/STOPIEŃ[\s\S]*?KLASA OKRĘTU/.exec(cmd)?.[0] ?? '') + ' … ' + flat(/Dziś na razie[^\n]*/.exec(cmd)?.[0] ?? '') }
      })
    })

    // Plan grudnia z pensją 0 – zrzut.
    await step('pensja-0', async () => {
      await go(page, '4', 'page-month')
      await page.getByTestId('month-next').click()
      await page.waitForTimeout(600)
      const f = page.getByTestId('month-salary')
      await f.click()
      await f.fill('0')
      await f.press('Tab')
      await page.waitForTimeout(1000)
      dump('pensja-0', flat(await textOf(page.getByTestId('page-month'))).slice(0, 1500))
      await snap(page, 'PR.10-pensja-0-grudzien')
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
