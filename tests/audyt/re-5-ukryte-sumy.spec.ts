// RE.11 (eksport przy ukrytych kwotach: te same zakresy, jawne i ukryte), RE.14 (sumy eksportu = ekrany, wrzesień i
// październik 2026 na „rok”), RE.2 (odprawa bez alarmów na kopii „start” z potwierdzonymi saldami).
import { writeFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { reading, start, text, useState } from './lab'
import { addRecords, answerSave, EXPORT, go, goReports, run, say, snap, special, waitFile } from './re-pomoc'

const dateIn = async (page: Page, id: string, v: string) => {
  const f = page.getByTestId(id)
  await f.click()
  await f.fill(v)
  await f.press('Enter')
  await page.waitForTimeout(300)
}
const flat = (s: string) => s.replace(/\n+/g, ' | ')

test('RE.11 pliki jawne i przy ukrytych kwotach', async () => {
  const r = await run('re-5', special)
  const { page, app, errors } = r
  try {
    await goReports(page, 'Eksport')
    await dateIn(page, 'export-from', '01.08.2025')
    const defs: Array<[string, string, string]> = [['ops', 'export-operations-csv', 'csv'], ['months', 'export-months-csv', 'csv'], ['xlsx', 'export-xlsx', 'xlsx']]
    const doAll = async (prefix: string) => {
      for (const [k, id, ext] of defs) {
        const f = `${EXPORT}\\re-5-${prefix}-${k}.${ext}`
        await answerSave(app, f)
        await page.getByTestId(id).click()
        await waitFile(f)
        await page.waitForTimeout(1000)
      }
    }
    await doAll('jawne')
    await page.keyboard.press('Control+Shift+4')
    await page.waitForTimeout(600)
    say('RE.11 ekran Eksport po ukryciu', { od: await page.getByTestId('export-from').inputValue(), do: await page.getByTestId('export-to').inputValue(), tekst: flat(await text(page, '[data-testid="reports-export"]')) })
    await snap(page, 'RE.11-eksport-ukryte')
    await doAll('ukryte')
    // Debriefing + year PDFs, shown and hidden (the hidden state is still on).
    const pdfs = async (prefix: string) => {
      await goReports(page, 'Debriefing')
      await page.getByTestId('reports-debrief-month').selectOption('2026-10')
      const f = `${EXPORT}\\re-5-${prefix}-debriefing.pdf`
      await answerSave(app, f)
      await page.getByTestId('reports-debrief-pdf').click()
      await waitFile(f, 60_000)
      await page.waitForTimeout(1500)
      await goReports(page, 'Przegląd roczny')
      await page.getByLabel('Rok przeglądu').selectOption('2026')
      const g = `${EXPORT}\\re-5-${prefix}-przeglad.pdf`
      await answerSave(app, g)
      await page.getByTestId('reports-year-pdf').click()
      await waitFile(g, 60_000)
      await page.waitForTimeout(1500)
    }
    await pdfs('ukryte')
    await page.keyboard.press('Control+Shift+4')
    await page.waitForTimeout(600)
    await pdfs('jawne')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('RE.14 sumy: wrzesień i październik 2026 na ekranach', async () => {
  const r = await run('re-6')
  const { page, app, errors } = r
  const out: Record<string, unknown> = {}
  try {
    // Eksport: months CSV and ops CSV from 01.08.2025.
    await goReports(page, 'Eksport')
    await dateIn(page, 'export-from', '01.08.2025')
    for (const [k, id, ext] of [['months', 'export-months-csv', 'csv'], ['ops', 'export-operations-csv', 'csv']] as const) {
      const f = `${EXPORT}\\re-6-${k}.${ext}`
      await answerSave(app, f)
      await page.getByTestId(id).click()
      await waitFile(f)
      await page.waitForTimeout(1000)
    }
    // Raporty → Debriefing for both months, and their PDFs.
    await goReports(page, 'Debriefing')
    for (const m of ['2026-09', '2026-10']) {
      await page.getByTestId('reports-debrief-month').selectOption(m)
      await page.waitForTimeout(400)
      out[`debriefing_${m}`] = flat(await text(page, '[data-testid="reports-debrief"]')).split('WYNIK WOBEC PLANU')[1]?.slice(0, 900)
      const f = `${EXPORT}\\re-6-debriefing-${m}.pdf`
      await answerSave(app, f)
      await page.getByTestId('reports-debrief-pdf').click()
      await waitFile(f, 60_000)
      await page.waitForTimeout(1500)
    }
    // Plan miesiąca – debriefing of each.
    await go(page, '4', 'page-month')
    for (let i = 0; i < 3; i++) {
      const label = await page.getByTestId('month-label').innerText()
      const deb = await page.getByTestId('month-debrief').innerText().catch(() => '(brak)')
      if (/wrzesie|październik/i.test(label)) out[`plan_${label}`] = flat(deb).slice(0, 1200)
      say(`RE.14 Plan miesiąca – ${label}`, flat(deb).slice(0, 700))
      await page.getByTestId('month-prev').click()
      await page.waitForTimeout(500)
    }
    out.przychody_panel = '(brak panelu Przychody na ekranach 4, 5, 9)'
    for (const key of ['4', '5', '9']) {
      await page.keyboard.press(`Control+${key}`)
      await page.waitForTimeout(900)
      if (await page.getByTestId('income-panel').count()) {
        out.przychody_panel = `ekran Ctrl+${key}: ${flat(await text(page, '[data-testid="income-panel"]'))}`
        break
      }
    }
    say('RE.14 panel Przychody', out.przychody_panel)
    // Wywiad: spending table and fuel.
    await go(page, '9', 'page-intel')
    for (const label of ['3 mies.', '6 mies.', '12 mies.']) void label
    const seg = page.getByRole('radio')
    out.wywiad_okresy = await seg.allInnerTexts()
    say('RE.14 Wywiad – przełącznik okresu', out.wywiad_okresy)
    await seg.filter({ hasText: /^3/ }).first().click().catch(() => undefined)
    await page.waitForTimeout(800)
    out.wydatki_w_czasie = flat(await text(page, '[data-testid="intel-spending"]'))
    out.bilans_paliwa = (await page.getByTestId('intel-fuel-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
    say('RE.14 Wydatki w czasie (3 mies.)', (out.wydatki_w_czasie as string).slice(0, 200) + ' … ' + (out.wydatki_w_czasie as string).slice(-300))
    say('RE.14 Bilans paliwa wiersze', out.bilans_paliwa)
    await snap(page, 'RE.14-wywiad')
    // Raport wachty: every week back from the current one; the days with their costs.
    await goReports(page, 'Raport wachty')
    const days: Record<string, string> = {}
    const weeks: string[] = []
    for (let i = 0; i < 14; i++) {
      const title = await page.getByTestId('reports-watch').innerText().then((t) => t.split('\n')[0]!)
      const m = /(\d\d)\.(\d\d)\.(\d{4}) – (\d\d)\.(\d\d)\.(\d{4})/.exec(title)
      const rows = await page.getByTestId('reports-watch-day').allInnerTexts()
      const costs = await page.getByTestId('reports-watch-costs').innerText()
      weeks.push(`${title} | koszty tygodnia ${costs}`)
      for (const row of rows) {
        const p = row.replace(/\s+/g, ' ').trim().split(' ')
        const dm = /(\d\d)\.(\d\d)/.exec(p[1] ?? '')
        if (!dm || !m) continue
        const monday = new Date(Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!))
        // The year of the day: the Monday's, or the next when the week crosses New Year.
        const year = +dm[2]! < +m[2]! ? +m[3]! + 1 : +m[3]!
        days[`${year}-${dm[2]}-${dm[1]}`] = p.slice(2, -1).join(' ')
        void monday
      }
      await page.getByTestId('reports-watch-prev').click()
      await page.waitForTimeout(250)
    }
    out.tygodnie = weeks
    out.dni = days
    writeFileSync(`${EXPORT}\\re-6-ekrany.json`, JSON.stringify(out, null, 1))
    reading('re', 'RE.14', 'rok', { ekrany: 're-6-ekrany.json', wywiad_razem: (out.wydatki_w_czasie as string).slice(-200), paliwo: JSON.stringify(out.bilans_paliwa) })
    say('RE.14 tygodnie', weeks)
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('RE.2 odprawa bez alarmów (start, salda potwierdzone)', async () => {
  const st = useState('start', 're-7')
  const at = '2026-11-03T08:00:00.000Z'
  void at
  const bal = [['01KDEFACC00000000000000001', 7207356], ['01KDEFACC00000000000000002', 245000], ['01KDEFACC00000000000000003', 18000]] as const
  addRecords(st.dataDir, 'balances', bal.map(([accountId, amount]) => ({ date: '2026-11-03', accountId, kind: 'confirmation', amount, correctionId: null, note: '' })))
  const r = await start('re-7', { dataDir: st.dataDir, ictjDir: st.ictjDir })
  r.page.setDefaultTimeout(15_000)
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r.page.waitForTimeout(3000)
    const od = r.page.locator('section[data-panel="bridge:Odprawa"]').first()
    say('RE.2 Mostek (start + potwierdzone salda)', flat(await od.innerText().catch(() => '(brak)')))
    await goReports(r.page, 'Odprawa')
    say('RE.2 Raporty', flat(await r.page.getByTestId('reports-briefing').innerText()))
    await snap(r.page, 'RE.2-bez-alarmow')
  } finally {
    await r.app.close()
  }
})
