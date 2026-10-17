import { useDeferredValue, useEffect, useMemo, useState, type DragEvent } from 'react'
import { warsawNow } from '@shared/calc/dates'
import type { DecisionSource } from '@shared/import/classify'
import { importGroups, importThemes, searchGroups, type Choice, type ImportGroup, type ImportTheme, type NewRow, type OpKind, type RowPlan } from '@shared/import/reconcile'
import { TX_KIND_LABEL, type TxKind } from '@shared/schema'
import { useData } from '../../store/data'
import { useRecordList } from '../../store/records'
import { useWizard } from '../wizard/state'
import { useFleet } from '../../store/fleet'
import { navigate, toast } from '../../store/ui'
import { AmountField, plnText, signedPln } from '../../components/fields'
import { IconChevronDown, IconChevronRight, IconImport, IconSearch } from '../../components/icons'
import { Columns } from '../../components/layout'
import { Badge, Panel, cx } from '../../components/ui'
import { confirmBalance } from '../balances/actions'
import { AccountSelect, CategorySelect, useAccounts, useCategories } from '../operations/pickers'
import { KeywordRules } from './KeywordRules'
import { BULK_OPTIONS, OPTIONS, choiceFor, optionOf, type Option } from './options'
import {
  acceptHints,
  acceptSure,
  chooseGroup,
  chooseRow,
  chooseSelected,
  chooseTheme,
  clearGroup,
  clearImportSelection,
  closeImport,
  hintable,
  loadImportFile,
  pickImportFile,
  replanImport,
  runImport,
  selectImport,
  setImportAccount,
  setImportQuery,
  setNoMerge,
  setRemember,
  setRememberTheme,
  setRemoveVanished,
  setRestoreDeleted,
  setSkip,
  skipSelected,
  themeStatus,
  useImport,
  type ThemeStatus
} from './state'

const day = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`
const fullDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

const SOURCE_LABEL: Record<DecisionSource, string> = { rule: 'reguła', builtin: 'rozpoznane', brand: 'sieć', keyword: 'słowo kluczowe', none: 'do decyzji' }
const THEME_SOURCE: Record<DecisionSource, string> = { rule: 'Twoje reguły', builtin: 'rozpoznane', brand: 'sieci', keyword: 'słowa kluczowe', none: 'do decyzji' }
const OP_LABEL: Record<'in' | 'out', Record<OpKind, string>> = {
  out: { card: 'Zakupy bez rozpoznania', transfer: 'Przelewy wychodzące', fee: 'Opłaty banku', other: 'Inne wydatki' },
  in: { card: 'Wpływy z zakupów', transfer: 'Wpływy przelewem', fee: 'Inne wpływy', other: 'Inne wpływy' }
}
const STATUS_LABEL: Record<ThemeStatus, string> = { todo: 'Do decyzji', check: 'Rozpoznane – sprawdź', done: 'Gotowe' }

const count = (n: number, one: string, few: string, many: string) => `${n} ${n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many}`
const operations = (n: number) => count(n, 'operacja', 'operacje', 'operacji')

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
  const excluded = plan.rows.filter((p) => (p.status === 'new' || (p.status === 'deleted' && choices.restoreDeleted[p.key])) && choices.skip[p.key]).length
  const created = n('new') + merges.length - merged + restored - excluded
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
          {excluded > 0 && (
            <>
              <span className="text-muted">pominięte przez Ciebie (nie importuj)</span>
              <span className="num text-right text-muted" data-testid="import-count-excluded">
                {excluded}
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
        <p className="text-[11px] text-dim">
          Rozpoznane (sieci, słowa kluczowe, reguły) wejdą z pokazaną decyzją; tematy bez decyzji – jako wydatki / wpływy bez kategorii, skategoryzujesz je później w
          Operacjach.
        </p>
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

/** A theme's name: its category (or kind, container), the bank's category it hints at, or the kind of operation. */
function themeLabel(t: ImportTheme, catLabel: (id: string | null) => string, containerName: (id: string) => string): string {
  const b = t.basis
  if (b.kind === 'hint') return `mBank: ${b.bankCategories.join(', ') || 'kategoria'}`
  if (b.kind === 'op') return OP_LABEL[t.direction][b.op]
  if (b.containerId) return `Ładownia · ${containerName(b.containerId)}`
  const c = b.choice
  if (c.kind === 'expense') {
    const cat = catLabel(c.categoryId) || 'bez kategorii'
    return t.direction === 'in' ? `Zwroty · ${cat}` : c.refundable ? `Do zwrotu · ${cat}` : cat
  }
  if (c.kind === 'income') return c.household ? 'Od domownika' : 'Wpływy (przychód)'
  if (c.kind === 'transfer') return 'Przelewy własne'
  if (c.kind === 'trading') return t.direction === 'out' ? 'XTB – dopłaty do konta tradingowego' : 'XTB – wypłaty z konta tradingowego'
  if (c.kind === 'loan') return 'Pożyczki'
  if (c.kind === 'tax') return 'Podatek PIT-38'
  return TX_KIND_LABEL[c.kind as TxKind] ?? c.kind
}

const nothing = (direction: 'in' | 'out'): Choice => ({ kind: direction === 'out' ? 'expense' : 'income', categoryId: null, refundable: false, household: false, counterAccountId: null })

/** The kind and the category of a decision (a theme's, a group's). */
function DecisionFields({ choice, direction, onChange, testId }: { choice: Choice; direction: 'in' | 'out'; onChange: (c: Choice) => void; testId: string }) {
  const option = optionOf(choice, direction)
  return (
    <>
      <select className="input h-[24px] w-[230px] py-0" value={option} onChange={(e) => onChange(choiceFor(e.currentTarget.value as Option, choice))} aria-label="Co to jest" data-testid={`${testId}-kind`}>
        {OPTIONS[direction].map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {choice.kind === 'expense' && (
        <CategorySelect className="h-[24px] min-w-[180px] flex-1 py-0" value={choice.categoryId} onChange={(categoryId) => onChange({ ...choice, categoryId })} data-testid={`${testId}-category`} />
      )}
    </>
  )
}

function GroupRow({ g, inherited, themeDecided, found }: { g: ImportGroup; inherited: Choice; themeDecided: boolean; found: NewRow[] | 'all' | undefined }) {
  const own = useImport((s) => s.choices.groups[g.group])
  const remember = useImport((s) => s.choices.remember[g.group] ?? false)
  const rowChoices = useImport((s) => s.choices.rows)
  const skip = useImport((s) => s.choices.skip)
  const checked = useImport((s) => !!s.selected.groups[g.group])
  const selectedRows = useImport((s) => s.selected.rows)
  const cats = useCategories()
  const [open, setOpen] = useState(false)
  const partial = Array.isArray(found)
  const shown = partial ? found : g.rows
  const choice = own ?? inherited
  const skipped = g.rows.filter((p) => skip[p.key]).length
  const badge = own ? 'Twoja decyzja' : themeDecided ? 'jak temat' : SOURCE_LABEL[g.source]
  return (
    <div className="border-t border-line/50 py-1 pl-6" data-testid="import-group" data-group={g.group} data-label={g.label}>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={checked} onChange={(e) => selectImport({ groups: [g.group] }, e.currentTarget.checked)} aria-label={`Zaznacz ${g.label}`} data-testid="import-group-select" />
        <button type="button" className="btn btn-ghost h-[22px] px-0.5" onClick={() => setOpen(!open)} aria-label={open ? 'Zwiń' : 'Pokaż operacje'} data-testid="import-group-toggle">
          {open || partial ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </button>
        <span className={cx('min-w-0 flex-1 truncate', skipped === g.rows.length && 'line-through opacity-60')} title={g.names.length > 1 ? `Nazwy w banku: ${g.names.join(' · ')}` : undefined}>
          <span className="text-fg-strong">{g.label}</span>
          <span className="text-muted">
            {' '}
            · {operations(g.rows.length)}
            {g.names.length > 1 ? ` · ${g.names.length} nazwy` : ''} · {day(g.from)}
            {g.from !== g.to ? `–${day(g.to)}` : ''}
            {skipped > 0 ? ` · pominięte: ${skipped}` : ''}
          </span>
        </span>
        <span className={cx('num shrink-0 text-right', g.sum > 0 ? 'text-up' : 'text-fg-strong')}>{signedPln(g.sum)}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 pl-12">
        <DecisionFields choice={choice} direction={g.direction} onChange={(c) => chooseGroup(g.group, c)} testId="import-group" />
        <Badge tone={g.source === 'none' && !own && !themeDecided ? 'warn' : 'default'} title={g.reason}>
          {badge}
        </Badge>
        {own && !g.byTitle && (
          <label className="flex items-center gap-1 text-[11px] text-muted" title="Kolejne importy rozpoznają tę markę same">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(g.group, e.currentTarget.checked)} data-testid="import-group-remember" />
            zapamiętaj
          </label>
        )}
        {own && (
          <button type="button" className="text-[11px] text-muted hover:text-fg-strong hover:underline" onClick={() => clearGroup(g.group)} data-testid="import-group-reset">
            jak temat
          </button>
        )}
        {!own && !themeDecided && g.source !== 'rule' && <span className="truncate text-[11px] text-dim">{g.reason}</span>}
        {g.byTitle && <span className="text-[11px] text-dim">z tytułu przelewu – bez reguły</span>}
      </div>
      {choice.kind === 'expense' && !choice.categoryId && g.hint && (
        <div className="mt-0.5 pl-12 text-[11px] text-dim">
          kategoria mBanku „{g.bankCategory}” →{' '}
          <button type="button" className="text-accent hover:underline" onClick={() => chooseGroup(g.group, { ...choice, categoryId: g.hint })} data-testid="import-group-hint">
            {cats.label(g.hint)}?
          </button>
        </div>
      )}
      {(open || partial) && (
        <div className="mt-1 flex flex-col pl-12" data-testid="import-group-rows">
          {shown.map((p) => {
            const mine = rowChoices[p.key]
            const c = mine ?? choice
            const out = skip[p.key]
            return (
              <div key={p.key} className={cx('grid grid-cols-[18px_48px_minmax(0,1fr)_96px_200px_64px] items-center gap-2 py-[1px] text-[11.5px]', out && 'opacity-50')} data-testid="import-row">
                <input type="checkbox" checked={!!selectedRows[p.key]} onChange={(e) => selectImport({ rows: [p.key] }, e.currentTarget.checked)} aria-label="Zaznacz operację" data-testid="import-row-select" />
                <span className="num text-muted">{day(p.row.date)}</span>
                <span className={cx('min-w-0 truncate text-muted', out && 'line-through')} title={p.row.description}>
                  {p.row.title || p.row.description}
                  {p.row.pending && <span className="ml-1 text-accent">nierozliczona</span>}
                </span>
                <span className={cx('num text-right', p.row.amount > 0 ? 'text-up' : 'text-fg')}>{signedPln(p.row.amount)}</span>
                {c.kind === 'expense' ? (
                  <CategorySelect
                    className={cx('h-[22px] py-0 text-[11px]', mine && 'border-accent/60')}
                    value={c.categoryId}
                    emptyLabel={mine ? '— bez kategorii —' : '(jak grupa)'}
                    onChange={(categoryId) => chooseRow(p.key, categoryId === choice.categoryId ? null : { ...c, categoryId })}
                  />
                ) : (
                  <span />
                )}
                <button type="button" className="text-[11px] text-muted hover:text-fg-strong hover:underline" onClick={() => setSkip([p.key], !out)} data-testid="import-row-skip">
                  {out ? 'importuj' : 'pomiń'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ThemeRow({ t, label, status, found, searching }: { t: ImportTheme; label: string; status: ThemeStatus; found: Map<string, NewRow[] | 'all'>; searching: boolean }) {
  const decided = useImport((s) => s.choices.themes[t.theme])
  const remember = useImport((s) => s.choices.rememberThemes[t.theme] ?? false)
  const allChecked = useImport((s) => t.groups.every((g) => s.selected.groups[g.group]))
  const cats = useCategories()
  const [open, setOpen] = useState(status === 'todo')
  const shown = t.groups.filter((g) => found.has(g.group))
  const expanded = open || searching
  const proposed = t.basis.kind === 'proposal' ? t.basis.choice : nothing(t.direction)
  const choice = decided ?? proposed
  return (
    <div className="border-b border-line/70 py-1.5 last:border-b-0" data-testid="import-theme" data-theme={t.theme} data-label={label} data-status={status}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => selectImport({ groups: shown.map((g) => g.group) }, e.currentTarget.checked)}
          aria-label={`Zaznacz temat ${label}`}
          data-testid="import-theme-select"
        />
        <button type="button" className="btn btn-ghost h-[22px] px-0.5" onClick={() => setOpen(!open)} aria-label={expanded ? 'Zwiń' : 'Pokaż marki'} data-testid="import-theme-toggle">
          {expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </button>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium text-fg-strong">{label}</span>
          <span className="text-muted">
            {' '}
            · {count(t.groups.length, 'marka', 'marki', 'marek')} · {operations(t.count)}
          </span>
        </span>
        <span className={cx('num shrink-0 text-right', t.sum > 0 ? 'text-up' : 'text-fg-strong')}>{signedPln(t.sum)}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 pl-6">
        <DecisionFields choice={choice} direction={t.direction} onChange={(c) => chooseTheme(t.theme, c)} testId="import-theme" />
        <Badge tone={status === 'todo' ? 'warn' : status === 'check' ? 'accent' : 'default'}>{decided ? 'Twoja decyzja' : THEME_SOURCE[t.source]}</Badge>
        {decided && (
          <label className="flex items-center gap-1 text-[11px] text-muted" title="Kolejne importy rozpoznają marki tego tematu same">
            <input type="checkbox" checked={remember} onChange={(e) => setRememberTheme(t.theme, e.currentTarget.checked)} data-testid="import-theme-remember" />
            zapamiętaj
          </label>
        )}
        {!decided && t.basis.kind === 'hint' && t.direction === 'out' && (
          <span className="text-[11px] text-dim">
            podpowiedź mBanku →{' '}
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => chooseTheme(t.theme, { ...nothing('out'), categoryId: t.basis.kind === 'hint' ? t.basis.categoryId : null }, false)}
              data-testid="import-theme-hint"
            >
              {cats.label(t.basis.categoryId)}?
            </button>
          </span>
        )}
      </div>
      {expanded && (
        <div className="mt-1 flex flex-col" data-testid="import-theme-groups">
          {shown.map((g) => (
            <GroupRow key={g.group} g={g} inherited={decided ?? g.proposed} themeDecided={!!decided} found={found.get(g.group)} />
          ))}
        </div>
      )}
    </div>
  )
}

/** One decision, or „nie importuj”, for everything ticked (1.2.1). */
function BulkBar({ groups }: { groups: readonly ImportGroup[] }) {
  const selected = useImport((s) => s.selected)
  const [option, setOption] = useState<Option>('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const nGroups = Object.keys(selected.groups).length
  const nRows = Object.keys(selected.rows).length
  if (!nGroups && !nRows) return null
  const rows = groups.filter((g) => selected.groups[g.group]).reduce((s, g) => s + g.rows.length, 0) + nRows
  const apply = () => {
    const { applied, unfit } = chooseSelected(groups, option, option === 'expense' || option === 'refundable' ? categoryId : null)
    toast(unfit ? `Ustawiono dla ${applied}; ${unfit} nie pasuje do kierunku pieniędzy (wpływ / wydatek) – bez zmian.` : `Ustawiono dla ${applied}.`, unfit ? 'info' : 'success', 4000)
  }
  return (
    <div className="sticky top-0 z-10 mb-1 flex flex-wrap items-center gap-2 border border-accent/50 bg-raised px-2 py-1.5 text-[12px]" data-testid="import-bulk">
      <span className="text-fg-strong" data-testid="import-bulk-count">
        Zaznaczone: {nGroups ? `${count(nGroups, 'grupa', 'grupy', 'grup')}, ` : ''}
        {operations(rows)}
      </span>
      <select className="input h-[24px] w-[220px] py-0" value={option} onChange={(e) => setOption(e.currentTarget.value as Option)} aria-label="Decyzja dla zaznaczonych" data-testid="import-bulk-kind">
        {BULK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {(option === 'expense' || option === 'refundable') && <CategorySelect className="h-[24px] min-w-[170px] py-0" value={categoryId} onChange={setCategoryId} data-testid="import-bulk-category" />}
      <button type="button" className="btn btn-accent h-[24px]" onClick={apply} data-testid="import-bulk-apply">
        Ustaw
      </button>
      <button type="button" className="btn h-[24px]" onClick={() => toast(`Nie importuję: ${operations(skipSelected(groups, true))}.`, 'info', 3500)} data-testid="import-bulk-skip">
        Nie importuj
      </button>
      <button type="button" className="btn h-[24px]" onClick={() => skipSelected(groups, false)} data-testid="import-bulk-unskip">
        Importuj jednak
      </button>
      <button type="button" className="btn btn-ghost h-[24px]" onClick={clearImportSelection} data-testid="import-bulk-clear">
        Odznacz
      </button>
    </div>
  )
}

function ThemesPanel() {
  const plan = useImport((s) => s.plan)
  const choices = useImport((s) => s.choices)
  const query = useImport((s) => s.query)
  const cats = useCategories()
  const containers = useRecordList('containers')
  const groups = useMemo(() => importGroups(plan), [plan])
  const themes = useMemo(() => importThemes(groups), [groups])
  const search = useDeferredValue(query)
  const found = useMemo(() => searchGroups(groups, search, (id) => cats.label(id)), [groups, search, cats])
  const [closed, setClosed] = useState<Record<ThemeStatus, boolean>>({ todo: false, check: false, done: true })
  if (!plan) return null
  const containerName = (id: string) => containers.find((c) => c.id === id)?.name ?? 'kontener'
  const status = new Map(themes.map((t) => [t.theme, themeStatus(t, choices)]))
  const sure = themes.filter((t) => t.basis.kind === 'proposal' && status.get(t.theme) === 'check')
  const hints = hintable(themes, choices)
  const searching = !!search.trim()
  const visible = themes.filter((t) => t.groups.some((g) => found.has(g.group)))
  const visibleGroups = visible.flatMap((t) => t.groups.filter((g) => found.get(g.group) === 'all').map((g) => g.group))
  const visibleRows = visible.flatMap((t) => t.groups.flatMap((g) => {
    const f = found.get(g.group)
    return Array.isArray(f) ? f.map((p) => p.key) : []
  }))
  const counts = { todo: 0, check: 0, done: 0 }
  for (const s of status.values()) counts[s]++
  return (
    <Panel
      title="Kategoryzacja"
      actions={
        <div className="flex gap-1.5">
          {sure.length > 0 && (
            <button className="btn h-[22px]" onClick={() => acceptSure(sure)} title="Sieci ze słownika, słowa kluczowe i rozpoznanie aplikacji jako Twoja decyzja – zapamiętane dla kolejnych importów" data-testid="import-accept-sure">
              Przyjmij pewne ({sure.length})
            </button>
          )}
          {hints.length > 0 && (
            <button className="btn h-[22px]" onClick={() => acceptHints(hints)} title="Kategoria mBanku jako decyzja tego importu, bez zapamiętania – sprawdź, bywa nietrafiona (np. XTB jako „Ubezpieczenia”)" data-testid="import-accept-hints">
              Przyjmij podpowiedzi mBanku ({hints.length})
            </button>
          )}
        </div>
      }
    >
      <p className="mb-1.5 text-[11.5px] text-muted" data-testid="import-themes-summary">
        {groups.length === 0
          ? 'Brak nowych operacji do kategoryzacji.'
          : `Nowe operacje: ${count(groups.length, 'grupa', 'grupy', 'grup')} w ${count(themes.length, 'temacie', 'tematach', 'tematach')} – do decyzji ${counts.todo}, do sprawdzenia ${counts.check}, gotowe ${counts.done}. Decyzja tematu obejmuje wszystkie jego marki; marka i operacja mogą mieć własną. Kategorie mBanku są tylko podpowiedzią.`}
      </p>
      {groups.length > 0 && (
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <div className="relative w-[260px]">
            <IconSearch size={13} className="absolute top-1/2 left-2 -translate-y-1/2 text-dim" />
            <input className="input pl-7" placeholder="Szukaj: nazwa, tytuł, kategoria, kwota…" value={query} onChange={(e) => setImportQuery(e.currentTarget.value)} data-testid="import-search" />
          </div>
          {searching && (
            <span className="text-[11px] text-muted" data-testid="import-search-count">
              znaleziono: {count(visibleGroups.length, 'grupa', 'grupy', 'grup')}
              {visibleRows.length ? ` + ${operations(visibleRows.length)}` : ''}
            </span>
          )}
          <button type="button" className="btn h-[22px]" onClick={() => selectImport({ groups: visibleGroups, rows: visibleRows }, true)} data-testid="import-select-visible">
            Zaznacz {searching ? 'znalezione' : 'wszystkie'}
          </button>
          {searching && (
            <button type="button" className="text-[11px] text-muted hover:text-fg-strong hover:underline" onClick={() => setImportQuery('')}>
              wyczyść
            </button>
          )}
        </div>
      )}
      <BulkBar groups={groups} />
      <div className="flex flex-col" data-testid="import-groups">
        {(['todo', 'check', 'done'] as const).map((st) => {
          const list = visible.filter((t) => status.get(t.theme) === st)
          if (!list.length) return null
          const isClosed = closed[st] && !searching
          return (
            <div key={st} className="mb-1" data-testid={`import-section-${st}`}>
              <button type="button" className="flex w-full items-center gap-1 border-b border-line py-1 text-left text-[11px] uppercase tracking-wide text-muted hover:text-fg-strong" onClick={() => setClosed({ ...closed, [st]: !closed[st] })}>
                {isClosed ? <IconChevronRight size={11} /> : <IconChevronDown size={11} />}
                {STATUS_LABEL[st]} · {list.length}
              </button>
              {!isClosed &&
                list.map((t) => <ThemeRow key={t.theme} t={t} label={themeLabel(t, (id) => cats.label(id), containerName)} status={st} found={found} searching={searching} />)}
            </div>
          )
        })}
        {searching && visible.length === 0 && <div className="p-3 text-center text-[12px] text-dim">Nic nie pasuje do „{search}”.</div>}
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
          {done.counts.excluded > 0 ? ` · nie importowane (Twój wybór): ${done.counts.excluded}` : ''}
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
  const rules = useData((s) => s.fi?.settings.import.rules)
  // A keyword added or a rule deleted (here, in the settings, on another computer): the open file planned again.
  useEffect(() => replanImport(), [rules])
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
            {plan && (
              <Panel title="Słowa kluczowe">
                <KeywordRules />
              </Panel>
            )}
            <DonePanel />
            {(done || !plan) && <BalanceCheck />}
          </div>
          <div className="flex min-w-0 flex-col">
            <MatchesPanel />
            <ThemesPanel />
            {!plan && (
              <Panel title="Kategoryzacja">
                <div className="p-4 text-center text-[12px] text-dim">Wybierz plik CSV z mBanku – operacje pojawią się tu w tematach (kategoriach) i grupach marek.</div>
              </Panel>
            )}
          </div>
        </Columns>
      </div>
    </div>
  )
}
