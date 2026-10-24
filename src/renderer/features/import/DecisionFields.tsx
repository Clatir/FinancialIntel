/**
 * What a theme, a group of the import or a rule (F22) is: the kind (with the household's per member – D80, a shared
 * purchase – D83, a loan of the Radar – B34) and the category.
 */
import { startShare } from '@shared/calc/share'
import type { Choice } from '@shared/import/reconcile'
import { inflowOf, SHARE_MODES, type HouseholdMember, type Share } from '@shared/schema'
import { useRecordList } from '../../store/records'
import { AmountField } from '../../components/fields'
import { IconClose, IconPlus } from '../../components/icons'
import { CategorySelect, useAccounts } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { ShareEditor } from '../household/ShareEditor'
import { Segmented } from '../../components/ui'
import { choiceFor, optionOf, optionsFor, type Option } from './options'

/** A shared purchase's split for the import (D83): equally or by percents – each row has its own amount. */
export const IMPORT_SHARE_MODES = SHARE_MODES.filter((m) => m !== 'amounts')

/**
 * Other household members' parts of an incoming transfer („w tym za…”, N-PC-10, D81): e.g. one transfer from Mama
 * carrying a repayment for Tata too.
 */
export function IncomeSharesEditor({
  choice,
  members,
  onChange,
  testId
}: {
  choice: Choice
  members: readonly HouseholdMember[]
  onChange: (c: Choice) => void
  testId: string
}) {
  const shares = choice.shares ?? []
  const others = members.filter((m) => (!m.archived || shares.some((s) => s.memberId === m.id)) && m.id !== choice.memberId)
  if (!others.length) return null
  const setShares = (next: ReadonlyArray<{ memberId: string; amount: number; advance: boolean }>) =>
    onChange({ ...choice, shares: next.length ? next : undefined })
  const unused = others.filter((m) => !shares.some((s) => s.memberId === m.id))
  const viaMembers = unused.filter((m) => m.via === choice.memberId)
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]" data-testid={`${testId}-also-for`}>
      {shares.map((s, i) => (
        <span key={`${s.memberId}:${i}`} className="flex items-center gap-1" data-testid={`${testId}-also-for-line`}>
          <span className="text-muted">w tym za</span>
          <select
            className="input h-[22px] w-[110px] py-0 text-[11px]"
            value={s.memberId}
            onChange={(e) => {
              const m = others.find((x) => x.id === e.currentTarget.value)
              if (m) setShares(shares.map((x, j) => (j === i ? { ...x, memberId: m.id, advance: inflowOf(m) === 'advance' } : x)))
            }}
            aria-label="W tym za kogo"
            data-testid={`${testId}-also-for-member`}
          >
            {others.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <AmountField
            className="h-[22px] w-[88px] text-[11px]"
            value={s.amount || null}
            allowEmpty
            onChange={(v) => setShares(shares.map((x, j) => (j === i ? { ...x, amount: Math.max(0, v ?? 0) } : x)))}
            aria-label="Kwota w tym za"
            data-testid={`${testId}-also-for-amount`}
          />
          <button
            type="button"
            className="btn btn-ghost h-[20px] px-1"
            title="Usuń część"
            onClick={() => setShares(shares.filter((_, j) => j !== i))}
            data-testid={`${testId}-also-for-remove`}
          >
            <IconClose size={11} />
          </button>
        </span>
      ))}
      {viaMembers.map((m) => (
        <button
          key={m.id}
          type="button"
          className="text-accent hover:underline"
          onClick={() => setShares([...shares, { memberId: m.id, amount: 0, advance: inflowOf(m) === 'advance' }])}
          data-testid={`${testId}-also-for-via`}
        >
          + w tym za {m.name}
        </button>
      ))}
      {unused.length > 0 && viaMembers.length === 0 && (
        <button
          type="button"
          className="flex items-center gap-0.5 text-muted hover:text-fg-strong hover:underline"
          onClick={() => {
            const m = unused[0]!
            setShares([...shares, { memberId: m.id, amount: 0, advance: inflowOf(m) === 'advance' }])
          }}
          data-testid={`${testId}-also-for-add`}
        >
          <IconPlus size={10} /> w tym za…
        </button>
      )}
    </div>
  )
}

export function DecisionFields({
  choice,
  direction,
  onChange,
  testId,
  exclude,
  own
}: {
  choice: Choice
  direction: 'in' | 'out'
  onChange: (c: Choice) => void
  testId: string
  /** Options not offered (a rule: no kind decided operation by operation – N14). */
  exclude?: (o: Option) => boolean
  /** The file's account: an own transfer goes to / comes from the others (F10). */
  own?: string
}) {
  const members = useMembers()
  const loans = useRecordList('loans')
  const accounts = useAccounts()
  const option = optionOf(choice, direction)
  const first = members.find((m) => !m.archived)
  const otherAccounts = accounts.filter((a) => a.id !== own && (!a.archived || a.id === choice.counterAccountId))
  return (
    <>
      <select
        className="input h-[24px] w-[230px] py-0"
        value={option}
        onChange={(e) => onChange(choiceFor(e.currentTarget.value as Option, choice, first ? startShare(first.id) : null))}
        aria-label="Co to jest"
        data-testid={`${testId}-kind`}
      >
        {optionsFor(direction, members, choice, loans, accounts, own)
          .filter((o) => o.value === option || !exclude?.(o.value))
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
      {direction === 'in' && choice.kind === 'income' && choice.household && (
        <Segmented
          size="sm"
          value={choice.inflowKind ?? (choice.advance ? 'advance' : 'repay')}
          onChange={(inflowKind) => onChange({ ...choice, inflowKind, advance: inflowKind === 'advance' })}
          options={[
            { value: 'repay', label: 'spłata' },
            { value: 'income', label: 'niezależny przychód' },
            { value: 'advance', label: 'zaliczka' }
          ]}
          aria-label="Cel wpłaty domownika"
          data-testid={`${testId}-inflow-kind`}
        />
      )}
      {choice.kind === 'transfer' && otherAccounts.length > 0 && (
        <select
          className="input h-[24px] w-[195px] py-0 text-[11.5px]"
          value={choice.counterAccountId ?? ''}
          onChange={(e) => onChange({ ...choice, counterAccountId: e.currentTarget.value || null })}
          aria-label={direction === 'out' ? 'Na konto' : 'Z konta'}
          title="Wybierz drugie konto w budżecie, aby przelew od razu był dwustronny i nie ruszał osłon"
          data-testid={`${testId}-counter-account`}
        >
          <option value="">— konto spoza budżetu —</option>
          {otherAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {direction === 'out' ? '→' : '←'} {a.name} (dwustronny)
            </option>
          ))}
        </select>
      )}
      {choice.kind === 'expense' && (
        <CategorySelect className="h-[24px] min-w-[180px] flex-1 py-0" value={choice.categoryId} onChange={(categoryId) => onChange({ ...choice, categoryId })} data-testid={`${testId}-category`} />
      )}
      {choice.kind === 'expense' && choice.share && (
        <div className="basis-full pl-1">
          <ShareEditor share={choice.share} total={null} members={members} onChange={(share: Share) => onChange({ ...choice, share })} modes={IMPORT_SHARE_MODES} testId={`${testId}-share`} />
        </div>
      )}
      {direction === 'in' && choice.kind === 'income' && choice.household && members.length > 1 && (
        <IncomeSharesEditor choice={choice} members={members} onChange={onChange} testId={testId} />
      )}
    </>
  )
}
