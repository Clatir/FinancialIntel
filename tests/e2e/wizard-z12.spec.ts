// 1.21.0 Z12 (UX-79, D106 pkt 11, T546): a new empty folder opens the start wizard by itself – once on this computer;
// its first step offers „Szybki start” (the balances, the salary, the daily envelopes), started by the same „Uruchom
// budżet”. The other E2E start on the bridge: `launch()` switches the opening off (FI_WIZARD_AUTO=0) – here it is on.
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder } from './seed'

const FOOD = '01KDEFCAT00000000000000100'
const MBANK = '01KDEFACC00000000000000001'
const AUTO = { FI_WIZARD_AUTO: '1' }

/** An amount field: clicked first, then typed and left with Enter (it saves on leaving). */
async function amount(page: Page, label: string, value: string): Promise<void> {
  const field = page.getByLabel(label, { exact: true })
  await field.click()
  await field.fill(value)
  await field.press('Enter')
}

test('UX-79: nowy folder – kreator sam, „Szybki start” (salda, pensja, koperty codzienne) → Mostek; drugie uruchomienie bez kreatora', async () => {
  const { date: today, month } = warsawNow()
  const base = mkdtempSync(join(tmpdir(), 'fi-z12-'))
  const userData = join(base, 'userData')
  const dataDir = join(base, 'OneDrive', 'FinancialIntel')
  const env = { ...AUTO, FI_DEFAULT_DATA_DIR: dataDir }
  let { app, page, errors } = await launch({ usePreset: false, userData, env })
  try {
    // The first run: the folder made with one click – the wizard opens by itself, on its first step.
    await expect(page.getByTestId('folder-setup')).toBeVisible()
    await page.getByTestId('setup-default').click()
    await expect(page.getByTestId('page-wizard')).toBeVisible()
    await expect(page.getByTestId('wizard-step-0')).toHaveClass(/text-accent/)
    await expect(page.getByTestId('wizard-quick-offer')).toBeVisible()
    await page.getByTestId('wizard-quick-start').click()

    // One screen of three answers; what „Uruchom budżet” lacks – without step numbers.
    await expect(page.getByTestId('wizard-quick')).toBeVisible()
    await expect(page.getByTestId('wizard-step-quick')).toBeVisible()
    await expect(page.getByTestId('wizard-finish')).toBeDisabled()
    await expect(page.getByTestId('wizard-finish-why')).toHaveText('Potrzebne: saldo teraz: mBank, Portfel XTB; pensja.')
    await expect(page.getByTestId('wizard-quick-envelope')).toHaveText([/Jedzenie/, /Rozrywka i hobby/, /Osobiste/, /Gotówka/])
    await amount(page, 'Saldo mBank', '25000')
    await amount(page, 'Saldo Portfel XTB', '0')
    await amount(page, 'Pensja', '5000')
    await amount(page, 'Koperta Jedzenie', '900')
    await expect(page.getByTestId('wizard-unallocated')).toContainText('Niezaplanowane (łupy)')
    await expect(page.getByTestId('wizard-unallocated')).toContainText('4 100,00 zł')
    // The rest of the start said, as the wizard proposes it: nothing in the cargo, the layers' targets of the settings.
    await expect(page.getByTestId('wizard-quick-rest')).toContainText('Cele warstw: osłony – 3 pensje, kadłub – 6 miesięcy średnich kosztów.')
    await expect(page.getByTestId('wizard-quick-rest')).toContainText('Ładownia pusta')
    await expect(page.getByTestId('wizard-finish-why')).toHaveCount(0)
    await page.getByTestId('wizard-finish').click()

    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('banner-wizard')).toHaveCount(0)
    // The same start as „Uruchom budżet” of the steps (T446): fi.json with the start, the openings, the month's plan.
    await expect.poll(async () => (await json(join(dataDir, 'fi.json'))).settings.budget.start).toBe(today)
    const fi = await json(join(dataDir, 'fi.json'))
    expect(fi.settings.layers).toMatchObject({ shieldSalaries: 3, hullMonths: 6 })
    expect(fi.settings.shipName).toBe('Flagowiec')
    await expect.poll(async () => (await json(join(dataDir, 'months', `${month}.json`)).catch(() => null))?.salary).toBe(500_000)
    expect((await json(join(dataDir, 'months', `${month}.json`))).envelopes).toEqual({ [FOOD]: 90_000 })
    await expect.poll(async () => (await records(dataDir, 'balances')).length).toBe(2)
    expect((await records(dataDir, 'balances')).find((b) => b.accountId === MBANK)).toMatchObject({ kind: 'opening', date: today, amount: 2_500_000 })
    expect(await records(dataDir, 'containers')).toEqual([])
    expect(errors).toEqual([])
    await app.close()

    // The second run: the bridge of the running budget, no wizard.
    ;({ app, page, errors } = await launch({ usePreset: false, userData, env }))
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('page-wizard')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('UX-79: kreator zostawiony bez zapisu – drugie uruchomienie zaczyna na Mostku, baner wraca do odpowiedzi; przerwany – też bez kreatora', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fi-z12-'))
  const userData = join(base, 'userData')
  const dataDir = join(base, 'FinancialIntel')
  let { app, page, errors } = await launch({ dataDir, userData, env: AUTO })
  try {
    // The folder of the test made at the start, empty: the wizard by itself.
    await expect(page.getByTestId('page-wizard')).toBeVisible()
    await page.getByTestId('wizard-quick-start').click()
    await amount(page, 'Pensja', '5000')
    expect(errors).toEqual([])
    // The window closed in the wizard, nothing started.
    await app.close()

    ;({ app, page, errors } = await launch({ dataDir, userData, env: AUTO }))
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('page-wizard')).toHaveCount(0)
    // The answers wait (AF-11): the banner goes back to them – „Szybki start” with the salary typed.
    await expect(page.getByTestId('banner-wizard-start')).toHaveText('Wróć do kreatora')
    await page.getByTestId('banner-wizard-start').click()
    await expect(page.getByTestId('wizard-quick')).toBeVisible()
    await expect(page.getByLabel('Pensja', { exact: true })).toHaveValue(/^5\s000,00$/)
    // „Wszystkie kroki”: the full wizard on its first step, the answers kept.
    await page.getByTestId('wizard-quick-full').click()
    await expect(page.getByTestId('wizard-quick-offer')).toBeVisible()
    await expect(page.getByTestId('wizard-step-quick')).toHaveCount(0)
    await page.getByTestId('wizard-step-2').click()
    await expect(page.getByLabel('Pensja', { exact: true })).toHaveValue(/^5\s000,00$/)
    await page.getByTestId('wizard-cancel').click()
    await page.getByTestId('wizard-cancel-confirm').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    expect(errors).toEqual([])
    await app.close()

    // Broken off: no wizard by itself either – the banner offers it.
    ;({ app, page, errors } = await launch({ dataDir, userData, env: AUTO }))
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(page.getByTestId('banner-wizard-start')).toHaveText('Kreator startu')
    await expect(page.getByTestId('page-wizard')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('UX-79: nowy pusty folder otwarty z Ustawień („Nowe dane w innym folderze…”) – kreator sam, gdy folder jest pokazany', async () => {
  const { month } = warsawNow()
  const base = mkdtempSync(join(tmpdir(), 'fi-z12-'))
  const dataDir = join(base, 'Dom', 'FinancialIntel')
  const other = join(base, 'Nowy', 'FinancialIntel')
  // A running budget: no wizard at the start.
  seedFolder(dataDir, { settings: (s) => ({ ...s, budget: { ...s.budget, start: `${month}-01` } }) })
  mkdirSync(other, { recursive: true })
  const { app, page, errors } = await launch({ dataDir, env: AUTO })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    // The system's folder dialog answers with the new empty folder.
    await app.evaluate(({ dialog }, dir) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [dir] })) as typeof dialog.showOpenDialog
    }, other)
    await page.getByRole('button', { name: 'Nowe dane w innym folderze…' }).click()
    // Before: the folder came while the switch held the window – the wizard waited for the next start.
    await expect(page.getByTestId('page-wizard')).toBeVisible()
    await expect(page.getByTestId('wizard-step-0')).toHaveClass(/text-accent/)
    expect(existsSync(join(other, 'fi.json'))).toBe(true)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
