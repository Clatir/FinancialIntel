import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { addDays, addMonths, warsawNow } from '../../src/shared/calc/dates'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'
const NETFLIX = '01KSENS0RS0000000000000001'
const GYM = '01KSENS0RS0000000000000002'

const mm = (month: string) => `${month.slice(5, 7)}.${month.slice(0, 4)}`
const dm = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`
const plDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`
const zlText = (g: number) => {
  const [int, frac] = (Math.abs(g) / 100).toFixed(2).split('.')
  return `${g < 0 ? '-' : ''}${int!.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${frac}`
}

/** A payment of the history: an expense of the main account on its day. */
const pay = (date: string, counterparty: string, amount: number, more: Record<string, unknown> = {}) => ({
  date,
  accountId: MBANK,
  kind: 'expense',
  amount: -zl(amount),
  counterparty,
  ...more
})

/** An account history of mBank (newest first, with its balances) – purchases of `shop` on their days. */
function historia(dir: string, name: string, rows: Array<{ date: string; shop: string; amount: number }>): string {
  let balance = zl(5000)
  const lines = rows.map((r) => {
    balance += zl(r.amount)
    return `${plDay(r.date)};${plDay(r.date)};ZAKUP PRZY UŻYCIU KARTY;"${r.shop} /Testowo";"";'';${zlText(zl(r.amount))};${zlText(balance)};`
  })
  const text = [
    'mBank S.A. Bankowość Detaliczna;',
    '#Klient;',
    'JAN KAPITAN;',
    '#Za okres:;',
    `${plDay(rows[0]!.date)};${plDay(rows.at(-1)!.date)};`,
    '#Data księgowania;#Data operacji;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Saldo po operacji;',
    ...lines.reverse(),
    ';',
    `#Saldo końcowe;${zlText(balance)};`
  ].join('\n')
  const file = join(dir, name)
  writeFileSync(file, text)
  return file
}

/** The quick entry window (created hidden at the start or on its first opening). */
async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  await expect.poll(() => (found = app.windows().find((w) => w.url().includes('quick=1')))).toBeTruthy()
  await expect(found!.getByTestId('quick-amount')).toBeVisible()
  return found!
}

test('ładownia pilnuje cen i opłat (1.9.0, F9, F23): nowa cena z „Zaktualizuj”, kontener bez płatności, opłata co 2 miesiące i rachunek zmienny z historii', async () => {
  const { month } = warsawNow()
  const start = `${addMonths(month, -7)}-01`
  const day = (m: number, d: number) => `${addMonths(month, -m)}-${String(d).padStart(2, '0')}`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-sensors-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -7), salary: zl(4000), envelopes: {} }],
      containers: [
        { id: NETFLIX, name: 'Netflix', amount: zl(43), cycleMonths: 1, dueMonth: addMonths(month, -7), dueDay: 10, counterparty: 'NETFLIX' },
        { id: GYM, name: 'Siłownia', amount: zl(120), cycleMonths: 1, dueMonth: addMonths(month, -7), dueDay: 5, counterparty: 'CITYFIT' }
      ],
      transactions: [
        // Netflix: 43 zł, its last two payments at 49 zł – a new price.
        ...[6, 5, 4, 3].map((m) => pay(day(m, 10), 'NETFLIX', 43, { containerId: NETFLIX })),
        ...[2, 1].map((m) => pay(day(m, 10), 'NETFLIX', 49, { containerId: NETFLIX })),
        // The gym: paid until 4 months ago – its dues since without a payment.
        ...[7, 6, 5, 4].map((m) => pay(day(m, 5), 'CITYFIT', 120, { containerId: GYM })),
        // Water every 2 months – its third payment last month made it a fee (new in the history).
        ...[5, 3, 1].map((m) => pay(day(m, 15), 'WODOCIĄGI', 90)),
        // Electricity every month, its amount varying: a bill of the year's 75th percentile.
        ...[150, 260, 180, 210, 170, 230].map((amount, i) => pay(day(6 - i, 20), 'ENERGA', amount))
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const item = (kind: string) => page.locator(`[data-testid="briefing-item"][data-kind="${kind}"]`)
    await expect(item('price')).toContainText('Kontener cięższy niż w manifeście – Netflix: 43,00 zł → 49,00 zł co miesiąc (+14%, +72,00 zł rocznie). Zaktualizować?')
    await expect(item('dead')).toContainText(`Siłownia: brak płatności od ${dm(day(4, 5))}`)
    await expect(item('recurring')).toContainText('Nowa opłata w historii: WODOCIĄGI co 2 miesiące – 90,00 zł')

    await page.keyboard.press('Control+5')
    await expect(page.getByTestId('page-cargo')).toBeVisible()
    // The history's proposals: the water every 2 months, the electricity – a variable bill.
    const proposal = (name: string) => page.locator(`[data-testid="cargo-proposal"][data-name="${name}"]`)
    await expect(proposal('WODOCIĄGI')).toHaveAttribute('data-cycle', '2')
    await expect(proposal('WODOCIĄGI').getByTestId('cargo-proposal-cycle')).toHaveText('co 2 miesiące')
    await expect(proposal('ENERGA').getByTestId('cargo-proposal-cycle')).toHaveText('co miesiąc · zmienna')
    await expect(proposal('ENERGA')).toContainText('230,00 zł')
    // „Nie proponuj” – gone until „proponuj znowu”.
    await proposal('WODOCIĄGI').getByTestId('cargo-proposal-ignore').click()
    await expect(proposal('WODOCIĄGI')).toHaveCount(0)
    await expect(page.getByTestId('cargo-proposals-unignore')).toHaveText('Ukryte propozycje: 1 – proponuj znowu')
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.cargo.ignored.length).toBe(1)
    await page.getByTestId('cargo-proposals-unignore').click()
    await expect(proposal('WODOCIĄGI')).toHaveCount(1)
    // The variable bill to the hold.
    await proposal('ENERGA').getByTestId('cargo-proposal-add').click()
    await expect(page.getByTestId('container-variable')).toBeChecked()
    await page.getByTestId('cargo-new-save').click()
    await expect(proposal('ENERGA')).toHaveCount(0)
    await expect
      .poll(async () => (await records(dir, 'containers')).filter((c) => c.name === 'ENERGA').map((c) => [c.amount, c.cycleMonths, c.variable]))
      .toEqual([[zl(230), 1, true]])

    // The new price: the simulation, „Zaktualizuj” from this month on – the months before keep the old amount.
    const row = (name: string) => page.locator(`[data-testid="cargo-row"][data-name="${name}"]`)
    await expect(row('Netflix').getByTestId('cargo-row-price')).toHaveText('cięższy')
    await row('Netflix').click()
    await expect(page.getByTestId('container-price')).toContainText('Netflix: 43,00 zł → 49,00 zł co miesiąc (+14%, +72,00 zł rocznie)')
    await expect(page.getByTestId('container-price').getByTestId('cargo-sim')).toBeVisible()
    await page.getByTestId('container-price-update').click()
    await expect(page.getByTestId('container-price')).toHaveCount(0)
    await expect(page.getByTestId('container-history-amounts')).toHaveText(`do ${mm(addMonths(month, -1))}: 43,00 zł · od ${mm(month)}: 49,00 zł`)
    await expect
      .poll(async () => (await records(dir, 'containers')).filter((c) => c.id === NETFLIX).map((c) => [c.amount, (c.past as Array<{ until: string; amount: number }>).map((x) => [x.until, x.amount])]))
      .toEqual([[zl(49), [[addMonths(month, -1), zl(43)]]]])

    // The container gone quiet: dropped from the hold.
    await expect(row('Siłownia').getByTestId('cargo-row-dead')).toHaveText('anulowana?')
    await row('Siłownia').click()
    await expect(page.getByTestId('container-dead')).toContainText(`Siłownia: brak płatności od ${dm(day(4, 5))}`)
    await page.getByTestId('container-dead-drop').click()
    await expect(page.getByTestId('container-dead')).toHaveCount(0)
    await expect.poll(async () => (await records(dir, 'containers')).filter((c) => c.id === GYM).map((c) => c.archived)).toEqual([true])

    // The briefing: both answered.
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(item('price')).toHaveCount(0)
    await expect(item('dead')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('plik z mBanku w Pobranych (1.9.0, F14): meldunek w odprawie, import jednym kliknięciem, „Przenieś plik do Kosza”, następny plik zauważony w trakcie pracy', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -1)}-01`
  const downloads = mkdtempSync(join(tmpdir(), 'fi-pobrane-'))
  const first = historia(downloads, 'historia.csv', [
    { date: addDays(today, -3), shop: 'PIEKARNIA ZIARNO', amount: -12.5 },
    { date: addDays(today, -2), shop: 'APTEKA POD LIPA', amount: -48.2 },
    { date: addDays(today, -1), shop: 'PIEKARNIA ZIARNO', amount: -9.9 }
  ])
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-sensors-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(5000) }],
      months: [{ month: addMonths(month, -1), salary: zl(4000), envelopes: {} }]
    }
  })
  const { app, page, errors } = await launch({ dataDir, env: { FI_DOWNLOADS_DIR: downloads, FI_BANK_FILES_POLL_MS: '300' } })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const news = page.locator('[data-testid="briefing-item"][data-kind="import"]').filter({ hasText: 'Nowy meldunek z mBanku' })
    await expect(news).toHaveCount(1)
    await expect(news).toContainText(`Nowy meldunek z mBanku (${dm(addDays(today, -3))}–${dm(addDays(today, -1))}): historia.csv w folderze Pobrane – importuj.`)
    // One click: the file opened in Import.
    await news.click()
    await expect(page.getByTestId('page-import')).toBeVisible()
    await expect(page.getByTestId('import-file')).toBeVisible()
    await expect(page.getByTestId('import-count-new')).toHaveText('3')
    await page.getByTestId('import-run').click()
    await expect(page.getByTestId('import-done')).toBeVisible()
    // After the import: the file to the Recycle Bin (the bin of the system replaced – the test's file is only noted).
    await app.evaluate(({ shell }) => {
      ;(globalThis as { trashed?: string[] }).trashed = []
      shell.trashItem = (async (path: string) => {
        ;(globalThis as { trashed?: string[] }).trashed!.push(path)
      }) as typeof shell.trashItem
    })
    await page.getByTestId('import-trash-file').click()
    await expect(page.getByTestId('import-trash')).toHaveCount(0)
    expect(await app.evaluate(() => (globalThis as { trashed?: string[] }).trashed)).toEqual([first])

    // Imported: not announced again; the next file of the bank – noticed while the app runs.
    await page.keyboard.press('Control+1')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await expect(news).toHaveCount(0)
    historia(downloads, 'historia (1).csv', [{ date: today, shop: 'KWIACIARNIA ROZA', amount: -35 }])
    await expect(news).toHaveCount(1)
    await expect(news).toContainText('historia (1).csv w folderze Pobrane')
    await page.keyboard.press('Control+3')
    await expect(page.getByTestId('import-bank-file')).toHaveAttribute('data-name', 'historia (1).csv')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('radar anomalii i zwroty w drodze (1.9.0, F31, F34): nietypowy zakup i podwójne obciążenie z „to w porządku”, „Czekam na zwrot” z Radarem i zwrotem z szybkiego wpisu', async () => {
  const { date: today, month } = warsawNow()
  const start = `${addMonths(month, -7)}-01`
  const day = (m: number, d: number) => `${addMonths(month, -m)}-${String(d).padStart(2, '0')}`
  const bank = (key: string) => ({ key, counterparty: 'MEDIA EXPERT', operation: 'ZAKUP PRZY UŻYCIU KARTY', importedAt: `${today}T10:00:00.000Z` })
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-sensors-')), 'FinancialIntel')
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: MBANK, kind: 'opening', amount: zl(20000) }],
      months: [{ month: addMonths(month, -7), salary: zl(4000), envelopes: {} }],
      transactions: [
        // The florist: 20–30 zł every month, now 200 zł – well above the usual.
        ...[22, 25, 30, 20, 28, 24].map((amount, i) => pay(day(7 - i, 12), 'KWIACIARNIA RÓŻA', amount)),
        pay(addDays(today, -2), 'KWIACIARNIA RÓŻA', 200),
        // Two charges from the bank of one shop and amount on one day: a possible double charge.
        pay(addDays(today, -3), 'MEDIA EXPERT', 129.99, { bank: bank('row-a') }),
        pay(addDays(today, -3), 'MEDIA EXPERT', 129.99, { bank: bank('row-b') }),
        // Goods sent back 20 days ago: the money awaited (14 days by default – late now).
        pay(addDays(today, -20), 'ZALANDO', 149)
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const signals = page.locator('[data-testid="briefing-item"][data-kind="anomaly"]')
    await expect(signals).toHaveCount(2)
    await expect(signals.filter({ hasText: 'KWIACIARNIA RÓŻA' })).toContainText(`Nieznany sygnał na radarze – KWIACIARNIA RÓŻA 200,00 zł (${dm(addDays(today, -2))}) – zwykle do 30,00 zł.`)
    await expect(signals.filter({ hasText: 'MEDIA EXPERT' })).toContainText('Dwa obciążenia z banku: MEDIA EXPERT 129,99 zł – możliwe podwójne pobranie')

    // Meldunki: „to w porządku” – remembered, never reported again.
    await page.keyboard.press('Control+Shift+M')
    await expect(page.getByTestId('page-inbox')).toBeVisible()
    const reports = page.locator('[data-testid="inbox-item"][data-kind="anomalies"]')
    await expect(reports).toHaveCount(2)
    await reports.filter({ hasText: 'KWIACIARNIA RÓŻA' }).getByTestId('inbox-anomaly-ok').click()
    await expect(reports).toHaveCount(1)
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.anomalies.ok.map((k: string) => k.split(':')[0])).toEqual(['brand'])
    // The double charge: both operations in Operacje, marked „nietypowa”.
    await reports.getByTestId('inbox-open').click()
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await expect(page.getByTestId('operation-row')).toHaveCount(2)
    await expect(page.getByTestId('operation-row').first()).toContainText('nietypowa')

    // The return: „Czekam na zwrot” on the purchase (through the palette – it is of another month, maybe); late already.
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('ZALANDO')
    await expect(page.getByTestId('palette-operation').first()).toContainText('ZALANDO')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('operation-counterparty')).toHaveValue('ZALANDO')
    await page.getByTestId('operation-await').click()
    await expect(page.getByTestId('operation-await-box')).toHaveAttribute('data-state', 'late')
    await expect(page.getByTestId('operation-await-state')).toHaveText('Po terminie 6 dni – zwrot nie dotarł.')
    await expect
      .poll(async () => (await records(dir, 'transactions')).filter((t) => t.counterparty === 'ZALANDO').map((t) => t.awaitReturn))
      .toEqual([{ amount: zl(149), until: addDays(today, -6), closedAt: null }])
    await page.keyboard.press('Control+1')
    await expect(page.locator('[data-testid="briefing-item"][data-kind="return"]')).toContainText('ZALANDO: 149,00 zł zwrotu nie dotarło od 6 dni')
    await page.keyboard.press('Control+7')
    const onTheWay = page.getByTestId('radar-return')
    await expect(onTheWay).toHaveAttribute('data-state', 'late')
    await expect(onTheWay).toContainText('ZALANDO')
    await expect(onTheWay).toContainText('po terminie 6 dni')
    await onTheWay.getByTestId('radar-return-open').click()
    await expect(page.getByTestId('operation-await-box')).toHaveAttribute('data-state', 'late')

    // The money back – typed in the quick entry: the return arrived (its purchase says so), gone from the Radar and the briefing.
    const quick = await quickWindow(app, page)
    await quick.getByRole('radio', { name: 'Wpływ' }).click()
    await quick.getByTestId('quick-amount').fill('149')
    await quick.getByTestId('quick-counterparty').fill('ZALANDO')
    await quick.getByTestId('quick-time').fill('12:00')
    await quick.getByTestId('quick-time').press('Tab')
    await quick.getByTestId('quick-save').click()
    await expect(page.getByTestId('operation-await-box')).toHaveAttribute('data-state', 'arrived')
    await expect(page.getByTestId('operation-await-state')).toHaveText(`Dotarł: 149,00 zł ${dm(today)} (ZALANDO).`)
    await page.keyboard.press('Control+7')
    await expect(page.getByTestId('radar-returns')).toContainText('Brak zwrotów w drodze')
    await page.keyboard.press('Control+1')
    await expect(page.locator('[data-testid="briefing-item"][data-kind="return"]')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
