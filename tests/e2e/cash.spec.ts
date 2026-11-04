import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { CASH_ACCOUNT_ID, CASH_CATEGORY_ID, MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { importDone, launch } from './app'
import { json, records } from './files'
import { listaCsv } from './mbank-csv'
import { seedFolder, zl } from './seed'

// AP-33 (D100 (1)): the cash is kept on the account „Gotówka” – an ATM withdrawal of the import is an own transfer
// mBank → Gotówka (no cost), the purchases paid with the cash are expenses from it (the quick entry, Operacje).
const FOOD = '01KDEFCAT00000000000000100'

async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

async function typeAmount(target: Locator, text: string) {
  await target.click()
  await target.fill(text)
  await target.press('Enter')
}

/** The budget from two months ago: mBank with an opening balance; `cash` – the account „Gotówka” as it is (archived – none). */
function seed(dataDir: string, cash: 'active' | 'archived') {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      household: { ...s.household, since: start, assignFrom: start },
      accounts: s.accounts.map((a) => (a.id === CASH_ACCOUNT_ID ? { ...a, archived: cash === 'archived' } : a))
    }),
    records: { balances: [{ date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) }] }
  })
  return { today }
}

function csvFile(root: string, today: string): string {
  const file = join(root, 'lista_operacji.csv')
  writeFileSync(file, listaCsv([], { from: addDays(today, -5), to: addDays(today, -1) }, null, [], [{ date: addDays(today, -2), amount: 200, name: 'EURONET TESTOWO' }]))
  return file
}

async function openFile(app: ElectronApplication, page: Page, file: string) {
  await page.keyboard.press('Control+3')
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as typeof dialog.showOpenDialog
  }, file)
  await page.getByTestId('import-pick').click()
  await expect(page.getByTestId('import-file')).toBeVisible()
  // The withdrawal's group out of its theme.
  await page.getByTestId('import-search').fill('euronet')
}

const atmGroup = (page: Page) => page.locator('[data-testid="import-group"]', { hasText: 'EURONET TESTOWO' }).first()

type Tx = { kind: string; accountId: string; counterAccountId: string | null; amount: number; bothSides?: boolean; categoryId: string | null; counterparty: string }

test('AP-33: wypłata z bankomatu – przelew mBank → Gotówka; zakupy gotówką z konta Gotówka (szybki wpis, Operacje); saldo Gotówki rośnie i maleje', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fi-cash-'))
  const dataDir = join(root, 'FinancialIntel')
  const userData = join(root, 'userData')
  const { today } = seed(dataDir, 'active')
  const file = csvFile(root, today)
  const { app, page, dataDir: dir, errors } = await launch({ dataDir, userData })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await openFile(app, page, file)
    // The budget has its cash: nothing to offer, the withdrawal is an own transfer onto it.
    await expect(page.getByTestId('import-cash-offer')).toHaveCount(0)
    await expect(atmGroup(page).getByTestId('import-group-kind')).toHaveValue(`transfer:${CASH_ACCOUNT_ID}`)
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect
      .poll(async () => ((await records(dir, 'transactions')) as unknown as Tx[]).map((t) => [t.kind, t.accountId, t.counterAccountId, t.amount, t.bothSides ?? false, t.categoryId]))
      .toEqual([['transfer', MBANK_ACCOUNT_ID, CASH_ACCOUNT_ID, -zl(200), true, null]])

    // A purchase paid with the cash – the quick entry, from the account „Gotówka”.
    const quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').fill('55,36')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-counterparty').fill('Piekarnia')
    await quick.getByTestId('quick-category').selectOption(FOOD)
    await quick.getByTestId('quick-account').selectOption({ label: 'Gotówka' })
    await quick.getByTestId('quick-save').click()
    // In the quiet hours (23:00–05:00) a note and a confirmation first (testy.md).
    const night = quick.getByTestId('quick-night-ok')
    const saved = async () => ((await records(dir, 'transactions')) as unknown as Tx[]).some((t) => t.counterparty === 'Piekarnia')
    await expect.poll(async () => (await night.isVisible().catch(() => false)) || (await saved())).toBe(true)
    if (await night.isVisible().catch(() => false)) {
      await quick.getByTestId('quick-log-note').fill('test nocny')
      await night.check()
      await quick.getByTestId('quick-save').click()
    }
    await expect
      .poll(async () => ((await records(dir, 'transactions')) as unknown as Tx[]).filter((t) => t.counterparty === 'Piekarnia').map((t) => [t.kind, t.accountId, t.amount, t.categoryId]))
      .toEqual([['expense', CASH_ACCOUNT_ID, -5536, FOOD]])

    // Operacje: another one from the account „Gotówka”.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await typeAmount(page.getByTestId('operation-amount'), '20')
    await page.getByTestId('operation-account').selectOption({ label: 'Gotówka' })
    await page.getByTestId('operation-counterparty').fill('Kiosk')
    await page.getByTestId('operation-counterparty').press('Enter')
    await expect
      .poll(async () => ((await records(dir, 'transactions')) as unknown as Tx[]).filter((t) => t.counterparty === 'Kiosk').map((t) => [t.kind, t.accountId, t.amount]))
      .toEqual([['expense', CASH_ACCOUNT_ID, -zl(20)]])

    // The cash no longer only goes down (OP sp. 7): +200 from the ATM, −55,36 and −20 spent.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    await expect(page.locator('[data-testid="account-row"][data-name="Gotówka"]').getByTestId('account-balance')).toHaveText('124,64 zł')
    await expect(page.locator('[data-testid="account-row"][data-name="mBank"]').getByTestId('account-balance')).toHaveText('4 800,00 zł')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-33: bez konta gotówki – propozycja w imporcie (nie po cichu), „Cofnij”; po przywróceniu konta wypłata to przelew', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fi-cash-offer-'))
  const dataDir = join(root, 'FinancialIntel')
  const userData = join(root, 'userData')
  const { today } = seed(dataDir, 'archived')
  const file = csvFile(root, today)
  const { app, page, dataDir: dir, errors } = await launch({ dataDir, userData })
  const cashAccount = async () => ((await json(join(dir, 'fi.json'))).settings.accounts as Array<{ id: string; archived: boolean }>).find((a) => a.id === CASH_ACCOUNT_ID)
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await openFile(app, page, file)
    // No cash account: the withdrawal is an expense „Gotówka” (the spec), the account offered – not made by itself.
    const offer = page.getByTestId('import-cash-offer')
    await expect(offer).toHaveAttribute('data-state', 'restore')
    await expect(offer).toContainText('1 wypłata z bankomatu w pliku')
    await expect(atmGroup(page).getByTestId('import-group-kind')).toHaveValue('expense')
    expect((await cashAccount())?.archived).toBe(true)

    await page.getByTestId('import-cash-add').click()
    await expect(offer).toHaveCount(0)
    await expect(atmGroup(page).getByTestId('import-group-kind')).toHaveValue(`transfer:${CASH_ACCOUNT_ID}`)
    await expect.poll(async () => (await cashAccount())?.archived).toBe(false)
    // „Cofnij”: back to the archive while no operation is on it – the offer and the expense again.
    await page.getByRole('status').filter({ hasText: 'wypłaty z bankomatu to przelewy własne' }).getByTestId('toast-action').click()
    await expect(offer).toHaveAttribute('data-state', 'restore')
    await expect(atmGroup(page).getByTestId('import-group-kind')).toHaveValue('expense')
    await expect.poll(async () => (await cashAccount())?.archived).toBe(true)

    await page.getByTestId('import-cash-add').click()
    await expect(atmGroup(page).getByTestId('import-group-kind')).toHaveValue(`transfer:${CASH_ACCOUNT_ID}`)
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect
      .poll(async () => ((await records(dir, 'transactions')) as unknown as Tx[]).map((t) => [t.kind, t.counterAccountId, t.amount, t.categoryId === CASH_CATEGORY_ID]))
      .toEqual([['transfer', CASH_ACCOUNT_ID, -zl(200), false]])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
