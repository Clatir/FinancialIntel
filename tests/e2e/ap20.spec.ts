import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { warsawNow } from '../../src/shared/calc/dates'
import { defaultCategoryId, MBANK_ACCOUNT_ID, XTB_WALLET_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

const visible = (app: ElectronApplication) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length)
const NOW = new Date().toISOString()
const bank = (key: string, over: Record<string, unknown>) => ({ format: 'mbank', key, description: '', counterparty: '', operation: 'ZAKUP PRZY UŻYCIU KARTY', category: '', pending: false, importedAt: NOW, ...over })

test('AP-20: szybki wpis – „plan” klawiszem (ok. 12 klawiszy), tagi z „#” przed zapisem, wyraźne usuwanie tagu, konto ostatnio użyte w folderze', async () => {
  const { date: today } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap20-')), 'FinancialIntel')
  seedFolder(dataDir, {
    // No quiet hours: the suite may run at night (the log would ask for a note and a confirmation).
    settings: (s) => ({ ...s, orders: { ...s.orders, quietHours: { from: '00:00', to: '00:00' } } }),
    // The last entry typed by hand was on Portfel XTB – on another computer (this one has never typed one).
    records: { transactions: [{ date: today, accountId: XTB_WALLET_ACCOUNT_ID, amount: -zl(5), counterparty: 'Kiosk', createdAt: NOW, updatedAt: NOW }] }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    let quick = await quickWindow(app, page)
    // SW sp. 8: the account of the folder's last entry, not the first one of the list.
    await expect(quick.getByTestId('quick-account')).toHaveValue(XTB_WALLET_ACCOUNT_ID)
    await expect(quick.getByTestId('quick-amount')).toBeFocused()

    // SW.36: „Orlen 250 z planem” – the keys counted (21 before: 10 × Tab to „plan”).
    let keys = 0
    const press = async (k: string) => {
      keys++
      await quick.keyboard.press(k)
    }
    const type = async (s: string) => {
      for (const ch of s) await press(ch)
    }
    await type('250')
    await press('Tab')
    await type('Orlen')
    await expect(quick.getByTestId('quick-impulse')).toHaveAttribute('data-state', 'none')
    await expect(quick.getByTestId('quick-impulse-keys')).toHaveText('Alt+P / Alt+I')
    await press('Alt+KeyP')
    await expect(quick.getByTestId('quick-impulse')).toHaveAttribute('data-state', 'plan')
    await press('Enter')
    await expect.poll(() => visible(app)).toBe(1)
    expect(keys).toBeLessThanOrEqual(12)
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'Orlen').map((t) => [t.amount, t.impulse, t.accountId]))
      .toEqual([[-zl(250), 'plan', XTB_WALLET_ACCOUNT_ID]])

    // Alt+I: an impulse; below the threshold nothing is marked (the log does not ask).
    quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').fill('300')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.keyboard.press('Alt+KeyP')
    await quick.keyboard.press('Alt+KeyI')
    await expect(quick.getByTestId('quick-impulse')).toHaveAttribute('data-state', 'impulse')
    await quick.getByTestId('quick-amount').fill('20')
    await quick.getByTestId('quick-amount').press('Tab')
    await expect(quick.getByTestId('quick-impulse')).toHaveCount(0)
    await quick.getByTestId('quick-counterparty').fill('Żabka')
    await quick.getByTestId('quick-counterparty').press('Enter')
    await expect.poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'Żabka').map((t) => [t.amount, t.impulse])).toEqual([[-zl(20), null]])

    // SW sp. 5: „#słowo” in the name or the note shown as a tag before saving; a tag's own clear „×”.
    quick = await quickWindow(app, page)
    await quick.getByTestId('quick-counterparty').fill('Konzum #wakacje')
    await quick.getByTestId('quick-note').fill('bilety #Remont')
    await expect(quick.getByTestId('quick-tag-hash')).toHaveCount(2)
    await expect(quick.getByTestId('quick-tag-hash').first()).toHaveText('#wakacje')
    await quick.getByTestId('quick-tags-input').fill('remont')
    await quick.getByTestId('quick-tags-input').press('Enter')
    // Typed in the field too: one tag, no second chip of the note's „#Remont”.
    await expect(quick.getByTestId('quick-tags-chip')).toHaveCount(1)
    await expect(quick.getByTestId('quick-tag-hash')).toHaveCount(1)
    const remove = quick.getByTestId('quick-tags-remove')
    await expect(remove).toHaveAttribute('title', 'Usuń tag #remont')
    expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(14)
    await remove.click()
    await expect(quick.getByTestId('quick-tags-chip')).toHaveCount(0)
    await expect(quick.getByTestId('quick-tag-hash')).toHaveCount(2)
    await quick.keyboard.press('Escape')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-20: Wywiad – treść dziennika, nazwy z banku czytelne, „połącz nazwy” jednej kawiarni (z „Cofnij”)', async () => {
  const { date: today } = warsawNow()
  const FOOD = defaultCategoryId(1)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap20-intel-')), 'FinancialIntel')
  seedFolder(dataDir, {
    records: {
      transactions: [
        { date: today, accountId: MBANK_ACCOUNT_ID, amount: -zl(12), counterparty: 'Mokka', categoryId: FOOD },
        { date: today, accountId: MBANK_ACCOUNT_ID, amount: -zl(15), counterparty: 'KAWIARNIA MOKKA', categoryId: FOOD, bank: bank('k:mokka', { counterparty: 'KAWIARNIA MOKKA', description: 'KAWIARNIA MOKKA' }) },
        {
          date: today,
          accountId: MBANK_ACCOUNT_ID,
          amount: -zl(200),
          title: `BANKOMAT EURONET 0412 /TESTOWO DATA TRANSAKCJI: ${today}`,
          bank: bank('k:atm', { operation: 'WYPŁATA W BANKOMACIE', description: 'BANKOMAT EURONET 0412' })
        },
        { date: today, accountId: MBANK_ACCOUNT_ID, amount: -zl(250), counterparty: 'Allegro', impulse: 'impulse', logNote: 'wyprzedaż' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+9')
    await expect(page.getByTestId('page-intel')).toBeVisible()
    // SW sp. 11: what the log says, not only its counts.
    await expect(page.getByTestId('intel-log-entry')).toHaveCount(1)
    await expect(page.getByTestId('intel-log-entry')).toContainText('„wyprzedaż” · Allegro · impuls')
    // WY.13: the ATM by its machine, without the bank's date; the bank's capitals as a person writes them.
    const names = async () => (await page.getByTestId('intel-target').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')))).sort()
    await expect.poll(names).toEqual(['Allegro', 'Bankomat Euronet 0412', 'Kawiarnia Mokka', 'Mokka'])
    // „Mokka” and „KAWIARNIA MOKKA” – one café (D78's merged names).
    await page.getByTestId('intel-targets-merge-open').click()
    await page.getByTestId('intel-targets-merge-from').selectOption({ label: 'Mokka' })
    await page.getByTestId('intel-targets-merge-into').selectOption({ label: 'Kawiarnia Mokka' })
    await page.getByTestId('intel-targets-merge-go').click()
    await expect.poll(names).toEqual(['Allegro', 'Bankomat Euronet 0412', 'Mokka'])
    await expect(page.locator('[data-testid="intel-target"][data-name="Mokka"]').getByTestId('intel-target-total')).toHaveText('27,00')
    await expect.poll(async () => Object.keys((await json(join(dir, 'fi.json'))).settings.import.aliases)).toHaveLength(1)
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click()
    await expect.poll(names).toEqual(['Allegro', 'Bankomat Euronet 0412', 'Kawiarnia Mokka', 'Mokka'])
    await expect.poll(async () => Object.keys((await json(join(dir, 'fi.json'))).settings.import.aliases)).toHaveLength(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
