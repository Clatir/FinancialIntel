/**
 * The household in the operation's editor (D80): who finances a purchase (a line of a receipt), whose money an income
 * is – the rest beyond their debt as income or their advance, the purchases it pays back – and what the ledger made of
 * it.
 */
import { balanceOf, memberName, payerOf } from '@shared/calc/household'
import { HOUSE_MEMBER_ID, inflowOf, type Transaction } from '@shared/schema'
import { useData } from '../../store/data'
import { useHousehold } from '../../store/fleet'
import { plnText } from '../../components/fields'
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

/** An income from a household member (D80): whose, the rest as income or their advance, the purchases it pays back. */
export function MemberIncome({ t, patch }: { t: Transaction; patch: (p: Partial<Transaction>) => void }) {
  const members = useMembers()
  const ledger = useHousehold()
  const transactions = useData((s) => s.records.transactions)
  // Chosen before the amount is typed (0 zł) – it stays chosen.
  const payer = t.memberId ?? payerOf(t)
  const offered = useOffered(payer)
  const flow = ledger?.byTx.get(t.id)?.[0]
  const balance = payer && ledger ? balanceOf(ledger, payer) : null
  // The purchases it may pay back: the member's still owed (up to its date) and the ones it covers already.
  const choices = payer
    ? [...new Set([...(balance?.open ?? []).filter((o) => o.date <= t.date).map((o) => o.txId), ...t.covers])].map((id) => transactions[id]?.record).filter((x): x is Transaction => !!x)
    : []
  const setMember = (id: string) => {
    const m = members.find((x) => x.id === id)
    patch(id ? { memberId: id, repaid: 0, advance: inflowOf(m) === 'advance', covers: [] } : { memberId: null, repaid: 0, advance: false, covers: [] })
  }
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
        <>
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
            <span>Reszta ponad to, co ma oddać:</span>
            <Segmented
              size="sm"
              value={t.memberId && t.advance ? 'advance' : 'income'}
              onChange={(v) => {
                const advance = v === 'advance'
                patch({ memberId: payer, repaid: 0, advance })
                // Asked once, remembered for the member (D80 b).
                rememberInflows([{ kind: 'income', memberId: payer, advance }])
              }}
              options={[
                { value: 'income', label: 'przychód' },
                { value: 'advance', label: 'zaliczka' }
              ]}
              aria-label="Reszta wpłaty domownika"
            />
          </div>
          {flow && (
            <div className="text-[11.5px] text-muted" data-testid="operation-member-flow">
              {[flow.repaid ? `spłaca ${plnText(flow.repaid)} zł` : '', flow.advance ? `zaliczka ${plnText(flow.advance)} zł` : '', flow.income ? `przychód ${plnText(flow.income)} zł` : ''].filter(Boolean).join(' · ') || 'nic do rozliczenia'}
            </div>
          )}
          {balance && (
            <div className="text-[11px] text-dim" data-testid="operation-member-balance">
              {memberName(payer, members)} teraz: {balance.owed ? `ma oddać ${plnText(balance.owed)} zł` : balance.deposit ? `zaliczka ${plnText(balance.deposit)} zł` : 'rozliczony'}
            </div>
          )}
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
        </>
      )}
    </div>
  )
}
