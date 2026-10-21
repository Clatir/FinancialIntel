// The phone's stand-ins for Node's modules (T303): the data store of the computers (`src/main/datastore/`) runs in
// the app's web view over the mirror of the OneDrive folder. One list for the build and for the tests.
import { resolve } from 'node:path'

/** @param {string} root the repository */
export function mobileNodeAliases(root) {
  const shim = (name) => resolve(root, 'src/mobile/node', name)
  return [
    { find: /^node:fs$/, replacement: shim('fs.ts') },
    { find: /^node:path$/, replacement: shim('path.ts') },
    { find: /^node:crypto$/, replacement: shim('crypto.ts') },
    { find: /^node:(zlib|stream|stream\/promises)$/, replacement: shim('unsupported.ts') }
  ]
}
