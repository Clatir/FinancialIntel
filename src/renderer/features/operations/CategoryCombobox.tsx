import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { AnchoredList } from '../../components/AnchoredList'
import { cx } from '../../components/ui'
import { filterChoices, RECENT_CATEGORIES, type CategoryChoice } from './pick'

interface Entry {
  id: string
  label: string
  /** What the row shows: a subcategory's own name in the tree, the full label elsewhere. */
  shown: string
  section: 'empty' | 'recent' | 'tree'
  main: boolean
}

const SEP = ' · '

/**
 * The category field (Z7, UX-70): one input that searches the tree by a fragment (no Polish marks, no case) and lists
 * „Ostatnie” – the categories of the newest operations – above the whole tree; „bez kategorii” is its first choice.
 * Arrows move, Enter takes the highlighted one (nothing else – the window it stands in does not save by that Enter),
 * Esc closes the list (and only it), leaving the field takes nothing. `value` is also in `data-value` (empty = none).
 */
export function CategoryCombobox({
  choices,
  recent = [],
  value,
  onChange,
  emptyLabel = '— bez kategorii —',
  className,
  ...rest
}: {
  /** The tree (`categoryChoices`); the current value is among them unless it was deleted. */
  choices: CategoryChoice[]
  /** The ids of the newest operations' categories, the newest first (the ones not in `choices` are left out). */
  recent?: readonly string[]
  value: string | null
  onChange: (id: string | null) => void
  emptyLabel?: string
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}) {
  const testId = rest['data-testid']
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  // The text being typed; null = the field shows the current category.
  const [query, setQuery] = useState<string | null>(null)
  const [active, setActive] = useState(0)

  const current = value ? (choices.find((c) => c.id === value)?.label ?? '(usunięta kategoria)') : ''
  const typing = query != null && query.trim() !== ''

  const build = (q: string | null): Entry[] => {
    const tree = (c: CategoryChoice): Entry => ({ id: c.id, label: c.label, shown: c.main ? c.label : c.label.slice(c.label.indexOf(SEP) + SEP.length), section: 'tree', main: c.main })
    if (q != null && q.trim() !== '') return filterChoices(choices, q).map((c) => ({ ...tree(c), shown: c.label }))
    const known = new Map(choices.map((c) => [c.id, c]))
    const last: Entry[] = []
    for (const id of recent) {
      const c = known.get(id)
      if (c) last.push({ id, label: c.label, shown: c.label, section: 'recent', main: false })
      if (last.length >= RECENT_CATEGORIES) break
    }
    return [{ id: '', label: emptyLabel, shown: emptyLabel, section: 'empty', main: false }, ...last, ...choices.map(tree)]
  }
  const entries = open ? build(query) : []
  const at = (i: number) => `${listId}-${i}`

  const openList = () => {
    if (open) return
    const all = build(null)
    const i = all.findIndex((e) => e.section !== 'recent' && e.id === (value ?? ''))
    setActive(Math.max(0, i))
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
    setQuery(null)
  }
  const choose = (e: Entry) => {
    if ((e.id || null) !== (value || null)) onChange(e.id || null)
    close()
  }

  useEffect(() => {
    if (open) document.getElementById(at(active))?.scrollIntoView({ block: 'nearest' })
  })

  let header: Entry['section'] | null = null
  return (
    <>
      <input
        ref={input}
        className={cx('input', className)}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && entries[active] ? at(active) : undefined}
        aria-autocomplete="list"
        aria-label={rest['aria-label'] ?? 'Kategoria'}
        autoComplete="off"
        spellCheck={false}
        placeholder={emptyLabel}
        value={query ?? current}
        data-testid={testId}
        data-value={value ?? ''}
        onFocus={(e) => e.currentTarget.select()}
        onClick={openList}
        onBlur={close}
        onChange={(e) => {
          setQuery(e.currentTarget.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          // Ctrl+Enter and the like belong to the window the field is in.
          if (e.ctrlKey || e.metaKey || e.altKey) return
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) openList()
            else setActive((i) => Math.max(0, Math.min(entries.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))))
          } else if (e.key === 'Enter' && !e.shiftKey) {
            // The Enter of a list is its own: it takes the highlighted choice (or opens the list) and saves nothing.
            e.preventDefault()
            e.stopPropagation()
            const entry = entries[active]
            if (open && entry) choose(entry)
            else if (open) close()
            else openList()
          } else if (e.key === 'Escape' && open) {
            e.preventDefault()
            e.stopPropagation()
            close()
          }
        }}
      />
      {open && (
        <AnchoredList anchor={input} id={listId} minWidth={220} testId={testId ? `${testId}-list` : undefined} label={rest['aria-label'] ?? 'Kategoria'}>
          {entries.map((e, i) => {
            const title = e.section !== header && e.section === 'recent' ? 'Ostatnie' : e.section !== header && e.section === 'tree' && header === 'recent' ? 'Wszystkie' : null
            header = e.section
            return (
              <Fragment key={at(i)}>
                {title && (
                  <div className="px-2 pb-0.5 pt-1.5 text-[10.5px] uppercase tracking-wide text-dim" role="presentation" data-testid={testId ? `${testId}-section` : undefined}>
                    {title}
                  </div>
                )}
                <div
                  id={at(i)}
                  role="option"
                  aria-selected={e.id === (value ?? '') && e.section !== 'recent'}
                  data-id={e.id}
                  data-label={e.label}
                  data-section={e.section}
                  data-active={i === active ? '1' : undefined}
                  data-testid={testId ? `${testId}-option` : undefined}
                  className={cx(
                    'flex h-[24px] cursor-pointer items-center truncate px-2',
                    e.section === 'tree' && !e.main && !typing && 'pl-5',
                    e.section === 'tree' && e.main && !typing && 'font-medium text-fg-strong',
                    e.section === 'empty' && 'text-muted',
                    i === active && 'bg-hover'
                  )}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={() => choose(e)}
                >
                  {e.shown}
                </div>
              </Fragment>
            )
          })}
          {entries.length === 0 && (
            <div className="px-2 py-1 text-dim" role="presentation" data-testid={testId ? `${testId}-none` : undefined}>
              Brak pasujących kategorii
            </div>
          )}
        </AnchoredList>
      )}
    </>
  )
}
