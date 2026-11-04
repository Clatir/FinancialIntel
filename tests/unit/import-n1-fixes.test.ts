import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { inboxItems } from '@shared/calc/inbox'
import { createDefaultSettings } from '@shared/defaults'
import { deletedBankRows, returnedKey, returnedOf, type DeletedVersion } from '@shared/import/deleted'
import { accountForNumber, accountNumberOf, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { buildImport, keysOnly, planImport, type ImportChoices, type ImportPlan } from '@shared/import/reconcile'
import { defaultCategoryId, MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const ctx = (over: { accountNumbers?: Record<string, string>; docked?: ReadonlySet<string> } = {}) => ({ rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings.categories), ...over })
const GROCERIES = defaultCategoryId(1, 1)
const HOME = defaultCategoryId(2, 1)
const WALLET = XTB_WALLET_ACCOUNT_ID
let seq = 0
const makeId = () => `01KN1${String(++seq).padStart(21, '0')}`
const zl = (v: number) => Math.round(v * 100)

const CARD = 'ZAKUP PRZY UŻYCIU KARTY W KRAJU'
const NUMBER = '11 1111 1111 1111 1111 1111 1111'
/** One purchase as the two files of mBank write it: the list of operations names first, the account history the type of operation first. */
type Buy = { date: string; amount: number; name: string; pending?: boolean }
const rowOf = (b: Buy, format: MbankFile['format']): MbankRow => ({
  line: 1,
  date: b.date,
  description: format === 'lista' ? `${b.name} ${CARD}` : `${CARD} ${b.name}`,
  operation: CARD,
  counterparty: b.name,
  title: '',
  accountNo: '',
  category: '',
  amount: -zl(b.amount),
  pending: !!b.pending,
  balanceAfter: null
})
const fileOf = (format: MbankFile['format'], buys: Buy[], period: { from: string; to: string } | null = { from: '2026-10-19', to: '2026-10-26' }, account: string | null = `eKonto - ${NUMBER}`): MbankFile => ({
  format,
  client: 'JAN KAPITAN',
  account,
  period,
  rows: buys.map((b) => rowOf(b, format)),
  skipped: []
})
const choicesOf = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
const statuses = (plan: ImportPlan) => plan.rows.map((p) => p.status)

/** An import with the decisions as proposed (and `choices`): the operations after it. */
function run(plan: ImportPlan, existing: readonly Transaction[], now: string, choices: ImportChoices = choicesOf()) {
  const result = buildImport(plan, choices, { now, makeId, rules: [] })
  const byId = new Map(existing.map((t) => [t.id, t]))
  for (const t of result.update) byId.set(t.id, t)
  for (const id of result.remove) byId.delete(id)
  for (const t of result.create) byId.set(t.id, t)
  return { result, after: [...byId.values()] }
}
const imported = (file: MbankFile, account: string, existing: readonly Transaction[], now: string, over: Parameters<typeof ctx>[0] = {}) => run(planImport(file, account, existing, ctx(over)), existing, now).after
/** The user's deletion of operations, as the history keeps it. */
const deletion = (txs: readonly Transaction[], savedAt: string): DeletedVersion[] => txs.map((t) => ({ id: t.id, savedAt, reason: 'delete', record: t }))

const WEEK: Buy[] = [
  { date: '2026-10-20', amount: 87.91, name: 'SLUSARZ KOWAL' },
  { date: '2026-10-22', amount: 12.4, name: 'KIOSK RUCH' },
  { date: '2026-10-25', amount: 31.95, name: 'ZABKA Z1234' }
]
const T1 = '2026-10-26T18:00:00.000Z'
const T2 = '2026-10-27T18:00:00.000Z'
const T3 = '2026-10-28T18:00:00.000Z'

describe('AP-2 (AF-1): usunięta operacja nie wraca z plikiem drugiego formatu', () => {
  it('historia → usunięta → lista: wiersz „usunięty przez Ciebie” (nie nowy); „importuj mimo to” – wchodzi; inna operacja tej kwoty poza okresem – nowa', () => {
    const history = imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1)
    const zabka = history.find((t) => t.counterparty === 'ZABKA Z1234')!
    const left = history.filter((t) => t !== zabka)
    const { keys, rows } = deletedBankRows(deletion([zabka], T2), left, new Set())
    expect(rows).toEqual([{ accountId: MBANK_ACCOUNT_ID, date: '2026-10-25', amount: -zl(31.95), name: 'ZABKA Z1234', deletedAt: T2, format: 'historia' }])
    const lista = fileOf('lista', WEEK)
    const plan = planImport(lista, MBANK_ACCOUNT_ID, left, ctx(), keys, rows)
    expect(statuses(plan)).toEqual(['known', 'known', 'deleted'])
    expect(plan.rows[2]).toMatchObject({ status: 'deleted', other: true })
    expect(run(plan, left, T3).result.counts).toMatchObject({ created: 0, skipped: 1 })
    // Brought back on purpose.
    expect(run(plan, left, T3, choicesOf({ restoreDeleted: { [plan.rows[2]!.key]: true } })).result.create.map((t) => t.counterparty)).toEqual(['ZABKA Z1234'])
    // Without the deleted one's description (as before 1.15.5): it came back as new.
    expect(statuses(planImport(lista, MBANK_ACCOUNT_ID, left, ctx(), keys))).toEqual(['known', 'known', 'new'])
    // The same purchase a week later is another one; a list not covering the deleted one's day does not hide its row.
    const later = fileOf('lista', [{ ...WEEK[2]!, date: '2026-11-01' }], { from: '2026-10-29', to: '2026-11-02' })
    expect(statuses(planImport(later, MBANK_ACCOUNT_ID, left, ctx(), keys, rows))).toEqual(['new'])
    const next = fileOf('lista', [{ ...WEEK[2]!, date: '2026-10-27' }], { from: '2026-10-27', to: '2026-11-02' })
    expect(statuses(planImport(next, MBANK_ACCOUNT_ID, left, ctx(), keys, rows))).toEqual(['new'])
  })

  it('klucze drugiego formatu usuniętej (altKeys) – wiersz pliku rozpoznany po kluczu; usunięta tego samego formatu – tylko po kluczu', () => {
    const history = imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1)
    // The list after the history: its keys remembered on the operations (B5).
    const both = imported(fileOf('lista', WEEK), MBANK_ACCOUNT_ID, history, T2)
    const zabka = both.find((t) => t.counterparty === 'ZABKA Z1234')!
    expect(zabka.bank!.altKeys).toHaveLength(1)
    const left = both.filter((t) => t !== zabka)
    const { keys, rows } = deletedBankRows(deletion([zabka], T3), left, new Set())
    expect(keys.has(zabka.bank!.altKeys![0]!)).toBe(true)
    const plan = planImport(fileOf('lista', WEEK), MBANK_ACCOUNT_ID, left, ctx(), keys, rows)
    expect(plan.rows[2]).toMatchObject({ status: 'deleted' })
    expect(plan.rows[2]).not.toHaveProperty('other')
    // A deleted one of the file's own format is matched by its key only: another purchase of the shop two days later
    // in a history (not in the budget yet) comes in.
    const gone = deletedBankRows(deletion([history.find((t) => t.counterparty === 'KIOSK RUCH')!], T3), [], new Set())
    const kiosk = fileOf('historia', [{ ...WEEK[1]!, date: '2026-10-24' }])
    expect(statuses(planImport(kiosk, MBANK_ACCOUNT_ID, [], ctx(), gone.keys, gone.rows))).toEqual(['new'])
  })

  it('operacja tego formatu w budżecie zabiera swoją usuniętą – inny zakup tego sklepu wchodzi; format starego importu z głosów (także usuniętych)', () => {
    // Both formats imported before 1.4.2 (no format written): the user deleted the history's copy by hand.
    const legacy = (txs: Transaction[]) => txs.map((t) => ({ ...t, bank: { ...t.bank!, source: undefined } }))
    const history = legacy(imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1))
    const lista = legacy(imported(fileOf('lista', WEEK), MBANK_ACCOUNT_ID, [], T2))
    const copy = history.find((t) => t.counterparty === 'ZABKA Z1234')!
    const existing = [...history.filter((t) => t !== copy), ...lista]
    const { keys, rows } = deletedBankRows(deletion([copy], T3), existing, new Set())
    expect(rows.map((r) => r.format)).toEqual(['historia'])
    // A list again, with one more purchase of the shop the next day: the list's own operation takes the deleted copy.
    const again = fileOf('lista', [...WEEK, { date: '2026-10-26', amount: 31.95, name: 'ZABKA Z1234' }])
    expect(statuses(planImport(again, MBANK_ACCOUNT_ID, existing, ctx(), keys, rows))).toEqual(['known', 'known', 'known', 'new'])
  })

  it('usunięte przez import (paczka – zniknięte nierozliczone, kopie z innego konta) to nie usunięcie użytkownika: tylko ich klucze', () => {
    const history = imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1)
    const zabka = history.find((t) => t.counterparty === 'ZABKA Z1234')!
    const { keys, rows } = deletedBankRows(deletion([zabka], T2), [], new Set([zabka.id]))
    expect([keys.has(zabka.bank!.key), rows]).toEqual([true, []])
    // Taken back with its import (F4): nothing at all.
    expect(deletedBankRows([{ ...deletion([zabka], T2)[0]!, reason: 'undo' }], [], new Set())).toEqual({ keys: new Set(), rows: [] })
  })
})

describe('AP-2 (AF-1): meldunek – operacje, które już wróciły (przed 1.15.5)', () => {
  /** The history imported, ZABKA deleted, then the list as 1.15.4 imported it (the deleted one's row as new). */
  function returnedCase() {
    const history = imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1)
    const zabka = history.find((t) => t.counterparty === 'ZABKA Z1234')!
    const left = history.filter((t) => t !== zabka)
    const { keys, rows } = deletedBankRows(deletion([zabka], T2), left, new Set())
    const after = imported(fileOf('lista', WEEK), MBANK_ACCOUNT_ID, left, T3)
    const back = after.find((t) => t.counterparty === 'ZABKA Z1234')!
    return { keys, rows, after, back, left }
  }

  it('wiersz listy usuniętej z historii, zaimportowany po usunięciu – meldunek; „zostaw” i operacje sprzed usunięcia – nie', () => {
    const { rows, after, back, left } = returnedCase()
    expect(returnedOf(after, rows).map((r) => [r.tx.id, r.deleted.date])).toEqual([[back.id, '2026-10-25']])
    expect(returnedOf(after, rows, { [returnedKey(back.id)]: T3 })).toEqual([])
    // Imported before the deletion (both formats before 1.4.2, one copy deleted): no operation that came back.
    const earlier = '2026-10-26T10:00:00.000Z'
    expect(returnedOf(after.map((t) => (t.id === back.id ? { ...t, createdAt: earlier, bank: { ...t.bank!, importedAt: earlier } } : t)), rows)).toEqual([])
    // The same format as the deleted one, or a day outside its import's days: not its row.
    expect(returnedOf([...left, { ...back, bank: { ...back.bank!, source: 'historia' } }], rows)).toEqual([])
    const later = '2026-10-30T10:00:00.000Z'
    const elsewhere = { ...back, date: '2026-10-27', createdAt: later, bank: { ...back.bank!, importedAt: later } }
    expect(returnedOf([...left, { ...elsewhere, date: back.date }], rows).map((r) => r.tx.id)).toEqual([back.id])
    expect(returnedOf([...left, elsewhere], rows)).toEqual([])
    // The inbox: one report per operation – „Usuń”.
    const items = inboxItems({
      today: '2026-11-04',
      started: true,
      deliveries: [],
      conflicts: 0,
      problems: 0,
      uncategorized: { count: 0, amount: 0, from: null },
      duplicates: 0,
      members: [],
      memberName: () => '',
      confirmations: [],
      loot: { month: null, amount: 0 } as never,
      accountName: () => 'mBank',
      returned: [{ id: back.id, accountId: back.accountId, date: back.date, amount: back.amount, name: 'ZABKA Z1234', deletedAt: T2, cameWith: 'lista' }]
    })
    expect(items).toEqual([
      {
        kind: 'returned',
        key: `returned:${back.id}`,
        ref: back.id,
        text: 'mBank: „ZABKA Z1234” z 25.10.2026, 31,95 zł – usunięta przez Ciebie 27.10.2026, wróciła z importem listy operacji i znowu liczy się w saldzie.',
        action: 'Usuń'
      }
    ])
  })

  it('kolejna lista po meldunku: operacja, która wróciła, jest znana – nic drugi raz, nic „usuniętego”', () => {
    const { keys, rows, after } = returnedCase()
    expect(statuses(planImport(fileOf('lista', WEEK), MBANK_ACCOUNT_ID, after, ctx(), keys, rows))).toEqual(['known', 'known', 'known'])
  })
})

describe('AP-2 (AF-9): ten sam rachunek na dwóch kontach budżetu', () => {
  const withNumber = { accountNumbers: { [MBANK_ACCOUNT_ID]: accountNumberOf(NUMBER)! } }

  it('historia na mBanku, lista na Portfel XTB (ten sam numer): „na innym koncie”, nie nowe; przeniesienie tylko po zaznaczeniu', () => {
    const history = imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1, withNumber)
    const lista = fileOf('lista', WEEK)
    const plan = planImport(lista, WALLET, history, ctx(withNumber))
    expect(plan.rows.map((p) => [p.status, p.status === 'elsewhere' && p.move, p.status === 'elsewhere' && p.other])).toEqual([
      ['elsewhere', false, true],
      ['elsewhere', false, true],
      ['elsewhere', false, true]
    ])
    expect(run(plan, history, T2).result).toMatchObject({ create: [], update: [], counts: { known: 3, moved: 0 } })
    // Another bank account there (numbers differ) – or no number known: the operations of each are their own.
    expect(statuses(planImport(lista, WALLET, history, ctx({ accountNumbers: { [MBANK_ACCOUNT_ID]: '22222222222222222222222222' } })))).toEqual(['new', 'new', 'new'])
    expect(statuses(planImport(fileOf('lista', WEEK, undefined, null), WALLET, history, ctx(withNumber)))).toEqual(['new', 'new', 'new'])
    // Moved by the user: its own format's key on this account, the file's key beside it – the next list knows it.
    const key = plan.rows[2]!.key
    const moved = run(plan, history, T2, choicesOf({ moveHere: { [key]: true } }))
    expect(moved.result.counts).toMatchObject({ moved: 1, known: 2 })
    const zabka = moved.after.find((t) => t.counterparty === 'ZABKA Z1234')!
    expect([zabka.accountId, zabka.bank!.altKeys?.includes(key)]).toEqual([WALLET, true])
    expect(statuses(planImport(lista, WALLET, moved.after, ctx(withNumber)))[2]).toBe('known')
    expect(statuses(planImport(fileOf('historia', WEEK), WALLET, moved.after, ctx(withNumber)))[2]).toBe('known')
  })

  it('import naprawczy: kopie listy na złym koncie przy operacjach z historii tutaj – „usuń duplikat”, nie „przenieś”; kategoria i notatka przechodzą', () => {
    const history = imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1)
    // The list imported onto the wallet by mistake (no number known – before 1.15.5 the same with one): copies there.
    const wrong = imported(fileOf('lista', WEEK), WALLET, history, T2)
    const copies = wrong.filter((t) => t.accountId === WALLET)
    expect(copies).toHaveLength(3)
    const slusarz = copies.find((t) => t.counterparty === 'SLUSARZ KOWAL')!
    const existing = wrong.map((t) => (t === slusarz ? { ...t, categoryId: HOME, note: 'nożyczki' } : t))
    const plan = planImport(fileOf('lista', WEEK), MBANK_ACCOUNT_ID, existing, ctx())
    expect(plan.rows.map((p) => [p.status, p.status === 'known' && p.copy?.remove])).toEqual([
      ['known', true],
      ['known', true],
      ['known', true]
    ])
    const { result, after } = run(plan, existing, T3)
    expect([result.create, result.counts.copies, result.counts.moved]).toEqual([[], 3, 0])
    expect(after.filter((t) => t.accountId === WALLET)).toEqual([])
    expect(after.filter((t) => t.accountId === MBANK_ACCOUNT_ID)).toHaveLength(3)
    expect(after.find((t) => t.counterparty === 'SLUSARZ KOWAL')).toMatchObject({ accountId: MBANK_ACCOUNT_ID, categoryId: HOME, note: 'nożyczki' })
    // Left by the user: nothing removed, nothing moved – no duplicate either way.
    const kept = run(plan, existing, T3, choicesOf({ removeCopies: { [plan.rows[0]!.key]: false } }))
    expect([kept.result.counts.copies, kept.result.create.length, kept.after.filter((t) => t.accountId === MBANK_ACCOUNT_ID).length]).toEqual([2, 0, 3])
  })

  it('kopia z inną decyzją – nie zaznaczona; zadokowana albo spłacana wpłatą domownika – zostaje zawsze', () => {
    const history = imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1).map((t) => (t.counterparty === 'KIOSK RUCH' ? { ...t, categoryId: GROCERIES } : t))
    const wrong = imported(fileOf('lista', WEEK), WALLET, history, T2)
    const id = (name: string) => wrong.find((t) => t.accountId === WALLET && t.counterparty === name)!.id
    const existing = wrong.map((t) => (t.id === id('KIOSK RUCH') ? { ...t, categoryId: HOME } : t))
    const payer = { ...existing[0]!, id: makeId(), kind: 'income' as const, amount: zl(40), covers: [id('ZABKA Z1234')] }
    const plan = planImport(fileOf('lista', WEEK), MBANK_ACCOUNT_ID, [...existing, payer], ctx({ docked: new Set([id('SLUSARZ KOWAL')]) }))
    const copy = (name: string) => plan.rows.find((p) => p.row.counterparty === name)!
    expect([copy('SLUSARZ KOWAL'), copy('KIOSK RUCH'), copy('ZABKA Z1234')].map((p) => p.status === 'known' && p.copy && [p.copy.remove, p.copy.conflict, p.copy.blocked])).toEqual([
      [false, false, 'docked'],
      [false, true, null],
      [false, false, 'covered']
    ])
    const all = Object.fromEntries(plan.rows.map((p) => [p.key, true]))
    expect(run(plan, existing, T3, choicesOf({ removeCopies: all })).result.remove).toEqual([id('KIOSK RUCH')])
  })

  it('konto importu po numerze rachunku: konto, na które trafiały pliki tego rachunku – z dwóch to z importem mBanku; numer nieznany – wybrane wcześniej', () => {
    const accounts = settings.accounts
    const n = accountNumberOf(NUMBER)!
    expect(accountForNumber(accounts, { [MBANK_ACCOUNT_ID]: n }, n, WALLET)).toBe(MBANK_ACCOUNT_ID)
    // After a file imported onto the wallet by mistake both have the number: the account with the mBank import.
    expect(accountForNumber(accounts, { [MBANK_ACCOUNT_ID]: n, [WALLET]: n }, n, WALLET)).toBe(MBANK_ACCOUNT_ID)
    expect(accountForNumber(accounts, { [WALLET]: n }, n, MBANK_ACCOUNT_ID)).toBe(WALLET)
    expect(accountForNumber(accounts, { [MBANK_ACCOUNT_ID]: n }, '22222222222222222222222222', WALLET)).toBeNull()
    expect(accountForNumber(accounts, { [MBANK_ACCOUNT_ID]: n }, null, WALLET)).toBeNull()
    // An archived account is never chosen.
    expect(accountForNumber(accounts.map((a) => (a.id === MBANK_ACCOUNT_ID ? { ...a, archived: true } : a)), { [MBANK_ACCOUNT_ID]: n }, n, WALLET)).toBeNull()
  })
})

describe('AP-2 (AF-28, AF-63): klucz nierozliczonej po rozliczeniu, „bez zmian” bez kopii', () => {
  it('starsza lista po rozliczeniu: rozliczona operacja zna klucz swojego wiersza nierozliczonego – nic drugi raz', () => {
    const pending = fileOf('lista', [{ date: '2026-10-24', amount: 23.5, name: 'ZABKA Z1234', pending: true }])
    const first = imported(pending, MBANK_ACCOUNT_ID, [], T1)
    const settled = fileOf('lista', [{ date: '2026-10-25', amount: 24.91, name: 'ZABKA Z1234' }])
    const plan = planImport(settled, MBANK_ACCOUNT_ID, first, ctx())
    expect(statuses(plan)).toEqual(['settle'])
    const after = run(plan, first, T2).after
    expect(after[0]!.bank!.altKeys).toEqual([first[0]!.bank!.key])
    expect(statuses(planImport(pending, MBANK_ACCOUNT_ID, after, ctx()))).toEqual(['known'])
  })

  it('zmiana importu, która tylko zapamiętuje klucze drugiego formatu, nie jest zmianą widoczną (bez kopii i paczki)', () => {
    const history = imported(fileOf('historia', WEEK), MBANK_ACCOUNT_ID, [], T1)
    const { result } = run(planImport(fileOf('lista', WEEK), MBANK_ACCOUNT_ID, history, ctx()), history, T2)
    expect(result.update).toHaveLength(3)
    const before = new Map(history.map((t) => [t.id, t]))
    expect(result.update.every((t) => keysOnly(before.get(t.id), t))).toBe(true)
    expect(keysOnly(before.get(result.update[0]!.id), { ...result.update[0]!, categoryId: GROCERIES })).toBe(false)
    expect(keysOnly(undefined, result.update[0]!)).toBe(false)
  })
})
