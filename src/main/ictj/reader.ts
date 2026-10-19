/**
 * Reading the ICT Trade Journal's data folder (D60): only `payouts/` and `forecasts/`, read only – FI never writes in
 * it (CLAUDE.md, „ICTTJ – wzorce i granica”). A file FI cannot read is skipped with a warning.
 */
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import {
  ICTJ_FORECAST_FILE,
  ICTJ_KNOWN_SCHEMA,
  ICTJ_PAYOUT_FILE,
  parseIctjForecast,
  parseIctjPayout,
  type IctjEntry,
  type IctjForecast,
  type IctjSnapshot
} from '@shared/ictj'
import { DataStore } from '../datastore/store'

/** A payout or a scenario is a few kilobytes; anything far bigger is not one. */
const MAX_FILE_BYTES = 2 * 1024 * 1024

async function readJson(file: string): Promise<unknown> {
  const st = await fs.stat(file)
  if (!st.isFile() || st.size > MAX_FILE_BYTES) throw new Error('not a record')
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

/** A folder's names; a folder not there yet is empty – any other error (OneDrive busy, no access) is the caller's (B73). */
const names = (dir: string): Promise<string[]> =>
  fs.readdir(dir).catch((e: NodeJS.ErrnoException) => {
    if (e.code === 'ENOENT') return []
    throw e
  })

/** An error of a folder's listing as the snapshot says it (B73). */
class ListingError extends Error {}

/**
 * One entry per id (B71): an entry moved by a change of its date sits in two files while OneDrive brings the change – the
 * newer one counts (`updatedAt`, none = oldest), then the one of the smaller path, as ICTTJ itself resolves it.
 */
function oneEntryPerId(found: ReadonlyArray<{ entry: IctjEntry; path: string }>): { entries: IctjEntry[]; twice: string[] } {
  const best = new Map<string, { entry: IctjEntry; path: string }>()
  // The files left out (the older of each pair) – the warning names them.
  const twice: string[] = []
  for (const x of found) {
    const cur = best.get(x.entry.id)
    if (!cur) {
      best.set(x.entry.id, x)
      continue
    }
    const a = x.entry.updatedAt ?? ''
    const b = cur.entry.updatedAt ?? ''
    if (a > b || (a === b && x.path < cur.path)) {
      best.set(x.entry.id, x)
      twice.push(cur.path)
    } else twice.push(x.path)
  }
  return { entries: [...best.values()].map((x) => x.entry), twice }
}

export async function readIctjFolder(dir: string, now = new Date()): Promise<IctjSnapshot> {
  const readAt = now.toISOString()
  const base = { dir, entries: [] as IctjEntry[], forecasts: [] as IctjForecast[], warnings: [] as string[], readAt }
  const kind = await DataStore.inspect(dir).catch(() => 'missing' as const)
  if (kind === 'missing') return { ...base, status: 'missing', message: 'Folder ICTTJ jest niedostępny – OneDrive może się jeszcze nie uruchomił albo dysk jest odłączony.' }
  if (kind !== 'ictj') return { ...base, status: 'not-ictj', message: 'W tym folderze nie ma danych ICT Trade Journal (brak pliku journal.json).' }

  const found: Array<{ entry: IctjEntry; path: string }> = []
  const problems: string[] = []
  // The payouts not read (their ids from the files' names) and a folder not listed: no entry of them is deleted (B21).
  const unread: string[] = []
  let complete = true
  // A payouts' folder not listed (B73): the snapshot is an error – never „read” with its entries missing (the XTB inflows
  // would show as without an entry, the dockings as deleted in ICTTJ).
  const listed = (d: string, rel: string, optional: boolean): Promise<string[]> =>
    fs.readdir(d).catch((e: NodeJS.ErrnoException) => {
      if (optional && e.code === 'ENOENT') return []
      if (e.code === 'ENOENT') {
        complete = false
        return []
      }
      throw new ListingError(`nie udało się odczytać ${rel}: ${e.code ?? e.message}`)
    })
  let newest = 0
  try {
    for (const year of (await listed(join(dir, 'payouts'), 'payouts', true)).filter((n) => /^\d{4}$/.test(n)).sort()) {
      for (const file of (await listed(join(dir, 'payouts', year), `payouts/${year}`, false)).sort()) {
        const name = ICTJ_PAYOUT_FILE.exec(file)
        if (!name) continue
        try {
          const p = parseIctjPayout(await readJson(join(dir, 'payouts', year, file)))
          newest = Math.max(newest, p.schemaVersion)
          if (p.entry) found.push({ entry: p.entry, path: `payouts/${year}/${file}` })
          else if (p.problem) unread.push(name[2]!)
          if (p.problem) problems.push(`payouts/${year}/${file}: ${p.problem}`)
        } catch {
          unread.push(name[2]!)
          problems.push(`payouts/${year}/${file}: nieczytelny plik`)
        }
      }
    }
    const forecasts: IctjForecast[] = []
    // The scenarios not listed: their goals stay as they are (no scenario to follow changes nothing) – a warning.
    const forecastFiles = await names(join(dir, 'forecasts')).catch((e: NodeJS.ErrnoException) => {
      problems.push(`forecasts: nie udało się odczytać folderu (${e.code ?? e.message})`)
      return [] as string[]
    })
    for (const file of forecastFiles.sort()) {
      if (!ICTJ_FORECAST_FILE.test(file)) continue
      try {
        const f = parseIctjForecast(await readJson(join(dir, 'forecasts', file)))
        newest = Math.max(newest, f.schemaVersion)
        if (f.forecast) forecasts.push(f.forecast)
        else problems.push(`forecasts/${file}: nieczytelny scenariusz`)
      } catch {
        problems.push(`forecasts/${file}: nieczytelny plik`)
      }
    }
    const warnings: string[] = []
    if (newest > ICTJ_KNOWN_SCHEMA) warnings.push(`ICTTJ zapisał dane w nowszym formacie (wersja ${newest}) – FI czyta pola, które zna; zaktualizuj Financial Intel.`)
    if (problems.length) warnings.push(`Pominięte pliki ICTTJ (${problems.length}): ${problems.slice(0, 3).join('; ')}${problems.length > 3 ? '; …' : ''}`)
    const { entries, twice } = oneEntryPerId(found)
    if (twice.length) warnings.push(`Wpis ICTTJ w dwóch plikach (konflikt do rozstrzygnięcia w ICTTJ → Synchronizacja) – FI bierze nowszy: ${twice.slice(0, 3).join('; ')}${twice.length > 3 ? '; …' : ''}`)
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    return { ...base, status: 'ok', message: null, entries, forecasts, warnings, unread, complete }
  } catch (e) {
    return { ...base, status: 'error', message: e instanceof ListingError ? `Nie udało się odczytać folderu ICTTJ – ${e.message}.` : `Nie udało się odczytać folderu ICTTJ: ${(e as Error).message}` }
  }
}
