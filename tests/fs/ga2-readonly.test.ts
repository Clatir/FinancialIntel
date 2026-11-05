import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDefaultSettings } from '@shared/defaults'
import { recordRelPath } from '@shared/paths'
import {
  MBANK_ACCOUNT_ID,
  SCHEMA_VERSION,
  transactionSchema,
  type Transaction
} from '@shared/schema'
import { DataStore } from '../../src/main/datastore/store'

const AT = '2026-10-15T10:00:00.000Z'

describe('T500 – rekordy z atrybutem „tylko do odczytu” w systemie', () => {
  let dir: string
  let store: DataStore

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), 'fi-ga2-ro-'))
    store = new DataStore(dir, { machineName: 'TEST-PC' })
  })

  afterEach(async () => {
    const unlockDir = async (d: string): Promise<void> => {
      const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => [])
      for (const e of entries) {
        const p = join(d, e.name)
        if (e.isDirectory()) await unlockDir(p)
        else await fs.chmod(p, 0o666).catch(() => undefined)
      }
    }
    await unlockDir(dir)
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('wykrywa pliki JSON z atrybutem tylko do odczytu, podaje czytelny komunikat przy zapisie i zdejmuje blokadę', async () => {
    await DataStore.initialize(dir, createDefaultSettings())
    await store.open()
    const tx = transactionSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: '01KGA2T5000000000000000001',
      createdAt: AT,
      updatedAt: AT,
      date: '2026-10-15',
      accountId: MBANK_ACCOUNT_ID,
      kind: 'expense',
      amount: -4500,
      counterparty: 'Biedronka'
    })
    await store.saveRecord('transactions', tx)
    const abs = join(dir, recordRelPath('transactions', tx))

    // Set OS read-only attribute on the record file
    await fs.chmod(abs, 0o444)

    const change = await store.rescan()
    expect(change?.status.readOnlyFiles).toBe(1)

    // Saving the read-only record fails with a clear message about read-only attribute and Synchronizacja
    await expect(store.saveRecord('transactions', { ...tx, note: 'zmiana', updatedAt: '2026-10-15T11:00:00.000Z' })).rejects.toThrow(
      /tylko do odczytu.*Zdejmij blokadę/i
    )

    // Unlocking read-only files clears the attribute and updates status
    const unlocked = await store.unlockReadOnlyFiles()
    expect(unlocked.unlocked).toBe(1)
    expect(unlocked.change?.status.readOnlyFiles ?? store.status().readOnlyFiles).toBe(0)

    // Saving now succeeds
    const res = await store.saveRecord('transactions', { ...tx, note: 'zmiana po odblokowaniu', updatedAt: '2026-10-15T12:00:00.000Z' })
    expect((res.entry.record as Transaction).note).toBe('zmiana po odblokowaniu')
  })
})
