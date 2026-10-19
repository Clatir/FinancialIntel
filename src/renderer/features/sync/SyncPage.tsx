// adapted from ICTTJ src/renderer/features/sync/SyncPage.tsx @ 84a8339
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelection, type Selection } from '../../lib/selection'
import type { ConflictEntry, HistoryEntry, HistoryKind, Problem } from '@shared/api'
import { COLLECTIONS, type Collection } from '@shared/paths'
import { newerSide, newestResolutions } from '@shared/conflicts'
import { chooser, deepEqual, diffRecords, fieldLabel, formatValue, isAmountPath, merge3, pathKey, valueAt, type MergeConflict, type Side } from '@shared/merge'
import { plnText } from '../../components/fields'
import { recordTitle } from '../../lib/recordTitle'
import { ChangeList, HistoryButton, useDictNames } from '../history/HistoryDialog'
import { restoreVersion } from '../history/actions'
import { api, errorMessage } from '../../lib/api'
import { saveFirst, useData, useFolderLocked } from '../../store/data'
import { toast } from '../../store/ui'
import { IconFolder, IconSync, IconTrash } from '../../components/icons'
import { Badge, Panel, cx } from '../../components/ui'
import { ChangeLogPanel } from './ChangeLog'

const KIND_LABEL: Record<string, string> = {
  transactions: 'Operacja',
  containers: 'Kontener',
  goals: 'Cel',
  months: 'Plan miesiąca',
  dockings: 'Dokowanie',
  loans: 'Pożyczka',
  balances: 'Saldo',
  game: 'Dowództwo',
  imports: 'Import z banku',
  scheduled: 'Boja (zaplanowane)',
  fi: 'Ustawienia (fi.json)'
}
const PROBLEM_LABEL: Record<string, string> = {
  corrupt: 'uszkodzony',
  invalid: 'zła struktura',
  'too-new': 'nowszy format',
  'unknown-file': 'nieznany plik'
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })

/**
 * The base of a conflict's merge (N17): the newest version in the history saved before either side's change (its
 * `updatedAt` not later than both); none = every difference is a question.
 */
async function mergeBase(c: ConflictEntry): Promise<unknown> {
  const id = (c.canonical.record as { id?: string } | null)?.id
  const limit = [c.canonical.updatedAt, c.copy.updatedAt]
  if (!id || limit.some((t) => !t)) return undefined
  const until = limit.sort()[0]!
  try {
    const entry = (await api.historyList(c.kind as HistoryKind, id)).filter((e) => e.updatedAt && e.updatedAt <= until).sort((a, b) => b.updatedAt!.localeCompare(a.updatedAt!))[0]
    return entry ? await api.historyRead(c.kind as HistoryKind, id, entry.file) : undefined
  } catch {
    return undefined
  }
}

const shownValue = (path: readonly string[], v: unknown) => (typeof v === 'number' && isAmountPath([...path]) ? `${plnText(v)} zł` : formatValue(v))

/**
 * „Scal” (N17): the two versions joined field by field – every field that differs is a choice, never taken silently: a
 * version of the history found as the base may be one side's own earlier edit, not what both started from. The base
 * only proposes the side that changed the field; changed on both (or no base) – the newer side.
 */
function ConflictMerge({ c, onClose, busy, setBusy }: { c: ConflictEntry; onClose: () => void; busy: boolean; setBusy: (b: boolean) => void }) {
  const [state, setState] = useState<{ fields: MergeConflict[]; choices: Record<string, Side> } | null>(null)
  const names = useDictNames()
  const readOnly = useFolderLocked()
  // Every change of the folder brings new conflict objects: only other versions of the two files start it again.
  const seen = useRef(c)
  seen.current = c
  const versions = `${c.id}|${c.canonical.mtimeMs}|${c.copy.mtimeMs}`
  useEffect(() => {
    let alive = true
    const now = seen.current
    void mergeBase(now).then((base) => {
      if (!alive) return
      const fields = merge3(undefined, now.canonical.record, now.copy.record).conflicts
      const newer: Side = newerSide(now) === 'copy' ? 'theirs' : 'mine'
      const proposed = (f: MergeConflict): Side => {
        if (base === undefined) return newer
        const b = valueAt(base, f.path)
        const mineChanged = !deepEqual(b, f.mine)
        const theirsChanged = !deepEqual(b, f.theirs)
        return mineChanged === theirsChanged ? newer : mineChanged ? 'mine' : 'theirs'
      }
      setState({ fields, choices: Object.fromEntries(fields.map((f) => [pathKey(f.path), proposed(f)])) })
    })
    return () => {
      alive = false
    }
  }, [versions])
  if (!state) return <div className="mt-2 text-[11.5px] text-muted">Szukam wspólnej wersji w historii…</div>
  const save = async () => {
    setBusy(true)
    try {
      await saveFirst('scalenie')
      const now = seen.current
      const { merged } = merge3(undefined, now.canonical.record, now.copy.record, chooser(state.choices))
      // The versions the choices were made on: a side changed meanwhile (a save just now, OneDrive) refuses the merge.
      await api.mergeConflict(now.id, merged, { canonical: now.canonical.mtimeMs, copy: now.copy.mtimeMs })
      toast('Scalono obie wersje – każda z nich jest w historii wpisu.', 'success')
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error', 6000)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-2 flex flex-col gap-1.5 border border-accent/40 p-2" data-testid="conflict-merge">
      <div className="text-[11.5px] text-muted">
        Pola, którymi wersje się różnią – przy każdym wybierz wersję. Zaznaczona jest ta, która pole zmieniła (według historii wpisu), a przy zmianie po obu
        stronach – nowsza.
      </div>
      {state.fields.length === 0 && <div className="text-[12px] text-fg" data-testid="conflict-merge-clean">Wersje mają tę samą treść.</div>}
      {state.fields.map((x) => {
        const key = pathKey(x.path)
        const pick = (side: Side) => setState((s) => (s ? { ...s, choices: { ...s.choices, [key]: side } } : s))
        return (
          <div key={key} className="grid grid-cols-[180px_1fr_1fr] items-baseline gap-2 text-[11.5px]" data-testid="conflict-merge-field" data-path={key}>
            <span className="truncate text-muted" title={key}>
              {fieldLabel(x.path, names)}
            </span>
            {(['mine', 'theirs'] as const).map((side) => (
              <label key={side} className="flex min-w-0 items-baseline gap-1.5">
                <input type="radio" checked={state.choices[key] === side} onChange={() => pick(side)} data-testid={`conflict-merge-${side === 'mine' ? 'canonical' : 'copy'}`} />
                <span className="truncate">
                  <span className="text-dim">{side === 'mine' ? 'oryginał: ' : 'kopia: '}</span>
                  {shownValue(x.path, side === 'mine' ? x.mine : x.theirs)}
                </span>
              </label>
            ))}
          </div>
        )
      })}
      <div className="flex gap-2">
        <button className="btn btn-accent h-[24px]" disabled={busy || readOnly} onClick={() => void save()} data-testid="conflict-merge-save">
          Zapisz scalone
        </button>
        <button className="btn h-[24px]" onClick={onClose}>
          Anuluj
        </button>
      </div>
    </div>
  )
}

function ConflictCard({ c, selected, onSelect, busy, setBusy }: { c: ConflictEntry; selected: boolean; onSelect: (v: boolean) => void; busy: boolean; setBusy: (b: boolean) => void }) {
  const newer = newerSide(c)
  const readOnly = useFolderLocked()
  const [merging, setMerging] = useState(false)
  // As the history and the window of changes compare (N94): list items by their id, the stamps of a save left out,
  // Polish names of the fields and of what they point to.
  const changes = useMemo(() => (c.canonical.record != null && c.copy.record != null ? diffRecords(c.canonical.record, c.copy.record) : []), [c.canonical.record, c.copy.record])
  const resolve = async (keep: 'canonical' | 'copy') => {
    setBusy(true)
    try {
      // Unsaved local edits would be written over the version kept here (e.g. a kept copy of fi.json).
      await saveFirst('rozstrzygnięcie konfliktu')
      await api.resolveConflict(c.id, keep)
      toast('Konflikt rozstrzygnięty – odrzucona wersja jest w historii wpisu (i w Koszu).', 'success')
    } catch (e) {
      toast(errorMessage(e), 'error', 6000)
    } finally {
      setBusy(false)
    }
  }
  const side = (label: string, s: ConflictEntry['canonical'], keep: 'canonical' | 'copy') => (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="label">{label}</span>
        <span className="num truncate text-[11px] text-muted" title={s.relPath}>
          {s.relPath.split('/').pop()}
        </span>
        {newer === keep && (
          <Badge tone="accent" title="Zmieniona później (czas zapisu w pliku, inaczej czas pliku)" data-testid={`newer-${keep}`}>
            nowsza
          </Badge>
        )}
      </div>
      <div className="num text-[11px] text-dim">
        zmieniony: {s.updatedAt ? new Date(s.updatedAt).toLocaleString('pl-PL') : '—'}
        {s.mtimeMs ? ` · plik: ${new Date(s.mtimeMs).toLocaleString('pl-PL')}` : ''}
      </div>
      {s.error && <div className="text-[11.5px] text-down">{s.error}</div>}
      <button className="btn self-start" disabled={busy || readOnly || !s.record} title={!s.record ? 'Tej wersji nie da się odczytać – zachowaj drugą.' : undefined} onClick={() => resolve(keep)} data-testid={`keep-${keep}`}>
        Zachowaj tę wersję
      </button>
    </div>
  )
  return (
    <Panel
      testId={`conflict:${c.id}`}
      title={
        <span className="flex items-center gap-2 normal-case">
          <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.currentTarget.checked)} aria-label="Zaznacz konflikt" data-testid="conflict-select" />
          <span>{KIND_LABEL[c.kind] ?? c.kind}</span>
          <Badge>{c.type === 'copy' ? c.source : 'duplikat identyfikatora'}</Badge>
        </span>
      }
      actions={
        <>
          {c.canonical.record != null && c.copy.record != null && (
            <button className="btn h-[22px]" disabled={busy || readOnly} onClick={() => setMerging((m) => !m)} title="Połącz obie wersje pole po polu" data-testid="conflict-merge-open">
              Scal…
            </button>
          )}
          <button className="btn btn-ghost h-[22px] px-1.5" title="Pokaż w folderze" onClick={() => api.showInFolder(c.copy.relPath)}>
            <IconFolder size={13} />
          </button>
        </>
      }
    >
      {merging && <ConflictMerge c={c} onClose={() => setMerging(false)} busy={busy} setBusy={setBusy} />}
      <div className="grid grid-cols-2 gap-4">
        {side('Oryginał', c.canonical, 'canonical')}
        {side('Kopia', c.copy, 'copy')}
      </div>
      {changes.length > 0 && (
        <div className="mt-2">
          <ChangeList changes={changes} beforeLabel="Oryginał" afterLabel="Kopia" testId="conflict-changes" />
        </div>
      )}
      {changes.length === 0 && c.canonical.record != null && c.copy.record != null && (
        <div className="mt-2 text-[11.5px] text-muted" data-testid="conflict-same">
          Treść identyczna (różni się tylko czas zapisu albo komputer) – można bezpiecznie zachować oryginał.
        </div>
      )}
    </Panel>
  )
}

/**
 * What a problem file allows (N95): one not readable now is read again, one of a newer version waits for the update –
 * neither goes to the bin; a broken one does, after a second click.
 */
function ProblemAction({ p, locked }: { p: Problem; locked: boolean }) {
  const [sure, setSure] = useState(false)
  useEffect(() => {
    if (!sure) return
    const t = setTimeout(() => setSure(false), 4000)
    return () => clearTimeout(t)
  }, [sure])
  if (p.unreadable)
    return (
      <button className="btn h-[22px]" onClick={() => api.rescan().then(() => toast('Folder przeczytany ponownie.', 'success'), (e) => toast(errorMessage(e), 'error'))} data-testid="problem-reread">
        <IconSync size={12} /> Wczytaj ponownie
      </button>
    )
  if (p.kind === 'too-new')
    return (
      <span className="text-[11px] text-muted" data-testid="problem-too-new">
        zaktualizuj aplikację
      </span>
    )
  return (
    <button
      className={cx('btn h-[22px]', sure ? 'border-down/60 text-down' : 'hover:text-down')}
      disabled={locked}
      onClick={() => {
        if (!sure) return setSure(true)
        setSure(false)
        void api.trashProblemFile(p.relPath).then(() => toast('Plik przeniesiony do Kosza.', 'success'), (e) => toast(errorMessage(e), 'error'))
      }}
      data-testid="problem-trash"
    >
      <IconTrash size={12} /> {sure ? 'Do Kosza na pewno' : 'Do Kosza'}
    </button>
  )
}

type Deleted = HistoryEntry & { id: string; record: unknown; kind: Collection }

/** Records deleted on any computer whose last version is kept in the history: each can be brought back. */
function DeletedRecords() {
  const [items, setItems] = useState<Deleted[] | null>(null)
  const [busy, setBusy] = useState(false)
  // A search over the titles and who deleted them.
  const [query, setQuery] = useState('')
  const readOnly = useFolderLocked()
  const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = items?.filter((d) => {
    if (!parts.length) return true
    const hay = `${recordTitle(d.kind, d.record)} ${d.savedBy ?? ''} ${d.savedAt.slice(0, 10)}`.toLowerCase()
    return parts.every((p) => hay.includes(p))
  })
  const load = async () => {
    setBusy(true)
    try {
      const lists = await Promise.all(COLLECTIONS.map(async (kind) => (await api.historyDeleted(kind)).map((d) => ({ ...d, kind }))))
      setItems(lists.flat().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)))
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel
      title="Usunięte wpisy"
      actions={
        <span className="flex items-center gap-1">
          {items && items.length > 0 && (
            <input className="input h-[22px] w-[180px]" placeholder="Szukaj…" value={query} onChange={(e) => setQuery(e.currentTarget.value)} data-testid="deleted-search" />
          )}
          <button className="btn h-[22px]" disabled={busy} onClick={() => void load()} data-testid="deleted-load">
            {items ? 'Odśwież' : 'Pokaż'}
          </button>
        </span>
      }
    >
      {!items ? (
        <div className="text-[11.5px] text-muted">Usunięte wpisy można przywrócić z historii (folder .history w folderze danych).</div>
      ) : items.length === 0 ? (
        <div className="text-[12px] text-muted">Brak usuniętych wpisów w historii.</div>
      ) : (
        <div className="flex flex-col" data-testid="deleted-list">
          {shown?.length === 0 && <div className="text-[12px] text-muted">Nic nie pasuje do wyszukiwania.</div>}
          {shown?.map((d) => (
            <div key={`${d.kind}:${d.id}`} className="flex items-center gap-3 border-b border-line/60 py-1 text-[12px] last:border-b-0" data-testid="deleted-row">
              <span className="min-w-0 flex-1 truncate">{recordTitle(d.kind, d.record)}</span>
              <span className="num text-[11px] text-muted">
                {d.reason === 'undo' ? 'usunięty przy cofnięciu importu' : 'usunięty'} {new Date(d.savedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })} · {d.savedBy ?? '?'}
              </span>
              <button
                className="btn h-[22px]"
                disabled={readOnly}
                onClick={async () => {
                  if (await restoreVersion(d.kind, d.id, d.file, recordTitle(d.kind, d.record))) setItems((xs) => xs?.filter((x) => x !== d) ?? null)
                }}
                data-testid="deleted-restore"
              >
                Przywróć
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/**
 * "Zaakceptuj nowsze" for the chosen conflicts or all: the version changed later of each (`newestResolutions` –
 * several copies of one file decided together), in one request (W23); the other versions go to the bin as with the
 * buttons.
 */
function BulkConflicts({ conflicts, sel, busy, setBusy }: { conflicts: ConflictEntry[]; sel: Selection; busy: boolean; setBusy: (b: boolean) => void }) {
  const chosen = conflicts.filter((c) => sel.selected.has(c.id))
  const readOnly = useFolderLocked()
  const run = async (ids: string[]) => {
    setBusy(true)
    const plan = newestResolutions(conflicts, ids)
    let done = 0
    let untouched = 0
    const errors = new Set<string>()
    try {
      try {
        await saveFirst('rozstrzygnięcie konfliktów')
      } catch (e) {
        toast(errorMessage(e), 'error', 7000)
        return
      }
      // The newest copy of a file could not be kept: the older ones of that file stay (nothing newer is binned).
      for (const r of await api.resolveConflicts(plan.resolutions)) {
        if (r.skipped) untouched++
        else if (r.error) errors.add(r.error)
        else done++
      }
    } catch (e) {
      errors.add(errorMessage(e))
    } finally {
      setBusy(false)
      sel.drop()
    }
    const skipped = plan.skipped.length ? ` Nieczytelna wersja – wybierz ręcznie: ${plan.skipped.length}.` : ''
    const left = untouched ? ` Pozostawione bez zmian (nie udało się zachować nowszej kopii tego pliku): ${untouched}.` : ''
    if (errors.size) toast(`Rozstrzygnięto ${done} z ${ids.length}. ${[...errors].join(' ')}${left}${skipped}`, 'error', 8000)
    else toast(`Zaakceptowano nowsze wersje: ${done} – odrzucone są w historii wpisów (i w Koszu).${skipped}`, plan.skipped.length ? 'info' : 'success', plan.skipped.length ? 6000 : 3200)
  }
  return (
    <div className="flex flex-wrap items-center gap-2 border border-line bg-panel px-2.5 py-1.5" data-testid="conflicts-bulk">
      <label className="flex items-center gap-1.5 text-[12px] text-muted">
        <input
          type="checkbox"
          checked={chosen.length === conflicts.length}
          onChange={(e) => sel.setAll(e.currentTarget.checked)}
          data-testid="conflicts-select-all"
        />
        zaznacz wszystkie
      </label>
      <span className="text-[11.5px] text-dim">„Zaakceptuj nowsze” bierze wersję zmienioną później (czas zapisu w pliku, inaczej czas pliku).</span>
      <div className="flex-1" />
      <button className="btn" disabled={busy || readOnly || chosen.length === 0} onClick={() => void run(chosen.map((c) => c.id))} data-testid="conflicts-newer-selected">
        Zaakceptuj nowsze: zaznaczone ({chosen.length})
      </button>
      <button className="btn" disabled={busy || readOnly} onClick={() => void run(conflicts.map((c) => c.id))} data-testid="conflicts-newer-all">
        Zaakceptuj nowsze: wszystkie ({conflicts.length})
      </button>
    </div>
  )
}

export function SyncPage() {
  const conflicts = useData((s) => s.conflicts)
  const sel = useSelection(conflicts.map((c) => c.id))
  // One resolution at a time (a card's button or the bulk action).
  const [busy, setBusy] = useState(false)
  const problems = useData((s) => s.problems)
  const status = useData((s) => s.status)
  const locked = useFolderLocked()
  // The newest record another computer wrote (F21) – none = only this one writes here.
  const lastRemote = useData((s) => s.lastRemote)
  const fi = useData((s) => s.fi)
  // Where this computer keeps the backups (N96): another folder may be set in Ustawienia.
  const [backupsDir, setBackupsDir] = useState<string | null>(null)
  useEffect(() => {
    void api.listBackups().then((b) => setBackupsDir(b.dir), () => undefined)
  }, [status?.dataDir])
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-[14px] font-medium text-fg-strong">Synchronizacja i problemy</h1>
          <button className="btn ml-auto" onClick={() => api.rescan().then(() => toast('Przeskanowano folder.', 'success'))}>
            <IconSync size={13} /> Przeskanuj teraz
          </button>
        </div>
        <p className="text-[11.5px] text-muted">
          Gdy ten sam plik zmieni się na dwóch komputerach, usługa synchronizacji (OneDrive, Dropbox, Google Drive) tworzy jego kopię zamiast
          nadpisywać. Aplikacja pokazuje takie kopie tutaj – wybierz, którą wersję zachować; druga trafia do historii wpisu (widać ją na każdym komputerze) i do Kosza.
        </p>
        {((status && status.otherMachines.length > 0) || lastRemote) && (
          <Panel title="Inne komputery">
            {status?.otherMachines.map((m) => (
              <div key={m.machine} className="num text-[12px]" data-testid="sync-machine" data-in-use={m.inUse !== false ? 'yes' : 'no'}>
                {m.machine} – {m.inUse !== false ? 'w użyciu' : 'w zasobniku'}, sygnał {clock(m.lastSeen)}
                {m.activeAt ? `, ostatni ruch w oknie ${clock(m.activeAt)}` : ''}
              </div>
            ))}
            {lastRemote && (
              <div className="text-[12px] text-muted" data-testid="sync-last-remote">
                Ostatnia zmiana z innego komputera: {lastRemote.machine}, {new Date(lastRemote.at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            )}
          </Panel>
        )}
        <ChangeLogPanel />
        <DeletedRecords />
        {fi && (
          <div className="flex items-center gap-2 text-[12px] text-muted">
            Ustawienia (fi.json) też mają historię:
            <HistoryButton kind="fi" id={fi.id} current={fi} small />
          </div>
        )}
        <h2 className="label mt-1">Konflikty ({conflicts.length})</h2>
        {conflicts.length === 0 && <div className="border border-line bg-panel p-3 text-muted">Brak konfliktów.</div>}
        {conflicts.length > 0 && <BulkConflicts conflicts={conflicts} sel={sel} busy={busy} setBusy={setBusy} />}
        {conflicts.map((c) => (
          <ConflictCard
            key={c.id}
            c={c}
            busy={busy}
            setBusy={setBusy}
            selected={sel.selected.has(c.id)}
            onSelect={(v) => sel.toggle(c.id, v)}
          />
        ))}
        <h2 className="label mt-1">Pliki z problemami ({problems.length})</h2>
        {problems.length === 0 && <div className="border border-line bg-panel p-3 text-muted">Wszystkie pliki wczytane poprawnie.</div>}
        {problems.length > 0 && (
          <div className="border border-line bg-panel">
            {problems.map((p) => (
              <div key={p.relPath} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line/70 px-2.5 py-1.5 last:border-b-0" data-testid="problem-row">
                <Badge tone={p.kind === 'unknown-file' ? 'default' : 'down'}>{PROBLEM_LABEL[p.kind]}</Badge>
                <div className="min-w-0">
                  <div className="num truncate text-[12px] text-fg-strong">{p.relPath}</div>
                  <div className={cx('truncate text-[11.5px]', p.kind === 'unknown-file' ? 'text-muted' : 'text-down')} title={p.message}>
                    {p.message}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn h-[22px]" onClick={() => api.showInFolder(p.relPath)}>
                    <IconFolder size={12} /> Pokaż
                  </button>
                  <ProblemAction p={p} locked={locked} />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11.5px] text-muted">
          Uszkodzone pliki są pomijane i nigdy nie są nadpisywane – możesz je naprawić w edytorze tekstu (to zwykły JSON) albo odzyskać z kopii
          zapasowej (Ustawienia → Folder i kopie{backupsDir ? `: ${backupsDir}` : ''}).
        </p>
      </div>
    </div>
  )
}
