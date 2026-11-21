/**
 * Radar (spec, „Ekrany”: 90 dni – pensje, asteroidy, spodziewane wpłaty, PIT-38; E6, D72): what comes in the next 90
 * days with the shields after each event that moves them (F27); the buoys – planned operations and terms (F16); the
 * accounts' balances ahead (F26); the loans both ways with their schedules (new, repayment / installment, close), the
 * receivables (the house, the loans given) and the PIT-38 deadline (the amount stays in ICTTJ).
 */
import { useContext, useMemo, useState } from 'react'
import { glossaryOf } from '@shared/glossary'
import type { AccountAhead } from '@shared/calc/ahead'
import { dm, lateFeeText } from '@shared/calc/briefing'
import { addDays, addMonths, daysInMonth } from '@shared/calc/dates'
import { loanPayers, type LoanState } from '@shared/calc/loans'
import { impliedLoanRate } from '@shared/calc/payoff'
import { pit38Deadline, type RadarItem } from '@shared/calc/radar'
import { percentText } from '@shared/format'
import { onTheWay } from '@shared/calc/returns'
import { MBANK_ACCOUNT_ID } from '@shared/schema'
import { canWrite, useData, useEntryNewer, useFolderLocked } from '../../store/data'
import { NewerNote } from '../../components/NewerNote'
import { useDraft } from '../../store/drafts'
import { useFleet } from '../../store/fleet'
import { focusRecord, toast } from '../../store/ui'
import { AmountField, DateField, plnText } from '../../components/fields'
import { Columns } from '../../components/layout'
import { IconPlus } from '../../components/icons'
import { revealField } from '../../lib/reveal'
import { Badge, CompactContext, Empty, Field, LimitHint, NumberField, Panel, Segmented, Toggle, cx } from '../../components/ui'
import { countLabel, monthLabel, plDate } from '../../lib/format'
import { AccountSelect } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { openOperation, openRefundables } from '../operations/state'
import { closeReturn, useReturns } from '../sensors/state'
import { addLoan, closeLoan, deleteLoan, ensureLoanContainer, planTransfer, recordPayment, typedLoanRate, type NewLoan } from './actions'
import { HistoryButton } from '../history/HistoryDialog'
import { useFocusRecord } from '../../components/focus'
import { BuoysPanel, NewBuoyPanel } from './Buoys'
import { PayoffPanel } from './Payoff'
import { useFuture } from './future'
import { RadarCalendar } from './Calendar'
import { KIND_LABEL, TARGET_TITLE, radarTarget } from './labels'
import { radarRows } from './rows'
import { SettlementsPanel } from './SettlementsPanel'
import { useCargoStatuses } from '../cargo/status'

const zl = (g: number) => `${plnText(g)} zł`

export function RadarPage() {
  const fleet = useFleet()
  // Opened from the palette (F19): the loan marked (a closed one's list opened).
  useFocusRecord('loan')
  // The buoy a radar row opened (UX-74): its panel is on this screen – a closed „Pozostałe boje” list opens.
  useFocusRecord('buoy')
  const readOnly = useFolderLocked()
  // The items, the buoys' days and the accounts ahead (F16, F26, F27) – the notes carry amounts (B61): masked or shown at
  // once with Ctrl+$.
  const future = useFuture()
  const items = future.items
  // The list or the month's calendar (AP-42) – kept while another screen is looked at.
  const [view, setView] = useDraft<'list' | 'calendar'>('radar:view', () => 'list')
  // The forms of a new buoy and a new loan sit behind „+ …” (UX-75); their drafts stay (`NewBuoyPanel`, `NewLoanPanel`).
  const [buoyOpen, setBuoyOpen, closeBuoyForm] = useDraft<boolean>('radar:newBuoy:open', () => false)
  const [loanOpen, setLoanOpen, closeLoanForm] = useDraft<boolean>('radar:newLoan:open', () => false)
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
            <Panel
              title="Na radarze"
              hint={glossaryOf('Radar')}
              testId="radar-items"
              actions={
                <Segmented
                  size="sm"
                  value={view}
                  options={[
                    { value: 'list', label: 'lista' },
                    { value: 'calendar', label: 'kalendarz' }
                  ]}
                  onChange={setView}
                  aria-label="Widok Radaru"
                />
              }
            >
              {view === 'calendar' ? (
                <RadarCalendar fleet={fleet} items={items} />
              ) : !items.length ? (
                <Empty>Nic na radarze w najbliższych 90 dniach.</Empty>
              ) : (
                <Timeline items={items} today={fleet.today} />
              )}
            </Panel>
            <BuoysPanel
              days={future.days}
              today={fleet.today}
              readOnly={readOnly}
              actions={
                !readOnly && (
                  <button
                    className="btn h-[22px]"
                    aria-expanded={buoyOpen}
                    onClick={() => {
                      if (buoyOpen) return closeBuoyForm()
                      setBuoyOpen(true)
                      revealField('buoy-name')
                    }}
                    title="Nowa boja – zaplanowany wydatek, wpływ albo termin"
                    data-testid="radar-new-buoy-open"
                  >
                    <IconPlus size={12} /> Boja
                  </button>
                )
              }
            />
            {!readOnly && buoyOpen && <NewBuoyPanel today={fleet.today} onDone={closeBuoyForm} />}
          </div>
          <div className="flex min-w-0 flex-col">
            <AccountsPanel accounts={future.accounts} readOnly={readOnly} />
            <Panel
              title={active.length ? `Pożyczki (${active.length})` : 'Pożyczki'}
              name="Pożyczki"
              testId="radar-loans"
              actions={
                !readOnly && (
                  <button
                    className="btn h-[22px]"
                    aria-expanded={loanOpen}
                    onClick={() => {
                      if (loanOpen) return closeLoanForm()
                      setLoanOpen(true)
                      revealField('loan-name')
                    }}
                    title="Nowa pożyczka – udzielona albo wzięta"
                    data-testid="radar-new-loan-open"
                  >
                    <IconPlus size={12} /> Pożyczka
                  </button>
                )
              }
            >
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
            {/* The taken loans' payoff (AP-41): shown while one is open – a proposal, nothing stored. */}
            <PayoffPanel fleet={fleet} readOnly={readOnly} />
            {!readOnly && loanOpen && <NewLoanPanel today={fleet.today} onDone={closeLoanForm} />}
            {/* The household (D80, UX-82): each member's balance both ways, their purchases and the ways to settle them. */}
            <SettlementsPanel fleet={fleet} readOnly={readOnly} />
            <Panel title="Należności" testId="radar-receivables">
              <div className="flex flex-col gap-1 text-[12px]">
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
                <button className="self-start text-[11.5px] text-accent hover:underline" onClick={() => openRefundables()}>
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

/** A radar row's record opened on its screen (UX-74): a container in Ładownia, a loan or a buoy here, a return's purchase. */
function openTarget(t: NonNullable<ReturnType<typeof radarTarget>>): void {
  if (t.focus === 'operation') {
    const tx = useData.getState().records.transactions[t.id]?.record
    if (tx) openOperation(tx)
    return
  }
  focusRecord(t.focus, t.id, { page: t.focus === 'container' ? 'cargo' : 'radar' })
}

/**
 * The list's columns (UX-35) in a narrow window (the smallest – 1024 px, T548): the name keeps its room and the numbers
 * theirs, unbroken – only the notes give way (a list narrower than 480 px – none, not a sliver of them); never a row
 * without its name. A row of a container's overdue dues (UX-30) says them in the name's and the notes' room (LATE_NAME –
 * the notes' width and their gap), its numbers in line.
 */
const NAME_MIN = 'min-w-[96px]'
const LATE_NAME = 'flex-[1_1_158px] @max-[480px]:flex-1'
const NOTE_COL = 'w-[150px] min-w-0 truncate text-right @max-[480px]:hidden'
const AMOUNT_COL = 'w-[110px] min-w-[88px] whitespace-nowrap text-right'
const SHIELDS_COL = 'w-[96px] min-w-[76px] whitespace-nowrap text-right'

function Timeline({ items, today }: { items: RadarItem[]; today: string }) {
  // The phone (T311): two lines – the day, the name and the amount; the kind, the note and the shields after it under them.
  const compact = useContext(CompactContext)
  // A container's overdue dues in one row, as the briefing says them (UX-30, T548) – the fees' state of the radar's items.
  const cargo = useCargoStatuses()
  const rows = useMemo(() => radarRows(items, cargo, today), [items, cargo, today])
  return (
    <div className="@container flex flex-col text-[12px]">
      {/* The columns named (UX-35): the phone's two-line rows say it in the line itself. */}
      {!compact && (
        <div className="flex items-baseline gap-2 border-b border-line px-1 pb-1 text-[10.5px] text-dim" data-testid="radar-columns">
          <span className="w-[44px] shrink-0">dzień</span>
          <span className="w-[72px] shrink-0">rodzaj</span>
          <span className={cx(NAME_MIN, 'flex-1')}>pozycja</span>
          <span className={NOTE_COL}>uwagi</span>
          <span className={AMOUNT_COL}>kwota</span>
          <span className={SHIELDS_COL} title="Osłony po tym zdarzeniu (bez wpływów, których dnia nie znamy)">
            osłony po
          </span>
        </div>
      )}
      {rows.map(({ item: i, late, span }, n) => {
        const month = i.date.slice(0, 7)
        const newMonth = n === 0 || rows[n - 1]!.item.date.slice(0, 7) !== month
        const kind = <span className={cx('shrink-0 text-[11px] text-dim', !compact && 'w-[72px]')}>{KIND_LABEL[i.kind]}</span>
        const target = radarTarget(i)
        // A container's overdue dues (UX-30): the briefing's whole line in the hint – the row's own may be cut. The row
        // says them in its name's place, the notes' column with it (the phone: the container, its dues in the second line).
        const hint = target ? (late ? `${lateFeeText(late, zl, today)}\n${TARGET_TITLE[target.focus]}` : TARGET_TITLE[target.focus]) : undefined
        const label = !late ? (
          i.name
        ) : compact ? (
          late.name
        ) : (
          <>
            {late.name}: <span className="text-accent">{span}</span>
          </>
        )
        const name = target ? (
          <button type="button" className={cx(compact ? 'min-w-0 flex-1' : cx(NAME_MIN, late ? LATE_NAME : 'flex-1'), 'truncate text-left text-fg-strong hover:underline')} onClick={() => openTarget(target)} title={hint} data-testid="radar-item-open" data-target={target.focus}>
            {label}
          </button>
        ) : (
          <span className={cx(compact ? 'min-w-0 flex-1' : cx(NAME_MIN, late ? LATE_NAME : 'flex-1'), 'truncate text-fg-strong')}>{label}</span>
        )
        const note = late ? span : i.overdue ? i.note || 'po terminie' : i.note
        // A row past its day: its day in the accent, its note in the day's hint – a narrow list hides the notes (T548).
        const day = (
          <span className={cx('num w-[44px] shrink-0 text-[11px]', i.overdue ? 'text-accent' : 'text-muted')} title={i.overdue ? note : undefined} data-testid="radar-item-day">
            {plDate(i.date).slice(0, 5)}
          </span>
        )
        const amount = (
          <span className={cx('num text-right', compact ? 'shrink-0 whitespace-nowrap' : AMOUNT_COL, i.direction === 'in' ? 'text-up' : 'text-fg')}>
            {i.amount == null ? '—' : `${i.direction === 'in' ? '+' : i.direction === 'out' ? '−' : ''}${zl(i.amount)}`}
          </span>
        )
        const shields = (
          <span
            className={cx('num text-right text-[11px]', compact ? 'shrink-0 whitespace-nowrap' : SHIELDS_COL, i.shieldsAfter != null && i.shieldsAfter < 0 ? 'text-accent' : 'text-dim')}
            title="Osłony po tym zdarzeniu (bez wpływów, których dnia nie znamy)"
            data-testid="radar-shields-after"
          >
            {i.shieldsAfter != null ? zl(i.shieldsAfter) : ''}
          </span>
        )
        const row = { 'data-testid': 'radar-item', 'data-kind': i.kind, 'data-overdue': i.overdue ? 'yes' : undefined, 'data-dues': late ? String(late.dues.length) : undefined }
        return (
          <div key={i.key} className="flex flex-col">
            {newMonth && <span className="label pt-2 first:pt-0">{monthLabel(month)}</span>}
            {compact ? (
              <div className="flex flex-col gap-0.5 border-b border-line/60 px-1 py-1.5 last:border-b-0" {...row}>
                <div className="flex items-baseline gap-2">
                  {day}
                  {name}
                  {amount}
                </div>
                <div className="flex items-baseline gap-2 pl-[52px]">
                  {kind}
                  <span className={cx('min-w-0 flex-1 truncate text-[11px]', i.overdue ? 'text-accent' : 'text-dim')}>{note}</span>
                  {shields}
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 border-b border-line/60 px-1 py-1 last:border-b-0" {...row}>
                {day}
                {kind}
                {name}
                {!late && <span className={cx(NOTE_COL, 'text-[11px]', i.overdue ? 'text-accent' : 'text-dim')} title={note || undefined}>{note}</span>}
                {amount}
                {shields}
              </div>
            )}
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
  const hasContainer = useData((st) => taken && Object.values(st.records.containers).some((e) => e.record.loanId === s.loan.id && !e.record.archived))
  const [paying, setPaying] = useState(false)
  const [amount, setAmount] = useState<number | null>(s.next?.amount ?? s.open)
  const [date, setDate] = useState(today)
  const [fromShields, setFromShields] = useState(false)
  // Who paid (D100, T356): said when someone else than the borrower paid too – each payer with their sum.
  const members = useMembers()
  const payers = taken ? [] : loanPayers(s, members)
  const othersPaid = payers.some((p) => !p.borrower)
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
            {taken && !hasContainer && (
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => ensureLoanContainer(s)}
                title="Utwórz kontener raty w Ładowni, żeby spłacać pożyczkę z bieżącej pensji"
                data-testid="loan-create-container"
              >
                do Ładowni
              </button>
            )}
            <button
              className="text-accent hover:underline"
              onClick={() => {
                // What is due now (the next installment's rest, else the whole open amount), today.
                setAmount(s.next?.amount ?? s.open)
                setDate(today)
                setFromShields(false)
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
      {othersPaid && (
        <div className="truncate text-[11px] text-dim" data-testid="loan-payers">
          kto zapłacił: {payers.map((p) => `${p.name} ${zl(p.amount)}`).join(' · ')}
        </div>
      )}
      <NewerNote show={newer} />
      {paying && !readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <AmountField className="h-[24px] w-[110px]" value={amount} onChange={setAmount} aria-label="Kwota spłaty" data-testid="loan-pay-amount" />
          <DateField className="h-[24px] w-[100px]" value={date} onChange={setDate} aria-label="Data spłaty" />
          {taken && hasContainer && (
            <select
              className="input h-[24px] py-0 text-[11.5px]"
              value={fromShields ? 'shields' : 'cargo'}
              onChange={(e) => setFromShields(e.currentTarget.value === 'shields')}
              aria-label="Źródło spłaty"
              data-testid="loan-pay-source"
            >
              <option value="cargo">z pensji (Ładownia)</option>
              <option value="shields">z osłon (nadpłata)</option>
            </select>
          )}
          <button
            className="btn btn-accent h-[24px]"
            onClick={() => {
              if (!amount || amount <= 0) return toast('Podaj kwotę.', 'error')
              if (recordPayment(s, amount, date, { fromShields })) setPaying(false)
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

function NewLoanPanel({ today, onDone }: { today: string; onDone: () => void }) {
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
    withOperation: true,
    withContainer: true,
    rate: null
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
    onDone()
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
          <LimitHint length={o.name.length} max={80} />
        </Field>
        <Field label={taken ? 'Pożyczkodawca' : 'Komu pożyczasz'} labelWidth={130} hint="Jak w wyciągu z banku – import połączy przelewy.">
          <input className="input h-[24px] w-full" value={o.counterparty} maxLength={200} onChange={(e) => set({ counterparty: e.currentTarget.value })} data-testid="loan-counterparty" />
          <LimitHint length={o.counterparty.length} max={200} />
        </Field>
        <Field label="Kwota" labelWidth={130}>
          <AmountField className="h-[24px] w-[120px]" value={o.amount || null} allowEmpty onChange={(v) => set({ amount: v ?? 0 })} aria-label="Kwota pożyczki" data-testid="loan-amount" />
        </Field>
        {taken && (
          <Field label="Do spłaty razem" labelWidth={130} hint="Z odsetkami; puste = kwota pożyczki.">
            <AmountField className="h-[24px] w-[120px]" value={o.total || null} allowEmpty onChange={(v) => set({ total: v ?? 0 })} aria-label="Do spłaty razem" data-testid="loan-total" />
          </Field>
        )}
        {taken && (
          <Field label="Oprocentowanie" labelWidth={130} hint="Roczne z umowy, w procentach – tylko dla planu spłaty; puste = nieznane.">
            <div className="flex flex-wrap items-center gap-1.5">
              <NumberField
                className="h-[24px] w-[70px]"
                value={o.rate ?? null}
                decimals={2}
                step={0.25}
                range={[0, 100]}
                isValid={(v) => v == null || (v >= 0 && v <= 100)}
                commitOnBlur
                onChange={(v) => set({ rate: typedLoanRate(v) })}
                placeholder="—"
                aria-label="Oprocentowanie roczne"
                data-testid="loan-rate"
              />
              <span className="text-muted">% rocznie</span>
              {(() => {
                const hinted = impliedLoanRate({ amount: o.amount, total: o.total, installments: o.installments })
                return hinted != null && o.rate !== hinted ? (
                  <button
                    type="button"
                    className="text-[11px] text-accent hover:underline"
                    onClick={() => set({ rate: hinted })}
                    data-testid="loan-rate-hint"
                  >
                    Z harmonogramu: ~{percentText(hinted, 2)}
                  </button>
                ) : null
              })()}
            </div>
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
            <NumberField className="h-[24px] w-[60px]" value={o.installments} decimals={0} step={1} range={[1, 120]} isValid={(v) => v != null && v >= 1 && v <= 120} onChange={(v) => v != null && set({ installments: v })} aria-label="Liczba rat" data-testid="loan-installments" />
            <span className="text-muted">pierwsza</span>
            <DateField className="h-[24px] w-[100px]" value={o.firstDue} onChange={(firstDue) => set({ firstDue })} aria-label="Pierwsza rata" />
          </div>
        </Field>
        <Toggle checked={o.withOperation} onChange={(withOperation) => set({ withOperation })} label={taken ? 'Pieniądze już na koncie (operacja wpływu)' : 'Pieniądze już przelane (operacja wypływu z osłon)'} />
        {taken && (
          <Toggle
            checked={o.withContainer ?? true}
            onChange={(withContainer) => set({ withContainer })}
            label="Raty jako kontener w Ładowni (spłata z pensji; wyłączone = spłata z osłon)"
            data-testid="loan-with-container"
          />
        )}
        {taken && <p className="text-[11px] text-dim">{(o.withContainer ?? true) ? 'Raty trafią do Ładowni jako kontener na czas spłaty; zasięg liczy osłony pomniejszone o dług.' : 'Spłaty pożyczki będą schodzić z osłon; zasięg liczy osłony pomniejszone o dług.'}</p>}
        <button className="btn btn-accent h-[26px] self-start" onClick={save} data-testid="loan-save">
          Zapisz pożyczkę
        </button>
      </div>
    </Panel>
  )
}
