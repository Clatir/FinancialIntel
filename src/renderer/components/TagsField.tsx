/**
 * Tags (1.10.0, F17) of an operation, a receipt's line or an import rule: the tags as chips (× takes one off) and a
 * field typing more – „#wakacje #remont” or „wakacje, remont łazienki”; Enter or leaving the field adds them,
 * Backspace in the empty field takes the last off. The tags of the history are suggested as one types.
 */
import { useId, useState } from 'react'
import { parseTags, tagKey, withTags, MAX_TAGS } from '@shared/calc/tags'
import { cx } from './ui'

export function TagsField({
  value,
  onChange,
  known = [],
  disabled,
  compact,
  placeholder = '#wyprawa, projekt…',
  className,
  testId
}: {
  value: readonly string[]
  onChange: (tags: string[]) => void
  /** Tags of the history (suggested; those set already are left out). */
  known?: readonly string[]
  disabled?: boolean
  /** In a receipt's line: smaller. */
  compact?: boolean
  placeholder?: string
  className?: string
  testId: string
}) {
  const [text, setText] = useState('')
  const listId = useId()
  const add = () => {
    const more = parseTags(text)
    setText('')
    if (!more.length) return
    const next = withTags(value, more)
    if (next.length !== value.length || next.some((t, i) => t !== value[i])) onChange(next)
  }
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))
  const have = new Set(value.map(tagKey))
  const full = value.length >= MAX_TAGS
  return (
    <div className={cx('flex min-w-0 flex-wrap items-center gap-1', className)} data-testid={testId}>
      {value.map((tag) => (
        <span key={tag} className={cx('chip gap-1 text-fg-strong', compact && 'h-[20px] px-1.5 text-[11px]')} data-testid={`${testId}-chip`} data-tag={tag}>
          #{tag}
          {!disabled && (
            <button type="button" className="text-dim hover:text-down" onClick={() => remove(tag)} aria-label={`Usuń tag ${tag}`} data-testid={`${testId}-remove`}>
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && !full && (
        <input
          className={cx('input min-w-[90px] flex-1', compact && 'h-[22px] py-0 text-[11px]')}
          value={text}
          list={listId}
          placeholder={value.length ? '' : placeholder}
          maxLength={200}
          spellCheck={false}
          onChange={(e) => setText(e.currentTarget.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // The tag typed first; the quick window's own Enter (save) follows when it listens.
              e.preventDefault()
              add()
            } else if (e.key === 'Backspace' && !text && value.length) remove(value[value.length - 1]!)
          }}
          aria-label="Tagi"
          data-testid={`${testId}-input`}
        />
      )}
      {!disabled && !full && (
        <datalist id={listId}>
          {known
            .filter((k) => !have.has(tagKey(k)))
            .slice(0, 200)
            .map((k) => (
              <option key={k} value={k} />
            ))}
        </datalist>
      )}
    </div>
  )
}
