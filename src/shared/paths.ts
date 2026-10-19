// adapted from ICTTJ src/shared/paths.ts @ 84a8339
/**
 * Layout of the data folder. All paths handled by the app are RELATIVE to the data folder
 * and always use forward slashes, so the folder can be moved or synced as a whole.
 *
 * Every collection has one of three file layouts:
 * - 'dated': `<dir>/RRRR/RRRR-MM-DD_<ULID>.json` – the Warsaw date of the record (`date` field); a date change moves
 *   the file;
 * - 'id': `<dir>/<ULID>.json`;
 * - 'month': `<dir>/RRRR-MM.json` – one file per calendar month (`month` field).
 */

export type Collection = 'transactions' | 'containers' | 'goals' | 'months' | 'dockings' | 'loans' | 'balances' | 'game' | 'imports' | 'scheduled'
export const COLLECTIONS: readonly Collection[] = ['transactions', 'containers', 'goals', 'months', 'dockings', 'loans', 'balances', 'game', 'imports', 'scheduled']
/** `fi` = fi.json (settings, categories, accounts, layers, orders, import rules). */
export type FileKind = Collection | 'fi'

export type Layout = 'dated' | 'id' | 'month'
export const LAYOUTS: Record<Collection, Layout> = {
  transactions: 'dated',
  containers: 'id',
  goals: 'id',
  months: 'month',
  dockings: 'dated',
  loans: 'id',
  balances: 'dated',
  game: 'month',
  // The imports of the bank's files (1.5.1, F4 „Cofnij import”).
  imports: 'id',
  // The planned operations and terms ahead (1.8.0, F16 – „Boje nawigacyjne”).
  scheduled: 'id'
}

export const SETTINGS_FILE = 'fi.json'
export const BACKUPS_DIR = 'backups'
export const PRESENCE_DIR = '.presence'

const ULID = '[0-9A-HJKMNP-TV-Z]{26}'

const STEMS: Record<Layout, string> = {
  dated: `\\d{4}-\\d{2}-\\d{2}_${ULID}`,
  id: ULID,
  month: '\\d{4}-\\d{2}'
}

function canonicalOf(c: Collection): RegExp {
  const layout = LAYOUTS[c]
  return layout === 'dated' ? new RegExp(`^${c}/(\\d{4})/(${STEMS.dated})\\.json$`) : new RegExp(`^${c}/(${STEMS[layout]})\\.json$`)
}

const CANONICAL: Record<FileKind, RegExp> = {
  fi: /^fi\.json$/,
  ...(Object.fromEntries(COLLECTIONS.map((c) => [c, canonicalOf(c)])) as Record<Collection, RegExp>)
}

/** Stem prefixes used to recognize copies made by sync tools (anything appended after a canonical stem). */
const STEM_PREFIX: Record<FileKind, RegExp> = {
  // A separator after the short stem: "fi-PC", "fi (1)", "fi.sync-conflict-…" are copies, "firma.json" is not.
  fi: /^(fi)([- (.].*)$/,
  ...(Object.fromEntries(COLLECTIONS.map((c) => [c, new RegExp(`^(${STEMS[LAYOUTS[c]]})(.+)$`)])) as Record<Collection, RegExp>)
}

export function toPosix(p: string): string {
  return p.replace(/\\/g, '/')
}

/** Files and folders the scanner and watcher never treat as records. */
export function isIgnoredPath(rel: string): boolean {
  const p = toPosix(rel)
  if (p.startsWith(`${BACKUPS_DIR}/`) || p === BACKUPS_DIR) return true
  if (p.includes('.tmp-')) return true
  return p.split('/').some((seg) => seg.startsWith('.'))
}

export function kindOfDir(rel: string): FileKind | null {
  const p = toPosix(rel)
  if (!p.includes('/')) return p.endsWith('.json') ? 'fi' : null
  const top = p.split('/')[0] as Collection
  return COLLECTIONS.includes(top) ? top : null
}

export function classifyCanonical(rel: string): FileKind | null {
  const p = toPosix(rel)
  for (const kind of Object.keys(CANONICAL) as FileKind[]) {
    if (CANONICAL[kind].test(p)) return kind
  }
  return null
}

export interface ConflictName {
  kind: FileKind
  /** Canonical relative path this file is a copy of. */
  canonicalPath: string
  /** Best guess of the sync tool that created the copy. */
  source: string
}

export function guessConflictSource(remainder: string): string {
  if (/^-zewnetrzna-/.test(remainder)) return 'zmiana z zewnątrz podczas edycji'
  if (/^-uszkodzona-/.test(remainder)) return 'uszkodzony plik odsunięty przy zapisie'
  if (/sync-conflict/i.test(remainder)) return 'Syncthing'
  if (/conflicted copy|kopia powoduj|konflikt/i.test(remainder)) return 'Dropbox'
  if (/^ \(\d+\)$/.test(remainder)) return 'Google Drive / kopia'
  if (/^-[A-Za-z0-9][A-Za-z0-9-]*$/.test(remainder)) return 'OneDrive'
  return 'nieznane źródło'
}

/** Recognize a non-canonical JSON file in a data directory as a sync-conflict copy of a canonical file. */
export function detectConflictName(rel: string): ConflictName | null {
  const p = toPosix(rel)
  if (!p.toLowerCase().endsWith('.json') || classifyCanonical(p)) return null
  const kind = kindOfDir(p)
  if (!kind) return null
  const slash = p.lastIndexOf('/')
  const dir = slash >= 0 ? p.slice(0, slash + 1) : ''
  const stem = p.slice(slash + 1, -'.json'.length)
  const m = STEM_PREFIX[kind].exec(stem)
  if (!m) return null
  const canonicalPath = `${dir}${m[1]}.json`
  if (classifyCanonical(canonicalPath) !== kind) return null
  return { kind, canonicalPath, source: guessConflictSource(m[2] ?? '') }
}

/**
 * The record id a file's name carries ('dated' and 'id' layouts; for a sync copy, of its original): a file without an
 * id gets this one when read, so it stays the same record on every read and every computer.
 */
export function idFromPath(rel: string): string | null {
  const p = toPosix(rel)
  const kind = classifyCanonical(p) ? kindOfDir(p) : detectConflictName(p)?.kind
  if (!kind || kind === 'fi' || LAYOUTS[kind] === 'month') return null
  const canonical = classifyCanonical(p) ? p : (detectConflictName(p)?.canonicalPath ?? p)
  return new RegExp(`(${ULID})\\.json$`).exec(canonical)?.[1] ?? null
}

/** Relative path of a record of `collection` (the fields its layout names: `date`, `month`, `id`). */
export function recordRelPath(collection: Collection, record: Record<string, unknown>): string {
  const id = String(record.id)
  switch (LAYOUTS[collection]) {
    case 'dated': {
      const date = String(record.date)
      return `${collection}/${date.slice(0, 4)}/${date}_${id}.json`
    }
    case 'month':
      return `${collection}/${String(record.month)}.json`
    case 'id':
      return `${collection}/${id}.json`
  }
}

/** Reject absolute paths and traversal; returns normalized posix relative path or null. */
export function sanitizeRelPath(rel: string): string | null {
  const p = toPosix(rel).replace(/^\.\/+/, '')
  if (!p || p.startsWith('/') || /^[A-Za-z]:/.test(p)) return null
  const parts = p.split('/')
  if (parts.some((s) => s === '..' || s === '')) return null
  return parts.join('/')
}
