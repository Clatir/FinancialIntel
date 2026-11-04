import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useShallow } from 'zustand/shallow'
import { arrangeBriefing, BIAS_LABEL, briefing, briefingSpeech, confirmationsOf, dailyBias, silverBullet, topAlarm, type BriefingItem, type BriefingRow } from '@shared/calc/briefing'
import { daysBetween, isoWeekOf } from '@shared/calc/dates'
import { financersText, memberName, payerOf } from '@shared/calc/household'
import { missionText, missionTitle } from '@shared/calc/game'
import { HULL_TOLERANCE_PCT, hullCountsFull, SHIP_CLASS_LABEL, type FleetState } from '@shared/calc/fleet'
import { sum } from '@shared/calc/operations'
import { amountTone, newestOperations, noNarrowing } from '@shared/operationsView'
import { shortcutLabel } from '@shared/machine'
import { plural, rangeText } from '@shared/format'
import type { DetachEvent } from '@shared/api'
import { useData, useFolderLocked } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useMachine } from '../../store/machine'
import { useHostedDetach, useDetach, type DetachSpec } from '../../store/detach'
import { useRecordList } from '../../store/records'
import { focusRecord, navigate } from '../../store/ui'
import { openBankFile, useNewBankFiles } from '../../store/bankFiles'
import { api } from '../../lib/api'
import { AMOUNT_MASK, amountsHidden, plnText, signedPln } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Columns } from '../../components/layout'
import { Badge, Empty, Panel, cx } from '../../components/ui'
import { countLabel, dayLabel, plDate } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { newOperation, openOperation, openRefundables, selectOperation, showFilter } from '../operations/state'
import { EnvelopeBars, monthElapsed } from '../month/EnvelopeBars'
import { IncomePanel } from '../month/IncomePanel'
import { topUpHull } from '../month/actions'
import { startWizard } from '../wizard/state'
import { DockPanel } from '../dock/DockPanel'
import { openDocking, useDeliveries } from '../dock/state'
import { useCargoDays, useCargoStatuses, useCargoWatch } from '../cargo/status'
import { openSensor } from '../sensors/open'
import { useAnomalies, useReturns } from '../sensors/state'
import { useFuture } from '../radar/future'
import { useIctj } from '../../store/ictj'
import { useGameRecords } from '../../store/game'
import { useMembers } from '../household/actions'
import { WealthChart } from '../intel/charts'
import { useWealth } from '../intel/wealth'
import { CAP_REASON, capNote, deliveryWhy, energyWhy, rangeWhy, targetsWhy, type WhyLine } from '@shared/calc/why'
import { glossaryOf } from '@shared/glossary'

const zl = (grosze: number) => `${plnText(grosze)} zł`
// Cut down (N56): never the threshold of a class the ship has not reached.
const fmtRange = rangeText

/** What the bridge's panels draw – in the main window and in their own windows (D45) alike, as plain JSON. */
export type BridgeFleet = Pick<
  FleetState,
  'today' | 'month' | 'plan' | 'started' | 'total' | 'shields' | 'hull' | 'goals' | 'energy' | 'tanks' | 'taxHold' | 'deposit' | 'toDock' | 'loot' | 'costs' | 'range' | 'shipClass' | 'cargo' | 'envelopes' | 'daily' | 'debt'
> & {
  /** „Skąd ta liczba?” (F29): the layers' targets as set and the last delivery's split (`pending` – not docked yet, AP-12). */
  layers: { shieldSalaries: number; hullMonths: number }
  lastDelivery: { date: string; pending: boolean; lines: WhyLine[] } | null
  /** The firewall order on (D23): off – the top-ups of XTB go unchecked, the ship's state says so (AP-17, DW.12). */
  firewall: boolean
}

const DEFAULT_LAYERS = { shieldSalaries: 3, hullMonths: 6 }

export const bridgeFleet = (f: FleetState, layers: { shieldSalaries: number; hullMonths: number } = DEFAULT_LAYERS, firewall = true): BridgeFleet => ({
  month: f.month,
  plan: f.plan,
  layers: { shieldSalaries: layers.shieldSalaries, hullMonths: layers.hullMonths },
  firewall,
  lastDelivery: deliveryWhy(f.log, (id) => f.goals.find((g) => g.id === id)?.name ?? 'cel'),
  today: f.today,
  started: f.started,
  total: f.total,
  shields: f.shields,
  hull: f.hull,
  goals: f.goals,
  energy: f.energy,
  tanks: f.tanks,
  taxHold: f.taxHold,
  deposit: f.deposit,
  toDock: f.toDock,
  loot: f.loot,
  costs: f.costs,
  range: f.range,
  shipClass: f.shipClass,
  cargo: f.cargo,
  envelopes: f.envelopes,
  daily: f.daily,
  debt: f.debt
})

/** A detached panel of the bridge (`features/detach/DetachedApp.tsx`). */
export type BridgeDetachProps =
  | { panel: 'briefing'; fleet: BridgeFleet; items: BriefingItem[] }
  | { panel: 'state'; fleet: BridgeFleet }
  | { panel: 'envelopes'; rows: BridgeFleet['envelopes']; labels: Record<string, string>; elapsed?: number }

/** Where a click on the bridge leads: a briefing line (by its kind; its key names a delivery) or the cargo's mass. */
type BridgeTarget = BriefingItem['kind'] | 'cargo' | 'inbox'

function openTarget(t: BridgeTarget, key?: string): void {
  if (t === 'asteroid' || t === 'cargo') navigate({ page: 'cargo' })
  // A new file of mBank (F14): opened in Import at once.
  else if (t === 'import' && key?.startsWith('bankfile:')) void openBankFile(key.split(':')[1]!)
  else if (t === 'import') navigate({ page: 'import' })
  else if (t === 'balances') navigate({ page: 'settings', tab: 'accounts' })
  else if (t === 'start') startWizard()
  else if (t === 'dock') {
    navigate({ page: 'bridge' })
    if (key?.startsWith('dock:')) openDocking(key.slice('dock:'.length))
  } else if (t === 'ictj') navigate({ page: 'settings', tab: 'ictj' })
  else if (t === 'loan' || t === 'pit38' || t === 'plan' || t === 'account') navigate({ page: 'radar' })
  else if (t === 'end' || t === 'recurring') navigate({ page: 'cargo' })
  // An unknown signal, a return late (F31, F34): their operation.
  else if (t === 'anomaly' || t === 'return') openSensor(key)
  // A container's new price or its quiet (F9): that container (its id is the key's second part).
  else if (t === 'price' || t === 'dead') {
    const id = key?.split(':')[1]
    if (id) focusRecord('container', id, { page: 'cargo' })
    else navigate({ page: 'cargo' })
  }
  else if (t === 'house') openRefundables()
  else if (t === 'mission') navigate({ page: 'command' })
  else if (t === 'alarm') openAlarm(key)
  // The matters older than 30 days (AP-16): only in Meldunki.
  else if (t === 'inbox') navigate({ page: 'inbox' })
  else navigate({ page: 'month' })
}

/**
 * An alarm of the briefing opens where it is decided (N28) – its kind and operation are in its key
 * (`alarm:<kind>:<ref>[:<txId>]:<month>`): the cargo's mass and a tank short → Ładownia, a correction or a top-up of XTB
 * against the firewall → that operation, the envelopes, the salary, the shields and the energy → Plan miesiąca.
 */
function openAlarm(key: string | undefined): void {
  const parts = key?.split(':') ?? []
  const kind = parts[1]
  const txId = parts.length === 5 ? parts[3] : undefined
  if (kind === 'cargo-over' || kind === 'sinking-short') return navigate({ page: 'cargo' })
  if (kind === 'correction' || kind === 'firewall') {
    const tx = txId ? useData.getState().records.transactions[txId]?.record : undefined
    if (tx) return openOperation(tx)
    return navigate({ page: 'operations' })
  }
  navigate({ page: 'month' })
}

/** A click in a detached panel: the main window goes there. */
const onBridgeEvent = (e: DetachEvent) => {
  if (e.type === 'open' && typeof e.target === 'string') openTarget(e.target as BridgeTarget, typeof e.key === 'string' ? e.key : undefined)
}
const emitTarget = (target: BridgeTarget, key?: string) => void api.detachEmit({ type: 'open', target, ...(key ? { key } : {}) })

type BridgePanel = BridgeDetachProps['panel']
/** The bridge's panels that open in their own window, by their name (the panel's key is `bridge:<name>`). */
const DETACHED_PANELS: Record<string, BridgePanel> = { Odprawa: 'briefing', 'Stan okrętu': 'state', Koperty: 'envelopes' }

/**
 * The detached panels' specs, one for the page and the host (B27): their data and clicks are served by
 * `BridgeDetachHost` – the panels on the bridge only open and close the windows.
 */
function useBridgeSpecs(fleet: FleetState | null, items: BriefingItem[]): Record<BridgePanel, DetachSpec> | null {
  const cats = useCategories()
  const layers = useData((s) => s.fi?.settings.layers)
  const firewall = useData((s) => s.fi?.settings.orders.firewall ?? true)
  const view = useMemo(() => (fleet ? bridgeFleet(fleet, layers, firewall) : null), [fleet, layers, firewall])
  const labels = useMemo(() => Object.fromEntries((fleet?.envelopes ?? []).map((e) => [e.categoryId, cats.label(e.categoryId)])), [fleet, cats])
  return useMemo(() => {
    if (!view) return null
    const spec = (title: string, props: BridgeDetachProps): DetachSpec => ({ kind: 'bridge', title, props, onEvent: onBridgeEvent, hosted: true })
    return {
      briefing: spec(`Odprawa – ${dayLabel(view.today)}`, { panel: 'briefing', fleet: view, items }),
      state: spec('Stan okrętu', { panel: 'state', fleet: view }),
      envelopes: spec('Koperty', { panel: 'envelopes', rows: view.envelopes, labels, elapsed: monthElapsed(view.today) })
    }
  }, [view, items, labels])
}

/**
 * The bridge's detached windows (D45, B27), in the main window whatever page it shows: their data follows every
 * change (also after midnight) and every click leads the main window – the bridge may be long left.
 */
export function BridgeDetachHost() {
  const keys = useDetach(useShallow((s) => Object.keys(s.open).filter((k) => k.startsWith('bridge:'))))
  return keys.length ? <BridgeDetachSender keys={keys} /> : null
}

function BridgeDetachSender({ keys }: { keys: string[] }) {
  const fleet = useFleet()
  const items = useBriefingItems(fleet)
  const specs = useBridgeSpecs(fleet, items)
  return (
    <>
      {keys.map((k) => {
        const panel = DETACHED_PANELS[k.slice('bridge:'.length)]
        return panel ? <HostedPanel key={k} panelKey={k} spec={specs?.[panel] ?? null} /> : null
      })}
    </>
  )
}

function HostedPanel({ panelKey, spec }: { panelKey: string; spec: DetachSpec | null }) {
  useHostedDetach(panelKey, spec ? { kind: spec.kind, title: spec.title ?? '', props: spec.props } : null, onBridgeEvent)
  return null
}

/** Is there a Polish voice of the system (T7)? null = the voices are not listed yet (Chromium lists them a moment later). */
function polishVoiceNow(): boolean | null {
  const synth = window.speechSynthesis
  if (!synth) return false
  const voices = synth.getVoices()
  return voices.length ? voices.some((v) => v.lang.toLowerCase().startsWith('pl')) : null
}

/** The Polish voice of the system, followed as the system lists its voices; none after 2 s = none at all. */
function usePolishVoice(): boolean | null {
  const [has, setHas] = useState<boolean | null>(polishVoiceNow)
  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) return
    const update = () => {
      const now = polishVoiceNow()
      if (now != null) setHas(now)
    }
    synth.addEventListener('voiceschanged', update)
    update()
    // A system without any voice may never send the event.
    const timer = setTimeout(() => setHas((h) => h ?? false), 2000)
    return () => {
      synth.removeEventListener('voiceschanged', update)
      clearTimeout(timer)
    }
  }, [])
  return has
}

/** The briefing read aloud with a Polish voice of the system (D49), when the system has one. */
function speak(text: string): boolean {
  const synth = window.speechSynthesis
  if (!synth) return false
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'pl-PL'
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('pl'))
  if (voice) u.voice = voice
  synth.speak(u)
  return true
}

/** The weeks of the wealth curve on the bridge (N58): half a year – the whole history, the structure and the drawdown in Wywiad. */
const BRIDGE_WEEKS = 26

/** The wealth curve's last half-year (N58, spec „Ekrany”): the money on the budget's accounts at each week's end. */
function BridgeWealth({ today }: { today: string }) {
  return (
    <Panel
      title="Krzywa majątku"
      testId="bridge-wealth"
      actions={
        <button className="text-[11px] text-muted hover:text-fg-strong" onClick={() => navigate({ page: 'intel' })} title="Cała historia, struktura i drawdown – Wywiad (Ctrl+9)" data-testid="bridge-wealth-open">
          Wywiad →
        </button>
      }
    >
      <BridgeWealthChart today={today} />
    </Panel>
  )
}

/** The panel's content – computed only while it is shown (a collapsed or hidden panel renders nothing inside). */
function BridgeWealthChart({ today }: { today: string }) {
  const wealth = useWealth(today)
  const shown = useMemo(() => {
    const points = wealth.points.slice(-(BRIDGE_WEEKS + 1))
    const from = points[0]?.date ?? ''
    // The structure of the whole history – a break is the same break on the shorter chart.
    return { points, marks: wealth.marks.filter((m) => m.date >= from) }
  }, [wealth])
  const last = shown.points.at(-1)
  if (shown.points.length < 2 || !last) return <Empty>Za mało danych – krzywa pojawi się po dwóch tygodniach historii.</Empty>
  return (
    <div className="flex flex-col gap-1.5 text-[12px]">
      <span className="text-muted">
        Na kontach budżetu <span className="num text-fg-strong">{zl(last.value)}</span> · ostatnie {BRIDGE_WEEKS} tygodni, koniec każdego tygodnia
      </span>
      <WealthChart points={shown.points} marks={shown.marks} height={170} testId="bridge-wealth-chart" />
    </div>
  )
}

/**
 * Mostek (spec, „Ekrany”): the morning briefing, the ship's state (the shields, today's energy, the hull, the range,
 * the cargo's mass, the class), the docking, the wealth curve, the envelopes, what the household owes, the income and the
 * latest operations. The metaphor always with the real name and the amount (D34).
 */
export function BridgePage() {
  const fleet = useFleet()
  const fi = useData((s) => s.fi)
  const shortcut = useMachine((s) => s.prefs.quickShortcut)
  if (!fleet || !fi) return <Empty>Wczytywanie…</Empty>
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-bridge">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Mostek</h1>
        <span className="text-[12px] text-muted" data-testid="ship-name">
          okręt <span className="text-accent">{fi.settings.shipName}</span>
        </span>
        {fleet.shipClass && (
          <Badge tone="accent" title={`Klasa według zasięgu: ${fmtRange(fleet.range)}`} data-testid="ship-class">
            {SHIP_CLASS_LABEL[fleet.shipClass]}
          </Badge>
        )}
        <span className="flex-1" />
        <button className="btn h-[26px]" onClick={() => void newOperation()} title="Nowa operacja (Ctrl+N)">
          Nowa operacja
        </button>
        <button className="btn btn-accent h-[26px]" onClick={() => void api.quickOpen()} title="Szybki wpis – okno nad wszystkimi" data-testid="bridge-quick">
          Szybki wpis{shortcut ? ` · ${shortcutLabel(shortcut)}` : ''}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <BridgePanels />
      </div>
    </div>
  )
}

/**
 * The bridge's panels: two columns on a computer; one on the phone (T307) – there without the docking (ICTTJ is read on
 * a computer).
 */
export function BridgePanels({ single = false }: { single?: boolean }) {
  const fleet = useFleet()
  const fi = useData((s) => s.fi)
  const transactions = useRecordList('transactions')
  const cats = useCategories()
  const members = useMembers()
  const items = useBriefingItems(fleet)
  const layers = useData((s) => s.fi?.settings.layers)
  const firewall = useData((s) => s.fi?.settings.orders.firewall ?? true)
  const view = useMemo(() => (fleet ? bridgeFleet(fleet, layers, firewall) : null), [fleet, layers, firewall])
  const specs = useBridgeSpecs(fleet, items)
  const readOnly = useFolderLocked()
  // The 10 newest in one pass (W29): the bridge renders every minute – never a sort of the whole history.
  const recent = useMemo(() => newestOperations(transactions, 10), [transactions])
  if (!fleet || !fi || !view || !specs) return <Empty>Wczytywanie…</Empty>
  // A household member's purchase or money (D80) says whose it is instead of the category.
  const noteOf = (t: (typeof recent)[number]): string => {
    const financed = financersText(t, members)
    if (financed) return `finansuje: ${financed}`
    const payer = payerOf(t)
    if (payer) return `od: ${memberName(payer, members)}`
    return t.categoryId ? cats.label(t.categoryId) : ''
  }
  const briefingPanel = <BriefingPanel fleet={view} items={items} detach={specs.briefing} />
  const statePanel = fleet.started && (
    <Panel title="Stan okrętu" testId="bridge-state" detach={specs.state}>
      {/* „Dopełnij kadłub z osłon” (AP-17) only here – a detached window leads the main one, it writes nothing. */}
      <ShipState fleet={view} onOpen={openTarget} onTopUp={readOnly ? undefined : topUpHull} />
    </Panel>
  )
  const envelopesPanel = (
    <Panel title="Koperty" hint={glossaryOf('Koperty')} testId="bridge-envelopes" detach={specs.envelopes}>
      <Envelopes rows={fleet.envelopes} elapsed={monthElapsed(fleet.today)} />
    </Panel>
  )
  const recentPanel = (
    <Panel title="Ostatnie operacje" testId="bridge-recent">
      {!recent.length ? (
        <Empty>Brak operacji – szybki wpis albo import z mBanku.</Empty>
      ) : (
        <div className="flex flex-col text-[12px]">
          {recent.map((t) => {
            const tone = amountTone(t)
            return (
              <button
                key={t.id}
                className="flex items-baseline gap-2 border-b border-line/60 px-1 py-1 text-left last:border-b-0 hover:bg-hover"
                onClick={() => {
                  showFilter({ period: { kind: 'month', month: t.date.slice(0, 7) }, ...noNarrowing() })
                  navigate({ page: 'operations' })
                  selectOperation(t.id)
                }}
                data-testid="bridge-recent-row"
              >
                <span className="num w-[44px] shrink-0 text-[11px] text-muted">{plDate(t.date).slice(0, 5)}</span>
                <span className="min-w-0 flex-1 truncate text-fg-strong">{t.counterparty || t.title || '—'}</span>
                <span className={cx('truncate text-[11px] text-dim', single ? 'w-[90px]' : 'w-[130px]')}>{noteOf(t)}</span>
                <span className={cx('num text-right', single ? 'w-[86px]' : 'w-[100px]', tone === 'up' ? 'text-up' : tone === 'muted' ? 'text-muted' : tone === 'accent' ? 'text-accent' : 'text-fg')}>{signedPln(t.amount)}</span>
              </button>
            )
          })}
        </div>
      )}
    </Panel>
  )
  if (single)
    return (
      <div className="flex min-w-0 flex-col" data-testid="bridge-panels">
        {briefingPanel}
        {statePanel}
        {envelopesPanel}
        {recentPanel}
        <Receivables fleet={fleet} />
        <IncomePanel fleet={fleet} salary={fleet.plan?.salary ?? null} testId="bridge-income" />
        <BridgeWealth today={fleet.today} />
      </div>
    )
  return (
    <Columns id="bridge" tracks={['minmax(360px,1fr)', 'minmax(360px,1fr)']} className="grid min-h-full items-start">
      <div className="flex min-w-0 flex-col">
        {briefingPanel}
        {statePanel}
        {fleet.started && <DockPanel />}
        <BridgeWealth today={fleet.today} />
      </div>
      <div className="flex min-w-0 flex-col">
        {envelopesPanel}
        <Receivables fleet={fleet} />
        <IncomePanel fleet={fleet} salary={fleet.plan?.salary ?? null} testId="bridge-income" />
        {recentPanel}
      </div>
    </Columns>
  )
}

function useSpeech(fleet: BridgeFleet, items: BriefingItem[]) {
  const [spoken, setSpoken] = useState(true)
  // A short one (AP-16, T214): the energy, the Daily Bias, the most important alarm and how many more matters there are.
  const say = () => {
    const d = fleet.daily
    const view = arrangeBriefing(items, fleet.today)
    setSpoken(speak(briefingSpeech({ day: dayLabel(fleet.today), daily: d, capReason: d?.cap ? CAP_REASON[d.cap.why] : null, bias: dailyBias(fleet), view, hidden: amountsHidden(), mask: AMOUNT_MASK })))
  }
  return { spoken, say }
}

/** „Odsłuchaj” only with a Polish voice of the system (T7) – without one, how to add it (no reading in a foreign voice). */
function SpeakButton({ onClick }: { onClick: () => void }) {
  const voice = usePolishVoice()
  if (voice == null) return null
  if (!voice)
    return (
      <span className="text-[11px] text-dim" title="Ustawienia Windows → Czas i język → Mowa → Zarządzaj głosami → dodaj głos polski" data-testid="briefing-no-voice">
        Odsłuch: brak polskiego głosu systemu
      </span>
    )
  return (
    <button className="btn h-[22px]" onClick={onClick} title="Skrót odprawy głosem systemu: energia, Daily Bias i najważniejszy alarm" data-testid="briefing-speak">
      Odsłuchaj
    </button>
  )
}

function BriefingPanel({ fleet, items, detach }: { fleet: BridgeFleet; items: BriefingItem[]; detach: DetachSpec }) {
  const { spoken, say } = useSpeech(fleet, items)
  return (
    <Panel title={`Odprawa – ${dayLabel(fleet.today)}`} name="Odprawa" testId="bridge-briefing" detach={detach} actions={<SpeakButton onClick={say} />}>
      <BriefingBody fleet={fleet} items={items} spoken={spoken} onOpen={openTarget} />
    </Panel>
  )
}

function BriefingBody({ fleet, items, spoken, onOpen }: { fleet: BridgeFleet; items: BriefingItem[]; spoken: boolean; onOpen: (t: BridgeTarget, key?: string) => void }) {
  const bias = dailyBias(fleet)
  const d = fleet.daily
  const [why, setWhy] = useState(false)
  // Alarms → the day's matters → the rest folded (AP-16); the old matters only in Meldunki.
  const [all, setAll] = useState(false)
  const view = useMemo(() => arrangeBriefing(items, fleet.today), [items, fleet.today])
  const total = view.shown.length + view.rest.length
  return (
    <div className="flex flex-col gap-2 text-[12px]">
      {fleet.started && (
        <div className="flex items-baseline gap-3">
          <div className="flex flex-col">
            <span className="label">Energia dziś</span>
            <span className={cx('num text-[24px] leading-tight', d && d.energy < 0 ? 'text-down' : 'text-fg-strong')} data-testid="bridge-energy">
              {d ? zl(d.energy) : '—'}
            </span>
            {/* Less than the daily pool says (AP-13, T371): the month's energy – and why it is short. */}
            {d?.cap && (
              <span className="text-[11px] text-accent" data-testid="bridge-energy-cap" data-why={d.cap.why}>
                {capNote(d.cap, zl)}
              </span>
            )}
            {d ? (
              <button type="button" className="self-start text-[11px] text-dim hover:text-fg-strong" onClick={() => setWhy(!why)} aria-expanded={why} title={glossaryOf('Energia')} data-testid="bridge-energy-why">
                przydział {zl(d.allowance)} · podstawowy {zl(d.base)} · <span className="text-accent">{why ? 'zwiń' : 'skąd ta liczba?'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-dim">bez planu tego miesiąca</span>
            )}
          </div>
          {bias && (
            <span className={cx('ml-auto text-[13px] font-medium', bias === 'bearish' ? 'text-accent' : bias === 'bullish' ? 'text-fg-strong' : 'text-muted')} data-testid="bridge-bias" title="Daily Bias (spec, Wywiad)">
              {bias === 'bullish' ? '▲' : bias === 'bearish' ? '▼' : '◆'} {BIAS_LABEL[bias]}
            </span>
          )}
        </div>
      )}
      {fleet.started && d && why && <WhyList lines={energyWhy(d, fleet.month)} testId="bridge-energy-lines" />}
      {fleet.started && silverBullet() && <SilverBullet fleet={fleet} top={topAlarm(view)} />}
      {!fleet.started && (
        <div className="flex items-center gap-3 border border-accent/40 bg-accent-soft px-3 py-2">
          <span className="flex-1 text-fg-strong">Budżet jeszcze nie wystartował.</span>
          <button className="btn btn-accent h-[24px]" onClick={() => onOpen('start')} data-testid="bridge-wizard">
            Kreator startu
          </button>
        </div>
      )}
      <div className="flex flex-col" data-testid="briefing-items">
        {fleet.started && !total && <span className="text-muted">Bez alarmów – kurs stabilny.</span>}
        {view.shown.map((i) => (
          <BriefingLine key={i.key} row={i} onOpen={onOpen} />
        ))}
        {/* The folded rest stays in the page, hidden – „Pokaż wszystkie” only shows it. */}
        {view.rest.map((i) => (
          <BriefingLine key={i.key} row={i} onOpen={onOpen} hidden={!all} />
        ))}
        {view.rest.length > 0 && (
          <button type="button" className="self-start py-0.5 text-[11.5px] text-accent hover:underline" onClick={() => setAll(!all)} aria-expanded={all} data-testid="briefing-all" data-count={total}>
            {all ? 'Zwiń' : `Pokaż wszystkie (${total})`}
          </button>
        )}
        {fleet.started && view.older > 0 && (
          <button type="button" className="self-start py-0.5 text-[11px] text-dim hover:text-fg-strong" onClick={() => onOpen('inbox')} data-testid="briefing-older" data-count={view.older}>
            {view.older} {plural(view.older, 'sprawa starsza', 'sprawy starsze', 'spraw starszych')} niż 30 dni – w Meldunkach ›
          </button>
        )}
      </div>
      {!spoken && <span className="text-[11px] text-dim">Brak głosu systemu do odsłuchu.</span>}
    </div>
  )
}

/** A line of the briefing (AP-16): its level's mark; the same matter's other lines under it. */
function BriefingLine({ row, onOpen, hidden = false }: { row: BriefingRow; onOpen: (t: BridgeTarget, key?: string) => void; hidden?: boolean }) {
  if (row.kind === 'start') return null
  return (
    <button
      className={cx(hidden ? 'hidden' : 'flex', 'items-start gap-2 py-0.5 text-left hover:text-fg-strong')}
      onClick={() => onOpen(row.kind, row.key)}
      data-testid="briefing-item"
      data-kind={row.kind}
      data-tier={row.tier}
      data-level={row.level}
    >
      <span className={cx('mt-[5px] h-[6px] w-[6px] shrink-0', row.level === 'red' ? 'bg-down' : row.level === 'yellow' ? 'bg-accent' : 'bg-line-strong')} />
      <span className="flex min-w-0 flex-col">
        <span className={cx(row.level === 'red' ? 'text-down' : 'text-fg')}>{row.text}</span>
        {row.also.map((t) => (
          <span key={t} className="text-[11px] text-dim" data-testid="briefing-item-also">
            {t}
          </span>
        ))}
      </span>
    </button>
  )
}

/** The morning briefing's items (the bridge, the reports): the texts carry amounts – written again when they hide (Ctrl+$). */
export function useBriefingItems(fleet: FleetState | null): BriefingItem[] {
  const fi = useData((s) => s.fi)
  const containers = useRecordList('containers')
  const balances = useRecordList('balances')
  const hidden = useMachine((s) => s.prefs.hideAmounts)
  const cats = useCategories()
  const deliveries = useDeliveries()
  const ictjProblem = useIctj((s) => (s.snap.dir && s.snap.status !== 'ok' ? s.snap.message : null))
  const game = useGameRecords()
  const cargo = useCargoStatuses()
  const days = useCargoDays()
  // The cargo hold's watch (F9, F23); the new files of mBank in the downloads (F14).
  const watch = useCargoWatch()
  const bankFiles = useNewBankFiles()
  // The sensors (F31, F34): unknown signals, returns late.
  const anomalies = useAnomalies()
  const returns = useReturns()
  // The buoys' days (F16) and the accounts ahead (F26).
  const future = useFuture()
  return useMemo(() => {
    if (!fleet || !fi) return []
    const imports = fi.settings.accounts.filter((a) => !a.archived && a.importFormat === 'mbank').map((a) => ({ name: a.name, last: fi.settings.import.lastImport[a.id] ?? null }))
    const label = (id: string) => containers.find((c) => c.id === id)?.name ?? cats.label(id)
    // This week's mission of the command (E7).
    const week = isoWeekOf(fleet.today)
    const m = game.flatMap((g) => g.missions).find((x) => x.week === week)
    const mission = m ? { week, title: missionTitle(m.template), text: missionText(m, cats.label, zl) } : null
    return briefing({
      fleet,
      containers,
      imports,
      confirmations: confirmationsOf(fi.settings.accounts, balances),
      label,
      money: zl,
      deliveries,
      ictjProblem,
      mission,
      members: fi.settings.household.members,
      cargo,
      payDays: days,
      scheduled: future.reminders,
      accounts: future.accounts,
      watch,
      bankFiles,
      anomalies,
      returns,
      firewallOff: !fi.settings.orders.firewall
    })
    // `hidden`: the amounts of the texts mask on a change.
  }, [fleet, fi, containers, balances, cats, hidden, deliveries, ictjProblem, game, cargo, days, future, watch, bankFiles, anomalies, returns])
}

/** Silver Bullet (D73, ICT): opened between 10:00 and 11:00 New York time – the briefing in three sentences. */
function SilverBullet({ fleet, top }: { fleet: BridgeFleet; top: BriefingRow | null }) {
  const bias = dailyBias(fleet)
  const d = fleet.daily
  // The most important alarm – the same the spoken briefing says (AP-16).
  const first = top
  return (
    <div className="flex flex-col gap-0.5 border-l-2 border-accent pl-2 text-[11.5px]" data-testid="briefing-silver-bullet">
      <span className="label text-accent">Silver Bullet · 10:00–11:00 NY</span>
      <span>
        {d ? `Energia dziś ${zl(d.energy)}${d.cap ? ` (${CAP_REASON[d.cap.why]})` : ''}.` : 'Bez planu tego miesiąca.'} {bias ? `Daily Bias: ${BIAS_LABEL[bias]}.` : ''} {first ? first.text : 'Bez alarmów.'}
      </span>
    </div>
  )
}

function Envelopes({ rows, labels, elapsed }: { rows: BridgeFleet['envelopes']; labels?: Record<string, string>; elapsed?: number }) {
  return rows.length ? <EnvelopeBars rows={rows} labels={labels} elapsed={elapsed} /> : <Empty>Bez kopert w planie tego miesiąca.</Empty>
}

/** A bridge panel in its own window (a second monitor, D45): clicks lead the main window. */
export function BridgeDetached({ props }: { props: BridgeDetachProps }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto" data-testid="detached-bridge" data-panel-kind={props.panel}>
      {props.panel === 'briefing' && <DetachedBriefing fleet={props.fleet} items={props.items} />}
      {props.panel === 'state' && <ShipState fleet={props.fleet} onOpen={emitTarget} />}
      {props.panel === 'envelopes' && <Envelopes rows={props.rows} labels={props.labels} elapsed={props.elapsed} />}
    </div>
  )
}

function DetachedBriefing({ fleet, items }: { fleet: BridgeFleet; items: BriefingItem[] }) {
  const { spoken, say } = useSpeech(fleet, items)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <SpeakButton onClick={say} />
      </div>
      <BriefingBody fleet={fleet} items={items} spoken={spoken} onOpen={emitTarget} />
    </div>
  )
}

function Line({ metaphor, name, value, children, hint, testId }: { metaphor: string; name: string; value: ReactNode; children?: ReactNode; hint?: string; testId?: string }) {
  return (
    <div className="flex flex-col gap-0.5" data-testid={testId}>
      <div className="flex items-baseline gap-2">
        {/* The metaphor's meaning on hover (F29, the glossary). */}
        <span className={cx('text-fg-strong', hint && 'cursor-help')} title={hint}>
          {metaphor}
        </span>
        <span className="text-[11px] text-dim">· {name}</span>
        <span className="num ml-auto text-fg-strong">{value}</span>
      </div>
      {children}
    </div>
  )
}

/**
 * The ship's state. `onTopUp` – „Dopełnij kadłub z osłon” (AP-17, T373): the main window's, not a folder only to read;
 * a detached window shows no button (its clicks lead the main window, it writes nothing).
 */
function ShipState({ fleet, onOpen, onTopUp }: { fleet: BridgeFleet; onOpen: (t: BridgeTarget) => void; onTopUp?: (amount: number) => void }) {
  const s = fleet.shields
  const hull = fleet.hull
  // „Skąd ta liczba?” (F29): one breakdown open at a time.
  const [why, setWhy] = useState<'range' | 'targets' | 'delivery' | null>(null)
  const toggle = (w: 'range' | 'targets' | 'delivery') => setWhy(why === w ? null : w)
  const goals = sum(fleet.goals.map((g) => g.amount))
  const tanks = sum(fleet.tanks.map((t) => t.amount))
  // What the hull lacks of its target, and what of it the shields' surplus over their target gives (AP-17, T373).
  const lack = hull.target != null ? Math.max(0, hull.target - hull.amount) : 0
  const topUp = s.target != null ? Math.min(lack, s.over) : 0
  return (
    <div className="flex flex-col gap-2 text-[12px]">
      <Line metaphor="Osłony" name="bufor na pensje" hint={glossaryOf('Osłony')} value={<>{zl(s.amount)}{s.target != null && <span className="text-dim"> / {zl(s.target)}</span>}</>} testId="state-shields">
        <Meter value={s.amount} max={s.target} mark={s.min != null && s.target ? s.min / s.target : undefined} />
        {s.free > 0 && (
          <span className="text-[11px] text-muted" data-testid="state-shields-free">
            wolne do decyzji: {zl(s.free)}
          </span>
        )}
        {s.free === 0 && s.over > 0 && (
          <span className="text-[11px] text-muted" data-testid="state-shields-over">
            ponad cel osłon: {zl(s.over)} – {hull.target == null ? 'cel kadłuba jeszcze nieznany (za krótka historia kosztów)' : 'kadłub niepełny'}
            {fleet.firewall ? ', nie do dopłaty XTB' : ''}
          </span>
        )}
        {/* DW.12 (AP-17): with the order off nothing checks a top-up – said where the money free to decide is. */}
        {!fleet.firewall && (
          <span className="text-[11px] text-accent" data-testid="state-firewall-off">
            Firewall wyłączony – dopłaty do XTB bez sprawdzania osłon i kadłuba (Ustawienia → Warstwy i rozkazy).
          </span>
        )}
      </Line>
      <Line metaphor="Energia" name="pensja miesiąca do wydania" hint={glossaryOf('Energia')} value={zl(fleet.energy)} testId="state-energy" />
      <Line metaphor="Kadłub" name="fundusz awaryjny" hint={glossaryOf('Kadłub')} value={<>{zl(hull.amount)}{hull.target != null && <span className="text-dim"> / {zl(hull.target)}</span>}</>} testId="state-hull">
        <Meter value={hull.amount} max={hull.target} />
        {/* Within 1 % of its target (T372): full for the firewall and „wolne do decyzji”. */}
        {lack > 0 && hullCountsFull(hull.amount, hull.target) && (
          <span className="text-[11px] text-muted" data-testid="state-hull-tolerance">
            brakuje {zl(lack)} – do {HULL_TOLERANCE_PCT}% celu liczy się jako pełny (firewall, wolne do decyzji)
          </span>
        )}
        {onTopUp && topUp > 0 && (
          <button
            className="btn h-[22px] self-start"
            onClick={() => onTopUp(topUp)}
            title="Przenosi nadwyżkę osłon ponad ich cel do kadłuba – tyle, ile mu brakuje do celu (cel rośnie ze średnimi kosztami). Z „Cofnij”."
            data-testid="state-hull-topup"
          >
            Dopełnij kadłub z osłon: {zl(topUp)}
          </button>
        )}
      </Line>
      <div className="flex flex-wrap gap-x-3 text-[11px]">
        <button type="button" className={cx('hover:text-fg-strong', why === 'targets' ? 'text-accent' : 'text-dim')} onClick={() => toggle('targets')} aria-expanded={why === 'targets'} data-testid="state-targets-why">
          skąd cele osłon i kadłuba?
        </button>
        {fleet.lastDelivery && (
          <button type="button" className={cx('hover:text-fg-strong', why === 'delivery' ? 'text-accent' : 'text-dim')} onClick={() => toggle('delivery')} aria-expanded={why === 'delivery'} title={glossaryOf('Dostawa')} data-testid="state-delivery-why">
            ostatnia dostawa ({plDate(fleet.lastDelivery.date)}{fleet.lastDelivery.pending ? ', do zadokowania' : ''}) – dokąd poszła?
          </button>
        )}
      </div>
      {why === 'targets' && <WhyList lines={targetsWhy(fleet, fleet.layers)} testId="state-targets-lines" />}
      {why === 'delivery' && fleet.lastDelivery && <WhyList lines={fleet.lastDelivery.lines} testId="state-delivery-lines" />}
      {fleet.goals.length > 0 && <Line metaphor="Układy gwiezdne" name="cele" value={zl(goals)} />}
      {fleet.tanks.length > 0 && <Line metaphor="Zbiorniki" name="odkładki na opłaty okresowe" value={zl(tanks)} />}
      {fleet.taxHold > 0 && <Line metaphor="Podatek" name="poza budżetem (PIT-38)" value={zl(fleet.taxHold)} />}
      {fleet.deposit !== 0 && <Line metaphor="Depozyt domowników" name="ich zaliczki – nie do wydania na siebie" value={zl(fleet.deposit)} testId="state-deposit" />}
      {fleet.loot.amount > 0 && <Line metaphor="Łupy" name="do podziału" value={zl(fleet.loot.amount)} />}
      {fleet.debt > 0 && <Line metaphor="Dług" name="pożyczki wzięte – odjęte od zasięgu" value={zl(fleet.debt)} testId="state-debt" />}
      {fleet.toDock.count > 0 && (
        // The pairs of ICTTJ payouts not docked yet (AP-12): in the layers above already, by their entry's pool – said apart.
        <Line
          metaphor="Do zadokowania"
          name={`${countLabel(fleet.toDock.count, 'wpis', 'wpisy', 'wpisów')} ICTTJ – już w warstwach według puli wpisu`}
          hint="Wypłaty i zwroty z ICTTJ sparowane z bankiem, a jeszcze niezadokowane, liczą się od razu według puli wpisu: Cele – w celach, Podatek – w rezerwie na PIT-38 (zwrot z niej bez firewalla), reszta – kolejnością dokowania. „Zadokuj” na panelu Dokowanie potwierdza ten podział albo zapisuje zmieniony."
          value={
            <>
              {fleet.toDock.inflow > 0 && <span className="text-up">+{zl(fleet.toDock.inflow)}</span>}
              {fleet.toDock.inflow > 0 && fleet.toDock.outflow > 0 && ' '}
              {fleet.toDock.outflow > 0 && <span>−{zl(fleet.toDock.outflow)}</span>}
            </>
          }
          testId="state-to-dock"
        />
      )}
      <div className="grid grid-cols-3 gap-2 border-t border-line pt-2">
        <button type="button" className="flex flex-col text-left hover:text-accent" onClick={() => toggle('range')} aria-expanded={why === 'range'} title={glossaryOf('Zasięg')} data-testid="state-range-why">
          <span className="label">Zasięg</span>
          <span className="num text-[14px] text-fg-strong" data-testid="state-range">
            {fmtRange(fleet.range)}
          </span>
          <span className="text-[10.5px] text-dim">{fleet.debt > 0 ? '(osłony − dług + kadłub) / koszty' : '(osłony + kadłub) / koszty'}</span>
        </button>
        <div className="flex flex-col">
          <span className="label">Klasa</span>
          <span className="text-[14px] text-fg-strong">{fleet.shipClass ? SHIP_CLASS_LABEL[fleet.shipClass] : '—'}</span>
          <span className="text-[10.5px] text-dim">średnie koszty {fleet.costs.average != null ? zl(fleet.costs.average) : '—'}</span>
        </div>
        <button className="flex flex-col text-left hover:text-accent" onClick={() => onOpen('cargo')}>
          <span className="label">Masa ładunku</span>
          <span className={cx('num text-[14px]', fleet.cargo.over ? 'text-down' : 'text-fg-strong')}>{fleet.cargo.pct != null ? `${fleet.cargo.pct.toFixed(1).replace('.', ',')}%` : '—'}</span>
          <span className="text-[10.5px] text-dim" data-testid="state-cargo">
            stałe koszty {zl(fleet.cargo.monthly)}/mies. · linia {fleet.cargo.limitPct}%
          </span>
        </button>
      </div>
      {why === 'range' && <WhyList lines={rangeWhy(fleet)} testId="state-range-lines" />}
      <div className="text-[11px] text-dim">Suma kont budżetu: {zl(fleet.total)}</div>
    </div>
  )
}

/** „Skąd ta liczba?” (F29): a number taken apart – lines one adds up, the result last; a note beside them in brackets. */
function WhyList({ lines, testId }: { lines: readonly WhyLine[]; testId: string }) {
  return (
    <div className="flex flex-col border-l-2 border-line-strong pl-2 text-[11.5px]" data-testid={testId}>
      {lines.map((l, i) => (
        <div key={i} className={cx('flex items-baseline gap-2', l.total ? 'mt-0.5 border-t border-line pt-0.5 text-fg-strong' : l.aside ? 'text-dim' : 'text-muted')} data-testid="why-line" data-aside={l.aside ? '' : undefined}>
          <span className="min-w-0 flex-1">{l.label}</span>
          <span className={cx('num', l.total ? 'text-fg-strong' : l.aside ? 'text-dim' : 'text-fg')}>{l.amount == null ? (l.text ?? '—') : l.aside ? `(${zl(l.amount)})` : zl(l.amount)}</span>
        </div>
      ))}
    </div>
  )
}

/** The household's balances (D80): what each member owes or holds as their advance; the loans given beside. */
function Receivables({ fleet }: { fleet: FleetState }) {
  const r = fleet.receivables
  const members = useMembers()
  const shown = r.members.filter((m) => m.owed > 0 || m.deposit > 0)
  return (
    <Panel title="Rozliczenia z domownikami" testId="bridge-receivables">
      <div className="flex flex-col gap-1 text-[12px]">
        {shown.map((m) => (
          <div key={m.memberId} className="flex items-baseline gap-2" data-testid="bridge-member">
            <span className="text-fg-strong">{memberName(m.memberId, members)}</span>
            <span className="text-[11px] text-dim">
              {m.owed > 0 ? `ma oddać${m.since ? ` · od ${m.since.slice(8, 10)}.${m.since.slice(5, 7)} (${countLabel(daysBetween(m.since, fleet.today), 'dzień', 'dni', 'dni')})` : ''}` : 'zaliczka – czeka na wydatki'}
            </span>
            <span className={cx('num ml-auto', m.owed > 0 ? 'text-fg-strong' : 'text-muted')}>{zl(m.owed > 0 ? m.owed : m.deposit)}</span>
          </div>
        ))}
        <div className="flex items-baseline gap-2 border-t border-line/60 pt-1">
          <span className="text-muted">Domownicy mają oddać razem</span>
          <span className="num ml-auto text-fg-strong" data-testid="bridge-house">
            {zl(r.house)}
          </span>
        </div>
        {r.total > r.house && (
          <div className="flex items-baseline gap-2">
            <span className="text-muted">Pożyczki udzielone</span>
            <span className="num ml-auto">{zl(r.total - r.house)}</span>
          </div>
        )}
        <button className="self-start text-[11.5px] text-accent hover:underline" onClick={openRefundables}>
          wydatki domowników ›
        </button>
        <p className="text-[11px] text-dim">Wpłata domownika najpierw wyrównuje to, co ma oddać; reszta to jego zaliczka albo przychód (Ustawienia → Domownicy).</p>
      </div>
    </Panel>
  )
}
