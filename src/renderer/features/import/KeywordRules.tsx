import { useState } from 'react'
import { BRANDS, KEYWORDS } from '@shared/import/brands'
import { defaultCategoryId, type ImportRule, type TxKind } from '@shared/schema'
import { useData } from '../../store/data'
import { IconPlus } from '../../components/icons'
import { TextField } from '../../components/ui'
import { CategorySelect, useCategories } from '../operations/pickers'
import { deleteRule, saveKeywordRule } from './rules'

const NO_RULES: ImportRule[] = []

/** What a keyword decides (a small set: the import's decisions per group cover the rest). */
const KEYWORD_OPTIONS: Array<{ value: string; label: string; kind: TxKind; direction: 'in' | 'out' | null }> = [
  { value: 'expense', label: 'Wydatek – kategoria', kind: 'expense', direction: 'out' },
  { value: 'income', label: 'Wpływ (przychód)', kind: 'income', direction: 'in' },
  { value: 'transfer', label: 'Przelew własny', kind: 'transfer', direction: null }
]

/**
 * Keywords of the user (D75): words of a name or a title → a decision, ahead of the built-in ones and the chains of the
 * dictionary. Changing them re-plans an open import at once (`ImportPage`).
 */
export function KeywordRules() {
  const rules = useData((s) => s.fi?.settings.import.rules ?? NO_RULES)
  const cats = useCategories()
  const mine = rules.filter((r) => r.mode === 'keyword')
  const [word, setWord] = useState('')
  const [option, setOption] = useState('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const opt = KEYWORD_OPTIONS.find((o) => o.value === option)!
  const add = () => {
    const err = saveKeywordRule({ keyword: word, direction: opt.direction, kind: opt.kind, categoryId: opt.kind === 'expense' ? categoryId : null })
    setError(err)
    if (!err) setWord('')
  }
  const decision = (r: ImportRule) => (r.kind === 'expense' ? (cats.label(r.categoryId) || 'bez kategorii') : r.kind === 'income' ? 'wpływ (przychód)' : r.kind === 'transfer' ? 'przelew własny' : r.kind)
  return (
    <div className="flex flex-col gap-1.5 text-[12px]" data-testid="keyword-rules">
      <p className="text-[11.5px] text-muted">
        Słowo w nazwie albo w tytule operacji („cukiernia”, „czynsz”) → decyzja. Twoje słowa mają pierwszeństwo przed wbudowanymi i przed słownikiem sieci;
        reguły konkretnych kontrahentów przed nimi. Wielkość liter i polskie znaki bez znaczenia, końcówka słowa może być dłuższa.
      </p>
      {mine.map((r) => (
        <div key={r.id} className="flex items-center gap-2 border-b border-line/60 py-[2px] last:border-b-0" data-testid="keyword-rule">
          <span className="text-fg-strong">„{r.label || r.match}”</span>
          <span className="text-muted">{r.direction === 'in' ? 'wpływy' : r.direction === 'out' ? 'wydatki' : 'oba kierunki'} →</span>
          <span className="min-w-0 flex-1 truncate text-muted">{decision(r)}</span>
          <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] hover:text-down" onClick={() => deleteRule(r.id)} data-testid="keyword-rule-delete">
            usuń
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <TextField className="w-[150px]" value={word} onChange={setWord} placeholder="słowo, np. cukiernia" maxLength={60} data-testid="keyword-input" />
        <select className="input h-[24px] w-[170px] py-0" value={option} onChange={(e) => setOption(e.currentTarget.value)} aria-label="Co to jest" data-testid="keyword-kind">
          {KEYWORD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {opt.kind === 'expense' && <CategorySelect className="h-[24px] min-w-[170px] py-0" value={categoryId} onChange={setCategoryId} data-testid="keyword-category" />}
        <button type="button" className="btn h-[24px]" disabled={!word.trim()} onClick={add} data-testid="keyword-add">
          <IconPlus size={12} /> Dodaj
        </button>
      </div>
      {error && <span className="text-[11.5px] text-down">{error}</span>}
      <details className="text-[11.5px] text-dim">
        <summary className="cursor-pointer select-none text-muted">Wbudowane słowa ({KEYWORDS.length}) i sieci ze słownika ({BRANDS.length})</summary>
        <div className="mt-1 flex flex-col gap-0.5">
          {KEYWORDS.map((k) => (
            <span key={k.word}>
              <span className="text-fg">{k.word}</span> → {cats.label(defaultCategoryId(k.category[0], k.category[1])) || '(kategoria usunięta)'}
            </span>
          ))}
          <span className="mt-1">Sieci: {BRANDS.map((b) => b.label).join(', ')}.</span>
        </div>
      </details>
    </div>
  )
}
