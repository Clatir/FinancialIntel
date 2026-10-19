// adapted from ICTTJ src/renderer/app/TopBar.tsx @ 84a8339
import { useData } from '../store/data'
import { setPalette, useUi } from '../store/ui'
import { IconSearch } from '../components/icons'
import { Kbd } from '../components/ui'
import { SaveIndicator } from './SaveIndicator'
import { RemoteChangesChip } from '../features/sync/RemoteChangesDialog'
import { LayoutMenu } from '../features/layout/LayoutMenu'
import { revealAmounts, useMachine } from '../store/machine'

/** The amounts hidden (Ctrl+$, idleness, the start – F40): said, and shown for a while or for the session. */
function HiddenAmounts() {
  const hidden = useMachine((s) => s.prefs.hideAmounts)
  if (!hidden) return null
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-muted" data-testid="amounts-hidden">
      <span className="max-[1180px]:hidden">Kwoty ukryte</span>
      <button className="btn h-[22px] px-2 text-[11.5px]" onClick={() => void revealAmounts(5)} title="Pokaż kwoty na 5 minut – potem znów ukryte" data-testid="reveal-5">
        Pokaż na 5 min
      </button>
      <button className="btn h-[22px] px-2 text-[11.5px]" onClick={() => void revealAmounts(null)} title="Pokaż kwoty do zamknięcia aplikacji – bez ukrywania po bezczynności (zablokowany ekran i tak je chowa)" data-testid="reveal-session">
        do końca sesji
      </button>
    </span>
  )
}

/**
 * The thin bar over the page (the navigation is the side menu – decision D44): the data folder, the hidden amounts,
 * changes from another computer, the save state, the page's layout and the command palette.
 */
export function PageBar() {
  const status = useData((s) => s.status)
  // The start wizard has no panels to show or hide (N61): no „Układ” there.
  const wizard = useUi((s) => s.route.page === 'wizard')
  return (
    <header className="flex h-[34px] shrink-0 items-center gap-4 border-b border-line bg-panel px-3">
      <span className="num min-w-0 truncate text-[11px] text-dim" title={status?.dataDir} data-testid="data-dir">
        {status?.dataDir}
      </span>
      <div className="ml-auto flex items-center gap-4">
        <HiddenAmounts />
        <RemoteChangesChip />
        <SaveIndicator />
        {!wizard && <LayoutMenu />}
        <button className="btn h-[22px] shrink-0 gap-2 text-[11.5px] text-muted" onClick={() => setPalette(true)} title="Komendy (Ctrl+K)" data-testid="open-palette">
          <IconSearch size={13} /> <span className="max-[1180px]:hidden">Komendy</span> <Kbd>Ctrl K</Kbd>
        </button>
      </div>
    </header>
  )
}
