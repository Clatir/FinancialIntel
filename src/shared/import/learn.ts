/**
 * Learning from a decision (1.2.2, D78 – idea 6 of D75): after the user decides a group, the words of its names – of a
 * transfer, of its titles (the other side is often a person) – that other operations of the file have too, each with
 * the operations a keyword rule of it would decide the same way. The user takes one in a click: a keyword of their own
 * (as in the settings), for this file and the next imports.
 */
import { fold } from '../fold'
import { isCityWord, isGenericWord, isKeywordWord, keywordMatches, sameWord, tokens, withoutProcessor, words } from './brands'
import { withoutLegalForms } from './names'
import { findRule, isFeeOperation } from './classify'
import { choiceOf, opKindOf, sameChoice, type Choice, type ImportChoices, type ImportGroup } from './reconcile'
import type { ImportRule } from '../schema/budget'

export interface KeywordProposal {
  /** As a rule keeps it: one folded word. */
  keyword: string
  /** As the bank wrote it (lower case, Polish marks), for the screen. */
  text: string
  /** Operations of other groups of the file a rule of it would decide so (`RowPlan.key`), none the user decided. */
  rows: string[]
  /** Their groups. */
  groups: string[]
}

const isTransfer = (operation: string) => opKindOf(operation) === 'transfer'

/**
 * Words of the file that say where or who, not what: the last word of the names of a chain and another brand, or of
 * three brands (a town – „DINO ŚWIEBODZICE”, „APTEKA ŚWIEBODZICE”; not „PIEKARNIA GRZYBEK”, „CUKIERNIA GRZYBEK”), and
 * the words of the names of the transfers' other sides (people – „JAN” in a title „ZA BILETY JAN”; in any form:
 * „PREZENT DLA ANNY” has „ANNA”); and the words in the names and titles of most brands of the file (what the bank
 * writes to every operation – 1.2.3). Computed once per plan's groups.
 */
const NOT_WHAT = new WeakMap<readonly ImportGroup[], { places: Set<string>; people: string[] }>()
function notWhat(groups: readonly ImportGroup[]): { places: Set<string>; people: string[] } {
  const cached = NOT_WHAT.get(groups)
  if (cached) return cached
  const lastOf = new Map<string, { brands: Set<string>; chain: boolean }>()
  const places = new Set<string>()
  const people = new Set<string>()
  const brandsOf = new Map<string, Set<string>>()
  for (const g of groups)
    for (const p of g.rows) {
      for (const w of [...words(p.row.counterparty), ...words(p.row.title)]) {
        const at = brandsOf.get(w)
        if (at) at.add(g.brand)
        else brandsOf.set(w, new Set([g.brand]))
      }
      // The words of the name without its legal form („GRZYBEK SP. Z O.O.” is one word), numbers and codes.
      const all = words(withoutLegalForms(fold(p.row.counterparty))).filter((w) => /[a-z]{3}/.test(w))
      const ws = all.filter((w) => !isGenericWord(w))
      if (isTransfer(p.row.operation)) for (const w of ws) people.add(w)
      // The last word of a name of two words or more that is no keyword's („PL BK ŚWIEBODZICE PASAŻ”; not „APTEKA
      // CENTRUM”).
      const last = all.length > 1 ? ws.filter((w) => !isKeywordWord(w)).at(-1) : undefined
      if (!last) continue
      const at = lastOf.get(last) ?? { brands: new Set<string>(), chain: false }
      at.brands.add(g.brand)
      at.chain ||= g.chain
      lastOf.set(last, at)
    }
  for (const [w, at] of lastOf) if ((at.chain && at.brands.size >= 2) || at.brands.size >= 3) places.add(w)
  const brands = new Set(groups.map((g) => g.brand)).size
  if (brands >= 6) for (const [w, at] of brandsOf) if (at.size * 2 > brands) places.add(w)
  const out = { places, people: [...people] }
  NOT_WHAT.set(groups, out)
  return out
}

/**
 * A word is a form of a name: it starts with the name without its last vowel and goes on by an ending of three letters
 * at most („anny”, „annie” – „anna”; „kowalskiej” – „kowalska”; „jana” – „jan”), not another word („karma” – „karol”).
 */
function formOf(word: string, name: string): boolean {
  const stem = /[aeiouy]$/.test(name) ? name.slice(0, -1) : name
  return word === name || (stem.length >= 3 && word.startsWith(stem) && word.length - stem.length <= 3)
}

/** The decisions a keyword rule holds. */
const KEYWORD_KINDS: readonly string[] = ['expense', 'income', 'transfer']

/**
 * What a keyword's word may go on by and still be the same word – a Polish ending, folded („cukierni” – „cukiernia”,
 * „kurs” – „kursy”), not just any letters („roma” – „roman” is another word).
 */
const ENDINGS = new Set(
  ['a', 'e', 'i', 'o', 'u', 'y', 'ie', 'om', 'ow', 'em', 'ej', 'ym', 'im', 'ich', 'ych', 'ego', 'emu', 'iej', 'iem', 'ach', 'ami', 'owi', 'owie', 'owa', 'owy', 'owe', 'owej', 'owym', 'owego']
)

/**
 * How a keyword catches a row's words (a keyword's last word may go on): as the same word or with an ending ('near'),
 * only inside a longer, other word ('far' – „auto” in „AUTOMATSPEC”, „roma” in „ROMAN”), or not at all.
 */
function catchOf(ws: readonly string[], keyword: string): 'near' | 'far' | null {
  let far = false
  for (const w of ws) {
    if (!sameWord(w, keyword, true)) continue
    if (w.length === keyword.length || ENDINGS.has(w.slice(keyword.length))) return 'near'
    far = true
  }
  return far ? 'far' : null
}

/** The words a group's decision may be remembered by: word → as written. */
function candidates(groups: readonly ImportGroup[], g: ImportGroup, rules: readonly ImportRule[], ownNames: readonly string[]): Map<string, string> {
  const person = g.rows.some((p) => isTransfer(p.row.operation))
  const { places, people } = notWhat(groups)
  const who = [...people, ...ownNames.flatMap((n) => words(n))]
  const out = new Map<string, string>()
  for (const p of g.rows)
    // The shop's name without the processor before it („SumUp *PRACOWNIA”: „sumup” names hundreds of shops).
    for (const text of person ? [p.row.title] : [withoutProcessor(p.row.counterparty), p.row.title])
      for (const t of tokens(text)) {
        const w = t.word
        if (out.has(w) || w.length < 4 || !/^[a-z]+$/.test(w) || isGenericWord(w) || isCityWord(w) || places.has(w) || who.some((x) => formOf(w, x))) continue
        // Already a keyword of the user's for this money.
        if (rules.some((r) => r.mode === 'keyword' && r.match === w && (r.direction == null || r.direction === g.direction))) continue
        out.set(w, t.text)
      }
  return out
}

/**
 * Keywords a group's decision (`choice`) may become, with the operations of the other groups they would decide so –
 * the most first, at most `limit`; none with nothing to change. Operations the user decided (themselves, their group
 * or theme) and left out of the import do not count; neither do those an exact rule or a longer keyword keeps.
 */
export function keywordProposals(
  groups: readonly ImportGroup[],
  group: ImportGroup,
  choice: Choice,
  ctx: { rules: readonly ImportRule[]; choices: ImportChoices; ownNames?: readonly string[] },
  limit = 3
): KeywordProposal[] {
  // An expense without a category teaches nothing; a loan, XTB, the tax are decided operation by operation (a keyword
  // holds an expense, money in or an own transfer – as in the settings).
  if ((choice.kind === 'expense' && !choice.categoryId) || !KEYWORD_KINDS.includes(choice.kind)) return []
  // A bank's fee without a name: its title tells of another operation („PROWIZJA ZA ZAKUP” – the shop of the purchase),
  // not of what was decided (as `ruleTargetOf` reads it).
  if (group.rows.every((p) => !p.row.counterparty && isFeeOperation(p.row.operation))) return []
  const { choices } = ctx
  const others = groups
    .filter((g) => g.group !== group.group && g.direction === group.direction && !choices.groups[g.group] && !choices.themes[g.theme])
    .flatMap((g) => g.rows)
    .filter((p) => !choices.rows[p.key] && !choices.skip[p.key])
  if (!others.length) return []
  const out: KeywordProposal[] = []
  for (const [word, text] of candidates(groups, group, ctx.rules, ctx.ownNames ?? [])) {
    const proposal: ImportRule = {
      id: '~proposal',
      match: word,
      mode: 'keyword',
      direction: group.direction,
      label: text,
      kind: choice.kind,
      categoryId: choice.kind === 'expense' ? choice.categoryId : null,
      refundable: choice.kind === 'expense' && group.direction === 'out' && choice.refundable,
      household: choice.kind === 'income' && choice.household,
      memberId: (choice.kind === 'expense' && group.direction === 'out' && choice.refundable) || (choice.kind === 'income' && choice.household) ? choice.memberId : null,
      counterAccountId: choice.kind === 'transfer' ? choice.counterAccountId : null,
      learned: false,
      hits: 0,
      updatedAt: ''
    }
    const rules = [...ctx.rules, proposal]
    const rows: string[] = []
    const touched = new Set<string>()
    let overreach = false
    for (const p of others) {
      if (!keywordMatches(p.target.name, word) && !keywordMatches(p.target.title, word)) continue
      if (findRule(rules, p.target, p.direction) !== proposal || sameChoice(choiceOf(p.decision), choice)) continue
      // A word that would decide another word's operations („auto” → „AUTOMATSPEC”) is not offered: the count would
      // say one thing, the rule do another.
      if (catchOf(p.target.name, word) !== 'near' && catchOf(p.target.title, word) !== 'near') {
        overreach = true
        break
      }
      rows.push(p.key)
      touched.add(p.group)
    }
    if (rows.length && !overreach) out.push({ keyword: word, text, rows, groups: [...touched] })
  }
  return out.sort((a, b) => b.rows.length - a.rows.length || b.keyword.length - a.keyword.length || a.keyword.localeCompare(b.keyword)).slice(0, limit)
}
