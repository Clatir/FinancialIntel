import { useMemo, useState, type ReactNode } from 'react'
import { BIAS_LABEL, briefing, dailyBias, silverBullet, type BriefingItem } from '@shared/calc/briefing'
import { daysBetween, isoWeekOf } from '@shared/calc/dates'
import { financersText, memberName, payerOf } from '@shared/calc/household'
import { missionText, missionTitle } from '@shared/calc/game'
import { SHIP_CLASS_LABEL, type FleetState } from '@shared/calc/fleet'
import { sum } from '@shared/calc/operations'
import { amountTone } from '@shared/operationsView'
import { shortcutLabel } from '@shared/machine'
import type { DetachEvent } from '@shared/api'
import { useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useMachine } from '../../store/machine'
import type { DetachSpec } from '../../store/detach'
import { useRecordList } from '../../store/records'
import { navigate } from '../../store/ui'
import { api } from '../../lib/api'
import { AMOUNT_MASK, amountsHidden, plnText, signedPln } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Columns } from '../../components/layout'
import { Badge, Empty, Panel, cx } from '../../components/ui'
import { dayLabel, plDate } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { newOperation, openRefundables, selectOperation, setFilter } from '../operations/state'
import { EnvelopeBars, monthElapsed } from '../month/EnvelopeBars'
import { IncomePanel } from '../month/IncomePanel'
import { startWizard } from '../wizard/state'
import { DockPanel } from '../dock/DockPanel'
import { openDocking, useDeliveries } from '../dock/state'
import { useIctj } from '../../store/ictj'
import { useGameRecords } from '../../store/game'
import { useMembers } from '../household/actions'

const zl = (grosze: number) => `${plnText(grosze)} zł`
const fmtRange = (r: number | null) => (r == null ? '—' : `${r.toFixed(1).replace('.', ',')} mies.`)

/** What the bridge's panels draw – in the main window and in their own windows (D45) alike, as plain JSON. */
export type BridgeFleet = Pick<
  FleetState,
  'today' | 'started' | 'total' | 'shields' | 'hull' | 'goals' | 'energy' | 'tanks' | 'taxHold' | 'deposit' | 'loot' | 'costs' | 'range' | 'shipClass' | 'cargo' | 'envelopes' | 'daily' | 'debt'
>

export const bridgeFleet = (f: FleetState): BridgeFleet => ({
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
type BridgeTarget = BriefingItem['kind'] | 'cargo'

function openTarget(t: BridgeTarget, key?: string): void {
  if (t === 'asteroid' || t === 'cargo') navigate({ page: 'cargo' })
  else if (t === 'import') navigate({ page: 'import' })
  else if (t === 'balances') navigate({ page: 'settings', tab: 'accounts' })
  else if (t === 'start') startWizard()
  else if (t === 'dock') {
    navigate({ page: 'bridge' })
    if (key?.startsWith('dock:')) openDocking(key.slice('dock:'.length))
  } else if (t === 'ictj') navigate({ page: 'settings', tab: 'ictj' })
  else if (t === 'loan' || t === 'pit38') navigate({ page: 'radar' })
  else if (t === 'house') openRefundables()
  else if (t === 'mission') navigate({ page: 'command' })
  else navigate({ page: 'month' })
}

/** A click in a detached panel: the main window goes there. */
const onBridgeEvent = (e: DetachEvent) => {
  if (e.type === 'open' && typeof e.target === 'string') openTarget(e.target as BridgeTarget, typeof e.key === 'string' ? e.key : undefined)
}
const emitTarget = (target: BridgeTarget, key?: string) => void api.detachEmit({ type: 'open', target, ...(key ? { key } : {}) })

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

/**
 * Mostek (spec, „Ekrany”): the morning briefing, the ship's state (the shields, today's energy, the hull, the range,
 * the cargo's mass, the class), the envelopes, what the house owes and the latest operations. The metaphor always
 * with the real name and the amount (D34).
 */
export function BridgePage() {
  const fleet = useFleet()
  const fi = useData((s) => s.fi)
  const transactions = useRecordList('transactions')
  const shortcut = useMachine((s) => s.prefs.quickShortcut)
  const cats = useCategories()
  const members = useMembers()
  const items = useBriefingItems(fleet)
  const view = useMemo(() => (fleet ? bridgeFleet(fleet) : null), [fleet])
  const labels = useMemo(() => Object.fromEntries((fleet?.envelopes ?? []).map((e) => [e.categoryId, cats.label(e.categoryId)])), [fleet, cats])
  const specs = useMemo(() => {
    if (!view) return null
    const spec = (props: BridgeDetachProps): DetachSpec => ({ kind: 'bridge', props, onEvent: onBridgeEvent })
    return {
      briefing: spec({ panel: 'briefing', fleet: view, items }),
      state: spec({ panel: 'state', fleet: view }),
      envelopes: spec({ panel: 'envelopes', rows: view.envelopes, labels, elapsed: monthElapsed(view.today) })
    }
  }, [view, items, labels])
  if (!fleet || !fi || !view || !specs) return <Empty>Wczytywanie…</Empty>
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 10)
  // A household member's purchase or money (D80) says whose it is instead of the category.
  const noteOf = (t: (typeof recent)[number]): string => {
    const financed = financersText(t, members)
    if (financed) return `finansuje: ${financed}`
    const payer = payerOf(t)
    if (payer) return `od: ${memberName(payer, members)}`
    return t.categoryId ? cats.label(t.categoryId) : ''
  }

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
        <Columns id="bridge" tracks={['minmax(360px,1fr)', 'minmax(360px,1fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <BriefingPanel fleet={view} items={items} detach={specs.briefing} />
            {fleet.started && (
              <Panel title="Stan okrętu" testId="bridge-state" detach={specs.state}>
                <ShipState fleet={view} onOpen={openTarget} />
              </Panel>
            )}
            {fleet.started && <DockPanel />}
          </div>
          <div className="flex min-w-0 flex-col">
            <Panel title="Koperty" testId="bridge-envelopes" detach={specs.envelopes}>
              <Envelopes rows={fleet.envelopes} elapsed={monthElapsed(fleet.today)} />
            </Panel>
            <Receivables fleet={fleet} />
            <IncomePanel fleet={fleet} salary={fleet.plan?.salary ?? null} testId="bridge-income" />
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
                          setFilter({ period: { kind: 'month', month: t.date.slice(0, 7) }, accounts: [], kinds: [], categories: [], marks: [], query: '' })
                          navigate({ page: 'operations' })
                          selectOperation(t.id)
                        }}
                        data-testid="bridge-recent-row"
                      >
                        <span className="num w-[44px] shrink-0 text-[11px] text-muted">{plDate(t.date).slice(0, 5)}</span>
                        <span className="min-w-0 flex-1 truncate text-fg-strong">{t.counterparty || t.title || '—'}</span>
                        <span className="w-[130px] truncate text-[11px] text-dim">{noteOf(t)}</span>
                        <span className={cx('num w-[100px] text-right', tone === 'up' ? 'text-up' : tone === 'muted' ? 'text-muted' : tone === 'accent' ? 'text-accent' : 'text-fg')}>{signedPln(t.amount)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>
        </Columns>
      </div>
    </div>
  )
}

/** The briefing read aloud: the hidden amounts are not read either. */
function useSpeech(fleet: BridgeFleet, items: BriefingItem[]) {
  const [spoken, setSpoken] = useState(true)
  const say = () => {
    const hidden = amountsHidden()
    const bias = dailyBias(fleet)
    const d = fleet.daily
    const parts = [`Odprawa, ${dayLabel(fleet.today)}.`]
    if (d && !hidden) parts.push(`Energia na dziś: ${Math.floor(Math.max(0, d.left) / 100)} złotych.`)
    if (bias) parts.push(`Daily Bias: ${BIAS_LABEL[bias]}.`)
    for (const i of items) parts.push(i.text.replaceAll(`${AMOUNT_MASK} zł`, 'kwota ukryta').replace(/zł/g, 'złotych'))
    if (!items.length) parts.push('Bez alarmów.')
    setSpoken(speak(parts.join(' ')))
  }
  return { spoken, say }
}

function SpeakButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn h-[22px]" onClick={onClick} title="Przeczytaj odprawę głosem systemu" data-testid="briefing-speak">
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
  return (
    <div className="flex flex-col gap-2 text-[12px]">
      {fleet.started && (
        <div className="flex items-baseline gap-3">
          <div className="flex flex-col">
            <span className="label">Energia dziś</span>
            <span className={cx('num text-[24px] leading-tight', d && d.left < 0 ? 'text-down' : 'text-fg-strong')} data-testid="bridge-energy">
              {d ? zl(d.left) : '—'}
            </span>
            <span className="text-[11px] text-dim">{d ? `przydział ${zl(d.allowance)} · podstawowy ${zl(d.base)}` : 'bez planu tego miesiąca'}</span>
          </div>
          {bias && (
            <span className={cx('ml-auto text-[13px] font-medium', bias === 'bearish' ? 'text-down' : bias === 'bullish' ? 'text-accent' : 'text-muted')} data-testid="bridge-bias" title="Daily Bias (spec, Wywiad)">
              {bias === 'bullish' ? '▲' : bias === 'bearish' ? '▼' : '◆'} {BIAS_LABEL[bias]}
            </span>
          )}
        </div>
      )}
      {fleet.started && silverBullet() && <SilverBullet fleet={fleet} items={items} />}
      {!fleet.started && (
        <div className="flex items-center gap-3 border border-accent/40 bg-accent-soft px-3 py-2">
          <span className="flex-1 text-fg-strong">Budżet jeszcze nie wystartował.</span>
          <button className="btn btn-accent h-[24px]" onClick={() => onOpen('start')} data-testid="bridge-wizard">
            Kreator startu
          </button>
        </div>
      )}
      <div className="flex flex-col" data-testid="briefing-items">
        {fleet.started && !items.length && <span className="text-muted">Bez alarmów – kurs stabilny.</span>}
        {items
          .filter((i) => i.kind !== 'start')
          .map((i) => (
            <button key={i.key} className="flex items-start gap-2 py-0.5 text-left hover:text-fg-strong" onClick={() => onOpen(i.kind, i.key)} data-testid="briefing-item" data-kind={i.kind}>
              <span className={cx('mt-[5px] h-[6px] w-[6px] shrink-0', i.level === 'red' ? 'bg-down' : i.level === 'yellow' ? 'bg-accent' : 'bg-line-strong')} />
              <span className={cx(i.level === 'red' ? 'text-down' : 'text-fg')}>{i.text}</span>
            </button>
          ))}
      </div>
      {!spoken && <span className="text-[11px] text-dim">Brak głosu systemu do odsłuchu.</span>}
    </div>
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
  return useMemo(() => {
    if (!fleet || !fi) return []
    const imports = fi.settings.accounts.filter((a) => !a.archived && a.importFormat === 'mbank').map((a) => ({ name: a.name, last: fi.settings.import.lastImport[a.id] ?? null }))
    const confirmed = balances.filter((b) => b.kind === 'confirmation').map((b) => b.date).sort().at(-1) ?? null
    const label = (id: string) => containers.find((c) => c.id === id)?.name ?? cats.label(id)
    // This week's mission of the command (E7).
    const week = isoWeekOf(fleet.today)
    const m = game.flatMap((g) => g.missions).find((x) => x.week === week)
    const mission = m ? { week, title: missionTitle(m.template), text: missionText(m, cats.label, zl) } : null
    return briefing({ fleet, containers, imports, lastConfirmation: confirmed, label, money: zl, deliveries, ictjProblem, mission, members: fi.settings.household.members })
    // `hidden`: the amounts of the texts mask on a change.
  }, [fleet, fi, containers, balances, cats, hidden, deliveries, ictjProblem, game])
}

/** Silver Bullet (D73, ICT): opened between 10:00 and 11:00 New York time – the briefing in three sentences. */
function SilverBullet({ fleet, items }: { fleet: BridgeFleet; items: BriefingItem[] }) {
  const bias = dailyBias(fleet)
  const d = fleet.daily
  const first = items.find((i) => i.level !== 'info') ?? null
  return (
    <div className="flex flex-col gap-0.5 border-l-2 border-accent pl-2 text-[11.5px]" data-testid="briefing-silver-bullet">
      <span className="label text-accent">Silver Bullet · 10:00–11:00 NY</span>
      <span>
        {d ? `Energia dziś ${zl(d.left)}.` : 'Bez planu tego miesiąca.'} {bias ? `Daily Bias: ${BIAS_LABEL[bias]}.` : ''} {first ? first.text : 'Bez alarmów.'}
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

function Line({ metaphor, name, value, children, testId }: { metaphor: string; name: string; value: ReactNode; children?: ReactNode; testId?: string }) {
  return (
    <div className="flex flex-col gap-0.5" data-testid={testId}>
      <div className="flex items-baseline gap-2">
        <span className="text-fg-strong">{metaphor}</span>
        <span className="text-[11px] text-dim">· {name}</span>
        <span className="num ml-auto text-fg-strong">{value}</span>
      </div>
      {children}
    </div>
  )
}

function ShipState({ fleet, onOpen }: { fleet: BridgeFleet; onOpen: (t: BridgeTarget) => void }) {
  const s = fleet.shields
  const goals = sum(fleet.goals.map((g) => g.amount))
  const tanks = sum(fleet.tanks.map((t) => t.amount))
  return (
    <div className="flex flex-col gap-2 text-[12px]">
      <Line metaphor="Osłony" name="bufor na pensje" value={<>{zl(s.amount)}{s.target != null && <span className="text-dim"> / {zl(s.target)}</span>}</>} testId="state-shields">
        <Meter value={s.amount} max={s.target} mark={s.min != null && s.target ? s.min / s.target : undefined} />
        {s.free > 0 && <span className="text-[11px] text-muted">wolne do decyzji: {zl(s.free)}</span>}
      </Line>
      <Line metaphor="Energia" name="pensja miesiąca do wydania" value={zl(fleet.energy)} testId="state-energy" />
      <Line metaphor="Kadłub" name="fundusz awaryjny" value={<>{zl(fleet.hull.amount)}{fleet.hull.target != null && <span className="text-dim"> / {zl(fleet.hull.target)}</span>}</>} testId="state-hull">
        <Meter value={fleet.hull.amount} max={fleet.hull.target} />
      </Line>
      {fleet.goals.length > 0 && <Line metaphor="Układy gwiezdne" name="cele" value={zl(goals)} />}
      {fleet.tanks.length > 0 && <Line metaphor="Zbiorniki" name="odkładki na opłaty okresowe" value={zl(tanks)} />}
      {fleet.taxHold > 0 && <Line metaphor="Podatek" name="poza budżetem (PIT-38)" value={zl(fleet.taxHold)} />}
      {fleet.deposit !== 0 && <Line metaphor="Depozyt domowników" name="ich zaliczki – nie do wydania na siebie" value={zl(fleet.deposit)} testId="state-deposit" />}
      {fleet.loot.amount > 0 && <Line metaphor="Łupy" name="do podziału" value={zl(fleet.loot.amount)} />}
      {fleet.debt > 0 && <Line metaphor="Dług" name="pożyczki wzięte – odjęte od zasięgu" value={zl(fleet.debt)} testId="state-debt" />}
      <div className="grid grid-cols-3 gap-2 border-t border-line pt-2">
        <div className="flex flex-col">
          <span className="label">Zasięg</span>
          <span className="num text-[14px] text-fg-strong" data-testid="state-range">
            {fmtRange(fleet.range)}
          </span>
          <span className="text-[10.5px] text-dim">{fleet.debt > 0 ? '(osłony − dług + kadłub) / koszty' : '(osłony + kadłub) / koszty'}</span>
        </div>
        <div className="flex flex-col">
          <span className="label">Klasa</span>
          <span className="text-[14px] text-fg-strong">{fleet.shipClass ? SHIP_CLASS_LABEL[fleet.shipClass] : '—'}</span>
          <span className="text-[10.5px] text-dim">średnie koszty {fleet.costs.average != null ? zl(fleet.costs.average) : '—'}</span>
        </div>
        <button className="flex flex-col text-left hover:text-accent" onClick={() => onOpen('cargo')}>
          <span className="label">Masa ładunku</span>
          <span className={cx('num text-[14px]', fleet.cargo.over ? 'text-down' : 'text-fg-strong')}>{fleet.cargo.pct != null ? `${fleet.cargo.pct.toFixed(1).replace('.', ',')}%` : '—'}</span>
          <span className="text-[10.5px] text-dim">linia {fleet.cargo.limitPct}%</span>
        </button>
      </div>
      <div className="text-[11px] text-dim">Suma kont budżetu: {zl(fleet.total)}</div>
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
              {m.owed > 0 ? `ma oddać${m.since ? ` · od ${m.since.slice(8, 10)}.${m.since.slice(5, 7)} (${daysBetween(m.since, fleet.today)} dni)` : ''}` : 'zaliczka – czeka na wydatki'}
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
