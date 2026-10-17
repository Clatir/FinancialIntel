import { create } from 'zustand'
import { computeFleet } from '@shared/calc/fleet'
import { categoryIndex } from '@shared/calc/operations'
import { newId } from '@shared/ids'
import { MbankFormatError, parseMbank, type MbankFile } from '@shared/import/mbank'
import { buildImport, importGroups, planImport, sameChoice, type Choice, type ImportChoices, type ImportGroup, type ImportPlan, type ImportTheme } from '@shared/import/reconcile'
import { decodeText } from '@shared/import/text'
import { MBANK_ACCOUNT_ID, type ImportRule, type Transaction } from '@shared/schema'
import { api, errorMessage } from '../../lib/api'
import { addRecords, deleteRecord, flushSaves, replaceRecords, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { choiceFor, fits, type Option } from './options'

export interface ImportDone {
  counts: { created: number; merged: number; settled: number; known: number; removed: number; skipped: number; excluded: number }
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
  /** The search of the categorization (1.2.1). */
  query: string
  /** Groups (`ImportGroup.group`) and single rows (`RowPlan.key`) ticked for a bulk action. */
  selected: { groups: Record<string, true>; rows: Record<string, true> }
  /** The rules the plan was made with: other rules now (a keyword added, a rule deleted) = plan again. */
  rulesUsed: readonly ImportRule[] | null
  /**
   * Themes – and, after a re-plan, groups – decided by accepting what was offered („Przyjmij pewne”, the bank's hint):
   * a new proposal (a keyword added) wins over them on a re-plan; the user's own choice does not change.
   */
  accepted: { themes: Record<string, true>; groups: Record<string, true> }
  busy: boolean
  done: ImportDone | null
}

const noSelection = (): ImportSession['selected'] => ({ groups: {}, rows: {} })

const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {} })

export const useImport = create<ImportSession>(() => ({
  fileName: null,
  file: null,
  error: null,
  accountId: '',
  deletedKeys: new Set(),
  plan: null,
  choices: emptyChoices(),
  query: '',
  selected: noSelection(),
  rulesUsed: null,
  accepted: { themes: {}, groups: {} },
  busy: false,
  done: null
}))

const records = <T,>(map: Record<string, { record: T }>): T[] => Object.values(map).map((e) => e.record)

/** The plan of `file` against the operations in memory now (rules and the holder's names from the settings). */
function planNow(file: MbankFile, accountId: string, deletedKeys: ReadonlySet<string>): ImportPlan | null {
  const s = useData.getState()
  if (!s.fi) return null
  useImport.setState({ rulesUsed: s.fi.settings.import.rules })
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
    useImport.setState({ fileName: name, file, error: null, accountId, deletedKeys, plan: planNow(file, accountId, deletedKeys), choices: emptyChoices(), query: '', selected: noSelection(), accepted: { themes: {}, groups: {} }, done: null })
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

/** Another account: the plan again; the decisions of themes and groups (by brand) stay, those of single rows go (their keys change). */
export function setImportAccount(accountId: string): void {
  const { file, deletedKeys, choices } = useImport.getState()
  useImport.setState({
    accountId,
    plan: file ? planNow(file, accountId, deletedKeys) : null,
    choices: { ...emptyChoices(), themes: choices.themes, rememberThemes: choices.rememberThemes, groups: choices.groups, remember: choices.remember },
    selected: { groups: useImport.getState().selected.groups, rows: {} }
  })
}

/** Plan again when the rules are not the ones the plan was made with (a keyword added here, in the settings, elsewhere). */
export function replanIfRulesChanged(rules: readonly ImportRule[] | undefined): void {
  const { plan, rulesUsed } = useImport.getState()
  if (plan && rules && rules !== rulesUsed) replanImport()
}

/**
 * The plan once more (the rules changed – a keyword added, a rule deleted – or the operations did): the decisions stay;
 * a group whose proposal changed (another key) keeps its decision under the group of the same brand and direction.
 */
export function replanImport(): void {
  const { file, accountId, deletedKeys, plan: old, choices, selected, accepted } = useImport.getState()
  if (!file || !old) return
  const plan = planNow(file, accountId, deletedKeys)
  if (!plan) return
  const before = importGroups(old)
  const fresh = importGroups(plan)
  const keys = new Set(fresh.map((g) => g.group))
  // A theme's decision becomes its groups' own: themes are keyed by the proposal, so other groups may join the theme
  // now – they must not take a decision the user never saw for them.
  const groups: Record<string, Choice> = {}
  const remember: Record<string, boolean> = {}
  const weak = new Set<string>()
  for (const g of before) {
    const own = choices.groups[g.group]
    const c = own ?? choices.themes[g.theme]
    if (!c) continue
    groups[g.group] = c
    remember[g.group] = own ? (choices.remember[g.group] ?? true) : (choices.rememberThemes[g.theme] ?? true)
    if (own ? accepted.groups[g.group] : accepted.themes[g.theme]) weak.add(g.group)
  }
  // A group whose proposal changed (another key) passes the user's decision on by its operations: a new group whose
  // every operation had the same decision takes it as its own, the others row by row; an accepted offer gives way to
  // the new proposal. The ticks follow the operations the same way.
  const rows = { ...choices.rows }
  const carried = new Map<string, { c: Choice; remember: boolean }>()
  const tickedRows = { ...selected.rows }
  const fromGroups = new Set<string>()
  for (const g of before) {
    if (keys.has(g.group)) continue
    const c = groups[g.group]
    if (c && !weak.has(g.group)) for (const p of g.rows) carried.set(p.key, { c, remember: remember[g.group]! })
    if (selected.groups[g.group])
      for (const p of g.rows) {
        tickedRows[p.key] = true
        fromGroups.add(p.key)
      }
    delete groups[g.group]
    delete remember[g.group]
  }
  for (const n of fresh) {
    if (groups[n.group]) continue
    const got = n.rows.map((p) => carried.get(p.key))
    const first = got[0]
    if (first && got.every((x) => x && sameChoice(x.c, first.c))) {
      groups[n.group] = first.c
      remember[n.group] = first.remember
    } else
      n.rows.forEach((p, i) => {
        const x = got[i]
        if (x && !rows[p.key]) rows[p.key] = x.c
      })
  }
  const tickedGroups: Record<string, true> = {}
  for (const g of before) if (selected.groups[g.group] && keys.has(g.group)) tickedGroups[g.group] = true
  for (const n of fresh)
    if (!tickedGroups[n.group] && n.rows.every((p) => fromGroups.has(p.key))) {
      tickedGroups[n.group] = true
      for (const p of n.rows) delete tickedRows[p.key]
    }
  const stillWeak = Object.fromEntries([...weak].filter((g) => keys.has(g)).map((g) => [g, true as const]))
  useImport.setState({
    plan,
    choices: { ...choices, themes: {}, rememberThemes: {}, groups, remember, rows },
    selected: { groups: tickedGroups, rows: tickedRows },
    accepted: { themes: {}, groups: stillWeak }
  })
}

export function closeImport(): void {
  useImport.setState({ fileName: null, file: null, error: null, plan: null, choices: emptyChoices(), query: '', selected: noSelection(), accepted: { themes: {}, groups: {} }, done: null })
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
  unaccept('groups', group)
}

/** The bank's hint taken for one group: an offer accepted, not the user's decision – no rule (D68). */
export function acceptGroupHint(group: string, choice: Choice): void {
  chooseGroup(group, choice, false)
  useImport.setState((s) => ({ accepted: { ...s.accepted, groups: { ...s.accepted.groups, [group]: true } } }))
}

/** The user's own choice: no longer an accepted offer. */
function unaccept(kind: 'themes' | 'groups', key: string): void {
  const { accepted } = useImport.getState()
  if (!accepted[kind][key]) return
  const next = { ...accepted[kind] }
  delete next[key]
  useImport.setState({ accepted: { ...accepted, [kind]: next } })
}

/** A group back to its theme's decision (or the proposal). */
export function clearGroup(group: string): void {
  patchChoices((c) => {
    const groups = { ...c.groups }
    delete groups[group]
    return { ...c, groups }
  })
  unaccept('groups', group)
}

/**
 * A decision for a whole theme (1.2.1): every group of it without its own decision; remembered by brand like a group's.
 * `accepted` = what was offered taken as it is (a new proposal wins over it on a re-plan).
 */
export function chooseTheme(theme: string, choice: Choice, remember?: boolean, accepted = false): void {
  patchChoices((c) => ({ ...c, themes: { ...c.themes, [theme]: choice }, rememberThemes: { ...c.rememberThemes, [theme]: remember ?? c.rememberThemes[theme] ?? true } }))
  if (accepted) useImport.setState((s) => ({ accepted: { ...s.accepted, themes: { ...s.accepted.themes, [theme]: true } } }))
  else unaccept('themes', theme)
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
export const setRememberTheme = (theme: string, on: boolean) => patchChoices((c) => ({ ...c, rememberThemes: { ...c.rememberThemes, [theme]: on } }))
export const setNoMerge = (key: string, on: boolean) => patchChoices((c) => ({ ...c, noMerge: { ...c.noMerge, [key]: on } }))
export const setRemoveVanished = (id: string, on: boolean) => patchChoices((c) => ({ ...c, removeVanished: { ...c.removeVanished, [id]: on } }))
export const setRestoreDeleted = (key: string, on: boolean) => patchChoices((c) => ({ ...c, restoreDeleted: { ...c.restoreDeleted, [key]: on } }))

// ------------------------------------------------------------------ search and selection (1.2.1)

export const setImportQuery = (query: string) => useImport.setState({ query })

/** Tick or untick groups and rows (a theme's tick = its groups). */
export function selectImport(target: { groups?: readonly string[]; rows?: readonly string[] }, on: boolean): void {
  useImport.setState((s) => {
    const groups = { ...s.selected.groups }
    const rows = { ...s.selected.rows }
    for (const g of target.groups ?? []) if (on) groups[g] = true
    else delete groups[g]
    for (const r of target.rows ?? []) if (on) rows[r] = true
    else delete rows[r]
    return { selected: { groups, rows } }
  })
}

export const clearImportSelection = () => useImport.setState({ selected: noSelection() })

/** The ticked rows (of the plan): of the ticked groups and the ticked ones apart, each once. */
export function selectedRowKeys(groups: readonly ImportGroup[], selected = useImport.getState().selected): string[] {
  const keys = new Set<string>()
  for (const g of groups) for (const p of g.rows) if (selected.groups[g.group] || selected.rows[p.key]) keys.add(p.key)
  return [...keys]
}

/**
 * One decision for everything ticked: a ticked group takes it as its own (remembered), a row ticked apart as the
 * row's; where it does not fit the money (income for a purchase) nothing changes. Returns how many took it, and not.
 */
export function chooseSelected(groups: readonly ImportGroup[], option: Option, categoryId: string | null): { applied: number; unfit: number } {
  const { selected } = useImport.getState()
  const choice = choiceFor(option, { kind: 'expense', categoryId })
  let applied = 0
  let unfit = 0
  const rowGroup = new Map(groups.flatMap((g) => g.rows.map((p) => [p.key, g] as const)))
  for (const g of groups) {
    if (!selected.groups[g.group]) continue
    if (fits(option, g.direction)) {
      chooseGroup(g.group, choice, true)
      applied++
    } else unfit++
  }
  for (const key of Object.keys(selected.rows)) {
    const g = rowGroup.get(key)
    if (!g || selected.groups[g.group]) continue
    if (fits(option, g.direction)) {
      chooseRow(key, choice)
      applied++
    } else unfit++
  }
  return { applied, unfit }
}

export const setSkip = (keys: readonly string[], on: boolean) =>
  patchChoices((c) => {
    const skip = { ...c.skip }
    for (const k of keys) if (on) skip[k] = true
    else delete skip[k]
    return { ...c, skip }
  })

/** The ticked rows out of this import (or back in). Returns how many. */
export function skipSelected(groups: readonly ImportGroup[], on: boolean): number {
  const keys = selectedRowKeys(groups)
  setSkip(keys, on)
  return keys.length
}

/**
 * Where a theme stands: 'todo' – groups without any proposal wait for the user; 'check' – recognized (a chain, a
 * keyword, the app), the user may confirm or change; 'done' – the user decided it, or every group is decided or the
 * user's rule.
 */
export type ThemeStatus = 'todo' | 'check' | 'done'

export function themeStatus(t: ImportTheme, c: ImportChoices): ThemeStatus {
  if (c.themes[t.theme]) return 'done'
  const open = t.groups.filter((g) => !c.groups[g.group] && g.source !== 'rule')
  if (!open.length) return 'done'
  return open.some((g) => g.source === 'none') ? 'todo' : 'check'
}

/**
 * „Przyjmij pewne” (D75): the recognized themes still to check – chains, keywords, the app's own recognition – as the
 * user's decision, remembered (rules of their brands: the next import shows them done). Returns how many.
 */
export function acceptSure(themes: readonly ImportTheme[]): number {
  const { choices } = useImport.getState()
  let n = 0
  for (const t of themes) {
    if (t.basis.kind !== 'proposal' || themeStatus(t, choices) !== 'check') continue
    chooseTheme(t.theme, t.basis.choice, true, true)
    n++
  }
  return n
}

/** Themes of expenses the bank's category hints at, still without a decision. */
export const hintable = (themes: readonly ImportTheme[], c: ImportChoices) => themes.filter((t) => t.basis.kind === 'hint' && t.direction === 'out' && themeStatus(t, c) === 'todo')

/** „Przyjmij podpowiedzi mBanku”: the bank's category for the expense themes it hints at – no rules (D68). */
export function acceptHints(themes: readonly ImportTheme[]): number {
  const todo = hintable(themes, useImport.getState().choices)
  for (const t of todo) if (t.basis.kind === 'hint') chooseTheme(t.theme, { kind: 'expense', categoryId: t.basis.categoryId, refundable: false, household: false, counterAccountId: null }, false, true)
  return todo.length
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
    const result = buildImport(plan, st.choices, { now, house: fleet.receivables.house, makeId: newId, rules: s.fi.settings.import.rules })
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
          lastImport: { ...f.settings.import.lastImport, [st.accountId]: now },
          // The imports' times (the mission „Łączność z bazą”, E7): the last 100.
          log: Object.fromEntries(
            Object.entries({ ...f.settings.import.log, [now]: st.accountId })
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-100)
          )
        }
      }
    }))
    if (!(await flushSaves())) throw new Error('Część operacji nie zapisała się jeszcze – aplikacja ponawia zapis automatycznie.')
    useImport.setState({ done: { counts: result.counts, backup, accountId: st.accountId, rules: learned }, file: null, plan: null, choices: emptyChoices(), query: '', selected: noSelection(), accepted: { themes: {}, groups: {} } })
    toast(`Zaimportowano: ${result.counts.created} nowych, ${result.counts.merged} połączonych z wpisami, ${result.counts.settled} rozliczonych.`, 'success', 6000)
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
  } finally {
    useImport.setState({ busy: false })
  }
}
