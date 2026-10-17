/**
 * Mapa gwiezdna (spec, „Ekrany”; E5, D72): the goals as star systems – those of the chosen ICTTJ scenario (read only:
 * name and amount from ICTTJ) and the own ones – on one priority list (drag, or the arrows), each with its money
 * against its target, its month and the ETA at the pace of the last months.
 */
import { useMemo, useState } from 'react'
import { byPriority, goalEtas, goalInflow } from '@shared/calc/goals'
import { chosenForecast } from '@shared/ictj'
import type { Goal } from '@shared/schema'
import { useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useIctj } from '../../store/ictj'
import { useRecordList } from '../../store/records'
import { navigate, toast } from '../../store/ui'
import { AmountField, plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Columns } from '../../components/layout'
import { Badge, Empty, NameInput, Panel, cx } from '../../components/ui'
import { countLabel, monthLabel } from '../../lib/format'
import { addGoal, archiveGoal, moveGoal, patchGoal } from './actions'

const zl = (g: number) => `${plnText(g)} zł`

export function StarMapPage() {
  const fleet = useFleet()
  const goalsAll = useRecordList('goals')
  const readOnly = useData((s) => !!s.status?.readOnly)
  const snap = useIctj((s) => s.snap)
  const forecastId = useData((s) => s.fi?.settings.ictj.forecastId ?? null)
  const active = useMemo(() => byPriority(goalsAll.filter((g) => !g.archived)), [goalsAll])
  const archived = useMemo(() => byPriority(goalsAll.filter((g) => g.archived)), [goalsAll])
  const amounts = useMemo(() => new Map((fleet?.goals ?? []).map((g) => [g.id, g.amount])), [fleet])
  const monthly = fleet ? goalInflow(fleet.log, fleet.started ? fleet.start : null, fleet.month) : null
  const etas = useMemo(() => (fleet ? goalEtas(active.map((g) => ({ id: g.id, amount: amounts.get(g.id) ?? 0, target: g.target })), monthly, fleet.month) : {}), [fleet, active, amounts, monthly])
  const [dragged, setDragged] = useState<string | null>(null)
  if (!fleet) return <Empty>Wczytywanie…</Empty>
  const forecast = snap.status === 'ok' ? chosenForecast(snap.forecasts, forecastId) : null
  const total = active.reduce((n, g) => n + (amounts.get(g.id) ?? 0), 0)

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-starmap">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Mapa gwiezdna</h1>
        <span className="text-[12px] text-muted">cele – układy gwiezdne</span>
        <span className="flex-1" />
        <span className="text-[12px] text-muted">
          w celach <span className="num text-fg-strong">{zl(total)}</span>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="starmap" tracks={['minmax(460px,2fr)', 'minmax(280px,1fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <Panel title="Kolejność wypełniania" testId="starmap-goals">
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
                    <div key={g.id} className="flex items-baseline gap-2 border-b border-line/60 py-1 last:border-b-0" data-testid="starmap-archived-row">
                      <span className="min-w-0 flex-1 truncate">{g.name}</span>
                      {g.source === 'ictj' ? <span className="text-[11px] text-dim">poza wybranym scenariuszem ICTTJ</span> : null}
                      <span className="num text-muted">{zl(amounts.get(g.id) ?? 0)}</span>
                      {g.source === 'own' && !readOnly && (
                        <button className="text-[11.5px] text-accent hover:underline" onClick={() => archiveGoal(g, false)}>
                          przywróć
                        </button>
                      )}
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] text-dim">Środki zarchiwizowanego celu zostają w nim (wydatek z tego celu je zużywa); nowe dostawy już do niego nie trafiają.</p>
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
    </div>
  )
}

function GoalRow({
  goal: g,
  index,
  count,
  amount,
  eta,
  pace,
  readOnly,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  scenario
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
}) {
  const ictj = g.source === 'ictj'
  const noTarget = g.target <= 0
  const late = !!eta && !!g.deadline && eta > g.deadline
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
          <span className="num text-muted">{noTarget ? (g.ictj?.currency && g.ictj.currency !== 'PLN' ? `${plnText(g.ictj.amount ?? 0)} ${g.ictj.currency} – bez kwoty w PLN` : 'bez kwoty') : zl(g.target)}</span>
        ) : (
          <AmountField className="h-[22px] w-[110px]" value={g.target} onChange={(v) => v != null && patchGoal(g.id, { target: v })} aria-label="Kwota celu" data-testid="starmap-target" />
        )}
        <span className="flex-1" />
        <span className={cx('text-[11.5px]', late ? 'text-down' : 'text-muted')} data-testid="starmap-eta" title={late ? 'Przy obecnym tempie cel będzie po terminie' : undefined}>
          {noTarget ? '' : amount >= g.target ? 'osiągnięty' : eta ? `ETA ${monthLabel(eta)}` : pace ? 'ponad 50 lat' : 'ETA —'}
        </span>
        {!ictj && !readOnly ? (
          <input
            type="month"
            className="input h-[22px] w-[130px]"
            value={g.deadline ?? ''}
            onChange={(e) => patchGoal(g.id, { deadline: e.currentTarget.value || null })}
            aria-label="Termin celu"
            title="Termin (opcjonalnie)"
          />
        ) : (
          g.deadline && <span className="text-[11.5px] text-dim">termin {monthLabel(g.deadline)}</span>
        )}
        {!ictj && !readOnly && (
          <button className="btn btn-ghost h-[20px] px-1.5 text-[11px]" onClick={() => archiveGoal(g, true)} title="Zarchiwizuj cel" data-testid="starmap-archive">
            archiwizuj
          </button>
        )}
      </div>
      <div className="pl-[26px]">
        <Meter value={amount} max={noTarget ? null : g.target} />
      </div>
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
  const [name, setName] = useState('')
  const [target, setTarget] = useState<number | null>(null)
  const [deadline, setDeadline] = useState('')
  const add = () => {
    if (!name.trim()) return toast('Podaj nazwę celu.', 'error')
    if (!target || target <= 0) return toast('Podaj kwotę celu.', 'error')
    addGoal({ name, target, deadline: deadline || null })
    toast(`Nowy cel „${name.trim()}” na końcu listy.`, 'success')
    setName('')
    setTarget(null)
    setDeadline('')
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
