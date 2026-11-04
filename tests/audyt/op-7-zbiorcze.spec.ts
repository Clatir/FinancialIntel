/** OP.28–OP.33 – zmiany zaznaczonych na kopii „rok” (OP.28 z wydatkami „Mokka” bez kategorii, OP.33 z przelewem). */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { records } from '../e2e/files'
import { reading } from './lab'
import { addRecords, ANNA, bridgeNumbers, CASH, goOps, MAREK, ops, opt, rows, run, say, shown, snap, step, sums, text, toasts, WALLET } from './op-pomoc'

const APTEKA = /Apteka mBank/
const count = async (page: Page) => (await sums(page)).split('\n')[0]!
const tick = async (page: Page, name: string | RegExp, nth = 0) => {
  const [n, acc] = name === APTEKA ? ['Apteka', 'mBank'] : [name, null]
  let row = page.getByTestId('operation-row').filter({ hasText: n })
  if (acc) row = row.filter({ hasText: acc })
  await row.nth(nth).getByTestId('operation-tick').check()
}
const bulk = async (page: Page) => (await opt(page.getByTestId('operations-bulk'))).replace(/\s+/g, ' ')
const rules = (dataDir: string) => {
  const s = JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8')).settings.import
  return JSON.stringify({ rules: s.rules.filter((r: any) => /mokka/i.test(`${r.match} ${r.label}`)).map((r: any) => `${r.mode}:${r.match}→${r.categoryId}`), keywords: s.keywords ?? null })
}
async function bridgeHousehold(page: Page) {
  await page.keyboard.press('Control+1')
  await page.waitForTimeout(800)
  const t = await text(page, '[data-testid="page-bridge"]')
  const lines = t.split('\n')
  const i = lines.findIndex((l) => /ENERGIA DZI/i.test(l))
  return { energia: lines.slice(i, i + 2).join(' '), domownicy: lines.filter((l) => /Marek|Anna|Kasia/.test(l)) }
}

test('OP.28 kategoria dla zaznaczonych', async () => {
  const r = await run('op-zaznaczone-kat', (d) =>
    addRecords(d, 'transactions', [
      ...['2026-11-01', '2026-11-02', '2026-11-02'].map((date, i) => ({ date, accountId: WALLET, counterparty: 'Mokka Rynek', amount: -(1100 + i * 100) })),
      { date: '2026-11-02', accountId: WALLET, kind: 'income', counterparty: 'Mokka zwrot', amount: 500 }
    ])
  )
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await page.getByTestId('operations-search').fill('mokka')
    await page.waitForTimeout(400)
    say('OP.28 lista „mokka” (listopad)', { licznik: await count(page), wiersze: (await rows(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')) })
    await page.getByTestId('operations-tick-all').check()
    await page.waitForTimeout(300)
    say('OP.28 pasek zaznaczonych', { tekst: await bulk(page), ustawAktywne: await page.getByTestId('operations-bulk-apply').isEnabled() })
    say('OP.28 opcje „zapamiętaj”', await page.getByTestId('operations-bulk-remember').evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.textContent)))
    await page.getByTestId('operations-bulk-category').selectOption({ label: 'Jedzenie · kawa i przekąski' })
    await page.getByTestId('operations-bulk-remember').selectOption('keyword')
    const before = rules(dataDir)
    await page.getByTestId('operations-bulk-apply').click()
    await page.waitForTimeout(800)
    const toast = await toasts(page)
    const afterSet = (await ops(dataDir)).filter((t) => /mokka/i.test(String(t.counterparty)) && String(t.date) >= '2026-11-01').map((t) => `${t.counterparty} ${t.kind} ${t.categoryId ? String(t.categoryId).slice(-4) : null}`)
    say('OP.28 po „Ustaw”', { toast, pliki: afterSet, reguły: rules(dataDir), regułyPrzed: before })
    await snap(page, 'OP.28-ustaw')
    await page.getByRole('status').filter({ hasText: /operac/ }).getByRole('button', { name: 'Cofnij' }).first().click()
    await page.waitForTimeout(800)
    say('OP.28 po „Cofnij”', { pliki: (await ops(dataDir)).filter((t) => /mokka/i.test(String(t.counterparty)) && String(t.date) >= '2026-11-01').map((t) => `${t.counterparty} ${t.kind} ${t.categoryId ? String(t.categoryId).slice(-4) : null}`), reguły: rules(dataDir), toast: await toasts(page) })
    // A change of the filter with a selection.
    await page.getByTestId('operations-tick-all').check()
    await page.waitForTimeout(200)
    const n0 = await bulk(page)
    await page.getByTestId('operations-search').fill('mokka rynek')
    await page.waitForTimeout(400)
    say('OP.28 zaznaczenie po zmianie filtra', { przed: n0, po: await bulk(page), zaznaczone: await page.locator('[data-testid="operation-tick"]:checked').count() })
    // Brands.
    await page.getByTestId('operations-tick-all').check()
    await page.getByTestId('operations-bulk-category').selectOption({ label: 'Jedzenie · kawa i przekąski' })
    await page.getByTestId('operations-bulk-remember').selectOption('brands')
    await page.getByTestId('operations-bulk-apply').click()
    await page.waitForTimeout(800)
    say('OP.28 „zapamiętaj dla ich marek”', { toast: await toasts(page), reguły: rules(dataDir) })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.29 finansujący dla zaznaczonych', async () => {
  const r = await run('op-zaznaczone-fin')
  const { page, app, dataDir, errors } = r
  try {
    const h0 = await bridgeHousehold(page)
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(400)
    const pick = ['DROGERIA NATURA', 'FRYZJER STYL', 'P4 SP']
    const tickAll = async () => {
      await goOps(page)
      await page.getByTestId('operations-period-menu').click()
      await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
      await page.getByTestId('operations-prev-month').click()
      await page.waitForTimeout(400)
      if (await page.locator('[data-testid="operation-tick"]:checked').count()) await page.getByTestId('operations-bulk-clear').click().catch(() => undefined)
      for (const n of pick) await tick(page, n)
    }
    const file = async () => (await ops(dataDir)).filter((t) => pick.some((p) => String(t.counterparty).startsWith(p)) && String(t.date).startsWith('2026-10')).map((t) => `${t.counterparty}: ${t.refundable ? 'fin' : ''}${t.memberId ? String(t.memberId).slice(-2) : ''}${t.gift ? ' prezent' : ''}${(t.splits as any[]).length ? ` części ${(t.splits as any[]).map((s) => `${s.amount}/${s.memberId ? String(s.memberId).slice(-2) : 'ja'}`).join(',')}` : ''}`)
    await tickAll()
    say('OP.29 zaznaczone', await bulk(page))
    say('OP.29 opcje', await page.getByTestId('operations-bulk-financer').evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.textContent)))
    const undo = async (label: string) => {
      await page.getByRole('status').filter({ hasText: label }).getByRole('button', { name: 'Cofnij' }).first().click()
      await page.waitForTimeout(700)
    }
    await page.getByTestId('operations-bulk-financer').selectOption(MAREK)
    await page.getByTestId('operations-bulk-finance').click()
    await page.waitForTimeout(800)
    const t1 = await toasts(page)
    const f1 = await file()
    const h1 = await bridgeHousehold(page)
    say('OP.29 Marek', { toast: t1, pliki: f1, mostekPrzed: h0, mostekPo: h1 })
    reading('op', 'OP.29', 'rok, 3 wydatki 10.2026 (DROGERIA NATURA 23.10, FRYZJER STYL 19.10, P4 20.10) → Marek', { mostek_przed: JSON.stringify(h0), mostek_po: JSON.stringify(h1) })
    await goOps(page)
    await undo('Finansuje')
    say('OP.29 Marek – Cofnij', { pliki: await file(), mostek: await bridgeHousehold(page) })
    await tickAll()
    await page.getByTestId('operations-bulk-financer').selectOption(`gift:${MAREK}`)
    await page.getByTestId('operations-bulk-finance').click()
    await page.waitForTimeout(700)
    say('OP.29 Marek – prezent', { toast: await toasts(page), pliki: await file() })
    await undo('Prezent')
    await tickAll()
    await page.getByTestId('operations-bulk-financer').selectOption('share')
    await page.waitForTimeout(300)
    const shareBox = page.getByTestId('operations-bulk-share')
    say('OP.29 wspólnie – edytor', await opt(shareBox))
    await step('procenty 50 + 40', async () => {
      await shareBox.getByRole('radio', { name: 'procenty' }).click()
      await page.waitForTimeout(200)
      const pct = page.getByTestId('operations-bulk-share-percent')
      await pct.nth(0).click()
      await pct.nth(0).fill('50')
      await pct.nth(0).press('Tab')
      await pct.nth(1).click()
      await pct.nth(1).fill('40')
      await pct.nth(1).press('Tab')
      await page.waitForTimeout(300)
      say('OP.29 50 + 40', { edytor: await opt(shareBox), przycisk: await page.getByTestId('operations-bulk-finance').isEnabled() })
      await snap(page, 'OP.29-90-procent')
      await pct.nth(1).click()
      await pct.nth(1).fill('50')
      await pct.nth(1).press('Tab')
      await page.waitForTimeout(300)
      say('OP.29 50 + 50', { edytor: await opt(shareBox), przycisk: await page.getByTestId('operations-bulk-finance').isEnabled() })
      await page.getByTestId('operations-bulk-finance').click()
      await page.waitForTimeout(700)
      say('OP.29 wspólnie', { toast: await toasts(page), pliki: await file() })
      await undo('Wspólnie')
    })
    await tickAll()
    await page.getByTestId('operations-bulk-financer').selectOption(ANNA)
    await page.getByTestId('operations-bulk-finance').click()
    await page.waitForTimeout(600)
    say('OP.29 Anna', { toast: await toasts(page), pliki: await file() })
    await tickAll()
    await page.getByTestId('operations-bulk-financer').selectOption('-')
    await page.getByTestId('operations-bulk-finance').click()
    await page.waitForTimeout(700)
    say('OP.29 Anna, potem „ja”', { toast: await toasts(page), pliki: await file() })
    await undo('ja|mój|Finansuje|wydatek')
    say('OP.29 „ja” – Cofnij', { pliki: await file() })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.30 Cofnij zbiorczej po zmianie w międzyczasie', async () => {
  const r = await run('op-zaznaczone-cofnij')
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(400)
    const pick = ['DROGERIA NATURA', 'FRYZJER STYL', 'P4 SP', 'NETIA SA']
    for (const n of pick) await tick(page, n)
    const file = async () => (await ops(dataDir)).filter((t) => pick.some((p) => String(t.counterparty).startsWith(p)) && String(t.date).startsWith('2026-10')).map((t) => `${t.counterparty}: ${String(t.categoryId).slice(-4)} „${t.note}”`)
    const f0 = await file()
    await page.getByTestId('operations-bulk-category').selectOption({ label: 'Prezenty i inne · inne' })
    await page.getByTestId('operations-bulk-apply').click()
    const t0 = Date.now()
    await page.waitForTimeout(300)
    // Quickly: one category by hand, another one's note.
    await page.getByTestId('operation-row').filter({ hasText: 'FRYZJER STYL' }).first().click()
    await page.getByTestId('operation-category').selectOption({ label: 'Osobiste · fryzjer' })
    await page.getByTestId('operation-row').filter({ hasText: 'NETIA SA' }).first().click()
    await page.getByTestId('operation-note').fill('notatka w międzyczasie')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(300)
    const undo = page.getByRole('status').filter({ hasText: 'Prezenty' }).getByRole('button', { name: 'Cofnij' }).first()
    say('OP.30 sekund od „Ustaw” do „Cofnij”', (Date.now() - t0) / 1000)
    await undo.click()
    await page.waitForTimeout(800)
    say('OP.30 wynik', { przed: f0, toast: await toasts(page), po: await file() })
    await snap(page, 'OP.30-cofnij')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.31 usuń zaznaczone z podglądem', async () => {
  const r = await run('op-zaznaczone-usun')
  const { page, app, dataDir, errors } = r
  try {
    const dock0 = await records(dataDir, 'dockings')
    const all = await ops(dataDir)
    const docked = all.filter((t) => dock0.some((d) => d.transactionId === t.id)).sort((a, b) => String(b.date).localeCompare(String(a.date)))
    say('OP.31 zadokowane operacje', docked.map((t) => `${t.date} ${t.counterparty} ${t.amount}`))
    const target = docked.find((t) => String(t.date).startsWith('2026-10'))!
    const br0 = await bridgeNumbers(page)
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(400)
    for (const n of ['DROGERIA NATURA', 'FRYZJER STYL', 'P4 SP']) await tick(page, n)
    await page.getByTestId('operation-row').filter({ hasText: String(target.counterparty) }).filter({ hasText: `${String(target.date).slice(8, 10)}.${String(target.date).slice(5, 7)}` }).first().getByTestId('operation-tick').check()
    say('OP.31 zaznaczone', await bulk(page))
    await page.getByTestId('operations-bulk-change').selectOption('delete')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    const prev = await opt(page.getByTestId('operations-bulk-effect'))
    say('OP.31 podgląd', prev)
    await snap(page, 'OP.31-podglad')
    reading('op', 'OP.31', `rok, usunięcie 3 wydatków 10.2026 + zadokowanego ${target.counterparty} ${target.date}`, { podglad: prev.replace(/\n/g, ' | ') })
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(1000)
    const t = await toasts(page)
    const br1 = await bridgeNumbers(page)
    say('OP.31 po usunięciu', { toast: t, dokowania: (await records(dataDir, 'dockings')).length, dokowaniaPrzed: dock0.length, mostekPrzed: br0, mostekPo: br1 })
    reading('op', 'OP.31', 'po usunięciu', { mostek: br1 })
    await goOps(page)
    await page.getByRole('status').filter({ hasText: 'Usunięto' }).getByRole('button', { name: 'Cofnij' }).first().click()
    await page.waitForTimeout(1000)
    say('OP.31 po „Cofnij”', { dokowania: (await records(dataDir, 'dockings')).length, operacja: (await ops(dataDir)).some((x) => x.id === target.id), dokowanieTej: (await records(dataDir, 'dockings')).some((d) => d.transactionId === target.id), mostek: await bridgeNumbers(page) })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.32 przenieś na konto, zmień rodzaj', async () => {
  const r = await run('op-zaznaczone-konto')
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(400)
    const names = ['ZABKA Z1234', 'Bar pod Lipą', 'Apteka']
    await page.getByTestId('operation-row').filter({ hasText: 'ZABKA Z1234' }).filter({ hasText: '26.10' }).getByTestId('operation-tick').check()
    await tick(page, 'Bar pod Lipą')
    await tick(page, APTEKA)
    say('OP.32 zaznaczone', await bulk(page))
    await page.getByTestId('operations-bulk-change').selectOption('account')
    await page.getByTestId('operations-bulk-account').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    const p1 = await opt(page.getByTestId('operations-bulk-effect'))
    say('OP.32 podgląd – konto', { podgląd: p1, potwierdzone: await opt(page.getByTestId('operations-bulk-confirmed')) })
    await snap(page, 'OP.32-podglad-konto')
    reading('op', 'OP.32', 'rok, 3 wydatki mBank (ZABKA 26.10, Bar pod Lipą 28.10, Apteka 30.10) → Portfel XTB', { podglad: p1.replace(/\n/g, ' | ') })
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(900)
    const acc = async () => (await ops(dataDir)).filter((t) => names.some((n) => t.counterparty === n) && String(t.date) >= '2026-10-26').map((t) => `${t.counterparty} ${t.date} ${String(t.accountId).slice(-1)} ${t.kind}`)
    say('OP.32 po przeniesieniu', { toast: await toasts(page), pliki: await acc(), sumy: (await sums(page)).split('\n').slice(-3) })
    await page.getByRole('status').filter({ hasText: /Przeniesiono|konto|Portfel/ }).getByRole('button', { name: 'Cofnij' }).first().click()
    await page.waitForTimeout(900)
    say('OP.32 po Cofnij', await acc())
    // 2 expenses → own transfer to Portfel XTB.
    const br0 = await bridgeNumbers(page)
    await goOps(page)
    await page.getByTestId('operations-prev-month').click().catch(() => undefined)
    await page.waitForTimeout(300)
    if (await page.locator('[data-testid="operation-tick"]:checked').count()) await page.getByTestId('operations-bulk-clear').click().catch(() => undefined)
    await tick(page, 'Bar pod Lipą')
    await tick(page, APTEKA)
    await page.getByTestId('operations-bulk-change').selectOption('kind')
    await page.getByTestId('operations-bulk-kind').selectOption('transfer')
    await page.getByTestId('operations-bulk-counter').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    const p2 = await opt(page.getByTestId('operations-bulk-effect'))
    say('OP.32 podgląd – przelew własny', p2)
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(900)
    const br1 = await bridgeNumbers(page)
    say('OP.32 po zmianie na przelew', { toast: await toasts(page), pliki: (await ops(dataDir)).filter((t) => ['Bar pod Lipą', 'Apteka'].includes(String(t.counterparty)) && String(t.date) >= '2026-10-28').map((t) => `${t.counterparty} ${t.kind} ${t.amount} → ${String(t.counterAccountId).slice(-1)} both=${t.bothSides}`), mostekPrzed: br0, mostekPo: br1 })
    reading('op', 'OP.32', 'rok, Bar pod Lipą 28.10 + Apteka 30.10 → przelew na Portfel XTB', { podglad: p2.replace(/\n/g, ' | '), mostek_przed: br0, mostek_po: br1 })
    await goOps(page)
    await page.getByRole('status').filter({ hasText: /rodzaj|Przelew/i }).getByRole('button', { name: 'Cofnij' }).first().click().catch(() => undefined)
    await page.waitForTimeout(800)
    // A docked one → expense.
    const dock = await records(dataDir, 'dockings')
    const docked = (await ops(dataDir)).find((t) => dock.some((d) => d.transactionId === t.id) && String(t.date).startsWith('2026-10'))!
    await page.getByTestId('operations-prev-month').click().catch(() => undefined)
    await page.waitForTimeout(300)
    if (await page.locator('[data-testid="operation-tick"]:checked').count()) await page.getByTestId('operations-bulk-clear').click().catch(() => undefined)
    await page.getByTestId('operation-row').filter({ hasText: String(docked.counterparty) }).filter({ hasText: `${String(docked.date).slice(8, 10)}.${String(docked.date).slice(5, 7)}` }).first().getByTestId('operation-tick').check()
    await tick(page, 'Bar pod Lipą')
    await page.getByTestId('operations-bulk-change').selectOption('kind')
    await page.getByTestId('operations-bulk-kind').selectOption('expense')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    say('OP.32 podgląd – zadokowana na wydatek', { operacja: `${docked.counterparty} ${docked.date}`, podgląd: await opt(page.getByTestId('operations-bulk-effect')) })
    await snap(page, 'OP.32-zadokowana')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.33 przesuń datę', async () => {
  const r = await run('op-zaznaczone-data', (d) =>
    addRecords(d, 'transactions', [{ date: '2026-10-30', accountId: WALLET, kind: 'transfer', counterparty: 'Przelew do gotówki', amount: -15000, counterAccountId: CASH, bothSides: true, counterDate: '2026-10-31' }])
  )
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(400)
    await tick(page, 'Lody Grycan')
    await tick(page, APTEKA)
    await tick(page, 'Przelew do gotówki')
    const file = async () => (await ops(dataDir)).filter((t) => ['Lody Grycan', 'Apteka', 'Przelew do gotówki'].includes(String(t.counterparty)) && String(t.date) >= '2026-10-29').map((t) => `${t.counterparty} ${t.date}${t.counterDate ? ` / druga strona ${t.counterDate}` : ''}`)
    say('OP.33 przed', await file())
    await page.getByTestId('operations-bulk-change').selectOption('shift')
    say('OP.33 dymek pola dni', await opt(page.getByTestId('operations-bulk-days'), 'title'))
    await page.getByTestId('operations-bulk-days').fill('2')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    const p = await opt(page.getByTestId('operations-bulk-effect'))
    say('OP.33 podgląd +2', p)
    await snap(page, 'OP.33-podglad')
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(900)
    say('OP.33 po +2', { toast: await toasts(page), pliki: await file() })
    await page.getByTestId('operations-next-month').click()
    await page.waitForTimeout(400)
    for (const n of ["Lody Grycan", APTEKA, "Przelew do gotówki"]) await tick(page, n).catch(() => undefined)
    await page.getByTestId('operations-bulk-change').selectOption('shift')
    await page.getByTestId('operations-bulk-days').fill('-2')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    say('OP.33 podgląd −2', await opt(page.getByTestId('operations-bulk-effect')))
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(900)
    say('OP.33 po −2', { toast: await toasts(page), pliki: await file() })
    await page.getByRole('status').filter({ hasText: 'Przesunięto' }).getByRole('button', { name: 'Cofnij' }).first().click()
    await page.waitForTimeout(800)
    say('OP.33 po Cofnij (−2)', await file())
    void shown
    say('errors', errors)
  } finally {
    await app.close()
  }
})
