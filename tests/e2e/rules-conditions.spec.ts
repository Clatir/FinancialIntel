import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { importDone, launch, MASS } from './app'
import { records } from './files'
import { seedFolder, seedId } from './seed'

// AP-45 (1.16.0, T467–T470): a rule of conditions written in Ustawienia → Import z banku – its editor, the import deciding
// by it, its audit, and its hint („także dla wpisów ręcznych”) in the operation's editor and the quick entry.
const FIXTURE = resolve('tests', 'fixtures', 'mbank', 'lista_operacji.csv')
const OUTINGS = '01KDEFCAT00000000000000601'

async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

const rulesOf = (dataDir: string) => JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8')).settings.import.rules as Array<Record<string, unknown>>

test('AP-45: reguła z warunkami (kontrahent i kwota) – edytor, import, audyt, podpowiedź w edytorze operacji i w szybkim wpisie', async () => {
  test.setTimeout(240_000)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap45-')), 'FinancialIntel')
  // No quiet hours: the suite may run at night (the quick entry would ask for a note).
  seedFolder(dataDir, { settings: (s) => ({ ...s, orders: { ...s.orders, quietHours: { from: '00:00', to: '00:00' } } }) })
  const { app, page, userData, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()

    // The editor: „Bolt” and „do 10 zł”, both (I) – an outing, also for the entries typed by hand.
    await page.getByTestId('import-rule-new').click()
    const editor = page.getByTestId('import-rule-conditions')
    await editor.getByTestId('import-rule-conditions-label').fill('Bolt drobne')
    await editor.getByTestId('import-rule-condition-text').fill('bolt')
    // Nothing to save without a category: said at the button.
    await editor.getByTestId('import-rule-conditions-save').click()
    await expect(editor.getByTestId('import-rule-conditions-error')).toHaveText('Wybierz kategorię.')
    await editor.getByTestId('import-rule-condition-field').selectOption('amount')
    await editor.getByTestId('import-rule-condition-add').click()
    await expect(editor.getByTestId('import-rule-condition')).toHaveCount(2)
    await editor.getByTestId('import-rule-condition-max').click()
    await editor.getByTestId('import-rule-condition-max').fill('10')
    await editor.getByTestId('import-rule-condition-max').press('Enter')
    await editor.getByTestId('import-rule-conditions-decision-category').selectOption(OUTINGS)
    await editor.getByTestId('import-rule-conditions-manual').check()
    await editor.getByTestId('import-rule-conditions-save').click()
    await expect(editor).toHaveCount(0)
    await expect
      .poll(() => rulesOf(dataDir).filter((r) => r.mode === 'conditions').map((r) => [r.mode, r.label, r.combine, r.direction, r.categoryId, r.manual, r.conditions]))
      .toEqual([['conditions', 'Bolt drobne', 'all', 'out', OUTINGS, true, [{ field: 'counterparty', value: 'bolt' }, { field: 'amount', min: null, max: 1000 }]]])
    const rule = page.locator('[data-testid="import-rule"][data-mode="conditions"]')
    await expect(rule.getByTestId('import-rule-conditions-text')).toHaveText('kontrahent zawiera „bolt” i kwota do 10,00 zł')
    await expect(rule.getByTestId('import-rule-manual-mark')).toBeVisible()

    // The import: Bolt up to 10 zł by the rule, the larger ones not.
    await page.keyboard.press('Control+3')
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
    }, FIXTURE)
    await page.getByTestId('import-pick').click()
    await expect(page.getByTestId('import-file')).toBeVisible()
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect.poll(async () => (await records(dataDir, 'transactions')).length, MASS).toBe(269)
    const bolts = (await records(dataDir, 'transactions')).filter((t) => t.counterparty === 'Bolt' && Number(t.amount) < 0)
    const small = bolts.filter((t) => -Number(t.amount) <= 1000)
    expect(small.length).toBeGreaterThan(0)
    expect(small.every((t) => t.categoryId === OUTINGS)).toBe(true)
    expect(bolts.filter((t) => -Number(t.amount) > 1000).some((t) => t.categoryId === OUTINGS)).toBe(false)

    // The audit counts its operations.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await expect(rule.getByTestId('import-rule-hits')).toHaveText(`${small.length} op.`)

    // The operation's editor: typed by hand – no hint above 10 zł; up to it, the rule's decision to accept.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-amount').fill('50')
    await page.getByTestId('operation-amount').press('Enter')
    await page.getByTestId('operation-counterparty').fill('Bolt')
    await page.getByTestId('operation-counterparty').press('Enter')
    await expect(page.getByTestId('operation-category')).toBeVisible()
    await expect(page.getByTestId('operation-rule-hint')).toHaveCount(0)
    // Without the rule's hint the officer guesses (the chain of the dictionary).
    await expect(page.getByTestId('operation-officer')).toBeVisible()
    await page.getByTestId('operation-amount').click()
    await page.getByTestId('operation-amount').fill('5')
    await page.getByTestId('operation-amount').press('Enter')
    await expect(page.getByTestId('operation-rule-hint')).toHaveText('z reguły „Bolt drobne”: Rozrywka i hobby · wyjścia · płacę ja')
    // One hint at a time – the rule's; never taken by itself.
    await expect(page.getByTestId('operation-officer')).toHaveCount(0)
    await expect(page.getByTestId('operation-category')).not.toHaveValue(OUTINGS)
    await page.getByTestId('operation-rule-hint').click()
    await expect(page.getByTestId('operation-category')).toHaveValue(OUTINGS)
    await expect(page.getByTestId('operation-rule-hint')).toHaveCount(0)

    // The quick entry: the same hint once the name is typed.
    const quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').click()
    await quick.getByTestId('quick-amount').fill('4')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-counterparty').fill('Bolt')
    await expect(quick.getByTestId('quick-rule-hint')).toHaveText('z reguły „Bolt drobne”: Rozrywka i hobby · wyjścia · płacę ja')
    // The officer fills in no guess of its own beside it.
    await expect(quick.getByTestId('quick-category')).toHaveValue('')
    await expect(quick.getByTestId('quick-officer')).toHaveCount(0)
    await quick.getByTestId('quick-rule-hint').click()
    await expect(quick.getByTestId('quick-rule-hint')).toHaveCount(0)
    await expect(quick.getByTestId('quick-category')).toHaveValue(OUTINGS)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-45: „także dla wpisów ręcznych” w edytorze reguły marki i na liście słów; podpowiedź reguły marki w edytorze operacji', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap45-manual-')), 'FinancialIntel')
  const AT = new Date().toISOString()
  const FUN = '01KDEFCAT00000000000000600'
  const COFFEE = '01KDEFCAT00000000000000103'
  const base = { direction: 'out', kind: 'expense', refundable: false, household: false, memberId: null, counterAccountId: null, hits: 0, updatedAt: AT }
  const netflix = { ...base, id: seedId(), match: 'netflix', mode: 'exact', label: 'Netflix', categoryId: FUN, learned: true }
  const cafe = { ...base, id: seedId(), match: 'kawiarnia', mode: 'keyword', label: 'kawiarnia', categoryId: COFFEE, learned: false }
  seedFolder(dataDir, { settings: (s) => ({ ...s, import: { ...s.import, rules: [netflix, cafe] as typeof s.import.rules } }) })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    const manualOf = (id: string) => rulesOf(dataDir).find((r) => r.id === id)?.manual
    // The keywords' list: a switch.
    await page.getByTestId('keyword-rule').filter({ hasText: 'kawiarnia' }).getByTestId('keyword-rule-manual').check()
    await expect.poll(() => manualOf(cafe.id)).toBe(true)
    // The brand's rule: in its editor.
    const rule = page.locator('[data-testid="import-rule"][data-match="netflix"]')
    await rule.getByTestId('import-rule-edit').click()
    await rule.getByTestId('import-rule-manual').check()
    await rule.getByTestId('import-rule-save').click()
    await expect.poll(() => manualOf(netflix.id)).toBe(true)
    await expect(rule.getByTestId('import-rule-manual-mark')).toBeVisible()

    // Typed by hand: the brand's rule proposes its category, the keyword of the name its own.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-amount').fill('43')
    await page.getByTestId('operation-amount').press('Enter')
    await page.getByTestId('operation-counterparty').fill('Netflix')
    await page.getByTestId('operation-counterparty').press('Enter')
    await expect(page.getByTestId('operation-rule-hint')).toContainText('z reguły „Netflix”: ')
    await page.getByTestId('operation-rule-hint').click()
    await expect(page.getByTestId('operation-category')).toHaveValue(FUN)
    await page.getByTestId('operation-counterparty').fill('Kawiarnia Pod Lipą')
    await page.getByTestId('operation-counterparty').press('Enter')
    await expect(page.getByTestId('operation-rule-hint')).toContainText('z reguły „kawiarnia”: ')
    await page.getByTestId('operation-rule-hint').click()
    await expect(page.getByTestId('operation-category')).toHaveValue(COFFEE)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
