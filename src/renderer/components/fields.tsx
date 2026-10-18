/**
 * Fields of the budget's forms: an amount in złoty (stored in grosze), a date and a wall time. Each is edited as a
 * draft and applied on leaving the field or Enter – an intermediate value is never saved; a value that cannot be read
 * goes back to the saved one with a message.
 */
import { forwardRef, useRef, useState } from 'react'
import { formatPln } from '@shared/format'
import { parseAmountInput, parseClockInput, parseDateInput, parseMonthInput } from '../lib/format'
import { toast } from '../store/ui'
import { cx } from './ui'

/** What a hidden amount shows (Ctrl+$, D30). */
export const AMOUNT_MASK = '•••'
let hiddenAmounts = false

/** The hiding of amounts of this computer: every `plnText` masks them (the app's tree renders again on a change). */
export function setAmountsHidden(on: boolean): void {
  hiddenAmounts = on
}

export const amountsHidden = (): boolean => hiddenAmounts

export { formatPln }

/** An amount as the screens show it: the number, or the mask while the amounts are hidden. */
export function plnText(grosze: number, group = true): string {
  return hiddenAmounts ? AMOUNT_MASK : formatPln(grosze, group)
}

/** A signed amount as the lists show it: „+” for money in, „−” for money out (D68). */
export function signedPln(grosze: number): string {
  if (hiddenAmounts) return AMOUNT_MASK
  return grosze > 0 ? `+${plnText(grosze)}` : plnText(grosze)
}

/** An amount in złoty: grosze in and out (decision T3); `null` = empty. */
export const AmountField = forwardRef<
  HTMLInputElement,
  {
    value: number | null
    onChange: (grosze: number | null) => void
    allowNegative?: boolean
    allowEmpty?: boolean
    placeholder?: string
    className?: string
    autoFocus?: boolean
    'aria-label'?: string
    'data-testid'?: string
  }
>(function AmountField({ value, onChange, allowNegative, allowEmpty, placeholder, className, autoFocus, ...rest }, ref) {
  const [draft, setDraft] = useState<string | null>(null)
  // Escape: the blur it causes runs with this render's draft – it must not save it.
  const cancelled = useRef(false)
  const parse = (t: string): number | null | undefined => {
    const v = parseAmountInput(t)
    if (v === undefined) return undefined
    if (v === null) return allowEmpty ? null : undefined
    if (v < 0 && !allowNegative) return undefined
    return Math.round(v * 100)
  }
  const invalid = draft != null && parse(draft) === undefined
  return (
    <input
      ref={ref}
      className={cx('input num text-right', className)}
      inputMode="decimal"
      spellCheck={false}
      autoFocus={autoFocus}
      placeholder={placeholder ?? '0,00'}
      value={draft ?? (value == null ? '' : plnText(value))}
      aria-invalid={invalid}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
      onFocus={(e) => {
        setDraft(value == null ? '' : formatPln(value, false))
        const el = e.currentTarget
        // Selected once the draft is in – only while the field still has the focus: `select()` focuses it, so a late
        // frame (a throttled window) would pull the focus, and the next field's typing, back into this one.
        requestAnimationFrame(() => {
          if (document.activeElement === el) el.select()
        })
      }}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => {
        if (draft != null && !cancelled.current) {
          const v = parse(draft)
          if (v === undefined) toast('Nieprawidłowa kwota – zostaje poprzednia.', 'error')
          else if (v !== value) onChange(v)
        }
        cancelled.current = false
        setDraft(null)
      }}
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

const plDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`

/** A date shown as 16.10.2026; typed as 16.10, 16.10.2026 or 2026-10-16. */
export function DateField({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string
  onChange: (date: string) => void
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  // Escape: the blur it causes runs with this render's draft – it must not save it.
  const cancelled = useRef(false)
  const year = Number(value.slice(0, 4)) || new Date().getFullYear()
  const invalid = draft != null && parseDateInput(draft, year) == null
  return (
    <input
      className={cx('input num', className)}
      spellCheck={false}
      value={draft ?? plDate(value)}
      aria-invalid={invalid}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => {
        if (draft != null && !cancelled.current) {
          const d = parseDateInput(draft, year)
          if (!d) toast('Nieprawidłowa data – zostaje poprzednia.', 'error')
          else if (d !== value) onChange(d)
        }
        cancelled.current = false
        setDraft(null)
      }}
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
}

/**
 * A month 'RRRR-MM' (typed also as 03.2027 or 3/2027); empty = none when `allowEmpty`. Saved on leaving the field or
 * Enter (B1): a month half typed never saves, one that cannot be read goes back to the saved one with a message.
 */
export function MonthField({
  value,
  onChange,
  allowEmpty,
  className,
  placeholder = 'RRRR-MM',
  ...rest
}: {
  value: string | null
  onChange: (month: string | null) => void
  allowEmpty?: boolean
  className?: string
  placeholder?: string
  'aria-label'?: string
  'data-testid'?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  // Escape: the blur it causes runs with this render's draft – it must not save it.
  const cancelled = useRef(false)
  const parsed = draft == null ? value : parseMonthInput(draft)
  const invalid = draft != null && (parsed === undefined || (parsed === null && !allowEmpty))
  return (
    <input
      className={cx('input num', className)}
      spellCheck={false}
      value={draft ?? value ?? ''}
      placeholder={placeholder}
      aria-invalid={invalid}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => {
        if (draft != null && !cancelled.current) {
          if (invalid) toast(`Nieprawidłowy miesiąc – zostaje ${value ? 'poprzedni' : 'pusty'} (wpisz RRRR-MM${allowEmpty ? ' albo zostaw puste' : ''}).`, 'error')
          else if (parsed !== value) onChange(parsed ?? null)
        }
        cancelled.current = false
        setDraft(null)
      }}
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
}

/** A wall time HH:MM (typed 1430, 14.30, 14); empty = unknown when `allowEmpty`. */
export function TimeField({
  value,
  onChange,
  allowEmpty,
  className,
  ...rest
}: {
  value: string | null
  onChange: (time: string | null) => void
  allowEmpty?: boolean
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  // Escape: the blur it causes runs with this render's draft – it must not save it.
  const cancelled = useRef(false)
  const read = (t: string) => (t.trim() === '' ? (allowEmpty ? null : undefined) : (parseClockInput(t) ?? undefined))
  const invalid = draft != null && read(draft) === undefined
  return (
    <input
      className={cx('input num', className)}
      spellCheck={false}
      placeholder={allowEmpty ? '—:—' : 'GG:MM'}
      value={draft ?? value ?? ''}
      aria-invalid={invalid}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => {
        if (draft != null && !cancelled.current) {
          const v = read(draft)
          if (v === undefined) toast('Nieprawidłowa godzina – zostaje poprzednia.', 'error')
          else if (v !== value) onChange(v)
        }
        cancelled.current = false
        setDraft(null)
      }}
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
}
