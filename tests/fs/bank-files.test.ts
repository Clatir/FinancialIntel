import { copyFileSync, promises as fs, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BankFiles, looksLikeMbank } from '../../src/main/bankFiles'
import type { BankFile } from '@shared/api'
import { tempDir } from './helpers'

const FIXTURE = join(__dirname, '..', 'fixtures', 'mbank', 'lista_operacji.csv')
const HISTORY = join(__dirname, '..', 'fixtures', 'mbank', 'historia_rachunku.csv')

let watcher: BankFiles | null = null
afterEach(() => {
  watcher?.stop()
  watcher = null
})

/** A watcher of the folders, with its lists as they come. */
function watch(dirs: string[]): { lists: BankFile[][]; next: (n: number) => Promise<BankFile[]> } {
  const lists: BankFile[][] = []
  watcher = new BankFiles({ onChange: (files) => lists.push(files), log: () => undefined, pollMs: 100 })
  watcher.setDirs(dirs.map((dir, i) => ({ dir, label: i ? 'Wyciągi' : 'Pobrane' })))
  const next = async (n: number) => {
    for (let i = 0; i < 100 && lists.length < n; i++) await new Promise((r) => setTimeout(r, 50))
    return lists[n - 1] ?? []
  }
  return { lists, next }
}

describe('pliki z mBanku w Pobranych (1.9.0, F14)', () => {
  it('CSV z mBanku z okresem i liczbą operacji; inny CSV, stary plik i inne rozszerzenie – pominięte', async () => {
    const dir = tempDir('fi-dl-')
    copyFileSync(FIXTURE, join(dir, 'lista_operacji.csv'))
    writeFileSync(join(dir, 'inny.csv'), 'a;b;c\n1;2;3\n')
    copyFileSync(HISTORY, join(dir, 'stara.csv'))
    const old = new Date(Date.now() - 30 * 86_400_000)
    utimesSync(join(dir, 'stara.csv'), old, old)
    copyFileSync(FIXTURE, join(dir, 'wyciag.txt'))
    const { next } = watch([dir])
    const files = await next(1)
    expect(files.map((f) => [f.name, f.where, f.format, f.period, f.rows, !!f.account])).toEqual([['lista_operacji.csv', 'Pobrane', 'lista', { from: '2024-10-18', to: '2025-10-18' }, 269, true]])
    // Read by its id only; an unknown id reads nothing.
    const read = await watcher!.read(files[0]!.id)
    expect(read?.name).toBe('lista_operacji.csv')
    expect(read?.bytes.length).toBe((await fs.stat(FIXTURE)).size)
    expect(await watcher!.read('nieznany')).toBeNull()
  })

  it('nowy plik w trakcie pracy i drugi folder; plik usunięty znika z listy', async () => {
    const dl = tempDir('fi-dl-')
    const other = tempDir('fi-dl-')
    const { lists, next } = watch([dl, other])
    // Nothing there: no list sent (the window starts empty).
    await new Promise((r) => setTimeout(r, 300))
    expect(lists).toEqual([])
    copyFileSync(HISTORY, join(other, 'historia.csv'))
    const found = await next(1)
    expect(found.map((f) => [f.name, f.where, f.period?.from])).toEqual([['historia.csv', 'Wyciągi', '2026-09-01']])
    await fs.rm(join(other, 'historia.csv'))
    expect(await next(2)).toEqual([])
  })

  it('plik wybrany w oknie importu ma swój identyfikator; wyłączone obserwowanie – pusta lista', async () => {
    const dir = tempDir('fi-dl-')
    const path = join(dir, 'wybrany.csv')
    copyFileSync(HISTORY, path)
    const { lists } = watch([])
    expect(lists).toEqual([])
    expect(watcher!.files).toEqual([])
    const id = watcher!.register(path)
    expect(await watcher!.pathOf(id)).toBe(path)
    expect((await watcher!.read(id))?.name).toBe('wybrany.csv')
    // Gone (deleted in Explorer): no path to move to the Recycle Bin.
    await fs.rm(path)
    expect(await watcher!.pathOf(id)).toBeNull()
  })

  it('początek pliku decyduje: nagłówek mBanku (UTF-8, Windows-1250, UTF-16) – inny CSV nie jest czytany w całości', () => {
    const header = '#Data operacji;#Opis operacji;#Rachunek;#Kategoria;#Kwota;'
    const enc = (text: string) => new TextEncoder().encode(text)
    expect(looksLikeMbank(enc(`mBank S.A.;\n#Klient;\nJAN;\n\n${header}\n`))).toBe(true)
    // Windows-1250: „księgowania” in one byte – the ASCII part decides.
    expect(looksLikeMbank(new Uint8Array([...enc('#Data ksi'), 0xea, ...enc('gowania;#Kwota;\n')]))).toBe(true)
    const utf16 = (text: string) => new Uint8Array([0xff, 0xfe, ...Array.from(text).flatMap((ch) => [ch.charCodeAt(0) & 0xff, ch.charCodeAt(0) >> 8])])
    expect(looksLikeMbank(utf16(`${header}\n`))).toBe(true)
    expect(looksLikeMbank(enc('data;kwota;saldo\n2026-10-01;12,50;100\n'))).toBe(false)
  })
})
