/**
 * The editor of a rule of conditions (1.16.0, AP-45, T467): conditions – the name contains, the title has the words, the
 * amount from–to, the account – added and removed, joined by „wszystkie (I)” or „którykolwiek (LUB)”; the direction
 * always with them; the decision as the import's (no kind decided operation by operation – N14); „także dla wpisów
 * ręcznych” (T470); tags. A draft (AP-8): leaving the screen keeps what was typed until „Zapisz” or „Anuluj”.
 */
import { useMemo, useState } from 'react'
import { combineOf, conditionsOf, MAX_RULE_CONDITIONS, type ImportRule, type Loan, type RuleCondition } from '@shared/schema'
import { conditionsFromRow, regexFromRow } from '@shared/import/conditions'
import type { Choice } from '@shared/import/reconcile'
import type { RecordEntry } from '@shared/api'
import { listOf, useData, useFolderLocked, useLockedReason } from '../../store/data'
import { useDraft } from '../../store/drafts'
import { AmountField, plnText } from '../../components/fields'
import { TextField } from '../../components/ui'
import { IconClose } from '../../components/icons'
import { TagsField } from '../../components/TagsField'
import { orderRange, swappedText } from '../../lib/guards'
import { useKnownTags } from '../tags/state'
import { useAccounts } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { DecisionFields } from './DecisionFields'
import { restNotOfRule } from './options'
import { blankCondition, choiceOfRule, conditionRefusal, saveConditionsRule, type ConditionsDraft } from './rules'

const NO_LOANS: Record<string, RecordEntry<Loan>> = {}

const FIELD_LABEL: Record<RuleCondition['field'], string> = {
  counterparty: 'kontrahent zawiera',
  title: 'tytuł zawiera',
  amount: 'kwota od–do',
  account: 'konto'
}
const FIELDS = Object.keys(FIELD_LABEL) as Array<RuleCondition['field']>

export interface ConditionsRowSeed {
  counterparty?: string
  title?: string
  amount?: number
  direction?: 'in' | 'out'
  accountId?: string | null
  choice?: Choice
}

/** A new rule's draft: one empty condition of the counterparty, an expense – or prefilled from an import row (T508). */
const blankDraft = (fromRow?: ConditionsRowSeed): ConditionsDraft => ({
  label: (fromRow?.counterparty || fromRow?.title || '').trim().slice(0, 200),
  direction: fromRow?.direction ?? 'out',
  conditions: fromRow ? conditionsFromRow(fromRow) : [blankCondition('counterparty')],
  combine: 'all',
  choice: fromRow?.choice ?? { kind: 'expense', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null },
  manual: false,
  tags: []
})

/** A rule's draft as saved. */
const draftOf = (r: ImportRule): ConditionsDraft => ({
  label: r.label,
  direction: r.direction === 'in' ? 'in' : r.direction === 'out' ? 'out' : null,
  conditions: (conditionsOf(r) ?? []).map((c) => ({ ...c })),
  combine: combineOf(r) === 'any' ? 'any' : 'all',
  choice: choiceOfRule(r),
  manual: !!r.manual,
  tags: [...(r.tags ?? [])]
})

/**
 * Options a rule of conditions does not offer – the kinds decided operation by operation (N14), except an open loan's
 * repayment for money in (D100, T358) – and a member's money's rest (AP-4: the person's setting gives it).
 */
const notForRule = (o: string, direction: 'in' | 'out' | null, repayable: ReadonlySet<string>) =>
  o === 'loan' || (o.startsWith('loan:') && !(direction === 'in' && repayable.has(o.slice('loan:'.length)))) || o === 'tax' || o === 'trading'

/** `rule` – the one changed; none – a new one (optionally seeded from an import row, `fromRow`). `onDone` after „Zapisz” or „Anuluj”. */
export function ConditionsEditor({ rule, fromRow, onDone }: { rule?: ImportRule; fromRow?: ConditionsRowSeed; onDone: () => void }) {
  const draftKey = `import-rule-conditions:${rule?.id ?? (fromRow ? `row:${fromRow.counterparty ?? ''}:${fromRow.title ?? ''}` : 'new')}`
  const [d, setD, clear] = useDraft<ConditionsDraft>(draftKey, () => (rule ? draftOf(rule) : blankDraft(fromRow)))
  const readOnly = useFolderLocked()
  const locked = useLockedReason()
  const accounts = useAccounts()
  const members = useMembers()
  const known = useKnownTags()
  const loans = useData((s) => s.records.loans ?? NO_LOANS)
  const repayable = useMemo(() => new Set(listOf(loans).flatMap((l) => (l.direction === 'given' && !l.closedAt ? [l.id] : []))), [loans])
  const [error, setError] = useState<string | null>(null)
  // A word of a range swapped (AP-15) – at its condition.
  const [swapped, setSwapped] = useState<{ at: number; text: string } | null>(null)
  const [adding, setAdding] = useState<RuleCondition['field']>('title')
  const setCondition = (i: number, c: RuleCondition) => setD((x) => ({ ...x, conditions: x.conditions.map((y, j) => (j === i ? c : y)) }))
  const setRange = (i: number, c: RuleCondition, min: number | null, max: number | null) => {
    const r = orderRange(min, max)
    setCondition(i, { ...c, min: r.from, max: r.to })
    setSwapped(r.swapped ? { at: i, text: swappedText('kwoty', `${plnText(r.from!)} zł`, `${plnText(r.to!)} zł`) } : null)
  }
  const done = () => {
    clear()
    onDone()
  }
  const save = () => {
    const why = saveConditionsRule(rule?.id ?? null, d)
    setError(why)
    if (!why) done()
  }
  const full = d.conditions.length >= MAX_RULE_CONDITIONS
  return (
    <div className="flex flex-col gap-1.5 border border-line-strong bg-raised px-2 py-1.5 text-[12px]" data-testid="import-rule-conditions">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted">Nazwa</span>
        <TextField className="w-[220px]" value={d.label} onChange={(label) => setD((x) => ({ ...x, label }))} placeholder="np. Orlen – kawa" maxLength={200} data-testid="import-rule-conditions-label" />
        <span className="text-muted">Dla</span>
        <select
          className="input h-[24px] w-[120px] py-0"
          value={d.direction ?? ''}
          onChange={(e) => setD((x) => ({ ...x, direction: (e.currentTarget.value || null) as 'in' | 'out' | null }))}
          aria-label="Kierunek"
          data-testid="import-rule-conditions-direction"
        >
          <option value="out">wydatki</option>
          <option value="in">wpływy</option>
          <option value="">oba kierunki</option>
        </select>
        <span className="text-muted">gdy spełnione</span>
        <select
          className="input h-[24px] w-[190px] py-0"
          value={d.combine}
          onChange={(e) => setD((x) => ({ ...x, combine: e.currentTarget.value === 'any' ? 'any' : 'all' }))}
          aria-label="Łączenie warunków"
          data-testid="import-rule-conditions-combine"
        >
          <option value="all">wszystkie warunki (I)</option>
          <option value="any">którykolwiek warunek (LUB)</option>
        </select>
      </div>
      <div className="flex flex-col gap-1 border-l-2 border-line-strong pl-2" data-testid="import-rule-conditions-list">
        {d.conditions.map((c, i) => {
          const why = conditionRefusal(c, accounts)
          return (
            <div key={i} className="flex flex-wrap items-center gap-2" data-testid="import-rule-condition" data-field={c.field}>
              {i > 0 && <span className="w-[26px] text-[11px] text-dim">{d.combine === 'any' ? 'lub' : 'i'}</span>}
              {i === 0 && <span className="w-[26px]" />}
              <span className="w-[120px] text-muted">{FIELD_LABEL[c.field as RuleCondition['field']] ?? 'warunek nowszej wersji'}</span>
              {(c.field === 'counterparty' || c.field === 'title') && (
                <>
                  <TextField
                    className="w-[200px]"
                    value={c.value ?? ''}
                    onChange={(value) => setCondition(i, { ...c, value })}
                    placeholder={c.field === 'title' ? 'słowo z tytułu, np. czynsz' : 'fragment nazwy, np. orlen'}
                    maxLength={200}
                    data-testid="import-rule-condition-text"
                  />
                  {((c.value && !c.value.startsWith('/')) || (c.field === 'title' ? fromRow?.title : fromRow?.counterparty)) && (
                    <button
                      type="button"
                      className="btn btn-ghost h-[22px] px-1.5 text-[11px] text-accent"
                      title="Zamień tekst na wyrażenie regularne (/…/i), w którym liczby (np. numer faktury lub miesiąc) pasują do dowolnych cyfr"
                      onClick={() => {
                        const raw = (c.value && !c.value.startsWith('/') ? c.value : c.field === 'title' ? fromRow?.title : fromRow?.counterparty) ?? ''
                        const rx = regexFromRow(raw)
                        if (rx) setCondition(i, { ...c, value: rx })
                      }}
                      data-testid="import-rule-condition-regex"
                    >
                      wzorzec /…/
                    </button>
                  )}
                </>
              )}
              {c.field === 'amount' && (
                <span className="flex items-center gap-1 text-muted">
                  od
                  <AmountField className="w-[90px]" value={c.min ?? null} allowEmpty onChange={(v) => setRange(i, c, v, c.max ?? null)} aria-label="Kwota od" data-testid="import-rule-condition-min" />
                  do
                  <AmountField className="w-[90px]" value={c.max ?? null} allowEmpty onChange={(v) => setRange(i, c, c.min ?? null, v)} aria-label="Kwota do" data-testid="import-rule-condition-max" />
                  zł (bez znaku)
                </span>
              )}
              {c.field === 'account' && (
                <select className="input h-[24px] w-[200px] py-0" value={c.value ?? ''} onChange={(e) => setCondition(i, { ...c, value: e.currentTarget.value })} aria-label="Konto" data-testid="import-rule-condition-account">
                  <option value="">— wybierz konto —</option>
                  {accounts
                    .filter((a) => !a.archived || a.id === c.value)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              )}
              <button
                type="button"
                className="btn btn-ghost h-[22px] px-1 hover:text-down"
                title="Usuń warunek"
                onClick={() => setD((x) => ({ ...x, conditions: x.conditions.filter((_, j) => j !== i) }))}
                data-testid="import-rule-condition-remove"
              >
                <IconClose size={11} />
              </button>
              {why && <span className="text-[11px] text-dim">{why}</span>}
              {swapped?.at === i && <span className="text-[11px] text-accent">{swapped.text}</span>}
            </div>
          )
        })}
        <div className="flex items-center gap-2">
          <select className="input h-[22px] w-[160px] py-0 text-[11.5px]" value={adding} onChange={(e) => setAdding(e.currentTarget.value as RuleCondition['field'])} aria-label="Nowy warunek" data-testid="import-rule-condition-field">
            {FIELDS.map((f) => (
              <option key={f} value={f}>
                {FIELD_LABEL[f]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn h-[22px] px-1.5 text-[11px]"
            disabled={full}
            onClick={() => setD((x) => ({ ...x, conditions: [...x.conditions, blankCondition(adding)] }))}
            data-testid="import-rule-condition-add"
          >
            + warunek
          </button>
          {full && <span className="text-[11px] text-dim">najwyżej {MAX_RULE_CONDITIONS} warunków</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted">Decyzja</span>
        <DecisionFields
          choice={d.choice}
          direction={d.direction ?? 'out'}
          onChange={(choice) => setD((x) => ({ ...x, choice }))}
          exclude={(o) => notForRule(o, d.direction, repayable) || restNotOfRule(o, members)}
          testId="import-rule-conditions-decision"
        />
      </div>
      <div className="flex items-center gap-2 text-muted">
        <span className="shrink-0">Tagi operacji</span>
        <TagsField className="flex-1" value={d.tags} onChange={(tags) => setD((x) => ({ ...x, tags }))} known={known} compact placeholder="#ulga-internet…" testId="import-rule-conditions-tags" />
      </div>
      <label className="flex items-center gap-1.5 text-muted" title="Szybki wpis i edytor operacji podpowiedzą decyzję tej reguły – do zatwierdzenia jednym kliknięciem">
        <input type="checkbox" checked={d.manual} onChange={(e) => setD((x) => ({ ...x, manual: e.currentTarget.checked }))} data-testid="import-rule-conditions-manual" />
        także dla wpisów ręcznych (podpowiedź w szybkim wpisie i w edytorze operacji)
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-accent h-[24px]" disabled={readOnly} onClick={save} data-testid="import-rule-conditions-save">
          Zapisz
        </button>
        <button type="button" className="btn h-[24px]" onClick={done} data-testid="import-rule-conditions-cancel">
          Anuluj
        </button>
        {/* AP-15: „Zapisz” off – why, beside it (the folder became read only while the editor was open). */}
        {locked && (
          <span className="text-[11.5px] text-dim" data-testid="import-rule-conditions-locked">
            {locked}
          </span>
        )}
        {error && (
          <span className="text-[11.5px] text-down" data-testid="import-rule-conditions-error">
            {error}
          </span>
        )}
      </div>
      <span className="text-[11px] text-dim">
        Pierwszeństwo: reguła, w której muszą być spełnione wszystkie z co najmniej dwóch warunków, działa przed regułami marek i słowami (więcej warunków – wcześniej); reguła z jednym warunkiem albo
        „którykolwiek” – dopiero gdy żadna reguła marki ani słowo nie pasuje. Działa przy kolejnych importach; operacje z historii zmienia „Zastosuj do historii”.
      </span>
    </div>
  )
}
