/** US.2 – US.6: nazwa okrętu, konta, saldo otwarcia, kategorie (state rok, copy). Observation only. */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, start } from './lab'
import { PL, dataDirOf, fiOf, goSettings, quickWin, run, say, snap, step, text, toasts, typed } from './us-pomoc'

const N = 'us-konta'

test('US.2 nazwa okrętu', async () => {
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'general')
    const f = page.getByTestId('ship-name-input')
    say('US.2 domyślna', { value: await f.inputValue(), menu: await text(page, '[data-testid="menu-ship-name"]') })
    await typed(page, f, PL)
    say('US.2 po zmianie', { value: await f.inputValue(), menu: await text(page, '[data-testid="menu-ship-name"]'), fi: fiOf(N).settings.shipName, toasts: await toasts(page) })
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    say('US.2 Mostek', (await text(page, '[data-testid="page-bridge"]')).slice(0, 120))
    await snap(page, 'US.2-mostek')
    const forty = (PL + ' ' + PL + ' ' + PL).slice(0, 40)
    await goSettings(page, 'general')
    await typed(page, f, forty)
    const m = page.getByTestId('menu-ship-name')
    say('US.2 40 znaków', { value: await f.inputValue(), len: (await f.inputValue()).length, menu: await m.innerText(), scroll: await m.evaluate((e) => [e.scrollWidth, e.clientWidth, getComputedStyle(e).textOverflow]) })
    await snap(page, 'US.2-40')
    const fortyOne = (forty + 'Ź').slice(0, 41)
    await typed(page, f, fortyOne, null)
    say('US.2 41 znaków (wpisane)', { len: (await f.inputValue()).length, value: await f.inputValue() })
    await f.press('Enter')
    await page.waitForTimeout(400)
    say('US.2 po Enter', { fi: fiOf(N).settings.shipName, toasts: await toasts(page) })
    await typed(page, f, '')
    say('US.2 pusta', { value: await f.inputValue(), toasts: await toasts(page), fi: fiOf(N).settings.shipName })
    await snap(page, 'US.2-pusta')
    await f.click()
    await f.press('Control+a')
    await f.pressSequentially('NOWA-ESC')
    await f.press('Escape')
    await page.waitForTimeout(400)
    say('US.2 Esc', { value: await f.inputValue(), settingsStill: await page.getByTestId('settings-tab-general').count(), fi: fiOf(N).settings.shipName })
    // Esc with no draft = back to the previous screen
    await f.press('Escape').catch(() => undefined)
    await page.waitForTimeout(400)
    say('US.2 drugi Esc', { settingsTab: await page.getByTestId('settings-tab-general').count() })
    // Back to the 40-character name for the laptop check.
    await goSettings(page, 'general')
    await typed(page, f, PL)
  } finally {
    await app.close()
  }
  const l = await start('us-konta-laptop', { dataDir: dataDirOf(N), machine: 'LAPTOP' })
  try {
    await l.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    say('US.2 LAPTOP menu', await text(l.page, '[data-testid="menu-ship-name"]'))
  } finally {
    await l.app.close()
  }
})

test('US.3 konta', async () => {
  const r = await run(N + '3')
  const { app, page } = r
  try {
    await goSettings(page, 'accounts')
    const rows = page.getByTestId('account-row')
    const n0 = await rows.count()
    await page.getByTestId('account-add').click()
    await page.waitForTimeout(500)
    const row = rows.nth(n0)
    say('US.3 nowy wiersz', (await row.innerText()).replace(/\n/g, ' | '))
    await typed(page, row.getByTestId('account-name'), 'Konto oszczędnościowe')
    await row.getByLabel('Rodzaj konta').selectOption('bank')
    await row.locator('input[type=checkbox]').first().check()
    await page.waitForTimeout(500)
    say('US.3 po edycji', { fi: fiOf(N + '3').settings.accounts.map((a: any) => [a.name, a.kind, a.importFormat, a.archived]) })
    // duplicate, empty
    await typed(page, row.getByTestId('account-name'), 'mbank')
    say('US.3 duplikat', { toasts: await toasts(page), value: await row.getByTestId('account-name').inputValue() })
    await typed(page, row.getByTestId('account-name'), '')
    say('US.3 pusta', { toasts: await toasts(page) })
    await snap(page, 'US.3-konto')
    // the new account in the quick entry
    const q = await quickWin(app, page)
    say('US.3 szybki wpis – konta', await q.getByTestId('quick-account').locator('option').allInnerTexts())
    await q.close().catch(() => undefined)
    // editor
    await page.keyboard.press('Control+n')
    await page.waitForTimeout(1200)
    say('US.3 edytor – selecty', await page.locator('[data-testid="operation-editor"] select').evaluateAll((els) => els.map((e) => [...(e as HTMLSelectElement).options].map((o) => o.text).join(' / '))))
    // archive the account with operations (mBank)
    await goSettings(page, 'accounts')
    const mb = page.getByTestId('account-row').filter({ hasText: 'mBank' }).first()
    const bal0 = await page.getByTestId('account-balance').allInnerTexts()
    await mb.getByText('archiwum').click()
    await page.waitForTimeout(600)
    const bal1 = await page.getByTestId('account-balance').allInnerTexts()
    say('US.3 archiwum mBank – salda przed/po', { bal0, bal1 })
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(900)
    say('US.3 Mostek po archiwum', (await text(page, '[data-testid="page-bridge"]')).slice(0, 1400))
    await snap(page, 'US.3-archiwum-mostek')
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(1200)
    say('US.3 Operacje po archiwum', (await page.getByTestId('operation-row').first().innerText()).replace(/\n/g, ' | '))
    const q2 = await quickWin(app, page)
    say('US.3 szybki wpis po archiwum', await q2.getByTestId('quick-account').locator('option').allInnerTexts())
    await q2.close().catch(() => undefined)
    await goSettings(page, 'accounts')
    await page.getByTestId('account-row').filter({ hasText: 'mBank' }).first().getByText('archiwum').click()
    await page.waitForTimeout(500)
    say('US.3 przywrócone – salda', await page.getByTestId('account-balance').allInnerTexts())
    const q3 = await quickWin(app, page)
    say('US.3 szybki wpis po przywróceniu', await q3.getByTestId('quick-account').locator('option').allInnerTexts())
  } finally {
    await app.close()
  }
})

function accountSum(dataDir: string, accountId: string, from: string): number {
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.json') ? [join(d, e.name)] : []))
  let s = 0
  for (const f of walk(join(dataDir, 'transactions'))) {
    const x = JSON.parse(readFileSync(f, 'utf8'))
    if (x.date < from) continue
    if (x.accountId === accountId) s += x.amount
    if (x.counterAccountId === accountId && x.bothSides) s -= x.amount
  }
  return s
}

test('US.4 saldo otwarcia', async () => {
  const N4 = N + '4'
  const r = await run(N4)
  const { app, page } = r
  try {
    await goSettings(page, 'accounts')
    const row = page.getByTestId('account-row').first()
    const accId = fiOf(N4).settings.accounts[0].id
    const rd = async (label: string) => {
      const o = {
        label,
        amount: await row.getByTestId('account-opening').inputValue(),
        date: await row.getByTestId('account-opening-date').inputValue(),
        balance: await row.getByTestId('account-balance').innerText()
      }
      say('US.4 ' + label, o)
      return o
    }
    await rd('początek')
    say('US.4 pliki salda otwarcia', JSON.stringify(Object.values(JSON.parse(JSON.stringify([]))) ))
    await typed(page, row.getByTestId('account-opening-date'), '24.10.2026')
    const o1 = await rd('data 24.10.2026')
    say('US.4 suma operacji konta od 2026-10-24', accountSum(dataDirOf(N4), accId, '2026-10-24'))
    reading('us', 'US.4', 'rok', { opening: o1.amount, date: o1.date, balance: o1.balance, opsSince: accountSum(dataDirOf(N4), accId, '2026-10-24') / 100 })
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(900)
    say('US.4 Mostek po zmianie daty', (await text(page, '[data-testid="page-bridge"]')).slice(0, 700))
    await goSettings(page, 'accounts')
    await typed(page, row.getByTestId('account-opening-date'), '04.11.2026')
    say('US.4 jutro', { toasts: await toasts(page), date: await row.getByTestId('account-opening-date').inputValue() })
    await snap(page, 'US.4-jutro')
    await typed(page, row.getByTestId('account-opening'), '-500')
    const o2 = await rd('otwarcie -500')
    reading('us', 'US.4', 'rok', { opening: o2.amount, balance: o2.balance, opsSince: accountSum(dataDirOf(N4), accId, '2026-10-24') / 100 })
    await typed(page, row.getByTestId('account-opening'), '1000')
    await rd('otwarcie 1000')
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(900)
    say('US.4 Mostek po zmianie kwoty', (await text(page, '[data-testid="page-bridge"]')).slice(0, 700))
    await goSettings(page, 'accounts')
    await row.getByRole('button', { name: /historia/i }).click()
    await page.waitForTimeout(800)
    say('US.4 historia', (await text(page, '[role="dialog"]').catch(() => text(page, 'body'))).slice(0, 1500))
    await snap(page, 'US.4-historia')
  } finally {
    await app.close()
  }
})

test('US.5 – US.6 kategorie', async () => {
  const N5 = N + '5'
  const r = await run(N5)
  const { app, page } = r
  try {
    await goSettings(page, 'categories')
    const cat = (name: string) => page.getByTestId('category-row').filter({ has: page.locator(`[data-name="${name}"]`) }).first()
    const byName = (name: string) => page.locator(`[data-testid="category-row"][data-name="${name}"]`)
    const bridge = async () => {
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(900)
      const t = await text(page, '[data-testid="page-bridge"]')
      const i = t.search(/ENERGIA DZI/i)
      await goSettings(page, 'categories')
      return t.slice(i, i + 160).replace(/\n/g, ' ')
    }
    say('US.5 energia przed', await bridge())
    await typed(page, byName('Jedzenie').getByTestId('category-name'), 'Jedzenie i picie')
    say('US.5 po zmianie nazwy', { fi: fiOf(N5).settings.categories.filter((c: any) => /Jedzenie/.test(c.name)).map((c: any) => c.name), rows: await page.getByTestId('category-name').evaluateAll((e) => e.map((x) => (x as HTMLInputElement).value)) })
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(1500)
    say('US.5 Operacje – pierwszy wiersz Jedzenie', (await page.getByTestId('operation-row').filter({ hasText: /Jedzenie/ }).first().innerText()).replace(/\n/g, ' | '))
    await goSettings(page, 'categories')
    // new subcategory + duplicate + empty
    await byName('Jedzenie i picie').getByTestId('category-add-sub').click()
    await page.waitForTimeout(400)
    const sub = byName('Jedzenie i picie').getByTestId('subcategory').last()
    say('US.5 podkategoria nowa', await sub.getAttribute('data-name'))
    await typed(page, sub.locator('input'), 'kawa i przekąski')
    say('US.5 podkategoria duplikat', await toasts(page))
    await typed(page, byName('Osobiste').getByTestId('category-name'), 'jedzenie i picie')
    say('US.5 duplikat kategorii', await toasts(page))
    await typed(page, byName('Osobiste').getByTestId('category-name'), '')
    say('US.5 pusta kategoria', await toasts(page))
    // envelope switch
    const rh = byName('Rozrywka i hobby')
    for (const label of ['codzienna', 'planowa', 'bez koperty']) {
      await rh.getByRole('button', { name: label, exact: true }).click().catch(async () => rh.getByText(label, { exact: true }).click())
      await page.waitForTimeout(500)
      say(`US.5 koperta ${label}`, { fi: fiOf(N5).settings.categories.find((c: any) => c.name === 'Rozrywka i hobby').envelope, energia: await bridge() })
    }
    await rh.getByText('codzienna', { exact: true }).click()
    await page.waitForTimeout(400)
    // all mains not daily
    const mains = await page.getByTestId('category-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')))
    for (const m of mains) {
      const seg = byName(m!).getByText('planowa', { exact: true })
      if (await seg.count()) await seg.click()
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(500)
    say('US.5 bez żadnej codziennej', { warn: await text(page, '[data-testid="categories-no-daily-warning"]').catch(() => '(brak ostrzeżenia)'), energia: await bridge() })
    await snap(page, 'US.5-ostrzezenie')
    // --- US.6
    await goSettings(page, 'categories')
    await page.getByTestId('category-add').click()
    await page.waitForTimeout(400)
    const nowa = byName('Nowa kategoria')
    await typed(page, nowa.getByTestId('category-name'), 'Testowa')
    await byName('Testowa').getByTestId('category-add-sub').click()
    await page.waitForTimeout(400)
    say('US.6 Testowa + podkategoria', (await byName('Testowa').innerText()).replace(/\n/g, ' | '))
    await snap(page, 'US.6-testowa')
    // is there any delete control?
    say('US.6 przyciski w wierszu Testowa', await byName('Testowa').locator('button').evaluateAll((els) => els.map((e) => `${e.textContent?.trim()}|${e.getAttribute('title') ?? ''}`)))
    await byName('Testowa').getByTestId('subcategory').first().locator('button').click()
    await page.waitForTimeout(400)
    say('US.6 po × na podkategorii', { sub: (await byName('Testowa').innerText()).replace(/\n/g, ' | '), toasts: await toasts(page) })
    await byName('Testowa').getByTestId('category-archive').click()
    await page.waitForTimeout(500)
    say('US.6 po archiwizuj Testowej', { rows: await page.getByTestId('category-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')).slice(-3)), toasts: await toasts(page) })
    // used category with an envelope in the plan
    await byName('Dom').getByTestId('category-archive').click()
    await page.waitForTimeout(600)
    const t6 = await toasts(page)
    say('US.6 archiwizacja Dom (używana)', { toasts: t6, energia: await bridge() })
    await snap(page, 'US.6-dom-toast')
    const undo = page.getByTestId('toast-action')
    if (await undo.count()) {
      await undo.first().click()
      await page.waitForTimeout(600)
      say('US.6 po Cofnij', { fi: fiOf(N5).settings.categories.find((c: any) => c.name === 'Dom').archived, energia: await bridge() })
    }
    // subcategory of a used main: archive and look for undo
    await byName('Dom').getByTestId('subcategory').first().locator('button').click()
    await page.waitForTimeout(500)
    say('US.6 archiwizacja podkategorii – toasty', await toasts(page))
  } finally {
    await app.close()
  }
  const r2 = await (await import('./us-pomoc')).restart(N5)
  try {
    await goSettings(r2.page, 'categories')
    say('US.6 po restarcie – wiersze', await r2.page.getByTestId('category-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-name') + (e.className.includes('opacity') ? ' [arch]' : ''))))
  } finally {
    await r2.app.close()
  }
})
