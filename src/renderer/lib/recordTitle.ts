// adapted from ICTTJ src/renderer/lib/recordTitle.ts @ 84a8339
import type { HistoryKind } from '@shared/api'

const s = (v: unknown) => (typeof v === 'string' ? v : '')

/** Short human name of a record for lists and dialogs ("Operacja 2026-10-01", "Plan miesiąca 2026-10"…). */
export function recordTitle(kind: HistoryKind, record: unknown): string {
  const r = (record ?? {}) as Record<string, unknown>
  const named = (prefix: string) => `${prefix}${s(r.name) ? `: ${s(r.name)}` : ''}`
  switch (kind) {
    case 'transactions': {
      const amount = typeof r.amount === 'number' ? ` ${r.amount > 0 ? '+' : r.amount < 0 ? '−' : ''}${(Math.abs(r.amount) / 100).toFixed(2).replace('.', ',')} zł` : ''
      return `Operacja ${s(r.date)}${s(r.counterparty) ? `: ${s(r.counterparty)}` : ''}${amount}`
    }
    case 'containers':
      return named('Kontener')
    case 'goals':
      return named('Cel')
    case 'months':
      return `Plan miesiąca ${s(r.month)}`
    case 'dockings':
      return `Dokowanie ${s(r.date)}`
    case 'loans':
      return named('Pożyczka')
    case 'balances':
      return `Saldo ${s(r.date)}`
    case 'game':
      return `Dowództwo ${s(r.month)}`
    case 'fi':
      return 'Ustawienia'
    default:
      return String(kind)
  }
}
