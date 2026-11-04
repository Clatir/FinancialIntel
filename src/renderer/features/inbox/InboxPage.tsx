import { useEffect, useState } from 'react'
import { INBOX_KINDS, INBOX_TITLE, type InboxItem, type InboxKind } from '@shared/calc/inbox'
import { plnText } from '../../components/fields'
import { Empty, Panel, cx } from '../../components/ui'
import { plural } from '../../lib/format'
import { useFleet } from '../../store/fleet'
import { useDuplicateCount } from '../import/DuplicatesPanel'
import { openOperation } from '../operations/state'
import { dismissTransfer } from '../operations/transfers'
import { dismissCorrection, DUPLICATES_AFTER_MS, openInboxItem, opensPairs, transferIssueOf, useInbox } from './state'
import { dismissAnomaly } from '../sensors/state'
import { keepReturned, readDeletedBank } from '../import/returned'
import { useData } from '../../store/data'
import { keepAdvances } from '../household/actions'
import { TransferPairs } from './TransferPairs'

const zl = (g: number) => `${plnText(g)} zł`

/** Why a report matters, under its section. */
const HINT: Partial<Record<InboxKind, string>> = {
  uncategorized: 'Wydatek bez kategorii liczy się do energii dnia jako codzienny i nie trafia do żadnej koperty.',
  duplicates: 'Ta sama operacja wpisana ręcznie i z banku albo z dwóch komputerów – scalanie z jednym „Cofnij”.',
  returned:
    'Operacje z banku, które usunąłeś, a import pliku w drugim formacie (lista operacji ↔ historia rachunku) wpisał je znowu jako nowe (przed wersją 1.15.5). „Usuń” usuwa je znowu (z „Cofnij”), „zostaw” – zostają i nie będą zgłaszane.',
  transfers:
    'Od 1.7.0 przelew między kontami budżetu to jedna operacja z obiema stronami. Przelewy zapisane wcześniej jako osobne strony łączysz tutaj (z „Cofnij”); brakującą stronę zgłaszamy tylko po ostatnim potwierdzonym saldzie konta.',
  advances:
    'Wpłaty zapisane jako zaliczka na przyszłość idą w całości do depozytu i nie spłacają długu – do wersji 1.15.5 tak zapisywał się też wybór „reszta jako zaliczka” w imporcie. „Spłać” – najpierw wyrównają to, co osoba ma oddać, reszta zostanie zaliczką (z „Cofnij”); „zostaw” – zostają zaliczką i nie będą zgłaszane.',
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
  // The deleted operations of the bank read at once here (AF-1: the operations come back after their deletion).
  const dir = useData((s) => s.status?.dataDir ?? null)
  useEffect(() => {
    if (dir) void readDeletedBank()
  }, [dir])
  const items = useInbox(duplicates, zl)
  const from = fleet?.started ? fleet.start : null
  const sections = INBOX_KINDS.map((kind) => [kind, items.filter((i) => i.kind === kind)] as const).filter(([, list]) => list.length > 0)
  // The pairs of transfers together (F10): shown before they are joined.
  const [pairs, setPairs] = useState(false)
  const open = (item: InboxItem) => (opensPairs(item) ? setPairs(true) : openInboxItem(item, from))
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
                    <Report key={item.key} item={item} onOpen={() => open(item)} />
                  ))}
                  {HINT[kind] && <p className="text-[11px] text-dim">{HINT[kind]}</p>}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
      {pairs && <TransferPairs onClose={() => setPairs(false)} />}
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
      {/* An unknown signal (F31): „to w porządku” – never reported again. */}
      {item.kind === 'anomalies' && item.ref && (
        <button type="button" className="btn btn-ghost h-[22px] shrink-0" onClick={() => dismissAnomaly({ key: item.ref! })} data-testid="inbox-anomaly-ok">
          to w porządku
        </button>
      )}
      {/* An operation come back after its deletion (AF-1): to look at, or „zostaw” – never reported again. */}
      {item.kind === 'returned' && item.ref && (
        <>
          <button type="button" className="btn btn-ghost h-[22px] shrink-0" onClick={() => showReturned(item.ref!)} data-testid="inbox-returned-show">
            Pokaż
          </button>
          <button type="button" className="btn btn-ghost h-[22px] shrink-0" onClick={() => keepReturned(item.ref!)} data-testid="inbox-dismiss">
            zostaw
          </button>
        </>
      )}
      {/* A member's advances for the future that left the debt unpaid (AP-4): „zostaw” – kept so, never asked again. */}
      {item.kind === 'advances' && item.ref && (
        <button type="button" className="btn btn-ghost h-[22px] shrink-0" onClick={() => keepAdvances(item.ref!)} data-testid="inbox-dismiss">
          zostaw
        </button>
      )}
      {/* A transfer's report (F10): its operation, and „zostaw tak” (two moves, a side outside the budget). */}
      {item.kind === 'transfers' && item.ref && <TransferButtons item={item} />}
      <button type="button" className="btn h-[22px] shrink-0" onClick={onOpen} data-testid="inbox-open">
        {item.action}
      </button>
    </div>
  )
}

/** An operation come back after its deletion (AF-1) in Operacje. */
function showReturned(id: string): void {
  const t = useData.getState().records.transactions[id]?.record
  if (t) openOperation(t)
}

/** A transfer's report (F10): its operation, and „zostaw tak” – also the phone's Meldunki (T311, bigger buttons). */
export function TransferButtons({ item, size = 'h-[22px] shrink-0' }: { item: InboxItem; size?: string }) {
  const show = () => {
    const issue = transferIssueOf(item)
    if (issue) openOperation(issue.kind === 'lone' ? issue.tx : issue.keep)
  }
  const dismiss = () => {
    const issue = transferIssueOf(item)
    if (issue) dismissTransfer(issue)
  }
  return (
    <>
      <button type="button" className={cx('btn btn-ghost', size)} onClick={show} data-testid="inbox-transfer-show">
        Pokaż
      </button>
      <button type="button" className={cx('btn btn-ghost', size)} onClick={dismiss} data-testid="inbox-dismiss">
        zostaw tak
      </button>
    </>
  )
}
