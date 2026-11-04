// W4 (AU-11, weryfikacja sceptyczna): odtworzenie znalezisk na wydanej aplikacji – WY.20 (symulator „teraz” a zasięg
// Mostka), RY.24 (przegląd roczny pierwszego roku), US.6 (usuwanie nieużywanej kategorii), US.32 (Esc w polu liczbowym),
// RE.5 (paragon dzielony w CSV), RE.15 (odwrócone daty eksportu), DW.29 (Inwentaryzacja po imporcie z saldem).
// Narzędzie obserwacji – teksty ekranów w C:\FI-audyt\przebiegi\w4-*\out, werdykty w docs/audyt/raport/WERYFIKACJA-4.md.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { importDone } from '../e2e/app'
import { answerDialogs, shot, start, text, useState, reading } from './lab'
import { editJson, go, out, textOf } from './dw-pomoc'
import { addRecords, answerSave, EXPORT, goReports, WALLET, cat, waitFile } from './re-pomoc'

const toasts = (page: Page): Promise<string[]> => page.getByRole('status').allInnerTexts().catch(() => [])
const fiOf = (dataDir: string) => JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8'))

async function settings(page: Page, tab: string): Promise<void> {
  if (!(await page.getByTestId('settings-tab-general').count())) await page.keyboard.press('Control+,')
  await page.getByTestId(`settings-tab-${tab}`).waitFor()
  await page.getByTestId(`settings-tab-${tab}`).click()
  await page.waitForTimeout(600)
}

test('W4 – rok: WY.20, RY.24, US.6, US.32', async () => {
  const RUN = 'w4-rok'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(6000)
    // ---- WY.20: zasięg Mostka a „teraz” symulatora
    const ship = await textOf(page.locator('section[data-panel="bridge:Stan okrętu"]'))
    dump('WY.20-mostek-stan-okretu', ship)
    await go(page, '9', 'page-intel')
    await page.waitForTimeout(2500)
    const m = page.getByTestId('intel-maneuver')
    const table = async () =>
      m.getByTestId('maneuver-result').locator('tr').evaluateAll((els) => els.map((e) => Array.from(e.querySelectorAll('td,th')).map((c) => (c as HTMLElement).innerText).join(' | ')))
    const w20: Record<string, unknown> = {
      mostekZasieg: ship.match(/ZASIĘG\n([^\n]+)/)?.[1],
      prognoza: await textOf(page.getByTestId('intel-range-text')),
      symulatorZasieg: await textOf(page.getByTestId('maneuver-range')),
      tabela: await table()
    }
    await m.scrollIntoViewIfNeeded()
    await shot(page, 'W4-WY.20-symulator')
    // Wartość spoza zakresu pisana z klawiatury (część poboczna znaleziska).
    await page.getByTestId('maneuver-costs').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('300')
    await page.waitForTimeout(500)
    w20.koszty300wPolu = { pole: await page.getByTestId('maneuver-costs').inputValue(), invalid: await page.getByTestId('maneuver-costs').getAttribute('aria-invalid'), zasieg: await textOf(page.getByTestId('maneuver-range')) }
    await page.keyboard.press('Tab')
    await page.waitForTimeout(500)
    w20.koszty300poWyjsciu = { pole: await page.getByTestId('maneuver-costs').inputValue(), zasieg: await textOf(page.getByTestId('maneuver-range')) }
    const clear = m.getByText('wyczyść manewr')
    if (await clear.count()) await clear.click()
    dump('WY.20', w20)
    reading('w4', 'WY.20', 'rok', { mostek: String(w20.mostekZasieg), prognoza: String(w20.prognoza), symulator: String(w20.symulatorZasieg) })

    // ---- RY.24: przegląd roczny 2025 i 2026
    await goReports(page, 'Przegląd roczny')
    const sel = page.getByTestId('reports-year').locator('select').first()
    const ry: Record<string, unknown> = { lata: await sel.evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.value)), domyslny: await sel.inputValue() }
    for (const y of ['2025', '2026']) {
      await sel.selectOption(y)
      await page.waitForTimeout(1200)
      ry[y] = await textOf(page.getByTestId('reports-year'))
      await shot(page, `W4-RY.24-${y}`)
    }
    dump('RY.24', ry)

    // ---- US.6: nowa kategoria „Testowa” z podkategorią – czy jest „usuń”
    await settings(page, 'categories')
    const byName = (n: string) => page.locator(`[data-testid="category-row"][data-name="${n}"]`)
    await page.getByTestId('category-add').click()
    await page.waitForTimeout(500)
    const nameF = byName('Nowa kategoria').getByTestId('category-name')
    await nameF.click()
    await nameF.press('Control+a')
    await nameF.pressSequentially('Testowa')
    await nameF.press('Enter')
    await page.waitForTimeout(600)
    await byName('Testowa').getByTestId('category-add-sub').click()
    await page.waitForTimeout(600)
    const us6: Record<string, unknown> = {
      wiersz: (await byName('Testowa').innerText()).replace(/\n/g, ' | '),
      przyciski: await byName('Testowa').locator('button').evaluateAll((els) => els.map((e) => `${(e.textContent ?? '').trim()}|${e.getAttribute('title') ?? ''}|${e.getAttribute('aria-label') ?? ''}|${e.getAttribute('data-testid') ?? ''}`)),
      opisZakladki: (await text(page, 'main')).split('\n').filter((l) => /usun|Usun|archiw/i.test(l)).slice(0, 6)
    }
    await shot(page, 'W4-US.6-testowa')
    // podkategoria „×”
    const sub = byName('Testowa').getByTestId('subcategory').first()
    us6.podkategoriaPrzyciski = await sub.locator('button').evaluateAll((els) => els.map((e) => `${(e.textContent ?? '').trim()}|${e.getAttribute('title') ?? ''}`))
    await sub.locator('button').first().click()
    await page.waitForTimeout(600)
    us6.poX = { wiersz: (await byName('Testowa').innerText()).replace(/\n/g, ' | '), toasty: await toasts(page), plik: fiOf(st.dataDir).settings.categories.find((c: { name: string }) => c.name === 'Testowa') }
    await byName('Testowa').getByTestId('category-archive').click()
    await page.waitForTimeout(800)
    us6.poArchiwizacji = {
      przyciski: await byName('Testowa').locator('button').evaluateAll((els) => els.map((e) => `${(e.textContent ?? '').trim()}|${e.getAttribute('title') ?? ''}`)),
      toasty: await toasts(page),
      plik: fiOf(st.dataDir).settings.categories.find((c: { name: string }) => c.name === 'Testowa')
    }
    // paleta
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('usuń kategor')
    await page.waitForTimeout(600)
    us6.paleta = (await textOf(page.getByTestId('palette'))).replace(/\n/g, ' | ').slice(0, 400)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    dump('US.6', us6)

    // ---- US.32: Esc w polu „Osłony – cel” i „Minimalne osłony”
    const us32: Record<string, unknown> = {}
    for (const [tid, val, read] of [
      ['layers-shields', '5', () => fiOf(st.dataDir).settings.layers.shieldSalaries],
      ['orders-min-shields', '2', () => fiOf(st.dataDir).settings.orders.minShieldSalaries]
    ] as const) {
      await settings(page, 'layers')
      const f = page.getByTestId(tid)
      const before = { pole: await f.inputValue(), plik: read() }
      await f.click()
      await f.press('Control+a')
      await f.pressSequentially(val)
      await f.press('Escape')
      await page.waitForTimeout(800)
      const afterEsc = { pole: await f.inputValue(), fokus: await f.evaluate((e) => document.activeElement === e), plik: read(), ekran: await page.getByTestId('settings-tab-general').count() }
      if (tid === 'layers-shields') await shot(page, 'W4-US.32-po-esc')
      await page.locator('main').click({ position: { x: 5, y: 5 } })
      await page.waitForTimeout(1000)
      us32[tid] = { before, afterEsc, poWyjsciu: { pole: await f.inputValue(), plik: read() } }
    }
    // Dla porównania: pole tekstowe (nazwa okrętu) – Esc
    await settings(page, 'general')
    dump('US.32', us32)
  } finally {
    await r.app.close()
  }
})

test('W4 – rok + paragon dzielony: RE.5, RE.15', async () => {
  const RUN = 'w4-re'
  const st = useState('rok', RUN)
  addRecords(st.dataDir, 'transactions', [
    {
      id: '01KW4RE5000000000000000001',
      accountId: WALLET,
      kind: 'expense',
      date: '2026-10-14',
      counterparty: 'Carrefour',
      amount: -13000,
      note: '',
      splits: [
        { id: '01KW4RE5000000000000000002', amount: -10000, categoryId: cat('0101'), note: 'zakupy na tydzień' },
        { id: '01KW4RE5000000000000000003', amount: -3000, categoryId: cat('0203'), note: 'kabel HDMI' }
      ]
    }
  ])
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { page, app } = r
  const dateIn = async (id: string, v: string) => {
    const f = page.getByTestId(id)
    await f.click()
    await f.fill(v)
    await f.press('Enter')
    await page.waitForTimeout(400)
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(3000)
    // Edytor operacji – jak wygląda paragon w aplikacji
    await page.keyboard.press('Control+2')
    await page.getByTestId('page-operations').waitFor()
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.waitForTimeout(500)
    await page.getByTestId('operations-search').fill('Carrefour')
    await page.waitForTimeout(800)
    const s: Record<string, unknown> = { lista: (await textOf(page.getByTestId('operation-row').first())).replace(/\n/g, ' | ') }
    await goReports(page, 'Eksport')
    // RE.5: okres 14.10 – 14.10
    await dateIn('export-from', '14.10.2026')
    await dateIn('export-to', '14.10.2026')
    const f5 = `${EXPORT}\\w4-re5-ops.csv`
    await answerSave(app, f5)
    await page.getByTestId('export-operations-csv').click()
    await waitFile(f5, 20_000)
    await page.waitForTimeout(1200)
    s.re5 = existsSync(f5) ? readFileSync(f5, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => /Carrefour|^Data/.test(l)) : 'brak pliku'
    // RE.15: Od 31.10.2026, Do 01.10.2026
    await dateIn('export-from', '31.10.2026')
    await dateIn('export-to', '01.10.2026')
    s.pola = { od: await page.getByTestId('export-from').inputValue(), do: await page.getByTestId('export-to').inputValue(), panel: (await textOf(page.getByTestId('page-reports'))).split('\n').slice(0, 40).join(' | ') }
    const f15 = `${EXPORT}\\w4-re15-odwrocone.csv`
    const props: unknown[] = []
    await app.evaluate(({ dialog }, f) => {
      const g = globalThis as unknown as { __w4?: unknown[] }
      g.__w4 = []
      ;(dialog as unknown as { showSaveDialog: unknown }).showSaveDialog = async (...a: unknown[]) => {
        g.__w4!.push(a[a.length - 1])
        return { canceled: false, filePath: f }
      }
    }, f15)
    await page.getByTestId('export-operations-csv').click()
    const ok = await waitFile(f15, 15_000)
    await page.waitForTimeout(1200)
    props.push(...(await app.evaluate(() => (globalThis as unknown as { __w4?: unknown[] }).__w4 ?? [])))
    s.re15 = { okno: props, plik: ok ? `${statSync(f15).size} B: ${JSON.stringify(readFileSync(f15, 'utf8'))}` : 'brak pliku', toasty: await toasts(page) }
    await shot(page, 'W4-RE.15-odwrocone')
    dump('RE', s)
  } finally {
    await app.close()
  }
})

test('W4 – DW.29 Inwentaryzacja po imporcie', async () => {
  for (const state of ['rok', 'rok-ab']) {
    const RUN = `w4-dw29-${state}`
    const st = useState(state, RUN)
    editJson(join(st.dataDir, 'game', '2026-11.json'), (g) => {
      g.missions = g.missions.map((m: { week: string }) => (m.week === '2026-W45' ? { ...m, template: 'balances', params: {} } : m))
    })
    const dump = out(RUN)
    const conf = () =>
      readdirSync(join(st.dataDir, 'balances', '2026'))
        .map((f) => JSON.parse(readFileSync(join(st.dataDir, 'balances', '2026', f), 'utf8')) as { date: string; kind: string; accountId: string; amount: number; createdAt: string })
        .filter((b) => b.kind === 'confirmation')
        .map((b) => `${b.date} ${b.accountId.slice(-1)} ${b.amount} (zapis ${b.createdAt})`)
        .sort()
        .slice(-4)
    const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
    const { page } = r
    const status = async () => {
      await go(page, '8', 'page-command')
      return (await textOf(page.getByTestId('command-mission'))).replace(/\s*\n\s*/g, ' | ')
    }
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
      await page.waitForTimeout(4000)
      const s: Record<string, unknown> = { przed: await status(), potwierdzeniaPrzed: conf() }
      await go(page, '3', 'page-import')
      await answerDialogs(r.app, { paths: ['C:\\FI-audyt\\pliki\\rok-nowe-historia.csv'] })
      await page.getByTestId('import-pick').click()
      await page.getByTestId('import-file').waitFor({ state: 'visible', timeout: 60_000 })
      s.plik = (await textOf(page.getByTestId('import-file'))).replace(/\s+/g, ' ').slice(0, 400)
      await page.getByTestId('import-run').click()
      await importDone(page, r.userData)
      s.wynik = (await text(page, '[data-testid="import-done"]')).replace(/\s+/g, ' ').slice(0, 400)
      s.poImporcie = await status()
      s.potwierdzeniaPo = conf()
      await shot(page, `W4-DW.29-${state}-po-imporcie`)
      await go(page, '1', 'page-bridge')
      s.odprawa = (await text(page, '[data-testid="page-bridge"]')).split('\n').filter((l) => /saldo|Saldo/.test(l)).slice(0, 5)
      dump('DW.29', s)
    } finally {
      await r.app.close()
    }
  }
})
