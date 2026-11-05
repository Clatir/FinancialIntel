/**
 * The household (D80): the members (`settings.household.members`) – who finances a purchase, whose money comes in –
 * and the decisions remembered for them (what their money beyond their debt is, D80 b).
 */
import { useEffect } from 'react'
import { addDays, warsawNow } from '@shared/calc/dates'
import { householdOf, openingIdsOf, rebaseOpenings } from '@shared/calc/fleet'
import { linkRepayments, repayingAdvancesOf, withNamed, type CoverFields } from '@shared/calc/repayments'
import { balanceOf, bankNameHolder, CASH_REPAY_TITLE, memberName, sameBankName, skippedDebtsOf, skippedKey } from '@shared/calc/household'
import { CASH_ACCOUNT_ID, inflowOf, MAX_BANK_NAMES, SCHEMA_VERSION, transactionSchema, type HouseholdMember, type MemberInflow, type MemberOpening, type Transaction } from '@shared/schema'
import { formatPln } from '@shared/format'
import { newId } from '@shared/ids'
import { sameContentAs } from '@shared/merge'
import { addRecord, canWrite, deleteRecords, replaceRecords, updateRecord, updateSettings, useData, writesInBackground } from '../../store/data'
import { fleetInputNow } from '../../store/fleet'
import { timed } from '../../lib/timing'
import { countLabel, plDate } from '../../lib/format'
import { toast, undoKept } from '../../store/ui'
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
  const fields = (t: Transaction | undefined) => ({ covers: t?.covers, coversOpening: t?.coversOpening, coversOpeningMembers: t?.coversOpeningMembers })
  const was = { covers: before.covers, coversOpening: before.coversOpening, coversOpeningMembers: before.coversOpeningMembers }
  const ok = updateRecord('transactions', paymentId, (r) => ({ ...r, ...withNamed(r, purchaseId, true) }))
  const set = fields(useData.getState().records.transactions[paymentId]?.record)
  if (ok)
    toast(`Zwrot przypisany: ${label}.`, 'success', 5000, {
      label: 'Cofnij',
      run: () => {
        // Only while still as it named them (a change since stays – review 3 of N4).
        if (!sameContentAs(fields(useData.getState().records.transactions[paymentId]?.record), set)) return undoKept(0, 1)
        void updateRecord('transactions', paymentId, (r) => ({ ...r, ...was }))
      }
    })
  return ok
}

/**
 * „Spłać” (AP-4, the inbox): a member's advances for the future that left their debt unpaid (not those kept) repay what
 * is still owed because of them – no more (`repayingAdvancesOf`, review 2 of N2: a debt a later repayment paid back is
 * not settled again); with „Cofnij”. False – nothing changed (said – AP-15).
 */
export function repayAdvances(memberId: string): boolean {
  const input = canWrite() ? fleetInputNow() : null
  const s = useData.getState()
  if (!input || !s.fi) return false
  const after = repayingAdvancesOf(input, memberId, s.fi.settings.import.notDuplicates, warsawNow().date)
  if (!after.length) {
    noAdvancesLeft(memberId)
    return false
  }
  const was = after.map((t) => s.records.transactions[t.id]?.record).filter((t): t is Transaction => !!t)
  if (!replaceRecords('transactions', after)) return false
  toast(`${memberName(memberId, s.fi.settings.household.members)}: ${countLabel(after.length, 'wpłata spłaca', 'wpłaty spłacają', 'wpłat spłaca')} dług, reszta zostaje zaliczką.`, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      // Only the ones as it left them (a change since stays – and is said, AP-15).
      const current = useData.getState().records.transactions
      const back = was.filter((t) => sameContentAs(current[t.id]?.record, after.find((a) => a.id === t.id)))
      replaceRecords('transactions', back)
      undoKept(back.length, was.length - back.length, 'wpłaty')
    }
  })
  return true
}

/**
 * „zostaw” (AP-4, the inbox): a member's advances for the future the report asks of (`skippedDebtsOf`) stay so – not asked
 * again; with „Cofnij”.
 */
export function keepAdvances(memberId: string): void {
  const input = canWrite() ? fleetInputNow() : null
  if (!input) return
  const ledger = householdOf(input, warsawNow().date)
  // As the inbox reads them: the advances kept already (here or on the other computer) are no question (review 3 of N4).
  const kept = useData.getState().fi?.settings.import.notDuplicates ?? {}
  const keys = (skippedDebtsOf(ledger, ledger.members, kept).find((m) => m.memberId === memberId)?.items ?? []).map((i) => skippedKey({ txId: i.txId, memberId }))
  if (!keys.length) return noAdvancesLeft(memberId)
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
 * The inbox's „Spłać” or „zostaw” on a report no longer so (its operations changed meanwhile – an edit, another computer):
 * nothing is changed, and that is said (AP-15 – never a click that does nothing in silence).
 */
function noAdvancesLeft(memberId: string): void {
  toast(`${memberName(memberId, membersNow())}: nic do zmiany – zaliczki na przyszłość nie zostawiają już długu.`, 'info', 5000)
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
    title: `${CASH_REPAY_TITLE}${purchase.counterparty || 'zakup'}`,
    covers: [purchase.id]
  })
  if (!addRecord('transactions', record)) return null
  toast(`Oddane gotówką (${who}): ${formatPln(amount)} zł.`, 'success', 6000, {
    label: 'Cofnij',
    run: () => {
      // Deleted only while as it wrote it (an edit since stays – review 3 of N4).
      const now = useData.getState().records.transactions[record.id]?.record
      if (!now) return
      if (!sameContentAs(now, record)) return undoKept(0, 1)
      void deleteRecords('transactions', [record.id])
    }
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

/**
 * A member from a counterparty of the import (D80 a): the bank's name is theirs; the id, or null (read-only folder). A
 * member holding that name already (T416) is the one – no second member the import could not tell apart.
 */
export function addMemberFromBank(bankName: string): string | null {
  if (!canWrite()) return null
  const holder = bankNameHolder(membersNow(), bankName)
  if (holder) {
    toast(`Nazwę „${bankName.trim()}” ma już ${holder.name} – przypisano tej osobie.`, 'info', 6000)
    return holder.id
  }
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

export { MAX_BANK_NAMES }

/**
 * A member's name in the bank added (D80): once, at most `MAX_BANK_NAMES`, never one another member holds (T416 – the
 * import could not tell them apart) – each refusal said (AP-15). false – refused (the field keeps what was typed).
 */
export function addBankName(memberId: string, name: string): boolean {
  const ms = membersNow()
  const m = ms.find((x) => x.id === memberId)
  const v = name.trim().slice(0, 120)
  if (!m || !v) return true
  const own = m.bankNames.find((x) => sameBankName(x, v))
  if (own) {
    toast(own === v ? `${m.name} ma już nazwę „${v}”.` : `${m.name} ma już nazwę „${own}” – „${v}” to dla importu ta sama.`, 'info', 5000)
    return true
  }
  const holder = bankNameHolder(ms, v, memberId)
  if (holder) {
    toast(`Import nie odróżni „${v}” od nazwy, którą ma ${holder.name} – jedna nazwa w banku nie może wskazywać dwóch osób.`, 'error', 7000)
    return false
  }
  if (m.bankNames.length >= MAX_BANK_NAMES) {
    toast(`Najwyżej ${MAX_BANK_NAMES} nazw w banku na domownika – usuń którąś, by dodać nową.`, 'error', 6000)
    return false
  }
  patchMember(memberId, { bankNames: [...m.bankNames, v] })
  return true
}

/**
 * A member's name in the bank taken off (AP-22, T414): „Cofnij” brings back that one name, at its place among the names
 * as they are then (one added meanwhile stays) – not when the member has it again, nor when another member holds it now
 * (said: one name never points at two members – `sameBankName`, T416).
 */
export function removeBankName(memberId: string, name: string): void {
  const m = membersNow().find((x) => x.id === memberId)
  const at = m ? m.bankNames.indexOf(name) : -1
  if (!m || at < 0) return
  patchMember(memberId, { bankNames: m.bankNames.filter((x) => x !== name) })
  toast(`Nazwa „${name}” nie wskazuje już ${m.name}.`, 'info', 8000, { label: 'Cofnij', run: () => bankNameBack(memberId, m.name, name, at) })
}

function bankNameBack(memberId: string, who: string, name: string, at: number): void {
  const ms = membersNow()
  const m = ms.find((x) => x.id === memberId)
  // Never in silence (AP-15): the member gone, the name there again.
  if (!m) return toast(`${who} nie ma już wśród domowników – nazwa „${name}” nie wróciła.`, 'info', 6000)
  const own = m.bankNames.find((x) => sameBankName(x, name))
  if (own) return toast(`${m.name} ma już nazwę „${own}” – nic do przywrócenia.`, 'info', 5000)
  const holder = bankNameHolder(ms, name, memberId)
  if (holder) return toast(`Import nie odróżni „${name}” od nazwy, którą ma teraz ${holder.name} – zostaje tam, ${m.name} jej nie odzyskuje.`, 'info', 7000)
  if (m.bankNames.length >= MAX_BANK_NAMES) return toast(`Najwyżej ${MAX_BANK_NAMES} nazw w banku na domownika – nazwa „${name}” nie wróciła.`, 'error', 6000)
  const names = [...m.bankNames]
  names.splice(Math.min(at, names.length), 0, name)
  patchMember(memberId, { bankNames: names })
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
  const set = useData.getState().fi!.settings.household
  toast(`Saldo na start rozliczeń przeliczone – ${shown.join(', ')}${changed.length > 3 ? ` i ${changed.length - 3} innych` : ''}.`, 'info', 8000, {
    label: 'Cofnij',
    run: () => {
      // Only what is still as it set it: the start, its operations, each member's balance on it (members added or
      // changed since stay – review 3 of N4).
      let kept = 0
      updateSettings((f) => {
        const h = f.settings.household
        const same = h.since === set.since && sameContentAs(h.openingIds, set.openingIds)
        if (!same) kept++
        const members = h.members.map((m) => {
          const was = before.members.find((x) => x.id === m.id)
          const now = set.members.find((x) => x.id === m.id)
          if (!was || !now || sameOpening(was.opening, now.opening)) return m
          if (!sameOpening(m.opening, now.opening)) {
            kept++
            return m
          }
          return { ...m, opening: was.opening }
        })
        return { ...f, settings: { ...f.settings, household: { ...h, ...(same ? { since: before.since, openingIds: before.openingIds } : {}), members } } }
      })
      if (kept) toast('Część rozliczeń zmieniła się od tego czasu – zostaje, jak jest; reszta cofnięta.', 'info', 7000)
    }
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
    run: () => {
      // Only while still as it set it (review 3 of N4).
      if (useData.getState().fi?.settings.household.assignFrom !== assignFrom) return undoKept(0, 1)
      updateSettings((f) => ({ ...f, settings: { ...f.settings, household: { ...f.settings.household, assignFrom: before } } }))
    }
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

