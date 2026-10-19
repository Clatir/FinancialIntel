import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const HOME = '01KDEFCAT00000000000000200'
const PETS = '01KDEFCAT00000000000000400'
const RENT = '01KSEEDCARG000000000000001'

const undo = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text }).getByTestId('toast-action').click()

test('Liczby się zgadzają (1.5.2): cisza nocna w edytorze (N10), archiwizacja kategorii zdejmuje kopertę (N8), usunięty kontener oddaje płatności (B58) – oba z „Cofnij”', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -2)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-numbers-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month, salary: zl(5000), envelopes: { [PETS]: zl(300), [HOME]: zl(400) } }],
      containers: [{ id: RENT, name: 'Czynsz', amount: zl(900), cycleMonths: 1, dueMonth: month, dueDay: 1, categoryId: HOME, counterparty: 'WSPOLNOTA' }],
      transactions: [
        { date: `${addMonths(month, -1)}-01`, accountId: MBANK, amount: -zl(900), categoryId: HOME, counterparty: 'WSPOLNOTA', containerId: RENT },
        { date: today, accountId: MBANK, amount: -zl(900), categoryId: HOME, counterparty: 'WSPOLNOTA', containerId: RENT }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()

    // N10: an hour in the quiet hours asks for the log's entry; „usuń godzinę” = a purchase of the day typed later.
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    const amount = page.getByTestId('operation-amount')
    await amount.click()
    await amount.fill('25')
    await amount.press('Enter')
    const time = page.getByTestId('operation-time')
    await time.fill('23:40')
    await time.press('Enter')
    await expect(page.getByTestId('operation-night')).toBeVisible()
    await expect(page.getByTestId('operation-night-confirm')).toBeVisible()
    const typed = async () => (await records(dir, 'transactions')).find((t) => t.amount === -zl(25))
    await expect.poll(async () => (await typed())?.time).toBe('23:40')
    await page.getByTestId('operation-night-clear').click()
    await expect(page.getByTestId('operation-night-confirm')).toHaveCount(0)
    await expect.poll(async () => (await typed())?.time).toBeNull()
    // Bought at night after all: the entry confirms it.
    await time.fill('23:40')
    await time.press('Enter')
    await page.getByTestId('operation-log').fill('Apteka całodobowa')
    await page.getByTestId('operation-log').press('Tab')
    await expect(page.getByTestId('operation-night-confirm')).toHaveCount(0)
    await expect.poll(async () => (await typed())?.logNote).toBe('Apteka całodobowa')

    // N8: an archived category leaves the plan of this month – „Cofnij” brings both back.
    const plan = async () => (await records(dir, 'months')).find((p) => p.month === month)?.envelopes as Record<string, number> | undefined
    const pets = async () => (await json(join(dir, 'fi.json'))).settings.categories.find((c: { id: string }) => c.id === PETS)?.archived
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-categories').click()
    await page.locator('[data-testid="category-row"][data-name="Zwierzęta"]').getByTestId('category-archive').click()
    await expect.poll(pets).toBe(true)
    await expect.poll(plan).toEqual({ [HOME]: zl(400) })
    await undo(page, 'Zarchiwizowano „Zwierzęta”')
    await expect.poll(pets).toBe(false)
    await expect.poll(plan).toEqual({ [HOME]: zl(400), [PETS]: zl(300) })

    // B58: a deleted container lets its payments go (ordinary expenses again); „Cofnij” links them again.
    const linked = async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'WSPOLNOTA').map((t) => t.containerId)
    await page.keyboard.press('Control+5')
    await page.locator('[data-testid="cargo-row"][data-name="Czynsz"]').click()
    await page.getByTestId('container-delete').click()
    await page.getByTestId('container-delete-confirm').click()
    await expect(page.getByRole('status').filter({ hasText: 'Usunięto kontener „Czynsz”' })).toContainText('płatności (2)')
    await expect.poll(async () => (await records(dir, 'containers')).length).toBe(0)
    await expect.poll(linked).toEqual([null, null])
    await undo(page, 'Usunięto kontener „Czynsz”')
    await expect(page.locator('[data-testid="cargo-row"][data-name="Czynsz"]')).toBeVisible()
    await expect.poll(linked).toEqual([RENT, RENT])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Dokowanie (1.5.2): wypłata z inną kwotą w banku dzieli kwotę z banku – zapisany podział się zgadza (B22, B59)', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const tmp = mkdtempSync(join(tmpdir(), 'fi-numbers-dock-'))
  const put = (root: string, rel: string, data: unknown) => {
    const file = join(root, rel)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
  }
  const ictj = join(tmp, 'ICTJ')
  const W1 = '01KPAY00000000000000000001'
  put(ictj, 'journal.json', { schemaVersion: 1, settings: {} })
  put(ictj, `payouts/${today.slice(0, 4)}/${today}_${W1}.json`, {
    schemaVersion: 1,
    id: W1,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    kind: 'withdrawal',
    date: today,
    amount: 1000,
    pool: 'current',
    note: '',
    categoryId: null,
    goal: null
  })
  const appData = join(tmp, 'AppData')
  put(appData, 'ICT Trade Journal/config.json', { dataDir: ictj })
  const dataDir = join(tmp, 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, layers: { ...s.layers, assumedCosts: zl(3000) } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: {} }],
      // 995 zł in the bank for 1 000 zł in ICTTJ (a conversion, a fee): paired as a near amount.
      transactions: [{ date: today, accountId: MBANK, kind: 'trading', amount: zl(995), counterparty: 'XTB S.A.' }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir, env: { FI_ICTJ_APPDATA: appData, FI_ICTJ_LAUNCH: 'dry' } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-ictj').click()
    await page.getByTestId('ictj-use-suggested').click()
    await expect(page.getByTestId('ictj-status')).toHaveText('czytany')
    await page.keyboard.press('Control+1')
    const row = page.locator('[data-testid="docking-row"]').filter({ hasText: '1 000,00' })
    await row.click()
    await expect(page.getByTestId('docking-near')).toBeVisible()
    // The split of the bank's 995 zł: 100 zł to the hull, the rest to the shields.
    const hull = page.getByTestId('docking-hull')
    await hull.click()
    await hull.fill('100')
    await hull.press('Enter')
    await expect(page.getByTestId('docking-shields')).toHaveText('895,00 zł')
    await page.getByTestId('docking-confirm').click()
    await expect(page.getByTestId('docking-dialog')).toHaveCount(0)
    await expect.poll(async () => (await records(dir, 'dockings')).map((d) => d.split)).toEqual([{ shields: zl(895), hull: zl(100), goals: {}, taxHold: 0 }])
    // Opened again: the split as saved – no „amount changed after docking”.
    await row.click()
    await expect(page.getByTestId('docking-shields')).toHaveText('895,00 zł')
    await expect(page.getByTestId('docking-hull')).toHaveValue('100,00')
    await expect(page.getByTestId('docking-split-fitted')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
