import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const HOUSE = '01KDEFMEM00000000000000001'

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

test('Ctrl+N z każdego ekranu, szkic formularza po zmianie ekranu, szybki wpis: podział, potem wpływ (1.6.4)', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ops-fixes-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(5000) }],
      months: [{ month: addMonths(month, -1), salary: zl(3000), envelopes: {} }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    // Ctrl+N on the bridge (B64): a new operation in Operations.
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+n')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-editor-title')).toHaveText('Nowa operacja')

    // „Nowa pożyczka” keeps what was typed while another screen is shown (N36).
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    await page.getByTestId('loan-name').fill('Pożyczka dla Ani')
    await page.keyboard.press('Control+5')
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('loan-name')).toHaveValue('Pożyczka dla Ani')

    // The quick entry: a receipt split, then „Wpływ” – saved as money in, without the receipt's lines (B118).
    const quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').fill('250')
    await quick.getByTestId('quick-split').click()
    await expect(quick.getByTestId('quick-lines')).toBeVisible()
    await quick.getByRole('radio', { name: 'Wpływ' }).click()
    await expect(quick.getByTestId('quick-lines')).toHaveCount(0)
    await quick.getByTestId('quick-counterparty').fill('Zwrot za bilety')
    await quick.getByTestId('quick-save').click()
    await expect.poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'Zwrot za bilety').map((t) => [t.kind, t.amount, (t.splits as unknown[]).length])).toEqual([['income', zl(250), 0]])

    // A household member archived while the quick entry is open (B125): the window says so, the choice is made again.
    const again = await quickWindow(app, page)
    await again.getByRole('radio', { name: 'Za domownika' }).click()
    await expect(again.getByTestId('quick-financer')).toHaveValue(HOUSE)
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-household').click()
    await page.locator('[data-testid="member-row"][data-name="Dom"]').getByTestId('member-archived').click()
    await expect(again.getByTestId('quick-message')).toContainText('Lista domowników się zmieniła – sprawdź wybór.')
    await expect(again.getByTestId('quick-financer')).toHaveValue('')
    // Nothing saved for the member chosen before: the window asks for one.
    await again.getByTestId('quick-amount').fill('15')
    await again.getByTestId('quick-save').click()
    await expect(again.getByTestId('quick-message')).toContainText('Wybierz domownika')
    expect((await records(dir, 'transactions')).filter((t) => t.amount === -zl(15))).toEqual([])
    // A member the folder does not have, sent by a window with older lists: refused by the main window.
    const stranger = { id: '01KQ0000000000000000000ZZZ', kind: 'refundable', amount: 1500, categoryId: null, accountId: ACC, date: warsawNow().date, time: null, counterparty: 'Obcy', note: '', impulse: null, logNote: '', household: false, memberId: '01KDEFMEM0000000000000ZZZZ', advance: false, splits: [] }
    await again.evaluate(async (draft) => {
      const fi = (globalThis as unknown as { fi: { quickAdd(d: unknown): Promise<void> } }).fi
      await fi.quickAdd(draft)
    }, stranger)
    await expect(again.getByTestId('quick-message')).toContainText('Lista domowników się zmieniła – wybierz domownika ponownie.')
    expect((await records(dir, 'transactions')).filter((t) => t.counterparty === 'Obcy')).toEqual([])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
