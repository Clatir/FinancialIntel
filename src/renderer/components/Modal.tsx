// adapted from ICTTJ src/renderer/components/Modal.tsx @ 84a8339
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'

/** The dialogs open now, the last on top: Esc closes only that one (a history opened from a dialog – N18). */
const open: object[] = []

/**
 * Centered dialog over a dimmed page; Esc and a click outside close it (unless `onClose` is omitted). Rendered at the
 * page's end: a dialog opened from another one covers the whole window, not only the first one's box.
 */
export function Modal({
  title,
  children,
  onClose,
  width = 760,
  footer,
  testId
}: {
  title: ReactNode
  children: ReactNode
  onClose?: () => void
  width?: number
  footer?: ReactNode
  testId?: string
}) {
  // The latest onClose, while the dialog keeps its place on the stack through re-renders.
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const me = {}
    open.push(me)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || open[open.length - 1] !== me || !close.current) return
      e.preventDefault()
      e.stopPropagation()
      close.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      open.splice(open.indexOf(me), 1)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [])
  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/60" onMouseDown={() => onClose?.()} data-testid={testId}>
      <div
        className="flex max-h-[88vh] animate-pop-in flex-col border border-line-strong bg-panel"
        style={{ width: `min(${width}px, 94vw)` }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="flex h-[34px] shrink-0 items-center border-b border-line px-3">
          <span className="label flex-1">{title}</span>
          {onClose && (
            <button className="btn btn-ghost h-[24px] px-1.5" onClick={onClose} aria-label="Zamknij">
              <IconClose />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
        {footer && <div className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-2">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
