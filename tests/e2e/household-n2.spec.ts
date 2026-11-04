import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { importDone, launch } from './app'
import { json, records } from './files'
import { listaCsv } from './mbank-csv'
import { seedFolder, zl } from './seed'

const GROCERIES = '01KDEFCAT00000000000000101'
const MAREK = '01KMEMMAREK000000000000003'
const id = (n: number) => `01KN2E${String(n).padStart(20, '0')}`
const TICKETS = id(1)
const dm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`
const marek = (inflow: string) => ({ id: MAREK, name: 'Marek', bankNames: ['MAREK TESTOWY'], inflow, archived: false, via: null, opening: { owed: 0, deposit: 0 } })

/** The file dialog of the main process answers with `path` (a dialog cannot be clicked in a test). */
async function importFile(app: ElectronApplication, page: Page, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
  await page.getByTestId('import-pick').click()
  await expect(page.getByTestId('import-file')).toBeVisible()
}

test('AP-4 (AF-16): zaliczka na przyszłość przy długu – przy osobie naraz dług i zaliczka; meldunek „Spłać” z „Cofnij”, „zostaw”', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-household-n2-')), 'FinancialIntel')
  const ADVANCE = id(2)
  const paidOn = addDays(today, -10)
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { since: start, assignFrom: start, members: [...s.household.members, marek('advance')] } }),
    records: {
      balances: [{ date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) }],
      transactions: [
        { id: TICKETS, date: addDays(today, -20), accountId: MBANK_ACCOUNT_ID, amount: -zl(360), categoryId: GROCERIES, counterparty: 'EVENTIM', refundable: true, memberId: MAREK },
        // Saved by „reszta jako zaliczka” of 1.15.3–1.15.5: an advance for the future, the debt skipped (P.3).
        { id: ADVANCE, date: paidOn, accountId: MBANK_ACCOUNT_ID, kind: 'income', amount: zl(100), counterparty: 'MAREK TESTOWY', memberId: MAREK, advance: true, inflowKind: 'advance' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    // Mostek: his debt and his advance at once – the deposit is the sum at the persons (before: „ma oddać” only).
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const bridgeMarek = page.locator('[data-testid="bridge-member"]', { hasText: 'Marek' })
    await expect(bridgeMarek).toContainText('ma oddać')
    await expect(bridgeMarek).toContainText('360,00 zł')
    await expect(bridgeMarek.getByTestId('bridge-member-deposit')).toHaveText('zaliczka – czeka na wydatki100,00 zł')
    await expect(page.getByTestId('state-deposit')).toContainText('100,00 zł')
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    await expect(page.locator('[data-testid="radar-member"]', { hasText: 'Marek' })).toContainText('ma oddać')
    await expect(page.locator('[data-testid="radar-member"]', { hasText: 'Marek' }).getByTestId('radar-member-deposit')).toHaveText('zaliczka (depozyt)100,00 zł')
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-household').click()
    await expect(page.locator('[data-testid="member-row"][data-name="Marek"]').getByTestId('member-balance')).toHaveText('ma oddać 360,00 zł · zaliczka 100,00 zł')

    // Meldunki: „wpłata … nie spłaciła długu – spłacić?”.
    await page.keyboard.press('Control+Shift+M')
    await expect(page.getByTestId('page-inbox')).toBeVisible()
    const report = page.locator('[data-testid="inbox-item"][data-kind="advances"]')
    await expect(report).toContainText(`Marek: wpłata jako zaliczka na przyszłość nie spłaciła długu (${dm(paidOn)} 100,00 zł) – ma oddać 360,00 zł. Spłacić?`)
    const saved = async () => (await records(dir, 'transactions')).find((t) => t.id === ADVANCE)
    await report.getByTestId('inbox-open').click()
    await expect.poll(async () => [(await saved())?.inflowKind, (await saved())?.advance]).toEqual(['repay', true])
    await expect(report).toHaveCount(0)
    // No purchase sure for 100 zł (D91 a): it waits to be assigned, the debt lower all the same.
    await expect(page.locator('[data-testid="inbox-item"][data-kind="repayments"]')).toContainText('Marek: zwrot 100,00 zł')
    await page.getByRole('status').filter({ hasText: 'reszta zostaje zaliczką' }).getByTestId('toast-action').click()
    await expect.poll(async () => (await saved())?.inflowKind).toBe('advance')
    await expect(report).toHaveCount(1)
    // „zostaw”: kept as the advance it is – never asked again.
    await report.getByTestId('inbox-dismiss').click()
    await expect(report).toHaveCount(0)
    await expect.poll(async () => Object.keys((await json(join(dir, 'fi.json'))).settings.import.notDuplicates)).toEqual([`advanceKept:${ADVANCE}:${MAREK}`])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-4 (AF-8, IM.23, MG sp. 6): zapisana zaliczka wskazująca bilety spłaca je – Marek 300, nie 360; import: jedna nazwa wyboru, „spłata, reszta jako zaliczka” spłaca', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  const dir = mkdtempSync(join(tmpdir(), 'fi-household-n2i-'))
  const dataDir = join(dir, 'FinancialIntel')
  const userData = join(dir, 'userData')
  const MEDIA = id(3)
  const sharedOn = addDays(today, -20)
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { since: start, assignFrom: start, members: [...s.household.members, marek('income')] } }),
    records: {
      balances: [{ date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) }],
      transactions: [
        { id: TICKETS, date: addDays(today, -30), accountId: MBANK_ACCOUNT_ID, amount: -zl(360), categoryId: GROCERIES, counterparty: 'EVENTIM', refundable: true, memberId: MAREK },
        // The persona's 360 zł (P.3): „reszta jako zaliczka” saved as an advance for the future, naming the tickets.
        { id: id(4), date: addDays(today, -25), accountId: MBANK_ACCOUNT_ID, kind: 'income', amount: zl(360), counterparty: 'MAREK TESTOWY', memberId: MAREK, advance: true, inflowKind: 'advance', covers: [TICKETS] },
        {
          id: MEDIA,
          date: sharedOn,
          accountId: MBANK_ACCOUNT_ID,
          amount: -zl(900),
          counterparty: 'MEDIA EXPERT',
          splits: [
            { id: id(5), amount: -zl(600), categoryId: GROCERIES, refundable: false, memberId: null, advance: false, note: '' },
            { id: id(6), amount: -zl(300), categoryId: GROCERIES, refundable: true, memberId: MAREK, advance: false, note: '' }
          ]
        }
      ]
    }
  })
  const file = join(dir, 'lista_operacji.csv')
  writeFileSync(file, listaCsv([], { from: addDays(today, -8), to: addDays(today, -1) }, null, [{ date: addDays(today, -2), amount: 500, name: 'MAREK TESTOWY', title: 'ZWROT ZA SPRZET' }]))
  const { app, page, errors } = await launch({ dataDir, userData })
  try {
    // The tickets paid back by the money naming them: he owes his part of Media Expert since its day, no advance seen.
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const bridgeMarek = page.locator('[data-testid="bridge-member"]', { hasText: 'Marek' })
    await expect(bridgeMarek).toContainText(`ma oddać · od ${dm(sharedOn)}`)
    await expect(bridgeMarek).toContainText('300,00 zł')
    await expect(bridgeMarek.getByTestId('bridge-member-deposit')).toHaveCount(0)

    // The import: one list names the choice (no second switch), four kinds of his money.
    await page.keyboard.press('Control+3')
    await importFile(app, page, file)
    await page.getByTestId('import-search').fill('marek')
    const g = page.locator('[data-testid="import-group"][data-label="MAREK TESTOWY"]').first()
    const kind = g.getByTestId('import-group-kind')
    await expect(kind.locator('option', { hasText: 'Od domownika: Marek – ' })).toHaveText([
      'Od domownika: Marek – spłata, reszta jako przychód',
      'Od domownika: Marek – spłata, reszta jako zaliczka',
      'Od domownika: Marek – niezależny przychód (bez spłaty)',
      'Od domownika: Marek – zaliczka na przyszłość (bez spłaty)'
    ])
    // The switch „spłata / niezależny przychód / zaliczka” beside the list named the same choice otherwise (IM sp. 4).
    await expect(g.getByRole('radiogroup', { name: 'Cel wpłaty domownika' })).toHaveCount(0)
    await kind.selectOption(`household:${MAREK}:all-advance`)
    await expect(g.getByTestId('import-group-skips-debt')).toHaveText('Marek ma oddać 300,00 zł – zaliczka na przyszłość tego nie spłaci')
    await kind.selectOption(`household:${MAREK}:advance`)
    await expect(g.getByTestId('import-group-skips-debt')).toHaveCount(0)
    await page.getByTestId('import-search').fill('')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect
      .poll(async () => (await records(dataDir, 'transactions')).filter((t) => t.counterparty === 'MAREK TESTOWY' && t.bank).map((t) => [t.amount, t.inflowKind, t.advance, t.covers]))
      .toEqual([[zl(500), 'repay', true, [MEDIA]]])
    // His debt paid back, the rest his advance – both on the Mostek as they are.
    await page.keyboard.press('Control+1')
    await expect(bridgeMarek).not.toContainText('ma oddać')
    await expect(bridgeMarek.getByTestId('bridge-member-deposit')).toHaveText('zaliczka – czeka na wydatki200,00 zł')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
