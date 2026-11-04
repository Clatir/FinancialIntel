/**
 * System messages said in Polish (AP-23): a file system's, the JSON parser's, the archive reader's and the schema's
 * English texts become a sentence the captain reads; the raw text goes to the log only (the main process logs every
 * failed call with its detail, `handle` in `main/index.ts`).
 */

const ERRNO: Record<string, { phrase: string; text: string }> = {
  ENOENT: { phrase: 'no such file or directory', text: 'nie ma takiego pliku ani folderu (może dysk jest odłączony)' },
  EBUSY: { phrase: 'resource busy or locked', text: 'plik jest zajęty przez inny program (np. OneDrive jeszcze go pobiera)' },
  EPERM: { phrase: 'operation not permitted', text: 'system nie pozwala na tę operację (plik tylko do odczytu albo zablokowany)' },
  EACCES: { phrase: 'permission denied', text: 'brak uprawnień do pliku lub folderu' },
  ENOSPC: { phrase: 'no space left on device', text: 'brak miejsca na dysku' },
  EEXIST: { phrase: 'file already exists', text: 'taki plik już istnieje' },
  ENOTDIR: { phrase: 'not a directory', text: 'to nie jest folder' },
  EISDIR: { phrase: 'illegal operation on a directory', text: 'to jest folder, nie plik' },
  EMFILE: { phrase: 'too many open files', text: 'za dużo otwartych plików naraz' },
  ENOTEMPTY: { phrase: 'directory not empty', text: 'folder nie jest pusty' },
  EROFS: { phrase: 'read-only file system', text: 'dysk jest tylko do odczytu' },
  EIO: { phrase: 'i/o error', text: 'błąd odczytu lub zapisu na dysku' },
  ETIMEDOUT: { phrase: 'connection timed out', text: 'dysk albo sieć nie odpowiedziały na czas' }
}

/** „, open 'C:\…\plik.json'” and „ -> 'C:\…'” that follow a system's phrase. */
const WHERE = String.raw`(?:, [a-z]+)?(?: '[^']*')?(?: -> '[^']*')?`

const LINE = String.raw`(?: \(line \d+ column \d+\))?`
/** The JSON parser's English messages (V8): „… in JSON at position 12 (line 1 column 13)”, „Unexpected token 'x', "…" is not valid JSON”. */
const JSON_MESSAGE = new RegExp(
  String.raw`Unexpected token [^,]*, ".*?" is not valid JSON|Unexpected end of JSON input|"undefined" is not valid JSON|[A-Z][A-Za-z' {}]* in JSON at position \d+${LINE}|Unexpected non-whitespace character after JSON at position \d+${LINE}`,
  'g'
)

/** One failed JSON parse said in Polish, with where it broke when the parser says so. */
export function jsonErrorText(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e)
  if (/Unexpected end of JSON/i.test(message)) return 'plik urywa się w połowie'
  const at = /position (\d+)/.exec(message)
  return at ? `plik nie jest poprawnym zapisem JSON (błąd przy znaku ${Number(at[1]) + 1})` : 'plik nie jest poprawnym zapisem JSON'
}

const TYPE: Record<string, string> = {
  number: 'liczba',
  string: 'tekst',
  boolean: 'tak / nie',
  object: 'obiekt',
  array: 'lista',
  undefined: 'brak wartości',
  null: 'puste',
  bigint: 'liczba',
  nan: 'nie-liczba',
  date: 'data',
  int: 'liczba całkowita'
}
const typeWord = (t: string): string => TYPE[t.toLowerCase()] ?? t

/** A schema (zod) message in Polish; the text itself when the helper does not know it. */
export function schemaIssueText(message: string): string {
  const type = /^Invalid input: expected (\w+), received (\w+)$/.exec(message)
  if (type) return `powinno być: ${typeWord(type[1]!)}, jest: ${typeWord(type[2]!)}`
  if (/^Invalid option/.test(message)) return 'niedozwolona wartość'
  if (/^Too small/.test(message)) return 'wartość za mała'
  if (/^Too big/.test(message)) return 'wartość za duża'
  if (/^Invalid (string|input)/.test(message)) return 'niepoprawna wartość'
  if (/^Unrecognized key/.test(message)) return 'nieznane pole'
  return message
}

/**
 * The text with its system and parser phrases said in Polish: „ENOENT: no such file or directory, mkdir '\\?'” →
 * „nie ma takiego pliku ani folderu …”. The rest of the sentence (the app's own Polish) is left as it is. Safe to apply twice.
 */
export function plainError(text: string): string {
  let out = text
  for (const [code, { phrase, text: polish }] of Object.entries(ERRNO)) {
    out = out.replace(new RegExp(String.raw`\b${code}: ${phrase}${WHERE}`, 'g'), polish)
  }
  out = out.replace(/End of central directory record signature not found(?:\. Either not a zip file[^.]*\.?)?/i, 'archiwum ZIP jest uszkodzone albo niepełne')
  out = out.replace(JSON_MESSAGE, (m) => jsonErrorText(new Error(m)))
  out = out.replace(/Invalid input: expected \w+, received \w+/g, (m) => schemaIssueText(m))
  return out
}
