/**
 * „Meldunki do rozpatrzenia” (F6, D86): one inbox of what waits for the captain's decision – the deliveries from XTB to
 * dock, the data folder's conflicts and files with errors, the expenses without a category, the possible duplicates, the
 * refunds still owed, the balances unconfirmed for over 30 days, the loot undecided. Pure; no notifications of its own –
 * the side menu counts the reports, the inbox lists them.
 */
import { formatPln, plural } from '../format'
import { isUncategorized, uncategorizedAmount } from '../operationsView'
import type { Container, Transaction } from '../schema/records'
import { daysBetween } from './dates'
import { deliveryItem, dm, type AccountConfirmation } from './briefing'
import type { Delivery } from './dock'
import { isOpeningItem, type MemberBalance } from './household'
import type { TransferIssue } from './transfers'
import { deadText, priceText, type DeadContainer, type PriceChange } from './cargoWatch'
import { anomalyText, type Anomaly } from './anomalies'
import { lateReturnText, type AwaitedReturn } from './returns'

export type InboxKind = 'dock' | 'loot' | 'folder' | 'uncategorized' | 'duplicates' | 'transfers' | 'corrections' | 'anomalies' | 'repayments' | 'refunds' | 'returns' | 'cargo' | 'balances'

/** The inbox's sections in their order: a deadline first, the data's health, then what can wait a day. */
export const INBOX_KINDS: readonly InboxKind[] = ['dock', 'loot', 'folder', 'uncategorized', 'duplicates', 'transfers', 'corrections', 'anomalies', 'repayments', 'refunds', 'returns', 'cargo', 'balances']

export const INBOX_TITLE: Record<InboxKind, string> = {
  dock: 'Dokowanie',
  loot: 'Łupy',
  folder: 'Folder danych',
  uncategorized: 'Bez kategorii',
  duplicates: 'Możliwe duplikaty',
  transfers: 'Przelewy między kontami',
  corrections: 'Podwójne korekty',
  anomalies: 'Nieznane sygnały',
  repayments: 'Zwroty do przypisania',
  refunds: 'Do zwrotu',
  returns: 'Zwroty w drodze',
  cargo: 'Ładownia',
  balances: 'Salda kont'
}

/** A report: one line of the inbox, one in the menu's counter. */
export interface InboxItem {
  kind: InboxKind
  /** Unique in the inbox. */
  key: string
  text: string
  /** Its button. */
  action: string
  /**
   * The delivery's key ('dock'), the member's id ('refunds'), the account's id ('balances'), the operation's
   * ('corrections', the member's money waiting to be assigned – 'repayments'); a transfer's report – its key (`transferKey`, none for all the pairs together).
   */
  ref?: string
}

/** A balance not confirmed for longer is a report (D86). */
export const INBOX_BALANCE_DAYS = 30

/** The expenses without a category (the operations' mark „bez kategorii”) from `from` on, drafts aside. */
export interface Uncategorized {
  count: number
  /** Their cost (a return of goods takes off). */
  amount: number
  from: string | null
}

export function uncategorizedOf(transactions: readonly Transaction[], from: string | null, drafts: Readonly<Record<string, unknown>> = {}): Uncategorized {
  let count = 0
  let amount = 0
  for (const t of transactions) {
    if (!isUncategorized(t) || (from && t.date < from) || drafts[t.id]) continue
    count++
    // A receipt's lines without a category only (N50): its other lines have theirs.
    amount -= uncategorizedAmount(t)
  }
  return { count, amount, from }
}

export interface InboxInput {
  today: string
  /** The budget started: before it only the data folder reports. */
  started: boolean
  deliveries: readonly Delivery[]
  conflicts: number
  problems: number
  uncategorized: Uncategorized
  duplicates: number
  members: readonly MemberBalance[]
  memberName: (id: string) => string
  /** Each account's last confirmed balance, and its opening balance's day (an account without either keeps no balance). */
  confirmations: ReadonlyArray<AccountConfirmation & { opened: string | null }>
  loot: { month: string | null; amount: number }
  /** A balance confirmed twice on two computers (B129 – `doubleCorrections`): the later correction of each pair. */
  corrections?: ReadonlyArray<{ later: Pick<Transaction, 'id' | 'date' | 'amount' | 'accountId'>; earlier: Pick<Transaction, 'date' | 'updatedBy'> }>
  accountName?: (id: string) => string
  money?: (grosze: number) => string
  /** Transfers of before 1.7.0 (F10, `calc/transfers.ts`) with the key each is said „zostaw tak” under. */
  transfers?: ReadonlyArray<{ issue: TransferIssue; key: string }>
  /** The radar of anomalies (F31): unusual expenses, a possible double charge – until said „w porządku”. */
  anomalies?: readonly Anomaly[]
  /** The purchases awaiting a return (F34): a late one is a report. */
  returns?: readonly AwaitedReturn[]
  /** The cargo hold's watch (F9): containers at a new price, containers gone quiet. */
  cargo?: { prices: readonly PriceChange[]; dead: readonly DeadContainer[]; containers: ReadonlyArray<Pick<Container, 'id' | 'cycleMonths' | 'schedule'>> }
}

const dmy = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`
const zlotych = (g: number) => `${formatPln(g)} zł`

export function inboxItems(o: InboxInput): InboxItem[] {
  const zl = o.money ?? zlotych
  const out: InboxItem[] = []
  if (o.started)
    for (const d of o.deliveries) {
      if (d.state !== 'pending') continue
      const line = deliveryItem(d, o.today, zl)
      if (line) out.push({ kind: 'dock', key: `dock:${d.key}`, ref: d.key, text: line.text, action: 'Zadokuj' })
    }
  if (o.started && o.loot.month && o.loot.amount > 0)
    out.push({ kind: 'loot', key: `loot:${o.loot.month}`, text: `Łupy z poprzedniego miesiąca: ${zl(o.loot.amount)} – podział do 7. dnia, potem trafią do osłon.`, action: 'Plan miesiąca' })
  if (o.conflicts || o.problems) {
    const parts = [
      o.conflicts ? `${o.conflicts} ${plural(o.conflicts, 'konflikt kopii', 'konflikty kopii', 'konfliktów kopii')}` : '',
      o.problems ? `${o.problems} ${plural(o.problems, 'plik z błędem', 'pliki z błędem', 'plików z błędem')}` : ''
    ].filter(Boolean)
    out.push({ kind: 'folder', key: 'folder', text: `${parts.join(', ')} – do rozstrzygnięcia w Synchronizacji.`, action: 'Synchronizacja' })
  }
  if (!o.started) return out
  const u = o.uncategorized
  if (u.count)
    out.push({
      kind: 'uncategorized',
      key: 'uncategorized',
      text: `${u.count} ${plural(u.count, 'wydatek', 'wydatki', 'wydatków')} bez kategorii${u.from ? ` od ${dmy(u.from)}` : ''} – razem ${zl(u.amount)}.`,
      action: 'Pokaż w Operacjach'
    })
  if (o.duplicates)
    out.push({ kind: 'duplicates', key: 'duplicates', text: `${o.duplicates} ${plural(o.duplicates, 'możliwy duplikat', 'możliwe duplikaty', 'możliwych duplikatów')} – ta sama operacja dwa razy.`, action: 'Scal na ekranie Import' })
  // Transfers of before 1.7.0 (F10): the pairs together – joining them changes no balance –, each of the others apart.
  const transfers = o.transfers ?? []
  const pairs = transfers.filter((x) => x.issue.kind === 'pair').length
  const name = (id: string | null) => (id ? (o.accountName?.(id) ?? 'konto') : 'konto spoza budżetu')
  if (pairs)
    out.push({
      kind: 'transfers',
      key: 'transfers:pairs',
      text: `${pairs} ${plural(pairs, 'przelew', 'przelewy', 'przelewów')} między kontami ${pairs === 1 ? 'zapisany' : 'zapisane'} jako dwie osobne operacje (sprzed 1.7.0) – połączenie w jedną operację nie zmienia żadnego salda.`,
      // The list of the pairs first (the S review): a pair by the amount and the day only is checked.
      action: 'Połącz…'
    })
  for (const { issue, key } of transfers) {
    if (issue.kind === 'double') {
      const t = issue.keep
      out.push({
        kind: 'transfers',
        key: `transfers:${key}`,
        ref: key,
        text: `${name(t.accountId)} → ${name(t.counterAccountId)} ${dm(t.date)}, ${zl(Math.abs(t.amount))}: strona konta ${name(t.counterAccountId)} zapisana też osobno (${dm(issue.drop.date)}) – liczy się dwa razy.`,
        action: 'Połącz'
      })
    } else if (issue.kind === 'lone') {
      const t = issue.tx
      const [from, to] = t.amount < 0 ? [t.accountId, t.counterAccountId] : [t.counterAccountId, t.accountId]
      out.push({
        kind: 'transfers',
        key: `transfers:${key}`,
        ref: key,
        text: `${name(from)} → ${name(to)} ${dm(t.date)}, ${zl(Math.abs(t.amount))}: zapisany tylko na koncie ${name(t.accountId)} – saldo konta ${name(t.counterAccountId)} go nie ma.`,
        action: 'Dopisz drugą stronę'
      })
    }
  }
  for (const c of o.corrections ?? [])
    out.push({
      kind: 'corrections',
      key: `corrections:${c.later.id}`,
      ref: c.later.id,
      text: `${o.accountName?.(c.later.accountId) ?? 'Konto'}: korekta salda ${zl(c.later.amount)} z ${dm(c.later.date)} wygląda na powtórzoną – taka sama z ${dm(c.earlier.date)}${c.earlier.updatedBy ? ` (${c.earlier.updatedBy})` : ''}; saldo potwierdzone dwa razy, zanim OneDrive przyniósł pierwszą.`,
      action: 'Pokaż korektę'
    })
  // The radar of anomalies (F31): each until „w porządku” – its operation to look at (a category: its month in Operacje).
  for (const a of o.anomalies ?? []) out.push({ kind: 'anomalies', key: `anomalies:${a.key}`, ref: a.key, text: anomalyText(a, zl), action: a.txIds.length ? 'Pokaż operację' : 'Pokaż w Operacjach' })
  // A member's money repaid but not assigned to a purchase (D91): which purchases it pays back – its operation's editor.
  for (const m of o.members)
    for (const u of m.unassigned)
      out.push({
        kind: 'repayments',
        key: `repayments:${u.txId}:${m.memberId}`,
        ref: u.txId,
        text: `${o.memberName(m.memberId)}: zwrot ${zl(u.amount)} z ${dm(u.date)} – wskaż, które zakupy spłaca${m.open.length ? ` (do oddania: ${m.open.length} ${plural(m.open.length, 'zakup', 'zakupy', 'zakupów')})` : ''}.`,
        action: 'Przypisz'
      })
  for (const m of o.members) {
    if (m.owed <= 0) continue
    const days = m.since ? Math.max(0, daysBetween(m.since, o.today)) : null
    // The oldest still owed: a purchase, or the balance at the settlements' start (D81).
    const oldest = m.open[0] && isOpeningItem(m.open[0].txId) ? 'saldo na start rozliczeń' : 'najstarszy zakup'
    const since = m.since && days != null ? ` – ${oldest} z ${dm(m.since)} (${days} ${plural(days, 'dzień', 'dni', 'dni')})` : ''
    out.push({ kind: 'refunds', key: `refunds:${m.memberId}`, ref: m.memberId, text: `${o.memberName(m.memberId)}: do oddania ${zl(m.owed)}${since}.`, action: 'Pokaż zakupy' })
  }
  // A return not come by its day (F34): its purchase – the money came another way, or it will not.
  for (const r of o.returns ?? []) if (r.state === 'late') out.push({ kind: 'returns', key: `returns:${r.tx.id}`, ref: r.tx.id, text: lateReturnText(r, zl), action: 'Pokaż zakup' })
  // The cargo hold's watch (F9): a new price to take or refuse, a container to drop or keep.
  for (const p of o.cargo?.prices ?? []) {
    const c = o.cargo!.containers.find((x) => x.id === p.containerId)
    if (c) out.push({ kind: 'cargo', key: p.key, ref: p.containerId, text: `${p.to > p.from ? 'Cięższy' : 'Lżejszy'} niż w manifeście – ${priceText(p, c, zl)}.`, action: 'Zaktualizuj w Ładowni' })
  }
  for (const d of o.cargo?.dead ?? []) out.push({ kind: 'cargo', key: d.key, ref: d.containerId, text: deadText(d), action: 'Pokaż w Ładowni' })
  for (const a of o.confirmations) {
    const since = a.last ?? a.opened
    if (!since) continue
    const days = daysBetween(since, o.today)
    if (days <= INBOX_BALANCE_DAYS) continue
    out.push({
      kind: 'balances',
      key: `balances:${a.accountId}`,
      ref: a.accountId,
      text: a.last ? `${a.name}: saldo potwierdzone ${days} dni temu – sprawdź z bankiem.` : `${a.name}: saldo bez potwierdzenia od salda otwarcia z ${dmy(since)} (${days} dni) – sprawdź z bankiem.`,
      action: 'Potwierdź saldo'
    })
  }
  return out
}
