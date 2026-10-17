import { useMemo, useState, type ReactNode } from 'react'
import { daysInMonth, warsawNow } from '@shared/calc/dates'
import { sinkingSchedule } from '@shared/calc/fleet'
import { costOf, sum } from '@shared/calc/operations'
import { costsByMonth, firstFullMonth, fullMonthsBefore, monthlyShare, proposeEnvelopes, proposeSalary, recurringPayments } from '@shared/calc/plan'
import { startSplit, startTargets } from '@shared/calc/start'
import { envelopeKind, type Orders } from '@shared/schema'
import { useData } from '../../store/data'
import { useRecordList } from '../../store/records'
import { navigate } from '../../store/ui'
import { AmountField, plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { ShortcutField } from '../../components/ShortcutField'
import { Empty, Field, NumberField, TextField, Toggle, cx } from '../../components/ui'
import { IconCheck } from '../../components/icons'
import { plDate } from '../../lib/format'
import { useAccounts, useCategories } from '../operations/pickers'
import { cancelWizard, finishWizard, patchWizard, useWizard, WIZARD_STEPS } from './state'

const zl = (grosze: number) => `${plnText(grosze)} zł`
const HULL_MONTHS = 12

function Note({ children }: { children: ReactNode }) {
  return <p className="text-[11.5px] text-muted">{children}</p>
}

/**
 * Kreator startu (spec, „Kreator startu”, D70): from an empty folder to a running budget – the balances now, the
 * history from mBank, the salary and the layers' targets, the cargo and the envelopes, the split of the money at the
 * start, the ship and its orders. Everything is applied together at „Uruchom budżet”.
 */
export function WizardPage() {
  const w = useWizard()
  const fi = useData((s) => s.fi)
  const started = useData((s) => s.fi?.settings.budget.start ?? null)
  const readOnly = useData((s) => !!s.status?.readOnly)
  const transactions = useRecordList('transactions')
  const containers = useRecordList('containers')
  const accounts = useAccounts().filter((a) => !a.archived)
  const balanceRecords = useRecordList('balances')
  const openings = useMemo(() => new Set(balanceRecords.filter((b) => b.kind === 'opening').map((b) => b.accountId)), [balanceRecords])
  const cats = useCategories()
  const { month, date: today } = warsawNow()

  const salaryProposal = useMemo(() => proposeSalary(transactions, month), [transactions, month])
  const costs = useMemo(() => {
    const months = fullMonthsBefore(transactions, month, HULL_MONTHS)
    const by = costsByMonth(transactions)
    return { months: months.length, average: months.length ? Math.round(sum(months.map((m) => by.get(m) ?? 0)) / months.length) : null }
  }, [transactions, month])
  const proposals = useMemo(() => recurringPayments(transactions, month, containers), [transactions, month, containers])
  // T45: what this month spent before the start came out of its salary already.
  const spentThisMonth = useMemo(() => sum(transactions.filter((t) => t.date.slice(0, 7) === month && t.date < today).map(costOf)), [transactions, month, today])
  const chosen = useMemo(() => Object.values(w.cargo), [w.cargo])
  const envelopeProposals = useMemo(
    () => proposeEnvelopes(transactions, cats.mains.length ? [...cats.byId.values()] : [], month, [...containers, ...chosen.map((p) => ({ counterparty: p.label, archived: false }))]),
    [transactions, cats, month, containers, chosen]
  )
  if (!fi) return <Empty>Wczytywanie…</Empty>
  if (started && !w.active)
    return (
      <div className="flex h-full items-center justify-center" data-testid="page-wizard">
        <Empty>Budżet działa od {plDate(started)}. Kreator startu jest potrzebny tylko raz.</Empty>
      </div>
    )

  const salary = w.salary ?? salaryProposal?.amount ?? null
  const usedCosts = costs.months >= 3 ? costs.average : (w.assumedCosts ?? costs.average)
  const targets = startTargets(salary, usedCosts, w)
  const total = sum(accounts.map((a) => w.balances[a.id] ?? 0))
  const proposedSplit = startSplit(total, targets)
  const hull = Math.min(Math.max(0, w.hull ?? proposedSplit.hull), Math.max(0, total))
  const envelopes = w.envelopes ?? Object.fromEntries(envelopeProposals.envelopes.filter((e) => e.limit > 0).map((e) => [e.categoryId, e.limit]))
  const cargoMonthly = sum(containers.filter((c) => !c.archived && c.cycleMonths <= 1).map((c) => c.amount)) + sum(chosen.filter((p) => p.cycleMonths === 1).map((p) => p.amount))
  const tanksMonthly = sum(containers.filter((c) => !c.archived && c.cycleMonths > 1).map(monthlyShare)) + sum(chosen.filter((p) => p.cycleMonths > 1).map((p) => sinkingSchedule(p.amount, p.cycleMonths)[0] ?? 0))
  const envelopesTotal = sum(Object.values(envelopes))
  const unallocated = (salary ?? 0) - cargoMonthly - tanksMonthly - envelopesTotal
  const orders: Orders = w.orders ?? fi.settings.orders
  const setOrders = (p: Partial<Orders>) => patchWizard({ orders: { ...orders, ...p } })
  const first = firstFullMonth(transactions)
  const last = w.step === WIZARD_STEPS.length - 1

  const steps: ReactNode[] = [
    // 0 – the balances now
    <div key="0" className="flex flex-col gap-2">
      <Note>Saldo każdego konta tak, jak widzisz je teraz w banku (z dzisiejszymi operacjami). Od dziś suma kont = warstwy okrętu.</Note>
      {accounts.map((a) => {
        const opened = openings.has(a.id)
        return (
          <Field key={a.id} label={a.name} labelWidth={140} hint={opened ? 'Ma już saldo otwarcia – puste pole zostawia saldo z operacji.' : w.balances[a.id] == null ? 'Potrzebne – 0, jeśli konto jest puste.' : undefined}>
            <div className="flex items-center gap-2">
              <AmountField
                className="w-[140px]"
                value={w.balances[a.id] ?? null}
                allowEmpty
                allowNegative
                onChange={(v) => patchWizard({ balances: { ...w.balances, [a.id]: v } })}
                aria-label={`Saldo ${a.name}`}
                data-testid="wizard-balance"
              />
              <span className="text-muted">zł</span>
            </div>
          </Field>
        )
      })}
      <Note>Konto tradingowe XTB nie należy do budżetu – prowadzi je ICT Trade Journal. Konta zmienisz w Ustawienia → Konta.</Note>
    </div>,
    // 1 – the history
    <div key="1" className="flex flex-col gap-2">
      <Note>Cała dostępna historia z mBanku (lista operacji, CSV) – z niej kreator policzy średnie koszty, pensję, koperty i stałe opłaty. Operacje kategoryzujesz grupami po kontrahencie.</Note>
      <div className="text-[12.5px]" data-testid="wizard-history">
        {transactions.length ? (
          <>
            W budżecie: <span className="num text-fg-strong">{transactions.length}</span> operacji
            {first && <>, pełne miesiące od {first}</>} (do średnich: {Math.min(costs.months, HULL_MONTHS)} mies.).
          </>
        ) : (
          'Brak operacji.'
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-accent h-[26px]" onClick={() => navigate({ page: 'import' })} data-testid="wizard-import">
          Importuj plik z mBanku
        </button>
        <span className="text-[11.5px] text-dim">Po imporcie wróć przyciskiem „Wróć do kreatora”.</span>
      </div>
      {!transactions.length && <Note>Bez historii kreator nie zaproponuje pensji ani kopert – wpiszesz je sam; możesz to pominąć.</Note>}
    </div>,
    // 2 – the salary and the layers
    <div key="2" className="flex flex-col gap-2.5">
      <Field label="Pensja miesięczna" labelWidth={170} hint={salaryProposal ? `Średnie koszty netto z ${salaryProposal.months.length} pełnych mies.: ${zl(salaryProposal.average)} → propozycja ${zl(salaryProposal.amount)}.` : 'Brak pełnego miesiąca historii – wpisz kwotę.'}>
        <div className="flex items-center gap-2">
          <AmountField className="w-[140px]" value={salary} allowEmpty onChange={(v) => patchWizard({ salary: v })} aria-label="Pensja" data-testid="wizard-salary" />
          <span className="text-muted">zł · z osłon 1. dnia miesiąca</span>
        </div>
      </Field>
      {spentThisMonth > 0 && salary != null && (
        <Note>
          W tym miesiącu wydano już {zl(spentThisMonth)}: pierwsza pensja na resztę miesiąca to {zl(Math.max(0, salary - spentThisMonth))} (pełna od 1.
          następnego miesiąca).
        </Note>
      )}
      <Field label="Osłony – cel w pensjach" labelWidth={170} hint={targets.shields != null ? `Cel osłon: ${zl(targets.shields)}.` : undefined}>
        <NumberField className="w-[70px]" value={w.shieldSalaries} decimals={0} step={1} isValid={(v) => v != null && v >= 1 && v <= 24} onChange={(v) => v != null && patchWizard({ shieldSalaries: v })} aria-label="Osłony w pensjach" />
      </Field>
      <Field
        label="Kadłub – cel w miesiącach"
        labelWidth={170}
        hint={targets.hull != null ? `Cel kadłuba: ${zl(targets.hull)} (średnie koszty ${zl(usedCosts ?? 0)} × ${w.hullMonths}).` : 'Kadłub potrzebuje średnich kosztów.'}
      >
        <NumberField className="w-[70px]" value={w.hullMonths} decimals={0} step={1} isValid={(v) => v != null && v >= 1 && v <= 36} onChange={(v) => v != null && patchWizard({ hullMonths: v })} aria-label="Kadłub w miesiącach" />
      </Field>
      {costs.months < 3 && (
        <Field label="Średnie koszty miesięczne" labelWidth={170} hint="Historia ma mniej niż 3 pełne miesiące: przyjęta kwota posłuży do celu kadłuba i zasięgu, dopóki historia nie urośnie.">
          <AmountField className="w-[140px]" value={w.assumedCosts} allowEmpty onChange={(v) => patchWizard({ assumedCosts: v })} aria-label="Średnie koszty" data-testid="wizard-assumed-costs" />
        </Field>
      )}
    </div>,
    // 3 – the cargo and the envelopes
    <div key="3" className="flex flex-col gap-2.5">
      <div className="flex flex-col">
        <span className="label">Ładownia – powtarzające się płatności z historii</span>
        {!proposals.length ? (
          <Note>Brak propozycji. Stałe opłaty dodasz w Ładowni.</Note>
        ) : (
          proposals.map((p) => (
            <label key={p.key} className="flex items-center gap-2 border-b border-line/60 py-1 last:border-b-0" data-testid="wizard-cargo" data-name={p.label}>
              <input
                type="checkbox"
                checked={!!w.cargo[p.key]}
                onChange={(e) => {
                  const cargo = { ...w.cargo }
                  if (e.currentTarget.checked) cargo[p.key] = p
                  else delete cargo[p.key]
                  patchWizard({ cargo, envelopes: null })
                }}
              />
              <span className="min-w-0 flex-1 truncate">{p.label}</span>
              <span className="text-[11px] text-muted">{p.cycleMonths === 1 ? 'co miesiąc' : 'co rok'}</span>
              <span className="num w-[90px] text-right">{zl(p.amount)}</span>
            </label>
          ))
        )}
      </div>
      <div className="flex flex-col">
        <span className="label">Koperty pierwszego miesiąca – średnie z {envelopeProposals.months.length || 0} pełnych mies., do 10 zł</span>
        {cats.mains
          .filter((c) => !c.archived && envelopeKind(c))
          .map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-0.5" data-testid="wizard-envelope" data-name={c.name}>
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="text-[10.5px] text-dim">{envelopeKind(c) === 'daily' ? 'codzienna' : 'planowa'}</span>
              <AmountField
                className="h-[22px] w-[110px]"
                value={envelopes[c.id] ?? null}
                allowEmpty
                placeholder="—"
                onChange={(v) => {
                  const next = { ...envelopes }
                  if (v == null) delete next[c.id]
                  else next[c.id] = v
                  patchWizard({ envelopes: next })
                }}
                aria-label={`Koperta ${c.name}`}
              />
            </div>
          ))}
        {envelopeProposals.uncategorized > 0 && <Note>Bez kategorii średnio {zl(envelopeProposals.uncategorized)} miesięcznie – liczy się do energii dnia.</Note>}
      </div>
      <div className="border-t border-line pt-1.5 text-[12px]">
        <div className="flex justify-between">
          <span className="text-muted">Pensja</span>
          <span className="num">{zl(salary ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Ładownia + odkładki + koperty</span>
          <span className="num">{zl(cargoMonthly + tanksMonthly + envelopesTotal)}</span>
        </div>
        <div className="flex justify-between" data-testid="wizard-unallocated">
          <span className="text-muted">{unallocated < 0 ? 'Plan przekracza pensję o' : 'Niezaplanowane (łupy)'}</span>
          <span className={cx('num', unallocated < 0 && 'text-down')}>{zl(Math.abs(unallocated))}</span>
        </div>
        <Note>Podstawowy przydział dzienny: {zl(Math.floor(sum(cats.mains.filter((c) => envelopeKind(c) === 'daily').map((c) => envelopes[c.id] ?? 0)) / daysInMonth(month)))}.</Note>
      </div>
    </div>,
    // 4 – the split of the money at the start
    <div key="4" className="flex flex-col gap-2.5">
      <Note>
        Obecne środki: <span className="num text-fg-strong">{zl(total)}</span> na kontach budżetu. Podział jak przy dokowaniu: najpierw osłony do celu, potem kadłub, reszta
        zostaje w osłonach jako „wolne do decyzji”. Cele dojdą z Mapą gwiezdną (wersja 1.1).
      </Note>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="w-[110px] text-muted">Osłony</span>
          <span className="num text-fg-strong" data-testid="wizard-split-shields">
            {zl(total - hull)}
          </span>
          {targets.shields != null && <span className="text-[11px] text-dim">cel {zl(targets.shields)}</span>}
        </div>
        <Meter value={total - hull} max={targets.shields} />
        <div className="mt-1 flex items-center gap-2">
          <span className="w-[110px] text-muted">Kadłub</span>
          <AmountField className="w-[130px]" value={hull} onChange={(v) => patchWizard({ hull: v ?? 0 })} aria-label="Kadłub na start" data-testid="wizard-split-hull" />
          {targets.hull != null && <span className="text-[11px] text-dim">cel {zl(targets.hull)}</span>}
          {w.hull != null && (
            <button className="text-[11px] text-accent hover:underline" onClick={() => patchWizard({ hull: null })}>
              propozycja
            </button>
          )}
        </div>
        <Meter value={hull} max={targets.hull} />
      </div>
    </div>,
    // 5 – the ship and its orders
    <div key="5" className="flex flex-col gap-2">
      <Field label="Nazwa okrętu" labelWidth={170}>
        <TextField value={w.shipName} onChange={(shipName) => patchWizard({ shipName })} maxLength={40} data-testid="wizard-ship" />
      </Field>
      <span className="label mt-1">Rozkazy (zmienisz je później)</span>
      <Field label="Minimalne osłony (pensje)" labelWidth={170}>
        <NumberField className="w-[70px]" value={orders.minShieldSalaries} decimals={1} step={0.5} isValid={(v) => v != null && v >= 0 && v <= 24} onChange={(v) => v != null && setOrders({ minShieldSalaries: v })} />
      </Field>
      <Field label="Linia zanurzenia (% pensji)" labelWidth={170}>
        <NumberField className="w-[70px]" value={orders.cargoLimitPct} decimals={0} step={5} isValid={(v) => v != null && v >= 1 && v <= 100} onChange={(v) => v != null && setOrders({ cargoLimitPct: v })} />
      </Field>
      <Field label="Cisza nocna" labelWidth={170}>
        <span className="num text-fg">
          {orders.quietHours.from}–{orders.quietHours.to}
        </span>
      </Field>
      <Field label="Dziennik od kwoty" labelWidth={170}>
        <AmountField className="w-[110px]" value={orders.impulseThreshold} onChange={(v) => setOrders({ impulseThreshold: v ?? 0 })} aria-label="Próg dziennika" />
      </Field>
      <Toggle checked={orders.firewall} onChange={(firewall) => setOrders({ firewall })} label="Firewall: dopłaty do XTB tylko z „wolnego do decyzji”" />
      <span className="label mt-1">Ten komputer</span>
      <Field label="Szybki wpis – skrót" labelWidth={170} hint="Działa w całym systemie; zmień, jeśli koliduje z platformą tradingową.">
        <ShortcutField value={w.shortcut} onChange={(shortcut) => patchWizard({ shortcut })} data-testid="wizard-shortcut" />
      </Field>
      <Toggle checked={w.autostart} onChange={(autostart) => patchWizard({ autostart })} label="Uruchamiaj z Windows (ukryty w zasobniku)" data-testid="wizard-autostart" />
      <Note>Folder ICT Trade Journal (wypłaty i cele) podłączysz w wersji 1.1.</Note>
    </div>
  ]

  return (
    <div className="flex h-full min-h-0" data-testid="page-wizard">
      <aside className="flex w-[230px] shrink-0 flex-col border-r border-line bg-panel">
        <div className="border-b border-line px-4 py-3">
          <div className="text-[14px] font-medium text-fg-strong">Kreator startu</div>
          <div className="text-[11.5px] text-muted">od pustego folderu do działającego budżetu</div>
        </div>
        {WIZARD_STEPS.map((title, i) => (
          <button
            key={title}
            onClick={() => patchWizard({ step: i })}
            className={cx('flex h-[36px] items-center gap-2 border-l-2 px-3 text-left text-[12.5px]', i === w.step ? 'border-accent bg-accent-soft text-accent' : 'border-transparent text-fg hover:bg-hover')}
            data-testid={`wizard-step-${i}`}
          >
            <span className={cx('num w-[16px] text-[11px]', i < w.step ? 'text-accent' : 'text-dim')}>{i < w.step ? <IconCheck size={12} /> : i + 1}</span>
            {title}
          </button>
        ))}
        <div className="flex-1" />
        <button className="m-3 text-[11.5px] text-dim hover:text-fg-strong" onClick={cancelWizard}>
          Przerwij kreator
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex max-w-[640px] flex-col gap-3 p-5">
            <h1 className="text-[15px] font-medium text-fg-strong">
              {w.step + 1}. {WIZARD_STEPS[w.step]}
            </h1>
            {steps[w.step]}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-line px-5 py-2.5">
          <button className="btn" disabled={w.step === 0} onClick={() => patchWizard({ step: w.step - 1 })} data-testid="wizard-back">
            Wstecz
          </button>
          <span className="flex-1" />
          {!last ? (
            <button className="btn btn-accent" onClick={() => patchWizard({ step: w.step + 1 })} data-testid="wizard-next">
              Dalej
            </button>
          ) : (
            <FinishButton
              disabled={readOnly || salary == null || salary <= 0 || accounts.some((a) => w.balances[a.id] == null && !openings.has(a.id))}
              onFinish={() => finishWizard({ salary: salary ?? 0, hull, envelopes })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function FinishButton({ disabled, onFinish }: { disabled: boolean; onFinish: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      className="btn btn-accent"
      disabled={disabled || busy}
      title={disabled ? 'Potrzebne: saldo każdego konta (krok 1) i pensja (krok 3)' : undefined}
      onClick={() => {
        setBusy(true)
        void onFinish().finally(() => setBusy(false))
      }}
      data-testid="wizard-finish"
    >
      Uruchom budżet
    </button>
  )
}
