// WY, przebieg 2 (persona „rok”, zapisy z interfejsu): symulator manewrów (a)–(e) i wartości spoza zakresu z sumą
// kontrolną folderu, „Zastosuj pensję”, CPI GUS, cel wyprawy, próg dziennika 0 zł, linia netto (dane wykresu), słowniczek
// F1, DOL na Mapie gwiezdnej, restart; zapis żądań sieciowych. Narzędzie obserwacji – oceny w docs/audyt/raport/WY.md.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { reading, recorded, shot, start, text, useState } from './lab'
import { diffSums, folderSums, go, out, propsOf, shotEl, stepper, textOf } from './wy-pomoc'

const RUN = 'wy-2'

async function netLog(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ session }) => {
    const g = globalThis as unknown as { __net?: string[] }
    if (g.__net) return
    const rec: string[] = []
    g.__net = rec
    session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
      if (!/^(file|devtools|data|blob|chrome-extension):/.test(d.url)) rec.push(`${new Date().toISOString()} ${d.method} ${d.url}`)
      cb({})
    })
  })
}
const netOf = (app: ElectronApplication) => app.evaluate(() => (globalThis as unknown as { __net?: string[] }).__net ?? [])

async function table(page: Page): Promise<string[]> {
  return page.getByTestId('maneuver-result').locator('tr').evaluateAll((els) =>
    els.map((e) => {
      const cells = Array.from(e.querySelectorAll('td,th')) as HTMLElement[]
      return cells.map((c, i) => `${c.innerText}${i === 2 && c.tagName === 'TD' ? ` [${getComputedStyle(c).color}]` : ''}`).join(' | ')
    })
  )
}

test('WY przebieg 2 – symulator, pensja, CPI, próg dziennika', async () => {
  const st = useState('rok', RUN)
  let { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  await netLog(app)
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(12_000)
    const mostekZasieg = (await textOf(page.locator('section[data-panel="bridge:Stan okrętu"]'))).match(/ZASIĘG\n([^\n]+)/)?.[1]
    await go(page, '9', 'page-intel')
    await page.waitForTimeout(2500)
    const before = folderSums(st.dataDir)
    dump('WY.20-teraz-vs-mostek', { mostekZasieg, prognoza: await textOf(page.getByTestId('intel-range-text')), symulator: await textOf(page.getByTestId('maneuver-range')) })
    const m = page.getByTestId('intel-maneuver')
    const clear = async () => {
      const c = m.getByText('wyczyść manewr')
      if (await c.count()) await c.click()
      await page.waitForTimeout(500)
    }
    const amount = async (testId: string, v: string) => {
      await page.getByTestId(testId).click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type(v)
      await page.keyboard.press('Tab')
      await page.waitForTimeout(600)
    }
    const res: Record<string, unknown> = { wyjscie: await table(page) }
    await step('a-zakup', async () => {
      await amount('maneuver-purchase', '10000')
      await m.getByLabel('Miesiąc zakupu').selectOption('2026-12')
      await page.waitForTimeout(600)
      res.a = await table(page)
      reading('wy', 'WY.20', 'rok, (a) zakup 10 000 zł z osłon w 12.2026, kurs mediana', { tabela: (res.a as string[]).join(' || ') })
      await shotEl(m, 'WY.20-a')
      await clear()
    })
    await step('b-bez-xtb', async () => {
      await page.getByTestId('maneuver-noxtb').fill('6')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(600)
      res.b = await table(page)
      reading('wy', 'WY.20', 'rok, (b) 6 miesięcy bez wypłat z XTB, kurs mediana', { tabela: (res.b as string[]).join(' || ') })
      await shotEl(m, 'WY.20-b')
      await clear()
    })
    await step('c-koszty', async () => {
      await page.getByTestId('maneuver-costs').fill('20')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(600)
      res.c = await table(page)
      await clear()
    })
    await step('d-cel', async () => {
      await m.getByLabel('Nazwa nowego celu').fill('Audyt cel')
      await amount('maneuver-goal', '5000')
      await m.getByLabel('Termin nowego celu').fill('2027-06')
      await page.waitForTimeout(400)
      res.dBezRaty = await table(page)
      await m.getByRole('switch', { name: /rata z pensji/ }).click()
      await page.waitForTimeout(600)
      res.d = await table(page)
      await shotEl(m, 'WY.20-d')
      await m.getByLabel('Termin nowego celu').fill('2027-13')
      await page.waitForTimeout(600)
      res.dZlyTermin = { pole: await m.getByLabel('Termin nowego celu').inputValue(), tabela: await table(page), invalid: await m.getByLabel('Termin nowego celu').getAttribute('aria-invalid') }
      await shotEl(m, 'WY.20-d-2027-13')
      await m.getByLabel('Nazwa nowego celu').fill('')
      await clear()
    })
    await step('e-kontener', async () => {
      await amount('maneuver-container', '300')
      res.e = await table(page)
      await clear()
    })
    await step('spoza-zakresu', async () => {
      // fill: cała wartość naraz.
      await page.getByTestId('maneuver-costs').fill('300')
      res.koszty300fill = { pole: await page.getByTestId('maneuver-costs').inputValue(), invalid: await page.getByTestId('maneuver-costs').getAttribute('aria-invalid'), tabela: await table(page) }
      await page.keyboard.press('Tab')
      await page.waitForTimeout(500)
      res.koszty300fillPoWyjsciu = { pole: await page.getByTestId('maneuver-costs').inputValue(), tabela: await table(page) }
      await clear()
      // Pisanie znak po znaku – jak użytkownik.
      await page.getByTestId('maneuver-costs').click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('300')
      res.koszty300pisane = { pole: await page.getByTestId('maneuver-costs').inputValue(), invalid: await page.getByTestId('maneuver-costs').getAttribute('aria-invalid'), tabela: await table(page) }
      await shotEl(m, 'WY.20-koszty-300-w-polu')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(500)
      res.koszty300pisanePoWyjsciu = { pole: await page.getByTestId('maneuver-costs').inputValue(), tabela: await table(page) }
      await shotEl(m, 'WY.20-koszty-300-po-wyjsciu')
      await clear()
      await page.getByTestId('maneuver-noxtb').click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('13')
      res.xtb13pisane = { pole: await page.getByTestId('maneuver-noxtb').inputValue(), invalid: await page.getByTestId('maneuver-noxtb').getAttribute('aria-invalid'), tabela: await table(page) }
      await page.keyboard.press('Tab')
      await page.waitForTimeout(500)
      res.xtb13PoWyjsciu = { pole: await page.getByTestId('maneuver-noxtb').inputValue(), tabela: await table(page) }
      await shotEl(m, 'WY.20-xtb-13-po-wyjsciu')
      await clear()
      res.poWyczyszczeniu = await table(page)
    })
    dump('WY.20-manewry', res)
    const after = folderSums(st.dataDir)
    dump('WY.21-folder-po-manewrach', { plikow: Object.keys(before).length, roznice: diffSums(before, after) })

    // WY.6 – linia netto: dane wykresu (bieżące drzewo React).
    await step('netto', async () => {
      await page.getByRole('radio', { name: 'siła floty netto' }).click()
      await page.waitForTimeout(1500)
      const d = await propsOf(page, '[data-testid="intel-wealth-chart"]', 'points')
      dump('WY.6-dane-netto', d)
      await page.getByRole('radio', { name: 'na kontach' }).click()
      await page.waitForTimeout(1500)
      dump('WY.6-dane-na-kontach-po-powrocie', { aktywna: await page.getByRole('radio', { name: 'na kontach' }).getAttribute('aria-checked'), ostatni: ((await propsOf(page, '[data-testid="intel-wealth-chart"]', 'points')) as { points: unknown[] } | null)?.points?.slice(-2) })
    })

    // WY.23 – CPI.
    const cpiOf = () => (JSON.parse(readFileSync(join(st.dataDir, 'fi.json'), 'utf8')) as { settings: { intel?: { cpi?: Record<string, number> } } }).settings.intel?.cpi
    await step('cpi', async () => {
      const r: Record<string, unknown> = { domyslnyMiesiac: await page.getByTestId('intel-cpi-month').inputValue(), plik0: cpiOf() }
      const put = async (v: string) => {
        await page.getByTestId('intel-cpi-value').click()
        await page.keyboard.press('Control+A')
        if (v) await page.keyboard.type(v)
        else await page.keyboard.press('Delete')
        await page.keyboard.press('Tab')
        await page.waitForTimeout(1500)
        const toasts = await page.locator('[role="status"], [role="alert"], [data-testid*="toast"]').allInnerTexts().catch(() => [])
        return { pole: await page.getByTestId('intel-cpi-value').inputValue(), plik: cpiOf(), panel: (await textOf(page.getByTestId('intel-inflation'))).split('\n').slice(0, 6).join(' | '), toasty: toasts }
      }
      r['4,9'] = await put('4,9')
      await shotEl(page.getByTestId('intel-inflation'), 'WY.23-4,9')
      r['-60'] = await put('-60')
      r['250'] = await put('250')
      r['puste'] = await put('')
      r['4,9 ponownie'] = await put('4,9')
      dump('WY.23', r)
    })

    // WY.24 – cel wyprawy.
    await step('wyprawa-cel', async () => {
      await page.getByTestId('intel-expedition-open').first().click()
      await page.waitForTimeout(500)
      await page.getByTestId('intel-expedition-goal-select').selectOption({ label: 'Wakacje 2027' })
      await page.waitForTimeout(1200)
      dump('WY.24-cel', await textOf(page.getByTestId('intel-expeditions')))
      await shotEl(page.getByTestId('intel-expeditions'), 'WY.24-cel')
    })

    // WY.21 – „Zastosuj pensję” 9 000 zł od 12.2026.
    await step('pensja', async () => {
      const m11 = readFileSync(join(st.dataDir, 'months', '2026-11.json'), 'utf8')
      const m12before = existsSync(join(st.dataDir, 'months', '2026-12.json')) ? readFileSync(join(st.dataDir, 'months', '2026-12.json'), 'utf8') : '(brak pliku)'
      const s1 = folderSums(st.dataDir)
      await amount('maneuver-salary', '9000')
      const btn = page.getByTestId('maneuver-apply-salary')
      const label = await textOf(btn)
      await btn.click()
      await page.waitForTimeout(800)
      const toast = await page.locator('[role="status"], [role="alert"], [data-testid*="toast"]').allInnerTexts().catch(() => [])
      await shot(page, 'WY.21-toast')
      await page.waitForTimeout(2500)
      const s2 = folderSums(st.dataDir)
      const m12 = existsSync(join(st.dataDir, 'months', '2026-12.json')) ? readFileSync(join(st.dataDir, 'months', '2026-12.json'), 'utf8') : '(brak pliku)'
      dump('WY.21-pensja', { przycisk: label, toast, zmienionePliki: diffSums(s1, s2), listopadBezZmian: m11 === readFileSync(join(st.dataDir, 'months', '2026-11.json'), 'utf8'), grudzienPrzed: m12before, grudzien: m12 })
      await go(page, '4', 'page-month')
      dump('WY.21-plan-listopad', (await text(page, '[data-testid="page-month"]')).slice(0, 600))
      await page.getByTestId('month-next').click().catch(() => undefined)
      await page.waitForTimeout(1200)
      dump('WY.21-plan-grudzien', (await text(page, '[data-testid="page-month"]')).slice(0, 600))
      await shot(page, 'WY.21-plan-grudzien')
      await go(page, '9', 'page-intel')
    })

    // WY.16 – próg dziennika 0 zł (Dowództwo), szybki wpis 500 zł, edytor operacji.
    await step('prog-0', async () => {
      await go(page, '8', 'page-command')
      const f = page.getByLabel('Próg dziennika')
      await f.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('0')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(1500)
      const orders = (JSON.parse(readFileSync(join(st.dataDir, 'fi.json'), 'utf8')) as { settings: { orders: Record<string, unknown> } }).settings.orders
      const r: Record<string, unknown> = { pole: await f.inputValue(), plik: orders.impulseThreshold }
      await page.evaluate('window.fi.quickOpen()')
      let q: Page | undefined
      for (let i = 0; i < 100 && !q; i++) {
        q = app.windows().find((w) => w.url().includes('quick=1'))
        if (!q) await page.waitForTimeout(100)
      }
      if (q) {
        await q.getByTestId('quick-amount').waitFor({ state: 'visible', timeout: 15_000 })
        await q.getByTestId('quick-amount').click()
        await q.getByTestId('quick-amount').fill('500')
        await q.getByTestId('quick-counterparty').fill('Audyt próg 0')
        await q.getByTestId('quick-counterparty').press('Tab')
        await q.waitForTimeout(600)
        r.szybkiWpisDziennik = await q.getByTestId('quick-log').count()
        r.szybkiWpisTekst = (await q.locator('body').innerText()).slice(0, 900)
        await q.screenshot({ path: 'C:\\FI-audyt\\zrzuty\\WY.16-prog-0-szybki-wpis.png' })
        await q.keyboard.press('Escape')
        await page.waitForTimeout(800)
      }
      await go(page, '2', 'page-operations')
      await page.keyboard.press('Control+N')
      await page.waitForTimeout(1200)
      const amt = page.getByTestId('operation-amount')
      if (await amt.count()) {
        await amt.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.type('500')
        await page.keyboard.press('Tab')
        await page.waitForTimeout(600)
        r.edytorPyta = await page.getByText(/plan czy impuls\?/).count()
        r.edytor = (await text(page, '[data-testid="page-operations"]')).slice(0, 400)
        await shot(page, 'WY.16-prog-0-edytor')
      }
      dump('WY.16-prog-0', r)
      await page.keyboard.press('Escape')
    })

    // WY.25 – słowniczek (F1) i DOL na Mapie gwiezdnej.
    await step('slowniczek', async () => {
      await go(page, '6', 'page-starmap')
      dump('WY.25-mapa-dymki', await page.getByTestId('page-starmap').locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 40)} => ${t.getAttribute('title')}`).filter((s) => !/Dwuklik|Powiększ|Zwiń panel|Ukryj|Przeciągnij/.test(s))))
      await page.evaluate(() => window.dispatchEvent(new Event('fi:shortcuts')))
      await page.waitForTimeout(1000)
      dump('WY.25-F1', await textOf(page.getByTestId('shortcuts')))
      await shot(page, 'WY.25-F1')
      await page.keyboard.press('Escape')
    })

    // Restart: CPI i pensja po ponownym starcie.
    await step('restart', async () => {
      dump('siec-1', await netOf(app))
      await app.close()
      ;({ app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false }))
      await netLog(app)
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(4000)
      await go(page, '9', 'page-intel')
      await page.waitForTimeout(1500)
      dump('WY.23-po-restarcie', { miesiac: await page.getByTestId('intel-cpi-month').inputValue(), pole: await page.getByTestId('intel-cpi-value').inputValue(), panel: (await textOf(page.getByTestId('intel-inflation'))).split('\n').slice(0, 6).join(' | ') })
      dump('siec-2', await netOf(app))
    })
    dump('zapis', await recorded(app))
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
