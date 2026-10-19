import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const WALLET = '01KDEFACC00000000000000002'

/** The save dialog answered with `path` (the main process's dialog replaced for the test). */
const saveTo = (app: ElectronApplication, path: string) =>
  app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p })
  }, path)

/** An operation opened through the palette (F19): its counterparty typed, Enter – the editor shows it. */
async function openByPalette(page: Page, query: string, name: string): Promise<void> {
  await page.keyboard.press('Control+k')
  await page.getByTestId('palette-input').fill(query)
  // The commands matching nothing: the first item is the operation – of this query (never of the last opening's).
  await expect(page.getByTestId('palette-operation').first()).toContainText(name)
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('palette')).toHaveCount(0)
  await expect(page.getByTestId('operation-counterparty')).toHaveValue(name)
}

test('przelew jedną operacją (F10), zmiana zaznaczonych z podglądem (F11), ostrzeżenie w potwierdzonym okresie (F12), paleta (F19)', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ops-s-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [
        { date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) },
        { date: start, accountId: WALLET, kind: 'opening', amount: 0 },
        // Confirmed after the purchase and the transfer: 5000 − 45 − 200.
        { date: addDays(start, 5), accountId: MBANK, kind: 'confirmation', amount: zl(4755) }
      ],
      months: [{ month: addMonths(month, -1), salary: zl(3000), envelopes: {} }],
      transactions: [
        { date: addDays(start, 1), accountId: MBANK, amount: -zl(45), counterparty: 'Sklep Okresowy' },
        // A transfer of before 1.7.0: its two sides as two operations.
        { date: addDays(start, 2), accountId: MBANK, kind: 'transfer', amount: -zl(200), counterparty: 'Przelew na portfel', counterAccountId: WALLET },
        { date: addDays(start, 3), accountId: WALLET, kind: 'transfer', amount: zl(200), counterparty: 'Wpływ z mBanku' },
        // Two moves outside the budget of one amount and day (no side names an account): a pair to check.
        { date: addDays(start, 8), accountId: MBANK, kind: 'transfer', amount: -zl(150), counterparty: 'Lokata zewnętrzna' },
        { date: addDays(start, 8), accountId: WALLET, kind: 'transfer', amount: zl(150), counterparty: 'Zwrot z lokaty' },
        { date: today, accountId: MBANK, amount: -zl(12), counterparty: 'Kawiarnia Alfa' },
        { date: today, accountId: MBANK, amount: -zl(18), counterparty: 'Kawiarnia Beta' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()

    // F10: the two sides of the old transfer reported – the pairs listed first, „Połącz zaznaczone” makes the chosen one
    // operation, the balances stay; a pair no side names an account of is marked to check – left as it is.
    await page.keyboard.press('Control+Shift+M')
    const pair = page.getByTestId('inbox-item').filter({ hasText: 'jako dwie osobne operacje' })
    await expect(pair).toContainText('2 przelewy')
    await pair.getByTestId('inbox-open').click()
    const dialog = page.getByTestId('inbox-pairs')
    await expect(dialog.getByTestId('inbox-pair')).toHaveCount(2)
    const unnamed = dialog.locator('[data-testid="inbox-pair"][data-unnamed="1"]')
    await expect(unnamed).toContainText('Lokata zewnętrzna')
    await unnamed.getByTestId('inbox-pair-tick').uncheck()
    await dialog.getByTestId('inbox-pairs-join').click()
    const transfers = async () => (await records(dir, 'transactions')).filter((t) => t.kind === 'transfer' && t.counterparty !== 'Lokata zewnętrzna' && t.counterparty !== 'Zwrot z lokaty')
    await expect.poll(async () => (await transfers()).map((t) => [t.accountId, t.amount, t.bothSides, t.counterAccountId, t.counterDate])).toEqual([[MBANK, -zl(200), true, WALLET, addDays(start, 3)]])
    expect((await records(dir, 'transactions')).filter((t) => t.kind === 'transfer')).toHaveLength(3)
    // The pair left: two moves – „zostaw tak”, not reported again.
    await expect(pair).toContainText('1 przelew')
    await pair.getByTestId('inbox-open').click()
    await dialog.getByTestId('inbox-pair-dismiss').click()
    await expect(dialog.getByTestId('inbox-pair')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(pair).toHaveCount(0)
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('balance-Portfel XTB')).toHaveText('350,00 zł')

    // A transfer of before 1.7.0 given an account of the budget: still its own side only – the other account's money
    // never comes twice (its other side may be an operation of its own).
    await openByPalette(page, 'lokata zewnętrzna', 'Lokata zewnętrzna')
    await page.getByTestId('operation-counter-account').selectOption({ label: 'Portfel XTB' })
    await expect(page.getByTestId('operation-transfer-legacy')).toBeVisible()
    await expect(page.getByTestId('balance-Portfel XTB')).toHaveText('350,00 zł')

    // F19 + F10: the transfer from the palette, one operation of both accounts.
    await openByPalette(page, 'przelew na portfel', 'Przelew na portfel')
    await expect(page.getByTestId('operation-transfer-both')).toContainText('Jedna operacja dla obu kont')

    // F12: an operation before the account's confirmed balance – marked; a change of its amount asks first.
    await openByPalette(page, 'sklep okresowy', 'Sklep Okresowy')
    await expect(page.getByTestId('operation-confirmed')).toBeVisible()
    const amount = page.getByTestId('operation-amount')
    await amount.fill('50')
    await amount.press('Tab')
    await expect(page.getByTestId('operation-guard')).toContainText('potwierdzone saldo konta mBank')
    await expect(page.getByTestId('operation-guard')).toContainText('−5,00 zł')
    await page.getByTestId('operation-guard-cancel').click()
    await expect(amount).toHaveValue('45,00')
    await amount.fill('50')
    await amount.press('Tab')
    await page.getByTestId('operation-guard-confirm').click()
    await expect.poll(async () => (await records(dir, 'transactions')).find((t) => t.counterparty === 'Sklep Okresowy')?.amount).toBe(-zl(50))

    // F11: the two coffees a day earlier – the effect shown first, then one „Cofnij”.
    await page.keyboard.press('Control+2')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    for (const name of ['Kawiarnia Alfa', 'Kawiarnia Beta']) await page.getByTestId('operation-row').filter({ hasText: name }).getByTestId('operation-tick').check()
    await page.getByTestId('operations-bulk-change').selectOption('shift')
    await page.getByTestId('operations-bulk-days').fill('-1')
    await page.getByTestId('operations-bulk-preview').click()
    await expect(page.getByTestId('operations-bulk-effect')).toContainText('2 operacje')
    await page.getByTestId('operations-bulk-confirm').click()
    const coffeeDays = async () => (await records(dir, 'transactions')).filter((t) => String(t.counterparty).startsWith('Kawiarnia')).map((t) => t.date)
    await expect.poll(coffeeDays).toEqual([addDays(today, -1), addDays(today, -1)])
    await page.getByRole('status').filter({ hasText: 'Przesunięto datę' }).getByTestId('toast-action').click()
    await expect.poll(coffeeDays).toEqual([today, today])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('filtry zaawansowane, kolejność, widok zapisany w fi.json, eksport widocznych (F18); dziennik zmian w Synchronizacji (F33)', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ops-s2-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      months: [{ month: addMonths(month, -1), salary: zl(3000), envelopes: {} }],
      containers: [{ name: 'Czynsz', amount: zl(1500), cycleMonths: 1, dueMonth: month, dueDay: 10, counterparty: 'SPÓŁDZIELNIA' }],
      transactions: [
        { date: today, accountId: MBANK, amount: -zl(12), counterparty: 'Mała Kawa' },
        { date: today, accountId: MBANK, amount: -zl(320), counterparty: 'Duże Zakupy' },
        { date: today, accountId: MBANK, amount: -zl(75), counterparty: 'Apteka' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  const files = mkdtempSync(join(tmpdir(), 'fi-ops-s2-out-'))
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('operation-row')).toHaveCount(3)
    // The biggest amounts first.
    await page.getByTestId('operations-sort-amount').click()
    await expect(page.getByTestId('operation-row').first()).toContainText('Duże Zakupy')
    // From 50 zł up.
    await page.getByTestId('operations-more').click()
    await page.getByTestId('operations-amount-min').fill('50')
    await page.getByTestId('operations-amount-min').press('Tab')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('operation-row')).toHaveCount(2)
    await expect(page.getByTestId('operations-more')).toContainText('Więcej filtrów: 1')

    // A view saved in fi.json (every computer): its chip marked while the list shows it.
    await page.getByTestId('operations-view-save').click()
    await page.getByTestId('operations-view-name').fill('Ponad 50 zł')
    await page.getByTestId('operations-view-confirm').click()
    await expect.poll(() => (JSON.parse(readFileSync(join(dir, 'fi.json'), 'utf8')) as { settings: { operationViews: Array<{ name: string; filter: { amountMin: number; sort: string } }> } }).settings.operationViews.map((v) => [v.name, v.filter.amountMin, v.filter.sort])).toEqual([['Ponad 50 zł', zl(50), 'amount']])
    await expect(page.getByTestId('operations-view')).toHaveAttribute('data-active', '1')
    await page.getByTestId('operations-clear').click()
    await expect(page.getByTestId('operation-row')).toHaveCount(3)
    await expect(page.getByTestId('operations-view')).not.toHaveAttribute('data-active', '1')
    await page.getByTestId('operations-view-apply').click()
    await expect(page.getByTestId('operation-row')).toHaveCount(2)

    // The visible list to CSV: exactly the two shown, in the list's order.
    const csv = join(files, 'widoczne.csv')
    await saveTo(app, csv)
    await page.getByTestId('operations-export-csv').click()
    await expect.poll(() => {
      try {
        return readFileSync(csv, 'utf8')
          .split(/\r?\n/)
          .filter((l) => l.includes(today))
          .map((l) => l.split(';')[6])
      } catch {
        return null
      }
    }).toEqual(['Duże Zakupy', 'Apteka'])

    // F19: a container from the palette – marked on its screen.
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('spółdzielnia')
    await expect(page.getByTestId('palette-container')).toBeVisible()
    await page.getByTestId('palette-container').click()
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    await expect(page.locator('[data-testid="cargo-row"].focus-mark')).toHaveCount(1)

    // F33: today's changes – the view saved is in the settings; an operation changed shows its fields before and after.
    await page.keyboard.press('Control+2')
    await page.getByTestId('operation-row').filter({ hasText: 'Apteka' }).click()
    await page.getByTestId('operation-counterparty').fill('Apteka Centrum')
    await page.getByTestId('operation-counterparty').press('Tab')
    await expect.poll(async () => (await records(dir, 'transactions')).map((t) => t.counterparty).sort()).toEqual(['Apteka Centrum', 'Duże Zakupy', 'Mała Kawa'])
    await page.keyboard.press('Control+Shift+Y')
    const log = page.getByTestId('sync-changelog')
    const row = log.getByTestId('changelog-row').filter({ hasText: 'Apteka Centrum' })
    await expect(row).toBeVisible()
    await expect(log.getByTestId('changelog-row').filter({ hasText: 'Ustawienia' })).toBeVisible()
    await row.getByTestId('changelog-changes').click()
    await expect(row.getByTestId('changelog-diff')).toContainText('Apteka')
    await row.getByTestId('changelog-take-back').click()
    await expect.poll(async () => (await records(dir, 'transactions')).map((t) => t.counterparty).sort()).toEqual(['Apteka', 'Duże Zakupy', 'Mała Kawa'])
    // By kind: the operations only.
    await log.getByTestId('changelog-kind').selectOption('transactions')
    await expect(log.getByTestId('changelog-row').filter({ hasText: 'Ustawienia' })).toHaveCount(0)
    // A change saved while the log is open (the save stamps the record in place): in the log once the folder has it.
    await page.evaluate('window.__FI_SAVE_DELAY__ = 1500')
    await page.keyboard.press('Control+2')
    await page.getByTestId('operation-row').filter({ hasText: 'Duże Zakupy' }).click()
    await page.getByTestId('operation-counterparty').fill('Duże Zakupy Bis')
    await page.getByTestId('operation-counterparty').press('Tab')
    await page.keyboard.press('Control+Shift+Y')
    await expect(log.getByTestId('changelog-row').filter({ hasText: 'Duże Zakupy Bis' })).toContainText('E2E-PC')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
