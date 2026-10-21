/**
 * `node:crypto` on the phone (T303): the SHA-1 the data store compares file contents with (`atomic.ts` `sha1`) and
 * random bytes for the names of temp files and of the history's versions.
 */
import { Buffer } from 'buffer'

const encoder = new TextEncoder()

function rotl(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n))
}

/** SHA-1 of bytes (FIPS 180-4) – the same hex as Node's `createHash('sha1')`. */
export function sha1Hex(bytes: Uint8Array): string {
  const len = bytes.length
  const blocks = ((len + 8) >>> 6) + 1
  const words = new Uint32Array(blocks * 16)
  for (let i = 0; i < len; i++) words[i >>> 2]! |= bytes[i]! << (24 - (i & 3) * 8)
  words[len >>> 2]! |= 0x80 << (24 - (len & 3) * 8)
  // The length in bits, as a 64-bit big-endian number in the last two words.
  words[blocks * 16 - 2] = Math.floor((len * 8) / 0x100000000)
  words[blocks * 16 - 1] = (len * 8) >>> 0
  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0
  const w = new Uint32Array(80)
  for (let b = 0; b < blocks; b++) {
    for (let t = 0; t < 16; t++) w[t] = words[b * 16 + t]!
    for (let t = 16; t < 80; t++) w[t] = rotl(w[t - 3]! ^ w[t - 8]! ^ w[t - 14]! ^ w[t - 16]!, 1)
    let a = h0
    let bb = h1
    let c = h2
    let d = h3
    let e = h4
    for (let t = 0; t < 80; t++) {
      let f: number
      let k: number
      if (t < 20) {
        f = (bb & c) | (~bb & d)
        k = 0x5a827999
      } else if (t < 40) {
        f = bb ^ c ^ d
        k = 0x6ed9eba1
      } else if (t < 60) {
        f = (bb & c) | (bb & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = bb ^ c ^ d
        k = 0xca62c1d6
      }
      const temp = (rotl(a, 5) + f + e + k + w[t]!) >>> 0
      e = d
      d = c
      c = rotl(bb, 30) >>> 0
      bb = a
      a = temp
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + bb) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }
  return [h0, h1, h2, h3, h4].map((h) => h.toString(16).padStart(8, '0')).join('')
}

class Sha1Hash {
  private parts: Uint8Array[] = []
  update(data: string | Uint8Array): this {
    this.parts.push(typeof data === 'string' ? encoder.encode(data) : data)
    return this
  }
  digest(encoding: 'hex'): string {
    if (encoding !== 'hex') throw new Error(`Nieobsługiwane kodowanie skrótu: ${String(encoding)}`)
    const total = this.parts.reduce((n, p) => n + p.length, 0)
    const all = new Uint8Array(total)
    let at = 0
    for (const p of this.parts) {
      all.set(p, at)
      at += p.length
    }
    return sha1Hex(all)
  }
}

export function createHash(algorithm: string): Sha1Hash {
  if (algorithm.toLowerCase() !== 'sha1') throw new Error(`Nieobsługiwany skrót: ${algorithm}`)
  return new Sha1Hash()
}

export function randomBytes(size: number): Buffer {
  const out = new Uint8Array(size)
  globalThis.crypto.getRandomValues(out)
  return Buffer.from(out)
}

export default { createHash, randomBytes }
