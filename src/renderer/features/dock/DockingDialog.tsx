/**
 * The docking window (spec, „Okna”: a delivery's split with its matched account – E5, D72): where the money came from
 * (the ICTTJ entry, its pool), the account (the paired bank operation or Portfel XTB), the split the docking order
 * proposes – changeable before saving – and, for a return to the trading capital, the firewall.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addWorkingDays, PAIR_WORKING_DAYS, withDocking, type Delivery } from '@shared/calc/dock'
import { byPriority } from '@shared/calc/goals'
import { ICTJ_POOL_LABEL } from '@shared/ictj'
import type { Goal } from '@shared/schema'
import { useData } from '../../store/data'
import { fleetInputNow, useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'
import { Modal } from '../../components/Modal'
import { AmountField, plnText } from '../../components/fields'
import { Badge, cx } from '../../components/ui'
import { plDate } from '../../lib/format'
import { closeDocking, useDeliveries, useDocking } from './state'
import { dockDelivery, dockingOf, skipEntry, walletOperation, type SplitDraft } from './actions'

const zl = (g: number) => `${plnText(g)} zł`

export function DockingDialog() {
  const key = useDocking((s) => s.key)
  const list = useDeliveries()
  const d = key ? list.find((x) => x.key === key) : undefined
  // The delivery docked (by this window or another computer) or gone: the window closes – unless it shows its end.
  const [done, setDone] = useState<string | null>(null)
  const end = useCallback(() => setDone(null), [])
  useEffect(() => {
    if (key && !d && done !== key) closeDocking()
  }, [key, d, done])
  if (!key) return null
  if (done === key) return <Docked onEnd={end} />
  if (!d) return null
  return <DockingWindow key={d.key} d={d} onDocked={() => setDone(d.key)} />
}

/** The event (spec, „Animacje”): a short sweep and the word, then the window goes. */
function Docked({ onEnd }: { onEnd: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => {
      closeDocking()
      onEnd()
    }, 900)
    return () => clearTimeout(t)
  }, [onEnd])
  return (
    <Modal title="Dokowanie dostawy" width={420} testId="docking-done">
      <div className="relative flex flex-col items-center gap-1 py-4">
        <span className="animate-event-in text-[14px] font-medium text-accent">Zadokowano</span>
        <span className="h-px w-full origin-left animate-sweep bg-accent" />
      </div>
    </Modal>
  )
}

function DockingWindow({ d, onDocked }: { d: Delivery; onDocked: () => void }) {
  const fleet = useFleet()
  const readOnly = useData((s) => !!s.status?.readOnly)
  const records = useData((s) => s.records)
  const goalsAll = useRecordList('goals')
  const goals = useMemo(() => byPriority(goalsAll.filter((g) => !g.archived)), [goalsAll])
  // The operation the docking is about: the paired one, or the one it would create on Portfel XTB.
  const tx = useMemo(() => d.transaction ?? walletOperation(d, new Date().toISOString()), [d])
  const preview = useMemo(() => {
    const input = fleetInputNow()
    return input ? withDocking(input, tx, dockingOf(d, tx, null, new Date().toISOString())) : null
    // The records and the fleet: a change elsewhere (an import) proposes again.
  }, [d, tx, records, fleet])
  const moves = preview?.log.find((e) => e.txId === tx.id)?.moves ?? {}
  const proposal: SplitDraft = { hull: Math.max(0, moves.hull ?? 0), goals: Object.fromEntries(Object.entries(moves.goals ?? {}).filter(([, v]) => v > 0)), taxHold: Math.max(0, moves.taxHold ?? 0) }
  // A docked delivery opens with the split it was docked with (null = the docking order); a goal archived since is
  // left out – its part goes back to the shields.
  const stored = d.state === 'docked' ? d.docking?.split : null
  const [draft, setDraft] = useState<SplitDraft | null>(() =>
    stored ? { hull: stored.hull, goals: Object.fromEntries(Object.entries(stored.goals).filter(([id]) => goals.some((g) => g.id === id))), taxHold: stored.taxHold } : null
  )
  const split = draft ?? proposal
  const others = split.hull + split.taxHold + Object.values(split.goals).reduce((a, b) => a + b, 0)
  const shields = d.amount - others
  const over = shields < 0
  const firewall = d.direction === 'out' && !!preview?.alarms.some((a) => a.kind === 'firewall' && a.txId === tx.id)
  const e = d.entry
  const waiting = d.state === 'waiting'
  const until = e ? addWorkingDays(e.date, PAIR_WORKING_DAYS) : null
  const showTax = e?.pool === 'tax' || split.taxHold > 0
  const edit = (patch: Partial<SplitDraft>) => setDraft({ ...split, ...patch })

  const dock = () => {
    if (over) return
    if (dockDelivery(d, d.direction === 'in' ? draft : null)) onDocked()
  }

  return (
    <Modal
      title="Dokowanie dostawy"
      width={560}
      onClose={closeDocking}
      testId="docking-dialog"
      footer={
        <>
          {e && d.state !== 'docked' && (
            <button
              className="btn h-[26px]"
              disabled={readOnly}
              onClick={() => {
                skipEntry(e.id, true)
                closeDocking()
              }}
              title="Te pieniądze nie trafiły do budżetu (np. wypłata na inne konto) – FI nie będzie ich dokować"
              data-testid="docking-skip"
            >
              Pomiń wpis
            </button>
          )}
          <span className="flex-1" />
          <button className="btn h-[26px]" onClick={closeDocking}>
            Anuluj
          </button>
          <button className="btn btn-accent h-[26px]" disabled={readOnly || over} onClick={dock} data-testid="docking-confirm">
            {d.state === 'docked' ? 'Zapisz podział' : d.transaction ? 'Zadokuj' : 'Zadokuj na Portfelu XTB'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-[12px]">
        <section className="flex items-baseline gap-2" data-testid="docking-source">
          <span className="label w-[70px] shrink-0">Źródło</span>
          <span className="min-w-0 flex-1 text-fg-strong">
            {e ? (e.kind === 'withdrawal' ? 'Wypłata z ICTTJ' : 'Zwrot do masy w ICTTJ') : 'Wpływ z XTB'} · {plDate(d.date)}
            {e && (
              <span className="ml-1.5">
                <Badge tone="accent" title="Pula wpisu w ICTTJ">
                  {ICTJ_POOL_LABEL[e.pool]}
                </Badge>
              </span>
            )}
            {e?.note && <span className="ml-1 text-muted">„{e.note}”</span>}
          </span>
          <span className={cx('num text-[14px]', d.direction === 'in' ? 'text-up' : 'text-fg-strong')}>{d.direction === 'in' ? '+' : '−'}{zl(d.amount)}</span>
        </section>
        {!e && d.missingEntry && <p className="border-l-2 border-accent pl-2 text-muted">Bez wpisu w ICTTJ – dokuje zwykłą kolejnością. Dopisz tę wypłatę w ICTTJ (z pulą): FI połączy ją sama.</p>}

        <section className="flex items-baseline gap-2" data-testid="docking-account">
          <span className="label w-[70px] shrink-0">Konto</span>
          {d.transaction ? (
            <span className="text-fg-strong">
              {fleet?.accounts.find((a) => a.id === d.transaction!.accountId)?.name ?? 'konto'} – {d.direction === 'in' ? 'wpływ' : 'wypływ'} {plDate(d.transaction.date)}
              {d.transaction.counterparty && <span className="text-muted"> ({d.transaction.counterparty})</span>}
            </span>
          ) : (
            <span className="flex flex-col">
              <span className="text-fg-strong">Portfel XTB – nowa operacja z dnia {plDate(d.date)}</span>
              <span className="text-[11.5px] text-muted">
                {waiting
                  ? `Wpływ z XTB w mBanku jeszcze nie przyszedł – FI czeka na import do ${until ? plDate(until) : '…'}. Jeśli pieniądze poszły na Portfel XTB, zadokuj teraz.`
                  : `W mBanku nie ma tej kwoty od XTB po ${PAIR_WORKING_DAYS} dniach roboczych – najpewniej Portfel XTB. Potwierdź albo poczekaj na import.`}
              </span>
            </span>
          )}
        </section>

        {d.direction === 'in' ? (
          <section className="flex flex-col gap-1" data-testid="docking-split">
            <div className="flex items-baseline">
              <span className="label flex-1">Podział</span>
              {draft && (
                <button className="text-[11.5px] text-accent hover:underline" onClick={() => setDraft(null)} data-testid="docking-reset">
                  przywróć propozycję
                </button>
              )}
            </div>
            <Row label="Osłony" sub={e?.pool === 'goals' ? 'czego cele nie potrzebują' : 'bufor na pensje (reszta)'}>
              <span className={cx('num', over ? 'text-down' : 'text-fg-strong')} data-testid="docking-shields">
                {zl(shields)}
              </span>
            </Row>
            <Row label="Kadłub" sub="fundusz awaryjny">
              <AmountField className="h-[24px] w-[120px]" value={split.hull} onChange={(v) => edit({ hull: v ?? 0 })} aria-label="Do kadłuba" data-testid="docking-hull" />
            </Row>
            {goals.map((g) => (
              <GoalRow key={g.id} goal={g} value={split.goals[g.id] ?? 0} onChange={(v) => edit({ goals: { ...split.goals, [g.id]: v } })} />
            ))}
            {showTax && (
              <Row label="Podatek" sub="poza budżetem, na PIT-38">
                <AmountField className="h-[24px] w-[120px]" value={split.taxHold} onChange={(v) => edit({ taxHold: v ?? 0 })} aria-label="Na podatek" data-testid="docking-tax" />
              </Row>
            )}
            {over && <p className="text-down">Podział przekracza kwotę dostawy o {zl(-shields)}.</p>}
            {!draft && <p className="text-[11px] text-dim">Propozycja według kolejności dokowania{e?.pool === 'goals' ? ' – pula Cele: prosto do celów, najpierw cele z prognozy ICTTJ' : e?.pool === 'tax' ? ' – pula Podatek: poza budżetem' : ''}.</p>}
          </section>
        ) : (
          <section className={cx('border-l-2 pl-2', firewall ? 'border-down text-down' : 'border-up text-muted')} data-testid="docking-firewall">
            {e?.pool === 'tax'
              ? 'Zwrot z puli Podatek: wraca z rezerwy na PIT-38, nie z budżetu.'
              : firewall
                ? 'Firewall: dopłata do konta tradingowego, gdy osłony albo kadłub nie są pełne – wbrew rozkazowi (czerwony alarm).'
                : 'Dopłata z „wolnego do decyzji” przy pełnych osłonach i kadłubie – zgodnie z rozkazem.'}
          </section>
        )}
      </div>
    </Modal>
  )
}

function Row({ label, sub, children }: { label: string; sub: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-line/60 py-0.5">
      <span className="w-[150px] truncate text-fg-strong">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[11px] text-dim">{sub}</span>
      {children}
    </div>
  )
}

function GoalRow({ goal, value, onChange }: { goal: Goal; value: number; onChange: (v: number) => void }) {
  return (
    <Row label={goal.name} sub={goal.source === 'ictj' ? 'cel z prognozy ICTTJ' : 'cel własny'}>
      <AmountField className="h-[24px] w-[120px]" value={value} onChange={(v) => onChange(v ?? 0)} aria-label={`Do celu ${goal.name}`} data-testid="docking-goal" />
    </Row>
  )
}
