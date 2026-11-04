// Area SA – balances: sa-1 (rok + an account without an opening balance): SA.1–SA.5; sa-6 (confirmations of several
// ages): SA.6; sa-7 (a two-sided transfer between today and tomorrow, an operation of tomorrow): SA.7.
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { reading, start, useState } from './lab'
import { CASH, MBANK, Obs, WALLET, readFi, readable, short, statuses, step, tx, txs, writeFi, writeRecord } from './im-pomoc'

const TEST_ACC = '01KAZ900000000000000000003'
const OLD_ACC = '01KAZ900000000000000000004'

const row = (page: Page, name: string) => page.locator(`[data-testid="account-row"][data-name="${name}"]`).first()
async function accounts(page: Page): Promise<void> {
  await page.keyboard.press('Control+,')
  await page.getByTestId('settings-tab-accounts').click()
  await page.waitForTimeout(1000)
}
async function typeAmount(page: Page, loc: ReturnType<Page['locator']>, v: string): Promise<void> {
  await loc.click()
  await loc.fill(v)
  await loc.press('Enter')
  await page.waitForTimeout(500)
}
async function sums(page: Page): Promise<string> {
  await page.keyboard.press('Control+2')
  await page.waitForTimeout(1200)
  return readable(page, '[data-testid="operations-sums"]').catch(() => '(brak)')
}
async function bridge(page: Page): Promise<string> {
  await page.keyboard.press('Control+1')
  await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(2000)
  return readable(page, '[data-testid="page-bridge"]')
}
const pick = (t: string, re: RegExp) => t.split('\n').filter((l) => re.test(l))

test('sa-1: saldo otwarcia, potwierdzenie, korekta, później, wyjaśnienie', async () => {
  const o = new Obs('sa-1')
  const { dataDir, ictjDir } = useState('rok', 'sa-1')
  const fi = readFi(dataDir)
  fi.settings.accounts.push({ id: TEST_ACC, name: 'Konto testowe', kind: 'bank', importFormat: null, archived: false })
  writeFi(dataDir, fi)
  const ops: Array<[string, number]> = [
    ['2026-10-20', -12000],
    ['2026-10-25', 50000],
    ['2026-11-01', -3550]
  ]
  ops.forEach(([d, a], i) => writeRecord(dataDir, 'transactions', tx(`01KAZ98000000000000000000${i + 1}`, { date: d, time: '12:00', accountId: TEST_ACC, amount: a, kind: a > 0 ? 'income' : 'expense', categoryId: a > 0 ? null : '01KDEFCAT00000000000000902', counterparty: `Test ${i + 1}` })))
  o.log('stan', 'rok + „Konto testowe” (bank, bez salda otwarcia) z operacjami −120,00 (20.10), +500,00 (25.10), −35,50 (01.11) – saldo z operacji 344,50 zł')
  let run = await start('sa-1', { dataDir, ictjDir })
  try {
    let page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    const b0 = await bridge(page)
    o.log('przed: odprawa (salda)', pick(b0, /saldo|potwierdź|korekt|rozbieżn/i))
    o.log('przed: Osłony / Suma kont', pick(b0, /Osłony|bufor|Suma kont|^\d[\d ]*,\d\d zł \/ /))
    o.log('przed: pasek sum Operacji', await sums(page))
    // ---------------- SA.1
    await step(o, page, 'SA.1', async () => {
      await accounts(page)
      o.log('SA.1 mBank przed', await readable(page, '[data-testid="account-row"][data-name="mBank"]'))
      const r = row(page, 'mBank')
      const bal0 = await r.getByTestId('account-balance').innerText()
      await typeAmount(page, r.getByTestId('account-opening'), '18100')
      const bal1 = await r.getByTestId('account-balance').innerText()
      o.log('SA.1 saldo konta: przed / po +100 zł salda otwarcia', [bal0, bal1])
      o.log('SA.1 Operacje po +100', await sums(page))
      await accounts(page)
      const d = row(page, 'mBank').getByTestId('account-opening-date')
      await d.click()
      await d.fill('02.09.2025')
      await d.press('Enter')
      await page.waitForTimeout(600)
      const bal2 = await row(page, 'mBank').getByTestId('account-balance').innerText()
      o.log('SA.1 saldo po zmianie daty na 02.09.2025', bal2)
      await d.click()
      await d.fill('04.11.2026')
      await d.press('Enter')
      await page.waitForTimeout(600)
      o.log('SA.1 data jutra – komunikaty', await statuses(page))
      o.log('SA.1 data w polu po próbie', await d.inputValue())
      reading('sa', 'SA.1', 'rok – mBank: saldo przed / po +100 / po dacie 02.09.2025', { przed: bal0, po100: bal1, poDacie: bal2 })
      // the new account
      const t = row(page, 'Konto testowe')
      o.log('SA.1 Konto testowe przed', await readable(page, '[data-testid="account-row"][data-name="Konto testowe"]'))
      o.log('SA.1 Operacje – pasek przed (gwiazdka?)', await sums(page))
      await accounts(page)
      await typeAmount(page, row(page, 'Konto testowe').getByTestId('account-confirm-amount'), '500')
      o.log('SA.1 przycisk', await row(page, 'Konto testowe').getByTestId('account-confirm').innerText())
      await row(page, 'Konto testowe').getByTestId('account-confirm').click()
      await page.waitForTimeout(800)
      o.log('SA.1 Ustaw z salda w banku – toast', await statuses(page))
      o.log('SA.1 Konto testowe po', await readable(page, '[data-testid="account-row"][data-name="Konto testowe"]'))
      await o.shot(page, 'SA.1-konta')
      o.log('SA.1 Operacje – pasek po', await sums(page))
      await accounts(page)
      const hist = row(page, 'mBank').getByRole('button', { name: /historia/ })
      if (await hist.count()) {
        await hist.first().click()
        await page.waitForTimeout(800)
        o.log('SA.1 historia salda otwarcia', (await page.getByRole('dialog').allInnerTexts()).join('\n').slice(0, 2000))
        await o.shot(page, 'SA.1-historia')
        await page.keyboard.press('Escape')
      }
      // back to 01.09.2025 and 18 000 for the next points
      await typeAmount(page, row(page, 'mBank').getByTestId('account-opening'), '18000')
      const d2 = row(page, 'mBank').getByTestId('account-opening-date')
      await d2.click()
      await d2.fill('01.09.2025')
      await d2.press('Enter')
      await page.waitForTimeout(600)
      o.log('SA.1 mBank przywrócony', await readable(page, '[data-testid="account-row"][data-name="mBank"]'))
    })
    // ---------------- SA.2
    await step(o, page, 'SA.2', async () => {
      await accounts(page)
      const r = row(page, 'mBank')
      const bal = (await r.getByTestId('account-balance').innerText()).replace(/\s*zł/, '').trim()
      await typeAmount(page, r.getByTestId('account-confirm-amount'), bal)
      await r.getByTestId('account-confirm').click()
      await page.waitForTimeout(800)
      o.log('SA.2 toast', await statuses(page))
      o.log('SA.2 wiersz mBank', await readable(page, '[data-testid="account-row"][data-name="mBank"]'))
      o.log('SA.2 korekty w folderze', (await txs(dataDir)).filter((t) => t.kind === 'correction').map(short))
      const b = await bridge(page)
      o.log('SA.2 odprawa', pick(b, /saldo|potwierdź|korekt/i))
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1200)
      o.log('SA.2 Meldunki – salda', pick(await readable(page, 'main'), /saldo|Salda/i))
    })
    // ---------------- SA.3
    await step(o, page, 'SA.3', async () => {
      const b = await bridge(page)
      const before = { osłony: pick(b, /bufor na pensje/).concat(b.split('\n').filter((l, i, a) => /bufor na pensje/.test(a[i - 1] ?? ''))), koszty: await sums(page) }
      await accounts(page)
      const r = row(page, 'mBank')
      const bal = Number((await r.getByTestId('account-balance').innerText()).replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.'))
      const lower = (bal - 37.5).toFixed(2).replace('.', ',')
      await typeAmount(page, r.getByTestId('account-confirm-amount'), lower)
      await r.getByTestId('account-confirm').click()
      await page.waitForTimeout(600)
      o.log('SA.3 pytanie', await r.getByTestId('confirm-ask').innerText().catch(() => '(brak pytania)'))
      await o.shot(page, 'SA.3-pytanie')
      await r.getByTestId('confirm-ask-yes').click()
      await page.waitForTimeout(1000)
      o.log('SA.3 toast', await statuses(page))
      o.log('SA.3 wiersz mBank', await readable(page, '[data-testid="account-row"][data-name="mBank"]'))
      const corr = (await txs(dataDir)).filter((t) => t.kind === 'correction')
      o.log('SA.3 korekty', corr.map((t) => `${short(t)} explained=${t.explained}`))
      const b2 = await bridge(page)
      o.log('SA.3 odprawa', pick(b2, /korekt|rozbieżn|saldo/i))
      await o.shot(page, 'SA.3-odprawa')
      const after = { osłony: b2.split('\n').filter((l, i, a) => /bufor na pensje/.test(a[i - 1] ?? '')), koszty: await sums(page) }
      o.log('SA.3 osłony i pasek sum przed / po', { before, after })
      reading('sa', 'SA.3', 'rok – korekta −37,50: osłony i koszty przed / po', { przed: JSON.stringify(before), po: JSON.stringify(after) })
      await page.getByTestId('operations-search').fill('korekta')
      await page.waitForTimeout(800)
      o.log('SA.3 Operacje – korekta', await page.getByTestId('operation-row').allInnerTexts())
      await page.getByTestId('operations-search').fill('')
    })
    // ---------------- SA.4
    await step(o, page, 'SA.4', async () => {
      await accounts(page)
      const r = row(page, 'mBank')
      const bal = Number((await r.getByTestId('account-balance').innerText()).replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.'))
      const lower = (bal - 10).toFixed(2).replace('.', ',')
      await typeAmount(page, r.getByTestId('account-confirm-amount'), lower)
      await r.getByTestId('account-confirm').click()
      await page.waitForTimeout(600)
      o.log('SA.4 pytanie', await r.getByTestId('confirm-ask').innerText().catch(() => '(brak)'))
      const n0 = (await txs(dataDir)).filter((t) => t.kind === 'correction').length
      await r.getByTestId('confirm-ask-later').click()
      await page.waitForTimeout(600)
      o.log('SA.4 po „później”: pole / korekty przed, po', [await r.getByTestId('account-confirm-amount').inputValue(), n0, (await txs(dataDir)).filter((t) => t.kind === 'correction').length])
      // the missing expense, typed in Operacje
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.keyboard.press('Control+n')
      await page.waitForTimeout(500)
      const amt = page.getByTestId('operation-amount')
      await amt.fill('10,00')
      await amt.press('Enter')
      await page.getByTestId('operation-counterparty').fill('Brakujący wydatek')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(800)
      o.log('SA.4 dopisany wydatek', (await txs(dataDir)).filter((t) => /Brakujący/.test(String(t.counterparty))).map(short))
      await accounts(page)
      const r2 = row(page, 'mBank')
      o.log('SA.4 pole po powrocie', await r2.getByTestId('account-confirm-amount').inputValue())
      if (!(await r2.getByTestId('account-confirm-amount').inputValue())) await typeAmount(page, r2.getByTestId('account-confirm-amount'), lower)
      await r2.getByTestId('account-confirm').click()
      await page.waitForTimeout(800)
      o.log('SA.4 potwierdzenie po dopisaniu – toast / pytanie', [await statuses(page), await r2.getByTestId('confirm-ask').innerText().catch(() => '(brak pytania)')])
      // the question open, the amount changed
      await typeAmount(page, r2.getByTestId('account-confirm-amount'), '1')
      await r2.getByTestId('account-confirm').click()
      await page.waitForTimeout(500)
      o.log('SA.4 pytanie otwarte', await r2.getByTestId('confirm-ask').count())
      await typeAmount(page, r2.getByTestId('account-confirm-amount'), '2')
      o.log('SA.4 po zmianie kwoty – pytanie widoczne', await r2.getByTestId('confirm-ask').count())
    })
    // ---------------- SA.5
    await step(o, page, 'SA.5', async () => {
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-search').fill('korekta')
      await page.waitForTimeout(800)
      await page.getByTestId('operation-row').first().click()
      await page.waitForTimeout(500)
      o.log('SA.5 ramka korekty', await page.getByTestId('operation-correction-box').innerText().catch(() => '(brak)'))
      await page.getByTestId('operation-correction-explained').click()
      await page.waitForTimeout(800)
      o.log('SA.5 po „Oznacz jako wyjaśnioną”', await page.getByTestId('operation-correction-box').innerText().catch(() => '(brak)'))
      o.log('SA.5 odprawa po wyjaśnieniu', pick(await bridge(page), /korekt|rozbieżn/i))
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-search').fill('korekta')
      await page.waitForTimeout(800)
      await page.getByTestId('operation-row').first().click()
      await page.getByTestId('operation-correction-explained').click()
      await page.waitForTimeout(800)
      o.log('SA.5 po „Przywróć alarm”', await page.getByTestId('operation-correction-box').innerText().catch(() => '(brak)'))
      o.log('SA.5 odprawa po przywróceniu', pick(await bridge(page), /korekt|rozbieżn/i))
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-search').fill('korekta')
      await page.waitForTimeout(800)
      await page.getByTestId('operation-row').first().click()
      const note = page.getByTestId('operation-note')
      await note.fill('Wyjaśnione: opłata za przelew natychmiastowy')
      await note.press('Control+Enter')
      await page.getByTestId('operation-correction-explained').click()
      await page.waitForTimeout(1000)
      o.log('SA.5 korekty w folderze', (await txs(dataDir)).filter((t) => t.kind === 'correction').map((t) => `${short(t)} explained=${t.explained}`))
    })
    await run.app.close()
    run = await start('sa-1', { dataDir, ictjDir, fresh: false })
    page = run.page
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    o.log('SA.5 po restarcie – odprawa', pick(await bridge(page), /korekt|rozbieżn/i))
    o.log('błędy okna', run.errors)
  } finally {
    await run.app.close()
  }
})

test('sa-6: przypomnienia o saldach', async () => {
  const o = new Obs('sa-6')
  const { dataDir, ictjDir } = useState('rok', 'sa-6')
  const fi = readFi(dataDir)
  fi.settings.accounts.push({ id: OLD_ACC, name: 'Stare konto', kind: 'bank', importFormat: null, archived: true })
  writeFi(dataDir, fi)
  const bal = (id: string, n: number, date: string, acc: string, amount: number, kind = 'confirmation') =>
    writeRecord(dataDir, 'balances', { schemaVersion: 1, id, createdAt: `${date}T18:00:00.000Z`, updatedAt: `${date}T18:00:00.000Z`, date, accountId: acc, kind, amount, correctionId: null, note: '' })
  void bal
  o.log('stan', 'rok; mBank potwierdzony 26.10 (8 dni temu – persona); Portfel XTB potwierdzam ręcznie w aplikacji; Gotówka nigdy; „Stare konto” zarchiwizowane, nigdy')
  const run = await start('sa-6', { dataDir, ictjDir })
  const { page } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'SA.6', async () => {
      o.log('SA.6 odprawa przed', pick(await bridge(page), /saldo|potwierdź/i))
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1200)
      const m = await readable(page, 'main')
      o.log('SA.6 Meldunki – salda', m.slice(m.indexOf('Salda kont'), m.indexOf('Salda kont') + 600))
      // confirm mBank first (does it switch Portfel's reminder off? – B28), then Portfel
      await accounts(page)
      const mb = row(page, 'mBank')
      const v = (await mb.getByTestId('account-balance').innerText()).replace(/\s*zł/, '').trim()
      await typeAmount(page, mb.getByTestId('account-confirm-amount'), v)
      await mb.getByTestId('account-confirm').click()
      await page.waitForTimeout(800)
      o.log('SA.6 odprawa po potwierdzeniu mBanku', pick(await bridge(page), /saldo|potwierdź/i))
      await accounts(page)
      const pw = row(page, 'Portfel XTB')
      const v2 = (await pw.getByTestId('account-balance').innerText()).replace(/\s*zł/, '').trim()
      await typeAmount(page, pw.getByTestId('account-confirm-amount'), v2)
      await pw.getByTestId('account-confirm').click()
      await page.waitForTimeout(800)
      o.log('SA.6 potwierdzenie Portfela – toast', await statuses(page))
      o.log('SA.6 odprawa po potwierdzeniu Portfela', pick(await bridge(page), /saldo|potwierdź/i))
      await page.keyboard.press('Control+Shift+M')
      await page.waitForTimeout(1200)
      const m2 = await readable(page, 'main')
      o.log('SA.6 Meldunki po', m2.includes('Salda kont') ? m2.slice(m2.indexOf('Salda kont'), m2.indexOf('Salda kont') + 600) : '(brak sekcji „Salda kont”)')
    })
    o.log('błędy okna', run.errors)
  } finally {
    await run.app.close()
  }
})

test('sa-7: potwierdzenie z ekranu Import, przelew między dniami, jutro, brzegi kwot', async () => {
  const o = new Obs('sa-7')
  const { dataDir, ictjDir } = useState('rok', 'sa-7')
  writeRecord(dataDir, 'transactions', tx('01KAZ990000000000000000001', { date: '2026-11-03', time: '09:00', accountId: MBANK, kind: 'transfer', amount: -20000, counterAccountId: WALLET, bothSides: true, counterDate: '2026-11-04', counterparty: 'Na Portfel XTB' }))
  writeRecord(dataDir, 'transactions', tx('01KAZ990000000000000000002', { date: '2026-11-04', time: '10:00', accountId: WALLET, kind: 'expense', amount: -5000, categoryId: '01KDEFCAT00000000000000902', counterparty: 'Zakup jutro' }))
  o.log('stan', 'rok + przelew w jednej operacji mBank → Portfel XTB 200,00 zł: strona mBanku 03.11, strona Portfela 04.11; wydatek Portfela 50,00 zł z datą 04.11 (jutro)')
  const run = await start('sa-7', { dataDir, ictjDir })
  const { page } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'SA.7', async () => {
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1000)
      const imp = await readable(page, '[data-testid="balance-check"]')
      o.log('SA.7 Import – Potwierdzenie sald', imp)
      await accounts(page)
      const set = await readable(page, 'main')
      o.log('SA.7 Ustawienia – salda kont', pick(set, /saldo teraz/))
      reading('sa', 'SA.7', 'rok + przelew 03.11→04.11, wydatek 04.11 – salda: Import / Ustawienia', { import: imp.replace(/\n/g, ' '), ustawienia: pick(set, /saldo teraz/).join(' | ') })
      // confirm Portfel on the Import screen with its balance there
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(800)
      const pr = page.locator('[data-testid="balance-row"][data-name="Portfel XTB"]')
      const txt = await pr.innerText()
      const val = (/operacje: ([^\n]+) zł/.exec(txt) ?? [])[1] ?? ''
      await typeAmount(page, pr.getByTestId('balance-input'), val)
      await pr.getByTestId('balance-confirm').click()
      await page.waitForTimeout(800)
      o.log('SA.7 Portfel – potwierdzenie z ekranu Import', { wpisane: val, statuses: await statuses(page), pytanie: await pr.getByTestId('confirm-ask').innerText().catch(() => '(brak)') })
      // negative and a large amount on mBank
      const mr = page.locator('[data-testid="balance-row"][data-name="mBank"]')
      await typeAmount(page, mr.getByTestId('balance-input'), '-250')
      o.log('SA.7 −250 – pole', await mr.getByTestId('balance-input').inputValue())
      await mr.getByTestId('balance-confirm').click()
      await page.waitForTimeout(600)
      o.log('SA.7 −250 – pytanie', await mr.getByTestId('confirm-ask').innerText().catch(() => '(brak)'))
      await o.shot(page, 'SA.7-ujemne')
      await mr.getByTestId('confirm-ask-later').click().catch(() => undefined)
      await typeAmount(page, mr.getByTestId('balance-input'), '1 234 567,89')
      o.log('SA.7 1 234 567,89 – pole', await mr.getByTestId('balance-input').inputValue())
      await mr.getByTestId('balance-confirm').click()
      await page.waitForTimeout(600)
      o.log('SA.7 duża kwota – pytanie', await mr.getByTestId('confirm-ask').innerText().catch(() => '(brak)'))
      await o.shot(page, 'SA.7-duza')
      await mr.getByTestId('confirm-ask-later').click().catch(() => undefined)
      // the same in the settings
      await accounts(page)
      const ar = row(page, 'mBank')
      await typeAmount(page, ar.getByTestId('account-confirm-amount'), '-250')
      await ar.getByTestId('account-confirm').click()
      await page.waitForTimeout(600)
      o.log('SA.7 Ustawienia −250 – pytanie', await ar.getByTestId('confirm-ask').innerText().catch(() => '(brak)'))
      await ar.getByTestId('confirm-ask-later').click().catch(() => undefined)
    })
    o.log('błędy okna', run.errors)
  } finally {
    await run.app.close()
  }
  void CASH
  void join
})
