import { useState } from 'react'
import { TX_KIND_LABEL, type BrandAlias, type ImportRule, type TxKind } from '@shared/schema'
import { useData } from '../../store/data'
import { toast } from '../../store/ui'
import { countLabel } from '../../lib/format'
import { IconPlus } from '../../components/icons'
import { Panel, TextField } from '../../components/ui'
import { KeywordRules } from '../import/KeywordRules'
import { clearDismissedSimilar, deleteRule, inactiveAlias, removeInactive, setOwnNames, unmergeAll, unmergeName } from '../import/rules'
import { useAccounts, useCategories } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { memberName } from '@shared/calc/household'

const NO_RULES: ImportRule[] = []
const NO_NAMES: string[] = []
const NO_ALIASES: Record<string, BrandAlias> = {}
const NO_DISMISSED: Record<string, string> = {}

/** Names merged in the import (1.2.2, D78): one group and one rule; „rozłącz” = two again. */
function MergedNames() {
  const aliases = useData((s) => s.fi?.settings.import.aliases ?? NO_ALIASES)
  const dismissed = useData((s) => Object.keys(s.fi?.settings.import.notSimilar ?? NO_DISMISSED).length)
  const list = Object.entries(aliases).sort((a, b) => b[1].at.localeCompare(a[1].at) || a[0].localeCompare(b[0]))
  const inactive = list.filter(([, a]) => inactiveAlias(a)).length
  return (
    <Panel
      title="Połączone nazwy"
      actions={
        <div className="flex gap-1.5">
          {inactive > 0 && (
            <button
              type="button"
              className="btn h-[22px]"
              title="Połączenia z 1.2.2 zrobione na nazwach z datą transakcji – nic już nie łączą"
              onClick={() => {
                const undo = removeInactive()
                if (undo) toast(`Usunięto ${countLabel(inactive, 'nieaktywne połączenie', 'nieaktywne połączenia', 'nieaktywnych połączeń')}.`, 'success', 6000, { label: 'Cofnij', run: undo })
              }}
              data-testid="aliases-remove-inactive"
            >
              Usuń nieaktywne ({inactive})
            </button>
          )}
          {list.length > 1 && (
            <button
              type="button"
              className="btn h-[22px]"
              onClick={() => {
                const undo = unmergeAll()
                if (undo) toast(`Rozłączono ${countLabel(list.length, 'nazwę', 'nazwy', 'nazw')} – każda wraca do własnej grupy.`, 'success', 6000, { label: 'Cofnij', run: undo })
              }}
              data-testid="aliases-unmerge-all"
            >
              Rozłącz wszystkie
            </button>
          )}
        </div>
      }
    >
      <p className="mb-2 text-[11.5px] text-muted">
        Nazwy, które przy imporcie połączyłeś jako jedną firmę albo osobę („Podobne nazwy”, „Połącz nazwy”): jedna grupa i jedna reguła. Rozłączona nazwa
        wraca do własnej grupy (i do reguły, którą miała wcześniej).
      </p>
      {list.length === 0 && <span className="text-[11.5px] text-dim">Brak połączonych nazw.</span>}
      <div className="flex flex-col" data-testid="aliases">
        {list.map(([key, a]) => (
          <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-line/60 py-[3px] text-[12px] last:border-b-0" data-testid="alias">
            <span className="truncate" title={`klucz: ${key} → ${a.to}`}>
              <span className="text-fg-strong">{a.label || key}</span>
              <span className="text-muted"> = {a.toLabel || a.to}</span>
              {inactiveAlias(a) && <span className="text-dim"> · nieaktywne (nazwa z datą transakcji, 1.2.2)</span>}
            </span>
            <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] hover:text-down" onClick={() => unmergeName(key)} data-testid="alias-unmerge">
              rozłącz
            </button>
          </div>
        ))}
      </div>
      {dismissed > 0 && (
        <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-dim">
          Pary oznaczone „To nie to samo”: {dismissed}
          <button type="button" className="text-muted hover:text-fg-strong hover:underline" onClick={clearDismissedSimilar} data-testid="similar-undismiss">
            pokazuj znowu
          </button>
        </div>
      )}
    </Panel>
  )
}

/**
 * Ustawienia → Import (E2): the rules the import learned from the user's decisions (a wrong one is deleted here, the
 * next decision in the import or in Operacje writes it again), the user's keywords (1.2.1), the names merged (1.2.2)
 * and the account holder's names (own transfers).
 */
export function ImportTab() {
  const rules = useData((s) => s.fi?.settings.import.rules ?? NO_RULES)
  const names = useData((s) => s.fi?.settings.import.ownNames ?? NO_NAMES)
  const cats = useCategories()
  const accounts = useAccounts()
  const members = useMembers()
  const [name, setName] = useState('')
  const decision = (r: ImportRule) => {
    const kind = TX_KIND_LABEL[r.kind as TxKind] ?? r.kind
    if (r.kind === 'expense') return `${r.refundable ? `finansuje: ${memberName(r.memberId, members)}` : kind}${r.categoryId ? ` · ${cats.label(r.categoryId)}` : ''}`
    if (r.kind === 'income' && r.household) return `od domownika: ${memberName(r.memberId, members)}`
    if (r.kind === 'transfer') return `${kind}${r.counterAccountId ? ` · ${accounts.find((a) => a.id === r.counterAccountId)?.name ?? '?'}` : ''}`
    return kind
  }
  const sorted = rules.filter((r) => r.mode !== 'keyword').sort((a, b) => b.hits - a.hits || a.label.localeCompare(b.label))
  return (
    <>
      <Panel title="Reguły importu">
        <p className="mb-2 text-[11.5px] text-muted">
          Powstają z Twoich decyzji przy imporcie z mBanku („zapamiętaj”, „Przyjmij pewne”) i z przycisku „Zapamiętaj” w Operacjach – dla marki: sieć w
          każdym mieście to jedna reguła. Kategoria mBanku nie tworzy reguł – jest tylko podpowiedzią. Usunięta reguła wróci, gdy znów zdecydujesz za
          kontrahenta.
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
      <Panel title="Słowa kluczowe">
        <KeywordRules />
      </Panel>
      <MergedNames />
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
