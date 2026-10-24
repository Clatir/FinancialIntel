import { useMemo, useState } from 'react'
import { addMonths, daysInMonth, monthsBetween, warsawNow } from '@shared/calc/dates'
import { glossaryOf } from '@shared/glossary'
import { paymentsIndex } from '@shared/calc/cargoStatus'
import { cycleText, deadText, priceText, SHORT_MONTHS, type DeadContainer, type PriceChange } from '@shared/calc/cargoWatch'
import { amountIn, cyclePosition, nextUnpaidOf, scheduleOf, sinkingInstallment, sinkingSchedule, type FleetState } from '@shared/calc/fleet'
import { sum } from '@shared/calc/operations'
import { monthlyShare, simulateCargo, sinkingOf, type CargoSimulation } from '@shared/calc/plan'
import { dm, rangeText } from '@shared/format'
import { CONTAINER_TYPES, type Container, type ContainerType } from '@shared/schema'
import { listOf, useData, useEntryNewer, useFolderLocked } from '../../store/data'
import { NewerNote } from '../../components/NewerNote'
import { useFocusRecord } from '../../components/focus'
import { useDraft } from '../../store/drafts'
import { useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'
import { AmountField, DateField, MonthField, plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { Columns } from '../../components/layout'
import { Empty, Field, NameInput, NumberField, Panel, Segmented, TextArea, TextField, Toggle, cx } from '../../components/ui'
import { toast } from '../../store/ui'
import { IconPlus } from '../../components/icons'
import { DeleteButton } from '../history/DeleteButton'
import { HistoryButton } from '../history/HistoryDialog'
import { AccountSelect, CategorySelect } from '../operations/pickers'
import { monthGenLabel, monthLabel } from '../../lib/format'
import {
  addContainer,
  archiveContainer,
  clearPast,
  deleteContainer,
  draftFromPayment,
  emptyDraft,
  ignorePrice,
  ignoreProposal,
  keepContainer,
  linkPayments,
  patchContainer,
  payContainer,
  paymentsToLink,
  setInitialTank,
  unignoreProposals,
  updatePrice,
  type ContainerDraft
} from './actions'
import { useCargoStatuses, useCargoWatch } from './status'
import type { CargoStatus } from '@shared/calc/cargoStatus'

const zl = (grosze: number) => `${plnText(grosze)} zł`
const TYPE_LABEL: Record<ContainerType, string> = { fixed: 'stały', subscription: 'abonament', installment: 'rata' }
const CYCLES: Array<[number, string]> = [
  [1, 'co miesiąc'],
  [2, 'co 2 miesiące'],
  [3, 'co kwartał'],
  [6, 'co pół roku'],
  [12, 'co rok']
]
const fmtRange = rangeText
const fmtPct = (p: number | null) => (p == null ? '—' : `${p.toFixed(1).replace('.', ',')}%`)

/**
 * The catch-up installment (N-PC-8) when a periodic container's cycle has fewer months left to `dueMonth` than its full
 * cycle (or its tank is behind plan): returns the actual monthly installment when it differs from `monthlyShare(c)` by
 * more than 1 grosz rounding, else null.
 */
function catchUpRateOf(c: ContainerDraft & { past?: Container['past'] }, month: string, tankAmount = 0, takenThisMonth?: number): number | null {
  if (c.cycleMonths <= 1 || c.amount <= 0) return null
  const nominal = monthlyShare(c)
  if (takenThisMonth != null && takenThisMonth > 0 && Math.abs(takenThisMonth - nominal) > 1) return takenThisMonth
  const rate = sinkingInstallment({ ...c, past: c.past ?? [] }, month, tankAmount)
  return rate > 0 && Math.abs(rate - nominal) > 1 ? rate : null
}

/**
 * A tank's installment as the engine's schedule takes it (N52, T29): the last one carries the rest of the grosze. A fee
 * of a schedule (F23): the cycle up to its next payment – the gaps differ.
 */
function installmentText(c: ContainerDraft, tankAmount = 0): string {
  const m = warsawNow().month
  const pos = cyclePosition(c, m)
  const plan = sinkingSchedule(c.amount, pos.length)
  const first = plan[0] ?? 0
  const last = plan[plan.length - 1] ?? 0
  const text = last === first ? zl(first) : `${zl(first)}, ostatnia ${zl(last)}`
  const base = scheduleOf(c) ? `do najbliższej płatności: ${text}` : text
  const catchUp = catchUpRateOf(c, m, tankAmount)
  return catchUp != null ? `${base}; w tym cyklu z wyrównaniem do terminu: ${zl(catchUp)}/mies.` : base
}

/**
 * Ładownia (spec, „Ładownia i linia zanurzenia”): the containers (fixed costs, subscriptions, installments; every N
 * months = a periodic fee with its tank), the load line (fixed costs as a % of the salary, 40%), the tanks, the
 * simulation of adding and dropping, and the recurring payments of the history as proposals (D70).
 */
export function CargoPage() {
  const fleet = useFleet()
  const containers = useRecordList('containers')
  const transactions = useRecordList('transactions')
  const cargo = useCargoStatuses()
  const readOnly = useFolderLocked()
  const [selected, setSelected] = useState<string | null>(null)
  // A new container's form kept while another screen is looked at (N36); each new draft is a new form (its own „inny…”
  // mode).
  const [form, setForm, clearForm] = useDraft<{ draft: ContainerDraft | null; key: number }>('cargo:container', () => ({ draft: null, key: 0 }))
  const draft = form.draft
  const draftKey = form.key
  const setDraft = (d: ContainerDraft | null) => (d ? setForm((f) => ({ ...f, draft: d })) : clearForm())
  const openDraft = (d: ContainerDraft) => setForm((f) => ({ draft: d, key: f.key + 1 }))
  const [showArchived, setShowArchived] = useState(false)
  // Opened from the palette (F19): selected, the archive shown for an archived one.
  useFocusRecord('container', (id) => {
    setSelected(id)
    if (useData.getState().records.containers[id]?.record.archived) setShowArchived(true)
  })
  const month = fleet?.month ?? ''
  const sorted = useMemo(() => [...containers].sort((a, b) => Number(a.archived) - Number(b.archived) || monthlyShare(b) - monthlyShare(a) || a.name.localeCompare(b.name)), [containers])
  // The history's proposals (D70, F23) and the hold's watch (F9): shared with the bridge and the inbox.
  const watch = useCargoWatch()
  const proposals = watch.proposals
  const ignored = useData((s) => s.fi?.settings.cargo.ignored.length ?? 0)
  if (!fleet) return <Empty>Wczytywanie…</Empty>
  const sim = (change: Parameters<typeof simulateCargo>[1]) =>
    simulateCargo({ shields: fleet.shields.amount, hull: fleet.hull.amount, costs: fleet.costs.average, salary: fleet.plan?.salary ?? null, limitPct: fleet.cargo.limitPct, month, containers, debt: fleet.debt }, change)
  const priceOf = new Map(watch.prices.map((p) => [p.containerId, p]))
  const deadOf = new Map(watch.dead.map((d) => [d.containerId, d]))
  const current = selected ? containers.find((c) => c.id === selected) : undefined
  const visible = sorted.filter((c) => showArchived || !c.archived)
  const status = new Map(cargo.map((x) => [x.containerId, x]))
  const tankById = new Map(fleet.tanks.map((t) => [t.containerId, t]))
  const sinkingTaken = sinkingOf(fleet.log, month)

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-cargo">
      <div className="flex shrink-0 items-baseline gap-3 border-b border-line px-4 py-2.5">
        <h1 className="text-[15px] font-medium text-fg-strong">Ładownia</h1>
        <span className="text-[12px] text-muted">stałe koszty i opłaty okresowe</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="cargo" tracks={['minmax(400px,1.2fr)', 'minmax(340px,1fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <Panel
              title="Kontenery"
              testId="cargo-list"
              actions={
                <>
                  <label className="flex items-center gap-1 text-[11px] text-muted">
                    <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.currentTarget.checked)} /> zarchiwizowane
                  </label>
                  <button className="btn h-[22px]" disabled={readOnly} onClick={() => openDraft(emptyDraft())} data-testid="cargo-add">
                    <IconPlus size={12} /> Kontener
                  </button>
                </>
              }
            >
              {!visible.length ? (
                <Empty>Ładownia jest pusta. Dodaj stałe opłaty (czynsz, abonamenty, raty) albo opłaty okresowe (OC, przeglądy) – także z propozycji z historii.</Empty>
              ) : (
                <div className="flex flex-col text-[12px]">
                  {visible.map((c) => (
                    <button
                      key={c.id}
                      className={cx('flex items-center gap-2 border-b border-line/70 px-1 py-1 text-left last:border-b-0 hover:bg-hover', selected === c.id && 'bg-accent-soft', c.archived && 'opacity-55')}
                      onClick={() => setSelected(c.id === selected ? null : c.id)}
                      data-testid="cargo-row"
                      data-name={c.name}
                      data-focus={`container:${c.id}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-fg-strong">{c.name}</span>
                      {priceOf.has(c.id) && (
                        <span className="text-[10.5px] text-accent" title={priceText(priceOf.get(c.id)!, c, zl)} data-testid="cargo-row-price">
                          {priceOf.get(c.id)!.to > c.amount ? 'cięższy' : 'lżejszy'}
                        </span>
                      )}
                      {deadOf.has(c.id) && (
                        <span className="text-[10.5px] text-accent" title={deadText(deadOf.get(c.id)!)} data-testid="cargo-row-dead">
                          anulowana?
                        </span>
                      )}
                      <span className="text-[11px] text-dim">{TYPE_LABEL[c.type as ContainerType] ?? c.type}</span>
                      <span className="w-[96px] truncate text-right text-[11px] text-muted" title={cycleText(c)}>
                        {cycleText(c)}
                      </span>
                      <StateBadge s={status.get(c.id)} />
                      <span className="num w-[96px] text-right">{zl(c.amount)}</span>
                      <span
                        className="num w-[86px] text-right text-[11px] text-muted"
                        title={(() => {
                          const tk = tankById.get(c.id)
                          const catchUp = !c.archived && !tk?.paidDue ? catchUpRateOf(c, month, tk?.amount ?? 0, sinkingTaken.get(c.id)) : null
                          return catchUp != null
                            ? `Rata nominalna: ${zl(monthlyShare(c))}/mies. · rata wyrównawcza w tym cyklu (do terminu): ${zl(catchUp)}/mies.`
                            : 'Średnio miesięcznie (opłata okresowa: rata zbiornika, ostatnia z resztą groszy)'
                        })()}
                      >
                        {zl(monthlyShare(c))}/m
                        {(() => {
                          const tk = tankById.get(c.id)
                          const catchUp = !c.archived && !tk?.paidDue ? catchUpRateOf(c, month, tk?.amount ?? 0, sinkingTaken.get(c.id)) : null
                          return catchUp != null ? (
                            <span className="ml-1 text-[10px] text-accent" data-testid="cargo-row-catchup">
                              ({zl(catchUp)})
                            </span>
                          ) : null
                        })()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
            {draft && <NewContainer key={draftKey} draft={draft} setDraft={setDraft} sim={sim(draft.amount > 0 ? { add: draft } : {})} limitPct={fleet.cargo.limitPct} onAdded={(id) => setSelected(id)} />}
            {current && (
              <ContainerEditor
                key={current.id}
                c={current}
                status={status.get(current.id)}
                readOnly={readOnly}
                onDeleted={() => setSelected(null)}
                sim={sim({ drop: current.id })}
                price={priceOf.get(current.id)}
                priceSim={priceOf.has(current.id) ? sim({ amount: { id: current.id, to: priceOf.get(current.id)!.to } }) : undefined}
                dead={deadOf.get(current.id)}
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <LoadLine fleet={fleet} />
            <Tanks fleet={fleet} containers={containers} />
            <Panel title="Z historii – propozycje" testId="cargo-proposals">
              {!proposals.length ? (
                <Empty>Brak powtarzających się płatności w historii (albo wszystkie są już w ładowni).</Empty>
              ) : (
                <div className="flex flex-col text-[12px]">
                  <p className="mb-1 text-[11px] text-dim">
                    Ten sam kontrahent co miesiąc, co 2, 3 albo 6 miesięcy, co rok albo w stałych miesiącach roku; rachunek o zmiennej kwocie – z kwotą z roku (75. percentyl). Każdą propozycję trzeba potwierdzić.
                  </p>
                  {proposals.map((p) => (
                    <div key={p.key} className="flex items-center gap-2 border-b border-line/70 py-1 last:border-b-0" data-testid="cargo-proposal" data-name={p.label} data-cycle={p.cycleMonths}>
                      <span className="min-w-0 flex-1 truncate">
                        {p.label}
                        {p.fresh && <span className="ml-1.5 text-[10.5px] text-accent">nowa</span>}
                      </span>
                      <span className="max-w-[170px] truncate text-[11px] text-muted" title={cycleText(p)} data-testid="cargo-proposal-cycle">
                        {cycleText(p)}
                        {p.variable ? ' · zmienna' : ''}
                      </span>
                      <span className="num w-[90px] text-right">{zl(p.amount)}</span>
                      <button className="btn h-[22px]" disabled={readOnly} onClick={() => openDraft(draftFromPayment(p))} data-testid="cargo-proposal-add">
                        Do ładowni
                      </button>
                      <button className="btn btn-ghost h-[22px] px-1.5 text-[11px]" disabled={readOnly} onClick={() => ignoreProposal(p)} title="Ta płatność nie jest stałą opłatą – nie proponuj jej więcej" data-testid="cargo-proposal-ignore">
                        Nie proponuj
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {ignored > 0 && (
                <button
                  type="button"
                  className="mt-1 self-start text-[11px] text-muted hover:text-fg-strong hover:underline"
                  disabled={readOnly}
                  onClick={() => unignoreProposals(useData.getState().fi?.settings.cargo.ignored ?? [])}
                  data-testid="cargo-proposals-unignore"
                >
                  Ukryte propozycje: {ignored} – proponuj znowu
                </button>
              )}
            </Panel>
          </div>
        </Columns>
      </div>
    </div>
  )
}

function SimulationLine({ sim, verb, note }: { sim: CargoSimulation; verb: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-[11.5px]" data-testid="cargo-sim">
      <div>
        Masa ładunku: <span className="num">{fmtPct(sim.before.pct)}</span> → <span className={cx('num', sim.after.over && 'text-down')}>{fmtPct(sim.after.pct)}</span> pensji (
        {zl(sim.before.monthly)} → {zl(sim.after.monthly)} miesięcznie)
      </div>
      <div className="text-muted">
        Zasięg {verb}: <span className="num">{fmtRange(sim.rangeBefore)}</span> → <span className="num">{fmtRange(sim.rangeAfter)}</span>
        <span className="text-dim"> ({note ?? `jeśli to ${verb === 'po dodaniu' ? 'nowy koszt' : 'koszt, który znika'}`})</span>
      </div>
    </div>
  )
}

function ContainerFields({ c, set, saved, paidDue }: { c: ContainerDraft; set: (p: Partial<ContainerDraft>) => void; saved?: boolean; paidDue?: string | null }) {
  // „inny…” chosen stays chosen while its number is typed (B1): the mode is the field's, not read from the value; so is
  // „harmonogram…” while its months are picked (F23).
  const [mode, setMode] = useState<'cycle' | 'other' | 'schedule'>(() => (c.schedule.length && c.cycleMonths > 1 ? 'schedule' : CYCLES.some(([m]) => m === c.cycleMonths) ? 'cycle' : 'other'))
  const custom = mode === 'other' || (mode === 'cycle' && !CYCLES.some(([m]) => m === c.cycleMonths))
  const months = [...c.schedule].sort((a, b) => a - b)
  const toggleMonth = (m: number) => set({ cycleMonths: 12, schedule: months.includes(m) ? months.filter((x) => x !== m) : [...months, m].sort((a, b) => a - b) })
  // The next payment still to make from today on (B63) – as the Radar and the briefing count it: never a date of a
  // past cycle, nor this cycle's when its tank paid it already.
  const next = nextUnpaidOf(c, warsawNow().date, paidDue)
  return (
    <div className="flex flex-col gap-2 text-[12px]">
      <Field label="Nazwa">
        {saved ? (
          <NameInput value={c.name} onChange={(name) => set({ name })} emptyMessage="Kontener musi mieć nazwę – zostaje poprzednia." maxLength={80} aria-label="Nazwa kontenera" data-testid="container-name" />
        ) : (
          <TextField value={c.name} onChange={(name) => set({ name })} maxLength={80} placeholder="np. Czynsz, Netflix, OC" data-testid="container-name" />
        )}
      </Field>
      <Field label="Rodzaj">
        <Segmented size="sm" value={c.type as ContainerType} onChange={(type) => set({ type })} options={CONTAINER_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} aria-label="Rodzaj kontenera" />
      </Field>
      <Field label="Kwota płatności">
        <div className="flex items-center gap-2">
          <AmountField className="w-[120px]" value={c.amount} onChange={(v) => set({ amount: v ?? 0 })} aria-label="Kwota" data-testid="container-amount" />
          <span className="text-muted">zł</span>
        </div>
      </Field>
      <Field label="Cykl" hint={c.cycleMonths > 1 ? `Opłata okresowa: co miesiąc z energii idzie rata do zbiornika (${installmentText(c)} – odkładka).` : undefined}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <select
              className="input w-[150px]"
              value={mode === 'schedule' ? -1 : custom ? 0 : c.cycleMonths}
              onChange={(e) => {
                // „inny…” only opens the field: nothing is saved before its number is typed; „harmonogram…” starts with
                // the month of its payment date (F23).
                const n = Number(e.currentTarget.value)
                if (n === -1) {
                  setMode('schedule')
                  set({ cycleMonths: 12, schedule: months.length ? months : [Number(c.dueMonth.slice(5, 7))] })
                } else if (n === 0) setMode('other')
                else {
                  setMode('cycle')
                  set({ cycleMonths: n, schedule: [] })
                }
              }}
              aria-label="Cykl"
              data-testid="container-cycle"
            >
              {CYCLES.map(([m, label]) => (
                <option key={m} value={m}>
                  {label}
                </option>
              ))}
              <option value={0}>inny…</option>
              <option value={-1}>harmonogram…</option>
            </select>
            {custom && (
              <NumberField
                className="w-[60px]"
                value={c.cycleMonths}
                commitOnBlur
                isValid={(v) => v != null && Number.isInteger(v) && v >= 1 && v <= 60}
                onChange={(v) => v != null && set({ cycleMonths: v, schedule: [] })}
                onReject={() => toast('Cykl to od 1 do 60 miesięcy – zostaje poprzedni.', 'error')}
                aria-label="Miesięcy"
                data-testid="container-cycle-months"
              />
            )}
          </div>
          {mode === 'schedule' && (
            <div className="flex flex-col gap-1" data-testid="container-schedule">
              <div className="flex flex-wrap gap-1">
                {SHORT_MONTHS.map((name, i) => (
                  <button key={name} type="button" className="chip" aria-pressed={months.includes(i + 1)} onClick={() => toggleMonth(i + 1)} data-testid="container-schedule-month" data-month={i + 1}>
                    {name}
                  </button>
                ))}
              </div>
              <span className={cx('text-[11px]', scheduleOf(c) ? 'text-dim' : 'text-accent')}>
                {scheduleOf(c) ? 'Płatność w zaznaczonych miesiącach (dzień z daty płatności), każda w kwocie płatności.' : 'Zaznacz od 2 do 11 miesięcy – inaczej liczy się jak opłata co rok.'}
              </span>
            </div>
          )}
        </div>
      </Field>
      <Field label="Kwota zmienna" hint={c.variable ? 'Rachunek o zmiennej kwocie (prąd, woda): kwota kontenera = 75. percentyl płatności z roku; Ładownia zaproponuje nową, gdy rok się zmieni o ponad 10%.' : undefined}>
        <Toggle checked={c.variable} onChange={(variable) => set({ variable })} label="rachunek – kwota z historii płatności" data-testid="container-variable" />
      </Field>
      <Field label="Płatność" hint={c.cycleMonths > 1 ? `Najbliższa: ${next.slice(8, 10)}.${next.slice(5, 7)}.${next.slice(0, 4)}` : `Co miesiąc, ${c.dueDay}. dnia`}>
        <DateField
          className="w-[110px]"
          value={`${c.dueMonth}-${String(Math.min(c.dueDay, daysInMonth(c.dueMonth))).padStart(2, '0')}`}
          onChange={(d) => d && set({ dueMonth: d.slice(0, 7), dueDay: Number(d.slice(8, 10)) })}
          aria-label="Data płatności"
          data-testid="container-due"
        />
      </Field>
      <Field label="Konto">
        <AccountSelect className="w-[200px]" value={c.accountId} onChange={(accountId) => set({ accountId })} none="dowolne" />
      </Field>
      <Field label="Kategoria">
        <CategorySelect value={c.categoryId} onChange={(categoryId) => set({ categoryId })} />
      </Field>
      <Field label="Odbiorca w banku" hint="Płatności tego odbiorcy z importu trafią do tego kontenera (nie do kopert).">
        <TextField commit value={c.counterparty} onChange={(counterparty) => set({ counterparty })} maxLength={300} placeholder="jak w wyciągu, np. NETFLIX.COM" data-testid="container-counterparty" />
      </Field>
      <Field label="Okres" hint="Puste = bez końca; rata z ostatnim miesiącem.">
        <div className="flex items-center gap-2 text-muted">
          od
          <MonthField className="w-[90px]" value={c.from} allowEmpty onChange={(from) => set({ from })} aria-label="Od miesiąca" data-testid="container-from" />
          do
          <MonthField className="w-[90px]" value={c.until} allowEmpty onChange={(until) => set({ until })} aria-label="Do miesiąca" data-testid="container-until" />
        </div>
      </Field>
      <Field label="Notatka">
        <TextArea commit value={c.note} onChange={(note) => set({ note })} rows={2} />
      </Field>
    </div>
  )
}

function NewContainer({ draft, setDraft, sim, limitPct, onAdded }: { draft: ContainerDraft; setDraft: (d: ContainerDraft | null) => void; sim: CargoSimulation; limitPct: number; onAdded: (id: string) => void }) {
  const [confirmOver, setConfirmOver] = useState(false)
  const over = draft.amount > 0 && sim.after.over
  const add = () => {
    const id = addContainer({ ...draft, name: draft.name.trim() })
    if (id) {
      setDraft(null)
      onAdded(id)
    }
  }
  return (
    <Panel title="Nowy kontener" testId="cargo-new">
      <ContainerFields c={draft} set={(p) => setDraft({ ...draft, ...p })} />
      {draft.amount > 0 && (
        <div className={cx('mt-2 border-l-2 pl-2', over ? 'border-down' : 'border-line-strong')}>
          {over && (
            <div className="text-[12px] text-down" data-testid="cargo-over-warning">
              Ponad linię zanurzenia: {fmtPct(sim.after.pct)} pensji, limit {limitPct}%.
            </div>
          )}
          <SimulationLine sim={sim} verb="po dodaniu" />
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {over && !confirmOver ? (
          <button className="btn btn-accent h-[24px]" disabled={!draft.name.trim() || draft.amount <= 0} onClick={() => setConfirmOver(true)} data-testid="cargo-new-save">
            Dodaj mimo przekroczenia…
          </button>
        ) : (
          <button className="btn btn-accent h-[24px]" disabled={!draft.name.trim() || draft.amount <= 0} onClick={add} data-testid={over ? 'cargo-new-confirm' : 'cargo-new-save'}>
            {over ? 'Tak, dodaj ponad linię' : 'Dodaj do ładowni'}
          </button>
        )}
        <button className="btn h-[24px]" onClick={() => setDraft(null)}>
          Anuluj
        </button>
      </div>
    </Panel>
  )
}

function ContainerEditor({
  c,
  status,
  readOnly: folderLocked,
  onDeleted,
  sim,
  price,
  priceSim,
  dead
}: {
  c: Container
  status: CargoStatus | undefined
  readOnly: boolean
  onDeleted: () => void
  sim: CargoSimulation
  /** The hold's watch (F9): its payments at a new price, its payments missing. */
  price?: PriceChange
  priceSim?: CargoSimulation
  dead?: DeadContainer
}) {
  const paidDue = useFleet()?.tanks.find((t) => t.containerId === c.id)?.paidDue ?? null
  // Written by a newer version of the app (B67): looked at, not changed here.
  const newer = useEntryNewer('containers', c.id)
  const readOnly = folderLocked || newer
  return (
    <Panel
      title={`Kontener: ${c.name}`}
      name="Kontener"
      testId="cargo-editor"
      actions={
        <>
          <HistoryButton kind="containers" id={c.id} current={c} small />
          {!readOnly && (
            <DeleteButton
              title="Usuń kontener"
              onConfirm={() => {
                onDeleted()
                void deleteContainer(c)
              }}
              testId="container-delete"
            />
          )}
        </>
      }
    >
      <fieldset disabled={readOnly} className="flex flex-col gap-2">
        <NewerNote show={newer} />
        {price && priceSim && <PriceWatch c={c} p={price} sim={priceSim} />}
        {dead && !c.archived && <DeadWatch c={c} d={dead} sim={sim} />}
        {status && <ThisMonth c={c} s={status} />}
        <ContainerFields c={c} set={(p) => patchContainer(c.id, p)} saved paidDue={paidDue} />
        <AmountHistory c={c} />
        {c.counterparty.trim() && <LinkPayments c={c} />}
        <Toggle checked={c.archived} onChange={(archived) => archiveContainer(c, archived)} label="Zarchiwizowany (zrzucony z ładowni)" data-testid="container-archived" />
        {!c.archived && (
          <div className="border-l-2 border-line-strong pl-2">
            <span className="label">Symulacja zrzutu</span>
            <SimulationLine sim={sim} verb="po zrzucie" />
          </div>
        )}
      </fieldset>
    </Panel>
  )
}

const mmyyyy = (month: string) => `${month.slice(5, 7)}.${month.slice(0, 4)}`

/**
 * „Kontener cięższy niż w manifeście” (F9): its latest payments at a new price – the simulation of the new amount
 * before it is taken (T50), „Zaktualizuj” from this month on or „To nie zmiana ceny”.
 */
function PriceWatch({ c, p, sim }: { c: Container; p: PriceChange; sim: CargoSimulation }) {
  const month = warsawNow().month
  return (
    <div className="flex flex-col gap-1 border-l-2 border-accent pl-2 text-[12px]" data-testid="container-price">
      <span className="label text-accent">Kontener {p.to > p.from ? 'cięższy' : 'lżejszy'} niż w manifeście</span>
      <span className="text-fg-strong">{priceText(p, c, zl)}</span>
      <span className="text-[11px] text-dim">
        {p.basis === 'variable' ? `Rok płatności (${p.payments.length}): 75. percentyl ${zl(p.to)}.` : `Płatności: ${p.payments.map((x) => `${dm(x.date)} ${zl(x.amount)}`).join(' · ')}.`}
      </span>
      <SimulationLine sim={sim} verb="po zmianie" note="z nową kwotą od tego miesiąca" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-accent h-[22px]" onClick={() => updatePrice(c, p.to)} data-testid="container-price-update">
          Zaktualizuj od {monthGenLabel(month)}
        </button>
        <button type="button" className="btn h-[22px]" onClick={() => ignorePrice(c, p.to)} data-testid="container-price-ignore">
          To nie zmiana ceny
        </button>
      </div>
    </div>
  )
}

/** „Kontener bez płatności” (F9): its last dues without a payment – drop it (the simulation first) or keep it. */
function DeadWatch({ c, d, sim }: { c: Container; d: DeadContainer; sim: CargoSimulation }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-accent pl-2 text-[12px]" data-testid="container-dead">
      <span className="label text-accent">Kontener bez płatności</span>
      <span className="text-fg-strong">{deadText(d)}</span>
      <span className="text-[11px] text-dim">Terminy bez płatności: {d.missed.map(dm).join(', ')}.</span>
      <SimulationLine sim={sim} verb="po zrzucie" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-accent h-[22px]" onClick={() => archiveContainer(c, true)} data-testid="container-dead-drop">
          Zrzuć z ładowni
        </button>
        <button type="button" className="btn h-[22px]" onClick={() => keepContainer(c)} data-testid="container-dead-keep">
          Nadal płacę
        </button>
      </div>
    </div>
  )
}

/** Its amounts through time and its latest payments (F9): a raise counts from its month, the months before as they were. */
function AmountHistory({ c }: { c: Container }) {
  const transactions = useData((s) => s.records.transactions)
  const linked = useMemo(() => (paymentsIndex(listOf(transactions)).byContainer.get(c.id) ?? []).slice(-6), [transactions, c.id])
  const past = [...c.past].sort((a, b) => a.until.localeCompare(b.until))
  if (!past.length && !linked.length) return null
  const since = past.length ? `od ${mmyyyy(addMonths(past[past.length - 1]!.until, 1))}: ` : ''
  return (
    <div className="flex flex-col gap-0.5 text-[11.5px]" data-testid="container-history">
      <span className="label">Historia kwot</span>
      {past.length > 0 && (
        <span data-testid="container-history-amounts">
          {past.map((x) => `do ${mmyyyy(x.until)}: ${zl(x.amount)}`).join(' · ')} · {since}
          {zl(c.amount)}
        </span>
      )}
      {linked.length > 0 && (
        <span className="text-muted" data-testid="container-history-payments">
          Ostatnie płatności: {linked.map((x) => `${dm(x.date)} ${zl(x.amount)}`).join(' · ')}
        </span>
      )}
      {past.length > 0 && (
        <button type="button" className="self-start text-[11px] text-accent hover:underline" onClick={() => clearPast(c)} title="Poprawka pomyłki, nie podwyżka: obecna kwota także we wcześniejszych miesiącach" data-testid="container-history-clear">
          Jedna kwota we wszystkich miesiącach
        </button>
      )}
    </div>
  )
}

/** This month's state of a fixed fee (F1): paid on its day, its due ahead, waiting for the bank's file, or overdue. */
function stateText(s: CargoStatus): string {
  if (s.state === 'paid') return `zapłacone ${dm(s.payments.at(-1)?.date ?? s.due)}`
  if (s.state === 'overdue') return `po terminie · ${dm(s.due)}`
  return s.importPending ? `czeka na import · ${dm(s.due)}` : `termin ${dm(s.due)}`
}

function StateBadge({ s }: { s: CargoStatus | undefined }) {
  return (
    <span className={cx('w-[132px] truncate text-right text-[11px]', s?.state === 'overdue' ? 'text-accent' : 'text-muted')} data-testid="cargo-state" data-state={s?.state}>
      {s ? stateText(s) : ''}
    </span>
  )
}

/** The fee in this month (F1): its payments, its due and where it comes from; „Zapłacone” for a payment no file shows. */
function ThisMonth({ c, s }: { c: Container; s: CargoStatus }) {
  const day = s.dayFrom === 'history' ? `dzień płatności z historii: ${s.day}.` : `dzień płatności kontenera: ${s.day}.`
  return (
    <div className={cx('flex flex-col gap-1 border-l-2 pl-2 text-[12px]', s.state === 'overdue' ? 'border-accent' : 'border-line-strong')} data-testid="container-month" data-state={s.state}>
      <span className="label">W tym miesiącu</span>
      {s.state === 'paid' ? (
        <span className="text-fg-strong">
          Zapłacone: {s.payments.map((p) => `${zl(p.amount)} (${dm(p.date)})`).join(', ')}
        </span>
      ) : (
        <span className={s.state === 'overdue' ? 'text-accent' : 'text-fg-strong'}>
          {s.state === 'overdue'
            ? `Po terminie – termin ${dm(s.due)} minął, płatności brak.`
            : s.importPending
              ? `Termin ${dm(s.due)} minął – czeka na plik z banku, który obejmie te dni.`
              : `Termin: ${dm(s.due)} – ${zl(c.amount)}.`}
        </span>
      )}
      <span className="text-[11px] text-dim">
        {day} Płatność z importu łączy się sama (po odbiorcy); zapłaconą gotówką albo z konta bez importu zapisz tutaj.
      </span>
      {s.state !== 'paid' &&
        // Paid today counts for this due only from its window on – earlier it would be the previous due's payment.
        (warsawNow().date >= s.from ? (
          <button type="button" className="btn h-[22px] self-start" onClick={() => payContainer(c)} data-testid="container-paid">
            Zapłacone ({zl(c.amount)}, dziś)
          </button>
        ) : (
          <span className="text-[11px] text-dim" data-testid="container-paid-from">
            „Zapłacone” od {dm(s.from)} – płatność wcześniejsza należy do poprzedniego terminu.
          </span>
        ))}
    </div>
  )
}

/** Payments of the counterparty typed by hand or imported before the container: link them in one click. */
function LinkPayments({ c }: { c: Container }) {
  // Counted when the operations, the payee or the budget's start change – never at every render (W6).
  const transactions = useRecordList('transactions')
  const start = useData((s) => s.fi?.settings.budget.start ?? null)
  // The containers' ids only (B58: a payment of a deleted one is free to link) – not their every edit.
  const ids = useRecordList('containers')
    .map((x) => x.id)
    .join('\u0001')
  const n = useMemo(() => paymentsToLink(c.counterparty, transactions, start, new Set(ids.split('\u0001'))), [c.counterparty, transactions, start, ids])
  if (!n) return null
  return (
    <button type="button" className="self-start text-[11.5px] text-accent hover:underline" onClick={() => linkPayments(c.id, c.counterparty)} data-testid="container-link">
      Połącz płatności „{c.counterparty}” z tym kontenerem ({n})
    </button>
  )
}

function LoadLine({ fleet }: { fleet: FleetState }) {
  const c = fleet.cargo
  return (
    <Panel title="Linia zanurzenia" hint={glossaryOf('Ładownia')} testId="cargo-load-line">
      <div className="flex flex-col gap-1.5 text-[12px]">
        <div className="flex items-baseline gap-2">
          <span className="text-muted">Masa ładunku</span>
          <span className={cx('num text-[18px]', c.over ? 'text-down' : 'text-fg-strong')} data-testid="cargo-mass">
            {fmtPct(c.pct)}
          </span>
          <span className="text-[11.5px] text-dim">
            pensji · linia {c.limitPct}% · {zl(c.monthly)} miesięcznie
          </span>
        </div>
        <Meter value={c.pct ?? 0} max={100} mark={c.limitPct / 100} />
        {c.pct == null && <p className="text-[11.5px] text-dim">Bez pensji w planie miesiąca nie ma z czym porównać.</p>}
        {c.over && <p className="text-[11.5px] text-down">Ładunek (stałe koszty) ponad linią zanurzenia – zjadają za dużo pensji.</p>}
        <p className="text-[11px] text-dim">Opłaty okresowe liczą się miesięczną częścią (np. OC 1 240 zł rocznie ≈ 103,33 zł miesięcznie).</p>
      </div>
    </Panel>
  )
}

function Tanks({ fleet, containers }: { fleet: FleetState; containers: Container[] }) {
  const readOnly = useFolderLocked()
  const initialTanks = useData((s) => s.fi?.settings.budget.initial?.tanks)
  const startMonth = fleet.start ? fleet.start.slice(0, 7) : null
  return (
    <Panel title="Odkładki" hint={glossaryOf('Zbiornik')} testId="cargo-tanks">
      {!fleet.tanks.length ? (
        <Empty>Brak opłat okresowych – dodaj kontener z cyklem dłuższym niż miesiąc (np. OC co rok).</Empty>
      ) : (
        <div className="flex flex-col gap-2 text-[12px]">
          {fleet.tanks.map((t) => {
            const c = containers.find((x) => x.id === t.containerId)
            const pos = c ? cyclePosition(c, fleet.month) : null
            // The plan with this month's installment (the engine takes it on the 1st); a cycle paid already has no gap (B6).
            const expected = c && pos && !t.paidDue ? sum(sinkingSchedule(amountIn(c, fleet.month), pos.length).slice(0, pos.index + 1)) : null
            const short = expected != null ? expected - t.amount : 0
            const months = monthsBetween(fleet.month, t.dueMonth)
            const posStart = c && startMonth && (!c.from || c.from <= startMonth) ? cyclePosition(c, startMonth) : null
            const preStart = c && posStart && posStart.index > 0 ? sum(sinkingSchedule(amountIn(c, startMonth!), posStart.length).slice(0, posStart.index)) : 0
            const canFill = !readOnly && short > 0 && preStart > (initialTanks?.[t.containerId] ?? 0)
            return (
              <div key={t.containerId} className="flex flex-col gap-0.5" data-testid="cargo-tank" data-name={t.name}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span className="text-[11px] text-dim">
                    termin {monthLabel(t.dueMonth)}
                    {months > 0 ? ` (za ${months} mies.)` : ' (w tym miesiącu)'}
                  </span>
                  <span className="num">
                    {zl(t.amount)} / {zl(t.due)}
                  </span>
                </div>
                <Meter value={t.amount} max={t.due} />
                {t.paidDue && (
                  <span className="text-[11px] text-dim" data-testid="cargo-tank-paid">
                    Opłata za {monthLabel(t.paidDue)} zapłacona – zbiornik zbiera na następny termin.
                  </span>
                )}
                {short > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-accent" data-testid="cargo-tank-catchup">
                      Za planem o {zl(short)} – kolejne raty będą większe
                      {c ? ` (rata wyrównawcza ${zl(sinkingInstallment(c, months > 0 ? addMonths(fleet.month, 1) : fleet.month, t.amount))}/mies. zamiast nominalnej ${zl(monthlyShare(c))}/mies.)` : ''}.
                    </span>
                    {canFill && (
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => setInitialTank(t.containerId, t.name, preStart)}
                        title="Przeznacz część obecnych osłon na stan początkowy tego zbiornika (za miesiące cyklu przed startem budżetu)"
                        data-testid="cargo-tank-fill"
                      >
                        Wyrównaj ze startu ({zl(preStart)} z osłon)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          <p className="text-[11px] text-dim">Opłata płacona z kontenerem (w Operacjach „Ładownia”) idzie ze zbiornika; brak – z energii (żółty alarm).</p>
        </div>
      )}
    </Panel>
  )
}

