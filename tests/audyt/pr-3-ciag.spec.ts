// PR, przebieg 3 (kopia persony „rok” + w kopii ICTTJ dopisana wypłata z puli Podatek 1 000 zł z 02.11.2026): ciąg zmian
// pieniędzy przez interfejs i po każdej PR.1 – suma warstw wobec „Suma kont budżetu” i sald kont (Operacje, Ustawienia):
// import tygodnia 27.10–02.11, dokowanie 3 200 zł (mBank), 1 500 zł (pula Cele, Portfel XTB), 1 000 zł (pula Podatek,
// podział ręczny: podatek / kadłub / cel / osłony – PR.4 „ostatnia dostawa”), podział łupów października, przeniesienie
// z celu, przelew między kontami, pożyczka udzielona, zakup za domownika, wpłata domownika (zaliczka), archiwizacja celu
// ze środkami. Narzędzie obserwacji – oceny w docs/audyt/raport/PR.md.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { answerDialogs, LAB, start, useState } from './lab'
import { breakdowns, flat, go, out, pr1, quickWindow, readAll, rec, screenValues, snap, stepper, textOf, type Ctx } from './pr-pomoc'

// pr-3: the first pass (the dockings not clicked – a filter of the test; the loot's split above the amount left after the
// import); pr-3b: the whole chain again with both fixed.
const RUN = 'pr-3b'
const TAX_ID = '01KAZ7PR000000000000000001'

async function check(ctx: Ctx, page: Page, app: ElectronApplication, label: string, dump: (n: string, c: unknown) => void, n: number): Promise<void> {
  await page.waitForTimeout(2500)
  let res: Record<string, unknown> = {}
  await rec(ctx, 'PR.1', `rok + ciąg zmian: ${label}`, async () => {
    const s = await readAll(page, app, ['mapa', 'operacje', 'konta'])
    res = { ...pr1(s), stan: flat(s.mostek.stan.text), rozliczenia: s.mostek.rozliczenia }
    return { ...screenValues(s), krok: label }
  })
  dump(`PR.1-${String(n).padStart(2, '0')}-${label}`, res)
}

async function money(page: Page, l: ReturnType<Page['locator']>, v: string): Promise<void> {
  await l.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type(v)
  await page.keyboard.press('Tab')
  await page.waitForTimeout(400)
}

async function dock(page: Page, match: RegExp[], dump: (n: string, c: unknown) => void, name: string, split?: (dlg: ReturnType<Page['locator']>) => Promise<void>): Promise<void> {
  await go(page, '1', 'page-bridge')
  const rows = page.locator('[data-testid="docking-row"]')
  const all = (await rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
  dump(`${name}-wiersze`, all)
  let row = rows
  for (const m of match) row = row.filter({ hasText: m })
  dump(`${name}-pasuje`, await row.count())
  row = row.first()
  await row.click()
  const dlg = page.getByTestId('docking-dialog')
  await dlg.waitFor({ timeout: 15_000 })
  await page.waitForTimeout(600)
  if (split) await split(dlg)
  dump(`${name}-okno`, await textOf(dlg))
  await snap(page, `PR.1-${name}`)
  await page.getByTestId('docking-confirm').click()
  await page.waitForTimeout(2000)
  dump(`${name}-po`, { okno: await page.getByTestId('docking-dialog').count(), toast: await page.getByRole('status').allInnerTexts() })
}

test('PR przebieg 3 – ciąg zmian pieniędzy i suma warstw po każdej', async () => {
  const st = useState('rok', RUN)
  const ctx: Ctx = { run: RUN, dataDir: st.dataDir, ictjDir: st.ictjDir }
  const dir = join(LAB, 'przebiegi', RUN)
  mkdirSync(join(dir, 'pliki'), { recursive: true })
  const csv = join(dir, 'pliki', 'rok-nowe-historia.csv')
  copyFileSync(join(LAB, 'pliki', 'rok-nowe-historia.csv'), csv)
  // A withdrawal from ICTTJ's pool „Podatek” in the run's copy of ICTTJ (no pair in mBank – Portfel XTB).
  mkdirSync(join(st.ictjDir!, 'payouts', '2026'), { recursive: true })
  writeFileSync(
    join(st.ictjDir!, 'payouts', '2026', `2026-11-02_${TAX_ID}.json`),
    `${JSON.stringify({ schemaVersion: 1, id: TAX_ID, createdAt: '2026-11-02T19:00:00.000Z', updatedAt: '2026-11-02T19:00:00.000Z', kind: 'withdrawal', date: '2026-11-02', amount: 1000, pool: 'tax', note: '', categoryId: null, goal: null }, null, 2)}\n`
  )
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  page.setDefaultTimeout(20_000)
  const dump = out(RUN)
  const step = stepper(dump)
  let n = 0
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(6000)
    await check(ctx, page, app, '0 stan wyjściowy', dump, n++)

    // 1. Import tygodnia 27.10–02.11 (historia rachunku).
    await step('import', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('page-import').waitFor({ timeout: 30_000 })
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await answerDialogs(app, { paths: [csv] })
      await page.getByTestId('import-pick').click()
      await page.getByTestId('import-file').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(1000)
      dump('import-podglad', (await textOf(page.getByTestId('page-import'))).slice(0, 3000))
      await page.getByTestId('import-run').click()
      await page.getByTestId('import-done').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(1500)
      dump('import-wynik', await textOf(page.getByTestId('import-done')))
    })
    await check(ctx, page, app, '1 import 27.10–02.11', dump, n++)

    // 2. Dokowanie 3 200 zł (31.10, pula zwykła, para w mBanku 01.11) – propozycja.
    await step('dok-3200', () => dock(page, [/3\s200,00/], dump, 'dok-3200'))
    await check(ctx, page, app, '2 dokowanie 3 200 zł', dump, n++)

    // 3. Dokowanie 1 500 zł (25.10, pula Cele, bez pary – Portfel XTB) – propozycja.
    await step('dok-1500', () => dock(page, [/1\s500,00/, /25\.10/], dump, 'dok-1500'))
    await check(ctx, page, app, '3 dokowanie 1 500 zł pula Cele', dump, n++)

    // 4. Dokowanie 1 000 zł (02.11, pula Podatek): podatek 600, kadłub 100, cel Wakacje 2027 250, osłony reszta 50.
    await step('dok-1000', () =>
      dock(page, [/1\s000,00/, /02\.11/], dump, 'dok-1000', async (dlg) => {
        const tax = dlg.getByTestId('docking-tax')
        if (await tax.count()) await money(page, tax, '600')
        await money(page, dlg.getByTestId('docking-hull'), '100')
        const g = dlg.getByLabel('Do celu Wakacje 2027')
        if (await g.count()) await money(page, g, '250')
        dump('dok-1000-osłony', await textOf(dlg.getByTestId('docking-shields')))
      })
    )
    await check(ctx, page, app, '4 dokowanie 1 000 zł pula Podatek z podziałem', dump, n++)
    // PR.4 – „ostatnia dostawa – dokąd poszła?” po dostawie z pulą Podatek i celem.
    await step('PR.4-dostawa', async () => {
      await go(page, '1', 'page-bridge')
      let b: Record<string, string[]> = {}
      await rec(ctx, 'PR.4', 'rok + dostawa 1 000 zł pula Podatek (podatek 600, kadłub 100, cel 250, osłony 50)', async () => {
        b = await breakdowns(page)
        return Object.fromEntries(Object.entries(b).map(([k, v]) => [`rozbicie_${k}`, v.join(' | ')]))
      })
      dump('PR.4-rozbicia-po-dostawie', b)
      const del = page.getByTestId('state-delivery-why')
      if (await del.count()) {
        await del.click()
        await page.waitForTimeout(300)
        await snap(page, 'PR.4-dostawa-podatek')
        await del.click()
      }
    })

    // 5. Podział łupów października (po imporcie zostaje mniej): 20 zł na następny miesiąc, 30 zł do celu „Wakacje 2027”,
    // reszta do osłon.
    await step('lupy', async () => {
      await go(page, '4', 'page-month')
      dump('lupy-przed', await textOf(page.getByTestId('month-debrief')))
      await money(page, page.getByTestId('loot-next'), '20')
      await money(page, page.getByLabel('Cel Wakacje 2027'), '30')
      dump('lupy-formularz', await textOf(page.getByTestId('month-debrief')))
      await page.getByTestId('loot-confirm').click()
      await page.waitForTimeout(2500)
      dump('lupy-po', await textOf(page.getByTestId('month-debrief')))
    })
    await check(ctx, page, app, '5 podział łupów października (20 następny miesiąc, 30 cel, reszta osłony)', dump, n++)

    // 6. Przeniesienie 500 zł z celu „Nowy laptop” do osłon.
    await step('cel-przeniesienie', async () => {
      await go(page, '6', 'page-starmap')
      const g = page.locator('[data-testid="starmap-goal"][data-name="Nowy laptop"]')
      await g.getByTestId('goal-move-funds').click()
      await page.getByTestId('starmap-money').waitFor()
      await money(page, page.getByTestId('starmap-money-amount'), '500')
      await page.getByTestId('starmap-money-shields').check()
      dump('cel-okno', await textOf(page.getByTestId('starmap-money')))
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(1500)
    })
    await check(ctx, page, app, '6 przeniesienie 500 zł z celu do osłon', dump, n++)

    // 7. Przelew własny 200 zł mBank → Gotówka (Operacje, nowa operacja).
    await step('przelew', async () => {
      await go(page, '2', 'page-operations')
      await page.keyboard.press('Control+n')
      await page.getByTestId('operation-amount').waitFor()
      await page.getByRole('radio', { name: 'Przelew własny' }).click()
      await page.waitForTimeout(300)
      const a = page.getByTestId('operation-amount')
      await a.click()
      await a.fill('200')
      await a.press('Enter')
      await page.getByTestId('operation-account').selectOption({ label: 'mBank' }).catch(() => undefined)
      await page.getByTestId('operation-counter-account').selectOption({ label: 'Gotówka' })
      await page.getByTestId('operation-counterparty').fill('Wypłata do portfela PR')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(1200)
      dump('przelew-edytor', await textOf(page.getByTestId('operation-editor')))
      await snap(page, 'PR.1-przelew')
    })
    await check(ctx, page, app, '7 przelew 200 zł mBank → Gotówka', dump, n++)

    // 8. Pożyczka udzielona 1 000 zł w 3 ratach (Radar).
    await step('pozyczka', async () => {
      await go(page, '7', 'page-radar')
      await page.getByTestId('loan-name').fill('Pożyczka PR')
      await page.getByTestId('loan-counterparty').fill('Jan Testowy')
      await page.getByTestId('loan-amount').fill('1000')
      await page.getByTestId('loan-amount').press('Tab')
      await page.getByTestId('loan-installments').fill('3')
      await page.getByTestId('loan-installments').press('Tab')
      await page.waitForTimeout(500)
      dump('pozyczka-formularz', flat(await textOf(page.locator('[data-testid="loan-save"]').locator('xpath=ancestor::section[1]'))))
      await page.getByTestId('loan-save').click()
      await page.waitForTimeout(1500)
      dump('pozyczka-wiersz', await textOf(page.locator('[data-testid="loan-row"][data-name="Pożyczka PR"]')))
    })
    await check(ctx, page, app, '8 pożyczka udzielona 1 000 zł', dump, n++)

    // 9. Zakup za domownika: 80 zł „Za domownika” – Marek (szybki wpis).
    await step('zakup-domownika', async () => {
      const q = await quickWindow(app, page)
      await q.getByRole('radio', { name: 'Za domownika' }).click()
      await q.waitForTimeout(300)
      await q.getByTestId('quick-amount').click()
      await q.getByTestId('quick-amount').fill('80')
      await q.getByTestId('quick-counterparty').fill('Sklep PR')
      await q.getByTestId('quick-financer').selectOption({ label: 'Marek' }).catch(async () => q.getByTestId('quick-financer').selectOption('01KAZ200000000000000000003'))
      await q.getByTestId('quick-time').fill('')
      await q.waitForTimeout(400)
      dump('zakup-podglad', await textOf(q.getByTestId('quick-entry')))
      await q.getByTestId('quick-save').click()
      await page.waitForTimeout(2000)
    })
    await check(ctx, page, app, '9 zakup 80 zł za Marka', dump, n++)

    // 10. Wpłata domownika: 50 zł od Anny jako zaliczka, na Gotówkę (szybki wpis).
    await step('wplata-domownika', async () => {
      const q = await quickWindow(app, page)
      await q.getByRole('radio', { name: 'Wpływ' }).click()
      await q.waitForTimeout(300)
      await q.getByTestId('quick-amount').click()
      await q.getByTestId('quick-amount').fill('50')
      await q.getByTestId('quick-counterparty').fill('ANNA TESTOWA')
      await q.getByTestId('quick-payer').selectOption({ label: 'Anna' }).catch(async () => q.getByTestId('quick-payer').selectOption('01KDEFMEM00000000000000001'))
      await q.waitForTimeout(300)
      await q.getByRole('radio', { name: 'zaliczka' }).click().catch(() => undefined)
      await q.getByTestId('quick-account').selectOption({ label: 'Gotówka' })
      await q.getByTestId('quick-time').fill('')
      await q.waitForTimeout(400)
      dump('wplata-podglad', await textOf(q.getByTestId('quick-entry')))
      await q.getByTestId('quick-save').click()
      await page.waitForTimeout(2000)
    })
    await check(ctx, page, app, '10 wpłata 50 zł od Anny (zaliczka)', dump, n++)

    // 11. Archiwizacja celu „Wakacje 2027” ze środkami zostawionymi w celu.
    await step('archiwizacja', async () => {
      await go(page, '6', 'page-starmap')
      const g = page.locator('[data-testid="starmap-goal"][data-name="Wakacje 2027"]')
      await g.getByTestId('starmap-archive').click()
      await page.getByTestId('starmap-money').waitFor()
      await page.getByTestId('starmap-money-stay').check()
      dump('archiwizacja-okno', await textOf(page.getByTestId('starmap-money')))
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(1500)
      await snap(page, 'PR.1-archiwum-celu')
    })
    await check(ctx, page, app, '11 archiwizacja celu ze środkami', dump, n++)
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
