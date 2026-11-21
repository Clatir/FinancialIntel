import { api, errorMessage } from '../../lib/api'
import { toast } from '../../store/ui'

/** Read the folder again: told when done, and why when it did not work (UX-19 – never a rejected promise left alone). */
export function rescanWithToast(done = 'Przeskanowano folder.'): Promise<void> {
  return api.rescan().then(
    () => toast(done, 'success'),
    (e: unknown) => toast(errorMessage(e), 'error')
  )
}
