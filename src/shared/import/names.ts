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
  return withoutLegalForms(fold(raw ? name : cleanBankName(name)))
    .split(/\s+/)
    .filter((tok) => !/^[\d\-+()./*]+$/.test(tok))
    .map((tok) => tok.replace(/\d{3,}$/, ''))
    .join('')
    .replace(/[^a-z0-9]/g, '')
}
