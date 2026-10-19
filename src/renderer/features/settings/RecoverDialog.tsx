import { useEffect, useMemo, useState } from 'react'
import type { BackupDiffItem, BackupInfo, BackupPreview } from '@shared/api'
import { diffRecords } from '@shared/merge'
import type { Collection } from '@shared/paths'
import { Modal } from '../../components/Modal'
import { ShowMore, cx } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { plural } from '../../lib/format'
import { recordTitle } from '../../lib/recordTitle'
import { useData, useFolderLocked } from '../../store/data'
import { ChangeList } from '../history/HistoryDialog'
import { recoverFromBackup } from './recover'

const PAGE = 100

/** A collection's records in the summary: 1 / 2–4 / 5+. */
const NOUN: Record<Collection, [string, string, string]> = {
  transactions: ['operacja', 'operacje', 'operacji'],
  containers: ['kontener', 'kontenery', 'kontenerów'],
  goals: ['cel', 'cele', 'celów'],
  months: ['plan miesiąca', 'plany miesięcy', 'planów miesięcy'],
  dockings: ['dokowanie', 'dokowania', 'dokowań'],
  loans: ['pożyczka', 'pożyczki', 'pożyczek'],
  balances: ['saldo', 'salda', 'sald'],
  game: ['miesiąc gry', 'miesiące gry', 'miesięcy gry'],
  imports: ['import', 'importy', 'importów']
}
const count = (c: Collection, n: number) => `${n} ${plural(n, ...NOUN[c])}`

const keyOf = (i: BackupDiffItem) => `${i.collection}:${i.id}`

/** „N zmienionych, M usuniętych” of each collection, in the collections' order. */
function summary(items: readonly BackupDiffItem[]): string[] {
  const by = new Map<Collection, { changed: number; deleted: number }>()
  for (const i of items) {
    const s = by.get(i.collection) ?? { changed: 0, deleted: 0 }
    s[i.change]++
    by.set(i.collection, s)
  }
  return [...by].map(([c, s]) =>
    [s.changed ? `${count(c, s.changed)} ${plural(s.changed, 'zmieniona', 'zmienione', 'zmienionych')}` : '', s.deleted ? `${count(c, s.deleted)} ${plural(s.deleted, 'usunięta', 'usunięte', 'usuniętych')}` : '']
      .filter(Boolean)
      .join(', ')
  )
}

/**
 * Recovery from a backup (F3, D86): what changed or was deleted since the backup – chosen records written back as new
 * versions (the replaced ones kept in the history, with „Cofnij”), or the whole backup unpacked into a new folder beside
 * the data folder and opened (the current one never written).
 */
export function RecoverDialog({ backup, label, onClose, onFolder }: { backup: BackupInfo; label: string; onClose: () => void; onFolder: () => void }) {
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [settings, setSettings] = useState(false)
  const [shown, setShown] = useState(PAGE)
  const [busy, setBusy] = useState(false)
  const locked = useFolderLocked()
  useEffect(() => {
    let live = true
    setPreview(null)
    setError(null)
    setPicked(new Set())
    setSettings(false)
    api.backupPreview(backup.path).then(
      (p) => live && setPreview(p),
      (e) => live && setError(errorMessage(e))
    )
    return () => {
      live = false
    }
  }, [backup.path])
  const items = preview?.items ?? []
  const lines = useMemo(() => summary(items), [items])
  const added = preview ? (Object.entries(preview.added) as Array<[Collection, number]>).map(([c, n]) => count(c, n)) : []
  const chosen = items.filter((i) => picked.has(keyOf(i)))
  const toggle = (key: string, on: boolean) =>
    setPicked((s) => {
      const next = new Set(s)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
  const recover = async () => {
    if (!preview) return
    setBusy(true)
    const ok = await recoverFromBackup(preview, chosen, settings)
    setBusy(false)
    if (ok) onClose()
  }
  const date = new Date(backup.mtimeMs).toLocaleString('pl-PL')

  return (
    <Modal
      title={`Odzyskanie z kopii – ${label}, ${date}`}
      onClose={onClose}
      width={880}
      testId="recover-dialog"
      footer={
        <div className="flex w-full items-center gap-2">
          <span className="flex-1 text-[11px] text-dim">Zaznaczone wpisy wracają jako nowa wersja – bieżące zostają w historii, toast ma „Cofnij”.</span>
          <button className="btn" onClick={onClose}>
            Zamknij
          </button>
          <button className="btn btn-accent" disabled={busy || locked || (!chosen.length && !settings)} onClick={() => void recover()} data-testid="recover-selected">
            Odzyskaj zaznaczone ({chosen.length + (settings ? 1 : 0)})
          </button>
        </div>
      }
    >
      {!preview && !error && <div className="py-6 text-center text-muted">Czytanie kopii…</div>}
      {error && (
        <div className="py-4 text-accent" data-testid="recover-error">
          {error}
        </div>
      )}
      {preview && (
        <div className="flex flex-col gap-3 text-[12px]">
          <div className="flex flex-col gap-1" data-testid="recover-summary">
            <span>
              W kopii: {preview.total} {plural(preview.total, 'wpis', 'wpisy', 'wpisów')}.{' '}
              {items.length ? `Od kopii: ${lines.join(' · ')}.` : 'Od kopii nic nie zmieniono ani nie usunięto.'}
            </span>
            {added.length > 0 && (
              <span className="text-muted" data-testid="recover-added">
                Dodane po kopii: {added.join(', ')} – zostają (stan kopii w całości daje tylko odzyskanie całego folderu).
              </span>
            )}
            {(preview.invalid > 0 || preview.tooNew) && (
              <span className="text-accent">
                {preview.invalid} {plural(preview.invalid, 'pliku', 'plików', 'plików')} kopii nie da się odczytać{preview.tooNew ? ' (zapisane przez nowszą wersję aplikacji)' : ''} – pominięte.
              </span>
            )}
          </div>

          <section className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="label">Wybrane wpisy</span>
              <span className="flex-1" />
              {items.length > 0 && (
                <button type="button" className="text-[11px] text-accent hover:underline" onClick={() => setPicked(picked.size === items.length ? new Set() : new Set(items.map(keyOf)))} data-testid="recover-all">
                  {picked.size === items.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                </button>
              )}
            </div>
            {preview.settings.changed && (
              <label className="flex items-center gap-2 border-b border-line/60 py-1" data-testid="recover-settings">
                <input type="checkbox" checked={settings} onChange={(e) => setSettings(e.currentTarget.checked)} />
                <span className="text-fg-strong">Ustawienia</span>
                <span className="text-muted">– inne niż w kopii (konta, kategorie, reguły importu, warstwy, rozkazy, domownicy)</span>
              </label>
            )}
            {items.slice(0, shown).map((i) => (
              <ItemRow key={keyOf(i)} item={i} picked={picked.has(keyOf(i))} onPick={(on) => toggle(keyOf(i), on)} />
            ))}
            <ShowMore shown={shown} total={items.length} page={PAGE} onMore={() => setShown((n) => n + PAGE)} testId="recover-more" />
          </section>

          <section className="flex flex-col gap-1 border-t border-line pt-2" data-testid="recover-folder-section">
            <span className="label">Cały folder</span>
            <p className="text-muted">
              Kopia rozpakowana do nowego folderu obok bieżącego („… – kopia z {date}”) i otwarta w aplikacji. Bieżący folder zostaje nietknięty – do niego
              wracasz z Ustawienia → Folder i kopie → „Ostatnio używane foldery”.
            </p>
            <button className="btn self-start" disabled={busy} onClick={onFolder} data-testid="recover-folder">
              Odzyskaj cały folder do nowego…
            </button>
          </section>
        </div>
      )}
    </Modal>
  )
}

/** A record of the backup: its title, what happened since, the fields that differ (folded out). */
function ItemRow({ item, picked, onPick }: { item: BackupDiffItem; picked: boolean; onPick: (on: boolean) => void }) {
  // The store holds entries ({record, relPath, readOnly}): the record itself is compared.
  const current = useData((s) => s.records[item.collection][item.id]?.record)
  const [open, setOpen] = useState(false)
  const changes = useMemo(() => (open && current ? diffRecords(current, item.backup) : []), [open, current, item.backup])
  return (
    <div className="flex flex-col border-b border-line/60 py-1 last:border-b-0" data-testid="recover-item" data-change={item.change}>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={picked} onChange={(e) => onPick(e.currentTarget.checked)} aria-label="Odzyskaj ten wpis" data-testid="recover-pick" />
        <span className="min-w-0 flex-1 truncate">{recordTitle(item.collection, item.backup)}</span>
        <span className={cx('shrink-0 text-[11px]', item.change === 'deleted' ? 'text-accent' : 'text-muted')}>{item.change === 'deleted' ? 'usunięty od kopii' : 'zmieniony od kopii'}</span>
        {item.change === 'changed' && current != null && (
          <button type="button" className="shrink-0 text-[11px] text-accent hover:underline" onClick={() => setOpen((o) => !o)} data-testid="recover-diff">
            {open ? 'zwiń' : 'różnice'}
          </button>
        )}
      </div>
      {open && <ChangeList changes={changes} beforeLabel="Teraz" afterLabel="W kopii" testId="recover-changes" />}
    </div>
  )
}
