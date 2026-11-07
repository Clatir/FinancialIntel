/**
 * „Nadwyżka” (1.19.0, D102) in the editor of an inflow repaying several household members: what each repays, how big
 * the surplus beyond all the debts is, and whose it is „as” what – their income, their advance, or a loan given repaid
 * (D100). The sender's share is the rest (as his setting says – „pytaj” asks); „po równo” and „proporcjonalnie do
 * długów” split it, each repaying every debt in full first. The lines are written by `calc/household.ts` (`writeSurplus`).
 */
import {
  balanceOf,
  debtShares,
  evenShares,
  fitShares,
  loanPart,
  memberName,
  surplusView,
  writeSurplus,
  type HouseholdLedger,
  type SurplusAs,
  type SurplusInput,
  type SurplusPerson,
  type SurplusShare,
  type SurplusView
} from '@shared/calc/household'
import type { LoanChoice } from '@shared/calc/loans'
import { inflowOf, type HouseholdMember, type Split, type Transaction } from '@shared/schema'
import { AmountField, plnText } from '../../components/fields'
import { Segmented, cx } from '../../components/ui'
import { toast } from '../../store/ui'
import { rememberInflows } from './actions'

type As = SurplusAs | 'loan'

/** The panel's input from the operation and the ledger before it; null – no surplus to split here. */
export function surplusInputOf(t: Transaction, payer: string | null, before: HouseholdLedger | null, members: readonly HouseholdMember[]): SurplusInput | null {
  if (!payer || !before || t.kind !== 'income' || (t.inflowKind && t.inflowKind !== 'repay')) return null
  return {
    amount: t.amount,
    payerId: payer,
    payerAdvance: t.memberId === payer && t.advance,
    splits: t.splits,
    owed: (id) => balanceOf(before, id).owed,
    defaultAs: (id) => {
      const v = inflowOf(members.find((m) => m.id === id))
      return v === 'ask' ? null : v
    }
  }
}

export function SurplusPanel({
  input,
  members,
  loanToName,
  setParts,
  patch
}: {
  input: SurplusInput
  members: readonly HouseholdMember[]
  /** The open loan given a new part may repay (D100) – none, no „spłata pożyczki”. */
  loanToName: LoanChoice | undefined
  setParts: (splits: Split[]) => void
  patch: (p: Partial<Transaction>) => void
}) {
  const view = surplusView(input)
  if (!view) return null
  const name = (id: string) => memberName(id, members)
  const short = view.free < 0
  const byDebts = debtShares(view)
  const repaying = view.people.filter((p) => p.repaid > 0)
  const summary = short
    ? `Spłaca: ${repaying.length ? repaying.map((p) => `${name(p.memberId)} ${plnText(p.repaid)} zł`).join(' · ') : 'nic'}`
    : [
        `Spłaca: ${repaying.length ? repaying.map((p) => `${name(p.memberId)} ${plnText(p.repaid)} zł`).join(' · ') : 'nic'}`,
        `nadwyżka ${plnText(view.surplus)} zł${view.loans ? ` (w tym na pożyczki ${plnText(view.loans)} zł)` : ''}`
      ].join(' · ')
  /**
   * The changed members' shares written – fitted into the free surplus first (D102): a cut and a debt lifted to the
   * whole (the sender's rest pays it) said, never silent (AP-15).
   */
  const apply = (changed: ReadonlyMap<string, SurplusShare>) => {
    const { shares, cut, raised } = fitShares(view, changed)
    setParts(writeSurplus(input, shares))
    const said = [
      ...cut.map((c) => `${name(c.memberId)}: najwyżej ${plnText(c.to)} zł zamiast ${plnText(c.from)} zł (tyle zostaje po długach i częściach innych osób)`),
      ...raised.map((id) => `${name(id)}: część podniesiona do całego długu ${plnText(view.people.find((p) => p.memberId === id)?.owed ?? 0)} zł – najpierw długi`)
    ]
    if (said.length) toast(`Nadwyżka – ${said.join('; ')}.`, 'info')
  }
  const setAs = (p: SurplusPerson, as: As) => {
    if (as === 'loan') {
      if (!loanToName) return
      const { splits, moved } = loanPart(input, view, p.memberId, loanToName)
      if (moved <= 0) return toast(`${name(p.memberId)} nie ma nadwyżki, która mogłaby spłacić pożyczkę.`, 'error')
      setParts(splits)
      const left = (p.payer ? view.payerRest : p.amount) - moved
      if (left > 0) toast(`Na spłatę pożyczki „${loanToName.name}” poszło ${plnText(moved)} zł – tyle zostało do spłaty; reszta zostaje u: ${name(p.memberId)}.`, 'info')
      return
    }
    // Asked once, remembered for the member (D80 b) – as the sender's rest in the editor.
    rememberInflows([{ kind: 'income', memberId: p.memberId, advance: as === 'advance' }])
    if (p.payer) return patch({ memberId: p.memberId, repaid: 0, advance: as === 'advance' })
    apply(new Map([[p.memberId, { amount: p.amount, as }]]))
  }
  const setAmount = (p: SurplusPerson, value: number) => apply(new Map([[p.memberId, { amount: value, as: p.as }]]))
  return (
    <div className="flex flex-col gap-1 border-l-2 border-accent pl-2 text-[11.5px]" data-testid="surplus-panel">
      <span className="label">Nadwyżka</span>
      <span className="text-muted" data-testid="surplus-summary">
        {summary}
      </span>
      {short ? (
        <span className="text-down" data-testid="surplus-short">
          Kwota nie pokrywa wszystkich długów – brakuje {plnText(-view.free)} zł; nadwyżki do podziału nie ma.
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="text-accent hover:underline" title="Najpierw całe długi, nadwyżka po równo na osoby – grosze reszty nadawcy" onClick={() => apply(evenShares(view))} data-testid="surplus-even">
            po równo
          </button>
          <button
            type="button"
            className={cx(byDebts ? 'text-accent hover:underline' : 'cursor-not-allowed text-dim')}
            disabled={!byDebts}
            title="Najpierw całe długi, nadwyżka w proporcji do tego, ile każdy miał oddać"
            onClick={() => byDebts && apply(byDebts)}
            data-testid="surplus-debts"
          >
            proporcjonalnie do długów
          </button>
          {!byDebts && <span className="text-dim">– nikt nie miał nic do oddania</span>}
        </div>
      )}
      {view.people.map((p) => (
        <SurplusLine key={p.memberId} p={p} view={view} name={name(p.memberId)} loan={loanToName} locked={short} onAs={(as) => setAs(p, as)} onAmount={(v) => setAmount(p, v)} />
      ))}
    </div>
  )
}

function SurplusLine({
  p,
  view,
  name,
  loan,
  locked,
  onAs,
  onAmount
}: {
  p: SurplusPerson
  view: SurplusView
  name: string
  loan: LoanChoice | undefined
  locked: boolean
  onAs: (as: As) => void
  onAmount: (v: number) => void
}) {
  // What a loan may take of the person's surplus: the sender's – of the rest of the amount only.
  const forLoan = p.payer ? view.payerRest : p.amount
  const options: Array<{ value: As; label: string; title?: string; disabled?: boolean }> = [
    { value: 'income', label: 'przychód' },
    { value: 'advance', label: 'zaliczka' }
  ]
  if (loan) options.push({ value: 'loan', label: 'spłata pożyczki', title: `Nadwyżka spłaca „${loan.name}” (zostało ${plnText(loan.open)} zł)`, disabled: forLoan <= 0 })
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="surplus-line" data-member={name} data-payer={p.payer ? 'true' : undefined}>
      <span className="w-[110px] truncate text-fg-strong">{p.payer ? `${name} (reszta)` : name}</span>
      {p.payer ? (
        <span className="num w-[96px] text-right" data-testid="surplus-payer-amount">
          {plnText(p.amount)} zł
        </span>
      ) : (
        <AmountField className="w-[96px]" value={p.amount} disabled={locked} onChange={(v) => onAmount(Math.max(0, v ?? 0))} aria-label={`Nadwyżka – ${name}`} data-testid="surplus-amount" />
      )}
      <span className="text-dim">jako</span>
      <Segmented size="sm" value={p.as} onChange={onAs} options={options} aria-label={`Nadwyżka jako – ${name}`} />
      {loan && forLoan <= 0 && <span className="text-dim">bez nadwyżki – spłata pożyczki niedostępna</span>}
      {p.as === null && p.amount > 0 && (
        <span className="text-accent" data-testid="surplus-ask">
          pytaj: wybierz (do wyboru liczona jako przychód)
        </span>
      )}
    </div>
  )
}
