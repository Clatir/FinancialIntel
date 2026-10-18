/**
 * The household (D80): the members (`settings.household.members`) – who finances a purchase, whose money comes in –
 * and the decisions remembered for them (what their money beyond their debt is, D80 b).
 */
import { useEffect } from 'react'
import { addDays, warsawNow } from '@shared/calc/dates'
import { householdOf } from '@shared/calc/fleet'
import { balanceOf } from '@shared/calc/household'
import { inflowOf, type HouseholdMember, type MemberInflow, type Transaction } from '@shared/schema'
import { newId } from '@shared/ids'
import { updateSettings, useData } from '../../store/data'
import { fleetInputNow } from '../../store/fleet'
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
  if (useData.getState().status?.readOnly) return null
  const id = newId()
  const name = freeName(nameOf(bankName))
  patchMembers((ms) => [...ms, { id, name, bankNames: [bankName.trim().slice(0, 120)], inflow: 'ask', archived: false, via: null, opening: { owed: 0, deposit: 0 } }])
  toast(`Dopisano domownika „${name}” (Ustawienia → Domownicy – tam zmienisz imię).`, 'success', 4500)
  return id
}

export function addMember(name: string): string | null {
  if (useData.getState().status?.readOnly || !name.trim()) return null
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

/** The settlements' start (D81): a date (not in the future), or null = from the budget's start. */
export function setHouseholdSince(since: string | null): void {
  if (useData.getState().status?.readOnly) return
  if (since && since > warsawNow().date) {
    toast('Rozliczenia nie mogą zaczynać się w przyszłości.', 'error')
    return
  }
  updateSettings((f) => ({ ...f, settings: { ...f.settings, household: { ...f.settings.household, since } } }))
}

/**
 * The settlements from today (D81): a folder without the date chosen gets today, once. What each member owed or held
 * until yesterday (as 1.3.0 counted it) becomes their opening balance – nothing marked before is lost, and it can be
 * changed in Ustawienia → Domownicy.
 */
export function useHouseholdSinceSeed(): void {
  const unset = useData((s) => s.phase === 'ready' && !s.status?.readOnly && s.fi != null && s.fi.settings.household.since === undefined)
  useEffect(() => {
    if (!unset) return
    const input = fleetInputNow()
    if (!input || useData.getState().fi?.settings.household.since !== undefined) return
    const today = warsawNow().date
    const before = householdOf(input, today, addDays(today, -1))
    updateSettings(
      (f) => ({
        ...f,
        settings: {
          ...f.settings,
          household: {
            ...f.settings.household,
            since: today,
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
}

