/**
 * The phone's window (T307, IP0.3, IP1, IP2): the bar with the ship and the sync, the screen, the menu at the bottom and
 * the quick entry as a sheet over everything. The screens are the computers' renderer (the same stores, the same
 * numbers) in one column; what the phone does not have yet says so.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { boot, useData } from '@renderer/store/data'
import { commitActiveField, navigate, useUi } from '@renderer/store/ui'
import { selectOperation } from '@renderer/features/operations/state'
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
import { IconGear, IconInbox } from '@renderer/components/icons'
import { api } from '@renderer/lib/api'
import { usePhone } from '../phone'
import { phoneHost } from '../hostRef'
import { PhoneBridge } from './PhoneBridge'
import { PhoneSettings } from './PhoneSettings'
import { PhoneOperations } from './PhoneOperations'
import { PhoneInbox, PhoneInboxWatcher, usePhoneInbox } from './PhoneInbox'
import { PhoneMonth, PhoneRadar } from './PhonePreview'
import { NoticePlanner, installPlannedDue } from './notices'

type PhoneTab = 'main' | 'more' | 'settings'
export const usePhoneTab = create<{ tab: PhoneTab }>(() => ({ tab: 'main' }))

/** The screens the phone has (the rest says it is on a computer). */
type PhonePage = 'bridge' | 'operations' | 'inbox' | 'month' | 'radar'

/** Another tab: the field being typed in saves first (the screen goes without a blur). */
export function setPhoneTab(tab: PhoneTab): void {
  commitActiveField()
  usePhoneTab.setState({ tab })
}

export function goPage(page: PhonePage): void {
  commitActiveField()
  // „Operacje” from the menu: the list (an open operation closed, an untouched new one dropped).
  if (page === 'operations') selectOperation(null)
  usePhoneTab.setState({ tab: 'main' })
  navigate({ page })
}

export const goBridge = (): void => goPage('bridge')

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
    <button className={cx('h-[24px] shrink-0 border px-2 text-[11px]', tone)} onClick={() => setPhoneTab('settings')} data-testid="phone-sync" data-state={sync.state} data-pending={sync.pending}>
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

function NavButton({ active, onClick, label, icon, testId, badge = 0 }: { active: boolean; onClick: () => void; label: string; icon: ReactNode; testId: string; badge?: number }) {
  return (
    <button className={cx('relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]', active ? 'text-accent' : 'text-muted')} onClick={onClick} data-testid={testId} data-badge={badge || undefined} aria-current={active ? 'page' : undefined}>
      {icon}
      {label}
      {badge > 0 && <span className="num absolute top-[5px] left-[calc(50%+6px)] min-w-[16px] bg-accent px-1 text-center text-[10px] leading-[16px] text-bg">{badge > 99 ? '99+' : badge}</span>}
    </button>
  )
}

const icon = (page: string) => PAGES.find((p) => p.page === page)?.icon(18)

function BottomNav({ tab, page }: { tab: PhoneTab; page: string }) {
  const reports = usePhoneInbox((s) => s.items.length)
  const more = tab !== 'main' || page === 'month' || page === 'radar'
  return (
    <nav className="phone-bottom flex shrink-0 items-stretch border-t border-line bg-panel" data-testid="phone-nav">
      <NavButton active={tab === 'main' && page === 'bridge'} onClick={goBridge} label="Mostek" icon={icon('bridge')} testId="phone-nav-bridge" />
      <NavButton active={tab === 'main' && page === 'operations'} onClick={() => goPage('operations')} label="Operacje" icon={icon('operations')} testId="phone-nav-operations" />
      <button className="mx-1 my-1.5 flex w-[64px] shrink-0 flex-col items-center justify-center bg-accent text-bg" onClick={() => void api.quickOpen()} aria-label="Szybki wpis" data-testid="phone-nav-quick">
        <span className="text-[20px] leading-none">+</span>
        <span className="text-[10.5px] font-medium">Wpis</span>
      </button>
      <NavButton active={tab === 'main' && page === 'inbox'} onClick={() => goPage('inbox')} label="Meldunki" icon={<IconInbox size={18} />} badge={reports} testId="phone-nav-inbox" />
      <NavButton active={more} onClick={() => setPhoneTab('more')} label="Więcej" icon={<span className="text-[20px] leading-[18px] tracking-[1px]">⋯</span>} testId="phone-nav-more" />
    </nav>
  )
}

function MoreItem({ onClick, label, sub, glyph, testId }: { onClick: () => void; label: string; sub: string; glyph: ReactNode; testId: string }) {
  return (
    <button className="flex min-h-[56px] w-full items-center gap-3 border-b border-line px-4 text-left active:bg-hover" onClick={onClick} data-testid={testId}>
      <span className="text-muted">{glyph}</span>
      <span className="flex flex-col">
        <span className="text-[14px] text-fg-strong">{label}</span>
        <span className="text-[11.5px] text-muted">{sub}</span>
      </span>
    </button>
  )
}

/** „Więcej”: the plan and the radar (previews), this phone's settings. */
function MoreScreen() {
  return (
    <div className="flex flex-col" data-testid="phone-more">
      <MoreItem onClick={() => goPage('month')} label="Plan miesiąca" sub="pensja, koperty, debriefing – podgląd" glyph={icon('month')} testId="phone-more-month" />
      <MoreItem onClick={() => goPage('radar')} label="Radar" sub="90 dni, pożyczki, boje – podgląd" glyph={icon('radar')} testId="phone-more-radar" />
      <MoreItem onClick={() => setPhoneTab('settings')} label="Telefon" sub="synchronizacja, konto, powiadomienia" glyph={<IconGear size={18} />} testId="phone-nav-settings" />
    </div>
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
  // A screen opened from elsewhere (a notification's tap, a link): shown, also over the phone's settings. Operacje left:
  // no operation open there next time (an untouched new one dropped – as on a computer).
  useEffect(
    () =>
      useUi.subscribe((s, prev) => {
        if (s.route === prev.route) return
        usePhoneTab.setState({ tab: 'main' })
        if (prev.route.page === 'operations' && s.route.page !== 'operations') selectOperation(null)
      }),
    []
  )
  useEffect(() => {
    void boot()
    initIctj()
    initQuickHost()
    initPresence()
    // What iOS shows by the plan is not shown again by the notifier: marked before it looks.
    installPlannedDue()
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
    ) : tab === 'more' ? (
      <MoreScreen />
    ) : route.page === 'bridge' ? (
      <PhoneBridge />
    ) : route.page === 'operations' ? (
      <PhoneOperations />
    ) : route.page === 'inbox' ? (
      <PhoneInbox />
    ) : route.page === 'month' ? (
      <PhoneMonth />
    ) : route.page === 'radar' ? (
      <PhoneRadar />
    ) : (
      <NotOnPhone page={route.page} />
    )
  return (
    <CompactContext.Provider value>
      <div className="phone-safe flex h-full flex-col bg-bg" data-amounts={hideAmounts ? 'hidden' : 'shown'} data-testid="phone-shell">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" key={tab === 'main' ? route.page : tab}>
          {screen}
        </main>
        <BottomNav tab={tab} page={route.page} />
        <QuickSheet />
        <RemoteChangesDialog />
        <Toasts />
        {phase === 'ready' && <NoticePlanner />}
        {phase === 'ready' && <PhoneInboxWatcher />}
      </div>
    </CompactContext.Provider>
  )
}
