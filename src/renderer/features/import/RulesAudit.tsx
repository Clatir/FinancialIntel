/**
 * Ustawienia → Import z banku: the import's rules with their audit (1.5.1, F22) – search, the operations each rule
 * catches now, those it would decide otherwise („Zastosuj do historii” with „Cofnij”), the rule's editor (direction,
 * decision, the limit of an amount rule), the rules catching nothing and the brands with two and more categories (a rule
 * up to an amount offered when the amounts split them).
 */
import { useEffect, useMemo, useState } from 'react'
import { advanceRulesKept, feedAudit, finishAudit, inAuditView, inconsistentCount, startAudit, type RuleAudit } from '@shared/import/audit'
import { fold } from '@shared/fold'
import type { Choice } from '@shared/import/reconcile'
import type { BrandAliases } from '@shared/import/aliases'
import type { RecordEntry } from '@shared/api'
import type { ImportRule, Loan } from '@shared/schema'
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
import { addAmountRule, applyRuleToHistory, choiceOfRule, conditionsText, directionText, editRule, keepAdvanceRule, removeRule, repayingRule, ruleDecisionText } from './rules'
import { restNotOfRule } from './options'
import { ConditionsEditor } from './ConditionsEditor'
import { inactiveConditions } from '@shared/import/conditions'

const NO_RULES: ImportRule[] = []
const NO_ALIASES: BrandAliases = {}
const NO_LOANS: Record<string, RecordEntry<Loan>> = {}
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
  // The Radar's loans (AP-6): a rule on a borrower's name and the money it kept.
  const loans = useData((s) => s.records.loans ?? NO_LOANS)
  // The rules of an advance for the future kept so (AP-4) – out of the review; only they (a text): another „zostaw” or „to
  // nie duplikat” never starts the audit again (przegląd N2 2.14).
  const kept = useData((s) => advanceRulesKept(s.fi?.settings.import.notDuplicates))
  const [state, setState] = useState<{ audit: RuleAudit | null; progress: number }>({ audit: null, progress: 0 })
  useEffect(() => {
    let stopped = false
    const txs = listOf(map).filter((t) => t.bank)
    const keys = new Set(kept ? kept.split('\n') : [])
    const run = startAudit(rules, aliases, listOf(loans), (key) => keys.has(key))
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
  }, [rules, aliases, map, loans, kept])
  return state
}

/**
 * Operations a rule would get – not with the per-operation kinds (N14), except the repayment of an open loan given of the
 * Radar for money in (D100, T358 – the rule names it, valid while it is open).
 */
const forRule = (o: string, direction: 'in' | 'out' | null, repayable: ReadonlySet<string>) =>
  o === 'loan' || (o.startsWith('loan:') && !(direction === 'in' && repayable.has(o.slice('loan:'.length)))) || o === 'tax' || o === 'trading'

function RuleEditor({ rule, onDone }: { rule: ImportRule; onDone: () => void }) {
  const members = useMembers()
  const loans = useData((s) => s.records.loans ?? NO_LOANS)
  const repayable = useMemo(() => new Set(listOf(loans).flatMap((l) => (l.direction === 'given' && !l.closedAt ? [l.id] : []))), [loans])
  const [direction, setDirection] = useState<'in' | 'out' | null>(rule.direction === 'in' ? 'in' : rule.direction === 'out' ? 'out' : null)
  const [choice, setChoice] = useState<Choice>(() => choiceOfRule(rule))
  const [limit, setLimit] = useState<number | null>(rule.maxAmount ?? null)
  const [tags, setTags] = useState<string[]>(() => [...(rule.tags ?? [])])
  const [manual, setManual] = useState(!!rule.manual)
  const known = useKnownTags()
  const save = () => {
    editRule(rule.id, { direction, choice, maxAmount: limit, tags, manual })
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
        {/* A member's money: the rest the person's setting gives only – the rule keeps none (AP-4, D80 b). */}
        <DecisionFields choice={choice} direction={direction ?? 'out'} onChange={setChoice} exclude={(o) => forRule(o, direction, repayable) || restNotOfRule(o, members)} noShares testId="import-rule-edit" />
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
      {/* AP-45 (T470): the quick entry and the operation's editor propose its decision – to accept. */}
      <label className="flex items-center gap-1.5 text-muted" title="Szybki wpis i edytor operacji podpowiedzą decyzję tej reguły – do zatwierdzenia jednym kliknięciem">
        <input type="checkbox" checked={manual} onChange={(e) => setManual(e.currentTarget.checked)} data-testid="import-rule-manual" />
        także dla wpisów ręcznych (podpowiedź w szybkim wpisie i w edytorze operacji)
      </label>
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
  const borrower = audit.borrower.get(rule.id) ?? []
  const loans = [...new Set(borrower.map((b) => b.loan.name))]
  const review = audit.review.some((r) => r.id === rule.id)
  return (
    <div className="flex flex-col gap-1 border-l-2 border-line-strong py-1 pl-2 text-[11.5px]" data-testid="import-rule-details">
      {review && (
        <>
          {/* AP-4 (AF-8): „reszta jako zaliczka” of 1.15.3–1.15.5 learned such rules – the debt never went down. */}
          <span className="text-accent" data-testid="import-rule-review-note">
            Zaliczka na przyszłość: wpłaty tej osoby idą w całości do depozytu i nie spłacają tego, co ma oddać. Do wersji 1.15.5 tak zapisywał się też wybór „reszta jako zaliczka”. Spłata – wpłata najpierw
            wyrówna dług, a reszta pójdzie jak w ustawieniu osoby (Ustawienia → Domownicy); zapisane już wpłaty zgłaszają Meldunki.
          </span>
          <span className="flex gap-2">
            <button type="button" className="btn h-[24px]" disabled={readOnly} onClick={() => repayingRule(rule)} data-testid="import-rule-review-repay">
              Zmień na spłatę
            </button>
            <button type="button" className="btn btn-ghost h-[24px]" disabled={readOnly} onClick={() => keepAdvanceRule(rule)} data-testid="import-rule-review-keep">
              zostaw zaliczkę na przyszłość
            </button>
          </span>
        </>
      )}
      {borrower.length > 0 && (
        <>
          {/* AP-6: a rule on a borrower's name – the next imports recognize the loan first; these were kept by the rule. */}
          <span className="text-accent" data-testid="import-rule-borrower-note">
            Reguła na nazwisko osoby z pożyczką z Radaru ({loans.join(', ')}): te wpływy przyszły, gdy pożyczka była otwarta, a reguła zapisała je jako „{ruleDecisionText(rule, label)}” – to zwykle
            zwroty pożyczki. Popraw je w Operacjach (rodzaj „Pożyczka”, ta pożyczka); kolejne importy same rozpoznają zwrot pożyczki. Reguła z pomyłki – usuń ją.
          </span>
          {borrower.slice(0, SHOWN).map(({ t }) => (
            <button key={t.id} type="button" className="flex gap-2 text-left hover:bg-hover" onClick={() => openOperation(t)} title="Otwórz w Operacjach" data-testid="import-rule-borrower-row">
              <span className="num w-[78px] text-dim">{plDate(t.date)}</span>
              <span className="min-w-0 flex-1 truncate">{t.counterparty}</span>
              <span className="num">{signedPln(t.amount)}</span>
            </button>
          ))}
          {borrower.length > SHOWN && <span className="text-dim">i {borrower.length - SHOWN} więcej</span>}
        </>
      )}
      {differ.length > 0 && (
        <>
          <span className="text-muted">Operacje tej {rule.mode === 'conditions' ? 'reguły' : 'marki'} z inną kategorią albo innym finansującym niż reguła:</span>
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
      {!differ.length && !other.length && !borrower.length && !review && <span className="text-dim">Wszystkie operacje tej reguły są zgodne z nią.</span>}
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
  // A new rule of conditions (AP-45): its editor above the list – a draft until „Zapisz” or „Anuluj”.
  const [adding, setAdding] = useState(false)
  const hitsOf = (r: ImportRule) => audit?.hits.get(r.id)?.length ?? 0
  const differOf = (r: ImportRule) => audit?.differ.get(r.id)?.length ?? 0
  const accounts = useAccounts()
  const decision = (r: ImportRule) => ruleDecisionText(r, cats.label, members)
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'konto spoza listy'
  const listed = useMemo(() => {
    const q = fold(query.trim())
    return rules
      .filter((r) => r.mode !== 'keyword')
      .filter((r) => !q || fold(`${r.label} ${r.match} ${decision(r)} ${r.mode === 'conditions' ? conditionsText(r, accountName) : ''}`).includes(q))
      // „Bez trafień” = its count (AF-64: never a rule of a loan, PIT-38 or XTB – a proposal only).
      .filter((r) => inAuditView(r, audit, show))
      .sort((a, b) => hitsOf(b) - hitsOf(a) || (a.label || a.match).localeCompare(b.label || b.match))
  }, [rules, query, show, audit, cats, members, accounts])
  // Thousands of rules after years of imports (W35): a page at a time, the first again for another search.
  const [limit, setLimit] = useState(RULES_PAGE)
  useEffect(() => setLimit(RULES_PAGE), [query, show])
  const differCount = audit ? inconsistentCount(audit) : 0
  const borrowerOf = (r: ImportRule) => audit?.borrower.get(r.id)?.length ?? 0
  const reviewOf = (r: ImportRule) => !!audit?.review.some((x) => x.id === r.id)
  return (
    <Panel title="Reguły importu">
      <p className="mb-2 text-[11.5px] text-muted">
        Powstają z Twoich decyzji przy imporcie z mBanku („zapamiętaj”, „Przyjmij pewne”) i z przycisku „Zapamiętaj” w Operacjach – dla marki: sieć w każdym
        mieście to jedna reguła. Kategoria mBanku nie tworzy reguł – jest tylko podpowiedzią. Liczba przy regule to operacje z banku, które łapie dziś. Własną regułę z kilkoma
        warunkami (kontrahent, tytuł, kwota, konto – wszystkie albo którykolwiek) dodasz przyciskiem „Nowa reguła z warunkami”.
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TextField className="w-[240px]" value={query} onChange={setQuery} placeholder="szukaj reguły, marki, kategorii" maxLength={80} data-testid="import-rules-search" />
        {(['all', 'differ', 'idle'] as const).map((k) => (
          <button key={k} type="button" className={cx('btn h-[22px] px-2 text-[11px]', show === k && 'border-accent/60 text-fg-strong')} onClick={() => setShow(k)} data-testid={`import-rules-show-${k}`}>
            {k === 'all' ? 'wszystkie' : k === 'differ' ? `niespójne${audit ? ` (${differCount})` : ''}` : `bez trafień${audit ? ` (${audit.idle.filter((r) => r.mode !== 'keyword').length})` : ''}`}
          </button>
        ))}
        {!audit && <span className="text-[11px] text-dim">sprawdzam reguły… {Math.round(progress * 100)}%</span>}
        <span className="flex-1" />
        <button type="button" className="btn h-[22px] px-2 text-[11px]" disabled={readOnly} onClick={() => setAdding(!adding)} data-testid="import-rule-new">
          + Nowa reguła z warunkami
        </button>
      </div>
      {adding && (
        <div className="mb-2">
          <ConditionsEditor onDone={() => setAdding(false)} />
        </div>
      )}
      {listed.length === 0 && <span className="text-[11.5px] text-dim">{rules.length ? 'Brak reguł dla tego wyboru.' : 'Brak reguł – pojawią się po pierwszym imporcie.'}</span>}
      <div className="flex flex-col" data-testid="import-rules">
        {listed.slice(0, limit).map((r) => (
          <div key={r.id} className="flex flex-col border-b border-line/60 py-[3px] last:border-b-0" data-testid="import-rule" data-match={r.match} data-mode={r.mode}>
            <div className="grid grid-cols-[minmax(0,1.2fr)_70px_minmax(0,1.5fr)_64px_auto] items-center gap-2 text-[12px]">
              <span
                className="truncate text-fg-strong"
                title={r.mode === 'conditions' ? `${conditionsText(r, accountName)}${r.manual ? ' · także dla wpisów ręcznych' : ''}` : `klucz: ${r.match}${r.mode === 'contains' ? ' (zawiera)' : ''} · nauczona na ${r.hits} operacjach${r.manual ? ' · także dla wpisów ręcznych' : ''}`}
              >
                {r.label || r.match}
                {r.mode === 'amount' && r.maxAmount ? <span className="ml-1 text-[11px] text-accent">do {plnText(r.maxAmount)} zł</span> : null}
                {r.manual ? (
                  <span className="ml-1 text-[11px] text-muted" data-testid="import-rule-manual-mark">
                    · też ręczne
                  </span>
                ) : null}
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
                {reviewOf(r) && (
                  <button
                    type="button"
                    className="btn btn-ghost h-[22px] px-1.5 text-[11px] text-accent"
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                    title="Zaliczka na przyszłość – wpłaty nie spłacają długu"
                    data-testid="import-rule-review"
                  >
                    do przeglądu
                  </button>
                )}
                {borrowerOf(r) > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost h-[22px] px-1.5 text-[11px] text-accent"
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                    title="Wpływy od osoby z pożyczką z Radaru zapisane przez tę regułę – do sprawdzenia"
                    data-testid="import-rule-borrower"
                  >
                    {borrowerOf(r)} do poprawy
                  </button>
                )}
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
                <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] hover:text-down" disabled={readOnly} onClick={() => removeRule(r.id)} data-testid="import-rule-delete">
                  usuń
                </button>
              </span>
            </div>
            {r.mode === 'conditions' && (
              <span className="truncate pl-2 text-[11px] text-muted" data-testid="import-rule-conditions-text">
                {inactiveConditions(r) ? 'Warunek nowszej wersji aplikacji – ta wersja tej reguły nie stosuje. ' : ''}
                {conditionsText(r, accountName)}
              </span>
            )}
            {editing === r.id && (r.mode === 'conditions' ? <ConditionsEditor rule={r} onDone={() => setEditing(null)} /> : <RuleEditor rule={r} onDone={() => setEditing(null)} />)}
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
