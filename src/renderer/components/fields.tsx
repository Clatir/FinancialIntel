/**
 * Fields of the budget's forms: an amount in złoty (stored in grosze), a date and a wall time. Each is edited as a
 * draft and applied on leaving the field or Enter – an intermediate value is never saved; a value that cannot be read
 * goes back to the saved one with a message.
 */
import { forwardRef, useState } from 'react'
import { parseAmountInput, parseClockInput, parseDateInput } from '../lib/format'
import { toast } from '../store/ui'
import { cx } from './ui'

/** 123456 → "1 234,56" (grouped, comma), 1200 → "12,00". */
export function plnText(grosze: number, group = true): string {
  const abs = Math.abs(grosze)
  const zl = String(Math.floor(abs / 100))
  const int = group ? zl.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : zl
  return `${grosze < 0 ? '−' : ''}${int},${String(abs % 100).padStart(2, '0')}`
}

/** A signed amount as the lists show it: „+” for money in, „−” for money out (D68). */
export function signedPln(grosze: number): string {
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
        setDraft(value == null ? '' : plnText(value, false))
        const el = e.currentTarget
        requestAnimationFrame(() => el.select())
      }}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => {
        if (draft != null) {
          const v = parse(draft)
          if (v === undefined) toast('Nieprawidłowa kwota – zostaje poprzednia.', 'error')
          else if (v !== value) onChange(v)
        }
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape' && draft != null) {
          e.stopPropagation()
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
        if (draft != null) {
          const d = parseDateInput(draft, year)
          if (!d) toast('Nieprawidłowa data – zostaje poprzednia.', 'error')
          else if (d !== value) onChange(d)
        }
        setDraft(null)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
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
        if (draft != null) {
          const v = read(draft)
          if (v === undefined) toast('Nieprawidłowa godzina – zostaje poprzednia.', 'error')
          else if (v !== value) onChange(v)
        }
        setDraft(null)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}
