/**
 * The phone's window (T305, IP0.3, IP1, IP2): the bar with the ship and the sync, the screen, the menu at the bottom and
 * the quick entry as a sheet over everything. The screens are the computers' renderer (the same stores, the same
 * numbers) in one column; what the phone does not have yet says so.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { boot, useData } from '@renderer/store/data'
import { navigate, useUi } from '@renderer/store/ui'
import { initQuickHost } from '@renderer/store/quickHost'
import { initPresence } from '@renderer/store/presence'
import { initNotifier } from '@renderer/store/notifier'
import { initIctj } from '@renderer/store/ictj'
import { toggleHideAmounts, useMachine } from '@renderer/store/machine'
import { CompactContext, cx } from '@renderer/components/ui'
import { setAmountsHidden } from '@renderer/components/fields'
import { Toasts } from '@renderer/components/Toasts'
import { RemoteChangesDialog } from '@renderer/features/sync/RemoteChangesDialog'
import { QuickApp } from '@renderer/features/quick/QuickApp'
import { PAGES } from '@renderer/features/screens/pages'
import { IconGear } from '@renderer/components/icons'
import { api } from '@renderer/lib/api'
import { usePhone } from '../phone'
import { phoneHost } from '../hostRef'
import { PhoneBridge } from './PhoneBridge'
import { PhoneSettings } from './PhoneSettings'
import { NoticePlanner } from './notices'

type PhoneTab = 'main' | 'settings'
export const usePhoneTab = create<{ tab: PhoneTab }>(() => ({ tab: 'main' }))

export function goBridge(): void {
  usePhoneTab.setState({ tab: 'main' })
  navigate({ page: 'bridge' })
}

function SyncPill() {
  const sync = usePhone((s) => s.sync)
  const text =
    sync.state === 'syncing'
      ? 'synchronizacja…'
      : sync.state === 'offline'
        ? `offline${sync.pending ? ` · ${sync.pending} czeka` : ''}`
        : sync.state === 'auth'
          ? 'zaloguj ponownie'
          : sync.state === 'error'
            ? 'błąd synchronizacji'
            : sync.pending
              ? `${sync.pending} do wysłania`
              : 'zsynchronizowano'
  const tone = sync.state === 'error' || sync.state === 'auth' ? 'text-down border-down/40' : sync.state === 'offline' || sync.pending ? 'text-accent border-accent/40' : 'text-muted border-line-strong'
  return (
    <button className={cx('h-[24px] shrink-0 border px-2 text-[11px]', tone)} onClick={() => usePhoneTab.setState({ tab: 'settings' })} data-testid="phone-sync" data-state={sync.state} data-pending={sync.pending}>
      {text}
    </button>
  )
}

function TopBar() {
  const shipName = useData((s) => s.fi?.settings.shipName ?? '')
  const conflicts = useData((s) => s.conflicts.length)
  const hidden = useMachine((s) => s.prefs.hideAmounts)
  return (
    <header className="phone-top flex shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[13px] font-semibold text-fg-strong">Financial Intel</span>
        <span className="truncate text-[11px] text-muted" data-testid="phone-ship">
          okręt <span className="text-accent">{shipName}</span>
          {conflicts > 0 && <span className="text-down"> · konflikty: {conflicts}</span>}
        </span>
      </div>
      <SyncPill />
      <button className={cx('h-[28px] w-[34px] border text-[12px]', hidden ? 'border-accent text-accent' : 'border-line-strong text-muted')} onClick={() => toggleHideAmounts()} title="Ukryj kwoty" data-testid="phone-hide-amounts" aria-pressed={hidden}>
        {hidden ? '•••' : 'zł'}
      </button>
    </header>
  )
}

function NavButton({ active, onClick, label, icon, testId }: { active: boolean; onClick: () => void; label: string; icon: ReactNode; testId: string }) {
  return (
    <button className={cx('flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]', active ? 'text-accent' : 'text-muted')} onClick={onClick} data-testid={testId} aria-current={active ? 'page' : undefined}>
      {icon}
      {label}
    </button>
  )
}

function BottomNav({ tab, page }: { tab: PhoneTab; page: string }) {
  const bridge = PAGES.find((p) => p.page === 'bridge')
  return (
    <nav className="phone-bottom flex shrink-0 items-stretch border-t border-line bg-panel" data-testid="phone-nav">
      <NavButton active={tab === 'main' && page === 'bridge'} onClick={goBridge} label="Mostek" icon={bridge?.icon(18)} testId="phone-nav-bridge" />
      <button className="mx-2 my-1.5 flex flex-[1.2] items-center justify-center bg-accent text-[13px] font-medium text-bg" onClick={() => void api.quickOpen()} data-testid="phone-nav-quick">
        + Szybki wpis
      </button>
      <NavButton active={tab === 'settings'} onClick={() => usePhoneTab.setState({ tab: 'settings' })} label="Telefon" icon={<IconGear size={18} />} testId="phone-nav-settings" />
    </nav>
  )
}

/** A screen of the computers the phone does not have yet: said, with the way back. */
function NotOnPhone({ page }: { page: string }) {
  const def = PAGES.find((p) => p.page === page)
  const name = def?.label ?? (page === 'inbox' ? 'Meldunki' : page === 'sync' ? 'Synchronizacja' : page === 'settings' ? 'Ustawienia' : page)
  return (
    <div className="flex flex-col items-start gap-3 p-4 text-[13px]" data-testid="phone-not-here" data-page={page}>
      <p className="text-fg">
        Ekran „{name}” jest na razie tylko na komputerze – na telefonie dochodzi w kolejnych wersjach.
      </p>
      <button className="btn h-[40px] px-4 text-[13px]" onClick={goBridge}>
        Wróć na Mostek
      </button>
    </div>
  )
}

/** The quick entry: the computers' window as a sheet over everything (one window – `host.ts`). */
function QuickSheet() {
  const [open, setOpen] = useState(false)
  useEffect(() => phoneHost().quickSheet.on(setOpen), [])
  return (
    <div className={cx('phone-sheet fixed inset-0 z-50 bg-bg', !open && 'hidden')} data-testid="phone-quick-sheet" data-open={open ? '1' : undefined}>
      <QuickApp />
    </div>
  )
}

export function Shell() {
  const phase = useData((s) => s.phase)
  const message = useData((s) => s.setupMessage)
  const route = useUi((s) => s.route)
  const tab = usePhoneTab((s) => s.tab)
  // The hidden amounts (D30): every amount of the tree renders masked.
  const hideAmounts = useMachine((s) => s.prefs.hideAmounts)
  setAmountsHidden(hideAmounts)
  useEffect(() => {
    void boot()
    initIctj()
    initQuickHost()
    initPresence()
    initNotifier()
  }, [])
  const screen =
    phase === 'boot' ? (
      <div className="p-4 text-[13px] text-muted">Wczytywanie folderu…</div>
    ) : phase === 'setup' ? (
      <div className="p-4 text-[13px] text-down" data-testid="phone-setup">
        {message ?? 'Folder danych nie jest gotowy.'}
      </div>
    ) : tab === 'settings' ? (
      <PhoneSettings />
    ) : route.page === 'bridge' ? (
      <PhoneBridge />
    ) : (
      <NotOnPhone page={route.page} />
    )
  return (
    <CompactContext.Provider value>
      <div className="phone-safe flex h-full flex-col bg-bg" data-amounts={hideAmounts ? 'hidden' : 'shown'} data-testid="phone-shell">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" key={tab === 'settings' ? 'settings' : route.page}>
          {screen}
        </main>
        <BottomNav tab={tab} page={route.page} />
        <QuickSheet />
        <RemoteChangesDialog />
        <Toasts />
        {phase === 'ready' && <NoticePlanner />}
      </div>
    </CompactContext.Provider>
  )
}
