/**
 * SW.8, SW.9, SW.10 – money in: an income docking in the layers, a household member's money (repaying first, the rest
 * advance or income), the „przychód / zaliczka” remembered only when chosen. Special state: the points' members added to
 * fi.json with their balances at the settlements' start (Tata pytaj, ma oddać 180; Mama przez Tatę, 90; Ania przychód;
 * Łukasz zaliczka 50; Babcia pytaj).
 */
import { test } from '@playwright/test'
import { reading } from './lab'
import { ACC, SWM, addMembers, added, bridge, brief, enterSave, kind, log, memberSettings, openQuick, openRok, ops, qread, radarMembers, snap, typeAmount, typeIn } from './sw-pomoc'

test('SW domownicy: 8, 9, 10', async () => {
  test.setTimeout(20 * 60_000)
  const run = 'sw-b'
  const { app, page, dataDir } = await openRok(run, addMembers)
  try {
    // ---- SW.8 – Wpływ 1 000,00 od Pracodawcy Testowego na mBank
    let before = await ops(dataDir)
    const b0 = await bridge(page)
    log(run, 'SW.8 przed', b0.energy, '|', b0.state)
    let q = await openQuick(app, page)
    await kind(q, 'Wpływ')
    const r8a = await qread(q)
    log(run, 'SW.8 po przełączeniu', await q.locator('[data-testid="quick-entry"]').innerText().then((x) => x.replace(/\s+/g, ' ').slice(0, 600)))
    await typeAmount(q, '1 000,00')
    await typeIn(q, 'quick-counterparty', 'Pracodawca Testowy')
    await q.getByTestId('quick-account').selectOption(ACC.mbank)
    const r8 = await qread(q)
    log(run, 'SW.8 podgląd', r8.preview, '| kategoria', r8.category, r8a.category)
    await snap(q, 'SW.8')
    log(run, 'SW.8 zapis', await enterSave(app, q, 'quick-counterparty'))
    await page.waitForTimeout(1500)
    log(run, 'SW.8 okna dialogowe w głównym oknie', await page.locator('[role="dialog"]').count())
    const b1 = await bridge(page)
    log(run, 'SW.8 po', b1.energy, '|', b1.state, '| ostatnie', b1.recent)
    const plus = page.getByTestId('bridge-recent-row').first()
    log(run, 'SW.8 wiersz wpływu – klasy kwoty', await plus.locator('.num').last().getAttribute('class'))
    log(run, 'SW.8 nowe', (await added(dataDir, before)).map(brief))
    await snap(page, 'SW.8-mostek')
    reading('sw', 'SW.8', 'rok+domownicy', { stanPrzed: b0.state.slice(0, 400), stanPo: b1.state.slice(0, 400), energiaPrzed: b0.energy, energiaPo: b1.energy })

    // ---- SW.10 – Babcia („pytaj”): wpływ bez ruszania przełącznika, potem z jawnym „zaliczka”
    log(run, 'SW.10 ustawienia przed', await memberSettings(page))
    before = await ops(dataDir)
    q = await openQuick(app, page)
    await kind(q, 'Wpływ')
    await typeAmount(q, '50,00')
    await q.getByTestId('quick-payer').selectOption(SWM.babcia)
    await q.waitForTimeout(200)
    log(run, 'SW.10 Babcia bez wyboru', (await qread(q)).preview, '| przełącznik', await q.locator('[aria-label="Reszta wpłaty domownika"] [aria-checked="true"]').innerText())
    log(run, 'SW.10 zapis 1', await enterSave(app, q))
    await page.waitForTimeout(800)
    log(run, 'SW.10 ustawienia po 1', await memberSettings(page))
    q = await openQuick(app, page)
    await kind(q, 'Wpływ')
    await typeAmount(q, '50,00')
    await q.getByTestId('quick-payer').selectOption(SWM.babcia)
    await q.locator('[aria-label="Reszta wpłaty domownika"]').getByRole('radio', { name: 'zaliczka' }).click()
    log(run, 'SW.10 Babcia zaliczka', (await qread(q)).preview)
    log(run, 'SW.10 zapis 2', await enterSave(app, q))
    await page.waitForTimeout(800)
    log(run, 'SW.10 ustawienia po 2', await memberSettings(page))
    log(run, 'SW.10 nowe', (await added(dataDir, before)).map(brief))

    // ---- SW.9 – Tata („pytaj”, ma oddać 180,00): 300,00 → zaliczka; Ania („przychód”, 0): 300,00
    before = await ops(dataDir)
    const b9 = await bridge(page)
    log(run, 'SW.9 przed', b9.receivables, '|', b9.state)
    log(run, 'SW.9 radar przed', await radarMembers(page, ['Tata', 'Ania']))
    q = await openQuick(app, page)
    await kind(q, 'Wpływ')
    await typeAmount(q, '300,00')
    await q.getByTestId('quick-payer').selectOption(SWM.tata)
    await q.waitForTimeout(200)
    log(run, 'SW.9 Tata podgląd (domyślnie)', (await qread(q)).preview, '| przełącznik', await q.locator('[aria-label="Reszta wpłaty domownika"] [aria-checked="true"]').innerText())
    await q.locator('[aria-label="Reszta wpłaty domownika"]').getByRole('radio', { name: 'zaliczka' }).click()
    const p9 = await qread(q)
    log(run, 'SW.9 Tata podgląd (zaliczka)', p9.preview)
    await snap(q, 'SW.9-tata')
    log(run, 'SW.9 zapis Tata', await enterSave(app, q))
    await page.waitForTimeout(1200)
    const b9b = await bridge(page)
    log(run, 'SW.9 po Tacie', b9b.receivables, '|', b9b.state)
    log(run, 'SW.9 radar po', await radarMembers(page, ['Tata', 'Ania']))
    q = await openQuick(app, page)
    await kind(q, 'Wpływ')
    await typeAmount(q, '300,00')
    await q.getByTestId('quick-payer').selectOption(SWM.ania)
    await q.waitForTimeout(200)
    const p9b = await qread(q)
    log(run, 'SW.9 Ania podgląd', p9b.preview, '| przełącznik', await q.locator('[aria-label="Reszta wpłaty domownika"] [aria-checked="true"]').innerText())
    await snap(q, 'SW.9-ania')
    log(run, 'SW.9 zapis Ania', await enterSave(app, q))
    await page.waitForTimeout(1200)
    const b9c = await bridge(page)
    log(run, 'SW.9 po Ani', b9c.receivables, '|', b9c.state)
    log(run, 'SW.9 nowe', (await added(dataDir, before)).map(brief))
    log(run, 'SW.9/10 ustawienia na końcu', await memberSettings(page))
    reading('sw', 'SW.9', 'rok+domownicy', { podgladTata: p9.preview, podgladAnia: p9b.preview, przed: b9.receivables, poTacie: b9b.receivables, poAni: b9c.receivables, stanPrzed: b9.state.slice(0, 600), stanPoTacie: b9b.state.slice(0, 600), stanPoAni: b9c.state.slice(0, 600) })
  } finally {
    await app.close()
  }
})
