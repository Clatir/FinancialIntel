// W3 (AU-11, weryfikacja sceptyczna): odtworzenie OP.25, OP.26, OP.40, OP.8, OP.33 na świeżych kopiach „rok”.
// Narzędzie obserwacji – werdykty w docs/audyt/raport/WERYFIKACJA-3.md.
import { test, type Page } from '@playwright/test'
import { reading, shot } from './lab'
import { addRecords, ANNA, cat, editorText, goInbox, goOps, ops, opt, periodAll, rows, run, say, search, sums, text, toasts, typeIn, WALLET } from './op-pomoc'

const rowOf = (page: Page, name: string | RegExp) => page.getByTestId('operation-row').filter({ hasText: name })
const rowText = async (page: Page, name: string | RegExp) => (await rowOf(page, name).allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
const count = async (page: Page) => (await sums(page)).split('\n')[0]!

async function today(page: Page): Promise<string> {
  await page.keyboard.press('Control+8')
  await page.getByTestId('page-command').waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1200)
  const t = page.getByTestId('command-today')
  return (await t.count()) ? (await t.first().innerText()).replace(/\s*\n\s*/g, ' | ') : '(brak command-today)'
}

async function newExpense(page: Page, amount: string, name: string) {
  await page.getByTestId('operation-new').click()
  await page.waitForTimeout(300)
  await typeIn(page, 'operation-amount', amount, 'Tab')
  await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' })
  await page.getByTestId('operation-counterparty').fill(name)
  await page.getByTestId('operation-counterparty').press('Enter')
  await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
  await page.waitForTimeout(500)
}

const nightState = async (page: Page) => ({
  noc: await page.getByTestId('operation-night').isVisible().catch(() => false),
  notka: await opt(page.getByTestId('operation-night-confirm')),
  status: await opt(page.getByTestId('operation-night-status'))
})

test('W3 OP.25 / OP.26 – zakup domownika: pytanie „plan czy impuls”, cisza nocna i skutek w grze', async () => {
  const r = await run('w3-op-domownik', (d) =>
    addRecords(d, 'transactions', [
      // Dziś (03.11) w ciszy nocnej 23:00–05:00, z wpisem w dzienniku, w całości finansuje Anna.
      { date: '2026-11-03', time: '00:30', accountId: WALLET, kind: 'expense', counterparty: 'Noc dla Anny W3', amount: -6000, categoryId: cat('0101'), refundable: true, memberId: ANNA, logNote: 'kupione dla Anny' },
      // Dziś 14:00, 250 zł (od progu 200 zł), oznaczony „impuls”, w całości finansuje Anna.
      { date: '2026-11-03', time: '14:00', accountId: WALLET, kind: 'expense', counterparty: 'Impuls dla Anny W3', amount: -25000, categoryId: cat('0101'), refundable: true, memberId: ANNA, impulse: 'impulse' }
    ])
  )
  const { page, app, errors } = r
  try {
    say('A. Dowództwo – dziś (dwa zakupy Anny: nocny z wpisem, impuls 250 zł)', await today(page))
    await shot(page, 'W3.OP26-dzis-domownik')
    await goOps(page)
    say('A. wiersze', { noc: await rowText(page, 'Noc dla Anny W3'), impuls: await rowText(page, 'Impuls dla Anny W3') })
    await rowOf(page, 'Noc dla Anny W3').first().click()
    await page.waitForTimeout(500)
    say('A. edytor – nocny zakup Anny z wpisem', { ...(await nightState(page)), finansuje: await page.getByTestId('operation-financer').evaluate((s: HTMLSelectElement) => s.options[s.selectedIndex]?.text) })
    await shot(page, 'W3.OP26-edytor-domownik')
    await page.keyboard.press('Escape')

    // OP.25 przez interfejs: nowy wydatek 250 zł, „Finansuje: Anna”.
    await newExpense(page, '250', 'W3 dla Anny 250')
    await page.getByTestId('operation-financer').selectOption(`pay:${ANNA}`)
    await page.waitForTimeout(600)
    say('B. OP.25 nowy 250 zł – finansuje Anna', {
      wiersz: await rowText(page, 'W3 dla Anny 250'),
      dymki: await rowOf(page, 'W3 dla Anny 250').locator('[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title'))),
      edytor: (await editorText(page)).split('\n').filter((l) => /plan|impuls/i.test(l))
    })
    await shot(page, 'W3.OP25-domownik-250')
    // OP.26 przez interfejs: ten sam zakup Anny o 23:30, potem z wpisem.
    const tf = page.getByTestId('operation-time')
    await tf.click()
    await tf.fill('01:30')
    await tf.press('Tab')
    await page.waitForTimeout(500)
    say('B. OP.26 zakup Anny 01:30 bez wpisu', await nightState(page))
    await page.getByTestId('operation-log').fill('kupione dla Anny')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(600)
    say('B. OP.26 zakup Anny 01:30 z wpisem', await nightState(page))
    await shot(page, 'W3.OP26-domownik-wpis')
    await page.keyboard.press('Escape')
    say('B. Dowództwo – dziś po dopisaniu zakupu Anny 250 zł o 01:30 z wpisem', await today(page))

    // Kontrola: ten sam nocny zakup jako mój (finansuje: ja) – gra powinna go liczyć.
    await goOps(page)
    await rowOf(page, 'Noc dla Anny W3').first().click()
    await page.waitForTimeout(400)
    await page.getByTestId('operation-financer').selectOption({ index: 0 })
    await page.waitForTimeout(600)
    say('C. edytor – ten sam nocny zakup jako mój', { ...(await nightState(page)), finansuje: await page.getByTestId('operation-financer').evaluate((s: HTMLSelectElement) => s.options[s.selectedIndex]?.text) })
    await page.keyboard.press('Escape')
    say('C. Dowództwo – dziś po zmianie nocnego zakupu na mój', await today(page))
    await shot(page, 'W3.OP26-dzis-moj')
    await goOps(page)
    await rowOf(page, 'Impuls dla Anny W3').first().click()
    await page.waitForTimeout(400)
    await page.getByTestId('operation-financer').selectOption({ index: 0 })
    await page.waitForTimeout(600)
    await page.keyboard.press('Escape')
    say('D. Dowództwo – dziś po zmianie impulsu 250 zł na mój', await today(page))
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('W3 OP.40 – wydatek 0,00 zł bez kategorii dopisany w interfejsie a meldunek „bez kategorii”', async () => {
  const r = await run('w3-op-zero')
  const { page, app, dataDir, errors } = r
  try {
    await goInbox(page)
    const before = (await page.getByTestId('inbox-item').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).filter((t) => /bez kategorii/.test(t))
    say('Meldunki przed – „bez kategorii”', before.length ? before : '(brak meldunku)')
    await goOps(page)
    await page.getByTestId('operation-new').click()
    await page.waitForTimeout(300)
    await typeIn(page, 'operation-amount', '0', 'Tab')
    await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operation-counterparty').fill('W3 zero złotych')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.waitForTimeout(800)
    say('wiersz i edytor', { wiersz: await rowText(page, 'W3 zero złotych'), toasty: await toasts(page) })
    const saved = (await ops(dataDir)).filter((t) => t.counterparty === 'W3 zero złotych').map((t) => ({ kind: t.kind, amount: t.amount, categoryId: t.categoryId, date: t.date }))
    say('plik', saved)
    await page.keyboard.press('Escape')
    await goInbox(page)
    const item = page.getByTestId('inbox-item').filter({ hasText: /bez kategorii/ })
    say('Meldunki po – „bez kategorii”', await opt(item))
    await shot(page, 'W3.OP40-meldunek')
    await item.getByTestId('inbox-open').click().catch(() => undefined)
    await page.waitForTimeout(800)
    say('lista z „Pokaż w Operacjach”', (await rows(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')))
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('W3 OP.8 – kwota od 100 do 20 zł', async () => {
  const r = await run('w3-op-kwota')
  const { page, app, errors } = r
  const read = async (label: string) => {
    const fields = { od: await page.getByTestId('operations-amount-min').inputValue().catch(() => '?'), do: await page.getByTestId('operations-amount-max').inputValue().catch(() => '?') }
    const more = await page.getByTestId('operations-more').innerText().catch(() => '?')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const cells = await page.getByTestId('operation-amount-cell').allInnerTexts()
    const vals = cells.map((c) => Math.abs(Number(c.replace(/[^\d,]/g, '').replace(',', '.'))))
    say(label, { pola: fields, przycisk: more.replace(/\s+/g, ' '), licznik: await count(page), min: vals.length ? Math.min(...vals) : null, max: vals.length ? Math.max(...vals) : null, toasty: await toasts(page) })
  }
  const setField = async (id: string, v: string, key: 'Tab' | 'Enter') => {
    const f = page.getByTestId(id)
    await f.click()
    await f.fill(v)
    await f.press(key)
    await page.waitForTimeout(400)
  }
  try {
    await goOps(page)
    await periodAll(page)
    say('cała historia – licznik', await count(page))
    // 1. od 100 (Tab), do 20 (Tab) – jak w raporcie OP.
    await page.getByTestId('operations-more').click()
    await setField('operations-amount-min', '100', 'Tab')
    say('1. po wpisaniu od 100', { od: await page.getByTestId('operations-amount-min').inputValue(), do: await page.getByTestId('operations-amount-max').inputValue() })
    await setField('operations-amount-max', '20', 'Tab')
    await shot(page, 'W3.OP8-menu')
    await read('1. od 100 → do 20 (Tab)')
    await page.getByTestId('operations-more').click()
    await page.getByTestId('operations-more-clear').click().catch(async () => page.getByRole('button', { name: 'wyczyść te filtry' }).click())
    await page.waitForTimeout(400)
    // 2. do 20 najpierw, potem od 100.
    await setField('operations-amount-max', '20', 'Tab')
    await setField('operations-amount-min', '100', 'Tab')
    await read('2. do 20 → od 100 (Tab)')
    await page.getByTestId('operations-more').click()
    await page.getByTestId('operations-more-clear').click().catch(async () => page.getByRole('button', { name: 'wyczyść te filtry' }).click())
    await page.waitForTimeout(400)
    // 3. od 100, do 20 – Enter.
    await setField('operations-amount-min', '100', 'Enter')
    await page.getByTestId('operations-more').click().catch(() => undefined)
    await page.waitForTimeout(300)
    if (!(await page.getByTestId('operations-amount-max').isVisible().catch(() => false))) await page.getByTestId('operations-more').click()
    await setField('operations-amount-max', '20', 'Enter')
    await read('3. od 100 → do 20 (Enter)')
    await shot(page, 'W3.OP8-lista')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('W3 OP.33 – przesunięcie dat przez granicę miesiąca: podgląd a skutek w październiku', async () => {
  const r = await run('w3-op-data', (d) =>
    addRecords(d, 'transactions', [{ date: '2026-10-30', accountId: WALLET, kind: 'transfer', counterparty: 'Przelew do gotówki', amount: -15000, counterAccountId: '01KDEFACC00000000000000003', bothSides: true, counterDate: '2026-10-31' }])
  )
  const { page, app, dataDir, errors } = r
  const bridge = async () => {
    await page.keyboard.press('Control+1')
    await page.getByTestId('page-bridge').waitFor()
    await page.waitForTimeout(900)
    return (await text(page, '[data-testid="page-bridge"]')).split('\n').filter((l) => /ENERGIA|Łupy|Osłony|osłony|przydział/i.test(l)).slice(0, 8)
  }
  const planOct = async () => {
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(1200)
    await page.getByTestId('month-prev').click().catch(async () => page.getByRole('button', { name: /poprzedni/i }).first().click().catch(() => undefined))
    await page.waitForTimeout(1200)
    return (await text(page, 'main').catch(() => '')).split('\n').filter((l) => /październik|Jedzenie|Zdrowie|Łupy|łupy|Koszty|Wynik|na plus|na minus/i.test(l)).slice(0, 24)
  }
  try {
    const b0 = await bridge()
    const p0 = await planOct()
    say('przed – Mostek', b0)
    say('przed – Plan października', p0)
    await shot(page, 'W3.OP33-plan-paz-przed')
    await goOps(page)
    await page.getByTestId('operations-period-menu').click()
    await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(600)
    for (const has of [['Lody Grycan'], ['Apteka', 'mBank'], ['Przelew do gotówki']]) {
      let row = page.getByTestId('operation-row')
      for (const h of has) row = row.filter({ hasText: h })
      say(`zaznaczam ${has.join(' ')}`, (await row.first().innerText()).replace(/\s+/g, ' '))
      await row.first().getByTestId('operation-tick').check()
    }
    await page.getByTestId('operations-bulk-change').selectOption('shift')
    await page.getByTestId('operations-bulk-days').fill('2')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(800)
    say('podgląd +2', await opt(page.getByTestId('operations-bulk-effect')))
    await shot(page, 'W3.OP33-podglad')
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(1000)
    say('toasty', await toasts(page))
    say('daty w pliku', (await ops(dataDir)).filter((t) => ['Lody Grycan', 'Przelew do gotówki'].includes(String(t.counterparty)) || (t.counterparty === 'Apteka' && String(t.date) >= '2026-10-29')).map((t) => `${t.counterparty} ${t.date}${t.counterDate ? ` / ${t.counterDate}` : ''} ${t.amount}`))
    const b1 = await bridge()
    const p1 = await planOct()
    say('po – Mostek', b1)
    say('po – Plan października', p1)
    await shot(page, 'W3.OP33-plan-paz-po')
    say('różnice Mostka', { przed: b0.filter((x) => !b1.includes(x)), po: b1.filter((x) => !b0.includes(x)) })
    say('różnice Planu października', { przed: p0.filter((x) => !p1.includes(x)), po: p1.filter((x) => !p0.includes(x)) })
    reading('w3', 'OP.33', 'rok + przelew 30.10/31.10, przesunięcie +2', { mostek_przed: b0.join(' | '), mostek_po: b1.join(' | '), plan_paz_przed: p0.join(' | '), plan_paz_po: p1.join(' | ') })
    void search
    say('errors', errors)
  } finally {
    await app.close()
  }
})
