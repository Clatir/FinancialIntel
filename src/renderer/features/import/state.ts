import { create } from 'zustand'
import { categoryIndex } from '@shared/calc/operations'
import { newId } from '@shared/ids'
import { MbankFormatError, parseMbank, type MbankFile } from '@shared/import/mbank'
import {
  buildImport,
  importGroups,
  joins,
  keysOnly,
  owedWithFile,
  planImport,
  rowShares,
  sameChoice,
  type Choice,
  type DeletedRow,
  type ImportChoices,
  type ImportCounts,
  type ImportGroup,
  type ImportPlan,
  type ImportResult,
  type ImportTheme,
  type SharePart,
  type SharesSpread,
  type SpreadLine
} from '@shared/import/reconcile'
import { balanceOf, type HouseholdLedger } from '@shared/calc/household'
import { returnedKey } from '@shared/import/deleted'
import { warsawNow } from '@shared/calc/dates'
import { linkRepayments } from '@shared/calc/repayments'
import { duplicateKey } from '@shared/import/duplicates'
import { decodeText, IMPORT_MAX_BYTES } from '@shared/import/text'
import { shareComplete } from '@shared/calc/share'
import { deepEqual } from '@shared/merge'
import { batchesToDrop, importBatch, type BatchFacts } from '@shared/import/batch'
import { accountForNumber, accountNumberOf } from '@shared/import/mbank'
import { statementCheck, statementOf, type Statement } from '@shared/import/statement'
import { countLabel } from '../../lib/format'
import { openingOf } from '@shared/calc/balances'
import { balanceSchema, HOUSE_MEMBER_ID, MBANK_ACCOUNT_ID, SCHEMA_VERSION, type Balance, type HouseholdMember, type ImportBatchSettings, type ImportSettings, type Share, type Transaction } from '@shared/schema'
import { api, errorMessage } from '../../lib/api'
import { addRecord, addRecords, deleteRecords, flushSaves, listOf, replaceRecords, saveFirst, unsavedNote, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { fleetInputNow, fleetNow } from '../../store/fleet'
import { bulkKeeps, choiceFor, fits, type Option } from './options'
import { rememberInflows } from '../household/actions'
import { checkedWithImport, readDeletedBank } from './returned'

export interface ImportDone {
  counts: ImportCounts
  backup: string
  accountId: string
  rules: number
  /** Its batch (F4 „Cofnij import”; null = nothing changed – no batch). */
  batchId: string | null
  /** The bank's balances of an account history (F5; null = the list of operations has none). */
  statement: Statement | null
  /** The balance the file confirmed by itself (F5): its day. */
  confirmed: string | null
}

interface ImportSession {
  fileName: string | null
  /** The open file's id in the main process (F14 – found in the downloads or chosen): moved to the Recycle Bin after the import. */
  fileRef: string | null
  file: MbankFile | null
  error: string | null
  /** The file the error is about (another than the open one – N12: a wrong file never closes the open one). */
  errorName: string | null
  /** The budget's account of the file; '' = not chosen yet (the account with the mBank import). */
  accountId: string
  /** The keys of the rows of the operations the user deleted (from the history – `bank.key`, `altKeys`): their rows stay out. */
  deletedKeys: ReadonlySet<string>
  /** The ones of them matched without a key (B96 pending, AF-1 booked of the other format): their rows stay out too. */
  deletedRows: readonly DeletedRow[]
  plan: ImportPlan | null
  choices: ImportChoices
  /** The search of the categorization (1.2.1). */
  query: string
  /** Groups (`ImportGroup.group`) and single rows (`RowPlan.key`) ticked for a bulk action. */
  selected: { groups: Record<string, true>; rows: Record<string, true> }
  /**
   * What the plan was made with: another one now (a keyword added, a rule deleted, names merged – 1.2.2; the holder's
   * names, a category, a container, a loan, the operations – B38) = plan again.
   */
  planInputs: PlanInputs | null
  /** The group the user decided last by itself (1.2.2): a keyword rule is proposed for it, until closed (`noProposal`). */
  lastDecided: string | null
  noProposal: Record<string, true>
  /**
   * Themes – and, after a re-plan, groups – decided by accepting what was offered („Przyjmij pewne”, the bank's hint):
   * a new proposal (a keyword added) wins over them on a re-plan; the user's own choice does not change.
   */
  accepted: { themes: Record<string, true>; groups: Record<string, true> }
  busy: boolean
  done: ImportDone | null
}

const noSelection = (): ImportSession['selected'] => ({ groups: {}, rows: {} })

const emptyChoices = (): ImportChoices => ({ themes: {}, rememberThemes: {}, groups: {}, rows: {}, remember: {}, noMerge: {}, removeVanished: {}, restoreDeleted: {}, skip: {}, moveHere: {}, removeCopies: {}, implicit: {} })

export const useImport = create<ImportSession>(() => ({
  fileName: null,
  fileRef: null,
  file: null,
  error: null,
  errorName: null,
  accountId: '',
  deletedKeys: new Set(),
  deletedRows: [],
  plan: null,
  choices: emptyChoices(),
  query: '',
  selected: noSelection(),
  planInputs: null,
  lastDecided: null,
  noProposal: {},
  accepted: { themes: {}, groups: {} },
  busy: false,
  done: null
}))

/** What a plan reads (as the store keeps it – compared by reference). */
export interface PlanInputs {
  rules: unknown
  aliases: unknown
  members: unknown
  ownNames: unknown
  categories: unknown
  containers: unknown
  loans: unknown
  transactions: unknown
  accountNumbers: unknown
}

/** The plan's inputs as the store has them now. */
export function planInputsNow(): PlanInputs | null {
  const s = useData.getState()
  if (!s.fi) return null
  const { rules, aliases, ownNames } = s.fi.settings.import
  return { rules, aliases, members: s.fi.settings.household.members, ownNames, categories: s.fi.settings.categories, containers: s.records.containers, loans: s.records.loans, transactions: s.records.transactions, accountNumbers: s.fi.settings.import.accountNumbers }
}

/**
 * The groups of a plan, once for every panel showing them (themes, similar names, the bulk bar) and the re-plan; rows of
 * deleted operations brought back are in them (N90).
 */
let groupsMemo: { plan: ImportPlan | null; restored: Readonly<Record<string, boolean>> | null; groups: ImportGroup[] } = { plan: null, restored: null, groups: [] }
function groupsOf(plan: ImportPlan | null, restored: Readonly<Record<string, boolean>> = useImport.getState().choices.restoreDeleted): ImportGroup[] {
  if (groupsMemo.plan !== plan || groupsMemo.restored !== restored) groupsMemo = { plan, restored, groups: importGroups(plan, restored) }
  return groupsMemo.groups
}
export const useImportGroups = (): ImportGroup[] => groupsOf(useImport((s) => s.plan), useImport((s) => s.choices.restoreDeleted))

/** Operations a newer version wrote – read only here (B95): never joined nor settled by a plan. Once per map of records. */
const lockedMemo = new WeakMap<object, ReadonlySet<string>>()
function lockedOf(map: Record<string, { record: { id: string }; readOnly?: boolean }>): ReadonlySet<string> {
  let set = lockedMemo.get(map)
  if (!set) {
    const ids = new Set<string>()
    for (const e of Object.values(map)) if (e.readOnly) ids.add(e.record.id)
    lockedMemo.set(map, (set = ids))
  }
  return set
}

/** Docked operations (AF-9: a copy of one is never removed by the import). Once per map of dockings. */
const dockedMemo = new WeakMap<object, ReadonlySet<string>>()
const NO_DOCKINGS: Record<string, { record: { transactionId: string } }> = {}
function dockedOf(map: Record<string, { record: { transactionId: string } }>): ReadonlySet<string> {
  let set = dockedMemo.get(map)
  if (!set) dockedMemo.set(map, (set = new Set(Object.values(map).map((e) => e.record.transactionId))))
  return set
}

/** The account holder's names: the settings' and the file's `#Klient`. */
export const ownNamesWith = (names: readonly string[], file: MbankFile | null): string[] => [...names, ...(file?.client ? [file.client] : [])]

/** The plan of `file` against the operations in memory now (rules, merged names and the holder's names from the settings). */
function planNow(file: MbankFile, accountId: string, deletedKeys: ReadonlySet<string>, deletedRows: readonly DeletedRow[] = useImport.getState().deletedRows): ImportPlan | null {
  const s = useData.getState()
  if (!s.fi) return null
  const { rules, aliases } = s.fi.settings.import
  const { members } = s.fi.settings.household
  useImport.setState({ planInputs: planInputsNow() })
  // The store's lists (W18): the same while the records are – a plan again after a keyword reads their indexes as they are.
  return planImport(
    file,
    accountId,
    listOf(s.records.transactions),
    {
      rules,
      ownNames: ownNamesWith(s.fi.settings.import.ownNames, file),
      categories: categoryIndex(s.fi.settings.categories),
      containers: listOf(s.records.containers),
      aliases,
      members,
      loans: listOf(s.records.loans ?? {}),
      accountNumbers: s.fi.settings.import.accountNumbers,
      locked: lockedOf(s.records.transactions),
      docked: dockedOf(s.records.dockings ?? NO_DOCKINGS)
    },
    deletedKeys,
    deletedRows
  )
}

/**
 * What a plan does, as one text: another one at the moment of the import = the data changed after it was shown (B38 – a
 * deletion synced from another computer, an operation changed meanwhile).
 */
export function planSignature(plan: ImportPlan | null): string {
  if (!plan) return ''
  const rows = plan.rows.map((p) => {
    // A copy on another account (AF-9): which one, and whether it may be removed.
    const copy = p.status === 'known' && p.copy ? `/${p.copy.tx.id}${p.copy.blocked ? `:${p.copy.blocked}` : ''}` : ''
    const what = p.status === 'new' || p.status === 'deleted' ? p.group : p.status === 'merge' ? `${p.tx.id}/${p.planned.group}` : `${p.tx.id}${copy}`
    return `${p.status}:${p.key}:${what}`
  })
  return [...rows, ...plan.vanished.map((t) => `-${t.id}`)].join('|')
}

/**
 * The operations of the bank the user deleted (their last versions in the history – `shared/import/deleted.ts`): not
 * those taken back with their import (F4, T39: the next import brings their rows); the pending ones (B96) and the booked
 * ones with their format (AF-1) matched without a key too.
 */
async function deletedBankRows(): Promise<{ deletedKeys: ReadonlySet<string>; deletedRows: readonly DeletedRow[] }> {
  const { keys, rows } = await readDeletedBank()
  return { deletedKeys: keys, deletedRows: rows }
}

/**
 * The account a file goes to (AP-2): the one its bank account's number was imported to (`accountForNumber`), else the
 * one chosen before, else the one with the mBank import (the first), else mBank.
 */
function importAccount(file: MbankFile, chosen: string): string {
  const s = useData.getState().fi?.settings
  const accounts = s?.accounts ?? []
  return (
    accountForNumber(accounts, s?.import.accountNumbers ?? {}, accountNumberOf(file.account), chosen) ||
    chosen ||
    (accounts.find((a) => !a.archived && a.importFormat === 'mbank')?.id ?? MBANK_ACCOUNT_ID)
  )
}

/** What of a session the user decided (N12): never thrown away without „Cofnij”. */
function hasDecisions(s: ImportSession): boolean {
  const c = s.choices
  return [c.themes, c.groups, c.rows, c.skip, c.noMerge, c.removeVanished, c.restoreDeleted, c.moveHere, c.removeCopies ?? {}].some((m) => Object.keys(m).length > 0)
}

/** The open file and its decisions, as they are (N12: „Cofnij” brings them back). */
type Snapshot = Pick<ImportSession, 'fileName' | 'file' | 'accountId' | 'deletedKeys' | 'deletedRows' | 'plan' | 'planInputs' | 'choices' | 'query' | 'selected' | 'accepted' | 'lastDecided' | 'noProposal'>
function snapshot(s: ImportSession): Snapshot {
  const { fileName, file, accountId, deletedKeys, deletedRows, plan, planInputs, choices, query, selected, accepted, lastDecided, noProposal } = s
  return { fileName, file, accountId, deletedKeys, deletedRows, plan, planInputs, choices, query, selected, accepted, lastDecided, noProposal }
}

/** The session before an action back, re-planned against the data now (it may have changed meanwhile). */
function restore(snap: Snapshot): void {
  useImport.setState({ ...snap, error: null, errorName: null, done: null })
  replanImport()
}

export async function loadImportFile(name: string, bytes: Uint8Array, ref: string | null = null): Promise<void> {
  const before = useImport.getState()
  try {
    const file = parseMbank(decodeText(bytes))
    // By the file's bank account first (AP-2): the account chosen for the file before does not stick to the next one.
    const accountId = importAccount(file, before.accountId)
    const { deletedKeys, deletedRows } = await deletedBankRows()
    const prev = before.file && hasDecisions(before) ? snapshot(before) : null
    // Nothing is ticked by itself: pending operations the list no longer shows may only be filtered out of it.
    useImport.setState({
      fileName: name,
      fileRef: ref,
      file,
      error: null,
      errorName: null,
      accountId,
      deletedKeys,
      deletedRows,
      plan: planNow(file, accountId, deletedKeys, deletedRows),
      choices: emptyChoices(),
      query: '',
      selected: noSelection(),
      accepted: { themes: {}, groups: {} },
      lastDecided: null,
      noProposal: {},
      done: null
    })
    // Another file over decisions not imported yet (N12): one click back to them.
    if (prev) toast(`Otwarto „${name}” – decyzje pliku „${prev.fileName}” nie zostały zaimportowane.`, 'info', 10000, { label: 'Cofnij', run: () => restore(prev) })
  } catch (e) {
    const error = e instanceof MbankFormatError ? e.message : `Nie udało się odczytać pliku: ${errorMessage(e)}`
    // A wrong file never closes the open one (N12): the error is shown beside it.
    if (before.file) useImport.setState({ error, errorName: name })
    else useImport.setState({ fileName: name, file: null, plan: null, error, errorName: name, done: null })
  }
}

/** A file dropped on the panel (B94): within the limit of a chosen one, read here – a folder or a file gone is said. */
export async function dropImportFile(f: File): Promise<void> {
  if (useImport.getState().busy) {
    toast('Trwa import – poczekaj, aż się skończy.', 'info', 4000)
    return
  }
  if (f.size > IMPORT_MAX_BYTES) {
    toast(`„${f.name}” ma ${Math.round(f.size / 1024 / 1024)} MB – to nie wygląda na plik z mBanku (najwyżej ${IMPORT_MAX_BYTES / 1024 / 1024} MB).`, 'error', 7000)
    return
  }
  try {
    await loadImportFile(f.name, new Uint8Array(await f.arrayBuffer()))
  } catch (e) {
    toast(`Nie udało się odczytać pliku „${f.name}”: ${errorMessage(e)}`, 'error', 7000)
  }
}

export async function pickImportFile(): Promise<void> {
  try {
    const picked = await api.pickImportFile()
    if (picked) await loadImportFile(picked.name, picked.bytes, picked.ref ?? null)
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

/**
 * Plan again when what the plan read is not what it was made with (a keyword added, names merged, a member added, the
 * holder's names, a category, a container, a loan, the operations – B38; here, in the settings, on another computer).
 */
export function replanIfChanged(inputs: PlanInputs | null): void {
  const { plan, planInputs, busy } = useImport.getState()
  // The import writing its own records: planned once more by it (and after it, when the file stays open).
  if (!plan || !inputs || !planInputs || busy) return
  const changed = (Object.keys(inputs) as Array<keyof PlanInputs>).filter((k) => inputs[k] !== planInputs[k])
  if (!changed.length) return
  // The settings' parts in new objects of the same content (W18: the settings saved here or on another computer, another
  // of their parts changed): nothing to plan again – the new objects kept, so the next look is by reference again.
  if (changed.every((k) => BY_CONTENT.has(k) && deepEqual(inputs[k], planInputs[k]))) {
    useImport.setState({ planInputs: inputs })
    return
  }
  replanImport()
}

/** What a plan reads from the settings (small, compared by content); the records' maps change only with their content. */
const BY_CONTENT: ReadonlySet<keyof PlanInputs> = new Set(['rules', 'aliases', 'members', 'ownNames', 'categories', 'accountNumbers'])

/**
 * The plan once more (the rules changed – a keyword added, a rule deleted – or the operations did): the decisions stay;
 * a group whose proposal changed (another key) keeps its decision under the group of the same brand and direction.
 */
export function replanImport(): void {
  const { file, accountId, deletedKeys, plan: old, choices, selected, accepted } = useImport.getState()
  if (!file || !old) return
  const plan = planNow(file, accountId, deletedKeys)
  if (!plan) return
  const before = groupsOf(old)
  const fresh = groupsOf(plan)
  const keys = new Set(fresh.map((g) => g.group))
  // A theme keeps its decision while no operation joined it from outside (B39): its groups still follow it. Else the
  // decision becomes its groups' own – themes are keyed by the proposal, so other groups may join a theme now and must
  // not take a decision the user never saw for them.
  const rowsOf = (gs: readonly ImportGroup[], theme: string) => gs.filter((g) => g.theme === theme).flatMap((g) => g.rows.map((p) => p.key))
  const kept = new Set<string>()
  for (const theme of Object.keys(choices.themes)) {
    const was = new Set(rowsOf(before, theme))
    const now = rowsOf(fresh, theme)
    if (now.length && now.every((k) => was.has(k))) kept.add(theme)
  }
  const groups: Record<string, Choice> = {}
  const remember: Record<string, boolean> = {}
  const weak = new Set<string>()
  for (const g of before) {
    const own = choices.groups[g.group]
    // A group of a kept theme follows it still – unless it left it (another key): its operations carry the decision.
    const c = own ?? (kept.has(g.theme) && keys.has(g.group) ? undefined : choices.themes[g.theme])
    if (!c) continue
    groups[g.group] = c
    remember[g.group] = own ? (choices.remember[g.group] ?? true) : (choices.rememberThemes[g.theme] ?? true)
    if (own ? accepted.groups[g.group] : accepted.themes[g.theme]) weak.add(g.group)
  }
  // A group whose proposal changed (another key) passes the user's decision on by its operations: a new group whose
  // every operation had the same decision takes it as its own, the others row by row; an accepted offer gives way to
  // the new proposal. The ticks follow the operations the same way.
  const rows = { ...choices.rows }
  // A new member's money decided by the app (N85) stays so in its new group: the question is not answered by a replan.
  const implicit: Record<string, true> = {}
  for (const g of before) if (choices.implicit?.[g.group] && keys.has(g.group)) implicit[g.group] = true
  const carried = new Map<string, { c: Choice; remember: boolean; implicit: boolean }>()
  const tickedRows = { ...selected.rows }
  const fromGroups = new Set<string>()
  for (const g of before) {
    if (keys.has(g.group)) continue
    const c = groups[g.group]
    const app = !!choices.implicit?.[g.group] && !!choices.groups[g.group]
    if (c && !weak.has(g.group)) for (const p of g.rows) carried.set(p.key, { c, remember: remember[g.group]!, implicit: app })
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
      if (got.some((x) => x!.implicit)) implicit[n.group] = true
    } else
      n.rows.forEach((p, i) => {
        const x = got[i]
        // A row of the app's decision takes its new group's (no answer of the user's for it alone).
        if (x && !x.implicit && !rows[p.key]) rows[p.key] = x.c
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
  const keptOf = <T,>(m: Record<string, T>) => Object.fromEntries(Object.entries(m).filter(([t]) => kept.has(t)))
  const { lastDecided } = useImport.getState()
  useImport.setState({
    plan,
    choices: { ...choices, themes: keptOf(choices.themes), rememberThemes: keptOf(choices.rememberThemes), groups, remember, rows, implicit },
    selected: { groups: tickedGroups, rows: tickedRows },
    accepted: { themes: keptOf(accepted.themes), groups: stillWeak },
    lastDecided: lastDecided && keys.has(lastDecided) ? lastDecided : null
  })
}

/**
 * „Przenieś plik do Kosza” (F14): the file just imported – it holds the account's number and operations – moved to the
 * Recycle Bin (it may be taken back from there).
 */
export async function trashImportFile(): Promise<void> {
  const { fileRef, fileName } = useImport.getState()
  if (!fileRef) return
  try {
    const ok = await api.trashBankFile(fileRef)
    if (ok) useImport.setState({ fileRef: null })
    toast(ok ? `„${fileName}” przeniesiony do Kosza.` : `Nie ma już pliku „${fileName}” – nic nie przeniesiono.`, ok ? 'success' : 'info', 5000)
  } catch (e) {
    toast(`Nie udało się przenieść „${fileName}” do Kosza: ${errorMessage(e)}`, 'error', 7000)
  }
}

export function closeImport(): void {
  const before = useImport.getState()
  // An import being written (B93): the file stays until it is done.
  if (before.busy) return
  const prev = before.file && hasDecisions(before) ? snapshot(before) : null
  useImport.setState({ fileName: null, fileRef: null, file: null, error: null, errorName: null, plan: null, choices: emptyChoices(), query: '', selected: noSelection(), accepted: { themes: {}, groups: {} }, lastDecided: null, noProposal: {}, done: null })
  // Decisions not imported (N12): back in one click.
  if (prev) toast(`Zamknięto „${prev.fileName}” bez importu.`, 'info', 10000, { label: 'Cofnij', run: () => restore(prev) })
}

function patchChoices(fn: (c: ImportChoices) => ImportChoices): void {
  useImport.setState((s) => ({ choices: fn(s.choices) }))
}

/**
 * A decision for a whole group: the user's own is remembered as a rule by default (they can untick it); `remember`
 * false = not by default (the bank's hints taken in one click are no decision of the user – D68).
 */
export function chooseGroup(group: string, choice: Choice, remember?: boolean): void {
  // The user's own choice after an accepted hint (B97): remembered by default, as any of theirs.
  const wasHint = !!useImport.getState().accepted.groups[group]
  patchChoices((c) => {
    const implicit = { ...c.implicit }
    delete implicit[group]
    return { ...c, groups: { ...c.groups, [group]: choice }, remember: { ...c.remember, [group]: remember ?? (wasHint ? true : (c.remember[group] ?? true)) }, implicit }
  })
  unaccept('groups', group)
}

/**
 * A new household member's group (N85, „+ domownik”): their money – the user's decision, a rule of the sender as any –,
 * the rest beyond their debt as income for now: no answer („zaliczka czy przychód?” still asked, never remembered for
 * the person until answered).
 */
export function decideNewMember(group: string, choice: Choice): void {
  patchChoices((c) => ({ ...c, groups: { ...c.groups, [group]: choice }, implicit: { ...c.implicit, [group]: true } }))
  unaccept('groups', group)
}

/**
 * The user's decision for one group on its own (not a bulk one): a keyword rule may be proposed for it (1.2.2, D78) –
 * a new decision opens the proposal again.
 */
export function decideGroup(group: string, choice: Choice): void {
  chooseGroup(group, choice)
  useImport.setState((s) => {
    const noProposal = { ...s.noProposal }
    delete noProposal[group]
    return { lastDecided: group, noProposal }
  })
}

export const closeProposal = (group: string) => useImport.setState((s) => ({ noProposal: { ...s.noProposal, [group]: true } }))

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
  // The user's own choice after an accepted hint (B97): remembered by default.
  const wasHint = !accepted && !!useImport.getState().accepted.themes[theme]
  patchChoices((c) => ({ ...c, themes: { ...c.themes, [theme]: choice }, rememberThemes: { ...c.rememberThemes, [theme]: remember ?? (wasHint ? true : (c.rememberThemes[theme] ?? true)) } }))
  if (accepted) useImport.setState((s) => ({ accepted: { ...s.accepted, themes: { ...s.accepted.themes, [theme]: true } } }))
  else unaccept('themes', theme)
}

/**
 * A decision for a theme whose brands were each decided the same (shown as the theme's): theirs give way – the theme
 * decides them all, as the screen shows.
 */
export function chooseThemeOverGroups(t: ImportTheme, choice: Choice): void {
  patchChoices((c) => {
    const groups = { ...c.groups }
    const remember = { ...c.remember }
    const implicit = { ...c.implicit }
    for (const g of t.groups) {
      delete groups[g.group]
      delete remember[g.group]
      delete implicit[g.group]
    }
    return { ...c, groups, remember, implicit }
  })
  useImport.setState((s) => {
    const groups = { ...s.accepted.groups }
    for (const g of t.groups) delete groups[g.group]
    return { accepted: { ...s.accepted, groups } }
  })
  chooseTheme(t.theme, choice)
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
export const setMoveHere = (key: string, on: boolean) => patchChoices((c) => ({ ...c, moveHere: { ...c.moveHere, [key]: on } }))
export const setRemoveCopy = (key: string, on: boolean) => patchChoices((c) => ({ ...c, removeCopies: { ...c.removeCopies, [key]: on } }))

// ------------------------------------------------------------------ search and selection (1.2.1)

export const setImportQuery = (query: string) => useImport.setState({ query })

/** Tick or untick groups and rows (a theme's tick = its groups). */
export function selectImport(target: { groups?: readonly string[]; rows?: readonly string[] }, on: boolean): void {
  useImport.setState((s) => {
    // A map not touched stays the same object (W17).
    const groups = target.groups?.length ? { ...s.selected.groups } : s.selected.groups
    const rows = target.rows?.length ? { ...s.selected.rows } : s.selected.rows
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
 * row's; where it does not fit the money (income for a purchase) nothing changes – nor where the group or the row is a
 * loan, PIT-38, XTB or a member's money and the decision another kind (AP-6, `bulkKeeps`: counted as not fitting,
 * `kept` of them). Returns how many took it, and not.
 */
export function chooseSelected(groups: readonly ImportGroup[], option: Option, categoryId: string | null, share: Share | null = null): { applied: number; unfit: number; kept: number } {
  const { selected, lastDecided, choices, accepted } = useImport.getState()
  const choice = choiceFor(option, { kind: 'expense', categoryId }, share)
  let applied = 0
  let unfit = 0
  let kept = 0
  // What a group shows now: its own decision, its theme's, else the proposal.
  const shown = (g: ImportGroup): Choice => choices.groups[g.group] ?? choices.themes[g.theme] ?? g.proposed
  const takes = (direction: ImportGroup['direction'], current: Choice): boolean => {
    if (!fits(option, direction)) return false
    if (!bulkKeeps(option, current)) return true
    kept++
    return false
  }
  // One state for all (W32): copies made once, not one per group – each copy and each listener for every group.
  const nextGroups = { ...choices.groups }
  const remember = { ...choices.remember }
  const implicit = { ...choices.implicit }
  const rows = { ...choices.rows }
  const acceptedGroups = { ...accepted.groups }
  const rowGroup = new Map(groups.flatMap((g) => g.rows.map((p) => [p.key, g] as const)))
  for (const g of groups) {
    if (!selected.groups[g.group]) continue
    if (takes(g.direction, shown(g))) {
      nextGroups[g.group] = choice
      remember[g.group] = true
      delete implicit[g.group]
      delete acceptedGroups[g.group]
      applied++
    } else unfit++
  }
  for (const key of Object.keys(selected.rows)) {
    const g = rowGroup.get(key)
    if (!g || selected.groups[g.group]) continue
    if (takes(g.direction, choices.rows[key] ?? shown(g))) {
      rows[key] = choice
      applied++
    } else unfit++
  }
  useImport.setState({
    choices: { ...choices, groups: nextGroups, remember, implicit, rows },
    accepted: { ...accepted, groups: acceptedGroups },
    // A bulk decision proposes no keyword (D78): the one proposed for a group decided apart closes when it changes.
    ...(lastDecided && selected.groups[lastDecided] ? { lastDecided: null } : {})
  })
  return { applied, unfit, kept }
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
  // A new member's money (N85): still the question „zaliczka czy przychód?”.
  if (t.groups.some((g) => c.implicit?.[g.group])) return 'todo'
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
  const { choices, accepted } = useImport.getState()
  // One state for all the themes (W32).
  const next = { ...choices.themes }
  const remember = { ...choices.rememberThemes }
  const acceptedThemes = { ...accepted.themes }
  let n = 0
  for (const t of themes) {
    if (t.basis.kind !== 'proposal' || themeStatus(t, choices) !== 'check') continue
    next[t.theme] = t.basis.choice
    remember[t.theme] = true
    acceptedThemes[t.theme] = true
    n++
  }
  if (n) useImport.setState({ choices: { ...choices, themes: next, rememberThemes: remember }, accepted: { ...accepted, themes: acceptedThemes } })
  return n
}

/** Themes of expenses the bank's category hints at, still without a decision. */
export const hintable = (themes: readonly ImportTheme[], c: ImportChoices) => themes.filter((t) => t.basis.kind === 'hint' && t.direction === 'out' && themeStatus(t, c) === 'todo')

/** „Przyjmij podpowiedzi mBanku”: the bank's category for the expense themes it hints at – no rules (D68). */
export function acceptHints(themes: readonly ImportTheme[]): number {
  const { choices, accepted } = useImport.getState()
  const todo = hintable(themes, choices)
  // One state for all the themes (W32).
  const next = { ...choices.themes }
  const remember = { ...choices.rememberThemes }
  const acceptedThemes = { ...accepted.themes }
  for (const t of todo)
    if (t.basis.kind === 'hint') {
      next[t.theme] = { kind: 'expense', categoryId: t.basis.categoryId, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null }
      remember[t.theme] = false
      acceptedThemes[t.theme] = true
    }
  if (todo.length) useImport.setState({ choices: { ...choices, themes: next, rememberThemes: remember }, accepted: { ...accepted, themes: acceptedThemes } })
  return todo.length
}

/** The members' parts of the open file as the import writes them (AF-27), with what each member owes with its purchases. */
export interface SharesView extends SharesSpread {
  owed: Map<string, number>
}

let sharesMemo: { plan: ImportPlan; choices: ImportChoices; ledger: HouseholdLedger | null; members: readonly HouseholdMember[]; view: SharesView } | null = null

/**
 * The parts of other members each row of the file carries (D81 – „w tym za X”, AF-27: a group's spread over its rows,
 * never beyond what they owe) and what each member owes once the file's purchases are in (`ledger` – the engine's now).
 * Once per plan, decisions, ledger and members.
 */
export function sharesView(plan: ImportPlan | null, choices: ImportChoices, ledger: HouseholdLedger | null, members: readonly HouseholdMember[]): SharesView | null {
  if (!plan) return null
  const m = sharesMemo
  if (m && m.plan === plan && m.choices === choices && m.ledger === ledger && m.members === members) return m.view
  const owed = owedWithFile(plan, choices, (id) => (ledger ? balanceOf(ledger, id) : { owed: 0, deposit: 0 }), members.map((x) => x.id))
  const view: SharesView = { ...rowShares(plan, choices, owed), owed }
  sharesMemo = { plan, choices, ledger, members, view }
  return view
}

const partsSum = (lines: readonly SharePart[]) => lines.reduce((a, x) => a + Math.max(0, x.amount), 0)

/**
 * The import's decision a „w tym za” is of (AF-27): its key (`g:<group>`, `t:<theme>`) – or the keys of a theme's groups
 * when the theme shows their common decision (N78: a change there replaces them all – `chooseThemeOverGroups`).
 */
export type DecisionKeys = string | readonly string[]
const keysOf = (from: DecisionKeys): readonly string[] => (typeof from === 'string' ? [from] : from)

/** What a theme's row shows (N78): its own decision, its groups' common one (each decided alike), theirs that differ, or none. */
export type ThemeShows = 'theme' | 'same' | 'mixed' | 'open'
export function themeShows(t: Pick<ImportTheme, 'theme' | 'groups'>, c: Pick<ImportChoices, 'themes' | 'groups'>): ThemeShows {
  if (c.themes[t.theme]) return 'theme'
  const own = t.groups.map((g) => c.groups[g.group])
  if (!own.every(Boolean)) return 'open'
  return own.every((x) => sameChoice(x!, own[0]!)) ? 'same' : 'mixed'
}

/** The decision a theme row's „w tym za” is of: its groups' when it shows their common one, else its own. */
export const themeSharesFrom = (t: Pick<ImportTheme, 'theme' | 'groups'>, shows: ThemeShows): DecisionKeys =>
  shows === 'same' ? t.groups.map((g) => `g:${g.group}`) : `t:${t.theme}`

/** What a member still owes back beyond their own money of the file and its parts given by others than `from` (the decision). */
export function owedLeftOfDecision(view: SharesView, from: DecisionKeys, memberId: string): number {
  let given = 0
  for (const k of keysOf(from)) for (const l of view.spread.get(k) ?? []) if (l.memberId === memberId) given += l.given.reduce((s, g) => s + g.amount, 0)
  return Math.max(0, (view.owed.get(memberId) ?? 0) - ((view.total.get(memberId) ?? 0) - given))
}

/**
 * A decision's „w tym za” lines spread over its rows (AF-27), by the line shown: of one decision as they are; of a
 * theme's groups (their common decision shown) added up line by line – the same lines in the same order (`sameChoice`;
 * lines of 0 zł aside), each group's amount typed for its own rows, so the typed ones add up too.
 */
export function decisionSpread(view: SharesView, from: DecisionKeys, choice: Pick<Choice, 'memberId' | 'shares'>): Map<number, SpreadLine> {
  const keys = keysOf(from)
  if (keys.length === 1) return new Map((view.spread.get(keys[0]!) ?? []).map((l) => [l.line, l]))
  // The shown lines with an amount (the sender's own never spreads), in order: a group's n-th such line is the n-th.
  const sender = choice.memberId ?? HOUSE_MEMBER_ID
  const shown = (choice.shares ?? []).flatMap((x, i) => (x.amount > 0 && x.memberId !== sender ? [i] : []))
  const out = new Map<number, SpreadLine>()
  for (const k of keys)
    (view.spread.get(k) ?? [])
      .filter((l) => l.typed > 0)
      .sort((a, b) => a.line - b.line)
      .forEach((l, n) => {
        const line = shown[n]
        if (line == null) return
        const sum = out.get(line)
        out.set(line, sum ? { ...sum, typed: sum.typed + l.typed, given: [...sum.given, ...l.given] } : { ...l, line, given: [...l.given] })
      })
  for (const l of out.values()) l.given.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return out
}

/** …beyond the parts of the other rows than `key`. */
export function owedLeftOfRow(view: SharesView, key: string, amount: number, memberId: string): number {
  let mine = 0
  let money = amount
  for (const x of view.parts.get(key) ?? []) {
    const v = Math.min(x.amount, money)
    money -= v
    if (x.memberId === memberId && (!x.inflowKind || x.inflowKind === 'repay')) mine += v
  }
  return Math.max(0, (view.owed.get(memberId) ?? 0) - ((view.total.get(memberId) ?? 0) - mine))
}

/**
 * Where a new „w tym za X” starts (D81 – „z kwotą tego, co X ma oddać”, AF-27): what X still owes back, at most the money
 * its rows have left beyond the other lines – of a group's or a theme's decision (`from`)…
 */
export const decisionStart = (view: SharesView, from: DecisionKeys, memberId: string, lines: readonly SharePart[]): number =>
  Math.max(0, Math.min(owedLeftOfDecision(view, from, memberId), keysOf(from).reduce((a, k) => a + (view.rows.get(k)?.sum ?? 0), 0) - partsSum(lines)))

/** …or of one row (`key`, its `amount`). */
export const rowStart = (view: SharesView, key: string, amount: number, memberId: string, lines: readonly SharePart[]): number =>
  Math.max(0, Math.min(owedLeftOfRow(view, key, amount, memberId), amount - partsSum(lines)))

/**
 * The household members' answers „zaliczka / przychód” of an import (N84): one per operation that comes in with the
 * user's own decision (its row's, its group's, its theme's) – not a proposal, not „+ domownik” alone (N85), not one left
 * out of the import.
 */
export function inflowVotes(groups: readonly ImportGroup[], c: ImportChoices): Array<{ kind: 'income'; memberId: string; advance: boolean }> {
  const out: Array<{ kind: 'income'; memberId: string; advance: boolean }> = []
  for (const g of groups)
    for (const p of g.rows) {
      if (c.skip[p.key]) continue
      const own = c.rows[p.key] ?? (c.groups[g.group] ? (c.implicit?.[g.group] ? undefined : c.groups[g.group]) : c.themes[g.theme])
      if (own && own.kind === 'income' && own.household) out.push({ kind: 'income', memberId: own.memberId ?? HOUSE_MEMBER_ID, advance: own.advance })
    }
  return out
}

/**
 * Import: everything saved first, the backup (spec: a backup before every import), the plan once more against the
 * operations now, the records, the rules learned, the holder's name remembered, the time of the import.
 */
/**
 * The balance the bank's file says, confirmed when the budget is the same at the end of its last day (F5): a confirmation
 * of that day – none when the account has no opening balance yet (the wizard sets it) or the day is confirmed so already.
 */
function confirmFromStatement(st: Statement): Balance | null {
  const s = useData.getState()
  const txs = listOf(s.records.transactions)
  const balances = listOf(s.records.balances)
  const opening = openingOf(st.accountId, balances)
  if (!opening || st.end.date < opening.date) return null
  const check = statementCheck(st, { transactions: txs, balances, tx: (id) => s.records.transactions[id]?.record })
  if (check.diff !== 0) return null
  if (balances.some((b) => b.kind === 'confirmation' && b.accountId === st.accountId && b.date === st.end.date && b.amount === st.end.balance)) return null
  const now = new Date().toISOString()
  const record = balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now, updatedAt: now, date: st.end.date, accountId: st.accountId, kind: 'confirmation', amount: st.end.balance, correctionId: null, note: 'Saldo z pliku banku (historia rachunku)' })
  addRecord('balances', record)
  return record
}

/**
 * The purchases the members' money of the file surely pays back (1.12.0, D91): named before it is written, with what
 * the import changes – a member's transfer finding its purchase in the same file too. None sure – it waits to be assigned.
 */
function withRepayments(result: ImportResult): ImportResult {
  const input = fleetInputNow()
  if (!input || !result.create.length) return result
  const changed = new Map([...result.update, ...result.create].map((t) => [t.id, t]))
  const gone = new Set(result.remove)
  const transactions = [...input.transactions.filter((t) => !gone.has(t.id) && !changed.has(t.id)), ...changed.values()]
  const links = linkRepayments({ ...input, transactions }, new Set(result.create.map((t) => t.id)), warsawNow().date)
  return links.size ? { ...result, create: result.create.map((t) => (links.has(t.id) ? { ...t, ...links.get(t.id)! } : t)) } : result
}

/**
 * The import's batch (F4 „Cofnij import”), written after its records: what it created, changed and deleted, its rules
 * and settings before and after it. Keeps the last ten. Returns its id.
 */
function writeBatch(
  f: Omit<BatchFacts, 'id' | 'savedAt' | 'machine' | 'after'> & { membersBefore: readonly HouseholdMember[]; importAfter: ImportSettings; membersAfter: readonly HouseholdMember[] }
): string | null {
  const inflowsBefore: Record<string, string> = {}
  const inflowsAfter: Record<string, string> = {}
  for (const m of f.membersAfter) {
    const was = f.membersBefore.find((x) => x.id === m.id)
    if (was && was.inflow !== m.inflow) {
      inflowsBefore[m.id] = was.inflow
      inflowsAfter[m.id] = m.inflow
    }
  }
  const imp = f.importAfter
  const batch = importBatch({
    ...f,
    id: newId(),
    savedAt: new Date().toISOString(),
    machine: null,
    before: { ...f.before, inflows: inflowsBefore },
    after: { lastImport: imp.lastImport[f.accountId] ?? null, coveredTo: imp.coveredTo[f.accountId] ?? null, accountNumber: imp.accountNumbers[f.accountId] ?? null, inflows: inflowsAfter }
  })
  addRecord('imports', batch)
  // The oldest beyond ten: no version kept in the history (only this list knows them).
  const drop = batchesToDrop(listOf(useData.getState().records.imports))
  if (drop.length) void deleteRecords('imports', drop, { reason: 'drop' })
  return batch.id
}

export async function runImport(): Promise<void> {
  const st = useImport.getState()
  if (!st.file || st.busy) return
  useImport.setState({ busy: true })
  try {
    const status = useData.getState().status
    if (status?.readOnly) throw new Error(`Folder jest tylko do odczytu${status.readOnlyReason ? ` (${status.readOnlyReason})` : ''} – import niemożliwy.`)
    // A shared purchase's percents not summing to 100 % (D83): said before anything is written.
    const choices = [...Object.values(st.choices.themes), ...Object.values(st.choices.groups), ...Object.values(st.choices.rows)]
    if (choices.some((c) => c.kind === 'expense' && c.share && !shareComplete(c.share, null))) throw new Error('Wspólny zakup: procenty osób muszą dać razem 100 % – popraw podział i importuj jeszcze raz.')
    await saveFirst('import')
    // The plan once more against what there is now – the operations deleted meanwhile too (B38) – with the decisions
    // carried over; another one than shown is shown first and imported on the next click.
    const shown = planSignature(useImport.getState().plan)
    useImport.setState(await deletedBankRows())
    replanImport()
    const cur = useImport.getState()
    const plan = cur.plan
    const s = useData.getState()
    if (!plan || !s.fi) throw new Error('Brak danych do importu.')
    if (planSignature(plan) !== shown) throw new Error('Operacje albo reguły zmieniły się w trakcie (Operacje, Ustawienia, drugi komputer) – sprawdź podgląd i kliknij „Importuj” jeszcze raz.')
    const now = new Date().toISOString()
    const acc = st.accountId
    const rulesBefore = s.fi.settings.import.rules
    // What each member owes with the file's purchases (AF-27): a group's „w tym za” never beyond it – as the preview showed.
    const owed = sharesView(plan, cur.choices, fleetNow()?.household ?? null, s.fi.settings.household.members)?.owed
    const result = withRepayments(buildImport(plan, cur.choices, { now, makeId: newId, rules: rulesBefore, accounts: s.fi.settings.accounts.map((a) => a.id), owed }))
    const txBefore = useData.getState().records.transactions
    // Nothing new (N13): no backup, no records – only the time of the import and what the file covers; the other
    // format's keys remembered only (AF-63) are nothing new either – written, but no backup and no import to take back.
    const changes = result.create.length + result.remove.length > 0 || result.update.some((t) => !keysOnly(txBefore[t.id]?.record, t)) || result.rules !== rulesBefore
    const backup = changes ? await api.importBackup() : ''
    // What the import changes, as it was (F4: its batch – „Cofnij import”).
    const updated = result.update.flatMap((t) => (txBefore[t.id] ? [{ before: txBefore[t.id]!.record, after: t as Transaction }] : []))
    const membersBefore = s.fi.settings.household.members
    const imp = s.fi.settings.import
    const number = accountNumberOf(st.file.account)
    const before: ImportBatchSettings = { lastImport: imp.lastImport[acc] ?? null, coveredTo: imp.coveredTo[acc] ?? null, accountNumber: imp.accountNumbers[acc] ?? null, inflows: {} }
    addRecords('transactions', result.create)
    replaceRecords('transactions', result.update as Transaction[])
    // One call for all (W1); a file the disk refused stays – said after the rest is done. Deleted as the import's own
    // (T331): its versions in the history are no deletion of the user's, whether its batch is kept or not.
    const removal = result.remove.length ? await deleteRecords('transactions', result.remove, { reason: 'import' }) : null
    const removed = (removal?.deleted ?? []).flatMap((id) => (txBefore[id] ? [txBefore[id]!.record] : []))
    const client = st.file.client
    const ownName = client && !imp.ownNames.some((n) => n.toLowerCase() === client.toLowerCase()) ? client : null
    const learned = result.rules.length - rulesBefore.length
    // What the file covers (B18): its period, else its latest row – never less than an earlier file did.
    const covered = plan.period?.to ?? plan.rows.reduce<string | null>((m, p) => (m == null || p.row.date > m ? p.row.date : m), null)
    // A hand-typed operation the user kept apart from its row (N88): the pair is no duplicate for the panel either.
    const createdKey = new Map(result.create.map((t) => [t.bank?.key ?? '', t.id]))
    const apart = plan.rows.flatMap((p) => (p.status === 'merge' && cur.choices.noMerge[p.key] === true && createdKey.has(p.key) ? [duplicateKey([p.tx.id, createdKey.get(p.key)!])] : []))
    // A row of an operation deleted in the other format brought back on purpose („importuj mimo to”, AF-1): never
    // reported as one that came back after its deletion.
    const restored = plan.rows.flatMap((p) => (p.status === 'deleted' && p.other && cur.choices.restoreDeleted[p.key] && createdKey.has(p.key) ? [returnedKey(createdKey.get(p.key)!)] : []))
    updateSettings((f) => ({
      ...f,
      settings: {
        ...f.settings,
        import: {
          ...f.settings.import,
          rules: result.rules,
          ownNames: ownName && !f.settings.import.ownNames.includes(ownName) ? [...f.settings.import.ownNames, ownName] : f.settings.import.ownNames,
          lastImport: { ...f.settings.import.lastImport, [acc]: now },
          coveredTo: covered && covered > (f.settings.import.coveredTo[acc] ?? '') ? { ...f.settings.import.coveredTo, [acc]: covered } : f.settings.import.coveredTo,
          // The account's number (F4): a file of another account is said before its import.
          accountNumbers: number && f.settings.import.accountNumbers[acc] !== number ? { ...f.settings.import.accountNumbers, [acc]: number } : f.settings.import.accountNumbers,
          // The imports' times (the mission „Łączność z bazą”, E7): the last 100.
          log: Object.fromEntries(
            Object.entries({ ...f.settings.import.log, [now]: acc })
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-100)
          ),
          notDuplicates: apart.length + restored.length ? { ...f.settings.import.notDuplicates, ...Object.fromEntries([...apart, ...restored].map((k) => [k, now])) } : f.settings.import.notDuplicates
        }
      }
    }))
    // Run with the deleted ones just read: nothing came back with it – no reading of the history at the next opening (T332).
    checkedWithImport(now)
    // A household member's money the user decided here (zaliczka / przychód): asked once, remembered for them (D80 b) –
    // one answer per operation (N84).
    rememberInflows(inflowVotes(groupsOf(plan, cur.choices.restoreDeleted), cur.choices))
    // What the import set, read at once (a change from elsewhere during the saves below is not the import's – F4).
    const fiAfter = useData.getState().fi!
    const importAfter = fiAfter.settings.import
    const membersAfter = fiAfter.settings.household.members
    const note = await unsavedNote()
    // The bank's balances (F5): the budget the same at the end of the file = the balance confirmed by itself.
    const createdByKey = new Map(result.create.map((t) => [t.bank?.key ?? '', t.id]))
    const rowByKey = new Map(plan.rows.map((p) => [p.key, p]))
    const statement = statementOf(plan.rows, acc, (key) => {
      const p = rowByKey.get(key)
      if (!p) return null
      if (p.status === 'known' || p.status === 'settle' || p.status === 'elsewhere' || (p.status === 'merge' && joins(p, cur.choices))) return p.tx.id
      return createdByKey.get(key) ?? null
    })
    const confirmation = statement ? confirmFromStatement(statement) : null
    // Its batch even when the folder did not take the saves yet (they are retried): the stack of imports stays whole.
    const batchId =
      changes || confirmation
        ? writeBatch({ at: now, accountId: acc, fileName: st.fileName ?? '', period: plan.period, counts: result.counts, created: result.create, updated, removed, rulesBefore, rulesAfter: result.rules, before, membersBefore, importAfter, membersAfter, ownName, confirmations: confirmation ? [confirmation.id] : [] })
        : null
    if (batchId) await flushSaves()
    // The import is done in memory (its records, rules and batch): the folder taking the saves later is said, the file
    // closed with its result all the same (B95 – never a second import of the same rows with no decisions left).
    if (note) toast(`Import: ${note}.`, 'error', 10000)
    if (removal?.error) toast(`Nie udało się usunąć części operacji (nierozliczonych, których bank już nie pokazuje, albo kopii z innego konta): ${removal.error}`, 'error', 10000)
    useImport.setState({
      done: { counts: result.counts, backup, accountId: acc, rules: learned, batchId, statement, confirmed: confirmation?.date ?? null },
      file: null,
      plan: null,
      choices: emptyChoices(),
      query: '',
      selected: noSelection(),
      accepted: { themes: {}, groups: {} },
      lastDecided: null,
      noProposal: {}
    })
    toast(
      `Zaimportowano: ${countLabel(result.counts.created, 'nowa operacja', 'nowe operacje', 'nowych operacji')}; połączone z wpisami: ${result.counts.merged}, rozliczone: ${result.counts.settled}${result.counts.sides ? `, drugie strony przelewów: ${result.counts.sides}` : ''}.`,
      'success',
      6000
    )
  } catch (e) {
    toast(errorMessage(e), 'error', 8000)
  } finally {
    useImport.setState({ busy: false })
    // The file still open (the import stopped): planned against what was written meanwhile.
    replanIfChanged(planInputsNow())
  }
}

/**
 * Another folder opened (B101): the open file's plan, decisions and deleted rows were the old folder's – the session goes
 * (an import being written finishes on its own).
 */
useData.subscribe((s, prev) => {
  if (!prev.status || !s.status || s.status.dataDir === prev.status.dataDir || useImport.getState().busy) return
  useImport.setState({
    fileName: null,
    file: null,
    error: null,
    errorName: null,
    accountId: '',
    deletedKeys: new Set(),
    deletedRows: [],
    plan: null,
    choices: emptyChoices(),
    query: '',
    selected: noSelection(),
    planInputs: null,
    accepted: { themes: {}, groups: {} },
    lastDecided: null,
    noProposal: {},
    done: null
  })
})
