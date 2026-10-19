// adapted from ICTTJ tests/fs/history.test.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { DataStore } from '../../src/main/datastore/store'
import { HISTORY_DIR, MAX_PER_RECORD } from '../../src/main/datastore/history'
import { exists, freshStore, sampleGoal, sampleMonth, sampleTransaction } from './helpers'

/** A clock that moves forward by `stepMs` on every reading. */
function clock(startIso: string, stepMs: number): () => string {
  let t = Date.parse(startIso)
  return () => {
    const iso = new Date(t).toISOString()
    t += stepMs
    return iso
  }
}

async function storeWithClock(root: string, machineName: string, now: () => string): Promise<DataStore> {
  const s = new DataStore(root, { machineName, now })
  await s.open()
  return s
}

describe('historia zmian wpisów (.history/)', () => {
  it('zapis zachowuje poprzednią wersję z komputerem; edycje co chwilę – jedna kopia na 10 minut', async () => {
    const base = await freshStore()
    // Every call to now() moves the clock by one minute.
    const store = await storeWithClock(base.root, 'PC-A', clock('2026-10-05T08:00:00.000Z', 60_000))
    const t = sampleTransaction({ note: 'v1' })
    const { entry: e1 } = await store.saveRecord('transactions', t)
    expect(e1.record.updatedBy).toBe('PC-A')
    expect(await store.historyList('transactions', t.id)).toEqual([]) // nothing replaced yet
    await store.saveRecord('transactions', { ...e1.record, note: 'v2' })
    await store.saveRecord('transactions', { ...e1.record, note: 'v3' })
    const list = await store.historyList('transactions', t.id)
    expect(list).toHaveLength(1) // v3 replaced v2 within 10 minutes of the first snapshot
    expect(list[0]).toMatchObject({ reason: 'edit', savedBy: 'PC-A', updatedBy: 'PC-A' })
    expect((await store.historyRead('transactions', t.id, list[0]!.file)) as { note: string }).toMatchObject({ note: 'v1' })
    // The history is a dot folder: not scanned, not a record, not a problem.
    expect(await exists(join(store.root, HISTORY_DIR, 'transactions', t.id))).toBe(true)
    const snap = await new DataStore(store.root, { machineName: 'X' }).open()
    expect(snap.records.transactions).toHaveLength(1)
    expect(snap.problems).toEqual([])
  })

  it('wersja zapisana na innym komputerze trafia do historii zawsze', async () => {
    const base = await freshStore()
    const a = await storeWithClock(base.root, 'PC-A', clock('2026-10-05T08:00:00.000Z', 1000))
    const t = sampleTransaction({ note: 'z A' })
    await a.saveRecord('transactions', t)
    await a.saveRecord('transactions', { ...t, note: 'z A 2' }) // snapshot of "z A"
    const b = await storeWithClock(base.root, 'PC-B', clock('2026-10-05T08:00:30.000Z', 1000))
    const current = (await b.snapshot()).records.transactions[0]!.record
    await b.saveRecord('transactions', { ...current, note: 'z B' })
    await b.saveRecord('transactions', { ...current, note: 'z B 2' }) // throttled (own version, seconds later)
    const list = await b.historyList('transactions', t.id)
    expect(list.map((e) => [e.updatedBy, e.savedBy])).toEqual([
      ['PC-A', 'PC-B'],
      ['PC-A', 'PC-A']
    ])
  })

  it('usunięcie przy cofnięciu importu (F4): na liście usuniętych z powodem „undo” (import go nie blokuje – T39); stara paczka importu bez wersji', async () => {
    const store = await freshStore()
    const undone = sampleTransaction({ note: 'z importu' })
    const mine = sampleTransaction({ note: 'moja', date: '2026-03-12' })
    await store.saveRecord('transactions', undone)
    await store.saveRecord('transactions', mine)
    const { results } = await store.deleteRecords('transactions', [undone.id], 'undo')
    expect(results).toEqual([{ id: undone.id }])
    await store.deleteRecords('transactions', [mine.id])
    expect((await store.historyDeleted('transactions')).map((d) => [d.id, d.reason]).sort()).toEqual([[mine.id, 'delete'], [undone.id, 'undo']].sort())
    expect((await store.historyList('transactions', undone.id)).map((e) => e.reason)).toEqual(['undo'])
    expect((await store.snapshot()).records.transactions).toHaveLength(0)
    // An old batch of the imports dropped: nothing kept.
    const batch = sampleTransaction({ note: 'paczka' })
    await store.saveRecord('transactions', batch)
    await store.deleteRecords('transactions', [batch.id], 'drop')
    expect(await store.historyList('transactions', batch.id)).toEqual([])
  })

  it('usunięty wpis można przywrócić; przywrócenie odkłada bieżącą wersję', async () => {
    const store = await freshStore()
    const t = sampleTransaction({ note: 'oryginał' })
    await store.saveRecord('transactions', t)
    await store.deleteRecord('transactions', t.id)
    expect((await store.snapshot()).records.transactions).toHaveLength(0)
    const deleted = await store.historyDeleted('transactions')
    expect(deleted.map((d) => d.id)).toEqual([t.id])
    expect(deleted[0]).toMatchObject({ reason: 'delete' })
    const { change } = await store.historyRestore('transactions', t.id, deleted[0]!.file)
    expect(change?.upserts.map((u) => u.entry.record.note)).toEqual(['oryginał'])
    expect(change?.origin).toBe('local')
    expect((await store.snapshot()).records.transactions.map((e) => e.record.id)).toEqual([t.id])
    expect(await store.historyDeleted('transactions')).toEqual([])

    // Restoring an older version of an existing record keeps the current one first.
    const { entry } = await store.saveRecord('transactions', { ...t, note: 'nowsza' })
    const before = await store.historyList('transactions', t.id)
    const oldest = before.at(-1)!
    await store.historyRestore('transactions', t.id, oldest.file)
    const after = await store.historyList('transactions', t.id)
    expect(after[0]).toMatchObject({ reason: 'restore' })
    expect(((await store.historyRead('transactions', t.id, after[0]!.file)) as { note: string }).note).toBe(entry.record.note)
    expect((await store.snapshot()).records.transactions[0]!.record.note).toBe('oryginał')
  })

  it('przywrócenie wersji z inną datą przenosi plik operacji; cel i plan miesiąca też mają historię', async () => {
    const base = await freshStore()
    const store = await storeWithClock(base.root, 'PC-A', clock('2026-10-05T08:00:00.000Z', 11 * 60_000))
    const t = sampleTransaction({ date: '2026-03-16' })
    const first = await store.saveRecord('transactions', t)
    const moved = await store.saveRecord('transactions', { ...first.entry.record, date: '2026-03-20' })
    const [v1] = await store.historyList('transactions', t.id)
    await store.historyRestore('transactions', t.id, v1!.file)
    expect(await exists(join(store.root, first.entry.relPath))).toBe(true)
    expect(await exists(join(store.root, moved.entry.relPath))).toBe(false)

    const g = sampleGoal({ name: 'Rower' })
    await store.saveRecord('goals', g)
    await store.saveRecord('goals', { ...g, name: 'Rower górski' })
    const m = sampleMonth('2026-03', { note: 'plan A' })
    await store.saveRecord('months', m)
    await store.saveRecord('months', { ...m, note: 'plan B' })
    const [gv] = await store.historyList('goals', g.id)
    const [mv] = await store.historyList('months', m.id)
    expect(((await store.historyRead('goals', g.id, gv!.file)) as { name: string }).name).toBe('Rower')
    expect(((await store.historyRead('months', m.id, mv!.file)) as { note: string }).note).toBe('plan A')
  })

  it('przywrócenie na miejsce planu o innym id jest odrzucone', async () => {
    const store = await freshStore()
    const m = sampleMonth('2026-03')
    await store.saveRecord('months', m)
    await store.deleteRecord('months', m.id)
    await store.saveRecord('months', sampleMonth('2026-03', { note: 'nowy plan' }))
    const [deleted] = await store.historyDeleted('months')
    await expect(store.historyRestore('months', m.id, deleted!.file)).rejects.toThrow(/należy do innego wpisu/)
  })

  it('ustawienia (fi.json) też mają historię i dają się przywrócić', async () => {
    const base = await freshStore()
    const store = await storeWithClock(base.root, 'PC-A', clock('2026-10-05T08:00:00.000Z', 11 * 60_000))
    const f = (await store.snapshot()).fi
    await store.saveSettings({ ...f, settings: { ...f.settings, shipName: 'Nowy okręt' } })
    expect(store.fi.settings.shipName).toBe('Nowy okręt')
    const list = await store.historyList('fi', f.id)
    expect(list).toHaveLength(1)
    const { fi } = await store.historyRestore('fi', f.id, list[0]!.file)
    expect(fi?.settings.shipName).toBe('Flagowiec')
    expect(fi?.updatedBy).toBe('PC-A')
    expect(store.fi.settings.shipName).toBe('Flagowiec')
    // The replaced version went to the history first.
    expect((await store.historyList('fi', f.id))[0]).toMatchObject({ reason: 'restore' })
  })

  it('najwyżej MAX_PER_RECORD wersji na wpis; „historyKeep” zapisuje odrzuconą wersję', async () => {
    const base = await freshStore()
    const store = await storeWithClock(base.root, 'PC-A', clock('2026-10-05T08:00:00.000Z', 11 * 60_000))
    const t = sampleTransaction()
    await store.saveRecord('transactions', t)
    for (let i = 0; i < MAX_PER_RECORD + 5; i++) await store.saveRecord('transactions', { ...t, note: `v${i}` })
    const files = await fs.readdir(join(store.root, HISTORY_DIR, 'transactions', t.id))
    expect(files).toHaveLength(MAX_PER_RECORD)
    await store.historyKeep('transactions', { ...t, note: 'niezapisana' }, 'discarded')
    const list = await store.historyList('transactions', t.id)
    expect(list[0]).toMatchObject({ reason: 'discarded' })
    expect(list).toHaveLength(MAX_PER_RECORD)
    // A bad file name never leaves the record's folder.
    expect(await store.historyRead('transactions', t.id, '../../fi.json')).toBeNull()
  })

  it('lista usuniętych (W19): wiele naraz czytanych równolegle – wszystkie, najnowsze pierwsze; istniejące i edytowane pominięte', async () => {
    const base = await freshStore()
    const store = await storeWithClock(base.root, 'PC-A', clock('2026-10-05T08:00:00.000Z', 1000))
    const txs = Array.from({ length: 120 }, (_, i) => sampleTransaction({ note: `n${i}` }))
    await store.saveRecords('transactions', txs)
    // Every other one deleted (one at a time: each a minute later), one more only edited.
    const gone = txs.filter((_, i) => i % 2 === 0)
    for (const t of gone) await store.deleteRecord('transactions', t.id)
    await store.saveRecord('transactions', { ...txs[1]!, note: 'zmienione' })
    const deleted = await store.historyDeleted('transactions')
    expect(deleted.map((d) => d.id)).toEqual(gone.map((t) => t.id).reverse())
    expect(deleted.every((d) => d.reason === 'delete')).toBe(true)
    // One brought back is no longer on the list.
    await store.historyRestore('transactions', gone[0]!.id, deleted.at(-1)!.file)
    expect((await store.historyDeleted('transactions')).map((d) => d.id)).toEqual(gone.slice(1).map((t) => t.id).reverse())
  })

  it('lista usuniętych (W19): wersja usuniętego czytana raz – następny plik importu nie czyta jej znowu, nowe usunięcie tak', async () => {
    const base = await freshStore()
    const store = await storeWithClock(base.root, 'PC-A', clock('2026-10-05T08:00:00.000Z', 1000))
    const txs = Array.from({ length: 30 }, (_, i) => sampleTransaction({ note: `n${i}` }))
    await store.saveRecords('transactions', txs)
    for (const t of txs.slice(0, 20)) await store.deleteRecord('transactions', t.id)
    expect(await store.historyDeleted('transactions')).toHaveLength(20)
    const reads = vi.spyOn(fs, 'readFile')
    const historyReads = () => reads.mock.calls.filter(([path]) => String(path).includes(HISTORY_DIR)).length
    try {
      expect(await store.historyDeleted('transactions')).toHaveLength(20)
      expect(historyReads()).toBe(0)
      // One more deleted, and one brought back and deleted again: only their new versions read.
      await store.deleteRecord('transactions', txs[20]!.id)
      const first = (await store.historyDeleted('transactions')).find((d) => d.id === txs[0]!.id)!
      await store.historyRestore('transactions', txs[0]!.id, first.file)
      await store.deleteRecord('transactions', txs[0]!.id)
      reads.mockClear()
      const after = await store.historyDeleted('transactions')
      expect(after.map((d) => d.id).slice(0, 2)).toEqual([txs[0]!.id, txs[20]!.id])
      expect(after).toHaveLength(21)
      expect(after[0]!.file).not.toBe(first.file)
      expect(historyReads()).toBe(1)
    } finally {
      reads.mockRestore()
    }
  })
})
