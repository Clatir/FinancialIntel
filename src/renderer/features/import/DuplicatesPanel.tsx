import { useMemo, useState } from 'react'
import { findDuplicates, mergeDuplicate, type DuplicateGroup } from '@shared/import/duplicates'
import type { Transaction } from '@shared/schema'
import { errorMessage } from '../../lib/api'
import { plural } from '../../lib/format'
import { replaceRecords, updateRecord, updateSettings, useData } from '../../store/data'
import { useRecordList } from '../../store/records'
import { navigate, toast } from '../../store/ui'
import { signedPln } from '../../components/fields'
import { Badge, Panel } from '../../components/ui'
import { deleteManyWithUndo } from '../history/actions'
import { selectOperation, setFilter } from '../operations/state'
import { useAccounts, useCategories } from '../operations/pickers'

const NO_DISMISSED: Record<string, string> = {}

/** The duplicates among the saved operations (drafts left out): recomputed when the operations change. */
export function useDuplicates(): { groups: DuplicateGroup[]; byId: Record<string, Transaction> } {
  const records = useData((s) => s.records.transactions)
  const drafts = useData((s) => s.drafts)
  const dismissed = useData((s) => s.fi?.settings.import.notDuplicates ?? NO_DISMISSED)
  const dockings = useRecordList('dockings')
  return useMemo(() => {
    const byId: Record<string, Transaction> = {}
    for (const [id, e] of Object.entries(records)) if (!drafts[id]) byId[id] = e.record
    return { groups: findDuplicates(Object.values(byId), dockings, dismissed), byId }
  }, [records, drafts, dismissed, dockings])
}

const DIFFERS = { '': '', name: 'inna nazwa', amount: 'inna kwota', both: 'inna nazwa i kwota' } as const

/**
 * Operacje that are one and the same (D77, like ICTTJ's „Duplikaty z importu”): the kept one takes what only the
 * copies had, the copies go with one „Cofnij”; a conflict (another decision in a copy) is not ticked until the user
 * looks; „to nie duplikat” is remembered for the folder.
 */
export function DuplicatesPanel() {
  const { groups, byId } = useDuplicates()
  const dockings = useRecordList('dockings')
  const readOnly = useData((s) => !!s.status?.readOnly)
  const cats = useCategories()
  const accounts = useAccounts()
  // Groups the user ticked or unticked against the default (ticked unless a conflict or blocked).
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  if (!groups.length) return null
  const picked = (g: DuplicateGroup) => !g.blocked && (g.conflict ? toggled.has(g.key) : !toggled.has(g.key))
  const chosen = groups.filter(picked)
  const nRemove = chosen.reduce((n, g) => n + g.remove.length, 0)
  const toggle = (key: string) => setToggled((s) => (s.has(key) ? new Set([...s].filter((k) => k !== key)) : new Set([...s, key])))

  const merge = async () => {
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const kept: Transaction[] = []
      const ids: string[] = []
      for (const g of chosen) {
        const keep = byId[g.keep]
        const copies = g.remove.map((id) => byId[id]).filter((t): t is Transaction => !!t)
        if (!keep || !copies.length) continue
        kept.push(mergeDuplicate(keep, copies, g.kind, now))
        // A copy's docking goes to the kept operation (blocked groups – both docked – are never merged here).
        for (const d of dockings) if (g.remove.includes(d.transactionId)) updateRecord('dockings', d.id, (x) => ({ ...x, transactionId: g.keep }))
        ids.push(...copies.map((t) => t.id))
      }
      replaceRecords('transactions', kept)
      await deleteManyWithUndo('transactions', ids, 'duplikaty operacji', (n) => `Scalono duplikaty: usunięto ${n} ${plural(n, 'kopię', 'kopie', 'kopii')}.`)
      setToggled(new Set())
    } catch (e) {
      toast(errorMessage(e), 'error', 8000)
    } finally {
      setBusy(false)
    }
  }

  const dismiss = (g: DuplicateGroup) =>
    updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates: { ...f.settings.import.notDuplicates, [g.key]: new Date().toISOString() } } } }))

  const line = (t: Transaction | undefined, role: 'keep' | 'copy') => {
    if (!t) return null
    const account = accounts.find((a) => a.id === t.accountId)?.name ?? '?'
    const category = t.kind === 'expense' ? cats.label(t.categoryId) || 'bez kategorii' : t.kind
    return (
      <button
        type="button"
        className="grid w-full grid-cols-[62px_minmax(0,1fr)_88px] items-center gap-2 text-left hover:text-fg-strong"
        onClick={() => {
          setFilter({ period: { kind: 'all' }, query: '' })
          selectOperation(t.id)
          navigate({ page: 'operations' })
        }}
        data-testid={`duplicate-${role}`}
      >
        <span className="num text-muted">
          {t.date.slice(8, 10)}.{t.date.slice(5, 7)}.{t.date.slice(2, 4)}
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
          zaimportowany dwa razy (np. na dwóch komputerach przed synchronizacją – zostaje nowsza wersja). Zostaje jedna operacja z danymi banku i Twoją
          kategorią, notatką, godziną; kopie są usuwane – „Cofnij” je przywraca. Grupa, w której kopia ma inną decyzję, nie jest zaznaczona – sprawdź ją.
        </p>
        {groups.map((g) => (
          <div key={g.key} className="flex items-start gap-2 border-l border-line pl-2" data-testid="duplicate-group" data-kind={g.kind} data-conflict={g.conflict}>
            <input type="checkbox" className="mt-[3px]" checked={picked(g)} disabled={readOnly || !!g.blocked} onChange={() => toggle(g.key)} aria-label="Scal tę grupę" data-testid="duplicate-pick" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <Badge>{g.kind === 'same-row' ? 'ten sam wiersz banku' : 'wpis ręczny + bank'}</Badge>
                {g.differs && <span className="text-dim">{DIFFERS[g.differs]}</span>}
                {g.conflict && <Badge tone="warn">inna decyzja w kopii</Badge>}
                {g.blocked && <span className="text-accent">{g.blocked}</span>}
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
