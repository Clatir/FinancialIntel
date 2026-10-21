/**
 * Meldunki on the phone (IP5, IP12): the reports a phone decides – the loot (Plan miesiąca), operations without a
 * category, duplicates (their panel – `PhoneDuplicates`), pairs of transfers (joined here), a correction twice, unknown
 * signals, a member's money to assign, purchases to be paid back, returns on their way, balances to confirm (typed here,
 * the computers' check of today's difference); dockings and the cargo hold – with the next version, the folder's
 * conflicts – on a computer. The reports are counted once for the menu and the screen.
 */
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { INBOX_KINDS, INBOX_TITLE, type InboxItem, type InboxKind } from '@shared/calc/inbox'
import { plnText } from '@renderer/components/fields'
import { Empty, Panel } from '@renderer/components/ui'
import { parseAmountInput, plural } from '@renderer/lib/format'
import { useFleet } from '@renderer/store/fleet'
import { useData } from '@renderer/store/data'
import { DUPLICATES_AFTER_MS, dismissCorrection, openInboxItem, opensPairs, useInbox } from '@renderer/features/inbox/state'
import { TransferButtons } from '@renderer/features/inbox/InboxPage'
import { TransferPairs } from '@renderer/features/inbox/TransferPairs'
import { useDuplicateCount, useKnownDuplicateCount } from '@renderer/features/import/DuplicatesPanel'
import { dismissAnomaly } from '@renderer/features/sensors/state'
import { ConfirmTodayAsk, useConfirmToday } from '@renderer/features/balances/ConfirmToday'

const zl = (g: number) => `${plnText(g)} zł`

/** What the phone decides – the operation's editor, the list's filter or the report itself – in the inbox's order. */
const PHONE_KINDS: ReadonlySet<InboxKind> = new Set(['loot', 'uncategorized', 'duplicates', 'transfers', 'corrections', 'anomalies', 'repayments', 'refunds', 'returns', 'balances'])
export const PHONE_INBOX_KINDS: readonly InboxKind[] = INBOX_KINDS.filter((k) => PHONE_KINDS.has(k))

/** The button's words where the computer's words name a screen the phone has not (the duplicates have their own one). */
const ACTION: Partial<Record<InboxKind, string>> = { duplicates: 'Pokaż i scal' }

const HINT: Partial<Record<InboxKind, string>> = {
  uncategorized: 'Wydatek bez kategorii liczy się do energii dnia jako codzienny i nie trafia do żadnej koperty.',
  refunds: 'Zakupy finansowane pieniędzmi osłon, których domownik jeszcze nie oddał.',
  balances: 'Wpisz saldo z aplikacji banku – różnica wobec operacji do końca dnia pyta, czy dzisiejsze są już dopisane.'
}

interface PhoneInboxState {
  items: readonly InboxItem[]
  elsewhere: readonly InboxItem[]
}

const NONE: readonly InboxItem[] = []
export const usePhoneInbox = create<PhoneInboxState>(() => ({ items: NONE, elsewhere: NONE }))

const signature = (list: readonly InboxItem[]) => list.map((i) => `${i.key}\u0001${i.text}\u0001${i.action}`).join('\u0002')

/** The reports counted once (the shell): the menu's counter and the screen read them. */
export function PhoneInboxWatcher(): null {
  // The duplicates as last counted (W4 – as a computer's side menu: never after each change on every screen); Meldunki
  // and the duplicates' screen count them while they are shown.
  const duplicates = useKnownDuplicateCount()
  const all = useInbox(duplicates, zl)
  useEffect(() => {
    const items = all.filter((i) => PHONE_KINDS.has(i.kind))
    const elsewhere = all.filter((i) => !PHONE_KINDS.has(i.kind))
    const now = usePhoneInbox.getState()
    if (signature(items) !== signature(now.items) || signature(elsewhere) !== signature(now.elsewhere)) usePhoneInbox.setState({ items, elsewhere })
  }, [all])
  return null
}

export function PhoneInbox() {
  const fleet = useFleet()
  // Counted while the screen is shown, a moment after a change (as on a computer's Meldunki) – the watcher reads it.
  useDuplicateCount(DUPLICATES_AFTER_MS)
  const items = usePhoneInbox((s) => s.items)
  const elsewhere = usePhoneInbox((s) => s.elsewhere)
  const from = fleet?.started ? fleet.start : null
  const sections = PHONE_INBOX_KINDS.map((kind) => [kind, items.filter((i) => i.kind === kind)] as const).filter(([, list]) => list.length > 0)
  // The pairs of transfers together (F10): shown before they are joined.
  const [pairs, setPairs] = useState(false)
  const open = (item: InboxItem) => (opensPairs(item) ? setPairs(true) : openInboxItem(item, from))
  return (
    <div className="flex min-h-full flex-col" data-testid="page-inbox">
      <div className="flex items-center gap-3 border-b border-line px-3 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Meldunki</h1>
        <span className="text-[12px] text-muted" data-testid="inbox-count">
          {items.length ? `${items.length} ${plural(items.length, 'meldunek', 'meldunki', 'meldunków')}` : 'wszystko rozpatrzone'}
        </span>
      </div>
      {!sections.length && <Empty>Brak meldunków do rozpatrzenia na telefonie.</Empty>}
      {sections.map(([kind, list]) => (
        <Panel key={kind} title={INBOX_TITLE[kind]} name={INBOX_TITLE[kind]} testId={`inbox-${kind}`}>
          <div className="flex flex-col gap-2 text-[13px]">
            {list.map((item) => (item.kind === 'balances' ? <BalanceReport key={item.key} item={item} /> : <Report key={item.key} item={item} onOpen={() => open(item)} />))}
            {HINT[kind] && <p className="text-[11.5px] text-dim">{HINT[kind]}</p>}
          </div>
        </Panel>
      ))}
      {elsewhere.length > 0 && (
        <p className="px-3 py-3 text-[12px] leading-snug text-muted" data-testid="inbox-elsewhere">
          Na komputerze: {elsewhere.length} {plural(elsewhere.length, 'meldunek', 'meldunki', 'meldunków')} ({[...new Set(elsewhere.map((i) => INBOX_TITLE[i.kind].toLowerCase()))].join(', ')}) – rozpatrzysz je w Meldunkach na komputerze.
        </p>
      )}
      {pairs && <TransferPairs onClose={() => setPairs(false)} />}
    </div>
  )
}

function Report({ item, onOpen }: { item: InboxItem; onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-line/50 pb-2 last:border-b-0" data-testid="inbox-item" data-kind={item.kind}>
      <span className="text-fg">{item.text}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={onOpen} data-testid="inbox-open">
          {ACTION[item.kind] ?? item.action}
        </button>
        {/* Two real corrections of the same amount (B129): said once, never reported again. */}
        {item.kind === 'corrections' && item.ref && (
          <button type="button" className="btn btn-ghost h-[34px] px-3 text-[13px]" onClick={() => dismissCorrection(item.ref!)} data-testid="inbox-dismiss">
            to nie powtórzenie
          </button>
        )}
        {/* A transfer's report (F10): its operation, and „zostaw tak” (two moves, a side outside the budget). */}
        {item.kind === 'transfers' && item.ref && <TransferButtons item={item} size="h-[34px] px-3 text-[13px]" />}
        {/* An unknown signal (F31): „to w porządku” – never reported again. */}
        {item.kind === 'anomalies' && item.ref && (
          <button type="button" className="btn btn-ghost h-[34px] px-3 text-[13px]" onClick={() => dismissAnomaly({ key: item.ref! })} data-testid="inbox-anomaly-ok">
            to w porządku
          </button>
        )}
      </div>
    </div>
  )
}

/** A balance to confirm (D86): the bank's balance typed here (on a computer – Ustawienia → Konta). */
function BalanceReport({ item }: { item: InboxItem }) {
  const name = useData((s) => s.fi?.settings.accounts.find((a) => a.id === item.ref)?.name ?? '')
  const [text, setText] = useState('')
  const c = useConfirmToday(item.ref ?? '', name, () => setText(''))
  // Złote typed (a negative balance too), grosze kept.
  const typed = parseAmountInput(text)
  const amount = typed == null ? null : Math.round(typed * 100)
  return (
    <div className="flex flex-col gap-1.5 border-b border-line/50 pb-2 last:border-b-0" data-testid="inbox-item" data-kind={item.kind}>
      <span className="text-fg">{item.text}</span>
      <div className="flex items-center gap-2">
        <input
          className="input num h-[34px] w-[150px] text-right text-[14px]"
          inputMode="decimal"
          placeholder="saldo z banku"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            c.later()
          }}
          aria-label={`Saldo ${name} z banku`}
          data-testid="inbox-balance-amount"
        />
        <span className="text-muted">zł</span>
        <button type="button" className="btn btn-accent h-[34px] px-3 text-[13px]" disabled={amount == null || !item.ref} onClick={() => amount != null && c.confirm(amount)} data-testid="inbox-balance-confirm">
          Potwierdź
        </button>
      </div>
      <ConfirmTodayAsk c={c} />
    </div>
  )
}
