import { describe, expect, it } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { SCHEMA_VERSION, settingsFileSchema } from '@shared/schema'
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
