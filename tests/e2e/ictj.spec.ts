import { mkdirSync, mkdtempSync, promises as fs, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch, withMainLog } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const WALLET = '01KDEFACC00000000000000002'
const W1 = '01KPAY00000000000000000001'
const W2 = '01KPAY00000000000000000002'
const R1 = '01KPAY00000000000000000003'
const GOAL = '01KG0000000000000000000001'

function put(root: string, rel: string, data: unknown): void {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

const payout = (id: string, kind: string, date: string, amount: number, pool: string) => ({
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
  goal: null
})

test('ICTTJ: podpowiedź folderu, dokowanie z mBanku i na Portfel XTB, pula Cele, nowy wpis na żywo, Mapa gwiezdna, „Otwórz ICTTJ”', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const tmp = mkdtempSync(join(tmpdir(), 'fi-ictj-'))
  const ictj = join(tmp, 'ICTJ')
  // ICTTJ's folder (only what FI reads) and ICTTJ's own config.json with its path.
  put(ictj, 'journal.json', { schemaVersion: 1, settings: {} })
  put(ictj, `payouts/${today.slice(0, 4)}/${today}_${W1}.json`, payout(W1, 'withdrawal', today, 1200, 'current'))
  const old = addDays(today, -10)
  put(ictj, `payouts/${old.slice(0, 4)}/${old}_${W2}.json`, payout(W2, 'withdrawal', old, 500, 'goals'))
  put(ictj, `forecasts/01KPRGN0000000000000000001.json`, {
    schemaVersion: 1,
    id: '01KPRGN0000000000000000001',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
    name: 'Plan wakacyjny',
    currency: 'PLN',
    firstMonth: month,
    goals: [{ id: GOAL, name: 'Wakacje', month: 3, amount: 3000, enabled: true, flexible: false }]
  })
  const appData = join(tmp, 'AppData')
  put(appData, 'ICT Trade Journal/config.json', { dataDir: ictj })
  const exe = join(tmp, 'ICT-Trade-Journal-portable.exe')
  writeFileSync(exe, 'x')

  const dataDir = join(tmp, 'FinancialIntel')
  seedFolder(dataDir, {
    // Assumed costs: the hull has a target, so the withdrawal from „Bieżące” stays in the shields (8 000 / 12 000 zł after
    // two salaries) – the goals get only the pool Cele.
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(3000) } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: {} }],
      transactions: [{ date: today, accountId: MBANK, kind: 'trading', amount: zl(1200), counterparty: 'XTB S.A.' }]
    }
  })
  const { app, page, dataDir: dir, userData, errors } = await launch({ dataDir, env: { FI_ICTJ_APPDATA: appData, FI_ICTJ_LAUNCH: 'dry' } })
  try {
    // Without ICTTJ on this computer: the XTB inflow docks the usual way, a hint to choose the folder.
    await expect(page.getByTestId('docking-ictj-state')).toContainText('wybierz folder')
    await expect(page.locator('[data-testid="docking-row"]')).toHaveCount(1)

    // Ustawienia → ICTTJ: the folder ICTTJ uses here, confirmed.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-ictj').click()
    await page.getByTestId('ictj-use-suggested').click()
    await expect(page.getByTestId('ictj-status')).toHaveText('czytany')
    await expect(page.getByTestId('ictj-counts')).toContainText('Wypłaty: 2')
    await expect.poll(async () => (await json(join(userData, 'config.json'))).ictj?.dir).toBe(ictj)

    // The forecast's goal is the ship's (its id = ICTTJ's).
    await expect.poll(async () => (await records(dir, 'goals')).map((g) => [g.id, g.name, g.target, g.source])).toEqual([[GOAL, 'Wakacje', zl(3000), 'ictj']])

    // The bridge: the withdrawal paired with the mBank inflow, the old one without a pair → Portfel XTB.
    await page.keyboard.press('Control+1')
    const rows = page.locator('[data-testid="docking-row"]')
    await expect(rows).toHaveCount(2)
    await expect(page.locator('[data-testid="briefing-item"][data-kind="dock"]')).toHaveCount(2)
    await rows.filter({ hasText: '1 200,00' }).click()
    await expect(page.getByTestId('docking-account')).toContainText('mBank')
    await expect(page.getByTestId('docking-source')).toContainText('Bieżące')
    await expect(page.getByTestId('docking-shields')).toHaveText('1 200,00 zł')
    await expect(page.getByTestId('docking-hull')).toHaveValue('0,00')
    await page.screenshot({ path: join('test-results', 'screens', '10-dokowanie.png') })
    await page.getByTestId('docking-confirm').click()
    await expect(page.getByTestId('docking-dialog')).toHaveCount(0)
    const tx = (await records(dir, 'transactions')).find((t) => t.amount === zl(1200))!
    await expect.poll(async () => (await records(dir, 'dockings')).map((d) => [d.transactionId, d.ictjEntryId, d.pool, d.split])).toEqual([[tx.id, W1, 'current', null]])

    // The goals' pool without a pair: Portfel XTB, straight into the ICTTJ goal.
    await rows.filter({ hasText: '500,00' }).click()
    await expect(page.getByTestId('docking-account')).toContainText('Portfel XTB')
    await expect(page.getByTestId('docking-goal')).toHaveValue('500,00')
    await page.getByTestId('docking-confirm').click()
    await expect.poll(async () => (await records(dir, 'transactions')).filter((t) => t.accountId === WALLET).map((t) => [t.kind, t.amount, t.date])).toEqual([['trading', zl(500), old]])
    await expect.poll(async () => (await records(dir, 'dockings')).filter((d) => d.ictjEntryId === W2).map((d) => d.pool)).toEqual(['goals'])
    await expect(rows.filter({ hasText: 'zadokowana' })).toHaveCount(2)

    // A return written in ICTTJ while FI runs: on the bridge at once (the folder's watcher), the firewall in the window.
    put(ictj, `payouts/${today.slice(0, 4)}/${today}_${R1}.json`, payout(R1, 'return', today, 100, 'surplus'))
    await withMainLog(userData, () => expect(rows.filter({ hasText: 'Zwrot do masy' })).toHaveCount(1, { timeout: 15_000 }))
    await rows.filter({ hasText: 'Zwrot do masy' }).click()
    await expect(page.getByTestId('docking-firewall')).toBeVisible()
    await page.keyboard.press('Escape')

    // Mapa gwiezdna: the ICTTJ goal with its money, an own goal at the end, moved up.
    await page.keyboard.press('Control+6')
    const goal = (name: string) => page.locator(`[data-testid="starmap-goal"][data-name="${name}"]`)
    await expect(goal('Wakacje').getByTestId('starmap-amount')).toHaveText('500,00 zł')
    await page.getByTestId('starmap-new-name').fill('Rower')
    await page.getByTestId('starmap-new-target').fill('1000')
    await page.getByTestId('starmap-new-target').press('Tab')
    await page.getByTestId('starmap-new-add').click()
    await expect(page.locator('[data-testid="starmap-goal"]')).toHaveCount(2)
    await expect(page.locator('[data-testid="starmap-goal"]').last()).toHaveAttribute('data-name', 'Rower')
    await goal('Rower').getByTestId('starmap-up').click()
    await expect(page.locator('[data-testid="starmap-goal"]').first()).toHaveAttribute('data-name', 'Rower')
    await expect.poll(async () => (await records(dir, 'goals')).map((g) => [g.name, g.priority]).sort()).toEqual([
      ['Rower', 1],
      ['Wakacje', 2]
    ])
    await page.screenshot({ path: join('test-results', 'screens', '11-mapa-gwiezdna.png') })

    // „Otwórz ICTTJ”: not found on this computer (the reason with the way to the settings), then the chosen program.
    await page.getByTestId('nav-open-ictj').click()
    await expect(page.getByText('Nie znaleziono ICT Trade Journal')).toBeVisible()
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as typeof dialog.showOpenDialog
    }, exe)
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-ictj').click()
    await page.getByTestId('ictj-pick-exe').click()
    await expect(page.getByTestId('ictj-program')).toContainText('Wybrany')
    await page.getByTestId('nav-open-ictj').click()
    await expect.poll(async () => (await fs.readFile(join(userData, 'logs', 'main.log'), 'utf8')).includes(`ICTTJ: start ${exe}`)).toBe(true)
    // FI never wrote in the ICTTJ folder.
    expect((await fs.readdir(ictj, { recursive: true })).filter((f) => String(f).endsWith('.json')).sort()).toEqual(
      ['journal.json', `forecasts/01KPRGN0000000000000000001.json`, `payouts/${old.slice(0, 4)}/${old}_${W2}.json`, `payouts/${today.slice(0, 4)}/${today}_${R1}.json`, `payouts/${today.slice(0, 4)}/${today}_${W1}.json`].sort()
    )
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
