/**
 * What a theme, a group of the import or a rule (F22) is: the kind (with the household's per member – D80, a shared
 * purchase – D83, a loan of the Radar – B34) and the category.
 */
import { useMemo } from 'react'
import { balanceOf, memberName } from '@shared/calc/household'
import { startShare } from '@shared/calc/share'
import { dm } from '@shared/format'
import type { Choice, NewRow, SharePart } from '@shared/import/reconcile'
import { HOUSE_MEMBER_ID, inflowOf, SHARE_MODES, type HouseholdMember, type Share } from '@shared/schema'
import { useRecordList } from '../../store/records'
import { useHousehold } from '../../store/fleet'
import { AmountField, plnText } from '../../components/fields'
import { IconClose, IconPlus } from '../../components/icons'
import { CategorySelect, useAccounts } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { ShareEditor } from '../household/ShareEditor'
import { choiceFor, optionOf, optionsFor, rowSharesChoice, skipsDebtText, type Option } from './options'
import { chooseRow, decisionSpread, decisionStart, owedLeftOfDecision, owedLeftOfRow, rowStart, sharesView, useImport, type DecisionKeys, type SharesView } from './state'

/** A shared purchase's split for the import (D83): equally or by percents – each row has its own amount. */
export const IMPORT_SHARE_MODES = SHARE_MODES.filter((m) => m !== 'amounts')

/** A line's spread over the rows of a group or a theme (AF-27): typed, given row by row, cut at what the member owes. */
export interface LineSpread {
  typed: number
  given: Array<{ date: string; amount: number }>
  /** Less than typed because the member owes no more (else: the rows' money ran out). */
  capped: boolean
}

/** The note at a group's „w tym za” line (AF-27): where its amount went, and why less than typed (none – 0 zł typed). */
function spreadText(s: LineSpread, name: string): string | null {
  if (s.typed <= 0) return null
  const total = s.given.reduce((a, g) => a + g.amount, 0)
  const where = s.given.map((g) => `${dm(g.date)} ${plnText(g.amount)} zł`).join(', ')
  if (!s.given.length) return s.capped ? `${name} nie ma nic do oddania – bez części` : 'bez części – brak pieniędzy we wpłatach'
  if (total >= s.typed) return s.given.length > 1 ? `po kolei: ${where}` : `z wpłaty ${where}`
  return `${plnText(total)} z ${plnText(s.typed)} zł (${s.capped ? `tyle ${name} ma oddać` : 'tyle zostało we wpłatach'}): ${where}`
}

/**
 * Other household members' parts of an incoming transfer („w tym za…”, N-PC-10, D81): e.g. one transfer from Mama
 * carrying a repayment for Tata too. A new line starts at `startOf` (D81 – what the member owes back; none – 0 zł),
 * `owedOf` says it at the button; `spreadOf` – a group's or a theme's line spread over its rows (AF-27).
 */
export function IncomeSharesEditor({
  choice,
  members,
  onChange,
  testId,
  startOf,
  owedOf,
  spreadOf
}: {
  choice: Choice
  members: readonly HouseholdMember[]
  onChange: (c: Choice) => void
  testId: string
  startOf?: (memberId: string, lines: readonly SharePart[]) => number
  owedOf?: (memberId: string) => number
  spreadOf?: (line: number) => LineSpread | null
}) {
  const shares = choice.shares ?? []
  const others = members.filter((m) => (!m.archived || shares.some((s) => s.memberId === m.id)) && m.id !== choice.memberId)
  if (!others.length) return null
  const setShares = (next: ReadonlyArray<{ memberId: string; amount: number; advance: boolean }>) =>
    onChange({ ...choice, shares: next.length ? next : undefined })
  const unused = others.filter((m) => !shares.some((s) => s.memberId === m.id))
  const viaMembers = unused.filter((m) => m.via === choice.memberId)
  const addLine = (m: HouseholdMember) => setShares([...shares, { memberId: m.id, amount: startOf?.(m.id, shares) ?? 0, advance: inflowOf(m) === 'advance' }])
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]" data-testid={`${testId}-also-for`}>
      {shares.map((s, i) => (
        <span key={`${s.memberId}:${i}`} className="flex flex-wrap items-center gap-1" data-testid={`${testId}-also-for-line`}>
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
          {(() => {
            // A group's or a theme's line (AF-27): spread over its rows in their order, never beyond what they owe.
            const spread = spreadOf?.(i)
            const text = spread ? spreadText(spread, others.find((m) => m.id === s.memberId)?.name ?? 'domownik') : null
            return text ? (
              <span className="text-dim" data-testid={`${testId}-also-for-spread`}>
                {text}
              </span>
            ) : null
          })()}
        </span>
      ))}
      {viaMembers.map((m) => {
        const owed = owedOf?.(m.id) ?? 0
        return (
          <button key={m.id} type="button" className="text-accent hover:underline" onClick={() => addLine(m)} data-testid={`${testId}-also-for-via`}>
            + w tym za {m.name}
            {owed > 0 ? ` (ma oddać ${plnText(owed)} zł)` : ''}
          </button>
        )
      })}
      {unused.length > 0 && viaMembers.length === 0 && (
        <button
          type="button"
          className="flex items-center gap-0.5 text-muted hover:text-fg-strong hover:underline"
          onClick={() => addLine(unused[0]!)}
          data-testid={`${testId}-also-for-add`}
        >
          <IconPlus size={10} /> w tym za…
        </button>
      )}
    </div>
  )
}

/** The spread of the open file read by a decision's key (`g:` / `t:`) or a row's: what changes the screen, as one text. */
function useSharesKey(read: (view: SharesView) => unknown): string {
  const members = useMembers()
  const ledger = useHousehold()
  return useImport((s) => {
    const view = sharesView(s.plan, s.choices, ledger, members)
    return view ? JSON.stringify(read(view)) : ''
  })
}

/** The spread now, at a click (where a new line starts). */
function sharesNow(ledger: ReturnType<typeof useHousehold>, members: readonly HouseholdMember[]): SharesView | null {
  const s = useImport.getState()
  return sharesView(s.plan, s.choices, ledger, members)
}

/**
 * „w tym za” of a group's or a theme's decision in the import (`from` – `g:<group>`, `t:<theme>`, a theme's groups' when
 * it shows their common decision; AF-27): a new line starts at what the member owes back (D81), each line says how it is
 * spread over the rows – never beyond the debt.
 */
function DecisionShares({ from, choice, members, onChange, testId }: { from: DecisionKeys; choice: Choice; members: readonly HouseholdMember[]; onChange: (c: Choice) => void; testId: string }) {
  const ledger = useHousehold()
  const key = useSharesKey((v) => ({
    owed: Object.fromEntries(members.map((m) => [m.id, owedLeftOfDecision(v, from, m.id)])),
    spread: Object.fromEntries(
      [...decisionSpread(v, from, choice)].map(([line, l]) => {
        const total = l.given.reduce((a, g) => a + g.amount, 0)
        return [line, { typed: l.typed, given: l.given.map((g) => ({ date: g.date, amount: g.amount })), capped: total < l.typed && (v.total.get(l.memberId) ?? 0) >= (v.owed.get(l.memberId) ?? 0) }]
      })
    )
  }))
  const view = useMemo(() => (key ? (JSON.parse(key) as { owed: Record<string, number>; spread: Record<string, LineSpread> }) : null), [key])
  return (
    <IncomeSharesEditor
      choice={choice}
      members={members}
      onChange={onChange}
      testId={testId}
      startOf={(memberId, lines) => {
        const v = sharesNow(ledger, members)
        return v ? decisionStart(v, from, memberId, lines) : 0
      }}
      owedOf={(id) => view?.owed[id] ?? 0}
      spreadOf={(line) => view?.spread[line] ?? null}
    />
  )
}

/**
 * „w tym za” of one row of the import (AF-27): without its own decision it shows its part of the group's spread; a change
 * makes the row's own decision, which stays while typed (never „the same as the group's” for a line of 0 zł); „jak
 * grupa” takes it back. A new line starts at what the member owes back beyond the other rows (D81).
 */
export function RowShares({ p, choice, mine }: { p: NewRow; choice: Choice; mine: Choice | undefined }) {
  const members = useMembers()
  const ledger = useHousehold()
  const key = useSharesKey((v) => ({ parts: v.parts.get(p.key) ?? [], owed: Object.fromEntries(members.map((m) => [m.id, owedLeftOfRow(v, p.key, p.row.amount, m.id)])) }))
  const view = useMemo(() => (key ? (JSON.parse(key) as { parts: SharePart[]; owed: Record<string, number> }) : null), [key])
  const shown: Choice = mine ?? { ...choice, shares: view?.parts.length ? view.parts : undefined }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      <IncomeSharesEditor
        choice={shown}
        members={members}
        onChange={(next) => chooseRow(p.key, rowSharesChoice(next, choice, shown, !!mine))}
        testId="import-row"
        startOf={(memberId, lines) => {
          const v = sharesNow(ledger, members)
          return v ? rowStart(v, p.key, p.row.amount, memberId, lines) : 0
        }}
        owedOf={(id) => view?.owed[id] ?? 0}
      />
      {mine && (
        <button type="button" className="shrink-0 text-[11px] text-muted hover:text-fg-strong hover:underline" onClick={() => chooseRow(p.key, null)} data-testid="import-row-reset">
          jak grupa
        </button>
      )}
    </span>
  )
}

/** A member's money of an explicit kind while they owe (D99 S4 – it may skip the debt): what it leaves unpaid (AP-4). */
function SkipsDebt({ choice, testId }: { choice: Choice; testId: string }) {
  const members = useMembers()
  const ledger = useHousehold()
  const memberId = choice.kind === 'income' && choice.household ? (choice.memberId ?? HOUSE_MEMBER_ID) : null
  const text = memberId && ledger ? skipsDebtText(choice, balanceOf(ledger, memberId).owed, memberName(memberId, members), plnText) : null
  return text ? (
    <span className="text-[11px] text-accent" data-testid={`${testId}-skips-debt`}>
      {text}
    </span>
  ) : null
}

export function DecisionFields({
  choice,
  direction,
  onChange,
  testId,
  exclude,
  own,
  sharesFrom
}: {
  choice: Choice
  direction: 'in' | 'out'
  onChange: (c: Choice) => void
  testId: string
  /** Options not offered (a rule: no kind decided operation by operation – N14). */
  exclude?: (o: Option) => boolean
  /** The file's account: an own transfer goes to / comes from the others (F10). */
  own?: string
  /** The import's decision this is (`g:<group>`, `t:<theme>`, a theme's groups' – AF-27): its „w tym za” spread over its rows. */
  sharesFrom?: DecisionKeys
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
      {/* One name for a member's money – the list's (AP-4, IM sp. 4); an explicit kind skipping their debt says so (D99 S4). */}
      {direction === 'in' && <SkipsDebt choice={choice} testId={testId} />}
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
      {direction === 'in' &&
        choice.kind === 'income' &&
        choice.household &&
        members.length > 1 &&
        (sharesFrom ? (
          <DecisionShares from={sharesFrom} choice={choice} members={members} onChange={onChange} testId={testId} />
        ) : (
          <IncomeSharesEditor choice={choice} members={members} onChange={onChange} testId={testId} />
        ))}
    </>
  )
}
