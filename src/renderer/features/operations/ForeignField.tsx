/**
 * „Kwota w walucie” (1.17.0, AP-48, T493): an operation's amount in the currency it was paid in – information only (a
 * trip), the budget counts its złoty. Folded under the amount („+ kwota w walucie”); open – the amount, the currency
 * (three letters, the common ones offered) and the rate shown (złoty ÷ the amount). The editor's and the quick entry's.
 */
import { useRef, useState, type KeyboardEvent } from 'react'
import { COMMON_CURRENCIES, currencyOf, currencyRefusal, rateText } from '@shared/foreign'
import type { ForeignAmount } from '@shared/schema'
import { AmountField } from '../../components/fields'
import { IconClose } from '../../components/icons'
import { toast } from '../../store/ui'

/** The currencies' list of the field (one per window). */
export function CurrencyList() {
  return (
    <datalist id="fi-currencies">
      {COMMON_CURRENCIES.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  )
}

/**
 * A currency's code typed: applied on leaving the field or Enter (Esc – back), in capitals; a code that is not one – or
 * PLN – refused as an amount is (AP-15: said; in the quick entry's footer, holding its Enter back), the previous one stays.
 */
export function CurrencyField({ value, onChange, disabled, testId }: { value: string; onChange: (code: string) => void; disabled?: boolean; testId: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)
  const commit = () => {
    if (draft != null && !cancelled.current && draft.trim().toUpperCase() !== value) {
      const why = currencyRefusal(draft)
      if (why) toast(why, 'error')
      else onChange(currencyOf(draft)!)
    }
    cancelled.current = false
    setDraft(null)
  }
  return (
    <input
      className="input num w-[64px] uppercase"
      list="fi-currencies"
      maxLength={3}
      spellCheck={false}
      disabled={disabled}
      value={draft ?? value}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape' && draft != null) {
          e.stopPropagation()
          cancelled.current = true
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
      aria-label="Waluta"
      data-testid={testId}
    />
  )
}

/**
 * The operation's amount in a currency: folded – „+ kwota w walucie” (opens with `currency`, the last one used); open –
 * the amount (hundredths, as złoty are typed), the currency, the rate, „×” takes it away. `onChange(null)` – none.
 */
export function ForeignField({
  value,
  pln,
  currency,
  open,
  onOpen,
  onChange,
  disabled,
  testId
}: {
  value: ForeignAmount | null
  /** The operation's złoty (grosze, signed): the rate. */
  pln: number
  /** The currency while no amount is typed yet. */
  currency: string
  /** Opened without an amount yet. */
  open: boolean
  onOpen: (open: boolean, currency?: string) => void
  onChange: (f: ForeignAmount | null) => void
  disabled?: boolean
  testId: string
}) {
  if (!value && !open)
    return (
      // Out of the Tab order (AP-34, AP-20): from the amount to the counterparty in one Tab – a click opens it.
      <button type="button" tabIndex={-1} className="mt-0.5 block text-[11.5px] text-accent hover:underline disabled:opacity-50" disabled={disabled} onClick={() => onOpen(true)} data-testid={`${testId}-open`}>
        + kwota w walucie
      </button>
    )
  const code = value?.currency ?? currency
  return (
    <div className="mt-1 flex flex-col gap-0.5" data-testid={testId}>
      <div className="flex items-center gap-1.5">
        <AmountField
          className="w-[110px]"
          value={value?.amount ?? null}
          allowEmpty
          disabled={disabled}
          onChange={(v) => {
            if (v) return onChange({ amount: v, currency: code })
            // Emptied: no amount, the field stays open with its currency.
            onChange(null)
            onOpen(true, code)
          }}
          aria-label="Kwota w walucie"
          data-testid={`${testId}-amount`}
        />
        <CurrencyField value={code} disabled={disabled} onChange={(c) => (value ? onChange({ ...value, currency: c }) : onOpen(true, c))} testId={`${testId}-currency`} />
        <button
          type="button"
          className="text-dim hover:text-fg disabled:opacity-50"
          disabled={disabled}
          onClick={() => {
            onChange(null)
            onOpen(false)
          }}
          title="Bez kwoty w walucie"
          aria-label="Usuń kwotę w walucie"
          data-testid={`${testId}-remove`}
        >
          <IconClose size={12} />
        </button>
      </div>
      <span className="text-[11px] text-muted" data-testid={`${testId}-rate`}>
        {value ? rateText(pln, value) || 'kurs – po wpisaniu kwoty w złotych' : 'tylko informacja – budżet liczy złote'}
      </span>
      <CurrencyList />
    </div>
  )
}
