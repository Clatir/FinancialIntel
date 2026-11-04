import { mkdtempSync, promises as fs, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { importDone, launch } from './app'
import { records } from './files'
import { historiaCsv, listaCsv, type CsvBuy } from './mbank-csv'
import { seedFolder, writeRecords } from './seed'

/** The file dialog of the main process answers with `path` (a dialog cannot be clicked in a test). */
async function answerFileDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

/** A week of purchases before today (dates from today – testy.md), as both files of mBank write them. */
function week(): { dir: string; buys: CsvBuy[]; period: { from: string; to: string } } {
  const { date: today } = warsawNow()
  const buys: CsvBuy[] = [
    { date: addDays(today, -6), amount: 87.91, name: 'SLUSARZ KOWAL' },
    { date: addDays(today, -4), amount: 12.4, name: 'KIOSK RUCH' },
    { date: addDays(today, -2), amount: 31.95, name: 'ZABKA Z1234' }
  ]
  return { dir: mkdtempSync(join(tmpdir(), 'fi-formats-')), buys, period: { from: addDays(today, -8), to: addDays(today, -1) } }
}

async function importFile(app: ElectronApplication, page: Page, path: string): Promise<void> {
  await answerFileDialog(app, path)
  await page.getByTestId('import-pick').click()
  await expect(page.getByTestId('import-file')).toBeVisible()
}

const startedBudget = (dataDir: string) => seedFolder(dataDir, { settings: (s) => ({ ...s, budget: { ...s.budget, start: `${addMonths(warsawNow().month, -2)}-01` } }) })

test('AP-2: usunięta operacja nie wraca z plikiem drugiego formatu; meldunek dla operacji, która wróciła przed 1.15.5 – „Usuń”', async () => {
  const { dir, buys, period } = week()
  const historia = join(dir, 'historia_rachunku.csv')
  const lista = join(dir, 'lista_operacji.csv')
  writeFileSync(historia, historiaCsv(buys, period))
  writeFileSync(lista, listaCsv(buys, period))
  const dataDir = join(dir, 'FinancialIntel')
  const userData = join(dir, 'userData')
  startedBudget(dataDir)
  const operations = () => records(dataDir, 'transactions')

  let { app, page, errors } = await launch({ dataDir, userData })
  let deletedAt = ''
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await importFile(app, page, historia)
    await expect(page.getByTestId('import-count-new')).toHaveText('3')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect.poll(async () => (await operations()).length).toBe(3)

    // ZABKA deleted in Operacje.
    await page.keyboard.press('Control+2')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operations-search').fill('zabka')
    await page.getByTestId('operation-row').first().click()
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await expect.poll(async () => (await operations()).length).toBe(2)
    deletedAt = new Date().toISOString()
    await page.getByTestId('operations-search').fill('')

    // The list of operations of the same days: the deleted one stays out – nothing new, no backup (AF-63).
    await page.keyboard.press('Control+3')
    await importFile(app, page, lista)
    await expect(page.getByTestId('import-count-deleted')).toHaveText('1')
    await expect(page.getByTestId('import-count-new')).toHaveText('0')
    await expect(page.getByTestId('import-deleted')).toContainText('usunięta z historii rachunku')
    await expect(page.getByTestId('import-run')).toHaveText('Zapisz import (bez zmian)')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect(page.getByTestId('import-done')).toContainText('pominięte (usunięte wcześniej): 1')
    expect((await operations()).map((t) => t.counterparty).sort()).toEqual(['KIOSK RUCH', 'SLUSARZ KOWAL'])
    expect(await fs.readdir(join(dataDir, 'backups', 'pre-import'))).toHaveLength(1)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }

  // As 1.15.4 left it: the deleted one's row of the list imported again as a new operation.
  const zabka = buys[2]!
  writeRecords(dataDir, 'transactions', [
    {
      date: zabka.date,
      accountId: MBANK_ACCOUNT_ID,
      amount: -3195,
      counterparty: 'ZABKA Z1234',
      bank: { format: 'mbank', key: 'mbank:e2e00000000000a1:0', description: 'ZABKA Z1234 ZAKUP PRZY UŻYCIU KARTY W KRAJU', counterparty: 'ZABKA Z1234', operation: 'ZAKUP PRZY UŻYCIU KARTY W KRAJU', category: '', pending: false, importedAt: new Date(Date.parse(deletedAt) + 60_000).toISOString(), source: 'lista' }
    }
  ])
  ;({ app, page, errors } = await launch({ dataDir, userData }))
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+Shift+M')
    const item = page.locator('[data-testid="inbox-item"][data-kind="returned"]')
    await expect(item).toHaveCount(1)
    await expect(item).toContainText('„ZABKA Z1234”')
    await expect(item).toContainText('wróciła z importem listy operacji i znowu liczy się w saldzie')
    // „Usuń”: deleted again, with „Cofnij”.
    await item.getByTestId('inbox-open').click()
    await expect.poll(async () => (await operations()).length).toBe(2)
    await expect(page.getByRole('button', { name: 'Cofnij', exact: true })).toBeVisible()
    await expect(item).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-2 (AF-9): plik konta zaimportowany na złe konto – import naprawczy usuwa kopie zamiast przenosić; konto wybrane po numerze rachunku', async () => {
  const { dir, buys, period } = week()
  // A history without the account's number (none remembered for mBank), then the list with it.
  const historia = join(dir, 'historia_rachunku.csv')
  const lista = join(dir, 'lista_operacji.csv')
  writeFileSync(historia, historiaCsv(buys, period, null))
  writeFileSync(lista, listaCsv(buys, period))
  const dataDir = join(dir, 'FinancialIntel')
  const userData = join(dir, 'userData')
  startedBudget(dataDir)
  const on = async (account: string) => (await records(dataDir, 'transactions')).filter((t) => t.accountId === account).length

  const { app, page, errors } = await launch({ dataDir, userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await importFile(app, page, historia)
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect.poll(() => on(MBANK_ACCOUNT_ID)).toBe(3)

    // The list onto the wallet by mistake: no number known for mBank – its rows are new there (copies).
    await importFile(app, page, lista)
    await page.getByTestId('import-account').selectOption(XTB_WALLET_ACCOUNT_ID)
    await expect(page.getByTestId('import-count-new')).toHaveText('3')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect.poll(() => on(XTB_WALLET_ACCOUNT_ID)).toBe(3)

    // The list again: the account its number went to is chosen; on mBank the copies are removed, not moved.
    await importFile(app, page, lista)
    await expect(page.getByTestId('import-account')).toHaveValue(XTB_WALLET_ACCOUNT_ID)
    await page.getByTestId('import-account').selectOption(MBANK_ACCOUNT_ID)
    await expect(page.getByTestId('import-copy')).toHaveCount(3)
    await expect(page.getByTestId('import-count-copies')).toHaveText('3')
    await expect(page.getByTestId('import-count-new')).toHaveText('0')
    await expect(page.getByTestId('import-elsewhere')).toHaveCount(0)
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect(page.getByTestId('import-done')).toContainText('usunięte kopie z innego konta: 3')
    await expect.poll(() => on(XTB_WALLET_ACCOUNT_ID)).toBe(0)
    expect(await on(MBANK_ACCOUNT_ID)).toBe(3)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
