import { useMemo } from 'react'
import type { BrandAliases } from '@shared/import/aliases'
import { keywordProposals } from '@shared/import/learn'
import type { Choice, ImportGroup } from '@shared/import/reconcile'
import { mergeTarget, similarPairs, type SimilarPair, type SimilarSide, type SimilarWhy } from '@shared/import/similar'
import { TX_KIND_LABEL, type ImportRule, type TxKind } from '@shared/schema'
import { countLabel } from '../../lib/format'
import { useData } from '../../store/data'
import { toast } from '../../store/ui'
import { Badge, Panel } from '../../components/ui'
import { useCategories } from '../operations/pickers'
import { dismissSimilar, mergeNames, ruleDecisionText, saveKeywordRule } from './rules'
import { closeProposal, ownNamesWith, useImport, useImportGroups } from './state'

const NO_RULES: ImportRule[] = []
const NO_ALIASES: BrandAliases = {}
const NO_DISMISSED: Record<string, string> = {}
const NO_NAMES: string[] = []

const operations = (n: number) => countLabel(n, 'operacja', 'operacje', 'operacji')

const WHY: Record<SimilarWhy, string> = { words: 'te same słowa', cut: 'ucięta nazwa', typo: 'literówka', first: 'ta sama nazwa na początku' }

/**
 * Merge the pairs' names (each connected set into the one with the user's rules, else the biggest); with „Cofnij”. Of
 * many pairs at once, one that would join two names with the user's rules (directly or through a third) is left for
 * the user to merge on its own – then the rule of the one merged into decides both.
 */
function mergePairs(pairs: readonly SimilarPair[]): void {
  const guard = pairs.length > 1
  // Pairs that share a name are one set: „A ~ B”, „B ~ C” → A, B, C.
  const parent = new Map<string, string>()
  const ruled = new Set<string>()
  const find = (k: string): string => {
    const p = parent.get(k) ?? k
    if (p === k) return k
    const root = find(p)
    parent.set(k, root)
    return root
  }
  const sides = new Map<string, SimilarSide>()
  let left = 0
  for (const p of pairs) {
    const [ra, rb] = [find(p.a.brand), find(p.b.brand)]
    if (ra === rb) continue
    const rulesA = ruled.has(ra) || p.a.rules.length > 0
    const rulesB = ruled.has(rb) || p.b.rules.length > 0
    if (guard && rulesA && rulesB) {
      left++
      continue
    }
    sides.set(p.a.brand, p.a)
    sides.set(p.b.brand, p.b)
    parent.set(ra, rb)
    if (rulesA || rulesB) ruled.add(rb)
  }
  const sets = new Map<string, SimilarSide[]>()
  for (const [k, side] of sides) {
    const root = find(k)
    sets.set(root, [...(sets.get(root) ?? []), side])
  }
  const merges = [...sets.values()].map((set) => {
    const into = mergeTarget(set)
    return { into: { key: into.brand, label: into.label }, from: set.filter((s) => s !== into).map((s) => ({ key: s.brand, label: s.label })) }
  })
  const undo = merges.length ? mergeNames(merges) : null
  const names = merges.reduce((n, m) => n + m.from.length, 0)
  const note = left ? ` Pominięte: ${left} – połączyłyby nazwy z różnymi regułami; połącz je pojedynczo.` : ''
  if (!undo) toast(left ? note.trim() : 'Te nazwy są już połączone.', 'info', 5000)
  else toast(`Połączono ${countLabel(names, 'nazwę', 'nazwy', 'nazw')} – kolejne importy też je połączą.${note}`, 'success', 6000, { label: 'Cofnij', run: undo })
}

function Side({ side, catLabel }: { side: SimilarSide; catLabel: (id: string | null) => string }) {
  const rule = side.rules[0]
  return (
    <span className="min-w-0 truncate" title={side.names.length > 1 ? `Nazwy w banku: ${side.names.join(' · ')}` : undefined}>
      <span className="text-fg-strong">{side.label}</span>
      <span className="text-muted"> · {side.count ? operations(side.count) : rule ? `Twoja reguła: ${ruleDecisionText(rule, catLabel)}` : 'Twoja reguła'}</span>
    </span>
  )
}

/**
 * „Podobne nazwy” (1.2.2, D78 – idea 5): names that look like one counterparty, outside the dictionary of chains;
 * „Połącz” = one group and one rule from now on (an alias of the brand), „To nie to samo” = not offered again.
 */
export function SimilarPanel() {
  const groups = useImportGroups()
  const rules = useData((s) => s.fi?.settings.import.rules ?? NO_RULES)
  const aliases = useData((s) => s.fi?.settings.import.aliases ?? NO_ALIASES)
  const dismissed = useData((s) => s.fi?.settings.import.notSimilar ?? NO_DISMISSED)
  const readOnly = useData((s) => !!s.status?.readOnly)
  const cats = useCategories()
  const pairs = useMemo(() => similarPairs(groups, { rules, aliases, dismissed }), [groups, rules, aliases, dismissed])
  if (!pairs.length) return null
  const catLabel = (id: string | null) => cats.label(id)
  return (
    <Panel
      title="Podobne nazwy"
      actions={
        pairs.length > 1 && (
          <button className="btn h-[22px]" disabled={readOnly} onClick={() => mergePairs(pairs)} data-testid="similar-merge-all">
            Połącz wszystkie ({pairs.length})
          </button>
        )
      }
    >
      <div className="flex flex-col gap-1 text-[12px]" data-testid="similar-names">
        <p className="text-[11.5px] text-muted">
          Te nazwy wyglądają na jedną firmę albo osobę (inna kolejność słów, ucięta nazwa, literówka). „Połącz” – jedna grupa i jedna reguła, także w kolejnych
          importach; połączenie cofniesz w Ustawieniach → Import z banku.
        </p>
        {pairs.map((p) => (
          <div key={p.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-line/60 py-1 last:border-b-0" data-testid="similar-pair" data-key={p.key}>
            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
              <Side side={p.a} catLabel={catLabel} />
              <span className="text-dim">⟷</span>
              <Side side={p.b} catLabel={catLabel} />
              <Badge>{WHY[p.why]}</Badge>
            </span>
            <span className="flex shrink-0 gap-1.5">
              <button className="btn h-[22px]" disabled={readOnly} onClick={() => mergePairs([p])} data-testid="similar-merge">
                Połącz
              </button>
              <button className="btn btn-ghost h-[22px]" disabled={readOnly} onClick={() => dismissSimilar(p.key)} data-testid="similar-dismiss">
                To nie to samo
              </button>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

type Mergeable = SimilarSide & { chain: boolean }

/**
 * The names of the ticked groups that can be one (1.2.2): each brand once, null when not two of them – or when two are
 * chains of the dictionary (never one).
 */
export function namesToMerge(groups: readonly ImportGroup[], selected: Readonly<Record<string, true>>): Mergeable[] | null {
  const brands = new Map<string, Mergeable>()
  for (const g of groups) {
    if (!selected[g.group] || !g.brand) continue
    const b = brands.get(g.brand)
    if (b) b.count += g.rows.length
    else brands.set(g.brand, { brand: g.brand, label: g.label, names: g.names, count: g.rows.length, rules: [], chain: g.chain })
  }
  const all = [...brands.values()]
  return all.length >= 2 && all.filter((b) => b.chain).length <= 1 ? all : null
}

/** The ticked groups' names as one (1.2.2): when the similar names do not see it („MOKKA DWORZEC”, „KAFEJKA MOKKA”). */
export function mergeSelectedNames(groups: readonly ImportGroup[], selected: Readonly<Record<string, true>>): void {
  const all = namesToMerge(groups, selected)
  if (!all || useData.getState().status?.readOnly) return
  const rules = useData.getState().fi?.settings.import.rules ?? []
  for (const b of all) b.rules = rules.filter((r) => r.mode === 'exact' && r.match === b.brand)
  const into = all.find((b) => b.chain) ?? mergeTarget(all)
  const undo = mergeNames([{ into: { key: into.brand, label: into.label }, from: all.filter((b) => b !== into).map((b) => ({ key: b.brand, label: b.label })) }])
  if (!undo) toast('Te nazwy są już połączone.', 'info', 4000)
  else toast(`Połączono z „${into.label}”: ${all.length - 1} – kolejne importy też je połączą.`, 'success', 6000, { label: 'Cofnij', run: undo })
}

/**
 * Learning from a decision (1.2.2, D78 – idea 6): under the group the user decided last, the words of its names that a
 * keyword rule could decide other operations of the file by, with how many – a click makes it the user's keyword.
 */
export function RuleProposal({ g, choice }: { g: ImportGroup; choice: Choice }) {
  const groups = useImportGroups()
  const choices = useImport((s) => s.choices)
  const file = useImport((s) => s.file)
  const rules = useData((s) => s.fi?.settings.import.rules ?? NO_RULES)
  const own = useData((s) => s.fi?.settings.import.ownNames ?? NO_NAMES)
  const readOnly = useData((s) => !!s.status?.readOnly)
  const cats = useCategories()
  // The holder's names (the settings' and the file's) are no keyword.
  const proposals = useMemo(() => keywordProposals(groups, g, choice, { rules, choices, ownNames: ownNamesWith(own, file) }), [groups, g, choice, rules, choices, file, own])
  if (!proposals.length) return null
  const label = (group: string) => groups.find((x) => x.group === group)?.label ?? ''
  const decision = choice.kind === 'expense' ? cats.label(choice.categoryId) : (TX_KIND_LABEL[choice.kind as TxKind] ?? choice.kind)
  const take = (text: string, rows: number) => {
    const err = saveKeywordRule({ keyword: text, direction: g.direction, kind: choice.kind as TxKind, categoryId: choice.categoryId, refundable: choice.refundable, household: choice.household, counterAccountId: choice.counterAccountId })
    if (err) {
      toast(err, 'error', 5000)
      return
    }
    closeProposal(g.group)
    toast(`Słowo „${text}” → ${decision}: jeszcze ${operations(rows)} w tym pliku i kolejne importy.`, 'success', 6000)
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-12 text-[11px] text-muted" data-testid="import-proposal">
      <span>Reguła na słowo – {decision}:</span>
      {proposals.map((p) => (
        <button
          key={p.keyword}
          type="button"
          className="btn h-[20px] px-1.5 text-[11px]"
          disabled={readOnly}
          title={`Obejmie też: ${p.groups.map(label).join(', ')}. Kolejne importy rozpoznają to słowo w nazwie albo tytule same.`}
          onClick={() => take(p.text, p.rows.length)}
          data-testid="import-proposal-word"
          data-keyword={p.keyword}
        >
          „{p.text}” · jeszcze {operations(p.rows.length)}
        </button>
      ))}
      <button type="button" className="text-dim hover:text-fg-strong hover:underline" onClick={() => closeProposal(g.group)} data-testid="import-proposal-close">
        nie, dziękuję
      </button>
    </div>
  )
}
