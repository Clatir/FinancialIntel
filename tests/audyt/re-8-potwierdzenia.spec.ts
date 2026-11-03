// RE: drugi, świeży przebieg dla NIEZGODNE – RE.5 (paragon dzielony w CSV), RE.15 (odwrócone daty), RE.14 (Przychody 12 mies.).
import { test } from '@playwright/test'
import { reading } from './lab'
import { answerSave, EXPORT, go, goReports, readCsv, run, say, special, toasts, waitFile } from './re-pomoc'

const dateIn = async (page: import('@playwright/test').Page, id: string, v: string) => {
  const f = page.getByTestId(id)
  await f.click()
  await f.fill(v)
  await f.press('Enter')
  await page.waitForTimeout(300)
}

test('RE.5 / RE.15 / RE.14 – potwierdzenie na świeżym przebiegu', async () => {
  const r = await run('re-10', special)
  const { page, app, errors } = r
  try {
    await goReports(page, 'Eksport')
    // RE.5: the receipt in the file.
    await dateIn(page, 'export-from', '01.10.2026')
    const f = `${EXPORT}\\re-10-ops.csv`
    await answerSave(app, f)
    await page.getByTestId('export-operations-csv').click()
    await waitFile(f)
    const c = readCsv(f)
    say('RE.5 potw. – paragon w pliku', c.rows.filter((x) => /Carrefour/.test(x[6]!)).map((x) => x.join(' ¦ ')))
    // RE.15: reversed days.
    await dateIn(page, 'export-from', '31.10.2026')
    await dateIn(page, 'export-to', '01.10.2026')
    const g = `${EXPORT}\\re-10-odwrocone.csv`
    await answerSave(app, g)
    await page.getByTestId('export-operations-csv').click()
    await waitFile(g)
    await page.waitForTimeout(800)
    const o = readCsv(g)
    say('RE.15 potw. – odwrócone daty', { wierszy: o.rows.length, toast: await toasts(page), pola: [await page.getByTestId('export-from').inputValue(), await page.getByTestId('export-to').inputValue()] })
    // Reversed across months: months CSV.
    await page.waitForTimeout(6500)
    await dateIn(page, 'export-from', '31.12.2025')
    await dateIn(page, 'export-to', '01.10.2026')
    const h = `${EXPORT}\\re-10-odwrocone-mies.csv`
    await answerSave(app, h)
    await page.getByTestId('export-months-csv').click()
    await waitFile(h)
    const mm = readCsv(h)
    say('RE.15 potw. – Miesiące CSV, Od 31.12.2025 Do 01.10.2026 (to nie jest odwrócone dla miesięcy)', { wierszy: mm.rows.length, pierwszy: mm.rows[0]?.[0], ostatni: mm.rows.at(-1)?.[0] })
    // Reversed across months, the other way: Od 15.10.2026 Do 15.09.2026.
    await page.waitForTimeout(6500)
    await dateIn(page, 'export-from', '15.10.2026')
    await dateIn(page, 'export-to', '15.09.2026')
    const k = `${EXPORT}\\re-10-odwrocone-mies2.csv`
    await answerSave(app, k)
    await page.getByTestId('export-months-csv').click()
    await waitFile(k)
    const m2 = readCsv(k)
    say('RE.15 potw. – Miesiące CSV, Od 15.10.2026 Do 15.09.2026', { wierszy: m2.rows.length, wiersze: m2.rows.map((x) => x[0]) })
    // RE.14: Przychody panel.
    await go(page, '1', 'page-bridge')
    const b = (await page.getByTestId('bridge-income').innerText()).replace(/\n+/g, ' | ')
    say('RE.14 potw. – Przychody na Mostku (stan rok+re)', b)
    reading('re', 'RE.14', 'rok+re', { przychody_mostek_potw: b })
    say('errors', errors)
  } finally {
    await app.close()
  }
})
