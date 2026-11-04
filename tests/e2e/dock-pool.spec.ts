import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const W = '01KPAYN2000000000000000001'
const R = '01KPAYN2000000000000000002'

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

test('Dostawa do zadokowania według puli wpisu (AP-12): Podatek w rezerwie, zwrot z niej bez firewalla, „Do zadokowania” na Mostku', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const before = addDays(today, -1)
  const tmp = mkdtempSync(join(tmpdir(), 'fi-dock-pool-'))
  const ictj = join(tmp, 'ICTJ')
  put(ictj, 'journal.json', { schemaVersion: 1, settings: {} })
  // A payout of the pool Podatek yesterday and its return to the trading capital today – both paired in mBank, not docked.
  put(ictj, `payouts/${before.slice(0, 4)}/${before}_${W}.json`, payout(W, 'withdrawal', before, 800, 'tax'))
  put(ictj, `payouts/${today.slice(0, 4)}/${today}_${R}.json`, payout(R, 'return', today, 300, 'tax'))
  const dataDir = join(tmp, 'FinancialIntel')
  seedFolder(dataDir, {
    // The hull far from full (18 000 zł of target): a top-up of XTB from the budget would break the firewall.
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(3000) } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: {} }],
      transactions: [
        { date: before, accountId: MBANK, kind: 'trading', amount: zl(800), counterparty: 'XTB S.A.' },
        { date: today, accountId: MBANK, kind: 'trading', amount: -zl(300), counterparty: 'XTB S.A.' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir, env: { FI_ICTJ_DIR: ictj, FI_ICTJ_LAUNCH: 'dry' } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const rows = page.locator('[data-testid="docking-row"]')
    await expect(rows).toHaveCount(2)
    // Counted by the entries' pool before „Zadokuj”: 800 zł in the reserve, 300 zł of it back – no firewall's alarm.
    const toDock = page.getByTestId('state-to-dock')
    await expect(toDock).toContainText('2 wpisy ICTTJ')
    await expect(toDock).toContainText('+800,00 zł')
    await expect(toDock).toContainText('−300,00 zł')
    await expect(page.getByText('poza budżetem (PIT-38)').locator('..')).toContainText('500,00 zł')
    await expect(page.locator('[data-testid="briefing-item"][data-kind="alarm"]').filter({ hasText: 'Firewall' })).toHaveCount(0)
    // „Ostatnia dostawa” only after the docking (AP-26, PR sp. 2 – 1.15.9): a pair to dock is „Do zadokowania” above.
    await expect(page.getByTestId('state-delivery-why')).toHaveCount(0)

    // The return docked: nothing moves, one entry left to dock.
    await rows.filter({ hasText: 'Zwrot do masy' }).click()
    await expect(page.getByTestId('docking-firewall')).toContainText('wraca z rezerwy na PIT-38')
    await page.getByTestId('docking-confirm').click()
    await expect(page.getByTestId('docking-dialog')).toHaveCount(0)
    await expect.poll(async () => (await records(dir, 'dockings')).map((d) => [d.ictjEntryId, d.pool])).toEqual([[R, 'tax']])
    await expect(toDock).toContainText('1 wpis ICTTJ')
    await expect(toDock).not.toContainText('300,00')
    await expect(page.getByText('poza budżetem (PIT-38)').locator('..')).toContainText('500,00 zł')
    await expect(page.locator('[data-testid="briefing-item"][data-kind="alarm"]').filter({ hasText: 'Firewall' })).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
