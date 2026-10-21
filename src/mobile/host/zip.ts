/**
 * A ZIP of stored (uncompressed) entries (T311): an Excel workbook (XLSX) made on the phone – the computers' yazl needs
 * Node's streams. Names in UTF-8, sizes under 4 GB (a list's export).
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = (CRC_TABLE[(c ^ bytes[i]!) & 0xff] as number) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipEntry {
  path: string
  data: Uint8Array
}

/** The archive's bytes: each entry's local header and data, the central directory, its end. */
export function storedZip(entries: readonly ZipEntry[], at: Date = new Date()): Uint8Array {
  const enc = new TextEncoder()
  const time = ((at.getHours() << 11) | (at.getMinutes() << 5) | Math.floor(at.getSeconds() / 2)) & 0xffff
  const date = (((Math.max(1980, at.getFullYear()) - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate()) & 0xffff
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const e of entries) {
    const name = enc.encode(e.path)
    const crc = crc32(e.data)
    const size = e.data.length
    const local = new Uint8Array(30 + name.length)
    const l = new DataView(local.buffer)
    l.setUint32(0, 0x04034b50, true)
    l.setUint16(4, 20, true) // version needed
    l.setUint16(6, 0x0800, true) // UTF-8 names
    l.setUint16(8, 0, true) // stored
    l.setUint16(10, time, true)
    l.setUint16(12, date, true)
    l.setUint32(14, crc, true)
    l.setUint32(18, size, true)
    l.setUint32(22, size, true)
    l.setUint16(26, name.length, true)
    local.set(name, 30)
    const dir = new Uint8Array(46 + name.length)
    const d = new DataView(dir.buffer)
    d.setUint32(0, 0x02014b50, true)
    d.setUint16(4, 20, true) // made by
    d.setUint16(6, 20, true) // needed
    d.setUint16(8, 0x0800, true)
    d.setUint16(10, 0, true)
    d.setUint16(12, time, true)
    d.setUint16(14, date, true)
    d.setUint32(16, crc, true)
    d.setUint32(20, size, true)
    d.setUint32(24, size, true)
    d.setUint16(28, name.length, true)
    d.setUint32(42, offset, true)
    dir.set(name, 46)
    parts.push(local, e.data)
    central.push(dir)
    offset += local.length + size
  }
  const dirSize = central.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const z = new DataView(end.buffer)
  z.setUint32(0, 0x06054b50, true)
  z.setUint16(8, entries.length, true)
  z.setUint16(10, entries.length, true)
  z.setUint32(12, dirSize, true)
  z.setUint32(16, offset, true)
  const all = [...parts, ...central, end]
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0))
  let at2 = 0
  for (const p of all) {
    out.set(p, at2)
    at2 += p.length
  }
  return out
}
