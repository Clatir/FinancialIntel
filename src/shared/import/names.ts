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

/** A folded name without its legal forms (spaces where they were). */
export function withoutLegalForms(folded: string): string {
  let s = folded
  for (const re of LEGAL) s = s.replace(re, ' ')
  return s
}

/**
 * The key a counterparty is grouped and remembered by: lower case without marks, without legal forms, numbers of
 * shops and terminals, phone numbers and punctuation – „DINO TESTOWO 4”, „AUTOMAT SPEC” and „AUTOMATSPEC Sp. z o.o.”
 * become „dinotestowo” and „automatspec”.
 */
export function counterpartyKey(name: string): string {
  return withoutLegalForms(fold(name))
    .split(/\s+/)
    .filter((tok) => !/^[\d\-+()./*]+$/.test(tok))
    .map((tok) => tok.replace(/\d{3,}$/, ''))
    .join('')
    .replace(/[^a-z0-9]/g, '')
}
