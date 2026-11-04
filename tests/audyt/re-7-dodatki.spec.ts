// RE.3 / RE.10 dodatki: anulowanie okna zapisu PDF, zapis w nieistniejącym folderze (komunikat błędu), tryb ukrytych kwot
// a nazwa pliku; Excel i CSV z zakresem od 01.01 (domyślnym) na stanie „rok”.
import { existsSync, readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { answerCancel, answerSave, EXPORT, goReports, run, say, snap, step, toasts, waitFile } from './re-pomoc'

test('RE.3 / RE.10 anulowanie PDF, błąd zapisu, treść PDF', async () => {
  const r = await run('re-9')
  const { page, app, errors } = r
  try {
    await step('anulowanie PDF', async () => {
      await goReports(page, 'Debriefing')
      await answerCancel(app)
      await page.getByTestId('reports-debrief-pdf').click()
      await page.waitForTimeout(2000)
      say('RE.10 anulowanie PDF debriefingu', { toast: await toasts(page) })
      await goReports(page, 'Przegląd roczny')
      await answerCancel(app)
      await page.getByTestId('reports-year-pdf').click()
      await page.waitForTimeout(2000)
      say('RE.10 anulowanie PDF przeglądu', { toast: await toasts(page) })
    })
    await step('zapis w nieistniejącym folderze', async () => {
      await goReports(page, 'Eksport')
      const bad = 'C:\\FI-audyt\\eksport\\nie-ma-takiego-folderu\\x.csv'
      await answerSave(app, bad)
      await page.getByTestId('export-operations-csv').click()
      await page.waitForTimeout(2000)
      say('RE.3 CSV w nieistniejący folder', { toast: await toasts(page), plik: existsSync(bad) })
      await snap(page, 'RE.3-blad-zapisu')
      await page.waitForTimeout(8500)
      const bad2 = 'C:\\FI-audyt\\eksport\\nie-ma-takiego-folderu\\x.xlsx'
      await answerSave(app, bad2)
      await page.getByTestId('export-xlsx').click()
      await page.waitForTimeout(2000)
      say('RE.3 Excel w nieistniejący folder', { toast: await toasts(page), plik: existsSync(bad2) })
      await page.waitForTimeout(8500)
      const bad3 = 'C:\\FI-audyt\\eksport\\nie-ma-takiego-folderu\\x.zip'
      await answerSave(app, bad3)
      await page.getByTestId('export-zip').click()
      await page.waitForTimeout(2500)
      say('RE.12 ZIP w nieistniejący folder', { toast: await toasts(page), plik: existsSync(bad3) })
    })
    await step('treść PDF', async () => {
      await goReports(page, 'Debriefing')
      const f = `${EXPORT}\\re-9-d.pdf`
      await answerSave(app, f)
      await page.getByTestId('reports-debrief-pdf').click()
      await waitFile(f, 60_000)
      await page.waitForTimeout(1500)
      const raw = readFileSync(f).toString('latin1')
      say('RE.10 PDF – aktywna treść', { JavaScript: /\/JavaScript|\/JS\b/.test(raw), URI: /\/URI/.test(raw), Launch: /\/Launch/.test(raw), EmbeddedFile: /\/EmbeddedFile/.test(raw), rozmiar: raw.length })
    })
    say('errors', errors)
  } finally {
    await app.close()
  }
})
