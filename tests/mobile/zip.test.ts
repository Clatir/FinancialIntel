// The phone's XLSX (T311): a ZIP of stored entries the computers' tools read – yauzl opens it, every entry with its
// bytes and its CRC; the workbook's parts as `xlsxParts` makes them.
import { describe, expect, it } from 'vitest'
import yauzl from 'yauzl'
import { crc32, storedZip } from '../../src/mobile/host/zip'
import { xlsxParts } from '../../src/shared/export/xlsx'

function entriesOf(zip: Uint8Array): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(Buffer.from(zip), { lazyEntries: true, validateEntrySizes: true }, (err, file) => {
      if (err || !file) return reject(err)
      const out: Record<string, string> = {}
      file.on('entry', (entry: yauzl.Entry) => {
        file.openReadStream(entry, (e, stream) => {
          if (e || !stream) return reject(e)
          const chunks: Buffer[] = []
          stream.on('data', (c: Buffer) => chunks.push(c))
          stream.on('end', () => {
            out[entry.fileName] = Buffer.concat(chunks).toString('utf8')
            file.readEntry()
          })
        })
      })
      file.on('end', () => resolve(out))
      file.on('error', reject)
      file.readEntry()
    })
  })
}

describe('ZIP telefonu (XLSX)', () => {
  it('CRC-32 jak w standardzie', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array())).toBe(0)
  })

  it('wpisy czytelne dla yauzl – nazwy z polskimi literami, treść bajt w bajt', async () => {
    const enc = new TextEncoder()
    const zip = storedZip([
      { path: 'a.txt', data: enc.encode('Żółć – zażółć gęślą jaźń') },
      { path: 'katalog/pusty.xml', data: new Uint8Array() }
    ])
    expect(await entriesOf(zip)).toEqual({ 'a.txt': 'Żółć – zażółć gęślą jaźń', 'katalog/pusty.xml': '' })
  })

  it('skoroszyt z xlsxParts – wszystkie części', async () => {
    const enc = new TextEncoder()
    const parts = xlsxParts([{ name: 'Operacje', columns: [{ header: 'Kwota', kind: 'money' }], rows: [[12.5], [-3]] }])
    const read = await entriesOf(storedZip(parts.map((p) => ({ path: p.path, data: enc.encode(p.content) }))))
    expect(Object.keys(read).sort()).toEqual(parts.map((p) => p.path).sort())
    expect(read['xl/workbook.xml']).toContain('Operacje')
  })
})
