import { useEffect, useId, useRef, useState } from 'react'
import { AnchoredList } from '../../components/AnchoredList'
import { cx, LimitHint, useTextDraftState } from '../../components/ui'
import { suggestCounterparties } from './pick'

/** A counterparty of the history with what picking it may bring along (`categoryId`: the category last used with it). */
export interface CounterpartySuggestion {
  name: string
  categoryId?: string | null
}

/**
 * The counterparty field with suggestions from the history (Z7, UX-72): the most used names holding the fragment typed
 * (at most 8) – a typo does not make a new „brand”. Arrow down / up highlight, Enter takes the highlighted one; with none
 * highlighted Enter is the field's own (the window saves as it does for any text field). Esc closes the list, a second Esc
 * is the field's own.
 *
 * `commit` – a record's field: the typing is a draft applied on leaving (as `TextField`). `onPick` takes the chosen
 * suggestion (the name and what comes with it); without it the name goes through `onChange`.
 */
export function CounterpartyField({
  value,
  onChange,
  onPick,
  history,
  commit,
  className,
  placeholder,
  maxLength,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
  onPick?: (s: CounterpartySuggestion) => void
  history: readonly CounterpartySuggestion[]
  commit?: boolean
  className?: string
  placeholder?: string
  maxLength?: number
  'aria-label'?: string
  'data-testid'?: string
}) {
  const testId = rest['data-testid']
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  // -1: nothing highlighted – Enter is not the list's.
  const [active, setActive] = useState(-1)
  // The draft of a record's field is the text field's own (`useTextDraft`): applied on leaving, Esc throws it away, the
  // text changed meanwhile on another computer says so.
  const { props: draft, discard } = useTextDraftState(value, onChange, commit, false)
  const text = draft.value
  const found = open ? suggestCounterparties(history, text) : []
  const at = (i: number) => `${listId}-${i}`

  useEffect(() => {
    if (open && active >= 0) document.getElementById(at(active))?.scrollIntoView({ block: 'nearest' })
  })

  const pick = (s: CounterpartySuggestion) => {
    discard()
    setOpen(false)
    setActive(-1)
    if (onPick) onPick(s)
    else onChange(s.name)
  }

  return (
    <>
      <input
        ref={input}
        className={cx('input', className)}
        role="combobox"
        aria-expanded={open && found.length > 0}
        aria-controls={open && found.length > 0 ? listId : undefined}
        aria-activedescendant={open && active >= 0 && found[active] ? at(active) : undefined}
        aria-autocomplete="list"
        aria-label={rest['aria-label']}
        autoComplete="off"
        spellCheck={false}
        maxLength={maxLength}
        placeholder={placeholder}
        value={text}
        data-testid={testId}
        onChange={(e) => {
          draft.onChange(e)
          setOpen(true)
          setActive(-1)
        }}
        onBlur={() => {
          setOpen(false)
          setActive(-1)
          draft.onBlur?.()
        }}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const list = open ? found : suggestCounterparties(history, text)
            if (!list.length) return
            e.preventDefault()
            if (!open) {
              setOpen(true)
              setActive(e.key === 'ArrowDown' ? 0 : list.length - 1)
            } else setActive((i) => (e.key === 'ArrowDown' ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1)))
          } else if (e.key === 'Enter') {
            const s = open && active >= 0 ? found[active] : undefined
            if (s) {
              e.preventDefault()
              e.stopPropagation()
              pick(s)
            } else draft.onKeyDown?.(e)
          } else if (e.key === 'Escape') {
            if (open && found.length > 0) {
              // Only the list closes; the next Esc is the field's own.
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
              setActive(-1)
            } else draft.onKeyDown?.(e)
          }
        }}
      />
      {maxLength != null && <LimitHint length={text.length} max={maxLength} />}
      {open && found.length > 0 && (
        <AnchoredList anchor={input} id={listId} minWidth={200} testId={testId ? `${testId}-list` : undefined} label="Kontrahenci z historii">
          {found.map((s, i) => (
            <div
              key={s.name}
              id={at(i)}
              role="option"
              aria-selected={i === active}
              data-name={s.name}
              data-active={i === active ? '1' : undefined}
              data-testid={testId ? `${testId}-option` : undefined}
              className={cx('flex h-[24px] cursor-pointer items-center truncate px-2', i === active && 'bg-hover')}
              onMouseMove={() => i !== active && setActive(i)}
              onClick={() => pick(s)}
            >
              {s.name}
            </div>
          ))}
        </AnchoredList>
      )}
    </>
  )
}
