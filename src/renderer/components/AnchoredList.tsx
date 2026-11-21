import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './ui'

/** The target of an Esc that closes its own open list first: an expanded combobox or an item of an open menu. */
export function ownsEscape(target: EventTarget | null): boolean {
  return target instanceof Element && (target.matches('[role="combobox"][aria-expanded="true"]') || !!target.closest('[role="menu"]'))
}

const MAX_HEIGHT = 260

interface Place {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

/** Where a list under (or, with no room below, above) the field goes: fixed in the window, as wide as the field. */
function placeOf(el: HTMLElement, minWidth: number): Place {
  const r = el.getBoundingClientRect()
  const win = { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }
  const below = win.h - r.bottom - 6
  const above = r.top - 6
  const up = below < 160 && above > below
  const width = Math.max(r.width, minWidth)
  const left = Math.max(4, Math.min(r.left, win.w - width - 4))
  return up
    ? { left, width, bottom: win.h - r.top + 2, maxHeight: Math.min(MAX_HEIGHT, above) }
    : { left, width, top: r.bottom + 2, maxHeight: Math.min(MAX_HEIGHT, Math.max(80, below)) }
}

/**
 * A list shown by a field (a combobox's options, a small menu): in a portal at the page's end, so no scrolling panel and
 * no dialog cuts it; follows the field while the window scrolls or is resized. The field keeps the focus – its options
 * take the mouse without moving it (`onMouseDown` default prevented).
 */
export function AnchoredList({
  anchor,
  id,
  role = 'listbox',
  minWidth = 0,
  className,
  testId,
  label,
  children
}: {
  anchor: RefObject<HTMLElement | null>
  id: string
  role?: 'listbox' | 'menu'
  minWidth?: number
  className?: string
  testId?: string
  label?: string
  children: ReactNode
}) {
  // Placed at once (the field is on the page already): a list's first item may take the focus in the same commit.
  const [place, setPlace] = useState<Place | null>(() => (anchor.current ? placeOf(anchor.current, minWidth) : null))
  useLayoutEffect(() => {
    const el = anchor.current
    if (!el) return
    const update = () => setPlace(placeOf(el, minWidth))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, minWidth])
  if (!place) return null
  return createPortal(
    <div
      id={id}
      role={role}
      aria-label={label}
      className={cx('fixed z-[70] overflow-y-auto border border-line-strong bg-raised py-1 text-[12px]', className)}
      style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
      onMouseDown={(e) => e.preventDefault()}
      data-testid={testId}
    >
      {children}
    </div>,
    document.body
  )
}
