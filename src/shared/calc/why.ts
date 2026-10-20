/**
 * „Skąd ta liczba?” (1.10.0, F29): the bridge's numbers taken apart – today's energy, the range, the layers' targets
 * and the last delivery's split – as lines a reader adds up, each with its real name and amount (D34: the metaphor
 * beside the true name). Pure; the bridge and the tray's tooltip read it.
 */
import { rangeText } from '../format'
import { daysInMonth } from './dates'
import type { DailyAllowance, FleetEvent, FleetState } from './fleet'

export interface WhyLine {
  /** What it is, in words. */
  label: string
  /** Its amount (grosze, signed as it adds: − spent); null – a number of other units (`text`). */
  amount: number | null
  /** A number that is no money (days, months). */
  text?: string
  /** The result line (=). */
  total?: boolean
}

/**
 * Today's energy (D16): the daily envelopes of the month less what they took before today, over the days left – the
 * allowance; less today's spending – the energy now. The allowance against the plain share (limit / days of the month)
 * shows what the days before carried over (+ saved, − overspent).
 */
export function energyWhy(d: DailyAllowance & { limit: number; spentBefore: number; spentToday: number }, month: string): WhyLine[] {
  const days = daysInMonth(month)
  const carried = d.allowance - d.base
  return [
    { label: 'Koperty codzienne w tym miesiącu (plan i łupy)', amount: d.limit },
    { label: 'Wydane z nich do wczoraj', amount: -d.spentBefore },
    { label: `Zostało na ${d.daysLeft} ${d.daysLeft === 1 ? 'dzień' : 'dni'} (z dzisiejszym)`, amount: d.limit - d.spentBefore },
    { label: `Podstawowy przydział (limit / ${days} dni)`, amount: d.base },
    { label: carried >= 0 ? 'Zaoszczędzone wcześniej – na każdy dzień' : 'Przekroczone wcześniej – mniej na każdy dzień', amount: carried },
    { label: 'Przydział na dziś', amount: d.allowance },
    { label: 'Wydane dziś', amount: -d.spentToday },
    { label: 'Energia dziś', amount: d.left, total: true }
  ]
}

/** The range (zasięg): the shields and the hull less the debt, over the average monthly costs. */
export function rangeWhy(f: Pick<FleetState, 'shields' | 'hull' | 'debt' | 'costs' | 'range'>): WhyLine[] {
  const fuel = f.shields.amount + f.hull.amount - f.debt
  const costs = f.costs.average
  const months = f.costs.source === 'assumed' ? 'założone w Ustawieniach' : `średnia z ${f.costs.months} mies.`
  return [
    { label: 'Osłony', amount: f.shields.amount },
    { label: 'Kadłub', amount: f.hull.amount },
    ...(f.debt ? [{ label: 'Dług do spłaty', amount: -f.debt }] : []),
    { label: 'Paliwo (bez dopływu wypłat)', amount: fuel },
    { label: `Koszty miesiąca (${months})`, amount: costs },
    {
      label: 'Zasięg',
      amount: null,
      text: f.range == null ? '— (brak kosztów do porównania)' : rangeText(f.range),
      total: true
    }
  ]
}

/** The layers' targets: the shields – salaries ahead, the hull – months of costs. */
export function targetsWhy(f: Pick<FleetState, 'shields' | 'hull' | 'costs' | 'plan'>, layers: { shieldSalaries: number; hullMonths: number }): WhyLine[] {
  const salary = f.plan?.salary ?? null
  return [
    { label: `Cel osłon: ${layers.shieldSalaries} × pensja${salary == null ? ' (brak pensji)' : ''}`, amount: f.shields.target ?? null, text: f.shields.target == null ? '—' : undefined },
    { label: `Cel kadłuba: ${layers.hullMonths} × koszty miesiąca`, amount: f.hull.target ?? null, text: f.hull.target == null ? '—' : undefined },
    { label: 'Koszty miesiąca', amount: f.costs.average, text: f.costs.average == null ? '—' : undefined }
  ]
}

/** The last delivery's split (a payout docked – D13): where its money went, layer by layer; null – none docked yet. */
export function deliveryWhy(log: readonly FleetEvent[], goalName: (id: string) => string): { date: string; lines: WhyLine[] } | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!
    if (e.kind !== 'trading' || e.amount <= 0) continue
    const m = e.moves
    const lines: WhyLine[] = [{ label: 'Dostawa', amount: e.amount }]
    if (m.taxHold) lines.push({ label: 'Rezerwa na PIT-38', amount: m.taxHold })
    if (m.shields) lines.push({ label: 'Osłony', amount: m.shields })
    if (m.hull) lines.push({ label: 'Kadłub', amount: m.hull })
    for (const [id, v] of Object.entries(m.goals ?? {})) if (v) lines.push({ label: `Cel: ${goalName(id)}`, amount: v })
    return { date: e.date, lines }
  }
  return null
}
