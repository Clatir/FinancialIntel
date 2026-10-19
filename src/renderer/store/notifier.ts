/**
 * The notifications of this computer (`shared/notify.ts`): checked every minute and when the window opens, each shown
 * once (remembered in localStorage), clicking leads to its screen. Only the main window runs it.
 */
import { openWatchReport } from '../features/reports/state'
import { warsawNow } from '@shared/calc/dates'
import { categoryIndex } from '@shared/calc/operations'
import { dueNotices, type Notice } from '@shared/notify'
import { noNarrowing } from '@shared/operationsView'
import { confirmationsOf } from '@shared/calc/briefing'
import { api } from '../lib/api'
import { playSound } from '../lib/sounds'
import { countLabel, plural } from '../lib/format'
import { plnText } from '../components/fields'
import { listOf, useData } from './data'
import { fleetNow } from './fleet'
import { useMachine } from './machine'
import { navigate } from './ui'
import { useIctj } from './ictj'
import { usePresence } from './presence'
import { showFilter } from '../features/operations/state'
import { deliveriesNow, openDockingTag } from '../features/dock/state'
import { cargoStatusesNow } from '../features/cargo/status'
import { confirmNoSpend, eveningNow, snoozeEvening } from '../features/evening/state'

const SENT_KEY = 'fi.notify.sent'

function sent(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function remember(keys: string[], today: string): void {
  const all = sent()
  for (const k of keys) all[k] = today
  // Keys of the last 60 days are enough (the monthly ones once a month).
  const cut = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10)
  for (const [k, d] of Object.entries(all)) if (d < cut) delete all[k]
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(all))
  } catch {
    /* storage unavailable: the notifications may repeat */
  }
}

/** The moment a notification's click led somewhere: the window shown for it keeps that screen (not the bridge). */
let clickedAt = 0
const CLICK_KEEPS_MS = 5000

/** Where a notification's click (or the tray's „Raport wachty dnia” – 'today') leads. */
export function openTag(tag: string): void {
  // The evening report's answers from the tray's menu (F13): done here, the window stays where it is.
  if (tag === 'evening:nospend' || tag === 'evening:snooze') {
    const ok = tag === 'evening:nospend' ? confirmNoSpend() : (snoozeEvening(), true)
    // The window hidden: the answer as a notification (its toast is not seen).
    if (document.visibilityState !== 'visible')
      void api.notify({ title: 'Raport wachty dnia', body: !ok ? 'Nie zapisano – otwórz okno aplikacji.' : tag === 'evening:nospend' ? 'Dziś bez wydatków – zapisane.' : 'Przypomnę za 30 minut.', tag: 'evening', silent: true })
    return
  }
  clickedAt = Date.now()
  const today = warsawNow().date
  if (tag === 'today' || tag === 'evening') {
    showFilter({ period: { kind: 'range', from: today, to: today }, ...noNarrowing() })
    navigate({ page: 'operations' })
  } else if (tag === 'asteroid' || tag === 'cargo') navigate({ page: 'cargo' })
  else if (tag === 'import') navigate({ page: 'import' })
  else if (tag === 'balances') navigate({ page: 'settings', tab: 'accounts' })
  else if (tag === 'backups') navigate({ page: 'settings', tab: 'folder' })
  else if (tag === 'update') navigate({ page: 'settings', tab: 'updates' })
  else if (tag === 'debriefing' || tag === 'low' || tag === 'overrun') navigate({ page: 'month' })
  else if (tag === 'radar') navigate({ page: 'radar' })
  else if (tag === 'reports') openWatchReport()
  else {
    navigate({ page: 'bridge' })
    if (tag === 'dock' || tag.startsWith('dock:')) openDockingTag(tag)
  }
}

/** Several new payouts at once (the folder chosen for the first time): one notification for them. */
const DOCK_GROUP = 3

function check(opened: boolean, shown = false): void {
  const s = useData.getState()
  if (!s.fi || s.phase !== 'ready') return
  const fleet = fleetNow()
  if (!fleet) return
  const fi = s.fi
  const cats = categoryIndex(fi.settings.categories)
  const containers = Object.values(s.records.containers).map((e) => e.record)
  const { time } = warsawNow()
  const prefs = useMachine.getState().prefs
  const notices = dueNotices({
    fleet,
    containers,
    imports: fi.settings.accounts.filter((a) => !a.archived && a.importFormat === 'mbank').map((a) => ({ name: a.name, last: fi.settings.import.lastImport[a.id] ?? null })),
    confirmations: confirmationsOf(fi.settings.accounts, listOf(s.records.balances)),
    label: (id) => containers.find((c) => c.id === id)?.name ?? cats.label(id),
    prefs: prefs.notify,
    quietHours: fi.settings.orders.quietHours,
    time,
    opened,
    // The hidden amounts (Ctrl+$) stay hidden in the notifications too.
    money: (g) => `${plnText(g)} zł`,
    deliveries: deliveriesNow(),
    ictjProblem: null,
    members: fi.settings.household.members,
    cargo: cargoStatusesNow(),
    evening: eveningNow(),
    seriousPct: fi.settings.game.seriousEnvelopePct
  })
  const already = sent()
  const fresh: Notice[] = notices.filter((n) => !already[n.key])
  if (!fresh.length) return
  remember(
    fresh.map((n) => n.key),
    fleet.today
  )
  // Another computer in use, this one not (D86): the notices are that one's – kept here as shown, never twice. The
  // window opened or touched just now is in use whatever main said a moment ago.
  const elsewhere = (s.status?.otherMachines ?? []).some((m) => m.inUse)
  if (elsewhere && !opened && !usePresence.getState().inUse) return
  const docks = fresh.filter((n) => n.tag === 'dock')
  const toasts = docks.length >= DOCK_GROUP ? [...fresh.filter((n) => n.tag !== 'dock'), { key: 'dock:group', tag: 'dock' as const, title: 'Nowe wypłaty w ICTTJ do zadokowania', body: `${countLabel(docks.length, 'wpis', 'wpisy', 'wpisów')} ${plural(docks.length, 'czeka', 'czekają', 'czeka')} na dokowanie (Mostek).` }] : fresh
  // Silent toasts: the app's own sounds (switches and volume of this computer) are the only ones – the alarm's here.
  for (const n of toasts) void api.notify({ title: n.title, body: n.body, tag: n.target ?? n.tag, silent: true })
  if (fresh.some((n) => n.alarm)) playSound('alarm')
  // The window brought back from the tray for the morning briefing: the bridge (a fresh start opens there anyway) –
  // unless a notification's click brought it back to its own screen.
  if (shown && fresh.some((n) => n.tag === 'briefing') && Date.now() - clickedAt > CLICK_KEEPS_MS) navigate({ page: 'bridge' })
}

let started = false

export function initNotifier(): void {
  if (started) return
  started = true
  api.onNotificationClick(openTag)
  // The window shown (from the tray, at the start): the morning briefing's moment.
  let wasVisible = document.visibilityState === 'visible'
  document.addEventListener('visibilitychange', () => {
    const visible = document.visibilityState === 'visible'
    if (visible && !wasVisible) check(true, true)
    wasVisible = visible
  })
  // The window left on screen through the night (or started during the quiet hours) is never shown again: the first
  // touch of it after the quiet hours is the morning's opening.
  let touchedAt = 0
  const touched = () => {
    const now = Date.now()
    if (now - touchedAt < 30_000 || document.visibilityState !== 'visible') return
    touchedAt = now
    check(true)
  }
  for (const ev of ['pointerdown', 'pointermove', 'keydown'] as const) window.addEventListener(ev, touched, { capture: true, passive: true })
  setInterval(() => check(false), 60_000)
  // A new payout in ICTTJ: at once (the folder's watcher), not at the next minute.
  useIctj.subscribe((st, prev) => {
    if (st.snap !== prev.snap) setTimeout(() => check(false), 500)
  })
  // After the folder loads: a first look (and the briefing when the window is on screen).
  const unsub = useData.subscribe((s) => {
    if (s.phase !== 'ready') return
    unsub()
    setTimeout(() => check(document.visibilityState === 'visible'), 1500)
  })
}
