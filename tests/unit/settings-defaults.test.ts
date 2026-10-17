import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import {
  balanceSchema,
  CASH_CATEGORY_ID,
  containerSchema,
  defaultCategoryId,
  envelopeKind,
  goalSchema,
  MBANK_ACCOUNT_ID,
  monthPlanSchema,
  SCHEMA_VERSION,
  settingsFileSchema,
  transactionSchema,
  XTB_WALLET_ACCOUNT_ID
} from '@shared/schema'
import { parseRecordText, serializeRecord } from '@shared/records'

describe('fi.json – ustawienia folderu', () => {
  it('nowy folder: okręt „Flagowiec”, scalanie zmian, bez układów', () => {
    const fi = createDefaultSettings('2026-10-16T10:00:00.000Z')
    expect(fi.schemaVersion).toBe(SCHEMA_VERSION)
    expect(fi.settings.shipName).toBe('Flagowiec')
    expect(fi.settings.sync.remoteChanges).toBe('merge')
    expect(fi.settings.layoutPresets).toEqual([])
  })

  it('pusta albo za długa nazwa okrętu wraca do domyślnej, nieznane pola zostają', () => {
    const fi = createDefaultSettings()
    const parsed = settingsFileSchema.parse({ ...fi, extra: 1, settings: { ...fi.settings, shipName: '   ', future: { a: 1 } } })
    expect(parsed.settings.shipName).toBe('Flagowiec')
    expect((parsed as Record<string, unknown>).extra).toBe(1)
    expect((parsed.settings as Record<string, unknown>).future).toEqual({ a: 1 })
  })

  it('zapis i odczyt: JSON z wcięciem i końcowym znakiem nowej linii', () => {
    const fi = createDefaultSettings()
    const text = serializeRecord('fi', fi)
    expect(text.endsWith('}\n')).toBe(true)
    const back = parseRecordText('fi', text)
    expect(back.ok && back.value).toEqual(fi)
  })
})

describe('fi.json – konta, kategorie, warstwy i rozkazy (E1)', () => {
  it('domyślne konta: mBank (import CSV) i Portfel XTB, stałe id (D68)', () => {
    const { accounts } = createDefaultSettings().settings
    expect(accounts.map((a) => [a.id, a.name, a.kind, a.importFormat])).toEqual([
      [MBANK_ACCOUNT_ID, 'mBank', 'bank', 'mbank'],
      [XTB_WALLET_ACCOUNT_ID, 'Portfel XTB', 'wallet', null]
    ])
    for (const a of accounts) expect(a.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })

  it('domyślne kategorie: 9 głównych z podkategoriami (D68) i systemowa „Gotówka”; codzienne i planowe', () => {
    const { categories } = createDefaultSettings().settings
    const main = categories.filter((c) => !c.parentId)
    expect(main.map((c) => c.name)).toEqual([
      'Jedzenie',
      'Dom',
      'Auto',
      'Zwierzęta',
      'Zdrowie',
      'Rozrywka i hobby',
      'Subskrypcje i łączność',
      'Osobiste',
      'Prezenty i inne',
      'Gotówka'
    ])
    const subsOf = (name: string) => categories.filter((c) => c.parentId === main.find((m) => m.name === name)?.id).map((c) => c.name)
    expect(subsOf('Jedzenie')).toEqual(['zakupy spożywcze', 'na mieście', 'kawa i przekąski'])
    expect(subsOf('Dom')).toEqual(['czynsz i opłaty', 'media', 'wyposażenie', 'chemia'])
    expect(subsOf('Auto')).toEqual(['paliwo', 'serwis', 'ubezpieczenie', 'parking i opłaty', 'przejazdy'])
    expect(subsOf('Zwierzęta')).toEqual(['karma', 'weterynarz', 'akcesoria'])
    expect(subsOf('Zdrowie')).toEqual(['leki', 'lekarz', 'sport'])
    expect(subsOf('Rozrywka i hobby')).toEqual(['wyjścia', 'hobby', 'podróże'])
    expect(subsOf('Subskrypcje i łączność')).toEqual(['telefon', 'internet', 'streaming', 'aplikacje'])
    expect(subsOf('Osobiste')).toEqual(['ubrania', 'kosmetyki', 'fryzjer'])
    expect(subsOf('Prezenty i inne')).toEqual(['prezenty', 'inne'])
    expect(subsOf('Gotówka')).toEqual([])
    // The spec's examples: daily = Jedzenie, Rozrywka i hobby, Osobiste; planned = Auto, Zdrowie, Zwierzęta, Dom.
    expect(main.filter((c) => c.envelope === 'daily').map((c) => c.name)).toEqual(['Jedzenie', 'Rozrywka i hobby', 'Osobiste', 'Gotówka'])
    const cash = categories.find((c) => c.system === 'cash')
    expect(cash?.id).toBe(CASH_CATEGORY_ID)
    expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length)
    for (const c of categories) expect(c.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    expect(defaultCategoryId(1, 1)).toBe(categories.find((c) => c.name === 'zakupy spożywcze')?.id)
  })

  it('warstwy i rozkazy domyślne: osłony 3 pensje, kadłub 6 miesięcy, linia zanurzenia 40%, cisza nocna 23–5, próg 200 zł', () => {
    const { layers, orders, budget, import: imp } = createDefaultSettings().settings
    expect(layers).toEqual({ shieldSalaries: 3, hullMonths: 6, assumedCosts: null })
    expect(orders).toEqual({ minShieldSalaries: 1, cargoLimitPct: 40, quietHours: { from: '23:00', to: '05:00' }, impulseThreshold: 20000, firewall: true })
    expect(budget).toEqual({ start: null, initial: null })
    expect(imp).toMatchObject({ ownNames: [], lastImport: {} })
    // Starter rules (D69): taxi rides are going out, trains are „przejazdy”.
    expect(imp.rules.map((r) => [r.match, r.direction, r.kind, r.categoryId])).toEqual([
      ['bolt', 'out', 'expense', defaultCategoryId(6)],
      ['koleo', 'out', 'expense', defaultCategoryId(3, 5)]
    ])
  })

  it('fi.json z E0 (bez kont i kategorii) dostaje domyślne przy odczycie – takie same na każdym komputerze', () => {
    const e0 = { schemaVersion: SCHEMA_VERSION, id: '01K6H3Z0W8Q4M2N5P7R9S1T3V5', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z', settings: { shipName: 'Sokół' } }
    const a = settingsFileSchema.parse(e0)
    const b = settingsFileSchema.parse(JSON.parse(JSON.stringify(e0)))
    expect(a.settings.shipName).toBe('Sokół')
    expect(a.settings.accounts).toEqual(b.settings.accounts)
    expect(a.settings.categories).toEqual(b.settings.categories)
    expect(a.settings.categories).toHaveLength(40)
  })

  it('fi.json z 0.3.0 dostaje raz podkategorię „przejazdy” i reguły startowe (D69); usunięte nie wracają', () => {
    const fi = createDefaultSettings()
    const older = JSON.parse(serializeRecord('fi', fi))
    // 0.3.0 wrote its 39 categories and no rules – and nothing about seeds.
    older.settings.categories = older.settings.categories.filter((c: { id: string }) => c.id !== defaultCategoryId(3, 5))
    older.settings.import.rules = [{ id: '01K6H3Z0W8Q4M2N5P7R9S1T3V9', match: 'bolt', direction: 'out', kind: 'expense', categoryId: defaultCategoryId(3), updatedAt: '2026-10-17T08:00:00.000Z' }]
    delete older.settings.seeded
    const a = settingsFileSchema.parse(older).settings
    expect(a.categories.find((c) => c.id === defaultCategoryId(3, 5))).toMatchObject({ name: 'przejazdy', parentId: defaultCategoryId(3) })
    // The user's own decision for Bolt stays; KOLEO gets the starter rule.
    expect(a.import.rules.map((r) => [r.match, r.categoryId])).toEqual([
      ['bolt', defaultCategoryId(3)],
      ['koleo', defaultCategoryId(3, 5)]
    ])
    expect(a.seeded).toEqual(['category:auto-przejazdy', 'rule:bolt', 'rule:koleo'])
    // Saved and read again: nothing more; the KOLEO rule deleted and „przejazdy” archived by the user stay so.
    const saved = JSON.parse(serializeRecord('fi', { ...fi, settings: a }))
    saved.settings.import.rules = saved.settings.import.rules.filter((r: { match: string }) => r.match !== 'koleo')
    saved.settings.categories = saved.settings.categories.map((c: { id: string }) => (c.id === defaultCategoryId(3, 5) ? { ...c, archived: true } : c))
    const b = settingsFileSchema.parse(saved).settings
    expect(b.import.rules.map((r) => r.match)).toEqual(['bolt'])
    expect(b.categories.filter((c) => c.id === defaultCategoryId(3, 5))).toEqual([expect.objectContaining({ archived: true })])
    expect(b.seeded).toEqual(a.seeded)
  })

  it('wartości z nowszej wersji (inny rodzaj konta, nowa kategoria systemowa) zostają i wracają do pliku bez zmian', () => {
    const fi = createDefaultSettings()
    const newer = {
      ...fi,
      settings: {
        ...fi.settings,
        accounts: [...fi.settings.accounts, { id: '01K6H3Z0W8Q4M2N5P7R9S1T3V7', name: 'Konto maklerskie', kind: 'broker', importFormat: 'ing', archived: false, future: 1 }],
        categories: [...fi.settings.categories, { id: '01K6H3Z0W8Q4M2N5P7R9S1T3V8', name: 'Łupy', parentId: null, envelope: 'weekly', system: 'loot', archived: false }]
      }
    }
    const parsed = settingsFileSchema.parse(JSON.parse(serializeRecord('fi', newer)))
    expect(parsed.settings.accounts.at(-1)).toMatchObject({ kind: 'broker', importFormat: 'ing', future: 1 })
    expect(parsed.settings.categories.at(-1)).toMatchObject({ envelope: 'weekly', system: 'loot' })
    expect(envelopeKind(parsed.settings.categories.at(-1))).toBeNull()
  })

  it('pusta lista kategorii zostaje pusta; uszkodzona pozycja jest pomijana, reszta zostaje', () => {
    const fi = createDefaultSettings()
    expect(settingsFileSchema.parse({ ...fi, settings: { ...fi.settings, categories: [] } }).settings.categories).toEqual([])
    const broken = [{ id: 'zły', name: '' }, ...fi.settings.accounts]
    expect(settingsFileSchema.parse({ ...fi, settings: { ...fi.settings, accounts: broken } }).settings.accounts).toEqual(fi.settings.accounts)
    const badLayers = settingsFileSchema.parse({ ...fi, settings: { ...fi.settings, layers: { shieldSalaries: -2, hullMonths: 'x' } } })
    expect(badLayers.settings.layers).toMatchObject({ shieldSalaries: 3, hullMonths: 6 })
  })
})

describe('rekordy E1 – wartości domyślne', () => {
  const base = { schemaVersion: SCHEMA_VERSION, id: '01K6H3Z0W8Q4M2N5P7R9S1T3V5', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z' }

  it('operacja: wydatek bez godziny, bez kategorii, bez oznaczeń', () => {
    const t = transactionSchema.parse({ ...base, date: '2026-10-16', accountId: MBANK_ACCOUNT_ID, amount: -2644 })
    expect(t).toMatchObject({ kind: 'expense', time: null, categoryId: null, refundable: false, splits: [], impulse: null, repaid: 0, bank: null })
    expect(transactionSchema.safeParse({ ...t, amount: -26.44 }).success).toBe(false)
    expect(transactionSchema.safeParse({ ...t, time: '24:00' }).success).toBe(false)
    expect(transactionSchema.safeParse({ ...t, kind: 'nieznany' }).success).toBe(false)
  })

  it('kontener, cel, plan miesiąca, saldo: minimalne pola', () => {
    expect(containerSchema.parse({ ...base, name: 'OC', amount: 124000, cycleMonths: 12, dueMonth: '2027-03' })).toMatchObject({ type: 'fixed', dueDay: 1, from: null, until: null })
    expect(goalSchema.parse({ ...base, name: 'Rower', target: 300000 })).toMatchObject({ priority: 1, source: 'own', archived: false })
    expect(monthPlanSchema.parse({ ...base, month: '2026-11', salary: 600000 })).toMatchObject({ envelopes: {}, loot: null })
    expect(balanceSchema.parse({ ...base, date: '2026-08-06', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: -500 })).toMatchObject({ correctionId: null })
  })
})
