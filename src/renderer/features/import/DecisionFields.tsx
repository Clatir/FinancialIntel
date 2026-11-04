/**
 * What a theme, a group of the import or a rule (F22) is: the kind (with the household's per member – D80, a shared
 * purchase – D83, a loan of the Radar – B34) and the category.
 */
import { useMemo } from 'react'
import { balanceOf, memberName } from '@shared/calc/household'
import type { LoanChoice } from '@shared/calc/loans'
import { startShare } from '@shared/calc/share'
import { dm } from '@shared/format'
import { loanKey, type Choice, type NewRow, type SharePart } from '@shared/import/reconcile'
import { HOUSE_MEMBER_ID, inflowOf, SHARE_MODES, type HouseholdMember, type Share } from '@shared/schema'
import { useRecordList } from '../../store/records'
import { useFleet, useHousehold } from '../../store/fleet'
import { loanToName, useLoanChoices } from '../radar/loanChoices'
import { AmountField, plnText } from '../../components/fields'
import { IconClose, IconPlus } from '../../components/icons'
import { CategorySelect, useAccounts } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { ShareEditor } from '../household/ShareEditor'
import { linesInBrands, listChoice, optionOf, optionsFor, rowSharesChoice, skipsDebtText, type Option } from './options'
import { chooseRow, decisionStart, lineSpreads, owedLeftOfDecision, owedLeftOfRow, rowStart, sharesView, useImport, type DecisionKeys, type LineSpread, type LoanStates, type SharesView } from './state'

/** A shared purchase's split for the import (D83): equally or by percents – each row has its own amount. */
export const IMPORT_SHARE_MODES = SHARE_MODES.filter((m) => m !== 'amounts')

/**
 * The note at a group's „w tym za” line (AF-27): where its amount went, and why less than typed (none – 0 zł typed); of a
 * loan's part (D100) – its debt said so; a rule's loan part of each inflow (T358) – said so.
 */
function spreadText(s: LineSpread, name: string, loan = false): string | null {
  if (s.typed <= 0) return null
  const total = s.given.reduce((a, g) => a + g.amount, 0)
  const where = s.given.map((g) => `${dm(g.date)} ${plnText(g.amount)} zł`).join(', ')
  const each = s.each != null ? `z każdej wpłaty ${plnText(s.each)} zł` : null
  if (!s.given.length) return s.capped ? (loan ? 'pożyczka spłacona – bez części' : `${name} nie ma nic do oddania – bez części`) : 'bez części – brak pieniędzy we wpłatach'
  if (total >= s.typed) return each ? `${each}: ${where}` : s.given.length > 1 ? `po kolei: ${where}` : `z wpłaty ${where}`
  return `${each ? `${each} – ` : ''}${plnText(total)} z ${plnText(s.typed)} zł (${s.capped ? (loan ? 'tyle zostało do spłaty' : `tyle ${name} ma oddać`) : 'tyle zostało we wpłatach'}): ${where}`
}

/**
 * A line changed by the user: a rule's loan part of each inflow (`each`, T358) becomes the decision's own – of a group or a
 * theme together for its rows (T328).
 */
export const changedLine = (x: SharePart, p: Partial<SharePart>): SharePart => {
  const { each: _each, ...line } = x
  return { ...line, ...p }
}

/**
 * Other household members' parts of an incoming transfer („w tym za…”, N-PC-10, D81): e.g. one transfer from Mama
 * carrying a repayment for Tata too – and the parts repaying a loan given of any inflow (D100, T357 – „w tym spłata
 * pożyczki”, a member's money or plain income). A new line starts at `startOf` (D81 – what the member owes back, a
 * loan's debt; none – 0 zł), `owedOf` says it at the button; `spreadOf` – a group's or a theme's line spread over its
 * rows (AF-27). Whose: a member's id, a loan's key (`loanKey`).
 */
export function IncomeSharesEditor({
  choice,
  members,
  loans = [],
  onChange,
  testId,
  startOf,
  owedOf,
  spreadOf,
  maxLoans = Infinity
}: {
  choice: Choice
  members: readonly HouseholdMember[]
  /** The loans given its parts may repay (D100, `useLoanChoices`). */
  loans?: readonly LoanChoice[]
  /** At most this many loans' parts (a rule keeps one – T358). */
  maxLoans?: number
  onChange: (c: Choice) => void
  testId: string
  startOf?: (who: string, lines: readonly SharePart[]) => number
  owedOf?: (who: string) => number
  spreadOf?: (line: number) => LineSpread | null
}) {
  const shares = choice.shares ?? []
  // Other members' parts of a member's money only (D81); a loan's of any income (D100).
  const others = choice.household ? members.filter((m) => (!m.archived || shares.some((s) => s.memberId === m.id)) && m.id !== choice.memberId) : []
  const openLoans = loans.filter((l) => !l.closed)
  if (!others.length && !openLoans.length && !shares.some((s) => s.loanId)) return null
  const setShares = (next: readonly SharePart[]) => onChange({ ...choice, shares: next.length ? next : undefined })
  const unused = others.filter((m) => !shares.some((s) => !s.loanId && s.memberId === m.id))
  const viaMembers = unused.filter((m) => m.via === choice.memberId)
  const addLine = (m: HouseholdMember) => setShares([...shares, { memberId: m.id, amount: startOf?.(m.id, shares) ?? 0, advance: inflowOf(m) === 'advance' }])
  // A loan's part (D100): the first open loan not named yet, at what it still owes – at most what the money has left; never
  // a second line of one loan (przegląd N2 2.11).
  const toName = loanToName(loans, shares)
  const addLoan = () => {
    if (toName) setShares([...shares, { memberId: '', amount: startOf?.(loanKey(toName.id), shares) ?? 0, advance: false, loanId: toName.id }])
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]" data-testid={`${testId}-also-for`}>
      {shares.map((s, i) =>
        s.loanId ? (
          <span key={`loan:${s.loanId}:${i}`} className="flex flex-wrap items-center gap-1" data-testid={`${testId}-loan-part`}>
            <span className="text-muted">w tym spłata pożyczki</span>
            <select
              className="input h-[22px] w-[150px] py-0 text-[11px]"
              value={s.loanId}
              onChange={(e) => {
                const loanId = e.currentTarget.value
                setShares(shares.map((x, j) => (j === i ? changedLine(x, { loanId }) : x)))
              }}
              aria-label="Spłata której pożyczki"
              data-testid={`${testId}-loan-part-loan`}
            >
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              {!loans.some((l) => l.id === s.loanId) && <option value={s.loanId}>pożyczka spoza Radaru</option>}
            </select>
            <AmountField
              className="h-[22px] w-[88px] text-[11px]"
              value={s.amount || null}
              allowEmpty
              onChange={(v) => setShares(shares.map((x, j) => (j === i ? changedLine(x, { amount: Math.max(0, v ?? 0) }) : x)))}
              aria-label="Kwota spłaty pożyczki"
              data-testid={`${testId}-loan-part-amount`}
            />
            <button type="button" className="btn btn-ghost h-[20px] px-1" title="Usuń część" onClick={() => setShares(shares.filter((_, j) => j !== i))} data-testid={`${testId}-loan-part-remove`}>
              <IconClose size={11} />
            </button>
            {(() => {
              // A group's or a theme's part: spread over its rows in their order, never beyond the loan's debt (T357) – a
              // rule's of each inflow (T358) said so.
              const spread = spreadOf?.(i)
              const text = spread ? spreadText(spread, '', true) : null
              const loan = loans.find((l) => l.id === s.loanId)
              return (
                <span className="text-dim" data-testid={`${testId}-loan-part-note`}>
                  {text ?? (loan ? (loan.closed ? 'pożyczka zamknięta' : `${s.each && spreadOf ? 'z każdej wpłaty · ' : ''}zostało ${plnText(loan.open)} zł`) : '')}
                </span>
              )
            })()}
          </span>
        ) : !others.length ? null : (
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
        )
      )}
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
      {toName && shares.filter((s) => s.loanId).length < maxLoans && (
        <button
          type="button"
          className="flex items-center gap-0.5 text-muted hover:text-fg-strong hover:underline"
          onClick={addLoan}
          title="Część tej wpłaty spłaca pożyczkę udzieloną z Radaru – także gdy płaci ktoś inny niż pożyczkobiorca"
          data-testid={`${testId}-loan-part-add`}
        >
          <IconPlus size={10} /> w tym spłata pożyczki
        </button>
      )}
    </div>
  )
}

/** The spread of the open file read by a decision's key (`g:` / `t:`) or a row's: what changes the screen, as one text. */
function useSharesKey(read: (view: SharesView) => unknown): string {
  const members = useMembers()
  const ledger = useHousehold()
  const loans = useFleet()?.loans
  return useImport((s) => {
    const view = sharesView(s.plan, s.choices, ledger, members, loans)
    return view ? JSON.stringify(read(view)) : ''
  })
}

/** The spread now, at a click (where a new line starts). */
function sharesNow(ledger: ReturnType<typeof useHousehold>, members: readonly HouseholdMember[], loans: LoanStates): SharesView | null {
  const s = useImport.getState()
  return sharesView(s.plan, s.choices, ledger, members, loans)
}

/** The keys a decision's parts may be of (D81, D100): the members' ids and the loans' keys. */
const whoKeys = (members: readonly HouseholdMember[], loans: readonly LoanChoice[]): string[] => [...members.map((m) => m.id), ...loans.map((l) => loanKey(l.id))]

/**
 * „w tym za” of a group's or a theme's decision in the import (`from` – `g:<group>`, `t:<theme>`, a theme's groups' when
 * it shows their common decision without lines of an amount; AF-27): a new line starts at what the member owes back
 * (D81), each line of one decision says how it is spread over the rows – never beyond the debt (`lineSpreads`).
 */
function DecisionShares({ from, choice, members, onChange, testId }: { from: DecisionKeys; choice: Choice; members: readonly HouseholdMember[]; onChange: (c: Choice) => void; testId: string }) {
  const ledger = useHousehold()
  const states = useFleet()?.loans
  const loans = useLoanChoices((choice.shares ?? []).flatMap((x) => (x.loanId ? [x.loanId] : [])))
  const key = useSharesKey((v) => ({
    owed: Object.fromEntries(whoKeys(members, loans).map((id) => [id, owedLeftOfDecision(v, from, id)])),
    // Several groups' keys: their lines – of members and of loans alike (D100) – of 0 zł only, spread nothing (with an
    // amount – each brand's, T336).
    spread: typeof from === 'string' ? lineSpreads(v, from) : {}
  }))
  const view = useMemo(() => (key ? (JSON.parse(key) as { owed: Record<string, number>; spread: Record<number, LineSpread> }) : null), [key])
  return (
    <IncomeSharesEditor
      choice={choice}
      members={members}
      loans={loans}
      onChange={onChange}
      testId={testId}
      startOf={(who, lines) => {
        const v = sharesNow(ledger, members, states)
        return v ? decisionStart(v, from, who, lines) : 0
      }}
      owedOf={(id) => view?.owed[id] ?? 0}
      spreadOf={(line) => view?.spread[line] ?? null}
    />
  )
}

/**
 * „w tym za” of one row of the import (AF-27): without its own decision it shows its part of the group's spread; a change
 * makes the row's own decision, which stays while typed (never „the same as the group's” for a line of 0 zł); „jak
 * grupa” takes it back. A new line starts at what the member owes back beyond the other rows (D81) – a loan's part at
 * what the loan owes (D100).
 */
export function RowShares({ p, choice, mine }: { p: NewRow; choice: Choice; mine: Choice | undefined }) {
  const members = useMembers()
  const ledger = useHousehold()
  const states = useFleet()?.loans
  const loans = useLoanChoices([...(choice.shares ?? []), ...(mine?.shares ?? [])].flatMap((x) => (x.loanId ? [x.loanId] : [])))
  // What the members owe – said at „+ w tym za X” of a member's money only (przegląd N2 2.13).
  const owing = (mine ?? choice).household ? members : NO_MEMBERS
  const key = useSharesKey((v) => ({ parts: v.parts.get(p.key) ?? [], owed: Object.fromEntries(owing.map((m) => [m.id, owedLeftOfRow(v, p.key, p.row.amount, m.id)])) }))
  const view = useMemo(() => (key ? (JSON.parse(key) as { parts: SharePart[]; owed: Record<string, number> }) : null), [key])
  const shown: Choice = mine ?? { ...choice, shares: view?.parts.length ? view.parts : undefined }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      <IncomeSharesEditor
        choice={shown}
        members={members}
        loans={loans}
        onChange={(next) => chooseRow(p.key, rowSharesChoice(next, choice, shown, !!mine))}
        testId="import-row"
        startOf={(who, lines) => {
          const v = sharesNow(ledger, members, states)
          return v ? rowStart(v, p.key, p.row.amount, who, lines) : 0
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

const NO_MEMBERS: readonly HouseholdMember[] = []

/**
 * What an income row of the import shows of its parts (D81, D100; przegląd N2 2.13): its lines – a member's money among
 * more members, a decision with lines (`RowShares`: the file's spread read on every change of the screen); while a loan
 * given is open, only „+ w tym spłata pożyczki” (`RowLoanPart`: the spread read at the click – hundreds of salary rows
 * read nothing); or nothing.
 */
export function rowPartsOf(c: Pick<Choice, 'kind' | 'household' | 'shares'>, amount: number, members: number, loanOpen: boolean): 'lines' | 'add' | null {
  if (c.kind !== 'income' || amount <= 0) return null
  if ((c.household && members > 1) || !!c.shares?.length) return 'lines'
  return loanOpen ? 'add' : null
}

/** A row of money in without lines (`rowPartsOf` 'add'): „+ w tym spłata pożyczki” – a line of the row's own decision, as `RowShares` makes it. */
export function RowLoanPart({ p, choice, mine }: { p: NewRow; choice: Choice; mine: Choice | undefined }) {
  const members = useMembers()
  const ledger = useHousehold()
  const states = useFleet()?.loans
  const loans = useLoanChoices()
  const shown = mine ?? choice
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      <IncomeSharesEditor
        choice={shown}
        members={members}
        loans={loans}
        onChange={(next) => chooseRow(p.key, rowSharesChoice(next, choice, shown, !!mine))}
        testId="import-row"
        startOf={(who, lines) => {
          const v = sharesNow(ledger, members, states)
          return v ? rowStart(v, p.key, p.row.amount, who, lines) : 0
        }}
      />
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

/** A theme's row of brands with lines of an amount (`themeShows` 'brands', T336): their lines said – edited at each brand. */
function BrandsShares({ choice, testId }: { choice: Choice; testId: string }) {
  const { text, title } = linesInBrands(choice.shares)
  return (
    <span className="text-[11px] text-muted" title={title} data-testid={`${testId}-also-for-brands`}>
      {text}
    </span>
  )
}

export function DecisionFields({
  choice,
  direction,
  onChange,
  testId,
  exclude,
  own,
  sharesFrom,
  sharesInBrands
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
  /** Its „w tym za” are its brands' own (a theme showing their common decision – `themeShows` 'brands', T336): said, not edited. */
  sharesInBrands?: boolean
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
        onChange={(e) => onChange(listChoice(e.currentTarget.value as Option, choice, first ? startShare(first.id) : null))}
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
        // Other members' parts of a member's money (D81), a loan's part of any income (D100) – while a loan is open.
        ((choice.household && members.length > 1) || loans.some((l) => l.direction === 'given' && !l.closedAt) || !!choice.shares?.some((x) => x.loanId)) &&
        (sharesInBrands ? (
          <BrandsShares choice={choice} testId={testId} />
        ) : sharesFrom ? (
          <DecisionShares from={sharesFrom} choice={choice} members={members} onChange={onChange} testId={testId} />
        ) : (
          <RuleShares choice={choice} onChange={onChange} testId={testId} />
        ))}
    </>
  )
}

/**
 * A rule's part repaying a loan (D100, T358 – the rule's editor): one loan of the Radar and the amount of each inflow;
 * other members' parts a rule does not keep – not offered.
 */
function RuleShares({ choice, onChange, testId }: { choice: Choice; onChange: (c: Choice) => void; testId: string }) {
  const loans = useLoanChoices((choice.shares ?? []).flatMap((x) => (x.loanId ? [x.loanId] : [])))
  const lines = (choice.shares ?? []).filter((x) => x.loanId)
  return <IncomeSharesEditor choice={{ ...choice, shares: lines.length ? lines.slice(0, 1) : undefined }} members={[]} loans={lines.length ? loans.filter((l) => l.id === lines[0]!.loanId || !l.closed) : loans} onChange={onChange} testId={testId} maxLoans={1} />
}
