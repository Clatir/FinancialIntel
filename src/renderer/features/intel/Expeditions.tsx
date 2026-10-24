/**
 * Wywiad → „Wyprawy” (1.10.0, F17): every tag's money – a trip, a renovation, a gift across categories –, its card by
 * category and by month, its goal of the star map („Ekspedycja: wydano 4 320 z 5 000 zł celu”) and its operations in
 * Operacje.
 */
import { useState } from 'react'
import { glossaryOf } from '@shared/glossary'
import { tagGoalShare, tagKey, type TagSummary } from '@shared/calc/tags'
import { plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Empty, Panel, cx } from '../../components/ui'
import { monthLabel, plDate, plural } from '../../lib/format'
import { useData, useFolderLocked } from '../../store/data'
import { useRecordList } from '../../store/records'
import { linkTagOperationsToGoal, setTagGoal, showTag, unlinkedTagExpenses, useTagSummaries } from '../tags/state'

const zl = (g: number) => `${plnText(g)} zł`
const NO_GOALS: Record<string, string> = {}
/** The expeditions listed at first (the most recent); the rest a click away. */
const SHOWN = 8

export function ExpeditionsPanel() {
  const data = useTagSummaries()
  const tagGoals = useData((s) => s.fi?.settings.intel.tagGoals ?? NO_GOALS)
  const goals = useRecordList('goals')
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  if (!data) return null
  const { summaries, cats } = data
  const goalOf = (s: TagSummary) => goals.find((g) => g.id === tagGoals[s.key]) ?? null
  const shown = all ? summaries : summaries.slice(0, SHOWN)
  return (
    <Panel title="Wyprawy" hint={glossaryOf('Wyprawa')} testId="intel-expeditions">
      {!summaries.length ? (
        <Empty>Brak tagów – dodaj tag w operacji (pole „Tagi”), w szybkim wpisie (#słowo) albo w regule importu. Wyprawa zbierze koszt z wielu kategorii.</Empty>
      ) : (
        <div className="flex flex-col text-[12px]">
          {shown.map((s) => {
            const goal = goalOf(s)
            const share = goal ? tagGoalShare(s.spent, goal.target) : null
            return (
              <div key={s.key} className="flex flex-col border-b border-line/60 py-1 last:border-b-0" data-testid="intel-expedition" data-tag={s.label}>
                <button type="button" className="flex items-baseline gap-2 text-left hover:text-fg-strong" onClick={() => setOpen(open === s.key ? null : s.key)} data-testid="intel-expedition-open">
                  <span className="min-w-0 flex-1 truncate text-fg-strong">#{s.label}</span>
                  <span className="text-[11px] text-dim">
                    {plDate(s.first)}
                    {s.last !== s.first ? ` – ${plDate(s.last)}` : ''} · {s.count} {plural(s.count, 'operacja', 'operacje', 'operacji')}
                  </span>
                  <span className="num w-[100px] text-right" data-testid="intel-expedition-spent">
                    {zl(s.spent)}
                  </span>
                </button>
                {goal && goal.target > 0 && (
                  <div className="flex flex-col gap-0.5 pt-0.5" data-testid="intel-expedition-goal">
                    <span className="text-[11px] text-muted">
                      Ekspedycja „{goal.name}”: wydano {zl(s.spent)} z {zl(goal.target)} celu
                      {share != null && share > 1 ? <span className="text-accent"> · ponad cel o {zl(s.spent - goal.target)}</span> : null}
                    </span>
                    <Meter value={s.spent} max={goal.target} over />
                  </div>
                )}
                {open === s.key && <ExpeditionCard s={s} label={cats.label} />}
              </div>
            )
          })}
          {summaries.length > SHOWN && (
            <button type="button" className="self-start pt-1 text-[11.5px] text-accent hover:underline" onClick={() => setAll(!all)} data-testid="intel-expeditions-more">
              {all ? 'pokaż ostatnie' : `pokaż wszystkie (${summaries.length})`}
            </button>
          )}
          <span className="pt-1 text-[11px] text-dim">Wydane netto – zwrot (np. zaliczki) odejmuje. Część paragonu domownika nie jest Twoim kosztem.</span>
        </div>
      )}
    </Panel>
  )
}

/** A tag's card: by category, by month, its goal, its operations. */
function ExpeditionCard({ s, label }: { s: TagSummary; label: (id: string | null) => string }) {
  const goals = useRecordList('goals')
  const transactions = useRecordList('transactions')
  const tagGoals = useData((x) => x.fi?.settings.intel.tagGoals ?? NO_GOALS)
  const readOnly = useFolderLocked()
  const goalId = tagGoals[tagKey(s.label)] ?? ''
  const goal = goals.find((g) => g.id === goalId) ?? null
  const unlinked = goalId ? unlinkedTagExpenses(s.label, transactions) : []
  const byCategory = [...s.byCategory].filter(([, v]) => v).sort((a, b) => b[1] - a[1])
  const byMonth = [...s.byMonth].filter(([, v]) => v).sort((a, b) => a[0].localeCompare(b[0]))
  const max = Math.max(1, ...byCategory.map(([, v]) => Math.abs(v)))
  return (
    <div className="mt-1 flex flex-col gap-1.5 border-l-2 border-line-strong pl-2 text-[11.5px]" data-testid="intel-expedition-card">
      <div className="flex flex-col gap-0.5" data-testid="intel-expedition-categories">
        {byCategory.map(([id, v]) => (
          <div key={id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{id === '-' ? 'bez kategorii' : label(id)}</span>
            <div className="h-[3px] w-[60px] bg-line">
              <div className={cx('h-full', v < 0 ? 'bg-up' : 'bg-accent/70')} style={{ width: `${Math.round((Math.abs(v) / max) * 100)}%` }} />
            </div>
            <span className="num w-[90px] text-right">{zl(v)}</span>
          </div>
        ))}
      </div>
      {byMonth.length > 1 && (
        <div className="flex flex-wrap gap-x-3 text-muted" data-testid="intel-expedition-months">
          {byMonth.map(([m, v]) => (
            <span key={m}>
              {monthLabel(m)}: <span className="num text-fg">{zl(v)}</span>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted">Cel z Mapy gwiezdnej</span>
        <select className="input h-[24px] w-[200px] py-0" value={goalId} disabled={readOnly} onChange={(e) => setTagGoal(s.label, e.currentTarget.value || null)} aria-label="Cel wyprawy" data-testid="intel-expedition-goal-select">
          <option value="">— bez celu —</option>
          {goals
            .filter((g) => !g.archived || g.id === goalId)
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
                {g.archived ? ' (archiwum)' : ''}
              </option>
            ))}
        </select>
        <button type="button" className="btn h-[24px]" onClick={() => showTag(s.label)} data-testid="intel-expedition-operations">
          Pokaż w Operacjach
        </button>
        {goal && unlinked.length > 0 && (
          <button
            type="button"
            className="btn h-[24px]"
            disabled={readOnly}
            onClick={() => linkTagOperationsToGoal(s.label, goal.id, goal.name)}
            title="Ustaw ten cel w polu „Z celu” operacji tej wyprawy – ich koszt zejdzie ze środków celu zamiast z energii i kopert"
            data-testid="intel-expedition-link-goal"
          >
            Rozlicz z celu ({unlinked.length})
          </button>
        )}
      </div>
    </div>
  )
}
