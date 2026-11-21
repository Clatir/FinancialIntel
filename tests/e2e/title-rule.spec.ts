import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'
import { pickCategory } from './forms'

const MBANK = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'
/** The operation opened in the editor – the rule set on it by hand. */
const OPEN = '01KSEEDA000000000000000014'

// T535 (D106 pkt 3, UX-1, UX-2): „Ustaw regułę dla tytułu” – the keyword is the title's longest word, the history off by
// default; a refusal at its field; with the history – the bulk changes' preview (the confirmed balance asked), one
// „Cofnij” of the operations and of the rule. T549 (review of 1.21.0): the history's operations of the rule's direction
// only – the refund's rule never turns a purchase into money in; the open one takes the rule as the editor sets it.
test('reguła dla tytułu: błąd przy polu, historia przez podgląd zmian zbiorczych, „Cofnij” z regułą', async () => {
  const { month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${addMonths(month, -2)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-title-rule-')), 'FinancialIntel')
  const obiad = (day: string, amount: number, more: Record<string, unknown> = {}) => ({ date: `${prev}-${day}`, accountId: MBANK, amount, counterparty: 'Piotr Testowy', title: 'Zwrot za obiad', ...more })
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [
        { date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) },
        { date: `${prev}-20`, accountId: MBANK, kind: 'confirmation', amount: zl(20000 - 80) }
      ],
      transactions: [
        obiad('10', zl(35)),
        obiad('11', -zl(35)),
        obiad('12', zl(35)),
        obiad('14', -zl(35), { id: OPEN }),
        { date: `${prev}-15`, accountId: MBANK, amount: -zl(80), counterparty: 'Sklep Alfa', categoryId: GROCERIES }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  // By file name – by date: the 10th, 11th, 12th, 14th.
  const lunches = async () => (await records(dir, 'transactions')).filter((t) => t.title === 'Zwrot za obiad').map((t) => [t.amount, t.categoryId])
  const rules = async () => ((await json(join(dir, 'fi.json'))).settings.import.rules as Array<{ match: string }>).map((r) => r.match)
  const seeded = [
    [zl(35), null],
    [-zl(35), null],
    [zl(35), null],
    [-zl(35), null]
  ]
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.locator(`[data-testid="operation-row"][data-key="${OPEN}"]`).click()
    await page.getByTestId('operation-title-rule').click()
    const panel = page.getByTestId('operation-title-rule-panel')
    await expect(panel).toBeVisible()
    // The longest word that says what it was – „zwrot” is a bank's general word.
    await expect(page.getByTestId('title-rule-keyword')).toHaveValue('obiad')
    await expect(page.getByTestId('title-rule-update-history')).not.toBeChecked()

    // UX-2: a refusal said at its field – the window stays open.
    await page.getByTestId('title-rule-apply-btn').click()
    await expect(panel.getByTestId('title-rule-error')).toHaveText('Wybierz kategorię.')
    await page.getByTestId('title-rule-keyword').fill('a')
    await page.getByTestId('title-rule-keyword').press('Enter')
    await page.getByTestId('title-rule-apply-btn').click()
    await expect(panel.getByTestId('title-rule-error')).toHaveText('Słowo kluczowe musi mieć co najmniej 2 litery.')
    await page.getByTestId('title-rule-keyword').fill('obiad')
    await page.getByTestId('title-rule-keyword').press('Enter')
    await expect(panel.getByTestId('title-rule-error')).toHaveCount(0)

    await panel.getByRole('radio', { name: 'Zwrot / kategoria' }).click()
    await pickCategory(page, 'title-rule-category', GROCERIES)
    await page.getByTestId('title-rule-update-history').check()
    await page.getByTestId('title-rule-apply-btn').click()

    // The shared preview: the confirmed balance it changes (the open one's sign), the purchase of the 11th skipped, the
    // rule written with it – nothing written before „Zastosuj”.
    const dialog = page.getByTestId('operations-bulk-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('operations-bulk-effect')).toContainText('3 operacje')
    await expect(dialog.getByTestId('operations-bulk-effect')).toContainText('pominięte 1')
    await expect(dialog.getByTestId('operations-bulk-confirmed')).toContainText('Zmieni potwierdzone saldo konta')
    await expect(dialog.getByTestId('operations-bulk-note')).toBeVisible()
    expect(await lunches()).toEqual(seeded)
    expect(await rules()).not.toContain('obiad')
    await page.getByTestId('operations-bulk-confirm').click()
    await expect.poll(lunches).toEqual([
      [zl(35), GROCERIES],
      [-zl(35), null],
      [zl(35), GROCERIES],
      [zl(35), GROCERIES]
    ])
    await expect.poll(rules).toContain('obiad')
    const done = page.getByRole('status').filter({ hasText: /obiad/ })
    await expect(done).toContainText('pominięte (zmiana do nich nie pasuje): 1')

    // One „Cofnij”: the operations and the rule.
    await done.getByRole('button', { name: 'Cofnij' }).click()
    await expect.poll(lunches).toEqual(seeded)
    await expect.poll(rules).not.toContain('obiad')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
