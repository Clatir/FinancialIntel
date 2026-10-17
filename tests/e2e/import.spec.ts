import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { launch } from './app'

const FIXTURE = resolve('tests', 'fixtures', 'mbank', 'lista_operacji.csv')

/** The file dialog of the main process answers with `path` (a dialog cannot be clicked in a test). */
async function answerFileDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

async function operations(dataDir: string): Promise<Array<Record<string, unknown>>> {
  const root = join(dataDir, 'transactions')
  const out: Array<Record<string, unknown>> = []
  for (const y of await fs.readdir(root).catch(() => []))
    for (const f of await fs.readdir(join(root, y)).catch(() => [])) {
      // A file deleted between the listing and the read (an operation being removed) is gone.
      const text = await fs.readFile(join(root, y, f), 'utf8').catch(() => null)
      if (text) out.push(JSON.parse(text))
    }
  return out
}

const group = (page: Page, label: string) => page.locator(`[data-testid="import-group"][data-label="${label}"]`).first()

test('Import CSV z mBanku: dopasowanie wpisu ręcznego, kategoryzacja grupami, reguły, kopia, ponowny import, saldo', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()

    // An evening entry typed by hand, the bank books it a day later (03.10).
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    const amount = page.getByTestId('operation-amount')
    await amount.fill('16,16')
    await amount.press('Enter')
    await page.getByTestId('operation-counterparty').fill('Biedronka')
    await page.getByTestId('operation-date').fill('02.10.2025')
    await page.getByTestId('operation-date').press('Enter')
    await page.getByTestId('operation-time').fill('18:40')
    await page.getByTestId('operation-time').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await expect.poll(async () => (await operations(dataDir)).map((t) => [t.date, t.time, t.amount])).toEqual([['2025-10-02', '18:40', -1616]])

    // The file.
    await page.keyboard.press('Control+3')
    await expect(page.getByTestId('page-import')).toBeVisible()
    await answerFileDialog(app, FIXTURE)
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-file')).toContainText('269 operacji')
    await expect(page.getByTestId('import-file')).toContainText('JAN KAPITAN')
    await expect(page.getByTestId('import-count-new')).toHaveText('268')
    await expect(page.getByTestId('import-count-merge')).toHaveText('1')
    await expect(page.getByTestId('import-merge')).toContainText('Biedronka')

    // Recognized by the app: XTB, own transfers; the bank's categories only hints.
    await expect(group(page, 'xtb.com').getByTestId('import-group-kind')).toHaveValue('trading')
    await expect(group(page, 'JAN KAPITAN').getByTestId('import-group-kind')).toHaveValue('transfer')
    await expect(group(page, 'Bolt').getByTestId('import-group-category')).toHaveValue('')
    await expect(group(page, 'Bolt').getByTestId('import-group-hint')).toHaveText('Auto?')

    // Decisions by group: Bolt → Auto · parking i opłaty would be wrong – the user picks Auto; Tomasz is a household member.
    await group(page, 'Bolt').getByTestId('import-group-category').selectOption({ label: 'Auto' })
    await expect(group(page, 'Bolt').getByTestId('import-group-remember')).toBeChecked()
    await group(page, 'TOMASZ xxx').getByTestId('import-group-kind').selectOption('household')
    await page.getByTestId('import-accept-hints').click()
    await expect(group(page, 'LIDL').getByTestId('import-group-category')).not.toHaveValue('')
    // The bank's hints are no decision of the user: not remembered unless ticked (D68).
    await expect(group(page, 'LIDL').getByTestId('import-group-remember')).not.toBeChecked()
    await page.screenshot({ path: join('test-results', 'screens', '06-import.png') })

    await page.getByTestId('import-run').click()
    await expect(page.getByTestId('import-done')).toContainText('Nowe: 268')
    await expect(page.getByTestId('import-done')).toContainText('połączone z wpisami: 1')
    await expect.poll(async () => (await operations(dataDir)).length, { timeout: 20_000 }).toBe(269)
    const ops = await operations(dataDir)
    const merged = ops.find((t) => t.counterparty === 'Biedronka' && t.date === '2025-10-03' && t.amount === -1616)!
    expect(merged.time).toBe('18:40')
    expect((merged.bank as { description: string }).description).toContain('Biedronka')
    expect(ops.filter((t) => t.counterparty === 'Bolt').every((t) => typeof t.categoryId === 'string')).toBe(true)
    expect(ops.filter((t) => t.kind === 'trading')).toHaveLength(26)
    const fi = JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8'))
    expect(fi.settings.import.rules.map((r: { match: string }) => r.match)).toEqual(expect.arrayContaining(['bolt', 'tomaszxxx']))
    expect(fi.settings.import.rules.map((r: { match: string }) => r.match)).not.toContain('lidl')
    expect(fi.settings.import.ownNames).toEqual(['JAN KAPITAN'])
    expect((await fs.readdir(join(dataDir, 'backups', 'pre-import'))).length).toBe(1)
    await expect(page.getByTestId('import-to-operations')).toBeVisible()

    // One imported operation deleted in Operacje…
    await page.keyboard.press('Control+2')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operations-search').fill('sklep remontowy')
    await page.getByTestId('operation-row').first().click()
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await expect.poll(async () => (await operations(dataDir)).length).toBe(268)
    await page.getByTestId('operations-search').fill('')

    // …and the same file again (the next import overlaps): nothing new, the deleted one stays out.
    await page.keyboard.press('Control+3')
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-count-known')).toHaveText('268')
    await expect(page.getByTestId('import-count-deleted')).toHaveText('1')
    await expect(page.getByTestId('import-run')).toBeDisabled()
    await page.getByTestId('import-close').click()

    // The balance from the bank: a difference becomes a correction to explain.
    const row = page.locator('[data-testid="balance-row"][data-name="mBank"]')
    await row.getByTestId('balance-input').fill('1000')
    await row.getByTestId('balance-input').press('Enter')
    await row.getByTestId('balance-confirm').click()
    await expect.poll(async () => (await fs.readdir(join(dataDir, 'balances'), { recursive: true })).filter((f) => String(f).endsWith('.json')).length).toBe(1)
    await row.getByTestId('balance-input').fill('900')
    await row.getByTestId('balance-input').press('Enter')
    await row.getByTestId('balance-confirm').click()
    await expect.poll(async () => (await operations(dataDir)).filter((t) => t.kind === 'correction').map((t) => t.amount)).toEqual([-10000])

    // The operations list shows them; a category changed there teaches the import too.
    await page.keyboard.press('Control+2')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await expect(page.getByTestId('operations-sums')).toContainText('269')
    await page.getByTestId('operations-search').fill('koleo')
    await page.getByTestId('operation-row').first().click()
    await expect(page.getByTestId('operation-bank')).toContainText('KOLEO')
    // The bank's hint was accepted, not remembered: Operacje offers to remember it.
    await expect(page.getByTestId('operation-remember')).toHaveCount(1)
    await page.getByTestId('operation-category').selectOption({ label: 'Auto · parking i opłaty' })
    await page.getByTestId('operation-remember').click()
    await expect(page.getByTestId('operation-remember')).toHaveCount(0)
    await expect
      .poll(async () => JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8')).settings.import.rules.find((r: { match: string; direction: string }) => r.match === 'koleo' && r.direction === 'out')?.categoryId)
      .toBe('01KDEFCAT00000000000000304')

    // Settings → Import: the rules and the holder's names.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await expect(page.getByTestId('own-name')).toHaveText([/JAN KAPITAN/])
    // Bolt and Tomasz from the import, KOLEO from Operacje; the accepted hints are no rules.
    await expect(page.getByTestId('import-rule')).toHaveCount(3)
    await page.getByTestId('import-rule').first().getByTestId('import-rule-delete').click()
    await expect(page.getByTestId('import-rule')).toHaveCount(2)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
