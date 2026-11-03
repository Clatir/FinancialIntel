// RE, przebieg 1 (stan rok+re): eksporty CSV / Excel / ZIP okresu od 01.08.2025, odczyt ekranów do porównania z plikami
// (Operacje – pasek sum; debriefing każdego miesiąca), eksport z ukrytymi kwotami (RE.11), PDF debriefingu i przeglądu rocznego.
import { writeFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { reading, text } from './lab'
import { answerSave, EXPORT, go, goReports, run, say, snap, special, step, toasts, waitFile } from './re-pomoc'

const dateIn = async (page: import('@playwright/test').Page, id: string, v: string) => {
  const f = page.getByTestId(id)
  await f.click()
  await f.fill(v)
  await f.press('Enter')
  await page.waitForTimeout(300)
}

async function exportAll(page: import('@playwright/test').Page, app: import('@playwright/test').ElectronApplication, prefix: string, which = ['ops', 'months', 'xlsx', 'zip']): Promise<void> {
  const defs: Record<string, [string, string]> = { ops: ['export-operations-csv', 'csv'], months: ['export-months-csv', 'csv'], xlsx: ['export-xlsx', 'xlsx'], zip: ['export-zip', 'zip'] }
  for (const k of which) {
    const [id, ext] = defs[k]!
    const f = `${EXPORT}\\${prefix}-${k}.${ext}`
    await answerSave(app, f)
    await page.getByTestId(id).click()
    const ok = await waitFile(f, 60_000)
    await page.waitForTimeout(1200)
    console.log(`[eksport] ${f} ${ok ? 'ok' : 'BRAK'} toast=${JSON.stringify(await toasts(page))}`)
  }
}

test('RE.4–RE.8, RE.11, RE.12: eksporty i ekrany', async () => {
  const r = await run('re-1', special)
  const { page, app, errors } = r
  try {
    // ---- Operacje: the sums bar for the same period
    await go(page, '2', 'page-operations')
    await page.getByTestId('operations-period-menu').click()
    const inputs = page.locator('input[type="date"]')
    await inputs.nth(0).fill('2025-08-01')
    await inputs.nth(1).fill('2026-11-03')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1000)
    const bar1 = (await text(page, '[data-testid="operations-sums"]')).replace(/\n+/g, ' | ')
    say('RE.5 Operacje 01.08.2025–03.11.2026', { okres: await page.getByTestId('operations-period').innerText(), pasek: bar1 })
    await snap(page, 'RE.5-operacje-okres')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.waitForTimeout(800)
    const bar2 = (await text(page, '[data-testid="operations-sums"]')).replace(/\n+/g, ' | ')
    say('RE.5 Operacje cała historia', bar2)
    reading('re', 'RE.5', 'rok+re', { okres: bar1, cala_historia: bar2 })

    // ---- Exports of the period from 01.08.2025
    await goReports(page, 'Eksport')
    await dateIn(page, 'export-from', '01.08.2025')
    say('RE.5 pola eksportu', { od: await page.getByTestId('export-from').inputValue(), do: await page.getByTestId('export-to').inputValue() })
    await exportAll(page, app, 're-1')

    // ---- Debriefing of every month: the lines of the screen
    await goReports(page, 'Debriefing')
    const options = await page.getByTestId('reports-debrief-month').locator('option').evaluateAll((os) => os.map((o) => ({ v: (o as HTMLOptionElement).value, t: o.textContent })))
    const all: Record<string, string> = {}
    for (const o of options) {
      await page.getByTestId('reports-debrief-month').selectOption(o.v)
      await page.waitForTimeout(300)
      all[o.v] = await text(page, '[data-testid="reports-debrief"]')
    }
    writeFileSync(`${EXPORT}\\re-1-debriefingi.json`, JSON.stringify(all, null, 1))
    say('RE.7 debriefingi', `${options.length} miesięcy zapisanych do re-1-debriefingi.json`)

    // ---- Hidden amounts (RE.11)
    await page.keyboard.press('Control+Shift+4')
    await page.waitForTimeout(500)
    say('RE.11 po ukryciu – debriefing na ekranie', (await text(page, '[data-testid="reports-debrief"]')).slice(0, 300).replace(/\n+/g, ' | '))
    await snap(page, 'RE.11-ukryte-debriefing')
    await goReports(page, 'Eksport')
    say('RE.11 panel Eksport przy ukrytych', (await text(page, '[data-testid="reports-export"]')).replace(/\n+/g, ' | '))
    await snap(page, 'RE.11-ukryte-eksport')
    await exportAll(page, app, 're-1-ukryte', ['ops', 'months', 'xlsx'])
    await page.keyboard.press('Control+Shift+4')
    await page.waitForTimeout(500)

    // ---- PDFs (RE.10)
    await goReports(page, 'Debriefing')
    await page.getByTestId('reports-debrief-month').selectOption('2026-10')
    for (const [m, name] of [['2026-10', 'debriefing-2026-10'], ['2026-09', 'debriefing-2026-09'], ['2025-09', 'debriefing-2025-09']] as const) {
      await page.getByTestId('reports-debrief-month').selectOption(m)
      await page.waitForTimeout(400)
      const f = `${EXPORT}\\re-1-${name}.pdf`
      await answerSave(app, f)
      await page.getByTestId('reports-debrief-pdf').click()
      const ok = await waitFile(f, 60_000)
      await page.waitForTimeout(1500)
      console.log(`[pdf] ${f} ${ok ? 'ok' : 'BRAK'} ${JSON.stringify(await toasts(page))}`)
    }
    await goReports(page, 'Przegląd roczny')
    const yearScreen = await text(page, '[data-testid="reports-year"]')
    writeFileSync(`${EXPORT}\\re-1-przeglad-2026-ekran.txt`, yearScreen)
    for (const y of ['2026', '2025']) {
      await page.getByLabel('Rok przeglądu').selectOption(y)
      await page.waitForTimeout(400)
      writeFileSync(`${EXPORT}\\re-1-przeglad-${y}-ekran.txt`, await text(page, '[data-testid="reports-year"]'))
      const f = `${EXPORT}\\re-1-przeglad-${y}.pdf`
      await answerSave(app, f)
      await page.getByTestId('reports-year-pdf').click()
      const ok = await waitFile(f, 60_000)
      await page.waitForTimeout(1500)
      console.log(`[pdf] ${f} ${ok ? 'ok' : 'BRAK'}`)
    }
    // Hidden amounts: PDF of the debriefing again.
    await page.keyboard.press('Control+Shift+4')
    await goReports(page, 'Debriefing')
    await page.getByTestId('reports-debrief-month').selectOption('2026-10')
    const fh = `${EXPORT}\\re-1-ukryte-debriefing-2026-10.pdf`
    await answerSave(app, fh)
    await page.getByTestId('reports-debrief-pdf').click()
    await waitFile(fh, 60_000)
    await page.waitForTimeout(1500)
    await goReports(page, 'Przegląd roczny')
    await page.getByLabel('Rok przeglądu').selectOption('2026')
    const fy = `${EXPORT}\\re-1-ukryte-przeglad-2026.pdf`
    await answerSave(app, fy)
    await page.getByTestId('reports-year-pdf').click()
    await waitFile(fy, 60_000)
    await page.waitForTimeout(1500)
    await page.keyboard.press('Control+Shift+4')
    say('errors', errors)
  } finally {
    await app.close()
  }
})
