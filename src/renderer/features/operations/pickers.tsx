import type { ReactNode } from 'react'
import { categoryIndex, type CategoryIndex } from '@shared/calc/operations'
import type { Account, Category } from '@shared/schema'
import { useData } from '../../store/data'
import { cx } from '../../components/ui'

const NO_CATEGORIES: Category[] = []
const NO_ACCOUNTS: Account[] = []

/** One index per list of categories, shared by every screen and select (W17: hundreds of selects on the import). */
const indexes = new WeakMap<readonly Category[], CategoryIndex>()

export function useCategories(): CategoryIndex {
  const categories = useData((s) => s.fi?.settings.categories ?? NO_CATEGORIES)
  let index = indexes.get(categories)
  if (!index) indexes.set(categories, (index = categoryIndex(categories)))
  return index
}

/** The tree's options (W17): made once per tree and archived choice, the same elements in every category select. */
const optionsMemo = new WeakMap<CategoryIndex, Map<string, ReactNode>>()

function categoryOptions(cats: CategoryIndex, value: string | null): ReactNode {
  // An archived category only as the current value.
  // Also a subcategory of an archived main one (B80): shown as the value it is, never as „bez kategorii”.
  const archived = value && (cats.byId.get(value)?.archived || cats.mainOf(value)?.archived) ? value : ''
  let byArchived = optionsMemo.get(cats)
  if (!byArchived) optionsMemo.set(cats, (byArchived = new Map()))
  let nodes = byArchived.get(archived)
  if (nodes === undefined) {
    const shown = (c: Category) => !c.archived || c.id === archived
    const holder = archived ? cats.mainOf(archived)?.id : undefined
    nodes = cats.mains
      .filter((main) => shown(main) || main.id === holder)
      .map((main) => {
        // An archived main category shown for the current value only: that value alone.
        const only = main.archived
        return (
          <optgroup key={main.id} label={main.name}>
            {(!only || main.id === archived) && <option value={main.id}>{main.name}</option>}
            {cats
              .childrenOf(main.id)
              .filter((c) => (only ? c.id === archived : shown(c)))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {main.name} · {c.name}
                </option>
              ))}
          </optgroup>
        )
      })
    byArchived.set(archived, nodes)
  }
  return nodes
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
  return (
    <select
      className={cx('input', className)}
      value={value ?? ''}
      onChange={(e) => onChange(e.currentTarget.value || null)}
      aria-label={rest['aria-label'] ?? 'Kategoria'}
      data-testid={rest['data-testid']}
    >
      <option value="">{emptyLabel}</option>
      {categoryOptions(cats, value)}
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
