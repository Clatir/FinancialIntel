import { promises as fs, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
/** What the main process has on disk now (the watcher's rescan without waiting for it). */
const rescan = () => (globalThis as unknown as { fi: { rescan(): Promise<void> } }).fi.rescan()

/** A file of the folder rewritten as a newer version of the app would write it (a higher schemaVersion). */
function newerOnDisk(file: string, patch: Record<string, unknown> = {}): void {
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  writeFileSync(file, `${JSON.stringify({ ...raw, ...patch, schemaVersion: raw.schemaVersion + 1 }, null, 2)}\n`)
}

test('wpisy zapisane przez nowszą wersję (1.6.5, B67): kontener tylko do obejrzenia z wyjaśnieniem, nic nie znika, plik nietknięty', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-newer-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(9000) }],
      months: [{ month, salary: zl(4000), envelopes: {} }],
      containers: [
        { name: 'Czynsz', amount: zl(1500), cycleMonths: 1, dueMonth: month, dueDay: 10, counterparty: 'SPÓŁDZIELNIA' },
        { name: 'Internet', amount: zl(60), cycleMonths: 1, dueMonth: month, dueDay: 12, counterparty: 'OPERATOR' }
      ]
    }
  })
  const file = join(dataDir, 'containers', readdirSync(join(dataDir, 'containers')).find((n) => readFileSync(join(dataDir, 'containers', n), 'utf8').includes('Czynsz'))!)
  newerOnDisk(file)
  const before = readFileSync(file, 'utf8')
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+5')
    await page.locator('[data-testid="cargo-row"][data-name="Czynsz"]').click()
    const editor = page.getByTestId('cargo-editor')
    await expect(editor.getByTestId('entry-newer')).toContainText('nowsza wersja aplikacji')
    await expect(editor.getByTestId('container-amount')).toBeDisabled()
    // No deletion that would take it off the screen only.
    await expect(editor.getByTestId('container-delete')).toHaveCount(0)
    // The other container: as always.
    await page.locator('[data-testid="cargo-row"][data-name="Internet"]').click()
    await expect(editor.getByTestId('entry-newer')).toHaveCount(0)
    await expect(editor.getByTestId('container-amount')).toBeEnabled()
    expect(readFileSync(file, 'utf8')).toBe(before)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Synchronizacja (1.6.5, N94, N95): kopia konfliktu jako lista zmienionych pól; plik uszkodzony do Kosza z potwierdzeniem, plik nowszej wersji – nie', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-sync-q-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      months: [{ month, salary: zl(4000), envelopes: {} }],
      transactions: [{ date: today, accountId: MBANK, amount: -zl(10), counterparty: 'Sklep', note: 'z domu' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // OneDrive's copy from the laptop: another note.
    const dir = join(dataDir, 'transactions', today.slice(0, 4))
    const name = readdirSync(dir).find((n) => n.endsWith('.json'))!
    const original = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    writeFileSync(join(dir, name.replace('.json', '-LAPTOP.json')), `${JSON.stringify({ ...original, note: 'z laptopa', updatedBy: 'LAPTOP' }, null, 2)}\n`)
    // A broken file and one of a newer version that this one cannot read.
    writeFileSync(join(dir, `${today}_01JB0000000000000000000000.json`), '{ "id": ')
    await fs.mkdir(join(dataDir, 'containers'), { recursive: true })
    writeFileSync(join(dataDir, 'containers', '01JB0000000000000000000001.json'), `${JSON.stringify({ schemaVersion: 999, id: '01JB0000000000000000000001', nowy: 'format' }, null, 2)}\n`)
    await page.evaluate(rescan)
    await page.getByTestId('nav-sync').click()

    // The copy's difference in the field's Polish name, the original's value beside the copy's.
    const changes = page.getByTestId('conflict-changes')
    await expect(changes).toContainText('Notatka')
    await expect(changes).toContainText('z domu')
    await expect(changes).toContainText('z laptopa')

    await expect(page.getByTestId('problem-row')).toHaveCount(2)
    await expect(page.getByTestId('problem-too-new')).toContainText('zaktualizuj aplikację')
    const trash = page.getByTestId('problem-trash')
    await expect(trash).toHaveCount(1)
    await trash.click()
    // The first click only asks.
    await expect(trash).toHaveText(/Do Kosza na pewno/)
    expect(readdirSync(dir).some((n) => n.startsWith(`${today}_01JB`))).toBe(true)
    await trash.click()
    await expect(page.getByTestId('problem-row')).toHaveCount(1)
    expect(readdirSync(dir).some((n) => n.startsWith(`${today}_01JB`))).toBe(false)
    // The newer version's file stays where it is.
    expect(readdirSync(join(dataDir, 'containers'))).toContain('01JB0000000000000000000001.json')
    // The conflict waits for the user's choice: both versions still there.
    expect((await records(dataDir, 'transactions')).map((t) => t.note).sort()).toEqual(['z domu', 'z laptopa'])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('uszkodzony fi.json (1.6.5, B109): ekran folderu mówi, co się stało, „Weź ustawienia z historii” otwiera budżet', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-repair-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, shipName: 'Orzeł', budget: { ...s.budget, start } }),
    records: { balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) }] }
  })
  // A version of the settings in the history (as the app keeps it before a change), then fi.json cut by a power failure.
  const fi = JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8'))
  await fs.mkdir(join(dataDir, '.history', 'fi', fi.id), { recursive: true })
  writeFileSync(join(dataDir, '.history', 'fi', fi.id, '20261018T080000Z_edit_ab12.json'), `${JSON.stringify({ savedAt: '2026-10-18T08:00:00.000Z', savedBy: 'LAPTOP', reason: 'edit', record: fi }, null, 2)}\n`)
  writeFileSync(join(dataDir, 'fi.json'), '{ "schemaVersion": 1, "settings": { "shipN')
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('setup-message')).toContainText('fi.json')
    await page.getByTestId('repair-settings').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('menu-ship-name')).toHaveText('okręt Orzeł')
    // The broken file kept for a look – in Synchronizacja.
    expect(readdirSync(dataDir).some((n) => /^fi-uszkodzona-.*\.json$/.test(n))).toBe(true)
    expect(errors.filter((e) => !/fi\.json/.test(e))).toEqual([])
  } finally {
    await app.close()
  }
})

test('kopia dzienna nie powstała (1.6.5, B123): Ustawienia mówią kiedy i dlaczego', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-backup-fail-'))
  const userData = join(base, 'userData')
  // The folder of backups set on this computer is a file (a drive letter now used by something else): no backup there.
  const blocked = join(base, 'kopie')
  writeFileSync(blocked, 'to nie folder')
  await fs.mkdir(userData, { recursive: true })
  writeFileSync(join(userData, 'config.json'), `${JSON.stringify({ backupDirOverride: blocked }, null, 2)}\n`)
  const { app, page, errors } = await launch({ userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await expect(page.getByTestId('backup-failure')).toContainText('Kopia dzienna nie powstała')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
