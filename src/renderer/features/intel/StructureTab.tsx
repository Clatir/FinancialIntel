/**
 * Wywiad → „Struktura” (D106 pt 6): the wealth week by week with its drawdown and BOS / CHoCH (beside it the net worth –
 * F24), the fuel balance of the months (F25), the shields and the hull at each month's end (AP-31).
 */
import { useState } from 'react'
import type { FleetState } from '@shared/calc/fleet'
import { plnText } from '../../components/fields'
import { Columns } from '../../components/layout'
import { Empty, Panel, Segmented, cx } from '../../components/ui'
import { plDate } from '../../lib/format'
import { WealthChart } from './charts'
import { CushionPanel } from './Cushion'
import { FuelPanel } from './Fuel'
import { useNetWorth, useWealth } from './wealth'

const zl = (g: number) => `${plnText(g)} zł`

/** Which line of the wealth the structure and the drawdown read (F24), kept on this computer. */
type Basis = 'accounts' | 'net'
const BASIS_KEY = 'fi.intel.wealthBasis'
function readBasis(): Basis {
  try {
    return localStorage.getItem(BASIS_KEY) === 'net' ? 'net' : 'accounts'
  } catch {
    return 'accounts'
  }
}

export function StructureTab({ fleet }: { fleet: FleetState }) {
  // The day only: the fleet is a new object every minute, the analyses change with the day.
  const today = fleet.today
  const accounts = useWealth(today)
  const net = useNetWorth(accounts.points, today, fleet.household ?? null)
  const [basis, setBasisState] = useState<Basis>(readBasis)
  const setBasis = (b: Basis) => {
    setBasisState(b)
    try {
      localStorage.setItem(BASIS_KEY, b)
    } catch {
      /* storage unavailable: the choice lives for the session */
    }
  }
  // The line the structure, the peak and the drawdown are of; the other one drawn thin beside it.
  const chosen = basis === 'net' && net.points.length ? net : accounts
  const { points: wealth, ...structure } = chosen
  const second = chosen === net ? accounts.points : net.points
  const peak = wealth.length ? Math.max(...wealth.map((p) => p.value)) : 0
  const maxDd = wealth.reduce((m, p) => Math.min(m, p.drawdown), 0)
  const lastNet = net.points.at(-1)
  const lastAccounts = accounts.points.at(-1)
  const names = chosen === net ? { main: 'Siła floty netto', second: 'Na kontach' } : { main: 'Na kontach', second: 'Siła floty netto' }
  return (
    <Columns id="intel-structure" tracks={['minmax(460px,3fr)', 'minmax(360px,2fr)']} className="grid min-h-full items-start">
      <div className="flex min-w-0 flex-col">
        <Panel title="Krzywa majątku" testId="intel-wealth">
          {wealth.length < 3 ? (
            <Empty>Za mało danych – krzywa pojawi się po dwóch tygodniach historii.</Empty>
          ) : (
            <div className="flex flex-col gap-2 text-[12px]">
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  size="sm"
                  value={chosen === net ? 'net' : 'accounts'}
                  onChange={setBasis}
                  options={[
                    {
                      value: 'accounts',
                      label: 'na kontach',
                      title: 'Suma sald kont budżetu'
                    },
                    {
                      value: 'net',
                      label: 'siła floty netto',
                      title: 'Konta + należności (domownicy, pożyczki udzielone) − dług (pożyczki wzięte, pieniądze domowników)'
                    }
                  ]}
                  aria-label="Linia majątku"
                />
                <span className="text-[11px] text-dim">struktura i drawdown liczone na wybranej linii, druga – przerywana</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-4">
                <Fact label="Na kontach" value={lastAccounts ? zl(lastAccounts.value) : '—'} strong={chosen !== net} testId="intel-wealth-accounts" />
                {lastNet && <Fact label="Siła floty netto" value={zl(lastNet.value)} strong={chosen === net} testId="intel-wealth-net" />}
                <Fact label="Szczyt" value={zl(peak)} />
                <Fact label="Największy drawdown" value={zl(maxDd)} />
                <Fact label="Struktura" value={structure.trend === 'up' ? 'bullish – wyższe szczyty' : structure.trend === 'down' ? 'bearish – niższe dołki' : 'bez struktury'} testId="intel-trend" />
              </div>
              <WealthChart points={wealth} marks={structure.marks} net={second} legend={names} />
              <span className="text-[11px] text-dim">
                Na kontach – suma sald kont budżetu na koniec każdego tygodnia, z pieniędzmi pożyczonymi i depozytem domowników. Siła floty netto – do tego należności (domownicy, pożyczki udzielone) minus dług (pożyczki wzięte, pieniądze domowników
                na kontach): wzięta pożyczka jej nie podnosi. BOS – przebicie ostatniego swingu zgodnie z trendem, CHoCH – pierwsze przebicie przeciw trendowi (zmiana charakteru). Pod spodem drawdown od szczytu.
              </span>
              {structure.marks.length > 0 && (
                <div className="flex flex-col" data-testid="intel-marks">
                  {structure.marks
                    .slice(-5)
                    .reverse()
                    .map((m) => (
                      <span key={m.date + m.kind} className="text-[11.5px]">
                        <span className="num text-dim">{plDate(m.date)}</span> <span className={m.kind === 'choch' ? 'text-accent' : 'text-fg-strong'}>{m.kind === 'choch' ? 'CHoCH' : 'BOS'}</span> {m.direction === 'up' ? 'w górę' : 'w dół'} – poziom{' '}
                        {zl(m.level)}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}
        </Panel>
        <FuelPanel fleet={fleet} />
      </div>
      <div className="flex min-w-0 flex-col">
        <CushionPanel month={fleet.month} />
      </div>
    </Columns>
  )
}

function Fact({ label, value, strong, testId }: { label: string; value: string; strong?: boolean; testId?: string }) {
  return (
    <div className="flex flex-col">
      <span className="label">{label}</span>
      <span className={cx('num', strong ? 'text-[16px] text-fg-strong' : 'text-fg')} data-testid={testId}>
        {value}
      </span>
    </div>
  )
}
