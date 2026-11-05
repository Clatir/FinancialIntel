/**
 * Another bank's CSV (AP-43, T460): read by the columns the user pointed at in the import's wizard (`CsvMapping`, kept
 * at the account in fi.json) into the rows the import plans as mBank's (`MbankFile`, format 'csv') – the same plan,
 * duplicates, rules, batches and „Cofnij import”. The wizard's first proposal (`guessCsv`) reads the header's names.
 * Pure; the main process only reads the file's bytes.
 */
import { fold } from '../fold'
import { CSV_DATE_FORMATS, CSV_SEPARATORS, csvMappingSchema, readCsvMapping, type Account, type CsvMapping } from '../schema/budget'
import { cleanBankName } from './names'
import { PROGRESS_EVERY, type MbankFile, type MbankRow, type Progress } from './mbank'
import { decodeText, parseCsv, type Rows } from './text'

/** The file's text in the mapping's encoding ('auto' – as mBank's: BOM, UTF-8, else Windows-1250). */
export function decodeAs(bytes: Uint8Array, encoding: string): string {
  if (encoding === 'windows-1250') return new TextDecoder('windows-1250').decode(bytes)
  if (encoding === 'utf-8') {
    const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
    return new TextDecoder('utf-8').decode(bom ? bytes.subarray(3) : bytes)
  }
  return decodeText(bytes)
}

/**
 * The first bytes of a file up to a line's end (the wizard's preview, the check of a mapping's header): never a
 * character cut in two – a byte 0x0A is no part of another UTF-8 or Windows-1250 character (of UTF-16 – with its 0x00).
 */
export function headOf(bytes: Uint8Array, max = 256 * 1024): Uint8Array {
  if (bytes.length <= max) return bytes
  const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)
  for (let i = max - 1; i > 0; i--)
    if (bytes[i] === 0x0a) {
      const end = utf16 ? i + 1 + ((i + 1) % 2) : i + 1
      return bytes.subarray(0, end)
    }
  return bytes.subarray(0, max)
}

/** The mapping's separator as one character (a newer version's other one: ';'). */
const separatorOf = (m: Pick<CsvMapping, 'separator'>): string => (m.separator.length === 1 ? m.separator : ';')

const DATE_RES: Record<(typeof CSV_DATE_FORMATS)[number], { re: RegExp; y: number; m: number; d: number }> = {
  'RRRR-MM-DD': { re: /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[\sT])/, y: 1, m: 2, d: 3 },
  'DD.MM.RRRR': { re: /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:$|\s)/, y: 3, m: 2, d: 1 },
  'DD-MM-RRRR': { re: /^(\d{1,2})-(\d{1,2})-(\d{4})(?:$|\s)/, y: 3, m: 2, d: 1 },
  'DD/MM/RRRR': { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:$|\s)/, y: 3, m: 2, d: 1 },
  'MM/DD/RRRR': { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:$|\s)/, y: 3, m: 1, d: 2 },
  'RRRR.MM.DD': { re: /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:$|\s)/, y: 1, m: 2, d: 3 },
  'RRRR/MM/DD': { re: /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:$|\s)/, y: 1, m: 2, d: 3 }
}

/** A cell's date in the mapping's format → 'RRRR-MM-DD' (a time after it is not read – the import has no hours); null – not one. */
export function parseCsvDate(cell: string, format: string): string | null {
  const how = DATE_RES[format as (typeof CSV_DATE_FORMATS)[number]]
  const m = how?.re.exec(cell.trim())
  if (!how || !m) return null
  const [y, mo, d] = [Number(m[how.y]), Number(m[how.m]), Number(m[how.d])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * A cell's amount with the mapping's decimal mark → grosze and the currency written with it (null – none): „-1 234,56”,
 * „1.234,56 PLN”, „PLN -12,00”, „(12,00)” (minus), „12,00 zł”; with '.' – „-1,234.56”, „1234.5”. Null – no amount (an
 * empty cell, more than two decimals, letters, the other mark where no thousands are – „12.50” read with ',' is no
 * 1250 zł: przegląd R1 14).
 */
export function parseCsvAmount(cell: string, decimal: string): { grosze: number; currency: string | null } | null {
  let t = cell.replace(/[\s  ']/g, '').replace(/[−–]/g, '-')
  if (!t) return null
  let currency: string | null = null
  if (/zł$/i.test(t)) {
    currency = 'PLN'
    t = t.slice(0, -2)
  }
  // A currency's code before or after the number (no look-behind: WebKit of iOS 16.0–16.3 has none – the phone's build).
  const before = /^([A-Za-z]{3})(?=[-+(\d])/.exec(t)
  const after = before ? null : /[\d)]([A-Za-z]{3})$/.exec(t)
  const code = before ?? after
  if (code) {
    currency = code[1]!.toUpperCase()
    t = before ? t.slice(3) : t.slice(0, -3)
  }
  let negative = false
  if (/^\(.*\)$/.test(t)) {
    negative = true
    t = t.slice(1, -1)
  }
  // The other mark only between groups of three digits (thousands): „1.234,56”, „1,234.56” – never „12.50” with ','.
  const [mark, other] = decimal === '.' ? ['.', ','] : [',', '.']
  const whole = t.split(mark)[0]!.replace(/^[+-]/, '')
  const thousands = other === '.' ? /^\d{1,3}(\.\d{3})+$/ : /^\d{1,3}(,\d{3})+$/
  if (whole.includes(other) && !thousands.test(whole)) return null
  t = t.split(other).join('')
  if (mark === ',') t = t.replace(',', '.')
  const m = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(t)
  if (!m) return null
  const grosze = Number(m[2]) * 100 + Number((m[3] ?? '0').padEnd(2, '0'))
  return { grosze: negative !== (m[1] === '-') ? -grosze : grosze, currency }
}

const cellOf = (r: readonly string[], col: number | null): string => (col == null ? '' : (r[col] ?? '').replace(/\s+/g, ' ').trim())

/** The header's cells as compared (`CsvMapping.headers`): folded, without a leading „#”, trimmed. */
const headerKey = (cell: string): string => fold(cell.replace(/^\s*#/, '')).replace(/\s+/g, ' ').trim()

/** The row of the mapping's header among a file's first rows (the bank may add a line above it – a longer period); -1 none. */
function headerRowOf(rows: Rows, m: Pick<CsvMapping, 'headers' | 'skipRows'>): number {
  const want = m.headers.map(headerKey)
  if (!want.length) return -1
  const same = (i: number) => {
    const got = (rows[i] ?? []).map(headerKey)
    while (got.length > want.length && !got.at(-1)) got.pop()
    return got.length === want.length && got.every((c, j) => c === want[j])
  }
  if (same(m.skipRows)) return m.skipRows
  for (let i = 0; i < Math.min(rows.length, 60); i++) if (same(i)) return i
  return -1
}

/**
 * Does a file have the layout of a mapping (its next file of the same bank – read by it without the wizard)? Of a mapping
 * with a header: its header's cells among the file's first rows; without one: its first operations read (a date, an
 * amount) in its columns.
 */
export function mappingFits(bytes: Uint8Array, m: CsvMapping): boolean {
  const rows = parseCsv(decodeAs(headOf(bytes, 64 * 1024), m.encoding), separatorOf(m))
  if (m.header) return headerRowOf(rows, m) >= 0
  const first = rows.slice(m.skipRows).filter((r) => r.some((c) => c.trim())).slice(0, 5)
  return first.length > 0 && first.every((r) => !!readRow(r, m, 0).row)
}

/**
 * The row as the bank wrote it – all its cells in their order (the empty ones at its end aside): its identity across
 * imports (`rowIdentity`, T461), whatever role the mapping gives each column – a change of the roles never makes the same
 * rows new (przegląd R1 1).
 */
export const rowText = (r: readonly string[]): string => {
  const cells = r.map((c) => c.replace(/\s+/g, ' ').trim())
  while (cells.length && !cells.at(-1)) cells.pop()
  return cells.join(' | ')
}

/** Types of operation the import's recognition knows (mBank's words – `classify.ts`): kept as the bank wrote them. */
const KNOWN_OPERATION =
  /^(PRZELEW|BLIK|ZLECENIE|POLECENIE|WPŁATA|WPLATA|UZNANIE|OBCIĄŻENIE|OBCIAZENIE|ZAKUP|PŁATNOŚĆ|PLATNOSC|TRANSAKCJA|POS ZWROT|ZWROT|PROWIZJA|OPŁATA|OPLATA|ODSETKI|PODATEK|WYPŁATA|WYPLATA|KAPITALIZACJA|SPŁATA|SPLATA|STORNO|KOREKTA)(?=$|[^\p{L}\p{N}])/u

/**
 * The type of operation the import's recognition reads (T462, przegląd R1 4): the bank's own when it is one of the words
 * it knows, else told by the row's words, its direction and the other side's account number – an ATM, a product's return,
 * a fee of the bank, a card payment, a transfer (every inflow without a card's word is one: a member's money, a loan's
 * repayment, an own transfer are transfers). '' – nothing tells (an outflow of no word: a card payment by the name).
 */
export function operationOf(written: string, text: string, amount: number, accountNo: string): string {
  if (KNOWN_OPERATION.test(written)) return written
  const t = ` ${fold(`${written} ${text}`).replace(/[^a-z0-9]+/g, ' ')} `
  if (/ bankomat| wyplata gotowki | atm | cash withdrawal /.test(t)) return 'WYPŁATA Z BANKOMATU'
  if (amount > 0 && / (refund|zwrot (towaru|zakupu|platnosci|transakcji)) /.test(t)) return 'ZWROT'
  if (amount < 0 && / (prowizja|odsetki|oplata za (karte|prowadzenie|rachunek|konto)|fee|bank charge) /.test(t)) return 'OPŁATA'
  if (/ (przelew|transfer|top ?up|zlecenie|polecenie) /.test(t)) return amount > 0 ? 'PRZELEW PRZYCHODZĄCY' : 'PRZELEW WYCHODZĄCY'
  if (/ (karta|karty|kart|card|blik|zakup|platnosc|payment|purchase) /.test(t)) return 'PŁATNOŚĆ KARTĄ'
  if (amount > 0 || accountNo) return amount > 0 ? 'PRZELEW PRZYCHODZĄCY' : 'PRZELEW WYCHODZĄCY'
  return written
}

/** One row of the file by the mapping: the operation, or why it is left out. */
function readRow(r: readonly string[], m: CsvMapping, line: number): { row?: MbankRow; skip?: string } {
  const c = m.columns
  const dateCell = cellOf(r, c.date)
  const date = parseCsvDate(dateCell, m.dateFormat)
  if (!date) return { skip: `nieczytelna data „${dateCell}”` }
  const booked = c.booked != null ? parseCsvDate(cellOf(r, c.booked), m.dateFormat) : null
  let amount = 0
  let currency = cellOf(r, c.currency).toUpperCase() || null
  if (c.amount != null) {
    const cell = cellOf(r, c.amount)
    const money = parseCsvAmount(cell, m.decimal)
    if (!money) return { skip: `nieczytelna kwota „${cell}”` }
    amount = money.grosze
    currency ??= money.currency
  } else {
    // Money in and out in two columns (T460): in – plus, out – minus, whatever sign the bank writes them with.
    const inCell = cellOf(r, c.credit)
    const outCell = cellOf(r, c.debit)
    if (!inCell && !outCell) return { skip: 'brak kwoty (uznania i obciążenia puste)' }
    for (const [cell, sign] of [
      [inCell, 1],
      [outCell, -1]
    ] as const) {
      if (!cell) continue
      const money = parseCsvAmount(cell, m.decimal)
      if (!money) return { skip: `nieczytelna kwota „${cell}”` }
      amount += sign * Math.abs(money.grosze)
      currency ??= money.currency
    }
  }
  if (currency && currency !== 'PLN' && currency !== 'ZŁ' && currency !== 'ZL') return { skip: `kwota w ${currency} – FI prowadzi tylko PLN` }
  const who = cellOf(r, c.counterparty)
  const what = cellOf(r, c.description)
  const accountNo = cellOf(r, c.accountNo).replace(/[\s']/g, '')
  const operation = operationOf(cellOf(r, c.operation).toUpperCase(), `${who} ${what}`, amount, accountNo)
  const balance = c.balance != null ? parseCsvAmount(cellOf(r, c.balance), m.decimal) : null
  return {
    row: {
      line,
      date,
      // The row as the bank wrote it – all its cells (T461): its identity across imports, whatever the roles.
      description: rowText(r),
      operation,
      // The other side: its column, else the description (a card payment's shop) – without the bank's additions.
      counterparty: cleanBankName(who || what, { town: true }),
      title: who ? what : '',
      accountNo,
      category: '',
      amount,
      pending: false,
      balanceAfter: balance ? balance.grosze : null,
      // The balances follow the booking (1.5.1 – `statementOf`).
      ...(booked && booked !== date ? { booked } : {})
    }
  }
}

/**
 * Read another bank's CSV by a mapping (already decoded – `decodeAs`). The header found among the first rows when the
 * bank added a line above it. `progress` – the rows read of the file's (AP-35).
 */
export function parseMappedCsv(text: string, m: CsvMapping, progress?: Progress): MbankFile {
  const rows = parseCsv(text, separatorOf(m))
  const at = m.header ? headerRowOf(rows, m) : -1
  const start = m.header ? (at >= 0 ? at : m.skipRows) + 1 : m.skipRows
  const out: MbankRow[] = []
  const skipped: MbankFile['skipped'] = []
  for (let i = start; i < rows.length; i++) {
    if (progress && (i - start) % PROGRESS_EVERY === 0) progress(i - start, rows.length - start)
    const r = rows[i]!
    if (r.every((cell) => !cell.trim())) continue
    const { row, skip } = readRow(r, m, i + 1)
    if (row) out.push(row)
    else skipped.push({ line: i + 1, reason: skip! })
  }
  return { format: 'csv', client: null, account: null, period: null, rows: out, skipped }
}

// ------------------------------------------------------------------ the wizard's proposal

/** What a column of another bank's CSV may be (`CsvColumns`). */
export type CsvRole = 'date' | 'booked' | 'amount' | 'credit' | 'debit' | 'description' | 'counterparty' | 'operation' | 'balance' | 'accountNo' | 'currency'

/** The wizard's mapping while the user sets it: any column may be still unset (`completeMapping` says what is missing). */
export interface CsvDraft {
  separator: CsvMapping['separator']
  encoding: CsvMapping['encoding']
  skipRows: number
  header: boolean
  headers: string[]
  dateFormat: CsvMapping['dateFormat']
  decimal: CsvMapping['decimal']
  columns: Record<CsvRole, number | null>
}

export const NO_COLUMNS: CsvDraft['columns'] = { date: null, booked: null, amount: null, credit: null, debit: null, description: null, counterparty: null, operation: null, balance: null, accountNo: null, currency: null }

/** The mapping of a draft, or why it is not one yet (said beside „Zapisz”). */
export function completeMapping(d: CsvDraft): { mapping: CsvMapping } | { missing: string } {
  const c = d.columns
  if (c.date == null) return { missing: 'Wskaż kolumnę z datą operacji.' }
  if (c.amount == null && c.credit == null && c.debit == null) return { missing: 'Wskaż kolumnę z kwotą (albo kolumny uznań i obciążeń).' }
  if (c.amount == null && (c.credit == null) !== (c.debit == null)) return { missing: 'Przy dwóch kolumnach kwot wskaż obie – uznania (wpływy) i obciążenia (wydatki).' }
  if (c.description == null && c.counterparty == null) return { missing: 'Wskaż kolumnę z opisem albo z kontrahentem – bez nich operacji nie da się rozpoznać.' }
  const used = Object.values(c).filter((x): x is number => x != null)
  if (new Set(used).size !== used.length) return { missing: 'Jedna kolumna wskazana dwa razy – każda rola potrzebuje własnej kolumny.' }
  // What fi.json keeps of a mapping (`csvMappingSchema`, przegląd R1 5): one beyond it is never saved to be dropped.
  if (used.some((x) => x >= MAX_COLUMNS)) return { missing: `Kolumna dalej niż ${MAX_COLUMNS}. – FI czyta najwyżej ${MAX_COLUMNS} kolumn pliku.` }
  if (d.headers.length > MAX_COLUMNS || d.headers.some((h) => h.length > 200)) return { missing: 'Nagłówek nie wygląda na nazwy kolumn (bardzo długi) – sprawdź separator i wiersz nagłówka.' }
  const kept = csvMappingSchema.safeParse({ ...d, columns: { ...c, date: c.date } })
  if (!kept.success) return { missing: 'Tego układu pliku nie da się zapamiętać – sprawdź separator, kodowanie i wiersz nagłówka.' }
  return { mapping: kept.data }
}

/** At most this many columns a mapping names (`csvMappingSchema` – a column's number below it). */
export const MAX_COLUMNS = 200

/** A file's columns without the header (the number of cells of its widest first rows after the skipped ones). */
export const widthOf = (rows: Rows, d: Pick<CsvDraft, 'skipRows'>): number => Math.max(0, ...rows.slice(d.skipRows, d.skipRows + 20).map((r) => r.length))

/**
 * The roles of a draft for the rows of another separator or encoding (przegląd R1 11): by the header's names when the
 * header names a date, else the ones still within the file's columns – never a role on a column the file has not.
 */
export function columnsFor(d: CsvDraft, rows: Rows): CsvDraft['columns'] {
  const head = d.header ? rows[d.skipRows] : undefined
  const byName = head ? columnsByName(head) : null
  if (byName && byName.date != null) return byName
  const width = widthOf(rows, d)
  const out = { ...d.columns }
  for (const role of Object.keys(out) as CsvRole[]) if (out[role] != null && out[role]! >= width) out[role] = null
  return out
}

/**
 * A mapping of an account as this version reads it – a value it cannot read is none (przegląd R1 9): the one rule of
 * `readCsvMapping` (schema), here for the import's callers.
 */
export function accountMapping(a: { csvMapping?: unknown }): CsvMapping | null {
  return readCsvMapping(a as Pick<Account, 'csvMapping'>)
}

/** The draft of a saved mapping (the wizard opened again – „Zmień kolumny”): its columns this version knows. */
export function draftOf(m: CsvMapping): CsvDraft {
  const columns = { ...NO_COLUMNS }
  for (const role of Object.keys(NO_COLUMNS) as CsvRole[]) columns[role] = (m.columns[role] as number | null | undefined) ?? null
  return { separator: m.separator, encoding: m.encoding, skipRows: m.skipRows, header: m.header, headers: [...m.headers], dateFormat: m.dateFormat, decimal: m.decimal, columns }
}

/** The header's names a role's column has in Polish and other banks' files (folded). */
const NAMES: Array<[CsvRole, RegExp]> = [
  ['booked', /^(data ksiegowania|booking date|completed date|data waluty)$/],
  ['date', /^(data (operacji|transakcji|zlecenia)|data|date|transaction date|started date)$/],
  ['amount', /^(kwota( operacji| transakcji)?( \(.*\))?|amount|wartosc|kwota w walucie rachunku|kwota pln)$/],
  ['credit', /^(uznania?|wplywy?|przychody?|credit|ma)$/],
  ['debit', /^(obciazenia?|wydatki|wyplywy?|rozchody?|debit|wn|winien)$/],
  ['description', /^(opis( operacji| transakcji)?|tytul( operacji| przelewu)?|szczegoly( transakcji)?|description|title|details|reference)$/],
  ['counterparty', /^(kontrahent|nazwa kontrahenta|dane kontrahenta|odbiorca|nadawca|nadawca ?\/ ?odbiorca|odbiorca ?\/ ?nadawca|payee|merchant|counterparty|name)$/],
  ['operation', /^(rodzaj( operacji| transakcji)?|typ( operacji| transakcji)?|type|transaction type)$/],
  ['balance', /^(saldo( po operacji| po transakcji| ksiegowe)?|balance)$/],
  ['accountNo', /^(numer (rachunku|konta)( kontrahenta)?|nr (rachunku|konta)( kontrahenta)?|rachunek( kontrahenta)?|konto|account|iban)$/],
  ['currency', /^(waluta|currency)$/]
]

/** Is a header's cell the name of a column (not an operation's value)? */
const named = (cell: string): CsvRole | null => {
  const k = headerKey(cell)
  for (const [role, re] of NAMES) if (re.test(k)) return role
  return null
}

/** The roles of a header's columns by their names – the first column of a role; the booking's date only – the date. */
function columnsByName(head: readonly string[]): CsvDraft['columns'] {
  const columns: CsvDraft['columns'] = { ...NO_COLUMNS }
  head.forEach((cell, i) => {
    const role = named(cell)
    if (role && columns[role] == null) columns[role] = i
  })
  // A file with the booking's date only: it is the operations' date (the budget's date – spec).
  if (columns.date == null && columns.booked != null) [columns.date, columns.booked] = [columns.booked, null]
  // A signed amount wins over the two columns only when both are not there.
  if (columns.amount != null && columns.credit != null && columns.debit != null) columns.amount = null
  return columns
}

/** The separator the file's first lines are split by most alike (the most rows of the same count of cells, 2 and more). */
function separatorGuess(text: string): (typeof CSV_SEPARATORS)[number] {
  let best: { sep: (typeof CSV_SEPARATORS)[number]; score: number } = { sep: ';', score: -1 }
  for (const sep of CSV_SEPARATORS) {
    const rows = parseCsv(text, sep).slice(0, 40)
    const counts = new Map<number, number>()
    for (const r of rows) if (r.length >= 2) counts.set(r.length, (counts.get(r.length) ?? 0) + 1)
    // The most rows alike, then the more cells of them.
    let score = 0
    for (const [cells, n] of counts) score = Math.max(score, n * 1000 + cells)
    if (score > best.score) best = { sep, score }
  }
  return best.sep
}

/** The date format all the samples are read in (a day over 12 first tells DD/MM from MM/DD – DD/MM by default). */
function dateFormatGuess(samples: readonly string[]): (typeof CSV_DATE_FORMATS)[number] | null {
  const filled = samples.filter((s) => s.trim())
  if (!filled.length) return null
  for (const f of CSV_DATE_FORMATS) if (filled.every((s) => parseCsvDate(s, f))) return f
  return null
}

/** The decimal mark of the amounts' samples (`,` unless only „12.34” is written). */
function decimalGuess(samples: readonly string[]): ',' | '.' {
  const t = samples.map((s) => s.replace(/[\s A-Za-zł]/g, ''))
  if (t.some((s) => /\d,\d{1,2}$/.test(s))) return ','
  if (t.some((s) => /\d\.\d{1,2}$/.test(s))) return '.'
  return ','
}

export interface CsvGuess {
  draft: CsvDraft
  /** The file's first rows split by the draft's separator (the wizard's preview). */
  rows: Rows
}

/** The file's first rows split by a draft (the wizard's preview): its separator and encoding, at most `max` rows. */
export function previewRows(bytes: Uint8Array, d: Pick<CsvDraft, 'separator' | 'encoding'>, max = 60): Rows {
  return parseCsv(decodeAs(headOf(bytes), d.encoding), separatorOf(d)).slice(0, max)
}

/**
 * The wizard's first proposal for a file that is no mBank's (T460): the separator, the header (the first row naming a date
 * and an amount – else the first row with a date and an amount in it: no header), the columns by their names, the date
 * format and the decimal mark of the first operations. Null – the file is no table at all (no CSV).
 */
export function guessCsv(bytes: Uint8Array): CsvGuess | null {
  const text = decodeText(headOf(bytes))
  if (text.includes('\u0000')) return null
  const separator = separatorGuess(text)
  const rows = parseCsv(text, separator).slice(0, 60)
  if (rows.filter((r) => r.length >= 2).length < 1) return null
  let columns: CsvDraft['columns'] = { ...NO_COLUMNS }
  const header = rows.findIndex((r) => {
    const roles = new Set(r.map(named))
    return (roles.has('date') || roles.has('booked')) && (roles.has('amount') || roles.has('credit') || roles.has('debit'))
  })
  let skipRows = Math.max(0, header)
  if (header >= 0) columns = columnsByName(rows[header]!)
  else {
    // No header: the first row with a date and an amount in it – its date's and amount's columns.
    const at = rows.findIndex((r) => r.some((c) => CSV_DATE_FORMATS.some((f) => parseCsvDate(c, f))) && r.some((c) => /\d[.,]\d{2}\s*$/.test(c.trim())))
    skipRows = Math.max(0, at)
    const r = rows[skipRows] ?? []
    columns.date = r.findIndex((c) => CSV_DATE_FORMATS.some((f) => parseCsvDate(c, f)))
    const amount = r.findIndex((c, i) => i !== columns.date && /^[-+−(]?[\d\s .,]+\d[.,]\d{2}\)?(\s*[A-Za-zł]{2,3})?$/.test(c.trim()))
    columns.date = columns.date >= 0 ? columns.date : null
    columns.amount = amount >= 0 ? amount : null
  }
  const data = rows.slice(skipRows + (header >= 0 ? 1 : 0)).filter((r) => r.some((c) => c.trim())).slice(0, 30)
  const dates = data.map((r) => (columns.date == null ? '' : (r[columns.date] ?? '')))
  const amounts = data.flatMap((r) => [columns.amount, columns.credit, columns.debit, columns.balance].flatMap((c) => (c == null ? [] : [r[c] ?? ''])))
  const draft: CsvDraft = {
    separator,
    encoding: 'auto',
    skipRows,
    header: header >= 0,
    headers: header >= 0 ? rows[header]!.map((c) => c.trim()) : [],
    dateFormat: dateFormatGuess(dates) ?? 'RRRR-MM-DD',
    decimal: decimalGuess(amounts),
    columns
  }
  return { draft, rows }
}

/** The draft with its header's cells read again from the file (another separator, encoding or header row chosen). */
export function withHeaders(d: CsvDraft, rows: Rows): CsvDraft {
  return { ...d, headers: d.header ? (rows[d.skipRows] ?? []).map((c) => c.trim()) : [] }
}

/** The first operations a draft reads (the wizard's preview of the result): rows and the ones left out, at most `max`. */
export function previewMapped(bytes: Uint8Array, d: CsvDraft, max = 8): { rows: MbankRow[]; skipped: MbankFile['skipped'] } | null {
  const done = completeMapping(d)
  if (!('mapping' in done)) return null
  const file = parseMappedCsv(decodeAs(headOf(bytes, 64 * 1024), d.encoding), done.mapping)
  return { rows: file.rows.slice(0, max), skipped: file.skipped.slice(0, max) }
}
