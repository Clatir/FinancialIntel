// adapted from ICTTJ src/renderer/app/App.tsx @ 84a8339
import { useEffect, type ReactNode } from 'react'
import { boot, flushSaves, useData } from '../store/data'
import { goBack, navigate, setPalette, toast, useUi, type Route } from '../store/ui'
import { setRemoteDialog, useRemote } from '../store/remote'
import { initUpdates } from '../store/update'
import { FolderSetup } from '../features/setup/FolderSetup'
import { SettingsPage } from '../features/settings/SettingsPage'
import { SyncPage } from '../features/sync/SyncPage'
import { RemoteChangesDialog } from '../features/sync/RemoteChangesDialog'
import { CommandPalette } from '../features/palette/CommandPalette'
import { PAGES, pageDef } from '../features/screens/pages'
import { PlaceholderPage } from '../features/screens/PlaceholderPage'
import { OperationsPage } from '../features/operations/OperationsPage'
import { ImportPage } from '../features/import/ImportPage'
import { MonthPage } from '../features/month/MonthPage'
import { CargoPage } from '../features/cargo/CargoPage'
import { WizardPage } from '../features/wizard/WizardPage'
import { BridgePage } from '../features/bridge/BridgePage'
import { StarMapPage } from '../features/starmap/StarMapPage'
import { useIctjGoalSync } from '../features/starmap/sync'
import { DockingDialog } from '../features/dock/DockingDialog'
import { initIctj, openIctj } from '../store/ictj'
import { loadMachinePrefs, toggleHideAmounts, useMachine } from '../store/machine'
import { initQuickHost } from '../store/quickHost'
import { initNotifier } from '../store/notifier'
import { useFleet } from '../store/fleet'
import { api } from '../lib/api'
import { plnText, setAmountsHidden } from '../components/fields'
import { Toasts } from '../components/Toasts'
import { IconExternal, IconGear, IconSync } from '../components/icons'
import { cx } from '../components/ui'
import { PageBar } from './PageBar'
import { Banners } from './Banners'
import { ErrorBoundary } from './ErrorBoundary'
import { ShortcutsHelp } from './ShortcutsHelp'

/**
 * "Back": the mouse's back button on every page; Esc on the side trips (Ustawienia, Synchronizacja). Not while a
 * dialog, the palette, a menu or a text field has the key.
 */
function useBackNavigation(): void {
  useEffect(() => {
    const busy = () => !!document.querySelector('[role="dialog"], [aria-expanded="true"]') || useUi.getState().paletteOpen
    const onMouse = (e: MouseEvent) => {
      if (e.button !== 3 || busy()) return
      e.preventDefault()
      goBack()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || busy()) return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      const route = useUi.getState().route
      if (route.page === 'settings' || route.page === 'sync') goBack()
    }
    window.addEventListener('mouseup', onMouse)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mouseup', onMouse)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
}

function useGlobalHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useData.getState().phase !== 'ready') return
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'k') {
        e.preventDefault()
        setPalette(!useUi.getState().paletteOpen)
        return
      }
      // Ctrl+1…0: the screens in the menu's order (by key position, so Shift / the layout do not matter).
      const digit = /^Digit(\d)$/.exec(e.code)?.[1]
      const def = !e.shiftKey && digit ? PAGES.find((p) => p.key === digit) : undefined
      if (def) {
        e.preventDefault()
        navigate({ page: def.page })
      } else if (k === 'y' && e.shiftKey) {
        e.preventDefault()
        navigate({ page: 'sync' })
      } else if (e.key === '$' || (e.shiftKey && e.code === 'Digit4')) {
        e.preventDefault()
        toggleHideAmounts()
      } else if (e.key === ',') {
        e.preventDefault()
        navigate({ page: 'settings' })
      } else if (k === 's' && !e.shiftKey) {
        e.preventDefault()
        if (useRemote.getState().pending.length) {
          setRemoteDialog(true)
          toast('Czekają zmiany z drugiego komputera – te wpisy zapiszą się po Twojej decyzji.', 'info', 5000)
          return
        }
        void flushSaves().then((saved) =>
          saved
            ? toast('Zapisano. (Zapis jest automatyczny – Ctrl+S nie jest potrzebne.)', 'success', 2200)
            : toast(`Nie udało się zapisać: ${useData.getState().save.error ?? 'błąd zapisu'}. Aplikacja ponowi zapis automatycznie.`, 'error', 6000)
        )
      } else return
      // Every shortcut the app handled closes the palette.
      if (useUi.getState().paletteOpen) setPalette(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  sub,
  keys,
  dim,
  badge,
  testId
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  sub?: string
  keys?: string
  /** A screen of a later stage (after the 1.0 release). */
  dim?: string
  badge?: number
  testId?: string
}) {
  return (
    <button
      onClick={onClick}
      title={[keys ? `${label} (${keys})` : label, dim].filter(Boolean).join(' – ')}
      data-testid={testId}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative flex h-[38px] w-full shrink-0 items-center gap-2.5 border-l-2 px-3 text-left transition-colors duration-100',
        active ? 'border-accent bg-accent-soft text-accent' : 'border-transparent hover:bg-hover hover:text-fg-strong',
        !active && (dim ? 'text-dim' : 'text-fg')
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-[12.5px]">{label}</span>
        {sub && <span className={cx('truncate text-[10.5px]', active ? 'text-accent/70' : 'text-dim')}>{sub}</span>}
      </span>
      {badge ? <span className="num min-w-[16px] bg-accent px-1 text-center text-[10px] text-bg">{badge}</span> : null}
      {keys && !badge && <span className="num text-[10px] text-dim">{keys}</span>}
    </button>
  )
}

/** The side menu (decision D44): the ship's name, the screens in order, Synchronizacja and Ustawienia at the bottom. */
function SideMenu({ route }: { route: Route }) {
  const shipName = useData((s) => s.fi?.settings.shipName ?? '')
  const issues = useData((s) => s.conflicts.length + s.problems.filter((p) => p.kind !== 'unknown-file').length)
  return (
    <nav className="flex w-[208px] shrink-0 flex-col overflow-y-auto border-r border-line bg-panel [scrollbar-width:none]" data-testid="side-menu">
      <div className="flex h-[52px] shrink-0 flex-col justify-center border-b border-line px-3">
        <span className="text-[13px] font-semibold tracking-wide text-fg-strong">Financial Intel</span>
        <span className="truncate text-[11px] text-muted" data-testid="menu-ship-name">
          okręt <span className="text-accent">{shipName}</span>
        </span>
      </div>
      <div className="flex flex-col py-1">
        {PAGES.map((p) => (
          <NavItem
            key={p.page}
            active={route.page === p.page}
            onClick={() => navigate({ page: p.page })}
            icon={p.icon(16)}
            label={p.label}
            sub={p.sub}
            keys={`Ctrl ${p.key}`}
            dim={p.ready ? undefined : `etap ${p.stage} – w przygotowaniu`}
            testId={`nav-${p.page}`}
          />
        ))}
      </div>
      <div className="flex-1" />
      <div className="flex flex-col border-t border-line py-1">
        <NavItem
          active={false}
          onClick={() => void openIctj(() => navigate({ page: 'settings', tab: 'ictj' }))}
          icon={<IconExternal size={16} />}
          label="Otwórz ICTTJ"
          sub="ICT Trade Journal"
          testId="nav-open-ictj"
        />
        <NavItem active={route.page === 'sync'} onClick={() => navigate({ page: 'sync' })} icon={<IconSync size={16} />} label="Synchronizacja" badge={issues} testId="nav-sync" />
        <NavItem active={route.page === 'settings'} onClick={() => navigate({ page: 'settings' })} icon={<IconGear size={16} />} label="Ustawienia" keys="Ctrl ," testId="nav-settings" />
        <button
          className="mx-3 my-1.5 flex h-[22px] items-center justify-center border border-line-strong text-[11px] text-muted hover:text-fg-strong"
          title="Skróty klawiszowe (? / F1)"
          onClick={() => window.dispatchEvent(new Event('fi:shortcuts'))}
          data-testid="nav-help"
        >
          ? skróty
        </button>
      </div>
    </nav>
  )
}

function Page({ route }: { route: Route }) {
  if (route.page === 'settings') return <SettingsPage />
  if (route.page === 'sync') return <SyncPage />
  if (route.page === 'operations') return <OperationsPage />
  if (route.page === 'import') return <ImportPage />
  if (route.page === 'month') return <MonthPage />
  if (route.page === 'cargo') return <CargoPage />
  if (route.page === 'wizard') return <WizardPage />
  if (route.page === 'bridge') return <BridgePage />
  if (route.page === 'starmap') return <StarMapPage />
  const def = pageDef(route.page)
  return def ? <PlaceholderPage key={def.page} def={def} /> : null
}

/** Today's energy in the tray's tooltip (masked with the amounts). */
function TrayStatus() {
  const fleet = useFleet()
  useMachine((s) => s.prefs.hideAmounts)
  const text = fleet?.daily ? `Energia dziś: ${plnText(fleet.daily.left)} zł` : null
  useEffect(() => {
    void api.setTrayStatus(text)
  }, [text])
  return null
}

export function App() {
  const phase = useData((s) => s.phase)
  // Ctrl+$ (D30): every amount of the tree renders masked; the change renders the whole tree again (no memoized parts).
  const hideAmounts = useMachine((s) => s.prefs.hideAmounts)
  setAmountsHidden(hideAmounts)
  const route = useUi((s) => s.route)
  useGlobalHotkeys()
  useBackNavigation()
  useIctjGoalSync()
  useEffect(() => {
    void boot()
    void loadMachinePrefs()
    initIctj()
    initQuickHost()
    initNotifier()
    initUpdates()
  }, [])

  if (phase === 'boot') return <div className="flex h-full items-center justify-center text-muted">Wczytywanie…</div>
  if (phase === 'setup')
    return (
      <>
        <FolderSetup />
        <Toasts />
      </>
    )

  return (
    <div className="flex h-full" data-amounts={hideAmounts ? 'hidden' : 'shown'}>
      <SideMenu route={route} />
      <div className="flex min-w-0 flex-1 flex-col">
        <PageBar />
        <Banners />
        {/* isolate: z-indexes inside a page (chart layers) stay under the bar's menus */}
        <main className="isolate min-h-0 flex-1 animate-fade-in" key={route.page}>
          <ErrorBoundary onReset={() => navigate({ page: 'bridge' })}>
            <Page route={route} />
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
      <DockingDialog />
      <TrayStatus />
      <ShortcutsHelp />
      <RemoteChangesDialog />
      <Toasts />
    </div>
  )
}
