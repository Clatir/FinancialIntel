// WY, przebieg 1 (persona „rok” + zapisany widok Operacji w fi.json): Wywiad – krzywa i dymki, siła floty netto, Mostek,
// okresy 3/6/12, Killzones, FVG, Wydatki w czasie i drążenie, Namierzone cele, Porównanie, Prognoza, Bilans, Kurs, Wyprawy,
// Inflacja, terminy ICT, ukryte kwoty; restart – zapamiętana linia krzywej. Narzędzie obserwacji – oceny w WY.md.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { ACC, colorOf, editJson, go, out, panels, propsOf, shotEl, stepper, textOf } from './wy-pomoc'

const RUN = 'wy-1'

async function intelFacts(page: Page): Promise<Record<string, string>> {
  const w = page.getByTestId('intel-wealth')
  const raw = await w.innerText()
  const facts: Record<string, string> = {}
  for (const k of ['NA KONTACH', 'SIŁA FLOTY NETTO', 'SZCZYT', 'NAJWIĘKSZY DRAWDOWN', 'STRUKTURA']) {
    const m = raw.match(new RegExp(`${k}\\n([^\\n]+)`))
    facts[k] = m ? m[1]! : '(brak)'
  }
  facts.znaczniki = (await textOf(page.getByTestId('intel-marks'))).replace(/\n/g, ' | ')
  return facts
}

test('WY przebieg 1 – Wywiad persony rok (odczyt)', async () => {
  const st = useState('rok', RUN)
  // A saved view of Operacje (B88: the drill must keep it).
  editJson(join(st.dataDir, 'fi.json'), (j) => {
    j.settings.operationViews = [{ id: 'audyt-widok-1', name: 'Audyt – mBank', filter: { accounts: [ACC.mbank] }, withPeriod: false }]
  })
  let { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)

    // WY.3 – suma sald: Mostek i Ustawienia → Konta.
    await step('salda', async () => {
      dump('mostek-krzywa', await textOf(page.getByTestId('bridge-wealth')))
      dump('mostek-stan', await textOf(page.locator('section[data-panel="bridge:Stan okrętu"]')))
      dump('mostek-przychody', await textOf(page.locator('section[data-panel="bridge:Przychody"]')))
      await page.keyboard.press('Control+Comma')
      await page.getByTestId('settings-tab-accounts').click({ timeout: 20_000 })
      await page.waitForTimeout(1000)
      const rows = await page.getByTestId('account-row').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-name')}: ${(e.querySelector('[data-testid="account-balance"]') as HTMLElement | null)?.innerText}`))
      dump('ustawienia-konta', rows)
      reading('wy', 'WY.3', 'rok', { konta: rows.join(' · ') })
    })

    await go(page, '9', 'page-intel')
    await page.waitForTimeout(2500)

    // WY.3 / 4 / 5 – krzywa na kontach: fakty, dane wykresu, dymki (krzyż na wykresie).
    await step('krzywa', async () => {
      const facts = await intelFacts(page)
      dump('WY.3-fakty', facts)
      const data = (await propsOf(page, '[data-testid="intel-wealth-chart"]', 'points')) as { points: Array<{ date: string; value: number; drawdown: number }>; marks: unknown[]; net: Array<{ date: string; value: number }> }
      const pick = ['2025-12-07', '2026-03-15', '2026-07-12', '2026-11-01']
      const pts = Object.fromEntries(pick.map((d) => [d, data.points.find((p) => p.date === d)?.value ?? null]))
      reading('wy', 'WY.3', 'rok', { naKontach: facts['NA KONTACH']!, szczyt: facts['SZCZYT']!, ...Object.fromEntries(Object.entries(pts).map(([d, v]) => [`niedziela ${d} (grosze)`, v])) })
      const trough = data.points.reduce((m, p) => (p.drawdown < m.drawdown ? p : m), data.points[0]!)
      reading('wy', 'WY.4', 'rok', { szczyt: facts['SZCZYT']!, najwiekszyDrawdown: facts['NAJWIĘKSZY DRAWDOWN']!, dolek: trough.date })
      reading('wy', 'WY.5', 'rok', { struktura: facts['STRUKTURA']!, znaczniki: facts.znaczniki! })
      const chart = page.getByTestId('intel-wealth-chart')
      await chart.scrollIntoViewIfNeeded()
      const box = (await chart.boundingBox())!
      for (const [i, fx] of [0.3, 0.55, 0.8].entries()) {
        await page.mouse.move(box.x + box.width * fx * 0.85, box.y + box.height * 0.3)
        await page.waitForTimeout(400)
        await shotEl(page.getByTestId('intel-wealth'), `WY.3-dymek-${i + 1}`)
      }
      await page.mouse.move(5, 5)
    })

    // WY.6 – siła floty netto.
    await step('netto', async () => {
      await page.getByRole('radio', { name: 'siła floty netto' }).click()
      await page.waitForTimeout(1500)
      const facts = await intelFacts(page)
      dump('WY.6-fakty-netto', facts)
      const data = (await propsOf(page, '[data-testid="intel-wealth-chart"]', 'points')) as { points: Array<{ date: string; value: number; drawdown: number }>; marks: Array<Record<string, unknown>>; net: Array<{ date: string; value: number }> }
      dump('WY.6-dane-netto', { points: data.points.map((p) => `${p.date} ${p.value} dd ${p.drawdown}`), marks: data.marks, second: data.net.slice(0, 6) })
      await shotEl(page.getByTestId('intel-wealth'), 'WY.6-netto')
      const pick = (d: string, arr: Array<{ date: string; value: number }>) => arr.find((p) => p.date === d)?.value ?? null
      reading('wy', 'WY.6', 'rok', {
        nettoDzis: facts['SIŁA FLOTY NETTO']!,
        naKontachDzis: facts['NA KONTACH']!,
        'netto 2025-09-28': pick('2025-09-28', data.points),
        'netto 2025-10-05 (tydzień pożyczki od rodziców 01.10)': pick('2025-10-05', data.points),
        'na kontach 2025-09-28': pick('2025-09-28', data.net),
        'na kontach 2025-10-05': pick('2025-10-05', data.net),
        struktura: facts['STRUKTURA']!,
        drawdown: facts['NAJWIĘKSZY DRAWDOWN']!
      })
      await go(page, '1', 'page-bridge')
      dump('WY.6-mostek-przy-netto', await textOf(page.getByTestId('bridge-wealth')))
      await go(page, '9', 'page-intel')
      dump('WY.6-po-powrocie', { aktywna: await page.getByRole('radio', { name: 'siła floty netto' }).getAttribute('aria-checked') })
    })

    // WY.7 – Mostek a Wywiad (linia „na kontach”).
    await step('mostek-wywiad', async () => {
      await page.getByRole('radio', { name: 'na kontach' }).click()
      await page.waitForTimeout(800)
      const intel = (await propsOf(page, '[data-testid="intel-wealth-chart"]', 'points')) as { points: Array<{ date: string; value: number }>; marks: Array<{ date: string; kind: string }> }
      await go(page, '1', 'page-bridge')
      const bridge = (await propsOf(page, '[data-testid="bridge-wealth-chart"]', 'points')) as { points: Array<{ date: string; value: number }>; marks: Array<{ date: string; kind: string }> }
      const tail = intel.points.slice(-bridge.points.length)
      const diff = bridge.points.filter((p, i) => tail[i]?.date !== p.date || tail[i]?.value !== p.value)
      const intelMarks = intel.marks.filter((m) => m.date >= bridge.points[0]!.date)
      dump('WY.7', { mostekPunkty: bridge.points.length, od: bridge.points[0]?.date, roznicePunktow: diff, mostekZnaczniki: bridge.marks, wywiadZnacznikiWtymOkresie: intelMarks })
      await page.getByTestId('bridge-wealth-open').click()
      await page.waitForTimeout(1500)
      dump('WY.7-klik', { wywiad: await page.getByTestId('page-intel').isVisible() })
    })

    // WY.8 / 9 / 16 / 13 – okres 3 / 6 / 12.
    for (const per of ['3 mies.', '12 mies.', '6 mies.']) {
      await step(`okres-${per}`, async () => {
        await page.getByRole('radio', { name: per, exact: true }).click()
        await page.waitForTimeout(1500)
        const all = await panels(page.getByTestId('page-intel'))
        const keep = all.filter((p) => ['intel-spending', 'intel-targets', 'intel-killzones-panel', 'intel-log', 'intel-wealth', 'intel-fvg', 'intel-course', 'intel-fuel', 'intel-comparison', 'intel-range', 'intel-inflation', 'intel-expeditions'].includes(p.id ?? ''))
        dump(`WY.8-okres-${per}`, keep.map((p) => `#### ${p.id}\n${p.text}`).join('\n'))
        dump(`WY.9-killzones-${per}`, await page.locator('[data-testid="intel-killzones"] rect[data-testid]').evaluateAll((els) => els.map((e) => `${e.querySelector('title')?.textContent} | ${e.getAttribute('stroke')}`)))
        const kz = await textOf(page.getByTestId('intel-killzones-panel'))
        const top = await page.locator('[data-testid="intel-killzones"] rect[stroke="#e8edf2"] title').first().textContent().catch(() => null)
        reading('wy', 'WY.9', `rok, okres ${per}`, { licznik: kz.split('\n').find((l) => l.startsWith('Zakupy z godziną')) ?? kz, killzone: top })
        if (per === '6 mies.') await shotEl(page.getByTestId('intel-killzones-panel'), 'WY.9')
      })
    }

    // WY.10 – FVG kopert: miesiące.
    await step('fvg', async () => {
      const sel = page.getByTestId('intel-fvg-month')
      dump('WY.10-opcje', await sel.evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.value)))
      for (const m of ['2026-10', '2026-09', '2026-11', '2025-12']) {
        await sel.selectOption(m)
        await page.waitForTimeout(600)
        const rows = await page.getByTestId('intel-fvg-row').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\n/g, ' ')))
        const colors = await page.locator('[data-testid="intel-fvg-row"] span.num.w-\\[96px\\]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} ${getComputedStyle(e).color}`))
        dump(`WY.10-${m}`, { panel: await textOf(page.getByTestId('intel-fvg')), rows, colors })
        reading('wy', 'WY.10', `rok, ${m}`, Object.fromEntries(rows.map((r, i) => [`${i}`, r])))
      }
      await sel.selectOption('2026-10')
      await shotEl(page.getByTestId('intel-fvg'), 'WY.10')
    })

    // WY.11 / 12 – Wydatki w czasie, drążenie.
    await step('wydatki', async () => {
      const sp = page.getByTestId('intel-spending')
      dump('WY.11-tabela', await sp.innerText())
      dump('WY.11-dymki', await sp.locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 40).replace(/\n/g, ' ')} => ${t.getAttribute('title')}`)))
      const rows = await sp.locator('tr').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()))
      reading('wy', 'WY.11', 'rok, okres 6 mies. (cze–lis 2026; wrz i paź do porównania)', Object.fromEntries(rows.map((r, i) => [`${i}`, r])))
      await shotEl(sp, 'WY.11')
      // Jedzenie → podkategorie.
      await sp.locator('[data-testid="intel-spend-row"][data-label="Jedzenie"] [data-testid="intel-spend-toggle"]').click()
      await page.waitForTimeout(600)
      dump('WY.12-jedzenie-rozwiniete', (await sp.locator('tr').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')} | ${(e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()}`))).join('\n'))
      await shotEl(sp, 'WY.12-podkategorie')
    })

    const drill = async (name: string, locate: () => ReturnType<Page['locator']>) => {
      await step(`drill-${name}`, async () => {
        const cell = locate()
        const val = await cell.innerText()
        await cell.click()
        await page.getByTestId('page-operations').waitFor({ timeout: 30_000 })
        await page.waitForTimeout(2000)
        const sums = await textOf(page.getByTestId('operations-sums'))
        const views = await textOf(page.getByTestId('operations-views'))
        const head = (await text(page, '[data-testid="page-operations"]')).slice(0, 1500)
        dump(`WY.12-drill-${name}`, { komorka: val, sumy: sums, widoki: views, ekran: head })
        reading('wy', 'WY.12', `rok, ${name}`, { komorka: val.replace(/\s+/g, ' '), sumaListy: sums.replace(/\s+/g, ' ') })
        await shot(page, `WY.12-${name}`)
        await go(page, '9', 'page-intel')
        await page.waitForTimeout(1500)
      })
    }
    // Komórka Jedzenie / paź, Order Block / paź, „bez podkategorii” Jedzenie / paź (kolumna 5 z 6: paź).
    await drill('jedzenie-paz', () => page.locator('[data-testid="intel-spend-row"][data-label="Jedzenie"] [data-testid="intel-spend-cell"]').nth(4))
    await drill('order-block-paz', () => page.locator('[data-testid="intel-order-block"] [data-testid="intel-spend-cell"]').nth(4))
    await step('bez-podkategorii', async () => {
      const sp = page.getByTestId('intel-spending')
      const t = sp.locator('[data-testid="intel-spend-row"][data-label="Jedzenie"] [data-testid="intel-spend-toggle"]')
      if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click()
      await page.waitForTimeout(500)
      dump('WY.12-podwiersze', await sp.locator('[data-testid="intel-spend-sub"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-label')} | ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`)))
    })
    await drill('bez-podkategorii-paz', () => page.locator('[data-testid="intel-spend-sub"]').filter({ hasText: 'bez podkategorii' }).locator('[data-testid="intel-spend-cell"]').nth(4))
    await drill('na-miescie-paz', () => page.locator('[data-testid="intel-spend-sub"]').filter({ hasText: 'na mieście' }).locator('[data-testid="intel-spend-cell"]').nth(4))

    // WY.13 – Namierzone cele.
    await step('cele', async () => {
      const tg = page.getByTestId('intel-targets')
      dump('WY.13-dymki', await tg.locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 60).replace(/\n/g, ' ')} => ${t.getAttribute('title')}`)))
      await page.getByTestId('intel-targets-more').click().catch(() => undefined)
      await page.waitForTimeout(600)
      const rows = await page.getByTestId('intel-target').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
      dump('WY.13-wszystkie', rows)
      reading('wy', 'WY.13', 'rok, okres 6 mies.', Object.fromEntries(rows.slice(0, 3).map((r, i) => [`${i}`, r])))
      await shotEl(tg, 'WY.13')
      await page.getByTestId('intel-target').first().click()
      await page.getByTestId('page-operations').waitFor({ timeout: 30_000 })
      await page.waitForTimeout(2000)
      dump('WY.13-klik', { sumy: await textOf(page.getByTestId('operations-sums')), ekran: (await text(page, '[data-testid="page-operations"]')).slice(0, 1500), rok: await textOf(page.getByTestId('operation-brand-year')) })
      await shot(page, 'WY.13-operacje')
      await go(page, '9', 'page-intel')
    })

    // WY.14 – Porównanie.
    await step('porownanie', async () => {
      const sel = page.getByTestId('intel-comparison-month')
      dump('WY.14-domyslny', { wartosc: await sel.inputValue(), panel: await textOf(page.getByTestId('intel-comparison')) })
      for (const m of ['2025-09', '2025-10', '2025-11', '2026-11']) {
        await sel.selectOption(m)
        await page.waitForTimeout(600)
        const rows = await page.getByTestId('intel-comparison-row').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} | over=${e.getAttribute('data-over')}`))
        dump(`WY.14-${m}`, { panel: await textOf(page.getByTestId('intel-comparison')), rows })
      }
      await sel.selectOption('2026-10')
      await page.waitForTimeout(500)
      const rows = await page.getByTestId('intel-comparison-row').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} | over=${e.getAttribute('data-over')}`))
      const marks = await page.locator('[data-testid="intel-comparison"] td').evaluateAll((els) => els.filter((e) => (e as HTMLElement).innerText.includes('▲')).map((e) => `${(e as HTMLElement).innerText} ${getComputedStyle(e).color}`))
      dump('WY.14-pazdziernik', { rows, marks })
      reading('wy', 'WY.14', 'rok, październik 2026', Object.fromEntries(rows.map((r, i) => [`${i}`, r])))
      await shotEl(page.getByTestId('intel-comparison'), 'WY.14')
    })

    // WY.15 – Prognoza zasięgu; WY.17 – Bilans paliwa; WY.18 – Kurs; WY.20 – stan „teraz” symulatora; WY.22 – inflacja; WY.24 – wyprawy.
    await step('prognoza', async () => {
      const r = page.getByTestId('intel-range')
      const bars = await r.locator('[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title')))
      dump('WY.15', { panel: await r.innerText(), druga: bars })
      reading('wy', 'WY.15', 'rok', { zdanie: await textOf(page.getByTestId('intel-range-text')), boje: await textOf(page.getByTestId('intel-range-plans')), paski: (await r.innerText()).replace(/\n/g, ' '), drugaKreska: bars.slice(0, 4).join(' · ') })
      await shotEl(r, 'WY.15')
    })
    await step('bilans', async () => {
      const f = page.getByTestId('intel-fuel')
      dump('WY.17', { panel: await f.innerText(), dymki: await f.locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 40)} => ${t.getAttribute('title')}`)) })
      const rows = await page.getByTestId('intel-fuel-row').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
      const colors = await page.getByTestId('intel-fuel-balance').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} ${getComputedStyle(e).color}`))
      dump('WY.17-kolory', colors)
      reading('wy', 'WY.17', 'rok', { ...Object.fromEntries(rows.map((r, i) => [`${i}`, r])), naglowek: (await f.innerText()).split('Miesiąc')[0]!.replace(/\n/g, ' ') })
      await shotEl(f, 'WY.17')
    })
    await step('kurs', async () => {
      const c = page.getByTestId('intel-course')
      const tips = await c.locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 40).replace(/\n/g, ' ')} => ${t.getAttribute('title')}`))
      const accent = await c.locator('td').evaluateAll((els) => els.filter((e) => getComputedStyle(e).color === 'rgb(232, 163, 61)').map((e) => (e as HTMLElement).innerText))
      dump('WY.18', { panel: await c.innerText(), dymki: tips, akcent: accent })
      reading('wy', 'WY.18', 'rok', { podsumowanie: (await textOf(page.getByTestId('intel-course-summary'))).replace(/\n/g, ' | '), miesiace: (await textOf(page.getByTestId('intel-course-months'))).replace(/\n/g, ' | ').slice(0, 900) })
      await shotEl(c, 'WY.18')
      const m = page.getByTestId('intel-maneuver')
      dump('WY.20-teraz', await m.innerText())
    })
    await step('inflacja', async () => {
      const i = page.getByTestId('intel-inflation')
      dump('WY.22', { panel: await i.innerText(), dymki: await i.locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 40).replace(/\n/g, ' ')} => ${t.getAttribute('title')}`)) })
      reading('wy', 'WY.22', 'rok', { panel: (await i.innerText()).replace(/\n/g, ' | ').slice(0, 1500) })
      await shotEl(i, 'WY.22')
    })
    await step('wyprawy', async () => {
      const e = page.getByTestId('intel-expeditions')
      await page.getByTestId('intel-expedition-open').first().click()
      await page.waitForTimeout(600)
      dump('WY.24', { panel: await e.innerText(), dymki: await e.locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 40).replace(/\n/g, ' ')} => ${t.getAttribute('title')}`)), cel: await page.getByTestId('intel-expedition-goal-select').evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => `${o.value}:${o.text}`)).catch(() => null) })
      reading('wy', 'WY.24', 'rok, Mazury 2026', { karta: (await e.innerText()).replace(/\n/g, ' | ') })
      await shotEl(e, 'WY.24')
      await page.getByTestId('intel-expedition-operations').click()
      await page.getByTestId('page-operations').waitFor({ timeout: 30_000 })
      await page.waitForTimeout(2000)
      dump('WY.24-operacje', { sumy: await textOf(page.getByTestId('operations-sums')), ekran: (await text(page, '[data-testid="page-operations"]')).slice(0, 2500) })
      await shot(page, 'WY.24-operacje')
      await go(page, '9', 'page-intel')
    })

    // WY.25 – terminy ICT: dymki na Mostku, w Wywiadzie i Raportach, słowniczek F1.
    await step('terminy', async () => {
      const allTips = async () => page.locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 40).replace(/\n/g, ' ')} => ${t.getAttribute('title')}`).filter((s) => !/Dwuklik|Powiększ|Zwiń panel|Ukryj panel|Przeciągnij/.test(s)))
      const res: Record<string, unknown> = { wywiad: await allTips() }
      await go(page, '1', 'page-bridge')
      res.mostek = await allTips()
      await go(page, '0', 'page-reports')
      res.raporty = await allTips()
      await go(page, '8', 'page-command')
      res.dowodztwo = await allTips()
      res.dowodztwoTekst = (await text(page, '[data-testid="page-command"]')).slice(0, 6000)
      dump('WY.25-dymki', res)
      await page.keyboard.press('F1')
      await page.waitForTimeout(1200)
      dump('WY.25-F1', await text(page))
      await shot(page, 'WY.25-F1')
      // The glossary tab of the cheat sheet, if any.
      const tabs = await page.locator('[role="dialog"] [role="radio"], [role="dialog"] button').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.trim()).filter(Boolean))
      dump('WY.25-F1-przyciski', tabs)
      const gl = page.locator('[role="dialog"]').getByText(/Słowniczek|słowniczek/).first()
      if (await gl.count()) {
        await gl.click()
        await page.waitForTimeout(800)
        dump('WY.25-slowniczek', await text(page, '[role="dialog"]'))
        await shot(page, 'WY.25-slowniczek')
      }
      await page.keyboard.press('Escape')
      await go(page, '9', 'page-intel')
    })

    // WY.27 – ukryte kwoty.
    await step('ukryte', async () => {
      await page.keyboard.press('Control+Shift+Digit4')
      await page.waitForTimeout(1500)
      const t = await text(page, '[data-testid="page-intel"]')
      dump('WY.27-tekst', t)
      const leaks = t.split('\n').filter((l) => /\d[\d\s]*,\d\d/.test(l))
      dump('WY.27-kwoty-widoczne', leaks)
      dump('WY.27-killzones-dymki', await page.locator('[data-testid="intel-killzones"] rect[data-testid] title').allTextContents())
      dump('WY.27-dymki', await page.getByTestId('page-intel').locator('[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title')).filter((s) => s && /\d,\d\d/.test(s))))
      dump('WY.27-kolory-bilansu', await page.getByTestId('intel-fuel-balance').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} ${getComputedStyle(e).color}`)))
      dump('WY.27-kolory-fvg', await page.locator('[data-testid="intel-fvg-row"] span.num').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} ${getComputedStyle(e).color}`)))
      await shot(page, 'WY.27-wywiad')
      const chart = page.getByTestId('intel-wealth-chart')
      const box = (await chart.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3)
      await page.waitForTimeout(400)
      await shotEl(page.getByTestId('intel-wealth'), 'WY.27-krzywa-dymek')
      for (const id of ['intel-fuel', 'intel-range', 'intel-course', 'intel-log', 'intel-inflation', 'intel-maneuver']) await shotEl(page.getByTestId(id), `WY.27-${id}`)
      await page.keyboard.press('Control+Shift+Digit4')
      await page.waitForTimeout(1000)
      dump('WY.27-po-odkryciu', (await text(page, '[data-testid="page-intel"]')).slice(0, 400))
    })

    // WY.28 – zrzuty do oceny (krzywa, Killzones, prognoza, kurs).
    await step('zrzuty', async () => {
      for (const id of ['intel-wealth', 'intel-killzones-panel', 'intel-range', 'intel-course']) await shotEl(page.getByTestId(id), `WY.28-${id}`)
    })

    // WY.6 – wybór linii po restarcie.
    await step('restart', async () => {
      await page.getByRole('radio', { name: 'siła floty netto' }).click()
      await page.waitForTimeout(800)
      await app.close()
      ;({ app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false }))
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(3000)
      await go(page, '9', 'page-intel')
      await page.waitForTimeout(1500)
      dump('WY.6-po-restarcie', { netto: await page.getByRole('radio', { name: 'siła floty netto' }).getAttribute('aria-checked'), fakty: await intelFacts(page) })
    })
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
