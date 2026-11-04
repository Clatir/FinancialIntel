/**
 * AP-9 (1.15.6): „Wycofaj dokowanie” in the docking window and in the bridge's row, and „usuń” of a category nothing
 * uses – each with „Cofnij”. The ICTTJ folder is only read: not one byte of it changes.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const WALLET = '01KDEFACC00000000000000002'
const W1 = '01KPAY00000000000000000011'
const W2 = '01KPAY00000000000000000012'

function put(root: string, rel: string, data: unknown): void {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

/** Every file of a folder with its bytes and time of change: what ICTTJ's folder is before and after. */
function folderState(root: string): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      const st = statSync(path)
      if (st.isDirectory()) walk(path)
      else out[relative(root, path)] = `${st.mtimeMs}:${readFileSync(path, 'base64')}`
    }
  }
  walk(root)
  return out
}

const payout = (id: string, date: string, amount: number) => ({
  schemaVersion: 1,
  id,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  kind: 'withdrawal',
  date,
  amount,
  pool: 'current',
  note: '',
  categoryId: null,
  goal: null
})

test('AP-9: „Wycofaj dokowanie” w oknie (Portfel XTB) i w wierszu (para z mBanku), z „Cofnij”; folder ICTTJ bez zmian', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const old = addDays(today, -10)
  const tmp = mkdtempSync(join(tmpdir(), 'fi-ap9-'))
  const ictj = join(tmp, 'ICTJ')
  put(ictj, 'journal.json', { schemaVersion: 1, settings: {} })
  // Without a pair in mBank past the window: Portfel XTB. With the bank's inflow today: the pair.
  put(ictj, `payouts/${old.slice(0, 4)}/${old}_${W1}.json`, payout(W1, old, 500))
  put(ictj, `payouts/${today.slice(0, 4)}/${today}_${W2}.json`, payout(W2, today, 1200))
  const appData = join(tmp, 'AppData')
  mkdirSync(appData, { recursive: true })
  const dataDir = join(tmp, 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(3000) } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: {} }],
      transactions: [{ date: today, accountId: MBANK, kind: 'trading', amount: zl(1200), counterparty: 'XTB S.A.' }]
    }
  })
  const ictjBefore = folderState(ictj)
  const { app, page, dataDir: dir, errors } = await launch({ dataDir, env: { FI_ICTJ_DIR: ictj, FI_ICTJ_APPDATA: appData, FI_ICTJ_LAUNCH: 'dry' } })
  try {
    const rows = page.locator('[data-testid="docking-row"]')
    await expect(rows).toHaveCount(2)
    const walletOps = async () => (await records(dir, 'transactions')).filter((t) => t.accountId === WALLET).map((t) => [t.id, t.kind, t.amount])
    const dockingsOf = async (entry: string) => (await records(dir, 'dockings')).filter((d) => d.ictjEntryId === entry).map((d) => d.id)

    // Docked on Portfel XTB: the docking and its operation.
    await rows.filter({ hasText: '500,00' }).click()
    await expect(page.getByTestId('docking-account')).toContainText('Portfel XTB')
    await expect(page.getByTestId('docking-undock')).toHaveCount(0)
    await page.getByTestId('docking-confirm').click()
    await expect(page.getByTestId('docking-dialog')).toHaveCount(0)
    await expect.poll(walletOps).toHaveLength(1)
    const [walletOp] = await walletOps()
    await expect.poll(() => dockingsOf(W1)).toHaveLength(1)
    const [walletDocking] = await dockingsOf(W1)

    // „Wycofaj dokowanie” in the window: both gone, the delivery to dock again (on Portfel XTB).
    await rows.filter({ hasText: '500,00' }).click()
    await page.getByTestId('docking-undock').click()
    await expect(page.getByTestId('docking-dialog')).toHaveCount(0)
    await expect.poll(walletOps).toEqual([])
    await expect.poll(() => dockingsOf(W1)).toEqual([])
    await expect(rows.filter({ hasText: '500,00' })).toHaveAttribute('data-state', 'pending')
    // „Cofnij”: the same docking and operation back.
    await page.getByRole('status').filter({ hasText: 'Wycofano dokowanie 500,00 zł i jego operację na Portfelu XTB' }).getByTestId('toast-action').click()
    await expect.poll(walletOps).toEqual([walletOp])
    await expect.poll(() => dockingsOf(W1)).toEqual([walletDocking])
    await expect(rows.filter({ hasText: '500,00' })).toHaveAttribute('data-state', 'docked')

    // The pair from mBank docked, then taken back from the bridge's row: the bank's operation stays.
    await rows.filter({ hasText: '1 200,00' }).click()
    await expect(page.getByTestId('docking-account')).toContainText('mBank')
    await page.getByTestId('docking-confirm').click()
    await expect(page.getByTestId('docking-dialog')).toHaveCount(0)
    await expect.poll(() => dockingsOf(W2)).toHaveLength(1)
    await rows.filter({ hasText: '1 200,00' }).locator('xpath=..').getByTestId('docking-row-undock').click()
    await expect.poll(() => dockingsOf(W2)).toEqual([])
    await expect(rows.filter({ hasText: '1 200,00' })).toHaveAttribute('data-state', 'pending')
    expect((await records(dir, 'transactions')).filter((t) => t.accountId === MBANK && t.kind === 'trading')).toHaveLength(1)
    await expect(page.getByRole('status').filter({ hasText: 'operacja z banku zostaje i czeka na ponowne dokowanie' })).toBeVisible()

    // Never a write to ICTTJ's folder.
    expect(folderState(ictj)).toEqual(ictjBefore)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-9: „usuń” nieużywaną kategorię z „Cofnij”; używana zostaje – komunikat mówi gdzie', async () => {
  const { date: today } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap9c-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      categories: [
        ...s.categories,
        { id: '01KAP9CAT00000000000000001', name: 'Testowa', parentId: null, envelope: 'planned', system: null, archived: false },
        { id: '01KAP9CAT00000000000000002', name: 'Podtestowa', parentId: '01KAP9CAT00000000000000001', envelope: null, system: null, archived: false },
        { id: '01KAP9CAT00000000000000003', name: 'Używana', parentId: null, envelope: 'planned', system: null, archived: false }
      ]
    }),
    records: { transactions: [{ date: today, accountId: MBANK, kind: 'expense', amount: -zl(12), categoryId: '01KAP9CAT00000000000000003', counterparty: 'Sklep' }] }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    const names = async () => ((await json(join(dir, 'fi.json'))).settings.categories as Array<{ name: string }>).map((c) => c.name)
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const before = await names()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-categories').click()
    const row = (name: string) => page.locator(`[data-testid="category-row"][data-name="${name}"]`)

    // Nothing uses „Testowa” and its subcategory: both go; „Cofnij” brings them back in their places.
    await row('Testowa').getByTestId('category-delete').click()
    await expect(row('Testowa')).toHaveCount(0)
    await expect.poll(names).toEqual(before.filter((n) => n !== 'Testowa' && n !== 'Podtestowa'))
    await page.getByRole('status').filter({ hasText: 'Usunięto: kategoria „Testowa” z 1 podkategorią' }).getByTestId('toast-action').click()
    await expect(row('Testowa')).toHaveCount(1)
    await expect.poll(names).toEqual(before)

    // A subcategory alone.
    await row('Testowa').locator('[data-testid="subcategory"][data-name="Podtestowa"]').getByTestId('subcategory-delete').click()
    await expect.poll(names).toEqual(before.filter((n) => n !== 'Podtestowa'))

    // One operation uses „Używana”: it stays, the toast says where and offers archiving.
    await row('Używana').getByTestId('category-delete').click()
    const refusal = page.getByRole('status').filter({ hasText: 'Kategoria „Używana” jest w użyciu (1 operacja)' })
    await expect(refusal).toBeVisible()
    await expect(row('Używana')).toHaveCount(1)
    await refusal.getByTestId('toast-action').click()
    await expect.poll(async () => ((await json(join(dir, 'fi.json'))).settings.categories as Array<{ name: string; archived: boolean }>).find((c) => c.name === 'Używana')?.archived).toBe(true)
    expect(await names()).toContain('Używana')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('N-PC-4: wydatek z Ładowni zmieniony na przelew – komunikat, co odpięto, i „Cofnij”', async () => {
  const { date: today, month } = warsawNow()
  const CONTAINER = '01KAP9C0N00000000000000001'
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap9k-')), 'FinancialIntel')
  seedFolder(dataDir, {
    records: {
      containers: [{ id: CONTAINER, name: 'Prąd', amount: zl(100), dueMonth: month, amountAt: '2026-01-01T00:00:00.000Z' }],
      transactions: [{ date: today, accountId: MBANK, kind: 'expense', amount: -zl(100), containerId: CONTAINER, counterparty: 'Tauron' }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    const op = async () => (await records(dir, 'transactions')).map((t) => [t.kind, t.containerId])
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await page.locator('[data-testid="operation-row"]', { hasText: 'Tauron' }).click()
    await page.getByRole('radiogroup', { name: 'Rodzaj operacji' }).getByRole('radio', { name: 'Przelew własny' }).click()
    const note = page.getByRole('status').filter({ hasText: 'Rodzaj „Przelew własny” nie bierze pieniędzy z celu ani z Ładowni – operację odpięto: kontener „Prąd”.' })
    await expect(note).toBeVisible()
    await expect.poll(op).toEqual([['transfer', null]])
    await note.getByTestId('toast-action').click()
    await expect.poll(op).toEqual([['expense', CONTAINER]])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
