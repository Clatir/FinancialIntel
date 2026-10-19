import { describe, expect, it } from 'vitest'
import { changeLog, changeLogMachines } from '@shared/changeLog'

const rec = (id: string, updatedAt: string, updatedBy: string | undefined, createdAt = '2026-10-01T08:00:00.000Z') => ({ id, createdAt, updatedAt, updatedBy })

describe('dziennik zmian folderu (1.7.0, F33)', () => {
  const records = {
    // T3 typed today in the editor: created as a draft, written again with each field.
    transactions: [rec('T1', '2026-10-19T09:00:00.000Z', 'LAPTOP'), rec('T2', '2026-10-10T09:00:00.000Z', 'DOM'), rec('T3', '2026-10-19T07:00:40.000Z', 'DOM', '2026-10-19T07:00:00.000Z')],
    months: [rec('2026-10', '2026-10-19T08:00:00.000Z', undefined)],
    fi: [{ ...rec('FI', '2026-10-19T10:00:00.000Z', 'DOM'), settings: {} }]
  }

  it('wpisy zmienione od chwili, najnowsze najpierw; nowy = utworzony w tym okresie (także pisany w edytorze); ustawienia z id pliku', () => {
    const log = changeLog(records, { since: '2026-10-19T00:00:00.000Z', machine: null, kind: null })
    expect(log.map((e) => [e.kind, e.id, e.by, e.created])).toEqual([
      ['fi', 'FI', 'DOM', false],
      ['transactions', 'T1', 'LAPTOP', false],
      ['months', '2026-10', null, false],
      ['transactions', 'T3', 'DOM', true]
    ])
  })

  it('filtr komputera i rodzaju; komputery do wyboru bez nieznanych', () => {
    const since = '2026-10-01T00:00:00.000Z'
    expect(changeLog(records, { since, machine: 'DOM', kind: 'transactions' }).map((e) => e.id)).toEqual(['T3', 'T2'])
    expect(changeLogMachines(changeLog(records, { since, machine: null, kind: null }))).toEqual(['DOM', 'LAPTOP'])
  })
})
