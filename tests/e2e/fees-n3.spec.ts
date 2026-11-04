import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, daysBetween, warsawNow } from '../../src/shared/calc/dates'
import { dm } from '../../src/shared/format'
import { launch } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const PHONE = '01K9N3H00000000000000000C1'
const OC = '01K9N3H00000000000000000C2'
const WASTE = '01K9N3H00000000000000000C3'

/**
 * AP-10 (1.15.7): one state of a fee on the bridge, in Ładownia and on the Radar – a due of last month still unpaid stays
 * „po terminie” (D99 pkt 3) until settled; the asteroid of a periodic fee on the day of its history in the briefing and
 * on the Radar alike (AF-15); „za mało w zbiorniku” in the month's debriefing (LA sp. 5); a buoy is not closed by an
 * operation of the same amount and another name (RA sp. 1); a buoy long past says it lapsed (RA sp. 4).
 */
test('AP-10: zaległa opłata zostaje po terminie (odprawa, Ładownia, Radar), jeden termin asteroidy, debriefing, boje', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -3)}-01`
  const yesterday = addDays(today, -1)
  // Telefon Play on the 20th: paid three and two months ago, last month's missing.
  const lateDue = `${addMonths(month, -1)}-20`
  // OC auta: its history pays 6 days from now (a year ago on that day); the container's own day is another one.
  const due = addDays(today, 6)
  const ocDay = Number(due.slice(8, 10)) === 1 ? 2 : 1
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-fees-n3-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start }, household: { ...s.household, since: start }, import: { ...s.import, coveredTo: { [MBANK]: yesterday } } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -3), salary: zl(5000), envelopes: {} }],
      containers: [
        { id: PHONE, name: 'Telefon Play', amount: zl(50), cycleMonths: 1, dueMonth: start.slice(0, 7), dueDay: 20, accountId: MBANK, counterparty: 'PLAY' },
        { id: OC, name: 'OC auta', amount: zl(1240), cycleMonths: 12, dueMonth: addMonths(due.slice(0, 7), -12), dueDay: ocDay, accountId: MBANK, counterparty: 'PZU' },
        // Wywóz 240 zł a quarter, due last month: paid 300 zł with 240 zł in its tank – 60 zł from the energy.
        { id: WASTE, name: 'Wywóz śmieci', amount: zl(240), cycleMonths: 3, dueMonth: addMonths(month, -1), dueDay: 15, accountId: MBANK, counterparty: 'MPO' }
      ],
      transactions: [
        { date: `${addMonths(month, -3)}-20`, accountId: MBANK, kind: 'expense', amount: -zl(50), counterparty: 'PLAY', containerId: PHONE },
        { date: `${addMonths(month, -2)}-20`, accountId: MBANK, kind: 'expense', amount: -zl(50), counterparty: 'PLAY', containerId: PHONE },
        { date: `${addMonths(due.slice(0, 7), -12)}-${due.slice(8, 10)}`, accountId: MBANK, kind: 'expense', amount: -zl(1240), counterparty: 'PZU', containerId: OC },
        { date: `${addMonths(month, -1)}-15`, accountId: MBANK, kind: 'expense', amount: -zl(300), counterparty: 'MPO', containerId: WASTE },
        { date: addDays(today, -4), accountId: MBANK, kind: 'expense', amount: -zl(250), counterparty: 'ZALANDO' }
      ],
      scheduled: [
        { name: 'Przegląd komina', date: addDays(today, -5), amount: -zl(250), accountId: MBANK },
        { name: 'Mandat', date: addDays(today, -31), amount: -zl(80) }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    // The briefing: last month's due still unpaid; the OC asteroid 6 days ahead – on the day of its history.
    const lateAlert = page.locator('[data-testid="briefing-item"][data-kind="cargo"]').filter({ hasText: `termin ${dm(lateDue)} minął` })
    await expect(lateAlert).toContainText('Kontener niezaładowany: Telefon Play 50,00 zł')
    await expect(page.locator('[data-testid="briefing-item"][data-kind="asteroid"]').filter({ hasText: 'OC auta' })).toContainText(`OC auta za ${daysBetween(today, due)} dni`)

    // The Radar: the same two dates.
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('page-radar')).toBeVisible()
    const phoneItem = page.locator('[data-testid="radar-item"][data-kind="fixed"]').filter({ hasText: 'Telefon Play' }).first()
    await expect(phoneItem).toHaveAttribute('data-overdue', 'yes')
    await expect(phoneItem).toContainText(dm(lateDue))
    await expect(phoneItem).toContainText(`po terminie ${daysBetween(lateDue, today)} dni`)
    await expect(page.locator('[data-testid="radar-item"][data-kind="asteroid"]').filter({ hasText: 'OC auta' }).first()).toContainText(dm(due))
    // RA sp. 1: ZALANDO of the same amount did not close „Przegląd komina”; RA sp. 4: „Mandat” long past – lapsed.
    await expect(page.locator('[data-testid="buoy-day"][data-name="Przegląd komina"]')).toHaveAttribute('data-state', 'late')
    const later = page.getByTestId('buoys-later')
    await later.locator('summary').click()
    await expect(later.locator('[data-testid="buoy-later"][data-name="Mandat"]')).toHaveAttribute('data-state', 'lapsed')
    await expect(later.locator('[data-testid="buoy-later"][data-name="Mandat"]')).toContainText('minęła bez operacji')

    // Ładownia: the row says the late due; its editor lists it – settled outside the budget, it goes everywhere.
    await page.keyboard.press('Control+5')
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    const row = page.locator('[data-testid="cargo-row"][data-name="Telefon Play"]')
    await expect(row.getByTestId('cargo-state')).toHaveAttribute('data-state', 'overdue')
    await expect(row.getByTestId('cargo-state')).toHaveAttribute('data-due', lateDue)
    await expect(row.getByTestId('cargo-state')).toHaveAttribute('data-carried', 'yes')
    await row.click()
    const lateBox = page.locator(`[data-testid="container-late-due"][data-due="${lateDue}"]`)
    await expect(lateBox).toContainText(`Po terminie – termin ${dm(lateDue)} minął, płatności brak (50,00 zł).`)
    await lateBox.getByTestId('container-late-settle').click()
    await expect(page.getByTestId('container-late')).toHaveCount(0)
    await expect(row.getByTestId('cargo-state')).not.toHaveAttribute('data-carried', 'yes')
    await expect.poll(async () => (await records(dir, 'containers')).find((c) => c.id === PHONE)?.aliveAt).toBe(addDays(lateDue, 1))
    // The OC editor's „Płatność”: its next due on the day of its history (LA sp. 8, W2).
    await page.locator('[data-testid="cargo-row"][data-name="OC auta"]').click()
    await expect(page.getByTestId('container-due')).toHaveValue(`${due.slice(8, 10)}.${due.slice(5, 7)}.${due.slice(0, 4)}`)

    await page.keyboard.press('Control+1')
    await expect(lateAlert).toHaveCount(0)

    // The debriefing of last month: the tank of Wywóz lacked 60 zł (LA sp. 5).
    await page.keyboard.press('Control+4')
    await expect(page.getByTestId('debrief-tank-short')).toContainText('Wywóz śmieci')
    await expect(page.getByTestId('debrief-tank-short')).toContainText('60,00 zł')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
