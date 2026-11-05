// AP-41 (R2, T480): the taken loans' payoff plan on the phone's Radar – the computer's panel on the screen's width (the
// Radar is the computer's screen, D98 adds nothing phone-only): an overpayment counts, the interest goes to OneDrive.
import { expect, test, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { startPhoneServer, seedDrive, zl, type PhoneServer } from './server'

const FOLDER = 'FinancialIntel'
const CLIENT = '0a1b2c3d-1111-2222-3333-444455556666'
const ACC = '01KDEFACC00000000000000001'
const LAPTOP = '01KR2PAYPH0000000000000001'

let srv: PhoneServer
let month: string

test.beforeEach(async ({ page }) => {
  srv = await startPhoneServer()
  ;({ month } = warsawNow())
  const start = `${addMonths(month, -1)}-01`
  seedDrive(srv.drive, FOLDER, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: {}, loot: { decidedAt: new Date().toISOString() } }],
      // 2 × 204 zł at 24 % (the unit example): principal 396,08 zł, interest 7,92 + 4,00 zł by the schedule.
      loans: [
        {
          id: LAPTOP,
          name: 'Kredyt na laptop',
          direction: 'taken',
          counterparty: 'Sklep',
          amount: zl(396.08),
          date: start,
          accountId: ACC,
          rate: 24,
          schedule: [0, 1].map((n) => ({ id: `01KR2PAYPHS00000000000000${n}`, date: `${addMonths(month, n)}-28`, amount: zl(204) }))
        }
      ]
    }
  })
  await page.addInitScript((cfg) => {
    window.__FI_PHONE_TEST__ = cfg
  }, { graphBase: `${srv.url}/v1.0`, authority: `${srv.url}/v1.0`, version: '1.17.0-test' })
  page.on('pageerror', (e) => console.error('pageerror', e))
})

test.afterEach(async () => {
  await srv.close()
})

async function connect(page: Page): Promise<void> {
  await page.goto(`${srv.url}/index.html`)
  await page.getByTestId('phone-client-id').fill(CLIENT)
  await page.getByTestId('phone-signin').click()
  await page.getByTestId('phone-folder-connect').click()
  await expect(page.getByTestId('page-bridge')).toBeVisible()
}

function driveRecords(dir: string): Array<Record<string, unknown>> {
  return srv.drive
    .files(FOLDER)
    .filter((f) => f.startsWith(`${dir}/`))
    .map((f) => JSON.parse(srv.drive.read(`${FOLDER}/${f}`)!) as Record<string, unknown>)
}

const mmyyyy = (m: string) => `${m.slice(5, 7)}.${m.slice(0, 4)}`

test('Plan spłaty pożyczek na telefonie: panel Radaru na szerokość ekranu, nadpłata 200 zł spłaca w tym miesiącu, oprocentowanie idzie na OneDrive', async ({ page }) => {
  await connect(page)
  await page.getByTestId('phone-nav-more').click()
  await page.getByTestId('phone-more-radar').click()
  await expect(page.getByTestId('page-radar')).toBeVisible()
  const panel = page.getByTestId('radar-payoff')
  await panel.scrollIntoViewIfNeeded()
  const cells = (testId: string) => panel.getByTestId(testId).locator('td')
  await expect(cells('radar-payoff-end')).toHaveText(['Spłata wszystkich', mmyyyy(addMonths(month, 1))])
  await expect(cells('radar-payoff-interest')).toHaveText(['Odsetki (zł)', '11,92'])

  // 200 zł more this month: the installment and 200 zł – paid off now, 4,00 zł of interest less.
  const extra = panel.getByTestId('radar-payoff-extra')
  await extra.click()
  await extra.fill('200')
  await extra.press('Enter')
  await expect(cells('radar-payoff-end')).toHaveText(['Spłata wszystkich', mmyyyy(addMonths(month, 1)), mmyyyy(month), mmyyyy(month)])
  await expect(cells('radar-payoff-less')).toHaveText(['Mniej odsetek (zł)', '—', '4,00', '4,00'])
  // Everything within the screen's width: no table wider than the phone.
  const width = page.viewportSize()!.width
  for (const id of ['radar-payoff', 'radar-payoff-loans', 'radar-payoff-compare', 'radar-payoff-months']) {
    const box = (await panel.page().getByTestId(id).boundingBox())!
    expect(box.x + box.width, id).toBeLessThanOrEqual(width)
  }

  // The interest typed on the phone: the loan's field, sent to OneDrive (Enter – a tap elsewhere keeps the focus on iOS).
  const rate = panel.getByTestId('radar-payoff-rate')
  await rate.click()
  await rate.fill('18')
  await rate.press('Enter')
  await expect.poll(() => driveRecords('loans').find((l) => l.id === LAPTOP)?.rate, { timeout: 20_000 }).toBe(18)
  // At 1,5 % a month: principal 399,00 zł (204 / 1,015 = 200,99; 404,99 / 1,015 = 399,00); the schedule 5,99 + 3,01 zł,
  // with 200 zł more 5,99 + 0,01 zł (0,99 zł left for next month).
  await expect(cells('radar-payoff-interest')).toHaveText(['Odsetki (zł)', '9,00', '6,00', '6,00'])
})
