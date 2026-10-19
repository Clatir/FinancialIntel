import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { brandOf, keywordIn, keywordMatches, normalizeKeyword, tokens, words } from '@shared/import/brands'
import { classifyRow, findRule, ruleTargetOf } from '@shared/import/classify'
import { parseMbank, type MbankRow } from '@shared/import/mbank'
import { buildImport, importGroups, importThemes, planImport, searchGroups, type Choice, type ImportChoices } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { CASH_CATEGORY_ID, defaultCategoryId, MBANK_ACCOUNT_ID, type ImportRule } from '@shared/schema'

const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const fixture = () => parseMbank(decodeText(new Uint8Array(readFileSync(FIXTURE))))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K2${String(++seq).padStart(22, '0')}`
const ctx = (rules: ImportRule[] = []) => ({ rules, ownNames: ['JAN KAPITAN'], categories })
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })
const row = (over: Partial<MbankRow>): MbankRow => ({
  line: 1,
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
const rule = (over: Partial<ImportRule>): ImportRule => ({
  id: makeId(),
  match: '',
  mode: 'exact',
  direction: 'out',
  label: '',
  kind: 'expense',
  categoryId: null,
  refundable: false,
  household: false,
  memberId: null,
  counterAccountId: null,
  learned: true,
  hits: 0,
  updatedAt: NOW,
  ...over
})
const expense = (categoryId: string | null): Choice => ({ kind: 'expense', categoryId, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null })

const GROCERIES = defaultCategoryId(1, 1)
const PARKING = defaultCategoryId(3, 4)

describe('klucz marki (D75, pomysł 1)', () => {
  it('jedna sieć to jeden klucz: bez miasta, numeru sklepu, operatora płatności i domeny', () => {
    expect(brandOf('DINO JELENIA GORA 4')).toMatchObject({ key: 'dino', brand: { label: 'Dino' } })
    expect(brandOf('Maxi Zoo Jelenia G?ra').key).toBe('maxizoo')
    for (const name of ['Allegro', 'ALLEGRO.PL', 'PAYPRO SA *ALLEGRO']) expect(brandOf(name).key).toBe('allegro')
    expect(brandOf('GOOGLE *YouTubePremium').key).toBe('youtube')
    expect(brandOf('ŻABKA Z6512 K.1').key).toBe('zabka')
    expect(brandOf('TJXEurope Ltd. Co. KG.').brand?.label).toBe('TK Maxx')
    // Not in the dictionary: the name without the city, the shop code, the processor, the domain.
    expect(brandOf('SPP JELENIA GORA').key).toBe('spp')
    expect(brandOf('SPP WROCLAW').key).toBe('spp')
    expect(brandOf('KAWIARNIA POD LIPA KRAKOW 12345')).toEqual({ key: 'kawiarniapodlipa', brand: null, words: ['kawiarnia', 'pod', 'lipa'] })
    expect(brandOf('SumUp *PRACOWNIA').key).toBe('pracownia')
    expect(brandOf('SP FLARE AUDIO').key).toBe('flareaudio')
    expect(brandOf('Chess.com 800-318-2827').key).toBe('chess')
    expect(brandOf('www.dlakrolika.pl').key).toBe('dlakrolika')
    // A city alone stays a name; a station's toilet is no train ticket; a person paid by BLIK is no chain.
    expect(brandOf('WROCLAW').key).toBe('wroclaw')
    expect(brandOf('Toalety Dworzec PKP').brand).toBeNull()
    expect(brandOf('ORANGE JAN', { dictionary: false })).toEqual({ key: 'orangejan', brand: null, words: ['orange', 'jan'] })
  })
})

describe('marka a rodzaj operacji (przegląd 1.2.1)', () => {
  it('bankomat w sklepie sieci to nie zakupy; przelew: sieć tylko od początku nazwy, nazwisko-miasto zostaje; kod sklepu znika', () => {
    const zabkaRule = rule({ match: 'zabka', categoryId: GROCERIES })
    const atm = classifyRow(row({ operation: 'WYPŁATA W BANKOMACIE', counterparty: 'BANKOMAT ZABKA Z1234 KRAKOW' }), ctx([zabkaRule]))
    expect(atm.decision).toMatchObject({ categoryId: CASH_CATEGORY_ID, source: 'builtin', reason: 'wypłata z bankomatu → Gotówka' })
    expect(atm.brand.brand).toBeNull()
    const transfer = (counterparty: string) => ruleTargetOf({ counterparty, title: 'PRZELEW', operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY' }).brand
    expect(transfer('ANNA BIEDRONKA').brand).toBeNull()
    expect(transfer('PGE OBRÓT S.A.').key).toBe('pge')
    expect(transfer('JAN KALISZ').key).not.toBe(transfer('JAN KONIN').key)
    expect(brandOf('SKLEP ABC Z6512').key).toBe(brandOf('SKLEP ABC').key)
  })

  it('wyszukiwanie: liczba to kwota albo tekst (data); nazwa – cała grupa', () => {
    const groups = importGroups(planImport(fixture(), MBANK_ACCOUNT_ID, [], ctx()))
    const byDate = searchGroups(groups, '15.08.2025')
    expect(byDate.size).toBeGreaterThan(0)
    for (const [, rows] of byDate) if (rows !== 'all') expect(rows.every((r) => r.row.date === '2025-08-15')).toBe(true)
    expect(searchGroups(groups, 'bolt').get(groups.find((g) => g.brand === 'bolt')!.group)).toBe('all')
  })

  it('jedna marka w dwóch grupach z różnymi decyzjami: reguła z decyzji większej grupy, trafienia razem', () => {
    const old = rule({ match: 'orlenstacja', categoryId: defaultCategoryId(3, 2) })
    const file = { format: 'lista' as const, client: null, account: null, period: null, skipped: [], rows: [row({ counterparty: 'ORLEN STACJA 123' }), row({ counterparty: 'ORLEN STACJA 123', date: '2026-10-02' }), row({ counterparty: 'ORLEN' })] }
    const p = planImport(file, MBANK_ACCOUNT_ID, [], ctx([old]))
    const groups = importGroups(p).filter((g) => g.brand === 'orlen')
    expect(groups.map((g) => g.rows.length).sort()).toEqual([1, 2])
    const choices = emptyChoices()
    for (const g of groups) {
      choices.groups[g.group] = expense(g.rows.length === 2 ? GROCERIES : PARKING)
      choices.remember[g.group] = true
    }
    const result = buildImport(p, choices, { now: NOW, makeId, rules: [old] })
    expect(result.rules.filter((r) => r.match === 'orlen')).toEqual([expect.objectContaining({ categoryId: GROCERIES, hits: 3 })])
  })
})

describe('słowa kluczowe (D75, pomysł 3)', () => {
  it('całe słowa od początku, pierwsze pasujące; schronisko dla zwierząt to nie schronisko w górach', () => {
    const kw = (text: string) => keywordIn(words(text))
    expect(kw('STACJA PALIW OCHMAN')).toMatchObject({ at: 0, length: 2, keyword: { category: [3, 1] } })
    expect(kw('PRZYCH. WETERYNARYJNA CIE')).toMatchObject({ at: 1, length: 1, keyword: { category: [4, 2] } })
    expect(kw('SCHRONISKO DLA ZWIERZAT LAPA')?.keyword.category).toEqual([4, 0])
    expect(kw('SZRENICA SCHRONIS67048')?.keyword.category).toEqual([6, 3])
    expect(kw('Toalety Dworzec PKP')?.keyword.category).toEqual([9, 2])
    expect(kw('BARBARA NOWAK')).toBeNull()
    expect(keywordMatches(words('Cukiernia Słodka'), 'cukiernia')).toBe(true)
    expect(keywordMatches(words('Cukiernie Polskie'), 'cukiernia')).toBe(false)
    expect(keywordMatches(words('Stacja paliwowa'), normalizeKeyword('  Stacja  Paliw '))).toBe(true)
    expect(normalizeKeyword('  Stacja  Paliw ')).toBe('stacja paliw')
  })

  it('wydatek: słowo z nazwy albo z tytułu przelewu; wpływ – nigdy (zwrot od znajomego to Twoja decyzja)', () => {
    expect(classifyRow(row({ counterparty: 'APTEKA POD ORLEM' }), ctx()).decision).toMatchObject({ kind: 'expense', categoryId: defaultCategoryId(5, 1), source: 'keyword', byTitle: false, reason: 'słowo „apteka”' })
    const dinner = classifyRow(row({ operation: 'BLIK P2P-WYCHODZĄCY', counterparty: 'ANNA X', title: 'KOLACJA' }), ctx()).decision
    expect(dinner).toMatchObject({ categoryId: defaultCategoryId(1, 2), source: 'keyword', byTitle: true, reason: 'słowo „kolacja” w tytule' })
    // The word as written: „kręgle”, not the folded „kregle”.
    expect(classifyRow(row({ operation: 'BLIK P2P-WYCHODZĄCY', counterparty: 'ANNA X', title: 'Kręgle 12.10' }), ctx()).decision.reason).toBe('słowo „kręgle” w tytule')
    expect(tokens('Maxi Zoo Jelenia G?ra SCHRONIS67048')).toEqual([
      { word: 'maxi', text: 'maxi' },
      { word: 'zoo', text: 'zoo' },
      { word: 'jelenia', text: 'jelenia' },
      { word: 'g?ra', text: 'g?ra' },
      { word: 'schronis', text: 'schronis' }
    ])
    expect(classifyRow(row({ operation: 'BLIK P2P-PRZYCHODZĄCY', counterparty: 'ANNA X', title: 'Kręgle', amount: 2000 }), ctx()).decision).toMatchObject({ kind: 'income', source: 'none' })
    // An archived category: no guess (the brand still groups).
    const archived = categoryIndex(settings.categories.map((c) => (c.id === GROCERIES ? { ...c, archived: true } : c)))
    const lidl = classifyRow(row({ counterparty: 'LIDL SKLEP 123' }), { ...ctx(), categories: archived })
    expect(lidl.decision).toMatchObject({ categoryId: null, source: 'none' })
    expect(lidl.brand.key).toBe('lidl')
  })
})

describe('reguły po marce i słowach (1.2.1)', () => {
  it('kolejność: dokładna marka, dokładna cała nazwa (reguły sprzed 1.2.1), „zawiera”, Twoje słowo; potem słownik i słowa', () => {
    const target = { brand: 'dino', raw: 'dino', key: 'dinojeleniagora', name: words('DINO JELENIA GORA 4'), title: [] }
    const old = rule({ match: 'dinojeleniagora', categoryId: defaultCategoryId(1, 3) })
    const brandRule = rule({ match: 'dino', categoryId: GROCERIES })
    const contains = rule({ match: 'jelenia', mode: 'contains', categoryId: defaultCategoryId(9, 2) })
    const word = rule({ match: 'dino', mode: 'keyword', categoryId: defaultCategoryId(6) })
    expect(findRule([old, brandRule, contains, word], target, 'out')).toBe(brandRule)
    expect(findRule([old, contains, word], target, 'out')).toBe(old)
    expect(findRule([contains, word], target, 'out')).toBe(contains)
    expect(findRule([word], target, 'out')).toBe(word)
    expect(findRule([word], target, 'in')).toBeNull()
    // A rule learned before 1.2.1 still decides its shop, ahead of the dictionary.
    expect(classifyRow(row({ counterparty: 'DINO JELENIA GORA 4' }), ctx([old])).decision).toMatchObject({ source: 'rule', categoryId: defaultCategoryId(1, 3) })
    // The user's keyword: in the title too, and said so.
    const cake = rule({ match: 'tort', mode: 'keyword', label: 'tort', categoryId: defaultCategoryId(9, 1) })
    expect(classifyRow(row({ operation: 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY', counterparty: 'JAN NOWAK', title: 'tort urodzinowy' }), ctx([cake])).decision).toMatchObject({
      source: 'rule',
      categoryId: defaultCategoryId(9, 1),
      byTitle: true,
      reason: 'Twoje słowo „tort” w tytule'
    })
  })
})

describe('tematy i „Przyjmij pewne” (D75, pomysł 4)', () => {
  const plan = () => planImport(fixture(), MBANK_ACCOUNT_ID, [], ctx())

  it('marki w tematach: jedna kategoria – jeden temat; bez propozycji – po podpowiedzi mBanku albo rodzaju operacji', () => {
    const themes = importThemes(importGroups(plan()))
    const groceries = themes.find((t) => t.basis.kind === 'proposal' && t.basis.choice.categoryId === GROCERIES && t.direction === 'out')!
    expect(groceries.groups.map((g) => g.label)).toEqual(expect.arrayContaining(['Żabka', 'Lidl', 'Biedronka', 'Dino']))
    expect(groceries.source).toBe('brand')
    const parking = themes.find((t) => t.basis.kind === 'proposal' && t.basis.choice.categoryId === PARKING)!
    // The fixture's cities are made up („TESTOWO”), so the parking zones stay apart – but in one theme.
    expect(parking.groups.map((g) => g.brand)).toEqual(expect.arrayContaining(['spptestowo', 'cpgspptestowe', 'kbusppstolica', 'parkingcentrum']))
    expect(themes.find((t) => t.basis.kind === 'hint' && t.groups.some((g) => g.brand === 'allegro'))?.basis).toMatchObject({ categoryId: defaultCategoryId(8), bankCategories: ['Osobiste - inne'] })
    expect(themes.find((t) => t.basis.kind === 'op' && t.direction === 'in')?.groups.map((g) => g.brand)).toContain('tomaszxxx')
    // Every new row in exactly one theme.
    expect(themes.reduce((s, t) => s + t.count, 0)).toBe(269)
  })

  it('decyzja tematu obejmuje jego marki; grupa i wiersz mają pierwszeństwo; „zapamiętaj” uczy reguł marek', () => {
    const p = plan()
    const groups = importGroups(p)
    const groceries = groups.find((g) => g.brand === 'lidl')!.theme
    const choices = emptyChoices()
    choices.themes[groceries] = expense(defaultCategoryId(1))
    choices.rememberThemes[groceries] = true
    const zabka = groups.find((g) => g.brand === 'zabka')!
    choices.groups[zabka.group] = expense(defaultCategoryId(1, 3))
    choices.remember[zabka.group] = false
    const oneLidl = p.rows.find((r) => r.status === 'new' && r.brand === 'lidl')!
    choices.rows[oneLidl.key] = expense(null)
    const result = buildImport(p, choices, { now: NOW, makeId, rules: [] })
    const cat = (name: string) => [...new Set(result.create.filter((t) => t.counterparty === name).map((t) => t.categoryId))]
    expect(cat('Biedronka')).toEqual([defaultCategoryId(1)])
    expect(cat('Żabka')).toEqual([defaultCategoryId(1, 3)])
    expect(cat('LIDL').sort()).toEqual([defaultCategoryId(1), null].sort())
    // The theme's brands learn their rule; Żabka was decided apart without „zapamiętaj”.
    const learned = result.rules.map((r) => r.match)
    expect(learned).toEqual(expect.arrayContaining(['lidl', 'biedronka', 'dino']))
    expect(learned).not.toContain('zabka')
    expect(result.rules.find((r) => r.match === 'lidl')).toMatchObject({ mode: 'exact', direction: 'out', categoryId: defaultCategoryId(1), label: 'Lidl' })
  })

  it('„Przyjmij pewne” = propozycja jako decyzja: reguły marek ze słownika i słów, nie z reguł, rozpoznania ani tytułu', () => {
    const p = planImport(fixture(), MBANK_ACCOUNT_ID, [], ctx(settings.import.rules))
    const themes = importThemes(importGroups(p))
    const choices = emptyChoices()
    for (const t of themes)
      if (t.basis.kind === 'proposal') {
        choices.themes[t.theme] = t.basis.choice
        choices.rememberThemes[t.theme] = true
      }
    const result = buildImport(p, choices, { now: NOW, makeId, rules: settings.import.rules })
    const learned = new Set(result.rules.map((r) => r.match))
    // Chains and keywords of names: learned.
    expect(learned).toContain('biedronka')
    expect(learned).toContain('spptestowo')
    // The starter rules say the same; XTB is the app's own recognition; the same result as without accepting.
    expect(result.rules.filter((r) => r.match === 'bolt')).toHaveLength(1)
    expect(learned).not.toContain('xtb')
    // A keyword of a transfer's title („Doładowanie telefonu”, „KOLACJA”) is about that payment.
    expect(learned).not.toContain('bluemedia')
    expect(learned).not.toContain('marekxxx')
    const plain = buildImport(p, emptyChoices(), { now: NOW, makeId, rules: settings.import.rules })
    const shape = (r: typeof result) => r.create.map((t) => [t.date, t.amount, t.kind, t.categoryId]).sort()
    expect(shape(result)).toEqual(shape(plain))
  })

  it('podpowiedź mBanku przyjęta dla tematu nie jest decyzją użytkownika – bez reguł (D68)', () => {
    const p = plan()
    const theme = importThemes(importGroups(p)).find((t) => t.basis.kind === 'hint' && t.groups.some((g) => g.brand === 'allegro'))!
    const choices = emptyChoices()
    choices.themes[theme.theme] = expense(theme.basis.kind === 'hint' ? theme.basis.categoryId : null)
    choices.rememberThemes[theme.theme] = false
    const result = buildImport(p, choices, { now: NOW, makeId, rules: [] })
    expect(result.rules).toEqual([])
    expect(new Set(result.create.filter((t) => /allegro/i.test(t.counterparty)).map((t) => t.categoryId))).toEqual(new Set([defaultCategoryId(8)]))
  })
})
