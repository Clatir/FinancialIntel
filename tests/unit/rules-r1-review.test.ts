/**
 * Przegląd R1 (1.16.0) – reguły z warunkami (AP-45): findings 6 (every lookup of a rule from an operation gives its amount
 * and account), 9 (what this version cannot read is kept in fi.json, never erased), 12 (a hint of the decision the entry
 * has is no change – „Dom” is `memberId` null). Each with the scenario that failed before.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { findRule, ruleTargetOf } from '@shared/import/classify'
import { compileRule } from '@shared/import/conditions'
import { hintChanges, hintedOf, manualRuleHint, officerData, officerHint } from '@shared/import/officer'
import { serializeRecord, SCHEMAS } from '@shared/records'
import {
  conditionsOf,
  combineOf,
  defaultCategoryId,
  HOUSE_MEMBER_ID,
  importRuleSchema,
  MBANK_ACCOUNT_ID,
  readCsvMapping,
  SCHEMA_VERSION,
  transactionSchema,
  type ImportRule,
  type RuleCondition
} from '@shared/schema'

const NOW = '2026-11-05T09:00:00.000Z'
const COFFEE = defaultCategoryId(1, 3)
const FUN = defaultCategoryId(6, 0)
const SECOND = '01K6ACC0000000000000000002'
const usable = () => true
const rule = (over: Partial<ImportRule>): ImportRule =>
  importRuleSchema.parse({ id: '01K6RXXE000000000000000001', match: 'reguła', mode: 'conditions', combine: 'all', direction: 'out', label: 'Reguła', kind: 'expense', categoryId: COFFEE, learned: false, hits: 0, updatedAt: NOW, ...over })
const cp = (value: string): RuleCondition => ({ field: 'counterparty', value })

describe('przegląd R1 6: każde szukanie reguły z operacji podaje jej kwotę i konto', () => {
  it('oficer: reguła z warunkiem kwoty i konta – po kwocie i koncie wpisu (dawniej: nigdy, bez nich)', () => {
    const r = rule({ conditions: [cp('orlen'), { field: 'amount', min: null, max: 4000 }, { field: 'account', value: SECOND }] })
    const empty = officerData([], {})
    const ask = (amount?: number | null, accountId?: string) => officerHint({ counterparty: 'Orlen', amount, accountId }, empty, { rules: [r], aliases: {}, usable })
    expect(ask(-3000, SECOND)).toEqual({ categoryId: COFFEE, source: 'rule' })
    expect(ask(-5000, SECOND)?.source).not.toBe('rule')
    expect(ask(-3000, MBANK_ACCOUNT_ID)?.source).not.toBe('rule')
    // 0 zł – nothing typed yet: no condition of the amount holds.
    expect(ask(0, SECOND)?.source).not.toBe('rule')
  })

  it('w kodzie: każde wywołanie `findRule` ma kwotę i konto (pięć argumentów) – poza `matchRule` (sam klucz, bez operacji)', () => {
    const root = join(__dirname, '..', '..', 'src')
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.tsx?$/.test(name)) files.push(p)
      }
    }
    walk(root)
    const short: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (let at = text.indexOf('findRule('); at >= 0; at = text.indexOf('findRule(', at + 1)) {
        const line = text.slice(text.lastIndexOf('\n', at) + 1, text.indexOf('\n', at))
        if (/function findRule\(|export const matchRule/.test(line) || /[A-Za-z]$/.test(text[at - 1] ?? '')) continue
        // The call's arguments at its own depth.
        let depth = 0
        let commas = 0
        for (let i = at + 'findRule'.length; i < text.length; i++) {
          const ch = text[i]!
          if ('([{'.includes(ch)) depth++
          else if (')]}'.includes(ch)) {
            depth--
            if (depth === 0) break
          } else if (ch === ',' && depth === 1) commas++
        }
        if (commas < 4) short.push(`${file.slice(root.length + 1)}: ${line.trim()}`)
      }
    }
    expect(short).toEqual([])
  })
})

describe('przegląd R1 9: czego ta wersja nie umie przeczytać, zostaje w fi.json (odczyt → zapis bez utraty)', () => {
  const twelve: RuleCondition[] = Array.from({ length: 12 }, (_, i) => cp(`firma${i}`))
  const newerMapping = { separator: ';', encoding: 'auto', header: true, headers: ['Data', 'Kwota'], layout: { rows: 'po dwa' }, columns: 'według układu' }

  /** fi.json as main writes it: parsed (every write parses first), serialized, read back. */
  function roundTrip(fi: unknown): Record<string, unknown> {
    const parsed = SCHEMAS.fi.parse(fi)
    return JSON.parse(serializeRecord('fi', parsed)) as Record<string, unknown>
  }

  it('12 warunków, nieznany sposób łączenia, mapowanie CSV bez wymaganego pola – w pliku bez zmian (dawniej: skasowane)', () => {
    const base = createDefaultSettings(NOW)
    const rules = [
      { ...rule({}), id: '01K6RXXE000000000000000002', conditions: twelve },
      { ...rule({}), id: '01K6RXXE000000000000000003', conditions: [cp('orlen')], combine: { mode: 'co-najmniej', n: 2 } },
      { ...rule({}), id: '01K6RXXE000000000000000004', conditions: [{ field: 'counterparty', value: 'x'.repeat(300) }] }
    ]
    const accounts = [...base.settings.accounts, { id: SECOND, name: 'Inny bank', kind: 'bank', importFormat: 'csv', csvMapping: newerMapping, archived: false }]
    const fi = { ...base, settings: { ...base.settings, accounts, import: { ...base.settings.import, rules } } }
    const back = roundTrip(fi) as typeof fi
    const once = roundTrip(back) as typeof fi
    expect(back.settings.import.rules.map((r) => [r.conditions, (r as { combine?: unknown }).combine])).toEqual(rules.map((r) => [r.conditions, r.combine]))
    expect(back.settings.accounts.find((a) => a.id === SECOND)?.csvMapping).toEqual(newerMapping)
    expect(once).toEqual(back)
  })

  it('nieczytelne = „nieznane”: reguła nie jest stosowana, mapowanie – brak (import pyta o kolumny); czytelne – jak dotąd', () => {
    const many = importRuleSchema.parse(rule({ conditions: twelve }))
    const joined = importRuleSchema.parse(rule({ conditions: [cp('orlen')], combine: { mode: 'co-najmniej' } as never }))
    const fine = importRuleSchema.parse(rule({ conditions: [cp('orlen')] }))
    const target = ruleTargetOf({ counterparty: 'ORLEN STACJA', title: '' }).target
    expect(conditionsOf(many)).toBeNull()
    expect(compileRule(many)).toBeNull()
    expect(combineOf(joined)).toBeNull()
    expect(compileRule(joined)).toBeNull()
    expect(findRule([many, joined], target, 'out', -100, MBANK_ACCOUNT_ID)).toBeNull()
    expect(findRule([many, joined, fine], target, 'out', -100, MBANK_ACCOUNT_ID)?.id).toBe(fine.id)
    expect(conditionsOf(fine)).toEqual([cp('orlen')])
    expect(combineOf({ combine: undefined })).toBe('all')
    const settings = SCHEMAS.fi.parse(createDefaultSettings(NOW)).settings
    const acc = (csvMapping: unknown) => ({ ...settings.accounts[0]!, csvMapping }) as (typeof settings.accounts)[number]
    expect(readCsvMapping(acc(newerMapping))).toBeNull()
    expect(readCsvMapping(acc('zepsute'))).toBeNull()
    expect(readCsvMapping(acc(undefined))).toBeNull()
    const ok = { separator: ';', encoding: 'auto', skipRows: 0, header: true, headers: ['Data'], dateFormat: 'RRRR-MM-DD', decimal: ',', columns: { date: 0, amount: 1 } }
    expect(readCsvMapping(acc(ok))?.columns.amount).toBe(1)
  })
})

describe('przegląd R1 12: podpowiedź tej samej decyzji to nie zmiana („Dom” = `memberId` null)', () => {
  it('zakup finansowany przez „Dom” zapisany z `memberId` null, reguła z `memberId` null – bez podpowiedzi (dawniej: przycisk zamiast oficera)', () => {
    const r = importRuleSchema.parse({ id: '01K6RXXE000000000000000009', match: 'netflix', mode: 'exact', direction: 'out', label: 'Netflix', kind: 'expense', categoryId: FUN, refundable: true, memberId: null, manual: true, hits: 0, updatedAt: NOW })
    const h = manualRuleHint({ counterparty: 'Netflix', direction: 'out' }, { rules: [r], aliases: {}, usable, members: [{ id: HOUSE_MEMBER_ID }] })!
    expect(h.memberId).toBe(HOUSE_MEMBER_ID)
    const t = transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01K6TX00000000000000000001', createdAt: NOW, updatedAt: NOW, date: '2026-11-04', accountId: MBANK_ACCOUNT_ID, amount: -4300, counterparty: 'Netflix', categoryId: FUN, refundable: true, memberId: null })
    expect(hintedOf(t)).toMatchObject({ refundable: true, memberId: HOUSE_MEMBER_ID })
    expect(hintChanges(hintedOf(t), h)).toBe(false)
    // Another member, or my own purchase – a change.
    expect(hintChanges(hintedOf({ ...t, memberId: '01K6MEMBER0000000000000001' }), h)).toBe(true)
    expect(hintChanges(hintedOf({ ...t, refundable: false, memberId: null }), h)).toBe(true)
  })
})

describe('przegląd R1 2.3: reguła z warunkami z czymkolwiek nieczytelnym – nikt jej nie zapisuje po swojemu, tylko usunięcie', () => {
  const locked = (over: Record<string, unknown>) => importRuleSchema.parse({ ...rule({ conditions: [cp('bolt')] }), id: '01K6RXXE000000000000000010', ...over })

  it('nieczytelne `combine`, kierunek, rodzaj, warunki – reguła nieczytelna; czytelna – nie', async () => {
    const { unreadableRule } = await import('@shared/import/conditions')
    expect(unreadableRule(locked({ combine: 'none' }))).toBe(true)
    expect(unreadableRule(locked({ direction: 'both' }))).toBe(true)
    expect(unreadableRule(locked({ kind: 'przyszly' }))).toBe(true)
    expect(unreadableRule(locked({ conditions: Array.from({ length: 12 }, () => cp('x')) }))).toBe(true)
    expect(unreadableRule(locked({ conditions: [{ field: 'waluta', value: 'EUR' }] }))).toBe(true)
    expect(unreadableRule(locked({}))).toBe(false)
    expect(unreadableRule(importRuleSchema.parse({ ...rule({}), mode: 'exact', match: 'bolt', combine: 'none' }))).toBe(false)
  })

  it('import nigdy nią nie decyduje – więc „zapamiętaj” (które zmienia tylko regułę, która zdecydowała grupę) jej nie dotknie', () => {
    const target = ruleTargetOf({ counterparty: 'BOLT', title: '' }).target
    for (const over of [{ combine: 'none' }, { direction: 'both' }, { kind: 'przyszly' }]) expect(findRule([locked(over)], target, 'out', -100, MBANK_ACCOUNT_ID)).toBeNull()
    expect(findRule([locked({})], target, 'out', -100, MBANK_ACCOUNT_ID)).not.toBeNull()
  })

  it('przegląd reguł („do przeglądu” – „Zmień na spłatę”) nie podsuwa nieczytelnej reguły zaliczki', async () => {
    const { auditRules } = await import('@shared/import/audit')
    const advance = { direction: 'in', kind: 'income', categoryId: null, household: true, memberId: HOUSE_MEMBER_ID, inflowKind: 'advance' }
    expect(auditRules([locked({ ...advance, combine: 'none' })], [], {}).review).toEqual([])
    expect(auditRules([locked(advance)], [], {}).review).toHaveLength(1)
  })
})
