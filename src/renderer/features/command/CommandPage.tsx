/**
 * Dowództwo (spec „Gra: Dowództwo”, E7, D73): the rank and the way to the next one, the ship's class, the streak over
 * the window's days, this week's mission, the achievements (the hidden ones only counted), the orders with the game's
 * thresholds and the watch log – the frozen days' violations, the ICT flavour, the changes of rank and class.
 */
import { useMemo, type ReactNode } from 'react'
import {
  ACHIEVEMENT_INFO,
  missionAhead,
  missionStatus,
  missionText,
  missionTitle,
  progressText,
  RANK_GENITIVE,
  RANK_LABEL,
  RANKS,
  TAG_LABEL,
  VIOLATION_LABEL,
  type DayRating,
  type GameView,
  type Rank,
  type ViolationKind,
  type WatchEntry
} from '@shared/calc/game'
import { CLASS_FROM, SHIP_CLASS_LABEL, SHIP_CLASSES, type ShipClass } from '@shared/calc/fleet'
import { rangeGapText, rangeText, salariesText } from '@shared/format'
import type { GameSettings } from '@shared/schema'
import { useData, useFolderLocked } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { freezeWithoutImport, useFreezeAsk, useGame } from '../../store/game'
import { navigate } from '../../store/ui'
import { plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Columns } from '../../components/layout'
import { Badge, Empty, Panel, cx } from '../../components/ui'
import { countLabel, plDate, plural } from '../../lib/format'
import { useCategories } from '../operations/pickers'
import { freezeRange } from './FreezeQuestion'

const zl = (g: number) => `${plnText(g)} zł`
const dm = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`

/** The ranges of the classes, from the engine's thresholds (T10). */
const classRange = (c: ShipClass): string => {
  const next = SHIP_CLASSES[SHIP_CLASSES.indexOf(c) + 1]
  if (!CLASS_FROM[c]) return `< ${next ? CLASS_FROM[next] : 1} mies.`
  return next ? `${CLASS_FROM[c]}–${CLASS_FROM[next]} mies.` : `≥ ${CLASS_FROM[c]} mies.`
}

/** The rank's insignia: stripes for the officers, a star for the admiral (one accent, no flourish). */
export function Insignia({ rank, size = 28 }: { rank: Rank; size?: number }) {
  const n = RANKS.indexOf(rank)
  if (rank === 'admiral')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.5l2.7 6.2 6.8.6-5.2 4.5 1.6 6.6L12 16.9l-5.9 3.5 1.6-6.6-5.2-4.5 6.8-.6z" fill="var(--color-accent)" />
      </svg>
    )
  const stripes = Math.max(1, n)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {Array.from({ length: stripes }, (_, i) => (
        <rect key={i} x="3" y={18 - i * 5} width="18" height={n === 0 ? 1.5 : 3} fill="var(--color-accent)" />
      ))}
    </svg>
  )
}

export function CommandPage() {
  const game = useGame()
  const fleet = useFleet()
  const settings = useData((s) => s.fi?.settings ?? null)
  const readOnly = useFolderLocked()
  const cats = useCategories()
  // Once per day and change (N68: the days not frozen yet run the engine) – before any early return (the hooks' order).
  const day = fleet?.today ?? null
  const status = useMemo(() => (game?.view.mission && day ? missionStatus(game.input, game.view.mission, day) : null), [game, day])
  // The freezing waiting for the bank's data (AP-14): said here, with its answer, also after the question was closed.
  const ask = useFreezeAsk((s) => s.ask)
  if (!game || !fleet || !settings) return <Empty>Wczytywanie…</Empty>
  const { view, today, input } = game
  const label = (id: string) => cats.label(id)
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-command">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Dowództwo</h1>
        <span className="text-[12px] text-muted">{view.start ? (view.waiting ? `gra od ${plDate(view.start)}` : `gra od ${plDate(view.start)} · ocenione do ${view.lastFrozen ? plDate(view.lastFrozen) : '—'}`) : 'gra wystartuje, gdy budżet działa'}</span>
      </div>
      {ask && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-accent/40 bg-accent-soft px-4 py-1.5 text-[12px]" data-testid="command-freeze-wait">
          <span className="text-fg-strong">Zamrażanie czeka na import z banku</span>
          <span className="text-muted">
            {freezeRange(ask)} – najwyżej do {plDate(ask.until)}
          </span>
          <span className="flex-1" />
          <button className="btn h-[22px]" onClick={() => navigate({ page: 'import' })}>
            Importuj
          </button>
          <button className="btn btn-ghost h-[22px]" disabled={readOnly} onClick={freezeWithoutImport} data-testid="command-freeze-anyway">
            Zamroź bez danych
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="command" tracks={['minmax(360px,1fr)', 'minmax(360px,1fr)', 'minmax(340px,1fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <RankPanel view={view} />
            <ClassPanel shipClass={fleet.shipClass} range={fleet.range} />
            <StreakPanel view={view} today={today} label={label} />
          </div>
          <div className="flex min-w-0 flex-col">
            <Panel title="Misja tygodnia" testId="command-mission">
              <div className="flex flex-col gap-1.5 text-[12px]">
                {view.mission ? (
                  <>
                    <span className="text-[13px] font-medium text-fg-strong" data-testid="command-mission-title">
                      {missionTitle(view.mission.template)}
                    </span>
                    <span className="text-fg">{capitalize(missionText(view.mission, label, zl))}</span>
                    {status && (
                      <span className={cx('text-[11.5px]', status.ok ? 'text-accent' : 'text-muted')} data-testid="command-mission-status">
                        {status.need != null
                          ? `Na razie: ${status.have} z ${status.need}${status.pending ? ` (+${status.pending}, jeśli dziś bez wydatków)` : ''}`
                          : status.ok
                            ? 'Na razie: kurs utrzymany'
                            : 'Na razie: cel chybiony'}
                        {status.amount != null && ` (${zl(status.amount)})`}
                      </span>
                    )}
                    <span className="text-[11px] text-dim">Rozliczenie po zamrożeniu niedzieli; wykonana skraca drogę do awansu o {countLabel(settings.game.missionDays, 'dzień', 'dni', 'dni')}.</span>
                  </>
                ) : (
                  <span className="text-muted" data-testid="command-mission-none">
                    {missionWaitText(view.start, fleet.today, !!ask)}
                  </span>
                )}
                {view.missions.filter((m) => m.evaluatedAt).length > 0 && (
                  <div className="flex flex-col border-t border-line pt-1.5">
                    <span className="label pb-0.5">Poprzednie</span>
                    {view.missions
                      .filter((m) => m.evaluatedAt)
                      .slice(0, 6)
                      .map((m) => (
                        <div key={m.id} className="flex items-baseline gap-2 py-0.5 text-[11.5px]" data-testid="command-mission-past">
                          <span className={cx('w-3 shrink-0', m.done ? 'text-accent' : 'text-dim')}>{m.done ? '✓' : '✗'}</span>
                          <span className="min-w-0 flex-1 truncate">{missionTitle(m.template)}</span>
                          <span className="num text-dim">{m.week.slice(5)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Panel>
            <Panel title="Osiągnięcia" testId="command-achievements">
              <div className="flex flex-col gap-1 text-[12px]">
                {!view.achievements.length && <span className="text-muted">Jeszcze żadnego – wszystkie są ukryte do zdobycia.</span>}
                {view.achievements.map((a) => (
                  <div key={a.id} className="flex flex-col py-0.5" data-testid="command-achievement" data-id={a.id}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-fg-strong">{ACHIEVEMENT_INFO[a.id].name}</span>
                      {a.day && <span className="num ml-auto text-[11px] text-dim">{plDate(a.day)}</span>}
                    </div>
                    <span className="text-[11.5px] text-muted">{ACHIEVEMENT_INFO[a.id].text}</span>
                  </div>
                ))}
                <span className="pt-1 text-[11.5px] text-dim" data-testid="command-hidden">
                  Ukrytych: {view.hidden}
                </span>
              </div>
            </Panel>
            <OrdersPanel game={settings.game} orders={settings.orders} shieldSalaries={settings.layers.shieldSalaries} />
          </div>
          <div className="flex min-w-0 flex-col">
            <Panel title="Dziennik wachty" testId="command-log">
              {!view.log.length ? (
                <Empty>Dziennik zapełni się, gdy pierwsze dni zostaną zamrożone (24 h po końcu dnia).</Empty>
              ) : (
                <div className="flex flex-col text-[12px]">
                  {view.log.slice(0, 200).map((e, i) => (
                    <LogLine key={`${e.date}:${e.kind}:${i}`} e={e} label={label} missionDays={settings.game.missionDays} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </Columns>
      </div>
    </div>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A week without its mission yet (AP-14, DW sp. 2): the first full week ahead – its date; else when it comes. */
function missionWaitText(start: string | null, today: string, waitsForImport: boolean): string {
  if (!start) return 'Misje ruszą razem z grą.'
  const ahead = missionAhead(start, today)
  if (ahead) return `Pierwsza misja w tygodniu od ${plDate(ahead)} (pierwszy pełny tydzień gry).`
  return waitsForImport ? 'Misja tygodnia zostanie wybrana po imporcie z banku (albo po „Zamroź bez danych”).' : 'Misja tygodnia zostanie wybrana po zamrożeniu dni.'
}

function RankPanel({ view }: { view: GameView }) {
  // A rank of a newer version (B90): its name, no way to the next one from here.
  const next = view.rankNewer ? undefined : RANKS[RANKS.indexOf(view.rank) + 1]
  const p = view.progress
  // The serious violations count from the last change of rank (T77, N70): said so when it was this month.
  const sinceChange = !view.serious.from.endsWith('-01')
  return (
    <Panel title="Stopień" testId="command-rank">
      <div className="flex flex-col gap-2 text-[12px]">
        <div className="flex items-center gap-3">
          <Insignia rank={view.rank} />
          <div className="flex flex-col">
            <span className="text-[18px] font-medium text-fg-strong" data-testid="command-rank-name" title={view.rankNewer ? 'Stopień z nowszej wersji aplikacji – zaktualizuj Financial Intel' : undefined}>
              {view.rankNewer ?? RANK_LABEL[view.rank]}
            </span>
            <span className="text-[11px] text-dim">{view.rankSince ? `od ${plDate(view.rankSince)}` : view.start ? `od startu gry (${plDate(view.start)})` : 'gra jeszcze nie wystartowała'}</span>
          </div>
        </div>
        {next && p ? (
          <div className="flex flex-col gap-1" data-testid="command-progress">
            <div className="flex items-baseline gap-2">
              <span className="text-muted">Do stopnia {RANK_GENITIVE[next]}</span>
              <span className="num ml-auto text-fg-strong">
                {Math.min(p.need, p.ok + p.bonus)} / {p.need}
              </span>
            </div>
            <Meter value={p.ok + p.bonus} max={p.need} />
            <span className="text-[11px] text-dim" data-testid="command-progress-days">
              {progressText(p)}
            </span>
          </div>
        ) : (
          <span className="text-muted">{view.rankNewer ? 'Stopień nadała nowsza wersja aplikacji – postęp policzy ona.' : next ? 'Postęp policzy się po pierwszym zamrożonym dniu.' : 'Najwyższy stopień floty.'}</span>
        )}
        <div className="flex items-baseline gap-2 border-t border-line pt-1.5" data-testid="command-serious">
          <span className="text-muted">{sinceChange ? `Poważne naruszenia od ${dm(view.serious.from)} (do degradacji)` : 'Poważne naruszenia w tym miesiącu (do degradacji)'}</span>
          <span className={cx('num ml-auto', view.serious.count >= view.serious.limit - 1 && view.serious.count > 0 ? 'text-accent' : 'text-fg-strong')}>
            {view.serious.count} / {view.serious.limit}
          </span>
        </div>
      </div>
    </Panel>
  )
}

function ClassPanel({ shipClass, range }: { shipClass: ShipClass | null; range: number | null }) {
  const idx = shipClass ? SHIP_CLASSES.indexOf(shipClass) : -1
  const next = idx >= 0 ? SHIP_CLASSES[idx + 1] : undefined
  return (
    <Panel title="Klasa okrętu" testId="command-class">
      <div className="flex flex-col gap-1.5 text-[12px]">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-medium text-fg-strong" data-testid="command-class-name">
            {shipClass ? SHIP_CLASS_LABEL[shipClass] : '—'}
          </span>
          <span className="num ml-auto text-muted">{range == null ? 'zasięg —' : `zasięg ${rangeText(range)}`}</span>
        </div>
        {next && range != null && <span className="text-[11.5px] text-dim">Do klasy {SHIP_CLASS_LABEL[next]} brakuje {rangeGapText(CLASS_FROM[next] - range)} zasięgu.</span>}
        <div className="flex flex-col pt-0.5">
          {SHIP_CLASSES.map((c) => (
            <div key={c} className={cx('flex items-baseline gap-2 py-0.5 text-[11.5px]', c === shipClass ? 'text-fg-strong' : 'text-dim')}>
              <span className={cx('h-[6px] w-[6px] shrink-0 self-center', c === shipClass ? 'bg-accent' : 'bg-line-strong')} />
              <span className="flex-1">{SHIP_CLASS_LABEL[c]}</span>
              <span className="num">{classRange(c)}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

const STATE_CLASS: Record<GameView['strip'][number]['state'], string> = { ok: 'bg-muted', broken: 'bg-accent', open: 'border border-line-strong', before: 'border border-line' }
const STATE_TITLE: Record<GameView['strip'][number]['state'], string> = { ok: 'zgodny', broken: 'naruszenie', open: 'jeszcze nie zamrożony', before: 'przed startem gry' }

function StreakPanel({ view, today, label }: { view: GameView; today: DayRating | null; label: (id: string) => string }) {
  return (
    <Panel title="Seria" testId="command-streak">
      <div className="flex flex-col gap-2 text-[12px]">
        <div className="flex items-baseline gap-4">
          <div className="flex flex-col">
            <span className="label">Seria</span>
            <span className="num text-[22px] leading-tight text-fg-strong" data-testid="command-streak-days">
              {view.streak}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="label">Rekord</span>
            <span className="num text-[15px] text-fg">{view.record}</span>
          </div>
          <span className="ml-auto self-end text-[11px] text-dim">dni zgodne z rzędu</span>
        </div>
        <div className="flex flex-wrap gap-[3px]" data-testid="command-strip">
          {view.strip.map((d) => (
            <span key={d.date} className={cx('h-[12px] w-[12px]', STATE_CLASS[d.state])} title={`${plDate(d.date)} – ${STATE_TITLE[d.state]}`} data-state={d.state} />
          ))}
        </div>
        {today && (
          <div className="flex flex-col gap-0.5 border-t border-line pt-1.5" data-testid="command-today">
            <span className="text-muted">Dziś na razie: {today.violations.length ? 'naruszenie' : 'zgodny'}</span>
            {/* A serious one in red, with its mark – as in the log (DW sp. 3, AP-16). */}
            {today.violations.map((v, i) => (
              <span key={i} className={cx('text-[11.5px]', v.serious ? 'text-down' : 'text-accent')} data-testid="command-today-violation" data-serious={v.serious}>
                {violationText(v.order, v.amount, v.ref, v.note, label)}
                {v.serious && (
                  <>
                    {' '}
                    <Badge tone="down" title="Liczy się do degradacji">
                      poważne
                    </Badge>
                  </>
                )}
              </span>
            ))}
            <span className="text-[11px] text-dim">Dzień zamraża się 24 h po swoim końcu; późniejsza korekta zmienia budżet, nie ocenę.</span>
          </div>
        )}
      </div>
    </Panel>
  )
}

function violationText(order: string, amount: number | null, ref: string | null, note: string, label: (id: string) => string): string {
  const name = VIOLATION_LABEL[order as ViolationKind] ?? order
  const a = amount != null ? zl(amount) : ''
  switch (order) {
    case 'daily':
      return `${name} o ${a}`
    case 'envelope':
    case 'envelope-serious':
      return `${name}: ${ref ? label(ref) : ''} – ponad limit o ${a}`
    case 'cargo':
      return `${name}: ${note || 'kontener'} – ładownia ${a} miesięcznie`
    case 'shields':
      return `${name} o ${a}`
    case 'firewall':
      return `${name}: ${a}`
    case 'quiet':
      return `${name}: ${note ? `${note} ` : ''}${a}`
    default:
      return name
  }
}

function LogLine({ e, label, missionDays }: { e: WatchEntry; label: (id: string) => string; missionDays: number }) {
  let text: ReactNode
  let mark = 'bg-line-strong'
  switch (e.kind) {
    case 'violation':
      text = (
        <>
          {violationText(e.order, e.amount, e.ref, e.note, label)}
          {e.serious && (
            <Badge tone="down" title="Liczy się do degradacji">
              poważne
            </Badge>
          )}
        </>
      )
      // A serious violation in red (DW sp. 3, AP-16) – as an envelope over the game's threshold.
      mark = e.serious ? 'bg-down' : 'bg-accent'
      break
    case 'tag':
      text = TAG_LABEL[e.tag] ?? e.tag
      break
    case 'class':
      // A change that came with new data (AP-14) is said so – never celebrated.
      text = `Klasa: ${SHIP_CLASS_LABEL[e.from]} → ${SHIP_CLASS_LABEL[e.cls]}${e.data ? ' (skutek nowych danych, nie zmiana okrętu)' : e.up && !e.peak ? ' (powtórnie w ciągu 30 dni)' : ''}`
      mark = e.up ? 'bg-fg-strong' : 'bg-line-strong'
      break
    case 'rank':
      text = e.change === 'up' ? `Awans: ${RANK_LABEL[e.rank]}` : `Degradacja: ${RANK_LABEL[e.rank]}`
      mark = e.change === 'up' ? 'bg-fg-strong' : 'bg-accent'
      break
    case 'mission':
      text = e.done == null ? `Misja tygodnia: ${missionTitle(e.template)}` : e.done ? `Misja wykonana: ${missionTitle(e.template)} (+${countLabel(missionDays, 'dzień', 'dni', 'dni')} do awansu)` : `Misja niewykonana: ${missionTitle(e.template)}`
      break
    case 'achievement':
      text = `Osiągnięcie: ${ACHIEVEMENT_INFO[e.id].name} – ${ACHIEVEMENT_INFO[e.id].text}`
      mark = 'bg-fg-strong'
      break
    case 'cover':
      // F28, D73: the day is rated by the limits before the cover – the log says where the limit came from.
      text = `Pokrycie przekroczenia: ${label(e.to)} z koperty ${label(e.from)} – ${plnText(e.amount)} zł limitu`
      break
  }
  return (
    <div className="flex items-start gap-2 py-0.5" data-testid="command-log-entry" data-kind={e.kind}>
      <span className="num w-[38px] shrink-0 text-[11px] text-dim">{dm(e.date)}</span>
      <span className={cx('mt-[5px] h-[6px] w-[6px] shrink-0', mark)} />
      <span className="min-w-0 flex-1">{text}</span>
    </div>
  )
}

type Orders = NonNullable<ReturnType<typeof useData.getState>['fi']>['settings']['orders']

const salaries = salariesText

/**
 * The orders and the game's thresholds – read here, changed only in Ustawienia → Warstwy i rozkazy (D84 C9, D99 pkt 7,
 * AP-16): a threshold of the game changes rarely, and a field here changed them by chance (AF-38).
 */
function OrdersPanel({ game, orders, shieldSalaries }: { game: GameSettings; orders: Orders; shieldSalaries: number }) {
  const quiet = orders.quietHours.from === orders.quietHours.to ? 'brak' : `${orders.quietHours.from}–${orders.quietHours.to}`
  return (
    <Panel title="Rozkazy i progi" testId="command-orders">
      <div className="flex flex-col gap-1 text-[12px]">
        {/* What the game judges (N29): the day's spending against its allowance – not the plain base; today's energy as
            shown is capped by the month's (AP-13, T371), the violation stays the allowance's (`daily.left` – T392). */}
        <Order label="Dzienny przydział energii (wydatków dnia)" value="wydatki dnia ≤ przydział dnia" />
        <span className="text-[11px] text-dim" data-testid="command-orders-daily">
          Przydział dnia = koperty codzienne, które zostały, ÷ dni do końca miesiąca (z dziś); podstawa – koperty codzienne ÷ dni miesiąca. Energia dziś = przydział − wydane dziś, ale nie więcej niż
          zostało energii miesiąca (przy pensji częściowej mniej, nawet 0,00 zł); naruszenie – dopiero wydatki dnia ponad przydział (energia dziś poniżej zera).
        </span>
        <div className="flex flex-col gap-1" data-testid="command-orders-values">
          <Order label="Minimalne osłony" value={salaries(orders.minShieldSalaries)} />
          {/* The minimum the engine applies (B84): never above the shields' target. */}
          {orders.minShieldSalaries > shieldSalaries && <span className="text-[11px] text-accent">Minimalne osłony ponad cel osłon – liczy się cel ({salaries(shieldSalaries)}).</span>}
          <Order label="Linia zanurzenia" value={`${orders.cargoLimitPct}% pensji`} />
          <Order label="Cisza nocna" value={quiet} />
          <Order label="Dziennik kapitański od kwoty" value={orders.impulseThreshold > 0 ? zl(orders.impulseThreshold) : 'nie pyta'} />
          <Order label="Firewall (dopłata do XTB)" value={orders.firewall ? 'włączony' : 'wyłączony – dopłaty nie są sprawdzane'} />
        </div>
        <div className="mt-1 flex flex-col gap-1 border-t border-line pt-1.5" data-testid="command-game-values">
          <span className="label">Progi gry</span>
          <Order label="Awans" value={`${game.promoteDays} dni zgodnych w ostatnich ${game.windowDays} dniach`} />
          <Order label="Koperta poważnie ponad" value={`${game.seriousEnvelopePct}% limitu`} />
          <Order label="Degradacja po" value={`${countLabel(game.demoteSerious, 'poważnym naruszeniu', 'poważnych naruszeniach', 'poważnych naruszeniach')} w miesiącu`} />
          <Order label="Wykonana misja" value={`+${countLabel(game.missionDays, 'dzień zgodny', 'dni zgodne', 'dni zgodnych')}`} />
          <span className="text-[11px] text-dim">Progi działają od kolejnych zamrożonych dni – zamrożone oceny i awanse zostają.</span>
        </div>
        <button className="self-start text-[11.5px] text-accent hover:underline" onClick={() => navigate({ page: 'settings', tab: 'layers' })} data-testid="command-orders-edit">
          zmień w Ustawieniach → Warstwy i rozkazy ›
        </button>
      </div>
    </Panel>
  )
}

function Order({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted">{label}</span>
      <span className="ml-auto text-fg-strong">{value}</span>
    </div>
  )
}
