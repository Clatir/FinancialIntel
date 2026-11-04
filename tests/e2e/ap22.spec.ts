import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FUEL = '01KDEFCAT00000000000000300'

test('AP-22: usunięcie reguły, rozłączenie nazwy i zrzut kontenera mają „Cofnij”; lista importów ostrzega o rotacji', async () => {
  const { month, date } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap22-')), 'FinancialIntel')
  const batches = Array.from({ length: 10 }, (_, i) => ({
    at: `2026-09-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`,
    savedAt: `2026-09-${String(10 + i).padStart(2, '0')}T10:00:05.000Z`,
    accountId: ACC,
    fileName: `plik${i}.csv`,
    created: []
  }))
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      import: {
        ...s.import,
        rules: [{ id: '01K7R000000000000000000K01', match: 'cukiernia', mode: 'keyword', direction: 'out', label: 'cukiernia', kind: 'expense', categoryId: FUEL, learned: false, hits: 0, updatedAt: '2026-10-01T10:00:00.000Z' } as never],
        aliases: { mokka: { to: 'kawiarnia mokka', label: 'MOKKA', toLabel: 'KAWIARNIA MOKKA', at: '2026-10-01T10:00:00.000Z' } }
      }
    }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(5000) }],
      months: [{ month: addMonths(month, -1), salary: zl(3000), envelopes: {} }],
      containers: [{ name: 'Netflix', amount: zl(43), cycleMonths: 1, dueMonth: month, amountAt: `${date}T10:00:00.000Z` }],
      imports: batches
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-import').click()
    // AF-29: the keyword rule is deleted with „Cofnij”.
    await expect(page.getByTestId('keyword-rule')).toHaveCount(1)
    await page.getByTestId('keyword-rule-delete').click()
    await expect(page.getByTestId('keyword-rule')).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Reguła „cukiernia” usunięta' })).toBeVisible()
    await page.getByTestId('toast-action').click()
    await expect(page.getByTestId('keyword-rule')).toHaveCount(1)
    // AF-60: „rozłącz” a merged name – and take it back.
    await expect(page.getByTestId('alias')).toHaveCount(1)
    await page.getByTestId('alias-unmerge').click()
    await expect(page.getByTestId('alias')).toHaveCount(0)
    await page.getByTestId('toast-action').click()
    await expect(page.getByTestId('alias')).toHaveCount(1)
    // DA sp. 5: ten imports kept – the next one takes the oldest one's „Cofnij import”.
    await expect(page.getByTestId('recent-imports-full')).toContainText('najstarszy')
    // AF-77: the dump from the cargo hold, with „Cofnij”.
    await page.getByTestId('nav-cargo').click()
    await page.getByTestId('cargo-row').first().click()
    await page.getByTestId('container-archived').click()
    await expect(page.getByRole('status').filter({ hasText: 'zrzucony z ładowni' })).toBeVisible()
    await expect.poll(async () => (await records(dir, 'containers')).map((c) => c.archived)).toEqual([true])
    await page.getByTestId('toast-action').click()
    await expect.poll(async () => (await records(dir, 'containers')).map((c) => c.archived)).toEqual([false])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-22: przerwanie kreatora pyta (co przepada, co zostaje), Esc wycofuje pytanie', async () => {
  const { app, page, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.getByTestId('banner-wizard-start').click()
    await page.getByTestId('wizard-step-4').click()
    await page.getByTestId('wizard-goal-name').fill('Wakacje')
    await page.getByTestId('wizard-goal-target').click()
    await page.getByTestId('wizard-goal-target').fill('1000')
    await page.getByTestId('wizard-goal-target').press('Tab')
    await page.getByTestId('wizard-goal-add').click()
    // The first click only asks – what is lost and what stays in the folder (KR.30).
    await page.getByTestId('wizard-cancel').click()
    await expect(page.getByTestId('wizard-cancel-ask')).toContainText('Zostaje w folderze: cel „Wakacje”')
    await expect(page.getByTestId('wizard-cancel-confirm')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('wizard-cancel')).toBeVisible()
    await expect(page.getByTestId('page-bridge')).toHaveCount(0)
    await page.getByTestId('wizard-cancel').click()
    await page.getByTestId('wizard-cancel-confirm').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
