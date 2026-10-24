/**
 * Which purchases a household member's money pays back (1.12.0, D91) in the operation's editor: on a financed purchase
 * – how much of it is paid back and by which operations, „Przypisz zwrot…” from their money waiting to be assigned; on
 * a member's money (an income, a part of a transfer through another member, a product return of their purchase) – the
 * purchases it pays back, per member, with the sure one or the options offered.
 */
import { useMemo } from 'react'
import { warsawNow } from '@shared/calc/dates'
import { householdBefore } from '@shared/calc/fleet'
import { balanceOf, isOpeningItem, memberName, purchaseStatus, type HouseholdLedger, type OpenPurchase, type PurchaseState } from '@shared/calc/household'
import { dm } from '@shared/format'
import { assignsOn, choicesForRepayment, matchCovers, matchReturn, names, repaymentShares, waitingForPurchase, withNamed } from '@shared/calc/repayments'
import type { Transaction } from '@shared/schema'
import { useData, useFolderLocked } from '../../store/data'
import { fleetInputNow, useHousehold } from '../../store/fleet'
import { plnText } from '../../components/fields'
import { Popover } from '../../components/Popover'
import { cx } from '../../components/ui'
import { openOperation } from '../operations/state'
import { assignRepayment, repayInCash, useMembers } from './actions'

/**
 * The ledger of the operations before `t` (the engine's order): what each member owed when it came (N40). Not wanted
 * (`enabled` false – the caller has it) – none, nothing computed.
 */
export function useLedgerBefore(t: Transaction, enabled = true): HouseholdLedger | null {
  const records = useData((s) => s.records.transactions)
  const fi = useData((s) => s.fi)
  return useMemo(() => {
    const input = enabled ? fleetInputNow() : null
    return input ? householdBefore(input, t, warsawNow().date) : null
    // The engine's input is read whole: it changes with the records and the settings.
  }, [records, fi, t.id, t.date, t.time, t.createdAt, enabled])
}

/** A purchase as the lists name it: its day, its counterparty; the opening balance's debt – so said. */
function usePurchaseLabel(): (txId: string, date: string) => string {
  const transactions = useData((s) => s.records.transactions)
  return (txId, date) => (isOpeningItem(txId) ? `saldo na start rozliczeń (${dm(date)})` : `${dm(date)} ${transactions[txId]?.record.counterparty || 'zakup'}`)
}

const STATUS_TEXT = { deposit: 'z zaliczki – nie ma czego oddawać', open: 'do oddania', partial: 'częściowo oddane', paid: 'oddane' } as const

/** A financed purchase (D91): paid back how much and by what; „Przypisz zwrot…” from the member's money waiting. */
export function PurchaseRepaid({ t }: { t: Transaction }) {
  const ledger = useHousehold()
  const states = ledger?.purchases.get(t.id) ?? []
  if (!ledger || !states.length || t.amount >= 0) return null
  return (
    <div className="flex flex-col gap-1 text-[11.5px]" data-testid="purchase-repaid">
      {states.map((p) => (
        <PurchaseLine key={p.memberId} p={p} ledger={ledger} t={t} />
      ))}
    </div>
  )
}

function PurchaseLine({ p, ledger, t }: { p: PurchaseState; ledger: HouseholdLedger; t: Transaction }) {
  const members = useMembers()
  const transactions = useData((s) => s.records.transactions)
  const readOnly = useFolderLocked()
  const status = purchaseStatus(p)
  const name = memberName(p.memberId, members)
  const rest = Math.max(0, p.lent - p.paid)
  const paidAmount = p.by.reduce((a, b) => a + b.amount, 0) || p.paid
  const total = paidAmount + rest
  // Money waiting to be assigned to this purchase (1.15.1: both later unassigned repayments and earlier inflows).
  const waiting = waitingForPurchase(ledger, t, p, (id) => transactions[id]?.record)
  return (
    <div className="flex flex-col gap-0.5" data-testid="purchase-repaid-member" data-status={status}>
      <span className={cx(status === 'open' || status === 'partial' ? 'text-accent' : 'text-muted')} data-testid="purchase-repaid-status">
        {name}: {status === 'deposit' ? STATUS_TEXT.deposit : status === 'paid' ? `oddane ${plnText(paidAmount)} zł` : status === 'partial' ? `oddane ${plnText(paidAmount)} z ${plnText(total)} zł · do oddania ${plnText(rest)} zł` : `do oddania ${plnText(p.lent)} zł`}
      </span>
      {p.by.map((r, i) => (
        <button
          key={`${r.txId}:${i}`}
          type="button"
          className="self-start text-left text-dim hover:text-fg-strong hover:underline"
          onClick={() => transactions[r.txId] && openOperation(transactions[r.txId]!.record)}
          title="Pokaż operację zwrotu"
          data-testid="purchase-repaid-by"
        >
          ↳ {dm(r.date)} {transactions[r.txId]?.record.counterparty || 'wpłata'} · {plnText(r.amount)} zł →
        </button>
      ))}
      {(waiting.length > 0 || rest > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {waiting.length > 0 && (
            <Popover buttonClassName="self-start text-accent hover:underline" width={340} testId="purchase-assign" panelTestId="purchase-assign-menu" label="Przypisz zwrot…">
              {(close) => (
                <div className="flex flex-col gap-1 text-[12px]">
                  <span className="text-[11px] text-muted">Pieniądze {name} czekające na przypisanie:</span>
                  {waiting.map((u) => (
                    <button
                      key={u.txId}
                      type="button"
                      className="flex flex-col gap-0.5 rounded px-1 py-0.5 text-left hover:bg-hover"
                      onClick={() => {
                        if (assignRepayment(u.txId, t.id, `${dm(u.date)} ${transactions[u.txId]?.record.counterparty || 'wpłata'} → ${dm(t.date)} ${t.counterparty || 'zakup'}`)) close()
                      }}
                      data-testid="purchase-assign-option"
                    >
                      <span className="flex w-full items-center gap-2">
                        <span className="num">{dm(u.date)}</span>
                        <span className="min-w-0 flex-1 truncate">{transactions[u.txId]?.record.counterparty || 'wpłata'}</span>
                        <span className="num">{plnText(u.amount)} zł</span>
                      </span>
                      {u.fromPriorIncome && (
                        <span className="text-[10.5px] text-accent" data-testid="purchase-assign-prior-income">
                          z przychodu {u.date.slice(0, 7)} – zmieni przychód zamkniętego miesiąca
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Popover>
          )}
          {rest > 0 && (
            <button
              type="button"
              className="self-start text-accent hover:underline"
              disabled={readOnly}
              onClick={() => repayInCash(t, p.memberId, rest)}
              title="Zapisz zwrot od domownika w gotówce (konto Gotówka) i przypisz do tego zakupu"
              data-testid="purchase-repay-cash"
            >
              Oddał(a) gotówką ({plnText(rest)} zł)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A member's money (D91): per member, the purchases it pays back – ticked, the sure one or the options offered when
 * none is named, what it repaid beyond them waiting to be assigned. Before `assignFrom` – the old way (named first,
 * then the oldest).
 */
export function RepaymentPicker({ t, patch, before: given }: { t: Transaction; patch: (p: Partial<Transaction>) => void; before?: HouseholdLedger | null }) {
  const ledger = useHousehold()
  // The income's editor has it already (one ledger less at every change).
  const own = useLedgerBefore(t, given === undefined)
  const before = given === undefined ? own : given
  const members = useMembers()
  const assignFrom = useData((s) => s.fi?.settings.household.assignFrom)
  const transactions = useData((s) => s.records.transactions)
  const label = usePurchaseLabel()
  const shares = repaymentShares(t)
  if (!shares.length || !before) return null
  const explicit = assignsOn(assignFrom, t.date)
  const flows = ledger?.byTx.get(t.id) ?? []
  const toggle = (txId: string, on: boolean) => patch(withNamed(t, txId, on))
  const nameAll = (ids: readonly string[]) => patch(ids.reduce<Partial<Transaction>>((acc, id) => ({ ...acc, ...withNamed({ ...t, ...acc }, id, true) }), {}))
  // One section per member (a transfer through another member carries several).
  const byMember = [...new Map(shares.map((s) => [s.memberId, shares.filter((x) => x.memberId === s.memberId).reduce((a, x) => ({ ...x, amount: a.amount + x.amount }))])).values()]
  return (
    <div className="flex flex-col gap-1.5" data-testid="repayment-picker">
      {byMember.map((share) => {
        // The purchases open just before it (up to its day), and the ones it names already or can finance (1.15.1).
        const open = balanceOf(before, share.memberId).open.filter((o) => o.date <= t.date)
        const choices = choicesForRepayment(before, ledger, t, share.memberId)
        const flow = flows.find((f) => f.memberId === share.memberId)
        const any = choices.some((c) => names(t, c.txId))
        const match = !any && explicit ? (share.isReturn ? matchReturn(open, share.amount, t.counterparty, (id) => transactions[id]?.record) : matchCovers(open, share.amount, t.date)) : null
        const offers = match ? (match.sure ? [match.sure] : match.options) : []
        const who = memberName(share.memberId, members)
        return (
          <div key={share.memberId} className="flex flex-col gap-0.5 text-[11.5px]" data-testid="repayment-member" data-member={who}>
            <span className="text-muted">{explicit ? `${share.isReturn ? 'Zwrot do zakupu' : 'Za co oddaje'} ${who}:` : 'Pokrywa (inaczej od najstarszych):'}</span>
            {choices.length === 0 && <span className="text-dim">{who} nie ma zakupów do oddania.</span>}
            {choices.map((c) => (
              <label key={c.txId} className="flex items-center gap-1.5 text-muted">
                <input type="checkbox" checked={names(t, c.txId)} onChange={(e) => toggle(c.txId, e.currentTarget.checked)} data-testid="operation-cover" />
                <span className="min-w-0 flex-1 truncate">{label(c.txId, c.date)}</span>
                <span className="num">{plnText(c.amount)} zł</span>
              </label>
            ))}
            {offers.map((ids) => (
              <button key={ids.join()} type="button" className="self-start text-left text-accent hover:underline" onClick={() => nameAll(ids)} data-testid="repayment-offer">
                {match?.sure ? 'Pasuje: ' : 'Może: '}
                {ids.map((id) => label(id, choices.find((c) => c.txId === id)?.date ?? t.date)).join(' + ')}
              </button>
            ))}
            {flow && (flow.paidFor.length > 0 || flow.unassigned > 0) && (
              <span className="text-dim" data-testid="repayment-result">
                {[flow.paidFor.length ? `spłaca: ${flow.paidFor.map((p) => `${label(p.txId, p.date)} ${plnText(p.amount)} zł`).join(', ')}` : '', flow.unassigned ? `do przypisania ${plnText(flow.unassigned)} zł` : ''].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
