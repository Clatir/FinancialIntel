import { cycleText } from '@shared/calc/cargoWatch'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { addDays, daysInMonth, warsawNow } from '@shared/calc/dates'
import { balanceAt } from '@shared/calc/balances'
import { sinkingInstallment, startMonthSpentOf } from '@shared/calc/fleet'
import { byPriority } from '@shared/calc/goals'
import { sum } from '@shared/calc/operations'
import { costsByMonth, firstFullMonth, fullMonthsBefore, monthlyShare, payeeKey, proposeEnvelopes, proposeSalary, recurringPayments } from '@shared/calc/plan'
import { startSplit, startTargets } from '@shared/calc/start'
import { plural } from '@shared/format'
import { envelopeKind, type Goal, type Orders } from '@shared/schema'
import { api } from '../../lib/api'
import { useData, useFolderLocked } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { setIctjDir, useIctj } from '../../store/ictj'
import { useRecordList } from '../../store/records'
import { navigate } from '../../store/ui'
import { AmountField, plnText } from '../../components/fields'
import { Meter } from '../../components/meters'
import { ShortcutField } from '../../components/ShortcutField'
import { Badge, Empty, Field, NumberField, TextField, Toggle, cx } from '../../components/ui'
import { IconCheck } from '../../components/icons'
import { plDate } from '../../lib/format'
import { useAccounts, useCategories } from '../operations/pickers'
import { addGoal } from '../starmap/actions'
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
  const readOnly = useFolderLocked()
  const transactions = useRecordList('transactions')
  const containers = useRecordList('containers')
  const accounts = useAccounts().filter((a) => !a.archived)
  const balanceRecords = useRecordList('balances')
  const openings = useMemo(() => new Set(balanceRecords.filter((b) => b.kind === 'opening').map((b) => b.accountId)), [balanceRecords])
  const goalRecords = useRecordList('goals')
  const goals = useMemo(() => byPriority(goalRecords.filter((g) => !g.archived)), [goalRecords])
  const cats = useCategories()
  const fleet = useFleet()
  const { month, date: today } = warsawNow()
  // The months the engine's averages will read (B23, B25): the same proposals as the month's plan later.
  const history = fleet?.historyMonths

  const salaryProposal = useMemo(() => proposeSalary(transactions, month, history), [transactions, month, history])
  const costs = useMemo(() => {
    const months = fullMonthsBefore(transactions, month, HULL_MONTHS, history)
    const by = costsByMonth(transactions)
    return { months: months.length, average: months.length ? Math.round(sum(months.map((m) => by.get(m) ?? 0)) / months.length) : null }
  }, [transactions, month, history])
  const proposals = useMemo(() => recurringPayments(transactions, month, containers, history), [transactions, month, containers, history])
  const chosen = useMemo(() => Object.values(w.cargo), [w.cargo])
  // T45: what this month spent before the start came out of its salary already – a periodic fee's payment is its
  // tank's, never the salary's (N9): of a container now, or of a proposal chosen (its payments get linked at the start).
  const spentThisMonth = useMemo(() => {
    const periodic = new Set(containers.filter((c) => c.cycleMonths > 1).map((c) => c.id))
    const chosenKeys = new Set(chosen.filter((p) => p.cycleMonths > 1).map((p) => p.key))
    // The engine's rule (B126): the start is today; the chosen proposals' payments get linked to their containers.
    return startMonthSpentOf(transactions, today, (t) => (!!t.containerId && periodic.has(t.containerId)) || chosenKeys.has(payeeKey(t)))
  }, [transactions, month, today, containers, chosen])
  // Operations dated after today by account (B127): not in the bank's balance now – the engine takes them on their day.
  const aheadBy = useMemo(() => {
    const out = new Map<string, number>()
    for (const t of transactions) if (t.date > today) out.set(t.accountId, (out.get(t.accountId) ?? 0) + 1)
    return out
  }, [transactions, today])
  const envelopeProposals = useMemo(
    () => proposeEnvelopes(transactions, cats.mains.length ? [...cats.byId.values()] : [], month, [...containers, ...chosen.map((p) => ({ counterparty: p.label, archived: false }))], history),
    [transactions, cats, month, containers, chosen, history]
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
  // An account with its opening balance and the field left empty (B8): what the engine will take at the start – the
  // opening and the operations up to yesterday.
  const fromOpening = (id: string) => balanceAt(id, addDays(today, -1), transactions, balanceRecords)
  const startBalance = (id: string) => w.balances[id] ?? (openings.has(id) ? fromOpening(id) : 0)
  const total = sum(accounts.map((a) => startBalance(a.id)))
  const proposedSplit = startSplit(total, targets, goals)
  const hull = Math.min(Math.max(0, w.hull ?? proposedSplit.hull), Math.max(0, total))
  const goalsSplit = Object.fromEntries(goals.map((g) => [g.id, Math.max(0, w.goals?.[g.id] ?? proposedSplit.goals[g.id] ?? 0)]))
  const goalsTotal = sum(Object.values(goalsSplit))
  const overSplit = hull + goalsTotal > Math.max(0, total)
  // The proposals with what was typed over them (B75): choosing the cargo again never drops a typed envelope.
  const envelopes: Record<string, number> = Object.fromEntries(envelopeProposals.envelopes.filter((e) => e.limit > 0).map((e) => [e.categoryId, e.limit]))
  for (const [id, v] of Object.entries(w.envelopes)) {
    if (v == null) delete envelopes[id]
    else envelopes[id] = v
  }
  const cargoMonthly = sum(containers.filter((c) => !c.archived && c.cycleMonths <= 1).map((c) => c.amount)) + sum(chosen.filter((p) => p.cycleMonths === 1).map((p) => p.amount))
  // The tanks of the first month as the engine fills them (N9, T29): a fee due soon catches up – more than its share.
  const tanksMonthly =
    sum(containers.filter((c) => !c.archived && c.cycleMonths > 1).map((c) => sinkingInstallment(c, month, 0))) +
    sum(chosen.filter((p) => p.cycleMonths > 1).map((p) => sinkingInstallment({ amount: p.amount, cycleMonths: p.cycleMonths, dueMonth: p.dueMonth, schedule: p.schedule }, month, 0)))
  const tanksLater = sum(containers.filter((c) => !c.archived && c.cycleMonths > 1).map(monthlyShare)) + sum(chosen.filter((p) => p.cycleMonths > 1).map(monthlyShare))
  const envelopesTotal = sum(Object.values(envelopes))
  const unallocated = (salary ?? 0) - cargoMonthly - tanksMonthly - envelopesTotal
  const orders: Orders = w.orders ?? fi.settings.orders
  const setOrders = (p: Partial<Orders>) => patchWizard({ orders: { ...orders, ...p } })
  // The averages' first month as the engine reads it (B25).
  const first = history?.[0] ?? firstFullMonth(transactions)
  const last = w.step === WIZARD_STEPS.length - 1

  const steps: ReactNode[] = [
    // 0 – the balances now
    <div key="0" className="flex flex-col gap-2">
      <Note>Saldo każdego konta tak, jak widzisz je teraz w banku (z dzisiejszymi operacjami). Od dziś suma kont = warstwy okrętu.</Note>
      {accounts.map((a) => {
        const opened = openings.has(a.id)
        const ahead = aheadBy.get(a.id) ?? 0
        return (
          <Field
            key={a.id}
            label={a.name}
            labelWidth={140}
            hint={
              opened && w.balances[a.id] == null
                ? `Ma już saldo otwarcia – puste pole: ${zl(fromOpening(a.id))} (saldo otwarcia i operacje do wczoraj).`
                : w.balances[a.id] == null
                  ? a.kind === 'cash'
                    ? 'Gotówka w portfelu – puste = 0 zł.'
                    : 'Potrzebne – 0, jeśli konto jest puste.'
                  : ahead
                    ? `Na koncie ${ahead} ${plural(ahead, 'operacja', 'operacje', 'operacji')} z datą po dziś – saldo „teraz” ich nie obejmuje, silnik odejmie je w ich dniu.`
                    : undefined
            }
          >
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
            W budżecie: <span className="num text-fg-strong">{transactions.length}</span> {plural(transactions.length, 'operacja', 'operacje', 'operacji')}
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
      <Field label="Osłony (bufor na pensje) – cel w pensjach" labelWidth={170} hint={targets.shields != null ? `Cel osłon: ${zl(targets.shields)}.` : undefined}>
        {/* Never under the minimum of the orders (B84): the shields would stay below it for good. */}
        <NumberField className="w-[70px]" value={w.shieldSalaries} decimals={0} step={1} isValid={(v) => v != null && v >= 1 && v <= 24 && v >= orders.minShieldSalaries} onChange={(v) => v != null && patchWizard({ shieldSalaries: v })} aria-label="Osłony w pensjach" />
      </Field>
      <Field
        label="Kadłub (fundusz awaryjny) – cel w miesiącach"
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
        <span className="label">Ładownia (stałe koszty) – powtarzające się płatności z historii</span>
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
                  patchWizard({ cargo })
                }}
              />
              <span className="min-w-0 flex-1 truncate">{p.label}</span>
              <span className="text-[11px] text-muted">
                {cycleText(p)}
                {p.variable ? ' · zmienna' : ''}
              </span>
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
                onChange={(v) => patchWizard({ envelopes: { ...w.envelopes, [c.id]: v } })}
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
          <span className="text-muted">Ładownia (stałe koszty) + odkładki + koperty</span>
          <span className="num">{zl(cargoMonthly + tanksMonthly + envelopesTotal)}</span>
        </div>
        {tanksMonthly !== tanksLater && (
          <Note>
            Odkładki w tym miesiącu: {zl(tanksMonthly)} – zbiorniki nadrabiają do terminów opłat; potem ok. {zl(tanksLater)} miesięcznie.
          </Note>
        )}
        <div className="flex justify-between" data-testid="wizard-unallocated">
          <span className="text-muted">{unallocated < 0 ? 'Plan przekracza pensję o' : 'Niezaplanowane (łupy)'}</span>
          <span className={cx('num', unallocated < 0 && 'text-down')}>{zl(Math.abs(unallocated))}</span>
        </div>
        <Note>Podstawowy przydział dzienny: {zl(Math.floor(sum(cats.mains.filter((c) => envelopeKind(c) === 'daily').map((c) => envelopes[c.id] ?? 0)) / daysInMonth(month)))}.</Note>
      </div>
    </div>,
    // 4 – ICTTJ and the goals (D84 C8, N7): short, to skip
    <IctjGoalsStep key="4" goals={goals} />,
    // 5 – the split of the money at the start
    <div key="5" className="flex flex-col gap-2.5">
      <Note>
        Obecne środki: <span className="num text-fg-strong" data-testid="wizard-total">{zl(total)}</span> na kontach budżetu. Podział jak przy dokowaniu: najpierw osłony do celu,
        potem kadłub, potem cele w kolejności z Mapy gwiezdnej, reszta zostaje w osłonach jako „wolne do decyzji”.
      </Note>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="w-[170px] text-muted">Osłony · bufor na pensje</span>
          <span className={cx('num', overSplit ? 'text-down' : 'text-fg-strong')} data-testid="wizard-split-shields">
            {zl(total - hull - goalsTotal)}
          </span>
          {targets.shields != null && <span className="text-[11px] text-dim">cel {zl(targets.shields)}</span>}
        </div>
        <Meter value={total - hull - goalsTotal} max={targets.shields} />
        <div className="mt-1 flex items-center gap-2">
          <span className="w-[170px] text-muted">Kadłub · fundusz awaryjny</span>
          <AmountField className="w-[130px]" value={hull} onChange={(v) => patchWizard({ hull: v ?? 0 })} aria-label="Kadłub na start" data-testid="wizard-split-hull" />
          {targets.hull != null && <span className="text-[11px] text-dim">cel {zl(targets.hull)}</span>}
          {w.hull != null && (
            <button className="text-[11px] text-accent hover:underline" onClick={() => patchWizard({ hull: null })}>
              propozycja
            </button>
          )}
        </div>
        <Meter value={hull} max={targets.hull} />
        {goals.map((g) => (
          <div key={g.id} className="mt-1 flex items-center gap-2" data-testid="wizard-split-goal" data-name={g.name}>
            <span className="w-[170px] truncate text-muted" title={g.name}>
              cel: {g.name}
            </span>
            <AmountField
              className="w-[130px]"
              value={goalsSplit[g.id] ?? 0}
              onChange={(v) => patchWizard({ goals: { ...goalsSplit, [g.id]: Math.max(0, v ?? 0) } })}
              aria-label={`Cel ${g.name} na start`}
              data-testid="wizard-split-goal-input"
            />
            <span className="text-[11px] text-dim">cel {zl(g.target)}</span>
          </div>
        ))}
        {w.goals != null && goals.length > 0 && (
          <button className="self-start text-[11px] text-accent hover:underline" onClick={() => patchWizard({ goals: null })}>
            cele – propozycja
          </button>
        )}
        {overSplit && (
          <p className="text-[11.5px] text-down" data-testid="wizard-split-over">
            Kadłub i cele ({zl(hull + goalsTotal)}) przekraczają obecne środki ({zl(Math.max(0, total))}) – zmniejsz je.
          </p>
        )}
      </div>
    </div>,
    // 6 – the ship and its orders
    <div key="6" className="flex flex-col gap-2">
      <Field label="Nazwa okrętu" labelWidth={170}>
        <TextField value={w.shipName} onChange={(shipName) => patchWizard({ shipName })} maxLength={40} data-testid="wizard-ship" />
      </Field>
      <span className="label mt-1">Rozkazy (zmienisz je później)</span>
      <Field label="Minimalne osłony (pensje)" labelWidth={170} hint={`Najwyżej cel osłon (${w.shieldSalaries} pensji).`}>
        <NumberField className="w-[70px]" value={orders.minShieldSalaries} decimals={1} step={0.5} isValid={(v) => v != null && v >= 0 && v <= 24 && v <= w.shieldSalaries} onChange={(v) => v != null && setOrders({ minShieldSalaries: v })} />
      </Field>
      <Field label="Linia zanurzenia (% pensji)" labelWidth={170}>
        <NumberField className="w-[70px]" value={orders.cargoLimitPct} decimals={0} step={5} isValid={(v) => v != null && v >= 1 && v <= 100} onChange={(v) => v != null && setOrders({ cargoLimitPct: v })} />
      </Field>
      <Field label="Cisza nocna" labelWidth={170}>
        <span className="num text-fg">
          {orders.quietHours.from}–{orders.quietHours.to}
        </span>
      </Field>
      <Field label="Dziennik od kwoty" labelWidth={170} hint="0 albo puste – dziennik nie pyta.">
        <AmountField className="w-[110px]" value={orders.impulseThreshold} onChange={(v) => setOrders({ impulseThreshold: v ?? 0 })} aria-label="Próg dziennika" />
      </Field>
      <Toggle checked={orders.firewall} onChange={(firewall) => setOrders({ firewall })} label="Firewall: dopłaty do XTB tylko z „wolnego do decyzji”" />
      <span className="label mt-1">Ten komputer</span>
      <Field label="Szybki wpis – skrót" labelWidth={170} hint="Działa w całym systemie; zmień, jeśli koliduje z platformą tradingową.">
        <ShortcutField value={w.shortcut} onChange={(shortcut) => patchWizard({ shortcut })} data-testid="wizard-shortcut" />
      </Field>
      <Toggle checked={w.autostart} onChange={(autostart) => patchWizard({ autostart })} label="Uruchamiaj z Windows (ukryty w zasobniku)" data-testid="wizard-autostart" />
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
              disabled={readOnly || overSplit || salary == null || salary <= 0 || accounts.some((a) => a.kind !== 'cash' && w.balances[a.id] == null && !openings.has(a.id))}
              onFinish={() => finishWizard({ salary: salary ?? 0, hull, goals: goalsSplit, envelopes })}
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
      title={disabled ? 'Potrzebne: saldo każdego konta (krok 1), pensja (krok 3) i kadłub z celami w granicach środków (krok 6)' : undefined}
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

/**
 * The step „ICTTJ i cele” (D84 C8, N7): the ICT Trade Journal folder of this computer (its own path proposed) – the
 * goals of its forecast become the ship's – and own goals added quickly. Both can wait: Ustawienia → ICTTJ, Mapa
 * gwiezdna.
 */
function IctjGoalsStep({ goals }: { goals: Goal[] }) {
  const snap = useIctj((s) => s.snap)
  const readOnly = useFolderLocked()
  const [suggested, setSuggested] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [target, setTarget] = useState<number | null>(null)
  useEffect(() => {
    void api.ictjSuggest().then(setSuggested, () => setSuggested(null))
  }, [])
  const pick = async () => {
    const dir = await api.ictjPickDir()
    if (dir) await setIctjDir(dir)
  }
  const add = () => {
    if (readOnly || !name.trim() || !target || target <= 0) return
    addGoal({ name, target, deadline: null })
    setName('')
    setTarget(null)
  }
  return (
    <div className="flex flex-col gap-2.5">
      <Note>Folder ICT Trade Journal (opcjonalnie): FI czyta z niego wypłaty z konta tradingowego i cele scenariusza prognozy. Bez ICTTJ – pomiń ten krok.</Note>
      <div className="flex items-center gap-2 text-[12px]" data-testid="wizard-ictj">
        <span className="num min-w-0 flex-1 truncate text-fg-strong" title={snap.dir ?? ''}>
          {snap.dir ?? '—'}
        </span>
        <Badge tone={snap.status === 'ok' ? 'up' : 'default'}>{snap.status === 'ok' ? 'czytany' : snap.dir ? 'niedostępny' : 'nie wybrano'}</Badge>
        {suggested && suggested !== snap.dir && (
          <button className="btn btn-accent h-[24px]" disabled={readOnly} onClick={() => void setIctjDir(suggested)} data-testid="wizard-ictj-suggested" title={suggested}>
            Użyj folderu ICTTJ z tego komputera
          </button>
        )}
        <button className="btn h-[24px]" disabled={readOnly} onClick={() => void pick()} data-testid="wizard-ictj-pick">
          Wybierz folder…
        </button>
      </div>
      <div className="flex flex-col">
        <span className="label">Cele – w kolejności priorytetów</span>
        {!goals.length ? (
          <Note>Brak celów. Cele ze scenariusza ICTTJ pojawią się po wybraniu folderu; własny dodasz niżej albo później na Mapie gwiezdnej.</Note>
        ) : (
          goals.map((g) => (
            <div key={g.id} className="flex items-center gap-2 border-b border-line/60 py-1 last:border-b-0" data-testid="wizard-goal" data-name={g.name}>
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              {g.source === 'ictj' && <Badge tone="accent">ICTTJ</Badge>}
              <span className="num w-[110px] text-right">{zl(g.target)}</span>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-2">
        <TextField className="w-[200px]" value={name} onChange={setName} placeholder="Nazwa celu" data-testid="wizard-goal-name" />
        <AmountField className="w-[120px]" value={target} allowEmpty onChange={setTarget} aria-label="Kwota celu" data-testid="wizard-goal-target" />
        <button className="btn h-[26px]" disabled={readOnly || !name.trim() || !target || target <= 0} onClick={add} data-testid="wizard-goal-add">
          Dodaj cel
        </button>
      </div>
      <Note>Kolejność celów, terminy i archiwizację zmienisz na Mapie gwiezdnej.</Note>
    </div>
  )
}
