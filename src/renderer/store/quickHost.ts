/**
 * The main window's side of the quick entry (main/quick.ts): it answers the quick window with the data it shows
 * (categories, accounts, today's energy, the officer's hints) and saves the operations typed there – the main window
 * owns the data folder's records.
 */
import type { QuickData, QuickResult } from '@shared/api'
import { quickTemplates } from '@shared/calc/quick'
import { daysInMonth, warsawNow } from '@shared/calc/dates'
import { categoryIndex } from '@shared/calc/operations'
import { newId } from '@shared/ids'
import { shareSplits } from '@shared/calc/share'
import { envelopeKind, inflowOf, SCHEMA_VERSION, shareSchema, transactionSchema, ulidSchema, type Share, type Transaction } from '@shared/schema'
import { rememberInflows } from '../features/household/actions'
import { api } from '../lib/api'
import { playSound } from '../lib/sounds'
import { addRecord, listOf, useData } from './data'
import { officerNow } from './officer'
import { fleetNow } from './fleet'
import { useMachine } from './machine'
import { toast } from './ui'

const ACCOUNT_KEY = 'fi.operations.account'

function lastAccount(): string | null {
  try {
    return localStorage.getItem(ACCOUNT_KEY)
  } catch {
    return null
  }
}

export function quickData(): QuickData | null {
  const s = useData.getState()
  const fi = s.fi
  if (!fi || s.phase !== 'ready') return null
  const cats = categoryIndex(fi.settings.categories)
  const categories = fi.settings.categories
    .filter((c) => !c.archived)
    .map((c) => {
      const main = cats.mainOf(c.id)
      return { id: c.id, label: cats.label(c.id), mainId: main?.id ?? c.id, envelope: main ? envelopeKind(main) : null }
    })
  const accounts = fi.settings.accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }))
  const fleet = fleetNow()
  const { lastByBrand, counterparties } = officerNow()
  const last = lastAccount()
  return {
    categories,
    accounts,
    accountId: accounts.find((a) => a.id === last)?.id ?? accounts[0]?.id ?? '',
    energyLeft: fleet?.daily ? fleet.daily.left : null,
    envelopesLeft: Object.fromEntries((fleet?.envelopes ?? []).map((e) => [e.categoryId, e.left])),
    daily: fleet?.daily ? { today: fleet.today, limit: fleet.daily.limit, spentBefore: fleet.daily.spentBefore, spentToday: fleet.daily.spentToday, days: daysInMonth(fleet.month) } : null,
    quietHours: fi.settings.orders.quietHours,
    impulseThreshold: fi.settings.orders.impulseThreshold,
    lastByBrand,
    counterparties,
    rules: fi.settings.import.rules,
    aliases: fi.settings.import.aliases,
    members: fi.settings.household.members
      .filter((m) => !m.archived)
      .map((m) => {
        const b = fleet?.receivables.members.find((x) => x.memberId === m.id)
        return { id: m.id, name: m.name, owed: b?.owed ?? 0, deposit: b?.deposit ?? 0, inflow: inflowOf(m), via: m.via ?? null }
      }),
    hideAmounts: useMachine.getState().prefs.hideAmounts,
    readOnly: !!s.status?.readOnly,
    ...quickTemplates(listOf(s.records.transactions))
  }
}

/** What the quick window sends: an expense, an income or a purchase a household member finances, with its lines and the log. */
export interface QuickDraft {
  /** The operation's id, given in the quick window (B51): a draft that comes twice is saved once. */
  id?: string
  kind: 'expense' | 'income' | 'refundable'
  /** Grosze, > 0. */
  amount: number
  categoryId: string | null
  accountId: string
  date: string
  time: string | null
  counterparty: string
  note: string
  impulse: 'plan' | 'impulse' | null
  logNote: string
  /** A household member's money: repays what they owe first (D80). */
  household: boolean
  /** The household member (D80): who finances the purchase ('refundable'), whose money the income is (`household`). */
  memberId: string | null
  /** A household member's money: the rest beyond their debt is their advance (else income). */
  advance: boolean
  /** A purchase the member gives ('refundable', D83): nobody owes it. */
  gift?: boolean
  splits: Array<{ amount: number; categoryId: string | null; refundable: boolean; memberId?: string | null; gift?: boolean }>
  /** A purchase financed by several people (D83, „Wspólnie”): its lines made from it. */
  share?: Share | null
  /** A household member's money carrying others' (D81, „w tym za …”): their parts, the rest the sender's. */
  shares?: Array<{ memberId: string; amount: number; advance: boolean }>
}

/** The operation of a quick draft (or why not). */
export function quickTransaction(d: QuickDraft, now = new Date().toISOString()): Transaction | string {
  if (!Number.isInteger(d.amount) || d.amount <= 0) return 'Wpisz kwotę.'
  if (!d.accountId) return 'Wybierz konto.'
  const income = d.kind === 'income'
  const sign = income ? 1 : -1
  const household = income && d.household && !!d.memberId
  const shares = household ? (d.shares ?? []).filter((x) => x.amount > 0) : []
  if (shares.reduce((a, x) => a + x.amount, 0) > d.amount) return 'Części innych osób przekraczają kwotę wpłaty.'
  // A shared purchase (D83): a share the schema reads (a window of another version sends what it sends).
  const parsedShare = !income && d.share ? shareSchema.safeParse(d.share) : null
  const share = parsedShare?.success ? parsedShare.data : null
  const splits = income
    ? shares.map((x) => ({ id: newId(), amount: x.amount, categoryId: null, refundable: false, memberId: x.memberId, advance: x.advance, note: '' }))
    : share
      ? shareSplits({ amount: sign * d.amount, categoryId: d.categoryId }, share)
      : d.splits.length > 1
        ? d.splits.map((x) => ({
            id: newId(),
            amount: sign * Math.abs(x.amount),
            categoryId: x.categoryId,
            refundable: x.refundable,
            memberId: x.refundable ? (x.memberId ?? null) : null,
            advance: false,
            ...(x.refundable && x.gift ? { gift: true } : {}),
            note: ''
          }))
        : []
  const refundable = d.kind === 'refundable' && !splits.length
  const parsed = transactionSchema.safeParse({
    schemaVersion: SCHEMA_VERSION,
    id: ulidSchema.safeParse(d.id).success ? d.id : newId(),
    createdAt: now,
    updatedAt: now,
    date: d.date,
    time: d.time,
    accountId: d.accountId,
    kind: income ? 'income' : 'expense',
    amount: sign * d.amount,
    categoryId: income ? null : d.categoryId,
    refundable,
    // Who finances the purchase or whose money it is (D80); the ledger counts what it repays.
    memberId: refundable || household ? d.memberId : null,
    advance: household && d.advance,
    ...(refundable && d.gift ? { gift: true } : {}),
    ...(share ? { share } : {}),
    splits,
    counterparty: d.counterparty.trim(),
    note: d.note,
    impulse: income ? null : d.impulse,
    logNote: d.logNote
  })
  return parsed.success ? parsed.data : 'Nie udało się odczytać wpisu.'
}

let started = false

/** Listen to the quick window (once, in the main window). */
export function initQuickHost(): void {
  if (started) return
  started = true
  api.onQuickRequest(() => void api.quickData(quickData()))
  api.onQuickAdd((raw) => {
    const answer = (r: QuickResult) => void api.quickResult(r)
    const s = useData.getState()
    if (!s.fi || s.phase !== 'ready') return answer({ ok: false, message: 'Najpierw otwórz folder danych.' })
    if (s.status?.readOnly) return answer({ ok: false, message: 'Folder jest tylko do odczytu.' })
    if (s.switching) return answer({ ok: false, message: 'Trwa otwieranie innego folderu – spróbuj za chwilę.' })
    const draft = raw as QuickDraft
    // Sent again (a second Enter before the answer came, B51): it is saved already.
    if (draft.id && s.records.transactions[draft.id]) return answer({ ok: true, message: 'Zapisano.' })
    const t = quickTransaction(draft)
    if (typeof t === 'string') return answer({ ok: false, message: t })
    addRecord('transactions', t)
    // A household member's money with the rest chosen here: asked once, remembered for them (D80 b).
    if (t.kind === 'income' && t.memberId) rememberInflows([t])
    try {
      localStorage.setItem(ACCOUNT_KEY, t.accountId)
    } catch {
      /* ignore */
    }
    playSound('entry')
    const today = warsawNow().date
    toast(`Szybki wpis: ${t.counterparty || (t.kind === 'income' ? 'wpływ' : 'wydatek')}${t.date !== today ? ` (${t.date})` : ''}.`, 'success', 2500)
    // The data as it is after it (F7): a series goes on with today's energy as it is now.
    answer({ ok: true, message: 'Zapisano.', data: quickData() })
  })
}
