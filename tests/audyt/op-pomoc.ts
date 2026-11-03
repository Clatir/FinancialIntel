/**
 * Helpers of the audit's area OP / ME (Operacje, Meldunki): a run on a copy of the persona „rok”, the screens, the
 * records of the folder. An observation tool – it prints what the screen says; the verdicts are written by hand.
 */
import { mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, type Locator, type Page } from '@playwright/test'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { SCHEMA_VERSION } from '../../src/shared/schema/common'
import { records } from '../e2e/files'
import { note, shot, start, text, useState, type Run } from './lab'

export const MBANK = '01KDEFACC00000000000000001'
export const WALLET = '01KDEFACC00000000000000002'
export const CASH = '01KDEFACC00000000000000003'
export const ANNA = '01KDEFMEM00000000000000001'
export const KASIA = '01KAZ200000000000000000002'
export const MAREK = '01KAZ200000000000000000003'
export const cat = (n: string): string => `01KDEFCAT${n.padStart(17, "0")}`

/** A run of the area on a fresh copy of „rok” (optionally changed before the start). */
export async function run(name: string, prepare?: (dataDir: string) => void, opts: { idle?: boolean } = {}): Promise<Run> {
  const { dataDir, ictjDir } = useState('rok', name)
  prepare?.(dataDir)
  const r = await start(name, { dataDir, ictjDir, idle: opts.idle })
  r.page.setDefaultTimeout(15_000)
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.page.waitForTimeout(1500)
  return r
}

/** The same run's folder started again (a restart): user data kept. */
export async function restart(name: string, dataDir: string, ictjDir?: string): Promise<Run> {
  const r = await start(name, { dataDir, ictjDir, fresh: false })
  r.page.setDefaultTimeout(15_000)
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.page.waitForTimeout(1500)
  return r
}

let seq = 0
/** A valid ULID of a record added by the area (fixed prefix, a counter; Crockford letters only). */
export const opId = (): string => `01KQPAD${String(++seq).padStart(19, '0')}`
export const fixedId = (n: number): string => `01KQPAF${String(n).padStart(19, '0')}`

/** Records added to a copied folder before the start, through the app's schemas (fi.json untouched). */
export function addRecords(dataDir: string, collection: Collection, list: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const at = '2026-11-03T08:00:00.000Z'
  return list.map((raw) => {
    const record = SCHEMAS[collection].parse({ schemaVersion: SCHEMA_VERSION, id: opId(), createdAt: at, updatedAt: at, updatedBy: 'LAPTOP-KAPITANA', ...raw }) as unknown as Record<string, unknown>
    const file = join(dataDir, recordRelPath(collection, record))
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, serializeRecord(collection, record as never))
    return record
  })
}

/** fi.json changed before the start. */
export function editSettings(dataDir: string, change: (s: Record<string, any>) => void): void {
  const f = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(f, 'utf8'))
  change(fi.settings)
  writeFileSync(f, `${JSON.stringify(fi, null, 2)}\n`)
}

export const ops = (dataDir: string) => records(dataDir, 'transactions')

// ------------------------------------------------------------------ the area's states („rok” plus records)

let bankSeq = 0
const IMPORTED = '2026-11-02T18:00:00.000Z'
/** A card payment row of mBank (as the import writes it); `key` shared = the same row twice. */
export const card = (date: string, name: string, key?: string, pending = false) => ({
  format: 'mbank',
  key: key ?? `mbank:feedface${(++bankSeq).toString(16).padStart(8, '0')}:0`,
  description: `ZAKUP PRZY UŻYCIU KARTY ${name} /TESTOWO DATA TRANSAKCJI: ${date}`,
  counterparty: name,
  bankName: `${name} /TESTOWO DATA TRANSAKCJI: ${date}`,
  operation: 'ZAKUP PRZY UŻYCIU KARTY',
  category: '',
  pending,
  importedAt: IMPORTED,
  source: 'historia'
})
/** An incoming transfer row of mBank. */
export const transferIn = (who: string, title: string) => ({
  format: 'mbank',
  key: `mbank:feedbeef${(++bankSeq).toString(16).padStart(8, '0')}:0`,
  description: `PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY ${who} ${title}`,
  counterparty: who,
  operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY',
  category: '',
  pending: false,
  importedAt: IMPORTED,
  source: 'historia'
})

export const GOAL_LAPTOP = '01KAZ300000000000000000001'
export const GOAL_TRIP = '01KAZ300000000000000000002'
export const NO_ENVELOPE_CAT = '01KQPACAT00000000000000001'
/** Fixed ids of the state „rok+op” (for the scripts). */
export const ID = { kasiaGift: fixedId(1), kasiaRepay: fixedId(2), marekTicket: fixedId(3), marekRepay: fixedId(4), decathlon: fixedId(5), zalando: fixedId(6), modivo: fixedId(7), carrefour: fixedId(8) }

/**
 * „rok+op”: the persona „rok” with the operations the points OP / ME need and „rok” has not (docs/audyt/raport/OP.md,
 * „Stan rok+op”). Dated after mBank's confirmed balance (26.10) or on Portfel XTB / Gotówka – the confirmation stays true.
 */
export function enrich(dataDir: string): void {
  const W = WALLET
  const M = MBANK
  const tx = (o: Record<string, unknown>) => ({ accountId: W, kind: 'expense', ...o })
  addRecords(dataDir, 'transactions', [
    // OP.4 / OP.9 / OP.12: names, a multi-line note, a receipt's lines' descriptions, a tag, 12,50 zł both ways.
    tx({ date: '2026-11-01', counterparty: 'Pierogarnia Łódź Kaliska', amount: -3400, categoryId: cat('0102') }),
    tx({ date: '2026-11-02', time: '13:10', counterparty: 'Pizzeria Napoli', amount: -4500, categoryId: cat('0102'), note: 'obiad z Tomkiem\ndruga linia notatki\ntrzecia linia' }),
    tx({ id: ID.carrefour, date: '2026-11-02', counterparty: 'Carrefour', amount: -13000, splits: [{ id: opId(), amount: -10000, categoryId: cat('0101'), note: 'zakupy na tydzień' }, { id: opId(), amount: -3000, categoryId: cat('0203'), note: 'kabel HDMI' }] }),
    tx({ date: '2026-11-01', counterparty: 'Kiosk Ruch', amount: -1250, categoryId: cat('0902'), tags: ['Wakacje'] }),
    tx({ date: '2026-11-02', kind: 'income', counterparty: 'BLIK od Tomka', amount: 1250 }),
    tx({ date: '2026-11-01', counterparty: 'Ślusarz Śmiały', amount: -8000, categoryId: cat('0203') }),
    tx({ date: '2026-11-02', counterparty: '', amount: -500, categoryId: cat('0902') }),
    tx({ date: '2026-11-02', counterparty: 'Żabka', amount: -1500, categoryId: cat('0103') }),
    tx({ date: '2026-11-01', counterparty: 'Zakład Szewski', amount: -2500, categoryId: cat('0801') }),
    tx({ date: '2026-11-02', counterparty: 'Lidl', amount: -2000, categoryId: cat('0101') }),
    tx({ date: '2026-11-01', counterparty: 'Łazienki Kiosk', amount: -800, categoryId: cat('0103'), tags: ['wakacje '] }),
    // OP.7 / ME.4: „bez kategorii” – 4 of mine since the start, 1 before it, a receipt's line (40 of 100), a 0 zł line;
    // not: an income, a transfer, a member's purchase, a goal's expense (the container payments „Rata – rodzice” are in „rok”).
    tx({ date: '2026-10-05', counterparty: 'Sklep bez kategorii A', amount: -3000 }),
    tx({ date: '2026-10-12', counterparty: 'Sklep bez kategorii B', amount: -4550 }),
    tx({ date: '2026-11-01', counterparty: 'Sklep bez kategorii C', amount: -1999 }),
    tx({ date: '2025-08-20', counterparty: 'Sklep sprzed startu', amount: -6000 }),
    tx({ date: '2026-10-20', counterparty: 'Market Paragon', amount: -10000, splits: [{ id: opId(), amount: -6000, categoryId: cat('0101') }, { id: opId(), amount: -4000, categoryId: null }] }),
    tx({ date: '2026-10-21', counterparty: 'Market Zero', amount: -5000, splits: [{ id: opId(), amount: -5000, categoryId: cat('0101') }, { id: opId(), amount: 0, categoryId: null }] }),
    tx({ date: '2026-10-15', kind: 'income', counterparty: 'Wpływ bez kategorii', amount: 10000 }),
    tx({ date: '2026-10-16', kind: 'transfer', counterparty: 'Przelew na lokatę', amount: -20000, counterAccountId: null }),
    tx({ date: '2026-10-18', counterparty: 'Zakup dla Marka', amount: -7000, refundable: true, memberId: MAREK }),
    tx({ date: '2026-10-19', counterparty: 'Sklep komputerowy', amount: -15000, goalId: GOAL_LAPTOP }),
    // OP.17: a hand-typed „Dino” with no category; the bank's „DINO TESTOWO 4” in „Jedzenie · zakupy spożywcze”.
    tx({ date: '2026-11-02', counterparty: 'Dino', amount: -2730 }),
    tx({ accountId: M, date: '2026-10-27', counterparty: 'DINO TESTOWO 4', amount: -5620, categoryId: cat('0101'), bank: card('2026-10-27', 'DINO TESTOWO 4') }),
    tx({ accountId: M, date: '2026-10-29', counterparty: 'DINO TESTOWO 4', amount: -4180, categoryId: cat('0101'), bank: card('2026-10-29', 'DINO TESTOWO 4') }),
    // OP.6: a pending row, a purchase in the quiet hours with a log entry.
    tx({ accountId: M, date: '2026-11-02', counterparty: 'ALLEGRO PAY', amount: -8999, categoryId: cat('0902'), bank: card('2026-11-02', 'ALLEGRO PAY', undefined, true) }),
    tx({ date: '2026-11-01', time: '23:40', counterparty: 'Lody nocne', amount: -1800, categoryId: cat('0103'), logNote: 'nie mogłem zasnąć' }),
    // ME.8: a brand far over its usual, a new counterparty from 200 zł (and its category over 2× its average), two
    // charges of one brand and amount a day apart.
    tx({ accountId: M, date: '2026-11-01', counterparty: 'ZABKA Z1234', amount: -9500, categoryId: cat('0101'), bank: card('2026-11-01', 'ZABKA Z1234') }),
    tx({ date: '2026-11-01', counterparty: 'SALON ROWEROWY KOŁO', amount: -45000, categoryId: cat('0602') }),
    tx({ accountId: M, date: '2026-10-30', counterparty: 'BOLT.EU', amount: -2340, categoryId: cat('0601'), bank: card('2026-10-30', 'BOLT.EU') }),
    tx({ accountId: M, date: '2026-10-31', counterparty: 'BOLT.EU', amount: -2340, categoryId: cat('0601'), bank: card('2026-10-31', 'BOLT.EU') }),
    // ME.5: three rows of the bank each twice (one key).
    ...['ROSSMANN 112:-3499:0802', 'KEBAB ROMA:-2800:0102', 'SKYCASH PARKING:-600:0304'].flatMap((s) => {
      const [name, amount, c] = s.split(':') as [string, string, string]
      const row = card('2026-10-28', name)
      return [0, 1].map(() => tx({ accountId: M, date: '2026-10-28', counterparty: name, amount: Number(amount), categoryId: cat(c), bank: row }))
    }),
    // OP.8 / OP.39: a transfer of both accounts in one operation.
    tx({ accountId: M, date: '2026-10-28', kind: 'transfer', counterparty: 'Przelew na Portfel', amount: -30000, counterAccountId: W, bothSides: true }),
    // OP.8: 50,00 zł both ways.
    tx({ date: '2026-10-22', counterparty: 'Apteka', amount: -5000, categoryId: cat('0501') }),
    tx({ date: '2026-10-23', kind: 'income', counterparty: 'Zwrot za bilet', amount: 5000 }),
    // OP.24 / OP.6: a member's purchase partly paid back, another paid back.
    tx({ id: ID.kasiaGift, date: '2026-10-24', counterparty: 'Prezent urodzinowy', amount: -20000, categoryId: cat('0901'), refundable: true, memberId: KASIA }),
    tx({ id: ID.kasiaRepay, date: '2026-10-25', kind: 'income', counterparty: 'Kasia oddaje część', amount: 8000, memberId: KASIA, inflowKind: 'repay', covers: [ID.kasiaGift] }),
    tx({ id: ID.marekTicket, date: '2026-10-24', counterparty: 'Bilet dla Marka', amount: -6000, categoryId: cat('0601'), refundable: true, memberId: MAREK }),
    tx({ id: ID.marekRepay, date: '2026-10-25', kind: 'income', counterparty: 'Marek oddaje', amount: 6000, memberId: MAREK, inflowKind: 'repay', covers: [ID.marekTicket] }),
    // OP.21: a receipt with lines, tags and a note.
    tx({ id: ID.decathlon, date: '2026-11-01', counterparty: 'Decathlon', amount: -22000, note: 'zakupy sportowe', tags: ['sport'], splits: [{ id: opId(), amount: -15000, categoryId: cat('0503'), note: 'buty' }, { id: opId(), amount: -7000, categoryId: cat('0801'), tags: ['Mazury 2026'] }] }),
    // OP.19: a row of the bank after the confirmed balance.
    tx({ accountId: M, date: '2026-10-29', counterparty: 'PIEKARNIA TESTOWA', amount: -4500, categoryId: cat('0101'), bank: card('2026-10-29', 'PIEKARNIA TESTOWA') }),
    // OP.38: „obiad” six times from one person, once from another.
    ...['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map((d) => tx({ accountId: M, date: d, kind: 'income', counterparty: 'PIOTR TESTOWY', title: 'obiad', amount: 3500, bank: transferIn('PIOTR TESTOWY', 'obiad') })),
    tx({ accountId: M, date: '2026-11-02', kind: 'income', counterparty: 'EWA TESTOWA', title: 'obiad', amount: 3500, bank: transferIn('EWA TESTOWA', 'obiad') }),
    // OP.37 / ME.3: returns awaited – A due in 5 days, B 12 days late.
    tx({ id: ID.zalando, date: '2026-10-25', counterparty: 'ZALANDO', amount: -24900, categoryId: cat('0801'), awaitReturn: { amount: 24900, until: '2026-11-08' } }),
    tx({ id: ID.modivo, date: '2026-10-08', counterparty: 'MODIVO', amount: -10000, categoryId: cat('0801'), awaitReturn: { amount: 10000, until: '2026-10-22' } })
  ])
  editSettings(dataDir, (s) => {
    // OP.17: a category without an envelope; OP.27: the tag „Mazury 2026” joined with the goal „Wakacje 2027”.
    s.categories.push({ id: NO_ENVELOPE_CAT, name: 'Darowizny', parentId: null, envelope: null, system: null, archived: false })
    s.intel.tagGoals = { 'mazury 2026': GOAL_TRIP }
  })
}

export const TR = { p1m: fixedId(101), p1w: fixedId(102), p3m: fixedId(103), p3w: fixedId(104), p4g: fixedId(105), p4w: fixedId(106), dbl: fixedId(107), dblW: fixedId(108), lone: fixedId(109), loneBefore: fixedId(110), both: fixedId(111) }
/** Portfel XTB's balance confirmed on this day in „rok+przelewy”. */
export const WALLET_CONFIRMED = '2026-10-20'

/**
 * „rok+przelewy” (OP.35, ME.6, ME.7, OP.20): transfers of before 1.7.0 – three pairs written as two operations (one with no
 * account named on either side), a side written twice, a side missing after and before Portfel XTB's confirmed balance
 * (20.10), a transfer in one operation inside both confirmed periods. `confirmWallet: false` – no confirmation (ME.3).
 */
export function transfers(dataDir: string, confirmWallet = true): void {
  const t = (o: Record<string, unknown>) => ({ kind: 'transfer', ...o })
  addRecords(dataDir, 'transactions', [
    // P1: mBank → Portfel XTB, its sides a day apart.
    t({ id: TR.p1m, accountId: MBANK, date: '2026-10-27', counterparty: 'Przelew na portfel', amount: -30000, counterAccountId: WALLET }),
    t({ id: TR.p1w, accountId: WALLET, date: '2026-10-28', counterparty: 'Wpływ z mBanku', amount: 30000 }),
    // P3: no side names an account – a pair by the amount and the day only.
    t({ id: TR.p3m, accountId: MBANK, date: '2026-10-30', counterparty: 'Lokata zewnętrzna', amount: -20000 }),
    t({ id: TR.p3w, accountId: WALLET, date: '2026-10-30', counterparty: 'Zwrot z lokaty', amount: 20000 }),
    // P4: Gotówka → Portfel XTB inside Portfel XTB's confirmed period.
    t({ id: TR.p4g, accountId: CASH, date: '2026-10-12', counterparty: 'Gotówka do portfela', amount: -5000, counterAccountId: WALLET }),
    t({ id: TR.p4w, accountId: WALLET, date: '2026-10-12', counterparty: 'Z gotówki', amount: 5000 }),
    // A transfer in one operation whose Portfel XTB side is written once more.
    t({ id: TR.dbl, accountId: MBANK, date: '2026-10-31', counterparty: 'Przelew podwójny', amount: -40000, counterAccountId: WALLET, bothSides: true }),
    t({ id: TR.dblW, accountId: WALLET, date: '2026-10-31', counterparty: 'Strona podwójnego', amount: 40000 }),
    // One side only: after Portfel XTB's confirmation (mBank) and before it (Gotówka).
    t({ id: TR.lone, accountId: MBANK, date: '2026-11-01', counterparty: 'Przelew bez pary', amount: -25000, counterAccountId: WALLET }),
    t({ id: TR.loneBefore, accountId: CASH, date: '2026-10-10', counterparty: 'Gotówka bez pary', amount: -18000, counterAccountId: WALLET }),
    // OP.20: one operation inside both confirmed periods (Portfel XTB → mBank 15.10).
    t({ id: TR.both, accountId: WALLET, date: '2026-10-15', counterparty: 'Z portfela na konto', amount: -10000, counterAccountId: MBANK, bothSides: true })
  ])
  // mBank's confirmed balance (26.10) holds the 100 zł that came on 15.10 – it stays true.
  const balDir = join(dataDir, 'balances')
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.json') ? [join(d, e.name)] : []))
  for (const f of walk(balDir)) {
    const b = JSON.parse(readFileSync(f, 'utf8'))
    if (b.kind === 'confirmation' && b.accountId === MBANK && b.date === '2026-10-26') writeFileSync(f, `${JSON.stringify({ ...b, amount: b.amount + 10000 }, null, 2)}\n`)
  }
  if (!confirmWallet) return
  // Portfel XTB's balance on 20.10 as the folder has it: the opening and every operation of the account up to that day.
  const txDir = join(dataDir, 'transactions')
  let wallet = 0
  for (const f of walk(balDir)) {
    const b = JSON.parse(readFileSync(f, 'utf8'))
    if (b.kind === 'opening' && b.accountId === WALLET) wallet += b.amount
  }
  for (const f of walk(txDir)) {
    const x = JSON.parse(readFileSync(f, 'utf8'))
    if (x.date > WALLET_CONFIRMED) continue
    if (x.accountId === WALLET) wallet += x.amount
    if (x.counterAccountId === WALLET && x.bothSides) wallet -= x.amount
  }
  addRecords(dataDir, 'balances', [{ date: WALLET_CONFIRMED, accountId: WALLET, kind: 'confirmation', amount: wallet }])
}

/** Printed for the report: a header and the text. */
export function say(label: string, value: unknown): void {
  const s = typeof value === 'string' ? value : JSON.stringify(value, null, 1)
  console.log(`\n### ${label}\n${s}`)
}

export async function goOps(page: Page): Promise<void> {
  await page.keyboard.press('Control+2')
  await expect(page.getByTestId('page-operations')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(800)
}

export async function goInbox(page: Page): Promise<void> {
  await page.keyboard.press('Control+Shift+M')
  await expect(page.getByTestId('page-inbox')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(500)
}

/** The sums bar of Operacje. */
export const sums = (page: Page): Promise<string> => text(page, '[data-testid="operations-sums"]')

/** Typed into a field: click, fill, Enter (the amount fields need the click first). */
export async function typeIn(page: Page, target: string | Locator, value: string, key: 'Enter' | 'Tab' = 'Enter'): Promise<void> {
  const field = typeof target === 'string' ? page.getByTestId(target) : target
  await field.click()
  await field.fill(value)
  await field.press(key)
}

/** The search box of Operacje set to a text (the whole history shown first when `all`). */
export async function search(page: Page, q: string): Promise<void> {
  await page.getByTestId('operations-search').fill(q)
  await page.waitForTimeout(500)
}

export async function periodAll(page: Page): Promise<void> {
  await page.getByTestId('operations-period-menu').click()
  await page.getByTestId('operations-period-all').click()
  await page.waitForTimeout(500)
}

export const rows = (page: Page): Locator => page.getByTestId('operation-row')

/** Visible rows' texts (the list is virtual: what is rendered). */
export async function rowTexts(page: Page, max = 40): Promise<string[]> {
  const all = await rows(page).allInnerTexts()
  return all.slice(0, max).map((t) => t.replace(/\s+/g, ' ').trim())
}

/** A step of a point: its failure is printed (a result of the point), the run goes on. */
export async function step(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
  } catch (e) {
    console.log(`\n### KROK NIEUDANY: ${label}\n${(e as Error).message.split('\n').slice(0, 6).join('\n')}`)
  }
}

/** An operation opened from the list: the whole history searched for `q`, the first row with `has` clicked. */
export async function openOp(page: Page, q: string, has?: string | RegExp): Promise<void> {
  const label = await page.getByTestId('operations-period').innerText().catch(() => '')
  if (label !== 'cała historia') await periodAll(page)
  await search(page, q)
  const row = has ? rows(page).filter({ hasText: has }).first() : rows(page).first()
  await row.click()
  await page.waitForTimeout(400)
}

/** A text of an element that may be absent – no waiting („(brak)” when none). */
export async function opt(loc: Locator, attr?: string): Promise<string> {
  if (!(await loc.count())) return '(brak)'
  return attr ? ((await loc.first().getAttribute(attr)) ?? '') : loc.first().innerText()
}

/** Is an element there and visible – no waiting. */
export async function shown(loc: Locator): Promise<boolean> {
  return (await loc.count()) > 0 && (await loc.first().isVisible())
}

/** The editor's whole text. */
export const editorText = (page: Page): Promise<string> => text(page, '[data-testid="operation-editor"]')

/** The balance of an account in the sums bar („mBank 69 747,04 zł”). */
export async function balanceOf(page: Page, name: string): Promise<string> {
  return page.getByTestId(`balance-${name}`).innerText().catch(async () => (await sums(page)).split('\n').find((l) => l.startsWith(name)) ?? '?')
}

/** „ENERGIA DZIŚ …” and the layers' lines of the bridge. */
export async function bridgeNumbers(page: Page): Promise<string> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(800)
  const t = await text(page, '[data-testid="page-bridge"]')
  const lines = t.split('\n')
  const i = lines.findIndex((l) => /ENERGIA DZI/i.test(l))
  const layer = lines.filter((l) => /Osłony|Kadłub|osłon|kadłub/.test(l)).slice(0, 6)
  return [lines.slice(i, i + 3).join(' '), ...layer].join(' | ')
}

/** The toasts on screen now. */
export const toasts = (page: Page): Promise<string[]> => page.getByRole('status').allInnerTexts()

/** A screenshot of the area named after the point. */
export async function snap(page: Page, id: string): Promise<void> {
  const f = await shot(page, id)
  console.log(`[zrzut] ${f}`)
}

export { note, text }
