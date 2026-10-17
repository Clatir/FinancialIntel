import { useState } from 'react'
import { TX_KIND_LABEL, type ImportRule, type TxKind } from '@shared/schema'
import { useData } from '../../store/data'
import { IconPlus } from '../../components/icons'
import { Panel, TextField } from '../../components/ui'
import { deleteRule, setOwnNames } from '../import/rules'
import { useAccounts, useCategories } from '../operations/pickers'

const NO_RULES: ImportRule[] = []
const NO_NAMES: string[] = []

/**
 * Ustawienia → Import (E2): the rules the import learned from the user's decisions (a wrong one is deleted here, the
 * next decision in the import or in Operacje writes it again) and the account holder's names (own transfers).
 */
export function ImportTab() {
  const rules = useData((s) => s.fi?.settings.import.rules ?? NO_RULES)
  const names = useData((s) => s.fi?.settings.import.ownNames ?? NO_NAMES)
  const cats = useCategories()
  const accounts = useAccounts()
  const [name, setName] = useState('')
  const decision = (r: ImportRule) => {
    const kind = TX_KIND_LABEL[r.kind as TxKind] ?? r.kind
    if (r.kind === 'expense') return `${r.refundable ? 'do zwrotu' : kind}${r.categoryId ? ` · ${cats.label(r.categoryId)}` : ''}`
    if (r.kind === 'income' && r.household) return 'od domownika (zwrot należności)'
    if (r.kind === 'transfer') return `${kind}${r.counterAccountId ? ` · ${accounts.find((a) => a.id === r.counterAccountId)?.name ?? '?'}` : ''}`
    return kind
  }
  const sorted = [...rules].sort((a, b) => b.hits - a.hits || a.label.localeCompare(b.label))
  return (
    <>
      <Panel title="Reguły importu">
        <p className="mb-2 text-[11.5px] text-muted">
          Powstają z Twoich decyzji przy imporcie z mBanku („zapamiętaj”) i z przycisku „Zapamiętaj” w Operacjach. Kategoria mBanku nie tworzy reguł – jest
          tylko podpowiedzią. Usunięta reguła wróci, gdy znów zdecydujesz za kontrahenta.
        </p>
        {sorted.length === 0 && <span className="text-[11.5px] text-dim">Brak reguł – pojawią się po pierwszym imporcie.</span>}
        <div className="flex flex-col" data-testid="import-rules">
          {sorted.map((r) => (
            <div key={r.id} className="grid grid-cols-[minmax(0,1.2fr)_70px_minmax(0,1.5fr)_70px_auto] items-center gap-2 border-b border-line/60 py-[3px] text-[12px] last:border-b-0" data-testid="import-rule">
              <span className="truncate text-fg-strong" title={`klucz: ${r.match}${r.mode === 'contains' ? ' (zawiera)' : ''}`}>
                {r.label || r.match}
              </span>
              <span className="text-muted">{r.direction === 'in' ? 'wpływy' : r.direction === 'out' ? 'wydatki' : 'oba'}</span>
              <span className="truncate text-muted">{decision(r)}</span>
              <span className="num text-right text-dim">{r.hits}×</span>
              <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] hover:text-down" onClick={() => deleteRule(r.id)} data-testid="import-rule-delete">
                usuń
              </button>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Twoje nazwiska w banku">
        <p className="mb-2 text-[11.5px] text-muted">
          Przelew z albo na rachunek o takiej nazwie to przelew własny (nie koszt, nie przychód). Import dopisuje tu właściciela rachunku z pliku mBanku.
        </p>
        <div className="flex flex-col gap-1">
          {names.map((n) => (
            <div key={n} className="flex items-center gap-2 text-[12px]" data-testid="own-name">
              <span className="flex-1 text-fg-strong">{n}</span>
              <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] hover:text-down" onClick={() => setOwnNames(names.filter((x) => x !== n))}>
                usuń
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <TextField className="w-[260px]" value={name} onChange={setName} placeholder="IMIĘ NAZWISKO jak w banku" maxLength={120} data-testid="own-name-input" />
            <button
              type="button"
              className="btn h-[24px]"
              disabled={!name.trim() || names.some((n) => n.toLowerCase() === name.trim().toLowerCase())}
              onClick={() => {
                setOwnNames([...names, name.trim()])
                setName('')
              }}
              data-testid="own-name-add"
            >
              <IconPlus size={12} /> Dodaj
            </button>
          </div>
        </div>
      </Panel>
    </>
  )
}
