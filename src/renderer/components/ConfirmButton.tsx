/**
 * The one confirmation of an action nothing here can undo (AP-22, T401): the button, then – in the same place – the
 * question (`message` – what is lost and what stays), „<confirmLabel>” and „Anuluj”. Esc withdraws it; the focus goes to
 * the confirming button, so the keyboard does not have to look for it. A deletion that „Cofnij” brings back needs none.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconClose } from './icons'
import { cx } from './ui'

export function ConfirmButton({
  children,
  confirmLabel,
  message,
  onConfirm,
  title,
  className,
  disabled,
  testId
}: {
  /** The button before the question. */
  children: ReactNode
  confirmLabel: string
  message?: ReactNode
  onConfirm: () => void
  title?: string
  className?: string
  disabled?: boolean
  testId?: string
}) {
  const [armed, setArmed] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!armed) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setArmed(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [armed])
  if (!armed)
    return (
      <button type="button" className={className} title={title} disabled={disabled} onClick={() => setArmed(true)} data-testid={testId}>
        {children}
      </button>
    )
  return (
    <span className="flex flex-wrap items-center gap-1.5" data-testid={testId ? `${testId}-ask` : undefined}>
      {message && <span className="text-[11.5px] text-muted">{message}</span>}
      <button
        ref={confirmRef}
        type="button"
        className="btn h-[22px] border-down/60 text-down"
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
        data-testid={testId ? `${testId}-confirm` : undefined}
      >
        {confirmLabel}
      </button>
      <button type="button" className={cx('btn btn-ghost h-[22px] px-1.5')} onClick={() => setArmed(false)} title="Anuluj" data-testid={testId ? `${testId}-cancel` : undefined}>
        <IconClose size={13} />
      </button>
    </span>
  )
}
