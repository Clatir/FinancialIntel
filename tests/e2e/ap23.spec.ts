import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'

function folder(): string {
  const { month, date } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-ap23-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(5000) }],
      months: [{ month, salary: zl(3000), envelopes: {} }],
      transactions: [
        { date, accountId: ACC, amount: zl(-45), kind: 'expense', counterparty: 'Mokka', note: '', splits: [] },
        { date: start, accountId: ACC, amount: zl(3000), kind: 'income', counterparty: 'Pracodawca', note: '', splits: [] }
      ],
      goals: [{ name: 'Rower', target: zl(2000), deadline: addMonths(month, 6), kind: 'own' }]
    }
  })
  return dataDir
}

// What the user reads: the text of the page and the tooltips (title) on it.
async function readable(page: Page): Promise<string> {
  return (await page.evaluate(
    "(() => { const titles = [...document.querySelectorAll('[title]')].map((e) => e.getAttribute('title') || ''); return document.body.innerText + '\\n' + titles.join('\\n') })()"
  )) as string
}

// A decision code (D81, T294, B12, N47, F17, AF-55, AP-4…), a working text (spec) or a date in the ISO form.
const WORKING = /\b[TDBNW]\d{1,3}\b|\bF(?!1\b|11\b|12\b)\d{2,3}\b|\bA[FP]-\d+|\(spec[,)]|\b\d{4}-\d{2}-\d{2}\b/

test('AP-23: ekrany bez kodów decyzji, tekstów roboczych i dat ISO; słowniczek „Terminy ICT”; dymki Stanu okrętu', async () => {
  const { app, page, errors } = await launch({ dataDir: folder() })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const leaks: string[] = []
    const scan = async (name: string) => {
      const text = await readable(page)
      // File names of the backups (2026-11-04.zip, a path) are names on a disk, not the app's text.
      for (const line of text.split('\n')) if (WORKING.test(line.replace(/\S+\.zip/g, ''))) leaks.push(`${name}: ${line.trim().slice(0, 140)}`)
    }
    await scan('bridge')
    for (const id of ['operations', 'month', 'cargo', 'starmap', 'radar', 'command', 'intel', 'reports', 'import', 'sync']) {
      await page.getByTestId(`nav-${id}`).click()
      await page.waitForTimeout(350)
      await scan(id)
    }
    await page.getByTestId('nav-settings').click()
    for (const tab of ['general', 'accounts', 'categories', 'layers', 'household', 'import', 'ictj', 'notify', 'view', 'folder', 'system', 'updates']) {
      await page.getByTestId(`settings-tab-${tab}`).click()
      await scan(`settings-${tab}`)
    }
    expect(leaks).toEqual([])
    await page.getByTestId('nav-bridge').click()
    // Stan okrętu: each line says what it is on hover (PR sp. 4, MO.33).
    await expect(page.locator('[title^="Osłony – "]').first()).toBeVisible()
    await expect(page.locator('[title^="Układy gwiezdne – "]').first()).toBeVisible()
    await expect(page.locator('[title^="Klasa okrętu – "]').first()).toBeVisible()
    await expect(page.locator('[title^="Masa ładunku – "]').first()).toBeVisible()
    await expect(page.getByTestId('bridge-bias')).toHaveAttribute('title', /^Daily Bias – Kierunek dnia/)
    // F1: the glossary of the ship, and the ICT terms apart, each in Polish.
    await page.keyboard.press('F1')
    await expect(page.getByTestId('shortcuts-ict-glossary')).toContainText('Terminy ICT')
    await expect(page.getByTestId('ict-term')).toHaveCount(16)
    await expect(page.getByTestId('shortcuts-ict-glossary')).toContainText('Daily Bias – Kierunek dnia')
    await expect(page.getByTestId('shortcuts-ict-glossary')).toContainText('Fair Value Gap')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-23: Esc w polach progów gry cofa wpis; cisza nocna „od = do” mówi, że jest wyłączona', async () => {
  const { app, page, errors } = await launch({ dataDir: folder() })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-layers').click()
    // The game's thresholds sit in Ustawienia → Warstwy i rozkazy since AP-16: Esc takes the typing back (AP-15).
    const days = page.getByTestId('game-promote-days')
    const was = await days.inputValue()
    await days.click()
    await days.fill('7')
    await days.press('Escape')
    await expect(days).toHaveValue(was)
    await page.waitForTimeout(300)
    await expect(days).toHaveValue(was)
    const pct = page.getByTestId('game-serious-pct')
    const wasPct = await pct.inputValue()
    await pct.click()
    await pct.fill('250')
    await pct.press('Escape')
    await expect(pct).toHaveValue(wasPct)
    // Enter, on the other hand, keeps it.
    await days.click()
    await days.fill('20')
    await days.press('Tab')
    await expect(days).toHaveValue('20')
    // US.9: the quiet hours from = to are accepted, but not in silence.
    const from = page.getByLabel('Cisza od')
    const to = page.getByLabel('Cisza do')
    await expect(page.getByTestId('orders-quiet-off')).toHaveCount(0)
    await to.click()
    await to.fill(await from.inputValue())
    await to.press('Tab')
    await expect(page.getByTestId('orders-quiet-off')).toContainText('ta sama godzina – cisza nocna wyłączona')
    await to.click()
    await to.fill('06:30')
    await to.press('Tab')
    await expect(page.getByTestId('orders-quiet-off')).toHaveCount(0)
    // A decimal with a comma, never „1.0”: the minimum of the shields.
    await expect(page.getByTestId('orders-min-shields')).toHaveValue(/^\d+(,\d)?$/)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
