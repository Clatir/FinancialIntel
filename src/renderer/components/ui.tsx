// adapted from ICTTJ src/renderer/components/ui.tsx @ 84a8339
import { forwardRef, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { parseNumberInput } from '../lib/format'
import { toast } from '../store/ui'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export { Panel, usePanelFill, DetachedContext, CompactContext } from './Panel'

export function Field({
  label,
  children,
  hint,
  className,
  labelWidth = 104,
  wrapLabel = false
}: {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
  className?: string
  /** Width of the label column in px. */
  labelWidth?: number
  /** A long label wraps (top-aligned) instead of being cut with "…". */
  wrapLabel?: boolean
}) {
  return (
    <div className={cx('grid items-center gap-x-2 gap-y-0.5', className)} style={{ gridTemplateColumns: `${labelWidth}px minmax(0,1fr)` }}>
      <span className={cx('text-[11.5px] text-muted', wrapLabel ? 'self-start pt-1 leading-snug break-words' : 'truncate')}>{label}</span>
      <div className="min-w-0">{children}</div>
      {hint && <div className="col-start-2 text-[11px] text-muted">{hint}</div>}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

interface NumberFieldProps {
  value: number | null
  onChange: (v: number | null) => void
  decimals?: number
  /** ArrowUp/ArrowDown step (Shift = x10). */
  step?: number
  placeholder?: string
  className?: string
  readOnly?: boolean
  id?: string
  autoFocus?: boolean
  /** A parsed number this returns false for is refused like unparsable text (error border, state unchanged). */
  isValid?: (v: number | null) => boolean
  /** Show negatives with U+2212 (typing accepts both minus signs anyway). */
  typographicMinus?: boolean
  /**
   * Save only when leaving the field or on Enter: an intermediate value ("8" on the way to "80") is
   * never saved; a refused one goes back to the saved value and `onReject` says why.
   */
  commitOnBlur?: boolean
  onReject?: (v: number | null) => void
  'aria-label'?: string
  'data-testid'?: string
}

/** Places of a step like 0.25 or 0.01 (at most 10). */
const stepPlaces = (step: number) => Math.min(10, (String(step).split('.')[1] ?? '').length)

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { value, onChange, decimals, step, placeholder, className, readOnly, id, autoFocus, isValid, typographicMinus, commitOnBlur, onReject, ...aria },
  ref
) {
  const [draft, setDraft] = useState<string | null>(null)
  const formatted = value == null ? '' : decimals != null ? value.toFixed(decimals) : String(value)
  const shown = draft ?? (typographicMinus ? formatted.replace('-', '\u2212') : formatted)
  // A field of whole numbers (decimals 0 – B26) never takes a fraction: 2,5 raty would save as a schedule losing a part.
  const fits = (v: number | null) => v == null || decimals !== 0 || Number.isInteger(v)
  const accepts = (t: string) => {
    const parsed = parseNumberInput(t)
    return parsed !== undefined && fits(parsed) && (!isValid || isValid(parsed))
  }
  const invalid = draft != null && !accepts(draft)
  return (
    <input
      ref={ref}
      id={id}
      autoFocus={autoFocus}
      className={cx('input num text-right', className)}
      inputMode="decimal"
      spellCheck={false}
      value={shown}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-invalid={invalid}
      aria-label={aria['aria-label']}
      data-testid={aria['data-testid']}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.currentTarget.value
        setDraft(t)
        if (commitOnBlur) return
        const parsed = parseNumberInput(t)
        if (parsed !== undefined && fits(parsed) && (!isValid || isValid(parsed))) onChange(parsed)
      }}
      onBlur={() => {
        if (commitOnBlur && draft != null && !readOnly) {
          const parsed = parseNumberInput(draft)
          if (parsed !== undefined && fits(parsed) && (!isValid || isValid(parsed))) {
            if (parsed !== value) onChange(parsed)
          } else onReject?.(parsed ?? null)
        }
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (readOnly || !step || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) {
          if (e.key === 'Enter') {
            if (commitOnBlur) e.currentTarget.blur()
            else setDraft(null)
          }
          return
        }
        e.preventDefault()
        const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)
        const raw = (value ?? 0) + delta
        // Clean numbers after repeated steps (0.1 + 0.2). Never fewer places than the step has: a value shown as
        // "0.1" stepped by 0.01 must become 0.11, not round back to 0.1.
        const next = decimals != null ? Number(raw.toFixed(Math.max(decimals, stepPlaces(step)))) : Number(raw.toFixed(10))
        if (isValid && !isValid(next)) return
        onChange(next)
        setDraft(null)
      }}
    />
  )
})

/**
 * A text kept as a draft while typed (`commit` – a record's field, W2): applied on leaving the field or Enter (Ctrl+Enter
 * in a text area), Esc throws it away – a record is not saved, nor everything counted again, at every key. The text
 * changed meanwhile under the draft (another computer): the typed one wins and says so – the other version is in the
 * record's history (main keeps another computer's version whenever it is overwritten).
 */
function useTextDraft(value: string, onChange: (v: string) => void, commit: boolean | undefined, multiline: boolean) {
  const [draft, setDraft] = useState<{ text: string; base: string } | null>(null)
  // Escape: the blur it causes runs with this render's draft – it must not apply it.
  const cancelled = useRef(false)
  if (!commit) return { value, onChange: (e: { currentTarget: { value: string } }) => onChange(e.currentTarget.value) }
  return {
    value: draft?.text ?? value,
    onChange: (e: { currentTarget: { value: string } }) => {
      const text = e.currentTarget.value
      setDraft((d) => ({ text, base: d?.base ?? value }))
    },
    onBlur: () => {
      if (draft && !cancelled.current && draft.text !== value) {
        onChange(draft.text)
        if (value !== draft.base) toast('Ten tekst zmienił się w międzyczasie na innym komputerze – zapisano Twoją wersję, tamta jest w historii wpisu.', 'info', 8000)
      }
      cancelled.current = false
      setDraft(null)
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (!multiline || e.ctrlKey)) e.currentTarget.blur()
      if (e.key === 'Escape' && draft != null) {
        e.stopPropagation()
        cancelled.current = true
        setDraft(null)
        e.currentTarget.blur()
      }
    }
  }
}

export function TextField({
  value,
  onChange,
  placeholder,
  className,
  mono,
  commit,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  mono?: boolean
  /** Applied on leaving the field (a record's field – W2). */
  commit?: boolean
  maxLength?: number
  'aria-label'?: string
  'data-testid'?: string
}) {
  const text = useTextDraft(value, onChange, commit, false)
  return <input className={cx('input', mono && 'num', className)} placeholder={placeholder} spellCheck={false} {...text} {...rest} />
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  commit,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  className?: string
  /** Applied on leaving the field or Ctrl+Enter (a record's field – W2). */
  commit?: boolean
  /** The record's limit (B74): a longer text pasted is cut – never a record that cannot be written. */
  maxLength?: number
  'aria-label'?: string
  'data-testid'?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const text = useTextDraft(value, onChange, commit, true)
  // Grow with content up to a limit; manual resize still possible.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(260, Math.max(el.scrollHeight + 2, rows * 18 + 12))}px`
  }, [text.value, rows])
  return <textarea ref={ref} className={cx('input', className)} rows={rows} placeholder={placeholder} spellCheck lang="pl" {...text} {...rest} />
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
  ...rest
}: {
  value: T | null
  options: Array<{ value: T; label: ReactNode; title?: string; className?: string; disabled?: boolean }>
  onChange: (v: T) => void
  className?: string
  size?: 'sm' | 'md'
  'aria-label'?: string
}) {
  return (
    <div role="radiogroup" aria-label={rest['aria-label']} className={cx('inline-flex border border-line-strong', className)}>
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cx(
              'px-2.5 transition-colors duration-100',
              size === 'sm' ? 'h-[22px] text-[11.5px]' : 'h-[24px]',
              i > 0 && 'border-l border-line-strong',
              active
                ? (o.className ?? 'bg-accent-soft text-accent')
                : o.disabled
                  ? 'cursor-not-allowed text-dim'
                  : 'text-muted hover:bg-hover hover:text-fg-strong'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Chips({
  items,
  selected,
  onToggle,
  empty
}: {
  items: Array<{ id: string; name: string }>
  selected: string[]
  onToggle: (id: string) => void
  empty?: ReactNode
}) {
  if (items.length === 0) return <span className="text-[11.5px] text-dim">{empty ?? 'Brak pozycji w słowniku'}</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => (
        <button key={it.id} type="button" className="chip" aria-pressed={selected.includes(it.id)} onClick={() => onToggle(it.id)}>
          {it.name}
        </button>
      ))}
    </div>
  )
}

export function Badge({ children, tone = 'default', title, ...rest }: { children: ReactNode; tone?: 'default' | 'accent' | 'up' | 'down' | 'warn'; title?: string; 'data-testid'?: string }) {
  const tones = {
    default: 'border-line-strong text-muted',
    accent: 'border-accent/50 text-accent',
    up: 'border-up/40 text-up',
    down: 'border-down/40 text-down',
    warn: 'border-accent/50 text-accent'
  }
  return (
    <span title={title} data-testid={rest['data-testid']} className={cx('inline-flex h-[18px] items-center border px-1.5 text-[10.5px] uppercase tracking-wide', tones[tone])}>
      {children}
    </span>
  )
}

/** A long list shown a page at a time (W17, W25): „pokaż kolejne” while some are left. */
export function ShowMore({ shown, total, page, onMore, testId }: { shown: number; total: number; page: number; onMore: () => void; testId: string }) {
  if (shown >= total) return null
  return (
    <button type="button" className="self-start text-[11px] text-accent hover:underline" onClick={onMore} data-testid={testId}>
      pokaż kolejne ({Math.min(page, total - shown)} z {total - shown})
    </button>
  )
}

export function Stat({ label, value, className, valueClassName }: { label: ReactNode; value: ReactNode; className?: string; valueClassName?: string }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="label truncate">{label}</span>
      <span className={cx('num text-[14px] text-fg-strong', valueClassName)}>{value}</span>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  ...rest
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  disabled?: boolean
  'data-testid'?: string
}) {
  return (
    <label className={cx('inline-flex cursor-default items-center gap-2', disabled && 'opacity-40')} data-testid={rest['data-testid']}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-[16px] w-[28px] border transition-colors duration-150',
          checked ? 'border-accent bg-accent-soft' : 'border-line-strong bg-bg'
        )}
      >
        <span
          className={cx(
            'absolute top-[2px] h-[10px] w-[10px] transition-all duration-150',
            checked ? 'left-[14px] bg-accent' : 'left-[2px] bg-muted'
          )}
        />
      </button>
      <span>{label}</span>
    </label>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6 text-center text-muted">{children}</div>
}

/**
 * Three-letter currency code. Edited as a draft and applied on blur/Enter: applying every keystroke
 * would reject the intermediate one- and two-letter states and snap the field back.
 */
export function CurrencyInput({
  value,
  onChange,
  className,
  allowEmpty,
  placeholder,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  /** An emptied field applies '' (e.g. "account currency"). */
  allowEmpty?: boolean
  placeholder?: string
  'aria-label'?: string
  'data-testid'?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const valid = (t: string) => /^[A-Z]{3}$/.test(t) || (!!allowEmpty && t === '')
  return (
    <input
      className={cx('input num', className)}
      value={draft ?? value}
      placeholder={placeholder}
      spellCheck={false}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
      aria-invalid={draft != null && !valid(draft)}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.currentTarget.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
      onBlur={() => {
        if (draft != null && valid(draft) && draft !== value) onChange(draft)
        setDraft(null)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

/**
 * A name edited as a draft and applied on blur/Enter: it can be cleared and retyped, an empty name keeps
 * the old one and `validate` can refuse a name (e.g. a duplicate) with a message.
 */
export const NameInput = forwardRef<
  HTMLInputElement,
  {
    value: string
    onChange: (v: string) => void
    validate?: (v: string) => string | null
    /** Shown when the field is left empty (the old name stays); without it an empty name is ignored silently. */
    emptyMessage?: string
    className?: string
    maxLength?: number
    placeholder?: string
    'aria-label'?: string
    'data-testid'?: string
  }
>(function NameInput({ value, onChange, validate, emptyMessage, className, maxLength, placeholder, ...rest }, ref) {
  const [draft, setDraft] = useState<string | null>(null)
  // Escape: the blur it causes runs with this render's draft – it must not apply it (B24).
  const cancelled = useRef(false)
  const apply = () => {
    const next = draft?.trim()
    setDraft(null)
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    if (draft != null && !next && emptyMessage) return toast(emptyMessage, 'error')
    if (!next || next === value) return
    const problem = validate?.(next) ?? null
    if (problem) return toast(problem, 'error')
    onChange(next)
  }
  return (
    <input
      ref={ref}
      className={cx('input', className)}
      value={draft ?? value}
      spellCheck={false}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={apply}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape' && draft != null) {
          e.stopPropagation()
          cancelled.current = true
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
    />
  )
})

/** One cell of a result grid (label, value, optional caption); borders fit a two-column grid by default. */
export function Cell({
  label,
  value,
  sub,
  testId,
  className,
  valueClassName
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  testId?: string
  className?: string
  valueClassName?: string
}) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col gap-0.5 px-2 py-1.5',
        className ?? 'border-r border-b border-line [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0'
      )}
    >
      <span className="label truncate">{label}</span>
      <span className={cx('num text-[13px] text-fg-strong', valueClassName)} data-testid={testId}>
        {value}
      </span>
      {sub != null && sub !== false && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  )
}
