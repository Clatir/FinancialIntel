import { NEWER_RECORD_MESSAGE } from '../store/data'

/** Under an editor of a record a newer version of the app wrote (B67): why its fields are off. */
export function NewerNote({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p className="text-[11.5px] text-accent" data-testid="entry-newer">
      {NEWER_RECORD_MESSAGE}
    </p>
  )
}
