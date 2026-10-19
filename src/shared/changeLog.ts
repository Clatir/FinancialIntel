/**
 * The folder's change log (1.7.0, F33): the records changed lately – on this computer or another – newest first, by
 * when and by which computer they were last written (`updatedAt` / `updatedBy`); the fields changed and the version
 * before come from each record's history on demand. The game's frozen days and the import's batches are written by
 * the app itself – not in it.
 */
export const CHANGELOG_KINDS = ['transactions', 'months', 'containers', 'goals', 'loans', 'balances', 'dockings', 'fi'] as const
export type ChangeLogKind = (typeof CHANGELOG_KINDS)[number]

export const CHANGELOG_KIND_LABEL: Record<ChangeLogKind, string> = {
  transactions: 'operacja',
  months: 'plan miesiąca',
  containers: 'kontener',
  goals: 'cel',
  loans: 'pożyczka',
  balances: 'saldo',
  dockings: 'dokowanie',
  fi: 'ustawienia'
}

export interface ChangeLogEntry {
  kind: ChangeLogKind
  id: string
  /** When it was last written, by which computer (null – unknown: written before 1.4.0 or by hand). */
  at: string
  by: string | null
  /** Created in the log's period – a new entry (an operation typed in the editor is written many times as it is typed). */
  created: boolean
  record: unknown
}

export interface ChangeLogFilter {
  /** From when (ISO). */
  since: string
  machine: string | null
  kind: ChangeLogKind | null
}

type Stamped = { id?: unknown; createdAt?: unknown; updatedAt?: unknown; updatedBy?: unknown }

/** The records changed since `filter.since`, newest first; `records` – each kind's records (fi.json – one). */
export function changeLog(records: Partial<Record<ChangeLogKind, readonly unknown[]>>, filter: ChangeLogFilter): ChangeLogEntry[] {
  const out: ChangeLogEntry[] = []
  for (const kind of CHANGELOG_KINDS) {
    if (filter.kind && filter.kind !== kind) continue
    for (const r of records[kind] ?? []) {
      const x = r as Stamped
      if (typeof x.updatedAt !== 'string' || x.updatedAt < filter.since) continue
      const by = typeof x.updatedBy === 'string' && x.updatedBy ? x.updatedBy : null
      if (filter.machine && by !== filter.machine) continue
      out.push({ kind, id: String(x.id ?? (kind === 'fi' ? 'fi' : '')), at: x.updatedAt, by, created: typeof x.createdAt === 'string' && x.createdAt >= filter.since, record: r })
    }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1))
}

/** The computers that wrote the records of a log (the filter's choices), named ones in the order of the alphabet. */
export function changeLogMachines(entries: readonly ChangeLogEntry[]): string[] {
  return [...new Set(entries.flatMap((e) => (e.by ? [e.by] : [])))].sort((a, b) => a.localeCompare(b, 'pl'))
}
