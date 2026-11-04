// PR, przebieg 6 (kopia persony „rok”): PR.10 – kwota 0 i duże kwoty: pensja 0 w M+1, koperta 0 zł (i wydatek w niej),
// cel 0, pożyczka 0, kontener 0, wydatek 1 000 000,00 zł (usunięcie i „Cofnij”), wpływ z XTB 999 999,99 zł zadokowany.
// Warstwy (PR.1) przed, po i po „Cofnij”.
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { recorded, start, useState } from './lab'
import { flat, go, out, pr1, quickWindow, readAll, rec, screenValues, snap, stepper, textOf, type Ctx } from './pr-pomoc'

const RUN = 'pr-6'
const PETS_FOOD = '01KDEFCAT00000000000000401'
const toasts = (page: Page) => page.getByRole('status').allInnerTexts()

async function layers(ctx: Ctx, page: Page, app: ElectronApplication, label: string, dump: (n: string, c: unknown) => void, tag: string): Promise<void> {
  await page.waitForTimeout(2000)
  let chk: Record<string, unknown> = {}
  await rec(ctx, 'PR.10', label, async () => {
    const s = await readAll(page, app, ['operacje', 'konta'])
    chk = { ...pr1(s), stan: flat(s.mostek.stan.text), energia: s.mostek.energia }
    return { ...screenValues(s), krok: label }
  })
  dump(`warstwy-${tag}`, chk)
  await snap(page, `PR.10-${tag}`)
}

test('PR przebieg 6 – kwota 0 i duże kwoty (PR.10)', async () => {
  const st = useState('rok', RUN)
  const ctx: Ctx = { run: RUN, dataDir: st.dataDir, ictjDir: st.ictjDir }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  page.setDefaultTimeout(20_000)
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(5000)
    await layers(ctx, page, app, 'rok – przed', dump, '0-przed')

    // Pensja 0 w M+1 (grudzień 2026).
    await step('pensja-0', async () => {
      await go(page, '4', 'page-month')
      await page.getByTestId('month-next').click()
      await page.waitForTimeout(800)
      dump('pensja-0-przed', { miesiac: await textOf(page.getByTestId('month-label')), pole: await page.getByTestId('month-salary').inputValue() })
      const f = page.getByTestId('month-salary')
      await f.click()
      await f.fill('0')
      await f.press('Tab')
      await page.waitForTimeout(1200)
      await rec(ctx, 'PR.10', 'rok + pensja 0 w grudniu 2026 (M+1)', async () => ({ miesiac: await textOf(page.getByTestId('month-label')), pole: await f.inputValue(), plan: flat(await textOf(page.getByTestId('page-month'))), toasty: (await toasts(page)).join(' | ') }))
      await snap(page, 'PR.10-pensja-0')
      await page.getByTestId('month-prev').click()
      await page.waitForTimeout(600)
    })

    // Koperta 0 zł (Zwierzęta, listopad) i wydatek 10 zł w niej.
    await step('koperta-0', async () => {
      await go(page, '4', 'page-month')
      const row = page.locator('[data-testid="month-envelope"]').filter({ hasText: 'Zwierzęta' }).first()
      const inp = row.getByTestId('month-envelope-input')
      await inp.click()
      await inp.fill('0')
      await inp.press('Tab')
      await page.waitForTimeout(1200)
      dump('koperta-0-plan', { pole: await inp.inputValue(), toasty: await toasts(page) })
      const q = await quickWindow(app, page)
      await q.getByTestId('quick-amount').click()
      await q.getByTestId('quick-amount').fill('10')
      await q.getByTestId('quick-counterparty').fill('Zoo PR10')
      await q.getByTestId('quick-category').selectOption(PETS_FOOD)
      await q.getByTestId('quick-time').fill('')
      await q.getByTestId('quick-note').click()
      await q.waitForTimeout(500)
      const prev = flat(await textOf(q.getByTestId('quick-preview')))
      await q.getByTestId('quick-save').click()
      await page.waitForTimeout(2500)
      await rec(ctx, 'PR.10', 'rok + koperta Zwierzęta 0 zł + wydatek 10 zł (karma)', async () => {
        await go(page, '1', 'page-bridge')
        const odprawa = (await page.locator('[data-testid="briefing-item"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
        const kop = flat(await textOf(page.locator('section[data-panel="bridge:Koperty"]')))
        await go(page, '4', 'page-month')
        const plan = flat(/KOPERTY\n\?[\s\S]*?DEBRIEFING/.exec(await textOf(page.getByTestId('page-month')))?.[0] ?? '?')
        return { podglad: prev, odprawa: odprawa.join(' || '), mostek_koperty: kop, plan_koperty: plan, powiadomienia: JSON.stringify((await recorded(app)).toasts) }
      })
      await snap(page, 'PR.10-koperta-0')
    })

    // Cel 0.
    await step('cel-0', async () => {
      await go(page, '6', 'page-starmap')
      await page.getByTestId('starmap-new-name').fill('Cel zero PR')
      const t = page.getByTestId('starmap-new-target')
      await t.click()
      await t.fill('0')
      await t.press('Tab')
      await page.getByTestId('starmap-new-add').click()
      await page.waitForTimeout(800)
      dump('cel-0', { toasty: await toasts(page), cele: await page.locator('[data-testid="starmap-goal"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-name'))), pole: await t.inputValue() })
      await snap(page, 'PR.10-cel-0')
    })

    // Pożyczka 0.
    await step('pozyczka-0', async () => {
      await go(page, '7', 'page-radar')
      await page.getByTestId('loan-name').fill('Pożyczka zero PR')
      const a = page.getByTestId('loan-amount')
      await a.click()
      await a.fill('0')
      await a.press('Tab')
      await page.getByTestId('loan-save').click()
      await page.waitForTimeout(800)
      dump('pozyczka-0', { toasty: await toasts(page), wiersze: await page.locator('[data-testid="loan-row"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-name'))), pole: await a.inputValue() })
      await snap(page, 'PR.10-pozyczka-0')
    })

    // Kontener 0.
    await step('kontener-0', async () => {
      await go(page, '5', 'page-cargo')
      await page.getByTestId('cargo-add').click()
      await page.getByTestId('container-name').fill('Kontener zero PR')
      const a = page.getByTestId('container-amount')
      await a.click()
      await a.fill('0')
      await a.press('Tab')
      await page.waitForTimeout(500)
      const save = page.getByTestId('cargo-new-save')
      const enabled = await save.isEnabled()
      if (enabled) await save.click()
      await page.waitForTimeout(800)
      dump('kontener-0', { przyciskAktywny: enabled, przyciskTytul: await save.getAttribute('title').catch(() => null), toasty: await toasts(page), formularz: flat(await textOf(page.getByTestId('cargo-new'))), wiersze: await page.locator('[data-testid="cargo-row"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-name'))) })
      await snap(page, 'PR.10-kontener-0')
    })

    // Wydatek 1 000 000,00 zł (Operacje), usunięcie i „Cofnij”.
    await step('milion', async () => {
      await go(page, '2', 'page-operations')
      await page.keyboard.press('Control+n')
      const a = page.getByTestId('operation-amount')
      await a.waitFor()
      await a.click()
      await a.fill('1000000')
      await a.press('Enter')
      await page.getByTestId('operation-counterparty').fill('Duży zakup PR')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(1500)
      dump('milion-edytor', flat(await textOf(page.getByTestId('operation-editor'))))
      await snap(page, 'PR.10-milion-operacje')
    })
    await layers(ctx, page, app, 'rok + … + wydatek 1 000 000,00 zł (bez kategorii, mBank)', dump, '1-milion')
    await step('milion-usun', async () => {
      await go(page, '2', 'page-operations')
      await page.getByTestId('operations-search').fill('Duży zakup PR')
      await page.waitForTimeout(1000)
      await page.locator('[data-testid="operation-row"]').first().click()
      await page.waitForTimeout(600)
      await page.getByTestId('operation-delete').click()
      await page.getByTestId('operation-delete-confirm').click()
      await page.waitForTimeout(800)
      dump('milion-usuniety', await toasts(page))
      await page.getByTestId('operations-search').fill('')
    })
    await layers(ctx, page, app, 'rok + … + wydatek 1 000 000,00 zł usunięty', dump, '2-usuniety')
    await step('milion-cofnij', async () => {
      await go(page, '2', 'page-operations')
      const t = page.getByRole('status').filter({ hasText: /Usunięto/ }).getByTestId('toast-action')
      const n = await t.count()
      if (n) await t.first().click()
      await page.waitForTimeout(1000)
      dump('milion-cofnij', { przycisk: n, toasty: await toasts(page) })
    })
    await layers(ctx, page, app, 'rok + … + wydatek 1 000 000,00 zł po „Cofnij” usunięcia', dump, '3-cofnij')

    // Wpływ z XTB 999 999,99 zł na Portfel XTB i jego dokowanie.
    await step('dostawa', async () => {
      await go(page, '2', 'page-operations')
      await page.keyboard.press('Control+n')
      await page.getByTestId('operation-amount').waitFor()
      await page.getByRole('radio', { name: 'XTB' }).click()
      await page.waitForTimeout(300)
      dump('dostawa-kierunki', await page.getByRole('radio').allInnerTexts())
      await page.getByRole('radio', { name: /Wypłata|z XTB|wpływ/i }).first().click().catch(() => undefined)
      const a = page.getByTestId('operation-amount')
      await a.click()
      await a.fill('999999,99')
      await a.press('Enter')
      await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' }).catch(() => undefined)
      await page.getByTestId('operation-counterparty').fill('XTB S.A.')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(1500)
      dump('dostawa-edytor', flat(await textOf(page.getByTestId('operation-editor'))))
      await go(page, '1', 'page-bridge')
      const rows = page.locator('[data-testid="docking-row"]')
      dump('dostawa-wiersze', (await rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')))
      await rows.filter({ hasText: /999\s999,99/ }).first().click()
      await page.getByTestId('docking-dialog').waitFor()
      await page.waitForTimeout(600)
      dump('dostawa-okno', await textOf(page.getByTestId('docking-dialog')))
      await snap(page, 'PR.10-dostawa-okno')
      await page.getByTestId('docking-confirm').click()
      await page.waitForTimeout(2000)
    })
    await layers(ctx, page, app, 'rok + … + wpływ z XTB 999 999,99 zł zadokowany (propozycja)', dump, '4-dostawa')
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
