import { useMemo } from 'react'
import { CSV_DATE_FORMATS } from '@shared/schema'
import { completeMapping, previewMapped, type CsvDraft, type CsvRole } from '@shared/import/csv'
import { useFolderLocked } from '../../store/data'
import { signedPln } from '../../components/fields'
import { NumberField, Panel, TextField, cx } from '../../components/ui'
import { plDate } from '../../lib/format'
import { AccountSelect } from '../operations/pickers'
import { cancelCsvSetup, saveCsvSetup, setCsvAccount, setCsvColumn, setCsvDraft, setCsvNewName, useImport, type CsvSetup } from './state'

/** The roles of the columns as the wizard names them (AP-43): the required ones first. */
const ROLES: Array<{ role: CsvRole; label: string; hint?: string }> = [
  { role: 'date', label: 'Data operacji', hint: 'wymagana' },
  { role: 'booked', label: 'Data księgowania', hint: 'opcjonalnie – kolejność sald' },
  { role: 'amount', label: 'Kwota', hint: 'jedna kolumna, minus = wydatek' },
  { role: 'credit', label: 'albo uznania', hint: 'wpływy – zamiast kwoty' },
  { role: 'debit', label: 'i obciążenia', hint: 'wydatki – zamiast kwoty' },
  { role: 'description', label: 'Opis / tytuł' },
  { role: 'counterparty', label: 'Kontrahent', hint: 'nadawca / odbiorca' },
  { role: 'operation', label: 'Rodzaj operacji', hint: 'opcjonalnie' },
  { role: 'balance', label: 'Saldo po operacji', hint: 'opcjonalnie – zgodność salda' },
  { role: 'accountNo', label: 'Numer rachunku', hint: 'kontrahenta, opcjonalnie' },
  { role: 'currency', label: 'Waluta', hint: 'opcjonalnie – inne niż PLN pominięte' }
]

const SEPARATORS: Array<[string, string]> = [
  [';', 'średnik ;'],
  [',', 'przecinek ,'],
  ['\t', 'tabulator'],
  ['|', 'kreska |']
]
const ENCODINGS: Array<[string, string]> = [
  ['auto', 'wykryj (UTF-8 / Windows-1250)'],
  ['utf-8', 'UTF-8'],
  ['windows-1250', 'Windows-1250']
]
const DECIMALS: Array<[string, string]> = [
  [',', '1 234,56'],
  ['.', '1,234.56']
]

/** Options of a select with a value of a newer version kept (`openEnum`). */
function Options({ list, value }: { list: ReadonlyArray<readonly [string, string]>; value: string }) {
  return (
    <>
      {list.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
      {!list.some(([v]) => v === value) && <option value={value}>{value} (nowsza wersja)</option>}
    </>
  )
}

/** The file's first rows by the draft: the header bold, the rows before it dimmed (to skip). */
function FileRows({ setup }: { setup: CsvSetup }) {
  const { draft, rows } = setup
  const shown = rows.slice(0, Math.max(draft.skipRows + 7, 8))
  const width = Math.min(16, Math.max(1, ...shown.map((r) => r.length)))
  return (
    <div className="max-h-[220px] overflow-auto border border-line" data-testid="import-csv-rows">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-raised text-dim">
            <th className="px-1.5 py-0.5 text-right font-normal">wiersz</th>
            {Array.from({ length: width }, (_, i) => (
              <th key={i} className="px-1.5 py-0.5 text-left font-normal">
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => {
            const before = i < draft.skipRows
            const header = draft.header && i === draft.skipRows
            return (
              <tr key={i} className={cx('border-t border-line/60', before && 'text-dim', header && 'text-fg-strong')} data-kind={before ? 'skipped' : header ? 'header' : 'row'}>
                <td className="num px-1.5 py-0.5 text-right text-dim">{i + 1}</td>
                {Array.from({ length: width }, (_, j) => (
                  <td key={j} className={cx('max-w-[180px] truncate px-1.5 py-0.5', header && 'font-medium')} title={r[j] ?? ''}>
                    {(r[j] ?? '').trim()}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** How the draft reads the first operations (the result before „Zapisz”). */
function Result({ setup }: { setup: CsvSetup }) {
  const preview = useMemo(() => previewMapped(setup.bytes, setup.draft), [setup.bytes, setup.draft])
  if (!preview) return null
  return (
    <div className="flex flex-col gap-1" data-testid="import-csv-preview">
      <span className="label">Tak FI odczyta pierwsze operacje</span>
      {preview.rows.length === 0 && <span className="text-[11.5px] text-accent">Żaden wiersz nie dał operacji – sprawdź kolumny, format daty i liczb.</span>}
      {preview.rows.map((r) => (
        <div key={r.line} className="grid grid-cols-[80px_100px_minmax(0,1fr)] gap-2 text-[11.5px]" data-testid="import-csv-preview-row">
          <span className="num text-muted">{plDate(r.date)}</span>
          <span className={cx('num text-right', r.amount < 0 ? 'text-down' : 'text-up')}>{signedPln(r.amount)} zł</span>
          <span className="truncate" title={r.description}>
            {r.counterparty || r.description || '—'}
            {r.title && <span className="text-dim"> · {r.title}</span>}
          </span>
        </div>
      ))}
      {preview.skipped.length > 0 && (
        <span className="text-[11px] text-accent" data-testid="import-csv-skipped">
          Pominięte: {preview.skipped.map((s) => `wiersz ${s.line} (${s.reason})`).join('; ')}
        </span>
      )}
    </div>
  )
}

function ColumnSelect({ role, label, hint, draft, names }: { role: CsvRole; label: string; hint?: string; draft: CsvDraft; names: string[] }) {
  const value = draft.columns[role]
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted">
        {label}
        {hint && <span className="text-dim"> – {hint}</span>}
      </span>
      <select className="input" value={value ?? ''} onChange={(e) => setCsvColumn(role, e.currentTarget.value === '' ? null : Number(e.currentTarget.value))} data-testid={`import-csv-col-${role}`}>
        <option value="">—</option>
        {names.map((n, i) => (
          <option key={i} value={i}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
}

function Setup({ setup }: { setup: CsvSetup }) {
  const locked = useFolderLocked()
  const { draft, rows } = setup
  const width = Math.max(1, ...rows.slice(draft.skipRows, draft.skipRows + 20).map((r) => r.length))
  const head = draft.header ? (rows[draft.skipRows] ?? []) : []
  const names = Array.from({ length: width }, (_, i) => `${i + 1}${head[i]?.trim() ? ` · ${head[i]!.trim()}` : ''}`)
  const done = completeMapping(draft)
  const missing = 'missing' in done ? done.missing : null
  const why = locked ? 'Folder tylko do odczytu – mapowania nie da się zapisać.' : missing
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-2 text-[12px]" data-testid="import-csv">
      <p className="text-[11.5px] text-muted">
        „<span className="text-fg-strong">{setup.name}</span>” nie jest plikiem z mBanku. Wskaż, co jest w kolumnach – FI zapamięta to przy koncie i następne pliki tego banku
        wczyta same. Dalej import idzie jak z mBanku: duplikaty, reguły, „Cofnij import”.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted">Konto w budżecie</span>
          <AccountSelect className="w-[180px]" value={setup.accountId || null} none="Nowe konto…" onChange={(id) => setCsvAccount(id ?? '')} aria-label="Konto pliku CSV" data-testid="import-csv-account" />
        </label>
        {!setup.accountId && (
          <label className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted">Nazwa nowego konta</span>
            <TextField className="w-[160px]" value={setup.newName} onChange={setCsvNewName} maxLength={40} aria-label="Nazwa nowego konta" data-testid="import-csv-new-name" />
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted">Separator</span>
          <select className="input" value={draft.separator} onChange={(e) => setCsvDraft({ separator: e.currentTarget.value })} data-testid="import-csv-separator">
            <Options list={SEPARATORS} value={draft.separator} />
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted">Kodowanie</span>
          <select className="input" value={draft.encoding} onChange={(e) => setCsvDraft({ encoding: e.currentTarget.value })} data-testid="import-csv-encoding">
            <Options list={ENCODINGS} value={draft.encoding} />
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted">Wierszy przed nagłówkiem</span>
          <NumberField className="w-[70px]" value={draft.skipRows} decimals={0} range={[0, 200]} isValid={(v) => v != null && v >= 0 && v <= 200} commitOnBlur onChange={(v) => v != null && setCsvDraft({ skipRows: v })} aria-label="Wierszy do pominięcia" data-testid="import-csv-skip" />
        </label>
        <label className="flex items-center gap-1.5 pb-1 text-[11.5px] text-muted">
          <input type="checkbox" checked={draft.header} onChange={(e) => setCsvDraft({ header: e.currentTarget.checked })} data-testid="import-csv-header" />
          wiersz nagłówka z nazwami kolumn
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted">Format daty</span>
          <select className="input" value={draft.dateFormat} onChange={(e) => setCsvDraft({ dateFormat: e.currentTarget.value })} data-testid="import-csv-date-format">
            <Options list={CSV_DATE_FORMATS.map((f) => [f, f] as const)} value={draft.dateFormat} />
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted">Liczby</span>
          <select className="input" value={draft.decimal} onChange={(e) => setCsvDraft({ decimal: e.currentTarget.value })} data-testid="import-csv-decimal">
            <Options list={DECIMALS} value={draft.decimal} />
          </select>
        </label>
      </div>
      <FileRows setup={setup} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
        {ROLES.map((r) => (
          <ColumnSelect key={r.role} {...r} draft={draft} names={names} />
        ))}
      </div>
      <Result setup={setup} />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-accent" disabled={!!why} onClick={() => void saveCsvSetup()} data-testid="import-csv-save">
          Zapisz kolumny i wczytaj plik
        </button>
        <button className="btn" onClick={cancelCsvSetup} data-testid="import-csv-cancel">
          Anuluj
        </button>
        {why && (
          <span className="text-[11.5px] text-accent" data-testid="import-csv-missing">
            {why}
          </span>
        )}
      </div>
    </div>
  )
}

/** The wizard of another bank's CSV (AP-43, T460): the columns of a file no account's mapping reads yet. */
export function CsvSetupPanel() {
  const setup = useImport((s) => s.csvSetup)
  return setup ? <Setup setup={setup} /> : null
}
