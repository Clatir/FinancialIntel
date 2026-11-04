// Odczyt folderu danych FI i folderu ICTTJ dla wyroczni (AU-9). Tylko pliki kanoniczne (CLAUDE.md „Dane”,
// T18, T62): kopie konfliktów chmury, pliki tymczasowe, game/, .history/, backups/, .presence/ są pomijane.
import fs from 'node:fs'
import path from 'node:path'
import { normalizeBalance, normalizeContainer, normalizeDocking, normalizeGoal, normalizeLoan, normalizeMonth, normalizeScheduled, normalizeSettings, normalizeTransaction } from './schemat.mjs'

const ULID = '[0-9A-HJKMNP-TV-Z]{26}'
const DATED = new RegExp(`^\\d{4}-\\d{2}-\\d{2}_${ULID}\\.json$`)
const BYID = new RegExp(`^${ULID}\\.json$`)
const MONTH = /^\d{4}-(0[1-9]|1[0-2])\.json$/

const COLLECTIONS = {
  transactions: 'dated',
  containers: 'id',
  goals: 'id',
  months: 'month',
  dockings: 'dated',
  loans: 'id',
  balances: 'dated',
  scheduled: 'id',
  imports: 'id'
}
// AP-32: rekordy z wartościami domyślnymi schematu (kopia `schemat.mjs`), jak po odczycie w aplikacji
const NORMALIZE = { transactions: normalizeTransaction, containers: normalizeContainer, goals: normalizeGoal, months: normalizeMonth, dockings: normalizeDocking, loans: normalizeLoan, balances: normalizeBalance, scheduled: normalizeScheduled, imports: (x) => x }

function readJson(file, problems) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    problems.push(`nieczytelny plik ${file}: ${e.message}`)
    return null
  }
}

function listCanonical(dir, layout, problems) {
  if (!fs.existsSync(dir)) return []
  const out = []
  if (layout === 'dated') {
    for (const y of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!y.isDirectory() || !/^\d{4}$/.test(y.name)) continue
      for (const f of fs.readdirSync(path.join(dir, y.name))) {
        if (DATED.test(f)) out.push(path.join(dir, y.name, f))
        else if (f.endsWith('.json')) problems.push(`pominięty (nie kanoniczny – kopia konfliktu?): ${path.join(y.name, f)}`)
      }
    }
  } else {
    const re = layout === 'id' ? BYID : MONTH
    for (const f of fs.readdirSync(dir)) {
      if (re.test(f)) out.push(path.join(dir, f))
      else if (f.endsWith('.json')) problems.push(`pominięty (nie kanoniczny – kopia konfliktu?): ${path.basename(dir)}/${f}`)
    }
  }
  return out.sort()
}

/** Folder danych FI bez wartości domyślnych: { dir, fi, settings, <kolekcje>, problems } – pliki tak, jak są. */
export function readFolderRaw(dir) {
  const problems = []
  const fi = readJson(path.join(dir, 'fi.json'), problems)
  if (!fi) throw new Error(`Brak albo nieczytelny fi.json w ${dir}`)
  const out = { dir, fi, fiMeta: { createdAt: fi.createdAt, updatedAt: fi.updatedAt }, settings: fi.settings ?? {}, problems }
  for (const [name, layout] of Object.entries(COLLECTIONS)) {
    out[name] = listCanonical(path.join(dir, name), layout, problems)
      .map((f) => readJson(f, problems))
      .filter(Boolean)
  }
  return out
}

/** Folder danych FI → { settings, fiMeta, <kolekcje>, problems } z wartościami domyślnymi schematu. */
export function loadFolder(dir) {
  return normalizeInput(readFolderRaw(dir))
}

/** Rekordy w pamięci (testy, regresja) – te same wartości domyślne co `loadFolder`. */
export function normalizeInput(input) {
  const out = { ...input, settings: normalizeSettings(input.settings ?? {}) }
  for (const name of Object.keys(COLLECTIONS)) out[name] = (input[name] ?? []).map(NORMALIZE[name])
  return out
}

/** Folder ICTTJ (tylko odczyt, T62): payouts/RRRR/RRRR-MM-DD_ULID.json i forecasts/ULID.json. */
export function loadIctj(dir) {
  if (!dir) return null
  const problems = []
  const payouts = []
  const pdir = path.join(dir, 'payouts')
  if (fs.existsSync(pdir)) {
    for (const f of listCanonical(pdir, 'dated', problems)) {
      const r = readJson(f, problems)
      if (!r) continue
      if (r.kind !== 'withdrawal' && r.kind !== 'return') continue // wydatki ICTTJ pomijane (spec)
      payouts.push({ ...r, amountGr: Math.round(Number(r.amount) * 100) })
    }
  }
  const forecasts = listCanonical(path.join(dir, 'forecasts'), 'id', problems)
    .map((f) => readJson(f, problems))
    .filter(Boolean)
  // jeden wpis na id: nowszy updatedAt (T225)
  const byId = new Map()
  for (const p of payouts) {
    const prev = byId.get(p.id)
    if (!prev || (p.updatedAt ?? '') > (prev.updatedAt ?? '')) byId.set(p.id, p)
  }
  return { dir, payouts: [...byId.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1)), forecasts, problems }
}
