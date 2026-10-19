import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { categoryIndex } from '@shared/calc/operations'
import { createDefaultSettings } from '@shared/defaults'
import { accountNumberOf, batchesToDrop, importBatch, latestImport, rulesChanged, rulesUndone, settingsRedone, settingsUndone, undoPlan, type BatchFacts } from '@shared/import/batch'
import { parseMbank, type MbankFile, type MbankRow } from '@shared/import/mbank'
import { buildImport, planImport, type ImportChoices, type ImportPlan, type NewRow } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { sameContentAs } from '@shared/merge'
import { defaultCategoryId, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema, type ImportBatch, type ImportRule, type Transaction } from '@shared/schema'

const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const fixture = (): MbankFile => parseMbank(decodeText(new Uint8Array(readFileSync(FIXTURE))))
const settings = createDefaultSettings('2026-01-01T00:00:00.000Z').settings
const categories = categoryIndex(settings.categories)
const FIRST = '2026-10-10T09:00:00.000Z'
const NOW = '2026-10-17T09:00:00.000Z'
const SAVED = '2026-10-17T09:00:05.000Z'
const LATER = '2026-10-17T12:00:00.000Z'
let seq = 0
const makeId = () => `01K2${String(++seq).padStart(22, '0')}`
const ctx = () => ({ rules: [] as ImportRule[], ownNames: ['JAN KAPITAN'], categories })
const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {} })
const withRows = (file: MbankFile, rows: MbankRow[]): MbankFile => ({ ...file, rows })
const counts = (plan: ImportPlan) => plan.rows.reduce<Record<string, number>>((m, p) => ({ ...m, [p.status]: (m[p.status] ?? 0) + 1 }), {})
/** As the store keeps them after the save: parsed, stamped. */
const saved = (ts: readonly Transaction[], at: string) => ts.map((t) => transactionSchema.parse({ ...t, updatedAt: at }))
const AUTO = defaultCategoryId(3)
const GROCERIES = defaultCategoryId(1, 1)
const NO_SETTINGS = { lastImport: null, coveredTo: null, accountNumber: null, inflows: {} }

function facts(over: Partial<BatchFacts>): BatchFacts {
  return {
    id: makeId(),
    at: NOW,
    savedAt: SAVED,
    machine: 'PC',
    accountId: MBANK_ACCOUNT_ID,
    fileName: 'lista.csv',
    period: null,
    counts: {},
    created: [],
    updated: [],
    removed: [],
    rulesBefore: [],
    rulesAfter: [],
    before: NO_SETTINGS,
    after: NO_SETTINGS,
    ownName: null,
    ...over
  }
}

describe('„Cofnij import” (1.5.1, F4)', () => {
  it('cały import cofnięty: utworzone znikają, połączony wpis ręczny i rozliczona operacja jak przed importem (późniejsze zmiany zostają), usunięta wraca, reguła znika – ten sam plik daje ten sam podgląd', () => {
    const f = fixture()
    const isBiedronka = (r: MbankRow) => r.counterparty === 'Biedronka' && r.amount === -1616
    const isKoleo = (r: MbankRow) => r.counterparty.startsWith('KOLEO')
    // An earlier import, without the Biedronka of the manual entry and KOLEO.
    const first = saved(buildImport(planImport(withRows(f, f.rows.filter((r) => !isBiedronka(r) && !isKoleo(r))), MBANK_ACCOUNT_ID, [], ctx()), emptyChoices(), { now: FIRST, makeId, rules: [] }).create, FIRST)
    const manual = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: makeId(), createdAt: FIRST, updatedAt: FIRST, date: '2025-10-02', time: '18:40', accountId: MBANK_ACCOUNT_ID, amount: -1616, counterparty: 'Biedronka', categoryId: GROCERIES, note: 'chleb' })
    const before = [...first, manual]
    // The next file: the first row settled, a pending AUTOMATSPEC gone, the Biedronka and KOLEO in.
    const rows = f.rows.map((r) => ({ ...r }))
    rows[0]!.pending = false
    rows.splice(
      rows.findIndex((r) => r.pending && r.description.startsWith('AUTOMATSPEC Sp.')),
      1
    )
    const file = withRows(f, rows)
    const plan = planImport(file, MBANK_ACCOUNT_ID, before, ctx())
    const choices = emptyChoices()
    choices.removeVanished[plan.vanished[0]!.id] = true
    const koleo = plan.rows.find((p): p is NewRow => p.status === 'new' && p.brand.startsWith('koleo'))!
    choices.groups[koleo.group] = { kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
    choices.remember[koleo.group] = true
    const result = buildImport(plan, choices, { now: NOW, makeId, rules: [] })
    expect([result.create.length > 0, result.update.length, result.remove.length, result.rules.length]).toEqual([true, 2, 1, 1])

    // The import written, its batch kept.
    const byId = new Map(before.map((t) => [t.id, t]))
    const batch = importBatch(
      facts({
        created: result.create,
        updated: result.update.map((t) => ({ before: byId.get(t.id)!, after: t as Transaction })),
        removed: result.remove.map((id) => byId.get(id)!),
        rulesAfter: result.rules
      })
    )
    for (const t of saved(result.update as Transaction[], SAVED)) byId.set(t.id, t)
    for (const id of result.remove) byId.delete(id)
    for (const t of saved(result.create, SAVED)) byId.set(t.id, t)
    // Later: the user categorizes one of the new ones and adds to the note of the merged one.
    const created0 = result.create[0]!.id
    byId.set(created0, { ...byId.get(created0)!, categoryId: GROCERIES, updatedAt: LATER })
    byId.set(manual.id, { ...byId.get(manual.id)!, note: 'chleb i masło', updatedAt: LATER })

    const dockedIds = new Set([result.create[1]!.id])
    const undo = undoPlan(batch, { tx: (id) => byId.get(id), docked: dockedIds, rules: result.rules })
    expect(undo).toMatchObject({ changed: 1, docked: 1, missing: 0, rulesBack: 1, rulesKept: 0 })
    expect(undo.remove.sort()).toEqual(result.create.map((t) => t.id).sort())
    expect(undo.readd.map((t) => t.id)).toEqual(result.remove)
    // The merged manual entry: the bank's data gone, its date as it was; the user's later note stays.
    const back = undo.restore.find((t) => t.id === manual.id)!
    expect(back).toMatchObject({ date: '2025-10-02', note: 'chleb i masło', categoryId: GROCERIES })
    expect(back.bank ?? null).toBeNull()
    // The settled one: pending again.
    const settled = undo.restore.find((t) => t.id !== manual.id)!
    expect(settled.bank?.pending).toBe(true)

    for (const id of undo.remove) byId.delete(id)
    for (const t of undo.restore) byId.set(t.id, t)
    for (const t of undo.readd) byId.set(t.id, t)
    const after = [...byId.values()]
    // What was there before the import – the user's note aside.
    expect(after).toHaveLength(before.length)
    for (const t of before) expect(sameContentAs(byId.get(t.id), t.id === manual.id ? { ...t, note: 'chleb i masło' } : t)).toBe(true)
    expect(rulesUndone(result.rules, batch).rules).toEqual([])
    // The same file again: the same preview as before the import (T39 – nothing counts as deleted by the user).
    expect(counts(planImport(file, MBANK_ACCOUNT_ID, after, ctx()))).toEqual(counts(plan))
  })

  it('reguły: nowa znika, zmieniona jak przed importem; zmieniona albo usunięta po imporcie zostaje', () => {
    const r0: ImportRule = { id: makeId(), match: 'bolt', mode: 'exact', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 3, updatedAt: FIRST }
    const r1 = { ...r0, hits: 5, updatedAt: NOW }
    const fresh: ImportRule = { ...r0, id: makeId(), match: 'koleo', label: 'KOLEO', hits: 2, updatedAt: NOW }
    const changed = rulesChanged([r0], [r1, fresh])
    expect(changed.map((c) => [c.id, c.before ? 'zmieniona' : 'nowa'])).toEqual([
      [r0.id, 'zmieniona'],
      [fresh.id, 'nowa']
    ])
    // The same rule read back from the disk (defaults filled) is no change.
    expect(rulesChanged([r0], [{ ...r0, gift: undefined }])).toEqual([])
    const batch = importBatch(facts({ rulesBefore: [r0], rulesAfter: [r1, fresh] }))
    expect(rulesUndone([r1, fresh], batch)).toMatchObject({ rules: [r0], back: 2, kept: 0 })
    // The user edited the changed one since: it stays; the new one goes.
    const edited = { ...r1, categoryId: GROCERIES, learned: false }
    expect(rulesUndone([edited, fresh], batch)).toMatchObject({ rules: [edited], back: 1, kept: 1 })
    // Nothing to take back: the same array.
    const rules = [edited]
    expect(rulesUndone(rules, batch).rules).toBe(rules)
  })

  it('ustawienia: ostatni import, zasięg plików, numer rachunku, wpis dziennika, nazwisko z pliku i zapamiętana wpłata domownika – tylko gdy nikt ich potem nie zmienił', () => {
    const OTHER = '2026-10-16T08:00:00.000Z'
    const s = {
      ...settings,
      import: {
        ...settings.import,
        ownNames: ['JAN KAPITAN', 'ANNA NOWAK'],
        lastImport: { [MBANK_ACCOUNT_ID]: NOW },
        coveredTo: { [MBANK_ACCOUNT_ID]: '2026-10-16' },
        accountNumbers: { [MBANK_ACCOUNT_ID]: '11112222333344445555666677' },
        log: { [OTHER]: MBANK_ACCOUNT_ID, [NOW]: MBANK_ACCOUNT_ID }
      },
      household: { ...settings.household, members: settings.household.members.map((m) => (m.id === HOUSE_MEMBER_ID ? { ...m, inflow: 'advance' as const } : m)) }
    }
    const batch = importBatch(
      facts({
        before: { lastImport: OTHER, coveredTo: '2026-09-30', accountNumber: null, inflows: { [HOUSE_MEMBER_ID]: 'ask' } },
        after: { lastImport: NOW, coveredTo: '2026-10-16', accountNumber: '11112222333344445555666677', inflows: { [HOUSE_MEMBER_ID]: 'advance' } },
        ownName: 'ANNA NOWAK'
      })
    )
    const u = settingsUndone(s, batch)
    expect(u.import.lastImport).toEqual({ [MBANK_ACCOUNT_ID]: OTHER })
    expect(u.import.coveredTo).toEqual({ [MBANK_ACCOUNT_ID]: '2026-09-30' })
    expect(u.import.accountNumbers).toEqual({})
    expect(u.import.log).toEqual({ [OTHER]: MBANK_ACCOUNT_ID })
    expect(u.import.ownNames).toEqual(['JAN KAPITAN'])
    expect(u.household.members.find((m) => m.id === HOUSE_MEMBER_ID)?.inflow).toBe('ask')
    // Changed since (another import of the account, the member's answer set by hand): stays.
    const later = { ...s, import: { ...s.import, lastImport: { [MBANK_ACCOUNT_ID]: LATER }, coveredTo: { [MBANK_ACCOUNT_ID]: '2026-10-17' } }, household: { ...s.household, members: s.household.members.map((m) => ({ ...m, inflow: 'income' as const })) } }
    const kept = settingsUndone(later, batch)
    expect([kept.import.lastImport, kept.import.coveredTo, kept.household.members[0]!.inflow]).toEqual([{ [MBANK_ACCOUNT_ID]: LATER }, { [MBANK_ACCOUNT_ID]: '2026-10-17' }, 'income'])
    // Nothing to take back: the same settings.
    const none = importBatch(facts({ at: '2026-10-01T09:00:00.000Z' }))
    expect(settingsUndone(s, none)).toBe(s)
  })

  it('„Cofnij” cofnięcia: ustawienia i reguły znowu jak po imporcie, zmiana zrobiona w międzyczasie zostaje', () => {
    const OTHER = '2026-10-16T08:00:00.000Z'
    const r0: ImportRule = { id: makeId(), match: 'bolt', mode: 'exact', direction: 'out', label: 'Bolt', kind: 'expense', categoryId: AUTO, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 3, updatedAt: FIRST }
    const r1 = { ...r0, hits: 5, updatedAt: NOW }
    const fresh: ImportRule = { ...r0, id: makeId(), match: 'koleo', label: 'KOLEO', hits: 2, updatedAt: NOW }
    const after = {
      ...settings,
      import: {
        ...settings.import,
        rules: [r1, fresh],
        ownNames: ['JAN KAPITAN', 'ANNA NOWAK'],
        lastImport: { [MBANK_ACCOUNT_ID]: NOW },
        coveredTo: { [MBANK_ACCOUNT_ID]: '2026-10-16' },
        accountNumbers: { [MBANK_ACCOUNT_ID]: '11112222333344445555666677' },
        log: { [OTHER]: MBANK_ACCOUNT_ID, [NOW]: MBANK_ACCOUNT_ID }
      },
      household: { ...settings.household, members: settings.household.members.map((m) => (m.id === HOUSE_MEMBER_ID ? { ...m, inflow: 'advance' as const } : m)) }
    }
    const batch = importBatch(
      facts({
        rulesBefore: [r0],
        rulesAfter: [r1, fresh],
        before: { lastImport: OTHER, coveredTo: null, accountNumber: null, inflows: { [HOUSE_MEMBER_ID]: 'ask' } },
        after: { lastImport: NOW, coveredTo: '2026-10-16', accountNumber: '11112222333344445555666677', inflows: { [HOUSE_MEMBER_ID]: 'advance' } },
        ownName: 'ANNA NOWAK'
      })
    )
    const undone = settingsUndone(after, batch)
    expect([undone.import.rules, undone.import.coveredTo, undone.import.accountNumbers]).toEqual([[r0], {}, {}])
    // Meanwhile a keyword of the user.
    const keyword: ImportRule = { ...r0, id: makeId(), match: 'kawa', mode: 'keyword', label: 'kawa', categoryId: GROCERIES, learned: false, hits: 0 }
    const meanwhile = { ...undone, import: { ...undone.import, rules: [...undone.import.rules, keyword] } }
    const redone = settingsRedone(meanwhile, batch)
    expect(redone.import.rules.map((r) => r.id).sort()).toEqual([r1.id, fresh.id, keyword.id].sort())
    expect(redone.import.rules.find((r) => r.id === r0.id)?.hits).toBe(5)
    expect([redone.import.lastImport, redone.import.coveredTo, redone.import.accountNumbers, redone.import.log, redone.import.ownNames]).toEqual([
      after.import.lastImport,
      after.import.coveredTo,
      after.import.accountNumbers,
      after.import.log,
      after.import.ownNames
    ])
    expect(redone.household.members.find((m) => m.id === HOUSE_MEMBER_ID)?.inflow).toBe('advance')
  })

  it('cofa się od ostatniego importu; zostaje dziesięć ostatnich; numer rachunku z nagłówka pliku', () => {
    const b = (at: string, undoneAt: string | null = null): ImportBatch => ({ ...importBatch(facts({ at, savedAt: at })), undoneAt })
    const a1 = b('2026-10-01T10:00:00.000Z')
    const a2 = b('2026-10-05T10:00:00.000Z')
    const a3 = b('2026-10-09T10:00:00.000Z', '2026-10-09T11:00:00.000Z')
    expect(latestImport([a1, a3, a2])?.id).toBe(a2.id)
    expect(latestImport([a3])).toBeNull()
    const many = Array.from({ length: 12 }, (_, i) => b(`2026-09-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`))
    expect(batchesToDrop(many).sort()).toEqual([many[0]!.id, many[1]!.id].sort())
    expect(accountNumberOf('eKonto - 11 1111 2222 3333 4444 5555 6666')).toBe('11111122223333444455556666')
    expect(accountNumberOf('eKonto - XXXXXXXXXXXXXXXX')).toBeNull()
    expect(accountNumberOf(null)).toBeNull()
  })
})
