/**
 * The household in the operation's editor (D80): who finances a purchase (a line of a receipt), whose money an income
 * is – the rest beyond their debt as income or their advance, the purchases it pays back – and what the ledger made of
 * it.
 */
import { balanceOf, incomeShares, memberName, payerOf } from '@shared/calc/household'
import { newId } from '@shared/ids'
import { HOUSE_MEMBER_ID, inflowOf, type HouseholdMember, type Split, type Transaction } from '@shared/schema'
import { useHousehold } from '../../store/fleet'
import { AmountField, plnText } from '../../components/fields'
import { IconClose, IconPlus } from '../../components/icons'
import { Segmented, cx } from '../../components/ui'
import { rememberInflows, sureCoversOf, useMembers } from './actions'
import { RepaymentPicker, useLedgerBefore } from './Repayments'

/** The members offered: the active ones and the one already chosen (archived or unknown – it stays as it was). */
function useOffered(current: string | null) {
  const members = useMembers()
  const out = members.filter((m) => !m.archived || m.id === current).map((m) => ({ id: m.id, name: m.name }))
  if (current && !out.some((m) => m.id === current)) out.push({ id: current, name: memberName(current, members) })
  return out
}

/** What „Finansuje” sets: me (a cost of mine), a household member (not my cost, D80) – or their gift (nobody owes it, D83). */
export type Financer = {
  refundable: boolean
  memberId: string | null
  /** Absent = no (the record keeps no `gift: false`). */
  gift?: boolean
}

/** „Finansuje”: me (a cost of mine), a household member (not my cost, D80) or their gift (D83: nobody owes it). */
export function FinancerSelect({
  refundable,
  memberId,
  gift,
  onChange,
  compact,
  testId
}: {
  refundable: boolean
  memberId: string | null
  gift?: boolean
  onChange: (p: Financer) => void
  compact?: boolean
  testId: string
}) {
  const current = refundable ? (memberId ?? HOUSE_MEMBER_ID) : null
  const offered = useOffered(current)
  return (
    <select
      className={cx('input py-0', compact ? 'h-[22px] w-[110px] text-[11px]' : 'h-[24px] min-w-0 flex-1')}
      value={current ? `${gift ? 'gift' : 'pay'}:${current}` : ''}
      onChange={(e) => {
        const [how, id] = e.currentTarget.value.split(':')
        onChange(id ? { refundable: true, memberId: id, gift: how === 'gift' ? true : undefined } : { refundable: false, memberId: null, gift: undefined })
      }}
      aria-label="Kto finansuje"
      title="Wydatek, który finansuje domownik: nie zjada energii i nie jest Twoim kosztem – najpierw z jego zaliczki, resztę pożyczają osłony (ma oddać); prezent – nikt nic nie jest winien, resztę pokrywają osłony"
      data-testid={testId}
    >
      <option value="">{compact ? 'ja' : '— ja (mój wydatek) —'}</option>
      {offered.map((m) => (
        <option key={m.id} value={`pay:${m.id}`}>
          {compact ? m.name : `finansuje: ${m.name}`}
        </option>
      ))}
      {offered.map((m) => (
        <option key={`gift:${m.id}`} value={`gift:${m.id}`}>
          {compact ? `${m.name} – prezent` : `prezent od: ${m.name}`}
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
        const parts = [
          f.fromDeposit ? `z zaliczki ${plnText(f.fromDeposit)} zł` : '',
          f.lent ? `pożyczone z osłon ${plnText(f.lent)} zł (ma oddać)` : '',
          f.gift > 0 ? `prezent – z osłon ${plnText(f.gift)} zł (nikt nic nie jest winien)` : '',
          f.gift < 0 ? `zwrot prezentu do osłon ${plnText(-f.gift)} zł` : '',
          f.repaid ? `spłaca ${plnText(f.repaid)} zł` : '',
          f.advance ? `do zaliczki ${plnText(f.advance)} zł` : ''
        ]
        return (
          <div key={f.memberId}>
            {memberName(f.memberId, members)}: {parts.filter(Boolean).join(' · ') || '—'}
          </div>
        )
      })}
    </div>
  )
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
  const setMember = (id: string) => {
    const m = members.find((x) => x.id === id)
    const inflow = inflowOf(m)
    const next: Partial<Transaction> = id
      ? { memberId: id, repaid: 0, inflowKind: t.inflowKind ?? 'repay', advance: inflow === 'advance', covers: [], coversOpening: undefined, coversOpeningMembers: undefined }
      : { memberId: null, repaid: 0, inflowKind: undefined, advance: false, covers: [], coversOpening: undefined, coversOpeningMembers: undefined }
    // The purchase it surely pays back (D91), named at once – the list below changes it.
    patch(id ? { ...next, ...sureCoversOf({ ...t, ...next }) } : next)
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
          <span>Cel wpłaty:</span>
          <Segmented
            size="sm"
            value={t.inflowKind ?? 'repay'}
            onChange={(inflowKind) => {
              if (inflowKind === 'repay') {
                const next = { memberId: payer, inflowKind: 'repay' as const }
                patch({ ...next, ...sureCoversOf({ ...t, ...next }) })
              } else {
                patch({
                  memberId: payer,
                  inflowKind,
                  covers: [],
                  coversOpening: undefined,
                  coversOpeningMembers: undefined,
                  advance: inflowKind === 'advance'
                })
              }
            }}
            options={[
              { value: 'repay', label: 'spłata zakupów', title: 'Wpłata najpierw spłaca to, co domownik ma oddać' },
              { value: 'income', label: 'niezależny przychód', title: 'Przychód do budżetu od tego domownika – nie spłaca zakupów' },
              { value: 'advance', label: 'depozyt na przyszłość', title: 'Zaliczka do depozytu – nie spłaca dotychczasowych zakupów' }
            ]}
            aria-label="Cel wpłaty domownika"
          />
        </div>
      )}
      {payer && (t.inflowKind === 'repay' || !t.inflowKind) && (
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
      {payer && t.inflowKind === 'income' && (
        <div className="text-[11px] text-dim" data-testid="inflow-kind-note">
          Niezależny przychód do budżetu od {memberName(payer, members)} – nie spłaca zakupów, dług domownika pozostaje bez zmian.
        </div>
      )}
      {payer && t.inflowKind === 'advance' && (
        <div className="text-[11px] text-dim" data-testid="inflow-kind-note">
          Zaliczka na przyszłe zakupy od {memberName(payer, members)} – zasila depozyt, nie spłaca dotychczasowych zakupów.
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
                <Segmented
                  size="sm"
                  value={x.inflowKind ?? 'repay'}
                  onChange={(v) => setPart(x.id, { inflowKind: v, advance: v === 'advance' })}
                  options={[
                    { value: 'repay', label: 'spłata' },
                    { value: 'income', label: 'przychód' },
                    { value: 'advance', label: 'zaliczka' }
                  ]}
                  aria-label="Cel części domownika"
                />
              )}
              {x.memberId && (!x.inflowKind || x.inflowKind === 'repay') && (
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
      {/* D91: the purchases it pays back, per member. */}
      <RepaymentPicker t={t} patch={patch} before={before} />
    </div>
  )
}
