/**
 * The household (D80): the members (`settings.household.members`) – who finances a purchase, whose money comes in –
 * and the decisions remembered for them (what their money beyond their debt is, D80 b).
 */
import { useEffect } from 'react'
import { addDays, warsawNow } from '@shared/calc/dates'
import { householdOf, openingIdsOf, rebaseOpenings } from '@shared/calc/fleet'
import { linkRepayments, withNamed, type CoverFields } from '@shared/calc/repayments'
import { balanceOf, memberName, repayingAdvance, skippedKey } from '@shared/calc/household'
import { CASH_ACCOUNT_ID, inflowOf, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type MemberInflow, type MemberOpening, type Transaction } from '@shared/schema'
import { formatPln } from '@shared/format'
import { newId } from '@shared/ids'
import { sameContentAs } from '@shared/merge'
import { addRecord, canWrite, deleteRecords, replaceRecords, updateRecord, updateSettings, useData, writesInBackground } from '../../store/data'
import { fleetInputNow } from '../../store/fleet'
import { timed } from '../../lib/timing'
import { countLabel, plDate } from '../../lib/format'
import { toast } from '../../store/ui'
import { usePresence } from '../../store/presence'

const NO_MEMBERS: HouseholdMember[] = []

/** The members as the settings keep them (archived too – their balances still show). */
export const useMembers = (): readonly HouseholdMember[] => useData((s) => s.fi?.settings.household.members ?? NO_MEMBERS)
export const membersNow = (): readonly HouseholdMember[] => useData.getState().fi?.settings.household.members ?? NO_MEMBERS

const patchMembers = (fn: (ms: HouseholdMember[]) => HouseholdMember[]) =>
  updateSettings((f) => ({ ...f, settings: { ...f.settings, household: { ...f.settings.household, members: fn([...f.settings.household.members]) } } }))

/**
 * The purchases an operation of a member's money surely pays back (1.12.0, D91 – `calc/repayments.ts`), as it is now
 * among the folder's operations (a new one too); null = none sure, or it names some already, or it is paid back the
 * old way (before `assignFrom`).
 */
export function sureCoversOf(t: Transaction): CoverFields | null {
  const input = fleetInputNow()
  if (!input) return null
  const transactions = [...input.transactions.filter((x) => x.id !== t.id), t]
  return linkRepayments({ ...input, transactions }, new Set([t.id]), warsawNow().date).get(t.id) ?? null
}

/**
 * A member's money pays back one more purchase (D91: „Przypisz zwrot…” – the purchase, the inbox): its operation names
 * it; with „Cofnij”. False – the folder is read-only or the operation is gone.
 */
export function assignRepayment(paymentId: string, purchaseId: string, label: string): boolean {
  const before = useData.getState().records.transactions[paymentId]?.record
  if (!before) return false
  const was = { covers: before.covers, coversOpening: before.coversOpening, coversOpeningMembers: before.coversOpeningMembers }
  const ok = updateRecord('transactions', paymentId, (r) => ({ ...r, ...withNamed(r, purchaseId, true) }))
  if (ok)
    toast(`Zwrot przypisany: ${label}.`, 'success', 5000, {
      label: 'Cofnij',
      run: () => void updateRecord('transactions', paymentId, (r) => ({ ...r, ...was }))
    })
  return ok
}

/**
 * „Spłać” (AP-4, the inbox): a member's advances for the future that left their debt unpaid (`skipped` of the ledger now,
 * not those kept) repay it from now on – „spłata, reszta jako zaliczka” (`repayingAdvance`) – each naming the purchases it
 * surely pays back (D91 b, as the import – `linkRepayments`); with „Cofnij”. False – nothing changed.
 */
export function repayAdvances(memberId: string): boolean {
  const input = canWrite() ? fleetInputNow() : null
  const s = useData.getState()
  if (!input || !s.fi) return false
  const today = warsawNow().date
  const kept = s.fi.settings.import.notDuplicates
  const ids = new Set(householdOf(input, today).skipped.filter((x) => x.memberId === memberId && !kept[skippedKey(x)]).map((x) => x.txId))
  const before = [...ids].map((id) => s.records.transactions[id]?.record).filter((t): t is Transaction => !!t)
  const changed = before.map((t) => repayingAdvance(t, memberId)).filter((t, i) => t !== before[i])
  if (!changed.length) return false
  // Each the purchases it surely pays back, in the ledger's order – the ones before it changed too (as the import).
  const transactions = input.transactions.map((t) => changed.find((c) => c.id === t.id) ?? t)
  const links = linkRepayments({ ...input, transactions }, new Set(changed.map((t) => t.id)), today)
  const after = changed.map((t) => ({ ...t, ...links.get(t.id) }))
  if (!replaceRecords('transactions', after)) return false
  const was = before.filter((t) => after.some((a) => a.id === t.id))
  toast(`${memberName(memberId, s.fi.settings.household.members)}: ${countLabel(after.length, 'wpłata spłaca', 'wpłaty spłacają', 'wpłat spłaca')} dług, reszta zostaje zaliczką.`, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      // Only the ones as it left them (a change since stays).
      const current = useData.getState().records.transactions
      replaceRecords(
        'transactions',
        was.filter((t) => sameContentAs(current[t.id]?.record, after.find((a) => a.id === t.id)))
      )
    }
  })
  return true
}

/** „zostaw” (AP-4, the inbox): a member's advances for the future that skipped the debt stay so – not asked again; with „Cofnij”. */
export function keepAdvances(memberId: string): void {
  const input = canWrite() ? fleetInputNow() : null
  if (!input) return
  const keys = householdOf(input, warsawNow().date)
    .skipped.filter((x) => x.memberId === memberId)
    .map(skippedKey)
  if (!keys.length) return
  const at = new Date().toISOString()
  const set = (on: boolean) =>
    updateSettings((f) => {
      const notDuplicates = { ...f.settings.import.notDuplicates }
      for (const k of keys)
        if (on) notDuplicates[k] ??= at
        else if (notDuplicates[k] === at) delete notDuplicates[k]
      return { ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates } } }
    })
  if (set(true)) toast('Zaliczki zostają – meldunek nie wróci dla tych wpłat.', 'info', 7000, { label: 'Cofnij', run: () => set(false) })
}

/**
 * A purchase financed by a household member paid back in cash (N-PC-11): a cash repayment (`CASH_ACCOUNT_ID`) of what
 * they still owe for this purchase (`amount`), linked to it (`covers: [purchase.id]`), with „Cofnij”.
 */
export function repayInCash(purchase: Pick<Transaction, 'id' | 'date' | 'counterparty'>, memberId: string, amount: number): string | null {
  if (amount <= 0 || !canWrite()) return null
  const fi = useData.getState().fi
  if (!fi) return null
  const who = memberName(memberId, fi.settings.household.members)
  const cashAcc = fi.settings.accounts.find((a) => a.kind === 'cash' && !a.archived) ?? fi.settings.accounts.find((a) => a.id === CASH_ACCOUNT_ID)
  const accountId = cashAcc?.id ?? CASH_ACCOUNT_ID
  if (cashAcc?.archived) {
    updateSettings((f) => ({
      ...f,
      settings: { ...f.settings, accounts: f.settings.accounts.map((a) => (a.id === cashAcc.id ? { ...a, archived: false } : a)) }
    }))
  }
  const now = new Date().toISOString()
  const { date, time } = warsawNow()
  const record = transactionSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    date,
    time,
    accountId,
    kind: 'income',
    amount,
    memberId,
    counterparty: who,
    title: `Zwrot gotówką: ${purchase.counterparty || 'zakup'}`,
    covers: [purchase.id]
  })
  if (!addRecord('transactions', record)) return null
  toast(`Oddane gotówką (${who}): ${formatPln(amount)} zł.`, 'success', 6000, {
    label: 'Cofnij',
    run: () => void deleteRecords('transactions', [record.id])
  })
  return record.id
}

/** A name of the bank („KOWALSKA ANNA MARIA”) as a member's first name: its first word, capitalized („Kowalska”). */
function nameOf(bankName: string): string {
  const w = bankName.trim().split(/\s+/)[0] ?? ''
  return (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).slice(0, 40) || 'Domownik'
}

/** `name`, else „name 2”, „name 3”… – the screens tell the members by their names. */
function freeName(name: string): string {
  const taken = new Set(membersNow().map((m) => m.name.toLowerCase()))
  const base = name.slice(0, 36)
  let out = name
  for (let i = 2; taken.has(out.toLowerCase()); i++) out = `${base} ${i}`
  return out
}

/** A member from a counterparty of the import (D80 a): the bank's name is theirs; the id, or null (read-only folder). */
export function addMemberFromBank(bankName: string): string | null {
  if (!canWrite()) return null
  const id = newId()
  const name = freeName(nameOf(bankName))
  patchMembers((ms) => [...ms, { id, name, bankNames: [bankName.trim().slice(0, 120)], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } }])
  toast(`Dopisano domownika „${name}” (Ustawienia → Domownicy – tam zmienisz imię).`, 'success', 4500)
  return id
}

export function addMember(name: string): string | null {
  if (!name.trim() || !canWrite()) return null
  const id = newId()
  patchMembers((ms) => [...ms, { id, name: freeName(name.trim().slice(0, 40)), bankNames: [], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } }])
  return id
}

export function patchMember(id: string, patch: Partial<Omit<HouseholdMember, 'id'>>): void {
  patchMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)))
}

/**
 * What a member's money beyond their debt is, asked once (D80 b): the first decision of a member still „ask” becomes
 * theirs. `incomes` = their money as decided (an import, the editor); the most chosen answer wins.
 */
export function rememberInflows(incomes: ReadonlyArray<Pick<Transaction, 'kind' | 'memberId' | 'advance'>>): void {
  const votes = new Map<string, { advance: number; income: number }>()
  for (const t of incomes) {
    if (t.kind !== 'income' || !t.memberId) continue
    const v = votes.get(t.memberId) ?? { advance: 0, income: 0 }
    if (t.advance) v.advance++
    else v.income++
    votes.set(t.memberId, v)
  }
  const ask = membersNow().filter((m) => votes.has(m.id) && inflowOf(m) === 'ask')
  if (!ask.length) return
  const answer = (id: string): MemberInflow => {
    const v = votes.get(id)!
    return v.advance > v.income ? 'advance' : 'income'
  }
  patchMembers((ms) => ms.map((m) => (ask.some((a) => a.id === m.id) ? { ...m, inflow: answer(m.id) } : m)))
}

/**
 * The settlements' start (D81): a date (not in the future), or null = from the budget's start. The members' opening
 * balances move with it (B3, `rebaseOpenings`): what they owed or held then, as counted now – shown, with „Cofnij”.
 */
export function setHouseholdSince(since: string | null): void {
  const state = useData.getState()
  if (state.status?.readOnly || state.switching || !state.fi) return
  const today = warsawNow().date
  if (since && since > today) {
    toast('Rozliczenia nie mogą zaczynać się w przyszłości.', 'error')
    return
  }
  const before = state.fi.settings.household
  const input = fleetInputNow()
  const openings = input ? timed('rozliczenia: saldo na start', () => rebaseOpenings(input, today, since)) : null
  const changed = openings ? before.members.filter((m) => !sameOpening(m.opening, openings.get(m.id))) : []
  // The balances on the new start take in the operations there are now before it (B14: one added later counts after them).
  const openingIds = input ? openingIdsOf(input, today, since) : undefined
  updateSettings((f) => ({
    ...f,
    settings: {
      ...f.settings,
      household: { ...f.settings.household, since, openingIds, members: f.settings.household.members.map((m) => (openings?.has(m.id) ? { ...m, opening: openings.get(m.id)! } : m)) }
    }
  }))
  if (!changed.length) return
  const shown = changed.slice(0, 3).map((m) => `${m.name}: ${openingText(openings!.get(m.id)!)} (było ${openingText(m.opening)})`)
  toast(`Saldo na start rozliczeń przeliczone – ${shown.join(', ')}${changed.length > 3 ? ` i ${changed.length - 3} innych` : ''}.`, 'info', 8000, {
    label: 'Cofnij',
    run: () => updateSettings((f) => ({ ...f, settings: { ...f.settings, household: before } }))
  })
}

/**
 * From which day a member's money pays back only the purchases it names (D91): a date (not in the future), or null =
 * from the start (the earlier repayments without a purchase wait to be assigned too) – with „Cofnij”.
 */
export function setAssignFrom(assignFrom: string | null): void {
  const state = useData.getState()
  if (state.status?.readOnly || state.switching || !state.fi) return
  if (assignFrom && assignFrom > warsawNow().date) {
    toast('Dzień nie może być w przyszłości.', 'error')
    return
  }
  const before = state.fi.settings.household.assignFrom
  if (before === assignFrom) return
  updateSettings((f) => ({ ...f, settings: { ...f.settings, household: { ...f.settings.household, assignFrom } } }))
  toast(assignFrom ? `Zwroty od ${plDate(assignFrom)} spłacają tylko wskazane zakupy.` : 'Wszystkie zwroty spłacają tylko wskazane zakupy – dawne bez wskazania czekają na przypisanie.', 'info', 6000, {
    label: 'Cofnij',
    run: () => updateSettings((f) => ({ ...f, settings: { ...f.settings, household: { ...f.settings.household, assignFrom: before } } }))
  })
}

const sameOpening = (a: MemberOpening, b: MemberOpening | undefined) => !b || (a.owed === b.owed && a.deposit === b.deposit)
const openingText = (o: MemberOpening) => (o.deposit > 0 ? `zaliczka ${formatPln(o.deposit)} zł` : o.owed > 0 ? `ma oddać ${formatPln(o.owed)} zł` : '0 zł')

/**
 * The settlements' start (D81) of a folder without one: the day after the bank's data end (the last imported operation –
 * B14: the next import brings the days between as operations after it), at most today; none imported – today. What each
 * member owed or held until then (as 1.3.0 counted it) becomes their opening balance – nothing marked before is lost, and
 * it can be changed in Ustawienia → Domownicy.
 */
export function seedSince(transactions: readonly Pick<Transaction, 'date' | 'bank'>[], today: string): string {
  let last: string | null = null
  for (const t of transactions) if (t.bank && t.date <= today && (last == null || t.date > last)) last = t.date
  return last && addDays(last, 1) < today ? addDays(last, 1) : today
}

/**
 * Once per folder: the settlements' start (`seedSince`) with the members' balances on it and the operations they take in;
 * a folder of before 1.5.0 – the operations its balances take in (B14: the ones there are now – one dated before the
 * start and added later counts after them).
 */
export function useHouseholdSinceSeed(): void {
  // A computer only in the tray writes nothing in the background (D86).
  const inUse = usePresence((s) => s.inUse)
  const unset = useData((s) => writesInBackground(s) && s.fi != null && s.fi.settings.household.since === undefined) && inUse
  const unstamped =
    useData(
      (s) => writesInBackground(s) && s.fi != null && s.fi.settings.household.since !== undefined && s.fi.settings.household.openingIds === undefined
    ) && inUse
  useEffect(() => {
    // Each checked again as it runs (T301): changes being written since the render hold it.
    if (!unset || !writesInBackground(useData.getState())) return
    const input = fleetInputNow()
    if (!input || useData.getState().fi?.settings.household.since !== undefined) return
    const today = warsawNow().date
    const since = seedSince(input.transactions, today)
    const before = timed('rozliczenia: saldo na start', () => householdOf(input, today, addDays(since, -1)))
    const openingIds = openingIdsOf(input, today, since)
    updateSettings(
      (f) => ({
        ...f,
        settings: {
          ...f.settings,
          household: {
            ...f.settings.household,
            since,
            openingIds,
            members: f.settings.household.members.map((m) => {
              const b = balanceOf(before, m.id)
              // The day of the oldest purchase still owed (N41): the reminder counts from it, not from the start.
              return b.owed || b.deposit ? { ...m, opening: { owed: b.owed, deposit: b.deposit, since: b.owed ? b.since : null } } : m
            })
          }
        }
      }),
      { background: true }
    )
  }, [unset])
  // Seeded before 1.6.2 (N41): the oldest purchase of each debt on the start, from the ledger as 1.3.0 counted it – only
  // when its debt is the one kept (else typed by hand: no day known). Once – then every opening has its `since`.
  const undated =
    useData(
      (s) =>
        writesInBackground(s) &&
        s.fi != null &&
        !!s.fi.settings.household.since &&
        s.fi.settings.household.members.some((m) => m.opening.owed > 0 && m.opening.since === undefined)
    ) && inUse
  useEffect(() => {
    if (!undated || !writesInBackground(useData.getState())) return
    const input = fleetInputNow()
    const household = useData.getState().fi?.settings.household
    if (!input || !household?.since) return
    const today = warsawNow().date
    const members = household.members.map((m) => ({ ...m, opening: { owed: 0, deposit: 0 } }))
    const plain = { ...input, settings: { ...input.settings, household: { ...input.settings.household, since: null, members } } }
    const before = timed('rozliczenia: daty sald na start', () => householdOf(plain, today, addDays(household.since!, -1)))
    updateSettings(
      (f) => ({
        ...f,
        settings: {
          ...f.settings,
          household: {
            ...f.settings.household,
            members: f.settings.household.members.map((m) => {
              if (!(m.opening.owed > 0) || m.opening.since !== undefined) return m
              const b = balanceOf(before, m.id)
              return { ...m, opening: { ...m.opening, since: b.owed === m.opening.owed ? b.since : null } }
            })
          }
        }
      }),
      { background: true }
    )
  }, [undated])
  // Once per folder (D91): repayments from today on pay back only the purchases they name – the ones before stay paid
  // back as they were (the oldest first).
  const unassigned = useData((s) => writesInBackground(s) && s.fi != null && s.fi.settings.household.assignFrom === undefined) && inUse
  useEffect(() => {
    if (!unassigned || !writesInBackground(useData.getState())) return
    const today = warsawNow().date
    updateSettings((f) => (f.settings.household.assignFrom !== undefined ? f : { ...f, settings: { ...f.settings, household: { ...f.settings.household, assignFrom: today } } }), { background: true })
  }, [unassigned])
  useEffect(() => {
    if (!unstamped || !writesInBackground(useData.getState())) return
    const input = fleetInputNow()
    const household = useData.getState().fi?.settings.household
    if (!input || !household || household.openingIds !== undefined || household.since === undefined) return
    const openingIds = openingIdsOf(input, warsawNow().date, household.since)
    updateSettings((f) => (f.settings.household.openingIds !== undefined ? f : { ...f, settings: { ...f.settings, household: { ...f.settings.household, openingIds } } }), { background: true })
  }, [unstamped])
}

