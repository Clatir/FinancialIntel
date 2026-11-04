/** OP.4–OP.9, ME.4 – wyszukiwanie, filtry, oznaczenia, „bez kategorii”, sortowanie na stanie „rok+op”. */
import { test, type Page } from '@playwright/test'
import { reading } from './lab'
import { enrich, goInbox, goOps, ops, opt, periodAll, rows, run, say, search, shown, snap, step, sums, text, WALLET, MAREK, GOAL_LAPTOP } from './op-pomoc'

const count = async (page: Page) => (await sums(page)).split('\n')[0]!
const rowList = async (page: Page, n = 50) => (await rows(page).allInnerTexts()).slice(0, n).map((t) => t.replace(/\s+/g, ' '))
async function mark(page: Page, m: string, on: boolean) {
  await page.getByTestId('operations-marks').click()
  const box = page.getByTestId(`operations-marks-${m}`)
  if ((await box.isChecked()) !== on) await box.click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}

test('OP.4 OP.6 OP.7 OP.8 OP.9 – wyszukiwanie, oznaczenia, więcej filtrów, sortowanie', async () => {
  const r = await run('op-filtry', enrich)
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await periodAll(page)
    // OP.4
    await page.locator('body').click({ position: { x: 700, y: 700 } })
    await page.keyboard.press('/')
    say('OP.4 fokus po „/”', await page.evaluate(() => document.activeElement?.getAttribute('data-testid')))
    for (const q of ['zabka', 'ŻABKA', 'lodz', 'pizzeria tomkiem', '12,50', 'kabel hdmi', '#wakacje', 'wakacje']) {
      await search(page, q)
      say(`OP.4 „${q}”`, { licznik: await count(page), wiersze: await rowList(page, 8) })
    }
    await search(page, '12,50')
    await snap(page, 'OP.4-kwota')
    await search(page, '')
    // „/” while typing in the editor.
    await step('„/” w polu edytora', async () => {
      await rows(page).first().click()
      const note = page.getByTestId('operation-note')
      await note.click()
      await page.keyboard.type('a/b')
      say('OP.4 „/” w notatce', { notatka: await note.inputValue(), fokus: await page.evaluate(() => document.activeElement?.getAttribute('data-testid')), szukaj: await page.getByTestId('operations-search').inputValue() })
      await note.press('Escape')
    })

    // OP.6 marks one by one.
    const marks = ['refundable', 'owed', 'partlyRepaid', 'repaid', 'impulse', 'plan', 'night', 'split', 'uncategorized', 'bank', 'pending', 'manual', 'anomaly', 'awaiting']
    await page.getByTestId('operations-marks').click()
    const labels = await page.getByTestId('operations-marks-menu').innerText()
    await page.keyboard.press('Escape')
    say('OP.6 menu', labels)
    for (const m of marks) {
      await step(`znak ${m}`, async () => {
        await mark(page, m, true)
        const list = await rowList(page, 60)
        say(`OP.6 ${m}`, { licznik: await count(page), widoczne: list.length, przykłady: list.slice(0, 4) })
        await mark(page, m, false)
      })
    }
    await mark(page, 'bank', true)
    await mark(page, 'pending', true)
    say('OP.6 z banku + nierozliczona', await count(page))
    await mark(page, 'bank', false)
    await mark(page, 'pending', false)
    await mark(page, 'plan', true)
    await mark(page, 'night', true)
    say('OP.6 plan + noc', { licznik: await count(page), wiersze: await rowList(page, 10) })
    await mark(page, 'impulse', true)
    say('OP.6 (plan | impuls) + noc', { licznik: await count(page), wiersze: await rowList(page, 10) })
    await snap(page, 'OP.6-grupy')
    await mark(page, 'plan', false)
    await mark(page, 'night', false)
    await mark(page, 'impulse', false)

    // OP.7 „bez kategorii”.
    await mark(page, 'uncategorized', true)
    const unc = await rowList(page, 60)
    say('OP.7 bez kategorii – lista', { licznik: await count(page), wiersze: unc })
    await snap(page, 'OP.7-bez-kategorii')
    await mark(page, 'uncategorized', false)
    for (const q of ['robert testowy', 'sklep komputerowy', 'zakup dla marka', 'market zero', 'przelew na lokatę', 'wpływ bez kategorii']) {
      await search(page, q)
      say(`OP.7 wiersz „${q}”`, await rowList(page, 3))
    }
    await search(page, '')
    await goInbox(page)
    const inboxUnc = (await page.getByTestId('inbox-item').allInnerTexts()).filter((t) => /bez kategorii/i.test(t))
    say('OP.7 meldunek', inboxUnc)
    reading('op', 'OP.7', 'rok+op', { meldunek: inboxUnc.join(' | '), filtr: unc.length })
    await goOps(page)

    // OP.8 „Więcej filtrów”.
    const more = page.getByTestId('operations-more')
    const openMore = async () => {
      if (!(await shown(page.getByTestId('operations-amount-min')))) await more.click()
      await page.waitForTimeout(200)
    }
    await openMore()
    await page.getByTestId('operations-amount-min').fill('50')
    await page.getByTestId('operations-amount-min').press('Tab')
    await page.getByTestId('operations-amount-max').fill('50')
    await page.getByTestId('operations-amount-max').press('Tab')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.8 kwota 50–50', { licznik: await count(page), przycisk: await more.innerText(), wiersze: await rowList(page, 20) })
    await openMore()
    await page.getByTestId('operations-amount-min').fill('100')
    await page.getByTestId('operations-amount-min').press('Tab')
    await page.getByTestId('operations-amount-max').fill('20')
    await page.getByTestId('operations-amount-max').press('Tab')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.8 kwota 100–20', { licznik: await count(page), pola: [await opt(page.getByTestId('operations-amount-min'))], wiersze: (await rowList(page, 6)) })
    await openMore()
    await page.getByTestId('operations-more-clear').click()
    await page.waitForTimeout(300)
    await openMore()
    await page.getByTestId(`operations-more-member-${MAREK}`).check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.8 domownik Marek', { licznik: await count(page), wiersze: await rowList(page, 20) })
    await openMore()
    await page.getByTestId(`operations-more-member-${MAREK}`).uncheck()
    await page.getByTestId('operations-more-brand-search').fill('orlen')
    await page.waitForTimeout(400)
    const brandOpts = await page.locator('[data-testid^="operations-more-brand-"]:not([data-testid="operations-more-brand-search"])').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')} :: ${(e.parentElement as HTMLElement).innerText}`))
    say('OP.8 kontrahent „orlen” – pozycje', brandOpts)
    await page.locator('[data-testid^="operations-more-brand-"]:not([data-testid="operations-more-brand-search"])').first().check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.8 kontrahent wybrany', { licznik: await count(page), przycisk: await more.innerText(), nazwy: [...new Set((await rowList(page, 50)).map((t) => t.split(' ').slice(2, 5).join(' ')))] })
    // Several sections at once – the counter.
    await openMore()
    await page.locator('[data-testid^="operations-more-container-"]').first().check()
    await page.locator('[data-testid^="operations-more-goal-"]').first().check().catch(() => undefined)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('OP.8 licznik po trzech sekcjach (kontrahent, ładownia, cel)', { przycisk: await more.innerText(), licznik: await count(page) })
    await openMore()
    await page.getByTestId('operations-more-clear').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    for (const [label, sel] of [
      ['Ładownia (pierwszy)', '[data-testid^="operations-more-container-"]'],
      ['Cel – Nowy laptop', `[data-testid="operations-more-goal-${GOAL_LAPTOP}"]`],
      ['Pożyczka (pierwsza)', '[data-testid^="operations-more-loan-"]'],
      ['Tag (pierwszy)', '[data-testid^="operations-more-tag-"]'],
      ['Konto przelewu Portfel XTB', `[data-testid="operations-more-transfer-${WALLET}"]`],
      ['Konto przelewu spoza budżetu', '[data-testid="operations-more-transfer-none"]']
    ] as const) {
      await step(label, async () => {
        await openMore()
        const box = page.locator(sel).first()
        const lab = await box.evaluate((e) => (e.parentElement as HTMLElement).innerText)
        await box.check()
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
        say(`OP.8 ${label} („${lab}”)`, { licznik: await count(page), przycisk: await more.innerText(), wiersze: await rowList(page, 8) })
        await openMore()
        await box.uncheck()
        await page.keyboard.press('Escape')
      })
    }
    // „wyczyść te filtry” leaves the other filters.
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    await openMore()
    await page.getByTestId('operations-amount-min').fill('100')
    await page.getByTestId('operations-amount-min').press('Tab')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const before = await count(page)
    await openMore()
    await page.getByTestId('operations-more-clear').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('OP.8 „wyczyść te filtry”', { przed: before, po: await count(page), konto: await page.getByTestId('operations-accounts').innerText(), przycisk: await more.innerText() })
    await snap(page, 'OP.8-wyczysc')
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).uncheck()
    await page.keyboard.press('Escape')

    // OP.9 sorting – November.
    await page.getByTestId('operations-period-menu').click()
    await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
    await page.waitForTimeout(400)
    for (const by of ['counterparty', 'amount', 'date']) {
      await page.getByTestId(`operations-sort-${by}`).click()
      await page.waitForTimeout(400)
      const header = await page.getByTestId('operations-header').evaluate((h) => Array.from(h.querySelectorAll('button')).map((b) => `${(b as HTMLElement).innerText.replace(/\s+/g, ' ')}${/accent/.test(b.className) ? ' [akcent]' : ''}`))
      say(`OP.9 sortowanie ${by}`, { nagłówek: header, wiersze: (await rowList(page, 40)).map((t) => t.split(' ').slice(0, 7).join(' ')) })
    }
    await page.getByTestId('operations-sort-counterparty').click()
    await snap(page, 'OP.9-kontrahent')
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-column-counterparty').uncheck()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.9 po ukryciu kolumny Kontrahent', { nagłówek: await text(page, '[data-testid="operations-header"]'), wiersze: (await rowList(page, 12)) })
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-column-counterparty').check()
    await page.keyboard.press('Escape')
    void dataDir
    void ops
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.5 filtry Konto, Rodzaj, Kategoria i archiwizacja; ME.4 bez kategorii', async () => {
  const r = await run('op-filtry-2', enrich)
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await periodAll(page)
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    say('OP.5 Konto Portfel XTB', await count(page))
    await page.getByTestId('operations-kinds').click()
    await page.getByTestId('operations-kinds-expense').check()
    say('OP.5 + Rodzaj Wydatek', await count(page))
    await page.getByTestId('operations-kinds-transfer').check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('OP.5 + Rodzaj Wydatek lub Przelew', { licznik: await count(page), rodzaj: await page.getByTestId('operations-kinds').innerText() })
    await page.getByTestId('operations-kinds').click()
    await page.getByTestId('operations-kinds-menu').getByRole('button', { name: 'wszystkie', exact: true }).click()
    await page.keyboard.press('Escape')
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).uncheck()
    await page.keyboard.press('Escape')
    const cats = async (ids: string[]) => {
      await page.getByTestId('operations-categories').click()
      await page.getByTestId('operations-categories-menu').getByRole('button', { name: 'wszystkie', exact: true }).click()
      for (const id of ids) await page.getByTestId(`operations-categories-${id}`).check()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
      return { licznik: await count(page), przycisk: await page.getByTestId('operations-categories').innerText(), carrefour: (await rowList(page, 200)).filter((t) => /Carrefour/.test(t)) }
    }
    say('OP.5 Kategoria Dom (główna)', await cats(['01KDEFCAT00000000000000200']))
    say('OP.5 Kategoria Dom · wyposażenie (podkat.)', await cats(['01KDEFCAT00000000000000203']))
    say('OP.5 Kategoria Jedzenie (główna)', await cats(['01KDEFCAT00000000000000100']))
    say('OP.5 Kategoria Dom · chemia', await cats(['01KDEFCAT00000000000000204']))
    // Archive „chemia” with the filter on.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-categories').click()
    const sub = page.locator('[data-testid="category-row"][data-name="Dom"] [data-testid="subcategory"][data-name="chemia"]')
    say('OP.5 przyciski podkategorii', await sub.getByRole('button').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText}|${e.getAttribute('title')}`)))
    await sub.getByRole('button').last().click()
    await page.waitForTimeout(500)
    await goOps(page)
    await page.getByTestId('operations-categories').click()
    const menu = await page.getByTestId('operations-categories-menu').innerText()
    say('OP.5 po archiwizacji', { przycisk: await page.getByTestId('operations-categories').innerText(), licznik: await count(page), menuChemia: menu.split('\n').filter((l) => /chemia/.test(l)), zaznaczona: await page.getByTestId('operations-categories-01KDEFCAT00000000000000204').isChecked().catch(() => 'brak pola') })
    await snap(page, 'OP.5-archiwum')
    await page.getByTestId('operations-categories-01KDEFCAT00000000000000204').uncheck().catch(() => undefined)
    await page.keyboard.press('Escape')
    say('OP.5 odznaczona', await page.getByTestId('operations-categories').innerText())

    // ME.4
    await goInbox(page)
    const item = page.getByTestId('inbox-item').filter({ hasText: /bez kategorii/ })
    const said = await opt(item)
    say('ME.4 meldunek', said)
    reading('op', 'ME.4', 'rok+op', { meldunek: said })
    await item.getByTestId('inbox-open').click()
    await page.waitForTimeout(800)
    const list = await rowList(page, 60)
    say('ME.4 „Pokaż w Operacjach”', { okres: await text(page, '[data-testid="operations-period"]'), licznik: await count(page), mójFiltr: await shown(page.getByTestId('operations-stored-filter')), wiersze: list })
    await snap(page, 'ME.4-pokaz')
    // Categorize them one by one (the receipt's line too).
    for (let i = 0; i < 8; i++) {
      const row = rows(page).first()
      if (!(await row.count())) break
      await row.click()
      await page.waitForTimeout(300)
      if (await shown(page.getByTestId('operation-category'))) await page.getByTestId('operation-category').selectOption({ label: 'Prezenty i inne · inne' })
      else if (await shown(page.getByTestId('split-category'))) {
        const n = await page.getByTestId('split-category').count()
        for (let k = 0; k < n; k++) {
          const v = await page.getByTestId('split-category').nth(k).inputValue()
          if (!v) await page.getByTestId('split-category').nth(k).selectOption({ label: 'Prezenty i inne · inne' })
        }
      }
      await page.waitForTimeout(500)
    }
    say('ME.4 po skategoryzowaniu – lista', { licznik: await count(page), wiersze: await rowList(page, 10) })
    await page.getByTestId('operations-stored-filter').click().catch(() => undefined)
    await page.waitForTimeout(300)
    say('ME.4 „mój filtr”', { okres: await text(page, '[data-testid="operations-period"]'), licznik: await count(page) })
    await goInbox(page)
    say('ME.4 meldunki po', (await page.getByTestId('inbox-item').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')))
    void dataDir
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.8 potwierdzenie – kwota „od” większa niż „do”', async () => {
  const r = await run('op-kwota-od-do', enrich)
  const { page, app, errors } = r
  try {
    await goOps(page)
    await periodAll(page)
    await page.getByTestId('operations-more').click()
    await page.getByTestId('operations-amount-min').fill('100')
    await page.getByTestId('operations-amount-min').press('Tab')
    await page.getByTestId('operations-amount-max').fill('20')
    await page.getByTestId('operations-amount-max').press('Tab')
    await page.waitForTimeout(400)
    const fields = { od: await page.getByTestId('operations-amount-min').inputValue(), do: await page.getByTestId('operations-amount-max').inputValue() }
    const menu = await page.getByTestId('operations-more-amount').innerText().catch(() => '')
    await snap(page, 'OP.8-od-do-menu')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    const cells = await page.getByTestId('operation-amount-cell').allInnerTexts()
    const vals = cells.map((c) => Math.abs(Number(c.replace(/[^\d,]/g, '').replace(',', '.'))))
    say('OP.8 od 100 do 20', { pola: fields, sekcja: menu, licznik: await count(page), min: Math.min(...vals), max: Math.max(...vals), przykłady: cells.slice(0, 8) })
    await snap(page, 'OP.8-od-do')
    say('errors', errors)
  } finally {
    await app.close()
  }
})
