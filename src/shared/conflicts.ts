// adapted from ICTTJ src/shared/conflicts.ts @ 84a8339
/**
 * Sync conflicts (cloud copies, duplicate ids – `ConflictEntry` from main): "Zachowaj nowsze" for chosen
 * conflicts or all of them. Pure; the renderer resolves them one by one through `resolveConflict`.
 */
import type { ConflictEntry, ConflictSide } from './api'
import { sameContentAs } from './merge'
import { isoMs } from './remoteChanges'

export type Keep = 'canonical' | 'copy'

const stamp = (s: ConflictSide): number | null => isoMs(s.updatedAt)

/**
 * Which side was changed later: by the records' `updatedAt` when both have it, by the file times when neither has it
 * (one clock for both – a record's stamp is never weighed against another file's time; a copy without a stamp may be
 * an old file the sync tool has just written, so then: equal); an unreadable side never wins. > 0 = `a`.
 */
export function compareSides(a: ConflictSide, b: ConflictSide): number {
  if (a.record == null || b.record == null) return a.record == null ? (b.record == null ? 0 : -1) : 1
  const ta = stamp(a)
  const tb = stamp(b)
  if (ta != null && tb != null) return Math.sign(ta - tb)
  if (ta != null || tb != null) return 0
  return Math.sign((a.mtimeMs || 0) - (b.mtimeMs || 0))
}

/** The newer side of one conflict; null = equally new (the bulk action keeps the original then). */
export function newerSide(c: ConflictEntry): Keep | null {
  const d = compareSides(c.copy, c.canonical)
  return d > 0 ? 'copy' : d < 0 ? 'canonical' : null
}

/**
 * Resolutions keeping the newest version, in the order to apply them. Conflicts of one file (several copies of the
 * same original) are decided together (`group`): the newest of the original and the chosen copies wins – when it is
 * a copy, its conflict goes first ("keep the copy" rewrites the original) and the other chosen copies are dropped
 * after it; if that first step fails, the rest of the group must be skipped. A conflict with an unreadable side (a
 * missing original, a broken or newer-format copy) is never decided here – `skipped`, for the user. Ids not in
 * `conflicts` are left out.
 */
export function newestResolutions(conflicts: readonly ConflictEntry[], ids: Iterable<string>): { resolutions: Array<{ id: string; keep: Keep; group: string }>; skipped: string[] } {
  const chosen = new Set(ids)
  const groups = new Map<string, ConflictEntry[]>()
  const skipped: string[] = []
  for (const c of conflicts) {
    if (!chosen.has(c.id)) continue
    if (c.canonical.record == null || c.copy.record == null) {
      skipped.push(c.id)
      continue
    }
    const list = groups.get(c.canonical.relPath)
    if (list) list.push(c)
    else groups.set(c.canonical.relPath, [c])
  }
  const out: Array<{ id: string; keep: Keep; group: string }> = []
  for (const [group, list] of groups) {
    let best: ConflictEntry | null = null
    let bestSide = list[0]!.canonical
    for (const c of list) {
      if (compareSides(c.copy, bestSide) > 0) {
        best = c
        bestSide = c.copy
      }
    }
    if (best) out.push({ id: best.id, keep: 'copy', group })
    for (const c of list) if (c !== best) out.push({ id: c.id, keep: 'canonical', group })
  }
  return { resolutions: out, skipped }
}

const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const day = (v: unknown): string => (/^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? `${str(v).slice(8, 10)}.${str(v).slice(5, 7)}.${str(v).slice(0, 4)}` : '')
const monthText = (v: unknown): string => (/^\d{4}-\d{2}$/.test(str(v)) ? `${MONTHS[Number(str(v).slice(5, 7)) - 1] ?? ''} ${str(v).slice(0, 4)}`.trim() : '')

/** How the card writes an amount and an id (the window: amounts masked with Ctrl+$, names of accounts and categories). */
export interface SubjectText {
  /** grosze → „25,50 zł” (the window: masked with the amounts). */
  amount: (grosze: number) => string
  /** A signed amount (an operation, a buoy: „+4 000,00 zł”, „−25,50 zł”); default `amount`. */
  signed?: (grosze: number) => string
  names?: ReadonlyMap<string, string>
}

/**
 * Which record a conflict is about (AP-27, DA sp. 3) – what a person recognises instead of a file name with a ULID:
 * an operation by its counterparty (else its title or category), date and amount; a plan or the game by the month; a
 * container, goal or loan by its name. From the original, or the copy when the original cannot be read; '' = neither.
 */
export function conflictSubject(c: Pick<ConflictEntry, 'kind' | 'canonical' | 'copy'>, t: SubjectText): string {
  const r = (c.canonical.record ?? c.copy.record) as Record<string, unknown> | null
  if (!r || typeof r !== 'object') return ''
  const amount = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? t.amount(v) : '')
  const signed = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? (t.signed ?? t.amount)(v) : '')
  const name = (id: unknown) => (typeof id === 'string' ? (t.names?.get(id) ?? '') : '')
  const parts = (...xs: string[]) => xs.filter(Boolean).join(' · ')
  switch (c.kind) {
    case 'transactions': {
      const who = str(r.counterparty) || str(r.title) || name(r.categoryId) || 'bez kontrahenta'
      return parts(who, day(r.date), signed(r.amount), name(r.accountId))
    }
    case 'containers':
    case 'goals':
      return parts(str(r.name), amount(c.kind === 'goals' ? r.target : r.amount))
    case 'loans':
      return parts(str(r.name), str(r.counterparty), amount(r.amount))
    case 'months':
      return parts(monthText(r.month))
    case 'game':
      return parts(monthText(r.month))
    case 'balances':
      return parts(r.kind === 'opening' ? 'saldo otwarcia' : 'potwierdzenie salda', name(r.accountId), day(r.date), amount(r.amount))
    case 'dockings':
      return parts('dostawa', day(r.date))
    case 'scheduled':
      return parts(str(r.name), day(r.date), signed(r.amount))
    case 'imports':
      return parts(str(r.fileName), day(str(r.at).slice(0, 10)))
    case 'fi': {
      const settings = r.settings as { shipName?: unknown } | undefined
      return parts('ustawienia budżetu', str(settings?.shipName) ? `okręt ${str(settings?.shipName)}` : '')
    }
    default:
      return ''
  }
}

/** The same version of a side for a person: the same file, or the same content but for the stamps of a save. */
const sameSide = (a: ConflictSide, b: ConflictSide): boolean =>
  a.mtimeMs === b.mtimeMs || (a.record != null && b.record != null && a.error === b.error && sameContentAs(a.record, b.record))

/**
 * Which side of a conflict changed since `shown` (AP-27, T431 – „Scal…” opened on it): by content, so a save of this
 * computer that only stamps the record anew (a flush before the merge) is no change; null = none.
 */
export function changedSince(shown: Pick<ConflictEntry, 'canonical' | 'copy'>, now: Pick<ConflictEntry, 'canonical' | 'copy'>): 'canonical' | 'copy' | 'both' | null {
  const canonical = !sameSide(shown.canonical, now.canonical)
  const copy = !sameSide(shown.copy, now.copy)
  return canonical && copy ? 'both' : canonical ? 'canonical' : copy ? 'copy' : null
}

/** A decision refused: a side changed since the window showed it (AP-27, T431) – the main process and the window say it. */
export const CONFLICT_CHANGED_TEXT = 'Jedna z wersji zmieniła się w trakcie (np. OneDrive przyniósł nowszą kopię) – nic nie zostało zapisane. Sprawdź wersje jeszcze raz i wybierz od nowa.'

/** The file times of a conflict's two sides a decision goes with (the main process refuses a side changed since). */
export interface ConflictSeen {
  canonical: number
  copy: number
}

const seenOf = (c: Pick<ConflictEntry, 'canonical' | 'copy'>): ConflictSeen => ({ canonical: c.canonical.mtimeMs, copy: c.copy.mtimeMs })

/**
 * The original as this window saved it just now (przegląd 3 N5): `ownBefore` – its unsaved version taken right before
 * the decision's `saveFirst` (null = nothing unsaved), and the original on the disk after the save has that content. A
 * mark of this window and this decision – never the computer's name (OneDrive bringing back this computer's earlier
 * upload, two computers of one name). A copy is never this window's write – OneDrive's (or another program's) only.
 */
const ownSave = (side: ConflictSide, ownBefore: unknown): boolean => ownBefore != null && side.record != null && sameContentAs(side.record, ownBefore)

/**
 * The versions a decision on `shown` (what the card showed at the click) goes with after this window's own save
 * (`saveFirst`, AP-27, T431). Refused here (null) only for a side whose unseen content the decision would let go: the
 * copy changed (OneDrive brought another one during the save – kept unseen, or binned unseen), or – keeping the copy,
 * which replaces the original – the original changed from outside. The original changed by this window's own save
 * (`ownBefore`, `ownSave`) is no surprise: kept, or let go into the history at the user's choice; the original kept, a
 * newer original from outside is kept too, nothing replaced. Otherwise the file times `now`, and the main process
 * refuses what changed after. Gone from the window (`now` none): the times shown – the main process says it is gone.
 */
export function seenFor(
  shown: Pick<ConflictEntry, 'canonical' | 'copy'>,
  now: Pick<ConflictEntry, 'canonical' | 'copy'> | undefined,
  keep: Keep,
  ownBefore: unknown = null
): ConflictSeen | null {
  if (!now) return seenOf(shown)
  const side = changedSince(shown, now)
  if (side === 'copy' || side === 'both') return null
  if (side === 'canonical' && keep === 'copy' && !ownSave(now.canonical, ownBefore)) return null
  return seenOf(now)
}

/**
 * „Zaakceptuj nowsze” on the versions the window showed (AP-27, T431): the newest of each is chosen on `shown` (the
 * cards at the click, `newestResolutions` – the one the card marked „nowsza” stays), and each resolution goes with the
 * file times known `now` (after this window's save). A group (one original's copies, decided together) is left whole
 * for the user when a copy of it changed in content since, or is gone (`changed`), or when its original changed and
 * the newest on the cards is a copy, which would replace it: changed from outside (`changed` – not seen), or by this
 * window's own save of the user's edits just now (`mine`, `own` – the unsaved versions taken before the save, by
 * conflict; przegląd 3 N5): neither the newer copy nor the fresh edits go without a word. An original changed and kept
 * goes on as it is now.
 */
export function newestOnShown(
  shown: readonly ConflictEntry[],
  now: readonly ConflictEntry[],
  ids: Iterable<string>,
  own: ReadonlyMap<string, unknown> = new Map()
): { resolutions: Array<{ id: string; keep: Keep; group: string; seen: ConflictSeen }>; skipped: string[]; changed: string[]; mine: string[] } {
  const chosen = new Set(ids)
  const nowById = new Map(now.map((c) => [c.id, c]))
  // Per group (the original's path, as `newestResolutions` groups): what changed since the cards were shown.
  const moved = new Map<string, { copy: boolean; outside: boolean; own: boolean }>()
  for (const c of shown) {
    if (!chosen.has(c.id)) continue
    const g = moved.get(c.canonical.relPath) ?? { copy: false, outside: false, own: false }
    const is = nowById.get(c.id)
    const side = is ? changedSince(c, is) : 'both'
    if (!is || side === 'copy' || side === 'both') g.copy = true
    else if (side === 'canonical') {
      if (ownSave(is.canonical, own.get(c.id))) g.own = true
      else g.outside = true
    }
    moved.set(c.canonical.relPath, g)
  }
  const plan = newestResolutions(shown, ids)
  const keepsCopy = new Set(plan.resolutions.filter((r) => r.keep === 'copy').map((r) => r.group))
  const resolutions: Array<{ id: string; keep: Keep; group: string; seen: ConflictSeen }> = []
  const changed: string[] = []
  const mine: string[] = []
  for (const r of plan.resolutions) {
    const g = moved.get(r.group)
    if (g?.copy || (g?.outside && keepsCopy.has(r.group))) changed.push(r.id)
    else if (g?.own && keepsCopy.has(r.group)) mine.push(r.id)
    else resolutions.push({ ...r, seen: seenOf(nowById.get(r.id)!) })
  }
  return { resolutions, skipped: plan.skipped, changed, mine }
}
