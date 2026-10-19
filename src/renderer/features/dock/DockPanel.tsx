/**
 * Dokowanie on the bridge (E5): the deliveries from the trading account to dock – ICTTJ payouts with their bank
 * operation (or for Portfel XTB), XTB inflows without an entry – and the latest docked ones; the ICTTJ folder's state.
 */
import type { Delivery } from '@shared/calc/dock'
import { ICTJ_POOL_LABEL } from '@shared/ictj'
import { useIctj } from '../../store/ictj'
import { navigate } from '../../store/ui'
import { plnText } from '../../components/fields'
import { Badge, Empty, Panel, cx } from '../../components/ui'
import { plDate } from '../../lib/format'
import { skipEntry } from './actions'
import { openDocking, useDeliveries } from './state'

const zl = (g: number) => `${plnText(g)} zł`
const RECENT = 4

const STATE_LABEL: Record<Delivery['state'], string> = {
  pending: 'do zadokowania',
  waiting: 'czeka na import',
  docked: 'zadokowana',
  skipped: 'pominięta',
  'before-start': 'sprzed startu'
}

export function DockPanel() {
  const list = useDeliveries()
  const snap = useIctj((s) => s.snap)
  const open = list.filter((d) => d.state === 'pending' || d.state === 'waiting')
  const docked = list.filter((d) => d.state === 'docked').slice(0, RECENT)
  const rest = list.filter((d) => d.state === 'skipped' || d.state === 'before-start')
  const toSettings = () => navigate({ page: 'settings', tab: 'ictj' })
  return (
    <Panel title={open.length ? `Dokowanie (${open.length})` : 'Dokowanie'} name="Dokowanie" testId="bridge-docking">
      <div className="flex flex-col gap-1 text-[12px]">
        {snap.status !== 'ok' && (
          <button className="self-start text-left text-[11.5px] text-muted hover:text-fg-strong" onClick={toSettings} data-testid="docking-ictj-state">
            {snap.status === 'off' ? 'Wypłaty z ICTTJ: wybierz folder ICT Trade Journal w Ustawieniach ›' : `ICTTJ: ${snap.message ?? 'folder niedostępny'} ›`}
          </button>
        )}
        {!open.length && !docked.length && <Empty>Brak dostaw z konta tradingowego do zadokowania.</Empty>}
        {[...open, ...docked].map((d) => (
          <DeliveryRow key={d.key} d={d} />
        ))}
        {rest.length > 0 && (
          <details className="text-[11.5px] text-muted">
            <summary className="cursor-pointer select-none">Pominięte i sprzed startu ({rest.length})</summary>
            {rest.map((d) => (
              <div key={d.key} className="flex items-baseline gap-2 py-0.5" data-testid="docking-rest" data-state={d.state}>
                <span className="num w-[68px] shrink-0">{plDate(d.date)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {d.entry ? ICTJ_POOL_LABEL[d.entry.pool] : 'XTB'} · {STATE_LABEL[d.state]}
                  {/* A skipped entry with its inflow in the bank (N45): the money is in the budget, in the usual order. */}
                  {d.state === 'skipped' && d.transaction && <span title="Wpływ w banku liczy się zwykłą kolejnością dokowania; po cofnięciu pominięcia zadokuje się z pulą wpisu"> · wpływ w banku {plDate(d.transaction.date)}</span>}
                </span>
                <span className="num">{zl(d.amount)}</span>
                {d.state === 'skipped' && d.entry && (
                  <button className="text-accent hover:underline" onClick={() => skipEntry(d.entry!.id, false)}>
                    przywróć
                  </button>
                )}
              </div>
            ))}
          </details>
        )}
        {snap.status === 'ok' && snap.warnings.map((w) => <p key={w} className="text-[11px] text-accent">{w}</p>)}
      </div>
    </Panel>
  )
}

function DeliveryRow({ d }: { d: Delivery }) {
  const what = d.entry ? (d.entry.kind === 'withdrawal' ? 'Wypłata z ICTTJ' : 'Zwrot do masy') : 'Wpływ z XTB'
  const detail = d.entry ? ICTJ_POOL_LABEL[d.entry.pool] : d.missingEntry ? 'bez wpisu w ICTTJ' : ''
  return (
    <button
      className="flex items-baseline gap-2 border-b border-line/60 px-1 py-1 text-left last:border-b-0 hover:bg-hover"
      onClick={() => openDocking(d.key)}
      data-testid="docking-row"
      data-state={d.state}
    >
      <span className="num w-[68px] shrink-0 text-[11px] text-muted">{plDate(d.date)}</span>
      <span className="min-w-0 flex-1 truncate text-fg-strong">
        {what}
        {detail && <span className="text-muted"> · {detail}</span>}
      </span>
      {d.wallet && <Badge tone="warn" title="Brak pary w mBanku po 3 dniach roboczych">Portfel XTB?</Badge>}
      {d.near && <Badge tone="warn" title="W banku jest wpływ z XTB o prawie tej samej kwocie – sprawdź i połącz">inna kwota</Badge>}
      {d.mismatch && !d.near && <Badge tone="warn" title="Kwota w ICTTJ różni się od operacji w banku">rozbieżność</Badge>}
      {d.poolChanged && <Badge tone="warn" title="Pula wpisu zmieniła się w ICTTJ po dokowaniu – zadokuj ponownie">pula zmieniona</Badge>}
      {d.entryGone && <Badge tone="warn" title="Wpis tej wypłaty usunięto w ICTTJ – zadokuj ponownie">wpis usunięty</Badge>}
      {d.extra.length > 0 && <Badge tone="warn" title="Ten wpis zadokowano dwa razy (np. na dwóch komputerach)">podwójnie</Badge>}
      <span className={cx('text-[11px]', d.state === 'pending' ? 'text-accent' : 'text-dim')}>{STATE_LABEL[d.state]}</span>
      <span className={cx('num w-[100px] text-right', d.direction === 'in' ? 'text-up' : 'text-fg')}>
        {d.direction === 'in' ? '+' : '−'}
        {zl(d.amount)}
      </span>
    </button>
  )
}
