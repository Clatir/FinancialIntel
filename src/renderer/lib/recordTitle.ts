// adapted from ICTTJ src/renderer/lib/recordTitle.ts @ 84a8339
import type { HistoryKind } from '@shared/api'
import { signedPln } from '../components/fields'
import { monthLabel, plDate } from './format'

const s = (v: unknown) => (typeof v === 'string' ? v : '')
/** A day or a month as the screens write them (AP-23): never the ISO form; whatever is not one stays as it is. */
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}/.test(s(v)) ? plDate(s(v)) : s(v))
const month = (v: unknown) => (/^\d{4}-\d{2}$/.test(s(v)) ? monthLabel(s(v)) : s(v))

/** Short human name of a record for lists and dialogs ("Operacja 01.10.2026", "Plan miesiąca październik 2026"…). */
export function recordTitle(kind: HistoryKind, record: unknown): string {
  const r = (record ?? {}) as Record<string, unknown>
  const named = (prefix: string) => `${prefix}${s(r.name) ? `: ${s(r.name)}` : ''}`
  switch (kind) {
    case 'transactions': {
      // As the lists write amounts – hidden with them (Ctrl+$, B7).
      const amount = typeof r.amount === 'number' ? ` ${signedPln(r.amount)} zł` : ''
      return `Operacja ${day(r.date)}${s(r.counterparty) ? `: ${s(r.counterparty)}` : ''}${amount}`
    }
    case 'containers':
      return named('Kontener')
    case 'goals':
      return named('Cel')
    case 'months':
      return `Plan miesiąca ${month(r.month)}`
    case 'dockings':
      return `Dokowanie ${day(r.date)}`
    case 'loans':
      return named('Pożyczka')
    case 'balances':
      return `Saldo ${day(r.date)}`
    case 'game':
      return `Dowództwo ${month(r.month)}`
    case 'scheduled':
      return `Boja ${day(r.date)}${s(r.name) ? `: ${s(r.name)}` : ''}`
    case 'imports':
      return `Import z banku ${day(s(r.at).slice(0, 10))}${s(r.fileName) ? `: ${s(r.fileName)}` : ''}`
    case 'fi':
      return 'Ustawienia'
    default:
      return String(kind)
  }
}
