import { mkdtempSync, promises as fs, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { launch, withMainLog } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

/**
 * Hundreds of files written or deleted at once (an import, its undo): a slow Windows runner of CI takes over the default
 * 10 s for them (1.6.5 on main, 1.6.6 – every test there 1.5–2.5× slower), so these polls wait longer.
 */
const MASS = { timeout: 30_000 }

/**
 * An import's summary – shown once all its records are on the disk: as long as the polls of mass steps may take (MASS); a
 * failure brings what the window said (its messages) and the end of main.log (T301).
 */
async function importDone(page: Page, userData: string): Promise<void> {
  await withMainLog(userData, async () => {
    try {
      await expect(page.getByTestId('import-done')).toBeVisible(MASS)
    } catch (e) {
      const said = await page.getByRole('status').allTextContents().catch(() => [] as string[])
      if (e instanceof Error) e.message += `\n--- komunikaty okna ---\n${said.join('\n') || '(brak)'}`
      throw e
    }
  })
}

const FIXTURE = resolve('tests', 'fixtures', 'mbank', 'lista_operacji.csv')
const ACC = '01KDEFACC00000000000000001'

async function answerFileDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

async function openFile(app: ElectronApplication, page: Page, path: string): Promise<void> {
  await page.keyboard.press('Control+3')
  await expect(page.getByTestId('page-import')).toBeVisible()
  await answerFileDialog(app, path)
  await page.getByTestId('import-pick').click()
  await expect(page.getByTestId('import-file')).toBeVisible()
}

/** The fixture with an account number in its header (`#dla rachunków`), as another file of the test. */
function withAccount(dir: string, name: string, number: string): string {
  const text = readFileSync(FIXTURE, 'utf8').replace(/eKonto - X+/, `eKonto - ${number}`)
  const file = join(dir, name)
  writeFileSync(file, text)
  return file
}

const zlText = (g: number) => {
  const [int, frac] = (Math.abs(g) / 100).toFixed(2).split('.')
  return `${g < 0 ? '-' : ''}${int!.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${frac}`
}
const plDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

/** An account history (newest first, with its balances): every row a purchase of `shop`, booked on its day. */
function historia(dir: string, start: number, rows: Array<{ date: string; shop: string; amount: number }>): string {
  let balance = start
  const lines = rows.map((r) => {
    balance += r.amount
    return `${plDay(r.date)};${plDay(r.date)};ZAKUP PRZY UŻYCIU KARTY;"${r.shop} /Testowo";"";'';${zlText(r.amount)};${zlText(balance)};`
  })
  const text = [
    'mBank S.A. Bankowość Detaliczna;',
    '#Klient;',
    'JAN KAPITAN;',
    '#Za okres:;',
    `${plDay(rows[0]!.date)};${plDay(rows.at(-1)!.date)};`,
    '#Data księgowania;#Data operacji;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;',
    ...lines.reverse(),
    ';',
    `#Saldo końcowe;${zlText(balance)};`
  ].join('\n')
  const file = join(dir, 'historia.csv')
  writeFileSync(file, text)
  return file
}

test('„Cofnij import” z „Cofnij”, ponowny import wczytuje wszystko; numer rachunku; plik już zaimportowany (F4, N13)', async () => {
  test.setTimeout(180_000)
  const { app, page, dataDir, userData, errors } = await launch()
  const files = mkdtempSync(join(tmpdir(), 'fi-import-tools-'))
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const first = withAccount(files, 'lista1.csv', '11 1111 2222 3333 4444 5555 6666')
    await openFile(app, page, first)
    await expect(page.getByTestId('import-count-new')).toHaveText('269')
    await expect(page.getByTestId('import-account-warning')).toHaveCount(0)
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(269)
    await expect.poll(async () => (await records(dataDir, 'imports')).length).toBe(1)

    // The whole file taken back: the dialog says what goes.
    await page.getByTestId('import-undo').click()
    await expect(page.getByTestId('import-undo-plan')).toContainText('269')
    await page.getByTestId('import-undo-confirm').click()
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(0)
    await expect(page.getByTestId('import-undone')).toBeVisible()
    // „Cofnij” of the undo: the import as it was.
    await page.getByRole('status').filter({ hasText: 'Import cofnięty' }).getByTestId('toast-action').click()
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(269)
    await page.getByTestId('import-undo').click()
    await page.getByTestId('import-undo-confirm').click()
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(0)

    // The same file again: every row comes in (taken back ≠ deleted by the user – T39).
    await openFile(app, page, first)
    await expect(page.getByTestId('import-count-new')).toHaveText('269')
    await expect(page.getByTestId('import-count-deleted')).toHaveCount(0)
    await page.getByTestId('import-run').click()
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(269)

    // Once more: nothing new – said, saved without changes (N13).
    await openFile(app, page, first)
    await expect(page.getByTestId('import-already')).toBeVisible()
    await expect(page.getByTestId('import-run')).toContainText('bez zmian')
    await page.getByTestId('import-run').click()
    await expect(page.getByTestId('import-done')).toBeVisible()

    // A file of another account at the bank: said before the import.
    await openFile(app, page, withAccount(files, 'lista2.csv', '99 9999 8888 7777 6666 5555 4444'))
    await expect(page.getByTestId('import-account-warning')).toContainText('…6666')
    await page.getByTestId('import-close').click()

    // Ustawienia → Import z banku: the last imports, the one taken back marked.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await expect(page.getByTestId('recent-import')).toHaveCount(2)
    await expect(page.getByTestId('recent-import-undone')).toHaveCount(1)
    await expect(page.getByTestId('recent-import-undo')).toHaveCount(1)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('„Cofnij import” czeka na operacje, których nie ma na tym komputerze; „Cofnij mimo to” (F4)', async () => {
  test.setTimeout(180_000)
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await openFile(app, page, FIXTURE)
    await page.getByTestId('import-run').click()
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(269)
    // One file gone outside the app – no version in the history, like one still on its way from the other computer.
    const files = (await fs.readdir(join(dataDir, 'transactions'), { recursive: true })).map(String).filter((f) => f.endsWith('.json'))
    await fs.rm(join(dataDir, 'transactions', files[0]!))
    await page.keyboard.press('Control+2')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await expect(page.getByTestId('operations-sums')).toContainText('268')
    await page.keyboard.press('Control+3')
    await page.getByTestId('import-undo').click()
    await page.getByTestId('import-undo-confirm').click()
    const waiting = page.getByRole('status').filter({ hasText: 'nie ma na tym komputerze' })
    await expect(waiting).toBeVisible()
    expect((await records(dataDir, 'transactions')).length).toBe(268)
    await waiting.getByTestId('toast-action').click()
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(0)
    await expect(page.getByTestId('import-undone')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Telemetria z banku: historia rachunku zgodna – saldo potwierdzone samo; wpis ręczny bez pary w banku – dzień rozbieżności (F5)', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-telemetry-')), 'FinancialIntel')
  seedFolder(dataDir, { records: { balances: [{ date: '2026-09-01', accountId: ACC, kind: 'opening', amount: zl(1000) }] } })
  const { app, page, errors } = await launch({ dataDir })
  const files = mkdtempSync(join(tmpdir(), 'fi-telemetry-files-'))
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const rows = [
      { date: '2026-09-02', shop: 'SKLEP A', amount: -zl(12.5) },
      { date: '2026-09-03', shop: 'SKLEP B', amount: -zl(40) },
      { date: '2026-09-05', shop: 'SKLEP C', amount: -zl(7.99) }
    ]
    await openFile(app, page, historia(files, zl(1000), rows))
    await page.getByTestId('import-run').click()
    await expect(page.getByTestId('bank-telemetry-match')).toContainText('Saldo potwierdzone')
    await expect.poll(async () => (await records(dataDir, 'balances')).filter((b) => b.kind === 'confirmation').map((b) => [b.date, b.amount])).toEqual([['2026-09-05', zl(1000 - 12.5 - 40 - 7.99)]])

    // A purchase typed by hand on 04.09 that the bank has not: the difference, from that day, with the operation.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-amount').fill('20')
    await page.getByTestId('operation-amount').press('Enter')
    await page.getByTestId('operation-counterparty').fill('Kiosk')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-date').fill('04.09.2026')
    await page.getByTestId('operation-date').press('Enter')
    await expect.poll(async () => (await records(dataDir, 'transactions')).length).toBe(4)
    await page.keyboard.press('Control+3')
    await expect(page.getByTestId('bank-telemetry-diff')).toContainText('od 04.09.2026')
    await expect(page.getByTestId('bank-telemetry-extra')).toContainText('Kiosk')
    await expect(page.getByTestId('bank-telemetry-confirm')).toContainText('korektą')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Oficer zna sieć i historię marki w edytorze; audyt reguł: niespójna operacja i „Zastosuj do historii” z „Cofnij” (F8, F22)', async () => {
  test.setTimeout(180_000)
  const { app, page, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await openFile(app, page, FIXTURE)
    // Bolt decided as „wyjścia” and remembered: a rule of the brand.
    const search = page.getByTestId('import-search')
    await search.fill('bolt')
    const bolt = page.locator('[data-testid="import-group"][data-label="Bolt"]').first()
    await bolt.getByTestId('import-group-category').selectOption({ label: 'Rozrywka i hobby · wyjścia' })
    await expect(bolt.getByTestId('import-group-remember')).toBeChecked()
    await search.fill('')
    await page.getByTestId('import-run').click()
    await expect(page.getByTestId('import-done')).toBeVisible()
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(269)

    // F8: „Dino” typed by hand, no category – the officer knows the chain from the bank's „DINO TESTOWO 4”.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-amount').fill('35')
    await page.getByTestId('operation-amount').press('Enter')
    await page.getByTestId('operation-counterparty').fill('Dino')
    await page.getByTestId('operation-counterparty').press('Enter')
    await expect(page.getByTestId('operation-officer')).toContainText('oficer: Jedzenie · zakupy spożywcze')
    await page.getByTestId('operation-officer').click()
    await expect(page.getByTestId('operation-category')).toHaveValue('01KDEFCAT00000000000000101')

    // One Bolt changed by hand to another category: the audit shows it, „Zastosuj do historii” brings the rule's.
    const OUTINGS = '01KDEFCAT00000000000000601'
    const boltCats = async () => (await records(dataDir, 'transactions')).filter((t) => t.counterparty === 'Bolt' && Number(t.amount) < 0).map((t) => t.categoryId)
    await expect.poll(async () => [...new Set(await boltCats())]).toEqual([OUTINGS])
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operations-search').fill('bolt')
    await page.getByTestId('operation-row').first().click()
    await page.getByTestId('operation-category').selectOption({ label: 'Auto · parking i opłaty' })
    await expect.poll(async () => (await boltCats()).filter((c) => c !== OUTINGS).length).toBe(1)
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    const boltRule = page.locator('[data-testid="import-rule"][data-match="bolt"]')
    await expect(boltRule.getByTestId('import-rule-hits')).not.toHaveText('0 op.')
    await boltRule.getByTestId('import-rule-differ').click()
    await expect(boltRule.getByTestId('import-rule-differ-row')).toHaveCount(1)
    await boltRule.getByTestId('import-rule-apply').click()
    await expect.poll(async () => [...new Set(await boltCats())]).toEqual([OUTINGS])
    await expect(boltRule.getByTestId('import-rule-differ')).toHaveCount(0)
    await page.getByRole('status').filter({ hasText: 'zastosowana do historii' }).getByTestId('toast-action').click()
    await expect.poll(async () => (await boltCats()).filter((c) => c !== OUTINGS).length).toBe(1)

    // The rule's editor: another category, kept for the next imports.
    await boltRule.getByTestId('import-rule-edit').click()
    await boltRule.getByTestId('import-rule-edit-category').selectOption({ label: 'Auto · parking i opłaty' })
    await boltRule.getByTestId('import-rule-save').click()
    await expect
      .poll(async () => JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8')).settings.import.rules.find((r: { match: string; direction: string }) => r.match === 'bolt' && r.direction === 'out')?.categoryId)
      .toBe('01KDEFCAT00000000000000304')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
