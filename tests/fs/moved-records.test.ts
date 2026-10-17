// adapted from ICTTJ tests/fs/moved-records.test.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DataStore } from '../../src/main/datastore/store'
import { createDefaultSettings } from '@shared/defaults'
import { newerSide } from '@shared/conflicts'
import type { Collection } from '@shared/paths'
import type { RecordTypes } from '@shared/records'
import { balanceSchema, dockingSchema, MBANK_ACCOUNT_ID, type Transaction } from '@shared/schema'
import { readJson, sampleTransaction, tempDir } from './helpers'

/**
 * A record whose path holds its date (transactions, dockings, balances) moved by a date change on another computer
 * (ICTTJ step 8 of Wypłaty, W8-33–35): two stores on one folder, each its own machine, one clock (each write a second
 * later).
 */
async function twoComputers(): Promise<{ a: DataStore; b: DataStore; root: string }> {
  const root = join(tempDir(), 'dane')
  await DataStore.initialize(root, createDefaultSettings('2026-01-01T00:00:00.000Z'))
  let t = Date.parse('2026-10-16T08:00:00.000Z')
  const now = () => new Date((t += 1000)).toISOString()
  const a = new DataStore(root, { machineName: 'PC-A', now })
  const b = new DataStore(root, { machineName: 'PC-B', now })
  await a.open()
  await b.open()
  return { a, b, root }
}

const entry = (over: Partial<Transaction> = {}): Transaction => sampleTransaction({ date: '2026-10-01', amount: 100, note: '', ...over })

/** A valid record of another dated collection (a docking, a balance). */
function datedOf<C extends 'dockings' | 'balances'>(c: C): RecordTypes[C] {
  const t = entry()
  const common = { schemaVersion: t.schemaVersion, id: t.id, createdAt: t.createdAt, updatedAt: t.updatedAt, date: t.date }
  const record =
    c === 'dockings'
      ? dockingSchema.parse({ ...common, transactionId: t.id })
      : balanceSchema.parse({ ...common, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: 100 })
  return record as RecordTypes[C]
}

async function filesOf(root: string, id: string, collection: Collection = 'transactions'): Promise<string[]> {
  const out: string[] = []
  for (const y of await fs.readdir(join(root, collection))) for (const n of await fs.readdir(join(root, collection, y))) if (n.includes(id)) out.push(`${collection}/${y}/${n}`)
  return out.sort()
}

describe('wpis przeniesiony zmianą daty na innym komputerze', () => {
  it('usunięcie starego pliku zgłoszone przed nowym to zmiana, nie usunięcie (W8-33)', async () => {
    const { a, b } = await twoComputers()
    const first = await a.saveRecord('transactions', entry())
    await b.refresh([first.entry.relPath])
    const moved = await a.saveRecord('transactions', { ...first.entry.record, date: '2026-10-05', amount: 150 })
    expect(moved.entry.relPath).not.toBe(first.entry.relPath)
    // The watcher of B reports only the old file's removal.
    const change = await b.refresh([first.entry.relPath])
    expect(change?.removals ?? []).toEqual([])
    const up = change?.upserts.find((u) => u.collection === 'transactions')
    expect(up?.entry.relPath).toBe(moved.entry.relPath)
    expect((up?.entry.record as Transaction).amount).toBe(150)
  })

  it('to samo dla innych kolekcji z datą w ścieżce (dokowania, salda), przeniesienie do innego roku', async () => {
    const { a, b } = await twoComputers()
    for (const c of ['dockings', 'balances'] as const) {
      const first = await a.saveRecord(c, datedOf(c))
      await b.refresh([first.entry.relPath])
      const moved = await a.saveRecord(c, { ...first.entry.record, date: '2027-01-04' })
      expect(moved.entry.relPath.startsWith(`${c}/2027/2027-01-04_`)).toBe(true)
      const change = await b.refresh([first.entry.relPath])
      expect(change?.removals ?? []).toEqual([])
      expect(change?.upserts.map((u) => [u.collection, u.entry.relPath])).toEqual([[c, moved.entry.relPath]])
    }
  })

  it('„Zachowaj moją” po usunięciu: jeden wpis tego komputera, wersja A jako kopia konfliktu do decyzji (W8-33)', async () => {
    const { a, b, root } = await twoComputers()
    const first = await a.saveRecord('transactions', entry())
    await b.refresh([first.entry.relPath])
    const moved = await a.saveRecord('transactions', { ...first.entry.record, date: '2026-10-05', amount: 150 })
    // The cloud brought the removal before the new file: B sees a removal.
    const aside = join(root, '..', 'aside.json')
    await fs.rename(join(root, moved.entry.relPath), aside)
    const removal = await b.refresh([first.entry.relPath])
    expect(removal?.removals.map((r) => r.id)).toEqual([first.entry.record.id])
    await fs.rename(aside, join(root, moved.entry.relPath))
    // B keeps its version (a note typed meanwhile): no duplicate under two dates, A's move and amount not lost.
    const kept = await b.saveRecord('transactions', { ...first.entry.record, note: 'z B' })
    const files = await filesOf(root, first.entry.record.id)
    expect(files).toHaveLength(2)
    expect(files).toContain(first.entry.relPath)
    expect(files.find((f) => f !== first.entry.relPath)).toMatch(/^transactions\/2026\/2026-10-01_[0-9A-Z]+-zewnetrzna-/)
    expect((await readJson(join(root, first.entry.relPath))).note).toBe('z B')
    const conflict = kept.change?.conflicts.find((c) => c.type === 'copy')
    expect(conflict?.canonical.relPath).toBe(first.entry.relPath)
    expect((conflict?.copy.record as Transaction).amount).toBe(150)
    expect((conflict?.copy.record as Transaction).date).toBe('2026-10-05')
  })

  it('nowy wpis nie przeszukuje katalogu, a przy usuniętym na innym komputerze bez przeniesienia zapis przywraca go (W8-33)', async () => {
    const { a, b, root } = await twoComputers()
    const first = await a.saveRecord('transactions', entry())
    await b.refresh([first.entry.relPath])
    await a.deleteRecord('transactions', first.entry.record.id)
    const removal = await b.refresh([first.entry.relPath])
    expect(removal?.removals.map((r) => r.id)).toEqual([first.entry.record.id])
    await b.saveRecord('transactions', { ...first.entry.record, note: 'z B' })
    expect(await filesOf(root, first.entry.record.id)).toEqual([first.entry.relPath])
  })

  it('kopia zmiany z drugiego komputera nazwana od nowej ścieżki – konflikt z oryginałem, nowsza wersja A (W8-34)', async () => {
    const { a, b, root } = await twoComputers()
    const first = await a.saveRecord('transactions', entry())
    await b.refresh([first.entry.relPath])
    // B changes the amount; A has not read it yet and moves the entry with another amount.
    await b.saveRecord('transactions', { ...first.entry.record, amount: 300 })
    const moved = await a.saveRecord('transactions', { ...first.entry.record, date: '2026-10-05', amount: 150 })
    const conflict = moved.change?.conflicts.find((c) => c.type === 'copy')
    expect(conflict?.canonical.relPath).toBe(moved.entry.relPath)
    expect((conflict?.canonical.record as Transaction | null)?.amount).toBe(150)
    expect((conflict?.copy.record as Transaction).amount).toBe(300)
    expect(conflict?.copy.relPath.startsWith('transactions/2026/2026-10-05_')).toBe(true)
    expect(newerSide(conflict!)).toBe('canonical')
    expect(await filesOf(root, first.entry.record.id)).toHaveLength(2)
  })

  it('zapis pod datą drugiego duplikatu odkłada jego wersję do historii (W8-35)', async () => {
    const { a, b } = await twoComputers()
    const first = await a.saveRecord('transactions', entry())
    await b.refresh([first.entry.relPath])
    // B moves it to the 7th, A – not knowing – to the 5th: the same id under two dates.
    await b.saveRecord('transactions', { ...first.entry.record, date: '2026-10-07', amount: 300, note: 'z B' })
    const mine = await a.saveRecord('transactions', { ...first.entry.record, date: '2026-10-05', amount: 150 })
    const both = await a.refresh()
    expect(both?.conflicts.some((c) => c.type === 'duplicate')).toBe(true)
    // A edits its version and picks the 7th – where B's version lies.
    await a.saveRecord('transactions', { ...mine.entry.record, date: '2026-10-07' })
    const kept = await a.historyList('transactions', first.entry.record.id)
    const discarded = kept.find((h) => h.reason === 'discarded')
    expect(discarded?.updatedBy).toBe('PC-B')
    const version = (await a.historyRead('transactions', first.entry.record.id, discarded!.file)) as Transaction
    expect(version.note).toBe('z B')
    expect(version.amount).toBe(300)
  })
})
