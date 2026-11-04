// PR, przebieg 1 (persona „rok”, odczyt bez zmian w danych): PR.1 (warstwy = salda), PR.2 (cele warstw), PR.3 (zasięg
// i klasa na wszystkich ekranach), PR.4 (rozbicia „skąd ta liczba?”, dymki), PR.7 (pary liczb między ekranami), PR.8
// (Raporty, eksport „Miesiące” CSV / Excel przy ukrytych kwotach, PDF debriefingu M-1). Narzędzie obserwacji – oceny
// w docs/audyt/raport/PR.md. Każdy odczyt liczb – migawka folderu przed odczytem (pr-pomoc.rec).
import { join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { answerDialogs, start, useState } from './lab'
import { breakdowns, EXP, flat, go, out, parseCsv, pdfText, pr1, readAll, readXlsx, rec, screenValues, shipState, snap, stepper, textOf, waitFile, type Screens } from './pr-pomoc'

const RUN = 'pr-1'

test('PR przebieg 1 – persona rok: przekrój liczb (odczyt)', async () => {
  const st = useState('rok', RUN)
  const ctx = { run: RUN, dataDir: st.dataDir, ictjDir: st.ictjDir }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  page.setDefaultTimeout(20_000)
  const dump = out(RUN)
  const step = stepper(dump)
  let s0: Screens | null = null
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(5000)

    // PR.1 / PR.7 – wszystkie ekrany naraz.
    await step('PR.1', async () => {
      await rec(ctx, 'PR.1', 'rok', async () => {
        s0 = await readAll(page, app, ['plan', 'ladownia', 'mapa', 'radar', 'operacje', 'konta', 'szybki'])
        return screenValues(s0)
      })
      dump('PR.1-stan', s0!.mostek.stan)
      dump('PR.1-sprawdzenie', pr1(s0!))
      dump('PR.1-ekrany', s0)
      await snap(page, 'PR.1-rok-mostek')
    })

    // PR.2 / PR.3 / PR.4 – rozbicia na Mostku i dymki.
    await step('PR.4', async () => {
      await go(page, '1', 'page-bridge')
      let b: Record<string, string[]> = {}
      let hints: string[] = []
      await rec(ctx, 'PR.4', 'rok', async () => {
        b = await breakdowns(page)
        hints = await page.getByTestId('page-bridge').locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.split('\n')[0]!.slice(0, 60)} => ${e.getAttribute('title')}`))
        const st2 = await shipState(page)
        return { energia: await textOf(page.getByTestId('bridge-energy')), stan: flat(st2.text), ...Object.fromEntries(Object.entries(b).map(([k, v]) => [`rozbicie_${k}`, v.join(' | ')])), dymki: hints.join(' || ') }
      })
      dump('PR.4-rozbicia', b)
      dump('PR.4-dymki', hints)
      // Panel headers' „?” (Panel hint) on the bridge.
      const qs = page.locator('section[data-panel^="bridge:"] header button, section[data-panel^="bridge:"] [aria-label*="?"], section[data-panel^="bridge:"] [data-testid="panel-hint"]')
      dump('PR.4-naglowki', await qs.evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} | ${e.getAttribute('title') ?? ''} | ${e.getAttribute('aria-label') ?? ''}`)))
      await page.getByTestId('state-range-why').click()
      await page.waitForTimeout(300)
      await snap(page, 'PR.3-rok-zasieg')
      await page.getByTestId('state-range-why').click()
      await page.getByTestId('state-targets-why').click()
      await page.waitForTimeout(300)
      await snap(page, 'PR.2-rok-cele')
      await page.getByTestId('state-targets-why').click()
      await page.getByTestId('bridge-energy-why').click()
      await page.waitForTimeout(300)
      await snap(page, 'PR.4-rok-energia')
      await page.getByTestId('bridge-energy-why').click()
      const del = page.getByTestId('state-delivery-why')
      if (await del.count()) {
        await del.click()
        await page.waitForTimeout(300)
        await snap(page, 'PR.4-rok-dostawa')
        await del.click()
      }
    })

    // PR.3 – zasięg na innych ekranach: Ładownia (symulacja), Raporty (przegląd roczny), Dowództwo, Wywiad.
    await step('PR.3', async () => {
      const v: Record<string, string> = {}
      await rec(ctx, 'PR.3', 'rok', async () => {
        await go(page, '1', 'page-bridge')
        const s = await shipState(page)
        v.mostek = `zasięg ${s.zasieg} · klasa ${s.klasa} · średnie koszty ${s.koszty} · plakietka ${await textOf(page.getByTestId('ship-class'))} (${await page.getByTestId('ship-class').first().getAttribute('title').catch(() => '')})`
        await go(page, '5', 'page-cargo')
        v.ladownia_sym = flat(await textOf(page.getByTestId('cargo-sim')))
        await go(page, '0', 'page-reports')
        await page.getByRole('radio', { name: 'Przegląd roczny' }).click()
        await page.waitForTimeout(800)
        v.raporty_przeglad = flat(await textOf(page.getByTestId('reports-year')))
        await page.getByRole('radio', { name: 'Odprawa' }).click()
        await page.waitForTimeout(600)
        v.raporty_odprawa = flat(await textOf(page.getByTestId('page-reports')))
        await go(page, '8', 'page-command')
        v.dowodztwo = flat(await textOf(page.getByTestId('page-command')))
        await go(page, '9', 'page-intel')
        await page.waitForTimeout(1500)
        v.wywiad = flat(await textOf(page.getByTestId('page-intel')))
        return v
      })
      dump('PR.3-ekrany', v)
      await go(page, '5', 'page-cargo')
      await snap(page, 'PR.3-rok-ladownia')
      await go(page, '8', 'page-command')
      await snap(page, 'PR.3-rok-dowodztwo')
    })

    // PR.8 – Raporty → Debriefing M-1 i M0, Plan miesiąca → Debriefing, eksport przy ukrytych kwotach, PDF M-1.
    await step('PR.8', async () => {
      const v: Record<string, string> = {}
      await rec(ctx, 'PR.8', 'rok', async () => {
        await go(page, '4', 'page-month')
        v.plan_debriefing = flat(await textOf(page.getByTestId('month-debrief')))
        await go(page, '0', 'page-reports')
        await page.getByRole('radio', { name: 'Debriefing' }).click()
        await page.waitForTimeout(800)
        const opts = await page.getByTestId('reports-debrief-month').locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
        v.raporty_miesiace = opts.join(',')
        for (const m of ['2026-10', '2026-11', '2025-09', '2025-08']) {
          if (!opts.includes(m)) {
            v[`raporty_${m}`] = '(brak w liście)'
            continue
          }
          await page.getByTestId('reports-debrief-month').selectOption(m)
          await page.waitForTimeout(700)
          v[`raporty_${m}`] = flat(await textOf(page.getByTestId('reports-debrief')))
        }
        return v
      })
      dump('PR.8-ekrany', v)
      await page.getByTestId('reports-debrief-month').selectOption('2026-10')
      await page.waitForTimeout(500)
      await snap(page, 'PR.8-raporty-2026-10')
      // PDF of M-1 (amounts shown).
      const pdf = join(EXP, 'pr-1-debriefing-2026-10.pdf')
      await answerDialogs(app, { savePath: pdf })
      await page.getByTestId('reports-debrief-pdf').click()
      dump('PR.8-pdf', { plik: pdf, ok: await waitFile(pdf) })
      await page.waitForTimeout(1500)
      // Hidden amounts (Ctrl+$) – the screen masked, the export with real amounts.
      await page.keyboard.press('Control+Shift+4')
      await page.waitForTimeout(600)
      dump('PR.8-ukryte-ekran', flat(await textOf(page.getByTestId('reports-debrief'))).slice(0, 600))
      await snap(page, 'PR.8-ukryte-raporty')
      await page.getByRole('radio', { name: 'Eksport' }).click()
      await page.waitForTimeout(700)
      dump('PR.8-eksport-panel', flat(await textOf(page.getByTestId('page-reports'))))
      const csv = join(EXP, 'pr-1-miesiace-ukryte.csv')
      await answerDialogs(app, { savePath: csv })
      await page.getByTestId('export-months-csv').click()
      const okCsv = await waitFile(csv)
      await page.waitForTimeout(1200)
      const xlsx = join(EXP, 'pr-1-ukryte.xlsx')
      await answerDialogs(app, { savePath: xlsx })
      await page.getByTestId('export-xlsx').click()
      const okX = await waitFile(xlsx)
      await page.waitForTimeout(1500)
      // The PDF with hidden amounts too.
      await page.getByRole('radio', { name: 'Debriefing' }).click()
      await page.getByTestId('reports-debrief-month').selectOption('2026-10')
      await page.waitForTimeout(500)
      const pdfH = join(EXP, 'pr-1-debriefing-2026-10-ukryte.pdf')
      await answerDialogs(app, { savePath: pdfH })
      await page.getByTestId('reports-debrief-pdf').click()
      const okPH = await waitFile(pdfH)
      await page.waitForTimeout(1500)
      await page.keyboard.press('Control+Shift+4')
      await page.waitForTimeout(500)
      dump('PR.8-pliki', { csv: okCsv, xlsx: okX, pdfUkryte: okPH })
      if (okCsv) {
        const rows = parseCsv(readFileSync(csv, 'utf8'))
        dump('PR.8-csv', rows.map((r) => r.join(' ; ')).join('\n'))
      }
      if (okX) {
        const sheets = readXlsx(xlsx, join(EXP, 'pr-1-ukryte-xlsx'))
        for (const [n, rows] of Object.entries(sheets)) if (/Miesi/i.test(n)) dump(`PR.8-xlsx-${n}`, rows.map((r) => r.join(' ; ')).join('\n'))
        dump('PR.8-xlsx-arkusze', Object.keys(sheets))
      }
      for (const f of [pdf, pdfH]) {
        try {
          const t = pdfText(f)
          writeFileSync(`${f}.txt`, t)
          dump(`PR.8-pdf-tekst-${f.endsWith('ukryte.pdf') ? 'ukryte' : 'jawne'}`, t)
        } catch (e) {
          dump('PR.8-pdf-blad', String(e).slice(0, 500))
        }
      }
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
