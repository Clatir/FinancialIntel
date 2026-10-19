/**
 * „Dziennik zmian” (1.7.0, F33): the folder's records changed lately – on this computer or another – newest first, for
 * today, 7 or 30 days, by computer and kind. A row opens what changed against the version before it (the record's
 * history) and can take that version back; the record itself opens on its screen.
 */
import { useEffect, useMemo, useState } from 'react'
import type { HistoryEntry } from '@shared/api'
import { changeLog, changeLogMachines, CHANGELOG_KIND_LABEL, CHANGELOG_KINDS, type ChangeLogEntry, type ChangeLogKind } from '@shared/changeLog'
import { warsawNow, warsawStartOf } from '@shared/calc/dates'
import { diffRecords } from '@shared/merge'
import type { Transaction } from '@shared/schema'
import { Badge, Panel, ShowMore } from '../../components/ui'
import { api } from '../../lib/api'
import { recordTitle } from '../../lib/recordTitle'
import { listOf, useData, useFolderLocked } from '../../store/data'
import { useMinute } from '../../store/fleet'
import { focusRecord, navigate } from '../../store/ui'
import { ChangeList } from '../history/HistoryDialog'
import { restoreVersion } from '../history/actions'
import { openOperation } from '../operations/state'

type Period = 'today' | 'week' | 'month'
const PERIOD_LABEL: Record<Period, string> = { today: 'dziś', week: '7 dni', month: '30 dni' }
const PAGE = 50

const when = (iso: string) => new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })

export function ChangeLogPanel() {
  const records = useData((s) => s.records)
  const fi = useData((s) => s.fi)
  // A save stamps its record in place (W26 – no new map): the log reads the stamps again after each save.
  const savedAt = useData((s) => s.save.lastSavedAt)
  const [period, setPeriod] = useState<Period>('today')
  const [machine, setMachine] = useState<string | null>(null)
  const [kind, setKind] = useState<ChangeLogKind | null>(null)
  const [limit, setLimit] = useState(PAGE)
  // „Dziś” moves on with the Warsaw day.
  const minute = useMinute()
  const since = useMemo(
    () => (period === 'today' ? warsawStartOf(warsawNow(new Date(minute)).date).toISOString() : new Date(minute - (period === 'week' ? 7 : 30) * 86_400_000).toISOString()),
    [period, minute]
  )
  const all = useMemo(
    () =>
      changeLog(
        {
          transactions: listOf(records.transactions),
          months: listOf(records.months),
          containers: listOf(records.containers),
          goals: listOf(records.goals),
          loans: listOf(records.loans),
          balances: listOf(records.balances),
          dockings: listOf(records.dockings),
          fi: fi ? [fi] : []
        },
        { since, machine: null, kind: null }
      ),
    [records, fi, since, savedAt]
  )
  const machines = useMemo(() => changeLogMachines(all), [all])
  const shown = all.filter((e) => (!machine || e.by === machine) && (!kind || e.kind === kind))
  return (
    <Panel
      title={`Dziennik zmian (${shown.length})`}
      name="Dziennik zmian"
      testId="sync-changelog"
      actions={
        <span className="flex items-center gap-1">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={period === p} onClick={() => setPeriod(p)} data-testid={`changelog-period-${p}`}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
          <select className="input h-[22px] w-[130px] py-0" value={machine ?? ''} onChange={(e) => setMachine(e.currentTarget.value || null)} aria-label="Komputer" data-testid="changelog-machine">
            <option value="">każdy komputer</option>
            {machines.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select className="input h-[22px] w-[130px] py-0" value={kind ?? ''} onChange={(e) => setKind((e.currentTarget.value || null) as ChangeLogKind | null)} aria-label="Rodzaj" data-testid="changelog-kind">
            <option value="">każdy rodzaj</option>
            {CHANGELOG_KINDS.map((k) => (
              <option key={k} value={k}>
                {CHANGELOG_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </span>
      }
    >
      {!shown.length ? (
        <div className="text-[12px] text-muted" data-testid="changelog-empty">
          Brak zmian {period === 'today' ? 'dziś' : `w ostatnich ${PERIOD_LABEL[period]}`}
          {machine || kind ? ' dla wybranych filtrów' : ''}.
        </div>
      ) : (
        <div className="flex flex-col" data-testid="changelog-list">
          {shown.slice(0, limit).map((e) => (
            <ChangeRow key={`${e.kind}:${e.id}`} entry={e} />
          ))}
          <ShowMore shown={Math.min(limit, shown.length)} total={shown.length} page={PAGE} onMore={() => setLimit((n) => n + PAGE)} testId="changelog-more" />
        </div>
      )}
      <p className="mt-1 text-[11px] text-dim">
        Ostatni zapis każdego wpisu i komputer, który go zrobił; „Zmiany” porównuje z wersją sprzed zmiany z historii (odkładaną najwyżej co 10 min edycji
        tego komputera, zawsze przy zmianie z innego komputera).
      </p>
    </Panel>
  )
}

function ChangeRow({ entry }: { entry: ChangeLogEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col border-b border-line/60 py-1 text-[12px] last:border-b-0" data-testid="changelog-row" data-kind={entry.kind}>
      <div className="flex items-center gap-2">
        <span className="num w-[110px] shrink-0 text-[11px] text-muted">{when(entry.at)}</span>
        <span className="w-[100px] shrink-0 truncate text-[11px] text-muted" title="Komputer, który zapisał">
          {entry.by ?? 'nieznany'}
        </span>
        <Badge>{CHANGELOG_KIND_LABEL[entry.kind]}</Badge>
        {entry.created && <Badge tone="accent">nowy</Badge>}
        <span className="min-w-0 flex-1 truncate">{recordTitle(entry.kind, entry.record)}</span>
        <OpenRecord entry={entry} />
        <button type="button" className="btn h-[22px]" aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid="changelog-changes">
          {open ? 'Zwiń' : 'Zmiany'}
        </button>
      </div>
      {open && <Changes entry={entry} />}
    </div>
  )
}

/** The record on its screen (an operation, a container, a goal, a loan, a plan, the settings). */
function OpenRecord({ entry }: { entry: ChangeLogEntry }) {
  const go: Partial<Record<ChangeLogKind, () => void>> = {
    transactions: () => openOperation(entry.record as Transaction),
    containers: () => focusRecord('container', entry.id, { page: 'cargo' }),
    goals: () => focusRecord('goal', entry.id, { page: 'starmap' }),
    loans: () => focusRecord('loan', entry.id, { page: 'radar' }),
    months: () => navigate({ page: 'month' }),
    fi: () => navigate({ page: 'settings' })
  }
  const run = go[entry.kind]
  if (!run) return null
  return (
    <button type="button" className="text-[11px] text-accent hover:underline" onClick={run} data-testid="changelog-open">
      pokaż
    </button>
  )
}

/** What changed against the version before (the newest one kept in the record's history), and that version back. */
function Changes({ entry }: { entry: ChangeLogEntry }) {
  const [before, setBefore] = useState<{ entry: HistoryEntry; record: unknown } | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const readOnly = useFolderLocked()
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const last = (await api.historyList(entry.kind, entry.id))[0]
        const record = last ? await api.historyRead(entry.kind, entry.id, last.file) : null
        if (alive) setBefore(last && record ? { entry: last, record } : null)
      } catch {
        if (alive) setBefore(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [entry.kind, entry.id, entry.at])
  const changes = useMemo(() => (before ? diffRecords(before.record, entry.record) : []), [before, entry.record])
  if (before === undefined) return <div className="py-1 text-[11.5px] text-muted">Wczytywanie historii…</div>
  if (!before)
    return (
      <div className="py-1 text-[11.5px] text-muted" data-testid="changelog-no-version">
        {entry.created ? 'Nowy wpis – nie ma wcześniejszej wersji.' : 'Historia nie ma wcześniejszej wersji tego wpisu.'}
      </div>
    )
  return (
    <div className="flex flex-col gap-1.5 py-1.5" data-testid="changelog-detail">
      <div className="flex items-center gap-2 text-[11.5px] text-muted">
        <span className="min-w-0 flex-1">
          Wersja sprzed zmiany: zapisana {before.entry.updatedAt ? when(before.entry.updatedAt) : '—'} ({before.entry.updatedBy ?? 'nieznany komputer'}), odłożona{' '}
          {when(before.entry.savedAt)} ({before.entry.savedBy ?? '?'}).
        </span>
        <button
          type="button"
          className="btn h-[22px]"
          disabled={busy || readOnly}
          onClick={async () => {
            setBusy(true)
            await restoreVersion(entry.kind, entry.id, before.entry.file, `${recordTitle(entry.kind, entry.record)} – wersja z ${when(before.entry.updatedAt ?? before.entry.savedAt)}`)
            setBusy(false)
          }}
          data-testid="changelog-take-back"
        >
          Weź poprzednią wersję
        </button>
      </div>
      <ChangeList changes={changes} beforeLabel="Przed zmianą" afterLabel="Teraz" testId="changelog-diff" />
    </div>
  )
}
