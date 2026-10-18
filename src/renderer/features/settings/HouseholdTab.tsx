import { useState } from 'react'
import { warsawNow } from '@shared/calc/dates'
import { balanceOf } from '@shared/calc/household'
import { inflowOf, type HouseholdMember, type MemberInflow } from '@shared/schema'
import { useData } from '../../store/data'
import { useFleet, useHousehold } from '../../store/fleet'
import { AmountField, DateField, plnText } from '../../components/fields'
import { IconPlus } from '../../components/icons'
import { NameInput, Panel, Segmented, Toggle, cx } from '../../components/ui'
import { plDate } from '../../lib/format'
import { addMember, patchMember, setHouseholdSince, useMembers } from '../household/actions'

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
      <SinceRow />
      <div className="flex flex-col">
        {members.map((m) => (
          <MemberRow key={m.id} m={m} taken={names} others={members.filter((x) => x.id !== m.id && !x.archived)} />
        ))}
      </div>
    </Panel>
  )
}

/**
 * The settlements' start (D81): the members' balances count from it – what they owed or had paid ahead before goes in as
 * their opening balance; their money before it is not income.
 */
function SinceRow() {
  const since = useData((s) => s.fi?.settings.household.since)
  const budgetStart = useFleet()?.start ?? null
  const readOnly = useData((s) => !!s.status?.readOnly)
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 border-y border-line/70 py-2 text-[11.5px]" data-testid="household-since-row">
      <span className="text-fg-strong">Rozliczenia od:</span>
      {since ? (
        <>
          <DateField className="w-[104px]" value={since} onChange={(d) => !readOnly && setHouseholdSince(d)} aria-label="Rozliczenia od" data-testid="household-since" />
          <button type="button" className="text-dim hover:text-fg-strong" disabled={readOnly} onClick={() => setHouseholdSince(null)} data-testid="household-since-budget">
            od startu budżetu
          </button>
        </>
      ) : (
        <>
          <span className="num" data-testid="household-since-none">
            startu budżetu{budgetStart ? ` (${plDate(budgetStart)})` : ''}
          </span>
          <button type="button" className="text-accent hover:underline" disabled={readOnly} onClick={() => setHouseholdSince(warsawNow().date)} data-testid="household-since-today">
            od dziś
          </button>
        </>
      )}
      <span className="basis-full text-muted">
        Wcześniejsze przelewy domowników nie są Twoim przychodem. To, co ktoś był winien albo wpłacił z góry przed tą datą, wpisz niżej jako jego saldo na start.
      </span>
    </div>
  )
}

/** A member's balance at the settlements' start (D81): what they owed then, or what they had paid ahead. */
function OpeningField({ m }: { m: HouseholdMember }) {
  // The kind follows the balance kept (also when another computer or „Cofnij” changes it); chosen here while empty.
  const [chosen, setKind] = useState<'owed' | 'deposit'>('owed')
  const kind = m.opening.deposit > 0 ? 'deposit' : m.opening.owed > 0 ? 'owed' : chosen
  const value = kind === 'deposit' ? m.opening.deposit : m.opening.owed
  const set = (k: 'owed' | 'deposit', v: number) => patchMember(m.id, { opening: k === 'deposit' ? { owed: 0, deposit: v } : { owed: v, deposit: 0 } })
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted">Na start rozliczeń:</span>
      <Segmented
        size="sm"
        value={kind}
        onChange={(k) => {
          setKind(k)
          if (value) set(k, value)
        }}
        options={[
          { value: 'owed', label: 'ma oddać' },
          { value: 'deposit', label: 'zaliczka' }
        ]}
        aria-label="Saldo na start rozliczeń"
      />
      <AmountField className="w-[100px]" value={value || null} allowEmpty onChange={(v) => set(kind, v ?? 0)} aria-label="Kwota na start rozliczeń" data-testid="member-opening" />
      <span className="text-muted">zł</span>
    </span>
  )
}

function MemberRow({ m, taken, others }: { m: HouseholdMember; taken: Set<string>; others: readonly HouseholdMember[] }) {
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px]">
        <OpeningField m={m} />
        <span className="flex items-center gap-1.5">
          <span className="text-muted" title="Bez własnego konta: jego pieniądze przychodzą przelewem innego domownika. Przy jego wpłacie pojawi się „+ także za …” – nic nie dzieje się samo.">
            Pieniądze przekazuje przez:
          </span>
          <select className="input h-[22px] w-[150px] py-0 text-[11.5px]" value={m.via ?? ''} onChange={(e) => patchMember(m.id, { via: e.currentTarget.value || null })} aria-label="Przekazuje przez" data-testid="member-via">
            <option value="">— sam(a) —</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
            {m.via && !others.some((o) => o.id === m.via) && <option value={m.via}>(domownik spoza listy)</option>}
          </select>
        </span>
      </div>
    </div>
  )
}
