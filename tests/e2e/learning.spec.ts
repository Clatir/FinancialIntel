import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { launch } from './app'
import { records } from './files'

const FIXTURE = resolve('tests', 'fixtures', 'mbank', 'historia_rachunku.csv')
const HOBBY = '01KDEFCAT00000000000000602'

const group = (page: Page, label: string) => page.locator(`[data-testid="import-group"][data-label="${label}"]`).first()
const brandGroup = (page: Page, brand: string, direction: 'in' | 'out') => page.locator(`[data-testid="import-group"][data-group^="${brand}|${direction}|"]`).first()
const importSettings = async (dataDir: string) => JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8')).settings.import

test('Podobne nazwy i propozycja reguły (D78, 1.2.3): historia rachunku z datami w nazwach, połącz, cofnij, rozłącz, „to nie to samo”, słowo z liczbą operacji', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
    }, FIXTURE)
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-file')).toContainText('historia rachunku')
    await expect(page.getByTestId('import-count-new')).toHaveText('18')

    // The shop's name without the bank's additions (the town after „/”, the date of the transaction): one group of the
    // three days; shops of one town are no similar names – only the same words in another order are.
    const search = page.getByTestId('import-search')
    await search.fill('mokka')
    await expect(group(page, 'KAWIARNIA MOKKA')).toContainText('3 operacje')
    await expect(group(page, 'KAWIARNIA MOKKA')).not.toContainText('nazwy')
    const pair = page.getByTestId('similar-pair')
    await expect(pair).toHaveCount(1)
    await expect(pair).toContainText('KAWIARNIA MOKKA')
    await expect(pair).toContainText('MOKKA KAWIARNIA')
    await expect(pair).toContainText('te same słowa')
    await pair.getByTestId('similar-merge').click()
    await expect(page.getByTestId('similar-names')).toHaveCount(0)
    await expect.poll(async () => (await importSettings(dataDir)).aliases).toMatchObject({ mokkakawiarnia: { to: 'kawiarniamokka', label: 'MOKKA KAWIARNIA', toLabel: 'KAWIARNIA MOKKA' } })
    await expect(group(page, 'KAWIARNIA MOKKA')).toContainText('4 operacje')
    await expect(group(page, 'KAWIARNIA MOKKA')).toContainText('2 nazwy')

    // Merged by hand (ticked groups): one group of two names – and back with „Cofnij”.
    await search.fill('roman')
    await group(page, 'ZEGARMISTRZ ROMAN').getByTestId('import-group-select').check()
    await group(page, 'NAPRAWA ZEGARKOW ROMAN').getByTestId('import-group-select').check()
    await expect(page.getByTestId('import-bulk-merge')).toHaveText('Połącz nazwy (2)')
    await page.getByTestId('import-bulk-merge').click()
    await expect(group(page, 'ZEGARMISTRZ ROMAN')).toHaveCount(0)
    await expect(group(page, 'NAPRAWA ZEGARKOW ROMAN')).toContainText('2 nazwy')
    await page.getByRole('status').filter({ hasText: 'Połączono z „NAPRAWA ZEGARKOW ROMAN”' }).getByTestId('toast-action').click()
    await expect(group(page, 'ZEGARMISTRZ ROMAN')).toHaveCount(1)
    await expect.poll(async () => Object.keys((await importSettings(dataDir)).aliases)).toEqual(['mokkakawiarnia'])
    await page.getByTestId('import-bulk-clear').click()

    // Idea 6: a decision for one group proposes its word with how many other operations it decides; „nie, dziękuję”
    // closes it, the next decision opens it again; taken = a keyword.
    await search.fill('kurs')
    const kurs = group(page, 'KURS JEZYKOWY ABC').getByTestId('import-group-category')
    await kurs.selectOption({ label: 'Prezenty i inne · inne' })
    const word = page.getByTestId('import-proposal-word')
    await expect(word).toHaveText(['„kurs” · jeszcze 2 operacje'])
    await page.getByTestId('import-proposal-close').click()
    await expect(page.getByTestId('import-proposal')).toHaveCount(0)
    await kurs.selectOption({ label: 'Rozrywka i hobby · hobby' })
    await expect(word).toHaveText(['„kurs” · jeszcze 2 operacje'])
    await word.click()
    await expect(page.getByTestId('import-proposal')).toHaveCount(0)
    await expect(brandGroup(page, 'kursyonlinexyz', 'out').getByTestId('import-group-category')).toHaveValue(HOBBY)
    await expect
      .poll(async () => (await importSettings(dataDir)).rules.find((r: { mode: string }) => r.mode === 'keyword'))
      .toMatchObject({ match: 'kurs', label: 'kurs', direction: 'out', kind: 'expense', categoryId: HOBBY })
    await search.fill('')

    // Settings → Import: the merged name, taken apart; back in the import the pair is offered again, then dismissed.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await expect(page.getByTestId('alias')).toHaveText([/MOKKA KAWIARNIA = KAWIARNIA MOKKA/])
    await page.getByTestId('alias-unmerge').click()
    await expect(page.getByTestId('alias')).toHaveCount(0)
    await page.keyboard.press('Control+3')
    await expect(page.getByTestId('similar-pair')).toHaveCount(1)
    await page.getByTestId('similar-dismiss').click()
    await expect(page.getByTestId('similar-names')).toHaveCount(0)
    await expect.poll(async () => Object.keys((await importSettings(dataDir)).notSimilar)).toEqual(['kawiarniamokka|mokkakawiarnia'])
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await page.getByTestId('similar-undismiss').click()
    await expect.poll(async () => (await importSettings(dataDir)).notSimilar).toEqual({})

    // The import: shops saved without the bank's additions, the bank's row keeps them.
    await page.keyboard.press('Control+3')
    await page.getByTestId('import-run').click()
    await expect(page.getByTestId('import-done')).toBeVisible()
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, { timeout: 20_000 }).toBe(18)
    const saved = await records(dataDir, 'transactions')
    expect(saved.filter((t) => /DATA TRANSAKCJI|TESTOWO/.test(String(t.counterparty)))).toEqual([])
    const mokka = saved.find((t) => t.counterparty === 'KAWIARNIA MOKKA' && t.amount === -1250)!
    expect((mokka.bank as { description: string }).description).toContain('DATA TRANSAKCJI: 2026-09-02')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
