// RE.10 (proponowane nazwy PDF), RE.14 (panel „Przychody” na Mostku i w Planie miesiąca – średnie z 3 / 6 / 12 miesięcy).
import { test } from '@playwright/test'
import { reading, text } from './lab'
import { answerSave, EXPORT, go, goReports, proposed, run, say, snap, step, waitFile } from './re-pomoc'

const flat = (s: string) => s.replace(/\n+/g, ' | ')

test('RE.10 nazwy PDF i RE.14 panel Przychody', async () => {
  const r = await run('re-8')
  const { page, app, errors } = r
  try {
    await step('nazwy PDF', async () => {
      await goReports(page, 'Debriefing')
      const first = await page.getByTestId('reports-debrief-month').inputValue()
      const f = `${EXPORT}\\re-8-d.pdf`
      await answerSave(app, f)
      await page.getByTestId('reports-debrief-pdf').click()
      await waitFile(f)
      say('RE.10 debriefing – domyślny miesiąc i nazwa', { miesiąc: first, nazwa: (await proposed(app)).slice(-1) })
      await goReports(page, 'Przegląd roczny')
      for (const y of ['2026', '2025']) {
        await page.getByLabel('Rok przeglądu').selectOption(y)
        const g = `${EXPORT}\\re-8-p${y}.pdf`
        await answerSave(app, g)
        await page.getByTestId('reports-year-pdf').click()
        await waitFile(g)
        say(`RE.10 przegląd ${y} – nazwa`, (await proposed(app)).slice(-1))
        await page.waitForTimeout(500)
      }
      say('RE.10 Przegląd roczny – domyślny rok', await page.getByLabel('Rok przeglądu').inputValue())
    })
    await step('Przychody', async () => {
      await go(page, '1', 'page-bridge')
      const b = await page.getByTestId('bridge-income').innerText().catch(() => '(brak bridge-income)')
      say('RE.14 Przychody – Mostek', flat(b))
      await snap(page, 'RE.14-przychody-mostek')
      await go(page, '4', 'page-month')
      const m = await page.getByTestId('income-panel').innerText().catch(() => '(brak income-panel w Planie miesiąca)')
      say('RE.14 Przychody – Plan miesiąca', flat(m))
      reading('re', 'RE.14', 'rok', { przychody_mostek: flat(b), przychody_plan: flat(m) })
      void text
    })
    say('errors', errors)
  } finally {
    await app.close()
  }
})
