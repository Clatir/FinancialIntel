// adapted from ICTTJ src/renderer/components/Toasts.tsx @ 84a8339
import { closeToast, pauseToast, resumeToast, useUi } from '../store/ui'
import { cx } from './ui'

/** A click in the toast's text closes it (UX-10) – not when the text is being selected to copy it. */
function closeUnlessSelecting(id: number): void {
  if (window.getSelection()?.toString()) return
  closeToast(id)
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed right-3 bottom-8 z-[60] flex flex-col items-end gap-1.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          // The mouse over a toast stops its time (UX-10): a long message can be read to the end.
          onMouseEnter={() => pauseToast(t.id)}
          onMouseLeave={() => resumeToast(t.id)}
          onClick={() => closeUnlessSelecting(t.id)}
          data-testid="toast"
          data-kind={t.kind}
          className={cx(
            'pointer-events-auto max-w-[460px] animate-slide-up cursor-pointer border bg-raised px-3 py-1.5 text-[12px]',
            t.kind === 'error' ? 'border-down/60 text-fg-strong' : t.kind === 'success' ? 'border-accent/50 text-fg-strong' : 'border-line-strong text-fg'
          )}
        >
          {t.kind === 'error' && <span className="mr-2 text-down">Błąd</span>}
          {t.text}
          {t.action && (
            <button
              className="ml-3 font-medium text-accent hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                closeToast(t.id)
                t.action!.run()
              }}
              data-testid="toast-action"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
