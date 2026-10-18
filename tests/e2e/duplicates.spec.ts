import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { launch } from './app'
import { records } from './files'

const FIXTURE = resolve('tests', 'fixtures', 'mbank', 'lista_operacji.csv')

/** A hand-typed expense in Operacje (Ctrl+N). */
async function typeExpense(page: Page, amount: string, counterparty: string, date: string): Promise<void> {
  await page.keyboard.press('Control+2')
  await page.keyboard.press('Control+n')
  const field = page.getByTestId('operation-amount')
  await field.fill(amount)
  await field.press('Enter')
  await page.getByTestId('operation-counterparty').fill(counterparty)
  await page.getByTestId('operation-counterparty').press('Enter')
  await page.getByTestId('operation-date').fill(date)
  await page.getByTestId('operation-date').press('Enter')
}

test('Duplikaty (D77): wpis ręczny pod inną nazwą łączony przy imporcie, wpis dopisany po imporcie scalany z „Cofnij”', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const operations = () => records(dataDir, 'transactions')

    // An evening entry under another name than the bank's (Bolt): the import joins it – no second operation.
    await typeExpense(page, '39,38', 'Taksówka do domu', '15.10.2025')
    await expect.poll(async () => (await operations()).length).toBe(1)
    await page.keyboard.press('Control+3')
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
    }, FIXTURE)
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-count-merge')).toHaveText('1')
    await expect(page.getByTestId('import-merge-loose')).toContainText('inna nazwa')
    await page.getByTestId('import-run').click()
    await expect(page.getByTestId('import-done')).toContainText('połączone z wpisami: 1')
    await expect.poll(async () => (await operations()).length, { timeout: 20_000 }).toBe(269)
    const taxi = (await operations()).find((t) => t.counterparty === 'Taksówka do domu')!
    expect(taxi).toMatchObject({ amount: -3938, date: '2025-10-16' })
    expect((taxi.bank as { counterparty: string }).counterparty).toBe('Bolt')

    // Typed after the import: the same Lidl purchase twice – merged on the import screen, with „Cofnij”.
    await typeExpense(page, '163,55', 'Lidl', '03.10.2025')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await expect.poll(async () => (await operations()).length).toBe(270)
    await expect(page.getByTestId('operations-duplicates')).toHaveText('Możliwe duplikaty: 1')
    await page.getByTestId('operations-duplicates').click()
    const group = page.getByTestId('duplicate-group')
    await expect(group).toHaveCount(1)
    await expect(group.getByTestId('duplicate-keep')).toContainText('wpisana ręcznie')
    await expect(group.getByTestId('duplicate-copy')).toContainText('z banku')
    await page.getByTestId('duplicates-merge').click()
    await expect.poll(async () => (await operations()).length).toBe(269)
    const lidl = (await operations()).filter((t) => /lidl/i.test(t.counterparty as string) && t.amount === -16355)
    expect(lidl).toHaveLength(1)
    expect(lidl[0]).toMatchObject({ counterparty: 'Lidl', categoryId: '01KDEFCAT00000000000000101' })
    expect((lidl[0]!.bank as { counterparty: string }).counterparty).toBe('LIDL')
    await expect(page.getByTestId('duplicates')).toHaveCount(0)
    await page.getByRole('button', { name: 'Cofnij' }).click()
    await expect.poll(async () => (await operations()).length).toBe(270)
    // The kept entry is as it was before the merge (no bank row), the copy is back.
    await expect.poll(async () => (await operations()).find((t) => t.counterparty === 'Lidl')?.bank ?? null).toBeNull()

    // „To nie duplikat”: remembered, not offered again.
    await expect(page.getByTestId('duplicate-group')).toHaveCount(1)
    await page.getByTestId('duplicate-dismiss').click()
    await expect(page.getByTestId('duplicates')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
