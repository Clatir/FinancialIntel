/**
 * AU-11 skeptical check W2 – SW.24 (negative amount), SW.26 (tags), SW.31 (Esc in the amount field), SW.33 (lists changed
 * while the window is open). Special state as sw-k: members of sw-pomoc `addMembers` and the tags „Wakacje Chorwacja”
 * (Lody Grycan 30.10) and „Remont” (Drogeria Natura 23.10). Own run name and shots (W2-…).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot } from './lab'
import { ACC, CAT, SWM, addMembers, added, brief, category, enterSave, kind, log, openFresh, openQuick, openRok, ops, qread, quickVisible, typeAmount, typeIn, waitHidden } from './sw-pomoc'

const RUN = 'w2-sw'

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

const financer = (q: Page) => q.getByTestId('quick-financer').evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent).catch(() => '(brak pola)')

test('W2 – SW.24, SW.26, SW.31, SW.33', async () => {
  test.setTimeout(25 * 60_000)
  const { app, page, dataDir } = await openRok(RUN, prepare)
  try {
    // ---- SW.24 – negative amount
    let before = await ops(dataDir)
    let q = await openFresh(app, page)
    await category(q, CAT.clothes)
    for (const v of ['-49,99', '20-69,99']) {
      await typeAmount(q, v)
      const r = await qread(q)
      log(RUN, `SW.24 „${v}” po wyjściu z pola: kwota`, JSON.stringify(r.amount), '| podgląd', r.preview, '| komunikat', r.message, '| aria-invalid', await q.getByTestId('quick-amount').getAttribute('aria-invalid'))
    }
    await shot(q, 'W2-SW.24')
    log(RUN, 'SW.24 Enter', await enterSave(app, q))
    await shot(q, 'W2-SW.24-enter')
    log(RUN, 'SW.24 nowe operacje', (await added(dataDir, before)).length)
    await q.keyboard.press('Escape')
    await waitHidden(app)

    // ---- SW.26 – tags
    before = await ops(dataDir)
    q = await openFresh(app, page)
    log(RUN, 'SW.26 przycisk tagu', await q.getByTestId('quick-tag-last').innerText().catch(() => '(brak)'))
    await q.getByTestId('quick-tag-last').click()
    await typeAmount(q, '54,30')
    await typeIn(q, 'quick-counterparty', 'Konzum #wakacje-chorwacja')
    await typeIn(q, 'quick-note', '#Remont łazienki')
    const chips = await q.getByTestId('quick-tags-chip').evaluateAll((cs) => cs.map((c) => `${c.getAttribute('data-tag')}=„${(c as HTMLElement).innerText}”`))
    log(RUN, 'SW.26 chipy przed zapisem', chips.join(', '), '| Gdzie', (await qread(q)).counterparty)
    await shot(q, 'W2-SW.26-okno')
    log(RUN, 'SW.26 zapis', await enterSave(app, q, 'quick-note'))
    await page.waitForTimeout(800)
    log(RUN, 'SW.26 nowe', (await added(dataDir, before)).map(brief))
    await page.keyboard.press('Control+9')
    await page.waitForTimeout(2500)
    log(RUN, 'SW.26 Wyprawy', (await page.getByTestId('intel-expeditions').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ').slice(0, 600))
    await page.getByTestId('intel-expeditions').scrollIntoViewIfNeeded().catch(() => undefined)
    await shot(page, 'W2-SW.26-wyprawy')
    await page.keyboard.press('Control+1')

    // ---- SW.31 – Esc while typing the amount; the „×” button for comparison
    q = await openFresh(app, page)
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('64,20')
    await q.getByTestId('quick-amount').press('Escape')
    log(RUN, 'SW.31 Esc w polu kwoty – okno ukryte', await waitHidden(app))
    q = await openQuick(app, page)
    log(RUN, 'SW.31 po ponownym otwarciu – kwota', JSON.stringify((await qread(q)).amount), '| szkic', await q.getByTestId('quick-restored').count())
    await shot(q, 'W2-SW.31-esc')
    if (await q.getByTestId('quick-clear').count()) await q.getByTestId('quick-clear').click()
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('64,20')
    const close = q.getByRole('button', { name: /Zamknij/ }).first()
    log(RUN, 'SW.31 przycisk zamknięcia', await close.getAttribute('title').catch(() => null), await close.getAttribute('aria-label').catch(() => null))
    await close.click()
    log(RUN, 'SW.31 „×” – okno ukryte', await waitHidden(app))
    q = await openQuick(app, page)
    log(RUN, 'SW.31 po „×” – kwota', JSON.stringify((await qread(q)).amount), '| szkic', await q.getByTestId('quick-restored').count())
    if (await q.getByTestId('quick-clear').count()) await q.getByTestId('quick-clear').click()
    await q.keyboard.press('Escape')
    await waitHidden(app)

    // ---- SW.33 (1) – account, category, member archived one after another (a user's pace), then Enter
    before = await ops(dataDir)
    q = await openFresh(app, page)
    await kind(q, 'Za domownika')
    await q.getByTestId('quick-financer').selectOption(SWM.ania)
    await typeAmount(q, '44,00')
    await category(q, CAT.petFood)
    await q.getByTestId('quick-account').selectOption(ACC.xtb)
    log(RUN, 'SW.33(1) przed', await qread(q), '| finansuje', await financer(q))
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-accounts').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="account-row"][data-name="Portfel XTB"] [role="switch"]').click()
    await page.waitForTimeout(1500)
    log(RUN, 'SW.33(1) po archiwum konta – komunikat', (await qread(q)).message, '| konto', (await qread(q)).account)
    await page.getByTestId('settings-tab-categories').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="category-row"][data-name="Zwierzęta"] [data-testid="category-archive"]').click()
    await page.waitForTimeout(1500)
    log(RUN, 'SW.33(1) po archiwum kategorii – komunikat', (await qread(q)).message, '| kategoria', (await qread(q)).category, '| wartość pola', await q.getByTestId('quick-category').inputValue())
    await page.getByTestId('settings-tab-household').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="member-row"][data-name="Ania"] [data-testid="member-archived"] [role="switch"]').click()
    await page.waitForTimeout(1500)
    const r1 = await qread(q)
    log(RUN, 'SW.33(1) po archiwum osoby', r1, '| finansuje', await financer(q), '| okno widoczne', await quickVisible(app))
    await shot(q, 'W2-SW.33-1')
    log(RUN, 'SW.33(1) Enter', await enterSave(app, q, 'quick-amount'))
    await page.waitForTimeout(1000)
    log(RUN, 'SW.33(1) nowe', (await added(dataDir, before)).map(brief))

    // ---- SW.33 (2) – only a main category archived (Zdrowie) with „Zdrowie · leki” chosen
    before = await ops(dataDir)
    q = await openFresh(app, page)
    await typeAmount(q, '33,00')
    await category(q, CAT.meds)
    log(RUN, 'SW.33(2) przed', (await qread(q)).category)
    await page.getByTestId('settings-tab-categories').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="category-row"][data-name="Zdrowie"] [data-testid="category-archive"]').click()
    await page.waitForTimeout(1500)
    const r2 = await qread(q)
    log(RUN, 'SW.33(2) po archiwum kategorii', r2, '| wartość pola', await q.getByTestId('quick-category').inputValue())
    await shot(q, 'W2-SW.33-2')
    log(RUN, 'SW.33(2) Enter', await enterSave(app, q, 'quick-amount'))
    await page.waitForTimeout(1000)
    log(RUN, 'SW.33(2) nowe', (await added(dataDir, before)).map(brief))
  } finally {
    await app.close()
  }
})
