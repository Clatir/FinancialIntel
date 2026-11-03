// Area IM – run im-a3 (rok prepared, fresh): IM.8 (theme, brand, operations), IM.23 (Mama „zaliczka” – P.3), IM.25
// („w tym za…”, a shared purchase), then L2 (IM.25 rule, IM.17 – deleted entries) and L1 a third time (IM.40).
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { reading, start, useState } from './lab'
import { MBANK, Obs, PLIKI, catText, counters, expandAll, group, openFile, prepareImportState, readFi, readable, short, statuses, step, theme, txs } from './im-pomoc'

async function openDone(page: Page): Promise<void> {
  const done = page.getByTestId('import-section-done')
  if ((await done.count()) && !(await done.locator('[data-testid="import-theme"]').count())) await done.locator('button').first().click()
  await expandAll(page, true)
}

async function household(page: Page): Promise<string> {
  await page.keyboard.press('Control+7')
  await page.waitForTimeout(2500)
  const t = await readable(page, 'main')
  const i = t.indexOf('Należności')
  return i >= 0 ? t.slice(i, i + 900) : t.slice(0, 900)
}

test('im-a3: decyzje tematu i operacji, wpłaty domowników, wspólny zakup, L2, L1 trzeci raz', async () => {
  const o = new Obs('im-a3')
  const { dataDir, ictjDir } = useState('rok', 'im-a3')
  o.log('stan', prepareImportState(dataDir))
  const run = await start('im-a3', { dataDir, ictjDir })
  const { app, page } = run
  const search = page.getByTestId('import-search')
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    o.log('przed: należności (Radar)', await household(page))
    await openFile(app, page, join(PLIKI, 'L1.csv'))
    await expandAll(page)

    // ---------------- IM.8
    await step(o, page, 'IM.8', async () => {
      const label = 'Zakupy bez rozpoznania'
      const t = theme(page, label)
      await t.getByTestId('import-theme-category').selectOption({ label: 'Prezenty i inne · inne' })
      await page.waitForTimeout(500)
      await openDone(page)
      const t2 = page.locator('[data-testid="import-theme"]').filter({ has: page.locator('[data-label="ZEGARMISTRZ ROMAN"]') }).first()
      o.log('IM.8 temat po decyzji tematu', await t2.evaluate((e) => (e as HTMLElement).getAttribute('data-label') + ' / ' + (e as HTMLElement).getAttribute('data-status')))
      await group(page, 'ZEGARMISTRZ ROMAN').getByTestId('import-group-category').selectOption({ label: 'Osobiste · ubrania' })
      await page.waitForTimeout(400)
      await openDone(page)
      // operations
      const rowOf = (g: string) => group(page, g).getByTestId('import-row').first()
      await rowOf('AUTOMATSPEC').locator('select').first().selectOption({ label: 'Dom · chemia' })
      await page.waitForTimeout(300)
      await rowOf('KIOSK RUCH 12').getByTestId('import-row-select').check()
      await page.getByTestId('import-bulk-kind').selectOption({ label: 'Przelew własny – konto spoza budżetu' })
      await page.getByTestId('import-bulk-apply').click()
      await page.waitForTimeout(400)
      o.log('IM.8 toast „Przelew własny” dla operacji', await statuses(page))
      await page.getByTestId('import-bulk-clear').click()
      await openDone(page)
      const ola = rowOf('SKLEP OLA')
      await ola.locator('select').first().selectOption({ label: 'Dom · media' })
      await page.waitForTimeout(300)
      o.log('IM.8 SKLEP OLA – opcje wiersza', await ola.locator('select').first().evaluate((s: HTMLSelectElement) => [...s.options].slice(0, 3).map((x) => `${x.value || '(pusta)'}=${x.text}`)))
      await ola.locator('select').first().selectOption({ index: 0 })
      await page.waitForTimeout(300)
      await rowOf('ZEGARMISTRZ ROMAN').getByTestId('import-row-skip').click()
      await page.waitForTimeout(300)
      await openDone(page)
      const d1 = await readable(page, '[data-testid="import-section-done"]')
      o.log('IM.8 sekcja „Gotowe” po decyzjach', d1)
      await o.shot(page, 'IM.8-decyzje')
      // a theme with its brands decided differently
      const t3 = theme(page, 'Przelewy wychodzące')
      const brands = await t3.locator('[data-testid="import-group"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-label')))
      o.log('IM.8 marki „Przelewy wychodzące”', brands)
      const cats = ['Prezenty i inne · prezenty', 'Dom · media', 'Osobiste · fryzjer', 'Auto · serwis']
      for (const [i, b] of brands.entries()) {
        if (!b || /SKARBOWY/.test(b)) continue
        await page.locator(`[data-testid="import-group"][data-label="${b}"]`).first().getByTestId('import-group-category').selectOption({ label: cats[i % cats.length]! }).catch(() => undefined)
        await page.waitForTimeout(200)
        await openDone(page)
      }
      await page.locator('[data-testid="import-group"][data-label="URZĄD SKARBOWY W TESTOWIE"]').first().getByTestId('import-group-kind').selectOption({ label: 'Podatek PIT-38' }).catch(() => undefined)
      await openDone(page)
      o.log('IM.8 „Przelewy wychodzące” po decyzjach marek', await readable(page, '[data-testid="import-groups"]').then((x) => x.split('\n').filter((l, i, a) => /różne|Przelewy wychodzące|patrz/.test(l) || /Przelewy wychodzące/.test(a[i - 1] ?? '')).join('\n')))
      const before = await readable(page, '[data-testid="import-groups"]')
      // a keyword: the plan counted again
      await page.getByTestId('keyword-input').fill('zegarek')
      await page.getByTestId('keyword-category').selectOption({ label: 'Osobiste · ubrania' })
      await page.getByTestId('keyword-add').click()
      await page.waitForTimeout(2000)
      await openDone(page)
      const after = await readable(page, '[data-testid="import-groups"]')
      o.log('IM.8 decyzje te same po przeliczeniu planu', before === after)
      if (before !== after) {
        const a = before.split('\n')
        const b = after.split('\n')
        o.log('IM.8 różnice', { removed: a.filter((x) => !b.includes(x)).slice(0, 40), added: b.filter((x) => !a.includes(x)).slice(0, 40) })
      }
    })

    // ---------------- IM.23 (Mama: „zaliczka” chosen) / IM.25
    await step(o, page, 'IM.23', async () => {
      await search.fill('halina')
      await page.waitForTimeout(400)
      await openDone(page)
      const mama = page.locator('[data-testid="import-group"][data-label="HALINA TESTOWA"]').first()
      o.log('IM.23 Mama przed', await readable(page, '[data-testid="import-groups"]'))
      await mama.getByRole('radio', { name: 'zaliczka' }).click()
      await page.waitForTimeout(400)
      o.log('IM.23 Mama po „zaliczka”', await readable(page, '[data-testid="import-groups"]'))
      await o.shot(page, 'IM.23-mama-zaliczka')
    })
    await step(o, page, 'IM.25-tata', async () => {
      await search.fill('piotr testowy')
      await page.waitForTimeout(400)
      await openDone(page)
      const tata = page.locator('[data-testid="import-group"][data-label="PIOTR TESTOWY"]').first()
      await tata.getByRole('radio', { name: 'zaliczka' }).click()
      await page.waitForTimeout(400)
      await openDone(page)
      const row = tata.getByTestId('import-row').filter({ hasText: 'OD TATY' }).first()
      o.log('IM.25 wiersz 300 przed', await row.innerHTML().then((h) => h.replace(/class="[^"]*"/g, '').slice(0, 1500)))
      await row.getByTestId('import-row-also-for-via').click()
      await page.waitForTimeout(600)
      o.log('IM.25 wiersz 300 po kliknięciu „+ w tym za Babcia” (wiersz)', await row.innerText())
      o.log('IM.25 pole kwoty w wierszu', await row.getByTestId('import-row-also-for-amount').count())
      await o.shot(page, 'IM.25-wiersz-w-tym-za')
      if (!(await row.getByTestId('import-row-also-for-amount').count())) {
        // the group's „w tym za”
        await tata.getByTestId('import-group-also-for-via').first().click()
        await page.waitForTimeout(600)
        o.log('IM.25 grupa po kliknięciu „+ w tym za Babcia”', await readable(page, '[data-testid="import-groups"]'))
        const amt = tata.getByTestId('import-group-also-for-amount').first()
        if (await amt.count()) {
          await amt.click()
          await amt.fill('100')
          await amt.press('Tab')
          await page.waitForTimeout(400)
          o.log('IM.25 grupa – w tym za Babcia 100', await readable(page, '[data-testid="import-groups"]'))
        }
      } else {
        const amt = row.getByTestId('import-row-also-for-amount')
        await amt.click()
        await amt.fill('100')
        await amt.press('Tab')
        await page.waitForTimeout(400)
        o.log('IM.25 wiersz – w tym za Babcia 100', await row.innerText())
      }
      await o.shot(page, 'IM.25-tata')
    })
    await step(o, page, 'IM.25-castorama', async () => {
      await search.fill('castorama')
      await page.waitForTimeout(400)
      await openDone(page)
      const cg = page.locator('[data-testid="import-group"]').filter({ hasText: /Castorama/i }).first()
      await cg.getByTestId('import-group-kind').selectOption({ label: 'Wspólnie – kilka osób płaci' })
      await page.waitForTimeout(500)
      await openDone(page)
      const share = cg.getByTestId('import-group-share')
      o.log('IM.25 edytor podziału', await readable(page, '[data-testid="import-groups"]'))
      await share.getByRole('radio', { name: 'procenty' }).click().catch((e: Error) => o.log('IM.25 procenty – błąd', e.message.split(String.fromCharCode(10))[0]))
      await page.waitForTimeout(400)
      let lines = share.getByTestId('import-group-share-line')
      o.log('IM.25 linii', await lines.count())
      while ((await lines.count()) < 2) {
        await share.getByTestId('import-group-share-add').click()
        await page.waitForTimeout(300)
        lines = share.getByTestId('import-group-share-line')
      }
      const pct = share.getByTestId('import-group-share-percent')
      const set = async (i: number, v: string) => {
        await pct.nth(i).click()
        await pct.nth(i).fill(v)
        await pct.nth(i).press('Tab')
        await page.waitForTimeout(300)
      }
      await set(0, '60')
      await set(1, '30')
      o.log('IM.25 60 + 30', await readable(page, '[data-testid="import-groups"]'))
      await o.shot(page, 'IM.25-60-30')
      await search.fill('')
      const n0 = (await txs(dataDir)).length
      await page.getByTestId('import-run').click()
      await page.waitForTimeout(3000)
      o.log('IM.25 Importuj przy 90 % – komunikaty', await statuses(page))
      o.log('IM.25 Importuj przy 90 % – import zakończony? / operacji przed, po', [await page.getByTestId('import-done').count(), n0, (await txs(dataDir)).length])
      await o.shot(page, 'IM.25-90-proba')
      if (await page.getByTestId('import-done').count()) throw new Error('import przy 90 % się zapisał')
      await search.fill('castorama')
      await page.waitForTimeout(400)
      await openDone(page)
      await set(1, '40')
      const rem = cg.getByTestId('import-group-remember')
      if ((await rem.count()) && !(await rem.isChecked())) await rem.check()
      o.log('IM.25 60 + 40', await readable(page, '[data-testid="import-groups"]'))
      await search.fill('')
    })

    // ---------------- the import
    await step(o, page, 'import-L1', async () => {
      o.log('L1 liczniki', await counters(page))
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1000)
      o.log('L1 wynik', await readable(page, '[data-testid="import-done"]'))
      o.log('L1 toast', await statuses(page))
      const all = await txs(dataDir)
      o.log('IM.8 operacje tematu', all.filter((t) => /AUTOMATSPEC|KIOSK|SKLEP OLA|ZEGARMISTRZ|MULTIKINO/i.test(String(t.counterparty))).map(short))
      o.log('IM.23/25 wpłaty domowników', all.filter((t) => /HALINA|PIOTR TESTOWY/.test(String(t.counterparty))).map((t) => `${short(t)} shares=${JSON.stringify(t.splits)}`))
      o.log('IM.25 Castorama', all.filter((t) => /CASTORAMA/i.test(String(t.counterparty))).map((t) => `${short(t)} share=${JSON.stringify(t.share)}`))
      o.log('IM.25 reguła Castoramy', readFi(dataDir).settings.import.rules.filter((r: { match: string }) => /castorama/.test(r.match)))
      o.log('po L1: należności (Radar)', await household(page))
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1500)
      const inbox = await readable(page, 'main')
      o.log('po L1: Meldunki – domownicy', inbox.split('\n').filter((l) => /Mama|Tata|Babcia|zwrot/i.test(l)).join('\n'))
      reading('im', 'IM.23', 'rok przygotowany + L1 (Mama „zaliczka”, Tata „zaliczka”, w tym za Babcia)', { naleznosci: (await household(page)).replace(/\n/g, ' ').slice(0, 600) })
    })
    // Mama's payment in the editor: „Za co oddaje” / the name of the purpose
    await step(o, page, 'IM.23-edytor', async () => {
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-search').fill('halina')
      await page.waitForTimeout(800)
      await page.getByTestId('operation-row').first().click()
      await page.waitForTimeout(600)
      const t = await readable(page, 'main')
      o.log('IM.23 edytor wpłaty Mamy', t.slice(t.indexOf('Kwota'), t.indexOf('Kwota') + 2500))
      await o.shot(page, 'IM.23-edytor')
      await page.getByTestId('operations-search').fill('')
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-household').click()
      await page.waitForTimeout(1000)
      const h = await readable(page, 'main')
      o.log('IM.23 Ustawienia → Domownicy (nazwy wyboru)', h.split('\n').filter((l) => /zaliczk|przychód|spłat|pytaj|depozyt|reszta/i.test(l)).slice(0, 30).join('\n'))
    })

    // ---------------- L2 (IM.25 rule, IM.17 deleted entries), L1 a third time (IM.40)
    await step(o, page, 'L2', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'L2.csv'))
      await search.fill('castorama')
      await page.waitForTimeout(400)
      await openDone(page)
      o.log('IM.25 L2 – Castorama', await readable(page, '[data-testid="import-groups"]'))
      await search.fill('')
      const v = page.getByTestId('import-vanished')
      if (await v.count()) await v.locator('input').first().check()
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      o.log('L2 wynik', await readable(page, '[data-testid="import-done"]'))
      o.log('IM.25 Castorama po L2', (await txs(dataDir)).filter((t) => /CASTORAMA/i.test(String(t.counterparty))).map((t) => `${short(t)} share=${JSON.stringify(t.share)}`))
      await page.getByTestId('nav-sync').click()
      await page.waitForTimeout(1500)
      const show = page.getByRole('button', { name: 'Pokaż' })
      if (await show.count()) await show.first().click()
      await page.waitForTimeout(1000)
      const sync = await readable(page, 'main')
      o.log('IM.17 Synchronizacja – Usunięte wpisy', sync.slice(sync.indexOf('Usunięte wpisy'), sync.indexOf('Usunięte wpisy') + 1500))
      await o.shot(page, 'IM.17-usuniete-wpisy')
    })
    await step(o, page, 'IM.40-trzeci', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'L1.csv'))
      await expandAll(page, true)
      o.log('IM.40 L1 trzeci raz – podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.40 L1 trzeci raz – dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
      o.log('IM.40 L1 trzeci raz – nowe (kategoryzacja)', await catText(page))
      await o.shot(page, 'IM.40-trzeci-raz')
      o.log('IM.40 operacje Żabka / Orlen 31.10–02.11 w folderze', (await txs(dataDir)).filter((t) => t.accountId === MBANK && /ZABKA Z1234|ORLEN STACJA 4123/i.test(String(t.counterparty)) && (t.date as string) >= '2026-10-31').map(short))
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})
