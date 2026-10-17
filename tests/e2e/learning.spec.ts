import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { launch } from './app'

const FIXTURE = resolve('tests', 'fixtures', 'mbank', 'lista_operacji.csv')
const HOBBY = '01KDEFCAT00000000000000602'

const group = (page: Page, label: string) => page.locator(`[data-testid="import-group"][data-label="${label}"]`).first()
const brandGroup = (page: Page, brand: string, direction: 'in' | 'out') => page.locator(`[data-testid="import-group"][data-group^="${brand}|${direction}|"]`).first()
const importSettings = async (dataDir: string) => JSON.parse(await fs.readFile(join(dataDir, 'fi.json'), 'utf8')).settings.import

test('Podobne nazwy i propozycja reguły (D78): połącz, cofnij, rozłącz w ustawieniach, „to nie to samo”, słowo z liczbą operacji', async () => {
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
    }, FIXTURE)
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-count-new')).toHaveText('269')

    // Idea 5: one person written both ways round – offered, merged: one brand, one rule from now on.
    const pair = page.getByTestId('similar-pair')
    await expect(pair).toHaveCount(1)
    await expect(pair).toContainText('MAREK xxx')
    await expect(pair).toContainText('xxx MAREK')
    await expect(pair).toContainText('te same słowa')
    await pair.getByTestId('similar-merge').click()
    await expect(page.getByTestId('similar-names')).toHaveCount(0)
    await expect.poll(async () => (await importSettings(dataDir)).aliases).toMatchObject({ xxxmarek: { to: 'marekxxx', label: 'xxx MAREK', toLabel: 'MAREK xxx' } })
    const search = page.getByTestId('import-search')
    await search.fill('marek')
    await expect(brandGroup(page, 'marekxxx', 'in')).toHaveAttribute('data-label', 'xxx MAREK')

    // Merged by hand (ticked groups): one group of two names – and back with „Cofnij”.
    await search.fill('spp')
    await group(page, 'CPG SPP TESTOWE').getByTestId('import-group-select').check()
    await group(page, 'KBU SP Z O O SPP STOLICA').getByTestId('import-group-select').check()
    await expect(page.getByTestId('import-bulk-merge')).toHaveText('Połącz nazwy (2)')
    await page.getByTestId('import-bulk-merge').click()
    await expect(group(page, 'KBU SP Z O O SPP STOLICA')).toHaveCount(0)
    await expect(group(page, 'CPG SPP TESTOWE')).toContainText('2 nazwy')
    await page.getByRole('status').filter({ hasText: 'Połączono z „CPG SPP TESTOWE”' }).getByTestId('toast-action').click()
    await expect(group(page, 'KBU SP Z O O SPP STOLICA')).toHaveCount(1)
    await expect.poll(async () => Object.keys((await importSettings(dataDir)).aliases)).toEqual(['xxxmarek'])
    await page.getByTestId('import-bulk-clear').click()

    // Idea 6: a decision for one group proposes its word with how many other operations it decides; taken = a keyword.
    await search.fill('kurs')
    await group(page, 'KURS JEZYKOWY SPOLKA Z O').getByTestId('import-group-category').selectOption({ label: 'Rozrywka i hobby · hobby' })
    const word = page.getByTestId('import-proposal-word')
    await expect(word).toHaveCount(1)
    await expect(word).toHaveText('„kurs” · jeszcze 3 operacje')
    await word.click()
    await expect(page.getByTestId('import-proposal')).toHaveCount(0)
    await expect(brandGroup(page, 'kursyonline', 'out').getByTestId('import-group-category')).toHaveValue(HOBBY)
    await expect(brandGroup(page, 'kursjezykowy', 'out').getByTestId('import-group-category')).toHaveValue(HOBBY)
    await expect
      .poll(async () => (await importSettings(dataDir)).rules.find((r: { mode: string }) => r.mode === 'keyword'))
      .toMatchObject({ match: 'kurs', label: 'kurs', direction: 'out', kind: 'expense', categoryId: HOBBY })
    // „nie, dziękuję” closes it.
    await search.fill('apteka')
    await group(page, 'APTEKA CENTRUM').getByTestId('import-group-category').selectOption({ label: 'Prezenty i inne · inne' })
    await expect(page.getByTestId('import-proposal-word')).toHaveText(['„apteka” · jeszcze 4 operacje'])
    await page.getByTestId('import-proposal-close').click()
    await expect(page.getByTestId('import-proposal')).toHaveCount(0)
    await search.fill('')

    // Settings → Import: the merged name, taken apart; back in the import the pair is offered again, then dismissed.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await expect(page.getByTestId('alias')).toHaveText([/xxx MAREK = MAREK xxx/])
    await page.getByTestId('alias-unmerge').click()
    await expect(page.getByTestId('alias')).toHaveCount(0)
    await page.keyboard.press('Control+3')
    await expect(page.getByTestId('similar-pair')).toHaveCount(1)
    await page.getByTestId('similar-dismiss').click()
    await expect(page.getByTestId('similar-names')).toHaveCount(0)
    await expect.poll(async () => Object.keys((await importSettings(dataDir)).notSimilar)).toEqual(['marekxxx|xxxmarek'])
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await page.getByTestId('similar-undismiss').click()
    await expect.poll(async () => (await importSettings(dataDir)).notSimilar).toEqual({})
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
