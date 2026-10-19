/**
 * The household (D80): the members (`settings.household.members`) – who finances a purchase, whose money comes in –
 * and the decisions remembered for them (what their money beyond their debt is, D80 b).
 */
import { useEffect } from 'react'
import { addDays, warsawNow } from '@shared/calc/dates'
import { householdOf, openingIdsOf, rebaseOpenings } from '@shared/calc/fleet'
import { balanceOf } from '@shared/calc/household'
import { inflowOf, type HouseholdMember, type MemberInflow, type MemberOpening, type Transaction } from '@shared/schema'
import { formatPln } from '@shared/format'
import { newId } from '@shared/ids'
import { canWrite, updateSettings, useData } from '../../store/data'
import { fleetInputNow } from '../../store/fleet'
import { timed } from '../../lib/timing'
import { toast } from '../../store/ui'

const NO_MEMBERS: HouseholdMember[] = []

/** The members as the settings keep them (archived too – their balances still show). */
export const useMembers = (): readonly HouseholdMember[] => useData((s) => s.fi?.settings.household.members ?? NO_MEMBERS)
export const membersNow = (): readonly HouseholdMember[] => useData.getState().fi?.settings.household.members ?? NO_MEMBERS

const patchMembers = (fn: (ms: HouseholdMember[]) => HouseholdMember[]) =>
  updateSettings((f) => ({ ...f, settings: { ...f.settings, household: { ...f.settings.household, members: fn([...f.settings.household.members]) } } }))

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
  const unset = useData((s) => s.phase === 'ready' && !s.status?.readOnly && !s.switching && s.fi != null && s.fi.settings.household.since === undefined)
  const unstamped = useData(
    (s) => s.phase === 'ready' && !s.status?.readOnly && !s.switching && s.fi != null && s.fi.settings.household.since !== undefined && s.fi.settings.household.openingIds === undefined
  )
  useEffect(() => {
    if (!unset) return
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
              return b.owed || b.deposit ? { ...m, opening: { owed: b.owed, deposit: b.deposit } } : m
            })
          }
        }
      }),
      { background: true }
    )
  }, [unset])
  useEffect(() => {
    if (!unstamped) return
    const input = fleetInputNow()
    const household = useData.getState().fi?.settings.household
    if (!input || !household || household.openingIds !== undefined || household.since === undefined) return
    const openingIds = openingIdsOf(input, warsawNow().date, household.since)
    updateSettings((f) => (f.settings.household.openingIds !== undefined ? f : { ...f, settings: { ...f.settings, household: { ...f.settings.household, openingIds } } }), { background: true })
  }, [unstamped])
}

