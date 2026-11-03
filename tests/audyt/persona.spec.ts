/**
 * The persona's states (docs/audyt/plan.md, AU-2): C:\FI-audyt\stany\rok (and ictj-rok), the bank's files in
 * C:\FI-audyt\pliki. The history goes through the released app's own import (its decisions group by group, as a user
 * makes them); the user's later decisions are written onto the operations it made; a second start lets the app settle
 * (the game's frozen days, the ICTTJ goals). Run: `npx playwright test -c playwright.audyt.config.ts persona`.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { ulid } from 'ulid'
import { addDays, warsawNow } from '../../src/shared/calc/dates'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { importDone } from '../e2e/app'
import { records } from '../e2e/files'
import { seedFolder } from '../e2e/seed'
import { LAB, answerDialogs, note, recorded, shot, start, text } from './lab'
import { ANNA, KASIA, MBANK, buildPersona, cp1250, fid, historiaCsv, listaCsv, type BankEvent, type GroupDecision, type ManualOp } from './persona'

const MACHINE = 'LAPTOP-KAPITANA'

function put(root: string, rel: string, data: unknown): void {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

function writeRecord(dir: string, collection: Collection, raw: Record<string, unknown>): void {
  const rec = SCHEMAS[collection].parse(raw) as unknown as Record<string, unknown>
  const file = join(dir, recordRelPath(collection, rec as never))
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, serializeRecord(collection, rec as never))
}

/** One group decision of the import: every group of the token's search and the money's direction gets it. */
async function decide(page: Page, d: GroupDecision, log: string[]): Promise<void> {
  const search = page.getByTestId('import-search')
  await search.fill(d.token)
  await page.waitForTimeout(300)
  const groups = page.locator(`[data-testid="import-group"][data-group*="|${d.dir}|"]`)
  if (!(await groups.count())) log.push(`${d.token}/${d.dir}: brak grup`)
  // A group of a brand and direction that refused the decision is not tried again (its key without the proposal).
  const skip = new Set<string>()
  for (let round = 0; round < 40; round++) {
    const n = await groups.count()
    let target: { i: number; key: string; field: 'kind' | 'category' } | null = null
    for (let i = 0; i < n && !target; i++) {
      const g = groups.nth(i)
      const key = (await g.getAttribute('data-group'))?.split('|').slice(0, 2).join('|') ?? String(i)
      if (skip.has(key)) continue
      const kind = g.getByTestId('import-group-kind')
      if ((await kind.count()) && (await kind.inputValue()) !== d.option) target = { i, key, field: 'kind' }
      else if (d.categoryId) {
        const category = g.getByTestId('import-group-category')
        if ((await category.count()) && (await category.inputValue()) !== d.categoryId) target = { i, key, field: 'category' }
      }
    }
    if (!target) break
    const g = groups.nth(target.i)
    try {
      if (target.field === 'kind') await g.getByTestId('import-group-kind').selectOption(d.option, { timeout: 3000 })
      else await g.getByTestId('import-group-category').selectOption(d.categoryId!, { timeout: 3000 })
    } catch (e) {
      skip.add(target.key)
      log.push(`${d.token}/${d.dir} [${target.key}]: ${target.field} – ${(e as Error).message.split('\n')[0]}`)
    }
    await page.waitForTimeout(150)
  }
  await search.fill('')
}

const toTx = (m: ManualOp, id: string): Record<string, unknown> => {
  const at = `${m.date}T${m.time ?? '20:00'}:00.000Z`
  return {
    schemaVersion: 1,
    id,
    createdAt: at,
    updatedAt: at,
    updatedBy: MACHINE,
    date: m.date,
    time: m.time,
    accountId: m.accountId,
    kind: m.kind,
    amount: m.amount,
    categoryId: m.categoryId,
    counterparty: m.counterparty,
    note: m.note ?? '',
    impulse: m.impulse ?? null,
    logNote: m.logNote ?? '',
    ...(m.tags ? { tags: m.tags } : {}),
    memberId: m.memberId ?? null,
    refundable: m.refundable ?? false,
    counterAccountId: m.counterAccountId ?? null,
    ...(m.bothSides ? { bothSides: true } : {})
  }
}

test('persona: stan „rok” – 14 miesięcy przez import wydanej aplikacji', async () => {
  test.setTimeout(40 * 60_000)
  const anchor = warsawNow().date
  const P = buildPersona(anchor)
  const dir = join(LAB, 'stany', 'rok')
  const ictjDir = join(LAB, 'stany', 'ictj-rok')
  const files = join(LAB, 'pliki')
  for (const d of [dir, ictjDir]) rmSync(d, { recursive: true, force: true })
  mkdirSync(files, { recursive: true })
  const log: string[] = [`kotwica ${anchor}, start ${P.start}, historia do ${P.historyEnd}`]

  // ---- ICTTJ's folder: only what FI reads (payouts, forecasts) and its journal.json
  put(ictjDir, 'journal.json', { schemaVersion: 1, settings: {} })
  for (const x of P.ictj)
    put(ictjDir, `payouts/${x.date.slice(0, 4)}/${x.date}_${x.id}.json`, {
      schemaVersion: 1,
      id: x.id,
      createdAt: `${x.date}T19:00:00.000Z`,
      updatedAt: `${x.date}T19:00:00.000Z`,
      kind: x.kind,
      date: x.date,
      amount: x.amount,
      pool: x.pool,
      note: '',
      categoryId: null,
      goal: null
    })
  const firstMonth = P.start.slice(0, 7)
  put(ictjDir, `forecasts/${fid(71, 1)}.json`, {
    schemaVersion: 1,
    id: fid(71, 1),
    createdAt: `${P.start}T10:00:00.000Z`,
    updatedAt: `${addDays(anchor, -20)}T10:00:00.000Z`,
    name: 'Plan główny',
    currency: 'PLN',
    firstMonth,
    goals: [
      { id: fid(72, 1), name: 'Wkład własny – mieszkanie', month: 30, amount: 40000, enabled: true, flexible: false },
      { id: fid(72, 2), name: 'Nowe stanowisko tradingowe', month: 16, amount: 3000, enabled: true, flexible: true }
    ]
  })
  put(ictjDir, `forecasts/${fid(71, 2)}.json`, {
    schemaVersion: 1,
    id: fid(71, 2),
    createdAt: `${P.start}T10:00:00.000Z`,
    updatedAt: `${addDays(P.start, 40)}T10:00:00.000Z`,
    name: 'Plan ostrożny',
    currency: 'PLN',
    firstMonth,
    goals: [{ id: fid(72, 3), name: 'Poduszka tradingowa', month: 24, amount: 20000, enabled: true, flexible: false }]
  })

  // ---- the bank's files
  const hist = historiaCsv(P.history, P.start, P.historyEnd, P.openingMbank)
  const histFile = join(files, 'rok-historia.csv')
  writeFileSync(histFile, cp1250(hist.text))
  const recentFrom = addDays(anchor, -7)
  const recentTo = addDays(anchor, -1)
  writeFileSync(join(files, 'rok-nowe-lista.csv'), cp1250(listaCsv(P.recent, recentFrom, recentTo)))
  writeFileSync(join(files, 'rok-nowe-historia.csv'), cp1250(historiaCsv(P.recent.filter((e) => !e.pending), recentFrom, recentTo, hist.end).text))
  log.push(`historia: ${P.history.length} wierszy, saldo końcowe ${hist.end / 100} zł; nowe: ${P.recent.length} wierszy`)

  // ---- the folder before the import: settings, plans, containers, goals, loans, balances, buoys, typed operations
  const manualIds = P.manual.map((_, i) => fid(60, i + 1))
  seedFolder(dir, {
    settings: P.settings,
    records: { ...P.records, transactions: P.manual.map((m, i) => toTx(m, manualIds[i]!)) }
  })
  P.manual.forEach((m, i) => {
    if (!m.ictj) return
    writeRecord(dir, 'dockings', { schemaVersion: 1, id: fid(61, i + 1), createdAt: `${m.date}T10:10:00.000Z`, updatedAt: `${m.date}T10:10:00.000Z`, updatedBy: MACHINE, date: m.date, transactionId: manualIds[i], ictjEntryId: m.ictj.id, entryDate: m.ictj.date, pool: m.ictj.pool, split: null })
  })

  // ---- the import through the released app
  let run = await start('persona-rok', { dataDir: dir, ictjDir, machine: MACHINE })
  try {
    await expect(run.page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await run.page.waitForTimeout(5000)
    await run.page.keyboard.press('Control+3')
    await expect(run.page.getByTestId('page-import')).toBeVisible({ timeout: 60_000 })
    await answerDialogs(run.app, { paths: [histFile] })
    await run.page.getByTestId('import-pick').click()
    await expect(run.page.getByTestId('import-file')).toBeVisible({ timeout: 60_000 })
    log.push(`plik: ${(await text(run.page, '[data-testid="import-file"]')).replace(/\s+/g, ' ')}`)
    for (const d of P.decisions) await decide(run.page, d, log)
    await shot(run.page, 'AU2-rok-import-przed')
    for (const k of ['new', 'merge', 'known', 'excluded']) {
      const c = run.page.getByTestId(`import-count-${k}`)
      if (await c.count()) log.push(`import ${k}: ${await c.innerText()}`)
    }
    await run.page.getByTestId('import-run').click()
    await importDone(run.page, run.userData)
    log.push(`wynik: ${(await text(run.page, '[data-testid="import-done"]')).replace(/\s+/g, ' ')}`)
    log.push(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close()
  }

  // ---- the user's decisions after the import, written onto the operations it made
  const txs = await records(dir, 'transactions')
  const byRef = new Map<string, Record<string, unknown>>()
  const used = new Set<string>()
  const find = (e: BankEvent) => {
    const token = (e.op.startsWith('ZAKUP') || e.op.startsWith('ZWROT') ? e.title.split('/')[0]! : e.who).trim().split(/\s+/)[0]!.toUpperCase()
    const cands = txs.filter((t) => t.accountId === MBANK && t.date === e.date && t.amount === e.amount && !used.has(t.id as string))
    const hit = cands.find((t) => String((t.bank as { description?: string } | null)?.description ?? '').toUpperCase().includes(token)) ?? cands[0]
    if (hit) used.add(hit.id as string)
    return hit
  }
  for (const e of P.history) {
    const t = find(e)
    if (t) byRef.set(e.ref, t)
    else log.push(`brak operacji dla ${e.ref} ${e.date} ${e.amount}`)
  }
  const now = new Date().toISOString()
  const changed = new Set<Record<string, unknown>>()
  const touch = (t: Record<string, unknown>) => {
    t.updatedAt = now
    t.updatedBy = MACHINE
    changed.add(t)
  }
  const half = (a: number) => Math.trunc(a / 2)
  const annaPurchases: Array<{ date: string; id: string }> = []
  for (const e of P.history) {
    const t = byRef.get(e.ref)
    const a = e.after
    if (!t || !a) continue
    const amount = t.amount as number
    const category = (t.categoryId as string | null) ?? null
    if (a.annaPart) {
      t.splits = [
        { id: ulid(), amount: amount + a.annaPart, categoryId: category, refundable: false, memberId: null, note: '' },
        { id: ulid(), amount: -a.annaPart, categoryId: category, refundable: true, memberId: ANNA, note: '' }
      ]
      annaPurchases.push({ date: e.date, id: t.id as string })
      touch(t)
    }
    if (a.financedBy) {
      const { member, part, gift } = a.financedBy
      if (part) {
        t.splits = [
          { id: ulid(), amount: amount + part, categoryId: category, refundable: false, memberId: null, note: '' },
          { id: ulid(), amount: -part, categoryId: category, refundable: true, memberId: member, note: '' }
        ]
      } else {
        t.refundable = true
        t.memberId = member
        if (gift) t.gift = true
      }
      if (member === ANNA && !gift) annaPurchases.push({ date: e.date, id: t.id as string })
      touch(t)
    }
    if (a.sharedWithAnna) {
      const anna = half(amount)
      t.share = { mode: 'equal', lines: [{ memberId: null, value: 0, gift: false }, { memberId: ANNA, value: 0, gift: false }] }
      t.splits = [
        { id: ulid(), amount: amount - anna, categoryId: category, refundable: false, memberId: null, note: '' },
        { id: ulid(), amount: anna, categoryId: category, refundable: true, memberId: ANNA, note: '' }
      ]
      annaPurchases.push({ date: e.date, id: t.id as string })
      touch(t)
    }
    if (a.kasiaPart) {
      t.splits = [
        { id: ulid(), amount: amount - a.kasiaPart, categoryId: null, refundable: false, memberId: ANNA, advance: true, inflowKind: 'advance', note: '' },
        { id: ulid(), amount: a.kasiaPart, categoryId: null, refundable: false, memberId: KASIA, advance: true, inflowKind: 'advance', note: '' }
      ]
      touch(t)
    }
    if (a.covers) {
      t.covers = a.covers.map((r) => byRef.get(r)?.id).filter(Boolean)
      touch(t)
    }
    if (a.impulse && !t.impulse) {
      t.impulse = a.impulse
      if (a.logNote) t.logNote = a.logNote
      touch(t)
    }
    if (a.tags) {
      t.tags = a.tags
      touch(t)
    }
    if (a.awaitReturn) {
      t.awaitReturn = { amount: a.awaitReturn.amount, until: a.awaitReturn.until, closedAt: null }
      touch(t)
    }
    if (a.container && !t.containerId) {
      t.containerId = a.container
      touch(t)
    }
    if (a.ictj)
      writeRecord(dir, 'dockings', { schemaVersion: 1, id: ulid(), createdAt: now, updatedAt: now, updatedBy: MACHINE, date: t.date, transactionId: t.id, ictjEntryId: a.ictj.id, entryDate: a.ictj.date, pool: a.ictj.pool, split: null })
  }
  // Anna's money after the day the purchases are named (D91): the ones before the last inflow name what they pay back;
  // the last one waits for „Przypisz zwrot…”.
  const assignFrom = (await JSON.parse(readFileSync(join(dir, 'fi.json'), 'utf8'))).settings.household.assignFrom as string
  const annaIn = P.history.filter((e) => e.who === 'ANNA TESTOWA' && e.date >= assignFrom).map((e) => byRef.get(e.ref)).filter((t): t is Record<string, unknown> => !!t)
  let prev = assignFrom
  for (const t of annaIn.slice(0, -1)) {
    t.covers = annaPurchases.filter((p) => p.date >= prev && p.date < (t.date as string)).map((p) => p.id)
    prev = t.date as string
    touch(t)
  }
  for (const t of changed) writeRecord(dir, 'transactions', t)
  log.push(`decyzje po imporcie: ${changed.size} operacji`)

  // The import made a week ago (an overdue import is the app's to tell, not „today's”).
  const fiPath = join(dir, 'fi.json')
  const fi = JSON.parse(readFileSync(fiPath, 'utf8'))
  const importedAt = `${addDays(anchor, -7)}T17:30:00.000Z`
  fi.settings.import.lastImport = { ...fi.settings.import.lastImport, [MBANK]: importedAt }
  fi.settings.import.log = { [importedAt]: MBANK }
  writeFileSync(fiPath, `${JSON.stringify(fi, null, 2)}\n`)
  for (const b of await records(dir, 'imports')) writeRecord(dir, 'imports', { ...b, at: importedAt, savedAt: importedAt })

  // ---- a second start: the app settles (frozen days of the game, ICTTJ goals); the bridge as the captain sees it
  run = await start('persona-rok', { dataDir: dir, ictjDir, machine: MACHINE, fresh: false })
  try {
    await expect(run.page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await run.page.waitForTimeout(20_000)
    await shot(run.page, 'AU2-rok-mostek')
    log.push(`Mostek: ${(await text(run.page, '[data-testid="page-bridge"]')).replace(/\s+/g, ' ').slice(0, 1500)}`)
    log.push(`powiadomienia (zapis): ${JSON.stringify((await recorded(run.app)).toasts.map((t) => t.title))}`)
    log.push(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close()
  }
  const game = await records(dir, 'game')
  log.push(`gra: ${game.length} miesięcy, dni ocenionych ${game.reduce((s, g) => s + Object.keys((g.days as object) ?? {}).length, 0)}`)
  log.push(`operacje: ${(await records(dir, 'transactions')).length}, dokowania: ${(await records(dir, 'dockings')).length}, cele: ${(await records(dir, 'goals')).length}`)
  writeFileSync(join(LAB, 'stany', 'rok.log'), `${log.join('\n')}\n`)
  writeFileSync(join(LAB, 'stany', 'rok.persona.json'), `${JSON.stringify({ anchor: P.anchor, start: P.start, historyEnd: P.historyEnd, ictj: P.ictj, history: P.history, recent: P.recent, manual: P.manual }, null, 2)}\n`)
  note('persona-rok', log.join('\n'))
  console.log(log.join('\n'))
})
