import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const MAMA = '01KMEMMAMA0000000000000001'
const TATA = '01KMEMTATA0000000000000002'
const BABCIA = '01KMEMBABC0000000000000003'
const DZIADEK = '01KMEMDZDK0000000000000004'

type Line = { memberId: string | null; value: number; gift: boolean }
type Part = { amount: number; refundable: boolean; memberId: string | null; gift?: boolean }
type Op = { counterparty: string; amount: number; refundable: boolean; memberId: string | null; gift?: boolean; share?: { mode: string; lines: Line[] } | null; splits: Part[] }

const operations = async (dataDir: string) => (await records(dataDir, 'transactions')) as unknown as Op[]
const opOf = async (dataDir: string, counterparty: string) => (await operations(dataDir)).find((t) => t.counterparty === counterparty)
/** What the engine reads of a shared purchase: each line's amount, whose, a gift. */
const partsOf = (t: Op | undefined) => t?.splits.map((s) => [s.amount, s.refundable, s.memberId, !!s.gift])

async function typeAmount(page: Page, target: string | Locator, text: string) {
  const field = typeof target === 'string' ? page.getByTestId(target) : target
  await field.click()
  await field.fill(text)
  await field.press('Enter')
}

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

test('Wspólne finansowanie (D83): kilka osób równo i procentami, prezent babci i dziadka, nowa kwota, szybki wpis z zaliczki taty, zaznaczone hurtem, Mostek', async () => {
  const { date: today, month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-shared-')), 'FinancialIntel')
  const person = (id: string, name: string, deposit = 0) => ({ id, name, bankNames: [], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit } })
  seedFolder(dataDir, {
    // Settlements from the budget's start; Tata left an advance of 100 zł then.
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      household: { ...s.household, since: null, members: [...s.household.members, person(MAMA, 'Mama'), person(TATA, 'Tata', zl(100)), person(BABCIA, 'Babcia'), person(DZIADEK, 'Dziadek')] }
    }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(10000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }],
      transactions: [
        { date: today, accountId: ACC, amount: -zl(60), categoryId: GROCERIES, counterparty: 'Rossmann' },
        { date: today, accountId: ACC, amount: -zl(40), categoryId: GROCERIES, counterparty: 'Apteka' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()

    // A purchase paid together: me and Mama equally – one category, each one's part.
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.keyboard.press('Control+n')
    await typeAmount(page, 'operation-amount', '300')
    await page.getByTestId('operation-counterparty').fill('Biedronka')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await page.getByTestId('operation-share-start').click()
    const share = page.getByTestId('operation-share')
    await expect(share.getByTestId('operation-share-line')).toHaveCount(2)
    await share.getByTestId('operation-share-person').nth(1).selectOption({ label: 'Mama' })
    await expect(share.getByTestId('operation-share-part')).toHaveText(['150,00 zł', '150,00 zł'])
    await expect.poll(async () => partsOf(await opOf(dir, 'Biedronka'))).toEqual([
      [-zl(150), false, null, false],
      [-zl(150), true, MAMA, false]
    ])

    // Babcia joins with a gift: three equal parts, then by percents (20 / 50 / 30).
    await share.getByTestId('operation-share-add').click()
    await share.getByTestId('operation-share-person').nth(2).selectOption({ label: 'Babcia' })
    await share.getByTestId('operation-share-gift').nth(1).check()
    await expect(share.getByTestId('operation-share-part')).toHaveText(['100,00 zł', '100,00 zł', '100,00 zł'])
    await share.getByRole('radio', { name: 'procenty' }).click()
    await expect(share.getByTestId('operation-share-sum')).toHaveText('razem 100 %')
    await typeAmount(page, share.getByTestId('operation-share-percent').nth(0), '20')
    await typeAmount(page, share.getByTestId('operation-share-percent').nth(1), '50')
    await expect(share.getByTestId('operation-share-sum')).toContainText('ostatnia osoba bierze resztę do 100 %')
    await typeAmount(page, share.getByTestId('operation-share-percent').nth(2), '30')
    await expect(share.getByTestId('operation-share-sum')).toHaveText('razem 100 %')
    await expect(share.getByTestId('operation-share-part')).toHaveText(['60,00 zł', '150,00 zł', '90,00 zł'])
    await expect
      .poll(async () => {
        const t = await opOf(dir, 'Biedronka')
        return [t?.share?.mode, t?.share?.lines.map((l) => [l.memberId, l.value, l.gift]), partsOf(t)]
      })
      .toEqual([
        'percent',
        [
          [null, 20, false],
          [MAMA, 50, false],
          [BABCIA, 30, true]
        ],
        [
          [-zl(60), false, null, false],
          [-zl(150), true, MAMA, false],
          [-zl(90), true, BABCIA, true]
        ]
      ])

    // A new amount: the parts follow the percents.
    await typeAmount(page, 'operation-amount', '400')
    await expect(share.getByTestId('operation-share-part')).toHaveText(['80,00 zł', '200,00 zł', '120,00 zł'])
    await expect.poll(async () => partsOf(await opOf(dir, 'Biedronka'))).toEqual([
      [-zl(80), false, null, false],
      [-zl(200), true, MAMA, false],
      [-zl(120), true, BABCIA, true]
    ])
    // Mama owes her part; Babcia's gift is paid by the shields – nobody owes it.
    await expect(page.getByTestId('operation-financed')).toContainText('Mama: pożyczone z osłon 200,00 zł (ma oddać)')
    await expect(page.getByTestId('operation-financed')).toContainText('Babcia: prezent – z osłon 120,00 zł (nikt nic nie jest winien)')
    await expect(page.locator('[data-testid="operation-row"]', { hasText: 'Biedronka' })).toContainText('wspólnie: ja, Mama, Babcia (prezent)')
    await page.screenshot({ path: join('test-results', 'screens', '19-wspolnie.png') })

    // A gift of one person: „prezent od: Dziadek”.
    await page.getByTestId('operation-new').click()
    await typeAmount(page, 'operation-amount', '50')
    await page.getByTestId('operation-counterparty').fill('Kwiaciarnia')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await page.getByTestId('operation-financer').selectOption({ label: 'prezent od: Dziadek' })
    await expect(page.getByTestId('operation-financed')).toHaveText('Dziadek: prezent – z osłon 50,00 zł (nikt nic nie jest winien)')
    await expect.poll(async () => {
      const t = await opOf(dir, 'Kwiaciarnia')
      return [t?.amount, t?.refundable, t?.memberId, t?.gift]
    }).toEqual([-zl(50), true, DZIADEK, true])

    // The quick entry: a pizza with Tata, his half a gift – out of his advance first.
    const quick = await quickWindow(app, page)
    await quick.getByTestId('quick-amount').fill('90')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-counterparty').fill('Pizzeria')
    // Midday: not the quiet hours, whenever the test runs.
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-category').selectOption(GROCERIES)
    await quick.getByTestId('quick-joint-start').click()
    const joint = quick.getByTestId('quick-joint')
    await joint.getByTestId('quick-joint-person').nth(1).selectOption({ label: 'Tata' })
    await joint.getByTestId('quick-joint-gift').check()
    await expect(joint.getByTestId('quick-joint-part')).toHaveText(['45,00 zł', '45,00 zł'])
    await expect(quick.getByTestId('quick-preview-financed')).toHaveText('Prezent od Tata: 45,00 zł – nie zjada energii; z zaliczki 45,00 zł.')
    await quick.getByTestId('quick-save').click()
    await expect
      .poll(async () => {
        const t = await opOf(dir, 'Pizzeria')
        return [t?.amount, t?.share?.mode, partsOf(t)]
      })
      .toEqual([
        -zl(90),
        'equal',
        [
          [-zl(45), false, null, false],
          [-zl(45), true, TATA, true]
        ]
      ])

    // Ticked at once: Rossmann and Apteka – with Mama, equally.
    for (const name of ['Rossmann', 'Apteka']) await page.locator('[data-testid="operation-row"]', { hasText: name }).getByTestId('operation-tick').check()
    await page.getByTestId('operations-bulk-financer').selectOption('share')
    const bulk = page.getByTestId('operations-bulk-share')
    await bulk.getByTestId('operations-bulk-share-person').nth(1).selectOption({ label: 'Mama' })
    // Percents not summing to 100 % are not applied (the quick entry refuses them too).
    await bulk.getByRole('radio', { name: 'procenty' }).click()
    await typeAmount(page, bulk.getByTestId('operations-bulk-share-percent').nth(0), '30')
    await typeAmount(page, bulk.getByTestId('operations-bulk-share-percent').nth(1), '30')
    await expect(page.getByTestId('operations-bulk-finance')).toBeDisabled()
    await bulk.getByRole('radio', { name: 'równo' }).click()
    await page.getByTestId('operations-bulk-finance').click()
    await expect.poll(async () => [partsOf(await opOf(dir, 'Rossmann')), partsOf(await opOf(dir, 'Apteka'))]).toEqual([
      [
        [-zl(30), false, null, false],
        [-zl(30), true, MAMA, false]
      ],
      [
        [-zl(20), false, null, false],
        [-zl(20), true, MAMA, false]
      ]
    ])
    await expect(page.locator('[data-testid="operation-row"]', { hasText: 'Rossmann' })).toContainText('wspólnie: ja, Mama')

    // Mostek: Mama owes her parts (200 + 30 + 20); Tata's advance paid his gift; the gifts are nobody's debt.
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('bridge-house')).toHaveText('250,00 zł')
    await expect(page.getByTestId('state-deposit')).toContainText('55,00 zł')
    const bridgeMember = (name: string) => page.locator('[data-testid="bridge-member"]', { hasText: name })
    await expect(bridgeMember('Mama')).toContainText('250,00 zł')
    await expect(bridgeMember('Babcia')).toHaveCount(0)
    await expect(bridgeMember('Dziadek')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
