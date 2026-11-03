/** OP.18, OP.37, OP.38, OP.40, OP.42 – historia zmian, zwroty z importem, reguła tytułu, brzegi, tylko do odczytu. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { importDone } from '../e2e/app'
import { answerDialogs, LAB, reading, start } from './lab'
import { cp1250, historiaCsv, listaCsv, type BankEvent } from './persona'
import { addRecords, cat, editorText, editSettings, enrich, goInbox, goOps, ID, openOp, ops, opt, periodAll, rows, run, say, search, shown, snap, step, sums, text, toasts, typeIn, WALLET } from './op-pomoc'

const FILES = join(LAB, 'pliki', 'op')
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.json') ? [join(dir, e.name)] : []))
const rowList = async (page: Page, n = 20) => (await rows(page).allInnerTexts()).slice(0, n).map((t) => t.replace(/\s+/g, ' '))

async function importFile(page: Page, app: import('@playwright/test').ElectronApplication, userData: string, file: string): Promise<string> {
  await page.keyboard.press('Control+3')
  await page.getByTestId('page-import').waitFor()
  await answerDialogs(app, { paths: [file] })
  await page.getByTestId('import-pick').click()
  await page.waitForTimeout(2500)
  const summary = await text(page, '[data-testid="page-import"]')
  await page.getByTestId('import-run').click()
  await importDone(page, userData)
  return `${summary.slice(0, 1500)}\n--- wynik ---\n${await opt(page.getByTestId('import-done'))}`
}

test('OP.18 historia zmian (dwa komputery, folder tylko do odczytu)', async () => {
  const r = await run('op-historia')
  const dataDir = r.dataDir
  const ictjDir = join(r.dir, 'ictj')
  let { page, app } = r
  const errors = [...r.errors]
  try {
    await goOps(page)
    await openOp(page, 'lody grycan', '18.10')
    await typeIn(page, 'operation-amount', '26,03', 'Tab')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · na mieście' })
    await page.getByTestId('operation-note').fill('notatka z pierwszego komputera')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(800)
    await app.close()
    // The second computer changes it again.
    const r2 = await start('op-historia-pc2', { dataDir, ictjDir, machine: 'AUDYT-2' })
    r2.page.setDefaultTimeout(15_000)
    page = r2.page
    app = r2.app
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await goOps(page)
    await openOp(page, 'lody grycan', '18.10')
    await typeIn(page, 'operation-amount', '27,03', 'Tab')
    await page.getByTestId('operation-note').fill('notatka z drugiego komputera')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(800)
    await page.getByTestId('history-open').click()
    await page.waitForTimeout(800)
    const modal = page.locator('[role="dialog"]').last()
    say('OP.18 okno historii', await opt(modal))
    await snap(page, 'OP.18-historia')
    // The oldest version chosen.
    const versions = modal.locator('[data-testid^="history-version"], [data-testid="history-item"], li, button').filter({ hasText: /\d{1,2}\.\d{1,2}\.\d{4}|AUDYT|LAPTOP/ })
    say('OP.18 wersje', await versions.allInnerTexts())
    await versions.last().click().catch(() => undefined)
    await page.waitForTimeout(500)
    say('OP.18 różnice wybranej wersji', await opt(page.getByTestId('history-changes')))
    await snap(page, 'OP.18-roznice')
    const restore = page.getByRole('button', { name: /Przywróć tę wersję/ })
    if (await restore.count()) {
      await restore.first().click()
      await page.waitForTimeout(800)
      const t = (await ops(dataDir)).find((x) => x.date === '2026-10-18' && String(x.counterparty).startsWith('Lody'))
      say('OP.18 po przywróceniu', { toast: await toasts(page), plik: [t?.amount, t?.categoryId, t?.note] })
      await page.getByTestId('history-open').click()
      await page.waitForTimeout(600)
      say('OP.18 historia po przywróceniu', await opt(page.locator('[role="dialog"]').last()))
      await page.keyboard.press('Escape')
    } else say('OP.18 przycisk „Przywróć tę wersję”', '(brak)')
    errors.push(...r2.errors)
    await app.close()
    // The folder read-only (fi.json of a newer format): the history still to look at.
    const f = join(dataDir, 'fi.json')
    const fi = JSON.parse(readFileSync(f, 'utf8'))
    writeFileSync(f, `${JSON.stringify({ ...fi, schemaVersion: 2 }, null, 2)}\n`)
    const r3 = await start('op-historia-ro', { dataDir, ictjDir })
    r3.page.setDefaultTimeout(15_000)
    page = r3.page
    app = r3.app
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await goOps(page)
    await openOp(page, 'lody grycan', '18.10')
    say('OP.18 tylko do odczytu – przycisk Historia', { widoczny: await shown(page.getByTestId('history-open')), aktywny: await page.getByTestId('history-open').isEnabled().catch(() => false) })
    await page.getByTestId('history-open').click().catch(() => undefined)
    await page.waitForTimeout(600)
    say('OP.18 tylko do odczytu – okno', (await opt(page.locator('[role="dialog"]').last())).slice(0, 600))
    await snap(page, 'OP.18-tylko-do-odczytu')
    errors.push(...r3.errors)
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.37 zwrot w drodze zamknięty wpływem z importu i po terminie', async () => {
  mkdirSync(FILES, { recursive: true })
  const ev = (who: string, amount: number): BankEvent => ({ ref: who, date: '2026-11-02', op: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', title: 'ZWROT ZAMOWIENIA', who, acct: "'12 3456 0000 0000 0000 0000 0001'", amount })
  const file = join(FILES, 'op-L1-zwroty.csv')
  writeFileSync(file, cp1250(listaCsv([ev('ZALANDO', 23000), ev('EOBUWIE', 24900)], '2026-10-27', '2026-11-02')))
  const r = await run('op-zwrot-import', enrich)
  const { page, app, dataDir, errors } = r
  try {
    say('OP.37 import L1', await importFile(page, app, join(r.dir, 'userdata'), file))
    await goOps(page)
    await openOp(page, 'zalando', '25.10')
    say('OP.37 ZALANDO (A) – stan oczekiwania', { stan: await opt(page.getByTestId('operation-await-state')), plik: JSON.stringify((await ops(dataDir)).find((t) => t.id === ID.zalando)?.awaitReturn) })
    await snap(page, 'OP.37-zalando')
    await openOp(page, 'modivo', '08.10')
    say('OP.37 MODIVO (B) przed wpływem', await opt(page.getByTestId('operation-await-state')))
    // A hand-typed income of brand B, 85 zł (−15%).
    await page.getByTestId('operation-new').click()
    await page.locator('[role="radiogroup"][aria-label="Rodzaj operacji"] [role="radio"]', { hasText: 'Wpływ' }).click()
    await typeIn(page, 'operation-amount', '85', 'Tab')
    await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operation-counterparty').fill('MODIVO')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.waitForTimeout(800)
    await openOp(page, 'modivo', '08.10')
    say('OP.37 MODIVO (B) po wpływie 85 zł', { stan: await opt(page.getByTestId('operation-await-state')), plik: JSON.stringify((await ops(dataDir)).find((t) => t.id === ID.modivo)?.awaitReturn) })
    say('OP.37 EOBUWIE (C) – czy coś zamknął', (await ops(dataDir)).filter((t) => t.awaitReturn).map((t) => `${t.counterparty} ${JSON.stringify(t.awaitReturn)}`))
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(1000)
    say('OP.37 odprawa', (await text(page, '[data-testid="page-bridge"]')).split('\n').filter((l) => /zwrot|MODIVO|ZALANDO/i.test(l)))
    await goInbox(page)
    say('OP.37 Meldunki', (await page.getByTestId('inbox-item').allInnerTexts()).filter((t) => /zwrot|MODIVO|ZALANDO/i.test(t)).map((t) => t.replace(/\s+/g, ' ')))
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(1200)
    const radar = await text(page, 'main').catch(() => text(page))
    const i = radar.search(/Zwroty w drodze/i)
    say('OP.37 Radar', i >= 0 ? radar.slice(i, i + 600) : radar.split('\n').filter((l) => /zwrot|MODIVO|ZALANDO/i.test(l)))
    await snap(page, 'OP.37-radar')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.38 reguła dla tytułu', async () => {
  const r = await run('op-regula-tytulu', enrich)
  const { page, app, dataDir, errors } = r
  try {
    const f = async () => (await ops(dataDir)).filter((t) => t.title === 'obiad').map((t) => `${t.counterparty} ${t.date} ${t.kind} ${t.categoryId ? String(t.categoryId).slice(-4) : '-'}`)
    const rules = () => JSON.stringify(JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8')).settings.import.rules.filter((x: any) => /obiad/i.test(`${x.match} ${x.label}`)))
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(800)
    const env = async () => (await text(page, 'main').catch(() => '')).split('\n').map((l, i, a) => (/^Jedzenie$/.test(a[i - 3] ?? '') || /^Jedzenie$/.test(a[i - 2] ?? '') ? l : null)).filter(Boolean).join(' | ')
    const e0 = await env()
    await goOps(page)
    await openOp(page, 'piotr testowy', '31.10')
    const btn = page.getByTestId('operation-title-rule')
    say('OP.38 przycisk', await opt(btn))
    await btn.click()
    await page.waitForTimeout(400)
    const panel = page.getByTestId('operation-title-rule-panel')
    say('OP.38 panel', await opt(panel))
    await panel.getByRole('radio', { name: 'Zwrot / kategoria' }).click()
    await page.getByTestId('title-rule-category').selectOption({ label: 'Jedzenie · na mieście' })
    say('OP.38 „Tylko dla…”', await page.getByTestId('title-rule-only-counterparty').isChecked())
    await page.getByTestId('title-rule-update-history').check()
    await page.waitForTimeout(300)
    say('OP.38 podgląd', await opt(panel))
    await snap(page, 'OP.38-panel')
    const before = await f()
    await page.getByTestId('title-rule-apply-btn').click()
    await page.waitForTimeout(900)
    const after = await f()
    say('OP.38 po zapisie', { toast: await toasts(page), przed: before, po: after, reguły: rules() })
    await page.getByRole('status').filter({ hasText: /obiad/ }).getByRole('button', { name: 'Cofnij' }).first().click()
    await page.waitForTimeout(900)
    say('OP.38 po Cofnij', { pliki: await f(), reguły: rules() })
    // Again, kept; then a file with another „obiad” of the same person.
    await openOp(page, 'piotr testowy', '31.10')
    await page.getByTestId('operation-title-rule').click()
    await page.getByTestId('operation-title-rule-panel').getByRole('radio', { name: 'Zwrot / kategoria' }).click()
    await page.getByTestId('title-rule-category').selectOption({ label: 'Jedzenie · na mieście' })
    await page.getByTestId('title-rule-update-history').check()
    await page.getByTestId('title-rule-apply-btn').click()
    await page.waitForTimeout(900)
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(800)
    const e1 = await env()
    say('OP.38 koperta Jedzenie przed / po', { przed: e0, po: e1 })
    reading('op', 'OP.38', 'rok+op (6× „obiad” PIOTR TESTOWY po 35 zł → zwrot w Jedzenie · na mieście)', { koperta_przed: e0, koperta_po: e1 })
    mkdirSync(FILES, { recursive: true })
    const file = join(FILES, 'op-H-obiad.csv')
    const ev: BankEvent = { ref: 'obiad', date: '2026-11-03', op: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', title: 'obiad', who: 'PIOTR TESTOWY', acct: "'12 3456 0000 0000 0000 0000 0002'", amount: 3500 }
    writeFileSync(file, cp1250(historiaCsv([ev], '2026-11-03', '2026-11-03', 6_900_000).text))
    say('OP.38 import pliku z „obiad”', await importFile(page, app, join(r.dir, 'userdata'), file))
    say('OP.38 po imporcie', await f())
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.40 brzegi – duże kwoty, długa nazwa, 0 zł', async () => {
  const long = 'Przedsiębiorstwo Handlowo-Usługowe „Żółta Łódź” Śląsk – zażółć gęślą jaźń '.repeat(5).slice(0, 300)
  const r = await run('op-brzegi', (d) =>
    addRecords(d, 'transactions', [
      { date: '2026-11-02', accountId: WALLET, counterparty: 'Duży wydatek', amount: -123456789, categoryId: cat('0902') },
      { date: '2026-11-02', accountId: WALLET, kind: 'income', counterparty: 'Wielki wpływ', amount: 999999999 },
      { date: '2026-11-02', accountId: WALLET, counterparty: long, amount: -1234, categoryId: cat('0902') },
      { date: '2026-11-02', accountId: WALLET, counterparty: 'Zero złotych', amount: 0 }
    ])
  )
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    say('OP.40 pasek', (await sums(page)).split('\n'))
    say('OP.40 wiersze', await rowList(page, 10))
    const longRow = page.getByTestId('operation-row').filter({ hasText: 'Przedsiębiorstwo' })
    say('OP.40 długa nazwa – dymek i szerokość', await longRow.evaluate((r) => {
      const name = Array.from(r.querySelectorAll('span')).find((s) => (s as HTMLElement).innerText.startsWith('Przedsiębiorstwo')) as HTMLElement | undefined
      return { dymek: name?.getAttribute('title')?.length, szerokośćWiersza: (r as HTMLElement).scrollWidth, widocznaSzerokość: (r as HTMLElement).clientWidth, nazwaObcięta: name ? name.scrollWidth > name.clientWidth : null }
    }))
    const cells = await page.getByTestId('operation-amount-cell').evaluateAll((els) => els.map((e) => ({ t: (e as HTMLElement).innerText, obcięta: (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth })))
    say('OP.40 komórki kwot', cells.slice(0, 8))
    await snap(page, 'OP.40-lista')
    await openOp(page, 'duży wydatek')
    say('OP.40 edytor dużej kwoty', await page.getByTestId('operation-amount').inputValue())
    await openOp(page, 'zero złotych')
    say('OP.40 edytor 0 zł', (await editorText(page)).split('\n').slice(0, 12))
    await goInbox(page)
    say('OP.40 Meldunki – bez kategorii', (await page.getByTestId('inbox-item').allInnerTexts()).filter((t) => /bez kategorii/.test(t)))
    // A new one: 0 zł, a name of 301 characters.
    await goOps(page)
    await page.getByTestId('operation-new').click()
    await typeIn(page, 'operation-amount', '0', 'Tab')
    await page.getByTestId('operation-counterparty').fill(`${long}X`)
    const typed = await page.getByTestId('operation-counterparty').inputValue()
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-counterparty').click()
    await page.keyboard.type('Y')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.waitForTimeout(800)
    const zero = (await ops(dataDir)).filter((t) => t.amount === 0)
    say('OP.40 nowa 0 zł i 301 znaków', { pole: typed.length, zapisane: zero.map((t) => `${String(t.counterparty).length} znaków, kwota ${t.amount}`), wiersz: (await rowList(page, 3)), toast: await toasts(page) })
    // Export of the month.
    await app.evaluate(({ dialog }, p) => {
      dialog.showSaveDialog = (async () => ({ canceled: false, filePath: p })) as typeof dialog.showSaveDialog
    }, 'C:\\FI-audyt\\eksport\\op-brzegi.csv')
    await page.getByTestId('operations-export-csv').click()
    await page.waitForTimeout(2000)
    const csv = readFileSync('C:\\FI-audyt\\eksport\\op-brzegi.csv', 'utf8')
    say('OP.40 CSV', csv.split(/\r?\n/).filter((l) => /Duży|Wielki|Przedsiębiorstwo|Zero/.test(l)).map((l) => l.slice(0, 200)))
    reading('op', 'OP.40', 'rok + 4 operacje brzegowe 02.11', { pasek: (await sums(page)).split('\n').slice(0, 4).join(' | ') })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.42 folder tylko do odczytu i wpis nowszej wersji', async () => {
  // A record of a newer version: Lody Grycan 30.10 with schemaVersion 2.
  let newer = ''
  const r = await run('op-nowszy', (d) => {
    for (const f of walk(join(d, 'transactions'))) {
      const x = JSON.parse(readFileSync(f, 'utf8'))
      if (x.counterparty === 'Lody Grycan' && x.date === '2026-10-30') {
        writeFileSync(f, `${JSON.stringify({ ...x, schemaVersion: 2, nowePole: 'z wersji 2' }, null, 2)}\n`)
        newer = f
      }
    }
  })
  const { page, app, errors } = r
  const before = readFileSync(newer, 'utf8')
  try {
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(400)
    await page.getByTestId('operation-row').filter({ hasText: 'Lody Grycan' }).filter({ hasText: '30.10' }).first().click()
    await page.waitForTimeout(400)
    say('OP.42 wpis nowszej wersji – edytor', { tekst: (await editorText(page)).split('\n').slice(0, 6), poleKwoty: await page.getByTestId('operation-amount').isEditable().catch(() => false) })
    await snap(page, 'OP.42-nowszy')
    for (const n of ['Lody Grycan', 'Apteka']) await page.getByTestId('operation-row').filter({ hasText: n }).filter({ hasText: '30.10' }).first().getByTestId('operation-tick').check()
    await page.getByTestId('operations-bulk-change').selectOption('delete')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(500)
    say('OP.42 podgląd usunięcia', await opt(page.getByTestId('operations-bulk-effect')))
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(900)
    say('OP.42 po usunięciu', { toast: await toasts(page), plikNowszy: readFileSync(newer, 'utf8') === before ? 'bez zmian' : 'ZMIENIONY' })
    say('errors', errors)
  } finally {
    await app.close()
  }
  // The folder read-only.
  const r2 = await run('op-tylko-odczyt', (d) => editSettings(d, () => undefined))
  const f = join(r2.dataDir, 'fi.json')
  await r2.app.close()
  const fi = JSON.parse(readFileSync(f, 'utf8'))
  writeFileSync(f, `${JSON.stringify({ ...fi, schemaVersion: 2 }, null, 2)}\n`)
  const r3 = await start('op-tylko-odczyt', { dataDir: r2.dataDir, ictjDir: join(r2.dir, 'ictj'), fresh: false })
  r3.page.setDefaultTimeout(15_000)
  const p = r3.page
  try {
    await p.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await p.waitForTimeout(1500)
    say('OP.42 baner', (await text(p)).split('\n').filter((l) => /odczytu|format|Zaktualizuj/i.test(l)).slice(0, 4))
    await goOps(p)
    await p.getByTestId('operations-prev-month').click()
    await p.waitForTimeout(400)
    await p.getByTestId('operation-row').filter({ hasText: 'Lody Grycan' }).first().click()
    await p.waitForTimeout(300)
    say('OP.42 edytor', { kwotaEdytowalna: await p.getByTestId('operation-amount').isEditable().catch(() => false), kategoriaAktywna: await p.getByTestId('operation-category').isEnabled().catch(() => false), kosz: await shown(p.getByTestId('operation-delete')), historia: await shown(p.getByTestId('history-open')), nowa: await p.getByTestId('operation-new').isEnabled().catch(() => false) })
    for (const n of ['Lody Grycan', 'Apteka']) await p.getByTestId('operation-row').filter({ hasText: n }).first().getByTestId('operation-tick').check().catch(() => undefined)
    await p.waitForTimeout(300)
    say('OP.42 zaznaczanie i suma', { pasek: await opt(p.getByTestId('operations-bulk-count')), zmiany: await p.getByTestId('operations-bulk-change').isEnabled().catch(() => false), ustaw: await p.getByTestId('operations-bulk-apply').isEnabled().catch(() => false) })
    await p.getByTestId('operation-new').click().catch(() => undefined)
    await p.keyboard.press('Control+n')
    await p.waitForTimeout(500)
    say('OP.42 Nowa / Ctrl+N', { tytuł: await opt(p.getByTestId('operation-editor-title')), toast: await toasts(p) })
    await snap(p, 'OP.42-tylko-odczyt')
    say('errors', r3.errors)
  } finally {
    await r3.app.close()
  }
})

void periodAll
void search
void step
void enrich
