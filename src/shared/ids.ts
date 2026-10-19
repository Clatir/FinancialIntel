// adapted from ICTTJ src/shared/ids.ts @ 84a8339
import { monotonicFactory, ulid } from 'ulid'

const monotonic = monotonicFactory()

/** Globally unique, time-sortable identifier (ULID). Never use counters: records are created on several machines. */
export function newId(): string {
  return monotonic()
}

/** ULID with an explicit timestamp (sample data, imports). */
export function idAt(timeMs: number): string {
  return ulid(timeMs)
}

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/

/** FNV-1a (32 bits) of a text from another offset: a few of them make the derived id's randomness. */
function fnv(text: string, offset: number): number {
  let h = (0x811c9dc5 ^ offset) >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/**
 * A ULID made from a text, the same on every computer (B17: two computers docking one ICTTJ payout write one file, not
 * two operations): the time of `at` (a ULID – else 0), the rest from `seed`. Never for what two records may share.
 */
export function derivedId(at: string, seed: string): string {
  const time = ULID.test(at) ? at.slice(0, 10) : '0000000000'
  const bits = [fnv(seed, 0), fnv(seed, 0x9e3779b9), fnv(seed, 0x85ebca6b)].map((w) => w.toString(2).padStart(32, '0')).join('')
  let rest = ''
  for (let i = 0; i < 16; i++) rest += B32[parseInt(bits.slice(i * 5, i * 5 + 5), 2)]
  return time + rest
}
