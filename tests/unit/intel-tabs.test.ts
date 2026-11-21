import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MBANK_ACCOUNT_ID, SCHEMA_VERSION, transactionSchema } from '@shared/schema'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k)
})
vi.stubGlobal('window', { fi: {} })
const { INTEL_TABS, TAB_KEY, readIntelTab, storeIntelTab, tabReadsPeriod } = await import('../../src/renderer/features/intel/tabs')
const { killzoneOperations } = await import('../../src/renderer/features/intel/killzoneDrill')

const STAMP = '2026-09-01T10:00:00.000Z'
const base = {
  schemaVersion: SCHEMA_VERSION,
  createdAt: STAMP,
  updatedAt: STAMP,
  accountId: MBANK_ACCOUNT_ID
}
const tx = (id: string, date: string, amount: number, time: string | null) => transactionSchema.parse({ ...base, id, date, amount, time })

beforeEach(() => store.clear())

describe('Wywiad w zakładkach (D106 pkt 6, T539)', () => {
  it('cztery zakładki w kolejności: Struktura, Wydatki, Prognozy, Dziennik', () => {
    expect(INTEL_TABS.map((t) => t.id)).toEqual(['structure', 'spending', 'forecasts', 'log'])
    expect(INTEL_TABS.map((t) => t.label)).toEqual(['Struktura', 'Wydatki', 'Prognozy', 'Dziennik'])
  })

  it('pamięć zakładki: domyślnie Struktura, zapamiętana wraca, nieznana wartość – Struktura', () => {
    expect(readIntelTab()).toBe('structure')
    storeIntelTab('forecasts')
    expect(store.get(TAB_KEY)).toBe('forecasts')
    expect(readIntelTab()).toBe('forecasts')
    store.set(TAB_KEY, 'zwój')
    expect(readIntelTab()).toBe('structure')
  })

  it('przełącznik 3 / 6 / 12 mies. tylko na zakładkach, które go czytają (Wydatki, Dziennik)', () => {
    expect(INTEL_TABS.filter((t) => tabReadsPeriod(t.id)).map((t) => t.id)).toEqual(['spending', 'log'])
  })
})

describe('komórka Killzone → jej operacje (UX-74)', () => {
  // 2026-10-05 is a Monday.
  const list = [
    tx('01K7S000000000000000000T01', '2026-10-05', -1_000, '12:10'),
    tx('01K7S000000000000000000T02', '2026-10-12', -2_500, '12:59'),
    tx('01K7S000000000000000000T03', '2026-10-12', -900, '13:00'),
    tx('01K7S000000000000000000T04', '2026-10-06', -700, '12:30'),
    tx('01K7S000000000000000000T05', '2026-10-05', -400, null),
    tx('01K7S000000000000000000T06', '2026-09-28', -300, '12:00'),
    tx('01K7S000000000000000000T07', '2026-10-19', 5_000, '12:00')
  ]
  it('poniedziałek, godzina 12 – zakupy z tej komórki, największe najpierw, w oknie siatki', () => {
    const r = killzoneOperations(list, '2026-10-01', '2026-10-31', 1, 12)
    expect(r.map((t) => t.id)).toEqual(['01K7S000000000000000000T02', '01K7S000000000000000000T01'])
  })
  it('inna komórka i pusta komórka', () => {
    expect(killzoneOperations(list, '2026-10-01', '2026-10-31', 1, 13).map((t) => t.id)).toEqual(['01K7S000000000000000000T03'])
    expect(killzoneOperations(list, '2026-10-01', '2026-10-31', 3, 12)).toEqual([])
  })
})
