import { describe, expect, it } from 'vitest'
import { INBOX_KINDS, inboxItems, uncategorizedOf, type InboxInput } from '@shared/calc/inbox'
import type { Delivery } from '@shared/calc/dock'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-10-01T10:00:00.000Z'
let seq = 0
const nextId = () => `01K4000000000000000000${String(++seq).padStart(4, '0')}`
const tx = (date: string, over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date, accountId: MBANK_ACCOUNT_ID, amount: -zl(10), ...over })
const money = (g: number) => `${(g / 100).toFixed(2)} zł`

const delivery = (state: Delivery['state'], amount: number, date = '2026-10-17'): Delivery => ({
  key: `ictj:${nextId()}`,
  state,
  direction: 'in',
  date,
  amount,
  entry: { id: nextId(), kind: 'withdrawal', date, amount, pool: 'current', note: '', updatedAt: null },
  transaction: null,
  docking: null,
  wallet: false,
  missingEntry: false,
  mismatch: false,
  near: false,
  poolChanged: false,
  extra: [],
  orphans: [],
  entryGone: false
})

const input = (over: Partial<InboxInput> = {}): InboxInput => ({
  today: '2026-10-19',
  started: true,
  deliveries: [],
  conflicts: 0,
  problems: 0,
  uncategorized: { count: 0, amount: 0, from: '2026-09-01' },
  duplicates: 0,
  members: [],
  memberName: (id) => (id === 'M1' ? 'Babcia' : 'Tata'),
  confirmations: [],
  loot: { month: null, amount: 0 },
  money,
  ...over
})

describe('meldunki do rozpatrzenia (1.6.0, F6)', () => {
  it('bez spraw – pusta skrzynka', () => {
    expect(inboxItems(input())).toEqual([])
  })

  it('każdy rodzaj meldunku w kolejności skrzynki – jedna linia na dostawę, osobę i konto', () => {
    const items = inboxItems(
      input({
        deliveries: [delivery('pending', zl(1200)), delivery('waiting', zl(300)), delivery('docked', zl(500)), delivery('pending', zl(80))],
        conflicts: 1,
        problems: 2,
        uncategorized: { count: 3, amount: zl(54.2), from: '2026-09-01' },
        duplicates: 2,
        members: [
          { memberId: 'M1', owed: zl(120), deposit: 0, open: [{ txId: 'x', date: '2026-10-03', amount: zl(120) }], since: '2026-10-03' },
          { memberId: 'M2', owed: 0, deposit: zl(50), open: [], since: null }
        ],
        confirmations: [
          { accountId: MBANK_ACCOUNT_ID, name: 'mBank', last: '2026-09-10', opened: '2026-09-01' },
          { accountId: XTB_WALLET_ACCOUNT_ID, name: 'Portfel XTB', last: null, opened: '2026-09-01' }
        ],
        loot: { month: '2026-09', amount: zl(340) }
      })
    )
    expect(items.map((i) => i.kind)).toEqual(['dock', 'dock', 'loot', 'folder', 'uncategorized', 'duplicates', 'refunds', 'balances', 'balances'])
    // The kinds' order is the inbox's.
    expect([...new Set(items.map((i) => i.kind))]).toEqual(INBOX_KINDS)
    const text = (kind: string) => items.filter((i) => i.kind === kind).map((i) => i.text)
    expect(text('dock')).toEqual(['Wypłata z ICTTJ 1200.00 zł (pula Bieżące) do zadokowania.', 'Wypłata z ICTTJ 80.00 zł (pula Bieżące) do zadokowania.'])
    expect(items[0]!.ref).toBe(items[0]!.key.slice('dock:'.length))
    expect(text('loot')).toEqual(['Łupy z poprzedniego miesiąca: 340.00 zł – podział do 7. dnia, potem trafią do osłon.'])
    expect(text('folder')).toEqual(['1 konflikt kopii, 2 pliki z błędem – do rozstrzygnięcia w Synchronizacji.'])
    expect(text('uncategorized')).toEqual(['3 wydatki bez kategorii od 01.09.2026 – razem 54.20 zł.'])
    expect(text('duplicates')).toEqual(['2 możliwe duplikaty – ta sama operacja dwa razy.'])
    expect(text('refunds')).toEqual(['Babcia: do oddania 120.00 zł – najstarszy zakup z 03.10 (16 dni).'])
    expect(text('balances')).toEqual(['mBank: saldo potwierdzone 39 dni temu – sprawdź z bankiem.', 'Portfel XTB: saldo bez potwierdzenia od salda otwarcia z 01.09.2026 (48 dni) – sprawdź z bankiem.'])
  })

  it('saldo: do 30 dni po potwierdzeniu bez meldunku; konto bez salda otwarcia i potwierdzenia – też nie', () => {
    const at = (last: string | null, opened: string | null) => inboxItems(input({ confirmations: [{ accountId: MBANK_ACCOUNT_ID, name: 'mBank', last, opened }] })).length
    expect(at('2026-09-19', '2026-01-01')).toBe(0)
    expect(at('2026-09-18', '2026-01-01')).toBe(1)
    expect(at(null, '2026-09-25')).toBe(0)
    expect(at(null, '2026-09-18')).toBe(1)
    expect(at(null, null)).toBe(0)
  })

  it('przed startem budżetu – tylko folder danych', () => {
    const items = inboxItems(
      input({
        started: false,
        deliveries: [delivery('pending', zl(100))],
        conflicts: 2,
        uncategorized: { count: 5, amount: zl(50), from: null },
        duplicates: 1,
        loot: { month: '2026-09', amount: zl(10) },
        confirmations: [{ accountId: MBANK_ACCOUNT_ID, name: 'mBank', last: null, opened: '2026-01-01' }]
      })
    )
    expect(items.map((i) => [i.kind, i.text])).toEqual([['folder', '2 konflikty kopii – do rozstrzygnięcia w Synchronizacji.']])
  })

  it('bez kategorii: od startu budżetu, jak znacznik „bez kategorii” – bez podziałów, zakupów domowników, wpływów i szkiców', () => {
    const food = '01KDEFCAT00000000000000101'
    const draft = tx('2026-10-10')
    const list = [
      tx('2026-08-31'),
      tx('2026-09-01', { amount: -zl(20) }),
      tx('2026-10-02', { amount: zl(5) }),
      tx('2026-10-03', { categoryId: food }),
      tx('2026-10-04', { refundable: true, memberId: 'M1' }),
      tx('2026-10-05', { splits: [{ id: nextId(), amount: -zl(10), categoryId: food, refundable: false, memberId: null, advance: false, note: '' }] }),
      tx('2026-10-06', { kind: 'income', amount: zl(100) }),
      draft
    ]
    expect(uncategorizedOf(list, '2026-09-01', { [draft.id]: true })).toEqual({ count: 2, amount: zl(15), from: '2026-09-01' })
    expect(uncategorizedOf(list, null).count).toBe(4)
  })
})
