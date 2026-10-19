import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { launch } from './app'
import { records } from './files'

/** Every operation file of the folder, parsed. */
const operations = (dataDir: string) => records(dataDir, 'transactions')

async function typeAmount(page: Page, target: string | Locator, text: string) {
  const field = typeof target === 'string' ? page.getByTestId(target) : target
  await field.click()
  await field.fill(text)
  await field.press('Enter')
}

test('Operacje: dodanie, kolory kwot, podział paragonu, wyszukiwanie, historia i usunięcie z „Cofnij”', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operations-list')).toContainText('Brak operacji')

    // A new expense: a draft until the first change (leaving it untouched writes nothing).
    await page.keyboard.press('Control+n')
    await expect(page.getByTestId('operation-editor-title')).toHaveText('Nowa operacja')
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    expect(await operations(dataDir)).toEqual([])
    await typeAmount(page, 'operation-amount', '45,99')
    await page.getByTestId('operation-counterparty').fill('Biedronka')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await expect.poll(async () => (await operations(dataDir)).map((t) => [t.amount, t.counterparty, t.kind])).toEqual([[-4599, 'Biedronka', 'expense']])
    const cell = page.getByTestId('operation-amount-cell').first()
    await expect(cell).toHaveText('−45,99')
    await expect(cell).not.toHaveClass(/text-up|text-down/)

    // Income: green with „+” (D68).
    await page.getByTestId('operation-new').click()
    await page.getByRole('radio', { name: 'Wpływ' }).click()
    await typeAmount(page, 'operation-amount', '200')
    await page.getByTestId('operation-counterparty').fill('Domownik')
    await page.getByTestId('operation-counterparty').press('Enter')
    await expect(page.locator('[data-testid="operation-row"]', { hasText: /Domownik/ }).getByTestId('operation-amount-cell')).toHaveText('+200,00')
    await expect(page.locator('[data-testid="operation-row"]', { hasText: /Domownik/ }).getByTestId('operation-amount-cell')).toHaveClass(/text-up/)

    // A split receipt: the own part and a household member's part (D80).
    await page.locator('[data-testid="operation-row"]', { hasText: 'Biedronka' }).click()
    await page.getByTestId('operation-split').click()
    await expect(page.getByTestId('split-line')).toHaveCount(2)
    await typeAmount(page, page.getByTestId('split-amount').nth(0), '35,99')
    await typeAmount(page, page.getByTestId('split-amount').nth(1), '10')
    await page.getByTestId('split-financer').nth(1).selectOption({ label: 'Dom' })
    await expect(page.getByTestId('split-rest')).toHaveCount(0)
    await expect
      .poll(async () => ((await operations(dataDir)).find((t) => t.counterparty === 'Biedronka')?.splits as Array<{ amount: number; refundable: boolean }>)?.map((s) => [s.amount, s.refundable]))
      .toEqual([
        [-3599, false],
        [-1000, true]
      ])
    await expect(page.locator('[data-testid="operation-row"]', { hasText: 'Biedronka' })).toContainText('domownik')

    // Search without Polish letters, by amount; the sums follow the list.
    await page.getByTestId('operations-search').fill('bied')
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await page.getByTestId('operations-search').fill('200')
    await expect(page.getByTestId('operation-row')).toHaveText([/Domownik/])
    await page.getByTestId('operations-search').fill('')
    await expect(page.getByTestId('operations-outflow')).toHaveText('−45,99 zł')

    // An edit keeps the previous version in the history.
    await page.locator('[data-testid="operation-row"]', { hasText: /Domownik/ }).click()
    await typeAmount(page, 'operation-amount', '250')
    await expect.poll(async () => (await operations(dataDir)).find((t) => t.counterparty === 'Domownik')?.amount).toBe(25000)
    // Esc throws a typed date, time and name away (B24); a text is saved on leaving its field, never at every key (W2).
    const saved = (await operations(dataDir)).find((t) => t.counterparty === 'Domownik')!
    for (const [id, typed] of [['operation-date', '01.01.2020'], ['operation-time', '23:59'], ['operation-counterparty', 'Ktoś inny']] as const) {
      const field = page.getByTestId(id)
      const before = await field.inputValue()
      await field.fill(typed)
      await field.press('Escape')
      await expect(field).toHaveValue(before)
    }
    expect((await operations(dataDir)).find((t) => t.id === saved.id)).toMatchObject({ date: saved.date, time: saved.time, counterparty: 'Domownik' })
    await page.getByTestId('history-open').click()
    await expect(page.getByTestId('history-changes')).toContainText('Kwota')
    await page.keyboard.press('Escape')

    // Delete with „Cofnij”.
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await expect(page.getByTestId('operation-row')).toHaveCount(1)
    await expect.poll(async () => (await operations(dataDir)).length).toBe(1)
    await page.getByRole('button', { name: 'Cofnij' }).click()
    await expect(page.getByTestId('operation-row')).toHaveCount(2)
    await expect.poll(async () => (await operations(dataDir)).map((t) => t.amount).sort()).toEqual([-4599, 25000])
    await page.locator('[data-testid="operation-row"]', { hasText: 'Biedronka' }).click()
    await page.screenshot({ path: join('test-results', 'screens', '03-operacje.png') })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Ustawienia: konta z saldem otwarcia i potwierdzeniem (korekta), kategorie', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    const mbank = page.locator('[data-testid="account-row"][data-name="mBank"]')
    await expect(mbank).toBeVisible()
    await expect(page.locator('[data-testid="account-row"][data-name="Portfel XTB"]')).toBeVisible()

    // Without an opening: the balance from the bank sets it.
    await typeAmount(page, mbank.getByTestId('account-confirm-amount'), '1 250,50')
    await mbank.getByTestId('account-confirm').click()
    await expect(mbank.getByTestId('account-balance')).toHaveText('1 250,50 zł')
    await expect(mbank.getByTestId('account-opening')).toHaveValue('1\u00a0250,50')

    // A different balance later: asked first whether today's operations are written (B83), then a correction to
    // explain (the discrepancy in the hold).
    await typeAmount(page, mbank.getByTestId('account-confirm-amount'), '1200')
    await mbank.getByTestId('account-confirm').click()
    await expect(mbank.getByTestId('confirm-ask')).toContainText('−50,50 zł')
    await mbank.getByTestId('confirm-ask-later').click()
    await expect(mbank.getByTestId('confirm-ask')).toHaveCount(0)
    expect(await operations(dataDir)).toEqual([])
    // The typed balance stays for the next „Potwierdź saldo” – never typed again from the bank's app.
    await expect(mbank.getByTestId('account-confirm-amount')).toHaveValue('1\u00a0200,00')
    await mbank.getByTestId('account-confirm').click()
    await mbank.getByTestId('confirm-ask-yes').click()
    await expect(mbank.getByTestId('account-confirm-amount')).toHaveValue('')
    await expect(mbank.getByTestId('account-balance')).toHaveText('1 200,00 zł')
    await page.screenshot({ path: join('test-results', 'screens', '05-konta.png') })
    await expect
      .poll(async () => (await operations(dataDir)).map((t) => [t.kind, t.amount]))
      .toEqual([['correction', -5050]])

    // Categories: rename, an envelope, a subcategory.
    await page.getByTestId('settings-tab-categories').click()
    const auto = page.locator('[data-testid="category-row"][data-name="Auto"]')
    await auto.getByTestId('category-name').fill('Auto i transport')
    await auto.getByTestId('category-name').press('Enter')
    const renamed = page.locator('[data-testid="category-row"][data-name="Auto i transport"]')
    await renamed.getByTestId('category-add-sub').click()
    // paliwo, serwis, ubezpieczenie, parking i opłaty, przejazdy (D69) + the new one.
    await expect(renamed.getByTestId('subcategory')).toHaveCount(6)
    await page.screenshot({ path: join('test-results', 'screens', '04-kategorie.png') })
    await expect
      .poll(async () => JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8')).settings.categories.filter((c: { name: string }) => c.name === 'Auto i transport' || c.name === 'nowa').length)
      .toBe(2)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Operacje: wpisana kwota nie ginie przy Ctrl+N, kierunek wybrany przed kwotą zostaje', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    // Typed, the field not left yet: the next Ctrl+N applies it first (the entry is no longer untouched).
    await page.getByTestId('operation-amount').fill('12')
    await page.keyboard.press('Control+n')
    await expect.poll(async () => (await operations(dataDir)).map((t) => t.amount)).toEqual([-1200])

    // A product return chosen before its amount: saved as money in.
    await page.getByRole('radio', { name: 'zwrot towaru' }).click()
    await typeAmount(page, 'operation-amount', '7,75')
    await expect.poll(async () => (await operations(dataDir)).map((t) => t.amount).sort((a, b) => Number(a) - Number(b))).toEqual([-1200, 775])

    // Leaving the screen while typing keeps the value too.
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-amount').fill('3')
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect.poll(async () => (await operations(dataDir)).length).toBe(3)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
