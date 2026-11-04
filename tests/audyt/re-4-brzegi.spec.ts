// RE.15: eksport pustego okresu, odwróconych dat, dużej kwoty i długich tekstów (CSV, Excel, PDF debriefingu).
import { statSync, existsSync, readFileSync } from 'node:fs'
import { test, type Page, type ElectronApplication } from '@playwright/test'
import { answerSave, EXPORT, goReports, huge, longCategory, proposed, run, say, snap, step, toasts, waitFile } from './re-pomoc'

const dateIn = async (page: Page, id: string, v: string) => {
  const f = page.getByTestId(id)
  await f.click()
  await f.fill(v)
  await f.press('Enter')
  await page.waitForTimeout(350)
}

async function exportOne(page: Page, app: ElectronApplication, testId: string, file: string, label: string): Promise<void> {
  await answerSave(app, file)
  const before = (await proposed(app)).length
  await page.getByTestId(testId).click()
  const ok = await waitFile(file, 8_000)
  await page.waitForTimeout(1000)
  const t = await toasts(page)
  const o = (await proposed(app)).slice(before)
  const dp = (o[0] as { defaultPath?: string } | undefined)?.defaultPath
  console.log(`[${label}] okno=${o.length ? 'tak' : 'NIE'} nazwa=${dp} plik=${ok ? statSync(file).size + ' B' : 'brak'} toast=${JSON.stringify(t)}`)
  await page.waitForTimeout(6500)
}

test('RE.15 brzegi eksportu', async () => {
  const r = await run('re-4', (d) => {
    huge(d)
    longCategory(d)
  })
  const { page, app, errors } = r
  try {
    await goReports(page, 'Eksport')
    const cases: Array<{ id: string; from: string; to: string }> = [
      { id: 'pusty-przeszlosc', from: '01.01.2024', to: '31.12.2024' },
      { id: 'pusty-przyszlosc', from: '01.01.2030', to: '31.12.2030' },
      { id: 'pusty-dzien', from: '03.08.2026', to: '03.08.2026' },
      { id: 'odwrocone', from: '31.10.2026', to: '01.10.2026' },
      { id: 'duza-kwota', from: '12.10.2026', to: '12.10.2026' },
      { id: 'dluga-notatka', from: '13.10.2026', to: '13.10.2026' }
    ]
    for (const c of cases) {
      await step(c.id, async () => {
        await dateIn(page, 'export-from', c.from)
        await dateIn(page, 'export-to', c.to)
        say(`RE.15 ${c.id} – pola po wpisaniu`, { od: await page.getByTestId('export-from').inputValue(), do: await page.getByTestId('export-to').inputValue(), toast: await toasts(page) })
        for (const [k, tid, ext] of [['ops', 'export-operations-csv', 'csv'], ['months', 'export-months-csv', 'csv'], ['xlsx', 'export-xlsx', 'xlsx']] as const)
          await exportOne(page, app, tid, `${EXPORT}\\re-15-${c.id}-${k}.${ext}`, `RE.15 ${c.id} ${k}`)
      })
    }
    await snap(page, 'RE.15-po-eksportach')
    // PDF of the October debriefing with the big amounts and the long category name.
    await goReports(page, 'Debriefing')
    await page.getByTestId('reports-debrief-month').selectOption('2026-10')
    await snap(page, 'RE.15-debriefing-ekran')
    const f = `${EXPORT}\\re-15-debriefing-2026-10.pdf`
    await answerSave(app, f)
    await page.getByTestId('reports-debrief-pdf').click()
    await waitFile(f, 60_000)
    await page.waitForTimeout(1500)
    say('RE.15 PDF', { plik: existsSync(f) ? statSync(f).size : 'brak', toast: await toasts(page) })
    say('errors', errors)
  } finally {
    await app.close()
  }
  void readFileSync
})
