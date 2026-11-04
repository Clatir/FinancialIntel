/** OP.35, ME.6, ME.7, OP.20 (przelew obu kont) – stan „rok+przelewy”. */
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { reading, start } from './lab'
import { balanceOf, goInbox, goOps, openOp, ops, opt, run, say, shown, snap, step, toasts, TR, transfers } from './op-pomoc'

const guardText = async (page: Page) => (await opt(page.getByTestId('operation-guard'))).replace(/\n+/g, ' | ')
const bal = async (page: Page) => {
  await goOps(page)
  return { mBank: await balanceOf(page, 'mBank'), portfel: await balanceOf(page, 'Portfel XTB'), gotówka: await balanceOf(page, 'Gotówka') }
}
const transferItems = async (page: Page) => (await page.getByTestId('inbox-item').allInnerTexts()).filter((t) => /przelew|Przelew|strona|stron|konta/i.test(t)).map((t) => t.replace(/\s+/g, ' '))

test('OP.35 przelew sprzed 1.7.0 – połącz, dopisz', async () => {
  const r = await run('op-przelew-stary', (d) => transfers(d))
  const { page, app, dataDir, errors } = r
  try {
    const b0 = await bal(page)
    await openOp(page, 'przelew na portfel')
    say('OP.35 strona mBanku pary P1', { notka: await opt(page.getByTestId('operation-transfer-legacy')), połącz: await opt(page.getByTestId('operation-transfer-join')) })
    await snap(page, 'OP.35-para')
    await page.getByTestId('operation-transfer-join').click()
    await page.waitForTimeout(800)
    const p1 = (await ops(dataDir)).filter((t) => t.id === TR.p1m || t.id === TR.p1w).map((t) => `${t.counterparty} ${t.amount} both=${t.bothSides} cd=${t.counterDate}`)
    const b1 = await bal(page)
    say('OP.35 po połączeniu', { okno: await guardText(page), toast: await toasts(page), pliki: p1, saldaPrzed: b0, saldaPo: b1 })
    // The lone side after Portfel XTB's confirmation.
    await openOp(page, 'przelew bez pary')
    say('OP.35 jednostronny bez pary', { notka: await opt(page.getByTestId('operation-transfer-legacy')), dopisz: await opt(page.getByTestId('operation-transfer-add')) })
    await page.getByTestId('operation-transfer-add').click()
    await page.waitForTimeout(800)
    const b2 = await bal(page)
    say('OP.35 po dopisaniu', { okno: await guardText(page), toast: await toasts(page), plik: (await ops(dataDir)).filter((t) => t.id === TR.lone).map((t) => `both=${t.bothSides} ${t.amount}`), salda: b2 })
    await snap(page, 'OP.35-dopisz')
    await page.getByRole('status').filter({ hasText: /jedną operacją/ }).getByRole('button', { name: 'Cofnij' }).first().click().catch(() => undefined)
    await page.waitForTimeout(700)
    say('OP.35 po Cofnij', { plik: (await ops(dataDir)).filter((t) => t.id === TR.lone).map((t) => `both=${t.bothSides} ${t.amount}`), salda: await bal(page) })
    // A lone side inside Portfel XTB's confirmed period.
    await openOp(page, 'gotówka bez pary')
    await page.getByTestId('operation-transfer-add').click().catch(() => undefined)
    await page.waitForTimeout(600)
    say('OP.35 dopisz w okresie potwierdzonym', await guardText(page))
    await snap(page, 'OP.35-potwierdzony')
    await page.getByTestId('operation-guard-cancel').click().catch(() => undefined)
    // P4: a pair whose Portfel side is inside the confirmed period – joining.
    await openOp(page, 'gotówka do portfela')
    say('OP.35 para P4 (okres potwierdzony Portfela)', { notka: await opt(page.getByTestId('operation-transfer-legacy')), połącz: await opt(page.getByTestId('operation-transfer-join')) })
    await page.getByTestId('operation-transfer-join').click().catch(() => undefined)
    await page.waitForTimeout(600)
    say('OP.35 P4 połącz – okno', { okno: await guardText(page), toast: await toasts(page) })
    reading('op', 'OP.35', 'rok+przelewy', { salda_przed: JSON.stringify(b0), po_polaczeniu_P1: JSON.stringify(b1), po_dopisaniu: JSON.stringify(b2) })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.20 przelew w jednej operacji w okresach potwierdzonych obu kont', async () => {
  const r = await run('op-przelew-potw', (d) => transfers(d))
  const { page, app, errors } = r
  try {
    await goOps(page)
    await openOp(page, 'z portfela na konto')
    say('OP.20 znaczek', await opt(page.getByTestId('operation-confirmed'), 'title'))
    const a = page.getByTestId('operation-amount')
    await a.click()
    await a.fill('110')
    await a.press('Tab')
    await page.waitForTimeout(500)
    say('OP.20 przelew 100 → 110', await guardText(page))
    await snap(page, 'OP.20-przelew-oba-konta')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('ME.6 pary przelewów jako dwie operacje', async () => {
  const name = 'me-pary'
  const r = await run(name, (d) => transfers(d))
  const { dataDir } = r
  let { page, app } = r
  const errors = [...r.errors]
  try {
    const b0 = await bal(page)
    await goInbox(page)
    say('ME.6 meldunki przelewów', await transferItems(page))
    const pairItem = page.getByTestId('inbox-item').filter({ hasText: /dwie|osobne/ })
    say('ME.6 meldunek par', await opt(pairItem))
    await pairItem.getByTestId('inbox-open').click()
    await page.waitForTimeout(600)
    const dlg = page.getByTestId('inbox-pairs')
    say('ME.6 okno', await opt(dlg))
    say('ME.6 pary', await dlg.getByTestId('inbox-pair').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} | unnamed=${e.getAttribute('data-unnamed')} | tick=${(e.querySelector('[data-testid="inbox-pair-tick"]') as HTMLInputElement | null)?.checked}`)))
    await snap(page, 'ME.6-okno')
    const unnamed = dlg.locator('[data-testid="inbox-pair"][data-unnamed="1"]')
    if (await unnamed.count()) {
      const tick = unnamed.getByTestId('inbox-pair-tick')
      if (await tick.isChecked()) await tick.uncheck()
    }
    say('ME.6 przycisk', await opt(dlg.getByTestId('inbox-pairs-join')))
    await dlg.getByTestId('inbox-pairs-join').click()
    await page.waitForTimeout(900)
    const t1 = await toasts(page)
    const files = async () => (await ops(dataDir)).filter((t) => Object.values(TR).includes(String(t.id))).map((t) => `${t.counterparty} ${t.date} ${t.amount} both=${t.bothSides ?? ''} cd=${t.counterDate ?? ''}`)
    say('ME.6 po połączeniu', { toast: t1, pliki: await files() })
    await page.keyboard.press('Escape').catch(() => undefined)
    const b1 = await bal(page)
    say('ME.6 salda przed / po', { przed: b0, po: b1 })
    reading('op', 'ME.6', 'rok+przelewy', { salda_przed: JSON.stringify(b0), salda_po: JSON.stringify(b1) })
    await page.getByRole('status').filter({ hasText: 'Połączono' }).getByRole('button', { name: 'Cofnij' }).first().click().catch(() => undefined)
    await page.waitForTimeout(800)
    say('ME.6 po Cofnij', { pliki: await files(), salda: await bal(page) })
    // „zostaw tak” for the unnamed pair.
    await goInbox(page)
    await page.getByTestId('inbox-item').filter({ hasText: /dwie|osobne/ }).getByTestId('inbox-open').click()
    await page.waitForTimeout(500)
    await page.getByTestId('inbox-pairs').locator('[data-testid="inbox-pair"][data-unnamed="1"]').getByTestId('inbox-pair-dismiss').click()
    await page.waitForTimeout(600)
    say('ME.6 „zostaw tak”', { toast: await toasts(page), pary: await page.getByTestId('inbox-pair').count() })
    await page.keyboard.press('Escape')
    say('ME.6 meldunki po', await transferItems(page))
    await app.close()
    const r2 = await start(name, { dataDir, ictjDir: join(r.dir, 'ictj'), fresh: false })
    r2.page.setDefaultTimeout(15_000)
    page = r2.page
    app = r2.app
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await goInbox(page)
    await page.waitForTimeout(1500)
    say('ME.6 po ponownym uruchomieniu', await transferItems(page))
    errors.push(...r2.errors)
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('ME.7 przelew liczony dwa razy i brakująca strona', async () => {
  const r = await run('me-przelewy', (d) => transfers(d))
  const { page, app, dataDir, errors } = r
  try {
    const b0 = await bal(page)
    await goInbox(page)
    const items = page.getByTestId('inbox-item')
    say('ME.7 meldunki przelewów', await transferItems(page))
    await snap(page, 'ME.7-meldunki')
    const dbl = items.filter({ hasText: /dwa razy/ })
    say('ME.7 podwójny – przyciski', await dbl.getByRole('button').allInnerTexts())
    await dbl.getByTestId('inbox-open').click()
    await page.waitForTimeout(800)
    const b1 = await bal(page)
    say('ME.7 po „Połącz”', { toast: await toasts(page), pliki: (await ops(dataDir)).filter((t) => t.id === TR.dbl || t.id === TR.dblW).map((t) => `${t.counterparty} ${t.amount}`), salda: b1 })
    await goInbox(page)
    const lone = page.getByTestId('inbox-item').filter({ hasText: /tylko na koncie/ })
    say('ME.7 brakujące – meldunki', await lone.allInnerTexts())
    await step('Pokaż', async () => {
      const show = lone.first().getByTestId('inbox-transfer-show')
      if (await shown(show)) {
        await show.click()
        await page.waitForTimeout(600)
        say('ME.7 „Pokaż”', { edytor: await opt(page.getByTestId('operation-counterparty')).catch(() => ''), strona: await page.getByTestId('operation-counterparty').inputValue().catch(() => '(brak edytora)') })
        await goInbox(page)
      }
    })
    await page.getByTestId('inbox-item').filter({ hasText: /tylko na koncie/ }).first().getByTestId('inbox-open').click()
    await page.waitForTimeout(800)
    const b2 = await bal(page)
    say('ME.7 po „Dopisz drugą stronę”', { okno: await guardText(page), toast: await toasts(page), salda: b2 })
    await goInbox(page)
    say('ME.7 meldunki po', await transferItems(page))
    reading('op', 'ME.7', 'rok+przelewy', { salda_przed: JSON.stringify(b0), po_polacz: JSON.stringify(b1), po_dopisz: JSON.stringify(b2) })
    say('errors', errors)
  } finally {
    await app.close()
  }
})
