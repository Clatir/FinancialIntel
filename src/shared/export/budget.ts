/**
 * The budget's exports (E8, spec „Eksport”: CSV i Excel – operacje, miesiące; PDF – debriefing, przegląd roczny): the
 * same rows for both formats; a report as a self-contained HTML document the main process prints to PDF (no scripts,
 * nothing loaded from outside). Always the real amounts – the hidden amounts are the screen's (D73).
 */
import type { Account, Category, HouseholdMember } from '../schema/budget'
import type { Container, MonthPlan, Transaction } from '../schema/records'
import { TX_KIND_LABEL } from '../schema/records'
import { financersText, incomeShares, memberName } from '../calc/household'
import { incomeOfPeriod, plainIncomeContext, type IncomeContext } from '../calc/income'
import { amountOn, categoryIndex, isTwoSided, sum, touchesAccount, upToDay } from '../calc/operations'
import { tagsText } from '../calc/tags'
import { savingsRate } from '../calc/fuel'
import { debriefing, transactionsOfMonth } from '../calc/plan'
import type { Alarm, FleetEvent } from '../calc/fleet'
import type { XlsxSheet } from './xlsx'

/** Grosze as Excel in Polish reads them: '-1234,56'. */
export const plnCell = (grosze: number): string => `${grosze < 0 ? '-' : ''}${Math.floor(Math.abs(grosze) / 100)},${String(Math.abs(grosze) % 100).padStart(2, '0')}`

/** A text a spreadsheet would run as a formula (`=`, `+`, `@`, a `-` not of a number) gets a leading apostrophe. */
const defuse = (v: string) => (/^[=+@\t\r]/.test(v) || /^-(?![\d,.]+$)/.test(v) ? `'${v}` : v)
const quote = (raw: string) => {
  const v = defuse(raw)
  return /[;"\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v
}

/** A CSV for Excel in Polish: `;` between cells, a BOM so the Polish letters read right. */
export function toCsv(header: readonly string[], rows: ReadonlyArray<ReadonlyArray<string | number | null>>): string {
  const line = (r: ReadonlyArray<string | number | null>) => r.map((v) => quote(v == null ? '' : String(v))).join(';')
  return `﻿${[line(header), ...rows.map(line)].join('\r\n')}\r\n`
}

const IMPULSE_LABEL = { plan: 'plan', impulse: 'impuls' } as const

export interface OperationRow {
  date: string
  time: string
  account: string
  kind: string
  amount: number
  category: string
  counterparty: string
  title: string
  /** The household members who finance it (D80), by name; '' = none. */
  financed: string
  log: string
  note: string
  /** Its tags (F17): the operation's and its lines', „#wakacje #remont”; '' = none. */
  tags: string
}

export function operationRows(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[],
  from: string,
  to: string,
  members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>> = []
): OperationRow[] {
  return operationRowsOf(operationsOfPeriod(transactions, from, to), categories, accounts, members)
}

/** The operations of a period in the export's order: by date, time, entry. */
export function operationsOfPeriod(transactions: readonly Transaction[], from: string, to: string): Transaction[] {
  return transactions
    .filter((t) => t.date >= from && t.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || a.createdAt.localeCompare(b.createdAt))
}

/**
 * The rows of these operations in their order (F18: the list of Operacje as it shows them – the list of one account
 * shows a transfer's money on it, `view`).
 */
export function operationRowsOf(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[],
  members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>> = [],
  view: string | null = null
): OperationRow[] {
  const cats = categoryIndex(categories)
  const accountName = new Map(accounts.map((a) => [a.id, a.name]))
  return transactions.map((t) => ({
    date: t.date,
    time: t.time ?? '',
    // A transfer in one operation (F10): from the account the money left to the one it came to; the amount – its side.
    account: isTwoSided(t)
      ? t.amount < 0
        ? `${accountName.get(t.accountId) ?? ''} → ${accountName.get(t.counterAccountId!) ?? ''}`
        : `${accountName.get(t.counterAccountId!) ?? ''} → ${accountName.get(t.accountId) ?? ''}`
      : (accountName.get(t.accountId) ?? ''),
    kind: TX_KIND_LABEL[t.kind],
    amount: view && touchesAccount(t, view) ? amountOn(t, view) : t.amount,
    // An income's parts are its members' money (D81), not categories.
    category: t.kind === 'income' ? '' : t.splits.length ? t.splits.map((s) => cats.label(s.categoryId)).join(' + ') : cats.label(t.categoryId),
    counterparty: t.counterparty,
    title: t.title,
    financed: whose(t, members),
    log: t.impulse ? IMPULSE_LABEL[t.impulse] : '',
    // The receipt lines' notes after the operation's (D89), each with its line's category – the column „Kategoria” lists
    // every line, the notes only the described ones.
    note: [t.note, ...t.splits.filter((s) => s.note.trim()).map((s) => (cats.label(s.categoryId) ? `${cats.label(s.categoryId)}: ${s.note.trim()}` : s.note.trim()))]
      .filter((x) => x.trim())
      .join(' · '),
    tags: tagsText(t)
  }))
}

/** Whose an operation is (D80, D81): who finances a purchase, whose money an income is (its parts' members too). */
function whose(t: Transaction, members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>>): string {
  if (t.kind === 'income') {
    const ids = [...new Set(incomeShares(t).map((x) => x.memberId).filter((x): x is string => !!x))]
    return ids.length ? `od: ${ids.map((id) => memberName(id, members)).join(', ')}` : ''
  }
  return financersText(t, members)
}

const OPERATION_HEADER = ['Data', 'Godzina', 'Konto', 'Rodzaj', 'Kwota (zł)', 'Kategoria', 'Kontrahent', 'Tytuł', 'Finansuje', 'Dziennik', 'Notatka', 'Tagi'] as const

export function operationsCsv(rows: readonly OperationRow[]): string {
  return toCsv(
    OPERATION_HEADER,
    rows.map((r) => [r.date, r.time, r.account, r.kind, plnCell(r.amount), r.category, r.counterparty, r.title, r.financed, r.log, r.note, r.tags])
  )
}

export function operationsSheet(rows: readonly OperationRow[]): XlsxSheet {
  return {
    name: 'Operacje',
    freezeHeader: true,
    columns: [
      // Dates and times as Excel's (AP-29): a date filter and a pivot table see them.
      { header: 'Data', kind: 'date', width: 11 },
      { header: 'Godzina', kind: 'time', width: 8 },
      { header: 'Konto', kind: 'text', width: 16 },
      { header: 'Rodzaj', kind: 'text', width: 16 },
      { header: 'Kwota (zł)', kind: 'money', width: 12 },
      { header: 'Kategoria', kind: 'text', width: 28 },
      { header: 'Kontrahent', kind: 'text', width: 30 },
      { header: 'Tytuł', kind: 'text', width: 36 },
      { header: 'Finansuje', kind: 'text', width: 14 },
      { header: 'Dziennik', kind: 'text', width: 9 },
      { header: 'Notatka', kind: 'text', width: 30 },
      { header: 'Tagi', kind: 'text', width: 22 }
    ],
    rows: rows.map((r) => [r.date, r.time, r.account, r.kind, r.amount / 100, r.category, r.counterparty, r.title, r.financed, r.log, r.note, r.tags])
  }
}

// ------------------------------------------------------------------ the parts (AP-29)

/**
 * One line of an operation (AP-29, D89 / T303 – beside the operation's row, which stays as it is): a split receipt's or a
 * shared purchase's line with its own amount, category, financer, note and tags, so a spreadsheet sums the categories; an
 * operation without lines is its one line; what a receipt's lines do not cover (a file edited by hand) – a line of the
 * operation's category, as the engine counts it (`partsOf`).
 */
export interface PartRow {
  /** The operation's place in „Operacje” of the same export (1 = its first row). */
  operation: number
  date: string
  account: string
  kind: string
  counterparty: string
  title: string
  /** „1 z 3” (never „1/3” – Excel would take it for a date); '' – an operation without lines. */
  part: string
  amount: number
  category: string
  /** The line's household member: who finances it (a gift marked) or whose money an income's part is („od: …”). */
  financed: string
  note: string
  tags: string
}

/** The lines of the operations of `operationRowsOf` – the same order, the same accounts and amounts. */
export function partRowsOf(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[],
  members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>> = [],
  view: string | null = null
): PartRow[] {
  const cats = categoryIndex(categories)
  const main = operationRowsOf(transactions, categories, accounts, members, view)
  const out: PartRow[] = []
  transactions.forEach((t, i) => {
    const row = main[i]!
    const head = { operation: i + 1, date: row.date, account: row.account, kind: row.kind, counterparty: row.counterparty, title: row.title }
    // An income's parts are its members' money (D81), not categories.
    const label = (id: string | null) => (t.kind === 'income' ? '' : cats.label(id))
    if (!t.splits.length) {
      out.push({ ...head, part: '', amount: row.amount, category: label(t.categoryId), financed: row.financed, note: t.note.trim(), tags: row.tags })
      return
    }
    const rest = t.amount - sum(t.splits.map((s) => s.amount))
    const n = t.splits.length + (rest ? 1 : 0)
    t.splits.forEach((s, j) => {
      out.push({
        ...head,
        part: `${j + 1} z ${n}`,
        amount: s.amount,
        category: label(s.categoryId),
        financed: lineWhose(t, s, members),
        note: s.note.trim(),
        // The operation's tags are each line's too (F17), then the line's own.
        tags: tagsText({ tags: t.tags, splits: [s] })
      })
    })
    if (rest) out.push({ ...head, part: `${n} z ${n}`, amount: rest, category: label(t.categoryId), financed: '', note: '', tags: tagsText({ tags: t.tags, splits: [] }) })
  })
  return out
}

/** Whose a line is (D80, D81, D83): a purchase's member – a gift marked –, an income part's sender; '' – mine. */
function lineWhose(t: Transaction, s: Transaction['splits'][number], members: ReadonlyArray<Pick<HouseholdMember, 'id' | 'name'>>): string {
  if (t.kind === 'income') return s.memberId ? `od: ${memberName(s.memberId, members)}` : ''
  if (t.kind !== 'expense' || !s.refundable) return ''
  return `${memberName(s.memberId, members)}${s.gift ? ' (prezent)' : ''}`
}

const PART_HEADER = ['Nr operacji', 'Data', 'Konto', 'Rodzaj', 'Kontrahent', 'Tytuł', 'Część', 'Kwota części (zł)', 'Kategoria', 'Finansuje', 'Opis', 'Tagi'] as const

export function partsCsv(rows: readonly PartRow[]): string {
  return toCsv(
    PART_HEADER,
    rows.map((r) => [r.operation, r.date, r.account, r.kind, r.counterparty, r.title, r.part, plnCell(r.amount), r.category, r.financed, r.note, r.tags])
  )
}

export function partsSheet(rows: readonly PartRow[]): XlsxSheet {
  return {
    name: 'Części',
    freezeHeader: true,
    columns: [
      { header: 'Nr operacji', kind: 'int', width: 10 },
      { header: 'Data', kind: 'date', width: 11 },
      { header: 'Konto', kind: 'text', width: 16 },
      { header: 'Rodzaj', kind: 'text', width: 16 },
      { header: 'Kontrahent', kind: 'text', width: 30 },
      { header: 'Tytuł', kind: 'text', width: 30 },
      { header: 'Część', kind: 'text', width: 7 },
      { header: 'Kwota części (zł)', kind: 'money', width: 14 },
      { header: 'Kategoria', kind: 'text', width: 28 },
      { header: 'Finansuje', kind: 'text', width: 14 },
      { header: 'Opis', kind: 'text', width: 30 },
      { header: 'Tagi', kind: 'text', width: 22 }
    ],
    rows: rows.map((r) => [r.operation, r.date, r.account, r.kind, r.counterparty, r.title, r.part, r.amount / 100, r.category, r.financed, r.note, r.tags])
  }
}

export interface MonthRow {
  month: string
  salary: number | null
  costs: number
  income: number
  /** „Miesiąc zamknięty na plus” (spec) – as the debriefing tells it (N6); null in a month still running (N65). */
  plus: boolean | null
  /** The month still runs (N65): „w toku” instead of a result. */
  inProgress: boolean
  /** The energy left at the month's end. */
  loot: number | null
  /** „Bilans paliwa” (F25): the income less the costs, and the savings rate (% of the income; null – no income). */
  balance: number
  rate: number | null
  /** „Energia miesiąca” as the debriefing tells it (AP-29): the salary less the tanks' installments, with the loot; null – no salary paid. */
  energy: number | null
  /** „Sfinansowane przez domowników” (D80, AP-29): what household members financed in the month, together. */
  financed: number
  /**
   * Net costs of the month's operations dated after the budget's day – „zaplanowane”, apart from the costs, the income and
   * the balance (AP-36, T421 – the debriefing's `planned`); 0 in a month that has ended.
   */
  planned: number
  /** The income (D81) of the month's operations dated after the budget's day – apart, as `planned` (przegląd 2 N5). */
  plannedIncome: number
}

export function monthRows(
  input: { transactions: readonly Transaction[]; categories: readonly Category[]; plans: readonly MonthPlan[]; log: readonly FleetEvent[]; alarms?: readonly Alarm[]; containers?: readonly Pick<Container, 'id'>[]; today: string; income?: IncomeContext },
  months: readonly string[]
): MonthRow[] {
  const ctx = input.income ?? plainIncomeContext(input.transactions)
  // The month in progress up to the budget's day (AP-36, T421 – przegląd N5 8): the income of the same operations as the
  // debriefing's costs, as „Bilans paliwa” counts them (`fuelMonths`) – one period for the balance and the rate; what is
  // dated later is planned, apart. The month's operations from the list's index by month (W30).
  const upTo = upToDay(input.transactions, input.today)
  return months.map((month) => {
    const d = debriefing(month, input)
    const income = incomeOfPeriod(transactionsOfMonth(upTo, month), ctx).total
    // The income dated later (a salary typed ahead) – never lost from the file: its own column, as the costs' (przegląd 2 N5).
    const later = upTo === input.transactions ? [] : transactionsOfMonth(input.transactions, month).filter((t) => t.date > input.today)
    return {
      month,
      salary: d.salary,
      costs: d.costs,
      income,
      plus: d.plus,
      inProgress: !d.ended,
      loot: d.loot,
      balance: income - d.costs,
      rate: savingsRate(income - d.costs, income),
      energy: d.energy?.budget ?? null,
      financed: sum(d.financed.map((f) => f.amount)),
      planned: d.planned,
      plannedIncome: later.length ? incomeOfPeriod(later, ctx).total : 0
    }
  })
}

// The income as D81 counts it – „Przychody” everywhere it means that (N24).
// The energy and the financed at the end (AP-29), the planned after them – the costs and the income (przegląd N5 8, 2 N5):
// the columns before them where they were.
const MONTH_HEADER = [
  'Miesiąc',
  'Pensja (zł)',
  'Koszty netto (zł)',
  'Przychody (zł)',
  'Na plus',
  'Łupy (zł)',
  'Bilans (zł)',
  'Stopa oszczędności (%)',
  'Energia miesiąca (zł)',
  'Sfinansowane przez domowników (zł)',
  'Zaplanowane koszty – data po dziś (zł)',
  'Zaplanowane przychody – data po dziś (zł)'
] as const
// One place after the comma (T294): „55,0”, as the screens write the rate.
const rateCell = (rate: number | null) => (rate == null ? '' : rate.toFixed(1).replace('.', ','))
const plusText = (r: Pick<MonthRow, 'plus' | 'inProgress'>) => (r.inProgress ? 'w toku' : r.plus == null ? '' : r.plus ? 'tak' : 'nie')

export function monthsCsv(rows: readonly MonthRow[]): string {
  return toCsv(
    MONTH_HEADER,
    rows.map((r) => [
      r.month,
      r.salary == null ? '' : plnCell(r.salary),
      plnCell(r.costs),
      plnCell(r.income),
      plusText(r),
      r.loot == null ? '' : plnCell(r.loot),
      plnCell(r.balance),
      rateCell(r.rate),
      r.energy == null ? '' : plnCell(r.energy),
      plnCell(r.financed),
      plnCell(r.planned),
      plnCell(r.plannedIncome)
    ])
  )
}

export function monthsSheet(rows: readonly MonthRow[]): XlsxSheet {
  return {
    name: 'Miesiące',
    freezeHeader: true,
    columns: [
      { header: 'Miesiąc', kind: 'month', width: 10 },
      { header: 'Pensja (zł)', kind: 'money', width: 13 },
      { header: 'Koszty netto (zł)', kind: 'money', width: 16 },
      { header: 'Przychody (zł)', kind: 'money', width: 15 },
      { header: 'Na plus', kind: 'text', width: 9 },
      { header: 'Łupy (zł)', kind: 'money', width: 12 },
      { header: 'Bilans (zł)', kind: 'money', width: 13 },
      { header: 'Stopa oszczędności (%)', kind: 'rate', width: 12 },
      { header: 'Energia miesiąca (zł)', kind: 'money', width: 14 },
      { header: 'Sfinansowane przez domowników (zł)', kind: 'money', width: 16 },
      { header: 'Zaplanowane koszty – data po dziś (zł)', kind: 'money', width: 16 },
      { header: 'Zaplanowane przychody – data po dziś (zł)', kind: 'money', width: 16 }
    ],
    rows: rows.map((r) => [
      r.month,
      r.salary == null ? null : r.salary / 100,
      r.costs / 100,
      r.income / 100,
      plusText(r),
      r.loot == null ? null : r.loot / 100,
      r.balance / 100,
      r.rate,
      r.energy == null ? null : r.energy / 100,
      r.financed / 100,
      r.planned / 100,
      r.plannedIncome / 100
    ])
  }
}

// ------------------------------------------------------------------ the export's period (AP-29)

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * The export's period as kept (RE sp. 1): its first day as chosen; its last one as chosen – or today when today was
 * chosen, so the next export runs to the new day. Nothing kept (or unreadable): from the year's start to today.
 */
export function exportPeriodOf(raw: string | null, today: string): { from: string; to: string } {
  const fallback = { from: `${today.slice(0, 4)}-01-01`, to: today }
  try {
    const kept = JSON.parse(raw ?? 'null') as { from?: unknown; to?: unknown; toToday?: unknown } | null
    if (!kept || typeof kept.from !== 'string' || !ISO_DAY.test(kept.from)) return fallback
    const to = kept.toToday === true || typeof kept.to !== 'string' || !ISO_DAY.test(kept.to) ? today : kept.to
    return { from: kept.from, to }
  } catch {
    return fallback
  }
}

/**
 * „Excel (operacje + miesiące)” (RE sp. 5, T412): the sheets when either has rows – a period with no operations still has
 * its months; null – nothing in the period (said, no empty file). `parts` – the sheet „Części” between them (AP-29).
 */
export function budgetWorkbook(ops: readonly OperationRow[], months: readonly MonthRow[], parts?: readonly PartRow[]): XlsxSheet[] | null {
  return ops.length || months.length ? [operationsSheet(ops), ...(parts ? [partsSheet(parts)] : []), monthsSheet(months)] : null
}

/** The period to keep: „to today” when its last day is today. */
export const exportPeriodText = (from: string, to: string, today: string): string => JSON.stringify({ from, to, toToday: to === today })

// ------------------------------------------------------------------ a report as a document

export interface ReportSection {
  title: string
  /** Label – value lines. */
  lines?: ReadonlyArray<readonly [string, string]>
  table?: { head: readonly string[]; rows: ReadonlyArray<readonly string[]>; numeric?: readonly number[] }
  text?: string
}

const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** A self-contained, script-free HTML document of a report (printed to an A4 PDF). */
export function reportHtml(title: string, subtitle: string, sections: readonly ReportSection[]): string {
  const body = sections
    .map((s) => {
      const lines = s.lines?.length ? `<table class="lines">${s.lines.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${esc(v)}</td></tr>`).join('')}</table>` : ''
      const num = new Set(s.table?.numeric ?? [])
      const table = s.table
        ? `<table class="grid"><thead><tr>${s.table.head.map((h, i) => `<th${num.has(i) ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${s.table.rows
            .map((r) => `<tr>${r.map((c, i) => `<td${num.has(i) ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`
        : ''
      const text = s.text ? `<p>${esc(s.text)}</p>` : ''
      return `<section><h2>${esc(s.title)}</h2>${lines}${table}${text}</section>`
    })
    .join('')
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${esc(title)}</title><style>
body{font-family:'Segoe UI',Arial,sans-serif;color:#1d232a;font-size:11px;margin:0}
h1{font-size:18px;margin:0 0 2px}h2{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #c9ced4;padding-bottom:3px}
.sub{color:#5f6873;margin-bottom:8px}table{border-collapse:collapse;width:100%}td,th{padding:3px 6px;text-align:left}
.grid th{border-bottom:1px solid #9aa3ad;font-weight:600}.grid td{border-bottom:1px solid #e3e6ea}.num{text-align:right;font-variant-numeric:tabular-nums}
.lines td:first-child{color:#5f6873;width:55%}p{margin:4px 0;color:#3b434c}section{break-inside:avoid}
</style></head><body><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div>${body}</body></html>`
}
