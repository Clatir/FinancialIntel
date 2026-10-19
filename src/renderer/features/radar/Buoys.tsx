/**
 * The buoys on the radar (1.8.0, F16 – „Boje nawigacyjne”): the planned operations and terms – their open days (a late
 * one first) with „Wykonaj teraz” / „Odhacz”, the days the bank's operations did (with „to nie ta”), the buoys further
 * than the radar's 90 days, and the form of a new one (kept while another screen is looked at).
 */
import { useState } from 'react'
import { nextDayOf, type ScheduledDay } from '@shared/calc/scheduled'
import { dm } from '@shared/calc/briefing'
import type { Scheduled } from '@shared/schema'
import { AmountField, DateField, plnText } from '../../components/fields'
import { Badge, Empty, Field, Panel, Segmented, Toggle, cx } from '../../components/ui'
import { useDraft } from '../../store/drafts'
import { useRecordList } from '../../store/records'
import { toast } from '../../store/ui'
import { plDate } from '../../lib/format'
import { AccountSelect, CategorySelect } from '../operations/pickers'
import { openOperation } from '../operations/state'
import { addScheduled, deleteScheduled, executeDay, notThis, patchScheduled, signedOf, tickDay, type NewScheduled } from './scheduled'

const zl = (g: number) => `${plnText(g)} zł`

type Direction = 'out' | 'in' | 'term'

const whenText = (d: ScheduledDay) => (d.state === 'late' ? `po terminie ${-d.days} ${-d.days === 1 ? 'dzień' : 'dni'}` : d.days === 0 ? 'dziś' : `za ${d.days} ${d.days === 1 ? 'dzień' : 'dni'}`)

const amountText = (s: Pick<Scheduled, 'amount'>) => (s.amount == null ? 'termin' : `${s.amount < 0 ? '−' : '+'}${zl(Math.abs(s.amount))}`)

/** The form's fields of a buoy: a new one or an edit. */
function formOf(s: Scheduled): NewScheduled & { kind: Direction } {
  return {
    name: s.name,
    date: s.date,
    amount: s.amount == null ? null : Math.abs(s.amount),
    direction: s.amount != null && s.amount > 0 ? 'in' : 'out',
    kind: s.amount == null ? 'term' : s.amount > 0 ? 'in' : 'out',
    yearly: s.yearly,
    accountId: s.accountId,
    categoryId: s.categoryId,
    counterparty: s.counterparty,
    remind: s.remind,
    note: s.note
  }
}

export function BuoysPanel({ days, today, readOnly }: { days: readonly ScheduledDay[]; today: string; readOnly: boolean }) {
  const list = useRecordList('scheduled')
  const [editing, setEditing] = useState<string | null>(null)
  const open = days.filter((d) => d.state === 'ahead' || d.state === 'today' || d.state === 'late').sort((a, b) => Number(b.state === 'late') - Number(a.state === 'late') || a.date.localeCompare(b.date))
  const done = days.filter((d) => d.state === 'done' && d.days >= -30).sort((a, b) => b.date.localeCompare(a.date))
  // The buoys with no open day in the window: further than 90 days, a one-off long past.
  const shown = new Set(open.map((d) => d.scheduled.id))
  const later = list.filter((s) => !shown.has(s.id)).sort((a, b) => (nextDayOf(a, today) ?? '9999').localeCompare(nextDayOf(b, today) ?? '9999'))
  return (
    <Panel title={open.length ? `Boje nawigacyjne (${open.length})` : 'Boje nawigacyjne'} name="Boje nawigacyjne" testId="radar-buoys">
      <div className="flex flex-col text-[12px]">
        {!open.length && <Empty>Żadnej boi w najbliższych 90 dniach – dodaj zaplanowany wydatek, wpływ albo termin.</Empty>}
        {open.map((d) => (
          <div key={`${d.scheduled.id}:${d.date}`} className="flex flex-col border-b border-line/60 py-1 last:border-b-0" data-testid="buoy-day" data-name={d.scheduled.name} data-state={d.state}>
            <div className="flex items-baseline gap-2">
              <span className="num w-[44px] shrink-0 text-[11px] text-muted">{dm(d.date)}</span>
              <span className="min-w-0 flex-1 truncate text-fg-strong">{d.scheduled.name}</span>
              {d.scheduled.yearly && <Badge>co roku</Badge>}
              <span className={cx('text-[11px]', d.state === 'late' ? 'text-accent' : 'text-dim')}>{whenText(d)}</span>
              <span className={cx('num w-[100px] text-right', d.scheduled.amount != null && d.scheduled.amount > 0 ? 'text-up' : 'text-fg')}>{amountText(d.scheduled)}</span>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-3 pl-[52px] text-[11.5px]">
                {d.scheduled.amount != null && (
                  <button className="text-accent hover:underline" onClick={() => executeDay(d.scheduled, d.date)} title="Zapisz operację z tej boi (dziś) i otwórz ją w Operacjach" data-testid="buoy-execute">
                    Wykonaj teraz
                  </button>
                )}
                <button className="text-muted hover:text-fg-strong" onClick={() => tickDay(d.scheduled, d.date)} title="Zrobione bez operacji w budżecie" data-testid="buoy-tick">
                  odhacz
                </button>
                <button className="text-muted hover:text-fg-strong" onClick={() => setEditing((x) => (x === d.scheduled.id ? null : d.scheduled.id))} data-testid="buoy-edit">
                  zmień
                </button>
              </div>
            )}
            {editing === d.scheduled.id && <BuoyEditor s={d.scheduled} onDone={() => setEditing(null)} />}
          </div>
        ))}
        {done.length > 0 && (
          <details className="pt-1.5 text-[11.5px]" data-testid="buoys-done">
            <summary className="cursor-pointer text-muted select-none">Zrobione ostatnio ({done.length})</summary>
            {done.map((d) => (
              <div key={`${d.scheduled.id}:${d.date}`} className="flex items-baseline gap-2 py-0.5" data-testid="buoy-done" data-name={d.scheduled.name}>
                <span className="num w-[44px] shrink-0 text-dim">{dm(d.date)}</span>
                <span className="min-w-0 flex-1 truncate">{d.scheduled.name}</span>
                <span className="text-dim">{d.txId ? (d.matched ? 'operacja dopasowana' : 'operacja z boi') : 'odhaczone'}</span>
                {d.txId && (
                  <button className="text-accent hover:underline" onClick={() => openOperation({ id: d.txId!, date: d.date })}>
                    operacja ›
                  </button>
                )}
                {d.matched && d.txId && !readOnly && (
                  <button className="text-muted hover:text-fg-strong" onClick={() => notThis(d.scheduled, d.txId!)} title="Ta operacja to nie ta boja – szukaj dalej" data-testid="buoy-not-this">
                    to nie ta
                  </button>
                )}
              </div>
            ))}
          </details>
        )}
        {later.length > 0 && (
          <details className="pt-1.5 text-[11.5px]" data-testid="buoys-later">
            <summary className="cursor-pointer text-muted select-none">Pozostałe boje ({later.length})</summary>
            {later.map((s) => {
              const next = nextDayOf(s, today)
              return (
                <div key={s.id} className="flex flex-col py-0.5" data-testid="buoy-later" data-name={s.name}>
                  <div className="flex items-baseline gap-2">
                    <span className="num w-[70px] shrink-0 text-dim">{next ? plDate(next) : plDate(s.date)}</span>
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="num text-muted">{amountText(s)}</span>
                    {!readOnly && (
                      <button className="text-muted hover:text-fg-strong" onClick={() => setEditing((x) => (x === s.id ? null : s.id))}>
                        zmień
                      </button>
                    )}
                  </div>
                  {editing === s.id && <BuoyEditor s={s} onDone={() => setEditing(null)} />}
                </div>
              )
            })}
          </details>
        )}
      </div>
    </Panel>
  )
}

function BuoyEditor({ s, onDone }: { s: Scheduled; onDone: () => void }) {
  const [o, setO] = useState(() => formOf(s))
  const save = () => {
    if (!o.name.trim()) return toast('Nazwij boję.', 'error')
    if (o.kind !== 'term' && !o.amount) return toast('Podaj kwotę albo wybierz „termin”.', 'error')
    patchScheduled(s.id, {
      name: o.name.trim().slice(0, 80),
      date: o.date,
      amount: o.kind === 'term' ? null : signedOf({ amount: o.amount, direction: o.kind }),
      yearly: o.yearly,
      accountId: o.accountId,
      categoryId: o.kind === 'out' ? o.categoryId : null,
      counterparty: o.counterparty.trim(),
      remind: o.remind,
      note: o.note
    })
    onDone()
  }
  return (
    <div className="mt-1 flex flex-col gap-1.5 border border-line bg-raised p-2" data-testid="buoy-editor">
      <BuoyFields o={o} set={(p) => setO((x) => ({ ...x, ...p }))} />
      <div className="flex items-center gap-2">
        <button className="btn btn-accent h-[24px]" onClick={save} data-testid="buoy-update">
          Zapisz
        </button>
        <button className="btn h-[24px]" onClick={onDone}>
          Anuluj
        </button>
        <span className="flex-1" />
        <button className="text-[11.5px] text-muted hover:text-fg-strong" onClick={() => void deleteScheduled(s).then((ok) => ok && onDone())} data-testid="buoy-delete">
          usuń boję
        </button>
      </div>
    </div>
  )
}

type Form = NewScheduled & { kind: Direction }

function BuoyFields({ o, set }: { o: Form; set: (p: Partial<Form>) => void }) {
  const [remind, setRemind] = useState(o.remind.join(', '))
  return (
    <>
      <Segmented
        value={o.kind}
        options={[
          { value: 'out', label: 'Wydatek' },
          { value: 'in', label: 'Wpływ' },
          { value: 'term', label: 'Termin bez kwoty' }
        ]}
        onChange={(kind) => set({ kind, direction: kind === 'in' ? 'in' : 'out' })}
        aria-label="Rodzaj boi"
      />
      <Field label="Nazwa" labelWidth={110}>
        <input className="input h-[24px] w-full" value={o.name} maxLength={80} onChange={(e) => set({ name: e.currentTarget.value })} placeholder={o.kind === 'term' ? 'np. Wymiana dowodu' : o.kind === 'in' ? 'np. Zwrot PIT-37' : 'np. Wesele Kasi'} data-testid="buoy-name" />
      </Field>
      <Field label="Dzień" labelWidth={110}>
        <div className="flex items-center gap-3">
          <DateField className="h-[24px] w-[100px]" value={o.date} onChange={(date) => set({ date })} aria-label="Dzień boi" data-testid="buoy-date" />
          <Toggle checked={o.yearly} onChange={(yearly) => set({ yearly })} label="co roku" data-testid="buoy-yearly" />
        </div>
      </Field>
      {o.kind !== 'term' && (
        <Field label="Kwota i konto" labelWidth={110}>
          <div className="flex gap-2">
            <AmountField className="h-[24px] w-[110px]" value={o.amount} allowEmpty onChange={(amount) => set({ amount })} aria-label="Kwota boi" data-testid="buoy-amount" />
            <AccountSelect className="h-[24px]" value={o.accountId} none="konto dowolne" onChange={(accountId) => set({ accountId })} aria-label="Konto boi" data-testid="buoy-account" />
          </div>
        </Field>
      )}
      {o.kind === 'out' && (
        <Field label="Kategoria" labelWidth={110}>
          <CategorySelect className="h-[24px] w-full" value={o.categoryId} onChange={(categoryId) => set({ categoryId })} aria-label="Kategoria boi" />
        </Field>
      )}
      {o.kind !== 'term' && (
        <Field label="Kontrahent" labelWidth={110} hint="Jak w wyciągu – operacja z banku dopasuje się łatwiej (kwota i ±3 dni).">
          <input className="input h-[24px] w-full" value={o.counterparty} maxLength={300} onChange={(e) => set({ counterparty: e.currentTarget.value })} data-testid="buoy-counterparty" />
        </Field>
      )}
      <Field label="Przypomnij" labelWidth={110} hint="Dni przed terminem, po przecinku (odprawa i powiadomienia).">
        <input
          className="input h-[24px] w-[90px]"
          value={remind}
          onChange={(e) => setRemind(e.currentTarget.value)}
          onBlur={() => {
            const days = remind
              .split(/[,; ]+/)
              .map((x) => Number(x))
              .filter((x) => Number.isInteger(x) && x >= 0 && x <= 365)
            set({ remind: [...new Set(days)].sort((a, b) => b - a).slice(0, 5) })
            setRemind([...new Set(days)].sort((a, b) => b - a).slice(0, 5).join(', '))
          }}
          aria-label="Przypomnij dni przed"
          data-testid="buoy-remind"
        />
      </Field>
    </>
  )
}

export function NewBuoyPanel({ today: day }: { today: string }) {
  const blank = (): Form => ({ name: '', date: day, amount: null, direction: 'out', kind: 'out', yearly: false, accountId: null, categoryId: null, counterparty: '', remind: [14, 3], note: '' })
  // Kept while another screen is looked at (N36).
  const [o, setO, clear] = useDraft<Form>('radar:newBuoy', blank)
  const save = () => {
    if (!o.name.trim()) return toast('Nazwij boję (np. „Wesele Kasi”).', 'error')
    if (o.kind !== 'term' && !o.amount) return toast('Podaj kwotę albo wybierz „Termin bez kwoty”.', 'error')
    const made = addScheduled({ ...o, amount: o.kind === 'term' ? null : o.amount, direction: o.kind === 'in' ? 'in' : 'out', categoryId: o.kind === 'out' ? o.categoryId : null })
    if (made) clear()
  }
  return (
    <Panel title="Nowa boja" testId="radar-new-buoy">
      <div className="flex flex-col gap-2 text-[12px]">
        <BuoyFields o={o} set={(p) => setO((x) => ({ ...x, ...p }))} />
        <button className="btn btn-accent h-[26px] self-start" onClick={save} data-testid="buoy-save">
          Dodaj boję
        </button>
      </div>
    </Panel>
  )
}
