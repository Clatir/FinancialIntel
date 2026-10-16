// adapted from ICTTJ src/renderer/components/Popover.tsx @ 84a8339
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from './ui'

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
          className={cx('absolute top-[28px] z-40 flex animate-pop-in flex-col gap-2 border border-line-strong bg-panel p-2.5 text-[12px]', align === 'right' ? 'right-0' : 'left-0')}
          style={{ width }}
          data-testid={panelTestId}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
