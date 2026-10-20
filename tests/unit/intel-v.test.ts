import { describe, expect, it } from 'vitest'
import { brandStats, brandYearOf, brandYears, isOver, monthComparison } from '@shared/calc/drill'
import { fuelMonths, fuelSummary, medianRate, rateText, savingsRate } from '@shared/calc/fuel'
import type { FleetEvent, FleetState } from '@shared/calc/fleet'
import { plainIncomeContext } from '@shared/calc/income'
import { parseCpi, personalInflation } from '@shared/calc/inflation'
import { spendingByMonth, wealthCurve } from '@shared/calc/intel'
import { loanState } from '@shared/calc/loans'
import { netAdjustments, netWorthCurve } from '@shared/calc/netWorth'
import { categoryIndex } from '@shared/calc/operations'
import { hashTags, hasTag, knownTags, lastTag, MAX_TAGS, parseTags, tagKey, tagLabel, tagSummaries, withoutHashTags, withTags } from '@shared/calc/tags'
import { deliveryWhy, energyWhy, rangeWhy, targetsWhy } from '@shared/calc/why'
import { createDefaultSettings } from '@shared/defaults'
import { GLOSSARY, glossaryOf } from '@shared/glossary'
import { balanceSchema, containerSchema, defaultCategoryId, importRuleSchema, loanSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, settingsSchema, transactionSchema, type Transaction } from '@shared/schema'
import { emptyFilter, filterOf, matchesFilter, matchesQuery, narrows, noNarrowing } from '@shared/operationsView'
import { buildImport, planImport, type ImportChoices } from '@shared/import/reconcile'
import type { MbankFile } from '@shared/import/mbank'

const zl = (v: number) => Math.round(v * 100)
const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
const nextId = () => `01K4V00000000000000000${String(++seq).padStart(4, '0')}`
const base = () => ({ schemaVersion: SCHEMA_VERSION, id: nextId(), createdAt: AT, updatedAt: AT })
const FOOD = defaultCategoryId(1)
const GROCERIES = defaultCategoryId(1, 1)
const DINING = defaultCategoryId(1, 2)
const AUTO = defaultCategoryId(3)
const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction => transactionSchema.parse({ ...base(), date, accountId: MBANK_ACCOUNT_ID, amount, categoryId: FOOD, ...over })
const settings = createDefaultSettings(AT).settings
const categories = settings.categories
const money = (g: number) => `${(g / 100).toFixed(2)} zł`

// ------------------------------------------------------------------ F25

describe('bilans paliwa i stopa oszczędności (1.10.0, F25)', () => {
  const history = [
    // September: work 5 000, trading 1 000, costs 4 000 – 2 000 left (33,3%); without the trading 1 000 (20%).
    tx('2026-09-01', zl(5000), { kind: 'income', categoryId: null }),
    tx('2026-09-15', zl(1000), { kind: 'trading', categoryId: null }),
    tx('2026-09-10', -zl(4000)),
    // October: work 5 000, a top-up of XTB (trading below zero – none), costs 5 500 – 500 taken (−10%).
    tx('2026-10-01', zl(5000), { kind: 'income', categoryId: null }),
    tx('2026-10-05', -zl(300), { kind: 'trading', categoryId: null }),
    tx('2026-10-10', -zl(5500))
  ]
  const ctx = plainIncomeContext(history)

  it('przychód (praca i trading netto) minus koszty netto; stopa w % przychodu; wariant bez tradingu', () => {
    const [sep, oct] = fuelMonths(history, ctx, ['2026-09', '2026-10'])
    expect(sep).toMatchObject({ income: zl(6000), work: zl(5000), trading: zl(1000), costs: zl(4000), balance: zl(2000), rate: 33.3, workBalance: zl(1000), workRate: 20 })
    expect(oct).toMatchObject({ income: zl(5000), trading: 0, costs: zl(5500), balance: -zl(500), rate: -10, workRate: -10 })
    // A month without income: no rate.
    expect(fuelMonths(history, ctx, ['2026-08'])[0]).toMatchObject({ income: 0, rate: null, balance: 0 })
    expect(rateText(33.3)).toBe('33,3%')
    expect(rateText(null)).toBe('—')
  })

  it('mediany 6 i 12 miesięcy przed miesiącem i kierunek; mediana parzystej liczby – średnia środkowych', () => {
    expect(medianRate([10, null, 30, 20])).toBe(20)
    expect(medianRate([10, 20, 30, 40])).toBe(25)
    expect(medianRate([null])).toBeNull()
    const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']
    // The rates 10, 10, 10 (three months), then 30, 30, 30: up.
    const list = months.slice(0, 6).flatMap((m, i) => [tx(`${m}-01`, zl(1000), { kind: 'income', categoryId: null }), tx(`${m}-10`, -zl(i < 3 ? 900 : 700))])
    const s = fuelSummary(list, plainIncomeContext(list), '2026-09', months.slice(0, 6))
    expect(s).toMatchObject({ median6: 20, median12: 20, trend: 'up' })
    expect(s.month).toMatchObject({ month: '2026-09', income: 0, rate: null })
  })
})

// ------------------------------------------------------------------ F24

describe('majątek netto – druga linia krzywej (1.10.0, F24, D87)', () => {
  const opening = balanceSchema.parse({ ...base(), date: '2026-09-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(20000) })
  const empty = { owed: 0, deposit: 0, byTx: new Map() }

  it('pożyczka wzięta: konto rośnie, dług też – linia netto bez skoku; spłata rat zmniejsza dług', () => {
    const loan = loanSchema.parse({ ...base(), name: 'Kredyt', direction: 'taken', amount: zl(10000), date: '2026-09-10' })
    const container = containerSchema.parse({ ...base(), name: 'Rata', amount: zl(1000), dueMonth: '2026-10', loanId: loan.id })
    const txs = [tx('2026-09-10', zl(10000), { kind: 'loan', loanId: loan.id, categoryId: null }), tx('2026-10-01', -zl(1000), { containerId: container.id })]
    const points = wealthCurve(txs, [opening], [MBANK_ACCOUNT_ID], '2026-10-04')
    const net = netWorthCurve(points, { loans: [loan], transactions: txs, containers: [container], household: empty, today: '2026-10-04' })
    expect(points.map((p) => p.value)).toEqual([zl(20000), zl(30000), zl(30000), zl(30000), zl(29000)])
    // Before the loan 20 000; after it 30 000 − 10 000; the installment paid: 29 000 − 9 000.
    expect(net.map((p) => p.value)).toEqual([zl(20000), zl(20000), zl(20000), zl(20000), zl(20000)])
    expect(net.every((p) => p.drawdown === 0)).toBe(true)
  })

  it('pożyczka udzielona: z konta do należności; zamknięta – od dnia zamknięcia zero', () => {
    const loan = loanSchema.parse({ ...base(), name: 'Dla brata', direction: 'given', amount: zl(3000), date: '2026-09-10', closedAt: '2026-10-02T10:00:00.000Z' })
    const txs = [tx('2026-09-10', -zl(3000), { kind: 'loan', loanId: loan.id, categoryId: null }), tx('2026-09-20', zl(1000), { kind: 'loan', loanId: loan.id, categoryId: null })]
    const adj = netAdjustments(['2026-09-09', '2026-09-10', '2026-09-25', '2026-10-01', '2026-10-02'], { loans: [loan], transactions: txs, containers: [], household: empty, today: '2026-10-04' })
    expect(adj).toEqual([0, zl(3000), zl(2000), zl(2000), 0])
  })

  it('domownicy: należność plus, ich pieniądze w depozycie minus – w dniach operacji', () => {
    const a = tx('2026-09-12', -zl(400))
    const b = tx('2026-09-20', zl(300), { kind: 'income' })
    // Now: owed 400 − 100 (paid back 100) = 300; held 200 of theirs.
    const household = {
      owed: zl(300),
      deposit: zl(200),
      byTx: new Map([
        [a.id, [{ memberId: 'M', fromDeposit: 0, lent: zl(400), repaid: 0, advance: 0, income: 0, gift: 0 }]],
        [b.id, [{ memberId: 'M', fromDeposit: 0, lent: 0, repaid: zl(100), advance: zl(200), income: 0, gift: 0 }]]
      ])
    }
    // A day of an operation counts its flows (the end of the day).
    const adj = netAdjustments(['2026-09-10', '2026-09-12', '2026-09-15', '2026-09-20', '2026-09-25'], { loans: [], transactions: [a, b], containers: [], household, today: '2026-10-04' })
    expect(adj).toEqual([0, zl(400), zl(400), zl(100), zl(100)])
  })
})

// ------------------------------------------------------------------ F20

describe('drążenie Wywiadu (1.10.0, F20)', () => {
  it('kategoria rozwija się do podkategorii; część na samej kategorii głównej – pod jej id', () => {
    const s = spendingByMonth([tx('2026-10-02', -zl(100), { categoryId: GROCERIES }), tx('2026-10-03', -zl(40), { categoryId: DINING }), tx('2026-10-04', -zl(10))], categories, ['2026-10'])
    expect(s.rows[0]).toMatchObject({ id: FOOD, total: zl(150) })
    expect(s.rows[0]!.children.map((c) => [c.id, c.total])).toEqual([
      [GROCERIES, zl(100)],
      [DINING, zl(40)],
      [FOOD, zl(10)]
    ])
  })

  it('namierzone cele: suma, wizyty, średni paragon, udział w kategorii, trend wobec okresu przed, ostatnia wizyta; ładownia nie', () => {
    const txs = [
      tx('2026-04-05', -zl(50), { counterparty: 'BIEDRONKA' }),
      tx('2026-07-05', -zl(60), { counterparty: 'BIEDRONKA' }),
      tx('2026-08-05', -zl(90), { counterparty: 'BIEDRONKA' }),
      tx('2026-09-15', -zl(50), { counterparty: 'LIDL' }),
      tx('2026-09-16', -zl(30), { counterparty: 'NETFLIX', containerId: nextId() })
    ]
    const list = brandStats(txs, categories, '2026-07-01', '2026-09-30')
    expect(list.map((b) => [b.name, b.total, b.count, b.average, b.share, b.last])).toEqual([
      ['BIEDRONKA', zl(150), 2, zl(75), 75, '2026-08-05'],
      ['LIDL', zl(50), 1, zl(50), 25, '2026-09-15']
    ])
    // April–June: 50 zł; now 150 zł – +200%.
    expect(list[0]!.trend).toBe(200)
    expect(list[1]!.trend).toBeNull()
  })

  it('miesiąc wobec średnich 3 i 12 miesięcy i roku wcześniej; przekroczenie o ponad 10%', () => {
    const months = ['2025-10', '2026-07', '2026-08', '2026-09', '2026-10']
    const txs = [tx('2025-10-03', -zl(200)), tx('2026-07-03', -zl(100)), tx('2026-08-03', -zl(100)), tx('2026-09-03', -zl(100)), tx('2026-10-03', -zl(300))]
    const covered = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', ...months.slice(1, 4)]
    const [food] = monthComparison(txs, categories, '2026-10', covered)
    expect(food).toMatchObject({ id: FOOD, value: zl(300), avg3: zl(100), yearAgo: zl(200) })
    // 12 months: 200 + 3 × 100 over 12 = 41,67 zł.
    expect(food!.avg12).toBe(Math.round(zl(500) / 12))
    expect(isOver(zl(300), zl(100))).toBe(true)
    expect(isOver(zl(110), zl(100))).toBe(false)
    expect(isOver(zl(300), null)).toBe(false)
  })

  it('u tego kontrahenta w roku operacji: liczba, suma, średnio; pojedyncza – nic', () => {
    const a = tx('2026-03-01', -zl(30), { counterparty: 'ZABKA' })
    const b = tx('2026-05-01', -zl(42), { counterparty: 'ZABKA' })
    const c = tx('2025-12-01', -zl(99), { counterparty: 'ZABKA' })
    expect(brandYearOf(brandYears([a, b, c]), b)).toEqual({ year: '2026', count: 2, total: zl(72), average: zl(36) })
    expect(brandYearOf(brandYears([a, c]), a)).toBeNull()
  })
})

// ------------------------------------------------------------------ F17

describe('tagi i wyprawy (1.10.0, F17)', () => {
  it('tag bez „#”, wielkich liter i polskich znaków; wpisane po przecinku albo „#”; „#słowo” w notatce', () => {
    expect(tagKey('#Wakacje  Chorwacja ')).toBe('wakacje chorwacja')
    expect(tagKey('Ślub Ani')).toBe(tagKey('slub ani'))
    expect(parseTags('#wakacje #remont łazienki')).toEqual(['wakacje', 'remont łazienki'])
    expect(parseTags('Wakacje, remont, wakacje')).toEqual(['Wakacje', 'remont'])
    expect(withTags(['Wakacje'], ['#wakacje', 'Remont'])).toEqual(['Wakacje', 'Remont'])
    expect(hashTags('kolacja #wakacje i #Chorwacja-2027, bez #')).toEqual(['wakacje', 'Chorwacja-2027'])
    // A number after „#” is a name's („Pizzeria #1”); the counterparty keeps it, a tag goes out of it.
    expect(hashTags('Pizzeria #1 #wyjazd')).toEqual(['wyjazd'])
    expect(withoutHashTags('Lidl  #wakacje #Chorwacja-2027 sklep #12')).toBe('Lidl sklep #12')
  })

  it('karta tagu: wydane netto (zwrot zaliczki odejmuje), po kategoriach i miesiącach; linia paragonu ze swoim tagiem; cudza część nie', () => {
    const fuel = tx('2026-07-01', -zl(300), { categoryId: AUTO, tags: ['Wakacje'] })
    const receipt = tx('2026-07-02', -zl(200), {
      splits: [
        { id: nextId(), amount: -zl(150), categoryId: GROCERIES, refundable: false, memberId: null, advance: false, note: '', tags: ['wakacje'] },
        { id: nextId(), amount: -zl(50), categoryId: GROCERIES, refundable: true, memberId: null, advance: false, note: '', tags: ['wakacje'] }
      ]
    })
    const back = tx('2026-08-10', zl(100), { kind: 'income', categoryId: null, tags: ['#Wakacje'] })
    const other = tx('2026-07-03', -zl(80), { tags: ['Remont'] })
    const list = tagSummaries([fuel, receipt, back, other], categoryIndex(categories))
    const trip = list.find((s) => s.key === 'wakacje')!
    expect(trip).toMatchObject({ label: 'Wakacje', spent: zl(350), count: 3, first: '2026-07-01', last: '2026-08-10' })
    expect(Object.fromEntries(trip.byCategory)).toEqual({ [AUTO]: zl(300), [FOOD]: zl(150), '-': -zl(100) })
    expect(Object.fromEntries(trip.byMonth)).toEqual({ '2026-07': zl(450), '2026-08': -zl(100) })
    expect(hasTag(receipt, 'wakacje')).toBe(true)
    expect(hasTag(other, 'wakacje')).toBe(false)
    expect(knownTags([fuel, receipt, other])).toEqual(['Remont', 'Wakacje'])
  })

  it('ostatni tag z 7 dni podpowiadany w szybkim wpisie', () => {
    const old = tx('2026-10-01', -zl(10), { tags: ['Stary'] })
    const recent = tx('2026-10-15', -zl(10), { tags: ['Chorwacja'] })
    expect(lastTag([old, recent], '2026-10-20')).toBe('Chorwacja')
    expect(lastTag([old], '2026-10-20')).toBeNull()
  })

  it('schemat: tagi operacji, linii i reguły – brak to brak; zły zapis – pominięty; ustawienia wywiadu z CPI', () => {
    expect(tx('2026-10-01', -zl(10)).tags).toBeUndefined()
    expect(transactionSchema.parse({ ...base(), date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, amount: -100, tags: 'zle' }).tags).toBeUndefined()
    const s = settingsSchema.parse({ ...settings, intel: { tagGoals: { wakacje: nextId(), zly: 'nie-ulid' }, cpi: { '2026-09': 4.9, '2026-13': 1, '2026-10': 'x' } } })
    expect(Object.keys(s.intel.tagGoals)).toEqual(['wakacje'])
    expect(s.intel.cpi).toEqual({ '2026-09': 4.9 })
  })
})

// ------------------------------------------------------------------ F36

describe('osobista inflacja koszyka (1.10.0, F36)', () => {
  it('kategorie rok do roku, średni paragon tych samych marek, ceny kontenerów, ważona „Twoja inflacja”, CPI i cel kadłuba', () => {
    const covered: string[] = []
    for (let m = '2024-10'; m <= '2026-09'; m = m.slice(0, 5) + String(Number(m.slice(5)) + 1).padStart(2, '0')) {
      if (Number(m.slice(5)) > 12) m = `${Number(m.slice(0, 4)) + 1}-01`
      covered.push(m)
    }
    const txs: Transaction[] = []
    for (const m of covered) {
      const now = m >= '2025-10'
      // Biedronka: 100 zł a receipt, now 110 zł (+10%); three a month.
      for (const d of ['05', '15', '25']) txs.push(tx(`${m}-${d}`, -zl(now ? 110 : 100), { counterparty: 'BIEDRONKA' }))
    }
    const netflix = containerSchema.parse({ ...base(), name: 'Netflix', amount: zl(49), dueMonth: '2024-10', dueDay: 10, past: [{ until: '2025-12', amount: zl(43) }] })
    const r = personalInflation({ transactions: txs, categories, containers: [netflix], month: '2026-10', covered, cpi: { '2026-08': 4.1, '2026-09': 4.9 }, hullMonths: 6 })
    expect(r.months).toHaveLength(12)
    expect(r.categories[0]).toMatchObject({ id: FOOD, before: zl(3600), now: zl(3960), change: 10 })
    expect(r.brands.map((b) => [b.name, b.before, b.now, b.change])).toEqual([['BIEDRONKA', zl(100), zl(110), 10]])
    expect(r.containers.map((c) => [c.name, c.before, c.now, c.change])).toEqual([['Netflix', zl(43), zl(49), 14]])
    // Weighted by the year before: Biedronka 3 600 zł at +10%, Netflix 43 × 12 = 516 zł at +14% → 10,5%.
    expect(r.personal).toBe(Math.round(((10 * zl(3600) + 14 * zl(516)) / (zl(3600) + zl(516))) * 10) / 10)
    expect(r.cpi).toEqual({ month: '2026-09', value: 4.9 })
    expect(r.hull).toMatchObject({ before: 6 * zl(300), now: 6 * zl(330), change: 10 })
  })

  it('bez roku historii – brak porównań, bez CPI – brak', () => {
    const r = personalInflation({ transactions: [tx('2026-09-05', -zl(10))], categories, containers: [], month: '2026-10', covered: ['2026-09'], hullMonths: 6 })
    expect(r).toMatchObject({ months: [], categories: [], brands: [], containers: [], personal: null, cpi: null, hull: { before: null, now: null, change: null } })
  })
})

// ------------------------------------------------------------------ F29

describe('„Skąd ta liczba?” i słowniczek (1.10.0, F29)', () => {
  it('energia dziś: koperty codzienne, wydane do wczoraj, dni, podstawowy przydział, przeniesione, wydane dziś', () => {
    const lines = energyWhy({ limit: zl(3100), spentBefore: zl(1000), spentToday: zl(30), base: zl(100), allowance: zl(175), left: zl(145), daysLeft: 12 }, '2026-10')
    expect(lines.map((l) => [l.label, l.amount])).toEqual([
      ['Koperty codzienne w tym miesiącu (plan i łupy)', zl(3100)],
      ['Wydane z nich do wczoraj', -zl(1000)],
      ['Zostało na 12 dni (z dzisiejszym)', zl(2100)],
      ['Podstawowy przydział (limit / 31 dni)', zl(100)],
      ['Zaoszczędzone wcześniej – na każdy dzień', zl(75)],
      ['Przydział na dziś', zl(175)],
      ['Wydane dziś', -zl(30)],
      ['Energia dziś', zl(145)]
    ])
    expect(lines.at(-1)!.total).toBe(true)
  })

  it('zasięg: osłony, kadłub, dług, koszty – i cele warstw', () => {
    const f = { shields: { amount: zl(9000), target: zl(15000), free: 0, over: 0, min: null }, hull: { amount: zl(6000), target: zl(24000) }, debt: zl(3000), costs: { average: zl(4000), months: 12, source: 'history' as const }, range: 3, plan: { month: '2026-10', salary: zl(5000) } } as unknown as FleetState
    expect(rangeWhy(f).map((l) => [l.label, l.amount, l.text])).toEqual([
      ['Osłony', zl(9000), undefined],
      ['Kadłub', zl(6000), undefined],
      ['Dług do spłaty', -zl(3000), undefined],
      ['Paliwo (bez dopływu wypłat)', zl(12000), undefined],
      ['Koszty miesiąca (średnia z 12 mies.)', zl(4000), undefined],
      ['Zasięg', null, '3,0 mies.']
    ])
    expect(targetsWhy(f, { shieldSalaries: 3, hullMonths: 6 }).map((l) => [l.label, l.amount])).toEqual([
      ['Cel osłon: 3 × pensja', zl(15000)],
      ['Cel kadłuba: 6 × koszty miesiąca', zl(24000)],
      ['Koszty miesiąca', zl(4000)]
    ])
  })

  it('podział ostatniej dostawy z dziennika silnika; bez dostaw – nic', () => {
    const log = [
      { date: '2026-09-01', kind: 'trading', amount: zl(1000), moves: { shields: zl(1000) } },
      { date: '2026-10-05', kind: 'trading', amount: zl(5000), moves: { taxHold: zl(950), hull: zl(3000), goals: { G1: zl(1050) } } },
      { date: '2026-10-06', kind: 'trading', amount: -zl(200), moves: {} }
    ] as FleetEvent[]
    const d = deliveryWhy(log, (id) => (id === 'G1' ? 'Wakacje' : id))
    expect(d?.date).toBe('2026-10-05')
    expect(d?.lines.map((l) => [l.label, l.amount])).toEqual([
      ['Dostawa', zl(5000)],
      ['Rezerwa na PIT-38', zl(950)],
      ['Kadłub', zl(3000)],
      ['Cel: Wakacje', zl(1050)]
    ])
    expect(deliveryWhy([], (id) => id)).toBeNull()
  })

  it('słowniczek: każda metafora z prawdziwym znaczeniem', () => {
    expect(GLOSSARY.map((g) => g.term)).toContain('Osłony')
    expect(glossaryOf('Kadłub')).toBe('Kadłub – Fundusz awaryjny: kilka miesięcy kosztów na nieprzewidziane (cel – miesiące × koszty miesiąca).')
    expect(GLOSSARY.every((g) => g.meaning.length > 10)).toBe(true)
    expect(money(zl(1))).toBe('1.00 zł')
  })
})

// ------------------------------------------------------------------ the UI's shared parts (1.10.0)

describe('tagi w filtrze, wyszukiwaniu i imporcie; CPI; indeks roku kontrahenta (1.10.0)', () => {
  const ctxOf = () => ({ categories: categoryIndex(categories), accounts: settings.accounts, orders: settings.orders })

  it('filtr Operacji po tagu (operacji albo części paragonu), wyszukiwanie po „#tag”, filtr z pliku i „bez zawężeń”', () => {
    const own = tx('2026-10-01', -zl(10), { tags: ['Wakacje 2027'] })
    const line = tx('2026-10-02', -zl(20), { splits: [{ id: nextId(), amount: -zl(20), categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '', tags: ['wakacje 2027'] }] })
    const other = tx('2026-10-03', -zl(30), { tags: ['remont'] })
    const f = { ...emptyFilter('2026-10'), tags: [tagKey('#Wakacje  2027')] }
    expect([own, line, other].filter((t) => matchesFilter(t, f, ctxOf())).map((t) => t.amount)).toEqual([-zl(10), -zl(20)])
    // The search finds the tag written with „#” and without; the filter of a saved view reads it.
    expect([own, line, other].filter((t) => matchesQuery(t, '#remont', ctxOf()))).toEqual([other])
    expect([own, line, other].filter((t) => matchesQuery(t, 'wakacje', ctxOf())).length).toBe(2)
    expect(filterOf({ tags: ['wakacje 2027', 5] }, '2026-10').tags).toEqual(['wakacje 2027'])
    expect(noNarrowing().tags).toEqual([])
    expect(narrows({ ...emptyFilter('2026-10'), tags: ['x'] })).toBe(true)
  })

  it('import: operacja z reguły dostaje jej tagi – nie, gdy decyzja wiersza jest inna niż reguły', () => {
    const rule = importRuleSchema.parse({ id: nextId(), match: 'netia', mode: 'exact', direction: 'out', label: 'Netia', kind: 'expense', categoryId: defaultCategoryId(7, 2), learned: false, hits: 1, updatedAt: AT, tags: ['ulga-internet'] })
    const row = (line: number, date: string, amount: number) => ({ line, date, description: 'NETIA Faktura', operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY', counterparty: 'NETIA', title: 'Faktura', accountNo: '', category: '', amount, pending: false, balanceAfter: null })
    const file: MbankFile = { format: 'lista', client: null, account: null, period: { from: '2026-10-01', to: '2026-10-31' }, rows: [row(2, '2026-10-05', -zl(60)), row(3, '2026-10-06', -zl(70))], skipped: [] }
    const plan = planImport(file, MBANK_ACCOUNT_ID, [], { rules: [rule], ownNames: [], categories: categoryIndex(categories) })
    const keyOf = (amount: number) => plan.rows.find((p) => 'row' in p && p.row.amount === amount)!.key
    const choices: ImportChoices = { themes: {}, rememberThemes: {}, groups: {}, rows: { [keyOf(-zl(70))]: { kind: 'expense', categoryId: FOOD, refundable: false, memberId: null, household: false, advance: false, counterAccountId: null } as never }, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} }
    const created = buildImport(plan, choices, { now: AT, makeId: nextId, rules: [rule] }).create
    expect(created.map((t) => [t.amount, t.tags])).toEqual([
      [-zl(60), ['ulga-internet']],
      [-zl(70), undefined]
    ])
  })

  it('CPI wpisane ręcznie: przecinek, minus, procent; puste zdejmuje; spoza zakresu i tekst – odrzucone', () => {
    expect(parseCpi('4,9')).toBe(4.9)
    expect(parseCpi(' -0,5 %')).toBe(-0.5)
    expect(parseCpi('12')).toBe(12)
    expect(parseCpi('')).toBeNull()
    expect(parseCpi('dużo')).toBeUndefined()
    expect(parseCpi('250')).toBeUndefined()
    expect(parseCpi('4,955')).toBeUndefined()
  })

  it('rok kontrahenta z indeksu liczonego raz: zwroty netto, inny rok osobno', () => {
    const a = tx('2026-03-01', -zl(30), { counterparty: 'ŻABKA' })
    const b = tx('2026-04-01', -zl(42), { counterparty: 'ŻABKA' })
    const back = tx('2026-04-02', zl(12), { counterparty: 'ŻABKA' })
    const old = tx('2025-12-30', -zl(99), { counterparty: 'ŻABKA' })
    const index = brandYears([a, b, back, old])
    expect(brandYearOf(index, b)).toEqual({ year: '2026', count: 2, total: zl(60), average: zl(30) })
    expect(brandYearOf(index, old)).toBeNull()
    expect(savingsRate(zl(500), zl(4000))).toBe(12.5)
    expect(savingsRate(zl(500), 0)).toBeNull()
  })
})

// ------------------------------------------------------------------ the review's findings (T298)

describe('poprawki z przeglądu grupy V (1.10.0, T298)', () => {
  it('tagi po przecinku z „#”: „#wakacje, #remont” – bez „#” i spacji w nazwie', () => {
    expect(parseTags('#wakacje, #remont')).toEqual(['wakacje', 'remont'])
    expect(withTags([], ['  #Chorwacja '])).toEqual(['Chorwacja'])
    expect(tagKey(' #Remont')).toBe('remont')
  })

  it('wpływ z tagiem: pieniądze domownika nie zmniejszają wydanych na wyprawę; moja linia – ze swoim tagiem i kategorią', () => {
    const member = nextId()
    const trip = tx('2026-07-01', -zl(400), { categoryId: AUTO, tags: ['wakacje'] })
    // Mama sends her half of the trip – her money (a repayment, an advance), not less spent of mine.
    const mama = tx('2026-07-05', zl(200), { kind: 'income', categoryId: null, memberId: member, tags: ['wakacje'] })
    // One transfer: 50 zł mine (a deposit back – its line tagged, the car's), 30 zł Mama's line; the operation's tag none.
    const mixed = tx('2026-07-06', zl(80), {
      kind: 'income',
      categoryId: null,
      splits: [
        { id: nextId(), amount: zl(50), categoryId: AUTO, refundable: false, memberId: null, advance: false, note: '', tags: ['wakacje'] },
        { id: nextId(), amount: zl(30), categoryId: null, refundable: false, memberId: member, advance: false, note: '', tags: ['wakacje'] }
      ]
    })
    // Two lines of mine with their own tags: each nets its tag only.
    const two = tx('2026-07-07', zl(30), {
      kind: 'income',
      categoryId: null,
      splits: [
        { id: nextId(), amount: zl(20), categoryId: AUTO, refundable: false, memberId: null, advance: false, note: '', tags: ['wakacje'] },
        { id: nextId(), amount: zl(10), categoryId: FOOD, refundable: false, memberId: null, advance: false, note: '', tags: ['remont'] }
      ]
    })
    const list = tagSummaries([trip, mama, mixed, two], categoryIndex(categories))
    const s = list.find((x) => x.key === 'wakacje')!
    expect(s).toMatchObject({ spent: zl(330), count: 3 })
    expect(Object.fromEntries(s.byCategory)).toEqual({ [AUTO]: zl(330) })
    expect(list.find((x) => x.key === 'remont')).toMatchObject({ spent: -zl(10), count: 1 })
  })

  it('tag najwyżej 40 znaków, operacja najwyżej 20 tagów; ostatni tag – z najnowszej daty, nie z kolejności listy', () => {
    expect(tagLabel('x'.repeat(50))).toHaveLength(40)
    expect(withTags([], Array.from({ length: 25 }, (_, i) => `tag ${i}`))).toHaveLength(MAX_TAGS)
    const older = tx('2026-10-15', -zl(10), { tags: ['Starszy'], updatedAt: '2026-10-19T10:00:00.000Z' })
    const newer = tx('2026-10-18', -zl(10), { tags: ['Nowszy'] })
    expect(lastTag([older, newer], '2026-10-20')).toBe('Nowszy')
  })

  it('porównanie miesiąca: średnie i rok wcześniej tylko z miesięcy objętych historią', () => {
    const txs = [tx('2025-10-03', -zl(200)), tx('2026-08-03', -zl(100)), tx('2026-09-03', -zl(100)), tx('2026-10-03', -zl(300))]
    // July and the October before are not in the history: no 0 zł for them.
    const [food] = monthComparison(txs, categories, '2026-10', ['2026-08', '2026-09'])
    expect(food).toMatchObject({ id: FOOD, value: zl(300), avg3: zl(100), avg12: zl(100), yearAgo: null })
  })

  it('bilans paliwa: miesiąc w historii średnich nie liczy się drugi raz do swoich median', () => {
    const history = [tx('2026-09-01', zl(5000), { kind: 'income', categoryId: null }), tx('2026-09-10', -zl(4000)), tx('2026-10-01', zl(5000), { kind: 'income', categoryId: null }), tx('2026-10-10', -zl(5500))]
    const s = fuelSummary(history, plainIncomeContext(history), '2026-10', ['2026-09', '2026-10'])
    expect(s.median6).toBe(20)
  })

  it('inflacja: marka od 3 zakupów w każdym roku, kontener tylko czynny rok temu i teraz', () => {
    const covered: string[] = []
    for (let m = '2025-04'; m <= '2026-09'; m = Number(m.slice(5)) === 12 ? `${Number(m.slice(0, 4)) + 1}-01` : `${m.slice(0, 5)}${String(Number(m.slice(5)) + 1).padStart(2, '0')}`) covered.push(m)
    const txs = [tx('2025-05-05', -zl(20), { counterparty: 'KIOSK' }), tx('2025-06-05', -zl(20), { counterparty: 'KIOSK' }), tx('2026-05-05', -zl(30), { counterparty: 'KIOSK' }), tx('2026-06-05', -zl(30), { counterparty: 'KIOSK' })]
    // Started this year (its price a year ago is no price): not compared.
    const gym = containerSchema.parse({ ...base(), name: 'Siłownia', amount: zl(150), dueMonth: '2026-01', dueDay: 5, from: '2026-01', past: [{ until: '2026-03', amount: zl(120) }] })
    const r = personalInflation({ transactions: txs, categories, containers: [gym], month: '2026-10', covered, hullMonths: 6 })
    expect(r.brands).toEqual([])
    expect(r.containers).toEqual([])
    expect(r.personal).toBeNull()
  })

  it('pożyczki do dziś: spłata z datą po dziś nie zmniejsza należności', () => {
    const loan = loanSchema.parse({ ...base(), name: 'Dla brata', direction: 'given', amount: zl(3000), date: '2026-09-10' })
    const txs = [tx('2026-09-10', -zl(3000), { kind: 'loan', loanId: loan.id, categoryId: null }), tx('2026-10-10', zl(1000), { kind: 'loan', loanId: loan.id, categoryId: null })]
    expect(loanState(loan, txs, [], '2026-10-04')).toMatchObject({ total: zl(3000), paid: 0, open: zl(3000) })
    expect(loanState(loan, txs, [], '2026-10-10')).toMatchObject({ paid: zl(1000), open: zl(2000) })
  })

  it('udział marki w kategorii liczy też zakupy bez nazwy (gotówka, wpis ręczny)', () => {
    const txs = [tx('2026-09-05', -zl(150), { counterparty: 'BIEDRONKA' }), tx('2026-09-06', -zl(50)), tx('2026-09-07', -zl(100), { categoryId: AUTO })]
    const [biedronka] = brandStats(txs, categories, '2026-09-01', '2026-09-30')
    expect(biedronka).toMatchObject({ name: 'BIEDRONKA', total: zl(150), share: 75 })
  })

  it('waga kontenera w „Twojej inflacji” z porównywanych miesięcy – jak waga marek', () => {
    // History of 18 months: 6 months compared with their year before.
    const covered: string[] = []
    for (let m = '2025-04'; m <= '2026-09'; m = Number(m.slice(5)) === 12 ? `${Number(m.slice(0, 4)) + 1}-01` : `${m.slice(0, 5)}${String(Number(m.slice(5)) + 1).padStart(2, '0')}`) covered.push(m)
    const txs: Transaction[] = []
    for (const m of covered) for (const d of ['05', '15', '25']) txs.push(tx(`${m}-${d}`, -zl(m >= '2025-10' ? 110 : 100), { counterparty: 'BIEDRONKA' }))
    const netflix = containerSchema.parse({ ...base(), name: 'Netflix', amount: zl(49), dueMonth: '2025-04', dueDay: 10, past: [{ until: '2025-12', amount: zl(43) }] })
    const r = personalInflation({ transactions: txs, categories, containers: [netflix], month: '2026-10', covered, hullMonths: 6 })
    expect(r.months).toHaveLength(6)
    expect(r.brands[0]).toMatchObject({ name: 'BIEDRONKA', change: 10, weight: zl(1800) })
    expect(r.containers[0]).toMatchObject({ name: 'Netflix', change: 14, weight: zl(43 * 6) })
    expect(r.personal).toBe(Math.round(((10 * zl(1800) + 14 * zl(258)) / (zl(1800) + zl(258))) * 10) / 10)
  })
})
