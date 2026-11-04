/**
 * A counterparty's name as the import compares it (E2): folded, without legal forms, numbers of shops and terminals,
 * phone numbers and punctuation. `brands.ts` builds the brand key on top of it (1.2.1).
 */
import { fold } from '../fold'

/** Legal forms dropped from a counterparty's key („AUTOMATSPEC Sp. z o.o.” = „AUTOMATSPEC”). */
const LEGAL = [
  /\bsp(ó|o)?(ł|l)ka\s+z\s+o(granicz\w*)?\.?(\s*o(dpowiedzialno\w*)?\.?)?/g,
  /\bsp(ó|o)?(ł|l)ka\s+akcyjna\b/g,
  /\bsp(ó|o)?(ł|l)ka\s+(jawna|komandytowa|cywilna)\b/g,
  /\bsp\.?\s*z\s*o\.?\s*o\.?/g,
  /\bsp\.?\s*z\s*o\b/g,
  /\bsp\.?\s*(j|k|c)\b\.?/g,
  /\b(s\.?a|ltd|gmbh|inc|llc|co|kg|ag|bv|oy|ab|sas|sarl|plc|limited)\b\.?/g
]

/**
 * A name without what the bank adds to it (1.2.3): mBank's account history writes a card payment as „Apteka Na
 * Rynku   /Testowo    DATA TRANSAKCJI: 2026-10-01” (the shop in 19 characters, the town in 10) – the date of the
 * transaction and any other date or time, a masked card number and a reference tell nothing of the shop (every day
 * would be another name); `town` = a card payment's name: in a name the bank dated so, the town right after the last
 * „/” goes too (never „JAN KOWALSKI / ANNA KOWALSKA” of a transfer, nor „Czynsz/mieszkanie” or „AC/DC” typed by
 * hand). Never empty: a name of nothing else stays as it was.
 */
export function cleanBankName(name: string, opts: { town?: boolean } = {}): string {
  let s = name.replace(/\bDATA\s+(TRANSAKCJI|OPERACJI|WYKONANIA|KSI[EĘ]GOWANIA|WALUTY)\b\s*:?\s*[\d.\-/]*/gi, ' ')
  const dated = s !== name
  s = s
    .replace(/\b\d{4}[-./]\d{1,2}[-./]\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}[-./]\d{1,2}[-./]\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ')
    .replace(/\b\d{4,6}[X*]{4,}\d{0,4}\b/gi, ' ')
    .replace(/\bREF\b\.?\s*:?\s*[A-Z0-9-]*\d[A-Z0-9-]*/gi, ' ')
  // The town at the end, right after „/” (the bank keeps 10 characters of it; a phone or a website, sometimes nothing).
  if (opts.town && dated) s = s.trimEnd().replace(/\/(?!\s)[^/]*$/, ' ')
  // Nothing cut: the name as written („Sp. z o.o.” keeps its dot); else without what the cut left at the end.
  if (s === name) return name.trim()
  return s.replace(/\s+/g, ' ').replace(/[\s,;:/-]+$/, '').trim() || name.trim()
}

/**
 * What a list shows as an operation's name (AP-20, OP sp. 10, WY.13): its counterparty, else its title without what the
 * bank adds to it – an ATM's withdrawal has the machine in its title („BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI:
 * 2026-08-29” → „BANKOMAT EURONET 0412”); a title typed by hand is as written. '' – neither.
 */
export const operationName = (t: { counterparty: string; title: string; bank?: unknown }): string =>
  t.counterparty.trim() || (t.bank && t.title.trim() ? cleanBankName(t.title, { town: true }) : t.title.trim())

/** Short words of a name kept small after its first word („Apteka Dbam o Zdrowie”, „Bar pod Lipą”). */
const SMALL_WORDS = new Set(['i', 'w', 'z', 'o', 'u', 'a', 'na', 'do', 'od', 'za', 'ze', 'we', 'po', 'pod', 'nad', 'przy', 'dla'])
const VOWEL = /[aeiouyąęó]/i

/**
 * A bank's name in capitals as a person writes it (AP-20, SW sp. 7): „KEBAB ROMA” → „Kebab Roma”, „APTEKA DBAM O ZDROWIE”
 * → „Apteka Dbam o Zdrowie”, „ŻABKA Z1234” → „Żabka Z1234”; a short word without a vowel stays (KFC, BP, XTB), a word
 * with digits too. A name with any small letter is as written. For what is shown only – never a key.
 */
export function readableName(name: string): string {
  const s = name.trim()
  if (!/\p{Lu}/u.test(s) || /\p{Ll}/u.test(s)) return s
  let first = true
  return s
    .split(/(\s+)/)
    .map((w) => {
      if (!w || /^\s+$/.test(w)) return w
      const at = first
      first = false
      const lower = w.toLocaleLowerCase('pl')
      if (!at && SMALL_WORDS.has(lower)) return lower
      if (/\d/.test(w)) return w
      const letters = w.replace(/[^\p{L}]/gu, '')
      if (letters.length <= 3 && !VOWEL.test(letters)) return w
      // „COCA-COLA” → „Coca-Cola”, „L'OREAL” → „L'oreal”: each part after a hyphen, a dot or a slash.
      return lower.replace(/(^|[-./])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('pl'))
    })
    .join('')
}

/** A folded name without its legal forms (spaces where they were). */
export function withoutLegalForms(folded: string): string {
  let s = folded
  for (const re of LEGAL) s = s.replace(re, ' ')
  return s
}

/**
 * The key a counterparty is grouped and remembered by: lower case without marks, without legal forms, numbers of
 * shops and terminals, phone numbers and punctuation – „DINO TESTOWO 4”, „AUTOMAT SPEC” and „AUTOMATSPEC Sp. z o.o.”
 * become „dinotestowo” and „automatspec”; without the bank's additions (`cleanBankName`) unless `raw` – the key as
 * versions before 1.2.3 made it (their rules).
 */
export function counterpartyKey(name: string, raw = false): string {
  const id = raw ? `\u0001${name}` : name
  let key = keys.get(id)
  if (key === undefined) {
    key = withoutLegalForms(fold(raw ? name : cleanBankName(name)))
      .split(/\s+/)
      .filter((tok) => !/^[\d\-+()./*]+$/.test(tok))
      .map((tok) => tok.replace(/\d{3,}$/, ''))
      .join('')
      .replace(/[^a-z0-9]/g, '')
    if (keys.size >= KEYS_MAX) keys.clear()
    keys.set(id, key)
  }
  return key
}

/** Keys made already (W4): the same names come again and again (shops, people) – each one folded once. */
const keys = new Map<string, string>()
const KEYS_MAX = 50_000
