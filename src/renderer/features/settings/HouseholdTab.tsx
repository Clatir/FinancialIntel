import { useState } from 'react'
import { balanceOf } from '@shared/calc/household'
import { inflowOf, type HouseholdMember, type MemberInflow } from '@shared/schema'
import { useData } from '../../store/data'
import { useHousehold } from '../../store/fleet'
import { plnText } from '../../components/fields'
import { IconPlus } from '../../components/icons'
import { NameInput, Panel, Segmented, Toggle, cx } from '../../components/ui'
import { addMember, patchMember, useMembers } from '../household/actions'

const INFLOW_OPTIONS: Array<{ value: MemberInflow; label: string }> = [
  { value: 'ask', label: 'pytaj' },
  { value: 'advance', label: 'zaliczka' },
  { value: 'income', label: 'przychód' }
]

/**
 * Ustawienia → Domownicy (D80): who finances purchases and pays ahead – their names in the bank (the import knows their
 * transfers by them) and what their money beyond their debt is. Deleting = archiving: their balance still counts.
 */
export function HouseholdTab() {
  const members = useMembers()
  const readOnly = useData((s) => !!s.status?.readOnly)
  const names = new Set(members.map((m) => m.name.toLowerCase()))
  return (
    <Panel
      title="Domownicy"
      actions={
        <button
          className="btn h-[22px]"
          disabled={readOnly}
          onClick={() => {
            let name = 'Domownik'
            for (let i = 2; names.has(name.toLowerCase()); i++) name = `Domownik ${i}`
            addMember(name)
          }}
          data-testid="member-add"
        >
          <IconPlus size={12} /> Domownik
        </button>
      }
    >
      <p className="mb-2 text-[11.5px] text-muted">
        Wydatek, który finansuje domownik (cały albo część paragonu), nie zjada energii i nie jest Twoim kosztem: najpierw bierze z jego zaliczki, resztę
        pożyczają osłony, aż odda. Jego wpłata najpierw wyrównuje to, co ma oddać, reszta to zaliczka albo przychód. Zakupy oznaczone przed 1.3.0 („do
        zwrotu”) należą do pierwszej osoby z listy – zmień jej imię, jeśli to konkretna osoba.
      </p>
      <div className="flex flex-col">
        {members.map((m) => (
          <MemberRow key={m.id} m={m} taken={names} />
        ))}
      </div>
    </Panel>
  )
}

function MemberRow({ m, taken }: { m: HouseholdMember; taken: Set<string> }) {
  const ledger = useHousehold()
  const [bankName, setBankName] = useState('')
  const b = ledger ? balanceOf(ledger, m.id) : null
  const addBankName = () => {
    const v = bankName.trim()
    if (!v || m.bankNames.some((x) => x.toLowerCase() === v.toLowerCase())) return setBankName('')
    patchMember(m.id, { bankNames: [...m.bankNames, v.slice(0, 120)] })
    setBankName('')
  }
  return (
    <div className={cx('flex flex-col gap-1.5 border-b border-line/70 py-2 last:border-b-0', m.archived && 'opacity-60')} data-testid="member-row" data-name={m.name}>
      <div className="flex flex-wrap items-center gap-2">
        <NameInput
          className="w-[160px]"
          value={m.name}
          maxLength={40}
          emptyMessage="Domownik musi mieć imię."
          validate={(name) => (name.toLowerCase() !== m.name.toLowerCase() && taken.has(name.toLowerCase()) ? 'Taki domownik już jest.' : null)}
          onChange={(name) => patchMember(m.id, { name })}
          aria-label="Imię domownika"
          data-testid="member-name"
        />
        <span className="text-[11.5px] text-muted">reszta wpłaty ponad to, co ma oddać:</span>
        <Segmented size="sm" value={inflowOf(m)} onChange={(inflow) => patchMember(m.id, { inflow })} options={INFLOW_OPTIONS} aria-label="Reszta wpłaty domownika" />
        <span className="flex-1" />
        {b && (b.owed > 0 || b.deposit > 0) && (
          <span className={cx('num text-[11.5px]', b.owed > 0 ? 'text-accent' : 'text-muted')} data-testid="member-balance">
            {b.owed > 0 ? `ma oddać ${plnText(b.owed)} zł` : `zaliczka ${plnText(b.deposit)} zł`}
          </span>
        )}
        <Toggle checked={m.archived} onChange={(archived) => patchMember(m.id, { archived })} label="archiwum" data-testid="member-archived" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
        <span className="text-muted">Nazwy w banku:</span>
        {m.bankNames.map((n) => (
          <span key={n} className="flex items-center gap-1 border border-line px-1.5 py-[1px]" data-testid="member-bank-name">
            {n}
            <button type="button" className="text-dim hover:text-down" onClick={() => patchMember(m.id, { bankNames: m.bankNames.filter((x) => x !== n) })} aria-label={`Usuń ${n}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className="input w-[200px]"
          value={bankName}
          onChange={(e) => setBankName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addBankName()
          }}
          placeholder="np. ANNA KOWALSKA"
          maxLength={120}
          aria-label="Nazwa domownika w banku"
          data-testid="member-bank-input"
        />
        <button type="button" className="btn h-[22px]" onClick={addBankName} data-testid="member-bank-add">
          Dodaj
        </button>
      </div>
    </div>
  )
}
