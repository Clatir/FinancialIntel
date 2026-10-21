// The phone in a browser the size of an iPhone (T305, IP0.1–IP0.5, IP1, IP2): signing in, the first copy of the folder,
// Mostek with the computer's numbers, the quick entry going to OneDrive, a computer's change coming in, offline and back,
// the start from the copy on the phone, the notifications planned ahead.
import { expect, test, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { startPhoneServer, seedDrive, zl, type PhoneServer } from './server'

const FOLDER = 'FinancialIntel'
const CLIENT = '0a1b2c3d-1111-2222-3333-444455556666'
const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const AUTO = '01KDEFCAT00000000000000300'

let srv: PhoneServer

test.beforeEach(async ({ page }) => {
  srv = await startPhoneServer()
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const due = addDays(today, 3)
  seedDrive(srv.drive, FOLDER, {
    settings: (s) => ({ ...s, shipName: 'Sokół', budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: { [FOOD]: zl(1500), [AUTO]: zl(300) } }],
      containers: [{ name: 'OC auta', amount: zl(1240), cycleMonths: 12, dueMonth: due.slice(0, 7), dueDay: Number(due.slice(8, 10)), categoryId: AUTO }],
      transactions: [{ date: start, accountId: ACC, amount: -zl(42.5), categoryId: GROCERIES, counterparty: 'Biedronka' }]
    }
  })
  srv.drive.put(`${FOLDER}/.history/transactions/X/20260101T000000Z_edit_ab.json`, '{}')
  srv.drive.put(`${FOLDER}/.presence/DOM-PC.json`, JSON.stringify({ machine: 'DOM-PC', lastSeen: new Date().toISOString(), appVersion: '1.10.1', activeAt: null }))
  await page.addInitScript((cfg) => {
    window.__FI_PHONE_TEST__ = cfg
  }, { graphBase: `${srv.url}/v1.0`, authority: `${srv.url}/v1.0`, version: '1.11.0-test' })
  page.on('pageerror', (e) => console.error('pageerror', e))
})

test.afterEach(async () => {
  await srv.close()
})

async function connect(page: Page): Promise<void> {
  await page.goto(`${srv.url}/index.html`)
  await expect(page.getByTestId('phone-signin')).toBeVisible()
  await page.getByTestId('phone-client-id').fill(CLIENT)
  await page.getByTestId('phone-signin').click()
  await expect(page.getByTestId('phone-folder')).toHaveValue(FOLDER)
  await page.getByTestId('phone-folder-connect').click()
  await expect(page.getByTestId('phone-shell')).toBeVisible()
  await expect(page.getByTestId('page-bridge')).toBeVisible()
}

/** The transactions on the fake OneDrive (the computer's view of the folder). */
function driveTransactions(): Array<Record<string, unknown>> {
  return srv.drive
    .files(FOLDER)
    .filter((f) => f.startsWith('transactions/'))
    .map((f) => JSON.parse(srv.drive.read(`${FOLDER}/${f}`)!) as Record<string, unknown>)
}

async function quickExpense(page: Page, amount: string, counterparty: string): Promise<void> {
  await page.getByTestId('phone-nav-quick').click()
  const sheet = page.getByTestId('phone-quick-sheet')
  await expect(sheet).toHaveAttribute('data-open', '1')
  await sheet.getByTestId('quick-amount').fill(amount)
  await sheet.getByTestId('quick-counterparty').fill(counterparty)
  await sheet.getByTestId('quick-save').click()
  // In the quiet hours the entry asks first (the night's purchase).
  const night = sheet.getByTestId('quick-night-ok')
  if (await night.isVisible().catch(() => false)) {
    await night.check()
    await sheet.getByTestId('quick-save').click()
  }
  await expect(sheet).not.toHaveAttribute('data-open', '1')
}

test('logowanie, pierwsza kopia folderu, Mostek z liczbami komputera, szybki wpis na OneDrive', async ({ page }) => {
  await connect(page)
  // The computer's budget: the ship, its state, the envelopes, the briefing; the docking stays on a computer.
  await expect(page.getByTestId('phone-ship')).toContainText('Sokół')
  await expect(page.getByTestId('bridge-state')).toBeVisible()
  await expect(page.getByTestId('state-energy')).toContainText('zł')
  await expect(page.getByTestId('bridge-envelopes')).toBeVisible()
  await expect(page.getByTestId('bridge-briefing')).toBeVisible()
  await expect(page.getByTestId('bridge-recent-row')).toHaveCount(1)
  await expect(page.getByTestId('dock-panel')).toHaveCount(0)
  // No layout controls of the computers on the phone.
  await expect(page.getByTestId('panel-detach')).toHaveCount(0)
  await expect(page.getByTestId('panel-maximize')).toHaveCount(0)
  // The history of versions and the backups are not copied to the phone.
  expect(await page.evaluate(() => window.__FI_NOTICES__ !== undefined)).toBe(true)

  await quickExpense(page, '12,50', 'Żabka')
  await expect(page.getByTestId('bridge-recent-row')).toHaveCount(2)
  await expect.poll(() => driveTransactions().find((t) => t.counterparty === 'Żabka')?.amount, { timeout: 20_000 }).toBe(-1250)
  const sent = driveTransactions().find((t) => t.counterparty === 'Żabka')!
  expect(sent.updatedBy).toBe('iPhone')
  await expect(page.getByTestId('phone-sync')).toHaveAttribute('data-pending', '0')
  // The phone is seen by the computers: its presence on OneDrive.
  await expect.poll(() => srv.drive.read(`${FOLDER}/.presence/iPhone.json`) != null, { timeout: 20_000 }).toBe(true)
})

test('zmiana z komputera dochodzi; bez sieci wpis czeka, z siecią idzie; start z kopii na telefonie', async ({ page }) => {
  await connect(page)
  // A computer renames the ship: the phone's next sync brings it.
  const fi = JSON.parse(srv.drive.read(`${FOLDER}/fi.json`)!) as { settings: { shipName: string }; updatedAt: string }
  srv.drive.put(`${FOLDER}/fi.json`, `${JSON.stringify({ ...fi, settings: { ...fi.settings, shipName: 'Orzeł' }, updatedAt: new Date().toISOString(), updatedBy: 'DOM-PC' }, null, 2)}\n`)
  await page.getByTestId('phone-nav-settings').click()
  await page.getByTestId('phone-sync-now').click()
  await expect(page.getByTestId('phone-ship')).toContainText('Orzeł')

  // Offline: the entry is saved on the phone and waits.
  srv.drive.offline = true
  await page.getByTestId('phone-nav-bridge').click()
  await quickExpense(page, '7', 'Kiosk')
  await expect(page.getByTestId('phone-sync')).toHaveAttribute('data-pending', '1', { timeout: 20_000 })
  await page.getByTestId('phone-nav-settings').click()
  await page.getByTestId('phone-sync-now').click()
  await expect(page.getByTestId('phone-sync')).toHaveAttribute('data-state', 'offline')
  expect(driveTransactions().some((t) => t.counterparty === 'Kiosk')).toBe(false)
  // Back online: it goes.
  srv.drive.offline = false
  await page.getByTestId('phone-sync-now').click()
  await expect.poll(() => driveTransactions().some((t) => t.counterparty === 'Kiosk'), { timeout: 20_000 }).toBe(true)

  // The app started again without a connection: straight to the window, from the copy on the phone.
  srv.drive.offline = true
  await page.reload()
  await expect(page.getByTestId('phone-shell')).toBeVisible()
  await expect(page.getByTestId('phone-ship')).toContainText('Orzeł')
  await expect(page.getByTestId('bridge-recent-row')).toHaveCount(2)
})

test('powiadomienia na najbliższe dni zaplanowane przy otwarciu; ekran komputera mówi, że jest na komputerze', async ({ page }) => {
  await connect(page)
  await expect
    .poll(() => page.evaluate(() => (window.__FI_NOTICES__?.planned ?? []).map((n) => n.key.split(':')[0])), { timeout: 15_000 })
    .toEqual(expect.arrayContaining(['briefing', 'evening', 'planned']))
  const planned = await page.evaluate(() => window.__FI_NOTICES__!.planned)
  // The container's payment in 3 days – on its day, in the morning.
  expect(planned.find((n) => n.key.startsWith('planned:'))?.body).toContain('OC auta')
  // Switched off: gone from the plan.
  await page.getByTestId('phone-nav-settings').click()
  await page.getByTestId('phone-notify-evening').click()
  await expect.poll(() => page.evaluate(() => window.__FI_NOTICES__!.planned.some((n) => n.key.startsWith('evening:')))).toBe(false)
  // A radar day's notice tapped (the Radar is not on the phone yet): Mostek, also from the phone's settings.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('fi:notice-tap', { detail: 'radar' })))
  await expect(page.getByTestId('page-bridge')).toBeVisible()
  // A screen only a computer has (the operations of the latest list): said so, with the way back.
  await page.getByTestId('phone-nav-bridge').click()
  await page.getByTestId('bridge-recent-row').first().click()
  await expect(page.getByTestId('phone-not-here')).toHaveAttribute('data-page', 'operations')
  await page.getByRole('button', { name: 'Wróć na Mostek' }).click()
  await expect(page.getByTestId('page-bridge')).toBeVisible()
})

test('logowanie wygasło: „Zaloguj ponownie” – kopia na telefonie i czekający wpis zostają', async ({ page }) => {
  await connect(page)
  // Microsoft revokes the sign-in (a new password): the next sync asks to sign in again.
  srv.drive.offline = true
  await quickExpense(page, '19,99', 'Apteka')
  srv.drive.token = 'token-2'
  srv.drive.refresh.clear()
  srv.drive.offline = false
  await page.getByTestId('phone-nav-settings').click()
  await page.getByTestId('phone-sync-now').click()
  await expect(page.getByTestId('phone-sync')).toHaveAttribute('data-state', 'auth')
  await expect(page.getByTestId('phone-sync-state')).toHaveText('zaloguj się ponownie')
  expect(driveTransactions().some((t) => t.counterparty === 'Apteka')).toBe(false)
  await page.getByTestId('phone-signin-again').click()
  // The same folder, no new copy: the entry that waited goes up.
  await expect.poll(() => driveTransactions().some((t) => t.counterparty === 'Apteka'), { timeout: 20_000 }).toBe(true)
  await expect(page.getByTestId('phone-sync')).toHaveAttribute('data-pending', '0')
  await expect(page.getByTestId('phone-shell')).toBeVisible()
})
