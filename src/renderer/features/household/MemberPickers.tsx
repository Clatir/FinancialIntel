/**
 * The household in the operation's editor (D80): who finances a purchase (a line of a receipt), whose money an income
 * is – the rest beyond their debt as income or their advance, the purchases it pays back – and what the ledger made of
 * it.
 */
import { useMemo } from 'react'
import { warsawNow } from '@shared/calc/dates'
import { householdOf } from '@shared/calc/fleet'
import { balanceOf, incomeShares, ledgerOrder, memberName, payerOf, type HouseholdLedger } from '@shared/calc/household'
import { newId } from '@shared/ids'
import { HOUSE_MEMBER_ID, inflowOf, type HouseholdMember, type Split, type Transaction } from '@shared/schema'
import { useData } from '../../store/data'
import { fleetInputNow, useHousehold } from '../../store/fleet'
import { AmountField, plnText } from '../../components/fields'
import { IconClose, IconPlus } from '../../components/icons'
import { Segmented, cx } from '../../components/ui'
import { rememberInflows, useMembers } from './actions'

/** The members offered: the active ones and the one already chosen (archived or unknown – it stays as it was). */
function useOffered(current: string | null) {
  const members = useMembers()
  const out = members.filter((m) => !m.archived || m.id === current).map((m) => ({ id: m.id, name: m.name }))
  if (current && !out.some((m) => m.id === current)) out.push({ id: current, name: memberName(current, members) })
  return out
}

/** „Finansuje”: me (a cost of mine) or a household member (not my cost, D80). */
export function FinancerSelect({
  refundable,
  memberId,
  onChange,
  compact,
  testId
}: {
  refundable: boolean
  memberId: string | null
  onChange: (p: { refundable: boolean; memberId: string | null }) => void
  compact?: boolean
  testId: string
}) {
  const current = refundable ? (memberId ?? HOUSE_MEMBER_ID) : null
  const offered = useOffered(current)
  return (
    <select
      className={cx('input py-0', compact ? 'h-[22px] w-[96px] text-[11px]' : 'h-[24px] min-w-0 flex-1')}
      value={current ?? ''}
      onChange={(e) => {
        const id = e.currentTarget.value
        onChange(id ? { refundable: true, memberId: id } : { refundable: false, memberId: null })
      }}
      aria-label="Kto finansuje"
      title="Wydatek, który finansuje domownik: nie zjada energii i nie jest Twoim kosztem – najpierw z jego zaliczki, resztę pożyczają osłony"
      data-testid={testId}
    >
      <option value="">{compact ? 'ja' : '— ja (mój wydatek) —'}</option>
      {offered.map((m) => (
        <option key={m.id} value={m.id}>
          {compact ? m.name : `finansuje: ${m.name}`}
        </option>
      ))}
    </select>
  )
}

/** What the ledger made of a financed purchase: from their advance, lent by the shields. */
export function FinancedNote({ t }: { t: Transaction }) {
  const ledger = useHousehold()
  const members = useMembers()
  const flows = ledger?.byTx.get(t.id) ?? []
  if (!flows.length) return null
  return (
    <div className="text-[11.5px] text-muted" data-testid="operation-financed">
      {flows.map((f) => {
        const parts = [f.fromDeposit ? `z zaliczki ${plnText(f.fromDeposit)} zł` : '', f.lent ? `pożyczone z osłon ${plnText(f.lent)} zł (ma oddać)` : '', f.repaid ? `spłaca ${plnText(f.repaid)} zł` : '', f.advance ? `do zaliczki ${plnText(f.advance)} zł` : '']
        return (
          <div key={f.memberId}>
            {memberName(f.memberId, members)}: {parts.filter(Boolean).join(' · ') || '—'}
          </div>
        )
      })}
    </div>
  )
}

/** The ledger of the operations before `t` (the engine's order): what each member owed when it came. */
function useLedgerBefore(t: Transaction): HouseholdLedger | null {
  const records = useData((s) => s.records.transactions)
  const fi = useData((s) => s.fi)
  return useMemo(() => {
    const input = fleetInputNow()
    if (!input) return null
    return householdOf({ ...input, transactions: input.transactions.filter((x) => x.id !== t.id && ledgerOrder(x, t) < 0) }, warsawNow().date, t.date)
    // The engine's input is read whole: it changes with the records and the settings.
  }, [records, fi, t.id, t.date, t.time, t.createdAt])
}

const INCOME_REST = [
  { value: 'income', label: 'przychód' },
  { value: 'advance', label: 'zaliczka' }
] as const

/**
 * An income from household members (D80, D81): whose money (the sender – „Od domownika”), its parts of other members
 * (one transfer carrying the money of several: „+ także za …” for whom the sender passes money, or any split), the
 * rest beyond what each owes as income or their advance, the purchases it pays back – and what the ledger made of it.
 */
export function MemberIncome({ t, patch }: { t: Transaction; patch: (p: Partial<Transaction>) => void }) {
  const members = useMembers()
  const ledger = useHousehold()
  const transactions = useData((s) => s.records.transactions)
  // Chosen before the amount is typed (0 zł) – it stays chosen.
  const payer = t.memberId ?? payerOf(t)
  const offered = useOffered(payer)
  const flows = ledger?.byTx.get(t.id) ?? []
  const before = useLedgerBefore(t)
  const parts = t.splits
  const partsSum = parts.reduce((a, x) => a + x.amount, 0)
  const rest = t.amount - partsSum
  // Who passes money through the sender (D81): a hint, one click each – never applied by itself.
  const through = payer ? members.filter((m) => !m.archived && m.via === payer && !parts.some((x) => x.memberId === m.id)) : []
  const shareMembers = [...new Set(incomeShares({ ...t, amount: Math.max(t.amount, partsSum) }).map((x) => x.memberId).filter((x): x is string => !!x))]
  // The purchases it may pay back: still owed by its members (up to its date) and the ones it covers already.
  const choices = [...new Set([...shareMembers.flatMap((id) => (ledger ? balanceOf(ledger, id).open : []).filter((o) => o.date <= t.date).map((o) => o.txId)), ...t.covers])]
    .map((id) => transactions[id]?.record)
    .filter((x): x is Transaction => !!x)
  const setMember = (id: string) => {
    const m = members.find((x) => x.id === id)
    patch(id ? { memberId: id, repaid: 0, advance: inflowOf(m) === 'advance', covers: [] } : { memberId: null, repaid: 0, advance: false, covers: [] })
  }
  const setParts = (splits: Split[]) => patch({ splits, repaid: 0 })
  const addPart = (m: Pick<HouseholdMember, 'id' | 'inflow'> | null, amount: number) =>
    setParts([...parts, { id: newId(), amount, categoryId: null, refundable: false, memberId: m?.id ?? null, advance: !!m && inflowOf(m) === 'advance', note: '' }])
  const setPart = (id: string, p: Partial<Split>) => setParts(parts.map((x) => (x.id === id ? { ...x, ...p } : x)))
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-2" data-testid="operation-member-income">
      <span className="label">Od domownika</span>
      <select className="input h-[24px] w-[240px] py-0" value={payer ?? ''} onChange={(e) => setMember(e.currentTarget.value)} aria-label="Od domownika" data-testid="operation-payer">
        <option value="">— nie, zwykły wpływ —</option>
        {offered.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {payer && (
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
          <span>{parts.length ? `Reszta (${memberName(payer, members)}) ponad to, co ma oddać:` : 'Reszta ponad to, co ma oddać:'}</span>
          <Segmented
            size="sm"
            value={t.memberId && t.advance ? 'advance' : 'income'}
            onChange={(v) => {
              const advance = v === 'advance'
              patch({ memberId: payer, repaid: 0, advance })
              // Asked once, remembered for the member (D80 b).
              rememberInflows([{ kind: 'income', memberId: payer, advance }])
            }}
            options={[...INCOME_REST]}
            aria-label="Reszta wpłaty domownika"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
        {through.map((m) => {
          const owed = before ? balanceOf(before, m.id).owed : 0
          return (
            <button
              key={m.id}
              type="button"
              className="text-accent hover:underline"
              onClick={() => addPart(m, Math.max(0, Math.min(owed, rest)))}
              title={`${m.name} przekazuje pieniądze przez: ${memberName(payer, members)} – część tej wpłaty jako jej / jego`}
              data-testid="operation-also-for"
            >
              + także za {m.name}
              {owed ? ` (ma oddać ${plnText(owed)} zł)` : ''}
            </button>
          )
        })}
        <button type="button" className="flex items-center gap-1 text-dim hover:text-fg-strong" onClick={() => addPart(members.find((m) => !m.archived && m.id !== payer) ?? null, 0)} data-testid="operation-income-split">
          <IconPlus size={11} /> podziel na osoby
        </button>
      </div>
      {parts.length > 0 && (
        <div className="flex flex-col gap-1 border-l-2 border-line-strong pl-2" data-testid="income-split">
          {parts.map((x, i) => (
            <div key={x.id} className="flex flex-wrap items-center gap-1.5" data-testid="income-split-line">
              <AmountField className="w-[96px]" value={x.amount} onChange={(v) => setPart(x.id, { amount: Math.max(0, v ?? 0) })} aria-label={`Kwota części ${i + 1}`} data-testid="income-split-amount" />
              <select
                className="input h-[22px] w-[130px] py-0 text-[11px]"
                value={x.memberId ?? ''}
                onChange={(e) => {
                  const m = members.find((y) => y.id === e.currentTarget.value)
                  setPart(x.id, { memberId: m?.id ?? null, advance: !!m && inflowOf(m) === 'advance' })
                }}
                aria-label="Czyja część"
                data-testid="income-split-member"
              >
                <option value="">mój przychód</option>
                {members
                  .filter((m) => !m.archived || m.id === x.memberId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
              {x.memberId && (
                <Segmented size="sm" value={x.advance ? 'advance' : 'income'} onChange={(v) => setPart(x.id, { advance: v === 'advance' })} options={[...INCOME_REST]} aria-label="Reszta części domownika" />
              )}
              <button type="button" className="btn btn-ghost h-[22px] px-1" title="Usuń część" onClick={() => setParts(parts.filter((y) => y.id !== x.id))} data-testid="income-split-remove">
                <IconClose size={12} />
              </button>
            </div>
          ))}
          <div className={cx('text-[11px]', rest < 0 ? 'text-down' : 'text-muted')} data-testid="income-split-rest">
            {rest < 0 ? `Części przekraczają kwotę o ${plnText(-rest)} zł.` : `Reszta ${plnText(rest)} zł – ${payer ? memberName(payer, members) : 'mój przychód'}.`}
          </div>
        </div>
      )}
      {flows.length > 0 && (
        <div className="flex flex-col text-[11.5px] text-muted" data-testid="operation-member-flow">
          {flows.map((f) => (
            <span key={f.memberId}>
              {flows.length > 1 || parts.length ? `${memberName(f.memberId, members)}: ` : ''}
              {[f.repaid ? `spłaca ${plnText(f.repaid)} zł` : '', f.advance ? `zaliczka ${plnText(f.advance)} zł` : '', f.income ? `przychód ${plnText(f.income)} zł` : ''].filter(Boolean).join(' · ') || 'nic do rozliczenia'}
            </span>
          ))}
        </div>
      )}
      {ledger &&
        shareMembers.map((id) => {
          const balance = balanceOf(ledger, id)
          return (
            <div key={id} className="text-[11px] text-dim" data-testid="operation-member-balance">
              {memberName(id, members)} teraz: {balance.owed ? `ma oddać ${plnText(balance.owed)} zł` : balance.deposit ? `zaliczka ${plnText(balance.deposit)} zł` : 'rozliczony'}
            </div>
          )
        })}
      {choices.length > 0 && (
        <div className="flex flex-col gap-0.5 text-[11.5px]" data-testid="operation-covers">
          <span className="text-muted">Pokrywa (inaczej od najstarszych):</span>
          {choices.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-muted">
              <input
                type="checkbox"
                checked={t.covers.includes(c.id)}
                onChange={(e) => patch({ covers: e.currentTarget.checked ? [...t.covers, c.id] : t.covers.filter((x) => x !== c.id) })}
                data-testid="operation-cover"
              />
              <span className="num">
                {c.date.slice(8, 10)}.{c.date.slice(5, 7)}
              </span>
              <span className="min-w-0 flex-1 truncate">{c.counterparty || 'zakup'}</span>
              <span className="num">{plnText(-c.amount)} zł</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
