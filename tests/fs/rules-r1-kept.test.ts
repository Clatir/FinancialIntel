/**
 * Przegląd R1 9 (1.16.0): fi.json with what this version cannot read – a rule of 12 conditions (it reads at most 10), a
 * CSV mapping of a newer layout without a field this one needs – opened and saved by the data store (main parses fi.json
 * before every write): both stay in the file as they were.
 */
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DataStore } from '../../src/main/datastore/store'
import { freshStore, readJson } from './helpers'

describe('przegląd R1 9: nieczytelne pola reguły i konta zostają po zapisie fi.json', () => {
  it('odczyt → zmiana czegoś innego → zapis: warunki i mapowanie bez utraty (dawniej: skasowane)', async () => {
    const store = await freshStore()
    await store.open()
    const path = join(store.root, 'fi.json')
    const fi = (await readJson(path)) as { settings: { accounts: Array<Record<string, unknown>>; import: { rules: unknown[] } } }
    const conditions = Array.from({ length: 12 }, (_, i) => ({ field: 'counterparty', value: `firma${i}` }))
    const rule = { id: '01K6RXXE000000000000000002', match: 'dwanaście', mode: 'conditions', conditions, combine: 'all', direction: 'out', label: 'Dwanaście', kind: 'expense', categoryId: null, learned: false, hits: 0, updatedAt: '2026-11-05T09:00:00.000Z' }
    const csvMapping = { separator: ';', header: true, headers: ['Data', 'Kwota'], layout: { rows: 'po dwa' }, columns: 'według układu' }
    fi.settings.import.rules.push(rule)
    fi.settings.accounts.push({ id: '01K6ACC0000000000000000002', name: 'Inny bank', kind: 'bank', importFormat: 'csv', csvMapping, archived: false })
    await fs.writeFile(path, `${JSON.stringify(fi, null, 2)}\n`)
    const again = new DataStore(store.root, { machineName: 'TEST-PC' })
    const snap = await again.open()
    await again.saveSettings({ ...snap.fi, settings: { ...snap.fi.settings, ownNames: ['JAN KAPITAN'] } })
    const saved = (await readJson(path)) as typeof fi & { settings: { ownNames: string[] } }
    expect(saved.settings.ownNames).toEqual(['JAN KAPITAN'])
    expect(saved.settings.import.rules.find((r) => (r as { id: string }).id === rule.id)).toMatchObject({ conditions, combine: 'all' })
    expect(saved.settings.accounts.find((a) => a.id === '01K6ACC0000000000000000002')?.csvMapping).toEqual(csvMapping)
  })
})
