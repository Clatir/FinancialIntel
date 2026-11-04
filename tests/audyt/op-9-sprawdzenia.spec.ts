/** Dopowiedzenia i powtórzenia: OP.23, OP.27, OP.39, OP.10, OP.11, OP.26, OP.24/OP.6, OP.31 – na świeżych kopiach. */
import { readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { records } from '../e2e/files'
import { reading, start } from './lab'
import { addRecords, ANNA, editorText, enrich, goInbox, goOps, ID, MAREK, MBANK, openOp, ops, opt, periodAll, rows, run, say, search, shown, snap, step, sums, text, toasts, TR, transfers, typeIn, WALLET } from './op-pomoc'

const count = async (page: Page) => (await sums(page)).split('\n')[0]!
const rowList = async (page: Page, n = 40) => (await rows(page).allInnerTexts()).slice(0, n).map((t) => t.replace(/\s+/g, ' '))
async function bridgeText(page: Page): Promise<string[]> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(900)
  return (await text(page, '[data-testid="page-bridge"]')).split('\n').filter((l) => l.trim())
}

test('OP.23 opis ostatniej części po usunięciu przedostatniej', async () => {
  const r = await run('op-czesci-2', enrich)
  const { page, app, dataDir, errors } = r
  try {
    await goOps(page)
    await openOp(page, 'carrefour')
    await page.getByTestId('split-tags-open').nth(1).click()
    await page.getByTestId('split-tags-input').first().fill('elektronika')
    await page.getByTestId('split-tags-input').first().press('Enter')
    await page.waitForTimeout(500)
    const f = async () => {
      const t = (await ops(dataDir)).find((x) => x.id === ID.carrefour)!
      return { splits: (t.splits as any[]).map((s) => `${s.amount}/${s.categoryId ? String(s.categoryId).slice(-4) : null}/„${s.note}”/${JSON.stringify(s.tags ?? [])}`), note: t.note, tags: t.tags, categoryId: t.categoryId }
    }
    say('OP.23 przed (2 części z opisami, tag w drugiej)', await f())
    await page.getByTestId('split-line').nth(0).getByTitle('Usuń część').click()
    await page.waitForTimeout(600)
    say('OP.23 po usunięciu przedostatniej (zostaje jedna)', { plik: await f(), notatkaEdytora: await page.getByTestId('operation-note').inputValue(), tagi: await page.getByTestId('operation-tags-chip').evaluateAll((els) => els.map((e) => e.getAttribute('data-tag'))) })
    await snap(page, 'OP.23-po-usunieciu')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.27 filtr Tag łapie oba zapisy', async () => {
  const r = await run('op-tagi-2', enrich)
  const { page, app, errors } = r
  try {
    await goOps(page)
    await periodAll(page)
    await page.getByTestId('operations-more').click()
    say('OP.27 pozycje Tag', await page.locator('[data-testid^="operations-more-tag-"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')} :: ${(e.parentElement as HTMLElement).innerText}`)))
    await page.locator('[data-testid="operations-more-tag-wakacje"]').check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    say('OP.27 filtr Tag „Wakacje”', { licznik: await count(page), wiersze: await rowList(page, 6) })
    await snap(page, 'OP.27-filtr-tag')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

async function saveTo(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: p })) as typeof dialog.showSaveDialog
  }, path)
}

test('OP.39 powtórzenie – suma pliku a pasek, Excel', async () => {
  const r = await run('op-eksport-2', enrich)
  const { page, app, errors } = r
  try {
    await goOps(page)
    await periodAll(page)
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    await page.getByTestId('operations-sort-amount').click()
    await page.waitForTimeout(500)
    const bar = (await sums(page)).split('\n').slice(0, 4)
    const csv = 'C:\\FI-audyt\\eksport\\op-portfel-2.csv'
    await saveTo(app, csv)
    await page.getByTestId('operations-export-csv').click()
    await page.waitForTimeout(2500)
    const xlsx = 'C:\\FI-audyt\\eksport\\op-portfel-2.xlsx'
    await saveTo(app, xlsx)
    await page.getByTestId('operations-export-xlsx').click()
    await page.waitForTimeout(3000)
    const py = `
import csv,io,zipfile,re
t=open(r'${csv}',encoding='utf-8-sig').read()
rows=list(csv.reader(io.StringIO(t),delimiter=';'))
h=rows[0];d=rows[1:];k=h.index('Kwota (zł)')
v=[round(float(r[k].replace(',','.'))*100) for r in d]
print('CSV wierszy',len(d),'suma',sum(v),'plus',sum(x for x in v if x>0),'minus',sum(x for x in v if x<0))
print('CSV przelewy',[(r[2],r[3],r[4]) for r in d if r[3]=='Przelew własny'])
z=zipfile.ZipFile(r'${xlsx}');w=z.read('xl/worksheets/sheet1.xml').decode('utf8')
cells=re.findall(r'<c r="([A-Z]+)(\\d+)"([^>]*)>(.*?)</c>',w)
amount=[c for c in cells if c[0]=='E' and c[1]!='1']
num=[c for c in amount if 't="inlineStr"' not in c[2]]
print('XLSX komórek kwoty',len(amount),'liczbowych',len(num),'przykład',amount[:2])
vals=[round(float(re.search(r'<v>(.*?)</v>',c[3]).group(1))*100) for c in num]
print('XLSX suma',sum(vals))
print('XLSX polskie znaki', [m for m in re.findall(r'<t[^>]*>([^<]*[ŁłŻżŚśĄąĘęÓóĆćŃńŹź][^<]*)</t>',w)][:6])
`
    const out = execFileSync('python', ['-c', py], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    say('OP.39 pasek', bar)
    say('OP.39 pliki', out)
    reading('op', 'OP.39', 'rok+op, Portfel XTB, cała historia (powtórzenie)', { pasek: bar.join(' | '), pliki: out.replace(/\n/g, ' | ') })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.10 widok z okresem z innego miesiąca; OP.11 okres w filtrze komputera i wejście z Mostka', async () => {
  const name = 'op-widoki-2'
  const r = await run(name, enrich)
  let { page, app } = r
  const errors = [...r.errors]
  const st = async () => ({ okres: await text(page, '[data-testid="operations-period"]'), konto: (await page.getByTestId('operations-accounts').innerText()).replace(/\s+/g, ' '), oznaczenia: (await page.getByTestId('operations-marks').innerText()).replace(/\s+/g, ' '), licznik: await count(page), mójFiltr: await shown(page.getByTestId('operations-stored-filter')) })
  try {
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
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

test('OP.26 zakup domownika nocą z wpisem w dzienniku', async () => {
  const r = await run('op-noc-2')
  const { page, app, errors } = r
  try {
    await goOps(page)
    await page.getByTestId('operation-new').click()
    await typeIn(page, 'operation-amount', '60', 'Tab')
    await page.getByTestId('operation-account').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operation-counterparty').fill('Noc domownik')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · zakupy spożywcze' })
    await page.getByTestId('operation-financer').selectOption(`pay:${ANNA}`)
    const tf = page.getByTestId('operation-time')
    await tf.click()
    await tf.fill('23:30')
    await tf.press('Tab')
    await page.waitForTimeout(400)
    await page.getByTestId('operation-log').fill('kupione dla Anny')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(500)
    say('OP.26 zakup domownika 23:30 z wpisem', { status: await opt(page.getByTestId('operation-night-status')), notka: await opt(page.getByTestId('operation-night-confirm')), wiersz: (await rows(page).allInnerTexts()).filter((t) => /Noc domownik/.test(t)).map((t) => t.replace(/\s+/g, ' ')) })
    await snap(page, 'OP.26-domownik-noc')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.24 / OP.6 częściowo oddany zakup', async () => {
  const r = await run('op-czesciowo', (d) => {
    enrich(d)
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.json') ? [join(dir, e.name)] : []))
    const target = walk(join(d, 'transactions')).map((f) => JSON.parse(readFileSync(f, 'utf8'))).find((x) => x.counterparty === 'Zakup dla Marka')
    addRecords(d, 'transactions', [{ date: '2026-10-26', accountId: WALLET, kind: 'income', counterparty: 'Marek oddaje część', amount: 3000, memberId: MAREK, inflowKind: 'repay', covers: [target.id] }])
  })
  const { page: p, app, errors } = r
  try {
    await goOps(p)
    await periodAll(p)
    await search(p, 'zakup dla marka')
    say('OP.24 wiersz po oddaniu 30 z 70 zł', await rowList(p, 3))
    await rows(p).first().click()
    await p.waitForTimeout(300)
    say('OP.24 edytor', (await editorText(p)).split(/\n/).filter((l) => /oddan|Marek/.test(l)))
    await search(p, '')
    await p.getByTestId('operations-marks').click()
    await p.getByTestId('operations-marks-partlyRepaid').check()
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
    say('OP.6 filtr „częściowo oddane”', { licznik: await count(p), wiersze: await rowList(p, 5) })
    await snap(p, 'OP.24-czesciowo')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.31 podgląd usunięcia a Mostek', async () => {
  const r = await run('op-zaznaczone-usun-2')
  const { page, app, dataDir, errors } = r
  try {
    const before = await bridgeText(page)
    say('OP.31 Mostek przed (pełny tekst)', before.slice(0, 70))
    const dock = await records(dataDir, 'dockings')
    const docked = (await ops(dataDir)).find((t) => dock.some((d) => d.transactionId === t.id) && String(t.date) === '2026-10-20')!
    await goOps(page)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(400)
    for (const n of ['DROGERIA NATURA', 'FRYZJER STYL', 'P4 SP']) await page.getByTestId('operation-row').filter({ hasText: n }).first().getByTestId('operation-tick').check()
    await page.getByTestId('operation-row').filter({ hasText: String(docked.counterparty) }).filter({ hasText: '20.10' }).first().getByTestId('operation-tick').check()
    await page.getByTestId('operations-bulk-change').selectOption('delete')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    say('OP.31 podgląd', await opt(page.getByTestId('operations-bulk-effect')))
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(1000)
    const after = await bridgeText(page)
    const diff = after.filter((l) => !before.includes(l))
    say('OP.31 Mostek – linie zmienione po usunięciu', diff.slice(0, 40))
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('ME.6 „Cofnij” połączenia par', async () => {
  const r = await run('me-pary-cofnij', (d) => transfers(d))
  const { page, app, dataDir, errors } = r
  try {
    const files = async () => (await ops(dataDir)).filter((t) => [TR.p1m, TR.p1w, TR.p4g, TR.p4w].includes(String(t.id))).map((t) => `${t.counterparty} both=${t.bothSides ?? ''} cd=${t.counterDate ?? ''}`)
    await goInbox(page)
    await page.getByTestId('inbox-item').filter({ hasText: /dwie osobne/ }).getByTestId('inbox-open').click()
    await page.waitForTimeout(500)
    await page.getByTestId('inbox-pairs').locator('[data-testid="inbox-pair"][data-unnamed="1"]').getByTestId('inbox-pair-tick').uncheck()
    await page.getByTestId('inbox-pairs-join').click()
    await page.waitForTimeout(700)
    const joined = await files()
    await page.getByRole('status').filter({ hasText: 'Połączono' }).getByRole('button', { name: 'Cofnij' }).first().click()
    await page.waitForTimeout(800)
    say('ME.6 połączone → Cofnij', { połączone: joined, poCofnij: await files(), toast: await toasts(page) })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

async function october(page: Page): Promise<void> {
  await goOps(page)
  await page.getByTestId('operations-period-menu').click()
  await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
  await page.getByTestId('operations-prev-month').click()
  await page.waitForTimeout(500)
  if (await page.locator('[data-testid="operation-tick"]:checked').count()) await page.getByTestId('operations-bulk-clear').click().catch(() => undefined)
}
const tickRow = async (page: Page, ...has: string[]) => {
  let row = page.getByTestId('operation-row')
  for (const h of has) row = row.filter({ hasText: h })
  await row.first().getByTestId('operation-tick').check()
}

test('OP.32 zmiana rodzaju na przelew własny i operacja zadokowana', async () => {
  const r = await run('op-zaznaczone-rodzaj')
  const { page, app, dataDir, errors } = r
  try {
    const before = await bridgeText(page)
    await october(page)
    await tickRow(page, 'Bar pod Lipą')
    await tickRow(page, 'Apteka', 'mBank')
    await page.getByTestId('operations-bulk-change').selectOption('kind')
    await page.getByTestId('operations-bulk-kind').selectOption('transfer')
    await page.getByTestId('operations-bulk-counter').selectOption({ label: 'Portfel XTB' })
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    say('OP.32 podgląd', await opt(page.getByTestId('operations-bulk-effect')))
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(3000)
    const f = async () => (await ops(dataDir)).filter((t) => ['Bar pod Lipą', 'Apteka'].includes(String(t.counterparty)) && String(t.date) >= '2026-10-28').map((t) => `${t.counterparty} ${t.kind} ${t.amount} → ${t.counterAccountId ? String(t.counterAccountId).slice(-1) : '-'} both=${t.bothSides ?? '-'} upd=${t.updatedAt}`)
    say('OP.32 po zmianie (3 s)', { toast: await toasts(page), pliki: await f(), wiersze: (await rows(page).allInnerTexts()).filter((t) => /Bar pod Lipą|Apteka/.test(t)).map((t) => t.replace(/\s+/g, ' ')), salda: (await sums(page)).split('\n').slice(-3) })
    await snap(page, 'OP.32-po-zmianie-rodzaju')
    const after = await bridgeText(page)
    say('OP.32 Mostek – linie zmienione', after.filter((l) => !before.includes(l)).slice(0, 20))
    // A docked one → expense.
    const dock = await records(dataDir, 'dockings')
    const docked = (await ops(dataDir)).find((t) => dock.some((d) => d.transactionId === t.id) && String(t.date) === '2026-10-20')!
    await october(page)
    await tickRow(page, String(docked.counterparty), '20.10')
    await tickRow(page, 'FRYZJER STYL')
    await page.getByTestId('operations-bulk-change').selectOption('kind')
    await page.getByTestId('operations-bulk-kind').selectOption('expense')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    say('OP.32 podgląd – zadokowana + wydatek na „Wydatek”', await opt(page.getByTestId('operations-bulk-effect')))
    await page.getByTestId('operations-bulk-kind').selectOption('income')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    say('OP.32 podgląd – zadokowana + wydatek na „Wpływ”', await opt(page.getByTestId('operations-bulk-effect')))
    await snap(page, 'OP.32-zadokowana')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('OP.33 przesunięcie przez granicę miesiąca – podgląd i Cofnij', async () => {
  const r = await run('op-zaznaczone-data-2', (d) =>
    addRecords(d, 'transactions', [{ date: '2026-10-30', accountId: WALLET, kind: 'transfer', counterparty: 'Przelew do gotówki', amount: -15000, counterAccountId: '01KDEFACC00000000000000003', bothSides: true, counterDate: '2026-10-31' }])
  )
  const { page, app, dataDir, errors } = r
  try {
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(800)
    await october(page)
    await tickRow(page, 'Lody Grycan')
    await tickRow(page, 'Apteka', 'mBank')
    await tickRow(page, 'Przelew do gotówki')
    await page.getByTestId('operations-bulk-change').selectOption('shift')
    await page.getByTestId('operations-bulk-days').fill('2')
    await page.getByTestId('operations-bulk-preview').click()
    await page.waitForTimeout(600)
    say('OP.33 podgląd +2 (30.10 → 01.11)', await opt(page.getByTestId('operations-bulk-effect')))
    await page.getByTestId('operations-bulk-confirm').click()
    await page.waitForTimeout(800)
    const f = async () => (await ops(dataDir)).filter((t) => ['Lody Grycan', 'Apteka', 'Przelew do gotówki'].includes(String(t.counterparty)) && String(t.date) >= '2026-10-29').map((t) => `${t.counterparty} ${t.date}${t.counterDate ? ` / ${t.counterDate}` : ''}`)
    say('OP.33 po +2', await f())
    await page.getByRole('status').filter({ hasText: 'Przesunięto' }).getByRole('button', { name: 'Cofnij' }).first().click()
    await page.waitForTimeout(800)
    say('OP.33 po Cofnij', await f())
    // The month plan of October before and after the same move, to see what the preview left out.
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(800)
    say('OP.33 Plan miesiąca – nagłówek', (await text(page, 'main').catch(() => '')).split('\n').slice(0, 6))
    say('errors', errors)
  } finally {
    await app.close()
  }
})
