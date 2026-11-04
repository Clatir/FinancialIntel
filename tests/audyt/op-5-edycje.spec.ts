/** OP.17, OP.19, OP.21, OP.23, OP.27, OP.39 – edycje na stanie „rok+op”. */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { reading } from './lab'
import { balanceOf, editorText, enrich, goOps, ID, openOp, ops, opt, periodAll, restart, rows, run, say, search, shown, snap, step, sums, text, toasts, typeIn, WALLET } from './op-pomoc'

const guardText = async (page: Page) => (await opt(page.getByTestId('operation-guard'))).replace(/\n+/g, ' | ')
const rowList = async (page: Page, n = 40) => (await rows(page).allInnerTexts()).slice(0, n).map((t) => t.replace(/\s+/g, ' '))

/** The save dialog answered with `path`; what the app proposed (its default path) recorded. */
async function saveTo(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, p) => {
    const g = globalThis as unknown as { __opSave?: unknown[] }
    g.__opSave = []
    dialog.showSaveDialog = (async (...args: unknown[]) => {
      const opts = (args.length > 1 ? args[1] : args[0]) as { defaultPath?: string; filters?: unknown }
      g.__opSave!.push({ defaultPath: opts?.defaultPath, filters: opts?.filters })
      return { canceled: false, filePath: p }
    }) as typeof dialog.showSaveDialog
  }, path)
}
const proposed = (app: ElectronApplication) => app.evaluate(() => (globalThis as unknown as { __opSave?: unknown[] }).__opSave)

test('OP.17 oficer, koperta, „Zapamiętaj”', async () => {
  const r = await run('op-oficer', enrich)
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await openOp(page, 'dino', 'Dino')
    say('OP.17 Dino – oficer', { przycisk: await opt(page.getByTestId('operation-officer')), dymek: await opt(page.getByTestId('operation-officer'), 'title'), kategoria: await page.getByTestId('operation-category').inputValue() })
    // The officer's category archived: what it offers then.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-categories').click()
    const sub = page.locator('[data-testid="category-row"][data-name="Jedzenie"] [data-testid="subcategory"][data-name="zakupy spożywcze"]')
    await sub.getByRole('button').last().click()
    await page.waitForTimeout(500)
    await goOps(page)
    await openOp(page, 'dino', 'Dino')
    say('OP.17 Dino – oficer przy zarchiwizowanej „zakupy spożywcze”', await opt(page.getByTestId('operation-officer')))
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-categories').click()
    await page.locator('[data-testid="category-row"][data-name="Jedzenie"] [data-testid="subcategory"][data-name="zakupy spożywcze"]').getByRole('button').last().click()
    await page.waitForTimeout(500)
    await goOps(page)
    await openOp(page, 'dino', 'Dino')
    await page.getByTestId('operation-officer').click().catch(() => undefined)
    await page.waitForTimeout(400)
    say('OP.17 po kliknięciu oficera', { kategoria: await page.getByTestId('operation-category').evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.textContent), plik: (await ops(dataDir)).find((t) => t.counterparty === 'Dino')?.categoryId })
    await snap(page, 'OP.17-oficer')
    // A category without an envelope.
    await page.getByTestId('operation-category').selectOption({ label: 'Darowizny' })
    await page.waitForTimeout(400)
    say('OP.17 kategoria bez koperty – notka', await opt(page.getByTestId('operation-outside-envelope')))
    // „Zapamiętaj” on the bank's row.
    await openOp(page, 'dino testowo', /DINO TESTOWO 4/)
    await page.getByTestId('operation-counterparty').fill('Dino Market')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · kawa i przekąski' })
    await page.waitForTimeout(500)
    say('OP.17 „Zapamiętaj” – przycisk', await opt(page.getByTestId('operation-remember')))
    await snap(page, 'OP.17-zapamietaj')
    await page.getByTestId('operation-remember').click()
    await page.waitForTimeout(600)
    say('OP.17 po „Zapamiętaj”', { toast: await toasts(page) })
    const fi = JSON.parse(readFileSync(`${dataDir}/fi.json`, 'utf8'))
    say('OP.17 reguła w fi.json', fi.settings.import.rules.filter((x: any) => /dino/i.test(`${x.match} ${x.label}`)))
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-import').click()
    await page.waitForTimeout(500)
    say('OP.17 Ustawienia → Import z banku (dino)', (await text(page, 'main').catch(() => text(page))).split('\n').filter((l) => /dino/i.test(l)))
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.19 ostrzeżenie przy kwocie z banku', async () => {
  const r = await run('op-kwota-banku', enrich)
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await openOp(page, 'piekarnia')
    const file = async () => (await ops(dataDir)).find((t) => t.counterparty === 'PIEKARNIA TESTOWA')
    say('OP.19 otwarta', { kwota: await page.getByTestId('operation-amount').inputValue(), znaczki: (await editorText(page)).split('\n').slice(0, 3), potwierdzony: await shown(page.getByTestId('operation-confirmed')) })
    const amount = page.getByTestId('operation-amount')
    await amount.click()
    await amount.fill('54')
    await amount.press('Tab')
    await page.waitForTimeout(500)
    say('OP.19 45 → 54', await guardText(page))
    await snap(page, 'OP.19-ostrzezenie')
    await page.getByTestId('operation-guard-cancel').click()
    await page.waitForTimeout(400)
    say('OP.19 po Anuluj', { pole: await amount.inputValue(), plik: (await file())?.amount })
    await amount.click()
    await amount.fill('54')
    await amount.press('Tab')
    await page.waitForTimeout(400)
    await page.getByTestId('operation-guard-confirm').click()
    await page.waitForTimeout(500)
    say('OP.19 po „Zmień mimo to”', { pole: await amount.inputValue(), plik: (await file())?.amount })
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · kawa i przekąski' })
    await page.waitForTimeout(400)
    say('OP.19 zmiana kategorii – okno?', await guardText(page))
    await page.getByTestId('operation-note').fill('chleb i bułki')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(400)
    say('OP.19 zmiana notatki – okno?', { okno: await guardText(page), plik: [(await file())?.categoryId, (await file())?.note] })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.21 usuwanie z „Cofnij”', async () => {
  const r = await run('op-usun', enrich)
  const { page, app, dataDir, ictjDir, errors } = { ...r, ictjDir: `${r.dir}\\ictj` }
  let restarted: Awaited<ReturnType<typeof restart>> | null = null
  try {
    await goOps(page)
    const before = JSON.stringify((await ops(dataDir)).find((t) => t.id === ID.decathlon))
    const b0 = await balanceOf(page, 'Portfel XTB')
    await openOp(page, 'decathlon')
    await page.getByTestId('operation-delete').click()
    await page.waitForTimeout(300)
    say('OP.21 po pierwszym kliknięciu kosza', { plik: (await ops(dataDir)).some((t) => t.id === ID.decathlon), przycisk: await opt(page.getByTestId('operation-delete-confirm')) })
    await snap(page, 'OP.21-potwierdzenie')
    await page.getByTestId('operation-delete-confirm').click()
    await page.waitForTimeout(800)
    const b1 = await balanceOf(page, 'Portfel XTB')
    say('OP.21 po usunięciu', { toast: await toasts(page), plik: (await ops(dataDir)).some((t) => t.id === ID.decathlon), saldo: b1 })
    await page.getByRole('status').filter({ hasText: 'Usunięto' }).getByRole('button', { name: 'Cofnij' }).click()
    await page.waitForTimeout(800)
    const after = JSON.stringify((await ops(dataDir)).find((t) => t.id === ID.decathlon))
    const pick = (s: string) => {
      const o = JSON.parse(s || '{}')
      return JSON.stringify({ splits: o.splits, tags: o.tags, note: o.note, amount: o.amount, date: o.date })
    }
    say('OP.21 po „Cofnij”', { taSamaTreść: pick(before) === pick(after), przed: pick(before), po: pick(after), saldo: await balanceOf(page, 'Portfel XTB') })
    reading('op', 'OP.21', 'rok+op (Decathlon 220 zł Portfel XTB 01.11)', { saldo_portfel_przed: b0, po_usunieciu: b1, po_cofnij: await balanceOf(page, 'Portfel XTB') })
    // A second one deleted for good: Synchronizacja → Usunięte wpisy; gone after a restart.
    await openOp(page, 'kiosk ruch')
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await page.waitForTimeout(800)
    await page.keyboard.press('Control+Shift+Y')
    await page.waitForTimeout(800)
    await page.getByTestId('deleted-load').click()
    await page.waitForTimeout(1500)
    const sync = await text(page, 'main').catch(() => text(page))
    const i = sync.indexOf('Usunięte wpisy')
    say('OP.21 Synchronizacja → Usunięte wpisy', sync.slice(i, i + 800))
    await snap(page, 'OP.21-usuniete-wpisy')
    await app.close()
    restarted = await restart('op-usun', dataDir, ictjDir)
    await goOps(restarted.page)
    await periodAll(restarted.page)
    await search(restarted.page, 'kiosk ruch')
    say('OP.21 po restarcie – „Kiosk Ruch”', { wiersze: await rowList(restarted.page, 5), plik: (await ops(dataDir)).filter((t) => t.counterparty === 'Kiosk Ruch').length })
    say('errors', [...errors, ...restarted.errors])
  } finally {
    if (restarted) await restarted.app.close()
    else await app.close()
  }
})

test('OP.23 części paragonu – opis, tag, ładownia, cel', async () => {
  const r = await run('op-czesci', enrich)
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await openOp(page, 'carrefour')
    const file = async () => (await ops(dataDir)).find((t) => t.id === ID.carrefour)
    await page.getByTestId('split-add').click()
    await page.waitForTimeout(300)
    await typeIn(page, page.getByTestId('split-amount').nth(1), '20', 'Tab')
    await typeIn(page, page.getByTestId('split-amount').nth(2), '10', 'Tab')
    // 501 characters typed into the first line's description.
    const note1 = page.getByTestId('split-note').nth(0)
    await note1.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.insertText('X'.repeat(501))
    await note1.press('Enter')
    await page.waitForTimeout(500)
    say('OP.23 opis 501 znaków', { pole: (await note1.inputValue()).length, plik: String(((await file())?.splits as any[])?.[0]?.note ?? '').length })
    // A tag on the last line.
    await page.getByTestId('split-tags-open').nth(2).click()
    await page.waitForTimeout(300)
    const tagInput = page.getByTestId('split-tags-input').first()
    await tagInput.fill('remont')
    await tagInput.press('Enter')
    await page.waitForTimeout(400)
    // A container on line 2, a goal on line 3.
    const lines = page.getByTestId('split-line')
    say('OP.23 kontrolki części', await page.getByTestId('operation-splits').innerText())
    await step('ładownia w części 2', async () => {
      const sel = page.locator('[aria-label="Kontener części 2"]')
      if (!(await sel.count())) await page.getByTestId('split-container').nth(1).click()
      await page.waitForTimeout(200)
      const opts = await page.locator('[aria-label="Kontener części 2"]').evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.textContent))
      say('OP.23 kontenery', opts)
      await page.locator('[aria-label="Kontener części 2"]').selectOption({ index: 1 })
    })
    await step('cel w części 3', async () => {
      const sel = page.locator('[aria-label="Cel części 3"]')
      if (!(await sel.count())) await page.getByTestId('split-goal').nth(2).click()
      await page.waitForTimeout(200)
      const opts = await page.locator('[aria-label="Cel części 3"]').evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.textContent))
      say('OP.23 cele', opts)
      await page.locator('[aria-label="Cel części 3"]').selectOption({ index: 1 })
    })
    await page.waitForTimeout(600)
    say('OP.23 plik po ustawieniu części', JSON.stringify((await file())?.splits))
    say('OP.23 wiersz', await rowList(page, 3))
    await snap(page, 'OP.23-czesci')
    // The second-to-last line removed.
    await lines.nth(1).getByTitle('Usuń część').click()
    await page.waitForTimeout(500)
    say('OP.23 po usunięciu przedostatniej (z 3)', { plik: JSON.stringify({ splits: (await file())?.splits, note: (await file())?.note, tags: (await file())?.tags }) })
    await lines.nth(0).getByTitle('Usuń część').click()
    await page.waitForTimeout(500)
    say('OP.23 po usunięciu kolejnej (z 2 – zostaje jedna)', { plik: JSON.stringify({ splits: (await file())?.splits, note: (await file())?.note, tags: (await file())?.tags, categoryId: (await file())?.categoryId, goalId: (await file())?.goalId }), edytor: (await editorText(page)).split('\n').filter((l) => /Notatka|remont|XXXX|Cel|cel/.test(l)).map((l) => l.slice(0, 80)) })
    // A container payment split into lines.
    await openOp(page, 'robert testowy', /28\.09/)
    say('OP.23 płatność kontenera przed', (await editorText(page)).split('\n').filter((l) => /adown|Rata|kontener/i.test(l)))
    await page.getByTestId('operation-split').click()
    await page.waitForTimeout(500)
    say('OP.23 płatność kontenera po podziale', { notka: await opt(page.getByTestId('operation-split-cargo')), ładownia: await shown(page.getByTestId('operation-container')), wybrany: await page.getByTestId('operation-container').evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.textContent).catch(() => '(brak)') })
    await snap(page, 'OP.23-kontener-podzial')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.27 tagi i wyprawy', async () => {
  const r = await run('op-tagi', enrich)
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await openOp(page, 'kiosk ruch')
    const input = page.getByTestId('operation-tags-input')
    const chips = () => page.getByTestId('operation-tags-chip').evaluateAll((els) => els.map((e) => e.getAttribute('data-tag')))
    say('OP.27 Kiosk Ruch – tagi', await chips())
    await input.fill('wakacje ')
    await input.press('Enter')
    await page.waitForTimeout(300)
    say('OP.27 „wakacje ” dopisane do „Wakacje”', await chips())
    // 21 tags.
    for (let i = 1; i <= 21; i++) {
      if (!(await shown(input))) {
        say(`OP.27 pole tagów znika przy tagu nr ${i}`, { komunikat: (await editorText(page)).split('\n').filter((l) => /tag|20/i.test(l)).slice(0, 6), toast: await toasts(page) })
        break
      }
      await input.fill(`t${i}`)
      await input.press('Enter')
      await page.waitForTimeout(120)
    }
    await page.waitForTimeout(500)
    say('OP.27 po 21 próbach', { liczba: (await chips()).length, plik: ((await ops(dataDir)).find((t) => t.counterparty === 'Kiosk Ruch')?.tags as string[] | undefined)?.length })
    await snap(page, 'OP.27-20-tagow')
    // A tag of 41 characters on another one.
    await openOp(page, 'łazienki kiosk')
    const long = 'A'.repeat(41)
    await page.getByTestId('operation-tags-input').fill(long)
    await page.getByTestId('operation-tags-input').press('Enter')
    await page.waitForTimeout(500)
    say('OP.27 tag 41 znaków', { chipy: await chips(), plik: (await ops(dataDir)).find((t) => t.counterparty === 'Łazienki Kiosk')?.tags, toast: await toasts(page) })
    // Filter and search catch both spellings.
    await page.getByTestId('operations-more').click()
    const tagOpts = await page.locator('[data-testid^="operations-more-tag-"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')} :: ${(e.parentElement as HTMLElement).innerText}`))
    say('OP.27 filtr Tag – pozycje', tagOpts)
    await page.locator('[data-testid="operations-more-tag-wakacje"]').check().catch(() => undefined)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.27 filtr Tag wakacje', { licznik: (await sums(page)).split('\n')[0], wiersze: await rowList(page, 6) })
    await page.getByTestId('operations-more').click()
    await page.getByTestId('operations-more-clear').click()
    await page.keyboard.press('Escape')
    await search(page, '#wakacje')
    say('OP.27 szukaj #wakacje', { licznik: (await sums(page)).split('\n')[0], wiersze: await rowList(page, 6) })
    // The trip's goal.
    await openOp(page, 'orlen stacja 7781')
    say('OP.27 wyprawa – przycisk', await opt(page.getByTestId('operation-tag-goal')))
    await page.getByTestId('operation-tag-goal').click().catch(() => undefined)
    await page.waitForTimeout(400)
    say('OP.27 po „rozlicz z celu”', { cel: await page.getByTestId('operation-goal').evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.textContent).catch(() => '(brak)'), plik: (await ops(dataDir)).find((t) => t.counterparty === 'ORLEN STACJA 7781')?.goalId })
    await snap(page, 'OP.27-wyprawa')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.39 eksport widocznej listy', async () => {
  const r = await run('op-eksport', enrich)
  const { page, app, errors } = r
  try {
    await goOps(page)
    await periodAll(page)
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    await page.getByTestId('operations-sort-amount').click()
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-column-tags').uncheck()
    await page.getByTestId('operations-column-note').uncheck()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const bar = await sums(page)
    const list = await rowList(page, 12)
    say('OP.39 pasek i początek listy', { pasek: bar.split('\n').slice(0, 4), lista: list })
    const csv = 'C:\\FI-audyt\\eksport\\op-portfel.csv'
    await saveTo(app, csv)
    await page.getByTestId('operations-export-csv').click()
    await page.waitForTimeout(2500)
    say('OP.39 CSV – propozycja i toast', { okno: await proposed(app), toast: await toasts(page) })
    const raw = readFileSync(csv)
    const content = raw.toString('utf8')
    const lines = content.split(/\r?\n/).filter(Boolean)
    say('OP.39 CSV – BOM, nagłówek, pierwsze wiersze', { bom: raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf, crlf: content.includes('\r\n'), liczba: lines.length - 1, nagłówek: lines[0], wiersze: lines.slice(1, 6) })
    const head = lines[0]!.replace(/^\uFEFF/, '').split(';')
    const ai = head.findIndex((h) => /kwota/i.test(h))
    const amounts = lines.slice(1).map((l) => l.split(';')[ai] ?? '')
    const sum = amounts.reduce((a, s) => a + Math.round(Number(s.replace(/\s/g, '').replace('\u00a0', '').replace(',', '.')) * 100), 0)
    say('OP.39 CSV – suma kwot (gr) i przykłady', { kolumnaKwoty: head[ai], suma: sum, przykłady: amounts.slice(0, 5), przelew: lines.filter((l) => /Przelew na Portfel/.test(l)), carrefour: lines.filter((l) => /Carrefour/.test(l)) })
    reading('op', 'OP.39', 'rok+op, Portfel XTB, cała historia', { pasek: bar.split('\n').slice(0, 4).join(' | '), suma_csv_gr: sum, wierszy_csv: lines.length - 1 })
    const xlsx = 'C:\\FI-audyt\\eksport\\op-portfel.xlsx'
    await saveTo(app, xlsx)
    await page.getByTestId('operations-export-xlsx').click()
    await page.waitForTimeout(3000)
    say('OP.39 Excel – propozycja i toast', { okno: await proposed(app), toast: await toasts(page) })
    try {
      const out = execFileSync('python', ['-c', `import zipfile,sys;z=zipfile.ZipFile(r'${xlsx}');print([n for n in z.namelist()]);s=z.read('xl/sharedStrings.xml').decode('utf8') if 'xl/sharedStrings.xml' in z.namelist() else '';print(s[:1500]);w=z.read('xl/worksheets/sheet1.xml').decode('utf8');print(len(w));print(w[:2500])`], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
      say('OP.39 Excel – zawartość', out)
    } catch (e) {
      say('OP.39 Excel – odczyt nieudany', (e as Error).message.slice(0, 300))
    }
    say('errors', errors)
  } finally {
    await app.close()
  }
})
