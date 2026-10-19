import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { findDuplicates, mergeDuplicate, type DuplicateGroup } from '@shared/import/duplicates'
import { noNarrowing } from '@shared/operationsView'
import { TX_KIND_LABEL, type Transaction, type TxKind } from '@shared/schema'
import { errorMessage } from '../../lib/api'
import { plural } from '../../lib/format'
import { listOf, replaceRecords, updateRecord, updateSettings, useData, useFolderLocked } from '../../store/data'
import { useRecordList } from '../../store/records'
import { navigate, toast } from '../../store/ui'
import { signedPln } from '../../components/fields'
import { Badge, Panel } from '../../components/ui'
import { deleteManyWithUndo } from '../history/actions'
import { selectOperation, showFilter } from '../operations/state'
import { useAccounts, useCategories } from '../operations/pickers'

const NO_DISMISSED: Record<string, string> = {}

type Duplicates = { groups: DuplicateGroup[]; byId: Record<string, Transaction> }

/** One computation for every screen showing it (the Operations link, the import panel): the last inputs and result. */
let last: { inputs: readonly unknown[]; out: Duplicates } | null = null

/** How many duplicates a screen showing them counted last, and in which folder (the side menu reads it – F6, W4). */
export const useDuplicatesKnown = create<{ count: number; dir: string | null } | null>(() => null)

type DataState = ReturnType<typeof useData.getState>
const duplicateInputs = (s: DataState) => [s.records.transactions, s.records.dockings, s.fi?.settings.import.notDuplicates ?? NO_DISMISSED, s.drafts, s.fi?.settings.import.accountNumbers] as const

/** The duplicates among the saved operations (drafts left out): computed once for the inputs of now. */
function duplicatesNow(): Duplicates {
  const inputs = duplicateInputs(useData.getState())
  if (last && last.inputs.every((x, i) => x === inputs[i])) return last.out
  const [records, dockings, dismissed, drafts, numbers] = inputs
  const all = listOf(records)
  const txs = Object.keys(drafts).length ? all.filter((t) => !drafts[t.id]) : all
  const out = { groups: findDuplicates(txs, listOf(dockings), dismissed, numbers), byId: Object.fromEntries(txs.map((t) => [t.id, t])) }
  last = { inputs, out }
  // Told after the render that counted it (a screen's render must not update another one's).
  const known = { count: out.groups.length, dir: useData.getState().status?.dataDir ?? null }
  queueMicrotask(() => useDuplicatesKnown.setState(known, true))
  return out
}

/** The duplicates among the saved operations: recomputed when the operations change (the import screen). */
export function useDuplicates(): Duplicates {
  const inputs = useData(useShallow(duplicateInputs))
  // `inputs` is the key (read inside from the store's state of now).
  return useMemo(() => duplicatesNow(), [inputs])
}

/** How many duplicates (the Operations link – W4): counted a moment after the last change, never while typing. */
export function useDuplicateCount(delayMs = 1500): number {
  const inputs = useData(useShallow(duplicateInputs))
  const [n, setN] = useState(() => (last ? last.out.groups.length : 0))
  useEffect(() => {
    const t = setTimeout(() => setN(duplicatesNow().groups.length), delayMs)
    return () => clearTimeout(t)
  }, [inputs, delayMs])
  return n
}

/**
 * The duplicates as a screen showing them counted them last (the side menu's counter – W4: the 0,6 s count at 150 tys.
 * operacji not after every change on every screen); counted here once, a while after a folder opens, when none has.
 */
export function useKnownDuplicateCount(firstAfterMs = 10_000): number {
  const known = useDuplicatesKnown()
  const dir = useData((s) => s.status?.dataDir ?? null)
  const fresh = !!known && known.dir === dir
  useEffect(() => {
    if (fresh || !dir) return
    const t = setTimeout(() => void duplicatesNow(), firstAfterMs)
    return () => clearTimeout(t)
  }, [fresh, dir, firstAfterMs])
  return fresh ? known.count : 0
}

/**
 * The duplicates while a file is open (N75): their panel waits for the import or the file closed – said, not hidden (the
 * link from Operacje leads here).
 */
export function DuplicatesNote() {
  const n = useDuplicateCount()
  if (!n) return null
  return (
    <Panel title="Duplikaty operacji">
      <p className="text-[11.5px] text-muted" data-testid="import-duplicates-note">
        Możliwe duplikaty: {n} – scalisz je po imporcie albo po zamknięciu pliku.
      </p>
    </Panel>
  )
}

const DIFFERS = { '': '', name: 'inna nazwa', amount: 'inna kwota', both: 'inna nazwa i kwota' } as const

/** „to nie duplikat” taken back (N74): the pair is shown again. */
function undismiss(key: string): void {
  updateSettings((f) => {
    const notDuplicates = { ...f.settings.import.notDuplicates }
    delete notDuplicates[key]
    return { ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates } } }
  })
}

/**
 * Operacje that are one and the same (D77, like ICTTJ's „Duplikaty z importu”): the kept one takes what only the
 * copies had, the copies go with one „Cofnij”; a conflict (another decision in a copy) is not ticked until the user
 * looks; „to nie duplikat” is remembered for the folder.
 */
export function DuplicatesPanel() {
  const { groups, byId } = useDuplicates()
  const dockings = useRecordList('dockings')
  const operations = useData((s) => s.records.transactions)
  const readOnly = useFolderLocked()
  const cats = useCategories()
  const accounts = useAccounts()
  // Groups the user ticked or unticked against the default (ticked unless a conflict or blocked).
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  if (!groups.length) return null
  // An operation a newer version wrote is read only here (B95): its group waits – never a copy deleted for a kept one
  // that cannot take the bank's data.
  const blockedOf = (g: DuplicateGroup) => g.blocked ?? ([g.keep, ...g.remove].some((id) => operations[id]?.readOnly) ? 'zapisana przez nowszą wersję aplikacji – tylko do odczytu' : null)
  // A conflict, and a possible duplicate the import asks about (N88), are not ticked until the user looks.
  const picked = (g: DuplicateGroup) => !blockedOf(g) && (g.conflict || g.ask ? toggled.has(g.key) : !toggled.has(g.key))
  const chosen = groups.filter(picked)
  const nRemove = chosen.reduce((n, g) => n + g.remove.length, 0)
  const toggle = (key: string) => setToggled((s) => (s.has(key) ? new Set([...s].filter((k) => k !== key)) : new Set([...s, key])))

  const merge = async () => {
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const kept: Transaction[] = []
      const originals: Transaction[] = []
      const moved: Array<{ id: string; from: string }> = []
      const ids: string[] = []
      for (const g of chosen) {
        const keep = byId[g.keep]
        const copies = g.remove.map((id) => byId[id]).filter((t): t is Transaction => !!t)
        if (!keep || !copies.length) continue
        originals.push(keep)
        kept.push(mergeDuplicate(keep, copies, g.kind, now))
        // A copy's docking goes to the kept operation (blocked groups – both docked – are never merged here).
        for (const d of dockings)
          if (g.remove.includes(d.transactionId)) {
            moved.push({ id: d.id, from: d.transactionId })
            updateRecord('dockings', d.id, (x) => ({ ...x, transactionId: g.keep }))
          }
        ids.push(...copies.map((t) => t.id))
      }
      // A member's payment that covers a copy (B100, „Pokrywa”): it covers the kept operation now.
      const gone = new Map(chosen.flatMap((g) => g.remove.map((id) => [id, g.keep] as const)))
      const keptIds = new Set(kept.map((t) => t.id))
      for (const t of Object.values(byId)) {
        if (!t.covers?.some((id) => gone.has(id)) || gone.has(t.id)) continue
        const covers = [...new Set(t.covers.map((id) => gone.get(id) ?? id))]
        const at = kept.findIndex((k) => k.id === t.id)
        if (at >= 0) kept[at] = { ...kept[at]!, covers }
        else if (!keptIds.has(t.id)) {
          originals.push(t)
          kept.push({ ...t, covers, updatedAt: now })
        }
      }
      replaceRecords('transactions', kept)
      // „Cofnij”: the kept operations as they were, the dockings back on their copies, then the copies themselves.
      const undo = () => {
        replaceRecords('transactions', originals)
        for (const m of moved) updateRecord('dockings', m.id, (x) => ({ ...x, transactionId: m.from }))
      }
      await deleteManyWithUndo('transactions', ids, 'duplikaty operacji', (n) => `Scalono duplikaty: usunięto ${n} ${plural(n, 'kopię', 'kopie', 'kopii')}.`, undo)
      setToggled(new Set())
    } catch (e) {
      toast(errorMessage(e), 'error', 8000)
    } finally {
      setBusy(false)
    }
  }

  // Remembered for the folder, with „Cofnij” (N74; all of them back in Ustawienia → Import z banku).
  const dismiss = (g: DuplicateGroup) => {
    updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates: { ...f.settings.import.notDuplicates, [g.key]: new Date().toISOString() } } } }))
    toast('Para oznaczona „to nie duplikat” – nie będzie pokazywana.', 'info', 7000, { label: 'Cofnij', run: () => undismiss(g.key) })
  }

  const line = (t: Transaction | undefined, role: 'keep' | 'copy') => {
    if (!t) return null
    const account = accounts.find((a) => a.id === t.accountId)?.name ?? '?'
    // The kind by its name (N81), as the rest of the screen.
    const category = t.kind === 'expense' ? cats.label(t.categoryId) || 'bez kategorii' : (TX_KIND_LABEL[t.kind as TxKind] ?? t.kind)
    return (
      <button
        type="button"
        className="grid w-full grid-cols-[76px_minmax(0,1fr)_88px] items-center gap-2 text-left hover:text-fg-strong"
        onClick={() => {
          showFilter({ period: { kind: 'all' }, ...noNarrowing() })
          selectOperation(t.id)
          navigate({ page: 'operations' })
        }}
        data-testid={`duplicate-${role}`}
      >
        <span className="num text-muted">
          {t.date.slice(8, 10)}.{t.date.slice(5, 7)}.{t.date.slice(0, 4)}
        </span>
        <span className="min-w-0 truncate">
          <span className={role === 'keep' ? 'text-fg-strong' : 'text-muted'}>{t.counterparty || t.title || '(bez nazwy)'}</span>
          <span className="text-dim">
            {' '}
            · {t.bank ? 'z banku' : 'wpisana ręcznie'} · {account} · {category}
            {role === 'keep' ? ' · zostaje' : ' · kopia'}
          </span>
        </span>
        <span className="num text-right">{signedPln(t.amount)}</span>
      </button>
    )
  }

  return (
    <Panel title="Duplikaty operacji">
      <div className="flex flex-col gap-1.5 text-[12px]" data-testid="duplicates">
        <p className="text-[11.5px] text-muted">
          Ta sama operacja dwa razy: wpis ręczny i jego kopia z banku (±3 dni, ta sama kwota albo prawie ta sama przy podobnej nazwie) albo ten sam wiersz banku
          zaimportowany dwa razy (np. na dwóch komputerach przed synchronizacją – zostaje zadokowana, potem ta z Twoimi danymi: kategorią, notatką, godziną,
          potem nowsza). Zostaje jedna operacja z danymi banku i Twoją kategorią, notatką, godziną; kopie są usuwane – „Cofnij” je odzyskuje. Grupa, w której
          kopia ma inną decyzję, i możliwy duplikat (jedno wspólne słowo nazwy przy innej kwocie) nie są zaznaczone – sprawdź je.
        </p>
        {groups.map((g) => (
          <div key={g.key} className="flex items-start gap-2 border-l border-line pl-2" data-testid="duplicate-group" data-kind={g.kind} data-conflict={g.conflict} data-ask={g.ask || undefined}>
            <input type="checkbox" className="mt-[3px]" checked={picked(g)} disabled={readOnly || !!blockedOf(g)} onChange={() => toggle(g.key)} aria-label="Scal tę grupę" data-testid="duplicate-pick" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <Badge>{g.kind === 'same-row' ? 'ten sam wiersz banku' : g.kind === 'bank-format' ? 'lista operacji + historia rachunku' : 'wpis ręczny + bank'}</Badge>
                {g.differs && <span className="text-dim">{DIFFERS[g.differs]}</span>}
                {g.conflict && <Badge tone="warn">inna decyzja w kopii</Badge>}
                {g.ask && !g.conflict && <Badge tone="warn">możliwy duplikat – zaznacz, jeśli to ta sama operacja</Badge>}
                {blockedOf(g) && <span className="text-accent">{blockedOf(g)}</span>}
                <span className="flex-1" />
                <button type="button" className="text-[11px] text-muted hover:text-fg-strong hover:underline" disabled={readOnly} onClick={() => dismiss(g)} data-testid="duplicate-dismiss">
                  to nie duplikat
                </button>
              </div>
              {line(byId[g.keep], 'keep')}
              {g.remove.map((id) => (
                <div key={id}>{line(byId[id], 'copy')}</div>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-accent h-[26px] self-start" disabled={busy || readOnly || !nRemove} onClick={() => void merge()} data-testid="duplicates-merge">
          {busy ? 'Scalam…' : `Scal zaznaczone (${chosen.length})`}
        </button>
      </div>
    </Panel>
  )
}
