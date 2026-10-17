/**
 * Records as the app wrote them, read while it runs: a file deleted or moved between the listing and the read is
 * skipped, and so is the temporary file of an atomic write (a name starting with a dot) – a test polling the folder
 * must never fail on the app's own write in progress (`main` CI of 0.3.0 did: ENOENT on an operation being deleted).
 */
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

export const json = async (path: string) => JSON.parse(await fs.readFile(path, 'utf8'))

/** Every record of a collection (`<collection>/ULID.json` or `<collection>/RRRR/…`), parsed, in the order of the paths. */
export async function records(dataDir: string, collection: string): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = []
  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith('.')) continue
      const path = join(dir, e.name)
      if (e.isDirectory()) await walk(path)
      else if (e.name.endsWith('.json')) {
        const text = await fs.readFile(path, 'utf8').catch(() => null)
        if (text) out.push(JSON.parse(text))
      }
    }
  }
  await walk(join(dataDir, collection))
  return out
}
