import { useMemo, useState } from 'react'
import { daysInMonth, monthsBetween, warsawNow } from '@shared/calc/dates'
import { cyclePosition, nextUnpaidOf, sinkingSchedule, type FleetState } from '@shared/calc/fleet'
import { sum } from '@shared/calc/operations'
import { monthlyShare, recurringPayments, simulateCargo, type CargoSimulation } from '@shared/calc/plan'
import { rangeText } from '@shared/format'
import { CONTAINER_TYPES, type Container, type ContainerType } from '@shared/schema'
import { useData, useEntryNewer, useFolderLocked } from '../../store/data'
import { NewerNote } from '../../components/NewerNote'
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
import { monthLabel } from '../../lib/format'
import { addContainer, archiveContainer, deleteContainer, draftFromPayment, emptyDraft, linkPayments, patchContainer, payContainer, paymentsToLink, type ContainerDraft } from './actions'
import { useCargoStatuses } from './status'
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
const cycleLabel = (n: number) => CYCLES.find(([m]) => m === n)?.[1] ?? `co ${n} mies.`
const fmtRange = rangeText
const fmtPct = (p: number | null) => (p == null ? '—' : `${p.toFixed(1).replace('.', ',')}%`)

/** A tank's installment as the engine's schedule takes it (N52, T29): the last one carries the rest of the grosze. */
function installmentText(amount: number, cycleMonths: number): string {
  const plan = sinkingSchedule(amount, cycleMonths)
  const first = plan[0] ?? 0
  const last = plan[plan.length - 1] ?? 0
  return last === first ? zl(first) : `${zl(first)}, ostatnia ${zl(last)}`
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
  const month = fleet?.month ?? ''
  const sorted = useMemo(() => [...containers].sort((a, b) => Number(a.archived) - Number(b.archived) || monthlyShare(b) - monthlyShare(a) || a.name.localeCompare(b.name)), [containers])
  // The proposals change with the payees of the containers only – not with a note or an amount (W6).
  const payees = containers
    .filter((c) => !c.archived)
    .map((c) => c.counterparty)
    .join('\u0001')
  // The months the engine's averages read (B23, B25): the same proposals as the wizard's and the month plan's.
  const history = fleet?.historyMonths
  const proposals = useMemo(() => (month ? recurringPayments(transactions, month, containers, history) : []), [transactions, month, payees, history])
  if (!fleet) return <Empty>Wczytywanie…</Empty>
  const sim = (change: { add?: ContainerDraft; drop?: string }) =>
    simulateCargo({ shields: fleet.shields.amount, hull: fleet.hull.amount, costs: fleet.costs.average, salary: fleet.plan?.salary ?? null, limitPct: fleet.cargo.limitPct, month, containers, debt: fleet.debt }, change)
  const current = selected ? containers.find((c) => c.id === selected) : undefined
  const visible = sorted.filter((c) => showArchived || !c.archived)
  const status = new Map(cargo.map((x) => [x.containerId, x]))

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
                    >
                      <span className="min-w-0 flex-1 truncate text-fg-strong">{c.name}</span>
                      <span className="text-[11px] text-dim">{TYPE_LABEL[c.type as ContainerType] ?? c.type}</span>
                      <span className="w-[96px] text-right text-[11px] text-muted">{cycleLabel(c.cycleMonths)}</span>
                      <StateBadge s={status.get(c.id)} />
                      <span className="num w-[96px] text-right">{zl(c.amount)}</span>
                      <span className="num w-[86px] text-right text-[11px] text-muted" title="Średnio miesięcznie (opłata okresowa: rata zbiornika, ostatnia z resztą groszy)">
                        {zl(monthlyShare(c))}/m
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
            {draft && <NewContainer key={draftKey} draft={draft} setDraft={setDraft} sim={sim(draft.amount > 0 ? { add: draft } : {})} limitPct={fleet.cargo.limitPct} onAdded={(id) => setSelected(id)} />}
            {current && <ContainerEditor key={current.id} c={current} status={status.get(current.id)} readOnly={readOnly} onDeleted={() => setSelected(null)} sim={sim({ drop: current.id })} />}
          </div>
          <div className="flex min-w-0 flex-col">
            <LoadLine fleet={fleet} />
            <Tanks fleet={fleet} containers={containers} />
            <Panel title="Z historii – propozycje" testId="cargo-proposals">
              {!proposals.length ? (
                <Empty>Brak powtarzających się płatności w historii (albo wszystkie są już w ładowni).</Empty>
              ) : (
                <div className="flex flex-col text-[12px]">
                  <p className="mb-1 text-[11px] text-dim">Ten sam kontrahent i podobna kwota co miesiąc albo co rok. Każdą propozycję trzeba potwierdzić.</p>
                  {proposals.map((p) => (
                    <div key={p.key} className="flex items-center gap-2 border-b border-line/70 py-1 last:border-b-0" data-testid="cargo-proposal" data-name={p.label}>
                      <span className="min-w-0 flex-1 truncate">{p.label}</span>
                      <span className="text-[11px] text-muted">{cycleLabel(p.cycleMonths)}</span>
                      <span className="num w-[90px] text-right">{zl(p.amount)}</span>
                      <button className="btn h-[22px]" disabled={readOnly} onClick={() => openDraft(draftFromPayment(p))} data-testid="cargo-proposal-add">
                        Do ładowni
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </Columns>
      </div>
    </div>
  )
}

function SimulationLine({ sim, verb }: { sim: CargoSimulation; verb: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-[11.5px]" data-testid="cargo-sim">
      <div>
        Masa ładunku: <span className="num">{fmtPct(sim.before.pct)}</span> → <span className={cx('num', sim.after.over && 'text-down')}>{fmtPct(sim.after.pct)}</span> pensji (
        {zl(sim.before.monthly)} → {zl(sim.after.monthly)} miesięcznie)
      </div>
      <div className="text-muted">
        Zasięg {verb}: <span className="num">{fmtRange(sim.rangeBefore)}</span> → <span className="num">{fmtRange(sim.rangeAfter)}</span>
        <span className="text-dim"> (jeśli to {verb === 'po dodaniu' ? 'nowy koszt' : 'koszt, który znika'})</span>
      </div>
    </div>
  )
}

function ContainerFields({ c, set, saved, paidDue }: { c: ContainerDraft; set: (p: Partial<ContainerDraft>) => void; saved?: boolean; paidDue?: string | null }) {
  // „inny…” chosen stays chosen while its number is typed (B1): the mode is the field's, not read from the value.
  const [otherCycle, setOtherCycle] = useState(() => !CYCLES.some(([m]) => m === c.cycleMonths))
  const custom = otherCycle || !CYCLES.some(([m]) => m === c.cycleMonths)
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
      <Field label="Cykl" hint={c.cycleMonths > 1 ? `Opłata okresowa: co miesiąc z energii idzie rata do zbiornika (${installmentText(c.amount, c.cycleMonths)} – odkładka).` : undefined}>
        <div className="flex items-center gap-2">
          <select
            className="input w-[150px]"
            value={custom ? 0 : c.cycleMonths}
            onChange={(e) => {
              // „inny…” only opens the field: nothing is saved before its number is typed.
              const n = Number(e.currentTarget.value)
              setOtherCycle(!n)
              if (n) set({ cycleMonths: n })
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
          </select>
          {custom && (
            <NumberField
              className="w-[60px]"
              value={c.cycleMonths}
              commitOnBlur
              isValid={(v) => v != null && Number.isInteger(v) && v >= 1 && v <= 60}
              onChange={(v) => v != null && set({ cycleMonths: v })}
              onReject={() => toast('Cykl to od 1 do 60 miesięcy – zostaje poprzedni.', 'error')}
              aria-label="Miesięcy"
              data-testid="container-cycle-months"
            />
          )}
        </div>
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

function ContainerEditor({ c, status, readOnly: folderLocked, onDeleted, sim }: { c: Container; status: CargoStatus | undefined; readOnly: boolean; onDeleted: () => void; sim: CargoSimulation }) {
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
        {status && <ThisMonth c={c} s={status} />}
        <ContainerFields c={c} set={(p) => patchContainer(c.id, p)} saved paidDue={paidDue} />
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

const dm = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`

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
    <Panel title="Linia zanurzenia" testId="cargo-load-line">
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
  return (
    <Panel title="Odkładki" testId="cargo-tanks">
      {!fleet.tanks.length ? (
        <Empty>Brak opłat okresowych – dodaj kontener z cyklem dłuższym niż miesiąc (np. OC co rok).</Empty>
      ) : (
        <div className="flex flex-col gap-2 text-[12px]">
          {fleet.tanks.map((t) => {
            const c = containers.find((x) => x.id === t.containerId)
            const pos = c ? cyclePosition(c, fleet.month) : null
            // The plan with this month's installment (the engine takes it on the 1st); a cycle paid already has no gap (B6).
            const expected = c && pos && !t.paidDue ? sum(sinkingSchedule(c.amount, c.cycleMonths).slice(0, pos.index + 1)) : null
            const short = expected != null ? expected - t.amount : 0
            const months = monthsBetween(fleet.month, t.dueMonth)
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
                {short > 0 && <span className="text-[11px] text-accent">Za planem o {zl(short)} – kolejne raty będą większe.</span>}
              </div>
            )
          })}
          <p className="text-[11px] text-dim">Opłata płacona z kontenerem (w Operacjach „Ładownia”) idzie ze zbiornika; brak – z energii (żółty alarm).</p>
        </div>
      )}
    </Panel>
  )
}

