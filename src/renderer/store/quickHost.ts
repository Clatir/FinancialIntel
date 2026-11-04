/**
 * The main window's side of the quick entry (main/quick.ts): it answers the quick window with the data it shows
 * (categories, accounts, today's energy, the officer's hints) and saves the operations typed there – the main window
 * owns the data folder's records.
 */
import type { QuickData, QuickResult } from '@shared/api'
import { quickTemplates } from '@shared/calc/quick'
import { hashTags, withoutHashTags, withTags } from '@shared/calc/tags'
import { knownTagsOf, lastTagOf } from '../features/tags/state'
import { daysInMonth, warsawNow } from '@shared/calc/dates'
import { loanChoices } from '@shared/calc/loans'
import { categoryIndex } from '@shared/calc/operations'
import { newId } from '@shared/ids'
import { shareSplits } from '@shared/calc/share'
import { envelopeKind, inflowOf, SCHEMA_VERSION, shareSchema, transactionSchema, ulidSchema, type Share, type Transaction } from '@shared/schema'
import { rememberInflows, sureCoversOf } from '../features/household/actions'
import { api } from '../lib/api'
import { playSound } from '../lib/sounds'
import { addRecord, listOf, unsavedOf, useData, writeNow } from './data'
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
    energyLeft: fleet?.daily ? fleet.daily.energy : null,
    monthEnergy: fleet?.started && fleet.salary != null ? fleet.energy : null,
    envelopesLeft: Object.fromEntries((fleet?.envelopes ?? []).map((e) => [e.categoryId, e.left])),
    // As the engine counts today's energy (N3, AP-13): the month's energy caps it, today's refunds of earlier purchases.
    daily: fleet?.daily
      ? {
          today: fleet.today,
          limit: fleet.daily.limit,
          spentBefore: fleet.daily.spentBefore,
          spentToday: fleet.daily.spentToday,
          days: daysInMonth(fleet.month),
          returned: fleet.daily.returnedBy,
          month: fleet.started ? { energy: fleet.energy, spends: fleet.salary != null } : null
        }
      : null,
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
    // The open loans given (D100): any inflow may repay one.
    loans: loanChoices(listOf(s.records.loans), fleet?.loans).map((l) => ({ id: l.id, name: l.name, open: l.open })),
    hideAmounts: useMachine.getState().prefs.hideAmounts,
    // Another folder opening (AF-75): nothing taken until it is open – the lists and the energy are still the old one's.
    readOnly: !!s.status?.readOnly || s.switching,
    readOnlyReason: s.switching ? QUICK_SWITCHING : (s.status?.readOnlyReason ?? null),
    // The folder the lists are of (AF-75): a draft made with another folder's lists is not saved into this one.
    folder: s.status?.dataDir ?? null,
    ...quickTemplates(listOf(s.records.transactions)),
    knownTags: knownTagsOf(listOf(s.records.transactions)),
    lastTag: lastTagOf(listOf(s.records.transactions), warsawNow().date)
  }
}

/** What the quick window sends: an expense, an income or a purchase a household member finances, with its lines and the log. */
export interface QuickDraft {
  /** The operation's id, given in the quick window (B51): a draft that comes twice is saved once. */
  id?: string
  /** The data folder of the lists it was typed with (`QuickData.folder`, AF-75). */
  folder?: string | null
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
  /**
   * The part of an income repaying a loan given (D100, T359 – whoever sent it): its loan and amount (the whole amount –
   * all of it); the rest as the income says (a member's money, income).
   */
  loanPart?: { loanId: string; amount: number } | null
  /** „Zaliczka / przychód” switched by the user (N39): only then remembered for a member still asked (D80 b). */
  advanceChosen?: boolean
  /** Its tags (F17); „#słowo” in the counterparty or the note adds one too. */
  tags?: string[]
}

/** The operation of a quick draft (or why not). */
export function quickTransaction(d: QuickDraft, now = new Date().toISOString()): Transaction | string {
  if (!Number.isInteger(d.amount) || d.amount <= 0) return 'Wpisz kwotę.'
  if (!d.accountId) return 'Wybierz konto.'
  const income = d.kind === 'income'
  const sign = income ? 1 : -1
  const household = income && d.household && !!d.memberId
  const shares = household ? (d.shares ?? []).filter((x) => x.amount > 0) : []
  // A part repaying a loan given (D100): of any inflow, a member's or not.
  const loanPart = income && d.loanPart && ulidSchema.safeParse(d.loanPart.loanId).success && Number.isInteger(d.loanPart.amount) && d.loanPart.amount > 0 ? d.loanPart : null
  if (shares.reduce((a, x) => a + x.amount, 0) > d.amount) return 'Części innych osób przekraczają kwotę wpłaty.'
  if (loanPart && shares.reduce((a, x) => a + x.amount, 0) + loanPart.amount > d.amount) return 'Spłata pożyczki i części innych osób przekraczają kwotę wpłaty.'
  // A shared purchase (D83): a share the schema reads (a window of another version sends what it sends).
  const parsedShare = !income && d.share ? shareSchema.safeParse(d.share) : null
  const share = parsedShare?.success ? parsedShare.data : null
  const splits = income
    ? [
        ...shares.map((x) => ({ id: newId(), amount: x.amount, categoryId: null, refundable: false, memberId: x.memberId, advance: x.advance, note: '' })),
        // No member's money: the loan's (T355).
        ...(loanPart ? [{ id: newId(), amount: loanPart.amount, categoryId: null, refundable: false, memberId: null, advance: false, loanId: loanPart.loanId, note: '' }] : [])
      ]
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
  // F17: the tags of the field and the „#słowo” typed in the counterparty (taken out of the name) or the note.
  const counterparty = withoutHashTags(d.counterparty)
  const tags = withTags(Array.isArray(d.tags) ? d.tags.filter((x): x is string => typeof x === 'string') : [], [...hashTags(d.counterparty), ...hashTags(d.note)])
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
    counterparty,
    note: d.note,
    ...(tags.length ? { tags } : {}),
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
  // The quick window open while the folder changes (B125: another folder, archived categories or accounts, read only,
  // the day's spending): its data follows, its draft stays – at most twice a second, never while it is hidden.
  let visible = false
  let timer: ReturnType<typeof setTimeout> | null = null
  const push = () => {
    if (!visible || timer) return
    timer = setTimeout(() => {
      timer = null
      if (visible) void api.quickUpdate(quickData())
    }, 500)
  }
  api.onQuickVisible((on) => {
    visible = on
  })
  useData.subscribe((s, p) => {
    // `switching` too (AF-75): another folder opening keeps the status of the old one until it is open.
    if (s.fi !== p.fi || s.status !== p.status || s.phase !== p.phase || s.switching !== p.switching || s.records.transactions !== p.records.transactions) push()
  })
  useMachine.subscribe((s, p) => {
    if (s.prefs !== p.prefs) push()
  })
  api.onQuickAdd((raw) => void quickAdd(raw as QuickDraft))
}

/** Said by the quick entry while another folder opens (AF-75). */
const QUICK_SWITCHING = 'Trwa otwieranie innego folderu – spróbuj za chwilę.'

/**
 * „Zapisano.” only once the operation is on the disk (AP-1, AF-2): a write that did not go (the data folder gone) says so –
 * the operation waits in the main window and is written by itself once the folder is back.
 */
function savedAnswer(id: string, saved: boolean): QuickResult {
  if (saved) return { ok: true, message: 'Zapisano.' }
  const why = unsavedOf('transactions', id)
  return {
    ok: true,
    pending: true,
    message: `Wpis przyjęty, ale jeszcze niezapisany${why && why !== 'zapis jeszcze trwa' ? ` (${why.replace(/[.\s]+$/, '')})` : ''} – zapisze się sam, gdy będzie można.`
  }
}

/** An operation from the quick window (`QuickDraft`): checked against the folder now, saved, answered once on the disk. */
export async function quickAdd(draft: QuickDraft): Promise<void> {
  const answer = (r: QuickResult) => void api.quickResult(r)
  const s = useData.getState()
  if (!s.fi || s.phase !== 'ready') return answer({ ok: false, message: 'Najpierw otwórz folder danych.' })
  if (s.switching) return answer({ ok: false, message: QUICK_SWITCHING })
  if (s.status?.readOnly) return answer({ ok: false, message: s.status.readOnlyReason ?? 'Folder jest tylko do odczytu.' })
  // Typed with the lists of another folder (opened meanwhile – AF-75): never saved into this one unseen.
  if (draft.folder && s.status && draft.folder !== s.status.dataDir)
    return answer({ ok: false, message: 'W międzyczasie otwarto inny folder danych – sprawdź wpis (listy i energia są już z tego folderu) i zapisz ponownie.' })
  // Sent again (a second Enter before the answer came, B51): it is there already – said as it is on the disk.
  if (draft.id && s.records.transactions[draft.id]) return answer(savedAnswer(draft.id, await writeNow('transactions', draft.id)))
  const t = quickTransaction(draft)
  if (typeof t === 'string') return answer({ ok: false, message: t })
  // The lists of the window may be older than the folder's (B125): an account, a category or a household member it
  // no longer has is refused – an archived one is still the folder's.
  const settings = s.fi.settings
  if (!settings.accounts.some((a) => a.id === t.accountId)) return answer({ ok: false, message: 'Lista kont się zmieniła – wybierz konto ponownie.' })
  const known = new Set(settings.categories.map((c) => c.id))
  if ([t.categoryId, ...t.splits.map((x) => x.categoryId)].some((id) => id && !known.has(id))) return answer({ ok: false, message: 'Lista kategorii się zmieniła – wybierz kategorię ponownie.' })
  const members = new Set(settings.household.members.map((m) => m.id))
  if ([t.memberId, ...t.splits.map((x) => x.memberId), ...(t.share?.lines.map((l) => l.memberId) ?? [])].some((id) => id && !members.has(id)))
    return answer({ ok: false, message: 'Lista domowników się zmieniła – wybierz domownika ponownie.' })
  // A part's loan (D100): a loan given of the Radar, still open – closed or gone meanwhile, the part would be income.
  const usable = (id: string) => {
    const l = s.records.loans[id]?.record
    return !!l && l.direction === 'given' && l.closedAt == null
  }
  if (t.splits.some((x) => x.loanId && !usable(x.loanId))) return answer({ ok: false, message: 'Lista pożyczek się zmieniła – wybierz pożyczkę ponownie.' })
  // A member's money paying back one purchase of theirs surely (D91): named now, else it waits to be assigned.
  if (!addRecord('transactions', { ...t, ...sureCoversOf(t) })) return answer({ ok: false, message: 'Folder jest tylko do odczytu.' })
  // A household member's money with the rest chosen here – by the user (N39): asked once, remembered for them (D80 b).
  if (t.kind === 'income' && t.memberId && draft.advanceChosen) rememberInflows([t])
  try {
    localStorage.setItem(ACCOUNT_KEY, t.accountId)
  } catch {
    /* ignore */
  }
  playSound('entry')
  const saved = await writeNow('transactions', t.id)
  const today = warsawNow().date
  const label = `Szybki wpis: ${t.counterparty || (t.kind === 'income' ? 'wpływ' : 'wydatek')}${t.date !== today ? ` (${t.date})` : ''}`
  toast(saved ? `${label}.` : `${label} – czeka na zapis.`, saved ? 'success' : 'info', saved ? 2500 : 6000)
  // The data as it is after it (F7): a series goes on with today's energy as it is now.
  answer({ ...savedAnswer(t.id, saved), data: quickData() })
}
