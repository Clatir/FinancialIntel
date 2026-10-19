/**
 * A record the palette opened (1.7.0, F19): its screen shows it – `onFocus` selects it or opens its archive, then the
 * element `data-focus="<kind>:<id>"` is scrolled to (a closed `<details>` around it opened) and marked for 2 s.
 */
import { useEffect } from 'react'
import { useUi, type FocusKind } from '../store/ui'

export const MARK_MS = 2000

export function useFocusRecord(kind: FocusKind, onFocus?: (id: string) => void): void {
  const focus = useUi((s) => (s.focus?.kind === kind ? s.focus.id : null))
  useEffect(() => {
    if (!focus) return
    let cancelled = false
    onFocus?.(focus)
    let tries = 0
    // The row renders after `onFocus` (an archive shown): looked for a few frames.
    const mark = () => {
      if (cancelled) return
      const el = document.querySelector<HTMLElement>(`[data-focus="${kind}:${CSS.escape(focus)}"]`)
      if (!el && ++tries < 20) return void setTimeout(mark, 50)
      useUi.setState({ focus: null })
      if (!el) return
      el.closest('details')?.setAttribute('open', '')
      el.scrollIntoView({ block: 'center' })
      el.classList.add('focus-mark')
      setTimeout(() => el.classList.remove('focus-mark'), MARK_MS)
    }
    setTimeout(mark, 0)
    return () => {
      cancelled = true
    }
    // `onFocus` is the screen's – called for the focus asked, not again for a new function.
  }, [focus, kind])
}
