/**
 * „Plan spłaty pożyczek” on the Radar (1.17.0, AP-41 – T480, T483): the taken loans paid off month by month – the
 * schedule (no overpayment), the avalanche and the snowball with the money typed over the installments (each month and
 * once now; „wolne do decyzji” proposed for the once). A proposal: nothing of it is stored and no money moves
 * (`calc/payoff.ts`) – only a loan's yearly interest, an informational field of its record (T484), is written here.
 * The phone shows it too (the same narrow column as on a computer's Radar).
 */
import { useMemo, useState } from 'react'
import { monthsBetween } from '@shared/calc/dates'
import type { FleetState } from '@shared/calc/fleet'
import type { LoanState } from '@shared/calc/loans'
import { payoff, payoffDebtsOf, rateOf, type PayoffMonth, type PayoffPlan, type PayoffVariant } from '@shared/calc/payoff'
import { percentText } from '@shared/format'
import { AmountField, plnText } from '../../components/fields'
import { NumberField, Panel, Segmented, ShowMore } from '../../components/ui'
import { useEntryNewer } from '../../store/data'
import { useDraft } from '../../store/drafts'
import { countLabel, monthLabel, plDate } from '../../lib/format'
import { setLoanRate } from './actions'

const zl = (g: number) => `${plnText(g)} zł`
const mm = (m: string | null) => (m ? `${m.slice(5, 7)}.${m.slice(0, 4)}` : 'nigdy')
const PAGE = 100

const PAYOFF_LABEL: Record<PayoffVariant, string> = { none: 'bez nadpłat', avalanche: 'lawina', snowball: 'kula śnieżna' }

const HINT =
  'Lawina: nadpłata najpierw na pożyczkę z najwyższym oprocentowaniem – najmniej odsetek. Kula śnieżna: najpierw na najmniejszą – najszybciej o jedną ratę mniej. Rata pożyczki spłaconej przed końcem harmonogramu przechodzi na następną.'

/** What the plan was given (the window's draft – kept while another screen is looked at): grosze, the months' variant. */
interface PayoffDraft {
  extra: number
  once: number
  view: PayoffVariant
}

export function PayoffPanel({ fleet, readOnly }: { fleet: FleetState; readOnly: boolean }) {
  const states = fleet.loans
  const debts = useMemo(() => payoffDebtsOf(states), [states])
  const [o, setO] = useDraft<PayoffDraft>('radar:payoff', () => ({ extra: 0, once: 0, view: 'avalanche' }))
  const plans = useMemo(() => (debts.length ? payoff({ debts, month: fleet.month, extra: o.extra, once: o.once }) : null), [debts, fleet.month, o.extra, o.once])
  const [shown, setShown] = useState(PAGE)
  if (!plans) return null
  const taken = new Map(states.map((s) => [s.loan.id, s]))
  const name = (id: string) => taken.get(id)?.loan.name ?? ''
  // Without money over the installments both strategies are the schedule (T482): only it is shown.
  const over = o.extra > 0 || o.once > 0
  const variants: PayoffVariant[] = over ? ['none', 'avalanche', 'snowball'] : ['none']
  const view: PayoffVariant = over ? o.view : 'none'
  const plan = plans[view]
  const rated = debts.filter((d) => d.rate != null).length
  const free = fleet.shields.free
  const interest = (p: PayoffPlan) => (rated ? plnText(p.interest) : '—')
  const less = (p: PayoffPlan) => (p.variant === 'none' || !rated ? '—' : plnText(plans.none.interest - p.interest))
  const sooner = (p: PayoffPlan) => {
    // Never, or the schedule never ends (a loan without one): the row „Spłata wszystkich” says it.
    if (p.variant === 'none' || !p.end || !plans.none.end) return '—'
    const n = monthsBetween(p.end, plans.none.end)
    return n > 0 ? countLabel(n, 'miesiąc', 'miesiące', 'miesięcy') : 'tak samo'
  }
  return (
    <Panel title="Plan spłaty pożyczek" name="Plan spłaty" testId="radar-payoff" hint={HINT}>
      <div className="flex flex-col gap-2 text-[12px]">
        <span className="text-[11.5px] text-muted">
          Dług {zl(debts.reduce((a, d) => a + d.open, 0))} · {countLabel(debts.length, 'pożyczka wzięta', 'pożyczki wzięte', 'pożyczek wziętych')}. Propozycja – plan niczego nie zapisuje i nie przesuwa pieniędzy.
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <label className="flex items-center gap-1.5">
            <span className="text-muted">Nadpłata co miesiąc</span>
            <AmountField className="h-[24px] w-[100px]" value={o.extra || null} allowEmpty onChange={(v) => setO((x) => ({ ...x, extra: v ?? 0 }))} aria-label="Nadpłata co miesiąc" data-testid="radar-payoff-extra" />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted">jednorazowo teraz</span>
            <AmountField className="h-[24px] w-[100px]" value={o.once || null} allowEmpty onChange={(v) => setO((x) => ({ ...x, once: v ?? 0 }))} aria-label="Nadpłata jednorazowo teraz" data-testid="radar-payoff-once" />
          </label>
        </div>
        {free > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-2 text-[11px] text-dim" data-testid="radar-payoff-free">
            <span>Osłony · wolne do decyzji {zl(free)}</span>
            {o.once !== free && (
              <button type="button" className="text-accent hover:underline" onClick={() => setO((x) => ({ ...x, once: free }))} data-testid="radar-payoff-free-use">
                wstaw jako jednorazową
              </button>
            )}
          </div>
        )}
        <table className="w-full text-[11.5px]" data-testid="radar-payoff-loans">
          <thead>
            <tr className="text-dim">
              <th className="py-0.5 text-left font-normal">Pożyczka</th>
              <th className="text-right font-normal">do spłaty</th>
              <th className="text-right font-normal" title="Następna rata z harmonogramu">
                rata
              </th>
              <th className="text-right font-normal" title="Oprocentowanie nominalne roczne z umowy – tylko dla planu">
                % rocznie
              </th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => (
              <PayoffLoanRow key={d.id} s={taken.get(d.id)!} principal={plans.principal[d.id] ?? d.open} readOnly={readOnly} />
            ))}
          </tbody>
        </table>
        {rated < debts.length && (
          <span className="text-[11px] text-dim" data-testid="radar-payoff-unrated">
            {rated ? 'Pożyczki bez oprocentowania liczą się bez odsetek (w lawinie jak 0 %) – odsetki razem tylko z pożyczek z oprocentowaniem.' : 'Podaj oprocentowanie, żeby policzyć odsetki – bez niego plan liczy same raty (w lawinie jak 0 %).'}
          </span>
        )}
        <table className="w-full text-[11.5px]" data-testid="radar-payoff-compare">
          <thead>
            <tr className="text-dim">
              <th className="py-0.5 text-left font-normal" />
              {variants.map((v) => (
                <th key={v} className="text-right font-normal">
                  {PAYOFF_LABEL[v]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow label="Spłata wszystkich" values={variants.map((v) => mm(plans[v].end))} testId="radar-payoff-end" />
            <CompareRow label="Odsetki (zł)" values={variants.map((v) => interest(plans[v]))} testId="radar-payoff-interest" />
            {over && (
              <>
                <CompareRow label="Mniej odsetek (zł)" values={variants.map((v) => less(plans[v]))} testId="radar-payoff-less" />
                <CompareRow label="Krócej o" values={variants.map((v) => sooner(plans[v]))} testId="radar-payoff-sooner" text />
                <CompareRow label="Nadpłata najpierw" values={variants.map((v) => (v === 'none' ? '—' : name(plans[v].order[0] ?? '')))} testId="radar-payoff-first" text />
              </>
            )}
            {debts.map((d) => (
              <CompareRow key={d.id} label={`Spłata: ${d.name}`} values={variants.map((v) => mm(plans[v].debts.find((x) => x.id === d.id)?.paidOff ?? null))} testId="radar-payoff-loan-end" name={d.name} />
            ))}
          </tbody>
        </table>
        {!over && <span className="text-[11px] text-dim">Wpisz nadpłatę co miesiąc albo jednorazową, żeby porównać lawinę i kulę śnieżną z harmonogramem.</span>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="label">Miesiąc po miesiącu</span>
          {over && (
            <Segmented
              size="sm"
              value={view}
              options={variants.map((v) => ({ value: v, label: PAYOFF_LABEL[v] }))}
              onChange={(v) => {
                setO((x) => ({ ...x, view: v }))
                setShown(PAGE)
              }}
              aria-label="Wariant planu spłaty"
            />
          )}
        </div>
        <div className="flex flex-col" data-testid="radar-payoff-months" data-variant={view}>
          {plan.months.slice(0, shown).map((m) => (
            <MonthRow key={m.month} m={m} name={name} />
          ))}
        </div>
        <ShowMore shown={shown} total={plan.months.length} page={PAGE} onMore={() => setShown((n) => n + PAGE)} testId="radar-payoff-more" />
        <span className="text-[11px] text-dim">
          Co miesiąc: odsetki od tego, co zostało (oprocentowanie ÷ 12, do grosza), raty z harmonogramu (ostatnia płaci resztę), potem nadpłata według strategii. Nadpłatę zapiszesz w wierszu pożyczki – „zapłać
          ratę” (przy racie w Ładowni: „z osłon (nadpłata)”).
        </span>
      </div>
    </Panel>
  )
}

/** A taken loan in the plan: what is left by its schedule, its next installment and its yearly interest (edited here). */
function PayoffLoanRow({ s, principal, readOnly: folderLocked }: { s: LoanState; principal: number; readOnly: boolean }) {
  // Written by a newer version of the app (B67): its interest is not changed from here.
  const newer = useEntryNewer('loans', s.loan.id)
  const readOnly = folderLocked || newer
  const rate = rateOf(s.loan)
  // The schedule's interest at the rate (T481): what is open less the principal.
  const inside = rate ? s.open - principal : 0
  return (
    <tr className="border-t border-line/50" data-testid="radar-payoff-loan" data-name={s.loan.name}>
      <td className="max-w-[140px] truncate py-0.5 text-fg-strong" title={s.loan.counterparty || undefined}>
        {s.loan.name}
      </td>
      <td className="num text-right" title={inside > 0 ? `W tym odsetki ok. ${zl(inside)} (kapitał ${zl(principal)})` : undefined} data-testid="radar-payoff-loan-open">
        {plnText(s.open)}
      </td>
      <td className="num text-right text-muted" title={s.next ? `Termin ${plDate(s.next.date)}` : 'Bez harmonogramu rat'}>
        {s.next ? plnText(s.next.amount) : '—'}
      </td>
      <td className="py-0.5 text-right">
        {readOnly ? (
          <span className="num text-muted" data-testid="radar-payoff-rate-text">
            {rate == null ? '—' : percentText(rate, 2)}
          </span>
        ) : (
          <NumberField
            className="ml-auto h-[22px] w-[58px]"
            value={rate}
            decimals={2}
            step={0.25}
            range={[0, 100]}
            isValid={(v) => v == null || (v >= 0 && v <= 100)}
            commitOnBlur
            onChange={(v) => setLoanRate(s.loan, v)}
            placeholder="—"
            aria-label={`Oprocentowanie roczne: ${s.loan.name}`}
            data-testid="radar-payoff-rate"
          />
        )}
      </td>
    </tr>
  )
}

/** A row of the comparison: its label and a value per variant – numbers in `.num`, words (`text`) as text. */
function CompareRow({ label, values, testId, name, text }: { label: string; values: string[]; testId?: string; name?: string; text?: boolean }) {
  return (
    <tr className="border-t border-line/50" data-testid={testId} data-name={name}>
      <td className="max-w-[150px] truncate py-0.5 text-muted" title={label}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={text ? 'text-right' : 'num text-right'}>
          {v}
        </td>
      ))}
    </tr>
  )
}

/** A month of the plan: what is paid and left, and each loan's part – the installment, the overpayment, paid off. */
function MonthRow({ m, name }: { m: PayoffMonth; name: (id: string) => string }) {
  const interest = m.lines.reduce((a, l) => a + l.interest, 0)
  return (
    <div className="flex flex-col border-b border-line/60 py-1 last:border-b-0" data-testid="radar-payoff-month" data-month={m.month}>
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-fg-strong">{monthLabel(m.month)}</span>
        <span className="num" title={interest ? `W tym odsetki ${zl(interest)}` : undefined} data-testid="radar-payoff-month-paid">
          {zl(m.paid)}
        </span>
        <span className="num shrink-0 text-right text-[11px] text-dim" data-testid="radar-payoff-month-left">
          zostaje {zl(m.balance)}
        </span>
      </div>
      <div className="text-[11px] text-dim">
        {m.lines.map((l, i) => (
          <span key={l.id} data-testid="radar-payoff-month-line" data-name={name(l.id)} data-state={l.balance === 0 ? 'paid-off' : undefined}>
            {i > 0 ? ' · ' : ''}
            {name(l.id)} {plnText(l.installment)}
            {l.extra ? ` + nadpłata ${plnText(l.extra)}` : ''}
            {l.balance === 0 && <span className="text-fg-strong"> – spłacona</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
