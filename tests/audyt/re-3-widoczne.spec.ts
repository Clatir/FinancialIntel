// RE.13: eksport widocznej listy z Operacji – filtr Jedzenie, kwota od 50 zł, sortowanie po kwocie, ukryte Notatka i Tagi.
import { test } from '@playwright/test'
import { text } from './lab'
import { answerSave, EXPORT, go, proposed, readCsv, run, say, snap, special, step, toasts, waitFile, grosze } from './re-pomoc'

test('RE.13 eksport widocznej listy (Jedzenie, od 50 zł, po kwocie)', async () => {
  const r = await run('re-3', special)
  const { page, app, errors } = r
  try {
    await go(page, '2', 'page-operations')
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.keyboard.press('Escape')
    await page.getByTestId('operations-categories').click()
    await page.getByLabel('Jedzenie', { exact: true }).check()
    await page.keyboard.press('Escape')
    await page.getByTestId('operations-more').click()
    const min = page.getByTestId('operations-amount-min')
    await min.click()
    await min.fill('50')
    await min.press('Tab')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await page.getByTestId('operations-sort-amount').click()
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-column-note').uncheck()
    await page.getByTestId('operations-column-tags').uncheck()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
    const bar = (await text(page, '[data-testid="operations-sums"]')).replace(/\n+/g, ' | ')
    const header = (await text(page, '[data-testid="operations-header"]')).replace(/\n+/g, ' | ')
    const rows = (await page.getByTestId('operation-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
    say('RE.13 ekran', { pasek: bar, nagłówek: header, wierszy_widocznych: rows.length, pierwsze: rows.slice(0, 12) })
    await snap(page, 'RE.13-lista')
    const f = `${EXPORT}\\re-13.csv`
    await answerSave(app, f)
    await page.getByTestId('operations-export-csv').click()
    const ok = await waitFile(f)
    await page.waitForTimeout(1000)
    say('RE.13 CSV propozycja i toast', { propozycja: (await proposed(app)).slice(-1), toast: await toasts(page), plik: ok })
    const c = readCsv(f)
    const ai = c.header.indexOf('Kwota (zł)')
    say('RE.13 CSV', { bom: c.bom, nagłówek: c.header, wierszy: c.rows.length, pierwsze: c.rows.slice(0, 8).map((x) => `${x[0]} ${x[4]} ${x[5]} | ${x[6]}`), ostatnie: c.rows.slice(-3).map((x) => `${x[0]} ${x[4]} ${x[5]} | ${x[6]}`) })
    const amts = c.rows.map((x) => grosze(x[ai]!))
    const sorted = amts.every((v, i) => i === 0 || amts[i - 1]! <= v || Math.abs(amts[i - 1]!) >= Math.abs(v))
    say('RE.13 sprawdzenia', {
      wszystkieJedzenie: c.rows.every((x) => /Jedzenie/.test(x[5]!)),
      wszystkie50: c.rows.every((x) => Math.abs(grosze(x[ai]!)) >= 5000),
      kolejnośćPoModule: amts.every((v, i) => i === 0 || Math.abs(amts[i - 1]!) >= Math.abs(v)),
      kolejnośćMalejąca: amts.every((v, i) => i === 0 || amts[i - 1]! >= v),
      kolejnośćRosnąca: amts.every((v, i) => i === 0 || amts[i - 1]! <= v),
      sorted,
      kolumnyNotatkaTagi: c.rows.filter((x) => x[10] || x[11]).length
    })
    await step('xlsx', async () => {
      const x = `${EXPORT}\\re-13.xlsx`
      await answerSave(app, x)
      await page.getByTestId('operations-export-xlsx').click()
      await waitFile(x)
      await page.waitForTimeout(1000)
      say('RE.13 Excel propozycja i toast', { propozycja: (await proposed(app)).slice(-1), toast: await toasts(page) })
    })
    say('errors', errors)
  } finally {
    await app.close()
  }
})
