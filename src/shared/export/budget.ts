/**
 * The budget's exports (E8, spec „Eksport”: CSV i Excel – operacje, miesiące; PDF – debriefing, przegląd roczny): the
 * same rows for both formats; a report as a self-contained HTML document the main process prints to PDF (no scripts,
 * nothing loaded from outside). Always the real amounts – the hidden amounts are the screen's (D73).
 */
import type { Category, Account } from '../schema/budget'
import type { MonthPlan, Transaction } from '../schema/records'
import { TX_KIND_LABEL } from '../schema/records'
import { categoryIndex, incomeOf, sum } from '../calc/operations'
import { debriefing } from '../calc/plan'
import type { FleetEvent } from '../calc/fleet'
import { monthOf } from '../calc/dates'
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
  refundable: boolean
  log: string
  note: string
}

export function operationRows(transactions: readonly Transaction[], categories: readonly Category[], accounts: readonly Account[], from: string, to: string): OperationRow[] {
  const cats = categoryIndex(categories)
  const accountName = new Map(accounts.map((a) => [a.id, a.name]))
  return transactions
    .filter((t) => t.date >= from && t.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || a.createdAt.localeCompare(b.createdAt))
    .map((t) => ({
      date: t.date,
      time: t.time ?? '',
      account: accountName.get(t.accountId) ?? '',
      kind: TX_KIND_LABEL[t.kind],
      amount: t.amount,
      category: t.splits.length ? t.splits.map((s) => cats.label(s.categoryId)).join(' + ') : cats.label(t.categoryId),
      counterparty: t.counterparty,
      title: t.title,
      refundable: t.refundable || t.splits.some((s) => s.refundable),
      log: t.impulse ? IMPULSE_LABEL[t.impulse] : '',
      note: t.note
    }))
}

const OPERATION_HEADER = ['Data', 'Godzina', 'Konto', 'Rodzaj', 'Kwota (zł)', 'Kategoria', 'Kontrahent', 'Tytuł', 'Do zwrotu', 'Dziennik', 'Notatka'] as const

export function operationsCsv(rows: readonly OperationRow[]): string {
  return toCsv(
    OPERATION_HEADER,
    rows.map((r) => [r.date, r.time, r.account, r.kind, plnCell(r.amount), r.category, r.counterparty, r.title, r.refundable ? 'tak' : '', r.log, r.note])
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
      { header: 'Do zwrotu', kind: 'text', width: 9 },
      { header: 'Dziennik', kind: 'text', width: 9 },
      { header: 'Notatka', kind: 'text', width: 30 }
    ],
    rows: rows.map((r) => [r.date, r.time, r.account, r.kind, r.amount / 100, r.category, r.counterparty, r.title, r.refundable ? 'tak' : '', r.log, r.note])
  }
}

export interface MonthRow {
  month: string
  salary: number | null
  costs: number
  income: number
  /** Costs not above the salary (spec: „Miesiąc zamknięty na plus”). */
  plus: boolean | null
  /** The energy left at the month's end. */
  loot: number | null
}

export function monthRows(input: { transactions: readonly Transaction[]; categories: readonly Category[]; plans: readonly MonthPlan[]; log: readonly FleetEvent[]; today: string }, months: readonly string[]): MonthRow[] {
  return months.map((month) => {
    const d = debriefing(month, input)
    return { month, salary: d.salary, costs: d.costs, income: sum(input.transactions.filter((t) => monthOf(t.date) === month).map(incomeOf)), plus: d.plus, loot: d.loot }
  })
}

const MONTH_HEADER = ['Miesiąc', 'Pensja (zł)', 'Koszty netto (zł)', 'Wpływy (zł)', 'Na plus', 'Łupy (zł)'] as const
const yesNo = (v: boolean | null) => (v == null ? '' : v ? 'tak' : 'nie')

export function monthsCsv(rows: readonly MonthRow[]): string {
  return toCsv(
    MONTH_HEADER,
    rows.map((r) => [r.month, r.salary == null ? '' : plnCell(r.salary), plnCell(r.costs), plnCell(r.income), yesNo(r.plus), r.loot == null ? '' : plnCell(r.loot)])
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
      { header: 'Wpływy (zł)', kind: 'money', width: 13 },
      { header: 'Na plus', kind: 'text', width: 9 },
      { header: 'Łupy (zł)', kind: 'money', width: 12 }
    ],
    rows: rows.map((r) => [r.month, r.salary == null ? null : r.salary / 100, r.costs / 100, r.income / 100, yesNo(r.plus), r.loot == null ? null : r.loot / 100])
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
