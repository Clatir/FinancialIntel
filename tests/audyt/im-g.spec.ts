// Area IM / SA – runs im-g*: two computers on copies of one folder, synchronized by copying files (as OneDrive would,
// never at once): IM.51 (the same rows imported on both), IM.32 (undo before the sync is complete), SA.8 (corrections
// on both), IM.44 (changes while a file is open; a folder read only).
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { records } from '../e2e/files'
import { LAB, reading, start, useState } from './lab'
import { MBANK, Obs, PLIKI, counters, expandAll, openFile, readFi, readable, short, statuses, step, txs, writeRecord } from './im-pomoc'

/** Files of `from` that `to` does not have or has older (by size+content): copied as the cloud would. */
function sync(from: string, to: string, filter: (rel: string) => boolean = () => true): string[] {
  const done: string[] = []
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      const rel = relative(from, p).replace(/\\/g, '/')
      if (rel.startsWith('backups') || rel.startsWith('.presence')) continue
      if (statSync(p).isDirectory()) walk(p)
      else if (filter(rel)) {
        const t = join(to, rel)
        if (existsSync(t) && readFileSync(t).equals(readFileSync(p))) continue
        cpSync(p, t)
        done.push(rel)
      }
    }
  }
  walk(from)
  return done
}

async function bal(page: Page): Promise<string | undefined> {
  await page.keyboard.press('Control+3')
  await page.waitForTimeout(800)
  return (/mBank\noperacje: ([^\n]+)/.exec(await readable(page, '[data-testid="balance-check"]').catch(() => '')) ?? [])[1]
}

async function importL1(app: Parameters<typeof openFile>[0], page: Page): Promise<string> {
  await openFile(app, page, join(PLIKI, 'L1.csv'))
  await page.getByTestId('import-run').click()
  await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(800)
  return readable(page, '[data-testid="import-done"]')
}

test('im-g51: ten sam wiersz banku z dwóch komputerów', async () => {
  const o = new Obs('im-g51')
  const A = useState('rok', 'im-g51')
  const Bdir = join(LAB, 'przebiegi', 'im-g51', 'dane-B')
  cpSync(A.dataDir, Bdir, { recursive: true })
  o.log('stan', 'kopia „rok” na komputer A (dane) i B (dane-B); synchronizacja = kopiowanie plików B → A po kolei')
  // B imports L1
  let run = await start('im-g51-B', { dataDir: Bdir, ictjDir: A.ictjDir, machine: 'KOMPUTER-B' })
  try {
    await expect(run.page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    o.log('B: import L1', await importL1(run.app, run.page))
  } finally {
    await run.app.close()
  }
  // A imports L1 too, writes a note and docks the XTB withdrawal
  run = await start('im-g51', { dataDir: A.dataDir, ictjDir: A.ictjDir, machine: 'KOMPUTER-A' })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    o.log('A: import L1', await importL1(run.app, page))
    o.log('A: saldo po jednym imporcie', await bal(page))
    await step(o, page, 'A-notatka', async () => {
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-period-menu').click()
      await page.getByTestId('operations-period-all').click()
      await page.getByTestId('operations-search').fill('kaufland')
      await page.waitForTimeout(700)
      await page.getByTestId('operation-row').first().click()
      const note = page.getByTestId('operation-note')
      await note.fill('notatka z komputera A')
      await note.press('Control+Enter')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-search').fill('')
    })
    await step(o, page, 'A-dokowanie', async () => {
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(2000)
      const rows = page.locator('[data-testid="docking-row"]')
      o.log('A: wiersze dokowania', await rows.allInnerTexts())
      await rows.filter({ hasText: '3 200,00' }).first().click()
      await page.waitForTimeout(800)
      await page.getByTestId('docking-confirm').click()
      await page.waitForTimeout(1500)
      o.log('A: dokowania', (await records(A.dataDir, 'dockings')).filter((d) => (d.date as string) >= '2026-10-27').map((d) => JSON.stringify(d)))
    })
  } finally {
    await run.app.close()
  }
  o.log('synchronizacja B → A (pliki)', sync(Bdir, A.dataDir, (r) => r.startsWith('transactions/') || r.startsWith('imports/')).length)
  run = await start('im-g51', { dataDir: A.dataDir, ictjDir: A.ictjDir, machine: 'KOMPUTER-A', fresh: false })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(2000)
    await step(o, page, 'IM.51', async () => {
      const s0 = await bal(page)
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1500)
      o.log('IM.51 Meldunki – duplikaty', (await readable(page, 'main')).split('\n').filter((l) => /duplikat/i.test(l)))
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1000)
      const panel = await readable(page, '[data-testid="duplicates"]').catch(() => '(brak panelu)')
      o.log('IM.51 panel (początek)', panel.slice(0, 3000))
      o.log('IM.51 grupy', await page.getByTestId('duplicate-group').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-kind')} picked=${(e.querySelector('input') as HTMLInputElement).checked}`)))
      const kauf = page.getByTestId('duplicate-group').filter({ hasText: /KAUFLAND/i }).first()
      o.log('IM.51 grupa Kauflandu', await kauf.innerText().catch(() => '-'))
      const xtb = page.getByTestId('duplicate-group').filter({ hasText: /3 200,00/ }).first()
      o.log('IM.51 grupa wypłaty XTB', await xtb.innerText().catch(() => '-'))
      await o.shot(page, 'IM.51-panel')
      await page.getByTestId('duplicates-merge').click()
      await page.waitForTimeout(2500)
      o.log('IM.51 toast', await statuses(page))
      const s1 = await bal(page)
      const all = await txs(A.dataDir)
      o.log('IM.51 Kaufland i XTB po scaleniu', all.filter((t) => /KAUFLAND|XTB S\.A\./i.test(String(t.counterparty)) && (t.date as string) >= '2026-11-01').map((t) => `${short(t)} id=${String(t.id).slice(-6)}`))
      const dk = await records(A.dataDir, 'dockings')
      o.log('IM.51 dokowanie wskazuje istniejącą operację', dk.filter((d) => (d.date as string) >= '2026-10-27').map((d) => `${d.transactionId} → ${all.some((t) => t.id === d.transactionId) ? 'jest' : 'BRAK'}`))
      const dupRows = new Map<string, number>()
      for (const t of all.filter((x) => x.bank && x.accountId === MBANK && (x.date as string) >= '2026-10-19')) {
        const k = String((t.bank as Record<string, unknown>).key)
        dupRows.set(k, (dupRows.get(k) ?? 0) + 1)
      }
      o.log('IM.51 wiersze banku ciągle podwójne', [...dupRows.entries()].filter(([, n]) => n > 1).length)
      o.log('IM.51 saldo mBank: po synchronizacji / po scaleniu', [s0, s1])
      reading('im', 'IM.51', 'rok, L1 na A i B, synchronizacja – saldo mBank', { poSynchronizacji: s0 ?? null, poScaleniu: s1 ?? null })
    })
    o.log('błędy okna', run.errors)
  } finally {
    await run.app.close()
  }
})

test('im-g32: cofnięcie importu przed pełną synchronizacją', async () => {
  const o = new Obs('im-g32')
  const A = useState('rok', 'im-g32')
  const Bdir = join(LAB, 'przebiegi', 'im-g32', 'dane-B')
  cpSync(A.dataDir, Bdir, { recursive: true })
  const before = new Set((await records(Bdir, 'transactions')).map((t) => String(t.id)))
  let run = await start('im-g32-B', { dataDir: Bdir, ictjDir: A.ictjDir, machine: 'KOMPUTER-B' })
  try {
    await expect(run.page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    o.log('B: import L1', await importL1(run.app, run.page))
  } finally {
    await run.app.close()
  }
  // A gets the import's record and fi.json, and only half of the new operations
  const newOps = (await records(Bdir, 'transactions')).filter((t) => !before.has(String(t.id)))
  const half = new Set(newOps.slice(0, Math.floor(newOps.length / 2)).map((t) => String(t.id)))
  const copied = sync(Bdir, A.dataDir, (r) => r.startsWith('imports/') || r === 'fi.json' || (r.startsWith('transactions/') && [...half].some((id) => r.includes(id))))
  o.log('stan', `B zaimportował L1 (${newOps.length} nowych); na A dotarł rekord importu, fi.json i ${half.size} z nich (skopiowano ${copied.length} plików)`)
  run = await start('im-g32', { dataDir: A.dataDir, ictjDir: A.ictjDir, machine: 'KOMPUTER-A' })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'IM.32', async () => {
      const n0 = (await txs(A.dataDir)).length
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1500)
      o.log('IM.32 Ostatnie importy', await readable(page, '[data-testid="recent-imports"]'))
      await page.getByTestId('recent-import-undo').first().click()
      await page.waitForTimeout(800)
      o.log('IM.32 okno cofnięcia', await readable(page, '[data-testid="import-undo-dialog"]').catch(async () => (await page.getByRole('dialog').allInnerTexts()).join('\n')))
      await o.shot(page, 'IM.32-okno')
      await page.getByTestId('import-undo-confirm').click()
      await page.waitForTimeout(1500)
      o.log('IM.32 po „Cofnij import” – komunikaty / okno', { statuses: await statuses(page), dialog: (await page.getByRole('dialog').allInnerTexts()).join('\n') })
      await o.shot(page, 'IM.32-ostrzezenie')
      o.log('IM.32 operacji przed / po pierwszym kliknięciu', [n0, (await txs(A.dataDir)).length])
      const anyway = page.getByRole('button', { name: /mimo to/ })
      if (await anyway.count()) {
        await anyway.first().click()
        await page.waitForTimeout(2000)
        o.log('IM.32 po „Cofnij mimo to” – komunikaty', await statuses(page))
        o.log('IM.32 operacji po', (await txs(A.dataDir)).length)
      }
    })
    o.log('błędy okna', run.errors)
  } finally {
    await run.app.close()
  }
})

test('sa-8: potwierdzenie salda na dwóch komputerach', async () => {
  const o = new Obs('sa-8')
  const A = useState('rok', 'sa-8')
  const Bdir = join(LAB, 'przebiegi', 'sa-8', 'dane-B')
  cpSync(A.dataDir, Bdir, { recursive: true })
  const confirmLower = async (page: Page) => {
    await page.keyboard.press('Control+3')
    await page.waitForTimeout(800)
    const r = page.locator('[data-testid="balance-row"][data-name="mBank"]')
    const v = Number(((/operacje: ([^\n]+) zł/.exec(await r.innerText()) ?? [])[1] ?? '0').replace(/\s/g, '').replace('−', '-').replace(',', '.'))
    const lower = (v - 25).toFixed(2).replace('.', ',')
    await r.getByTestId('balance-input').click()
    await r.getByTestId('balance-input').fill(lower)
    await r.getByTestId('balance-input').press('Enter')
    await r.getByTestId('balance-confirm').click()
    await page.waitForTimeout(600)
    await r.getByTestId('confirm-ask-yes').click()
    await page.waitForTimeout(1000)
    return statuses(page)
  }
  for (const [name, dir, machine] of [
    ['sa-8-B', Bdir, 'KOMPUTER-B'],
    ['sa-8', A.dataDir, 'KOMPUTER-A']
  ] as const) {
    const run = await start(name, { dataDir: dir, ictjDir: A.ictjDir, machine })
    try {
      await expect(run.page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
      o.log(`${machine}: korekta −25,00`, await confirmLower(run.page))
    } finally {
      await run.app.close()
    }
  }
  o.log('synchronizacja B → A', sync(Bdir, A.dataDir, (r) => r.startsWith('transactions/') || r.startsWith('balances/')))
  let run = await start('sa-8', { dataDir: A.dataDir, ictjDir: A.ictjDir, machine: 'KOMPUTER-A', fresh: false })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(2000)
    await step(o, page, 'SA.8-1', async () => {
      const corr = (await txs(A.dataDir)).filter((t) => t.kind === 'correction')
      o.log('SA.8 korekty po synchronizacji', corr.map((t) => `${short(t)} id=${t.id} by=${t.updatedBy}`))
      o.log('SA.8 saldo mBank', await bal(page))
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1200)
      o.log('SA.8 Meldunki', (await readable(page, 'main')).split('\n').filter((l) => /korekt|powtórz/i.test(l)))
    })
  } finally {
    await run.app.close()
  }
  // the second variant: two real corrections of one amount on two days (B's copied as of yesterday)
  const corr = (await records(A.dataDir, 'transactions')).filter((t) => t.kind === 'correction')
  if (corr.length) {
    const c = corr[0]!
    writeRecord(A.dataDir, 'transactions', { ...c, id: '01KAZ990000000000000000201', date: '2026-11-02', updatedBy: 'KOMPUTER-B', createdAt: '2026-11-02T18:00:00.000Z', updatedAt: '2026-11-02T18:00:00.000Z' })
  }
  run = await start('sa-8', { dataDir: A.dataDir, ictjDir: A.ictjDir, machine: 'KOMPUTER-A', fresh: false })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(2000)
    await step(o, page, 'SA.8-2', async () => {
      o.log('SA.8 (wariant 2) korekty', (await txs(A.dataDir)).filter((t) => t.kind === 'correction').map((t) => `${short(t)} by=${t.updatedBy}`))
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1500)
      const m = await readable(page, 'main')
      o.log('SA.8 (wariant 2) Meldunki', m.split('\n').filter((l) => /korekt|powtórz/i.test(l)))
      await o.shot(page, 'SA.8-meldunek')
      const not = page.getByRole('button', { name: /to nie powtórzenie/ })
      if (await not.count()) {
        await not.first().click()
        await page.waitForTimeout(1000)
        o.log('SA.8 po „to nie powtórzenie”', (await readable(page, 'main')).split('\n').filter((l) => /korekt|powtórz/i.test(l)))
      }
      o.log('SA.8 saldo mBank (wariant 2)', await bal(page))
    })
  } finally {
    await run.app.close()
  }
  run = await start('sa-8', { dataDir: A.dataDir, ictjDir: A.ictjDir, machine: 'KOMPUTER-A', fresh: false })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(1500)
    await page.keyboard.press('Control+Shift+M')
    await page.waitForTimeout(1500)
    o.log('SA.8 po restarcie – Meldunki', (await readable(page, 'main')).split('\n').filter((l) => /korekt|powtórz/i.test(l)))
  } finally {
    await run.app.close()
  }
})

test('im-g44: zmiany w trakcie otwartego pliku, folder tylko do odczytu', async () => {
  const o = new Obs('im-g44')
  const A = useState('rok', 'im-g44')
  let run = await start('im-g44', { dataDir: A.dataDir, ictjDir: A.ictjDir, machine: 'KOMPUTER-A' })
  try {
    const page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'IM.44-ustawienia', async () => {
      await openFile(run.app, page, join(PLIKI, 'L1.csv'))
      await page.locator('[data-testid="import-theme"][data-label="Zakupy bez rozpoznania"]').getByTestId('import-theme-category').selectOption({ label: 'Prezenty i inne · inne' })
      await page.waitForTimeout(300)
      o.log('IM.44 przed: liczniki / Jan Nowak', [await counters(page), await page.locator('[data-testid="import-group"][data-label="JAN NOWAK"]').allInnerTexts()])
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-household').click()
      await page.waitForTimeout(800)
      await page.getByTestId('member-add').click()
      await page.waitForTimeout(500)
      const names = page.getByTestId('member-name')
      const n = await names.count()
      await names.nth(n - 1).fill('Janek')
      await names.nth(n - 1).press('Enter')
      const bank = page.getByTestId('member-bank-input').last()
      await bank.fill('JAN NOWAK')
      await page.getByTestId('member-bank-add').last().click()
      await page.waitForTimeout(800)
      o.log('IM.44 domownicy (fi.json)', readFi(A.dataDir).settings.household.members.map((m: Record<string, unknown>) => `${m.name} ${JSON.stringify(m.bankNames)}`))
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(800)
      await page.getByTestId('keyword-input').fill('zegarmistrz')
      await page.getByTestId('keyword-category').selectOption({ label: 'Osobiste · ubrania' })
      await page.getByTestId('keyword-add').click()
      await page.waitForTimeout(800)
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1500)
      await expandAll(page)
      o.log('IM.44 po powrocie: plik', await page.getByTestId('import-file').innerText().catch(() => '(brak)'))
      o.log('IM.44 po powrocie: Jan Nowak / Zegarmistrz', await page.locator('[data-testid="import-group"]').filter({ hasText: /JAN NOWAK|ZEGARMISTRZ/ }).allInnerTexts())
      o.log('IM.44 po powrocie: temat „Zakupy bez rozpoznania”', await page.locator('[data-testid="import-theme"]').filter({ hasText: 'AUTOMATSPEC' }).first().innerText().catch(() => '(brak)'))
    })
    await step(o, page, 'IM.44-drugi-komputer', async () => {
      // an operation of the file's period changed by the other computer (written into the folder) just before „Importuj”
      const all = await records(A.dataDir, 'transactions')
      const t = all.find((x) => x.date === '2026-10-25' && x.amount === -5586)!
      writeRecord(A.dataDir, 'transactions', { ...t, categoryId: '01KDEFCAT00000000000000102', updatedBy: 'KOMPUTER-B', updatedAt: new Date().toISOString() })
      await page.waitForTimeout(300)
      await page.getByTestId('import-run').click()
      const said: string[] = []
      for (let i = 0; i < 12; i++) {
        said.push(...(await statuses(page)))
        if (await page.getByTestId('import-done').count()) break
        await page.waitForTimeout(250)
      }
      o.log('IM.44 Importuj po zmianie z drugiego komputera – komunikaty', [...new Set(said)])
      o.log('IM.44 zapisano?', await page.getByTestId('import-done').count())
      await o.shot(page, 'IM.44-drugi-komputer')
      if (!(await page.getByTestId('import-done').count())) {
        await page.getByTestId('import-run').click()
        // decisions clicked while it saves
        await page.locator('[data-testid="import-theme-category"]').first().selectOption({ index: 2 }).catch((e: Error) => said.push(`klik w trakcie: ${e.message.split(String.fromCharCode(10))[0]}`))
        o.log('IM.44 w trakcie zapisu – przycisk', await page.getByTestId('import-run').innerText().catch(() => '-'))
        await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
        o.log('IM.44 drugi Importuj – wynik', await readable(page, '[data-testid="import-done"]'))
      }
    })
    o.log('błędy okna', run.errors)
  } finally {
    await run.app.close()
  }
  // a folder read only: settings of a newer version
  const fiPath = join(A.dataDir, 'fi.json')
  writeFileSync(fiPath, readFileSync(fiPath, 'utf8').replace(/"schemaVersion": \d+/, '"schemaVersion": 99'))
  run = await start('im-g44', { dataDir: A.dataDir, ictjDir: A.ictjDir, machine: 'KOMPUTER-A', fresh: false })
  try {
    const page = run.page
    await page.waitForTimeout(5000)
    o.log('IM.44 tylko do odczytu – ekran', (await readable(page, 'body')).slice(0, 800))
    await step(o, page, 'IM.44-ro', async () => {
      const n0 = (await txs(A.dataDir)).length
      await openFile(run.app, page, join(PLIKI, 'L2.csv'))
      o.log('IM.44 tylko do odczytu – przycisk', await page.getByTestId('import-run').innerText())
      await o.shot(page, 'IM.44-tylko-do-odczytu')
      await page.getByTestId('import-run').click({ force: true }).catch(() => undefined)
      await page.waitForTimeout(1500)
      o.log('IM.44 tylko do odczytu – operacji przed / po', [n0, (await txs(A.dataDir)).length])
    })
  } finally {
    await run.app.close()
  }
})
