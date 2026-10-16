// adapted from ICTTJ src/renderer/features/history/DeleteButton.tsx @ 84a8339
/**
 * The trash button with the second step ("Usuń na pewno") of the trade editor, for the records that had no delete
 * (e.g. a month plan).
 */
import { useState } from 'react'
import { IconClose, IconTrash } from '../../components/icons'

export function DeleteButton({ title, onConfirm, testId }: { title: string; onConfirm: () => void; testId?: string }) {
  const [confirm, setConfirm] = useState(false)
  if (!confirm)
    return (
      <button className="btn btn-ghost h-[22px] px-1.5 hover:text-down" title={title} onClick={() => setConfirm(true)} data-testid={testId}>
        <IconTrash size={13} />
      </button>
    )
  return (
    <>
      <button
        className="btn h-[22px] border-down/60 text-down"
        onClick={() => {
          setConfirm(false)
          onConfirm()
        }}
        data-testid={testId ? `${testId}-confirm` : undefined}
      >
        Usuń na pewno
      </button>
      <button className="btn btn-ghost h-[22px] px-1.5" onClick={() => setConfirm(false)} title="Anuluj">
        <IconClose size={13} />
      </button>
    </>
  )
}
