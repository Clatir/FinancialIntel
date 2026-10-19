import { describe, expect, it } from 'vitest'
import { balanceAt, confirmedChanges, confirmedPeriodOf } from '@shared/calc/balances'
import { computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { balancesAt } from '@shared/calc/intel'
import { accountAmounts, amountOn, categoryIndex, dateOn, isTwoSided, touchesAccount } from '@shared/calc/operations'
import { openingFromNow } from '@shared/calc/start'
import { joinTransfer, transferIssues, withBothSides } from '@shared/calc/transfers'
import { createDefaultSettings } from '@shared/defaults'
import type { MbankFile, MbankRow } from '@shared/import/mbank'
import { buildImport, isSideView, planImport, realOf, type ImportChoices } from '@shared/import/reconcile'
import { statementCheck } from '@shared/import/statement'
import { balanceSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type BankRow, type Settings, type Transaction } from '@shared/schema'

const AT = '2026-10-01T00:00:00.000Z'
const NOW = '2026-10-17T09:00:00.000Z'
const zl = (v: number) => Math.round(v * 100)
let seq = 0
const nextId = () => `01K7T00000000000000000${String(++seq).padStart(4, '0')}`
/** A second account of the budget with its own file from the bank (savings). */
const SAVINGS = '01K7T00000000000000000SAV1'
const A = MBANK_ACCOUNT_ID
const B = SAVINGS

const settings = (): Settings => {
  const s = createDefaultSettings(AT).settings
  return { ...s, accounts: [...s.accounts, { id: SAVINGS, name: 'Oszczędności', kind: 'bank', importFormat: 'mbank', archived: false }] }
}
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: A, amount, ...over })
const bank = (key: string, over: Partial<BankRow> = {}): BankRow => ({ format: 'mbank', key, description: `opis ${key}`, counterparty: 'JAN KAPITAN', operation: 'PRZELEW WŁASNY', category: '', pending: false, importedAt: AT, source: 'lista', ...over })
/** A transfer A → B in one operation (F10). */
const both = (date: string, amount: number, over: Partial<Transaction> = {}) => tx(date, amount, { kind: 'transfer', counterAccountId: B, bothSides: true, ...over })
/** A transfer of before 1.7.0: this side only. */
const leg = (date: string, amount: number, over: Partial<Transaction> = {}) => tx(date, amount, { kind: 'transfer', ...over })
const opening = (accountId: string, date: string, amount: number) => balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, accountId, date, kind: 'opening', amount })
const confirmation = (accountId: string, date: string, amount: number) => balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, accountId, date, kind: 'confirmation', amount })

function fleet(input: Partial<FleetInput> & { now: string }): FleetState {
  const state = computeFleet({ settings: settings(), transactions: [], ...input })
  // Every złoty on the accounts is in exactly one layer – a transfer in one operation too.
  if (state.started) expect(layersSum(state)).toBe(state.total)
  return state
}
const balanceOf = (s: FleetState, id: string) => s.accounts.find((a) => a.id === id)?.balance ?? 0
/** What the layers hold (the shields and the hull carry a transfer's money, if any). */
const layersOf = (s: FleetState) => ({ shields: s.shields.amount, hull: s.hull.amount, total: layersSum(s) })

const OWN = 'PRZELEW WŁASNY'
const row = (o: Partial<MbankRow> & Pick<MbankRow, 'date' | 'amount'>): MbankRow => {
  const operation = o.operation ?? OWN
  const counterparty = o.counterparty ?? 'JAN KAPITAN'
  return { line: 1, description: o.description ?? `${counterparty} ${operation} ${o.amount}`, operation, counterparty, title: '', accountNo: '', category: '', pending: false, balanceAfter: null, ...o }
}
const file = (rows: MbankRow[], format: MbankFile['format'] = 'lista', period: MbankFile['period'] = null): MbankFile => ({ format, client: null, account: null, period, rows, skipped: [] })
const ctx = () => ({ rules: [], ownNames: ['JAN KAPITAN'], categories: categoryIndex(settings().categories) })
const choices = (over: Partial<ImportChoices> = {}): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, ...over })
/** An import of `f` into account `account`: the plan and the operations after it. */
function imported(f: MbankFile, account: string, existing: Transaction[], c: ImportChoices = choices(), deletedKeys: ReadonlySet<string> = new Set()) {
  const plan = planImport(f, account, existing, ctx(), deletedKeys)
  const result = buildImport(plan, c, { now: NOW, makeId: nextId, rules: [], accounts: settings().accounts.map((a) => a.id) })
  const byId = new Map(existing.map((t) => [t.id, t]))
  for (const t of result.update) byId.set(t.id, t)
  for (const id of result.remove) byId.delete(id)
  for (const t of result.create) byId.set(t.id, t)
  return { plan, result, after: [...byId.values()] }
}

describe('przelew między kontami jako jedna operacja (1.7.0, F10, D87)', () => {
  it('obie strony w jednej operacji: kwota na koncie źródłowym, przeciwna na docelowym – warstwy bez zmian; strona sprzed 1.7.0 – tylko swoje konto', () => {
    const t = both('2026-10-05', -zl(500))
    expect(isTwoSided(t)).toBe(true)
    expect(accountAmounts(t)).toEqual([
      [A, -zl(500), '2026-10-05'],
      [B, zl(500), '2026-10-05']
    ])
    expect([amountOn(t, A), amountOn(t, B), amountOn(t, XTB_WALLET_ACCOUNT_ID)]).toEqual([-zl(500), zl(500), 0])
    expect([touchesAccount(t, B), touchesAccount(t, XTB_WALLET_ACCOUNT_ID)]).toEqual([true, false])
    // Another kind, the same account on both sides or no other account: one side.
    expect(isTwoSided({ ...t, kind: 'expense' })).toBe(false)
    expect(isTwoSided({ ...t, counterAccountId: A })).toBe(false)
    expect(isTwoSided({ ...t, counterAccountId: null })).toBe(false)
    expect(isTwoSided({ ...t, bothSides: undefined })).toBe(false)

    const balances = [opening(A, '2026-10-01', zl(2000)), opening(B, '2026-10-01', zl(100))]
    const start = { settings: { ...settings(), budget: { ...settings().budget, start: '2026-10-01' } }, balances, now: '2026-10-10T12:00:00+02:00' }
    const one = fleet({ ...start, transactions: [t] })
    expect([balanceOf(one, A), balanceOf(one, B)]).toEqual([zl(1500), zl(600)])
    const none = fleet({ ...start, transactions: [] })
    expect(layersOf(one)).toEqual(layersOf(none))
    // Before 1.7.0: the side of its own account – the money left the budget's view of that account.
    const old = fleet({ ...start, transactions: [{ ...t, bothSides: undefined }] })
    expect([balanceOf(old, A), balanceOf(old, B)]).toEqual([zl(1500), zl(100)])
    expect(old.shields.amount).toBe(none.shields.amount - zl(500))
  })

  it('druga strona przed saldem otwarcia swojego konta się nie liczy (jak każda operacja tego konta) – osłony widzą przelew poza liczony budżet', () => {
    const t = both('2026-10-05', -zl(500))
    const settingsStarted = { ...settings(), budget: { ...settings().budget, start: '2026-10-01' } }
    const s = fleet({ settings: settingsStarted, balances: [opening(A, '2026-10-01', zl(2000)), opening(B, '2026-10-06', zl(900))], transactions: [t], now: '2026-10-10T12:00:00+02:00' })
    expect([balanceOf(s, A), balanceOf(s, B)]).toEqual([zl(1500), zl(900)])
    const without = fleet({ settings: settingsStarted, balances: [opening(A, '2026-10-01', zl(2000)), opening(B, '2026-10-06', zl(900))], transactions: [], now: '2026-10-10T12:00:00+02:00' })
    expect(s.shields.amount).toBe(without.shields.amount - zl(500))
  })

  it('druga strona zaksięgowana innego dnia (counterDate): salda dnia, krzywa majątku i saldo „teraz” biorą jej dzień', () => {
    const t = both('2026-10-05', -zl(500), { counterDate: '2026-10-07' })
    expect([dateOn(t, A), dateOn(t, B)]).toEqual(['2026-10-05', '2026-10-07'])
    const bal = [opening(A, '2026-10-01', zl(1000)), opening(B, '2026-10-01', 0)]
    expect(balanceAt(B, '2026-10-06', [t], bal)).toBe(0)
    expect(balanceAt(B, '2026-10-07', [t], bal)).toBe(zl(500))
    expect(balanceAt(A, '2026-10-05', [t], bal)).toBe(zl(500))
    // The wealth curve: on the 6th the money is in flight (left A, not on B yet).
    const curve = balancesAt(['2026-10-05', '2026-10-06', '2026-10-07'], [t], bal, [], '2026-10-10')
    expect(curve).toEqual([zl(500), zl(500), zl(1000)])
    // The balance read in the bank now (the kreator): an operation of today on this account comes off – by its side's day.
    expect(openingFromNow(B, zl(800), '2026-10-07', [t])).toBe(zl(300))
    expect(openingFromNow(B, zl(800), '2026-10-05', [t])).toBe(zl(800))
  })

  it('strony po dwóch stronach startu budżetu albo dzisiejszego dnia: każda rusza warstwy w swoim dniu – suma warstw zawsze równa saldom (przegląd S)', () => {
    const started = { ...settings(), budget: { ...settings().budget, start: '2026-10-01' } }
    const bal = [opening(A, '2026-09-01', zl(10000)), opening(B, '2026-09-01', 0)]
    // `fleet` checks the sum of the layers against the balances each time.
    const run = (transactions: Transaction[]) => fleet({ settings: started, balances: bal, transactions, now: '2026-10-10T12:00:00+02:00' })
    // Its own side before the start (in the start's money), the other after it: that money comes in on its day.
    const before = run([both('2026-09-30', -zl(500), { counterDate: '2026-10-02' })])
    expect([balanceOf(before, A), balanceOf(before, B), before.total]).toEqual([zl(9500), zl(500), zl(10000)])
    const log = before.log.filter((e) => e.kind === 'transfer')
    expect(log.map((e) => [e.date, e.moves.shields])).toEqual([['2026-10-02', zl(500)]])
    // The other side after today: on no balance yet – the money in flight is off the shields until its day.
    expect(run([both('2026-10-08', -zl(500), { counterDate: '2026-10-12' })]).total).toBe(zl(9500))
    // The other side before the start (in the start's money), its own after it.
    expect(run([both('2026-10-02', -zl(500), { counterDate: '2026-09-30' })]).total).toBe(zl(10000))
    // Its own side after today, the other one booked already.
    expect(run([both('2026-10-12', -zl(500), { counterDate: '2026-10-09' })]).total).toBe(zl(10500))
  })

  it('telemetria z banku: wiersz drugiego konta połączony z przelewem nie jest „brakującym” ani „dodatkowym”, kwota – jego strona', () => {
    const t = both('2026-10-05', -zl(500), { counterBank: bank('k-b') })
    const st = { accountId: B, rows: [{ date: '2026-10-05', booked: '2026-10-05', name: 'JAN KAPITAN', amount: zl(500), key: 'k-b', balance: zl(500), txId: t.id }], start: 0, end: { date: '2026-10-05', balance: zl(500) }, gaps: [] }
    const check = statementCheck(st, { transactions: [t], balances: [opening(B, '2026-10-01', 0)], tx: (id) => (id === t.id ? t : undefined) })
    expect(check.missing).toEqual([])
    expect(check.extra).toEqual([])
    expect(check.amounts).toEqual([])
  })
})

describe('import łączy drugą stronę przelewu (F10)', () => {
  it('plik drugiego konta: wiersz o kwocie przelewu ±3 dni dołącza do niego – bez nowej operacji; ponowny import go zna', () => {
    const t = both('2026-10-05', -zl(500), { bank: bank('k-a') })
    const f = file([row({ date: '2026-10-06', amount: zl(500) })])
    const { plan, result, after } = imported(f, B, [t])
    expect(plan.rows).toMatchObject([{ status: 'merge', side: 'other' }])
    const p = plan.rows[0] as Extract<(typeof plan.rows)[number], { status: 'merge' }>
    // The plan sees the transfer's side here; the import writes the operation.
    expect(isSideView(p.tx)).toBe(true)
    expect([p.tx.accountId, p.tx.amount, realOf(p.tx)]).toEqual([B, zl(500), t])
    expect(result.create).toEqual([])
    expect(result.counts).toMatchObject({ sides: 1, merged: 0, created: 0 })
    const joined = after.find((x) => x.id === t.id)!
    expect(joined).toMatchObject({ accountId: A, amount: -zl(500), bothSides: true, counterAccountId: B, counterDate: '2026-10-06', counterBank: { key: p.key, pending: false } })
    expect(joined.bank).toEqual(t.bank)
    // The same file again: its row is known by the other side's key.
    const again = imported(f, B, after)
    expect(again.plan.rows).toMatchObject([{ status: 'known' }])
    expect(again.result.update).toEqual([])
    expect(again.result.create).toEqual([])
  })

  it('„Nie łącz”: wiersz wchodzi osobno (jak decyzja grupy); kwota inna niż przelewu albo za daleko – nie łączy', () => {
    const t = both('2026-10-05', -zl(500))
    const f = file([row({ date: '2026-10-06', amount: zl(500) })])
    const first = imported(f, B, [t])
    const apart = imported(f, B, [t], choices({ noMerge: { [first.plan.rows[0]!.key]: true } }))
    expect(apart.result.create).toHaveLength(1)
    expect(apart.result.update).toEqual([])
    expect(imported(file([row({ date: '2026-10-06', amount: zl(499) })]), B, [t]).plan.rows[0]!.status).toBe('new')
    expect(imported(file([row({ date: '2026-10-09', amount: zl(500) })]), B, [t]).plan.rows[0]!.status).toBe('new')
    // The other direction: a row of the source account's money (−500 on B) is not this transfer's side.
    expect(imported(file([row({ date: '2026-10-06', amount: -zl(500) })]), B, [t]).plan.rows[0]!.status).toBe('new')
  })

  it('nierozliczona druga strona rozliczona z innym opisem: zmienia tylko wiersz drugiej strony (ta sama kwota)', () => {
    const t = both('2026-10-05', -zl(500), { counterBank: bank('k-pending', { pending: true, description: 'JAN KAPITAN PRZELEW WŁASNY' }) })
    const f = file([row({ date: '2026-10-05', amount: zl(500), description: 'JAN KAPITAN PRZELEW WŁASNY ZAKSIĘGOWANY' })])
    const { plan, result } = imported(f, B, [t])
    expect(plan.rows).toMatchObject([{ status: 'settle' }])
    expect(result.update).toHaveLength(1)
    const u = result.update[0]!
    expect(u).toMatchObject({ id: t.id, accountId: A, amount: -zl(500), date: '2026-10-05', counterBank: { pending: false, description: 'JAN KAPITAN PRZELEW WŁASNY ZAKSIĘGOWANY' } })
    expect(u.counterDate).toBeUndefined()
    // Another amount: never the transfer's side.
    expect(imported(file([row({ date: '2026-10-05', amount: zl(480), description: 'JAN KAPITAN PRZELEW WŁASNY ZAKSIĘGOWANY' })]), B, [t]).plan.rows[0]!.status).not.toBe('settle')
  })

  it('nierozliczona druga strona, której lista już nie ma, nie jest proponowana do usunięcia (usunęłaby cały przelew)', () => {
    const t = both('2026-10-05', -zl(500), { counterBank: bank('k-gone', { pending: true }) })
    const f = file([row({ date: '2026-10-06', amount: -zl(20), operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU', counterparty: 'SKLEP' })], 'lista', { from: '2026-10-01', to: '2026-10-10' })
    expect(imported(f, B, [t]).plan.vanished).toEqual([])
    // An own pending operation of the account is still offered.
    const own = tx('2026-10-05', -zl(30), { accountId: B, bank: bank('k-own', { pending: true }) })
    expect(imported(f, B, [t, own]).plan.vanished.map((x) => x.id)).toEqual([own.id])
  })

  it('przelew sprzed 1.7.0 nazywający to konto staje się jedną operacją z wierszem tego konta', () => {
    const old = leg('2026-10-05', -zl(500), { counterAccountId: B, bank: bank('k-a') })
    const { plan, result, after } = imported(file([row({ date: '2026-10-05', amount: zl(500) })]), B, [old])
    expect(plan.rows).toMatchObject([{ status: 'merge', side: 'legacy' }])
    expect(result.counts.sides).toBe(1)
    expect(after.find((x) => x.id === old.id)).toMatchObject({ bothSides: true, counterAccountId: B, accountId: A, amount: -zl(500), bank: old.bank, counterBank: { key: plan.rows[0]!.key } })
  })

  it('przelew sprzed 1.7.0 bez konta (import go nie oferował): tylko wiersz, który bank nazywa przelewem własnym – nie pensja tej samej kwoty', () => {
    const old = leg('2026-10-05', -zl(500), { bank: bank('k-a') })
    const own = imported(file([row({ date: '2026-10-06', amount: zl(500) })]), B, [old])
    expect(own.plan.rows).toMatchObject([{ status: 'merge', side: 'legacy' }])
    expect(own.after.find((x) => x.id === old.id)).toMatchObject({ bothSides: true, counterAccountId: B })
    const salary = imported(file([row({ date: '2026-10-06', amount: zl(500), operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', counterparty: 'FIRMA SP Z O O' })]), B, [old])
    expect(salary.plan.rows[0]!.status).toBe('new')
  })

  it('stary przelew z własną stroną na tym koncie (para sprzed 1.7.0) nie jest drugą stroną; wiersz usuniętej operacji – też nie', () => {
    const a = leg('2026-10-05', -zl(500), { counterAccountId: B, bank: bank('k-a') })
    const b = leg('2026-10-05', zl(500), { accountId: B, counterAccountId: A })
    const plan = imported(file([row({ date: '2026-10-05', amount: zl(500), counterparty: 'KTOŚ', operation: 'PRZELEW WŁASNY' })]), B, [a, b]).plan
    expect(plan.rows[0]).not.toMatchObject({ side: expect.anything() })
    const t = both('2026-10-05', -zl(500))
    const f = file([row({ date: '2026-10-05', amount: zl(500) })])
    const key = planImport(f, B, [], ctx()).rows[0]!.key
    expect(imported(f, B, [t], choices(), new Set([key])).plan.rows[0]!.status).toBe('deleted')
  })

  it('nowy przelew własny na konto budżetu – jedna operacja dla obu stron; na konto spoza budżetu albo nieznane – jedna strona', () => {
    const f = file([row({ date: '2026-10-05', amount: -zl(300) })])
    const plan = planImport(f, A, [], ctx())
    const decide = (counterAccountId: string | null, accounts?: string[]) =>
      buildImport(plan, choices({ rows: { [plan.rows[0]!.key]: { kind: 'transfer', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId } } }), { now: NOW, makeId: nextId, rules: [], accounts })
        .create[0]!
    expect(decide(XTB_WALLET_ACCOUNT_ID, [A, XTB_WALLET_ACCOUNT_ID])).toMatchObject({ kind: 'transfer', counterAccountId: XTB_WALLET_ACCOUNT_ID, bothSides: true })
    expect(decide(null, [A, XTB_WALLET_ACCOUNT_ID]).bothSides).toBeUndefined()
    expect(decide('01K7T00000000000000000GXNE', [A, XTB_WALLET_ACCOUNT_ID]).bothSides).toBeUndefined()
    expect(decide(A, [A]).bothSides).toBeUndefined()
  })
})

describe('przelewy sprzed 1.7.0 w meldunkach (F10)', () => {
  const ACCOUNTS = new Set([A, B, XTB_WALLET_ACCOUNT_ID])

  it('dwie strony jednego przelewu (z kontem albo bez) – para; strona nazywająca trzecie konto – nie; najbliższe dni najpierw', () => {
    const out = leg('2026-10-05', -zl(500), { counterAccountId: B })
    const into = leg('2026-10-06', zl(500), { accountId: B })
    const far = leg('2026-10-09', zl(500), { accountId: B })
    expect(transferIssues([out, into, far], ACCOUNTS).filter((i) => i.kind === 'pair')).toEqual([{ kind: 'pair', keep: out, drop: into }])
    const u1 = leg('2026-10-10', -zl(70))
    const u2 = leg('2026-10-10', zl(70), { accountId: B })
    expect(transferIssues([u1, u2], ACCOUNTS)).toEqual([{ kind: 'pair', keep: u1, drop: u2 }])
    const third = leg('2026-10-10', zl(70), { accountId: B, counterAccountId: XTB_WALLET_ACCOUNT_ID })
    expect(transferIssues([u1, third], ACCOUNTS).filter((i) => i.kind === 'pair')).toEqual([])
    const thirdOut = leg('2026-10-10', -zl(70), { counterAccountId: XTB_WALLET_ACCOUNT_ID })
    expect(transferIssues([thirdOut, u2], ACCOUNTS).filter((i) => i.kind === 'pair')).toEqual([])
    // More than 3 days apart: two moves.
    expect(transferIssues([leg('2026-10-20', -zl(90)), leg('2026-10-24', zl(90), { accountId: B })], ACCOUNTS)).toEqual([])
  })

  it('przelew w jednej operacji i osobna strona jego drugiego konta – podwójna; strona bez pary nazywająca konto budżetu – brakująca od pierwszego dnia po potwierdzeniu', () => {
    const t = both('2026-10-05', -zl(500))
    const dup = leg('2026-10-06', zl(500), { accountId: B })
    expect(transferIssues([t, dup], ACCOUNTS)).toEqual([{ kind: 'double', keep: t, drop: dup, date: '2026-10-05', settled: false }])
    expect(transferIssues([t, leg('2026-10-12', zl(500), { accountId: B })], ACCOUNTS)).toEqual([])
    const lone = leg('2026-10-08', -zl(200), { counterAccountId: XTB_WALLET_ACCOUNT_ID })
    expect(transferIssues([lone], ACCOUNTS)).toEqual([{ kind: 'lone', tx: lone }])
    // A correction of a confirmed balance made up for it: from the day after the confirmation only.
    expect(transferIssues([lone], ACCOUNTS, () => '2026-10-09')).toEqual([])
    expect(transferIssues([lone], ACCOUNTS, () => '2026-10-08')).toHaveLength(1)
    // An account outside the budget's list: nothing to add.
    expect(transferIssues([leg('2026-10-08', -zl(200), { counterAccountId: '01K7T00000000000000000GXNE' })], ACCOUNTS)).toEqual([])
  })

  it('połączenie pary nie zmienia sald ani warstw; podwójna – zdjęta druga strona; dopisana strona – drugie konto ma kwotę', () => {
    const out = leg('2026-10-05', -zl(500), { counterAccountId: B, bank: bank('k-a'), note: 'na wakacje' })
    const into = leg('2026-10-06', zl(500), { accountId: B, bank: bank('k-b'), note: 'z konta głównego' })
    const joined = joinTransfer(out, into)
    expect(joined).toMatchObject({ id: out.id, bothSides: true, counterAccountId: B, counterBank: into.bank, counterDate: '2026-10-06', bank: out.bank, note: 'na wakacje · z konta głównego' })
    const balances = [opening(A, '2026-10-01', zl(2000)), opening(B, '2026-10-01', 0)]
    const started = { ...settings(), budget: { ...settings().budget, start: '2026-10-01' } }
    const before = fleet({ settings: started, balances, transactions: [out, into], now: '2026-10-10T12:00:00+02:00' })
    const after = fleet({ settings: started, balances, transactions: [joined], now: '2026-10-10T12:00:00+02:00' })
    expect(after.accounts).toEqual(before.accounts)
    expect(layersOf(after)).toEqual(layersOf(before))
    // A double: the transfer keeps its sides, takes the bank's row of the one-sided one when it has none.
    const t = both('2026-10-05', -zl(500))
    expect(joinTransfer(t, into)).toMatchObject({ id: t.id, counterBank: into.bank, counterDate: '2026-10-06' })
    expect(joinTransfer({ ...t, counterBank: bank('k-x') }, into).counterBank).toMatchObject({ key: 'k-x' })
    expect(withBothSides(leg('2026-10-08', -zl(200), { counterAccountId: B }))).toMatchObject({ bothSides: true, counterAccountId: B })
  })

  it('połączenie nigdy nie przenosi strony przez potwierdzone saldo (F12): dzień strony z banku, chyba że potwierdzenie liczyło inną; obie przed nim – rozliczona', () => {
    const balances = [opening(A, '2026-10-01', zl(2000)), opening(B, '2026-10-01', 0), confirmation(B, '2026-10-05', zl(500))]
    const from = () => '2026-10-06'
    const joinEdits = (keep: Transaction, drop: Transaction, day?: string) =>
      [
        [keep, joinTransfer(keep, drop, day)],
        [drop, null]
      ] as const
    // The side in the confirmed period (05.10), the bank's one-sided one after it (07.10): the side stays.
    const t = both('2026-10-05', -zl(500))
    const after = leg('2026-10-07', zl(500), { accountId: B, bank: bank('k-b') })
    const [d1] = transferIssues([t, after], ACCOUNTS, from)
    expect(d1).toMatchObject({ kind: 'double', date: '2026-10-05', settled: false })
    expect(joinTransfer(t, after, '2026-10-05')).toMatchObject({ counterBank: after.bank })
    expect(joinTransfer(t, after, '2026-10-05').counterDate).toBeUndefined()
    expect(confirmedChanges(joinEdits(t, after, '2026-10-05'), balances)).toEqual([])
    // The bank's day would take the side out of the confirmed balance: −500 zł on 05.10.
    expect(confirmedChanges(joinEdits(t, after), balances)).toEqual([{ accountId: B, date: '2026-10-05', delta: -zl(500) }])
    // The one-sided one in the confirmed period (04.10), the side after it (07.10): the side takes its day.
    const late = both('2026-10-07', -zl(500))
    const early = leg('2026-10-04', zl(500), { accountId: B })
    const [d2] = transferIssues([late, early], ACCOUNTS, from)
    expect(d2).toMatchObject({ kind: 'double', date: '2026-10-04', settled: false })
    expect(confirmedChanges(joinEdits(late, early, '2026-10-04'), balances)).toEqual([])
    // Both before the confirmation – its correction made up for the double: settled (not reported).
    const [d3] = transferIssues([both('2026-10-03', -zl(500)), leg('2026-10-04', zl(500), { accountId: B })], ACCOUNTS, from)
    expect(d3).toMatchObject({ kind: 'double', settled: true })
    // A pair joined moves nothing; a missing side added in the confirmed period moves its balance.
    const out = leg('2026-10-04', -zl(300), { counterAccountId: B })
    const into = leg('2026-10-05', zl(300), { accountId: B })
    expect(confirmedChanges(joinEdits(out, into), balances)).toEqual([])
    expect(confirmedChanges([[out, withBothSides(out)]], balances)).toEqual([{ accountId: B, date: '2026-10-05', delta: zl(300) }])
    // A day after the confirmation: nothing confirmed changes.
    const fresh = leg('2026-10-06', -zl(300), { counterAccountId: B })
    expect(confirmedChanges([[fresh, withBothSides(fresh)]], balances)).toEqual([])
  })
})

describe('ostrzeżenie przy zmianie operacji z potwierdzonego okresu (F12)', () => {
  const balances = [opening(A, '2026-10-01', zl(2000)), confirmation(A, '2026-10-10', zl(1800))]

  it('zmiana kwoty, daty albo konta operacji sprzed potwierdzenia: o ile zmieni potwierdzone saldo; po potwierdzeniu albo przed saldem otwarcia – nic', () => {
    const t = tx('2026-10-05', -zl(45))
    expect(confirmedPeriodOf(t, balances)).toEqual({ accountId: A, date: '2026-10-10' })
    expect(confirmedChanges([[t, { ...t, amount: -zl(90) }]], balances)).toEqual([{ accountId: A, date: '2026-10-10', delta: -zl(45) }])
    // Moved after the confirmation: the confirmed balance loses it.
    expect(confirmedChanges([[t, { ...t, date: '2026-10-12' }]], balances)).toEqual([{ accountId: A, date: '2026-10-10', delta: zl(45) }])
    // Moved within the confirmed period: the same balance at its end.
    expect(confirmedChanges([[t, { ...t, date: '2026-10-08' }]], balances)).toEqual([])
    // Another account (no confirmation there): only this one's.
    expect(confirmedChanges([[t, { ...t, accountId: B }]], balances)).toEqual([{ accountId: A, date: '2026-10-10', delta: zl(45) }])
    // Deleted, or a new one in the period.
    expect(confirmedChanges([[t, null]], balances)).toEqual([{ accountId: A, date: '2026-10-10', delta: zl(45) }])
    expect(confirmedChanges([[null, t]], balances)).toEqual([{ accountId: A, date: '2026-10-10', delta: -zl(45) }])
    // After the confirmation, before the opening: nothing confirmed.
    const after = tx('2026-10-11', -zl(45))
    expect(confirmedPeriodOf(after, balances)).toBeNull()
    expect(confirmedChanges([[after, { ...after, amount: -zl(90) }]], balances)).toEqual([])
    const old = tx('2026-09-20', -zl(45))
    expect(confirmedPeriodOf(old, balances)).toBeNull()
    expect(confirmedChanges([[old, { ...old, amount: 0 }]], balances)).toEqual([])
    // The note, the category: no money moves.
    expect(confirmedChanges([[t, { ...t, note: 'kawa', categoryId: null }]], balances)).toEqual([])
  })

  it('przelew w jednej operacji: obie strony, każda swoim dniem i swoim potwierdzeniem', () => {
    const withB = [...balances, opening(B, '2026-10-01', 0), confirmation(B, '2026-10-03', 0)]
    const t = both('2026-10-05', -zl(100), { counterDate: '2026-10-02' })
    expect(confirmedPeriodOf(t, withB)).toEqual({ accountId: A, date: '2026-10-10' })
    expect(confirmedChanges([[t, { ...t, amount: -zl(150) }]], withB)).toEqual([
      { accountId: A, date: '2026-10-10', delta: -zl(50) },
      { accountId: B, date: '2026-10-03', delta: zl(50) }
    ])
    // The other side moved after its account's confirmation.
    expect(confirmedChanges([[t, { ...t, counterDate: '2026-10-04' }]], withB)).toEqual([{ accountId: B, date: '2026-10-03', delta: -zl(100) }])
  })
})
