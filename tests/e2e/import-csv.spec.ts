import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { importDone, launch, MASS } from './app'
import { bankCsv } from './bank-csv'
import { json, records } from './files'
import { listaCsv, type CsvBuy } from './mbank-csv'
import { seedFolder } from './seed'

/** The file dialog of the main process answers with `path` (a dialog cannot be clicked in a test). */
async function answerFileDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

async function pick(app: ElectronApplication, page: Page, path: string): Promise<void> {
  await answerFileDialog(app, path)
  await page.getByTestId('import-pick').click()
}

const startedBudget = (dataDir: string) => seedFolder(dataDir, { settings: (s) => ({ ...s, budget: { ...s.budget, start: `${addMonths(warsawNow().month, -2)}-01` } }) })

test('AP-43: CSV innego banku – kreator kolumn, nowe konto, import jak z mBanku; następny plik banku bez kreatora, nic podwójnie', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fi-csv-'))
  const { date: today } = warsawNow()
  const file = join(dir, 'historia_bank_b.csv')
  writeFileSync(
    file,
    bankCsv([
      { date: addDays(today, -6), name: 'PIEKARNIA TESTOWA', title: 'Płatność kartą', amount: -12.5 },
      { date: addDays(today, -5), name: 'KIOSK RUCH', title: 'Płatność kartą', amount: -7.2 },
      { date: addDays(today, -4), name: 'FIRMA TESTOWA SP. Z O.O.', title: 'Wynagrodzenie', amount: 1500 },
      { date: addDays(today, -2), name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 },
      { date: addDays(today, -2), name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 }
    ])
  )
  const dataDir = join(dir, 'FinancialIntel')
  startedBudget(dataDir)
  const { app, page, userData, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    await pick(app, page, file)
    // Not mBank's: the wizard with its proposal – the columns by the header's names, a new account.
    const wizard = page.getByTestId('import-csv')
    await expect(wizard).toBeVisible()
    await expect(page.getByTestId('import-file')).toHaveCount(0)
    await expect(page.getByTestId('import-csv-col-date')).toHaveValue('0')
    await expect(page.getByTestId('import-csv-col-credit')).toHaveValue('6')
    await expect(page.getByTestId('import-csv-col-debit')).toHaveValue('7')
    await expect(page.getByTestId('import-csv-account')).toHaveValue('')
    await expect(page.getByTestId('import-csv-preview-row')).toHaveCount(5)
    await expect(page.getByTestId('import-csv-preview-row').first()).toContainText('ZABKA Z1234')
    // A column taken away: said beside the button, nothing saved.
    await page.getByTestId('import-csv-col-date').selectOption('')
    await expect(page.getByTestId('import-csv-missing')).toHaveText('Wskaż kolumnę z datą operacji.')
    await expect(page.getByTestId('import-csv-save')).toBeDisabled()
    await page.getByTestId('import-csv-col-date').selectOption('0')
    await page.getByTestId('import-csv-new-name').fill('Bank B')
    await page.getByTestId('import-csv-save').click()

    const opened = page.getByTestId('import-file')
    await expect(opened).toBeVisible(MASS)
    await expect(opened).toHaveAttribute('data-format', 'csv')
    // Read in the Worker (AP-35) – in the built app too (file://, CSP 'self').
    await expect(opened).toHaveAttribute('data-via', 'worker')
    await expect(opened).toContainText('CSV innego banku · 5 operacji')
    await expect(page.getByTestId('import-account')).toHaveValue(/.+/)
    await expect(page.getByTestId('import-count-new')).toHaveText('5')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)

    const fi = await json(join(dataDir, 'fi.json'))
    const bankB = (fi.settings.accounts as Array<Record<string, unknown>>).find((a) => a.name === 'Bank B')!
    expect(bankB).toMatchObject({ kind: 'bank', importFormat: 'csv', csvMapping: { separator: ';', skipRows: 4, header: true, dateFormat: 'DD.MM.RRRR', columns: { date: 0, credit: 6, debit: 7 } } })
    await expect.poll(async () => (await records(dataDir, 'transactions')).length).toBe(5)
    const ops = await records(dataDir, 'transactions')
    expect(ops.every((t) => t.accountId === bankB.id && String((t.bank as { key: string }).key).startsWith('csv:'))).toBe(true)
    expect(ops.filter((t) => t.amount === -3195)).toHaveLength(2)

    // The bank's next file (the same days and one more): read by the account's mapping – no wizard, nothing twice.
    const next = join(dir, 'historia_bank_b (1).csv')
    writeFileSync(
      next,
      bankCsv([
        { date: addDays(today, -6), name: 'PIEKARNIA TESTOWA', title: 'Płatność kartą', amount: -12.5 },
        { date: addDays(today, -5), name: 'KIOSK RUCH', title: 'Płatność kartą', amount: -7.2 },
        { date: addDays(today, -4), name: 'FIRMA TESTOWA SP. Z O.O.', title: 'Wynagrodzenie', amount: 1500 },
        { date: addDays(today, -2), name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 },
        { date: addDays(today, -2), name: 'ZABKA Z1234', title: 'Płatność kartą', amount: -31.95 },
        { date: addDays(today, -1), name: 'APTEKA POD LIPA', title: 'Płatność kartą', amount: -20 }
      ])
    )
    await pick(app, page, next)
    await expect(page.getByTestId('import-file')).toBeVisible(MASS)
    await expect(wizard).toHaveCount(0)
    await expect(page.getByTestId('import-account')).toHaveValue(String(bankB.id))
    await expect(page.getByTestId('import-count-new')).toHaveText('1')
    await expect(page.getByTestId('import-count-known')).toHaveText('5')
    await page.getByTestId('import-run').click()
    await importDone(page, userData)
    await expect.poll(async () => (await records(dataDir, 'transactions')).length).toBe(6)

    // A file of another layout (przegląd R1 3): the wizard offers a new account; Bank B chosen – its columns replaced
    // only after the question.
    const other = join(dir, 'inny_uklad.csv')
    writeFileSync(other, ['Data;Opis;Kwota', `${addDays(today, -1)};KAWIARNIA RYNEK;-9,50`, ''].join('\r\n'))
    await pick(app, page, other)
    await expect(wizard).toBeVisible()
    await expect(page.getByTestId('import-csv-account')).toHaveValue('')
    await expect(page.getByTestId('import-csv-no-operation')).toBeVisible()
    await page.getByTestId('import-csv-account').selectOption(String(bankB.id))
    await page.getByTestId('import-csv-save').click()
    await expect(page.getByTestId('import-csv-save-ask')).toContainText('Konto „Bank B” ma już kolumny innego pliku')
    await page.getByTestId('import-csv-save-confirm').click()
    await expect(page.getByTestId('import-file')).toContainText('inny_uklad.csv', MASS)
    await expect.poll(async () => ((await json(join(dataDir, 'fi.json'))).settings.accounts as Array<{ id: string; csvMapping?: { headers: string[] } }>).find((a) => a.id === bankB.id)?.csvMapping?.headers).toEqual(['Data', 'Opis', 'Kwota'])
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-35: duży plik w Workerze – pasek postępu, okno odpowiada; ten sam plik w oknie (bez Workera) – ten sam podgląd', async () => {
  test.setTimeout(240_000)
  const dir = mkdtempSync(join(tmpdir(), 'fi-worker-'))
  const { date: today } = warsawNow()
  const names = ['BIEDRONKA', 'LIDL', 'ZABKA Z', 'ORLEN', 'KIOSK RUCH', 'SKLEP NR', 'APTEKA', 'PIEKARNIA']
  const buys: CsvBuy[] = Array.from({ length: 20000 }, (_, i) => ({ date: addDays(today, -1 - Math.floor(i / 20)), amount: 1 + (i % 500) / 7, name: `${names[i % names.length]} ${i % 300}` }))
  const file = join(dir, 'lista_operacji.csv')
  writeFileSync(file, listaCsv(buys, { from: buys.at(-1)!.date, to: buys[0]!.date }))
  const dataDir = join(dir, 'FinancialIntel')
  startedBudget(dataDir)
  const { app, page, errors } = await launch({ dataDir })
  /** Opens the file and says how it went: the time, the longest moment the window did not answer, the bar's steps seen. */
  const measured = async () => {
    // In the window's own words (a script – the tests' types know no DOM): a timer every 20 ms, the bar's steps.
    await page.evaluate(`(() => {
      const lag = { max: 0, timer: 0, steps: [] }
      let last = performance.now()
      lag.timer = setInterval(() => {
        const now = performance.now()
        lag.max = Math.max(lag.max, now - last - 20)
        last = now
      }, 20)
      lag.observer = new MutationObserver(() => {
        const bar = document.querySelector('[data-testid="import-progress"]')
        const step = bar ? bar.getAttribute('data-phase') + ':' + bar.getAttribute('data-pct') : null
        if (step && lag.steps[lag.steps.length - 1] !== step) lag.steps.push(step)
      })
      lag.observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase', 'data-pct'] })
      window.__lag = lag
    })()`)
    const t0 = Date.now()
    await pick(app, page, file)
    await expect(page.getByTestId('import-file')).toBeVisible({ timeout: 120_000 })
    const ms = Date.now() - t0
    const out = (await page.evaluate(`(() => {
      const lag = window.__lag
      clearInterval(lag.timer)
      lag.observer.disconnect()
      return { lag: Math.round(lag.max), steps: lag.steps }
    })()`)) as { lag: number; steps: string[] }
    const opened = page.getByTestId('import-file')
    const result = { ms, ...out, via: await opened.getAttribute('data-via'), counted: await page.getByTestId('import-count-new').textContent() }
    await page.getByTestId('import-close').click()
    await expect(opened).toHaveCount(0)
    return result
  }
  const noWorker = (on: boolean) => page.evaluate(`window.__FI_IMPORT_NO_WORKER__ = ${on}`)
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+3')
    const cold = await measured()
    expect(cold.via).toBe('worker')
    expect(cold.counted).toBe('20000')
    // The bar moved while the file was read and recognized: the window took the Worker's messages and drew them.
    const phases = new Set(cold.steps.map((p) => p.split(':')[0]))
    expect(phases.has('read')).toBe(true)
    expect(phases.has('plan')).toBe(true)
    expect(cold.steps.length).toBeGreaterThan(3)

    await noWorker(true)
    const windowOnly = await measured()
    expect(windowOnly.via).toBe('window')
    expect(windowOnly.counted).toBe('20000')
    // In the window the bar cannot move: one look at it, then the window is busy until the plan is there.
    expect(windowOnly.steps.every((p) => p.startsWith('start'))).toBe(true)

    await noWorker(false)
    const warm = await measured()
    expect(warm.via).toBe('worker')
    expect(warm.counted).toBe('20000')
    console.log(
      `AP-35 E2E – 20 000 wierszy: okno (bez Workera) ${windowOnly.ms} ms, najdłużej bez odpowiedzi ${windowOnly.lag} ms; ` +
        `Worker pierwszy raz ${cold.ms} ms (${cold.lag} ms, kroki paska ${cold.steps.length}); Worker kolejny raz ${warm.ms} ms (${warm.lag} ms)`
    )
    // The window answers sooner with the Worker than while it analyzes itself.
    expect(warm.lag).toBeLessThan(windowOnly.lag)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
