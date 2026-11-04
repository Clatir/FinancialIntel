/**
 * SW.35, SW.36, SW.33 – hidden amounts (Ctrl+$ in the main window while the quick window is open), the evening's three
 * purchases by keyboard only, the lists changed while the window is open. Special state as sw-b (members added).
 */
import { test, type Page } from '@playwright/test'
import { CAT, SWM, ACC, addMembers, added, bridge, brief, category, enterSave, kind, log, openFresh, openQuick, openRok, ops, qread, quickVisible, snap, typeAmount, waitHidden } from './sw-pomoc'

const focusOf = (q: Page) =>
  q.evaluate(() => {
    const e = document.activeElement as HTMLElement | null
    if (!e) return null
    const visible = !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)
    return `${e.dataset.testid ?? e.getAttribute('aria-label') ?? e.getAttribute('title') ?? (e.textContent ?? '').trim().slice(0, 20) ?? e.tagName}${visible ? '' : ' [niewidoczne]'}`
  })

test('SW maska, klawiatura, listy: 35, 36, 33', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'sw-g'
  const { app, page, dataDir } = await openRok(run, addMembers)
  try {
    // ---- SW.36 – samą klawiaturą trzy zakupy
    let before = await ops(dataDir)
    let q = await openFresh(app, page)
    const order: string[] = [String(await focusOf(q))]
    for (let i = 0; i < 22; i++) {
      await q.keyboard.press('Tab')
      order.push(String(await focusOf(q)))
    }
    log(run, 'SW.36 kolejność Tab od kwoty', order.join(' → '))
    await q.keyboard.press('Escape')
    await waitHidden(app)
    q = await openFresh(app, page)
    let keys = 0
    const press = async (k: string) => {
      await q.keyboard.press(k)
      keys++
      await q.waitForTimeout(60)
    }
    const type = async (s: string) => {
      await q.keyboard.type(s, { delay: 20 })
      keys += [...s].length
      await q.waitForTimeout(60)
    }
    const counts: number[] = []
    // 1. Żabka 8,99 Jedzenie
    await type('8,99')
    await press('Tab')
    await type('Żabka')
    log(run, 'SW.36 Żabka przed zapisem', await qread(q))
    await press('Control+Enter')
    await q.waitForTimeout(600)
    counts.push(keys)
    log(run, 'SW.36 po 1. – stopka', (await qread(q)).message, '| fokus', await focusOf(q))
    // 2. Orlen 250,00 Auto · paliwo, „plan”
    keys = 0
    await type('250')
    await press('Tab')
    await type('Orlen')
    const r2 = await qread(q)
    log(run, 'SW.36 Orlen – kategoria', r2.category, '| dziennik', r2.log)
    // To „plan”: Tab until the radio, then Space.
    let tabs = 0
    while (tabs < 20 && !/^plan/.test(String(await focusOf(q)))) {
      await press('Tab')
      tabs++
    }
    log(run, 'SW.36 Orlen – Tab do „plan”', tabs, '| fokus', await focusOf(q))
    await press('Space')
    log(run, 'SW.36 Orlen – plan/impuls', await q.locator('[aria-label="Plan czy impuls"] [aria-checked="true"]').innerText().catch(() => '(nic)'))
    await press('Control+Enter')
    await q.waitForTimeout(600)
    counts.push(keys)
    log(run, 'SW.36 po 2. – stopka', (await qread(q)).message)
    // 3. Apteka 32,40 Zdrowie · leki, Enter
    keys = 0
    await type('32,40')
    await press('Tab')
    await type('Apteka')
    log(run, 'SW.36 Apteka – kategoria', (await qread(q)).category)
    await press('Enter')
    counts.push(keys)
    log(run, 'SW.36 okno zamknięte po Enter', await waitHidden(app))
    await page.waitForTimeout(800)
    const n36 = await added(dataDir, before)
    log(run, 'SW.36 klawisze na zakup', counts, '| nowe', n36.map(brief))
    // Category by keyboard (a name the officer does not know): type-ahead in the select
    q = await openFresh(app, page)
    await q.keyboard.type('5')
    await q.keyboard.press('Tab')
    await q.keyboard.type('Sklepik')
    await q.keyboard.press('Tab')
    log(run, 'SW.36 fokus po Tab z „Gdzie”', await focusOf(q))
    await q.keyboard.type('Zd')
    await q.waitForTimeout(200)
    log(run, 'SW.36 kategoria wpisana z klawiatury „Zd”', (await qread(q)).category)
    await q.keyboard.press('ArrowDown')
    await q.waitForTimeout(200)
    log(run, 'SW.36 po strzałce w dół', (await qread(q)).category)
    await q.keyboard.press('Escape')
    await waitHidden(app)

    // ---- SW.35 – ukryte kwoty
    q = await openFresh(app, page)
    await kind(q, 'Za domownika')
    await typeAmount(q, '120,00')
    await q.getByTestId('quick-financer').selectOption(SWM.ania)
    log(run, 'SW.35 przed Ctrl+$', await qread(q))
    await page.keyboard.press('Control+Shift+Digit4')
    await q.waitForTimeout(800)
    const r35 = await qread(q)
    log(run, 'SW.35 po Ctrl+$ (bez ponownego otwarcia)', r35, '| dymek Powtórz', await q.getByTestId('quick-repeat').getAttribute('title').catch(() => null))
    await snap(q, 'SW.35')
    await kind(q, 'Wpływ')
    await q.getByTestId('quick-payer').selectOption(SWM.tata)
    await q.waitForTimeout(200)
    log(run, 'SW.35 W tym za', (await q.locator('[data-testid="quick-entry"]').innerText()).replace(/\s+/g, ' ').replace(/.*(W tym za)/, '$1').slice(0, 160), '| podgląd', (await qread(q)).preview)
    await snap(q, 'SW.35-w-tym-za')
    await kind(q, 'Wydatek')
    await typeAmount(q, '15,50')
    log(run, 'SW.35 wpisywanie kwoty działa – pole', await q.getByTestId('quick-amount').inputValue(), '| podgląd', (await qread(q)).preview)
    await category(q, CAT.groceries)
    log(run, 'SW.35 Ctrl+Enter', await enterSave(app, q, 'quick-category', 'Control+Enter'), '| stopka', (await qread(q)).message)
    await snap(q, 'SW.35-seria')
    await q.keyboard.press('Escape')
    await waitHidden(app)
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(600)
    log(run, 'SW.35 Mostek po odkryciu', (await bridge(page)).energy)

    // ---- SW.33 – listy zmienione przy otwartym oknie
    before = await ops(dataDir)
    const b0 = await bridge(page)
    q = await openFresh(app, page)
    await kind(q, 'Za domownika')
    await q.getByTestId('quick-financer').selectOption(SWM.ania)
    await typeAmount(q, '44,00')
    await category(q, '01KDEFCAT00000000000000401')
    await q.getByTestId('quick-account').selectOption(ACC.xtb)
    log(run, 'SW.33 przed zmianą list', await qread(q), '| finansuje', await q.getByTestId('quick-financer').evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent))
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-accounts').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="account-row"][data-name="Portfel XTB"] [role="switch"]').click()
    await page.getByTestId('settings-tab-categories').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="category-row"][data-name="Zwierzęta"] [data-testid="category-archive"]').click()
    await page.getByTestId('settings-tab-household').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="member-row"][data-name="Ania"] [data-testid="member-archived"] [role="switch"]').click()
    await page.waitForTimeout(2000)
    const r33 = await qread(q)
    log(run, 'SW.33 po zmianie list', r33, '| finansuje', await q.getByTestId('quick-financer').evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent).catch(() => '(brak pola)'), '| okno widoczne', await quickVisible(app))
    await snap(q, 'SW.33')
    log(run, 'SW.33 Enter', await enterSave(app, q, 'quick-amount'))
    await page.waitForTimeout(1000)
    const n33 = await added(dataDir, before)
    log(run, 'SW.33 nowe', n33.map(brief))
    await page.keyboard.press('Control+1')
    log(run, 'SW.33 Mostek energia przed / po', b0.energy, (await bridge(page)).energy)
    void openQuick
  } finally {
    await app.close()
  }
})
