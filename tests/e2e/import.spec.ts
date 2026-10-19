import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { launch } from './app'
import { records } from './files'

const FIXTURE = resolve('tests', 'fixtures', 'mbank', 'lista_operacji.csv')

/** The file dialog of the main process answers with `path` (a dialog cannot be clicked in a test). */
async function answerFileDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

const operations = (dataDir: string) => records(dataDir, 'transactions')

const group = (page: Page, label: string) => page.locator(`[data-testid="import-group"][data-label="${label}"]`).first()
/** A group by its brand and direction (`ImportGroup.group` = brand|direction|proposal). */
const brandGroup = (page: Page, brand: string, direction: 'in' | 'out') => page.locator(`[data-testid="import-group"][data-group^="${brand}|${direction}|"]`).first()

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
    await page.getByTestId('operation-counterparty').press('Enter')
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

    // Themes (D75): the undecided first, the recognized to check, the user's rules done.
    await expect(page.getByTestId('import-section-todo')).toBeVisible()
    await expect(page.getByTestId('import-section-check')).toBeVisible()
    await expect(page.getByTestId('import-section-done')).toBeVisible()
    const search = page.getByTestId('import-search')

    // Recognized by the app: XTB, own transfers; a chain of the dictionary (Orlen); the starter rules (D69).
    await search.fill('xtb')
    await expect(group(page, 'xtb.com').getByTestId('import-group-kind')).toHaveValue('trading')
    await search.fill('jan kapitan')
    await expect(group(page, 'JAN KAPITAN').getByTestId('import-group-kind')).toHaveValue('transfer')
    await search.fill('orlen')
    await expect(group(page, 'Orlen').getByTestId('import-group-category')).toHaveValue('01KDEFCAT00000000000000301')
    await search.fill('bolt')
    await expect(group(page, 'Bolt').getByTestId('import-group-category')).toHaveValue('01KDEFCAT00000000000000600')
    await search.fill('koleo')
    await expect(brandGroup(page, 'koleo', 'out').getByTestId('import-group-category')).toHaveValue('01KDEFCAT00000000000000305')

    // Decisions by group: the user narrows Bolt to „wyjścia” (the starter rule learns it); Tomasz is a household member –
    // „+ domownik” adds him by his name in the bank (D80) and makes his transfers his money; the rest beyond his debt is
    // the user's answer (N85).
    await search.fill('bolt')
    await group(page, 'Bolt').getByTestId('import-group-category').selectOption({ label: 'Rozrywka i hobby · wyjścia' })
    await expect(group(page, 'Bolt').getByTestId('import-group-remember')).toBeChecked()
    await search.fill('tomasz')
    await brandGroup(page, 'tomaszxxx', 'in').getByTestId('import-group-new-member').click()
    await expect(brandGroup(page, 'tomaszxxx', 'in').getByTestId('import-group-kind')).toHaveValue(/^household:[0-9A-Z]{26}:income$/)
    await expect(brandGroup(page, 'tomaszxxx', 'in').getByTestId('import-group-new-member')).toHaveCount(0)
    // The rest beyond his debt is still a question (N85) – answered by the user: „przychód”.
    await expect(brandGroup(page, 'tomaszxxx', 'in').getByText('zaliczka czy przychód?')).toBeVisible()
    const tomaszKind = brandGroup(page, 'tomaszxxx', 'in').getByTestId('import-group-kind')
    await tomaszKind.selectOption(await tomaszKind.inputValue())
    await expect(brandGroup(page, 'tomaszxxx', 'in').getByText('zaliczka czy przychód?')).toHaveCount(0)
    await search.fill('')

    // The bank's hints for whole themes – no decision of the user, not remembered (D68); then the sure ones in one click.
    await page.getByTestId('import-accept-hints').click()
    await page.getByTestId('import-accept-sure').click()
    await expect(page.getByTestId('import-section-check')).toHaveCount(0)
    await search.fill('allegro')
    await expect(group(page, 'Allegro').getByTestId('import-group-category')).toHaveValue('01KDEFCAT00000000000000800')
    await expect(page.locator('[data-testid="import-theme"]').filter({ has: group(page, 'Allegro') }).getByTestId('import-theme-remember')).not.toBeChecked()

    // Search, tick, one decision for all of them: Chess.com → hobby; the station's toilets left out of this import.
    await search.fill('chess')
    await page.getByTestId('import-select-visible').click()
    await page.getByTestId('import-bulk-kind').selectOption('expense')
    await page.getByTestId('import-bulk-category').selectOption({ label: 'Rozrywka i hobby · hobby' })
    // „Według przyjętego klucza”: the search kept as a keyword for the next imports.
    await page.getByTestId('import-bulk-keyword').check()
    await page.getByTestId('import-bulk-apply').click()
    await expect(group(page, 'Chess.com 800-318-2827').getByTestId('import-group-category')).toHaveValue('01KDEFCAT00000000000000602')
    await page.getByTestId('import-bulk-clear').click()
    await search.fill('toalety')
    await page.getByTestId('import-select-visible').click()
    await expect(page.getByTestId('import-bulk-count')).toContainText('3 operacje')
    await page.getByTestId('import-bulk-skip').click()
    await page.getByTestId('import-bulk-clear').click()
    await expect(page.getByTestId('import-count-excluded')).toHaveText('3')
    await expect(page.getByTestId('import-count-new')).toHaveText('265')

    // A keyword of the user: the vending machines („AUTOMAT…”) are snacks – the open file is planned again.
    await page.getByTestId('keyword-input').fill('automat')
    await page.getByTestId('keyword-category').selectOption({ label: 'Jedzenie · kawa i przekąski' })
    await page.getByTestId('keyword-add').click()
    await search.fill('automat')
    await expect(brandGroup(page, 'automatspec', 'out').getByTestId('import-group-category')).toHaveValue('01KDEFCAT00000000000000103')
    await search.fill('')
    await page.screenshot({ path: join('test-results', 'screens', '06-import.png') })

    await page.getByTestId('import-run').click()
    await expect(page.getByTestId('import-done')).toContainText('Nowe: 265')
    await expect(page.getByTestId('import-done')).toContainText('połączone z wpisami: 1')
    await expect(page.getByTestId('import-done')).toContainText('nie importowane (Twój wybór): 3')
    await expect.poll(async () => (await operations(dataDir)).length, { timeout: 20_000 }).toBe(266)
    const ops = await operations(dataDir)
    const merged = ops.find((t) => t.counterparty === 'Biedronka' && t.date === '2025-10-03' && t.amount === -1616)!
    expect(merged.time).toBe('18:40')
    expect((merged.bank as { description: string }).description).toContain('Biedronka')
    expect(new Set(ops.filter((t) => t.counterparty === 'Bolt').map((t) => t.categoryId))).toEqual(new Set(['01KDEFCAT00000000000000601']))
    expect(new Set(ops.filter((t) => t.counterparty === 'KOLEO' && (t.amount as number) < 0).map((t) => t.categoryId))).toEqual(new Set(['01KDEFCAT00000000000000305']))
    expect(new Set(ops.filter((t) => /chess/i.test(t.counterparty as string)).map((t) => t.categoryId))).toEqual(new Set(['01KDEFCAT00000000000000602']))
    expect(ops.filter((t) => /toalety/i.test(t.counterparty as string))).toEqual([])
    expect(ops.filter((t) => t.kind === 'trading')).toHaveLength(26)
    const fi = JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8'))
    const matches = fi.settings.import.rules.map((r: { match: string }) => r.match)
    // The user's decisions and the accepted chains are rules (by brand); the bank's hints are not.
    expect(matches).toEqual(expect.arrayContaining(['bolt', 'tomaszxxx', 'lidl', 'biedronka', 'automat']))
    expect(matches).not.toContain('allegro')
    expect(fi.settings.import.rules.find((r: { match: string }) => r.match === 'automat')).toMatchObject({ mode: 'keyword', direction: 'out', categoryId: '01KDEFCAT00000000000000103' })
    expect(fi.settings.import.rules.find((r: { match: string; mode: string }) => r.match === 'chess' && r.mode === 'keyword')).toMatchObject({ direction: 'out', categoryId: '01KDEFCAT00000000000000602' })
    expect(fi.settings.import.ownNames).toEqual(['JAN KAPITAN'])
    // The member added from the import: his name in the bank, his money beyond his debt as income (asked once, D80 b).
    const tomasz = fi.settings.household.members.find((m: { name: string }) => m.name === 'Tomasz')
    expect(tomasz).toMatchObject({ bankNames: ['TOMASZ xxx'], inflow: 'income' })
    expect(fi.settings.import.rules.find((r: { match: string; direction: string }) => r.match === 'tomaszxxx' && r.direction === 'in')).toMatchObject({ kind: 'income', household: true, memberId: tomasz.id })
    const fromTomasz = ops.filter((t) => t.counterparty === 'TOMASZ xxx' && (t.amount as number) > 0)
    expect(fromTomasz.length).toBeGreaterThan(10)
    expect(new Set(fromTomasz.map((t) => `${t.kind}|${t.memberId}|${t.advance}`))).toEqual(new Set([`income|${tomasz.id}|false`]))
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
    await expect.poll(async () => (await operations(dataDir)).length).toBe(265)
    await page.getByTestId('operations-search').fill('')

    // …and the same file again (the next import overlaps): the deleted one stays out, the ones left out come back.
    await page.keyboard.press('Control+3')
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-count-known')).toHaveText('265')
    await expect(page.getByTestId('import-count-deleted')).toHaveText('1')
    await expect(page.getByTestId('import-count-new')).toHaveText('3')
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
    // Asked first whether today's operations are written (B83).
    await row.getByTestId('confirm-ask-yes').click()
    await expect.poll(async () => (await operations(dataDir)).filter((t) => t.kind === 'correction').map((t) => t.amount)).toEqual([-10000])

    // The operations list shows them; a category changed there teaches the import too.
    await page.keyboard.press('Control+2')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await expect(page.getByTestId('operations-sums')).toContainText('266')
    await page.getByTestId('operations-search').fill('koleo')
    await page.getByTestId('operation-row').first().click()
    await expect(page.getByTestId('operation-bank')).toContainText('KOLEO')
    // Categorized by the starter rule: nothing to remember until the category changes.
    await expect(page.getByTestId('operation-remember')).toHaveCount(0)
    await page.getByTestId('operation-category').selectOption({ label: 'Auto · parking i opłaty' })
    await page.getByTestId('operation-remember').click()
    await expect(page.getByTestId('operation-remember')).toHaveCount(0)
    await expect
      .poll(async () => JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8')).settings.import.rules.find((r: { match: string; direction: string }) => r.match === 'koleo' && r.direction === 'out')?.categoryId)
      .toBe('01KDEFCAT00000000000000304')

    // Many operations at once (D76): the search's result ticked, one category, remembered for the brand; „Cofnij”.
    await page.getByTestId('operations-search').fill('allegro')
    await page.getByTestId('operations-tick-all').check()
    await expect(page.getByTestId('operations-bulk-count')).toContainText('9 operacji')
    await page.getByTestId('operations-bulk-category').selectOption({ label: 'Osobiste · ubrania' })
    await page.getByTestId('operations-bulk-remember').selectOption('brands')
    await page.getByTestId('operations-bulk-apply').click()
    const allegro = async () => new Set((await operations(dataDir)).filter((t) => /allegro/i.test(t.counterparty as string)).map((t) => t.categoryId))
    await expect.poll(allegro).toEqual(new Set(['01KDEFCAT00000000000000801']))
    await expect
      .poll(async () => JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8')).settings.import.rules.find((r: { match: string }) => r.match === 'allegro')?.categoryId)
      .toBe('01KDEFCAT00000000000000801')
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click()
    await expect.poll(allegro).toEqual(new Set(['01KDEFCAT00000000000000800']))
    // „Cofnij” takes the rule back too.
    await expect
      .poll(async () => JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8')).settings.import.rules.some((r: { match: string }) => r.match === 'allegro'))
      .toBe(false)
    await page.getByTestId('operations-search').fill('')

    // Settings → Import: the rules and the holder's names.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await expect(page.getByTestId('own-name')).toHaveText([/JAN KAPITAN/])
    // The rules of brands (the user's keyword apart); one deleted.
    const ruleCount = await page.getByTestId('import-rule').count()
    expect(ruleCount).toBeGreaterThan(5)
    await expect(page.getByTestId('keyword-rule')).toHaveText([/chess/, /automat/])
    await page.getByTestId('import-rule').first().getByTestId('import-rule-delete').click()
    await expect(page.getByTestId('import-rule')).toHaveCount(ruleCount - 1)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
