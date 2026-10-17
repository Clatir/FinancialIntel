import { useMemo, useState, type DragEvent } from 'react'
import { warsawNow } from '@shared/calc/dates'
import type { Choice, RowPlan } from '@shared/import/reconcile'
import { useData } from '../../store/data'
import { useWizard } from '../wizard/state'
import { useFleet } from '../../store/fleet'
import { navigate } from '../../store/ui'
import { AmountField, plnText, signedPln } from '../../components/fields'
import { IconChevronDown, IconChevronRight, IconImport } from '../../components/icons'
import { Columns } from '../../components/layout'
import { Badge, Panel, cx } from '../../components/ui'
import { confirmBalance } from '../balances/actions'
import { AccountSelect, CategorySelect, useAccounts, useCategories } from '../operations/pickers'
import {
  acceptHints,
  chooseGroup,
  chooseRow,
  closeImport,
  groupsOf,
  loadImportFile,
  pickImportFile,
  runImport,
  setImportAccount,
  setNoMerge,
  setRemember,
  setRemoveVanished,
  setRestoreDeleted,
  useImport,
  type ImportGroup
} from './state'

const day = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`
const fullDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

/** What a group or a row becomes, as offered by the direction of the money. */
type Option = 'expense' | 'refundable' | 'refund' | 'income' | 'household' | 'transfer' | 'trading' | 'loan' | 'tax'

const OPTIONS: Record<'in' | 'out', Array<{ value: Option; label: string }>> = {
  out: [
    { value: 'expense', label: 'Wydatek' },
    { value: 'refundable', label: 'Do zwrotu (zakup dla domu)' },
    { value: 'transfer', label: 'Przelew własny' },
    { value: 'trading', label: 'XTB – dopłata do konta tradingowego' },
    { value: 'loan', label: 'Pożyczka udzielona' },
    { value: 'tax', label: 'Podatek PIT-38' }
  ],
  in: [
    { value: 'income', label: 'Wpływ (przychód)' },
    { value: 'household', label: 'Od domownika (najpierw zwrot należności)' },
    { value: 'refund', label: 'Zwrot towaru (ujemny wydatek)' },
    { value: 'transfer', label: 'Przelew własny' },
    { value: 'trading', label: 'XTB – wypłata z konta tradingowego' },
    { value: 'loan', label: 'Zwrot pożyczki' }
  ]
}

function optionOf(c: Choice, direction: 'in' | 'out'): Option {
  if (c.kind === 'expense') return direction === 'in' ? 'refund' : c.refundable ? 'refundable' : 'expense'
  if (c.kind === 'income') return c.household ? 'household' : 'income'
  if (c.kind === 'transfer' || c.kind === 'trading' || c.kind === 'loan' || c.kind === 'tax') return c.kind
  return direction === 'in' ? 'income' : 'expense'
}

function choiceFor(option: Option, prev: Choice): Choice {
  const base: Choice = { kind: 'expense', categoryId: null, refundable: false, household: false, counterAccountId: null }
  switch (option) {
    case 'expense':
    case 'refund':
      return { ...base, categoryId: prev.kind === 'expense' ? prev.categoryId : null }
    case 'refundable':
      return { ...base, refundable: true, categoryId: prev.kind === 'expense' ? prev.categoryId : null }
    case 'income':
      return { ...base, kind: 'income' }
    case 'household':
      return { ...base, kind: 'income', household: true }
    default:
      return { ...base, kind: option }
  }
}

const SOURCE_LABEL = { rule: 'reguła', builtin: 'rozpoznane', none: 'do decyzji' } as const

function FilePanel() {
  const { fileName, file, error, accountId, busy } = useImport()
  const accounts = useAccounts()
  const [over, setOver] = useState(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (f) void f.arrayBuffer().then((b) => loadImportFile(f.name, new Uint8Array(b)))
  }
  const importable = accounts.filter((a) => !a.archived)
  return (
    <Panel title="Plik z mBanku">
      <div
        className={cx('flex flex-col gap-2 text-[12px]', over && 'outline outline-1 outline-accent/60')}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        data-testid="import-file-panel"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-accent" disabled={busy} onClick={() => void pickImportFile()} data-testid="import-pick">
            <IconImport size={13} /> Wybierz plik CSV…
          </button>
          <span className="text-muted">albo upuść go tutaj</span>
          {file && (
            <button className="btn h-[22px]" onClick={closeImport} data-testid="import-close">
              Zamknij plik
            </button>
          )}
        </div>
        <p className="text-[11.5px] text-dim">
          mBank → Historia → lista operacji → „Eksportuj” CSV (albo historia rachunku CSV). Kolejne importy mogą się nakładać: operacje już wczytane są
          rozpoznawane i pomijane. Przed zapisem powstaje kopia zapasowa.
        </p>
        {error && (
          <div className="border border-down/50 px-2 py-1.5 text-down" data-testid="import-error">
            {fileName}: {error}
          </div>
        )}
        {file && (
          <div className="flex flex-col gap-1 border-t border-line pt-2" data-testid="import-file">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="num text-fg-strong">{fileName}</span>
              <span className="text-muted">
                {file.format === 'lista' ? 'lista operacji' : 'historia rachunku'} · {file.rows.length} operacji
                {file.period ? ` · ${fullDay(file.period.from)} – ${fullDay(file.period.to)}` : ''}
              </span>
            </div>
            {file.client && <span className="text-[11.5px] text-muted">Właściciel rachunku: {file.client} – przelewy z tym nazwiskiem to przelewy własne.</span>}
            <label className="flex items-center gap-2 text-muted">
              Konto w budżecie
              <AccountSelect className="w-[180px]" value={accountId} onChange={(id) => id && setImportAccount(id)} data-testid="import-account" />
            </label>
            {importable.length > 1 && <span className="text-[11px] text-dim">Plik z mBanku trafia na wybrane konto; Portfel XTB nie ma eksportu – jego operacje dopisujesz ręcznie.</span>}
            {file.skipped.length > 0 && (
              <div className="text-[11.5px] text-accent" data-testid="import-skipped">
                Pominięte wiersze: {file.skipped.map((s) => `linia ${s.line} (${s.reason})`).join('; ')}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}

function Summary() {
  const { plan, choices, busy } = useImport()
  const readOnly = useData((s) => !!s.status?.readOnly)
  if (!plan) return null
  const n = (status: RowPlan['status']) => plan.rows.filter((p) => p.status === status).length
  const merges = plan.rows.filter((p) => p.status === 'merge')
  const merged = merges.filter((p) => !choices.noMerge[p.key]).length
  const deleted = plan.rows.filter((p) => p.status === 'deleted')
  const restored = deleted.filter((p) => choices.restoreDeleted[p.key]).length
  const created = n('new') + merges.length - merged + restored
  const removed = plan.vanished.filter((t) => choices.removeVanished[t.id]).length
  const known = n('known')
  const settledFlags = plan.rows.filter((p) => p.status === 'known' && p.settled).length
  const nothing = created + merged + n('settle') + removed + settledFlags === 0
  return (
    <Panel title="Podgląd">
      <div className="flex flex-col gap-2 text-[12px]" data-testid="import-summary">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-muted">nowe operacje</span>
          <span className="num text-right text-fg-strong" data-testid="import-count-new">
            {created}
          </span>
          <span className="text-muted">połączone z wpisami ręcznymi</span>
          <span className="num text-right" data-testid="import-count-merge">
            {merged}
          </span>
          <span className="text-muted">nierozliczone → rozliczone</span>
          <span className="num text-right" data-testid="import-count-settle">
            {n('settle') + settledFlags}
          </span>
          <span className="text-muted">już zaimportowane (bez zmian)</span>
          <span className="num text-right text-muted" data-testid="import-count-known">
            {known - settledFlags}
          </span>
          {deleted.length > 0 && (
            <>
              <span className="text-muted">usunięte przez Ciebie wcześniej (pominięte)</span>
              <span className="num text-right text-muted" data-testid="import-count-deleted">
                {deleted.length - restored}
              </span>
            </>
          )}
          {plan.vanished.length > 0 && (
            <>
              <span className="text-muted">do usunięcia (zniknęły z banku)</span>
              <span className="num text-right">{removed}</span>
            </>
          )}
        </div>
        <button className="btn btn-accent h-[30px] justify-center" disabled={busy || nothing || readOnly} onClick={() => void runImport()} data-testid="import-run">
          {busy ? 'Importuję…' : readOnly ? 'Folder tylko do odczytu' : nothing ? 'Nic nowego w tym pliku' : `Importuj (${created + merged + n('settle') + settledFlags + removed})`}
        </button>
        <p className="text-[11px] text-dim">Grupy bez decyzji wejdą jako wydatki / wpływy bez kategorii – skategoryzujesz je później w Operacjach.</p>
      </div>
    </Panel>
  )
}

function MatchesPanel() {
  const { plan, choices } = useImport()
  const cats = useCategories()
  if (!plan) return null
  const merges = plan.rows.filter((p): p is Extract<RowPlan, { status: 'merge' }> => p.status === 'merge')
  const settles = plan.rows.filter((p): p is Extract<RowPlan, { status: 'settle' }> => p.status === 'settle')
  const deleted = plan.rows.filter((p): p is Extract<RowPlan, { status: 'deleted' }> => p.status === 'deleted')
  if (!merges.length && !settles.length && !plan.vanished.length && !deleted.length) return null
  return (
    <Panel title="Dopasowania">
      <div className="flex flex-col gap-2 text-[12px]" data-testid="import-matches">
        {merges.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="label">Wpisy ręczne z banku ({merges.length})</span>
            <p className="text-[11px] text-dim">Ta sama kwota, data ±3 dni, podobny kontrahent: wpis zachowuje Twoją kategorię i godzinę, bierze dane z banku.</p>
            {merges.map((p) => (
              <label key={p.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line/60 py-1 last:border-b-0" data-testid="import-merge">
                <input type="checkbox" checked={!choices.noMerge[p.key]} onChange={(e) => setNoMerge(p.key, !e.currentTarget.checked)} />
                <span className="min-w-0 truncate">
                  <span className="text-fg-strong">{p.tx.counterparty || '(bez kontrahenta)'}</span>
                  <span className="text-muted">
                    {' '}
                    {fullDay(p.tx.date)}
                    {p.tx.time ? ` ${p.tx.time}` : ''} · {cats.label(p.tx.categoryId) || 'bez kategorii'}
                  </span>
                  <span className="text-dim"> ⟷ bank {fullDay(p.row.date)}: {p.row.counterparty || p.row.description}</span>
                </span>
                <span className="num">{signedPln(p.row.amount)}</span>
              </label>
            ))}
          </div>
        )}
        {settles.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="label">Nierozliczone, które bank rozliczył inaczej ({settles.length})</span>
            {settles.map((p) => (
              <div key={p.key} className="flex items-center gap-2 text-muted" data-testid="import-settle">
                <span className="min-w-0 flex-1 truncate">
                  {p.row.counterparty} {fullDay(p.tx.date)} → {fullDay(p.row.date)}
                </span>
                <span className="num">
                  {plnText(p.tx.amount)} → <span className="text-fg-strong">{plnText(p.row.amount)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {deleted.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="label">Usunięte przez Ciebie wcześniej ({deleted.length})</span>
            <p className="text-[11px] text-dim">Te operacje z banku były już zaimportowane i je usunąłeś – nie wracają same. Zaznacz, żeby zaimportować mimo to.</p>
            {deleted.map((p) => (
              <label key={p.key} className="flex items-center gap-2" data-testid="import-deleted">
                <input type="checkbox" checked={!!choices.restoreDeleted[p.key]} onChange={(e) => setRestoreDeleted(p.key, e.currentTarget.checked)} />
                <span className="min-w-0 flex-1 truncate">
                  {p.row.counterparty || p.row.description} {fullDay(p.row.date)}
                </span>
                <span className="num">{signedPln(p.row.amount)}</span>
              </label>
            ))}
          </div>
        )}
        {plan.vanished.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="label">Nierozliczone, których bank już nie pokazuje ({plan.vanished.length})</span>
            <p className="text-[11px] text-dim">
              Zwykle anulowana autoryzacja karty – ale lista z filtrem też ich nie pokaże. Zaznacz te do usunięcia (wracają z „Usunięte wpisy” w Synchronizacji).
            </p>
            {plan.vanished.map((t) => (
              <label key={t.id} className="flex items-center gap-2" data-testid="import-vanished">
                <input type="checkbox" checked={!!choices.removeVanished[t.id]} onChange={(e) => setRemoveVanished(t.id, e.currentTarget.checked)} />
                <span className="min-w-0 flex-1 truncate">
                  {t.counterparty} {fullDay(t.date)}
                </span>
                <span className="num">{signedPln(t.amount)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}

function GroupRow({ g }: { g: ImportGroup }) {
  const choice = useImport((s) => s.choices.groups[g.group]) ?? g.proposed
  const remember = useImport((s) => s.choices.remember[g.group] ?? false)
  const decided = useImport((s) => !!s.choices.groups[g.group])
  const rowChoices = useImport((s) => s.choices.rows)
  const cats = useCategories()
  const [open, setOpen] = useState(false)
  const option = optionOf(choice, g.direction)
  const showCategory = choice.kind === 'expense'
  const source = decided ? 'Twoja decyzja' : SOURCE_LABEL[g.source]
  return (
    <div className="border-b border-line/70 py-1.5 last:border-b-0" data-testid="import-group" data-group={g.group} data-label={g.label}>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost h-[22px] px-0.5" onClick={() => setOpen(!open)} aria-label={open ? 'Zwiń' : 'Pokaż operacje'}>
          {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </button>
        <span className="min-w-0 flex-1 truncate">
          <span className="text-fg-strong">{g.label}</span>
          <span className="text-muted">
            {' '}
            · {g.rows.length} {g.rows.length === 1 ? 'operacja' : g.rows.length < 5 ? 'operacje' : 'operacji'} · {day(g.from)}
            {g.from !== g.to ? `–${day(g.to)}` : ''}
          </span>
        </span>
        <span className={cx('num shrink-0 text-right', g.sum > 0 ? 'text-up' : 'text-fg-strong')}>{signedPln(g.sum)}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 pl-6">
        <select className="input h-[24px] w-[230px] py-0" value={option} onChange={(e) => chooseGroup(g.group, choiceFor(e.currentTarget.value as Option, choice))} aria-label="Co to jest" data-testid="import-group-kind">
          {OPTIONS[g.direction].map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {showCategory && (
          <CategorySelect className="h-[24px] min-w-[180px] flex-1 py-0" value={choice.categoryId} onChange={(categoryId) => chooseGroup(g.group, { ...choice, categoryId })} data-testid="import-group-category" />
        )}
        <Badge tone={g.source === 'none' && !decided ? 'warn' : 'default'} title={g.reason}>
          {source}
        </Badge>
        {decided && (
          <label className="flex items-center gap-1 text-[11px] text-muted" title="Kolejne importy rozpoznają tego kontrahenta same">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(g.group, e.currentTarget.checked)} data-testid="import-group-remember" />
            zapamiętaj
          </label>
        )}
        {!decided && g.source !== 'rule' && <span className="truncate text-[11px] text-dim">{g.reason}</span>}
      </div>
      {showCategory && !choice.categoryId && g.hint && (
        <div className="mt-0.5 pl-6 text-[11px] text-dim">
          kategoria mBanku „{g.bankCategory}” →{' '}
          <button type="button" className="text-accent hover:underline" onClick={() => chooseGroup(g.group, { ...choice, categoryId: g.hint })} data-testid="import-group-hint">
            {cats.label(g.hint)}?
          </button>
        </div>
      )}
      {open && (
        <div className="mt-1 flex flex-col pl-6" data-testid="import-group-rows">
          {g.rows.map((p) => {
            const own = rowChoices[p.key]
            const c = own ?? choice
            return (
              <div key={p.key} className="grid grid-cols-[48px_minmax(0,1fr)_96px_200px] items-center gap-2 py-[1px] text-[11.5px]" data-testid="import-row">
                <span className="num text-muted">{day(p.row.date)}</span>
                <span className="min-w-0 truncate text-muted" title={p.row.description}>
                  {p.row.title || p.row.description}
                  {p.row.pending && <span className="ml-1 text-accent">nierozliczona</span>}
                </span>
                <span className={cx('num text-right', p.row.amount > 0 ? 'text-up' : 'text-fg')}>{signedPln(p.row.amount)}</span>
                {c.kind === 'expense' ? (
                  <CategorySelect
                    className={cx('h-[22px] py-0 text-[11px]', own && 'border-accent/60')}
                    value={c.categoryId}
                    emptyLabel={own ? '— bez kategorii —' : '(jak grupa)'}
                    onChange={(categoryId) => chooseRow(p.key, categoryId === choice.categoryId ? null : { ...c, categoryId })}
                  />
                ) : (
                  <span />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GroupsPanel() {
  const plan = useImport((s) => s.plan)
  const groups = useMemo(() => groupsOf(plan), [plan])
  const choices = useImport((s) => s.choices.groups)
  if (!plan) return null
  const hintable = groups.filter((g) => {
    const c = choices[g.group] ?? g.proposed
    return c.kind === 'expense' && !c.categoryId && g.hint
  })
  const undecided = groups.filter((g) => !choices[g.group] && g.source === 'none').length
  return (
    <Panel
      title="Kategoryzacja"
      actions={
        hintable.length > 0 ? (
          <button className="btn h-[22px]" onClick={() => acceptHints(hintable)} title="Kategoria mBanku jako Twoja decyzja – sprawdź, bywa nietrafiona (np. XTB jako „Ubezpieczenia”)" data-testid="import-accept-hints">
            Przyjmij podpowiedzi mBanku ({hintable.length})
          </button>
        ) : undefined
      }
    >
      <p className="mb-1 text-[11.5px] text-muted">
        {groups.length === 0
          ? 'Brak nowych operacji do kategoryzacji.'
          : `Nowe operacje w ${groups.length} grupach po kontrahencie (${undecided} do decyzji). Decyzja dla grupy obejmuje wszystkie jej operacje i – z „zapamiętaj” – kolejne importy. Kategorie mBanku są tylko podpowiedzią.`}
      </p>
      <div className="flex flex-col" data-testid="import-groups">
        {groups.map((g) => (
          <GroupRow key={g.group} g={g} />
        ))}
      </div>
    </Panel>
  )
}

/** Potwierdzanie sald (spec): the bank's balance against the operations; a difference = a correction to explain. */
export function BalanceCheck() {
  const accounts = useAccounts()
  const fleet = useFleet()
  const [values, setValues] = useState<Record<string, number | null>>({})
  const today = warsawNow().date
  return (
    <Panel title="Potwierdzenie sald">
      <div className="flex flex-col gap-1.5 text-[12px]" data-testid="balance-check">
        <p className="text-[11.5px] text-muted">Wpisz saldo z aplikacji banku (raz w tygodniu). Różnica = korekta „rozbieżność w ładowni” do wyjaśnienia w Operacjach.</p>
        {accounts
          .filter((a) => !a.archived)
          .map((a) => {
            const balance = fleet?.accounts.find((x) => x.id === a.id)?.balance ?? 0
            const v = values[a.id] ?? null
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-2" data-testid="balance-row" data-name={a.name}>
                <span className="w-[110px] truncate text-fg-strong">{a.name}</span>
                <span className="w-[150px] text-muted">
                  operacje: <span className="num text-fg">{plnText(balance)} zł</span>
                </span>
                <AmountField className="w-[120px]" value={v} allowNegative allowEmpty placeholder="w banku" onChange={(x) => setValues({ ...values, [a.id]: x })} aria-label={`Saldo ${a.name} w banku`} data-testid="balance-input" />
                <button
                  type="button"
                  className="btn h-[22px]"
                  disabled={v == null}
                  onClick={() => {
                    if (v == null) return
                    confirmBalance(a.id, v, today, a.name)
                    setValues({ ...values, [a.id]: null })
                  }}
                  data-testid="balance-confirm"
                >
                  Potwierdź
                </button>
              </div>
            )
          })}
      </div>
    </Panel>
  )
}

function DonePanel() {
  const done = useImport((s) => s.done)
  if (!done) return null
  return (
    <Panel title="Import zakończony">
      <div className="flex flex-col gap-1.5 text-[12px]" data-testid="import-done">
        <span>
          Nowe: <b className="num">{done.counts.created}</b> · połączone z wpisami: <b className="num">{done.counts.merged}</b> · rozliczone: <b className="num">{done.counts.settled}</b> · usunięte: <b className="num">{done.counts.removed}</b>
          {done.counts.skipped > 0 ? ` · pominięte (usunięte wcześniej): ${done.counts.skipped}` : ''}
          {done.rules > 0 ? ` · nowe reguły: ${done.rules}` : ''}
        </span>
        <span className="num truncate text-[11px] text-dim" title={done.backup}>
          kopia przed importem: {done.backup}
        </span>
        <div className="flex gap-2">
          <button className="btn h-[24px]" onClick={() => navigate({ page: 'operations' })} data-testid="import-to-operations">
            Zobacz w Operacjach
          </button>
        </div>
      </div>
    </Panel>
  )
}

export function ImportPage() {
  const plan = useImport((s) => s.plan)
  const done = useImport((s) => s.done)
  const lastImport = useData((s) => s.fi?.settings.import.lastImport ?? null)
  const accounts = useAccounts()
  const last = Object.entries(lastImport ?? {})
    .map(([id, at]) => `${accounts.find((a) => a.id === id)?.name ?? '?'}: ${new Date(at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}`)
    .join(' · ')
  const wizard = useWizard((w) => w.active)
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="page-import">
      <div className="flex shrink-0 items-baseline gap-3 border-b border-line px-4 py-2.5">
        <h1 className="text-[15px] font-medium text-fg-strong">Import</h1>
        <span className="text-[12px] text-muted">CSV z mBanku</span>
        <span className="flex-1" />
        {last && <span className="text-[11px] text-dim">ostatni import – {last}</span>}
        {wizard && (
          <button className="btn btn-accent h-[24px] self-center" onClick={() => navigate({ page: 'wizard' })} data-testid="import-back-to-wizard">
            Wróć do kreatora
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="main" tracks={['minmax(320px, 1fr)', 'minmax(420px, 2fr)']} className="grid min-h-full items-start">
          <div className="flex min-w-0 flex-col">
            <FilePanel />
            <Summary />
            <DonePanel />
            {(done || !plan) && <BalanceCheck />}
          </div>
          <div className="flex min-w-0 flex-col">
            <MatchesPanel />
            <GroupsPanel />
            {!plan && (
              <Panel title="Kategoryzacja">
                <div className="p-4 text-center text-[12px] text-dim">Wybierz plik CSV z mBanku – operacje pojawią się tu w grupach po kontrahencie.</div>
              </Panel>
            )}
          </div>
        </Columns>
      </div>
    </div>
  )
}
