// Z13 (1.21.0, UX-82, D106 pkt 11): „Rozliczenia z domownikami” in Radar – one place per member: the balance, the open
// purchases (their part, what is left), the money to assign (D91) with „Przypisz zwrot”, „Pokaż w Operacjach”, „Oddał(a)
// gotówką…” (a draft of their inflow in the editor – written on its first change); links from Mostek and Meldunki.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { CASH_ACCOUNT_ID, MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const GROCERIES = '01KDEFCAT00000000000000101'
const OLA = '01KZ13PERS0000000000000001'
const id = (n: number) => `01KZ13E2E${String(n).padStart(17, '0')}`
const BIEDRONKA = id(1)
const APTEKA = id(2)
const NAMED = id(3)
const WAITING = id(4)
const pl = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

type Op = { id: string; kind: string; amount: number; memberId: string | null; accountId: string; title: string; covers: string[] }

async function typeAmount(page: Page, text: string): Promise<void> {
  const field = page.getByTestId('operation-amount')
  await field.click()
  await field.fill(text)
  await field.press('Enter')
}

test('UX-82: rozliczenia z domownikiem w Radarze – saldo, zakupy, „Przypisz zwrot”, „Pokaż w Operacjach”, „Oddał(a) gotówką…”, przejścia z Mostka i Meldunków', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const day = (n: number) => addDays(today, -n)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-z13-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      household: { ...s.household, since: start, assignFrom: start, members: [...s.household.members, { id: OLA, name: 'Ola', bankNames: ['OLA TESTOWA'], inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 } }] }
    }),
    records: {
      balances: [{ date: start, accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: zl(5000) }],
      transactions: [
        { id: BIEDRONKA, date: day(6), accountId: MBANK_ACCOUNT_ID, amount: -zl(80), categoryId: GROCERIES, counterparty: 'Biedronka', refundable: true, memberId: OLA },
        { id: APTEKA, date: day(4), accountId: MBANK_ACCOUNT_ID, amount: -zl(40), categoryId: GROCERIES, counterparty: 'Apteka', refundable: true, memberId: OLA },
        // 30 zł for Biedronka (named), 25 zł with no purchase named – waiting to be assigned (D91).
        { id: NAMED, date: day(2), accountId: MBANK_ACCOUNT_ID, kind: 'income', amount: zl(30), counterparty: 'OLA TESTOWA', memberId: OLA, inflowKind: 'repay', covers: [BIEDRONKA] },
        { id: WAITING, date: day(1), accountId: MBANK_ACCOUNT_ID, kind: 'income', amount: zl(25), counterparty: 'OLA TESTOWA', memberId: OLA, inflowKind: 'repay' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  const operations = async () => (await records(dir, 'transactions')) as unknown as Op[]
  try {
    // Mostek: „rozlicz na Radarze ›” – the panel of the people.
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.getByTestId('bridge-settlements').click()
    await expect(page.getByTestId('page-radar')).toBeVisible()
    const panel = page.getByTestId('radar-settlements')
    await expect(panel).toBeVisible()
    const ola = panel.locator('[data-testid="radar-member"][data-member="Ola"]')
    // 80 + 40 − 30 named − 25 waiting.
    await expect(ola.getByTestId('radar-member-balance')).toHaveText('ma oddać 65,00 zł')
    await expect(ola).toContainText(`najstarszy zakup z ${pl(day(6))}`)
    const purchases = ola.getByTestId('radar-member-purchase')
    await expect(purchases).toHaveCount(2)
    await expect(purchases.nth(0)).toContainText(pl(day(6)))
    await expect(purchases.nth(0)).toContainText('Biedronka')
    await expect(purchases.nth(0)).toContainText('80,00 zł')
    await expect(purchases.nth(0).getByTestId('radar-member-left')).toHaveText('50,00 zł')
    await expect(purchases.nth(1).getByTestId('radar-member-left')).toHaveText('40,00 zł')
    await expect(ola.getByTestId('radar-member-unassigned')).toContainText(`zwrot do przypisania: 25,00 zł z ${pl(day(1))}`)

    // „Przypisz zwrot”: the waiting repayment's editor – it pays Apteka.
    await ola.getByTestId('radar-member-assign').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.locator('[data-testid="repayment-member"][data-member="Ola"] label', { hasText: 'Apteka' }).getByTestId('operation-cover').check()
    await expect.poll(async () => (await operations()).find((t) => t.id === WAITING)?.covers).toEqual([APTEKA])
    await page.keyboard.press('Control+7')
    await expect(ola.getByTestId('radar-member-unassigned')).toHaveCount(0)
    await expect(purchases.nth(1).getByTestId('radar-member-left')).toHaveText('15,00 zł')
    await expect(ola.getByTestId('radar-member-balance')).toHaveText('ma oddać 65,00 zł')

    // A purchase opens in Operacje – its own editor says what is paid back.
    await purchases.filter({ hasText: 'Biedronka' }).click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('purchase-repaid-status')).toHaveText('Ola: oddane 30,00 z 80,00 zł · do oddania 50,00 zł')

    // „Pokaż w Operacjach”: all of hers, the whole history.
    await page.keyboard.press('Control+7')
    await ola.getByTestId('radar-member-operations').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-row')).toHaveCount(4)

    // Meldunki: „Rozlicz” at „Ola: do oddania” – her block in Radar, marked.
    await page.keyboard.press('Control+Shift+M')
    await expect(page.getByTestId('page-inbox')).toBeVisible()
    await page.locator('[data-testid="inbox-item"][data-kind="refunds"]', { hasText: 'Ola' }).getByTestId('inbox-settle').click()
    await expect(page.getByTestId('page-radar')).toBeVisible()
    await expect(ola).toHaveClass(/focus-mark/)

    // „Oddał(a) gotówką…”: a new inflow of hers in the editor – on the cash, nothing written until the amount is typed.
    await ola.getByTestId('radar-member-repay').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-editor-title')).toHaveText('Nowa operacja')
    await expect(page.getByTestId('operation-payer')).toHaveValue(OLA)
    await expect(page.getByTestId('operation-account')).toHaveValue(CASH_ACCOUNT_ID)
    expect(await operations()).toHaveLength(4)
    await typeAmount(page, '65')
    await expect
      .poll(async () => (await operations()).filter((t) => t.kind === 'income' && t.accountId === CASH_ACCOUNT_ID).map((t) => [t.amount, t.memberId, t.title]))
      .toEqual([[zl(65), OLA, 'Zwrot gotówką: Ola']])
    // All she owes – the editor's sure match (D91 b): both purchases.
    await page.getByTestId('repayment-offer').filter({ hasText: 'Pasuje' }).click()
    await expect
      .poll(async () => (await operations()).find((t) => t.kind === 'income' && t.accountId === CASH_ACCOUNT_ID)?.covers.slice().sort())
      .toEqual([BIEDRONKA, APTEKA].sort())

    // Settled: nobody left in the panel.
    await page.keyboard.press('Control+7')
    await expect(panel.getByTestId('radar-member')).toHaveCount(0)
    await expect(panel).toContainText('Wszyscy rozliczeni')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
