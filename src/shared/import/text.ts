// adapted from ICTTJ src/shared/import/tables.ts @ 84a8339
/**
 * Bank export files as text and rows of cells: decoding (UTF-8 with or without BOM, UTF-16 with BOM, Windows-1250 –
 * older mBank exports) and CSV with quotes (RFC 4180). Pure; the main process only reads the file's bytes.
 */

export type Rows = string[][]

/** Bytes of a text file → string: BOM (UTF-8 / UTF-16 LE / BE), else UTF-8, else Windows-1250 (Polish banks, Excel). */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3))
  // UTF-16 without BOM (rare): every other byte of ASCII text is 0.
  if (bytes.length >= 4 && bytes[1] === 0 && bytes[3] === 0 && bytes[0] !== 0) return new TextDecoder('utf-16le').decode(bytes)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    try {
      return new TextDecoder('windows-1250').decode(bytes)
    } catch {
      return new TextDecoder('latin1').decode(bytes)
    }
  }
}

/**
 * CSV with a given separator (mBank: ';'); quotes as in RFC 4180 (a quoted cell may hold the separator and line
 * breaks). Cells are not trimmed: the padding of mBank's descriptions carries their fields.
 */
export function parseCsv(text: string, sep = ';'): Rows {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: Rows = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!
    if (quoted) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && body[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

/** A bank's file read at most this big (T42): a file of hundreds of MB is no statement – never read into a window. */
export const IMPORT_MAX_BYTES = 20 * 1024 * 1024
