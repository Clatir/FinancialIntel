// Area IM – runs im-f1 (rules: IM.45, IM.46, IM.47) and im-f2 (the duplicates panel: IM.49, IM.50).
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { records } from '../e2e/files'
import { reading, start, useState } from './lab'
import { MBANK, Obs, PLIKI, expandAll, openFile, readFi, readable, short, statuses, step, tx, txs, writeFi, writeRecord } from './im-pomoc'

async function rulesTab(page: Page): Promise<void> {
  await page.keyboard.press('Control+,')
  await page.getByTestId('settings-tab-import').click()
  await page.waitForTimeout(1200)
}
const now = '2026-10-20T10:00:00.000Z'
const rule = (n: number, o: Record<string, unknown>) => ({ id: `01KAZ93${String(100 + n).padStart(19, '0')}`, mode: 'exact', direction: 'out', kind: 'expense', categoryId: '01KDEFCAT00000000000000902', refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 0, updatedAt: now, ...o })

test('im-f1: audyt reguł, zastosuj do historii, próg kwoty', async () => {
  const o = new Obs('im-f1')
  const { dataDir, ictjDir } = useState('rok', 'im-f1')
  const fi = readFi(dataDir)
  const extra: Record<string, unknown>[] = []
  for (let i = 1; i <= 136; i++) extra.push(rule(i, { match: `sklepaudytu${String(i).padStart(3, '0')}`, label: `SKLEP AUDYTU ${String(i).padStart(3, '0')}` }))
  extra.push(rule(137, { match: 'pozyczkastara', label: 'POŻYCZKA STARA', kind: 'loan', categoryId: null }))
  extra.push(rule(138, { match: 'urzadskarbowystary', label: 'URZĄD SKARBOWY STARY', kind: 'tax', categoryId: null }))
  extra.push(rule(139, { match: 'xtbstare', label: 'XTB STARE', kind: 'trading', categoryId: null }))
  extra.push(rule(140, { match: 'netia', label: 'NETIA SA', categoryId: '01KDEFCAT00000000000000702', hits: 14 }))
  fi.settings.import.rules.push(...extra)
  writeFi(dataDir, fi)
  // IM.46: five Bolt operations of the bank in another category (one with a split receipt)
  const all = await records(dataDir, 'transactions')
  const bolts = all.filter((t) => t.bank && /BOLT/i.test(String(t.counterparty))).slice(0, 5)
  bolts.forEach((t, i) =>
    writeRecord(dataDir, 'transactions', {
      ...t,
      updatedAt: now,
      categoryId: i === 0 ? null : '01KDEFCAT00000000000000305',
      ...(i === 0 ? { splits: [{ id: '01KAZ970000000000000000011', amount: Math.round((t.amount as number) / 2), categoryId: '01KDEFCAT00000000000000305', refundable: false, memberId: null, advance: false, note: '' }, { id: '01KAZ970000000000000000012', amount: (t.amount as number) - Math.round((t.amount as number) / 2), categoryId: '01KDEFCAT00000000000000601', refundable: false, memberId: null, advance: false, note: '' }] } : {})
    })
  )
  // IM.47: twelve Orlen operations of the bank made small snacks (8,50–39,90 zł, kawa i przekąski)
  const orlen = all.filter((t) => t.bank && /ORLEN/i.test(String(t.counterparty))).slice(0, 12)
  const small = [850, 1200, 1590, 1990, 2250, 2500, 2790, 2990, 3190, 3500, 3790, 3990]
  orlen.forEach((t, i) => writeRecord(dataDir, 'transactions', { ...t, amount: -small[i]!, categoryId: '01KDEFCAT00000000000000103', updatedAt: now }))
  o.log('stan', [`+140 reguł (136 bez trafień, 3 dawne: pożyczka, PIT-38, XTB; „netia” → internet)`, `Bolt: 5 operacji banku w „przejazdy” (jedna z podziałem paragonu): ${bolts.map((t) => `${t.date} ${t.amount}`).join(', ')}`, `Orlen: 12 operacji banku zmienione na 8,50–39,90 zł w „kawa i przekąski” (reszta 150–280 zł w „paliwo”)`])
  const run = await start('im-f1', { dataDir, ictjDir })
  const { app, page } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    // ---------------- IM.45
    await step(o, page, 'IM.45', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      const t0 = Date.now()
      const progress: string[] = []
      for (let i = 0; i < 20; i++) {
        const t = await readable(page, '[data-testid="import-rules"]').catch(() => '')
        const m = /sprawdzam[^\n]*/.exec(await readable(page, 'main'))
        if (m) progress.push(m[0])
        if (t && !m) break
        await page.waitForTimeout(250)
      }
      o.log('IM.45 postęp sprawdzania', { progress: [...new Set(progress)], ms: Date.now() - t0 })
      const main = await readable(page, 'main')
      o.log('IM.45 przyciski filtrów', main.split('\n').filter((l) => /wszystkie|niespójne|bez trafień|pokaż kolejne/.test(l)))
      o.log('IM.45 reguł na liście', await page.getByTestId('import-rule').count())
      const bolt = await page.getByTestId('import-rule').filter({ hasText: /^Bolt/ }).first().innerText().catch(() => '-')
      o.log('IM.45 reguła Bolt', bolt)
      const boltOps = (await txs(dataDir)).filter((t) => t.bank && /BOLT/i.test(String(t.counterparty))).length
      o.log('IM.45 operacji Bolta z banku w folderze', boltOps)
      await page.getByTestId('import-rules-show-none').click().catch(async () => page.getByRole('button', { name: /bez trafień/ }).click())
      await page.waitForTimeout(800)
      const none = await page.getByTestId('import-rule').allInnerTexts()
      o.log('IM.45 „bez trafień” – liczba / dawne pożyczka, PIT, XTB', { count: none.length, special: none.filter((x) => /POŻYCZKA|SKARBOWY|XTB/.test(x)) })
      o.log('IM.45 „pokaż kolejne”', await page.getByRole('button', { name: /pokaż kolejne/ }).allInnerTexts())
      await page.getByTestId('import-rules-show-all').click().catch(async () => page.getByRole('button', { name: 'wszystkie' }).click())
      await page.getByTestId('import-rules-search').fill('orlen')
      await page.waitForTimeout(600)
      o.log('IM.45 szukaj „orlen”', await page.getByTestId('import-rule').allInnerTexts())
      await page.getByTestId('import-rules-search').fill('netia')
      await page.waitForTimeout(600)
      const net = page.getByTestId('import-rule').first()
      await net.getByTestId('import-rule-edit').click()
      await page.waitForTimeout(400)
      const ed = page.getByTestId('import-rule-editor')
      o.log('IM.45 edytor reguły Netii', await readable(page, '[data-testid="import-rule-editor"]'))
      await ed.getByTestId('import-rule-edit-category').selectOption({ label: 'Subskrypcje i łączność · telefon' })
      const tags = ed.locator('[data-testid^="import-rule-tags"] input, input[data-testid^="import-rule-tags"]').first()
      await tags.fill('ulga-internet')
      await tags.press('Enter')
      await page.waitForTimeout(300)
      await ed.getByTestId('import-rule-save').click()
      await page.waitForTimeout(800)
      o.log('IM.45 Zapisz – toast', await statuses(page))
      o.log('IM.45 notka', (await readable(page, 'main')).split('\n').filter((l) => /Zmieniona reguła|Zastosuj do historii/.test(l)))
      o.log('IM.45 reguła po zapisie (fi.json)', readFi(dataDir).settings.import.rules.filter((r: { match: string }) => r.match === 'netia'))
      const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
      if (await undo.count()) {
        await undo.first().click()
        await page.waitForTimeout(800)
        o.log('IM.45 po Cofnij (fi.json)', readFi(dataDir).settings.import.rules.filter((r: { match: string }) => r.match === 'netia'))
      }
      await page.getByTestId('import-rule').first().getByTestId('import-rule-edit').click()
      await page.waitForTimeout(300)
      await page.getByTestId('import-rule-editor').getByTestId('import-rule-edit-category').selectOption({ label: 'Subskrypcje i łączność · internet' })
      const tags2 = page.getByTestId('import-rule-editor').locator('[data-testid^="import-rule-tags"] input, input[data-testid^="import-rule-tags"]').first()
      await tags2.fill('ulga-internet')
      await tags2.press('Enter')
      await page.getByTestId('import-rule-save').click()
      await page.waitForTimeout(800)
      o.log('IM.45 reguła po drugim zapisie (fi.json)', readFi(dataDir).settings.import.rules.filter((r: { match: string }) => r.match === 'netia'))
      o.log('IM.45 historia Netii bez zmian (operacje z banku, kategorie)', [...new Set((await txs(dataDir)).filter((t) => t.bank && /NETIA/i.test(String(t.counterparty))).map((t) => `${t.categoryId} ${JSON.stringify(t.tags ?? [])}`))])
      await o.shot(page, 'IM.45-reguly')
    })
    // ---------------- IM.46
    await step(o, page, 'IM.46', async () => {
      await page.getByTestId('import-rules-search').fill('bolt')
      await page.waitForTimeout(600)
      const r = page.getByTestId('import-rule').first()
      o.log('IM.46 reguła Bolt', await r.innerText())
      await r.getByTestId('import-rule-differ').click()
      await page.waitForTimeout(600)
      o.log('IM.46 lista „inaczej”', await readable(page, '[data-testid="import-rule-details"]'))
      await o.shot(page, 'IM.46-lista')
      // one of them changed in Operacje meanwhile
      const second = bolts[1]!
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-period-menu').click()
      await page.getByTestId('operations-period-all').click()
      await page.getByTestId('operations-search').fill(String((-(second.amount as number) / 100).toFixed(2)).replace('.', ','))
      await page.waitForTimeout(800)
      await page.getByTestId('operation-row').filter({ hasText: /BOLT/i }).first().click()
      await page.getByTestId('operation-category').selectOption({ label: 'Auto · parking i opłaty' })
      await page.waitForTimeout(800)
      await page.getByTestId('operations-search').fill('')
      await rulesTab(page)
      await page.getByTestId('import-rules-search').fill('bolt')
      await page.waitForTimeout(600)
      const r2 = page.getByTestId('import-rule').first()
      o.log('IM.46 reguła Bolt po zmianie w Operacjach', await r2.innerText())
      if (!(await page.getByTestId('import-rule-details').count())) await r2.getByTestId('import-rule-differ').click()
      await page.waitForTimeout(600)
      o.log('IM.46 lista po zmianie', await readable(page, '[data-testid="import-rule-details"]'))
      const apply = page.getByTestId('import-rule-apply')
      o.log('IM.46 przycisk', await apply.innerText())
      const before = (await txs(dataDir)).filter((t) => bolts.some((b) => b.id === t.id)).map(short)
      await apply.click()
      await page.waitForTimeout(1200)
      o.log('IM.46 toast', await statuses(page))
      const after = (await txs(dataDir)).filter((t) => bolts.some((b) => b.id === t.id)).map(short)
      o.log('IM.46 operacje przed / po zastosowaniu', { before, after })
      await o.shot(page, 'IM.46-zastosowano')
      const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
      if (await undo.count()) {
        await undo.last().click()
        await page.waitForTimeout(1200)
        o.log('IM.46 po Cofnij', (await txs(dataDir)).filter((t) => bolts.some((b) => b.id === t.id)).map(short))
      }
    })
    // ---------------- IM.47
    await step(o, page, 'IM.47', async () => {
      await rulesTab(page)
      await page.getByTestId('import-rules-search').fill('')
      const mixed = await readable(page, '[data-testid="import-mixed"]').catch(() => '(brak panelu)')
      o.log('IM.47 Marki z kilkoma kategoriami', mixed)
      const orl = page.getByTestId('import-mixed-brand').filter({ hasText: /orlen/i }).first()
      const lim = orl.getByTestId('import-mixed-limit')
      o.log('IM.47 przycisk progu', await lim.allInnerTexts())
      if (await lim.count()) {
        await lim.first().click()
        await page.waitForTimeout(800)
        o.log('IM.47 toast', await statuses(page))
        const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
        await undo.last().click()
        await page.waitForTimeout(800)
        o.log('IM.47 po Cofnij – reguły orlen', readFi(dataDir).settings.import.rules.filter((r: { match: string }) => /orlen/.test(r.match)))
        await lim.first().click()
        await page.waitForTimeout(800)
      }
      o.log('IM.47 reguły orlen', readFi(dataDir).settings.import.rules.filter((r: { match: string }) => /orlen/.test(r.match)))
      await page.getByTestId('import-rules-search').fill('orlen')
      await page.waitForTimeout(600)
      o.log('IM.47 lista reguł „orlen”', await page.getByTestId('import-rule').allInnerTexts())
      const r = page.getByTestId('import-rule').filter({ hasText: /do 40/ }).first()
      await r.getByTestId('import-rule-edit').click()
      await page.waitForTimeout(300)
      const l = page.getByTestId('import-rule-limit')
      await l.click()
      await l.fill('')
      await l.press('Tab')
      await page.waitForTimeout(300)
      o.log('IM.47 Zapisz bez progu – nieaktywny?', await page.getByTestId('import-rule-save').isDisabled())
      await page.keyboard.press('Escape')
      await rulesTab(page)
      await openFile(app, page, join(PLIKI, 'L2.csv'))
      await page.getByTestId('import-search').fill('orlen')
      await page.waitForTimeout(500)
      await expandAll(page, true)
      o.log('IM.47 L2 – Orlen', await readable(page, '[data-testid="import-groups"]'))
      await page.getByTestId('import-search').fill('netia')
      await page.waitForTimeout(500)
      await expandAll(page, true)
      o.log('IM.45 L2 – Netia', await readable(page, '[data-testid="import-groups"]'))
      await page.getByTestId('import-search').fill('')
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      const ops = (await txs(dataDir)).filter((t) => (t.date as string) >= '2026-11-02' && /ORLEN|NETIA/i.test(String(t.counterparty)))
      o.log('IM.47/45 operacje Orlen i Netia z L2', ops.map((t) => `${short(t)} tags=${JSON.stringify(t.tags ?? [])}`))
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})

test('im-f2: panel „Duplikaty operacji”, „to nie duplikat”', async () => {
  const o = new Obs('im-f2')
  const { dataDir, ictjDir } = useState('rok', 'im-f2')
  const all = await records(dataDir, 'transactions')
  const find = (date: string, amount: number, re: RegExp) => all.find((t) => t.date === date && t.amount === amount && t.bank && re.test(String(t.counterparty)))!
  const docked = all.find((t) => t.date === '2026-10-20' && t.amount === 300000 && t.bank)!
  const coveredIds = new Set(all.flatMap((t) => (t.covers as string[]) ?? []))
  const covered = all.find((t) => coveredIds.has(String(t.id)) && t.bank && t.accountId === MBANK)!
  const add = (n: number, o2: Record<string, unknown>) => writeRecord(dataDir, 'transactions', tx(`01KAZ99${String(100 + n).padStart(19, '0')}`, { updatedAt: '2026-10-28T10:00:00.000Z', createdAt: '2026-10-28T10:00:00.000Z', ...o2 }))
  add(1, { date: '2026-10-25', time: '18:00', amount: -5586, counterparty: 'Biedronka', categoryId: '01KDEFCAT00000000000000101', note: 'notatka do zachowania' })
  add(2, { date: '2026-10-25', time: '19:00', amount: -17257, counterparty: 'Lidl', categoryId: '01KDEFCAT00000000000000204', note: '' })
  add(3, { date: '2026-10-22', time: '12:00', amount: -25000, counterparty: 'Allegro zakupy', categoryId: '01KDEFCAT00000000000000902', note: '' })
  add(4, { date: covered.date, time: '10:00', amount: covered.amount, counterparty: String(covered.counterparty), categoryId: covered.categoryId, note: 'kopia zakupu pokrytego wpłatą' })
  add(5, { date: '2026-10-20', time: '09:00', amount: 300000, kind: 'trading', counterparty: 'XTB S.A.', categoryId: null, note: 'kopia wypłaty zadokowanej' })
  // a duplicate written by a newer version
  const newer = tx('01KAZ990000000000000000106', { date: '2026-10-24', time: '08:00', amount: -3497, counterparty: 'Żabka', categoryId: '01KDEFCAT00000000000000101', note: '' })
  writeRecord(dataDir, 'transactions', newer)
  const { readFileSync, writeFileSync } = await import('node:fs')
  const p = join(dataDir, 'transactions', '2026', '2026-10-24_01KAZ990000000000000000106.json')
  writeFileSync(p, readFileSync(p, 'utf8').replace('"schemaVersion": 1', '"schemaVersion": 99'))
  o.log('stan', [`kopie wpisane ręcznie: Biedronka −55,86 25.10 (ta sama kategoria, notatka, godzina), Lidl −172,57 25.10 (inna kategoria), Allegro zakupy −250,00 22.10 (bank −246,22), ${covered.counterparty} ${covered.amount} ${covered.date} (pokryta wpłatą domownika), XTB S.A. +3 000,00 20.10 (bank zadokowana), Żabka −34,97 24.10 (wpis nowszej wersji: schemaVersion 99)`, `zadokowana: ${docked?.id}`])
  let run = await start('im-f2', { dataDir, ictjDir })
  try {
    let page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    const bal = async () => {
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(800)
      return (/mBank\noperacje: ([^\n]+)/.exec(await readable(page, '[data-testid="balance-check"]')) ?? [])[1]
    }
    await step(o, page, 'IM.49', async () => {
      const s0 = await bal()
      o.log('IM.49 panel', await readable(page, '[data-testid="duplicates"]').catch(() => '(brak panelu)'))
      o.log('IM.49 grupy (atrybuty)', await page.getByTestId('duplicate-group').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-kind')} conflict=${e.getAttribute('data-conflict')} ask=${e.getAttribute('data-ask')} picked=${(e.querySelector('input') as HTMLInputElement).checked} disabled=${(e.querySelector('input') as HTMLInputElement).disabled}`)))
      await o.shot(page, 'IM.49-panel')
      const btn = page.getByTestId('duplicates-merge')
      o.log('IM.49 przycisk', await btn.innerText())
      const before = await txs(dataDir)
      await btn.click()
      await page.waitForTimeout(1500)
      o.log('IM.49 toast', await statuses(page))
      const after = await txs(dataDir)
      o.log('IM.49 usunięte', before.filter((t) => !after.some((x) => x.id === t.id)).map(short))
      o.log('IM.49 zachowane (po scaleniu)', after.filter((t) => ['2026-10-25', '2026-10-20', covered.date].includes(t.date as string) && t.accountId === MBANK && [-5586, 300000, covered.amount].includes(t.amount as number)).map((t) => `${short(t)} id=${String(t.id).slice(-6)}`))
      o.log('IM.49 wpłaty wskazujące zakup', after.filter((t) => ((t.covers as string[]) ?? []).length && ((t.covers as string[]) ?? []).some((c) => c === covered.id || c === '01KAZ990000000000000000104')).map((t) => `${short(t)} covers=${JSON.stringify(t.covers)}`))
      const dk = await records(dataDir, 'dockings')
      o.log('IM.49 dokowanie wypłaty 20.10', dk.filter((d) => d.date === '2026-10-20' || d.transactionId === docked.id || d.transactionId === '01KAZ990000000000000000105').map((d) => JSON.stringify(d)))
      const s1 = await bal()
      const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
      let s2: string | undefined
      if (await undo.count()) {
        await undo.last().click()
        await page.waitForTimeout(1500)
        o.log('IM.49 po Cofnij – operacji', [before.length, (await txs(dataDir)).length])
        s2 = await bal()
      }
      o.log('IM.49 saldo mBank: przed / po scaleniu / po Cofnij', [s0, s1, s2])
      reading('im', 'IM.49', 'rok + kopie ręczne – saldo mBank', { przed: s0 ?? null, po: s1 ?? null, cofnij: s2 ?? null })
    })
    await step(o, page, 'IM.50', async () => {
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(800)
      const g = page.getByTestId('duplicate-group').first()
      o.log('IM.50 para', await g.innerText())
      await g.getByTestId('duplicate-dismiss').click()
      await page.waitForTimeout(800)
      o.log('IM.50 toast', await statuses(page))
      const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
      await undo.last().click()
      await page.waitForTimeout(800)
      o.log('IM.50 po Cofnij – grup', await page.getByTestId('duplicate-group').count())
      await page.getByTestId('duplicate-group').first().getByTestId('duplicate-dismiss').click()
      await page.waitForTimeout(800)
      o.log('IM.50 notDuplicates', readFi(dataDir).settings.import.notDuplicates)
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1000)
      o.log('IM.50 Meldunki – duplikaty', (await readable(page, 'main')).split('\n').filter((l) => /duplikat/i.test(l)))
    })
    await run.app.close()
    run = await start('im-f2', { dataDir, ictjDir, fresh: false })
    page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'IM.50-restart', async () => {
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1200)
      o.log('IM.50 po restarcie – panel', await readable(page, '[data-testid="duplicates"]').catch(() => '(brak panelu)'))
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1200)
      const m = await readable(page, 'main')
      o.log('IM.50 Ustawienia – pary', m.split('\n').filter((l) => /to nie duplikat|pokazuj znowu/i.test(l)))
      await page.getByTestId('duplicates-undismiss').click()
      await page.waitForTimeout(800)
      o.log('IM.50 pokazuj znowu – toast', await statuses(page))
    })
    o.log('błędy okna', run.errors)
  } finally {
    await run.app.close()
  }
})
