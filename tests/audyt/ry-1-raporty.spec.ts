// RY, przebieg 1 (persona „rok”, odczyt): odprawa na Mostku – pozycje, poziomy i kliknięcia; Raporty – raport wachty
// i wybór tygodnia, debriefing (bieżący i pierwszy miesiąc), przegląd roczny 2025 i 2026; Plan miesiąca – debriefing
// każdego miesiąca; Dowództwo; drugi start tego dnia (powiadomienia); odprawa bez polskiego głosu (głosy podstawione).
// Narzędzie obserwacji – oceny w docs/audyt/raport/RY.md.
import { test, type Page } from '@playwright/test'
import { reading, recorded, shot, start, text, useState } from './lab'
import { go, out, shotEl, stepper, textOf } from './wy-pomoc'

const RUN = 'ry-1'

async function where(page: Page): Promise<string> {
  return page.evaluate(() => {
    const p = Array.from(document.querySelectorAll('[data-testid^="page-"]')).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getAttribute('data-testid'))
    const dlg = Array.from(document.querySelectorAll('[role="dialog"]')).map((e) => (e as HTMLElement).innerText.slice(0, 200).replace(/\s+/g, ' '))
    const sel = Array.from(document.querySelectorAll('[data-selected="1"], [aria-selected="true"], .ring-accent, [data-highlight="1"]')).map((e) => (e as HTMLElement).innerText.slice(0, 120).replace(/\s+/g, ' '))
    const tab = Array.from(document.querySelectorAll('[role="radio"][aria-checked="true"]')).map((e) => (e as HTMLElement).innerText)
    return JSON.stringify({ pages: p, dialogs: dlg, wyroznione: sel.slice(0, 3), zakladki: tab })
  })
}

test('RY przebieg 1 – raporty i rytuały persony rok (odczyt)', async () => {
  const st = useState('rok', RUN)
  let { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)

    // RY.1 – pozycje odprawy z poziomem (kolor kropki) i dokąd prowadzi klik.
    await step('odprawa', async () => {
      const od = page.locator('section[data-panel="bridge:Odprawa"]').first()
      const items = od.locator('[data-testid="briefing-item"]')
      const n = await items.count()
      const list: Array<Record<string, string | null>> = []
      for (let i = 0; i < n; i++) {
        const it = items.nth(i)
        const dot = await it.locator('span').first().evaluate((e) => getComputedStyle(e).backgroundColor)
        list.push({ kind: await it.getAttribute('data-kind'), level: await it.getAttribute('data-level'), dot, text: (await it.innerText()).trim() })
      }
      dump('RY.1-pozycje', list)
      reading('ry', 'RY.1', 'rok', { naglowek: (await od.innerText()).split('\n').slice(0, 6).join(' | '), ...Object.fromEntries(list.map((x, i) => [`${i}:${x.kind}`, x.text])) })
      await shotEl(od, 'RY.1-odprawa')
      const clicks: string[] = []
      for (let i = 0; i < n; i++) {
        const it = page.locator('section[data-panel="bridge:Odprawa"]').first().locator('[data-testid="briefing-item"]').nth(i)
        const label = (await it.innerText()).trim().slice(0, 70)
        const clickable = await it.evaluate((e) => !!(e.closest('button') || e.querySelector('button') || e.tagName === 'BUTTON' || (e as HTMLElement).onclick || getComputedStyle(e).cursor === 'pointer'))
        try {
          await it.click({ timeout: 5000 })
          await page.waitForTimeout(1500)
          clicks.push(`${i} ${label} | klikalna=${clickable} → ${await where(page)}`)
          if (i < 3 || i === 9 || i === 11) await shot(page, `RY.1-klik-${i}`)
        } catch (e) {
          clicks.push(`${i} ${label} | klikalna=${clickable} → BŁĄD ${String(e).slice(0, 120)}`)
        }
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
        await page.keyboard.press('Escape')
        await go(page, '1', 'page-bridge')
      }
      dump('RY.1-klikniecia', clicks)
    })

    // RY.8 / RY.9 – raport wachty i wybór tygodnia.
    await step('wachta', async () => {
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Raport wachty' }).click()
      await page.waitForTimeout(1200)
      const title = async () => (await textOf(page.getByTestId('reports-watch'))).split('\n')[0]
      const w = await text(page, '[data-testid="page-reports"]')
      dump('RY.8-raport', w)
      const days = await page.getByTestId('reports-watch-day').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
      reading('ry', 'RY.8', 'rok, tydzień 26.10–01.11', { tytul: (await title())!, koszty: await textOf(page.getByTestId('reports-watch-costs')), dni: days.join(' · '), killzone: await textOf(page.getByTestId('reports-watch-killzone')), koperty: (await textOf(page.getByTestId('reports-watch-envelopes'))).replace(/\n/g, ' | ') })
      await shot(page, 'RY.8')
      const nav: string[] = [`domyślny: ${await title()}`]
      const later = page.getByText('później ›')
      nav.push(`„później ›” na domyślnym: disabled=${await later.isDisabled().catch(() => 'brak')}`)
      for (let k = 1; k <= 3; k++) {
        await page.getByTestId('reports-watch-prev').click()
        await page.waitForTimeout(700)
        nav.push(`wcześniej ×${k}: ${await title()}`)
      }
      const weekBack = await text(page, '[data-testid="page-reports"]')
      dump('RY.8-tydzien-3-wczesniej', weekBack)
      await go(page, '2', 'page-operations')
      await go(page, '0', 'page-reports')
      nav.push(`po innym ekranie: ${await title()}`)
      nav.push(`„później ›” na cofniętym: disabled=${await later.isDisabled().catch(() => 'brak')}`)
      await page.getByTestId('reports-watch-current').click()
      await page.waitForTimeout(700)
      nav.push(`bieżący: ${await title()}`)
      nav.push(`„później ›” po „bieżący”: disabled=${await later.isDisabled().catch(() => 'brak')}`)
      await later.click({ timeout: 2000 }).catch(() => undefined)
      await page.waitForTimeout(500)
      nav.push(`po kliknięciu „później ›”: ${await title()}`)
      nav.push(`przycisk bieżący: ${await textOf(page.getByTestId('reports-watch-current'))}`)
      dump('RY.9-nawigacja', nav)
      await shot(page, 'RY.9')
    })

    // Dowództwo – oceny dni do porównania z raportem wachty.
    await step('dowodztwo', async () => {
      await go(page, '8', 'page-command')
      await page.waitForTimeout(1500)
      dump('RY.8-dowodztwo', await text(page, '[data-testid="page-command"]'))
      await shot(page, 'RY.8-dowodztwo')
    })

    // RY.19 / RY.20 – debriefing w Raportach.
    await step('debriefing', async () => {
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Debriefing' }).click()
      await page.waitForTimeout(1200)
      const sel = page.getByTestId('reports-debrief-month')
      dump('RY.19-domyslny', { miesiac: await sel.inputValue(), opcje: await sel.evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.value)) })
      for (const m of ['2026-10', '2026-11', '2025-09', '2025-10', '2026-09']) {
        await sel.selectOption(m)
        await page.waitForTimeout(900)
        const t = await textOf(page.getByTestId('reports-debrief'))
        dump(`RY.20-raporty-${m}`, t)
        reading('ry', m === '2026-10' ? 'RY.19' : 'RY.20', `rok, debriefing ${m} (Raporty)`, { tekst: t.replace(/\n/g, ' | ').slice(0, 2500) })
        if (m === '2026-11' || m === '2025-09') await shot(page, `RY.20-raporty-${m}`)
      }
    })

    // RY.23 / RY.24 – przegląd roczny.
    await step('rok', async () => {
      await page.getByRole('radio', { name: 'Przegląd roczny' }).click()
      await page.waitForTimeout(1200)
      const sel = page.getByTestId('reports-year').locator('select').first()
      dump('RY.24-lista', { domyslny: await sel.inputValue(), opcje: await sel.evaluate((s) => Array.from((s as HTMLSelectElement).options).map((o) => o.value)) })
      for (const y of ['2025', '2026']) {
        await sel.selectOption(y)
        await page.waitForTimeout(1200)
        const t = await textOf(page.getByTestId('reports-year'))
        dump(`RY.23-${y}`, t)
        reading('ry', y === '2025' ? 'RY.23' : 'RY.24', `rok, przegląd ${y}`, { tekst: t.replace(/\n/g, ' | ').slice(0, 3000) })
        await shot(page, `RY.23-${y}`)
        await page.getByTestId('reports-year').evaluate((e) => e.scrollIntoView({ block: 'end' }))
        await shot(page, `RY.23-${y}-dol`)
      }
    })

    // RY.21 / RY.20 – Plan miesiąca: debriefing każdego miesiąca.
    await step('plan', async () => {
      await go(page, '4', 'page-month')
      await page.waitForTimeout(1000)
      for (let k = 0; k < 15; k++) {
        const head = (await text(page, '[data-testid="page-month"]')).split('\n').slice(0, 2).join(' ')
        const d = page.getByTestId('month-debrief')
        const plus = page.getByTestId('month-plus')
        const t = (await d.count()) ? await d.first().innerText() : '(brak debriefingu)'
        dump(`RY.21-plan-${String(k).padStart(2, '0')}`, `${head}\n---\n${t}`)
        reading('ry', 'RY.21', `rok, Plan miesiąca: ${head}`, { debriefing: t.replace(/\n/g, ' | ').slice(0, 1500), blokNaPlus: (await plus.count()) ? 'tak' : 'nie' })
        if (k === 1 || (await plus.count()) === 0) await shotEl(d.first(), `RY.21-plan-${String(k).padStart(2, '0')}`).catch(() => undefined)
        await page.getByTestId('month-prev').click()
        await page.waitForTimeout(900)
      }
    })

    dump('zapis-1', await recorded(app))

    // RY.18 – drugi start tego samego dnia (dane komputera zostają).
    await step('drugi-start', async () => {
      await app.close()
      ;({ app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false }))
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(8000)
      dump('RY.18-zapis-drugi-start', await recorded(app))
    })

    // RY.5 – odprawa bez polskiego głosu (głosy pl-* odfiltrowane w oknie, potem przeładowanie okna).
    await step('bez-glosu', async () => {
      await page.addInitScript(() => {
        const orig = speechSynthesis.getVoices.bind(speechSynthesis)
        speechSynthesis.getVoices = () => orig().filter((v) => !v.lang.toLowerCase().startsWith('pl'))
      })
      await page.reload()
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(3000)
      const nv = page.getByTestId('briefing-no-voice')
      dump('RY.5-bez-glosu', { przycisk: await page.getByTestId('briefing-speak').count(), napis: await textOf(nv), dymek: await nv.first().getAttribute('title').catch(() => null) })
      await shotEl(page.locator('section[data-panel="bridge:Odprawa"]').first(), 'RY.5-bez-glosu')
    })
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
