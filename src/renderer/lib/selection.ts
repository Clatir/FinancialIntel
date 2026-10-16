// adapted from ICTTJ src/renderer/lib/selection.ts @ 84a8339
import { useCallback, useEffect, useMemo, useState } from 'react'

export interface Selection {
  selected: ReadonlySet<string>
  toggle: (id: string, on: boolean) => void
  /** Every id (on) or none. */
  setAll: (on: boolean) => void
  /** Forget the given ids (decided), or all. */
  drop: (ids?: Iterable<string>) => void
}

/**
 * Ticked items of a list. An id that left the list is forgotten,
 * so an item coming back under the same id starts unticked.
 */
export function useSelection(ids: readonly string[]): Selection {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const key = ids.join('\n')
  useEffect(() => {
    const present = new Set(key ? key.split('\n') : [])
    setSelected((x) => {
      const next = new Set([...x].filter((id) => present.has(id)))
      return next.size === x.size ? x : next
    })
  }, [key])
  const toggle = useCallback((id: string, on: boolean) => {
    setSelected((x) => {
      if (x.has(id) === on) return x
      const next = new Set(x)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const setAll = useCallback((on: boolean) => setSelected(on ? new Set(key ? key.split('\n') : []) : new Set()), [key])
  const drop = useCallback((only?: Iterable<string>) => {
    if (!only) return setSelected(new Set())
    const gone = new Set(only)
    setSelected((x) => new Set([...x].filter((id) => !gone.has(id))))
  }, [])
  return useMemo(() => ({ selected, toggle, setAll, drop }), [selected, toggle, setAll, drop])
}
