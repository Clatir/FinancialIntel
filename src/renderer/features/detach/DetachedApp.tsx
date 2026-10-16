// adapted from ICTTJ src/renderer/features/detach/DetachedApp.tsx @ 84a8339
import { useEffect, useState, type ReactNode } from 'react'
import type { DetachPayload } from '@shared/api'
import { api } from '../../lib/api'
import { DetachedContext } from '../../components/Panel'
import { IconClose, IconMaximize, IconRestore } from '../../components/icons'

/** Data of each kind of detached panel (sent by the main window as plain JSON). */
export interface DetachProps {
  /** A panel of a screen not built yet (E0): its name and the stage that fills it. */
  placeholder: { text: string }
}

function view(payload: DetachPayload): ReactNode {
  switch (payload.kind) {
    case 'placeholder': {
      const p = payload.props as DetachProps['placeholder']
      return (
        <div className="flex flex-1 items-center justify-center text-muted" data-testid="detached-placeholder">
          {p.text}
        </div>
      )
    }
    default:
      return <div className="text-muted">Nieznany rodzaj panelu: {payload.kind}</div>
  }
}

/**
 * A detached window (`?detached=<key>`, decision D45 – panels on a second monitor): the panel the main window sends,
 * full size, a bar with full screen on / off (F11, Esc leaves full screen) and "Przywróć do aplikacji" (closes the
 * window, the panel goes back).
 */
export function DetachedApp() {
  const [payload, setPayload] = useState<DetachPayload | null>(null)
  const [full, setFull] = useState(true)

  useEffect(() => {
    const off = api.onDetachProps((p) => setPayload(p))
    void api.detachReady().then((p) => p && setPayload((cur) => cur ?? p))
    return off
  }, [])
  useEffect(() => {
    if (payload) document.title = `${payload.title} – Financial Intel`
  }, [payload?.title])

  const fullscreen = (on?: boolean) => void api.detachFullscreen(on).then(setFull)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        fullscreen()
      } else if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('[role="dialog"], [aria-expanded="true"]')) fullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-bg text-fg" data-testid="detached-app">
      <header className="flex h-[30px] shrink-0 items-center gap-2 border-b border-line bg-panel px-2.5">
        <h1 className="label flex-1 truncate font-medium" data-testid="detached-title">
          {payload?.title ?? 'Wczytuję…'}
        </h1>
        <button className="btn h-[22px] gap-1 px-1.5 text-[11px]" onClick={() => fullscreen()} title="F11" data-testid="detached-fullscreen">
          {full ? <IconRestore size={12} /> : <IconMaximize size={12} />}
          {full ? 'Okno' : 'Pełny ekran'}
        </button>
        <button className="btn h-[22px] gap-1 px-1.5 text-[11px]" onClick={() => window.close()} title="Zamyka to okno – panel wraca do aplikacji" data-testid="detached-attach">
          <IconClose size={12} />
          Przywróć do aplikacji
        </button>
      </header>
      <DetachedContext.Provider value={true}>
        <main className="flex min-h-0 flex-1 flex-col p-2.5">{payload ? view(payload) : null}</main>
      </DetachedContext.Provider>
    </div>
  )
}
