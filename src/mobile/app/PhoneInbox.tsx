/**
 * Meldunki on the phone (IP5): the reports a phone decides – operations without a category, unknown signals, returns on
 * their way, balances to confirm (typed here, the computers' check of today's difference); the rest (dockings,
 * duplicates, pairs of transfers, the cargo hold…) counted, decided on a computer.
 */
import { useState } from 'react'
import { INBOX_TITLE, type InboxItem, type InboxKind } from '@shared/calc/inbox'
import { plnText } from '@renderer/components/fields'
import { Empty, Panel } from '@renderer/components/ui'
import { parseAmountInput, plural } from '@renderer/lib/format'
import { useFleet } from '@renderer/store/fleet'
import { useData } from '@renderer/store/data'
import { openInboxItem, useInbox } from '@renderer/features/inbox/state'
import { dismissAnomaly } from '@renderer/features/sensors/state'
import { ConfirmTodayAsk, useConfirmToday } from '@renderer/features/balances/ConfirmToday'

const zl = (g: number) => `${plnText(g)} zł`

/** What the phone decides (the order of the computers' inbox). */
export const PHONE_INBOX_KINDS: readonly InboxKind[] = ['uncategorized', 'anomalies', 'returns', 'balances']

const HINT: Partial<Record<InboxKind, string>> = {
  uncategorized: 'Wydatek bez kategorii liczy się do energii dnia jako codzienny i nie trafia do żadnej koperty.',
  balances: 'Wpisz saldo z aplikacji banku – różnica wobec operacji do końca dnia pyta, czy dzisiejsze są już dopisane.'
}

/** The phone's reports and the computers' (counted). */
export function usePhoneInbox(): { items: InboxItem[]; elsewhere: InboxItem[] } {
  // The duplicates are looked for on a computer (the import's screen): not on the phone.
  const all = useInbox(0, zl)
  return { items: all.filter((i) => PHONE_INBOX_KINDS.includes(i.kind)), elsewhere: all.filter((i) => !PHONE_INBOX_KINDS.includes(i.kind)) }
}

export function PhoneInbox() {
  const fleet = useFleet()
  const { items, elsewhere } = usePhoneInbox()
  const from = fleet?.started ? fleet.start : null
  const sections = PHONE_INBOX_KINDS.map((kind) => [kind, items.filter((i) => i.kind === kind)] as const).filter(([, list]) => list.length > 0)
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
            {list.map((item) => (item.kind === 'balances' ? <BalanceReport key={item.key} item={item} /> : <Report key={item.key} item={item} onOpen={() => openInboxItem(item, from)} />))}
            {HINT[kind] && <p className="text-[11.5px] text-dim">{HINT[kind]}</p>}
          </div>
        </Panel>
      ))}
      {elsewhere.length > 0 && (
        <p className="px-3 py-3 text-[12px] leading-snug text-muted" data-testid="inbox-elsewhere">
          Na komputerze: {elsewhere.length} {plural(elsewhere.length, 'meldunek', 'meldunki', 'meldunków')} ({[...new Set(elsewhere.map((i) => INBOX_TITLE[i.kind].toLowerCase()))].join(', ')}) – rozpatrzysz je w Meldunkach na komputerze.
        </p>
      )}
    </div>
  )
}

function Report({ item, onOpen }: { item: InboxItem; onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-line/50 pb-2 last:border-b-0" data-testid="inbox-item" data-kind={item.kind}>
      <span className="text-fg">{item.text}</span>
      <div className="flex gap-2">
        <button type="button" className="btn h-[34px] px-3 text-[13px]" onClick={onOpen} data-testid="inbox-open">
          {item.action}
        </button>
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
