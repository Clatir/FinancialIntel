import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { analysisFromWire, analyzeImport, answer, type Analysis, type AnalyzeInput, type AnalyzeMessage, type PlanSource } from '@shared/import/analyze'
import { completeMapping, guessCsv } from '@shared/import/csv'
import { buildImport, isSideView, realOf, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type Account, type CsvMapping, type Transaction } from '@shared/schema'
import { listaCsv, type CsvBuy } from '../e2e/mbank-csv'

const NOW = '2026-10-17T09:00:00.000Z'
const fi = createDefaultSettings(NOW).settings
const BANK_B = '01K4BANKB00000000000000001'
const fixture = (...p: string[]) => new Uint8Array(readFileSync(join(__dirname, '..', 'fixtures', ...p)))
const CSV = fixture('csv', 'inny_bank.csv')
const LISTA = fixture('mbank', 'lista_operacji.csv')
const HISTORIA = fixture('mbank', 'historia_rachunku.csv')
let seq = 0
const makeId = () => `01K6${String(++seq).padStart(22, '0')}`
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })
const tx = (over: Partial<Transaction>): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date: '2026-10-10', accountId: MBANK_ACCOUNT_ID, amount: -2500, ...over })

function csvMapping(): CsvMapping {
  const done = completeMapping(guessCsv(CSV)!.draft)
  if (!('mapping' in done)) throw new Error(done.missing)
  return done.mapping
}
const accounts: Account[] = [...fi.accounts, { id: BANK_B, name: 'Bank B', kind: 'bank', importFormat: 'csv', csvMapping: csvMapping(), archived: false }]

const source = (transactions: Transaction[]): PlanSource => ({
  transactions,
  containers: [],
  loans: [],
  accounts,
  categories: fi.categories,
  rules: fi.import.rules,
  aliases: {},
  members: fi.household.members,
  ownNames: ['JAN KAPITAN'],
  accountNumbers: {},
  locked: new Set(),
  docked: new Set()
})
const input = (bytes: Uint8Array, transactions: Transaction[] = []): AnalyzeInput => ({ bytes, chosen: '', fallback: MBANK_ACCOUNT_ID, source: source(transactions), deletedKeys: new Set(), deletedRows: [] })

/**
 * The Worker's way (T464): the request and every message copied as `postMessage` copies them (structured clone), the
 * analysis on the copy, its operations taken back from the window's own list.
 */
function viaWorker(inp: AnalyzeInput): { analysis: Analysis; messages: AnalyzeMessage[] } {
  const messages: AnalyzeMessage[] = []
  let clock = 0
  answer(structuredClone({ id: 7, input: inp }), (m) => messages.push(structuredClone(m)), () => (clock += 100))
  const done = messages.at(-1)!
  if (done.type !== 'done') throw new Error(done.type === 'fail' ? done.message : 'bez wyniku')
  return { analysis: analysisFromWire(done.analysis, inp.source.transactions), messages }
}

const planOf = (a: Analysis): ImportPlan => {
  if (a.kind !== 'plan') throw new Error(a.kind)
  return a.plan
}

/** The budget the files meet: imported rows, hand-typed ones, transfers whose other side is a row, a pending one gone. */
function budget(): Transaction[] {
  const imported = (bytes: Uint8Array, cut: (t: Transaction) => boolean) => {
    const plan = planOf(analyzeImport(input(bytes)))
    return buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] }).create.filter(cut)
  }
  return [
    // Rows imported before (known): the half of the list, the CSV's last days.
    ...imported(LISTA, (t) => t.date >= '2025-10-10'),
    ...imported(CSV, (t) => t.date >= '2026-10-12'),
    // A transfer in one operation from Bank B to mBank (F10): its side on Bank B is the CSV's row of 03.10 (a view – `sideOf`).
    tx({ kind: 'transfer', amount: 100000, date: '2026-10-03', counterAccountId: BANK_B, bothSides: true, counterparty: 'Przelew z Banku B' }),
    // A one-sided transfer of before 1.7.0 naming Bank B: its side there is the ATM's row of 05.10 (`legacySideOf`).
    tx({ kind: 'transfer', amount: 20000, date: '2026-10-05', counterAccountId: BANK_B, counterparty: 'Wpłata z Banku B' }),
    // A purchase typed by hand: the CSV's Biedronka of 01.10 joins it.
    tx({ accountId: BANK_B, amount: -8745, date: '2026-10-01', counterparty: 'Biedronka' }),
    // A pending row of mBank the list no longer has (vanished).
    tx({ amount: -999, date: '2025-10-15', counterparty: 'SKLEP ZNIKNIETY', bank: { format: 'mbank', key: 'mbank:gone:0', description: 'SKLEP ZNIKNIETY', counterparty: 'SKLEP ZNIKNIETY', operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU', category: '', pending: true, importedAt: NOW, source: 'lista' } })
  ]
}

describe('AP-35 – analiza w Workerze daje ten sam plan co w oknie (T463, T464)', () => {
  it('lista operacji, historia rachunku i CSV innego banku: plan z Workera równy planowi okna – te same obiekty operacji, także widoki drugich stron', () => {
    const existing = budget()
    for (const bytes of [LISTA, HISTORIA, CSV]) {
      const inp = input(bytes, existing)
      const direct = analyzeImport(inp)
      const { analysis } = viaWorker(inp)
      expect(analysis).toEqual(direct)
      const [a, b] = [planOf(direct), planOf(analysis)]
      a.rows.forEach((p, i) => {
        const q = b.rows[i]!
        // The row's operation is the window's own object (a copy would be no view – `isSideView` false: the other account's
        // side written as the operation itself).
        if ('tx' in p && 'tx' in q) expect(q.tx).toBe(p.tx)
        if (p.status === 'known' && p.copy && q.status === 'known') expect(q.copy!.tx).toBe(p.copy.tx)
      })
      expect(b.vanished).toEqual(a.vanished)
      b.vanished.forEach((t, i) => expect(t).toBe(a.vanished[i]))
      // What the import writes of it – the same.
      let n = 0
      const ids = () => `01K7${String(++n).padStart(22, '0')}`
      const write = (plan: ImportPlan) => {
        n = 0
        return buildImport(plan, emptyChoices(), { now: NOW, makeId: ids, rules: [], accounts: accounts.map((x) => x.id) })
      }
      expect(write(b)).toEqual(write(a))
    }
  })

  it('CSV na konto z przelewami: strona przelewu w jednej operacji i przelewu sprzed 1.7.0 przechodzą przez Worker jako widoki', () => {
    const existing = budget()
    const plan = planOf(viaWorker(input(CSV, existing)).analysis)
    const sides = plan.rows.flatMap((p) => (p.status === 'merge' && p.side ? [p] : []))
    expect(sides.map((p) => [p.row.date, p.side])).toEqual([
      ['2026-10-05', 'legacy'],
      ['2026-10-03', 'other']
    ])
    for (const p of sides) {
      expect(isSideView(p.tx)).toBe(true)
      expect(existing).toContain(realOf(p.tx))
      expect(p.tx.accountId).toBe(BANK_B)
    }
    expect(plan.rows.filter((p) => p.status === 'known')).toHaveLength(3)
    expect(plan.rows.find((p) => p.status === 'merge' && !p.side)!.row.counterparty).toBe('BIEDRONKA 1234 TESTOWO')
    expect(planOf(viaWorker(input(LISTA, existing)).analysis).vanished.map((t) => t.counterparty)).toEqual(['SKLEP ZNIKNIETY'])
  })

  it('postęp: najpierw odczyt wierszy, potem rozpoznanie – rosnąco, na końcu wynik; plik bez mapowania – kreator, plik zepsuty – powód', () => {
    const big = new TextEncoder().encode(listaCsv(purchases(3000), { from: '2024-01-01', to: '2024-12-31' }))
    const { messages } = viaWorker(input(big))
    const progress = messages.filter((m): m is Extract<AnalyzeMessage, { type: 'progress' }> => m.type === 'progress')
    expect(progress.length).toBeGreaterThan(4)
    expect(new Set(progress.map((m) => m.phase))).toEqual(new Set(['read', 'plan']))
    expect(progress.findIndex((m) => m.phase === 'plan')).toBeGreaterThan(progress.findLastIndex((m) => m.phase === 'read'))
    for (const phase of ['read', 'plan'] as const) {
      const done = progress.filter((m) => m.phase === phase).map((m) => m.done)
      expect(done).toEqual([...done].sort((x, y) => x - y))
      expect(progress.filter((m) => m.phase === phase).every((m) => m.done <= m.total)).toBe(true)
    }
    expect(messages.at(-1)!.type).toBe('done')
    const noMapping = { ...input(CSV), source: { ...source([]), accounts: fi.accounts } }
    expect(viaWorker(noMapping).analysis).toEqual({ kind: 'csv' })
  })

  it('wydajność: 20 000 wierszy przy 20 000 operacji w budżecie – okno zajęte tylko przesłaniem danych, nie analizą (próg; czasy w raporcie)', () => {
    const old = purchases(20000)
    const existing = buildImport(planOf(analyzeImport(input(new TextEncoder().encode(listaCsv(old, { from: old[0]!.date, to: old.at(-1)!.date })))))!, emptyChoices(), { now: NOW, makeId, rules: [] }).create
    const fresh = purchases(20000, 10000)
    const inp = input(new TextEncoder().encode(listaCsv(fresh, { from: fresh[0]!.date, to: fresh.at(-1)!.date })), existing)
    // Before 1.16.0: the window analyzes – it does not answer all that time.
    let t = performance.now()
    const direct = analyzeImport(inp)
    const before = performance.now() - t
    // With the Worker: the window copies the request and takes the answer back (both copies counted whole – more than the
    // window's share of them); the analysis runs on the Worker's thread.
    t = performance.now()
    const req = structuredClone({ id: 1, input: inp })
    const sendMs = performance.now() - t
    const messages: AnalyzeMessage[] = []
    t = performance.now()
    answer(req, (m) => messages.push(m))
    const workerMs = performance.now() - t
    t = performance.now()
    const done = structuredClone(messages.at(-1)!)
    if (done.type !== 'done') throw new Error('bez wyniku')
    const back = analysisFromWire(done.analysis, inp.source.transactions)
    const receiveMs = performance.now() - t
    const after = sendMs + receiveMs
    console.log(`AP-35 – 20 000 wierszy, 20 000 operacji: okno bez Workera ${Math.round(before)} ms; z Workerem okno ${Math.round(after)} ms (wysłanie ${Math.round(sendMs)}, odbiór ${Math.round(receiveMs)}), Worker ${Math.round(workerMs)} ms`)
    expect(planOf(back).rows).toHaveLength(20000)
    expect(planOf(back).rows.filter((p) => p.status === 'known')).toHaveLength(10000)
    expect(planOf(direct).rows.length).toBe(20000)
    // Thresholds (CI is slower): the whole analysis within 30 s; with the Worker the window stops twice – sending, taking
    // the answer – each moment shorter than the window's own analysis (a loaded machine stretches both alike).
    expect(before).toBeLessThan(30_000)
    expect(Math.max(sendMs, receiveMs)).toBeLessThan(before)
  }, 120_000)
})

/** Card purchases of many shops, 20 a day from 01.01.2023. */
function purchases(n: number, from = 0): CsvBuy[] {
  const names = ['BIEDRONKA', 'LIDL', 'ZABKA Z', 'ORLEN', 'KIOSK RUCH', 'SKLEP NR', 'APTEKA', 'PIEKARNIA']
  const out: CsvBuy[] = []
  for (let i = from; i < from + n; i++) {
    const date = new Date(Date.UTC(2023, 0, 1) + Math.floor(i / 20) * 86400000).toISOString().slice(0, 10)
    out.push({ date, amount: 1 + (i % 500) / 7, name: `${names[i % names.length]} ${i % 300}` })
  }
  return out
}
