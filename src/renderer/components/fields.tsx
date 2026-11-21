/**
 * Fields of the budget's forms: an amount in złoty (stored in grosze), a date and a wall time. Each is edited as a
 * draft and applied on leaving the field or Enter – an intermediate value is never saved; a value that cannot be read
 * goes back to the saved one with a message.
 */
import { forwardRef, useEffect, useRef, useState } from 'react'
import { formatPln } from '@shared/format'
import { monthLabel, parseAmountInput, parseClockInput, parseDateInput, parseMonthInput, plDate } from '../lib/format'
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

/** Why a typed amount was refused (AP-15): said at the field, with what stays – never a silent return to the old value. */
export function amountRefusal(text: string): string {
  const v = parseAmountInput(text)
  if (v === undefined) return 'Nieprawidłowa kwota – zostaje poprzednia (wpisz np. 1200, 1 200 albo 12,50; najwyżej 2 miejsca po przecinku).'
  if (v === null) return 'Kwota nie może być pusta – zostaje poprzednia.'
  return 'Kwota nie może być ujemna – zostaje poprzednia.'
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
    disabled?: boolean
    'aria-label'?: string
    'data-testid'?: string
  }
>(function AmountField({ value, onChange, allowNegative, allowEmpty, placeholder, className, autoFocus, disabled, ...rest }, ref) {
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
      disabled={disabled}
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
          if (v === undefined) toast(amountRefusal(draft), 'error')
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


/**
 * What a typed date means: the day, `null` for an empty text when the field may be empty (`allowEmpty` – an open end of
 * a period), `undefined` when it cannot be read (the field goes back to the saved value with a message).
 */
export function readDateDraft(text: string, o: { year: number; notAfter?: string; near: string | null; allowEmpty?: boolean }): string | null | undefined {
  if (!text.trim()) return o.allowEmpty ? null : undefined
  return parseDateInput(text, o.year, o.notAfter, o.near ?? undefined) ?? undefined
}

type DateFieldProps = {
  className?: string
  notAfter?: string
  placeholder?: string
  'aria-label'?: string
  'data-testid'?: string
} & ({ allowEmpty?: false; value: string; onChange: (date: string) => void } | { allowEmpty: true; value: string | null; onChange: (date: string | null) => void })

/**
 * A date shown as 16.10.2026; typed as 16.10, 16.10.2026 or 2026-10-16. `notAfter` (an operation's date – B12): typed
 * without a year, the day nearest to the field's date, never more than a week after `notAfter` – 28.12 typed on
 * 3 January is the December gone by, 02.01 typed on an operation of 30.12 the January after. `allowEmpty`: the value may
 * be `null` (an open end of a period) and an emptied field saves it.
 */
export function DateField(props: DateFieldProps) {
  const { value, className, notAfter, placeholder, allowEmpty, ...rest } = props
  const [draft, setDraft] = useState<string | null>(null)
  // Escape: the blur it causes runs with this render's draft – it must not save it.
  const cancelled = useRef(false)
  const year = Number(value?.slice(0, 4)) || new Date().getFullYear()
  const parse = (text: string) => readDateDraft(text, { year, notAfter, near: value, allowEmpty })
  const invalid = draft != null && parse(draft) === undefined
  return (
    <input
      className={cx('input num', className)}
      spellCheck={false}
      placeholder={placeholder}
      value={draft ?? (value ? plDate(value) : '')}
      aria-invalid={invalid}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => {
        if (draft != null && !cancelled.current) {
          const d = parse(draft)
          if (d === undefined) toast('Nieprawidłowa data – zostaje poprzednia.', 'error')
          else if (d !== value) (props.onChange as (date: string | null) => void)(d)
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

/** A month as the field shows it at rest: „listopad 2026”; none – empty. */
export const monthFieldText = (value: string | null): string => (value ? monthLabel(value) : '')

/**
 * What the month field's draft means. `start` is the plain text the focus put in (the value of that moment): a draft equal
 * to it is no edit – nothing is saved, Esc is not the field's, and a value changed under the field in the meantime
 * („Cofnij”, a reload) stays what the field shows. An edit: the month (`null` – emptied) or `invalid` when it cannot be read.
 */
export function readMonthDraft(draft: string | null, start: string, allowEmpty?: boolean): { edited: false } | { edited: true; month: string | null; invalid: boolean } {
  if (draft == null || draft === start) return { edited: false }
  const month = parseMonthInput(draft)
  return { edited: true, month: month ?? null, invalid: month === undefined || (month === null && !allowEmpty) }
}

/**
 * The value changed under a focused field nothing was typed into: the new start of the draft (the plain new value), so that
 * typing the old value back is an edit; `null` – nothing to move (no focus, something typed, the value the same).
 */
export function monthStartMoved(draft: string | null, start: string, value: string | null): string | null {
  const now = value ?? ''
  return draft != null && draft === start && now !== start ? now : null
}

/**
 * A month shown in words („listopad 2026”); typed as RRRR-MM, 03.2027 or 3/2027 – the focus brings the plain RRRR-MM to
 * edit. Empty = none when `allowEmpty`. Saved on leaving the field or Enter (B1): a month half typed never saves, one that
 * cannot be read goes back to the saved one with a message.
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
  // The plain text of the value when the focus came – what an untouched draft equals.
  const start = useRef('')
  // Escape: the blur it causes runs with this render's draft – it must not save it.
  const cancelled = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const read = readMonthDraft(draft, start.current, allowEmpty)
  const invalid = read.edited && read.invalid
  // The value changed under the field (a „Cofnij”, a reload) while nothing was typed: the draft follows it, selected anew
  // (typing replaces it) – what is typed afterwards, the old value included, is an edit.
  useEffect(() => {
    const moved = monthStartMoved(draft, start.current, value)
    if (moved == null) return
    start.current = moved
    setDraft(moved)
    const el = input.current
    requestAnimationFrame(() => {
      if (el && document.activeElement === el) el.select()
    })
    // `draft` is read as of this render: only a change of the value matters here.
  }, [value])
  return (
    <input
      ref={input}
      className={cx('input num', className)}
      spellCheck={false}
      // Focused and untouched: the plain value as it is now (it may have changed under the field).
      value={read.edited ? draft! : draft != null ? (value ?? '') : monthFieldText(value)}
      placeholder={placeholder}
      aria-invalid={invalid}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
      onFocus={(e) => {
        // The plain month to edit (typing replaces it – it is selected, as AmountField does it); only while the field
        // still has the focus, `select()` would pull it back otherwise.
        start.current = value ?? ''
        setDraft(start.current)
        const el = e.currentTarget
        requestAnimationFrame(() => {
          if (document.activeElement === el) el.select()
        })
      }}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => {
        if (read.edited && !cancelled.current) {
          if (read.invalid) toast(`Nieprawidłowy miesiąc – zostaje ${value ? 'poprzedni' : 'pusty'} (wpisz RRRR-MM${allowEmpty ? ' albo zostaw puste' : ''}).`, 'error')
          else if (read.month !== value) onChange(read.month)
        }
        cancelled.current = false
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        // Only a real edit is taken back by Esc; otherwise it is not the field's (the window, a dialog hears it).
        if (e.key === 'Escape' && read.edited) {
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
