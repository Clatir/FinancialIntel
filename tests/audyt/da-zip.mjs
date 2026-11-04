// Audit DA: the entries of ZIPs (count, and whether a name is in) – `node tests/audyt/da-zip.mjs <needle> <zip>...`.
import yauzl from 'yauzl'

const [, , needle, ...zips] = process.argv
for (const zip of zips) {
  await new Promise((resolve) => {
    yauzl.open(zip, { lazyEntries: true }, (err, z) => {
      if (err || !z) {
        console.log(zip, 'BŁĄD', err?.message)
        return resolve(null)
      }
      let n = 0
      let found = false
      z.on('entry', (e) => {
        n++
        if (e.fileName.includes(needle)) found = true
        z.readEntry()
      })
      z.on('end', () => {
        console.log(zip, 'wpisów', n, 'zawiera', needle, found)
        resolve(null)
      })
      z.on('error', (e) => {
        console.log(zip, 'BŁĄD', e.message)
        resolve(null)
      })
      z.readEntry()
    })
  })
}
