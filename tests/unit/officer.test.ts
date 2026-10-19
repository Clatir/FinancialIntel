import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { parseMbank } from '@shared/import/mbank'
import { officerData, officerHint } from '@shared/import/officer'
import { buildImport, planImport, type ImportChoices } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { counterpartyKey } from '@shared/import/classify'
import { defaultCategoryId, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportRule, type Transaction } from '@shared/schema'

const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const usable = (id: string) => !!categories.byId.get(id) && !categories.byId.get(id)!.archived
const NOW = '2026-10-17T09:00:00.000Z'
let seq = 0
const makeId = () => `01K4${String(++seq).padStart(22, '0')}`
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })
const GROCERIES = defaultCategoryId(1, 1)
const COFFEE = defaultCategoryId(1, 3)
const AUTO = defaultCategoryId(3)
const typed = (counterparty: string, categoryId: string | null, date = '2026-10-01'): Transaction =>
  transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: NOW, updatedAt: NOW, date, accountId: MBANK_ACCOUNT_ID, amount: -1000, counterparty, categoryId })

/** The fixture imported (as the bank writes its names), with its operations categorized by the user. */
function importedOps(): Transaction[] {
  const file = parseMbank(decodeText(new Uint8Array(readFileSync(FIXTURE))))
  const plan = planImport(file, MBANK_ACCOUNT_ID, [], { rules: [], ownNames: ['JAN KAPITAN'], categories })
  return buildImport(plan, emptyChoices(), { now: NOW, makeId, rules: [] }).create
}

describe('oficer zna marki, reguły importu i słownik sieci (1.5.1, F8)', () => {
  it('„Dino” wpisane ręcznie dostaje kategorię z operacji z banku tej sieci („DINO TESTOWO 4”), nawet bez wpisów ręcznych', () => {
    const ops = importedOps()
    const bank = ops.find((t) => t.bank?.counterparty === 'DINO TESTOWO 4')!
    // The old officer (the key of the whole name) knew nothing of it.
    expect(counterpartyKey(bank.bank!.counterparty)).not.toBe(counterpartyKey('Dino'))
    const categorized = ops.map((t) => (t.id === bank.id ? { ...t, categoryId: COFFEE } : t))
    const data = officerData(categorized, {})
    expect(officerHint({ counterparty: 'Dino' }, data, { rules: [], aliases: {}, usable })).toEqual({ categoryId: COFFEE, source: 'history' })
    // The list of counterparties: one name per brand (the chain's own).
    expect(data.counterparties.filter((n) => n.toLowerCase().includes('dino'))).toEqual(['Dino'])
  })

  it('bez historii: reguła importu (także po połączonej nazwie), potem kategoria sieci ze słownika; nieznana nazwa – nic', () => {
    const rule: ImportRule = { id: makeId(), match: 'kawiarniamokka', mode: 'exact', direction: 'out', label: 'KAWIARNIA MOKKA', kind: 'expense', categoryId: COFFEE, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 2, updatedAt: NOW }
    const empty = officerData([], {})
    expect(officerHint({ counterparty: 'Kawiarnia Mokka' }, empty, { rules: [rule], aliases: {}, usable })).toEqual({ categoryId: COFFEE, source: 'rule' })
    // „Mokka” merged into „Kawiarnia Mokka” (1.2.2): the same rule.
    const aliases = { mokka: { to: 'kawiarniamokka', label: 'MOKKA', toLabel: 'KAWIARNIA MOKKA', at: NOW } }
    expect(officerHint({ counterparty: 'Mokka' }, empty, { rules: [rule], aliases, usable })).toEqual({ categoryId: COFFEE, source: 'rule' })
    expect(officerHint({ counterparty: 'Lidl' }, empty, { rules: [], aliases: {}, usable })).toEqual({ categoryId: GROCERIES, source: 'chain' })
    expect(officerHint({ counterparty: 'Zakład pana Józefa' }, empty, { rules: [], aliases: {}, usable })).toBeNull()
    expect(officerHint({ counterparty: '  ' }, empty, { rules: [], aliases: {}, usable })).toBeNull()
  })

  it('ostatnia kategoria wygrywa z regułą i siecią; zarchiwizowana kategoria nie jest podpowiadana', () => {
    const ops = [typed('Lidl', AUTO, '2026-10-02'), typed('LIDL TESTOWO', GROCERIES, '2026-09-01')]
    const data = officerData(ops, {})
    expect(officerHint({ counterparty: 'lidl' }, data, { rules: [], aliases: {}, usable })).toEqual({ categoryId: AUTO, source: 'history' })
    expect(officerHint({ counterparty: 'lidl' }, data, { rules: [], aliases: {}, usable: (id) => id !== AUTO && usable(id) })).toEqual({ categoryId: GROCERIES, source: 'chain' })
  })

  it('ponad 2000 operacji w dowolnej kolejności: liczy się najnowsza kategoria marki (próg dnia, nie pełne sortowanie)', () => {
    const days = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`)
    const ops = Array.from({ length: 2600 }, (_, i) => typed(i % 2 ? 'Lidl' : 'Kiosk Ruch', GROCERIES, days[i % 30]))
    ops.push(typed('Lidl', AUTO, '2026-10-01'))
    // A fixed shuffle: the newest somewhere in the middle.
    const shuffled = ops.map((t, i) => ({ t, k: (i * 7919) % ops.length })).sort((a, b) => a.k - b.k).map((x) => x.t)
    expect(officerHint({ counterparty: 'lidl' }, officerData(shuffled, {}), { rules: [], aliases: {}, usable })).toEqual({ categoryId: AUTO, source: 'history' })
  })

  it('2000 ostatnich operacji – oficer liczony szybko (W15)', () => {
    const ops = importedOps()
    const many = Array.from({ length: 8 }, () => ops.map((t) => ({ ...t, id: makeId(), categoryId: GROCERIES }))).flat()
    const t0 = performance.now()
    officerData(many, {})
    expect(performance.now() - t0).toBeLessThan(1500)
  })
})
