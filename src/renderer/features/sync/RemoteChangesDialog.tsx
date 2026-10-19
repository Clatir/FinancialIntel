// adapted from ICTTJ src/renderer/features/sync/RemoteChangesDialog.tsx @ 84a8339
import { memo, useCallback, useMemo, useState } from 'react'
import { useSelection } from '../../lib/selection'
import type { RecordEntry } from '@shared/api'
import { diffRecords, fieldLabel, merge3, pathKey, type Side } from '@shared/merge'
import type { Collection } from '@shared/paths'
import type { RecordTypes } from '@shared/records'
import { recordTitle } from '../../lib/recordTitle'
import { acceptNewer, newerOf, resolveRemoteMany, useData } from '../../store/data'
import { setRemoteDialog, useRemote, type PendingRemote } from '../../store/remote'
import { toast } from '../../store/ui'
import { Modal } from '../../components/Modal'
import { Badge, Segmented, ShowMore, cx } from '../../components/ui'
import { ChangeList, HistoryButton, displayValue, useDictNames } from '../history/HistoryDialog'

type Choice = 'merge' | Side

/** Cards shown at once (W25): a large batch from the other computer is decided without drawing all of it. */
const PAGE = 50
const NO_FIELDS: Record<string, Side> = {}

function theirsRecord(item: PendingRemote): unknown {
  if (!item.theirs) return null
  return item.collection === 'fi' ? item.theirs : (item.theirs as RecordEntry<RecordTypes[Collection]>).record
}

function useMine(item: PendingRemote): unknown {
  return useData((s) => (item.collection === 'fi' ? s.fi : ((s.records[item.collection] as Record<string, RecordEntry<unknown>>)[item.id]?.record ?? null)))
}

function machineOf(item: PendingRemote): string {
  const r = theirsRecord(item) as { updatedBy?: string | null } | null
  return r?.updatedBy ?? 'inny komputer'
}

/** Which version "Zaakceptuj nowsze" would take. */
const UNDECIDED: Record<'removal' | 'time', string> = {
  removal: 'Usunięcie po Twojej zmianie sprzed jego przyjścia – nie wiadomo, co było później. Wybierz ręcznie.',
  time: 'Brak czasu zmiany po jednej ze stron – wybierz ręcznie.'
}

/** Decided now, at every render of its card (edits made while the dialog waits count) – a card is drawn again only for itself (W25). */
function NewerBadge({ item, machine }: { item: PendingRemote; machine: string }) {
  const n = newerOf(item)
  if (n.choice == null)
    return (
      <Badge title={UNDECIDED[n.reason]} data-testid="remote-newer">
        nowsza: nie wiadomo
      </Badge>
    )
  const text =
    item.type === 'removal'
      ? n.newer === 'theirs'
        ? 'nowsze: usunięcie'
        : 'nowsza: Twoja (po usunięciu)'
      : n.newer === 'both'
        ? `nowsze: część Twoja, część z ${machine}`
        : n.newer === 'theirs'
          ? `nowsza: z ${machine}`
          : 'nowsza: Twoja'
  return (
    <Badge tone="accent" data-testid="remote-newer">
      {text}
    </Badge>
  )
}

function SelectBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <input type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} aria-label={label} data-testid="remote-select" />
}

/** One waiting change; drawn again only when its own props change (W25: callbacks take the change's key). */
const ItemCard = memo(function ItemCard({
  item,
  choice,
  onChoice,
  fields,
  onField,
  selected,
  onSelect
}: {
  item: PendingRemote
  choice: Choice
  onChoice: (key: string, c: Choice) => void
  fields: Record<string, Side>
  onField: (key: string, field: string, s: Side) => void
  selected: boolean
  onSelect: (key: string, v: boolean) => void
}) {
  const mine = useMine(item)
  const theirs = theirsRecord(item)
  const names = useDictNames()
  const title = recordTitle(item.collection, mine ?? theirs)
  const machine = machineOf(item)
  const remoteChanges = useMemo(() => (item.base !== undefined && theirs ? diffRecords(item.base, theirs) : theirs && mine ? diffRecords(mine, theirs) : []), [item.base, theirs, mine])
  const localChanges = useMemo(() => (item.hadLocalEdits && item.base !== undefined && mine ? diffRecords(item.base, mine) : []), [item, mine])
  const conflicts = useMemo(() => (theirs && mine && item.hadLocalEdits ? merge3(item.base, mine, theirs).conflicts : []), [item, mine, theirs])

  if (item.type === 'removal') {
    return (
      <div className="flex flex-col gap-2 border border-line p-2.5" data-testid="remote-item" data-type="removal">
        <div className="flex items-center gap-2">
          <SelectBox checked={selected} onChange={(v) => onSelect(item.key, v)} label={`Zaznacz: ${title}`} />
          <span className="text-[12.5px] text-fg-strong">{title}</span>
          <Badge tone="warn">usunięty na innym komputerze</Badge>
          {item.hadLocalEdits && <Badge tone="accent">masz niezapisane zmiany</Badge>}
          <NewerBadge item={item} machine={machine} />
          <span className="flex-1" />
          <HistoryButton kind={item.collection} id={item.id} current={mine ?? theirs} variant="link" />
        </div>
        <Segmented
          size="sm"
          value={choice === 'merge' ? 'mine' : choice}
          onChange={(v) => onChoice(item.key, v)}
          options={[
            { value: 'theirs', label: 'Usuń też tutaj' },
            { value: 'mine', label: 'Zachowaj (przywróć plik)' }
          ]}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 border border-line p-2.5" data-testid="remote-item" data-type="update">
      <div className="flex flex-wrap items-center gap-2">
        <SelectBox checked={selected} onChange={(v) => onSelect(item.key, v)} label={`Zaznacz: ${title}`} />
        <span className="text-[12.5px] text-fg-strong">{title}</span>
        <Badge>z komputera {machine}</Badge>
        {item.hadLocalEdits ? <Badge tone="accent">masz niezapisane zmiany ({localChanges.length})</Badge> : <Badge>bez Twoich zmian</Badge>}
        {conflicts.length > 0 && <Badge tone="warn">to samo pole zmienione po obu stronach: {conflicts.length}</Badge>}
        <NewerBadge item={item} machine={machine} />
        {/* The versions set aside so far – the one dropped here goes there too (N18). */}
        <span className="flex-1" />
        <HistoryButton kind={item.collection} id={item.id} current={mine ?? theirs} variant="link" />
      </div>
      <Segmented
        size="sm"
        value={choice}
        onChange={(v) => onChoice(item.key, v)}
        options={
          item.hadLocalEdits
            ? [
                { value: 'merge', label: 'Scal' },
                { value: 'mine', label: 'Zachowaj moją' },
                { value: 'theirs', label: `Weź z ${machine}` }
              ]
            : [
                { value: 'theirs', label: 'Przyjmij zmiany' },
                { value: 'mine', label: 'Zachowaj moją wersję' }
              ]
        }
      />
      {choice === 'merge' && conflicts.length > 0 && (
        <div className="border border-accent/40 text-[11.5px]" data-testid="remote-conflicts">
          <div className="grid grid-cols-[170px_1fr_1fr] gap-2 border-b border-line bg-raised px-2 py-1 text-[10.5px] tracking-wide text-muted uppercase">
            <span>Pole</span>
            <span>Moja wersja</span>
            <span>Z {machine}</span>
          </div>
          {conflicts.map((c) => {
            const k = pathKey(c.path)
            const side = fields[k] ?? 'mine'
            return (
              <div key={k} className="grid grid-cols-[170px_1fr_1fr] items-center gap-2 border-b border-line/60 px-2 py-0.5 last:border-b-0" data-testid="remote-conflict">
                <span className="truncate text-muted">{fieldLabel(c.path)}</span>
                {(['mine', 'theirs'] as const).map((s) => (
                  <button
                    key={s}
                    className={cx('truncate border px-1.5 py-0.5 text-left', side === s ? 'border-accent bg-accent-soft text-fg-strong' : 'border-line hover:bg-hover')}
                    onClick={() => onField(item.key, k, s)}
                    data-testid={`remote-pick-${s}`}
                  >
                    {displayValue(s === 'mine' ? c.mine : c.theirs, names, c.path)}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
      <details>
        <summary className="cursor-default text-[11.5px] text-muted">Zmiany z {machine}: {remoteChanges.length}</summary>
        <div className="mt-1">
          <ChangeList changes={remoteChanges} beforeLabel="Było" afterLabel={`Z ${machine}`} />
        </div>
      </details>
    </div>
  )
})

/** Changes from another computer waiting for a decision (store/remote.ts); mounted once in the app shell. */
export function RemoteChangesDialog() {
  const pending = useRemote((s) => s.pending)
  const open = useRemote((s) => s.open)
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [fields, setFields] = useState<Record<string, Record<string, Side>>>({})
  const [limit, setLimit] = useState(PAGE)
  const keys = useMemo(() => pending.map((p) => p.key), [pending])
  const sel = useSelection(keys)
  const onChoice = useCallback((key: string, c: Choice) => setChoices((x) => ({ ...x, [key]: c })), [])
  const onField = useCallback((key: string, k: string, s: Side) => setFields((x) => ({ ...x, [key]: { ...(x[key] ?? {}), [k]: s } })), [])
  if (!open || pending.length === 0) return null
  const chosen = pending.filter((p) => sel.selected.has(p.key))
  const allSelected = chosen.length === pending.length
  // "Zaakceptuj nowsze": the newer side of each – merged with local edits, fields changed on both sides from it.
  const takeNewer = (items: readonly PendingRemote[]) => {
    const keys = items.map((p) => p.key)
    const { decided, left } = acceptNewer(keys)
    // Decided items forget their manual choices too (a later change of the same record starts fresh).
    const waiting = new Set(useRemote.getState().pending.map((p) => p.key))
    const done = new Set(keys.filter((k) => !waiting.has(k)))
    sel.drop(done)
    setChoices((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !done.has(k))))
    setFields((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !done.has(k))))
    toast(
      `Przyjęto nowsze wersje: ${decided}.${left ? ` Czeka na Twoją decyzję: ${left} (nie wiadomo, która wersja jest nowsza).` : ''}`,
      left ? 'info' : 'success',
      left ? 6000 : 3200
    )
  }
  const choiceOf = (p: PendingRemote): Choice => choices[p.key] ?? (p.hadLocalEdits ? 'merge' : p.type === 'removal' ? 'theirs' : 'theirs')
  const apply = () => {
    // All at once (W25), also the ones not shown yet – with their default choice.
    resolveRemoteMany(pending.map((p) => ({ key: p.key, choice: choiceOf(p), fields: fields[p.key] })))
    setChoices({})
    setFields({})
    sel.drop()
  }
  return (
    <Modal
      title={`Zmiany z drugiego komputera (${pending.length})`}
      onClose={() => setRemoteDialog(false)}
      width={920}
      testId="remote-dialog"
      footer={
        <>
          <span className="text-[11.5px] text-muted">
            Wybrana do odrzucenia wersja nie ginie – jest w historii wpisu. Dopóki nie zdecydujesz, te wpisy nie są zapisywane.
          </span>
          <button className="btn btn-ghost ml-auto" onClick={() => setRemoteDialog(false)}>
            Później
          </button>
          <button className="btn btn-accent" onClick={apply} data-testid="remote-apply">
            Zastosuj
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-[11.5px] text-muted">
          Ten folder danych zmienił się na innym komputerze, gdy był otwarty tutaj. „Scal” łączy zmiany z obu komputerów (pola zmienione po obu stronach –
          według Twojego wyboru), „Zachowaj moją” zapisuje wersję z tego komputera, „Weź z…” przyjmuje wersję z drugiego.
        </p>
        <div className="flex flex-wrap items-center gap-2 border-y border-line py-1.5" data-testid="remote-bulk">
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => sel.setAll(e.currentTarget.checked)}
              data-testid="remote-select-all"
            />
            zaznacz wszystkie
          </label>
          <span className="text-[11.5px] text-dim">
            „Zaakceptuj nowsze” bierze wersję zmienioną później (z Twoimi niezapisanymi zmianami – scala, a pola zmienione po obu stronach bierze z nowszej).
          </span>
          <div className="flex-1" />
          <button className="btn" disabled={chosen.length === 0} onClick={() => takeNewer(chosen)} data-testid="remote-newer-selected">
            Zaakceptuj nowsze: zaznaczone ({chosen.length})
          </button>
          <button className="btn" onClick={() => takeNewer(pending)} data-testid="remote-newer-all">
            Zaakceptuj nowsze: wszystkie ({pending.length})
          </button>
        </div>
        {pending.slice(0, limit).map((p) => (
          <ItemCard
            key={p.key}
            item={p}
            selected={sel.selected.has(p.key)}
            onSelect={sel.toggle}
            choice={choiceOf(p)}
            onChoice={onChoice}
            fields={fields[p.key] ?? NO_FIELDS}
            onField={onField}
          />
        ))}
        {pending.length > limit && (
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted" data-testid="remote-hidden">
            <ShowMore shown={limit} total={pending.length} page={PAGE} onMore={() => setLimit((l) => l + PAGE)} testId="remote-more" />
            <span>„Zastosuj” rozstrzyga wszystkie {pending.length} – te jeszcze niepokazane z wyborem domyślnym.</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Top-bar chip while decisions wait (the dialog was put off with "Później"). */
export function RemoteChangesChip() {
  const count = useRemote((s) => s.pending.length)
  const open = useRemote((s) => s.open)
  if (!count || open) return null
  return (
    <button className="btn h-[22px] border-accent/60 text-accent" onClick={() => setRemoteDialog(true)} data-testid="remote-chip">
      Zmiany z drugiego komputera: {count}
    </button>
  )
}

