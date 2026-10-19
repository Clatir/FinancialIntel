/**
 * „Meldunki do rozpatrzenia” (F6): the inbox's reports now (`shared/calc/inbox.ts`) – the side menu's counter and the
 * inbox screen see the same list; where each report's button leads.
 */
import { useMemo } from 'react'
import { doubleCorrections, openingOf } from '@shared/calc/balances'
import { confirmationsOf } from '@shared/calc/briefing'
import { memberName } from '@shared/calc/household'
import { inboxItems, uncategorizedOf, type InboxItem } from '@shared/calc/inbox'
import { noNarrowing } from '@shared/operationsView'
import { listOf, updateSettings, useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { focusRecord, navigate } from '../../store/ui'
import { useCargoWatch } from '../cargo/status'
import { openSensor } from '../sensors/open'
import { useAnomalies, useReturns } from '../sensors/state'
import { openDocking, useDeliveries } from '../dock/state'
import { useKnownDuplicateCount } from '../import/DuplicatesPanel'
import { openOperation, openRefundables, showFilter } from '../operations/state'
import { addOtherSide, joinTransfers, transferIssuesNow, transferIssuesOf, transferKey } from '../operations/transfers'

/** The inbox counts the duplicates a while after the last change (0,6 s at 150 tys. operacji – never while typing). */
export const DUPLICATES_AFTER_MS = 3000

const NO_MONEY = () => ''

/**
 * The reports now; `duplicates` – counted by the caller (the inbox counts them, the side menu takes the last count – W4);
 * `money` formats their amounts (the hidden amounts mask them – formatted at each render, T55).
 */
export function useInbox(duplicates: number, money: (grosze: number) => string = NO_MONEY): InboxItem[] {
  const fleet = useFleet()
  const deliveries = useDeliveries()
  const conflicts = useData((s) => s.conflicts.length)
  const problems = useData((s) => s.problems.filter((p) => p.kind !== 'unknown-file').length)
  const transactions = useData((s) => s.records.transactions)
  const balances = useData((s) => s.records.balances)
  const drafts = useData((s) => s.drafts)
  const accounts = useData((s) => s.fi?.settings.accounts)
  const members = useData((s) => s.fi?.settings.household.members)
  const from = fleet?.started ? fleet.start : null
  const uncategorized = useMemo(() => uncategorizedOf(listOf(transactions), from, drafts), [transactions, from, drafts])
  // A balance confirmed twice on two computers before the sync (B129) – not the pairs said to be two corrections.
  const dismissed = useData((s) => s.fi?.settings.import.notDuplicates)
  const corrections = useMemo(() => doubleCorrections(listOf(transactions)).filter((c) => !dismissed?.[correctionKey(c.later.id)]), [transactions, dismissed])
  // Transfers of before 1.7.0 (F10): two sides of one move, a side twice, a side missing – not a side twice a
  // confirmation's correction made up for (the operation's editor still offers joining it, asking first – F12).
  const transfers = useMemo(
    () =>
      transferIssuesOf(listOf(transactions), useData.getState())
        .filter((issue) => !(issue.kind === 'double' && issue.settled))
        .map((issue) => ({ issue, key: transferKey(issue) })),
    [transactions, balances, accounts, dismissed]
  )
  const confirmations = useMemo(() => {
    const list = listOf(balances)
    return accounts ? confirmationsOf(accounts, list).map((c) => ({ ...c, opened: openingOf(c.accountId, list)?.date ?? null })) : []
  }, [accounts, balances])
  // The sensors (F31, F34): unknown signals, returns late.
  const anomalies = useAnomalies()
  const returns = useReturns()
  // The cargo hold's watch (F9): a new price, a container gone quiet.
  const watch = useCargoWatch()
  const containers = useData((s) => s.records.containers)
  const cargo = useMemo(() => ({ prices: watch.prices, dead: watch.dead, containers: listOf(containers) }), [watch, containers])
  if (!fleet) return []
  return inboxItems({
    today: fleet.today,
    started: fleet.started,
    deliveries,
    conflicts,
    problems,
    uncategorized,
    duplicates,
    members: fleet.receivables.members,
    memberName: (id) => memberName(id, members),
    confirmations,
    loot: fleet.loot,
    corrections,
    transfers,
    accountName: (id) => accounts?.find((a) => a.id === id)?.name ?? 'Konto',
    money,
    cargo,
    anomalies,
    returns
  })
}

/** A transfer's report (F10) as it is now – the list may have changed since it was shown. */
export function transferIssueOf(item: InboxItem): ReturnType<typeof transferIssuesNow>[number] | null {
  return item.ref ? (transferIssuesNow().find((i) => transferKey(i) === item.ref) ?? null) : null
}

/** The key of a correction said to be no repeat (B129) – in the list of the import's „no duplicates”. */
const correctionKey = (id: string) => `correction:${id}`

/** „To nie powtórzenie”: the two corrections are both real – the report goes for good. */
export function dismissCorrection(id: string): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, import: { ...f.settings.import, notDuplicates: { ...f.settings.import.notDuplicates, [correctionKey(id)]: new Date().toISOString() } } } }))
}

/** How many reports wait (the side menu: the duplicates as last counted). */
export function useInboxCount(): number {
  const duplicates = useKnownDuplicateCount()
  return useInbox(duplicates).length
}

/** A report's button: the docking window, Operacje with the filter set, or the screen deciding it. */
export function openInboxItem(item: InboxItem, from: string | null): void {
  if (item.kind === 'dock' && item.ref) openDocking(item.ref)
  else if (item.kind === 'loot') navigate({ page: 'month' })
  else if (item.kind === 'folder') navigate({ page: 'sync' })
  else if (item.kind === 'uncategorized') {
    showFilter({ period: from ? { kind: 'range', from, to: null } : { kind: 'all' }, ...noNarrowing(), marks: ['uncategorized'] })
    navigate({ page: 'operations' })
  } else if (item.kind === 'duplicates') navigate({ page: 'import' })
  else if (item.kind === 'refunds') openRefundables()
  else if (item.kind === 'balances') navigate({ page: 'settings', tab: 'accounts' })
  else if (item.kind === 'transfers') {
    // One report (the pairs together – the inbox's list of them first).
    const issue = transferIssueOf(item)
    if (issue?.kind === 'lone') addOtherSide(issue.tx)
    else if (issue) void joinTransfers([issue])
  } else if (item.kind === 'cargo' && item.ref) focusRecord('container', item.ref, { page: 'cargo' })
  else if (item.kind === 'anomalies' && item.ref) openSensor(item.ref)
  else if (item.kind === 'returns' && item.ref) openSensor(`return:${item.ref}`)
  else if (item.kind === 'corrections' && item.ref) {
    const t = useData.getState().records.transactions[item.ref]?.record
    if (t) openOperation(t)
    else navigate({ page: 'operations' })
  }
}
