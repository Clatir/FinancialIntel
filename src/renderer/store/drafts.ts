import { useCallback, useRef } from 'react'
import { create } from 'zustand'
import { deepEqual } from '@shared/merge'
import { useData } from './data'

/**
 * Drafts of forms kept outside their screens (N36: „Nowa pożyczka”, „Nowy kontener”, „Nowy cel”, the loot split) –
 * leaving a screen never loses what was typed, as the operations' and the wizard's drafts. In memory only: another
 * folder or a restart starts them afresh.
 */
const useDrafts = create<Record<string, unknown>>(() => ({}))

type SetDraft<T> = (next: T | ((prev: T) => T)) => void

/**
 * A form's draft by its key: `blank` until something is typed, then what was typed – until `clear` (after its „Dodaj”,
 * „Anuluj”, a decision made).
 */
export function useDraft<T>(key: string, blank: () => T): [T, SetDraft<T>, () => void] {
  const stored = useDrafts((s) => s[key]) as T | undefined
  const make = useRef(blank)
  make.current = blank
  // The blank form, made again on every render while nothing is typed – a screen kept mounted for days (the app in the
  // tray) shows today's date and the accounts of now, never those of the day it was opened; the same object while its
  // content is the same.
  const shown = useRef<T | undefined>(undefined)
  if (stored === undefined) {
    const next = blank()
    if (shown.current === undefined || !deepEqual(shown.current, next)) shown.current = next
  }
  const set: SetDraft<T> = useCallback(
    (next) =>
      useDrafts.setState((s) => {
        const prev = (s[key] as T | undefined) ?? shown.current ?? make.current()
        return { [key]: typeof next === 'function' ? (next as (p: T) => T)(prev) : next }
      }),
    [key]
  )
  const clear = useCallback(() => clearDraft(key), [key])
  return [stored ?? (shown.current as T), set, clear]
}

/** Drop a form's draft (its blank form shows next). */
export function clearDraft(key: string): void {
  useDrafts.setState((s) => {
    if (!(key in s)) return s
    const rest = { ...s }
    delete rest[key]
    return rest
  }, true)
}

/** Another folder (its accounts, goals, months): the drafts of the previous one go. */
useData.subscribe((s, prev) => {
  if (prev.status && s.status && s.status.dataDir !== prev.status.dataDir) useDrafts.setState({}, true)
})
