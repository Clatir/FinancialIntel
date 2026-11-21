/**
 * „Rozliczenia z domownikami” (1.21.0, UX-82, T547): one block per member with something to settle – the balance both
 * ways in words (`balanceText`, AF-16), since when, the money waiting to be assigned (D91, „Przypisz zwrot” – the
 * repayment's editor), the open purchases (their part, what is left – each opens in Operacje) and „Oddał(a) gotówką…” /
 * „Pokaż w Operacjach”. Hidden with nobody to settle and no people but the default „Dom” (as Mostek's empty panels, D106 (4)).
 */
import { useContext, useState } from 'react'
import { balanceText, memberName, openText } from '@shared/calc/household'
import { daysBetween } from '@shared/calc/dates'
import type { FleetState } from '@shared/calc/fleet'
import { HOUSE_DAYS } from '@shared/calc/loans'
import { HOUSE_MEMBER_ID, type Transaction } from '@shared/schema'
import { useFocusRecord } from '../../components/focus'
import { plnText } from '../../components/fields'
import { CompactContext, Panel, ShowMore, cx } from '../../components/ui'
import { countLabel, plDate } from '../../lib/format'
import { useData } from '../../store/data'
import { useMembers } from '../household/actions'
import { openOperation } from '../operations/state'
import { SETTLEMENTS_ALL, SETTLEMENTS_PANEL, openMemberOperations, repaysInCash, settlementsOf, startRepayment, type MemberSettlement } from './settlements'

const zl = (g: number) => `${plnText(g)} zł`
/** Purchases shown at once per member (long lists by 100 – ui.md). */
const PAGE = 100

export function SettlementsPanel({ fleet, readOnly }: { fleet: FleetState; readOnly: boolean }) {
  const members = useMembers()
  const accounts = useData((s) => s.fi?.settings.accounts)
  // Opened from Mostek or Meldunki: the member's block (or the panel) scrolled to and marked.
  useFocusRecord('settlements')
  const list = settlementsOf(fleet.receivables.members, fleet.household)
  const people = members.some((m) => !m.archived && m.id !== HOUSE_MEMBER_ID)
  if (!list.length && !people) return null
  const cash = !!accounts && repaysInCash(accounts)
  return (
    <Panel title={list.length ? `${SETTLEMENTS_PANEL} (${list.length})` : SETTLEMENTS_PANEL} name={SETTLEMENTS_PANEL} testId="radar-settlements">
      <div className="flex flex-col text-[12px]" data-focus={`settlements:${SETTLEMENTS_ALL}`}>
        {!list.length && <span className="text-muted">Wszyscy rozliczeni – nikt nie ma nic do oddania ani zaliczki.</span>}
        {list.map((m) => (
          <MemberBlock key={m.memberId} m={m} name={memberName(m.memberId, members)} via={viaOf(m.memberId, members)} today={fleet.today} readOnly={readOnly} cash={cash} />
        ))}
        {!readOnly && list.length > 0 && (
          <p className="pt-1 text-[11px] text-dim">Przelew od domownika przyjdzie z importem z banku; pieniądze do ręki wpisz przez „{repayLabel(cash)}” – edytor podpowie, które zakupy spłacają.</p>
        )}
      </div>
    </Panel>
  )
}

/** Money given back by hand: onto the cash account when the budget has one (D83). */
const repayLabel = (cash: boolean) => (cash ? 'Oddał(a) gotówką…' : 'Oddał(a)…')

/** Whom a member's money comes through (D81). */
function viaOf(memberId: string, members: ReturnType<typeof useMembers>): string | null {
  const v = members.find((m) => m.id === memberId)?.via
  return v ? memberName(v, members) : null
}

function MemberBlock({ m, name, via, today, readOnly, cash }: { m: MemberSettlement; name: string; via: string | null; today: string; readOnly: boolean; cash: boolean }) {
  const compact = useContext(CompactContext)
  const transactions = useData((s) => s.records.transactions)
  const [shown, setShown] = useState(PAGE)
  const days = m.since ? daysBetween(m.since, today) : null
  const open = (t: Transaction | undefined) => t && openOperation(t)
  return (
    <div className="flex flex-col gap-1 border-b border-line/60 py-1.5 last:border-b-0" data-testid="radar-member" data-member={name} data-focus={`settlements:${m.memberId}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-fg-strong">{name}</span>
        {/* Both at once (AF-16): their advance beside the debt – in the deposit too. */}
        <span className={cx('ml-auto text-right', m.owed > 0 ? 'text-fg-strong' : 'text-muted')} data-testid="radar-member-balance">
          {balanceText(m, plnText)}
        </span>
      </div>
      {m.since && m.owed > 0 && (
        <span className={cx('text-[11.5px]', (days ?? 0) > HOUSE_DAYS ? 'text-accent' : 'text-dim')}>
          {m.purchases[0]?.opening ? 'saldo na start rozliczeń z' : 'najstarszy zakup z'} {plDate(m.since)} ({countLabel(days ?? 0, 'dzień', 'dni', 'dni')})
          {via ? ` · przekazuje przez: ${via}` : ''}
        </span>
      )}
      {/* Their money paid back without a purchase named (D91): what they owe is lower already – its editor says what it pays. */}
      {m.waiting.map((u) => {
        const t = transactions[u.txId]?.record
        return (
          <div key={u.txId} className="flex items-baseline gap-2 text-[11.5px]" data-testid="radar-member-unassigned">
            <span className="min-w-0 flex-1 text-accent">
              zwrot do przypisania: {zl(u.amount)} z {plDate(u.date)}
            </span>
            <button type="button" className="shrink-0 text-accent hover:underline" disabled={!t} onClick={() => open(t)} title="Otwórz wpłatę i zaznacz, które zakupy spłaca" data-testid="radar-member-assign">
              {readOnly ? 'pokaż wpłatę' : 'Przypisz zwrot'}
            </button>
          </div>
        )
      })}
      {m.purchases.length > 0 && (
        <div className="flex flex-col text-[11.5px]" data-testid="radar-member-open">
          {/* The balance at the settlements' start apart (SW sp. 9); paid off – the items wait for the money's assignment. */}
          <span className="text-muted">{m.owed > 0 ? `do oddania: ${openText(m.open)}` : `czeka na przypisanie zwrotu: ${openText(m.open)}`}</span>
          {!compact && (
            <div className="flex items-baseline gap-2 border-b border-line/60 pb-0.5 text-[10.5px] text-dim" data-testid="radar-member-columns">
              <span className="w-[72px] shrink-0">data</span>
              <span className="min-w-0 flex-1">zakup</span>
              <span className="w-[90px] text-right">kwota</span>
              <span className="w-[90px] text-right">zostało</span>
            </div>
          )}
          {m.purchases.slice(0, shown).map((p) => {
            const t = p.opening ? undefined : transactions[p.txId]?.record
            return (
              <button
                key={p.txId}
                type="button"
                className="flex w-full items-baseline gap-2 py-0.5 text-left text-dim hover:text-fg-strong disabled:hover:text-dim"
                disabled={!t}
                onClick={() => open(t)}
                title={t ? 'Pokaż zakup w Operacjach' : undefined}
                data-testid="radar-member-purchase"
              >
                <span className="num w-[72px] shrink-0">{plDate(p.date)}</span>
                <span className="min-w-0 flex-1 truncate">{p.opening ? 'saldo na start rozliczeń' : t?.counterparty || t?.title || 'zakup'}</span>
                <span className={cx('num text-right', compact ? 'shrink-0' : 'w-[90px]')}>{zl(p.amount)}</span>
                <span className={cx('num text-right text-fg', compact ? 'shrink-0' : 'w-[90px]')} data-testid="radar-member-left">
                  {compact ? `zostało ${zl(p.left)}` : zl(p.left)}
                </span>
              </button>
            )
          })}
          <ShowMore shown={shown} total={m.purchases.length} page={PAGE} onMore={() => setShown((n) => n + PAGE)} testId="radar-member-more" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-[11.5px]">
        {!readOnly && (
          <button
            type="button"
            className="btn h-[22px]"
            onClick={() => startRepayment(m.memberId)}
            title={cash ? `Nowy wpływ od: ${name} na koncie gotówki – wpisz kwotę; edytor podpowie, które zakupy spłaca` : `Nowy wpływ od: ${name} – wpisz kwotę i konto; edytor podpowie, które zakupy spłaca`}
            data-testid="radar-member-repay"
          >
            {repayLabel(cash)}
          </button>
        )}
        <button type="button" className="text-accent hover:underline" onClick={() => openMemberOperations(m.memberId)} title={`Wszystkie operacje: ${name} – zakupy i wpłaty z całej historii`} data-testid="radar-member-operations">
          Pokaż w Operacjach
        </button>
      </div>
    </div>
  )
}
