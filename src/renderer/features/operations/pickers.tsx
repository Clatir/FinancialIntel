import { useMemo } from 'react'
import { categoryIndex, type CategoryIndex } from '@shared/calc/operations'
import type { Account, Category } from '@shared/schema'
import { useData } from '../../store/data'
import { cx } from '../../components/ui'

const NO_CATEGORIES: Category[] = []
const NO_ACCOUNTS: Account[] = []

export function useCategories(): CategoryIndex {
  const categories = useData((s) => s.fi?.settings.categories ?? NO_CATEGORIES)
  return useMemo(() => categoryIndex(categories), [categories])
}

export function useAccounts(): Account[] {
  return useData((s) => s.fi?.settings.accounts ?? NO_ACCOUNTS)
}

/**
 * A category: the main ones with their subcategories under them (an archived one only when it is the current value).
 * `''` = without a category.
 */
export function CategorySelect({
  value,
  onChange,
  className,
  emptyLabel = '— bez kategorii —',
  ...rest
}: {
  value: string | null
  onChange: (id: string | null) => void
  className?: string
  emptyLabel?: string
  'aria-label'?: string
  'data-testid'?: string
}) {
  const cats = useCategories()
  const shown = (c: Category) => !c.archived || c.id === value
  return (
    <select
      className={cx('input', className)}
      value={value ?? ''}
      onChange={(e) => onChange(e.currentTarget.value || null)}
      aria-label={rest['aria-label'] ?? 'Kategoria'}
      data-testid={rest['data-testid']}
    >
      <option value="">{emptyLabel}</option>
      {cats.mains.filter(shown).map((main) => (
        <optgroup key={main.id} label={main.name}>
          <option value={main.id}>{main.name}</option>
          {cats.childrenOf(main.id).filter(shown).map((c) => (
            <option key={c.id} value={c.id}>
              {main.name} · {c.name}
            </option>
          ))}
        </optgroup>
      ))}
      {value && !cats.byId.has(value) && <option value={value}>(usunięta kategoria)</option>}
    </select>
  )
}

/** An account of the budget (an archived one only when it is the current value); `none` = an extra first choice. */
export function AccountSelect({
  value,
  onChange,
  none,
  exclude,
  className,
  ...rest
}: {
  value: string | null
  onChange: (id: string | null) => void
  none?: string
  exclude?: string
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}) {
  const accounts = useAccounts()
  return (
    <select
      className={cx('input', className)}
      value={value ?? ''}
      onChange={(e) => onChange(e.currentTarget.value || null)}
      aria-label={rest['aria-label'] ?? 'Konto'}
      data-testid={rest['data-testid']}
    >
      {none != null && <option value="">{none}</option>}
      {accounts
        .filter((a) => a.id !== exclude && (!a.archived || a.id === value))
        .map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      {value && !accounts.some((a) => a.id === value) && <option value={value}>(usunięte konto)</option>}
    </select>
  )
}
