/**
 * The CSV export of mBank (spec: „Import z mBanku”), fixed on the user's file: „Lista operacji” – a header block
 * (`#Klient`, `#Za okres:`, `#dla rachunków:`), then `#Data operacji;#Opis operacji;#Kategoria;#Kwota` – and the older
 * account history with its own columns (`#Tytuł`, `#Nadawca/Odbiorca`, `#Numer konta`, `#Saldo po operacji`).
 * mBank's description is a row of padded fields (counterparty and title, address, type of operation, account
 * number, „transakcja nierozliczona”); runs of two or more spaces separate them. The bank's category is kept as a
 * weak hint only (D68). No hours: an import never says when in the day (spec).
 */
import { cleanBankName } from './names'
import { parseCsv } from './text'

export interface MbankRow {
  /** Line of the file (1-based), for messages. */
  line: number
  /** Date of the operation (RRRR-MM-DD). */
  date: string
  /** The description with its whitespace collapsed (without „transakcja nierozliczona”). */
  description: string
  /** Type of the operation („ZAKUP PRZY UŻYCIU KARTY W KRAJU”, „PRZELEW WEWNĘTRZNY PRZYCHODZĄCY”…); '' unknown. */
  operation: string
  /** Shop or person as the bank writes it, without the bank's additions (a date of the transaction, the town after „/”). */
  counterparty: string
  /**
   * The name as versions before 1.2.3 read it, when it was another (the bank's additions cut from `counterparty`; ''
   * = none – the type of operation named it): the rules they learned are looked up by it too.
   */
  bankName?: string
  /** Title of a transfer. */
  title: string
  /** The other side's account number (often masked); '' none. */
  accountNo: string
  /** The bank's category (a hint only). */
  category: string
  /** Grosze, signed. */
  amount: number
  /** „transakcja nierozliczona”: the amount or the row may still change. */
  pending: boolean
  /** Balance after the operation (the account history only). */
  balanceAfter: number | null
}

export interface MbankFile {
  format: 'lista' | 'historia'
  /** The account holder (`#Klient`): transfers to and from them are own transfers. */
  client: string | null
  account: string | null
  /** The period the file covers (`#Za okres:`). */
  period: { from: string; to: string } | null
  rows: MbankRow[]
  /** Rows left out, with the reason (another currency, a date or amount that cannot be read). */
  skipped: Array<{ line: number; reason: string }>
}

export class MbankFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MbankFormatError'
  }
}

/** „16.10.2026” or „2026-10-16” → '2026-10-16'; null when it is not a date. */
export function parseBankDate(s: string): string | null {
  const t = s.trim()
  let m = /^(\d{1,2})[.-](\d{1,2})[.-](\d{4})$/.exec(t)
  const [y, mo, d] = m ? [Number(m[3]), Number(m[2]), Number(m[1])] : (m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)) ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
  if (!y) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** „-1 750,00 PLN”, „26,44”, „1.234,56”, „-0.57 PLN” → grosze and the currency (null when not given). */
export function parseBankAmount(s: string): { grosze: number; currency: string | null } | null {
  let t = s.replace(/[\s ]/g, '').replace(/−/g, '-')
  const cur = /([A-Za-z]{3})$/.exec(t)
  if (cur) t = t.slice(0, -3)
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else t = t.replace(',', '.')
  const m = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(t)
  if (!m) return null
  const grosze = Number(m[2]) * 100 + Number((m[3] ?? '0').padEnd(2, '0'))
  return { grosze: m[1] === '-' ? -grosze : grosze, currency: cur ? cur[1]!.toUpperCase() : null }
}

const PENDING = /\s*transakcja nierozliczona\s*/i

/** Words a type of operation starts with (always in capitals in mBank's descriptions). */
const OPERATION_START =
  /^(ZAKUP|PRZELEW|BLIK|ZWROT|PROWIZJA|OPŁATA|OPLATA|WYPŁATA|WYPLATA|WPŁATA|WPLATA|KAPITALIZACJA|PODATEK|SPŁATA|SPLATA|ZLECENIE|POLECENIE|OBCIĄŻENIE|OBCIAZENIE|UZNANIE|PŁATNOŚĆ|PLATNOSC|STORNO|KOREKTA|ODSETKI|TRANSAKCJA|PRZEKAZ|WYMIANA|ZASILENIE|SPRZEDAŻ|KUPNO)\b/

const isOperation = (part: string) => OPERATION_START.test(part) && part === part.toUpperCase()
const isAddress = (part: string) => /^(UL\.|AL\.|OS\.|PL\.)/i.test(part) || /^\d{2}[-*]\d{3}\b/.test(part)
const isAccountNo = (part: string) => /^[\d\s]{10,}$/.test(part) || /^\[REDACTED\]/i.test(part) || /^[\dx*\s]{10,}$/i.test(part)

/** „ANNA X UL. TESTOWA 1 00*950 TESTOWO” → „ANNA X”; „MAREK X .” → „MAREK X”. */
function withoutAddress(name: string): string {
  return name
    .replace(/\s+(UL\.|AL\.|OS\.|PL\.)\s?.*$/i, '')
    .replace(/\s+\d{2}[-*]\d{3}\b.*$/, '')
    .replace(/\s+\.$/, '')
    .trim()
}


/** A card payment or its return („POS ZWROT TOWARU”): the account history writes the shop in the title. */
const PURCHASE = /^(ZAKUP|BLIK ZAKUP|PŁATNOŚĆ|PLATNOSC|TRANSAKCJA|ZWROT|POS ZWROT)/

/** Transfers and payments between people: the head holds „name, title” (and maybe the name again, an address). */
const TRANSFER_LIKE = /^(PRZELEW|BLIK P2P|ZLECENIE|POLECENIE|WPŁATA|WPLATA|PRZEKAZ|UZNANIE|OBCIĄŻENIE|OBCIAZENIE)/

/**
 * The fields of an mBank description (whitespace runs separate them); `bankName` = the other side's name as written,
 * when the bank's additions were cut from `counterparty`.
 */
export function splitDescription(raw: string): { description: string; operation: string; counterparty: string; bankName?: string; title: string; accountNo: string; pending: boolean } {
  const pending = PENDING.test(raw)
  const text = raw.replace(PENDING, '  ')
  const parts = text
    .split(/\s{2,}|\t/)
    .map((p) => p.trim())
    .filter((p) => p && p !== '.')
  const description = parts.join(' ')
  const named = (name: string, shop = false) => {
    const written = withoutAddress(name)
    const counterparty = cleanBankName(written, { town: shop })
    return written === counterparty ? { counterparty } : { counterparty, bankName: written }
  }
  let at = -1
  for (let i = parts.length - 1; i >= 0; i--)
    if (isOperation(parts[i]!)) {
      at = i
      break
    }
  if (at < 0) return { description, operation: '', ...named(parts[0] ?? ''), title: parts.slice(1).join(' '), accountNo: '', pending }
  const operation = parts[at]!
  const head = parts.slice(0, at)
  const accountNo = parts.slice(at + 1).find(isAccountNo) ?? ''
  if (!head.length) return { description, operation, counterparty: '', title: '', accountNo, pending }
  if (!TRANSFER_LIKE.test(operation)) return { description, operation, ...named(head[0]!, !/^BLIK P2P/.test(operation)), title: '', accountNo, pending }
  const first = head[0]!
  const comma = first.indexOf(', ')
  const second = head[1]
  // „Doładowanie telefonu | BLUE MEDIA SPÓŁKA AKCYJNA” (mTransfer), „XTB … , Withdrawal | XTB SPÓŁKA AKCYJNA”: the name next.
  if (second && !isAddress(second) && !isAccountNo(second))
    return { description, operation, ...named(second), title: comma >= 0 ? first.slice(comma + 2).trim() : first, accountNo, pending }
  if (comma >= 0) return { description, operation, ...named(first.slice(0, comma)), title: first.slice(comma + 2).trim(), accountNo, pending }
  return { description, operation, ...named(first), title: '', accountNo, pending }
}

const headerName = (cell: string) => cell.trim().replace(/^#/, '').trim().toLowerCase()

/** Read an mBank CSV export (already decoded – `decodeText`). Throws MbankFormatError when it is not one. */
export function parseMbank(text: string): MbankFile {
  const rows = parseCsv(text, ';')
  const firstCell = (r: string[] | undefined) => (r?.[0] ?? '').trim()
  const after = (label: RegExp): string[] | null => {
    const i = rows.findIndex((r) => label.test(firstCell(r)))
    return i >= 0 ? (rows[i + 1] ?? null) : null
  }
  const headerAt = rows.findIndex((r) => /^#data (operacji|księgowania)/i.test(firstCell(r)) && r.some((c) => headerName(c) === 'kwota'))
  if (headerAt < 0) throw new MbankFormatError('To nie jest plik CSV z mBanku: brak nagłówka „#Data operacji … #Kwota”. Pobierz w mBanku listę operacji albo historię rachunku jako CSV.')
  const header = rows[headerAt]!.map(headerName)
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h))
  const c = {
    date: col('data operacji'),
    booking: col('data księgowania'),
    description: col('opis operacji'),
    title: col('tytuł'),
    counterparty: col('nadawca/odbiorca'),
    account: col('numer konta'),
    category: col('kategoria'),
    amount: col('kwota'),
    balance: col('saldo po operacji')
  }
  const historia = c.title >= 0 || c.counterparty >= 0
  const client = after(/^#klient/i)?.[0]?.trim() || null
  const account = after(/^#dla rachunków|^#numer rachunku/i)?.[0]?.trim() || null
  const periodRow = after(/^#za okres/i)
  const from = periodRow ? parseBankDate(periodRow[0] ?? '') : null
  const to = periodRow ? parseBankDate(periodRow[1] ?? '') : null
  const out: MbankRow[] = []
  const skipped: MbankFile['skipped'] = []
  for (let i = headerAt + 1; i < rows.length; i++) {
    const r = rows[i]!
    if (r.every((cell) => !cell.trim())) continue
    if (firstCell(r).startsWith('#')) break
    const line = i + 1
    const date = parseBankDate(r[c.date >= 0 ? c.date : c.booking] ?? '')
    const money = parseBankAmount(r[c.amount] ?? '')
    if (!date) {
      skipped.push({ line, reason: `nieczytelna data „${(r[c.date >= 0 ? c.date : c.booking] ?? '').trim()}”` })
      continue
    }
    if (!money) {
      skipped.push({ line, reason: `nieczytelna kwota „${(r[c.amount] ?? '').trim()}”` })
      continue
    }
    if (money.currency && money.currency !== 'PLN') {
      skipped.push({ line, reason: `kwota w ${money.currency} – FI prowadzi tylko PLN` })
      continue
    }
    const parts = splitDescription(r[c.description] ?? '')
    const row: MbankRow = {
      line,
      date,
      description: parts.description,
      operation: parts.operation,
      counterparty: parts.counterparty,
      ...(parts.bankName ? { bankName: parts.bankName } : {}),
      title: parts.title,
      accountNo: parts.accountNo,
      category: c.category >= 0 ? (r[c.category] ?? '').trim() : '',
      amount: money.grosze,
      pending: parts.pending,
      balanceAfter: c.balance >= 0 ? (parseBankAmount(r[c.balance] ?? '')?.grosze ?? null) : null
    }
    if (historia) {
      // The account history: the type of operation in its own column, the title and the other side next to it; a card
      // payment has the shop in the title („ŻABKA Z1234 /WARSZAWA DATA TRANSAKCJI: 2026-10-01”) – the name, no title.
      const title = c.title >= 0 ? (r[c.title] ?? '').replace(/\s+/g, ' ').trim() : ''
      const who = c.counterparty >= 0 ? (r[c.counterparty] ?? '').replace(/\s+/g, ' ').trim() : ''
      row.operation = (r[c.description] ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
      const shop = !who && PURCHASE.test(row.operation)
      row.title = shop ? '' : title
      row.counterparty = shop ? cleanBankName(withoutAddress(title), { town: true }) : cleanBankName(withoutAddress(who))
      row.accountNo = c.account >= 0 ? (r[c.account] ?? '').replace(/['\s]/g, '') : ''
      // The description as the bank wrote it: the row's key across imports (`rowIdentity`) never changes.
      row.description = [row.operation, who, title].filter(Boolean).join(' ')
      // The name as versions before 1.2.3 read it ('' = none, the type of operation named it): their rules' keys.
      const before = withoutAddress(who) || (row.operation.startsWith('ZAKUP') ? title : '')
      if (before !== row.counterparty) row.bankName = before
      else delete row.bankName
    }
    out.push(row)
  }
  return { format: historia ? 'historia' : 'lista', client: client && !/^\[?red/i.test(client) ? client : null, account, period: from && to ? { from, to } : null, rows: out, skipped }
}

// ------------------------------------------------------------------ identity of a row across imports

/** FNV-1a (64-bit as two 32-bit halves): a short, stable fingerprint of a text. */
function fingerprint(text: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ ch, 0x5bd1e995) >>> 0
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

/** The row's content as it identifies the operation: date, description (without „nierozliczona”), amount. */
export function rowIdentity(row: Pick<MbankRow, 'date' | 'description' | 'amount'>): string {
  return `${row.date}|${row.description.replace(/\s+/g, ' ').trim().toUpperCase()}|${row.amount}`
}

/**
 * Keys of the rows (`bank.key` of the operations): the fingerprint of the content and its occurrence among identical
 * rows of the file (two „Bolt 12,49” the same day are two operations). The same row of a later file – overlapping
 * periods, a pending row settled with the same content – gets the same key.
 */
export function rowKeys(rows: readonly MbankRow[], accountId: string): string[] {
  const seen = new Map<string, number>()
  return rows.map((r) => {
    const id = rowIdentity(r)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    return `mbank:${fingerprint(`${accountId}|${id}`)}:${n}`
  })
}
