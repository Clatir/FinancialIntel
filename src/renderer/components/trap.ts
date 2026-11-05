/**
 * The keyboard's focus kept inside a dialog or the palette while it is open (AP-34, IN.28, AF-74): opened, the focus goes
 * into it (unless a field of it took it already – `autoFocus`); Tab and Shift+Tab go round its own elements, never to the
 * page under its overlay; closed, the focus goes back where it was (IN sp. 2: the palette's Esc left it on the page's
 * body). Only the top one of the open ones holds it (a history opened from a dialog).
 */
import { useEffect, useState, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The open traps, the last on top. */
const traps: object[] = []

/** The elements of `box` the Tab goes through, in their order (the visible ones). */
export function focusablesOf(box: HTMLElement): HTMLElement[] {
  return [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest('[inert]') && (el.offsetParent !== null || el === document.activeElement))
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>): void {
  // Where the focus was before the box: read at its first render – a field of the box focusing itself (`autoFocus`)
  // does so before any effect runs.
  const [before] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))
  useEffect(() => {
    const me = {}
    traps.push(me)
    const top = () => traps[traps.length - 1] === me
    // Into the box once it is drawn – a field focused by itself (the palette's input) stays; a dialog takes it on its
    // frame (`tabIndex=-1`): the first Tab goes to its first button, no Enter closes it by chance.
    const start = setTimeout(() => {
      const box = ref.current
      if (!box || !top() || box.contains(document.activeElement)) return
      if (box.tabIndex >= -1 && box.hasAttribute('tabindex')) box.focus()
      else focusablesOf(box)[0]?.focus()
    }, 0)
    const onKey = (e: KeyboardEvent) => {
      const box = ref.current
      if (e.key !== 'Tab' || !box || !top()) return
      const list = focusablesOf(box)
      if (!list.length) {
        e.preventDefault()
        box.focus()
        return
      }
      const at = list.indexOf(document.activeElement as HTMLElement)
      const next = e.shiftKey ? (at <= 0 ? list.length - 1 : at - 1) : at < 0 || at === list.length - 1 ? 0 : at + 1
      // The browser's own order inside the box, but never out of it (the ends go round).
      if (at < 0 || (e.shiftKey && at === 0) || (!e.shiftKey && at === list.length - 1)) {
        e.preventDefault()
        list[next]!.focus()
      }
    }
    // A click or a script putting the focus under the overlay: back into the box.
    const onFocusIn = (e: FocusEvent) => {
      const box = ref.current
      if (!box || !top() || !(e.target instanceof Node) || box.contains(e.target)) return
      // Another dialog of the page's end (a portal above this one) is its own trap.
      if (e.target instanceof Element && e.target.closest('[role="dialog"], [data-trap]')) return
      ;(focusablesOf(box)[0] ?? box).focus()
    }
    window.addEventListener('keydown', onKey, true)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      clearTimeout(start)
      traps.splice(traps.indexOf(me), 1)
      window.removeEventListener('keydown', onKey, true)
      document.removeEventListener('focusin', onFocusIn)
      // Back where it was, if that is still on the page (a row's button the dialog opened from) – unless what the dialog
      // did put the focus somewhere itself (a screen opened with its field focused).
      if (before && before !== document.body)
        setTimeout(() => {
          const now = document.activeElement
          if (before.isConnected && (!now || now === document.body || !now.isConnected)) before.focus()
        }, 0)
    }
    // The box is the dialog's own for its life.
  }, [ref, before])
}
