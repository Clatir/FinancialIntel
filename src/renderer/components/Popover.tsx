// adapted from ICTTJ src/renderer/components/Popover.tsx @ 84a8339
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from './ui'

/** The gap kept between an open panel and the window's edge. */
const EDGE = 8

/** A button with a panel under it; closes on Escape and on a click outside. */
export function Popover({
  label,
  title,
  active,
  align = 'left',
  width = 360,
  disabled,
  testId,
  panelTestId,
  buttonClassName = 'btn h-[24px]',
  pressed,
  children
}: {
  label: ReactNode
  title?: string
  /** Highlights the button (e.g. filters are set). */
  active?: boolean
  /** Classes of the button (default: a toolbar button; `chip` for a chip). */
  buttonClassName?: string
  /** aria-pressed of the button (a chip that is on). */
  pressed?: boolean
  align?: 'left' | 'right'
  width?: number
  disabled?: boolean
  testId?: string
  panelTestId?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  // The panel kept on the screen (the phone, a narrow window – T311): moved by what sticks out, before it is painted, and
  // again when the window changes (a phone turned). Measured from the layout – the button's box and the panel's width –,
  // never from the panel's box, which the pop-in scales and the shift moves.
  const [shift, setShift] = useState(0)
  const [resized, setResized] = useState(0)
  useEffect(() => {
    if (!open) return
    const onResize = () => setResized((n) => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])
  useLayoutEffect(() => {
    const box = ref.current
    const el = panel.current
    if (!open || !box || !el) {
      setShift(0)
      return
    }
    const b = box.getBoundingClientRect()
    const width = el.offsetWidth
    const left = align === 'right' ? b.right - width : b.left
    const room = document.documentElement.clientWidth
    let move = left + width > room - EDGE ? room - EDGE - (left + width) : 0
    if (left + move < EDGE) move = EDGE - left
    setShift(move)
  }, [open, align, resized])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    // Escape closes only the panel: caught before the page's own shortcuts (e.g. the scanner's Esc → dashboard).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className={cx(buttonClassName, active && 'border-accent/60 text-accent')}
        title={title}
        disabled={disabled}
        aria-expanded={open}
        aria-pressed={pressed}
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
      >
        {label}
      </button>
      {open && (
        <div
          ref={panel}
          className={cx('absolute top-[28px] z-40 flex animate-pop-in flex-col gap-2 border border-line-strong bg-panel p-2.5 text-[12px]', align === 'right' ? 'right-0' : 'left-0')}
          // `translate` composes with the pop-in's `transform`.
          style={{ width: Math.min(width, document.documentElement.clientWidth - 2 * EDGE), translate: shift ? `${shift}px 0` : undefined }}
          data-testid={panelTestId}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
