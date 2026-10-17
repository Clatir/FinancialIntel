import { create } from 'zustand'
import { computeFleet } from '@shared/calc/fleet'
import { categoryIndex } from '@shared/calc/operations'
import { newId } from '@shared/ids'
import { MbankFormatError, parseMbank, type MbankFile } from '@shared/import/mbank'
import { buildImport, choiceOf, planImport, type Choice, type ImportChoices, type ImportPlan, type RowPlan } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { MBANK_ACCOUNT_ID, type Transaction } from '@shared/schema'
import { api, errorMessage } from '../../lib/api'
import { addRecords, deleteRecord, flushSaves, replaceRecords, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'

export interface ImportGroup {
  group: string
  direction: 'in' | 'out'
  label: string
  rows: Array<Extract<RowPlan, { status: 'new' }>>
  sum: number
  from: string
  to: string
  /** The decision as proposed (a rule, the app's recognition, or nothing). */
  proposed: ReturnType<typeof choiceOf>
  source: 'rule' | 'builtin' | 'none'
  reason: string
  /** The bank's category's hint (a category id), the most frequent in the group. */
  hint: string | null
  bankCategory: string
}

export interface ImportDone {
  counts: { created: number; merged: number; settled: number; known: number; removed: number; skipped: number }
  backup: string
  accountId: string
  rules: number
}

interface ImportSession {
  fileName: string | null
  file: MbankFile | null
  error: string | null
  /** The budget's account of the file; '' = not chosen yet (the account with the mBank import). */
  accountId: string
  /** `bank.key` of the operations the user deleted (from the history): their rows stay out. */
  deletedKeys: ReadonlySet<string>
  plan: ImportPlan | null
  choices: ImportChoices
  busy: boolean
  done: ImportDone | null
}

const emptyChoices = (): ImportChoices => ({ groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {} })

export const useImport = create<ImportSession>(() => ({
  fileName: null,
  file: null,
  error: null,
  accountId: '',
  deletedKeys: new Set(),
  plan: null,
  choices: emptyChoices(),
  busy: false,
  done: null
}))

const records = <T,>(map: Record<string, { record: T }>): T[] => Object.values(map).map((e) => e.record)

/** The plan of `file` against the operations in memory now (rules and the holder's names from the settings). */
function planNow(file: MbankFile, accountId: string, deletedKeys: ReadonlySet<string>): ImportPlan | null {
  const s = useData.getState()
  if (!s.fi) return null
  const ownNames = [...s.fi.settings.import.ownNames, ...(file.client ? [file.client] : [])]
  return planImport(file, accountId, records(s.records.transactions), { rules: s.fi.settings.import.rules, ownNames, categories: categoryIndex(s.fi.settings.categories), containers: records(s.records.containers) }, deletedKeys)
}

/** Keys of the bank's rows of deleted operations (their last versions in the history). */
async function deletedBankKeys(): Promise<Set<string>> {
  try {
    const deleted = await api.historyDeleted('transactions')
    return new Set(deleted.map((d) => (d.record as { bank?: { key?: unknown } } | null)?.bank?.key).filter((k): k is string => typeof k === 'string'))
  } catch {
    return new Set()
  }
}

/** The account a file goes to: the one with the mBank import (the first), else mBank. */
function importAccount(): string {
  const accounts = useData.getState().fi?.settings.accounts ?? []
  return accounts.find((a) => !a.archived && a.importFormat === 'mbank')?.id ?? MBANK_ACCOUNT_ID
}

export async function loadImportFile(name: string, bytes: Uint8Array): Promise<void> {
  try {
    const file = parseMbank(decodeText(bytes))
    const accountId = useImport.getState().accountId || importAccount()
    const deletedKeys = await deletedBankKeys()
    // Nothing is ticked by itself: pending operations the list no longer shows may only be filtered out of it.
    useImport.setState({ fileName: name, file, error: null, accountId, deletedKeys, plan: planNow(file, accountId, deletedKeys), choices: emptyChoices(), done: null })
  } catch (e) {
    useImport.setState({ fileName: name, file: null, plan: null, error: e instanceof MbankFormatError ? e.message : `Nie udało się odczytać pliku: ${errorMessage(e)}`, done: null })
  }
}

export async function pickImportFile(): Promise<void> {
  try {
    const picked = await api.pickImportFile()
    if (picked) await loadImportFile(picked.name, picked.bytes)
  } catch (e) {
    toast(errorMessage(e), 'error', 7000)
  }
}

/** Another account: the plan again; the decisions of the groups (by counterparty) stay, those of single rows go (their keys change). */
export function setImportAccount(accountId: string): void {
  const { file, deletedKeys, choices } = useImport.getState()
  useImport.setState({ accountId, plan: file ? planNow(file, accountId, deletedKeys) : null, choices: { ...emptyChoices(), groups: choices.groups, remember: choices.remember } })
}

export function closeImport(): void {
  useImport.setState({ fileName: null, file: null, error: null, plan: null, choices: emptyChoices(), done: null })
}

function patchChoices(fn: (c: ImportChoices) => ImportChoices): void {
  useImport.setState((s) => ({ choices: fn(s.choices) }))
}

/**
 * A decision for a whole group: the user's own is remembered as a rule by default (they can untick it); `remember`
 * false = not by default (the bank's hints taken in one click are no decision of the user – D68).
 */
export function chooseGroup(group: string, choice: Choice, remember?: boolean): void {
  patchChoices((c) => ({ ...c, groups: { ...c.groups, [group]: choice }, remember: { ...c.remember, [group]: remember ?? c.remember[group] ?? true } }))
}

export function chooseRow(key: string, choice: Choice | null): void {
  patchChoices((c) => {
    const rows = { ...c.rows }
    if (choice) rows[key] = choice
    else delete rows[key]
    return { ...c, rows }
  })
}

export const setRemember = (group: string, on: boolean) => patchChoices((c) => ({ ...c, remember: { ...c.remember, [group]: on } }))
export const setNoMerge = (key: string, on: boolean) => patchChoices((c) => ({ ...c, noMerge: { ...c.noMerge, [key]: on } }))
export const setRemoveVanished = (id: string, on: boolean) => patchChoices((c) => ({ ...c, removeVanished: { ...c.removeVanished, [id]: on } }))
export const setRestoreDeleted = (key: string, on: boolean) => patchChoices((c) => ({ ...c, restoreDeleted: { ...c.restoreDeleted, [key]: on } }))

/** Groups of the new rows (one counterparty, one direction), the undecided first, then the biggest. */
export function groupsOf(plan: ImportPlan | null): ImportGroup[] {
  if (!plan) return []
  const map = new Map<string, ImportGroup>()
  const counts = new Map<string, Map<string, number>>()
  for (const p of plan.rows) {
    if (p.status !== 'new') continue
    let g = map.get(p.group)
    if (!g) {
      g = {
        group: p.group,
        direction: p.row.amount < 0 ? 'out' : 'in',
        label: p.row.counterparty || p.row.operation || '(bez nazwy)',
        rows: [],
        sum: 0,
        from: p.row.date,
        to: p.row.date,
        proposed: choiceOf(p.decision),
        source: p.decision.source,
        reason: p.decision.reason,
        hint: null,
        bankCategory: ''
      }
      map.set(p.group, g)
      counts.set(p.group, new Map())
    }
    g.rows.push(p)
    g.sum += p.row.amount
    if (p.row.date < g.from) g.from = p.row.date
    if (p.row.date > g.to) g.to = p.row.date
    if (p.hint) counts.get(p.group)!.set(`${p.hint}|${p.row.category}`, (counts.get(p.group)!.get(`${p.hint}|${p.row.category}`) ?? 0) + 1)
  }
  for (const g of map.values()) {
    const best = [...(counts.get(g.group) ?? new Map()).entries()].sort((a, b) => b[1] - a[1])[0]
    if (best) [g.hint, g.bankCategory] = best[0].split('|') as [string, string]
  }
  const undecided = (g: ImportGroup) => g.source === 'none' && !(g.proposed.kind === 'expense' && g.proposed.categoryId)
  return [...map.values()].sort((a, b) => Number(undecided(b)) - Number(undecided(a)) || b.rows.length - a.rows.length || a.label.localeCompare(b.label))
}

/** „Przyjmij podpowiedzi mBanku”: the bank's category for the expense groups still without one. */
export function acceptHints(groups: readonly ImportGroup[]): number {
  const { choices } = useImport.getState()
  let n = 0
  for (const g of groups) {
    const c = choices.groups[g.group] ?? g.proposed
    if (c.kind !== 'expense' || c.categoryId || !g.hint) continue
    chooseGroup(g.group, { ...c, categoryId: g.hint }, false)
    n++
  }
  return n
}

/**
 * Import: everything saved first, the backup (spec: a backup before every import), the plan once more against the
 * operations now, the records, the rules learned, the holder's name remembered, the time of the import.
 */
export async function runImport(): Promise<void> {
  const st = useImport.getState()
  if (!st.file || st.busy) return
  useImport.setState({ busy: true })
  try {
    const status = useData.getState().status
    if (status?.readOnly) throw new Error(`Folder jest tylko do odczytu${status.readOnlyReason ? ` (${status.readOnlyReason})` : ''} – import niemożliwy.`)
    if (!(await flushSaves())) throw new Error('Nie udało się zapisać bieżących zmian – import wstrzymany. Spróbuj ponownie za chwilę.')
    const backup = await api.importBackup()
    const plan = planNow(st.file, st.accountId, st.deletedKeys)
    const s = useData.getState()
    if (!plan || !s.fi) throw new Error('Brak danych do importu.')
    const now = new Date().toISOString()
    const fleet = computeFleet({
      settings: s.fi.settings,
      transactions: records(s.records.transactions),
      balances: records(s.records.balances),
      goals: records(s.records.goals),
      months: records(s.records.months),
      containers: records(s.records.containers),
      dockings: records(s.records.dockings),
      loans: records(s.records.loans),
      now
    })
    const labels = Object.fromEntries(groupsOf(plan).map((g) => [g.group, g.label]))
    const result = buildImport(plan, st.choices, { now, house: fleet.receivables.house, makeId: newId, rules: s.fi.settings.import.rules, labels })
    addRecords('transactions', result.create)
    replaceRecords('transactions', result.update as Transaction[])
    for (const id of result.remove) await deleteRecord('transactions', id)
    const client = st.file.client
    const learned = result.rules.length - s.fi.settings.import.rules.length
    updateSettings((f) => ({
      ...f,
      settings: {
        ...f.settings,
        import: {
          ...f.settings.import,
          rules: result.rules,
          ownNames: client && !f.settings.import.ownNames.some((n) => n.toLowerCase() === client.toLowerCase()) ? [...f.settings.import.ownNames, client] : f.settings.import.ownNames,
          lastImport: { ...f.settings.import.lastImport, [st.accountId]: now }
        }
      }
    }))
    if (!(await flushSaves())) throw new Error('Część operacji nie zapisała się jeszcze – aplikacja ponawia zapis automatycznie.')
    useImport.setState({ done: { counts: result.counts, backup, accountId: st.accountId, rules: learned }, file: null, plan: null, choices: emptyChoices() })
    toast(`Zaimportowano: ${result.counts.created} nowych, ${result.counts.merged} połączonych z wpisami, ${result.counts.settled} rozliczonych.`, 'success', 6000)
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
  } finally {
    useImport.setState({ busy: false })
  }
}
