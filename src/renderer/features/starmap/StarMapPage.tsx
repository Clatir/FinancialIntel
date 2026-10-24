/**
 * Mapa gwiezdna (spec, „Ekrany”; E5, D72): the goals as star systems – those of the chosen ICTTJ scenario (read only:
 * name and amount from ICTTJ) and the own ones – on one priority list (drag, or the arrows), each with its money
 * against its target, its month and the ETA at the pace of the last months.
 */
import { useMemo, useState } from 'react'
import { glossaryOf } from '@shared/glossary'
import { addMonths, monthsBetween } from '@shared/calc/dates'
import { goalInstallment, ratedIn } from '@shared/calc/fleet'
import { byPriority, goalEtas, goalLate, goalPace } from '@shared/calc/goals'
import { chosenForecast } from '@shared/ictj'
import type { Goal } from '@shared/schema'
import { useData, useEntryNewer, useFolderLocked } from '../../store/data'
import { NewerNote } from '../../components/NewerNote'
import { useDraft } from '../../store/drafts'
import { useFleet } from '../../store/fleet'
import { useIctj } from '../../store/ictj'
import { useRecordList } from '../../store/records'
import { navigate, toast } from '../../store/ui'
import { AmountField, MonthField, plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Columns } from '../../components/layout'
import { Badge, Empty, NameInput, Panel, Toggle, cx } from '../../components/ui'
import { Modal } from '../../components/Modal'
import { countLabel, monthGenLabel, monthLabel } from '../../lib/format'
import { addGoal, archiveGoal, moveGoal, moveGoalMoney, patchGoal, setGoalRate, type GoalMoneyTarget } from './actions'
import { HistoryButton } from '../history/HistoryDialog'
import { useFocusRecord } from '../../components/focus'

const zl = (g: number) => `${plnText(g)} zł`

export function StarMapPage() {
  const fleet = useFleet()
  const goalsAll = useRecordList('goals')
  const readOnly = useFolderLocked()
  // Opened from the palette (F19): the goal marked on the map.
  useFocusRecord('goal')
  const goalEntries = useData((s) => s.records.goals)
  const snap = useIctj((s) => s.snap)
  const forecastId = useData((s) => s.fi?.settings.ictj.forecastId ?? null)
  const active = useMemo(() => byPriority(goalsAll.filter((g) => !g.archived)), [goalsAll])
  const archived = useMemo(() => byPriority(goalsAll.filter((g) => g.archived)), [goalsAll])
  const amounts = useMemo(() => new Map((fleet?.goals ?? []).map((g) => [g.id, g.amount])), [fleet])
  // The payouts of the pool Cele apart (N42): they fill the ICTTJ goals first, whatever the list's order. Once per fleet
  // (W38): the pace walks the engine's log – the month's total from the same walk.
  const dockings = useRecordList('dockings')
  const poolTx = useMemo(() => new Set(dockings.filter((d) => d.pool === 'goals').map((d) => d.transactionId)), [dockings])
  const pace = useMemo(() => (fleet ? goalPace(fleet.log, fleet.started ? fleet.start : null, fleet.month, poolTx) : null), [fleet, poolTx])
  const monthly = pace?.total ?? null
  const etas = useMemo(
    () => (fleet ? goalEtas(active.map((g) => ({ id: g.id, amount: amounts.get(g.id) ?? 0, target: g.target, ictj: g.source === 'ictj' })), pace, fleet.month) : {}),
    [fleet, active, amounts, pace]
  )
  const [dragged, setDragged] = useState<string | null>(null)
  // The goal whose money is being moved (C2, B30): archiving it, or an archived one.
  const [moving, setMoving] = useState<{ goal: Goal; archive: boolean } | null>(null)
  const archiveOrAsk = (g: Goal) => ((amounts.get(g.id) ?? 0) > 0 ? setMoving({ goal: g, archive: true }) : archiveGoal(g, true))
  // Draw on Liquidity (D73, ICT): the first goal not reached yet – where the next delivery for the goals flows.
  const open = (g: Goal) => g.target > 0 && (amounts.get(g.id) ?? 0) < g.target
  const dol = active.find(open)?.id ?? null
  // A payout of the pool Cele fills the ICTTJ goals first (N42, D72): its own mark when it goes elsewhere.
  const dolPool = (active.find((g) => g.source === 'ictj' && open(g)) ?? active.find(open))?.id ?? null
  if (!fleet) return <Empty>Wczytywanie…</Empty>
  const forecast = snap.status === 'ok' ? chosenForecast(snap.forecasts, forecastId) : null
  // All the money in goals, the archived ones' too (it is still there – C1).
  const total = goalsAll.reduce((n, g) => n + (amounts.get(g.id) ?? 0), 0)
  // The archived ones' part said apart (N22): the bridge's sum and this one are the same layer.
  const inArchived = archived.reduce((n, g) => n + (amounts.get(g.id) ?? 0), 0)

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-starmap">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Mapa gwiezdna</h1>
        <span className="text-[12px] text-muted">cele – układy gwiezdne</span>
        <span className="flex-1" />
        <span className="text-[12px] text-muted">
          w celach <span className="num text-fg-strong" data-testid="starmap-total">{zl(total)}</span>
          {inArchived > 0 && <span className="text-dim"> (w tym zarchiwizowane {zl(inArchived)})</span>}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="starmap" tracks={['minmax(460px,2fr)', 'minmax(280px,1fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <Panel title="Kolejność wypełniania" hint={glossaryOf('Mapa gwiezdna')} testId="starmap-goals">
              {!active.length ? (
                <Empty>Brak celów – dodaj własny albo wybierz scenariusz prognozy ICTTJ (Ustawienia → ICTTJ).</Empty>
              ) : (
                <div className="flex flex-col text-[12px]">
                  {active.map((g, i) => (
                    <GoalRow
                      key={g.id}
                      goal={g}
                      index={i}
                      count={active.length}
                      amount={amounts.get(g.id) ?? 0}
                      eta={etas[g.id] ?? null}
                      pace={monthly}
                      readOnly={readOnly}
                      dragging={dragged === g.id}
                      onDragStart={() => setDragged(g.id)}
                      onDragEnd={() => setDragged(null)}
                      onDrop={() => {
                        if (dragged) moveGoal(dragged, g.id)
                        setDragged(null)
                      }}
                      scenario={g.source === 'ictj' && forecast && forecast.id === g.ictj?.forecastId ? forecast.name : null}
                      dol={g.id === dol}
                      dolPool={g.id === dolPool && dolPool !== dol}
                      month={fleet.month}
                      onMoveMoney={() => setMoving({ goal: g, archive: false })}
                      onArchive={() => archiveOrAsk(g)}
                    />
                  ))}
                  <div
                    className={cx('h-[18px]', dragged && 'border-t border-dashed border-accent/60')}
                    onDragOver={(e) => dragged && e.preventDefault()}
                    onDrop={() => {
                      if (dragged) moveGoal(dragged, null)
                      setDragged(null)
                    }}
                  />
                  <p className="text-[11px] text-dim">
                    Nadwyżka ponad pełny kadłub wypełnia cele w tej kolejności. Wypłata z puli Cele w ICTTJ idzie najpierw do celów z prognozy ICTTJ, potem do
                    własnych.
                  </p>
                </div>
              )}
            </Panel>
            {archived.length > 0 && (
              <Panel title={`Zarchiwizowane (${archived.length})`} name="Zarchiwizowane" testId="starmap-archived">
                <div className="flex flex-col text-[12px]">
                  {archived.map((g) => (
                    <div key={g.id} className="flex items-baseline gap-2 border-b border-line/60 py-1 last:border-b-0" data-testid="starmap-archived-row" data-focus={`goal:${g.id}`}>
                      <span className="min-w-0 flex-1 truncate">{g.name}</span>
                      {g.source === 'ictj' ? <span className="text-[11px] text-dim">poza wybranym scenariuszem ICTTJ</span> : null}
                      <span className="num text-muted">{zl(amounts.get(g.id) ?? 0)}</span>
                      {(amounts.get(g.id) ?? 0) > 0 && !readOnly && !goalEntries[g.id]?.readOnly && (
                        <button className="text-[11.5px] text-accent hover:underline" onClick={() => setMoving({ goal: g, archive: false })} data-testid="starmap-archived-move">
                          przenieś środki
                        </button>
                      )}
                      {g.source === 'own' && !readOnly && !goalEntries[g.id]?.readOnly && (
                        <button className="text-[11.5px] text-accent hover:underline" onClick={() => archiveGoal(g, false)}>
                          przywróć
                        </button>
                      )}
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] text-dim">
                    Środki zarchiwizowanego celu zostają w nim, dopóki ich nie przeniesiesz (wydatek z tego celu też je zużywa); nowe dostawy już do niego nie
                    trafiają.
                  </p>
                </div>
              </Panel>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <NewGoal readOnly={readOnly} />
            <Panel title="Tempo" testId="starmap-pace">
              <div className="flex flex-col gap-1 text-[12px]">
                <span className="num text-[16px] text-fg-strong" data-testid="starmap-monthly">
                  {monthly != null ? `${zl(monthly)} / mies.` : '—'}
                </span>
                <span className="text-[11.5px] text-muted">
                  {monthly != null
                    ? 'Średnio do celów w ostatnich pełnych miesiącach budżetu (do 6). ETA zakłada to samo tempo.'
                    : 'Za mało historii: ETA pojawi się po pierwszym pełnym miesiącu budżetu.'}
                </span>
              </div>
            </Panel>
            <Panel title="Prognoza ICTTJ">
              <div className="flex flex-col gap-1 text-[12px]">
                {snap.status !== 'ok' ? (
                  <button className="self-start text-left text-muted hover:text-fg-strong" onClick={() => navigate({ page: 'settings', tab: 'ictj' })}>
                    {snap.status === 'off' ? 'Folder ICTTJ niewybrany – Ustawienia → ICTTJ ›' : `ICTTJ: ${snap.message ?? 'niedostępny'} ›`}
                  </button>
                ) : forecast ? (
                  <>
                    <span className="text-fg-strong" data-testid="starmap-scenario">
                      {forecast.name}
                    </span>
                    <span className="text-[11.5px] text-muted">
                      {countLabel(forecast.goals.filter((g) => g.enabled).length, 'cel', 'cele', 'celów')}; nazwy i kwoty zmieniasz w ICTTJ.{forecast.currency !== 'PLN' ? ` Scenariusz w ${forecast.currency} – cele bez kwoty w PLN.` : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">Brak scenariusza prognozy w ICTTJ.</span>
                )}
              </div>
            </Panel>
          </div>
        </Columns>
      </div>
      {moving && (
        <GoalMoneyDialog
          goal={moving.goal}
          amount={amounts.get(moving.goal.id) ?? 0}
          archive={moving.archive}
          others={active.filter((g) => g.id !== moving.goal.id)}
          onClose={() => setMoving(null)}
        />
      )}
    </div>
  )
}

/**
 * Where a goal's money goes (C2, B30): archiving a goal with money asks – to the shields, to another goal, or it stays
 * (then „przenieś środki” on the archived list later); an archived goal's money moved the same way.
 */
function GoalMoneyDialog({ goal, amount, archive, others, onClose }: { goal: Goal; amount: number; archive: boolean; others: readonly Goal[]; onClose: () => void }) {
  const [to, setTo] = useState<'shields' | 'goal' | 'stay'>('shields')
  const [goalTo, setGoalTo] = useState(others[0]?.id ?? '')
  const [moveAmount, setMoveAmount] = useState<number | null>(amount)
  const target: GoalMoneyTarget | null = to === 'stay' ? null : to === 'goal' ? goalTo || null : 'shields'
  const chosenAmount = moveAmount ?? 0
  const confirm = () => {
    if (to === 'goal' && !goalTo) return toast('Wybierz cel.', 'error')
    if (to !== 'stay' && (chosenAmount <= 0 || chosenAmount > amount)) return toast(`Podaj kwotę od 0,01 zł do ${zl(amount)}.`, 'error')
    if (archive) archiveGoal(goal, true, target ? { to: target, amount: chosenAmount } : null)
    else if (target) moveGoalMoney(goal, target, chosenAmount)
    onClose()
  }
  return (
    <Modal
      title={archive ? `Archiwizacja celu „${goal.name}”` : `Środki celu „${goal.name}”`}
      width={440}
      onClose={onClose}
      testId="starmap-money"
      footer={
        <>
          <span className="flex-1" />
          <button className="btn h-[26px]" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn btn-accent h-[26px]" disabled={(!archive && to === 'stay') || (to !== 'stay' && (chosenAmount <= 0 || chosenAmount > amount))} onClick={confirm} data-testid="starmap-money-ok">
            {archive ? 'Zarchiwizuj' : 'Przenieś'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-[12px]">
        <p>
          W celu jest <span className="num text-fg-strong">{zl(amount)}</span>.{archive ? ' Od dziś nie trafią do niego nowe pieniądze. Co z tymi, które są?' : ' Dokąd i ile przenieść?'}
        </p>
        {to !== 'stay' && (
          <label className="flex items-center gap-2">
            <span className="text-muted">Kwota do przeniesienia</span>
            <AmountField className="h-[24px] w-[120px]" value={moveAmount} onChange={setMoveAmount} aria-label="Kwota do przeniesienia" data-testid="starmap-money-amount" />
            <span className="text-muted">zł</span>
            {chosenAmount !== amount && (
              <button type="button" className="text-[11px] text-accent hover:underline" onClick={() => setMoveAmount(amount)} data-testid="starmap-money-full">
                całość ({zl(amount)})
              </button>
            )}
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="radio" checked={to === 'shields'} onChange={() => setTo('shields')} data-testid="starmap-money-shields" />
          do osłon (bufor)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={to === 'goal'} disabled={!others.length} onChange={() => setTo('goal')} data-testid="starmap-money-goal" />
          do celu
          <select className="input h-[24px] min-w-0 flex-1" value={goalTo} disabled={to !== 'goal'} onChange={(e) => setGoalTo(e.currentTarget.value)} aria-label="Cel">
            {others.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        {archive && (
          <label className="flex items-center gap-2">
            <input type="radio" checked={to === 'stay'} onChange={() => setTo('stay')} data-testid="starmap-money-stay" />
            zostaw w celu (przeniesiesz później albo wydasz z tego celu)
          </label>
        )}
      </div>
    </Modal>
  )
}

function GoalRow({
  goal: g,
  index,
  count,
  amount,
  eta,
  pace,
  readOnly: folderLocked,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  scenario,
  dol,
  dolPool,
  month,
  onMoveMoney,
  onArchive
}: {
  goal: Goal
  index: number
  count: number
  amount: number
  eta: string | null
  pace: number | null
  readOnly: boolean
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
  scenario: string | null
  dol: boolean
  dolPool: boolean
  month: string
  onMoveMoney: () => void
  onArchive: () => void
}) {
  // Written by a newer version of the app (B67): looked at, not changed here.
  const newer = useEntryNewer('goals', g.id)
  const readOnly = folderLocked || newer
  const ictj = g.source === 'ictj'
  const noTarget = g.target <= 0
  const reached = !noTarget && amount >= g.target
  // Past its deadline only while not reached (B87); the accent, never the red of money (T74).
  const late = goalLate({ amount, target: g.target, deadline: g.deadline }, eta, pace, month)
  // An ICTTJ goal without a price (N46): ICTTJ's rule – everything of the pool Cele in its month.
  const allIn = ictj && g.ictj != null && g.ictj.amount == null
  return (
    <div
      className={cx('flex flex-col gap-1 border-b border-line/60 px-1 py-1.5 last:border-b-0', dragging && 'opacity-40')}
      draggable={!readOnly}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      data-testid="starmap-goal"
      data-name={g.name}
      data-focus={`goal:${g.id}`}
    >
      <div className="flex items-center gap-2">
        <span className="num w-[18px] cursor-grab text-[11px] text-dim" title="Przeciągnij, żeby zmienić kolejność">
          {index + 1}
        </span>
        {ictj || readOnly ? (
          <span className="min-w-0 flex-1 truncate text-fg-strong">{g.name}</span>
        ) : (
          <NameInput className="h-[24px] min-w-0 flex-1" value={g.name} maxLength={80} emptyMessage="Cel musi mieć nazwę." onChange={(name) => patchGoal(g.id, { name })} aria-label="Nazwa celu" />
        )}
        {ictj && (
          <Badge tone="accent" title={scenario ? `Cel scenariusza „${scenario}” w ICTTJ (tylko do odczytu)` : 'Cel z prognozy ICTTJ (tylko do odczytu)'}>
            ICTTJ
          </Badge>
        )}
        {dol && (
          <Badge title="Draw on Liquidity – tu popłynie następna dostawa do celów" data-testid="starmap-dol">
            DOL
          </Badge>
        )}
        {dolPool && (
          <Badge title="Następna wypłata z puli Cele w ICTTJ trafi najpierw tutaj – do pierwszego niepełnego celu z prognozy ICTTJ" data-testid="starmap-dol-pool">
            DOL · pula Cele
          </Badge>
        )}
        <span className="flex gap-0.5">
          <button className="btn btn-ghost h-[20px] px-1 text-[11px]" disabled={readOnly || index === 0} onClick={() => moveUp(g.id)} title="Wyżej" data-testid="starmap-up">
            ▲
          </button>
          <button className="btn btn-ghost h-[20px] px-1 text-[11px]" disabled={readOnly || index === count - 1} onClick={() => moveDown(g.id)} title="Niżej" data-testid="starmap-down">
            ▼
          </button>
        </span>
      </div>
      <div className="flex items-center gap-2 pl-[26px]">
        <span className="num text-fg-strong" data-testid="starmap-amount">
          {zl(amount)}
        </span>
        <span className="text-dim">/</span>
        {ictj || readOnly ? (
          <span className="num text-muted" title={allIn ? 'Cel bez kwoty w ICTTJ: bierze wszystkie wypłaty z puli Cele w swoim miesiącu' : undefined} data-testid="starmap-no-target">
            {noTarget
              ? allIn
                ? `bez kwoty – pula Cele${g.deadline ? ` w ${monthLabel(g.deadline)}` : ''}`
                : g.ictj?.currency && g.ictj.currency !== 'PLN'
                  ? `${plnText(g.ictj.amount ?? 0)} ${g.ictj.currency} – bez kwoty w PLN`
                  : 'bez kwoty'
              : zl(g.target)}
          </span>
        ) : (
          <AmountField
            className="h-[22px] w-[110px]"
            value={g.target}
            // A goal needs its amount (N48): 0 would drop it from the docking without a word – archive it instead.
            onChange={(v) => (v != null && v > 0 ? patchGoal(g.id, { target: v }) : toast('Podaj kwotę celu – cel bez kwoty nie dostaje dostaw (zarchiwizuj go, jeśli już niepotrzebny).', 'error'))}
            aria-label="Kwota celu"
            data-testid="starmap-target"
          />
        )}
        <span className="flex-1" />
        <span
          className={cx('text-[11.5px]', late ? 'text-accent' : 'text-muted')}
          data-testid="starmap-eta"
          data-late={late || undefined}
          title={late ? (eta || pace ? 'Przy obecnym tempie cel będzie po terminie' : 'Termin minął, a cel nie jest pełny') : undefined}
        >
          {noTarget
            ? ''
            : reached
              ? 'osiągnięty'
              : eta
                ? `ETA ${monthLabel(eta)}${late ? ' – po terminie' : ''}`
                : pace
                  ? `ponad 50 lat${late ? ' – po terminie' : ''}`
                  : late
                    ? 'po terminie'
                    : 'ETA —'}
        </span>
        {!ictj && !readOnly ? (
          // A month typed whole, saved on leaving the field (W2): never a save per key.
          <MonthField className="h-[22px] w-[90px]" value={g.deadline} allowEmpty onChange={(deadline) => patchGoal(g.id, { deadline })} placeholder="termin" aria-label="Termin celu" />
        ) : (
          g.deadline && <span className="text-[11.5px] text-dim">termin {monthLabel(g.deadline)}</span>
        )}
        {amount > 0 && !readOnly && (
          <button className="btn btn-ghost h-[20px] px-1.5 text-[11px]" onClick={onMoveMoney} title="Przenieś część lub całość środków celu bez archiwizacji" data-testid="goal-move-funds">
            przenieś środki
          </button>
        )}
        {!ictj && !readOnly && (
          <button className="btn btn-ghost h-[20px] px-1.5 text-[11px]" onClick={onArchive} title="Zarchiwizuj cel" data-testid="starmap-archive">
            archiwizuj
          </button>
        )}
        <HistoryButton kind="goals" id={g.id} current={g} variant="icon" />
      </div>
      <div className="pl-[26px]">
        <Meter value={amount} max={noTarget ? null : g.target} />
        {g.deadline && !noTarget && !reached && <GoalCourse goal={g} amount={amount} pace={pace} month={month} readOnly={readOnly} />}
        <NewerNote show={newer} />
      </div>
    </div>
  )
}

/**
 * The rate a goal with a deadline needs (F15, D87): what it lacks over the months to its deadline from next month's
 * salary on, beside its pace; „rata z pensji” takes it from each salary after the tanks – only while the shields and the
 * hull are full at the month's turn (D13: they first).
 */
function GoalCourse({ goal: g, amount, pace, month, readOnly }: { goal: Goal; amount: number; pace: number | null; month: string; readOnly: boolean }) {
  const next = addMonths(month, 1)
  const deadline = g.deadline!
  const need = g.target - amount
  const rated = ratedIn(g.rates, next)
  const months = monthsBetween(next, deadline) + 1
  const rate = goalInstallment(need, next, deadline)
  const short = pace != null && rate > pace
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 text-[11.5px]" data-testid="starmap-need">
      {deadline < next ? (
        <span className="text-muted">
          {deadline < month ? 'termin minął' : 'termin w tym miesiącu'} – brakuje {zl(need)}
        </span>
      ) : (
        <span className={cx(short ? 'text-accent' : 'text-muted')} title={`${zl(need)} do ${monthGenLabel(deadline)} – ${countLabel(months, 'pensja', 'pensje', 'pensji')} od ${monthGenLabel(next)}`}>
          kurs przechwycenia: {zl(rate)}/mies. do {deadline.slice(5, 7)}.{deadline.slice(0, 4)}
          {pace != null ? ` · tempo ${zl(pace)}/mies.` : ''}
        </span>
      )}
      {deadline >= next && (
        <Toggle
          checked={rated}
          disabled={readOnly}
          onChange={(on) => setGoalRate(g.id, on)}
          label={<span title="Rata z każdej pensji po zbiornikach – tylko gdy osłony i kadłub są pełne na przełomie miesiąca">rata z pensji</span>}
          data-testid="starmap-rate"
        />
      )}
    </div>
  )
}

/** The arrows: one place up or down the list. */
function moveUp(id: string): void {
  const list = orderedIds()
  const i = list.indexOf(id)
  if (i > 0) moveGoal(id, list[i - 1]!)
}

function moveDown(id: string): void {
  const list = orderedIds()
  const i = list.indexOf(id)
  if (i < 0 || i >= list.length - 1) return
  moveGoal(id, list[i + 2] ?? null)
}

function orderedIds(): string[] {
  const goals = Object.values(useData.getState().records.goals)
    .map((e) => e.record)
    .filter((g) => !g.archived)
  return byPriority(goals).map((g) => g.id)
}

function NewGoal({ readOnly }: { readOnly: boolean }) {
  // Kept while another screen is looked at (N36).
  const [g, setG, clearG] = useDraft<{ name: string; target: number | null; deadline: string }>('starmap:newGoal', () => ({ name: '', target: null, deadline: '' }))
  const { name, target, deadline } = g
  const setName = (v: string) => setG((x) => ({ ...x, name: v }))
  const setTarget = (v: number | null) => setG((x) => ({ ...x, target: v }))
  const setDeadline = (v: string) => setG((x) => ({ ...x, deadline: v }))
  const add = () => {
    if (!name.trim()) return toast('Podaj nazwę celu.', 'error')
    if (!target || target <= 0) return toast('Podaj kwotę celu.', 'error')
    addGoal({ name, target, deadline: deadline || null })
    toast(`Nowy cel „${name.trim()}” na końcu listy.`, 'success')
    clearG()
  }
  return (
    <Panel title="Nowy cel" testId="starmap-new">
      <div className="flex flex-col gap-2 text-[12px]">
        <input className="input h-[26px]" placeholder="Nazwa, np. Rower" value={name} maxLength={80} disabled={readOnly} onChange={(e) => setName(e.currentTarget.value)} data-testid="starmap-new-name" />
        <div className="flex items-center gap-2">
          <AmountField className="h-[26px] w-[130px]" value={target} allowEmpty onChange={setTarget} aria-label="Kwota nowego celu" data-testid="starmap-new-target" />
          <input type="month" className="input h-[26px] w-[150px]" value={deadline} disabled={readOnly} onChange={(e) => setDeadline(e.currentTarget.value)} aria-label="Termin nowego celu" />
        </div>
        <button className="btn btn-accent h-[26px] self-start" disabled={readOnly} onClick={add} data-testid="starmap-new-add">
          Dodaj cel
        </button>
        <p className="text-[11px] text-dim">Nowy cel trafia na koniec listy; kolejność zmienisz przeciąganiem albo strzałkami.</p>
      </div>
    </Panel>
  )
}
