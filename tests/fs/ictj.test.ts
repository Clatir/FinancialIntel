import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { IctjSnapshot } from '@shared/ictj'
import { readIctjFolder } from '../../src/main/ictj/reader'
import { IctjSource } from '../../src/main/ictj/source'
import { findIctjExe, suggestIctjDir } from '../../src/main/ictj/locate'
import { DataStore } from '../../src/main/datastore/store'
import { tempDir } from './helpers'

const W1 = '01KPAY00000000000000000001'
const W2 = '01KPAY00000000000000000002'
const R1 = '01KPAY00000000000000000003'
const X1 = '01KPAY00000000000000000004'
const F1 = '01KPRGN0000000000000000001'

const payout = (id: string, kind: string, date: string, amount: number, pool: string, extra: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  kind,
  date,
  amount,
  pool,
  note: '',
  categoryId: null,
  goal: null,
  ...extra
})

async function write(root: string, rel: string, data: unknown): Promise<void> {
  const file = join(root, rel)
  await fs.mkdir(join(file, '..'), { recursive: true })
  await fs.writeFile(file, typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`)
}

/** An ICTTJ folder as ICTTJ 1.20.0 writes it (journal.json, payouts/RRRR/…, forecasts/…) – only what FI reads. */
async function ictjFolder(): Promise<string> {
  const root = join(tempDir('fi-ictj-'), 'ICTJ')
  await write(root, 'journal.json', { schemaVersion: 1, settings: {} })
  await write(root, `payouts/2026/2026-10-16_${W1}.json`, payout(W1, 'withdrawal', '2026-10-16', 1200, 'current'))
  await write(root, `payouts/2026/2026-10-02_${W2}.json`, payout(W2, 'withdrawal', '2026-10-02', 333.33, 'goals'))
  await write(root, `payouts/2026/2026-10-10_${R1}.json`, payout(R1, 'return', '2026-10-10', 500, 'surplus'))
  await write(root, `payouts/2026/2026-10-11_${X1}.json`, payout(X1, 'expense', '2026-10-11', 80, 'current', { categoryId: '01KPAY00000000000000000009' }))
  // A copy of a sync tool and a broken file: not FI's business / skipped with a warning.
  await write(root, `payouts/2026/2026-10-16_${W1}-PC.json`, payout(W1, 'withdrawal', '2026-10-16', 9999, 'current'))
  await write(root, `payouts/2026/2026-10-12_01KPAY00000000000000000005.json`, '{ zepsuty')
  await write(root, `forecasts/${F1}.json`, {
    schemaVersion: 1,
    id: F1,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
    name: 'Plan',
    currency: 'PLN',
    firstMonth: '2026-10',
    goals: [{ id: '01KG0000000000000000000001', name: 'Wakacje', month: 4, amount: 3000, enabled: true, flexible: false }],
    draws: { rate: [0.1, 0.2] }
  })
  return root
}

describe('odczyt folderu ICTTJ (tylko payouts/ i forecasts/, nigdy zapis)', () => {
  it('wypłaty i zwroty w groszach, wydatki i kopie pominięte, zepsuty plik = ostrzeżenie, cele scenariusza', async () => {
    const root = await ictjFolder()
    const before = await fs.readdir(root, { recursive: true })
    const snap = await readIctjFolder(root)
    expect(snap.status).toBe('ok')
    expect(snap.entries.map((e) => [e.id, e.kind, e.date, e.amount, e.pool])).toEqual([
      [W2, 'withdrawal', '2026-10-02', 33333, 'goals'],
      [R1, 'return', '2026-10-10', 50000, 'surplus'],
      [W1, 'withdrawal', '2026-10-16', 120000, 'current']
    ])
    expect(snap.forecasts).toEqual([{ id: F1, name: 'Plan', currency: 'PLN', updatedAt: '2026-10-05T10:00:00.000Z', goals: [{ id: '01KG0000000000000000000001', name: 'Wakacje', month: '2027-01', amount: 300000, enabled: true }] }])
    expect(snap.warnings).toHaveLength(1)
    expect(snap.warnings[0]).toContain('nieczytelny plik')
    // FI wrote nothing in the ICTTJ folder.
    expect(await fs.readdir(root, { recursive: true })).toEqual(before)
  })

  it('nowszy format = ostrzeżenie; brak folderu, folder FI i pusty folder – bez danych', async () => {
    const root = await ictjFolder()
    await write(root, 'payouts/2026/2026-10-20_01KPAY00000000000000000006.json', payout('01KPAY00000000000000000006', 'withdrawal', '2026-10-20', 10, 'current', { schemaVersion: 3 }))
    const snap = await readIctjFolder(root)
    expect(snap.entries).toHaveLength(4)
    expect(snap.warnings.some((w) => w.includes('nowszym formacie (wersja 3)'))).toBe(true)
    expect((await readIctjFolder(join(root, 'nie-ma'))).status).toBe('missing')
    const fiDir = join(tempDir(), 'FI')
    await DataStore.initialize(fiDir)
    expect((await readIctjFolder(fiDir)).status).toBe('not-ictj')
    expect((await readIctjFolder(tempDir())).status).toBe('not-ictj')
  })

  it('podpowiedź folderu z config.json ICTTJ (tylko ścieżka; w trybie demo – prawdziwy folder)', async () => {
    const root = await ictjFolder()
    const appData = tempDir('fi-appdata-')
    expect(await suggestIctjDir(appData)).toBeNull()
    await write(appData, 'ICT Trade Journal/config.json', { dataDir: root, recentDirs: [], market: { key: 'tajne' } })
    expect(await suggestIctjDir(appData)).toBe(root)
    await write(appData, 'ICT Trade Journal/config.json', { dataDir: join(appData, 'sample-journal'), lastRealDir: root, sampleMode: true })
    expect(await suggestIctjDir(appData)).toBe(root)
    await write(appData, 'ICT Trade Journal/config.json', { dataDir: join(root, 'nie-ma') })
    expect(await suggestIctjDir(appData)).toBeNull()
    // The beta's config when the release has none.
    await fs.rm(join(appData, 'ICT Trade Journal'), { recursive: true })
    await write(appData, 'ICT Trade Journal Beta/config.json', { dataDir: root })
    expect(await suggestIctjDir(appData)).toBe(root)
  })

  it('program: wybrany plik, gdy istnieje; poza Windows bez wyszukiwania instalacji', async () => {
    const exe = join(tempDir(), 'ICTTJ-portable.exe')
    await fs.writeFile(exe, 'x')
    expect(await findIctjExe(exe)).toEqual({ exe, source: 'chosen' })
    if (process.platform !== 'win32') expect(await findIctjExe(join(exe, 'nie-ma'))).toEqual({ exe: null, source: null })
  })

  it('obserwacja: nowa wypłata w ICTTJ trafia do okna bez restartu; zmiana folderu i wyłączenie', async () => {
    const root = await ictjFolder()
    const seen: IctjSnapshot[] = []
    const src = new IctjSource({ onSnapshot: (s) => seen.push(s), log: () => undefined })
    try {
      const first = await src.setDir(root)
      expect(first.entries).toHaveLength(3)
      expect(seen).toHaveLength(1)
      await new Promise((r) => setTimeout(r, 200))
      await write(root, 'payouts/2026/2026-10-17_01KPAY00000000000000000007.json', payout('01KPAY00000000000000000007', 'withdrawal', '2026-10-17', 50, 'tax'))
      await expect.poll(() => seen.at(-1)?.entries.length, { timeout: 5000 }).toBe(4)
      expect(seen.at(-1)!.entries.at(-1)).toMatchObject({ pool: 'tax', amount: 5000 })
      // Nothing changed: no new snapshot.
      const count = seen.length
      await src.refresh()
      expect(seen).toHaveLength(count)
      await src.setDir(null)
      expect(seen.at(-1)!.status).toBe('off')
    } finally {
      src.stop()
    }
  })
})
