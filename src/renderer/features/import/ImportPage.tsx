import { memo, useDeferredValue, useEffect, useMemo, useState, type DragEvent } from 'react'
import { useShallow } from 'zustand/shallow'
import { warsawNow } from '@shared/calc/dates'
import type { DecisionSource } from '@shared/import/classify'
import { choiceOf, importThemes, joins, learnable, movesHere, searchGroups, type Choice, type ImportGroup, type ImportTheme, type NewRow, type OpKind, type RowPlan } from '@shared/import/reconcile'
import { TX_KIND_LABEL, type HouseholdMember, type Share, type TxKind } from '@shared/schema'
import { shareComplete, startShare } from '@shared/calc/share'
import { memberName } from '@shared/calc/household'
import { opKindOf } from '@shared/import/reconcile'
import { useData, useFolderLocked } from '../../store/data'
import { useRecordList } from '../../store/records'
import { useWizard } from '../wizard/state'
import { useFleet } from '../../store/fleet'
import { navigate, toast } from '../../store/ui'
import { AmountField, plnText, signedPln } from '../../components/fields'
import { IconChevronDown, IconChevronRight, IconImport, IconSearch } from '../../components/icons'
import { Columns } from '../../components/layout'
import { Badge, Panel, ShowMore, cx } from '../../components/ui'
import { confirmBalance } from '../balances/actions'
import { AccountSelect, CategorySelect, useAccounts, useCategories } from '../operations/pickers'
import { accountNumberOf, accountNumberText } from '@shared/import/mbank'
import { DecisionFields, IMPORT_SHARE_MODES } from './DecisionFields'
import { DuplicatesPanel } from './DuplicatesPanel'
import { useLatestImport } from './batches'
import { BankTelemetry } from './BankTelemetry'
import { UndoImportButton } from './RecentImports'
import { KeywordRules } from './KeywordRules'
import { mergeSelectedNames, namesToMerge, RuleProposal, SimilarPanel } from './Learning'
import { keywordOfSearch, saveKeywordRule } from './rules'
import { bulkOptions, hasCategory, type LoanPick, type Option } from './options'
import { addMemberFromBank, useMembers } from '../household/actions'
import { ShareEditor, shareNames } from '../household/ShareEditor'
import {
  acceptGroupHint,
  acceptHints,
  acceptSure,
  chooseRow,
  chooseSelected,
  chooseTheme,
  clearGroup,
  clearImportSelection,
  closeImport,
  decideGroup,
  hintable,
  loadImportFile,
  pickImportFile,
  planInputsNow,
  replanIfChanged,
  runImport,
  selectImport,
  selectedRowKeys,
  setImportAccount,
  setImportQuery,
  setMoveHere,
  setNoMerge,
  setRemember,
  setRememberTheme,
  setRemoveVanished,
  setRestoreDeleted,
  setSkip,
  skipSelected,
  themeStatus,
  useImport,
  useImportGroups,
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

/**
 * The file's bank account against the one the budget's account had (F4): a file of another account is said before the
 * import – the import goes on when the user wants it (a new account at the bank).
 */
function AccountWarning({ account, accountId }: { account: string | null; accountId: string }) {
  const numbers = useData((s) => s.fi?.settings.import.accountNumbers)
  const accounts = useAccounts()
  const number = accountNumberOf(account)
  if (!number || !numbers) return null
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'inne konto'
  const other = Object.entries(numbers).find(([id, n]) => n === number && id !== accountId)?.[0]
  const mine = numbers[accountId]
  if (!other && (!mine || mine === number)) return null
  return (
    <div className="border border-accent/50 px-2 py-1.5 text-[11.5px] text-accent" data-testid="import-account-warning">
      {other
        ? `Pliki z tego rachunku (${accountNumberText(number)}) trafiały dotąd na konto „${name(other)}” – sprawdź, czy wybrane konto się zgadza.`
        : `Plik jest z rachunku ${accountNumberText(number)}, a na konto „${name(accountId)}” trafiały dotąd pliki z rachunku ${accountNumberText(mine!)} – sprawdź wybrane konto. Nowy rachunek w banku? Import go zapamięta.`}
    </div>
  )
}

function FilePanel() {
  const { fileName, file, error, errorName, accountId, busy } = useImport(useShallow((s) => ({ fileName: s.fileName, file: s.file, error: s.error, errorName: s.errorName, accountId: s.accountId, busy: s.busy })))
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
            {errorName ?? fileName}: {error}
            {file && errorName && errorName !== fileName && <span className="text-muted"> – otwarty plik „{fileName}” zostaje bez zmian.</span>}
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
            <AccountWarning account={file.account} accountId={accountId} />
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
  // What it counts (W17): not the ticks, the search or the proposals.
  const { plan, choices, busy } = useImport(useShallow((s) => ({ plan: s.plan, choices: s.choices, busy: s.busy })))
  const readOnly = useFolderLocked()
  if (!plan) return null
  const n = (status: RowPlan['status']) => plan.rows.filter((p) => p.status === status).length
  const merges = plan.rows.filter((p) => p.status === 'merge')
  const merged = merges.filter((p) => joins(p, choices)).length
  const deleted = plan.rows.filter((p) => p.status === 'deleted')
  const restored = deleted.filter((p) => choices.restoreDeleted[p.key]).length
  const excluded = plan.rows.filter((p) => (p.status === 'new' || (p.status === 'deleted' && choices.restoreDeleted[p.key])) && choices.skip[p.key]).length
  const created = n('new') + merges.length - merged + restored - excluded
  const removed = plan.vanished.filter((t) => choices.removeVanished[t.id]).length
  const elsewhere = plan.rows.filter((p): p is Extract<RowPlan, { status: 'elsewhere' }> => p.status === 'elsewhere')
  const moved = elsewhere.filter((p) => movesHere(p, choices)).length
  const known = n('known') + elsewhere.length - moved
  const settledFlags = plan.rows.filter((p) => p.status === 'known' && p.settled).length
  const otherFormat = plan.rows.filter((p) => p.status === 'known' && p.other).length
  const nothing = created + merged + n('settle') + removed + settledFlags + moved === 0
  return (
    <Panel title="Podgląd">
      <div className="flex flex-col gap-2 text-[12px]" data-testid="import-summary">
        {nothing && known > 0 && (
          <div className="border border-accent/50 px-2 py-1.5 text-[11.5px] text-accent" data-testid="import-already">
            Wszystkie operacje z tego pliku są już w budżecie – ten plik (albo okres) był już zaimportowany.
          </div>
        )}
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
          {elsewhere.length > 0 && (
            <>
              <span className="text-muted" title="Te operacje są już w budżecie na innym koncie (plik tego konta trafił tam wcześniej albo operację przeniesiono) – nie wchodzą drugi raz.">
                przeniesione z innego konta
              </span>
              <span className="num text-right" data-testid="import-count-moved">
                {moved}
              </span>
            </>
          )}
          {otherFormat > 0 && (
            <>
              <span className="pl-3 text-dim" title="Ta sama operacja z drugiego formatu pliku (lista operacji ↔ historia rachunku): opis jest tam inny, więc FI łączy ją po kwocie, dacie (±3 dni) i nazwie.">
                w tym z {plan.format === 'historia' ? 'listy operacji' : 'historii rachunku'}
              </span>
              <span className="num text-right text-dim" data-testid="import-count-other-format">
                {otherFormat}
              </span>
            </>
          )}
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
        <button
          className="btn btn-accent h-[30px] justify-center"
          disabled={busy || readOnly}
          onClick={() => void runImport()}
          // A file with nothing new is imported too (N13): the time of the import and what the file covers are saved.
          title={nothing ? 'W pliku nie ma nic nowego – zapis zapamięta czas importu i okres pliku (odprawa, Portfel XTB, misja „Łączność z bazą”)' : undefined}
          data-testid="import-run"
        >
          {busy ? 'Importuję…' : readOnly ? 'Folder tylko do odczytu' : nothing ? 'Zapisz import (bez zmian)' : `Importuj (${created + merged + n('settle') + settledFlags + removed + moved})`}
        </button>
        <p className="text-[11px] text-dim">
          Rozpoznane (sieci, słowa kluczowe, reguły) wejdą z pokazaną decyzją; tematy bez decyzji – jako wydatki / wpływy bez kategorii, skategoryzujesz je później w
          Operacjach.
        </p>
      </div>
    </Panel>
  )
}

/** Rows of a long list shown at once (W17): the rest by „pokaż kolejne”. */
const PAGE = 100

function MatchesPanel() {
  const { plan, choices, file } = useImport(useShallow((s) => ({ plan: s.plan, choices: s.choices, file: s.file })))
  // Each list its own page, from the first one again with another file.
  const [limits, setLimits] = useState({ merges: PAGE, deleted: PAGE })
  useEffect(() => setLimits({ merges: PAGE, deleted: PAGE }), [file])
  const cats = useCategories()
  const accounts = useAccounts()
  const members = useMembers()
  const loans = useRecordList('loans')
  if (!plan) return null
  const merges = plan.rows.filter((p): p is Extract<RowPlan, { status: 'merge' }> => p.status === 'merge')
  const settles = plan.rows.filter((p): p is Extract<RowPlan, { status: 'settle' }> => p.status === 'settle')
  const deleted = plan.rows.filter((p): p is Extract<RowPlan, { status: 'deleted' }> => p.status === 'deleted')
  const elsewhere = plan.rows.filter((p): p is Extract<RowPlan, { status: 'elsewhere' }> => p.status === 'elsewhere')
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '?'
  // A matched hand-typed operation left apart (B36): what its row comes in as – its group's, theme's or the proposal.
  const decidedAs = (p: Extract<RowPlan, { status: 'merge' }>) => {
    const c = choices.rows[p.key] ?? choices.groups[p.planned.group] ?? choiceOf(p.planned.decision)
    return choiceText(c, p.row.amount < 0 ? 'out' : 'in', (id) => cats.label(id), members, loans)
  }
  if (!merges.length && !settles.length && !plan.vanished.length && !deleted.length && !elsewhere.length) return null
  return (
    <Panel title="Dopasowania">
      <div className="flex flex-col gap-2 text-[12px]" data-testid="import-matches">
        {merges.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="label">Wpisy ręczne z banku ({merges.length})</span>
            <p className="text-[11px] text-dim">
              Ta sama kwota, data ±3 dni, podobny kontrahent – albo możliwy duplikat: prawie ta sama kwota przy podobnej nazwie (łączony), ta sama kwota pod
              inną nazwą (łączony przy zakupie kartą do dnia różnicy, inaczej zaznacz sam). Wpis zachowuje Twoją kategorię i godzinę, bierze dane z banku. Nie
              połączony możliwy duplikat znajdziesz potem w „Duplikatach operacji”.
            </p>
            {merges.slice(0, limits.merges).map((p) => (
              <label key={p.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line/60 py-1 last:border-b-0" data-testid="import-merge">
                <input type="checkbox" checked={joins(p, choices)} onChange={(e) => setNoMerge(p.key, !e.currentTarget.checked)} data-testid="import-merge-join" />
                <span className="min-w-0 truncate">
                  <span className="text-fg-strong">{p.tx.counterparty || '(bez kontrahenta)'}</span>
                  <span className="text-muted">
                    {' '}
                    {fullDay(p.tx.date)}
                    {p.tx.time ? ` ${p.tx.time}` : ''} · {cats.label(p.tx.categoryId) || 'bez kategorii'}
                  </span>
                  <span className="text-dim"> ⟷ bank {fullDay(p.row.date)}: {p.row.counterparty || p.row.description}</span>
                  {p.loose && (
                    <span className="ml-1 text-accent" data-testid="import-merge-loose">
                      możliwy duplikat – {p.loose === 'name' ? 'inna nazwa' : `wpis ${plnText(p.tx.amount)} zł`}
                      {p.ask ? ' · zaznacz, jeśli to ta sama operacja' : ''}
                    </span>
                  )}
                  {!joins(p, choices) && (
                    <span className="ml-1 text-dim" data-testid="import-merge-apart">
                      osobno – wejdzie jako: {decidedAs(p)}
                    </span>
                  )}
                </span>
                <span className="num">{signedPln(p.row.amount)}</span>
              </label>
            ))}
            <ShowMore page={PAGE} shown={limits.merges} total={merges.length} onMore={() => setLimits((l) => ({ ...l, merges: l.merges + PAGE }))} testId="import-merge-more" />
          </div>
        )}
        {elsewhere.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="label">Już w budżecie na innym koncie ({elsewhere.length})</span>
            <p className="text-[11px] text-dim">
              Te operacje z banku są na innym koncie – plik tego konta trafił tam wcześniej albo operację przeniesiono. Nie wejdą drugi raz; zaznaczone
              przeniosę na to konto (z kategorią i notatkami).
            </p>
            {elsewhere.map((p) => (
              <label key={p.key} className="flex items-center gap-2" data-testid="import-elsewhere">
                <input type="checkbox" checked={movesHere(p, choices)} onChange={(e) => setMoveHere(p.key, e.currentTarget.checked)} data-testid="import-elsewhere-move" />
                <span className="min-w-0 flex-1 truncate">
                  {p.row.counterparty || p.row.description} {fullDay(p.row.date)} <span className="text-dim">· teraz na: {accountName(p.tx.accountId)}</span>
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
            {deleted.slice(0, limits.deleted).map((p) => (
              <label key={p.key} className="flex items-center gap-2" data-testid="import-deleted">
                <input type="checkbox" checked={!!choices.restoreDeleted[p.key]} onChange={(e) => setRestoreDeleted(p.key, e.currentTarget.checked)} />
                <span className="min-w-0 flex-1 truncate">
                  {p.row.counterparty || p.row.description} {fullDay(p.row.date)}
                </span>
                <span className="num">{signedPln(p.row.amount)}</span>
              </label>
            ))}
            <ShowMore page={PAGE} shown={limits.deleted} total={deleted.length} onMore={() => setLimits((l) => ({ ...l, deleted: l.deleted + PAGE }))} testId="import-deleted-more" />
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
function themeLabel(t: ImportTheme, catLabel: (id: string | null) => string, containerName: (id: string) => string, members: readonly Pick<HouseholdMember, 'id' | 'name'>[], loans: readonly LoanPick[]): string {
  const b = t.basis
  if (b.kind === 'hint') return `mBank: ${b.bankCategories.join(', ') || 'kategoria'}`
  if (b.kind === 'op') return OP_LABEL[t.direction][b.op]
  if (b.containerId) return `Ładownia · ${containerName(b.containerId)}`
  return choiceText(b.choice, t.direction, catLabel, members, loans, true)
}

/** What a decision is, in a few words (a theme's name – `title` capitalized; a matched row's preview). */
function choiceText(c: Choice, direction: 'in' | 'out', catLabel: (id: string | null) => string, members: readonly Pick<HouseholdMember, 'id' | 'name'>[], loans: readonly LoanPick[], title = false): string {
  if (c.kind === 'expense') {
    const cat = catLabel(c.categoryId) || 'bez kategorii'
    // Who (D80, D83): a member, their gift, several people; a product return – for whom (B40).
    const who = c.refundable ? `${direction === 'in' ? 'dla' : c.gift ? 'prezent od' : 'finansuje'}: ${memberName(c.memberId, members)}` : c.share ? `wspólnie: ${shareNames(c.share, members)}` : ''
    if (direction === 'in') return `${title ? 'Zwroty' : 'zwrot towaru'}${who ? ` ${who}` : ''} · ${cat}`
    return who ? `${title ? who.charAt(0).toUpperCase() + who.slice(1) : who} · ${cat}` : cat
  }
  const text = (() => {
    if (c.kind === 'income') return c.household ? `od domownika: ${memberName(c.memberId, members)}${c.advance ? ' – zaliczka' : ''}` : title ? 'wpływy (przychód)' : 'wpływ (przychód)'
    if (c.kind === 'transfer') return title ? 'przelewy własne' : 'przelew własny'
    if (c.kind === 'trading') return direction === 'out' ? 'XTB – dopłata do konta tradingowego' : 'XTB – wypłata z konta tradingowego'
    if (c.kind === 'loan') {
      const loan = c.loanId ? loans.find((l) => l.id === c.loanId) : undefined
      return loan ? `${direction === 'in' ? 'zwrot pożyczki' : 'pożyczka'}: ${loan.name}` : title ? 'pożyczki' : 'pożyczka'
    }
    if (c.kind === 'tax') return 'podatek PIT-38'
    return TX_KIND_LABEL[c.kind as TxKind] ?? c.kind
  })()
  return title ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

const nothing = (direction: 'in' | 'out'): Choice => ({ kind: direction === 'out' ? 'expense' : 'income', categoryId: null, refundable: false, household: false, memberId: null, advance: false, counterAccountId: null })

/**
 * Money in from a person not of the household (D80 a): „+ domownik” adds them (their name in the bank) and decides the
 * group as their money – the rest beyond their debt as income until the user says „zaliczka”.
 */
function NewMember({ g }: { g: ImportGroup }) {
  const members = useMembers()
  const readOnly = useFolderLocked()
  const name = g.names[0] ?? g.label
  if (readOnly || g.direction !== 'in' || opKindOf(g.rows[0]!.row.operation) !== 'transfer' || !name.trim()) return null
  if (members.some((m) => m.bankNames.some((b) => b.trim().toUpperCase() === name.trim().toUpperCase()))) return null
  return (
    <button
      type="button"
      className="text-[11px] text-accent hover:underline"
      title="Dopisz nadawcę do domowników (Ustawienia → Domownicy): jego wpłaty najpierw wyrównają to, co ma oddać"
      onClick={() => {
        const id = addMemberFromBank(name)
        if (id) decideGroup(g.group, { ...nothing('in'), household: true, memberId: id })
      }}
      data-testid="import-group-new-member"
    >
      + domownik
    </button>
  )
}

/**
 * One operation of a group: its own choice, its skip and its tick read by its key (W17) – a decision, a skip or a tick of
 * another operation never renders it.
 */
const ImportRowLine = memo(function ImportRowLine({ p, choice }: { p: NewRow; choice: Choice }) {
  const mine = useImport((s) => s.choices.rows[p.key])
  const out = useImport((s) => !!s.choices.skip[p.key])
  const ticked = useImport((s) => !!s.selected.rows[p.key])
  const c = mine ?? choice
  return (
    <div className={cx('grid grid-cols-[18px_48px_minmax(0,1fr)_96px_200px_64px] items-center gap-2 py-[1px] text-[11.5px]', out && 'opacity-50')} data-testid="import-row">
      <input type="checkbox" checked={ticked} onChange={(e) => selectImport({ rows: [p.key] }, e.currentTarget.checked)} aria-label="Zaznacz operację" data-testid="import-row-select" />
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
})

/** Rows of a group left out, counted once per state of the skips (a keystroke of the search counts nothing again). */
const skippedMemo = new WeakMap<object, WeakMap<readonly unknown[], number>>()
function skippedIn(skip: Record<string, boolean>, rows: ImportGroup['rows']): number {
  let byRows = skippedMemo.get(skip)
  if (!byRows) skippedMemo.set(skip, (byRows = new WeakMap()))
  let n = byRows.get(rows)
  if (n == null) {
    n = 0
    for (const p of rows) if (skip[p.key]) n++
    byRows.set(rows, n)
  }
  return n
}

/** A group (brand, direction, proposal): its decision and ticks read by its key (W17) – rendered again only when they change. */
const GroupRow = memo(function GroupRow({ g, inherited, themeDecided, found }: { g: ImportGroup; inherited: Choice; themeDecided: boolean; found: NewRow[] | 'all' | undefined }) {
  const own = useImport((s) => s.choices.groups[g.group])
  const remember = useImport((s) => s.choices.remember[g.group] ?? false)
  const checked = useImport((s) => !!s.selected.groups[g.group])
  const proposing = useImport((s) => s.lastDecided === g.group && !s.noProposal[g.group])
  const skipped = useImport((s) => skippedIn(s.choices.skip, g.rows))
  const cats = useCategories()
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const partial = Array.isArray(found)
  const shown = partial ? found : g.rows
  const choice = own ?? inherited
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
        <DecisionFields choice={choice} direction={g.direction} onChange={(c) => decideGroup(g.group, c)} testId="import-group" />
        <Badge tone={g.source === 'none' && !own && !themeDecided ? 'warn' : 'default'} title={g.reason}>
          {badge}
        </Badge>
        {own && !g.byTitle && learnable(own) && (
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
        {!(choice.kind === 'income' && choice.household) && <NewMember g={g} />}
      </div>
      {own && proposing && <RuleProposal g={g} choice={own} />}
      {choice.kind === 'expense' && !choice.categoryId && g.hint && (
        <div className="mt-0.5 pl-12 text-[11px] text-dim">
          kategoria mBanku „{g.bankCategory}” →{' '}
          <button type="button" className="text-accent hover:underline" onClick={() => acceptGroupHint(g.group, { ...choice, categoryId: g.hint })} data-testid="import-group-hint">
            {cats.label(g.hint)}?
          </button>
        </div>
      )}
      {(open || partial) && (
        <div className="mt-1 flex flex-col pl-12" data-testid="import-group-rows">
          {shown.slice(0, limit).map((p) => (
            <ImportRowLine key={p.key} p={p} choice={choice} />
          ))}
          <ShowMore page={PAGE} shown={limit} total={shown.length} onMore={() => setLimit(limit + PAGE)} testId="import-rows-more" />
        </div>
      )}
    </div>
  )
})

/** A theme with more groups than this starts closed (W17: a year's first import – hundreds of brands of one theme). */
const BIG_THEME = 30

const ThemeRow = memo(function ThemeRow({ t, label, status, found, searching }: { t: ImportTheme; label: string; status: ThemeStatus; found: Map<string, NewRow[] | 'all'>; searching: boolean }) {
  const decided = useImport((s) => s.choices.themes[t.theme])
  const remember = useImport((s) => s.choices.rememberThemes[t.theme] ?? false)
  const shown = t.groups.filter((g) => found.has(g.group))
  // The groups shown (in a search: the ones found) – the tick of the theme is theirs.
  const allChecked = useImport((s) => shown.every((g) => s.selected.groups[g.group]))
  const cats = useCategories()
  const [open, setOpen] = useState(status === 'todo' && t.groups.length <= BIG_THEME)
  const [limit, setLimit] = useState(PAGE)
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
        {decided && learnable(decided) && (
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
              onClick={() => chooseTheme(t.theme, { ...nothing('out'), categoryId: t.basis.kind === 'hint' ? t.basis.categoryId : null }, false, true)}
              data-testid="import-theme-hint"
            >
              {cats.label(t.basis.categoryId)}?
            </button>
          </span>
        )}
      </div>
      {expanded && (
        <div className="mt-1 flex flex-col" data-testid="import-theme-groups">
          {shown.slice(0, limit).map((g) => (
            <GroupRow key={g.group} g={g} inherited={decided ?? g.proposed} themeDecided={!!decided} found={found.get(g.group)} />
          ))}
          <ShowMore page={PAGE} shown={limit} total={shown.length} onMore={() => setLimit(limit + PAGE)} testId="import-groups-more" />
        </div>
      )}
    </div>
  )
})

/** One decision, or „nie importuj”, for everything ticked (1.2.1). */
/** The decisions a keyword rule can hold (`KeywordRules`): the search kept as a key for the next imports. */
const KEYWORD_KIND: Partial<Record<Option, { kind: TxKind; direction: 'in' | 'out' | null }>> = {
  expense: { kind: 'expense', direction: 'out' },
  income: { kind: 'income', direction: 'in' },
  transfer: { kind: 'transfer', direction: null }
}

function BulkBar({ groups }: { groups: readonly ImportGroup[] }) {
  const members = useMembers()
  const loans = useRecordList('loans')
  const selected = useImport((s) => s.selected)
  const readOnly = useFolderLocked()
  const query = useImport((s) => s.query)
  const [option, setOption] = useState<Option>('expense')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [share, setShare] = useState<Share | null>(null)
  const first = members.find((m) => !m.archived)
  const [asKeyword, setAsKeyword] = useState(false)
  const nGroups = groups.filter((g) => selected.groups[g.group]).length
  const mergeable = namesToMerge(groups, selected.groups)
  const rows = selectedRowKeys(groups, selected).length
  if (!nGroups && !rows) return null
  const keyword = keywordOfSearch(query)
  const keywordKind = keyword ? KEYWORD_KIND[option] : undefined
  const apply = () => {
    const category = hasCategory(option) ? categoryId : null
    // The search as a key first: the file is planned again with it, the decisions of the ticked stay theirs.
    let note = ''
    if (asKeyword && keyword && keywordKind) {
      const err = saveKeywordRule({ keyword, direction: keywordKind.direction, kind: keywordKind.kind, categoryId: category })
      note = err ? ` Słowo kluczowe: ${err}` : ` Słowo kluczowe „${keyword}” zapamiętane.`
    }
    setAsKeyword(false)
    const { applied, unfit } = chooseSelected(groups, option, category, option === 'share' ? share : null)
    toast((unfit ? `Ustawiono dla ${applied}; ${unfit} nie pasuje do kierunku pieniędzy (wpływ / wydatek) – bez zmian.` : `Ustawiono dla ${applied}.`) + note, unfit ? 'info' : 'success', 5000)
  }
  return (
    <div className="sticky top-0 z-10 mb-1 flex flex-wrap items-center gap-2 border border-accent/50 bg-raised px-2 py-1.5 text-[12px]" data-testid="import-bulk">
      <span className="text-fg-strong" data-testid="import-bulk-count">
        Zaznaczone: {nGroups ? `${count(nGroups, 'grupa', 'grupy', 'grup')}, ` : ''}
        {operations(rows)}
      </span>
      <select
        className="input h-[24px] w-[220px] py-0"
        value={option}
        onChange={(e) => {
          const next = e.currentTarget.value as Option
          setOption(next)
          if (next === 'share' && !share && first) setShare(startShare(first.id))
        }}
        aria-label="Decyzja dla zaznaczonych"
        data-testid="import-bulk-kind"
      >
        {bulkOptions(members, loans).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hasCategory(option) && <CategorySelect className="h-[24px] min-w-[170px] py-0" value={categoryId} onChange={setCategoryId} data-testid="import-bulk-category" />}
      {option === 'share' && share && <ShareEditor share={share} total={null} members={members} onChange={setShare} modes={IMPORT_SHARE_MODES} testId="import-bulk-share" />}
      {keywordKind && (
        <label className="flex items-center gap-1 text-[11px] text-muted" title="Kolejne importy rozpoznają operacje z tym słowem w nazwie albo tytule same">
          <input type="checkbox" checked={asKeyword} onChange={(e) => setAsKeyword(e.currentTarget.checked)} data-testid="import-bulk-keyword" />
          zapamiętaj „{keyword}” jako słowo kluczowe
        </label>
      )}
      <button
        type="button"
        className="btn btn-accent h-[24px]"
        // Percents of the people not summing to 100 % (D83): never applied as typed – the quick entry refuses them too; no
        // category – it would only wipe the proposals of the chains out (B37).
        disabled={(option === 'share' && (!share || !shareComplete(share, null))) || (hasCategory(option) && !categoryId)}
        title={hasCategory(option) && !categoryId ? 'Wybierz kategorię' : undefined}
        onClick={apply}
        data-testid="import-bulk-apply"
      >
        Ustaw
      </button>
      <button type="button" className="btn h-[24px]" onClick={() => toast(`Nie importuję: ${operations(skipSelected(groups, true))}.`, 'info', 3500)} data-testid="import-bulk-skip">
        Nie importuj
      </button>
      <button type="button" className="btn h-[24px]" onClick={() => skipSelected(groups, false)} data-testid="import-bulk-unskip">
        Importuj jednak
      </button>
      {mergeable && (
        <button
          type="button"
          className="btn h-[24px]"
          disabled={readOnly}
          title="Zaznaczone grupy to jedna firma albo osoba pod różnymi nazwami: jedna grupa i jedna reguła, także w kolejnych importach"
          onClick={() => mergeSelectedNames(groups, selected.groups)}
          data-testid="import-bulk-merge"
        >
          Połącz nazwy ({mergeable.length})
        </button>
      )}
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
  const members = useMembers()
  const containers = useRecordList('containers')
  const loans = useRecordList('loans')
  const groups = useImportGroups()
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
                list.map((t) => <ThemeRow key={t.theme} t={t} label={themeLabel(t, (id) => cats.label(id), containerName, members, loans)} status={st} found={found} searching={searching} />)}
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
  const batch = useData((s) => (done?.batchId ? s.records.imports[done.batchId]?.record : undefined))
  const latest = useLatestImport()
  if (!done) return null
  return (
    <Panel title="Import zakończony">
      <div className="flex flex-col gap-1.5 text-[12px]" data-testid="import-done">
        <span>
          Nowe: <b className="num">{done.counts.created}</b> · połączone z wpisami: <b className="num">{done.counts.merged}</b> · rozliczone: <b className="num">{done.counts.settled}</b> · usunięte: <b className="num">{done.counts.removed}</b>
          {done.counts.skipped > 0 ? ` · pominięte (usunięte wcześniej): ${done.counts.skipped}` : ''}
          {done.counts.excluded > 0 ? ` · nie importowane (Twój wybór): ${done.counts.excluded}` : ''}
          {done.counts.moved > 0 ? ` · przeniesione z innego konta: ${done.counts.moved}` : ''}
          {done.rules > 0 ? ` · nowe reguły: ${done.rules}` : ''}
        </span>
        <span className="num truncate text-[11px] text-dim" title={done.backup}>
          kopia przed importem: {done.backup}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn h-[24px]" onClick={() => navigate({ page: 'operations' })} data-testid="import-to-operations">
            Zobacz w Operacjach
          </button>
          {/* F4: the whole file taken back at once (the latest import that stands). */}
          {batch && !batch.undoneAt && latest?.id === batch.id && <UndoImportButton batch={batch} />}
          {batch?.undoneAt && (
            <span className="text-[11.5px] text-muted" data-testid="import-undone">
              Import cofnięty.
            </span>
          )}
        </div>
      </div>
    </Panel>
  )
}

export function ImportPage() {
  const plan = useImport((s) => s.plan)
  const rules = useData((s) => s.fi?.settings.import.rules)
  const aliases = useData((s) => s.fi?.settings.import.aliases)
  const members = useData((s) => s.fi?.settings.household.members)
  const ownNames = useData((s) => s.fi?.settings.import.ownNames)
  const categories = useData((s) => s.fi?.settings.categories)
  const containers = useData((s) => s.records.containers)
  const loans = useData((s) => s.records.loans)
  const transactions = useData((s) => s.records.transactions)
  // A keyword added, a rule deleted, names merged, a member added; the holder's names, a category, a container, a loan,
  // the operations (B38) – here, in the settings, on another computer: the open file planned again.
  useEffect(() => replanIfChanged(planInputsNow()), [rules, aliases, members, ownNames, categories, containers, loans, transactions])
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
            {done?.statement && <BankTelemetry statement={done.statement} confirmed={done.confirmed} />}
            {!plan && <DuplicatesPanel />}
            {(done || !plan) && <BalanceCheck />}
          </div>
          <div className="flex min-w-0 flex-col">
            <MatchesPanel />
            {plan && <SimilarPanel />}
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
