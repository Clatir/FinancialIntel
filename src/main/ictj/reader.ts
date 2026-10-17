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

const names = (dir: string): Promise<string[]> => fs.readdir(dir).catch(() => [])

export async function readIctjFolder(dir: string, now = new Date()): Promise<IctjSnapshot> {
  const readAt = now.toISOString()
  const base = { dir, entries: [] as IctjEntry[], forecasts: [] as IctjForecast[], warnings: [] as string[], readAt }
  const kind = await DataStore.inspect(dir).catch(() => 'missing' as const)
  if (kind === 'missing') return { ...base, status: 'missing', message: 'Folder ICTTJ jest niedostępny – OneDrive może się jeszcze nie uruchomił albo dysk jest odłączony.' }
  if (kind !== 'ictj') return { ...base, status: 'not-ictj', message: 'W tym folderze nie ma danych ICT Trade Journal (brak pliku journal.json).' }

  const entries: IctjEntry[] = []
  const problems: string[] = []
  let newest = 0
  try {
    for (const year of (await names(join(dir, 'payouts'))).filter((n) => /^\d{4}$/.test(n)).sort()) {
      for (const file of (await names(join(dir, 'payouts', year))).sort()) {
        if (!ICTJ_PAYOUT_FILE.test(file)) continue
        try {
          const p = parseIctjPayout(await readJson(join(dir, 'payouts', year, file)))
          newest = Math.max(newest, p.schemaVersion)
          if (p.entry) entries.push(p.entry)
          if (p.problem) problems.push(`payouts/${year}/${file}: ${p.problem}`)
        } catch {
          problems.push(`payouts/${year}/${file}: nieczytelny plik`)
        }
      }
    }
    const forecasts: IctjForecast[] = []
    for (const file of (await names(join(dir, 'forecasts'))).sort()) {
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
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    return { ...base, status: 'ok', message: null, entries, forecasts, warnings }
  } catch (e) {
    return { ...base, status: 'error', message: `Nie udało się odczytać folderu ICTTJ: ${(e as Error).message}` }
  }
}
