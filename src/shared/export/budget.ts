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
import { amountOn, categoryIndex, isTwoSided, sum, touchesAccount } from '../calc/operations'
import { tagsOf, withTags } from '../calc/tags'
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
  return operationRowsOf(
    transactions
      .filter((t) => t.date >= from && t.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || a.createdAt.localeCompare(b.createdAt)),
    categories,
    accounts,
    members
  )
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
    note: t.note,
    tags: withTags(tagsOf(t), t.splits.flatMap((s) => s.tags ?? []))
      .map((x) => `#${x}`)
      .join(' ')
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
      { header: 'Data', kind: 'text', width: 11 },
      { header: 'Godzina', kind: 'text', width: 8 },
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
}

export function monthRows(
  input: { transactions: readonly Transaction[]; categories: readonly Category[]; plans: readonly MonthPlan[]; log: readonly FleetEvent[]; alarms?: readonly Alarm[]; containers?: readonly Pick<Container, 'id'>[]; today: string; income?: IncomeContext },
  months: readonly string[]
): MonthRow[] {
  const ctx = input.income ?? plainIncomeContext(input.transactions)
  // The month's operations from the list's index by month (W30): never the whole history for each month.
  return months.map((month) => {
    const d = debriefing(month, input)
    const income = incomeOfPeriod(transactionsOfMonth(input.transactions, month), ctx).total
    return { month, salary: d.salary, costs: d.costs, income, plus: d.plus, inProgress: !d.ended, loot: d.loot, balance: income - d.costs, rate: savingsRate(income - d.costs, income) }
  })
}

// The income as D81 counts it – „Przychody” everywhere it means that (N24).
const MONTH_HEADER = ['Miesiąc', 'Pensja (zł)', 'Koszty netto (zł)', 'Przychody (zł)', 'Na plus', 'Łupy (zł)', 'Bilans (zł)', 'Stopa oszczędności (%)'] as const
const rateCell = (rate: number | null) => (rate == null ? '' : String(rate).replace('.', ','))
const plusText = (r: Pick<MonthRow, 'plus' | 'inProgress'>) => (r.inProgress ? 'w toku' : r.plus == null ? '' : r.plus ? 'tak' : 'nie')

export function monthsCsv(rows: readonly MonthRow[]): string {
  return toCsv(
    MONTH_HEADER,
    rows.map((r) => [r.month, r.salary == null ? '' : plnCell(r.salary), plnCell(r.costs), plnCell(r.income), plusText(r), r.loot == null ? '' : plnCell(r.loot), plnCell(r.balance), rateCell(r.rate)])
  )
}

export function monthsSheet(rows: readonly MonthRow[]): XlsxSheet {
  return {
    name: 'Miesiące',
    freezeHeader: true,
    columns: [
      { header: 'Miesiąc', kind: 'text', width: 10 },
      { header: 'Pensja (zł)', kind: 'money', width: 13 },
      { header: 'Koszty netto (zł)', kind: 'money', width: 16 },
      { header: 'Przychody (zł)', kind: 'money', width: 15 },
      { header: 'Na plus', kind: 'text', width: 9 },
      { header: 'Łupy (zł)', kind: 'money', width: 12 },
      { header: 'Bilans (zł)', kind: 'money', width: 13 },
      { header: 'Stopa oszczędności (%)', kind: 'number', width: 12 }
    ],
    rows: rows.map((r) => [r.month, r.salary == null ? null : r.salary / 100, r.costs / 100, r.income / 100, plusText(r), r.loot == null ? null : r.loot / 100, r.balance / 100, r.rate])
  }
}

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
