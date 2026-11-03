/** OP.13, OP.14, OP.15, OP.16 – nowa operacja i pola edytora na kopii „rok” (każdy punkt na świeżej kopii). */
import { test, type Page } from '@playwright/test'
import { reading } from './lab'
import { balanceOf, bridgeNumbers, editorText, goOps, openOp, ops, periodAll, rows, run, say, snap, step, sums, text, toasts, typeIn, WALLET } from './op-pomoc'

const amountVal = (page: Page) => page.getByTestId('operation-amount').inputValue()
const radios = async (page: Page, label: string) =>
  page.locator(`[role="radiogroup"][aria-label="${label}"] [role="radio"]`).evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText}${e.getAttribute('aria-checked') === 'true' ? ' [x]' : ''}`))

test('OP.13 nowa operacja – szkic i widoczność', async () => {
  const r = await run('op-nowa')
  const { page, app, dataDir, errors } = r
  try {
    const n0 = (await ops(dataDir)).length
    // From the bridge.
    await page.keyboard.press('Control+n')
    await page.waitForTimeout(800)
    say('OP.13 Ctrl+N z Mostka', {
      operacje: await page.getByTestId('page-operations').isVisible(),
      tytuł: await text(page, '[data-testid="operation-editor-title"]').catch(() => ''),
      fokus: await page.evaluate(() => document.activeElement?.getAttribute('data-testid')),
      wiersz: (await rows(page).allInnerTexts()).filter((t) => /nowa operacja/.test(t)).map((t) => t.replace(/\s+/g, ' '))
    })
    await snap(page, 'OP.13-ctrlN-z-mostka')
    await page.keyboard.press('Escape')
    // A filter and a range that hide today.
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    await page.getByTestId('operations-period-menu').click()
    await page.locator('input[type="date"]').nth(0).fill('2026-10-01')
    await page.locator('input[type="date"]').nth(1).fill('2026-10-15')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.13 filtr przed „Nowa”', { okres: await text(page, '[data-testid="operations-period"]'), sumy: (await sums(page)).split('\n')[0] })
    await page.getByTestId('operation-new').click()
    await page.waitForTimeout(500)
    say('OP.13 po „Nowa” przy filtrze', { okres: await text(page, '[data-testid="operations-period"]'), strona: (await text(page, '[data-testid="page-operations"]')).slice(0, 700), wiersze: (await rows(page).allInnerTexts()).slice(0, 5).map((t) => t.replace(/\s+/g, ' ')) })
    await typeIn(page, 'operation-amount', '23,40', 'Tab')
    await page.getByTestId('operation-counterparty').fill('Kiosk Szkic')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-account').selectOption({ label: 'mBank' })
    await page.waitForTimeout(800)
    say('OP.13 po kwocie, nazwie i zmianie konta na mBank', {
      okres: await text(page, '[data-testid="operations-period"]'),
      widocznyWiersz: (await rows(page).allInnerTexts()).filter((t) => /Kiosk Szkic|nowa operacja/.test(t)).map((t) => t.replace(/\s+/g, ' ')),
      edytor: await page.getByTestId('operation-counterparty').inputValue().catch(() => '(edytor zamknięty)'),
      strona: (await text(page, '[data-testid="page-operations"]')).slice(0, 500),
      plik: (await ops(dataDir)).filter((t) => t.counterparty === 'Kiosk Szkic').map((t) => [t.date, t.amount, t.accountId])
    })
    await snap(page, 'OP.13-nowa-przy-filtrze')
    // A second draft untouched, leave and come back.
    await page.getByTestId('operation-new').click()
    await page.waitForTimeout(400)
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(600)
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(800)
    const after2 = await ops(dataDir)
    say('OP.13 pusty szkic po wyjściu', { plików: after2.length - n0, zero: after2.filter((t) => t.amount === 0).length, wierszeNowa: (await rows(page).allInnerTexts()).filter((t) => /nowa operacja/.test(t)).length })
    // A third with an amount typed, the field not left: to the Radar and back.
    await page.getByTestId('operation-new').click()
    await page.waitForTimeout(400)
    await page.getByTestId('operation-amount').fill('7,77')
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(800)
    const after3 = await ops(dataDir)
    say('OP.13 szkic z kwotą po Radarze', { nowe: after3.filter((t) => !after2.some((x) => x.id === t.id)).map((t) => [t.date, t.amount, t.accountId, t.counterparty]), zero: after3.filter((t) => t.amount === 0).length })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.14 pola edytora – kwota, Enter, Esc, długie teksty', async () => {
  const r = await run('op-pola')
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await openOp(page, 'lody grycan', /18\.10/)
    const id = async () => (await ops(dataDir)).find((t) => t.date === '2026-10-18' && t.counterparty === 'Lody Grycan')
    say('OP.14 otwarta', { edytor: await page.getByTestId('operation-counterparty').inputValue(), kwota: await amountVal(page), plik: (await id())?.amount })
    for (const typed of ['1.200', '12,345', '1 234,56', '12,50+8,30']) {
      await step(`kwota ${typed}`, async () => {
        const f = page.getByTestId('operation-amount')
        await f.click()
        await f.fill(typed)
        await f.press('Tab')
        await page.waitForTimeout(700)
        say(`OP.14 kwota „${typed}”`, { pole: await amountVal(page), plik: (await id())?.amount, komunikaty: await toasts(page), błąd: await page.locator('[role="alert"], .text-down').allInnerTexts().catch(() => []) })
      })
    }
    await snap(page, 'OP.14-kwoty')
    // 99 and Esc.
    const beforeEsc = await amountVal(page)
    const f = page.getByTestId('operation-amount')
    await f.click()
    await f.fill('99')
    await f.press('Escape')
    await page.waitForTimeout(600)
    say('OP.14 kwota 99 + Esc', { przed: beforeEsc, pole: await amountVal(page), plik: (await id())?.amount })
    // Counterparty: Esc, then Enter.
    const cp = page.getByTestId('operation-counterparty')
    await cp.fill('Nazwa z Esc')
    await cp.press('Escape')
    await page.waitForTimeout(400)
    say('OP.14 kontrahent + Esc', { pole: await cp.inputValue(), plik: (await id())?.counterparty })
    await cp.fill('Lody Grycan Rynek')
    await cp.press('Enter')
    await page.waitForTimeout(600)
    say('OP.14 kontrahent + Enter', { pole: await cp.inputValue(), plik: (await ops(dataDir)).find((t) => t.date === '2026-10-18' && String(t.counterparty).startsWith('Lody Grycan'))?.counterparty })
    // A note changed and straight to another screen.
    await page.getByTestId('operation-note').fill('notatka przed wyjściem')
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(1200)
    const rec = (await ops(dataDir)).find((t) => t.date === '2026-10-18' && String(t.counterparty).startsWith('Lody Grycan'))
    say('OP.14 notatka po Ctrl+1', rec?.note)
    // Long texts pasted.
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(800)
    await openOp(page, 'lody grycan rynek')
    const note = page.getByTestId('operation-note')
    await note.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.insertText('N'.repeat(6000))
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(1000)
    const r2 = (await ops(dataDir)).find((t) => String(t.counterparty).startsWith('Lody Grycan Rynek'))
    say('OP.14 notatka 6000 znaków', { pole: (await note.inputValue()).length, plik: String(r2?.note ?? '').length })
    // The log: on Shell 12.09 (night, impulse).
    await openOp(page, 'shell', /12\.09/)
    const log = page.getByTestId('operation-log')
    await log.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.insertText('D'.repeat(3000))
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(1000)
    const shell = (await ops(dataDir)).find((t) => t.date === '2026-09-12' && t.counterparty === 'Shell')
    say('OP.14 dziennik 3000 znaków', { pole: (await log.inputValue()).length, plik: String(shell?.logNote ?? '').length })
    // The operation still saves afterwards.
    await typeIn(page, 'operation-amount', '239,06', 'Tab')
    await page.waitForTimeout(800)
    say('OP.14 zapis po długich tekstach', { plik: (await ops(dataDir)).find((t) => t.date === '2026-09-12' && t.counterparty === 'Shell')?.amount, stopka: (await editorText(page)).split('\n').filter((l) => /zapisano/.test(l)) })
    await snap(page, 'OP.14-dlugie-teksty')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.15 data bez roku i w przyszłości', async () => {
  const r = await run('op-daty')
  const { page, app, dataDir, errors } = r
  try {
    const energy0 = await bridgeNumbers(page)
    await goOps(page)
    const bal0 = await balanceOf(page, 'Portfel XTB')
    await page.getByTestId('operation-new').click()
    await typeIn(page, 'operation-amount', '10', 'Tab')
    await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operation-counterparty').fill('Data test')
    await page.getByTestId('operation-counterparty').press('Enter')
    const date = page.getByTestId('operation-date')
    for (const typed of ['03.10', '06.11', '10.11', '11.11', '03.02']) {
      await step(`data ${typed}`, async () => {
        await date.click()
        await date.fill(typed)
        await date.press('Tab')
        await page.waitForTimeout(600)
        say(`OP.15 data „${typed}”`, { pole: await date.inputValue(), plik: (await ops(dataDir)).find((t) => t.counterparty === 'Data test')?.date, przyszłość: await page.getByTestId('operation-future').isVisible().catch(() => false) })
      })
    }
    // Tomorrow.
    await date.click()
    await date.fill('04.11.2026')
    await date.press('Tab')
    await page.waitForTimeout(800)
    const badge = page.getByTestId('operation-future')
    say('OP.15 jutro', {
      pole: await date.inputValue(),
      plik: (await ops(dataDir)).find((t) => t.counterparty === 'Data test')?.date,
      znaczek: await badge.innerText().catch(() => '(brak)'),
      dymek: await badge.getAttribute('title').catch(() => null),
      wiersz: (await rows(page).allInnerTexts()).filter((t) => /Data test/.test(t)).map((t) => t.replace(/\s+/g, ' '))
    })
    const bal1 = await balanceOf(page, 'Portfel XTB')
    await snap(page, 'OP.15-jutro')
    const energy1 = await bridgeNumbers(page)
    say('OP.15 saldo i energia', { saldoPrzed: bal0, saldoPo: bal1, energiaPrzed: energy0, energiaPo: energy1 })
    reading('op', 'OP.15', 'rok + wydatek 10 zł Portfel XTB 04.11', { saldo_portfel_przed: bal0, saldo_portfel_po: bal1, mostek_przed: energy0, mostek_po: energy1 })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.16 rodzaj, kierunek, zwrot towaru', async () => {
  const r = await run('op-rodzaj')
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    const koszty0 = await sums(page)
    await page.getByTestId('operation-new').click()
    await typeIn(page, 'operation-amount', '40', 'Tab')
    await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operation-counterparty').fill('Rodzaj test')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await page.waitForTimeout(500)
    const file = async () => (await ops(dataDir)).find((t) => t.counterparty === 'Rodzaj test')
    say('OP.16 wydatek', { kierunek: await radios(page, 'Kierunek'), kwota: await amountVal(page), plik: [(await file())?.kind, (await file())?.amount] })
    for (const k of ['Wpływ', 'Przelew własny', 'XTB']) {
      await step(`rodzaj ${k}`, async () => {
        await page.locator('[role="radiogroup"][aria-label="Rodzaj operacji"] [role="radio"]', { hasText: new RegExp(`^${k}$`) }).click()
        await page.waitForTimeout(600)
        say(`OP.16 → ${k}`, { kierunek: await radios(page, 'Kierunek'), kwota: await amountVal(page), plik: [(await file())?.kind, (await file())?.amount] })
        // The other direction.
        const dirs = page.locator('[role="radiogroup"][aria-label="Kierunek"] [role="radio"]')
        if ((await dirs.count()) > 1) {
          const unchecked = page.locator('[role="radiogroup"][aria-label="Kierunek"] [role="radio"][aria-checked="false"]').first()
          await unchecked.click()
          await page.waitForTimeout(500)
          say(`OP.16 → ${k}, drugi kierunek`, { kierunek: await radios(page, 'Kierunek'), plik: [(await file())?.kind, (await file())?.amount] })
          await page.locator('[role="radiogroup"][aria-label="Kierunek"] [role="radio"][aria-checked="false"]').first().click()
          await page.waitForTimeout(400)
        }
      })
    }
    for (const k of ['tax', 'loan', 'correction']) {
      await step(`inne ${k}`, async () => {
        await page.getByTestId('operation-kind-other').selectOption(k)
        await page.waitForTimeout(600)
        const dirs = page.locator('[role="radiogroup"][aria-label="Kierunek"] [role="radio"]')
        const all: string[][] = [await radios(page, 'Kierunek')]
        const n = await dirs.count()
        for (let i = 0; i < n; i++) {
          await dirs.nth(i).click()
          await page.waitForTimeout(300)
          all.push([`klik ${i}: ${(await file())?.amount}`])
        }
        say(`OP.16 → inne: ${k}`, { kierunki: all, kwota: await amountVal(page), plik: [(await file())?.kind, (await file())?.amount], notki: (await editorText(page)).split('\n').filter((l) => /liczy|osłon|pożycz|korekt/i.test(l)).slice(0, 6) })
      })
    }
    await snap(page, 'OP.16-pozyczka-korekta')
    // A product return: a new expense 30 zł as a return.
    await page.getByTestId('operation-new').click()
    await page.waitForTimeout(400)
    await page.locator('[role="radiogroup"][aria-label="Kierunek"] [role="radio"]', { hasText: /zwrot/ }).click().catch(() => undefined)
    await typeIn(page, 'operation-amount', '30', 'Tab')
    await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operation-counterparty').fill('Zwrot towaru test')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await page.waitForTimeout(700)
    const ret = (await ops(dataDir)).find((t) => t.counterparty === 'Zwrot towaru test')
    say('OP.16 zwrot towaru', {
      kierunek: await radios(page, 'Kierunek'),
      plik: [ret?.kind, ret?.amount, ret?.categoryId],
      podpowiedź: (await editorText(page)).split('\n').filter((l) => /Zwrot towaru/.test(l)),
      wiersz: await page.getByTestId('operation-row').filter({ hasText: 'Zwrot towaru test' }).evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} :: ${e.querySelector('[data-testid="operation-amount-cell"]')?.className}`)),
      sumyPrzed: koszty0.split('\n').slice(0, 4),
      sumyPo: (await sums(page)).split('\n').slice(0, 4)
    })
    await snap(page, 'OP.16-zwrot-towaru')
    // The envelope on the month plan.
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(1200)
    const plan = await text(page, 'main').catch(() => text(page))
    say('OP.16 plan miesiąca – Jedzenie', plan.split('\n').filter((l, i, a) => /Jedzenie/.test(l) || /Jedzenie/.test(a[i - 1] ?? '')).slice(0, 10))
    reading('op', 'OP.16', 'rok + wydatek 40 zł (zmieniany na korektę) + zwrot towaru 30 zł Portfel XTB 03.11', { sumy_przed: koszty0.split('\n').slice(0, 4).join(' | '), sumy_po: (await (async () => { await page.keyboard.press('Control+2'); await page.waitForTimeout(600); return sums(page) })()).split('\n').slice(0, 4).join(' | ') })
    say('errors', errors)
  } finally {
    await app.close()
  }
})
