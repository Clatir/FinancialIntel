/** OP.20, OP.22, OP.24, OP.25, OP.26, OP.34, OP.36 (+ OP.16 dopowiedzenie) – edytor na kopii „rok”. */
import { test, type Page } from '@playwright/test'
import { reading } from './lab'
import { ANNA, balanceOf, bridgeNumbers, editorText, goOps, openOp, ops, rows, run, say, snap, step, sums, text, toasts, typeIn, WALLET } from './op-pomoc'

const guardText = async (page: Page) => (await page.getByTestId('operation-guard').innerText().catch(() => '(brak okna)')).replace(/\n+/g, ' | ')
const rowOf = (page: Page, name: string | RegExp) => page.getByTestId('operation-row').filter({ hasText: name })
const rowText = async (page: Page, name: string | RegExp) => (await rowOf(page, name).allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))

async function newExpense(page: Page, amount: string, name: string, account = 'Portfel XTB', category = 'Jedzenie · zakupy spożywcze') {
  await page.getByTestId('operation-new').click()
  await page.waitForTimeout(300)
  await typeIn(page, 'operation-amount', amount, 'Tab')
  await page.getByTestId('operation-account').selectOption({ label: account })
  await page.getByTestId('operation-counterparty').fill(name)
  await page.getByTestId('operation-counterparty').press('Enter')
  if (category) await page.getByTestId('operation-category').selectOption({ label: category })
  await page.waitForTimeout(500)
}

test('OP.20 okres potwierdzony saldem', async () => {
  const r = await run('op-potwierdzony')
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    const bal0 = await balanceOf(page, 'mBank')
    await openOp(page, 'zabka z1234', /26\.10/)
    const badge = page.getByTestId('operation-confirmed')
    say('OP.20 znaczek', { tekst: await badge.innerText().catch(() => '(brak)'), dymek: await badge.getAttribute('title').catch(() => null) })
    // Category only: no question.
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · kawa i przekąski' })
    await page.waitForTimeout(500)
    say('OP.20 zmiana kategorii – okno?', await guardText(page))
    const amount = page.getByTestId('operation-amount')
    await amount.click()
    await amount.fill('16,88')
    await amount.press('Tab')
    await page.waitForTimeout(500)
    say('OP.20 kwota 26,88 → 16,88', await guardText(page))
    await snap(page, 'OP.20-kwota')
    await page.getByTestId('operation-guard-cancel').click()
    await page.waitForTimeout(300)
    say('OP.20 po Anuluj', { pole: await amount.inputValue(), plik: (await ops(dataDir)).find((t) => t.date === '2026-10-26' && t.counterparty === 'ZABKA Z1234')?.amount })
    await step('data po potwierdzeniu', async () => {
      const d = page.getByTestId('operation-date')
      await d.click()
      await d.fill('27.10.2026')
      await d.press('Tab')
      await page.waitForTimeout(500)
      say('OP.20 data 26.10 → 27.10', await guardText(page))
      await page.getByTestId('operation-guard-cancel').click()
    })
    await step('konto Portfel XTB', async () => {
      await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' })
      await page.waitForTimeout(500)
      say('OP.20 konto mBank → Portfel XTB', await guardText(page))
      await page.getByTestId('operation-guard-cancel').click()
      await page.waitForTimeout(300)
      say('OP.20 konto po Anuluj', await page.getByTestId('operation-account').inputValue())
    })
    // A hand-typed one after the confirmation moved into it.
    await step('Bar pod Lipą 28.10 → 20.10', async () => {
      await openOp(page, 'bar pod lipą', /28\.10/)
      say('OP.20 Bar pod Lipą – znaczek przed', await page.getByTestId('operation-confirmed').isVisible().catch(() => false))
      const d = page.getByTestId('operation-date')
      await d.click()
      await d.fill('20.10.2026')
      await d.press('Tab')
      await page.waitForTimeout(500)
      say('OP.20 Bar pod Lipą 28.10 → 20.10', await guardText(page))
      await snap(page, 'OP.20-data-wstecz')
      await page.getByTestId('operation-guard-confirm').click()
      await page.waitForTimeout(600)
      say('OP.20 po „Zmień mimo to”', { plik: (await ops(dataDir)).filter((t) => t.counterparty === 'Bar pod Lipą' && t.amount === -3180).map((t) => t.date), saldo: await balanceOf(page, 'mBank'), saldoPrzed: bal0 })
    })
    // A new one dated before the confirmation.
    await step('nowa z datą wsteczną', async () => {
      await page.getByTestId('operation-new').click()
      await typeIn(page, 'operation-amount', '15', 'Tab')
      await page.getByTestId('operation-account').selectOption({ label: 'mBank' })
      const d = page.getByTestId('operation-date')
      await d.click()
      await d.fill('20.10.2026')
      await d.press('Tab')
      await page.waitForTimeout(500)
      say('OP.20 nowa z datą 20.10 (pierwsze wpisanie)', await guardText(page))
      await page.getByTestId('operation-counterparty').fill('Nowa wsteczna')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(500)
      await typeIn(page, 'operation-amount', '25', 'Tab')
      await page.waitForTimeout(500)
      say('OP.20 ta sama – druga zmiana kwoty', await guardText(page))
      await page.getByTestId('operation-guard-cancel').click().catch(() => undefined)
    })
    reading('op', 'OP.20', 'rok (mBank potwierdzone 26.10.2026 69 796,78 zł)', { saldo_mbank_przed: bal0 })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.22 podział paragonu', async () => {
  const r = await run('op-paragon')
  const { page, app, dataDir, errors } = r
  try {
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(1000)
    const plan0 = (await text(page, 'main').catch(() => '')).split('\n').filter((l, i, a) => /Jedzenie|Dom$/.test(a[i - 2] ?? '') || /zł z /.test(l)).slice(0, 14)
    await goOps(page)
    await newExpense(page, '100', 'Paragon test', 'Portfel XTB', 'Jedzenie')
    await page.getByTestId('operation-financer').selectOption(`pay:${ANNA}`)
    await page.waitForTimeout(400)
    say('OP.22 przed podziałem – wiersz', await rowText(page, 'Paragon test'))
    await page.getByTestId('operation-split').click()
    await page.waitForTimeout(500)
    const lines = async () =>
      page.getByTestId('split-line').evaluateAll((els) =>
        els.map((e) => {
          const sel = Array.from(e.querySelectorAll('select')).map((s) => (s as HTMLSelectElement).selectedOptions[0]?.textContent ?? '')
          const amt = (e.querySelector('[data-testid="split-amount"]') as HTMLInputElement | null)?.value
          return `${amt} | ${sel.join(' | ')}`
        })
      )
    const file = async () => (await ops(dataDir)).find((t) => t.counterparty === 'Paragon test')
    say('OP.22 części po „Podziel paragon”', { części: await lines(), plik: JSON.stringify((await file())?.splits), wiersz: await rowText(page, 'Paragon test'), operacja: [(await file())?.refundable, (await file())?.memberId] })
    const amt = page.getByTestId('split-amount')
    await typeIn(page, amt.nth(0), '60', 'Tab')
    await typeIn(page, amt.nth(1), '30', 'Tab')
    await page.waitForTimeout(400)
    say('OP.22 60 + 30', { reszta: await page.getByTestId('split-rest').innerText().catch(() => '(brak)'), edytor: (await editorText(page)).split('\n').filter((l) => /nierozdziel|przekracza|sumują|ostatniej/.test(l)) })
    await snap(page, 'OP.22-reszta')
    await page.getByTestId('split-rest-last').click().catch(() => undefined)
    await page.waitForTimeout(400)
    say('OP.22 po „do ostatniej części”', { części: await lines(), edytor: (await editorText(page)).split('\n').filter((l) => /nierozdziel|przekracza|sumują/.test(l)) })
    await typeIn(page, amt.nth(0), '70', 'Tab')
    await typeIn(page, amt.nth(1), '40', 'Tab')
    await page.waitForTimeout(400)
    say('OP.22 70 + 40', { nadmiar: await page.getByTestId('split-over').innerText().catch(() => '(brak)') })
    await snap(page, 'OP.22-nadmiar')
    await page.getByTestId('split-over').getByRole('button').click().catch(async () => page.getByRole('button', { name: /odejmij/ }).click())
    await page.waitForTimeout(400)
    say('OP.22 po „odejmij od ostatniej części”', { części: await lines(), plik: JSON.stringify((await file())?.splits?.map((s: any) => s.amount)), edytor: (await editorText(page)).split('\n').filter((l) => /nierozdziel|przekracza|sumują/.test(l)) })
    await page.getByTestId('split-add').click()
    await page.waitForTimeout(300)
    say('OP.22 + część', await lines())
    await page.getByTestId('split-line').last().getByTitle('Usuń część').click()
    await page.waitForTimeout(300)
    say('OP.22 usunięta część', { części: await lines(), wiersz: await rowText(page, 'Paragon test'), plik: JSON.stringify((await file())?.splits) })
    // A rest left as „bez kategorii”: 60 + 30 again, rest left.
    await typeIn(page, amt.nth(0), '60', 'Tab')
    await typeIn(page, amt.nth(1), '30', 'Tab')
    await page.waitForTimeout(600)
    say('OP.22 reszta zostawiona – wiersz i znaczki', { wiersz: await rowText(page, 'Paragon test'), plik: JSON.stringify((await file())?.splits?.map((s: any) => [s.amount, s.categoryId, s.refundable, s.memberId])) })
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(1000)
    const plan1 = (await text(page, 'main').catch(() => '')).split('\n').filter((l, i, a) => /Jedzenie|Dom$/.test(a[i - 2] ?? '') || /zł z /.test(l)).slice(0, 14)
    say('OP.22 plan przed / po', { przed: plan0, po: plan1 })
    reading('op', 'OP.22', 'rok + paragon 100 zł Portfel XTB 03.11 (60 Anna, 30 bez kat., 10 reszta)', { plan_przed: plan0.join(' | '), plan_po: plan1.join(' | ') })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.24 domownik i stan oddania', async () => {
  const r = await run('op-domownik')
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    for (const name of ['DOUGLAS', 'EVENTIM', 'SKLEP PAPIERNICZY', 'BOOKING.COM', 'MEDIA EXPERT']) {
      await page.getByTestId('operations-search').fill(name.toLowerCase())
      await page.waitForTimeout(400)
      say(`OP.24 wiersz ${name}`, await rowText(page, name))
    }
    await page.getByTestId('operations-search').fill('lidl')
    await page.waitForTimeout(400)
    say('OP.24 wiersze LIDL (paragony z Anną)', (await rows(page).allInnerTexts()).slice(0, 6).map((t) => t.replace(/\s+/g, ' ')))
    // August: EVENTIM financed by Marek.
    await page.getByTestId('operations-search').fill('')
    await page.getByTestId('operations-period-menu').click()
    await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
    for (let i = 0; i < 3; i++) await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(500)
    const k0 = (await sums(page)).split('\n').slice(0, 4)
    await rowOf(page, 'EVENTIM').first().click()
    await page.waitForTimeout(400)
    say('OP.24 „Finansuje” – lista', await page.getByTestId('operation-financer').evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => `${o.selected ? '[x] ' : ''}${o.textContent}`)))
    say('OP.24 edytor EVENTIM', (await editorText(page)).split('\n').filter((l) => /oddan|Finansuje|Marek|domownik|Wspólnie/i.test(l)))
    await page.getByTestId('operation-financer').selectOption(`gift:01KAZ200000000000000000003`)
    await page.waitForTimeout(600)
    const k1 = (await sums(page)).split('\n').slice(0, 4)
    say('OP.24 → prezent od Marka', { wiersz: await rowText(page, 'EVENTIM'), sumy: k1 })
    await page.getByTestId('operation-share-start').click()
    await page.waitForTimeout(600)
    say('OP.24 → Wspólnie', { wiersz: await rowText(page, 'EVENTIM'), edytor: (await editorText(page)).split('\n').filter((l) => /Wspólnie|równo|procent|kwot|ja|Marek|Anna/i.test(l)).slice(0, 16), sumy: (await sums(page)).split('\n').slice(0, 4) })
    await snap(page, 'OP.24-wspolnie')
    await page.getByTestId('operation-financer').selectOption('').catch(() => undefined)
    say('OP.24 Koszty przed / prezent', { przed: k0, prezent: k1 })
    reading('op', 'OP.24', 'rok, sierpień 2026 (EVENTIM 360 zł Marek → prezent → wspólnie)', { sumy_przed: k0.join(' | '), sumy_prezent: k1.join(' | ') })
    void dataDir
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.25 plan czy impuls', async () => {
  const r = await run('op-impuls')
  const { page, app, errors } = r
  try {
    await goOps(page)
    for (const a of ['199,99', '200,00', '200,01']) await newExpense(page, a, `Impuls ${a}`)
    await page.waitForTimeout(500)
    for (const a of ['199,99', '200,00', '200,01']) {
      const row = rowOf(page, `Impuls ${a}`)
      say(`OP.25 wiersz ${a}`, { wiersz: await rowText(page, `Impuls ${a}`), dymki: await row.locator('[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title'))) })
    }
    await rowOf(page, 'Impuls 200,00').click()
    await page.waitForTimeout(300)
    say('OP.25 edytor 200,00', (await editorText(page)).split('\n').filter((l) => /plan|impuls/i.test(l)))
    await page.locator('[role="radiogroup"][aria-label="Plan czy impuls"] [role="radio"]', { hasText: 'impuls' }).click()
    await page.waitForTimeout(400)
    say('OP.25 → impuls', { wiersz: await rowText(page, 'Impuls 200,00'), klasy: await rowOf(page, 'Impuls 200,00').locator('span').evaluateAll((els) => els.filter((e) => /impuls/i.test((e as HTMLElement).innerText)).map((e) => e.className)) })
    await snap(page, 'OP.25-impuls')
    await page.getByRole('button', { name: 'wyczyść' }).click()
    await page.waitForTimeout(400)
    say('OP.25 → wyczyść', await rowText(page, 'Impuls 200,00'))
    await page.locator('[role="radiogroup"][aria-label="Plan czy impuls"] [role="radio"]', { hasText: 'plan' }).click()
    await page.waitForTimeout(400)
    say('OP.25 → plan', await rowText(page, 'Impuls 200,00'))
    // A household member's purchase over the threshold.
    await newExpense(page, '250', 'Impuls domownika')
    await page.getByTestId('operation-financer').selectOption(`pay:${ANNA}`)
    await page.waitForTimeout(500)
    say('OP.25 zakup domownika 250 zł', { wiersz: await rowText(page, 'Impuls domownika'), edytor: (await editorText(page)).split('\n').filter((l) => /plan|impuls/i.test(l)) })
    // The marks filter.
    await page.getByTestId('operations-marks').click()
    say('OP.25 Oznaczenia – menu', await text(page, '[data-testid="operations-marks-menu"]'))
    await page.keyboard.press('Escape')
    // Threshold 0.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-layers').click()
    const th = page.getByLabel('Próg dziennika')
    say('OP.25 próg w Ustawieniach', await th.inputValue())
    await th.click()
    await th.fill('0')
    await th.press('Tab')
    await page.waitForTimeout(600)
    await goOps(page)
    for (const a of ['200,00', '200,01']) say(`OP.25 próg 0 – wiersz ${a}`, await rowText(page, `Impuls ${a}`))
    await newExpense(page, '500', 'Impuls po progu 0')
    say('OP.25 próg 0 – nowy 500 zł', { wiersz: await rowText(page, 'Impuls po progu 0'), edytor: (await editorText(page)).split('\n').filter((l) => /plan|impuls/i.test(l)) })
    await snap(page, 'OP.25-prog-0')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.26 cisza nocna', async () => {
  const r = await run('op-noc')
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    const setTime = async (v: string) => {
      const f = page.getByTestId('operation-time')
      await f.click()
      await f.fill(v)
      await f.press('Tab')
      await page.waitForTimeout(400)
    }
    const state = async () => ({
      noc: await page.getByTestId('operation-night').isVisible().catch(() => false),
      notka: await page.getByTestId('operation-night-confirm').innerText().catch(() => ''),
      status: await page.getByTestId('operation-night-status').innerText().catch(() => '')
    })
    await newExpense(page, '50', 'Noc test')
    for (const t of ['22:59', '23:00', '04:59', '05:00']) {
      await setTime(t)
      say(`OP.26 ${t}`, await state())
    }
    await setTime('23:00')
    await snap(page, 'OP.26-2300-bez-wpisu')
    await page.getByTestId('operation-night-clear').click()
    await page.waitForTimeout(400)
    say('OP.26 po „usuń godzinę”', { pole: await page.getByTestId('operation-time').inputValue(), plik: (await ops(dataDir)).find((t) => t.counterparty === 'Noc test')?.time, ...(await state()) })
    await setTime('04:59')
    await page.getByTestId('operation-log').fill('nie mogłem zasnąć')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(500)
    say('OP.26 04:59 z wpisem', await state())
    await snap(page, 'OP.26-0459-wpis')
    await page.getByTestId('operation-night-justify').click()
    await page.waitForTimeout(400)
    say('OP.26 po „uzasadniony”', await state())
    // A household member's purchase at night.
    await newExpense(page, '60', 'Noc domownik')
    await setTime('23:30')
    await page.getByTestId('operation-financer').selectOption(`pay:${ANNA}`)
    await page.waitForTimeout(500)
    say('OP.26 zakup domownika 23:30 bez wpisu', { ...(await state()), edytor: (await editorText(page)).split('\n').filter((l) => /noc|cisz|narusz/i.test(l)) })
    // A new one typed with a quiet hour from the start.
    await page.getByTestId('operation-new').click()
    await page.waitForTimeout(300)
    await setTime('23:15')
    await typeIn(page, 'operation-amount', '12', 'Tab')
    await page.waitForTimeout(400)
    say('OP.26 nowa z godziną 23:15', await state())
    await page.keyboard.press('Control+8')
    await page.waitForTimeout(1000)
    say('OP.26 Dowództwo – noc / naruszenia', (await text(page, 'main').catch(() => '')).split('\n').filter((l) => /noc|narusz|cisz/i.test(l)).slice(0, 10))
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.34 przelew jedną operacją', async () => {
  const r = await run('op-przelew')
  const { page, app, dataDir, errors } = r
  try {
    const br0 = await bridgeNumbers(page)
    await goOps(page)
    const b0 = { mbank: await balanceOf(page, 'mBank'), wallet: await balanceOf(page, 'Portfel XTB') }
    await page.getByTestId('operation-new').click()
    await page.locator('[role="radiogroup"][aria-label="Rodzaj operacji"] [role="radio"]', { hasText: 'Przelew własny' }).click()
    await typeIn(page, 'operation-amount', '500', 'Tab')
    await page.getByTestId('operation-account').selectOption({ label: 'mBank' })
    await page.getByTestId('operation-counter-account').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operation-counterparty').fill('Przelew test')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.waitForTimeout(700)
    const b1 = { mbank: await balanceOf(page, 'mBank'), wallet: await balanceOf(page, 'Portfel XTB') }
    say('OP.34 notka', await page.getByTestId('operation-transfer-both').innerText().catch(() => '(brak)'))
    say('OP.34 plik', (await ops(dataDir)).filter((t) => t.counterparty === 'Przelew test').map((t) => ({ kind: t.kind, amount: t.amount, acc: t.accountId, to: t.counterAccountId, both: t.bothSides })))
    await snap(page, 'OP.34-przelew')
    const br1 = await bridgeNumbers(page)
    await goOps(page)
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.34 lista Portfela XTB', await rowText(page, 'Przelew test'))
    await rowOf(page, 'Przelew test').click()
    await typeIn(page, 'operation-amount', '600', 'Tab')
    await page.waitForTimeout(600)
    const b2 = { mbank: await balanceOf(page, 'mBank'), wallet: await balanceOf(page, 'Portfel XTB') }
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await page.waitForTimeout(600)
    const b3 = { mbank: await balanceOf(page, 'mBank'), wallet: await balanceOf(page, 'Portfel XTB'), plik: (await ops(dataDir)).filter((t) => t.counterparty === 'Przelew test').length, toast: await toasts(page) }
    await page.getByRole('status').filter({ hasText: 'Usunięto' }).getByRole('button', { name: 'Cofnij' }).click()
    await page.waitForTimeout(800)
    const b4 = { mbank: await balanceOf(page, 'mBank'), wallet: await balanceOf(page, 'Portfel XTB'), plik: (await ops(dataDir)).filter((t) => t.counterparty === 'Przelew test').map((t) => [t.amount, t.bothSides]) }
    say('OP.34 salda', { przed: b0, po500: b1, po600: b2, poUsunięciu: b3, poCofnij: b4 })
    say('OP.34 Mostek przed / po', { przed: br0, po: br1 })
    reading('op', 'OP.34', 'rok + przelew mBank → Portfel XTB 03.11', { przed: JSON.stringify(b0), po_500: JSON.stringify(b1), po_600: JSON.stringify(b2), mostek_przed: br0, mostek_po: br1 })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.36 zwrot w drodze – oczekiwanie', async () => {
  const r = await run('op-zwrot-w-drodze')
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await newExpense(page, '249', 'Sklep Zwrotny', 'Portfel XTB', 'Prezenty i inne · inne')
    const d = page.getByTestId('operation-date')
    await d.click()
    await d.fill('29.10.2026')
    await d.press('Tab')
    await page.waitForTimeout(400)
    await page.getByTestId('operations-prev-month').click().catch(() => undefined)
    await page.waitForTimeout(400)
    const btn = page.getByTestId('operation-await')
    say('OP.36 przycisk', { tekst: await btn.innerText().catch(() => '(brak)'), dymek: await btn.getAttribute('title').catch(() => null) })
    await btn.click()
    await page.waitForTimeout(500)
    const box = async () => ({
      kwota: await page.getByTestId('operation-await-amount').inputValue().catch(() => ''),
      termin: await page.getByTestId('operation-await-until').inputValue().catch(() => ''),
      stan: await page.getByTestId('operation-await-state').innerText().catch(() => ''),
      wiersz: await rowText(page, 'Sklep Zwrotny'),
      plik: JSON.stringify((await ops(dataDir)).find((t) => t.counterparty === 'Sklep Zwrotny')?.awaitReturn)
    })
    say('OP.36 po kliknięciu', await box())
    await snap(page, 'OP.36-czekam')
    await typeIn(page, 'operation-await-amount', '100', 'Tab')
    await page.waitForTimeout(400)
    say('OP.36 kwota 100', await box())
    await page.getByTestId('operation-await-close').click()
    await page.waitForTimeout(500)
    say('OP.36 zamknij', { ...(await box()), toast: await toasts(page) })
    await page.getByRole('status').filter({ hasText: /Zwrot zamknięty/ }).getByRole('button', { name: 'Cofnij' }).click().catch(() => undefined)
    await page.waitForTimeout(500)
    say('OP.36 po Cofnij', await box())
    await page.getByTestId('operation-await-off').click()
    await page.waitForTimeout(500)
    say('OP.36 nie czekam', await box())
    // Filter „czeka na zwrot”.
    await page.getByTestId('operations-marks').click()
    say('OP.36 menu oznaczeń', await text(page, '[data-testid="operations-marks-menu"]'))
    await page.keyboard.press('Escape')
    // 0 zł.
    await newExpense(page, '0', 'Zero zł', 'Portfel XTB', 'Prezenty i inne · inne')
    say('OP.36 0 zł', { przycisk: await page.getByTestId('operation-await').evaluate((b) => `${(b as HTMLButtonElement).disabled ? 'nieaktywny' : 'aktywny'} · ${b.getAttribute('title')} · ${(b as HTMLElement).innerText}`).catch(() => '(brak przycisku)'), plik: (await ops(dataDir)).filter((t) => t.counterparty === 'Zero zł').map((t) => t.amount) })
    // An expense awaiting a return changed to income.
    await newExpense(page, '80', 'Zwrot na wpływ', 'Portfel XTB', 'Prezenty i inne · inne')
    await page.getByTestId('operation-await').click()
    await page.waitForTimeout(300)
    await page.locator('[role="radiogroup"][aria-label="Rodzaj operacji"] [role="radio"]', { hasText: 'Wpływ' }).click()
    await page.waitForTimeout(600)
    say('OP.36 wydatek z oczekiwaniem → Wpływ', { plik: JSON.stringify((await ops(dataDir)).find((t) => t.counterparty === 'Zwrot na wpływ')), pudełko: await page.getByTestId('operation-await-box').isVisible().catch(() => false), wiersz: await rowText(page, 'Zwrot na wpływ') })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.16 dopowiedzenie – notka pożyczki, koperta przy zwrocie towaru', async () => {
  const r = await run('op-rodzaj-2')
  const { page, app, errors } = r
  try {
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(1000)
    const env = async () => (await text(page, 'main').catch(() => '')).split('\n').map((l, i, a) => (/^Jedzenie$/.test(a[i - 3] ?? '') || /^Jedzenie$/.test(a[i - 2] ?? '') ? l : null)).filter(Boolean).join(' | ')
    const e0 = await env()
    await goOps(page)
    await newExpense(page, '40', 'Pożyczka test', 'Portfel XTB', '')
    await page.getByTestId('operation-kind-other').selectOption('loan')
    await page.waitForTimeout(500)
    say('OP.16 pożyczka – notka', await page.getByTestId('operation-loan-hint').innerText().catch(() => '(brak notki)'))
    await snap(page, 'OP.16-pozyczka')
    await newExpense(page, '30', 'Zwrot test 2', 'Portfel XTB', 'Jedzenie · zakupy spożywcze')
    await page.locator('[role="radiogroup"][aria-label="Kierunek"] [role="radio"]', { hasText: /zwrot/ }).click()
    await page.waitForTimeout(600)
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(1000)
    const e1 = await env()
    say('OP.16 koperta Jedzenie przed / po zwrocie 30 zł', { przed: e0, po: e1 })
    reading('op', 'OP.16', 'rok + zwrot towaru 30 zł Jedzenie 03.11', { koperta_jedzenie_przed: e0, koperta_jedzenie_po: e1 })
    say('errors', errors)
  } finally {
    await app.close()
  }
})
