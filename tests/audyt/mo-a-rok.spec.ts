// MO, przebieg A (persona „rok”, tylko odczyt): Mostek, rozbicia „skąd ta liczba?”, panele, ekrany źródłowe do porównań,
// słowniczek, potem kliknięcia pozycji odprawy (MO.10). Narzędzie obserwacji – oceny w docs/audyt/raport/MO.md.
import { test } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { briefingItems, colorOf, go, out, textOf, where } from './mo-pomoc'

const RUN = 'mo-a'

test('MO przebieg A – Mostek persony rok (odczyt)', async () => {
  const st = useState('rok', RUN)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
    }
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    dump('mostek-caly', await text(page))
    await shot(page, 'MO-a-mostek')
    const bridge = page.getByTestId('page-bridge')

    // MO.2 – energia, podpis, nagłówek.
    await step('energia', async () => {
      const head = await textOf(page.locator('section[data-panel="bridge:Odprawa"] header, section[data-panel="bridge:Odprawa"] [class*="label"]'))
      const energy = await textOf(page.getByTestId('bridge-energy'))
      const why = await textOf(page.getByTestId('bridge-energy-why'))
      const ecol = await colorOf(page.getByTestId('bridge-energy'))
      const bias = await textOf(page.getByTestId('bridge-bias'))
      const bcol = await colorOf(page.getByTestId('bridge-bias'))
      const panelTitle = await page.locator('section[data-panel="bridge:Odprawa"]').first().evaluate((e) => (e as HTMLElement).innerText.split('\n')[0])
      dump('MO.2-energia', { panelTitle, head, energy, ecol, why, bias, bcol })
      reading('mo', 'MO.2', 'rok', { naglowek: panelTitle, energia: energy, podpis: why })
      reading('mo', 'MO.8', 'rok', { bias, energia: energy, podpis: why })
    })

    // MO.5 – rozbicie energii.
    await step('energia-why', async () => {
      await page.getByTestId('bridge-energy-why').click()
      await page.waitForTimeout(300)
      const lines = await page.getByTestId('bridge-energy-lines').locator('[data-testid="why-line"]').allInnerTexts()
      dump('MO.5-rozbicie', lines)
      await shot(page, 'MO.5')
      reading('mo', 'MO.5', 'rok', Object.fromEntries(lines.map((l, i) => [`${i}`, l.replace(/\s+/g, ' ')])))
      await page.getByTestId('bridge-energy-why').click()
      await page.waitForTimeout(300)
      dump('MO.5-po-zwin', { lines: await page.getByTestId('bridge-energy-lines').count(), label: await textOf(page.getByTestId('bridge-energy-why')) })
    })

    // MO.9 / 11–15 – odprawa (pozycje, kolory).
    await step('odprawa', async () => {
      const items = await briefingItems(page.locator('section[data-panel="bridge:Odprawa"]').first())
      dump('MO.9-odprawa', items)
      reading('mo', 'MO.9', 'rok', Object.fromEntries(items.map((it, i) => [`${i}:${it.kind}`, it.text])))
      dump('MO.17-przycisk', {
        speak: await page.getByTestId('briefing-speak').count(),
        speakText: await textOf(page.getByTestId('briefing-speak')),
        speakTitle: await page.getByTestId('briefing-speak').first().getAttribute('title').catch(() => null),
        noVoice: await textOf(page.getByTestId('briefing-no-voice')),
        noVoiceTitle: await page.getByTestId('briefing-no-voice').first().getAttribute('title').catch(() => null),
        voices: await page.evaluate(() => speechSynthesis.getVoices().map((v) => `${v.name} ${v.lang}`))
      })
    })

    // MO.20–24 – Stan okrętu.
    await step('stan', async () => {
      const state = page.locator('section[data-panel="bridge:Stan okrętu"]').first()
      dump('MO.20-stan', await state.innerText())
      await shot(page, 'MO.20')
      const titles = await state.locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.split('\n')[0]} => ${e.getAttribute('title')}`))
      dump('MO.20-dymki', titles)
      const lines = await state.locator('[data-testid^="state-"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
      dump('MO.20-linie', lines)
      reading('mo', 'MO.20', 'rok', { stan: (await state.innerText()).replace(/\s+/g, ' ') })
      // Kolor masy ładunku i kafelki.
      dump('MO.24-masa', { kafelek: await textOf(state.getByText('Masa ładunku').locator('..')), kolor: await colorOf(state.getByText('Masa ładunku').locator('..').locator('span').nth(1)) })
      dump('MO.23-klasa', {
        plakietka: await textOf(page.getByTestId('ship-class')),
        dymek: await page.getByTestId('ship-class').first().getAttribute('title').catch(() => null),
        kafelekKlasa: await textOf(state.getByText('Klasa', { exact: true }).locator('..'))
      })
      // MO.6 – zasięg, cele; jedno rozbicie naraz.
      await page.getByTestId('state-range-why').click()
      await page.waitForTimeout(300)
      const range = await page.getByTestId('state-range-lines').locator('[data-testid="why-line"]').allInnerTexts()
      await page.getByTestId('state-targets-why').click()
      await page.waitForTimeout(300)
      const targets = await page.getByTestId('state-targets-lines').locator('[data-testid="why-line"]').allInnerTexts()
      const openBoth = { range: await page.getByTestId('state-range-lines').count(), targets: await page.getByTestId('state-targets-lines').count() }
      await shot(page, 'MO.6')
      dump('MO.6-rozbicia', { range, targets, openBoth })
      reading('mo', 'MO.6', 'rok', { zasieg: range.join(' | ').replace(/\s+/g, ' '), cele: targets.join(' | ').replace(/\s+/g, ' ') })
      // MO.7 – ostatnia dostawa.
      const del = page.getByTestId('state-delivery-why')
      if (await del.count()) {
        const label = await del.innerText()
        await del.click()
        await page.waitForTimeout(300)
        const lines7 = await page.getByTestId('state-delivery-lines').locator('[data-testid="why-line"]').allInnerTexts()
        dump('MO.7-dostawa', { label, lines7, openOthers: { range: await page.getByTestId('state-range-lines').count(), targets: await page.getByTestId('state-targets-lines').count() } })
        await shot(page, 'MO.7')
        reading('mo', 'MO.7', 'rok', { etykieta: label, linie: lines7.join(' | ').replace(/\s+/g, ' ') })
        await del.click()
      } else dump('MO.7-dostawa', 'brak przycisku ostatniej dostawy')
    })

    // MO.25 – koperty (z kolorami).
    await step('koperty', async () => {
      const env = page.locator('section[data-panel="bridge:Koperty"]').first()
      dump('MO.25-koperty', await env.innerText())
      const html = await env.evaluate((e) =>
        Array.from(e.querySelectorAll('*'))
          .filter((x) => x.children.length === 0 && (x as HTMLElement).innerText?.trim())
          .map((x) => `${(x as HTMLElement).innerText.trim()} [${getComputedStyle(x).color}]`)
      )
      dump('MO.25-koperty-kolory', html)
      const hint = await env.locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} => ${e.getAttribute('title')}`))
      dump('MO.33-koperty-hint', hint)
      await env.screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.25.png' })
      reading('mo', 'MO.25', 'rok', { koperty: (await env.innerText()).replace(/\s+/g, ' ') })
    })

    // MO.26 – rozliczenia; MO.27 – przychody; MO.28 – dokowanie; MO.30 – krzywa; MO.31 – ostatnie operacje.
    await step('panele', async () => {
      const rec = page.locator('section[data-panel="bridge:Rozliczenia z domownikami"]').first()
      dump('MO.26-rozliczenia', await rec.innerText())
      reading('mo', 'MO.26', 'rok', { panel: (await rec.innerText()).replace(/\s+/g, ' ') })
      const inc = page.getByTestId('bridge-income')
      dump('MO.27-przychody', await textOf(inc))
      reading('mo', 'MO.27', 'rok', { panel: (await textOf(inc)).replace(/\s+/g, ' ') })
      const dock = page.locator('section[data-panel^="bridge:Dokowanie"]').first()
      dump('MO.28-dokowanie', { text: await dock.innerText().catch(() => '(brak)'), hints: await dock.locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} => ${e.getAttribute('title')}`)).catch(() => []) })
      const wealth = page.getByTestId('bridge-wealth')
      dump('MO.30-krzywa', await textOf(wealth))
      await wealth.screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.30.png' }).catch(() => undefined)
      reading('mo', 'MO.30', 'rok', { podpis: (await textOf(wealth)).replace(/\s+/g, ' ') })
      const recent = page.locator('[data-testid="bridge-recent-row"]')
      const rows = []
      for (let i = 0; i < (await recent.count()); i++) rows.push(`${(await recent.nth(i).innerText()).replace(/\s+/g, ' ')} [${await colorOf(recent.nth(i).locator('span').nth(3))}]`)
      dump('MO.31-ostatnie', rows)
      await page.locator('section[data-panel="bridge:Ostatnie operacje"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.31.png' }).catch(() => undefined)
    })

    // Ekrany źródłowe (porównania): Plan miesiąca, Ładownia, Mapa gwiezdna, Radar, Dowództwo, Wywiad, Raporty, Ustawienia.
    await step('plan', async () => {
      await go(page, '4', 'page-month')
      dump('ekran-plan', await text(page, '[data-testid="page-month"]'))
      await shot(page, 'MO-a-plan')
      reading('mo', 'MO.34', 'rok', { ekran: 'Plan miesiąca', energia: await textOf(page.getByTestId('month-energy-today')) })
    })
    await step('ladownia', async () => {
      await go(page, '5', 'page-cargo')
      dump('ekran-ladownia', await text(page, '[data-testid="page-cargo"]'))
      await shot(page, 'MO-a-ladownia')
    })
    await step('mapa', async () => {
      await go(page, '6', 'page-starmap')
      dump('ekran-mapa', await text(page, '[data-testid="page-starmap"]'))
    })
    await step('radar', async () => {
      await go(page, '7', 'page-radar')
      dump('ekran-radar', await text(page, '[data-testid="page-radar"]'))
      await shot(page, 'MO-a-radar')
    })
    await step('dowodztwo', async () => {
      await go(page, '8', 'page-command')
      dump('ekran-dowodztwo', await text(page, '[data-testid="page-command"]'))
    })
    await step('wywiad', async () => {
      await go(page, '9', 'page-intel')
      await page.waitForTimeout(1500)
      dump('ekran-wywiad', await text(page, '[data-testid="page-intel"]'))
      await shot(page, 'MO-a-wywiad')
    })
    await step('raporty', async () => {
      await go(page, '0', 'page-reports')
      dump('ekran-raporty', await text(page, '[data-testid="page-reports"]'))
      dump('MO.8-raporty-bias', await textOf(page.getByTestId('reports-briefing-bias')))
      reading('mo', 'MO.34', 'rok', { ekran: 'Raporty', odprawa: await textOf(page.getByTestId('reports-briefing')) })
    })
    await step('ustawienia', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-accounts').click()
      await page.waitForTimeout(600)
      dump('ekran-ustawienia-konta', await text(page, 'main'))
      await page.getByTestId('settings-tab-household').click()
      await page.waitForTimeout(600)
      dump('ekran-ustawienia-domownicy', await text(page, 'main'))
      await page.getByTestId('settings-tab-ictj').click()
      await page.waitForTimeout(600)
      dump('ekran-ustawienia-ictj', await text(page, 'main'))
    })
    await step('operacje', async () => {
      await go(page, '2', 'page-operations')
      await page.waitForTimeout(1500)
      dump('ekran-operacje', (await text(page, '[data-testid="page-operations"]')).slice(0, 6000))
    })
    // MO.33 – słowniczek (F1).
    await step('slowniczek', async () => {
      await go(page, '1', 'page-bridge')
      await page.keyboard.press('F1')
      await page.getByTestId('shortcuts-glossary').waitFor({ timeout: 10_000 })
      dump('MO.33-slowniczek', await page.getByTestId('glossary-term').allInnerTexts())
      await shot(page, 'MO.33')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    })

    // MO.10 – kliknięcie każdej pozycji odprawy.
    await step('MO.10', async () => {
      const n = await page.locator('section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"]').count()
      const res: string[] = []
      for (let i = 0; i < n; i++) {
        await go(page, '1', 'page-bridge')
        const it = page.locator('section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"]').nth(i)
        const label = `${await it.getAttribute('data-kind')}: ${(await it.innerText()).slice(0, 90)}`
        await it.click()
        await page.waitForTimeout(1500)
        const w = await where(page)
        // A selected / focused record (Operacje, Ładownia): aria-selected or data-selected.
        const sel = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[aria-selected="true"], [data-selected="true"], [data-focused="true"], [data-state="selected"], .ring-accent'))
            .map((e) => (e as HTMLElement).innerText.slice(0, 120).replace(/\s+/g, ' '))
            .slice(0, 3)
        )
        const tab = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="settings-tab-"][aria-selected="true"], [data-testid^="settings-tab-"][data-active="true"]')).map((e) => e.getAttribute('data-testid')))
        res.push(`${i} ${label}\n   -> ${w} sel=${JSON.stringify(sel)} tab=${JSON.stringify(tab)}`)
        await shot(page, `MO.10-${i}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
        await page.keyboard.press('Escape')
      }
      dump('MO.10-klikniecia', res.join('\n'))
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
