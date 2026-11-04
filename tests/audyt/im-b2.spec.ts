// Area IM – run im-b2 (a fresh repeat of im-b with its steps fixed, then L2): the main import of L1 on „rok” prepared for the area (prepareImportState), then L1 again, L1-utf8,
// L2: IM.8, IM.9, IM.14–IM.21, IM.23, IM.25–IM.29, IM.40, IM.42 (and IM.4 after the import).
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { importDone } from '../e2e/app'
import { reading, recorded, start, useState } from './lab'
import {
  MBANK,
  Obs,
  SAVINGS,
  WALLET,
  catText,
  counters,
  expandAll,
  group,
  openFile,
  prepareImportState,
  readFi,
  readable,
  short,
  statuses,
  step,
  theme,
  txs,
  writeFiles
} from './im-pomoc'

const backups = (dataDir: string) => (existsSync(join(dataDir, 'backups', 'pre-import')) ? readdirSync(join(dataDir, 'backups', 'pre-import')) : [])

async function balances(page: Page): Promise<string> {
  await page.keyboard.press('Control+3')
  await page.waitForTimeout(800)
  return readable(page, '[data-testid="balance-check"]').catch(async () => (await readable(page, '[data-testid="page-import"]')).slice(0, 800))
}

async function bridge(page: Page): Promise<string> {
  await page.keyboard.press('Control+1')
  await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(2500)
  return readable(page, '[data-testid="page-bridge"]')
}

async function radar(page: Page): Promise<string> {
  await page.keyboard.press('Control+7')
  await page.waitForTimeout(2500)
  return readable(page, 'main')
}

async function deleteOperation(page: Page, query: string): Promise<string> {
  await page.keyboard.press('Control+2')
  await page.waitForTimeout(1000)
  await page.getByTestId('operations-period-menu').click()
  await page.getByTestId('operations-period-all').click()
  await page.getByTestId('operations-search').fill(query)
  await page.waitForTimeout(800)
  const row = page.getByTestId('operation-row').first()
  const what = await row.innerText()
  await row.click()
  await page.getByTestId('operation-delete').click()
  await page.getByTestId('operation-delete-confirm').click()
  await page.waitForTimeout(1000)
  await page.getByTestId('operations-search').fill('')
  return what.replace(/\s+/g, ' ')
}

test('im-b2: import L1 na przygotowanym „rok”, potem L1 znowu, L2', async () => {
  const files = writeFiles()
  const o = new Obs('im-b2')
  const { dataDir, ictjDir } = useState('rok', 'im-b2')
  o.log('stan – dodane do „rok”', prepareImportState(dataDir))
  const run = await start('im-b2', { dataDir, ictjDir })
  const { app, page, userData } = run
  const search = page.getByTestId('import-search')
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(3000)
    o.log('PRZED: Mostek', await bridge(page))
    o.log('PRZED: Radar', await radar(page))
    o.log('PRZED: salda (Import)', await balances(page))
    const tx0 = await txs(dataDir)
    o.log('PRZED: operacji', tx0.length)

    // IM.42 – a bank operation of L1's period deleted by the user (persona: ZABKA 25.10 −31,95)
    await step(o, page, 'IM.42-prep', async () => {
      o.log('IM.42 usunięta operacja', await deleteOperation(page, '31,95'))
      o.log('IM.42 operacji po usunięciu', (await txs(dataDir)).length)
    })

    // IM.27 – the rule onto an archived category in the settings
    await step(o, page, 'IM.27-ust', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1500)
      o.log('IM.27 Ustawienia – reguła MULTIKINO', await page.getByTestId('import-rule').filter({ hasText: /multikino/i }).allInnerTexts())
    })
    // ---------------- the preview of L1
    await openFile(app, page, files['L1.csv']!)
    await expandAll(page)
    o.log('L1 plik', await readable(page, '[data-testid="import-file"]'))
    o.log('L1 podgląd', await readable(page, '[data-testid="import-summary"]'))
    const c0 = await counters(page)
    o.log('L1 liczniki', c0)
    o.log('L1 dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
    o.log('L1 kategoryzacja (przed decyzjami)', await catText(page))
    await o.shot(page, 'IM.b-L1-podglad')

    // IM.15 – the pair of an entry by the own transfer: unticked
    await step(o, page, 'IM.15', async () => {
      const pair = page.locator('[data-testid="import-merge"]').filter({ hasText: 'Przelew na lokatę' })
      o.log('IM.15 para przelewu własnego', await pair.count())
      if (await pair.count()) {
        await pair.getByTestId('import-merge-join').uncheck()
        await page.waitForTimeout(500)
        o.log('IM.15 po odznaczeniu', await pair.innerText())
      }
      for (const n of ['Fryzjer', 'Piekarnia Groszek', 'Sklep', 'KFC', 'Biedronka', 'Rossmann', 'Hebe', '(bez kontrahenta)'])
        o.log(`IM.14/15 wpis „${n}”`, await page.locator('[data-testid="import-merge"]').filter({ hasText: n }).allInnerTexts())
      await o.shot(page, 'IM.15')
    })

    // IM.9 – the bank's hints: read, accept, change one
    await step(o, page, 'IM.9', async () => {
      o.log('IM.9 przycisk', await page.getByTestId('import-accept-hints').innerText().catch(() => '(brak)'))
      o.log('IM.9 grupy z podpowiedzią przed', await page.locator('[data-testid="import-group-hint"]').evaluateAll((els) => els.map((e) => (e.closest('[data-testid="import-group"]') as HTMLElement).getAttribute('data-label') + ' → ' + (e as HTMLElement).innerText)))
      o.log('IM.9 tematy z podpowiedzią przed', await page.locator('[data-testid="import-theme-hint"]').evaluateAll((els) => els.map((e) => (e.closest('[data-testid="import-theme"]') as HTMLElement).getAttribute('data-label') + ' → ' + (e as HTMLElement).innerText)))
      await search.fill('xtb')
      await page.waitForTimeout(500)
      o.log('IM.9/IM.20 grupy XTB', await readable(page, '[data-testid="import-right"]'))
      await search.fill('')
      await page.getByTestId('import-accept-hints').click()
      await page.waitForTimeout(800)
      await expandAll(page)
      o.log('IM.9 po przyjęciu – kategoryzacja', await catText(page))
      // one of the accepted changed: PIZERIA NAPOLI → kawa i przekąski
      await search.fill('pizeria')
      await page.waitForTimeout(400)
      o.log('IM.9 PIZERIA po przyjęciu', await readable(page, '[data-testid="import-right"]'))
      await group(page, 'PIZERIA NAPOLI').getByTestId('import-group-category').selectOption({ label: 'Jedzenie · kawa i przekąski' })
      await page.waitForTimeout(500)
      o.log('IM.9 PIZERIA po zmianie', await readable(page, '[data-testid="import-right"]'))
      await search.fill('')
      await o.shot(page, 'IM.9')
    })

    // IM.8 – a theme, a brand, operations
    await step(o, page, 'IM.8', async () => {
      const t = theme(page, 'Zakupy bez rozpoznania')
      o.log('IM.8 temat przed', await readable(page, '[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]'))
      await t.getByTestId('import-theme-category').selectOption({ label: 'Prezenty i inne · inne' })
      await page.waitForTimeout(400)
      o.log('IM.8 status tematu po decyzji', await page.locator('[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]').getAttribute('data-status'))
      const done = page.getByTestId('import-section-done')
      if (!(await done.locator('[data-testid="import-theme"]').count())) await done.locator('button').first().click()
      await expandAll(page)
      await group(page, 'ZEGARMISTRZ ROMAN').getByTestId('import-group-category').selectOption({ label: 'Osobiste · ubrania' })
      await page.waitForTimeout(400)
      o.log('IM.8 temat po decyzji tematu i marki', await readable(page, '[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]'))
      // operations: of the theme „mBank: Żywność…”? – the rows of the group ZABKA Z5555 (two) and KIOSK
      await expandAll(page, true)
      const rows = t.getByTestId('import-row')
      o.log('IM.8 operacji w temacie', await rows.count())
      // first row – another category; second – „Przelew własny” (tick + bulk); third – „(jak grupa)”; fourth – pomiń
      const r1 = rows.nth(0)
      await r1.locator('select').first().selectOption({ label: 'Dom · chemia' })
      await page.waitForTimeout(300)
      await rows.nth(1).getByTestId('import-row-select').check()
      await page.getByTestId('import-bulk-kind').selectOption('transfer')
      await page.getByTestId('import-bulk-apply').click()
      await page.waitForTimeout(500)
      o.log('IM.8 toast przelew własny', await statuses(page))
      await page.getByTestId('import-bulk-clear').click()
      const r3 = rows.nth(2)
      await r3.locator('select').first().selectOption({ label: 'Dom · media' })
      await page.waitForTimeout(300)
      o.log('IM.8 wiersz 3 przed (jak grupa)', await r3.innerText())
      await r3.locator('select').first().selectOption({ index: 0 })
      await page.waitForTimeout(300)
      o.log('IM.8 wiersz 3 po (jak grupa) – pierwsza opcja', await readable(page, '[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]'))
      await rows.nth(3).getByTestId('import-row-skip').click()
      await page.waitForTimeout(300)
      const d1 = await readable(page, '[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]')
      o.log('IM.8 temat po decyzjach operacji', d1)
      await o.shot(page, 'IM.8-przed-slowem')
      // a keyword – the plan counted again
      await page.getByTestId('keyword-input').fill('zegarek')
      await page.getByTestId('keyword-category').selectOption({ label: 'Osobiste · ubrania' })
      await page.getByTestId('keyword-add').click()
      await page.waitForTimeout(2000)
      await expandAll(page, true)
      const d2 = await readable(page, '[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]').catch(() => '(temat zniknął)')
      o.log('IM.8 temat po dodaniu słowa (plan od nowa)', d2)
      o.log('IM.8 decyzje te same po przeliczeniu', d1 === d2)
      await o.shot(page, 'IM.8')
    })

    // IM.21 – own transfers: 500 → Portfel XTB, 1000 → mBank oszczędności, 300 stays out of the budget
    await step(o, page, 'IM.21', async () => {
      await search.fill('jan kapitan')
      await page.waitForTimeout(500)
      await expandAll(page, true)
      o.log('IM.21 przelewy własne przed', await readable(page, '[data-testid="import-right"]'))
      const rows = page.locator('[data-testid="import-group"][data-label="JAN KAPITAN"]').getByTestId('import-row')
      const n = await rows.count()
      for (let i = 0; i < n; i++) {
        const r = rows.nth(i)
        const t = await r.innerText()
        const acc = r.getByTestId('import-row-counter-account')
        o.log(`IM.21 wiersz ${i}`, { t, title: await page.locator('[data-testid="import-group"][data-label="JAN KAPITAN"]').first().getByTestId('import-group-counter-account').getAttribute('title').catch(() => null) })
        if (/NA PORTFEL XTB/.test(t) && (await acc.count())) await acc.selectOption({ label: '→ Portfel XTB' })
        if (/NA OSZCZ/.test(t) && (await acc.count())) await acc.selectOption({ label: '→ mBank oszczędności' })
      }
      await page.waitForTimeout(400)
      o.log('IM.21 przelewy własne po', await readable(page, '[data-testid="import-right"]'))
      await search.fill('')
      await o.shot(page, 'IM.21')
    })

    // IM.18 / IM.19 / IM.20 / IM.26 – recognition read
    await step(o, page, 'IM.18-20', async () => {
      for (const q of ['kapitan', 'nowak', 'bankomat', 'planet', 'opłata', 'prowizja', 'kebab', 'rossmann', 'zalando', 'kantor', 'sąsiad', 'payu', 'xtb', 'testowy', 'kolega', 'skarbowy', 'multikino']) {
        await search.fill(q)
        await page.waitForTimeout(450)
        await expandAll(page, true)
        o.log(`szukaj „${q}”`, await readable(page, '[data-testid="import-right"]'))
      }
      await search.fill('')
    })

    // IM.20 – „zapamiętaj” at XTB; IM.26 – PIT-38 with „zapamiętaj”
    await step(o, page, 'IM.20/26', async () => {
      await search.fill('xtb')
      await page.waitForTimeout(400)
      o.log('IM.20 zapamiętaj przy XTB', await page.locator('[data-testid="import-group"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-label')}: zapamiętaj=${!!e.querySelector('[data-testid="import-group-remember"]')}`)))
      await search.fill('skarbowy')
      await page.waitForTimeout(400)
      const us = page.locator('[data-testid="import-group"][data-label="URZĄD SKARBOWY W TESTOWIE"]')
      await us.getByTestId('import-group-kind').selectOption({ label: 'Podatek PIT-38' }).catch(async (e: Error) => o.log('IM.26 brak opcji PIT-38', e.message.split('\n')[0]))
      await page.waitForTimeout(400)
      o.log('IM.26 PIT-38 po wyborze', await readable(page, '[data-testid="import-right"]'))
      const rem = us.getByTestId('import-group-remember')
      if (await rem.count()) await rem.check()
      await search.fill('')
    })

    // IM.23 / IM.25 – household: Tata „zaliczka”; Tata's 300 zł with Babcia 100 zł; Castorama shared 60 + 30
    await step(o, page, 'IM.23/25', async () => {
      await search.fill('halina')
      await page.waitForTimeout(400)
      await expandAll(page, true)
      o.log('IM.23 Mama (HALINA TESTOWA)', await readable(page, '[data-testid="import-right"]'))
      await search.fill('piotr testowy')
      await page.waitForTimeout(400)
      await expandAll(page, true)
      o.log('IM.23 Tata przed', await readable(page, '[data-testid="import-right"]'))
      const tata = page.locator('[data-testid="import-group"][data-label="PIOTR TESTOWY"]').first()
      o.log('IM.23 opcje Taty', await tata.getByTestId('import-group-kind').evaluate((s: HTMLSelectElement) => [...s.options].map((x) => x.text)))
      const fiBefore = readFi(dataDir).settings.household.members.find((m: { name: string }) => m.name === 'Tata')
      const radio = tata.getByRole('radio', { name: 'zaliczka' })
      if (await radio.count()) await radio.click()
      else await tata.getByTestId('import-group-kind').selectOption({ label: 'Od domownika: Tata – reszta jako zaliczka' })
      await page.waitForTimeout(500)
      o.log('IM.23 Tata po „zaliczka”', await readable(page, '[data-testid="import-right"]'))
      o.log('IM.23 Tata w fi.json przed / po odpowiedzi (przed importem)', { before: fiBefore?.inflow, after: readFi(dataDir).settings.household.members.find((m: { name: string }) => m.name === 'Tata')?.inflow })
      // IM.25 – in the row of 300 zł: „w tym za…” Babcia 100
      const tg = tata.getByTestId('import-group-toggle')
      if ((await tg.getAttribute('aria-label')) === 'Pokaż operacje') await tg.click()
      await page.waitForTimeout(300)
      const rows = tata.getByTestId('import-row')
      o.log('IM.25 wiersze Taty', await rows.allInnerTexts())
      for (let i = 0; i < (await rows.count()); i++) {
        const r = rows.nth(i)
        if (!/300,00/.test((await r.innerText()).replace(/\s/g, ''))) continue
        const via = r.getByTestId('import-row-also-for-via')
        const add = r.getByTestId('import-row-also-for-add')
        o.log('IM.25 przyciski w wierszu 300', { via: await via.allInnerTexts(), add: await add.allInnerTexts() })
        if (await via.count()) await via.first().click()
        else if (await add.count()) await add.first().click()
        await page.waitForTimeout(300)
        const member = r.getByTestId('import-row-also-for-member')
        if (await member.count()) await member.selectOption({ label: 'Babcia' }).catch(() => undefined)
        const amt = r.getByTestId('import-row-also-for-amount')
        await amt.click()
        await amt.fill('100')
        await amt.press('Tab')
        await page.waitForTimeout(400)
        o.log('IM.25 wiersz 300 po „w tym za Babcia 100”', await r.innerText())
      }
      o.log('IM.25 Tata – grupa', await readable(page, '[data-testid="import-right"]'))
      // Castorama shared 60 + 30
      await search.fill('castorama')
      await page.waitForTimeout(400)
      await expandAll(page)
      const cg = page.locator('[data-testid="import-group"]').filter({ hasText: /castorama/i }).first()
      o.log('IM.25 opcje Castoramy', await cg.getByTestId('import-group-kind').evaluate((s: HTMLSelectElement) => [...s.options].map((x) => `${x.value}=${x.text}`)))
      await cg.getByTestId('import-group-kind').selectOption({ label: 'Wspólnie – kilka osób płaci' })
      await page.waitForTimeout(500)
      o.log('IM.25 Castorama – edytor', await readable(page, '[data-testid="import-right"]'))
      const share = cg.getByTestId('import-group-share')
      await share.getByRole('radio', { name: /procent/i }).click().catch(() => undefined)
      await page.waitForTimeout(300)
      const lines = share.getByTestId('import-group-share-line')
      o.log('IM.25 linii podziału', await lines.count())
      if ((await lines.count()) < 2) await share.getByTestId('import-group-share-add').click().catch(() => undefined)
      const pcts = share.getByTestId('import-group-share-percent')
      o.log('IM.25 pól procentów', await pcts.count())
      if ((await pcts.count()) >= 2) {
        await pcts.nth(0).fill('60')
        await pcts.nth(0).press('Tab')
        await pcts.nth(1).fill('30')
        await pcts.nth(1).press('Tab')
      }
      await page.waitForTimeout(500)
      o.log('IM.25 Castorama 60 + 30', await readable(page, '[data-testid="import-right"]'))
      await o.shot(page, 'IM.25-90')
      await search.fill('')
      await page.getByTestId('import-run').click()
      await page.waitForTimeout(2500)
      o.log('IM.25 Importuj z 90 % – komunikaty', await statuses(page))
      o.log('IM.25 Importuj z 90 % – zakończony?', await page.getByTestId('import-done').count())
      await o.shot(page, 'IM.25-90-import')
      await search.fill('castorama')
      await page.waitForTimeout(400)
      if ((await pcts.count()) >= 2) {
        await pcts.nth(1).fill('40')
        await pcts.nth(1).press('Tab')
      }
      await page.waitForTimeout(400)
      const rem = cg.getByTestId('import-group-remember')
      if (await rem.count()) await rem.check()
      o.log('IM.25 Castorama 60 + 40', await readable(page, '[data-testid="import-right"]'))
      await search.fill('')
    })

    // IM.27 – a theme decided with „zapamiętaj”, „Przyjmij pewne”, MULTIKINO (archived category)
    await step(o, page, 'IM.27', async () => {
      await search.fill('multikino')
      await page.waitForTimeout(400)
      o.log('IM.27 MULTIKINO', await readable(page, '[data-testid="import-right"]'))
      await search.fill('')
      // a theme decided by the user with „zapamiętaj”: „Przelewy wychodzące” → Prezenty i inne · prezenty; STUDIO URODY ANETA
      // left without a category on purpose (a decision without a category must not teach a rule)
      const t = theme(page, 'Przelewy wychodzące')
      o.log('IM.27 temat przed', await readable(page, '[data-testid="import-theme"][data-label="Przelewy wychodzące"]').catch(() => '(brak)'))
      await t.getByTestId('import-theme-category').selectOption({ label: 'Prezenty i inne · prezenty' }).catch(async (e: Error) => o.log('IM.27 temat – błąd', e.message.split(String.fromCharCode(10))[0]))
      await page.waitForTimeout(400)
      const rem = t.getByTestId('import-theme-remember')
      o.log('IM.27 zapamiętaj tematu', { count: await rem.count(), checked: (await rem.count()) ? await rem.isChecked() : null })
      if ((await rem.count()) && !(await rem.isChecked())) await rem.check()
      const done2 = page.getByTestId('import-section-done')
      if (!(await done2.locator('[data-testid="import-theme"]').count())) await done2.locator('button').first().click()
      await expandAll(page)
      const studio = page.locator('[data-testid="import-group"][data-label="STUDIO URODY ANETA"]').first()
      await studio.getByTestId('import-group-category').selectOption({ index: 0 }).catch(async (e: Error) => o.log('IM.27 STUDIO – błąd', e.message.split(String.fromCharCode(10))[0]))
      o.log('IM.27 temat po decyzji', await readable(page, '[data-testid="import-theme"][data-label="Przelewy wychodzące"]').catch(() => '(brak)'))
      const sure = page.getByTestId('import-accept-sure')
      o.log('IM.27 Przyjmij pewne', await sure.innerText().catch(() => '(brak)'))
      if (await sure.count()) await sure.click()
      await page.waitForTimeout(800)
      await expandAll(page)
      o.log('IM.27 kategoryzacja przed importem', await catText(page))
    })

    // ---------------- IM.29 / IM.28 – the import
    let pre = { counters: {} as Record<string, string>, ops: 0, backups: [] as string[], bez: '' }
    await step(o, page, 'IM.29', async () => {
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1500)
      pre.bez = await readable(page, 'main')
      o.log('IM.29 Meldunki przed', pre.bez)
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(800)
      pre.counters = await counters(page)
      pre.ops = (await txs(dataDir)).length
      pre.backups = backups(dataDir)
      o.log('IM.29 liczniki przed', pre)
      reading('im', 'IM.29', 'im-b przed importem L1', pre.counters)
      await o.shot(page, 'IM.29-przed')
      await page.getByTestId('import-run').click()
      await importDone(page, userData)
      await page.waitForTimeout(1000)
      o.log('IM.29 toast', await statuses(page))
      o.log('IM.29 panel wyniku', await readable(page, '[data-testid="import-done"]'))
      o.log('IM.29 nagłówek', (await readable(page, '[data-testid="page-import"]')).slice(0, 200))
      await o.shot(page, 'IM.29-wynik')
      const after = await txs(dataDir)
      o.log('IM.29 operacji po', { before: pre.ops, after: after.length, diff: after.length - pre.ops })
      o.log('IM.28 kopie przed importem', { before: pre.backups, after: backups(dataDir) })
    })

    // after the import: the operations of the points (from the folder)
    await step(o, page, 'po-imporcie', async () => {
      const all = await txs(dataDir)
      const news = all.filter((t) => !tx0.some((x) => x.id === t.id))
      o.log('nowe operacje (plik)', news.map(short))
      const merged = all.filter((t) => String(t.id).startsWith('01KAZ95') || String(t.id).startsWith('01KAZ94'))
      o.log('IM.14/15 wpisy ręczne po imporcie', merged.map((t) => `${String(t.id).slice(-2)} ${short(t)}`))
      o.log('IM.14 dni 27.10–01.11 mBank – operacje', all.filter((t) => t.accountId === MBANK && (t.date as string) >= '2026-10-27').map(short))
      o.log('IM.21 przelewy', all.filter((t) => t.kind === 'transfer' && (t.date as string) >= '2026-10-27').map((t) => `${short(t)} bothSides=${t.bothSides} counterDate=${t.counterDate ?? ''}`))
      const fi = readFi(dataDir)
      o.log('reguły po imporcie', fi.settings.import.rules.map((r: Record<string, unknown>) => `${r.match} ${r.mode} ${r.direction} ${r.kind} cat=${String(r.categoryId).slice(-3)} hits=${r.hits}${r.share ? ' share' : ''}`))
      o.log('ownNames', fi.settings.import.ownNames)
      o.log('domownicy', fi.settings.household.members.map((m: Record<string, unknown>) => `${m.name} inflow=${m.inflow} ${JSON.stringify(m.bankNames)}`))
      o.log('lastImport', fi.settings.import.lastImport)
      const tata = fi.settings.household.members.find((m: { name: string }) => m.name === 'Tata')
      o.log('IM.23 Tata po imporcie', tata)
    })
    await step(o, page, 'po-imporcie-ekrany', async () => {
      o.log('PO L1: Mostek', await bridge(page))
      await o.shot(page, 'IM.b-mostek-po-L1')
      o.log('PO L1: Radar', await radar(page))
      await o.shot(page, 'IM.b-radar-po-L1')
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1500)
      o.log('PO L1: Meldunki', await readable(page, 'main'))
      o.log('PO L1: salda (Import)', await balances(page))
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(2500)
      o.log('PO L1: Ustawienia → Import z banku', (await readable(page, 'main')).slice(0, 12000))
      await o.shot(page, 'IM.b-ustawienia-import')
      await page.getByTestId('settings-tab-household').click()
      await page.waitForTimeout(1000)
      o.log('PO L1: Ustawienia → Domownicy', await readable(page, 'main'))
    })

    // ---------------- IM.4 – L1-utf8 after the import of L1; IM.40 – L1 again, „Zapisz import (bez zmian)”
    await step(o, page, 'IM.4b', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, files['L1-utf8.csv']!)
      o.log('IM.4 L1-utf8 po imporcie L1 – podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.4 L1-utf8 po imporcie L1 – dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
      await o.shot(page, 'IM.4-utf8-po-imporcie')
      await page.getByTestId('import-close').click()
    })
    await step(o, page, 'IM.42-ten-sam-format', async () => {
      o.log('IM.42 usunięta operacja z importu listy (ten sam format)', await deleteOperation(page, '73,40'))
    })
    await step(o, page, 'IM.40', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, files['L1.csv']!)
      o.log('IM.40 L1 ponownie – podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.40 L1 ponownie – dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
      const btn = page.getByTestId('import-run')
      o.log('IM.40 przycisk', { text: await btn.innerText(), title: await btn.getAttribute('title') })
      await o.shot(page, 'IM.40-ponownie')
      const b0 = backups(dataDir)
      const n0 = (await txs(dataDir)).length
      const li0 = readFi(dataDir).settings.import.lastImport
      if (/bez zmian/.test(await btn.innerText())) {
        await btn.click()
        await importDone(page, userData)
        await page.waitForTimeout(800)
        o.log('IM.40 wynik zapisu bez zmian', await readable(page, '[data-testid="import-done"]'))
        o.log('IM.40 toast', await statuses(page))
      }
      o.log('IM.40 po zapisie bez zmian', { backups: [b0.length, backups(dataDir).length], ops: [n0, (await txs(dataDir)).length], lastImport: [li0, readFi(dataDir).settings.import.lastImport] })
      const z = (await txs(dataDir)).filter((t) => /Z5555/i.test(String((t.bank as Record<string, unknown> | null)?.description ?? '')))
      o.log('IM.40 dwa identyczne wiersze ZABKA Z5555 – operacje', z.map(short))
    })

    // ---------------- IM.16 / IM.17 / IM.42 – before L2: the pending ones changed by the user, one deleted
    await step(o, page, 'IM.16-prep', async () => {
      const pend = (await txs(dataDir)).filter((t) => (t.bank as Record<string, unknown> | null)?.pending)
      o.log('nierozliczone po L1', pend.map(short))
      // ZABKA pending – the name changed by the user (Operacje)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-period-menu').click()
      await page.getByTestId('operations-period-all').click()
      await page.getByTestId('operations-search').fill('23,50')
      await page.waitForTimeout(700)
      await page.getByTestId('operation-row').first().click()
      const cp = page.getByTestId('operation-counterparty')
      await cp.fill('Żabka osiedlowa')
      await cp.press('Enter')
      await page.waitForTimeout(800)
      // ORLEN pending 200 zł – a split receipt: 120 mine (paliwo), 80 Anna's
      await page.getByTestId('operations-search').fill('200,00')
      await page.waitForTimeout(700)
      const orlen = page.getByTestId('operation-row').filter({ hasText: /orlen/i }).first()
      await orlen.click()
      await page.waitForTimeout(500)
      await page.getByTestId('operation-split').click()
      await page.waitForTimeout(400)
      const amt = page.getByTestId('split-amount')
      for (const [i, v] of [[0, '120'], [1, '80']] as const) {
        await amt.nth(i).click()
        await amt.nth(i).fill(v)
        await amt.nth(i).press('Enter')
      }
      await page.getByTestId('split-category').nth(1).selectOption({ label: 'Auto · paliwo' })
      await page.getByTestId('split-financer').nth(1).selectOption('pay:01KDEFMEM00000000000000001')
      await page.waitForTimeout(1200)
      o.log('IM.16 edytor ORLEN po podziale', (await readable(page, '[data-testid="operation-splits"]').catch(() => '-')))
      await o.shot(page, 'IM.16-orlen-podzial')
      await page.getByTestId('operations-search').fill('')
      // APTEKA GEMINI pending – deleted (IM.42)
      o.log('IM.42 usunięta nierozliczona', await deleteOperation(page, 'gemini'))
    })
    await step(o, page, 'przed-L2', async () => {
      o.log('przed L2: nierozliczone', (await txs(dataDir)).filter((t) => (t.bank as Record<string, unknown> | null)?.pending).map(short))
      o.log('przed L2: Radar', await radar(page))
    })

    // ---------------- L2: IM.16, IM.17, IM.42, IM.9, IM.25, IM.26, IM.27, IM.40
    await step(o, page, 'L2', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, files['L2.csv']!)
      await expandAll(page)
      o.log('L2 plik', await readable(page, '[data-testid="import-file"]'))
      o.log('L2 podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('L2 liczniki', await counters(page))
      reading('im', 'IM.16', 'im-b2 L2 podgląd', await counters(page))
      o.log('L2 dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
      await o.shot(page, 'IM.16-L2-podglad')
      o.log('L2 kategoryzacja', await catText(page))
      for (const q of ['zegarmistrz', 'cukiernia', 'weterynarz', 'biedronka', 'kaufland', 'ślusarz', 'księgarnia', 'kurs', 'castorama', 'kolega', 'skarbowy', 'netia', 'orlen', 'pizeria']) {
        await search.fill(q)
        await page.waitForTimeout(450)
        await expandAll(page)
        o.log(`L2 szukaj „${q}”`, await readable(page, '[data-testid="import-groups"]').catch(() => '(brak)'))
      }
      await search.fill('')
      const v = page.getByTestId('import-vanished')
      o.log('IM.17 zaznaczenie zniknętej przed', await v.locator('input').isChecked().catch(() => null))
      if (await v.count()) await v.locator('input').first().check()
      const d = page.getByTestId('import-deleted')
      o.log('IM.42 zaznaczenie usuniętej przed', await d.locator('input').allInnerTexts().catch(() => []))
      for (let i = 0; i < (await d.count()); i++) if (/GEMINI/i.test(await d.nth(i).innerText())) await d.nth(i).locator('input').check()
      await page.waitForTimeout(500)
      o.log('L2 podgląd po zaznaczeniach', await readable(page, '[data-testid="import-summary"]'))
      o.log('L2 liczniki po zaznaczeniach', await counters(page))
      await page.getByTestId('import-run').click()
      await importDone(page, userData)
      await page.waitForTimeout(1000)
      o.log('L2 toast', await statuses(page))
      o.log('L2 wynik', await readable(page, '[data-testid="import-done"]'))
      await o.shot(page, 'IM.16-L2-wynik')
    })
    await step(o, page, 'po-L2', async () => {
      const all = await txs(dataDir)
      o.log('po L2: operacje 31.10–03.11 mBank', all.filter((t) => t.accountId === MBANK && (t.date as string) >= '2026-10-30').map(short))
      o.log('po L2: wciąż nierozliczone', all.filter((t) => (t.bank as Record<string, unknown> | null)?.pending).map(short))
      const fi = readFi(dataDir)
      o.log('po L2: reguły', fi.settings.import.rules.map((r: Record<string, unknown>) => `${r.match} ${r.mode} ${r.direction} ${r.kind} cat=${String(r.categoryId).slice(-3)} hits=${r.hits}${r.share ? ' share=' + JSON.stringify(r.share) : ''}`))
      o.log('po L2: Radar', await radar(page))
      await page.getByTestId('nav-sync').click()
      await page.waitForTimeout(2000)
      o.log('po L2: Synchronizacja', await readable(page, 'main'))
      await o.shot(page, 'IM.17-synchronizacja')
      // L1 a third time (IM.40)
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click().catch(() => undefined)
      await openFile(app, page, files['L1.csv']!)
      o.log('IM.40 L1 trzeci raz – podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.40 L1 trzeci raz – dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
      await page.getByTestId('import-close').click()
      // Import screen without a file: the duplicates panel (IM.15)
      await page.waitForTimeout(800)
      o.log('IM.15 Duplikaty operacji', await readable(page, '[data-testid="duplicates"]').catch(() => '(brak panelu)'))
      await o.shot(page, 'IM.15-duplikaty')
    })
    o.log('błędy okna (część 1)', run.errors)
    o.log('powiadomienia', (await recorded(app)).toasts)
  } finally {
    await app.close()
  }
})
