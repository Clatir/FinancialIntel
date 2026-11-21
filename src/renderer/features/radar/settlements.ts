/**
 * „Rozliczenia z domownikami” in Radar (1.21.0, UX-82, D106 pkt 11, T547): one place per member – what they owe or hold
 * (both at once – AF-16), their open purchases (their part, what is left), their money waiting to be assigned (D91) – and
 * the ways to settle it: a new inflow of theirs in the operation's editor (a draft – nothing written here), their operations
 * in Operacje, a purchase or a repayment opened in its editor. The numbers are the engine's ledger only
 * (`fleet.receivables.members`, `fleet.household` – `calc/household.ts`); nothing is counted here.
 */
import { CASH_REPAY_TITLE, isOpeningItem, memberName, purchaseOf, type HouseholdLedger, type MemberBalance, type Unassigned } from '@shared/calc/household'
import { panelKey } from '@shared/panels'
import { cashAccountOf, HOUSE_MEMBER_ID, inflowOf, type Account, type HouseholdMember, type Transaction } from '@shared/schema'
import { noNarrowing } from '@shared/operationsView'
import { canWrite, useData } from '../../store/data'
import { setPanelLayout } from '../../store/panels'
import { focusRecord, navigate } from '../../store/ui'
import { newOperation, showFilter } from '../operations/state'

/** The panel's name (its remembered layout, the „Układ” menu) – as Mostek's panel of the same people. */
export const SETTLEMENTS_PANEL = 'Rozliczenia z domownikami'
/** The focus of the whole panel (a link naming no member – Mostek). */
export const SETTLEMENTS_ALL = 'all'

/** A purchase they still owe (or the balance at the settlements' start). */
export interface SettlementPurchase {
  txId: string
  date: string
  /** Their part of it: what the shields lent and what their advance paid when bought. */
  amount: number
  /** What of it is still open (D91: their money waiting to be assigned is not taken off it). */
  left: number
  /** The balance at the settlements' start – no operation to open. */
  opening: boolean
}

export interface MemberSettlement extends MemberBalance {
  purchases: SettlementPurchase[]
  /** Their money repaid but not assigned to a purchase (D91), oldest first – each with its operation. */
  waiting: Unassigned[]
  waitingSum: number
}

/** A member with something to settle – a debt, an advance, money waiting to be assigned (as Radar's „Należności” listed them). */
const toSettle = (m: MemberBalance): boolean => m.owed > 0 || m.deposit > 0 || m.unassigned.length > 0

/**
 * Radar's panel is shown (and so Mostek's „rozlicz na Radarze ›” – a link never to nothing): someone to settle, or people
 * beside the default „Dom” (D106 pkt 4 – no empty panel; the loans given alone are not the household's).
 */
export function settlementsShown(balances: readonly MemberBalance[], members: readonly HouseholdMember[]): boolean {
  return balances.some(toSettle) || members.some((m) => !m.archived && m.id !== HOUSE_MEMBER_ID)
}

/** The members with something to settle, in the ledger's order, each with their open purchases. */
export function settlementsOf(members: readonly MemberBalance[], ledger: Pick<HouseholdLedger, 'purchases'>): MemberSettlement[] {
  return members
    .filter(toSettle)
    .map((m) => ({
      ...m,
      purchases: m.open.map((o) => {
        const p = purchaseOf(ledger, o.txId, m.memberId)
        return { txId: o.txId, date: o.date, amount: p ? p.lent + p.fromDeposit : o.amount, left: o.amount, opening: isOpeningItem(o.txId) }
      }),
      waiting: m.unassigned,
      waitingSum: m.unassigned.reduce((a, u) => a + u.amount, 0)
    }))
}

/** Money given back by hand goes onto the budget's cash (D83 – the account „Gotówka”); none active – the usual account. */
export const repaysInCash = (accounts: readonly Account[]): boolean => !!cashAccountOf(accounts)

/**
 * A member's new inflow as the editor makes it when they are chosen (`MemberIncome.setMember`): repaying their purchases
 * first, the rest as their setting says (D80 b); on the cash account, titled as the app's cash repayment (it never becomes
 * the account a new entry is proposed on – AP-20, `typedByHand`). No amount: the one given back is typed – the editor's
 * „Za co oddaje” then offers the purchases it pays back (D91).
 */
export function repaymentDraft(memberId: string, members: readonly HouseholdMember[], accounts: readonly Account[]): Partial<Transaction> {
  const who = memberName(memberId, members)
  const cash = cashAccountOf(accounts)
  return {
    kind: 'income',
    memberId,
    repaid: 0,
    inflowKind: 'repay',
    advance: inflowOf(members.find((m) => m.id === memberId)) === 'advance',
    covers: [],
    counterparty: who,
    ...(cash ? { accountId: cash.id, title: `${CASH_REPAY_TITLE}${who}` } : {})
  }
}

/**
 * „Oddał(a) gotówką…”: the member's new inflow – a draft open in Operacje (the editor's own path of a new entry; written on
 * its first change, dropped untouched). null – the folder is read-only (said by `canWrite`).
 */
export function startRepayment(memberId: string): string | null {
  const fi = useData.getState().fi
  if (!fi || !canWrite()) return null
  return newOperation(repaymentDraft(memberId, fi.settings.household.members, fi.settings.accounts))
}

/** „Pokaż w Operacjach”: every operation of the member (their purchases, their money), of the whole history. */
export function openMemberOperations(memberId: string): void {
  showFilter({ period: { kind: 'all' }, ...noNarrowing(), members: [memberId] })
  navigate({ page: 'operations' })
}

/**
 * The settlements from elsewhere (Mostek, Meldunki): Radar with the panel shown and open (a link never lands on a panel the
 * user hid or collapsed), the member's block marked – or the whole panel.
 */
export function openSettlements(memberId?: string | null): void {
  setPanelLayout(panelKey('radar', SETTLEMENTS_PANEL), { hidden: false, collapsed: false })
  focusRecord('settlements', memberId || SETTLEMENTS_ALL, { page: 'radar' })
}
