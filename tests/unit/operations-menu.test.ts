import { describe, expect, it } from 'vitest'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, XTB_WALLET_ACCOUNT_ID, type Transaction } from '@shared/schema'
import {
  buildMenu,
  findLevel,
  hoverItem,
  initialNav,
  monthGrid,
  navigate,
  placeAt,
  placeSub,
  skipReason,
  whatOf,
  type MenuInput,
  type MenuLeaf,
  type MenuNode,
  type MenuSub
} from '../../src/renderer/features/operations/operationsMenuModel'

// D105 (2): the right-click menu of the ticked operations – its groups, the ✓ / „—” marks, what is off and why, the keys,
// the places on the screen, the calendar's grid; pure, tested in node.

const FOOD = defaultCategoryId(1)
const AT = '2026-10-01T10:00:00.000Z'
let seq = 0
const nextId = () => `01K7M00000000000000000${String(++seq).padStart(4, '0')}`
const tx = (over: Partial<Transaction> = {}): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT, date: '2026-10-14', accountId: MBANK_ACCOUNT_ID, amount: -1000, categoryId: FOOD, ...over })

const C1 = nextId()
const G1 = nextId()
const L1 = nextId()
const OLD = '01KDEFACC00000000000000009'

function input(records: Transaction[], over: Partial<MenuInput> = {}): MenuInput {
  return {
    count: records.length,
    records,
    docked: new Set(),
    readOnly: null,
    today: '2026-11-15',
    categories: [
      { id: FOOD, name: 'Jedzenie', label: 'Jedzenie', sub: false },
      { id: 'sub1', name: 'Zakupy', label: 'Jedzenie · Zakupy', sub: true }
    ],
    accounts: [
      { id: MBANK_ACCOUNT_ID, name: 'mBank', archived: false },
      { id: XTB_WALLET_ACCOUNT_ID, name: 'Portfel XTB', archived: false },
      { id: OLD, name: 'Stare', archived: true }
    ],
    members: [{ id: 'm1', name: 'Ola', archived: false }],
    tags: ['Remont', 'Wakacje'],
    containers: [{ id: C1, name: 'Czynsz', archived: false, cycleMonths: 1 }],
    goals: [{ id: G1, name: 'Wyprawa', takes: true, amount: 5000, priority: 1 }],
    loans: [{ id: L1, name: 'Od Marka', direction: 'taken' }],
    ...over
  }
}

const group = (nodes: MenuNode[], id: string): MenuNode => {
  const n = nodes.find((x) => x.id === id)
  if (!n) throw new Error(`no group ${id}`)
  return n
}
const sub = (nodes: MenuNode[], id: string): MenuSub => group(nodes, id) as MenuSub
const leaf = (items: MenuNode[], id: string): MenuLeaf => items.find((x) => x.id === id) as MenuLeaf

describe('grupy menu', () => {
  it('kolejność, separator i „Usuń” na końcu', () => {
    const menu = buildMenu(input([tx()]))
    expect(menu.map((n) => n.id)).toEqual(['category', 'finance', 'account', 'kind', 'date', 'tags', 'impulse', 'explained', 'container', 'goal', 'loan', 'sep', 'delete'])
  })

  it('folder tylko do odczytu – wszystko wyłączone z powodem', () => {
    const menu = buildMenu(input([tx()], { readOnly: 'Folder jest tylko do odczytu.' }))
    for (const n of menu) if (n.type !== 'sep') expect(n.disabled).toBe('Folder jest tylko do odczytu.')
  })

  it('same operacje nowszej wersji (brak zapisywalnych) – wszystko wyłączone', () => {
    const menu = buildMenu(input([], { count: 2 }))
    for (const n of menu) if (n.type !== 'sep') expect(n.disabled).toMatch(/nowsza wersja/)
  })

  it('grupa bez pasujących operacji – wyłączona z powodem', () => {
    // A transfer: no impulse, no container, no goal, no loan, no explained.
    const menu = buildMenu(input([tx({ kind: 'transfer', counterAccountId: XTB_WALLET_ACCOUNT_ID })]))
    for (const id of ['impulse', 'explained', 'container', 'goal', 'loan']) expect(group(menu, id)).toHaveProperty('disabled', expect.stringMatching(/Żadna z zaznaczonych/))
    expect(group(menu, 'tags')).not.toHaveProperty('disabled')
    expect(group(menu, 'account')).not.toHaveProperty('disabled')
  })

  it('wydatek – plan / impuls, ładownia i cel dostępne; pożyczka nie', () => {
    const menu = buildMenu(input([tx()]))
    expect(group(menu, 'impulse')).not.toHaveProperty('disabled')
    expect(group(menu, 'container')).not.toHaveProperty('disabled')
    expect(group(menu, 'goal')).not.toHaveProperty('disabled')
    expect(group(menu, 'loan')).toHaveProperty('disabled')
  })

  it('brak kontenerów, celów, pożyczek – grupa wyłączona z powodem', () => {
    const menu = buildMenu(input([tx()], { containers: [], goals: [], loans: [] }))
    expect(group(menu, 'container')).toHaveProperty('disabled', expect.stringMatching(/ładowni/))
    expect(group(menu, 'goal')).toHaveProperty('disabled', expect.stringMatching(/cel/i))
  })
})

describe('zaznaczenia ✓ / „—”', () => {
  it('tag: wszystkie mają – ✓ i zdjęcie; część – „—” i dołożenie; żadna – bez znaku i dołożenie', () => {
    const a = tx({ tags: ['Remont'] })
    const b = tx({ tags: ['Remont'] })
    const c = tx()
    const all = sub(buildMenu(input([a, b])), 'tags')
    const on = leaf(all.items, 'tags-remont')
    expect(on.mark).toBe('on')
    expect(on.command).toEqual({ type: 'apply', change: { kind: 'tag', tag: 'Remont', on: false }, what: '#Remont' })
    expect(on.keepOpen).toBe(true)
    const mixed = leaf(sub(buildMenu(input([a, c])), 'tags').items, 'tags-remont')
    expect(mixed.mark).toBe('mixed')
    expect(mixed.command).toEqual({ type: 'apply', change: { kind: 'tag', tag: 'Remont', on: true }, what: '#Remont' })
    const off = leaf(sub(buildMenu(input([c])), 'tags').items, 'tags-wakacje')
    expect(off.mark).toBeUndefined()
    expect(off.command).toEqual({ type: 'apply', change: { kind: 'tag', tag: 'Wakacje', on: true }, what: '#Wakacje' })
  })

  it('tag, którego żadna operacja nie przyjmie (przelew bez tagów) – pozycja wyłączona z powodem', () => {
    const t = tx({ kind: 'transfer', counterAccountId: XTB_WALLET_ACCOUNT_ID })
    const item = leaf(sub(buildMenu(input([t])), 'tags').items, 'tags-remont')
    expect(item.disabled).toMatch(/nie przyjmie/)
  })

  it('„Wyczyść tagi” wyłączone, gdy żadna nie ma tagów', () => {
    expect(leaf(sub(buildMenu(input([tx()])), 'tags').items, 'tags-clear').disabled).toMatch(/tagów/)
    expect(leaf(sub(buildMenu(input([tx({ tags: ['x'] })])), 'tags').items, 'tags-clear').disabled).toBeUndefined()
  })

  it('konto: ✓ dla wspólnego, zarchiwizowane ukryte, chyba że używane w zbiorze', () => {
    const a = tx()
    const b = tx({ accountId: XTB_WALLET_ACCOUNT_ID })
    const accounts = sub(buildMenu(input([a, b])), 'account').items
    expect(accounts.map((n) => n.id)).toEqual([`account-${MBANK_ACCOUNT_ID}`, `account-${XTB_WALLET_ACCOUNT_ID}`])
    expect(leaf(accounts, `account-${MBANK_ACCOUNT_ID}`).mark).toBe('mixed')
    const used = sub(buildMenu(input([tx({ accountId: OLD })])), 'account').items
    expect(used.map((n) => n.id)).toContain(`account-${OLD}`)
    expect(leaf(used, `account-${OLD}`).mark).toBe('on')
  })

  it('konto: zmiana wprost na podgląd z „what” w cudzysłowie', () => {
    const item = leaf(sub(buildMenu(input([tx()])), 'account').items, `account-${XTB_WALLET_ACCOUNT_ID}`)
    expect(item.command).toEqual({ type: 'preview', change: { kind: 'account', accountId: XTB_WALLET_ACCOUNT_ID }, what: '„Portfel XTB”' })
  })

  it('wyjaśniona korekta: przełącznik z ✓ – nie zamyka menu', () => {
    const c = tx({ kind: 'correction', amount: 500, categoryId: null })
    const on = group(buildMenu(input([c])), 'explained') as MenuLeaf
    expect(on.command).toEqual({ type: 'apply', change: { kind: 'explained', on: true }, what: '' })
    expect(on.keepOpen).toBe(true)
    const done = group(buildMenu(input([{ ...c, explained: true }])), 'explained') as MenuLeaf
    expect(done.mark).toBe('on')
    expect(done.command).toEqual({ type: 'apply', change: { kind: 'explained', on: false }, what: '' })
  })

  it('plan / impuls: od razu, trzy wybory ze znakiem', () => {
    const items = sub(buildMenu(input([tx({ impulse: 'plan' })])), 'impulse').items
    expect(items.map((n) => n.id)).toEqual(['impulse-plan', 'impulse-impulse', 'impulse-none'])
    expect(leaf(items, 'impulse-plan').mark).toBe('on')
    expect(leaf(items, 'impulse-impulse').command).toEqual({ type: 'apply', change: { kind: 'impulse', to: 'impulse' }, what: '' })
  })

  it('ładownia, cel, pożyczka: z podglądem, „nie z …” na początku', () => {
    const e = tx({ containerId: C1 })
    const container = sub(buildMenu(input([e])), 'container').items
    expect(container.map((n) => n.id)).toEqual(['container-none', `container-${C1}`])
    expect(leaf(container, `container-${C1}`).mark).toBe('on')
    expect(leaf(container, `container-${C1}`).command).toEqual({ type: 'preview', change: { kind: 'container', containerId: C1 }, what: '„Czynsz”' })
    expect(leaf(container, 'container-none').command).toEqual({ type: 'preview', change: { kind: 'container', containerId: null }, what: '' })
    const goal = sub(buildMenu(input([tx()])), 'goal').items
    expect(leaf(goal, `goal-${G1}`).command).toEqual({ type: 'preview', change: { kind: 'goal', goalId: G1 }, what: '„Wyprawa”' })
    const loan = sub(buildMenu(input([tx({ kind: 'loan', amount: 10000, categoryId: null })])), 'loan').items
    expect(leaf(loan, `loan-${L1}`).command).toEqual({ type: 'preview', change: { kind: 'loan', loanId: L1 }, what: '„Od Marka”' })
  })

  it('zarchiwizowany kontener ukryty, chyba że używany w zbiorze', () => {
    const containers = [
      { id: C1, name: 'Czynsz', archived: true, cycleMonths: 1 },
      { id: 'c2', name: 'Prąd', archived: false, cycleMonths: 3 }
    ]
    const hidden = sub(buildMenu(input([tx()], { containers })), 'container').items.map((n) => n.id)
    expect(hidden).toEqual(['container-none', 'container-c2'])
    const shown = sub(buildMenu(input([tx({ containerId: C1 })], { containers })), 'container').items.map((n) => n.id)
    expect(shown).toContain(`container-${C1}`)
  })
})

describe('kategoria, finansujący, rodzaj, usuń', () => {
  it('kategoria i finansujący wołą dawne działania z etykietą jak pasek', () => {
    const menu = buildMenu(input([tx()]))
    expect(leaf(sub(menu, 'category').items, `category-${FOOD}`).command).toEqual({ type: 'category', categoryId: FOOD, label: 'Jedzenie' })
    const fin = sub(menu, 'finance').items
    expect(leaf(fin, 'finance-me').command).toEqual({ type: 'finance', memberId: null, gift: false, label: 'Mój wydatek' })
    expect(leaf(fin, 'finance-m1').command).toEqual({ type: 'finance', memberId: 'm1', gift: false, label: 'Finansuje Ola' })
    expect(leaf(fin, 'finance-gift-m1').command).toEqual({ type: 'finance', memberId: 'm1', gift: true, label: 'Prezent od: Ola' })
    // „wspólnie…” is the bar's alone – the share's editor does not fit a menu.
    expect(fin.some((n) => n.id.includes('share'))).toBe(false)
  })

  it('rodzaj: bez korekty; przelew – podmenu kont drugiej strony', () => {
    const kinds = sub(buildMenu(input([tx()])), 'kind').items
    expect(kinds.some((n) => n.id === 'kind-correction')).toBe(false)
    const transfer = kinds.find((n) => n.id === 'kind-transfer') as MenuSub
    expect(transfer.type).toBe('sub')
    expect(transfer.items.map((n) => n.id)).toEqual(['kind-transfer-none', `kind-transfer-${MBANK_ACCOUNT_ID}`, `kind-transfer-${XTB_WALLET_ACCOUNT_ID}`])
    expect(leaf(transfer.items, `kind-transfer-${XTB_WALLET_ACCOUNT_ID}`).command).toEqual({
      type: 'preview',
      change: { kind: 'kind', to: 'transfer', counterAccountId: XTB_WALLET_ACCOUNT_ID },
      what: 'na „Przelew własny – Portfel XTB”'
    })
    expect(leaf(transfer.items, 'kind-transfer-none').command).toEqual({ type: 'preview', change: { kind: 'kind', to: 'transfer', counterAccountId: null }, what: 'na „Przelew własny”' })
  })

  it('rodzaj: zadokowana operacja nie przyjmie innego – pozycja wyłączona', () => {
    const t = tx()
    const kinds = sub(buildMenu(input([t], { docked: new Set([t.id]) })), 'kind').items
    expect(leaf(kinds, 'kind-income').disabled).toBeTruthy()
  })

  it('usuń – podgląd, czerwony', () => {
    const del = group(buildMenu(input([tx()])), 'delete') as MenuLeaf
    expect(del.command).toEqual({ type: 'preview', change: { kind: 'delete' }, what: '' })
    expect(del.danger).toBe(true)
  })
})

describe('data', () => {
  it('kalendarz startuje w miesiącu wspólnej daty, „dziś” z wejścia; przesunięcie obok', () => {
    const date = sub(buildMenu(input([tx({ date: '2026-09-03' }), tx({ date: '2026-09-03' })])), 'date')
    expect(date.items.map((n) => n.type)).toEqual(['calendar', 'shift'])
    expect(date.items[0]).toMatchObject({ type: 'calendar', month: '2026-09', today: '2026-11-15', selected: '2026-09-03' })
    const mixed = sub(buildMenu(input([tx({ date: '2026-09-03' }), tx({ date: '2026-10-04' })])), 'date')
    expect(mixed.items[0]).toMatchObject({ month: '2026-11', selected: null })
  })

  it('whatOf: dzień przez plDate, przesunięcie ze znakiem i liczebnikiem', () => {
    expect(whatOf({ kind: 'day', date: '2026-10-02' })).toBe('na 02.10.2026')
    expect(whatOf({ kind: 'shift', days: 3 })).toBe('o +3 dni')
    expect(whatOf({ kind: 'shift', days: -1 })).toBe('o -1 dzień')
    expect(whatOf({ kind: 'shift', days: 5 })).toBe('o +5 dni')
    expect(whatOf({ kind: 'delete' })).toBe('')
  })

  it('siatka miesiąca: tygodnie od poniedziałku, dni sąsiednich miesięcy oznaczone', () => {
    const weeks = monthGrid('2026-11')
    // 1 Nov 2026 is a Sunday: the first row starts Mon 26 Oct.
    expect(weeks[0]![0]).toEqual({ date: '2026-10-26', inMonth: false })
    expect(weeks[0]![6]).toEqual({ date: '2026-11-01', inMonth: true })
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(30)
    expect(weeks.at(-1)!.at(-1)!.date >= '2026-11-30').toBe(true)
    // February 2027 starts on a Monday and has 28 days: four rows.
    expect(monthGrid('2027-02')).toHaveLength(4)
  })
})

describe('powody pominięć w podglądzie', () => {
  it('zależą od rodzaju zmiany', () => {
    expect(skipReason({ kind: 'container', containerId: null })).toBe('nie wydatek, wpływ albo podział paragonu')
    expect(skipReason({ kind: 'loan', loanId: null })).toBe('nie operacja pożyczki albo podział')
    expect(skipReason({ kind: 'goal', goalId: null })).toBe('nie wydatek albo podział')
    expect(skipReason({ kind: 'impulse', to: 'plan' })).toBe('nie wydatek')
    expect(skipReason({ kind: 'explained', on: true })).toBe('nie korekta')
    expect(skipReason({ kind: 'tag', tag: 'x', on: true })).toBe('rodzaj bez tagów albo pełna lista')
    expect(skipReason({ kind: 'kind', to: 'income' })).toBe('zadokowane, przelew na własne konto')
    expect(skipReason({ kind: 'account', accountId: 'a' })).toBe('zadokowane, przelew na własne konto')
  })
})

describe('klawiatura', () => {
  const root = buildMenu(input([tx()]))

  it('↓ / ↑ chodzą po pozycjach z zawijaniem, pomijając separator i wyłączone', () => {
    const menu = buildMenu(input([tx()], { containers: [], goals: [], loans: [] }))
    let nav = initialNav()
    nav = navigate(menu, nav, 'ArrowDown').nav
    expect(nav.focus).toBe('category')
    nav = navigate(menu, nav, 'ArrowUp').nav
    // Wraps to the last enabled one: „Usuń” (the separator is no stop; the container, goal and loan groups are off).
    expect(nav.focus).toBe('delete')
    nav = navigate(menu, nav, 'ArrowUp').nav
    // Not a correction (explained off) and no container, goal, loan: the next enabled one up is „Plan / impuls”.
    expect(nav.focus).toBe('impulse')
  })

  it('→ otwiera podmenu i ustawia pierwszą pozycję, ← wraca na rodzica', () => {
    let nav = initialNav()
    nav = navigate(root, nav, 'ArrowDown').nav
    nav = navigate(root, nav, 'ArrowRight').nav
    expect(nav.path).toEqual(['category'])
    expect(nav.focus).toBe(`category-${FOOD}`)
    nav = navigate(root, nav, 'ArrowLeft').nav
    expect(nav.path).toEqual([])
    expect(nav.focus).toBe('category')
  })

  it('Enter na pozycji zwraca polecenie, na podmenu je otwiera', () => {
    let nav = hoverItem(root, initialNav(), 0, 'account')
    expect(nav.path).toEqual(['account'])
    nav = navigate(root, nav, 'ArrowDown').nav
    const r = navigate(root, nav, 'Enter')
    expect(r.run?.command).toMatchObject({ type: 'preview', change: { kind: 'account' } })
    const open = navigate(root, { path: [], focus: 'kind' }, 'Enter')
    expect(open.nav.path).toEqual(['kind'])
    expect(open.run).toBeUndefined()
  })

  it('← na głównym poziomie nic nie robi; → na zwykłej pozycji też', () => {
    const left = navigate(root, { path: [], focus: 'category' }, 'ArrowLeft')
    expect(left.nav).toEqual({ path: [], focus: 'category' })
    const right = navigate(root, { path: [], focus: 'delete' }, 'ArrowRight')
    expect(right.nav).toEqual({ path: [], focus: 'delete' })
  })

  it('najechanie myszą na pozycję innego poziomu zamyka głębsze podmenu', () => {
    let nav = hoverItem(root, initialNav(), 0, 'kind')
    nav = hoverItem(root, nav, 1, 'kind-transfer')
    expect(nav.path).toEqual(['kind', 'kind-transfer'])
    nav = hoverItem(root, nav, 0, 'tags')
    expect(nav.path).toEqual(['tags'])
    nav = hoverItem(root, nav, 0, 'delete')
    expect(nav.path).toEqual([])
    expect(nav.focus).toBe('delete')
  })

  it('Home / End', () => {
    expect(navigate(root, initialNav(), 'End').nav.focus).toBe('delete')
    expect(navigate(root, { path: [], focus: 'delete' }, 'Home').nav.focus).toBe('category')
  })

  it('findLevel: poziom po ścieżce, null dla złej', () => {
    expect(findLevel(root, [])).toBe(root)
    expect(findLevel(root, ['kind', 'kind-transfer'])?.[0]?.id).toBe('kind-transfer-none')
    expect(findLevel(root, ['nope'])).toBeNull()
  })

  it('menu daty: pierwsza pozycja to kalendarz', () => {
    const nav = navigate(root, { path: [], focus: 'date' }, 'ArrowRight').nav
    expect(nav.path).toEqual(['date'])
    expect(nav.focus).toBe('date-calendar')
    expect(navigate(root, nav, 'ArrowDown').nav.focus).toBe('date-shift')
  })
})

describe('miejsce na ekranie', () => {
  const win = { w: 1100, h: 680 }

  it('menu przy kursorze, gdy się mieści', () => {
    expect(placeAt({ x: 300, y: 200 }, { w: 230, h: 360 }, win)).toEqual({ left: 300, top: 200, maxHeight: 664 })
  })

  it('przy prawej krawędzi – przesunięte w lewo, w granicach okna', () => {
    const p = placeAt({ x: 1090, y: 200 }, { w: 230, h: 360 }, win)
    expect(p.left + 230).toBeLessThanOrEqual(1100 - 8)
    expect(p.left).toBeGreaterThanOrEqual(8)
  })

  it('przy dolnej krawędzi – nad kursorem; gdy i tam brak miejsca – dosunięte do dołu', () => {
    expect(placeAt({ x: 300, y: 600 }, { w: 230, h: 360 }, win).top).toBe(240)
    const tall = placeAt({ x: 300, y: 100 }, { w: 230, h: 900 }, win)
    expect(tall.top).toBe(8)
    expect(tall.maxHeight).toBe(664)
  })

  it('podmenu po prawej, a gdy brak miejsca – po lewej', () => {
    const parent = { left: 300, top: 100, width: 230, height: 26 }
    const right = placeSub(parent, { w: 220, h: 200 }, win)
    expect(right.side).toBe('right')
    expect(right.left).toBeGreaterThanOrEqual(300 + 230 - 4)
    const near = { left: 860, top: 100, width: 230, height: 26 }
    const left = placeSub(near, { w: 220, h: 200 }, win)
    expect(left.side).toBe('left')
    expect(left.left + 220).toBeLessThanOrEqual(860 + 4)
    expect(left.left).toBeGreaterThanOrEqual(8)
  })

  it('podmenu przy dolnej krawędzi – dosunięte do góry; wyższe od okna – z przewijaniem', () => {
    const parent = { left: 300, top: 600, width: 230, height: 26 }
    const p = placeSub(parent, { w: 220, h: 200 }, win)
    expect(p.top + 200).toBeLessThanOrEqual(680 - 8)
    const tall = placeSub(parent, { w: 220, h: 2000 }, win)
    expect(tall.top).toBe(8)
    expect(tall.maxHeight).toBe(664)
  })

  it('wąskie okno, w którym podmenu nie mieści się po żadnej stronie – i tak w granicach', () => {
    const narrow = { w: 300, h: 680 }
    const p = placeSub({ left: 20, top: 100, width: 230, height: 26 }, { w: 220, h: 200 }, narrow)
    expect(p.left).toBeGreaterThanOrEqual(8)
    expect(p.left + 220).toBeLessThanOrEqual(300 - 8)
  })
})
