/**
 * The main window's side of the quick entry (main/quick.ts): it answers the quick window with the data it shows
 * (categories, accounts, today's energy, the officer's hints) and saves the operations typed there – the main window
 * owns the data folder's records.
 */
import type { QuickData, QuickResult } from '@shared/api'
import { warsawNow } from '@shared/calc/dates'
import { categoryIndex } from '@shared/calc/operations'
import { counterpartyKey } from '@shared/import/classify'
import { newId } from '@shared/ids'
import { envelopeKind, inflowOf, SCHEMA_VERSION, transactionSchema, type Transaction } from '@shared/schema'
import { rememberInflows } from '../features/household/actions'
import { api } from '../lib/api'
import { playSound } from '../lib/sounds'
import { addRecord, useData } from './data'
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
  // The officer: the latest category per counterparty, the counterparties used most of late.
  const txs = Object.values(s.records.transactions)
    .map((e) => e.record)
    .filter((t) => t.kind === 'expense' && t.counterparty.trim())
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const lastCategory: Record<string, string> = {}
  const uses = new Map<string, { name: string; n: number }>()
  for (const t of txs.slice(0, 2000)) {
    const key = counterpartyKey(t.counterparty)
    if (!key) continue
    if (t.categoryId && !lastCategory[key]) lastCategory[key] = t.categoryId
    const u = uses.get(key)
    if (u) u.n++
    else uses.set(key, { name: t.counterparty.trim(), n: 1 })
  }
  const last = lastAccount()
  return {
    categories,
    accounts,
    accountId: accounts.find((a) => a.id === last)?.id ?? accounts[0]?.id ?? '',
    energyLeft: fleet?.daily ? fleet.daily.left : null,
    envelopesLeft: Object.fromEntries((fleet?.envelopes ?? []).map((e) => [e.categoryId, e.left])),
    quietHours: fi.settings.orders.quietHours,
    impulseThreshold: fi.settings.orders.impulseThreshold,
    lastCategory,
    counterparties: [...uses.values()].sort((a, b) => b.n - a.n).slice(0, 40).map((u) => u.name),
    members: fi.settings.household.members
      .filter((m) => !m.archived)
      .map((m) => {
        const b = fleet?.receivables.members.find((x) => x.memberId === m.id)
        return { id: m.id, name: m.name, owed: b?.owed ?? 0, deposit: b?.deposit ?? 0, inflow: inflowOf(m) }
      }),
    hideAmounts: useMachine.getState().prefs.hideAmounts,
    readOnly: !!s.status?.readOnly
  }
}

/** What the quick window sends: an expense, an income or a purchase a household member finances, with its lines and the log. */
export interface QuickDraft {
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
  splits: Array<{ amount: number; categoryId: string | null; refundable: boolean; memberId?: string | null }>
}

/** The operation of a quick draft (or why not). */
export function quickTransaction(d: QuickDraft, now = new Date().toISOString()): Transaction | string {
  if (!Number.isInteger(d.amount) || d.amount <= 0) return 'Wpisz kwotę.'
  if (!d.accountId) return 'Wybierz konto.'
  const income = d.kind === 'income'
  const sign = income ? 1 : -1
  const splits = !income && d.splits.length > 1 ? d.splits.map((x) => ({ id: newId(), amount: sign * Math.abs(x.amount), categoryId: x.categoryId, refundable: x.refundable, memberId: x.refundable ? (x.memberId ?? null) : null, note: '' })) : []
  const refundable = d.kind === 'refundable' && !splits.length
  const household = income && d.household && !!d.memberId
  const parsed = transactionSchema.safeParse({
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
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
    const t = quickTransaction(raw as QuickDraft)
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
    answer({ ok: true, message: 'Zapisano.' })
  })
}
