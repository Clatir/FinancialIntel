import { describe, expect, it } from 'vitest'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'

// Z14 (1.21.0, fixes after the review): „Cofnij” of the notifications' bulk switches restores only the switches the
// action changed. The renderer module is loaded by a path in a variable (as `settings-z9.test.ts`): it stays in the node project.
interface NotifyModule {
  NOTIFY_GROUPS: ReadonlyArray<{ id: string; rows: ReadonlyArray<[string, string]> }>
  NOTIFY_KEYS: readonly string[]
  notifyCount: (n: typeof DEFAULT_MACHINE_PREFS.notify, keys?: readonly string[]) => { on: number; all: number }
  notifySetAll: (n: typeof DEFAULT_MACHINE_PREFS.notify, keys: readonly string[], on: boolean) => typeof DEFAULT_MACHINE_PREFS.notify
  notifyRestore: (
    current: typeof DEFAULT_MACHINE_PREFS.notify,
    before: typeof DEFAULT_MACHINE_PREFS.notify,
    keys: readonly string[]
  ) => typeof DEFAULT_MACHINE_PREFS.notify
}
const load = <T,>(p: string): Promise<T> => import(p) as Promise<T>
const notify = await load<NotifyModule>('@renderer/features/settings/notifyGroups')

describe('Z14: „Cofnij” zmiany zbiorczej powiadomień', () => {
  it('przywraca przełączniki z kluczy zmiany, godziny i późniejszą zmianę innego przełącznika zostawia', () => {
    const before = { ...DEFAULT_MACHINE_PREFS.notify, loans: false, eveningTime: '20:15' }
    const off = notify.notifySetAll(before, notify.NOTIFY_KEYS, false)
    // Changed since the bulk action: the hour and one switch the action did not touch (it was off already: not in `changed`).
    const current = { ...off, eveningTime: '21:30', loans: true }
    const changed = notify.NOTIFY_KEYS.filter((k) => (before as Record<string, unknown>)[k] !== false)
    const restored = notify.notifyRestore(current, before, changed)
    expect(restored.eveningTime).toBe('21:30')
    // `loans` was off before and is not among the restored keys: the later change stays.
    expect(restored.loans).toBe(true)
    expect(notify.notifyCount(restored)).toEqual({ on: 20, all: 20 })
  })

  it('grupa: wraca tylko jej przełączniki', () => {
    const keys = notify.NOTIFY_GROUPS[3]!.rows.map(([k]) => k)
    const off = notify.notifySetAll(DEFAULT_MACHINE_PREFS.notify, keys, false)
    expect(notify.notifyCount(off)).toEqual({ on: 20 - keys.length, all: 20 })
    expect(notify.notifyRestore(off, DEFAULT_MACHINE_PREFS.notify, keys)).toEqual(DEFAULT_MACHINE_PREFS.notify)
  })
})
