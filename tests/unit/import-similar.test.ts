import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { pairKey, resolveBrand, withMerged, type BrandAliases } from '@shared/import/aliases'
import { brandOf } from '@shared/import/brands'
import { cleanBankName } from '@shared/import/names'
import { classifyRow, findRule, ruleTargetOf } from '@shared/import/classify'
import { keywordProposals } from '@shared/import/learn'
import { parseMbank, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { importGroups, planImport, type Choice, type ImportChoices, type ImportGroup } from '@shared/import/reconcile'
import { editDistance, mergeTarget, similarity, similarPairs } from '@shared/import/similar'
import { defaultCategoryId, importSettingsSchema, MBANK_ACCOUNT_ID, type ImportRule } from '@shared/schema'

const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K5${String(++seq).padStart(22, '0')}`
const CARD = 'ZAKUP PRZY UŻYCIU KARTY W KRAJU'
const P2P = 'BLIK P2P-WYCHODZĄCY'
const COFFEE = defaultCategoryId(1, 3)
const GROCERIES = defaultCategoryId(1, 1)
const GIFTS = defaultCategoryId(9, 1)
const OTHER = defaultCategoryId(9, 2)

const row = (counterparty: string, over: Partial<MbankRow> = {}): MbankRow => ({
  line: ++seq,
  date: '2026-10-01',
  description: counterparty,
  operation: CARD,
  counterparty,
  title: '',
  accountNo: '',
  category: '',
  amount: -1000 - seq,
  pending: false,
  balanceAfter: null,
  ...over
})
const file = (rows: MbankRow[]): MbankFile => ({ format: 'lista', client: null, account: null, period: null, rows, skipped: [] })
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
  counterAccountId: null,
  learned: true,
  hits: 3,
  updatedAt: NOW,
  ...over
})
const expense = (categoryId: string | null): Choice => ({ kind: 'expense', categoryId, refundable: false, household: false, counterAccountId: null })
const empty = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {} })
const groupsOf = (rows: MbankRow[], rules: ImportRule[] = [], aliases: BrandAliases = {}) =>
  importGroups(planImport(file(rows), MBANK_ACCOUNT_ID, [], { rules, ownNames: ['JAN KAPITAN'], categories, aliases }))
const byLabel = (groups: readonly ImportGroup[], label: string) => groups.find((g) => g.label === label)!

/** A name as the similar names compare it (`brandOf` of a card purchase, or of a person paid by BLIK). */
const entry = (name: string, person = false) => {
  const m = brandOf(name, { dictionary: !person })
  return { brand: m.key, head: m.words, distinct: m.words.filter((w) => !['kawiarnia', 'apteka', 'bistro', 'sklep', 'pizzeria'].includes(w)), person }
}

describe('podobne nazwy (D78, pomysł 5)', () => {
  it('te same słowa, ucięta nazwa, literówka, ta sama nazwa na początku – bez miast i ogólnych słów', () => {
    expect(editDistance('kawiarniamoka', 'kawiarniamokka', 2)).toBe(1)
    expect(editDistance('abcdef', 'uvwxyz', 2)).toBe(3)
    expect(similarity(entry('KAWIARNIA MOKKA'), entry('MOKKA KAWIARNIA SP. Z O.O.'))).toBe('words')
    expect(similarity(entry('MOKKA'), entry('KAWIARNIA MOKKA'))).toBe('words')
    expect(similarity(entry('RESTAURACJA POD ZLOTYM KO'), entry('RESTAURACJA POD ZLOTYM KOGUTEM'))).toBe('cut')
    expect(similarity(entry('KAWIARNIA MOKA'), entry('KAWIARNIA MOKKA'))).toBe('typo')
    expect(similarity(entry('MOKKA GALAXY'), entry('MOKKA ARKADIA'))).toBe('first')
    // One word, last in both names: the town of two shops.
    expect(similarity(entry('APTEKA SWIEBODZICE'), entry('BISTRO SWIEBODZICE'))).toBeNull()
    // People: two words at least, no common first name.
    expect(similarity(entry('JAN NOWAK', true), entry('NOWAK JAN', true))).toBe('words')
    expect(similarity(entry('ANNA NOWAK', true), entry('JAN NOWAK', true))).toBeNull()
    expect(similarity(entry('JANUSZ NOWAK', true), entry('JANUSZ KOWALSKI', true))).toBeNull()
    // A letter apart: a typo of a shop, of people – another person.
    expect(similarity(entry('MARIA KOWALSKA', true), entry('MARTA KOWALSKA', true))).toBeNull()
    expect(similarity(entry('SKLEP'), entry('SKLEP ABC'))).toBeNull()
  })

  it('pary z pliku i z Twoimi regułami; sieci ze słownika i odrzucone pary pomijane', () => {
    const rows = [
      row('KAWIARNIA MOKKA'),
      row('KAWIARNIA MOKKA'),
      row('MOKKA KAWIARNIA SP. Z O.O.'),
      row('BIEDRONKA 1234'),
      row('BIEDRONKA KONIN'),
      row('APTEKA SWIEBODZICE'),
      row('BISTRO SWIEBODZICE'),
      row('ROMA PIZZERIA'),
      row('JAN NOWAK', { operation: P2P }),
      row('NOWAK JAN', { operation: P2P })
    ]
    const roma = rule({ match: 'pizzeriaroma', label: 'PIZZERIA ROMA', categoryId: OTHER })
    const groups = groupsOf(rows, [roma])
    const pairs = similarPairs(groups, { rules: [roma] })
    expect(pairs.map((p) => [p.a.label, p.b.label, p.why])).toEqual([
      ['KAWIARNIA MOKKA', 'MOKKA KAWIARNIA SP. Z O.O.', 'words'],
      ['JAN NOWAK', 'NOWAK JAN', 'words'],
      ['ROMA PIZZERIA', 'PIZZERIA ROMA', 'words']
    ])
    // The rule's side: no operations in the file, its rule.
    expect(pairs[2]!.b).toMatchObject({ brand: 'pizzeriaroma', count: 0, rules: [roma] })
    expect(mergeTarget([pairs[2]!.a, pairs[2]!.b]).brand).toBe('pizzeriaroma')
    expect(mergeTarget([pairs[0]!.a, pairs[0]!.b]).brand).toBe('kawiarniamokka')
    const dismissed = { [pairKey('nowakjan', 'jannowak')]: NOW }
    expect(similarPairs(groups, { rules: [roma], dismissed }).map((p) => p.a.label)).toEqual(['KAWIARNIA MOKKA', 'ROMA PIZZERIA'])
    // A rule of a whole name (learned before 1.2.1) already deciding a name of the file is no other name.
    const legacy = rule({ match: 'kawiarniapodlipakrakow', label: 'KAWIARNIA POD LIPA KRAKOW 12345' })
    expect(similarPairs(groupsOf([row('KAWIARNIA POD LIPA KRAKOW 12345')], [legacy]), { rules: [legacy] })).toEqual([])
  })

  it('połączone nazwy: jedna grupa i reguła – w imporcie, kolejnych importach i Operacjach', () => {
    const now = NOW
    let aliases = withMerged({}, { key: 'kawiarniamokka', label: 'KAWIARNIA MOKKA' }, [{ key: 'mokkakawiarnia', label: 'MOKKA KAWIARNIA' }], now)
    expect(aliases).toEqual({ mokkakawiarnia: { to: 'kawiarniamokka', label: 'MOKKA KAWIARNIA', toLabel: 'KAWIARNIA MOKKA', at: now } })
    // Merged again into another: the earlier merge follows (one step), never a loop.
    aliases = withMerged(aliases, { key: 'mokka', label: 'MOKKA' }, [{ key: 'kawiarniamokka', label: 'KAWIARNIA MOKKA' }], now)
    expect(aliases.mokkakawiarnia?.to).toBe('mokka')
    expect(aliases.kawiarniamokka?.to).toBe('mokka')
    expect(resolveBrand(aliases, 'mokkakawiarnia')).toBe('mokka')
    // Two computers merged one pair both ways: one key for both names, not two.
    const loop = { a: { to: 'b', label: '', toLabel: '', at: '' }, b: { to: 'a', label: '', toLabel: '', at: '' } }
    expect([resolveBrand(loop, 'a'), resolveBrand(loop, 'b')]).toEqual(['a', 'a'])

    const merged = withMerged({}, { key: 'kawiarniamokka', label: 'KAWIARNIA MOKKA' }, [{ key: 'mokkakawiarnia', label: 'MOKKA KAWIARNIA' }], now)
    const rows = [row('KAWIARNIA MOKKA'), row('MOKKA KAWIARNIA SP. Z O.O.')]
    expect(groupsOf(rows)).toHaveLength(2)
    const one = groupsOf(rows, [], merged)
    expect(one).toHaveLength(1)
    expect(one[0]).toMatchObject({ brand: 'kawiarniamokka', names: ['KAWIARNIA MOKKA', 'MOKKA KAWIARNIA SP. Z O.O.'] })
    expect(similarPairs(one, { aliases: merged })).toEqual([])
    // The kept name's rule decides the merged one; a rule of the merged name still works when the kept one has none.
    const kept = rule({ match: 'kawiarniamokka', categoryId: COFFEE })
    expect(classifyRow(row('MOKKA KAWIARNIA'), { rules: [kept], ownNames: [], categories, aliases: merged }).decision).toMatchObject({ source: 'rule', categoryId: COFFEE })
    const own = rule({ match: 'mokkakawiarnia', categoryId: OTHER })
    expect(findRule([own], ruleTargetOf({ counterparty: 'MOKKA KAWIARNIA', title: '', operation: CARD }, merged).target, 'out')).toBe(own)
    // A name merged into a chain is that chain.
    const toChain = withMerged({}, { key: 'biedronka', label: 'Biedronka' }, [{ key: 'jmp', label: 'JMP' }], now)
    expect(classifyRow(row('JMP'), { rules: [], ownNames: [], categories, aliases: toChain }).decision).toMatchObject({ source: 'brand', categoryId: GROCERIES })
    // One recognized, the other not: the merged names share the recognition – one group, not two.
    const cafe = withMerged({}, { key: 'kawiarniamokka', label: 'KAWIARNIA MOKKA' }, [{ key: 'mokka', label: 'MOKKA' }], now)
    const shared = groupsOf([row('KAWIARNIA MOKKA'), row('KAWIARNIA MOKKA'), row('MOKKA'), row('ATM MOKKA', { operation: 'WYPŁATA Z BANKOMATU' })], [], cafe)
    expect(shared.filter((g) => g.brand === 'kawiarniamokka').map((g) => [g.rows.length, g.source, g.proposed.categoryId])).toEqual([[3, 'keyword', COFFEE]])
    expect(shared.flatMap((g) => g.rows).find((p) => p.row.counterparty === 'MOKKA')!.decision.reason).toBe('jak „KAWIARNIA MOKKA” (połączone nazwy)')
    // A container's payment is linked by its exact payee: not passed on to the other name.
    const container = { id: makeId(), name: 'Kawa', counterparty: 'KAWIARNIA MOKKA', categoryId: COFFEE, archived: false }
    const plan = planImport(file([row('KAWIARNIA MOKKA'), row('MOKKA')]), MBANK_ACCOUNT_ID, [], { rules: [], ownNames: [], categories, aliases: cafe, containers: [container] })
    expect(plan.rows.map((p) => (p.status === 'new' ? [p.decision.containerId, p.decision.source] : null))).toEqual([
      [container.id, 'builtin'],
      [null, 'none']
    ])
  })

  it('ustawienia: zły wpis połączeń i odrzuceń odpada sam, reszta zostaje', () => {
    const parsed = importSettingsSchema.parse({
      aliases: { ok: { to: 'b', label: 'OK' }, self: { to: 'self' }, bad: { to: 5 }, empty: 'x' },
      notSimilar: { 'a|b': NOW, 'c|d': 7 }
    })
    expect(parsed.aliases).toEqual({ ok: { to: 'b', label: 'OK', toLabel: '', at: '' } })
    expect(parsed.notSimilar).toEqual({ 'a|b': NOW })
    expect(importSettingsSchema.parse({ aliases: 'zepsute' }).aliases).toEqual({})
  })
})

describe('propozycja reguły z liczbą operacji (D78, pomysł 6)', () => {
  const propose = (groups: ImportGroup[], label: string, choice: Choice, choices = empty(), rules: ImportRule[] = []) => {
    const g = byLabel(groups, label)
    return keywordProposals(groups, g, choice, { rules, choices: { ...choices, groups: { ...choices.groups, [g.group]: choice } }, ownNames: ['JAN KAPITAN'] })
  }

  it('słowo z nazwy, które mają inne operacje pliku, z liczbą tych, które zmieni', () => {
    const names = ['ZEGARMISTRZ POD ARKADAMI', 'ZEGARMISTRZ NA ROGU', 'ZEGARMISTRZ NA ROGU', 'ZEGARMISTRZA KOWALSKI', 'KIOSK SWIEBODZICE', 'DINO SWIEBODZICE 4']
    const groups = groupsOf(names.map((n) => row(n)))
    // „zegarmistrza” is the same word (an ending); a town – last in two names – is never a keyword.
    expect(propose(groups, 'ZEGARMISTRZ POD ARKADAMI', expense(OTHER)).map((x) => [x.text, x.rows.length, x.groups.length])).toEqual([['zegarmistrz', 3, 2]])
    expect(propose(groups, 'KIOSK SWIEBODZICE', expense(OTHER))).toEqual([])
    // A word only the start of another one („ZEGARMISTRZOWSKI”) is not offered: the rule would decide that one too.
    expect(propose(groupsOf([...names, 'ZEGARMISTRZOWSKI SALON'].map((n) => row(n))), 'ZEGARMISTRZ POD ARKADAMI', expense(OTHER))).toEqual([])
    // The other groups decided by the user, or the decision without a category: nothing to propose.
    const rogu = byLabel(groups, 'ZEGARMISTRZ NA ROGU')
    const kowalski = byLabel(groups, 'ZEGARMISTRZA KOWALSKI')
    expect(propose(groups, 'ZEGARMISTRZ POD ARKADAMI', expense(OTHER), { ...empty(), groups: { [rogu.group]: expense(GIFTS) }, rows: { [kowalski.rows[0]!.key]: expense(GIFTS) } })).toEqual([])
    expect(propose(groups, 'ZEGARMISTRZ POD ARKADAMI', expense(null))).toEqual([])
    // A shop with its own rule keeps it.
    const own = rule({ match: 'zegarmistrznarogu', categoryId: GIFTS })
    const ruled = groupsOf(names.map((n) => row(n)), [own])
    expect(propose(ruled, 'ZEGARMISTRZ POD ARKADAMI', expense(OTHER), empty(), [own]).map((x) => x.rows.length)).toEqual([1])
  })

  it('wbudowane słowo z tą samą kategorią nic nie zmienia; przelew – słowa tytułu, bez nazwisk', () => {
    const cafes = groupsOf([row('CUKIERNIA SLODKA'), row('CUKIERNIA U ZOSI')])
    expect(propose(cafes, 'CUKIERNIA SLODKA', expense(COFFEE))).toEqual([])
    expect(propose(cafes, 'CUKIERNIA SLODKA', expense(GROCERIES)).map((x) => [x.text, x.rows.length])).toEqual([['cukiernia', 1]])
    const transfers = groupsOf([
      row('JAN NOWAK', { operation: P2P, title: 'SKŁADKA NA PREZENT DLA ANNY' }),
      row('ANNA KOWALSKA', { operation: P2P, title: 'SKŁADKA KLASOWA' }),
      row('PIOTR NOWAK', { operation: P2P, title: 'ZWROT ZA BILETY' }),
      row('KAWIARNIA ANNY', { title: '' })
    ])
    const props = propose(transfers, 'JAN NOWAK', expense(GIFTS))
    expect(props.map((x) => x.text)).toEqual(['składka'])
    expect(props[0]!.rows).toHaveLength(1)
    // The last word of two shops' names, none a chain, is no town: „grzybek” names them (legal forms are no words).
    const grzybek = groupsOf([row('PIEKARNIA GRZYBEK'), row('CUKIERNIA GRZYBEK'), row('GRZYBEK SP. Z O.O.')])
    expect(propose(grzybek, 'PIEKARNIA GRZYBEK', expense(OTHER)).map((x) => [x.text, x.rows.length])).toEqual([['grzybek', 2]])
    // A word only like a name („karma” – „KAROL”) is no name; a loan or XTB is never a keyword's decision.
    const pets = groupsOf([row('KARMA DLA PSA'), row('KARMA I SPOLKA'), row('KAROL NOWAK', { operation: P2P, title: 'ZWROT' })])
    expect(propose(pets, 'KARMA DLA PSA', expense(OTHER)).map((x) => x.text)).toEqual(['karma'])
    expect(propose(transfers, 'JAN NOWAK', { ...expense(null), kind: 'loan' })).toEqual([])
  })

  it('przyjęta propozycja to Twoje słowo: plik liczony od nowa daje tę decyzję innym operacjom', () => {
    const rows = [row('ZEGARMISTRZ POD ARKADAMI'), row('ZEGARMISTRZ NA ROGU'), row('ZEGARMISTRZA KOWALSKI')]
    const [p] = propose(groupsOf(rows), 'ZEGARMISTRZ POD ARKADAMI', expense(OTHER))
    const keyword = rule({ mode: 'keyword', match: p!.keyword, label: p!.text, categoryId: OTHER, learned: false })
    const again = groupsOf(rows, [keyword])
    expect(again.map((g) => [g.label, g.source, g.proposed.categoryId])).toEqual([
      ['ZEGARMISTRZ NA ROGU', 'rule', OTHER],
      ['ZEGARMISTRZ POD ARKADAMI', 'rule', OTHER],
      ['ZEGARMISTRZA KOWALSKI', 'rule', OTHER]
    ])
  })
})

describe('dopiski banku w nazwach (1.2.3 – zgłoszenie użytkownika)', () => {
  const history = (names: string[]) =>
    parseMbank(
      [
        '#Klient;',
        'JAN KAPITAN;',
        '#Data operacji;#Data księgowania;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;',
        ...names.map((n, i) => `2026-10-${String(1 + (i % 28)).padStart(2, '0')};2026-10-${String(1 + (i % 28)).padStart(2, '0')};ZAKUP PRZY UŻYCIU KARTY;"${n}";"";'';-${10 + i},00;1 000,00;`)
      ].join('\r\n')
    )

  it('nazwa bez daty transakcji, godziny, numeru karty i miasta po „/” – nigdy pusta', () => {
    expect(cleanBankName('ŻABKA Z1234 K.1 /WROCLAW DATA TRANSAKCJI: 2026-10-01', { town: true })).toBe('ŻABKA Z1234 K.1')
    expect(cleanBankName('KAWIARNIA MOKKA /OLEŚNICA DATA TRANSAKCJI:2026-10-01', { town: true })).toBe('KAWIARNIA MOKKA')
    // The town only of a shop, in capitals: never the second person of a joint account, never a name typed by hand.
    expect(cleanBankName('JAN KOWALSKI / ANNA KOWALSKA')).toBe('JAN KOWALSKI / ANNA KOWALSKA')
    expect(cleanBankName('Czynsz / mieszkanie', { town: true })).toBe('Czynsz / mieszkanie')
    expect(brandOf('JAN KOWALSKI / ANNA KOWALSKA', { transfer: true }).key).toBe('jankowalskiannakowalska')
    expect(cleanBankName('SKLEP ABC 01.10.2026 12:45 4567******1234')).toBe('SKLEP ABC')
    expect(cleanBankName('ALLEGRO REF: 12AB34')).toBe('ALLEGRO')
    expect(cleanBankName('Chess.com 800-318-2827')).toBe('Chess.com 800-318-2827')
    expect(cleanBankName('DATA TRANSAKCJI: 2026-10-01')).toBe('DATA TRANSAKCJI: 2026-10-01')
    // Keys: the same shop on any day; the old key (before 1.2.3) still decides by its rule.
    expect(brandOf('KAWIARNIA MOKKA /OLESNICA DATA TRANSAKCJI: 2026-10-01').key).toBe('kawiarniamokka')
    expect(brandOf('KAWIARNIA MOKKA /OLESNICA DATA TRANSAKCJI: 2026-10-01', { raw: true }).key).toBe('kawiarniamokkaolesnicadatatransakcji')
  })

  it('historia rachunku: jeden sklep to jedna grupa, mimo dat w nazwach; reguła sprzed 1.2.3 dalej działa', () => {
    const file = history([
      'KAWIARNIA MOKKA     /OLESNICA      DATA TRANSAKCJI: 2026-10-01',
      'KAWIARNIA MOKKA     /OLESNICA      DATA TRANSAKCJI: 2026-10-04',
      'KAWIARNIA MOKKA     /OLESNICA      DATA TRANSAKCJI: 2026-10-07',
      'ZEGARMISTRZ ROMAN   /OLESNICA      DATA TRANSAKCJI: 2026-10-02'
    ])
    const groups = importGroups(planImport(file, MBANK_ACCOUNT_ID, [], { rules: [], ownNames: [], categories }))
    expect(groups.map((g) => [g.label, g.rows.length, g.names])).toEqual([
      ['KAWIARNIA MOKKA', 3, ['KAWIARNIA MOKKA']],
      ['ZEGARMISTRZ ROMAN', 1, ['ZEGARMISTRZ ROMAN']]
    ])
    const old = rule({ match: 'zegarmistrzromanolesnicadatatransakcji', categoryId: GIFTS })
    expect(classifyRow(file.rows[3]!, { rules: [old], ownNames: [], categories }).decision).toMatchObject({ source: 'rule', categoryId: GIFTS })
    // A payment the type of operation named before 1.2.3 (no name read then): the shop from the title now, the old
    // rule of that type still decides it.
    const web = parseMbank(
      [
        '#Data operacji;#Data księgowania;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;',
        `2026-10-02;2026-10-02;PŁATNOŚĆ WEB - KOD MOBILNY;"SKLEP INTERNETOWY ABC";"";'';-15,00;1 000,00;`
      ].join('\r\n')
    ).rows[0]!
    expect(web).toMatchObject({ counterparty: 'SKLEP INTERNETOWY ABC', title: '', bankName: '' })
    const byType = rule({ match: brandOf('PŁATNOŚĆ WEB - KOD MOBILNY', { raw: true }).key, categoryId: GIFTS })
    expect(classifyRow(web, { rules: [byType], ownNames: [], categories }).decision).toMatchObject({ source: 'rule', categoryId: GIFTS })
  })

  it('wspólne miasto, „bar” albo słowa banku nie łączą niezwiązanych nazw; trafna para zostaje', () => {
    const shops = ['BAR', 'KEBAB', 'SKLEP', 'PIZZERIA', 'APTEKA', 'BAR MLECZNY', 'KWIACIARNIA', 'PIEKARNIA']
    const file = history([
      ...shops.map((s) => `${s}   /OLESNICA   DATA TRANSAKCJI: 2026-10-05`),
      'KAWIARNIA MOKKA   /WROCLAW   DATA TRANSAKCJI: 2026-10-06',
      'MOKKA KAWIARNIA   /WROCLAW   DATA TRANSAKCJI: 2026-10-07'
    ])
    const groups = importGroups(planImport(file, MBANK_ACCOUNT_ID, [], { rules: [], ownNames: [], categories }))
    expect(similarPairs(groups).map((p) => [p.a.label, p.b.label])).toEqual([['KAWIARNIA MOKKA', 'MOKKA KAWIARNIA']])
    // Names as saved before 1.2.3 (with the additions) and a town in many names of a list of operations: no pairs.
    const old = groupsOf([...shops.map((s) => row(`${s} /OLESNICA DATA TRANSAKCJI: 2026-10-05`)), row('ZEGARMISTRZ /OLESNICA DATA TRANSAKCJI: 2026-10-05')])
    expect(similarPairs(old)).toEqual([])
    const town = groupsOf(['NOWINA OLESNICA', 'ROMA OLESNICA', 'SKLEP OLESNICA', 'GRZYBEK OLESNICA', 'MOKKA OLESNICA', 'LIPA OLESNICA'].map((n) => row(n)))
    expect(similarPairs(town)).toEqual([])
  })

  it('propozycja słowa: bez słów banku i słów prawie wszystkich nazw pliku', () => {
    const dated = groupsOf([
      row('ZEGARMISTRZ ROMAN /OLESNICA DATA TRANSAKCJI: 2026-10-05'),
      row('ZEGARMISTRZ JAN /OLESNICA DATA TRANSAKCJI: 2026-10-06'),
      ...['NOWINA', 'ROMA', 'LIPA', 'GRZYBEK', 'MOKKA'].map((n) => row(`${n} TRANSFERY /OLESNICA DATA TRANSAKCJI: 2026-10-07`))
    ])
    const g = byLabel(dated, 'ZEGARMISTRZ ROMAN /OLESNICA DATA TRANSAKCJI: 2026-10-05')
    const choice = expense(OTHER)
    const props = keywordProposals(dated, g, choice, { rules: [], choices: { ...empty(), groups: { [g.group]: choice } } })
    expect(props.map((p) => p.text)).toEqual(['zegarmistrz'])
  })
})
