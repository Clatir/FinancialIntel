import { INBOX_KINDS, INBOX_TITLE, type InboxItem, type InboxKind } from '@shared/calc/inbox'
import { plnText } from '../../components/fields'
import { Empty, Panel } from '../../components/ui'
import { plural } from '../../lib/format'
import { useFleet } from '../../store/fleet'
import { useDuplicateCount } from '../import/DuplicatesPanel'
import { dismissCorrection, DUPLICATES_AFTER_MS, openInboxItem, useInbox } from './state'

const zl = (g: number) => `${plnText(g)} zł`

/** Why a report matters, under its section. */
const HINT: Partial<Record<InboxKind, string>> = {
  uncategorized: 'Wydatek bez kategorii liczy się do energii dnia jako codzienny i nie trafia do żadnej koperty.',
  duplicates: 'Ta sama operacja wpisana ręcznie i z banku albo z dwóch komputerów – scalanie z jednym „Cofnij”.',
  refunds: 'Zakupy finansowane pieniędzmi osłon, których domownik jeszcze nie oddał (Ustawienia → Domownicy).',
  balances: 'Salda potwierdzone z bankiem ponad 30 dni temu – potwierdzenie pokazuje, czy operacje zgadzają się z kontem.'
}

/**
 * „Meldunki do rozpatrzenia” (F6, D86): what waits for a decision, one section per kind, each report with the button
 * leading to its decision. No notifications of its own – the counter in the side menu.
 */
export function InboxPage() {
  const fleet = useFleet()
  const duplicates = useDuplicateCount(DUPLICATES_AFTER_MS)
  const items = useInbox(duplicates, zl)
  const from = fleet?.started ? fleet.start : null
  const sections = INBOX_KINDS.map((kind) => [kind, items.filter((i) => i.kind === kind)] as const).filter(([, list]) => list.length > 0)
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-inbox">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Meldunki do rozpatrzenia</h1>
        <span className="text-[12px] text-muted" data-testid="inbox-count">
          {items.length ? `${items.length} ${plural(items.length, 'meldunek', 'meldunki', 'meldunków')}` : 'wszystko rozpatrzone'}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {!sections.length ? (
          <Empty>Brak meldunków – nic nie czeka na decyzję.</Empty>
        ) : (
          <div className="flex max-w-[900px] flex-col">
            {sections.map(([kind, list]) => (
              <Panel key={kind} title={INBOX_TITLE[kind]} name={INBOX_TITLE[kind]} testId={`inbox-${kind}`}>
                <div className="flex flex-col gap-1 text-[12px]">
                  {list.map((item) => (
                    <Report key={item.key} item={item} onOpen={() => openInboxItem(item, from)} />
                  ))}
                  {HINT[kind] && <p className="text-[11px] text-dim">{HINT[kind]}</p>}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Report({ item, onOpen }: { item: InboxItem; onOpen: () => void }) {
  return (
    <div className="flex items-baseline gap-3" data-testid="inbox-item" data-kind={item.kind}>
      <span className="min-w-0 flex-1 text-fg">{item.text}</span>
      {/* Two real corrections of the same amount (B129): said once, never reported again. */}
      {item.kind === 'corrections' && item.ref && (
        <button type="button" className="btn btn-ghost h-[22px] shrink-0" onClick={() => dismissCorrection(item.ref!)} data-testid="inbox-dismiss">
          to nie powtórzenie
        </button>
      )}
      <button type="button" className="btn h-[22px] shrink-0" onClick={onOpen} data-testid="inbox-open">
        {item.action}
      </button>
    </div>
  )
}
