/**
 * Z2 (1.21.0, D106, T536): „Cofnij” and summaries on the screens – „Koperty ze średnich” (UX-7), the loot split (UX-8),
 * „Pomiń wpis” in the docking window (UX-9) and the wizard's „ma oddać” / „zaliczka” – one of the two (UX-6).
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const FUN = '01KDEFCAT00000000000000600'
const RENT = '01KDEFCAT00000000000000201'
const STREAMING = '01KDEFCAT00000000000000703'

/** Seven months of history before this one (the first is not full): the same costs every month – 2 479,99 zł. */
function history(month: string) {
  const out: Array<Record<string, unknown>> = []
  for (let i = 7; i >= 1; i--) {
    const m = addMonths(month, -i)
    const t = (day: string, v: number, categoryId: string, counterparty: string) => ({ date: `${m}-${day}`, accountId: ACC, amount: -zl(v), categoryId, counterparty })
    out.push(t('02', 1500, RENT, 'WSPOLNOTA'), t('05', 400, GROCERIES, 'Biedronka'), t('06', 100, GROCERIES, 'Biedronka'), t('12', 280, GROCERIES, 'Lidl'), t('07', 49.99, STREAMING, 'NETFLIX.COM'), t('15', 150, FUN, 'Bolt'))
  }
  return out
}

test('Plan miesiąca: „Koperty ze średnich” z „Cofnij” (UX-7); podział łupów – linia podsumowania, potem „Cofnij” ze szkicem (UX-8)', async () => {
  const { month } = warsawNow()
  const m1 = addMonths(month, -1)
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-z2-month-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: `${m1}-01` } }),
    records: {
      balances: [{ date: `${m1}-01`, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      // Last month's plan with hand-set limits – this month lives on it.
      months: [{ month: m1, salary: zl(4000), envelopes: { [FOOD]: zl(500), [FUN]: zl(100) } }],
      transactions: history(month)
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+4')
    const food = page.locator('[data-testid="month-envelope"][data-name="Jedzenie"] input')
    const home = page.locator('[data-testid="month-envelope"][data-name="Dom"] input')
    await expect(food).toHaveValue('500,00')
    await page.getByTestId('month-envelopes-propose').click()
    await expect(food).toHaveValue('780,00')
    await expect(home).toHaveValue('1\u00a0500,00')
    const own = async () => (await json(join(dataDir, 'months', `${month}.json`))).envelopes
    await expect.poll(own).toMatchObject({ [FOOD]: zl(780), [FUN]: zl(150) })
    // Before: no „Cofnij” – the hand-set 500 zł were gone for good.
    await page.getByRole('status').filter({ hasText: 'Koperty ze średnich' }).getByTestId('toast-action').click()
    await expect(food).toHaveValue('500,00')
    await expect(home).toHaveValue('')
    await expect.poll(own).toEqual({ [FOOD]: zl(500), [FUN]: zl(100) })

    // The loot of last month (nothing decided): before the confirmation one line says where it goes.
    const debrief = page.getByTestId('month-debrief')
    const edit = debrief.getByTestId('debriefing-edit-loot')
    const next = debrief.getByTestId('loot-next')
    // From the 8th the loot went to the shields – the split is changed by „Zmień podział łupów” (before: the form itself).
    if (await edit.isVisible()) await edit.click()
    await next.click()
    await next.fill('500')
    await next.press('Enter')
    const summary = debrief.getByTestId('loot-summary')
    await expect(summary).toHaveAttribute('data-state', 'ok')
    await expect(summary).toContainText(/^Po zatwierdzeniu: 500,00 zł → następny miesiąc · [\d\s]+,\d\d zł → osłony\.$/)
    await debrief.getByTestId('loot-confirm').click()
    await expect(debrief.getByTestId('loot-decided')).toContainText('następny miesiąc 500,00 zł')
    const loot = async () => (await records(dataDir, 'months')).find((p) => p.month === m1)!.loot as { nextMonth: number } | null
    await expect.poll(async () => (await loot())?.nextMonth).toBe(zl(500))
    // „Cofnij”: no decision again – and the split typed is back in the form.
    await page.getByRole('status').filter({ hasText: 'Podział łupów zatwierdzony: 500,00 zł → następny miesiąc' }).getByTestId('toast-action').click()
    await expect(debrief.getByTestId('loot-decided')).toHaveCount(0)
    await expect.poll(loot).toBeNull()
    if (await edit.isVisible()) await edit.click()
    await expect(next).toHaveValue('500,00')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

function put(root: string, rel: string, data: unknown): void {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

test('Dokowanie: „Pomiń wpis” zamyka okno z „Cofnij”, które przywraca wpis do dokowania (UX-9)', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const before = addDays(today, -1)
  const W = '01KPAYZ2000000000000000001'
  const tmp = mkdtempSync(join(tmpdir(), 'fi-z2-dock-'))
  const ictj = join(tmp, 'ICTJ')
  put(ictj, 'journal.json', { schemaVersion: 1, settings: {} })
  put(ictj, `payouts/${before.slice(0, 4)}/${before}_${W}.json`, { schemaVersion: 1, id: W, createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', kind: 'withdrawal', date: before, amount: 800, pool: 'current', note: '', categoryId: null, goal: null })
  const dataDir = join(tmp, 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: {} }],
      transactions: [{ date: before, accountId: ACC, kind: 'trading', amount: zl(800), counterparty: 'XTB S.A.' }]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir, env: { FI_ICTJ_DIR: ictj, FI_ICTJ_LAUNCH: 'dry' } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const rows = page.locator('[data-testid="docking-row"]')
    await expect(rows).toHaveCount(1)
    await rows.first().click()
    await page.getByTestId('docking-skip').click()
    await expect(page.getByTestId('docking-dialog')).toHaveCount(0)
    await expect(rows).toHaveCount(0)
    const skipped = async () => (await json(join(dir, 'fi.json'))).settings.ictj.skipped
    await expect.poll(skipped).toEqual([W])
    // Before: the window closed without a word – the entry back only from the folded list („przywróć”).
    const toast = page.getByRole('status').filter({ hasText: 'Pominięto wpis z ICTTJ' })
    await expect(toast).toContainText('wpływ w banku zostaje w budżecie zwykłą kolejnością dokowania')
    await toast.getByTestId('toast-action').click()
    await expect(rows).toHaveCount(1)
    await expect.poll(skipped).toEqual([])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('Kreator, domownicy: „ma oddać” albo „zaliczka” – drugie pole wyłączone z dymkiem, nic nie zeruje się po cichu (UX-6)', async () => {
  const { app, page, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.getByTestId('banner-wizard-start').click()
    await page.getByTestId('wizard-member-name').fill('Ania')
    await page.getByTestId('wizard-member-add').click()
    const row = page.locator('[data-testid="wizard-member-row"][data-name="Ania"]')
    const owed = row.getByTestId('wizard-member-owed')
    const deposit = row.getByTestId('wizard-member-deposit')
    await expect(owed).toBeEnabled()
    await expect(deposit).toBeEnabled()
    await owed.click()
    await owed.fill('240')
    await owed.press('Enter')
    await expect(owed).toHaveValue('240,00')
    // Before: „zaliczka” open – typed there, it zeroed „ma oddać” without a word.
    await expect(deposit).toBeDisabled()
    await expect(row.getByTestId('wizard-member-deposit-label')).toHaveAttribute('title', /^Albo ma oddać, albo zaliczka/)
    await expect(row.getByTestId('wizard-member-owed-label')).not.toHaveAttribute('title', /.+/)
    // „ma oddać” cleared: both open again; a deposit typed – „ma oddać” off.
    await owed.click()
    await owed.fill('')
    await owed.press('Enter')
    await expect(deposit).toBeEnabled()
    await deposit.click()
    await deposit.fill('300')
    await deposit.press('Enter')
    await expect(deposit).toHaveValue('300,00')
    await expect(owed).toBeDisabled()
    await expect(row.getByTestId('wizard-member-owed-label')).toHaveAttribute('title', /^Albo ma oddać, albo zaliczka/)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
