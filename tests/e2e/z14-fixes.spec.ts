import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json } from './files'
import { pickCategory } from './forms'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'

// Z14 (1.21.0, fixes after the review): the title rule's category list in a portal, the quick entry's row of „Ustaw na
// tym komputerze”, „Cofnij” of the notifications' bulk switches, the error of „Pokaż w folderze”.

test('reguła dla tytułu: wybór kategorii myszą zostawia okno otwarte, Esc przy otwartej liście zamyka tylko listę', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-z14-rule-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(1000) }],
      transactions: [{ date: warsawNow().date, accountId: MBANK, amount: -zl(35), counterparty: 'Piotr Testowy', title: 'Zwrot za obiad' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await page.getByTestId('operation-row').filter({ hasText: 'Piotr Testowy' }).first().click()
    await page.getByTestId('operation-title-rule').click()
    const panel = page.getByTestId('operation-title-rule-panel')
    await panel.getByRole('radio', { name: 'Zwrot / kategoria' }).click()

    // The mouse on an option of the list in the portal: the window stays, the category is chosen.
    await pickCategory(page, 'title-rule-category', GROCERIES)
    await expect(panel).toBeVisible()
    await expect(page.getByTestId('title-rule-category')).toHaveAttribute('data-value', GROCERIES)

    // Esc with the list open closes the list only; the next Esc closes the window.
    await page.getByTestId('title-rule-category').click()
    const list = page.getByTestId('title-rule-category-list')
    await expect(list).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(list).toHaveCount(0)
    await expect(panel).toBeVisible()
    await page.getByTestId('title-rule-keyword').click()
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('„Ustaw na tym komputerze”: skrót szybkiego wpisu prowadzi do „Zasobnik i start”', async () => {
  const { app, page, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await page.getByTestId('machine-setup-open').click()
    const list = page.getByTestId('machine-setup')
    await list.getByTestId('machine-setup-shortcut').getByRole('button', { name: 'Ustaw…' }).click()
    await expect(page.getByTestId('machine-setup')).toHaveCount(0)
    await expect(page.getByTestId('settings-shortcut')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('powiadomienia: „Wyłącz wszystkie” i „włącz wszystkie” grupy mają „Cofnij”', async () => {
  const { app, page, userData, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-notify').click()
    const count = page.getByTestId('notify-count')
    await expect(count).toHaveText('włączone 20 z 20')
    const enabled = async () => Object.entries((await json(join(userData, 'config.json'))).prefs?.notify ?? {}).filter(([, v]) => v === true).length

    await page.getByTestId('notify-all-off').click()
    await expect(count).toHaveText('włączone 0 z 20')
    const toast = page.getByRole('status').filter({ hasText: 'Powiadomienia wyłączone: 20 przełączników' })
    await toast.getByRole('button', { name: 'Cofnij' }).click()
    await expect(count).toHaveText('włączone 20 z 20')
    await expect.poll(enabled).toBe(20)

    // A group: only its switches come back.
    await page.getByTestId('notify-group-toggle-sensors').click()
    await expect(count).toHaveText('włączone 18 z 20')
    await page.getByRole('status').filter({ hasText: 'Powiadomienia wyłączone: 2 przełączniki' }).getByRole('button', { name: 'Cofnij' }).click()
    await expect(count).toHaveText('włączone 20 z 20')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('„Pokaż w folderze” po eksporcie: błąd systemu jest powiedziany, nie połknięty', async () => {
  const { date } = warsawNow()
  const start = `${addMonths(warsawNow().month, -1)}-01`
  const out = mkdtempSync(join(tmpdir(), 'fi-z14-out-'))
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-z14-rep-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(1000) }],
      transactions: [{ date: addDays(date, 0), accountId: MBANK, amount: -zl(12), counterparty: 'Kawiarnia Alfa' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await app.evaluate(({ dialog, shell }, p) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: p })
      shell.showItemInFolder = () => {
        throw new Error('Menedżer plików niedostępny')
      }
    }, join(out, 'operacje.csv'))
    await page.keyboard.press('Control+0')
    await page.getByRole('radio', { name: 'Eksport' }).click()
    await page.getByTestId('export-operations-csv').click()
    await page.getByRole('status').filter({ hasText: 'Zapisano:' }).getByRole('button', { name: 'Pokaż w folderze' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Menedżer plików niedostępny' })).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
