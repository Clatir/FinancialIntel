import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HISTORY_DIR } from '../../src/main/datastore/history'
import { freshStore, sampleTransaction } from './helpers'

describe('usunięcie przez sam import w historii (przegląd N1, T334)', () => {
  it('„import”: wersja usunięta ze znakiem byImport, plik dalej _delete_ (starsza wersja zna klucze); zwykłe usunięcie bez znaku', async () => {
    const store = await freshStore()
    const gone = sampleTransaction({ note: 'nierozliczona, której bank już nie pokazuje' })
    const mine = sampleTransaction({ note: 'moja', date: '2026-03-12' })
    await store.saveRecord('transactions', gone)
    await store.saveRecord('transactions', mine)
    expect((await store.deleteRecords('transactions', [gone.id], 'import')).results).toEqual([{ id: gone.id }])
    await store.deleteRecords('transactions', [mine.id])
    const deleted = await store.historyDeleted('transactions')
    expect(deleted.map((d) => [d.id, d.reason, d.byImport ?? false]).sort()).toEqual(
      [
        [gone.id, 'delete', true],
        [mine.id, 'delete', false]
      ].sort()
    )
    const files = await fs.readdir(join(store.root, HISTORY_DIR, 'transactions', gone.id))
    expect(files).toHaveLength(1)
    expect(files[0]).toContain('_delete_')
    expect((await store.snapshot()).records.transactions).toHaveLength(0)
  })
})
