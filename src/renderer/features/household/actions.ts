/**
 * The household (D80): the members (`settings.household.members`) – who finances a purchase, whose money comes in –
 * and the decisions remembered for them (what their money beyond their debt is, D80 b).
 */
import { inflowOf, type HouseholdMember, type MemberInflow, type Transaction } from '@shared/schema'
import { newId } from '@shared/ids'
import { updateSettings, useData } from '../../store/data'
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

/** A member from a counterparty of the import (D80 a): the bank's name is theirs; the id, or null (read-only folder). */
export function addMemberFromBank(bankName: string): string | null {
  if (useData.getState().status?.readOnly) return null
  const id = newId()
  const name = nameOf(bankName)
  patchMembers((ms) => [...ms, { id, name, bankNames: [bankName.trim().slice(0, 120)], inflow: 'ask', archived: false }])
  toast(`Dopisano domownika „${name}” (Ustawienia → Domownicy – tam zmienisz imię).`, 'success', 4500)
  return id
}

export function addMember(name: string): string | null {
  if (useData.getState().status?.readOnly || !name.trim()) return null
  const id = newId()
  patchMembers((ms) => [...ms, { id, name: name.trim().slice(0, 40), bankNames: [], inflow: 'ask', archived: false }])
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
