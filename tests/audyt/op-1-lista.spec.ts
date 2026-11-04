/** OP.2, OP.3, OP.1 (filtr), OP.41, ME.2 – lista Operacji i licznik meldunków na czystym „rok” (bez zmian danych). */
import { test } from '@playwright/test'
import { reading } from './lab'
import { goInbox, goOps, ops, periodAll, rows, run, say, search, snap, sums, text } from './op-pomoc'

const amountCells = async (page: import('@playwright/test').Page) =>
  page.getByTestId('operation-amount-cell').evaluateAll((els) => els.map((e) => ({ t: (e as HTMLElement).innerText, c: e.className })))

const parsePl = (s: string): number => Math.round(Number(s.replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.')) * 100)

async function sumsTitles(page: import('@playwright/test').Page) {
  return page.getByTestId('operations-sums').locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} ⟶ ${e.getAttribute('title')}`))
}

test('OP.2 OP.3 OP.1 lista, okres, sumy', async () => {
  const r = await run('op-lista')
  const { page, app, dataDir, errors } = r
  try {
    const files = await ops(dataDir)
    await goOps(page)
    say('OP.2 okres domyślny', await text(page, '[data-testid="operations-period"]'))
    say('OP.2 sumy bieżący', await sums(page))
    say('OP.2 dymki sum', await sumsTitles(page))
    reading('op', 'OP.2', 'rok', { okres: 'listopad 2026', sumy: (await sums(page)).replace(/\n/g, ' | ') })

    // Previous month: order inside a day, colours, sums against the rows.
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(600)
    say('OP.2 okres po ‹', await text(page, '[data-testid="operations-period"]'))
    const oct = await rows(page).allInnerTexts()
    say('OP.2 październik – wiersze (pierwsze 30)', oct.slice(0, 30).map((t) => t.replace(/\s+/g, ' ')))
    say('OP.2 październik – liczba wierszy', oct.length)
    const cells = await amountCells(page)
    const neg = cells.filter((c) => c.t.trim().startsWith('−') || c.t.trim().startsWith('-'))
    const pos = cells.filter((c) => c.t.trim().startsWith('+'))
    say('OP.2 klasy kwot (wydatki – zbiór klas)', [...new Set(neg.map((c) => c.c))])
    say('OP.2 klasy kwot (wpływy – zbiór klas)', [...new Set(pos.map((c) => c.c))])
    say('OP.2 suma wierszy: minus / plus (gr)', { minus: neg.reduce((a, c) => a + parsePl(c.t), 0), plus: pos.reduce((a, c) => a + parsePl(c.t), 0) })
    const octFiles = files.filter((t) => String(t.date).startsWith('2026-10'))
    say('OP.2 październik w plikach', { n: octFiles.length })
    say('OP.2 sumy październik', await sums(page))
    reading('op', 'OP.2', 'rok', { okres: 'październik 2026', sumy: (await sums(page)).replace(/\n/g, ' | ') })
    await snap(page, 'OP.2-pazdziernik')

    // September has the product return (ZARA +149,99).
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(600)
    const zara = page.getByTestId('operation-row').filter({ hasText: 'ZARA' })
    say('OP.2 wrzesień ZARA', await zara.evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} :: ${e.querySelector('[data-testid="operation-amount-cell"]')?.className}`)))
    reading('op', 'OP.2', 'rok', { okres: 'wrzesień 2026', sumy: (await sums(page)).replace(/\n/g, ' | ') })

    await periodAll(page)
    say('OP.2 sumy cała historia', await sums(page))
    reading('op', 'OP.2', 'rok', { okres: 'cała historia', sumy: (await sums(page)).replace(/\n/g, ' | ') })
    await snap(page, 'OP.2-cala-historia')

    // OP.1: a filter with no result.
    await search(page, 'qqqzzz')
    say('OP.1 lista przy filtrze bez wyników', await text(page, '[data-testid="operations-list"]'))
    say('OP.1 sumy', await sums(page))
    say('OP.1 cała strona (wyczyść?)', (await text(page, '[data-testid="page-operations"]')).slice(0, 900))
    await snap(page, 'OP.1-filtr-bez-wynikow')
    await search(page, '')

    // OP.3: month boundaries.
    const byMonth = (m: string) => files.filter((t) => String(t.date).startsWith(m)).map((t) => String(t.date))
    for (const m of ['2025-12', '2026-01', '2026-02', '2026-03', '2026-09']) {
      const ds = byMonth(m).sort()
      say(`OP.3 pliki ${m}`, { n: ds.length, pierwszy: ds[0], ostatni: ds[ds.length - 1] })
    }
    await page.getByTestId('operations-period-menu').click()
    await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
    await page.waitForTimeout(400)
    say('OP.3 bieżący miesiąc', await text(page, '[data-testid="operations-period"]'))
    // Back to December 2025 with „‹”.
    for (let i = 0; i < 11; i++) await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(600)
    for (const m of ['2025-12', '2026-01', '2026-02', '2026-03']) {
      const label = await text(page, '[data-testid="operations-period"]')
      const list = (await rows(page).allInnerTexts()).map((t) => t.split('\n')[0]!.trim())
      const days = list.map((d) => d.slice(0, 5))
      say(`OP.3 ${label}`, { wiersze: list.length, pierwszyNaGórze: days[0], ostatniNaDole: days[days.length - 1], sumy: (await sums(page)).split('\n')[0] })
      await page.getByTestId('operations-next-month').click()
      await page.waitForTimeout(500)
    }
    // A range from–to with the borders included, and „od” only.
    await page.getByTestId('operations-period-menu').click()
    await page.locator('input[type="date"]').nth(0).fill('2025-12-31')
    await page.locator('input[type="date"]').nth(1).fill('2026-01-01')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    say('OP.3 zakres 31.12–01.01 etykieta', await text(page, '[data-testid="operations-period"]'))
    say('OP.3 zakres 31.12–01.01 wiersze', (await rows(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')))
    say('OP.3 pliki 31.12 + 01.01', files.filter((t) => t.date === '2025-12-31' || t.date === '2026-01-01').length)
    await snap(page, 'OP.3-zakres')
    await page.getByTestId('operations-period-menu').click()
    await page.locator('input[type="date"]').nth(1).fill('')
    await page.locator('input[type="date"]').nth(0).fill('2026-10-26')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    say('OP.3 tylko od 26.10 etykieta', await text(page, '[data-testid="operations-period"]'))
    say('OP.3 tylko od – liczba', { lista: (await rows(page).allInnerTexts()).length, pliki: files.filter((t) => String(t.date) >= '2026-10-26').length, sumy: (await sums(page)).split('\n')[0] })
    // Beyond the current month.
    await page.getByTestId('operations-period-menu').click()
    await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
    await page.getByTestId('operations-next-month').click()
    await page.waitForTimeout(500)
    say('OP.3 › za bieżący', { okres: await text(page, '[data-testid="operations-period"]'), lista: await text(page, '[data-testid="operations-list"]') })
    await snap(page, 'OP.3-po-biezacym')

    // Account balances: Operacje vs Ustawienia → Konta vs Mostek.
    await page.getByTestId('operations-period-menu').click()
    await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
    const opsBalances = (await sums(page)).split('\n').filter((l) => /mBank|Portfel|Gotówka/.test(l))
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    await page.waitForTimeout(600)
    const setBalances = await page.getByTestId('account-row').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-name')}: ${(e.querySelector('[data-testid="account-balance"]') as HTMLElement | null)?.innerText}`))
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    const bridge = await text(page, '[data-testid="page-bridge"]')
    say('OP.2 salda: Operacje / Ustawienia / Mostek', { operacje: opsBalances, ustawienia: setBalances, mostek: bridge.split('\n').filter((l) => /mBank|Portfel|Gotówka|kont/i.test(l)).slice(0, 20) })
    reading('op', 'OP.2', 'rok', { salda_operacje: opsBalances.join(' | '), salda_ustawienia: setBalances.join(' | ') })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.41 klawiatura', async () => {
  const r = await run('op-klawiatura')
  const { page, app, errors } = r
  try {
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(800)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(500)
    await page.locator('body').click({ position: { x: 900, y: 600 } })
    await page.keyboard.press('/')
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
    say('OP.41 fokus po „/”', focused)
    await page.keyboard.type('orlen')
    await page.waitForTimeout(500)
    say('OP.41 po „orlen” sumy', (await sums(page)).split('\n')[0])
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('OP.41 po Esc: szukaj / okno', { szukaj: await page.getByTestId('operations-search').inputValue(), aktywny: await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName), okien: app.windows().length, sumy: (await sums(page)).split('\n')[0] })
    // Click a row, then arrows (the search cleared first: two rows only).
    await page.getByTestId('operations-search').fill('')
    await page.waitForTimeout(400)
    await page.getByTestId('operation-row').nth(2).click()
    await page.waitForTimeout(300)
    const name = () => page.getByTestId('operation-counterparty').inputValue().catch(() => '(brak edytora)')
    const before = await name()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    const down = await name()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    const down2 = await name()
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(300)
    const up = await name()
    say('OP.41 strzałki po kliknięciu wiersza', { przed: before, dół: down, dół2: down2, góra: up, aktywny: await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName) })
    // Many arrows: does the list scroll?
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    const sel = await page.locator('[data-testid="operation-row"][aria-selected="true"], [data-testid="operation-row"].bg-raised, [data-testid="operation-row"][data-selected="1"]').count()
    say('OP.41 po 30× ↓', { edytor: await name(), zaznaczonych: sel, scrollTop: await page.getByTestId('operations-list').evaluate((e) => (e as HTMLElement).scrollTop) })
    await snap(page, 'OP.41-strzalki')
    // Tab to the category and change it with the keyboard.
    await page.getByTestId('operation-amount').focus()
    const order: string[] = []
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      order.push((await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? `${document.activeElement?.tagName}:${(document.activeElement as HTMLElement)?.innerText?.slice(0, 20)}`)) ?? '')
    }
    say('OP.41 kolejność Tab od kwoty', order)
    await page.keyboard.press('Control+n')
    await page.waitForTimeout(400)
    say('OP.41 Ctrl+N', { tytuł: await text(page, '[data-testid="operation-editor-title"]').catch(() => ''), fokus: await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('ME.2 licznik, skrót, odświeżanie', async () => {
  const r = await run('me-licznik')
  const { page, app, errors } = r
  try {
    const menuCount = async () => (await page.locator('nav').innerText()).split('\n').slice(-12).join(' ')
    await page.waitForTimeout(4000)
    say('ME.2 menu na starcie', await menuCount())
    await goInbox(page)
    say('ME.2 nagłówek', await text(page, '[data-testid="inbox-count"]').catch(() => '(brak inbox-count)'))
    say('ME.2 linie', await page.getByTestId('inbox-item').count())
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    say('ME.2 po Esc z Meldunków (wejście z Mostka)', { mostek: await page.getByTestId('page-bridge').isVisible(), meldunki: await page.getByTestId('page-inbox').isVisible().catch(() => false) })
    // From Ustawienia.
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+Shift+M')
    await page.waitForTimeout(500)
    say('ME.2 Ctrl+Shift+M z Ustawień', await page.getByTestId('page-inbox').isVisible().catch(() => false))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    say('ME.2 Esc → Ustawienia?', await page.locator('[data-testid^="settings-tab-"]').first().isVisible().catch(() => false))
    // Decide one: „to w porządku” on the unknown signal.
    await goInbox(page)
    await page.getByTestId('inbox-anomaly-ok').first().click()
    await page.waitForTimeout(1200)
    say('ME.2 po „to w porządku”', { nagłówek: await text(page, '[data-testid="inbox-count"]').catch(() => ''), linie: await page.getByTestId('inbox-item').count(), menu: await menuCount(), toast: await page.getByRole('status').allInnerTexts() })
    await snap(page, 'ME.2-po-decyzji')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.3 potwierdzenie – etykieta zakresu i dół listy miesiąca', async () => {
  const r = await run('op-okres-2')
  const { page, app, errors } = r
  try {
    await goOps(page)
    for (let i = 0; i < 11; i++) await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(600)
    for (const m of ['grudzień', 'styczeń', 'luty']) {
      const list = page.getByTestId('operations-list')
      await list.evaluate((e) => { (e as HTMLElement).scrollTop = 1e6; (e.querySelector('[style*="overflow"]') as HTMLElement | null)?.scrollTo?.(0, 1e6) })
      await page.mouse.move(600, 500)
      for (let k = 0; k < 15; k++) await page.mouse.wheel(0, 2000)
      await page.waitForTimeout(500)
      const all = (await rows(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
      say(`OP.3 ${m} – dół listy`, all.slice(-4))
      await snap(page, `OP.3-dol-${m}`)
      await page.getByTestId('operations-next-month').click()
      await page.waitForTimeout(500)
    }
    await page.getByTestId('operations-period-menu').click()
    await page.locator('input[type="date"]').nth(0).fill('2026-02-28')
    await page.locator('input[type="date"]').nth(1).fill('2026-03-01')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    say('OP.3 zakres 28.02–01.03', { etykieta: await text(page, '[data-testid="operations-period"]'), wiersze: (await rows(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')) })
    await snap(page, 'OP.3-etykieta-zakresu')
    say('errors', errors)
  } finally {
    await app.close()
  }
})
