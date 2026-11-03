/**
 * Confirmation on a fresh run of what came out wrong (SW.24, SW.26, SW.31, SW.33) and of a text (SW.12), plus SW.27
 * with the tag the point names. Special state: members (sw-b) and tags (sw-e).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { ACC, CAT, SWM, addMembers, added, bridge, brief, category, enterSave, kind, log, openFresh, openQuick, openRok, ops, qread, quickVisible, snap, typeAmount, typeIn, waitHidden } from './sw-pomoc'

function prepare(dataDir: string): void {
  addMembers(dataDir)
  const dir = join(dataDir, 'transactions', '2026')
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    const t = JSON.parse(readFileSync(p, 'utf8'))
    const tag = f.startsWith('2026-10-30') && t.counterparty === 'Lody Grycan' ? 'Wakacje Chorwacja' : f.startsWith('2026-10-23') && t.counterparty === 'DROGERIA NATURA' ? 'Remont' : null
    if (tag) writeFileSync(p, `${JSON.stringify({ ...t, tags: [tag] }, null, 2)}\n`)
  }
}

test('SW potwierdzenia: 24, 26, 31, 33, 12, 27', async () => {
  test.setTimeout(25 * 60_000)
  const run = 'sw-k'
  const { app, page, dataDir } = await openRok(run, prepare)
  try {
    // ---- SW.27 – seria z tagiem „Wakacje Chorwacja” (pierwsza, póki to tag ostatnich dni)
    let before = await ops(dataDir)
    let q = await openFresh(app, page)
    await q.getByTestId('quick-yesterday').click()
    await q.getByTestId('quick-account').selectOption(ACC.xtb)
    log(run, 'SW.27 podpowiedź tagu', await q.getByTestId('quick-tag-last').innerText())
    await q.getByTestId('quick-tag-last').click()
    for (const a of ['12,00', '8,50', '30,00']) {
      await typeAmount(q, a)
      await category(q, CAT.groceries)
      const msg = await enterSave(app, q, 'quick-category', 'Control+Enter')
      await q.waitForTimeout(300)
      const r = await qread(q)
      log(run, `SW.27 ${a}`, msg, '| formularz', { kind: r.kind, amount: r.amount, account: r.account, date: r.date, time: r.time, focus: r.focus, tags: await q.getByTestId('quick-tags-chip').evaluateAll((cs) => cs.map((c) => c.getAttribute('data-tag'))) })
    }
    await snap(q, 'SW.27')
    await typeAmount(q, '5,00')
    await category(q, CAT.groceries)
    log(run, 'SW.27 czwarty Enter', await enterSave(app, q, 'quick-category'), '| ukryte', await waitHidden(app))
    await page.waitForTimeout(1000)
    const n27 = await added(dataDir, before)
    log(run, 'SW.27 nowe', n27.length, n27.map((t) => [t.date, t.time, t.amount, t.accountId, t.tags]))
    log(run, 'SW.27 Mostek', (await bridge(page)).energy)

    // ---- SW.26 – tag z „#” w nazwie, w notatce; marka bez tagu dla oficera
    before = await ops(dataDir)
    q = await openFresh(app, page)
    await q.getByTestId('quick-tag-last').click().catch(() => undefined)
    await typeAmount(q, '54,30')
    await typeIn(q, 'quick-counterparty', 'Kaufland #wakacje-chorwacja')
    log(run, 'SW.26 oficer dla „Kaufland #wakacje-chorwacja”', (await qread(q)).category)
    await typeIn(q, 'quick-note', '#Remont łazienki')
    log(run, 'SW.26 zapis', await enterSave(app, q, 'quick-note'))
    await page.waitForTimeout(800)
    const n26 = await added(dataDir, before)
    log(run, 'SW.26 nowe', n26.map(brief))
    await page.keyboard.press('Control+9')
    await page.waitForTimeout(2500)
    log(run, 'SW.26 Wyprawy', (await page.getByTestId('intel-expeditions').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ').slice(0, 600))
    await page.getByTestId('intel-expeditions').scrollIntoViewIfNeeded().catch(() => undefined)
    await snap(page, 'SW.26-wyprawy-potwierdzenie')
    await page.keyboard.press('Control+1')

    // ---- SW.24 – kwota ujemna
    before = await ops(dataDir)
    q = await openFresh(app, page)
    await category(q, CAT.clothes)
    await typeAmount(q, '-49,99')
    const r24 = await qread(q)
    log(run, 'SW.24 „-49,99”', r24.amount, '| podgląd', r24.preview, '| komunikat', r24.message, '| aria-invalid', await q.getByTestId('quick-amount').getAttribute('aria-invalid'))
    await snap(q, 'SW.24')
    log(run, 'SW.24 Enter', await enterSave(app, q))
    await snap(q, 'SW.24-enter')
    log(run, 'SW.24 nowe', (await added(dataDir, before)).length)
    await q.keyboard.press('Escape')
    await waitHidden(app)

    // ---- SW.31 – Esc w trakcie wpisywania kwoty
    q = await openFresh(app, page)
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('64,20')
    await q.getByTestId('quick-amount').press('Escape')
    log(run, 'SW.31 Esc w polu – ukryte', await waitHidden(app))
    q = await openQuick(app, page)
    log(run, 'SW.31 ponowne otwarcie – kwota', JSON.stringify((await qread(q)).amount), '| szkic', await q.getByTestId('quick-restored').count())
    await snap(q, 'SW.31-esc')
    // Variant: the name typed first (applied), then the amount typed and Esc.
    await typeIn(q, 'quick-counterparty', 'Rossmann')
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('64,20')
    await q.getByTestId('quick-amount').press('Escape')
    await waitHidden(app)
    q = await openQuick(app, page)
    log(run, 'SW.31 wariant (Gdzie, potem kwota i Esc) – kwota', JSON.stringify((await qread(q)).amount), '| Gdzie', (await qread(q)).counterparty, '| szkic', await q.getByTestId('quick-restored').count())
    await snap(q, 'SW.31-esc-wariant')
    if (await q.getByTestId('quick-clear').count()) await q.getByTestId('quick-clear').click()
    await q.keyboard.press('Escape')
    await waitHidden(app)

    // ---- SW.12 – podgląd bez wybranego domownika
    q = await openFresh(app, page)
    await kind(q, 'Za domownika')
    await typeAmount(q, '120,00')
    await category(q, CAT.food)
    await q.getByTestId('quick-financer').selectOption('')
    const r12 = await qread(q)
    log(run, 'SW.12 bez osoby – pole', await q.getByTestId('quick-financer').evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent), '| podgląd', r12.preview)
    await snap(q, 'SW.12-bez-osoby')
    log(run, 'SW.12 Enter', await enterSave(app, q, 'quick-financer'))
    await q.keyboard.press('Escape')
    await waitHidden(app)

    // ---- SW.33 – (a) tylko kategoria główna zarchiwizowana; (b) wszystkie trzy naraz
    before = await ops(dataDir)
    q = await openFresh(app, page)
    await typeAmount(q, '44,00')
    await category(q, '01KDEFCAT00000000000000401')
    log(run, 'SW.33a przed', await qread(q))
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-categories').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="category-row"][data-name="Zwierzęta"] [data-testid="category-archive"]').click()
    await page.waitForTimeout(1500)
    const r33a = await qread(q)
    log(run, 'SW.33a po archiwizacji „Zwierzęta”', r33a, '| wartość pola kategorii', await q.getByTestId('quick-category').inputValue())
    await snap(q, 'SW.33-kategoria')
    log(run, 'SW.33a Enter', await enterSave(app, q, 'quick-amount'))
    await page.waitForTimeout(1000)
    log(run, 'SW.33a nowe', (await added(dataDir, before)).map(brief))
    // (b) Portfel XTB, Zdrowie (main) and Ania archived at once (one change of the folder)
    before = await ops(dataDir)
    q = await openFresh(app, page)
    await kind(q, 'Za domownika')
    await q.getByTestId('quick-financer').selectOption(SWM.ania)
    await typeAmount(q, '44,00')
    await category(q, CAT.meds)
    await q.getByTestId('quick-account').selectOption(ACC.xtb)
    log(run, 'SW.33b przed', await qread(q))
    await page.evaluate(() => undefined)
    await page.getByTestId('settings-tab-accounts').click()
    await page.waitForTimeout(500)
    const t0 = Date.now()
    await page.locator('[data-testid="account-row"][data-name="Portfel XTB"] [role="switch"]').click()
    await page.getByTestId('settings-tab-categories').click()
    await page.locator('[data-testid="category-row"][data-name="Zdrowie"] [data-testid="category-archive"]').click()
    await page.getByTestId('settings-tab-household').click()
    await page.locator('[data-testid="member-row"][data-name="Ania"] [data-testid="member-archived"] [role="switch"]').click()
    log(run, 'SW.33b archiwizacja trwała ms', Date.now() - t0)
    await page.waitForTimeout(2000)
    const r33b = await qread(q)
    log(run, 'SW.33b po', r33b, '| finansuje', await q.getByTestId('quick-financer').evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent), '| wartość kategorii', await q.getByTestId('quick-category').inputValue(), '| widoczne', await quickVisible(app))
    await snap(q, 'SW.33-trzy')
    log(run, 'SW.33b Enter', await enterSave(app, q, 'quick-amount'))
    await page.waitForTimeout(1000)
    log(run, 'SW.33b nowe', (await added(dataDir, before)).map(brief))
  } finally {
    await app.close()
  }
})
