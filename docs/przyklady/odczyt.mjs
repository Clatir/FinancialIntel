#!/usr/bin/env node
// Przykładowy skrypt odczytu folderu danych Financial Intel (opis formatu: docs/format-folderu.md).
//
// Suma wydatków jednego miesiąca po kategoriach głównych – z plików transactions/**, tylko odczyt (skrypt niczego
// w folderze nie zapisuje). Node.js 18 lub nowszy, bez dodatkowych bibliotek.
//
//   node odczyt.mjs "C:\Users\Ja\OneDrive\FinancialIntel" 2026-11
//
// Miesiąc RRRR-MM jest opcjonalny (domyślnie bieżący). Co liczy: operacje rodzaju „wydatek” (`kind` = `expense`), każdą
// linię paragonu dzielonego osobno; zwrot towaru (dodatnia kwota wydatku) zmniejsza sumę swojej kategorii. Pomija linie
// finansowane przez domowników (`refundable` – to nie mój koszt), kopie konfliktów OneDrive i pliki tymczasowe. To prosty
// przykład: nie liczy warstw (osłony, energia) – te liczy tylko aplikacja.

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Nazwa pliku operacji: RRRR-MM-DD_ULID.json – kopia konfliktu („…-KOMPUTER.json”) i plik tymczasowy nie pasują. */
const TX_FILE = /^(\d{4}-\d{2}-\d{2})_[0-9A-HJKMNP-TV-Z]{26}\.json$/

/** Kategorie z fi.json: identyfikator → nazwa kategorii głównej (podkategoria liczy się do swojej głównej). */
async function mainCategories(folder) {
  const fi = JSON.parse(await readFile(join(folder, 'fi.json'), 'utf8'))
  const list = fi.settings?.categories ?? []
  const byId = new Map(list.map((c) => [c.id, c]))
  const main = new Map()
  for (const c of list) {
    const top = c.parentId ? (byId.get(c.parentId) ?? c) : c
    main.set(c.id, top.name)
  }
  return main
}

/** Suma wydatków miesiąca po kategoriach głównych, w groszach (wydatek > 0, zwrot < 0); klucz „bez kategorii” – bez niej. */
export async function sumMonth(folder, month) {
  const categories = await mainCategories(folder)
  const year = month.slice(0, 4)
  const dir = join(folder, 'transactions', year)
  let names = []
  try {
    names = await readdir(dir)
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
  const sums = new Map()
  const add = (categoryId, grosze) => {
    const name = categoryId ? (categories.get(categoryId) ?? 'nieznana kategoria') : 'bez kategorii'
    sums.set(name, (sums.get(name) ?? 0) + grosze)
  }
  for (const name of names) {
    const m = TX_FILE.exec(name)
    if (!m || m[1].slice(0, 7) !== month) continue
    const t = JSON.parse(await readFile(join(dir, name), 'utf8'))
    if ((t.kind ?? 'expense') !== 'expense') continue
    // Paragon dzielony: liczą się linie (sumują się do kwoty operacji).
    const lines = Array.isArray(t.splits) && t.splits.length ? t.splits : [t]
    for (const line of lines) {
      if (line.refundable) continue
      // Wydatek to kwota ujemna – koszt jest dodatni.
      add(line.categoryId ?? null, -line.amount)
    }
  }
  return sums
}

/** Kwota w groszach jako „1 234,56 zł”. */
export function zl(grosze) {
  const sign = grosze < 0 ? '−' : ''
  const abs = Math.abs(grosze)
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${whole},${String(abs % 100).padStart(2, '0')} zł`
}

/** Tekst raportu: kategorie od największej sumy, na końcu razem. */
export function report(month, sums) {
  const rows = [...sums].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl'))
  const width = Math.max(12, ...rows.map(([name]) => name.length))
  const lines = [`Wydatki ${month}`, ...rows.map(([name, g]) => `${name.padEnd(width)}  ${zl(g).padStart(14)}`)]
  const total = rows.reduce((a, [, g]) => a + g, 0)
  lines.push(`${'razem'.padEnd(width)}  ${zl(total).padStart(14)}`)
  return lines.join('\n')
}

async function main() {
  const [folder, monthArg] = process.argv.slice(2)
  if (!folder) {
    console.error('Użycie: node odczyt.mjs <folder danych> [RRRR-MM]')
    process.exit(2)
  }
  const now = new Date()
  const month = monthArg ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    console.error(`Miesiąc ma mieć postać RRRR-MM, a jest: ${month}`)
    process.exit(2)
  }
  console.log(report(month, await sumMonth(folder, month)))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
