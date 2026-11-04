// AP-8 (1.15.5, grupa N1): leaving a screen never loses what was typed – an edit waiting for „Zmień mimo to” (DA.43),
// the start wizard's answers (KR.13, KR.31), the balance typed from the bank (SA.4).
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const WALLET = '01KDEFACC00000000000000002'

/** The questions of the main process (`dialog.showMessageBoxSync`) taken down and answered „Anuluj”. */
const catchQuestions = (app: ElectronApplication) =>
  app.evaluate(({ dialog }) => {
    const g = globalThis as { __questions?: Array<{ title?: string; message?: string }> }
    g.__questions = []
    dialog.showMessageBoxSync = ((...args: unknown[]) => {
      const o = (args.length > 1 ? args[1] : args[0]) as { title?: string; message?: string }
      g.__questions!.push({ title: o.title, message: o.message })
      return 0
    }) as typeof dialog.showMessageBoxSync
  })
const questions = (app: ElectronApplication) => app.evaluate(() => (globalThis as { __questions?: Array<{ title?: string; message?: string }> }).__questions ?? [])

async function openByPalette(page: Page, query: string, name: string): Promise<void> {
  await page.keyboard.press('Control+k')
  await page.getByTestId('palette-input').fill(query)
  await expect(page.getByTestId('palette-operation').first()).toContainText(name)
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('palette')).toHaveCount(0)
  await expect(page.getByTestId('operation-counterparty')).toHaveValue(name)
}

test('zmiana czekająca na „Zmień mimo to”: pytanie zostaje po opuszczeniu ekranu, zamknięcie podaje prawdziwą przyczynę (AF-3)', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-guard-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [
        { date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) },
        { date: start, accountId: WALLET, kind: 'opening', amount: 0 },
        { date: addDays(start, 5), accountId: MBANK, kind: 'confirmation', amount: zl(4955) }
      ],
      months: [{ month: addMonths(month, -1), salary: zl(3000), envelopes: {} }],
      transactions: [{ date: addDays(start, 1), accountId: MBANK, amount: -zl(45), counterparty: 'Sklep Okresowy' }]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  const amountOnDisk = async () => (await records(dataDir, 'transactions')).find((t) => t.counterparty === 'Sklep Okresowy')?.amount
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await openByPalette(page, 'sklep okresowy', 'Sklep Okresowy')
    // Typed, the field not left, and another screen (Ctrl+1): the question comes there – the change is not dropped.
    const amount = page.getByTestId('operation-amount')
    await amount.click()
    await amount.fill('50')
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('operation-guard')).toContainText('potwierdzone saldo konta mBank')
    await expect(page.getByTestId('operation-guard')).toContainText('Sklep Okresowy')
    await page.getByTestId('operation-guard-confirm').click()
    await expect.poll(amountOnDisk).toBe(-zl(50))

    // Typed and waiting for the answer at the window's close: the question says so, „Anuluj” keeps the app and the question.
    await openByPalette(page, 'sklep okresowy', 'Sklep Okresowy')
    await amount.click()
    await amount.fill('60')
    await amount.press('Tab')
    await expect(page.getByTestId('operation-guard')).toBeVisible()
    await catchQuestions(app)
    await app.evaluate(({ app: a }) => a.quit())
    await expect.poll(async () => (await questions(app)).length).toBe(1)
    expect((await questions(app))[0]).toMatchObject({ title: 'Niezapisana zmiana operacji' })
    await expect(page.getByTestId('operation-guard')).toBeVisible()
    await page.getByTestId('operation-guard-confirm').click()
    await expect.poll(amountOnDisk).toBe(-zl(60))
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('kreator: „Wróć do kreatora” z odpowiedziami, także po ponownym uruchomieniu (AF-11); wpisane saldo z banku przeżywa zmianę ekranu (SA.4)', async () => {
  const first = await launch()
  const { dataDir, userData } = first
  try {
    const page = first.page
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.getByTestId('banner-wizard-start').click()
    await page.getByTestId('wizard-balance').first().fill('10000')
    await page.getByTestId('wizard-balance').first().press('Enter')
    await page.getByTestId('wizard-next').click()
    await page.getByTestId('wizard-next').click()
    await page.getByTestId('wizard-salary').fill('5000')
    await page.getByTestId('wizard-salary').press('Enter')
    // Another screen, then the banner: back where it was, every answer kept.
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('banner-wizard-start')).toHaveText('Wróć do kreatora')
    await page.getByTestId('banner-wizard-start').click()
    await expect(page.getByTestId('wizard-salary')).toHaveValue('5 000,00')
    await page.getByTestId('wizard-back').click()
    await page.getByTestId('wizard-back').click()
    await expect(page.getByTestId('wizard-balance').first()).toHaveValue('10 000,00')

    // Settings → Konta: the balance typed from the bank stays when the screen changes.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    const mbank = page.locator('[data-testid="account-row"][data-name="mBank"]')
    const bank = mbank.getByTestId('account-confirm-amount')
    await bank.click()
    await bank.fill('1234,56')
    await bank.press('Enter')
    await page.keyboard.press('Control+1')
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    await expect(bank).toHaveValue('1 234,56')
  } finally {
    await first.app.close()
  }
  // A restart: the wizard comes back with its answers – nothing written to the folder before „Uruchom budżet”.
  expect(await records(dataDir, 'balances')).toEqual([])
  const second = await launch({ dataDir, userData })
  try {
    const page = second.page
    await expect(page.getByTestId('banner-wizard-start')).toHaveText('Wróć do kreatora')
    await page.getByTestId('banner-wizard-start').click()
    // The step it was left at (1), every answer kept.
    await expect(page.getByTestId('wizard-balance').first()).toHaveValue('10 000,00')
    await page.getByTestId('wizard-next').click()
    await page.getByTestId('wizard-next').click()
    await expect(page.getByTestId('wizard-salary')).toHaveValue('5 000,00')
  } finally {
    await second.app.close()
  }
})
