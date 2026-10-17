// adapted from ICTTJ tests/unit/migrations.test.ts @ 84a8339
import { describe, expect, it } from 'vitest'
import { migrateRaw, readSchemaVersion, SchemaTooNewError } from '@shared/migrations'
import { parseRecordObject, parseRecordText, serializeRecord } from '@shared/records'
import { createDefaultSettings } from '@shared/defaults'
import { COLLECTIONS } from '@shared/paths'
import { DEFAULT_SHIP_NAME, MBANK_ACCOUNT_ID, SCHEMA_VERSION, type Transaction } from '@shared/schema'

const ID = '01K6H3Z0W8Q4M2N5P7R9S1T3V5'
const NOW = '2026-10-01T10:00:00.000Z'

const transaction = (over: Record<string, unknown> = {}): Transaction =>
  ({ schemaVersion: SCHEMA_VERSION, id: ID, createdAt: NOW, updatedAt: NOW, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, amount: -4599, ...over }) as Transaction

describe('migracje schematu', () => {
  it('wersja pliku: liczba całkowita ≥ 0, inaczej v0', () => {
    expect(readSchemaVersion({ schemaVersion: 1 })).toBe(1)
    expect(readSchemaVersion({ schemaVersion: '1' })).toBe(0)
    expect(readSchemaVersion({ schemaVersion: -1 })).toBe(0)
    expect(readSchemaVersion({ schemaVersion: 1.5 })).toBe(0)
    expect(readSchemaVersion({})).toBe(0)
    expect(readSchemaVersion(null)).toBe(0)
  })

  it('rekord bez schemaVersion (v0) → bieżący, z id i czasami; dane zostają', () => {
    const r = parseRecordText('transactions', JSON.stringify({ date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, amount: -4599, note: 'ręcznie' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.migrated).toBe(true)
    expect(r.fromVersion).toBe(0)
    expect(r.value).toMatchObject({ schemaVersion: SCHEMA_VERSION, date: '2026-10-01', amount: -4599, note: 'ręcznie' })
    expect(r.value.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    expect(r.value.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(r.value.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('v0 z id i czasami: zachowane', () => {
    const r = parseRecordText('goals', JSON.stringify({ id: ID, name: 'Wakacje', target: 500000, createdAt: NOW, updatedAt: NOW }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toMatchObject({ schemaVersion: SCHEMA_VERSION, id: ID, name: 'Wakacje', createdAt: NOW, updatedAt: NOW })
  })

  it('każda kolekcja i fi.json mają krok z v0', () => {
    for (const kind of [...COLLECTIONS, 'fi' as const]) {
      const m = migrateRaw(kind, { id: ID })
      expect(m).toMatchObject({ fromVersion: 0, migrated: true, data: { id: ID, schemaVersion: SCHEMA_VERSION } })
    }
  })

  it('fi.json bez schemaVersion: domyślne ustawienia', () => {
    const r = parseRecordText('fi', JSON.stringify({ settings: { shipName: 'Sokół' } }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.settings.shipName).toBe('Sokół')
    expect(r.value.settings.sync.remoteChanges).toBe('merge')
    expect(r.value.settings.layoutPresets).toEqual([])
    const empty = parseRecordText('fi', '{}')
    expect(empty.ok && empty.value.settings.shipName).toBe(DEFAULT_SHIP_NAME)
  })

  it('nowszy format → błąd z numerem wersji', () => {
    expect(() => migrateRaw('transactions', { ...transaction(), schemaVersion: SCHEMA_VERSION + 1 })).toThrow(SchemaTooNewError)
    const r = parseRecordText('transactions', JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1 }))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.tooNewVersion).toBe(SCHEMA_VERSION + 1)
      expect(r.error).toMatch(/Zaktualizuj aplikację/)
    }
  })

  it('bieżący format nie jest migrowany; nieznane pola są zachowane', () => {
    const text = serializeRecord('transactions', { ...transaction(), futureField: { a: 1 } } as Transaction)
    const r = parseRecordText('transactions', text)
    expect(r.ok).toBe(true)
    expect(r.ok && r.migrated).toBe(false)
    expect(r.ok && (r.value as Record<string, unknown>).futureField).toEqual({ a: 1 })
    const fi = createDefaultSettings(NOW)
    const s = parseRecordText('fi', serializeRecord('fi', { ...fi, settings: { ...fi.settings, futureSetting: [{ id: 'a' }] } }))
    expect(s.ok && s.migrated).toBe(false)
    expect(s.ok && (s.value.settings as Record<string, unknown>).futureSetting).toEqual([{ id: 'a' }])
  })

  it('zapis: wcięcie 2 spacje i końcowy znak nowej linii', () => {
    const text = serializeRecord('transactions', transaction())
    expect(text.endsWith('}\n')).toBe(true)
    expect(text).toContain(`\n  "id": "${ID}",`)
    expect(JSON.parse(text)).toEqual(transaction())
  })

  it('uszkodzony JSON i zła struktura → czytelny błąd, bez wyjątku', () => {
    const bad = parseRecordText('transactions', '{"id": "x", ')
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error).toMatch(/Uszkodzony JSON/)
    const wrong = parseRecordText('transactions', JSON.stringify({ schemaVersion: SCHEMA_VERSION, id: 'abc' }))
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) expect(wrong.error).toMatch(/Niepoprawna struktura/)
    // The layout fields: a dated record needs its date, a monthly one its month.
    expect(parseRecordObject('transactions', transaction({ date: '1.10.2026' })).ok).toBe(false)
    expect(parseRecordObject('months', { schemaVersion: SCHEMA_VERSION, id: ID, createdAt: NOW, updatedAt: NOW, month: '2026-13', salary: 0 }).ok).toBe(false)
    expect(parseRecordObject('months', { schemaVersion: SCHEMA_VERSION, id: ID, createdAt: NOW, updatedAt: NOW, month: '2026-10', salary: 0 }).ok).toBe(true)
    expect(parseRecordText('transactions', '[1, 2]').ok).toBe(false)
    expect(parseRecordText('transactions', 'null').ok).toBe(false)
  })

  it('BOM na początku pliku jest akceptowany', () => {
    expect(parseRecordText('transactions', `﻿${serializeRecord('transactions', transaction())}`).ok).toBe(true)
  })
})
