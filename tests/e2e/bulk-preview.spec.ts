import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'

// AP-38 (N5, F11 / T265, AF-24): „Przesuń datę” over the month's turn – the preview tells the loot and the envelope of
// the month the operation leaves, not only this month's.
test('podgląd zmiany zbiorczej: łupy i koperta miesiąca, z którego operacja wychodzi', async () => {
  const { month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${addMonths(month, -2)}-01`
  const lastOfPrev = addDays(`${month}-01`, -1)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-bulk-preview-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [
        { month: addMonths(month, -2), salary: zl(3000), envelopes: { [FOOD]: zl(1000) } },
        { month: prev, salary: zl(3000), envelopes: { [FOOD]: zl(1000) } }
      ],
      transactions: [
        { date: `${prev}-10`, accountId: MBANK, amount: -zl(200), categoryId: GROCERIES, counterparty: 'Sklep Alfa' },
        { date: lastOfPrev, accountId: MBANK, amount: -zl(100), categoryId: GROCERIES, counterparty: 'Obiad Omega' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operation-row').filter({ hasText: 'Obiad Omega' }).getByTestId('operation-tick').check()
    await page.getByTestId('operations-bulk-change').selectOption('shift')
    await page.getByTestId('operations-bulk-days').fill('1')
    await page.getByTestId('operations-bulk-preview').click()
    const effect = page.getByTestId('operations-bulk-effect')
    await expect(effect).toContainText('1 operacja')
    // The month it leaves: its loot grows by what it no longer spends, its envelope has that much more left.
    await expect(effect.getByTestId('operations-bulk-loot')).toHaveCount(1)
    await expect(effect.getByTestId('operations-bulk-loot')).toContainText('Łupy –')
    await expect(effect.getByTestId('operations-bulk-month-envelope')).toHaveCount(1)
    await expect(effect.getByTestId('operations-bulk-month-envelope')).toContainText('Koperta: Jedzenie')
    await page.getByTestId('operations-bulk-confirm').click()
    await expect.poll(async () => (await records(dir, 'transactions')).find((t) => t.counterparty === 'Obiad Omega')?.date).toBe(`${month}-01`)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

function put(root: string, rel: string, data: unknown): void {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

// AP-38 (OP sp. 2): deleting the bank's operation of an ICTTJ payout – the preview says the payout loses its pair.
test('podgląd usunięcia: wypłata z ICTTJ straci parę w banku', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const before = addDays(today, -1)
  const tmp = mkdtempSync(join(tmpdir(), 'fi-bulk-pair-'))
  const ictj = join(tmp, 'ICTJ')
  const W = '01KPAYN5000000000000000001'
  put(ictj, 'journal.json', { schemaVersion: 1, settings: {} })
  put(ictj, `payouts/${before.slice(0, 4)}/${before}_${W}.json`, {
    schemaVersion: 1,
    id: W,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    kind: 'withdrawal',
    date: before,
    amount: 800,
    pool: 'surplus',
    note: '',
    categoryId: null,
    goal: null
  })
  const dataDir = join(tmp, 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: {} }],
      transactions: [{ date: before, accountId: MBANK, kind: 'trading', amount: zl(800), counterparty: 'XTB S.A.' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir, env: { FI_ICTJ_DIR: ictj, FI_ICTJ_LAUNCH: 'dry' } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.locator('[data-testid="docking-row"]')).toHaveCount(1)
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operation-row').filter({ hasText: 'XTB S.A.' }).getByTestId('operation-tick').check()
    await page.getByTestId('operations-bulk-change').selectOption('delete')
    await page.getByTestId('operations-bulk-preview').click()
    const plDay = `${before.slice(8, 10)}.${before.slice(5, 7)}.${before.slice(0, 4)}`
    await expect(page.getByTestId('operations-bulk-pair')).toHaveText(`Wypłata z ICTTJ z ${plDay} (800,00 zł) straci parę w banku – Dokowanie pokaże ją bez pary.`)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
