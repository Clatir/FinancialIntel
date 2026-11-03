/** Dopowiedzenia: ME.1 (folder przed startem budżetu, bez salda otwarcia). */
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { seedFolder, zl } from '../e2e/seed'
import { LAB, start } from './lab'
import { addRecords, editorText, enrich, goInbox, goOps, MAREK, MBANK, opt, periodAll, rows, run, say, search, shown, snap, sums, text, WALLET } from './op-pomoc'

const count = async (page: Page) => (await sums(page)).split(String.fromCharCode(10))[0]!
const rowList = async (page: Page, n = 40) => (await rows(page).allInnerTexts()).slice(0, n).map((t) => t.replace(/\s+/g, ' '))

const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.json') ? [join(dir, e.name)] : []))

test('ME.1 folder przed startem budżetu – bez salda otwarcia', async () => {
  const dir = join(LAB, 'przebiegi', 'me-pusty-2', 'dane')
  rmSync(dir, { recursive: true, force: true })
  seedFolder(dir, { records: { transactions: [{ date: '2025-06-10', accountId: MBANK, amount: -zl(45), counterparty: 'Stary zakup bez kategorii' }] } })
  const tx = walk(join(dir, 'transactions'))[0]!
  const rec = JSON.parse(readFileSync(tx, 'utf8'))
  writeFileSync(tx.replace(/\.json$/, '-LAPTOP-KAPITANA.json'), `${JSON.stringify({ ...rec, amount: -zl(54), updatedAt: '2026-01-02T00:00:00.000Z', updatedBy: 'LAPTOP-KAPITANA' }, null, 2)}\n`)
  const r = await start('me-pusty-2', { dataDir: dir })
  r.page.setDefaultTimeout(15_000)
  try {
    const { page } = r
    await page.waitForTimeout(6000)
    say('ME.1 baner', (await text(page)).split('\n').filter((l) => /Budżet|Konflikt|Pliki|kreator/i.test(l)).slice(0, 6))
    await goInbox(page)
    say('ME.1 Meldunki przed startem budżetu', { tekst: await opt(page.getByTestId('page-inbox')), menu: (await page.locator('nav').innerText()).split('\n').slice(-10).join(' ') })
    await snap(page, 'ME.1-przed-startem-bez-salda')
    say('errors', r.errors)
  } finally {
    await r.app.close()
  }
})

test('OP.10 widok z okresem z innego miesiąca; OP.11 okres w filtrze komputera i wejście z Mostka', async () => {
  const name = 'op-widoki-3'
  const r = await run(name, enrich)
  let { page, app } = r
  const errors = [...r.errors]
  const st = async () => ({ okres: await text(page, '[data-testid="operations-period"]'), konto: (await page.getByTestId('operations-accounts').innerText()).replace(/\s+/g, ' '), oznaczenia: (await page.getByTestId('operations-marks').innerText()).replace(/\s+/g, ' '), licznik: await count(page), mójFiltr: await shown(page.getByTestId('operations-stored-filter')) })
  try {
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(300)
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.getByTestId('operations-view-save').click()
    await page.getByTestId('operations-view-name').fill('Październik')
    await page.getByTestId('operations-view-period').check()
    await page.getByTestId('operations-view-confirm').click()
    await page.waitForTimeout(500)
    await page.getByTestId('operations-prev-month').click()
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(300)
    say('OP.10 przed klikiem widoku z okresem', await st())
    await page.getByTestId('operations-view-apply').filter({ hasText: 'Październik' }).click()
    await page.waitForTimeout(400)
    say('OP.10 po kliknięciu widoku z okresem', await st())
    // OP.11: the period in this computer's filter.
    await page.getByTestId('operations-clear').click()
    await periodAll(page)
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${MBANK}`).check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('OP.11 własny filtr: cała historia + mBank', await st())
    await app.close()
    const r2 = await start(name, { dataDir: r.dataDir, ictjDir: join(r.dir, 'ictj'), fresh: false })
    r2.page.setDefaultTimeout(15_000)
    page = r2.page
    app = r2.app
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await goOps(page)
    say('OP.11 po ponownym uruchomieniu', await st())
    await goInbox(page)
    await page.getByTestId('inbox-item').filter({ hasText: /bez kategorii/ }).getByTestId('inbox-open').click()
    await page.waitForTimeout(500)
    say('OP.11 z Meldunków', await st())
    await page.getByTestId('operations-stored-filter').click()
    await page.waitForTimeout(400)
    say('OP.11 „mój filtr” po widoku z Meldunków', await st())
    // From the bridge: the line of Marek's purchases.
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    await page.getByTestId('page-bridge').getByRole('button', { name: /Marek: do oddania/ }).click()
    await page.waitForTimeout(700)
    say('OP.11 z Mostka (Marek: do oddania)', { ekran: (await shown(page.getByTestId('page-operations'))) ? 'Operacje' : 'inny', ...(await shown(page.getByTestId('page-operations')) ? await st() : {}) })
    if (await shown(page.getByTestId('operations-stored-filter'))) {
      await page.getByTestId('operations-stored-filter').click()
      await page.waitForTimeout(400)
      say('OP.11 z Mostka → „mój filtr”', await st())
    }
    await snap(page, 'OP.11-z-mostka')
    errors.push(...r2.errors)
    say('errors', errors)
  } finally {
    await app.close()
  }
})


test('OP.24 / OP.6 częściowo oddany zakup (5 z 10 zł do oddania)', async () => {
  const r = await run('op-czesciowo-2', (d) => {
    enrich(d)
    const walk2 = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk2(join(dir, e.name)) : e.name.endsWith('.json') ? [join(dir, e.name)] : []))
    const target = walk2(join(d, 'transactions')).map((f) => JSON.parse(readFileSync(f, 'utf8'))).find((x) => x.counterparty === 'Zakup dla Marka')
    addRecords(d, 'transactions', [{ date: '2026-10-26', accountId: WALLET, kind: 'income', counterparty: 'Marek oddaje część', amount: 500, memberId: MAREK, inflowKind: 'repay', covers: [target.id] }])
  })
  const { page: p, app, errors } = r
  try {
    await goOps(p)
    await periodAll(p)
    await search(p, 'zakup dla marka')
    say('OP.24 wiersz po oddaniu 5 zł', await rowList(p, 3))
    await rows(p).first().click()
    await p.waitForTimeout(300)
    say('OP.24 edytor', (await editorText(p)).split(String.fromCharCode(10)).filter((l) => /oddan|Marek/.test(l)))
    await search(p, '')
    await p.getByTestId('operations-marks').click()
    await p.getByTestId('operations-marks-partlyRepaid').check()
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
    say('OP.6 filtr „częściowo oddane”', { licznik: await count(p), wiersze: await rowList(p, 5) })
    await snap(p, 'OP.24-czesciowo-2')
    say('errors', errors)
  } finally {
    await app.close()
  }
})
