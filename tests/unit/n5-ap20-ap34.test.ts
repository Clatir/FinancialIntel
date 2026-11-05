import { describe, expect, it } from 'vitest'
import { anomalies } from '@shared/calc/anomalies'
import { brandStats } from '@shared/calc/drill'
import { logEntries } from '@shared/calc/intel'
import { categoryIndex } from '@shared/calc/operations'
import { CASH_REPAY_TITLE } from '@shared/calc/household'
import { lastAccountOf, typedByHand } from '@shared/calc/quick'
import { tagsLost } from '@shared/calc/tags'
import { createDefaultSettings } from '@shared/defaults'
import type { MbankRow } from '@shared/import/mbank'
import { operationName, readableName } from '@shared/import/names'
import { officerData } from '@shared/import/officer'
import { importGroups, importThemes, planImport, searchGroups } from '@shared/import/reconcile'
import { CASH_ACCOUNT_ID, defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const FOOD = defaultCategoryId(1)
let seq = 0
const nextId = () => `01K9N5000000000000000${String(++seq).padStart(5, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -1000, ...over })
const bank = (over: Partial<NonNullable<Transaction['bank']>> = {}) => ({ format: 'mbank' as const, key: `k:${++seq}`, description: '', counterparty: '', operation: '', category: '', pending: false, importedAt: '2026-10-15T08:00:00.000Z', ...over })

describe('AP-20: nazwy z banku czytelne (OP sp. 10, WY.13, SW sp. 7)', () => {
  it('bankomat: tytuł bez „DATA TRANSAKCJI” i miasta; tytuł wpisany ręcznie bez zmian', () => {
    expect(operationName({ counterparty: '', title: 'BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI: 2026-08-29', bank: {} })).toBe('BANKOMAT EURONET 0412')
    expect(operationName({ counterparty: '', title: 'Rata 05.11.2026' })).toBe('Rata 05.11.2026')
    expect(operationName({ counterparty: ' Mokka ', title: 'x', bank: {} })).toBe('Mokka')
  })

  it('same wielkie litery jak pisze człowiek; skróty i numery zostają; nazwa z małymi literami bez zmian', () => {
    expect(readableName('KEBAB ROMA')).toBe('Kebab Roma')
    expect(readableName('APTEKA DBAM O ZDROWIE')).toBe('Apteka Dbam o Zdrowie')
    expect(readableName('ŻABKA Z1234')).toBe('Żabka Z1234')
    expect(readableName('KFC WARSZAWA')).toBe('KFC Warszawa')
    expect(readableName('COCA-COLA')).toBe('Coca-Cola')
    expect(readableName('Bar pod Lipą')).toBe('Bar pod Lipą')
  })

  it('lista kontrahentów szybkiego wpisu: nazwa wpisana ręcznie przed nazwą z banku, bank bez samych wielkich liter', () => {
    const typed = tx({ counterparty: 'Kebab u Romy', date: '2026-10-01' })
    // The bank's row of the same brand, later – the hand-typed spelling still names it.
    const later = tx({ counterparty: 'KEBAB U ROMY', bank: bank({ counterparty: 'KEBAB U ROMY' }), date: '2026-10-10' })
    const drogeria = tx({ counterparty: 'DROGERIA NATURA', bank: bank({ counterparty: 'DROGERIA NATURA' }), date: '2026-10-09' })
    const names = officerData([typed, later, drogeria], {}).counterparties
    expect(names).toContain('Kebab u Romy')
    expect(names).toContain('Drogeria Natura')
    expect(names).not.toContain('KEBAB U ROMY')
  })

  it('Namierzone cele: nazwa ręczna marki wygrywa z nowszą bankową; bankomat bez daty transakcji', () => {
    const typed = tx({ counterparty: 'Mokka', date: '2026-10-01', categoryId: FOOD })
    const fromBank = tx({ counterparty: 'MOKKA', bank: bank({ counterparty: 'MOKKA' }), date: '2026-10-12', categoryId: FOOD })
    const atm = tx({ title: 'BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI: 2026-10-05', bank: bank({ operation: 'WYPŁATA W BANKOMACIE' }), date: '2026-10-05' })
    const stats = brandStats([typed, fromBank, atm], settings.categories, '2026-10-01', '2026-10-31')
    expect(stats.find((s) => s.count === 2)?.name).toBe('Mokka')
    expect(stats.map((s) => s.name)).toContain('Bankomat Euronet 0412')
    expect(stats.some((s) => s.name.includes('DATA TRANSAKCJI'))).toBe(false)
  })
})

describe('AP-20: ostatnie konto z folderu (SW sp. 8)', () => {
  it('konto ostatnio wpisanej ręcznie operacji (także z innego komputera); import i pusty szkic nic nie mówią', () => {
    const older = tx({ accountId: MBANK_ACCOUNT_ID, createdAt: '2026-10-01T10:00:00.000Z' })
    const newest = tx({ accountId: XTB_WALLET_ACCOUNT_ID, createdAt: '2026-10-03T10:00:00.000Z' })
    const imported = tx({ accountId: CASH_ACCOUNT_ID, createdAt: '2026-10-05T10:00:00.000Z', bank: bank() })
    const draft = tx({ accountId: CASH_ACCOUNT_ID, createdAt: '2026-10-06T10:00:00.000Z', amount: 0 })
    expect(lastAccountOf([older, newest, imported, draft])).toBe(XTB_WALLET_ACCOUNT_ID)
    expect(lastAccountOf([imported])).toBeNull()
  })

  it('operacje zapisane przez samą aplikację nic nie mówią (integracja N5): dokowanie, korekta salda, przelew, pożyczka, ładownia, zwrot gotówką, boja', () => {
    const typed = tx({ accountId: MBANK_ACCOUNT_ID, createdAt: '2026-10-01T10:00:00.000Z' })
    const at = (day: number) => `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`
    // As the app writes them: `walletOperation`, a balance's confirmation, „Zaplanuj przelew własny”, a loan, „Zapłacone”
    // in the cargo hold, „Oddane gotówką”, a buoy's „Wykonaj teraz”.
    const docking = tx({ accountId: XTB_WALLET_ACCOUNT_ID, kind: 'trading', amount: 50000, counterparty: 'XTB', title: 'Wypłata z ICTTJ', createdAt: at(2) })
    const correction = tx({ accountId: CASH_ACCOUNT_ID, kind: 'correction', amount: -1200, counterparty: 'Korekta salda', createdAt: at(3) })
    const transfer = tx({ accountId: CASH_ACCOUNT_ID, kind: 'transfer', counterAccountId: MBANK_ACCOUNT_ID, bothSides: true, createdAt: at(4) })
    const loan = tx({ accountId: CASH_ACCOUNT_ID, kind: 'loan', amount: -100000, createdAt: at(5) })
    const cargo = tx({ accountId: XTB_WALLET_ACCOUNT_ID, containerId: nextId(), createdAt: at(6) })
    const cash = tx({ accountId: CASH_ACCOUNT_ID, kind: 'income', amount: 5000, memberId: null, title: `${CASH_REPAY_TITLE}Apteka`, createdAt: at(7) })
    const buoy = tx({ accountId: XTB_WALLET_ACCOUNT_ID, counterparty: 'Czynsz', title: 'Czynsz', createdAt: at(8) })
    const all = [typed, docking, correction, transfer, loan, cargo, cash, buoy]
    const buoys = [{ done: { '2026-10-08': buoy.id, '2026-09-08': '' } }]
    expect(lastAccountOf(all, buoys)).toBe(MBANK_ACCOUNT_ID)
    expect(all.filter((t) => typedByHand(t, new Set([buoy.id])))).toEqual([typed])
    // An income typed by hand (a member's money of the quick entry) and a purchase are the user's.
    const income = tx({ accountId: CASH_ACCOUNT_ID, kind: 'income', amount: 7000, title: '', createdAt: at(9) })
    expect(lastAccountOf([...all, income], buoys)).toBe(CASH_ACCOUNT_ID)
  })
})

describe('AP-20: treść dziennika w Wywiadzie (SW sp. 11)', () => {
  it('wpisy z okresu, najnowsze pierwsze, z oznaczeniem i kwotą; bez treści – pominięte', () => {
    const a = tx({ counterparty: 'Allegro', amount: -25000, impulse: 'impulse', logNote: 'wyprzedaż', date: '2026-10-10' })
    const b = tx({ counterparty: 'Orlen', amount: -30000, impulse: 'plan', logNote: '  bak na trasę ', date: '2026-10-12' })
    const silent = tx({ amount: -40000, impulse: 'plan', date: '2026-10-13' })
    const before = tx({ logNote: 'stare', date: '2026-08-01' })
    const { entries, total } = logEntries([a, b, silent, before], '2026-10-01', '2026-10-31')
    expect(total).toBe(2)
    expect(entries.map((e) => [e.name, e.note, e.impulse, e.amount])).toEqual([
      ['Orlen', 'bak na trasę', 'plan', 30000],
      ['Allegro', 'wyprzedaż', 'impulse', 25000]
    ])
    expect(logEntries([a, b], '2026-10-01', '2026-10-31', 1)).toMatchObject({ total: 2, entries: [{ name: 'Orlen' }] })
  })

  it('kwota części własnej jak w licznikach dziennika (R-17); zakup samego domownika – poza listą (integracja N5)', () => {
    const shared = tx({
      counterparty: 'Ikea',
      amount: -25000,
      impulse: 'impulse',
      logNote: 'na wyprzedaży',
      date: '2026-10-11',
      splits: [
        { id: nextId(), amount: -10000, categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '' },
        { id: nextId(), amount: -15000, categoryId: FOOD, refundable: true, memberId: null, advance: false, note: '' }
      ]
    })
    const members = tx({ counterparty: 'Kiosk', amount: -9000, impulse: 'plan', logNote: 'dla mamy', date: '2026-10-12', refundable: true })
    const { entries, total } = logEntries([shared, members], '2026-10-01', '2026-10-31')
    expect(total).toBe(1)
    expect(entries.map((e) => [e.name, e.impulse, e.amount])).toEqual([['Ikea', 'impulse', 10000]])
  })
})

describe('AP-15 (przy AP-20): limit tagów liczy ten sam tag raz', () => {
  it('tag z literą „s” nie jest nowym tagiem (dawne /s+/ zamiast /\\s+/)', () => {
    const full = ['Kasa', ...Array.from({ length: 19 }, (_, i) => `t${i}`)]
    expect(tagsLost(full, 'Kasa')).toEqual({ cut: 0, over: 0 })
  })
})

describe('AP-34: ten sam wiersz banku dwa razy to duplikat, nie „dwa obciążenia” (ME.8)', () => {
  it('ten sam klucz wiersza (albo klucz drugiego formatu) – bez sygnału; dwa różne wiersze – sygnał jak dotąd', () => {
    const a = tx({ date: '2026-10-12', amount: -3499, counterparty: 'ROSSMANN 112', bank: bank({ key: 'k:ross', counterparty: 'ROSSMANN 112' }) })
    const copy = tx({ date: '2026-10-12', amount: -3499, counterparty: 'ROSSMANN 112', bank: bank({ key: 'k:ross', counterparty: 'ROSSMANN 112' }) })
    const other = tx({ date: '2026-10-12', amount: -3499, counterparty: 'ROSSMANN 112', bank: bank({ key: 'k:inny', altKeys: ['k:ross-h'], counterparty: 'ROSSMANN 112' }) })
    const inp = (txs: Transaction[]) => ({ transactions: txs, today: '2026-10-20', categories, orders: { impulseThreshold: 20000 } })
    expect(anomalies(inp([a, copy])).filter((x) => x.kind === 'double')).toEqual([])
    expect(anomalies(inp([a, other])).filter((x) => x.kind === 'double')).toHaveLength(1)
    const historia = tx({ date: '2026-10-12', amount: -3499, counterparty: 'ROSSMANN 112', bank: bank({ key: 'k:ross-h', counterparty: 'ROSSMANN 112' }) })
    expect(anomalies(inp([other, historia])).filter((x) => x.kind === 'double')).toEqual([])
  })
})

describe('AP-34: import – opłaty, tematy podpowiedzi, szukanie po rodzaju operacji (IM.19, IM sp. 5, 9)', () => {
  const row = (over: Partial<MbankRow>): MbankRow => ({
    line: ++seq,
    date: '2026-10-01',
    description: '',
    operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU',
    counterparty: '',
    title: '',
    accountNo: '',
    category: '',
    amount: -1000,
    pending: false,
    balanceAfter: null,
    ...over
  })
  const plan = (rows: MbankRow[]) =>
    planImport({ format: 'lista', client: null, account: null, period: null, rows, skipped: [] }, MBANK_ACCOUNT_ID, [], { rules: [], ownNames: [], categories })
  const rows = [
    row({ operation: 'OPŁATA ZA KARTĘ', title: 'OPŁATA ZA KARTĘ 10/2026', description: 'OPŁATA ZA KARTĘ', category: 'Opłaty i odsetki', amount: -700 }),
    row({ operation: 'PROWIZJA ZA ZAKUP', title: 'KEBAB ROMA', description: 'PROWIZJA ZA ZAKUP KEBAB ROMA', category: 'Opłaty i odsetki', amount: -100 }),
    row({ counterparty: 'SZKOŁA JĘZYKÓW OBCYCH', description: 'ZAKUP SZKOŁA JĘZYKÓW OBCYCH', category: 'Edukacja', amount: -45000 }),
    row({ counterparty: 'KURSY ANNA NOWAK', description: 'ZAKUP KURSY ANNA NOWAK', category: 'Edukacja', amount: -6000 }),
    row({ counterparty: 'PRZEDSZKOLE SŁONECZKO', description: 'ZAKUP PRZEDSZKOLE', category: 'Opłaty i odsetki', amount: -9000 }),
    row({ operation: 'WYPŁATA W BANKOMACIE', title: 'BANKOMAT EURONET 0412', description: 'BANKOMAT EURONET 0412', amount: -20000 })
  ]

  it('opłata z kategorią mBanku w „Opłaty banku”, nie w temacie podpowiedzi', () => {
    const themes = importThemes(importGroups(plan(rows)))
    const fees = themes.find((t) => t.basis.kind === 'op' && t.basis.op === 'fee')!
    expect(fees.count).toBe(2)
    for (const t of themes.filter((x) => x.basis.kind === 'hint')) expect(t.groups.flatMap((g) => g.rows.map((r) => r.row.operation))).not.toContain('OPŁATA ZA KARTĘ')
  })

  it('temat podpowiedzi to jedna kategoria banku – „Edukacja” i „Opłaty i odsetki” osobno, choć dają tę samą kategorię', () => {
    const hints = importThemes(importGroups(plan(rows))).filter((t) => t.basis.kind === 'hint')
    expect(hints.map((t) => (t.basis.kind === 'hint' ? t.basis.bankCategories : [])).sort()).toEqual([['Edukacja'], ['Opłaty i odsetki']])
    expect(hints.find((t) => t.basis.kind === 'hint' && t.basis.bankCategories[0] === 'Edukacja')!.count).toBe(2)
  })

  it('szukanie po rodzaju operacji: „bankomat” znajduje „WYPŁATA W BANKOMACIE”', () => {
    const groups = importGroups(plan([row({ operation: 'WYPŁATA W BANKOMACIE', counterparty: 'EURONET 0412', title: 'EURONET 0412', description: 'EURONET 0412', amount: -20000 })]))
    expect(groups[0]!.names).toEqual(['EURONET 0412'])
    expect(searchGroups(groups, 'bankomat').size).toBe(1)
    expect(searchGroups(groups, 'bankomat xyz').size).toBe(0)
  })
})
