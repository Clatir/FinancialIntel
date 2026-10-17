/**
 * Names of one counterparty the brand key does not join (1.2.2, D78 – idea 5 of D75): the words in another order or one
 * more word („KAWIARNIA MOKKA”, „MOKKA KAWIARNIA SP Z O O”, „MOKKA”), a name the bank cut off, a typo, a branch
 * („MOKKA DWORZEC”, „MOKKA ARKADIA”). No AI: whole words without the generic ones („sklep”, „kawiarnia”) and a small
 * edit distance. Nothing is joined by itself – the user approves a pair („to chyba to samo”), which becomes an alias of
 * brand keys (`aliases.ts`) for every later import and rule; a pair said to be two stays apart.
 * Only names outside the dictionary of chains (a chain is one brand already), compared with each other and with the
 * brands of the user's rules from the earlier imports.
 */
import { pairKey, resolveBrand, type BrandAliases } from './aliases'
import { brandById, brandOf, isGenericWord, isKeywordWord, sameWord } from './brands'
import { opKindOf, type ImportGroup } from './reconcile'
import type { ImportRule } from '../schema/budget'

/** Why two names look like one: the same words („words”), one cut off („cut”), a typo, the same first word of a shop. */
export type SimilarWhy = 'words' | 'cut' | 'typo' | 'first'

export interface SimilarSide {
  /** The brand key (with the user's merges). */
  brand: string
  label: string
  /** The bank's names of it in the file (a rule's: its label). */
  names: string[]
  /** Operations of it in the file; 0 = a brand of the user's rule, not in the file. */
  count: number
  /** The user's rules of the brand (from earlier imports) – a brand of the file merged into it takes them. */
  rules: ImportRule[]
}

export interface SimilarPair {
  /** `pairKey` of the two brands: „to nie to samo” remembers it. */
  key: string
  a: SimilarSide
  b: SimilarSide
  why: SimilarWhy
}

interface Entry extends SimilarSide {
  /** The words of its names (the brand key's words). */
  words: string[]
  /** The words of its first name, in order: a shop's name is first, a town last („APTEKA ŚWIEBODZICE”). */
  head: string[]
  /** Its words that tell it apart (no generic ones, no keywords' words – „kawiarnia”). */
  distinct: string[]
  /** A transfer's other side – often a person: a common word is not enough („ANNA NOWAK”, „JAN NOWAK”). */
  person: boolean
}

/** A name cut off by the bank (25 characters of a card terminal): the shorter key is at least this long. */
const CUT_MIN = 12
const RANK: Record<SimilarWhy, number> = { words: 0, cut: 1, typo: 2, first: 3 }

/** Two folded words are one („?” – a letter the bank could not encode – is any letter). */
const sameText = (a: string, b: string) => sameWord(a, b, false) || sameWord(b, a, false)

/** The edit distance of two keys, up to `max` (more = `max` + 1). */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      cur.push(v)
      if (v < best) best = v
    }
    if (best > max) return max + 1
    prev = cur
  }
  return Math.min(prev[b.length]!, max + 1)
}

type Compared = Pick<Entry, 'brand' | 'head' | 'distinct' | 'person'>

/** A word that tells a name apart (not generic, not a keyword's word like „kawiarnia”). */
const telling = (w: string) => !isGenericWord(w) && !isKeywordWord(w) && /[a-z]/.test(w)

/** Why two names look like one counterparty, null = they do not. */
export function similarity(x: Compared, y: Compared): SimilarWhy | null {
  const [s, l] = x.brand.length <= y.brand.length ? [x, y] : [y, x]
  if (s.brand.length >= CUT_MIN && l.brand.startsWith(s.brand)) return 'cut'
  const person = x.person || y.person
  const [few, many] = x.distinct.length <= y.distinct.length ? [x.distinct, y.distinct] : [y.distinct, x.distinct]
  // Every telling word of one in the other: another order, one more word – a person by two words at least. One word
  // only, last in both names, is likely the town of two shops („APTEKA ŚWIEBODZICE”, „BISTRO ŚWIEBODZICE”) – unless
  // it is the whole of one name („MOKKA”, „KAWIARNIA MOKKA”).
  if (few.length >= (person ? 2 : 1) && few.some((w) => w.length >= 4) && few.every((w) => many.some((v) => sameText(v, w)))) {
    const town = few.length === 1 && [x, y].every((e) => e.head.length > 1 && sameText(e.head.at(-1)!, few[0]!))
    if (!town) return 'words'
  }
  // A letter apart is a typo of a shop's name – of people, another person („MARIA”, „MARTA KOWALSKA”).
  if (!person && s.brand.length >= 6 && l.brand.length - s.brand.length <= 2) {
    const d = editDistance(x.brand, y.brand, 2)
    if (d <= 1 || (d <= 2 && s.brand.length >= CUT_MIN)) return 'typo'
  }
  // A shop's branches start with its name („MOKKA DWORZEC”, „MOKKA ARKADIA”); people share first names.
  const fx = x.head[0]
  const fy = y.head[0]
  if (!person && fx && fy && x.head.length > 1 && y.head.length > 1 && fx.length >= 5 && telling(fx) && sameText(fx, fy)) return 'first'
  return null
}

const distinctOf = (ws: readonly string[]) => ws.filter(telling)

/** The brands of the file outside the dictionary, with their words. */
function fileEntries(groups: readonly ImportGroup[]): Map<string, Entry> {
  const out = new Map<string, Entry & { biggest: number }>()
  for (const g of groups) {
    if (g.chain || !g.brand) continue
    let e = out.get(g.brand)
    if (!e) {
      e = { brand: g.brand, label: g.label, names: [], count: 0, rules: [], words: [], head: g.rows[0]!.words, distinct: [], person: false, biggest: 0 }
      out.set(g.brand, e)
    }
    if (g.rows.length > e.biggest) {
      e.biggest = g.rows.length
      e.label = g.label
    }
    e.count += g.rows.length
    for (const n of g.names) if (!e.names.includes(n)) e.names.push(n)
    for (const p of g.rows) {
      for (const w of p.words) if (!e.words.includes(w)) e.words.push(w)
      if (opKindOf(p.row.operation) === 'transfer') e.person = true
    }
  }
  for (const e of out.values()) e.distinct = distinctOf(e.words)
  return out
}

/**
 * The brands of the user's exact rules not in the file (their label is the bank's name), outside the dictionary; a rule
 * that decides names of the file already (a key of a whole name, learned before 1.2.1) is no other name.
 */
function ruleEntries(rules: readonly ImportRule[], aliases: BrandAliases, file: ReadonlyMap<string, Entry>, used: ReadonlySet<string>): Map<string, Entry> {
  const out = new Map<string, Entry>()
  for (const r of rules) {
    if (r.mode !== 'exact' || brandById(r.match) || file.has(r.match) || used.has(r.match) || resolveBrand(aliases, r.match) !== r.match) continue
    const e = out.get(r.match)
    if (e) {
      e.rules.push(r)
      if (r.kind !== 'expense') e.person = true
      continue
    }
    const m = brandOf(r.label || r.match, { dictionary: false })
    const words = m.words.length ? m.words : [r.match]
    out.set(r.match, { brand: r.match, label: r.label || r.match, names: [r.label || r.match], count: 0, rules: [r], words, head: words, distinct: distinctOf(words), person: r.kind !== 'expense' })
  }
  return out
}

/**
 * The pairs of names that look like one counterparty: in the file, and a name of the file with a brand of the user's
 * rules; the surest kind first, then the most operations. `dismissed` = pairs said to be two (`notSimilar`).
 */
export function similarPairs(
  groups: readonly ImportGroup[],
  opts: { rules?: readonly ImportRule[]; aliases?: BrandAliases; dismissed?: Readonly<Record<string, unknown>>; limit?: number } = {}
): SimilarPair[] {
  const aliases = opts.aliases ?? {}
  const dismissed = opts.dismissed ?? {}
  const file = [...fileEntries(groups).values()]
  // The keys the rules of the file's rows are looked up by (`findRule`).
  const used = new Set(groups.flatMap((g) => g.rows.flatMap((p) => [p.target.raw, p.target.key])))
  const known = [...ruleEntries(opts.rules ?? [], aliases, new Map(file.map((e) => [e.brand, e])), used).values()]
  // The rules of a brand of the file (it keeps them when the other one is merged into it).
  for (const e of file) e.rules = (opts.rules ?? []).filter((r) => r.mode === 'exact' && r.match === e.brand)
  const out: SimilarPair[] = []
  const side = (e: Entry): SimilarSide => ({ brand: e.brand, label: e.label, names: e.names, count: e.count, rules: e.rules })
  // Only names that may be alike are compared (a history of years has hundreds of names): a common telling word or
  // first word, the start a cut name keeps, the start or the end a typo leaves.
  const all = [...file, ...known]
  const buckets = new Map<string, number[]>()
  const put = (key: string, i: number) => {
    const list = buckets.get(key)
    if (!list) buckets.set(key, [i])
    else if (list.at(-1) !== i) list.push(i)
  }
  all.forEach((e, i) => {
    for (const w of e.distinct) put(`w:${w.replace(/\?/g, '')}`, i)
    if (e.head[0] && telling(e.head[0])) put(`w:${e.head[0].replace(/\?/g, '')}`, i)
    if (e.brand.length >= CUT_MIN) put(`c:${e.brand.slice(0, CUT_MIN)}`, i)
    if (e.brand.length >= 6) {
      put(`s:${e.brand.slice(0, 4)}`, i)
      put(`e:${e.brand.slice(-4)}`, i)
    }
  })
  const seen = new Set<number>()
  for (const list of buckets.values())
    for (let x = 0; x < list.length; x++)
      for (let y = x + 1; y < list.length; y++) {
        const [i, j] = [list[x]!, list[y]!]
        // The rules' brands are compared with the file's only.
        if (i >= file.length && j >= file.length) continue
        const id = Math.min(i, j) * all.length + Math.max(i, j)
        if (seen.has(id)) continue
        seen.add(id)
        const [a, b] = i < j ? [all[i]!, all[j]!] : [all[j]!, all[i]!]
        const key = pairKey(a.brand, b.brand)
        if (dismissed[key]) continue
        const why = similarity(a, b)
        if (why) out.push({ key, a: side(a), b: side(b), why })
      }
  out.sort((p, q) => RANK[p.why] - RANK[q.why] || q.a.count + q.b.count - (p.a.count + p.b.count) || p.key.localeCompare(q.key))
  return out.slice(0, opts.limit ?? 60)
}

/**
 * Which of the brands the others are merged into: one with the user's rules first (they stay its), then the one with
 * the most operations, then the longest key (a name cut off is the shorter one).
 */
export function mergeTarget<T extends Pick<SimilarSide, 'brand' | 'count' | 'rules'>>(sides: readonly T[]): T {
  return [...sides].sort((a, b) => Number(b.rules.length > 0) - Number(a.rules.length > 0) || b.count - a.count || b.brand.length - a.brand.length || a.brand.localeCompare(b.brand))[0]!
}
