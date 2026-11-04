/** ME.1, OP.1 (pusty folder), ME.3, ME.5, ME.8, ME.10 – Meldunki do rozpatrzenia. */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { seedFolder, zl } from '../e2e/seed'
import { answerDialogs, LAB, reading, start } from './lab'
import { addRecords, CASH, editorText, editSettings, enrich, goInbox, goOps, MAREK, MBANK, openOp, opt, periodAll, rows, run, say, shown, snap, step, sums, text, toasts, transfers, WALLET } from './op-pomoc'

const items = async (page: Page) => (await page.getByTestId('inbox-item').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
const menuBadge = async (page: Page) => (await page.locator('nav').innerText()).split('\n').slice(-10).join(' ')
const visiblePages = async (page: Page) => page.locator('[data-testid^="page-"]').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getAttribute('data-testid')))
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.json') ? [join(dir, e.name)] : []))

test('ME.1 i OP.1 – pusta skrzynka, pusty folder, przed startem budżetu', async () => {
  // „start”: the budget started today, two openings (Gotówka without one), no operation.
  const startDir = join(LAB, 'przebiegi', 'me-start', 'dane')
  rmSync(startDir, { recursive: true, force: true })
  seedFolder(startDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start: '2026-11-03' } }),
    records: {
      balances: [
        { date: '2026-11-03', accountId: MBANK, kind: 'opening', amount: zl(5000) },
        { date: '2026-11-03', accountId: WALLET, kind: 'opening', amount: zl(1000) }
      ],
      months: [{ month: '2026-11', salary: zl(6000), envelopes: {} }]
    }
  })
  let r = await start('me-start', { dataDir: startDir })
  r.page.setDefaultTimeout(15_000)
  try {
    const { page } = r
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(4000)
    await goInbox(page)
    say('ME.1 start – skrzynka', { tekst: await text(page, '[data-testid="page-inbox"]'), menu: await menuBadge(page) })
    await snap(page, 'ME.1-pusta')
    await goOps(page)
    say('OP.1 start – Operacje', { lista: await text(page, '[data-testid="operations-list"]'), szczegóły: (await text(page, '[data-testid="page-operations"]')).split('\n').slice(-3), sumy: await sums(page) })
    say('OP.2 konto bez salda otwarcia – dymek', await page.getByTestId('operations-sums').locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} ⟶ ${e.getAttribute('title')}`)))
    await snap(page, 'OP.1-pusta-lista')
    say('errors', r.errors)
  } finally {
    await r.app.close()
  }
  // „pusty”: a folder chosen, the budget not started; a sync copy of a record, an old expense with no category, an
  // opening of 2025 never confirmed.
  const emptyDir = join(LAB, 'przebiegi', 'me-pusty', 'dane')
  rmSync(emptyDir, { recursive: true, force: true })
  seedFolder(emptyDir, {
    records: {
      balances: [{ date: '2025-06-01', accountId: MBANK, kind: 'opening', amount: zl(3000) }],
      transactions: [{ date: '2025-06-10', accountId: MBANK, amount: -zl(45), counterparty: 'Stary zakup bez kategorii' }]
    }
  })
  const tx = walk(join(emptyDir, 'transactions'))[0]!
  const rec = JSON.parse(readFileSync(tx, 'utf8'))
  writeFileSync(tx.replace(/\.json$/, '-LAPTOP-KAPITANA.json'), `${JSON.stringify({ ...rec, amount: -zl(54), updatedAt: '2026-01-02T00:00:00.000Z', updatedBy: 'LAPTOP-KAPITANA' }, null, 2)}\n`)
  r = await start('me-pusty', { dataDir: emptyDir })
  r.page.setDefaultTimeout(15_000)
  try {
    const { page } = r
    await page.waitForTimeout(6000)
    say('ME.1 pusty – ekran po starcie', { strony: await visiblePages(page), baner: (await text(page)).split('\n').filter((l) => /Budżet|Konflikt|Pliki|kreator/i.test(l)).slice(0, 6) })
    await page.keyboard.press('Control+Shift+M')
    await page.waitForTimeout(800)
    say('ME.1 pusty – Meldunki', { strony: await visiblePages(page), tekst: await opt(page.getByTestId('page-inbox')), menu: await menuBadge(page) })
    await snap(page, 'ME.1-przed-startem')
    say('errors', r.errors)
  } finally {
    await r.app.close()
  }
})

/** „rok+meldunki” (ME.3): „rok+op”, transfers of before 1.7.0 (Portfel XTB never confirmed), two corrections of one
 * balance from two computers, a broken file, a member's repayment not assigned. */
function inboxAll(d: string): void {
  enrich(d)
  transfers(d, false)
  addRecords(d, 'transactions', [
    { date: '2026-10-27', accountId: MBANK, kind: 'correction', counterparty: 'Korekta salda', amount: 1500, updatedBy: 'LAPTOP-KAPITANA' },
    { date: '2026-10-29', accountId: MBANK, kind: 'correction', counterparty: 'Korekta salda', amount: 1500, updatedBy: 'PC-STACJONARNY' },
    { date: '2026-10-26', accountId: WALLET, kind: 'income', counterparty: 'Marek – zwrot', amount: 5000, memberId: MAREK, inflowKind: 'repay', covers: [] }
  ])
  mkdirSync(join(d, 'transactions', '2026'), { recursive: true })
  writeFileSync(join(d, 'transactions', '2026', '2026-10-15_01KQPAZ0000000000000000001.json'), '{ "zepsuty": ')
}

test('ME.3 kolejność sekcji i przyciski', async () => {
  const r = await run('me-sekcje', inboxAll)
  const { page, app, errors } = r
  try {
    await page.waitForTimeout(12000)
    await goInbox(page)
    await page.waitForTimeout(3500)
    const t = await text(page, '[data-testid="page-inbox"]')
    say('ME.3 skrzynka', t)
    await snap(page, 'ME.3-skrzynka')
    const n = await page.getByTestId('inbox-item').count()
    const out: string[] = []
    for (let i = 0; i < n; i++) {
      await step(`meldunek ${i}`, async () => {
        await goInbox(page)
        await page.waitForTimeout(300)
        const it = page.getByTestId('inbox-item').nth(i)
        if (!(await it.count())) return
        const label = (await it.innerText()).replace(/\s+/g, ' ').slice(0, 90)
        const btn = it.getByTestId('inbox-open')
        if (!(await btn.count())) {
          out.push(`${label} → (brak przycisku inbox-open; przyciski: ${(await it.getByRole('button').allInnerTexts()).join(' | ')})`)
          return
        }
        await btn.click()
        await page.waitForTimeout(800)
        const dialogs = await page.locator('[role="dialog"]').allInnerTexts()
        const pages = await visiblePages(page)
        const extra = pages.includes('page-operations') ? ` · lista: ${(await sums(page)).split('\n')[0]} · okres ${await text(page, '[data-testid="operations-period"]')} · edytor: ${await page.getByTestId('operation-counterparty').inputValue().catch(() => '-')}` : pages.includes('page-settings') ? ` · zakładka: ${await opt(page.locator('[data-testid^="settings-tab-"][aria-selected="true"], [data-testid^="settings-tab-"].text-accent'))}` : ''
        out.push(`${label} → ${pages.join(',')}${dialogs.length ? ` · okno: ${dialogs.map((d) => d.replace(/\s+/g, ' ').slice(0, 100)).join(' / ')}` : ''}${extra}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      })
    }
    say('ME.3 przyciski', out)
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('ME.5 możliwe duplikaty', async () => {
  const r = await run('me-duplikaty', enrich)
  const { app, page, errors } = r
  try {
    await page.waitForTimeout(12000)
    await goInbox(page)
    await page.waitForTimeout(3500)
    const dup = page.getByTestId('inbox-item').filter({ hasText: /duplikat/ })
    say('ME.5 meldunek', await opt(dup))
    await goOps(page)
    say('ME.5 nad listą Operacji', await opt(page.getByTestId('operations-duplicates')))
    await goInbox(page)
    await dup.getByTestId('inbox-open').click()
    await page.waitForTimeout(1500)
    const imp = await text(page, '[data-testid="page-import"]').catch(() => '(brak ekranu Import)')
    const i = imp.indexOf('Duplikat')
    say('ME.5 Import bez pliku – panel', imp.slice(Math.max(0, i - 50), i + 1200))
    await snap(page, 'ME.5-import-bez-pliku')
    // A file open in Import.
    await answerDialogs(app, { paths: [join(LAB, 'pliki', 'rok-nowe-lista.csv')] })
    await page.getByTestId('import-pick').click()
    await page.waitForTimeout(2500)
    say('ME.5 plik otwarty', await opt(page.getByTestId('import-file')))
    await goInbox(page)
    await page.getByTestId('inbox-item').filter({ hasText: /duplikat/ }).getByTestId('inbox-open').click()
    await page.waitForTimeout(1200)
    say('ME.5 przy otwartym pliku – notka', { notka: await opt(page.getByTestId('import-duplicates-note')), strony: await visiblePages(page) })
    await snap(page, 'ME.5-import-z-plikiem')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('ME.8 nieznane sygnały', async () => {
  const name = 'me-sygnaly'
  const r = await run(name, enrich)
  let { page, app } = r
  const errors = [...r.errors]
  try {
    await page.waitForTimeout(3000)
    const bridge = (await text(page, '[data-testid="page-bridge"]')).split('\n').filter((l) => /zwykle|średniej|Nowy kontrahent|Dwa obciążenia|nietypow/i.test(l))
    say('ME.8 odprawa na Mostku', bridge)
    await goInbox(page)
    const sig = async () => (await items(page)).filter((t) => /zwykle|średniej|Nowy kontrahent|Dwa obciążenia/.test(t))
    say('ME.8 sekcja Nieznane sygnały', await sig())
    reading('op', 'ME.8', 'rok+op', { sygnaly: (await sig()).join(' | ') })
    await snap(page, 'ME.8-sygnaly')
    // „to w porządku” in Meldunki for the new counterparty.
    await page.getByTestId('inbox-item').filter({ hasText: 'SALON ROWEROWY' }).getByTestId('inbox-anomaly-ok').click()
    await page.waitForTimeout(600)
    say('ME.8 „to w porządku” w Meldunkach', { toast: await toasts(page), sygnały: await sig() })
    // The editor's box for the Żabka purchase, its „To w porządku”.
    await goOps(page)
    await openOp(page, 'zabka z1234', /95,00/)
    say('ME.8 edytor – ramka', await opt(page.getByTestId('operation-anomaly')))
    await page.getByTestId('operation-anomaly-ok').click()
    await page.waitForTimeout(600)
    say('ME.8 „To w porządku” w edytorze', { toast: await toasts(page), ramka: await shown(page.getByTestId('operation-anomaly')) })
    await page.getByRole('status').filter({ hasText: 'Zapamiętane' }).getByRole('button', { name: 'Cofnij' }).first().click().catch(() => undefined)
    await page.waitForTimeout(600)
    say('ME.8 po Cofnij – ramka', await shown(page.getByTestId('operation-anomaly')))
    await page.getByTestId('operation-anomaly-ok').click().catch(() => undefined)
    await page.waitForTimeout(400)
    // The filter „nietypowa”.
    await search(page, '')
    await page.getByTestId('operations-marks').click()
    await page.getByTestId('operations-marks-anomaly').check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('ME.8 filtr „nietypowa”', { licznik: (await sums(page)).split('\n')[0], wiersze: (await rows(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).slice(0, 20) })
    // The two charges of BOLT.EU never in the duplicates' panel.
    await page.keyboard.press('Control+3')
    await page.waitForTimeout(1500)
    const imp = await text(page, '[data-testid="page-import"]').catch(() => '')
    say('ME.8 panel duplikatów – BOLT?', { bolt: imp.split('\n').filter((l) => /BOLT/i.test(l)), duplikaty: imp.split('\n').filter((l) => /ROSSMANN|KEBAB|SKYCASH/i.test(l)).slice(0, 6) })
    await app.close()
    const r2 = await start(name, { dataDir: r.dataDir, ictjDir: join(r.dir, 'ictj'), fresh: false })
    r2.page.setDefaultTimeout(15_000)
    page = r2.page
    app = r2.app
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await goInbox(page)
    await page.waitForTimeout(1000)
    say('ME.8 po ponownym uruchomieniu', await sig())
    errors.push(...r2.errors)
    say('errors', errors)
  } finally {
    await app.close()
  }
})

/** „rok+salda” (ME.10): mBank confirmed 31 days before D0, a second bank account 29 days before, an archived account. */
function balancesState(d: string): void {
  const balDir = join(d, 'balances')
  let mbank = 0
  for (const f of walk(balDir)) {
    const b = JSON.parse(readFileSync(f, 'utf8'))
    if (b.kind === 'confirmation' && b.accountId === MBANK) rmSync(f)
    else if (b.kind === 'opening' && b.accountId === MBANK) mbank += b.amount
  }
  for (const f of walk(join(d, 'transactions'))) {
    const x = JSON.parse(readFileSync(f, 'utf8'))
    if (x.date > '2026-10-03') continue
    if (x.accountId === MBANK) mbank += x.amount
    if (x.counterAccountId === MBANK && x.bothSides) mbank -= x.amount
  }
  const SAVINGS = '01KQPAACC00000000000000001'
  const OLD = '01KQPAACC00000000000000002'
  editSettings(d, (s) => {
    s.accounts.push({ id: SAVINGS, name: 'Konto oszczędnościowe', kind: 'bank', importFormat: null, archived: false })
    s.accounts.push({ id: OLD, name: 'Stare konto', kind: 'bank', importFormat: null, archived: true })
  })
  addRecords(d, 'balances', [
    { date: '2026-10-03', accountId: MBANK, kind: 'confirmation', amount: mbank },
    { date: '2025-09-01', accountId: SAVINGS, kind: 'opening', amount: zl(10000) },
    { date: '2026-10-05', accountId: SAVINGS, kind: 'confirmation', amount: zl(10000) },
    { date: '2025-09-01', accountId: OLD, kind: 'opening', amount: zl(500) }
  ])
  void CASH
}

test('ME.10 salda kont do potwierdzenia', async () => {
  const r = await run('me-salda', balancesState)
  const { page, app, errors } = r
  try {
    await goInbox(page)
    const bal = async () => (await items(page)).filter((t) => /saldo|Saldo/.test(t))
    say('ME.10 sekcja Salda kont', { linie: await bal(), wszystkie: await items(page) })
    await snap(page, 'ME.10-salda')
    await page.getByTestId('inbox-item').filter({ hasText: /^mBank/ }).getByTestId('inbox-open').click()
    await page.waitForTimeout(800)
    say('ME.10 „Potwierdź saldo” prowadzi do', { strony: await visiblePages(page), zakładki: await page.locator('[data-testid^="settings-tab-"]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText}${/accent|selected/.test(e.className) || e.getAttribute('aria-selected') === 'true' ? ' [x]' : ''}`)) })
    const row = page.locator('[data-testid="account-row"][data-name="mBank"]')
    const balance = (await row.getByTestId('account-balance').innerText()).replace(/\s*zł/, '')
    const f = row.getByTestId('account-confirm-amount')
    await f.click()
    await f.fill(balance)
    await f.press('Enter')
    await row.getByTestId('account-confirm').click()
    await page.waitForTimeout(800)
    if (await shown(row.getByTestId('confirm-ask'))) {
      say('ME.10 pytanie przy potwierdzeniu', await opt(row.getByTestId('confirm-ask')))
      await row.getByTestId('confirm-ask-yes').click().catch(() => undefined)
    }
    say('ME.10 potwierdzone mBank', { saldo: balance, toast: await toasts(page) })
    await goInbox(page)
    say('ME.10 po potwierdzeniu mBanku', await bal())
    say('errors', errors)
  } finally {
    await app.close()
  }
})

// (helpers used above)
async function search(page: Page, q: string) {
  await page.getByTestId('operations-search').fill(q)
  await page.waitForTimeout(400)
}
void periodAll
void editorText
