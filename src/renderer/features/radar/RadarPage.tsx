/**
 * Radar (spec, „Ekrany”: 90 dni – pensje, asteroidy, spodziewane wpłaty, PIT-38; E6, D72): what comes in the next 90
 * days with the shields after each event that moves them (F27); the buoys – planned operations and terms (F16); the
 * accounts' balances ahead (F26); the loans both ways with their schedules (new, repayment / installment, close), the
 * receivables (the house, the loans given) and the PIT-38 deadline (the amount stays in ICTTJ).
 */
import { useState } from 'react'
import { glossaryOf } from '@shared/glossary'
import type { AccountAhead } from '@shared/calc/ahead'
import { dm } from '@shared/calc/briefing'
import { addDays, addMonths, daysBetween, daysInMonth } from '@shared/calc/dates'
import { HOUSE_DAYS, type LoanState } from '@shared/calc/loans'
import { pit38Deadline, type RadarItem } from '@shared/calc/radar'
import { onTheWay } from '@shared/calc/returns'
import { MBANK_ACCOUNT_ID } from '@shared/schema'
import { canWrite, useData, useEntryNewer, useFolderLocked } from '../../store/data'
import { NewerNote } from '../../components/NewerNote'
import { useDraft } from '../../store/drafts'
import { useFleet } from '../../store/fleet'
import { navigate, toast } from '../../store/ui'
import { AmountField, DateField, plnText } from '../../components/fields'
import { Columns } from '../../components/layout'
import { Badge, Empty, Field, NumberField, Panel, Segmented, Toggle, cx } from '../../components/ui'
import { countLabel, monthLabel, plDate } from '../../lib/format'
import { AccountSelect } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { isOpeningItem, memberName } from '@shared/calc/household'
import { openOperation, openRefundables } from '../operations/state'
import { closeReturn, useReturns } from '../sensors/state'
import { addLoan, closeLoan, deleteLoan, planTransfer, recordPayment, type NewLoan } from './actions'
import { HistoryButton } from '../history/HistoryDialog'
import { useFocusRecord } from '../../components/focus'
import { BuoysPanel, NewBuoyPanel } from './Buoys'
import { useFuture } from './future'

const zl = (g: number) => `${plnText(g)} zł`

const KIND_LABEL: Record<RadarItem['kind'], string> = { salary: 'pensja', asteroid: 'asteroida', fixed: 'opłata', installment: 'rata', repayment: 'spłata', pit38: 'termin', plan: 'boja', end: 'koniec', return: 'zwrot' }

export function RadarPage() {
  const fleet = useFleet()
  const members = useMembers()
  const transactions = useData((s) => s.records.transactions)
  // Opened from the palette (F19): the loan marked (a closed one's list opened).
  useFocusRecord('loan')
  // Whom a member's money comes through (D81).
  const via = (id: string) => {
    const v = members.find((m) => m.id === id)?.via
    return v ? memberName(v, members) : null
  }
  const readOnly = useFolderLocked()
  // The items, the buoys' days and the accounts ahead (F16, F26, F27) – the notes carry amounts (B61): masked or shown at
  // once with Ctrl+$.
  const future = useFuture()
  const items = future.items
  if (!fleet) return <Empty>Wczytywanie…</Empty>
  const loans = fleet.loans
  const r = fleet.receivables
  const active = loans.filter((l) => !l.loan.closedAt)
  const closed = loans.filter((l) => l.loan.closedAt)
  const pit = pit38Deadline(fleet.today)

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-radar">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Radar</h1>
        <span className="text-[12px] text-muted">90 dni – do {plDate(addDays(fleet.today, 90))}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="radar" tracks={['minmax(420px,3fr)', 'minmax(340px,2fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <Panel title="Na radarze" hint={glossaryOf('Radar')} testId="radar-items">
              {!items.length ? <Empty>Nic na radarze w najbliższych 90 dniach.</Empty> : <Timeline items={items} />}
            </Panel>
            <BuoysPanel days={future.days} today={fleet.today} readOnly={readOnly} />
            {!readOnly && <NewBuoyPanel today={fleet.today} />}
          </div>
          <div className="flex min-w-0 flex-col">
            <AccountsPanel accounts={future.accounts} readOnly={readOnly} />
            <Panel title={active.length ? `Pożyczki (${active.length})` : 'Pożyczki'} name="Pożyczki" testId="radar-loans">
              <div className="flex flex-col text-[12px]">
                {!active.length && <span className="text-muted">Brak otwartych pożyczek.</span>}
                {active.map((s) => (
                  <LoanRow key={s.loan.id} s={s} today={fleet.today} readOnly={readOnly} />
                ))}
                {closed.length > 0 && (
                  <details className="pt-1 text-[11.5px] text-muted">
                    <summary className="cursor-pointer select-none">Zamknięte ({closed.length})</summary>
                    {closed.map((s) => (
                      <div key={s.loan.id} className="flex items-baseline gap-2 py-0.5" data-focus={`loan:${s.loan.id}`}>
                        <span className="min-w-0 flex-1 truncate">{s.loan.name}</span>
                        <span className="num">{zl(s.total)}</span>
                        {!readOnly && (
                          <button className="text-accent hover:underline" onClick={() => closeLoan(s.loan, false)} data-testid="loan-reopen">
                            otwórz
                          </button>
                        )}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            </Panel>
            {!readOnly && <NewLoanPanel today={fleet.today} />}
            <Panel title="Należności" testId="radar-receivables">
              <div className="flex flex-col gap-1 text-[12px]">
                {/* The household (D80): each member's balance both ways – owed purchases, their advance held. */}
                {r.members
                  .filter((m) => m.owed > 0 || m.deposit > 0 || m.unassigned.length > 0)
                  .map((m) => {
                    const days = m.since ? daysBetween(m.since, fleet.today) : null
                    // Their money repaid but not assigned to a purchase (D91): what they owe is lower already.
                    const waiting = m.unassigned.reduce((a, u) => a + u.amount, 0)
                    return (
                      <div key={m.memberId} className="flex flex-col" data-testid="radar-member">
                        <div className="flex items-baseline gap-2">
                          <span className="text-muted">{memberName(m.memberId, members)}</span>
                          <span className="text-[11px] text-dim">{m.owed > 0 ? 'ma oddać' : m.deposit > 0 ? 'zaliczka (depozyt)' : 'bez długu'}</span>
                          {(m.owed > 0 || m.deposit > 0) && <span className={cx('num ml-auto', m.owed > 0 ? 'text-fg-strong' : 'text-muted')}>{zl(m.owed > 0 ? m.owed : m.deposit)}</span>}
                        </div>
                        {m.since && m.owed > 0 && (
                          <span className={cx('text-[11.5px]', (days ?? 0) > HOUSE_DAYS ? 'text-accent' : 'text-dim')}>
                            {m.open[0] && isOpeningItem(m.open[0].txId) ? 'saldo na start rozliczeń z' : 'najstarszy zakup z'} {plDate(m.since)} ({countLabel(days ?? 0, 'dzień', 'dni', 'dni')})
                            {via(m.memberId) ? ` · przekazuje przez: ${via(m.memberId)}` : ''}
                          </span>
                        )}
                        {waiting > 0 && (
                          <button type="button" className="self-start text-left text-[11.5px] text-accent hover:underline" onClick={() => navigate({ page: 'inbox' })} title="Meldunki: wskaż, które zakupy spłaca ten zwrot" data-testid="radar-member-unassigned">
                            zwrot do przypisania: {zl(waiting)} – wskaż zakupy w Meldunkach
                          </button>
                        )}
                        {m.open.length > 0 && (
                          <details className="text-[11.5px] text-dim" data-testid="radar-member-open">
                            <summary className="cursor-pointer select-none hover:text-fg-strong">{countLabel(m.open.length, 'zakup do oddania', 'zakupy do oddania', 'zakupów do oddania')}</summary>
                            {m.open.map((o) => {
                              const t = transactions[o.txId]?.record
                              return (
                                <button key={o.txId} type="button" className="flex w-full items-baseline gap-2 text-left hover:text-fg-strong" disabled={!t} onClick={() => t && openOperation(t)} data-testid="radar-member-purchase">
                                  <span className="num">{plDate(o.date)}</span>
                                  <span className="min-w-0 flex-1 truncate">{isOpeningItem(o.txId) ? 'saldo na start rozliczeń' : t?.counterparty || 'zakup'}</span>
                                  <span className="num">{zl(o.amount)}</span>
                                </button>
                              )
                            })}
                          </details>
                        )}
                      </div>
                    )
                  })}
                <div className="flex items-baseline gap-2">
                  <span className="text-muted">Domownicy mają oddać razem</span>
                  <span className="num ml-auto text-fg-strong" data-testid="radar-house">
                    {zl(r.house)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted">Pożyczki udzielone</span>
                  <span className="num ml-auto">{zl(r.total - r.house)}</span>
                </div>
                {fleet.debt > 0 && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted">Dług (pożyczki wzięte)</span>
                    <span className="num ml-auto text-fg-strong" data-testid="radar-debt">
                      {zl(fleet.debt)}
                    </span>
                  </div>
                )}
                <button className="self-start text-[11.5px] text-accent hover:underline" onClick={openRefundables}>
                  wydatki domowników ›
                </button>
              </div>
            </Panel>
            <ReturnsPanel readOnly={readOnly} />
            <Panel title="PIT-38" testId="radar-pit38">
              <div className="flex flex-col gap-1 text-[12px]">
                <span className="text-fg-strong">{pit ? `Termin: 30 kwietnia ${pit.slice(0, 4)} (za ${Number(pit.slice(0, 4)) - 1})` : `Na radarze od 1 lutego (termin 30 kwietnia).`}</span>
                <span className="text-[11.5px] text-muted">Kwotę liczy ICTTJ (rezerwa podatkowa); FI przypomina tylko o terminie.</span>
                {fleet.taxHold > 0 && <span className="text-[11.5px] text-muted">Wypłacone na podatek (poza budżetem): {zl(fleet.taxHold)}</span>}
              </div>
            </Panel>
          </div>
        </Columns>
      </div>
    </div>
  )
}

/**
 * „Turtle Soup – zwroty w drodze” (F34): the money of purchases expected back – each until its day, a late one marked;
 * its purchase, and „zamknij” when it came another way or will not.
 */
function ReturnsPanel({ readOnly }: { readOnly: boolean }) {
  const list = onTheWay(useReturns())
  return (
    <Panel title={list.length ? `Zwroty w drodze (${list.length})` : 'Zwroty w drodze'} name="Zwroty w drodze" testId="radar-returns">
      {!list.length ? (
        <Empty>Brak zwrotów w drodze – przy wydatku zaznacz „Czekam na zwrot pieniędzy” (oddany towar, reklamacja).</Empty>
      ) : (
        <div className="flex flex-col gap-1 text-[12px]">
          <span className="text-[11px] text-dim">Turtle Soup: pieniądze oczekiwane z zakupów. Wpływ tej samej marki (±10%) zamyka zwrot sam.</span>
          {list.map((r) => (
            <div key={r.tx.id} className="flex items-baseline gap-2" data-testid="radar-return" data-state={r.state}>
              <span className="min-w-0 flex-1 truncate">{r.tx.counterparty || r.tx.title || 'zakup'}</span>
              <span className={cx('text-[11px]', r.state === 'late' ? 'text-accent' : 'text-dim')}>{r.state === 'late' ? `po terminie ${countLabel(r.days, 'dzień', 'dni', 'dni')}` : `do ${plDate(r.until)}`}</span>
              <span className="num">{zl(r.amount)}</span>
              <button className="text-[11px] text-accent hover:underline" onClick={() => openOperation(r.tx)} data-testid="radar-return-open">
                pokaż
              </button>
              {!readOnly && (
                <button className="text-[11px] text-muted hover:text-fg-strong hover:underline" onClick={() => closeReturn(r.tx)} data-testid="radar-return-close">
                  zamknij
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/**
 * The accounts' balances ahead (F26): today's and the lowest in 90 days by the payments with their account; one a payment
 * takes below zero – how much, when, and „Zaplanuj przelew własny” from the account that keeps the money.
 */
function AccountsPanel({ accounts, readOnly }: { accounts: readonly AccountAhead[]; readOnly: boolean }) {
  const shown = accounts.filter((a) => a.moves.length || a.balance !== 0)
  return (
    <Panel title="Salda kont za 90 dni" name="Salda kont" testId="radar-accounts">
      <div className="flex flex-col gap-1 text-[12px]">
        {!shown.length && <span className="text-muted">Brak płatności z przypisanym kontem w najbliższych 90 dniach.</span>}
        {shown.map((a) => (
          <div key={a.accountId} className="flex flex-col" data-testid="radar-account" data-name={a.name}>
            <div className="flex items-baseline gap-2">
              <span className="text-fg-strong">{a.name}</span>
              <span className="num ml-auto">{zl(a.balance)}</span>
              <span className={cx('num w-[150px] text-right text-[11px]', a.low.amount < 0 ? 'text-accent' : 'text-dim')} title="Najniższe saldo w 90 dniach">
                min. {zl(a.low.amount)} ({dm(a.low.date)})
              </span>
            </div>
            {a.short && (
              <div className="flex items-baseline gap-2 text-[11.5px]" data-testid="radar-account-short">
                <span className="min-w-0 flex-1 text-accent">
                  Zabraknie {zl(a.short.amount)} na płatność {dm(a.short.date)} ({a.short.cause}){a.source ? ` – przelej z konta ${a.source.name}` : ''}
                </span>
                {!readOnly && a.source && (
                  <button className="shrink-0 text-accent hover:underline" onClick={() => planTransfer(a)} data-testid="radar-account-transfer">
                    Zaplanuj przelew własny
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <span className="text-[11px] text-dim">Liczą się płatności kontenerów i pożyczek z kontem, boje z kontem i operacje z późniejszą datą; bez wydatków codziennych.</span>
      </div>
    </Panel>
  )
}

function Timeline({ items }: { items: RadarItem[] }) {
  return (
    <div className="flex flex-col text-[12px]">
      {items.map((i, n) => {
        const month = i.date.slice(0, 7)
        const newMonth = n === 0 || items[n - 1]!.date.slice(0, 7) !== month
        return (
          <div key={i.key} className="flex flex-col">
            {newMonth && <span className="label pt-2 first:pt-0">{monthLabel(month)}</span>}
            <div className="flex items-baseline gap-2 border-b border-line/60 px-1 py-1 last:border-b-0" data-testid="radar-item" data-kind={i.kind} data-overdue={i.overdue ? 'yes' : undefined}>
              <span className="num w-[44px] shrink-0 text-[11px] text-muted">{plDate(i.date).slice(0, 5)}</span>
              <span className="w-[72px] shrink-0 text-[11px] text-dim">{KIND_LABEL[i.kind]}</span>
              <span className="min-w-0 flex-1 truncate text-fg-strong">{i.name}</span>
              <span className={cx('w-[150px] truncate text-right text-[11px]', i.overdue ? 'text-accent' : 'text-dim')}>{i.overdue ? i.note || 'po terminie' : i.note}</span>
              <span className={cx('num w-[110px] text-right', i.direction === 'in' ? 'text-up' : 'text-fg')}>
                {i.amount == null ? '—' : `${i.direction === 'in' ? '+' : i.direction === 'out' ? '−' : ''}${zl(i.amount)}`}
              </span>
              <span className={cx('num w-[96px] text-right text-[11px]', i.shieldsAfter != null && i.shieldsAfter < 0 ? 'text-accent' : 'text-dim')} title="Osłony po tym zdarzeniu (bez wpływów, których dnia nie znamy)" data-testid="radar-shields-after">
                {i.shieldsAfter != null ? zl(i.shieldsAfter) : ''}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LoanRow({ s, today, readOnly: folderLocked }: { s: LoanState; today: string; readOnly: boolean }) {
  // Written by a newer version of the app (B67): no payment, closing or deletion from here.
  const newer = useEntryNewer('loans', s.loan.id)
  const readOnly = folderLocked || newer
  const taken = s.loan.direction === 'taken'
  const [paying, setPaying] = useState(false)
  const [amount, setAmount] = useState<number | null>(s.next?.amount ?? s.open)
  const [date, setDate] = useState(today)
  return (
    <div className="flex flex-col gap-1 border-b border-line/60 py-1.5 last:border-b-0" data-testid="loan-row" data-name={s.loan.name} data-focus={`loan:${s.loan.id}`}>
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-fg-strong">{s.loan.name}</span>
        <Badge tone={taken ? 'warn' : 'default'}>{taken ? 'wzięta' : 'udzielona'}</Badge>
        {s.overdue && (
          <Badge tone="warn" title={`Od ${plDate(s.overdue.date)}`} data-testid="loan-overdue">
            {taken ? 'zaległa rata' : 'spóźniona spłata'}
          </Badge>
        )}
        <span className="num text-fg-strong" data-testid="loan-open">
          {zl(s.open)}
        </span>
      </div>
      <div className="flex items-baseline gap-2 text-[11.5px] text-muted">
        <span className="min-w-0 flex-1 truncate">
          {s.loan.counterparty || '—'} · {taken ? 'spłacone' : 'oddane'} {zl(s.paid)} z {zl(s.total)}
          {s.next ? ` · następna ${plDate(s.next.date)}: ${zl(s.next.amount)}` : ''}
        </span>
        {!readOnly && (
          <>
            <button
              className="text-accent hover:underline"
              onClick={() => {
                // What is due now (the next installment's rest, else the whole open amount), today.
                setAmount(s.next?.amount ?? s.open)
                setDate(today)
                setPaying((v) => !v)
              }}
              data-testid="loan-pay-open"
            >
              {taken ? 'zapłać ratę' : 'spłata otrzymana'}
            </button>
            <button className="hover:text-fg-strong" onClick={() => closeLoan(s.loan, true)} title="Zamknij pożyczkę (spłacona albo umorzona)" data-testid="loan-close">
              zamknij
            </button>
            <button className="hover:text-fg-strong" onClick={() => void deleteLoan(s.loan)} title="Usuń (tylko bez operacji)">
              usuń
            </button>
          </>
        )}
        <HistoryButton kind="loans" id={s.loan.id} current={s.loan} variant="link" />
      </div>
      <NewerNote show={newer} />
      {paying && !readOnly && (
        <div className="flex items-center gap-2">
          <AmountField className="h-[24px] w-[110px]" value={amount} onChange={setAmount} aria-label="Kwota spłaty" data-testid="loan-pay-amount" />
          <DateField className="h-[24px] w-[100px]" value={date} onChange={setDate} aria-label="Data spłaty" />
          <button
            className="btn btn-accent h-[24px]"
            onClick={() => {
              if (!amount || amount <= 0) return toast('Podaj kwotę.', 'error')
              if (recordPayment(s, amount, date)) setPaying(false)
            }}
            data-testid="loan-pay"
          >
            Zapisz
          </button>
        </div>
      )}
    </div>
  )
}

/** The same day next month (the 31st → that month's last day). */
function sameDayNextMonth(date: string): string {
  const month = addMonths(date.slice(0, 7), 1)
  return `${month}-${String(Math.min(Number(date.slice(8, 10)), daysInMonth(month))).padStart(2, '0')}`
}

function NewLoanPanel({ today }: { today: string }) {
  const accounts = useData((s) => s.fi?.settings.accounts)
  const blank = (): NewLoan => ({
    direction: 'given',
    name: '',
    counterparty: '',
    amount: 0,
    total: 0,
    date: today,
    accountId: accounts?.find((a) => !a.archived)?.id ?? MBANK_ACCOUNT_ID,
    installments: 1,
    firstDue: sameDayNextMonth(today),
    withOperation: true
  })
  // Kept while another screen is looked at (N36).
  const [o, setO, clearO] = useDraft<NewLoan>('radar:newLoan', blank)
  const set = (p: Partial<NewLoan>) => setO((x) => ({ ...x, ...p }))
  const taken = o.direction === 'taken'
  const save = () => {
    if (!o.name.trim()) return toast('Nazwij pożyczkę (np. „Pożyczka dla Ani”).', 'error')
    if (o.amount <= 0) return toast('Podaj kwotę pożyczki.', 'error')
    if (o.firstDue < o.date) return toast('Pierwsza rata nie może być przed datą pożyczki.', 'error')
    // A rate typed as the total would cut the debt and inflate the range (B85).
    if (taken && o.total > 0 && o.total < o.amount) return toast('„Do spłaty razem” nie może być mniej niż kwota pożyczki (puste = kwota).', 'error', 6000)
    if (!canWrite()) return
    addLoan({ ...o, total: taken && o.total > 0 ? o.total : o.amount })
    clearO()
  }
  return (
    <Panel title="Nowa pożyczka" testId="radar-new-loan">
      <div className="flex flex-col gap-2 text-[12px]">
        <Segmented
          value={o.direction}
          options={[
            { value: 'given', label: 'Pożyczam komuś' },
            { value: 'taken', label: 'Biorę pożyczkę' }
          ]}
          onChange={(direction) => set({ direction })}
          aria-label="Kierunek pożyczki"
        />
        <Field label="Nazwa" labelWidth={130}>
          <input className="input h-[24px] w-full" value={o.name} maxLength={80} onChange={(e) => set({ name: e.currentTarget.value })} placeholder={taken ? 'np. Kredyt na laptop' : 'np. Pożyczka dla Ani'} data-testid="loan-name" />
        </Field>
        <Field label={taken ? 'Pożyczkodawca' : 'Komu pożyczasz'} labelWidth={130} hint="Jak w wyciągu z banku – import połączy przelewy.">
          <input className="input h-[24px] w-full" value={o.counterparty} maxLength={200} onChange={(e) => set({ counterparty: e.currentTarget.value })} data-testid="loan-counterparty" />
        </Field>
        <Field label="Kwota" labelWidth={130}>
          <AmountField className="h-[24px] w-[120px]" value={o.amount || null} allowEmpty onChange={(v) => set({ amount: v ?? 0 })} aria-label="Kwota pożyczki" data-testid="loan-amount" />
        </Field>
        {taken && (
          <Field label="Do spłaty razem" labelWidth={130} hint="Z odsetkami; puste = kwota pożyczki.">
            <AmountField className="h-[24px] w-[120px]" value={o.total || null} allowEmpty onChange={(v) => set({ total: v ?? 0 })} aria-label="Do spłaty razem" data-testid="loan-total" />
          </Field>
        )}
        <Field label="Data i konto" labelWidth={130}>
          <div className="flex gap-2">
            <DateField className="h-[24px] w-[100px]" value={o.date} onChange={(date) => set({ date })} aria-label="Data pożyczki" />
            <AccountSelect className="h-[24px]" value={o.accountId} onChange={(id) => id && set({ accountId: id })} aria-label="Konto pożyczki" />
          </div>
        </Field>
        <Field label="Raty" labelWidth={130} hint="Co miesiąc od pierwszej raty; 1 = jednorazowa spłata.">
          <div className="flex items-center gap-2">
            <NumberField className="h-[24px] w-[60px]" value={o.installments} decimals={0} step={1} isValid={(v) => v != null && v >= 1 && v <= 120} onChange={(v) => v != null && set({ installments: v })} aria-label="Liczba rat" data-testid="loan-installments" />
            <span className="text-muted">pierwsza</span>
            <DateField className="h-[24px] w-[100px]" value={o.firstDue} onChange={(firstDue) => set({ firstDue })} aria-label="Pierwsza rata" />
          </div>
        </Field>
        <Toggle checked={o.withOperation} onChange={(withOperation) => set({ withOperation })} label={taken ? 'Pieniądze już na koncie (operacja wpływu)' : 'Pieniądze już przelane (operacja wypływu z osłon)'} />
        {taken && <p className="text-[11px] text-dim">Raty trafią do Ładowni jako kontener na czas spłaty; zasięg liczy osłony pomniejszone o dług.</p>}
        <button className="btn btn-accent h-[26px] self-start" onClick={save} data-testid="loan-save">
          Zapisz pożyczkę
        </button>
      </div>
    </Panel>
  )
}
