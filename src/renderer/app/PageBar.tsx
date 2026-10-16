// adapted from ICTTJ src/renderer/app/TopBar.tsx @ 84a8339
import { useData } from '../store/data'
import { setPalette } from '../store/ui'
import { IconSearch } from '../components/icons'
import { Kbd } from '../components/ui'
import { SaveIndicator } from './SaveIndicator'
import { RemoteChangesChip } from '../features/sync/RemoteChangesDialog'
import { LayoutMenu } from '../features/layout/LayoutMenu'

/**
 * The thin bar over the page (the navigation is the side menu – decision D44): the data folder, changes from another
 * computer, the save state, the page's layout and the command palette.
 */
export function PageBar() {
  const status = useData((s) => s.status)
  return (
    <header className="flex h-[34px] shrink-0 items-center gap-4 border-b border-line bg-panel px-3">
      <span className="num min-w-0 truncate text-[11px] text-dim" title={status?.dataDir} data-testid="data-dir">
        {status?.dataDir}
      </span>
      <div className="ml-auto flex items-center gap-4">
        <RemoteChangesChip />
        <SaveIndicator />
        <LayoutMenu />
        <button className="btn h-[22px] shrink-0 gap-2 text-[11.5px] text-muted" onClick={() => setPalette(true)} title="Komendy (Ctrl+K)" data-testid="open-palette">
          <IconSearch size={13} /> <span className="max-[1180px]:hidden">Komendy</span> <Kbd>Ctrl K</Kbd>
        </button>
      </div>
    </header>
  )
}
