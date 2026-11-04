import { existsSync, promises as fs, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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

test('folder tylko do odczytu (1.5.3, N2): pola i przyciski zmian wyłączone, historia do obejrzenia, nic nie jest zapisywane', async () => {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-folder-ro-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${addMonths(month, -1)}-01` } }),
    records: {
      balances: [{ date: `${addMonths(month, -1)}-01`, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      months: [{ month, salary: zl(4000), envelopes: {} }],
      transactions: [{ date: today, accountId: MBANK, amount: -zl(45), counterparty: 'Sklep' }]
    }
  })
  // Written by a newer version of the app: this one only looks.
  const fiPath = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(fiPath, 'utf8'))
  writeFileSync(fiPath, `${JSON.stringify({ ...fi, schemaVersion: fi.schemaVersion + 1 }, null, 2)}\n`)
  const before = readFileSync(fiPath, 'utf8')
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('banner-ro')).toContainText('tylko do odczytu')

    // Settings of the budget: to look at.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    await expect(page.getByTestId('settings-read-only')).toContainText('Folder jest tylko do odczytu')
    await expect(page.getByTestId('account-confirm-amount').first()).toBeDisabled()
    // Every tab says it (AP-28, US.31) – Import z banku and ICTTJ hold budget settings too; this computer's ones are marked.
    for (const tab of ['import', 'ictj', 'notify', 'system']) {
      await page.getByTestId(`settings-tab-${tab}`).click()
      await expect(page.getByTestId('settings-read-only')).toContainText('tylko do odczytu')
    }
    await expect(page.getByTestId('machine-only').first()).toHaveText('tylko ten komputer')

    // The month's plan: the fields off – never a typed value quietly lost.
    await page.keyboard.press('Control+4')
    await expect(page.getByTestId('month-salary')).toBeDisabled()

    // Operations: the bulk bar off; the operation's history still opens.
    await page.keyboard.press('Control+2')
    await page.getByTestId('operation-tick').first().click()
    await expect(page.getByTestId('operations-bulk-apply')).toBeDisabled()
    // Un-ticking is no change of the folder: at hand.
    await page.getByTestId('operations-bulk-clear').click()
    await expect(page.getByTestId('operations-bulk')).toHaveCount(0)
    await page.getByTestId('operation-tick').first().click()
    await page.getByTestId('operation-row').first().click()
    await page.getByTestId('operation-editor').getByTestId('history-open').click()
    await expect(page.getByTestId('history-dialog')).toBeVisible()
    await expect(page.getByTestId('history-empty')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('history-dialog')).toHaveCount(0)

    expect(readFileSync(fiPath, 'utf8')).toBe(before)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('kopia konfliktu (1.5.3, N17, N18): „Scal…” łączy pola obu wersji, obie zostają w historii; historia planu miesiąca', async () => {
  const { date: today, month } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-folder-merge-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${addMonths(month, -1)}-01` } }),
    records: {
      balances: [{ date: `${addMonths(month, -1)}-01`, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      months: [{ month, salary: zl(4000), envelopes: {} }],
      transactions: [{ date: today, accountId: MBANK, amount: -zl(10), counterparty: 'Sklep', note: 'z domu' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // OneDrive's copy from the laptop: another amount, no note (written later than the original).
    const dir = join(dataDir, 'transactions', today.slice(0, 4))
    const name = readdirSync(dir).find((n) => n.endsWith('.json'))!
    const original = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    const copyName = name.replace('.json', '-LAPTOP.json')
    writeFileSync(join(dir, copyName), `${JSON.stringify({ ...original, amount: -zl(15), note: '', updatedAt: new Date(Date.now() + 60_000).toISOString(), updatedBy: 'LAPTOP' }, null, 2)}\n`)
    await page.evaluate(rescan)
    await page.getByTestId('nav-sync').click()
    await page.getByTestId('conflict-merge-open').click()
    const merge = page.getByTestId('conflict-merge')
    await expect(merge.getByTestId('conflict-merge-field')).toHaveCount(2)
    // The newer side proposed for both; the note taken from the original.
    await merge.locator('[data-testid="conflict-merge-field"][data-path="note"]').getByTestId('conflict-merge-canonical').check()
    await merge.getByTestId('conflict-merge-save').click()
    await expect(page.getByRole('status').filter({ hasText: 'Scalono obie wersje' })).toBeVisible()
    await expect.poll(async () => (await records(dataDir, 'transactions')).map((t) => [t.amount, t.note])).toEqual([[-zl(15), 'z domu']])
    await expect.poll(async () => (await fs.readdir(dir)).filter((n) => n.includes('LAPTOP'))).toEqual([])

    // Both versions in the operation's history (N18: what the dialogs promise is there to see).
    await page.keyboard.press('Control+2')
    await page.getByTestId('operation-row').first().click()
    await page.getByTestId('operation-editor').getByTestId('history-open').click()
    await expect(page.getByTestId('history-version')).toHaveCount(2)
    await expect(page.getByTestId('history-dialog')).toContainText('przed scaleniem')
    await page.keyboard.press('Escape')

    // The month's plan has its history too: a changed salary, its version before the change brought back.
    await page.keyboard.press('Control+4')
    const salary = page.getByTestId('month-salary')
    // Focused first: the field puts its draft in on focus (a fill racing it would type after it).
    await salary.click()
    await salary.fill('4500')
    await salary.press('Enter')
    await expect.poll(async () => (await records(dataDir, 'months')).map((m) => m.salary)).toEqual([zl(4500)])
    await page.getByTestId('page-month').getByTestId('history-open').click()
    await expect(page.getByTestId('history-version')).toHaveCount(1)
    await page.getByTestId('history-restore').click()
    await expect.poll(async () => (await records(dataDir, 'months')).map((m) => m.salary)).toEqual([zl(4000)])
    await expect(salary).toHaveValue('4\u00a0000,00')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('konflikt (AP-27): karta z kontrahentem, datą i kwotą, różnice po polsku; „Scal…” odmawia, gdy kopia zmieni się w trakcie', async () => {
  const { date: today, month } = warsawNow()
  const day = `${today.slice(8, 10)}.${today.slice(5, 7)}.${today.slice(0, 4)}`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-folder-ap27-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${addMonths(month, -1)}-01` } }),
    records: {
      balances: [{ date: `${addMonths(month, -1)}-01`, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      months: [{ month, salary: zl(4000), envelopes: {} }],
      transactions: [{ date: today, accountId: MBANK, amount: -zl(12), counterparty: 'Mokka' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const dir = join(dataDir, 'transactions', today.slice(0, 4))
    const name = readdirSync(dir).find((n) => n.endsWith('.json'))!
    const original = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    const copyPath = join(dir, name.replace('.json', '-LAPTOP.json'))
    const writeCopy = (amount: number) =>
      writeFileSync(copyPath, `${JSON.stringify({ ...original, amount, note: 'kawa z laptopa', tags: ['laptop'], updatedAt: new Date(Date.now() + 60_000).toISOString(), updatedBy: 'LAPTOP' }, null, 2)}\n`)
    writeCopy(-zl(15))
    await page.evaluate(rescan)
    await page.getByTestId('nav-sync').click()

    // Which operation it is – never the file name with its ULID.
    const subject = page.getByTestId('conflict-subject')
    await expect(subject).toContainText(`Mokka · ${day} · −12,00 zł`)
    await expect(page.getByTestId('conflict-by-copy')).toHaveText('zapisał komputer LAPTOP')
    await expect(page.locator('[data-testid^="conflict:"]')).not.toContainText('.json')
    // The differences by Polish names: „Tagi” with the word, no „tags”, no JSON.
    const changes = page.getByTestId('conflict-changes')
    await expect(changes).toContainText('Tagi')
    await expect(changes).toContainText('laptop')
    await expect(changes).not.toContainText('tags')
    await expect(changes).not.toContainText('{')

    // „Scal…” on −15,00; the copy changes meanwhile (OneDrive brings a newer one): the window keeps what it showed and refuses.
    await page.getByTestId('conflict-merge-open').click()
    const merge = page.getByTestId('conflict-merge')
    const amountField = merge.locator('[data-testid="conflict-merge-field"][data-path="amount"]')
    await expect(amountField).toContainText('15,00')
    writeCopy(-zl(16))
    await page.evaluate(rescan)
    await expect(merge.getByTestId('conflict-merge-changed')).toHaveAttribute('data-side', 'copy')
    await expect(merge.getByTestId('conflict-merge-save')).toBeDisabled()
    await expect(amountField).toContainText('15,00')
    await expect(amountField).not.toContainText('16,00')
    // Nothing written: the original as it was, the copy still there.
    expect(JSON.parse(readFileSync(join(dir, name), 'utf8')).amount).toBe(-zl(12))
    expect(existsSync(copyPath)).toBe(true)

    // „Scal od nowa” – on the copy as it is now.
    await merge.getByTestId('conflict-merge-restart').click()
    await expect(amountField).toContainText('16,00')
    await expect(merge.getByTestId('conflict-merge-changed')).toHaveCount(0)
    await merge.getByTestId('conflict-merge-save').click()
    await expect(page.getByRole('status').filter({ hasText: 'Scalono obie wersje' })).toBeVisible()
    await expect.poll(async () => (await records(dataDir, 'transactions')).map((t) => t.amount)).toEqual([-zl(16)])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
