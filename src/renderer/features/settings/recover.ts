/**
 * Recovery from a backup (F3, D86): the chosen records of a backup written back as new versions – the ones they replace
 * kept in the history (reason 'restore') – with „Cofnij”; or the whole backup unpacked into a new folder beside the
 * data folder (`api.backupToFolder`, through the settings' switching of folders).
 */
import type { BackupDiffItem, BackupPreview } from '@shared/api'
import type { SettingsFile } from '@shared/schema'
import type { Collection } from '@shared/paths'
import { api, errorMessage } from '../../lib/api'
import { countLabel, plural } from '../../lib/format'
import { adoptSettings, canWrite, deleteRecords, saveFirst, useData } from '../../store/data'
import { toast } from '../../store/ui'

type Gender = 'm' | 'f' | 'n'

/** A collection's records in the summary: the noun (1 / 2–4 / 5+) and its gender – the participle that follows agrees. */
const NOUN: Record<Collection, { forms: [string, string, string]; gender: Gender }> = {
  transactions: { forms: ['operacja', 'operacje', 'operacji'], gender: 'f' },
  containers: { forms: ['kontener', 'kontenery', 'kontenerów'], gender: 'm' },
  goals: { forms: ['cel', 'cele', 'celów'], gender: 'm' },
  months: { forms: ['plan miesiąca', 'plany miesięcy', 'planów miesięcy'], gender: 'm' },
  dockings: { forms: ['dokowanie', 'dokowania', 'dokowań'], gender: 'n' },
  loans: { forms: ['pożyczka', 'pożyczki', 'pożyczek'], gender: 'f' },
  balances: { forms: ['saldo', 'salda', 'sald'], gender: 'n' },
  game: { forms: ['miesiąc gry', 'miesiące gry', 'miesięcy gry'], gender: 'm' },
  imports: { forms: ['import', 'importy', 'importów'], gender: 'm' },
  scheduled: { forms: ['boja', 'boje', 'boi'], gender: 'f' }
}

/** „3 operacje”, „1 plan miesiąca”. */
export const countOf = (c: Collection, n: number): string => countLabel(n, ...NOUN[c].forms)

/** The participle in the count's number and gender: „1 operacja zmieniona”, „1 kontener zmieniony”, „2 kontenery zmienione”. */
const agree = (c: Collection, n: number, one: Record<Gender, string>, few: string, many: string): string => plural(n, one[NOUN[c].gender], few, many)

/** „N zmienionych, M usuniętych” of each collection, in the collections' order (a participle agrees with its noun – AP-23). */
export function summary(items: readonly BackupDiffItem[]): string[] {
  const by = new Map<Collection, { changed: number; deleted: number }>()
  for (const i of items) {
    const s = by.get(i.collection) ?? { changed: 0, deleted: 0 }
    s[i.change]++
    by.set(i.collection, s)
  }
  const changed = { m: 'zmieniony', f: 'zmieniona', n: 'zmienione' } as const
  const deleted = { m: 'usunięty', f: 'usunięta', n: 'usunięte' } as const
  return [...by].map(([c, s]) =>
    [s.changed ? `${countOf(c, s.changed)} ${agree(c, s.changed, changed, 'zmienione', 'zmienionych')}` : '', s.deleted ? `${countOf(c, s.deleted)} ${agree(c, s.deleted, deleted, 'usunięte', 'usuniętych')}` : '']
      .filter(Boolean)
      .join(', ')
  )
}

/** The chosen records (and the settings) of the backup made current; false = nothing written. */
export async function recoverFromBackup(preview: BackupPreview, picks: readonly BackupDiffItem[], settings: boolean): Promise<boolean> {
  if (!canWrite()) return false
  try {
    await saveFirst('odzyskanie z kopii')
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
    return false
  }
  // What the recovery replaces, as saved (the saves are flushed): „Cofnij” writes it back.
  const before = useData.getState()
  const previous = new Map(picks.map((p) => [keyOf(p), before.records[p.collection][p.id]?.record ?? null]))
  const previousFi = before.fi
  try {
    const res = await api.backupRecover(
      preview.path,
      picks.map((p) => ({ collection: p.collection, id: p.id })),
      settings
    )
    if (res.fi) adoptSettings(res.fi)
    const done = picks.filter((p) => res.done.includes(p.id))
    const n = done.length
    const what = [n ? `${n} ${plural(n, 'wpis', 'wpisy', 'wpisów')}` : '', res.fi ? 'ustawienia' : ''].filter(Boolean).join(' i ')
    if (what)
      toast(`Odzyskano z kopii: ${what}. Poprzednie wersje są w historii.`, 'success', 12000, {
        label: 'Cofnij',
        run: () => void undoRecover(done, previous, res.fi ? previousFi : null)
      })
    if (res.failed.length) toast(`Nie odzyskano ${res.failed.length} ${plural(res.failed.length, 'wpisu', 'wpisów', 'wpisów')}: ${res.failed[0]!.error}`, 'error', 10000)
    return n > 0 || !!res.fi
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
    return false
  }
}

const keyOf = (i: Pick<BackupDiffItem, 'collection' | 'id'>) => `${i.collection}:${i.id}`

/**
 * „Cofnij” of a recovery: the versions it replaced written back in one call (each recovered one kept in the history);
 * a record that came back from deletion is deleted again.
 */
async function undoRecover(items: readonly BackupDiffItem[], previous: ReadonlyMap<string, unknown>, previousFi: SettingsFile | null): Promise<void> {
  try {
    await saveFirst('cofnięcie')
    const back = items.flatMap((i) => {
      const record = i.change === 'changed' ? previous.get(keyOf(i)) : null
      return record ? [{ collection: i.collection, record }] : []
    })
    const res = back.length || previousFi ? await api.putVersions(back, previousFi) : null
    if (res?.fi) adoptSettings(res.fi)
    const gone = new Map<Collection, string[]>()
    for (const i of items) if (i.change === 'deleted') gone.set(i.collection, [...(gone.get(i.collection) ?? []), i.id])
    for (const [collection, ids] of gone) {
      const { error } = await deleteRecords(collection, ids)
      if (error) throw new Error(error)
    }
    if (res?.failed.length) return toast(`Cofnięto odzyskanie z kopii – bez ${res.failed.length}: ${res.failed[0]!.error}`, 'error', 9000)
  } catch (e) {
    return toast(errorMessage(e), 'error', 8000)
  }
  toast('Cofnięto odzyskanie z kopii.', 'success', 6000)
}
