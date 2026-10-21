// adapted from ICTTJ src/renderer/features/history/HistoryDialog.tsx @ 84a8339
import { useEffect, useMemo, useState } from 'react'
import type { HistoryEntry, HistoryKind } from '@shared/api'
import { diffRecords, fieldLabel, formatValue, isAmountPath, type FieldChange, type Path } from '@shared/merge'
import type { SettingsFile } from '@shared/schema'
import { api } from '../../lib/api'
import { recordTitle } from '../../lib/recordTitle'
import { useData, useFolderLocked } from '../../store/data'
import { IconHistory } from '../../components/icons'
import { plnText } from '../../components/fields'
import { Modal } from '../../components/Modal'
import { Badge, cx } from '../../components/ui'
import { restoreVersion } from './actions'

const REASON: Record<HistoryEntry['reason'], string> = {
  edit: 'przed edycją',
  delete: 'usunięty',
  restore: 'przed przywróceniem',
  import: 'przed importem',
  merge: 'przed scaleniem',
  discarded: 'odrzucona przy scalaniu',
  undo: 'usunięty przy cofnięciu importu'
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '—')

/**
 * id → name of every named item (categories, accounts, household members, containers, goals, loans – N92), so changed
 * references read as names.
 */
export function useDictNames(): Map<string, string> {
  const fi = useData((s) => s.fi)
  const containers = useData((s) => s.records.containers)
  const goals = useData((s) => s.records.goals)
  const loans = useData((s) => s.records.loans)
  return useMemo(() => dictNames(fi, [containers, goals, loans]), [fi, containers, goals, loans])
}

type Named = Record<string, { record: { id: string; name?: unknown } }> | undefined

export function dictNames(fi: SettingsFile | null, records: readonly Named[] = []): Map<string, string> {
  const out = new Map<string, string>()
  const add = (item: unknown) => {
    const x = item as { id?: unknown; name?: unknown } | null
    if (x && typeof x === 'object' && typeof x.id === 'string' && typeof x.name === 'string') out.set(x.id, x.name)
  }
  for (const map of records) for (const e of Object.values(map ?? {})) add(e.record)
  if (!fi) return out
  // Every list of settings items with an id and a name (categories, accounts, layers…), the household's members too.
  for (const v of Object.values(fi.settings as Record<string, unknown>)) if (Array.isArray(v)) v.forEach(add)
  fi.settings.household.members.forEach(add)
  return out
}

export function displayValue(v: unknown, names: Map<string, string>, path?: Path): string {
  // An amount in grosze (B7): in złoty, hidden with the amounts (Ctrl+$).
  if (path && typeof v === 'number' && isAmountPath(path)) return `${plnText(v)} zł`
  if (typeof v === 'string' && names.has(v)) return names.get(v)!
  if (Array.isArray(v) && v.length && v.every((x) => typeof x === 'string' && names.has(x))) return v.map((x) => names.get(x as string)).join(', ')
  return formatValue(v)
}

/** Field-by-field list of changes: label, value before, value after. */
export function ChangeList({ changes, beforeLabel, afterLabel, testId }: { changes: FieldChange[]; beforeLabel: string; afterLabel: string; testId?: string }) {
  const names = useDictNames()
  if (changes.length === 0) return <div className="py-3 text-center text-[12px] text-muted">Bez różnic w treści (zmienił się tylko czas zapisu).</div>
  return (
    <div className="border border-line text-[11.5px]" data-testid={testId}>
      <div className="grid grid-cols-[180px_1fr_1fr] gap-2 border-b border-line bg-raised px-2 py-1 text-[10.5px] tracking-wide text-muted uppercase">
        <span>Pole</span>
        <span>{beforeLabel}</span>
        <span>{afterLabel}</span>
      </div>
      {changes.slice(0, 80).map((c) => (
        <div key={c.path.join('.')} className="grid grid-cols-[180px_1fr_1fr] gap-2 border-b border-line/60 px-2 py-0.5 last:border-b-0" data-testid="change-row">
          <span className="truncate text-muted" title={c.path.join('.')}>
            {fieldLabel(c.path, names)}
          </span>
          <span className="truncate" title={displayValue(c.before, names, c.path)}>
            {displayValue(c.before, names, c.path)}
          </span>
          <span className="truncate text-fg-strong" title={displayValue(c.after, names, c.path)}>
            {displayValue(c.after, names, c.path)}
          </span>
        </div>
      ))}
      {changes.length > 80 && <div className="px-2 py-1 text-muted">… i {changes.length - 80} innych zmian</div>}
    </div>
  )
}

/** Versions of one record with the differences against the current one; any version can be made current. */
export function HistoryDialog({ kind, id, current, onClose, readOnly: shown = false }: { kind: HistoryKind; id: string; current: unknown; onClose: () => void; readOnly?: boolean }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [version, setVersion] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  // A preview (the phone's plan and radar) shows the versions, never restores one.
  const readOnly = useFolderLocked() || shown

  useEffect(() => {
    let alive = true
    api.historyList(kind, id).then(
      (list) => {
        if (!alive) return
        setEntries(list)
        setSelected(list[0]?.file ?? null)
      },
      () => alive && setEntries([])
    )
    return () => {
      alive = false
    }
  }, [kind, id])

  useEffect(() => {
    let alive = true
    setVersion(null)
    if (selected) void api.historyRead(kind, id, selected).then((r) => alive && setVersion(r))
    return () => {
      alive = false
    }
  }, [kind, id, selected])

  const changes = useMemo(() => (version ? diffRecords(version, current) : []), [version, current])
  const entry = entries?.find((e) => e.file === selected) ?? null

  return (
    <Modal
      title={
        <span className="flex items-center gap-2 normal-case">
          <IconHistory size={13} /> Historia zmian – {recordTitle(kind, current)}
        </span>
      }
      onClose={onClose}
      width={980}
      testId="history-dialog"
      footer={
        <>
          <span className="text-[11.5px] text-muted">
            Wersje zostają zapisane przed każdą zmianą (najwyżej co 10 min edycji, zawsze gdy zapisał je inny komputer) i przed usunięciem – w folderze
            .history obok danych.
          </span>
          <button
            className="btn btn-accent ml-auto"
            disabled={!entry || busy || readOnly}
            onClick={async () => {
              if (!entry) return
              setBusy(true)
              const ok = await restoreVersion(kind, id, entry.file, `wersja z ${when(entry.updatedAt ?? entry.savedAt)}`)
              setBusy(false)
              if (ok) onClose()
            }}
            data-testid="history-restore"
          >
            Przywróć tę wersję
          </button>
        </>
      }
    >
      {entries == null ? (
        <div className="py-6 text-center text-muted">Wczytywanie…</div>
      ) : entries.length === 0 ? (
        <div className="py-6 text-center text-muted" data-testid="history-empty">
          Brak zapisanych wcześniejszych wersji tego wpisu.
        </div>
      ) : (
        <div className="grid grid-cols-[250px_minmax(0,1fr)] gap-3">
          <div className="flex max-h-[60vh] flex-col overflow-y-auto border border-line">
            {entries.map((e) => (
              <button
                key={e.file}
                className={cx('flex flex-col items-start gap-0.5 border-b border-line/60 px-2 py-1.5 text-left last:border-b-0', e.file === selected ? 'bg-accent-soft' : 'hover:bg-hover')}
                onClick={() => setSelected(e.file)}
                data-testid="history-version"
              >
                <span className="num text-[12px] text-fg-strong">{when(e.updatedAt ?? e.savedAt)}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  {e.updatedBy ?? 'nieznany komputer'}
                  <Badge>{REASON[e.reason] ?? e.reason}</Badge>
                </span>
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            {entry && (
              <div className="text-[11.5px] text-muted">
                Wersja zapisana {when(entry.updatedAt)} na komputerze <b className="text-fg">{entry.updatedBy ?? 'nieznany'}</b>, odłożona {when(entry.savedAt)} (
                {entry.savedBy ?? '?'}). Poniżej: co się zmieniło od tej wersji do obecnej.
              </div>
            )}
            {version ? <ChangeList changes={changes} beforeLabel="Ta wersja" afterLabel="Obecnie" testId="history-changes" /> : <div className="text-muted">Wczytywanie…</div>}
          </div>
        </div>
      )}
    </Modal>
  )
}

/** "Historia" button that opens the dialog. */
export function HistoryButton({
  kind,
  id,
  current,
  disabled,
  readOnly,
  small,
  variant = 'button'
}: {
  kind: HistoryKind
  id: string
  current: unknown
  disabled?: boolean
  /** The versions shown without „Przywróć” (a preview). */
  readOnly?: boolean
  small?: boolean
  /** 'icon' – in a narrow row (a goal), 'link' – among a row's text links (a loan, a balance). */
  variant?: 'button' | 'icon' | 'link'
}) {
  const [open, setOpen] = useState(false)
  const className = variant === 'link' ? 'hover:text-fg-strong' : variant === 'icon' ? 'btn btn-ghost h-[20px] px-1' : cx('btn', small && 'h-[22px]')
  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => setOpen(true)} title="Wcześniejsze wersje tego wpisu" data-testid="history-open">
        {variant === 'link' ? (
          'historia'
        ) : variant === 'icon' ? (
          <IconHistory size={12} />
        ) : (
          <>
            <IconHistory size={13} /> Historia
          </>
        )}
      </button>
      {open && <HistoryDialog kind={kind} id={id} current={current} readOnly={readOnly} onClose={() => setOpen(false)} />}
    </>
  )
}

