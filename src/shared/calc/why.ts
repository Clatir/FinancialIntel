/**
 * „Skąd ta liczba?” (1.10.0, F29): the bridge's numbers taken apart – today's energy, the range, the layers' targets
 * and the last delivery's split – as lines a reader adds up, each with its real name and amount (D34: the metaphor
 * beside the true name). Pure; the bridge and the tray's tooltip read it.
 */
import { rangeText } from '../format'
import { daysInMonth } from './dates'
import type { DailyState, FleetEvent, FleetState } from './fleet'

export interface WhyLine {
  /** What it is, in words. */
  label: string
  /** Its amount (grosze, signed as it adds: − spent); null – a number of other units (`text`). */
  amount: number | null
  /** A number that is no money (days, months). */
  text?: string
  /** The result line (=). */
  total?: boolean
  /** A note beside the sum, not added to it (today's refund of an earlier purchase – T370): shown in brackets. */
  aside?: boolean
}

/** Why today's energy is less than the daily pool says (AP-13, T371): the note beside it on every screen. */
export const CAP_REASON: Record<NonNullable<DailyState['cap']>['why'], string> = {
  partial: 'pensja częściowa',
  none: 'bez pensji w tym miesiącu',
  spent: 'nie więcej niż zostało w miesiącu'
}

/** „pensja częściowa – energia miesiąca 0,00 zł” (T371): `zl` formats the amount (the hidden amounts mask it). */
export const capNote = (cap: NonNullable<DailyState['cap']>, zl: (grosze: number) => string): string => `${CAP_REASON[cap.why]} – energia miesiąca ${zl(cap.month)}`

/**
 * Today's energy (D16): the daily envelopes of the month less what they took before today, over the days left – the
 * allowance; less today's spending – the energy now, never more than the month's energy left (AP-13, T371). The allowance
 * against the plain share (limit / days of the month) shows what the days before carried over (+ saved, − overspent).
 */
export function energyWhy(d: DailyState, month: string): WhyLine[] {
  const days = daysInMonth(month)
  const carried = d.allowance - d.base
  const lines: WhyLine[] = [
    { label: 'Koperty codzienne w tym miesiącu (plan i łupy)', amount: d.limit },
    { label: 'Wydane z nich do wczoraj', amount: -d.spentBefore },
    { label: `Zostało na ${d.daysLeft} ${d.daysLeft === 1 ? 'dzień' : 'dni'} (z dzisiejszym)`, amount: d.limit - d.spentBefore },
    { label: `Podstawowy przydział (limit / ${days} dni)`, amount: d.base },
    { label: carried >= 0 ? 'Zaoszczędzone wcześniej – na każdy dzień' : 'Przekroczone wcześniej – mniej na każdy dzień', amount: carried },
    { label: 'Przydział na dziś', amount: d.allowance },
    { label: 'Wydane dziś', amount: -d.spentToday }
  ]
  // A refund of an earlier purchase (T370): the days after today share it – beside the sum, not in it.
  if (d.returned) lines.push({ label: 'Zwroty dziś za wcześniejsze zakupy – nie do dziś, od jutra na pozostałe dni', amount: d.returned, aside: true })
  if (d.cap) {
    lines.push({ label: 'Przydział po dzisiejszych wydatkach', amount: d.left })
    lines.push({ label: `Energia miesiąca (pensja do wydania) – ${CAP_REASON[d.cap.why]}`, amount: d.cap.month })
  }
  lines.push({ label: 'Energia dziś', amount: d.energy, total: true })
  return lines
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

/**
 * The last delivery's split (a payout docked – D13): where its money went, layer by layer; null – none docked yet.
 * Docked only (AP-26, PR sp. 2 – T437, changes T342's „ostatnia dostawa (do zadokowania)”): a pair counted by its entry's
 * pool before „Zadokuj” (`pending`, AP-12 – an inflow typed on Portfel XTB too, B69) and an XTB inflow without its docking
 * (`docked` – the operations with a docking record) are the bridge's „Do zadokowania” (`toDock` – without a household
 * member's or a loan's part, T342), never „ostatnia dostawa”. A docked inflow typed on Portfel XTB is the trading
 * account's operation (`asPayout`) – one too.
 */
export function deliveryWhy(log: readonly FleetEvent[], goalName: (id: string) => string, docked?: (txId: string) => boolean): { date: string; lines: WhyLine[] } | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!
    if (e.kind !== 'trading' || e.amount <= 0 || e.pending || (docked && (!e.txId || !docked(e.txId)))) continue
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
