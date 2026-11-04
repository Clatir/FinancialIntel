// adapted from ICTTJ src/renderer/features/history/DeleteButton.tsx @ 84a8339
/**
 * The trash button with the second step ("Usuń na pewno") of the trade editor, for the records that had no delete
 * (e.g. a month plan). The step is the app's one confirmation (`ConfirmButton`, AP-22).
 */
import { ConfirmButton } from '../../components/ConfirmButton'
import { IconTrash } from '../../components/icons'

export function DeleteButton({ title, onConfirm, testId }: { title: string; onConfirm: () => void; testId?: string }) {
  return (
    <ConfirmButton className="btn btn-ghost h-[22px] px-1.5 hover:text-down" title={title} confirmLabel="Usuń na pewno" onConfirm={onConfirm} testId={testId}>
      <IconTrash size={13} />
    </ConfirmButton>
  )
}
