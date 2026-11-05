/**
 * Tags (1.10.0, F17) of an operation, a receipt's line or an import rule: the tags as chips (× takes one off) and a
 * field typing more – „#wakacje #remont” or „wakacje, remont łazienki”; Enter or leaving the field adds them,
 * Backspace in the empty field takes the last off. The tags of the history are suggested as one types.
 */
import { useId, useState } from 'react'
import { parseTags, tagKey, tagsLost, withTags, MAX_TAGS, MAX_TAG_LENGTH } from '@shared/calc/tags'
import { toast } from '../store/ui'
import { IconClose } from './icons'
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
    // What cannot be kept is said (AP-15): a tag cut to 40 characters, one beyond the 20.
    const lost = tagsLost(value, text)
    if (lost.cut) toast(`Tag dłuższy niż ${MAX_TAG_LENGTH} znaków został skrócony.`, 'info', 5000)
    if (lost.over) toast(`Najwyżej ${MAX_TAGS} tagów – ${lost.over === 1 ? 'jeden tag nie został dodany' : `pominięto ${lost.over}`}.`, 'info', 5000)
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
          {/* A clear way to take it off (AP-20, SW sp. 5): its own field beyond a line, the cross at the text's size. */}
          {!disabled && (
            <button
              type="button"
              className={cx('-my-px -mr-1 ml-0.5 flex items-center self-stretch border-l border-line-strong px-1 text-muted hover:bg-hover hover:text-fg-strong', compact ? 'text-[12px]' : 'text-[13px]')}
              onClick={() => remove(tag)}
              title={`Usuń tag #${tag}`}
              aria-label={`Usuń tag ${tag}`}
              data-testid={`${testId}-remove`}
            >
              <IconClose size={compact ? 9 : 10} />
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
      {!disabled && full && (
        <span className="text-[11px] text-dim" data-testid={`${testId}-full`}>
          najwyżej {MAX_TAGS} tagów – usuń któryś, by dodać nowy
        </span>
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
