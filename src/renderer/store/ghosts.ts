import { create } from 'zustand'
import type { GhostFolder } from '@shared/api'
import { api } from '../lib/api'
import { useData } from './data'

/**
 * Folders of FI's records without fi.json among this computer's data folders of before (AP-1): a „folder-widmo” a write
 * of 1.15.4 or older made while the data folder was away. Looked for once a folder is shown; a report in the inbox.
 */
export const useGhosts = create<{ list: GhostFolder[] }>(() => ({ list: [] }))

const NONE: GhostFolder[] = []

/** Look for them now (a folder shown). */
export function findGhosts(): void {
  if (typeof api?.ghostFolders !== 'function') return
  api.ghostFolders().then(
    (list) => useGhosts.setState({ list: list.length ? list : NONE }),
    () => undefined
  )
}

useData.subscribe((s, prev) => {
  if (s.phase === 'ready' && (prev.phase !== 'ready' || s.status?.dataDir !== prev.status?.dataDir)) findGhosts()
})
