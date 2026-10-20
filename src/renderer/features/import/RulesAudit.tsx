/**
 * Ustawienia → Import z banku: the import's rules with their audit (1.5.1, F22) – search, the operations each rule
 * catches now, those it would decide otherwise („Zastosuj do historii” with „Cofnij”), the rule's editor (direction,
 * decision, the limit of an amount rule), the rules catching nothing and the brands with two and more categories (a rule
 * up to an amount offered when the amounts split them).
 */
import { useEffect, useMemo, useState } from 'react'
import { feedAudit, finishAudit, startAudit, type RuleAudit } from '@shared/import/audit'
import { fold } from '@shared/fold'
import type { Choice } from '@shared/import/reconcile'
import type { BrandAliases } from '@shared/import/aliases'
import type { ImportRule } from '@shared/schema'
import { listOf, useData, useFolderLocked } from '../../store/data'
import { AmountField, plnText, signedPln } from '../../components/fields'
import { Panel, ShowMore, TextField, cx } from '../../components/ui'
import { plDate } from '../../lib/format'
import { openOperation } from '../operations/state'
import { useAccounts, useCategories } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { DecisionFields } from './DecisionFields'
import { TagsField } from '../../components/TagsField'
import { useKnownTags } from '../tags/state'
import { addAmountRule, applyRuleToHistory, choiceOfRule, deleteRule, directionText, editRule, ruleDecisionText } from './rules'

const NO_RULES: ImportRule[] = []
const NO_ALIASES: BrandAliases = {}
/** Operations audited per step: a large folder never stops the screen. */
const STEP = 2000
const SHOWN = 20
/** The rules list's page (W35). */
const RULES_PAGE = 100

/** The audit of the rules against the operations from the bank – counted in steps, the last one shown meanwhile. */
export function useRuleAudit(): { audit: RuleAudit | null; progress: number } {
  const rules = useData((s) => s.fi?.settings.import.rules ?? NO_RULES)
  const aliases = useData((s) => s.fi?.settings.import.aliases ?? NO_ALIASES)
  const map = useData((s) => s.records.transactions)
  const [state, setState] = useState<{ audit: RuleAudit | null; progress: number }>({ audit: null, progress: 0 })
  useEffect(() => {
    let stopped = false
    const txs = listOf(map).filter((t) => t.bank)
    const run = startAudit(rules, aliases)
    let i = 0
    const step = () => {
      if (stopped) return
      feedAudit(run, txs.slice(i, i + STEP))
      i += STEP
      if (i < txs.length) {
        setState((s) => ({ ...s, progress: i / txs.length }))
        setTimeout(step, 0)
      } else setState({ audit: finishAudit(run), progress: 1 })
    }
    const timer = setTimeout(step, 0)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [rules, aliases, map])
  return state
}

/** Operations a rule would get – not with the per-operation kinds (N14). */
const forRule = (o: string) => o === 'loan' || o.startsWith('loan:') || o === 'tax' || o === 'trading'

function RuleEditor({ rule, onDone }: { rule: ImportRule; onDone: () => void }) {
  const [direction, setDirection] = useState<'in' | 'out' | null>(rule.direction === 'in' ? 'in' : rule.direction === 'out' ? 'out' : null)
  const [choice, setChoice] = useState<Choice>(() => choiceOfRule(rule))
  const [limit, setLimit] = useState<number | null>(rule.maxAmount ?? null)
  const [tags, setTags] = useState<string[]>(() => [...(rule.tags ?? [])])
  const known = useKnownTags()
  const save = () => {
    editRule(rule.id, { direction, choice, maxAmount: limit, tags })
    onDone()
  }
  return (
    <div className="flex flex-col gap-1.5 border border-line-strong bg-raised px-2 py-1.5" data-testid="import-rule-editor">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input h-[24px] w-[110px] py-0" value={direction ?? ''} onChange={(e) => setDirection((e.currentTarget.value || null) as 'in' | 'out' | null)} aria-label="Kierunek" data-testid="import-rule-direction">
          <option value="out">wydatki</option>
          <option value="in">wpływy</option>
          <option value="">oba kierunki</option>
        </select>
        <DecisionFields choice={choice} direction={direction ?? 'out'} onChange={setChoice} exclude={forRule} testId="import-rule-edit" />
        {rule.mode === 'amount' && (
          <label className="flex items-center gap-1 text-muted">
            do kwoty
            <AmountField className="w-[90px]" value={limit} onChange={setLimit} aria-label="Do kwoty" data-testid="import-rule-limit" />
            zł
          </label>
        )}
      </div>
      {/* F17: the operations the rule makes carry its tags („Netia → #ulga-internet”). */}
      <div className="flex items-center gap-2 text-muted">
        <span className="shrink-0">Tagi operacji</span>
        <TagsField className="flex-1" value={tags} onChange={setTags} known={known} compact placeholder="#ulga-internet…" testId="import-rule-tags" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-accent h-[24px]" disabled={rule.mode === 'amount' && !limit} onClick={save} data-testid="import-rule-save">
          Zapisz
        </button>
        <button type="button" className="btn h-[24px]" onClick={onDone}>
          Anuluj
        </button>
        <span className="text-[11px] text-dim">Zmieniona reguła działa przy kolejnych importach; operacje z historii zmienia „Zastosuj do historii”.</span>
      </div>
    </div>
  )
}

/** The operations a rule catches decided otherwise – and of another kind – with „Zastosuj do historii”. */
function RuleDetails({ rule, audit, label }: { rule: ImportRule; audit: RuleAudit; label: (id: string | null) => string }) {
  const readOnly = useFolderLocked()
  const differ = audit.differ.get(rule.id) ?? []
  const other = audit.otherKind.get(rule.id) ?? []
  return (
    <div className="flex flex-col gap-1 border-l-2 border-line-strong py-1 pl-2 text-[11.5px]" data-testid="import-rule-details">
      {differ.length > 0 && (
        <>
          <span className="text-muted">Operacje tej marki z inną kategorią albo innym finansującym niż reguła:</span>
          {differ.slice(0, SHOWN).map(({ before, after }) => (
            <button key={before.id} type="button" className="flex gap-2 text-left hover:bg-hover" onClick={() => openOperation(before)} title="Otwórz w Operacjach" data-testid="import-rule-differ-row">
              <span className="num w-[78px] text-dim">{plDate(before.date)}</span>
              <span className="min-w-0 flex-1 truncate">{before.counterparty}</span>
              <span className="truncate text-muted">
                {label(before.categoryId) || 'bez kategorii'} → {label(after.categoryId) || 'bez kategorii'}
              </span>
              <span className="num">{signedPln(before.amount)}</span>
            </button>
          ))}
          {differ.length > SHOWN && <span className="text-dim">i {differ.length - SHOWN} więcej</span>}
          <button type="button" className="btn h-[24px] self-start" disabled={readOnly} onClick={() => applyRuleToHistory(differ, rule.label || rule.match)} data-testid="import-rule-apply">
            Zastosuj do historii ({differ.length})
          </button>
        </>
      )}
      {other.length > 0 && (
        <>
          <span className="text-muted">Operacje innego rodzaju niż reguła (zmienione ręcznie – zostają, sprawdź je):</span>
          {other.slice(0, SHOWN).map((t) => (
            <button key={t.id} type="button" className="flex gap-2 text-left hover:bg-hover" onClick={() => openOperation(t)} title="Otwórz w Operacjach">
              <span className="num w-[78px] text-dim">{plDate(t.date)}</span>
              <span className="min-w-0 flex-1 truncate">{t.counterparty}</span>
              <span className="num">{signedPln(t.amount)}</span>
            </button>
          ))}
        </>
      )}
      {!differ.length && !other.length && <span className="text-dim">Wszystkie operacje tej reguły są zgodne z nią.</span>}
    </div>
  )
}

/** Ustawienia → Import z banku → „Reguły importu” (`audit` – `useRuleAudit`, once for the tab). */
export function RulesPanel({ audit, progress }: { audit: RuleAudit | null; progress: number }) {
  const rules = useData((s) => s.fi?.settings.import.rules ?? NO_RULES)
  const readOnly = useFolderLocked()
  const cats = useCategories()
  const members = useMembers()
  const [query, setQuery] = useState('')
  const [show, setShow] = useState<'all' | 'differ' | 'idle'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const hitsOf = (r: ImportRule) => audit?.hits.get(r.id)?.length ?? 0
  const differOf = (r: ImportRule) => audit?.differ.get(r.id)?.length ?? 0
  const accounts = useAccounts()
  const decision = (r: ImportRule) => ruleDecisionText(r, cats.label, members)
  const listed = useMemo(() => {
    const q = fold(query.trim())
    return rules
      .filter((r) => r.mode !== 'keyword')
      .filter((r) => !q || fold(`${r.label} ${r.match} ${decision(r)}`).includes(q))
      .filter((r) => (show === 'idle' ? audit && !audit.hits.has(r.id) : show === 'differ' ? differOf(r) > 0 || (audit?.otherKind.get(r.id)?.length ?? 0) > 0 : true))
      .sort((a, b) => hitsOf(b) - hitsOf(a) || (a.label || a.match).localeCompare(b.label || b.match))
  }, [rules, query, show, audit, cats, members, accounts])
  // Thousands of rules after years of imports (W35): a page at a time, the first again for another search.
  const [limit, setLimit] = useState(RULES_PAGE)
  useEffect(() => setLimit(RULES_PAGE), [query, show])
  const differCount = audit ? [...audit.differ.values()].reduce((s, xs) => s + xs.length, 0) : 0
  return (
    <Panel title="Reguły importu">
      <p className="mb-2 text-[11.5px] text-muted">
        Powstają z Twoich decyzji przy imporcie z mBanku („zapamiętaj”, „Przyjmij pewne”) i z przycisku „Zapamiętaj” w Operacjach – dla marki: sieć w każdym
        mieście to jedna reguła. Kategoria mBanku nie tworzy reguł – jest tylko podpowiedzią. Liczba przy regule to operacje z banku, które łapie dziś.
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TextField className="w-[240px]" value={query} onChange={setQuery} placeholder="szukaj reguły, marki, kategorii" maxLength={80} data-testid="import-rules-search" />
        {(['all', 'differ', 'idle'] as const).map((k) => (
          <button key={k} type="button" className={cx('btn h-[22px] px-2 text-[11px]', show === k && 'border-accent/60 text-fg-strong')} onClick={() => setShow(k)} data-testid={`import-rules-show-${k}`}>
            {k === 'all' ? 'wszystkie' : k === 'differ' ? `niespójne${audit ? ` (${differCount})` : ''}` : `bez trafień${audit ? ` (${audit.idle.filter((r) => r.mode !== 'keyword').length})` : ''}`}
          </button>
        ))}
        {!audit && <span className="text-[11px] text-dim">sprawdzam reguły… {Math.round(progress * 100)}%</span>}
      </div>
      {listed.length === 0 && <span className="text-[11.5px] text-dim">{rules.length ? 'Brak reguł dla tego wyboru.' : 'Brak reguł – pojawią się po pierwszym imporcie.'}</span>}
      <div className="flex flex-col" data-testid="import-rules">
        {listed.slice(0, limit).map((r) => (
          <div key={r.id} className="flex flex-col border-b border-line/60 py-[3px] last:border-b-0" data-testid="import-rule" data-match={r.match}>
            <div className="grid grid-cols-[minmax(0,1.2fr)_70px_minmax(0,1.5fr)_64px_auto] items-center gap-2 text-[12px]">
              <span className="truncate text-fg-strong" title={`klucz: ${r.match}${r.mode === 'contains' ? ' (zawiera)' : ''} · nauczona na ${r.hits} operacjach`}>
                {r.label || r.match}
                {r.mode === 'amount' && r.maxAmount ? <span className="ml-1 text-[11px] text-accent">do {plnText(r.maxAmount)} zł</span> : null}
              </span>
              <span className="text-muted">{directionText(r.direction)}</span>
              <span className="truncate text-muted">
                {decision(r)}
                {r.tags?.length ? <span className="ml-1 text-fg" data-testid="import-rule-tag-list">{r.tags.map((x) => `#${x}`).join(' ')}</span> : null}
              </span>
              <span className={cx('num text-right', audit && !hitsOf(r) ? 'text-dim' : 'text-fg')} data-testid="import-rule-hits">
                {audit ? `${hitsOf(r)} op.` : '…'}
              </span>
              <span className="flex items-center gap-1">
                {differOf(r) > 0 && (
                  <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] text-accent" onClick={() => setOpen(open === r.id ? null : r.id)} title="Operacje tej reguły z inną decyzją" data-testid="import-rule-differ">
                    {differOf(r)} inaczej
                  </button>
                )}
                {!differOf(r) && (audit?.otherKind.get(r.id)?.length ?? 0) > 0 && (
                  <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] text-muted" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    inny rodzaj
                  </button>
                )}
                <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px]" disabled={readOnly} onClick={() => setEditing(editing === r.id ? null : r.id)} data-testid="import-rule-edit">
                  zmień
                </button>
                <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] hover:text-down" disabled={readOnly} onClick={() => deleteRule(r.id)} data-testid="import-rule-delete">
                  usuń
                </button>
              </span>
            </div>
            {editing === r.id && <RuleEditor rule={r} onDone={() => setEditing(null)} />}
            {open === r.id && audit && <RuleDetails rule={r} audit={audit} label={cats.label} />}
          </div>
        ))}
      </div>
      <ShowMore page={RULES_PAGE} shown={limit} total={listed.length} onMore={() => setLimit(limit + RULES_PAGE)} testId="import-rules-more" />
    </Panel>
  )
}

/** Brands with expenses of two and more categories (F22): a rule up to an amount when the amounts split them. */
export function MixedBrandsPanel({ audit }: { audit: RuleAudit | null }) {
  const rules = useData((s) => s.fi?.settings.import.rules ?? NO_RULES)
  const readOnly = useFolderLocked()
  const cats = useCategories()
  const mixed = audit?.mixed ?? []
  if (!mixed.length) return null
  const hasLimit = (brand: string) => rules.some((r) => r.mode === 'amount' && r.match === brand)
  return (
    <Panel title="Marki z kilkoma kategoriami">
      <p className="mb-2 text-[11.5px] text-muted">
        Wydatki jednej marki w różnych kategoriach. Gdy kwoty je rozdzielają (np. Orlen do 40 zł – kawa, więcej – paliwo), FI proponuje regułę z progiem kwoty.
      </p>
      <div className="flex flex-col" data-testid="import-mixed">
        {mixed.slice(0, 40).map((m) => (
          <div key={m.brand} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/60 py-[3px] text-[12px] last:border-b-0" data-testid="import-mixed-brand">
            <span className="w-[160px] truncate text-fg-strong">{m.label}</span>
            <span className="min-w-0 flex-1 truncate text-muted">
              {m.categories.map((c) => `${cats.label(c.categoryId)} ${c.n}× (${plnText(c.min)}–${plnText(c.max)} zł)`).join(' · ')}
            </span>
            {m.limit && !hasLimit(m.brand) && (
              <button
                type="button"
                className="btn h-[22px] text-[11px]"
                disabled={readOnly}
                onClick={() => addAmountRule({ brand: m.brand, label: m.label, maxAmount: m.limit!.maxAmount, categoryId: m.limit!.categoryId })}
                data-testid="import-mixed-limit"
              >
                Reguła: do {plnText(m.limit.maxAmount)} zł → {cats.label(m.limit.categoryId)}
              </button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}
