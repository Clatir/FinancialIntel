// DW, przebieg 10 (DW.26, DW.27, DW.29): misja bieżącego tygodnia W45 podmieniona ręcznie w game/2026-11.json (szablon
// „Pełna energia”, „Dzień bez wydatków”, „Łączność z bazą”, „Inwentaryzacja”, „Rozliczenie z domownikami”) na kopiach
// „rok”; czynności kapitana i odczyt „Na razie …”. Do tego treść misji w Dowództwie, odprawie i Raporcie wachty (DW.26).
// Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { importDone } from '../e2e/app'
import { answerDialogs, reading, shot, start, text, useState } from './lab'
import { MAREK, briefing, cat, deleteOpen, editJson, go, goOps, openOp, out, quickExpense, quickWindow, textOf, todayLine } from './dw-pomoc'

function mission(dataDir: string, template: string): void {
  editJson(join(dataDir, 'game', '2026-11.json'), (g) => {
    g.missions = g.missions.map((m: { week: string }) => (m.week === '2026-W45' ? { ...m, template, params: {} } : m))
  })
}

async function status(page: Page): Promise<string> {
  await go(page, '8', 'page-command')
  return `${(await textOf(page.getByTestId('command-mission'))).replace(/\s*\n\s*/g, ' | ')} || ${(await textOf(page.getByTestId('command-today'))).replace(/\s*\n\s*/g, ' | ')}`
}

async function importFile(page: Page, app: Parameters<typeof answerDialogs>[0], userData: string, file: string): Promise<string> {
  await go(page, '3', 'page-import')
  await answerDialogs(app, { paths: [`C:\\FI-audyt\\pliki\\${file}`] })
  await page.getByTestId('import-pick').click()
  await page.getByTestId('import-file').waitFor({ state: 'visible', timeout: 60_000 })
  await page.getByTestId('import-run').click()
  await importDone(page, userData)
  return (await text(page, '[data-testid="import-done"]')).replace(/\s+/g, ' ').slice(0, 200)
}

test('DW.26 – treść misji w trzech miejscach (rok)', async () => {
  const RUN = 'dw-10a'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    s.odprawa = (await briefing(r.page)).filter((x) => x.includes('mission'))
    s.dowodztwo = await textOf(r.page.getByTestId('page-command').or(r.page.locator('body')).first()).then(async () => {
      await go(r.page, '8', 'page-command')
      return textOf(r.page.getByTestId('command-mission'))
    })
    await go(r.page, '0', 'page-reports')
    await r.page.getByText('Raport wachty', { exact: true }).first().click()
    await r.page.waitForTimeout(800)
    s.raportPoprzedni = (await text(r.page, '[data-testid="page-reports"]')).split('MISJA TYGODNIA')[1]?.split('\n').slice(0, 4).join(' | ')
    await r.page.getByText('później ›').first().click()
    await r.page.waitForTimeout(800)
    const t = await text(r.page, '[data-testid="page-reports"]')
    s.raportBiezacy = `${t.split('\n').find((l) => l.startsWith('RAPORT WACHTY'))} | ${t.split('MISJA TYGODNIA')[1]?.split('\n').slice(0, 4).join(' | ')}`
    await shot(r.page, 'DW.26-raport-wachty')
    dump('kroki', s)
    reading('dw', 'DW.26', 'rok', { odprawa: JSON.stringify(s.odprawa), dowodztwo: String(s.dowodztwo).replace(/\s+/g, ' '), raport: String(s.raportBiezacy) })
  } finally {
    await r.app.close()
  }
})

test('DW.27 – „Pełna energia” po przekroczeniu przydziału', async () => {
  const RUN = 'dw-10b'
  const st = useState('rok', RUN)
  mission(st.dataDir, 'energy')
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    s.przed = await status(r.page)
    s.wpis = await quickExpense(r.app, r.page, { amount: '100', name: 'Sklep DW27', category: cat(101), time: '10:00' })
    s.po = await status(r.page)
    await shot(r.page, 'DW.27-pelna-energia')
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})

test('DW.27 / DW.29 – „Dzień bez wydatków”', async () => {
  const RUN = 'dw-10c'
  const st = useState('rok', RUN)
  mission(st.dataDir, 'nospend')
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, prefs: { notify: { eveningTime: '00:00' } } })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    s.zMokka = await status(r.page)
    await goOps(r.page)
    await openOp(r.page, 'Mokka', /03\.11/)
    s.usuniecie = await deleteOpen(r.page)
    s.bezWydatkow = await status(r.page)
    await shot(r.page, 'DW.27-dzien-bez-wydatkow')
    await goOps(r.page)
    s.raportWieczorny = await textOf(r.page.getByTestId('evening-report'))
    if (await r.page.getByTestId('evening-nospend').count()) {
      await r.page.getByTestId('evening-nospend').click()
      await r.page.waitForTimeout(800)
    }
    s.poPotwierdzeniu = await status(r.page)
    s.wydatek = await quickExpense(r.app, r.page, { amount: '5', name: 'Guma DW', category: cat(103), time: '10:00' })
    s.poWydatku = await status(r.page)
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})

test('DW.29 – „Łączność z bazą” (2 importy)', async () => {
  const RUN = 'dw-10d'
  const st = useState('rok', RUN)
  mission(st.dataDir, 'import')
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    s.przed = await status(r.page)
    s.import1 = await importFile(r.page, r.app, r.userData, 'rok-nowe-lista.csv')
    s.po1 = await status(r.page)
    s.import2 = await importFile(r.page, r.app, r.userData, 'rok-nowe-historia.csv')
    s.po2 = await status(r.page)
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})

test('DW.29 – „Inwentaryzacja” (salda wszystkich kont)', async () => {
  const RUN = 'dw-10e'
  const st = useState('rok', RUN)
  mission(st.dataDir, 'balances')
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    s.przed = await status(page)
    s.import = await importFile(page, r.app, r.userData, 'rok-nowe-historia.csv')
    s.poImporcie = await status(page)
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(800)
    await page.getByText('Konta', { exact: true }).first().click()
    await page.waitForTimeout(800)
    for (const name of ['Portfel XTB', 'Gotówka']) {
      const row = page.locator(`[data-testid="account-row"][data-name="${name}"]`)
      const bal = (await textOf(row.getByTestId('account-balance'))).replace(/[^\d,−-]/g, '').replace('−', '-')
      const f = row.getByTestId('account-confirm-amount')
      await f.click()
      await f.fill(bal)
      await f.press('Tab')
      await row.getByTestId('account-confirm').click()
      await page.waitForTimeout(800)
      if (await page.getByTestId('confirm-ask-yes').count()) await page.getByTestId('confirm-ask-yes').click()
      s[`potwierdzenie-${name}`] = { saldo: bal, wiersz: (await row.innerText()).replace(/\s+/g, ' ').slice(0, 200) }
      s[`po-${name}`] = await status(page)
      await page.keyboard.press('Control+,')
      await page.waitForTimeout(500)
      await page.getByText('Konta', { exact: true }).first().click()
      await page.waitForTimeout(500)
    }
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})

test('DW.29 – „Rozliczenie z domownikami” (wpłata Marka)', async () => {
  const RUN = 'dw-10f'
  const st = useState('rok', RUN)
  mission(st.dataDir, 'house')
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    s.przed = await status(r.page)
    const q = await quickWindow(r.app, r.page)
    await q.getByRole('radio', { name: 'Wpływ' }).click().catch(async () => q.getByText('Wpływ', { exact: true }).first().click())
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('100')
    await q.getByTestId('quick-counterparty').fill('Marek')
    await q.getByTestId('quick-payer').selectOption(MAREK)
    s.formularz = (await textOf(q.getByTestId('quick-entry'))).replace(/\s+/g, ' ').slice(0, 400)
    await q.getByTestId('quick-amount').press('Enter')
    await r.page.waitForTimeout(1500)
    s.po = await status(r.page)
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})
