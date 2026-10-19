import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'

test('meldunki do rozpatrzenia (1.6.0, F6): licznik w menu, wydatek bez kategorii z filtrem w Operacjach, saldo niepotwierdzone ponad 30 dni, Ctrl+Shift+M', async () => {
  const { date: today, month } = warsawNow()
  // The budget from two months ago: its opening balance is never confirmed – over 30 days.
  const start = `${addMonths(month, -2)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-inbox-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      transactions: [
        { date: addDays(today, -1), accountId: MBANK, amount: -zl(42.5), counterparty: 'Sklep bez kategorii' },
        // Before the budget's start: history, no report.
        { date: addDays(start, -10), accountId: MBANK, amount: -zl(7), counterparty: 'Sprzed startu' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const nav = page.getByTestId('nav-inbox')
    await expect(nav).toHaveAttribute('data-badge', '2')
    await page.keyboard.press('Control+Shift+M')
    await expect(page.getByTestId('page-inbox')).toBeVisible()
    await expect(page.getByTestId('inbox-count')).toHaveText('2 meldunki')
    const item = (kind: string) => page.locator(`[data-testid="inbox-item"][data-kind="${kind}"]`)
    await expect(page.getByTestId('inbox-item')).toHaveCount(2)
    await expect(item('uncategorized')).toContainText('1 wydatek bez kategorii od')
    await expect(item('uncategorized')).toContainText('razem 42,50 zł')
    await expect(item('balances')).toContainText('mBank: saldo bez potwierdzenia od salda otwarcia')

    // „Pokaż w Operacjach”: the list filtered to them, from the budget's start.
    await item('uncategorized').getByTestId('inbox-open').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await page.getByTestId('operation-row').click()
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await expect(nav).toHaveAttribute('data-badge', '1')

    // The balance: confirmed with the bank's – the inbox is empty, the counter gone.
    await nav.click()
    await expect(page.getByTestId('inbox-item')).toHaveCount(1)
    await item('balances').getByTestId('inbox-open').click()
    const row = page.locator('[data-testid="account-row"][data-name="mBank"]')
    const bank = row.getByTestId('account-confirm-amount')
    await bank.click()
    await bank.fill('4957,50')
    await bank.press('Enter')
    await row.getByTestId('account-confirm').click()
    await expect.poll(async () => (await records(dir, 'balances')).filter((b) => b.kind === 'confirmation').length).toBe(1)
    await expect(nav).not.toHaveAttribute('data-badge')
    // Esc: back from Ustawienia to the inbox, now without reports.
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('page-inbox')).toContainText('Brak meldunków')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('podwójna korekta salda z dwóch komputerów (1.6.2, B129): meldunek, „Pokaż korektę”, „to nie powtórzenie” na stałe', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-corrections-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      transactions: [
        { date: addDays(today, -3), accountId: MBANK, amount: zl(50), kind: 'correction', updatedBy: 'LAPTOP' },
        { date: addDays(today, -2), accountId: MBANK, amount: zl(50), kind: 'correction', updatedBy: 'PC' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+Shift+M')
    const item = page.locator('[data-testid="inbox-item"][data-kind="corrections"]')
    await expect(item).toContainText('mBank: korekta salda 50,00 zł')
    await expect(item).toContainText('wygląda na powtórzoną')
    await expect(item).toContainText('(LAPTOP)')
    // „Pokaż korektę”: the later one in Operacje, open in the editor.
    await item.getByTestId('inbox-open').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-editor')).toBeVisible()
    // Both real: said once, the report goes for good.
    await page.getByTestId('nav-inbox').click()
    await item.getByTestId('inbox-dismiss').click()
    await expect(item).toHaveCount(0)
    await expect.poll(async () => Object.keys((await json(join(dir, 'fi.json'))).settings.import.notDuplicates ?? {}).filter((k) => k.startsWith('correction:')).length).toBe(1)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
