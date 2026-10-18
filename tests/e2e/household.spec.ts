import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const MAMA = '01KMEMMAMA0000000000000001'
const TATA = '01KMEMTATA0000000000000002'

type Member = { id: string; name: string; bankNames: string[]; inflow: string; archived: boolean }
const members = async (dataDir: string): Promise<Member[]> => (await json(join(dataDir, 'fi.json'))).settings.household.members
const operations = (dataDir: string) => records(dataDir, 'transactions')

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

test('Domownicy (D80): osoba w ustawieniach, wydatek „finansuje”, wpłata z zaliczką, zaznaczone hurtem, szybki wpis, Mostek, Radar, debriefing', async () => {
  const { date: today, month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-household-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start },
      household: { since: start, members: [...s.household.members, { id: MAMA, name: 'Mama', bankNames: ['ANNA TESTOWA'], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 } }] }
    }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }],
      transactions: [
        // Bought for Mama last month and not paid back yet: the debriefing shows it apart from my costs.
        { date: start, accountId: ACC, amount: -zl(60), categoryId: GROCERIES, counterparty: 'Apteka', refundable: true, memberId: MAMA },
        // Mine at first – ticked later as financed by Tata.
        { date: today, accountId: ACC, amount: -zl(50), categoryId: GROCERIES, counterparty: 'Rossmann' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    // Mostek: Mama owes for last month's purchase; no advances yet.
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const bridgeMember = (name: string) => page.locator('[data-testid="bridge-member"]', { hasText: name })
    await expect(bridgeMember('Mama')).toContainText('ma oddać')
    await expect(bridgeMember('Mama')).toContainText('60,00 zł')
    await expect(page.getByTestId('bridge-house')).toHaveText('60,00 zł')
    await expect(page.getByTestId('state-deposit')).toHaveCount(0)

    // Settings → Domownicy: a new member, his name in the bank, his money beyond his debt as income.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-household').click()
    await expect(page.getByTestId('member-row')).toHaveCount(2)
    await expect(page.locator('[data-testid="member-row"][data-name="Mama"]').getByTestId('member-balance')).toHaveText('ma oddać 60,00 zł')
    await page.getByTestId('member-add').click()
    const added = page.locator('[data-testid="member-row"][data-name="Domownik"]')
    await added.getByTestId('member-name').fill('Tata')
    await added.getByTestId('member-name').press('Enter')
    const tata = page.locator('[data-testid="member-row"][data-name="Tata"]')
    await tata.getByTestId('member-bank-input').fill('PIOTR TESTOWY')
    await tata.getByTestId('member-bank-input').press('Enter')
    await expect(tata.getByTestId('member-bank-name')).toContainText('PIOTR TESTOWY')
    await tata.getByRole('radio', { name: 'przychód' }).click()
    await expect
      .poll(async () => (await members(dir)).map((m) => [m.name, m.bankNames, m.inflow]))
      .toEqual([
        ['Dom', [], 'ask'],
        ['Mama', ['ANNA TESTOWA'], 'advance'],
        ['Tata', ['PIOTR TESTOWY'], 'income']
      ])
    const TATA = (await members(dir)).find((m) => m.name === 'Tata')!.id
    await page.screenshot({ path: join('test-results', 'screens', '14-domownicy-ustawienia.png') })

    // A purchase Tata finances: not my cost – the shields lend it until he pays.
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.keyboard.press('Control+n')
    await typeAmount(page, 'operation-amount', '300')
    await page.getByTestId('operation-counterparty').fill('Lidl')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await page.getByTestId('operation-financer').selectOption({ label: 'finansuje: Tata' })
    await expect(page.getByTestId('operation-financed')).toHaveText('Tata: pożyczone z osłon 300,00 zł (ma oddać)')
    await expect.poll(async () => (await operations(dir)).filter((t) => t.counterparty === 'Lidl').map((t) => [t.amount, t.refundable, t.memberId])).toEqual([[-zl(300), true, TATA]])

    // His transfer pays back what he owes first; the rest – this time – his advance (the deposit, not my money).
    await page.getByTestId('operation-new').click()
    await page.getByRole('radio', { name: 'Wpływ' }).click()
    await typeAmount(page, 'operation-amount', '500')
    await page.getByTestId('operation-counterparty').fill('PIOTR TESTOWY')
    await page.getByTestId('operation-payer').selectOption({ label: 'Tata' })
    await expect(page.getByTestId('operation-member-flow')).toHaveText('spłaca 300,00 zł · przychód 200,00 zł')
    await page.getByTestId('operation-member-income').getByRole('radio', { name: 'zaliczka' }).click()
    await expect(page.getByTestId('operation-member-flow')).toHaveText('spłaca 300,00 zł · zaliczka 200,00 zł')
    await expect(page.getByTestId('operation-member-balance')).toHaveText('Tata teraz: zaliczka 200,00 zł')
    await page.screenshot({ path: join('test-results', 'screens', '15-domownik-wplata.png') })
    await expect.poll(async () => (await operations(dir)).filter((t) => t.kind === 'income').map((t) => [t.amount, t.memberId, t.advance])).toEqual([[zl(500), TATA, true]])
    // His answer in the settings stays (it was given there, not asked).
    expect((await members(dir)).find((m) => m.id === TATA)?.inflow).toBe('income')

    // Rossmann was mine: ticked and set as Tata's – his money pays it.
    await page.locator('[data-testid="operation-row"]', { hasText: 'Rossmann' }).getByTestId('operation-tick').check()
    await page.getByTestId('operations-bulk-financer').selectOption({ label: 'Tata' })
    await page.getByTestId('operations-bulk-finance').click()
    await expect.poll(async () => (await operations(dir)).filter((t) => t.counterparty === 'Rossmann').map((t) => [t.refundable, t.memberId])).toEqual([[true, TATA]])
    await expect(page.locator('[data-testid="operation-row"]', { hasText: 'Rossmann' })).toContainText('domownik')

    // The quick entry: a purchase for Mama – not today's energy, the shields lend it.
    const quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Za domownika' }).click()
    await quick.getByTestId('quick-amount').fill('40')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-counterparty').fill('Apteka')
    // Midday: not the quiet hours, whenever the test runs.
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-financer').selectOption({ label: 'Mama' })
    await expect(quick.getByTestId('quick-preview-financed')).toHaveText('Finansuje Mama: 40,00 zł – nie zjada energii; pożyczają osłony 40,00 zł, ma oddać.')
    await expect(quick.getByTestId('quick-preview-energy')).toHaveCount(0)
    await quick.getByTestId('quick-save').click()
    await expect.poll(async () => (await operations(dir)).filter((t) => t.amount === -zl(40)).map((t) => [t.date, t.refundable, t.memberId])).toEqual([[today, true, MAMA]])

    // Mostek: Tata's advance in the deposit (a layer of its own), Mama owes 100 zł.
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('state-deposit')).toContainText('150,00 zł')
    await expect(bridgeMember('Tata')).toContainText('zaliczka – czeka na wydatki')
    await expect(bridgeMember('Tata')).toContainText('150,00 zł')
    await expect(bridgeMember('Mama')).toContainText('100,00 zł')
    await expect(page.getByTestId('bridge-house')).toHaveText('100,00 zł')
    await expect(page.locator('[data-testid="bridge-recent-row"]', { hasText: 'Lidl' })).toContainText('finansuje: Tata')
    await expect(page.locator('[data-testid="bridge-recent-row"]', { hasText: 'PIOTR TESTOWY' })).toContainText('od: Tata')
    await page.screenshot({ path: join('test-results', 'screens', '13-domownicy-mostek.png') })

    // Radar: each member's balance, the total owed.
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    await expect(page.locator('[data-testid="radar-member"]', { hasText: 'Mama' })).toContainText('ma oddać')
    await expect(page.locator('[data-testid="radar-member"]', { hasText: 'Mama' })).toContainText(`najstarszy zakup z ${start.slice(8, 10)}.${start.slice(5, 7)}.${start.slice(0, 4)}`)
    await expect(page.locator('[data-testid="radar-member"]', { hasText: 'Tata' })).toContainText('zaliczka (depozyt)')
    await expect(page.getByTestId('radar-house')).toHaveText('100,00 zł')

    // The debriefing of last month: what Mama financed apart from my costs.
    await page.keyboard.press('Control+4')
    await expect(page.getByTestId('page-month')).toBeVisible()
    await expect(page.getByTestId('debrief-financed')).toContainText('Sfinansowane przez domowników (Mama)')
    await expect(page.getByTestId('debrief-financed')).toContainText('60,00 zł')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Domownicy bez bankowości (D81): rozliczenia od dziś z saldem na start, „+ także za”, „w tym za” w szybkim wpisie, przychody z pracy i XTB', async () => {
  const { date: today, month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-household-d81-')), 'FinancialIntel')
  const person = (id: string, name: string, bankNames: string[]) => ({ id, name, bankNames, inflow: 'income', archived: false, via: null, opening: { owed: 0, deposit: 0 } })
  seedFolder(dataDir, {
    // No settlements' date: the app takes today, once.
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { members: [...s.household.members, person(MAMA, 'Mama', []), person(TATA, 'Tata', ['PIOTR TESTOWY'])] } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }],
      transactions: [
        // Last month: the salary, XTB (5 000 out, 3 000 back – 2 000 net), Tata's money before the settlements, a purchase for Mama.
        { date: `${prev}-10`, accountId: ACC, kind: 'income', amount: zl(4000), counterparty: 'Pracodawca' },
        { date: `${prev}-12`, accountId: ACC, kind: 'trading', amount: zl(5000), counterparty: 'XTB' },
        { date: `${prev}-20`, accountId: ACC, kind: 'trading', amount: -zl(3000), counterparty: 'XTB' },
        { date: `${prev}-15`, accountId: ACC, kind: 'income', amount: zl(800), counterparty: 'PIOTR TESTOWY' },
        { date: `${prev}-05`, accountId: ACC, amount: -zl(90), categoryId: GROCERIES, counterparty: 'Apteka', refundable: true, memberId: MAMA }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    // The settlements from today: what Mama owed until yesterday (last month's purchase) is her opening balance; Tata's
    // money then is not income.
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.household.since).toBe(today)
    await expect.poll(async () => ((await members(dir)).find((m) => m.id === MAMA) as unknown as { opening: unknown }).opening).toEqual({ owed: zl(90), deposit: 0 })
    await expect(page.getByTestId('bridge-house')).toHaveText('90,00 zł')
    const income = page.getByTestId('bridge-income')
    await expect(income.getByTestId('income-work-6')).toHaveText('4 000,00 zł')
    await expect(income.getByTestId('income-trading-6')).toHaveText('2 000,00 zł')
    await expect(income.getByTestId('income-total-6')).toHaveText('6 000,00 zł')
    await expect(income.getByTestId('income-vs-salary')).toContainText('2 000,00 zł / mies.')

    // Settings: what Mama owed before the date as her opening balance; her money comes through Tata.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-household').click()
    await expect(page.getByTestId('household-since')).toHaveValue(`${today.slice(8, 10)}.${today.slice(5, 7)}.${today.slice(0, 4)}`)
    const mama = page.locator('[data-testid="member-row"][data-name="Mama"]')
    await typeAmount(page, mama.getByTestId('member-opening'), '150')
    await mama.getByTestId('member-via').selectOption({ label: 'Tata' })
    await expect
      .poll(async () => (await members(dir)).find((m) => m.id === MAMA) as unknown as { opening: unknown; via: unknown })
      .toMatchObject({ opening: { owed: zl(150), deposit: 0 }, via: TATA })
    await page.screenshot({ path: join('test-results', 'screens', '17-domownicy-start.png') })

    // Tata's transfer carries Mama's money: „+ także za Mama” – her part pays her opening balance, the rest is his.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByRole('radio', { name: 'Wpływ' }).click()
    await typeAmount(page, page.getByTestId('operation-amount'), '500')
    await page.getByTestId('operation-counterparty').fill('PIOTR TESTOWY')
    await page.getByTestId('operation-payer').selectOption({ label: 'Tata' })
    await expect(page.getByTestId('operation-also-for')).toHaveText('+ także za Mama (ma oddać 150,00 zł)')
    await page.getByTestId('operation-also-for').click()
    await expect(page.getByTestId('income-split-amount')).toHaveValue('150,00')
    await expect(page.getByTestId('income-split-rest')).toHaveText('Reszta 350,00 zł – Tata.')
    await expect(page.getByTestId('operation-member-flow')).toContainText('Mama: spłaca 150,00 zł')
    await expect(page.getByTestId('operation-member-flow')).toContainText('Tata: przychód 350,00 zł')
    await page.screenshot({ path: join('test-results', 'screens', '18-podzial-wplaty.png') })
    await expect
      .poll(async () => (await operations(dir)).filter((t) => t.amount === zl(500)).map((t) => [t.memberId, (t.splits as Array<{ memberId: string; amount: number }>).map((x) => [x.memberId, x.amount])]))
      .toEqual([[TATA, [[MAMA, zl(150)]]]])

    // The quick entry: „w tym za Mama” at Tata's money.
    const quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Wpływ' }).click()
    await quick.getByTestId('quick-amount').fill('300')
    await quick.getByTestId('quick-amount').press('Tab')
    await quick.getByTestId('quick-payer').selectOption({ label: 'Tata' })
    await quick.getByTestId('quick-share').fill('100')
    await quick.getByTestId('quick-share').press('Tab')
    await expect(quick.getByTestId('quick-preview-share')).toContainText('W tym za: Mama')
    await quick.getByTestId('quick-save').click()
    await expect
      .poll(async () => (await operations(dir)).filter((t) => t.amount === zl(300)).map((t) => [t.memberId, (t.splits as Array<{ memberId: string; amount: number }>).map((x) => [x.memberId, x.amount])]))
      .toEqual([[TATA, [[MAMA, zl(100)]]]])

    // Mostek: Mama paid her opening balance; the panel of income on the month's plan too.
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('bridge-house')).toHaveText('0,00 zł')
    await page.keyboard.press('Control+4')
    await expect(page.getByTestId('income-panel').getByTestId('income-total-6')).toHaveText('6 000,00 zł')
    await page.screenshot({ path: join('test-results', 'screens', '16-przychody.png') })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

